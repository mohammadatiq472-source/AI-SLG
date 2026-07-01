import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

const motionAuthority = read('docs/PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md')
const mapAuthority = read('docs/PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md')
const mapGrid = read('godot-client/scripts/map/map_grid.gd')
const mainGd = read('godot-client/scripts/app/main.gd')

assert.ok(
  motionAuthority.includes('### `world_map_focus_motion_contract` Acceptance Sublanes'),
  'motion authority must define world_map_focus_motion acceptance sublanes',
)

for (const requiredState of [
  '`selected`',
  '`focused`',
  '`target_ping`',
  '`nearby`',
  '`out_of_range`',
  '`jump_target`',
  '`cancelled`',
]) {
  assert.ok(motionAuthority.includes(`| ${requiredState} |`), `world map focus contract must cover ${requiredState}`)
}

for (const requiredToken of [
  'worldMapFocusMotionToken=world_map_focus_motion_v1',
  'worldMapFocusSelected=true',
  'worldMapFocusCameraSettle=true',
  'worldMapFocusTargetPing=true',
  'worldMapFocusNearbyCue=true',
  'worldMapFocusOutOfRangeFeedback=true',
  'worldMapFocusJumpTargetSettle=true',
  'worldMapFocusCancelled=true',
]) {
  assert.ok(motionAuthority.includes(requiredToken), `world map focus contract must require ${requiredToken}`)
}

for (const sublane of [
  'tianxia_explicit_jump_focus_motion',
  'coordinate_jump_focus_motion',
  'chokepoint_mountain_focus_motion',
  'history_task_replay_focus_motion',
]) {
  assert.ok(motionAuthority.includes(`| \`${sublane}\` |`), `world map focus contract must define ${sublane}`)
}

for (const forbidden of [
  'Debug grid',
  'coordinate text',
  'Instant coordinate snap',
  'Static screenshot with no target cue evidence',
  'Full raw path list',
  'Silent no-op',
  'Losing current shell context',
  'Closing with no feedback',
]) {
  assert.ok(motionAuthority.includes(forbidden), `world map focus contract must reject ${forbidden}`)
}

for (const codeFact of [
  'func _focus_main_map_cell(',
  'func focus_and_select_main_map_tmx_for_action(',
  'func focus_and_select_main_map_cell_for_action(',
  'get_selected_main_map_cell_action_context',
]) {
  assert.ok(mapGrid.includes(codeFact), `map_grid.gd should expose reusable focus fact: ${codeFact}`)
}

for (const mainFact of [
  'func _press_mainline_visual_smoke_tianxia_yutu_explicit_jump(',
  'func _press_mainline_visual_smoke_tianxia_yutu_state_region_drilldown_jump(',
  'func _focus_mainline_visual_smoke_chokepoint_target(',
  'func _press_mainline_visual_smoke_main_city_hub_jump_coordinate(',
  'func _press_mainline_visual_smoke_overlay_coordinate_jump(',
  '_read_tianxia_yutu_explicit_jump_summary()',
  '"focusOk"',
  '"refreshOk"',
  '"selectedCell"',
  '"viewMode"',
  '"mainMapCellActionPanelVisible"',
  '"actionPanelVisibleClaimed"',
]) {
  assert.ok(mainGd.includes(mainFact), `main.gd should expose reusable focus/jump fact: ${mainFact}`)
}

assert.ok(
  mapAuthority.includes('Tianxia Yutu') &&
    mapAuthority.includes('Do not compare Tianxia Yutu and main-world payloads as if they were identical map layers.'),
  'map authority must preserve Tianxia/main-world boundary for focus motion',
)

assert.ok(
  motionAuthority.includes('Current scan did not find runtime summary fields for `worldMapFocusMotionToken`') &&
    motionAuthority.includes('They must be extended with `world_map_focus_motion_v1` summary fields before they can prove this packet.'),
  'world map focus gate must keep current reusable code facts separate from visual acceptance completion',
)

console.log('[world_map_focus_motion_contract] all checks passed')
