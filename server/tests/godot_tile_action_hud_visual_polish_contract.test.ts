import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf8')
const scene = readFileSync('godot-client/scenes/app/main.tscn', 'utf8')
const visualSmoke = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf8')
const factory = readFileSync('godot-client/scripts/ui/slg_ui_component_factory.gd', 'utf8')

function assertIncludes(source: string, needle: string, message: string) {
  assert.ok(source.includes(needle), message)
}

for (const token of [
  'TILE_ACTION_HUD_VISUAL_POLISH_TOKEN',
  'tile_action_hud_landscape_slg_min_visual_polish_v1',
  '_make_tile_action_hud_panel_style',
  '_apply_tile_action_hud_primary_button_style',
  'tileHudVisualPolishOk',
  'tileHudCardVisible',
  'tileHudArtOwner',
  'tileHudSharedStyleOwner',
  'tileHudBackplateToken',
  'tileHudUsesNineSliceOrStyleToken',
  'tileHudSelectedTileAnchorVisible',
  'tileHudNoNestedCards',
  'tileHudTextDensityOk',
  'tileHudForbiddenGuardStrengthCopyAbsent',
  'guardSoldierLabel',
  'troopStrengthLabel',
  'guardSoldierUsesDefenderStrengthRange',
  'recommendedPowerUsesPreviewRecommendedPower',
  'guardSoldierAndRecommendedPowerSeparatedOk',
  'guardSoldierAuthorityExpected',
  'recommendedPowerAuthorityExpected',
  'resourceTileHudAuthorityNumbersOk',
  'visiblePrimaryLabels',
  'engineeringCopyForbiddenHits',
  'rawTileIdVisible',
  'LAND_ACTION_HUD_VISUAL_POLISH_SLICE_TOKEN',
  'BaseActionHudSkin',
  'land_resource',
  'landActionHudVisualPolishSliceOk',
  'landActionHudSkinFamily',
  'landActionHudVariant',
  'landActionHudBackplateVisible',
  'landActionHudPrimaryButtonSkinOk',
  'landActionHudLevelBadgeVisible',
  'landActionHudResourceChipVisible',
  'landActionHudGuardChipVisible',
  'landActionHudRewardLineVisible',
  'landActionHudNoEngineeringCopyLeak',
  'landActionHudRewardLineLabel',
  'l0TileLabelOk',
  'l1L9ResourceLevelCoverageOk',
  'doesNotUseFakeFullPageImage',
]) {
  assertIncludes(main, token, `Tile Action HUD visual polish summary must expose ${token}.`)
}

for (const token of [
  'LAND_TILE_ACTION_HUD_ART_OWNER',
  'SlgUiComponentFactory + MainMapCellActionPanel',
  'LAND_TILE_ACTION_HUD_BACKPLATE_TOKEN',
  'LAND_TILE_ACTION_HUD_PRIMARY_BUTTON_TOKEN',
  'make_land_tile_action_hud_panel_style',
  'make_land_tile_action_hud_button_style',
  'apply_land_tile_action_hud_primary_button_style',
]) {
  assertIncludes(factory, token, `SlgUiComponentFactory must own land tile HUD shared style token ${token}.`)
}

for (const token of [
  'SlgUiComponentFactoryScript.make_land_tile_action_hud_panel_style()',
  'SlgUiComponentFactoryScript.make_land_tile_action_hud_button_style',
  'SlgUiComponentFactoryScript.apply_land_tile_action_hud_primary_button_style(button)',
  'SlgUiComponentFactoryScript.land_tile_action_hud_art_owner()',
]) {
  assertIncludes(main, token, `Tile HUD main.gd wrapper must delegate shared styling through ${token}.`)
}

for (const token of [
  'MainMapCellActionPanel',
  'TileExpeditionButton',
  'TileActionHudTitleLabel',
  'TileActionHudYieldLabel',
  'TileActionHudDefenderLabel',
  'TileActionHudTroopLabel',
  'TileActionHudFeedbackLabel',
]) {
  assertIncludes(scene, token, `Tile Action HUD must keep real Godot node ${token}.`)
}

for (const field of [
  'tileHudVisualPolishOk',
  'tileHudCardVisible',
  'tileHudArtOwner',
  'tileHudSharedStyleOwner',
  'tileHudBackplateToken',
  'expeditionButtonNodeName',
  'visiblePrimaryLabels',
  'engineeringCopyForbiddenHits',
  'rawTileIdVisible',
  'landActionHudVisualPolishSliceOk',
  'landActionHudSkinFamily',
  'landActionHudVariant',
  'landActionHudBackplateVisible',
  'landActionHudPrimaryButtonSkinOk',
  'landActionHudLevelBadgeVisible',
  'landActionHudResourceChipVisible',
  'landActionHudGuardChipVisible',
  'landActionHudRewardLineVisible',
  'landActionHudNoEngineeringCopyLeak',
  'l0TileLabelOk',
  'l1L9ResourceLevelCoverageOk',
  'tileHudNoNestedCards',
  'tileHudTextDensityOk',
  'tileHudForbiddenGuardStrengthCopyAbsent',
  'guardSoldierLabel',
  'troopStrengthLabel',
  'guardSoldierAndRecommendedPowerSeparatedOk',
  'guardSoldierAuthorityExpected',
  'recommendedPowerAuthorityExpected',
  'resourceTileHudAuthorityNumbersOk',
]) {
  assertIncludes(visualSmoke, field, `Stage 138 visual smoke must require ${field}.`)
}

assert.ok(!main.includes('var defender_strength_label := "守军强度 %d"'), 'Tile HUD must not build player-visible 守军强度 copy.')
assertIncludes(main, '"守军强度"', 'Visible-copy forbidden list must explicitly guard against 守军强度.')
assertIncludes(main, 'guard_soldier_label := "守军兵力 %d"', 'Tile HUD must label defenderStrength as guard soldiers.')
assertIncludes(main, 'recommended_power_label := "推荐战力 %d"', 'Tile HUD must label recommendedPower as recommended power.')
assertIncludes(main, 'expected_guard_soldier_count := tile_level * 300', 'Tile HUD must encode resource authority guard soldier target.')
assertIncludes(main, 'expected_recommended_power := tile_level * 100', 'Tile HUD must encode resource authority recommended power target.')
assertIncludes(main, '"resourceTileHudAuthorityNumbersOk": guard_soldier_count == expected_guard_soldier_count and recommended_power == expected_recommended_power', 'Tile HUD must prove guard 900 vs recommended 300 for Lv3 authority fixture.')
assertIncludes(main, '_main_map_tile_hud_defender_label.text = str(summary.get("guardSoldierLabel"', 'Visible defender row must use guardSoldierLabel.')
assertIncludes(main, '_main_map_tile_hud_troop_label.text = str(summary.get("recommendedPowerLabel"', 'Visible troop row must use recommendedPowerLabel.')
assertIncludes(main, '_compact_tile_action_capture_reward_label(capture_label)', 'Reward summary must compact capture reward copy.')
assert.ok(!main.includes('_main_map_cell_action_summary_label.text = "%s · %s" % [capture_label, power_label]'), 'Reward summary must not duplicate recommendedPowerLabel when the independent recommended power row is visible.')
assert.ok(!main.includes('_main_map_tile_hud_troop_label.text = "守军兵力 %d" % int(summary.get("defenderTroopCount"'), 'Visible HUD must not render guard soldiers from defenderTroopCount.')
assertIncludes(visualSmoke, 'visibleCopyForbiddenHits contains 守军强度', 'Runner must fail if visibleCopyForbiddenHits contains 守军强度.')
assertIncludes(visualSmoke, 'guardSoldierCount!=900 for Lv3', 'Runner must lock Lv3 guard soldier value to 900.')
assertIncludes(visualSmoke, 'recommendedPower!=300 for Lv3', 'Runner must lock Lv3 recommended power value to 300.')

console.log('[godot_tile_action_hud_visual_polish_contract] all checks passed')
