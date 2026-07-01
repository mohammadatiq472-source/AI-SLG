extends Control
class_name BattleReportListPage

signal report_selected(report_id: String)

const BATTLE_REPORT_PRESENTER_SCRIPT := preload("res://scripts/ui/presenters/battle_report_presenter.gd")
const BattleReportPortraitRegistryScript := preload("res://scripts/ui/battle_report_portrait_registry.gd")
const BATTLE_REPORT_UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")
const DEFAULT_SHARED_STATE_TITLE := "壳层状态"

@onready var _list_summary_card: PanelContainer = $ListMargin/ListColumn/SOM_L04_ListSummaryCard
@onready var _list_summary_label: Label = $ListMargin/ListColumn/SOM_L04_ListSummaryCard/ListSummaryMargin/ListSummaryLabel
@onready var _shared_state_card: PanelContainer = $ListMargin/ListColumn/SOM_L04A_SharedStateCard
@onready var _shared_state_title_label: Label = $ListMargin/ListColumn/SOM_L04A_SharedStateCard/SharedStateMargin/SharedStateColumn/SharedStateTitleLabel
@onready var _shared_state_flow: HFlowContainer = $ListMargin/ListColumn/SOM_L04A_SharedStateCard/SharedStateMargin/SharedStateColumn/SharedStateFlow
@onready var _report_scroll: ScrollContainer = $ListMargin/ListColumn/SOM_L05_L09_ListBodyRow/SOM_L05_L08_ReportScroll
@onready var _report_card_list: VBoxContainer = $ListMargin/ListColumn/SOM_L05_L09_ListBodyRow/SOM_L05_L08_ReportScroll/ReportCardList
@onready var _list_utility_rail: VBoxContainer = $ListMargin/ListColumn/SOM_L05_L09_ListBodyRow/SOM_L09_ListUtilityRail
@onready var _filter_button: Button = $ListMargin/ListColumn/SOM_L05_L09_ListBodyRow/SOM_L09_ListUtilityRail/SOM_L09_FilterButton
@onready var _scroll_hint_label: Label = $ListMargin/ListColumn/SOM_L05_L09_ListBodyRow/SOM_L09_ListUtilityRail/SOM_L09_ScrollHintLabel

var _page_payload: Dictionary = {}
var _last_entry_count := 0
var _report_card_motion_cards: Array[Control] = []
var _report_card_motion_waiting := false
var _report_card_motion_frame_count := 0

func _ready() -> void:
	_apply_static_styling()
	_refresh_view()

func _exit_tree() -> void:
	_disconnect_report_card_motion_frame()
	_report_card_motion_cards.clear()
	_report_card_motion_waiting = false
	_report_card_motion_frame_count = 0

func set_page_payload(page_payload: Dictionary) -> void:
	_page_payload = page_payload.duplicate(true)
	_refresh_view()

func _refresh_view() -> void:
	var page_contract := _coerce_dictionary(_page_payload.get("page_contract", {}))
	var list_frame_contract := _coerce_dictionary(page_contract.get("list_frame_contract", {}))
	var entry_contracts: Array = page_contract.get("entry_contracts", []) as Array
	var display_entry_contracts := _resolve_display_entry_contracts(entry_contracts)
	var shared_state := _coerce_dictionary(_page_payload.get("shared_state", {}))
	var has_entries := not entry_contracts.is_empty()
	_last_entry_count = entry_contracts.size()
	var show_summary_card := bool(list_frame_contract.get("show_summary_card", false)) and not bool(list_frame_contract.get("hide_summary_card", false))
	var show_shared_state_card := bool(list_frame_contract.get("show_shared_state_card", false)) and not bool(list_frame_contract.get("hide_shared_state_card", false))
	var show_utility_rail := bool(list_frame_contract.get("show_utility_rail", true)) and not bool(list_frame_contract.get("hide_utility_rail", false))
	_list_summary_card.visible = show_summary_card
	if show_summary_card:
		_list_summary_label.text = str(list_frame_contract.get("summary_text", "")).strip_edges()
		if _list_summary_label.text == "":
			_list_summary_label.text = "战报列表会把同类交战按时间顺序合并展示，当前先对齐结构与层级。"
	if show_shared_state_card:
		_refresh_shared_state(shared_state, entry_contracts)
	else:
		_clear_children(_shared_state_flow)
		_shared_state_card.visible = false
	_list_utility_rail.visible = show_utility_rail
	_filter_button.text = str(list_frame_contract.get("filter_label", "筛\n选")) if has_entries else "筛\n选"
	_scroll_hint_label.text = str(list_frame_contract.get("scroll_hint_label", "1\n∨")) if has_entries else "1\n∨"
	_rebuild_entries(display_entry_contracts, shared_state, has_entries)

func _rebuild_entries(entry_contracts: Array, shared_state: Dictionary, interactive: bool = true) -> void:
	_clear_children(_report_card_list)
	var card_index := 0
	var motion_cards: Array[Control] = []
	for report_card_variant in entry_contracts:
		if not (report_card_variant is Dictionary):
			continue
		var report_card := _build_report_card(report_card_variant as Dictionary, shared_state, interactive)
		_report_card_list.add_child(report_card)
		motion_cards.append(report_card)
		card_index += 1
	_schedule_report_card_motion_after_layout(motion_cards)

func _schedule_report_card_motion_after_layout(report_cards: Array[Control]) -> void:
	_report_card_motion_cards.clear()
	for report_card in report_cards:
		_report_card_motion_cards.append(report_card)
	_report_card_motion_frame_count = 0
	if _report_card_motion_waiting:
		return
	_report_card_motion_waiting = true
	_connect_report_card_motion_frame()

func _connect_report_card_motion_frame() -> void:
	var tree := get_tree()
	if tree == null:
		_apply_report_card_motion_after_layout()
		return
	var callback := Callable(self, "_on_report_card_motion_frame")
	if not tree.process_frame.is_connected(callback):
		tree.process_frame.connect(callback, CONNECT_ONE_SHOT)

func _disconnect_report_card_motion_frame() -> void:
	var tree := get_tree()
	if tree == null:
		return
	var callback := Callable(self, "_on_report_card_motion_frame")
	if tree.process_frame.is_connected(callback):
		tree.process_frame.disconnect(callback)

func _on_report_card_motion_frame() -> void:
	_report_card_motion_frame_count += 1
	if _report_card_motion_frame_count < 2:
		_connect_report_card_motion_frame()
		return
	_apply_report_card_motion_after_layout()

func _apply_report_card_motion_after_layout() -> void:
	var report_cards: Array[Control] = []
	for report_card in _report_card_motion_cards:
		report_cards.append(report_card)
	_report_card_motion_cards.clear()
	_report_card_motion_waiting = false
	_report_card_motion_frame_count = 0
	var card_index := 0
	for report_card in report_cards:
		if is_instance_valid(report_card):
			BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_motion_battle_report_enter(report_card, card_index)
			card_index += 1

func _resolve_display_entry_contracts(entry_contracts: Array) -> Array:
	if not entry_contracts.is_empty():
		return entry_contracts
	var empty_state_contracts: Dictionary = BATTLE_REPORT_PRESENTER_SCRIPT.build_empty_state_contracts()
	var fallback_entry_contracts: Variant = empty_state_contracts.get("entry_contracts", [])
	return fallback_entry_contracts as Array if fallback_entry_contracts is Array else []

func _refresh_shared_state(shared_state: Dictionary, entry_contracts: Array) -> void:
	_clear_children(_shared_state_flow)
	_shared_state_title_label.text = DEFAULT_SHARED_STATE_TITLE
	_shared_state_flow.add_child(_build_shared_state_chip(
		"当前页",
		_resolve_shared_state_text(shared_state, "page_id", entry_contracts),
		Color(0.82, 0.74, 0.60, 0.98),
		"SOM_L04A_PageIdChip"
	))
	_shared_state_flow.add_child(_build_shared_state_chip(
		"列表模式",
		_resolve_shared_state_text(shared_state, "list_mode", entry_contracts),
		Color(0.78, 0.72, 0.58, 0.98),
		"SOM_L04A_ListModeChip"
	))
	_shared_state_flow.add_child(_build_shared_state_chip(
		"战报数量",
		_resolve_shared_state_text(shared_state, "report_count", entry_contracts),
		Color(0.62, 0.78, 0.64, 0.98),
		"SOM_L04A_ReportCountChip"
	))
	_shared_state_flow.add_child(_build_shared_state_chip(
		"选中战报",
		_resolve_shared_state_text(shared_state, "selected_report", entry_contracts),
		Color(0.74, 0.80, 0.92, 0.98),
		"SOM_L04A_SelectedReportChip"
	))
	_shared_state_flow.add_child(_build_shared_state_chip(
		"详情页签",
		_resolve_shared_state_text(shared_state, "detail_tab", entry_contracts),
		Color(0.92, 0.78, 0.62, 0.98),
		"SOM_L04A_DetailTabChip"
	))
	_shared_state_card.visible = _shared_state_flow.get_child_count() > 0

func _build_shared_state_chip(title: String, value: String, accent_color: Color, node_name: String = "") -> Control:
	var panel := PanelContainer.new()
	if node_name != "":
		panel.name = node_name
	panel.custom_minimum_size = Vector2(116, 0)
	_apply_panel_linework(panel, Color(0.12, 0.12, 0.14, 0.94), Color(0.30, 0.30, 0.32, 0.92))

	var margin := MarginContainer.new()
	_apply_margin(margin, 8, 6, 8, 6)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 2)
	margin.add_child(column)

	var title_label := _build_label(title, 11, Color(0.72, 0.72, 0.74, 0.96))
	title_label.size_flags_horizontal = 0
	column.add_child(title_label)

	var value_label := _build_label(value, 13, accent_color, true)
	value_label.custom_minimum_size = Vector2(96, 0)
	column.add_child(value_label)
	return panel

func _resolve_shared_state_text(shared_state: Dictionary, key: String, entry_contracts: Array) -> String:
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
				return _truncate_text(selected_report_label, 20)
			var report_count := maxi(int(shared_state.get("report_count", entry_contracts.size())), 0)
			if report_count <= 0:
				return "结构预览"
			var report_id := str(shared_state.get(key, "")).strip_edges()
			if report_id == "":
				return "未选择"
			for report_card_variant in entry_contracts:
				if not (report_card_variant is Dictionary):
					continue
				var report_card := report_card_variant as Dictionary
				if str(report_card.get("report_id", "")).strip_edges() != report_id:
					continue
				var header_block := _coerce_dictionary(report_card.get("header_block", {}))
				var attacker := str(header_block.get("attacker_team_label", "")).strip_edges()
				var defender := str(header_block.get("defender_team_label", "")).strip_edges()
				if attacker != "" and defender != "":
					return _truncate_text("%s vs %s" % [attacker, defender], 20)
			return _truncate_text(report_id, 20)
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

func _truncate_text(text: String, max_length: int) -> String:
	if text.length() <= max_length:
		return text
	return "%s…" % text.substr(0, maxi(max_length - 1, 1))

func _build_structure_box(title: String, min_size: Vector2, expand: bool = false, node_name: String = "") -> Control:
	var panel := PanelContainer.new()
	if node_name != "":
		panel.name = node_name
	panel.custom_minimum_size = min_size
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL if expand else 0
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_list_structure_box_style(panel)

	var margin := MarginContainer.new()
	var structure_margin_x := BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_structure_box_margin_x()
	var structure_margin_y := BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_structure_box_margin_y()
	_apply_margin(margin, structure_margin_x, structure_margin_y, structure_margin_x, structure_margin_y)
	panel.add_child(margin)

	var label := _build_label(title, BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_structure_box_font_size(), Color(0.86, 0.86, 0.88, 0.96), true)
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_list_structure_label_style(label)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	margin.add_child(label)
	return panel

func _build_source_badge(title: String, node_name: String = "") -> Control:
	var panel := PanelContainer.new()
	if node_name != "":
		panel.name = node_name
	var margin := MarginContainer.new()
	_apply_margin(margin, 4, 2, 4, 2)
	panel.add_child(margin)
	var label := _build_label(title, BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_card_badge_font_size(), Color(0.98, 0.98, 1.0, 0.98), false, true)
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_list_source_badge_style(panel, label)
	margin.add_child(label)
	return panel

func _build_report_card(report_card: Dictionary, shared_state: Dictionary, interactive: bool = true) -> Control:
	var report_id := str(report_card.get("report_id", "")).strip_edges()
	var header_block := _coerce_dictionary(report_card.get("header_block", {}))
	var body_blocks := report_card.get("body_blocks", []) as Array
	var selected_report_id := str(shared_state.get("selected_report", "")).strip_edges()
	var is_selected := report_id != "" and report_id == selected_report_id
	var button := Button.new()
	button.name = "ReportCard_%s" % (report_id if report_id != "" else "unknown")
	button.text = ""
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.disabled = not interactive
	button.set_meta("battle_report_list_card_hierarchy_token", BATTLE_REPORT_UI_COMPONENT_FACTORY.BATTLE_REPORT_LIST_CARD_HIERARCHY_TOKEN)
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_list_card_button_style(button, is_selected)
	if interactive:
		button.pressed.connect(Callable(self, "_on_report_button_pressed").bind(report_id))

	var margin := MarginContainer.new()
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	var card_margin_x := BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_card_margin_x()
	var card_margin_y := BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_card_margin_y()
	_apply_margin(margin, card_margin_x, card_margin_y, card_margin_x, card_margin_y)
	button.add_child(margin)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.mouse_filter = Control.MOUSE_FILTER_IGNORE
	column.add_theme_constant_override("separation", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_card_column_spacing())
	margin.add_child(column)
	column.add_child(_build_entry_header_block(header_block))

	var body_row := HBoxContainer.new()
	body_row.name = "SOM_L06_L09_BodyRow"
	body_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body_row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	body_row.set_meta("battle_report_list_card_body_order", "attacker_result_defender")
	body_row.add_theme_constant_override("separation", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_card_body_spacing())
	for block_variant in body_blocks:
		if not (block_variant is Dictionary):
			continue
		var block := _build_entry_body_block(block_variant as Dictionary, is_selected)
		if block != null:
			body_row.add_child(block)
	column.add_child(body_row)
	return button

func _build_entry_header_block(header_block: Dictionary) -> Control:
	var header_row := HBoxContainer.new()
	header_row.name = "SOM_L05_HeaderRow"
	header_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	header_row.add_theme_constant_override("separation", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_card_header_spacing())
	header_row.add_child(_build_source_badge(str(header_block.get("badge_label", "战")), "SOM_L05_A_Badge"))
	var maritime_chip_id := str(header_block.get("maritime_report_result_chip_id", header_block.get("maritimeReportResultChipId", ""))).strip_edges()
	if maritime_chip_id == "maritime_report_result_chip_v1":
		header_row.add_child(_build_maritime_result_list_chip(maritime_chip_id))
	header_row.add_child(_build_label(str(header_block.get("attacker_team_label", "我方标题")), BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_card_title_font_size(), Color(0.92, 0.92, 0.94, 0.98), true, true))
	header_row.add_child(_build_label(str(header_block.get("location_label", "地点 / 等级")), BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_card_location_font_size(), Color(0.74, 0.82, 0.76, 0.96), false, false))
	header_row.add_child(_build_label(str(header_block.get("defender_team_label", "敌方标题")), BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_card_title_font_size(), Color(0.86, 0.80, 0.80, 0.96), true, false))
	return header_row

func _build_maritime_result_list_chip(chip_id: String) -> Control:
	var chip := PanelContainer.new()
	chip.name = "BattleReportMaritimeResultListChip"
	chip.custom_minimum_size = Vector2(34, 20)
	chip.set_meta("battle_report_maritime_result_chip_id", chip_id)
	_apply_panel_linework(chip, Color(0.06, 0.13, 0.16, 0.94), Color(0.36, 0.70, 0.78, 0.92))
	var margin := MarginContainer.new()
	_apply_margin(margin, 6, 1, 6, 1)
	chip.add_child(margin)
	var label := _build_label("海", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_card_badge_font_size(), Color(0.78, 0.96, 1.0, 0.98), false, true)
	margin.add_child(label)
	return chip

func _build_entry_body_block(block_payload: Dictionary, is_selected: bool) -> Control:
	match str(block_payload.get("kind", "")).strip_edges():
		"team_cluster":
			return _build_team_cluster(block_payload)
		"result_cluster":
			return _build_result_cluster(block_payload)
		"utility_cluster":
			return null
		_:
			return null

func _build_team_cluster(team_block: Dictionary) -> Control:
	var is_defender := str(team_block.get("side", "")).strip_edges() == "defender"
	var som_prefix := "SOM_L08" if is_defender else "SOM_L06"
	var panel := PanelContainer.new()
	panel.name = "%s_TeamCluster" % som_prefix
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_team_cluster_min_height())
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_list_team_cluster_frame(panel)
	_apply_panel_linework(
		panel,
		Color(0.15, 0.09, 0.09, 0.95) if is_defender else Color(0.08, 0.10, 0.16, 0.95),
		Color(0.48, 0.22, 0.22, 0.92) if is_defender else Color(0.22, 0.34, 0.56, 0.92)
	)

	var margin := MarginContainer.new()
	_apply_margin(margin, 6, 6, 6, 6)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 5)
	margin.add_child(column)

	var stat_row := HBoxContainer.new()
	stat_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stat_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stat_row.add_theme_constant_override("separation", 8)
	var title := str(team_block.get("title", "")).strip_edges()
	var title_label := _build_label(title if title != "" else "所部", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_team_title_font_size(), Color(0.88, 0.87, 0.82, 0.98), false, false)
	title_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stat_row.add_child(title_label)
	var power_label := _build_label(str(team_block.get("power_label", "0/0")), BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_team_power_font_size(), Color(0.92, 0.92, 0.94, 0.98), false, true)
	power_label.custom_minimum_size = Vector2(88, 0)
	stat_row.add_child(power_label)
	column.add_child(stat_row)

	var bar := ProgressBar.new()
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar.custom_minimum_size = Vector2(0, 5)
	bar.max_value = float(maxi(int(team_block.get("power_max", 1)), 1))
	bar.value = float(clampi(int(team_block.get("power_current", 0)), 0, int(bar.max_value)))
	bar.show_percentage = false
	_apply_progress_bar_style(
		bar,
		Color(0.73, 0.20, 0.20, 0.96) if is_defender else Color(0.28, 0.52, 0.88, 0.98),
		Color(0.10, 0.10, 0.11, 0.94)
	)
	column.add_child(bar)

	var hero_row := HBoxContainer.new()
	hero_row.name = "%s_HeroRow" % som_prefix
	hero_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hero_row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	hero_row.alignment = BoxContainer.ALIGNMENT_CENTER
	hero_row.add_theme_constant_override("separation", 8)
	var hero_list := team_block.get("hero_slots", []) as Array
	var hero_index := 0
	for hero_variant in hero_list:
		if not (hero_variant is Dictionary):
			continue
		hero_index += 1
		hero_row.add_child(_build_compact_hero_slot(hero_variant as Dictionary, "%s_C%s_HeroSlot" % [som_prefix, str(hero_index)], is_defender))
	column.add_child(hero_row)
	return panel

func _build_compact_hero_slot(hero: Dictionary, node_name: String = "", is_defender: bool = false) -> Control:
	var panel := PanelContainer.new()
	if node_name != "":
		panel.name = node_name
	panel.size_flags_horizontal = 0
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_hero_slot_size()
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_portrait_frame_stage(panel)
	_apply_panel_linework(panel, Color(0.12, 0.12, 0.14, 0.96), Color(0.42, 0.35, 0.22, 0.92))

	var margin := MarginContainer.new()
	_apply_margin(margin, 3, 3, 3, 3)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 0)
	margin.add_child(column)

	var portrait_stage := _build_compact_portrait_stage(hero, is_defender)
	column.add_child(portrait_stage)
	return panel


func _build_compact_portrait_stage(hero: Dictionary, is_defender: bool) -> Control:
	var stage := PanelContainer.new()
	stage.custom_minimum_size = Vector2(0, BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_hero_portrait_stage_height())
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_portrait_frame_stage(stage)
	_apply_panel_linework(stage, Color(0.08, 0.08, 0.09, 0.98), Color(0.50, 0.42, 0.24, 0.86))

	var stack := Control.new()
	stack.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stack.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stage.add_child(stack)

	var texture: Texture2D = BattleReportPortraitRegistryScript.portrait_texture(hero)
	if texture != null:
		var image := TextureRect.new()
		image.name = "ReportPortraitTexture"
		image.mouse_filter = Control.MOUSE_FILTER_IGNORE
		image.texture = texture
		BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_portrait_frame_texture(image)
		image.modulate = Color(0.66, 0.66, 0.66, 1.0) if is_defender else Color(1.0, 1.0, 1.0, 1.0)
		stack.add_child(image)
	else:
		var fallback := _build_label(str(hero.get("name", "武将位")), BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_hero_fallback_font_size(), Color(0.92, 0.92, 0.94, 0.98), true, true)
		fallback.set_anchors_preset(Control.PRESET_FULL_RECT)
		stack.add_child(fallback)

	var overlay := VBoxContainer.new()
	overlay.name = "PortraitOverlay"
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.add_theme_constant_override("separation", 0)
	stack.add_child(overlay)
	var star_label_text := _resolve_list_star_label(hero)
	if star_label_text != "":
		overlay.add_child(_build_label(star_label_text, BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_hero_star_font_size(), Color(1.0, 0.84, 0.32, 1.0), false, true))
	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	overlay.add_child(spacer)
	var name_label := _build_label(str(hero.get("name", "武将位")), BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_hero_name_font_size(), Color(0.96, 0.93, 0.84, 1.0), true, true)
	name_label.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.86))
	name_label.add_theme_constant_override("shadow_offset_x", 1)
	name_label.add_theme_constant_override("shadow_offset_y", 1)
	var stat_label := _build_label(str(hero.get("level_label", "Lv.--")), BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_hero_level_font_size(), Color(0.88, 0.80, 0.58, 0.94), false, true)
	stat_label.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.86))
	stat_label.add_theme_constant_override("shadow_offset_x", 1)
	stat_label.add_theme_constant_override("shadow_offset_y", 1)
	var info_plate := PanelContainer.new()
	info_plate.name = "BattleReportListHeroInfoPlate"
	info_plate.custom_minimum_size = Vector2(0, BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_hero_info_plate_min_height())
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_list_hero_info_plate_style(info_plate)
	var info_margin := MarginContainer.new()
	_apply_margin(info_margin, 2, 1, 2, 2)
	info_plate.add_child(info_margin)
	var info_column := VBoxContainer.new()
	info_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info_column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	info_column.add_theme_constant_override("separation", 0)
	info_margin.add_child(info_column)
	info_column.add_child(name_label)
	info_column.add_child(stat_label)
	overlay.add_child(info_plate)
	return stage


func _resolve_list_star_label(hero: Dictionary) -> String:
	var explicit_label := str(hero.get("star_label", "")).strip_edges()
	if explicit_label != "":
		return explicit_label
	for key in ["star_count", "starCount", "stars", "star", "starLevel", "rarityStars"]:
		if not hero.has(key):
			continue
		var raw_value: Variant = hero.get(key)
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
			return "★".repeat(clampi(numeric_value, 1, 5))
	return ""

func _build_result_cluster(result_block: Dictionary) -> Control:
	var panel := PanelContainer.new()
	panel.name = "SOM_L07_ResultCluster"
	panel.custom_minimum_size = BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_result_cluster_size()
	panel.set_meta("battle_report_result_cluster_visual_role", "primary_outcome_focus")
	_apply_panel_linework(panel, Color(0.12, 0.12, 0.13, 0.95), Color(0.54, 0.45, 0.22, 0.92))

	var margin := MarginContainer.new()
	_apply_margin(margin, 6, 7, 6, 7)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 7)
	margin.add_child(column)

	column.add_child(_build_label(str(result_block.get("result_note", "结果区")), BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_result_note_font_size(), Color(0.80, 0.80, 0.82, 0.96), true, true))
	column.add_child(_build_label(str(result_block.get("result_text", "未结")), BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_result_text_font_size(), Color(0.95, 0.78, 0.34, 0.98), false, true))
	var result_spacer := Control.new()
	result_spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(result_spacer)
	column.add_child(_build_label(str(result_block.get("time_label", "--")), BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_result_meta_font_size(), Color(0.80, 0.80, 0.82, 0.96), false, true))
	var detail_entry_label := _build_label(str(result_block.get("enter_detail_label", "进入详情")), BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_detail_entry_font_size(), Color(0.92, 0.82, 0.58, 0.96), false, true)
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_list_detail_entry_label_style(detail_entry_label)
	column.add_child(detail_entry_label)
	return panel

func _build_utility_cluster(utility_block: Dictionary, is_selected: bool = false) -> Control:
	var column := VBoxContainer.new()
	column.name = "SOM_L09_UtilityCluster"
	column.custom_minimum_size = BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_utility_cluster_size()
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 4)
	column.add_child(_build_structure_box(str(utility_block.get("index_label", "1")), BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_utility_index_size(), true, "SOM_L09_A_Index"))
	var expand_label := BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_selected_expand_label() if is_selected else str(utility_block.get("expand_label", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_default_expand_label()))
	column.add_child(_build_structure_box(expand_label, BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_utility_expand_size(), true, "SOM_L09_B_Expand"))
	return column

func _apply_static_styling() -> void:
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_list_summary_style(_list_summary_card, _list_summary_label)
	if _report_scroll != null:
		BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(_report_scroll)
	_report_card_list.add_theme_constant_override("separation", 8)
	_apply_panel_linework(_shared_state_card, Color(0.10, 0.10, 0.12, 0.92), Color(0.28, 0.28, 0.30, 0.92))
	_shared_state_title_label.add_theme_font_size_override("font_size", 12)
	_set_label_color(_shared_state_title_label, Color(0.78, 0.78, 0.80, 0.96))
	_shared_state_card.visible = false
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_filter_button_style(_filter_button)
	_ensure_list_utility_layout()

func get_mainline_visual_smoke_list_summary() -> Dictionary:
	return {
		"battleReportListSummaryVisible": _list_summary_card.visible,
		"battleReportListSharedStateVisible": _shared_state_card.visible,
		"battleReportListSharedStateChipCount": _shared_state_flow.get_child_count(),
		"battleReportListSharedStateTitle": _shared_state_title_label.text,
		"battleReportListEntryCount": _last_entry_count,
		"battleReportListAiActionResultCardVisible": false,
		"battleReportListAiActionResultCardVisibleCount": _count_named_descendants(_report_card_list, "BattleReportAiActionResultCard"),
		"battleReportListActionResultCardVisibleCount": _count_named_descendants(_report_card_list, "BattleReportAiActionResultCard"),
		"battleReportListPlayerActionResultCardVisibleCount": _count_action_result_cards_by_owner_scope("player"),
		"battleReportListOrganizationActionResultCardVisibleCount": _count_action_result_cards_by_owner_scope("organization"),
		"battleReportListMaritimeResultChipVisibleCount": _count_named_descendants(_report_card_list, "BattleReportMaritimeResultListChip"),
		"battleReportListHeroCardReadabilityToken": BATTLE_REPORT_UI_COMPONENT_FACTORY.BATTLE_REPORT_LIST_HERO_CARD_READABILITY_TOKEN,
		"battleReportListHeroInfoPlateVisibleCount": _count_named_descendants(_report_card_list, "BattleReportListHeroInfoPlate"),
		"battleReportListHeroInfoPlateMinHeight": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_list_hero_info_plate_min_height(),
		"battleReportListUtilityRailVisible": _list_utility_rail.visible,
		"battleReportListScrollTouchInputMode": str(_report_scroll.get_meta("touch_scroll_input_mode", "")) if _report_scroll != null else "",
		"battleReportListScrollBarVisibility": str(_report_scroll.get_meta("touch_scrollbar_visibility", "")) if _report_scroll != null else "",
	}

func _ensure_list_utility_layout() -> void:
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_list_utility_rail_style(_list_utility_rail)
	var top_spacer: Control = _list_utility_rail.get_node_or_null("UtilityTopSpacer") as Control
	if top_spacer == null:
		top_spacer = Control.new()
		top_spacer.name = "UtilityTopSpacer"
		top_spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
		_list_utility_rail.add_child(top_spacer)
	var middle_spacer: Control = _list_utility_rail.get_node_or_null("UtilityMiddleSpacer") as Control
	if middle_spacer == null:
		middle_spacer = Control.new()
		middle_spacer.name = "UtilityMiddleSpacer"
		middle_spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
		_list_utility_rail.add_child(middle_spacer)
	var bottom_spacer: Control = _list_utility_rail.get_node_or_null("UtilityBottomSpacer") as Control
	if bottom_spacer == null:
		bottom_spacer = Control.new()
		bottom_spacer.name = "UtilityBottomSpacer"
		bottom_spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
		_list_utility_rail.add_child(bottom_spacer)
	var scroll_hint_shell: PanelContainer = _list_utility_rail.get_node_or_null("ScrollHintShell") as PanelContainer
	if scroll_hint_shell == null:
		scroll_hint_shell = PanelContainer.new()
		scroll_hint_shell.name = "ScrollHintShell"
		var scroll_hint_margin := MarginContainer.new()
		_apply_margin(scroll_hint_margin, 4, 8, 4, 8)
		scroll_hint_shell.add_child(scroll_hint_margin)
		if _scroll_hint_label.get_parent() != null:
			_scroll_hint_label.get_parent().remove_child(_scroll_hint_label)
		scroll_hint_margin.add_child(_scroll_hint_label)
		_list_utility_rail.add_child(scroll_hint_shell)
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_scroll_hint_shell_style(scroll_hint_shell)
	BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_scroll_hint_label_style(_scroll_hint_label)
	_list_utility_rail.move_child(top_spacer, 0)
	_list_utility_rail.move_child(_filter_button, 1)
	_list_utility_rail.move_child(middle_spacer, 2)
	_list_utility_rail.move_child(scroll_hint_shell, 3)
	_list_utility_rail.move_child(bottom_spacer, 4)

func _build_label(
	text: String,
	font_size: int,
	color: Color,
	wrap: bool = false,
	align_center: bool = false
) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if wrap else TextServer.AUTOWRAP_OFF
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.add_theme_font_size_override("font_size", font_size)
	_set_label_color(label, color)
	if align_center:
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	return label

func _coerce_dictionary(raw_value: Variant) -> Dictionary:
	if raw_value is Dictionary:
		return raw_value as Dictionary
	return {}

func _clear_children(node: Node) -> void:
	for child in node.get_children():
		node.remove_child(child)
		child.queue_free()

func _count_named_descendants(node: Node, node_name: String) -> int:
	if node == null:
		return 0
	var count := 1 if node.name == node_name and node is Control and (node as Control).visible else 0
	for child in node.get_children():
		count += _count_named_descendants(child, node_name)
	return count

func _count_action_result_cards_by_owner_scope(owner_scope: String) -> int:
	return _count_action_result_cards_by_owner_scope_in_node(_report_card_list, owner_scope.strip_edges())

func _count_action_result_cards_by_owner_scope_in_node(node: Node, owner_scope: String) -> int:
	if node == null:
		return 0
	var count := 0
	if node.name == "BattleReportAiActionResultCard" and node is Control and (node as Control).visible:
		if str(node.get_meta("battle_report_action_result_owner_scope", "")).strip_edges() == owner_scope:
			count += 1
	for child in node.get_children():
		count += _count_action_result_cards_by_owner_scope_in_node(child, owner_scope)
	return count

func _apply_margin(container: MarginContainer, left: int, top: int, right: int, bottom: int) -> void:
	container.add_theme_constant_override("margin_left", left)
	container.add_theme_constant_override("margin_top", top)
	container.add_theme_constant_override("margin_right", right)
	container.add_theme_constant_override("margin_bottom", bottom)

func _set_label_color(label: Label, color: Color) -> void:
	label.add_theme_color_override("font_color", color)

func _apply_button_linework(button: Button, bg_color: Color, border_color: Color, font_color: Color) -> void:
	var normal_style := StyleBoxFlat.new()
	normal_style.bg_color = bg_color
	normal_style.border_color = border_color
	normal_style.set_border_width_all(1)
	button.add_theme_stylebox_override("normal", normal_style)

	var hover_style: StyleBoxFlat = normal_style.duplicate()
	hover_style.bg_color = bg_color.lightened(0.06)
	button.add_theme_stylebox_override("hover", hover_style)

	var pressed_style: StyleBoxFlat = normal_style.duplicate()
	pressed_style.bg_color = bg_color.darkened(0.06)
	button.add_theme_stylebox_override("pressed", pressed_style)
	button.add_theme_stylebox_override("focus", pressed_style)
	button.add_theme_stylebox_override("disabled", normal_style)

	button.add_theme_color_override("font_color", font_color)
	button.add_theme_color_override("font_hover_color", font_color)
	button.add_theme_color_override("font_pressed_color", font_color)

func _apply_panel_linework(panel: PanelContainer, bg_color: Color, border_color: Color) -> void:
	var style_box := StyleBoxFlat.new()
	style_box.bg_color = bg_color
	style_box.border_color = border_color
	style_box.set_border_width_all(1)
	panel.add_theme_stylebox_override("panel", style_box)

func _apply_progress_bar_style(bar: ProgressBar, fill_color: Color, background_color: Color) -> void:
	var background_style := StyleBoxFlat.new()
	background_style.bg_color = background_color
	bar.add_theme_stylebox_override("background", background_style)

	var fill_style := StyleBoxFlat.new()
	fill_style.bg_color = fill_color
	bar.add_theme_stylebox_override("fill", fill_style)

func _on_report_button_pressed(report_id: String) -> void:
	report_selected.emit(report_id)
