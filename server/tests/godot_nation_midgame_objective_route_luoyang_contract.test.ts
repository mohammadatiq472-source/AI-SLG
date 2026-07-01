import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const alliancePanel = readFileSync('godot-client/scripts/ui/alliance_panel.gd', 'utf-8')
const alliancePresenter = readFileSync('godot-client/scripts/ui/presenters/alliance_presenter.gd', 'utf-8')
const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const smokeRunner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

const actionId = 'world_open_main_city_organization_nation_midgame_route_luoyang'

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"`),
  'Visual smoke runner must whitelist the nation-midgame Luoyang objective route action.',
)

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"[\\s\\S]*"required_summary_fields"[\\s\\S]*"nationMidgameObjectiveRouteOk"[\\s\\S]*"routeTarget"[\\s\\S]*"realButtonPressed"[\\s\\S]*"nationMidgameObjectiveRouteStyleOwnerPanel"`),
  'Visual smoke runner defaults must require objective-route summary fields.',
)

assert.match(
  smokeRunner,
  /seedNationMidgameFrontendFixture[\s\S]*world_open_main_city_organization_nation_midgame_route_luoyang/,
  'Objective-route smoke must reuse the existing nation-midgame frontend fixture seed.',
)

assert.match(
  main,
  new RegExp(`"${actionId}"[\\s\\S]*_press_mainline_visual_smoke_nation_midgame_objective_route_luoyang\\(`),
  'Mainline visual smoke must dispatch the objective-route click action to a dedicated helper.',
)

assert.match(
  main,
  /func _press_mainline_visual_smoke_nation_midgame_objective_route_luoyang\(\) -> Dictionary:[\s\S]*nationMidgameObjectiveRouteOk[\s\S]*routeTarget[\s\S]*realButtonPressed[\s\S]*AlliancePanel[\s\S]*AlliancePresenter/,
  'Objective-route helper must expose the dedicated route summary and style owners.',
)

assert.match(
  main,
  /clicked_label == "进军洛阳"[\s\S]*target_label == "洛阳"[\s\S]*route_target == "天下舆图"/,
  'Objective-route helper must prove the nation/midgame button routes to Luoyang through Tianxia Yutu.',
)

assert.match(
  main,
  /visibleCopyForbiddenHits[\s\S]*playerVisibleEngineeringCopyLeak[\s\S]*nationMidgameObjectiveRouteScope[\s\S]*luoyang_objective_route_only_not_full_midgame_completion/,
  'Objective-route summary must guard visible copy and avoid claiming full midgame completion.',
)

assert.match(
  alliancePresenter,
  /"objective_route_cta": _build_nation_midgame_objective_route_cta\(objective_rows\)/,
  'AlliancePresenter must produce a dedicated nation-midgame objective CTA payload.',
)

assert.match(
  alliancePresenter,
  /func _build_nation_midgame_objective_route_cta\(objective_rows: Array\) -> Dictionary:[\s\S]*"headline": "洛阳目标"[\s\S]*"button_label": "进军洛阳"[\s\S]*"target_surface": "天下舆图"/,
  'AlliancePresenter must translate the route target into short Chinese CTA copy.',
)

assert.match(
  alliancePanel,
  /func _build_nation_midgame_luoyang_route_button\(\) -> Button:[\s\S]*objective_route_cta[\s\S]*button\.name = button_node_name[\s\S]*button\.text = visible_label[\s\S]*route_target_surface/,
  'AlliancePanel must render the CTA payload through a real Godot Button owned by AlliancePanel.',
)

assert.match(
  alliancePanel,
  /nationMidgameObjectiveRouteHeadline[\s\S]*nationMidgameObjectiveRouteTargetSurface[\s\S]*nationMidgameObjectiveRouteStyleOwnerPanel/,
  'AlliancePanel summary must expose objective-route style-owner metadata.',
)

assert.match(
  alliancePanel,
  /page_action_requested\.emit\("nation\/midgame", "open_tianxia_luoyang_target"\)/,
  'Objective-route button must still emit the real nation/midgame page action.',
)

console.log('[godot_nation_midgame_objective_route_luoyang_contract] all checks passed')
