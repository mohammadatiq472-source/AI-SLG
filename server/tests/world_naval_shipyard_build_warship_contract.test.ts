import assert from 'node:assert/strict'
import {
  buildNavalWarshipAtHarborAction,
  openSeaRouteAction,
  resetWorldServiceForTests,
} from '../src/application/world/WorldService'

const FACTION_ID = 'player'
const ROUTE_ID = 'east_han_coastal_dock_to_wa_contact'
const SOURCE_DOCK_ID = 'east_han_coastal_dock_quanzhou'
const OVERSEAS_CONTACT_ID = 'wa_contact_scoutable'

async function run() {
  resetWorldServiceForTests()

  assert.equal(openSeaRouteAction({
    factionId: FACTION_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
  }, false).ok, true)

  const built = buildNavalWarshipAtHarborAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
    shipClass: 'interceptor_warship',
    actorAiPlayerId: 'ai_player_naval_shipyard_smoke',
  }, true)

  assert.equal(built.ok, true, `shipyard build should succeed: ${JSON.stringify(built)}`)
  assert.equal(built.receipt?.action, 'buildNavalWarshipAtHarbor')
  assert.equal(built.receipt?.harborId, SOURCE_DOCK_ID)
  assert.ok(built.receipt?.shipyardOrderId, 'receipt should include shipyardOrderId')
  assert.equal(built.receipt?.shipClass, 'interceptor_warship')
  assert.equal(built.receipt?.buildStatus, 'recorded')
  assert.ok(built.receipt?.inventoryFleetId, 'receipt should include inventoryFleetId')
  assert.equal(built.receipt?.fleetId, built.receipt?.inventoryFleetId)
  assert.equal(built.receipt?.addedShipCount, 1)
  assert.equal(built.receipt?.inventoryDelta, 1)
  assert.equal(built.receipt?.shipyardScope, 'minimal_shipyard_inventory_not_full_naval_economy')
  assert.equal(built.receipt?.fleetDoesNotUseUnitMarker, true)
  assert.equal(built.receipt?.fleetMovementRuntimeStatus, 'dedicated_naval_runtime_not_land_unit_marker')
  assert.equal(built.receipt?.battleReportSurface, 'battle_report_panel/list/detail')
  assert.ok(built.receipt?.shipyardReportId, 'receipt should include report id')

  const runtime = built.world?.navalRuntime
  const order = runtime?.shipyardOrders?.[String(built.receipt?.shipyardOrderId)]
  assert.equal(order?.harborId, SOURCE_DOCK_ID)
  assert.equal(order?.shipClass, 'interceptor_warship')
  assert.equal(order?.inventoryFleetId, built.receipt?.inventoryFleetId)
  assert.equal(order?.scope, 'minimal_shipyard_inventory_not_full_naval_economy')

  const harborInventory = runtime?.harborInventories?.[SOURCE_DOCK_ID]
  assert.equal(harborInventory?.totalShipCount, 1)
  assert.equal(harborInventory?.shipCountsByClass?.interceptor_warship, 1)
  assert.equal(harborInventory?.lastOrderId, built.receipt?.shipyardOrderId)

  const inventoryFleet = runtime?.fleets[String(built.receipt?.inventoryFleetId)]
  assert.equal(inventoryFleet?.status, 'in_port')
  assert.equal(inventoryFleet?.vesselType, 'interceptor_warship')
  assert.equal(inventoryFleet?.shipyardOrderId, built.receipt?.shipyardOrderId)
  assert.equal(inventoryFleet?.shipyardBuildStatus, 'recorded')
  assert.equal(inventoryFleet?.doesNotUseUnitMarker, true)
  assert.ok(built.world?.reports.some((report) => report.id === built.receipt?.shipyardReportId))

  console.log('[world_naval_shipyard_build_warship_contract] all checks passed')
}

run().catch((error) => {
  console.error('[world_naval_shipyard_build_warship_contract] failed:', error)
  process.exitCode = 1
})
