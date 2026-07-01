import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { createInitialWorldState } from '../../shared/domain/scenario'
import { listGovernedAiPlayersResponseSchema } from '../../shared/schemas/aiPlayer'
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

const FACTION_ID = 'player'
const GOVERNOR_PLAYER_ID = 'human_list_owner'
const ACTIVE_AI_PLAYER_ID = 'list_card_active'
const PENDING_AI_PLAYER_ID = 'list_card_pending'
const FAILED_AI_PLAYER_ID = 'list_card_failed'
const PAUSED_AI_PLAYER_ID = 'list_card_paused'

function seedWorldStateWithListReadModelAccounts() {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding AI player list read model`)

  faction.aiPlayers = [
    ACTIVE_AI_PLAYER_ID,
    PENDING_AI_PLAYER_ID,
    FAILED_AI_PLAYER_ID,
    PAUSED_AI_PLAYER_ID,
  ].map((id) => ({
    id,
    name: id,
    factionId: FACTION_ID,
    unitIds: [],
    specialty: 'logistics',
  }))
  faction.aiResourceAccounts = {
    [ACTIVE_AI_PLAYER_ID]: {
      aiPlayerId: ACTIVE_AI_PLAYER_ID,
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      resources: { food: 0, wood: 20, stone: 0, iron: 0 },
      updatedTick: world.tick,
    },
    [PENDING_AI_PLAYER_ID]: {
      aiPlayerId: PENDING_AI_PLAYER_ID,
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      resources: { food: 0, wood: 20, stone: 0, iron: 0 },
      updatedTick: world.tick,
    },
    [FAILED_AI_PLAYER_ID]: {
      aiPlayerId: FAILED_AI_PLAYER_ID,
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      resources: { food: 0, wood: 1, stone: 0, iron: 0 },
      updatedTick: world.tick,
    },
    [PAUSED_AI_PLAYER_ID]: {
      aiPlayerId: PAUSED_AI_PLAYER_ID,
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      resources: { food: 0, wood: 20, stone: 0, iron: 0 },
      updatedTick: world.tick,
    },
  }
  faction.governorResourceInboxes = {}

  const path = buildSessionPersistPath('ai_player_http_list_read_model_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return path
}

async function registerAiPlayer(baseUrl: string, aiPlayerId: string, displayName: string, paused = false) {
  const result = await requestJson(baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId,
    displayName,
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    paused,
    actionWhitelist: ['resource_transfer_to_governor'],
    budgetPolicy: {
      allowHighRiskActions: true,
    },
  })
  assert.equal(result.status, 200, `register ${aiPlayerId} failed: ${JSON.stringify(result.data)}`)
}

async function createResourceTransferProposal(baseUrl: string, aiPlayerId: string, wood: number) {
  const result = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
    aiPlayerId,
    action: 'resource_transfer_to_governor',
    args: {
      resources: { wood },
    },
    reason: `list read model contract proposal for ${aiPlayerId}`,
    source: 'human',
  })
  assert.equal(result.status, 200, `create proposal for ${aiPlayerId} failed: ${JSON.stringify(result.data)}`)
  return readObject(readObject(result.data).proposal)
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_http_list_read_model_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_http_list_read_model_session_state'),
    WORLD_STATE_PERSIST_PATH: seedWorldStateWithListReadModelAccounts(),
    AI_PLAYER_RUNTIME_MODEL: '',
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: '',
    AI_PLAYER_RUNTIME_MODEL_API_KEY: '',
    LLM_RELAY_MODEL: '',
    LLM_RELAY_URL: '',
    LLM_RELAY_API_KEY: '',
    LLM_RELAY_API_KEYS: '',
    OPENAI_API_KEY: '',
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: FACTION_ID,
      playerName: GOVERNOR_PLAYER_ID,
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)

    await registerAiPlayer(baseUrl, ACTIVE_AI_PLAYER_ID, '列表常态 AI')
    await registerAiPlayer(baseUrl, PENDING_AI_PLAYER_ID, '列表待审批 AI')
    await registerAiPlayer(baseUrl, FAILED_AI_PLAYER_ID, '列表红态 AI')
    await registerAiPlayer(baseUrl, PAUSED_AI_PLAYER_ID, '列表暂停 AI', true)

    await createResourceTransferProposal(baseUrl, PENDING_AI_PLAYER_ID, 1)

    const failedProposal = await createResourceTransferProposal(baseUrl, FAILED_AI_PLAYER_ID, 5)
    const approveFailedProposal = await requestJson(baseUrl, `/api/ai/players/proposals/${String(failedProposal.proposalId)}/approve`, 'POST', {
      approvedBy: GOVERNOR_PLAYER_ID,
    })
    assert.equal(approveFailedProposal.status, 200, `approve failed proposal failed: ${JSON.stringify(approveFailedProposal.data)}`)
    const executeFailedProposal = await requestJson(baseUrl, `/api/ai/players/proposals/${String(failedProposal.proposalId)}/execute`, 'POST', {
      executedBy: GOVERNOR_PLAYER_ID,
      includeWorld: false,
    }, 60_000)
    assert.equal(executeFailedProposal.status, 200, `execute failed proposal failed: ${JSON.stringify(executeFailedProposal.data)}`)
    const failedReceipt = readObject(readObject(executeFailedProposal.data).receipt)
    assert.equal(failedReceipt.ok, false)

    const list = await requestJson(baseUrl, `/api/ai/players?governorPlayerId=${GOVERNOR_PLAYER_ID}`, 'GET')
    assert.equal(list.status, 200, `list players failed: ${JSON.stringify(list.data)}`)
    const payload = readObject(list.data)
    listGovernedAiPlayersResponseSchema.parse(payload)
    const items = readArray(payload.items).map((item) => readObject(item))
    assert.equal(items.length, 4)
    const byId = new Map(items.map((item) => [String(item.aiPlayerId), item]))

    assert.equal(readObject(byId.get(ACTIVE_AI_PLAYER_ID)?.listCard).statusDot, 'green')
    assert.equal(readObject(byId.get(ACTIVE_AI_PLAYER_ID)?.listCard).statusReason, 'active')
    assert.equal(readObject(byId.get(PENDING_AI_PLAYER_ID)?.listCard).statusDot, 'yellow')
    assert.equal(readObject(byId.get(PENDING_AI_PLAYER_ID)?.listCard).statusReason, 'pending_proposals')
    assert.equal(readObject(byId.get(FAILED_AI_PLAYER_ID)?.listCard).statusDot, 'red')
    assert.equal(readObject(byId.get(FAILED_AI_PLAYER_ID)?.listCard).statusReason, 'runtime_failure')
    const failedListCardReceipt = readObject(readObject(byId.get(FAILED_AI_PLAYER_ID)?.listCard).runtimeFailureReceipt)
    assert.equal(failedListCardReceipt.proposalId, String(failedProposal.proposalId))
    assert.equal(failedListCardReceipt.action, 'resource_transfer_to_governor')
    assert.equal(failedListCardReceipt.failureCode, failedReceipt.failureCode)
    assert.equal('execution' in failedListCardReceipt, false, 'listCard failure receipt must not expose raw execution payload')
    assert.equal('worldActionPayload' in failedListCardReceipt, false, 'listCard failure receipt must not expose action payload')
    assert.equal('rawPayload' in failedListCardReceipt, false, 'listCard failure receipt must not expose raw payload')
    assert.equal('receipt' in failedListCardReceipt, false, 'listCard failure receipt must not nest full receipts')
    assert.equal(readObject(byId.get(PAUSED_AI_PLAYER_ID)?.listCard).statusDot, 'gray')
    assert.equal(readObject(byId.get(PAUSED_AI_PLAYER_ID)?.listCard).statusReason, 'inactive')

    const listSummary = readObject(payload.listSummary)
    assert.equal(listSummary.count, 4)
    assert.equal(listSummary.actionableProposalCount, 1)
    assert.equal(listSummary.pendingApprovalCount, 1)
    assert.equal(listSummary.runtimeFailureCount, 1)
    assert.deepEqual(readObject(listSummary.statusDotCounts), {
      green: 1,
      yellow: 1,
      red: 1,
      gray: 1,
    })
    assert.deepEqual(readObject(listSummary.statusReasonCounts), {
      active: 1,
      pending_proposals: 1,
      runtime_failure: 1,
      inactive: 1,
    })

    console.log('[ai_player_http_list_read_model_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[ai_player_http_list_read_model_contract] failed:', error)
  process.exitCode = 1
})
