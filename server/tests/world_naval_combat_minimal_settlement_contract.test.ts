import assert from 'node:assert/strict'
import {
  createNavalFleetAction,
  openSeaRouteAction,
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

  const opened = openSeaRouteAction({
    factionId: FACTION_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
  }, false)
  assert.equal(opened.ok, true, `openSeaRoute should succeed: ${JSON.stringify(opened)}`)

  const attacker = createNavalFleetAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
    vesselType: 'interceptor_warship',
    carriedUnitIds: ['intercept_team'],
  }, false)
  assert.equal(attacker.ok, true, `attacker fleet should be created: ${JSON.stringify(attacker)}`)
  assert.equal(attacker.receipt?.fleetFrameSlotId, 'naval_interceptor_warship_v1')

  const defender = createNavalFleetAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
    vesselType: 'transport_warship',
    carriedUnitIds: ['team_alpha', 'team_beta', 'team_gamma'],
  }, false)
  assert.equal(defender.ok, true, `defender fleet should be created: ${JSON.stringify(defender)}`)
  assert.equal(defender.receipt?.fleetFrameSlotId, 'naval_transport_warship_v1')

  const sailed = sailNavalRouteAction({
    factionId: FACTION_ID,
    fleetId: String(defender.receipt?.fleetId),
    routeId: ROUTE_ID,
  }, false)
  assert.equal(sailed.ok, true, `defender fleet should sail before settlement: ${JSON.stringify(sailed)}`)
  assert.equal(sailed.receipt?.fleetRuntimeStatus, 'sailing')

  const settled = resolveNavalCombatSettlementAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    attackerFleetId: String(attacker.receipt?.fleetId),
    defenderFleetId: String(defender.receipt?.fleetId),
  }, false)
  assert.equal(settled.ok, true, `naval combat settlement should succeed: ${JSON.stringify(settled)}`)
  assert.equal(settled.receipt?.action, 'resolveNavalCombatSettlement')
  assert.ok(settled.receipt?.navalCombatSettlementId, 'settlement should return a settlement id')
  assert.ok(settled.receipt?.battleReportId, 'settlement should write an existing battle report entry')
  assert.equal(settled.receipt?.attackerFleetId, attacker.receipt?.fleetId)
  assert.equal(settled.receipt?.defenderFleetId, defender.receipt?.fleetId)
  assert.equal(settled.receipt?.attackerVesselType, 'interceptor_warship')
  assert.equal(settled.receipt?.defenderVesselType, 'transport_warship')
  assert.equal(settled.receipt?.attackerFleetFrameSlotId, 'naval_interceptor_warship_v1')
  assert.equal(settled.receipt?.defenderFleetFrameSlotId, 'naval_transport_warship_v1')
  assert.equal(settled.receipt?.navalCombatOutcome, 'interceptor_warship_advantage')
  assert.equal(settled.receipt?.battleReportSurface, 'battle_report_panel/list/detail')
  assert.equal(settled.receipt?.maritimeReportResultChipId, 'maritime_report_result_chip_v1')
  assert.equal(settled.receipt?.navalBattleScope, 'fleet_combat_minimal_settlement_only')
  assert.equal(settled.receipt?.navalCombatUsesExistingBattleReport, true)
  assert.equal(settled.receipt?.navalCombatDoesNotUseUnitMarker, true)

  console.log('[world_naval_combat_minimal_settlement_contract] all checks passed')
}

run().catch((error) => {
  console.error('[world_naval_combat_minimal_settlement_contract] failed:', error)
  process.exitCode = 1
})
