extends RefCounted
class_name GeneralProfileContentRenderer

const BG_DATA := Color(0.025, 0.024, 0.021, 0.56)
const BG_PANEL := Color(0.055, 0.052, 0.047, 0.62)
const BG_ROW := Color(0.090, 0.083, 0.072, 0.58)
const BORDER := Color(0.42, 0.34, 0.18, 0.52)
const BORDER_ACTIVE := Color(0.92, 0.67, 0.24, 0.92)
const BORDER_DATA := Color(0.36, 0.29, 0.15, 0.28)
const TEXT_MAIN := Color(0.94, 0.91, 0.84, 1.0)
const TEXT_MUTED := Color(0.70, 0.67, 0.58, 1.0)
const TEXT_GOLD := Color(0.95, 0.72, 0.32, 1.0)
const TEXT_RED := Color(0.83, 0.30, 0.22, 1.0)
const TEXT_GREEN := Color(0.42, 0.72, 0.42, 1.0)
const TEXT_BLUE := Color(0.42, 0.58, 0.78, 1.0)
const SKILL_TYPE_ICON_COMMAND := "res://assets/themes/slgclient/current/ui/skill/skill_type_command.svg"
const SKILL_TYPE_ICON_PASSIVE := "res://assets/themes/slgclient/current/ui/skill/skill_type_passive.svg"
const SKILL_TYPE_ICON_ACTIVE := "res://assets/themes/slgclient/current/ui/skill/skill_type_active.svg"
const SKILL_TYPE_ICON_CHASE := "res://assets/themes/slgclient/current/ui/skill/skill_type_chase.svg"
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")


static func build_detail_header(entry: Dictionary) -> Control:
	var panel := _panel(BG_ROW, BORDER, 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 54)
	var margin := _margin(12, 9, 12, 9)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)
	margin.add_child(row)
	row.add_child(_nowrap_label("◆", 20, TEXT_GOLD, HORIZONTAL_ALIGNMENT_CENTER))
	row.add_child(_meta_label(_entry_name_variant_line(entry), TEXT_GOLD, 138))
	row.add_child(_vertical_rule())
	row.add_child(_meta_label(str(entry.get("troop_type_label", "待定")), TEXT_MAIN, 70))
	row.add_child(_vertical_rule())
	row.add_child(_meta_label("攻击距离 %s" % _compact_number_label(entry.get("attack_range_label", entry.get("attack_range", "2"))), TEXT_MAIN, 118))
	row.add_child(_vertical_rule())
	row.add_child(_meta_label("COST %s" % _compact_number_label(entry.get("cost_label", entry.get("cost", "-"))), TEXT_MAIN, 92))
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(spacer)
	var location_label := _nowrap_label(_entry_location_line(entry), 14, TEXT_MUTED, HORIZONTAL_ALIGNMENT_RIGHT)
	location_label.custom_minimum_size = Vector2(150, 0)
	row.add_child(location_label)
	return panel


static func build_attribute_overview_panel(entry: Dictionary) -> Control:
	var panel := _panel(BG_DATA, BORDER_DATA, 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(16, 13, 16, 13)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 12)
	margin.add_child(column)
	column.add_child(_label("属性", 20, TEXT_GOLD))
	column.add_child(_progress_line("Lv.%s" % _compact_number_label(entry.get("level", 1)), int(entry.get("exp_current", 0)), int(entry.get("exp_max", 1)), TEXT_GOLD))
	column.add_child(_progress_line("兵力", int(entry.get("soldier_current", 0)), int(entry.get("soldier_max", 1)), TEXT_BLUE))
	column.add_child(_progress_line("体力", int(entry.get("stamina_current", 0)), int(entry.get("stamina_max", 1)), TEXT_GREEN))
	column.add_child(_build_attribute_chip_grid(entry))
	return panel


static func build_skill_block(entry: Dictionary, skill_library_summary: Variant, action_callback: Callable) -> Control:
	var panel := _panel(BG_DATA, BORDER_DATA, 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(12, 10, 12, 10)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 11)
	margin.add_child(column)
	column.add_child(_label("战法", 20, TEXT_GOLD))
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_general_profile_skill_button_row_style(row)
	column.add_child(row)
	var skills := _dictionary_array(entry.get("skills", []))
	var learnable_slots := maxi(0, int(entry.get("learnable_skill_slots", 2)))
	var visible_slot_count := clampi(maxi(skills.size() + learnable_slots, 3), 1, 5)
	for index in range(visible_slot_count):
		var skill: Dictionary = skills[index] if index < skills.size() and skills[index] is Dictionary else {}
		row.add_child(_build_skill_button(skill, index, str(entry.get("skill_name", "待配置") if index == 0 else "待配置"), action_callback))
	column.add_child(_build_skill_library_hint(skill_library_summary))
	return panel


static func build_skill_popup(skill: Dictionary, popup_size: Vector2i, close_callback: Callable) -> Control:
	var popup_skill := skill_popup_read_model_entry(skill)
	var grade_color := _skill_grade_color(_skill_grade_label(popup_skill))
	var dialog := _panel(Color(grade_color.r * 0.055, grade_color.g * 0.045, grade_color.b * 0.035, 0.94), Color(grade_color.r, grade_color.g, grade_color.b, 0.94), 5)
	dialog.custom_minimum_size = Vector2(float(popup_size.x), float(popup_size.y))
	dialog.add_child(_build_skill_popup_content(popup_skill, popup_size, close_callback))
	return dialog


static func skill_popup_read_model_entry(skill: Dictionary) -> Dictionary:
	var display := skill.duplicate(true)
	var detail := _skill_popup_read_model(skill)
	display["skill_detail"] = detail.duplicate(true)
	display["read_model"] = detail.duplicate(true)
	for key in ["id", "name", "grade", "type", "description", "trigger", "target", "effect", "source", "unlock_hint", "recommended_slot", "combat_role", "level", "skill_level", "skillLevel", "status", "equipped_hero_name", "equippedHeroName"]:
		var value: Variant = detail.get(key, "")
		if value is String and str(value).strip_edges() == "":
			continue
		display[key] = value
	for key in ["attribute_effects", "compatible_troops", "tags", "asset_ref"]:
		if detail.has(key):
			display[key] = detail.get(key)
	return display


static func skill_popup_read_model_source(_skill: Dictionary) -> String:
	return "skill_detail/read_model"


static func _skill_popup_read_model(skill: Dictionary) -> Dictionary:
	var raw_detail: Variant = skill.get("skill_detail", skill.get("skillDetail", skill.get("read_model", skill.get("readModel", {}))))
	var detail := (raw_detail as Dictionary).duplicate(true) if raw_detail is Dictionary else {}
	var nested_read_model: Variant = detail.get("read_model", detail.get("readModel", {}))
	if nested_read_model is Dictionary:
		detail = (nested_read_model as Dictionary).duplicate(true)
	for key in ["id", "name", "grade", "type", "description", "trigger", "target", "effect", "source", "unlock_hint", "recommended_slot", "combat_role", "level", "skill_level", "skillLevel", "status", "equipped_hero_name", "equippedHeroName"]:
		if not detail.has(key) and skill.has(key):
			detail[key] = skill.get(key)
	for key in ["attribute_effects", "compatible_troops", "tags", "asset_ref"]:
		if not detail.has(key) and skill.has(key):
			detail[key] = skill.get(key)
	if not detail.has("compatible_troops") and skill.has("compatibleTroops"):
		detail["compatible_troops"] = skill.get("compatibleTroops")
	return detail


static func _build_skill_popup_content(skill: Dictionary, popup_size: Vector2i, close_callback: Callable) -> Control:
	var grade := _skill_grade_label(skill)
	var type_label := _skill_type_label(skill)
	var grade_color := _skill_grade_color(grade)
	var margin := _margin(20, 14, 20, 18)
	margin.custom_minimum_size = Vector2(float(popup_size.x), float(popup_size.y))
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)
	var top_bar := HBoxContainer.new()
	top_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top_bar.add_theme_constant_override("separation", 12)
	column.add_child(top_bar)
	var title_stack := VBoxContainer.new()
	title_stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_stack.add_theme_constant_override("separation", 2)
	top_bar.add_child(title_stack)
	title_stack.add_child(_nowrap_label(str(skill.get("name", "战法")), 28, TEXT_MAIN))
	title_stack.add_child(_nowrap_label("%s / %s / %s" % [type_label, _skill_popup_troop_line(skill), _skill_popup_level_text(skill)], 18, TEXT_MUTED))
	var close_button := Button.new()
	close_button.name = "SkillDetailPopupCloseButton"
	close_button.text = "×"
	close_button.set_meta("skill_detail_popup_close_button_token", UI_COMPONENT_FACTORY.GENERAL_SKILL_DETAIL_POPUP_CLOSE_BUTTON_TOKEN)
	close_button.set_meta("skill_detail_popup_close_action_id", "skill_detail_popup_close")
	close_button.set_meta("skill_detail_popup_close_live_text_contract", "skill_detail_popup_close_live_text_v1")
	close_button.set_meta("skill_detail_popup_close_live_text_label", "关闭")
	UI_COMPONENT_FACTORY.apply_general_skill_detail_popup_close_button_style(close_button)
	if close_callback.is_valid():
		close_button.pressed.connect(close_callback)
	top_bar.add_child(close_button)

	var hero_panel := _panel(Color(0.0, 0.0, 0.0, 0.16), Color(grade_color.r, grade_color.g, grade_color.b, 0.30), 4)
	hero_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var hero_margin := _margin(12, 10, 12, 10)
	hero_panel.add_child(hero_margin)
	var hero_row := HBoxContainer.new()
	hero_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hero_row.add_theme_constant_override("separation", 14)
	hero_margin.add_child(hero_row)
	hero_row.add_child(_skill_popup_emblem(skill, grade_color, type_label))
	var summary_stack := VBoxContainer.new()
	summary_stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	summary_stack.add_theme_constant_override("separation", 8)
	hero_row.add_child(summary_stack)
	summary_stack.add_child(_label(str(skill.get("description", "待配置战法描述。")).strip_edges(), 20, TEXT_MAIN))
	summary_stack.add_child(_label(_skill_popup_compact_effect_line(skill), 18, TEXT_MUTED))
	column.add_child(hero_panel)

	var detail_panel := _panel(Color(0.0, 0.0, 0.0, 0.20), Color(0.0, 0.0, 0.0, 0.0), 0)
	detail_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	detail_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var detail_margin := _margin(10, 10, 10, 10)
	detail_panel.add_child(detail_margin)
	var detail_column := VBoxContainer.new()
	detail_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	detail_column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	detail_column.add_theme_constant_override("separation", 8)
	detail_margin.add_child(detail_column)
	for row_variant in _skill_popup_detail_rows(skill):
		if row_variant is Dictionary:
			detail_column.add_child(_build_skill_popup_detail_row(row_variant as Dictionary))
	column.add_child(detail_panel)
	return margin


static func skill_popup_field_count(skill: Dictionary) -> int:
	return _skill_popup_detail_rows(skill_popup_read_model_entry(skill)).size()


static func build_preview_action_chip(text: String) -> Control:
	var panel := _panel(BG_PANEL, BORDER, 3)
	panel.custom_minimum_size = Vector2(86, 34)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(8, 5, 8, 5)
	panel.add_child(margin)
	var label := _label(text, 15, TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER)
	margin.add_child(label)
	return panel


static func _skill_popup_emblem(skill: Dictionary, grade_color: Color, type_label: String) -> Control:
	var frame := _panel(Color(0.0, 0.0, 0.0, 0.42), Color(grade_color.r, grade_color.g, grade_color.b, 0.92), 70)
	frame.custom_minimum_size = Vector2(142, 142)
	var margin := _margin(14, 12, 14, 12)
	frame.add_child(margin)
	var column := VBoxContainer.new()
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.add_theme_constant_override("separation", 4)
	margin.add_child(column)
	var icon := TextureRect.new()
	icon.texture = _load_texture(_load_skill_type_icon(type_label))
	icon.custom_minimum_size = Vector2(48, 48)
	icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	icon.modulate = grade_color
	column.add_child(icon)
	column.add_child(_nowrap_label(str(skill.get("name", "战法")), 18, TEXT_MAIN, HORIZONTAL_ALIGNMENT_CENTER))
	return frame


static func _skill_popup_description(skill: Dictionary) -> String:
	var lines: Array[String] = []
	for key in ["description", "trigger", "target", "effect"]:
		var value := str(skill.get(key, "")).strip_edges()
		if value != "":
			lines.append(value)
	var recommended_slot := str(skill.get("recommended_slot", "")).strip_edges()
	var combat_role := str(skill.get("combat_role", "")).strip_edges()
	if recommended_slot != "" or combat_role != "":
		var profile_parts: Array[String] = []
		if recommended_slot != "" and recommended_slot != "任意":
			profile_parts.append("建议位：" + recommended_slot)
		if combat_role != "":
			profile_parts.append("定位：" + combat_role)
		lines.append(" / ".join(profile_parts))
	var attribute_effects := _format_skill_attribute_effects(skill.get("attribute_effects", {}))
	if attribute_effects != "":
		lines.append(attribute_effects)
	if lines.is_empty():
		return "待配置战法描述。"
	return "\n".join(lines)


static func _build_skill_popup_detail_row(row: Dictionary) -> Control:
	var panel := _panel(Color(0.0, 0.0, 0.0, 0.16), Color(BORDER_DATA.r, BORDER_DATA.g, BORDER_DATA.b, 0.28), 3)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(10, 7, 10, 7)
	panel.add_child(margin)
	var box := HBoxContainer.new()
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	box.add_theme_constant_override("separation", 10)
	margin.add_child(box)
	var label := _nowrap_label(str(row.get("label", "")), UI_COMPONENT_FACTORY.general_skill_detail_popup_field_label_font_size(), TEXT_GOLD, HORIZONTAL_ALIGNMENT_CENTER)
	label.custom_minimum_size = Vector2(float(UI_COMPONENT_FACTORY.general_skill_detail_popup_field_label_width()), 0)
	box.add_child(label)
	var value := _label(str(row.get("value", "")), UI_COMPONENT_FACTORY.general_skill_detail_popup_field_value_font_size(), TEXT_MAIN)
	value.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	value.size_flags_vertical = Control.SIZE_EXPAND_FILL
	value.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	value.max_lines_visible = 4
	box.add_child(value)
	return panel


static func _skill_popup_detail_rows(skill: Dictionary) -> Array:
	var rows: Array = []
	for spec_variant in UI_COMPONENT_FACTORY.general_skill_detail_popup_field_specs():
		if not (spec_variant is Dictionary):
			continue
		var spec := spec_variant as Dictionary
		_append_skill_popup_row(rows, str(spec.get("label", "")), _skill_popup_field_value(skill, str(spec.get("id", ""))))
	if rows.is_empty():
		_append_skill_popup_row(rows, "说明", "待配置战法描述。")
	return rows


static func _skill_popup_field_value(skill: Dictionary, field_id: String) -> String:
	match field_id:
		"type":
			return _skill_type_label(skill)
		"attribute_effects":
			return _format_skill_attribute_effects(skill.get("attribute_effects", {}))
		"troops":
			return _skill_popup_troop_line(skill)
		"source":
			return _skill_popup_source_line(skill)
		"tags":
			return " / ".join(_string_array(skill.get("tags", [])))
		_:
			return str(skill.get(field_id, ""))


static func _append_skill_popup_row(rows: Array, label: String, value: String) -> void:
	var normalized := value.strip_edges()
	if normalized == "":
		return
	rows.append({"label": label, "value": normalized})


static func _skill_popup_troop_line(skill: Dictionary) -> String:
	var troops := _string_array(skill.get("compatible_troops", []))
	return " / ".join(troops) if not troops.is_empty() else "通用"


static func _skill_popup_level_text(skill: Dictionary) -> String:
	var equipped_hero_name := str(skill.get("equipped_hero_name", skill.get("equippedHeroName", ""))).strip_edges()
	var show_level := bool(skill.get("show_level", false))
	if equipped_hero_name == "" and not show_level:
		return "战法"
	var level_text := _skill_popup_level_value_text(skill.get("skill_level", skill.get("skillLevel", "")))
	if equipped_hero_name != "":
		return "%s携带 Lv.%s" % [equipped_hero_name, level_text] if level_text != "" else "%s携带" % equipped_hero_name
	if level_text == "":
		return "战法"
	return "战法 Lv.%s" % level_text


static func _skill_popup_level_value_text(raw_level: Variant) -> String:
	if raw_level is int:
		var int_level := int(raw_level)
		return str(int_level) if int_level >= 1 and int_level <= 10 else ""
	if raw_level is float:
		var level_float := float(raw_level)
		var rounded_level := int(round(level_float))
		if abs(level_float - float(rounded_level)) < 0.001:
			return str(rounded_level) if rounded_level >= 1 and rounded_level <= 10 else ""
	var text := str(raw_level).strip_edges()
	if text.begins_with("Lv."):
		text = text.substr(3).strip_edges()
	elif text.begins_with("Lv"):
		text = text.substr(2).strip_edges()
	if text.ends_with("级"):
		text = text.substr(0, text.length() - 1).strip_edges()
	if text == "" or not text.is_valid_int():
		return ""
	var int_level := int(text)
	return str(int_level) if int_level >= 1 and int_level <= 10 else ""


static func _skill_popup_source_line(skill: Dictionary) -> String:
	var raw_source: Variant = skill.get("source", {})
	if raw_source is Dictionary:
		var source := raw_source as Dictionary
		var parts: Array[String] = []
		for key in ["pool", "rule", "chapter", "source", "from"]:
			var value := str(source.get(key, "")).strip_edges()
			if value != "":
				parts.append(value)
		if parts.is_empty():
			for key in source.keys():
				var value := str(source.get(key, "")).strip_edges()
				if value != "":
					parts.append(value)
		return " / ".join(parts)
	return str(raw_source).strip_edges()


static func _skill_popup_compact_effect_line(skill: Dictionary) -> String:
	var lines := _skill_popup_description(skill).split("\n", false)
	if lines.is_empty():
		return "完整说明已展开。"
	return lines[0]

static func _format_skill_attribute_effects(raw_value: Variant) -> String:
	if not (raw_value is Dictionary):
		return ""
	var effects := raw_value as Dictionary
	var labels := {
		"attack": "攻击",
		"force": "攻击",
		"defense": "防御",
		"command": "防御",
		"strategy": "谋略",
		"intelligence": "谋略",
		"siege": "攻城",
		"charisma": "攻城",
		"speed": "速度",
	}
	var parts: Array[String] = []
	for key in effects.keys():
		var value := str(effects.get(key, "")).strip_edges()
		if value == "":
			continue
		var label := str(labels.get(str(key), str(key)))
		parts.append("%s%s" % [label, value])
	return " / ".join(parts)


static func _skill_grade_label(skill: Dictionary) -> String:
	var grade := str(skill.get("grade", "S")).strip_edges().to_upper()
	return grade if ["S", "A", "B"].has(grade) else "B"


static func _skill_grade_color(grade: String) -> Color:
	match grade.to_upper():
		"S":
			return TEXT_GOLD
		"A":
			return Color(0.74, 0.42, 0.94, 1.0)
		"B":
			return TEXT_BLUE
		_:
			return TEXT_BLUE


static func _skill_type_label(skill: Dictionary) -> String:
	var raw := str(skill.get("type", "主动")).strip_edges()
	match raw:
		"指挥":
			return "指挥"
		"被动":
			return "被动"
		"追击", "突击":
			return "追击"
		"主动", "恢复":
			return "主动"
		_:
			return "主动"


static func _load_skill_type_icon(type_label: String) -> String:
	if type_label == "指挥":
		return SKILL_TYPE_ICON_COMMAND
	if type_label == "被动":
		return SKILL_TYPE_ICON_PASSIVE
	if type_label == "追击":
		return SKILL_TYPE_ICON_CHASE
	return SKILL_TYPE_ICON_ACTIVE


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


static func _build_attribute_chip_grid(entry: Dictionary) -> Control:
	var grid := GridContainer.new()
	grid.columns = 2
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 16)
	grid.add_theme_constant_override("v_separation", 12)
	for spec in _attribute_specs():
		grid.add_child(_attribute_chip(entry, spec))
	return grid


static func _attribute_specs() -> Array:
	return [
		{"label": "攻击", "key": "force", "icon": "◆", "color": TEXT_RED},
		{"label": "攻城", "key": "charisma", "icon": "▣", "color": TEXT_GOLD},
		{"label": "防御", "key": "command", "icon": "⬟", "color": TEXT_GOLD},
		{"label": "速度", "key": "speed", "icon": "◢", "color": TEXT_GREEN},
		{"label": "谋略", "key": "intelligence", "icon": "✦", "color": TEXT_BLUE},
	]


static func _attribute_chip(entry: Dictionary, spec: Dictionary) -> Control:
	var color: Color = spec.get("color", TEXT_GOLD) as Color
	var panel := _panel(Color(color.r * 0.06, color.g * 0.06, color.b * 0.06, 0.42), Color(color.r, color.g, color.b, 0.26), 2)
	UI_COMPONENT_FACTORY.apply_general_profile_attribute_chip_panel_style(panel)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(11, 8, 11, 8)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	UI_COMPONENT_FACTORY.apply_general_profile_attribute_chip_row_style(row)
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	margin.add_child(row)
	row.add_child(_attribute_icon(str(spec.get("icon", "◆")), color))
	var label := _nowrap_label("%s %s" % [str(spec.get("label", "")), _compact_number_label(entry.get(str(spec.get("key", "")), 0))], 24, TEXT_MAIN)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(label)
	var growth_value: Variant = entry.get("%s_growth" % str(spec.get("key", "")), "")
	var growth := _nowrap_label("(+%s)" % _compact_number_label(growth_value), 21, Color(0.22, 0.86, 0.58, 1.0), HORIZONTAL_ALIGNMENT_RIGHT)
	UI_COMPONENT_FACTORY.apply_general_profile_attribute_chip_growth_style(growth)
	row.add_child(growth)
	return panel


static func _attribute_icon(text: String, color: Color) -> Control:
	var frame := _panel(Color(0.0, 0.0, 0.0, 0.82), Color(color.r, color.g, color.b, 0.36), 2)
	UI_COMPONENT_FACTORY.apply_general_profile_attribute_chip_icon_style(frame)
	var margin := _margin(2, 1, 2, 1)
	frame.add_child(margin)
	margin.add_child(_nowrap_label(text, 23, color, HORIZONTAL_ALIGNMENT_CENTER))
	return frame


static func _build_skill_button(skill: Dictionary, index: int, fallback_name: String, action_callback: Callable) -> Button:
	if skill.is_empty():
		var empty_button := Button.new()
		empty_button.text = "空槽\n可装配战法\n待获取"
		empty_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		UI_COMPONENT_FACTORY.apply_general_profile_empty_skill_button_style(empty_button, TEXT_MUTED)
		return empty_button
	var grade := _skill_grade_label(skill)
	var level_text := "Lv.%s" % _compact_number_label(skill.get("level", 10))
	var type_text := _skill_type_label(skill)
	var title := str(skill.get("name", fallback_name))
	var color := _skill_grade_color(grade)
	var button := Button.new()
	button.name = "GeneralProfileSkillButton_%s" % str(index)
	button.text = "%s   %s\n%s\n%s" % [grade, level_text, title, type_text]
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.clip_text = true
	button.tooltip_text = "点击查看战法详情"
	button.set_meta("general_profile_skill_button_token", UI_COMPONENT_FACTORY.GENERAL_PROFILE_SKILL_BUTTON_TOKEN)
	button.set_meta("general_profile_skill_action_id", "skill_detail:%s" % str(index))
	button.set_meta("general_profile_skill_live_text_contract", "general_profile_skill_live_text_v1")
	button.set_meta("general_profile_skill_live_text_label", title)
	UI_COMPONENT_FACTORY.apply_general_profile_skill_button_style(button, color, TEXT_MAIN)
	if action_callback.is_valid():
		button.pressed.connect(action_callback.bind("skill_detail:%s" % str(index)))
	return button


static func _build_skill_library_hint(raw_summary: Variant) -> Control:
	var summary: Dictionary = raw_summary as Dictionary if raw_summary is Dictionary else {}
	var raw_grade_counts: Variant = summary.get("grade_counts", {})
	var grade_counts: Dictionary = raw_grade_counts as Dictionary if raw_grade_counts is Dictionary else {}
	var raw_type_counts: Variant = summary.get("type_counts", {})
	var type_counts: Dictionary = raw_type_counts as Dictionary if raw_type_counts is Dictionary else {}
	var raw_troop_counts: Variant = summary.get("troop_counts", {})
	var troop_counts: Dictionary = raw_troop_counts as Dictionary if raw_troop_counts is Dictionary else {}
	var top_tag_labels := _string_array(summary.get("top_tag_labels", []))
	var tag_line := ""
	if not top_tag_labels.is_empty():
		tag_line = "；高频标签=%s" % " / ".join(top_tag_labels)
	if summary.is_empty():
		return _label("通用战法库：待加载；武将主战法仍固定在第1槽。", 14, TEXT_MUTED)
	return _label("通用战法库：%s 个；S/A/B=%s/%s/%s；指挥/主动/被动/追击=%s/%s/%s/%s；兵种覆盖 骑/步/弓=%s/%s/%s；装配位=任意%s；主战法仍固定在第1槽。" % [
		str(summary.get("skill_count", 0)),
		str(grade_counts.get("S", 0)),
		str(grade_counts.get("A", 0)),
		str(grade_counts.get("B", 0)),
		str(type_counts.get("指挥", 0)),
		str(type_counts.get("主动", 0)),
		str(type_counts.get("被动", 0)),
		str(type_counts.get("追击", 0)),
		str(troop_counts.get("骑兵", 0)),
		str(troop_counts.get("步兵", 0)),
		str(troop_counts.get("弓兵", 0)),
		tag_line,
	], 14, TEXT_MUTED)


static func _progress_line(title: String, current_value: int, max_value: int, color: Color) -> Control:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_general_profile_progress_line_row_style(row)
	row.add_child(_small_tag(title, int(UI_COMPONENT_FACTORY.general_profile_small_tag_min_width()), TEXT_MAIN))
	var bar := ProgressBar.new()
	UI_COMPONENT_FACTORY.apply_general_profile_progress_bar_style(bar)
	bar.min_value = 0
	bar.max_value = float(maxi(max_value, 1))
	bar.value = float(clampi(current_value, 0, int(bar.max_value)))
	bar.show_percentage = false
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var background_style := StyleBoxFlat.new()
	background_style.bg_color = Color(0.06, 0.06, 0.055, 0.92)
	bar.add_theme_stylebox_override("background", background_style)
	var fill_style := StyleBoxFlat.new()
	fill_style.bg_color = color
	bar.add_theme_stylebox_override("fill", fill_style)
	row.add_child(bar)
	var value_label := _label("%s / %s" % [str(current_value), str(max_value)], UI_COMPONENT_FACTORY.general_profile_progress_value_font_size(), TEXT_MUTED, HORIZONTAL_ALIGNMENT_RIGHT)
	UI_COMPONENT_FACTORY.apply_general_profile_progress_value_style(value_label)
	row.add_child(value_label)
	return row


static func _small_tag(text: String, min_width: int, color: Color) -> Control:
	var panel := _panel(Color(0.0, 0.0, 0.0, 0.82), Color(0.0, 0.0, 0.0, 0.0), 1)
	UI_COMPONENT_FACTORY.apply_general_profile_small_tag_panel_style(panel, float(min_width))
	var margin := UI_COMPONENT_FACTORY.make_general_profile_small_tag_margin()
	panel.add_child(margin)
	var label := _nowrap_label(text, UI_COMPONENT_FACTORY.general_profile_small_tag_font_size(), color, HORIZONTAL_ALIGNMENT_CENTER)
	margin.add_child(label)
	return panel


static func _dictionary_array(raw_value: Variant) -> Array:
	var result: Array = []
	if not (raw_value is Array):
		return result
	for item in raw_value as Array:
		if item is Dictionary:
			result.append(item as Dictionary)
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


static func _compact_number_label(raw_value: Variant) -> String:
	var text := str(raw_value).strip_edges()
	if text == "":
		return "-"
	if text.ends_with(".0"):
		return text.left(text.length() - 2)
	return text


static func _entry_location_line(entry: Dictionary) -> String:
	var unit_id := str(entry.get("unit_id", "")).strip_edges()
	var corps_name := str(entry.get("corps_name", "")).strip_edges()
	if unit_id == "":
		return "当前未编入部队"
	var parts: Array[String] = []
	var readiness := int(entry.get("readiness", 0))
	if readiness > 0:
		parts.append("战备 %s" % str(readiness))
	var role_label := str(entry.get("role_label", "")).strip_edges()
	if role_label != "" and role_label != "reserve":
		parts.append(role_label)
	if corps_name != "":
		parts.append(corps_name)
	var current_task := str(entry.get("current_task", "")).strip_edges()
	if current_task != "" and corps_name == "":
		parts.append(current_task)
	if parts.is_empty():
		parts.append("已编入部队")
	return " · ".join(parts)


static func _entry_name_variant_line(entry: Dictionary) -> String:
	var name := str(entry.get("display_name", "待补位")).strip_edges()
	var variant_tag := str(entry.get("variant_tag", "")).strip_edges()
	if variant_tag == "":
		var quality := str(entry.get("quality", "")).strip_edges()
		if quality.contains("-"):
			variant_tag = quality.get_slice("-", 1).strip_edges()
	var faction := _faction_label(entry)
	if variant_tag != "":
		return "%s  %s · %s" % [name, variant_tag, faction]
	return "%s · %s" % [name, faction]


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


static func _meta_label(text: String, color: Color, min_width: int) -> Label:
	var label := _nowrap_label(text, 17, color, HORIZONTAL_ALIGNMENT_CENTER)
	label.custom_minimum_size = Vector2(min_width, 0)
	label.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	return label


static func _vertical_rule() -> ColorRect:
	var rule := ColorRect.new()
	rule.color = Color(BORDER_ACTIVE.r, BORDER_ACTIVE.g, BORDER_ACTIVE.b, 0.42)
	rule.custom_minimum_size = Vector2(1, 24)
	rule.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return rule


static func _panel(bg: Color, border: Color, radius: int = 4) -> PanelContainer:
	return UI_COMPONENT_FACTORY.make_panel(bg, border, radius)


static func _margin(left: int, top: int, right: int, bottom: int) -> MarginContainer:
	return UI_COMPONENT_FACTORY.make_margin(left, top, right, bottom)


static func _label(text: String, size: int, color: Color, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	return UI_COMPONENT_FACTORY.make_label(text, size, color, align)


static func _nowrap_label(text: String, size: int, color: Color, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	return UI_COMPONENT_FACTORY.make_label(text, size, color, align, false)
