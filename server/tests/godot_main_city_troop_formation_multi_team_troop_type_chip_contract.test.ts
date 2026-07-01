import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

const visualSmokeRunner = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
const closureBatchRunner = readUtf8('godot-client/tools/run_mainline_ui_closure_batch.py')

const multiTeamChipActions = [
  'world_click_main_city_node_troop_assign_preview_open_first_team',
  'world_click_main_city_node_troop_assign_preview_open_first_team_button_identity',
  'world_click_main_city_node_troop_assign_preview_open_second_team_button_identity',
  'world_click_main_city_node_troop_assign_preview_open_ai_fallback_team',
  'world_click_main_city_node_troop_assign_preview_open_ai_named_team',
  'world_click_main_city_node_troop_assign_preview_open_ai_multi_team_second',
]

for (const action of multiTeamChipActions) {
  assert.ok(
    visualSmokeRunner.includes(`"${action}"`),
    `formal visual smoke must register ${action}`,
  )
}

assert.ok(
  visualSmokeRunner.includes('MAIN_CITY_TROOP_FORMATION_TROOP_TYPE_CHIP_ACTIONS') &&
    visualSmokeRunner.includes('if click_action not in MAIN_CITY_TROOP_FORMATION_TROOP_TYPE_CHIP_ACTIONS:'),
  'formal visual smoke must validate troop-type chips through a reusable multi-team action set.',
)

const visualSmokeChipActionSet = visualSmokeRunner.slice(
  visualSmokeRunner.indexOf('MAIN_CITY_TROOP_FORMATION_TROOP_TYPE_CHIP_ACTIONS'),
  visualSmokeRunner.indexOf('RECRUIT_DRAW_CLICK_ACTIONS'),
)

for (const action of multiTeamChipActions.slice(1)) {
  assert.ok(
    visualSmokeChipActionSet.includes(`"${action}"`),
    `formal visual smoke chip validation set must include ${action}`,
  )
}

assert.ok(
  closureBatchRunner.includes('MAIN_CITY_TROOP_FORMATION_TROOP_TYPE_CHIP_ACTIONS') &&
    closureBatchRunner.includes('world_click_main_city_node_troop_assign_preview_open_second_team_button_identity') &&
    closureBatchRunner.includes('world_click_main_city_node_troop_assign_preview_open_ai_fallback_team') &&
    closureBatchRunner.includes('world_click_main_city_node_troop_assign_preview_open_ai_multi_team_second'),
  'closure batch must validate troop-type chips beyond first-team only.',
)

console.log('[godot_main_city_troop_formation_multi_team_troop_type_chip_contract] all checks passed')
