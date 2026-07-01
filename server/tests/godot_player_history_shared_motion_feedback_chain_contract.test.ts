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
const componentFactory = read('godot-client/scripts/ui/slg_ui_component_factory.gd')
const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
const main = read('godot-client/scripts/app/main.gd')

const summarySource = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')
const readSummarySource = functionSource(main, 'func _read_mainline_visual_smoke_player_history_summary() -> Dictionary:')
const panelOpenSource = functionSource(main, 'func _press_mainline_visual_smoke_player_history_panel_open(panel_id: String) -> Dictionary:')

assert.ok(
  packageJson.includes('"test:godot:player-history-shared-motion-feedback-chain-contract"'),
  'package.json must expose the Stage C player-history shared motion feedback-chain contract entry',
)

for (const docFact of [
  'Stage 617 - Stage C player history shared motion feedback-chain packet',
  'stage_a_shared_motion_feedback_chain_v1',
  'player_history_replay_save_chain',
  'PlayerHistoryPanel',
]) {
  assert.ok(
    currentHandoff.includes(docFact) ||
      motionAuthority.includes(docFact) ||
      frontendAuthority.includes(docFact) ||
      playerHistoryAuthority.includes(docFact),
    `Stage C docs should record ${docFact}`,
  )
}

assert.ok(
  componentFactory.includes('static func apply_stage_a_shared_motion_feedback_chain_summary(summary: Dictionary, owner: String, trigger: String, proof_level: String = "code_chain") -> void:'),
  'Stage C must reuse the shared factory packet helper instead of inventing a PlayerHistoryPanel-only schema',
)

assert.ok(
  playerHistoryPanel.includes('const PLAYER_HISTORY_UI_COMPONENT_FACTORY: GDScript = preload("res://scripts/ui/slg_ui_component_factory.gd")'),
  'PlayerHistoryPanel must keep SlgUiComponentFactory as the shared motion packet owner',
)

assert.ok(
  summarySource.includes('PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_stage_a_shared_motion_feedback_chain_summary(summary, "PlayerHistoryPanel", "player_history_replay_save_chain"') &&
    summarySource.includes('"stageASharedMotionTrigger"'),
  'PlayerHistoryPanel visual smoke summary must attach the shared Stage C packet',
)

assert.ok(
  main.includes('"player_history_shared_motion_packet_open"') &&
    main.includes('func _press_mainline_visual_smoke_player_history_shared_motion_packet_open(panel_id: String) -> Dictionary:'),
  'main.gd must expose a narrow Stage C visual-smoke action that opens PlayerHistoryPanel and reads the shared packet without triggering recovery navigation',
)

assert.ok(
  main.includes('click_action.begins_with("player_history_")'),
  'main.gd must classify player_history_* click actions as PlayerHistory fullscreen actions for hub/shell gates',
)

for (const preservedField of [
  '"replayInspectionToken": PLAYER_HISTORY_REPLAY_INSPECTION_TOKEN',
  '"replayInteractionMotionToken": PLAYER_HISTORY_REPLAY_INTERACTION_MOTION_TOKEN',
  '"dedicatedReplayModeToken": PLAYER_HISTORY_DEDICATED_REPLAY_MODE_TOKEN',
  '"saveRestoreFeedbackToken": PLAYER_HISTORY_SAVE_RESTORE_FEEDBACK_TOKEN',
  '"realButtonNodeNames": _button_node_names.duplicate()',
  '"controlNodeNames": _control_node_names.duplicate()',
]) {
  assert.ok(summarySource.includes(preservedField), `player-history packet must preserve existing replay/save controls: ${preservedField}`)
}

for (const smokeFact of [
  '"pageContentSummary": summary',
  'str(summary.get("replayInteractionMotionToken", "")) == "player_history_replay_interaction_motion_v1"',
  'str(summary.get("saveRestoreFeedbackToken", "")) == "player_history_save_restore_feedback_v1"',
]) {
  assert.ok(panelOpenSource.includes(smokeFact), `player-history visual-smoke open chain should preserve ${smokeFact}`)
}

assert.ok(
  readSummarySource.includes('summary["panelId"] = "player_history"') &&
    readSummarySource.includes('summary["activePanelId"] = _active_panel_id') &&
    readSummarySource.includes('return summary'),
  'main.gd should pass through PlayerHistoryPanel summary fields, including shared packet metadata, without compacting them away',
)

const sharedPacketOpenSource = functionSource(
  main,
  'func _press_mainline_visual_smoke_player_history_shared_motion_packet_open(panel_id: String) -> Dictionary:',
)
for (const stageCActionFact of [
  'str(summary.get("stageASharedMotionFeedbackChainToken", "")) == "stage_a_shared_motion_feedback_chain_v1"',
  'str(summary.get("stageASharedMotionOwner", "")) == "PlayerHistoryPanel"',
  'str(summary.get("stageASharedMotionTrigger", "")) == "player_history_replay_save_chain"',
  'not bool(summary.get("stageASharedMotionGameplayAuthorityChanged", true))',
  '"playerHistorySummary": summary',
]) {
  assert.ok(sharedPacketOpenSource.includes(stageCActionFact), `Stage C visual-smoke action should preserve ${stageCActionFact}`)
}

assert.ok(
  read('godot-client/tools/run_mainline_visual_smoke.py').includes('"player_history_shared_motion_packet_open"'),
  'visual-smoke runner must whitelist player_history_shared_motion_packet_open',
)

for (const packetField of [
  '"stageASharedMotionFeedbackChainToken"',
  '"stageASharedMotionPacketSchema"',
  '"stageASharedMotionOwner"',
  '"stageASharedMotionTrigger"',
  '"stageASharedMotionGameEvent"',
  '"stageASharedMotionPresentationEvent"',
  '"stageASharedMotionTimeline"',
  '"stageASharedMotionVisualStep"',
  '"stageASharedMotionUiStep"',
  '"stageASharedMotionControlsPreserved"',
  '"stageASharedMotionGameplayAuthorityChanged"',
]) {
  assert.ok(componentFactory.includes(packetField), `shared factory packet should preserve ${packetField}`)
}

for (const producerEntry of [
  '"test:world:player-history-battle-occupy-tile-producer-contract"',
  '"test:world:player-history-save-load-restore-apply-contract"',
  '"test:godot:dedicated-replay-mode-contract"',
  '"test:godot:player-history-panel-contract"',
]) {
  assert.ok(packageJson.includes(producerEntry), `Stage C must retain supporting formal entry ${producerEntry}`)
}

for (const forbiddenVisibleCopy of ['stage_a_shared_motion_feedback_chain_v1', 'game_event', 'presentation_event']) {
  assert.equal(
    playerHistoryPanel.includes(`.text = "${forbiddenVisibleCopy}"`) || playerHistoryPanel.includes(`text = "${forbiddenVisibleCopy}"`),
    false,
    `shared packet token/schema must stay in summary metadata, not PlayerHistoryPanel visible copy: ${forbiddenVisibleCopy}`,
  )
}

console.log('[godot_player_history_shared_motion_feedback_chain_contract] all checks passed')
