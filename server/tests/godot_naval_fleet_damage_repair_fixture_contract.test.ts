import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainGd = readFileSync('godot-client/scripts/app/main.gd', 'utf8')
const runner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf8')

const ACTION = 'world_naval_fleet_damage_repair_fixture'
const fixtureStart = mainGd.indexOf('func _press_mainline_visual_smoke_world_naval_fleet_damage_repair_fixture()')
const fixtureEnd = mainGd.indexOf('func _read_mainline_visual_smoke_naval_runtime_fleet', fixtureStart)
const popupStart = mainGd.indexOf('func _show_mainline_visual_smoke_naval_fleet_damage_repair_panel(')
const popupEnd = mainGd.indexOf('func _press_mainline_visual_smoke_world_naval_shipyard_build_warship_fixture', popupStart)
assert.ok(fixtureStart >= 0 && fixtureEnd > fixtureStart, 'main.gd should expose a bounded B-W18 fixture block')
assert.ok(popupStart >= 0 && popupEnd > popupStart, 'main.gd should expose a bounded B-W18 feedback popup block')
const bW18FixtureBlock = mainGd.slice(fixtureStart, fixtureEnd)
const bW18PopupBlock = mainGd.slice(popupStart, popupEnd)
const bW18VisibleBlock = `${bW18FixtureBlock}\n${bW18PopupBlock}`

assert.ok(mainGd.includes(`"${ACTION}"`), 'main.gd should expose the B-W18 naval fleet damage repair action')
assert.ok(
  bW18FixtureBlock.includes('func _press_mainline_visual_smoke_world_naval_fleet_damage_repair_fixture()'),
  'main.gd should implement the B-W18 fixture',
)
assert.ok(bW18FixtureBlock.includes('repairNavalFleetDamage'), 'fixture should call repairNavalFleetDamage through the world action API')
assert.ok(bW18FixtureBlock.includes('worldNavalFleetDamageRepairDamagePersistsAfterSettlement'), 'fixture should prove damaged fleet state persists after settlement')
assert.ok(bW18FixtureBlock.includes('worldNavalFleetDamageRepairRepairFeedbackVisible'), 'fixture should prove player-visible repair feedback')
assert.ok(bW18FixtureBlock.includes('worldNavalFleetDamageRepairVisibleCopyForbiddenHits'), 'fixture should guard visible copy against engineering terms')
assert.ok(bW18FixtureBlock.includes('worldNavalFleetDamageRepairUsesSharedCombatFeedback'), 'fixture should prove shared combat feedback usage')
assert.ok(bW18FixtureBlock.includes('worldNavalFleetDamageRepairLandSurfaceNavalCopyLeak'), 'fixture should check land-surface naval repair copy leaks')
assert.ok(bW18FixtureBlock.includes('fleetDamageRepairLandSurfaceForbiddenHits'), 'fixture should report forbidden naval repair hits on land surface')
assert.ok(bW18FixtureBlock.includes('worldNavalFleetDamageRepairUiScope'), 'fixture should report narrow shared-feedback UI scope')
assert.ok(bW18FixtureBlock.includes('NavalCombatMinimalSettlementLayer'), 'fixture should clear previous naval settlement layer before land-surface repair feedback')
assert.ok(bW18FixtureBlock.includes('NavalCombatMinimalSettlementPopup'), 'fixture should clear previous naval settlement popup before land-surface repair feedback')
assert.ok(bW18VisibleBlock.includes('战斗回报'), 'fixture should show shared combat feedback copy')
assert.ok(bW18VisibleBlock.includes('战报已记'), 'fixture should show shared battle-report recorded copy')
assert.ok(bW18VisibleBlock.includes('部队受损'), 'fixture should show generic damaged-unit copy')
assert.ok(bW18VisibleBlock.includes('整补中'), 'fixture should show generic replenishment copy')
assert.ok(bW18VisibleBlock.includes('查看战报'), 'fixture should show generic battle-report CTA copy')
for (const forbiddenCopy of ['海上遭遇', '海上接战', '舰队受袭', '舰队受损', '船队受损', '回港整修', '预计恢复', '修理入列']) {
  assert.ok(
    !bW18VisibleBlock.includes(`repair_feedback_copy = "${forbiddenCopy}`) &&
      !bW18VisibleBlock.includes(`summary_text := "${forbiddenCopy}`) &&
      !bW18VisibleBlock.includes(`.text = "${forbiddenCopy}"`),
    `land-surface B-W18 smoke feedback must not display naval repair copy: ${forbiddenCopy}`,
  )
}
assert.ok(!mainGd.includes('NavalFleetInventoryPanel'), 'B-W18 must not add a full fleet inventory page')
assert.ok(!mainGd.includes('ShipyardPanel'), 'B-W18 must not add a shipyard page')

assert.ok(runner.includes(`"${ACTION}"`), 'visual-smoke runner should accept the B-W18 action')
assert.ok(runner.includes('worldNavalFleetDamageRepairOk'), 'runner should require W18 success field')
assert.ok(runner.includes('worldNavalFleetDamageRepairDamagedFleetId'), 'runner should require damaged fleet id')
assert.ok(runner.includes('worldNavalFleetDamageRepairRepairFeedbackVisible'), 'runner should require visible repair feedback')
assert.ok(runner.includes('worldNavalFleetDamageRepairScope'), 'runner should require minimal scope proof')
assert.ok(runner.includes('worldNavalFleetDamageRepairUsesSharedCombatFeedback'), 'runner should require shared combat feedback proof')
assert.ok(runner.includes('worldNavalFleetDamageRepairLandSurfaceNavalCopyLeak'), 'runner should require land-surface naval repair copy leak proof')
assert.ok(runner.includes('fleetDamageRepairLandSurfaceForbiddenHits'), 'runner should require land-surface forbidden repair copy hits')
assert.ok(runner.includes('worldNavalFleetDamageRepairUiScope'), 'runner should require B-W18 shared-feedback UI scope')

console.log('[godot_naval_fleet_damage_repair_fixture_contract] all checks passed')
