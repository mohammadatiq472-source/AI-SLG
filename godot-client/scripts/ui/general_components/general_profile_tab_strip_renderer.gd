extends RefCounted
class_name GeneralProfileTabStripRenderer

const BG_ROW := Color(0.090, 0.083, 0.072, 0.58)
const BORDER := Color(0.42, 0.34, 0.18, 0.52)
const TEXT_MUTED := Color(0.70, 0.67, 0.58, 1.0)
const TAB_SPECS := [
	["profile", "详情"],
	["tactics", "配点"],
	["growth", "兵种"],
]
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")


static func build_profile_tab_strip(active_page_id: String, page_callback: Callable, close_callback: Callable) -> Control:
	var panel := _panel(BG_ROW, BORDER, 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(8, 8, 8, 8)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 6)
	margin.add_child(row)
	for spec in TAB_SPECS:
		var page_id := str(spec[0])
		row.add_child(_build_profile_tab_button(page_id, str(spec[1]), active_page_id == page_id, page_callback))
	var protect_label := _nowrap_label("未保护", 17, TEXT_MUTED, HORIZONTAL_ALIGNMENT_RIGHT)
	protect_label.custom_minimum_size = Vector2(98, 0)
	row.add_child(protect_label)
	var close_button := Button.new()
	close_button.name = "CloseButton"
	close_button.text = "关闭"
	UI_COMPONENT_FACTORY.apply_general_profile_close_button_style(close_button, "danger")
	close_button.set_meta("general_profile_close_button_token", UI_COMPONENT_FACTORY.GENERAL_PROFILE_CLOSE_BUTTON_TOKEN)
	close_button.set_meta("general_profile_close_action_id", "general_profile_close_panel")
	close_button.set_meta("general_profile_close_live_text_contract", "general_profile_close_live_text_v1")
	close_button.set_meta("general_profile_close_live_text_label", "关闭")
	if close_callback.is_valid():
		close_button.pressed.connect(close_callback)
	row.add_child(close_button)
	return panel


static func _build_profile_tab_button(page_id: String, text: String, active: bool, page_callback: Callable) -> Button:
	var button := Button.new()
	button.name = "GeneralProfileTabButton_%s" % page_id
	button.text = text
	button.disabled = active
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.set_meta("general_profile_tab_page_id", page_id)
	button.set_meta("general_profile_tab_button_token", UI_COMPONENT_FACTORY.GENERAL_PROFILE_TAB_BUTTON_TOKEN)
	button.set_meta("general_profile_tab_live_text_contract", "general_profile_tab_live_text_v1")
	button.set_meta("general_profile_tab_live_text_label", text)
	UI_COMPONENT_FACTORY.apply_general_profile_tab_button_style(button, active)
	if page_callback.is_valid():
		button.pressed.connect(page_callback.bind(page_id))
	return button


static func _panel(bg: Color, border: Color, radius: int = 4) -> PanelContainer:
	return UI_COMPONENT_FACTORY.make_panel(bg, border, radius)


static func _margin(left: int, top: int, right: int, bottom: int) -> MarginContainer:
	return UI_COMPONENT_FACTORY.make_margin(left, top, right, bottom)


static func _nowrap_label(text: String, size: int, color: Color, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	return UI_COMPONENT_FACTORY.make_label(text, size, color, align, false)
