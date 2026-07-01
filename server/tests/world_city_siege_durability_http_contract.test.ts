import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import type { WorldState } from '../../shared/contracts/game'
import { PLAYER_HOME_CITY_CENTER_DURABILITY_MAX } from '../../shared/domain/cityDurability'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readArray,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

const FACTION_ID = 'player'
const ENEMY_FACTION_ID = 'enemy'

function readWorldStatePayload(value: unknown): WorldState {
  const root = readObject(value)
  const world = readObject(root.world)
  return world as unknown as WorldState
}

function seedWorldStateWithCitySiegeTarget(): { path: string; unitId: string; cityHallTileId: string; clusterId: string } {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding city siege HTTP contract`)
  const attacker = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(attacker, `missing unit for faction ${FACTION_ID} while seeding city siege HTTP contract`)
  const cluster = world.map.overlays.cityClusters.find((candidate) => candidate.id === 'qingshi')
  assert.ok(cluster, 'missing qingshi city cluster while seeding city siege HTTP contract')
  const cityHall = world.map.tiles.find((tile) => tile.id === cluster.cityHallTileId)
  assert.ok(cityHall, 'missing qingshi city hall while seeding city siege HTTP contract')

  cluster.owner = ENEMY_FACTION_ID
  cluster.camp = 'autonomous'
  for (const tileId of cluster.tileIds) {
    const cityTile = world.map.tiles.find((tile) => tile.id === tileId)
    if (cityTile) {
      cityTile.owner = ENEMY_FACTION_ID
      cityTile.enemyPressure = 4
    }
  }

  cityHall.owner = ENEMY_FACTION_ID
  cityHall.cityDurabilityRole = 'center'
  cityHall.cityDurabilityMax = PLAYER_HOME_CITY_CENTER_DURABILITY_MAX
  cityHall.cityDurability = 300

  attacker.tileId = cityHall.id
  attacker.status = '待命'
  attacker.currentTask = undefined
  attacker.strength = 2
  attacker.supply = 9
  attacker.mobility = Math.max(attacker.mobility, 20)
  attacker.corps.readiness = 100

  faction.actionPoints = 20
  faction.food = 20
  faction.capturedCities = []
  world.units = world.units.filter((unit) => unit.id === attacker.id || unit.tileId !== cityHall.id)

  const path = buildSessionPersistPath('world_city_siege_durability_http_contract_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { path, unitId: attacker.id, cityHallTileId: cityHall.id, clusterId: cluster.id }
}

async function loadWorldState(baseUrl: string): Promise<WorldState> {
  const worldResult = await requestJson(baseUrl, '/api/world?intelMode=full', 'GET')
  assert.equal(worldResult.status, 200, `world route failed: ${JSON.stringify(worldResult.data)}`)
  return readWorldStatePayload(worldResult.data)
}

async function queueCityCapture(baseUrl: string, unitId: string, cityHallTileId: string, basedOnWorldVersion: number, requestId: string) {
  const queued = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
    action: 'queuePlanExecution',
    payload: {
      factionId: FACTION_ID,
      source: 'mock',
      strategicCommand: 'city siege durability HTTP contract',
      requestId,
      basedOnWorldVersion,
      plan: {
        intent: 'city siege durability HTTP contract',
        priority: 'high',
        orders: [{ unitId, action: 'capture', target: cityHallTileId }],
        constraints: [],
        reviewAfterTicks: 1,
      },
    },
  }, 60_000)

  assert.equal(queued.status, 200, `queuePlanExecution route failed: ${JSON.stringify(queued.data)}`)
  const payload = readObject(queued.data)
  assert.equal(payload.ok, true, `queuePlanExecution should accept city capture: ${JSON.stringify(payload)}`)
}

async function advanceWorld(baseUrl: string): Promise<WorldState> {
  const advanced = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
    action: 'advanceTick',
  }, 60_000)
  assert.equal(advanced.status, 200, `advanceTick route failed: ${JSON.stringify(advanced.data)}`)
  const payload = readObject(advanced.data)
  assert.equal(payload.ok, true, `advanceTick should execute queued city capture: ${JSON.stringify(payload)}`)
  return readWorldStatePayload(advanced.data)
}

async function run() {
  const seeded = seedWorldStateWithCitySiegeTarget()
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seeded.path,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const worldBefore = await loadWorldState(baseUrl)
    await queueCityCapture(baseUrl, seeded.unitId, seeded.cityHallTileId, worldBefore.worldVersion, 'city_siege_http_first_hit')
    const worldAfterFirstHit = await advanceWorld(baseUrl)
    const cityAfterFirstHit = worldAfterFirstHit.map.tiles.find((tile) => tile.id === seeded.cityHallTileId)
    assert.ok(cityAfterFirstHit, 'city hall should remain addressable after first HTTP capture tick')
    assert.equal(cityAfterFirstHit.cityDurability, 100)
    assert.equal(cityAfterFirstHit.owner, ENEMY_FACTION_ID, 'HTTP city capture should not transfer owner before center durability reaches zero')
    assert.equal(
      worldAfterFirstHit.map.overlays.cityClusters.find((cluster) => cluster.id === seeded.clusterId)?.owner,
      ENEMY_FACTION_ID,
      'HTTP city capture should not transfer whole city before center breach',
    )
    assert.equal(worldAfterFirstHit.factions[FACTION_ID]?.capturedCities?.includes(seeded.cityHallTileId), false)

    await queueCityCapture(
      baseUrl,
      seeded.unitId,
      seeded.cityHallTileId,
      worldAfterFirstHit.worldVersion,
      'city_siege_http_breach',
    )
    const worldAfterBreach = await advanceWorld(baseUrl)
    const cityAfterBreach = worldAfterBreach.map.tiles.find((tile) => tile.id === seeded.cityHallTileId)
    assert.ok(cityAfterBreach, 'city hall should remain addressable after HTTP center breach')
    assert.equal(cityAfterBreach.cityDurability, 0)
    assert.equal(cityAfterBreach.owner, FACTION_ID)

    const clusterAfterBreach = worldAfterBreach.map.overlays.cityClusters.find((cluster) => cluster.id === seeded.clusterId)
    assert.ok(clusterAfterBreach, 'city cluster should remain addressable after HTTP center breach')
    assert.equal(clusterAfterBreach.owner, FACTION_ID)
    assert.equal(
      clusterAfterBreach.tileIds.every((tileId) =>
        worldAfterBreach.map.tiles.find((tile) => tile.id === tileId)?.owner === FACTION_ID,
      ),
      true,
      'HTTP center breach should transfer the whole city cluster',
    )
    assert.equal(worldAfterBreach.factions[FACTION_ID]?.capturedCities?.includes(seeded.cityHallTileId), true)

    const events = await requestJson(baseUrl, '/api/events?limit=12', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const eventItems = readArray(readObject(events.data).items).map((item) => readObject(item))
    assert.ok(
      eventItems.some((item) => item.action === 'queue_plan_execution' && item.success === true),
      'HTTP city siege should append a successful queue_plan_execution event',
    )
    assert.ok(
      eventItems.some((item) => item.action === 'advance_tick' && item.success === true),
      'HTTP city siege should append a successful advance_tick event',
    )

    console.log('[world_city_siege_durability_http_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[world_city_siege_durability_http_contract] failed:', error)
  process.exitCode = 1
})
