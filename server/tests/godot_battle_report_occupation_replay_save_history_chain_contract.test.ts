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
const playerHistoryAuthority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const battleDetail = read('godot-client/scripts/ui/battle_report_detail_page.gd')
const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
const main = read('godot-client/scripts/app/main.gd')
const runner = read('godot-client/tools/run_mainline_visual_smoke.py')

const detailSummary = functionSource(battleDetail, 'func get_mainline_visual_smoke_detail_summary() -> Dictionary:')
const playerHistoryRefresh = functionSource(playerHistoryPanel, 'func refresh_from_backend(limit: int = 80, replay_request_id: String = "") -> void:')
const playerHistoryReplayInteraction = functionSource(playerHistoryPanel, 'func run_replay_interaction_smoke() -> Dictionary:')
const replayOpenSource = functionSource(main, 'func _press_mainline_visual_smoke_battle_report_detail_replay_screen_open(panel_id: String) -> Dictionary:')
const replayRequestHandler = functionSource(main, 'func _on_battle_report_replay_requested(payload: Dictionary) -> void:')
const replayRequestCompletion = functionSource(main, 'func _complete_battle_report_replay_open_deferred(replay_request_id: String, selected_report_id: String) -> void:')
const domainStateHandler = functionSource(main, 'func _on_slg_domain_state_updated(_next_state: Dictionary) -> void:')
const smokePanelRootResolver = functionSource(main, 'func _resolve_mainline_visual_smoke_panel_root(panel_id: String) -> Control:')
const playerHistoryBuilder = functionSource(main, 'func _build_player_history_panel_content() -> Control:')
const playerHistoryReplaySeedActions = runner.slice(
  runner.indexOf('PLAYER_HISTORY_REPLAY_SEEDED_ACTIONS = {'),
  runner.indexOf('PLAYER_HISTORY_SAVE_RESTORE_SEEDED_ACTIONS = {'),
)

assert.ok(
  packageJson.includes('"test:godot:battle-report-occupation-replay-save-history-chain-contract"'),
  'package.json must expose the Stage 618 battle-report occupation replay/save history-chain contract entry',
)

for (const docFact of [
  'Stage 618 - Stage C battle report occupation replay/save history chain',
  'battle_report_occupation_replay_save_history_chain_v1',
  'battle_report_detail_replay_to_player_history',
  'player_history_replay_save_chain',
]) {
  assert.ok(
    currentHandoff.includes(docFact) ||
      motionAuthority.includes(docFact) ||
      frontendAuthority.includes(docFact) ||
      playerHistoryAuthority.includes(docFact),
    `Stage 618 docs should record ${docFact}`,
  )
}

for (const detailFact of [
  '"battleReportOccupationReplaySaveHistoryChainToken": "battle_report_occupation_replay_save_history_chain_v1"',
  '"battleReportOccupationReplaySaveHistoryTrigger": "battle_report_detail_replay_to_player_history"',
  '"battleReportOccupationReplaySaveHistoryOwner": "BattleReportDetailPage+PlayerHistoryPanel"',
  '"battleReportOccupationVisibleResultText": _result_label.text.strip_edges()',
  '"battleReportOccupationVisibleResultBound": _result_label.text.strip_edges() != ""',
  '"battleReportOccupationReplayButtonBound": _replay_button.visible and str(detail_frame_contract.get("replay_request_id", "")).strip_edges() != ""',
]) {
  assert.ok(detailSummary.includes(detailFact), `battle detail summary must expose ${detailFact}`)
}

for (const replayFact of [
  '"detailSummaryBefore": detail_summary_before',
  '"battleReportOccupationReplaySaveHistoryChainToken": str(detail_summary_before.get("battleReportOccupationReplaySaveHistoryChainToken", ""))',
  '"battleReportOccupationVisibleResultText": str(detail_summary_before.get("battleReportOccupationVisibleResultText", ""))',
  '"playerHistorySharedMotionFeedbackChainToken": str(player_history_summary.get("stageASharedMotionFeedbackChainToken", ""))',
  '"playerHistorySharedMotionTrigger": str(player_history_summary.get("stageASharedMotionTrigger", ""))',
  '"battleReportReplaySummaryPollCount": replay_summary_poll_count',
  'await current_player_history_panel.call("refresh_from_backend", 80, replay_request_id)',
  '"battleReportOccupationReplaySaveHistoryChainOk": ok',
]) {
  assert.ok(replayOpenSource.includes(replayFact), `battle replay open chain must return ${replayFact}`)
}

assert.ok(
  replayRequestHandler.includes('call_deferred("_complete_battle_report_replay_open_deferred", replay_request_id, selected_report_id)') &&
    replayRequestCompletion.includes('_find_mainline_visual_smoke_visible_node_with_method(_full_screen_panel_host, "configure_dedicated_replay_mode")') &&
    replayRequestCompletion.includes('_find_mainline_visual_smoke_visible_node_with_method(_generated_panel_content, "configure_dedicated_replay_mode")') &&
    replayRequestCompletion.includes('_find_mainline_visual_smoke_node_with_method(_generated_panel_content, "configure_dedicated_replay_mode")') &&
    replayRequestCompletion.includes('panel_node.has_method("refresh_from_backend")'),
  'battle replay request handler must defer to the PlayerHistory dedicated replay node before refresh fallback',
)

assert.ok(
  domainStateHandler.includes('if _active_panel_id == "player_history":') &&
    domainStateHandler.includes('_battle_report_pending_replay_request_id.strip_edges() != ""') &&
    domainStateHandler.includes('get_player_history_visual_smoke_summary') &&
    domainStateHandler.includes('dedicatedReplayScreenOpen') &&
    domainStateHandler.includes('return'),
  'domain updates must not rebuild PlayerHistoryPanel while battle-report dedicated replay is open',
)

assert.ok(
  smokePanelRootResolver.includes('panel_id == "player_history" and _generated_panel_content != null') &&
    smokePanelRootResolver.includes('return generated_control'),
  'PlayerHistory visual-smoke summaries must prefer the current generated content over stale full-screen descendants',
)

assert.ok(
  replayRequestHandler.includes('_battle_report_pending_replay_request_id = replay_request_id') &&
    playerHistoryBuilder.includes('_battle_report_pending_replay_request_id.strip_edges() != ""') &&
    playerHistoryBuilder.includes('configure_dedicated_replay_mode') &&
    replayRequestHandler.includes('_complete_battle_report_replay_open_deferred'),
  'rebuilt PlayerHistoryPanel instances must inherit the pending battle-report replay request',
)

assert.ok(
  replayOpenSource.includes('str(player_history_summary.get("stageASharedMotionFeedbackChainToken", "")) == "stage_a_shared_motion_feedback_chain_v1"') &&
    replayOpenSource.includes('str(player_history_summary.get("stageASharedMotionTrigger", "")) == "player_history_replay_save_chain"') &&
    replayOpenSource.includes('str(detail_summary_before.get("battleReportOccupationReplaySaveHistoryTrigger", "")) == "battle_report_detail_replay_to_player_history"') &&
    replayOpenSource.includes('bool(detail_summary_before.get("battleReportOccupationVisibleResultBound", false))') &&
    replayOpenSource.includes('bool(detail_summary_before.get("battleReportOccupationReplayButtonBound", false))') &&
    replayOpenSource.includes('int(player_history_summary.get("replayFrameCount", 0)) > 0'),
  'battle replay open ok gate must prove detail result, ReplayButton, and PlayerHistory shared packet in one chain',
)

assert.ok(
  playerHistoryRefresh.includes('if _dedicated_replay_mode_active and replay_request_id.strip_edges() == "":') &&
    playerHistoryRefresh.includes('return'),
  'PlayerHistoryPanel must not let the generic deferred refresh overwrite a dedicated battle-report replay refresh',
)

assert.ok(
  playerHistoryReplayInteraction.includes('_replay_interaction_feedback_count >= (3 if _replay_frame_count > 1 else 1)'),
  'single-frame battle-report replays must still satisfy the PlayerHistory interaction smoke',
)

assert.ok(
  packageJson.includes('"test:world:player-history-battle-occupy-tile-producer-contract"') &&
    packageJson.includes('"test:world:player-history-save-load-restore-apply-contract"') &&
    packageJson.includes('"test:godot:player-history-shared-motion-feedback-chain-contract"') &&
    runner.includes('"battle_report_detail_replay_screen_open"'),
  'Stage 618 must retain producer, player-history packet, save/restore, and replay screen formal entries',
)

assert.equal(
  playerHistoryReplaySeedActions.includes('"battle_report_detail_replay_screen_open"'),
  false,
  'battle_report_detail_replay_screen_open should rely on battle-report closure seed, not the PlayerHistory replay seed helper',
)

for (const forbiddenVisibleCopy of [
  'battle_report_occupation_replay_save_history_chain_v1',
  'player_history_replay_save_chain',
  'stage_a_shared_motion_feedback_chain_v1',
]) {
  assert.equal(
    battleDetail.includes(`.text = "${forbiddenVisibleCopy}"`) || battleDetail.includes(`text = "${forbiddenVisibleCopy}"`),
    false,
    `chain tokens must stay in summary metadata, not battle detail visible copy: ${forbiddenVisibleCopy}`,
  )
}

console.log('[godot_battle_report_occupation_replay_save_history_chain_contract] all checks passed')
