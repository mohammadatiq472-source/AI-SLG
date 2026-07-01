import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  DEFAULT_WORLD_AFFAIRS_SCENARIO_ID,
  buildWorldAffairsReadModel,
  listScenarioScripts,
} from '../../shared/domain/worldAffairs'
import type { WorldAffairsReadModel, WorldState } from '../../shared/contracts/game/world'
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

const ALLOWED_REWARD_KINDS = new Set(['jade', 'copper', 'food', 'wood', 'stone', 'iron'])

function readWorldAffairsPayload(value: unknown): WorldAffairsReadModel {
  const root = readObject(value)
  return readObject(root.worldAffairs) as unknown as WorldAffairsReadModel
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
    `persisted world did not satisfy ${label} within ${timeoutMs}ms; lastWorld=${JSON.stringify(lastWorld?.worldAffairs ?? null)} lastError=${String(lastError)}`,
  )
}

function assertRewardPreviewKinds(model: WorldAffairsReadModel) {
  const rewardKinds = new Set<string>()
  for (const node of model.nodes) {
    for (const reward of node.rewardPreview) {
      rewardKinds.add(reward.kind)
      assert.ok(ALLOWED_REWARD_KINDS.has(reward.kind), `unexpected reward kind: ${reward.kind}`)
      assert.ok(reward.amount > 0, `reward preview amount should be positive for ${reward.kind}`)
    }
  }

  assert.ok(rewardKinds.has('jade'), 'world affairs may preview jade rewards')
  assert.ok(rewardKinds.has('copper'), 'world affairs should use copper, not invented currencies')
  assert.ok(rewardKinds.has('food'), 'task-style rewards should include formal resources')
  assert.ok(!rewardKinds.has('gold'), 'gold/jinzhu-style invented currencies must not appear')
}

function assertMinimalRuntimeState(world: WorldState) {
  assert.ok(world.worldAffairs, 'world should persist minimal world affairs runtime state')
  const stateRecord = world.worldAffairs as unknown as Record<string, unknown>
  assert.deepEqual(
    Object.keys(stateRecord).sort(),
    ['achievedNodeIds', 'activeScenarioId', 'claimedNodeIds', 'scenarioVersion', 'seasonRunId'].sort(),
    'runtime state should not copy the static scenario catalog',
  )
  for (const forbiddenField of [
    'scriptId',
    'scenarioId',
    'title',
    'subtitle',
    'nodes',
    'nodeId',
    'objectiveText',
    'progressText',
    'rewardPreview',
    'assetSlot',
    'achievedAt',
    'claimState',
    'canClaim',
  ]) {
    assert.equal(stateRecord[forbiddenField], undefined, `runtime state must not persist ${forbiddenField}`)
  }
}

function assertActiveWorldAffairsNodeTargetResolves(model: WorldAffairsReadModel, world: WorldState) {
  assert.ok(model.activeNodeId, 'world affairs read model should expose an active node')
  const activeNode = model.nodes.find((node) => node.nodeId === model.activeNodeId)
  assert.ok(activeNode, 'active world affairs node should be present in node list')
  const nodeRecord = activeNode as unknown as {
    targetTileId?: unknown
    actionTarget?: {
      kind?: unknown
      id?: unknown
    }
  }
  const targetTileId =
    typeof nodeRecord.targetTileId === 'string'
      ? nodeRecord.targetTileId
      : nodeRecord.actionTarget?.kind === 'world_tile' && typeof nodeRecord.actionTarget.id === 'string'
        ? nodeRecord.actionTarget.id
        : ''

  assert.ok(targetTileId, `active world affairs node ${activeNode.nodeId} should expose targetTileId or world_tile actionTarget`)
  assert.notEqual(targetTileId, 'resource_nearby', 'world affairs target must not expose resource_nearby fallback token')
  assert.ok(
    world.map.tiles.some((tile) => tile.id === targetTileId),
    `active world affairs target should resolve to a real world tile: ${targetTileId}`,
  )
}

function testDirectReadModelVersionLock() {
  const world = createInitialWorldState()
  assertMinimalRuntimeState(world)
  const runtimeStateBeforeReadModel = JSON.stringify(world.worldAffairs)

  const model = buildWorldAffairsReadModel(world)
  assert.equal(model.scriptId, 'yellow_turban_rising')
  assert.equal(model.scenarioId, DEFAULT_WORLD_AFFAIRS_SCENARIO_ID)
  assert.equal(model.activeNodeId, model.nodes[0]?.nodeId)
  assert.equal(model.nodes[0]?.status, 'active')
  assert.equal(model.nodes[0]?.canClaim, false)
  assert.equal(model.nodes[1]?.status, 'locked')
  assert.equal(model.nodes[1]?.canClaim, false)
  assertRewardPreviewKinds(model)
  assert.equal(
    JSON.stringify(world.worldAffairs),
    runtimeStateBeforeReadModel,
    'building the read model must not copy catalog fields back into runtime state',
  )
  assertMinimalRuntimeState(world)

  const legacyWorld = createInitialWorldState()
  legacyWorld.worldAffairs = {
    activeScenarioId: DEFAULT_WORLD_AFFAIRS_SCENARIO_ID,
    scenarioVersion: 'legacy_scenario_version_not_in_catalog',
    seasonRunId: 'season_run_legacy_contract',
    achievedNodeIds: [model.nodes[0]?.nodeId ?? 'legacy_node'],
    claimedNodeIds: [],
  }
  const legacyRuntimeStateBeforeReadModel = JSON.stringify(legacyWorld.worldAffairs)

  const legacyModel = buildWorldAffairsReadModel(legacyWorld)
  assert.equal(legacyModel.scriptId, 'unknown')
  assert.equal(legacyModel.scenarioId, DEFAULT_WORLD_AFFAIRS_SCENARIO_ID)
  assert.equal(legacyModel.scenarioVersion, 'legacy_scenario_version_not_in_catalog')
  assert.equal(legacyModel.seasonRunId, 'season_run_legacy_contract')
  assert.notEqual(legacyModel.title, model.title)
  assert.equal(legacyModel.activeNodeId, null)
  assert.deepEqual(legacyModel.nodes, [])
  assert.match(legacyModel.subtitle, /不会回退到新默认配置/)
  assert.equal(
    JSON.stringify(legacyWorld.worldAffairs),
    legacyRuntimeStateBeforeReadModel,
    'legacy locked seasons must not be repaired by copying the default catalog into runtime state',
  )
  assertMinimalRuntimeState(legacyWorld)
}

function testCatalogFieldsStayOutOfRuntimeState() {
  const world = createInitialWorldState()
  const initialRuntimeState = JSON.stringify(world.worldAffairs)
  const model = buildWorldAffairsReadModel(world)
  const firstNode = model.nodes[0]
  assert.ok(firstNode, 'default read model should expose a node for UI consumption')
  assert.equal(typeof firstNode.assetSlot, 'string')
  assert.ok(firstNode.rewardPreview.length > 0, 'read model should expose reward preview for UI consumption')
  assert.equal(typeof firstNode.canClaim, 'boolean')

  firstNode.title = 'mutated read model title should not affect runtime'
  firstNode.rewardPreview.push({
    kind: 'food',
    label: 'mutated read model reward should not affect runtime',
    amount: 1,
  })

  assert.equal(
    JSON.stringify(world.worldAffairs),
    initialRuntimeState,
    'read model node/catalog mutations must not alter the season runtime state',
  )
  assertMinimalRuntimeState(world)
}

function seedWorldStateWithProgress(): {
  path: string
  scriptScenarioVersion: string
  firstNodeId: string
  secondNodeId: string
} {
  const script = listScenarioScripts()[0]
  assert.ok(script, 'scenario catalog should contain the 黄天当立 script')
  const [firstNode, secondNode] = script.nodes
  assert.ok(firstNode, 'scenario script should contain node 1')
  assert.ok(secondNode, 'scenario script should contain node 2')

  const world = createInitialWorldState()
  world.worldAffairs = {
    activeScenarioId: script.scenarioId,
    scenarioVersion: script.scenarioVersion,
    seasonRunId: 'season_run_contract_seed',
    achievedNodeIds: [],
    claimedNodeIds: [],
  }

  const path = buildSessionPersistPath('world_affairs_read_model_contract_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    scriptScenarioVersion: script.scenarioVersion,
    firstNodeId: firstNode.nodeId,
    secondNodeId: secondNode.nodeId,
  }
}

async function run() {
  testDirectReadModelVersionLock()
  testCatalogFieldsStayOutOfRuntimeState()

  const seeded = seedWorldStateWithProgress()
  let port = await getAvailablePort()
  let baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  let child: ReturnType<typeof spawnBackend> | null = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seeded.path,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const response = await requestJson(baseUrl, '/api/world/world-affairs', 'GET', undefined, 60_000)
    assert.equal(response.status, 200, `world affairs route failed: ${JSON.stringify(response.data)}`)
    const model = readWorldAffairsPayload(response.data)

    assert.equal(model.scriptId, 'yellow_turban_rising')
    assert.equal(model.scenarioId, DEFAULT_WORLD_AFFAIRS_SCENARIO_ID)
    assert.equal(model.scenarioVersion, seeded.scriptScenarioVersion)
    assert.equal(model.seasonRunId, 'season_run_contract_seed')
    assert.equal(model.activeNodeId, seeded.firstNodeId)
    assert.equal(model.nodes.find((node) => node.nodeId === seeded.firstNodeId)?.status, 'active')
    assert.equal(model.nodes.find((node) => node.nodeId === seeded.firstNodeId)?.claimState, 'unavailable')
    assert.equal(model.nodes.find((node) => node.nodeId === seeded.firstNodeId)?.canClaim, false)
    assert.equal(model.nodes.find((node) => node.nodeId === seeded.secondNodeId)?.status, 'locked')
    assert.equal(model.nodes.find((node) => node.nodeId === seeded.secondNodeId)?.canClaim, false)
    assertRewardPreviewKinds(model)

    const worldResponse = await requestJson(baseUrl, '/api/world', 'GET', undefined, 60_000)
    assert.equal(worldResponse.status, 200, `world route failed: ${JSON.stringify(worldResponse.data)}`)
    const worldBeforeClaim = readWorldStatePayload(worldResponse.data)
    assertActiveWorldAffairsNodeTargetResolves(model, readPersistedWorldState(seeded.path))
    assertMinimalRuntimeState(worldBeforeClaim)

    const badSeasonRun = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'achieveWorldAffairsNode',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_AFFAIRS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'wrong_season_run_contract',
        nodeId: seeded.firstNodeId,
      },
    })
    assert.equal(badSeasonRun.status, 200, `season-run mismatch route failed: ${JSON.stringify(badSeasonRun.data)}`)
    const badSeasonRunPayload = readObject(badSeasonRun.data)
    assert.equal(badSeasonRunPayload.ok, false)
    assert.equal(badSeasonRunPayload.failureCode, 'scenario_mismatch')

    const unknownNode = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'achieveWorldAffairsNode',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_AFFAIRS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_contract_seed',
        nodeId: 'missing_world_affairs_node_for_contract',
      },
    })
    assert.equal(unknownNode.status, 200, `unknown-node achieve route failed: ${JSON.stringify(unknownNode.data)}`)
    const unknownNodePayload = readObject(unknownNode.data)
    assert.equal(unknownNodePayload.ok, false)
    assert.equal(unknownNodePayload.failureCode, 'unknown_scenario_node')

    const mismatch = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'claimWorldAffairsNodeReward',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_AFFAIRS_SCENARIO_ID,
        scenarioVersion: 'wrong_scenario_version_for_contract',
        seasonRunId: 'season_run_contract_seed',
        nodeId: seeded.firstNodeId,
      },
    })
    assert.equal(mismatch.status, 200, `scenario mismatch route failed: ${JSON.stringify(mismatch.data)}`)
    const mismatchPayload = readObject(mismatch.data)
    assert.equal(mismatchPayload.ok, false)
    assert.equal(mismatchPayload.failureCode, 'scenario_mismatch')

    const unachieved = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'claimWorldAffairsNodeReward',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_AFFAIRS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_contract_seed',
        nodeId: seeded.secondNodeId,
      },
    })
    assert.equal(unachieved.status, 200, `unachieved claim route failed: ${JSON.stringify(unachieved.data)}`)
    const unachievedPayload = readObject(unachieved.data)
    assert.equal(unachievedPayload.ok, false)
    assert.equal(unachievedPayload.failureCode, 'world_affairs_node_not_achieved')

    const achieveFutureLockedNode = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'achieveWorldAffairsNode',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_AFFAIRS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_contract_seed',
        nodeId: seeded.secondNodeId,
      },
    })
    assert.equal(achieveFutureLockedNode.status, 200, `locked-node achieve route failed: ${JSON.stringify(achieveFutureLockedNode.data)}`)
    const achieveFutureLockedNodePayload = readObject(achieveFutureLockedNode.data)
    assert.equal(achieveFutureLockedNodePayload.ok, false)
    assert.equal(achieveFutureLockedNodePayload.failureCode, 'world_affairs_node_not_active')

    const achieveFirstNode = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'achieveWorldAffairsNode',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_AFFAIRS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_contract_seed',
        nodeId: seeded.firstNodeId,
      },
    }, 60_000)
    assert.equal(achieveFirstNode.status, 200, `achieveWorldAffairsNode route failed: ${JSON.stringify(achieveFirstNode.data)}`)
    const achieveFirstNodePayload = readObject(achieveFirstNode.data)
    assert.equal(achieveFirstNodePayload.ok, true, `achieveWorldAffairsNode should succeed: ${JSON.stringify(achieveFirstNode.data)}`)
    assert.equal(achieveFirstNodePayload.relatedId, seeded.firstNodeId)

    const worldAfterAchieve = readWorldStatePayload(achieveFirstNode.data)
    assert.ok(worldAfterAchieve.worldAffairs?.achievedNodeIds.includes(seeded.firstNodeId))
    assert.ok(!worldAfterAchieve.worldAffairs?.claimedNodeIds.includes(seeded.firstNodeId))

    const duplicateAchieve = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'achieveWorldAffairsNode',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_AFFAIRS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_contract_seed',
        nodeId: seeded.firstNodeId,
      },
    })
    assert.equal(duplicateAchieve.status, 200, `duplicate achieve route failed: ${JSON.stringify(duplicateAchieve.data)}`)
    const duplicateAchievePayload = readObject(duplicateAchieve.data)
    assert.equal(duplicateAchievePayload.ok, false)
    assert.equal(duplicateAchievePayload.failureCode, 'world_affairs_node_already_achieved')

    const achievedModelResponse = await requestJson(baseUrl, '/api/world/world-affairs', 'GET', undefined, 60_000)
    assert.equal(achievedModelResponse.status, 200)
    const achievedModel = readWorldAffairsPayload(achievedModelResponse.data)
    assert.equal(achievedModel.activeNodeId, seeded.secondNodeId)
    assert.equal(achievedModel.nodes.find((node) => node.nodeId === seeded.firstNodeId)?.status, 'achieved')
    assert.equal(achievedModel.nodes.find((node) => node.nodeId === seeded.firstNodeId)?.claimState, 'claimable')
    assert.equal(achievedModel.nodes.find((node) => node.nodeId === seeded.firstNodeId)?.canClaim, true)
    assert.equal(achievedModel.nodes.find((node) => node.nodeId === seeded.secondNodeId)?.status, 'active')
    assert.equal(achievedModel.nodes.find((node) => node.nodeId === seeded.secondNodeId)?.canClaim, false)

    const factionBeforeClaim = worldBeforeClaim.factions.player
    assert.ok(factionBeforeClaim, 'player faction should exist before world affairs claim')
    const claim = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'claimWorldAffairsNodeReward',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_AFFAIRS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_contract_seed',
        nodeId: seeded.firstNodeId,
      },
    }, 60_000)
    assert.equal(claim.status, 200, `claimWorldAffairsNodeReward route failed: ${JSON.stringify(claim.data)}`)
    const claimPayload = readObject(claim.data)
    assert.equal(claimPayload.ok, true, `claimWorldAffairsNodeReward should succeed: ${JSON.stringify(claim.data)}`)
    assert.equal(claimPayload.relatedId, seeded.firstNodeId)
    const worldAfterClaim = readWorldStatePayload(claim.data)
    const factionAfterClaim = worldAfterClaim.factions.player
    assert.ok(factionAfterClaim, 'player faction should exist after world affairs claim')
    assert.equal(factionAfterClaim.food, factionBeforeClaim.food + 1200)
    assert.equal((factionAfterClaim.wood ?? 0), (factionBeforeClaim.wood ?? 0) + 400)
    assert.equal((factionAfterClaim.copper ?? 0), (factionBeforeClaim.copper ?? 0) + 600)
    assert.equal((factionAfterClaim.jade ?? 0), (factionBeforeClaim.jade ?? 0))
    assert.ok(worldAfterClaim.worldAffairs?.claimedNodeIds.includes(seeded.firstNodeId))
    assertMinimalRuntimeState(worldAfterClaim)

    const persistedAfterClaim = await waitForPersistedWorldState(
      seeded.path,
      (persistedWorld) => Boolean(persistedWorld.worldAffairs?.claimedNodeIds.includes(seeded.firstNodeId)),
      'world affairs claim persistence',
    )
    const persistedFactionAfterClaim = persistedAfterClaim.factions.player
    assert.ok(persistedFactionAfterClaim, 'player faction should exist in persisted world affairs snapshot')
    assert.equal(persistedFactionAfterClaim.food, factionBeforeClaim.food + 1200)
    assert.equal((persistedFactionAfterClaim.wood ?? 0), (factionBeforeClaim.wood ?? 0) + 400)
    assert.equal((persistedFactionAfterClaim.copper ?? 0), (factionBeforeClaim.copper ?? 0) + 600)
    assert.equal((persistedFactionAfterClaim.jade ?? 0), (factionBeforeClaim.jade ?? 0))
    assertMinimalRuntimeState(persistedAfterClaim)

    const afterClaimModelResponse = await requestJson(baseUrl, '/api/world/world-affairs', 'GET', undefined, 60_000)
    assert.equal(afterClaimModelResponse.status, 200)
    const afterClaimModel = readWorldAffairsPayload(afterClaimModelResponse.data)
    assert.equal(afterClaimModel.nodes.find((node) => node.nodeId === seeded.firstNodeId)?.status, 'claimed')
    assert.equal(afterClaimModel.nodes.find((node) => node.nodeId === seeded.firstNodeId)?.claimState, 'claimed')
    assert.equal(afterClaimModel.nodes.find((node) => node.nodeId === seeded.firstNodeId)?.canClaim, false)

    const duplicate = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'claimWorldAffairsNodeReward',
      payload: {
        factionId: 'player',
        scenarioId: DEFAULT_WORLD_AFFAIRS_SCENARIO_ID,
        scenarioVersion: seeded.scriptScenarioVersion,
        seasonRunId: 'season_run_contract_seed',
        nodeId: seeded.firstNodeId,
      },
    })
    assert.equal(duplicate.status, 200, `duplicate claim route failed: ${JSON.stringify(duplicate.data)}`)
    const duplicatePayload = readObject(duplicate.data)
    assert.equal(duplicatePayload.ok, false)
    assert.equal(duplicatePayload.failureCode, 'world_affairs_node_already_claimed')

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
    assert.ok(reloadedWorld.worldAffairs?.achievedNodeIds.includes(seeded.firstNodeId))
    assert.ok(reloadedWorld.worldAffairs?.claimedNodeIds.includes(seeded.firstNodeId))
    assertMinimalRuntimeState(reloadedWorld)
    const reloadedFaction = reloadedWorld.factions.player
    assert.ok(reloadedFaction, 'player faction should exist after world affairs reload')
    assert.equal(reloadedFaction.food, factionBeforeClaim.food + 1200)
    assert.equal((reloadedFaction.wood ?? 0), (factionBeforeClaim.wood ?? 0) + 400)
    assert.equal((reloadedFaction.copper ?? 0), (factionBeforeClaim.copper ?? 0) + 600)
    assert.equal((reloadedFaction.jade ?? 0), (factionBeforeClaim.jade ?? 0))

    const reloadedModelResponse = await requestJson(baseUrl, '/api/world/world-affairs', 'GET', undefined, 60_000)
    assert.equal(reloadedModelResponse.status, 200)
    const reloadedModel = readWorldAffairsPayload(reloadedModelResponse.data)
    assert.equal(reloadedModel.nodes.find((node) => node.nodeId === seeded.firstNodeId)?.status, 'claimed')
    assert.equal(reloadedModel.nodes.find((node) => node.nodeId === seeded.firstNodeId)?.claimState, 'claimed')
    assert.equal(reloadedModel.nodes.find((node) => node.nodeId === seeded.firstNodeId)?.canClaim, false)
    assert.equal(reloadedModel.nodes.find((node) => node.nodeId === seeded.secondNodeId)?.status, 'active')
    assert.equal(reloadedModel.nodes.find((node) => node.nodeId === seeded.secondNodeId)?.canClaim, false)
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[world_affairs_read_model_http_contract] failed:', error)
  process.exitCode = 1
})
