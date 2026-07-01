import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { createInitialWorldState } from '../../shared/domain/scenario'
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

type CurrentGoalAuthority = 'real_authority' | 'read_model_only' | 'prototype_only' | 'locked'
type CurrentGoalLayerId = 'firstHour' | 'growth' | 'alliance' | 'kingdom' | 'empire' | 'unification'
type CurrentGoalSourceKind =
  | 'worldTasks'
  | 'worldAffairs'
  | 'aiTrace'
  | 'battleReport'
  | 'alliance'
  | 'nation'
  | 'eastHanThirteenStates'
type CurrentGoalsReadModel = {
  contractId: string
  factionId: string
  layers: {
    layerId: CurrentGoalLayerId
    title: string
    goals: {
      goalId: string
      title: string
      description: string
      nextStep: string
      authority: CurrentGoalAuthority
      sourceRefs: {
        kind: CurrentGoalSourceKind
        id: string
      }[]
    }[]
  }[]
}

const EXPECTED_LAYERS: CurrentGoalLayerId[] = [
  'firstHour',
  'growth',
  'alliance',
  'kingdom',
  'empire',
  'unification',
]

const EXPECTED_AUTHORITIES = new Set<CurrentGoalAuthority>([
  'real_authority',
  'read_model_only',
  'prototype_only',
  'locked',
])

function readCurrentGoalsPayload(value: unknown): CurrentGoalsReadModel {
  const root = readObject(value)
  return readObject(root.currentGoals) as unknown as CurrentGoalsReadModel
}

function seedWorldStateWithCurrentGoalSources(): string {
  const world = createInitialWorldState()
  const player = world.factions.player
  assert.ok(player, 'seed world should expose player faction')

  world.reports = [
    {
      id: 'report_current_goals_contract_01',
      tick: world.tick,
      title: 'AI 前锋夺取虎牢外资源点',
      detail: '战报建议：补兵后继续压住关口外缘资源带。',
    },
  ]
  world.slgDomainState = {
    ...(world.slgDomainState ?? {}),
    aiStateByFaction: {
      ...(world.slgDomainState?.aiStateByFaction ?? {}),
      player: {
        agenda: {
          source: 'world_current_goals_contract',
          summary: 'AI 正在开荒虎牢外资源点，并准备下一次补兵。',
        },
        execution: {
          status: 'running',
          activeOrderCount: 1,
          queuedOrderCount: 0,
          runningOrderCount: 1,
          actionPointsRemaining: 80,
          foodRemaining: 1200,
          requestId: 'ai_trace_current_goals_contract',
          strategicCommand: '正在执行：占领虎牢外资源点。',
          updatedTick: world.tick,
          updatedWorldVersion: world.worldVersion,
        },
      },
    },
  }

  const path = buildSessionPersistPath('world_current_goals_guidance_contract_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return path
}

function assertLayerShape(model: CurrentGoalsReadModel) {
  assert.equal(model.contractId, 'current_goals_guidance_v1')
  assert.equal(model.factionId, 'player')
  assert.deepEqual(
    model.layers.map((layer) => layer.layerId),
    EXPECTED_LAYERS,
    'current goals must expose the formal SLG progression layers in order',
  )

  const seenGoalIds = new Set<string>()
  for (const layer of model.layers) {
    assert.ok(layer.title.trim().length > 0, `layer ${layer.layerId} should have player-facing title`)
    assert.ok(layer.goals.length > 0, `layer ${layer.layerId} should include at least one goal`)
    for (const goal of layer.goals) {
      assert.ok(goal.goalId.startsWith(`${layer.layerId}:`), `goal ${goal.goalId} should be namespaced by layer`)
      assert.ok(!seenGoalIds.has(goal.goalId), `goal id should be unique: ${goal.goalId}`)
      seenGoalIds.add(goal.goalId)
      assert.ok(goal.title.trim().length > 0, `goal ${goal.goalId} should have title`)
      assert.ok(goal.description.trim().length > 0, `goal ${goal.goalId} should have description`)
      assert.ok(EXPECTED_AUTHORITIES.has(goal.authority), `goal ${goal.goalId} has invalid authority ${goal.authority}`)
      assert.ok(goal.sourceRefs.length > 0, `goal ${goal.goalId} should cite source refs`)
      assert.ok(!/rpg|主线任务|剧情主线/i.test(`${goal.title} ${goal.description}`), `goal ${goal.goalId} must not be generic RPG mainline copy`)
    }
  }
}

function assertAuthorityCoverage(model: CurrentGoalsReadModel) {
  const goals = model.layers.flatMap((layer) => layer.goals)
  const authorities = new Set(goals.map((goal) => goal.authority))
  assert.ok(authorities.has('real_authority'), 'current goals should include real-authority objectives')
  assert.ok(authorities.has('read_model_only'), 'current goals should include read-model-only objectives')
  assert.ok(authorities.has('prototype_only'), 'current goals should preserve prototype-only task truth')
  assert.ok(authorities.has('locked'), 'current goals should mark future kingdom / empire / unification goals as locked when not authoritative')
}

function assertSourceCoverage(model: CurrentGoalsReadModel) {
  const sourceKinds = new Set(model.layers.flatMap((layer) => layer.goals.flatMap((goal) => goal.sourceRefs.map((ref) => ref.kind))))
  assert.ok(sourceKinds.has('worldTasks'), 'current goals should cite worldTasks')
  assert.ok(sourceKinds.has('worldAffairs'), 'current goals should cite worldAffairs')
  assert.ok(sourceKinds.has('aiTrace'), 'current goals should cite AI trace / execution state')
  assert.ok(sourceKinds.has('battleReport'), 'current goals should cite battle report suggestions')
  assert.ok(sourceKinds.has('alliance'), 'current goals should cite alliance state')
  assert.ok(sourceKinds.has('nation'), 'current goals should cite kingdom / empire state')
  assert.ok(sourceKinds.has('eastHanThirteenStates'), 'current goals should cite East Han thirteen-state unification objective')
}

function assertSlgGoalLanguage(model: CurrentGoalsReadModel) {
  const goalText = model.layers
    .flatMap((layer) => layer.goals)
    .map((goal) => `${goal.title} ${goal.description} ${goal.nextStep}`)
    .join('\n')

  for (const required of ['开荒', '发育', '战斗', '同盟', '王国', '帝国', '东汉十三州']) {
    assert.ok(goalText.includes(required), `current goals should include ${required} goal language`)
  }
}

function assertRuntimeStateNotPolluted(world: unknown) {
  const runtimeRecord = world as unknown as Record<string, unknown>
  assert.equal(runtimeRecord.currentGoals, undefined, 'current goals must be read-model-only and not persist into world state')
}

async function run() {
  const path = seedWorldStateWithCurrentGoalSources()
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: path,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const response = await requestJson(baseUrl, '/api/world?currentGoals=true&factionId=player', 'GET', undefined, 60_000)
    assert.equal(response.status, 200, `current goals route failed: ${JSON.stringify(response.data)}`)
    const model = readCurrentGoalsPayload(response.data)
    assertLayerShape(model)
    assertAuthorityCoverage(model)
    assertSourceCoverage(model)
    assertSlgGoalLanguage(model)

    const worldResponse = await requestJson(baseUrl, '/api/world', 'GET', undefined, 60_000)
    assert.equal(worldResponse.status, 200, `world route failed: ${JSON.stringify(worldResponse.data)}`)
    const world = readObject(worldResponse.data).world
    assertRuntimeStateNotPolluted(world)

    console.log('[world_current_goals_guidance_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[world_current_goals_guidance_contract] failed:', error)
  process.exit(1)
})
