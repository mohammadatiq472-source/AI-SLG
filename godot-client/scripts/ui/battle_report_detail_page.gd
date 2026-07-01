extends Control
class_name BattleReportDetailPage

signal back_requested
signal detail_tab_selected(tab_id: String)
signal coordinate_jump_requested(payload: Dictionary)
signal replay_requested(payload: Dictionary)

const DEFAULT_DETAIL_TAB_ID := "battlefield"
const DEFAULT_DETAIL_STATE_TITLE := "壳层状态"
const DEFAULT_REPLAY_LABEL := "战况回放"
const DETAIL_BUTTON_LIVE_TEXT_CONTRACT := "battle_report_detail_button_live_text_v1"
const BATTLE_REPORT_DETAIL_EMPTY_FEEDBACK_COPY_CONTRACT := "battle_report_empty_feedback_player_copy_v1"
const BATTLE_REPORT_ICON := preload("res://assets/themes/slgclient/source/svg_shell_icons/battle_report.svg")
const BattleReportPortraitRegistryScript := preload("res://scripts/ui/battle_report_portrait_registry.gd")
const BATTLE_REPORT_UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")

@onready var _detail_margin: MarginContainer = $DetailMargin
@onready var _detail_column: VBoxContainer = $DetailMargin/DetailColumn
@onready var _attacker_header_card: PanelContainer = $DetailMargin/DetailColumn/SOM_D01_D02_TopRow/SOM_D01_AttackerHeaderCard
@onready var _attacker_power_label: Label = $DetailMargin/DetailColumn/SOM_D01_D02_TopRow/SOM_D01_AttackerHeaderCard/AttackerHeaderMargin/AttackerHeaderColumn/AttackerPowerLabel
@onready var _attacker_power_bar: ProgressBar = $DetailMargin/DetailColumn/SOM_D01_D02_TopRow/SOM_D01_AttackerHeaderCard/AttackerHeaderMargin/AttackerHeaderColumn/AttackerPowerBar
@onready var _attacker_name_label: Label = $DetailMargin/DetailColumn/SOM_D01_D02_TopRow/SOM_D01_AttackerHeaderCard/AttackerHeaderMargin/AttackerHeaderColumn/AttackerNameLabel
@onready var _result_header_card: PanelContainer = $DetailMargin/DetailColumn/SOM_D01_D02_TopRow/SOM_D02_ResultHeaderCard
@onready var _result_label: Label = $DetailMargin/DetailColumn/SOM_D01_D02_TopRow/SOM_D02_ResultHeaderCard/ResultHeaderMargin/ResultHeaderColumn/ResultLabel
@onready var _outcome_note_label: Label = $DetailMargin/DetailColumn/SOM_D01_D02_TopRow/SOM_D02_ResultHeaderCard/ResultHeaderMargin/ResultHeaderColumn/OutcomeNoteLabel
@onready var _defender_header_card: PanelContainer = $DetailMargin/DetailColumn/SOM_D01_D02_TopRow/SOM_D01_DefenderHeaderCard
@onready var _defender_power_label: Label = $DetailMargin/DetailColumn/SOM_D01_D02_TopRow/SOM_D01_DefenderHeaderCard/DefenderHeaderMargin/DefenderHeaderColumn/DefenderPowerLabel
@onready var _defender_power_bar: ProgressBar = $DetailMargin/DetailColumn/SOM_D01_D02_TopRow/SOM_D01_DefenderHeaderCard/DefenderHeaderMargin/DefenderHeaderColumn/DefenderPowerBar
@onready var _defender_name_label: Label = $DetailMargin/DetailColumn/SOM_D01_D02_TopRow/SOM_D01_DefenderHeaderCard/DefenderHeaderMargin/DefenderHeaderColumn/DefenderNameLabel
@onready var _battle_row: HBoxContainer = $DetailMargin/DetailColumn/SOM_D03_D05_BattleRow
@onready var _attacker_hero_row: HBoxContainer = $DetailMargin/DetailColumn/SOM_D03_D05_BattleRow/SOM_D03_AttackerHeroRow
@onready var _outcome_center_card: PanelContainer = $DetailMargin/DetailColumn/SOM_D03_D05_BattleRow/SOM_D04_OutcomeCenterCard
@onready var _reward_title: Label = $DetailMargin/DetailColumn/SOM_D03_D05_BattleRow/SOM_D04_OutcomeCenterCard/OutcomeCenterMargin/OutcomeCenterColumn/RewardTitle
@onready var _reward_body: Label = $DetailMargin/DetailColumn/SOM_D03_D05_BattleRow/SOM_D04_OutcomeCenterCard/OutcomeCenterMargin/OutcomeCenterColumn/RewardBody
@onready var _replay_button: Button = $DetailMargin/DetailColumn/SOM_D03_D05_BattleRow/SOM_D04_OutcomeCenterCard/OutcomeCenterMargin/OutcomeCenterColumn/ReplayButton
@onready var _defender_hero_row: HBoxContainer = $DetailMargin/DetailColumn/SOM_D03_D05_BattleRow/SOM_D05_DefenderHeroRow
@onready var _morale_row: HBoxContainer = $DetailMargin/DetailColumn/SOM_D06_MoraleRow
@onready var _attacker_morale_label: Label = $DetailMargin/DetailColumn/SOM_D06_MoraleRow/AttackerMoraleLabel
@onready var _defender_morale_label: Label = $DetailMargin/DetailColumn/SOM_D06_MoraleRow/DefenderMoraleLabel
@onready var _detail_section_card: PanelContainer = $DetailMargin/DetailColumn/SOM_D07_DetailSectionCard
@onready var _detail_section_column: VBoxContainer = $DetailMargin/DetailColumn/SOM_D07_DetailSectionCard/DetailSectionMargin/DetailSectionColumn
@onready var _detail_section_title: Label = $DetailMargin/DetailColumn/SOM_D07_DetailSectionCard/DetailSectionMargin/DetailSectionColumn/DetailSectionTitle
@onready var _detail_state_card: PanelContainer = $DetailMargin/DetailColumn/SOM_D07_DetailSectionCard/DetailSectionMargin/DetailSectionColumn/SOM_D07_StateCard
@onready var _detail_state_title_label: Label = $DetailMargin/DetailColumn/SOM_D07_DetailSectionCard/DetailSectionMargin/DetailSectionColumn/SOM_D07_StateCard/DetailStateMargin/DetailStateColumn/DetailStateTitleLabel
@onready var _detail_state_flow: HFlowContainer = $DetailMargin/DetailColumn/SOM_D07_DetailSectionCard/DetailSectionMargin/DetailSectionColumn/SOM_D07_StateCard/DetailStateMargin/DetailStateColumn/DetailStateFlow
@onready var _detail_section_body: Label = $DetailMargin/DetailColumn/SOM_D07_DetailSectionCard/DetailSectionMargin/DetailSectionColumn/DetailSectionBody
@onready var _share_button: Button = $DetailMargin/DetailColumn/SOM_D08_D10_BottomRow/SOM_D08_ShareButton
@onready var _favorite_button: Button = $DetailMargin/DetailColumn/SOM_D08_D10_BottomRow/SOM_D08_FavoriteButton
@onready var _battlefield_tab_button: Button = $DetailMargin/DetailColumn/SOM_D08_D10_BottomRow/SOM_D09_FooterTabRow/BattlefieldTabButton
@onready var _stats_tab_button: Button = $DetailMargin/DetailColumn/SOM_D08_D10_BottomRow/SOM_D09_FooterTabRow/StatsTabButton
@onready var _formation_tab_button: Button = $DetailMargin/DetailColumn/SOM_D08_D10_BottomRow/SOM_D09_FooterTabRow/FormationTabButton
@onready var _collapse_button: Button = $DetailMargin/DetailColumn/SOM_D08_D10_BottomRow/SOM_D10_CollapseButton

var _page_payload: Dictionary = {}
var _detail_page_contract: Dictionary = {}
var _active_detail_tab_id: String = DEFAULT_DETAIL_TAB_ID
var _detail_page_scroll: ScrollContainer = null
var _detail_section_content: VBoxContainer = null
var _below_fold_spacer: Control = null
var _below_fold_section_card: PanelContainer = null
var _below_fold_content: VBoxContainer = null

func _ready() -> void:
	_replay_button.pressed.connect(_on_replay_button_pressed)
	_share_button.pressed.connect(_on_share_button_pressed)
	_favorite_button.pressed.connect(_on_favorite_button_pressed)
	_battlefield_tab_button.pressed.connect(_on_detail_tab_pressed.bind("battlefield"))
	_stats_tab_button.pressed.connect(_on_detail_tab_pressed.bind("stats"))
	_formation_tab_button.pressed.connect(_on_detail_tab_pressed.bind("formation"))
	_collapse_button.pressed.connect(_on_collapse_button_pressed)
	_replay_button.icon = BATTLE_REPORT_ICON
	_replay_button.expand_icon = true
	_replay_button.icon_alignment = HORIZONTAL_ALIGNMENT_LEFT
	_replay_button.add_theme_constant_override("h_separation", 8)
	_ensure_detail_page_scroll()
	_apply_static_styling()
	_ensure_detail_section_content()
	_ensure_below_fold_content()
	_ensure_first_open_stamp_motion()
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_motion_battle_report_enter(_detail_column, 0)
	_refresh_view()

func set_page_payload(page_payload: Dictionary) -> void:
	_page_payload = page_payload.duplicate(true)
	_detail_page_contract = _page_payload.get("page_contract", {}) as Dictionary
	_active_detail_tab_id = str(_page_payload.get("active_tab_id", DEFAULT_DETAIL_TAB_ID)).strip_edges()
	if _active_detail_tab_id == "":
		_active_detail_tab_id = DEFAULT_DETAIL_TAB_ID
	_refresh_view()

func _refresh_view() -> void:
	var detail_page_contract := _detail_page_contract
	var shared_state := _coerce_dictionary(_page_payload.get("shared_state", {}))
	if detail_page_contract.is_empty():
		detail_page_contract = {}
	var detail_frame_contract := _resolve_detail_frame_contract(detail_page_contract)
	_attacker_power_label.text = str(detail_frame_contract.get("attacker_power_label", "兵力：--"))
	_attacker_name_label.text = str(detail_frame_contract.get("attacker_team_label", "我方队伍"))
	_result_label.text = str(detail_frame_contract.get("result_text", "暂无"))
	_outcome_note_label.text = str(detail_frame_contract.get("outcome_note", ""))
	_outcome_note_label.visible = bool(detail_frame_contract.get("show_outcome_note", false))
	_defender_power_label.text = str(detail_frame_contract.get("defender_power_label", "兵力：--"))
	_defender_name_label.text = str(detail_frame_contract.get("defender_team_label", "敌方队伍"))
	_reward_title.text = str(detail_frame_contract.get("reward_title", "获得奖励"))
	_reward_body.text = "\n".join(_coerce_string_array(detail_frame_contract.get("reward_lines", [])))
	_replay_button.text = str(detail_frame_contract.get("replay_label", DEFAULT_REPLAY_LABEL))
	_replay_button.visible = bool(detail_frame_contract.get("show_replay_button", false))
	_replay_button.disabled = not _replay_button.visible
	_attacker_morale_label.text = str(detail_frame_contract.get("attacker_morale_label", "士气：--"))
	_defender_morale_label.text = str(detail_frame_contract.get("defender_morale_label", "士气：--"))
	_morale_row.visible = false
	_share_button.text = str(detail_frame_contract.get("share_label", "分享"))
	_favorite_button.text = str(detail_frame_contract.get("favorite_label", "收藏"))
	_apply_progress_bar_values(_attacker_power_bar, int(detail_frame_contract.get("attacker_power_current", 0)), int(detail_frame_contract.get("attacker_power_max", 1)), Color(0.28, 0.52, 0.88, 0.98))
	_apply_progress_bar_values(_defender_power_bar, int(detail_frame_contract.get("defender_power_current", 0)), int(detail_frame_contract.get("defender_power_max", 1)), Color(0.73, 0.20, 0.20, 0.96))
	_rebuild_detail_hero_row(_attacker_hero_row, detail_frame_contract.get("attacker_slots", []), false)
	_rebuild_detail_hero_row(_defender_hero_row, detail_frame_contract.get("defender_slots", []), true)
	_refresh_detail_tab_buttons()
	_refresh_shared_state(shared_state, detail_frame_contract)
	_share_button.disabled = _is_empty_state_preview(shared_state)
	_favorite_button.disabled = _is_empty_state_preview(shared_state)
	_collapse_button.text = _resolve_collapse_button_text(shared_state)
	_refresh_detail_button_governance()
	_rebuild_detail_section(detail_page_contract)

func _resolve_detail_frame_contract(detail_page_contract: Dictionary) -> Dictionary:
	var detail_frame_contract := _coerce_dictionary(detail_page_contract.get("detail_frame_contract", {}))
	return detail_frame_contract if not detail_frame_contract.is_empty() else detail_page_contract

func _refresh_shared_state(_shared_state: Dictionary, _detail_frame_contract: Dictionary) -> void:
	_clear_children(_detail_state_flow)
	_detail_state_card.visible = false

func _build_shared_state_chip(title: String, value: String, accent_color: Color, node_name: String = "") -> Control:
	var panel := PanelContainer.new()
	if node_name != "":
		panel.name = node_name
	panel.custom_minimum_size = Vector2(120, 0)
	_apply_panel_linework(panel, Color(0.12, 0.12, 0.14, 0.94), Color(0.30, 0.30, 0.32, 0.92))

	var margin := MarginContainer.new()
	_apply_margin(margin, 8, 6, 8, 6)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 2)
	margin.add_child(column)

	var title_label := Label.new()
	title_label.text = title
	title_label.add_theme_font_size_override("font_size", 11)
	title_label.add_theme_color_override("font_color", Color(0.72, 0.72, 0.74, 0.96))
	column.add_child(title_label)

	var value_label := Label.new()
	value_label.text = value
	value_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	value_label.custom_minimum_size = Vector2(100, 0)
	value_label.add_theme_font_size_override("font_size", 13)
	value_label.add_theme_color_override("font_color", accent_color)
	column.add_child(value_label)
	return panel

func _resolve_shared_state_text(shared_state: Dictionary, key: String, detail_frame_contract: Dictionary) -> String:
	match key:
		"page_id":
			var page_label := str(shared_state.get("page_id_label", "")).strip_edges()
			if page_label != "":
				return page_label
			match str(shared_state.get(key, "")).strip_edges():
				"detail":
					return "详情页"
				"list":
					return "列表页"
				_:
					return "未定"
		"list_mode":
			var list_mode_label := str(shared_state.get("list_mode_label", "")).strip_edges()
			if list_mode_label != "":
				return list_mode_label
			match str(shared_state.get(key, "")).strip_edges():
				"favorite":
					return "收藏"
				"personal":
					return "个人"
				_:
					return "未定"
		"selected_report":
			var selected_report_label := str(shared_state.get("selected_report_label", "")).strip_edges()
			if selected_report_label != "":
				return _truncate_text(selected_report_label, 24)
			var report_count := maxi(int(shared_state.get("report_count", 0)), 0)
			var report_id := str(shared_state.get(key, "")).strip_edges()
			if report_id == "":
				return "结构预览" if report_count <= 0 else "未选择"
			var attacker := str(detail_frame_contract.get("attacker_team_label", "")).strip_edges()
			var defender := str(detail_frame_contract.get("defender_team_label", "")).strip_edges()
			if attacker != "" and defender != "":
				return _truncate_text("%s vs %s" % [attacker, defender], 24)
			return _truncate_text(report_id, 24)
		"detail_tab":
			var detail_tab_label := str(shared_state.get("detail_tab_label", "")).strip_edges()
			if detail_tab_label != "":
				return detail_tab_label
			match str(shared_state.get(key, "")).strip_edges():
				"stats":
					return "统计"
				"formation":
					return "阵容详情"
				"battlefield":
					return "战斗地点"
				_:
					return "未定"
		"report_count":
			var report_count_label := str(shared_state.get("report_count_label", "")).strip_edges()
			if report_count_label != "":
				return report_count_label
			return "%s 条" % str(maxi(int(shared_state.get(key, 0)), 0))
		_:
			var text := str(shared_state.get(key, "")).strip_edges()
			return text if text != "" else "未定"

func _resolve_collapse_button_text(shared_state: Dictionary) -> String:
	var list_mode := str(shared_state.get("list_mode", "")).strip_edges()
	if list_mode == "favorite":
		return "返回收藏"
	return "返回列表"

func _is_empty_state_preview(shared_state: Dictionary) -> bool:
	return maxi(int(shared_state.get("report_count", 0)), 0) <= 0

func _truncate_text(text: String, max_length: int) -> String:
	if text.length() <= max_length:
		return text
	return "%s…" % text.substr(0, maxi(max_length - 1, 1))

func _rebuild_detail_section(detail_page_contract: Dictionary) -> void:
	_clear_children(_detail_section_content)
	var page_contract := _resolve_detail_page_contract(detail_page_contract)
	_detail_section_title.text = str(page_contract.get("page_label", _resolve_detail_tab_title())).strip_edges()
	if _detail_section_title.text == "":
		_detail_section_title.text = _resolve_detail_tab_title()
	_detail_section_body.text = str(page_contract.get("summary", "暂无可显示详情。")).strip_edges()
	if _detail_section_body.text == "":
		_detail_section_body.text = "暂无可显示详情。"
	_detail_section_body.visible = not bool(page_contract.get("hide_summary_body", false))
	var compact_detail_section := bool(page_contract.get("hide_summary_body", false))
	_detail_section_card.custom_minimum_size = Vector2(0, 96 if bool(page_contract.get("empty_content_ok", false)) else (132 if compact_detail_section else 176))
	_rebuild_detail_page_blocks(page_contract, _resolve_detail_frame_contract(detail_page_contract))
	_rebuild_below_fold_blocks(page_contract, _resolve_detail_frame_contract(detail_page_contract))

func _resolve_detail_page_contract(detail_page_contract: Dictionary) -> Dictionary:
	var detail_pages := _coerce_dictionary(detail_page_contract.get("detail_pages", {}))
	var page_contract := _coerce_dictionary(detail_pages.get(_active_detail_tab_id, {}))
	if not page_contract.is_empty():
		return page_contract
	return {
		"page_id": _active_detail_tab_id,
		"page_label": _resolve_detail_tab_title(),
		"summary": "暂无可显示详情。",
		"content_blocks": [
			{
				"kind": "info_card",
				"title": _resolve_detail_tab_title(),
				"accent_key": "generic",
				"node_name": "BattleReportDetailFallbackCard",
				"lines": ["战报详情暂未送达。"],
			},
		],
	}

func _rebuild_detail_page_blocks(page_contract: Dictionary, detail_frame_contract: Dictionary) -> void:
	var content_blocks := page_contract.get("content_blocks", []) as Array
	if content_blocks.is_empty():
		if bool(page_contract.get("empty_content_ok", false)):
			return
		_detail_section_content.add_child(_build_detail_info_card("战报详情", ["战报详情暂未送达。"], _resolve_accent_color("generic"), "BattleReportDetailFallbackCard"))
		return
	for block_variant in content_blocks:
		if not (block_variant is Dictionary):
			continue
		var block := _build_detail_page_block(block_variant as Dictionary, detail_frame_contract)
		if block != null:
			_detail_section_content.add_child(block)

func _build_detail_page_block(block_payload: Dictionary, detail_frame_contract: Dictionary) -> Control:
	var kind := str(block_payload.get("kind", "info_card")).strip_edges()
	var node_name := str(block_payload.get("node_name", "")).strip_edges()
	match kind:
		"ai_living_feedback_card":
			return _build_ai_living_feedback_card(block_payload)
		"roster_card":
			return _build_detail_roster_card(
				str(block_payload.get("title", "阵容详情")),
				_resolve_roster_block_slots(block_payload, detail_frame_contract),
				bool(block_payload.get("is_defender", false)),
				node_name
			)
		"structure_group":
			return _build_structure_group_block(block_payload)
		"stats_grid":
			return _build_stats_grid_block(block_payload)
		"round_timeline":
			return _build_round_timeline_block(block_payload)
		_:
			var meta_rows := block_payload.get("meta_rows", []) as Array
			if not meta_rows.is_empty():
				return _build_detail_meta_info_card(
					str(block_payload.get("title", "战报详情")),
					meta_rows,
					_resolve_accent_color(str(block_payload.get("accent_key", "generic"))),
					node_name,
					int(block_payload.get("min_height", 0))
				)
			return _build_detail_info_card(
				str(block_payload.get("title", "战报详情")),
				_coerce_string_array(block_payload.get("lines", [])),
				_resolve_accent_color(str(block_payload.get("accent_key", "generic"))),
				node_name,
				int(block_payload.get("min_height", 0))
			)

func _resolve_roster_block_slots(block_payload: Dictionary, detail_frame_contract: Dictionary) -> Variant:
	var slot_source := str(block_payload.get("slot_source", "")).strip_edges()
	if slot_source != "":
		return detail_frame_contract.get(slot_source, [])
	return block_payload.get("slots", [])

func _build_structure_group_block(group_payload: Dictionary) -> Control:
	var layout := str(group_payload.get("layout", "stack")).strip_edges()
	var node_name := str(group_payload.get("node_name", "SOM_D07_Group")).strip_edges()
	var boxes := group_payload.get("boxes", []) as Array
	if layout == "row":
		var row := HBoxContainer.new()
		row.name = node_name
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_theme_constant_override("separation", 8)
		for item_variant in boxes:
			if not (item_variant is Dictionary):
				continue
			row.add_child(_build_structure_item_box(item_variant as Dictionary, true))
		return row
	return _build_structure_stack_group(boxes, node_name)

func _build_structure_stack_group(items: Array, node_name: String) -> Control:
	var panel := PanelContainer.new()
	panel.name = node_name
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_apply_panel_linework(panel, Color(0.11, 0.11, 0.13, 0.95), Color(0.32, 0.32, 0.34, 0.92))

	var margin := MarginContainer.new()
	_apply_margin(margin, 10, 10, 10, 10)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)

	for item_variant in items:
		if not (item_variant is Dictionary):
			continue
		column.add_child(_build_structure_item_box(item_variant as Dictionary, true))
	return panel

func _build_structure_item_box(item_payload: Dictionary, expand: bool = false) -> Control:
	return _build_structure_detail_box(
		str(item_payload.get("text", "SOM-D07 结构位")),
		Vector2(0, int(item_payload.get("height", 0))),
		expand,
		str(item_payload.get("node_name", "SOM_D07_StructureBox"))
	)

func _build_detail_info_card(title: String, lines: Array[String], accent_color: Color, node_name: String = "", min_height: int = 0) -> Control:
	var panel := PanelContainer.new()
	if node_name != "":
		panel.name = node_name
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_apply_panel_linework(panel, Color(0.15, 0.105, 0.060, 0.95), Color(0.56, 0.40, 0.18, 0.92), 2)

	var margin := MarginContainer.new()
	_apply_margin(margin, 16, 14, 16, 14)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)

	var title_label := Label.new()
	title_label.text = title
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_empty_block_style(panel, title_label)
	if min_height > 0:
		panel.custom_minimum_size = Vector2(0, min_height)
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_info_title_style(title_label, accent_color)
	_apply_label_shadow(title_label)
	column.add_child(title_label)
	for line in lines:
		var label := Label.new()
		label.text = line
		BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_empty_block_style(panel, null, label)
		if _is_detail_time_marker_line(line):
			BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_time_marker_label_style(label)
		else:
			BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_info_body_style(label)
		column.add_child(label)
	return panel

func _build_ai_living_feedback_card(block_payload: Dictionary) -> Control:
	var panel := PanelContainer.new()
	panel.name = str(block_payload.get("node_name", "BattleReportAiLivingFeedbackCard")).strip_edges()
	if panel.name == "":
		panel.name = "BattleReportAiLivingFeedbackCard"
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.set_meta("battle_report_detail_ai_living_feedback_token", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_ai_living_feedback_token())
	_apply_panel_linework(panel, Color(0.070, 0.100, 0.085, 0.97), Color(0.34, 0.72, 0.50, 0.95), 2)

	var margin := MarginContainer.new()
	_apply_margin(margin, 16, 14, 16, 14)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 9)
	margin.add_child(column)

	var title_label := Label.new()
	title_label.text = str(block_payload.get("title", "AI玩家战后反馈")).strip_edges()
	if title_label.text == "":
		title_label.text = "AI玩家战后反馈"
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_info_title_style(title_label, Color(0.60, 0.86, 0.62, 0.98))
	_apply_label_shadow(title_label)
	column.add_child(title_label)
	column.add_child(_build_ai_living_identity_row(block_payload))

	column.add_child(_build_ai_living_feedback_row("BattleReportAiLivingFeedbackActor", "AI玩家", str(block_payload.get("actor_label", "AI玩家")).strip_edges(), Color(0.74, 0.92, 0.78, 0.98)))
	column.add_child(_build_ai_living_feedback_row("BattleReportAiLivingFeedbackAction", "正在做", str(block_payload.get("action_label", "战后复盘")).strip_edges(), Color(0.94, 0.82, 0.48, 0.98)))
	column.add_child(_build_ai_living_feedback_row("BattleReportAiLivingFeedbackReason", "依据", str(block_payload.get("reason_line", "根据本次交战结果更新下一步行动判断。")).strip_edges(), Color(0.82, 0.86, 0.78, 0.96)))
	column.add_child(_build_ai_living_feedback_row("BattleReportAiLivingFeedbackResult", "结果", str(block_payload.get("result_line", "结果待确认")).strip_edges(), Color(0.94, 0.74, 0.58, 0.98)))

	var source_label := Label.new()
	source_label.name = "BattleReportAiLivingFeedbackSource"
	source_label.text = _sanitize_ai_living_feedback_source_label(str(block_payload.get("source_label", "")).strip_edges())
	source_label.add_theme_font_size_override("font_size", 11)
	source_label.add_theme_color_override("font_color", Color(0.62, 0.72, 0.66, 0.82))
	source_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	column.add_child(source_label)
	return panel

func _sanitize_ai_living_feedback_source_label(raw_label: String) -> String:
	var normalized := raw_label.strip_edges()
	match normalized:
		"feedback.battleRecords":
			return "战斗记录"
		"world.reports":
			return "世界报告"
		"battle_report_detail":
			return "战报详情"
	if normalized == "" or _source_label_has_engineering_copy(normalized):
		return "战报详情"
	return normalized

func _source_label_has_engineering_copy(label: String) -> bool:
	var lowered := label.to_lower()
	for token in [
		"battle_report",
		"battlerecords",
		"read model",
		"backend",
		"contract id",
		"authority",
		"tier",
		"/api/",
		"source_label",
	]:
		if lowered.find(token) >= 0:
			return true
	return false

func _build_ai_living_identity_row(block_payload: Dictionary) -> Control:
	var row := HBoxContainer.new()
	row.name = "BattleReportAiLivingIdentityRow"
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 12)
	row.set_meta("battle_report_detail_ai_activity_continuity_token", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_ai_activity_continuity_token())

	var status_dot_value := str(block_payload.get("status_dot", "green")).strip_edges()
	var avatar_frame := PanelContainer.new()
	avatar_frame.name = "BattleReportAiLivingAvatarFrame"
	avatar_frame.custom_minimum_size = Vector2(58, 58)
	_apply_panel_linework(avatar_frame, Color(0.10, 0.13, 0.11, 0.98), Color(0.53, 0.78, 0.52, 0.96), 2)
	row.add_child(avatar_frame)

	var avatar_stack := Control.new()
	avatar_stack.name = "BattleReportAiLivingAvatarStack"
	avatar_stack.custom_minimum_size = Vector2(58, 58)
	avatar_stack.mouse_filter = Control.MOUSE_FILTER_IGNORE
	avatar_frame.add_child(avatar_stack)

	var avatar_margin := MarginContainer.new()
	avatar_margin.name = "BattleReportAiLivingAvatarMargin"
	avatar_margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	_apply_margin(avatar_margin, 4, 4, 4, 4)
	avatar_stack.add_child(avatar_margin)

	var avatar_texture := TextureRect.new()
	avatar_texture.name = "BattleReportAiLivingAvatarTexture"
	avatar_texture.custom_minimum_size = Vector2(48, 48)
	avatar_texture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	avatar_texture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	var avatar_path := str(block_payload.get("avatar_image_path", "")).strip_edges()
	avatar_texture.texture = _load_ai_living_avatar_texture(avatar_path)
	avatar_texture.visible = avatar_texture.texture != null
	avatar_texture.set_meta("battle_report_detail_ai_activity_avatar_path", avatar_path)
	avatar_margin.add_child(avatar_texture)

	var status_frame_asset_path := BATTLE_REPORT_UI_COMPONENT_FACTORY.resolve_ai_avatar_status_frame_asset_path(status_dot_value)
	var status_frame_texture := TextureRect.new()
	status_frame_texture.name = "BattleReportAiLivingAvatarStatusFrameTexture"
	status_frame_texture.set_anchors_preset(Control.PRESET_FULL_RECT)
	status_frame_texture.custom_minimum_size = Vector2(58, 58)
	status_frame_texture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	status_frame_texture.stretch_mode = TextureRect.STRETCH_SCALE
	status_frame_texture.mouse_filter = Control.MOUSE_FILTER_IGNORE
	status_frame_texture.texture = _load_ai_living_avatar_texture(status_frame_asset_path)
	status_frame_texture.visible = status_frame_texture.texture != null
	status_frame_texture.set_meta("ai_avatar_status_frame_family_contract", BATTLE_REPORT_UI_COMPONENT_FACTORY.ai_avatar_status_frame_family_contract())
	status_frame_texture.set_meta("ai_avatar_status_frame_asset_path", status_frame_asset_path)
	avatar_stack.add_child(status_frame_texture)

	var intent_badge_asset_path := BATTLE_REPORT_UI_COMPONENT_FACTORY.ai_avatar_intent_badge_combat_asset_path()
	var intent_badge_texture := TextureRect.new()
	intent_badge_texture.name = "BattleReportAiLivingAvatarIntentBadgeTexture"
	intent_badge_texture.custom_minimum_size = Vector2(32, 24)
	intent_badge_texture.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	intent_badge_texture.offset_left = -34
	intent_badge_texture.offset_top = -26
	intent_badge_texture.offset_right = -2
	intent_badge_texture.offset_bottom = -2
	intent_badge_texture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	intent_badge_texture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	intent_badge_texture.mouse_filter = Control.MOUSE_FILTER_IGNORE
	intent_badge_texture.texture = _load_ai_living_avatar_texture(intent_badge_asset_path)
	intent_badge_texture.visible = intent_badge_texture.texture != null
	intent_badge_texture.set_meta("ai_avatar_status_frame_family_contract", BATTLE_REPORT_UI_COMPONENT_FACTORY.ai_avatar_status_frame_family_contract())
	intent_badge_texture.set_meta("ai_avatar_intent_badge_asset_path", intent_badge_asset_path)
	avatar_stack.add_child(intent_badge_texture)

	var text_column := VBoxContainer.new()
	text_column.name = "BattleReportAiLivingIdentityTextColumn"
	text_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	text_column.add_theme_constant_override("separation", 5)
	row.add_child(text_column)

	var trace_count := maxi(int(block_payload.get("execution_trace_count", 1)), 1)
	var trace_ids: Array = block_payload.get("execution_trace_ids", []) as Array
	var first_trace_id := ""
	for trace_id_variant in trace_ids:
		var trace_id := str(trace_id_variant).strip_edges()
		if trace_id != "":
			first_trace_id = trace_id
			break
	var identity_chip := BATTLE_REPORT_UI_COMPONENT_FACTORY.build_ai_activity_identity_chip({
		"surface": "battle_report",
		"node_prefix": "BattleReportAiLiving",
		"status_dot_name": "BattleReportAiLivingStatusDot",
		"status_label_name": "BattleReportAiLivingStatusLabel",
		"trace_label_name": "BattleReportAiLivingTraceCount",
		"status_dot": status_dot_value,
		"phase_label": _format_ai_living_status_text(status_dot_value, str(block_payload.get("status_reason", "")).strip_edges()),
		"task_text": str(block_payload.get("action_label", block_payload.get("title", "战后复盘"))).strip_edges(),
		"trace_id": first_trace_id,
		"trace_ids": trace_ids.duplicate(true),
		"trace_count": trace_count,
		"trace_label": "执行流 %s 条" % str(trace_count),
		"trace_label_suffix": "TraceCount",
		"legacy_trace_meta_prefix": "battle_report_detail_ai_activity",
		"min_height": 38,
		"margin_left": 7,
		"margin_right": 7,
	})
	identity_chip.set_meta("battle_report_detail_ai_activity_trace_count", trace_count)
	identity_chip.set_meta("battle_report_detail_ai_activity_trace_id", first_trace_id)
	identity_chip.set_meta("battle_report_detail_ai_activity_trace_ids", trace_ids.duplicate(true))
	text_column.add_child(identity_chip)
	text_column.add_child(_build_battle_report_maritime_result_chip(block_payload))
	text_column.add_child(_build_battle_report_ai_activity_carrying_troops_chip_row(block_payload))
	return row

func _build_battle_report_maritime_result_chip(block_payload: Dictionary) -> Control:
	var chip_id := str(block_payload.get("maritime_report_result_chip_id", block_payload.get("maritimeReportResultChipId", ""))).strip_edges()
	var chip := PanelContainer.new()
	chip.name = "BattleReportMaritimeResultChip"
	chip.custom_minimum_size = Vector2(0, 34)
	chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chip.visible = chip_id == "maritime_report_result_chip_v1"
	chip.set_meta("battle_report_maritime_result_chip_id", chip_id)
	_apply_panel_linework(chip, Color(0.08, 0.13, 0.16, 0.94), Color(0.42, 0.72, 0.78, 0.90), 1)

	var margin := MarginContainer.new()
	_apply_margin(margin, 8, 5, 8, 5)
	chip.add_child(margin)
	var label := Label.new()
	label.name = "BattleReportMaritimeResultChipLabel"
	label.text = "海巡回报"
	label.add_theme_font_size_override("font_size", 12)
	label.add_theme_color_override("font_color", Color(0.76, 0.92, 0.96, 0.98))
	label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	margin.add_child(label)
	return chip

func _load_ai_living_avatar_texture(avatar_path: String) -> Texture2D:
	var normalized_path := avatar_path.strip_edges()
	if normalized_path == "":
		return null
	if ResourceLoader.exists(normalized_path):
		var resource := load(normalized_path)
		if resource is Texture2D:
			return resource as Texture2D
	var image := Image.new()
	if image.load(normalized_path) != OK:
		return null
	return ImageTexture.create_from_image(image)


func _load_battle_report_ai_activity_troop_formation_read_model() -> Dictionary:
	var read_model_path := "res://data/ui/main_city_troop_formation_read_model.json"
	if not FileAccess.file_exists(read_model_path):
		return {}
	var raw_text := FileAccess.get_file_as_string(read_model_path)
	var parsed: Variant = JSON.parse_string(raw_text)
	if parsed is Dictionary:
		return parsed as Dictionary
	return {}


func _resolve_battle_report_ai_activity_carrying_troop_slots(block_payload: Dictionary) -> Array:
	var read_model := _load_battle_report_ai_activity_troop_formation_read_model()
	var teams_variant: Variant = read_model.get("teams", [])
	if not (teams_variant is Array):
		return []
	var preferred_ai_player_id := str(block_payload.get("ai_player_id", block_payload.get("aiPlayerId", ""))).strip_edges()
	var fallback_ai_player_id := "ai_player_jihan_vanguard"
	var fallback_team: Dictionary = {}
	var selected_team: Dictionary = {}
	for team_variant in teams_variant as Array:
		if not (team_variant is Dictionary):
			continue
		var team: Dictionary = team_variant as Dictionary
		var owner_type := str(team.get("owner_type", team.get("ownerType", ""))).strip_edges().to_lower()
		var team_ai_player_id := str(team.get("ai_player_id", team.get("aiPlayerId", ""))).strip_edges()
		if owner_type != "ai" and team_ai_player_id == "":
			continue
		if fallback_team.is_empty() or team_ai_player_id == fallback_ai_player_id:
			fallback_team = team.duplicate(true)
		if preferred_ai_player_id != "" and team_ai_player_id == preferred_ai_player_id:
			selected_team = team.duplicate(true)
			break
	if selected_team.is_empty():
		selected_team = fallback_team
	if selected_team.is_empty():
		return []
	var slots_variant: Variant = selected_team.get("slots", [])
	if not (slots_variant is Array):
		return []
	var slot_payloads: Array = []
	for slot_variant in slots_variant as Array:
		if slot_payloads.size() >= 3:
			break
		if not (slot_variant is Dictionary):
			continue
		var slot: Dictionary = slot_variant as Dictionary
		var troop_label := str(slot.get("troop_type", slot.get("troopType", ""))).strip_edges()
		if troop_label == "":
			continue
		var general_name := str(slot.get("general_name", slot.get("generalName", ""))).strip_edges()
		if general_name == "":
			general_name = "武将"
		var asset_path := BATTLE_REPORT_UI_COMPONENT_FACTORY.generated_troop_illustration_for_label(troop_label)
		slot_payloads.append({
			"generalName": general_name,
			"troopType": troop_label,
			"label": "%s %s" % [general_name, troop_label],
			"assetPath": asset_path,
			"aiPlayerId": str(selected_team.get("ai_player_id", selected_team.get("aiPlayerId", ""))).strip_edges(),
			"teamId": str(selected_team.get("id", selected_team.get("team_id", ""))).strip_edges(),
			"source": "main_city_troop_formation_read_model",
			"sourcePath": "main_city_troop_formation_read_model.json",
		})
	return slot_payloads


func _build_battle_report_ai_activity_carrying_troops_chip_row(block_payload: Dictionary) -> Control:
	var row := HBoxContainer.new()
	row.name = "BattleReportAiLivingCarryingTroopsChipRow"
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 6)
	var slots := _resolve_battle_report_ai_activity_carrying_troop_slots(block_payload)
	row.visible = not slots.is_empty()
	for slot_index in range(3):
		var chip := PanelContainer.new()
		chip.name = "BattleReportAiLivingCarryingTroopsChip_%d" % slot_index
		chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		chip.custom_minimum_size = Vector2(0, 42)
		_apply_panel_linework(chip, Color(0.12, 0.10, 0.07, 0.92), Color(0.78, 0.55, 0.24, 0.88), 1)
		chip.visible = slot_index < slots.size() and slots[slot_index] is Dictionary
		if chip.visible:
			var slot: Dictionary = slots[slot_index] as Dictionary
			var label_text := str(slot.get("label", "")).strip_edges()
			var asset_path := str(slot.get("assetPath", "")).strip_edges()
			chip.set_meta("ai_activity_carrying_troops_chip_contract", BATTLE_REPORT_UI_COMPONENT_FACTORY.ai_activity_carrying_troops_chip_contract())
			chip.set_meta("generated_troops_illustration_source", BATTLE_REPORT_UI_COMPONENT_FACTORY.generated_troops_illustration_source())
			chip.set_meta("battle_report_detail_ai_activity_carrying_troops_label", label_text)
			chip.set_meta("battle_report_detail_ai_activity_carrying_troops_asset_path", asset_path)

		var margin := MarginContainer.new()
		_apply_margin(margin, 4, 3, 6, 3)
		chip.add_child(margin)

		var chip_row := HBoxContainer.new()
		chip_row.add_theme_constant_override("separation", 5)
		margin.add_child(chip_row)

		var texture_rect := TextureRect.new()
		texture_rect.name = "BattleReportAiLivingCarryingTroopsTexture_%d" % slot_index
		texture_rect.custom_minimum_size = Vector2(34, 34)
		texture_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		texture_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		if chip.visible:
			var texture_slot: Dictionary = slots[slot_index] as Dictionary
			var texture_asset_path := str(texture_slot.get("assetPath", "")).strip_edges()
			texture_rect.texture = _load_ai_living_avatar_texture(texture_asset_path)
			texture_rect.visible = texture_rect.texture != null
			texture_rect.set_meta("generated_troops_illustration_source", BATTLE_REPORT_UI_COMPONENT_FACTORY.generated_troops_illustration_source())
			texture_rect.set_meta("battle_report_detail_ai_activity_carrying_troops_asset_path", texture_asset_path)
		else:
			texture_rect.visible = false
		chip_row.add_child(texture_rect)

		var label := Label.new()
		label.name = "BattleReportAiLivingCarryingTroopsLabel_%d" % slot_index
		label.text = str((slots[slot_index] as Dictionary).get("label", "")).strip_edges() if chip.visible else ""
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.add_theme_font_size_override("font_size", 11)
		label.add_theme_color_override("font_color", Color(0.96, 0.84, 0.58, 0.96))
		_apply_label_shadow(label)
		chip_row.add_child(label)

		row.add_child(chip)
	return row

func _format_ai_living_status_text(status_dot: String, status_reason: String) -> String:
	var normalized_reason := status_reason.strip_edges()
	if normalized_reason in ["execution_trace_active", "battle_report_execution_trace_linked"]:
		return "执行流已接入"
	if normalized_reason != "":
		return normalized_reason
	match status_dot.strip_edges():
		"green":
			return "行动中"
		"yellow":
			return "排队中"
		"red":
			return "需关注"
		_:
			return "待机"

func _make_ai_living_status_dot_style(status_dot: String) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	match status_dot.strip_edges():
		"green":
			style.bg_color = Color(0.28, 0.86, 0.42, 1.0)
		"yellow":
			style.bg_color = Color(0.95, 0.76, 0.26, 1.0)
		"red":
			style.bg_color = Color(0.92, 0.24, 0.20, 1.0)
		_:
			style.bg_color = Color(0.45, 0.50, 0.48, 1.0)
	style.corner_radius_top_left = 6
	style.corner_radius_top_right = 6
	style.corner_radius_bottom_left = 6
	style.corner_radius_bottom_right = 6
	return style

func _build_ai_living_feedback_row(node_name: String, label_text: String, value_text: String, value_color: Color) -> Control:
	var row := HBoxContainer.new()
	row.name = node_name
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)

	var label := Label.new()
	label.text = label_text
	label.custom_minimum_size = Vector2(70, 0)
	label.add_theme_font_size_override("font_size", 13)
	label.add_theme_color_override("font_color", Color(0.70, 0.78, 0.70, 0.90))
	row.add_child(label)

	var value := Label.new()
	value.text = value_text if value_text != "" else "待确认"
	value.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	value.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	value.add_theme_font_size_override("font_size", 14)
	value.add_theme_color_override("font_color", value_color)
	row.add_child(value)
	return row

func _build_detail_meta_info_card(title: String, rows: Array, accent_color: Color, node_name: String = "", min_height: int = 0) -> Control:
	var panel := PanelContainer.new()
	if node_name != "":
		panel.name = node_name
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_apply_panel_linework(panel, Color(0.15, 0.105, 0.060, 0.95), Color(0.56, 0.40, 0.18, 0.92), 2)

	var margin := MarginContainer.new()
	_apply_margin(margin, 16, 14, 16, 14)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)

	var title_label := Label.new()
	title_label.text = title
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_empty_block_style(panel, title_label)
	if min_height > 0:
		panel.custom_minimum_size = Vector2(0, min_height)
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_info_title_style(title_label, accent_color)
	_apply_label_shadow(title_label)
	column.add_child(title_label)

	for row_variant in rows:
		if not (row_variant is Dictionary):
			continue
		column.add_child(_build_detail_meta_row(row_variant as Dictionary))
	return panel

func _build_detail_meta_row(row_payload: Dictionary) -> Control:
	var row := HBoxContainer.new()
	row.name = "BattleReportDetailMetaRow_%s" % str(row_payload.get("role", "generic")).strip_edges().capitalize().replace(" ", "")
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)

	var label := Label.new()
	label.text = "%s" % str(row_payload.get("label", "")).strip_edges()
	label.custom_minimum_size = Vector2(62, 0)
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_meta_label_style(label)
	row.add_child(label)

	var value := Label.new()
	value.text = str(row_payload.get("value", "")).strip_edges()
	value.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	if str(row_payload.get("role", "")).strip_edges() == "time":
		BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_time_marker_label_style(value)
	else:
		BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_meta_value_style(value)
	row.add_child(value)

	var action_variant: Variant = row_payload.get("action", {})
	var coordinate_variant: Variant = row_payload.get("coordinate", {})
	if action_variant is Dictionary and coordinate_variant is Dictionary and not (coordinate_variant as Dictionary).is_empty():
		var action_payload := action_variant as Dictionary
		if str(action_payload.get("id", "")).strip_edges() == "jump_coordinate":
			var button := Button.new()
			button.name = "BattleReportCoordinateJumpButton"
			button.text = str(action_payload.get("label", "跳转")).strip_edges()
			button.tooltip_text = "跳转到 %s" % value.text
			_apply_detail_button_governance(
				button,
				"battle_report_detail_coordinate_jump",
				"coordinate",
				BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_coordinate_jump_button_token()
			)
			button.set_meta("battle_report_detail_coordinate_payload_contract", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_coordinate_jump_payload_contract())
			BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_coordinate_jump_button_style(button)
			button.pressed.connect(_on_coordinate_jump_button_pressed.bind(row_payload.duplicate(true)))
			row.add_child(button)
	return row

func _is_detail_time_marker_line(line: String) -> bool:
	var text := line.strip_edges()
	if text.begins_with("时间：") or text.begins_with("时间:"):
		return true
	return text.find("第") >= 0 and text.find("刻") >= 0

func _resolve_accent_color(accent_key: String) -> Color:
	match accent_key:
		"battlefield":
			return Color(0.58, 0.72, 0.58, 0.96)
		"stats":
			return Color(0.56, 0.62, 0.82, 0.96)
		"rounds":
			return Color(0.92, 0.72, 0.38, 0.98)
		"formation":
			return Color(0.82, 0.74, 0.60, 0.98)
		_:
			return Color(0.66, 0.66, 0.66, 0.96)

func _resolve_metric_bg_color(tone: String) -> Color:
	match tone:
		"attacker":
			return Color(0.075, 0.105, 0.15, 0.96)
		"defender":
			return Color(0.15, 0.075, 0.075, 0.96)
		"result":
			return Color(0.14, 0.115, 0.07, 0.96)
		"support":
			return Color(0.08, 0.13, 0.10, 0.96)
		_:
			return Color(0.11, 0.11, 0.13, 0.96)

func _resolve_metric_border_color(tone: String) -> Color:
	match tone:
		"attacker":
			return Color(0.22, 0.38, 0.58, 0.92)
		"defender":
			return Color(0.58, 0.26, 0.24, 0.92)
		"result":
			return Color(0.68, 0.52, 0.26, 0.92)
		"support":
			return Color(0.28, 0.50, 0.36, 0.92)
		_:
			return Color(0.34, 0.34, 0.36, 0.92)

func _resolve_metric_value_color(tone: String) -> Color:
	match tone:
		"attacker":
			return Color(0.64, 0.78, 1.0, 1.0)
		"defender":
			return Color(1.0, 0.58, 0.52, 1.0)
		"result":
			return Color(1.0, 0.84, 0.42, 1.0)
		"support":
			return Color(0.62, 0.92, 0.70, 1.0)
		_:
			return Color(0.88, 0.88, 0.86, 1.0)

func _resolve_event_actor_color(actor: String) -> Color:
	match actor.strip_edges():
		"attacker":
			return Color(0.60, 0.76, 1.0, 1.0)
		"defender":
			return Color(1.0, 0.62, 0.56, 1.0)
		_:
			return Color(0.88, 0.80, 0.62, 1.0)

func _build_structure_detail_box(text: String, min_size: Vector2, expand: bool = false, node_name: String = "") -> Control:
	var panel := PanelContainer.new()
	if node_name != "":
		panel.name = node_name
	panel.custom_minimum_size = min_size
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL if expand else 0
	_apply_panel_linework(panel, Color(0.13, 0.13, 0.15, 0.94), Color(0.36, 0.36, 0.38, 0.92))
	var margin := MarginContainer.new()
	_apply_margin(margin, 8, 8, 8, 8)
	panel.add_child(margin)
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_structure_label_style(label)
	margin.add_child(label)
	return panel

func _build_stats_grid_block(block_payload: Dictionary) -> Control:
	var panel := PanelContainer.new()
	panel.name = str(block_payload.get("node_name", "SOM_D07_StatsGrid"))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_apply_panel_linework(panel, Color(0.10, 0.11, 0.14, 0.96), Color(0.34, 0.38, 0.54, 0.92))

	var margin := MarginContainer.new()
	_apply_margin(margin, 12, 10, 12, 10)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)

	var title_label := Label.new()
	title_label.text = str(block_payload.get("title", "战况统计"))
	title_label.add_theme_font_size_override("font_size", 15)
	title_label.add_theme_color_override("font_color", _resolve_accent_color(str(block_payload.get("accent_key", "stats"))))
	column.add_child(title_label)

	var metric_flow := HFlowContainer.new()
	metric_flow.name = "StatsMetricFlow"
	metric_flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	metric_flow.add_theme_constant_override("h_separation", 8)
	metric_flow.add_theme_constant_override("v_separation", 8)
	column.add_child(metric_flow)

	var metrics: Array = block_payload.get("metrics", []) as Array
	for index in range(metrics.size()):
		var metric_variant: Variant = metrics[index]
		if not (metric_variant is Dictionary):
			continue
		metric_flow.add_child(_build_stats_metric_tile(metric_variant as Dictionary, index))
	return panel

func _build_stats_metric_tile(metric_payload: Dictionary, index: int) -> Control:
	var panel := PanelContainer.new()
	panel.name = "StatsMetric_%s" % str(index + 1)
	panel.custom_minimum_size = Vector2(180, 74)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var tone := str(metric_payload.get("tone", "generic"))
	_apply_panel_linework(panel, _resolve_metric_bg_color(tone), _resolve_metric_border_color(tone))

	var margin := MarginContainer.new()
	_apply_margin(margin, 10, 8, 10, 8)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 3)
	margin.add_child(column)

	var label := Label.new()
	label.text = str(metric_payload.get("label", "统计"))
	label.add_theme_font_size_override("font_size", 12)
	label.add_theme_color_override("font_color", Color(0.72, 0.74, 0.76, 0.96))
	column.add_child(label)

	var value := Label.new()
	value.text = str(metric_payload.get("value", "--"))
	value.add_theme_font_size_override("font_size", 19)
	value.add_theme_color_override("font_color", _resolve_metric_value_color(tone))
	column.add_child(value)

	var delta := Label.new()
	delta.text = str(metric_payload.get("delta", ""))
	delta.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	delta.add_theme_font_size_override("font_size", 12)
	delta.add_theme_color_override("font_color", Color(0.78, 0.76, 0.70, 0.96))
	column.add_child(delta)
	return panel

func _build_round_timeline_block(block_payload: Dictionary) -> Control:
	var panel := PanelContainer.new()
	panel.name = str(block_payload.get("node_name", "SOM_D07_RoundTimeline"))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_apply_panel_linework(panel, Color(0.12, 0.105, 0.09, 0.96), Color(0.54, 0.42, 0.22, 0.92))

	var margin := MarginContainer.new()
	var timeline_margin := BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_round_timeline_margin()
	_apply_margin(margin, int(timeline_margin.x), int(timeline_margin.y), int(timeline_margin.x), int(timeline_margin.y))
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_round_timeline_separation())
	margin.add_child(column)

	var title_label := Label.new()
	title_label.text = str(block_payload.get("title", "战法回合"))
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_round_timeline_style(panel, title_label)
	title_label.add_theme_color_override("font_color", _resolve_accent_color(str(block_payload.get("accent_key", "rounds"))))
	column.add_child(title_label)

	var rounds: Array = block_payload.get("rounds", []) as Array
	for index in range(rounds.size()):
		var round_variant: Variant = rounds[index]
		if not (round_variant is Dictionary):
			continue
		column.add_child(_build_round_timeline_item(round_variant as Dictionary, index))
	return panel

func _build_round_timeline_item(round_payload: Dictionary, index: int) -> Control:
	var row := HBoxContainer.new()
	row.name = "RoundTimelineItem_%s" % str(index + 1)
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 8)

	var marker := Label.new()
	marker.text = str(round_payload.get("round", index + 1))
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_round_marker_style(marker)
	row.add_child(marker)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 5)
	row.add_child(column)

	var title := Label.new()
	title.text = str(round_payload.get("title", "第%s回合" % marker.text))
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_round_item_title_style(title)
	column.add_child(title)

	var summary := str(round_payload.get("summary", "")).strip_edges()
	if summary != "":
		var summary_label := Label.new()
		summary_label.text = summary
		BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_round_body_style(summary_label)
		column.add_child(summary_label)

	var events: Array = round_payload.get("events", []) as Array
	if events.is_empty():
		var empty_label := Label.new()
		empty_label.text = "暂无回合事件。"
		BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_round_body_style(empty_label)
		empty_label.add_theme_color_override("font_color", Color(0.66, 0.66, 0.66, 0.96))
		column.add_child(empty_label)
		return row

	for event_index in range(events.size()):
		var event_variant: Variant = events[event_index]
		if not (event_variant is Dictionary):
			continue
		column.add_child(_build_round_event_row(event_variant as Dictionary, event_index))
	return row

func _build_round_event_row(event_payload: Dictionary, index: int) -> Control:
	var row := HBoxContainer.new()
	row.name = "RoundEvent_%s" % str(index + 1)
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 6)

	var actor := str(event_payload.get("actor", "system"))
	var actor_label := Label.new()
	actor_label.text = str(event_payload.get("actor_label", "系统"))
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_round_event_actor_style(actor_label)
	actor_label.add_theme_color_override("font_color", _resolve_event_actor_color(actor))
	row.add_child(actor_label)

	var text_label := Label.new()
	var skill_name := str(event_payload.get("skill_name", "")).strip_edges()
	var summary := str(event_payload.get("summary", "")).strip_edges()
	var damage := int(event_payload.get("damage", 0))
	var healing := int(event_payload.get("healing", 0))
	var prevented_damage := int(event_payload.get("prevented_damage", 0))
	var suffix_parts: Array[String] = []
	if damage > 0:
		suffix_parts.append("伤害 %s" % str(damage))
	if healing > 0:
		suffix_parts.append("恢复 %s" % str(healing))
	if prevented_damage > 0:
		suffix_parts.append("规避 %s" % str(prevented_damage))
	var skill_prefix := "%s：" % skill_name if skill_name != "" else ""
	var suffix_text := "  /  %s" % "，".join(suffix_parts) if not suffix_parts.is_empty() else ""
	text_label.text = "%s%s%s" % [
		skill_prefix,
		summary if summary != "" else "事件结算",
		suffix_text,
	]
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_round_body_style(text_label)
	text_label.add_theme_color_override("font_color", Color(0.84, 0.84, 0.82, 0.96))
	row.add_child(text_label)
	return row

func _build_detail_roster_card(title: String, raw_slots: Variant, is_defender: bool, node_name: String = "") -> Control:
	var panel := PanelContainer.new()
	if node_name != "":
		panel.name = node_name
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_apply_panel_linework(panel, Color(0.11, 0.11, 0.13, 0.95), Color(0.32, 0.32, 0.34, 0.92))

	var margin := MarginContainer.new()
	_apply_margin(margin, 12, 12, 12, 12)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)

	var title_label := Label.new()
	title_label.text = title
	title_label.add_theme_font_size_override("font_size", 15)
	title_label.add_theme_color_override("font_color", Color(0.82, 0.74, 0.60, 0.98))
	column.add_child(title_label)

	if raw_slots is Array:
		var row := HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_theme_constant_override("separation", 8)
		column.add_child(row)
		var slot_index := 0
		for slot_variant in raw_slots as Array:
			if not (slot_variant is Dictionary):
				continue
			slot_index += 1
			row.add_child(_build_detail_hero_card(slot_variant as Dictionary, is_defender, "%s_Slot_%s" % [panel.name if panel.name != "" else "SOM_D03", str(slot_index)]))
	return panel

func _rebuild_detail_hero_row(container: HBoxContainer, raw_slots: Variant, is_defender: bool) -> void:
	_clear_children(container)
	if raw_slots is Array:
		var slot_index := 0
		for slot_variant in raw_slots as Array:
			if not (slot_variant is Dictionary):
				continue
			slot_index += 1
			var node_name := "SOM_D05_Slot_%s" % str(slot_index) if is_defender else "SOM_D03_Slot_%s" % str(slot_index)
			container.add_child(_build_detail_hero_card(slot_variant as Dictionary, is_defender, node_name))

func _build_detail_hero_card(slot_payload: Dictionary, is_defender: bool, node_name: String = "") -> Control:
	var panel := PanelContainer.new()
	if node_name != "":
		panel.name = node_name
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, int(BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_hero_card_min_height()))
	_apply_panel_linework(
		panel,
		Color(0.18, 0.075, 0.060, 0.96) if is_defender else Color(0.060, 0.105, 0.160, 0.96),
		Color(0.72, 0.30, 0.24, 0.94) if is_defender else Color(0.76, 0.56, 0.24, 0.94),
		2
	)

	var margin := MarginContainer.new()
	_apply_margin(margin, 10, 10, 10, 10)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 7)
	margin.add_child(column)

	var role_plate := PanelContainer.new()
	role_plate.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_apply_panel_linework(
		role_plate,
		Color(0.22, 0.095, 0.060, 0.92) if is_defender else Color(0.10, 0.15, 0.22, 0.92),
		Color(0.80, 0.34, 0.24, 0.88) if is_defender else Color(0.84, 0.62, 0.26, 0.88)
	)
	var role_margin := MarginContainer.new()
	_apply_margin(role_margin, 8, 5, 8, 5)
	role_plate.add_child(role_margin)
	var role_label := Label.new()
	role_label.text = str(slot_payload.get("role_label", "武将位"))
	role_label.add_theme_font_size_override("font_size", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_hero_role_font_size())
	role_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	role_label.add_theme_color_override("font_color", Color(0.98, 0.88, 0.58, 1.0))
	_apply_label_shadow(role_label)
	role_margin.add_child(role_label)
	column.add_child(role_plate)

	var portrait_shell := PanelContainer.new()
	portrait_shell.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	portrait_shell.size_flags_vertical = Control.SIZE_EXPAND_FILL
	portrait_shell.custom_minimum_size = Vector2(0, int(BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_hero_portrait_min_height()))
	_apply_panel_linework(portrait_shell, Color(0.070, 0.062, 0.055, 0.92), Color(0.54, 0.38, 0.18, 0.72), 1)
	var portrait_margin := MarginContainer.new()
	_apply_margin(portrait_margin, 0, 0, 0, 0)
	portrait_shell.add_child(portrait_margin)
	portrait_margin.add_child(_build_detail_portrait_stage(slot_payload, is_defender))
	column.add_child(portrait_shell)

	column.add_child(_build_info_label(str(slot_payload.get("troop_label", "SOM-D03-D 信息位"))))
	column.add_child(_build_info_label(str(slot_payload.get("level_label", "SOM-D03-F 信息位"))))
	return panel


func _build_detail_portrait_stage(slot_payload: Dictionary, is_defender: bool) -> Control:
	var stack := Control.new()
	stack.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stack.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stack.set_meta("battle_report_detail_portrait_side", "defender" if is_defender else "attacker")
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_portrait_frame_stage(stack)

	var texture: Texture2D = BattleReportPortraitRegistryScript.portrait_texture(slot_payload)
	stack.set_meta("battle_report_detail_portrait_loaded", texture != null)
	stack.set_meta("battle_report_detail_portrait_placeholder", texture == null)
	if texture != null:
		var image := TextureRect.new()
		image.name = "DetailPortraitTexture"
		image.mouse_filter = Control.MOUSE_FILTER_IGNORE
		image.texture = texture
		BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_portrait_frame_stage(stack)
		BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_portrait_frame_texture(image)
		image.modulate = Color(0.66, 0.66, 0.66, 1.0) if is_defender else Color(1.0, 1.0, 1.0, 1.0)
		stack.add_child(image)
	else:
		var fallback_label := Label.new()
		fallback_label.text = str(slot_payload.get("name", "武将位"))
		fallback_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		fallback_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		fallback_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		fallback_label.set_anchors_preset(Control.PRESET_FULL_RECT)
		stack.add_child(fallback_label)

	var overlay := VBoxContainer.new()
	overlay.name = "PortraitOverlay"
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.add_theme_constant_override("separation", 0)
	stack.add_child(overlay)

	var resolved_star_label := _resolve_detail_star_label(slot_payload)
	if resolved_star_label != "":
		var star_label := Label.new()
		star_label.text = resolved_star_label
		star_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		star_label.add_theme_font_size_override("font_size", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_hero_star_font_size())
		star_label.add_theme_color_override("font_color", Color(1.0, 0.86, 0.34, 1.0))
		star_label.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.90))
		star_label.add_theme_constant_override("shadow_offset_x", 1)
		star_label.add_theme_constant_override("shadow_offset_y", 1)
		overlay.add_child(star_label)

	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	overlay.add_child(spacer)

	var name_bar := PanelContainer.new()
	_apply_panel_linework(name_bar, Color(0.06, 0.045, 0.035, 0.82), Color(0.48, 0.36, 0.18, 0.70))
	var name_margin := MarginContainer.new()
	_apply_margin(name_margin, 6, 3, 6, 3)
	name_bar.add_child(name_margin)
	var name_label := Label.new()
	name_label.text = str(slot_payload.get("name", "武将位"))
	name_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.add_theme_font_size_override("font_size", 16)
	name_label.add_theme_color_override("font_color", Color(0.96, 0.92, 0.82, 1.0))
	name_margin.add_child(name_label)
	overlay.add_child(name_bar)
	return stack


func _resolve_detail_star_label(slot_payload: Dictionary) -> String:
	var explicit_label := str(slot_payload.get("star_label", "")).strip_edges()
	if explicit_label != "":
		return explicit_label
	var star_count := _resolve_detail_star_count(slot_payload)
	if star_count > 0:
		return "★".repeat(clampi(star_count, 1, 5))
	return ""


func _resolve_detail_star_count(slot_payload: Dictionary) -> int:
	for key in ["star_count", "starCount", "stars", "star", "starLevel", "rarityStars"]:
		if not slot_payload.has(key):
			continue
		var raw_value: Variant = slot_payload.get(key)
		var numeric_value := 0
		if raw_value is int:
			numeric_value = int(raw_value)
		elif raw_value is float:
			numeric_value = int(raw_value)
		else:
			var text_value := str(raw_value).strip_edges()
			if text_value.is_valid_int():
				numeric_value = int(text_value)
		if numeric_value > 0:
			return clampi(numeric_value, 1, 5)
	return 0


func _build_info_label(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_info_label_font_size())
	label.add_theme_color_override("font_color", Color(0.86, 0.82, 0.72, 0.98))
	return label

func _refresh_detail_tab_buttons() -> void:
	_battlefield_tab_button.text = "战斗地点"
	_stats_tab_button.text = "统计 / 战法"
	_formation_tab_button.text = "阵容详情"
	_apply_mode_button_state(_battlefield_tab_button, _active_detail_tab_id == "battlefield")
	_apply_mode_button_state(_stats_tab_button, _active_detail_tab_id == "stats")
	_apply_mode_button_state(_formation_tab_button, _active_detail_tab_id == "formation")
	_refresh_detail_button_governance()

func _refresh_detail_button_governance() -> void:
	_apply_detail_button_governance(_share_button, "battle_report_detail_share", "footer", BATTLE_REPORT_UI_COMPONENT_FACTORY.BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN)
	_apply_detail_button_governance(_favorite_button, "battle_report_detail_favorite", "footer", BATTLE_REPORT_UI_COMPONENT_FACTORY.BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN)
	_apply_detail_button_governance(_replay_button, "battle_report_detail_replay", "footer", BATTLE_REPORT_UI_COMPONENT_FACTORY.BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN)
	_apply_detail_button_governance(_battlefield_tab_button, "battle_report_detail_tab:battlefield", "tab", BATTLE_REPORT_UI_COMPONENT_FACTORY.BATTLE_REPORT_DETAIL_TAB_BUTTON_TOKEN)
	_apply_detail_button_governance(_stats_tab_button, "battle_report_detail_tab:stats", "tab", BATTLE_REPORT_UI_COMPONENT_FACTORY.BATTLE_REPORT_DETAIL_TAB_BUTTON_TOKEN)
	_apply_detail_button_governance(_formation_tab_button, "battle_report_detail_tab:formation", "tab", BATTLE_REPORT_UI_COMPONENT_FACTORY.BATTLE_REPORT_DETAIL_TAB_BUTTON_TOKEN)
	_apply_detail_button_governance(_collapse_button, "battle_report_detail_back", "footer", BATTLE_REPORT_UI_COMPONENT_FACTORY.BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN)

func _apply_detail_button_governance(button: Button, action_id: String, role: String, token: String) -> void:
	if button == null:
		return
	button.set_meta("battle_report_detail_button_action_id", action_id)
	button.set_meta("battle_report_detail_button_role", role)
	button.set_meta("battle_report_detail_button_token", token)
	button.set_meta("battle_report_detail_button_live_text_contract", DETAIL_BUTTON_LIVE_TEXT_CONTRACT)
	button.set_meta("battle_report_detail_button_live_text_label", button.text.strip_edges())

func _apply_mode_button_state(button: Button, is_active: bool) -> void:
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_tab_button_state(button, is_active)

func _resolve_detail_tab_title() -> String:
	match _active_detail_tab_id:
		"battlefield":
			return "战斗地点"
		"stats":
			return "统计 / 战法"
		"formation":
			return "阵容详情"
		_:
			return "战报详情"

func _apply_static_styling() -> void:
	if _detail_page_scroll != null:
		BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_scroll_container(_detail_page_scroll)
	_detail_column.set_meta("battle_report_detail_card_composition_token", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_card_composition_token())
	_battle_row.size_flags_vertical = 0
	_battle_row.set_meta("battle_report_detail_card_composition_order", "attacker_result_defender")
	_outcome_center_card.set_meta("battle_report_detail_card_composition_role", "primary_reward_replay_focus")
	_apply_panel_linework(_attacker_header_card, Color(0.055, 0.095, 0.150, 0.96), Color(0.30, 0.52, 0.82, 0.90), 2)
	_apply_panel_linework(_defender_header_card, Color(0.155, 0.055, 0.050, 0.96), Color(0.72, 0.24, 0.20, 0.90), 2)
	_apply_panel_linework(_result_header_card, Color(0.18, 0.125, 0.050, 0.97), Color(0.95, 0.64, 0.22, 0.96), 2)
	_apply_panel_linework(_outcome_center_card, Color(0.18, 0.125, 0.050, 0.97), Color(0.88, 0.58, 0.22, 0.94), 2)
	_apply_panel_linework(_detail_section_card, Color(0.14, 0.095, 0.052, 0.96), Color(0.58, 0.40, 0.18, 0.92), 2)
	_result_header_card.custom_minimum_size = Vector2(BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_result_card_min_width(), 0)
	_outcome_center_card.custom_minimum_size = Vector2(BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_outcome_card_min_width(), 0)
	_result_label.add_theme_font_size_override("font_size", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_result_font_size())
	_outcome_note_label.add_theme_font_size_override("font_size", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_outcome_note_font_size())
	_attacker_power_label.add_theme_font_size_override("font_size", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_team_power_font_size())
	_defender_power_label.add_theme_font_size_override("font_size", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_team_power_font_size())
	_attacker_name_label.add_theme_font_size_override("font_size", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_team_name_font_size())
	_defender_name_label.add_theme_font_size_override("font_size", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_team_name_font_size())
	_reward_title.add_theme_font_size_override("font_size", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_reward_title_font_size())
	_reward_body.add_theme_font_size_override("font_size", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_reward_body_font_size())
	_reward_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_reward_body.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_result_label.add_theme_color_override("font_color", Color(1.0, 0.84, 0.34, 1.0))
	_outcome_note_label.add_theme_color_override("font_color", Color(0.92, 0.84, 0.68, 0.98))
	_attacker_power_label.add_theme_color_override("font_color", Color(0.76, 0.88, 1.0, 1.0))
	_attacker_name_label.add_theme_color_override("font_color", Color(0.82, 0.90, 1.0, 1.0))
	_defender_power_label.add_theme_color_override("font_color", Color(1.0, 0.68, 0.62, 1.0))
	_defender_name_label.add_theme_color_override("font_color", Color(1.0, 0.78, 0.72, 1.0))
	_reward_title.add_theme_color_override("font_color", Color(1.0, 0.82, 0.42, 1.0))
	_reward_body.add_theme_color_override("font_color", Color(0.88, 0.82, 0.70, 0.98))
	_detail_section_title.add_theme_font_size_override("font_size", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_below_fold_title_font_size())
	_detail_section_title.add_theme_color_override("font_color", Color(0.98, 0.86, 0.55, 1.0))
	for label in [_result_label, _outcome_note_label, _attacker_power_label, _defender_power_label, _attacker_name_label, _defender_name_label, _reward_title, _detail_section_title]:
		_apply_label_shadow(label)
	_detail_section_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_detail_section_card.custom_minimum_size = Vector2(0, 176)
	_apply_panel_linework(_detail_state_card, Color(0.10, 0.10, 0.12, 0.92), Color(0.28, 0.28, 0.30, 0.92))
	_detail_state_title_label.add_theme_font_size_override("font_size", 12)
	_detail_state_title_label.add_theme_color_override("font_color", Color(0.78, 0.78, 0.80, 0.96))
	_detail_state_card.visible = false
	_morale_row.visible = false
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_footer_button_style(_share_button, "share")
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_footer_button_style(_favorite_button, "favorite")
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_footer_button_style(_replay_button, "replay")
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_tab_button_state(_battlefield_tab_button, _active_detail_tab_id == "battlefield")
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_tab_button_state(_stats_tab_button, _active_detail_tab_id == "stats")
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_tab_button_state(_formation_tab_button, _active_detail_tab_id == "formation")
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_footer_button_style(_collapse_button, "collapse")
	for button in [_share_button, _favorite_button, _battlefield_tab_button, _stats_tab_button, _formation_tab_button, _collapse_button]:
		button.clip_text = false
		button.add_theme_font_size_override("font_size", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_footer_button_font_size())

func _ensure_detail_page_scroll() -> void:
	if _detail_page_scroll != null and is_instance_valid(_detail_page_scroll):
		return
	var original_parent := _detail_margin.get_parent()
	if original_parent == null:
		return
	original_parent.remove_child(_detail_margin)
	_detail_page_scroll = ScrollContainer.new()
	_detail_page_scroll.name = "DetailPageScroll"
	_detail_page_scroll.set_anchors_preset(Control.PRESET_FULL_RECT)
	_detail_page_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_detail_page_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_scroll_container(_detail_page_scroll)
	add_child(_detail_page_scroll)
	_detail_page_scroll.add_child(_detail_margin)
	_detail_margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_detail_margin.size_flags_vertical = 0


func _ensure_first_open_stamp_motion() -> void:
	if _detail_section_column == null:
		return
	var stamp := _detail_section_column.get_node_or_null("BattleReportFirstOpenStamp") as PanelContainer
	if stamp == null:
		stamp = PanelContainer.new()
		stamp.name = "BattleReportFirstOpenStamp"
		stamp.size_flags_horizontal = Control.SIZE_SHRINK_END
		stamp.custom_minimum_size = Vector2(168, 34)
		stamp.mouse_filter = Control.MOUSE_FILTER_IGNORE
		stamp.add_theme_stylebox_override("panel", BATTLE_REPORT_UI_COMPONENT_FACTORY.make_snapshot_world_affairs_stamp_style(true))
		var margin := MarginContainer.new()
		margin.name = "BattleReportFirstOpenStampMargin"
		BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_margin(margin, 14, 4, 14, 4)
		stamp.add_child(margin)
		var row := HBoxContainer.new()
		row.name = "BattleReportFirstOpenStampRow"
		row.alignment = BoxContainer.ALIGNMENT_CENTER
		row.add_theme_constant_override("separation", 8)
		margin.add_child(row)
		var mark := Label.new()
		mark.name = "BattleReportFirstOpenStampMark"
		mark.text = "判"
		mark.add_theme_font_size_override("font_size", 16)
		mark.add_theme_color_override("font_color", Color(1.0, 0.78, 0.34, 1.0))
		row.add_child(mark)
		var label := Label.new()
		label.name = "BattleReportFirstOpenStampLabel"
		label.text = "战果已定"
		label.add_theme_font_size_override("font_size", 13)
		label.add_theme_color_override("font_color", Color(0.98, 0.88, 0.62, 1.0))
		row.add_child(label)
		_detail_section_column.add_child(stamp)
		_detail_section_column.move_child(stamp, 0)
	stamp.set_meta("battle_report_first_open_stamp_motion_token", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_first_open_stamp_motion_token())
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_motion_battle_report_first_open_stamp(stamp)


func get_mainline_visual_smoke_detail_summary() -> Dictionary:
	var first_open_stamp_count := _count_visible_nodes_by_name_prefix(self, "BattleReportFirstOpenStamp")
	var detail_frame_contract := _resolve_detail_frame_contract(_detail_page_contract)
	var summary := {
		"battleReportDetailScrollMode": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_scroll_mode(),
		"battleReportDetailScrollVerticalMode": -1,
		"battleReportDetailScrollHorizontalMode": -1,
		"battleReportDetailRuntimeVisualStageToken": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_visual_stage_token(),
		"battleReportDetailRuntimeResultFocusToken": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_result_focus_token(),
		"battleReportDetailRuntimeTeamCardToken": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_team_card_token(),
		"battleReportDetailRuntimeRewardPanelToken": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_reward_panel_token(),
		"battleReportDetailRuntimeTitleHierarchyToken": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_title_hierarchy_token(),
		"battleReportDetailRuntimeTimeMarkerToken": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_time_marker_token(),
		"battleReportDetailRuntimeCardDensityToken": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_card_density_token(),
		"battleReportDetailRuntimeCardCompositionToken": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_card_composition_token(),
		"battleReportDetailRuntimeCardCompositionMode": "opposed_army_result_focus_footer_tabs_v1",
		"battleReportDetailRuntimeCardCompositionOrder": str(_battle_row.get_meta("battle_report_detail_card_composition_order", "")),
		"battleReportDetailRuntimeCardCompositionFocus": str(_outcome_center_card.get_meta("battle_report_detail_card_composition_role", "")),
		"battleReportDetailRuntimeRewardCopyMode": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_reward_copy_mode(),
		"battleReportDetailRuntimeHeroInfoMode": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_hero_info_mode(),
		"battleReportDetailRuntimeMetaRowsToken": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_meta_rows_token(),
		"battleReportDetailRoundTimelineTitleFontSize": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_round_timeline_title_font_size(),
		"battleReportDetailRoundItemTitleFontSize": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_round_item_title_font_size(),
		"battleReportDetailRoundMarkerWidth": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_round_marker_size().x,
		"battleReportDetailRoundMarkerHeight": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_round_marker_size().y,
		"battleReportDetailCardDensityHeroMinHeight": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_hero_card_min_height(),
		"battleReportDetailCardDensityInfoBlockMinHeight": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_empty_block_min_height(),
		"battleReportDetailReplayVisible": _replay_button.visible,
		"battleReportDetailReplayRequestId": str(detail_frame_contract.get("replay_request_id", "")).strip_edges(),
		"battleReportDetailReplayAvailable": bool(detail_frame_contract.get("replay_available", false)),
		"battleReportDetailReplaySourceReportId": str(detail_frame_contract.get("replay_source_report_id", "")).strip_edges(),
		"battleReportOccupationReplaySaveHistoryChainToken": "battle_report_occupation_replay_save_history_chain_v1",
		"battleReportOccupationReplaySaveHistoryTrigger": "battle_report_detail_replay_to_player_history",
		"battleReportOccupationReplaySaveHistoryOwner": "BattleReportDetailPage+PlayerHistoryPanel",
		"battleReportOccupationVisibleResultText": _result_label.text.strip_edges(),
		"battleReportOccupationVisibleResultBound": _result_label.text.strip_edges() != "",
		"battleReportOccupationReplayButtonBound": _replay_button.visible and str(detail_frame_contract.get("replay_request_id", "")).strip_edges() != "",
		"battleReportDetailOutcomeNoteVisible": _outcome_note_label.visible,
		"battleReportDetailRewardContainsSummaryCopy": _reward_body.text.find("战报摘要") >= 0,
		"battleReportDetailRewardContainsReplayCopy": _reward_body.text.find("回放") >= 0,
		"battleReportDetailRewardNoRewardVisible": _reward_body.text.find("无奖励") >= 0,
		"battleReportDetailMoraleRowVisible": _morale_row.visible,
		"battleReportDetailLossLineCount": _count_visible_labels_containing(self, "损失"),
		"battleReportDetailBattlefieldPlaceholderCopyVisible": _count_visible_labels_containing(self, "来自真实战报 read model") > 0,
		"battleReportDetailHeroDeltaLineVisible": false,
		"battleReportDetailStarFallbackPolicy": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_star_fallback_policy(),
		"battleReportDetailRenderedThreeStarLabelCount": _count_visible_labels_by_exact_text(self, "★★★"),
		"battleReportDetailAttackerPortraitTextureCount": _count_detail_portrait_metric("attacker", "loaded"),
		"battleReportDetailAttackerPlaceholderHeroCount": _count_detail_portrait_metric("attacker", "placeholder"),
		"battleReportDetailDefenderPortraitTextureCount": _count_detail_portrait_metric("defender", "loaded"),
		"battleReportDetailDefenderPlaceholderHeroCount": _count_detail_portrait_metric("defender", "placeholder"),
		"battleReportDetailMetaRowCount": _count_visible_nodes_by_name_prefix(self, "BattleReportDetailMetaRow_"),
		"battleReportDetailCoordinateJumpButtonCount": _count_visible_nodes_by_name_prefix(self, "BattleReportCoordinateJumpButton"),
		"battleReportDetailCoordinateJumpButtonVisible": _count_visible_nodes_by_name_prefix(self, "BattleReportCoordinateJumpButton") > 0,
		"battleReportFirstOpenStampMotionToken": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_first_open_stamp_motion_token(),
		"battleReportFirstOpenStampVisible": first_open_stamp_count > 0,
		"battleReportFirstOpenStampNodeCount": first_open_stamp_count,
		"battleReportFirstOpenStampMotionBound": _count_visible_nodes_by_meta(self, "battle_report_first_open_stamp_motion_bound", "true") > 0,
		"battleReportFirstOpenStampMotionScope": _first_visible_node_meta_string(self, "BattleReportFirstOpenStamp", "battle_report_first_open_stamp_motion_scope"),
	}
	var governed_buttons := _collect_detail_governed_button_meta()
	summary["battleReportDetailButtonLiveTextContract"] = DETAIL_BUTTON_LIVE_TEXT_CONTRACT
	summary["battleReportDetailGovernedButtonVisibleCount"] = governed_buttons.size()
	summary["battleReportDetailGovernedButtonLabels"] = _join_detail_button_meta(governed_buttons, "label")
	summary["battleReportDetailGovernedButtonActionIds"] = _join_detail_button_meta(governed_buttons, "action_id")
	summary["battleReportDetailGovernedButtonRoles"] = _join_detail_button_meta(governed_buttons, "role")
	summary["battleReportDetailGovernedButtonTokenCount"] = _count_detail_button_meta(governed_buttons, "token")
	summary["battleReportDetailGovernedButtonMissingMetaCount"] = _count_detail_button_missing_meta(governed_buttons)
	summary["battleReportDetailAiLivingFeedbackToken"] = BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_ai_living_feedback_token()
	summary["battleReportDetailAiLivingFeedbackVisible"] = _count_visible_nodes_by_name_prefix(self, "BattleReportAiLivingFeedbackCard") > 0
	summary["battleReportDetailAiLivingFeedbackActorVisible"] = _count_visible_nodes_by_name_prefix(self, "BattleReportAiLivingFeedbackActor") > 0
	summary["battleReportDetailAiLivingFeedbackActionVisible"] = _count_visible_nodes_by_name_prefix(self, "BattleReportAiLivingFeedbackAction") > 0
	summary["battleReportDetailAiLivingFeedbackReasonVisible"] = _count_visible_nodes_by_name_prefix(self, "BattleReportAiLivingFeedbackReason") > 0
	summary["battleReportDetailAiLivingFeedbackResultVisible"] = _count_visible_nodes_by_name_prefix(self, "BattleReportAiLivingFeedbackResult") > 0
	summary["battleReportDetailAiActivityContinuityToken"] = BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_ai_activity_continuity_token()
	summary["battleReportDetailAiActivityContinuityVisible"] = _count_visible_nodes_by_name_prefix(self, "BattleReportAiLivingIdentityRow") > 0
	summary["battleReportDetailAiActivityAvatarVisible"] = _count_visible_nodes_by_name_prefix(self, "BattleReportAiLivingAvatarTexture") > 0
	summary["battleReportDetailAiActivityStatusDotVisible"] = _count_visible_nodes_by_name_prefix(self, "BattleReportAiLivingStatusDot") > 0
	summary["battleReportDetailAiActivityTraceCount"] = _max_visible_node_meta_int(self, "BattleReportAiLivingTraceCount", "battle_report_detail_ai_activity_trace_count")
	summary["battleReportDetailAiActivityFirstTraceId"] = _first_visible_node_meta_string(self, "BattleReportAiLivingTraceCount", "battle_report_detail_ai_activity_trace_id")
	summary["battleReportDetailAiActivityTraceIds"] = _collect_visible_node_meta_string_array(self, "BattleReportAiLivingTraceCount", "battle_report_detail_ai_activity_trace_ids")
	var source_label_visible := _first_visible_label_text_by_name_prefix(self, "BattleReportAiLivingFeedbackSource")
	var visible_copy_forbidden_hits := _collect_player_visible_copy_forbidden_hits(self)
	summary["battleReportDetailPlayerCopyOk"] = source_label_visible != "" and visible_copy_forbidden_hits.is_empty()
	summary["visibleCopyForbiddenHits"] = visible_copy_forbidden_hits
	summary["playerVisibleEngineeringCopyLeak"] = not visible_copy_forbidden_hits.is_empty()
	summary["battleReportDetailEmptyFeedbackCopyContract"] = BATTLE_REPORT_DETAIL_EMPTY_FEEDBACK_COPY_CONTRACT
	summary["battleReportDetailEmptyFeedbackCopyOk"] = visible_copy_forbidden_hits.is_empty()
	summary["sourceLabelVisible"] = source_label_visible
	summary["styleOwner"] = "BattleReportDetailPage + SlgUiComponentFactory"
	summary["battleReportDetailMaritimeResultChipId"] = _first_visible_node_meta_string(self, "BattleReportMaritimeResultChip", "battle_report_maritime_result_chip_id")
	summary["battleReportDetailMaritimeResultChipVisible"] = summary["battleReportDetailMaritimeResultChipId"] == "maritime_report_result_chip_v1"
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_ai_avatar_status_frame_family_summary(
		summary,
		"battleReportDetailAiActivity",
		_count_visible_nodes_by_name_prefix(self, "BattleReportAiLivingAvatarStatusFrameTexture"),
		_count_visible_nodes_by_name_prefix(self, "BattleReportAiLivingAvatarIntentBadgeTexture"),
		_first_visible_node_meta_string(self, "BattleReportAiLivingAvatarStatusFrameTexture", "ai_avatar_status_frame_asset_path")
	)
	summary["battleReportDetailAiActivityAvatarStatusFrameFamilyContract"] = BATTLE_REPORT_UI_COMPONENT_FACTORY.ai_avatar_status_frame_family_contract()
	summary["battleReportDetailAiActivityAvatarStatusFrameVisible"] = _count_visible_nodes_by_name_prefix(self, "BattleReportAiLivingAvatarStatusFrameTexture") > 0
	summary["battleReportDetailAiActivityAvatarIntentBadgeVisible"] = _count_visible_nodes_by_name_prefix(self, "BattleReportAiLivingAvatarIntentBadgeTexture") > 0
	summary["battleReportDetailAiActivityIdentityChipToken"] = BATTLE_REPORT_UI_COMPONENT_FACTORY.ai_activity_identity_chip_token()
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_ai_activity_identity_chip_summary(
		summary,
		"battleReportDetailAiActivity",
		_count_visible_nodes_by_meta(self, "ai_activity_identity_chip_token", BATTLE_REPORT_UI_COMPONENT_FACTORY.ai_activity_identity_chip_token())
	)
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_ai_activity_carrying_troops_chip_summary(
		summary,
		"battleReportDetailAiActivity",
		_count_visible_nodes_by_name_prefix(self, "BattleReportAiLivingCarryingTroopsChipRow") > 0,
		_count_visible_nodes_by_name_prefix(self, "BattleReportAiLivingCarryingTroopsChip_"),
		_count_visible_nodes_by_name_prefix(self, "BattleReportAiLivingCarryingTroopsTexture_"),
		_collect_visible_node_meta_string_array(self, "BattleReportAiLivingCarryingTroopsChip_", "battle_report_detail_ai_activity_carrying_troops_label"),
		_collect_visible_node_meta_string_array(self, "BattleReportAiLivingCarryingTroopsChip_", "battle_report_detail_ai_activity_carrying_troops_asset_path")
	)
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_portrait_frame_summary(summary)
	if _detail_page_scroll != null and is_instance_valid(_detail_page_scroll):
		summary["battleReportDetailScrollVerticalMode"] = int(_detail_page_scroll.vertical_scroll_mode)
		summary["battleReportDetailScrollHorizontalMode"] = int(_detail_page_scroll.horizontal_scroll_mode)
	return summary

func _collect_detail_governed_button_meta() -> Array[Dictionary]:
	var rows: Array[Dictionary] = []
	_collect_detail_governed_button_meta_recursive(self, rows)
	return rows

func _collect_detail_governed_button_meta_recursive(node: Node, rows: Array[Dictionary]) -> void:
	if node is Button:
		var button := node as Button
		var action_id := str(button.get_meta("battle_report_detail_button_action_id", "")).strip_edges()
		if action_id != "" and button.visible and button.is_visible_in_tree():
			rows.append({
				"action_id": action_id,
				"label": str(button.get_meta("battle_report_detail_button_live_text_label", button.text)).strip_edges(),
				"role": str(button.get_meta("battle_report_detail_button_role", "")).strip_edges(),
				"token": str(button.get_meta("battle_report_detail_button_token", "")).strip_edges(),
				"live_text_contract": str(button.get_meta("battle_report_detail_button_live_text_contract", "")).strip_edges(),
			})
	for child in node.get_children():
		_collect_detail_governed_button_meta_recursive(child, rows)

func _join_detail_button_meta(rows: Array[Dictionary], key: String) -> String:
	var values: Array[String] = []
	for row in rows:
		var value := str(row.get(key, "")).strip_edges()
		if value != "":
			values.append(value)
	return " / ".join(values)

func _count_detail_button_meta(rows: Array[Dictionary], key: String) -> int:
	var count := 0
	for row in rows:
		if str(row.get(key, "")).strip_edges() != "":
			count += 1
	return count

func _count_detail_button_missing_meta(rows: Array[Dictionary]) -> int:
	var count := 0
	for row in rows:
		if str(row.get("action_id", "")).strip_edges() == "":
			count += 1
		if str(row.get("label", "")).strip_edges() == "":
			count += 1
		if str(row.get("token", "")).strip_edges() == "":
			count += 1
		if str(row.get("live_text_contract", "")).strip_edges() != DETAIL_BUTTON_LIVE_TEXT_CONTRACT:
			count += 1
	return count


func _count_detail_portrait_metric(side: String, metric: String) -> int:
	var count := 0
	var nodes := [self]
	while not nodes.is_empty():
		var node: Node = nodes.pop_back()
		for child in node.get_children():
			nodes.append(child)
		if str(node.get_meta("battle_report_detail_portrait_side", "")) != side:
			continue
		match metric:
			"loaded":
				if bool(node.get_meta("battle_report_detail_portrait_loaded", false)):
					count += 1
			"placeholder":
				if bool(node.get_meta("battle_report_detail_portrait_placeholder", false)):
					count += 1
	return count

func _count_visible_nodes_by_name_prefix(root: Node, name_prefix: String) -> int:
	var count := 0
	var nodes := [root]
	while not nodes.is_empty():
		var node: Node = nodes.pop_back()
		for child in node.get_children():
			nodes.append(child)
		if not str(node.name).begins_with(name_prefix):
			continue
		if node is CanvasItem:
			var canvas_item := node as CanvasItem
			if not canvas_item.visible or not canvas_item.is_visible_in_tree():
				continue
		count += 1
	return count


func _count_visible_nodes_by_meta(root: Node, meta_key: String, expected_value: String) -> int:
	var count := 0
	var nodes := [root]
	while not nodes.is_empty():
		var node: Node = nodes.pop_back()
		for child in node.get_children():
			nodes.append(child)
		if node is CanvasItem:
			var canvas_item := node as CanvasItem
			if not canvas_item.visible or not canvas_item.is_visible_in_tree():
				continue
		if str(node.get_meta(meta_key, "")).strip_edges() == expected_value:
			count += 1
	return count


func _max_visible_node_meta_int(root: Node, name_prefix: String, meta_key: String) -> int:
	var max_value := 0
	var nodes := [root]
	while not nodes.is_empty():
		var node: Node = nodes.pop_back()
		for child in node.get_children():
			nodes.append(child)
		if not str(node.name).begins_with(name_prefix):
			continue
		if node is CanvasItem:
			var canvas_item := node as CanvasItem
			if not canvas_item.visible or not canvas_item.is_visible_in_tree():
				continue
		max_value = maxi(max_value, int(node.get_meta(meta_key, 0)))
	return max_value


func _first_visible_node_meta_string(root: Node, name_prefix: String, meta_key: String) -> String:
	var nodes := [root]
	while not nodes.is_empty():
		var node: Node = nodes.pop_back()
		for child in node.get_children():
			nodes.append(child)
		if not str(node.name).begins_with(name_prefix):
			continue
		if node is CanvasItem:
			var canvas_item := node as CanvasItem
			if not canvas_item.visible or not canvas_item.is_visible_in_tree():
				continue
		var value := str(node.get_meta(meta_key, "")).strip_edges()
		if value != "":
			return value
	return ""


func _collect_visible_node_meta_string_array(root: Node, name_prefix: String, meta_key: String) -> Array:
	var result: Array[String] = []
	var nodes := [root]
	while not nodes.is_empty():
		var node: Node = nodes.pop_back()
		for child in node.get_children():
			nodes.append(child)
		if not str(node.name).begins_with(name_prefix):
			continue
		if node is CanvasItem:
			var canvas_item := node as CanvasItem
			if not canvas_item.visible or not canvas_item.is_visible_in_tree():
				continue
		var raw_value: Variant = node.get_meta(meta_key, [])
		if raw_value is Array:
			for value_variant in raw_value as Array:
				var value := str(value_variant).strip_edges()
				if value != "" and not result.has(value):
					result.append(value)
		else:
			var value := str(raw_value).strip_edges()
			if value != "" and not result.has(value):
				result.append(value)
	return result


func _count_visible_labels_containing(root: Node, pattern: String) -> int:
	var count := 0
	var nodes := [root]
	while not nodes.is_empty():
		var node: Node = nodes.pop_back()
		for child in node.get_children():
			nodes.append(child)
		if not (node is Label):
			continue
		var label := node as Label
		if not label.visible:
			continue
		if label.text.find(pattern) >= 0:
			count += 1
	return count

func _first_visible_label_text_by_name_prefix(root: Node, name_prefix: String) -> String:
	var nodes := [root]
	while not nodes.is_empty():
		var node: Node = nodes.pop_back()
		for child in node.get_children():
			nodes.append(child)
		if not str(node.name).begins_with(name_prefix):
			continue
		if not (node is Label):
			continue
		var label := node as Label
		if not label.visible or not label.is_visible_in_tree():
			continue
		var value := label.text.strip_edges()
		if value != "":
			return value
	return ""

func _collect_player_visible_copy_forbidden_hits(root: Node) -> Array:
	var hits: Array = []
	_collect_player_visible_copy_forbidden_hits_recursive(root, [
		"battle_report_detail",
		"battle_report",
		"battleRecords",
		"feedback.battleRecords",
		"read model",
		"backend",
		"contract id",
		"authority",
		"tier",
		"snake_case",
		"/api/",
		"source_label",
		"SOM-",
		"SOM_",
		"child-page",
		"detail_page_contract",
		"navalBattleScope",
		"victory",
		"defeat",
		"pending",
		"success",
		"failed",
	], hits)
	return hits

func _collect_player_visible_copy_forbidden_hits_recursive(node: Node, forbidden_terms: Array, hits: Array) -> void:
	if node is CanvasItem:
		var canvas_item := node as CanvasItem
		if not canvas_item.visible or not canvas_item.is_visible_in_tree():
			return
	var text_value := ""
	if node is Label:
		text_value = (node as Label).text
	elif node is Button:
		text_value = (node as Button).text
	elif node is RichTextLabel:
		text_value = (node as RichTextLabel).text
	if text_value != "":
		var lowered := text_value.to_lower()
		for term_variant in forbidden_terms:
			var term := str(term_variant).strip_edges()
			if term != "" and lowered.find(term.to_lower()) >= 0:
				hits.append({
					"path": str(node.get_path()),
					"needle": term,
					"text": text_value.substr(0, 80),
				})
	for child in node.get_children():
		_collect_player_visible_copy_forbidden_hits_recursive(child, forbidden_terms, hits)


func _ensure_detail_section_content() -> void:
	if _detail_section_content != null and is_instance_valid(_detail_section_content):
		return
	_detail_section_content = VBoxContainer.new()
	_detail_section_content.name = "DetailSectionDynamicContent"
	_detail_section_content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_detail_section_content.add_theme_constant_override("separation", 8)
	_detail_section_column.add_child(_detail_section_content)

func _ensure_below_fold_content() -> void:
	if _below_fold_content != null and is_instance_valid(_below_fold_content):
		return
	_below_fold_spacer = Control.new()
	_below_fold_spacer.name = "SOM_D11_BelowFoldSpacer"
	_below_fold_spacer.custom_minimum_size = Vector2(0, BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_below_fold_spacer_min_height())
	_below_fold_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_detail_column.add_child(_below_fold_spacer)

	_below_fold_section_card = PanelContainer.new()
	_below_fold_section_card.name = "SOM_D11_BelowFoldSectionCard"
	_below_fold_section_card.custom_minimum_size = Vector2(0, 420)
	_below_fold_section_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_apply_panel_linework(_below_fold_section_card, Color(0.095, 0.095, 0.105, 0.96), Color(0.34, 0.31, 0.24, 0.92))
	_detail_column.add_child(_below_fold_section_card)

	var margin := MarginContainer.new()
	_apply_margin(margin, 14, 14, 14, 14)
	_below_fold_section_card.add_child(margin)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)

	var title := Label.new()
	title.name = "SOM_D11_BelowFoldTitle"
	title.text = "统计 / 战法详情"
	title.add_theme_font_size_override("font_size", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_below_fold_title_font_size())
	title.add_theme_color_override("font_color", Color(0.92, 0.84, 0.62, 1.0))
	column.add_child(title)

	_below_fold_content = VBoxContainer.new()
	_below_fold_content.name = "SOM_D11_BelowFoldContent"
	_below_fold_content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_below_fold_content.add_theme_constant_override("separation", 10)
	column.add_child(_below_fold_content)

func _rebuild_below_fold_blocks(page_contract: Dictionary, detail_frame_contract: Dictionary) -> void:
	if _below_fold_content == null or not is_instance_valid(_below_fold_content):
		return
	_clear_children(_below_fold_content)
	var below_fold_blocks := page_contract.get("below_fold_blocks", []) as Array
	var has_blocks := not below_fold_blocks.is_empty()
	if _below_fold_spacer != null:
		_below_fold_spacer.visible = has_blocks
	if _below_fold_section_card != null:
		_below_fold_section_card.visible = has_blocks
	if not has_blocks:
		return
	for block_variant in below_fold_blocks:
		if not (block_variant is Dictionary):
			continue
		var block := _build_detail_page_block(block_variant as Dictionary, detail_frame_contract)
		if block != null:
			_below_fold_content.add_child(block)

func _apply_progress_bar_values(bar: ProgressBar, current_value: int, max_value: int, fill_color: Color) -> void:
	bar.max_value = float(maxi(max_value, 1))
	bar.value = float(clampi(current_value, 0, int(bar.max_value)))
	bar.show_percentage = false
	var background_style := StyleBoxFlat.new()
	background_style.bg_color = Color(0.10, 0.10, 0.11, 0.94)
	bar.add_theme_stylebox_override("background", background_style)
	var fill_style := StyleBoxFlat.new()
	fill_style.bg_color = fill_color
	bar.add_theme_stylebox_override("fill", fill_style)

func _apply_panel_linework(panel: PanelContainer, bg_color: Color, border_color: Color, border_width: int = 1) -> void:
	var style_box := StyleBoxFlat.new()
	style_box.bg_color = bg_color
	style_box.border_color = border_color
	style_box.set_border_width_all(border_width)
	panel.add_theme_stylebox_override("panel", style_box)

func _apply_label_shadow(label: Label) -> void:
	if label == null:
		return
	label.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.86))
	label.add_theme_constant_override("shadow_offset_x", 1)
	label.add_theme_constant_override("shadow_offset_y", 1)

func _apply_margin(container: MarginContainer, left: int, top: int, right: int, bottom: int) -> void:
	container.add_theme_constant_override("margin_left", left)
	container.add_theme_constant_override("margin_top", top)
	container.add_theme_constant_override("margin_right", right)
	container.add_theme_constant_override("margin_bottom", bottom)

func _count_visible_labels_by_exact_text(root: Node, expected_text: String) -> int:
	if root == null:
		return 0
	if root is CanvasItem:
		var canvas_item := root as CanvasItem
		if not canvas_item.visible or not canvas_item.is_visible_in_tree():
			return 0
	var count := 0
	if root is Label and (root as Label).text == expected_text:
		count += 1
	for child in root.get_children():
		count += _count_visible_labels_by_exact_text(child, expected_text)
	return count

func _clear_children(node: Node) -> void:
	for child in node.get_children():
		node.remove_child(child)
		child.queue_free()

func _coerce_string_array(raw_value: Variant) -> Array[String]:
	var result: Array[String] = []
	if raw_value is Array:
		for item in raw_value as Array:
			var text := str(item).strip_edges()
			if text != "":
				result.append(text)
	return result

func _coerce_dictionary(raw_value: Variant) -> Dictionary:
	if raw_value is Dictionary:
		return raw_value as Dictionary
	return {}

func _on_replay_button_pressed() -> void:
	var detail_frame_contract := _resolve_detail_frame_contract(_detail_page_contract)
	var replay_request_id := str(detail_frame_contract.get("replay_request_id", "")).strip_edges()
	var source_report_id := str(detail_frame_contract.get("replay_source_report_id", "")).strip_edges()
	if replay_request_id == "":
		_detail_section_body.text = "当前战报还没有可用回放。"
		return
	_detail_section_body.text = "正在打开战况回放。"
	replay_requested.emit({
		"replayRequestId": replay_request_id,
		"sourceReportId": source_report_id,
		"source": "battle_report_detail",
	})

func _on_share_button_pressed() -> void:
	_detail_section_body.text = "分享入口已保留；当前先固定结构关系。"

func _on_favorite_button_pressed() -> void:
	_detail_section_body.text = "收藏入口已保留；当前先固定结构关系。"

func _on_detail_tab_pressed(tab_id: String) -> void:
	_active_detail_tab_id = tab_id
	_refresh_view()
	detail_tab_selected.emit(tab_id)

func _on_collapse_button_pressed() -> void:
	back_requested.emit()

func _on_coordinate_jump_button_pressed(row_payload: Dictionary) -> void:
	var coordinate_variant: Variant = row_payload.get("coordinate", {})
	if not (coordinate_variant is Dictionary):
		return
	var payload := {
		"source": "battle_report_detail",
		"value": str(row_payload.get("value", "")).strip_edges(),
		"coordinate": (coordinate_variant as Dictionary).duplicate(true),
	}
	coordinate_jump_requested.emit(payload)
