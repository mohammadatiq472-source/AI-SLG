import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const nextFunc = source.indexOf('\nfunc ', start + signature.length)
  const nextStaticFunc = source.indexOf('\nstatic func ', start + signature.length)
  const candidates = [nextFunc, nextStaticFunc].filter((index) => index > start)
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length
  return source.slice(start, end)
}

const packageJson = read('package.json')
const currentHandoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
const motionAuthority = read('docs/PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md')
const frontendAuthority = read('docs/PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md')
const componentFactory = read('godot-client/scripts/ui/slg_ui_component_factory.gd')
const unitViewLayer = read('godot-client/scripts/map/unit_view_layer.gd')
const main = read('godot-client/scripts/app/main.gd')

const summarySource = functionSource(unitViewLayer, 'func get_visual_acceptance_summary() -> Dictionary:')
const resultBuilderSource = functionSource(
  unitViewLayer,
  'func _build_world_troop_march_result_motion_summary(',
)
const compactMapUnitSummary = functionSource(
  main,
  'func _compact_mainline_visual_smoke_map_unit_summary(summary: Dictionary) -> Dictionary:',
)

assert.ok(
  packageJson.includes('"test:world:troop-march-shared-motion-feedback-chain-contract"'),
  'package.json must expose the Stage B troop-march shared motion feedback-chain contract entry',
)

for (const docFact of [
  'Stage 616 - Stage B troop march shared motion feedback-chain packet',
  'stage_a_shared_motion_feedback_chain_v1',
  'world_troop_march_result',
  'UnitViewLayer',
]) {
  assert.ok(
    currentHandoff.includes(docFact) || motionAuthority.includes(docFact) || frontendAuthority.includes(docFact),
    `Stage B docs should record ${docFact}`,
  )
}

assert.ok(
  componentFactory.includes('static func apply_stage_a_shared_motion_feedback_chain_summary(summary: Dictionary, owner: String, trigger: String, proof_level: String = "code_chain") -> void:'),
  'Stage B must reuse the shared factory packet helper instead of inventing a UnitViewLayer-only schema',
)

assert.ok(
  unitViewLayer.includes('const SlgUiComponentFactoryScript = preload("res://scripts/ui/slg_ui_component_factory.gd")'),
  'UnitViewLayer must use SlgUiComponentFactory as the shared motion packet owner',
)

assert.ok(
  summarySource.includes('SlgUiComponentFactoryScript.apply_stage_a_shared_motion_feedback_chain_summary(summary, "UnitViewLayer", "world_troop_march_result"') &&
    summarySource.includes('"stageASharedMotionTrigger"'),
  'UnitViewLayer visual acceptance summary must attach the shared Stage B packet',
)

assert.ok(
  compactMapUnitSummary.includes('"stageASharedMotionFeedbackChainToken": str(summary.get("stageASharedMotionFeedbackChainToken", ""))') &&
    compactMapUnitSummary.includes('"stageASharedMotionOwner": str(summary.get("stageASharedMotionOwner", ""))') &&
    compactMapUnitSummary.includes('"stageASharedMotionTrigger": str(summary.get("stageASharedMotionTrigger", ""))') &&
    compactMapUnitSummary.includes('"stageASharedMotionGameplayAuthorityChanged": bool(summary.get("stageASharedMotionGameplayAuthorityChanged", true))'),
  'main.gd compact map-unit summary must preserve shared Stage B packet fields for runtime visual-smoke evidence',
)

for (const packetField of [
  '"stageASharedMotionFeedbackChainToken"',
  '"stageASharedMotionPacketSchema"',
  '"stageASharedMotionOwner"',
  '"stageASharedMotionTrigger"',
  '"stageASharedMotionTimeline"',
  '"stageASharedMotionVisualStep"',
  '"stageASharedMotionUiStep"',
  '"stageASharedMotionControlsPreserved"',
  '"stageASharedMotionGameplayAuthorityChanged"',
]) {
  assert.ok(componentFactory.includes(packetField), `shared factory packet should preserve ${packetField}`)
}

for (const resultFact of [
  '"feedbackChainToken"',
  '"feedbackChainState"',
  '"feedbackChainVisibleReason"',
  '"feedbackChainNextActionHint"',
  '"feedbackChainVisibleBudgetGuard"',
  '"blockedFeedback": "行军受阻"',
  '"interceptedFeedback": "遭遇拦截"',
  '"retreatingFeedback": "部队撤回中"',
]) {
  assert.ok(resultBuilderSource.includes(resultFact), `existing troop result facts must remain intact: ${resultFact}`)
}

for (const forbiddenVisibleCopy of ['stage_a_shared_motion_feedback_chain_v1', 'game_event', 'presentation_event']) {
  assert.equal(
    unitViewLayer.includes(`.text = "${forbiddenVisibleCopy}"`),
    false,
    `shared packet token/schema must stay in summary metadata, not UnitViewLayer visible copy: ${forbiddenVisibleCopy}`,
  )
}

console.log('[world_troop_march_shared_motion_feedback_chain_contract] all checks passed')
