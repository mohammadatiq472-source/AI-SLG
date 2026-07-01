extends RefCounted
class_name GeneralProfileGrowthRenderer

const BG_DATA := Color(0.025, 0.024, 0.021, 0.56)
const BG_ROW := Color(0.090, 0.083, 0.072, 0.58)
const BORDER := Color(0.42, 0.34, 0.18, 0.52)
const BORDER_ACTIVE := Color(0.92, 0.67, 0.24, 0.92)
const BORDER_DATA := Color(0.36, 0.29, 0.15, 0.28)
const TEXT_MAIN := Color(0.94, 0.91, 0.84, 1.0)
const TEXT_MUTED := Color(0.70, 0.67, 0.58, 1.0)
const TEXT_GOLD := Color(0.95, 0.72, 0.32, 1.0)
const TEXT_GREEN := Color(0.42, 0.72, 0.42, 1.0)
const TROOP_ILLUSTRATION_INFANTRY := "res://assets/themes/slgclient/current/units/generated_troops/illustrations/foreground/infantry_unit_fg.png"
const TROOP_ILLUSTRATION_ARCHER := "res://assets/themes/slgclient/current/units/generated_troops/illustrations/foreground/archer_unit_fg.png"
const TROOP_ILLUSTRATION_CAVALRY := "res://assets/themes/slgclient/current/units/generated_troops/illustrations/foreground/cavalry_unit_fg.png"
const TROOP_ILLUSTRATION_TRAP_CAMP := "res://assets/themes/slgclient/current/units/generated_troops/illustrations/foreground/xianzhenying_unit_fg.png"
const TROOP_ILLUSTRATION_REPEATING_CROSSBOW := "res://assets/themes/slgclient/current/units/generated_troops/illustrations/foreground/zhuge_repeating_crossbow_fg.png"
const TROOP_ILLUSTRATION_TIGER_LEOPARD := "res://assets/themes/slgclient/current/units/generated_troops/illustrations/foreground/tiger_leopard_cavalry_fg.png"
const TROOP_ILLUSTRATION_WHITE_HORSE := "res://assets/themes/slgclient/current/units/generated_troops/illustrations/foreground/white_horse_cavalry_fg.png"
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")


static func build_troop_block(entry: Dictionary, variants: Array, active_index: int, slide_direction: int, action_callback: Callable) -> Control:
	var panel := _panel(BG_DATA, BORDER_DATA, 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var margin := _margin(12, 12, 12, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)
	var heading := HBoxContainer.new()
	heading.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	heading.add_theme_constant_override("separation", 8)
	column.add_child(heading)
	heading.add_child(_label("兵种", 17, TEXT_GOLD))
	var meta := _nowrap_label("%s · 攻击距离 %s · COST %s" % [
		str(entry.get("troop_type_label", "待定")),
		_compact_number_label(entry.get("attack_range_label", entry.get("attack_range", "2"))),
		_compact_number_label(entry.get("cost_label", entry.get("cost", "-"))),
	], 13, TEXT_MUTED, HORIZONTAL_ALIGNMENT_RIGHT)
	meta.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	heading.add_child(meta)
	var cards := HBoxContainer.new()
	cards.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cards.size_flags_vertical = Control.SIZE_EXPAND_FILL
	cards.add_theme_constant_override("separation", 10)
	column.add_child(cards)
	if variants.is_empty():
		cards.add_child(_empty_panel("兵种预览待补", "等待兵种插画资源接入。"))
	else:
		var clamped_index := clampi(active_index, 0, variants.size() - 1)
		cards.add_child(build_troop_illustration_card(variants[clamped_index] as Dictionary, clamped_index, variants.size(), slide_direction, action_callback))
	return panel


static func build_troop_illustration_card(spec: Dictionary, active_index: int, variant_count: int, slide_direction: int, action_callback: Callable) -> Control:
	var panel := _panel(Color(0.070, 0.064, 0.056, 0.78), BORDER_ACTIVE, 3)
	panel.custom_minimum_size = Vector2(0, 600)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var margin := _margin(10, 10, 10, 10)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)

	var top := HBoxContainer.new()
	top.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_theme_constant_override("separation", 8)
	column.add_child(top)
	var kind := str(spec.get("kind", "普通兵种"))
	top.add_child(_chip(kind, TEXT_GREEN if kind == "普通兵种" else TEXT_GOLD))
	var title := _nowrap_label(str(spec.get("name", "兵种")), 18, TEXT_GOLD, HORIZONTAL_ALIGNMENT_CENTER)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(title)
	top.add_child(_nowrap_label("%s/%s" % [str(active_index + 1), str(variant_count)], 13, TEXT_MUTED, HORIZONTAL_ALIGNMENT_RIGHT))

	var carousel := HBoxContainer.new()
	carousel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	carousel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	carousel.add_theme_constant_override("separation", 8)
	column.add_child(carousel)
	carousel.add_child(_troop_arrow_button("<", "troop_preview_prev", variant_count <= 1, action_callback))
	carousel.add_child(_troop_illustration_box(str(spec.get("image", "")), str(spec.get("name", "兵种")), slide_direction))
	carousel.add_child(_troop_arrow_button(">", "troop_preview_next", variant_count <= 1, action_callback))

	var features := HBoxContainer.new()
	features.alignment = BoxContainer.ALIGNMENT_CENTER
	features.add_theme_constant_override("separation", 8)
	column.add_child(features)
	for feature in _string_array(spec.get("features", [])):
		features.add_child(_chip(feature, TEXT_GREEN if feature == "固定兵种" else TEXT_GOLD))
	column.add_child(_label(str(spec.get("description", "")), 14, TEXT_MAIN, HORIZONTAL_ALIGNMENT_CENTER))
	return panel


static func build_troop_variant_specs(entry: Dictionary) -> Array[Dictionary]:
	var primary := str(entry.get("troop_type_label", "骑兵")).strip_edges()
	if primary == "":
		primary = "骑兵"
	var image_path := troop_illustration_for_label(primary)
	var variants: Array[Dictionary] = [
		{"name": primary, "kind": "普通兵种", "image": image_path, "features": ["固定兵种"], "description": "%s为该武将固定兵种。" % primary},
	]
	for special in _special_troop_specs_for_label(primary):
		variants.append(special)
	return variants


static func active_troop_variant_index(current: int, count: int) -> int:
	if count <= 0:
		return 0
	return clampi(current, 0, count - 1)


static func troop_illustration_for_label(troop_label: String) -> String:
	match troop_label:
		"骑兵":
			return TROOP_ILLUSTRATION_CAVALRY
		"弓兵":
			return TROOP_ILLUSTRATION_ARCHER
		"虎豹骑":
			return TROOP_ILLUSTRATION_TIGER_LEOPARD
		"白马义从":
			return TROOP_ILLUSTRATION_WHITE_HORSE
		"诸葛连弩兵":
			return TROOP_ILLUSTRATION_REPEATING_CROSSBOW
		"陷阵营":
			return TROOP_ILLUSTRATION_TRAP_CAMP
		_:
			return TROOP_ILLUSTRATION_INFANTRY


static func _special_troop_specs_for_label(troop_label: String) -> Array[Dictionary]:
	match troop_label:
		"骑兵":
			return [
				{"name": "虎豹骑", "kind": "特色兵种", "image": TROOP_ILLUSTRATION_TIGER_LEOPARD, "features": ["精锐重骑"], "description": "虎豹骑为曹魏精锐骑兵预览。"},
				{"name": "白马义从", "kind": "特色兵种", "image": TROOP_ILLUSTRATION_WHITE_HORSE, "features": ["轻骑突击"], "description": "白马义从为北地精骑预览。"},
			]
		"弓兵":
			return [
				{"name": "诸葛连弩兵", "kind": "特色兵种", "image": TROOP_ILLUSTRATION_REPEATING_CROSSBOW, "features": ["连弩"], "description": "诸葛连弩兵为特色弩兵预览。"},
			]
		_:
			return [
				{"name": "陷阵营", "kind": "特色兵种", "image": TROOP_ILLUSTRATION_TRAP_CAMP, "features": ["重甲破阵"], "description": "陷阵营为精锐重步兵预览。"},
			]


static func _troop_arrow_button(text: String, action_id: String, disabled: bool, action_callback: Callable) -> Button:
	var button := Button.new()
	button.name = "GeneralGrowthTroopArrowButton_%s" % action_id
	button.text = text
	button.disabled = disabled
	button.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	button.set_meta("general_growth_troop_arrow_button_token", UI_COMPONENT_FACTORY.GENERAL_GROWTH_TROOP_ARROW_BUTTON_TOKEN)
	button.set_meta("general_growth_troop_arrow_action_id", action_id)
	button.set_meta("general_growth_troop_arrow_live_text_contract", "general_growth_troop_arrow_live_text_v1")
	button.set_meta("general_growth_troop_arrow_live_text_label", "上一兵种" if action_id == "troop_preview_prev" else "下一兵种")
	UI_COMPONENT_FACTORY.apply_general_growth_troop_arrow_button_style(button)
	if action_callback.is_valid():
		button.pressed.connect(action_callback.bind(action_id))
	return button


static func _troop_illustration_box(image_path: String, troop_label: String, slide_direction: int) -> Control:
	var panel := _panel(Color(0.0, 0.0, 0.0, 0.20), Color(0.0, 0.0, 0.0, 0.0), 0)
	panel.custom_minimum_size = Vector2(0, 430)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_general_growth_troop_illustration_frame(panel)
	var backdrop := ColorRect.new()
	backdrop.color = Color(0.015, 0.014, 0.012, 0.24)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	panel.add_child(backdrop)
	var texture := _load_texture(image_path)
	if texture != null:
		var image := TextureRect.new()
		image.name = "TroopIllustrationForeground"
		image.texture = texture
		image.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		image.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		image.set_anchors_preset(Control.PRESET_FULL_RECT)
		image.offset_left = 8.0
		image.offset_top = 0.0
		image.offset_right = -8.0
		image.offset_bottom = 0.0
		image.mouse_filter = Control.MOUSE_FILTER_IGNORE
		panel.add_child(image)
		_prepare_troop_illustration_transition(image, slide_direction)
	else:
		var fallback := _label("%s\n兵种插画待补" % troop_label, 14, TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER)
		fallback.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		fallback.set_anchors_preset(Control.PRESET_FULL_RECT)
		panel.add_child(fallback)
	return panel


static func _prepare_troop_illustration_transition(image: TextureRect, slide_direction: int) -> void:
	if slide_direction == 0:
		image.modulate = Color(1.0, 1.0, 1.0, 1.0)
		return
	if not image.is_inside_tree():
		image.modulate = Color(1.0, 1.0, 1.0, 1.0)
		return
	var shift := float(slide_direction) * 18.0
	image.modulate = Color(1.0, 1.0, 1.0, 0.0)
	image.offset_left += shift
	image.offset_right += shift
	var target_left := image.offset_left - shift
	var target_right := image.offset_right - shift
	var tween := image.create_tween()
	tween.set_trans(Tween.TRANS_SINE)
	tween.set_ease(Tween.EASE_OUT)
	tween.tween_property(image, "modulate", Color(1.0, 1.0, 1.0, 1.0), 0.14)
	tween.parallel().tween_property(image, "offset_left", target_left, 0.14)
	tween.parallel().tween_property(image, "offset_right", target_right, 0.14)


static func _load_texture(path: String) -> Texture2D:
	var resolved := path.strip_edges()
	if resolved == "":
		return null
	if ResourceLoader.exists(resolved):
		var resource := load(resolved)
		if resource is Texture2D:
			return resource as Texture2D
	var image := Image.new()
	var load_path := resolved
	if resolved.begins_with("res://"):
		load_path = ProjectSettings.globalize_path(resolved)
	var error := image.load(load_path)
	if error == OK:
		return ImageTexture.create_from_image(image)
	return null


static func _compact_number_label(raw_value: Variant) -> String:
	var text := str(raw_value).strip_edges()
	if text == "":
		return "-"
	if text.ends_with(".0"):
		return text.left(text.length() - 2)
	return text


static func _string_array(raw_value: Variant) -> Array:
	var result: Array = []
	if not (raw_value is Array):
		return result
	for item in raw_value as Array:
		var text := str(item).strip_edges()
		if text != "":
			result.append(text)
	return result


static func _empty_panel(title: String, body: String) -> Control:
	var panel := _panel(BG_ROW, BORDER, 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(12, 12, 12, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 6)
	margin.add_child(column)
	column.add_child(_label(title, 16, TEXT_GOLD))
	column.add_child(_label(body, 13, TEXT_MUTED))
	return panel


static func _chip(text: String, color: Color) -> Control:
	var panel := _panel(Color(color.r * 0.25, color.g * 0.25, color.b * 0.25, 0.88), Color(color.r, color.g, color.b, 0.88), 4)
	UI_COMPONENT_FACTORY.apply_general_growth_troop_chip_style(panel, text)
	var margin := UI_COMPONENT_FACTORY.make_general_growth_troop_chip_margin()
	panel.add_child(margin)
	var label := _nowrap_label(text, UI_COMPONENT_FACTORY.general_growth_troop_chip_font_size(), color)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	margin.add_child(label)
	return panel


static func _panel(bg: Color, border: Color, radius: int = 4) -> PanelContainer:
	return UI_COMPONENT_FACTORY.make_panel(bg, border, radius)


static func _margin(left: int, top: int, right: int, bottom: int) -> MarginContainer:
	return UI_COMPONENT_FACTORY.make_margin(left, top, right, bottom)


static func _label(text: String, size: int, color: Color, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	return UI_COMPONENT_FACTORY.make_label(text, size, color, align)


static func _nowrap_label(text: String, size: int, color: Color, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	return UI_COMPONENT_FACTORY.make_label(text, size, color, align, false)


static func _apply_button_style(button: Button, bg: Color, border: Color, font_color: Color) -> void:
	UI_COMPONENT_FACTORY.apply_button_style(button, bg, border, font_color, font_color, 4, 0.06, 0.06)
