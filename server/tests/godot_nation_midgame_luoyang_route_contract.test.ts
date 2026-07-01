import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const alliancePanel = readFileSync('godot-client/scripts/ui/alliance_panel.gd', 'utf-8')
const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const smokeRunner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

const actionId = 'world_open_main_city_organization_nation_midgame_luoyang_route'

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"`),
  'Visual smoke runner must whitelist the nation-midgame Luoyang route action.',
)

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"[\\s\\S]*"required_summary_fields"[\\s\\S]*"nationMidgameLuoyangRouteOk"[\\s\\S]*"targetPanelVisibleCopy"[\\s\\S]*"targetPanelEngineeringCopyLeak"`),
  'Visual smoke runner defaults must require D-W1 route summary fields.',
)

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"[\\s\\S]*seedNationMidgameFrontendFixture`),
  'Nation-midgame Luoyang route smoke must reuse the existing nation midgame fixture seed.',
)

assert.match(
  main,
  new RegExp(`"${actionId}"[\\s\\S]*_press_mainline_visual_smoke_nation_midgame_luoyang_route\\(`),
  'Mainline visual smoke must dispatch the D-W1 click action to a dedicated nation-midgame route helper.',
)

assert.match(
  main,
  /func _press_mainline_visual_smoke_nation_midgame_luoyang_route\(\) -> Dictionary:[\s\S]*sourcePageId[\s\S]*nation\/midgame[\s\S]*targetLabel[\s\S]*洛阳[\s\S]*nationMidgameLuoyangRouteOk/,
  'D-W1 route helper must prove sourcePageId=nation/midgame, targetLabel=洛阳, and nationMidgameLuoyangRouteOk.',
)

assert.match(
  main,
  /playerVisibleEngineeringCopyLeak[\s\S]*nationMidgameRouteScope[\s\S]*luoyang_route_only_not_full_unification/,
  'D-W1 summary must guard visible engineering copy and avoid claiming full unification.',
)

assert.match(
  main,
  /routeTargetLabel[\s\S]*洛阳[\s\S]*routeTargetVisibleCopy[\s\S]*国家中局-洛阳目标[\s\S]*东都要冲 · 争夺目标/,
  'D-W1 route must translate the focused cell into visible Chinese target copy instead of leaving only a generic map-cell label.',
)

assert.match(
  main,
  /targetPanelVisibleCopy[\s\S]*targetPanelEngineeringCopyLeak[\s\S]*playerVisibleEngineeringCopyLeak/,
  'D-W1 route summary must expose and guard the player-visible target panel copy.',
)

const routeTargetBranchStart = main.indexOf('if route_target_label != ""')
assert.notEqual(routeTargetBranchStart, -1, 'D-W1 route-target branch must exist in the main map cell action panel.')
const routeTargetBranchEnd = main.indexOf('\n\t\telse:', routeTargetBranchStart)
assert.notEqual(routeTargetBranchEnd, -1, 'D-W1 route-target branch must have a separate normal map-cell else branch.')
const routeTargetBranch = main.slice(routeTargetBranchStart, routeTargetBranchEnd)

assert.match(
  routeTargetBranch,
  /route_target_visible_copy[\s\S]*_main_map_cell_action_summary_label\.text = route_target_visible_copy/,
  'D-W1 route-target branch must render the translated player-visible route target copy.',
)

for (const forbiddenVisibleCopy of ['owner_id', 'cell_version', 'neutral', 'v0']) {
  assert.ok(
    !routeTargetBranch.includes(forbiddenVisibleCopy),
    `D-W1 route-target branch must not render ${forbiddenVisibleCopy} in player-visible copy.`,
  )
}

assert.match(
  main,
  /else:[\s\S]*_main_map_cell_action_summary_label\.text = "%s \(%d,%d\) · %s%s%s"[\s\S]*_format_main_map_cell_owner_visible_label\(owner_id\)/,
  'Normal map-cell branch must keep its owner label path separate from the D-W1 route-target copy.',
)

assert.match(
  main,
  /"neutral"[\s\S]*"v0"/,
  'D-W1 engineering-copy guard must reject neutral and v0 in visible copy.',
)

assert.match(
  alliancePanel,
  /NationMidgameLuoyangRouteButton/,
  'Nation-midgame page must expose a real Godot Button for the Luoyang route.',
)

assert.match(
  alliancePanel,
  /"进军洛阳"|"看洛阳目标"|"争夺洛阳"/,
  'Nation-midgame Luoyang button must use short Chinese player copy.',
)

assert.match(
  alliancePanel,
  /page_action_requested\.emit\("nation\/midgame", "open_tianxia_luoyang_target"\)/,
  'Nation-midgame Luoyang button must emit a page action from nation/midgame.',
)

console.log('[godot_nation_midgame_luoyang_route_contract] all checks passed')
