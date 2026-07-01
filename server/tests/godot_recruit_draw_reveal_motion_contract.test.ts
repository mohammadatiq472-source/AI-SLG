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
const motionAuthority = read('docs/PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md')
const currentHandoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
const componentFactory = read('godot-client/scripts/ui/slg_ui_component_factory.gd')
const recruitRenderer = read('godot-client/scripts/ui/recruit_components/recruit_formal_pack_renderer.gd')
const recruitPanel = read('godot-client/scripts/ui/recruit_panel.gd')
const recruitPresenter = read('godot-client/scripts/ui/presenters/recruit_presenter.gd')

assert.ok(
  packageJson.includes('"test:godot:recruit-draw-reveal-motion-contract"'),
  'package.json must expose the recruit draw reveal motion contract entry',
)

assert.ok(
  motionAuthority.includes('## 2026-06-13 Recruit Draw Reveal Motion Static Contract') &&
    motionAuthority.includes('recruit_draw_reveal_motion_static_contract'),
  'motion authority must record the recruit draw reveal motion static contract',
)

for (const requiredAuthorityFact of [
  'recruitMotionPackToken=recruit_pack_enter_v1',
  'recruitMotionHeroCardToken=recruit_hero_card_enter_v1',
  'recruitMotionMethod=staggered_alpha_drop_lift_scale',
  'recruitMotionFutureImpact=ui_visual_only_no_authority_or_draw_result_change',
  'preview_only',
  'summary token without current screenshot is `code_chain`, not `player_ui_accepted`',
]) {
  assert.ok(motionAuthority.includes(requiredAuthorityFact), `motion authority should include ${requiredAuthorityFact}`)
}

assert.ok(
  currentHandoff.includes('Stage 578 - recruit draw reveal motion static contract') &&
    currentHandoff.includes('npm.cmd run test:godot:recruit-draw-reveal-motion-contract'),
  'CURRENT handoff must record Stage 578 recruit draw reveal motion static gate',
)

for (const factoryFact of [
  'const MOTION_RECRUIT_PACK_ENTER_TOKEN := "recruit_pack_enter_v1"',
  'const MOTION_RECRUIT_HERO_CARD_ENTER_TOKEN := "recruit_hero_card_enter_v1"',
  'static func apply_motion_recruit_pack_enter(target: Control, index: int) -> void:',
  'static func apply_motion_recruit_hero_card_enter(target: Control, index: int) -> void:',
  'static func apply_recruit_motion_summary(summary: Dictionary) -> void:',
]) {
  assert.ok(componentFactory.includes(factoryFact), `SlgUiComponentFactory should retain ${factoryFact}`)
}

const recruitMotionSummary = functionSource(
  componentFactory,
  'static func apply_recruit_motion_summary(summary: Dictionary) -> void:',
)
for (const summaryFact of [
  '"recruitMotionSystemToken"',
  '"recruitMotionScope"',
  '"recruitMotionPackToken"',
  '"recruitMotionHeroCardToken"',
  '"recruitMotionMethod"',
  '"recruitMotionPackEnterDurationMs"',
  '"recruitMotionFutureImpact"',
  '"recruitMotionFeedbackChainToken"',
  '"recruitMotionClickFeedbackToken"',
  '"recruitMotionResourcePromptToken"',
  '"recruitMotionPackFrameToken"',
  '"recruitMotionRevealToken"',
  '"recruitMotionQualitySweepToken"',
  '"recruitMotionContinueControlToken"',
  '"recruitMotionPseudoLiveStyle"',
]) {
  assert.ok(recruitMotionSummary.includes(summaryFact), `recruit motion summary should include ${summaryFact}`)
}

assert.ok(
  recruitRenderer.includes('recruit_draw_click_feedback_token') &&
    recruitRenderer.includes('recruit_draw_resource_prompt_token') &&
    recruitRenderer.includes('recruit_draw_pack_frame_token') &&
    recruitRenderer.includes('recruit_draw_reveal_token') &&
    recruitRenderer.includes('recruit_draw_quality_sweep_token') &&
    recruitRenderer.includes('recruit_draw_continue_confirm_control_token'),
  'draw reveal renderer should use shared chain token metadata instead of scattering page-local animation logic',
)

const drawDisplayPanel = functionSource(
  recruitRenderer,
  'static func _build_draw_result_display_panel(section: Dictionary, shared_state: Dictionary, action_callback: Callable, node_name: String, expected_count: int, card_width: float, card_height: float, repeat_label: String, action_id: String, row_name: String) -> Control:',
)
for (const rendererFact of [
  'RecruitDrawResultCardRailStage_',
  'RecruitDrawResultCardRail_',
  'UI_COMPONENT_FACTORY.apply_card_rail_scroll_container',
  'UI_COMPONENT_FACTORY.apply_motion_recruit_hero_card_enter(card, index)',
  'UI_COMPONENT_FACTORY.apply_motion_recruit_hero_card_reveal_pseudo_live(card, index)',
  'DrawResultRepeatActionSlot',
  '_draw_button(repeat_label',
]) {
  assert.ok(drawDisplayPanel.includes(rendererFact), `draw reveal renderer should include ${rendererFact}`)
}

assert.ok(
  recruitRenderer.includes('UI_COMPONENT_FACTORY.apply_motion_recruit_pack_enter(pack_card, index)') &&
    recruitRenderer.includes('UI_COMPONENT_FACTORY.apply_motion_recruit_pack_enter(inline_panel, index + 1)'),
  'pool page should animate recruit pack entry through the shared factory',
)

const visualSmokeSummary = functionSource(recruitPanel, 'func get_mainline_visual_smoke_summary(page_id: String = "") -> Dictionary:')
for (const panelSummaryFact of [
  'UI_COMPONENT_FACTORY.apply_recruit_formal_pack_summary(summary)',
  '"drawPreviewCommercialStageToken"',
  '"drawPreviewReceiptSource"',
  '"drawResultCommercialStageToken"',
  '"drawResultReceiptSource"',
  '"authorityTriggered"',
  '"recruitMotionFeedbackChainToken"',
  '"recruitMotionClickFeedbackToken"',
  '"recruitMotionResourcePromptToken"',
  '"recruitMotionPackFrameToken"',
  '"recruitMotionRevealToken"',
  '"recruitMotionQualitySweepToken"',
  '"recruitMotionContinueControlToken"',
]) {
  assert.ok(visualSmokeSummary.includes(panelSummaryFact), `recruit panel summary should include ${panelSummaryFact}`)
}

assert.ok(
  visualSmokeSummary.includes('"drawPreviewReceiptSource"] = "preview_only"') &&
    visualSmokeSummary.includes('"drawResultReceiptSource"] = "preview_only"') &&
    visualSmokeSummary.includes('"authorityTriggered"] = false'),
  'recruit draw reveal summary must keep preview-only / no-authority boundary explicit',
)

for (const forbiddenLeak of ['read model', 'authority', 'tier', 'contract id', 'backend']) {
  assert.equal(
    recruitPresenter.includes(`"${forbiddenLeak}"`),
    false,
    `recruit presenter visible quoted copy must not expose ${forbiddenLeak}`,
  )
}

console.log('[godot_recruit_draw_reveal_motion_contract] all checks passed')
