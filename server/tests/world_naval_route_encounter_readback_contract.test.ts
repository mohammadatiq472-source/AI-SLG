import assert from 'node:assert/strict'
import {
  buildNavalWarshipAtHarborAction,
  openSeaRouteAction,
  readNavalRouteEncounterAction,
  resetWorldServiceForTests,
} from '../src/application/world/WorldService'
import { evaluateNavalRouteEncounterPolicy } from '../../shared/domain/navalRouteEncounterPolicy'

const FACTION_ID = 'player'
const ROUTE_ID = 'east_han_coastal_dock_to_wa_contact'
const HARBOR_ID = 'east_han_coastal_dock_quanzhou'
const OVERSEAS_CONTACT_ID = 'wa_contact_scoutable'

const FORBIDDEN_VISIBLE_COPY = [
  'snake_case',
  'contract id',
  'read model',
  'authority',
  'tier',
  'v0',
  'backend',
]

function assertCleanVisibleCopy(receipt: NonNullable<ReturnType<typeof readNavalRouteEncounterAction>['receipt']>) {
  assert.deepEqual(receipt.visibleCopyForbiddenHits, [])
  const joined = [
    receipt.recommendedActionLabel,
    receipt.resultLabel,
  ].join(' ')
  for (const forbidden of FORBIDDEN_VISIBLE_COPY) {
    assert.equal(joined.toLowerCase().includes(forbidden), false, `visible copy leaked ${forbidden}: ${joined}`)
  }
}

function setupFleet() {
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
    actorAiPlayerId: 'ai_player_naval_route_encounter_readback',
  }, true)
  assert.equal(built.ok, true, `shipyard build should succeed: ${JSON.stringify(built)}`)
  assert.ok(built.receipt?.inventoryFleetId, 'shipyard receipt should expose inventory fleet id')
  return String(built.receipt.inventoryFleetId)
}

const inventoryFleetId = setupFleet()

const quietPatrol = readNavalRouteEncounterAction({
  factionId: FACTION_ID,
  routeId: ROUTE_ID,
  harborId: HARBOR_ID,
  inventoryFleetId,
  missionType: 'patrol',
  routeRisk: 12,
  seaWeatherRisk: 8,
  enemyPresence: 'none',
  enemyStrength: 0,
  fleetStrength: 76,
  supplyReadiness: 94,
}, false)
assert.equal(quietPatrol.ok, true, `quiet patrol readback should succeed: ${JSON.stringify(quietPatrol)}`)
const quietReceipt = quietPatrol.receipt
assert.ok(quietReceipt, 'quiet patrol should return receipt')
assert.equal(quietReceipt.action, 'readNavalRouteEncounter')
assert.equal(quietReceipt.navalRouteEncounterPolicyVersion, 'naval_route_encounter_policy_v1')
assert.equal(quietReceipt.navalRouteEncounterScope, 'naval_route_encounter_service_readback_only_not_godot_ui')
assert.equal(quietReceipt.readbackUsesNavalRouteEncounterPolicy, true)
assert.equal(quietReceipt.routeId, ROUTE_ID)
assert.equal(quietReceipt.harborId, HARBOR_ID)
assert.equal(quietReceipt.fleetId, inventoryFleetId)
assert.equal(quietReceipt.missionType, 'patrol')
assert.equal(quietReceipt.encounterState, 'no_contact')
assert.equal(quietReceipt.missionAllowed, true)
assert.equal(quietReceipt.combatExpected, false)
assert.equal(quietReceipt.interceptAllowed, false)
assert.equal(quietReceipt.shouldReturnToHarbor, false)
assert.equal(quietReceipt.shouldAvoid, false)
assert.equal(quietReceipt.recommendedActionLabel, '巡逻')
assert.equal(quietReceipt.resultLabel, '海面平静')
assert.ok(Number(quietReceipt.successChance) >= 70)
assert.ok(quietReceipt.expectedDamageRange)
assert.equal(quietReceipt.expectedDamageRange.min >= 0, true)
assert.equal(quietReceipt.expectedDamageRange.max >= quietReceipt.expectedDamageRange.min, true)
assert.equal(quietReceipt.visibleCopyForbiddenHits?.length, 0)
assertCleanVisibleCopy(quietReceipt)

const interceptConvoy = readNavalRouteEncounterAction({
  factionId: FACTION_ID,
  routeId: ROUTE_ID,
  harborId: HARBOR_ID,
  inventoryFleetId,
  missionType: 'intercept',
  routeRisk: 24,
  seaWeatherRisk: 12,
  enemyPresence: 'convoy',
  enemyStrength: 62,
  fleetStrength: 88,
  supplyReadiness: 90,
  allySupport: 12,
}, false)
assert.equal(interceptConvoy.ok, true, `intercept readback should succeed: ${JSON.stringify(interceptConvoy)}`)
const interceptReceipt = interceptConvoy.receipt
assert.ok(interceptReceipt, 'intercept should return receipt')
assert.equal(interceptReceipt.missionType, 'intercept')
assert.equal(interceptReceipt.encounterState, 'intercept_ready')
assert.equal(interceptReceipt.interceptAllowed, true)
assert.equal(interceptReceipt.combatExpected, true)
assert.equal(interceptReceipt.recommendedActionLabel, '拦截')
assert.equal(interceptReceipt.resultLabel, '可拦截')
assert.equal(interceptReceipt.readbackUsesNavalRouteEncounterPolicy, true)
assertCleanVisibleCopy(interceptReceipt)

const highRiskLowReadiness = readNavalRouteEncounterAction({
  factionId: FACTION_ID,
  routeId: ROUTE_ID,
  harborId: HARBOR_ID,
  inventoryFleetId,
  missionType: 'patrol',
  routeRisk: 92,
  seaWeatherRisk: 84,
  enemyPresence: 'fleet',
  enemyStrength: 95,
  fleetStrength: 44,
  durabilityPercent: 28,
  supplyReadiness: 24,
  distanceFromHarbor: 78,
}, false)
assert.equal(highRiskLowReadiness.ok, true, `high risk readback should succeed: ${JSON.stringify(highRiskLowReadiness)}`)
const highRiskReceipt = highRiskLowReadiness.receipt
assert.ok(highRiskReceipt, 'high risk should return receipt')
assert.equal(highRiskReceipt.missionAllowed, false)
assert.ok(highRiskReceipt.shouldReturnToHarbor || highRiskReceipt.shouldAvoid)
assert.equal(highRiskReceipt.shouldReturnToHarbor, true)
assert.ok(Number(highRiskReceipt.successChance) < Number(quietReceipt.successChance))
assert.ok(highRiskReceipt.expectedDamageRange)
assert.ok(quietReceipt.expectedDamageRange)
assert.ok(highRiskReceipt.expectedDamageRange.max > quietReceipt.expectedDamageRange.max)
assert.equal(highRiskReceipt.recommendedActionLabel, '回港')
assert.equal(highRiskReceipt.resultLabel, '风险过高')
assertCleanVisibleCopy(highRiskReceipt)

const expectedFromDomain = evaluateNavalRouteEncounterPolicy({
  fleetId: String(interceptReceipt.fleetId),
  fleetRole: 'interceptor',
  fleetStatus: 'intercepting',
  missionType: 'intercept',
  deploymentReadiness: {
    missionAllowed: interceptReceipt.deploymentMissionAllowed,
    readinessScore: interceptReceipt.readinessScore,
    riskScore: interceptReceipt.deploymentRiskScore,
    shouldRepair: interceptReceipt.shouldRepair,
    shouldHold: interceptReceipt.shouldHold,
    shouldIntercept: interceptReceipt.deploymentShouldIntercept,
  },
  routeId: ROUTE_ID,
  routeRisk: 24,
  seaWeatherRisk: 12,
  enemyPresence: 'convoy',
  enemyStrength: 62,
  fleetStrength: 88,
  durabilityPercent: 100,
  supplyReadiness: 90,
  patrolIntensity: 20,
  allySupport: 12,
  distanceFromHarbor: 20,
})
assert.equal(interceptReceipt.encounterState, expectedFromDomain.encounterState)
assert.equal(interceptReceipt.successChance, expectedFromDomain.successChance)
assert.deepEqual(interceptReceipt.expectedDamageRange, expectedFromDomain.expectedDamageRange)
assert.equal(interceptReceipt.recommendedActionLabel, expectedFromDomain.recommendedActionLabel)
assert.equal(interceptReceipt.resultLabel, expectedFromDomain.resultLabel)

console.log('[world_naval_route_encounter_readback_contract] all checks passed')
