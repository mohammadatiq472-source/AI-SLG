import assert from 'node:assert/strict'
import { createServer, type IncomingMessage } from 'node:http'
import { writeFileSync } from 'node:fs'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  aiPlayerProviderAiCommandCreditLedgerMutationResponseSchema,
  aiPlayerProviderPlayerKeyMutationResponseSchema,
  listAiPlayerProviderBillingLedgerResponseSchema,
  listAiPlayerProviderTokenSummaryResponseSchema,
} from '../../shared/schemas/aiPlayerProviderAccount'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readArray,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

const AI_PLAYER_ID = 'token_summary_ai'
const FACTION_ID = 'player'
const GOVERNOR_PLAYER_ID = 'human_token_summary'
const PLAYER_MODEL = 'deepseek-v4-flash'
const PLAYER_SECRET = 'token-summary-player-key-fixture'
const ENCRYPTION_KEY = 'token-summary-encryption-key-fixture'
const EXPECTED_DEEPSEEK_COST_USD = 0.0000014028

function seedWorldState() {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding token summary shard`)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Token Summary AI',
      factionId: FACTION_ID,
      unitIds: [],
      specialty: 'logistics',
    },
  ]

  const path = buildSessionPersistPath('ai_player_provider_token_summary_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return path
}

async function readRequestBody(req: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf-8')
}

async function startRelayProbe() {
  const port = await getAvailablePort()
  const probes: Array<{ authorization: string; model: string; path: string }> = []
  const server = createServer((req, res) => {
    void (async () => {
      const body = JSON.parse(await readRequestBody(req)) as Record<string, unknown>
      probes.push({
        authorization: String(req.headers.authorization ?? ''),
        model: String(body.model ?? ''),
        path: String(req.url ?? ''),
      })
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({
        model: PLAYER_MODEL,
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: 'claim a reward through player BYOK',
                proposals: [
                  {
                    action: 'reward_claim',
                    args: {},
                    reason: 'A reward is available and should be claimed after governor approval.',
                  },
                ],
                deferReason: '',
                needsHumanReview: false,
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 3,
          completion_tokens: 4,
          total_tokens: 7,
          prompt_cache_hit_tokens: 1,
          prompt_cache_miss_tokens: 2,
        },
      }))
    })().catch((error: unknown) => {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve())
  })

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    probes,
    stop: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  }
}

function assertNoSecretLeak(value: unknown) {
  const serialized = JSON.stringify(value)
  assert.equal(serialized.includes(PLAYER_SECRET), false, `player key leaked through payload: ${serialized}`)
  assert.equal(serialized.includes(`Bearer ${PLAYER_SECRET}`), false, 'authorization header leaked through payload')
  assert.equal(serialized.includes(ENCRYPTION_KEY), false, 'encryption key leaked through payload')
}

async function run() {
  const relay = await startRelayProbe()
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: buildSessionPersistPath('ai_player_provider_token_summary_store'),
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_provider_token_summary_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_provider_token_summary_session_state'),
    WORLD_STATE_PERSIST_PATH: seedWorldState(),
    FACTION_APIKEY_ENCRYPTION_KEY: ENCRYPTION_KEY,
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: '',
    AI_PLAYER_RUNTIME_MODEL_API_KEY: '',
    LLM_RELAY_URL: '',
    LLM_RELAY_MODEL: '',
    LLM_RELAY_API_KEY: '',
    LLM_RELAY_API_KEYS: '',
    OPENAI_API_KEY: '',
    AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY: '1',
    AI_PLAYER_RUNTIME_MODEL_QUEUE_LIMIT: '2',
    AI_PLAYER_AI_COMMAND_CREDIT_WORLD_ID: 'season_token_summary',
    AI_PLAYER_PROVIDER_BUDGET_MAX_TOTAL_TOKENS_PER_WINDOW: '100000',
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const savePlayerKey = await requestJson(baseUrl, `/api/ai/provider/player-keys/${GOVERNOR_PLAYER_ID}`, 'POST', {
      model: PLAYER_MODEL,
      baseUrl: relay.baseUrl,
      apiKey: PLAYER_SECRET,
      updatedBy: GOVERNOR_PLAYER_ID,
    })
    assert.equal(savePlayerKey.status, 200, `player key save failed: ${JSON.stringify(savePlayerKey.data)}`)
    aiPlayerProviderPlayerKeyMutationResponseSchema.parse(savePlayerKey.data)
    const savedKey = readObject(readObject(savePlayerKey.data).key)
    const savedKeyFingerprint = String(savedKey.keyFingerprint)
    assert.match(savedKeyFingerprint, /^sha256:/)
    assertNoSecretLeak(savePlayerKey.data)

    const register = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      displayName: 'Token Summary AI',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['reward_claim'],
    })
    assert.equal(register.status, 200, `register failed: ${JSON.stringify(register.data)}`)

    const aiCommandCreditGrant = await requestJson(baseUrl, '/api/ai/provider/ai-command-credits/grants', 'POST', {
      accountId: GOVERNOR_PLAYER_ID,
      worldId: 'season_token_summary',
      amountCredits: 300,
      reason: 'token_summary_contract_grant',
    })
    assert.equal(aiCommandCreditGrant.status, 200, `AI command credit grant failed: ${JSON.stringify(aiCommandCreditGrant.data)}`)
    aiPlayerProviderAiCommandCreditLedgerMutationResponseSchema.parse(aiCommandCreditGrant.data)

    const modelProposals = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/model-proposals`, 'POST')
    assert.equal(modelProposals.status, 200, `model proposal route failed: ${JSON.stringify(modelProposals.data)}`)
    assert.equal(relay.probes.length, 1)
    assert.equal(relay.probes[0].path, '/v1/chat/completions')
    assert.equal(relay.probes[0].model, PLAYER_MODEL)
    assert.equal(relay.probes[0].authorization, `Bearer ${PLAYER_SECRET}`)
    assertNoSecretLeak(modelProposals.data)

    const ledger = await requestJson(baseUrl, '/api/ai/provider/billing-ledger?limit=10', 'GET')
    assert.equal(ledger.status, 200, `billing ledger read failed: ${JSON.stringify(ledger.data)}`)
    listAiPlayerProviderBillingLedgerResponseSchema.parse(ledger.data)
    const ledgerItems = readArray(readObject(ledger.data).items)
    assert.equal(ledgerItems.length, 1)
    const ledgerEntry = readObject(ledgerItems[0])
    const ledgerEntryProvider = String(ledgerEntry.provider)
    const ledgerEntryKeyFingerprint = String(ledgerEntry.keyFingerprint)
    assert.match(ledgerEntryKeyFingerprint, /^sha256:/)
    assert.equal(savedKeyFingerprint.startsWith(ledgerEntryKeyFingerprint), true)
    assertNoSecretLeak(ledger.data)

    const tokenSummary = await requestJson(
      baseUrl,
      `/api/ai/provider/token-summary?aiPlayerId=${AI_PLAYER_ID}&provider=${encodeURIComponent(ledgerEntryProvider)}&model=${encodeURIComponent(PLAYER_MODEL)}&keyFingerprint=${encodeURIComponent(ledgerEntryKeyFingerprint)}`,
      'GET',
    )
    assert.equal(tokenSummary.status, 200, `filtered token summary read failed: ${JSON.stringify(tokenSummary.data)}`)
    listAiPlayerProviderTokenSummaryResponseSchema.parse(tokenSummary.data)
    const tokenSummaryItems = readArray(readObject(tokenSummary.data).items)
    assert.equal(tokenSummaryItems.length, 1)
    const tokenSummaryItem = readObject(tokenSummaryItems[0])
    assert.equal(tokenSummaryItem.aiPlayerId, AI_PLAYER_ID)
    assert.equal(tokenSummaryItem.factionId, FACTION_ID)
    assert.equal(tokenSummaryItem.governorPlayerId, GOVERNOR_PLAYER_ID)
    assert.equal(tokenSummaryItem.provider, ledgerEntryProvider)
    assert.equal(tokenSummaryItem.model, PLAYER_MODEL)
    assert.equal(tokenSummaryItem.keyFingerprint, ledgerEntryKeyFingerprint)
    assert.equal(readObject(tokenSummaryItem.total).totalTokens, 7)
    assert.equal(readObject(tokenSummaryItem.total).estimatedCostUsd, EXPECTED_DEEPSEEK_COST_USD)
    assertNoSecretLeak(tokenSummary.data)

    const tokenSummaryDetail = await requestJson(
      baseUrl,
      `/api/ai/provider/token-summary/${AI_PLAYER_ID}?provider=${encodeURIComponent(ledgerEntryProvider)}&model=${encodeURIComponent(PLAYER_MODEL)}&keyFingerprint=${encodeURIComponent(ledgerEntryKeyFingerprint)}`,
      'GET',
    )
    assert.equal(tokenSummaryDetail.status, 200, `filtered token summary detail read failed: ${JSON.stringify(tokenSummaryDetail.data)}`)
    listAiPlayerProviderTokenSummaryResponseSchema.parse(tokenSummaryDetail.data)
    assert.equal(readArray(readObject(tokenSummaryDetail.data).items).length, 1)
    assertNoSecretLeak(tokenSummaryDetail.data)

    const wrongKeyTokenSummary = await requestJson(
      baseUrl,
      `/api/ai/provider/token-summary?aiPlayerId=${AI_PLAYER_ID}&provider=${encodeURIComponent(ledgerEntryProvider)}&model=${encodeURIComponent(PLAYER_MODEL)}&keyFingerprint=${encodeURIComponent('sha256:missing-ledger-key')}`,
      'GET',
    )
    assert.equal(wrongKeyTokenSummary.status, 200, `wrong-key token summary read failed: ${JSON.stringify(wrongKeyTokenSummary.data)}`)
    listAiPlayerProviderTokenSummaryResponseSchema.parse(wrongKeyTokenSummary.data)
    assert.equal(readObject(wrongKeyTokenSummary.data).count, 0)
    assert.equal(readArray(readObject(wrongKeyTokenSummary.data).items).length, 0)
    assertNoSecretLeak(wrongKeyTokenSummary.data)

    console.log('[ai_player_provider_token_summary_contract] all checks passed')
  } finally {
    await shutdownChild(child)
    await relay.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_provider_token_summary_contract] failed:', error)
  process.exitCode = 1
})
