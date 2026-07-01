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
    actorAiPlayerId: 'ai_player_naval_harbor_deployment_readiness_smoke',
  }, true)
  assert.equal(built.ok, true, `shipyard build should succeed: ${JSON.stringify(built)}`)
  assert.ok(built.receipt?.inventoryFleetId, 'shipyard receipt should include inventory fleet id')

  const openedHarbor = openNavalHarborInventoryAction({
    factionId: FACTION_ID,
    harborId: HARBOR_ID,
    inventoryFleetId: built.receipt.inventoryFleetId,
    actorAiPlayerId: 'ai_player_naval_harbor_deployment_readiness_smoke',
  }, true)
  assert.equal(openedHarbor.ok, true, `harbor inventory open should succeed: ${JSON.stringify(openedHarbor)}`)
  const receipt = openedHarbor.receipt
  assert.ok(receipt, 'harbor inventory open should return receipt')

  assert.equal(receipt.worldNavalHarborDeploymentReadinessOk, true)
  assert.equal(receipt.harborSurfaceVisible, true)
  assert.equal(receipt.fleetCardVisible, true)
  assert.ok(receipt.fleetId, 'receipt should expose fleetId')
  assert.ok(receipt.inventoryFleetId, 'receipt should expose inventoryFleetId')
  assert.ok(receipt.harborId, 'receipt should expose harborId')
  assert.equal(receipt.deploymentReadinessUsesSharedDomainPolicy, true)
  assert.equal(receipt.deploymentPolicyScope, 'naval_deployment_readiness_only_not_full_fleet_management')
  assert.equal(receipt.worldNavalHarborDeploymentReadinessScope, 'deployment_readiness_hud_only_not_full_fleet_management')
  assert.match(String(receipt.recommendedActionLabel), /^(出港|巡逻|拦截|整补|待命)$/)
  assert.equal(typeof receipt.missionAllowed, 'boolean')
  assert.equal(typeof receipt.readinessScore, 'number')
  assert.equal(typeof receipt.riskScore, 'number')
  assert.ok(receipt.durabilityLabel, 'receipt should expose durabilityLabel')
  assert.ok(receipt.riskLabel, 'receipt should expose riskLabel')
  assert.equal(typeof receipt.shouldRepair, 'boolean')
  assert.equal(typeof receipt.shouldPatrol, 'boolean')
  assert.equal(typeof receipt.shouldIntercept, 'boolean')
  assert.equal(typeof receipt.shouldHold, 'boolean')
  assert.equal(receipt.shouldRepair, false)
  assert.equal(receipt.shouldPatrol, true)
  assert.equal(receipt.harborHudActionButtonStateOk, true)
  assert.equal(receipt.feedbackVisible, true)
  assert.equal(receipt.landSurfaceNavalCopyLeak, false)
  assert.equal(receipt.playerVisibleEngineeringCopyLeak, false)
  assert.deepEqual(receipt.visibleCopyForbiddenHits, [])

  console.log('[world_naval_harbor_deployment_readiness_contract] all checks passed')
}

run().catch((error) => {
  console.error('[world_naval_harbor_deployment_readiness_contract] failed:', error)
  process.exitCode = 1
})
