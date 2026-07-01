import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainGd = readFileSync('godot-client/scripts/app/main.gd', 'utf8')
const runner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf8')

const ACTION = 'world_naval_inventory_fleet_combat_damage_repair_fixture'
const fixtureStart = mainGd.indexOf('func _press_mainline_visual_smoke_world_naval_inventory_fleet_combat_damage_repair_fixture()')
const fixtureEnd = mainGd.indexOf('func _show_mainline_visual_smoke_naval_shipyard_build_warship_panel', fixtureStart)
const popupStart = mainGd.indexOf('func _show_mainline_visual_smoke_naval_inventory_fleet_combat_damage_repair_panel()')
const popupEnd = mainGd.indexOf('func _press_mainline_visual_smoke_world_sea_overseas_naval_frame_preview', popupStart)
assert.ok(fixtureStart >= 0 && fixtureEnd > fixtureStart, 'main.gd should expose a bounded B-W21 fixture block')
assert.ok(popupStart >= 0 && popupEnd > popupStart, 'main.gd should expose a bounded B-W21 feedback popup block')
const bW21FixtureBlock = mainGd.slice(fixtureStart, fixtureEnd)
const bW21PopupBlock = mainGd.slice(popupStart, popupEnd)
const bW21VisibleBlock = `${bW21FixtureBlock}\n${bW21PopupBlock}`

assert.ok(mainGd.includes(`"${ACTION}"`), 'main.gd should expose the B-W21 naval inventory fleet combat damage repair action')
assert.ok(
  bW21FixtureBlock.includes('func _press_mainline_visual_smoke_world_naval_inventory_fleet_combat_damage_repair_fixture()'),
  'main.gd should implement the B-W21 fixture',
)
assert.ok(bW21FixtureBlock.includes('buildNavalWarshipAtHarbor'), 'fixture should build the source inventory fleet')
assert.ok(bW21FixtureBlock.includes('seaPatrolScout'), 'fixture should reuse the inventory fleet for patrol')
assert.ok(bW21FixtureBlock.includes('seaPatrolIntercept'), 'fixture should reuse the inventory fleet for intercept')
assert.ok(bW21FixtureBlock.includes('resolveNavalCombatSettlement'), 'fixture should run minimal naval combat')
assert.ok(bW21FixtureBlock.includes('repairNavalFleetDamage'), 'fixture should queue return harbor repair')
assert.ok(bW21FixtureBlock.includes('worldNavalInventoryFleetCombatDamageRepairOk'), 'fixture should report B-W21 success')
assert.ok(bW21FixtureBlock.includes('worldNavalCombatUsesInventoryFleet'), 'fixture should prove inventory fleet enters combat')
assert.ok(bW21FixtureBlock.includes('worldNavalCombatUsesExistingSeaRuntime'), 'fixture should prove existing sea runtime reuse')
assert.ok(bW21FixtureBlock.includes('worldNavalCombatDoesNotUseUnitMarker'), 'fixture should prove no land UnitMarker usage')
assert.ok(bW21FixtureBlock.includes('worldNavalCombatDamageRepairScope'), 'fixture should report narrow scope')
assert.ok(bW21FixtureBlock.includes('worldNavalCombatDamageRepairUsesSharedCombatFeedback'), 'fixture should prove shared combat feedback usage')
assert.ok(bW21FixtureBlock.includes('worldNavalCombatDamageRepairLandSurfaceNavalCopyLeak'), 'fixture should check land-surface naval copy leaks')
assert.ok(bW21FixtureBlock.includes('landSurfaceForbiddenNavalCopyHits'), 'fixture should report forbidden naval copy hits on land surface')
assert.ok(bW21FixtureBlock.includes('worldNavalCombatDamageRepairUiScope'), 'fixture should report narrow shared-feedback UI scope')
assert.ok(bW21VisibleBlock.includes('战斗回报'), 'fixture should show shared combat feedback copy')
assert.ok(bW21VisibleBlock.includes('战报已记'), 'fixture should show shared battle-report recorded copy')
assert.ok(bW21VisibleBlock.includes('部队受损'), 'fixture should show generic damaged-unit copy')
assert.ok(bW21VisibleBlock.includes('整补中'), 'fixture should show generic replenishment copy')
assert.ok(bW21VisibleBlock.includes('查看战报'), 'fixture should show generic battle-report CTA copy')
for (const forbiddenCopy of ['海上接战', '舰队受损', '回港整修', '修理入列']) {
  assert.ok(
    !bW21VisibleBlock.includes(`visible_copy := "${forbiddenCopy}`) &&
      !bW21VisibleBlock.includes(`summary_text := "${forbiddenCopy}`) &&
      !bW21VisibleBlock.includes(`.text = "${forbiddenCopy}"`),
    `land-surface B-W21 smoke feedback must not display naval-only copy: ${forbiddenCopy}`,
  )
}
assert.ok(!mainGd.includes('NavalFleetInventoryPanel'), 'B-W21 must not add a full fleet inventory UI')

assert.ok(runner.includes(`"${ACTION}"`), 'visual-smoke runner should accept the B-W21 action')
assert.ok(runner.includes('worldNavalInventoryFleetCombatDamageRepairOk'), 'runner should require B-W21 success')
assert.ok(runner.includes('navalCombatId'), 'runner should require naval combat id')
assert.ok(runner.includes('damageReportId'), 'runner should require damage report id')
assert.ok(runner.includes('fleetDamageState'), 'runner should require fleet damage state')
assert.ok(runner.includes('returnHarborRepairId'), 'runner should require return harbor repair id')
assert.ok(runner.includes('repairStatus'), 'runner should require repair status')
assert.ok(runner.includes('worldNavalCombatDamageRepairScope'), 'runner should require minimal scope proof')
assert.ok(runner.includes('worldNavalCombatDamageRepairUsesSharedCombatFeedback'), 'runner should require shared combat feedback proof')
assert.ok(runner.includes('worldNavalCombatDamageRepairLandSurfaceNavalCopyLeak'), 'runner should require land-surface naval copy leak proof')
assert.ok(runner.includes('landSurfaceForbiddenNavalCopyHits'), 'runner should require land-surface forbidden copy hits')
assert.ok(runner.includes('worldNavalCombatDamageRepairUiScope'), 'runner should require B-W21 shared-feedback UI scope')

console.log('[godot_naval_inventory_fleet_combat_damage_repair_fixture_contract] all checks passed')
