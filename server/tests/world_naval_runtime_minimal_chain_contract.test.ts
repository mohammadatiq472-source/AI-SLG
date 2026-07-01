import assert from 'node:assert/strict'
import {
  createNavalFleetAction,
  openSeaRouteAction,
  resetWorldServiceForTests,
  sailNavalRouteAction,
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

  const createdFleet = createNavalFleetAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
    vesselType: 'transport_warship',
    carriedUnitIds: ['team_alpha', 'team_beta', 'team_gamma'],
  }, false)
  assert.equal(createdFleet.ok, true, `createNavalFleet should succeed: ${JSON.stringify(createdFleet)}`)
  assert.equal(createdFleet.receipt?.navalRuntimeAdapterStatus, 'naval_runtime_adapter_v0_1')
  assert.equal(createdFleet.receipt?.fleetRuntimeStatus, 'in_port')
  assert.equal(createdFleet.receipt?.fleetFrameSlotId, 'naval_transport_warship_v1')
  assert.equal(createdFleet.receipt?.fleetCarriedUnitCapacity, 3)
  assert.equal(createdFleet.receipt?.fleetMovementRuntimeStatus, 'dedicated_naval_runtime_not_land_unit_marker')
  assert.equal(createdFleet.receipt?.fleetDoesNotUseUnitMarker, true)
  assert.ok(createdFleet.receipt?.fleetId, 'createNavalFleet should return a fleetId')

  const sailed = sailNavalRouteAction({
    factionId: FACTION_ID,
    fleetId: String(createdFleet.receipt?.fleetId),
    routeId: ROUTE_ID,
  }, false)
  assert.equal(sailed.ok, true, `sailNavalRoute should succeed: ${JSON.stringify(sailed)}`)
  assert.equal(sailed.receipt?.fleetId, createdFleet.receipt?.fleetId)
  assert.equal(sailed.receipt?.fleetRuntimeStatus, 'sailing')
  assert.equal(sailed.receipt?.fleetFrameSlotId, 'naval_transport_warship_v1')
  assert.equal(sailed.receipt?.fleetRouteLineStatus, 'route_line_visible')
  assert.equal(sailed.receipt?.fleetDoesNotUseUnitMarker, true)
  assert.equal(sailed.receipt?.fleetMovementRuntimeStatus, 'dedicated_naval_runtime_not_land_unit_marker')

  const scouted = seaPatrolScoutAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
  }, false)
  assert.equal(scouted.ok, true, `seaPatrolScout should still succeed after naval runtime sail: ${JSON.stringify(scouted)}`)

  const intercepted = seaPatrolInterceptAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
    attackerVesselType: 'interceptor_warship',
    defenderVesselType: 'transport_warship',
  }, false)
  assert.equal(intercepted.ok, true, `seaPatrolIntercept should still write existing battle report: ${JSON.stringify(intercepted)}`)
  assert.equal(intercepted.receipt?.battleReportSurface, 'battle_report_panel/list/detail')
  assert.equal(intercepted.receipt?.navalBattleScope, 'patrol_intercept_minimal_battle_report_only')

  console.log('[world_naval_runtime_minimal_chain_contract] all checks passed')
}

run().catch((error) => {
  console.error('[world_naval_runtime_minimal_chain_contract] failed:', error)
  process.exitCode = 1
})
