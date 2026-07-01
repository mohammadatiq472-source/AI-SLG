import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { ResourceKind, Unit, WorldActionReceipt, WorldState } from '../../shared/contracts/game'
import { createInitialWorldState } from '../../shared/domain/scenario'
import { RESOURCE_TILE_ECONOMY_MODEL_VERSION } from '../../shared/domain/resourceTileEconomy'
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
const TARGET_RESOURCE_KIND: Extract<ResourceKind, 'food'> = 'food'
const TARGET_RESOURCE_LEVEL = 3
const EXPECTED_REWARD = TARGET_RESOURCE_LEVEL * 2 * 100
const EXPECTED_FOOD_SPENT = 1
const EXPECTED_NET_FOOD_DELTA = EXPECTED_REWARD - EXPECTED_FOOD_SPENT
const EXPECTED_GUARD_SOLDIERS = TARGET_RESOURCE_LEVEL * 300
const EXPECTED_RECOMMENDED_POWER = TARGET_RESOURCE_LEVEL * 100
const EXPECTED_HERO_EXP = TARGET_RESOURCE_LEVEL * 20

function readWorldStatePayload(value: unknown): WorldState {
  const root = readObject(value)
  const world = readObject(root.world)
  return world as unknown as WorldState
}

function readWorldSummaryPayload(value: unknown): Record<string, unknown> {
  const root = readObject(value)
  const world = readObject(root.world)
  return world
}

function readPersistedWorldState(path: string): WorldState {
  assert.ok(existsSync(path), `persisted world state should exist at ${path}`)
  return JSON.parse(readFileSync(path, 'utf-8')) as WorldState
}

function cloneReadyUnit(base: Unit, id: string, tileId: string): Unit {
  const unit = structuredClone(base)
  unit.id = id
  unit.name = 'resource expedition persistence unit'
  unit.tileId = tileId
  unit.status = base.status
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
    name: 'Resource Expedition Hero',
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

function seedWorldStateWithResourceExpeditionTarget(): {
  path: string
  unitId: string
  tileId: string
  resourceKind: Extract<ResourceKind, 'food'>
  resourceLevel: number
  playerFoodBefore: number
} {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID}`)
  const baseUnit = world.units.find((unit) => unit.faction === FACTION_ID)
  assert.ok(baseUnit, `missing base unit for ${FACTION_ID}`)
  const targetTile = world.map.tiles.find((tile) => tile.type !== 'city' && tile.type !== 'fog')
  assert.ok(targetTile, 'missing occupiable tile for resource expedition persistence gate')

  targetTile.type = 'resource'
  targetTile.terrain = 'grassland'
  targetTile.owner = 'neutral'
  targetTile.resourceKind = TARGET_RESOURCE_KIND
  targetTile.resourceLevel = TARGET_RESOURCE_LEVEL
  targetTile.enemyPressure = 0
  targetTile.moveCost = 1

  const unitId = 'resource_expedition_persistence_unit'
  world.units = [
    ...world.units.filter((unit) => unit.faction !== FACTION_ID),
    cloneReadyUnit(baseUnit, unitId, targetTile.id),
  ]
  world.feedback.battleRecords = []
  world.reports = []
  world.executions[FACTION_ID] = null
  faction.actionPoints = 100
  faction.food = 1000
  faction.wood = 0
  faction.stone = 0
  faction.iron = 0

  const path = buildSessionPersistPath('world_resource_expedition_persistence_reload_gate_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    unitId,
    tileId: targetTile.id,
    resourceKind: TARGET_RESOURCE_KIND,
    resourceLevel: TARGET_RESOURCE_LEVEL,
    playerFoodBefore: faction.food,
  }
}

function resourceValueFromDelta(delta: unknown, resourceKind: ResourceKind): number {
  const record = delta as Record<string, unknown> | undefined
  return Number(record?.[resourceKind] ?? 0)
}

async function waitForPersistedWorldState(
  path: string,
  predicate: (world: WorldState) => boolean,
  label: string,
  timeoutMs = 35_000,
): Promise<WorldState> {
  const startedAt = Date.now()
  let lastWorld: WorldState | null = null
  while (Date.now() - startedAt < timeoutMs) {
    if (existsSync(path)) {
      lastWorld = readPersistedWorldState(path)
      if (predicate(lastWorld)) {
        return lastWorld
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`timed out waiting for persisted ${label}; lastWorld=${JSON.stringify(lastWorld)}`)
}

function assertResourceExpeditionFullWorldReadback(world: WorldState, seeded: ReturnType<typeof seedWorldStateWithResourceExpeditionTarget>) {
  const tile = world.map.tiles.find((candidate) => candidate.id === seeded.tileId)
  assert.ok(tile, 'resource expedition tile should exist after reload')
  assert.equal(tile.owner, FACTION_ID, 'resource expedition should persist tile owner transfer')
  assert.equal(tile.type, 'resource')
  assert.equal(tile.resourceKind, seeded.resourceKind)
  assert.equal(tile.resourceLevel, seeded.resourceLevel)

  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `faction ${FACTION_ID} should exist after reload`)
  assert.equal(
    faction.food,
    seeded.playerFoodBefore + EXPECTED_NET_FOOD_DELTA,
    'resource expedition net food delta should persist to faction resources',
  )

  const record = world.feedback.battleRecords.find((candidate) =>
    candidate.tileId === seeded.tileId &&
    candidate.attackerUnitId === seeded.unitId &&
    candidate.reportKind === 'resource_guard'
  ) as (typeof world.feedback.battleRecords[number] & {
    resourceRewardDelta?: Record<string, number>
    recommendedPower?: number
    guardSoldiers?: number
    captureReward?: WorldActionReceipt['captureReward']
    landFirstMvpGlobalProductContractOk?: boolean
    landFirstMvpProductForbiddenHits?: string[]
  }) | undefined
  assert.ok(record, 'resource expedition battle report should persist after backend restart')
  assert.equal(record.outcome, 'win')
  assert.equal(resourceValueFromDelta(record.resourceRewardDelta, seeded.resourceKind), EXPECTED_REWARD)
  assert.equal(record.recommendedPower, EXPECTED_RECOMMENDED_POWER)
  assert.equal(record.guardSoldiers, EXPECTED_GUARD_SOLDIERS)
  assert.equal(record.captureReward?.resourceKind, seeded.resourceKind)
  assert.deepEqual(record.captureReward?.amount, { min: EXPECTED_REWARD, max: EXPECTED_REWARD })
  assert.equal(record.captureReward?.heroExp, EXPECTED_HERO_EXP)
  assert.equal(record.landFirstMvpGlobalProductContractOk, true)
  assert.deepEqual(record.landFirstMvpProductForbiddenHits, [])
}

function assertResourceExpeditionSummaryReadback(
  world: Record<string, unknown>,
  seeded: ReturnType<typeof seedWorldStateWithResourceExpeditionTarget>,
) {
  const map = readObject(world.map)
  const tileStates = map.tileStates as Array<{ id?: string; owner?: string }>
  assert.ok(Array.isArray(tileStates), '/api/world summary should include map.tileStates')
  const tileState = tileStates.find((candidate) => candidate.id === seeded.tileId)
  assert.ok(tileState, 'resource expedition tile state should exist in /api/world summary after reload')
  assert.equal(tileState.owner, FACTION_ID, 'resource expedition owner transfer should be visible in /api/world summary')

  const factions = readObject(world.factions)
  const faction = readObject(factions[FACTION_ID])
  assert.ok(faction, `faction ${FACTION_ID} should exist in /api/world summary after reload`)
  assert.equal(
    faction.food,
    seeded.playerFoodBefore + EXPECTED_NET_FOOD_DELTA,
    'resource expedition net food delta should be visible in /api/world summary',
  )

  const feedback = readObject(world.feedback)
  const battleRecords = feedback.battleRecords as Array<Record<string, unknown>>
  assert.ok(Array.isArray(battleRecords), '/api/world summary should include feedback.battleRecords')
  const record = battleRecords.find((candidate) =>
    candidate.tileId === seeded.tileId &&
    candidate.attackerUnitId === seeded.unitId &&
    candidate.reportKind === 'resource_guard'
  )
  assert.ok(record, 'resource expedition battle report should be visible in /api/world summary after reload')
  assert.equal(record.outcome, 'win')
}

async function run() {
  const seeded = seedWorldStateWithResourceExpeditionTarget()
  let port = await getAvailablePort()
  let baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  let child: ReturnType<typeof spawnBackend> | null = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seeded.path,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const result = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'occupyTile',
      payload: {
        factionId: FACTION_ID,
        unitId: seeded.unitId,
        tileId: seeded.tileId,
      },
    }, 60_000)

    assert.equal(result.status, 200, `resource expedition occupy route failed: ${JSON.stringify(result.data)}`)
    const payload = readObject(result.data)
    assert.equal(payload.ok, true, `resource expedition occupy should succeed: ${JSON.stringify(payload)}`)
    assert.equal(payload.relatedId, seeded.tileId)
    assert.equal(payload.unitId, seeded.unitId)
    const receipt = readObject(payload.receipt) as WorldActionReceipt
    assert.equal(receipt.resourceEconomyModelVersion, RESOURCE_TILE_ECONOMY_MODEL_VERSION)
    assert.equal(receipt.resourceTileSettlementStatus, 'ready')
    assert.equal(receipt.tileLevel, seeded.resourceLevel)
    assert.equal(receipt.resourceKind, seeded.resourceKind)
    assert.equal(resourceValueFromDelta(receipt.resourceRewardDelta, seeded.resourceKind), EXPECTED_REWARD)
    assert.equal(resourceValueFromDelta(receipt.battleReportResourceRewardDelta, seeded.resourceKind), EXPECTED_REWARD)
    assert.equal(receipt.resourcesSpent?.food, EXPECTED_FOOD_SPENT)
    assert.equal(receipt.recommendedPower, EXPECTED_RECOMMENDED_POWER)
    assert.equal(receipt.captureReward?.heroExp, EXPECTED_HERO_EXP)
    assert.equal(receipt.landFirstMvpGlobalProductContractOk, true)
    assert.deepEqual(receipt.landFirstMvpProductForbiddenHits, [])

    const actionWorld = readWorldStatePayload(result.data)
    assertResourceExpeditionFullWorldReadback(actionWorld, seeded)

    await waitForPersistedWorldState(
      seeded.path,
      (world) => {
        const tile = world.map.tiles.find((candidate) => candidate.id === seeded.tileId)
        const faction = world.factions[FACTION_ID]
        const record = world.feedback.battleRecords.find((candidate) =>
          candidate.tileId === seeded.tileId &&
          candidate.attackerUnitId === seeded.unitId &&
          candidate.reportKind === 'resource_guard'
        )
        return tile?.owner === FACTION_ID && faction?.food === seeded.playerFoodBefore + EXPECTED_NET_FOOD_DELTA && Boolean(record)
      },
      'resource expedition owner/reward/battle report',
    )
    const persistedWorld = readPersistedWorldState(seeded.path)
    assertResourceExpeditionFullWorldReadback(persistedWorld, seeded)

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
    const reloadedWorldSummary = readWorldSummaryPayload(reloadedWorldResponse.data)
    assertResourceExpeditionSummaryReadback(reloadedWorldSummary, seeded)
    const reloadedPersistedWorld = readPersistedWorldState(seeded.path)
    assertResourceExpeditionFullWorldReadback(reloadedPersistedWorld, seeded)

    console.log('[world_resource_expedition_persistence_reload_gate_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[world_resource_expedition_persistence_reload_gate_contract] failed:', error)
  process.exitCode = 1
})
