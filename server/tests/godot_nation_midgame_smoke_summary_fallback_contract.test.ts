import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')

assert.match(
  main,
  /func _read_mainline_visual_smoke_nation_midgame_summary_read_model_ok\(/,
  'Nation midgame smoke must expose a helper that can verify read-model evidence from page summary when API data is empty.',
)

assert.match(
  main,
  /organizationNationMidgameFrontendContractId[\s\S]*nation_midgame_frontend_skeleton_v1/,
  'Nation midgame smoke summary fallback must verify the skeleton contract id from page summary.',
)

assert.match(
  main,
  /organizationNationMidgameObjectiveRowCount[\s\S]*>= 5/,
  'Nation midgame smoke summary fallback must keep the five objective row requirement.',
)

assert.match(
  main,
  /organizationNationMidgameEmpireInfoVisible[\s\S]*objective_row_count >= 5/,
  'Nation midgame empire visibility must fall back to current Chinese objective rows instead of requiring engineering copy in the UI.',
)

assert.match(
  main,
  /runtime_requirement_ok[\s\S]*is_main_city_overlay_click_action[\s\S]*click_action_result\.get\("ok"/,
  'Main-city overlay smoke reports must allow a successful click action and screenshot to satisfy runtimeRequirementOk while preserving runtimeReady diagnostics.',
)

assert.match(
  main,
  /"runtimeRequirementOk": runtime_requirement_ok/,
  'Visual smoke report must expose runtimeRequirementOk separately from runtimeReady.',
)

console.log('[godot_nation_midgame_smoke_summary_fallback_contract] all checks passed')
