import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
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

const backendApiClient = read('godot-client/scripts/infra/http/backend_api_client.gd')
const mainSource = read('godot-client/scripts/app/main.gd')
const visualSmokeRunner = read('godot-client/tools/run_mainline_visual_smoke.py')
const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

assert.ok(
  backendApiClient.includes('func get_player_history_read_model(') &&
    backendApiClient.includes('"/api/player-history?%s"'),
  'BackendApiClient must expose a player-history read-model helper.',
)

for (const required of [
  'class_name PlayerHistoryPanel',
  'PLAYER_HISTORY_PANEL_STYLE_OWNER := "PlayerHistoryPanel"',
  'PLAYER_HISTORY_SURFACE_CONTRACT := "player_history_panel_v1"',
  'PLAYER_HISTORY_MOTION_TOKEN := "player_history_timeline_card_entry_motion_v1"',
  'PLAYER_HISTORY_REPLAY_INSPECTION_TOKEN := "player_history_replay_action_frame_inspection_v1"',
  'PLAYER_HISTORY_REPLAY_INTERACTION_MOTION_TOKEN := "player_history_replay_interaction_motion_v1"',
  'PLAYER_HISTORY_SAVE_RESTORE_FEEDBACK_TOKEN := "player_history_save_restore_feedback_v1"',
  'func set_player_history_read_model(read_model: Dictionary) -> void:',
  'func refresh_from_backend(limit: int = 80, replay_request_id: String = "") -> void:',
  'func get_player_history_visual_smoke_summary() -> Dictionary:',
]) {
  assert.ok(playerHistoryPanel.includes(required), `player history panel should include ${required}`)
}

assert.ok(
  playerHistoryPanel.includes('PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_page_enter(self)') &&
    playerHistoryPanel.includes('PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_card_stagger_enter(card, index)'),
  'player history panel must bind page and timeline-card motion through the shared UI factory.',
)
assert.ok(
    playerHistoryPanel.includes('call_deferred("_refresh_from_backend_deferred")') &&
    playerHistoryPanel.includes('await refresh_from_backend()') &&
    playerHistoryPanel.includes('if not is_inside_tree() or get_tree() == null:') &&
    playerHistoryPanel.includes('_backend_api_client.call("configure", AppConfig.backend_base_url)') &&
    playerHistoryPanel.includes('await tree.process_frame'),
  'player history panel should refresh the player-safe HTTP read model against the configured backend after entering the tree.',
)
assert.ok(
  playerHistoryPanel.includes('func _build_local_bootstrap_read_model() -> Dictionary:') &&
    playerHistoryPanel.includes('天下纪事已开启') &&
    playerHistoryPanel.includes('战报、政务、同盟和城池变化会在这里汇总。'),
  'player history panel should render a player-safe local bootstrap card before backend refresh.',
)

for (const nodeName of [
  'PlayerHistoryScroll',
  'PlayerHistoryColumn',
  'ReplayFrameInspectButton%02d',
  'SaveSlotRestoreButton%02d',
  'ReplayActionFrameControlRow',
  'ReplayPauseButton',
  'ReplayStepBackButton',
  'ReplayStepForwardButton',
  'ReplayFrameScrubSlider',
  'ReplayFrameCountLabel',
  'ReplayInspectionHintLabel',
  'ReplayScrubHintLabel',
  'ReplayCurrentFrameLabel',
  'ReplayInteractionFeedbackLabel',
  'SaveLoadRiskLabel',
  'SaveLoadFeedbackLabel',
  'SaveLoadEmptyStateLabel',
  'ReplayFrameInspectFeedback%02d',
  'SaveSlotRestoreFeedback%02d',
]) {
  assert.ok(playerHistoryPanel.includes(nodeName), `player history panel should expose real node ${nodeName}`)
}

for (const actionId of [
  'player_history_replay_inspect',
  'player_history_save_restore',
  'player_history_replay_pause',
  'player_history_replay_step_back',
  'player_history_replay_step_forward',
  'player_history_replay_scrub',
]) {
  assert.ok(playerHistoryPanel.includes(actionId), `player history buttons should expose action id ${actionId}`)
}

const visibleLabelSlice = playerHistoryPanel.slice(
  playerHistoryPanel.indexOf('const PLAYER_HISTORY_VISIBLE_LABELS := {'),
  playerHistoryPanel.indexOf('var _backend_api_client'),
)
for (const playerText of [
  '天下纪事',
  '大事',
  '复盘',
  '存档',
  '传闻',
  '恢复',
  '观看',
  '暂停',
  '上一步',
  '下一步',
  '拖动',
  '播放中',
  '已暂停',
  '当前第 %d 帧，共 %d 帧',
  '已切到第 %d 帧',
  '已打开检查',
  '已准备恢复',
  '准备恢复：%s',
  '已选择存档，可先确认当前进度',
]) {
  assert.ok(visibleLabelSlice.includes(playerText), `visible copy should include ${playerText}`)
}
for (const forbidden of [
  '/api/',
  'read model',
  'authority',
  'contract',
  'metadata',
  'memoryProvider',
  'rawEventType',
  'routeName',
  'save-slots',
  'fixture',
  'debug',
  'ops',
]) {
  assert.ok(!visibleLabelSlice.includes(forbidden), `visible labels must not leak ${forbidden}`)
}

const summarySource = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')
for (const field of [
  '"surfaceContract"',
  '"styleOwner"',
  '"motionToken"',
  '"replayInspectionToken"',
  '"replayInteractionMotionToken"',
  '"saveRestoreFeedbackToken"',
  '"timelineCardCount"',
  '"saveSlotCount"',
  '"historyCardCount"',
  '"replayFrameCount"',
  '"replaySelectedFrameIndex"',
  '"replayPaused"',
  '"replayInteractionFeedbackCount"',
  '"realButtonNodeNames"',
  '"controlNodeNames"',
  '"restoreFeedbackCount"',
  '"saveRestoreSelectedSlotId"',
  '"saveRestoreSelectedSlotLabel"',
  '"saveRestoreSelectedSavedAtLabel"',
  '"saveRestoreSelectedRiskLabel"',
  '"saveRestoreSelectedPreviewLabel"',
  '"saveRestoreFeedbackText"',
  '"saveRestorePrepared"',
]) {
  assert.ok(summarySource.includes(field), `visual smoke summary should expose ${field}`)
}
assert.ok(
  playerHistoryPanel.includes('func _build_replay_control_row(controls: Dictionary) -> HBoxContainer:') &&
    playerHistoryPanel.includes('func _build_named_body_label(node_name: String, text: String') &&
    playerHistoryPanel.includes('str(replay.get("frameCountLabel", "")') &&
    playerHistoryPanel.includes('str(replay.get("inspectionHintLabel", "")') &&
    playerHistoryPanel.includes('str(replay.get("timelineScrubLabel", "")') &&
    playerHistoryPanel.includes('str(save_load.get("restoreRiskLabel", "")') &&
    playerHistoryPanel.includes('str(save_load.get("restoreFeedbackLabel", "")') &&
    playerHistoryPanel.includes('str(save_load.get("emptyStateLabel", "")') &&
    playerHistoryPanel.includes('HSlider.new()') &&
    playerHistoryPanel.includes('scrub.value_changed.connect(_on_replay_scrub_changed)') &&
    playerHistoryPanel.includes('button.pressed.connect(_on_replay_pause_pressed)') &&
    playerHistoryPanel.includes('button.pressed.connect(_on_replay_step_pressed.bind(1))') &&
    playerHistoryPanel.includes('func run_replay_interaction_smoke() -> Dictionary:') &&
    playerHistoryPanel.includes('PLAYER_HISTORY_REPLAY_INTERACTION_MOTION_TOKEN') &&
    playerHistoryPanel.includes('func _on_player_history_feedback_pressed(feedback_label: Label, message: String) -> void:') &&
    playerHistoryPanel.includes('func _on_save_slot_restore_pressed(feedback_label: Label, slot_summary: Dictionary) -> void:') &&
    playerHistoryPanel.includes('func run_save_restore_feedback_smoke() -> Dictionary:') &&
    playerHistoryPanel.includes('SaveSlotRestoreFeedback01') &&
    playerHistoryPanel.includes('_save_restore_selected_slot_id') &&
    playerHistoryPanel.includes('_save_restore_selected_saved_at_label') &&
    playerHistoryPanel.includes('_save_restore_selected_risk_label') &&
    playerHistoryPanel.includes('_save_restore_selected_preview_label') &&
    playerHistoryPanel.includes('_save_restore_feedback_text') &&
    playerHistoryPanel.includes('PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(feedback_label)'),
  'player history panel should expose real replay controls, next-layer replay/save-load labels, replay interaction state, and local restore/inspect feedback motion.',
)

for (const mainRequired of [
  'const PlayerHistoryPanelScript: GDScript = preload("res://scripts/ui/player_history_panel.gd")',
  'if action_id == "player_history":',
  '_open_fixed_panel(action_id)',
  'var is_player_history_click_action := click_action.begins_with("player_history_") or panel_id == "player_history"',
  'not is_player_history_click_action and not is_shell_component_contract_action',
  '(is_battle_report_click_action or is_player_history_click_action) and click_action_requirement_ok',
  'playerHistoryShellNavHardGate',
  '_set_native_shell_suppressed_for_overlay(action_id == "player_history")',
  '"player_history"',
  '"title": "天下纪事"',
  'func _build_player_history_panel_content() -> Control:',
  'var panel := PlayerHistoryPanelScript.new() as Control',
  'return _build_player_history_panel_content()',
  '"player_history_panel_open":',
  'return await _press_mainline_visual_smoke_player_history_panel_open(panel_id)',
  '"player_history_seeded_replay_panel_open":',
  '"player_history_seeded_save_restore_panel_open":',
  'func _read_mainline_visual_smoke_player_history_summary() -> Dictionary:',
  'func _run_mainline_visual_smoke_player_history_replay_interaction() -> Dictionary:',
  'func _run_mainline_visual_smoke_player_history_save_restore_feedback() -> Dictionary:',
  'func _resolve_mainline_visual_smoke_panel_root(panel_id: String) -> Control:',
  'func _is_mainline_visual_smoke_panel_host_active(panel_id: String) -> bool:',
]) {
  assert.ok(mainSource.includes(mainRequired), `main.gd should wire player history panel via ${mainRequired}`)
}
assert.ok(
  visualSmokeRunner.includes('"player_history_panel_open"') &&
    visualSmokeRunner.includes('"player_history_seeded_replay_panel_open"') &&
    visualSmokeRunner.includes('"player_history_seeded_save_restore_panel_open"') &&
    visualSmokeRunner.includes('def _seed_player_history_replay(args: argparse.Namespace) -> dict[str, Any]:') &&
    visualSmokeRunner.includes('def _seed_player_history_save_restore(args: argparse.Namespace) -> dict[str, Any]:') &&
    visualSmokeRunner.includes('"/api/save-slots/save"') &&
    visualSmokeRunner.includes('seed_player_history_save_restore') &&
    visualSmokeRunner.includes('"action": "queuePlanExecution"') &&
    visualSmokeRunner.includes('"action": "advanceTick"') &&
    visualSmokeRunner.includes('seed_player_history_replay'),
  'formal visual smoke runner should allow player_history_panel_open and seeded replay player-history proof.',
)

const openClickSource = functionSource(mainSource, 'func _press_mainline_visual_smoke_player_history_panel_open(panel_id: String) -> Dictionary:')
for (const requiredOpenProof of [
  'surfaceContract',
  'player_history_panel_v1',
  'styleOwner',
  'PlayerHistoryPanel',
  'motionToken',
  'player_history_timeline_card_entry_motion_v1',
  'replayInspectionToken',
  'player_history_replay_action_frame_inspection_v1',
  'replayInteractionMotionToken',
  'player_history_replay_interaction_motion_v1',
  'replayInteractionSmoke',
  'replayPaused',
  'replayInteractionFeedbackCount',
  'saveRestoreFeedbackToken',
  'player_history_save_restore_feedback_v1',
  'timelineCardCount',
  'saveSlotCount',
  'historyCardCount',
  'replayFrameCount',
  'player_history_summary_poll_count',
  'await get_tree().create_timer(0.25).timeout',
  '"playerHistorySummaryPollCount": player_history_summary_poll_count',
  'controlNodeNames',
  'restoreFeedbackCount',
  'saveRestoreFeedbackSmoke',
  'saveRestorePrepared',
  'saveRestoreSelectedSlotLabel',
  'saveRestoreSelectedSavedAtLabel',
  'saveRestoreSelectedRiskLabel',
  'saveRestoreSelectedPreviewLabel',
  '"pageContentSummary": summary',
  '"overlayPanelLayout": layout_summary',
]) {
  assert.ok(openClickSource.includes(requiredOpenProof), `open click action should prove ${requiredOpenProof}`)
}
assert.ok(
  mainSource.includes('if is_player_history_click_action or is_battle_report_replay_screen_action:') &&
    mainSource.includes('playerHistoryShellNavHardGate') &&
    mainSource.includes('player_history_fullscreen_panel_owns_shell_occlusion'),
  'player-history visual smoke actions and battle-report replay handoff should own fullscreen shell occlusion instead of failing the shell nav gate.',
)

assert.ok(
  authority.includes('Godot player consumer') &&
    authority.includes('godot-client/scripts/ui/player_history_panel.gd') &&
    authority.includes('player_history_panel_open') &&
    authority.includes('test:godot:player-history-panel-contract'),
  'player-history authority must record the Godot consumer contract without claiming complete UI acceptance.',
)

assert.ok(
  packageJson.includes('test:godot:player-history-panel-contract'),
  'package scripts should expose the Godot player-history panel contract.',
)

console.log('[godot_player_history_panel_contract] all checks passed')
