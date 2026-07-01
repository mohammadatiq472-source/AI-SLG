import assert from 'node:assert/strict'
import {
  buildNavalWarshipAtHarborAction,
  openSeaRouteAction,
  resetWorldServiceForTests,
  seaPatrolInterceptAction,
  seaPatrolScoutAction,
} from '../src/application/world/WorldService'

const FACTION_ID = 'player'
const ROUTE_ID = 'east_han_coastal_dock_to_wa_contact'
const SOURCE_DOCK_ID = 'east_han_coastal_dock_quanzhou'
const OVERSEAS_CONTACT_ID = 'wa_contact_scoutable'

async function run() {
  resetWorldServiceForTests()

  const opened = openSeaRouteAction({
    factionId: FACTION_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
  }, false)
  assert.equal(opened.ok, true, `openSeaRoute should succeed: ${JSON.stringify(opened)}`)

  const built = buildNavalWarshipAtHarborAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
    shipClass: 'interceptor_warship',
    actorAiPlayerId: 'ai_player_naval_inventory_reuse_smoke',
  }, true)
  assert.equal(built.ok, true, `shipyard build should succeed: ${JSON.stringify(built)}`)
  assert.ok(built.receipt?.shipyardOrderId, 'shipyard receipt should include source order id')
  assert.ok(built.receipt?.inventoryFleetId, 'shipyard receipt should include inventory fleet id')

  const inventoryFleetId = String(built.receipt?.inventoryFleetId)
  const sourceShipyardOrderId = String(built.receipt?.shipyardOrderId)

  const scouted = seaPatrolScoutAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
    actorAiPlayerId: 'ai_player_naval_inventory_reuse_smoke',
    inventoryFleetId,
  }, false)
  assert.equal(scouted.ok, true, `seaPatrolScout should reuse inventory fleet: ${JSON.stringify(scouted)}`)
  assert.equal(scouted.receipt?.reusedFleetId, inventoryFleetId)
  assert.equal(scouted.receipt?.sourceShipyardOrderId, sourceShipyardOrderId)
  assert.equal(scouted.receipt?.reuseStatus, 'patrol_reuse_ready')
  assert.equal(scouted.receipt?.worldNavalReuseUsesExistingSeaRuntime, true)
  assert.equal(scouted.receipt?.worldNavalReuseDoesNotUseUnitMarker, true)

  const intercepted = seaPatrolInterceptAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
    attackerVesselType: 'interceptor_warship',
    defenderVesselType: 'transport_warship',
    actorAiPlayerId: 'ai_player_naval_inventory_reuse_smoke',
    inventoryFleetId,
  }, true)
  assert.equal(intercepted.ok, true, `seaPatrolIntercept should reuse inventory fleet: ${JSON.stringify(intercepted)}`)
  assert.equal(intercepted.receipt?.reusedFleetId, inventoryFleetId)
  assert.equal(intercepted.receipt?.sourceShipyardOrderId, sourceShipyardOrderId)
  assert.equal(intercepted.receipt?.harborId, SOURCE_DOCK_ID)
  assert.equal(intercepted.receipt?.reuseStatus, 'route_patrol_intercept_reused')
  assert.equal(intercepted.receipt?.worldNavalReuseScope, 'shipyard_inventory_reuse_only_not_full_fleet_inventory_ui')
  assert.equal(intercepted.receipt?.worldNavalReuseUsesExistingSeaRuntime, true)
  assert.equal(intercepted.receipt?.worldNavalReuseDoesNotUseUnitMarker, true)

  const reusedFleet = intercepted.world?.navalRuntime?.fleets[inventoryFleetId]
  assert.equal(reusedFleet?.fleetId, inventoryFleetId)
  assert.equal(reusedFleet?.shipyardOrderId, sourceShipyardOrderId)
  assert.equal(reusedFleet?.status, 'intercepting')
  assert.equal(reusedFleet?.doesNotUseUnitMarker, true)

  console.log('[world_naval_inventory_fleet_patrol_reuse_contract] all checks passed')
}

run().catch((error) => {
  console.error('[world_naval_inventory_fleet_patrol_reuse_contract] failed:', error)
  process.exitCode = 1
})
