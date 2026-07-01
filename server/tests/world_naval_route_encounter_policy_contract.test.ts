import assert from 'node:assert/strict'
import {
  evaluateNavalRouteEncounterPolicy,
  type NavalRouteEncounterMissionType,
  type NavalRouteEncounterPolicyInput,
  type NavalRouteEncounterPolicyOutput,
} from '../../shared/domain/navalRouteEncounterPolicy'

const FORBIDDEN_VISIBLE_COPY = [
  'snake_case',
  'contract id',
  'read model',
  'authority',
  'tier',
  'v0',
  'backend',
]

function baseInput(overrides: Partial<NavalRouteEncounterPolicyInput> = {}): NavalRouteEncounterPolicyInput {
  return {
    fleetId: 'fleet_route_encounter_contract',
    fleetRole: 'interceptor',
    fleetStatus: 'patrolling',
    missionType: 'patrol',
    deploymentReadiness: {
      missionAllowed: true,
      readinessScore: 88,
      riskScore: 16,
      shouldRepair: false,
      shouldHold: false,
      shouldIntercept: false,
    },
    routeId: 'route_encounter_contract',
    routeRisk: 12,
    seaWeatherRisk: 8,
    enemyPresence: 'none',
    enemyStrength: 0,
    fleetStrength: 76,
    durabilityPercent: 96,
    supplyReadiness: 94,
    patrolIntensity: 35,
    allySupport: 20,
    distanceFromHarbor: 18,
    ...overrides,
  }
}

function runScenario(
  missionType: NavalRouteEncounterMissionType,
  overrides: Partial<NavalRouteEncounterPolicyInput> = {},
) {
  return evaluateNavalRouteEncounterPolicy(baseInput({ missionType, ...overrides }))
}

function assertCleanVisibleCopy(result: NavalRouteEncounterPolicyOutput) {
  assert.deepEqual(result.visibleCopyForbiddenHits, [])
  const joined = [
    result.recommendedActionLabel,
    result.resultLabel,
  ].join(' ')
  for (const forbidden of FORBIDDEN_VISIBLE_COPY) {
    assert.equal(joined.toLowerCase().includes(forbidden), false, `visible copy leaked ${forbidden}: ${joined}`)
  }
}

function assertDamageRange(result: NavalRouteEncounterPolicyOutput) {
  assert.equal(typeof result.expectedDamageRange.min, 'number')
  assert.equal(typeof result.expectedDamageRange.max, 'number')
  assert.ok(result.expectedDamageRange.min >= 0)
  assert.ok(result.expectedDamageRange.max >= result.expectedDamageRange.min)
  assert.ok(result.expectedDamageRange.max <= 100)
}

const quietPatrol = runScenario('patrol')
assert.equal(quietPatrol.policyVersion, 'naval_route_encounter_policy_v1')
assert.equal(quietPatrol.scope, 'naval_route_encounter_policy_only_not_service_action')
assert.ok(['no_contact', 'sighted'].includes(quietPatrol.encounterState))
assert.equal(quietPatrol.missionAllowed, true)
assert.equal(quietPatrol.combatExpected, false)
assert.equal(quietPatrol.interceptAllowed, false)
assert.equal(quietPatrol.shouldReturnToHarbor, false)
assert.equal(quietPatrol.shouldAvoid, false)
assert.equal(quietPatrol.recommendedActionLabel, '巡逻')
assert.equal(quietPatrol.resultLabel, '海面平静')
assert.ok(quietPatrol.successChance >= 70)
assertDamageRange(quietPatrol)
assertCleanVisibleCopy(quietPatrol)

const interceptConvoy = runScenario('intercept', {
  fleetStatus: 'intercepting',
  deploymentReadiness: {
    missionAllowed: true,
    readinessScore: 86,
    riskScore: 28,
    shouldRepair: false,
    shouldHold: false,
    shouldIntercept: true,
  },
  routeRisk: 24,
  seaWeatherRisk: 12,
  enemyPresence: 'convoy',
  enemyStrength: 62,
  fleetStrength: 88,
  durabilityPercent: 92,
  supplyReadiness: 90,
  allySupport: 12,
})
assert.equal(interceptConvoy.missionAllowed, true)
assert.equal(interceptConvoy.interceptAllowed, true)
assert.equal(interceptConvoy.combatExpected, true)
assert.equal(interceptConvoy.encounterState, 'intercept_ready')
assert.equal(interceptConvoy.recommendedActionLabel, '拦截')
assert.equal(interceptConvoy.resultLabel, '可拦截')
assert.ok(interceptConvoy.successChance >= 55)
assertDamageRange(interceptConvoy)
assertCleanVisibleCopy(interceptConvoy)

const interceptWithoutEnemy = runScenario('intercept', {
  enemyPresence: 'none',
  enemyStrength: 0,
  fleetStrength: 88,
  deploymentReadiness: {
    missionAllowed: true,
    readinessScore: 88,
    riskScore: 18,
    shouldRepair: false,
    shouldHold: false,
    shouldIntercept: true,
  },
})
assert.equal(interceptWithoutEnemy.missionAllowed, false)
assert.equal(interceptWithoutEnemy.interceptAllowed, false)
assert.equal(interceptWithoutEnemy.combatExpected, false)
assert.equal(interceptWithoutEnemy.encounterState, 'no_contact')
assert.equal(interceptWithoutEnemy.recommendedActionLabel, '待命')
assert.notEqual(interceptWithoutEnemy.recommendedActionLabel, quietPatrol.recommendedActionLabel)
assertCleanVisibleCopy(interceptWithoutEnemy)

const highRiskLowReadiness = runScenario('patrol', {
  deploymentReadiness: {
    missionAllowed: false,
    readinessScore: 34,
    riskScore: 86,
    shouldRepair: true,
    shouldHold: true,
    shouldIntercept: false,
  },
  routeRisk: 92,
  seaWeatherRisk: 84,
  enemyPresence: 'fleet',
  enemyStrength: 95,
  fleetStrength: 44,
  durabilityPercent: 28,
  supplyReadiness: 24,
  distanceFromHarbor: 78,
})
assert.equal(highRiskLowReadiness.missionAllowed, false)
assert.ok(highRiskLowReadiness.shouldReturnToHarbor || highRiskLowReadiness.shouldAvoid)
assert.ok(highRiskLowReadiness.shouldReturnToHarbor)
assert.ok(highRiskLowReadiness.successChance < quietPatrol.successChance)
assert.ok(highRiskLowReadiness.expectedDamageRange.max > quietPatrol.expectedDamageRange.max)
assert.equal(highRiskLowReadiness.recommendedActionLabel, '回港')
assert.equal(highRiskLowReadiness.resultLabel, '风险过高')
assertDamageRange(highRiskLowReadiness)
assertCleanVisibleCopy(highRiskLowReadiness)

const lowRiskFleet = runScenario('patrol', {
  routeRisk: 8,
  seaWeatherRisk: 5,
  enemyPresence: 'scout',
  enemyStrength: 18,
})
const risingRiskFleet = runScenario('patrol', {
  routeRisk: 64,
  seaWeatherRisk: 58,
  enemyPresence: 'fleet',
  enemyStrength: 82,
})
assert.ok(risingRiskFleet.riskScore > lowRiskFleet.riskScore)
assert.ok(risingRiskFleet.expectedDamageRange.max > lowRiskFleet.expectedDamageRange.max)
assertCleanVisibleCopy(lowRiskFleet)
assertCleanVisibleCopy(risingRiskFleet)

console.log('[world_naval_route_encounter_policy_contract] all checks passed')
