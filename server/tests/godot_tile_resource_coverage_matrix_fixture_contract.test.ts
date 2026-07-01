import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const visualSmoke = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')
const closureBatch = readFileSync('godot-client/tools/run_mainline_ui_closure_batch.py', 'utf-8')
const worldService = readFileSync('server/src/application/world/WorldService.ts', 'utf-8')

function assertIncludes(source: string, needle: string, message: string) {
  assert.ok(source.includes(needle), message)
}

assertIncludes(worldService, 'buildResourceTileCoverageMatrixFixtureAction', 'WorldService must expose coverage matrix action.')
assertIncludes(worldService, 'buildResourceTileExpeditionPreview', 'coverage matrix must use shared-domain preview policy.')

const action = 'world_tile_resource_coverage_matrix_fixture'
assertIncludes(main, `"${action}"`, 'main.gd must route coverage matrix fixture.')
assertIncludes(visualSmoke, `"${action}"`, 'visual smoke runner must whitelist coverage matrix fixture.')
assertIncludes(closureBatch, action, 'closure batch must isolate coverage matrix fixture.')

for (const field of [
  'worldTileResourceCoverageMatrixOk',
  'resourceCoverageUsesSharedDomainPolicy',
  'coverageTileCount',
  'coveredLevels',
  'coveredResourceKinds',
  'coverageSamples',
  'zeroLevelSubstrateProtected',
  'l10NotRequiredForCurrentMvp',
  'playerVisibleEngineeringCopyLeak',
  'visibleCopyForbiddenHits',
  'guardSoldierLabel',
  'troopStrengthLabel',
  'guardSoldierCount',
  'recommendedPowerLabel',
  'recommendedPower',
  'guardSoldierUsesDefenderStrengthRange',
  'recommendedPowerUsesPreviewRecommendedPower',
  'guardSoldierAndRecommendedPowerSeparatedOk',
  'guardSoldierAuthorityExpected',
  'recommendedPowerAuthorityExpected',
  'resourceTileHudAuthorityNumbersOk',
  'tileHudAnchorMode',
  'selectedTileScreenPosition',
  'tileHudRect',
  'tileHudBoundToSelectedTile',
  'tileHudSafeViewportClampOk',
  'tileHudAvoidsLeftRailAndBottomNav',
  'selectedTileSingleSelectionOk',
  'selectedTileActiveFrameCount',
  'tileHudActiveCount',
  'tileHudForbiddenGuardStrengthCopyAbsent',
]) {
  assertIncludes(main, field, `Godot summary must include ${field}.`)
  assertIncludes(visualSmoke, field, `runner must require ${field}.`)
}

assertIncludes(main, '"tileHudAnchorMode": anchor_mode', 'Godot summary must report selected-tile-bound HUD anchor mode.')
assertIncludes(main, '"tileHudBoundToSelectedTile": bound', 'Godot summary must report tile HUD binding to selected tile.')
assertIncludes(main, 'guard_soldier_count = int(preview_defender_strength.get("max"', 'guardSoldierLabel must use preview.defenderStrength max.')
assertIncludes(main, 'recommended_power := int(preview.get("recommendedPower", 0))', 'recommendedPowerLabel must use preview.recommendedPower.')
assertIncludes(main, 'expected_guard_soldier_count := tile_level * 300', 'Lv3 fixture must prove guard soldiers 900 from authority.')
assertIncludes(main, 'expected_recommended_power := tile_level * 100', 'Lv3 fixture must prove recommended power 300 from authority.')
assertIncludes(main, '"guardSoldierAndRecommendedPowerSeparatedOk": guard_soldier_label != recommended_power_label and guard_soldier_count != recommended_power', 'Godot summary must prevent guard soldiers and recommended power collapsing to one value.')
assertIncludes(main, '_compact_tile_action_capture_reward_label(capture_label)', 'HUD reward summary must use compact reward copy.')
assert.ok(!main.includes('_main_map_cell_action_summary_label.text = "%s · %s" % [capture_label, power_label]'), 'HUD reward summary must not duplicate recommendedPowerLabel.')
assertIncludes(visualSmoke, 'tileHudAnchorMode!=selected_tile_bound', 'Runner must fail if HUD anchor remains fixed-right.')
assertIncludes(visualSmoke, 'tileHudBoundToSelectedTile!=true', 'Runner must require tile HUD bound to selected tile.')
assertIncludes(visualSmoke, 'tileHudAvoidsLeftRailAndBottomNav!=true', 'Runner must require HUD not overlap left rail or bottom nav.')
assertIncludes(visualSmoke, 'resourceTileHudAuthorityNumbersOk!=true', 'Runner must fail if authority numbers are not green.')
assertIncludes(visualSmoke, 'guardSoldierLabel prefix invalid', 'Runner must validate guard soldier visible label.')
assertIncludes(visualSmoke, 'recommendedPowerLabel prefix invalid', 'Runner must validate recommended power visible label.')
assertIncludes(visualSmoke, 'visiblePrimaryLabels contains 守军强度', 'Runner must scan visible HUD labels for forbidden 守军强度 copy.')
assertIncludes(main, 'visible_texts: Array[String]', 'Godot HUD summary must build explicit player-visible text list.')
assertIncludes(main, 'guard_soldier_label,', 'Godot visible text list must include guard soldier copy.')
assertIncludes(main, 'recommended_power_label,', 'Godot visible text list must include recommended power copy.')

console.log('[godot_tile_resource_coverage_matrix_fixture_contract] all checks passed')
