extends "res://scripts/ui/slg_snapshot_panel.gd"
class_name AIPanel

var _name_edit_popup: PanelContainer = null
var _name_edit_input: LineEdit = null
var _name_edit_status: Label = null
var _context_file_popup: Panel = null
var _context_file_title_input: LineEdit = null
var _context_file_kind_option: OptionButton = null
var _context_file_content_input: TextEdit = null
var _context_file_status: Label = null
var _context_file_dialog: FileDialog = null
var _context_file_source_name := ""
var _avatar_select_popup: PanelContainer = null
var _avatar_select_grid: GridContainer = null
var _avatar_select_status: Label = null
var _avatar_upload_dialog: FileDialog = null
var _backend_api_client = null
var _voice_settings_panel: PanelContainer = null
var _voice_profile_option: OptionButton = null
var _voice_auto_mode_option: OptionButton = null
var _voice_selection_label: Label = null
var _voice_availability_label: Label = null
var _voice_profile_status_label: Label = null
var _voice_clone_placeholder_label: Label = null
var _voice_save_button: Button = null
var _voice_refresh_button: Button = null
var _daily_summary_chat_checkbox: CheckBox = null
var _war_event_chat_checkbox: CheckBox = null
var _war_report_voice_checkbox: CheckBox = null
var _voice_profile_catalog: Array = []
var _voice_profile_default_id := "male_strategist"
var _voice_active_selection: Dictionary = {
	"voiceProfileId": "male_strategist",
	"autoSpeechMode": "off",
}
var _voice_availability: Dictionary = {
	"status": "muted",
	"label": "语音已关闭",
	"summary": "该 AI 玩家当前不会自动播报战况。",
	"canPlayVoice": false,
	"fallbackMode": "silent",
}
var _voice_profile_option_ids: Array = []
var _voice_auto_mode_ids: Array = []

const AI_CHAT_PORTRAIT_MANIFEST := "res://data/ai_chat_portraits.json"
const MAX_CONTEXT_FILE_CHARS := 6000
const CONTEXT_IMAGE_EXTENSIONS := ["png", "jpg", "jpeg", "webp"]
const CONTEXT_FILE_POPUP_RESPONSIVE_TOKEN := "ai_context_file_popup_responsive_v1"
const CONTEXT_FILE_POPUP_MARGIN := 24.0
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")
const BACKEND_API_CLIENT_SCRIPT := preload("res://scripts/infra/http/backend_api_client.gd")
const DEFAULT_VOICE_PROFILE_ID := "male_strategist"
const VOICE_PROVIDER_INTERNAL_NAME_NEEDLES := ["mimo", "xiaomi"]
const AI_PANEL_PLAYER_VISIBLE_COPY_FORBIDDEN_TERMS := [
	"backend",
	"read model",
	"authority",
	"tier",
	"contract",
	"/api/",
	".env",
	"key",
	"provider",
	"snake_case",
	"fixture",
	"local_only",
	"txt",
	"md",
	"skll",
	"SKLL",
]
const VOICE_AUTO_MODE_OPTIONS := [
	{"id": "off", "label": "关闭"},
	{"id": "auto", "label": "按情境"},
	{"id": "always", "label": "始终"},
]
const FALLBACK_VOICE_PROFILE_CATALOG := [
	{
		"voiceProfileId": "male_strategist",
		"displayName": "男声·沉稳军师",
		"gender": "male",
		"stylePreset": "male_strategist",
		"source": "preset",
		"description": "默认沉稳男声。",
	},
	{
		"voiceProfileId": "male_grit",
		"displayName": "男声·战场克制",
		"gender": "male",
		"stylePreset": "male_grit",
		"source": "preset",
		"description": "低沉克制，偏战场风格。",
	},
	{
		"voiceProfileId": "female_soft",
		"displayName": "女声·温柔安抚",
		"gender": "female",
		"stylePreset": "female_soft",
		"source": "preset",
		"description": "柔和安抚风格。",
	},
	{
		"voiceProfileId": "female_clear",
		"displayName": "女声·清亮提醒",
		"gender": "female",
		"stylePreset": "female_clear",
		"source": "preset",
		"description": "清亮、提醒感更强。",
	},
	{
		"voiceProfileId": "neutral_low_ai",
		"displayName": "中性·自然低AI感",
		"gender": "neutral",
		"stylePreset": "neutral_low_ai",
		"source": "preset",
		"description": "更中性、低戏剧化语气。",
	},
]

func _init() -> void:
	panel_title = "AI玩家"
	panel_subtitle = ""
	panel_empty_state_text = "等待AI玩家状态。"

func _ready() -> void:
	super._ready()
	UI_COMPONENT_FACTORY.apply_motion_ai_chat_panel_enter(self, 0)
	if _is_truthy_env("SLG_MAINLINE_VISUAL_SMOKE"):
		call_deferred("_request_visual_smoke_ai_players_refresh")
	if _is_truthy_env("SLG_AI_PANEL_VISUAL_SMOKE_OPEN_AVATAR_SELECT"):
		call_deferred("_open_avatar_select_popup")

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_layout_context_file_popup()

func _is_truthy_env(name: String) -> bool:
	var value := OS.get_environment(name).strip_edges().to_lower()
	return value == "1" or value == "true" or value == "yes" or value == "on"

func set_ai_snapshot(snapshot: Dictionary) -> void:
	set_snapshot(snapshot)
	_schedule_voice_settings_mount()

func set_active_page_id(page_id: String) -> void:
	var smoke_page_id := OS.get_environment("SLG_AI_PANEL_VISUAL_SMOKE_PAGE").strip_edges()
	if _is_truthy_env("SLG_MAINLINE_VISUAL_SMOKE") and smoke_page_id != "":
		super.set_active_page_id(smoke_page_id)
		_schedule_voice_settings_mount()
		return
	super.set_active_page_id(page_id)
	_schedule_voice_settings_mount()

func get_mainline_visual_smoke_summary(page_id: String = "") -> Dictionary:
	var summary := super.get_mainline_visual_smoke_summary(page_id)
	var shared_state: Dictionary = _snapshot.get("shared_state", {}) as Dictionary
	var sidebar_labels := _ai_visual_smoke_sidebar_labels()
	var context_has_chat := _ai_visual_smoke_section_has_action("context", "ai_player_open_chat_channel")
	var first_screen_has_chat := (
		_ai_visual_smoke_section_has_action("players", "ai_player_open_chat_channel")
		or _ai_visual_smoke_section_has_action("advisor", "ai_player_open_chat_channel")
		or _ai_visual_smoke_section_has_action("autonomy", "ai_player_open_chat_channel")
	)
	summary["aiPanelRole"] = "ai_player_profile_manager_v1"
	summary["aiPanelPrimaryConcept"] = "AI玩家"
	summary["aiPanelDefaultPageId"] = _resolve_default_page_id()
	summary["aiPanelActionCommandBgToken"] = UI_COMPONENT_FACTORY.AI_PANEL_ACTION_COMMAND_BG_TOKEN
	summary["aiPanelActionCommandVisibleCount"] = _ai_visual_smoke_count_action_id_prefixes(["ai_", "autonomy_"])
	summary["aiPanelActionLiveTextContract"] = "snapshot_button_row_live_text_v1"
	summary["aiPanelActionRowButtonToken"] = UI_COMPONENT_FACTORY.AI_PANEL_ACTION_COMMAND_BG_TOKEN
	summary["aiPanelActionRowLiveTextContract"] = "snapshot_button_row_live_text_v1"
	summary["aiPanelActionRowButtonCount"] = _ai_visual_smoke_action_row_button_count()
	summary["aiPanelActionRowActionIds"] = _ai_visual_smoke_action_row_meta_join("ai_panel_action_id")
	summary["aiPanelActionRowLabels"] = _ai_visual_smoke_action_row_meta_join("snapshot_action_live_text_label")
	var proposal_decision_copy_lines: Array = shared_state.get("ai_proposal_decision_copy_lines", []) as Array
	var proposal_decision_copy_text := str(shared_state.get("ai_proposal_decision_copy_text", "")).strip_edges()
	var proposal_decision_forbidden_clear := _ai_visual_smoke_count_text_hits(proposal_decision_copy_lines, ["read model", "authority", "tier", "backend", "contract id", "debug", "snake_case", "proposalId", "worldAction", "queuePlanExecution", "JSON"]) == 0
	var proposal_mutation_result_copy_lines: Array = shared_state.get("ai_proposal_mutation_result_copy_lines", []) as Array
	var proposal_mutation_result_copy_text := str(shared_state.get("ai_proposal_mutation_result_copy_text", "")).strip_edges()
	var proposal_mutation_result_kind := str(shared_state.get("ai_proposal_mutation_result_kind", "")).strip_edges()
	var proposal_mutation_result_forbidden_clear := _ai_visual_smoke_count_text_hits(proposal_mutation_result_copy_lines, ["read model", "authority", "tier", "backend", "contract id", "debug", "snake_case", "proposalId", "worldAction", "queuePlanExecution", "JSON"]) == 0
	var proposal_mutation_result_copy_ok := (
		(proposal_mutation_result_kind == "approve" and proposal_mutation_result_copy_text.find("已批准") >= 0)
		or (proposal_mutation_result_kind == "reject" and proposal_mutation_result_copy_text.find("已驳回") >= 0)
	) and proposal_mutation_result_copy_text.find("看原意") >= 0 \
		and (
			proposal_mutation_result_copy_text.find("看回报") >= 0
			or proposal_mutation_result_copy_text.find("等新方案") >= 0
		)
	var proposal_decision_approve_visible := _ai_visual_smoke_snapshot_has_action_prefix("ai_player_proposal_approve:")
	var proposal_decision_reject_visible := _ai_visual_smoke_snapshot_has_action_prefix("ai_player_proposal_reject:")
	var proposal_decision_copy_ok := proposal_decision_copy_text.find("AI 想做什么") >= 0 \
		and proposal_decision_copy_text.find("你会失去或得到什么") >= 0 \
		and proposal_decision_copy_text.find("批准") >= 0 \
		and proposal_decision_copy_text.find("驳回") >= 0
	summary["aiPanelProposalDecisionSurfaceContract"] = str(shared_state.get("ai_proposal_decision_surface_contract", "")).strip_edges()
	summary["aiPanelProposalDecisionSurfaceReady"] = bool(shared_state.get("ai_proposal_decision_surface_ready", false))
	summary["aiPanelProposalDecisionStyleOwner"] = str(shared_state.get("ai_proposal_decision_style_owner", "")).strip_edges()
	summary["aiPanelProposalDecisionCopyText"] = proposal_decision_copy_text
	summary["aiPanelProposalDecisionCopyOk"] = proposal_decision_copy_ok
	summary["aiPanelProposalDecisionApproveActionVisible"] = proposal_decision_approve_visible
	summary["aiPanelProposalDecisionRejectActionVisible"] = proposal_decision_reject_visible
	summary["aiPanelProposalDecisionForbiddenCopyClear"] = proposal_decision_forbidden_clear
	summary["aiPanelProposalDecisionActivePageId"] = get_active_page_id()
	summary["aiPanelProposalDecisionSurfacePlayerUiAccepted"] = summary["aiPanelProposalDecisionSurfaceContract"] == "ai_proposal_decision_surface_v1" \
		and bool(summary["aiPanelProposalDecisionSurfaceReady"]) \
		and get_active_page_id() == "agenda" \
		and proposal_decision_approve_visible \
		and proposal_decision_reject_visible \
		and proposal_decision_copy_ok \
		and proposal_decision_forbidden_clear
	summary["aiPanelProposalMutationResultContract"] = str(shared_state.get("ai_proposal_mutation_result_contract", "")).strip_edges()
	summary["aiPanelProposalMutationResultReady"] = bool(shared_state.get("ai_proposal_mutation_result_ready", false))
	summary["aiPanelProposalMutationResultKind"] = proposal_mutation_result_kind
	summary["aiPanelProposalMutationResultStatus"] = str(shared_state.get("ai_proposal_mutation_result_status", "")).strip_edges()
	summary["aiPanelProposalMutationResultCopyText"] = proposal_mutation_result_copy_text
	summary["aiPanelProposalMutationResultCopyOk"] = proposal_mutation_result_copy_ok
	summary["aiPanelProposalMutationResultForbiddenCopyClear"] = proposal_mutation_result_forbidden_clear
	summary["aiPanelProposalMutationResultContextHidden"] = proposal_mutation_result_copy_text.find("AI 想做什么") < 0 \
		and proposal_mutation_result_copy_text.find("你会失去或得到什么") < 0 \
		and proposal_mutation_result_copy_text.find("目标地块") < 0
	summary["aiPanelProposalMutationResultAccepted"] = summary["aiPanelProposalMutationResultContract"] == "ai_proposal_mutation_result_visual_smoke_v1" \
		and bool(summary["aiPanelProposalMutationResultReady"]) \
		and get_active_page_id() == "agenda" \
		and (proposal_mutation_result_kind == "approve" or proposal_mutation_result_kind == "reject") \
		and proposal_mutation_result_copy_ok \
		and proposal_mutation_result_forbidden_clear \
		and bool(summary["aiPanelProposalMutationResultContextHidden"])
	summary["aiPanelSidebarLabels"] = sidebar_labels
	summary["aiPanelForbiddenAssistantCopyCount"] = _ai_visual_smoke_count_text_hits(_snapshot, ["助手", "助理"])
	summary["aiPanelArchiveEntryVisible"] = _ai_visual_smoke_sidebar_has("advisor", "档案")
	summary["aiPanelMemoryEntryVisible"] = _ai_visual_smoke_sidebar_has("context", "记忆")
	summary["aiPanelAutonomyEntryVisible"] = _ai_visual_smoke_sidebar_has("autonomy", "托管")
	summary["aiPanelProposalMutationResultShellAccepted"] = bool(summary["aiPanelProposalMutationResultAccepted"]) \
		and bool(summary["aiPanelArchiveEntryVisible"]) \
		and bool(summary["aiPanelMemoryEntryVisible"]) \
		and bool(summary["aiPanelAutonomyEntryVisible"]) \
		and str(shared_state.get("ai_player_primary_display_name", "")).strip_edges() != ""
	summary["aiPanelSelectedPlayerVisible"] = str(shared_state.get("ai_player_primary_display_name", "")).strip_edges() != ""
	summary["aiPanelPrimaryDisplayName"] = str(shared_state.get("ai_player_primary_display_name", "")).strip_edges()
	summary["aiPanelPrimaryAvatarId"] = str(shared_state.get("ai_player_primary_avatar_id", "")).strip_edges()
	summary["aiPanelPrimaryAvatarImagePath"] = str(shared_state.get("ai_player_primary_avatar_image_path", "")).strip_edges()
	summary["aiContextDocumentCount"] = int(shared_state.get("ai_context_document_count", 0))
	summary["aiContextDocumentSummary"] = str(shared_state.get("ai_context_document_summary", "")).strip_edges()
	summary["aiPanelLivingWorldFirstScreenContract"] = str(shared_state.get("ai_player_living_world_first_screen_contract", "")).strip_edges()
	summary["aiPanelExecutionTraceVisible"] = bool(shared_state.get("ai_execution_trace_visible", false))
	summary["aiPanelExecutionTraceCount"] = int(shared_state.get("ai_execution_trace_count", 0))
	summary["aiPanelExecutionTraceFirstTraceId"] = str(shared_state.get("ai_execution_trace_first_trace_id", "")).strip_edges()
	summary["aiPanelLatestExecutionTraceSummary"] = str(shared_state.get("ai_latest_execution_trace_summary", "")).strip_edges()
	summary["aiPanelExecutionTraceCardChromeToken"] = "ai_panel_execution_trace_card_chrome_v1"
	summary["aiPanelExecutionTraceCardChromeCount"] = _ai_visual_smoke_count_visible_meta("ai_execution_trace_card_chrome_token", "ai_panel_execution_trace_card_chrome_v1")
	summary["aiPanelExecutionTraceCardMotionMode"] = _ai_visual_smoke_first_visible_meta("ai_execution_trace_motion_mode")
	summary["aiPanelExecutionTraceCardStaggeredCount"] = _ai_visual_smoke_count_visible_meta_with_key("ai_execution_trace_stagger_index")
	summary["aiPanelAiActivityIdentityChipToken"] = UI_COMPONENT_FACTORY.ai_activity_identity_chip_token()
	UI_COMPONENT_FACTORY.apply_ai_activity_identity_chip_summary(
		summary,
		"aiPanelAiActivity",
		_ai_visual_smoke_count_visible_meta("ai_activity_identity_chip_token", UI_COMPONENT_FACTORY.ai_activity_identity_chip_token())
	)
	summary["aiPanelMaritimeActivityChipId"] = str(shared_state.get("ai_receipt_maritime_activity_chip_id", "")).strip_edges()
	summary["aiPanelMaritimeActivityChipVisible"] = bool(shared_state.get("ai_receipt_maritime_activity_chip_visible", false)) and summary["aiPanelMaritimeActivityChipId"] == "maritime_activity_chip_v1"
	var daily_summary_text := str(shared_state.get("ai_autonomous_combat_daily_summary_text", "")).strip_edges()
	summary["aiPanelDailySummaryVisible"] = bool(shared_state.get("ai_autonomous_combat_daily_summary_visible", false)) and daily_summary_text != ""
	summary["aiPanelDailySummaryText"] = daily_summary_text
	summary["aiPanelRallyCampaignMemoryText"] = str(shared_state.get("ai_autonomous_combat_rally_campaign_memory_text", "")).strip_edges()
	summary["aiPanelDiplomacyPostureText"] = str(shared_state.get("ai_autonomous_combat_diplomacy_posture_text", "")).strip_edges()
	summary["aiPanelCrossDayRecapText"] = str(shared_state.get("ai_autonomous_combat_cross_day_recap_text", "")).strip_edges()
	summary["aiPanelDailySummaryCampaignMemoryVisible"] = (
		str(summary["aiPanelRallyCampaignMemoryText"]).strip_edges() != ""
		and str(summary["aiPanelDiplomacyPostureText"]).strip_edges() != ""
		and str(summary["aiPanelCrossDayRecapText"]).strip_edges() != ""
	)
	summary["aiPanelDailySummaryPublicFieldsOnly"] = _ai_visual_smoke_count_text_hits(_snapshot, ["proposalId", "worldAction", "MCP", "tool", "approve", "execute", "JSON"]) == 0
	summary["aiPanelChatEntryRelocatedToChannel"] = context_has_chat
	summary["aiPanelChatEntryIsSecondary"] = context_has_chat and not first_screen_has_chat
	summary["aiPanelUsesListCardAutonomyGuard"] = shared_state.has("ai_player_list_card_count") and shared_state.has("ai_player_autonomy_guard_mode")
	summary["aiPanelDirectSuggestedActionExecution"] = _ai_visual_smoke_has_direct_execute_action()
	summary["aiPanelAvatarUploadContract"] = "ai_avatar_upload_file_dialog_v1"
	summary["aiPanelAvatarUploadDialogReady"] = _avatar_upload_dialog != null and is_instance_valid(_avatar_upload_dialog)
	summary["aiPanelAvatarUploadImageFilters"] = ["png", "jpg", "jpeg", "webp"]
	summary["aiHomeCityBindingStatus"] = str(shared_state.get("ai_player_home_city_binding_status", "")).strip_edges()
	summary["aiHomeCityCandidateCount"] = int(shared_state.get("ai_player_home_city_candidate_count", 0))
	summary["aiHomeCityFirstCandidateCenterTileId"] = str(shared_state.get("ai_player_home_city_first_candidate_center_tile_id", "")).strip_edges()
	summary["aiHomeCityCandidateActionVisible"] = _ai_visual_smoke_snapshot_has_action("ai_player_home_city_candidates_open")
	summary["aiHomeCityBindActionVisible"] = _ai_visual_smoke_snapshot_has_action_prefix("ai_player_home_city_bind:")
	summary["aiHomeCityCoordinateJumpActionVisible"] = _ai_visual_smoke_snapshot_has_action_prefix("coordinate_jump_tile:")
	summary["aiHomeCityCoordinateJumpButtonCount"] = _ai_visual_smoke_count_visible_named_buttons("AIHomeCityCoordinateJumpButton")
	summary["aiVoiceSettingsPageRegistered"] = _ai_visual_smoke_sidebar_has("voice", "声色")
	summary["aiVoiceSettingsClosureContract"] = "ai_panel_voice_settings_page_v1"
	summary["aiVoiceSettingsActivePageId"] = get_active_page_id()
	summary["aiVoiceSettingsPanelLocation"] = "ai_panel_voice_page_inline"
	summary["aiVoiceSettingsPanelVisible"] = _voice_settings_panel != null and is_instance_valid(_voice_settings_panel) and _voice_settings_panel.visible and _voice_settings_panel.is_visible_in_tree()
	summary["aiVoiceSelectedProfileId"] = str(_voice_active_selection.get("voiceProfileId", "")).strip_edges()
	summary["aiVoiceAutoSpeechMode"] = str(_voice_active_selection.get("autoSpeechMode", "off")).strip_edges()
	summary["aiVoiceAvailabilityStatus"] = str(_voice_availability.get("status", "")).strip_edges()
	summary["aiVoiceAvailabilityLabel"] = str(_voice_availability.get("label", "")).strip_edges()
	summary["aiVoiceAvailabilityVisible"] = _voice_availability_label != null and is_instance_valid(_voice_availability_label) and _voice_availability_label.visible
	summary["aiVoiceProfileStatusText"] = _voice_profile_status_label.text.strip_edges() if _voice_profile_status_label != null and is_instance_valid(_voice_profile_status_label) else ""
	summary["aiReportDailySummaryChatToggleVisible"] = _daily_summary_chat_checkbox != null and is_instance_valid(_daily_summary_chat_checkbox) and _daily_summary_chat_checkbox.visible
	summary["aiReportWarEventChatToggleVisible"] = _war_event_chat_checkbox != null and is_instance_valid(_war_event_chat_checkbox) and _war_event_chat_checkbox.visible
	summary["aiReportVoiceToggleVisible"] = _war_report_voice_checkbox != null and is_instance_valid(_war_report_voice_checkbox) and _war_report_voice_checkbox.visible
	summary["aiReportSettingsPublicFieldsOnly"] = _ai_visual_smoke_count_text_hits(_read_report_setting_visible_texts(), ["runtimePolicy", "allowAutonomousCombat", "proposalId", "worldAction", "queuePlanExecution", "JSON"]) == 0
	summary["aiVoiceClonePlaceholderVisible"] = _voice_clone_placeholder_label != null and is_instance_valid(_voice_clone_placeholder_label) and _voice_clone_placeholder_label.visible
	summary["aiVoiceProviderNamesHidden"] = _voice_provider_names_hidden_in_ui()
	summary["aiVoiceProviderEnvKeyHidden"] = _ai_visual_smoke_count_text_hits(_read_voice_settings_visible_texts(), ["provider", "MIMO", "mimo", "xiaomi", "env", "key", "API", "api key"]) == 0
	summary["aiVoiceSettingsPublicFieldsOnly"] = true
	summary["aiVoiceMotionBoundary"] = "ui_settings_only_no_motion_or_provider_change"
	UI_COMPONENT_FACTORY.apply_ai_chat_motion_summary(summary)
	return summary

func _request_visual_smoke_ai_players_refresh() -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	page_action_requested.emit(get_active_page_id(), "ai_players_refresh")

func _ai_visual_smoke_sidebar_labels() -> Array:
	var labels: Array = []
	var sidebar_items: Array = _snapshot.get("sidebar_items", []) as Array
	for item_variant in sidebar_items:
		if not (item_variant is Dictionary):
			continue
		var item: Dictionary = item_variant as Dictionary
		var label := str(item.get("label", "")).strip_edges()
		if label != "":
			labels.append(label)
	return labels

func _ai_visual_smoke_sidebar_has(page_id: String, label: String) -> bool:
	var sidebar_items: Array = _snapshot.get("sidebar_items", []) as Array
	for item_variant in sidebar_items:
		if not (item_variant is Dictionary):
			continue
		var item: Dictionary = item_variant as Dictionary
		if str(item.get("id", "")).strip_edges() == page_id and str(item.get("label", "")).strip_edges() == label:
			return true
	return false

func _ai_visual_smoke_section_has_action(page_id: String, action_id: String) -> bool:
	var sections: Dictionary = _snapshot.get("sections", {}) as Dictionary
	var section_variant: Variant = sections.get(page_id, {})
	if not (section_variant is Dictionary):
		return false
	var section: Dictionary = section_variant as Dictionary
	var content_blocks: Array = section.get("content_blocks", []) as Array
	for block_variant in content_blocks:
		if not (block_variant is Dictionary):
			continue
		var block: Dictionary = block_variant as Dictionary
		var actions: Array = block.get("actions", []) as Array
		for action_variant in actions:
			if not (action_variant is Dictionary):
				continue
			var action: Dictionary = action_variant as Dictionary
			if str(action.get("id", "")).strip_edges() == action_id:
				return true
	return false

func _ai_visual_smoke_has_direct_execute_action() -> bool:
	var direct_action_ids := [
		"ai_player_latest_proposal_execute",
		"ai_player_proposal_execute",
		"ai_player_direct_suggested_action_execute",
	]
	for action_id in direct_action_ids:
		if _ai_visual_smoke_snapshot_has_action(str(action_id)):
			return true
	return false

func _ai_visual_smoke_snapshot_has_action(action_id: String) -> bool:
	var sections: Dictionary = _snapshot.get("sections", {}) as Dictionary
	for page_id_variant in sections.keys():
		if _ai_visual_smoke_section_has_action(str(page_id_variant), action_id):
			return true
	return false

func _ai_visual_smoke_snapshot_has_action_prefix(action_prefix: String) -> bool:
	var normalized_prefix := action_prefix.strip_edges()
	if normalized_prefix == "":
		return false
	var sections: Dictionary = _snapshot.get("sections", {}) as Dictionary
	for page_id_variant in sections.keys():
		var section_variant: Variant = sections.get(page_id_variant, {})
		if not (section_variant is Dictionary):
			continue
		var section: Dictionary = section_variant as Dictionary
		var content_blocks: Array = section.get("content_blocks", []) as Array
		for block_variant in content_blocks:
			if not (block_variant is Dictionary):
				continue
			var block: Dictionary = block_variant as Dictionary
			var actions: Array = block.get("actions", []) as Array
			for action_variant in actions:
				if not (action_variant is Dictionary):
					continue
				var action: Dictionary = action_variant as Dictionary
				if str(action.get("id", "")).strip_edges().begins_with(normalized_prefix):
					return true
	return false


func _ai_visual_smoke_count_action_id_prefixes(action_prefixes: Array) -> int:
	var normalized_prefixes: Array[String] = []
	for prefix_variant in action_prefixes:
		var prefix := str(prefix_variant).strip_edges()
		if prefix != "":
			normalized_prefixes.append(prefix)
	var count := 0
	if normalized_prefixes.is_empty():
		return count
	var sections: Dictionary = _snapshot.get("sections", {}) as Dictionary
	for page_id_variant in sections.keys():
		var section_variant: Variant = sections.get(page_id_variant, {})
		if not (section_variant is Dictionary):
			continue
		var section: Dictionary = section_variant as Dictionary
		var content_blocks: Array = section.get("content_blocks", []) as Array
		for block_variant in content_blocks:
			if not (block_variant is Dictionary):
				continue
			var block: Dictionary = block_variant as Dictionary
			var actions: Array = block.get("actions", []) as Array
			for action_variant in actions:
				if not (action_variant is Dictionary):
					continue
				var action: Dictionary = action_variant as Dictionary
				var action_id := str(action.get("id", "")).strip_edges()
				for prefix in normalized_prefixes:
					if action_id.begins_with(prefix):
						count += 1
						break
	return count


func _ai_visual_smoke_count_visible_named_buttons(button_name: String) -> int:
	var resolved_name := button_name.strip_edges()
	if resolved_name == "":
		return 0
	return _ai_visual_smoke_count_visible_named_buttons_recursive(self, resolved_name)


func _ai_visual_smoke_count_visible_named_buttons_recursive(node: Node, button_name: String) -> int:
	var count := 0
	if node is Button and node.name == button_name and (node as Button).visible and (node as Button).is_visible_in_tree():
		count += 1
	for child in node.get_children():
		count += _ai_visual_smoke_count_visible_named_buttons_recursive(child, button_name)
	return count


func _ai_visual_smoke_count_visible_meta(meta_key: String, expected_value: String) -> int:
	return _ai_visual_smoke_count_visible_meta_recursive(self, meta_key.strip_edges(), expected_value.strip_edges())


func _ai_visual_smoke_count_visible_meta_recursive(node: Node, meta_key: String, expected_value: String) -> int:
	var count := 0
	if meta_key != "" and node is CanvasItem and (node as CanvasItem).visible and (node as CanvasItem).is_visible_in_tree():
		var value := str(node.get_meta(meta_key, "")).strip_edges()
		if value != "" and (expected_value == "" or value == expected_value):
			count += 1
	for child in node.get_children():
		count += _ai_visual_smoke_count_visible_meta_recursive(child, meta_key, expected_value)
	return count


func _ai_visual_smoke_count_visible_meta_with_key(meta_key: String) -> int:
	return _ai_visual_smoke_count_visible_meta_with_key_recursive(self, meta_key.strip_edges())


func _ai_visual_smoke_count_visible_meta_with_key_recursive(node: Node, meta_key: String) -> int:
	var count := 0
	if meta_key != "" and node is CanvasItem and (node as CanvasItem).visible and (node as CanvasItem).is_visible_in_tree():
		if node.has_meta(meta_key):
			count += 1
	for child in node.get_children():
		count += _ai_visual_smoke_count_visible_meta_with_key_recursive(child, meta_key)
	return count


func _ai_visual_smoke_first_visible_meta(meta_key: String) -> String:
	return _ai_visual_smoke_first_visible_meta_recursive(self, meta_key.strip_edges())


func _ai_visual_smoke_first_visible_meta_recursive(node: Node, meta_key: String) -> String:
	if meta_key != "" and node is CanvasItem and (node as CanvasItem).visible and (node as CanvasItem).is_visible_in_tree():
		var value := str(node.get_meta(meta_key, "")).strip_edges()
		if value != "":
			return value
	for child in node.get_children():
		var child_value := _ai_visual_smoke_first_visible_meta_recursive(child, meta_key)
		if child_value != "":
			return child_value
	return ""


func _ai_visual_smoke_action_row_button_count() -> int:
	var values: Array[String] = []
	_ai_visual_smoke_collect_action_row_meta(self, "ai_panel_action_id", values)
	return values.size()


func _ai_visual_smoke_action_row_meta_join(meta_key: String) -> String:
	var values: Array[String] = []
	_ai_visual_smoke_collect_action_row_meta(self, meta_key, values)
	return "/".join(values)


func _ai_visual_smoke_collect_action_row_meta(root: Node, meta_key: String, values: Array[String]) -> void:
	for child in root.get_children():
		if child is Button:
			var button := child as Button
			if str(button.get_meta("ai_panel_action_command_bg_token", "")).strip_edges() == UI_COMPONENT_FACTORY.AI_PANEL_ACTION_COMMAND_BG_TOKEN:
				var value := str(button.get_meta(meta_key, "")).strip_edges()
				if value != "":
					values.append(value)
		if child is Node:
			_ai_visual_smoke_collect_action_row_meta(child as Node, meta_key, values)


func _ai_visual_smoke_count_text_hits(value: Variant, needles: Array) -> int:
	var count := 0
	if value is Dictionary:
		for key in (value as Dictionary).keys():
			count += _ai_visual_smoke_count_text_hits(str(key), needles)
			count += _ai_visual_smoke_count_text_hits((value as Dictionary).get(key), needles)
	elif value is Array:
		for item in value as Array:
			count += _ai_visual_smoke_count_text_hits(item, needles)
	else:
		var text := str(value)
		for needle_variant in needles:
			var needle := str(needle_variant)
			if needle == "":
				continue
			var offset := 0
			while offset < text.length():
				var found := text.find(needle, offset)
				if found < 0:
					break
				count += 1
				offset = found + needle.length()
	return count

func _on_section_page_action_requested(action_id: String) -> void:
	if action_id.begins_with("ai_sidebar_open:"):
		var page_id := action_id.trim_prefix("ai_sidebar_open:").strip_edges()
		if page_id != "":
			set_active_page_id(page_id)
			page_changed.emit(page_id)
		return
	if action_id == "ai_player_display_name_edit":
		_open_name_edit_popup()
		return
	if action_id == "ai_player_context_document_open":
		_open_context_file_popup()
		return
	if action_id == "ai_player_context_document_file_open":
		_open_context_file_popup()
		call_deferred("_open_context_file_dialog")
		return
	if action_id == "ai_player_avatar_select_open":
		_open_avatar_select_popup()
		return
	if action_id == "ai_player_open_chat_channel":
		page_action_requested.emit(get_active_page_id(), action_id)
		return
	page_action_requested.emit(get_active_page_id(), action_id)

func _schedule_voice_settings_mount() -> void:
	if get_active_page_id() != "voice":
		return
	call_deferred("_mount_voice_settings_panel")

func _mount_voice_settings_panel() -> void:
	if get_active_page_id() != "voice":
		return
	var container := _find_voice_settings_content_container()
	if container == null:
		return
	if _voice_settings_panel != null and is_instance_valid(_voice_settings_panel) and _voice_settings_panel.get_parent() == container:
		_apply_report_setting_checkboxes_from_snapshot()
		return
	if _voice_settings_panel != null and is_instance_valid(_voice_settings_panel):
		_voice_settings_panel.queue_free()
	_voice_settings_panel = _build_voice_settings_panel()
	container.add_child(_voice_settings_panel)
	if container.get_child_count() > 1:
		container.move_child(_voice_settings_panel, 1)
	_refresh_voice_auto_mode_options()
	_refresh_voice_profile_option_items()
	_apply_voice_selection_to_controls()
	_update_voice_selection_label()
	call_deferred("_refresh_voice_profile_catalog")

func _find_voice_settings_content_container() -> VBoxContainer:
	if _section_page == null or not is_instance_valid(_section_page):
		return null
	var content_node := _section_page.find_child("ContentBlocks", true, false)
	return content_node as VBoxContainer

func _build_voice_settings_panel() -> PanelContainer:
	var panel := PanelContainer.new()
	panel.name = "AIVoiceSettingsPanel"
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.add_theme_stylebox_override("panel", _make_voice_settings_style())

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 16)
	margin.add_theme_constant_override("margin_top", 14)
	margin.add_theme_constant_override("margin_right", 16)
	margin.add_theme_constant_override("margin_bottom", 14)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)

	var title := Label.new()
	title.text = "语音声色设置"
	title.add_theme_font_size_override("font_size", 18)
	title.add_theme_color_override("font_color", Color(0.96, 0.91, 0.78, 1.0))
	column.add_child(title)

	_voice_availability_label = Label.new()
	_voice_availability_label.name = "AIVoiceAvailabilityLabel"
	_voice_availability_label.text = "语音已关闭：该 AI 玩家当前不会自动播报战况。"
	_voice_availability_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_voice_availability_label.add_theme_font_size_override("font_size", 13)
	_voice_availability_label.add_theme_color_override("font_color", Color(0.82, 0.88, 0.80, 0.96))
	column.add_child(_voice_availability_label)

	var profile_row := HBoxContainer.new()
	profile_row.add_theme_constant_override("separation", 10)
	column.add_child(profile_row)
	var profile_label := _make_voice_settings_label("声色")
	profile_row.add_child(profile_label)
	_voice_profile_option = OptionButton.new()
	_voice_profile_option.focus_mode = Control.FOCUS_NONE
	_voice_profile_option.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	profile_row.add_child(_voice_profile_option)

	var auto_mode_row := HBoxContainer.new()
	auto_mode_row.add_theme_constant_override("separation", 10)
	column.add_child(auto_mode_row)
	var auto_mode_label := _make_voice_settings_label("自动语音")
	auto_mode_row.add_child(auto_mode_label)
	_voice_auto_mode_option = OptionButton.new()
	_voice_auto_mode_option.focus_mode = Control.FOCUS_NONE
	_voice_auto_mode_option.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	auto_mode_row.add_child(_voice_auto_mode_option)

	var report_title := Label.new()
	report_title.text = "战况汇报"
	report_title.add_theme_font_size_override("font_size", 15)
	report_title.add_theme_color_override("font_color", Color(0.88, 0.82, 0.66, 0.98))
	column.add_child(report_title)

	_daily_summary_chat_checkbox = _make_report_setting_checkbox("每日总结进聊天")
	column.add_child(_daily_summary_chat_checkbox)
	_war_event_chat_checkbox = _make_report_setting_checkbox("攻城、来袭、驻防结果进聊天")
	column.add_child(_war_event_chat_checkbox)
	_war_report_voice_checkbox = _make_report_setting_checkbox("允许战况汇报语音播报")
	column.add_child(_war_report_voice_checkbox)
	_apply_report_setting_checkboxes_from_snapshot()

	var actions_row := HBoxContainer.new()
	actions_row.add_theme_constant_override("separation", 10)
	column.add_child(actions_row)
	_voice_refresh_button = Button.new()
	_voice_refresh_button.text = "刷新"
	_voice_refresh_button.focus_mode = Control.FOCUS_NONE
	_voice_refresh_button.custom_minimum_size = Vector2(72, 42)
	UI_COMPONENT_FACTORY.apply_ai_panel_action_button_style(_voice_refresh_button, "ai_voice_profile_refresh")
	_apply_voice_action_button_live_text(_voice_refresh_button)
	_voice_refresh_button.pressed.connect(_on_voice_profile_refresh_pressed)
	actions_row.add_child(_voice_refresh_button)
	_voice_save_button = Button.new()
	_voice_save_button.text = "保存"
	_voice_save_button.focus_mode = Control.FOCUS_NONE
	_voice_save_button.custom_minimum_size = Vector2(72, 42)
	UI_COMPONENT_FACTORY.apply_ai_panel_action_button_style(_voice_save_button, "ai_voice_profile_save")
	_apply_voice_action_button_live_text(_voice_save_button)
	_voice_save_button.pressed.connect(_on_voice_profile_save_pressed)
	actions_row.add_child(_voice_save_button)

	_voice_selection_label = Label.new()
	_voice_selection_label.text = "当前：--"
	_voice_selection_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_voice_selection_label.add_theme_font_size_override("font_size", 13)
	_voice_selection_label.add_theme_color_override("font_color", Color(0.86, 0.82, 0.70, 0.96))
	column.add_child(_voice_selection_label)

	_voice_clone_placeholder_label = Label.new()
	_voice_clone_placeholder_label.text = "玩家声音：稍后开放"
	_voice_clone_placeholder_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_voice_clone_placeholder_label.add_theme_font_size_override("font_size", 12)
	_voice_clone_placeholder_label.add_theme_color_override("font_color", Color(0.72, 0.78, 0.82, 0.92))
	column.add_child(_voice_clone_placeholder_label)

	_voice_profile_status_label = Label.new()
	_voice_profile_status_label.text = "语音档位待同步"
	_voice_profile_status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_voice_profile_status_label.add_theme_font_size_override("font_size", 12)
	_voice_profile_status_label.add_theme_color_override("font_color", Color(0.74, 0.80, 0.84, 0.90))
	column.add_child(_voice_profile_status_label)
	return panel

func _make_voice_settings_label(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.custom_minimum_size = Vector2(88, 0)
	label.add_theme_font_size_override("font_size", 14)
	label.add_theme_color_override("font_color", Color(0.90, 0.86, 0.74, 0.96))
	return label

func _apply_voice_action_button_live_text(button: Button) -> void:
	if button == null:
		return
	button.set_meta("snapshot_action_live_text_contract", "snapshot_button_row_live_text_v1")
	button.set_meta("snapshot_action_live_text_label", button.text.strip_edges())

func _apply_context_file_popup_action_button_style(button: Button, action_id: String) -> void:
	if button == null:
		return
	UI_COMPONENT_FACTORY.apply_ai_panel_action_button_style(button, action_id)
	button.set_meta("snapshot_action_live_text_contract", "snapshot_button_row_live_text_v1")
	button.set_meta("snapshot_action_live_text_label", button.text.strip_edges())

func _apply_name_edit_popup_action_button_style(button: Button, action_id: String) -> void:
	if button == null:
		return
	UI_COMPONENT_FACTORY.apply_ai_panel_action_button_style(button, action_id)
	button.set_meta("snapshot_action_live_text_contract", "snapshot_button_row_live_text_v1")
	button.set_meta("snapshot_action_live_text_label", button.text.strip_edges())

func _apply_avatar_select_popup_action_button_style(button: Button, action_id: String) -> void:
	if button == null:
		return
	UI_COMPONENT_FACTORY.apply_ai_panel_action_button_style(button, action_id)
	button.set_meta("snapshot_action_live_text_contract", "snapshot_button_row_live_text_v1")
	button.set_meta("snapshot_action_live_text_label", button.text.strip_edges())

func _make_report_setting_checkbox(text: String) -> CheckBox:
	var checkbox := CheckBox.new()
	checkbox.text = text
	checkbox.focus_mode = Control.FOCUS_NONE
	checkbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	checkbox.add_theme_font_size_override("font_size", 13)
	checkbox.add_theme_color_override("font_color", Color(0.90, 0.87, 0.76, 0.96))
	return checkbox

func _apply_report_setting_checkboxes_from_snapshot() -> void:
	var shared_state: Dictionary = _snapshot.get("shared_state", {}) as Dictionary
	if _daily_summary_chat_checkbox != null and is_instance_valid(_daily_summary_chat_checkbox):
		_daily_summary_chat_checkbox.button_pressed = bool(shared_state.get("ai_player_report_daily_summary_enabled", true))
	if _war_event_chat_checkbox != null and is_instance_valid(_war_event_chat_checkbox):
		_war_event_chat_checkbox.button_pressed = bool(shared_state.get("ai_player_report_war_event_enabled", true))
	if _war_report_voice_checkbox != null and is_instance_valid(_war_report_voice_checkbox):
		_war_report_voice_checkbox.button_pressed = bool(shared_state.get("ai_player_report_voice_enabled", false))

func _make_voice_settings_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.07, 0.08, 0.08, 0.72)
	style.border_color = Color(0.78, 0.68, 0.48, 0.34)
	style.set_border_width_all(1)
	style.set_corner_radius_all(8)
	return style

func _ensure_backend_api_client():
	if _backend_api_client != null and is_instance_valid(_backend_api_client):
		return _backend_api_client
	var client := BACKEND_API_CLIENT_SCRIPT.new()
	if client == null:
		return null
	add_child(client)
	_backend_api_client = client
	if _backend_api_client.has_method("configure"):
		_backend_api_client.call("configure", AppConfig.backend_base_url)
	return _backend_api_client

func _resolve_active_ai_player_id() -> String:
	var shared_state: Dictionary = _snapshot.get("shared_state", {}) as Dictionary
	var ai_player_id := str(shared_state.get("ai_player_primary_id", "")).strip_edges()
	if ai_player_id == "未选择":
		return ""
	return ai_player_id

func _on_voice_profile_refresh_pressed() -> void:
	await _refresh_voice_profile_catalog(true)

func run_mainline_visual_smoke_report_setting_save_selected() -> Dictionary:
	var result := {
		"attempted": true,
		"ok": false,
		"reason": "not_started",
		"smoke": "ai_panel_report_setting_save_selected_v1",
	}
	set_active_page_id("voice")
	await get_tree().process_frame
	await get_tree().process_frame
	_mount_voice_settings_panel()
	await get_tree().process_frame
	var ai_player_id := _resolve_active_ai_player_id()
	result["aiPlayerId"] = ai_player_id
	if ai_player_id == "":
		result["reason"] = "active_ai_player_missing"
		return result
	if _daily_summary_chat_checkbox == null or _war_event_chat_checkbox == null or _war_report_voice_checkbox == null:
		result["reason"] = "report_setting_controls_missing"
		return result
	_daily_summary_chat_checkbox.button_pressed = true
	_war_event_chat_checkbox.button_pressed = true
	_war_report_voice_checkbox.button_pressed = true
	await _on_voice_profile_save_pressed()
	await get_tree().process_frame
	var client = _ensure_backend_api_client()
	if client == null or not client.has_method("get_ai_player"):
		result["reason"] = "backend_profile_read_missing"
		return result
	var profile_response: Dictionary = await client.get_ai_player(ai_player_id)
	var profile_data: Dictionary = profile_response.get("data", {}) as Dictionary
	var runtime_policy: Dictionary = profile_data.get("runtimePolicy", {}) as Dictionary
	var readback_ok := (
		bool(profile_response.get("ok", false))
		and bool(runtime_policy.get("allowAutonomousCombatDailySummaryChatReports", false))
		and bool(runtime_policy.get("allowAutonomousCombatWarEventChatReports", false))
		and bool(runtime_policy.get("allowAutonomousCombatVoiceReports", false))
	)
	result["profileReadbackOk"] = readback_ok
	result["statusText"] = _voice_profile_status_label.text if _voice_profile_status_label != null and is_instance_valid(_voice_profile_status_label) else ""
	result["summary"] = get_mainline_visual_smoke_summary("voice")
	result["ok"] = readback_ok
	result["reason"] = "report_setting_save_selected_verified" if readback_ok else "report_setting_save_selected_failed"
	return result

func _on_voice_profile_save_pressed() -> void:
	var ai_player_id := _resolve_active_ai_player_id()
	if ai_player_id == "":
		_set_voice_profile_status("请先选择 AI 玩家")
		return
	var client = _ensure_backend_api_client()
	if client == null or not client.has_method("update_ai_player_voice_profile") or not client.has_method("update_ai_player_profile"):
		_set_voice_profile_status("连接暂不可用，请稍后再试")
		return
	var voice_profile_id := _read_selected_voice_profile_id()
	if voice_profile_id == "":
		_set_voice_profile_status("请选择有效声色")
		return
	var auto_mode := _read_selected_auto_speech_mode()
	_set_voice_profile_status("保存语音设置...")
	var response: Dictionary = await client.update_ai_player_voice_profile(ai_player_id, voice_profile_id, auto_mode)
	if not bool(response.get("ok", false)):
		_set_voice_profile_status("保存失败：%s" % _extract_error_text(response))
		return
	var policy_response: Dictionary = await client.update_ai_player_profile(ai_player_id, "", "", "", "godot_ai_panel", _read_report_runtime_policy_from_controls())
	if not bool(policy_response.get("ok", false)):
		_set_voice_profile_status("战况开关保存失败：%s" % _extract_error_text(policy_response))
		return
	await _refresh_voice_profile_catalog(false)
	page_action_requested.emit(get_active_page_id(), "ai_players_refresh")
	_set_voice_profile_status("已保存：%s + %s + 战况汇报" % [voice_profile_id, auto_mode])

func _read_report_runtime_policy_from_controls() -> Dictionary:
	return {
		"allowAutonomousCombatDailySummaryChatReports": _daily_summary_chat_checkbox == null or not is_instance_valid(_daily_summary_chat_checkbox) or _daily_summary_chat_checkbox.button_pressed,
		"allowAutonomousCombatWarEventChatReports": _war_event_chat_checkbox == null or not is_instance_valid(_war_event_chat_checkbox) or _war_event_chat_checkbox.button_pressed,
		"allowAutonomousCombatVoiceReports": _war_report_voice_checkbox != null and is_instance_valid(_war_report_voice_checkbox) and _war_report_voice_checkbox.button_pressed,
	}

func _read_report_setting_visible_texts() -> Array:
	var texts: Array = []
	if _daily_summary_chat_checkbox != null and is_instance_valid(_daily_summary_chat_checkbox):
		texts.append(_daily_summary_chat_checkbox.text)
	if _war_event_chat_checkbox != null and is_instance_valid(_war_event_chat_checkbox):
		texts.append(_war_event_chat_checkbox.text)
	if _war_report_voice_checkbox != null and is_instance_valid(_war_report_voice_checkbox):
		texts.append(_war_report_voice_checkbox.text)
	if _voice_profile_status_label != null and is_instance_valid(_voice_profile_status_label):
		texts.append(_voice_profile_status_label.text)
	if _voice_availability_label != null and is_instance_valid(_voice_availability_label):
		texts.append(_voice_availability_label.text)
	return texts

func _read_voice_settings_visible_texts() -> Array:
	var texts := _read_report_setting_visible_texts()
	if _voice_selection_label != null and is_instance_valid(_voice_selection_label):
		texts.append(_voice_selection_label.text)
	if _voice_clone_placeholder_label != null and is_instance_valid(_voice_clone_placeholder_label):
		texts.append(_voice_clone_placeholder_label.text)
	if _voice_profile_option != null and is_instance_valid(_voice_profile_option):
		for index in range(_voice_profile_option.item_count):
			texts.append(_voice_profile_option.get_item_text(index))
	if _voice_auto_mode_option != null and is_instance_valid(_voice_auto_mode_option):
		for index in range(_voice_auto_mode_option.item_count):
			texts.append(_voice_auto_mode_option.get_item_text(index))
	return texts

func _refresh_voice_profile_catalog(show_sync_status: bool = false) -> void:
	if _voice_settings_panel == null or not is_instance_valid(_voice_settings_panel):
		return
	var ai_player_id := _resolve_active_ai_player_id()
	_apply_voice_settings_enabled(ai_player_id != "")
	if ai_player_id == "":
		_apply_voice_profile_catalog(_build_fallback_voice_profile_catalog(), "请先选择 AI 玩家")
		return
	var client = _ensure_backend_api_client()
	if client == null or not client.has_method("get_ai_player_voice_profile"):
		_apply_voice_profile_catalog(_build_fallback_voice_profile_catalog(), "连接暂不可用，先使用默认声色")
		return
	if show_sync_status:
		_set_voice_profile_status("同步语音档位...")
	var response: Dictionary = await client.get_ai_player_voice_profile(ai_player_id)
	if not bool(response.get("ok", false)):
		_apply_voice_profile_catalog(_build_fallback_voice_profile_catalog(), "语音档位读取失败：%s" % _extract_error_text(response))
		return
	var payload_variant: Variant = response.get("data", {})
	var payload: Dictionary = payload_variant as Dictionary if payload_variant is Dictionary else {}
	_apply_voice_profile_catalog(payload, "语音档位已同步")

func _apply_voice_profile_catalog(payload: Dictionary, status_text: String = "") -> void:
	var normalized := _normalize_voice_profile_catalog(payload)
	_voice_profile_catalog = normalized.get("profiles", FALLBACK_VOICE_PROFILE_CATALOG.duplicate(true)) as Array
	var availability_variant: Variant = normalized.get("voiceAvailability", {})
	_voice_availability = _normalize_voice_availability(availability_variant as Dictionary if availability_variant is Dictionary else {})
	_voice_profile_default_id = str(normalized.get("defaultVoiceProfileId", DEFAULT_VOICE_PROFILE_ID)).strip_edges()
	if _voice_profile_default_id == "":
		_voice_profile_default_id = DEFAULT_VOICE_PROFILE_ID
	var active_selection_variant: Variant = normalized.get("activeSelection", {})
	_voice_active_selection = _normalize_voice_selection(active_selection_variant as Dictionary if active_selection_variant is Dictionary else {})
	_refresh_voice_profile_option_items()
	_refresh_voice_auto_mode_options()
	_apply_voice_selection_to_controls()
	_update_voice_selection_label()
	_update_voice_availability_label()
	if status_text != "":
		_set_voice_profile_status(status_text)

func _build_fallback_voice_profile_catalog() -> Dictionary:
	return {
		"defaultVoiceProfileId": DEFAULT_VOICE_PROFILE_ID,
		"activeSelection": _voice_active_selection.duplicate(true),
		"voiceAvailability": _voice_availability.duplicate(true),
		"profiles": FALLBACK_VOICE_PROFILE_CATALOG.duplicate(true),
	}

func _normalize_voice_profile_catalog(payload: Dictionary) -> Dictionary:
	var normalized_profiles: Array = []
	var raw_profiles: Variant = payload.get("profiles", [])
	if raw_profiles is Array:
		for raw_profile in raw_profiles as Array:
			if raw_profile is Dictionary:
				var normalized_profile := _normalize_voice_profile_entry(raw_profile as Dictionary)
				if not normalized_profile.is_empty():
					normalized_profiles.append(normalized_profile)
	if normalized_profiles.is_empty():
		normalized_profiles = FALLBACK_VOICE_PROFILE_CATALOG.duplicate(true)
	var default_voice_profile_id := str(payload.get("defaultVoiceProfileId", "")).strip_edges()
	if default_voice_profile_id == "":
		default_voice_profile_id = str((normalized_profiles[0] as Dictionary).get("voiceProfileId", DEFAULT_VOICE_PROFILE_ID)).strip_edges()
	var active_selection_variant: Variant = payload.get("activeSelection", {})
	var active_selection: Dictionary = _normalize_voice_selection(active_selection_variant as Dictionary if active_selection_variant is Dictionary else {})
	var voice_availability_variant: Variant = payload.get("voiceAvailability", {})
	var voice_availability: Dictionary = _normalize_voice_availability(voice_availability_variant as Dictionary if voice_availability_variant is Dictionary else {})
	if str(active_selection.get("voiceProfileId", "")).strip_edges() == "":
		active_selection["voiceProfileId"] = default_voice_profile_id
	return {
		"defaultVoiceProfileId": default_voice_profile_id,
		"activeSelection": active_selection,
		"voiceAvailability": voice_availability,
		"profiles": normalized_profiles,
	}

func _normalize_voice_profile_entry(profile: Dictionary) -> Dictionary:
	var voice_profile_id := str(profile.get("voiceProfileId", "")).strip_edges()
	if voice_profile_id == "":
		return {}
	var display_name := str(profile.get("displayName", "")).strip_edges()
	if display_name == "":
		display_name = voice_profile_id
	return {
		"voiceProfileId": voice_profile_id,
		"displayName": display_name,
		"gender": str(profile.get("gender", "neutral")).strip_edges(),
		"stylePreset": str(profile.get("stylePreset", "")).strip_edges(),
		"source": str(profile.get("source", "preset")).strip_edges(),
		"description": str(profile.get("description", "")).strip_edges(),
	}

func _normalize_voice_selection(selection: Dictionary) -> Dictionary:
	var voice_profile_id := str(selection.get("voiceProfileId", _voice_profile_default_id)).strip_edges()
	if voice_profile_id == "":
		voice_profile_id = _voice_profile_default_id if _voice_profile_default_id != "" else DEFAULT_VOICE_PROFILE_ID
	var auto_speech_mode := str(selection.get("autoSpeechMode", "off")).strip_edges()
	if not _is_valid_auto_speech_mode(auto_speech_mode):
		auto_speech_mode = "off"
	return {
		"voiceProfileId": voice_profile_id,
		"autoSpeechMode": auto_speech_mode,
	}

func _normalize_voice_availability(availability: Dictionary) -> Dictionary:
	var status := str(availability.get("status", "muted")).strip_edges()
	if status not in ["available", "unconfigured", "muted"]:
		status = "muted"
	var fallback_mode := str(availability.get("fallbackMode", "silent")).strip_edges()
	if fallback_mode not in ["configured_voice", "mock_audio", "silent"]:
		fallback_mode = "silent"
	var label := str(availability.get("label", "")).strip_edges()
	var summary := str(availability.get("summary", "")).strip_edges()
	if label == "":
		match status:
			"available":
				label = "语音可用"
			"unconfigured":
				label = "语音未配置"
			_:
				label = "语音已关闭"
	if summary == "":
		match status:
			"available":
				summary = "该 AI 玩家可以播放语音汇报。"
			"unconfigured":
				summary = "已保留文字汇报；配置语音服务后可播放声音。"
			_:
				summary = "该 AI 玩家当前不会自动播报战况。"
	return {
		"status": status,
		"label": label,
		"summary": summary,
		"canPlayVoice": bool(availability.get("canPlayVoice", false)),
		"fallbackMode": fallback_mode,
	}

func _refresh_voice_profile_option_items() -> void:
	if _voice_profile_option == null:
		return
	_voice_profile_option.clear()
	_voice_profile_option_ids.clear()
	for raw_profile in _voice_profile_catalog:
		if not (raw_profile is Dictionary):
			continue
		var profile := raw_profile as Dictionary
		var voice_profile_id := str(profile.get("voiceProfileId", "")).strip_edges()
		if voice_profile_id == "":
			continue
		_voice_profile_option.add_item(_format_voice_profile_option_label(profile))
		_voice_profile_option_ids.append(voice_profile_id)
	if _voice_profile_option.item_count == 0:
		_voice_profile_option.add_item("默认声色")
		_voice_profile_option_ids.append(DEFAULT_VOICE_PROFILE_ID)

func _refresh_voice_auto_mode_options() -> void:
	if _voice_auto_mode_option == null:
		return
	_voice_auto_mode_option.clear()
	_voice_auto_mode_ids.clear()
	for raw_option in VOICE_AUTO_MODE_OPTIONS:
		var option := raw_option as Dictionary
		var option_id := str(option.get("id", "")).strip_edges()
		if option_id == "":
			continue
		_voice_auto_mode_option.add_item(str(option.get("label", option_id)).strip_edges())
		_voice_auto_mode_ids.append(option_id)
	if _voice_auto_mode_option.item_count == 0:
		_voice_auto_mode_option.add_item("关闭")
		_voice_auto_mode_ids.append("off")

func _apply_voice_selection_to_controls() -> void:
	if _voice_profile_option != null and not _voice_profile_option_ids.is_empty():
		var active_profile_id := str(_voice_active_selection.get("voiceProfileId", _voice_profile_default_id)).strip_edges()
		if active_profile_id == "":
			active_profile_id = _voice_profile_default_id
		var profile_index := _voice_profile_option_ids.find(active_profile_id)
		if profile_index < 0:
			profile_index = _voice_profile_option_ids.find(_voice_profile_default_id)
		if profile_index < 0:
			profile_index = 0
		_voice_profile_option.select(profile_index)
	if _voice_auto_mode_option != null and not _voice_auto_mode_ids.is_empty():
		var auto_mode := str(_voice_active_selection.get("autoSpeechMode", "off")).strip_edges()
		if not _is_valid_auto_speech_mode(auto_mode):
			auto_mode = "off"
		var auto_mode_index := _voice_auto_mode_ids.find(auto_mode)
		if auto_mode_index < 0:
			auto_mode_index = _voice_auto_mode_ids.find("off")
		if auto_mode_index < 0:
			auto_mode_index = 0
		_voice_auto_mode_option.select(auto_mode_index)

func _read_selected_voice_profile_id() -> String:
	if _voice_profile_option == null or _voice_profile_option_ids.is_empty():
		return _voice_profile_default_id
	var selected_index := _voice_profile_option.get_selected()
	if selected_index < 0 or selected_index >= _voice_profile_option_ids.size():
		return _voice_profile_default_id
	return str(_voice_profile_option_ids[selected_index]).strip_edges()

func _read_selected_auto_speech_mode() -> String:
	if _voice_auto_mode_option == null or _voice_auto_mode_ids.is_empty():
		return "off"
	var selected_index := _voice_auto_mode_option.get_selected()
	if selected_index < 0 or selected_index >= _voice_auto_mode_ids.size():
		return "off"
	var mode := str(_voice_auto_mode_ids[selected_index]).strip_edges()
	return mode if _is_valid_auto_speech_mode(mode) else "off"

func _find_voice_profile_by_id(voice_profile_id: String) -> Dictionary:
	var normalized_id := voice_profile_id.strip_edges()
	for raw_profile in _voice_profile_catalog:
		if raw_profile is Dictionary and str((raw_profile as Dictionary).get("voiceProfileId", "")).strip_edges() == normalized_id:
			return raw_profile as Dictionary
	return {}

func _format_voice_profile_option_label(profile: Dictionary) -> String:
	var display_name := str(profile.get("displayName", "声色")).strip_edges()
	var gender_label := _format_voice_gender_label(str(profile.get("gender", "")).strip_edges())
	if gender_label == "":
		return display_name
	return "%s · %s" % [display_name, gender_label]

func _format_voice_gender_label(gender: String) -> String:
	match gender:
		"male":
			return "男声"
		"female":
			return "女声"
		"neutral":
			return "中性"
	return ""

func _format_auto_speech_mode_label(mode: String) -> String:
	match mode:
		"off":
			return "关闭"
		"auto":
			return "按情境"
		"always":
			return "始终"
	return "关闭"

func _is_valid_auto_speech_mode(mode: String) -> bool:
	return mode in ["off", "auto", "always"]

func _set_voice_profile_status(text: String) -> void:
	if _voice_profile_status_label != null and is_instance_valid(_voice_profile_status_label):
		_voice_profile_status_label.text = _sanitize_ai_panel_player_visible_copy(text, "读取失败，请稍后再试")

func _update_voice_selection_label() -> void:
	if _voice_selection_label == null or not is_instance_valid(_voice_selection_label):
		return
	var voice_profile_id := str(_voice_active_selection.get("voiceProfileId", "")).strip_edges()
	var profile := _find_voice_profile_by_id(voice_profile_id)
	var display_name := str(profile.get("displayName", "声色")).strip_edges()
	if display_name == "":
		display_name = "未选择"
	var mode := str(_voice_active_selection.get("autoSpeechMode", "off")).strip_edges()
	_voice_selection_label.text = "当前：%s / 自动语音：%s" % [
		display_name,
		_format_auto_speech_mode_label(mode),
	]

func _update_voice_availability_label() -> void:
	if _voice_availability_label == null or not is_instance_valid(_voice_availability_label):
		return
	var label := str(_voice_availability.get("label", "语音已关闭")).strip_edges()
	var summary := str(_voice_availability.get("summary", "")).strip_edges()
	var visible_text := "%s：%s" % [label, summary] if summary != "" else label
	_voice_availability_label.text = _sanitize_ai_panel_player_visible_copy(visible_text, "语音状态暂不可用")

func _apply_voice_settings_enabled(enabled: bool) -> void:
	if _voice_profile_option != null and is_instance_valid(_voice_profile_option):
		_voice_profile_option.disabled = not enabled
	if _voice_auto_mode_option != null and is_instance_valid(_voice_auto_mode_option):
		_voice_auto_mode_option.disabled = not enabled
	if _voice_save_button != null and is_instance_valid(_voice_save_button):
		_voice_save_button.disabled = not enabled
	if _voice_refresh_button != null and is_instance_valid(_voice_refresh_button):
		_voice_refresh_button.disabled = not enabled
	if _daily_summary_chat_checkbox != null and is_instance_valid(_daily_summary_chat_checkbox):
		_daily_summary_chat_checkbox.disabled = not enabled
	if _war_event_chat_checkbox != null and is_instance_valid(_war_event_chat_checkbox):
		_war_event_chat_checkbox.disabled = not enabled
	if _war_report_voice_checkbox != null and is_instance_valid(_war_report_voice_checkbox):
		_war_report_voice_checkbox.disabled = not enabled

func _voice_provider_names_hidden_in_ui() -> bool:
	var texts: Array[String] = []
	for raw_profile in _voice_profile_catalog:
		if raw_profile is Dictionary:
			var profile := raw_profile as Dictionary
			texts.append(str(profile.get("displayName", "")).to_lower())
			texts.append(str(profile.get("description", "")).to_lower())
	if _voice_selection_label != null and is_instance_valid(_voice_selection_label):
		texts.append(_voice_selection_label.text.to_lower())
	if _voice_profile_status_label != null and is_instance_valid(_voice_profile_status_label):
		texts.append(_voice_profile_status_label.text.to_lower())
	if _voice_availability_label != null and is_instance_valid(_voice_availability_label):
		texts.append(_voice_availability_label.text.to_lower())
	if _voice_profile_option != null and is_instance_valid(_voice_profile_option):
		for index in range(_voice_profile_option.item_count):
			texts.append(_voice_profile_option.get_item_text(index).to_lower())
	for text in texts:
		for raw_needle in VOICE_PROVIDER_INTERNAL_NAME_NEEDLES:
			var needle := str(raw_needle).to_lower()
			if needle != "" and text.find(needle) >= 0:
				return false
	return true

func _extract_error_text(response: Dictionary) -> String:
	var data_variant: Variant = response.get("data", {})
	if data_variant is Dictionary:
		var data := data_variant as Dictionary
		var message := str(data.get("message", data.get("error", ""))).strip_edges()
		if message != "":
			return _sanitize_ai_panel_player_visible_error_text(message)
	var message_text := str(response.get("message", response.get("error", ""))).strip_edges()
	return _sanitize_ai_panel_player_visible_error_text(message_text)

func _sanitize_ai_panel_player_visible_error_text(text: String) -> String:
	return _sanitize_ai_panel_player_visible_copy(text, "读取失败，请稍后再试")

func _sanitize_ai_panel_player_visible_copy(text: String, fallback: String) -> String:
	var value := text.strip_edges()
	if value == "":
		return fallback
	var lower_value := value.to_lower()
	for raw_term in AI_PANEL_PLAYER_VISIBLE_COPY_FORBIDDEN_TERMS:
		var term := str(raw_term).strip_edges()
		if term != "" and lower_value.find(term.to_lower()) >= 0:
			return fallback
	return value

func _open_name_edit_popup() -> void:
	_ensure_name_edit_popup()
	if _name_edit_popup == null:
		return
	if _name_edit_input != null:
		_name_edit_input.text = _resolve_current_display_name()
		_name_edit_input.select_all()
	if _name_edit_status != null:
		_name_edit_status.text = "保存后会更新AI玩家档案。"
	_name_edit_popup.visible = true
	if _name_edit_input != null:
		_name_edit_input.call_deferred("grab_focus")

func _ensure_name_edit_popup() -> void:
	if _name_edit_popup != null and is_instance_valid(_name_edit_popup):
		return
	var popup := PanelContainer.new()
	popup.name = "AINameEditPopup"
	popup.visible = false
	popup.set_anchors_preset(Control.PRESET_CENTER)
	popup.custom_minimum_size = Vector2(420, 0)
	popup.add_theme_stylebox_override("panel", _make_name_edit_style())
	add_child(popup)
	_name_edit_popup = popup

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 16)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 16)
	popup.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)

	var title := Label.new()
	title.text = "编辑AI玩家名称"
	title.add_theme_font_size_override("font_size", 18)
	column.add_child(title)

	var input := LineEdit.new()
	input.name = "AINameEditInput"
	input.placeholder_text = "输入新的AI玩家名称"
	input.text_submitted.connect(_on_name_edit_submitted)
	column.add_child(input)
	_name_edit_input = input

	var status := Label.new()
	status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	status.add_theme_font_size_override("font_size", 12)
	column.add_child(status)
	_name_edit_status = status

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	column.add_child(row)

	var save := Button.new()
	save.text = "保存"
	_apply_name_edit_popup_action_button_style(save, "ai_display_name_save")
	save.pressed.connect(_on_name_edit_confirmed)
	row.add_child(save)

	var cancel := Button.new()
	cancel.text = "取消"
	_apply_name_edit_popup_action_button_style(cancel, "ai_display_name_cancel")
	cancel.pressed.connect(_close_name_edit_popup)
	row.add_child(cancel)

func _make_name_edit_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.07, 0.08, 0.08, 0.96)
	style.border_color = Color(0.78, 0.68, 0.48, 0.45)
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 6
	style.corner_radius_top_right = 6
	style.corner_radius_bottom_left = 6
	style.corner_radius_bottom_right = 6
	return style

func _resolve_current_display_name() -> String:
	var shared_state: Dictionary = _snapshot.get("shared_state", {}) as Dictionary
	var display_name := str(shared_state.get("ai_player_primary_display_name", "")).strip_edges()
	if display_name != "":
		return display_name
	return str(shared_state.get("ai_player_primary_id", "")).strip_edges()

func _on_name_edit_submitted(_text: String) -> void:
	_on_name_edit_confirmed()

func _on_name_edit_confirmed() -> void:
	if _name_edit_input == null:
		return
	var next_name := _name_edit_input.text.strip_edges()
	if next_name == "":
		if _name_edit_status != null:
			_name_edit_status.text = "名称不能为空。"
		return
	_close_name_edit_popup()
	page_action_requested.emit(get_active_page_id(), "ai_player_display_name_save:%s" % next_name.uri_encode())

func _close_name_edit_popup() -> void:
	if _name_edit_popup != null:
		_name_edit_popup.visible = false

func _open_context_file_popup() -> void:
	_ensure_context_file_popup()
	if _context_file_popup == null:
		return
	if _context_file_title_input != null and _context_file_title_input.text.strip_edges() == "":
		_context_file_title_input.text = "%s 身份与作战说明" % _resolve_current_display_name()
	if _context_file_content_input != null and _context_file_content_input.text.strip_edges() == "":
		_context_file_content_input.text = "身份：我是当前玩家的AI玩家。\n目标：先说明意图、收益和风险，再等待玩家确认。\n汇报：每次行动后说明资源、目标、风险和后续安排。"
	if _context_file_status != null:
		_context_file_status.text = "可导入本地档案，也可以直接填写身份、记忆或指令。"
	_context_file_popup.visible = true
	_layout_context_file_popup()

func _ensure_context_file_popup() -> void:
	if _context_file_popup != null and is_instance_valid(_context_file_popup):
		return
	var popup := Panel.new()
	popup.name = "AIContextFilePopup"
	popup.visible = false
	popup.set_anchors_preset(Control.PRESET_TOP_LEFT)
	popup.custom_minimum_size = Vector2(680, 0)
	popup.clip_contents = true
	popup.add_theme_stylebox_override("panel", _make_name_edit_style())
	add_child(popup)
	_context_file_popup = popup

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 16)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 16)
	margin.offset_left = 0.0
	margin.offset_top = 0.0
	margin.offset_right = 0.0
	margin.offset_bottom = 0.0
	popup.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)

	var title := Label.new()
	title.text = "添加AI玩家档案"
	title.add_theme_font_size_override("font_size", 24)
	column.add_child(title)

	var type_row := HBoxContainer.new()
	type_row.add_theme_constant_override("separation", 8)
	column.add_child(type_row)

	_context_file_kind_option = OptionButton.new()
	_context_file_kind_option.custom_minimum_size = Vector2(128, 54)
	_context_file_kind_option.add_theme_font_size_override("font_size", 18)
	_context_file_kind_option.add_item("身份", 0)
	_context_file_kind_option.add_item("记忆", 1)
	_context_file_kind_option.add_item("技能", 2)
	_context_file_kind_option.add_item("指令", 3)
	type_row.add_child(_context_file_kind_option)

	_context_file_title_input = LineEdit.new()
	_context_file_title_input.placeholder_text = "文件标题"
	_context_file_title_input.custom_minimum_size = Vector2(0, 54)
	_context_file_title_input.add_theme_font_size_override("font_size", 18)
	_context_file_title_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	type_row.add_child(_context_file_title_input)

	_context_file_content_input = TextEdit.new()
	_context_file_content_input.custom_minimum_size = Vector2(0, 240)
	_context_file_content_input.add_theme_font_size_override("font_size", 18)
	_context_file_content_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_context_file_content_input.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	column.add_child(_context_file_content_input)

	_context_file_status = Label.new()
	_context_file_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_context_file_status.add_theme_font_size_override("font_size", 16)
	column.add_child(_context_file_status)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	column.add_child(row)

	var choose := Button.new()
	choose.text = "选择文件"
	choose.custom_minimum_size = Vector2(150, 58)
	choose.add_theme_font_size_override("font_size", 18)
	_apply_context_file_popup_action_button_style(choose, "ai_context_file_choose")
	choose.pressed.connect(_open_context_file_dialog)
	row.add_child(choose)

	var save := Button.new()
	save.text = "保存到AI玩家档案"
	save.custom_minimum_size = Vector2(210, 58)
	save.add_theme_font_size_override("font_size", 18)
	_apply_context_file_popup_action_button_style(save, "ai_context_file_save")
	save.pressed.connect(_on_context_file_confirmed)
	row.add_child(save)

	var cancel := Button.new()
	cancel.text = "取消"
	cancel.custom_minimum_size = Vector2(120, 58)
	cancel.add_theme_font_size_override("font_size", 18)
	_apply_context_file_popup_action_button_style(cancel, "ai_context_file_cancel")
	cancel.pressed.connect(_close_context_file_popup)
	row.add_child(cancel)

	_context_file_dialog = FileDialog.new()
	_context_file_dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	_context_file_dialog.access = FileDialog.ACCESS_FILESYSTEM
	_context_file_dialog.filters = PackedStringArray(["*.txt,*.md,*.skll,*.skill ; helper identity text", "*.* ; All files"])
	_context_file_dialog.file_selected.connect(_on_context_file_selected)
	add_child(_context_file_dialog)

func _layout_context_file_popup() -> void:
	if _context_file_popup == null or not is_instance_valid(_context_file_popup):
		return
	var viewport_size := get_viewport_rect().size
	var compact := viewport_size.x < 1100.0 or viewport_size.y < 650.0
	var margin := 18.0 if compact else CONTEXT_FILE_POPUP_MARGIN
	var available_width := maxf(360.0, viewport_size.x - margin * 2.0)
	var available_height := maxf(340.0, viewport_size.y - margin * 2.0)
	var popup_width := minf(680.0, available_width)
	var popup_height := minf(520.0 if not compact else 430.0, available_height)
	if _context_file_content_input != null:
		_context_file_content_input.custom_minimum_size = Vector2(0.0, 126.0 if compact else 240.0)
		_context_file_content_input.add_theme_font_size_override("font_size", 17 if compact else 18)
	if _context_file_status != null:
		_context_file_status.add_theme_font_size_override("font_size", 14 if compact else 16)
	_context_file_popup.set_anchors_preset(Control.PRESET_TOP_LEFT)
	_context_file_popup.custom_minimum_size = Vector2(popup_width, popup_height)
	_context_file_popup.size = Vector2(popup_width, popup_height)
	_context_file_popup.position = Vector2(
		maxf(margin, (viewport_size.x - popup_width) * 0.5),
		maxf(margin, (viewport_size.y - popup_height) * 0.5)
	)

func _open_context_file_dialog() -> void:
	_ensure_context_file_popup()
	if _context_file_dialog != null:
		_context_file_dialog.popup_centered_ratio(0.72)

func _on_context_file_selected(path: String) -> void:
	var content := ""
	_context_file_source_name = path.get_file()
	if _is_context_image_file(path):
		if _context_file_status != null:
			_context_file_status.text = "图片档案稍后开放。请先选择头像或导入文字档案。"
		return
	else:
		content = FileAccess.get_file_as_string(path)
		if FileAccess.get_open_error() != OK:
			if _context_file_status != null:
				_context_file_status.text = "文件读取失败。"
			return
	if _context_file_title_input != null:
		_context_file_title_input.text = _context_file_source_name
	if content.length() > MAX_CONTEXT_FILE_CHARS:
		content = content.substr(0, MAX_CONTEXT_FILE_CHARS)
		if _context_file_status != null:
			_context_file_status.text = "文件已读取，并截取前 %d 字符作为AI玩家设定。" % MAX_CONTEXT_FILE_CHARS
	elif _context_file_status != null:
		_context_file_status.text = "已读取档案。"
	if _context_file_content_input != null:
		_context_file_content_input.text = content

func _is_context_image_file(path: String) -> bool:
	var extension := path.get_extension().to_lower().strip_edges()
	return CONTEXT_IMAGE_EXTENSIONS.has(extension)

func _on_context_file_confirmed() -> void:
	if _context_file_title_input == null or _context_file_content_input == null:
		return
	var title := _context_file_title_input.text.strip_edges()
	var content := _context_file_content_input.text.strip_edges()
	if title == "":
		if _context_file_status != null:
			_context_file_status.text = "标题不能为空。"
		return
	if content == "":
		if _context_file_status != null:
			_context_file_status.text = "文件内容不能为空。"
		return
	if content.length() > MAX_CONTEXT_FILE_CHARS:
		content = content.substr(0, MAX_CONTEXT_FILE_CHARS)
	var kind := _resolve_selected_context_file_kind()
	_close_context_file_popup()
	page_action_requested.emit(
		get_active_page_id(),
		"ai_player_context_document_add:%s:%s:%s:%s" % [
			kind.uri_encode(),
			title.uri_encode(),
			_context_file_source_name.uri_encode(),
			content.uri_encode(),
		]
	)

func _resolve_selected_context_file_kind() -> String:
	if _context_file_kind_option == null:
		return "identity"
	match _context_file_kind_option.selected:
		1:
			return "memory"
		2:
			return "skill"
		3:
			return "instruction"
		_:
			return "identity"

func _close_context_file_popup() -> void:
	if _context_file_popup != null:
		_context_file_popup.visible = false

func _open_avatar_select_popup() -> void:
	_ensure_avatar_select_popup()
	if _avatar_select_popup == null:
		return
	_populate_avatar_select_grid()
	if _avatar_select_status != null:
		_avatar_select_status.text = "选择后会更新AI玩家档案，刷新后用于聊天头像和管理卡片。"
	_avatar_select_popup.visible = true

func _ensure_avatar_select_popup() -> void:
	if _avatar_select_popup != null and is_instance_valid(_avatar_select_popup):
		return
	var popup := PanelContainer.new()
	popup.name = "AIAvatarSelectPopup"
	popup.visible = false
	popup.set_anchors_preset(Control.PRESET_CENTER)
	popup.custom_minimum_size = Vector2(700, 500)
	popup.add_theme_stylebox_override("panel", _make_name_edit_style())
	add_child(popup)
	_avatar_select_popup = popup

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 16)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 16)
	popup.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)

	var title := Label.new()
	title.text = "选择AI玩家头像"
	title.add_theme_font_size_override("font_size", 24)
	column.add_child(title)

	var scroll := ScrollContainer.new()
	scroll.name = "AIAvatarSelectScroll"
	scroll.custom_minimum_size = Vector2(0, 340)
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(scroll)
	_apply_touch_scroll_chrome(scroll)
	column.add_child(scroll)

	var grid := GridContainer.new()
	grid.columns = 3
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	scroll.add_child(grid)
	_avatar_select_grid = grid

	var status := Label.new()
	status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	status.add_theme_font_size_override("font_size", 16)
	column.add_child(status)
	_avatar_select_status = status

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	column.add_child(row)

	var upload := Button.new()
	upload.text = "上传图片"
	upload.custom_minimum_size = Vector2(150, 58)
	upload.add_theme_font_size_override("font_size", 18)
	_apply_avatar_select_popup_action_button_style(upload, "ai_avatar_upload_open")
	upload.pressed.connect(_open_avatar_upload_dialog)
	row.add_child(upload)

	var close := Button.new()
	close.text = "关闭"
	close.custom_minimum_size = Vector2(140, 58)
	close.add_theme_font_size_override("font_size", 18)
	_apply_avatar_select_popup_action_button_style(close, "ai_avatar_select_close")
	close.pressed.connect(_close_avatar_select_popup)
	row.add_child(close)

	_avatar_upload_dialog = FileDialog.new()
	_avatar_upload_dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	_avatar_upload_dialog.access = FileDialog.ACCESS_FILESYSTEM
	_avatar_upload_dialog.filters = PackedStringArray(["*.png,*.jpg,*.jpeg,*.webp ; AI avatar image"])
	_avatar_upload_dialog.file_selected.connect(_on_avatar_upload_file_selected)
	add_child(_avatar_upload_dialog)

func _populate_avatar_select_grid() -> void:
	if _avatar_select_grid == null:
		return
	for child in _avatar_select_grid.get_children():
		child.queue_free()
	var portraits := _load_avatar_portrait_options()
	if portraits.is_empty():
		if _avatar_select_status != null:
			_avatar_select_status.text = "没有找到可选头像清单。"
		return
	for portrait_variant in portraits:
		if not (portrait_variant is Dictionary):
			continue
		var portrait: Dictionary = portrait_variant as Dictionary
		var avatar_id := str(portrait.get("id", "")).strip_edges()
		var avatar_image_path := str(portrait.get("image", portrait.get("portraitPath", ""))).strip_edges()
		if avatar_id == "" or avatar_image_path == "":
			continue
		var display_name := str(portrait.get("display_name", avatar_id)).strip_edges()
		var button := Button.new()
		button.text = display_name
		button.custom_minimum_size = Vector2(198, 86)
		button.add_theme_font_size_override("font_size", 17)
		button.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		var texture := _load_avatar_texture(avatar_image_path)
		if texture != null:
			button.icon = texture
			button.expand_icon = true
		button.set_meta("avatar_id", avatar_id)
		button.set_meta("avatar_image_path", avatar_image_path)
		button.set_meta("ai_panel_action_id", "ai_avatar_select_option:%s" % avatar_id)
		button.set_meta("ai_panel_action_command_bg_token", UI_COMPONENT_FACTORY.AI_PANEL_ACTION_COMMAND_BG_TOKEN)
		button.set_meta("snapshot_action_live_text_contract", "snapshot_button_row_live_text_v1")
		button.set_meta("snapshot_action_live_text_label", button.text.strip_edges())
		button.pressed.connect(_on_avatar_button_pressed.bind(button))
		_avatar_select_grid.add_child(button)

func _load_avatar_portrait_options() -> Array:
	if not FileAccess.file_exists(AI_CHAT_PORTRAIT_MANIFEST):
		return []
	var raw := FileAccess.get_file_as_string(AI_CHAT_PORTRAIT_MANIFEST)
	if FileAccess.get_open_error() != OK or raw.strip_edges() == "":
		return []
	var parsed = JSON.parse_string(raw)
	if not (parsed is Dictionary):
		return []
	var portraits_value = (parsed as Dictionary).get("portraits", [])
	if not (portraits_value is Array):
		return []
	var portraits: Array = []
	for portrait_variant in portraits_value as Array:
		if not (portrait_variant is Dictionary):
			continue
		var portrait: Dictionary = portrait_variant as Dictionary
		if bool(portrait.get("selectable", true)):
			portraits.append(portrait)
	return portraits

func _load_avatar_texture(path: String) -> Texture2D:
	if path.strip_edges() == "" or not FileAccess.file_exists(path):
		return null
	var image := Image.new()
	var load_result := image.load(path)
	if load_result != OK:
		return null
	return ImageTexture.create_from_image(image)

func _on_avatar_button_pressed(button: Button) -> void:
	var avatar_id := str(button.get_meta("avatar_id", "")).strip_edges()
	var avatar_image_path := str(button.get_meta("avatar_image_path", "")).strip_edges()
	if avatar_id == "" or avatar_image_path == "":
		if _avatar_select_status != null:
			_avatar_select_status.text = "头像数据缺失，无法保存。"
		return
	_close_avatar_select_popup()
	page_action_requested.emit(
		get_active_page_id(),
		"ai_player_avatar_save:%s:%s" % [
			avatar_id.uri_encode(),
			avatar_image_path.uri_encode(),
		]
	)

func _open_avatar_upload_dialog() -> void:
	_ensure_avatar_select_popup()
	if _avatar_upload_dialog != null:
		_avatar_upload_dialog.popup_centered_ratio(0.72)

func _on_avatar_upload_file_selected(path: String) -> void:
	var normalized_path := path.strip_edges()
	if normalized_path == "" or not FileAccess.file_exists(normalized_path):
		if _avatar_select_status != null:
			_avatar_select_status.text = "头像图片不存在，无法上传。"
		return
	var content_type := _infer_avatar_upload_content_type(normalized_path)
	if content_type == "":
		if _avatar_select_status != null:
			_avatar_select_status.text = "仅支持 PNG、JPG、WebP 头像。"
		return
	if _avatar_select_status != null:
		_avatar_select_status.text = "正在上传头像图片..."
	page_action_requested.emit(
		get_active_page_id(),
		"ai_player_avatar_upload:%s:%s" % [
			normalized_path.uri_encode(),
			content_type.uri_encode(),
		]
	)

func _infer_avatar_upload_content_type(path: String) -> String:
	var extension := path.get_extension().to_lower()
	match extension:
		"png":
			return "image/png"
		"jpg", "jpeg":
			return "image/jpeg"
		"webp":
			return "image/webp"
		_:
			return ""

func _close_avatar_select_popup() -> void:
	if _avatar_select_popup != null:
		_avatar_select_popup.visible = false

func _apply_touch_scroll_chrome(scroll: ScrollContainer) -> void:
	if scroll == null:
		return
	scroll.clip_contents = true
	scroll.follow_focus = true
	scroll.add_theme_stylebox_override("panel", StyleBoxEmpty.new())
	scroll.add_theme_constant_override("h_separation", 0)
	scroll.add_theme_constant_override("v_separation", 0)
	call_deferred("_hide_scroll_bars_for", scroll)

func _hide_scroll_bars_for(scroll: ScrollContainer) -> void:
	if scroll == null or not is_instance_valid(scroll):
		return
	for bar in [scroll.get_v_scroll_bar(), scroll.get_h_scroll_bar()]:
		if bar == null:
			continue
		bar.modulate = Color(1.0, 1.0, 1.0, 0.0)
		bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
		bar.custom_minimum_size = Vector2.ZERO
		bar.add_theme_stylebox_override("scroll", StyleBoxEmpty.new())
		bar.add_theme_stylebox_override("scroll_focus", StyleBoxEmpty.new())
		bar.add_theme_stylebox_override("grabber", StyleBoxEmpty.new())
		bar.add_theme_stylebox_override("grabber_highlight", StyleBoxEmpty.new())
		bar.add_theme_stylebox_override("grabber_pressed", StyleBoxEmpty.new())
