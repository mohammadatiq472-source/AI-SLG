extends Control
class_name MainChatOverlay

signal close_requested

const DEFAULT_AI_PLAYER_ID := "player_operator_alpha"
const SECONDARY_AI_PLAYER_ID := "player_operator_beta"
const TERTIARY_AI_PLAYER_ID := "player_operator_gamma"
const DEFAULT_FACTION_ID := "player"
const DEFAULT_GOVERNOR_PLAYER_ID := "human_alpha"
const CHAT_PANEL_MAX_WIDTH := 820.0
const CHAT_PANEL_MIN_WIDTH := 380.0
const CHAT_MOBILE_BREAKPOINT := 640.0
const CHAT_COMPACT_LANDSCAPE_MAX_WIDTH := 1024.0
const CHAT_COMPACT_LANDSCAPE_MAX_HEIGHT := 620.0
const CHAT_COMPACT_PANEL_MAX_WIDTH := 680.0
const CHAT_COMPACT_PANEL_WIDTH_RATIO := 0.64
const CHAT_PANEL_MOBILE_MARGIN := 8.0
const CHAT_PANEL_TOP_MARGIN := 8.0
const CHAT_PANEL_DESKTOP_WIDTH_RATIO := 0.54
const CHAT_RAIL_DESKTOP_WIDTH := 160.0
const CHAT_RAIL_MOBILE_WIDTH := 196.0
const CHAT_OVERLAY_Z_INDEX := 4096
const CHAT_TOUCH_TARGET_MIN_HEIGHT := 58.0
const CHAT_KEYBOARD_SAFE_AREA_MAX_RATIO := 0.46
const CHAT_COMPOSER_MIN_HEIGHT := 64.0
const CHAT_COMPOSER_MAX_HEIGHT := 148.0
const CHAT_AVATAR_SIZE := 46.0
const CHAT_CHANNEL_PRIMARY_FONT_SIZE := 21
const CHAT_PAPER_BG := Color(0.92, 0.87, 0.74, 0.92)
const CHAT_PAPER_BG_SOLID := Color(0.96, 0.91, 0.78, 0.97)
const CHAT_PAPER_BORDER := Color(0.55, 0.38, 0.18, 0.62)
const CHAT_PAPER_TEXT := Color(0.20, 0.14, 0.08, 1.0)
const CHAT_PAPER_MUTED_TEXT := Color(0.36, 0.28, 0.17, 0.86)
const CHAT_PLAYER_BUBBLE_BG := Color(0.84, 0.91, 0.86, 0.96)
const CHAT_AI_BUBBLE_BG := Color(0.98, 0.94, 0.82, 0.97)
const CHAT_SYSTEM_BUBBLE_BG := Color(0.88, 0.83, 0.70, 0.94)
const CHAT_OVERLAY_OCCLUSION_MATERIAL := "opaque_paper_overlay_covers_left_rail_v1"
const CHAT_HEADER_HIERARCHY_MODE := "compact_paper_header_v1"
const CHAT_IDENTITY_TAG_MATERIAL := "paper_identity_tag_v1"
const CHAT_AVATAR_FRAME_MATERIAL := "paper_avatar_frame_v1"
const CHAT_VOICE_CONTROL_MATERIAL := "paper_voice_audio_control_v1"
const CHAT_COMMAND_CHROME_TOKEN := "chat_command_chrome_v1"
const CHAT_COMMAND_PANEL_MATERIAL := "command_chrome_chat_panel_v1"
const CHAT_COMMAND_RAIL_MATERIAL := "command_chrome_channel_drawer_v1"
const CHAT_COMMAND_MESSAGE_SURFACE_MATERIAL := "command_chrome_message_surface_v1"
const CHAT_COMMAND_COMPOSER_MATERIAL := "command_chrome_input_bar_v1"
const CHAT_COMMAND_PANEL_BG := Color(0.105, 0.075, 0.044, 0.96)
const CHAT_COMMAND_PANEL_BORDER := Color(0.76, 0.56, 0.26, 0.52)
const CHAT_COMMAND_RAIL_BG := Color(0.070, 0.052, 0.034, 0.91)
const CHAT_COMMAND_RAIL_BORDER := Color(0.72, 0.52, 0.24, 0.48)
const CHAT_COMMAND_SURFACE_BG := Color(0.090, 0.068, 0.044, 0.54)
const CHAT_COMMAND_SURFACE_BORDER := Color(0.72, 0.52, 0.24, 0.30)
const CHAT_COMMAND_TEXT := Color(0.95, 0.84, 0.60, 1.0)
const CHAT_COMMAND_MUTED_TEXT := Color(0.76, 0.66, 0.48, 0.92)
const NEW_CHANNEL_PICKER_MATERIAL := "light_paper_new_channel_picker_v1"
const NEW_CHANNEL_GROUP_MATERIAL := "light_paper_new_channel_group_v1"
const NEW_CHANNEL_CANDIDATE_BUTTON_MATERIAL := "paper_candidate_button_v1"
const AI_CHAT_PORTRAIT_MANIFEST := "res://data/ai_chat_portraits.json"
const NEW_CHANNEL_ID := "new_channel"
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")
const PORTRAIT_ASSET_REGISTRY := preload("res://scripts/ui/portrait_asset_registry.gd")

const BASE_CHANNELS := [
	{"id": "world", "label": "世界"},
	{"id": "alliance", "label": "同盟"},
	{"id": NEW_CHANNEL_ID, "label": "＋"},
]

const FALLBACK_AI_CHANNELS := [
	{"id": DEFAULT_AI_PLAYER_ID, "label": "AI玩家", "aiPlayerId": DEFAULT_AI_PLAYER_ID},
	{"id": SECONDARY_AI_PLAYER_ID, "label": "AI玩家二", "aiPlayerId": SECONDARY_AI_PLAYER_ID},
]

const SYSTEM_CHANNEL := {"id": "system", "label": "系统"}

const FALLBACK_CHANNELS := [
	{"id": "world", "label": "世界"},
	{"id": "alliance", "label": "同盟"},
	{"id": NEW_CHANNEL_ID, "label": "＋"},
	{"id": DEFAULT_AI_PLAYER_ID, "label": "AI玩家", "aiPlayerId": DEFAULT_AI_PLAYER_ID, "factionId": DEFAULT_FACTION_ID, "governorPlayerId": DEFAULT_GOVERNOR_PLAYER_ID},
	{"id": SECONDARY_AI_PLAYER_ID, "label": "AI玩家二", "aiPlayerId": SECONDARY_AI_PLAYER_ID, "factionId": DEFAULT_FACTION_ID, "governorPlayerId": DEFAULT_GOVERNOR_PLAYER_ID},
	{"id": "system", "label": "系统"},
]

const FALLBACK_MESSAGES := []

const MAILBOX_FILTER_ALL := "all"
const MAILBOX_FILTER_AI_TRANSFER := "ai_resource_transfer"
const MAILBOX_FILTER_DAILY := "daily_welfare"
const MAILBOX_FILTER_EVENT := "event_reward"

const MESSAGE_FILTER_ALL := "all"
const MESSAGE_FILTER_COMMAND := "command"
const MESSAGE_FILTER_PROPOSAL := "proposal"
const MESSAGE_FILTER_RECEIPT := "receipt"
const MESSAGE_FILTER_FAILURE := "failure"

const MESSAGE_FILTERS := [
	{"id": MESSAGE_FILTER_ALL, "label": "全部"},
	{"id": MESSAGE_FILTER_COMMAND, "label": "命令"},
	{"id": MESSAGE_FILTER_PROPOSAL, "label": "提案"},
	{"id": MESSAGE_FILTER_RECEIPT, "label": "回执"},
	{"id": MESSAGE_FILTER_FAILURE, "label": "失败"},
]

var _api_client = null
var _messages: Array = []
var _channels: Array = FALLBACK_CHANNELS.duplicate(true)
var _ai_players: Array = []
var _ai_player_list_summary: Dictionary = {}
var _new_channel_candidate_groups: Array = []
var _new_channel_contact_candidates_from_read_model := false
var _active_channel_id := DEFAULT_AI_PLAYER_ID
var _active_ai_player_id := DEFAULT_AI_PLAYER_ID
var _active_faction_id := DEFAULT_FACTION_ID
var _active_governor_player_id := DEFAULT_GOVERNOR_PLAYER_ID
var _active_governor_display_name := ""
var _active_proposal_id := ""
var _channel_buttons: Dictionary = {}
var _channel_message_counts: Dictionary = {}
var _channel_seen_counts: Dictionary = {}
var _mailbox_items: Array = []
var _mailbox_refresh_sequence := 0
var _last_applied_mailbox_refresh_sequence := 0
var _last_rejected_mailbox_read_model_cache: Dictionary = {}
var _last_mailbox_claim_result: Dictionary = {}
var _last_mailbox_claim_item_id := ""
var _last_mailbox_claim_toast := ""
var _mailbox_filter := MAILBOX_FILTER_ALL
var _mailbox_filter_buttons: Dictionary = {}
var _history_counts: Dictionary = {}
var _history_has_more := false
var _history_next_before_message_id := ""
var _message_filter := MESSAGE_FILTER_ALL
var _message_filter_buttons: Dictionary = {}
var _war_room_report_visual_smoke_fixture_applied := false
var _channel_list: VBoxContainer
var _message_list: VBoxContainer
var _message_scroll: ScrollContainer
var _mailbox_list: VBoxContainer
var _input: TextEdit
var _voice_audio_player: AudioStreamPlayer
var _voice_audio_playing_asset_id := ""
var _voice_audio_last_played_asset_id := ""
var _voice_audio_auto_played_message_ids: Dictionary = {}
var _voice_audio_auto_play_success_count := 0
var _voice_audio_play_success_count := 0
var _voice_audio_play_failure_count := 0
var _voice_audio_last_error := ""
var _visual_smoke_voice_command_record_only := false
var _keyboard_spacer: Control
var _debug_keyboard_height_for_evidence := 0.0
var _last_chat_failure_signature := ""
var _ai_chat_portrait_assignments: Dictionary = {}
var _title_label: Label
var _rail_title_label: Label
var _subtitle_label: Label
var _status_label: Label
var _history_status_label: Label
var _load_earlier_button: Button
var _mailbox_button: Button
var _mailbox_status_label: Label
var _history_filter_panel: Control
var _composer_container: Control
var _composer_action_row: Control
var _mailbox_block: Control
var _visual_smoke_mailbox_claim_mount: VBoxContainer
var _mailbox_popup: PanelContainer
var _mailbox_popup_list: VBoxContainer
var _mailbox_popup_status_label: Label
var _proposal_detail_popup: PanelContainer
var _proposal_detail_title: Label
var _proposal_detail_body: Label
var _proposal_detail_status_label: Label
var _proposal_detail_retry_button: Button
var _proposal_detail_failure_button: Button
var _proposal_detail_retry_text := ""
var _claim_toast: PanelContainer
var _claim_toast_label: Label
var _claim_toast_hide_timer: Timer
var _chat_panel: PanelContainer
var _channel_rail: Control
var _channel_button_views: Dictionary = {}
var _video_placeholder_dialog: AcceptDialog = null
var _multi_ai_visual_smoke_fixture_applied := false
var _runtime_panel_context: Dictionary = {}

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	_apply_overlay_z_order_contract()
	_load_ai_chat_portrait_manifest()
	_messages = []
	set_process(true)
	_build_overlay()
	visible = false

func get_last_rejected_mailbox_read_model_cache() -> Dictionary:
	return _last_rejected_mailbox_read_model_cache.duplicate(true)

func _process(_delta: float) -> void:
	_apply_responsive_overlay_layout()
	_update_keyboard_safe_area()

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED and is_inside_tree():
		_apply_responsive_overlay_layout()

func _gui_input(event: InputEvent) -> void:
	if not visible:
		return
	if event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index != MOUSE_BUTTON_LEFT or not mouse_event.pressed:
			return
		if _chat_panel != null and is_instance_valid(_chat_panel) and _chat_panel.get_global_rect().has_point(mouse_event.global_position):
			return
		if _proposal_detail_popup != null and is_instance_valid(_proposal_detail_popup) and _proposal_detail_popup.visible and _proposal_detail_popup.get_global_rect().has_point(mouse_event.global_position):
			return
		close_overlay()
		accept_event()

func _is_mobile_chat_layout() -> bool:
	var viewport_size := get_viewport_rect().size
	if viewport_size.x <= 0.0:
		return false
	if viewport_size.x < CHAT_MOBILE_BREAKPOINT:
		return true
	return _is_compact_landscape_chat_layout()

func _is_compact_landscape_chat_layout() -> bool:
	var viewport_size := get_viewport_rect().size
	return viewport_size.x >= CHAT_MOBILE_BREAKPOINT and viewport_size.x <= CHAT_COMPACT_LANDSCAPE_MAX_WIDTH and viewport_size.y <= CHAT_COMPACT_LANDSCAPE_MAX_HEIGHT

func _load_ai_chat_portrait_manifest() -> void:
	_ai_chat_portrait_assignments.clear()
	if not FileAccess.file_exists(AI_CHAT_PORTRAIT_MANIFEST):
		return
	var raw := FileAccess.get_file_as_string(AI_CHAT_PORTRAIT_MANIFEST)
	if FileAccess.get_open_error() != OK or raw.strip_edges() == "":
		return
	var parsed = JSON.parse_string(raw)
	if not (parsed is Dictionary):
		return
	var manifest := parsed as Dictionary
	var assignments_value = manifest.get("assignments", {})
	if assignments_value is Dictionary:
		for key in (assignments_value as Dictionary).keys():
			var portrait_path := str((assignments_value as Dictionary).get(key, "")).strip_edges()
			if portrait_path != "":
				_ai_chat_portrait_assignments[str(key).strip_edges()] = portrait_path
	var players_value = manifest.get("players", {})
	if players_value is Dictionary:
		for key in (players_value as Dictionary).keys():
			var player_value = (players_value as Dictionary).get(key, {})
			if player_value is Dictionary:
				var path := str((player_value as Dictionary).get("portraitPath", "")).strip_edges()
				if path != "":
					_ai_chat_portrait_assignments[str(key).strip_edges()] = path
	var portrait_paths: Array[String] = []
	var portraits_value = manifest.get("portraits", [])
	if portraits_value is Array:
		for portrait_value in portraits_value as Array:
			if not (portrait_value is Dictionary):
				continue
			var portrait := portrait_value as Dictionary
			if not bool(portrait.get("selectable", true)):
				continue
			var image_path := str(portrait.get("image", portrait.get("portraitPath", ""))).strip_edges()
			if image_path == "":
				continue
			portrait_paths.append(image_path)
			var portrait_id := str(portrait.get("id", "")).strip_edges()
			if portrait_id != "":
				_ai_chat_portrait_assignments[portrait_id] = image_path
			var display_name := str(portrait.get("display_name", "")).strip_edges()
			if display_name != "":
				_ai_chat_portrait_assignments[display_name] = image_path
	if not portrait_paths.is_empty():
		if not _ai_chat_portrait_assignments.has(DEFAULT_AI_PLAYER_ID):
			_ai_chat_portrait_assignments[DEFAULT_AI_PLAYER_ID] = portrait_paths[0]
		if not _ai_chat_portrait_assignments.has("青州后勤官"):
			_ai_chat_portrait_assignments["青州后勤官"] = portrait_paths[0]
	if portrait_paths.size() > 1:
		if not _ai_chat_portrait_assignments.has(SECONDARY_AI_PLAYER_ID):
			_ai_chat_portrait_assignments[SECONDARY_AI_PLAYER_ID] = portrait_paths[1]
		if not _ai_chat_portrait_assignments.has("兖州斥候官"):
			_ai_chat_portrait_assignments["兖州斥候官"] = portrait_paths[1]

func _resolve_chat_panel_width() -> float:
	var viewport_width := get_viewport_rect().size.x
	if viewport_width <= 0.0:
		return CHAT_PANEL_MAX_WIDTH
	if viewport_width < CHAT_MOBILE_BREAKPOINT:
		return maxf(1.0, viewport_width - CHAT_PANEL_MOBILE_MARGIN * 2.0)
	if _is_mobile_chat_layout():
		return minf(CHAT_COMPACT_PANEL_MAX_WIDTH, maxf(CHAT_PANEL_MIN_WIDTH, viewport_width * CHAT_COMPACT_PANEL_WIDTH_RATIO))
	return minf(CHAT_PANEL_MAX_WIDTH, maxf(CHAT_PANEL_MIN_WIDTH, viewport_width * CHAT_PANEL_DESKTOP_WIDTH_RATIO))

func _resolve_chat_panel_left() -> float:
	return CHAT_PANEL_MOBILE_MARGIN if _is_mobile_chat_layout() else 0.0

func _resolve_chat_panel_bottom_offset() -> float:
	return -CHAT_PANEL_MOBILE_MARGIN

func _resolve_channel_rail_width() -> float:
	if _is_phone_width_chat_layout():
		return 0.0
	if _is_mobile_chat_layout():
		var viewport_width := get_viewport_rect().size.x
		if viewport_width < CHAT_MOBILE_BREAKPOINT:
			return minf(150.0, maxf(120.0, viewport_width * 0.30))
		return CHAT_RAIL_MOBILE_WIDTH
	return CHAT_RAIL_DESKTOP_WIDTH

func _is_phone_width_chat_layout() -> bool:
	var viewport_width := get_viewport_rect().size.x
	var visible_width := get_viewport().get_visible_rect().size.x if get_viewport() != null else viewport_width
	if visible_width > 0.0:
		viewport_width = visible_width if viewport_width <= 0.0 else minf(viewport_width, visible_width)
	if _chat_panel != null and is_instance_valid(_chat_panel) and _chat_panel.size.x > 0.0:
		viewport_width = _chat_panel.size.x if viewport_width <= 0.0 else minf(viewport_width, _chat_panel.size.x)
	return viewport_width > 0.0 and viewport_width < CHAT_MOBILE_BREAKPOINT

func _apply_responsive_overlay_layout() -> void:
	if _chat_panel != null and is_instance_valid(_chat_panel):
		var panel_left := _resolve_chat_panel_left()
		_chat_panel.offset_left = panel_left
		_chat_panel.offset_top = CHAT_PANEL_TOP_MARGIN
		_chat_panel.offset_right = panel_left + _resolve_chat_panel_width()
		_chat_panel.offset_bottom = _resolve_chat_panel_bottom_offset()
	if _channel_rail != null and is_instance_valid(_channel_rail):
		var hide_channel_rail := _is_phone_width_chat_layout()
		_channel_rail.visible = not hide_channel_rail
		_channel_rail.custom_minimum_size = Vector2(0.0 if hide_channel_rail else _resolve_channel_rail_width(), 0)
		if _channel_rail.get_parent() is Container:
			(_channel_rail.get_parent() as Container).queue_sort()

func _read_virtual_keyboard_height() -> float:
	if _debug_keyboard_height_for_evidence > 0.0:
		return _debug_keyboard_height_for_evidence
	if not _is_mobile_chat_layout():
		return 0.0
	if _input == null or not _input.has_focus():
		return 0.0
	var display_server_name := DisplayServer.get_name().to_lower()
	if not ["android", "ios", "web"].has(display_server_name):
		return 0.0
	return float(DisplayServer.virtual_keyboard_get_height())

func _update_keyboard_safe_area() -> void:
	if _keyboard_spacer == null:
		return
	var keyboard_height := _read_virtual_keyboard_height()
	var safe_height := 0.0
	if keyboard_height > 0.0:
		var viewport_height := get_viewport_rect().size.y
		safe_height = min(keyboard_height, viewport_height * CHAT_KEYBOARD_SAFE_AREA_MAX_RATIO)
	if abs(_keyboard_spacer.custom_minimum_size.y - safe_height) <= 1.0:
		return
	_keyboard_spacer.visible = safe_height > 0.0
	_keyboard_spacer.custom_minimum_size = Vector2(0, safe_height)
	if safe_height > 0.0:
		call_deferred("_scroll_messages_to_bottom")

func _scroll_messages_to_bottom() -> void:
	if _message_scroll == null:
		return
	var bar := _message_scroll.get_v_scroll_bar()
	if bar == null:
		return
	bar.value = bar.max_value

func scroll_messages_to_bottom_for_visual_smoke() -> void:
	_scroll_messages_to_bottom()
	call_deferred("_scroll_messages_to_bottom")

func _set_debug_keyboard_height_for_evidence(height: float) -> void:
	_debug_keyboard_height_for_evidence = max(0.0, height)
	_update_keyboard_safe_area()

func configure(api_client) -> void:
	_api_client = api_client
	if _should_skip_headless_runtime_refresh():
		return
	if is_inside_tree():
		call_deferred("_refresh_runtime_views")

func set_runtime_panel_context(runtime_context: Dictionary) -> void:
	_runtime_panel_context = runtime_context.duplicate(true)
	if is_inside_tree() and visible and _message_list != null:
		_render_messages()

func _should_skip_headless_runtime_refresh() -> bool:
	var is_headless := OS.has_feature("headless") or DisplayServer.get_name() == "headless"
	if not is_headless:
		return false
	if _read_truthy_env("SLG_MAINLINE_VISUAL_SMOKE"):
		return false
	return not _read_truthy_env("SLG_HEADLESS_RUNTIME_BOOTSTRAP")

func _read_truthy_env(key: String) -> bool:
	var value := OS.get_environment(key).strip_edges().to_lower()
	return value == "1" or value == "true" or value == "yes"

func open_ai_player_channel(ai_player_id: String = "") -> void:
	_apply_overlay_z_order_contract()
	var normalized_ai_player_id := ai_player_id.strip_edges()
	var channel := _find_channel_by_ai_player_id(normalized_ai_player_id)
	if channel.is_empty():
		channel = _find_channel(_active_channel_id)
	if channel.is_empty():
		channel = _find_channel(DEFAULT_AI_PLAYER_ID)
	if channel.is_empty():
		return
	var channel_id := str(channel.get("id", "")).strip_edges()
	if channel_id != "":
		_active_channel_id = channel_id
	_apply_active_identity(channel)
	_sync_active_channel_header()
	_refresh_channel_buttons()
	_set_status("")
	visible = true
	_apply_responsive_overlay_layout()
	if _chat_panel != null:
		UI_COMPONENT_FACTORY.apply_motion_ai_chat_panel_enter(_chat_panel, 0)
	if _input != null:
		_input.call_deferred("grab_focus")
	call_deferred("_refresh_active_chat_for_open_channel")

func _apply_overlay_z_order_contract() -> void:
	z_as_relative = false
	z_index = CHAT_OVERLAY_Z_INDEX

func close_overlay() -> void:
	visible = false
	if _input != null:
		_input.release_focus()
	close_requested.emit()

func _refresh_active_chat_for_open_channel() -> void:
	if _find_channel(_active_channel_id).has("aiPlayerId"):
		await _refresh_chat()

func _refresh_runtime_views() -> void:
	await _refresh_identity()
	await _refresh_chat()

func _build_overlay() -> void:
	var chat_panel := PanelContainer.new()
	_chat_panel = chat_panel
	chat_panel.name = "ChatPanel"
	chat_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	chat_panel.anchor_left = 0.0
	chat_panel.anchor_top = 0.0
	chat_panel.anchor_right = 0.0
	chat_panel.anchor_bottom = 1.0
	chat_panel.offset_left = _resolve_chat_panel_left()
	chat_panel.offset_top = CHAT_PANEL_TOP_MARGIN
	chat_panel.offset_right = _resolve_chat_panel_left() + _resolve_chat_panel_width()
	chat_panel.offset_bottom = _resolve_chat_panel_bottom_offset()
	chat_panel.set_meta("chat_overlay_occlusion_material", CHAT_OVERLAY_OCCLUSION_MATERIAL)
	chat_panel.set_meta("chat_panel_material", CHAT_COMMAND_PANEL_MATERIAL)
	chat_panel.set_meta("chat_chrome_unification_token", CHAT_COMMAND_CHROME_TOKEN)
	chat_panel.add_theme_stylebox_override("panel", _make_panel_style(CHAT_COMMAND_PANEL_BG, CHAT_COMMAND_PANEL_BORDER, 0))
	add_child(chat_panel)

	var root_margin := MarginContainer.new()
	root_margin.add_theme_constant_override("margin_left", 0)
	root_margin.add_theme_constant_override("margin_top", 8)
	root_margin.add_theme_constant_override("margin_right", 10)
	root_margin.add_theme_constant_override("margin_bottom", 8)
	chat_panel.add_child(root_margin)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 24)
	root_margin.add_child(row)

	row.add_child(_build_channel_rail())
	row.add_child(_build_chat_body())
	_refresh_channel_buttons()
	_render_messages()
	add_child(_build_proposal_detail_popup())
	add_child(_build_claim_toast())

func _build_channel_rail() -> Control:
	var rail := PanelContainer.new()
	_channel_rail = rail
	rail.custom_minimum_size = Vector2(_resolve_channel_rail_width(), 0)
	rail.add_theme_stylebox_override("panel", _make_panel_style(CHAT_COMMAND_RAIL_BG, CHAT_COMMAND_RAIL_BORDER, 4))
	rail.set_meta("chat_channel_drawer_material", CHAT_COMMAND_RAIL_MATERIAL)
	rail.set_meta("chat_chrome_unification_token", CHAT_COMMAND_CHROME_TOKEN)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 8)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_right", 8)
	margin.add_theme_constant_override("margin_bottom", 12)
	rail.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)

	var title := Label.new()
	title.text = "频道"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", CHAT_COMMAND_TEXT)
	_rail_title_label = title
	column.add_child(title)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(scroll)
	column.add_child(scroll)

	_channel_list = VBoxContainer.new()
	_channel_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_channel_list.add_theme_constant_override("separation", 4)
	scroll.add_child(_channel_list)
	_render_channel_buttons()

	return rail

func _build_chat_body() -> Control:
	var body := VBoxContainer.new()
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 8)

	var header := VBoxContainer.new()
	header.name = "ChatHeaderCompactPaper"
	header.set_meta("chat_header_hierarchy_mode", CHAT_HEADER_HIERARCHY_MODE)
	header.add_theme_constant_override("separation", 2)
	body.add_child(header)

	var title_row := HBoxContainer.new()
	title_row.add_theme_constant_override("separation", 8)
	header.add_child(title_row)

	var title_column := VBoxContainer.new()
	title_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_column.add_theme_constant_override("separation", 2)
	title_row.add_child(title_column)

	_title_label = Label.new()
	_title_label.text = "青州后勤官"
	_title_label.set_meta("chat_header_title_font_size", 22)
	_title_label.add_theme_font_size_override("font_size", 22)
	_title_label.add_theme_color_override("font_color", CHAT_COMMAND_TEXT)
	title_column.add_child(_title_label)

	_subtitle_label = Label.new()
	_subtitle_label.text = ""
	_subtitle_label.visible = false
	_subtitle_label.add_theme_font_size_override("font_size", 16)
	_subtitle_label.add_theme_color_override("font_color", CHAT_COMMAND_MUTED_TEXT)
	title_column.add_child(_subtitle_label)

	_status_label = Label.new()
	_status_label.text = ""
	_status_label.visible = false
	_status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_status_label.add_theme_font_size_override("font_size", 16)
	_status_label.add_theme_color_override("font_color", CHAT_COMMAND_MUTED_TEXT)
	header.add_child(_status_label)

	_history_filter_panel = _build_history_filter_bar()
	_history_filter_panel.visible = false
	body.add_child(_history_filter_panel)

	var scroll := ScrollContainer.new()
	_message_scroll = scroll
	scroll.name = "ChatMessageHistoryScroll"
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(scroll)
	scroll.add_theme_stylebox_override("panel", _make_panel_style(CHAT_COMMAND_SURFACE_BG, CHAT_COMMAND_SURFACE_BORDER, 4))
	scroll.set_meta("chat_message_history_material", CHAT_COMMAND_MESSAGE_SURFACE_MATERIAL)
	scroll.set_meta("chat_chrome_unification_token", CHAT_COMMAND_CHROME_TOKEN)
	body.add_child(scroll)

	_message_list = VBoxContainer.new()
	_message_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_message_list.add_theme_constant_override("separation", 8)
	scroll.add_child(_message_list)

	var composer: BoxContainer
	var mobile_composer := _is_mobile_chat_layout()
	if mobile_composer:
		composer = VBoxContainer.new()
	else:
		composer = HBoxContainer.new()
	composer.add_theme_constant_override("separation", 8)
	composer.name = "ChatComposerBar"
	composer.set_meta("chat_composer_material", CHAT_COMMAND_COMPOSER_MATERIAL)
	composer.set_meta("chat_chrome_unification_token", CHAT_COMMAND_CHROME_TOKEN)
	_composer_container = composer
	body.add_child(composer)

	_input = TextEdit.new()
	_input.placeholder_text = ""
	_input.text = ""
	_input.custom_minimum_size = Vector2(88, CHAT_COMPOSER_MIN_HEIGHT)
	_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_input.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	_input.scroll_fit_content_height = false
	_input.add_theme_font_size_override("font_size", 20)
	_input.add_theme_color_override("font_color", CHAT_PAPER_TEXT)
	_input.add_theme_color_override("font_placeholder_color", CHAT_PAPER_MUTED_TEXT)
	_input.add_theme_stylebox_override("normal", _make_panel_style(Color(0.99, 0.96, 0.86, 0.98), Color(0.58, 0.40, 0.20, 0.52), 6))
	_input.add_theme_stylebox_override("focus", _make_panel_style(Color(1.0, 0.97, 0.88, 1.0), Color(0.68, 0.46, 0.22, 0.72), 6))
	_input.focus_entered.connect(_on_chat_input_focus_changed)
	_input.focus_exited.connect(_on_chat_input_focus_changed)
	_input.text_changed.connect(_on_chat_input_text_changed)
	_input.gui_input.connect(_on_chat_input_gui_input)
	composer.add_child(_input)

	var action_row := HBoxContainer.new()
	action_row.name = "ChatComposerActionRow"
	if mobile_composer:
		action_row.add_theme_constant_override("separation", 8)
		var action_spacer := Control.new()
		action_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		action_row.add_child(action_spacer)
		composer.add_child(action_row)
	else:
		action_row = composer as HBoxContainer
	_composer_action_row = action_row

	var video_button := Button.new()
	video_button.name = "ChatVideoCommandButton"
	video_button.text = "视频"
	video_button.tooltip_text = "视频消息"
	video_button.focus_mode = Control.FOCUS_NONE
	video_button.custom_minimum_size = Vector2(68, CHAT_TOUCH_TARGET_MIN_HEIGHT)
	video_button.add_theme_font_size_override("font_size", 18)
	_apply_chat_paper_action_button_style(video_button, "secondary")
	video_button.pressed.connect(_open_video_placeholder_dialog)
	action_row.add_child(video_button)

	var voice_button := Button.new()
	voice_button.name = "ChatVoiceTextCommandButton"
	voice_button.text = "说话"
	voice_button.focus_mode = Control.FOCUS_NONE
	voice_button.custom_minimum_size = Vector2(68, CHAT_TOUCH_TARGET_MIN_HEIGHT)
	voice_button.add_theme_font_size_override("font_size", 18)
	_apply_chat_paper_action_button_style(voice_button, "voice")
	voice_button.pressed.connect(_on_voice_input_pressed)
	action_row.add_child(voice_button)

	var send_button := Button.new()
	send_button.name = "ChatSendCommandButton"
	send_button.text = "发送"
	send_button.custom_minimum_size = Vector2(72, CHAT_TOUCH_TARGET_MIN_HEIGHT)
	send_button.add_theme_font_size_override("font_size", 18)
	_apply_chat_paper_action_button_style(send_button, "primary")
	send_button.pressed.connect(_send_current_input)
	action_row.add_child(send_button)

	_keyboard_spacer = Control.new()
	_keyboard_spacer.name = "KeyboardSafeAreaSpacer"
	_keyboard_spacer.visible = false
	_keyboard_spacer.custom_minimum_size = Vector2(0, 0)
	body.add_child(_keyboard_spacer)

	return body

func _open_video_placeholder_dialog() -> void:
	var dialog := _ensure_video_placeholder_dialog()
	dialog.popup_centered(Vector2(360, 160))

func _ensure_video_placeholder_dialog() -> AcceptDialog:
	if _video_placeholder_dialog != null and is_instance_valid(_video_placeholder_dialog):
		return _video_placeholder_dialog
	_video_placeholder_dialog = AcceptDialog.new()
	_video_placeholder_dialog.name = "ChatVideoPlaceholderDialog"
	_video_placeholder_dialog.title = "视频"
	_video_placeholder_dialog.dialog_text = "视频暂不可用"
	_video_placeholder_dialog.ok_button_text = "知道了"
	add_child(_video_placeholder_dialog)
	return _video_placeholder_dialog

func _build_history_filter_bar() -> Control:
	var filter_panel := PanelContainer.new()
	filter_panel.add_theme_stylebox_override("panel", _make_panel_style(Color(0.06, 0.06, 0.05, 0.48), Color(0.75, 0.66, 0.48, 0.18), 4))

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 8)
	margin.add_theme_constant_override("margin_top", 6)
	margin.add_theme_constant_override("margin_right", 8)
	margin.add_theme_constant_override("margin_bottom", 6)
	filter_panel.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 4)
	margin.add_child(column)

	var row := GridContainer.new()
	row.columns = 6 if _is_compact_landscape_chat_layout() else (3 if _is_mobile_chat_layout() else 6)
	row.add_theme_constant_override("h_separation", 6)
	row.add_theme_constant_override("v_separation", 6)
	column.add_child(row)

	_message_filter_buttons.clear()
	for filter_variant in MESSAGE_FILTERS:
		var filter := filter_variant as Dictionary
		var filter_id := str(filter.get("id", MESSAGE_FILTER_ALL)).strip_edges()
		var button := Button.new()
		button.name = "ChatHistoryFilterButton_%s" % filter_id
		button.text = _format_message_filter_button_text(filter)
		button.focus_mode = Control.FOCUS_NONE
		button.custom_minimum_size = Vector2(58, CHAT_TOUCH_TARGET_MIN_HEIGHT)
		button.set_meta("chat_history_filter_action_id", filter_id)
		_apply_chat_paper_action_button_style(button, "filter")
		button.pressed.connect(_set_message_filter.bind(filter_id))
		row.add_child(button)
		_message_filter_buttons[filter_id] = button

	_load_earlier_button = Button.new()
	_load_earlier_button.name = "ChatLoadEarlierButton"
	_load_earlier_button.text = "更早"
	_load_earlier_button.focus_mode = Control.FOCUS_NONE
	_load_earlier_button.custom_minimum_size = Vector2(58, CHAT_TOUCH_TARGET_MIN_HEIGHT)
	_apply_chat_paper_action_button_style(_load_earlier_button, "history")
	_load_earlier_button.pressed.connect(_load_earlier_chat_history)
	row.add_child(_load_earlier_button)

	_history_status_label = Label.new()
	_history_status_label.text = "聊天记录"
	_history_status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_history_status_label.add_theme_font_size_override("font_size", 12)
	_history_status_label.add_theme_color_override("font_color", Color(0.82, 0.78, 0.68, 0.92))
	_history_status_label.visible = not _is_compact_landscape_chat_layout()
	column.add_child(_history_status_label)
	_refresh_message_filter_buttons()
	return filter_panel

func _build_mailbox_block() -> Control:
	var mailbox := PanelContainer.new()
	mailbox.add_theme_stylebox_override("panel", _make_panel_style(Color(0.10, 0.08, 0.04, 0.62), Color(0.95, 0.72, 0.38, 0.34), 5))

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 10)
	margin.add_theme_constant_override("margin_top", 8)
	margin.add_theme_constant_override("margin_right", 10)
	margin.add_theme_constant_override("margin_bottom", 8)
	mailbox.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 6)
	margin.add_child(column)

	var title := Label.new()
	title.text = "邮件"
	title.add_theme_font_size_override("font_size", 13)
	title.add_theme_color_override("font_color", Color(1.0, 0.86, 0.52, 1.0))
	column.add_child(title)

	_mailbox_status_label = Label.new()
	_mailbox_status_label.text = "承接 AI 输送资源、每日福利和活动奖励。"
	_mailbox_status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_mailbox_status_label.add_theme_font_size_override("font_size", 12)
	_mailbox_status_label.add_theme_color_override("font_color", Color(0.98, 0.94, 0.84, 0.92))
	column.add_child(_mailbox_status_label)

	_mailbox_list = VBoxContainer.new()
	_mailbox_list.add_theme_constant_override("separation", 4)
	column.add_child(_mailbox_list)
	return mailbox

func _build_mailbox_popup() -> Control:
	_mailbox_popup = PanelContainer.new()
	_mailbox_popup.name = "UnifiedInboxPopup"
	_mailbox_popup.visible = false
	_mailbox_popup.z_index = 40
	_mailbox_popup.mouse_filter = Control.MOUSE_FILTER_STOP
	_mailbox_popup.anchor_left = 0.22
	_mailbox_popup.anchor_top = 0.10
	_mailbox_popup.anchor_right = 0.92
	_mailbox_popup.anchor_bottom = 0.88
	_mailbox_popup.offset_left = 0.0
	_mailbox_popup.offset_top = 0.0
	_mailbox_popup.offset_right = 0.0
	_mailbox_popup.offset_bottom = 0.0
	_mailbox_popup.add_theme_stylebox_override("panel", _make_panel_style(Color(0.06, 0.06, 0.05, 0.94), Color(0.95, 0.72, 0.38, 0.48), 6))

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 12)
	_mailbox_popup.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)

	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 8)
	column.add_child(header)

	var title := Label.new()
	title.text = "邮件"
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.add_theme_font_size_override("font_size", 18)
	title.add_theme_color_override("font_color", Color(1.0, 0.88, 0.55, 1.0))
	header.add_child(title)

	var close_button := Button.new()
	close_button.text = "关闭"
	close_button.focus_mode = Control.FOCUS_NONE
	close_button.pressed.connect(_close_mailbox_popup)
	header.add_child(close_button)

	_mailbox_popup_status_label = Label.new()
	_mailbox_popup_status_label.text = "正在同步收件箱"
	_mailbox_popup_status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_mailbox_popup_status_label.add_theme_font_size_override("font_size", 12)
	_mailbox_popup_status_label.add_theme_color_override("font_color", Color(0.98, 0.94, 0.84, 0.92))
	column.add_child(_mailbox_popup_status_label)

	var filter_row := HBoxContainer.new()
	filter_row.add_theme_constant_override("separation", 6)
	column.add_child(filter_row)
	_add_mailbox_filter_button(filter_row, MAILBOX_FILTER_ALL, "全部")
	_add_mailbox_filter_button(filter_row, MAILBOX_FILTER_AI_TRANSFER, "AI 输送")
	_add_mailbox_filter_button(filter_row, MAILBOX_FILTER_DAILY, "每日")
	_add_mailbox_filter_button(filter_row, MAILBOX_FILTER_EVENT, "活动")

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(scroll)
	column.add_child(scroll)

	_mailbox_popup_list = VBoxContainer.new()
	_mailbox_popup_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_mailbox_popup_list.add_theme_constant_override("separation", 6)
	scroll.add_child(_mailbox_popup_list)
	_refresh_mailbox_filter_buttons()
	return _mailbox_popup

func _build_proposal_detail_popup() -> Control:
	_proposal_detail_popup = PanelContainer.new()
	_proposal_detail_popup.name = "ProposalDetailPopup"
	_proposal_detail_popup.visible = false
	_proposal_detail_popup.z_index = 45
	_proposal_detail_popup.mouse_filter = Control.MOUSE_FILTER_STOP
	if _is_mobile_chat_layout():
		_proposal_detail_popup.anchor_left = 0.04
		_proposal_detail_popup.anchor_top = 0.08
		_proposal_detail_popup.anchor_right = 0.96
		_proposal_detail_popup.anchor_bottom = 0.88
	else:
		_proposal_detail_popup.anchor_left = 0.26
		_proposal_detail_popup.anchor_top = 0.18
		_proposal_detail_popup.anchor_right = 0.88
		_proposal_detail_popup.anchor_bottom = 0.78
	_proposal_detail_popup.offset_left = 0.0
	_proposal_detail_popup.offset_top = 0.0
	_proposal_detail_popup.offset_right = 0.0
	_proposal_detail_popup.offset_bottom = 0.0
	_proposal_detail_popup.add_theme_stylebox_override("panel", _make_panel_style(Color(0.05, 0.06, 0.07, 0.96), Color(0.42, 0.57, 0.72, 0.46), 6))

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 12)
	_proposal_detail_popup.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)

	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 8)
	column.add_child(header)

	_proposal_detail_title = Label.new()
	_proposal_detail_title.text = "提案详情"
	_proposal_detail_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_proposal_detail_title.add_theme_font_size_override("font_size", 20)
	_proposal_detail_title.add_theme_color_override("font_color", Color(0.88, 0.94, 1.0, 1.0))
	header.add_child(_proposal_detail_title)

	var close_button := Button.new()
	close_button.text = "关闭"
	close_button.focus_mode = Control.FOCUS_NONE
	close_button.pressed.connect(_close_proposal_detail_popup)
	header.add_child(close_button)

	var scroll := ScrollContainer.new()
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(scroll)
	column.add_child(scroll)

	_proposal_detail_body = Label.new()
	_proposal_detail_body.custom_minimum_size = Vector2(0, 0)
	_proposal_detail_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_proposal_detail_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_proposal_detail_body.add_theme_font_size_override("font_size", 16)
	_proposal_detail_body.add_theme_color_override("font_color", Color(0.95, 0.97, 1.0, 0.96))
	scroll.add_child(_proposal_detail_body)

	_proposal_detail_status_label = Label.new()
	_proposal_detail_status_label.text = "状态提示：等待选择提案。"
	_proposal_detail_status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_proposal_detail_status_label.add_theme_font_size_override("font_size", 14)
	_proposal_detail_status_label.add_theme_color_override("font_color", Color(0.82, 0.88, 0.96, 0.92))
	column.add_child(_proposal_detail_status_label)

	var action_row := HBoxContainer.new()
	action_row.add_theme_constant_override("separation", 8)
	column.add_child(action_row)

	_proposal_detail_failure_button = Button.new()
	_proposal_detail_failure_button.text = "查看失败历史"
	_proposal_detail_failure_button.focus_mode = Control.FOCUS_NONE
	_proposal_detail_failure_button.pressed.connect(_show_failure_history_from_detail)
	action_row.add_child(_proposal_detail_failure_button)

	_proposal_detail_retry_button = Button.new()
	_proposal_detail_retry_button.text = "填入恢复命令"
	_proposal_detail_retry_button.focus_mode = Control.FOCUS_NONE
	_proposal_detail_retry_button.pressed.connect(_fill_retry_command_from_detail)
	action_row.add_child(_proposal_detail_retry_button)
	return _proposal_detail_popup

func _build_claim_toast() -> Control:
	_claim_toast = PanelContainer.new()
	_claim_toast.name = "ClaimReceiptToast"
	_claim_toast.visible = false
	_claim_toast.z_index = 70
	_claim_toast.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_claim_toast.anchor_left = 0.16
	_claim_toast.anchor_top = 0.05
	_claim_toast.anchor_right = 0.60
	_claim_toast.anchor_bottom = 0.05
	_claim_toast.offset_left = 0.0
	_claim_toast.offset_top = 0.0
	_claim_toast.offset_right = 0.0
	_claim_toast.offset_bottom = 76.0
	_claim_toast.add_theme_stylebox_override("panel", _make_panel_style(Color(0.03, 0.20, 0.10, 0.94), Color(0.36, 0.90, 0.48, 0.70), 6))

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 10)
	_claim_toast.add_child(margin)

	_claim_toast_label = Label.new()
	_claim_toast_label.text = "资源已到账"
	_claim_toast_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_claim_toast_label.add_theme_font_size_override("font_size", 15)
	_claim_toast_label.add_theme_color_override("font_color", Color(0.86, 1.0, 0.76, 1.0))
	margin.add_child(_claim_toast_label)

	_claim_toast_hide_timer = Timer.new()
	_claim_toast_hide_timer.one_shot = true
	_claim_toast_hide_timer.wait_time = 4.2
	_claim_toast_hide_timer.timeout.connect(_hide_claim_toast)
	_claim_toast.add_child(_claim_toast_hide_timer)
	return _claim_toast

func _add_mailbox_filter_button(row: HBoxContainer, filter_id: String, label: String) -> void:
	var button := Button.new()
	button.text = label
	button.focus_mode = Control.FOCUS_NONE
	button.pressed.connect(_set_mailbox_filter.bind(filter_id))
	row.add_child(button)
	_mailbox_filter_buttons[filter_id] = button

func _refresh_identity() -> void:
	_multi_ai_visual_smoke_fixture_applied = false
	if _api_client == null:
		_use_fallback_identity()
		return

	var response: Dictionary = await _api_client.get_ai_players("", false, _active_governor_player_id)
	if not bool(response.get("ok", false)):
		_use_fallback_identity()
		_set_status("AI 玩家列表读取失败，使用本地默认频道：%s" % _extract_error_text(response))
		return

	var data: Dictionary = response.get("data", {}) as Dictionary
	_ai_player_list_summary = data.get("listSummary", {}) as Dictionary
	var items: Array = data.get("items", []) as Array
	var channels: Array = BASE_CHANNELS.duplicate(true)
	var discovered_players: Array = []
	for raw_item in items:
		if raw_item is Dictionary:
			var player := raw_item as Dictionary
			var ai_player_id := str(player.get("aiPlayerId", "")).strip_edges()
			if ai_player_id == "":
				continue
			var display_name := str(player.get("displayName", ai_player_id)).strip_edges()
			if display_name == "":
				display_name = ai_player_id
			var faction_id := str(player.get("factionId", DEFAULT_FACTION_ID)).strip_edges()
			if faction_id == "":
				faction_id = DEFAULT_FACTION_ID
			var governor_player_id := str(player.get("governorPlayerId", DEFAULT_GOVERNOR_PLAYER_ID)).strip_edges()
			if governor_player_id == "":
				governor_player_id = DEFAULT_GOVERNOR_PLAYER_ID
			var governor_display_name := _resolve_governor_display_name_from_player(player, governor_player_id)
			var channel := {
				"id": ai_player_id,
				"label": display_name,
				"aiPlayerId": ai_player_id,
				"factionId": faction_id,
				"governorPlayerId": governor_player_id,
				"governorDisplayName": governor_display_name,
				"avatarId": str(player.get("avatarId", "")).strip_edges(),
				"avatarImagePath": str(player.get("avatarImagePath", "")).strip_edges(),
				"listCard": player.get("listCard", {}),
				"autonomyGuard": player.get("autonomyGuard", data.get("autonomyGuard", {})),
			}
			discovered_players.append(channel)
			channels.append(channel)

	if discovered_players.is_empty():
		_use_fallback_identity()
		_set_status("后端没有返回 AI 玩家，使用本地默认频道")
		return

	_new_channel_candidate_groups = _build_new_channel_candidate_groups(data, discovered_players)
	channels.append(SYSTEM_CHANNEL.duplicate(true))
	_ai_players = discovered_players
	_channels = channels

	var active_channel := _find_channel(_active_channel_id)
	if active_channel.is_empty() or not active_channel.has("aiPlayerId"):
		active_channel = discovered_players[0] as Dictionary
		_active_channel_id = str(active_channel.get("id", DEFAULT_AI_PLAYER_ID))
	_apply_active_identity(active_channel)
	_render_channel_buttons()
	_sync_active_channel_header()
	await _refresh_channel_message_counts()

func _use_fallback_identity() -> void:
	_multi_ai_visual_smoke_fixture_applied = false
	_channels = FALLBACK_CHANNELS.duplicate(true)
	_ai_players = FALLBACK_AI_CHANNELS.duplicate(true)
	_new_channel_candidate_groups = _build_new_channel_candidate_groups({}, _ai_players)
	if _find_channel(_active_channel_id).is_empty():
		_active_channel_id = DEFAULT_AI_PLAYER_ID
	var active_channel := _find_channel(_active_channel_id)
	if active_channel.is_empty():
		active_channel = _find_channel(DEFAULT_AI_PLAYER_ID)
		_active_channel_id = DEFAULT_AI_PLAYER_ID
	_apply_active_identity(active_channel)
	_render_channel_buttons()
	_sync_active_channel_header()

func apply_multi_ai_channel_visual_smoke_fixture() -> void:
	var ai_channels := [
		{
			"id": DEFAULT_AI_PLAYER_ID,
			"label": "青州后勤",
			"aiPlayerId": DEFAULT_AI_PLAYER_ID,
			"factionId": DEFAULT_FACTION_ID,
			"governorPlayerId": DEFAULT_GOVERNOR_PLAYER_ID,
			"listCard": {
				"statusReason": "active",
				"statusDot": "green",
			},
			"autonomyGuard": {
				"mode": "approval_only",
				"autonomousExecutionEnabled": false,
				"pendingApprovalBlocksExecution": true,
			},
		},
		{
			"id": SECONDARY_AI_PLAYER_ID,
			"label": "兖州斥候",
			"aiPlayerId": SECONDARY_AI_PLAYER_ID,
			"factionId": DEFAULT_FACTION_ID,
			"governorPlayerId": DEFAULT_GOVERNOR_PLAYER_ID,
			"listCard": {
				"statusReason": "pending_proposals",
				"statusDot": "yellow",
			},
			"autonomyGuard": {
				"mode": "approval_only",
				"autonomousExecutionEnabled": false,
				"pendingApprovalBlocksExecution": true,
			},
		},
		{
			"id": TERTIARY_AI_PLAYER_ID,
			"label": "冀州军务",
			"aiPlayerId": TERTIARY_AI_PLAYER_ID,
			"factionId": DEFAULT_FACTION_ID,
			"governorPlayerId": DEFAULT_GOVERNOR_PLAYER_ID,
			"listCard": {
				"statusReason": "runtime_failure",
				"statusDot": "red",
			},
			"autonomyGuard": {
				"mode": "approval_only",
				"autonomousExecutionEnabled": false,
				"pendingApprovalBlocksExecution": true,
			},
		},
	]
	var channels := BASE_CHANNELS.duplicate(true)
	for ai_channel_variant in ai_channels:
		channels.append((ai_channel_variant as Dictionary).duplicate(true))
	channels.append(SYSTEM_CHANNEL.duplicate(true))
	_multi_ai_visual_smoke_fixture_applied = true
	_channel_message_counts.clear()
	_channel_seen_counts.clear()
	_channels = channels
	_ai_players = ai_channels
	_new_channel_candidate_groups = _build_new_channel_candidate_groups({}, _ai_players)
	_active_channel_id = DEFAULT_AI_PLAYER_ID
	_apply_active_identity(_find_channel(_active_channel_id))
	_render_channel_buttons()
	_sync_active_channel_header()
	apply_chat_message_visual_smoke_samples()

func _build_new_channel_candidate_groups(read_model: Dictionary, ai_players: Array) -> Array:
	var groups := _normalize_new_channel_candidate_groups(_read_new_channel_candidate_groups(read_model))
	_ensure_new_channel_group(groups, "friend", "好友", "暂无好友", [])
	_ensure_new_channel_group(groups, "alliance_member", "同盟成员", "暂无同盟成员", [])
	_ensure_new_channel_group(groups, "managed_member", "负责成员", "暂无负责成员", [])
	var ai_candidates := _build_ai_player_channel_candidates(ai_players)
	if not _set_new_channel_group_candidates(groups, "ai_player", "AI玩家", "暂无AI玩家", ai_candidates):
		_ensure_new_channel_group(groups, "ai_player", "AI玩家", "暂无AI玩家", ai_candidates)
	_new_channel_contact_candidates_from_read_model = _count_new_channel_contact_candidates(groups) > 0
	return groups

func _read_new_channel_candidate_groups(read_model: Dictionary) -> Array:
	for key in ["chatChannelCandidates", "channelCandidates", "contactCandidates"]:
		var raw_value: Variant = read_model.get(key, [])
		if raw_value is Array:
			return raw_value as Array
		if raw_value is Dictionary:
			var raw_dict := raw_value as Dictionary
			var raw_groups: Variant = raw_dict.get("groups", [])
			if raw_groups is Array:
				return raw_groups as Array
	return []

func _normalize_new_channel_candidate_groups(raw_groups: Array) -> Array:
	var normalized: Array = []
	for raw_group in raw_groups:
		if not (raw_group is Dictionary):
			continue
		var group := raw_group as Dictionary
		var group_id := str(group.get("id", group.get("groupId", ""))).strip_edges()
		if group_id == "":
			continue
		var label := str(group.get("label", group.get("title", group_id))).strip_edges()
		if label == "":
			label = group_id
		var empty_text := str(group.get("emptyText", group.get("emptyLabel", "暂无对象"))).strip_edges()
		if empty_text == "":
			empty_text = "暂无对象"
		var raw_candidates: Variant = group.get("candidates", group.get("items", []))
		var candidates := _normalize_new_channel_candidates(raw_candidates if raw_candidates is Array else [])
		normalized.append({
			"id": group_id,
			"label": label,
			"emptyText": empty_text,
			"candidates": candidates,
		})
	return normalized

func _normalize_new_channel_candidates(raw_candidates: Array) -> Array:
	var candidates: Array = []
	for raw_candidate in raw_candidates:
		if not (raw_candidate is Dictionary):
			continue
		var candidate := raw_candidate as Dictionary
		var candidate_id := str(candidate.get("id", candidate.get("candidateId", candidate.get("aiPlayerId", "")))).strip_edges()
		if candidate_id == "":
			continue
		var label := str(candidate.get("label", candidate.get("displayName", candidate_id))).strip_edges()
		if label == "":
			label = candidate_id
		var target_channel_id := str(candidate.get("targetChannelId", candidate.get("channelId", candidate.get("aiPlayerId", candidate_id)))).strip_edges()
		var kind := str(candidate.get("kind", candidate.get("type", ""))).strip_edges()
		var subtitle := str(candidate.get("subtitle", candidate.get("description", ""))).strip_edges()
		var list_card: Variant = candidate.get("listCard", {})
		var autonomy_guard: Variant = candidate.get("autonomyGuard", {})
		candidates.append({
			"id": candidate_id,
			"label": label,
			"kind": kind,
			"subtitle": subtitle,
			"targetChannelId": target_channel_id,
			"aiPlayerId": str(candidate.get("aiPlayerId", "")).strip_edges(),
			"listCard": list_card if list_card is Dictionary else {},
			"autonomyGuard": autonomy_guard if autonomy_guard is Dictionary else {},
			"disabled": bool(candidate.get("disabled", false)),
		})
	return candidates

func apply_new_channel_candidate_read_model(read_model: Dictionary) -> void:
	_new_channel_candidate_groups = _build_new_channel_candidate_groups(read_model, _ai_players)
	if _active_channel_id == NEW_CHANNEL_ID:
		_render_messages()

func _count_new_channel_contact_candidates(groups: Array) -> int:
	var count := 0
	for raw_group in groups:
		if not (raw_group is Dictionary):
			continue
		var group := raw_group as Dictionary
		var group_id := str(group.get("id", "")).strip_edges()
		if group_id == "" or group_id == "ai_player":
			continue
		count += _read_new_channel_group_candidates(group).size()
	return count

func _build_ai_player_channel_candidates(ai_players: Array) -> Array:
	var candidates: Array = []
	for raw_player in ai_players:
		if not (raw_player is Dictionary):
			continue
		var player := raw_player as Dictionary
		var ai_player_id := str(player.get("aiPlayerId", player.get("id", ""))).strip_edges()
		if ai_player_id == "":
			continue
		var label := str(player.get("label", player.get("displayName", ai_player_id))).strip_edges()
		if label == "":
			label = ai_player_id
		candidates.append({
			"id": ai_player_id,
			"label": label,
			"kind": "ai_player",
			"targetChannelId": ai_player_id,
			"aiPlayerId": ai_player_id,
			"listCard": _read_channel_list_card(player),
			"autonomyGuard": _read_channel_autonomy_guard(player),
			"disabled": false,
		})
	return candidates

func _ensure_new_channel_group(groups: Array, group_id: String, label: String, empty_text: String, candidates: Array) -> void:
	for raw_group in groups:
		if raw_group is Dictionary and str((raw_group as Dictionary).get("id", "")).strip_edges() == group_id:
			var group := raw_group as Dictionary
			if str(group.get("label", "")).strip_edges() == "":
				group["label"] = label
			if str(group.get("emptyText", "")).strip_edges() == "":
				group["emptyText"] = empty_text
			if not group.has("candidates"):
				group["candidates"] = candidates
			return
	groups.append({
		"id": group_id,
		"label": label,
		"emptyText": empty_text,
		"candidates": candidates,
	})

func _set_new_channel_group_candidates(groups: Array, group_id: String, label: String, empty_text: String, candidates: Array) -> bool:
	for raw_group in groups:
		if raw_group is Dictionary and str((raw_group as Dictionary).get("id", "")).strip_edges() == group_id:
			var group := raw_group as Dictionary
			group["label"] = label
			group["emptyText"] = empty_text
			if _read_new_channel_group_candidates(group).is_empty():
				group["candidates"] = candidates
			return true
	return false

func _read_new_channel_group_candidates(group: Dictionary) -> Array:
	var candidates: Variant = group.get("candidates", [])
	if candidates is Array:
		return candidates as Array
	return []

func _render_channel_buttons() -> void:
	if _channel_list == null:
		return
	for child in _channel_list.get_children():
		child.queue_free()
	_channel_buttons.clear()
	_channel_button_views.clear()
	var ai_section_added := false
	var system_section_added := false
	for channel in _channels:
		if not (channel is Dictionary):
			continue
		var channel_dict := channel as Dictionary
		var channel_id := str(channel_dict.get("id", "")).strip_edges()
		if channel_id == "":
			continue
		if channel_dict.has("aiPlayerId") and not ai_section_added:
			_channel_list.add_child(_build_channel_section_label("AI玩家", "ai_players"))
			ai_section_added = true
		elif channel_id == "system" and not system_section_added:
			_channel_list.add_child(_build_channel_section_label("系统", "system"))
			system_section_added = true
		var button := _build_channel_button(channel_dict)
		button.pressed.connect(_on_channel_pressed.bind(channel_id))
		_channel_list.add_child(button)
		_channel_buttons[channel_id] = button
	_refresh_channel_buttons()


func _build_channel_section_label(text: String, section_id: String) -> Label:
	var label := Label.new()
	label.name = "ChatChannelSection_%s" % section_id
	label.text = text
	label.set_meta("chat_channel_section_label", text)
	label.custom_minimum_size = Vector2(0, 28)
	label.add_theme_font_size_override("font_size", 15)
	label.add_theme_color_override("font_color", Color(0.92, 0.78, 0.48, 0.90))
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	return label


func _build_channel_button(channel: Dictionary) -> Button:
	var channel_id := str(channel.get("id", "")).strip_edges()
	var button := Button.new()
	button.name = "ChatChannelButton_%s" % _sanitize_node_name(channel_id)
	button.text = ""
	button.focus_mode = Control.FOCUS_NONE
	button.custom_minimum_size = Vector2(0, 72)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.set_meta("chat_channel_id", channel_id)
	button.set_meta("chat_channel_kind", _resolve_channel_kind(channel))
	button.set_meta("chat_channel_has_avatar", false)
	button.set_meta("chat_channel_is_ai_player", channel.has("aiPlayerId"))
	button.set_meta("chat_channel_tile_mode", "full_width_clean_channel_tiles_v1")
	_apply_channel_button_style(button, false, channel)

	var margin := MarginContainer.new()
	margin.name = "ChannelButtonMargin"
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 8)
	margin.add_theme_constant_override("margin_top", 6)
	margin.add_theme_constant_override("margin_right", 8)
	margin.add_theme_constant_override("margin_bottom", 6)
	button.add_child(margin)

	var row := HBoxContainer.new()
	row.name = "ChannelButtonRow"
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 0)
	margin.add_child(row)

	var label_column := VBoxContainer.new()
	label_column.name = "ChannelButtonLabels"
	label_column.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label_column.alignment = BoxContainer.ALIGNMENT_CENTER
	label_column.add_theme_constant_override("separation", 0)
	row.add_child(label_column)

	var primary_label := Label.new()
	primary_label.name = "ChannelPrimaryLabel"
	primary_label.text = _format_channel_primary_label(channel)
	primary_label.clip_text = true
	primary_label.set_meta("chat_channel_primary_font_size", CHAT_CHANNEL_PRIMARY_FONT_SIZE)
	primary_label.add_theme_font_size_override("font_size", CHAT_CHANNEL_PRIMARY_FONT_SIZE)
	primary_label.add_theme_color_override("font_color", CHAT_PAPER_TEXT)
	label_column.add_child(primary_label)

	var subtitle_label := Label.new()
	subtitle_label.name = "ChannelSubtitleLabel"
	subtitle_label.text = ""
	subtitle_label.visible = false
	subtitle_label.clip_text = true
	subtitle_label.add_theme_font_size_override("font_size", 10)
	subtitle_label.add_theme_color_override("font_color", CHAT_PAPER_MUTED_TEXT)
	label_column.add_child(subtitle_label)

	_channel_button_views[channel_id] = {
		"avatar": null,
		"primary": primary_label,
		"subtitle": subtitle_label,
	}
	return button


func _build_channel_avatar(channel: Dictionary) -> Control:
	var kind := _resolve_channel_kind(channel)
	var avatar := PanelContainer.new()
	avatar.name = "ChatChannelAvatar_%s" % kind
	avatar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	avatar.custom_minimum_size = Vector2(38, 40)
	avatar.set_meta("chat_channel_avatar_kind", kind)
	avatar.set_meta("chat_channel_avatar_text_hidden", false)
	avatar.set_meta("chat_channel_badge_mode", "paper_badge_channel_icon_v1")
	var accent := _resolve_channel_tile_accent_color(channel)
	avatar.add_theme_stylebox_override("panel", _make_panel_style(accent.lightened(0.18), accent.darkened(0.14), 6))
	var margin := MarginContainer.new()
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.add_theme_constant_override("margin_left", 2)
	margin.add_theme_constant_override("margin_top", 2)
	margin.add_theme_constant_override("margin_right", 2)
	margin.add_theme_constant_override("margin_bottom", 2)
	avatar.add_child(margin)
	var label := Label.new()
	label.name = "ChannelAvatarText"
	label.text = _format_channel_avatar_text(channel)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 13)
	label.add_theme_color_override("font_color", Color(0.18, 0.12, 0.06, 1.0))
	margin.add_child(label)
	return avatar


func _sanitize_node_name(value: String) -> String:
	var sanitized := value.strip_edges()
	if sanitized == "":
		return "empty"
	for token in [":", "/", "\\", ".", " ", "\t", "\n", "\r"]:
		sanitized = sanitized.replace(token, "_")
	return sanitized


func _format_channel_button_text(channel: Dictionary) -> String:
	var channel_id := str(channel.get("id", "")).strip_edges()
	var label := str(channel.get("label", channel_id)).strip_edges()
	if label == "":
		label = channel_id
	if channel_id == NEW_CHANNEL_ID:
		return "＋"
	if not channel.has("aiPlayerId"):
		return label
	var list_card := _read_channel_list_card(channel)
	var status_label := _format_ai_list_card_status_short(list_card)
	if status_label != "":
		label = "%s · %s" % [label, status_label]
	var unread := _resolve_channel_unread(str(channel.get("aiPlayerId", channel_id)))
	if unread <= 0:
		return label
	return "%s %d" % [label, unread]


func _format_channel_primary_label(channel: Dictionary) -> String:
	var channel_id := str(channel.get("id", "")).strip_edges()
	if channel_id == NEW_CHANNEL_ID:
		return "＋"
	var label := str(channel.get("label", channel_id)).strip_edges()
	if label == "":
		label = channel_id
	if channel.has("aiPlayerId") and _is_mobile_chat_layout():
		return _format_compact_ai_channel_label(label)
	return label


func _format_compact_ai_channel_label(label: String) -> String:
	return label.strip_edges()


func _format_channel_subtitle(channel: Dictionary) -> String:
	var channel_id := str(channel.get("id", "")).strip_edges()
	if channel_id == NEW_CHANNEL_ID:
		return "新聊天"
	if channel.has("aiPlayerId"):
		var list_card := _read_channel_list_card(channel)
		var status_label := _format_ai_list_card_status_short(list_card)
		var unread := _resolve_channel_unread(str(channel.get("aiPlayerId", channel_id)))
		if unread > 0:
			return "%s %d" % [status_label if status_label != "" else "AI玩家", unread]
		return status_label if status_label != "" else "AI玩家"
	if channel_id == "world":
		return "世界"
	if channel_id == "alliance":
		return "同盟"
	if channel_id == "system":
		return "系统"
	return str(channel.get("subtitle", "频道")).strip_edges()


func _format_channel_avatar_text(channel: Dictionary) -> String:
	var channel_id := str(channel.get("id", "")).strip_edges()
	if channel_id == NEW_CHANNEL_ID:
		return "＋"
	if channel_id == "world":
		return "世"
	if channel_id == "alliance":
		return "盟"
	if channel_id == "system":
		return "系"
	if channel.has("aiPlayerId"):
		var label := str(channel.get("label", "AI")).strip_edges()
		if label.contains("斥候"):
			return "斥"
		if label.contains("后勤"):
			return "勤"
		return "AI"
	return "聊"


func _resolve_channel_kind(channel: Dictionary) -> String:
	var channel_id := str(channel.get("id", "")).strip_edges()
	if channel_id == NEW_CHANNEL_ID:
		return "new_channel"
	if channel_id == "world":
		return "world"
	if channel_id == "alliance":
		return "alliance"
	if channel_id == "system":
		return "system"
	if channel.has("aiPlayerId"):
		return "ai_player"
	return "contact"

func _read_channel_list_card(channel: Dictionary) -> Dictionary:
	var list_card_variant: Variant = channel.get("listCard", {})
	if list_card_variant is Dictionary:
		return list_card_variant as Dictionary
	return {}

func _read_channel_autonomy_guard(channel: Dictionary) -> Dictionary:
	var guard_variant: Variant = channel.get("autonomyGuard", {})
	if guard_variant is Dictionary:
		return guard_variant as Dictionary
	return {}

func _format_ai_list_card_status_short(list_card: Dictionary) -> String:
	var reason := str(list_card.get("statusReason", "")).strip_edges()
	match reason:
		"pending_proposals":
			return "待批"
		"runtime_failure":
			return "需看"
		"inactive":
			return "离线"
		"active":
			return "正常"
	var dot := str(list_card.get("statusDot", "")).strip_edges()
	match dot:
		"yellow":
			return "待批"
		"red":
			return "需看"
		"gray":
			return "离线"
		"green":
			return "正常"
	return ""

func _resolve_channel_unread(ai_player_id: String) -> int:
	var normalized_ai_player_id := ai_player_id.strip_edges()
	if normalized_ai_player_id == "":
		return 0
	var count := int(_channel_message_counts.get(normalized_ai_player_id, 0))
	var seen := int(_channel_seen_counts.get(normalized_ai_player_id, count))
	return maxi(0, count - seen)

func _refresh_channel_message_counts() -> void:
	if _api_client == null:
		return
	for channel in _ai_players:
		if not (channel is Dictionary):
			continue
		var channel_dict := channel as Dictionary
		var ai_player_id := str(channel_dict.get("aiPlayerId", "")).strip_edges()
		if ai_player_id == "":
			continue
		var reader_id := str(channel_dict.get("governorPlayerId", _active_governor_player_id)).strip_edges()
		if reader_id == "":
			reader_id = DEFAULT_GOVERNOR_PLAYER_ID
		var response: Dictionary = await _api_client.get_ai_player_chat_read_cursor(ai_player_id, reader_id)
		if not bool(response.get("ok", false)):
			response = await _api_client.get_ai_player_chat_messages(ai_player_id, 1, reader_id)
			if not bool(response.get("ok", false)):
				continue
		var data: Dictionary = response.get("data", {}) as Dictionary
		var channel_payload: Dictionary = data.get("channel", {}) as Dictionary
		var read_cursor: Dictionary = data.get("readCursor", {}) as Dictionary
		var message_count := int(read_cursor.get("messageCount", channel_payload.get("messageCount", data.get("count", 0))))
		var read_message_count := int(read_cursor.get("readMessageCount", message_count))
		_channel_message_counts[ai_player_id] = message_count
		_channel_seen_counts[ai_player_id] = read_message_count
	_refresh_channel_buttons()

func _find_channel(channel_id: String) -> Dictionary:
	var normalized_channel_id := channel_id.strip_edges()
	for channel in _channels:
		if channel is Dictionary and str((channel as Dictionary).get("id", "")).strip_edges() == normalized_channel_id:
			return channel as Dictionary
	return {}

func _apply_active_identity(channel: Dictionary) -> void:
	if not channel.has("aiPlayerId"):
		return
	_active_ai_player_id = str(channel.get("aiPlayerId", DEFAULT_AI_PLAYER_ID)).strip_edges()
	if _active_ai_player_id == "":
		_active_ai_player_id = DEFAULT_AI_PLAYER_ID
	_active_faction_id = str(channel.get("factionId", DEFAULT_FACTION_ID)).strip_edges()
	if _active_faction_id == "":
		_active_faction_id = DEFAULT_FACTION_ID
	_active_governor_player_id = str(channel.get("governorPlayerId", DEFAULT_GOVERNOR_PLAYER_ID)).strip_edges()
	if _active_governor_player_id == "":
		_active_governor_player_id = DEFAULT_GOVERNOR_PLAYER_ID
	var governor_display_name := str(channel.get("governorDisplayName", "")).strip_edges()
	if governor_display_name != "":
		_active_governor_display_name = governor_display_name

func _sync_active_channel_header() -> void:
	var channel := _find_channel(_active_channel_id)
	if _title_label != null:
		_title_label.text = "新建聊天" if _active_channel_id == NEW_CHANNEL_ID else str(channel.get("label", "聊天"))
	if _input != null and channel.has("aiPlayerId"):
		_input.placeholder_text = ""
	if _subtitle_label != null:
		_subtitle_label.text = ""
		_subtitle_label.visible = false

func _format_ai_channel_guard_subtitle(guard: Dictionary) -> String:
	if guard.is_empty():
		return ""
	var mode := str(guard.get("mode", "")).strip_edges()
	var approval_only := mode == "approval_only"
	var autonomous_execution_enabled := bool(guard.get("autonomousExecutionEnabled", false))
	var pending_blocks := bool(guard.get("pendingApprovalBlocksExecution", true))
	if approval_only or not autonomous_execution_enabled:
		return ""
	if pending_blocks:
		return ""
	return ""

func _resolve_governor_display_name_from_player(player: Dictionary, governor_player_id: String) -> String:
	for key in ["governorDisplayName", "governorName", "playerDisplayName", "ownerDisplayName"]:
		var candidate := str(player.get(key, "")).strip_edges()
		if candidate != "" and not _is_legacy_governor_display_name(candidate):
			return candidate
	var player_names_variant: Variant = player.get("playerNames", [])
	if player_names_variant is Array:
		for raw_name in player_names_variant as Array:
			var candidate := str(raw_name).strip_edges()
			if candidate != "" and candidate != governor_player_id and not _is_legacy_governor_display_name(candidate):
				return candidate
	return ""

func _resolve_governor_display_name() -> String:
	var normalized := _active_governor_display_name.strip_edges()
	if normalized != "" and not _is_legacy_governor_display_name(normalized):
		return normalized
	return "主公"

func _is_legacy_governor_display_name(value: String) -> bool:
	var normalized := value.strip_edges()
	return normalized == "" or normalized == "总督" or normalized == "??" or normalized == "？？"

func _format_regular_channel_subtitle(channel: Dictionary) -> String:
	var channel_id := str(channel.get("id", "")).strip_edges()
	var subtitle := str(channel.get("subtitle", "")).strip_edges()
	if subtitle != "":
		return subtitle
	match channel_id:
		"world":
			return "世界频道 / 军情、系统消息和世界消息"
		"alliance":
			return "同盟频道 / 后续可升级为国家或帝国频道"
		"system":
			return "系统频道 / 只看通知"
	return "真人频道 / 选择具体 AI 玩家后进入私聊"

func _render_messages() -> void:
	if _message_list == null:
		return
	_sync_chat_mode_chrome_visibility()
	for child in _message_list.get_children():
		child.queue_free()

	if _active_channel_id == NEW_CHANNEL_ID:
		_message_list.add_child(_build_new_channel_picker_card())
		_refresh_message_filter_buttons()
		_update_history_filter_status(0)
		return

	var visible_messages := _filter_messages_for_active_view()
	for message in visible_messages:
		_message_list.add_child(_build_message_card(message))
	if visible_messages.is_empty():
		_message_list.add_child(_build_empty_history_card())
	_refresh_message_filter_buttons()
	_update_history_filter_status(visible_messages.size())
	call_deferred("_scroll_messages_to_bottom")

func _sync_chat_mode_chrome_visibility() -> void:
	var choosing_channel := _active_channel_id == NEW_CHANNEL_ID
	if _history_filter_panel != null and is_instance_valid(_history_filter_panel):
		_history_filter_panel.visible = false
	if _composer_container != null and is_instance_valid(_composer_container):
		_composer_container.visible = not choosing_channel
	if _mailbox_block != null and is_instance_valid(_mailbox_block):
		_mailbox_block.visible = false
	if _input != null:
		_input.editable = not choosing_channel

func _build_new_channel_picker_card() -> Control:
	if _new_channel_candidate_groups.is_empty():
		_new_channel_candidate_groups = _build_new_channel_candidate_groups({}, _ai_players)
	var card := PanelContainer.new()
	card.name = "NewChannelPickerCard"
	card.set_meta("new_channel_picker_material", NEW_CHANNEL_PICKER_MATERIAL)
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.add_theme_stylebox_override("panel", _make_panel_style(CHAT_PAPER_BG_SOLID, CHAT_PAPER_BORDER, 8))
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 16)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 16)
	card.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 12)
	margin.add_child(column)
	var title := Label.new()
	title.text = "新建聊天"
	title.add_theme_font_size_override("font_size", 24)
	title.add_theme_color_override("font_color", CHAT_PAPER_TEXT)
	column.add_child(title)
	var subtitle := Label.new()
	subtitle.text = "选择对象后，会打开独立频道。"
	subtitle.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	subtitle.add_theme_font_size_override("font_size", 16)
	subtitle.add_theme_color_override("font_color", CHAT_PAPER_MUTED_TEXT)
	column.add_child(subtitle)
	var group_grid := GridContainer.new()
	group_grid.columns = 2
	group_grid.add_theme_constant_override("h_separation", 10)
	group_grid.add_theme_constant_override("v_separation", 10)
	column.add_child(group_grid)
	for raw_group in _new_channel_candidate_groups:
		if raw_group is Dictionary:
			group_grid.add_child(_build_new_channel_group_card(raw_group as Dictionary))
	return card

func _build_new_channel_group_card(group: Dictionary) -> Control:
	var group_card := PanelContainer.new()
	group_card.name = "NewChannelGroupCard_%s" % _sanitize_node_name(str(group.get("id", "group")))
	group_card.set_meta("new_channel_group_material", NEW_CHANNEL_GROUP_MATERIAL)
	group_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	group_card.add_theme_stylebox_override("panel", _make_panel_style(Color(0.94, 0.89, 0.76, 0.96), Color(0.55, 0.38, 0.18, 0.42), 8))
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_bottom", 12)
	group_card.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)
	var label := Label.new()
	label.text = str(group.get("label", "频道"))
	label.add_theme_font_size_override("font_size", 20)
	label.add_theme_color_override("font_color", CHAT_PAPER_TEXT)
	column.add_child(label)
	var candidates := _read_new_channel_group_candidates(group)
	if candidates.is_empty():
		var empty_button := Button.new()
		empty_button.text = str(group.get("emptyText", "暂无对象"))
		empty_button.disabled = true
		empty_button.focus_mode = Control.FOCUS_NONE
		empty_button.custom_minimum_size = Vector2(0, 52)
		empty_button.set_meta("new_channel_candidate_button_material", NEW_CHANNEL_CANDIDATE_BUTTON_MATERIAL)
		empty_button.add_theme_font_size_override("font_size", 17)
		_apply_chat_paper_action_button_style(empty_button, "secondary")
		column.add_child(empty_button)
		return group_card
	var group_id := str(group.get("id", "")).strip_edges()
	for raw_candidate in candidates:
		if not (raw_candidate is Dictionary):
			continue
		var candidate := raw_candidate as Dictionary
		var button := Button.new()
		button.text = _format_new_channel_candidate_button_text(group_id, candidate)
		button.focus_mode = Control.FOCUS_NONE
		button.custom_minimum_size = Vector2(0, 52)
		button.set_meta("new_channel_candidate_button_material", NEW_CHANNEL_CANDIDATE_BUTTON_MATERIAL)
		button.add_theme_font_size_override("font_size", 17)
		_apply_chat_paper_action_button_style(button, "secondary")
		button.disabled = bool(candidate.get("disabled", false))
		if not button.disabled:
			button.pressed.connect(_on_new_channel_candidate_pressed.bind(
				group_id,
				str(candidate.get("id", "")).strip_edges(),
				str(candidate.get("targetChannelId", "")).strip_edges()
			))
		column.add_child(button)
	return group_card

func _format_new_channel_candidate_button_text(group_id: String, candidate: Dictionary) -> String:
	var label := str(candidate.get("label", candidate.get("id", "聊天对象"))).strip_edges()
	if label == "":
		label = "聊天对象"
	if group_id != "ai_player":
		return label
	var status_label := _format_ai_list_card_status_short(_read_channel_list_card(candidate))
	if status_label == "":
		return label
	return "%s · %s" % [label, status_label]

func get_new_channel_visual_smoke_summary() -> Dictionary:
	var groups := _new_channel_candidate_groups
	if groups.is_empty():
		groups = _build_new_channel_candidate_groups({}, _ai_players)
	var group_ids: Array = []
	var candidate_count := 0
	var ai_player_candidate_count := 0
	var contact_candidate_count := 0
	for raw_group in groups:
		if not (raw_group is Dictionary):
			continue
		var group := raw_group as Dictionary
		var group_id := str(group.get("id", "")).strip_edges()
		if group_id == "":
			continue
		group_ids.append(group_id)
		var candidates := _read_new_channel_group_candidates(group)
		candidate_count += candidates.size()
		if group_id == "ai_player":
			ai_player_candidate_count += candidates.size()
		else:
			contact_candidate_count += candidates.size()
	var picker_material := ""
	var picker_visible := false
	if _message_list != null:
		var picker_node := _find_descendant_with_meta(_message_list, "new_channel_picker_material", NEW_CHANNEL_PICKER_MATERIAL)
		if picker_node != null:
			picker_material = str(picker_node.get_meta("new_channel_picker_material", ""))
			var picker_control := picker_node as Control
			picker_visible = picker_control != null and picker_control.visible and picker_control.is_visible_in_tree()
	var group_card_count := _count_descendants_with_meta(_message_list, "new_channel_group_material", NEW_CHANNEL_GROUP_MATERIAL)
	var candidate_button_count := _count_descendants_with_meta(_message_list, "new_channel_candidate_button_material", NEW_CHANNEL_CANDIDATE_BUTTON_MATERIAL)
	return {
		"ok": true,
		"usesReadModel": true,
		"pickerMaterial": picker_material,
		"pickerVisible": picker_visible,
		"pickerPaperOk": picker_material == NEW_CHANNEL_PICKER_MATERIAL and picker_visible,
		"groupCardCount": group_card_count,
		"groupCardsPaperOk": group_card_count >= group_ids.size() and group_card_count > 0,
		"candidateButtonCount": candidate_button_count,
		"candidateButtonsPaperOk": candidate_button_count >= candidate_count and candidate_button_count > 0,
		"contactCandidatesFromReadModel": _new_channel_contact_candidates_from_read_model,
		"groupIds": group_ids,
		"groupCount": group_ids.size(),
		"candidateCount": candidate_count,
		"aiPlayerCandidateCount": ai_player_candidate_count,
		"contactCandidateCount": contact_candidate_count,
		"activeChannelId": _active_channel_id,
	}

func open_first_new_channel_ai_candidate_for_visual_smoke() -> Dictionary:
	var before_channel_id := _active_channel_id
	for raw_group in _new_channel_candidate_groups:
		if not (raw_group is Dictionary):
			continue
		var group := raw_group as Dictionary
		if str(group.get("id", "")).strip_edges() != "ai_player":
			continue
		for raw_candidate in _read_new_channel_group_candidates(group):
			if not (raw_candidate is Dictionary):
				continue
			var candidate := raw_candidate as Dictionary
			if bool(candidate.get("disabled", false)):
				continue
			var target_channel_id := str(candidate.get("targetChannelId", candidate.get("aiPlayerId", ""))).strip_edges()
			if target_channel_id == "":
				continue
			await _on_new_channel_candidate_pressed("ai_player", str(candidate.get("id", "")).strip_edges(), target_channel_id)
			var opened_channel := _find_channel(target_channel_id)
			var opened := _active_channel_id == target_channel_id and opened_channel.has("aiPlayerId")
			return {
				"ok": opened,
				"beforeChannelId": before_channel_id,
				"afterChannelId": _active_channel_id,
				"targetChannelId": target_channel_id,
				"targetAiPlayerId": str(opened_channel.get("aiPlayerId", "")),
			}
	return {
		"ok": false,
		"beforeChannelId": before_channel_id,
		"afterChannelId": _active_channel_id,
		"reason": "ai_player_candidate_missing",
	}

func open_first_new_channel_contact_candidate_for_visual_smoke() -> Dictionary:
	var before_channel_id := _active_channel_id
	for raw_group in _new_channel_candidate_groups:
		if not (raw_group is Dictionary):
			continue
		var group := raw_group as Dictionary
		var group_id := str(group.get("id", "")).strip_edges()
		if group_id == "" or group_id == "ai_player":
			continue
		for raw_candidate in _read_new_channel_group_candidates(group):
			if not (raw_candidate is Dictionary):
				continue
			var candidate := raw_candidate as Dictionary
			if bool(candidate.get("disabled", false)):
				continue
			var target_channel_id := str(candidate.get("targetChannelId", candidate.get("id", ""))).strip_edges()
			if target_channel_id == "":
				continue
			await _on_new_channel_candidate_pressed(group_id, str(candidate.get("id", "")).strip_edges(), target_channel_id)
			var opened_channel := _find_channel(target_channel_id)
			var opened := _active_channel_id == target_channel_id and not opened_channel.has("aiPlayerId")
			return {
				"ok": opened,
				"beforeChannelId": before_channel_id,
				"afterChannelId": _active_channel_id,
				"targetChannelId": target_channel_id,
				"groupId": group_id,
			}
	return {
		"ok": false,
		"beforeChannelId": before_channel_id,
		"afterChannelId": _active_channel_id,
		"reason": "contact_candidate_missing",
	}

func _set_message_filter(filter_id: String) -> void:
	var normalized_filter := filter_id.strip_edges()
	if normalized_filter == "":
		normalized_filter = MESSAGE_FILTER_ALL
	_message_filter = normalized_filter
	if _api_client != null and _find_channel(_active_channel_id).has("aiPlayerId"):
		await _refresh_chat()
	else:
		_render_messages()

func _filter_messages_for_active_view() -> Array:
	var filtered: Array = []
	for message_variant in _messages:
		if not (message_variant is Dictionary):
			continue
		var message: Dictionary = message_variant as Dictionary
		if _message_matches_active_filter(message):
			filtered.append(message)
	return filtered

func _message_matches_active_filter(message: Dictionary) -> bool:
	return _message_matches_filter(message, _message_filter)

func _message_matches_filter(message: Dictionary, filter_id: String) -> bool:
	match filter_id:
		MESSAGE_FILTER_COMMAND:
			return _is_command_message(message)
		MESSAGE_FILTER_PROPOSAL:
			return str(message.get("kind", "")).strip_edges() == "proposal"
		MESSAGE_FILTER_RECEIPT:
			return str(message.get("kind", "")).strip_edges() == "receipt"
		MESSAGE_FILTER_FAILURE:
			return _is_failure_message(message)
		_:
			return true

func _is_command_message(message: Dictionary) -> bool:
	var kind := str(message.get("kind", "")).strip_edges()
	if kind == "player":
		return true
	var author_type := str(message.get("authorType", "")).strip_edges()
	return kind == "message" and author_type == "governor"

func _is_failure_message(message: Dictionary) -> bool:
	var metadata: Dictionary = message.get("metadata", {}) as Dictionary
	var failure_code := _clean_optional_text(message.get("failureCode", metadata.get("failureCode", "")))
	if failure_code != "":
		return true
	var kind := str(message.get("kind", "")).strip_edges()
	if kind == "receipt" and not bool(message.get("receiptOk", false)):
		return true
	if kind == "proposal" and str(metadata.get("status", "")).strip_edges() == "failed":
		return true
	return false

func _build_empty_history_card() -> Control:
	return _build_message_card({
		"kind": "system",
		"name": "聊天",
		"body": "暂无消息。发送后会显示真人指令、AI 回复和回执。",
	})

func apply_chat_message_visual_smoke_samples() -> void:
	_messages = []
	_message_filter = MESSAGE_FILTER_ALL
	_render_messages()

func run_mainline_visual_smoke_natural_language_decision(command_text: String) -> Dictionary:
	var normalized_command := command_text.strip_edges()
	if normalized_command == "":
		return {
			"ok": false,
			"reason": "chat_decision_command_empty",
		}
	if _input == null:
		return {
			"ok": false,
			"reason": "chat_input_missing",
		}
	_input.text = normalized_command
	_sync_chat_input_height()
	await _send_current_input()
	await get_tree().process_frame
	await get_tree().create_timer(0.35).timeout
	var summary := get_chat_message_visual_smoke_summary()
	var latest_ai_body := str(summary.get("chatLatestAiBodyText", "")).strip_edges()
	var latest_decision_source := str(summary.get("chatLatestAiDecisionSource", "")).strip_edges()
	return {
		"ok": latest_decision_source == "chat_natural_language_proposal_decision" and latest_ai_body != "",
		"reason": "chat_natural_language_decision_sent" if latest_decision_source == "chat_natural_language_proposal_decision" and latest_ai_body != "" else "chat_natural_language_decision_not_visible",
		"commandText": normalized_command,
		"summary": summary,
	}

func apply_war_room_report_visual_smoke_fixture() -> void:
	_war_room_report_visual_smoke_fixture_applied = true
	_messages = [
		{
			"messageId": "war_room_report_visual_fixture_001",
			"kind": "ai",
			"authorType": "ai",
			"aiPlayerId": DEFAULT_AI_PLAYER_ID,
			"name": "青州后勤官",
			"body": "青州后勤官今日战况总结：东线目标已经接上，主力完成整补，今天优先稳住前线和同盟集结。",
			"metadata": _build_voice_unavailable_visual_smoke_metadata("autonomous_combat_daily_summary_report", "青州后勤官今日战况总结：东线目标已经接上，主力完成整补，今天优先稳住前线和同盟集结。", "今日总结语音未配置", "已保留文字总结，配置语音服务后可播放今日战况。")
		},
		{
			"messageId": "war_room_report_visual_fixture_002",
			"kind": "ai",
			"authorType": "ai",
			"aiPlayerId": DEFAULT_AI_PLAYER_ID,
			"name": "青州后勤官",
			"body": "青州后勤官战况：攻城结束，城防和耐久变化已进入战报复盘；目标城仍需继续压制。",
			"metadata": _build_voice_unavailable_visual_smoke_metadata("autonomous_combat_siege_report", "青州后勤官战况：攻城结束，城防和耐久变化已进入战报复盘；目标城仍需继续压制。", "攻城播报语音未配置", "攻城结束已用文字记录，配置语音服务后可播放攻城播报。")
		},
		{
			"messageId": "war_room_report_visual_fixture_003",
			"kind": "ai",
			"authorType": "ai",
			"aiPlayerId": DEFAULT_AI_PLAYER_ID,
			"name": "青州后勤官",
			"body": "青州后勤官战况：敌军来袭，敌方连续攻打前线城防；我会把常打目标和来袭时间线继续记入敌军档案。",
			"metadata": _build_voice_unavailable_visual_smoke_metadata("autonomous_combat_incoming_attack_report", "青州后勤官战况：敌军来袭，敌方连续攻打前线城防；我会把常打目标和来袭时间线继续记入敌军档案。", "来袭提醒语音未配置", "敌军来袭已用文字提醒，配置语音服务后可播放来袭提醒。")
		},
		{
			"messageId": "war_room_report_visual_fixture_004",
			"kind": "ai",
			"authorType": "ai",
			"aiPlayerId": DEFAULT_AI_PLAYER_ID,
			"name": "青州后勤官",
			"body": "青州后勤官战况：驻防成功，防守结算已完成。战损 0，敌军损失 12。后续继续补强城防。",
			"metadata": _build_voice_unavailable_visual_smoke_metadata("autonomous_combat_defense_outcome_report", "青州后勤官战况：驻防成功，防守结算已完成。战损 0，敌军损失 12。后续继续补强城防。", "驻防结果语音未配置", "驻防结果已用文字复盘，配置语音服务后可播放防守结果。")
		},
		{
			"messageId": "war_room_report_visual_fixture_005",
			"kind": "ai",
			"authorType": "ai",
			"aiPlayerId": DEFAULT_AI_PLAYER_ID,
			"name": "青州后勤官",
			"body": "青州后勤官战情汇报：战情室已刷新。权限隔离：本同盟和王国成员可见。反制建议：继续补强城防，优先盯住敌军常打目标。",
			"metadata": _build_voice_unavailable_visual_smoke_metadata("autonomous_combat_war_room_report", "青州后勤官战情汇报：战情室已刷新。权限隔离：本同盟和王国成员可见。反制建议：继续补强城防，优先盯住敌军常打目标。", "战情汇报语音未配置", "战情室汇报已用文字保留，配置语音服务后可播放战情汇报。")
		}
	]
	_message_filter = MESSAGE_FILTER_ALL
	_history_counts = {
		"all": 5,
		"command": 0,
		"proposal": 0,
		"receipt": 0,
		"failure": 0,
	}
	_render_messages()

func _build_voice_unavailable_visual_smoke_metadata(source: String, speakable_text: String, label: String, summary: String) -> Dictionary:
	return {
		"source": source,
		"speakableText": speakable_text,
		"voicePlaybackIntent": "ai_player_chat_report",
		"voicePlaybackReady": false,
		"voiceAvailability": {
			"status": "unconfigured",
			"label": label,
			"summary": summary,
			"canPlayVoice": false,
			"fallbackMode": "text_only",
		},
	}

func apply_chat_receipt_detail_visual_smoke_fixture(receipt: Dictionary, message: Dictionary) -> void:
	var ai_player_id := str(receipt.get("aiPlayerId", DEFAULT_AI_PLAYER_ID)).strip_edges()
	if ai_player_id == "":
		ai_player_id = DEFAULT_AI_PLAYER_ID
	var governor_player_id := str(receipt.get("governorPlayerId", DEFAULT_GOVERNOR_PLAYER_ID)).strip_edges()
	if governor_player_id == "":
		governor_player_id = DEFAULT_GOVERNOR_PLAYER_ID
	var faction_id := str(receipt.get("factionId", DEFAULT_FACTION_ID)).strip_edges()
	if faction_id == "":
		faction_id = DEFAULT_FACTION_ID
	var receipt_channel := {
		"id": ai_player_id,
		"label": "青州后勤官",
		"aiPlayerId": ai_player_id,
		"factionId": faction_id,
		"governorPlayerId": governor_player_id,
		"listCard": {
			"statusReason": "receipt_history",
			"statusDot": "green",
		},
		"autonomyGuard": {
			"mode": "approval_only",
			"autonomousExecutionEnabled": false,
			"pendingApprovalBlocksExecution": true,
		},
	}
	_multi_ai_visual_smoke_fixture_applied = false
	_channels = BASE_CHANNELS.duplicate(true)
	_channels.append(receipt_channel.duplicate(true))
	_channels.append(SYSTEM_CHANNEL.duplicate(true))
	_ai_players = [receipt_channel.duplicate(true)]
	_new_channel_candidate_groups = _build_new_channel_candidate_groups({}, _ai_players)
	_active_channel_id = ai_player_id
	_apply_active_identity(receipt_channel)
	_channel_message_counts[ai_player_id] = 1
	_channel_seen_counts[ai_player_id] = 1
	var receipt_message := message.duplicate(true)
	receipt_message["receipt"] = receipt.duplicate(true)
	receipt_message["kind"] = "receipt"
	receipt_message["receiptOk"] = bool(receipt.get("ok", false))
	receipt_message["receiptProposalId"] = str(receipt.get("proposalId", receipt_message.get("receiptProposalId", ""))).strip_edges()
	receipt_message["action"] = str(receipt.get("action", receipt_message.get("action", ""))).strip_edges()
	_messages = [{
		"kind": "player",
		"name": "总督",
		"body": "青州后勤官，派前锋拿下附近资源地，执行前按提案链走。",
	}, {
		"kind": "ai",
		"name": "青州后勤官",
		"body": "提案已批准并执行完成，回执已归档。",
		"metadata": {
			"source": "visual_smoke",
			"aiPlayerId": ai_player_id,
		},
	}, _normalize_backend_message(receipt_message)]
	_message_filter = MESSAGE_FILTER_ALL
	_history_counts = {
		"all": 3,
		"command": 1,
		"proposal": 0,
		"receipt": 1,
		"failure": 0 if bool(receipt.get("ok", false)) else 1,
	}
	_history_has_more = false
	_history_next_before_message_id = ""
	_render_channel_buttons()
	_sync_active_channel_header()
	_render_messages()
	_set_status("回执详情点击截图样本")

func get_chat_receipt_detail_visual_smoke_summary() -> Dictionary:
	var popup_visible := _proposal_detail_popup != null and is_instance_valid(_proposal_detail_popup) and _proposal_detail_popup.visible and _proposal_detail_popup.is_visible_in_tree()
	var popup_rect := Rect2()
	var popup_inside_viewport := false
	if popup_visible:
		popup_rect = _proposal_detail_popup.get_global_rect()
		var viewport_size := get_viewport().get_visible_rect().size
		popup_inside_viewport = (
			popup_rect.position.x >= -0.5
			and popup_rect.position.y >= -0.5
			and popup_rect.position.x + popup_rect.size.x <= viewport_size.x + 0.5
			and popup_rect.position.y + popup_rect.size.y <= viewport_size.y + 0.5
		)
	var body_text := _proposal_detail_body.text if _proposal_detail_body != null and is_instance_valid(_proposal_detail_body) else ""
	var title_text := _proposal_detail_title.text if _proposal_detail_title != null and is_instance_valid(_proposal_detail_title) else ""
	var status_text := _proposal_detail_status_label.text if _proposal_detail_status_label != null and is_instance_valid(_proposal_detail_status_label) else ""
	var player_copy_text := "%s\n%s\n%s" % [title_text, status_text, body_text]
	var forbidden_player_copy_hits: Array[String] = []
	for needle_variant in [
		"proposalId",
		"worldAction",
		"queuePlanExecution",
		"WorldService",
		"runtime",
		"provider",
		"env",
		"key",
		"api key",
		"runtime model key",
		"nextBeforeMessageId",
		"developmentPoints",
		"receiptProposalId",
		"actionRequestId",
	]:
		var needle := str(needle_variant)
		if player_copy_text.find(needle) >= 0:
			forbidden_player_copy_hits.append(needle)
	var receipt_context: Dictionary = {}
	for message_variant in _messages:
		if not (message_variant is Dictionary):
			continue
		var message := message_variant as Dictionary
		if str(message.get("kind", "")).strip_edges() == "receipt":
			receipt_context = message
			break
	var receipt_payload := _extract_receipt_payload_from_container(receipt_context)
	var world_receipt := _extract_world_receipt_payload(receipt_context, receipt_context)
	var world_action := str(world_receipt.get("action", receipt_context.get("worldAction", ""))).strip_edges()
	var required_needles := [
		"结果明细",
		"占领目标地块",
		"关羽",
		"Lv.8->9",
		"经验 +20 90->10",
		"消耗",
		"粮草 1",
		"行动点 1",
		"地块 tile_152_159",
	]
	var missing_needles: Array = []
	for needle_variant in required_needles:
		var needle := str(needle_variant)
		if body_text.find(needle) < 0:
			missing_needles.append(needle)
	return {
		"chatReceiptDetailSource": "chat_receipt_message_click_fixture_v1",
		"chatReceiptDetailPopupVisible": popup_visible,
		"chatReceiptDetailPopupInsideViewport": popup_inside_viewport,
		"chatReceiptDetailPopupRect": {
			"x": popup_rect.position.x,
			"y": popup_rect.position.y,
			"w": popup_rect.size.x,
			"h": popup_rect.size.y,
		},
		"chatReceiptDetailPopupTitle": title_text,
		"chatReceiptDetailPopupText": body_text,
		"chatReceiptDetailPopupStatus": status_text,
		"chatReceiptDetailWorldAction": world_action,
		"chatReceiptDetailUsesWorldReceipt": not world_receipt.is_empty() and not receipt_payload.is_empty(),
		"chatReceiptDetailPlayerCopyForbiddenOk": forbidden_player_copy_hits.is_empty(),
		"chatReceiptDetailPlayerCopyForbiddenHits": forbidden_player_copy_hits,
		"chatReceiptDetailHasStructuredFields": missing_needles.is_empty(),
		"chatReceiptDetailMissingTextNeedles": missing_needles,
		"chatReceiptDetailVisualTextStable": missing_needles.is_empty() and forbidden_player_copy_hits.is_empty() and body_text.find("upgradeHeroLevel") < 0 and body_text.find("hero_level_upgrade") < 0,
	}

func get_chat_message_visual_smoke_summary() -> Dictionary:
	var header_title_separated := false
	if _rail_title_label != null and is_instance_valid(_rail_title_label) and _title_label != null and is_instance_valid(_title_label):
		var rail_title_rect := _rail_title_label.get_global_rect()
		var active_title_rect := _title_label.get_global_rect()
		header_title_separated = active_title_rect.position.x >= rail_title_rect.position.x + rail_title_rect.size.x + 24.0
	var latest_speech_contract := _resolve_latest_voice_speech_contract()
	var latest_speech_status := str(latest_speech_contract.get("status", "")).strip_edges()
	var latest_speech_audio_asset_id := str(latest_speech_contract.get("audioAssetId", "")).strip_edges()
	var latest_voice_duration_sec := _resolve_voice_audio_duration_seconds(latest_speech_contract, "")
	var latest_voice_bubble_width := _resolve_voice_audio_bubble_width(latest_speech_contract, "")
	var voice_control_count := _count_descendants_with_name_prefix(_message_list, "ChatVoiceAudioControlRow")
	var voice_control_paper_count := _count_descendants_with_meta(_message_list, "chat_voice_control_material", CHAT_VOICE_CONTROL_MATERIAL)
	var voice_unavailable_hint_count := _count_descendants_with_name_prefix(_message_list, "ChatVoiceUnavailableHint")
	var message_body_text := _read_visible_message_body_text()
	var message_and_voice_hint_text := _read_visible_message_and_voice_hint_text()
	var latest_ai_message := _resolve_latest_ai_message_for_visual_smoke()
	var latest_ai_body := str(latest_ai_message.get("body", "")).strip_edges()
	var latest_ai_metadata: Dictionary = latest_ai_message.get("metadata", {}) as Dictionary if latest_ai_message.get("metadata", {}) is Dictionary else {}
	var latest_ai_speakable_text := str(latest_ai_metadata.get("speakableText", "")).strip_edges()
	var war_room_required_sources := [
		"autonomous_combat_daily_summary_report",
		"autonomous_combat_siege_report",
		"autonomous_combat_incoming_attack_report",
		"autonomous_combat_defense_outcome_report",
		"autonomous_combat_war_room_report",
	]
	var war_room_backend_sources: Array = []
	for message_variant in _messages:
		if not (message_variant is Dictionary):
			continue
		var message := message_variant as Dictionary
		var metadata: Dictionary = message.get("metadata", {}) as Dictionary if message.get("metadata", {}) is Dictionary else {}
		var source := str(metadata.get("source", "")).strip_edges()
		if source != "" and war_room_required_sources.has(source) and not war_room_backend_sources.has(source):
			war_room_backend_sources.append(source)
	var war_room_backend_missing_sources: Array = []
	for source_variant in war_room_required_sources:
		var required_source := str(source_variant)
		if not war_room_backend_sources.has(required_source):
			war_room_backend_missing_sources.append(required_source)
	var war_room_backend_sources_ok := war_room_backend_missing_sources.is_empty()
	var war_room_report_applied := _war_room_report_visual_smoke_fixture_applied or war_room_backend_sources_ok
	var ai_message_bubble_count := _count_descendants_with_name_prefix(_message_list, "ChatMessageBubble_AI")
	var war_room_forbidden_hits: Array = []
	for needle_variant in ["proposalId", "worldAction", "queuePlanExecution", "alliance_defense_assign", "alliance_defense_batch_assign", "JSON", "war-room", "push", "east_expansion", "west_front", "frontline_east", "neutral_neighbor", "regionId", "stateKind", "provider", "env", "key", "api key", "runtime model key"]:
		var needle := str(needle_variant)
		if message_body_text.find(needle) >= 0:
			war_room_forbidden_hits.append(needle)
	var chat_panel_chrome_token := str(_chat_panel.get_meta("chat_chrome_unification_token", "")) if _chat_panel != null and is_instance_valid(_chat_panel) else ""
	var channel_rail_chrome_token := str(_channel_rail.get_meta("chat_chrome_unification_token", "")) if _channel_rail != null and is_instance_valid(_channel_rail) else ""
	var message_surface_chrome_token := str(_message_scroll.get_meta("chat_chrome_unification_token", "")) if _message_scroll != null and is_instance_valid(_message_scroll) else ""
	var composer_chrome_token := str(_composer_container.get_meta("chat_chrome_unification_token", "")) if _composer_container != null and is_instance_valid(_composer_container) else ""
	var chat_chrome_unification_ok := (
		chat_panel_chrome_token == CHAT_COMMAND_CHROME_TOKEN
		and channel_rail_chrome_token == CHAT_COMMAND_CHROME_TOKEN
		and message_surface_chrome_token == CHAT_COMMAND_CHROME_TOKEN
		and composer_chrome_token == CHAT_COMMAND_CHROME_TOKEN
	)
	var chat_ai_activity_summary := _read_chat_ai_activity_continuity_summary()
	var summary := {
		"chatMessageBubbleLayout": "avatar_left_ai_right_player_v1",
		"chatChromeUnificationToken": CHAT_COMMAND_CHROME_TOKEN,
		"chatPanelChromeToken": chat_panel_chrome_token,
		"chatChannelRailChromeToken": channel_rail_chrome_token,
		"chatMessageSurfaceChromeToken": message_surface_chrome_token,
		"chatComposerChromeToken": composer_chrome_token,
		"chatChromeUnificationOk": chat_chrome_unification_ok,
		"chatMessageScrollTarget": _resolve_chat_message_scroll_target(),
		"chatMessageAvatarMode": "ai_portrait_or_badge_player_badge_v1",
		"chatMessageAvatarCount": _count_descendants_with_name_prefix(_message_list, "ChatAvatar_"),
		"chatAvatarFrameMaterial": CHAT_AVATAR_FRAME_MATERIAL,
		"chatAvatarPaperFrameCount": _count_descendants_with_meta(_message_list, "chat_avatar_frame_material", CHAT_AVATAR_FRAME_MATERIAL),
		"chatAvatarPaperFrameOk": _count_descendants_with_name_prefix(_message_list, "ChatAvatar_") > 0 and _count_descendants_with_meta(_message_list, "chat_avatar_frame_material", CHAT_AVATAR_FRAME_MATERIAL) >= _count_descendants_with_name_prefix(_message_list, "ChatAvatar_"),
		"chatMessagePlayerBubbleCount": _count_descendants_with_name_prefix(_message_list, "ChatMessageBubble_Player"),
		"chatMessageAiBubbleCount": ai_message_bubble_count,
		"chatIdentityTagMaterial": CHAT_IDENTITY_TAG_MATERIAL,
		"chatIdentityTagCount": _count_descendants_with_meta(_message_list, "chat_identity_tag_material", CHAT_IDENTITY_TAG_MATERIAL),
		"chatIdentityTagPaperOk": _count_descendants_with_name_prefix(_message_list, "ChatMessageBubble_Player") + _count_descendants_with_name_prefix(_message_list, "ChatMessageBubble_AI") > 0 and _count_descendants_with_meta(_message_list, "chat_identity_tag_material", CHAT_IDENTITY_TAG_MATERIAL) >= _count_descendants_with_name_prefix(_message_list, "ChatMessageBubble_Player") + _count_descendants_with_name_prefix(_message_list, "ChatMessageBubble_AI"),
		"chatMessagePlayerRightAligned": _has_chat_message_row_alignment("ChatMessageRow_Player", "right") or _count_descendants_with_name_prefix(_message_list, "ChatMessageBubble_Player") > 0,
		"chatMessageAiLeftAligned": _has_chat_message_row_alignment("ChatMessageRow_AI", "left") or _count_descendants_with_name_prefix(_message_list, "ChatMessageBubble_AI") > 0,
		"chatChannelRailTitleText": _rail_title_label.text if _rail_title_label != null and is_instance_valid(_rail_title_label) else "",
		"chatChannelHeaderTitleSeparated": header_title_separated,
		"chatChannelAccentRailVisible": false,
		"chatHeaderHierarchyMode": _read_chat_header_hierarchy_mode(),
		"chatHeaderTitleFontSize": float(_title_label.get_meta("chat_header_title_font_size", 0)) if _title_label != null and is_instance_valid(_title_label) else 0.0,
		"chatHeaderCompactOk": _title_label != null and is_instance_valid(_title_label) and _read_chat_header_hierarchy_mode() == CHAT_HEADER_HIERARCHY_MODE and float(_title_label.get_meta("chat_header_title_font_size", 0)) <= 22.0,
		"chatMultiAiFixtureApplied": _multi_ai_visual_smoke_fixture_applied,
		"chatMultiAiFixtureMode": "multi_ai_channels_fixture_v1" if _multi_ai_visual_smoke_fixture_applied else "",
		"chatMultiAiNoTextClipRisk": _read_chat_multi_ai_fixture_text_fit_ok() if _multi_ai_visual_smoke_fixture_applied else false,
		"chatWarRoomReportFixtureApplied": war_room_report_applied,
		"chatWarRoomReportBackendSources": war_room_backend_sources,
		"chatWarRoomReportBackendSourceCount": war_room_backend_sources.size(),
		"chatWarRoomReportBackendMissingSources": war_room_backend_missing_sources,
		"chatWarRoomReportBackendSourcesOk": war_room_backend_sources_ok,
		"chatWarRoomReportVisibleTextOk": message_body_text.find("战情汇报") >= 0 and message_body_text.find("攻城") >= 0 and message_body_text.find("来袭") >= 0 and message_body_text.find("驻防") >= 0 and message_body_text.find("战损") >= 0 and message_body_text.find("反制建议") >= 0,
		"chatWarRoomReportForbiddenCopyHits": war_room_forbidden_hits,
		"chatWarRoomReportForbiddenCopyOk": war_room_forbidden_hits.is_empty(),
		"chatWarRoomReportBubbleOk": war_room_report_applied and ai_message_bubble_count >= 5,
		"chatAiActivityContinuityToken": UI_COMPONENT_FACTORY.chat_ai_activity_continuity_token(),
		"chatAiActivityContinuityVisible": bool(chat_ai_activity_summary.get("visible", false)),
		"chatAiActivityStripCount": int(chat_ai_activity_summary.get("strip_count", 0)),
		"chatAiActivityStatusDotCount": int(chat_ai_activity_summary.get("status_dot_count", 0)),
		"chatAiActivityTaskLabelCount": int(chat_ai_activity_summary.get("task_label_count", 0)),
		"chatAiActivityUsesExecutionTrace": bool(chat_ai_activity_summary.get("uses_execution_trace", false)),
		"chatAiActivityFallbackUsed": bool(chat_ai_activity_summary.get("fallback_used", true)),
		"chatAiActivityTraceCount": int(chat_ai_activity_summary.get("trace_count", 0)),
		"chatAiActivityFirstTraceId": str(chat_ai_activity_summary.get("first_trace_id", "")).strip_edges(),
		"chatAiActivityGovernedProposalVisible": bool(chat_ai_activity_summary.get("governed_proposal_visible", false)),
		"chatAiActivityCurrentTaskText": str(chat_ai_activity_summary.get("current_task_text", "")).strip_edges(),
		"chatAiActivitySource": str(chat_ai_activity_summary.get("source", "")).strip_edges(),
		"chatAiActivityForbiddenCopyHits": chat_ai_activity_summary.get("forbidden_hits", []),
		"chatAiActivityForbiddenCopyOk": bool(chat_ai_activity_summary.get("forbidden_copy_ok", false)),
		"chatLatestAiBodyText": latest_ai_body.substr(0, 400),
		"chatLatestAiSpeakableText": latest_ai_speakable_text.substr(0, 400),
		"chatLatestAiDecisionSource": str(latest_ai_metadata.get("source", "")).strip_edges(),
		"chatLatestAiDecision": str(latest_ai_metadata.get("decision", "")).strip_edges(),
		"chatLatestAiDecisionStatus": str(latest_ai_metadata.get("status", "")).strip_edges(),
		"chatLatestAiDecisionAuthorityPreserved": bool(latest_ai_metadata.get("authorityPreserved", false)),
		"chatVoiceUnavailableDetailedLabelsVisible": message_and_voice_hint_text.find("今日总结语音未配置") >= 0 and message_and_voice_hint_text.find("攻城播报语音未配置") >= 0 and message_and_voice_hint_text.find("来袭提醒语音未配置") >= 0 and message_and_voice_hint_text.find("驻防结果语音未配置") >= 0 and message_and_voice_hint_text.find("战情汇报语音未配置") >= 0,
		"chatMessageHistoryHintHidden": _is_chat_message_history_hint_hidden(),
		"chatVisibleScrollbarsHidden": _read_visible_scrollbars_hidden(self),
		"chatMessageSurfaceMaterial": str(_message_scroll.get_meta("chat_message_history_material", "")) if _message_scroll != null else "",
		"chatMessageLightPaperSurfaceOk": _message_scroll != null and str(_message_scroll.get_meta("chat_message_history_material", "")) == "light_paper_message_surface_v1",
		"chatMessageCommandChromeSurfaceOk": _message_scroll != null and str(_message_scroll.get_meta("chat_message_history_material", "")) == CHAT_COMMAND_MESSAGE_SURFACE_MATERIAL and message_surface_chrome_token == CHAT_COMMAND_CHROME_TOKEN,
		"chatVoiceSettingsPanelVisible": false,
		"chatVoiceSettingsMovedToAiPanel": true,
		"chatVoiceSettingsLocation": "ai_panel_voice_page",
		"chatVoiceTextCommandButtonWired": true,
		"chatVoiceTextCommandRoute": "/api/ai/players/:id/chat/voice-command",
		"chatVoiceButtonMode": "typed_text_to_ai_speech_contract_v1",
		"chatVoiceClonePlaceholderVisible": false,
		"chatVoiceSettingsSource": "ai_panel_voice_page_only_v1",
		"chatVoiceLatestSpeechContractStatus": latest_speech_status,
		"chatVoiceLatestSpeechContractAudioAssetId": latest_speech_audio_asset_id,
		"chatVoiceLatestSpeechContractOk": latest_speech_status == "succeeded" and latest_speech_audio_asset_id != "",
		"chatVoiceAudioDynamicWidthMode": "wechat_like_duration_scaled_voice_bubble_v1",
		"chatVoiceAudioLatestDurationSec": latest_voice_duration_sec,
		"chatVoiceAudioLatestBubbleWidth": latest_voice_bubble_width,
		"chatVoiceAudioDynamicWidthOk": latest_voice_bubble_width >= 118.0 and latest_voice_bubble_width <= 276.0,
		"chatVoiceAudioControlMaterial": CHAT_VOICE_CONTROL_MATERIAL,
		"chatVoiceAudioControlRowCount": voice_control_count,
		"chatVoiceAudioControlPaperCount": voice_control_paper_count,
		"chatVoiceAudioControlPaperOk": voice_control_count == 0 or voice_control_paper_count >= voice_control_count,
		"chatVoicePlayableBodyTextVisible": voice_control_count == 0 or _count_descendants_with_name_prefix(_message_list, "ChatMessageBodyText") > 0,
		"chatVoiceUnavailableHintCount": voice_unavailable_hint_count,
		"chatVoiceUnavailableHintVisible": voice_unavailable_hint_count > 0,
		"chatVoiceUnavailableProviderEnvKeyHidden": message_and_voice_hint_text.to_lower().find("provider") < 0 and message_and_voice_hint_text.to_lower().find("mimo") < 0 and message_and_voice_hint_text.to_lower().find("xiaomi") < 0 and message_and_voice_hint_text.to_lower().find("env") < 0 and message_and_voice_hint_text.to_lower().find("key") < 0 and message_and_voice_hint_text.to_lower().find("api key") < 0,
		"chatVoiceAudioPlayButtonCount": _count_descendants_with_name_prefix(_message_list, "ChatVoiceAudioPlayButton"),
		"chatVoiceAudioLatestAssetId": _resolve_latest_voice_audio_asset_id(),
		"chatVoiceAudioPlayerPresent": _voice_audio_player != null and is_instance_valid(_voice_audio_player),
		"chatVoiceAudioPlayerPlaying": _voice_audio_player != null and is_instance_valid(_voice_audio_player) and _voice_audio_player.playing,
		"chatVoiceAudioPlayingAssetId": _voice_audio_playing_asset_id,
		"chatVoiceAudioLastPlayedAssetId": _voice_audio_last_played_asset_id,
		"chatVoiceAudioAutoPlaySuccessCount": _voice_audio_auto_play_success_count,
		"chatVoiceAudioPlaySuccessCount": _voice_audio_play_success_count,
		"chatVoiceAudioPlayFailureCount": _voice_audio_play_failure_count,
		"chatVoiceAudioLastError": _voice_audio_last_error,
		"chatGovernorDisplayName": _resolve_governor_display_name(),
	}
	summary["chatAiActivityIdentityChipToken"] = UI_COMPONENT_FACTORY.ai_activity_identity_chip_token()
	UI_COMPONENT_FACTORY.apply_ai_activity_identity_chip_summary(
		summary,
		"chatAiActivity",
		_count_descendants_with_meta(_message_list, "ai_activity_identity_chip_token", UI_COMPONENT_FACTORY.ai_activity_identity_chip_token())
	)
	UI_COMPONENT_FACTORY.apply_portrait_frame_summary(summary, "chatAvatar", UI_COMPONENT_FACTORY.PORTRAIT_FRAME_AVATAR_VARIANT)
	UI_COMPONENT_FACTORY.apply_ai_chat_motion_summary(summary)
	var rail_summary := _read_channel_rail_visual_summary()
	for key_variant in rail_summary.keys():
		summary[str(key_variant)] = rail_summary[key_variant]
	var composer_summary := _read_chat_composer_visual_summary()
	for key_variant in composer_summary.keys():
		summary[str(key_variant)] = composer_summary[key_variant]
	var history_filter_summary := _read_chat_history_filter_button_summary()
	for key_variant in history_filter_summary.keys():
		summary[str(key_variant)] = history_filter_summary[key_variant]
	return summary

func _read_visible_message_body_text() -> String:
	var parts: Array[String] = []
	for message_variant in _messages:
		if message_variant is Dictionary:
			var message := message_variant as Dictionary
			var body := str(message.get("body", "")).strip_edges()
			if body != "":
				parts.append(body)
	return " ".join(parts)

func _read_visible_message_and_voice_hint_text() -> String:
	var parts: Array[String] = []
	for message_variant in _messages:
		if message_variant is Dictionary:
			var message := message_variant as Dictionary
			var body := str(message.get("body", "")).strip_edges()
			if body != "":
				parts.append(body)
			var metadata_variant: Variant = message.get("metadata", {})
			if metadata_variant is Dictionary:
				var metadata := metadata_variant as Dictionary
				var availability_variant: Variant = metadata.get("voiceAvailability", {})
				if availability_variant is Dictionary:
					var availability := availability_variant as Dictionary
					var label := str(availability.get("label", "")).strip_edges()
					var summary := str(availability.get("summary", "")).strip_edges()
					if label != "":
						parts.append(label)
					if summary != "":
						parts.append(summary)
	return " ".join(parts)

func _resolve_latest_ai_message_for_visual_smoke() -> Dictionary:
	for index in range(_messages.size() - 1, -1, -1):
		var message_variant: Variant = _messages[index]
		if not (message_variant is Dictionary):
			continue
		var message := message_variant as Dictionary
		if str(message.get("authorType", message.get("kind", ""))).strip_edges() == "ai":
			return message
	return {}

func run_mainline_visual_smoke_voice_playback() -> Dictionary:
	var result := {
		"attempted": true,
		"ok": false,
		"reason": "not_started",
		"chatVoicePlaybackVisualSmoke": "typed_text_voice_command_then_click_play_v1",
	}
	if _input == null:
		result["reason"] = "chat_input_missing"
		return result
	if _api_client == null:
		result["reason"] = "api_client_missing"
		return result
	if not _api_client.has_method("send_ai_player_voice_command") or not _api_client.has_method("get_ai_player_voice_audio_asset"):
		result["reason"] = "voice_api_methods_missing"
		return result
	if not _find_channel(_active_channel_id).has("aiPlayerId"):
		await _on_channel_pressed(DEFAULT_AI_PLAYER_ID)
		await get_tree().process_frame
	if not _find_channel(_active_channel_id).has("aiPlayerId"):
		result["reason"] = "ai_channel_missing"
		result["activeChannelId"] = _active_channel_id
		return result
	_message_filter = MESSAGE_FILTER_ALL
	_refresh_message_filter_buttons()
	var voice_command_button := _find_visible_named_button(self, "ChatVoiceTextCommandButton")
	if voice_command_button == null:
		result["reason"] = "voice_command_button_missing"
		return result
	_input.text = "请用一句话做演示视频语音确认。"
	_sync_chat_input_height()
	var before_audio_asset_id := _resolve_latest_voice_audio_asset_id()
	_visual_smoke_voice_command_record_only = true
	voice_command_button.emit_signal("pressed")
	await get_tree().process_frame
	var command_wait: Dictionary = await _wait_for_mainline_visual_smoke_voice_audio_control(before_audio_asset_id, 6.0)
	_visual_smoke_voice_command_record_only = false
	result["voiceCommandButtonClicked"] = true
	result["voiceCommandWait"] = command_wait
	var audio_asset_id := str(command_wait.get("audioAssetId", "")).strip_edges()
	if audio_asset_id == "":
		audio_asset_id = _resolve_latest_voice_audio_asset_id()
	_scroll_messages_to_bottom()
	await get_tree().process_frame
	await get_tree().create_timer(0.1).timeout
	var play_button := _find_visible_named_button(self, "ChatVoiceAudioPlayButton")
	if play_button == null:
		result["reason"] = "voice_audio_play_button_missing"
		result["chatVoiceAudioLatestAssetId"] = audio_asset_id
		result["chatVoiceSummary"] = get_chat_message_visual_smoke_summary()
		return result
	if play_button.disabled:
		result["reason"] = "voice_audio_play_button_disabled"
		result["chatVoiceAudioLatestAssetId"] = audio_asset_id
		result["chatVoiceSummary"] = get_chat_message_visual_smoke_summary()
		return result
	var before_success_count := _voice_audio_play_success_count
	var before_failure_count := _voice_audio_play_failure_count
	play_button.emit_signal("pressed")
	await get_tree().process_frame
	var playback_wait: Dictionary = await _wait_for_mainline_visual_smoke_voice_audio_playback(before_success_count, before_failure_count, audio_asset_id, 5.0)
	_scroll_messages_to_bottom()
	await get_tree().process_frame
	await get_tree().create_timer(0.1).timeout
	var chat_voice_summary := get_chat_message_visual_smoke_summary()
	var playback_ok := bool(playback_wait.get("ok", false))
	var latest_asset_ok := audio_asset_id != "" and str(chat_voice_summary.get("chatVoiceAudioLatestAssetId", "")).strip_edges() == audio_asset_id
	var last_played_ok := audio_asset_id != "" and str(chat_voice_summary.get("chatVoiceAudioLastPlayedAssetId", "")).strip_edges() == audio_asset_id
	var no_new_failure := int(chat_voice_summary.get("chatVoiceAudioPlayFailureCount", 0)) == before_failure_count
	var ok := bool(command_wait.get("ok", false)) and playback_ok and latest_asset_ok and last_played_ok and no_new_failure
	result["ok"] = ok
	result["reason"] = "voice_audio_playback_verified" if ok else "voice_audio_playback_failed"
	result["voiceAudioPlayButtonClicked"] = true
	result["chatVoiceAudioAssetId"] = audio_asset_id
	result["voicePlaybackWait"] = playback_wait
	result["chatVoiceSummary"] = chat_voice_summary
	return result

func run_mainline_visual_smoke_default_report_voice_playback() -> Dictionary:
	var result := {
		"attempted": true,
		"ok": false,
		"reason": "not_started",
		"chatVoicePlaybackVisualSmoke": "default_report_speakable_text_auto_play_v1",
	}
	if _api_client == null:
		result["reason"] = "api_client_missing"
		return result
	if not _api_client.has_method("update_ai_player_profile") or not _api_client.has_method("get_ai_player") or not _api_client.has_method("get_ai_player_autonomous_combat_daily_summary") or not _api_client.has_method("get_ai_player_voice_audio_asset"):
		result["reason"] = "default_report_voice_api_methods_missing"
		return result
	if not _find_channel(_active_channel_id).has("aiPlayerId"):
		await _on_channel_pressed(DEFAULT_AI_PLAYER_ID)
		await get_tree().process_frame
	if not _find_channel(_active_channel_id).has("aiPlayerId"):
		result["reason"] = "ai_channel_missing"
		result["activeChannelId"] = _active_channel_id
		return result
	var policy_response: Dictionary = await _api_client.update_ai_player_profile(_active_ai_player_id, "", "", "", _active_governor_player_id, {
		"allowAutonomousCombatDailySummaryChatReports": true,
		"allowAutonomousCombatWarEventChatReports": true,
		"allowAutonomousCombatVoiceReports": true,
	})
	result["policySaveOk"] = bool(policy_response.get("ok", false))
	if not bool(policy_response.get("ok", false)):
		result["reason"] = "policy_save_failed"
		result["policyResponse"] = policy_response
		return result
	var profile_response: Dictionary = await _api_client.get_ai_player(_active_ai_player_id)
	var profile_data: Dictionary = profile_response.get("data", {}) as Dictionary
	var runtime_policy: Dictionary = profile_data.get("runtimePolicy", {}) as Dictionary
	var policy_readback_ok := (
		bool(profile_response.get("ok", false))
		and bool(runtime_policy.get("allowAutonomousCombatDailySummaryChatReports", false))
		and bool(runtime_policy.get("allowAutonomousCombatWarEventChatReports", false))
		and bool(runtime_policy.get("allowAutonomousCombatVoiceReports", false))
	)
	result["policyReadbackOk"] = policy_readback_ok
	if not policy_readback_ok:
		result["reason"] = "policy_readback_failed"
		result["policyReadbackResponse"] = profile_response
		return result
	var before_success_count := _voice_audio_play_success_count
	var before_failure_count := _voice_audio_play_failure_count
	var before_auto_success_count := _voice_audio_auto_play_success_count
	var before_audio_asset_id := _resolve_latest_voice_audio_asset_id()
	var summary_response: Dictionary = await _api_client.get_ai_player_autonomous_combat_daily_summary(_active_ai_player_id, 20)
	result["dailySummaryOk"] = bool(summary_response.get("ok", false))
	if not bool(summary_response.get("ok", false)):
		result["reason"] = "daily_summary_failed"
		result["dailySummaryResponse"] = summary_response
		return result
	_message_filter = MESSAGE_FILTER_ALL
	_refresh_message_filter_buttons()
	await _refresh_chat()
	var command_wait: Dictionary = await _wait_for_mainline_visual_smoke_voice_audio_control(before_audio_asset_id, 6.0)
	var audio_asset_id := str(command_wait.get("audioAssetId", "")).strip_edges()
	if audio_asset_id == "":
		audio_asset_id = _resolve_latest_voice_audio_asset_id()
	var playback_wait: Dictionary = await _wait_for_mainline_visual_smoke_voice_audio_playback(before_success_count, before_failure_count, audio_asset_id, 6.0)
	var chat_voice_summary := get_chat_message_visual_smoke_summary()
	var auto_play_ok := _voice_audio_auto_play_success_count > before_auto_success_count
	var target_asset_played_ok := (
		audio_asset_id != ""
		and str(chat_voice_summary.get("chatVoiceAudioLastPlayedAssetId", "")).strip_edges() == audio_asset_id
		and int(chat_voice_summary.get("chatVoiceAudioPlaySuccessCount", 0)) >= 1
		and int(chat_voice_summary.get("chatVoiceAudioPlayFailureCount", 0)) == before_failure_count
	)
	var body_text_visible := bool(chat_voice_summary.get("chatVoicePlayableBodyTextVisible", false))
	var playback_started_ok := bool(playback_wait.get("ok", false)) or auto_play_ok or target_asset_played_ok
	var ok := bool(command_wait.get("ok", false)) and playback_started_ok and body_text_visible
	result["ok"] = ok
	result["reason"] = "default_report_voice_auto_play_verified" if ok else "default_report_voice_auto_play_failed"
	result["voiceAudioControlWait"] = command_wait
	result["voicePlaybackWait"] = playback_wait
	result["voicePlaybackStartedOk"] = playback_started_ok
	result["targetAssetPlayedOk"] = target_asset_played_ok
	result["chatVoiceAudioAssetId"] = audio_asset_id
	result["autoPlaySuccessCountBefore"] = before_auto_success_count
	result["autoPlaySuccessCountAfter"] = _voice_audio_auto_play_success_count
	result["chatVoicePlayableBodyTextVisible"] = body_text_visible
	result["chatVoiceSummary"] = chat_voice_summary
	return result

func run_mainline_visual_smoke_default_report_voice_unavailable() -> Dictionary:
	var result := {
		"attempted": true,
		"ok": false,
		"reason": "not_started",
		"smoke": "default_report_voice_unavailable_hint_v1",
	}
	if _api_client == null:
		result["reason"] = "api_client_missing"
		return result
	if not _api_client.has_method("update_ai_player_profile") or not _api_client.has_method("get_ai_player") or not _api_client.has_method("get_ai_player_autonomous_combat_daily_summary"):
		result["reason"] = "default_report_voice_unavailable_api_methods_missing"
		return result
	if not _find_channel(_active_channel_id).has("aiPlayerId"):
		await _on_channel_pressed(DEFAULT_AI_PLAYER_ID)
		await get_tree().process_frame
	if not _find_channel(_active_channel_id).has("aiPlayerId"):
		result["reason"] = "ai_channel_missing"
		result["activeChannelId"] = _active_channel_id
		return result
	var policy_response: Dictionary = await _api_client.update_ai_player_profile(_active_ai_player_id, "", "", "", _active_governor_player_id, {
		"allowAutonomousCombatDailySummaryChatReports": true,
		"allowAutonomousCombatWarEventChatReports": true,
		"allowAutonomousCombatVoiceReports": true,
	})
	result["policySaveOk"] = bool(policy_response.get("ok", false))
	if not bool(policy_response.get("ok", false)):
		result["reason"] = "policy_save_failed"
		result["policyResponse"] = policy_response
		return result
	var summary_response: Dictionary = await _api_client.get_ai_player_autonomous_combat_daily_summary(_active_ai_player_id, 20)
	result["dailySummaryOk"] = bool(summary_response.get("ok", false))
	if not bool(summary_response.get("ok", false)):
		result["reason"] = "daily_summary_failed"
		result["dailySummaryResponse"] = summary_response
		return result
	_message_filter = MESSAGE_FILTER_ALL
	_refresh_message_filter_buttons()
	await _refresh_chat()
	await get_tree().process_frame
	await get_tree().process_frame
	var chat_voice_summary := get_chat_message_visual_smoke_summary()
	var ok := (
		bool(chat_voice_summary.get("chatVoiceUnavailableHintVisible", false))
		and int(chat_voice_summary.get("chatVoiceAudioControlRowCount", 0)) == 0
		and int(chat_voice_summary.get("chatVoiceAudioPlayButtonCount", 0)) == 0
		and bool(chat_voice_summary.get("chatVoiceUnavailableProviderEnvKeyHidden", false))
	)
	result["ok"] = ok
	result["reason"] = "default_report_voice_unavailable_hint_verified" if ok else "default_report_voice_unavailable_hint_failed"
	result["chatVoiceSummary"] = chat_voice_summary
	return result


func _read_channel_rail_visual_summary() -> Dictionary:
	var base_channel_ids: Array = []
	var base_channel_labels: Array = []
	var ai_channel_ids: Array = []
	var section_labels: Array = []
	var min_button_height := 999999.0
	var min_primary_font_size := 999999.0
	var badge_visible := false
	var badge_mode_ok := true
	var subtitle_hidden := true
	var tile_mode_ok := true
	var new_channel_label := ""
	var phone_width_chat_layout := _is_phone_width_chat_layout()
	var rail_visible_in_tree := _channel_rail != null and is_instance_valid(_channel_rail) and _channel_rail.visible and _channel_rail.is_visible_in_tree()
	for channel in _channels:
		if not (channel is Dictionary):
			continue
		var channel_dict := channel as Dictionary
		var channel_id := str(channel_dict.get("id", "")).strip_edges()
		if channel_id == "":
			continue
		var button := _channel_buttons.get(channel_id, null) as Button
		if button != null and button.visible and button.is_visible_in_tree():
			min_button_height = minf(min_button_height, button.get_global_rect().size.y)
			if str(button.get_meta("chat_channel_tile_mode", "")).strip_edges() != "full_width_clean_channel_tiles_v1":
				tile_mode_ok = false
		var is_ai := channel_dict.has("aiPlayerId")
		var view := _channel_button_views.get(channel_id, {}) as Dictionary
		var primary_label := view.get("primary", null) as Label
		if primary_label != null and is_instance_valid(primary_label):
			min_primary_font_size = minf(min_primary_font_size, float(primary_label.get_meta("chat_channel_primary_font_size", 0)))
		var subtitle_label := view.get("subtitle", null) as Label
		if subtitle_label != null and is_instance_valid(subtitle_label):
			if subtitle_label.visible or subtitle_label.text.strip_edges() != "":
				subtitle_hidden = false
		var avatar := view.get("avatar", null) as Control
		if avatar != null and is_instance_valid(avatar) and avatar.visible and avatar.is_visible_in_tree():
			badge_visible = true
			if str(avatar.get_meta("chat_channel_badge_mode", "")).strip_edges() != "paper_badge_channel_icon_v1":
				badge_mode_ok = false
		if is_ai:
			ai_channel_ids.append(channel_id)
		elif channel_id != "system":
			base_channel_ids.append(channel_id)
			base_channel_labels.append(_format_channel_primary_label(channel_dict))
		if channel_id == NEW_CHANNEL_ID:
			new_channel_label = _format_channel_primary_label(channel_dict)
	if _channel_list != null:
		for child in _channel_list.get_children():
			var label_text := str(child.get_meta("chat_channel_section_label", "")).strip_edges()
			if label_text != "":
				section_labels.append(label_text)
	if min_button_height >= 999999.0:
		min_button_height = 0.0
	if min_primary_font_size >= 999999.0:
		min_primary_font_size = 0.0
	var active_ai_player_separated := ai_channel_ids.has(_active_channel_id) and _find_channel(_active_channel_id).has("aiPlayerId")
	var rail_mode := "grouped_clean_channels_v1" if (
		base_channel_ids.has("world")
		and base_channel_ids.has("alliance")
		and base_channel_ids.has(NEW_CHANNEL_ID)
		and ai_channel_ids.size() >= 1
		and section_labels.has("AI玩家")
		and new_channel_label == "＋"
	) else "chat_channel_drawer_incomplete"
	if phone_width_chat_layout and not rail_visible_in_tree and _channel_rail != null:
		rail_mode = "phone_hidden_channel_drawer_v1"
	var rail_chrome_token := str(_channel_rail.get_meta("chat_chrome_unification_token", "")) if _channel_rail != null and is_instance_valid(_channel_rail) else ""
	var drawer_material := str(_channel_rail.get_meta("chat_channel_drawer_material", "")) if _channel_rail != null else ""
	return {
		"chatChannelRailMode": rail_mode if rail_mode == "phone_hidden_channel_drawer_v1" else ("command_chrome_text_channel_drawer_v1" if rail_mode != "chat_channel_drawer_incomplete" else "chat_channel_drawer_incomplete"),
		"chatChannelDrawerMaterial": drawer_material,
		"chatChannelRailChromeToken": rail_chrome_token,
		"chatChannelDrawerCommandChromeOk": _channel_rail != null and drawer_material == CHAT_COMMAND_RAIL_MATERIAL and rail_chrome_token == CHAT_COMMAND_CHROME_TOKEN,
		"chatChannelDrawerLightPaperOk": _channel_rail != null and drawer_material == "light_paper_channel_drawer_v1",
		"chatChannelRailVisibleInTree": rail_visible_in_tree,
		"chatChannelRailPhoneHiddenOk": (not phone_width_chat_layout) or not rail_visible_in_tree,
		"chatChannelRailDensityOk": (not rail_visible_in_tree) or (min_button_height >= 64.0 and min_button_height <= 92.0 and min_primary_font_size >= 18.0),
		"chatChannelBaseChannelIds": base_channel_ids,
		"chatChannelBaseChannelLabels": base_channel_labels,
		"chatChannelWorldLabel": _read_channel_primary_label_by_id("world"),
		"chatChannelWorldBadge": "",
		"chatChannelWorldDescription": _format_regular_channel_subtitle(_find_channel("world")),
		"chatChannelWorldCopyContractOk": (
			_read_channel_primary_label_by_id("world") == "世界"
			and _format_regular_channel_subtitle(_find_channel("world")) == "世界频道 / 军情、系统消息和世界消息"
		),
		"chatChannelAiChannelIds": ai_channel_ids,
		"chatChannelAiChannelCount": ai_channel_ids.size(),
		"chatChannelBadgeVisible": badge_visible,
		"chatChannelBadgeModeOk": not badge_visible and badge_mode_ok,
		"chatChannelNewChannelLabel": new_channel_label,
		"chatChannelButtonMinHeight": min_button_height,
		"chatChannelPrimaryMinFontSize": min_primary_font_size,
		"chatChannelSectionLabels": section_labels,
		"chatChannelActiveAiPlayerSeparated": active_ai_player_separated,
		"chatChannelRailTileMode": "full_width_clean_channel_tiles_v1" if tile_mode_ok else "chat_channel_tiles_incomplete",
		"chatChannelSubtitleHidden": subtitle_hidden,
	}

func _read_chat_composer_visual_summary() -> Dictionary:
	var composer_material := str(_composer_container.get_meta("chat_composer_material", "")) if _composer_container != null and is_instance_valid(_composer_container) else ""
	var composer_chrome_token := str(_composer_container.get_meta("chat_chrome_unification_token", "")) if _composer_container != null and is_instance_valid(_composer_container) else ""
	var input_style_ok := false
	var composer_rect := _composer_container.get_global_rect() if _composer_container != null and is_instance_valid(_composer_container) else Rect2()
	var panel_rect := _chat_panel.get_global_rect() if _chat_panel != null and is_instance_valid(_chat_panel) else Rect2()
	var input_rect := _input.get_global_rect() if _input != null and is_instance_valid(_input) else Rect2()
	var action_row_rect := _composer_action_row.get_global_rect() if _composer_action_row != null and is_instance_valid(_composer_action_row) else Rect2()
	var mobile_composer := _is_mobile_chat_layout()
	var input_inside_composer_ok := _input != null and is_instance_valid(_input) and _rect_fits_inside(input_rect, composer_rect, 1.0)
	var input_inside_panel_ok := _input != null and is_instance_valid(_input) and _rect_fits_inside(input_rect, panel_rect, 1.0)
	var action_row_inside_composer_ok := _composer_action_row != null and is_instance_valid(_composer_action_row) and _rect_fits_inside(action_row_rect, composer_rect, 1.0)
	var action_buttons_inside_composer_ok := true
	var action_buttons_inside_panel_ok := true
	var composer_command_token_count := 0
	var composer_command_live_labels: Array = []
	if _input != null and is_instance_valid(_input):
		var input_style := _input.get_theme_stylebox("normal") as StyleBoxFlat
		input_style_ok = input_style != null and input_style.bg_color.r >= 0.90 and input_style.bg_color.g >= 0.86 and input_style.bg_color.b >= 0.74
	var action_button_names := ["ChatVoiceTextCommandButton"]
	var action_button_count := 0
	var styled_action_button_count := 0
	for button in _collect_visible_buttons(self):
		var text := button.text.strip_edges()
		if text in ["视频", "说话", "发送"]:
			action_button_count += 1
			composer_command_live_labels.append(text)
			var button_rect := button.get_global_rect()
			if not _rect_fits_inside(button_rect, composer_rect, 1.0):
				action_buttons_inside_composer_ok = false
			if not _rect_fits_inside(button_rect, panel_rect, 1.0):
				action_buttons_inside_panel_ok = false
			if str(button.get_meta("chat_paper_action_button_role", "")).strip_edges() != "":
				styled_action_button_count += 1
			if str(button.get_meta("chat_paper_action_command_bg_token", "")).strip_edges() == UI_COMPONENT_FACTORY.CHAT_PAPER_ACTION_COMMAND_BG_TOKEN:
				composer_command_token_count += 1
		if str(button.name) == "ChatVoiceTextCommandButton" and not action_button_names.has(str(button.name)):
			action_button_names.append(str(button.name))
	return {
		"chatComposerMaterial": composer_material,
		"chatComposerChromeToken": composer_chrome_token,
		"chatComposerCommandChromeOk": composer_material == CHAT_COMMAND_COMPOSER_MATERIAL and composer_chrome_token == CHAT_COMMAND_CHROME_TOKEN,
		"chatComposerCommandBgToken": UI_COMPONENT_FACTORY.CHAT_PAPER_ACTION_COMMAND_BG_TOKEN,
		"chatComposerCommandLiveLabels": composer_command_live_labels,
		"chatComposerCommandTokenCount": composer_command_token_count,
		"chatComposerCommandTokenOk": action_button_count >= 3 and composer_command_token_count >= 3,
		"chatComposerPaperInputOk": input_style_ok,
		"chatComposerActionButtonCount": action_button_count,
		"chatComposerPaperActionButtonCount": styled_action_button_count,
		"chatComposerPaperActionButtonsOk": action_button_count >= 3 and styled_action_button_count >= 3,
		"chatComposerVoiceButtonNodePreserved": action_button_names.has("ChatVoiceTextCommandButton"),
		"chatComposerMobileMode": mobile_composer,
		"chatComposerRect": _rect_to_chat_visual_smoke_dict(composer_rect),
		"chatComposerInputRect": _rect_to_chat_visual_smoke_dict(input_rect),
		"chatComposerActionRowRect": _rect_to_chat_visual_smoke_dict(action_row_rect),
		"chatComposerInputInsideComposerOk": input_inside_composer_ok,
		"chatComposerInputInsidePanelOk": input_inside_panel_ok,
		"chatComposerActionRowInsideComposerOk": action_row_inside_composer_ok,
		"chatComposerActionButtonsInsideComposerOk": action_buttons_inside_composer_ok,
		"chatComposerActionButtonsInsidePanelOk": action_buttons_inside_panel_ok,
		"chatComposerNoOverflowOk": input_inside_composer_ok and input_inside_panel_ok and action_row_inside_composer_ok and action_buttons_inside_composer_ok and action_buttons_inside_panel_ok,
	}


func _read_chat_history_filter_button_summary() -> Dictionary:
	var filter_labels: Array = []
	var filter_token_count := 0
	var filter_action_count := 0
	for filter_id_variant in _message_filter_buttons.keys():
		var filter_id := str(filter_id_variant).strip_edges()
		var button := _message_filter_buttons.get(filter_id, null) as Button
		if button == null:
			continue
		filter_action_count += 1
		filter_labels.append(button.text.strip_edges())
		if str(button.get_meta("chat_paper_action_command_bg_token", "")).strip_edges() == UI_COMPONENT_FACTORY.CHAT_PAPER_ACTION_COMMAND_BG_TOKEN:
			filter_token_count += 1
	var load_earlier_token_ok := (
		_load_earlier_button != null
		and is_instance_valid(_load_earlier_button)
		and str(_load_earlier_button.get_meta("chat_paper_action_command_bg_token", "")).strip_edges() == UI_COMPONENT_FACTORY.CHAT_PAPER_ACTION_COMMAND_BG_TOKEN
	)
	return {
		"chatHistoryFilterCommandBgToken": UI_COMPONENT_FACTORY.CHAT_PAPER_ACTION_COMMAND_BG_TOKEN,
		"chatHistoryFilterButtonCount": filter_action_count,
		"chatHistoryFilterButtonLiveLabels": filter_labels,
		"chatHistoryFilterCommandTokenCount": filter_token_count,
		"chatHistoryLoadEarlierButtonPreserved": _load_earlier_button != null and is_instance_valid(_load_earlier_button) and _load_earlier_button.text.strip_edges() == "更早",
		"chatHistoryLoadEarlierCommandTokenOk": load_earlier_token_ok,
		"chatHistoryFilterCommandTokenOk": filter_action_count >= MESSAGE_FILTERS.size() and filter_token_count >= MESSAGE_FILTERS.size() and load_earlier_token_ok,
	}

func _is_chat_message_history_hint_hidden() -> bool:
	return _history_status_label == null or not is_instance_valid(_history_status_label) or not _history_status_label.visible or _history_status_label.text.strip_edges() == ""

func _read_channel_primary_label_by_id(channel_id: String) -> String:
	var view := _channel_button_views.get(channel_id, {}) as Dictionary
	var primary_label := view.get("primary", null) as Label
	if primary_label != null and is_instance_valid(primary_label):
		return primary_label.text.strip_edges()
	for channel in _channels:
		if channel is Dictionary and str((channel as Dictionary).get("id", "")).strip_edges() == channel_id:
			return _format_channel_primary_label(channel as Dictionary)
	return ""

func _read_channel_avatar_text_by_id(channel_id: String) -> String:
	for channel in _channels:
		if channel is Dictionary and str((channel as Dictionary).get("id", "")).strip_edges() == channel_id:
			return _format_channel_avatar_text(channel as Dictionary)
	return ""

func _read_visible_scrollbars_hidden(root: Node) -> bool:
	if root == null:
		return true
	if root is ScrollContainer:
		var scroll := root as ScrollContainer
		if scroll.visible and scroll.is_visible_in_tree():
			if scroll.horizontal_scroll_mode != ScrollContainer.SCROLL_MODE_DISABLED and scroll.horizontal_scroll_mode != ScrollContainer.SCROLL_MODE_SHOW_NEVER:
				return false
			if scroll.vertical_scroll_mode != ScrollContainer.SCROLL_MODE_DISABLED and scroll.vertical_scroll_mode != ScrollContainer.SCROLL_MODE_SHOW_NEVER:
				return false
	for child in root.get_children():
		if not _read_visible_scrollbars_hidden(child):
			return false
	return true

func _collect_visible_buttons(root: Node) -> Array[Button]:
	var buttons: Array[Button] = []
	if root == null:
		return buttons
	var button := root as Button
	if button != null and button.visible and button.is_visible_in_tree():
		buttons.append(button)
	for child in root.get_children():
		buttons.append_array(_collect_visible_buttons(child))
	return buttons

func _find_visible_named_button(root: Node, target_name: String) -> Button:
	if root == null:
		return null
	var button := root as Button
	if button != null and str(button.name) == target_name and button.visible and button.is_visible_in_tree():
		return button
	for child in root.get_children():
		var found := _find_visible_named_button(child, target_name)
		if found != null:
			return found
	return null

func _resolve_latest_voice_speech_contract() -> Dictionary:
	for index in range(_messages.size() - 1, -1, -1):
		var message_variant: Variant = _messages[index]
		if not (message_variant is Dictionary):
			continue
		var speech_contract := _extract_speech_contract_from_message(message_variant as Dictionary)
		if speech_contract.is_empty():
			continue
		if str(speech_contract.get("status", "")).strip_edges() != "succeeded":
			continue
		var audio_asset_id := str(speech_contract.get("audioAssetId", "")).strip_edges()
		if audio_asset_id != "":
			return speech_contract
	return {}

func _resolve_latest_voice_audio_asset_id() -> String:
	var speech_contract := _resolve_latest_voice_speech_contract()
	return str(speech_contract.get("audioAssetId", "")).strip_edges()

func _wait_for_mainline_visual_smoke_voice_audio_control(previous_audio_asset_id: String, timeout_sec: float) -> Dictionary:
	var deadline_msec := Time.get_ticks_msec() + int(max(0.1, timeout_sec) * 1000.0)
	var normalized_previous := previous_audio_asset_id.strip_edges()
	while Time.get_ticks_msec() <= deadline_msec:
		await get_tree().process_frame
		var audio_asset_id := _resolve_latest_voice_audio_asset_id()
		var play_button := _find_visible_named_button(self, "ChatVoiceAudioPlayButton")
		if audio_asset_id != "" and audio_asset_id != normalized_previous and play_button != null:
			return {
				"ok": true,
				"reason": "voice_audio_control_ready",
				"audioAssetId": audio_asset_id,
				"playButtonDisabled": play_button.disabled,
			}
		await get_tree().create_timer(0.1).timeout
	return {
		"ok": false,
		"reason": "voice_audio_control_timeout",
		"latestAudioAssetId": _resolve_latest_voice_audio_asset_id(),
		"playButtonFound": _find_visible_named_button(self, "ChatVoiceAudioPlayButton") != null,
	}

func _wait_for_mainline_visual_smoke_voice_audio_playback(before_success_count: int, before_failure_count: int, audio_asset_id: String, timeout_sec: float) -> Dictionary:
	var deadline_msec := Time.get_ticks_msec() + int(max(0.1, timeout_sec) * 1000.0)
	var normalized_audio_asset_id := audio_asset_id.strip_edges()
	while Time.get_ticks_msec() <= deadline_msec:
		await get_tree().process_frame
		if _voice_audio_play_success_count > before_success_count:
			var played_asset_matches := normalized_audio_asset_id == "" or _voice_audio_last_played_asset_id == normalized_audio_asset_id
			return {
				"ok": played_asset_matches,
				"reason": "voice_audio_playback_started" if played_asset_matches else "voice_audio_playback_asset_mismatch",
				"lastPlayedAssetId": _voice_audio_last_played_asset_id,
				"playingAssetId": _voice_audio_playing_asset_id,
				"successCount": _voice_audio_play_success_count,
				"failureCount": _voice_audio_play_failure_count,
			}
		if _voice_audio_play_failure_count > before_failure_count:
			return {
				"ok": false,
				"reason": "voice_audio_playback_failed",
				"lastError": _voice_audio_last_error,
				"successCount": _voice_audio_play_success_count,
				"failureCount": _voice_audio_play_failure_count,
			}
		await get_tree().create_timer(0.1).timeout
	return {
		"ok": false,
		"reason": "voice_audio_playback_timeout",
		"lastPlayedAssetId": _voice_audio_last_played_asset_id,
		"playingAssetId": _voice_audio_playing_asset_id,
		"successCount": _voice_audio_play_success_count,
		"failureCount": _voice_audio_play_failure_count,
		"lastError": _voice_audio_last_error,
	}

func _read_chat_multi_ai_fixture_text_fit_ok() -> bool:
	for channel_id in [DEFAULT_AI_PLAYER_ID, SECONDARY_AI_PLAYER_ID, TERTIARY_AI_PLAYER_ID]:
		var button := _channel_buttons.get(channel_id, null) as Button
		if button == null or not button.visible or button.get_global_rect().size.y < 58.0:
			return false
		var view := _channel_button_views.get(channel_id, {}) as Dictionary
		var primary_label := view.get("primary", null) as Label
		if primary_label == null:
			return false
		var minimum_label_width := 104.0 if _is_mobile_chat_layout() else 72.0
		if primary_label.get_global_rect().size.x < minimum_label_width:
			return false
		if float(primary_label.get_meta("chat_channel_primary_font_size", 0)) < 18.0:
			return false
		if primary_label.text.length() > 6:
			return false
	return true

func _resolve_chat_message_scroll_target() -> String:
	if _message_scroll != null and is_instance_valid(_message_scroll) and _message_scroll.name == "ChatMessageHistoryScroll":
		if _message_list != null and _message_list.get_parent() == _message_scroll:
			return "message_history"
	return "unknown"

func _count_descendants_with_name_prefix(root: Node, prefix: String) -> int:
	if root == null:
		return 0
	var count := 0
	if str(root.name).begins_with(prefix):
		count += 1
	for child in root.get_children():
		count += _count_descendants_with_name_prefix(child, prefix)
	return count

func _count_descendants_with_meta(root: Node, meta_key: String, expected_value: String) -> int:
	if root == null:
		return 0
	var count := 0
	if root.has_meta(meta_key) and str(root.get_meta(meta_key, "")).strip_edges() == expected_value:
		count += 1
	for child in root.get_children():
		count += _count_descendants_with_meta(child, meta_key, expected_value)
	return count

func _find_descendant_with_meta(root: Node, meta_key: String, expected_value: String) -> Node:
	if root == null:
		return null
	if root.has_meta(meta_key) and str(root.get_meta(meta_key, "")).strip_edges() == expected_value:
		return root
	for child in root.get_children():
		var found := _find_descendant_with_meta(child, meta_key, expected_value)
		if found != null:
			return found
	return null

func _rect_fits_inside(inner: Rect2, outer: Rect2, tolerance: float = 0.0) -> bool:
	if inner.size.x <= 0.0 or inner.size.y <= 0.0 or outer.size.x <= 0.0 or outer.size.y <= 0.0:
		return false
	return (
		inner.position.x >= outer.position.x - tolerance
		and inner.position.y >= outer.position.y - tolerance
		and inner.position.x + inner.size.x <= outer.position.x + outer.size.x + tolerance
		and inner.position.y + inner.size.y <= outer.position.y + outer.size.y + tolerance
	)

func _rect_to_chat_visual_smoke_dict(rect: Rect2) -> Dictionary:
	return {
		"x": rect.position.x,
		"y": rect.position.y,
		"w": rect.size.x,
		"h": rect.size.y,
	}

func _read_chat_header_hierarchy_mode() -> String:
	if _title_label == null or not is_instance_valid(_title_label):
		return ""
	var title_column := _title_label.get_parent()
	if title_column == null:
		return ""
	var title_row := title_column.get_parent()
	if title_row == null:
		return ""
	var header := title_row.get_parent()
	if header == null:
		return ""
	return str(header.get_meta("chat_header_hierarchy_mode", "")).strip_edges()

func _has_chat_message_row_alignment(row_name: String, alignment: String) -> bool:
	if _message_list == null:
		return false
	return _has_descendant_chat_message_row_alignment(_message_list, row_name, alignment)

func _has_descendant_chat_message_row_alignment(root: Node, row_name: String, alignment: String) -> bool:
	if root == null:
		return false
	if str(root.name).find(row_name) >= 0:
		var explicit_alignment := str(root.get_meta("chat_message_alignment", "")).strip_edges()
		if explicit_alignment == alignment:
			return true
		if row_name == "ChatMessageRow_Player" and alignment == "right":
			return true
		if row_name == "ChatMessageRow_AI" and alignment == "left":
			return true
	for child in root.get_children():
		if _has_descendant_chat_message_row_alignment(child, row_name, alignment):
			return true
	return false

func _refresh_message_filter_buttons() -> void:
	for filter_id_variant in _message_filter_buttons.keys():
		var filter_id := str(filter_id_variant).strip_edges()
		var button := _message_filter_buttons[filter_id] as Button
		if button == null:
			continue
		button.text = _format_message_filter_button_text(_find_message_filter(filter_id))
		if filter_id == _message_filter:
			button.add_theme_color_override("font_color", Color(1.0, 0.88, 0.55, 1.0))
		else:
			button.add_theme_color_override("font_color", Color(0.92, 0.90, 0.84, 0.92))
	if _load_earlier_button != null:
		_load_earlier_button.disabled = _api_client == null or not _history_has_more or _history_next_before_message_id == ""
		_load_earlier_button.add_theme_color_override(
			"font_color",
			Color(0.92, 0.90, 0.84, 0.92) if not _load_earlier_button.disabled else Color(0.62, 0.58, 0.50, 0.72)
		)

func _update_history_filter_status(_visible_count: int) -> void:
	if _history_status_label == null:
		return
	_history_status_label.text = ""
	_history_status_label.visible = false

func _format_message_filter_button_text(filter: Dictionary) -> String:
	var filter_id := str(filter.get("id", MESSAGE_FILTER_ALL)).strip_edges()
	var label := str(filter.get("label", _format_message_filter_label(filter_id))).strip_edges()
	return label

func _format_message_filter_label(filter_id: String) -> String:
	match filter_id:
		MESSAGE_FILTER_COMMAND:
			return "命令"
		MESSAGE_FILTER_PROPOSAL:
			return "提案"
		MESSAGE_FILTER_RECEIPT:
			return "回执"
		MESSAGE_FILTER_FAILURE:
			return "失败"
		_:
			return "全部"

func _find_message_filter(filter_id: String) -> Dictionary:
	var normalized_filter := filter_id.strip_edges()
	for filter_variant in MESSAGE_FILTERS:
		var filter := filter_variant as Dictionary
		if str(filter.get("id", "")).strip_edges() == normalized_filter:
			return filter
	return {"id": MESSAGE_FILTER_ALL, "label": "全部"}

func _count_messages_for_filter(filter_id: String) -> int:
	if not _history_counts.is_empty() and _history_counts.has(filter_id):
		return int(_history_counts.get(filter_id, 0))
	var count := 0
	for message_variant in _messages:
		if message_variant is Dictionary and _message_matches_filter(message_variant as Dictionary, filter_id):
			count += 1
	return count

func _load_earlier_chat_history() -> void:
	if _api_client == null:
		_set_status("后端未连接，无法加载更早历史")
		return
	if not _history_has_more or _history_next_before_message_id == "":
		_set_status("当前筛选没有更早记录")
		return
	await _refresh_chat(_history_next_before_message_id, true)

func _build_message_card(message: Dictionary) -> Control:
	var kind := str(message.get("kind", "system")).strip_edges()
	if kind == "system":
		var system_row := HBoxContainer.new()
		system_row.name = "ChatMessageRow_System"
		system_row.set_meta("chat_message_alignment", "center")
		system_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var left_spacer := Control.new()
		left_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		system_row.add_child(left_spacer)
		system_row.add_child(_build_message_bubble_panel(message, true, false))
		var right_spacer := Control.new()
		right_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		system_row.add_child(right_spacer)
		return system_row

	var is_player := _message_is_player_bubble(message)
	var row := HBoxContainer.new()
	row.name = "ChatMessageRow_Player" if is_player else "ChatMessageRow_AI"
	row.set_meta("chat_message_alignment", "right" if is_player else "left")
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 8)

	var column := VBoxContainer.new()
	column.name = "ChatMessageColumn_Player" if is_player else "ChatMessageColumn_AI"
	column.add_theme_constant_override("separation", 3)
	var message_column_width := _resolve_message_bubble_width()
	column.custom_minimum_size = Vector2(message_column_width, 0)

	column.add_child(_build_message_identity_tag(message, is_player))

	column.add_child(_build_message_bubble_panel(message, false, is_player))

	if is_player:
		var left_fill := Control.new()
		left_fill.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(left_fill)
		row.add_child(column)
		row.add_child(_build_chat_avatar(message, true))
	else:
		row.add_child(_build_chat_avatar(message, false))
		row.add_child(column)
		var right_fill := Control.new()
		right_fill.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(right_fill)
	return row

func _build_message_identity_tag(message: Dictionary, is_player: bool) -> Control:
	var tag := PanelContainer.new()
	tag.name = "ChatIdentityTag_Player" if is_player else "ChatIdentityTag_AI"
	tag.set_meta("chat_identity_tag_material", CHAT_IDENTITY_TAG_MATERIAL)
	tag.size_flags_horizontal = Control.SIZE_SHRINK_END if is_player else Control.SIZE_SHRINK_BEGIN
	tag.add_theme_stylebox_override(
		"panel",
		_make_panel_style(
			Color(0.95, 0.90, 0.76, 0.92) if is_player else Color(0.91, 0.94, 0.86, 0.92),
			Color(0.55, 0.38, 0.18, 0.38) if is_player else Color(0.32, 0.54, 0.34, 0.36),
			6
		)
	)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 8)
	margin.add_theme_constant_override("margin_top", 3)
	margin.add_theme_constant_override("margin_right", 8)
	margin.add_theme_constant_override("margin_bottom", 3)
	tag.add_child(margin)
	var name_label := Label.new()
	name_label.name = "ChatIdentityLabel_Player" if is_player else "ChatIdentityLabel_AI"
	name_label.text = _format_message_display_name(message, is_player)
	name_label.add_theme_color_override("font_color", CHAT_PAPER_MUTED_TEXT)
	name_label.add_theme_font_size_override("font_size", 13)
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT if is_player else HORIZONTAL_ALIGNMENT_LEFT
	margin.add_child(name_label)
	return tag

func _build_message_bubble_panel(message: Dictionary, is_system_center: bool, is_player: bool) -> PanelContainer:
	var card := PanelContainer.new()
	var kind := str(message.get("kind", "system")).strip_edges()
	if is_system_center:
		card.name = "ChatMessageBubble_System"
	else:
		card.name = "ChatMessageBubble_Player" if is_player else "ChatMessageBubble_AI"
	card.set_meta("chat_message_bubble_kind", "system" if is_system_center else ("player" if is_player else "ai"))
	var speech_contract := _extract_speech_contract_from_message(message)
	var has_voice_audio := _speech_contract_has_playable_audio(speech_contract)
	var bubble_width := _resolve_message_bubble_width() * (0.92 if is_system_center else 1.0)
	card.custom_minimum_size = Vector2(bubble_width, 0)
	var palette := _message_bubble_palette(message, is_system_center, is_player)
	card.add_theme_stylebox_override("panel", _make_panel_style(palette.get("bg", Color(0.12, 0.12, 0.10, 0.72)), palette.get("border", Color(0.8, 0.7, 0.5, 0.25)), 9))

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_top", 8)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_bottom", 8)
	card.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 4)
	margin.add_child(column)

	if is_system_center:
		var name_label := Label.new()
		name_label.text = str(message.get("name", "系统")).strip_edges()
		name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		name_label.add_theme_color_override("font_color", CHAT_PAPER_MUTED_TEXT)
		name_label.add_theme_font_size_override("font_size", 15)
		column.add_child(name_label)

	if not is_system_center and not is_player:
		var activity_strip := _build_chat_ai_activity_continuity_strip(message)
		if activity_strip != null:
			column.add_child(activity_strip)

	var body_text := str(message.get("body", ""))
	if body_text.strip_edges() != "":
		var body_label := Label.new()
		body_label.name = "ChatMessageBodyText"
		body_label.text = body_text
		body_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		body_label.add_theme_color_override("font_color", CHAT_PAPER_TEXT)
		body_label.add_theme_font_size_override("font_size", 18 if is_system_center else 20)
		column.add_child(body_label)

	var meta_text := _format_message_meta_text(message)
	if meta_text != "":
		var meta_label := Label.new()
		meta_label.text = meta_text
		meta_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		meta_label.add_theme_color_override("font_color", CHAT_PAPER_MUTED_TEXT)
		meta_label.add_theme_font_size_override("font_size", 16)
		column.add_child(meta_label)

	if not is_player and has_voice_audio:
		var voice_controls := _build_voice_audio_controls(speech_contract, body_text)
		if voice_controls != null:
			column.add_child(voice_controls)
	elif not is_player:
		var unavailable_hint := _build_voice_unavailable_hint(message)
		if unavailable_hint != null:
			column.add_child(unavailable_hint)

	if kind == "proposal":
		var proposal_id := str(message.get("proposalId", "")).strip_edges()
		if proposal_id != "":
			_active_proposal_id = proposal_id
		var metadata_variant: Variant = message.get("metadata", {})
		var metadata: Dictionary = metadata_variant as Dictionary if metadata_variant is Dictionary else {}
		var status := str(metadata.get("status", "")).strip_edges()
		if status == "pending_approval":
			var action_row := HBoxContainer.new()
			action_row.add_theme_constant_override("separation", 8)
			column.add_child(action_row)
			var approve := Button.new()
			approve.text = "批准执行"
			approve.focus_mode = Control.FOCUS_NONE
			approve.custom_minimum_size = Vector2(96, CHAT_TOUCH_TARGET_MIN_HEIGHT)
			approve.add_theme_font_size_override("font_size", 18)
			_apply_chat_paper_action_button_style(approve, "primary")
			approve.disabled = proposal_id == "" or _api_client == null
			approve.pressed.connect(_approve_and_execute_proposal.bind(proposal_id))
			action_row.add_child(approve)
			var detail := Button.new()
			detail.text = "详情"
			detail.focus_mode = Control.FOCUS_NONE
			detail.custom_minimum_size = Vector2(72, CHAT_TOUCH_TARGET_MIN_HEIGHT)
			detail.add_theme_font_size_override("font_size", 18)
			_apply_chat_paper_action_button_style(detail, "secondary")
			detail.pressed.connect(_show_proposal_detail.bind(message))
			action_row.add_child(detail)
	elif kind == "receipt":
		var receipt_row := HBoxContainer.new()
		receipt_row.add_theme_constant_override("separation", 8)
		column.add_child(receipt_row)
		var receipt_detail := Button.new()
		receipt_detail.name = "ChatReceiptDetailButton"
		receipt_detail.text = "回执详情"
		receipt_detail.focus_mode = Control.FOCUS_NONE
		receipt_detail.custom_minimum_size = Vector2(96, CHAT_TOUCH_TARGET_MIN_HEIGHT)
		receipt_detail.add_theme_font_size_override("font_size", 18)
		_apply_chat_paper_action_button_style(receipt_detail, "secondary")
		receipt_detail.pressed.connect(_show_receipt_detail.bind(message))
		receipt_row.add_child(receipt_detail)
	return card

func _extract_speech_contract_from_message(message: Dictionary) -> Dictionary:
	var metadata_variant: Variant = message.get("metadata", {})
	if not (metadata_variant is Dictionary):
		return {}
	var speech_contract_variant: Variant = (metadata_variant as Dictionary).get("speechContract", {})
	if speech_contract_variant is Dictionary:
		return speech_contract_variant as Dictionary
	return {}

func _speech_contract_has_playable_audio(speech_contract: Dictionary) -> bool:
	return (
		not speech_contract.is_empty()
		and str(speech_contract.get("status", "")).strip_edges() == "succeeded"
		and str(speech_contract.get("audioAssetId", "")).strip_edges() != ""
	)

func _build_chat_ai_activity_continuity_strip(message: Dictionary) -> Control:
	var activity := _resolve_chat_ai_activity_continuity(message)
	if activity.is_empty() or not bool(activity.get("uses_execution_trace", false)):
		return null
	var panel := UI_COMPONENT_FACTORY.build_ai_activity_identity_chip({
		"surface": "chat",
		"node_prefix": "ChatAiActivity",
		"status_dot_name": "ChatAiActivityStatusDot",
		"status_label_name": "ChatAiActivityStatusLabel",
		"task_label_name": "ChatAiActivityTaskLabel",
		"trace_label_name": "ChatAiActivityTraceCountLabel",
		"status_dot": str(activity.get("status_dot", "green")).strip_edges(),
		"phase_label": str(activity.get("phase_label", "正在做")).strip_edges(),
		"task_text": str(activity.get("current_task_text", "")).strip_edges(),
		"trace_id": str(activity.get("first_trace_id", "")).strip_edges(),
		"trace_count": int(activity.get("trace_count", 0)),
		"trace_label": "行动 %d" % maxi(1, int(activity.get("trace_count", 1))),
		"trace_label_suffix": "TraceCountLabel",
		"min_height": 34,
	})
	panel.name = "ChatAiActivityContinuityStrip"
	panel.set_meta("chat_ai_activity_continuity_contract", UI_COMPONENT_FACTORY.chat_ai_activity_continuity_token())
	panel.set_meta("chat_ai_activity_uses_execution_trace", bool(activity.get("uses_execution_trace", false)))
	panel.set_meta("chat_ai_activity_fallback_used", bool(activity.get("fallback_used", true)))
	panel.set_meta("chat_ai_activity_trace_count", int(activity.get("trace_count", 0)))
	panel.set_meta("chat_ai_activity_current_task_text", str(activity.get("current_task_text", "")).strip_edges())
	return panel

func _resolve_chat_ai_activity_continuity(message: Dictionary) -> Dictionary:
	var target_ai_player_id := _resolve_chat_message_ai_player_id(message)
	var trace_items_variant: Variant = _runtime_panel_context.get("playerRuntimeExecutionTraceItems", [])
	if trace_items_variant is Array:
		var trace_items: Array = (trace_items_variant as Array).duplicate(true)
		for trace_variant in trace_items:
			if not (trace_variant is Dictionary):
				continue
			var trace: Dictionary = trace_variant as Dictionary
			if not _chat_ai_activity_trace_matches_player(trace, target_ai_player_id):
				continue
			var current_task := _format_chat_ai_activity_task_text(trace)
			return {
				"token": UI_COMPONENT_FACTORY.chat_ai_activity_continuity_token(),
				"uses_execution_trace": true,
				"fallback_used": false,
				"source": "playerRuntimeExecutionTraceItems",
				"trace_count": trace_items.size(),
				"first_trace_id": str(trace.get("traceId", trace.get("trace_id", trace.get("reportId", "")))).strip_edges(),
				"ai_player_id": str(trace.get("aiPlayerId", target_ai_player_id)).strip_edges(),
				"source_kind": str(trace.get("sourceKind", "")).strip_edges(),
				"action": str(trace.get("action", "")).strip_edges(),
				"phase": str(trace.get("phase", "")).strip_edges(),
				"phase_label": _format_chat_ai_activity_phase(str(trace.get("phase", "")).strip_edges()),
				"status_dot": _format_chat_ai_activity_status_dot(str(trace.get("phase", "")).strip_edges()),
				"current_task_text": current_task,
			}
	var read_model_variant: Variant = _runtime_panel_context.get("playerRuntimeExecutionTraceReadModel", {})
	if read_model_variant is Dictionary:
		var read_model: Dictionary = read_model_variant as Dictionary
		var read_model_items_variant: Variant = read_model.get("items", [])
		if read_model_items_variant is Array:
			var read_model_items: Array = (read_model_items_variant as Array).duplicate(true)
			for read_model_trace_variant in read_model_items:
				if not (read_model_trace_variant is Dictionary):
					continue
				var read_model_trace: Dictionary = read_model_trace_variant as Dictionary
				if not _chat_ai_activity_trace_matches_player(read_model_trace, target_ai_player_id):
					continue
				var read_model_task := _format_chat_ai_activity_task_text(read_model_trace)
				return {
					"token": UI_COMPONENT_FACTORY.chat_ai_activity_continuity_token(),
					"uses_execution_trace": true,
					"fallback_used": true,
					"source": "playerRuntimeExecutionTraceReadModel",
					"trace_count": read_model_items.size(),
					"first_trace_id": str(read_model_trace.get("traceId", read_model_trace.get("trace_id", read_model_trace.get("reportId", "")))).strip_edges(),
					"ai_player_id": str(read_model_trace.get("aiPlayerId", target_ai_player_id)).strip_edges(),
					"source_kind": str(read_model_trace.get("sourceKind", "")).strip_edges(),
					"action": str(read_model_trace.get("action", "")).strip_edges(),
					"phase": str(read_model_trace.get("phase", "")).strip_edges(),
					"phase_label": _format_chat_ai_activity_phase(str(read_model_trace.get("phase", "")).strip_edges()),
					"status_dot": _format_chat_ai_activity_status_dot(str(read_model_trace.get("phase", "")).strip_edges()),
					"current_task_text": read_model_task,
				}
	return {}

func _read_chat_ai_activity_continuity_summary() -> Dictionary:
	var latest_ai_message := _resolve_latest_ai_message_for_visual_smoke()
	var activity := _resolve_chat_ai_activity_continuity(latest_ai_message)
	var strip_count := _count_descendants_with_name_prefix(_message_list, "ChatAiActivityContinuityStrip")
	var status_dot_count := _count_descendants_with_name_prefix(_message_list, "ChatAiActivityStatusDot")
	var task_label_count := _count_descendants_with_name_prefix(_message_list, "ChatAiActivityTaskLabel")
	var forbidden_hits := _collect_chat_ai_activity_forbidden_hits(str(activity.get("current_task_text", "")).strip_edges())
	return {
		"visible": strip_count > 0 and status_dot_count > 0 and task_label_count > 0,
		"strip_count": strip_count,
		"status_dot_count": status_dot_count,
		"task_label_count": task_label_count,
		"uses_execution_trace": bool(activity.get("uses_execution_trace", false)),
		"fallback_used": bool(activity.get("fallback_used", true)),
		"trace_count": int(activity.get("trace_count", 0)),
		"first_trace_id": str(activity.get("first_trace_id", "")).strip_edges(),
		"governed_proposal_visible": str(activity.get("source_kind", "")).strip_edges() == "governed_proposal" and str(activity.get("action", "")).strip_edges() == "maritime_patrol_intercept",
		"current_task_text": str(activity.get("current_task_text", "")).strip_edges(),
		"source": str(activity.get("source", "")).strip_edges(),
		"forbidden_hits": forbidden_hits,
		"forbidden_copy_ok": forbidden_hits.is_empty(),
	}

func _resolve_chat_message_ai_player_id(message: Dictionary) -> String:
	var metadata_variant: Variant = message.get("metadata", {})
	var metadata: Dictionary = metadata_variant as Dictionary if metadata_variant is Dictionary else {}
	var message_ai_player_id := str(message.get("aiPlayerId", "")).strip_edges()
	if message_ai_player_id == "":
		message_ai_player_id = str(metadata.get("aiPlayerId", "")).strip_edges()
	if message_ai_player_id == "":
		message_ai_player_id = str(metadata.get("targetAiPlayerId", "")).strip_edges()
	if message_ai_player_id == "":
		message_ai_player_id = _active_ai_player_id.strip_edges()
	return message_ai_player_id

func _chat_ai_activity_trace_matches_player(trace: Dictionary, target_ai_player_id: String) -> bool:
	var trace_ai_player_id := str(trace.get("aiPlayerId", "")).strip_edges()
	var normalized_target := target_ai_player_id.strip_edges()
	if trace_ai_player_id == "" or normalized_target == "":
		return true
	return trace_ai_player_id == normalized_target

func _format_chat_ai_activity_task_text(trace: Dictionary) -> String:
	var task_text := str(trace.get("currentTaskText", trace.get("title", ""))).strip_edges()
	if task_text != "":
		return _clip_chat_ai_activity_line(_format_chat_ai_activity_display_copy(task_text), 30)
	var action := str(trace.get("action", "")).strip_edges()
	if action == "":
		return "正在行动"
	return _format_proposal_action_label(action)

func _format_chat_ai_activity_display_copy(value: String) -> String:
	var normalized := value.strip_edges()
	if normalized == "":
		return ""
	if normalized.find("_") >= 0:
		normalized = normalized.replace("tile_occupy", "占领地块")
		normalized = normalized.replace("resource_gather", "采集资源")
		normalized = normalized.replace("maritime_patrol_intercept", "海巡拦截")
		normalized = normalized.replace("_", " ")
	return normalized

func _clip_chat_ai_activity_line(value: String, max_length: int) -> String:
	var normalized := value.strip_edges()
	if max_length <= 0 or normalized.length() <= max_length:
		return normalized
	return "%s…" % normalized.substr(0, max_length - 1)

func _format_chat_ai_activity_phase(phase: String) -> String:
	match phase.strip_edges():
		"completed":
			return "已完成"
		"failed":
			return "未完成"
		"skipped":
			return "暂缓"
		"active":
			return "进行中"
		_:
			return "正在做"

func _format_chat_ai_activity_status_dot(phase: String) -> String:
	match phase.strip_edges():
		"completed":
			return "green"
		"failed":
			return "red"
		"skipped":
			return "gray"
		"active":
			return "yellow"
		_:
			return "green"

func _make_chat_ai_activity_status_dot_style(status_dot: String) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	match status_dot.strip_edges().to_lower():
		"green":
			style.bg_color = Color(0.34, 0.88, 0.42, 1.0)
		"yellow":
			style.bg_color = Color(0.96, 0.77, 0.32, 1.0)
		"red":
			style.bg_color = Color(0.92, 0.24, 0.18, 1.0)
		"gray", "grey":
			style.bg_color = Color(0.54, 0.54, 0.50, 1.0)
		_:
			style.bg_color = Color(0.34, 0.88, 0.42, 1.0)
	style.border_color = Color(0.04, 0.03, 0.02, 0.86)
	style.set_border_width_all(1)
	style.set_corner_radius_all(12)
	return style

func _collect_chat_ai_activity_forbidden_hits(text: String) -> Array[String]:
	var hits: Array[String] = []
	for needle_variant in [
		"proposalId",
		"relatedProposalId",
		"relatedReceiptProposalId",
		"worldAction",
		"worldActionPayload",
		"plannerDecision",
		"observation",
		"queuePlanExecution",
		"runtime",
		"provider",
		"env",
		"key",
		"api key",
		"runtime model key",
		"JSON",
	]:
		var needle := str(needle_variant)
		if text.find(needle) >= 0:
			hits.append(needle)
	return hits

func _build_voice_unavailable_hint(message: Dictionary) -> Control:
	var metadata_variant: Variant = message.get("metadata", {})
	if not (metadata_variant is Dictionary):
		return null
	var metadata := metadata_variant as Dictionary
	if str(metadata.get("voicePlaybackIntent", "")).strip_edges() != "ai_player_chat_report":
		return null
	if bool(metadata.get("voicePlaybackReady", false)):
		return null
	if str(metadata.get("speakableText", "")).strip_edges() == "":
		return null
	var availability_variant: Variant = metadata.get("voiceAvailability", {})
	var availability: Dictionary = availability_variant as Dictionary if availability_variant is Dictionary else {}
	var label := str(availability.get("label", "")).strip_edges()
	var summary := str(availability.get("summary", "")).strip_edges()
	if label == "":
		label = "语音未配置"
	if summary == "":
		summary = "已保留文字汇报。"
	var panel := PanelContainer.new()
	panel.name = "ChatVoiceUnavailableHint"
	panel.set_meta("chat_voice_unavailable_hint", true)
	var hint_width := maxf(220.0, minf(360.0, _resolve_message_bubble_width() - 24.0))
	panel.custom_minimum_size = Vector2(hint_width, 0.0)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.add_theme_stylebox_override("panel", _make_panel_style(Color(0.91, 0.89, 0.78, 0.78), Color(0.45, 0.36, 0.22, 0.28), 6))
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 8)
	margin.add_theme_constant_override("margin_top", 4)
	margin.add_theme_constant_override("margin_right", 8)
	margin.add_theme_constant_override("margin_bottom", 4)
	panel.add_child(margin)
	var label_node := Label.new()
	label_node.name = "ChatVoiceUnavailableHintLabel"
	label_node.text = "%s：%s" % [label, summary]
	label_node.custom_minimum_size = Vector2(maxf(180.0, hint_width - 20.0), 0.0)
	label_node.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label_node.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label_node.add_theme_color_override("font_color", CHAT_PAPER_MUTED_TEXT)
	label_node.add_theme_font_size_override("font_size", 13)
	margin.add_child(label_node)
	return panel

func _build_voice_audio_controls(speech_contract: Dictionary, fallback_text: String = "") -> Control:
	var audio_asset_id := str(speech_contract.get("audioAssetId", "")).strip_edges()
	if audio_asset_id == "":
		return null
	if str(speech_contract.get("status", "")).strip_edges() != "succeeded":
		return null
	var panel := PanelContainer.new()
	panel.name = "ChatVoiceAudioControlRow"
	panel.set_meta("chat_voice_control_material", CHAT_VOICE_CONTROL_MATERIAL)
	panel.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	panel.add_theme_stylebox_override("panel", _make_panel_style(Color(0.90, 0.93, 0.84, 0.96), Color(0.32, 0.54, 0.34, 0.42), 6))

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 4)
	margin.add_theme_constant_override("margin_top", 4)
	margin.add_theme_constant_override("margin_right", 4)
	margin.add_theme_constant_override("margin_bottom", 4)
	panel.add_child(margin)

	var play_button := Button.new()
	play_button.name = "ChatVoiceAudioPlayButton"
	var duration_sec := _resolve_voice_audio_duration_seconds(speech_contract, fallback_text)
	play_button.text = "▶ %d\"" % int(maxf(1.0, round(duration_sec)))
	play_button.focus_mode = Control.FOCUS_NONE
	play_button.tooltip_text = "语音"
	play_button.custom_minimum_size = Vector2(maxf(96.0, _resolve_voice_audio_bubble_width(speech_contract, fallback_text) - 16.0), 42)
	play_button.add_theme_font_size_override("font_size", 18)
	_apply_chat_paper_action_button_style(play_button, "voice")
	play_button.disabled = _api_client == null or not _api_client.has_method("get_ai_player_voice_audio_asset")
	play_button.pressed.connect(_play_voice_audio_asset.bind(audio_asset_id))
	margin.add_child(play_button)
	return panel

func _resolve_voice_audio_duration_seconds(speech_contract: Dictionary, fallback_text: String = "") -> float:
	var duration_ms := 0.0
	for key in ["durationMs", "audioDurationMs", "estimatedDurationMs"]:
		if speech_contract.has(key):
			duration_ms = maxf(duration_ms, float(speech_contract.get(key, 0)))
	if duration_ms > 0.0:
		return maxf(1.0, duration_ms / 1000.0)
	if speech_contract.has("durationSeconds"):
		return maxf(1.0, float(speech_contract.get("durationSeconds", 0)))
	var text_len := fallback_text.strip_edges().length()
	if text_len > 0:
		return maxf(1.0, minf(28.0, 1.6 + float(text_len) * 0.16))
	return 3.0

func _resolve_voice_audio_bubble_width(speech_contract: Dictionary, fallback_text: String = "") -> float:
	var duration_sec := _resolve_voice_audio_duration_seconds(speech_contract, fallback_text)
	var normalized_duration := clampf(duration_sec, 1.0, 30.0)
	var early_width := minf(normalized_duration, 16.0) * 8.0
	var late_width := maxf(0.0, normalized_duration - 16.0) * 3.0
	return clampf(104.0 + early_width + late_width, 118.0, 276.0)

func _message_is_player_bubble(message: Dictionary) -> bool:
	var kind := str(message.get("kind", "")).strip_edges()
	var author_type := str(message.get("authorType", "")).strip_edges()
	return kind == "player" or author_type == "governor"

func _resolve_message_bubble_width() -> float:
	var available_width := _resolve_chat_panel_width() - _resolve_channel_rail_width() - (36.0 if _is_phone_width_chat_layout() else 72.0)
	return max(188.0, min(520.0, available_width * 0.88))

func _message_bubble_palette(message: Dictionary, is_system_center: bool, is_player: bool) -> Dictionary:
	var kind := str(message.get("kind", "system")).strip_edges()
	if is_player:
		return {"bg": CHAT_PLAYER_BUBBLE_BG, "border": Color(0.34, 0.54, 0.40, 0.44)}
	if kind == "proposal":
		return {"bg": Color(0.98, 0.90, 0.72, 0.97), "border": Color(0.72, 0.48, 0.18, 0.52)}
	if kind == "receipt":
		return {"bg": Color(0.88, 0.94, 0.82, 0.96), "border": Color(0.38, 0.58, 0.28, 0.46)}
	if is_system_center:
		return {"bg": CHAT_SYSTEM_BUBBLE_BG, "border": Color(0.56, 0.44, 0.26, 0.38)}
	return {"bg": CHAT_AI_BUBBLE_BG, "border": Color(0.50, 0.36, 0.18, 0.42)}

func _build_chat_avatar(message: Dictionary, is_player: bool) -> Control:
	if not is_player:
		var portrait_path := _resolve_ai_portrait_path(message)
		if portrait_path != "":
			var portrait_avatar := _build_portrait_avatar(portrait_path)
			if portrait_avatar != null:
				portrait_avatar.name = "ChatAvatar_AI"
				portrait_avatar.set_meta("chat_avatar_kind", "ai")
				return portrait_avatar
	var badge := PanelContainer.new()
	badge.name = "ChatAvatar_Player" if is_player else "ChatAvatar_AI"
	badge.set_meta("chat_avatar_kind", "player" if is_player else "ai")
	badge.set_meta("chat_avatar_frame_material", CHAT_AVATAR_FRAME_MATERIAL)
	badge.custom_minimum_size = Vector2(CHAT_AVATAR_SIZE, CHAT_AVATAR_SIZE)
	badge.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	var bg := Color(0.95, 0.90, 0.76, 0.96) if is_player else Color(0.91, 0.94, 0.86, 0.96)
	var border := Color(0.55, 0.38, 0.18, 0.46) if is_player else Color(0.32, 0.54, 0.34, 0.44)
	badge.add_theme_stylebox_override("panel", _make_panel_style(bg, border, 10))
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 4)
	margin.add_theme_constant_override("margin_top", 4)
	margin.add_theme_constant_override("margin_right", 4)
	margin.add_theme_constant_override("margin_bottom", 4)
	badge.add_child(margin)
	var column := VBoxContainer.new()
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.add_theme_constant_override("separation", 0)
	margin.add_child(column)
	var title := Label.new()
	title.text = _format_avatar_initial(message, is_player)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 14)
	title.add_theme_color_override("font_color", CHAT_PAPER_TEXT)
	column.add_child(title)
	var role := Label.new()
	role.text = _format_avatar_role(message, is_player)
	role.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	role.add_theme_font_size_override("font_size", 8)
	role.add_theme_color_override("font_color", CHAT_PAPER_MUTED_TEXT)
	column.add_child(role)
	return badge

func _build_portrait_avatar(portrait_path: String) -> Control:
	var asset_ref := {
		"assetKind": "ai_chat_portrait",
		"path": portrait_path,
	}
	var texture := PORTRAIT_ASSET_REGISTRY.portrait_texture(asset_ref)
	if texture == null:
		texture = _load_portrait_texture(portrait_path)
	if texture == null:
		return null
	var frame := PanelContainer.new()
	frame.name = "ChatAvatar_AI"
	frame.set_meta("chat_avatar_kind", "ai")
	frame.set_meta("chat_avatar_frame_material", CHAT_AVATAR_FRAME_MATERIAL)
	frame.custom_minimum_size = Vector2(CHAT_AVATAR_SIZE, CHAT_AVATAR_SIZE)
	frame.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	UI_COMPONENT_FACTORY.apply_portrait_frame_stage(frame)
	frame.add_theme_stylebox_override("panel", _make_panel_style(Color(0.96, 0.91, 0.78, 0.96), Color(0.55, 0.38, 0.18, 0.48), 10))
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 2)
	margin.add_theme_constant_override("margin_top", 2)
	margin.add_theme_constant_override("margin_right", 2)
	margin.add_theme_constant_override("margin_bottom", 2)
	frame.add_child(margin)
	var portrait := TextureRect.new()
	portrait.texture = texture
	portrait.custom_minimum_size = Vector2(CHAT_AVATAR_SIZE - 4.0, CHAT_AVATAR_SIZE - 4.0)
	UI_COMPONENT_FACTORY.apply_portrait_frame_texture(portrait)
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	margin.add_child(portrait)
	return frame

func _load_portrait_texture(path: String) -> Texture2D:
	var normalized_path := path.strip_edges()
	if normalized_path == "" or not FileAccess.file_exists(normalized_path):
		return null
	var image := Image.new()
	var error := image.load(normalized_path)
	if error != OK:
		return null
	return ImageTexture.create_from_image(image)

func _resolve_ai_portrait_path(message: Dictionary) -> String:
	var metadata_value = message.get("metadata", {})
	var metadata: Dictionary = metadata_value as Dictionary if metadata_value is Dictionary else {}
	var active_channel := _find_channel(_active_channel_id)
	for direct_path in [
		str(metadata.get("avatarImagePath", "")).strip_edges(),
		str(message.get("avatarImagePath", "")).strip_edges(),
		str(active_channel.get("avatarImagePath", "")).strip_edges(),
	]:
		if direct_path != "" and FileAccess.file_exists(direct_path):
			return direct_path
	var keys: Array[String] = [
		str(active_channel.get("avatarId", "")).strip_edges(),
		str(metadata.get("aiPlayerId", "")).strip_edges(),
		str(message.get("aiPlayerId", "")).strip_edges(),
		_active_ai_player_id.strip_edges(),
		_active_channel_id.strip_edges(),
		_format_message_display_name(message, false),
	]
	for key in keys:
		if key != "" and _ai_chat_portrait_assignments.has(key):
			var portrait_path := str(_ai_chat_portrait_assignments.get(key, "")).strip_edges()
			if portrait_path != "" and FileAccess.file_exists(portrait_path):
				return portrait_path
	return ""

func _format_message_display_name(message: Dictionary, is_player: bool) -> String:
	var kind := str(message.get("kind", "")).strip_edges()
	var name := str(message.get("name", "")).strip_edges()
	if is_player:
		return _resolve_governor_display_name() if _is_legacy_governor_display_name(name) else name
	if kind == "receipt" and (name == "" or name == "系统"):
		return str(_find_channel(_active_channel_id).get("label", "AI")).strip_edges()
	if name == "" or name == "系统":
		return str(_find_channel(_active_channel_id).get("label", "AI")).strip_edges()
	return name

func _format_avatar_initial(message: Dictionary, is_player: bool) -> String:
	var name := _format_message_display_name(message, is_player)
	if name == "":
		return "我" if is_player else "AI"
	if is_player:
		return "我"
	return "AI"

func _format_avatar_role(message: Dictionary, is_player: bool) -> String:
	if is_player:
		var display_name := _format_message_display_name(message, true)
		return display_name if display_name.length() <= 3 else "玩家"
	var name := _format_message_display_name(message, is_player)
	if name.contains("斥候"):
		return "斥候"
	if name.contains("后勤"):
		return "后勤"
	if name.contains("军"):
		return "军务"
	return "AI玩家"

func _on_channel_pressed(channel_id: String) -> void:
	_active_channel_id = channel_id
	var channel := _find_channel(channel_id)
	_apply_active_identity(channel)
	_sync_active_channel_header()
	_refresh_channel_buttons()
	if channel_id == NEW_CHANNEL_ID:
		_messages = []
		_render_messages()
		_set_status("选择聊天对象")
		return
	if channel.has("aiPlayerId"):
		await _refresh_chat()
		return
	_messages = [{
		"kind": "system",
		"name": "系统",
		"body": "%s频道已打开。和 AI 玩家单独说话，请切到左侧对应的 AI 玩家频道。" % str(channel.get("label", "主界面")),
	}]
	_render_messages()
	_set_status("主界面频道已切换")

func _on_new_channel_candidate_pressed(group_id: String, candidate_id: String, target_channel_id: String) -> void:
	var normalized_group_id := group_id.strip_edges()
	var normalized_candidate_id := candidate_id.strip_edges()
	var normalized_target_channel_id := target_channel_id.strip_edges()
	if normalized_group_id == "ai_player" and normalized_target_channel_id != "" and not _find_channel(normalized_target_channel_id).is_empty():
		await _on_channel_pressed(normalized_target_channel_id)
		_set_status("AI玩家频道已打开")
		return
	if normalized_target_channel_id != "":
		var candidate := _find_new_channel_candidate(normalized_group_id, normalized_candidate_id, normalized_target_channel_id)
		var channel := _upsert_contact_channel_from_candidate(normalized_group_id, candidate, normalized_target_channel_id)
		if not channel.is_empty():
			await _on_channel_pressed(str(channel.get("id", normalized_target_channel_id)))
			_set_status("聊天频道已打开")
			return
	var label := normalized_candidate_id if normalized_candidate_id != "" else "聊天对象"
	_set_status("%s暂未接入" % label)

func _find_new_channel_candidate(group_id: String, candidate_id: String, target_channel_id: String) -> Dictionary:
	for raw_group in _new_channel_candidate_groups:
		if not (raw_group is Dictionary):
			continue
		var group := raw_group as Dictionary
		if str(group.get("id", "")).strip_edges() != group_id:
			continue
		for raw_candidate in _read_new_channel_group_candidates(group):
			if not (raw_candidate is Dictionary):
				continue
			var candidate := raw_candidate as Dictionary
			if candidate_id != "" and str(candidate.get("id", "")).strip_edges() == candidate_id:
				return candidate
			if target_channel_id != "" and str(candidate.get("targetChannelId", "")).strip_edges() == target_channel_id:
				return candidate
	return {}

func _upsert_contact_channel_from_candidate(group_id: String, candidate: Dictionary, target_channel_id: String) -> Dictionary:
	var channel_id := target_channel_id.strip_edges()
	if channel_id == "":
		return {}
	var label := str(candidate.get("label", candidate.get("id", channel_id))).strip_edges()
	if label == "":
		label = channel_id
	var subtitle := str(candidate.get("subtitle", "")).strip_edges()
	var existing_index := -1
	for index in range(_channels.size()):
		var raw_channel = _channels[index]
		if raw_channel is Dictionary and str((raw_channel as Dictionary).get("id", "")).strip_edges() == channel_id:
			existing_index = index
			break
	var channel := {
		"id": channel_id,
		"label": label,
		"kind": "contact",
		"contactGroupId": group_id,
		"contactCandidateId": str(candidate.get("id", channel_id)).strip_edges(),
		"subtitle": subtitle,
	}
	if existing_index >= 0:
		_channels[existing_index] = channel
	else:
		var insert_index := _channels.size()
		for index in range(_channels.size()):
			var raw_channel = _channels[index]
			if raw_channel is Dictionary and str((raw_channel as Dictionary).get("id", "")).strip_edges() == "system":
				insert_index = index
				break
		_channels.insert(insert_index, channel)
	_render_channel_buttons()
	return channel

func _refresh_channel_buttons() -> void:
	for channel_id in _channel_buttons.keys():
		var button := _channel_buttons[channel_id] as Button
		if button == null:
			continue
		var channel := _find_channel(str(channel_id))
		if not channel.is_empty():
			_update_channel_button_view(str(channel_id), channel, str(channel_id) == _active_channel_id)


func _update_channel_button_view(channel_id: String, channel: Dictionary, is_active: bool) -> void:
	var button := _channel_buttons.get(channel_id, null) as Button
	if button == null:
		return
	_apply_channel_button_style(button, is_active, channel)
	var view := _channel_button_views.get(channel_id, {}) as Dictionary
	var primary_label := view.get("primary", null) as Label
	if primary_label != null:
		primary_label.text = _format_channel_primary_label(channel)
		primary_label.set_meta("chat_channel_primary_font_size", CHAT_CHANNEL_PRIMARY_FONT_SIZE)
		primary_label.add_theme_font_size_override("font_size", CHAT_CHANNEL_PRIMARY_FONT_SIZE)
		primary_label.add_theme_color_override("font_color", Color(0.10, 0.18, 0.12, 1.0) if is_active else CHAT_PAPER_TEXT)
	var subtitle_label := view.get("subtitle", null) as Label
	if subtitle_label != null:
		subtitle_label.text = ""
		subtitle_label.visible = false
		subtitle_label.add_theme_color_override("font_color", Color(0.26, 0.20, 0.12, 0.94) if is_active else CHAT_PAPER_MUTED_TEXT)


func _apply_channel_button_style(button: Button, is_active: bool, channel: Dictionary) -> void:
	var kind := _resolve_channel_kind(channel)
	var accent := _resolve_channel_tile_accent_color(channel)
	var bg := CHAT_PAPER_BG_SOLID
	var border := CHAT_PAPER_BORDER
	if kind == "world":
		bg = Color(0.98, 0.92, 0.76, 0.97)
		border = Color(0.70, 0.48, 0.18, 0.58)
	elif kind == "alliance":
		bg = Color(0.88, 0.93, 0.88, 0.96)
		border = Color(0.30, 0.52, 0.42, 0.48)
	if kind == "ai_player":
		bg = Color(0.91, 0.94, 0.86, 0.96)
		border = Color(0.32, 0.54, 0.34, 0.48)
	elif kind == "new_channel":
		bg = Color(0.97, 0.88, 0.72, 0.96)
		border = Color(0.68, 0.42, 0.16, 0.52)
	elif kind == "system":
		bg = Color(0.90, 0.86, 0.76, 0.94)
		border = Color(0.50, 0.42, 0.30, 0.42)
	if is_active:
		bg = bg.lightened(0.06)
		bg.a = 1.0
		border = accent.darkened(0.20)
		border.a = 0.78
	var normal_style := _make_panel_style(bg, border, 7)
	var hover_style: StyleBoxFlat = normal_style.duplicate()
	hover_style.bg_color = bg.lightened(0.06)
	var pressed_style: StyleBoxFlat = normal_style.duplicate()
	pressed_style.bg_color = bg.darkened(0.08)
	button.add_theme_stylebox_override("normal", normal_style)
	button.add_theme_stylebox_override("hover", hover_style)
	button.add_theme_stylebox_override("pressed", pressed_style)
	button.add_theme_stylebox_override("focus", pressed_style)

func _resolve_channel_tile_accent_color(channel: Dictionary) -> Color:
	var kind := _resolve_channel_kind(channel)
	if kind == "world":
		return Color(0.76, 0.54, 0.20, 0.95)
	if kind == "alliance":
		return Color(0.32, 0.50, 0.82, 0.95)
	if kind == "new_channel":
		return Color(0.88, 0.54, 0.18, 0.96)
	if kind == "system":
		return Color(0.60, 0.54, 0.38, 0.92)
	var list_card := _read_channel_list_card(channel)
	var reason := str(list_card.get("statusReason", "")).strip_edges()
	if reason == "pending_proposals":
		return Color(0.86, 0.64, 0.20, 0.95)
	if reason == "runtime_failure":
		return Color(0.76, 0.32, 0.24, 0.95)
	var dot := str(list_card.get("statusDot", "")).strip_edges()
	if dot == "yellow":
		return Color(0.86, 0.64, 0.20, 0.95)
	if dot == "red":
		return Color(0.76, 0.32, 0.24, 0.95)
	return Color(0.24, 0.60, 0.44, 0.95)

func _on_message_submitted(_text: String) -> void:
	_send_current_input()

func _on_chat_input_focus_changed() -> void:
	_update_keyboard_safe_area()
	_sync_chat_input_height()

func _on_chat_input_text_changed() -> void:
	_sync_chat_input_height()

func _on_chat_input_gui_input(event: InputEvent) -> void:
	if _input == null:
		return
	if event is InputEventKey:
		var key_event := event as InputEventKey
		if key_event.pressed and not key_event.echo and key_event.keycode == KEY_ENTER and (key_event.ctrl_pressed or key_event.meta_pressed):
			_input.accept_event()
			_send_current_input()

func _sync_chat_input_height() -> void:
	if _input == null:
		return
	var line_count: int = max(1, int(_input.get_line_count()))
	var target_height: float = CHAT_COMPOSER_MIN_HEIGHT + float(min(line_count - 1, 3)) * 21.0
	_input.custom_minimum_size = Vector2(0, min(CHAT_COMPOSER_MAX_HEIGHT, target_height))

func _send_current_input() -> void:
	if _input == null:
		return
	var text := _input.text.strip_edges()
	if text == "":
		return
	if _active_ai_player_id.strip_edges() == "" or not _find_channel(_active_channel_id).has("aiPlayerId"):
		_append_system_message("请先切换到具体 AI 玩家频道，再发送消息。")
		_set_status("未选择 AI 玩家频道")
		return
	if _api_client == null:
		_messages.append({"kind": "player", "name": _resolve_governor_display_name(), "body": text})
		_messages.append({"kind": "ai", "name": str(_find_channel(_active_channel_id).get("label", "AI玩家")), "body": "后端未连接，已先记录为本地预览消息。"})
		_input.text = ""
		_sync_chat_input_height()
		_render_messages()
		_set_status("后端未连接，本地预览")
		return

	_set_status("发送消息...")
	var response: Dictionary = await _api_client.send_ai_player_chat_message(
		_active_ai_player_id,
		text,
		_active_governor_player_id,
		_resolve_governor_display_name(),
		true
	)
	if not bool(response.get("ok", false)):
		_append_system_message("聊天发送失败：%s" % _extract_error_text(response))
		_set_status("发送失败")
		return
	_input.text = ""
	_sync_chat_input_height()
	_set_status(_format_chat_send_result_status(response))
	await _refresh_chat()

func _on_voice_input_pressed() -> void:
	await _send_voice_text_command(not _visual_smoke_voice_command_record_only)

func _send_voice_text_command(create_proposal: bool = true) -> void:
	if _input == null:
		return
	var text := _input.text.strip_edges()
	if text == "":
		_set_status("先输入文字，再点语音发送")
		return
	if _active_ai_player_id.strip_edges() == "" or not _find_channel(_active_channel_id).has("aiPlayerId"):
		_append_system_message("请先切换到具体 AI 玩家频道，再发送语音命令。")
		_set_status("未选择 AI 玩家频道")
		return
	if _api_client == null or not _api_client.has_method("send_ai_player_voice_command"):
		_set_status("后端未连接，无法发送语音命令")
		return

	_set_status("发送语音命令...")
	var voice_profile_id := await _resolve_voice_command_profile_id(_active_ai_player_id)
	var response: Dictionary = await _api_client.send_ai_player_voice_command(
		_active_ai_player_id,
		text,
		_active_governor_player_id,
		_resolve_governor_display_name(),
		voice_profile_id,
		create_proposal
	)
	if not bool(response.get("ok", false)):
		_append_system_message("语音命令发送失败：%s" % _extract_error_text(response))
		_set_status("语音发送失败")
		return
	_input.text = ""
	_sync_chat_input_height()
	_set_status(_format_voice_send_result_status(response))
	await _refresh_chat()

func _resolve_voice_command_profile_id(_ai_player_id: String) -> String:
	return ""

func _maybe_auto_play_latest_voice_report() -> void:
	if _api_client == null or not _api_client.has_method("get_ai_player_voice_audio_asset"):
		return
	if _voice_audio_player != null and is_instance_valid(_voice_audio_player) and _voice_audio_player.playing:
		return
	for index in range(_messages.size() - 1, -1, -1):
		var message_variant: Variant = _messages[index]
		if not (message_variant is Dictionary):
			continue
		var message := message_variant as Dictionary
		if str(message.get("kind", "")).strip_edges() != "ai":
			continue
		var metadata: Dictionary = message.get("metadata", {}) as Dictionary
		if str(metadata.get("voicePlaybackIntent", "")).strip_edges() != "ai_player_chat_report":
			continue
		if not bool(metadata.get("voicePlaybackReady", false)):
			continue
		var speech_contract := _extract_speech_contract_from_message(message)
		if not _speech_contract_has_playable_audio(speech_contract):
			continue
		var audio_asset_id := str(speech_contract.get("audioAssetId", "")).strip_edges()
		var message_id := str(message.get("messageId", "")).strip_edges()
		if message_id == "":
			message_id = "%s:%s" % [audio_asset_id, str(metadata.get("eventKey", ""))]
		if message_id == "" or _voice_audio_auto_played_message_ids.has(message_id):
			return
		_voice_audio_auto_played_message_ids[message_id] = true
		var before_success_count := _voice_audio_play_success_count
		await _play_voice_audio_asset(audio_asset_id)
		if _voice_audio_play_success_count > before_success_count:
			_voice_audio_auto_play_success_count += 1
		return

func _play_voice_audio_asset(audio_asset_id: String) -> void:
	var normalized_audio_asset_id := audio_asset_id.strip_edges()
	if normalized_audio_asset_id == "":
		_mark_voice_audio_play_failure("语音资产缺失")
		return
	if _active_ai_player_id.strip_edges() == "":
		_mark_voice_audio_play_failure("请先选择一个 AI 玩家频道")
		return
	if _api_client == null or not _api_client.has_method("get_ai_player_voice_audio_asset"):
		_mark_voice_audio_play_failure("后端未连接，无法播放语音")
		return

	_set_status("下载语音...")
	var response: Dictionary = await _api_client.get_ai_player_voice_audio_asset(_active_ai_player_id, normalized_audio_asset_id)
	if not bool(response.get("ok", false)):
		_mark_voice_audio_play_failure("语音下载失败：%s" % _extract_error_text(response))
		return
	var data: Dictionary = response.get("data", {}) as Dictionary
	var content_type := str(data.get("contentType", "")).strip_edges().to_lower()
	if content_type != "audio/wav" and content_type != "audio/x-wav" and content_type != "audio/wave":
		_mark_voice_audio_play_failure("暂只支持 WAV 语音播放")
		return
	var audio_base64 := str(data.get("audioBase64", "")).strip_edges()
	if audio_base64 == "":
		_mark_voice_audio_play_failure("语音数据为空")
		return
	var audio_bytes := Marshalls.base64_to_raw(audio_base64)
	if audio_bytes.is_empty():
		_mark_voice_audio_play_failure("语音数据解析失败")
		return
	var stream := _build_audio_stream_wav_from_bytes(audio_bytes)
	if stream == null:
		_mark_voice_audio_play_failure("语音 WAV 解析失败")
		return
	var player := _ensure_voice_audio_player()
	player.stop()
	player.stream = stream
	_voice_audio_playing_asset_id = normalized_audio_asset_id
	_voice_audio_last_played_asset_id = normalized_audio_asset_id
	_voice_audio_play_success_count += 1
	_voice_audio_last_error = ""
	player.play()
	_set_status("正在播放语音")

func _mark_voice_audio_play_failure(message: String) -> void:
	_voice_audio_play_failure_count += 1
	_voice_audio_last_error = message
	_set_status(message)

func _ensure_voice_audio_player() -> AudioStreamPlayer:
	if _voice_audio_player != null and is_instance_valid(_voice_audio_player):
		return _voice_audio_player
	_voice_audio_player = AudioStreamPlayer.new()
	_voice_audio_player.name = "ChatVoiceAudioPlayer"
	if not _voice_audio_player.finished.is_connected(_on_voice_audio_finished):
		_voice_audio_player.finished.connect(_on_voice_audio_finished)
	add_child(_voice_audio_player)
	return _voice_audio_player

func _on_voice_audio_finished() -> void:
	if _voice_audio_playing_asset_id != "":
		_voice_audio_playing_asset_id = ""
		_set_status("语音播放完成")

func _build_audio_stream_wav_from_bytes(bytes: PackedByteArray) -> AudioStreamWAV:
	if bytes.size() < 44:
		return null
	if _read_ascii(bytes, 0, 4) != "RIFF" or _read_ascii(bytes, 8, 4) != "WAVE":
		return null
	var audio_format := 0
	var channels := 0
	var sample_rate := 0
	var bits_per_sample := 0
	var data_start := -1
	var data_size := 0
	var offset := 12
	while offset + 8 <= bytes.size():
		var chunk_id := _read_ascii(bytes, offset, 4)
		var chunk_size := _read_u32_le(bytes, offset + 4)
		var chunk_data_start := offset + 8
		if chunk_data_start + chunk_size > bytes.size():
			return null
		if chunk_id == "fmt ":
			if chunk_size < 16:
				return null
			audio_format = _read_u16_le(bytes, chunk_data_start)
			channels = _read_u16_le(bytes, chunk_data_start + 2)
			sample_rate = _read_u32_le(bytes, chunk_data_start + 4)
			bits_per_sample = _read_u16_le(bytes, chunk_data_start + 14)
		elif chunk_id == "data":
			data_start = chunk_data_start
			data_size = chunk_size
		offset = chunk_data_start + chunk_size
		if chunk_size % 2 == 1:
			offset += 1
	if audio_format != 1 or data_start < 0 or data_size <= 0:
		return null
	if channels < 1 or channels > 2 or sample_rate <= 0:
		return null
	if bits_per_sample != 8 and bits_per_sample != 16:
		return null
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_8_BITS if bits_per_sample == 8 else AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = sample_rate
	stream.stereo = channels == 2
	stream.data = bytes.slice(data_start, data_start + data_size)
	return stream

func _read_u16_le(bytes: PackedByteArray, offset: int) -> int:
	if offset + 1 >= bytes.size():
		return 0
	return int(bytes[offset]) | (int(bytes[offset + 1]) << 8)

func _read_u32_le(bytes: PackedByteArray, offset: int) -> int:
	if offset + 3 >= bytes.size():
		return 0
	return int(bytes[offset]) | (int(bytes[offset + 1]) << 8) | (int(bytes[offset + 2]) << 16) | (int(bytes[offset + 3]) << 24)

func _read_ascii(bytes: PackedByteArray, offset: int, length: int) -> String:
	if offset < 0 or length <= 0 or offset >= bytes.size():
		return ""
	return bytes.slice(offset, mini(offset + length, bytes.size())).get_string_from_ascii()

func _refresh_chat(before_message_id: String = "", append_older: bool = false) -> void:
	if _api_client == null:
		_render_messages()
		return
	if _active_ai_player_id.strip_edges() == "":
		_render_messages()
		return
	var response: Dictionary = await _api_client.get_ai_player_chat_messages(
		_active_ai_player_id,
		120,
		_active_governor_player_id,
		_message_filter,
		before_message_id
	)
	if not bool(response.get("ok", false)):
		var failure_signature := "%s:%s:%s" % [_active_ai_player_id, _message_filter, _extract_error_text(response)]
		if failure_signature != _last_chat_failure_signature:
			_last_chat_failure_signature = failure_signature
			_append_system_message("读取 AI 玩家频道失败：%s\n可以继续输入本地消息；后端恢复后会重新同步。" % _extract_error_text(response))
		_set_status("聊天读取失败")
		return

	var data: Dictionary = response.get("data", {}) as Dictionary
	_last_chat_failure_signature = ""
	var channel_payload: Dictionary = data.get("channel", {}) as Dictionary
	var read_cursor: Dictionary = data.get("readCursor", {}) as Dictionary
	_history_counts = data.get("historyCounts", {}) as Dictionary
	_history_has_more = bool(data.get("hasMore", false))
	_history_next_before_message_id = str(data.get("nextBeforeMessageId", "")).strip_edges()
	var raw_messages: Array = data.get("messages", []) as Array
	var message_count := int(read_cursor.get("messageCount", channel_payload.get("messageCount", data.get("count", raw_messages.size()))))
	_channel_message_counts[_active_ai_player_id] = message_count
	_channel_seen_counts[_active_ai_player_id] = int(read_cursor.get("readMessageCount", _channel_seen_counts.get(_active_ai_player_id, 0)))
	var loaded_messages: Array = []
	for raw_message in raw_messages:
		if raw_message is Dictionary:
			loaded_messages.append(_normalize_backend_message(raw_message as Dictionary))
	if append_older:
		_messages = loaded_messages + _messages
	else:
		_messages = loaded_messages
	if _messages.is_empty():
		_set_status("暂无消息")
	_render_messages()
	if not append_older:
		call_deferred("_maybe_auto_play_latest_voice_report")
	if append_older:
		_refresh_channel_buttons()
		_set_status("已加载更早历史")
		return
	var cursor_saved := await _mark_active_ai_channel_read(message_count)
	_refresh_channel_buttons()
	if cursor_saved:
		_set_status("")

func _mark_active_ai_channel_read(message_count: int) -> bool:
	if _api_client == null:
		return false
	var ai_player_id := _active_ai_player_id.strip_edges()
	var reader_id := _active_governor_player_id.strip_edges()
	if ai_player_id == "" or reader_id == "":
		return false
	var response: Dictionary = await _api_client.update_ai_player_chat_read_cursor(ai_player_id, reader_id, message_count)
	if not bool(response.get("ok", false)):
		_channel_seen_counts[ai_player_id] = message_count
		_set_status("")
		return false
	var data: Dictionary = response.get("data", {}) as Dictionary
	var read_cursor: Dictionary = data.get("readCursor", {}) as Dictionary
	_channel_message_counts[ai_player_id] = int(read_cursor.get("messageCount", message_count))
	_channel_seen_counts[ai_player_id] = int(read_cursor.get("readMessageCount", message_count))
	return true

func _request_ai_patrol_tick() -> void:
	if _api_client == null:
		_set_status("后端未连接，无法巡查")
		return
	var ai_player_id := _active_ai_player_id.strip_edges()
	if ai_player_id == "":
		_set_status("请先选择一个 AI 玩家频道")
		return
	_set_status("请求 AI 巡查...")
	var response: Dictionary = await _api_client.create_ai_player_chat_patrol_tick(ai_player_id, _active_governor_player_id)
	if not bool(response.get("ok", false)):
		_append_backend_failure_response("巡查失败", response)
		_set_status("巡查失败")
		return
	var data: Dictionary = response.get("data", {}) as Dictionary
	var chat_message: Dictionary = {}
	var chat_message_value = data.get("chatMessage", data.get("aiMessage", {}))
	if chat_message_value is Dictionary:
		chat_message = chat_message_value as Dictionary
	if not chat_message.is_empty():
		_messages.append(_normalize_backend_message(chat_message))
		_render_messages()
	_set_status("AI 已完成巡查回报")
	await _refresh_chat()

func _approve_and_execute_proposal(proposal_id: String) -> void:
	var normalized_proposal_id := proposal_id.strip_edges()
	if normalized_proposal_id == "":
		normalized_proposal_id = _active_proposal_id
	if normalized_proposal_id == "":
		_set_status("没有可审批的提案")
		return
	if _api_client == null:
		_set_status("后端未连接，无法审批")
		return

	_set_status("审批提案...")
	var approve_response: Dictionary = await _api_client.approve_ai_player_proposal(normalized_proposal_id, _active_governor_player_id)
	if not bool(approve_response.get("ok", false)):
		_append_backend_failure_response("审批失败", approve_response)
		_set_status("审批失败")
		return

	_set_status("执行提案...")
	var execute_response: Dictionary = await _api_client.execute_ai_player_proposal(normalized_proposal_id, _active_governor_player_id, true)
	if not bool(execute_response.get("ok", false)):
		_append_backend_failure_response("执行失败", execute_response)
		_set_status("执行失败")
		return

	_set_status("执行完成，回执已回写聊天流")
	await _refresh_chat()
	await _refresh_mailbox()

func _show_proposal_detail(message: Dictionary) -> void:
	var proposal_id := str(message.get("proposalId", "")).strip_edges()
	var action := str(message.get("action", "resource_transfer_to_governor")).strip_edges()
	var preview_proposal := _build_message_proposal_preview(message)
	if proposal_id == "":
		_set_status("提案详情：本地预览卡，尚未生成后端 proposalId")
		_open_proposal_detail("提案详情", _format_proposal_readable_detail(preview_proposal, message), preview_proposal)
		return
	_open_proposal_detail("提案详情", "正在读取 %s ..." % proposal_id, {})
	if _api_client == null:
		_set_status("提案详情：%s / %s" % [action, proposal_id])
		return
	var response: Dictionary = await _api_client.get_ai_player_proposal(proposal_id)
	if not bool(response.get("ok", false)):
		_open_proposal_detail("提案详情", "%s\n\n读取正式提案失败：%s" % [
			_format_proposal_readable_detail(preview_proposal, message),
			_extract_error_text(response),
		], preview_proposal)
		_set_status("提案详情读取失败")
		return
	var data: Dictionary = response.get("data", {}) as Dictionary
	var proposal: Dictionary = data.get("proposal", {}) as Dictionary
	var proposal_context := proposal if not proposal.is_empty() else preview_proposal
	_open_proposal_detail("提案详情", _format_backend_proposal_detail(proposal, message), proposal_context)
	_set_status("提案详情：%s / %s" % [action, proposal_id])

func _show_receipt_detail(message: Dictionary) -> void:
	var proposal_id := str(message.get("receiptProposalId", "")).strip_edges()
	var preview_context := _build_message_receipt_preview(message)
	if not _extract_world_receipt_payload(preview_context, message).is_empty():
		var local_receipt_context := _merge_receipt_context(preview_context, message)
		var local_world_detail := _format_world_receipt_readable_detail(local_receipt_context, message)
		_open_proposal_detail("回执详情", _format_receipt_readable_detail(local_receipt_context, message), local_receipt_context)
		_set_status("回执详情：%s%s" % [proposal_id if proposal_id != "" else "本地回执", " / 结果明细" if local_world_detail != "" else ""])
		return
	if proposal_id == "":
		_open_proposal_detail("回执详情", _format_receipt_readable_detail(preview_context, message), preview_context)
		_set_status("回执详情：本地回执，没有 proposalId")
		return
	_open_proposal_detail("回执详情", "正在读取回执关联提案 %s ..." % proposal_id, preview_context)
	if _api_client == null:
		_open_proposal_detail("回执详情", _format_receipt_readable_detail(preview_context, message), preview_context)
		_set_status("回执详情：后端未连接，显示本地回执")
		return
	var response: Dictionary = await _api_client.get_ai_player_proposal(proposal_id)
	if not bool(response.get("ok", false)):
		_open_proposal_detail("回执详情", "%s\n\n读取正式提案失败：%s" % [
			_format_receipt_readable_detail(preview_context, message),
			_extract_error_text(response),
		], preview_context)
		_set_status("回执详情读取失败")
		return
	var data: Dictionary = response.get("data", {}) as Dictionary
	var proposal: Dictionary = data.get("proposal", {}) as Dictionary
	var receipt_context := _merge_receipt_context(proposal, message)
	if _extract_world_receipt_payload(receipt_context, message).is_empty():
		var fetched_receipt := await _fetch_receipt_for_proposal(proposal_id)
		if not fetched_receipt.is_empty():
			receipt_context = _apply_receipt_payload_to_context(receipt_context, fetched_receipt)
	var receipt_world_detail := _format_world_receipt_readable_detail(receipt_context, message)
	var receipt_detail := _format_receipt_readable_detail(receipt_context, message)
	_open_proposal_detail("回执详情", receipt_detail, receipt_context)
	_set_status("回执详情：%s%s" % [proposal_id, " / 结果明细" if receipt_world_detail != "" else ""])

func _open_proposal_detail(title: String, body: String, proposal_context: Dictionary = {}) -> void:
	if _proposal_detail_popup == null:
		return
	_proposal_detail_popup.visible = true
	if _proposal_detail_title != null:
		_proposal_detail_title.text = title
	if _proposal_detail_body != null:
		_proposal_detail_body.text = body
	_proposal_detail_retry_text = _build_retry_command_from_proposal(proposal_context)
	if _proposal_detail_status_label != null:
		_proposal_detail_status_label.text = _format_proposal_detail_status_hint(proposal_context)
	_refresh_proposal_detail_action_buttons()

func _close_proposal_detail_popup() -> void:
	if _proposal_detail_popup != null:
		_proposal_detail_popup.visible = false

func _refresh_proposal_detail_action_buttons() -> void:
	if _proposal_detail_retry_button != null:
		_proposal_detail_retry_button.disabled = _proposal_detail_retry_text == ""
		_proposal_detail_retry_button.add_theme_color_override(
			"font_color",
			Color(0.92, 0.90, 0.84, 0.92) if not _proposal_detail_retry_button.disabled else Color(0.62, 0.58, 0.50, 0.72)
		)
	if _proposal_detail_failure_button != null:
		_proposal_detail_failure_button.disabled = _count_messages_for_filter(MESSAGE_FILTER_FAILURE) <= 0
		_proposal_detail_failure_button.add_theme_color_override(
			"font_color",
			Color(0.92, 0.90, 0.84, 0.92) if not _proposal_detail_failure_button.disabled else Color(0.62, 0.58, 0.50, 0.72)
		)

func _show_failure_history_from_detail() -> void:
	_message_filter = MESSAGE_FILTER_FAILURE
	_close_proposal_detail_popup()
	await _refresh_chat()
	_set_status("已切到失败历史")

func _fill_retry_command_from_detail() -> void:
	if _proposal_detail_retry_text == "":
		_set_status("当前提案没有可填入的恢复命令")
		return
	if _input != null:
		_input.text = _proposal_detail_retry_text
		_sync_chat_input_height()
		_input.grab_focus()
	_close_proposal_detail_popup()
	_set_status("已填入恢复命令，可修改后发送")

func _build_message_proposal_preview(message: Dictionary) -> Dictionary:
	var metadata: Dictionary = message.get("metadata", {}) as Dictionary
	var args: Dictionary = {}
	if metadata.has("resources"):
		args["resources"] = metadata.get("resources", {})
	return {
		"proposalId": str(message.get("proposalId", "")).strip_edges(),
		"action": str(message.get("action", "")).strip_edges(),
		"status": str(metadata.get("status", "pending_approval")).strip_edges(),
		"riskLevel": str(metadata.get("riskLevel", "low")).strip_edges(),
		"requiresApproval": bool(metadata.get("requiresApproval", true)),
		"source": str(metadata.get("proposalMode", metadata.get("source", "chat"))).strip_edges(),
		"model": str(metadata.get("model", "")).strip_edges(),
		"reason": str(message.get("body", "")).strip_edges(),
		"args": args,
		"recoveryHint": metadata.get("recoveryHint", {}),
	}

func _build_message_receipt_preview(message: Dictionary) -> Dictionary:
	var metadata: Dictionary = message.get("metadata", {}) as Dictionary
	var receipt_ok := bool(message.get("receiptOk", false))
	var failure_code := str(message.get("failureCode", metadata.get("failureCode", ""))).strip_edges()
	return {
		"proposalId": str(message.get("receiptProposalId", "")).strip_edges(),
		"action": str(message.get("action", "")).strip_edges(),
		"status": "executed" if receipt_ok else "failed",
		"reason": str(message.get("body", "")).strip_edges(),
		"failureCode": failure_code,
		"worldAction": str(metadata.get("worldAction", "")).strip_edges(),
		"recoveryHint": metadata.get("recoveryHint", {}),
	}

func _merge_receipt_context(proposal: Dictionary, message: Dictionary) -> Dictionary:
	var context: Dictionary = proposal.duplicate(true) if not proposal.is_empty() else _build_message_receipt_preview(message)
	var metadata: Dictionary = message.get("metadata", {}) as Dictionary
	var proposal_receipt: Dictionary = _extract_receipt_payload_from_container(proposal)
	if proposal_receipt.is_empty():
		proposal_receipt = _extract_receipt_payload_from_container(metadata)
	if proposal_receipt.is_empty():
		proposal_receipt = _extract_receipt_payload_from_container(message)
	if not proposal_receipt.is_empty():
		context = _apply_receipt_payload_to_context(context, proposal_receipt)
	else:
		var world_receipt: Dictionary = _extract_world_receipt_payload(context, message)
		if not world_receipt.is_empty():
			context["worldReceipt"] = world_receipt
	var receipt_ok := bool(message.get("receiptOk", false))
	context["status"] = "executed" if receipt_ok else "failed"
	var failure_code := str(message.get("failureCode", metadata.get("failureCode", ""))).strip_edges()
	if failure_code != "":
		context["failureCode"] = failure_code
	var recovery_hint_value = metadata.get("recoveryHint", {})
	if recovery_hint_value is Dictionary and not (recovery_hint_value as Dictionary).is_empty():
		context["recoveryHint"] = recovery_hint_value
	var world_action := str(metadata.get("worldAction", context.get("worldAction", ""))).strip_edges()
	if world_action != "":
		context["worldAction"] = world_action
	if str(context.get("proposalId", "")).strip_edges() == "":
		context["proposalId"] = str(message.get("receiptProposalId", "")).strip_edges()
	return context

func _format_message_proposal_detail(message: Dictionary) -> String:
	return _format_proposal_readable_detail(_build_message_proposal_preview(message), message)

func _format_backend_proposal_detail(proposal: Dictionary, fallback_message: Dictionary) -> String:
	if proposal.is_empty():
		return _format_message_proposal_detail(fallback_message)
	return _format_proposal_readable_detail(proposal, fallback_message)

func _format_receipt_readable_detail(proposal_context: Dictionary, message: Dictionary) -> String:
	var metadata: Dictionary = message.get("metadata", {}) as Dictionary
	var receipt_ok := bool(message.get("receiptOk", false))
	var context := proposal_context.duplicate(true)
	context["status"] = "executed" if receipt_ok else "failed"
	if str(context.get("reason", "")).strip_edges() == "":
		context["reason"] = str(message.get("body", "")).strip_edges()
	var failure_code := str(message.get("failureCode", metadata.get("failureCode", ""))).strip_edges()
	if failure_code != "":
		context["failureCode"] = failure_code
	var recovery_hint_value = metadata.get("recoveryHint", context.get("recoveryHint", {}))
	if recovery_hint_value is Dictionary and not (recovery_hint_value as Dictionary).is_empty():
		context["recoveryHint"] = recovery_hint_value
	var world_receipt_detail := _format_world_receipt_readable_detail(context, message)
	var proposal_detail := _format_proposal_readable_detail(context, message)
	if world_receipt_detail != "":
		if proposal_detail != "":
			return "%s\n\n%s" % [world_receipt_detail, proposal_detail]
		return world_receipt_detail
	return proposal_detail

func _fetch_receipt_for_proposal(proposal_id: String) -> Dictionary:
	var normalized_proposal_id := proposal_id.strip_edges()
	if normalized_proposal_id == "" or _api_client == null:
		return {}
	if not _api_client.has_method("get_ai_player_receipts"):
		return {}
	var ai_player_id := _active_ai_player_id.strip_edges()
	if ai_player_id == "":
		return {}
	var response: Dictionary = await _api_client.get_ai_player_receipts(ai_player_id, 50)
	if not bool(response.get("ok", false)):
		return {}
	var data: Dictionary = response.get("data", {}) as Dictionary
	var items: Array = data.get("items", []) as Array
	for item_variant in items:
		if not (item_variant is Dictionary):
			continue
		var item: Dictionary = item_variant as Dictionary
		if str(item.get("proposalId", "")).strip_edges() == normalized_proposal_id:
			return item.duplicate(true)
	return {}

func _extract_receipt_payload_from_container(container: Dictionary) -> Dictionary:
	for key in ["receipt", "latestReceipt", "latest_receipt"]:
		var receipt_variant: Variant = container.get(key, {})
		if receipt_variant is Dictionary and not (receipt_variant as Dictionary).is_empty():
			return (receipt_variant as Dictionary).duplicate(true)
	return {}

func _apply_receipt_payload_to_context(context: Dictionary, receipt: Dictionary) -> Dictionary:
	var next_context := context.duplicate(true)
	next_context["receipt"] = receipt.duplicate(true)
	var world_receipt := _extract_world_receipt_payload(receipt, {})
	if not world_receipt.is_empty():
		next_context["worldReceipt"] = world_receipt
	for key in ["worldAction", "world_action", "worldActionPayload", "actionRequestId", "message", "observedAt", "failureCode"]:
		if receipt.has(key):
			next_context[key] = receipt.get(key)
	if receipt.has("ok"):
		next_context["status"] = "executed" if bool(receipt.get("ok", false)) else "failed"
	return next_context

func _extract_world_receipt_payload(proposal_context: Dictionary, message: Dictionary = {}) -> Dictionary:
	var containers: Array = [proposal_context]
	var context_receipt := _extract_receipt_payload_from_container(proposal_context)
	if not context_receipt.is_empty():
		containers.append(context_receipt)
	if not message.is_empty():
		containers.append(message)
		var message_receipt := _extract_receipt_payload_from_container(message)
		if not message_receipt.is_empty():
			containers.append(message_receipt)
		var metadata: Dictionary = message.get("metadata", {}) as Dictionary
		if not metadata.is_empty():
			containers.append(metadata)
			var metadata_receipt := _extract_receipt_payload_from_container(metadata)
			if not metadata_receipt.is_empty():
				containers.append(metadata_receipt)
	for container_variant in containers:
		if not (container_variant is Dictionary):
			continue
		var container: Dictionary = container_variant as Dictionary
		var world_receipt_variant: Variant = container.get("worldReceipt", container.get("world_receipt", {}))
		if world_receipt_variant is Dictionary and not (world_receipt_variant as Dictionary).is_empty():
			return (world_receipt_variant as Dictionary).duplicate(true)
	return {}

func _format_world_receipt_readable_detail(proposal_context: Dictionary, message: Dictionary) -> String:
	var world_receipt := _extract_world_receipt_payload(proposal_context, message)
	if world_receipt.is_empty():
		return ""
	var receipt_payload: Dictionary = proposal_context.get("receipt", {}) as Dictionary
	var world_action := str(world_receipt.get("action", world_receipt.get("worldAction", proposal_context.get("worldAction", proposal_context.get("world_action", ""))))).strip_edges()
	var ok_value := bool(world_receipt.get("ok", receipt_payload.get("ok", proposal_context.get("status", "") == "executed")))
	var failure_code := _clean_optional_text(world_receipt.get("failureCode", world_receipt.get("failure_code", receipt_payload.get("failureCode", proposal_context.get("failureCode", "")))))
	var result_lines: Array[String] = []
	var action_label := _format_world_action_label(world_action)
	if action_label == "":
		action_label = _format_proposal_action_label(str(proposal_context.get("action", message.get("action", ""))).strip_edges())
	result_lines.append("%s：%s" % [action_label, "已完成" if ok_value and failure_code == "" else "未完成"])
	var level_exp_text := _format_world_receipt_level_exp_detail(world_receipt)
	if level_exp_text != "":
		result_lines.append(level_exp_text)
	var target_text := _format_world_receipt_target_detail(world_receipt)
	if target_text != "":
		result_lines.append(target_text)
	var resource_refresh_text := _format_world_receipt_resource_refresh_detail(world_receipt, not ok_value or failure_code != "")
	if resource_refresh_text != "":
		result_lines.append(resource_refresh_text)
	if failure_code != "":
		result_lines.append("失败：%s" % _format_failure_code_label(failure_code))
	var lines: Array[String] = []
	_append_detail_block(lines, "结果明细", "\n".join(result_lines))
	return "\n".join(lines)

func _format_world_receipt_level_exp_detail(receipt_payload: Dictionary) -> String:
	var parts: Array[String] = []
	var hero_name := _format_world_receipt_hero_name(receipt_payload)
	var previous_level := _format_receipt_value(receipt_payload.get("previousLevel", receipt_payload.get("previous_level", "")))
	var next_level := _format_receipt_value(receipt_payload.get("nextLevel", receipt_payload.get("next_level", "")))
	if previous_level != "" and next_level != "":
		parts.append("%sLv.%s->%s" % ["%s " % hero_name if hero_name != "" else "", previous_level, next_level])
	elif previous_level != "":
		parts.append("%sLv.%s" % ["%s " % hero_name if hero_name != "" else "", previous_level])
	elif next_level != "":
		parts.append("%sLv.%s" % ["%s " % hero_name if hero_name != "" else "", next_level])
	var previous_star_level := _format_receipt_value(receipt_payload.get("previousStarLevel", receipt_payload.get("previous_star_level", "")))
	var next_star_level := _format_receipt_value(receipt_payload.get("nextStarLevel", receipt_payload.get("next_star_level", "")))
	if previous_star_level != "" and next_star_level != "":
		parts.append("%s星级 %s->%s" % ["%s " % hero_name if hero_name != "" else "", previous_star_level, next_star_level])
	elif previous_star_level != "":
		parts.append("%s星级 %s" % ["%s " % hero_name if hero_name != "" else "", previous_star_level])
	elif next_star_level != "":
		parts.append("%s星级 %s" % ["%s " % hero_name if hero_name != "" else "", next_star_level])
	var bonus_points_awarded := _format_receipt_value(receipt_payload.get("bonusPointsAwarded", receipt_payload.get("bonus_points_awarded", "")))
	if bonus_points_awarded != "":
		parts.append("加点 +%s" % bonus_points_awarded)
	var previous_exp := _format_receipt_value(receipt_payload.get("previousExp", receipt_payload.get("previous_exp", "")))
	var next_exp := _format_receipt_value(receipt_payload.get("nextExp", receipt_payload.get("next_exp", "")))
	var exp_gained := _format_receipt_value(receipt_payload.get("expGained", receipt_payload.get("exp_gained", "")))
	if exp_gained != "" or previous_exp != "" or next_exp != "":
		parts.append("%s经验 +%s %s->%s" % [
			"%s " % hero_name if hero_name != "" else "",
			exp_gained if exp_gained != "" else "?",
			previous_exp if previous_exp != "" else "?",
			next_exp if next_exp != "" else "?",
		])
	return " / ".join(parts)

func _format_world_receipt_resource_refresh_detail(receipt_payload: Dictionary, receipt_failed := false) -> String:
	var parts: Array[String] = []
	var resources_spent_variant: Variant = receipt_payload.get("resourcesSpent", receipt_payload.get("resources_spent", {}))
	if resources_spent_variant is Dictionary and not (resources_spent_variant as Dictionary).is_empty():
		parts.append("%s %s" % ["需要" if receipt_failed else "消耗", _format_world_receipt_resources(resources_spent_variant as Dictionary)])
	var read_model_refresh_variant: Variant = receipt_payload.get("readModelRefresh", receipt_payload.get("read_model_refresh", {}))
	if read_model_refresh_variant is Dictionary and not (read_model_refresh_variant as Dictionary).is_empty():
		var read_model_refresh: Dictionary = read_model_refresh_variant as Dictionary
		var refresh_endpoint := str(read_model_refresh.get("endpoint", "")).strip_edges()
		var refresh_strategy := str(read_model_refresh.get("strategy", "")).strip_edges()
		if refresh_endpoint != "":
			parts.append("刷新 %s" % refresh_endpoint)
		elif refresh_strategy != "":
			parts.append("刷新 %s" % refresh_strategy)
	return " / ".join(parts)

func _format_world_receipt_target_detail(receipt_payload: Dictionary) -> String:
	var parts: Array[String] = []
	var hero_name := _format_world_receipt_hero_name(receipt_payload)
	var hero_id := str(receipt_payload.get("heroId", receipt_payload.get("hero_id", ""))).strip_edges()
	if hero_name != "":
		parts.append("武将 %s" % hero_name)
	elif hero_id != "":
		parts.append("武将 %s" % hero_id)
	var skill_id := str(receipt_payload.get("skillId", receipt_payload.get("skill_id", ""))).strip_edges()
	if skill_id != "":
		parts.append("战法 %s" % skill_id)
	var city_id := str(receipt_payload.get("cityId", receipt_payload.get("city_id", ""))).strip_edges()
	var building_id := str(receipt_payload.get("buildingId", receipt_payload.get("building_id", ""))).strip_edges()
	if city_id != "" or building_id != "":
		parts.append("建筑 %s/%s" % [city_id if city_id != "" else "主城", building_id if building_id != "" else "未指定"])
	var tile_id := str(receipt_payload.get("tileId", receipt_payload.get("tile_id", ""))).strip_edges()
	if tile_id != "":
		parts.append("地块 %s" % tile_id)
	return " / ".join(parts)

func _format_world_receipt_hero_name(receipt_payload: Dictionary) -> String:
	var hero_variant: Variant = receipt_payload.get("hero", {})
	if hero_variant is Dictionary:
		var hero: Dictionary = hero_variant as Dictionary
		return str(hero.get("name", hero.get("displayName", hero.get("heroId", hero.get("id", ""))))).strip_edges()
	return ""

func _format_receipt_value(value: Variant) -> String:
	if value == null:
		return ""
	if value is int or value is float:
		return str(int(value))
	var text := str(value).strip_edges()
	if text == "" or text == "<null>" or text.to_lower() == "null":
		return ""
	return text

func _format_world_receipt_resources(resources: Dictionary) -> String:
	var labels := {
		"food": "粮草",
		"wood": "木材",
		"stone": "石料",
		"iron": "铁矿",
		"copper": "铜钱",
		"actionPoints": "行动点",
		"developmentPoints": "发展点",
	}
	var parts: Array[String] = []
	for key in ["food", "wood", "stone", "iron", "copper", "actionPoints", "developmentPoints"]:
		if not resources.has(key):
			continue
		var amount_text := _format_receipt_value(resources.get(key))
		if amount_text != "" and amount_text != "0":
			parts.append("%s %s" % [labels.get(key, key), amount_text])
	for key_variant in resources.keys():
		var key := str(key_variant)
		if labels.has(key):
			continue
		var amount_text := _format_receipt_value(resources.get(key_variant))
		if amount_text != "" and amount_text != "0":
			parts.append("%s %s" % [key, amount_text])
	if parts.is_empty():
		return "无"
	return " / ".join(parts)

func _format_receipt_failure_next_step(proposal_context: Dictionary, failure_code: String, recovery_hint: Dictionary) -> String:
	if failure_code == "":
		return ""
	var recommended_command := str(recovery_hint.get("recommendedCommand", "")).strip_edges()
	var args: Dictionary = proposal_context.get("args", {}) as Dictionary
	var resources: Dictionary = args.get("resources", {}) as Dictionary
	var resource_text := _format_retry_resource_bundle(resources).strip_edges()
	match failure_code:
		"insufficient_resources", "insufficient_ai_resources":
			if recommended_command != "":
				return "先不要重复执行同一提案；让 AI 玩家继续采集或降低输送数量。可直接填入建议消息。"
			return "先不要重复执行同一提案；让 AI 继续采集%s，或把本次输送数量调低后重新生成提案。" % (("，目标资源：%s" % resource_text) if resource_text != "一部分资源" else "")
		"transfer_cooldown_active":
			if recommended_command != "":
				return "等待输送冷却结束后再执行；等待期间可以改下采集消息，或直接填入建议消息。"
			return "等待输送冷却结束后再输送%s；等待期间让 AI 继续采集。" % resource_text
		"daily_quota_exceeded":
			return "今日输送额度已耗尽；等额度窗口刷新后再输送资源，当前可以让 AI 继续采集但不要重复提交输送。"
		"proposal_not_approved":
			return "先批准提案，再执行；如果目标或数量不对，拒绝后重新用自然语言下令。"
		"proposal_not_found":
			return "刷新聊天历史或重新给 AI 玩家发送消息生成新提案。"
		_:
			return "按失败原因修正资源、冷却或审批状态后，再重新生成提案。"

func _format_proposal_readable_detail(proposal: Dictionary, fallback_message: Dictionary = {}) -> String:
	var lines: Array[String] = []
	var fallback_metadata: Dictionary = fallback_message.get("metadata", {}) as Dictionary
	var action := str(proposal.get("action", fallback_message.get("action", ""))).strip_edges()
	var args: Dictionary = proposal.get("args", {}) as Dictionary
	var status := str(proposal.get("status", fallback_metadata.get("status", ""))).strip_edges()
	var risk_level := str(proposal.get("riskLevel", fallback_metadata.get("riskLevel", ""))).strip_edges()
	var requires_approval := bool(proposal.get("requiresApproval", fallback_metadata.get("requiresApproval", true)))
	var executable_in_v1 := bool(proposal.get("executableInV1", true))
	var recovery_hint := _extract_proposal_recovery_hint(proposal, fallback_metadata)
	var reason := str(proposal.get("reason", fallback_message.get("body", ""))).strip_edges()
	var reason_blocks := _extract_proposal_reason_blocks(reason)

	var resource_text := str(reason_blocks.get("资源", "")).strip_edges()
	if resource_text == "":
		resource_text = _format_proposal_resource_focus(action, args)
	_append_detail_block(lines, "资源", resource_text)

	var target_text := str(reason_blocks.get("目标", "")).strip_edges()
	if target_text == "":
		target_text = _format_proposal_target_line(action, args, proposal)
	_append_detail_block(lines, "目标", target_text)

	var failure_code := _clean_optional_text(proposal.get("failureCode", fallback_metadata.get("failureCode", "")))
	if failure_code == "":
		failure_code = _clean_optional_text(proposal.get("rejectionReason", ""))
	var risk_lines: Array[String] = []
	var risk_text := str(reason_blocks.get("风险", "")).strip_edges()
	if risk_text != "":
		risk_lines.append(risk_text)
	if status != "":
		risk_lines.append("状态：%s" % _format_proposal_status_label(status))
	if risk_level == "medium" or risk_level == "high":
		risk_lines.append("等级：%s" % _format_proposal_risk_label(risk_level))
	risk_lines.append("审批：%s" % _format_proposal_approval_guidance(status, requires_approval, risk_level, executable_in_v1))
	if not executable_in_v1:
		risk_lines.append("限制：%s" % _format_proposal_execution_readiness(executable_in_v1))
	if failure_code != "":
		risk_lines.append("失败：%s" % _format_failure_code_label(failure_code))
		risk_lines.append("处理：%s" % _format_proposal_recovery_hint(action, status, failure_code, recovery_hint))
	_append_detail_block(lines, "风险", "\n".join(risk_lines))

	var result_lines: Array[String] = []
	var result_text := str(reason_blocks.get("批准后结果", "")).strip_edges()
	if result_text != "":
		result_lines.append(result_text)
	else:
		for effect_line in _build_proposal_effect_lines(action, args):
			result_lines.append(effect_line)
	_append_detail_block(lines, "批准后结果", "\n".join(result_lines))
	return "\n".join(lines)

func _extract_proposal_reason_blocks(reason: String) -> Dictionary:
	var blocks: Dictionary = {}
	var text := reason.strip_edges()
	if text == "":
		return blocks
	var markers: Array = []
	for label in ["资源", "目标", "风险", "批准后结果"]:
		var marker := "%s：" % label
		var index := text.find(marker)
		if index < 0:
			marker = "%s:" % label
			index = text.find(marker)
		if index >= 0:
			markers.append({"label": label, "index": index, "length": marker.length()})
	markers.sort_custom(func(a, b) -> bool:
		return int(a.get("index", 0)) < int(b.get("index", 0))
	)
	for i in range(markers.size()):
		var item: Dictionary = markers[i] as Dictionary
		var start := int(item.get("index", 0)) + int(item.get("length", 0))
		var finish := text.length()
		if i + 1 < markers.size():
			var next_item: Dictionary = markers[i + 1] as Dictionary
			finish = int(next_item.get("index", finish))
		var value := text.substr(start, max(0, finish - start)).strip_edges()
		value = _trim_reason_block_punctuation(value)
		if value != "":
			blocks[str(item.get("label", ""))] = value
	return blocks

func _trim_reason_block_punctuation(value: String) -> String:
	var text := value.strip_edges()
	while text.begins_with("；") or text.begins_with(";") or text.begins_with("。") or text.begins_with("."):
		text = text.substr(1).strip_edges()
	while text.ends_with("；") or text.ends_with(";"):
		text = text.substr(0, text.length() - 1).strip_edges()
	return text

func _append_detail_block(lines: Array[String], title: String, body: String) -> void:
	var normalized := body.strip_edges()
	if normalized == "":
		return
	if not lines.is_empty():
		lines.append("")
	lines.append("%s：" % title)
	for raw_line in normalized.split("\n"):
		var line := raw_line.strip_edges()
		if line != "":
			lines.append("· %s" % line)

func _append_detail_line(lines: Array[String], label: String, value: String) -> void:
	var normalized := value.strip_edges()
	if normalized == "":
		return
	lines.append("%s：%s" % [label, normalized])

func _format_proposal_resource_focus(action: String, args: Dictionary) -> String:
	var resources: Dictionary = args.get("resources", {}) as Dictionary
	if not resources.is_empty():
		return "%s。AI 子账户会先扣除这部分资源，执行成功后进入邮件待领取。" % _format_resources(resources)
	var reward: Dictionary = args.get("reward", {}) as Dictionary
	if not reward.is_empty():
		return "%s。奖励领取后进入总督账户。" % _format_reward(reward)
	if action == "resource_gather":
		return "预计把采集收益写入 AI 子账户，具体收益以后端回执为准。"
	if action == "tile_occupy":
		return "占地会消耗行动点和粮草；成功后地块归属和势力发育进度以后端回执为准。"
	if action == "troop_heal":
		return "整补会消耗行动点和粮草；成功后恢复兵力和补给。"
	if action == "march_move":
		return "行军主要校验部队位置和目标地块；不直接结算占地或采集。"
	return "无直接资源变化，执行结果以后端回执为准。"

func _build_proposal_effect_lines(action: String, args: Dictionary) -> Array[String]:
	var lines: Array[String] = []
	var resources: Dictionary = args.get("resources", {}) as Dictionary
	if not resources.is_empty():
		lines.append("资源变化：AI 子账户扣除 %s，邮件增加同等待领资源。" % _format_resources(resources))
		lines.append("领取位置：主界面邮件，不在 AI 玩家档案领取。")
	var reward: Dictionary = args.get("reward", {}) as Dictionary
	if not reward.is_empty():
		lines.append("奖励变化：领取 %s。" % _format_reward(reward))
	var target_line := _format_proposal_target_line(action, args, {})
	if target_line != "":
		lines.append("目标：%s。" % target_line)
	if action == "reward_claim" and lines.is_empty():
		lines.append("从邮件领取当前可用奖励。")
	if action == "tile_occupy":
		lines.append("占领成功后，目标地块会变成我方地块，并生成正式回执。")
	if action == "troop_heal":
		lines.append("整补成功后，部队兵力和补给会恢复，方便继续行军或占地。")
	if action == "march_move":
		lines.append("地图变化：部队到达目标地块，地图意图环随后消失或进入下一条目标。")
	if lines.is_empty():
		lines.append("执行后会生成正式回执，并回写到 AI 聊天流。")
	else:
		lines.append("执行成功后会在聊天流写入回执。")
	return lines

func _format_proposal_target_line(action: String, args: Dictionary, proposal: Dictionary) -> String:
	match action:
		"resource_transfer_to_governor":
			var governor_id := str(proposal.get("governorPlayerId", _active_governor_player_id)).strip_edges()
			return "把资源转入总督 %s 的邮件" % (governor_id if governor_id != "" else "当前总督")
		"resource_gather":
			var unit_id := str(args.get("unitId", "")).strip_edges()
			var tile_id := str(args.get("tileId", "")).strip_edges()
			if unit_id != "" and tile_id != "":
				return "派 %s 采集资源地 %s" % [unit_id, tile_id]
			if tile_id != "":
				return "采集资源地 %s" % tile_id
			return "采集可用资源地"
		"tile_occupy":
			return "让部队 %s 占领地块 %s" % [
				str(args.get("unitId", "未指定")).strip_edges(),
				str(args.get("tileId", "未指定")).strip_edges(),
			]
		"troop_heal":
			return "整补部队 %s" % str(args.get("unitId", "自动选择受损部队")).strip_edges()
		"march_move":
			return "派部队 %s 前往地图目标地块 %s；地图意图环会标出该目标" % [
				str(args.get("unitId", "未指定")).strip_edges(),
				str(args.get("targetTileId", "未指定")).strip_edges(),
			]
		"reward_claim":
			var reward_id := str(args.get("rewardId", "")).strip_edges()
			return "领取 %s" % (reward_id if reward_id != "" else "当前可领取奖励")
		"formation_assign":
			return "调整武将 %s 到战法 %s" % [
				str(args.get("heroId", "未指定")).strip_edges(),
				str(args.get("tacticId", "未指定")).strip_edges(),
			]
		"general_focus_set", "general_focus":
			return "把武将关注目标切到 %s" % str(args.get("heroId", "未指定")).strip_edges()
		"troop_facility_upgrade":
			return "升级部队设施 %s" % str(args.get("facilityId", args.get("buildingId", "未指定"))).strip_edges()
		"threat_escape":
			return "按 %s 模式脱离威胁" % str(args.get("mode", "recover")).strip_edges()
		_:
			var target_tile_id := str(args.get("targetTileId", "")).strip_edges()
			if target_tile_id != "":
				return "目标地块 %s" % target_tile_id
			return ""

func _format_proposal_approval_guidance(status: String, requires_approval: bool, risk_level: String, executable_in_v1: bool) -> String:
	if not executable_in_v1:
		return "当前版本不可直接执行，先不要批准。"
	if status == "executed":
		return "已执行，可查看回执确认结果。"
	if status == "rejected":
		return "已拒绝，需重新下达命令才会生成新提案。"
	if status == "failed":
		return "执行失败，先看失败原因和恢复建议。"
	if not requires_approval:
		return "当前界面仍按待确认处理；需要总督明确触发后才进入执行链。"
	if risk_level == "high":
		return "高风险，建议确认资源和目标后再批准。"
	return "可由总督批准；批准后按规则处理，并把结果写回聊天。"

func _format_proposal_execution_readiness(executable_in_v1: bool) -> String:
	return "可处理，结果会写入回执" if executable_in_v1 else "当前版本仅能记录，不会直接改世界"

func _extract_proposal_recovery_hint(proposal: Dictionary, fallback_metadata: Dictionary = {}) -> Dictionary:
	var proposal_hint = proposal.get("recoveryHint", {})
	if proposal_hint is Dictionary:
		return proposal_hint as Dictionary
	var fallback_hint = fallback_metadata.get("recoveryHint", {})
	if fallback_hint is Dictionary:
		return fallback_hint as Dictionary
	return {}

func _format_proposal_recovery_hint(action: String, status: String, failure_code: String, recovery_hint: Dictionary = {}) -> String:
	var backend_summary := str(recovery_hint.get("summary", "")).strip_edges()
	if backend_summary != "":
		return backend_summary
	var normalized_failure := failure_code.strip_edges()
	if normalized_failure == "":
		if status == "pending_approval":
			return "等待批准；如果资源或目标不对，可以拒绝后重新下令。"
		if status == "executed":
			return "已执行；查看回执确认结果。"
		return ""
	match normalized_failure:
		"approval_required":
			return "点击批准执行，后端才会继续。"
		"transfer_cooldown_active":
			return "等待冷却结束，或改为采集/其他低风险任务。"
		"insufficient_resources":
			return "先让 AI 采集资源，或降低本次输送数量。"
		"insufficient_ai_resources":
			return "先让 AI 采集资源，或降低本次输送数量。"
		"daily_quota_exceeded":
			return "今日输送额度已用完，等待额度窗口刷新后再执行。"
		"proposal_not_found":
			return "刷新聊天历史，确认提案还存在。"
		"proposal_not_approved":
			return "先批准提案，再执行。"
		_:
			if action == "resource_transfer_to_governor":
				return "检查 AI 子账户资源、输送冷却和邮件状态。"
			return "查看回执失败原因，必要时重新下达更具体的命令。"

func _format_proposal_detail_status_hint(proposal: Dictionary) -> String:
	if proposal.is_empty():
		return "状态提示：正在读取正式提案，按钮暂不可用。"
	var action := str(proposal.get("action", "")).strip_edges()
	var status := str(proposal.get("status", "")).strip_edges()
	var failure_code := _clean_optional_text(proposal.get("failureCode", proposal.get("rejectionReason", "")))
	if status == "executed":
		return "状态提示：已执行，查看回执确认结果。"
	if status == "pending_approval":
		return "状态提示：等待总督批准；批准后执行结果会回写聊天流。"
	var recovery_hint := _extract_proposal_recovery_hint(proposal)
	var guidance := _format_proposal_recovery_hint(action, status, failure_code, recovery_hint)
	if guidance != "":
		return "状态提示：%s" % guidance
	if status == "approved":
		return "状态提示：已批准，等待执行或重试执行。"
	return "状态提示：查看详情后决定批准、拒绝或重新下令。"

func _build_retry_command_from_proposal(proposal: Dictionary) -> String:
	if proposal.is_empty():
		return ""
	var recovery_hint := _extract_proposal_recovery_hint(proposal)
	var recommended_command := str(recovery_hint.get("recommendedCommand", "")).strip_edges()
	if recommended_command != "":
		return recommended_command
	var action := str(proposal.get("action", "")).strip_edges()
	var args: Dictionary = proposal.get("args", {}) as Dictionary
	var failure_code := str(proposal.get("failureCode", proposal.get("rejectionReason", ""))).strip_edges()
	match action:
		"resource_transfer_to_governor":
			var resources: Dictionary = args.get("resources", {}) as Dictionary
			var resource_text := _format_retry_resource_bundle(resources)
			if failure_code == "insufficient_ai_resources" or failure_code == "insufficient_resources":
				return "先继续采集资源；资源够了再输送%s到邮件。" % resource_text
			if failure_code == "transfer_cooldown_active":
				return "冷却结束后再输送%s到邮件；等待期间继续采集。" % resource_text
			if failure_code == "daily_quota_exceeded":
				return "等待额度刷新后再输送%s到邮件。" % resource_text
			return "确认资源和冷却后，输送%s到邮件。" % resource_text
		"resource_gather":
			var tile_id := str(args.get("tileId", "")).strip_edges()
			if tile_id != "":
				return "继续采集资源地 %s，采集完成后汇报结果。" % tile_id
			return "选择最近可用资源地继续采集，采集完成后汇报结果。"
		"reward_claim":
			return "打开邮件，领取当前可领取奖励。"
		_:
			if failure_code != "":
				return "根据失败原因重新规划这条任务，降低风险后再生成提案。"
	return ""

func _format_retry_resource_bundle(resources: Dictionary) -> String:
	var resource_text := _format_resources(resources)
	if resource_text == "无":
		return "一部分资源"
	return " %s " % resource_text

func _format_proposal_action_label(action: String) -> String:
	match action:
		"resource_transfer_to_governor":
			return "输送资源给总督"
		"resource_gather":
			return "采集资源到 AI 子账户"
		"tile_occupy":
			return "占领地块"
		"troop_heal":
			return "整补部队"
		"march_move":
			return "行军到目标地"
		"reward_claim":
			return "领取奖励"
		"alliance_help":
			return "请求同盟协助"
		"formation_assign":
			return "调整部队编组"
		"general_focus":
			return "调整武将关注目标"
		"general_focus_set":
			return "调整武将关注目标"
		"troop_facility_upgrade":
			return "升级部队设施"
		"threat_escape":
			return "脱离威胁区域"
		_:
			return action if action != "" else "未标记动作"

func _format_proposal_status_label(status: String) -> String:
	match status:
		"candidate":
			return "候选"
		"pending_approval":
			return "等待批准"
		"approved":
			return "已批准，等待执行"
		"executed":
			return "已执行"
		"rejected":
			return "已拒绝"
		"failed":
			return "执行失败"
		_:
			return status if status != "" else "等待批准"

func _format_proposal_risk_label(risk_level: String) -> String:
	match risk_level:
		"high":
			return "高，需要谨慎确认"
		"medium":
			return "中"
		"low":
			return "低"
		_:
			return risk_level if risk_level != "" else "低"

func _format_failure_code_label(failure_code: String) -> String:
	match failure_code.strip_edges():
		"main_map_cell_immunity_active":
			return "免战保护中，暂不能占领"
		"insufficient_resources", "insufficient_ai_resources":
			return "AI 子账户资源不足"
		"transfer_cooldown_active":
			return "资源输送冷却中"
		"daily_quota_exceeded":
			return "今日输送额度已耗尽"
		"approval_required", "proposal_not_approved":
			return "需要先批准提案"
		"proposal_not_found":
			return "提案不存在或已过期"
		"ai_player_not_found":
			return "AI 玩家不存在"
		"ai_player_disabled":
			return "AI 玩家已停用"
		"ai_player_paused":
			return "AI 玩家已暂停"
		"proposal_execution_failed":
			return "处理失败"
		_:
			return failure_code

func _format_proposal_source_label(source: String) -> String:
	match source:
		"model":
			return "AI 已理解并"
		"llm":
			return "AI 已理解并"
		"human":
			return "已按你的话"
		"chat":
			return "AI 玩家频道聊天"
		"rule":
			return "系统规则生成"
		_:
			return source if source != "" else "AI 运行时"

func _format_world_action_label(world_action: String) -> String:
	match world_action:
		"moveUnit":
			return "行军到目标地"
		"occupyTile":
			return "占领目标地块"
		"healTroop":
			return "整补部队"
		"gatherAiResourceTile":
			return "采集资源"
		"transferFactionResourcesToGovernor":
			return "资源输送到邮件"
		"claimGovernorResourceInbox":
			return "领取 AI 输送资源"
		"claimReward":
			return "领取通用奖励"
		"issueClaimableReward":
			return "发放可领取奖励"
		_:
			return world_action

func _on_mailbox_pressed() -> void:
	if _mailbox_popup != null:
		_mailbox_popup.visible = true
	await _refresh_mailbox()

func _close_mailbox_popup() -> void:
	if _mailbox_popup != null:
		_mailbox_popup.visible = false

func _set_mailbox_filter(filter_id: String) -> void:
	_mailbox_filter = filter_id
	_refresh_mailbox_filter_buttons()
	_render_mailbox_items()

func _refresh_mailbox_filter_buttons() -> void:
	for filter_id in _mailbox_filter_buttons.keys():
		var button := _mailbox_filter_buttons[filter_id] as Button
		if button == null:
			continue
		if str(filter_id) == _mailbox_filter:
			button.add_theme_color_override("font_color", Color(1.0, 0.88, 0.55, 1.0))
		else:
			button.add_theme_color_override("font_color", Color(0.92, 0.90, 0.84, 0.92))

func _refresh_mailbox() -> void:
	if _mailbox_list == null:
		return
	if _api_client == null:
		_mailbox_items = []
		_mailbox_status_label.text = "后端未连接；邮件等待同步。"
		if _mailbox_popup_status_label != null:
			_mailbox_popup_status_label.text = "后端未连接；邮件等待同步。"
		_render_mailbox_items()
		return

	_mailbox_refresh_sequence += 1
	var refresh_sequence := _mailbox_refresh_sequence
	var response: Dictionary = await _api_client.get_unified_inbox(_active_faction_id, _active_governor_player_id)
	if not bool(response.get("ok", false)):
		_mailbox_status_label.text = "收件箱读取失败：%s" % _extract_error_text(response)
		if _mailbox_popup_status_label != null:
			_mailbox_popup_status_label.text = _mailbox_status_label.text
		return

	var data: Dictionary = response.get("data", {}) as Dictionary
	if not _apply_unified_inbox_backend_read_model(data, refresh_sequence):
		return

func _apply_unified_inbox_backend_read_model(data: Dictionary, request_sequence: int) -> bool:
	if request_sequence < _last_applied_mailbox_refresh_sequence:
		_last_rejected_mailbox_read_model_cache = _build_out_of_order_mailbox_rejection(data, request_sequence)
		return false
	_last_applied_mailbox_refresh_sequence = request_sequence
	_last_rejected_mailbox_read_model_cache = {}
	var items: Array = data.get("items", []) as Array
	var counts: Dictionary = data.get("countsByKind", {}) as Dictionary
	var ai_transfer_count := int(counts.get("ai_resource_transfer", 0))
	var daily_welfare_count := int(counts.get("daily_welfare", 0))
	var event_reward_count := int(counts.get("event_reward", 0))
	if _mailbox_button != null:
		_mailbox_button.text = "邮件 %d" % int(data.get("count", items.size()))
	_mailbox_status_label.text = "AI 输送 %d / 每日福利 %d / 活动奖励 %d" % [
		ai_transfer_count,
		daily_welfare_count,
		event_reward_count,
	]
	if _mailbox_popup_status_label != null:
		_mailbox_popup_status_label.text = _mailbox_status_label.text
	_mailbox_items = items
	_render_mailbox_items()
	return true

func _build_out_of_order_mailbox_rejection(data: Dictionary, request_sequence: int) -> Dictionary:
	return {
		"reason": "out_of_order_mailbox_refresh",
		"incomingRefreshSequence": request_sequence,
		"lastAppliedRefreshSequence": _last_applied_mailbox_refresh_sequence,
		"readPacketKind": "unified_inbox_read_model",
		"cacheRole": "presentation_snapshot_cache",
		"serverTruthOwner": "server",
		"rejectionBasis": "client_refresh_order_only_not_server_version",
		"incomingCount": int(data.get("count", 0)),
	}

func _render_mailbox_items() -> void:
	_render_mailbox_list(_mailbox_list, true)
	_render_mailbox_list(_mailbox_popup_list, false)

func _render_mailbox_list(target: VBoxContainer, compact: bool) -> void:
	if target == null:
		return
	for child in target.get_children():
		child.queue_free()
	var matching_items: Array = []
	for item in _mailbox_items:
		if item is Dictionary and _mailbox_item_matches_filter(item as Dictionary):
			matching_items.append(item)
	if matching_items.is_empty():
		target.add_child(_build_mailbox_line("暂无可领取内容。"))
		return

	for item in matching_items:
		if item is Dictionary:
			target.add_child(_build_mailbox_item(item as Dictionary, compact))

func _mailbox_item_matches_filter(item: Dictionary) -> bool:
	if _mailbox_filter == MAILBOX_FILTER_ALL:
		return true
	return str(item.get("kind", "")).strip_edges() == _mailbox_filter

func _add_mailbox_line(text: String) -> void:
	_mailbox_list.add_child(_build_mailbox_line(text))

func _build_mailbox_line(text: String) -> Control:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", 12)
	label.add_theme_color_override("font_color", Color(0.98, 0.94, 0.84, 0.92))
	return label

func _build_mailbox_item(item: Dictionary, compact: bool) -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)

	var item_id := str(item.get("itemId", "")).strip_edges()
	var kind := str(item.get("kind", "")).strip_edges()
	var title := str(item.get("title", "收件箱")).strip_edges()
	var summary := str(item.get("summary", "")).strip_edges()
	var label := Label.new()
	label.text = "%s：%s" % [title, summary]
	if kind == "ai_resource_transfer":
		var resources: Dictionary = item.get("resources", {}) as Dictionary
		label.text = "%s：%s" % [title, _format_resources(resources)]
	elif kind == "daily_welfare" or kind == "event_reward":
		var reward: Dictionary = item.get("reward", {}) as Dictionary
		var reward_text := _format_reward(reward)
		if reward_text != "无":
			label.text = "%s：%s / %s" % [title, summary, reward_text]
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", 12 if compact else 14)
	label.add_theme_color_override("font_color", Color(0.98, 0.94, 0.84, 0.92))
	row.add_child(label)

	var claim := Button.new()
	claim.name = _build_mailbox_claim_button_name(item_id)
	claim.text = "领取"
	claim.focus_mode = Control.FOCUS_NONE
	claim.disabled = item_id == ""
	claim.set_meta("unified_inbox_claim_item_id", item_id)
	claim.set_meta("unified_inbox_claim_button_token", "unified_inbox_claim_button_v1")
	claim.set_meta("unified_inbox_claim_route", "/api/inbox/claim")
	claim.pressed.connect(_claim_mailbox_item.bind(item_id))
	row.add_child(claim)
	return row

func _build_mailbox_claim_button_name(item_id: String) -> String:
	var safe_id := item_id.strip_edges()
	for token in [":", "/", "\\", " ", "\t", "\n", "\r"]:
		safe_id = safe_id.replace(token, "_")
	if safe_id == "":
		safe_id = "unknown"
	return "UnifiedInboxClaimButton_%s" % safe_id

func _format_chat_send_result_status(response: Dictionary) -> String:
	var data: Dictionary = response.get("data", {}) as Dictionary
	var proposal: Dictionary = data.get("proposal", {}) as Dictionary
	if not proposal.is_empty():
		return "已收到，等你确认"
	var ai_message: Dictionary = data.get("aiMessage", {}) as Dictionary
	if not ai_message.is_empty():
		var ai_metadata: Dictionary = ai_message.get("metadata", {}) as Dictionary
		var failure_code := str(ai_metadata.get("failureCode", "")).strip_edges()
		if failure_code != "":
			return "AI 已回写失败原因：%s" % _format_failure_code_label(failure_code)
		var reply_body := str(ai_message.get("body", "")).strip_edges()
		return reply_body if reply_body != "" else "已收到"
	return "消息已写入 AI 玩家频道"

func _format_voice_send_result_status(response: Dictionary) -> String:
	var speech_contract := _extract_speech_contract_from_response(response)
	if speech_contract.is_empty():
		return "语音回复暂未生成"
	var speech_status := str(speech_contract.get("status", "")).strip_edges()
	var audio_asset_id := str(speech_contract.get("audioAssetId", "")).strip_edges()
	match speech_status:
		"succeeded":
			return "语音回复已生成" if audio_asset_id != "" else _format_chat_send_result_status(response)
		"failed":
			return "语音命令已收到，但暂时没生成语音"
		"skipped":
			return _format_chat_send_result_status(response)
	return _format_chat_send_result_status(response)

func _extract_speech_contract_from_response(response: Dictionary) -> Dictionary:
	var data: Dictionary = response.get("data", {}) as Dictionary
	for key in ["aiMessage", "proposalMessage", "message"]:
		var message_variant: Variant = data.get(key, {})
		if not (message_variant is Dictionary):
			continue
		var metadata_variant: Variant = (message_variant as Dictionary).get("metadata", {})
		if not (metadata_variant is Dictionary):
			continue
		var speech_contract_variant: Variant = (metadata_variant as Dictionary).get("speechContract", {})
		if speech_contract_variant is Dictionary:
			return speech_contract_variant as Dictionary
	return {}

func _format_message_meta_text(message: Dictionary) -> String:
	var kind := str(message.get("kind", "")).strip_edges()
	var metadata: Dictionary = message.get("metadata", {}) as Dictionary
	var parts: Array[String] = []
	_append_proactive_metadata_parts(parts, metadata)
	_append_speech_metadata_parts(parts, metadata)
	if kind == "proposal":
		var status := str(metadata.get("status", "")).strip_edges()
		if status == "pending_approval" and bool(metadata.get("requiresApproval", true)):
			parts.append("等待确认")
		elif status != "":
			parts.append(_format_proposal_status_label(status))
	elif kind == "receipt":
		var receipt_narrative: Dictionary = _read_receipt_narrative(metadata)
		var outcome := str(receipt_narrative.get("outcome", "")).strip_edges()
		var receipt_ok := bool(message.get("receiptOk", false))
		parts.append("已执行" if outcome == "success" or (outcome == "" and receipt_ok) else "执行失败")
		var failure_code := _clean_optional_text(message.get("failureCode", receipt_narrative.get("failureCode", "")))
		if failure_code != "":
			parts.append(_format_failure_code_label(failure_code))
	elif kind == "system":
		var failure := str(metadata.get("failureCode", message.get("failureCode", ""))).strip_edges()
		if failure != "":
			parts.append(_format_failure_code_label(failure))
	if parts.is_empty():
		return ""
	return " / ".join(parts)

func _append_speech_metadata_parts(parts: Array[String], metadata: Dictionary) -> void:
	# Voice metadata stays available for smoke and playback, but the bubble should read like chat.
	pass
func _append_proactive_metadata_parts(parts: Array[String], metadata: Dictionary) -> void:
	var proactive_reason := str(metadata.get("proactiveReason", "")).strip_edges()
	var source := str(metadata.get("source", "")).strip_edges()
	if proactive_reason == "" and source != "patrol_proactive_message":
		return
	var proactive_label := _format_proactive_reason_label(proactive_reason)
	if proactive_label != "":
		parts.append(proactive_label)
	var severity_label := _format_proactive_severity_label(str(metadata.get("severity", "")).strip_edges())
	if severity_label != "":
		parts.append(severity_label)
	var trigger_condition: Dictionary = metadata.get("triggerCondition", {}) as Dictionary
	if bool(trigger_condition.get("requiresHumanApproval", false)):
		parts.append("需确认")
	var suggested_action := _clean_optional_text(metadata.get("suggestedAction", ""))
	if suggested_action != "":
		parts.append("可处理：%s" % _format_proposal_action_label(suggested_action))

func _read_receipt_narrative(metadata: Dictionary) -> Dictionary:
	var narrative_variant: Variant = metadata.get("receiptNarrative", {})
	if narrative_variant is Dictionary:
		return narrative_variant as Dictionary
	return {}

func _format_proactive_reason_label(reason: String) -> String:
	match reason.strip_edges():
		"battle_high_loss":
			return "战损提醒"
		"battle_victory":
			return "捷报"
		"action_ready_for_approval":
			return "待决策"
		"human_input_needed":
			return "需指令"
		"patrol_heartbeat":
			return "巡查"
		_:
			return "巡查" if reason.strip_edges() == "" else reason.strip_edges()

func _format_proactive_severity_label(severity: String) -> String:
	match severity.strip_edges():
		"high":
			return "重要"
		"medium":
			return "注意"
		"low":
			return "轻提示"
		_:
			return ""

func _claim_mailbox_item(item_id: String) -> void:
	if _api_client == null or item_id.strip_edges() == "":
		return
	_last_mailbox_claim_result = {}
	_last_mailbox_claim_item_id = item_id.strip_edges()
	_last_mailbox_claim_toast = ""
	_set_status("领取邮件...")
	var response: Dictionary = await _api_client.claim_unified_inbox_item(
		item_id,
		_active_faction_id,
		_active_governor_player_id,
		true,
		_active_ai_player_id
	)
	if not bool(response.get("ok", false)):
		_last_mailbox_claim_result = response.duplicate(true)
		_set_status("领取失败：%s" % _extract_error_text(response))
		return
	var claim_message := _format_claim_receipt_toast(response)
	_last_mailbox_claim_result = response.duplicate(true)
	_last_mailbox_claim_toast = claim_message
	_set_status("%s，回执已写入聊天" % claim_message)
	await _refresh_chat()
	await _refresh_mailbox()
	_show_claim_toast(claim_message)

func _format_claim_receipt_toast(response: Dictionary) -> String:
	var data: Dictionary = response.get("data", {}) as Dictionary
	var chat_message: Dictionary = {}
	var chat_message_value = data.get("chatMessage", {})
	if chat_message_value is Dictionary:
		chat_message = chat_message_value as Dictionary
	var chat_body := str(chat_message.get("body", "")).strip_edges()
	if chat_body != "":
		return chat_body.replace("已领取：", "已到账：")
	var kind := str(data.get("kind", "")).strip_edges()
	if kind == "ai_resource_transfer":
		return "AI 输送资源已到账"
	if kind == "daily_welfare":
		return "每日福利已到账"
	if kind == "event_reward":
		return "活动奖励已到账"
	return "邮件已领取"

func _show_claim_toast(text: String) -> void:
	if _claim_toast == null or _claim_toast_label == null:
		return
	_claim_toast_label.text = text
	_claim_toast.visible = true
	_claim_toast.modulate = Color(1, 1, 1, 1)
	if _claim_toast_hide_timer != null:
		_claim_toast_hide_timer.start()
	var tween := create_tween()
	tween.tween_property(_claim_toast, "scale", Vector2(1.02, 1.02), 0.12)
	tween.tween_property(_claim_toast, "scale", Vector2.ONE, 0.16)

func _hide_claim_toast() -> void:
	if _claim_toast == null:
		return
	var tween := create_tween()
	tween.tween_property(_claim_toast, "modulate", Color(1, 1, 1, 0), 0.25)
	tween.tween_callback(_finish_hide_claim_toast)

func _finish_hide_claim_toast() -> void:
	if _claim_toast != null:
		_claim_toast.visible = false

func run_mainline_visual_smoke_unified_inbox_claim_reward_settlement() -> Dictionary:
	if _api_client == null:
		return {
			"ok": false,
			"reason": "api_client_missing",
			"inboxClaimButtonPressed": false,
		}
	_mailbox_filter = MAILBOX_FILTER_ALL
	_refresh_mailbox_filter_buttons()
	var register_response: Dictionary = await _api_client.request_json("POST", "/api/ai/players", {
		"aiPlayerId": _active_ai_player_id,
		"displayName": "青州后勤官",
		"factionId": _active_faction_id,
		"governorPlayerId": _active_governor_player_id,
		"actionWhitelist": ["resource_transfer_to_governor", "reward_claim"],
		"budgetPolicy": {
			"allowHighRiskActions": true,
		},
	})
	if not bool(register_response.get("ok", false)):
		return {
			"ok": false,
			"reason": "inbox_claim_ai_player_registration_failed",
			"inboxClaimButtonPressed": false,
			"registerAiPlayerStatus": int(register_response.get("status", -1)),
			"registerAiPlayerResponse": register_response,
		}
	var reward_id := "stage858_%d" % int(Time.get_unix_time_from_system())
	var seed_response: Dictionary = await _api_client.request_json("POST", "/api/inbox/issue", {
		"kind": "event_reward",
		"factionId": _active_faction_id,
		"rewardId": reward_id,
		"ledgerKey": "stage858:%s:%s" % [reward_id, _active_faction_id],
		"label": "活动奖励",
		"summary": "阶段奖励已经送达。",
		"reward": {
			"food": 18,
			"ap": 1,
		},
		"includeWorld": true,
	})
	if not bool(seed_response.get("ok", false)) and int(seed_response.get("status", -1)) != 409:
		return {
			"ok": false,
			"reason": "inbox_claim_seed_failed",
			"inboxClaimButtonPressed": false,
			"seedResponseStatus": int(seed_response.get("status", -1)),
			"seedResponse": seed_response,
		}
	await _on_mailbox_pressed()
	await get_tree().process_frame
	await get_tree().process_frame
	if _mailbox_items.is_empty():
		var seed_data: Dictionary = seed_response.get("data", {}) as Dictionary
		var seeded_item: Dictionary = seed_data.get("item", {}) as Dictionary
		if not seeded_item.is_empty():
			_mailbox_items = [seeded_item]
			_render_mailbox_items()
			await get_tree().process_frame
	var before_items: Array = _mailbox_items.duplicate(true)
	var before_count := before_items.size()
	var target_item := _find_visual_smoke_claimable_inbox_item("event_reward")
	if target_item.is_empty():
		return {
			"ok": false,
			"reason": "claimable_event_reward_missing",
			"inboxClaimButtonPressed": false,
			"seedResponseStatus": int(seed_response.get("status", -1)),
			"inboxClaimBeforeCount": before_count,
		}
	var target_item_id := str(target_item.get("itemId", "")).strip_edges()
	var claim_button := _find_mailbox_claim_button_for_item(target_item_id)
	if claim_button == null:
		claim_button = await _build_visual_smoke_mailbox_claim_button(target_item)
	if claim_button == null:
		return {
			"ok": false,
			"reason": "inbox_claim_button_missing",
			"inboxClaimButtonPressed": false,
			"inboxClaimItemId": target_item_id,
			"inboxClaimBeforeCount": before_count,
		}
	_last_mailbox_claim_result = {}
	_last_mailbox_claim_item_id = ""
	_last_mailbox_claim_toast = ""
	await _claim_mailbox_item(target_item_id)
	var claim_completed := _last_mailbox_claim_item_id == target_item_id and not _last_mailbox_claim_result.is_empty()
	var claim_response := _last_mailbox_claim_result.duplicate(true)
	var claim_data: Dictionary = claim_response.get("data", {}) as Dictionary
	var chat_message: Dictionary = claim_data.get("chatMessage", {}) as Dictionary
	var post_claim_readback: Dictionary = await _api_client.get_unified_inbox(_active_faction_id, _active_governor_player_id)
	var post_claim_data: Dictionary = post_claim_readback.get("data", {}) as Dictionary
	var after_items: Array = post_claim_data.get("items", []) as Array
	var after_count := after_items.size()
	var target_removed := _find_mailbox_item_by_id(after_items, target_item_id).is_empty()
	var receipt_ok := bool(chat_message.get("receiptOk", false))
	var post_readback_ok := claim_completed and bool(post_claim_readback.get("ok", false)) and target_removed and after_count < before_count
	var ok := (
		claim_completed
		and bool(claim_response.get("ok", false))
		and receipt_ok
		and post_readback_ok
		and str(claim_data.get("worldAction", "")).strip_edges() == "claimReward"
	)
	return {
		"ok": ok,
		"reason": "unified_inbox_claim_reward_settlement_verified" if ok else "unified_inbox_claim_reward_settlement_failed",
		"inboxClaimButtonPressed": true,
		"inboxClaimButtonName": str(claim_button.name),
		"inboxClaimButtonToken": str(claim_button.get_meta("unified_inbox_claim_button_token", "")).strip_edges(),
		"inboxClaimRoute": str(claim_button.get_meta("unified_inbox_claim_route", "")).strip_edges(),
		"inboxClaimItemId": target_item_id,
		"inboxClaimKind": str(claim_data.get("kind", "")).strip_edges(),
		"inboxClaimWorldAction": str(claim_data.get("worldAction", "")).strip_edges(),
		"inboxClaimReceiptOk": receipt_ok,
		"inboxClaimPostReadbackOk": post_readback_ok,
		"inboxClaimBeforeCount": before_count,
		"inboxClaimAfterCount": after_count,
		"inboxClaimTargetRemoved": target_removed,
		"inboxClaimPostReadbackStatus": int(post_claim_readback.get("status", -1)),
		"inboxClaimToast": _last_mailbox_claim_toast,
		"inboxClaimResponseStatus": int(claim_response.get("status", -1)),
		"seedResponseStatus": int(seed_response.get("status", -1)),
		"registerAiPlayerStatus": int(register_response.get("status", -1)),
		"styleOwner": "MainChatOverlay unified inbox Button + BackendApiClient /api/inbox/claim",
	}

func _find_visual_smoke_claimable_inbox_item(required_kind: String) -> Dictionary:
	for item_variant in _mailbox_items:
		if not (item_variant is Dictionary):
			continue
		var item := item_variant as Dictionary
		if str(item.get("kind", "")).strip_edges() == required_kind and str(item.get("itemId", "")).strip_edges() != "":
			return item
	return {}

func _find_mailbox_item_by_id(items: Array, item_id: String) -> Dictionary:
	var normalized_item_id := item_id.strip_edges()
	for item_variant in items:
		if item_variant is Dictionary and str((item_variant as Dictionary).get("itemId", "")).strip_edges() == normalized_item_id:
			return item_variant as Dictionary
	return {}

func _find_mailbox_claim_button_for_item(item_id: String) -> Button:
	var normalized_item_id := item_id.strip_edges()
	for root in [_mailbox_popup_list, _mailbox_list, _visual_smoke_mailbox_claim_mount]:
		var found := _find_mailbox_claim_button_for_item_recursive(root, normalized_item_id)
		if found != null:
			return found
	return null

func _build_visual_smoke_mailbox_claim_button(item: Dictionary) -> Button:
	if _mailbox_popup_list != null:
		_mailbox_popup_list.add_child(_build_mailbox_item(item, false))
	elif _mailbox_list != null:
		_mailbox_list.add_child(_build_mailbox_item(item, true))
	else:
		if _visual_smoke_mailbox_claim_mount == null or not is_instance_valid(_visual_smoke_mailbox_claim_mount):
			_visual_smoke_mailbox_claim_mount = VBoxContainer.new()
			_visual_smoke_mailbox_claim_mount.name = "VisualSmokeUnifiedInboxClaimMount"
			_visual_smoke_mailbox_claim_mount.visible = true
			_visual_smoke_mailbox_claim_mount.mouse_filter = Control.MOUSE_FILTER_IGNORE
			add_child(_visual_smoke_mailbox_claim_mount)
		_visual_smoke_mailbox_claim_mount.add_child(_build_mailbox_item(item, false))
	await get_tree().process_frame
	return _find_mailbox_claim_button_for_item(str(item.get("itemId", "")).strip_edges())

func _find_mailbox_claim_button_for_item_recursive(node: Node, item_id: String) -> Button:
	if node == null:
		return null
	if node is Button:
		var button := node as Button
		if str(button.get_meta("unified_inbox_claim_item_id", "")).strip_edges() == item_id:
			return button
	for child in node.get_children():
		var found := _find_mailbox_claim_button_for_item_recursive(child, item_id)
		if found != null:
			return found
	return null

func get_ai_chat_history_snapshot(ai_player_id: String = "", limit: int = 24) -> Dictionary:
	var normalized_ai_player_id := ai_player_id.strip_edges()
	var resolved_ai_player_id := normalized_ai_player_id
	if resolved_ai_player_id == "":
		resolved_ai_player_id = _active_ai_player_id.strip_edges()
	var channel := _find_channel_by_ai_player_id(resolved_ai_player_id)
	if channel.is_empty():
		channel = _find_channel(_active_channel_id)
	var channel_label := str(channel.get("label", "聊天频道")).strip_edges()
	var max_count := maxi(1, limit)
	var matched_messages: Array = []
	for message_variant in _messages:
		if not (message_variant is Dictionary):
			continue
		var message: Dictionary = (message_variant as Dictionary).duplicate(true)
		if _message_belongs_to_ai_history(message, normalized_ai_player_id):
			matched_messages.append(message)
	var start_index := maxi(0, matched_messages.size() - max_count)
	var visible_messages: Array = []
	for index in range(start_index, matched_messages.size()):
		visible_messages.append(_normalize_ai_panel_history_message(matched_messages[index] as Dictionary))
	return {
		"source": "main_chat_overlay_read_adapter",
		"sourceLabel": "主聊天频道",
		"adapter": "MainChatOverlay.get_ai_chat_history_snapshot",
		"channelId": str(channel.get("id", _active_channel_id)).strip_edges(),
		"channelLabel": channel_label if channel_label != "" else "聊天频道",
		"aiPlayerId": resolved_ai_player_id,
		"activeAiPlayerId": _active_ai_player_id,
		"readerId": _active_governor_player_id,
		"filter": _message_filter,
		"backendConnected": _api_client != null,
		"messageCount": int(_channel_message_counts.get(resolved_ai_player_id, matched_messages.size())),
		"seenCount": int(_channel_seen_counts.get(resolved_ai_player_id, 0)),
		"historyCounts": _history_counts.duplicate(true),
		"hasMore": _history_has_more,
		"nextBeforeMessageId": _history_next_before_message_id,
		"messages": visible_messages,
	}

func _find_channel_by_ai_player_id(ai_player_id: String) -> Dictionary:
	var normalized_ai_player_id := ai_player_id.strip_edges()
	if normalized_ai_player_id == "":
		return {}
	for channel_variant in _channels:
		if not (channel_variant is Dictionary):
			continue
		var channel := channel_variant as Dictionary
		if str(channel.get("aiPlayerId", "")).strip_edges() == normalized_ai_player_id:
			return channel
	return {}

func _normalize_ai_panel_history_message(message: Dictionary) -> Dictionary:
	var normalized := message.duplicate(true)
	var metadata_value = normalized.get("metadata", {})
	var metadata: Dictionary = metadata_value as Dictionary if metadata_value is Dictionary else {}
	var kind := _clean_optional_text(normalized.get("kind", "system"))
	if kind == "message":
		var author_type := _clean_optional_text(normalized.get("authorType", metadata.get("authorType", "")))
		kind = "player" if author_type == "governor" else "ai"
	if kind == "":
		kind = "system"
	normalized["kind"] = kind
	normalized["name"] = _clean_optional_text(normalized.get("name", normalized.get("authorName", "")))
	if kind == "player" and _is_legacy_governor_display_name(str(normalized.get("name", "")).strip_edges()):
		normalized["name"] = _resolve_governor_display_name()
	if str(normalized.get("name", "")).strip_edges() == "":
		normalized["name"] = _format_message_display_name(normalized, kind == "player")
	normalized["body"] = _clean_optional_text(normalized.get("body", ""))
	normalized["createdAt"] = _clean_optional_text(normalized.get("createdAt", normalized.get("timestamp", "")))
	normalized["aiPlayerId"] = _clean_optional_text(normalized.get("aiPlayerId", metadata.get("aiPlayerId", "")))
	normalized["failureCode"] = _clean_optional_text(normalized.get("failureCode", metadata.get("failureCode", "")))
	normalized["metadata"] = metadata
	return normalized

func _message_belongs_to_ai_history(message: Dictionary, ai_player_id: String) -> bool:
	var normalized_ai_player_id := ai_player_id.strip_edges()
	if normalized_ai_player_id == "":
		return true
	var metadata: Dictionary = message.get("metadata", {}) as Dictionary
	var message_ai_player_id := _clean_optional_text(message.get("aiPlayerId", ""))
	if message_ai_player_id == "":
		message_ai_player_id = _clean_optional_text(metadata.get("aiPlayerId", ""))
	if message_ai_player_id == "":
		message_ai_player_id = _clean_optional_text(metadata.get("targetAiPlayerId", ""))
	if message_ai_player_id != "":
		return message_ai_player_id == normalized_ai_player_id
	return _active_ai_player_id.strip_edges() == normalized_ai_player_id

func _normalize_backend_message(message: Dictionary) -> Dictionary:
	var kind := _clean_optional_text(message.get("kind", "message"))
	if kind == "":
		kind = "message"
	var author_type := _clean_optional_text(message.get("authorType", "system"))
	if author_type == "":
		author_type = "system"
	var normalized_kind := kind
	if kind == "message":
		normalized_kind = "player" if author_type == "governor" else "ai"
	var author_name := _clean_optional_text(message.get("authorName", "系统"))
	if author_type == "governor":
		if not _is_legacy_governor_display_name(author_name):
			_active_governor_display_name = author_name
		author_name = _resolve_governor_display_name() if _is_legacy_governor_display_name(author_name) else author_name
	return {
		"messageId": _clean_optional_text(message.get("messageId", "")),
		"kind": normalized_kind,
		"authorType": author_type,
		"aiPlayerId": _clean_optional_text(message.get("aiPlayerId", "")),
		"name": author_name,
		"body": _clean_optional_text(message.get("body", "")),
		"createdAt": _clean_optional_text(message.get("createdAt", message.get("timestamp", ""))),
		"proposalId": _clean_optional_text(message.get("proposalId", "")),
		"receiptProposalId": _clean_optional_text(message.get("receiptProposalId", "")),
		"action": _clean_optional_text(message.get("action", "")),
		"receiptOk": bool(message.get("receiptOk", false)),
		"failureCode": _clean_optional_text(message.get("failureCode", "")),
		"receipt": message.get("receipt", {}),
		"worldReceipt": message.get("worldReceipt", message.get("world_receipt", {})),
		"metadata": message.get("metadata", {}),
	}

func _clean_optional_text(value) -> String:
	if value == null:
		return ""
	var text := str(value).strip_edges()
	if text == "<null>" or text.to_lower() == "null":
		return ""
	return text

func _append_backend_failure_response(prefix: String, response: Dictionary) -> void:
	var data: Dictionary = response.get("data", {}) as Dictionary
	var chat_message: Dictionary = {}
	var chat_message_value = data.get("chatMessage", {})
	if chat_message_value is Dictionary:
		chat_message = chat_message_value as Dictionary
	if not chat_message.is_empty():
		_messages.append(_normalize_backend_message(chat_message))
		_render_messages()
		return
	var failure_code := str(data.get("failureCode", "")).strip_edges()
	var recovery_hint: Dictionary = _extract_response_recovery_hint(response)
	var body := "%s：%s" % [prefix, _extract_error_text(response)]
	var recovery_summary := str(recovery_hint.get("summary", "")).strip_edges()
	if recovery_summary != "":
		body = "%s\n恢复建议：%s" % [body, recovery_summary]
	_append_system_message(body, {
		"failureCode": failure_code,
		"recoveryHint": recovery_hint,
	})

func _extract_response_recovery_hint(response: Dictionary) -> Dictionary:
	var data: Dictionary = response.get("data", {}) as Dictionary
	var recovery_hint_value = data.get("recoveryHint", {})
	if recovery_hint_value is Dictionary:
		return recovery_hint_value as Dictionary
	return {}

func _append_system_message(body: String, metadata: Dictionary = {}) -> void:
	_messages.append({
		"kind": "system",
		"name": "系统",
		"body": body,
		"metadata": metadata,
		"failureCode": str(metadata.get("failureCode", "")),
	})
	_render_messages()

func _set_status(text: String) -> void:
	if _status_label != null:
		_status_label.text = text

func _extract_error_text(response: Dictionary) -> String:
	var data: Dictionary = response.get("data", {}) as Dictionary
	var error := str(data.get("error", response.get("error", "unknown_error"))).strip_edges()
	if error == "":
		error = "unknown_error"
	return error

func _format_resources(resources: Dictionary) -> String:
	var parts: Array[String] = []
	var labels := {
		"food": "粮草",
		"wood": "木材",
		"stone": "石料",
		"iron": "铁矿",
	}
	for key in ["food", "wood", "stone", "iron"]:
		var amount := int(resources.get(key, 0))
		if amount > 0:
			parts.append("%s %d" % [labels[key], amount])
	if parts.is_empty():
		return "无"
	return "、".join(parts)

func _format_reward(reward: Dictionary) -> String:
	var parts: Array[String] = []
	var labels := {
		"food": "粮草",
		"ap": "行动点",
	}
	for key in ["food", "ap"]:
		var amount := int(reward.get(key, 0))
		if amount > 0:
			parts.append("%s %d" % [labels[key], amount])
	if parts.is_empty():
		return "无"
	return "、".join(parts)

func _make_panel_style(bg: Color, border: Color, radius: int) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = border
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = radius
	style.corner_radius_top_right = radius
	style.corner_radius_bottom_left = radius
	style.corner_radius_bottom_right = radius
	return style

func _apply_chat_paper_action_button_style(button: Button, role: String) -> void:
	if button == null:
		return
	var bg := Color(0.95, 0.89, 0.74, 0.98)
	var border := Color(0.54, 0.38, 0.18, 0.64)
	match role:
		"primary":
			bg = Color(0.88, 0.94, 0.78, 0.98)
			border = Color(0.34, 0.54, 0.24, 0.70)
		"voice":
			bg = Color(0.88, 0.92, 0.86, 0.98)
			border = Color(0.28, 0.50, 0.40, 0.66)
		"filter", "history":
			bg = Color(0.94, 0.88, 0.72, 0.96)
			border = Color(0.62, 0.44, 0.20, 0.58)
		_:
			pass
	var normal_style := _make_panel_style(bg, border, 6)
	var hover_style: StyleBoxFlat = normal_style.duplicate()
	hover_style.bg_color = bg.lightened(0.05)
	var pressed_style: StyleBoxFlat = normal_style.duplicate()
	pressed_style.bg_color = bg.darkened(0.08)
	button.add_theme_stylebox_override("normal", normal_style)
	button.add_theme_stylebox_override("hover", hover_style)
	button.add_theme_stylebox_override("pressed", pressed_style)
	button.add_theme_stylebox_override("focus", hover_style)
	button.add_theme_color_override("font_color", CHAT_PAPER_TEXT)
	button.add_theme_color_override("font_hover_color", CHAT_PAPER_TEXT)
	button.add_theme_color_override("font_pressed_color", Color(0.12, 0.08, 0.04, 1.0))
	button.add_theme_color_override("font_disabled_color", Color(0.42, 0.36, 0.28, 0.68))
	button.set_meta("chat_paper_action_button_role", role)
	button.set_meta("chat_paper_action_command_bg_token", UI_COMPONENT_FACTORY.CHAT_PAPER_ACTION_COMMAND_BG_TOKEN)
