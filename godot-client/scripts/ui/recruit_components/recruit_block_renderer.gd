extends RefCounted
class_name RecruitBlockRenderer

const BG_PANEL := Color(0.075, 0.066, 0.052, 0.92)
const BG_CARD := Color(0.038, 0.036, 0.031, 0.86)
const BG_CARD_ACTIVE := Color(0.16, 0.115, 0.060, 0.92)
const BORDER := Color(0.44, 0.34, 0.17, 0.56)
const BORDER_ACTIVE := Color(0.92, 0.68, 0.25, 0.92)
const TEXT_MAIN := Color(0.94, 0.91, 0.84, 1.0)
const TEXT_MUTED := Color(0.69, 0.66, 0.57, 1.0)
const TEXT_GOLD := Color(0.96, 0.73, 0.32, 1.0)
const TEXT_GREEN := Color(0.45, 0.72, 0.44, 1.0)
const TEXT_BLUE := Color(0.48, 0.61, 0.82, 1.0)
const TEXT_RED := Color(0.84, 0.34, 0.25, 1.0)
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")

static func build_content_block(block: Dictionary, shared_state: Dictionary, action_callback: Callable) -> Control:
	match str(block.get("kind", "")):
		"card_grid":
			return _build_card_grid_block(block, shared_state)
		"text_block":
			return _build_text_block(block)
		"button_row":
			return _build_button_row_block(block, action_callback)
		_:
			return _empty_panel(str(block.get("title", "未支持区块")), "该区块类型暂未接入正式招募页。")

static func _build_card_grid_block(block: Dictionary, shared_state: Dictionary) -> Control:
	var panel := _panel(BG_PANEL, BORDER, 5)
	panel.name = str(block.get("node_name", "RecruitCardGridBlock"))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(12, 12, 12, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)
	column.add_child(_label(str(block.get("title", "卡片")), 18, TEXT_GOLD))
	var grid := GridContainer.new()
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.columns = clampi(int(block.get("columns", 2)), 1, 4)
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	column.add_child(grid)
	for card in _dictionary_array(block.get("cards", [])):
		grid.add_child(_build_data_card(card, shared_state))
	return panel

static func _build_text_block(block: Dictionary) -> Control:
	var panel := _panel(BG_PANEL, BORDER, 5)
	panel.name = str(block.get("node_name", "RecruitTextBlock"))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(12, 12, 12, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 7)
	margin.add_child(column)
	column.add_child(_label(str(block.get("title", "说明")), 18, TEXT_GOLD))
	for line in _string_array(block.get("lines", [])):
		column.add_child(_label(line, 13, TEXT_MUTED))
	return panel

static func _build_button_row_block(block: Dictionary, action_callback: Callable) -> Control:
	var panel := _panel(BG_PANEL, BORDER, 5)
	panel.name = str(block.get("node_name", "RecruitButtonRowBlock"))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(12, 12, 12, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)
	column.add_child(_label(str(block.get("title", "动作")), 18, TEXT_GOLD))
	var row := HFlowContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("h_separation", 8)
	row.add_theme_constant_override("v_separation", 8)
	column.add_child(row)
	for action in _dictionary_array(block.get("actions", [])):
		var button := Button.new()
		var action_id := str(action.get("id", "")).strip_edges()
		button.name = "RecruitAction_%s" % action_id
		button.text = str(action.get("label", action_id))
		button.disabled = bool(action.get("disabled", false))
		button.custom_minimum_size = Vector2(132, 42)
		_apply_button_style(button, BG_CARD_ACTIVE if not button.disabled else BG_CARD, BORDER_ACTIVE if not button.disabled else BORDER, TEXT_GOLD if not button.disabled else TEXT_MUTED)
		button.pressed.connect(action_callback.bind(action_id))
		row.add_child(button)
	return panel

static func _build_data_card(card: Dictionary, shared_state: Dictionary) -> Control:
	var value := _resolve_card_value(card, "value", "value_key", shared_state)
	var meta := _resolve_card_value(card, "meta", "meta_key", shared_state)
	var description := _resolve_card_value(card, "description", "description_key", shared_state)
	var tone_color := _tone_color(str(card.get("tone", "")))
	var panel := _panel(BG_CARD, Color(tone_color.r, tone_color.g, tone_color.b, 0.50), 4)
	panel.custom_minimum_size = Vector2(190, 108)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(10, 9, 10, 9)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 4)
	margin.add_child(column)
	column.add_child(_label(str(card.get("title", "")), 13, TEXT_MUTED))
	column.add_child(_label(value, 18, tone_color))
	if meta != "":
		column.add_child(_label(meta, 12, TEXT_MAIN))
	if description != "":
		column.add_child(_label(description, 12, TEXT_MUTED))
	return panel

static func _resolve_card_value(card: Dictionary, literal_key: String, state_key: String, shared_state: Dictionary) -> String:
	var literal := str(card.get(literal_key, "")).strip_edges()
	if literal != "":
		return literal
	var lookup := str(card.get(state_key, "")).strip_edges()
	if lookup == "":
		return ""
	return _resolve_shared_value(lookup, shared_state)

static func _resolve_shared_value(path: String, shared_state: Dictionary) -> String:
	var current: Variant = shared_state
	for part in path.split(".", false):
		if not (current is Dictionary):
			return ""
		current = (current as Dictionary).get(part, "")
	return str(current)

static func _dictionary_array(raw_value: Variant) -> Array:
	var result: Array = []
	if not (raw_value is Array):
		return result
	for item in raw_value as Array:
		if item is Dictionary:
			result.append((item as Dictionary).duplicate(true))
	return result

static func _string_array(raw_value: Variant) -> Array[String]:
	var result: Array[String] = []
	if not (raw_value is Array):
		return result
	for item in raw_value as Array:
		var text := str(item).strip_edges()
		if text != "":
			result.append(text)
	return result

static func _tone_color(tone: String) -> Color:
	match tone:
		"green":
			return TEXT_GREEN
		"blue":
			return TEXT_BLUE
		"red":
			return TEXT_RED
		"gold":
			return TEXT_GOLD
		_:
			return TEXT_MAIN

static func _empty_panel(title: String, description: String) -> Control:
	var panel := _panel(BG_CARD, BORDER, 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(12, 12, 12, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 6)
	margin.add_child(column)
	column.add_child(_label(title, 16, TEXT_GOLD))
	column.add_child(_label(description, 13, TEXT_MUTED))
	return panel

static func _panel(bg: Color, border: Color, radius: int = 4) -> PanelContainer:
	return UI_COMPONENT_FACTORY.make_panel(bg, border, radius)

static func _margin(left: int, top: int, right: int, bottom: int) -> MarginContainer:
	return UI_COMPONENT_FACTORY.make_margin(left, top, right, bottom)

static func _label(text: String, size: int, color: Color, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	return UI_COMPONENT_FACTORY.make_label(text, size, color, align)

static func _apply_button_style(button: Button, bg: Color, border: Color, font_color: Color) -> void:
	UI_COMPONENT_FACTORY.apply_button_style(button, bg, border, font_color, TEXT_MUTED)
