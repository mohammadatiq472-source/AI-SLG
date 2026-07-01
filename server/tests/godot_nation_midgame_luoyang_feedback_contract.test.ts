import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const alliancePanel = readFileSync('godot-client/scripts/ui/alliance_panel.gd', 'utf-8')
const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const smokeRunner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

const actionId = 'world_open_main_city_organization_nation_midgame_luoyang_feedback'

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"`),
  'Visual smoke runner must whitelist the D-W2 nation-midgame Luoyang feedback action.',
)

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"[\\s\\S]*"required_summary_fields"[\\s\\S]*"nationMidgameLuoyangFeedbackOk"[\\s\\S]*"feedbackVisibleCopy"[\\s\\S]*"feedbackVisibleCopyForbiddenHits"`),
  'D-W2 runner defaults must require feedback summary and visible-copy guard fields.',
)

assert.match(
  main,
  new RegExp(`"${actionId}"[\\s\\S]*_press_mainline_visual_smoke_nation_midgame_luoyang_feedback\\(`),
  'Mainline visual smoke must dispatch the D-W2 click action to a dedicated feedback helper.',
)

assert.match(
  main,
  /func _press_mainline_visual_smoke_nation_midgame_luoyang_feedback\(\) -> Dictionary:[\s\S]*_press_mainline_visual_smoke_nation_midgame_luoyang_route\(\)[\s\S]*sourcePageId[\s\S]*nation\/midgame[\s\S]*clickedButtonLabel[\s\S]*进军洛阳[\s\S]*targetLabel[\s\S]*洛阳/,
  'D-W2 must start from the existing nation/midgame Luoyang route and keep D-W1 source/button/target facts.',
)

assert.match(
  main,
  /军令已下[\s\S]*东都要冲[\s\S]*州府争夺[\s\S]*战况回报/,
  'D-W2 must render short Chinese player feedback after the Luoyang target focus.',
)

assert.match(
  main,
  /feedbackVisibleCopyForbiddenHits[\s\S]*playerVisibleEngineeringCopyLeak[\s\S]*nationMidgameFeedbackScope[\s\S]*luoyang_prefecture_feedback_only_not_full_unification/,
  'D-W2 summary must guard visible engineering copy and avoid claiming full unification.',
)

assert.match(
  main,
  /"tier"[\s\S]*"contract"[\s\S]*"read model"[\s\S]*"authority"[\s\S]*"neutral"[\s\S]*"v0"/,
  'D-W2 visible-copy guard must reject the known engineering words.',
)

assert.match(
  alliancePanel,
  /NATION_MIDGAME_LUOYANG_ROUTE_LABEL := "进军洛阳"[\s\S]*NationMidgameLuoyangRouteButton/,
  'D-W2 must keep the real D-W1 Godot Button and player label as the route origin.',
)

assert.match(
  alliancePanel,
  /page_action_requested\.emit\("nation\/midgame", "open_tianxia_luoyang_target"\)/,
  'The route origin must keep a real page action from nation/midgame.',
)

console.log('[godot_nation_midgame_luoyang_feedback_contract] all checks passed')
