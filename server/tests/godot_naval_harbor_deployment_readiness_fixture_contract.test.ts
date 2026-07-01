import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainGd = readFileSync('godot-client/scripts/app/main.gd', 'utf8')
const runner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf8')

const ACTION = 'world_naval_harbor_deployment_readiness_fixture'

assert.ok(mainGd.includes(`"${ACTION}"`), 'main.gd should expose the B-W25 harbor deployment readiness action')
assert.ok(
  mainGd.includes('func _press_mainline_visual_smoke_world_naval_harbor_deployment_readiness_fixture()'),
  'main.gd should implement the B-W25 harbor deployment readiness fixture',
)
assert.ok(mainGd.includes('openNavalHarborInventory'), 'fixture should read harbor HUD from the real world action API')
assert.ok(mainGd.includes('deploymentReadinessUsesSharedDomainPolicy'), 'fixture should prove shared-domain policy consumption')
assert.ok(mainGd.includes('recommendedActionLabel'), 'fixture should expose player-facing recommended action')
assert.ok(mainGd.includes('harborHudActionButtonStateOk'), 'fixture should prove real Button state is policy-driven')
assert.ok(mainGd.includes('worldNavalHarborDeploymentReadinessOk'), 'fixture should report B-W25 success')
assert.ok(mainGd.includes('worldNavalHarborDeploymentReadinessScope'), 'fixture should report narrow B-W25 scope')
assert.ok(mainGd.includes('泉州港'), 'fixture should show the harbor surface name')
assert.ok(mainGd.includes('舰队'), 'fixture should show fleet card copy on harbor surface')
assert.ok(mainGd.includes('风平浪稳') || mainGd.includes('高风险'), 'fixture should show short Chinese risk copy')
assert.ok(!mainGd.includes('FullNavalFleetManagementPanel'), 'B-W25 must not add full fleet management UI')
assert.ok(!mainGd.includes('PortEconomyPanel'), 'B-W25 must not add full port economy UI')

assert.ok(runner.includes(`"${ACTION}"`), 'visual-smoke runner should accept the B-W25 action')
for (const requiredField of [
  'worldNavalHarborDeploymentReadinessOk',
  'harborSurfaceVisible',
  'fleetCardVisible',
  'fleetId',
  'inventoryFleetId',
  'harborId',
  'deploymentReadinessUsesSharedDomainPolicy',
  'deploymentPolicyScope',
  'recommendedActionLabel',
  'missionAllowed',
  'readinessScore',
  'riskScore',
  'durabilityLabel',
  'riskLabel',
  'shouldRepair',
  'shouldPatrol',
  'shouldIntercept',
  'shouldHold',
  'harborHudActionButtonStateOk',
  'feedbackVisible',
  'landSurfaceNavalCopyLeak',
  'playerVisibleEngineeringCopyLeak',
  'visibleCopyForbiddenHits',
  'worldNavalHarborDeploymentReadinessScope',
]) {
  assert.ok(runner.includes(requiredField), `runner should require B-W25 summary field: ${requiredField}`)
}

console.log('[godot_naval_harbor_deployment_readiness_fixture_contract] all checks passed')
