import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { createInitialWorldState } from '../../shared/domain/scenario'
import { aiPlayerChatPatrolTickResponseSchema } from '../../shared/schemas/aiPlayerChat'
import {
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  joinGovernor,
  loadWorldState,
  startAiPlayerHttpBackend,
  type AiPlayerHttpBackend,
} from './helpers/aiPlayerHttpContractHarness'
import { getAvailablePort, readArray, readObject, requestJson } from './helpers/backendHarness'

type PatrolPolicySkipSeed = {
  persistRoot: string
  unitId: string
  tileId: string
}

function seedPatrolPolicySkipWorld(): PatrolPolicySkipSeed {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding patrol policy skip shard`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding patrol policy skip shard`)
  const targetTile = world.map.tiles.find((tile) => tile.type !== 'city' && tile.type !== 'fog')
    ?? world.map.tiles[0]
  assert.ok(targetTile, 'missing target tile while seeding patrol policy skip shard')

  targetTile.type = 'resource'
  targetTile.owner = 'neutral'
  targetTile.resourceKind = targetTile.resourceKind || 'wood'
  targetTile.resourceLevel = Math.max(1, targetTile.resourceLevel ?? 2)
  targetTile.enemyPressure = 2

  unit.tileId = targetTile.id
  unit.strength = 68
  unit.supply = 4
  unit.currentTask = undefined
  unit.aiPlayerId = AI_PLAYER_ID

  faction.actionPoints = Math.max(faction.actionPoints, 8)
  faction.food = Math.max(faction.food, 12)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Patrol Policy Skip AI',
      factionId: FACTION_ID,
      unitIds: [unit.id],
      specialty: 'recon',
    },
  ]

  world.tick = 44
  const persistRoot = join(process.cwd(), 'tmp', `ai_player_http_chat_patrol_model_policy_skip_world_${process.pid}_${Date.now()}`)
  const path = join(persistRoot, 'world_snapshot.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    persistRoot,
    unitId: unit.id,
    tileId: targetTile.id,
  }
}

async function startPolicySkipRelayProbe() {
  const port = await getAvailablePort()
  const probes: string[] = []
  const server = createServer((req, res) => {
    probes.push(String(req.url ?? ''))
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({
      model: 'patrol-policy-skip-test-model',
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'disabled AI player should not call the model',
              proposals: [],
              deferReason: '',
              needsHumanReview: true,
            }),
          },
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }))
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve())
  })
  return {
    baseUrl: `http://127.0.0.1:${port}/v1`,
    probes,
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

async function bootPolicySkipBackend(
  worldPersistRoot: string,
  envOverrides: NodeJS.ProcessEnv,
  playerOverrides: Record<string, unknown>,
): Promise<AiPlayerHttpBackend> {
  const backend = await startAiPlayerHttpBackend(
    'ai_player_http_chat_patrol_model_policy_skip_contract',
    undefined,
    {
      WORLD_PERSIST_ROOT: worldPersistRoot,
      ...envOverrides,
    },
  )
  await joinGovernor(backend.baseUrl)
  const register = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId: AI_PLAYER_ID,
    displayName: 'Patrol Policy Skip AI',
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    actionWhitelist: ['battle_report_read', 'troop_heal', 'tile_occupy', 'march_move', 'resource_gather'],
    budgetPolicy: {
      allowHighRiskActions: true,
    },
    ...playerOverrides,
  })
  assert.equal(register.status, 200, `register patrol policy skip AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

async function grantPolicySkipAiCommandCredits(backend: AiPlayerHttpBackend, reason: string) {
  const granted = await requestJson(backend.baseUrl, '/api/ai/provider/ai-command-credits/grants', 'POST', {
    accountId: GOVERNOR_PLAYER_ID,
    worldId: FACTION_ID,
    amountCredits: 100,
    reason,
  })
  assert.equal(granted.status, 200, `grant patrol policy skip AI command credits failed: ${JSON.stringify(granted.data)}`)
  assert.equal(readObject(granted.data).ok, true)
}

async function testPatrolTickSkipsModelProposalWhenAiPlayerDisabled() {
  const seeded = seedPatrolPolicySkipWorld()
  const relay = await startPolicySkipRelayProbe()
  const backend = await bootPolicySkipBackend(
    seeded.persistRoot,
    {
      AI_PLAYER_RUNTIME_MODEL_BASE_URL: relay.baseUrl,
      AI_PLAYER_RUNTIME_MODEL_API_KEY: 'patrol-disabled-key-fixture',
      AI_PLAYER_RUNTIME_MODEL: 'patrol/strict-json-model',
      AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT: '',
      LLM_RELAY_URL: relay.baseUrl,
      LLM_RELAY_MODEL: 'patrol/strict-json-model',
      LLM_RELAY_API_KEY: 'patrol-disabled-key-fixture',
      LLM_RELAY_API_KEYS: '',
      OPENAI_API_KEY: '',
      AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: join(seeded.persistRoot, 'provider_accounts_disabled.json'),
    },
    {
      enabled: false,
    },
  )
  try {
    await grantPolicySkipAiCommandCredits(backend, 'patrol_disabled_skip_contract_grant')
    const worldBefore = await loadWorldState(backend.baseUrl)
    const patrol = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/patrol-tick`,
      'POST',
      {
        triggeredBy: GOVERNOR_PLAYER_ID,
        triggerMode: 'manual',
        goalPower: 4000,
        battleReportLimit: 3,
        cooldownTicks: 6,
      },
    )
    assert.equal(patrol.status, 200, `disabled patrol tick failed: ${JSON.stringify(patrol.data)}`)
    const patrolPayload = readObject(patrol.data)
    aiPlayerChatPatrolTickResponseSchema.parse(patrolPayload)
    assert.equal(patrolPayload.ok, true)
    assert.equal(relay.probes.length, 0, 'disabled AI player must skip the model HTTP request')
    assert.equal(patrolPayload.modelProposal, undefined)
    assert.equal(patrolPayload.modelProposalMessage, undefined)
    assert.equal(patrolPayload.modelProposalError, undefined)
    assert.equal(patrolPayload.modelDowngradeMessage, undefined)
    assert.equal(patrolPayload.modelProposalSkippedReason, 'ai_player_disabled')

    const proposals = await requestJson(backend.baseUrl, `/api/ai/players/proposals?aiPlayerId=${AI_PLAYER_ID}&limit=10`, 'GET')
    assert.equal(proposals.status, 200, `proposal list after disabled patrol failed: ${JSON.stringify(proposals.data)}`)
    assert.equal(readArray(readObject(proposals.data).items).length, 0)

    const chatHistory = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20`, 'GET')
    assert.equal(chatHistory.status, 200, `chat history after disabled patrol failed: ${JSON.stringify(chatHistory.data)}`)
    const messages = readArray(readObject(chatHistory.data).messages).map((item) => readObject(item))
    assert.equal(messages.length, 1)
    assert.equal(messages[0].kind, 'message')
    assert.equal(readObject(messages[0].metadata).source, 'manual_patrol_tick')

    const worldAfter = await loadWorldState(backend.baseUrl)
    assert.equal(worldAfter.worldVersion, worldBefore.worldVersion, 'disabled patrol must not mutate world')
    const tileStates = (worldAfter.map as unknown as { tileStates?: Array<{ id: string; owner?: string }> }).tileStates ?? []
    const tileAfter = worldAfter.map.tiles.find((tile) => tile.id === seeded.tileId)
    const tileStateAfter = tileStates.find((tile) => tile.id === seeded.tileId)
    assert.notEqual(tileAfter?.owner ?? tileStateAfter?.owner, FACTION_ID, 'disabled patrol must not occupy the candidate tile')
  } finally {
    await backend.stop()
    await relay.stop()
  }
}

async function testPatrolTickSkipsModelProposalWhenLlmProposalsDisabled() {
  const seeded = seedPatrolPolicySkipWorld()
  const relay = await startPolicySkipRelayProbe()
  const backend = await bootPolicySkipBackend(
    seeded.persistRoot,
    {
      AI_PLAYER_RUNTIME_MODEL_BASE_URL: relay.baseUrl,
      AI_PLAYER_RUNTIME_MODEL_API_KEY: 'patrol-llm-disabled-key-fixture',
      AI_PLAYER_RUNTIME_MODEL: 'patrol/strict-json-model',
      AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT: '',
      LLM_RELAY_URL: relay.baseUrl,
      LLM_RELAY_MODEL: 'patrol/strict-json-model',
      LLM_RELAY_API_KEY: 'patrol-llm-disabled-key-fixture',
      LLM_RELAY_API_KEYS: '',
      OPENAI_API_KEY: '',
      AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: join(seeded.persistRoot, 'provider_accounts_llm_disabled.json'),
    },
    {
      runtimePolicy: { allowLlmProposals: false },
    },
  )
  try {
    await grantPolicySkipAiCommandCredits(backend, 'patrol_llm_disabled_skip_contract_grant')
    const worldBefore = await loadWorldState(backend.baseUrl)
    const patrol = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/patrol-tick`,
      'POST',
      {
        triggeredBy: GOVERNOR_PLAYER_ID,
        triggerMode: 'manual',
        goalPower: 4000,
        battleReportLimit: 3,
        cooldownTicks: 6,
      },
    )
    assert.equal(patrol.status, 200, `llm-disabled patrol tick failed: ${JSON.stringify(patrol.data)}`)
    const patrolPayload = readObject(patrol.data)
    aiPlayerChatPatrolTickResponseSchema.parse(patrolPayload)
    assert.equal(patrolPayload.ok, true)
    assert.equal(relay.probes.length, 0, 'disabled LLM proposals must skip the model HTTP request')
    assert.equal(patrolPayload.modelProposal, undefined)
    assert.equal(patrolPayload.modelProposalMessage, undefined)
    assert.equal(patrolPayload.modelProposalError, undefined)
    assert.equal(patrolPayload.modelDowngradeMessage, undefined)
    assert.equal(patrolPayload.modelProposalSkippedReason, 'llm_proposals_disabled')

    const proposals = await requestJson(backend.baseUrl, `/api/ai/players/proposals?aiPlayerId=${AI_PLAYER_ID}&limit=10`, 'GET')
    assert.equal(proposals.status, 200, `proposal list after llm-disabled patrol failed: ${JSON.stringify(proposals.data)}`)
    assert.equal(readArray(readObject(proposals.data).items).length, 0)

    const chatHistory = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20`, 'GET')
    assert.equal(chatHistory.status, 200, `chat history after llm-disabled patrol failed: ${JSON.stringify(chatHistory.data)}`)
    const messages = readArray(readObject(chatHistory.data).messages).map((item) => readObject(item))
    assert.equal(messages.length, 1)
    assert.equal(messages[0].kind, 'message')
    assert.equal(readObject(messages[0].metadata).source, 'manual_patrol_tick')

    const worldAfter = await loadWorldState(backend.baseUrl)
    assert.equal(worldAfter.worldVersion, worldBefore.worldVersion, 'llm-disabled patrol must not mutate world')
    const tileStates = (worldAfter.map as unknown as { tileStates?: Array<{ id: string; owner?: string }> }).tileStates ?? []
    const tileAfter = worldAfter.map.tiles.find((tile) => tile.id === seeded.tileId)
    const tileStateAfter = tileStates.find((tile) => tile.id === seeded.tileId)
    assert.notEqual(tileAfter?.owner ?? tileStateAfter?.owner, FACTION_ID, 'llm-disabled patrol must not occupy the candidate tile')
  } finally {
    await backend.stop()
    await relay.stop()
  }
}

async function testPatrolTickSkipsModelProposalWhenAiPlayerPaused() {
  const seeded = seedPatrolPolicySkipWorld()
  const relay = await startPolicySkipRelayProbe()
  const backend = await bootPolicySkipBackend(
    seeded.persistRoot,
    {
      AI_PLAYER_RUNTIME_MODEL_BASE_URL: relay.baseUrl,
      AI_PLAYER_RUNTIME_MODEL_API_KEY: 'patrol-paused-key-fixture',
      AI_PLAYER_RUNTIME_MODEL: 'patrol/strict-json-model',
      AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT: '',
      LLM_RELAY_URL: relay.baseUrl,
      LLM_RELAY_MODEL: 'patrol/strict-json-model',
      LLM_RELAY_API_KEY: 'patrol-paused-key-fixture',
      LLM_RELAY_API_KEYS: '',
      OPENAI_API_KEY: '',
      AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: join(seeded.persistRoot, 'provider_accounts_paused.json'),
    },
    {
      paused: true,
    },
  )
  try {
    await grantPolicySkipAiCommandCredits(backend, 'patrol_paused_skip_contract_grant')
    const worldBefore = await loadWorldState(backend.baseUrl)
    const patrol = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/patrol-tick`,
      'POST',
      {
        triggeredBy: GOVERNOR_PLAYER_ID,
        triggerMode: 'manual',
        goalPower: 4000,
        battleReportLimit: 3,
        cooldownTicks: 6,
      },
    )
    assert.equal(patrol.status, 200, `paused patrol tick failed: ${JSON.stringify(patrol.data)}`)
    const patrolPayload = readObject(patrol.data)
    aiPlayerChatPatrolTickResponseSchema.parse(patrolPayload)
    assert.equal(patrolPayload.ok, true)
    assert.equal(relay.probes.length, 0, 'paused AI player must skip the model HTTP request')
    assert.equal(patrolPayload.modelProposal, undefined)
    assert.equal(patrolPayload.modelProposalMessage, undefined)
    assert.equal(patrolPayload.modelProposalError, undefined)
    assert.equal(patrolPayload.modelDowngradeMessage, undefined)
    assert.equal(patrolPayload.modelProposalSkippedReason, 'ai_player_paused')

    const proposals = await requestJson(backend.baseUrl, `/api/ai/players/proposals?aiPlayerId=${AI_PLAYER_ID}&limit=10`, 'GET')
    assert.equal(proposals.status, 200, `proposal list after paused patrol failed: ${JSON.stringify(proposals.data)}`)
    assert.equal(readArray(readObject(proposals.data).items).length, 0)

    const chatHistory = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20`, 'GET')
    assert.equal(chatHistory.status, 200, `chat history after paused patrol failed: ${JSON.stringify(chatHistory.data)}`)
    const messages = readArray(readObject(chatHistory.data).messages).map((item) => readObject(item))
    assert.equal(messages.length, 1)
    assert.equal(messages[0].kind, 'message')
    assert.equal(readObject(messages[0].metadata).source, 'manual_patrol_tick')

    const worldAfter = await loadWorldState(backend.baseUrl)
    assert.equal(worldAfter.worldVersion, worldBefore.worldVersion, 'paused patrol must not mutate world')
    const tileStates = (worldAfter.map as unknown as { tileStates?: Array<{ id: string; owner?: string }> }).tileStates ?? []
    const tileAfter = worldAfter.map.tiles.find((tile) => tile.id === seeded.tileId)
    const tileStateAfter = tileStates.find((tile) => tile.id === seeded.tileId)
    assert.notEqual(tileAfter?.owner ?? tileStateAfter?.owner, FACTION_ID, 'paused patrol must not occupy the candidate tile')
  } finally {
    await backend.stop()
    await relay.stop()
  }
}

async function testPatrolTickSkipsModelProposalWhenPendingProposalExists() {
  const seeded = seedPatrolPolicySkipWorld()
  const relay = await startPolicySkipRelayProbe()
  const backend = await bootPolicySkipBackend(
    seeded.persistRoot,
    {
      AI_PLAYER_RUNTIME_MODEL_BASE_URL: relay.baseUrl,
      AI_PLAYER_RUNTIME_MODEL_API_KEY: 'patrol-pending-proposal-key-fixture',
      AI_PLAYER_RUNTIME_MODEL: 'patrol/strict-json-model',
      AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT: '',
      LLM_RELAY_URL: relay.baseUrl,
      LLM_RELAY_MODEL: 'patrol/strict-json-model',
      LLM_RELAY_API_KEY: 'patrol-pending-proposal-key-fixture',
      LLM_RELAY_API_KEYS: '',
      OPENAI_API_KEY: '',
      AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: join(seeded.persistRoot, 'provider_accounts_pending_proposal.json'),
    },
    {},
  )
  try {
    await grantPolicySkipAiCommandCredits(backend, 'patrol_pending_proposal_skip_contract_grant')
    const create = await requestJson(backend.baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      action: 'tile_occupy',
      source: 'human',
      reason: 'existing pending proposal should block autonomous patrol model proposal',
      args: {
        unitId: seeded.unitId,
        tileId: seeded.tileId,
      },
    })
    assert.equal(create.status, 200, `create existing pending proposal failed: ${JSON.stringify(create.data)}`)
    const existingProposal = readObject(readObject(create.data).proposal)
    assert.equal(existingProposal.status, 'pending_approval')

    const worldBefore = await loadWorldState(backend.baseUrl)
    const patrol = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/patrol-tick`,
      'POST',
      {
        triggeredBy: GOVERNOR_PLAYER_ID,
        triggerMode: 'manual',
        goalPower: 4000,
        battleReportLimit: 3,
        cooldownTicks: 6,
      },
    )
    assert.equal(patrol.status, 200, `pending-proposal patrol tick failed: ${JSON.stringify(patrol.data)}`)
    const patrolPayload = readObject(patrol.data)
    aiPlayerChatPatrolTickResponseSchema.parse(patrolPayload)
    assert.equal(patrolPayload.ok, true)
    assert.equal(relay.probes.length, 0, 'pending approval proposal must skip the model HTTP request')
    assert.equal(patrolPayload.modelProposal, undefined)
    assert.equal(patrolPayload.modelProposalMessage, undefined)
    assert.equal(patrolPayload.modelProposalError, undefined)
    assert.equal(patrolPayload.modelDowngradeMessage, undefined)
    assert.equal(patrolPayload.modelProposalSkippedReason, 'pending_proposal_exists')

    const proposals = await requestJson(backend.baseUrl, `/api/ai/players/proposals?aiPlayerId=${AI_PLAYER_ID}&limit=10`, 'GET')
    assert.equal(proposals.status, 200, `proposal list after pending-proposal patrol failed: ${JSON.stringify(proposals.data)}`)
    const items = readArray(readObject(proposals.data).items).map((item) => readObject(item))
    assert.equal(items.length, 1)
    assert.equal(items[0].proposalId, existingProposal.proposalId)
    assert.equal(items[0].status, 'pending_approval')

    const chatHistory = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20`, 'GET')
    assert.equal(chatHistory.status, 200, `chat history after pending-proposal patrol failed: ${JSON.stringify(chatHistory.data)}`)
    const messages = readArray(readObject(chatHistory.data).messages).map((item) => readObject(item))
    assert.equal(messages.length, 2)
    assert.equal(messages[0].kind, 'proposal')
    assert.equal(messages[0].proposalId, existingProposal.proposalId)
    assert.equal(messages[1].kind, 'message')

    const worldAfter = await loadWorldState(backend.baseUrl)
    assert.equal(worldAfter.worldVersion, worldBefore.worldVersion, 'pending-proposal patrol must not mutate world')
    const tileStates = (worldAfter.map as unknown as { tileStates?: Array<{ id: string; owner?: string }> }).tileStates ?? []
    const tileAfter = worldAfter.map.tiles.find((tile) => tile.id === seeded.tileId)
    const tileStateAfter = tileStates.find((tile) => tile.id === seeded.tileId)
    assert.notEqual(tileAfter?.owner ?? tileStateAfter?.owner, FACTION_ID, 'pending-proposal patrol must not occupy the candidate tile')
  } finally {
    await backend.stop()
    await relay.stop()
  }
}

async function run() {
  await testPatrolTickSkipsModelProposalWhenAiPlayerDisabled()
  await testPatrolTickSkipsModelProposalWhenLlmProposalsDisabled()
  await testPatrolTickSkipsModelProposalWhenAiPlayerPaused()
  await testPatrolTickSkipsModelProposalWhenPendingProposalExists()
  console.log('[ai_player_http_chat_patrol_model_policy_skip_contract] all checks passed')
}

run().catch((error) => {
  console.error('[ai_player_http_chat_patrol_model_policy_skip_contract] failed:', error)
  process.exitCode = 1
})
