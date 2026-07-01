import assert from 'node:assert/strict'
import type { WorldState } from '../../shared/contracts/game'
import { parseWorldActionRequest } from '../../shared/schemas/worldAction'
import { mainCityFacilityTreeReadModelSchema } from '../../shared/schemas/mainCityFacilityTreeReadModel'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  promoteCityBuilding,
} from '../../shared/domain/rules'
import {
  getAvailablePort,
  readArray,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

const MAIN_CITY_ID = 'tile_08'
const UPGRADE_GROUP_ID = 'tax'
const UPGRADE_BUILDING_ID = 'tax_office'

function cloneInitialWorld() {
  return structuredClone(createInitialWorldState())
}

function fundFacilityTreeUpgrade(world: WorldState) {
  world.factions.player.wood = 50
  world.factions.player.stone = 50
  world.factions.player.iron = 50
  world.factions.player.copper = 100
}

function findPlayerMainCity(world: WorldState) {
  const cluster = world.map.overlays.cityClusters.find((item) => item.cityHallTileId === MAIN_CITY_ID)
  assert.ok(cluster, 'main city cluster should exist')
  return cluster
}

function testWorldActionSchemaAcceptsPromoteCityBuildingUiContract() {
  const parsed = parseWorldActionRequest({
    action: 'promoteCityBuilding',
    payload: {
      factionId: 'player',
      cityId: MAIN_CITY_ID,
      groupId: UPGRADE_GROUP_ID,
      buildingId: UPGRADE_BUILDING_ID,
    },
  })

  assert.equal(parsed.action, 'promoteCityBuilding')
}

function testPromoteCityBuildingSuccessReturnsReceiptFields() {
  const world = cloneInitialWorld()
  fundFacilityTreeUpgrade(world)
  const before = findPlayerMainCity(world)
  assert.equal(before.techLevels?.governance, 4)

  const result = promoteCityBuilding(world, MAIN_CITY_ID, UPGRADE_GROUP_ID, UPGRADE_BUILDING_ID, 'player')

  assert.equal(result.ok, true, result.message)
  if (!result.ok) return

  const after = findPlayerMainCity(result.world)
  assert.equal(after.techLevels?.governance, 5)
  assert.equal(result.cityId, MAIN_CITY_ID)
  assert.equal(result.groupId, UPGRADE_GROUP_ID)
  assert.equal(result.buildingId, UPGRADE_BUILDING_ID)
  assert.equal(result.previousLevel, 4)
  assert.equal(result.nextLevel, 5)
  assert.deepEqual(result.resourcesSpent, { actionPoints: 3, food: 11, wood: 5, copper: 10 })
  assert.equal(result.world.factions.player.wood, 45)
  assert.equal(result.world.factions.player.copper, 90)
}

function testPromoteCityBuildingRejectsInsufficientResources() {
  const world = cloneInitialWorld()
  fundFacilityTreeUpgrade(world)
  world.factions.player.actionPoints = 0

  const result = promoteCityBuilding(world, MAIN_CITY_ID, UPGRADE_GROUP_ID, UPGRADE_BUILDING_ID, 'player')

  assert.equal(result.ok, false)
  assert.equal(result.failureCode, 'insufficient_resources')
}

function testPromoteCityBuildingRejectsPrerequisiteNotMet() {
  const world = cloneInitialWorld()
  findPlayerMainCity(world).footprintTiles = 1 as never

  const result = promoteCityBuilding(world, MAIN_CITY_ID, 'military', 'recruit_policy_board', 'player')

  assert.equal(result.ok, false)
  assert.equal(result.failureCode, 'prerequisite_not_met')
}

function testPromoteCityBuildingRejectsMaxLevel() {
  const world = cloneInitialWorld()
  const cluster = findPlayerMainCity(world)
  cluster.techLevels = { ...(cluster.techLevels ?? { governance: 0, logistics: 0, defense: 0, recruitment: 0 }), governance: 5 }

  const result = promoteCityBuilding(world, MAIN_CITY_ID, UPGRADE_GROUP_ID, UPGRADE_BUILDING_ID, 'player')

  assert.equal(result.ok, false)
  assert.equal(result.failureCode, 'building_level_at_max')
  assert.equal(result.previousLevel, 5)
}

function testPromoteCityBuildingRejectsQueueOccupied() {
  const world = cloneInitialWorld()
  world.executions.player = {
    orders: [{ status: 'queued' }],
  } as never

  const result = promoteCityBuilding(world, MAIN_CITY_ID, UPGRADE_GROUP_ID, UPGRADE_BUILDING_ID, 'player')

  assert.equal(result.ok, false)
  assert.equal(result.failureCode, 'construction_queue_occupied')
}

async function testHttpPromoteCityBuildingReceiptAndReadModelRefresh() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail)

  try {
    const health = await waitForHealth(baseUrl, 90_000)
    assert.ok(health?.ok, `backend health check failed; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const upgrade = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'promoteCityBuilding',
      payload: {
        factionId: 'player',
        cityId: MAIN_CITY_ID,
        groupId: UPGRADE_GROUP_ID,
        buildingId: UPGRADE_BUILDING_ID,
      },
    }, 60_000)
    assert.equal(upgrade.status, 200, `promoteCityBuilding failed: ${JSON.stringify(upgrade.data)}`)
    const upgradePayload = readObject(upgrade.data)
    assert.equal(upgradePayload.ok, true)
    const receipt = readObject(upgradePayload.receipt)
    assert.equal(receipt.action, 'promoteCityBuilding')
    assert.equal(receipt.cityId, MAIN_CITY_ID)
    assert.equal(receipt.groupId, UPGRADE_GROUP_ID)
    assert.equal(receipt.buildingId, UPGRADE_BUILDING_ID)
    assert.equal(receipt.previousLevel, 4)
    assert.equal(receipt.nextLevel, 5)
    assert.deepEqual(readObject(receipt.resourcesSpent), { actionPoints: 3, food: 11, wood: 5, copper: 10 })
    assert.equal(readObject(receipt.readModelRefresh).endpoint, '/api/world/main-city/facility-tree')
    assert.equal(readObject(receipt.readModelRefresh).strategy, 'refetch_after_success')

    const refreshed = await requestJson(baseUrl, '/api/world/main-city/facility-tree', 'GET', undefined, 60_000)
    assert.equal(refreshed.status, 200, `facility tree refresh failed: ${JSON.stringify(refreshed.data)}`)
    const root = readObject(refreshed.data)
    const model = mainCityFacilityTreeReadModelSchema.parse(root.mainCityFacilityTree)
    const building = readArray(model.buildings)
      .map((item) => readObject(item))
      .find((item) => item.id === UPGRADE_BUILDING_ID)
    assert.ok(building, 'refreshed facility tree should include upgraded building')
    assert.equal(building.level, '5/5')
    assert.equal(building.status, '已同步升级')
    assert.equal(building.enabled, true)
  } finally {
    await shutdownChild(child)
  }
}

async function run() {
  testWorldActionSchemaAcceptsPromoteCityBuildingUiContract()
  testPromoteCityBuildingSuccessReturnsReceiptFields()
  testPromoteCityBuildingRejectsInsufficientResources()
  testPromoteCityBuildingRejectsPrerequisiteNotMet()
  testPromoteCityBuildingRejectsMaxLevel()
  testPromoteCityBuildingRejectsQueueOccupied()
  await testHttpPromoteCityBuildingReceiptAndReadModelRefresh()

  console.log('[main_city_facility_tree_upgrade_contract] all checks passed')
}

run().catch((error) => {
  console.error('[main_city_facility_tree_upgrade_contract] failed:', error)
  process.exitCode = 1
})
