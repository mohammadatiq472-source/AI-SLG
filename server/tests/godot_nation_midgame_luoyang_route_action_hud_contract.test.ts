import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const smokeRunner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

const actionId = 'world_open_main_city_organization_nation_midgame_luoyang_route'

for (const requiredToken of [
  'NATION_MIDGAME_LUOYANG_ROUTE_ACTION_HUD_VARIANT := "luoyang_route_target"',
  'NationMidgameLuoyangRouteActionHudSurface',
  '_show_nation_midgame_luoyang_route_action_hud',
  'routeTargetSource", "")).strip_edges() == "nation_midgame_luoyang_route"',
]) {
  assert.ok(main.includes(requiredToken), `D-W8A Luoyang route Action HUD must expose ${requiredToken}.`)
}

for (const requiredSummaryField of [
  'nationMidgameLuoyangRouteActionHudSkinFamily',
  'nationMidgameLuoyangRouteActionHudVariant',
  'nationMidgameLuoyangRouteActionHudUnifiedFamilyOk',
  'nationMidgameLuoyangRouteLegacyActionPanelHidden',
  'nationMidgameLuoyangRouteVisibleCopyLabels',
  'nationMidgameLuoyangRouteVisibleActionLabels',
  'visibleCopyForbiddenHits',
]) {
  assert.ok(main.includes(requiredSummaryField), `main.gd must report D-W8A route Action HUD field: ${requiredSummaryField}`)
  assert.ok(smokeRunner.includes(requiredSummaryField), `visual-smoke runner must require D-W8A route Action HUD field: ${requiredSummaryField}`)
}

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"[\\s\\S]*"required_summary_fields"[\\s\\S]*"nationMidgameLuoyangRouteActionHudSkinFamily"[\\s\\S]*"nationMidgameLuoyangRouteLegacyActionPanelHidden"`),
  'D-W1 route smoke must require the route Action HUD parity summary fields.',
)

assert.match(
  main,
  /BaseActionHudSkin[\s\S]*luoyang_route_target[\s\S]*国家中局[\s\S]*洛阳目标[\s\S]*东都要冲[\s\S]*争夺目标/,
  'D-W8A must render short Chinese Luoyang route copy using the shared Action HUD family.',
)

assert.ok(!main.includes('"占领", "放弃", "标战线"'), 'D-W8A route Action HUD must not reuse legacy map-cell action labels.')

console.log('[godot_nation_midgame_luoyang_route_action_hud_contract] all checks passed')
