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

const packageJson = read('package.json')
const unitViewLayer = read('godot-client/scripts/map/unit_view_layer.gd')
const main = read('godot-client/scripts/app/main.gd')
const battleReportPresenter = read('godot-client/scripts/ui/presenters/battle_report_presenter.gd')

const resultSummarySource = functionSource(unitViewLayer, 'func _build_world_troop_march_result_motion_summary(')
const summarySource = functionSource(unitViewLayer, 'func get_visual_acceptance_summary() -> Dictionary:')
const blockedFixtureUnitSource = functionSource(unitViewLayer, 'func activate_world_troop_march_blocked_screenshot_fixture(unit_id: String) -> void:')
const blockedLabelSource = functionSource(unitViewLayer, 'func _resolve_unit_label_text(unit: Dictionary, compact: bool = false) -> String:')
const blockedFixtureSource = functionSource(main, 'func _press_mainline_visual_smoke_main_city_troop_blocked_screenshot_fixture() -> Dictionary:')
const compactSummarySource = functionSource(main, 'func _compact_mainline_visual_smoke_map_unit_summary(summary: Dictionary) -> Dictionary:')
const battleFeedbackSource = functionSource(main, 'func _press_mainline_visual_smoke_nation_midgame_luoyang_battle_report_feedback() -> Dictionary:')
const occupationFeedbackSource = functionSource(main, 'func _press_mainline_visual_smoke_nation_midgame_luoyang_control_authority() -> Dictionary:')
const battleReportNextStepSource = functionSource(
  battleReportPresenter,
  'func _build_owner_action_result_card_payload(owner_scope: String, actor_label: String, target_label: String, result_text: String, raw_report: Dictionary, raw_record: Dictionary) -> Dictionary:',
)

assert.ok(
  packageJson.includes('"test:world:troop-march-blocked-recovery-motion-contract": "tsx server/tests/world_troop_march_blocked_recovery_motion_contract.test.ts"'),
  'package.json must expose the blocked recovery motion contract as a formal entry.',
)

for (const requiredField of [
  'blockedRetryFeedback',
  'blockedAlternateRouteFeedback',
  'blockedNextActionFeedback',
  'feedbackChainToken',
  'feedbackChainPartial',
  'feedbackChainState',
  'feedbackChainVisibleReason',
  'feedbackChainNextActionHint',
  'feedbackChainVisibleBudgetGuard',
  'feedbackChainVisibleBudgetLines',
]) {
  assert.ok(resultSummarySource.includes(requiredField), `result summary must expose ${requiredField}`)
}

for (const exposedField of [
  'worldTroopMarchBlockedRetryFeedback',
  'worldTroopMarchBlockedAlternateRouteFeedback',
  'worldTroopMarchBlockedNextActionFeedback',
  'worldTroopMarchBlockedRecoveryVisibleFeedback',
  'worldTroopMarchFeedbackChainToken',
  'worldTroopMarchFeedbackChainPartial',
  'worldTroopMarchFeedbackChainState',
  'worldTroopMarchFeedbackChainVisibleReason',
  'worldTroopMarchFeedbackChainNextActionHint',
  'worldTroopMarchFeedbackChainVisibleBudgetGuard',
  'worldTroopMarchFeedbackChainVisibleBudgetLines',
]) {
  assert.ok(summarySource.includes(exposedField), `visual acceptance summary must expose ${exposedField}`)
  if (exposedField !== 'worldTroopMarchBlockedRecoveryVisibleFeedback') {
    assert.ok(compactSummarySource.includes(exposedField), `compact main-line summary must expose ${exposedField}`)
  }
}

assert.ok(
  resultSummarySource.includes('path_cue_count <= 0') &&
    resultSummarySource.includes('arrow_cue_count <= 0') &&
    resultSummarySource.includes('blocked_next_action_feedback := "重试行军 / 改走别线" if blocked_motion else ""'),
  'blocked recovery summary must surface both retry and alternate-route copy in the player-facing next-step field.',
)

assert.ok(
  resultSummarySource.includes('var feedback_chain_token := WORLD_TROOP_MARCH_FEEDBACK_CHAIN_CONTRACT') &&
    resultSummarySource.includes('feedback_chain_partial := blocked_motion or intercepted_motion or retreating_motion') &&
    resultSummarySource.includes('feedback_chain_visible_budget_guard := feedback_chain_visible_budget_lines > 0 and feedback_chain_visible_budget_lines <= 3') &&
    resultSummarySource.includes('feedback_chain_visible_budget_guard_reason := "compact_text_only" if feedback_chain_visible_budget_guard else "budget_overrun"'),
  'blocked recovery summary must declare a partial feedback-chain token and a visible budget guard.',
)

assert.ok(
  unitViewLayer.includes('const WORLD_TROOP_MARCH_BLOCKED_RECOVERY_VISIBLE_LABEL := "行军受阻\\n重试行军 / 改走别线"') &&
    blockedFixtureUnitSource.includes('map_visual["feedbackLabel"] = WORLD_TROOP_MARCH_BLOCKED_RECOVERY_VISIBLE_LABEL') &&
    blockedLabelSource.includes('return WORLD_TROOP_MARCH_BLOCKED_RECOVERY_VISIBLE_LABEL') &&
    summarySource.includes('"worldTroopMarchBlockedRecoveryVisibleFeedback": label_text_values.has(WORLD_TROOP_MARCH_BLOCKED_RECOVERY_VISIBLE_LABEL)'),
  'blocked screenshot fixture must render retry and alternate-route guidance as player-visible map label text.',
)

assert.ok(
  blockedFixtureSource.includes('worldTroopMarchBlockedRetryFeedback') &&
    blockedFixtureSource.includes('worldTroopMarchBlockedAlternateRouteFeedback') &&
    blockedFixtureSource.includes('worldTroopMarchBlockedNextActionFeedback') &&
    blockedFixtureSource.includes('worldTroopMarchFeedbackChainToken') &&
    blockedFixtureSource.includes('worldTroopMarchFeedbackChainPartial') &&
    blockedFixtureSource.includes('worldTroopMarchFeedbackChainState') &&
    blockedFixtureSource.includes('worldTroopMarchFeedbackChainVisibleReason') &&
    blockedFixtureSource.includes('worldTroopMarchFeedbackChainNextActionHint') &&
    blockedFixtureSource.includes('worldTroopMarchFeedbackChainVisibleBudgetGuard') &&
    blockedFixtureSource.includes('blocked_screenshot_feedback_visible'),
  'blocked screenshot fixture must carry the new recovery feedback fields through its smoke result.',
)

assert.ok(
  battleFeedbackSource.includes('report_visible_copy') &&
    battleFeedbackSource.includes('下一步集结') &&
    battleFeedbackSource.includes('battleReportFeedbackVisibleCopy') &&
    battleFeedbackSource.includes('playerOrganizationResultCopy'),
  'Luoyang battle-report feedback must keep a visible consequence copy and next-step cue.',
)

assert.ok(
  occupationFeedbackSource.includes('control_visible_copy') &&
    occupationFeedbackSource.includes('下一步固守') &&
    occupationFeedbackSource.includes('playerOrganizationResultCopy') &&
    occupationFeedbackSource.includes('controlAuthorityId'),
  'Luoyang occupation/control feedback must keep a visible consequence copy and next-step cue.',
)

assert.ok(
  battleReportNextStepSource.includes('"next_step": _truncate_battle_report_list_ai_action_text') &&
    battleReportNextStepSource.includes('result_text') &&
    battleReportNextStepSource.includes('fallback_next_step'),
  'battle report presenter must keep battle consequence copy and the next-step field on the player-facing card.',
)

console.log('[world_troop_march_blocked_recovery_motion_contract] all checks passed')
