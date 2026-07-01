import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  if (start < 0) {
    return ''
  }
  const nextFunc = source.indexOf('\nfunc ', start + signature.length)
  const nextStaticFunc = source.indexOf('\nstatic func ', start + signature.length)
  const candidates = [nextFunc, nextStaticFunc].filter((index) => index > start)
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length
  return source.slice(start, end)
}

const action = 'world_click_main_city_node_troop_retreating_screenshot_fixture'
const playerFeedback = '部队撤回中'

const packageJson = read('package.json')
const runner = read('godot-client/tools/run_mainline_visual_smoke.py')
const main = read('godot-client/scripts/app/main.gd')
const unitViewLayer = read('godot-client/scripts/map/unit_view_layer.gd')
const motionAuthority = read('docs/PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md')
const frontendAuthority = read('docs/PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md')
const productIndex = read('docs/PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md')
const currentHandoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')

const clickActionSource = functionSource(main, 'func _run_mainline_visual_smoke_click_action(click_action: String, panel_id: String) -> Dictionary:')
const retreatingFixtureSource = functionSource(main, 'func _press_mainline_visual_smoke_main_city_troop_retreating_screenshot_fixture() -> Dictionary:')
const compactSummarySource = functionSource(main, 'func _compact_mainline_visual_smoke_map_unit_summary(summary: Dictionary) -> Dictionary:')
const labelSource = functionSource(unitViewLayer, 'func _resolve_unit_label_text(unit: Dictionary, compact: bool = false) -> String:')
const summarySource = functionSource(unitViewLayer, 'func get_visual_acceptance_summary() -> Dictionary:')

assert.ok(
  packageJson.includes('"test:world:troop-march-retreating-screenshot-motion-contract": "tsx server/tests/world_troop_march_retreating_screenshot_motion_contract.test.ts"'),
  'package.json must expose Stage 608 retreating screenshot motion contract as a formal entry.',
)

assert.ok(
  runner.includes(`"${action}"`) &&
    runner.includes('sequence_requires_map_unit_artifacts = args.click_action in {') &&
    runner.includes(`"${action}",`),
  'visual smoke runner must accept the retreating screenshot fixture and keep movement artifacts for it.',
)

assert.ok(
  clickActionSource.includes(`"${action}":`) &&
    clickActionSource.includes('return await _press_mainline_visual_smoke_main_city_troop_retreating_screenshot_fixture()'),
  'main.gd must route the retreating screenshot fixture through a real click action.',
)

assert.ok(
  retreatingFixtureSource.includes('_press_mainline_visual_smoke_main_city_troop_submit_march_map_unit()') &&
    retreatingFixtureSource.includes('activate_world_troop_march_retreating_screenshot_fixture') &&
    retreatingFixtureSource.includes('march_result["worldTroopMarchRetreatingMotion"] = true') &&
    retreatingFixtureSource.includes(`march_result["worldTroopMarchRetreatingFeedback"] = "${playerFeedback}"`) &&
    retreatingFixtureSource.includes('march_result["worldTroopMarchRetreatingScreenshotAccepted"] = retreating_screenshot_accepted') &&
    retreatingFixtureSource.includes('march_result["worldTroopMarchRetreatingVisibleFeedback"] = retreating_visible_feedback'),
  'retreating screenshot fixture must reuse the troop-submit march path and require retreating feedback in the player-facing summary.',
)

assert.ok(
  labelSource.includes(`return "${playerFeedback}"`) &&
    summarySource.includes('"worldTroopMarchRetreatingVisibleFeedback"') &&
    summarySource.includes('label_text_values.has("部队撤回中")') &&
    compactSummarySource.includes('"worldTroopMarchRetreatingVisibleFeedback"'),
  'UnitViewLayer and compact summary must surface retreating feedback as player-visible Chinese label text.',
)

for (const doc of [motionAuthority, frontendAuthority, productIndex, currentHandoff]) {
  assert.ok(doc.includes('Stage 608'), 'Stage 608 must be recorded in current authority/handoff docs.')
  assert.ok(doc.includes(action), 'Stage 608 docs must record the formal screenshot action.')
  assert.ok(doc.includes('worldTroopMarchRetreatingScreenshotAccepted'), 'Stage 608 docs must record screenshot-backed retreating acceptance field.')
}

console.log('[world_troop_march_retreating_screenshot_motion_contract] all checks passed')
