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
const recruitPanel = read('godot-client/scripts/ui/recruit_panel.gd')
const hubOverlay = read('godot-client/scripts/ui/main_city_hub_overlay.gd')

assert.ok(
  packageJson.includes('"test:godot:stage-a-shared-motion-feedback-chain-contract"'),
  'package.json must expose the Stage A shared motion feedback-chain contract entry',
)

for (const docFact of [
  'Stage 615 - Stage A shared motion feedback-chain packet',
  'stage_a_shared_motion_feedback_chain_v1',
  'game event -> presentation event -> timeline -> visual/audio/haptic/UI step',
  'recruit_draw_preview|main_city_world_enter',
]) {
  assert.ok(
    currentHandoff.includes(docFact) || motionAuthority.includes(docFact) || frontendAuthority.includes(docFact),
    `Stage A docs should record ${docFact}`,
  )
}

for (const factoryFact of [
  'const STAGE_A_SHARED_MOTION_FEEDBACK_CHAIN_TOKEN := "stage_a_shared_motion_feedback_chain_v1"',
  'const STAGE_A_SHARED_MOTION_PACKET_SCHEMA := "game_event|presentation_event|timeline|visual_step|audio_step|haptic_step|ui_step|controls_preserved|proof_level"',
  'static func apply_stage_a_shared_motion_feedback_chain_summary(summary: Dictionary, owner: String, trigger: String, proof_level: String = "code_chain") -> void:',
]) {
  assert.ok(componentFactory.includes(factoryFact), `SlgUiComponentFactory should retain ${factoryFact}`)
}

const factorySummary = functionSource(
  componentFactory,
  'static func apply_stage_a_shared_motion_feedback_chain_summary(summary: Dictionary, owner: String, trigger: String, proof_level: String = "code_chain") -> void:',
)
for (const summaryFact of [
  '"stageASharedMotionFeedbackChainToken"',
  '"stageASharedMotionPacketSchema"',
  '"stageASharedMotionOwner"',
  '"stageASharedMotionTrigger"',
  '"stageASharedMotionTimeline"',
  '"stageASharedMotionVisualStep"',
  '"stageASharedMotionAudioStep"',
  '"stageASharedMotionHapticStep"',
  '"stageASharedMotionUiStep"',
  '"stageASharedMotionControlsPreserved"',
  '"stageASharedMotionProofLevel"',
  '"stageASharedMotionGameplayAuthorityChanged"',
]) {
  assert.ok(factorySummary.includes(summaryFact), `shared Stage A summary should include ${summaryFact}`)
}

assert.ok(
  factorySummary.includes('"none_reserved"') &&
    factorySummary.includes('"none_reserved_mobile"') &&
    factorySummary.includes('"real_buttons_preserved"') &&
    factorySummary.includes('false'),
  'shared Stage A packet must reserve audio/haptic, preserve controls, and avoid gameplay authority mutation',
)

const recruitSummary = functionSource(recruitPanel, 'func get_mainline_visual_smoke_summary(page_id: String = "") -> Dictionary:')
assert.ok(
  recruitSummary.includes('UI_COMPONENT_FACTORY.apply_stage_a_shared_motion_feedback_chain_summary(summary, "recruit_formal_pack_renderer", "recruit_draw_preview"') &&
    recruitSummary.includes('"stageASharedMotionTrigger"'),
  'recruit visual-smoke summary must attach the shared Stage A feedback-chain packet',
)

const mainCitySummary = functionSource(hubOverlay, 'func get_context_summary() -> Dictionary:')
assert.ok(
  mainCitySummary.includes('UI_COMPONENT_FACTORY.apply_stage_a_shared_motion_feedback_chain_summary(summary, "MainCityHubOverlay", "main_city_world_enter"') &&
    mainCitySummary.includes('"stageASharedMotionTrigger"'),
  'main-city hub summary must attach the shared Stage A feedback-chain packet',
)

for (const forbiddenVisibleCopy of ['stage_a_shared_motion_feedback_chain_v1', 'game_event', 'presentation_event']) {
  assert.equal(
    recruitSummary.includes(`text = "${forbiddenVisibleCopy}"`) || mainCitySummary.includes(`text = "${forbiddenVisibleCopy}"`),
    false,
    `shared packet token/schema must stay in summary metadata, not visible player copy: ${forbiddenVisibleCopy}`,
  )
}

console.log('[godot_stage_a_shared_motion_feedback_chain_contract] all checks passed')
