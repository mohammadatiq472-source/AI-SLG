import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { createInitialWorldState } from '../../shared/domain/scenario'
import type { CurrentGoalsReadModel, WorldTasksReadModel } from '../../shared/contracts/game/world'
import {
  DEFAULT_WORLD_TASKS_SCENARIO_ID,
  DEFAULT_WORLD_TASKS_SCENARIO_VERSION,
  DEFAULT_WORLD_TASKS_SEASON_RUN_ID,
} from '../../shared/domain/worldTasks'
import {
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  joinGovernor,
  startAiPlayerHttpBackend,
  type AiPlayerHttpBackend,
} from './helpers/aiPlayerHttpContractHarness'
import { buildSessionPersistPath, readArray, readObject, requestJson } from './helpers/backendHarness'

function seedLivingWorldLoopState(): { path: string; tileId: string } {
  const world = createInitialWorldState()
  world.worldTasks = {
    activeScenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
    scenarioVersion: DEFAULT_WORLD_TASKS_SCENARIO_VERSION,
    seasonRunId: DEFAULT_WORLD_TASKS_SEASON_RUN_ID,
    activeChapterId: 'huangtian_chapter_02',
    achievedTaskIds: [],
    claimedTaskIds: [],
  }
  world.slgDomainState = undefined

  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID}`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID}`)
  const resourceTile = world.map.tiles.find((tile) => tile.type === 'resource') ?? world.map.tiles[0]
  assert.ok(resourceTile, 'missing resource tile')

  resourceTile.name = 'M3 Living World Loop Resource Tile'
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
  faction.food = Math.max(faction.food, 1000)
  faction.wood = Math.max(faction.wood ?? 0, 1000)
  faction.stone = Math.max(faction.stone ?? 0, 1000)
  faction.iron = Math.max(faction.iron ?? 0, 1000)
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
      resources: { food: 0, wood: 0, stone: 0, iron: 0 },
      updatedTick: world.tick,
    },
  }
  faction.aiResourceGatherClaims = {}

  const path = buildSessionPersistPath('ai_player_integrated_living_world_loop_contract_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { path, tileId: resourceTile.id }
}

async function bootLivingWorldBackend(worldPersistPath: string): Promise<AiPlayerHttpBackend> {
  const backend = await startAiPlayerHttpBackend(
    'ai_player_integrated_living_world_loop_contract',
    undefined,
    { WORLD_STATE_PERSIST_PATH: worldPersistPath },
  )
  await joinGovernor(backend.baseUrl)
  const register = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId: AI_PLAYER_ID,
    displayName: 'Player Operator Alpha',
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    actionWhitelist: ['resource_gather'],
  })
  assert.equal(register.status, 200, `register AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

function readWorldTasksPayload(value: unknown): WorldTasksReadModel {
  return readObject(readObject(value).worldTasks) as unknown as WorldTasksReadModel
}

function readCurrentGoalsPayload(value: unknown): CurrentGoalsReadModel {
  return readObject(readObject(value).currentGoals) as unknown as CurrentGoalsReadModel
}

async function run() {
  const seeded = seedLivingWorldLoopState()
  const backend = await bootLivingWorldBackend(seeded.path)
  try {
    const runResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/run`,
      'POST',
      {
        maxSteps: 1,
        plannerMode: 'rule',
        triggeredBy: 'm3_integrated_living_world_loop_contract',
      },
      60_000,
    )
    assert.equal(runResponse.status, 200, `autonomous development run failed: ${JSON.stringify(runResponse.data)}`)

    const traceResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/execution-trace?limit=5`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(traceResponse.status, 200, `execution trace route failed: ${JSON.stringify(traceResponse.data)}`)
    const traceItems = readArray(readObject(traceResponse.data).items).map((item) => readObject(item))
    const gatherTrace = traceItems.find((item) => item.action === 'resource_gather')
    assert.ok(gatherTrace, 'M3 loop should produce an AI execution trace item')
    assert.equal(gatherTrace.factionId, FACTION_ID)
    assert.equal(gatherTrace.sourceKind, 'autonomous_development')
    assert.equal(gatherTrace.visibility, 'player')
    assert.equal(gatherTrace.targetTileId, seeded.tileId)

    const traceSourceId = String(gatherTrace.traceId ?? gatherTrace.id ?? `${AI_PLAYER_ID}:resource_gather:${seeded.tileId}`)
    const recordResponse = await requestJson(
      backend.baseUrl,
      '/api/world/action?includeWorld=true',
      'POST',
      {
        action: 'recordWorldTaskEvent',
        payload: {
          factionId: FACTION_ID,
          scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
          scenarioVersion: DEFAULT_WORLD_TASKS_SCENARIO_VERSION,
          seasonRunId: DEFAULT_WORLD_TASKS_SEASON_RUN_ID,
          taskId: 'huangtian_task_06_assign_patrol',
          kind: 'ai_activity_observed',
          source: 'ai_trace',
          sourceId: traceSourceId,
          summary: String(gatherTrace.summary ?? gatherTrace.title ?? 'AI activity observed'),
        },
      },
      60_000,
    )
    assert.equal(recordResponse.status, 200, `recordWorldTaskEvent from AI trace failed: ${JSON.stringify(recordResponse.data)}`)
    assert.equal(readObject(recordResponse.data).ok, true)

    const tasksResponse = await requestJson(backend.baseUrl, '/api/world/tasks', 'GET', undefined, 60_000)
    assert.equal(tasksResponse.status, 200, `tasks route failed after AI trace event: ${JSON.stringify(tasksResponse.data)}`)
    const task = readWorldTasksPayload(tasksResponse.data).tasks.find((candidate) => candidate.taskId === 'huangtian_task_06_assign_patrol')
    assert.ok(task, 'chapter 2 task 06 should be visible')
    assert.equal(task.settlementAuthority, 'real_authority')
    assert.equal(task.status, 'achieved')
    assert.ok(
      task.realAuthoritySignals.some(
        (signal) => signal.kind === 'ai_activity_observed' && signal.satisfied && signal.id.startsWith('world_task_event_'),
      ),
      'task 06 should bind to a persisted AI trace ledger event',
    )

    const currentGoalsResponse = await requestJson(
      backend.baseUrl,
      '/api/world?currentGoals=true&factionId=player',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(currentGoalsResponse.status, 200, `current goals route failed: ${JSON.stringify(currentGoalsResponse.data)}`)
    const currentGoals = readCurrentGoalsPayload(currentGoalsResponse.data)
    const growthGoals = currentGoals.layers.find((layer) => layer.layerId === 'growth')?.goals ?? []
    assert.ok(
      growthGoals.some(
        (goal) =>
          goal.goalId === 'growth:ai-development-combat-loop' &&
          goal.authority === 'real_authority' &&
          goal.sourceRefs.some((source) => source.kind === 'worldTasks' && source.id === 'huangtian_task_06_assign_patrol'),
      ),
      'current-goals growth layer should surface the AI-integrated living-world task as real authority',
    )

    const reportsResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/player-reports?limit=5`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(reportsResponse.status, 200, `AI player report route failed: ${JSON.stringify(reportsResponse.data)}`)
    assert.equal(readObject(reportsResponse.data).ok, true)

    console.log('[ai_player_integrated_living_world_loop_contract] all checks passed')
  } finally {
    await backend.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_integrated_living_world_loop_contract] failed:', error)
  process.exitCode = 1
})
