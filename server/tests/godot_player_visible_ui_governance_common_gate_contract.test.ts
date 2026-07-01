import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const governanceContract = readFileSync('server/tests/godot_player_visible_ui_governance_contract.test.ts', 'utf-8')
const nationCopyContract = readFileSync('server/tests/godot_nation_midgame_player_ui_copy_contract.test.ts', 'utf-8')

assert.match(
  main,
  /const PLAYER_VISIBLE_UI_GOVERNANCE_CONTRACT := "player_visible_ui_governance_v1"/,
  'Common visible-copy/density gate must have a stable contract id.',
)

assert.match(
  main,
  /func _mainline_visual_smoke_player_visible_forbidden_terms\(extra_terms: Array = \[\]\) -> Array:/,
  'Common gate must centralize forbidden visible-copy terms.',
)

assert.match(
  main,
  /func _build_mainline_visual_smoke_player_visible_ui_governance_result\(spec: Dictionary\) -> Dictionary:/,
  'Common gate must build reusable governance results from a page spec.',
)

for (const requiredField of [
  'copyContractOk',
  'forbiddenVisibleCopyClear',
  'visiblePrimaryCardCount',
  'visiblePrimaryCardLimit',
  'visibleDensityOk',
  'primaryGoalTextShortChinese',
]) {
  assert.ok(main.includes(requiredField), `Common gate must expose ${requiredField}.`)
}

assert.ok(
  governanceContract.includes('organizationNationMidgamePlayerUiGovernanceVerified') &&
    nationCopyContract.includes('organizationNationMidgamePlayerUiGovernanceVerified'),
  'Page-specific copy contracts must route through the common governance gate.',
)

assert.match(
  main,
  /"runtimeRequirementOk": runtime_requirement_ok/,
  'Formal visual smoke reports must expose runtimeRequirementOk separately for screenshot-backed fixture pages.',
)

console.log('[godot_player_visible_ui_governance_common_gate_contract] all checks passed')
