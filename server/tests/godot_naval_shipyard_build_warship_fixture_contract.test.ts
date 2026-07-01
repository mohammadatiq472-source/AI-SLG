import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainGd = readFileSync('godot-client/scripts/app/main.gd', 'utf8')
const runner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf8')

const ACTION = 'world_naval_shipyard_build_warship_fixture'

assert.ok(mainGd.includes(`"${ACTION}"`), 'main.gd should expose the B-W19 naval shipyard action')
assert.ok(
  mainGd.includes('func _press_mainline_visual_smoke_world_naval_shipyard_build_warship_fixture()'),
  'main.gd should implement the B-W19 fixture',
)
assert.ok(mainGd.includes('buildNavalWarshipAtHarbor'), 'fixture should call buildNavalWarshipAtHarbor through the world action API')
assert.ok(mainGd.includes('worldNavalShipyardBuildWarshipOk'), 'fixture should report W19 success')
assert.ok(mainGd.includes('worldNavalShipyardUsesExistingSeaRuntime'), 'fixture should prove existing naval runtime reuse')
assert.ok(mainGd.includes('worldNavalShipyardDoesNotUseUnitMarker'), 'fixture should prove no land UnitMarker usage')
assert.ok(mainGd.includes('worldNavalShipyardShipyardOrderId'), 'fixture should expose shipyard order id')
assert.ok(mainGd.includes('worldNavalShipyardInventoryFleetId'), 'fixture should expose inventory fleet id')
assert.ok(mainGd.includes('worldNavalShipyardInventoryDelta'), 'fixture should expose inventory delta')
assert.ok(mainGd.includes('worldNavalShipyardFeedbackVisible'), 'fixture should prove player-visible shipyard feedback')
assert.ok(mainGd.includes('worldNavalShipyardVisibleCopyForbiddenHits'), 'fixture should guard visible copy against engineering terms')
assert.ok(mainGd.includes('worldNavalShipyardScope'), 'fixture should report minimal shipyard scope')
assert.ok(mainGd.includes('船坞开工'), 'fixture should show short Chinese shipyard copy')
assert.ok(mainGd.includes('新船入编'), 'fixture should show short Chinese inventory copy')
assert.ok(mainGd.includes('舰队补强'), 'fixture should show short Chinese fleet reinforcement copy')
assert.ok(mainGd.includes('可再出海'), 'fixture should show short Chinese sail-ready copy')
assert.ok(!mainGd.includes('NavalShipyardInventoryPanel'), 'B-W19 must not add a full naval inventory page')
assert.ok(!mainGd.includes('ShipyardEconomyPanel'), 'B-W19 must not add a full shipyard economy page')

assert.ok(runner.includes(`"${ACTION}"`), 'visual-smoke runner should accept the B-W19 action')
assert.ok(runner.includes('worldNavalShipyardBuildWarshipOk'), 'runner should require W19 success field')
assert.ok(runner.includes('worldNavalShipyardShipyardOrderId'), 'runner should require shipyard order id')
assert.ok(runner.includes('worldNavalShipyardInventoryFleetId'), 'runner should require inventory fleet id')
assert.ok(runner.includes('worldNavalShipyardFeedbackVisible'), 'runner should require visible shipyard feedback')
assert.ok(runner.includes('worldNavalShipyardScope'), 'runner should require minimal scope proof')

console.log('[godot_naval_shipyard_build_warship_fixture_contract] all checks passed')
