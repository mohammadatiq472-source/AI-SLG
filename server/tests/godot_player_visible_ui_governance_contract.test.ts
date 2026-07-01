import assert from 'node:assert'
import { readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

const main = readUtf8('godot-client/scripts/app/main.gd')
const alliancePanel = readUtf8('godot-client/scripts/ui/alliance_panel.gd')
const nationCopyContract = readUtf8('server/tests/godot_nation_midgame_player_ui_copy_contract.test.ts')

const governanceContract = 'player_visible_ui_governance_v1'
const forbiddenTerms = [
  'region_control',
  'state_capital',
  'luoyang_control',
  'empire_status',
  'east_han_unification',
  'read model',
  'authority',
  'tier',
  'contract id',
]

assert.ok(
  main.includes(`PLAYER_VISIBLE_UI_GOVERNANCE_CONTRACT := "${governanceContract}"`),
  'main.gd must declare a reusable player-visible UI governance contract.',
)

assert.ok(
  main.includes('func _mainline_visual_smoke_player_visible_forbidden_terms('),
  'main.gd must expose a reusable forbidden-copy term list for player-visible UI checks.',
)

assert.ok(
  main.includes('func _build_mainline_visual_smoke_player_visible_ui_governance_result('),
  'main.gd must expose a reusable governance result helper instead of page-local boolean chains.',
)

for (const term of forbiddenTerms) {
  assert.ok(main.includes(`"${term}"`), `shared governance terms must include ${term}.`)
}

for (const requiredSummaryField of [
  'organizationNationMidgamePlayerUiGovernanceContractId',
  'organizationNationMidgamePlayerUiGovernanceVerified',
  'organizationNationMidgameVisiblePrimaryCardCount',
  'organizationNationMidgameVisiblePrimaryCardLimit',
  'organizationNationMidgameVisibleDensityOk',
]) {
  assert.ok(
    main.includes(requiredSummaryField) || alliancePanel.includes(requiredSummaryField),
    `W15.1 smoke summary must expose ${requiredSummaryField}.`,
  )
}

assert.ok(
  main.includes('var player_ui_governance := _build_mainline_visual_smoke_player_visible_ui_governance_result('),
  'W15.1 formal click action must use the reusable governance helper.',
)

assert.ok(
  nationCopyContract.includes('godot_player_visible_ui_governance_contract.test.ts') ||
    nationCopyContract.includes('organizationNationMidgamePlayerUiGovernanceVerified'),
  'W15.1 page-specific copy contract must be linked to the reusable governance gate.',
)

console.log('[godot_player_visible_ui_governance_contract] all checks passed')
