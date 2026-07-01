import assert from 'node:assert/strict'
import {
  createNavalFleetAction,
  openSeaRouteAction,
  repairNavalFleetDamageAction,
  resetWorldServiceForTests,
  resolveNavalCombatSettlementAction,
  sailNavalRouteAction,
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

  const attacker = createNavalFleetAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
    vesselType: 'interceptor_warship',
    carriedUnitIds: ['intercept_team'],
  }, false)
  assert.equal(attacker.ok, true)

  const defender = createNavalFleetAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
    vesselType: 'transport_warship',
    carriedUnitIds: ['team_alpha', 'team_beta', 'team_gamma'],
  }, false)
  assert.equal(defender.ok, true)

  assert.equal(sailNavalRouteAction({
    factionId: FACTION_ID,
    fleetId: String(defender.receipt?.fleetId),
    routeId: ROUTE_ID,
  }, false).ok, true)

  const settled = resolveNavalCombatSettlementAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    attackerFleetId: String(attacker.receipt?.fleetId),
    defenderFleetId: String(defender.receipt?.fleetId),
  }, true)
  assert.equal(settled.ok, true, `settlement should succeed: ${JSON.stringify(settled)}`)
  const damagedFleetId = settled.receipt?.damagedFleetId
  assert.ok(damagedFleetId, 'settlement should identify a damaged fleet')
  assert.equal(damagedFleetId, defender.receipt?.fleetId)
  assert.equal(settled.receipt?.damagedFleetDamageState, 'light_damage')
  assert.equal(settled.receipt?.damagedFleetRepairStatus, 'needs_repair')
  assert.equal(settled.receipt?.damagePersistsAfterSettlement, true)

  const damagedFleet = settled.world?.navalRuntime?.fleets[String(damagedFleetId)]
  assert.equal(damagedFleet?.damageState, 'light_damage')
  assert.equal(damagedFleet?.repairStatus, 'needs_repair')
  assert.ok(damagedFleet?.damageSummary?.includes('轻损'))
  assert.equal(damagedFleet?.lossSummary, 'minimal_settlement_no_fleet_destroyed')

  const repaired = repairNavalFleetDamageAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    fleetId: String(damagedFleetId),
  }, true)
  assert.equal(repaired.ok, true, `repair feedback should succeed: ${JSON.stringify(repaired)}`)
  assert.equal(repaired.receipt?.action, 'repairNavalFleetDamage')
  assert.equal(repaired.receipt?.damagedFleetId, damagedFleetId)
  assert.equal(repaired.receipt?.damagedFleetDamageState, 'light_damage')
  assert.equal(repaired.receipt?.damagedFleetRepairStatus, 'returning_to_port')
  assert.equal(repaired.receipt?.repairActionStatus, 'returning_to_port')
  assert.equal(repaired.receipt?.repairScope, 'minimal_damage_status_not_full_fleet_inventory')
  assert.equal(repaired.receipt?.fleetDoesNotUseUnitMarker, true)
  assert.equal(repaired.receipt?.fleetMovementRuntimeStatus, 'dedicated_naval_runtime_not_land_unit_marker')
  assert.ok(repaired.receipt?.repairReportId)

  const repairedFleet = repaired.world?.navalRuntime?.fleets[String(damagedFleetId)]
  assert.equal(repairedFleet?.damageState, 'light_damage')
  assert.equal(repairedFleet?.repairStatus, 'returning_to_port')
  assert.ok(repaired.world?.reports.some((report) => report.id === repaired.receipt?.repairReportId))

  console.log('[world_naval_fleet_damage_repair_contract] all checks passed')
}

run().catch((error) => {
  console.error('[world_naval_fleet_damage_repair_contract] failed:', error)
  process.exitCode = 1
})
