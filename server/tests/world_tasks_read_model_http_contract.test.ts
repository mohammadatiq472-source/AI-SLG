import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  DEFAULT_WORLD_TASKS_SCENARIO_ID,
  buildWorldTasksReadModel,
  listScenarioTaskCatalogs,
} from '../../shared/domain/worldTasks'
import type { WorldState, WorldTasksReadModel } from '../../shared/contracts/game/world'
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

const ALLOWED_TASK_REWARD_KINDS = new Set(['copper', 'food', 'wood', 'stone', 'iron'])
const FORBIDDEN_TASK_REWARD_KINDS = new Set(['jade', 'gold', 'jinzhu', 'jinzhu_gold'])

function readWorldTasksPayload(value: unknown): WorldTasksReadModel {
  const root = readObject(value)
  return readObject(root.worldTasks) as unknown as WorldTasksReadModel
}

function readWorldStatePayload(value: unknown): WorldState {
  const root = readObject(value)
  const world = readObject(root.world)
  return world as unknown as WorldState
}

function readPersistedWorldState(path: string): WorldState {
  return JSON.parse(readFileSync(path, 'utf-8')) as WorldState
}

async function waitForPersistedWorldState(
  path: string,
  predicate: (world: WorldState) => boolean,
  label: string,
  timeoutMs = 20_000,
): Promise<WorldState> {
  const startedAt = Date.now()
  let lastWorld: WorldState | null = null
  let lastError: unknown = null

  while (Date.now() - startedAt < timeoutMs) {
    try {
      lastWorld = readPersistedWorldState(path)
      if (predicate(lastWorld)) {
        return lastWorld
      }
    } catch (error) {
      lastError = error
    }
    await delay(500)
  }

  throw new Error(
    `persisted world did not satisfy ${label} within ${timeoutMs}ms; lastWorld=${JSON.stringify(lastWorld?.worldTasks ?? null)} lastError=${String(lastError)}`,
  )
}

function assertTaskRewardVocabulary(model: WorldTasksReadModel) {
  const rewardKinds = new Set<string>()
  const rewardLabels = new Set<string>()

  for (const reward of model.chapterRewardPreview) {
    rewardKinds.add(reward.kind)
    rewardLabels.add(reward.label)
    assert.ok(ALLOWED_TASK_REWARD_KINDS.has(reward.kind), `unexpected chapter reward kind: ${reward.kind}`)
    assert.ok(reward.amount > 0, `chapter reward preview amount should be positive for ${reward.kind}`)
  }

  for (const task of model.tasks) {
    for (const reward of task.rewardPreview) {
      rewardKinds.add(reward.kind)
      rewardLabels.add(reward.label)
      assert.ok(ALLOWED_TASK_REWARD_KINDS.has(reward.kind), `unexpected task reward kind: ${reward.kind}`)
      assert.ok(reward.amount > 0, `task reward preview amount should be positive for ${reward.kind}`)
    }
  }

  assert.ok(rewardKinds.has('copper'), 'task rewards should use copper for currency rewards')
  assert.ok(rewardKinds.has('food'), 'task rewards should include formal resources')
  for (const forbiddenKind of FORBIDDEN_TASK_REWARD_KINDS) {
    assert.ok(!rewardKinds.has(forbiddenKind), `task rewards must not expose ${forbiddenKind}`)
  }
  assert.ok(!rewardLabels.has('玉符'), 'task page rewards must not display jade')
  assert.ok(!rewardLabels.has('御符'), 'task page rewards must not display invented yufu')
  assert.ok(!rewardLabels.has('金铢'), 'task page rewards must not display invented jinzhu')
  assert.ok(!rewardLabels.has('金珠'), 'task page rewards must not display invented jinzhu variant')
}

function assertMinimalTaskRuntimeState(world: WorldState) {
  assert.ok(world.worldTasks, 'world should persist minimal task runtime state')
  const stateRecord = world.worldTasks as unknown as Record<string, unknown>
  assert.deepEqual(
    Object.keys(stateRecord).sort(),
    ['activeChapterId', 'achievedTaskIds', 'activeScenarioId', 'claimedTaskIds', 'scenarioVersion', 'seasonRunId'].sort(),
    'task runtime state should not copy the static task catalog',
  )
  for (const forbiddenField of [
    'scriptId',
    'scenarioId',
    'chapters',
    'activeChapterTitle',
    'chapterIndex',
    'chapterProgressText',
    'chapterRewardPreview',
    'currentTaskGroupId',
    'tasks',
    'taskId',
    'title',
    'objectiveText',
    'progressText',
    'rewardPreview',
    'assetSlot',
    'actionHint',
    'actionTarget',
    'claimState',
    'canClaim',
  ]) {
    assert.equal(stateRecord[forbiddenField], undefined, `task runtime state must not persist ${forbiddenField}`)
  }
}

function assertTaskWorldTileTargetsResolve(model: WorldTasksReadModel, world: WorldState) {
  const tileIds = new Set(world.map.tiles.map((tile) => tile.id))
  const worldTileTasks = model.tasks.filter((task) => task.actionTarget?.kind === 'world_tile')
  assert.ok(worldTileTasks.length > 0, 'task read model should expose world-tile action targets for map jumps')

  for (const task of worldTileTasks) {
    const targetId = task.actionTarget?.id
    assert.ok(targetId, `task ${task.taskId} should expose a concrete world_tile actionTarget id`)
    assert.notEqual(targetId, 'resource_nearby', `task ${task.taskId} must not expose resource_nearby fallback token`)
    assert.ok(tileIds.has(targetId), `task ${task.taskId} actionTarget id should resolve to a real world tile: ${targetId}`)
  }
}

function testDirectTaskReadModelVersionLock() {
  const catalog = listScenarioTaskCatalogs()[0]
  assert.ok(catalog, 'task catalog should exist')
  assert.equal(catalog.chapters.length, 15, '黄天当立 task catalog should define 15 chapters')
  catalog.chapters.forEach((chapter, index) => {
    assert.equal(chapter.chapterIndex, index + 1, `chapter ${index + 1} should have stable chapterIndex`)
    assert.ok(chapter.taskGroups.length > 0, `chapter ${index + 1} should define a task group`)
    assert.ok(chapter.rewardPreview.length > 0, `chapter ${index + 1} should define chapter reward preview`)
    if (index < catalog.chapters.length - 1) {
      assert.equal(chapter.nextChapterId, catalog.chapters[index + 1]?.chapterId)
    } else {
      assert.equal(chapter.nextChapterId, null)
    }
  })

  const world = createInitialWorldState()
  assertMinimalTaskRuntimeState(world)
  const runtimeStateBeforeReadModel = JSON.stringify(world.worldTasks)

  const model = buildWorldTasksReadModel(world, 'player')
  assert.equal(model.factionId, 'player')
  assert.equal(model.scenarioId, DEFAULT_WORLD_TASKS_SCENARIO_ID)
  assert.equal(model.activeChapterId, world.worldTasks?.activeChapterId)
  assert.equal(model.chapterIndex, 1)
  assert.equal(model.tasks[0]?.status, 'active')
  assert.equal(model.tasks[0]?.claimState, 'unavailable')
  assert.equal(model.tasks[0]?.canClaim, false)
  assert.equal(model.tasks[1]?.status, 'locked')
  assert.equal(model.tasks[1]?.canClaim, false)
  assertTaskRewardVocabulary(model)
  assert.equal(
    JSON.stringify(world.worldTasks),
    runtimeStateBeforeReadModel,
    'building the task read model must not copy catalog fields back into runtime state',
  )
  assertMinimalTaskRuntimeState(world)

  const legacyWorld = createInitialWorldState()
  legacyWorld.worldTasks = {
    activeScenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
    scenarioVersion: 'legacy_task_scenario_version_not_in_catalog',
    seasonRunId: 'season_run_tasks_legacy_contract',
    activeChapterId: world.worldTasks?.activeChapterId ?? 'huangtian_chapter_01',
    achievedTaskIds: [model.tasks[0]?.taskId ?? 'legacy_task'],
    claimedTaskIds: [],
  }
  const legacyRuntimeStateBeforeReadModel = JSON.stringify(legacyWorld.worldTasks)

  const legacyModel = buildWorldTasksReadModel(legacyWorld, 'player')
  assert.equal(legacyModel.scenarioId, DEFAULT_WORLD_TASKS_SCENARIO_ID)
  assert.equal(legacyModel.scenarioVersion, 'legacy_task_scenario_version_not_in_catalog')
  assert.equal(legacyModel.seasonRunId, 'season_run_tasks_legacy_contract')
  assert.equal(legacyModel.activeChapterTitle, '未知章节')
  assert.equal(legacyModel.chapterIndex, 0)
  assert.deepEqual(legacyModel.tasks, [])
  assert.match(legacyModel.chapterProgressText, /不会回退到新默认配置/)
  assert.equal(
    JSON.stringify(legacyWorld.worldTasks),
    legacyRuntimeStateBeforeReadModel,
    'legacy locked task seasons must not be repaired by copying the default catalog into runtime state',
  )
  assertMinimalTaskRuntimeState(legacyWorld)
}

function testCatalogFieldsStayOutOfTaskRuntimeState() {
  const world = createInitialWorldState()
  const initialRuntimeState = JSON.stringify(world.worldTasks)
  const model = buildWorldTasksReadModel(world, 'player')
  const firstTask = model.tasks[0]
  assert.ok(firstTask, 'default task read model should expose a task for UI consumption')
  assert.equal(typeof firstTask.assetSlot, 'string')
  assert.equal(typeof firstTask.canClaim, 'boolean')
  assert.ok(firstTask.rewardPreview.length > 0, 'task read model should expose reward preview for UI consumption')

  firstTask.title = 'mutated task read model title should not affect runtime'
  firstTask.rewardPreview.push({
    kind: 'food',
    label: 'mutated task read model reward should not affect runtime',
    amount: 1,
  })

  assert.equal(
    JSON.stringify(world.worldTasks),
    initialRuntimeState,
    'task read model mutations must not alter the season task runtime state',
  )
  assertMinimalTaskRuntimeState(world)
}

function seedWorldStateWithTaskProgress(): {
  path: string
  scriptScenarioVersion: string
  activeChapterId: string
  currentTaskGroupId: string
  firstTaskId: string
  secondTaskId: string
  thirdTaskId: string
} {
  const catalog = listScenarioTaskCatalogs()[0]
  assert.ok(catalog, 'task catalog should contain the 黄天当立 task script')
  const chapter = catalog.chapters[0]
  assert.ok(chapter, 'task catalog should contain chapter 1')
  const taskGroup = chapter.taskGroups.find((candidate) => candidate.taskGroupId === chapter.currentTaskGroupId)
  assert.ok(taskGroup, 'task catalog should contain the current task group')
  const [firstTask, secondTask, thirdTask] = taskGroup.tasks
  assert.ok(firstTask, 'task group should contain task 1')
  assert.ok(secondTask, 'task group should contain task 2')
  assert.ok(thirdTask, 'task group should contain task 3')

  const world = createInitialWorldState()
  world.worldTasks = {
    activeScenarioId: catalog.scenarioId,
    scenarioVersion: catalog.scenarioVersion,
    seasonRunId: 'season_run_tasks_contract_seed',
    activeChapterId: chapter.chapterId,
    achievedTaskIds: [],
    claimedTaskIds: [],
  }

  const path = buildSessionPersistPath('world_tasks_read_model_contract_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    scriptScenarioVersion: catalog.scenarioVersion,
    activeChapterId: chapter.chapterId,
    currentTaskGroupId: chapter.currentTaskGroupId,
    firstTaskId: firstTask.taskId,
    secondTaskId: secondTask.taskId,
    thirdTaskId: thirdTask.taskId,
  }
}

async function run() {
  testDirectTaskReadModelVersionLock()
  testCatalogFieldsStayOutOfTaskRuntimeState()

  const seeded = seedWorldStateWithTaskProgress()
  let port = await getAvailablePort()
  let baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  let child: ReturnType<typeof spawnBackend> | null = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seeded.path,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const response = await requestJson(baseUrl, '/api/world/tasks', 'GET', undefined, 60_000)
    assert.equal(response.status, 200, `world tasks route failed: ${JSON.stringify(response.data)}`)
    const model = readWorldTasksPayload(response.data)

    assert.equal(model.factionId, 'player')
    assert.equal(model.scenarioId, DEFAULT_WORLD_TASKS_SCENARIO_ID)
    assert.equal(model.scenarioVersion, seeded.scriptScenarioVersion)
    assert.equal(model.seasonRunId, 'season_run_tasks_contract_seed')
    assert.equal(model.activeChapterId, seeded.activeChapterId)
    assert.equal(model.currentTaskGroupId, seeded.currentTaskGroupId)
    assert.equal(model.tasks.find((task) => task.taskId === seeded.firstTaskId)?.status, 'active')
    assert.equal(model.tasks.find((task) => task.taskId === seeded.firstTaskId)?.claimState, 'unavailable')
    assert.equal(model.tasks.find((task) => task.taskId === seeded.firstTaskId)?.canClaim, false)
    assert.equal(model.tasks.find((task) => task.taskId === seeded.secondTaskId)?.status, 'locked')
    assertTaskRewardVocabulary(model)

    const worldResponse = await requestJson(baseUrl, '/api/world', 'GET', undefined, 60_000)
    assert.equal(worldResponse.status, 200, `world route failed: ${JSON.stringify(worldResponse.data)}`)
    const worldBeforeClaim = readWorldStatePayload(worldResponse.data)
    assertTaskWorldTileTargetsResolve(model, readPersistedWorldState(seeded.path))
    assertMinimalTaskRuntimeState(worldBeforeClaim)

    const badSeasonRun = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'achieveTaskPrototype',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'wrong_season_run_tasks_contract',
        taskId: seeded.firstTaskId,
      },
    })
    assert.equal(badSeasonRun.status, 200, `season-run mismatch route failed: ${JSON.stringify(badSeasonRun.data)}`)
    const badSeasonRunPayload = readObject(badSeasonRun.data)
    assert.equal(badSeasonRunPayload.ok, false)
    assert.equal(badSeasonRunPayload.failureCode, 'scenario_mismatch')

    const unknownTask = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'achieveTaskPrototype',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_tasks_contract_seed',
        taskId: 'missing_world_task_for_contract',
      },
    })
    assert.equal(unknownTask.status, 200, `unknown-task achieve route failed: ${JSON.stringify(unknownTask.data)}`)
    const unknownTaskPayload = readObject(unknownTask.data)
    assert.equal(unknownTaskPayload.ok, false)
    assert.equal(unknownTaskPayload.failureCode, 'unknown_task')

    const unachievedClaim = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'claimTaskReward',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_tasks_contract_seed',
        taskId: seeded.firstTaskId,
      },
    })
    assert.equal(unachievedClaim.status, 200, `unachieved claim route failed: ${JSON.stringify(unachievedClaim.data)}`)
    const unachievedClaimPayload = readObject(unachievedClaim.data)
    assert.equal(unachievedClaimPayload.ok, false)
    assert.equal(unachievedClaimPayload.failureCode, 'task_not_achieved')

    const achieveLockedTask = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'achieveTaskPrototype',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_tasks_contract_seed',
        taskId: seeded.secondTaskId,
      },
    })
    assert.equal(achieveLockedTask.status, 200, `locked-task achieve route failed: ${JSON.stringify(achieveLockedTask.data)}`)
    const achieveLockedTaskPayload = readObject(achieveLockedTask.data)
    assert.equal(achieveLockedTaskPayload.ok, false)
    assert.equal(achieveLockedTaskPayload.failureCode, 'task_not_active')

    const achieveFirstTask = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'achieveTaskPrototype',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_tasks_contract_seed',
        taskId: seeded.firstTaskId,
      },
    }, 60_000)
    assert.equal(achieveFirstTask.status, 200, `achieveTaskPrototype route failed: ${JSON.stringify(achieveFirstTask.data)}`)
    const achieveFirstTaskPayload = readObject(achieveFirstTask.data)
    assert.equal(achieveFirstTaskPayload.ok, true, `achieveTaskPrototype should succeed: ${JSON.stringify(achieveFirstTask.data)}`)
    assert.equal(achieveFirstTaskPayload.relatedId, seeded.firstTaskId)

    const worldAfterAchieve = readWorldStatePayload(achieveFirstTask.data)
    assert.ok(worldAfterAchieve.worldTasks?.achievedTaskIds.includes(seeded.firstTaskId))
    assert.ok(!worldAfterAchieve.worldTasks?.claimedTaskIds.includes(seeded.firstTaskId))
    assertMinimalTaskRuntimeState(worldAfterAchieve)

    const duplicateAchieve = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'achieveTaskPrototype',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_tasks_contract_seed',
        taskId: seeded.firstTaskId,
      },
    })
    assert.equal(duplicateAchieve.status, 200, `duplicate achieve route failed: ${JSON.stringify(duplicateAchieve.data)}`)
    const duplicateAchievePayload = readObject(duplicateAchieve.data)
    assert.equal(duplicateAchievePayload.ok, false)
    assert.equal(duplicateAchievePayload.failureCode, 'task_already_achieved')

    const achievedModelResponse = await requestJson(baseUrl, '/api/world/tasks', 'GET', undefined, 60_000)
    assert.equal(achievedModelResponse.status, 200)
    const achievedModel = readWorldTasksPayload(achievedModelResponse.data)
    assert.equal(achievedModel.tasks.find((task) => task.taskId === seeded.firstTaskId)?.status, 'achieved')
    assert.equal(achievedModel.tasks.find((task) => task.taskId === seeded.firstTaskId)?.claimState, 'claimable')
    assert.equal(achievedModel.tasks.find((task) => task.taskId === seeded.firstTaskId)?.canClaim, true)
    assert.equal(achievedModel.tasks.find((task) => task.taskId === seeded.secondTaskId)?.status, 'locked')
    assert.equal(achievedModel.tasks.find((task) => task.taskId === seeded.secondTaskId)?.canClaim, false)

    const factionBeforeClaim = worldBeforeClaim.factions.player
    assert.ok(factionBeforeClaim, 'player faction should exist before task claim')
    const claim = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'claimTaskReward',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_tasks_contract_seed',
        taskId: seeded.firstTaskId,
      },
    }, 60_000)
    assert.equal(claim.status, 200, `claimTaskReward route failed: ${JSON.stringify(claim.data)}`)
    const claimPayload = readObject(claim.data)
    assert.equal(claimPayload.ok, true, `claimTaskReward should succeed: ${JSON.stringify(claim.data)}`)
    assert.equal(claimPayload.relatedId, seeded.firstTaskId)
    const worldAfterClaim = readWorldStatePayload(claim.data)
    const factionAfterClaim = worldAfterClaim.factions.player
    assert.ok(factionAfterClaim, 'player faction should exist after task claim')
    assert.equal(factionAfterClaim.food, factionBeforeClaim.food + 600)
    assert.equal((factionAfterClaim.wood ?? 0), (factionBeforeClaim.wood ?? 0) + 300)
    assert.equal((factionAfterClaim.copper ?? 0), (factionBeforeClaim.copper ?? 0) + 300)
    assert.equal((factionAfterClaim.stone ?? 0), (factionBeforeClaim.stone ?? 0))
    assert.equal((factionAfterClaim.iron ?? 0), (factionBeforeClaim.iron ?? 0))
    assert.equal((factionAfterClaim.jade ?? 0), (factionBeforeClaim.jade ?? 0))
    assert.ok(worldAfterClaim.worldTasks?.claimedTaskIds.includes(seeded.firstTaskId))
    assertMinimalTaskRuntimeState(worldAfterClaim)

    const persistedAfterClaim = await waitForPersistedWorldState(
      seeded.path,
      (persistedWorld) => Boolean(persistedWorld.worldTasks?.claimedTaskIds.includes(seeded.firstTaskId)),
      'task claim persistence',
    )
    const persistedFactionAfterClaim = persistedAfterClaim.factions.player
    assert.ok(persistedFactionAfterClaim, 'player faction should exist in persisted task snapshot')
    assert.equal(persistedFactionAfterClaim.food, factionBeforeClaim.food + 600)
    assert.equal((persistedFactionAfterClaim.wood ?? 0), (factionBeforeClaim.wood ?? 0) + 300)
    assert.equal((persistedFactionAfterClaim.copper ?? 0), (factionBeforeClaim.copper ?? 0) + 300)
    assert.equal((persistedFactionAfterClaim.jade ?? 0), (factionBeforeClaim.jade ?? 0))
    assertMinimalTaskRuntimeState(persistedAfterClaim)

    const afterClaimModelResponse = await requestJson(baseUrl, '/api/world/tasks', 'GET', undefined, 60_000)
    assert.equal(afterClaimModelResponse.status, 200)
    const afterClaimModel = readWorldTasksPayload(afterClaimModelResponse.data)
    assert.equal(afterClaimModel.tasks.find((task) => task.taskId === seeded.firstTaskId)?.status, 'claimed')
    assert.equal(afterClaimModel.tasks.find((task) => task.taskId === seeded.firstTaskId)?.claimState, 'claimed')
    assert.equal(afterClaimModel.tasks.find((task) => task.taskId === seeded.firstTaskId)?.canClaim, false)
    assert.equal(afterClaimModel.tasks.find((task) => task.taskId === seeded.secondTaskId)?.status, 'active')
    assert.equal(afterClaimModel.tasks.find((task) => task.taskId === seeded.secondTaskId)?.canClaim, false)

    const duplicate = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'claimTaskReward',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_tasks_contract_seed',
        taskId: seeded.firstTaskId,
      },
    })
    assert.equal(duplicate.status, 200, `duplicate claim route failed: ${JSON.stringify(duplicate.data)}`)
    const duplicatePayload = readObject(duplicate.data)
    assert.equal(duplicatePayload.ok, false)
    assert.equal(duplicatePayload.failureCode, 'task_already_claimed')

    const worldAfterDuplicateResponse = await requestJson(baseUrl, '/api/world', 'GET', undefined, 60_000)
    assert.equal(worldAfterDuplicateResponse.status, 200)
    const worldAfterDuplicate = readWorldStatePayload(worldAfterDuplicateResponse.data)
    const factionAfterDuplicate = worldAfterDuplicate.factions.player
    assert.ok(factionAfterDuplicate, 'player faction should exist after duplicate task claim')
    assert.equal(factionAfterDuplicate.food, factionBeforeClaim.food + 600)
    assert.equal((factionAfterDuplicate.wood ?? 0), (factionBeforeClaim.wood ?? 0) + 300)
    assert.equal((factionAfterDuplicate.copper ?? 0), (factionBeforeClaim.copper ?? 0) + 300)
    assert.equal((factionAfterDuplicate.jade ?? 0), (factionBeforeClaim.jade ?? 0))

    const achieveSecondTask = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'achieveTaskPrototype',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_tasks_contract_seed',
        taskId: seeded.secondTaskId,
      },
    })
    assert.equal(achieveSecondTask.status, 200, `achieve task 2 route failed: ${JSON.stringify(achieveSecondTask.data)}`)
    assert.equal(readObject(achieveSecondTask.data).ok, true)

    const claimSecondTask = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'claimTaskReward',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_tasks_contract_seed',
        taskId: seeded.secondTaskId,
      },
    })
    assert.equal(claimSecondTask.status, 200, `claim task 2 route failed: ${JSON.stringify(claimSecondTask.data)}`)
    assert.equal(readObject(claimSecondTask.data).ok, true)

    const secondClaimModelResponse = await requestJson(baseUrl, '/api/world/tasks', 'GET', undefined, 60_000)
    assert.equal(secondClaimModelResponse.status, 200)
    const secondClaimModel = readWorldTasksPayload(secondClaimModelResponse.data)
    assert.equal(secondClaimModel.activeChapterId, seeded.activeChapterId)
    assert.equal(secondClaimModel.tasks.find((task) => task.taskId === seeded.secondTaskId)?.status, 'claimed')
    assert.equal(secondClaimModel.tasks.find((task) => task.taskId === seeded.thirdTaskId)?.status, 'active')

    const achieveThirdTask = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'achieveTaskPrototype',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_tasks_contract_seed',
        taskId: seeded.thirdTaskId,
      },
    })
    assert.equal(achieveThirdTask.status, 200, `achieve task 3 route failed: ${JSON.stringify(achieveThirdTask.data)}`)
    assert.equal(readObject(achieveThirdTask.data).ok, true)

    const claimThirdTask = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'claimTaskReward',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_tasks_contract_seed',
        taskId: seeded.thirdTaskId,
      },
    }, 60_000)
    assert.equal(claimThirdTask.status, 200, `claim task 3 route failed: ${JSON.stringify(claimThirdTask.data)}`)
    const claimThirdTaskPayload = readObject(claimThirdTask.data)
    assert.equal(claimThirdTaskPayload.ok, true)
    const worldAfterChapterAdvance = readWorldStatePayload(claimThirdTask.data)
    assert.equal(worldAfterChapterAdvance.worldTasks?.activeChapterId, 'huangtian_chapter_02')
    assert.ok(worldAfterChapterAdvance.worldTasks?.claimedTaskIds.includes(seeded.thirdTaskId))
    const factionAfterChapterAdvance = worldAfterChapterAdvance.factions.player
    assert.ok(factionAfterChapterAdvance, 'player faction should exist after task chapter advancement')
    assert.equal(factionAfterChapterAdvance.food, factionBeforeClaim.food + 2400)
    assert.equal((factionAfterChapterAdvance.wood ?? 0), (factionBeforeClaim.wood ?? 0) + 800)
    assert.equal((factionAfterChapterAdvance.stone ?? 0), (factionBeforeClaim.stone ?? 0) + 400)
    assert.equal((factionAfterChapterAdvance.iron ?? 0), (factionBeforeClaim.iron ?? 0) + 300)
    assert.equal((factionAfterChapterAdvance.copper ?? 0), (factionBeforeClaim.copper ?? 0) + 1000)
    assert.equal((factionAfterChapterAdvance.jade ?? 0), (factionBeforeClaim.jade ?? 0))
    assertMinimalTaskRuntimeState(worldAfterChapterAdvance)

    const advancedModelResponse = await requestJson(baseUrl, '/api/world/tasks', 'GET', undefined, 60_000)
    assert.equal(advancedModelResponse.status, 200)
    const advancedModel = readWorldTasksPayload(advancedModelResponse.data)
    assert.equal(advancedModel.activeChapterId, 'huangtian_chapter_02')
    assert.equal(advancedModel.chapterIndex, 2)
    assert.equal(advancedModel.tasks[0]?.status, 'active')

    await waitForPersistedWorldState(
      seeded.path,
      (persistedWorld) => persistedWorld.worldTasks?.activeChapterId === 'huangtian_chapter_02',
      'task chapter advancement persistence',
    )

    await shutdownChild(child)
    child = null
    tail.stdout.length = 0
    tail.stderr.length = 0
    port = await getAvailablePort()
    baseUrl = `http://127.0.0.1:${port}`
    child = spawnBackend(port, tail, {
      WORLD_STATE_PERSIST_PATH: seeded.path,
    })

    const reloadHealth = await waitForHealth(baseUrl)
    assert.ok(reloadHealth, `reloaded backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const reloadedWorldResponse = await requestJson(baseUrl, '/api/world', 'GET', undefined, 60_000)
    assert.equal(reloadedWorldResponse.status, 200, `reloaded world route failed: ${JSON.stringify(reloadedWorldResponse.data)}`)
    const reloadedWorld = readWorldStatePayload(reloadedWorldResponse.data)
    assert.ok(reloadedWorld.worldTasks?.achievedTaskIds.includes(seeded.firstTaskId))
    assert.ok(reloadedWorld.worldTasks?.claimedTaskIds.includes(seeded.firstTaskId))
    assert.ok(reloadedWorld.worldTasks?.claimedTaskIds.includes(seeded.secondTaskId))
    assert.ok(reloadedWorld.worldTasks?.claimedTaskIds.includes(seeded.thirdTaskId))
    assert.equal(reloadedWorld.worldTasks?.activeChapterId, 'huangtian_chapter_02')
    assertMinimalTaskRuntimeState(reloadedWorld)
    const reloadedFaction = reloadedWorld.factions.player
    assert.ok(reloadedFaction, 'player faction should exist after task reload')
    assert.equal(reloadedFaction.food, factionBeforeClaim.food + 2400)
    assert.equal((reloadedFaction.wood ?? 0), (factionBeforeClaim.wood ?? 0) + 800)
    assert.equal((reloadedFaction.stone ?? 0), (factionBeforeClaim.stone ?? 0) + 400)
    assert.equal((reloadedFaction.iron ?? 0), (factionBeforeClaim.iron ?? 0) + 300)
    assert.equal((reloadedFaction.copper ?? 0), (factionBeforeClaim.copper ?? 0) + 1000)
    assert.equal((reloadedFaction.jade ?? 0), (factionBeforeClaim.jade ?? 0))

    const reloadedModelResponse = await requestJson(baseUrl, '/api/world/tasks', 'GET', undefined, 60_000)
    assert.equal(reloadedModelResponse.status, 200)
    const reloadedModel = readWorldTasksPayload(reloadedModelResponse.data)
    assert.equal(reloadedModel.activeChapterId, 'huangtian_chapter_02')
    assert.equal(reloadedModel.chapterIndex, 2)
    assert.equal(reloadedModel.tasks[0]?.status, 'active')
    assert.equal(reloadedModel.tasks[0]?.claimState, 'unavailable')
    assert.equal(reloadedModel.tasks[0]?.canClaim, false)
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[world_tasks_read_model_http_contract] failed:', error)
  process.exitCode = 1
})
