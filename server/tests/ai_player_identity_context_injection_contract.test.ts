import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { writeFileSync } from 'node:fs'
import { createInitialWorldState } from '../../shared/domain/scenario'
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

const AI_PLAYER_ID = 'player_operator_identity_context'
const FACTION_ID = 'player'
const GOVERNOR_PLAYER_ID = 'human_identity_context'

const MODEL_OUTPUT = {
  summary: 'identity context observed before creating a governed proposal',
  proposals: [
    {
      action: 'resource_transfer_to_governor',
      args: {
        resources: {
          wood: 1,
        },
      },
      reason: '资源：AI 子账户木材 1 可输送；目标：按身份文件先护粮再转入总督通用收件箱；风险：需要人工批准且受额度/冷却约束；批准后结果：后端执行资源输送并生成 receipt。',
    },
  ],
  deferReason: '',
  needsHumanReview: true,
}

async function startCapturingRelay() {
  const port = await getAvailablePort()
  const requestBodies: string[] = []
  const server = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })
    req.on('end', () => {
      requestBodies.push(Buffer.concat(chunks).toString('utf-8'))
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({
        model: 'identity-context-test-model',
        choices: [
          {
            message: {
              content: JSON.stringify(MODEL_OUTPUT),
            },
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 7, total_tokens: 12 },
      }))
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve())
  })
  return {
    baseUrl: `http://127.0.0.1:${port}/v1`,
    requestBodies,
    stop: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    }),
  }
}

function seedWorldState() {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding identity context contract`)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: '青州护粮官',
      factionId: FACTION_ID,
      unitIds: [],
      specialty: 'logistics',
    },
  ]
  faction.aiResourceAccounts = {
    [AI_PLAYER_ID]: {
      aiPlayerId: AI_PLAYER_ID,
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      resources: {
        food: 5,
        wood: 9,
        stone: 0,
        iron: 0,
      },
      updatedTick: world.tick,
    },
  }
  faction.governorResourceInboxes = {}
  const path = buildSessionPersistPath('ai_player_identity_context_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return path
}

async function run() {
  const relay = await startCapturingRelay()
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  let child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_identity_context_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_identity_context_session_state'),
    WORLD_STATE_PERSIST_PATH: seedWorldState(),
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: buildSessionPersistPath('ai_player_identity_context_provider_store'),
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: relay.baseUrl,
    AI_PLAYER_RUNTIME_MODEL_API_KEY: 'identity-context-test-key',
    AI_PLAYER_RUNTIME_MODEL: 'identity/context-json-model',
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: FACTION_ID,
      playerName: GOVERNOR_PLAYER_ID,
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)

    const register = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      displayName: '青州护粮官',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['resource_transfer_to_governor'],
      budgetPolicy: {
        allowHighRiskActions: true,
      },
    })
    assert.equal(register.status, 200, `register failed: ${JSON.stringify(register.data)}`)

    const upsertIdentity = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/context-documents`, 'POST', {
      kind: 'identity',
      title: '张飞微信身份提炼',
      content: '身份：青州护粮官。语气：自称俺；遇事先说护粮，再报风险，最后用“干就完了”收束。',
      sourceFileName: 'wechat-zhangfei-identity.txt',
      updatedBy: GOVERNOR_PLAYER_ID,
    })
    assert.equal(upsertIdentity.status, 200, `identity context upsert failed: ${JSON.stringify(upsertIdentity.data)}`)
    const runtimeAfterUpsert = readObject(readObject(upsertIdentity.data).player)
    assert.equal(readArray(runtimeAfterUpsert.contextDocuments).length, 1)

    const aiCommandCreditGrant = await requestJson(baseUrl, '/api/ai/provider/ai-command-credits/grants', 'POST', {
      accountId: GOVERNOR_PLAYER_ID,
      worldId: FACTION_ID,
      amountCredits: 100,
      reason: 'identity_context_contract_grant',
    })
    assert.equal(aiCommandCreditGrant.status, 200, `AI command credit grant failed: ${JSON.stringify(aiCommandCreditGrant.data)}`)
    assert.equal(readObject(aiCommandCreditGrant.data).ok, true)

    const sent = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages`, 'POST', {
      body: '按你的身份给我一个后续行动提案，保持后端审批。',
      senderId: GOVERNOR_PLAYER_ID,
      senderName: '总督',
      createProposal: true,
    })
    assert.equal(sent.status, 200, `send chat command failed: ${JSON.stringify(sent.data)}`)
    const sentPayload = readObject(sent.data)
    assert.equal(sentPayload.ok, true)
    assert.ok(sentPayload.proposal, `chat command should create a proposal: ${JSON.stringify(sent.data)}`)
    assert.equal(readObject(sentPayload.proposal).source, 'llm')
    assert.equal(relay.requestBodies.length, 1, 'chat model should receive exactly one relay request')

    const requestBody = readObject(JSON.parse(relay.requestBodies[0]))
    const messages = readArray(requestBody.messages)
    const systemMessage = readObject(messages.find((message) => readObject(message).role === 'system'))
    const userMessage = readObject(messages.find((message) => readObject(message).role === 'user'))
    assert.match(String(systemMessage.content), /张飞微信身份提炼/)
    assert.match(String(systemMessage.content), /自称俺/)
    assert.match(String(systemMessage.content), /护粮/)

    const userObservation = readObject(JSON.parse(String(userMessage.content)))
    const contextDocuments = readArray(userObservation.contextDocuments)
    assert.equal(contextDocuments.length, 1)
    assert.equal(readObject(contextDocuments[0]).kind, 'identity')
    assert.equal(readObject(contextDocuments[0]).title, '张飞微信身份提炼')
    assert.match(String(readObject(contextDocuments[0]).content), /干就完了/)
    assert.equal(String(relay.requestBodies[0]).includes('identity-context-test-key'), false, 'model request body must not include provider API key')
  } finally {
    await shutdownChild(child)
    await relay.stop()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
