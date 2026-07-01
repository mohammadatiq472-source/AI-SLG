import assert from 'node:assert/strict'
import {
  buildNavalWarshipAtHarborAction,
  createNavalFleetAction,
  openSeaRouteAction,
  repairNavalFleetDamageAction,
  resetWorldServiceForTests,
  resolveNavalCombatSettlementAction,
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

  const built = buildNavalWarshipAtHarborAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
    shipClass: 'transport_warship',
    actorAiPlayerId: 'ai_player_naval_inventory_combat_repair_smoke',
  }, true)
  assert.equal(built.ok, true, `shipyard build should succeed: ${JSON.stringify(built)}`)
  const inventoryFleetId = String(built.receipt?.inventoryFleetId)
  const sourceShipyardOrderId = String(built.receipt?.shipyardOrderId)
  assert.ok(inventoryFleetId, 'shipyard build should return inventory fleet id')
  assert.ok(sourceShipyardOrderId, 'shipyard build should return source order id')

  const scouted = seaPatrolScoutAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
    actorAiPlayerId: 'ai_player_naval_inventory_combat_repair_smoke',
    inventoryFleetId,
  }, false)
  assert.equal(scouted.ok, true, `seaPatrolScout should reuse inventory fleet: ${JSON.stringify(scouted)}`)

  const intercepted = seaPatrolInterceptAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
    attackerVesselType: 'transport_warship',
    defenderVesselType: 'interceptor_warship',
    actorAiPlayerId: 'ai_player_naval_inventory_combat_repair_smoke',
    inventoryFleetId,
  }, false)
  assert.equal(intercepted.ok, true, `seaPatrolIntercept should reuse inventory fleet: ${JSON.stringify(intercepted)}`)
  assert.equal(intercepted.receipt?.reusedFleetId, inventoryFleetId)

  const defender = createNavalFleetAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    sourceDockId: SOURCE_DOCK_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
    vesselType: 'interceptor_warship',
    carriedUnitIds: ['team_delta'],
    actorAiPlayerId: 'ai_player_naval_inventory_combat_repair_smoke',
  }, false)
  assert.equal(defender.ok, true, `defender fleet should be created: ${JSON.stringify(defender)}`)
  const defenderFleetId = String(defender.receipt?.fleetId)

  const sailedDefender = sailNavalRouteAction({
    factionId: FACTION_ID,
    fleetId: defenderFleetId,
    routeId: ROUTE_ID,
    actorAiPlayerId: 'ai_player_naval_inventory_combat_repair_smoke',
  }, false)
  assert.equal(sailedDefender.ok, true, `defender fleet should sail: ${JSON.stringify(sailedDefender)}`)

  const combat = resolveNavalCombatSettlementAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    attackerFleetId: inventoryFleetId,
    defenderFleetId,
    actorAiPlayerId: 'ai_player_naval_inventory_combat_repair_smoke',
    inventoryFleetId,
  } as any, true)
  assert.equal(combat.ok, true, `combat should damage the reused inventory fleet: ${JSON.stringify(combat)}`)
  assert.equal(combat.receipt?.inventoryFleetId, inventoryFleetId)
  assert.equal(combat.receipt?.reusedFleetId, inventoryFleetId)
  assert.equal(combat.receipt?.sourceShipyardOrderId, sourceShipyardOrderId)
  assert.equal(combat.receipt?.damagedFleetId, inventoryFleetId)
  assert.equal(combat.receipt?.fleetDamageState, 'damaged')
  assert.equal(combat.receipt?.worldNavalCombatUsesInventoryFleet, true)
  assert.equal(combat.receipt?.worldNavalCombatUsesExistingSeaRuntime, true)
  assert.equal(combat.receipt?.worldNavalCombatDoesNotUseUnitMarker, true)
  assert.equal(combat.receipt?.worldNavalCombatDamageRepairScope, 'inventory_fleet_combat_damage_repair_only_not_full_fleet_ui')
  assert.ok(combat.receipt?.navalCombatSettlementId || combat.receipt?.battleReportId, 'combat should expose combat/report id')

  const repaired = repairNavalFleetDamageAction({
    factionId: FACTION_ID,
    fleetId: inventoryFleetId,
    routeId: ROUTE_ID,
    actorAiPlayerId: 'ai_player_naval_inventory_combat_repair_smoke',
  }, true)
  assert.equal(repaired.ok, true, `repair should queue return harbor repair: ${JSON.stringify(repaired)}`)
  assert.equal(repaired.receipt?.fleetId, inventoryFleetId)
  assert.equal(repaired.receipt?.returnHarborRepairId, repaired.receipt?.repairReportId)
  assert.ok(repaired.receipt?.returnHarborRepairId, 'repair should expose return harbor repair id')
  assert.equal(repaired.receipt?.repairStatus, 'recorded')
  assert.equal(repaired.receipt?.repairActionStatus, 'returning_to_port')

  const repairedFleet = repaired.world?.navalRuntime?.fleets[inventoryFleetId]
  assert.equal(repairedFleet?.fleetId, inventoryFleetId)
  assert.equal(repairedFleet?.shipyardOrderId, sourceShipyardOrderId)
  assert.equal(repairedFleet?.damageState, 'light_damage')
  assert.equal(repairedFleet?.repairStatus, 'returning_to_port')
  assert.equal(repairedFleet?.doesNotUseUnitMarker, true)

  console.log('[world_naval_inventory_fleet_combat_damage_repair_contract] all checks passed')
}

run().catch((error) => {
  console.error('[world_naval_inventory_fleet_combat_damage_repair_contract] failed:', error)
  process.exitCode = 1
})
