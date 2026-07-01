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
  assert.equal(opened.ok, true)

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

  const sailed = sailNavalRouteAction({
    factionId: FACTION_ID,
    fleetId: String(defender.receipt?.fleetId),
    routeId: ROUTE_ID,
  }, false)
  assert.equal(sailed.ok, true)

  const settled = resolveNavalCombatSettlementAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    attackerFleetId: String(attacker.receipt?.fleetId),
    defenderFleetId: String(defender.receipt?.fleetId),
  }, true)
  assert.equal(settled.ok, true)
  assert.ok(settled.receipt?.battleReportId)
  assert.ok(settled.receipt?.navalCombatWinnerFleetId)
  assert.ok(settled.receipt?.navalCombatLoserFleetId)
  assert.ok(settled.receipt?.navalCombatDamageSummary)
  assert.ok(settled.receipt?.navalCombatLossSummary)
  assert.equal(settled.receipt?.battleReportSurface, 'battle_report_panel/list/detail')
  assert.equal(settled.receipt?.navalCombatUsesExistingBattleReport, true)

  const report = settled.world?.reports.find((item) => item.id === settled.receipt?.battleReportId)
  assert.ok(report, 'settlement should create an existing world report entry')
  assert.equal(report?.title, '海上遭遇战报')
  assert.ok(report?.detail.includes('reportKind=naval_combat_minimal_settlement'))
  assert.ok(report?.detail.includes(`navalCombatSettlementId=${settled.receipt?.navalCombatSettlementId}`))
  assert.ok(report?.detail.includes('damageSummary='))
  assert.ok(report?.detail.includes('lossSummary='))
  assert.ok(report?.detail.includes('battleReportSurface=battle_report_panel/list/detail'))
  assert.ok(report?.detail.includes('navalBattleScope=fleet_combat_minimal_settlement_only'))

  console.log('[world_naval_combat_battle_report_detail_contract] all checks passed')
}

run().catch((error) => {
  console.error('[world_naval_combat_battle_report_detail_contract] failed:', error)
  process.exitCode = 1
})
