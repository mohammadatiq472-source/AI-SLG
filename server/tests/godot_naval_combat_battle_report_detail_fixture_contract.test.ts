import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainGd = readFileSync('godot-client/scripts/app/main.gd', 'utf8')
const runner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf8')

const ACTION = 'world_naval_combat_battle_report_detail_fixture'

assert.ok(mainGd.includes(`"${ACTION}"`), 'main.gd should expose the W17 naval combat battle-report detail action')
assert.ok(
  mainGd.includes('func _press_mainline_visual_smoke_world_naval_combat_battle_report_detail_fixture()'),
  'main.gd should implement the W17 fixture',
)
assert.ok(
  mainGd.includes('_press_mainline_visual_smoke_world_naval_combat_minimal_settlement_fixture()'),
  'W17 should reuse the W16 settlement chain',
)
assert.ok(mainGd.includes('_open_overlay_panel_with_page("battle_report", "personal")'), 'W17 should open the existing battle report list')
assert.ok(mainGd.includes('ReportCard_%s'), 'W17 should click the existing report card by battleReportId')
assert.ok(mainGd.includes('worldNavalCombatBattleReportDetailUsesExistingBattleReport'), 'W17 should prove existing battle-report reuse')
assert.ok(mainGd.includes('海上战报'), 'W17 should show short Chinese aftermath copy')
assert.ok(mainGd.includes('拦截得手'), 'W17 should show winner aftermath copy')
assert.ok(mainGd.includes('船队受损'), 'W17 should show damage aftermath copy')
assert.ok(!mainGd.includes('NavalCombatBattleReportPanel'), 'W17 must not add a dedicated naval battle report page')

assert.ok(runner.includes(`"${ACTION}"`), 'visual-smoke runner should accept the W17 action')
assert.ok(runner.includes('worldNavalCombatBattleReportDetailOk'), 'runner should require the W17 success field')
assert.ok(runner.includes('worldNavalCombatBattleReportDetailSurface'), 'runner should capture existing surface proof')
assert.ok(runner.includes('worldNavalCombatBattleReportDetailAftermathCopyVisible'), 'runner should capture player-visible aftermath proof')

console.log('[godot_naval_combat_battle_report_detail_fixture_contract] all checks passed')
