import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const alliancePanel = readFileSync('godot-client/scripts/ui/alliance_panel.gd', 'utf-8')
const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const smokeRunner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

const actionId = 'world_open_main_city_organization_nation_midgame_luoyang_battle_report_feedback'

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"`),
  'Visual smoke runner must whitelist the D-W4 Luoyang battle-report feedback action.',
)

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"[\\s\\S]*"required_summary_fields"[\\s\\S]*"nationMidgameLuoyangBattleReportFeedbackOk"[\\s\\S]*"sourceLuoyangContestId"[\\s\\S]*"organizationReportId"[\\s\\S]*"usesOrganizationReportSurface"`),
  'D-W4 runner defaults must require report receipt/readback and organization-surface fields.',
)

assert.match(
  main,
  new RegExp(`"${actionId}"[\\s\\S]*_press_mainline_visual_smoke_nation_midgame_luoyang_battle_report_feedback\\(`),
  'Mainline visual smoke must dispatch D-W4 to a dedicated battle-report feedback helper.',
)

assert.match(
  main,
  /func _press_mainline_visual_smoke_nation_midgame_luoyang_battle_report_feedback\(\) -> Dictionary:[\s\S]*_press_mainline_visual_smoke_nation_midgame_luoyang_authority_claim\(\)[\s\S]*recordNationMidgameLuoyangBattleReportFeedback[\s\S]*sourceLuoyangContestId[\s\S]*organizationReportId[\s\S]*reportStatus/,
  'D-W4 must reuse D-W3 authority receipt, issue the backend report action, and read back report fields.',
)

assert.match(
  main,
  /洛阳交锋[\s\S]*组织战报[\s\S]*战况回写[\s\S]*下一步集结/,
  'D-W4 must render short Chinese player-visible battle-report feedback copy.',
)

assert.match(
  main,
  /feedbackVisible[\s\S]*visibleCopyForbiddenHits[\s\S]*playerVisibleEngineeringCopyLeak[\s\S]*nationMidgameBattleReportScope[\s\S]*luoyang_feedback_only_not_full_prefecture_control/,
  'D-W4 summary must prove feedback visibility, visible-copy guard, and narrow feedback scope.',
)

assert.match(
  main,
  /"tier"[\s\S]*"contract"[\s\S]*"read model"[\s\S]*"authority"[\s\S]*"neutral"[\s\S]*"v0"/,
  'D-W4 visible-copy guard must still reject known engineering words.',
)

assert.match(
  alliancePanel,
  /NATION_MIDGAME_LUOYANG_ROUTE_LABEL := "进军洛阳"[\s\S]*NationMidgameLuoyangRouteButton/,
  'D-W4 must keep the real D-W1/D-W2/D-W3 Godot button as the route origin.',
)

console.log('[godot_nation_midgame_luoyang_battle_report_feedback_fixture_contract] all checks passed')
