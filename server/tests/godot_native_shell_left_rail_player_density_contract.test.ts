import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const shell = readFileSync('godot-client/scripts/ui/native_slg_shell.gd', 'utf-8')
const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const visualSmoke = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

assert.ok(
  shell.includes('const LEFT_RAIL_PLAYER_DENSITY_CONTRACT := "native_shell_left_rail_player_density_v1"'),
  'native shell must expose a stable left-rail player density contract token.',
)

for (const hiddenNeedle of [
  '_task_body.visible = false',
  '_city_state_title.visible = false',
  '_city_state_summary.visible = false',
  '_city_tech_summary.visible = false',
  '_troop_section_title.visible = false',
  '_troop_summary.visible = false',
  'strength_tag_node.visible = false',
]) {
  assert.ok(shell.includes(hiddenNeedle), `left rail must hide small main-visual copy: ${hiddenNeedle}`)
}

for (const summaryField of [
  'leftRailPlayerDensityContractId',
  'leftRailTaskBodyHidden',
  'leftRailCityStateTitleHidden',
  'leftRailCityStateSummaryHidden',
  'leftRailCityTechSummaryHidden',
  'leftRailTroopSectionTitleHidden',
  'leftRailTroopSummaryHidden',
  'leftRailTroopStrengthTagsHidden',
  'leftRailPlayerDensityContractOk',
  'leftTroopRailVisibleCountMode',
  'leftTroopRailTargetVisibleSlotCount',
  'leftTroopRailNoPhantomEmptyFrameOk',
  'leftTroopRailNoStandbyCopy',
  'leftTroopRailJumpActionId',
  'leftTroopRailJumpActionNodeName',
  'leftTroopRailJumpActionAvailable',
]) {
  assert.ok(shell.includes(`"${summaryField}"`), `native shell summary must expose ${summaryField}.`)
  assert.ok(main.includes(summaryField), `main.gd smoke result must expose ${summaryField}.`)
  assert.ok(visualSmoke.includes(`"${summaryField}"`), `world_left_troop_rail_component_contract runner must require ${summaryField}.`)
}

for (const alignmentField of [
  'leftTroopRailFixed5AlignmentToken',
  'leftTroopRailFixed5AlignmentOk',
  'leftTroopRailSlotGridAlignedOk',
  'leftTroopRailAvatarColumnAlignedOk',
  'leftTroopRailStatusColumnAlignedOk',
  'leftTroopRailStrengthColumnAlignedOk',
  'leftTroopRailBarColumnAlignedOk',
  'leftTroopRailJumpButtonColumnAlignedOk',
  'leftTroopRailNoVisibleEmptySlotFrame',
]) {
  assert.ok(shell.includes(`"${alignmentField}"`), `native shell summary must expose ${alignmentField}.`)
  assert.ok(visualSmoke.includes(`"${alignmentField}"`), `world_left_troop_rail_component_contract runner must require ${alignmentField}.`)
}

for (const jumpField of [
  'leftTroopRailJumpVisibleCopyClean',
  'leftTroopRailJumpVisibleCopyForbiddenHits',
]) {
  assert.ok(main.includes(jumpField), `main.gd left rail jump result must expose ${jumpField}.`)
  assert.ok(visualSmoke.includes(`"${jumpField}"`), `left rail jump runner must require ${jumpField}.`)
}

assert.ok(shell.includes('const TROOP_SLOT_VISIBLE_COUNT := 5'), 'left rail must target fixed 5 visible troop slots.')
assert.ok(shell.includes('const LEFT_TROOP_RAIL_FIXED_5_ALIGNMENT_TOKEN := "left_troop_rail_fixed_5_alignment_v1"'), 'left rail must expose a fixed_5 visual alignment token.')
assert.ok(shell.includes('"leftTroopRailVisibleCountMode": "fixed_5"'), 'native shell summary must expose fixed_5 mode.')
assert.ok(shell.includes('"leftTroopRailTargetVisibleSlotCount": TROOP_SLOT_VISIBLE_COUNT'), 'native shell summary must expose target visible slot count.')
assert.ok(shell.includes('"leftTroopRailNoPhantomEmptyFrameOk": no_phantom_empty_frame_ok'), 'native shell summary must prove no phantom empty frame.')
assert.ok(shell.includes('"leftTroopRailNoStandbyCopy": no_standby_copy'), 'native shell summary must prove left rail visible labels do not contain 待命.')
assert.ok(shell.includes('"leftTroopRailFixed5AlignmentOk": fixed_5_alignment_ok'), 'native shell summary must prove fixed_5 visual alignment.')
assert.ok(shell.includes('"leftTroopRailSlotGridAlignedOk": slot_grid_aligned_ok'), 'native shell summary must prove uniform slot row grid.')
assert.ok(shell.includes('"leftTroopRailAvatarColumnAlignedOk": avatar_column_aligned_ok'), 'native shell summary must prove avatar column alignment.')
assert.ok(shell.includes('"leftTroopRailStatusColumnAlignedOk": status_column_aligned_ok'), 'native shell summary must prove status label/badge column alignment.')
assert.ok(shell.includes('"leftTroopRailStrengthColumnAlignedOk": strength_column_aligned_ok'), 'native shell summary must prove troop number column alignment.')
assert.ok(shell.includes('"leftTroopRailBarColumnAlignedOk": bar_column_aligned_ok'), 'native shell summary must prove strength bar column alignment.')
assert.ok(shell.includes('"leftTroopRailJumpButtonColumnAlignedOk": jump_button_column_aligned_ok'), 'native shell summary must prove real jump button/card column alignment.')
assert.ok(shell.includes('"leftTroopRailNoVisibleEmptySlotFrame": no_visible_empty_slot_frame'), 'native shell summary must prove no visible empty slot frame.')
assert.ok(shell.includes('status_label_node.visible = status_label != ""'), 'left rail must hide empty status labels instead of showing 待命 filler.')
assert.ok(!shell.includes('return _truncate_text(normalized if normalized != "" else "待命", 4)'), 'left rail must not default visible status label to 待命.')
assert.ok(shell.includes('"jumpActionAvailable": slot_jump_available'), 'slot summary must expose per-slot jump availability.')
assert.ok(shell.includes('"troopId": str(button.get_meta("troop_id", ""))'), 'slot summary must expose real troopId.')
assert.ok(shell.includes('"tileId": str(button.get_meta("troop_tile_id", ""))'), 'slot summary must expose real tileId.')
assert.ok(main.includes('"world_left_troop_rail_jump_to_unit_fixture"'), 'main.gd must route left troop rail jump fixture.')
assert.ok(main.includes('_focus_shell_troop_slot_on_main_map'), 'main.gd must focus troop position through real map selection.')
assert.ok(main.includes('_format_main_map_cell_owner_visible_label(owner_id)'), 'main.gd must render map cell owner as player-visible Chinese copy.')
assert.ok(main.includes('return "中立地块"'), 'main.gd must translate neutral owner copy.')
assert.ok(main.includes('_collect_left_troop_rail_jump_visible_copy_forbidden_hits'), 'left rail jump must collect visible-copy forbidden hits.')
assert.ok(visualSmoke.includes('"world_left_troop_rail_jump_to_unit_fixture"'), 'visual smoke runner must whitelist left rail jump fixture.')
assert.ok(visualSmoke.includes('leftTroopRailVisibleCountMode!=fixed_5'), 'runner must fail non-fixed_5 left rail mode.')
assert.ok(visualSmoke.includes('leftTroopRailTargetVisibleSlotCount!=5'), 'runner must fail wrong target visible slot count.')
assert.ok(visualSmoke.includes('leftTroopRailNoPhantomEmptyFrameOk!=true'), 'runner must fail phantom empty frames.')
assert.ok(visualSmoke.includes('leftTroopRailNoStandbyCopy!=true'), 'runner must fail visible 待命 filler copy.')
assert.ok(visualSmoke.includes('leftTroopRailFixed5AlignmentOk!=true'), 'runner must fail misaligned fixed_5 left rail.')
assert.ok(visualSmoke.includes('leftTroopRailSlotGridAlignedOk!=true'), 'runner must fail non-uniform slot row grid.')
assert.ok(visualSmoke.includes('leftTroopRailAvatarColumnAlignedOk!=true'), 'runner must fail avatar column drift.')
assert.ok(visualSmoke.includes('leftTroopRailStatusColumnAlignedOk!=true'), 'runner must fail status column drift.')
assert.ok(visualSmoke.includes('leftTroopRailStrengthColumnAlignedOk!=true'), 'runner must fail troop number column drift.')
assert.ok(visualSmoke.includes('leftTroopRailBarColumnAlignedOk!=true'), 'runner must fail strength bar column drift.')
assert.ok(visualSmoke.includes('leftTroopRailJumpButtonColumnAlignedOk!=true'), 'runner must fail real jump button/card column drift.')
assert.ok(visualSmoke.includes('leftTroopRailNoVisibleEmptySlotFrame!=true'), 'runner must fail visible empty slot frame.')
assert.ok(visualSmoke.includes('leftTroopRailJumpVisibleCopyForbiddenHits not empty'), 'runner must fail raw enum/version visible copy after left rail jump.')
assert.ok(visualSmoke.includes('leftTroopRailJumpVisibleCopyClean!=true'), 'runner must require clean visible copy after left rail jump.')
assert.ok(visualSmoke.includes('leftTroopRailJumpVisibleSlot missing'), 'runner must require at least one visible slot with troopId/tileId/name jump data.')

console.log('[godot_native_shell_left_rail_player_density_contract] all checks passed')
