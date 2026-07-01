import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import assert from 'node:assert/strict'
import type {
  CurrentGoalsReadModel,
  Unit,
  WorldActionReceipt,
  WorldState,
  WorldTasksReadModel,
  WorldTasksReadModelTask,
} from '../../shared/contracts/game/world'
import type { ResourceKind } from '../../shared/contracts/game'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  DEFAULT_WORLD_TASKS_SCENARIO_ID,
  DEFAULT_WORLD_TASKS_SCENARIO_VERSION,
  DEFAULT_WORLD_TASKS_SEASON_RUN_ID,
} from '../../shared/domain/worldTasks'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

const FACTION_ID = 'player'
const TARGET_TASK_ID = 'huangtian_task_02_prepare_supplies'
const TARGET_RESOURCE_KIND: Extract<ResourceKind, 'food'> = 'food'
const TARGET_RESOURCE_LEVEL = 3
const EXPECTED_CAPTURE_REWARD = TARGET_RESOURCE_LEVEL * 2 * 100
const EXPECTED_NET_FOOD_DELTA = EXPECTED_CAPTURE_REWARD - 1

function readWorldStatePayload(value: unknown): WorldState {
  return readObject(readObject(value).world) as unknown as WorldState
}

function readWorldTasksPayload(value: unknown): WorldTasksReadModel {
  return readObject(readObject(value).worldTasks) as unknown as WorldTasksReadModel
}

function readCurrentGoalsPayload(value: unknown): CurrentGoalsReadModel {
  return readObject(readObject(value).currentGoals) as unknown as CurrentGoalsReadModel
}

function readPersistedWorldState(path: string): WorldState {
  assert.ok(existsSync(path), `persisted world state should exist at ${path}`)
  return JSON.parse(readFileSync(path, 'utf-8')) as WorldState
}

function findTask(model: WorldTasksReadModel, taskId: string): WorldTasksReadModelTask {
  const task = model.tasks.find((candidate) => candidate.taskId === taskId)
  assert.ok(task, `missing task ${taskId}`)
  return task
}

function cloneReadyUnit(base: Unit, id: string, tileId: string): Unit {
  const unit = structuredClone(base)
  unit.id = id
  unit.name = 'first hour task binding unit'
  unit.tileId = tileId
  unit.currentTask = undefined
  unit.strength = 9999
  unit.supply = 99
  unit.mobility = 99
  unit.corps = {
    ...unit.corps,
    readiness: 100,
    roster: [`${id}-roster`],
  }
  unit.hero = {
    ...unit.hero,
    id: `${id}_hero`,
    name: 'First Hour Resource Hero',
    level: 20,
    exp: 0,
    force: 999,
    command: 999,
    intelligence: 999,
    charisma: 999,
    speed: 999,
  }
  unit.coHeroes = []
  return unit
}

function seedWorldStateWithFirstHourResourceTarget(): {
  path: string
  unitId: string
  tileId: string
  playerFoodBefore: number
} {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID}`)
  const baseUnit = world.units.find((unit) => unit.faction === FACTION_ID)
  assert.ok(baseUnit, `missing base unit for ${FACTION_ID}`)
  const targetTile = world.map.tiles.find((tile) => tile.type !== 'city' && tile.type !== 'fog')
  assert.ok(targetTile, 'missing occupiable tile for first-hour task binding gate')

  targetTile.type = 'resource'
  targetTile.terrain = 'grassland'
  targetTile.owner = 'neutral'
  targetTile.resourceKind = TARGET_RESOURCE_KIND
  targetTile.resourceLevel = TARGET_RESOURCE_LEVEL
  targetTile.enemyPressure = 0
  targetTile.moveCost = 1

  const unitId = 'first_hour_task_binding_unit'
  world.units = [
    ...world.units.filter((unit) => unit.faction !== FACTION_ID),
    cloneReadyUnit(baseUnit, unitId, targetTile.id),
  ]
  world.feedback.battleRecords = []
  world.reports = []
  world.executions[FACTION_ID] = null
  world.worldTaskEvents = { schemaVersion: 'world_task_event_ledger_v1', events: [] }
  world.worldTasks = {
    activeScenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
    scenarioVersion: DEFAULT_WORLD_TASKS_SCENARIO_VERSION,
    seasonRunId: DEFAULT_WORLD_TASKS_SEASON_RUN_ID,
    activeChapterId: 'huangtian_chapter_01',
    achievedTaskIds: ['huangtian_task_01_confirm_city'],
    claimedTaskIds: ['huangtian_task_01_confirm_city'],
  }
  faction.actionPoints = 100
  faction.food = 1000
  faction.wood = 0
  faction.stone = 0
  faction.iron = 0

  const path = buildSessionPersistPath('resource_expedition_first_hour_task_progress_binding_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    unitId,
    tileId: targetTile.id,
    playerFoodBefore: faction.food,
  }
}

async function waitForTaskLedger(path: string, tileId: string): Promise<WorldState> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const world = readPersistedWorldState(path)
    const event = world.worldTaskEvents?.events.find((candidate) => (
      candidate.taskId === TARGET_TASK_ID &&
      candidate.kind === 'resource_stockpile_ready' &&
      candidate.source === 'battle_report' &&
      candidate.sourceId === tileId
    ))
    if (event) {
      return world
    }
    await delay(250)
  }
  throw new Error(`resource expedition did not persist first-hour task event for ${TARGET_TASK_ID}`)
}

async function run() {
  const seeded = seedWorldStateWithFirstHourResourceTarget()
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seeded.path,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const beforeTasksResponse = await requestJson(baseUrl, '/api/world/tasks', 'GET', undefined, 60_000)
    assert.equal(beforeTasksResponse.status, 200, `tasks route failed before occupy: ${JSON.stringify(beforeTasksResponse.data)}`)
    const beforeTask = findTask(readWorldTasksPayload(beforeTasksResponse.data), TARGET_TASK_ID)
    assert.equal(beforeTask.status, 'active')
    assert.equal(beforeTask.claimState, 'unavailable')
    assert.equal(beforeTask.settlementAuthority, 'prototype_only')

    const occupyResponse = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'occupyTile',
      payload: {
        factionId: FACTION_ID,
        unitId: seeded.unitId,
        tileId: seeded.tileId,
      },
    }, 60_000)
    assert.equal(occupyResponse.status, 200, `occupyTile route failed: ${JSON.stringify(occupyResponse.data)}`)
    const occupyPayload = readObject(occupyResponse.data)
    assert.equal(occupyPayload.ok, true, `occupyTile should succeed: ${JSON.stringify(occupyPayload)}`)
    const receipt = readObject(occupyPayload.receipt) as WorldActionReceipt
    assert.equal(receipt.resourceTileSettlementStatus, 'ready')
    assert.equal(receipt.resourceKind, TARGET_RESOURCE_KIND)
    assert.equal(receipt.tileLevel, TARGET_RESOURCE_LEVEL)
    assert.equal(receipt.resourceRewardDelta?.food, EXPECTED_CAPTURE_REWARD)
    assert.equal(receipt.resourcesSpent?.food, 1)

    const actionWorld = readWorldStatePayload(occupyResponse.data)
    const faction = actionWorld.factions[FACTION_ID]
    assert.ok(faction, `missing faction ${FACTION_ID} after occupy`)
    assert.equal(faction.food, seeded.playerFoodBefore + EXPECTED_NET_FOOD_DELTA)

    const event = actionWorld.worldTaskEvents?.events.find((candidate) => (
      candidate.taskId === TARGET_TASK_ID &&
      candidate.kind === 'resource_stockpile_ready' &&
      candidate.source === 'battle_report' &&
      candidate.sourceId === seeded.tileId
    ))
    assert.ok(event, 'occupyTile should append first-hour resource expedition task event')
    assert.equal(event.authority, 'real_authority')

    await waitForTaskLedger(seeded.path, seeded.tileId)

    const afterTasksResponse = await requestJson(baseUrl, '/api/world/tasks', 'GET', undefined, 60_000)
    assert.equal(afterTasksResponse.status, 200, `tasks route failed after occupy: ${JSON.stringify(afterTasksResponse.data)}`)
    const afterTask = findTask(readWorldTasksPayload(afterTasksResponse.data), TARGET_TASK_ID)
    assert.equal(afterTask.status, 'achieved')
    assert.equal(afterTask.claimState, 'claimable')
    assert.equal(afterTask.canClaim, true)
    assert.equal(afterTask.settlementAuthority, 'real_authority')
    assert.ok(
      afterTask.realAuthoritySignals.some((signal) => (
        signal.kind === 'resource_stockpile_ready' &&
        signal.satisfied &&
        signal.id === event.eventId
      )),
      'task readback should bind progress to the resource expedition ledger event',
    )
    assert.ok(!/achieveTaskPrototype|read model|authority|tier|backend|contract id|守军强度/.test(afterTask.progressText))

    const currentGoalsResponse = await requestJson(baseUrl, '/api/world?currentGoals=true&factionId=player', 'GET', undefined, 60_000)
    assert.equal(currentGoalsResponse.status, 200, `current-goals route failed: ${JSON.stringify(currentGoalsResponse.data)}`)
    const currentGoals = readCurrentGoalsPayload(currentGoalsResponse.data)
    const firstHourLayer = currentGoals.layers.find((layer) => layer.layerId === 'firstHour')
    assert.ok(firstHourLayer, 'current-goals should include firstHour layer')
    assert.ok(
      firstHourLayer.goals.some((goal) => goal.sourceRefs.some((ref) => ref.kind === 'worldTasks' && ref.id === 'huangtian_task_03_survey_mines')),
      'current-goals firstHour layer should advance the visible next step after task 02 is achieved',
    )
    const growthLayer = currentGoals.layers.find((layer) => layer.layerId === 'growth')
    assert.ok(growthLayer, 'current-goals should include growth layer')
    assert.ok(
      growthLayer.goals.some((goal) => goal.authority === 'real_authority' && goal.sourceRefs.some((ref) => ref.kind === 'worldTasks' && ref.id === TARGET_TASK_ID)),
      'current-goals growth layer should preserve the real-authority task 02 readback',
    )

    const claimResponse = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'claimTaskReward',
      payload: {
        factionId: FACTION_ID,
        scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
        scenarioVersion: DEFAULT_WORLD_TASKS_SCENARIO_VERSION,
        seasonRunId: DEFAULT_WORLD_TASKS_SEASON_RUN_ID,
        taskId: TARGET_TASK_ID,
      },
    }, 60_000)
    assert.equal(claimResponse.status, 200, `claimTaskReward failed: ${JSON.stringify(claimResponse.data)}`)
    const claimPayload = readObject(claimResponse.data)
    assert.equal(claimPayload.ok, true, `task should be claimable after resource expedition: ${JSON.stringify(claimPayload)}`)

    console.log('[resource_expedition_first_hour_task_progress_binding_gate_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[resource_expedition_first_hour_task_progress_binding_gate_contract] failed:', error)
  process.exitCode = 1
})
