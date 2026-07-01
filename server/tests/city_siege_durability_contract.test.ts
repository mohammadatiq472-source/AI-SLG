import assert from 'node:assert/strict'
import type { Unit } from '../../shared/contracts/game'
import {
  CITY_WALL_DURABILITY_MAX,
  PREFECTURE_CITY_DURABILITY_LEVEL,
  PLAYER_HOME_CITY_CENTER_DURABILITY_MAX,
  SYSTEM_CITY_DURABILITY_PER_LEVEL,
  increaseCityDurabilityMaxWithoutRepair,
  resolveCityDurabilityLevelOverride,
  resolveCityDurabilitySnapshot,
  resolveCitySiegeDurability,
} from '../../shared/domain/cityDurability'
import { advanceTick, queuePlanExecution } from '../../shared/domain/rules'
import { createInitialWorldState } from '../../shared/domain/scenario'

const FACTION_ID = 'player'

function getRequiredUnit() {
  const world = createInitialWorldState()
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, 'initial world should expose a player unit')
  return { world, unit }
}

function findCityHallTile(landmarkId: string) {
  const world = createInitialWorldState()
  const cluster = world.map.overlays.cityClusters.find((candidate) => candidate.id === landmarkId)
  assert.ok(cluster, `missing city cluster ${landmarkId}`)
  const tile = world.map.tiles.find((candidate) => candidate.id === cluster.cityHallTileId)
  assert.ok(tile, `missing city hall tile for ${landmarkId}`)
  return { world, cluster, tile }
}

function testDurabilityMaxPolicy() {
  const qingshi = findCityHallTile('qingshi')
  const qingshiSnapshot = resolveCityDurabilitySnapshot(qingshi.world, qingshi.tile)
  assert.ok(qingshiSnapshot, 'player home city should expose durability snapshot')
  assert.equal(qingshiSnapshot.role, 'center')
  assert.equal(qingshiSnapshot.durabilityMax, PLAYER_HOME_CITY_CENTER_DURABILITY_MAX)
  assert.equal(qingshiSnapshot.durability, PLAYER_HOME_CITY_CENTER_DURABILITY_MAX)

  const luoyang = findCityHallTile('luoyang')
  const luoyangSnapshot = resolveCityDurabilitySnapshot(luoyang.world, luoyang.tile)
  assert.ok(luoyangSnapshot, 'Luoyang city center should expose durability snapshot')
  assert.equal(luoyangSnapshot.role, 'center')
  assert.equal(luoyangSnapshot.cityLevel, 10, 'Luoyang should resolve to level 10 for durability')
  assert.equal(luoyangSnapshot.durabilityMax, 10 * SYSTEM_CITY_DURABILITY_PER_LEVEL)

  for (const landmarkId of ['yecheng', 'xuchang', 'hejian', 'chengdu', 'jianye']) {
    const city = findCityHallTile(landmarkId)
    const override = resolveCityDurabilityLevelOverride(city.tile)
    assert.ok(override, `${landmarkId} should be covered by the system city durability override catalog`)
    assert.equal(override.cityLevel, PREFECTURE_CITY_DURABILITY_LEVEL)
    const snapshot = resolveCityDurabilitySnapshot(city.world, city.tile)
    assert.ok(snapshot, `${landmarkId} should expose a durability snapshot`)
    assert.equal(snapshot.role, 'center')
    assert.equal(snapshot.cityLevel, PREFECTURE_CITY_DURABILITY_LEVEL)
    assert.equal(snapshot.durabilityMax, PREFECTURE_CITY_DURABILITY_LEVEL * SYSTEM_CITY_DURABILITY_PER_LEVEL)
  }

  const wallTileId = luoyang.cluster.tileIds.find((tileId) => tileId !== luoyang.cluster.cityHallTileId)
  assert.ok(wallTileId, 'Luoyang cluster should expose a wall tile')
  const wallTile = luoyang.world.map.tiles.find((candidate) => candidate.id === wallTileId)
  assert.ok(wallTile, 'Luoyang wall tile should exist')
  const wallSnapshot = resolveCityDurabilitySnapshot(luoyang.world, wallTile)
  assert.ok(wallSnapshot, 'city wall tile should expose durability snapshot')
  assert.equal(wallSnapshot.role, 'wall')
  assert.equal(wallSnapshot.durabilityMax, CITY_WALL_DURABILITY_MAX)

  const synthetic = createInitialWorldState()
  const tile = synthetic.map.tiles.find((candidate) => candidate.type === 'plain')
  assert.ok(tile, 'missing synthetic city tile base')
  tile.type = 'city'
  tile.cityLevel = 3
  tile.landmarkId = 'synthetic_lv3'
  tile.landmarkName = 'Synthetic Lv3 City'
  const smallCitySnapshot = resolveCityDurabilitySnapshot(synthetic, tile)
  assert.ok(smallCitySnapshot, 'synthetic level 3 city should expose durability snapshot')
  assert.equal(smallCitySnapshot.role, 'center')
  assert.equal(smallCitySnapshot.durabilityMax, 3 * SYSTEM_CITY_DURABILITY_PER_LEVEL)
}

function testUpgradeMaxIncreaseDoesNotRepair() {
  const { tile } = findCityHallTile('qingshi')
  tile.cityDurabilityRole = 'center'
  tile.cityDurabilityMax = PLAYER_HOME_CITY_CENTER_DURABILITY_MAX
  tile.cityDurability = 400

  increaseCityDurabilityMaxWithoutRepair(tile, 2_000)
  assert.equal(tile.cityDurabilityMax, 2_000)
  assert.equal(tile.cityDurability, 400, 'city upgrade should increase max durability without instant repair')
}

function testDefendersMustBeClearedBeforeDurabilityDamage() {
  const { world, unit } = getRequiredUnit()
  const luoyang = world.map.overlays.cityClusters.find((candidate) => candidate.id === 'luoyang')
  assert.ok(luoyang, 'missing Luoyang cluster')
  const cityHall = world.map.tiles.find((candidate) => candidate.id === luoyang.cityHallTileId)
  assert.ok(cityHall, 'missing Luoyang city hall')
  cityHall.owner = 'enemy'
  unit.tileId = cityHall.id

  const defender: Unit = structuredClone(unit)
  defender.id = 'city_durability_defender'
  defender.faction = 'enemy'
  defender.tileId = cityHall.id
  world.units.push(defender)

  const result = resolveCitySiegeDurability(world, {
    factionId: FACTION_ID,
    unitId: unit.id,
    tileId: cityHall.id,
    damage: 10_000,
  })
  assert.equal(result.ok, false)
  assert.equal(result.failureCode, 'hostile_defenders_present')
  assert.equal(cityHall.cityDurability, undefined, 'blocked siege should not initialize or damage durability')
}

function testCenterDurabilityBreachTransfersWholeCity() {
  const { world, unit } = getRequiredUnit()
  const luoyang = world.map.overlays.cityClusters.find((candidate) => candidate.id === 'luoyang')
  assert.ok(luoyang, 'missing Luoyang cluster')
  const cityHall = world.map.tiles.find((candidate) => candidate.id === luoyang.cityHallTileId)
  assert.ok(cityHall, 'missing Luoyang city hall')
  cityHall.owner = 'enemy'
  unit.tileId = cityHall.id
  world.units = world.units.filter((candidate) => candidate.id === unit.id || candidate.tileId !== cityHall.id)

  const firstHit = resolveCitySiegeDurability(world, {
    factionId: FACTION_ID,
    unitId: unit.id,
    tileId: cityHall.id,
    damage: 25_000,
  })
  assert.equal(firstHit.ok, true)
  assert.equal(firstHit.breached, false)
  assert.equal(firstHit.ownershipTransferred, false)
  assert.equal(firstHit.durabilityBefore, 100_000)
  assert.equal(firstHit.durabilityAfter, 75_000)
  assert.equal(cityHall.owner, 'enemy')

  const breach = resolveCitySiegeDurability(world, {
    factionId: FACTION_ID,
    unitId: unit.id,
    tileId: cityHall.id,
    damage: 75_000,
  })
  assert.equal(breach.ok, true)
  assert.equal(breach.breached, true)
  assert.equal(breach.ownershipTransferred, true)
  assert.equal(breach.durabilityAfter, 0)
  assert.equal(cityHall.owner, FACTION_ID)
  assert.equal(luoyang.owner, FACTION_ID)
  assert.equal(luoyang.tileIds.every((tileId) => world.map.tiles.find((tile) => tile.id === tileId)?.owner === FACTION_ID), true)
  assert.equal(world.factions[FACTION_ID].capturedCities?.includes(luoyang.cityHallTileId), true)
}

function runCaptureOrderAgainstCityCenter(durability: number) {
  const { world, unit } = getRequiredUnit()
  const cluster = world.map.overlays.cityClusters.find((candidate) => candidate.id === 'qingshi')
  assert.ok(cluster, 'missing qingshi city cluster')
  const cityHall = world.map.tiles.find((candidate) => candidate.id === cluster.cityHallTileId)
  assert.ok(cityHall, 'missing qingshi city hall')
  cityHall.owner = 'enemy'
  cityHall.cityDurabilityRole = 'center'
  cityHall.cityDurabilityMax = PLAYER_HOME_CITY_CENTER_DURABILITY_MAX
  cityHall.cityDurability = durability
  cluster.owner = 'enemy'
  for (const tileId of cluster.tileIds) {
    const cityTile = world.map.tiles.find((candidate) => candidate.id === tileId)
    if (cityTile) {
      cityTile.owner = 'enemy'
    }
  }
  unit.tileId = cityHall.id
  unit.strength = 2
  world.factions[FACTION_ID].actionPoints = 10
  world.factions[FACTION_ID].food = 10
  world.units = world.units.filter((candidate) => candidate.faction === FACTION_ID || candidate.tileId !== cityHall.id)

  const queued = queuePlanExecution(
    world,
    {
      intent: 'city siege durability capture contract',
      priority: 'high',
      orders: [{ unitId: unit.id, action: 'capture', target: cityHall.id }],
      constraints: [],
      reviewAfterTicks: 1,
    },
    'mock',
    FACTION_ID,
    'city siege durability capture contract',
    `city_siege_capture_${durability}`,
    world.worldVersion,
  )
  assert.ok(queued.ok, queued.message)
  const advanced = advanceTick(queued.world)
  const advancedCityHall = advanced.map.tiles.find((candidate) => candidate.id === cityHall.id)
  assert.ok(advancedCityHall, 'advanced city hall should exist')
  const advancedCluster = advanced.map.overlays.cityClusters.find((candidate) => candidate.id === cluster.id)
  assert.ok(advancedCluster, 'advanced city cluster should exist')
  return { advanced, cityHall: advancedCityHall, cluster: advancedCluster, unit }
}

function testCaptureActionUsesCitySiegeDurabilityResolver() {
  const firstHit = runCaptureOrderAgainstCityCenter(500)
  assert.equal(firstHit.cityHall.cityDurability, 300)
  assert.equal(firstHit.cityHall.owner, 'enemy', 'city center should not transfer before durability reaches zero')
  assert.equal(firstHit.cluster.owner, 'enemy', 'whole city should remain enemy-owned before center breach')
  assert.equal(firstHit.advanced.factions[FACTION_ID].capturedCities?.includes(firstHit.cityHall.id), false)

  const breach = runCaptureOrderAgainstCityCenter(150)
  assert.equal(breach.cityHall.cityDurability, 0)
  assert.equal(breach.cityHall.owner, FACTION_ID)
  assert.equal(breach.cluster.owner, FACTION_ID)
  assert.equal(
    breach.cluster.tileIds.every((tileId) =>
      breach.advanced.map.tiles.find((tile) => tile.id === tileId)?.owner === FACTION_ID,
    ),
    true,
    'center breach should transfer the whole city cluster',
  )
  assert.equal(breach.advanced.factions[FACTION_ID].capturedCities?.includes(breach.cityHall.id), true)
}

function run() {
  testDurabilityMaxPolicy()
  testUpgradeMaxIncreaseDoesNotRepair()
  testDefendersMustBeClearedBeforeDurabilityDamage()
  testCenterDurabilityBreachTransfersWholeCity()
  testCaptureActionUsesCitySiegeDurabilityResolver()

  console.log('[city_siege_durability_contract] all checks passed')
}

run()
