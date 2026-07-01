extends RefCounted
class_name GeneralProfileTacticsRenderer

const BG_DATA := Color(0.025, 0.024, 0.021, 0.56)
const BG_ROW := Color(0.090, 0.083, 0.072, 0.58)
const BG_ROW_ACTIVE := Color(0.16, 0.115, 0.065, 0.72)
const BG_PANEL := Color(0.055, 0.052, 0.047, 0.62)
const BORDER := Color(0.42, 0.34, 0.18, 0.52)
const BORDER_ACTIVE := Color(0.92, 0.67, 0.24, 0.92)
const BORDER_DATA := Color(0.36, 0.29, 0.15, 0.28)
const TEXT_MAIN := Color(0.94, 0.91, 0.84, 1.0)
const TEXT_MUTED := Color(0.70, 0.67, 0.58, 1.0)
const TEXT_GOLD := Color(0.95, 0.72, 0.32, 1.0)
const TEXT_RED := Color(0.83, 0.30, 0.22, 1.0)
const TEXT_GREEN := Color(0.42, 0.72, 0.42, 1.0)
const TEXT_BLUE := Color(0.42, 0.58, 0.78, 1.0)
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")


static func build_point_panel(entry: Dictionary) -> Control:
	var panel := _panel(BG_DATA, BORDER_DATA, 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(12, 12, 12, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)
	column.add_child(_label("配点", 17, TEXT_GOLD))
	var allocation: Dictionary = entry.get("allocation", {}) as Dictionary
	var summary := HBoxContainer.new()
	summary.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	summary.add_theme_constant_override("separation", 8)
	column.add_child(summary)
	summary.add_child(_point_summary_card("稀有度", _entry_star_text(entry), "红星 %s" % str(entry.get("red_stars", 0)), TEXT_GOLD))
	summary.add_child(_point_summary_card("剩余点数", str(allocation.get("free_points", 0)), "可用点数", TEXT_GREEN if int(allocation.get("free_points", 0)) > 0 else TEXT_MUTED))
	summary.add_child(_point_summary_card("当前方案", str(allocation.get("active_scheme", "方案一")), "当前生效", TEXT_BLUE))
	column.add_child(_point_scheme_tabs(str(allocation.get("active_scheme", "方案一"))))
	for spec in _point_allocate_specs():
		column.add_child(_point_allocate_row(entry, spec))
	var action_row := HBoxContainer.new()
	action_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	action_row.add_theme_constant_override("separation", 10)
	column.add_child(action_row)
	action_row.add_child(_preview_action_chip("洗点"))
	action_row.add_child(_preview_action_chip("确定"))
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	action_row.add_child(spacer)
	return panel


static func _point_scheme_tabs(active_scheme: String = "方案一") -> Control:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 6)
	for label_variant in ["方案一", "方案二", "方案三"]:
		var label := str(label_variant)
		var active := label == active_scheme
		if active_scheme == "" and label == "方案一":
			active = true
		var chip := _panel(BG_ROW_ACTIVE if active else BG_ROW, BORDER_ACTIVE if active else BORDER_DATA, 2)
		UI_COMPONENT_FACTORY.apply_general_tactics_scheme_tab_style(chip)
		chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var margin := UI_COMPONENT_FACTORY.make_general_tactics_scheme_tab_margin()
		chip.add_child(margin)
		margin.add_child(_nowrap_label(
			("✓ " if active else "") + label,
			UI_COMPONENT_FACTORY.general_tactics_scheme_tab_label_font_size(),
			TEXT_GOLD if active else TEXT_MUTED,
			HORIZONTAL_ALIGNMENT_CENTER
		))
		row.add_child(chip)
	return row


static func _point_allocate_row(entry: Dictionary, spec: Dictionary) -> Control:
	var color: Color = spec.get("color", TEXT_GOLD) as Color
	var stat_key := str(spec.get("stat_key", ""))
	var growth_key := str(spec.get("growth_key", ""))
	var current_value := float(entry.get(stat_key, 0))
	var growth_value := str(entry.get(growth_key, "0.00"))
	var panel := _panel(Color(0.0, 0.0, 0.0, 0.28), BORDER_DATA, 3)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(10, 7, 10, 7)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)
	margin.add_child(row)
	row.add_child(_small_tag(str(spec.get("label", "")), color))
	var value := _nowrap_label("%s +0" % str(spec.get("label", "")), 16, TEXT_MAIN)
	value.custom_minimum_size = Vector2(132, 0)
	row.add_child(value)
	var before_after := _nowrap_label("%.2f  »  %.2f" % [current_value, current_value], 18, TEXT_MUTED)
	before_after.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(before_after)
	row.add_child(_point_step_button("−"))
	row.add_child(_point_step_button("+"))
	row.add_child(_point_step_button("最大"))
	var growth := _nowrap_label("+%s / Lv" % growth_value, 12, TEXT_MUTED, HORIZONTAL_ALIGNMENT_RIGHT)
	growth.custom_minimum_size = Vector2(86, 0)
	row.add_child(growth)
	return panel


static func _point_step_button(text: String) -> Control:
	var button := _panel(BG_ROW, BORDER_DATA, 2)
	UI_COMPONENT_FACTORY.apply_general_tactics_step_button_style(button, text == "最大")
	var margin := UI_COMPONENT_FACTORY.make_general_tactics_step_button_margin()
	button.add_child(margin)
	margin.add_child(_nowrap_label(
		text,
		UI_COMPONENT_FACTORY.general_tactics_step_button_font_size(),
		TEXT_MUTED,
		HORIZONTAL_ALIGNMENT_CENTER
	))
	return button


static func _point_summary_card(title: String, value: String, meta: String, color: Color) -> Control:
	var panel := _panel(Color(color.r * 0.10, color.g * 0.10, color.b * 0.10, 0.70), Color(color.r, color.g, color.b, 0.62), 4)
	UI_COMPONENT_FACTORY.apply_general_tactics_summary_card_style(panel)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := UI_COMPONENT_FACTORY.make_general_tactics_summary_card_margin()
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", UI_COMPONENT_FACTORY.general_tactics_summary_card_column_spacing())
	margin.add_child(column)
	column.add_child(_label(title, UI_COMPONENT_FACTORY.general_tactics_summary_card_title_font_size(), TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	column.add_child(_nowrap_label(value, UI_COMPONENT_FACTORY.general_tactics_summary_card_value_font_size(), color, HORIZONTAL_ALIGNMENT_CENTER))
	column.add_child(_nowrap_label(meta, UI_COMPONENT_FACTORY.general_tactics_summary_card_meta_font_size(), TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	return panel


static func _point_allocate_specs() -> Array[Dictionary]:
	return [
		{"label": "攻击", "stat_key": "force", "growth_key": "force_growth", "color": TEXT_RED},
		{"label": "防御", "stat_key": "command", "growth_key": "command_growth", "color": TEXT_GOLD},
		{"label": "谋略", "stat_key": "intelligence", "growth_key": "intelligence_growth", "color": TEXT_BLUE},
		{"label": "速度", "stat_key": "speed", "growth_key": "speed_growth", "color": TEXT_GREEN},
	]


static func _entry_star_text(entry: Dictionary) -> String:
	var rarity := str(entry.get("rarity", "SR")).strip_edges().to_upper()
	var star_count := int(entry.get("star", entry.get("stars", 5)))
	return "%s %s星" % [rarity, str(star_count)]


static func _small_tag(text: String, color: Color = TEXT_GOLD) -> Control:
	var panel := _panel(Color(color.r * 0.08, color.g * 0.08, color.b * 0.08, 0.58), Color(color.r, color.g, color.b, 0.50), 4)
	UI_COMPONENT_FACTORY.apply_general_tactics_stat_tag_style(panel)
	var margin := UI_COMPONENT_FACTORY.make_general_tactics_stat_tag_margin()
	panel.add_child(margin)
	margin.add_child(_nowrap_label(
		text,
		UI_COMPONENT_FACTORY.general_tactics_stat_tag_font_size(),
		color,
		HORIZONTAL_ALIGNMENT_CENTER
	))
	return panel


static func _preview_action_chip(text: String) -> Control:
	var panel := _panel(BG_PANEL, BORDER, 3)
	UI_COMPONENT_FACTORY.apply_general_tactics_preview_action_chip_style(panel)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := UI_COMPONENT_FACTORY.make_general_tactics_preview_action_chip_margin()
	panel.add_child(margin)
	margin.add_child(_label(
		text,
		UI_COMPONENT_FACTORY.general_tactics_preview_action_chip_font_size(),
		TEXT_MUTED,
		HORIZONTAL_ALIGNMENT_CENTER
	))
	return panel


static func _panel(bg: Color, border: Color, radius: int = 4) -> PanelContainer:
	return UI_COMPONENT_FACTORY.make_panel(bg, border, radius)


static func _margin(left: int, top: int, right: int, bottom: int) -> MarginContainer:
	return UI_COMPONENT_FACTORY.make_margin(left, top, right, bottom)


static func _label(text: String, size: int, color: Color, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	return UI_COMPONENT_FACTORY.make_label(text, size, color, align)


static func _nowrap_label(text: String, size: int, color: Color, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	return UI_COMPONENT_FACTORY.make_label(text, size, color, align, false)
