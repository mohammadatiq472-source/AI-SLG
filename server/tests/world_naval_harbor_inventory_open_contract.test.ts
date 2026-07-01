import assert from 'node:assert/strict'
import {
  buildNavalWarshipAtHarborAction,
  openNavalHarborInventoryAction,
  openSeaRouteAction,
  resetWorldServiceForTests,
} from '../src/application/world/WorldService'

const FACTION_ID = 'player'
const ROUTE_ID = 'east_han_coastal_dock_to_wa_contact'
const HARBOR_ID = 'east_han_coastal_dock_quanzhou'
const OVERSEAS_CONTACT_ID = 'wa_contact_scoutable'

async function run() {
  resetWorldServiceForTests()

  const openedRoute = openSeaRouteAction({
    factionId: FACTION_ID,
    sourceDockId: HARBOR_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
  }, false)
  assert.equal(openedRoute.ok, true, `openSeaRoute should succeed: ${JSON.stringify(openedRoute)}`)

  const built = buildNavalWarshipAtHarborAction({
    factionId: FACTION_ID,
    routeId: ROUTE_ID,
    sourceDockId: HARBOR_ID,
    overseasContactId: OVERSEAS_CONTACT_ID,
    shipClass: 'interceptor_warship',
    actorAiPlayerId: 'ai_player_naval_harbor_inventory_smoke',
  }, true)
  assert.equal(built.ok, true, `shipyard build should succeed: ${JSON.stringify(built)}`)
  assert.ok(built.receipt?.shipyardOrderId, 'shipyard receipt should include source order id')
  assert.ok(built.receipt?.inventoryFleetId, 'shipyard receipt should include inventory fleet id')

  const openedHarbor = openNavalHarborInventoryAction({
    factionId: FACTION_ID,
    harborId: HARBOR_ID,
    inventoryFleetId: built.receipt.inventoryFleetId,
    actorAiPlayerId: 'ai_player_naval_harbor_inventory_smoke',
  }, true)

  assert.equal(openedHarbor.ok, true, `harbor inventory open should succeed: ${JSON.stringify(openedHarbor)}`)
  assert.equal(openedHarbor.receipt?.action, 'openNavalHarborInventory')
  assert.equal(openedHarbor.receipt?.harborId, HARBOR_ID)
  assert.equal(openedHarbor.receipt?.harborName, '泉州港')
  assert.equal(openedHarbor.receipt?.sourceShipyardOrderId, built.receipt?.shipyardOrderId)
  assert.equal(openedHarbor.receipt?.inventoryFleetId, built.receipt?.inventoryFleetId)
  assert.equal(openedHarbor.receipt?.fleetCardVisible, true)
  assert.equal(openedHarbor.receipt?.fleetStatusLabel, '可出港')
  assert.ok(openedHarbor.receipt?.durabilityLabel, 'harbor inventory should expose durabilityLabel')
  assert.equal(openedHarbor.receipt?.fleetDurability, 100)
  assert.equal(openedHarbor.receipt?.harborSurfaceVisible, true)
  assert.equal(openedHarbor.receipt?.harborCopyAllowedOnlyOnHarborSurface, true)
  assert.equal(openedHarbor.receipt?.landSurfaceNavalCopyLeak, false)
  assert.deepEqual(openedHarbor.receipt?.visibleCopyForbiddenHits, [])
  assert.equal(openedHarbor.receipt?.playerVisibleEngineeringCopyLeak, false)
  assert.equal(openedHarbor.receipt?.worldNavalHarborInventoryScope, 'harbor_inventory_open_only_not_full_fleet_management')

  console.log('[world_naval_harbor_inventory_open_contract] all checks passed')
}

run().catch((error) => {
  console.error('[world_naval_harbor_inventory_open_contract] failed:', error)
  process.exitCode = 1
})
