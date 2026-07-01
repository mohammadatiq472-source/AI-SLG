import assert from 'node:assert/strict'
import {
  evaluateNavalFleetDeploymentReadiness,
  type NavalFleetDeploymentMissionType,
  type NavalFleetDeploymentPolicyInput,
} from '../../shared/domain/navalFleetDeploymentPolicy'

const FORBIDDEN_VISIBLE_COPY = [
  'snake_case',
  'contract id',
  'read model',
  'authority',
  'tier',
  'v0',
  'neutral',
  'backend',
]

function baseInput(overrides: Partial<NavalFleetDeploymentPolicyInput> = {}): NavalFleetDeploymentPolicyInput {
  return {
    fleetStatus: 'in_harbor',
    durabilityCurrent: 100,
    durabilityMax: 100,
    supplyReadiness: 96,
    crewReadiness: 94,
    routeRisk: 12,
    enemyPresence: 0,
    seaWeatherRisk: 8,
    missionType: 'depart',
    harborId: 'any_harbor',
    routeId: 'any_route',
    ...overrides,
  }
}

function assertCleanVisibleCopy(result: ReturnType<typeof evaluateNavalFleetDeploymentReadiness>) {
  assert.equal(result.playerVisibleEngineeringCopyLeak, false)
  assert.deepEqual(result.visibleCopyForbiddenHits, [])
  const joined = [
    result.recommendedAction,
    result.durabilityLabel,
    result.missionLabel,
    result.riskLabel,
    result.statusLabel,
  ].join(' ')
  for (const forbidden of FORBIDDEN_VISIBLE_COPY) {
    assert.equal(joined.toLowerCase().includes(forbidden), false, `visible copy leaked ${forbidden}: ${joined}`)
  }
}

function runScenario(missionType: NavalFleetDeploymentMissionType, overrides: Partial<NavalFleetDeploymentPolicyInput> = {}) {
  return evaluateNavalFleetDeploymentReadiness(baseInput({ missionType, ...overrides }))
}

const departReady = runScenario('depart')
assert.equal(departReady.status, 'ready')
assert.equal(departReady.missionAllowed, true)
assert.equal(departReady.recommendedAction, '出港')
assert.ok(departReady.readinessScore >= 85, `expected high readiness, got ${departReady.readinessScore}`)
assert.ok(departReady.riskScore <= 20, `expected low risk, got ${departReady.riskScore}`)
assert.equal(departReady.shouldPatrol, false)
assert.equal(departReady.shouldRepair, false)
assert.equal(departReady.policyScope, 'naval_deployment_readiness_only_not_full_fleet_management')
assertCleanVisibleCopy(departReady)

const patrolReady = runScenario('patrol')
assert.equal(patrolReady.missionAllowed, true)
assert.equal(patrolReady.recommendedAction, '巡逻')
assert.equal(patrolReady.shouldPatrol, true)
assert.ok(patrolReady.readinessScore >= 80)
assertCleanVisibleCopy(patrolReady)

const damagedFleet = runScenario('patrol', {
  fleetStatus: 'repairing',
  durabilityCurrent: 24,
  durabilityMax: 100,
  supplyReadiness: 58,
  crewReadiness: 64,
})
assert.equal(damagedFleet.status, 'repairing')
assert.equal(damagedFleet.missionAllowed, false)
assert.equal(damagedFleet.recommendedAction, '整补')
assert.equal(damagedFleet.shouldRepair, true)
assert.equal(damagedFleet.shouldPatrol, false)
assert.equal(damagedFleet.shouldIntercept, false)
assert.match(damagedFleet.durabilityLabel, /耐久 24\/100/)
assertCleanVisibleCopy(damagedFleet)

const stormAndEnemyRisk = runScenario('patrol', {
  routeRisk: 92,
  enemyPresence: 84,
  seaWeatherRisk: 82,
})
assert.equal(stormAndEnemyRisk.missionAllowed, false)
assert.equal(stormAndEnemyRisk.recommendedAction, '待命')
assert.equal(stormAndEnemyRisk.shouldHold, true)
assert.ok(stormAndEnemyRisk.readinessScore < patrolReady.readinessScore)
assert.ok(stormAndEnemyRisk.riskScore >= 80)
assertCleanVisibleCopy(stormAndEnemyRisk)

const interceptReady = runScenario('intercept', {
  enemyPresence: 72,
  routeRisk: 24,
  seaWeatherRisk: 12,
})
assert.equal(interceptReady.missionAllowed, true)
assert.equal(interceptReady.recommendedAction, '拦截')
assert.equal(interceptReady.shouldIntercept, true)
assert.equal(interceptReady.shouldHold, false)
assert.ok(interceptReady.readinessScore >= 70)
assertCleanVisibleCopy(interceptReady)

const interceptWithoutEnemy = runScenario('intercept', {
  enemyPresence: 0,
  routeRisk: 10,
  seaWeatherRisk: 10,
})
assert.equal(interceptWithoutEnemy.missionAllowed, false)
assert.equal(interceptWithoutEnemy.recommendedAction, '待命')
assert.equal(interceptWithoutEnemy.shouldIntercept, false)
assert.equal(interceptWithoutEnemy.shouldHold, true)
assertCleanVisibleCopy(interceptWithoutEnemy)

console.log('[world_naval_fleet_deployment_policy_contract] all checks passed')
