import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  joinGovernor,
  startAiPlayerHttpBackend,
  type AiPlayerHttpBackend,
} from './helpers/aiPlayerHttpContractHarness'
import { buildSessionPersistPath, readArray, readObject, requestJson } from './helpers/backendHarness'

const FORBIDDEN_PLAYER_TRACE_KEYS = [
  'proposalId',
  'relatedProposalId',
  'relatedReceiptProposalId',
  'worldAction',
  'worldActionPayload',
  'receipt',
  'execution',
  'plannerDecision',
  'observation',
]

function seedWorldStateWithTraceResourceTarget(): { path: string; unitId: string; tileId: string } {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding AI player execution trace shard`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding AI player execution trace shard`)
  const resourceTile = world.map.tiles.find((tile) => tile.type === 'resource') ?? world.map.tiles[0]
  assert.ok(resourceTile, 'missing resource tile while seeding AI player execution trace shard')

  resourceTile.name = 'AI Execution Trace Resource Tile'
  resourceTile.type = 'resource'
  resourceTile.owner = FACTION_ID
  resourceTile.enemyPressure = 0
  resourceTile.resourceKind = 'wood'
  resourceTile.resourceLevel = 1

  unit.tileId = resourceTile.id
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = Math.max(unit.strength, 100)
  unit.mobility = Math.max(unit.mobility, 100)
  unit.supply = Math.max(unit.supply, 100)

  faction.actionPoints = 100
  faction.food = 100
  faction.wood = Math.max(faction.wood ?? 0, 100)
  faction.stone = Math.max(faction.stone ?? 0, 100)
  faction.iron = Math.max(faction.iron ?? 0, 100)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Player Operator Alpha',
      factionId: FACTION_ID,
      unitIds: [unit.id],
      specialty: 'logistics',
    },
  ]
  faction.aiResourceAccounts = {
    [AI_PLAYER_ID]: {
      aiPlayerId: AI_PLAYER_ID,
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      resources: {
        food: 0,
        wood: 0,
        stone: 0,
        iron: 0,
      },
      updatedTick: world.tick,
    },
  }
  faction.aiResourceGatherClaims = {}

  const path = buildSessionPersistPath('ai_player_execution_trace_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { path, unitId: unit.id, tileId: resourceTile.id }
}

async function bootTraceBackend(worldPersistPath: string): Promise<AiPlayerHttpBackend> {
  const backend = await startAiPlayerHttpBackend(
    'ai_player_execution_trace_contract',
    undefined,
    {
      WORLD_STATE_PERSIST_PATH: worldPersistPath,
    },
  )
  await joinGovernor(backend.baseUrl)
  const register = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId: AI_PLAYER_ID,
    displayName: 'Player Operator Alpha',
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    actionWhitelist: ['resource_gather'],
  })
  assert.equal(register.status, 200, `register execution trace AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

function assertNoForbiddenTraceKeys(value: unknown) {
  const serialized = JSON.stringify(value)
  for (const forbidden of FORBIDDEN_PLAYER_TRACE_KEYS) {
    assert.equal(serialized.includes(forbidden), false, `execution trace must not expose ${forbidden}`)
  }
}

function assertNonEmptyString(value: unknown, label: string) {
  assert.equal(typeof value, 'string', `${label} should be a string`)
  assert.ok(String(value).trim().length > 0, `${label} should not be empty`)
}

async function run() {
  const seeded = seedWorldStateWithTraceResourceTarget()
  const backend = await bootTraceBackend(seeded.path)
  try {
    const runResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/run`,
      'POST',
      {
        maxSteps: 1,
        plannerMode: 'rule',
        triggeredBy: 'execution_trace_contract',
      },
      60_000,
    )
    assert.equal(runResponse.status, 200, `autonomous development run failed: ${JSON.stringify(runResponse.data)}`)
    const runPayload = readObject(readObject(runResponse.data).run)
    const steps = readArray(runPayload.steps).map((item) => readObject(item))
    assert.equal(steps.length, 1, 'trace contract fixture should execute one autonomous step')
    assert.equal(steps[0]?.selectedAction, 'resource_gather', 'trace contract fixture should gather the owned resource tile')

    const traceResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/execution-trace?limit=5`,
      'GET',
    )
    assert.equal(traceResponse.status, 200, `execution trace route failed: ${JSON.stringify(traceResponse.data)}`)
    const tracePayload = readObject(traceResponse.data)
    assert.equal(tracePayload.ok, true)
    assert.equal(tracePayload.aiPlayerId, AI_PLAYER_ID)
    assert.equal(tracePayload.ownerPlayerId, GOVERNOR_PLAYER_ID)

    const traceItems = readArray(tracePayload.items).map((item) => readObject(item))
    const gatherTrace = traceItems.find((item) => item.action === 'resource_gather')
    assert.ok(gatherTrace, 'execution trace should include the autonomous resource_gather step')
    assert.equal(gatherTrace.aiPlayerId, AI_PLAYER_ID)
    assert.equal(gatherTrace.ownerPlayerId, GOVERNOR_PLAYER_ID)
    assert.equal(gatherTrace.factionId, FACTION_ID)
    assert.equal(gatherTrace.sourceKind, 'autonomous_development')
    assert.equal(gatherTrace.phase, 'completed')
    assert.equal(gatherTrace.visibility, 'player')
    assert.equal(gatherTrace.targetTileId, seeded.tileId)
    assertNonEmptyString(gatherTrace.title, 'trace title')
    assertNonEmptyString(gatherTrace.summary, 'trace summary')
    assertNonEmptyString(gatherTrace.result, 'trace result')
    assertNonEmptyString(gatherTrace.currentTaskText, 'trace currentTaskText')
    const marker = readObject(gatherTrace.marker)
    assert.equal(marker.kind, 'completed')
    assert.equal(marker.tileId, seeded.tileId)
    assertNonEmptyString(marker.label, 'trace marker label')
    assertNoForbiddenTraceKeys(tracePayload)

    console.log('[ai_player_execution_trace_contract] all checks passed')
  } finally {
    await backend.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_execution_trace_contract] failed:', error)
  process.exitCode = 1
})
