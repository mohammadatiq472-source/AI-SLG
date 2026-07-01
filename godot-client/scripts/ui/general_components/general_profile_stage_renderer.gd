extends RefCounted
class_name GeneralProfileStageRenderer

const BG_PANEL := Color(0.055, 0.052, 0.047, 0.62)
const BORDER := Color(0.42, 0.34, 0.18, 0.52)
const TEXT_MAIN := Color(0.94, 0.91, 0.84, 1.0)
const TEXT_MUTED := Color(0.70, 0.67, 0.58, 1.0)
const TEXT_GOLD := Color(0.95, 0.72, 0.32, 1.0)
const TEXT_RED := Color(0.83, 0.30, 0.22, 1.0)
const TEXT_GREEN := Color(0.42, 0.72, 0.42, 1.0)
const TEXT_BLUE := Color(0.42, 0.58, 0.78, 1.0)
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")
const PORTRAIT_ASSET_REGISTRY := preload("res://scripts/ui/portrait_asset_registry.gd")


static func build_profile_page(entry: Dictionary, page_id: String, detail_stack_builder: Callable, back_callback: Callable, action_callback: Callable) -> Control:
	var root := Control.new()
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var stage := build_profile_hero_stage(entry, action_callback)
	stage.set_anchors_preset(Control.PRESET_FULL_RECT)
	stage.offset_left = 0.0
	stage.offset_top = 0.0
	stage.offset_right = 0.0
	stage.offset_bottom = 0.0
	root.add_child(stage)

	var shade := ColorRect.new()
	shade.color = Color(0.0, 0.0, 0.0, 0.05)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(shade)
	root.add_child(build_stage_to_panel_gradient())

	var detail_stack := _build_detail_stack(entry, page_id, detail_stack_builder)
	if detail_stack != null:
		detail_stack.anchor_left = 0.50
		detail_stack.anchor_top = 0.025
		detail_stack.anchor_right = 1.0
		detail_stack.anchor_bottom = 1.0
		detail_stack.offset_left = 0.0
		detail_stack.offset_top = 0.0
		detail_stack.offset_right = -12.0
		detail_stack.offset_bottom = -8.0
		root.add_child(detail_stack)

	var overlay_controls := build_profile_overlay_controls(back_callback)
	overlay_controls.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(overlay_controls)
	return root


static func build_profile_hero_stage(entry: Dictionary, action_callback: Callable) -> Control:
	var stage := Control.new()
	stage.custom_minimum_size = Vector2(0, 0)
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_portrait_frame_stage(stage)

	var frame := _panel(Color(0.045, 0.042, 0.036, 0.94), Color(0.0, 0.0, 0.0, 0.0), 0)
	frame.set_anchors_preset(Control.PRESET_FULL_RECT)
	stage.add_child(frame)

	var texture := _load_texture(entry)
	if texture != null:
		var image := TextureRect.new()
		image.texture = texture
		UI_COMPONENT_FACTORY.apply_portrait_frame_texture(image)
		image.anchor_left = 0.0
		image.anchor_top = 0.0
		image.anchor_right = 0.50
		image.anchor_bottom = 1.0
		image.offset_left = 92.0
		image.offset_top = -2.0
		image.offset_right = 0.0
		image.offset_bottom = 0.0
		stage.add_child(image)
	else:
		var fallback := _panel(BG_PANEL, BORDER, 4)
		fallback.anchor_left = 0.0
		fallback.anchor_top = 0.0
		fallback.anchor_right = 0.50
		fallback.anchor_bottom = 1.0
		fallback.offset_left = 92.0
		fallback.offset_top = -2.0
		fallback.offset_right = 0.0
		fallback.offset_bottom = 0.0
		stage.add_child(fallback)
		fallback.add_child(_label("%s\n画像未接入" % str(entry.get("display_name", "将")).left(2), 18, TEXT_GOLD, HORIZONTAL_ALIGNMENT_CENTER))

	var shade := ColorRect.new()
	shade.color = Color(0.0, 0.0, 0.0, 0.10)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	stage.add_child(shade)

	var section_rail := _build_stage_section_rail()
	section_rail.position = Vector2(16, 188)
	stage.add_child(section_rail)

	var banner := _build_faction_banner(entry)
	banner.position = Vector2(98, 88)
	stage.add_child(banner)

	var stars := _build_stage_star_column(entry)
	stars.position = Vector2(120, 370)
	stage.add_child(stars)

	var operations := _build_stage_operation_strip(action_callback)
	operations.anchor_left = 0.0
	operations.anchor_top = 1.0
	operations.anchor_right = 0.49
	operations.anchor_bottom = 1.0
	operations.offset_left = 92.0
	operations.offset_right = -14.0
	operations.offset_top = -60.0
	operations.offset_bottom = -14.0
	stage.add_child(operations)
	return stage


static func build_stage_to_panel_gradient() -> Control:
	var texture := GradientTexture1D.new()
	texture.width = 1024
	var gradient := Gradient.new()
	gradient.offsets = PackedFloat32Array([0.0, 0.38, 0.76, 1.0])
	gradient.colors = PackedColorArray([
		Color(0.0, 0.0, 0.0, 0.0),
		Color(0.0, 0.0, 0.0, 0.10),
		Color(0.0, 0.0, 0.0, 0.42),
		Color(0.0, 0.0, 0.0, 0.68),
	])
	texture.gradient = gradient
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	var rect := TextureRect.new()
	rect.texture = texture
	rect.stretch_mode = TextureRect.STRETCH_SCALE
	rect.anchor_left = 0.26
	rect.anchor_top = 0.0
	rect.anchor_right = 0.60
	rect.anchor_bottom = 1.0
	rect.offset_left = 0.0
	rect.offset_top = 0.0
	rect.offset_right = 0.0
	rect.offset_bottom = 0.0
	root.add_child(rect)
	var right_backdrop := ColorRect.new()
	right_backdrop.color = Color(0.0, 0.0, 0.0, 0.66)
	right_backdrop.anchor_left = 0.60
	right_backdrop.anchor_top = 0.0
	right_backdrop.anchor_right = 1.0
	right_backdrop.anchor_bottom = 1.0
	root.add_child(right_backdrop)
	return root


static func build_profile_overlay_controls(back_callback: Callable) -> Control:
	var root := Control.new()
	var back_button := Button.new()
	back_button.name = "BackButton"
	back_button.text = "返回"
	back_button.position = Vector2(16, 12)
	UI_COMPONENT_FACTORY.apply_general_profile_back_button_style(back_button)
	back_button.set_meta("general_profile_back_action_id", "general_profile_back_close")
	back_button.set_meta("general_profile_back_live_text_contract", "general_profile_back_live_text_v1")
	back_button.set_meta("general_profile_back_live_text_label", "返回")
	if back_callback.is_valid():
		back_button.pressed.connect(back_callback)
	root.add_child(back_button)
	return root


static func _build_detail_stack(entry: Dictionary, page_id: String, detail_stack_builder: Callable) -> Control:
	if not detail_stack_builder.is_valid():
		return null
	var stack: Variant = detail_stack_builder.call(entry, page_id)
	return stack as Control if stack is Control else null


static func _build_faction_banner(entry: Dictionary) -> Control:
	var faction_label := _faction_label(entry)
	var faction_color := _faction_color(faction_label)
	var root := Control.new()
	root.custom_minimum_size = Vector2(124, 306)
	var name_ribbon := _hero_name_ribbon(str(entry.get("display_name", "待补位")), faction_color)
	name_ribbon.position = Vector2(24, 62)
	root.add_child(name_ribbon)
	var diamond := _faction_diamond_badge(faction_label, faction_color)
	diamond.position = Vector2(0, 0)
	root.add_child(diamond)
	return root


static func _faction_diamond_badge(faction_label: String, faction_color: Color) -> Control:
	var badge := Control.new()
	badge.custom_minimum_size = Vector2(124, 72)
	var shadow := Polygon2D.new()
	shadow.polygon = PackedVector2Array([
		Vector2(62, 2),
		Vector2(120, 34),
		Vector2(96, 68),
		Vector2(28, 68),
		Vector2(4, 34),
	])
	shadow.color = Color(0.0, 0.0, 0.0, 0.66)
	badge.add_child(shadow)
	var plate := Polygon2D.new()
	plate.polygon = PackedVector2Array([
		Vector2(62, 8),
		Vector2(110, 34),
		Vector2(92, 60),
		Vector2(32, 60),
		Vector2(14, 34),
	])
	plate.color = Color(faction_color.r, faction_color.g, faction_color.b, 0.86)
	badge.add_child(plate)
	var label := _nowrap_label(faction_label, 23, TEXT_MAIN, HORIZONTAL_ALIGNMENT_CENTER)
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.position = Vector2(24, 20)
	label.size = Vector2(76, 30)
	label.custom_minimum_size = Vector2(76, 30)
	badge.add_child(label)
	return badge


static func _hero_name_ribbon(hero_name: String, faction_color: Color) -> Control:
	var strip := _panel(Color(0.018, 0.020, 0.024, 0.60), Color(faction_color.r, faction_color.g, faction_color.b, 0.24), 1)
	strip.custom_minimum_size = Vector2(76, 210)
	strip.size = Vector2(76, 210)
	_add_faction_ribbon_gradient(strip, faction_color)
	var margin := _margin(12, 24, 12, 14)
	strip.add_child(margin)
	var label := _label(_vertical_text(hero_name.left(3)), 28, TEXT_MAIN, HORIZONTAL_ALIGNMENT_CENTER)
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	margin.add_child(label)
	return strip


static func _add_faction_ribbon_gradient(root: Control, faction_color: Color) -> void:
	var segment_count := 10
	var segment_height := 21.0
	for index in range(segment_count):
		var segment := ColorRect.new()
		var fade := 1.0 - (float(index) / float(segment_count - 1))
		var alpha := 0.18 * fade * fade
		segment.color = Color(faction_color.r, faction_color.g, faction_color.b, alpha)
		segment.position = Vector2(0, float(index) * segment_height)
		segment.size = Vector2(76, segment_height + 1.0)
		segment.mouse_filter = Control.MOUSE_FILTER_IGNORE
		root.add_child(segment)


static func _build_stage_section_rail() -> Control:
	var panel := _panel(Color(0.010, 0.012, 0.014, 0.52), Color(TEXT_BLUE.r, TEXT_BLUE.g, TEXT_BLUE.b, 0.42), 2)
	panel.custom_minimum_size = Vector2(82, 276)
	var margin := _margin(8, 16, 8, 16)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.add_theme_constant_override("separation", 16)
	margin.add_child(column)
	column.add_child(_rail_item("领\n兵", TEXT_MAIN, true))
	column.add_child(_rail_item("列\n传", TEXT_MUTED, false))
	return panel


static func _rail_item(text: String, color: Color, active: bool) -> Control:
	var panel := _panel(Color(0.0, 0.0, 0.0, 0.42) if active else Color(0.0, 0.0, 0.0, 0.16), Color(color.r, color.g, color.b, 0.55) if active else Color(0.0, 0.0, 0.0, 0.0), 2)
	panel.custom_minimum_size = Vector2(58, 116 if text.length() > 3 else 88)
	var margin := _margin(6, 8, 6, 8)
	panel.add_child(margin)
	var label := _label(text, 21, color, HORIZONTAL_ALIGNMENT_CENTER)
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	margin.add_child(label)
	return panel


static func _faction_label(entry: Dictionary) -> String:
	var raw := str(entry.get("faction", "未知")).strip_edges()
	match raw:
		"魏", "曹魏":
			return "曹魏"
		"蜀", "汉", "季汉", "纪汉":
			return "季汉"
		"吴", "东吴", "孙吴":
			return "东吴"
		"群", "群雄":
			return "群雄"
		_:
			return raw if raw != "" else "未知"


static func _faction_color(faction_label: String) -> Color:
	match faction_label:
		"曹魏":
			return Color(0.36, 0.62, 0.96, 1.0)
		"季汉":
			return Color(0.34, 0.76, 0.43, 1.0)
		"东吴":
			return Color(0.86, 0.28, 0.22, 1.0)
		"群雄":
			return Color(0.93, 0.72, 0.24, 1.0)
		_:
			return TEXT_MUTED


static func _vertical_text(text: String) -> String:
	var result: Array[String] = []
	for index in range(text.length()):
		result.append(text.substr(index, 1))
	return "\n".join(result)


static func _build_stage_star_column(entry: Dictionary) -> Control:
	var column := VBoxContainer.new()
	column.custom_minimum_size = Vector2(68, 286)
	column.add_theme_constant_override("separation", 7)
	var red_stars: int = int(entry.get("red_stars", 0))
	var stars: int = maxi(1, int(entry.get("stars", 5)))
	for index in range(stars):
		var color: Color = TEXT_RED if index < red_stars else TEXT_GOLD
		var star := _nowrap_label("★", 56, color, HORIZONTAL_ALIGNMENT_CENTER)
		star.custom_minimum_size = Vector2(68, 50)
		star.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		column.add_child(star)
	return column


static func _build_stage_operation_strip(action_callback: Callable) -> Control:
	var panel := _panel(Color(0.0, 0.0, 0.0, 0.50), Color(0.0, 0.0, 0.0, 0.0), 0)
	var margin := _margin(10, 6, 10, 6)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_general_profile_stage_action_row_style(row)
	margin.add_child(row)
	for spec in [
		["重置", "general_reset"],
		["攻略", "general_guide"],
		["分享", "general_share"],
		["传承", "general_inherit"],
	]:
		row.add_child(_stage_action_button(str(spec[0]), str(spec[1]), action_callback))
	return panel


static func _stage_action_button(text: String, action_id: String, action_callback: Callable) -> Button:
	var button := Button.new()
	button.name = "GeneralProfileStageActionButton_%s" % action_id
	button.text = text
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.set_meta("general_profile_stage_action_button_token", UI_COMPONENT_FACTORY.GENERAL_PROFILE_STAGE_ACTION_BUTTON_TOKEN)
	button.set_meta("general_profile_stage_action_id", action_id)
	button.set_meta("general_profile_stage_action_live_text_contract", "general_profile_stage_action_live_text_v1")
	button.set_meta("general_profile_stage_action_live_text_label", text)
	UI_COMPONENT_FACTORY.apply_general_profile_stage_action_button_style(button)
	if action_callback.is_valid():
		button.pressed.connect(action_callback.bind(action_id))
	return button


static func _load_texture(entry: Dictionary) -> Texture2D:
	return PORTRAIT_ASSET_REGISTRY.portrait_texture(_portrait_payload(entry))

static func _portrait_payload(entry: Dictionary) -> Dictionary:
	return UI_COMPONENT_FACTORY.hero_portrait_payload_from_entry(entry)


static func _panel(bg: Color, border: Color, radius: int = 4) -> PanelContainer:
	return UI_COMPONENT_FACTORY.make_panel(bg, border, radius)


static func _margin(left: int, top: int, right: int, bottom: int) -> MarginContainer:
	return UI_COMPONENT_FACTORY.make_margin(left, top, right, bottom)


static func _label(text: String, size: int, color: Color, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	return UI_COMPONENT_FACTORY.make_label(text, size, color, align)


static func _nowrap_label(text: String, size: int, color: Color, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	return UI_COMPONENT_FACTORY.make_label(text, size, color, align, false)
