extends RefCounted
class_name GeneralRosterListRenderer

const BG_PANEL := Color(0.055, 0.052, 0.047, 0.62)
const BG_ROW := Color(0.090, 0.083, 0.072, 0.58)
const BG_ROW_ACTIVE := Color(0.16, 0.115, 0.065, 0.72)
const BORDER := Color(0.42, 0.34, 0.18, 0.52)
const BORDER_ACTIVE := Color(0.92, 0.67, 0.24, 0.92)
const TEXT_MAIN := Color(0.94, 0.91, 0.84, 1.0)
const TEXT_MUTED := Color(0.70, 0.67, 0.58, 1.0)
const TEXT_GOLD := Color(0.95, 0.72, 0.32, 1.0)
const TEXT_RED := Color(0.83, 0.30, 0.22, 1.0)
const TEXT_GREEN := Color(0.42, 0.72, 0.42, 1.0)
const TEXT_BLUE := Color(0.42, 0.58, 0.78, 1.0)
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")
const HeroCardViewScript := preload("res://scripts/ui/formal_pack/components/hero_card_view.gd")

static func build_filter_bar(shared_state: Dictionary) -> Control:
	var raw_filters: Variant = shared_state.get("roster_filter_summary", {})
	var filters: Dictionary = raw_filters as Dictionary if raw_filters is Dictionary else {}
	var panel := _panel(BG_PANEL, BORDER, 5)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(10, 8, 10, 8)
	panel.add_child(margin)
	var row := HFlowContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("h_separation", 8)
	row.add_theme_constant_override("v_separation", 6)
	margin.add_child(row)
	row.add_child(_chip("全部 %s" % str(filters.get("total", 0)), TEXT_GOLD))
	row.add_child(_chip("已编 %s" % str(filters.get("deployed", 0)), TEXT_GREEN))
	row.add_child(_chip("预备 %s" % str(filters.get("reserve", 0)), TEXT_BLUE))
	row.add_child(_chip("骑 %s" % str(filters.get("cavalry", 0)), Color(0.72, 0.48, 0.26, 1.0)))
	row.add_child(_chip("步 %s" % str(filters.get("infantry", 0)), Color(0.62, 0.64, 0.45, 1.0)))
	row.add_child(_chip("弓 %s" % str(filters.get("ranged", 0)), Color(0.46, 0.62, 0.66, 1.0)))
	row.add_child(_chip("最高战力 %s" % str(filters.get("max_power", 0)), TEXT_RED))
	return panel

static func build_roster_selector(active_entry: Dictionary, entries: Array, action_callback: Callable) -> Control:
	var panel := _panel(BG_PANEL, BORDER, 5)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(10, 8, 10, 8)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 8)
	margin.add_child(row)
	row.add_child(_action_button("上一位", "hero_prev", action_callback))
	var current_line := "%s  %s  Lv.%s" % [
		str(active_entry.get("display_name", "待补位")),
		str(active_entry.get("star_text", "")),
		str(active_entry.get("level", 1)),
	]
	var current_label := _label("当前 %s / 共 %s 名 / 点击卡进入详情" % [current_line, str(entries.size())], 13, TEXT_GOLD, HORIZONTAL_ALIGNMENT_CENTER)
	current_label.custom_minimum_size = Vector2(420, 0)
	row.add_child(current_label)
	row.add_child(_action_button("下一位", "hero_next", action_callback))
	return panel

static func build_roster_list_panel(entries: Array, portrait_builder: Callable, action_callback: Callable) -> Control:
	var panel := _panel(BG_PANEL, BORDER, 5)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 640)
	var margin := _margin(12, 12, 12, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 12)
	margin.add_child(column)
	if entries.is_empty():
		column.add_child(_empty_panel("暂无武将", "等待招募结果写入 roster。"))
		return panel
	var flow := HFlowContainer.new()
	UI_COMPONENT_FACTORY.apply_general_roster_responsive_flow_layout(flow)
	column.add_child(flow)
	for entry_variant in entries:
		if entry_variant is Dictionary:
			flow.add_child(_build_roster_card(entry_variant as Dictionary, action_callback))
	return panel

static func _build_roster_card(entry: Dictionary, action_callback: Callable) -> Button:
	var hero_id := str(entry.get("id", "")).strip_edges()
	var card_entry := _to_owned_roster_card_entry(entry)
	var card_config := HeroCardViewScript.full_card_config(HeroCardViewScript.MODE_OWNED_ROSTER)
	card_config["show_identity_strip"] = true
	var card_width := float(card_config.get("width", HeroCardViewScript.FULL_CARD_WIDTH))
	var card_height := float(card_config.get("height", HeroCardViewScript.FULL_CARD_HEIGHT))
	var card := HeroCardViewScript.build_card(card_entry, HeroCardViewScript.MODE_OWNED_ROSTER, card_config)
	card.name = "OpenHeroProfileButton_%s" % hero_id
	card.tooltip_text = "打开%s详情" % str(entry.get("display_name", "武将"))
	card.custom_minimum_size = Vector2(card_width, card_height)
	card.mouse_filter = Control.MOUSE_FILTER_PASS
	card.set_meta("general_roster_drag_passthrough", true)
	var action_id := "open_hero_profile:%s" % hero_id
	card.set_meta("general_roster_detail_button_token", UI_COMPONENT_FACTORY.GENERAL_ROSTER_DETAIL_BUTTON_TOKEN)
	card.set_meta("general_roster_detail_action_id", action_id)
	card.set_meta("general_roster_detail_live_text_contract", "general_roster_detail_live_text_v1")
	card.set_meta("general_roster_detail_live_text_label", "详情")
	if bool(entry.get("is_active", false)):
		card.modulate = Color(1.04, 1.02, 0.94, 1.0)
	if action_callback.is_valid():
		card.pressed.connect(action_callback.bind(action_id))
	return card

static func _to_owned_roster_card_entry(entry: Dictionary) -> Dictionary:
	var hero_id := str(entry.get("id", "")).strip_edges()
	var faction := str(entry.get("faction", "")).strip_edges()
	var troop_label := _production_troop_label(entry)
	var status_label := _production_status_label(entry)
	return {
		"id": hero_id,
		"heroInstanceId": hero_id,
		"name": str(entry.get("display_name", entry.get("name", "待补位"))),
		"displayName": str(entry.get("display_name", entry.get("name", "待补位"))),
		"faction": faction,
		"campName": faction,
		"quality": str(entry.get("rarity_label", entry.get("quality", "N"))),
		"rarity": str(entry.get("rarity_label", entry.get("quality", "N"))),
		"stars": str(entry.get("star_text", "")),
		"level": int(entry.get("level", 1)),
		"troopType": troop_label,
		"soldierCount": int(entry.get("power", 0)),
		"team": "",
		"owner": _production_owner_label(entry),
		"status": status_label,
		"tone": str(entry.get("tone", "")),
		"heroId": hero_id,
		"asset_ref": _structured_asset_ref(entry),
		"portraitAssetKey": str(entry.get("portraitAssetKey", entry.get("asset_key", ""))),
	}

static func _roster_card_gap() -> int:
	return int(HeroCardViewScript.FULL_CARD_GAP)

static func _structured_asset_ref(entry: Dictionary) -> Dictionary:
	return UI_COMPONENT_FACTORY.hero_portrait_payload_from_entry(entry)

static func _production_troop_label(entry: Dictionary) -> String:
	var candidates := [
		str(entry.get("troop_type_label", "")).strip_edges(),
		str(entry.get("card_type", "")).strip_edges(),
		str(entry.get("troop_type", "")).strip_edges(),
	]
	var allowed := {
		"骑": true,
		"骑兵": true,
		"步": true,
		"步兵": true,
		"弓": true,
		"弓兵": true,
		"枪": true,
		"枪兵": true,
	}
	for candidate in candidates:
		if allowed.has(candidate):
			return candidate
	return ""

static func _production_status_label(entry: Dictionary) -> String:
	if bool(entry.get("deployed", false)):
		return "已编"
	if bool(entry.get("reserve", false)):
		return "预备"
	return "待命"

static func _production_owner_label(entry: Dictionary) -> String:
	var owner_fields := [
		"owner_display_name",
		"ownerDisplayName",
		"owner_label",
		"ownerLabel",
		"owner",
		"controller_display_name",
		"controllerDisplayName",
		"controller",
		"player_display_name",
		"playerDisplayName",
		"player_name",
		"playerName",
		"ai_player_name",
		"aiPlayerName",
	]
	for field_variant in owner_fields:
		var field := str(field_variant)
		if not entry.has(field):
			continue
		var value := str(entry.get(field, "")).strip_edges()
		if value != "":
			return value
	var owner_type := str(entry.get("owner_type", entry.get("controller_type", ""))).strip_edges().to_lower()
	if owner_type.find("ai") >= 0:
		return "AI玩家"
	return "主公"

static func _build_roster_selector_button(entry: Dictionary, action_callback: Callable) -> Button:
	var button := Button.new()
	var name_text := str(entry.get("display_name", "待补位"))
	var is_active := bool(entry.get("is_active", false))
	button.text = "%s  Lv.%s" % [name_text, str(entry.get("level", 1))]
	button.custom_minimum_size = Vector2(116, 34)
	button.disabled = is_active
	_apply_button_style(button, BG_ROW_ACTIVE if is_active else BG_ROW, BORDER_ACTIVE if is_active else BORDER, TEXT_GOLD if is_active else TEXT_MAIN)
	button.pressed.connect(action_callback.bind(str(entry.get("action_id", ""))))
	return button

static func _build_roster_row(entry: Dictionary, portrait_builder: Callable, action_callback: Callable) -> Control:
	var active := bool(entry.get("is_active", false))
	var panel := _panel(BG_ROW_ACTIVE if active else BG_ROW, BORDER_ACTIVE if active else BORDER, 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 104)
	var margin := _margin(8, 8, 8, 8)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)
	margin.add_child(row)
	var portrait: Variant = portrait_builder.call(entry, Vector2(72, 88))
	if portrait is Control:
		row.add_child(portrait as Control)

	var identity := VBoxContainer.new()
	identity.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	identity.add_theme_constant_override("separation", 4)
	row.add_child(identity)
	var name_row := HBoxContainer.new()
	name_row.add_theme_constant_override("separation", 6)
	identity.add_child(name_row)
	name_row.add_child(_label(str(entry.get("display_name", "待补位")), 18, TEXT_MAIN))
	name_row.add_child(_label(str(entry.get("rarity_label", "N")), 13, TEXT_GOLD))
	name_row.add_child(_label("Lv.%s" % str(entry.get("level", 1)), 13, TEXT_MUTED))
	identity.add_child(_label(str(entry.get("title", "")), 12, TEXT_MUTED))
	var tag_row := HFlowContainer.new()
	tag_row.add_theme_constant_override("h_separation", 5)
	tag_row.add_theme_constant_override("v_separation", 4)
	identity.add_child(tag_row)
	for tag in _string_array(entry.get("traits", [])).slice(0, 3):
		tag_row.add_child(_mini_chip(str(tag)))

	row.add_child(_build_roster_stat_strip(entry))

	var status_col := VBoxContainer.new()
	status_col.custom_minimum_size = Vector2(150, 0)
	status_col.add_theme_constant_override("separation", 4)
	row.add_child(status_col)
	status_col.add_child(_label("战力 %s" % str(entry.get("power", 0)), 17, TEXT_GOLD))
	status_col.add_child(_label(str(entry.get("status_label", "待命")), 12, TEXT_GREEN if bool(entry.get("deployed", false)) else TEXT_BLUE))
	status_col.add_child(_label(str(entry.get("troop_type_label", "待定")), 12, TEXT_MUTED))

	var button := Button.new()
	button.name = "OpenHeroProfileButton_%s" % str(entry.get("id", ""))
	button.text = "详情"
	var action_id := "open_hero_profile:%s" % str(entry.get("id", ""))
	UI_COMPONENT_FACTORY.apply_general_roster_detail_button_style(button)
	button.set_meta("general_roster_detail_action_id", action_id)
	button.set_meta("general_roster_detail_live_text_contract", "general_roster_detail_live_text_v1")
	button.set_meta("general_roster_detail_live_text_label", button.text)
	button.pressed.connect(action_callback.bind(action_id))
	row.add_child(button)
	return panel

static func _build_roster_stat_strip(entry: Dictionary) -> Control:
	var grid := GridContainer.new()
	grid.columns = 4
	grid.custom_minimum_size = Vector2(216, 0)
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 3)
	var stats := [
		["武", "force", TEXT_RED],
		["统", "command", TEXT_GOLD],
		["智", "intelligence", TEXT_BLUE],
		["速", "speed", TEXT_GREEN],
	]
	for spec in stats:
		var column := VBoxContainer.new()
		column.add_theme_constant_override("separation", 1)
		column.add_child(_label(str(spec[0]), 11, TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER))
		column.add_child(_label(str(entry.get(str(spec[1]), 0)), 15, spec[2], HORIZONTAL_ALIGNMENT_CENTER))
		grid.add_child(column)
	return grid

static func _action_button(text: String, action_id: String, action_callback: Callable, disabled: bool = false) -> Button:
	var button := Button.new()
	button.text = text
	button.disabled = disabled
	button.custom_minimum_size = Vector2(82, 34)
	_apply_button_style(button, BG_PANEL, BORDER, TEXT_MAIN)
	button.pressed.connect(action_callback.bind(action_id))
	return button

static func _chip(text: String, color: Color) -> Control:
	var panel := _panel(Color(color.r, color.g, color.b, 0.11), Color(color.r, color.g, color.b, 0.44), 999)
	var margin := _margin(8, 4, 8, 4)
	panel.add_child(margin)
	var label := _label(text, 11, color, HORIZONTAL_ALIGNMENT_CENTER)
	label.custom_minimum_size = Vector2(42, 0)
	margin.add_child(label)
	return panel

static func _mini_chip(text: String) -> Control:
	return _chip(text, TEXT_MUTED)

static func _empty_panel(title: String, body: String) -> Control:
	var panel := _panel(BG_ROW, BORDER, 4)
	var margin := _margin(12, 12, 12, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 6)
	margin.add_child(column)
	column.add_child(_label(title, 16, TEXT_GOLD))
	column.add_child(_label(body, 12, TEXT_MUTED))
	return panel

static func _string_array(raw_value: Variant) -> Array:
	var result: Array = []
	if not (raw_value is Array):
		return result
	for item in raw_value as Array:
		var text := str(item).strip_edges()
		if text != "":
			result.append(text)
	return result

static func _panel(bg: Color, border: Color, radius: int = 4) -> PanelContainer:
	return UI_COMPONENT_FACTORY.make_panel(bg, border, radius)

static func _margin(left: int, top: int, right: int, bottom: int) -> MarginContainer:
	return UI_COMPONENT_FACTORY.make_margin(left, top, right, bottom)

static func _label(text: String, size: int, color: Color, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	return UI_COMPONENT_FACTORY.make_label(text, size, color, align)

static func _apply_button_style(button: Button, bg: Color, border: Color, font_color: Color) -> void:
	UI_COMPONENT_FACTORY.apply_button_style(button, bg, border, font_color, font_color, 4, 0.06, 0.06)
