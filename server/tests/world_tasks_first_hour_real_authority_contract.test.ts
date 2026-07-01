import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { createInitialWorldState } from '../../shared/domain/scenario'
import type { WorldState, WorldTasksReadModel, WorldTasksReadModelTask } from '../../shared/contracts/game/world'
import {
  DEFAULT_WORLD_TASKS_SCENARIO_ID,
  DEFAULT_WORLD_TASKS_SCENARIO_VERSION,
  DEFAULT_WORLD_TASKS_SEASON_RUN_ID,
  buildWorldTasksReadModel,
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

function readWorldTasksPayload(value: unknown): WorldTasksReadModel {
  const root = readObject(value)
  return readObject(root.worldTasks) as unknown as WorldTasksReadModel
}

function readWorldStatePayload(value: unknown): WorldState {
  const root = readObject(value)
  return readObject(root.world) as unknown as WorldState
}

function findTask(model: WorldTasksReadModel, taskId: string): WorldTasksReadModelTask {
  const task = model.tasks.find((candidate) => candidate.taskId === taskId)
  assert.ok(task, `missing task ${taskId}`)
  return task
}

function seedWorldWithFirstHourRealSignals(): string {
  const world = createInitialWorldState()
  world.worldTasks = {
    activeScenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
    scenarioVersion: DEFAULT_WORLD_TASKS_SCENARIO_VERSION,
    seasonRunId: DEFAULT_WORLD_TASKS_SEASON_RUN_ID,
    activeChapterId: 'huangtian_chapter_01',
    achievedTaskIds: [],
    claimedTaskIds: [],
  }

  const player = world.factions.player
  assert.ok(player, 'seed world should include player faction')
  player.food = 1600
  player.wood = 800
  player.stone = 700
  player.iron = 500

  world.slgDomainState = {
    ...(world.slgDomainState ?? {}),
    cityBuildingGroupsByCity: {
      ...(world.slgDomainState?.cityBuildingGroupsByCity ?? {}),
      tile_08: {
        core: {
          government: {
            level: 1,
            statusText: '主城政厅已打开',
            updatedTick: world.tick,
          },
        },
      },
    },
  }

  world.map.tiles = world.map.tiles.map((tile) => {
    if (tile.id === 'tile_03') {
      return {
        ...tile,
        owner: 'player',
        type: 'resource',
        resourceKind: 'stone',
        resourceLevel: 4,
      }
    }
    if (tile.id === 'tile_07') {
      return {
        ...tile,
        owner: 'player',
        type: 'resource',
        resourceKind: 'iron',
        resourceLevel: 3,
      }
    }
    return tile
  })
  world.intel.tile_03 = {
    level: 'confirmed',
    lastScoutedTick: world.tick,
    summary: '已确认近郊石料矿脉，可作为第一小时开荒矿脉目标。',
  }

  const path = buildSessionPersistPath('world_tasks_first_hour_real_authority_contract_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return path
}

function applyChapterTwoRealSignals(world: WorldState) {
  world.worldTasks = {
    activeScenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
    scenarioVersion: DEFAULT_WORLD_TASKS_SCENARIO_VERSION,
    seasonRunId: DEFAULT_WORLD_TASKS_SEASON_RUN_ID,
    activeChapterId: 'huangtian_chapter_02',
    achievedTaskIds: [],
    claimedTaskIds: [],
  }
  world.slgDomainState = {
    ...(world.slgDomainState ?? {}),
    troopFacilitiesByUnit: {
      ...(world.slgDomainState?.troopFacilitiesByUnit ?? {}),
      unit_player_1: {
        drill_ground: {
          roster: {
            level: 1,
            statusText: '校场编队已查看',
            updatedTick: world.tick,
          },
          preparation: {
            level: 1,
            statusText: '校场编队已准备',
            updatedTick: world.tick,
          },
        },
      },
    },
    aiStateByFaction: {
      ...(world.slgDomainState?.aiStateByFaction ?? {}),
      player: {
        agenda: {
          source: 'm2_second_batch_contract',
          summary: 'AI 活动已观察：巡队正在检查主城外缘。',
        },
        execution: {
          status: 'running',
          activeOrderCount: 1,
          queuedOrderCount: 0,
          runningOrderCount: 1,
          actionPointsRemaining: 4,
          foodRemaining: 1200,
          requestId: 'ai_activity_observed_m2_second_batch',
          strategicCommand: '派出巡队检查主城外缘的敌情与道路。',
          updatedTick: world.tick,
          updatedWorldVersion: world.worldVersion,
        },
      },
    },
  }
}

function applyChapterThreeRealSignals(world: WorldState) {
  world.worldTasks = {
    activeScenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
    scenarioVersion: DEFAULT_WORLD_TASKS_SCENARIO_VERSION,
    seasonRunId: DEFAULT_WORLD_TASKS_SEASON_RUN_ID,
    activeChapterId: 'huangtian_chapter_03',
    achievedTaskIds: [],
    claimedTaskIds: [],
  }
  world.factions.player.food = 2200
  world.factions.player.wood = 1200
  world.factions.player.stone = 900
  world.reports = [
    {
      id: 'battle_report_opened_m2_second_batch',
      tick: world.tick,
      title: '战报已打开：粮道巡查',
      detail: '战报已打开，玩家已查看 AI 巡队回报并标定第一条短程补给路线。',
    },
  ]
}

function assertFirstHourRealAuthority(model: WorldTasksReadModel) {
  const confirmCity = findTask(model, 'huangtian_task_01_confirm_city')
  const prepareSupplies = findTask(model, 'huangtian_task_02_prepare_supplies')
  const surveyMines = findTask(model, 'huangtian_task_03_survey_mines')

  for (const task of [confirmCity, prepareSupplies, surveyMines]) {
    assert.equal(task.settlementAuthority, 'real_authority', `${task.taskId} should be backed by real authority`)
    assert.ok(task.realAuthoritySignals.length > 0, `${task.taskId} should expose real authority signals`)
    assert.ok(task.realAuthoritySignals.every((signal) => signal.satisfied), `${task.taskId} should have satisfied signals`)
    assert.doesNotMatch(task.progressText, /achieveTaskPrototype|真实.*authority 尚未接入|等待后续真实玩法目标结算器接入/)
  }

  assert.equal(confirmCity.status, 'achieved')
  assert.equal(confirmCity.claimState, 'claimable')
  assert.equal(confirmCity.canClaim, true)
  assert.equal(prepareSupplies.status, 'achieved')
  assert.equal(surveyMines.status, 'achieved')
}

function assertChapterTwoRealAuthority(model: WorldTasksReadModel) {
  const registerMilitia = findTask(model, 'huangtian_task_04_register_militia')
  const drillGround = findTask(model, 'huangtian_task_05_drill_ground')
  const assignPatrol = findTask(model, 'huangtian_task_06_assign_patrol')

  assertTaskBackedBySignal(registerMilitia, 'troop_formation_viewed')
  assertTaskBackedBySignal(drillGround, 'troop_formation_prepared')
  assertTaskBackedBySignal(assignPatrol, 'ai_activity_observed')
}

function assertChapterThreeRealAuthority(model: WorldTasksReadModel) {
  const countGrain = findTask(model, 'huangtian_task_07_count_grain')
  const prepareCarts = findTask(model, 'huangtian_task_08_prepare_carts')
  const markSupplyRoute = findTask(model, 'huangtian_task_09_mark_supply_route')

  assertTaskBackedBySignal(countGrain, 'resource_stockpile_ready')
  assertTaskBackedBySignal(prepareCarts, 'resource_stockpile_ready')
  assertTaskBackedBySignal(markSupplyRoute, 'battle_report_opened')
}

function assertTaskBackedBySignal(
  task: WorldTasksReadModelTask,
  signalKind: WorldTasksReadModelTask['realAuthoritySignals'][number]['kind'],
) {
  assert.equal(task.settlementAuthority, 'real_authority', `${task.taskId} should be backed by real authority`)
  assert.equal(task.status, 'achieved', `${task.taskId} should be achieved by real signal`)
  assert.equal(task.claimState, 'claimable', `${task.taskId} should be claimable by real signal`)
  assert.equal(task.canClaim, true, `${task.taskId} should be claimable`)
  assert.ok(
    task.realAuthoritySignals.some((signal) => signal.kind === signalKind && signal.satisfied),
    `${task.taskId} should expose satisfied ${signalKind}`,
  )
  assert.doesNotMatch(task.progressText, /achieveTaskPrototype|真实.*authority 尚未接入|等待后续真实玩法目标结算器接入/)
}

function assertPrototypeHelperStaysOutOfPlayerFacingReadModel(model: WorldTasksReadModel) {
  const firstHourText = model.tasks
    .filter((task) => task.taskId.startsWith('huangtian_task_0'))
    .map((task) => `${task.title}\n${task.objectiveText}\n${task.progressText}`)
    .join('\n')
  assert.doesNotMatch(firstHourText, /achieveTaskPrototype/)
}

function assertRuntimeStateNotPolluted(world: WorldState) {
  const runtime = readObject(world.worldTasks)
  assert.deepEqual(
    Object.keys(runtime).sort(),
    ['activeChapterId', 'achievedTaskIds', 'activeScenarioId', 'claimedTaskIds', 'scenarioVersion', 'seasonRunId'].sort(),
    'real authority binding must stay read-model-only and not persist catalog/signal fields into worldTasks runtime',
  )
}

function testDirectReadModelFirstHourRealSignals() {
  const world = createInitialWorldState()
  world.factions.player.food = 1600
  world.factions.player.wood = 800
  world.factions.player.stone = 700
  world.factions.player.iron = 500
  world.slgDomainState = {
    ...(world.slgDomainState ?? {}),
    cityBuildingGroupsByCity: {
      tile_08: {
        core: {
          government: {
            level: 1,
            statusText: '主城政厅已打开',
            updatedTick: world.tick,
          },
        },
      },
    },
  }
  world.map.tiles = world.map.tiles.map((tile) => tile.id === 'tile_03' ? { ...tile, resourceKind: 'stone', owner: 'player' } : tile)
  world.intel.tile_03 = {
    level: 'confirmed',
    lastScoutedTick: world.tick,
    summary: '已确认近郊石料矿脉，可作为第一小时开荒矿脉目标。',
  }

  const model = buildWorldTasksReadModel(world, 'player')
  assert.equal(findTask(model, 'huangtian_task_01_confirm_city').settlementAuthority, 'real_authority')
}

function testDirectReadModelChapterTwoThreeRealSignals() {
  const chapterTwoWorld = createInitialWorldState()
  applyChapterTwoRealSignals(chapterTwoWorld)
  assertChapterTwoRealAuthority(buildWorldTasksReadModel(chapterTwoWorld, 'player'))

  const chapterThreeWorld = createInitialWorldState()
  applyChapterThreeRealSignals(chapterThreeWorld)
  assertChapterThreeRealAuthority(buildWorldTasksReadModel(chapterThreeWorld, 'player'))
}

async function run() {
  testDirectReadModelFirstHourRealSignals()
  testDirectReadModelChapterTwoThreeRealSignals()

  const path = seedWorldWithFirstHourRealSignals()
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: path,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const response = await requestJson(baseUrl, '/api/world/tasks', 'GET', undefined, 60_000)
    assert.equal(response.status, 200, `world tasks route failed: ${JSON.stringify(response.data)}`)
    const model = readWorldTasksPayload(response.data)
    assertFirstHourRealAuthority(model)
    assertPrototypeHelperStaysOutOfPlayerFacingReadModel(model)

    const worldResponse = await requestJson(baseUrl, '/api/world', 'GET', undefined, 60_000)
    assert.equal(worldResponse.status, 200, `world route failed: ${JSON.stringify(worldResponse.data)}`)
    assertRuntimeStateNotPolluted(readWorldStatePayload(worldResponse.data))

    console.log('[world_tasks_first_hour_real_authority_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[world_tasks_first_hour_real_authority_contract] failed:', error)
  process.exit(1)
})
