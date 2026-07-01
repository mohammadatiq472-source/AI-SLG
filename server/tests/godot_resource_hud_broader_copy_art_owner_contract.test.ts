import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const scene = readFileSync('godot-client/scenes/app/main.tscn', 'utf-8')
const factory = readFileSync('godot-client/scripts/ui/slg_ui_component_factory.gd', 'utf-8')
const visualSmoke = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

function assertIncludes(source: string, needle: string, message: string) {
  assert.ok(source.includes(needle), message)
}

function assertNotIncludes(source: string, needle: string, message: string) {
  assert.ok(!source.includes(needle), message)
}

for (const nodeName of [
  'MainMapCellActionPanel',
  'TileActionHudTitleLabel',
  'TileActionHudCoordinateLabel',
  'TileActionHudYieldLabel',
  'TileActionHudDefenderLabel',
  'TileActionHudTroopLabel',
  'TileActionHudFeedbackLabel',
  'TileExpeditionButton',
]) {
  assertIncludes(scene, nodeName, `Resource HUD must keep real Godot node ${nodeName}.`)
}

for (const copyNeedle of [
  'var title_label := "土地 Lv.%d"',
  '_main_map_tile_hud_coordinate_label.text = "坐标 %s"',
  '_format_resource_tile_range_label("每小时"',
  'guard_soldier_label := "守军兵力 %d"',
  'recommended_power_label := "推荐战力 %d"',
  '_compact_tile_action_capture_reward_label(capture_label)',
  '_main_map_tile_expedition_button.text = "出征"',
]) {
  assertIncludes(main, copyNeedle, `Resource HUD must expose short Chinese player copy via ${copyNeedle}.`)
}

for (const forbiddenNeedle of [
  'var defender_strength_label := "守军强度 %d"',
  '_main_map_tile_hud_defender_label.text = str(summary.get("defenderStrengthLabel"',
  '_main_map_tile_hud_troop_label.text = "守军兵力 %d" % int(summary.get("defenderTroopCount"',
  '_main_map_cell_action_summary_label.text = "%s · %s" % [capture_label, power_label]',
]) {
  assertNotIncludes(main, forbiddenNeedle, `Resource HUD must not render legacy/debug copy path ${forbiddenNeedle}.`)
}

for (const forbiddenTerm of [
  '"守军强度"',
  '"read model"',
  '"authority"',
  '"tier"',
  '"backend"',
  '"contract id"',
]) {
  assertIncludes(main, forbiddenTerm, `Resource HUD visible-copy guard must include ${forbiddenTerm}.`)
}

for (const ownerNeedle of [
  'const LAND_TILE_ACTION_HUD_ART_OWNER := "SlgUiComponentFactory + MainMapCellActionPanel"',
  'static func land_tile_action_hud_art_owner() -> String:',
  'static func make_land_tile_action_hud_panel_style() -> StyleBoxFlat:',
  'static func apply_land_tile_action_hud_primary_button_style(button: Button) -> void:',
  'button.set_meta("tile_action_hud_style_owner", land_tile_action_hud_art_owner())',
]) {
  assertIncludes(factory, ownerNeedle, `SlgUiComponentFactory must own resource HUD art/style path ${ownerNeedle}.`)
}

for (const summaryField of [
  'tileHudArtOwner',
  'tileHudSharedStyleOwner',
  'tileHudBackplateToken',
  'landActionHudSkinFamily',
  'landActionHudVariant',
  'landActionHudPrimaryButtonSkinOk',
  'landActionHudLevelBadgeVisible',
  'landActionHudResourceChipVisible',
  'landActionHudGuardChipVisible',
  'landActionHudRewardLineVisible',
  'landActionHudNoEngineeringCopyLeak',
  'visiblePrimaryLabels',
  'visibleCopyForbiddenHits',
  'playerVisibleEngineeringCopyLeak',
]) {
  assertIncludes(main, summaryField, `Resource HUD summary must expose ${summaryField}.`)
  assertIncludes(visualSmoke, summaryField, `Formal visual smoke must require/read ${summaryField}.`)
}

assertIncludes(
  visualSmoke,
  'tileHudSharedStyleOwner!=SlgUiComponentFactory + MainMapCellActionPanel',
  'Formal runner must fail if resource HUD style owner drifts.',
)
assertIncludes(
  visualSmoke,
  'visiblePrimaryLabels contains 守军强度',
  'Formal runner must fail if forbidden guard-strength copy becomes player-visible.',
)

console.log('[godot_resource_hud_broader_copy_art_owner_contract] all checks passed')
