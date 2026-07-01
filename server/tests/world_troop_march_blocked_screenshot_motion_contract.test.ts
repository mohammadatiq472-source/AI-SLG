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

const action = 'world_click_main_city_node_troop_blocked_screenshot_fixture'
const playerFeedback = '行军受阻'
const recoveryFeedback = '重试行军 / 改走别线'

const packageJson = read('package.json')
const runner = read('godot-client/tools/run_mainline_visual_smoke.py')
const main = read('godot-client/scripts/app/main.gd')
const unitViewLayer = read('godot-client/scripts/map/unit_view_layer.gd')
const motionAuthority = read('docs/PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md')
const frontendAuthority = read('docs/PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md')
const productIndex = read('docs/PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md')
const currentHandoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')

const clickActionSource = functionSource(main, 'func _run_mainline_visual_smoke_click_action(click_action: String, panel_id: String) -> Dictionary:')
const blockedFixtureSource = functionSource(main, 'func _press_mainline_visual_smoke_main_city_troop_blocked_screenshot_fixture() -> Dictionary:')
const sequenceSource = functionSource(main, 'func _capture_mainline_visual_smoke_sequence(frame_count: int, interval_sec: float) -> Dictionary:')
const labelSource = functionSource(unitViewLayer, 'func _resolve_unit_label_text(unit: Dictionary, compact: bool = false) -> String:')
const summarySource = functionSource(unitViewLayer, 'func get_visual_acceptance_summary() -> Dictionary:')

assert.ok(
  packageJson.includes('"test:world:troop-march-blocked-screenshot-motion-contract": "tsx server/tests/world_troop_march_blocked_screenshot_motion_contract.test.ts"'),
  'package.json must expose Stage 598 blocked screenshot motion contract as a formal entry.',
)

assert.ok(
  runner.includes(`"${action}"`) &&
    runner.includes(`sequence_requires_map_unit_artifacts = args.click_action in {`) &&
    runner.includes(`"${action}",`),
  'visual smoke runner must accept the blocked screenshot fixture and keep movement artifacts for it.',
)

assert.ok(
  clickActionSource.includes(`"${action}":`) &&
    clickActionSource.includes('return await _press_mainline_visual_smoke_main_city_troop_blocked_screenshot_fixture()'),
  'main.gd must route the blocked screenshot fixture through a real click action.',
)

assert.ok(
  blockedFixtureSource.includes('_press_mainline_visual_smoke_main_city_troop_submit_march_map_unit()') &&
    blockedFixtureSource.includes('march_result["worldTroopMarchBlockedMotion"] = true') &&
    blockedFixtureSource.includes(`march_result["worldTroopMarchBlockedFeedback"] = "${playerFeedback}"`) &&
    blockedFixtureSource.includes('worldTroopMarchFeedbackChainToken') &&
    blockedFixtureSource.includes('worldTroopMarchFeedbackChainPartial') &&
    blockedFixtureSource.includes('worldTroopMarchFeedbackChainVisibleReason') &&
    blockedFixtureSource.includes('march_result["worldTroopMarchBlockedScreenshotAccepted"] = blocked_screenshot_accepted') &&
    blockedFixtureSource.includes('march_result["worldTroopMarchBlockedVisibleFeedback"] = blocked_visible_feedback'),
  'blocked screenshot fixture must reuse the troop-submit march path and require blocked feedback in the player-facing summary.',
)

assert.ok(
  unitViewLayer.includes(`const WORLD_TROOP_MARCH_BLOCKED_RECOVERY_VISIBLE_LABEL := "${playerFeedback}\\n${recoveryFeedback}"`) &&
    labelSource.includes('return WORLD_TROOP_MARCH_BLOCKED_RECOVERY_VISIBLE_LABEL') &&
    summarySource.includes('"worldTroopMarchBlockedVisibleFeedback"') &&
    summarySource.includes('"worldTroopMarchBlockedRecoveryVisibleFeedback"') &&
    summarySource.includes('"worldTroopMarchFeedbackChainToken"') &&
    summarySource.includes('"worldTroopMarchFeedbackChainPartial"') &&
    summarySource.includes('"worldTroopMarchFeedbackChainState"') &&
    summarySource.includes('"worldTroopMarchFeedbackChainVisibleReason"') &&
    summarySource.includes('"worldTroopMarchFeedbackChainNextActionHint"') &&
    summarySource.includes('"worldTroopMarchFeedbackChainVisibleBudgetGuard"') &&
    summarySource.includes('"worldTroopMarchFeedbackChainVisibleBudgetLines"') &&
    summarySource.includes('label_text_values.has(WORLD_TROOP_MARCH_BLOCKED_RECOVERY_VISIBLE_LABEL)'),
  'UnitViewLayer must surface blocked recovery feedback as player-visible Chinese label text and report it in visual acceptance summary.',
)

assert.ok(
  sequenceSource.includes('"mapUnitVisual": map_unit_visual_summary') &&
    sequenceSource.includes('"worldTroopMarchBlockedVisibleFeedback"') &&
    sequenceSource.includes('"worldTroopMarchFeedbackChainToken"'),
  'sequence frames must retain the blocked visible feedback field for screenshot-backed evidence.',
)

for (const doc of [motionAuthority, frontendAuthority, productIndex, currentHandoff]) {
  assert.ok(doc.includes('Stage 598'), 'Stage 598 must be recorded in current authority/handoff docs.')
  assert.ok(doc.includes(action), 'Stage 598 docs must record the formal screenshot action.')
  assert.ok(doc.includes('worldTroopMarchBlockedScreenshotAccepted'), 'Stage 598 docs must record screenshot-backed blocked acceptance field.')
}

console.log('[world_troop_march_blocked_screenshot_motion_contract] all checks passed')
