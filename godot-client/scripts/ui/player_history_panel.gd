extends Control
class_name PlayerHistoryPanel

signal timeline_recovery_requested(recovery_kind: String)

const BACKEND_API_CLIENT_SCRIPT: GDScript = preload("res://scripts/infra/http/backend_api_client.gd")
const PLAYER_HISTORY_UI_COMPONENT_FACTORY: GDScript = preload("res://scripts/ui/slg_ui_component_factory.gd")

const PLAYER_HISTORY_ROUTE := "/api/player-history"
const PLAYER_HISTORY_PANEL_STYLE_OWNER := "PlayerHistoryPanel"
const PLAYER_HISTORY_SURFACE_CONTRACT := "player_history_panel_v1"
const PLAYER_HISTORY_MOTION_TOKEN := "player_history_timeline_card_entry_motion_v1"
const PLAYER_HISTORY_REPLAY_INSPECTION_TOKEN := "player_history_replay_action_frame_inspection_v1"
const PLAYER_HISTORY_REPLAY_INTERACTION_MOTION_TOKEN := "player_history_replay_interaction_motion_v1"
const PLAYER_HISTORY_AI_ACTIVITY_RECOVERY_TOKEN := "player_history_ai_activity_recovery_v1"
const PLAYER_HISTORY_AI_PROPOSAL_APPLY_RECOVERY_TOKEN := "player_history_ai_proposal_apply_recovery_v1"
const PLAYER_HISTORY_AI_PROPOSAL_DENIED_RECOVERY_TOKEN := "player_history_ai_proposal_denied_recovery_v1"
const PLAYER_HISTORY_AI_PROPOSAL_DENIED_FOCUSED_RECEIPT_TOKEN := "player_history_ai_proposal_denied_focused_receipt_v1"
const PLAYER_HISTORY_AI_EXECUTION_RECEIPT_FOCUSED_TOKEN := "player_history_ai_execution_receipt_focused_v1"
const PLAYER_HISTORY_COURT_RECOVERY_TOKEN := "player_history_court_civil_memory_recovery_v1"
const PLAYER_HISTORY_AI_EXECUTION_RECEIPT_RECOVERY_TOKEN := "player_history_ai_execution_receipt_recovery_v1"
const PLAYER_HISTORY_DEDICATED_REPLAY_MODE_TOKEN := "dedicated_replay_mode_v1"
const PLAYER_HISTORY_SAVE_RESTORE_FEEDBACK_TOKEN := "player_history_save_restore_feedback_v1"

const PLAYER_HISTORY_VISIBLE_LABELS := {
	"title": "天下纪事",
	"timeline": "大事",
	"replay": "复盘",
	"saveLoad": "存档",
	"civilMemory": "传闻",
	"empty": "暂时没有新的天下纪事。",
	"restore": "恢复",
	"watchReplay": "观看",
	"pause": "暂停",
	"previous": "上一步",
	"next": "下一步",
	"scrub": "拖动",
	"playing": "播放中",
	"paused": "已暂停",
	"frameStatus": "当前第 %d 帧，共 %d 帧",
	"stepped": "已切到第 %d 帧",
	"inspectReady": "已打开检查",
	"closeReplay": "回到战报",
	"replayUnavailable": "回放已不可用",
	"restoreReady": "已准备恢复",
	"restorePrepared": "准备恢复：%s",
	"restoreOutcome": "已选择存档，可先确认当前进度",
	"openRelated": "查看",
	"recoveryReady": "已定位相关记录",
	"notifications": "提醒",
	"notificationReady": "已定位提醒",
	"notificationPrivate": "这条提醒暂时不可查看",
	"notificationDenied": "这条提醒需要更高权限",
	"notificationDismiss": "知道了",
	"notificationDismissed": "已收起提醒",
	"livePreview": "新动态",
	"livePreviewReady": "实时预览已开启",
	"shareTimeline": "分享",
	"shareReady": "已开放只读纪事",
	"shareUnavailable": "暂时无法分享",
	"shareHandoffReady": "分享已准备",
	"shareHandoffPreview": "预览",
	"shareHandoffPreviewReady": "只读预览已打开",
	"shareCopy": "复制",
	"shareCopied": "分享口令已复制",
	"shareManagement": "分享管理",
	"shareManagementEmpty": "暂无已开放分享",
	"shareManagementReady": "已更新分享列表",
	"shareRevoke": "撤回",
	"shareRevoked": "已撤回只读纪事",
	"sharedReadReady": "已打开只读纪事",
	"sharedReadUnavailable": "这段纪事暂时无法查看",
	"aiReceipt": "AI 行动收据",
	"aiReceiptFollowup": "查看 AI 活动",
}

var _backend_api_client: Node = null
var _read_model: Dictionary = {}
var _timeline_card_count := 0
var _save_slot_count := 0
var _history_card_count := 0
var _replay_frame_count := 0
var _replay_selected_frame_index := 0
var _replay_paused := false
var _replay_interaction_feedback_count := 0
var _button_node_names: Array[String] = []
var _control_node_names: Array[String] = []
var _restore_feedback_count := 0
var _save_restore_selected_slot_id := ""
var _save_restore_selected_slot_label := ""
var _save_restore_selected_saved_at_label := ""
var _save_restore_selected_risk_label := ""
var _save_restore_selected_preview_label := ""
var _save_restore_feedback_text := ""
var _save_slot_summaries: Array[Dictionary] = []
var _timeline_recovery_action_count := 0
var _timeline_recovery_feedback_text := ""
var _timeline_recovery_source_kind := ""
var _timeline_recovery_signal_count := 0
var _timeline_recovery_signal_kind := ""
var _timeline_recovery_internal_tokens_by_kind: Dictionary = {}
var _timeline_recovery_focus_payloads_by_kind: Dictionary = {}
var _timeline_recovery_selected_kind := ""
var _timeline_recovery_selected_internal_token := ""
var _timeline_recovery_selected_focus_payload: Dictionary = {}
var _timeline_recovery_focused_receipt_visible := false
var _timeline_recovery_focused_receipt_kind := ""
var _timeline_recovery_focused_receipt_feedback := ""
var _visual_smoke_focused_receipt_lock := false
var _notification_anchor_count := 0
var _notification_anchor_action_count := 0
var _notification_anchor_feedback_text := ""
var _notification_anchor_selected_durable_card_resolved := false
var _notification_anchor_private_feedback_count := 0
var _notification_anchor_denied_feedback_count := 0
var _notification_anchor_dismissed_count := 0
var _notification_anchor_dismiss_refresh_requested_count := 0
var _notification_anchor_dismiss_refresh_in_flight := false
var _dismissed_notification_dedupe_keys: Array[String] = []
var _share_issue_requested_count := 0
var _share_issue_success_count := 0
var _share_issue_feedback_text := ""
var _share_issue_scope := ""
var _share_issue_retention_label := ""
var _share_tokens_by_event_id: Dictionary = {}
var _share_handoff_ready_count := 0
var _share_handoff_preview_requested_count := 0
var _share_handoff_preview_success_count := 0
var _share_handoff_feedback_text := ""
var _share_handoff_retention_label := ""
var _share_handoff_preview_active := false
var _share_copy_requested_count := 0
var _share_copy_success_count := 0
var _share_copy_feedback_text := ""
var _share_unavailable_card_count := 0
var _share_unavailable_feedback_text := ""
var _share_management_requested_count := 0
var _share_management_share_count := 0
var _share_management_feedback_text := ""
var _share_management_revoked_count := 0
var _share_management_last_status_label := ""
var _share_management_last_retention_label := ""
var _share_management_summaries: Array[Dictionary] = []
var _shared_history_read_requested_count := 0
var _shared_history_read_success_count := 0
var _shared_history_read_feedback_text := ""
var _shared_history_read_active := false
var _live_preview_visible := false
var _live_preview_backpressure_applied := false
var _live_preview_collapsed_feedback_text := ""
var _live_preview_dropped_count_label := ""
var _live_preview_card_count := 0
var _timeline_cards_by_id: Dictionary = {}
var _card_motion_enabled := true
var _replay_current_frame_label: Label = null
var _replay_interaction_feedback_label: Label = null
var _replay_scrub_slider: HSlider = null
var _dedicated_replay_mode_active := false
var _dedicated_replay_origin_surface := ""
var _dedicated_replay_close_return_target := ""
var _dedicated_replay_source_battle_report_id := ""
var _replay_round_focus_label := ""
var _replay_unavailable_copy_visible := false
var _last_backend_refresh_ok := false
var _last_backend_refresh_status := 0
var _last_backend_refresh_replay_request_id := ""
var _last_backend_refresh_replay_frame_count := 0
var _last_rejected_player_history_read_model_cache: Dictionary = {}

@onready var _root_scroll: ScrollContainer = ScrollContainer.new()
@onready var _root_column: VBoxContainer = VBoxContainer.new()

func _ready() -> void:
	name = "PlayerHistoryPanel"
	set_meta("player_history_panel_surface_contract", PLAYER_HISTORY_SURFACE_CONTRACT)
	set_meta("player_history_panel_style_owner", PLAYER_HISTORY_PANEL_STYLE_OWNER)
	set_meta("player_history_panel_motion_token", PLAYER_HISTORY_MOTION_TOKEN)
	_build_static_tree()
	if _read_model.is_empty():
		_read_model = _build_local_bootstrap_read_model()
	_refresh_view()
	if is_inside_tree():
		PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_page_enter(self)
	call_deferred("_refresh_from_backend_deferred")

func set_player_history_read_model(read_model: Dictionary) -> void:
	_read_model = read_model.duplicate(true)
	_refresh_view()

func get_last_rejected_player_history_read_model_cache() -> Dictionary:
	return _last_rejected_player_history_read_model_cache.duplicate(true)

func configure_dedicated_replay_mode(options: Dictionary = {}) -> void:
	_dedicated_replay_mode_active = true
	_dedicated_replay_origin_surface = str(options.get("originSurface", "battle_report_detail")).strip_edges()
	_dedicated_replay_close_return_target = str(options.get("closeReturnTarget", "battle_report_detail")).strip_edges()
	_dedicated_replay_source_battle_report_id = str(options.get("sourceBattleReportId", "")).strip_edges()
	_replay_unavailable_copy_visible = bool(options.get("replayUnavailableCopyVisible", false))
	_refresh_view()

func close_dedicated_replay_mode() -> void:
	_dedicated_replay_mode_active = false
	_dedicated_replay_close_return_target = "battle_report_detail"

func refresh_from_backend(limit: int = 80, replay_request_id: String = "") -> void:
	if not is_inside_tree() or get_tree() == null:
		return
	if _dedicated_replay_mode_active and replay_request_id.strip_edges() == "":
		return
	if _backend_api_client == null:
		_backend_api_client = BACKEND_API_CLIENT_SCRIPT.new()
		add_child(_backend_api_client)
		if _backend_api_client.has_method("configure"):
			_backend_api_client.call("configure", AppConfig.backend_base_url)
		var tree := get_tree()
		if tree == null:
			return
		await tree.process_frame
	_last_backend_refresh_replay_request_id = replay_request_id.strip_edges()
	var response: Dictionary = await _backend_api_client.get_player_history_read_model(limit, replay_request_id, _dismissed_notification_dedupe_keys)
	_last_backend_refresh_ok = bool(response.get("ok", false))
	_last_backend_refresh_status = int(response.get("status", 0))
	_last_backend_refresh_replay_frame_count = 0
	if _visual_smoke_focused_receipt_lock:
		return
	var data := _coerce_dictionary(response.get("data", {}))
	var replay_data := _coerce_dictionary(data.get("replay", {}))
	_last_backend_refresh_replay_frame_count = _coerce_array(replay_data.get("frames", [])).size()
	if bool(response.get("ok", false)) and not data.is_empty():
		_card_motion_enabled = false
		_apply_player_history_backend_read_model(data)

func _apply_player_history_backend_read_model(read_model: Dictionary) -> bool:
	if _is_stale_player_history_read_model(read_model):
		_last_rejected_player_history_read_model_cache = _build_stale_player_history_rejection(read_model)
		return false
	_last_rejected_player_history_read_model_cache = {}
	set_player_history_read_model(read_model)
	return true

func _is_stale_player_history_read_model(read_model: Dictionary) -> bool:
	var current_generated_at := _read_player_history_generated_at(_read_model)
	var incoming_generated_at := _read_player_history_generated_at(read_model)
	if current_generated_at == "" or incoming_generated_at == "":
		return false
	return incoming_generated_at < current_generated_at

func _build_stale_player_history_rejection(read_model: Dictionary) -> Dictionary:
	return {
		"reason": "stale_player_history_generated_at",
		"currentGeneratedAt": _read_player_history_generated_at(_read_model),
		"incomingGeneratedAt": _read_player_history_generated_at(read_model),
		"readPacketKind": "player_history_read_model",
		"cacheRole": "presentation_snapshot_cache",
	}

func _read_player_history_generated_at(read_model: Dictionary) -> String:
	var timeline := _coerce_dictionary(read_model.get("timeline", {}))
	return str(timeline.get("generatedAt", "")).strip_edges()

func _refresh_from_backend_deferred() -> void:
	await refresh_from_backend()

func open_shared_player_history(share_token: String, limit: int = 80) -> void:
	_shared_history_read_requested_count += 1
	var resolved_share_token := share_token.strip_edges()
	if resolved_share_token == "":
		_shared_history_read_feedback_text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("sharedReadUnavailable", "这段纪事暂时无法查看"))
		_shared_history_read_active = false
		return
	if _backend_api_client == null:
		_backend_api_client = BACKEND_API_CLIENT_SCRIPT.new()
		add_child(_backend_api_client)
		if _backend_api_client.has_method("configure"):
			_backend_api_client.call("configure", AppConfig.backend_base_url)
		var tree := get_tree()
		if tree != null:
			await tree.process_frame
	var response: Dictionary = await _backend_api_client.get_shared_player_history_read_model(resolved_share_token, limit)
	var data := _coerce_dictionary(response.get("data", {}))
	if bool(response.get("ok", false)) and not data.is_empty():
		_shared_history_read_success_count += 1
		_shared_history_read_active = true
		_shared_history_read_feedback_text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("sharedReadReady", "已打开只读纪事"))
		_card_motion_enabled = false
		set_player_history_read_model(data)
	else:
		_shared_history_read_active = false
		_shared_history_read_feedback_text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("sharedReadUnavailable", "这段纪事暂时无法查看"))

func refresh_share_management() -> void:
	_share_management_requested_count += 1
	if _backend_api_client == null:
		_backend_api_client = BACKEND_API_CLIENT_SCRIPT.new()
		add_child(_backend_api_client)
		if _backend_api_client.has_method("configure"):
			_backend_api_client.call("configure", AppConfig.backend_base_url)
		var tree := get_tree()
		if tree != null:
			await tree.process_frame
	var response: Dictionary = await _backend_api_client.get_player_history_share_tokens("player")
	var data := _coerce_dictionary(response.get("data", {}))
	if bool(response.get("ok", false)) and not data.is_empty():
		var shares := _coerce_array(data.get("shares", []))
		_share_management_summaries.clear()
		for share_value in shares:
			var share := _sanitize_share_management_summary(_coerce_dictionary(share_value))
			if not share.is_empty():
				_share_management_summaries.append(share)
		_share_management_share_count = _share_management_summaries.size()
		_share_management_feedback_text = str(data.get("shareManagementLabel", PLAYER_HISTORY_VISIBLE_LABELS.get("shareManagementReady", "已更新分享列表"))).strip_edges()
		_refresh_view()
	else:
		_share_management_feedback_text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("shareManagementEmpty", "暂无已开放分享"))
		_share_management_share_count = 0

func _sanitize_share_management_summary(share: Dictionary) -> Dictionary:
	var share_id := str(share.get("shareId", "")).strip_edges()
	var status := str(share.get("status", "")).strip_edges()
	if share_id == "" or not ["active", "revoked", "expired"].has(status):
		return {}
	return {
		"shareId": share_id,
		"status": status,
		"eventTitle": str(share.get("eventTitle", "只读纪事")).strip_edges(),
		"shareStateLabel": str(share.get("shareStateLabel", "")).strip_edges(),
		"shareRetentionLabel": str(share.get("shareRetentionLabel", "")).strip_edges(),
	}

func get_player_history_visual_smoke_summary() -> Dictionary:
	var summary := {
		"ok": _timeline_card_count > 0 or _save_slot_count > 0 or _history_card_count > 0,
		"route": PLAYER_HISTORY_ROUTE,
		"surfaceContract": PLAYER_HISTORY_SURFACE_CONTRACT,
		"styleOwner": PLAYER_HISTORY_PANEL_STYLE_OWNER,
		"motionToken": PLAYER_HISTORY_MOTION_TOKEN,
		"replayInspectionToken": PLAYER_HISTORY_REPLAY_INSPECTION_TOKEN,
		"replayInteractionMotionToken": PLAYER_HISTORY_REPLAY_INTERACTION_MOTION_TOKEN,
		"dedicatedReplayModeToken": PLAYER_HISTORY_DEDICATED_REPLAY_MODE_TOKEN,
		"saveRestoreFeedbackToken": PLAYER_HISTORY_SAVE_RESTORE_FEEDBACK_TOKEN,
		"timelineCardCount": _timeline_card_count,
		"saveSlotCount": _save_slot_count,
		"historyCardCount": _history_card_count,
		"replayFrameCount": _replay_frame_count,
		"replaySelectedFrameIndex": _replay_selected_frame_index,
		"replayPaused": _replay_paused,
		"replayInteractionFeedbackCount": _replay_interaction_feedback_count,
		"dedicatedReplayScreenOpen": _dedicated_replay_mode_active,
		"replayFrameLoaded": _replay_frame_count > 0,
		"replayActionFrameInspection": _replay_frame_count > 0 and PLAYER_HISTORY_REPLAY_INSPECTION_TOKEN != "",
		"replayPauseStepScrub": _replay_scrub_slider != null and is_instance_valid(_replay_scrub_slider),
		"replaySpatialOrRoundFocus": _replay_round_focus_label.strip_edges() != "",
		"replayCloseReturn": _dedicated_replay_close_return_target.strip_edges() != "",
		"replayUnavailableCopyVisible": _replay_unavailable_copy_visible,
		"replayRoundFocusLabel": _replay_round_focus_label,
		"lastBackendRefreshOk": _last_backend_refresh_ok,
		"lastBackendRefreshStatus": _last_backend_refresh_status,
		"lastBackendRefreshReplayRequestId": _last_backend_refresh_replay_request_id,
		"lastBackendRefreshReplayFrameCount": _last_backend_refresh_replay_frame_count,
		"replayCloseReturnTarget": _dedicated_replay_close_return_target,
		"replayOriginSurface": _dedicated_replay_origin_surface,
		"replaySourceBattleReportId": _dedicated_replay_source_battle_report_id,
		"realButtonNodeNames": _button_node_names.duplicate(),
		"controlNodeNames": _control_node_names.duplicate(),
		"restoreFeedbackCount": _restore_feedback_count,
		"saveRestoreSelectedSlotId": _save_restore_selected_slot_id,
		"saveRestoreSelectedSlotLabel": _save_restore_selected_slot_label,
		"saveRestoreSelectedSavedAtLabel": _save_restore_selected_saved_at_label,
		"saveRestoreSelectedRiskLabel": _save_restore_selected_risk_label,
		"saveRestoreSelectedPreviewLabel": _save_restore_selected_preview_label,
		"saveRestoreFeedbackText": _save_restore_feedback_text,
		"saveRestorePrepared": _save_restore_feedback_text.strip_edges() != "",
		"timelineRecoveryActionCount": _timeline_recovery_action_count,
		"timelineRecoveryFeedbackText": _timeline_recovery_feedback_text,
		"timelineRecoverySourceKind": _timeline_recovery_source_kind,
		"timelineRecoverySignalCount": _timeline_recovery_signal_count,
		"timelineRecoverySignalKind": _timeline_recovery_signal_kind,
		"timelineRecoverySelectedKind": _timeline_recovery_selected_kind,
		"timelineRecoverySelectedTokenResolved": _timeline_recovery_selected_internal_token.strip_edges() != "",
		"timelineRecoverySelectedPayloadResolved": not _timeline_recovery_selected_focus_payload.is_empty(),
		"timelineRecoveryFocusedReceiptToken": PLAYER_HISTORY_AI_EXECUTION_RECEIPT_FOCUSED_TOKEN if _timeline_recovery_focused_receipt_kind == "ai_execution_receipt" else PLAYER_HISTORY_AI_PROPOSAL_DENIED_FOCUSED_RECEIPT_TOKEN,
		"timelineRecoveryFocusedReceiptVisible": _timeline_recovery_focused_receipt_visible,
		"timelineRecoveryFocusedReceiptKind": _timeline_recovery_focused_receipt_kind,
		"timelineRecoveryFocusedReceiptFeedback": _timeline_recovery_focused_receipt_feedback,
		"notificationAnchorCount": _notification_anchor_count,
		"notificationAnchorActionCount": _notification_anchor_action_count,
		"notificationAnchorFeedbackText": _notification_anchor_feedback_text,
		"notificationAnchorSelectedDurableCardResolved": _notification_anchor_selected_durable_card_resolved,
		"notificationAnchorPrivateFeedbackCount": _notification_anchor_private_feedback_count,
		"notificationAnchorDeniedFeedbackCount": _notification_anchor_denied_feedback_count,
		"notificationAnchorDismissedCount": _notification_anchor_dismissed_count,
		"notificationAnchorDismissRefreshRequestedCount": _notification_anchor_dismiss_refresh_requested_count,
		"notificationDismissedDedupeKeyCount": _dismissed_notification_dedupe_keys.size(),
		"shareIssueRequestedCount": _share_issue_requested_count,
		"shareIssueSuccessCount": _share_issue_success_count,
		"shareIssueFeedbackText": _share_issue_feedback_text,
		"shareIssueScope": _share_issue_scope,
		"shareIssueRetentionLabel": _share_issue_retention_label,
		"shareHandoffReadyCount": _share_handoff_ready_count,
		"shareHandoffPreviewRequestedCount": _share_handoff_preview_requested_count,
		"shareHandoffPreviewSuccessCount": _share_handoff_preview_success_count,
		"shareHandoffFeedbackText": _share_handoff_feedback_text,
		"shareHandoffRetentionLabel": _share_handoff_retention_label,
		"shareHandoffPreviewActive": _share_handoff_preview_active,
		"shareCopyRequestedCount": _share_copy_requested_count,
		"shareCopySuccessCount": _share_copy_success_count,
		"shareCopyFeedbackText": _share_copy_feedback_text,
		"shareUnavailableCardCount": _share_unavailable_card_count,
		"shareUnavailableFeedbackText": _share_unavailable_feedback_text,
		"shareManagementRequestedCount": _share_management_requested_count,
		"shareManagementShareCount": _share_management_share_count,
		"shareManagementFeedbackText": _share_management_feedback_text,
		"shareManagementRevokedCount": _share_management_revoked_count,
		"shareManagementLastStatusLabel": _share_management_last_status_label,
		"shareManagementLastRetentionLabel": _share_management_last_retention_label,
		"sharedHistoryReadRequestedCount": _shared_history_read_requested_count,
		"sharedHistoryReadSuccessCount": _shared_history_read_success_count,
		"sharedHistoryReadFeedbackText": _shared_history_read_feedback_text,
		"sharedHistoryReadActive": _shared_history_read_active,
		"livePreviewVisible": _live_preview_visible,
		"livePreviewBackpressureApplied": _live_preview_backpressure_applied,
		"livePreviewCollapsedFeedbackText": _live_preview_collapsed_feedback_text,
		"livePreviewDroppedCountLabel": _live_preview_dropped_count_label,
		"livePreviewCardCount": _live_preview_card_count,
		"visibleCopyLabels": PLAYER_HISTORY_VISIBLE_LABELS.values(),
	}
	PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_stage_a_shared_motion_feedback_chain_summary(summary, "PlayerHistoryPanel", "player_history_replay_save_chain")
	var _stage_c_shared_motion_trigger := str(summary.get("stageASharedMotionTrigger", ""))
	return summary

func _build_static_tree() -> void:
	if _root_scroll.get_parent() != null:
		return
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	size_flags_vertical = Control.SIZE_EXPAND_FILL
	_root_scroll.name = "PlayerHistoryScroll"
	_root_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_root_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_root_scroll.set_meta("touch_scroll_input_mode", "player_history_vertical_scroll")
	_root_column.name = "PlayerHistoryColumn"
	_root_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_root_column.add_theme_constant_override("separation", 14)
	_root_scroll.add_child(_root_column)
	add_child(_root_scroll)
	_root_scroll.set_anchors_preset(Control.PRESET_FULL_RECT)

func _refresh_view() -> void:
	if _root_column == null:
		return
	_clear_children(_root_column)
	_timeline_card_count = 0
	_save_slot_count = 0
	_history_card_count = 0
	_replay_frame_count = 0
	_replay_selected_frame_index = 0
	_replay_paused = false
	_replay_interaction_feedback_count = 0
	_button_node_names.clear()
	_control_node_names.clear()
	_restore_feedback_count = 0
	_save_restore_selected_slot_id = ""
	_save_restore_selected_slot_label = ""
	_save_restore_selected_saved_at_label = ""
	_save_restore_selected_risk_label = ""
	_save_restore_selected_preview_label = ""
	_save_restore_feedback_text = ""
	_save_slot_summaries.clear()
	_timeline_recovery_internal_tokens_by_kind.clear()
	_timeline_recovery_focus_payloads_by_kind.clear()
	_timeline_recovery_selected_kind = ""
	_timeline_recovery_selected_internal_token = ""
	_timeline_recovery_selected_focus_payload = {}
	_timeline_recovery_focused_receipt_visible = false
	_timeline_recovery_focused_receipt_kind = ""
	_timeline_recovery_focused_receipt_feedback = ""
	_notification_anchor_count = 0
	_notification_anchor_action_count = 0
	_notification_anchor_feedback_text = ""
	_notification_anchor_selected_durable_card_resolved = false
	_notification_anchor_private_feedback_count = 0
	_notification_anchor_denied_feedback_count = 0
	_notification_anchor_dismissed_count = 0
	_live_preview_visible = false
	_live_preview_backpressure_applied = false
	_live_preview_collapsed_feedback_text = ""
	_live_preview_dropped_count_label = ""
	_live_preview_card_count = 0
	_share_issue_feedback_text = ""
	_share_issue_scope = ""
	_share_issue_retention_label = ""
	_share_handoff_feedback_text = ""
	_share_handoff_retention_label = ""
	_share_handoff_preview_active = false
	_timeline_cards_by_id.clear()
	_replay_current_frame_label = null
	_replay_interaction_feedback_label = null
	_replay_scrub_slider = null
	_replay_round_focus_label = ""

	_root_column.add_child(_build_title_label(str(PLAYER_HISTORY_VISIBLE_LABELS.get("title", "天下纪事"))))
	_rebuild_live_preview(_coerce_dictionary(_read_model.get("livePreview", {})))
	var timeline := _coerce_dictionary(_read_model.get("timeline", {}))
	_rebuild_notification_anchors(timeline)
	_rebuild_timeline(timeline)
	_rebuild_replay(_coerce_dictionary(_read_model.get("replay", {})))
	_rebuild_save_load(_coerce_dictionary(_read_model.get("saveLoad", {})))
	_rebuild_civil_cards(_coerce_array(_read_model.get("civilMemoryCards", [])))
	_rebuild_share_management()
	if _timeline_card_count == 0 and _save_slot_count == 0 and _history_card_count == 0:
		_root_column.add_child(_build_body_label(str(PLAYER_HISTORY_VISIBLE_LABELS.get("empty", "暂时没有新的天下纪事。")), true))

func _rebuild_share_management() -> void:
	_root_column.add_child(_build_section_label(str(PLAYER_HISTORY_VISIBLE_LABELS.get("shareManagement", "分享管理"))))
	if _share_management_summaries.is_empty():
		_root_column.add_child(_build_named_body_label("ShareManagementEmptyLabel", str(PLAYER_HISTORY_VISIBLE_LABELS.get("shareManagementEmpty", "暂无已开放分享")), false, 16))
		return
	var index := 0
	for share_value in _share_management_summaries:
		var share := _sanitize_share_management_summary(_coerce_dictionary(share_value))
		if share.is_empty():
			continue
		var panel := _build_card_panel("ShareManagementCard%02d" % (index + 1))
		var column := _card_column(panel)
		column.add_child(_build_body_label(str(share.get("eventTitle", "")).strip_edges(), true, 18))
		column.add_child(_build_body_label(_join_non_empty([
			str(share.get("shareStateLabel", "")).strip_edges(),
			str(share.get("shareRetentionLabel", "")).strip_edges(),
		], "　"), true))
		var share_id := str(share.get("shareId", "")).strip_edges()
		var status := str(share.get("status", "")).strip_edges()
		if share_id != "" and status == "active":
			var revoke_button := _build_action_button("ShareManagementRevokeButton%02d" % (index + 1), str(PLAYER_HISTORY_VISIBLE_LABELS.get("shareRevoke", "撤回")), "player_history_share_management_revoke")
			var feedback := _build_feedback_label("ShareManagementFeedback%02d" % (index + 1), PLAYER_HISTORY_MOTION_TOKEN)
			revoke_button.pressed.connect(_on_share_management_revoke_pressed.bind(feedback, share_id))
			column.add_child(revoke_button)
			column.add_child(feedback)
		_root_column.add_child(panel)
		index += 1

func _rebuild_timeline(timeline: Dictionary) -> void:
	_root_column.add_child(_build_section_label(str(PLAYER_HISTORY_VISIBLE_LABELS.get("timeline", "大事"))))
	var cards := _coerce_array(timeline.get("cards", []))
	var index := 0
	for card_value in cards:
		var card := _coerce_dictionary(card_value)
		if card.is_empty():
			continue
		var card_id := str(card.get("id", "")).strip_edges()
		if card_id != "":
			_timeline_cards_by_id[card_id] = card.duplicate(true)
		var visible_card := _sanitize_timeline_card_for_visible_copy(card)
		var panel := _build_card_panel("TimelineCard%02d" % (index + 1))
		var column := _card_column(panel)
		column.add_child(_build_body_label(_join_non_empty([
			str(visible_card.get("timestampBucket", "")).strip_edges(),
			str(visible_card.get("locationLabel", "")).strip_edges(),
			str(visible_card.get("actorName", "")).strip_edges(),
		], " · "), false))
		column.add_child(_build_body_label(str(visible_card.get("title", "")).strip_edges(), true, 22))
		column.add_child(_build_body_label(str(visible_card.get("summary", "")).strip_edges(), true))
		column.add_child(_build_body_label(_join_non_empty([
			str(visible_card.get("resultLabel", "")).strip_edges(),
			str(visible_card.get("consequenceLabel", "")).strip_edges(),
			str(visible_card.get("nextActionLabel", "")).strip_edges(),
		], "　"), true))
		var recovery_kind := str(visible_card.get("recoveryActionKind", "")).strip_edges()
		if recovery_kind != "":
			var recovery_token := _resolve_timeline_recovery_internal_token(recovery_kind, _coerce_dictionary(card.get("sourceRefs", {})))
			var recovery_focus_payload := _build_timeline_recovery_focus_payload(visible_card)
			var button := _build_action_button("TimelineCardRecoveryButton%02d" % (index + 1), str(PLAYER_HISTORY_VISIBLE_LABELS.get("openRelated", "查看")), "player_history_timeline_recovery")
			var feedback := _build_feedback_label("TimelineCardRecoveryFeedback%02d" % (index + 1), PLAYER_HISTORY_MOTION_TOKEN)
			button.pressed.connect(_on_timeline_recovery_pressed.bind(feedback, recovery_kind, recovery_token, recovery_focus_payload))
			column.add_child(button)
			column.add_child(feedback)
			_timeline_recovery_action_count += 1
		var share_event_id := _resolve_timeline_share_event_id(card)
		var share_state_label := str(card.get("shareStateLabel", "")).strip_edges()
		if share_event_id != "":
			var share_button := _build_action_button("TimelineCardShareButton%02d" % (index + 1), str(PLAYER_HISTORY_VISIBLE_LABELS.get("shareTimeline", "分享")), "player_history_timeline_share_token_issue")
			var share_feedback := _build_feedback_label("TimelineCardShareFeedback%02d" % (index + 1), PLAYER_HISTORY_MOTION_TOKEN)
			share_button.pressed.connect(_on_timeline_share_pressed.bind(share_feedback, share_event_id))
			var share_preview_button := _build_action_button("TimelineCardSharePreviewButton%02d" % (index + 1), str(PLAYER_HISTORY_VISIBLE_LABELS.get("shareHandoffPreview", "预览")), "player_history_timeline_share_handoff_preview")
			share_preview_button.pressed.connect(_on_timeline_share_handoff_preview_pressed.bind(share_feedback, share_event_id))
			var share_copy_button := _build_action_button("TimelineCardShareCopyButton%02d" % (index + 1), str(PLAYER_HISTORY_VISIBLE_LABELS.get("shareCopy", "复制")), "player_history_timeline_share_copy_clipboard")
			share_copy_button.pressed.connect(_on_timeline_share_copy_pressed.bind(share_feedback, share_event_id))
			column.add_child(share_button)
			column.add_child(share_preview_button)
			column.add_child(share_copy_button)
			column.add_child(share_feedback)
		elif share_state_label != "":
			column.add_child(_build_named_body_label("ShareUnavailableStateLabel%02d" % (index + 1), share_state_label, false, 16))
			_share_unavailable_card_count += 1
			_share_unavailable_feedback_text = share_state_label
		_root_column.add_child(panel)
		_apply_card_motion(panel, index)
		_timeline_card_count += 1
		index += 1

func _rebuild_notification_anchors(timeline: Dictionary) -> void:
	var anchors := _coerce_array(timeline.get("historyNotificationAnchors", []))
	if anchors.is_empty():
		return
	_root_column.add_child(_build_section_label(str(PLAYER_HISTORY_VISIBLE_LABELS.get("notifications", "提醒"))))
	var index := 0
	for anchor_value in anchors:
		var anchor := _sanitize_notification_anchor_for_visible_copy(_coerce_dictionary(anchor_value))
		if anchor.is_empty():
			continue
		var panel := _build_card_panel("NotificationAnchorCard%02d" % (index + 1))
		var column := _card_column(panel)
		column.add_child(_build_body_label(str(anchor.get("title", "")).strip_edges(), true, 20))
		column.add_child(_build_body_label(str(anchor.get("body", "")).strip_edges(), true))
		column.add_child(_build_body_label(str(anchor.get("cooldownLabel", "")).strip_edges(), false))
		var button := _build_action_button("NotificationAnchorOpenButton%02d" % (index + 1), str(anchor.get("actionLabel", "前往大事查看")).strip_edges(), "player_history_notification_anchor_open")
		var feedback := _build_feedback_label("NotificationAnchorFeedback%02d" % (index + 1), PLAYER_HISTORY_MOTION_TOKEN)
		button.pressed.connect(_on_notification_anchor_pressed.bind(feedback, anchor))
		var dismiss_button := _build_action_button("NotificationAnchorDismissButton%02d" % (index + 1), str(PLAYER_HISTORY_VISIBLE_LABELS.get("notificationDismiss", "知道了")).strip_edges(), "player_history_notification_anchor_dismiss")
		dismiss_button.pressed.connect(_on_notification_anchor_dismissed.bind(feedback, anchor))
		column.add_child(button)
		column.add_child(dismiss_button)
		column.add_child(feedback)
		_root_column.add_child(panel)
		_notification_anchor_count += 1
		_notification_anchor_action_count += 1
		index += 1

func _rebuild_live_preview(live_preview: Dictionary) -> void:
	var visible_preview := _sanitize_live_preview_for_visible_copy(live_preview)
	if visible_preview.is_empty():
		return
	_live_preview_visible = true
	_live_preview_backpressure_applied = bool(visible_preview.get("backpressureApplied", false))
	_live_preview_collapsed_feedback_text = str(visible_preview.get("collapsedFeedbackLabel", "")).strip_edges()
	_live_preview_dropped_count_label = str(visible_preview.get("droppedCountLabel", "")).strip_edges()
	_live_preview_card_count = int(visible_preview.get("previewCardCount", 0))
	_root_column.add_child(_build_section_label(str(PLAYER_HISTORY_VISIBLE_LABELS.get("livePreview", "新动态"))))
	var panel := _build_card_panel("LivePreviewSummaryCard")
	var column := _card_column(panel)
	column.add_child(_build_body_label(str(visible_preview.get("visibleStateLabel", "")).strip_edges(), true, 20))
	column.add_child(_build_body_label(_live_preview_collapsed_feedback_text, true))
	column.add_child(_build_body_label(_live_preview_dropped_count_label, false))
	_root_column.add_child(panel)

func _sanitize_live_preview_for_visible_copy(live_preview: Dictionary) -> Dictionary:
	var contract_id := str(live_preview.get("contractId", "")).strip_edges()
	if contract_id != "player_history_live_preview_v1":
		return {}
	if not bool(live_preview.get("enabled", false)):
		return {}
	if not bool(live_preview.get("optInRequired", false)):
		return {}
	if not bool(live_preview.get("rawStreamDefaultDenied", false)):
		return {}
	return {
		"visibleStateLabel": str(live_preview.get("visibleStateLabel", PLAYER_HISTORY_VISIBLE_LABELS.get("livePreviewReady", "实时预览已开启"))).strip_edges(),
		"collapsedFeedbackLabel": str(live_preview.get("collapsedFeedbackLabel", "更多新动态")).strip_edges(),
		"droppedCountLabel": str(live_preview.get("droppedCountLabel", "")).strip_edges(),
		"previewCardCount": int(live_preview.get("previewCardCount", 0)),
		"backpressureApplied": bool(live_preview.get("backpressureApplied", false)),
	}

func _sanitize_notification_anchor_for_visible_copy(anchor: Dictionary) -> Dictionary:
	var contract_id := str(anchor.get("contractId", "")).strip_edges()
	if contract_id != "player_history_notification_anchor_v1":
		return {}
	var durable_anchor := str(anchor.get("durableCardAnchor", "")).strip_edges()
	var access_state := _sanitize_notification_access_state(str(anchor.get("accessState", "open")).strip_edges())
	var access_feedback := _sanitize_notification_access_feedback(access_state, str(anchor.get("accessFeedbackLabel", "")).strip_edges())
	return {
		"title": str(anchor.get("title", "")).strip_edges(),
		"body": str(anchor.get("body", "")).strip_edges(),
		"actionLabel": str(anchor.get("actionLabel", "前往大事查看")).strip_edges(),
		"cooldownLabel": str(anchor.get("cooldownLabel", "")).strip_edges(),
		"accessState": access_state,
		"accessFeedbackLabel": access_feedback,
		"dedupeKey": str(anchor.get("dedupeKey", "")).strip_edges(),
		"durableCardAnchor": durable_anchor,
	}

func _sanitize_notification_access_state(access_state: String) -> String:
	var resolved := access_state.strip_edges()
	if resolved == "private" or resolved == "denied":
		return resolved
	return "open"

func _sanitize_notification_access_feedback(access_state: String, access_feedback: String) -> String:
	var safe_feedback := access_feedback.strip_edges()
	if safe_feedback != "":
		return safe_feedback
	if access_state == "private":
		return str(PLAYER_HISTORY_VISIBLE_LABELS.get("notificationPrivate", "这条提醒暂时不可查看"))
	if access_state == "denied":
		return str(PLAYER_HISTORY_VISIBLE_LABELS.get("notificationDenied", "这条提醒需要更高权限"))
	return str(PLAYER_HISTORY_VISIBLE_LABELS.get("notificationReady", "已定位提醒"))

func _sanitize_timeline_card_for_visible_copy(card: Dictionary) -> Dictionary:
	var source_refs := _coerce_dictionary(card.get("sourceRefs", {}))
	var source_refs_internal_only := not source_refs.is_empty() \
		and str(source_refs.get("visibility", "")).strip_edges() == "internal_link_only" \
		and not bool(source_refs.get("visible", true))
	var recovery_kind := _resolve_timeline_recovery_action_kind(source_refs, str(card.get("category", "")).strip_edges()) if source_refs_internal_only else ""
	var visible_payload := {
		"timestampBucket": str(card.get("timestampBucket", "")).strip_edges(),
		"locationLabel": str(card.get("locationLabel", "")).strip_edges(),
		"actorName": str(card.get("actorName", "")).strip_edges(),
		"title": str(card.get("title", "")).strip_edges(),
		"summary": str(card.get("summary", "")).strip_edges(),
		"resultLabel": str(card.get("resultLabel", "")).strip_edges(),
		"consequenceLabel": str(card.get("consequenceLabel", "")).strip_edges(),
		"nextActionLabel": str(card.get("nextActionLabel", "")).strip_edges(),
		"sourceRefsInternalOnly": source_refs_internal_only,
		"recoveryActionKind": recovery_kind,
	}
	if recovery_kind == "ai_activity":
		var denied_recovery_kind := _resolve_ai_proposal_denied_recovery_kind(visible_payload)
		if denied_recovery_kind != "":
			recovery_kind = denied_recovery_kind
			visible_payload["recoveryActionKind"] = recovery_kind
		else:
			var proposal_recovery_kind := _resolve_ai_proposal_apply_recovery_kind(visible_payload)
			if proposal_recovery_kind != "":
				recovery_kind = proposal_recovery_kind
				visible_payload["recoveryActionKind"] = recovery_kind
			else:
				var execution_receipt_recovery_kind := _resolve_ai_execution_receipt_recovery_kind(visible_payload)
				if execution_receipt_recovery_kind != "":
					recovery_kind = execution_receipt_recovery_kind
					visible_payload["recoveryActionKind"] = recovery_kind
	if recovery_kind != "":
		_register_timeline_recovery_internal_token(recovery_kind, source_refs)
		_register_timeline_recovery_focus_payload(recovery_kind, visible_payload)
	return visible_payload

func _register_timeline_recovery_internal_token(recovery_kind: String, source_refs: Dictionary) -> void:
	var resolved_kind := recovery_kind.strip_edges()
	if resolved_kind == "" or _timeline_recovery_internal_tokens_by_kind.has(resolved_kind):
		return
	var token := _resolve_timeline_recovery_internal_token(resolved_kind, source_refs)
	if token != "":
		_timeline_recovery_internal_tokens_by_kind[resolved_kind] = token

func get_timeline_recovery_internal_token(recovery_kind: String) -> String:
	var resolved_kind := recovery_kind.strip_edges()
	if resolved_kind != "" and resolved_kind == _timeline_recovery_selected_kind and _timeline_recovery_selected_internal_token.strip_edges() != "":
		return _timeline_recovery_selected_internal_token.strip_edges()
	return str(_timeline_recovery_internal_tokens_by_kind.get(resolved_kind, "")).strip_edges()

func _register_timeline_recovery_focus_payload(recovery_kind: String, visible_payload: Dictionary) -> void:
	var resolved_kind := recovery_kind.strip_edges()
	if resolved_kind == "" or _timeline_recovery_focus_payloads_by_kind.has(resolved_kind):
		return
	_timeline_recovery_focus_payloads_by_kind[resolved_kind] = _build_timeline_recovery_focus_payload(visible_payload)

func _build_timeline_recovery_focus_payload(visible_payload: Dictionary) -> Dictionary:
	return {
		"title": str(visible_payload.get("title", "")).strip_edges(),
		"summary": str(visible_payload.get("summary", "")).strip_edges(),
		"resultLabel": str(visible_payload.get("resultLabel", "")).strip_edges(),
		"consequenceLabel": str(visible_payload.get("consequenceLabel", "")).strip_edges(),
		"nextActionLabel": str(visible_payload.get("nextActionLabel", "")).strip_edges(),
	}

func _show_timeline_recovery_focused_receipt(recovery_kind: String, focus_payload: Dictionary, feedback_text: String) -> Dictionary:
	var resolved_kind := recovery_kind.strip_edges()
	var payload := _build_timeline_recovery_focus_payload(focus_payload)
	var resolved_feedback := feedback_text.strip_edges()
	if resolved_feedback == "":
		resolved_feedback = str(PLAYER_HISTORY_VISIBLE_LABELS.get("recoveryReady", "已定位相关记录"))
	var existing := find_child("TimelineRecoveryFocusedReceipt", true, false)
	if existing != null and is_instance_valid(existing) and existing.get_parent() != null:
		existing.get_parent().remove_child(existing)
		existing.queue_free()
	var panel := _build_card_panel("TimelineRecoveryFocusedReceipt")
	var focused_token := PLAYER_HISTORY_AI_EXECUTION_RECEIPT_FOCUSED_TOKEN if resolved_kind == "ai_execution_receipt" else PLAYER_HISTORY_AI_PROPOSAL_DENIED_FOCUSED_RECEIPT_TOKEN
	panel.set_meta("player_history_ai_focused_receipt_token", focused_token)
	if resolved_kind == "ai_execution_receipt":
		panel.custom_minimum_size.y = 700.0
	var column := _card_column(panel)
	column.add_child(_build_named_body_label("TimelineRecoveryFocusedReceiptLabel", str(PLAYER_HISTORY_VISIBLE_LABELS.get("aiReceipt", "AI 行动收据")), false, 18))
	column.add_child(_build_named_body_label("TimelineRecoveryFocusedReceiptTitle", str(payload.get("title", "")).strip_edges(), true, 24))
	column.add_child(_build_named_body_label("TimelineRecoveryFocusedReceiptSummary", str(payload.get("summary", "")).strip_edges(), true, 18))
	column.add_child(_build_named_body_label("TimelineRecoveryFocusedReceiptResult", _join_non_empty([
		str(payload.get("resultLabel", "")).strip_edges(),
		str(payload.get("consequenceLabel", "")).strip_edges(),
		str(payload.get("nextActionLabel", "")).strip_edges(),
	], "　"), true, 18))
	column.add_child(_build_named_body_label("TimelineRecoveryFocusedReceiptFeedback", resolved_feedback, true, 18))
	var followup_button := _build_action_button("TimelineRecoveryFocusedReceiptFollowupButton", str(PLAYER_HISTORY_VISIBLE_LABELS.get("aiReceiptFollowup", "查看 AI 活动")), "player_history_ai_receipt_followup")
	var followup_feedback := _build_feedback_label("TimelineRecoveryFocusedReceiptFollowupFeedback", PLAYER_HISTORY_MOTION_TOKEN)
	followup_button.pressed.connect(_on_timeline_recovery_pressed.bind(followup_feedback, resolved_kind, get_timeline_recovery_internal_token(resolved_kind), payload))
	column.add_child(followup_button)
	column.add_child(followup_feedback)
	_root_column.add_child(panel)
	if _root_column.get_child_count() > 1:
		_root_column.move_child(panel, 1)
	_timeline_recovery_focused_receipt_visible = true
	_timeline_recovery_focused_receipt_kind = resolved_kind
	_timeline_recovery_focused_receipt_feedback = resolved_feedback
	return {
		"visible": true,
		"kind": resolved_kind,
		"feedback": resolved_feedback,
		"token": focused_token,
	}

func get_timeline_recovery_focus_payload(recovery_kind: String) -> Dictionary:
	var resolved_kind := recovery_kind.strip_edges()
	if resolved_kind != "" and resolved_kind == _timeline_recovery_selected_kind and not _timeline_recovery_selected_focus_payload.is_empty():
		return _timeline_recovery_selected_focus_payload.duplicate(true)
	var payload_variant: Variant = _timeline_recovery_focus_payloads_by_kind.get(resolved_kind, {})
	if payload_variant is Dictionary:
		return (payload_variant as Dictionary).duplicate(true)
	return {}

func _resolve_timeline_recovery_internal_token(recovery_kind: String, source_refs: Dictionary) -> String:
	match recovery_kind.strip_edges():
		"replay":
			return str(source_refs.get("replayRequestId", "")).strip_edges()
		"battle_report":
			return str(source_refs.get("battleReportId", "")).strip_edges()
		"save":
			return str(source_refs.get("saveSlotId", "")).strip_edges()
		"civil_memory":
			return str(source_refs.get("civilMemoryId", "")).strip_edges()
		"world_event":
			return str(source_refs.get("worldEventId", "")).strip_edges()
		"ai_activity":
			return str(source_refs.get("worldEventId", "")).strip_edges()
		"ai_proposal_apply":
			return str(source_refs.get("worldEventId", "")).strip_edges()
		"ai_proposal_denied":
			return str(source_refs.get("worldEventId", "")).strip_edges()
		"ai_execution_receipt":
			return str(source_refs.get("worldEventId", "")).strip_edges()
	return ""

func _resolve_timeline_recovery_action_kind(source_refs: Dictionary, category: String = "") -> String:
	if str(source_refs.get("replayRequestId", "")).strip_edges() != "":
		return "replay"
	if str(source_refs.get("battleReportId", "")).strip_edges() != "":
		return "battle_report"
	if str(source_refs.get("saveSlotId", "")).strip_edges() != "":
		return "save"
	if str(source_refs.get("civilMemoryId", "")).strip_edges() != "":
		return "civil_memory"
	if str(source_refs.get("worldEventId", "")).strip_edges() != "":
		if category.strip_edges() == "ai_activity":
			return "ai_activity"
		return "world_event"
	return ""

func _resolve_ai_proposal_apply_recovery_kind(visible_payload: Dictionary) -> String:
	var title := str(visible_payload.get("title", "")).strip_edges()
	var next_action_label := str(visible_payload.get("nextActionLabel", "")).strip_edges()
	if next_action_label == "处理提案":
		return "ai_proposal_apply"
	if title.find("AI 提案") >= 0:
		return "ai_proposal_apply"
	return ""

func _resolve_ai_proposal_denied_recovery_kind(visible_payload: Dictionary) -> String:
	var title := str(visible_payload.get("title", "")).strip_edges()
	var summary := str(visible_payload.get("summary", "")).strip_edges()
	var result_label := str(visible_payload.get("resultLabel", "")).strip_edges()
	var consequence_label := str(visible_payload.get("consequenceLabel", "")).strip_edges()
	var next_action_label := str(visible_payload.get("nextActionLabel", "")).strip_edges()
	if title == "AI 行动受阻" and next_action_label == "查看 AI 活动":
		return "ai_proposal_denied"
	if title.find("AI 行动受阻") >= 0:
		return "ai_proposal_denied"
	if summary.find("拒绝") >= 0 or summary.find("受阻") >= 0:
		return "ai_proposal_denied"
	if result_label.find("受阻") >= 0 or result_label.find("拒绝") >= 0:
		return "ai_proposal_denied"
	if consequence_label.find("AI 活动") >= 0 and next_action_label == "查看 AI 活动":
		return "ai_proposal_denied"
	return ""

func _resolve_ai_execution_receipt_recovery_kind(visible_payload: Dictionary) -> String:
	var title := str(visible_payload.get("title", "")).strip_edges()
	var next_action_label := str(visible_payload.get("nextActionLabel", "")).strip_edges()
	var result_label := str(visible_payload.get("resultLabel", "")).strip_edges()
	if title == "AI 行动已完成" and next_action_label == "查看 AI 活动":
		return "ai_execution_receipt"
	if title.find("AI 行动") >= 0 and (result_label.find("已完成") >= 0 or result_label.find("已执行") >= 0):
		return "ai_execution_receipt"
	return ""

func _resolve_timeline_share_event_id(card: Dictionary) -> String:
	var share_policy := str(card.get("sharePolicy", "")).strip_edges()
	if share_policy != "explicit_spectator":
		return ""
	var source_refs := _coerce_dictionary(card.get("sourceRefs", {}))
	return str(source_refs.get("worldEventId", "")).strip_edges()

func _rebuild_replay(replay: Dictionary) -> void:
	var frames := _coerce_array(replay.get("frames", []))
	_replay_frame_count = frames.size()
	_replay_unavailable_copy_visible = frames.is_empty() and _dedicated_replay_mode_active
	if frames.is_empty():
		if _dedicated_replay_mode_active:
			_root_column.add_child(_build_section_label(str(PLAYER_HISTORY_VISIBLE_LABELS.get("replay", "复盘"))))
			_root_column.add_child(_build_named_body_label("ReplayUnavailableLabel", str(PLAYER_HISTORY_VISIBLE_LABELS.get("replayUnavailable", "回放已不可用")), true, 18))
			_root_column.add_child(_build_replay_close_button())
		return
	_root_column.add_child(_build_section_label(str(PLAYER_HISTORY_VISIBLE_LABELS.get("replay", "复盘"))))
	_root_column.add_child(_build_named_body_label("ReplayFrameCountLabel", str(replay.get("frameCountLabel", "")).strip_edges(), true, 18))
	_root_column.add_child(_build_named_body_label("ReplayInspectionHintLabel", str(replay.get("inspectionHintLabel", "")).strip_edges(), true, 18))
	_root_column.add_child(_build_named_body_label("ReplayScrubHintLabel", str(replay.get("timelineScrubLabel", "")).strip_edges(), true, 18))
	_replay_round_focus_label = _resolve_replay_round_focus_label(frames)
	_root_column.add_child(_build_named_body_label("ReplayRoundFocusLabel", _replay_round_focus_label, true, 18))
	if _dedicated_replay_mode_active:
		_root_column.add_child(_build_replay_close_button())
	_root_column.add_child(_build_replay_control_row(_coerce_dictionary(replay.get("controls", {}))))
	_replay_current_frame_label = _build_named_body_label("ReplayCurrentFrameLabel", "", true, 18)
	_root_column.add_child(_replay_current_frame_label)
	_replay_interaction_feedback_label = _build_feedback_label("ReplayInteractionFeedbackLabel", PLAYER_HISTORY_REPLAY_INTERACTION_MOTION_TOKEN)
	_root_column.add_child(_replay_interaction_feedback_label)
	_update_replay_interaction_labels(false)
	var frame_index := 0
	for frame_value in frames.slice(0, mini(frames.size(), 3)):
		var frame := _coerce_dictionary(frame_value)
		var panel := _build_card_panel("ReplayFrame%02d" % (frame_index + 1))
		var column := _card_column(panel)
		var frame_title := str(frame.get("frameTitle", frame.get("title", ""))).strip_edges()
		column.add_child(_build_body_label(frame_title, true, 22))
		column.add_child(_build_body_label(_join_non_empty([
			str(frame.get("actorLabel", frame.get("actorName", ""))).strip_edges(),
			str(frame.get("actionLabel", "")).strip_edges(),
			str(frame.get("effectLabel", "")).strip_edges(),
		], "　"), true))
		var button := _build_action_button("ReplayFrameInspectButton%02d" % (frame_index + 1), str(PLAYER_HISTORY_VISIBLE_LABELS.get("watchReplay", "观看")), "player_history_replay_inspect")
		var feedback := _build_feedback_label("ReplayFrameInspectFeedback%02d" % (frame_index + 1), PLAYER_HISTORY_REPLAY_INSPECTION_TOKEN)
		button.pressed.connect(_on_player_history_feedback_pressed.bind(feedback, str(PLAYER_HISTORY_VISIBLE_LABELS.get("inspectReady", "已打开检查"))))
		column.add_child(button)
		column.add_child(feedback)
		_root_column.add_child(panel)
		_apply_card_motion(panel, frame_index)
		frame_index += 1

func _rebuild_save_load(save_load: Dictionary) -> void:
	_root_column.add_child(_build_section_label(str(PLAYER_HISTORY_VISIBLE_LABELS.get("saveLoad", "存档"))))
	_root_column.add_child(_build_named_body_label("SaveLoadRiskLabel", str(save_load.get("restoreRiskLabel", "")).strip_edges(), true, 18))
	var restore_feedback_label := str(save_load.get("restoreFeedbackLabel", "")).strip_edges()
	if restore_feedback_label != "":
		_root_column.add_child(_build_named_body_label("SaveLoadFeedbackLabel", restore_feedback_label, true, 18))
	var slots := _coerce_array(save_load.get("slots", []))
	if slots.is_empty():
		_root_column.add_child(_build_named_body_label("SaveLoadEmptyStateLabel", str(save_load.get("emptyStateLabel", "")).strip_edges(), true, 18))
		return
	var index := 0
	for slot_value in slots:
		var slot := _coerce_dictionary(slot_value)
		if slot.is_empty():
			continue
		var slot_summary := {
			"slotId": str(slot.get("slotId", "")).strip_edges(),
			"slotLabel": str(slot.get("slotLabel", "")).strip_edges(),
			"savedAtLabel": str(slot.get("savedAtLabel", "")).strip_edges(),
			"riskHint": str(slot.get("riskHint", "")).strip_edges(),
			"restorePreviewLabel": str(slot.get("restorePreviewLabel", "")).strip_edges(),
		}
		_save_slot_summaries.append(slot_summary)
		var panel := _build_card_panel("SaveSlotCard%02d" % (index + 1))
		var column := _card_column(panel)
		column.add_child(_build_body_label(str(slot.get("slotLabel", "")).strip_edges(), true, 22))
		column.add_child(_build_body_label(_join_non_empty([
			str(slot.get("savedAtLabel", "")).strip_edges(),
			str(slot.get("worldSummary", "")).strip_edges(),
		], "　"), true))
		column.add_child(_build_body_label(_join_non_empty([
			str(slot.get("riskHint", "")).strip_edges(),
			str(slot.get("restorePreviewLabel", "")).strip_edges(),
		], "　"), true))
		var button := _build_action_button("SaveSlotRestoreButton%02d" % (index + 1), str(PLAYER_HISTORY_VISIBLE_LABELS.get("restore", "恢复")), "player_history_save_restore")
		var feedback := _build_feedback_label("SaveSlotRestoreFeedback%02d" % (index + 1), PLAYER_HISTORY_SAVE_RESTORE_FEEDBACK_TOKEN)
		button.pressed.connect(_on_save_slot_restore_pressed.bind(feedback, slot_summary))
		column.add_child(button)
		column.add_child(feedback)
		_root_column.add_child(panel)
		_apply_card_motion(panel, index)
		_save_slot_count += 1
		_restore_feedback_count += 1
		index += 1

func _rebuild_civil_cards(cards: Array) -> void:
	if cards.is_empty():
		return
	_root_column.add_child(_build_section_label(str(PLAYER_HISTORY_VISIBLE_LABELS.get("civilMemory", "传闻"))))
	var index := 0
	for card_value in cards:
		var card := _coerce_dictionary(card_value)
		if card.is_empty():
			continue
		var panel := _build_card_panel("HistoryCard%02d" % (index + 1))
		var column := _card_column(panel)
		column.add_child(_build_body_label(str(card.get("title", "")).strip_edges(), true, 22))
		column.add_child(_build_body_label(_join_non_empty([
			str(card.get("causeLabel", "")).strip_edges(),
			str(card.get("affectedPartyLabel", "")).strip_edges(),
			str(card.get("currentImpactLabel", "")).strip_edges(),
			str(card.get("suggestedFollowUpLabel", "")).strip_edges(),
		], "　"), true))
		_root_column.add_child(panel)
		_apply_card_motion(panel, index)
		_history_card_count += 1
		index += 1

func _build_title_label(text: String) -> Label:
	var label := _build_body_label(text, false, 30)
	label.name = "PlayerHistoryTitleLabel"
	return label

func _build_section_label(text: String) -> Label:
	var label := _build_body_label(text, false, 24)
	label.name = "PlayerHistorySectionLabel"
	return label

func _build_body_label(text: String, wrap: bool = true, font_size: int = 18) -> Label:
	var label := Label.new()
	label.text = text if text.strip_edges() != "" else " "
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if wrap else TextServer.AUTOWRAP_OFF
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.add_theme_font_size_override("font_size", font_size)
	return label

func _build_named_body_label(node_name: String, text: String, wrap: bool = true, font_size: int = 18) -> Label:
	var label := _build_body_label(text, wrap, font_size)
	label.name = node_name
	_control_node_names.append(node_name)
	return label

func _build_card_panel(node_name: String) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.name = node_name
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.set_meta("player_history_card_motion_token", PLAYER_HISTORY_MOTION_TOKEN)
	var margin := MarginContainer.new()
	margin.name = "CardMargin"
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 14)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 14)
	var column := VBoxContainer.new()
	column.name = "CardColumn"
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)
	panel.add_child(margin)
	return panel

func _card_column(panel: PanelContainer) -> VBoxContainer:
	return panel.get_node("CardMargin/CardColumn") as VBoxContainer

func _build_action_button(node_name: String, text: String, action_id: String) -> Button:
	var button := Button.new()
	button.name = node_name
	button.text = text
	button.custom_minimum_size = Vector2(148, 52)
	button.set_meta("player_history_action_id", action_id)
	button.set_meta("player_history_style_owner", PLAYER_HISTORY_PANEL_STYLE_OWNER)
	_button_node_names.append(node_name)
	return button

func _build_replay_control_row(controls: Dictionary) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.name = "ReplayActionFrameControlRow"
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 8)
	row.set_meta("player_history_replay_inspection_token", PLAYER_HISTORY_REPLAY_INSPECTION_TOKEN)
	_add_replay_control_button(row, "ReplayPauseButton", str(PLAYER_HISTORY_VISIBLE_LABELS.get("pause", "暂停")), "player_history_replay_pause", bool(controls.get("canPause", true)))
	_add_replay_control_button(row, "ReplayStepBackButton", str(PLAYER_HISTORY_VISIBLE_LABELS.get("previous", "上一步")), "player_history_replay_step_back", bool(controls.get("canStepBackward", true)))
	_add_replay_control_button(row, "ReplayStepForwardButton", str(PLAYER_HISTORY_VISIBLE_LABELS.get("next", "下一步")), "player_history_replay_step_forward", bool(controls.get("canStepForward", true)))
	var scrub := HSlider.new()
	scrub.name = "ReplayFrameScrubSlider"
	scrub.custom_minimum_size = Vector2(220, 44)
	scrub.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scrub.min_value = 0
	scrub.max_value = maxi(0, _replay_frame_count - 1)
	scrub.step = 1
	scrub.editable = bool(controls.get("canScrub", true))
	scrub.set_meta("player_history_action_id", "player_history_replay_scrub")
	scrub.set_meta("player_history_replay_inspection_token", PLAYER_HISTORY_REPLAY_INSPECTION_TOKEN)
	scrub.set_meta("player_history_replay_interaction_motion_token", PLAYER_HISTORY_REPLAY_INTERACTION_MOTION_TOKEN)
	scrub.value_changed.connect(_on_replay_scrub_changed)
	row.add_child(scrub)
	_replay_scrub_slider = scrub
	_control_node_names.append(scrub.name)
	return row

func _build_replay_close_button() -> Button:
	var button := _build_action_button("ReplayCloseButton", str(PLAYER_HISTORY_VISIBLE_LABELS.get("closeReplay", "回到战报")), "player_history_replay_close")
	button.set_meta("player_history_dedicated_replay_mode_token", PLAYER_HISTORY_DEDICATED_REPLAY_MODE_TOKEN)
	button.pressed.connect(close_dedicated_replay_mode)
	return button

func _resolve_replay_round_focus_label(frames: Array) -> String:
	for frame_value in frames:
		var frame := _coerce_dictionary(frame_value)
		var focus := _join_non_empty([
			str(frame.get("roundContextLabel", "")).strip_edges(),
			str(frame.get("mapContextLabel", "")).strip_edges(),
		], " · ")
		if focus.strip_edges() != "":
			return focus
	return "战况回合"

func _add_replay_control_button(row: HBoxContainer, node_name: String, text: String, action_id: String, enabled: bool) -> void:
	var button := _build_action_button(node_name, text, action_id)
	button.disabled = not enabled
	button.set_meta("player_history_replay_inspection_token", PLAYER_HISTORY_REPLAY_INSPECTION_TOKEN)
	button.set_meta("player_history_replay_interaction_motion_token", PLAYER_HISTORY_REPLAY_INTERACTION_MOTION_TOKEN)
	if action_id == "player_history_replay_pause":
		button.pressed.connect(_on_replay_pause_pressed)
	elif action_id == "player_history_replay_step_back":
		button.pressed.connect(_on_replay_step_pressed.bind(-1))
	elif action_id == "player_history_replay_step_forward":
		button.pressed.connect(_on_replay_step_pressed.bind(1))
	row.add_child(button)
	_control_node_names.append(node_name)

func _build_feedback_label(node_name: String, token: String) -> Label:
	var label := _build_body_label(" ", true, 16)
	label.name = node_name
	label.set_meta("player_history_feedback_token", token)
	_control_node_names.append(node_name)
	return label

func _on_player_history_feedback_pressed(feedback_label: Label, message: String) -> void:
	if feedback_label == null or not is_instance_valid(feedback_label):
		return
	feedback_label.text = message
	PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(feedback_label)

func _on_timeline_recovery_pressed(feedback_label: Label, recovery_kind: String, selected_internal_token: String = "", selected_focus_payload: Dictionary = {}) -> void:
	_timeline_recovery_source_kind = recovery_kind.strip_edges()
	_timeline_recovery_selected_kind = _timeline_recovery_source_kind
	_timeline_recovery_selected_internal_token = selected_internal_token.strip_edges()
	_timeline_recovery_selected_focus_payload = _build_timeline_recovery_focus_payload(selected_focus_payload) if not selected_focus_payload.is_empty() else {}
	_timeline_recovery_feedback_text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("recoveryReady", "已定位相关记录"))
	_timeline_recovery_signal_kind = _timeline_recovery_source_kind
	_timeline_recovery_signal_count += 1
	emit_signal("timeline_recovery_requested", _timeline_recovery_signal_kind)
	if feedback_label != null and is_instance_valid(feedback_label):
		feedback_label.text = _timeline_recovery_feedback_text
		PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(feedback_label)

func _on_notification_anchor_pressed(feedback_label: Label, anchor: Dictionary) -> void:
	var access_state := _sanitize_notification_access_state(str(anchor.get("accessState", "open")).strip_edges())
	if access_state != "open":
		_notification_anchor_selected_durable_card_resolved = false
		_notification_anchor_feedback_text = _sanitize_notification_access_feedback(access_state, str(anchor.get("accessFeedbackLabel", "")).strip_edges())
		if access_state == "private":
			_notification_anchor_private_feedback_count += 1
		if access_state == "denied":
			_notification_anchor_denied_feedback_count += 1
		if feedback_label != null and is_instance_valid(feedback_label):
			feedback_label.text = _notification_anchor_feedback_text
			PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(feedback_label)
		return
	var durable_anchor := str(anchor.get("durableCardAnchor", "")).strip_edges()
	var card := _resolve_timeline_card_from_durable_anchor(durable_anchor)
	_notification_anchor_selected_durable_card_resolved = not card.is_empty()
	if card.is_empty():
		_notification_anchor_feedback_text = "这条提醒暂时无法定位"
		if feedback_label != null and is_instance_valid(feedback_label):
			feedback_label.text = _notification_anchor_feedback_text
			PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(feedback_label)
		return
	var visible_card := _sanitize_timeline_card_for_visible_copy(card)
	var recovery_kind := str(visible_card.get("recoveryActionKind", "")).strip_edges()
	if recovery_kind == "":
		_notification_anchor_feedback_text = "已定位提醒"
		if feedback_label != null and is_instance_valid(feedback_label):
			feedback_label.text = _notification_anchor_feedback_text
			PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(feedback_label)
		return
	var source_refs := _coerce_dictionary(card.get("sourceRefs", {}))
	var recovery_token := _resolve_timeline_recovery_internal_token(recovery_kind, source_refs)
	var recovery_payload := _build_timeline_recovery_focus_payload(visible_card)
	_notification_anchor_feedback_text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("notificationReady", "已定位提醒"))
	_on_timeline_recovery_pressed(feedback_label, recovery_kind, recovery_token, recovery_payload)

func _on_notification_anchor_dismissed(feedback_label: Label, anchor: Dictionary) -> void:
	var dedupe_key := str(anchor.get("dedupeKey", "")).strip_edges()
	if dedupe_key != "" and not _dismissed_notification_dedupe_keys.has(dedupe_key):
		_dismissed_notification_dedupe_keys.append(dedupe_key)
		_notification_anchor_dismiss_refresh_requested_count += 1
		call_deferred("_refresh_after_notification_dismissal")
	_notification_anchor_dismissed_count += 1
	_notification_anchor_feedback_text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("notificationDismissed", "已收起提醒"))
	if feedback_label != null and is_instance_valid(feedback_label):
		feedback_label.text = _notification_anchor_feedback_text
		PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(feedback_label)

func _refresh_after_notification_dismissal() -> void:
	if _notification_anchor_dismiss_refresh_in_flight:
		return
	_notification_anchor_dismiss_refresh_in_flight = true
	await refresh_from_backend()
	_notification_anchor_dismiss_refresh_in_flight = false

func _on_timeline_share_pressed(feedback_label: Label, event_id: String) -> void:
	_share_issue_requested_count += 1
	var resolved_event_id := event_id.strip_edges()
	if resolved_event_id == "":
		_share_issue_feedback_text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("shareUnavailable", "暂时无法分享"))
		if feedback_label != null and is_instance_valid(feedback_label):
			feedback_label.text = _share_issue_feedback_text
			PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(feedback_label)
		return
	call_deferred("_issue_timeline_share_token", feedback_label, resolved_event_id)

func _issue_timeline_share_token(feedback_label: Label, event_id: String) -> void:
	if _backend_api_client == null:
		_backend_api_client = BACKEND_API_CLIENT_SCRIPT.new()
		add_child(_backend_api_client)
		if _backend_api_client.has_method("configure"):
			_backend_api_client.call("configure", AppConfig.backend_base_url)
	var response: Dictionary = await _backend_api_client.post_player_history_share_token(event_id, "player", 300000)
	var data := _coerce_dictionary(response.get("data", {}))
	if bool(response.get("ok", false)) and str(data.get("shareToken", "")).strip_edges() != "":
		var issued_token := str(data.get("shareToken", "")).strip_edges()
		_share_issue_success_count += 1
		_share_issue_scope = str(data.get("sharedScope", "")).strip_edges()
		_share_issue_retention_label = str(data.get("shareRetentionLabel", "")).strip_edges()
		_share_tokens_by_event_id[event_id] = issued_token
		_share_handoff_ready_count += 1
		_share_handoff_retention_label = _share_issue_retention_label
		_share_handoff_feedback_text = "%s　%s" % [
			str(PLAYER_HISTORY_VISIBLE_LABELS.get("shareHandoffReady", "分享已准备")),
			_share_handoff_retention_label,
		]
		_share_issue_feedback_text = str(data.get("shareStateLabel", PLAYER_HISTORY_VISIBLE_LABELS.get("shareReady", "已开放只读纪事"))).strip_edges()
	else:
		_share_issue_feedback_text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("shareUnavailable", "暂时无法分享"))
		_share_handoff_feedback_text = _share_issue_feedback_text
	if feedback_label != null and is_instance_valid(feedback_label):
		feedback_label.text = _share_handoff_feedback_text if _share_handoff_feedback_text.strip_edges() != "" else _share_issue_feedback_text
		PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(feedback_label)

func _on_timeline_share_handoff_preview_pressed(feedback_label: Label, event_id: String) -> void:
	_share_handoff_preview_requested_count += 1
	var resolved_event_id := event_id.strip_edges()
	var issued_token := str(_share_tokens_by_event_id.get(resolved_event_id, "")).strip_edges()
	if issued_token == "":
		_share_handoff_preview_active = false
		_share_handoff_feedback_text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("shareUnavailable", "暂时无法分享"))
		if feedback_label != null and is_instance_valid(feedback_label):
			feedback_label.text = _share_handoff_feedback_text
			PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(feedback_label)
		return
	await open_shared_player_history(issued_token, 80)
	_share_handoff_preview_active = _shared_history_read_active
	if _share_handoff_preview_active:
		_share_handoff_preview_success_count += 1
		_share_handoff_feedback_text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("shareHandoffPreviewReady", "只读预览已打开"))
	else:
		_share_handoff_feedback_text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("sharedReadUnavailable", "这段纪事暂时无法查看"))
	if feedback_label != null and is_instance_valid(feedback_label):
		feedback_label.text = _share_handoff_feedback_text
		PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(feedback_label)

func _on_timeline_share_copy_pressed(feedback_label: Label, event_id: String) -> void:
	_share_copy_requested_count += 1
	var resolved_event_id := event_id.strip_edges()
	var issued_token := str(_share_tokens_by_event_id.get(resolved_event_id, "")).strip_edges()
	if issued_token == "":
		_share_copy_feedback_text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("shareUnavailable", "暂时无法分享"))
		if feedback_label != null and is_instance_valid(feedback_label):
			feedback_label.text = _share_copy_feedback_text
			PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(feedback_label)
		return
	DisplayServer.clipboard_set(issued_token)
	_share_copy_success_count += 1
	_share_copy_feedback_text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("shareCopied", "分享口令已复制"))
	if feedback_label != null and is_instance_valid(feedback_label):
		feedback_label.text = _share_copy_feedback_text
		PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(feedback_label)

func _on_share_management_revoke_pressed(feedback_label: Label, share_id: String) -> void:
	var resolved_share_id := share_id.strip_edges()
	if resolved_share_id == "":
		_share_management_feedback_text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("shareUnavailable", "暂时无法分享"))
		if feedback_label != null and is_instance_valid(feedback_label):
			feedback_label.text = _share_management_feedback_text
			PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(feedback_label)
		return
	if _backend_api_client == null:
		_backend_api_client = BACKEND_API_CLIENT_SCRIPT.new()
		add_child(_backend_api_client)
		if _backend_api_client.has_method("configure"):
			_backend_api_client.call("configure", AppConfig.backend_base_url)
	var response: Dictionary = await _backend_api_client.delete_player_history_share_token(resolved_share_id, "player")
	var data := _coerce_dictionary(response.get("data", {}))
	if bool(response.get("ok", false)):
		_share_management_revoked_count += 1
		_share_management_last_status_label = str(data.get("shareStateLabel", PLAYER_HISTORY_VISIBLE_LABELS.get("shareRevoked", "已撤回只读纪事"))).strip_edges()
		_share_management_last_retention_label = str(data.get("shareRetentionLabel", "分享已撤回")).strip_edges()
		_share_management_feedback_text = _share_management_last_status_label
		await refresh_share_management()
	else:
		_share_management_feedback_text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("shareUnavailable", "暂时无法分享"))
	if feedback_label != null and is_instance_valid(feedback_label):
		feedback_label.text = _share_management_feedback_text
		PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(feedback_label)

func _resolve_timeline_card_from_durable_anchor(durable_anchor: String) -> Dictionary:
	var resolved_anchor := durable_anchor.strip_edges()
	if not resolved_anchor.begins_with("timeline-card:"):
		return {}
	var card_id := resolved_anchor.trim_prefix("timeline-card:").strip_edges()
	if card_id == "":
		return {}
	return _coerce_dictionary(_timeline_cards_by_id.get(card_id, {}))

func run_timeline_recovery_action_smoke() -> Dictionary:
	var feedback_label: Label = null
	var target := find_child("TimelineCardRecoveryFeedback01", true, false)
	if target is Label:
		feedback_label = target as Label
	_on_timeline_recovery_pressed(feedback_label, "replay")
	var ok := _timeline_recovery_feedback_text.strip_edges() != "" and _timeline_recovery_source_kind.strip_edges() != ""
	return {
		"ok": ok,
		"reason": "timeline_recovery_action_verified" if ok else "timeline_recovery_action_failed",
		"timelineRecoveryActionCount": _timeline_recovery_action_count,
		"timelineRecoveryFeedbackText": _timeline_recovery_feedback_text,
		"timelineRecoverySourceKind": _timeline_recovery_source_kind,
		"timelineRecoverySignalCount": _timeline_recovery_signal_count,
		"timelineRecoverySignalKind": _timeline_recovery_signal_kind,
	}

func run_ai_activity_timeline_recovery_smoke() -> Dictionary:
	var feedback_label: Label = null
	var target := find_child("TimelineCardRecoveryFeedback01", true, false)
	if target is Label:
		feedback_label = target as Label
	_on_timeline_recovery_pressed(feedback_label, "ai_activity", "ai_activity_history_recovery_smoke", {
		"title": "AI 行动已推进",
		"summary": "AI 玩家完成了一次行动记录。",
		"resultLabel": "已记录",
		"nextActionLabel": "查看 AI 活动",
	})
	var ok := _timeline_recovery_feedback_text.strip_edges() != "" and _timeline_recovery_source_kind == "ai_activity"
	return {
		"attempted": true,
		"ok": ok,
		"reason": "ai_activity_timeline_recovery_verified" if ok else "ai_activity_timeline_recovery_failed",
		"aiActivityHistoryRecoveryToken": PLAYER_HISTORY_AI_ACTIVITY_RECOVERY_TOKEN,
		"timelineRecoveryActionCount": _timeline_recovery_action_count,
		"timelineRecoveryFeedbackText": _timeline_recovery_feedback_text,
		"timelineRecoverySourceKind": _timeline_recovery_source_kind,
		"timelineRecoverySignalCount": _timeline_recovery_signal_count,
		"timelineRecoverySignalKind": _timeline_recovery_signal_kind,
		"timelineRecoverySelectedPayloadResolved": not _timeline_recovery_selected_focus_payload.is_empty(),
	}

func run_ai_proposal_apply_timeline_recovery_smoke() -> Dictionary:
	var feedback_label: Label = null
	var target := find_child("TimelineCardRecoveryFeedback01", true, false)
	if target is Label:
		feedback_label = target as Label
	_on_timeline_recovery_pressed(feedback_label, "ai_proposal_apply", "ai_proposal_apply_recovery_smoke", {
		"title": "AI 提案需要确认",
		"summary": "前线方案等待确认。",
		"resultLabel": "待确认",
		"nextActionLabel": "处理提案",
	})
	var ok := _timeline_recovery_feedback_text.strip_edges() != "" and _timeline_recovery_source_kind == "ai_proposal_apply"
	return {
		"attempted": true,
		"ok": ok,
		"reason": "ai_proposal_apply_timeline_recovery_verified" if ok else "ai_proposal_apply_timeline_recovery_failed",
		"aiProposalApplyRecoveryToken": PLAYER_HISTORY_AI_PROPOSAL_APPLY_RECOVERY_TOKEN,
		"timelineRecoveryActionCount": _timeline_recovery_action_count,
		"timelineRecoveryFeedbackText": _timeline_recovery_feedback_text,
		"timelineRecoverySourceKind": _timeline_recovery_source_kind,
		"timelineRecoverySignalCount": _timeline_recovery_signal_count,
		"timelineRecoverySignalKind": _timeline_recovery_signal_kind,
		"timelineRecoverySelectedPayloadResolved": not _timeline_recovery_selected_focus_payload.is_empty(),
	}

func run_ai_proposal_denied_timeline_recovery_smoke() -> Dictionary:
	var feedback_label: Label = null
	var target := find_child("TimelineCardRecoveryFeedback01", true, false)
	if target is Label:
		feedback_label = target as Label
	_on_timeline_recovery_pressed(feedback_label, "ai_proposal_denied", "ai_proposal_denied_recovery_smoke", {
		"title": "AI 行动受阻",
		"summary": "提案被拒绝，先查看结果。",
		"resultLabel": "受阻",
		"consequenceLabel": "可回到 AI 活动查看原因并重新安排。",
		"nextActionLabel": "查看 AI 活动",
	})
	var ok := _timeline_recovery_feedback_text.strip_edges() != "" and _timeline_recovery_source_kind == "ai_proposal_denied"
	return {
		"attempted": true,
		"ok": ok,
		"reason": "ai_proposal_denied_timeline_recovery_verified" if ok else "ai_proposal_denied_timeline_recovery_failed",
		"aiProposalDeniedRecoveryToken": PLAYER_HISTORY_AI_PROPOSAL_DENIED_RECOVERY_TOKEN,
		"timelineRecoveryActionCount": _timeline_recovery_action_count,
		"timelineRecoveryFeedbackText": _timeline_recovery_feedback_text,
		"timelineRecoverySourceKind": _timeline_recovery_source_kind,
		"timelineRecoverySignalCount": _timeline_recovery_signal_count,
		"timelineRecoverySignalKind": _timeline_recovery_signal_kind,
		"timelineRecoverySelectedPayloadResolved": not _timeline_recovery_selected_focus_payload.is_empty(),
	}

func run_ai_proposal_denied_visible_receipt_smoke() -> Dictionary:
	var focus_payload := {
		"title": "AI 行动受阻",
		"summary": "提案被拒绝，先查看结果。",
		"resultLabel": "受阻",
		"consequenceLabel": "可回到 AI 活动查看原因并重新安排。",
		"nextActionLabel": "查看 AI 活动",
	}
	_visual_smoke_focused_receipt_lock = true
	var receipt_result := _show_timeline_recovery_focused_receipt("ai_proposal_denied", focus_payload, "已记录 AI 提案驳回")
	var ok := bool(receipt_result.get("visible", false)) \
		and _timeline_recovery_focused_receipt_visible \
		and _timeline_recovery_focused_receipt_kind == "ai_proposal_denied" \
		and _timeline_recovery_focused_receipt_feedback == "已记录 AI 提案驳回"
	return {
		"attempted": true,
		"ok": ok,
		"reason": "ai_proposal_denied_visible_receipt_verified" if ok else "ai_proposal_denied_visible_receipt_failed",
		"aiProposalDeniedFocusedReceiptToken": PLAYER_HISTORY_AI_PROPOSAL_DENIED_FOCUSED_RECEIPT_TOKEN,
		"timelineRecoveryFocusedReceiptVisible": _timeline_recovery_focused_receipt_visible,
		"timelineRecoveryFocusedReceiptKind": _timeline_recovery_focused_receipt_kind,
		"timelineRecoveryFocusedReceiptFeedback": _timeline_recovery_focused_receipt_feedback,
	}

func run_ai_execution_receipt_timeline_recovery_smoke() -> Dictionary:
	var feedback_label: Label = null
	var target := find_child("TimelineCardRecoveryFeedback01", true, false)
	if target is Label:
		feedback_label = target as Label
	_on_timeline_recovery_pressed(feedback_label, "ai_execution_receipt", "ai_execution_receipt_recovery_smoke", {
		"title": "AI 行动已完成",
		"summary": "军师 AI 已完成一次受治理行动。",
		"resultLabel": "已完成",
		"nextActionLabel": "查看 AI 活动",
	})
	var ok := _timeline_recovery_feedback_text.strip_edges() != "" and _timeline_recovery_source_kind == "ai_execution_receipt"
	return {
		"attempted": true,
		"ok": ok,
		"reason": "ai_execution_receipt_timeline_recovery_verified" if ok else "ai_execution_receipt_timeline_recovery_failed",
		"aiExecutionReceiptRecoveryToken": PLAYER_HISTORY_AI_EXECUTION_RECEIPT_RECOVERY_TOKEN,
		"timelineRecoveryActionCount": _timeline_recovery_action_count,
		"timelineRecoveryFeedbackText": _timeline_recovery_feedback_text,
		"timelineRecoverySourceKind": _timeline_recovery_source_kind,
		"timelineRecoverySignalCount": _timeline_recovery_signal_count,
		"timelineRecoverySignalKind": _timeline_recovery_signal_kind,
		"timelineRecoverySelectedPayloadResolved": not _timeline_recovery_selected_focus_payload.is_empty(),
	}

func run_ai_tile_abandon_execution_receipt_visible_smoke() -> Dictionary:
	var focus_payload := {
		"title": "AI 行动已完成",
		"summary": "军师 AI 已放弃目标地块。",
		"resultLabel": "地块已释放",
		"consequenceLabel": "可以去看下一步安排",
		"nextActionLabel": "查看 AI 活动",
	}
	_visual_smoke_focused_receipt_lock = true
	var receipt_result := _show_timeline_recovery_focused_receipt("ai_execution_receipt", focus_payload, "已记录地块放弃结果")
	var ok := bool(receipt_result.get("visible", false)) \
		and _timeline_recovery_focused_receipt_visible \
		and _timeline_recovery_focused_receipt_kind == "ai_execution_receipt" \
		and _timeline_recovery_focused_receipt_feedback == "已记录地块放弃结果"
	return {
		"attempted": true,
		"ok": ok,
		"reason": "ai_tile_abandon_execution_receipt_visible_verified" if ok else "ai_tile_abandon_execution_receipt_visible_failed",
		"aiExecutionReceiptFocusedToken": PLAYER_HISTORY_AI_EXECUTION_RECEIPT_FOCUSED_TOKEN,
		"timelineRecoveryFocusedReceiptVisible": _timeline_recovery_focused_receipt_visible,
		"timelineRecoveryFocusedReceiptKind": _timeline_recovery_focused_receipt_kind,
		"timelineRecoveryFocusedReceiptFeedback": _timeline_recovery_focused_receipt_feedback,
	}

func run_court_timeline_recovery_smoke() -> Dictionary:
	var feedback_label: Label = null
	var target := find_child("TimelineCardRecoveryFeedback01", true, false)
	if target is Label:
		feedback_label = target as Label
	_on_timeline_recovery_pressed(feedback_label, "civil_memory", "court_civil_memory_recovery_smoke", {
		"title": "朝议结果已归档",
		"summary": "相关传闻已定位，可继续查看处置背景。",
		"resultLabel": "已定位",
		"nextActionLabel": "查看朝议",
	})
	var ok := _timeline_recovery_feedback_text.strip_edges() != "" and _timeline_recovery_source_kind == "civil_memory"
	return {
		"attempted": true,
		"ok": ok,
		"reason": "court_timeline_recovery_verified" if ok else "court_timeline_recovery_failed",
		"courtRecoveryToken": PLAYER_HISTORY_COURT_RECOVERY_TOKEN,
		"timelineRecoveryActionCount": _timeline_recovery_action_count,
		"timelineRecoveryFeedbackText": _timeline_recovery_feedback_text,
		"timelineRecoverySourceKind": _timeline_recovery_source_kind,
		"timelineRecoverySignalCount": _timeline_recovery_signal_count,
		"timelineRecoverySignalKind": _timeline_recovery_signal_kind,
		"timelineRecoverySelectedPayloadResolved": not _timeline_recovery_selected_focus_payload.is_empty(),
	}

func _on_save_slot_restore_pressed(feedback_label: Label, slot_summary: Dictionary) -> void:
	_save_restore_selected_slot_id = str(slot_summary.get("slotId", "")).strip_edges()
	_save_restore_selected_slot_label = str(slot_summary.get("slotLabel", "")).strip_edges()
	_save_restore_selected_saved_at_label = str(slot_summary.get("savedAtLabel", "")).strip_edges()
	_save_restore_selected_risk_label = str(slot_summary.get("riskHint", "")).strip_edges()
	_save_restore_selected_preview_label = str(slot_summary.get("restorePreviewLabel", "")).strip_edges()
	var prepared_template := str(PLAYER_HISTORY_VISIBLE_LABELS.get("restorePrepared", "准备恢复：%s"))
	var slot_label := _save_restore_selected_slot_label if _save_restore_selected_slot_label != "" else str(PLAYER_HISTORY_VISIBLE_LABELS.get("restoreReady", "已准备恢复"))
	var outcome_label := str(PLAYER_HISTORY_VISIBLE_LABELS.get("restoreOutcome", "已选择存档，可先确认当前进度"))
	_save_restore_feedback_text = "%s　%s" % [prepared_template % slot_label, outcome_label]
	if _save_restore_selected_preview_label != "":
		_save_restore_feedback_text = "%s　%s" % [_save_restore_feedback_text, _save_restore_selected_preview_label]
	if feedback_label != null and is_instance_valid(feedback_label):
		feedback_label.text = _save_restore_feedback_text
		PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(feedback_label)

func run_save_restore_feedback_smoke() -> Dictionary:
	if _save_slot_summaries.is_empty():
		return {
			"ok": false,
			"reason": "save_slots_missing",
			"saveSlotCount": _save_slot_count,
		}
	var feedback_label: Label = null
	var target := find_child("SaveSlotRestoreFeedback01", true, false)
	if target is Label:
		feedback_label = target as Label
	_on_save_slot_restore_pressed(feedback_label, _save_slot_summaries[0])
	var ok := (
		_save_restore_selected_slot_id.strip_edges() != ""
		and _save_restore_selected_slot_label.strip_edges() != ""
		and _save_restore_selected_saved_at_label.strip_edges() != ""
		and _save_restore_selected_risk_label.strip_edges() != ""
		and _save_restore_selected_preview_label.strip_edges() != ""
		and _save_restore_feedback_text.strip_edges() != ""
	)
	return {
		"ok": ok,
		"reason": "save_restore_feedback_verified" if ok else "save_restore_feedback_failed",
		"saveRestoreFeedbackToken": PLAYER_HISTORY_SAVE_RESTORE_FEEDBACK_TOKEN,
		"saveSlotCount": _save_slot_count,
		"selectedSlotId": _save_restore_selected_slot_id,
		"selectedSlotLabel": _save_restore_selected_slot_label,
		"selectedSavedAtLabel": _save_restore_selected_saved_at_label,
		"selectedRiskLabel": _save_restore_selected_risk_label,
		"selectedPreviewLabel": _save_restore_selected_preview_label,
		"feedbackText": _save_restore_feedback_text,
	}

func open_save_restore_by_internal_id(slot_id: String) -> bool:
	var resolved_slot_id := slot_id.strip_edges()
	if resolved_slot_id == "":
		return false
	for slot_summary in _save_slot_summaries:
		if str(slot_summary.get("slotId", "")).strip_edges() == resolved_slot_id:
			_on_save_slot_restore_pressed(null, slot_summary)
			return _save_restore_feedback_text.strip_edges() != ""
	return false

func _on_replay_pause_pressed() -> void:
	_replay_paused = not _replay_paused
	_replay_interaction_feedback_count += 1
	_update_replay_interaction_labels(true)

func _on_replay_step_pressed(delta: int) -> void:
	_set_replay_selected_frame_index(_replay_selected_frame_index + delta, true)

func _on_replay_scrub_changed(value: float) -> void:
	_set_replay_selected_frame_index(int(round(value)), true)

func _set_replay_selected_frame_index(next_index: int, animate_feedback: bool) -> void:
	var max_index := maxi(0, _replay_frame_count - 1)
	var clamped_index := clampi(next_index, 0, max_index)
	if clamped_index == _replay_selected_frame_index and animate_feedback:
		_update_replay_interaction_labels(true)
		return
	_replay_selected_frame_index = clamped_index
	if _replay_scrub_slider != null and is_instance_valid(_replay_scrub_slider) and int(round(_replay_scrub_slider.value)) != clamped_index:
		_replay_scrub_slider.set_value_no_signal(clamped_index)
	if animate_feedback:
		_replay_interaction_feedback_count += 1
	_update_replay_interaction_labels(animate_feedback)

func _update_replay_interaction_labels(animate_feedback: bool) -> void:
	var visible_frame_index := _replay_selected_frame_index + 1
	var frame_count := maxi(1, _replay_frame_count)
	if _replay_current_frame_label != null and is_instance_valid(_replay_current_frame_label):
		_replay_current_frame_label.text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("frameStatus", "当前第 %d 帧，共 %d 帧")) % [visible_frame_index, frame_count]
	if _replay_interaction_feedback_label != null and is_instance_valid(_replay_interaction_feedback_label):
		var state_label := str(PLAYER_HISTORY_VISIBLE_LABELS.get("paused", "已暂停")) if _replay_paused else str(PLAYER_HISTORY_VISIBLE_LABELS.get("playing", "播放中"))
		var step_label := str(PLAYER_HISTORY_VISIBLE_LABELS.get("stepped", "已切到第 %d 帧")) % visible_frame_index
		_replay_interaction_feedback_label.text = "%s　%s" % [state_label, step_label]
		if animate_feedback:
			PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(_replay_interaction_feedback_label)

func run_replay_interaction_smoke() -> Dictionary:
	if _replay_frame_count <= 0:
		return {
			"ok": false,
			"reason": "replay_frames_missing",
			"replayFrameCount": _replay_frame_count,
	}
	_on_replay_pause_pressed()
	if _replay_frame_count > 1:
		_set_replay_selected_frame_index(_replay_frame_count - 1, true)
		_set_replay_selected_frame_index(0, true)
		_set_replay_selected_frame_index(_replay_frame_count - 1, true)
	else:
		_update_replay_interaction_labels(true)
		_replay_interaction_feedback_count += 1
	var feedback_text := ""
	if _replay_interaction_feedback_label != null and is_instance_valid(_replay_interaction_feedback_label):
		feedback_text = _replay_interaction_feedback_label.text
	var ok := (
		_replay_paused
		and _replay_selected_frame_index == maxi(0, _replay_frame_count - 1)
		and _replay_interaction_feedback_count >= (3 if _replay_frame_count > 1 else 1)
		and feedback_text.strip_edges() != ""
	)
	return {
		"ok": ok,
		"reason": "replay_interaction_motion_verified" if ok else "replay_interaction_motion_failed",
		"replayInteractionMotionToken": PLAYER_HISTORY_REPLAY_INTERACTION_MOTION_TOKEN,
		"replayFrameCount": _replay_frame_count,
		"replaySelectedFrameIndex": _replay_selected_frame_index,
		"replayPaused": _replay_paused,
		"replayInteractionFeedbackCount": _replay_interaction_feedback_count,
		"feedbackText": feedback_text,
	}

func _apply_card_motion(card: Control, index: int) -> void:
	card.set_meta("player_history_card_motion_index", index)
	if not _card_motion_enabled:
		return
	call_deferred("_apply_deferred_card_motion", card, index)

func _apply_deferred_card_motion(card: Control, index: int) -> void:
	if card != null and is_instance_valid(card) and card.is_inside_tree():
		PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_card_stagger_enter(card, index)

func _coerce_dictionary(raw_value: Variant) -> Dictionary:
	if raw_value is Dictionary:
		return raw_value as Dictionary
	return {}

func _coerce_array(raw_value: Variant) -> Array:
	if raw_value is Array:
		return raw_value as Array
	return []

func _join_non_empty(parts: Array, separator: String) -> String:
	var normalized: Array[String] = []
	for part in parts:
		var text := str(part).strip_edges()
		if text != "":
			normalized.append(text)
	return separator.join(normalized)

func _clear_children(node: Node) -> void:
	for child in node.get_children():
		node.remove_child(child)
		child.queue_free()

func _build_local_bootstrap_read_model() -> Dictionary:
	return {
		"timeline": {
			"cards": [
				{
					"timestampBucket": "今日",
					"locationLabel": "主城",
					"actorName": "我方",
					"title": "天下纪事已开启",
					"summary": "战报、政务、同盟和城池变化会在这里汇总。",
					"resultLabel": "可查看",
					"consequenceLabel": "重要变化会排在前面",
					"nextActionLabel": "继续观察天下局势",
					"sourceRefs": {
						"visibility": "internal_link_only",
						"visible": false,
						"worldEventId": "local_bootstrap_world_event",
					},
				},
			],
		},
		"replay": {
			"frameCountLabel": "暂无可检查步骤",
			"inspectionHintLabel": "暂无回放步骤",
			"timelineScrubLabel": "拖动查看战况变化",
			"frames": [],
		},
		"saveLoad": {
			"restoreRiskLabel": "恢复前请确认当前进度已保存",
			"emptyStateLabel": "暂无可恢复存档",
			"slots": [],
		},
		"civilMemoryCards": [],
	}
