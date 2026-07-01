import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import { createInitialWorldState } from '../../shared/domain/scenario'
import type { WorldState, WorldTasksReadModel, WorldTasksReadModelTask } from '../../shared/contracts/game/world'
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

function readWorldTasksPayload(value: unknown): WorldTasksReadModel {
  return readObject(readObject(value).worldTasks) as unknown as WorldTasksReadModel
}

function readWorldPayload(value: unknown): WorldState {
  return readObject(readObject(value).world) as unknown as WorldState
}

function findTask(model: WorldTasksReadModel, taskId: string): WorldTasksReadModelTask {
  const task = model.tasks.find((candidate) => candidate.taskId === taskId)
  assert.ok(task, `missing task ${taskId}`)
  return task
}

function seedChapterTwoWorld(): string {
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
  const path = buildSessionPersistPath('world_tasks_persistent_event_ledger_contract_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return path
}

async function bootBackend(worldPersistPath: string) {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: worldPersistPath,
  })
  const health = await waitForHealth(baseUrl)
  assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)
  return { baseUrl, tail, stop: () => shutdownChild(child) }
}

async function waitForLedger(baseUrl: string, eventId: string): Promise<WorldState> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await requestJson(baseUrl, '/api/world', 'GET', undefined, 60_000)
    assert.equal(response.status, 200, `world route failed: ${JSON.stringify(response.data)}`)
    const world = readWorldPayload(response.data)
    if (world.worldTaskEvents?.events.some((event) => event.eventId === eventId)) {
      return world
    }
    await delay(250)
  }
  throw new Error(`worldTaskEvents ledger did not persist event ${eventId}`)
}

async function run() {
  const worldPersistPath = seedChapterTwoWorld()
  const backend = await bootBackend(worldPersistPath)
  try {
    const beforeResponse = await requestJson(backend.baseUrl, '/api/world/tasks', 'GET', undefined, 60_000)
    assert.equal(beforeResponse.status, 200, `tasks route failed before ledger event: ${JSON.stringify(beforeResponse.data)}`)
    const beforeTask = findTask(readWorldTasksPayload(beforeResponse.data), 'huangtian_task_04_register_militia')
    assert.equal(beforeTask.settlementAuthority, 'prototype_only')
    assert.equal(beforeTask.status, 'active')

    const recordResponse = await requestJson(
      backend.baseUrl,
      '/api/world/action?includeWorld=true',
      'POST',
      {
        action: 'recordWorldTaskEvent',
        payload: {
          factionId: 'player',
          scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
          scenarioVersion: DEFAULT_WORLD_TASKS_SCENARIO_VERSION,
          seasonRunId: DEFAULT_WORLD_TASKS_SEASON_RUN_ID,
          taskId: 'huangtian_task_04_register_militia',
          kind: 'troop_formation_viewed',
          source: 'player_ui',
          sourceId: 'main_city_troop_formation_panel',
          summary: 'player opened the drill-ground formation panel',
        },
      },
      60_000,
    )
    assert.equal(recordResponse.status, 200, `recordWorldTaskEvent failed: ${JSON.stringify(recordResponse.data)}`)
    const recordPayload = readObject(recordResponse.data)
    assert.equal(recordPayload.ok, true)
    assert.equal(recordPayload.relatedId, 'huangtian_task_04_register_militia')
    const responseWorld = readWorldPayload(recordResponse.data)
    const event = responseWorld.worldTaskEvents?.events.find((candidate) => candidate.taskId === 'huangtian_task_04_register_militia')
    assert.ok(event, 'record action should append a worldTaskEvents ledger event')
    assert.equal(event.kind, 'troop_formation_viewed')
    assert.equal(event.authority, 'real_authority')
    assert.equal(event.source, 'player_ui')
    assert.equal(event.sourceId, 'main_city_troop_formation_panel')

    const persistedWorld = await waitForLedger(backend.baseUrl, event.eventId)
    assert.ok(
      persistedWorld.worldTaskEvents?.events.some((candidate) => candidate.eventId === event.eventId),
      'ledger event should survive a fresh world read',
    )

    const afterResponse = await requestJson(backend.baseUrl, '/api/world/tasks', 'GET', undefined, 60_000)
    assert.equal(afterResponse.status, 200, `tasks route failed after ledger event: ${JSON.stringify(afterResponse.data)}`)
    const afterTask = findTask(readWorldTasksPayload(afterResponse.data), 'huangtian_task_04_register_militia')
    assert.equal(afterTask.settlementAuthority, 'real_authority')
    assert.equal(afterTask.status, 'achieved')
    assert.equal(afterTask.claimState, 'claimable')
    assert.equal(afterTask.canClaim, true)
    assert.ok(
      afterTask.realAuthoritySignals.some(
        (signal) => signal.kind === 'troop_formation_viewed' && signal.satisfied && signal.id === event.eventId,
      ),
      'read model should bind the task signal to the persisted ledger event id',
    )

    const claimResponse = await requestJson(
      backend.baseUrl,
      '/api/world/action?includeWorld=true',
      'POST',
      {
        action: 'claimTaskReward',
        payload: {
          factionId: 'player',
          scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
          scenarioVersion: DEFAULT_WORLD_TASKS_SCENARIO_VERSION,
          seasonRunId: DEFAULT_WORLD_TASKS_SEASON_RUN_ID,
          taskId: 'huangtian_task_04_register_militia',
        },
      },
      60_000,
    )
    assert.equal(claimResponse.status, 200, `ledger-achieved claimTaskReward failed: ${JSON.stringify(claimResponse.data)}`)
    const claimPayload = readObject(claimResponse.data)
    assert.equal(claimPayload.ok, true, `ledger-achieved task should be claimable: ${JSON.stringify(claimResponse.data)}`)
    const claimedWorld = readWorldPayload(claimResponse.data)
    assert.ok(
      claimedWorld.worldTasks?.claimedTaskIds.includes('huangtian_task_04_register_militia'),
      'claiming a ledger-achieved task should persist claimedTaskIds',
    )

    const claimedResponse = await requestJson(backend.baseUrl, '/api/world/tasks', 'GET', undefined, 60_000)
    assert.equal(claimedResponse.status, 200, `tasks route failed after ledger claim: ${JSON.stringify(claimedResponse.data)}`)
    const claimedTask = findTask(readWorldTasksPayload(claimedResponse.data), 'huangtian_task_04_register_militia')
    assert.equal(claimedTask.status, 'claimed')
    assert.equal(claimedTask.claimState, 'claimed')
    assert.equal(claimedTask.canClaim, false)

    console.log('[world_tasks_persistent_event_ledger_contract] all checks passed')
  } finally {
    await backend.stop()
  }
}

run().catch((error) => {
  console.error('[world_tasks_persistent_event_ledger_contract] failed:', error)
  process.exitCode = 1
})
