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

type PatrolModelValidationSeed = {
  persistRoot: string
  unitId: string
  tileId: string
}

function seedPatrolModelValidationWorld(): PatrolModelValidationSeed {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding patrol model validation shard`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding patrol model validation shard`)
  const targetTile = world.map.tiles.find((tile) => tile.type !== 'city' && tile.type !== 'fog')
    ?? world.map.tiles[0]
  assert.ok(targetTile, 'missing target tile while seeding patrol model validation shard')

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
      name: 'Patrol Model Validation AI',
      factionId: FACTION_ID,
      unitIds: [unit.id],
      specialty: 'recon',
    },
  ]

  world.tick = 44
  const persistRoot = join(process.cwd(), 'tmp', `ai_player_http_chat_patrol_model_validation_world_${process.pid}_${Date.now()}`)
  const path = join(persistRoot, 'world_snapshot.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    persistRoot,
    unitId: unit.id,
    tileId: targetTile.id,
  }
}

async function startModelValidationRelayProbe(contentFactory: () => unknown) {
  const port = await getAvailablePort()
  const probes: string[] = []
  const server = createServer((req, res) => {
    probes.push(String(req.url ?? ''))
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({
      model: 'patrol-model-validation-test-model',
      choices: [
        {
          message: {
            content: contentFactory(),
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

async function bootModelValidationBackend(
  worldPersistRoot: string,
  envOverrides: NodeJS.ProcessEnv,
): Promise<AiPlayerHttpBackend> {
  const backend = await startAiPlayerHttpBackend(
    'ai_player_http_chat_patrol_model_validation_contract',
    undefined,
    {
      WORLD_PERSIST_ROOT: worldPersistRoot,
      ...envOverrides,
    },
  )
  await joinGovernor(backend.baseUrl)
  const register = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId: AI_PLAYER_ID,
    displayName: 'Patrol Model Validation AI',
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    actionWhitelist: ['battle_report_read', 'troop_heal', 'tile_occupy', 'march_move', 'resource_gather'],
    budgetPolicy: {
      allowHighRiskActions: true,
    },
  })
  assert.equal(register.status, 200, `register patrol model validation AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

async function grantModelValidationAiCommandCredits(backend: AiPlayerHttpBackend, reason: string) {
  const granted = await requestJson(backend.baseUrl, '/api/ai/provider/ai-command-credits/grants', 'POST', {
    accountId: GOVERNOR_PLAYER_ID,
    worldId: FACTION_ID,
    amountCredits: 100,
    reason,
  })
  assert.equal(granted.status, 200, `grant patrol model validation AI command credits failed: ${JSON.stringify(granted.data)}`)
  assert.equal(readObject(granted.data).ok, true)
}

async function postPatrolTick(backend: AiPlayerHttpBackend) {
  return requestJson(
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
}

async function assertNoProposalOrWorldMutation(
  backend: AiPlayerHttpBackend,
  seeded: PatrolModelValidationSeed,
  worldVersionBefore: number,
  label: string,
) {
  const proposals = await requestJson(backend.baseUrl, `/api/ai/players/proposals?aiPlayerId=${AI_PLAYER_ID}&limit=10`, 'GET')
  assert.equal(proposals.status, 200, `proposal list after ${label} patrol failed: ${JSON.stringify(proposals.data)}`)
  assert.equal(readArray(readObject(proposals.data).items).length, 0)

  const worldAfter = await loadWorldState(backend.baseUrl)
  assert.equal(worldAfter.worldVersion, worldVersionBefore, `${label} patrol must not mutate world`)
  const tileStates = (worldAfter.map as unknown as { tileStates?: Array<{ id: string; owner?: string }> }).tileStates ?? []
  const tileAfter = worldAfter.map.tiles.find((tile) => tile.id === seeded.tileId)
  const tileStateAfter = tileStates.find((tile) => tile.id === seeded.tileId)
  assert.notEqual(tileAfter?.owner ?? tileStateAfter?.owner, FACTION_ID, `${label} patrol must not occupy the candidate tile`)
}

async function testPatrolTickRejectsModelProposalActionMismatch() {
  const seeded = seedPatrolModelValidationWorld()
  const relay = await startModelValidationRelayProbe(() => JSON.stringify({
    summary: 'patrol tried to switch to a different action and must be rejected',
    proposals: [
      {
        action: 'troop_heal',
        args: {
          unitId: seeded.unitId,
        },
        reason: 'model tried to switch from the selected patrol candidate action to healing',
      },
    ],
    deferReason: '',
    needsHumanReview: true,
  }))
  const backend = await bootModelValidationBackend(seeded.persistRoot, {
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: relay.baseUrl,
    AI_PLAYER_RUNTIME_MODEL_API_KEY: 'patrol-action-mismatch-key-fixture',
    AI_PLAYER_RUNTIME_MODEL: 'patrol/strict-json-model',
    AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT: '',
    LLM_RELAY_URL: relay.baseUrl,
    LLM_RELAY_MODEL: 'patrol/strict-json-model',
    LLM_RELAY_API_KEY: 'patrol-action-mismatch-key-fixture',
    LLM_RELAY_API_KEYS: '',
    OPENAI_API_KEY: '',
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: join(seeded.persistRoot, 'provider_accounts_action_mismatch.json'),
  })
  try {
    await grantModelValidationAiCommandCredits(backend, 'patrol_action_mismatch_contract_grant')
    const worldBefore = await loadWorldState(backend.baseUrl)
    const patrol = await postPatrolTick(backend)
    assert.equal(patrol.status, 200, `action-mismatch patrol tick failed: ${JSON.stringify(patrol.data)}`)
    const patrolPayload = readObject(patrol.data)
    aiPlayerChatPatrolTickResponseSchema.parse(patrolPayload)
    assert.equal(patrolPayload.ok, true)
    assert.equal(relay.probes.length, 1)
    assert.equal(patrolPayload.modelProposal, undefined)
    assert.equal(patrolPayload.modelProposalMessage, undefined)
    assert.equal(patrolPayload.modelProposalError, 'model_proposal_action_mismatch')

    const downgradeMessage = readObject(patrolPayload.modelDowngradeMessage)
    assert.equal(downgradeMessage.kind, 'message')
    assert.equal(downgradeMessage.authorType, 'ai')
    assert.equal(downgradeMessage.failureCode, 'model_proposal_action_mismatch')
    assert.equal(readObject(downgradeMessage.metadata).authorityPreserved, true)

    await assertNoProposalOrWorldMutation(backend, seeded, worldBefore.worldVersion, 'action-mismatch')
  } finally {
    await backend.stop()
    await relay.stop()
  }
}

async function testPatrolTickRejectsModelProposalArgsMismatch() {
  const seeded = seedPatrolModelValidationWorld()
  const relay = await startModelValidationRelayProbe(() => JSON.stringify({
    summary: 'patrol tried to keep the action but swap the target tile',
    proposals: [
      {
        action: 'tile_occupy',
        args: {
          unitId: seeded.unitId,
          tileId: 'model_swapped_tile_id',
        },
        reason: 'model kept the action but changed the selected candidate tile',
      },
    ],
    deferReason: '',
    needsHumanReview: true,
  }))
  const backend = await bootModelValidationBackend(seeded.persistRoot, {
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: relay.baseUrl,
    AI_PLAYER_RUNTIME_MODEL_API_KEY: 'patrol-args-mismatch-key-fixture',
    AI_PLAYER_RUNTIME_MODEL: 'patrol/strict-json-model',
    AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT: '',
    LLM_RELAY_URL: relay.baseUrl,
    LLM_RELAY_MODEL: 'patrol/strict-json-model',
    LLM_RELAY_API_KEY: 'patrol-args-mismatch-key-fixture',
    LLM_RELAY_API_KEYS: '',
    OPENAI_API_KEY: '',
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: join(seeded.persistRoot, 'provider_accounts_args_mismatch.json'),
  })
  try {
    await grantModelValidationAiCommandCredits(backend, 'patrol_args_mismatch_contract_grant')
    const worldBefore = await loadWorldState(backend.baseUrl)
    const patrol = await postPatrolTick(backend)
    assert.equal(patrol.status, 200, `args-mismatch patrol tick failed: ${JSON.stringify(patrol.data)}`)
    const patrolPayload = readObject(patrol.data)
    aiPlayerChatPatrolTickResponseSchema.parse(patrolPayload)
    assert.equal(patrolPayload.ok, true)
    assert.equal(relay.probes.length, 1)
    assert.equal(patrolPayload.modelProposal, undefined)
    assert.equal(patrolPayload.modelProposalMessage, undefined)
    assert.equal(patrolPayload.modelProposalError, 'model_proposal_args_mismatch')

    const downgradeMessage = readObject(patrolPayload.modelDowngradeMessage)
    assert.equal(downgradeMessage.kind, 'message')
    assert.equal(downgradeMessage.failureCode, 'model_proposal_args_mismatch')
    assert.equal(readObject(downgradeMessage.metadata).authorityPreserved, true)

    await assertNoProposalOrWorldMutation(backend, seeded, worldBefore.worldVersion, 'args-mismatch')
  } finally {
    await backend.stop()
    await relay.stop()
  }
}

async function run() {
  await testPatrolTickRejectsModelProposalActionMismatch()
  await testPatrolTickRejectsModelProposalArgsMismatch()
  console.log('[ai_player_http_chat_patrol_model_validation_contract] all checks passed')
}

run().catch((error) => {
  console.error('[ai_player_http_chat_patrol_model_validation_contract] failed:', error)
  process.exitCode = 1
})
