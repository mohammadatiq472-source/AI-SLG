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

type PatrolModelEmptySeed = {
  persistRoot: string
  unitId: string
  tileId: string
}

function seedPatrolModelEmptyWorld(): PatrolModelEmptySeed {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding patrol model empty shard`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding patrol model empty shard`)
  const targetTile = world.map.tiles.find((tile) => tile.type !== 'city' && tile.type !== 'fog')
    ?? world.map.tiles[0]
  assert.ok(targetTile, 'missing target tile while seeding patrol model empty shard')

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
      name: 'Patrol Model Empty AI',
      factionId: FACTION_ID,
      unitIds: [unit.id],
      specialty: 'recon',
    },
  ]

  world.tick = 44
  const persistRoot = join(process.cwd(), 'tmp', `ai_player_http_chat_patrol_model_empty_world_${process.pid}_${Date.now()}`)
  const path = join(persistRoot, 'world_snapshot.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    persistRoot,
    unitId: unit.id,
    tileId: targetTile.id,
  }
}

async function startModelEmptyRelayProbe() {
  const port = await getAvailablePort()
  const probes: string[] = []
  const server = createServer((req, res) => {
    probes.push(String(req.url ?? ''))
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({
      model: 'patrol-model-empty-test-model',
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'patrol observed the candidate but deferred without creating a governed proposal',
              proposals: [],
              deferReason: 'patrol_candidate_deferred',
              needsHumanReview: false,
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

async function bootModelEmptyBackend(
  worldPersistRoot: string,
  envOverrides: NodeJS.ProcessEnv,
): Promise<AiPlayerHttpBackend> {
  const backend = await startAiPlayerHttpBackend(
    'ai_player_http_chat_patrol_model_empty_contract',
    undefined,
    {
      WORLD_PERSIST_ROOT: worldPersistRoot,
      ...envOverrides,
    },
  )
  await joinGovernor(backend.baseUrl)
  const register = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId: AI_PLAYER_ID,
    displayName: 'Patrol Model Empty AI',
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    actionWhitelist: ['battle_report_read', 'troop_heal', 'tile_occupy', 'march_move', 'resource_gather'],
    budgetPolicy: {
      allowHighRiskActions: true,
    },
  })
  assert.equal(register.status, 200, `register patrol model empty AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

async function grantModelEmptyAiCommandCredits(backend: AiPlayerHttpBackend, reason: string) {
  const granted = await requestJson(backend.baseUrl, '/api/ai/provider/ai-command-credits/grants', 'POST', {
    accountId: GOVERNOR_PLAYER_ID,
    worldId: FACTION_ID,
    amountCredits: 100,
    reason,
  })
  assert.equal(granted.status, 200, `grant patrol model empty AI command credits failed: ${JSON.stringify(granted.data)}`)
  assert.equal(readObject(granted.data).ok, true)
}

async function testPatrolTickEmptyModelProposalsSkipsWithoutDowngrade() {
  const seeded = seedPatrolModelEmptyWorld()
  const relay = await startModelEmptyRelayProbe()
  const backend = await bootModelEmptyBackend(seeded.persistRoot, {
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: relay.baseUrl,
    AI_PLAYER_RUNTIME_MODEL_API_KEY: 'patrol-empty-proposals-key-fixture',
    AI_PLAYER_RUNTIME_MODEL: 'patrol/strict-json-model',
    AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT: '',
    LLM_RELAY_URL: relay.baseUrl,
    LLM_RELAY_MODEL: 'patrol/strict-json-model',
    LLM_RELAY_API_KEY: 'patrol-empty-proposals-key-fixture',
    LLM_RELAY_API_KEYS: '',
    OPENAI_API_KEY: '',
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: join(seeded.persistRoot, 'provider_accounts_empty_proposals.json'),
  })
  try {
    await grantModelEmptyAiCommandCredits(backend, 'patrol_empty_proposals_contract_grant')
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
    assert.equal(patrol.status, 200, `empty-proposals patrol tick failed: ${JSON.stringify(patrol.data)}`)
    const patrolPayload = readObject(patrol.data)
    aiPlayerChatPatrolTickResponseSchema.parse(patrolPayload)
    assert.equal(patrolPayload.ok, true)
    assert.equal(relay.probes.length, 1)
    assert.equal(patrolPayload.modelProposal, undefined)
    assert.equal(patrolPayload.modelProposalMessage, undefined)
    assert.equal(patrolPayload.modelDowngradeMessage, undefined)
    assert.equal(patrolPayload.modelProposalError, undefined)
    assert.equal(patrolPayload.modelProposalSkippedReason, 'model_proposal_empty')

    const proposals = await requestJson(backend.baseUrl, `/api/ai/players/proposals?aiPlayerId=${AI_PLAYER_ID}&limit=10`, 'GET')
    assert.equal(proposals.status, 200, `proposal list after empty-proposals patrol failed: ${JSON.stringify(proposals.data)}`)
    assert.equal(readArray(readObject(proposals.data).items).length, 0)

    const chatHistory = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20`, 'GET')
    assert.equal(chatHistory.status, 200, `chat history after empty-proposals patrol failed: ${JSON.stringify(chatHistory.data)}`)
    const messages = readArray(readObject(chatHistory.data).messages).map((item) => readObject(item))
    assert.equal(messages.length, 1)
    assert.equal(messages[0].kind, 'message')

    const failureHistory = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20&filter=failure`, 'GET')
    assert.equal(failureHistory.status, 200, `failure history after empty-proposals patrol failed: ${JSON.stringify(failureHistory.data)}`)
    assert.equal(readArray(readObject(failureHistory.data).messages).length, 0)

    const worldAfter = await loadWorldState(backend.baseUrl)
    assert.equal(worldAfter.worldVersion, worldBefore.worldVersion, 'empty-proposals patrol must not mutate world')
    const tileStates = (worldAfter.map as unknown as { tileStates?: Array<{ id: string; owner?: string }> }).tileStates ?? []
    const tileAfter = worldAfter.map.tiles.find((tile) => tile.id === seeded.tileId)
    const tileStateAfter = tileStates.find((tile) => tile.id === seeded.tileId)
    assert.notEqual(tileAfter?.owner ?? tileStateAfter?.owner, FACTION_ID, 'empty-proposals patrol must not occupy the candidate tile')
  } finally {
    await backend.stop()
    await relay.stop()
  }
}

async function run() {
  await testPatrolTickEmptyModelProposalsSkipsWithoutDowngrade()
  console.log('[ai_player_http_chat_patrol_model_empty_contract] all checks passed')
}

run().catch((error) => {
  console.error('[ai_player_http_chat_patrol_model_empty_contract] failed:', error)
  process.exitCode = 1
})
