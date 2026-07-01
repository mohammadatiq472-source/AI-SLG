import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainGd = readFileSync('godot-client/scripts/app/main.gd', 'utf8')
const runner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf8')

const ACTION = 'world_naval_inventory_fleet_patrol_reuse_fixture'

assert.ok(mainGd.includes(`"${ACTION}"`), 'main.gd should expose the B-W20 naval inventory fleet reuse action')
assert.ok(
  mainGd.includes('func _press_mainline_visual_smoke_world_naval_inventory_fleet_patrol_reuse_fixture()'),
  'main.gd should implement the B-W20 fixture',
)
assert.ok(mainGd.includes('buildNavalWarshipAtHarbor'), 'fixture should build the source shipyard inventory fleet')
assert.ok(mainGd.includes('seaPatrolScout'), 'fixture should reuse the inventory fleet for patrol')
assert.ok(mainGd.includes('seaPatrolIntercept'), 'fixture should reuse the inventory fleet for intercept')
assert.ok(mainGd.includes('worldNavalInventoryFleetPatrolReuseOk'), 'fixture should report B-W20 success')
assert.ok(mainGd.includes('worldNavalReuseUsesExistingSeaRuntime'), 'fixture should prove existing sea runtime reuse')
assert.ok(mainGd.includes('worldNavalReuseDoesNotUseUnitMarker'), 'fixture should prove no land UnitMarker usage')
assert.ok(mainGd.includes('worldNavalReuseScope'), 'fixture should report the narrow reuse scope')
assert.ok(mainGd.includes('feedbackVisible'), 'fixture should report player-visible feedback')
assert.ok(mainGd.includes('playerVisibleEngineeringCopyLeak'), 'fixture should guard engineering copy leakage')
assert.ok(mainGd.includes('visibleCopyForbiddenHits'), 'fixture should expose forbidden visible copy hits')
assert.ok(mainGd.includes('新舰出港'), 'fixture should show short Chinese launch copy')
assert.ok(mainGd.includes('舰队巡航'), 'fixture should show short Chinese patrol copy')
assert.ok(mainGd.includes('航线复用'), 'fixture should show short Chinese route reuse copy')
assert.ok(mainGd.includes('可接战'), 'fixture should show short Chinese intercept-ready copy')
assert.ok(!mainGd.includes('NavalFleetInventoryPanel'), 'B-W20 must not add a full fleet inventory UI')

assert.ok(runner.includes(`"${ACTION}"`), 'visual-smoke runner should accept the B-W20 action')
assert.ok(runner.includes('worldNavalInventoryFleetPatrolReuseOk'), 'runner should require B-W20 success')
assert.ok(runner.includes('sourceShipyardOrderId'), 'runner should require source order id')
assert.ok(runner.includes('inventoryFleetId'), 'runner should require inventory fleet id')
assert.ok(runner.includes('reusedFleetId'), 'runner should require reused fleet id')
assert.ok(runner.includes('reuseStatus'), 'runner should require route/patrol/intercept reuse status')
assert.ok(runner.includes('worldNavalReuseScope'), 'runner should require minimal scope proof')

console.log('[godot_naval_inventory_fleet_patrol_reuse_fixture_contract] all checks passed')
