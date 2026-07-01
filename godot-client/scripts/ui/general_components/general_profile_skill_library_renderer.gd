extends RefCounted
class_name GeneralProfileSkillLibraryRenderer

const BG_DATA := Color(0.025, 0.024, 0.021, 0.56)
const BG_PANEL := Color(0.055, 0.052, 0.047, 0.62)
const BG_ROW := Color(0.090, 0.083, 0.072, 0.58)
const BG_ROW_ACTIVE := Color(0.16, 0.115, 0.065, 0.72)
const BORDER := Color(0.42, 0.34, 0.18, 0.52)
const BORDER_ACTIVE := Color(0.92, 0.67, 0.24, 0.92)
const BORDER_DATA := Color(0.36, 0.29, 0.15, 0.28)
const TEXT_MAIN := Color(0.94, 0.91, 0.84, 1.0)
const TEXT_MUTED := Color(0.70, 0.67, 0.58, 1.0)
const TEXT_GOLD := Color(0.95, 0.72, 0.32, 1.0)
const TEXT_BLUE := Color(0.42, 0.58, 0.78, 1.0)
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")
const HeroCardViewScript := preload("res://scripts/ui/formal_pack/components/hero_card_view.gd")

static func build_filter_payload(raw_library: Variant, filter_state: Dictionary) -> Dictionary:
	var state := _normalize_skill_library_filter_state(filter_state)
	var library := raw_library as Dictionary if raw_library is Dictionary else {}
	var raw_library_skills := _array(library.get("skills", []))
	var skills: Array = []
	for skill_variant in raw_library_skills:
		if skill_variant is Dictionary:
			skills.append(skill_variant)

	var has_grade_scope: bool = state.get("grade", "全部") != "全部"
	var has_type_scope: bool = state.get("type", "全部") != "全部"
	var has_troop_scope: bool = state.get("troop", "全部") != "全部"
	var has_tag_scope: bool = state.get("tag", "全部") != "全部"
	var has_source_scope: bool = state.get("source", "全部") != "全部"
	var search_text := str(state.get("search", "")).strip_edges()
	var has_search_scope := search_text != ""

	var total_count := skills.size()
	var filtered_entries := _filtered_skill_library_entries(skills, state)
	var tag_scope_entries := _skill_library_entries_for_scope(skills, state, false, true)
	var source_scope_entries := _skill_library_entries_for_scope(skills, state, true, false)
	var supported_tags := _skill_library_supported_tags_for_payload(library, skills)
	var type_options := _build_skill_library_type_options_for_payload(skills)
	var tag_options := _build_skill_library_tag_options_for_payload(tag_scope_entries, supported_tags)
	var source_options := _build_skill_library_source_options_for_payload(source_scope_entries)
	var filtered_tag_options := _build_skill_library_tag_options_for_payload(filtered_entries, supported_tags)
	var filtered_source_options := _build_skill_library_source_options_for_payload(filtered_entries)

	var result := {
		"has_active_filter": has_grade_scope or has_type_scope or has_troop_scope or has_tag_scope or has_source_scope or has_search_scope,
		"filtered_entries": filtered_entries,
		"total_count": total_count,
		"tag_scope_count": tag_scope_entries.size(),
		"source_scope_count": source_scope_entries.size(),
		"type_options": type_options,
		"tag_options": tag_options,
		"source_options": source_options,
		"active_filter_line": _skill_library_active_filter_line_for_payload(state),
		"source_hit_summary": _option_summary_for_payload(filtered_source_options, "source", 4),
		"tag_hit_summary": _option_summary_for_payload(filtered_tag_options, "tag", 6),
		"search_summary": _skill_library_search_summary_for_payload(filtered_entries, search_text),
		"grade": state.get("grade", "全部"),
		"type": state.get("type", "全部"),
		"troop": state.get("troop", "全部"),
		"tag": state.get("tag", "全部"),
		"source": state.get("source", "全部"),
		"search": search_text,
		"sort": state.get("sort", "品质"),
		"source_expanded": bool(state.get("source_expanded", false)),
		"tag_expanded": bool(state.get("tag_expanded", false)),
	}
	return result

static func build_skill_library_browser(config: Dictionary) -> Control:
	var action_callback := _callable(config, "action_callback")
	var search_changed_callback := _callable(config, "search_changed_callback")
	var search_submitted_callback := _callable(config, "search_submitted_callback")
	var filter_state: Dictionary = config.get("filter_state", {}) as Dictionary
	var payload := build_filter_payload(config.get("raw_library", {}), filter_state) if (
		not config.has("has_active_filter")
		or not config.has("filtered_entries")
		or not config.has("total_count")
		or not config.has("tag_scope_count")
		or not config.has("source_scope_count")
		or not config.has("type_options")
		or not config.has("tag_options")
		or not config.has("source_options")
		or not config.has("active_filter_line")
		or not config.has("source_hit_summary")
		or not config.has("tag_hit_summary")
		or not config.has("search_summary")
	) else {}
	var search_text := str(filter_state.get("search", "")).strip_edges()
	var filtered_entries := _array(config.get("filtered_entries", payload.get("filtered_entries", [])))
	var total_count := int(config.get("total_count", int(payload.get("total_count", 0))))
	var has_active_filter := bool(config.get("has_active_filter", bool(payload.get("has_active_filter", false))))
	var tag_scope_count := int(config.get("tag_scope_count", int(payload.get("tag_scope_count", total_count))))
	var source_scope_count := int(config.get("source_scope_count", int(payload.get("source_scope_count", total_count))))
	var type_options := _array(config.get("type_options", payload.get("type_options", [])))
	var tag_options := _array(config.get("tag_options", payload.get("tag_options", [])))
	var source_options := _array(config.get("source_options", payload.get("source_options", [])))
	var source_hit_summary := str(config.get("source_hit_summary", str(payload.get("source_hit_summary", "无"))))
	var tag_hit_summary := str(config.get("tag_hit_summary", str(payload.get("tag_hit_summary", "无"))))
	var search_summary := str(config.get("search_summary", str(payload.get("search_summary", "无"))))
	var active_filter_line := str(config.get("active_filter_line", str(payload.get("active_filter_line", "全部通用战法"))))

	var summary_payload := {
		"active_filter_line": active_filter_line,
		"source_hit_summary": source_hit_summary,
		"tag_hit_summary": tag_hit_summary,
		"search_summary": search_summary,
	}

	var panel := _panel(BG_DATA, BORDER_DATA, 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var margin := _margin(22, 10, 22, 16)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)

	column.add_child(_build_skill_library_control_band(filter_state, search_text, type_options, filtered_entries.size(), total_count, action_callback, search_changed_callback, search_submitted_callback))

	column.add_child(_build_skill_library_full_deck(filtered_entries, total_count, search_text, summary_payload, action_callback))
	return panel


static func _build_skill_library_control_band(filter_state: Dictionary, search_text: String, type_options: Array, filtered_count: int, total_count: int, action_callback: Callable, search_changed_callback: Callable, search_submitted_callback: Callable) -> Control:
	var panel := UI_COMPONENT_FACTORY.make_general_skill_library_control_band_panel(BORDER_DATA)
	var margin := _margin(12, 9, 12, 9)
	panel.add_child(margin)
	var row := UI_COMPONENT_FACTORY.make_general_skill_library_control_band_row()
	row.name = "SkillLibraryControlBandSingleRow"
	margin.add_child(row)

	var chip_flow := UI_COMPONENT_FACTORY.make_general_skill_library_control_band_chip_flow()
	chip_flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(chip_flow)
	var grade_filter := str(filter_state.get("grade", "全部"))
	var type_filter := str(filter_state.get("type", "全部"))
	chip_flow.add_child(_filter_button("全部", grade_filter == "S" and type_filter == "全部", "skill_library_filter:reset:S", action_callback))
	for type_label in _skill_library_primary_type_labels_for_payload(type_options):
		chip_flow.add_child(_filter_button(type_label, type_filter == type_label, "skill_library_filter:type:%s" % type_label, action_callback))

	var count_panel := UI_COMPONENT_FACTORY.make_general_skill_library_showcase_header_count_panel(BORDER_ACTIVE)
	count_panel.tooltip_text = "当前筛选 %s / 总计 %s" % [str(filtered_count), str(total_count)]
	var count_margin := UI_COMPONENT_FACTORY.make_general_skill_library_showcase_header_count_margin()
	count_panel.add_child(count_margin)
	var count_column := UI_COMPONENT_FACTORY.make_general_skill_library_showcase_header_count_column()
	count_margin.add_child(count_column)
	count_column.add_child(_nowrap_label(str(total_count), UI_COMPONENT_FACTORY.general_skill_library_showcase_header_count_value_font_size(), TEXT_GOLD, HORIZONTAL_ALIGNMENT_CENTER))
	count_column.add_child(_nowrap_label("战法", UI_COMPONENT_FACTORY.general_skill_library_showcase_header_count_caption_font_size(), TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	row.add_child(count_panel)

	var search_box := UI_COMPONENT_FACTORY.make_general_skill_library_control_band_search_box()
	search_box.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	row.add_child(search_box)
	var input := UI_COMPONENT_FACTORY.make_general_skill_library_control_band_search_input(search_text)
	if search_changed_callback.is_valid():
		input.text_changed.connect(search_changed_callback)
	if search_submitted_callback.is_valid():
		input.text_submitted.connect(search_submitted_callback)
	search_box.add_child(input)
	var search_button := _filter_button("查找", false, "skill_library_filter:search_apply:全部", action_callback)
	search_button.name = UI_COMPONENT_FACTORY.general_skill_library_control_band_search_button_node_name()
	search_box.add_child(search_button)
	var clear_button := _filter_button("清空", search_text != "", "skill_library_filter:search_clear:全部", action_callback)
	clear_button.name = UI_COMPONENT_FACTORY.general_skill_library_control_band_clear_button_node_name()
	search_box.add_child(clear_button)
	return panel


static func _build_skill_library_full_deck(filtered_entries: Array, total_count: int, search_text: String, summary_payload: Dictionary, action_callback: Callable) -> Control:
	var panel := UI_COMPONENT_FACTORY.make_general_skill_library_deck_body_panel(BORDER)
	var margin := UI_COMPONENT_FACTORY.make_general_skill_library_deck_body_margin()
	panel.add_child(margin)
	var column := UI_COMPONENT_FACTORY.make_general_skill_library_deck_body_column()
	margin.add_child(column)
	var header := UI_COMPONENT_FACTORY.make_general_skill_library_deck_header_row()
	column.add_child(header)
	header.add_child(_nowrap_label("战法卡组", UI_COMPONENT_FACTORY.general_skill_library_deck_header_title_font_size(), TEXT_GOLD))
	var summary := _label(
		"%s / %s" % [str(mini(UI_COMPONENT_FACTORY.general_skill_library_result_list_visible_card_target(), filtered_entries.size())), str(total_count)],
		UI_COMPONENT_FACTORY.general_skill_library_deck_header_summary_font_size(),
		TEXT_MUTED,
		HORIZONTAL_ALIGNMENT_RIGHT
	)
	summary.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(summary)
	var card_config := HeroCardViewScript.full_card_config(HeroCardViewScript.MODE_DRAW_RESULT)
	var card_width := float(card_config.get("width", HeroCardViewScript.FULL_CARD_WIDTH))
	var card_height := float(card_config.get("height", HeroCardViewScript.FULL_CARD_HEIGHT))
	var card_gap := int(HeroCardViewScript.FULL_CARD_GAP)
	var rendered_count := filtered_entries.size()
	var visible_entries := _skill_library_visible_deck_entries(filtered_entries, rendered_count)
	rendered_count = visible_entries.size()
	var scroll := ScrollContainer.new()
	scroll.name = "SkillLibraryDeckCardRailScroll"
	UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(scroll)
	scroll.custom_minimum_size = Vector2(0, card_height + 18.0)
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.set_meta("skill_library_deck_card_scroll_anchor_mode", "fill_parent_left_content_v1")
	scroll.set_meta("skill_library_deck_card_scroll_axis", "vertical_touch_scroll_v1")
	column.add_child(scroll)
	var grid := GridContainer.new()
	grid.name = "SkillLibraryDeckCardGrid"
	grid.columns = UI_COMPONENT_FACTORY.general_skill_library_deck_visible_card_target(filtered_entries.size())
	grid.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	grid.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	grid.add_theme_constant_override("h_separation", card_gap)
	grid.add_theme_constant_override("v_separation", 18)
	grid.set_meta("skill_library_deck_card_grid_mode", "responsive_centered_skill_card_grid_v1")
	grid.set_meta("skill_library_deck_card_rail_anchor_mode", "centered_visible_cards_responsive_v1")
	scroll.add_child(grid)
	if filtered_entries.is_empty():
		grid.add_child(_label("没有符合当前筛选的通用战法。", UI_COMPONENT_FACTORY.general_skill_library_result_empty_font_size(), TEXT_MUTED))
		return panel
	var limit := rendered_count
	for index in range(limit):
		var skill_variant: Variant = visible_entries[index]
		if skill_variant is Dictionary:
			var hero_card := HeroCardViewScript.build_card(_skill_library_hero_card_entry(skill_variant as Dictionary, search_text), HeroCardViewScript.MODE_DRAW_RESULT, card_config)
			var skill_id := str((skill_variant as Dictionary).get("id", ""))
			var skill_name := str((skill_variant as Dictionary).get("name", "战法"))
			hero_card.set_meta("skill_library_deck_card_action_id", "skill_library_card_flip:%s" % skill_id)
			hero_card.set_meta("skill_library_deck_card_live_text_contract", "skill_library_deck_card_flip_live_text_v1")
			hero_card.set_meta("skill_library_deck_card_live_text_label", skill_name)
			hero_card.tooltip_text = "点击翻面查看战法属性"
			grid.add_child(hero_card)
	return panel


static func hero_card_entries_for_payload(filtered_entries: Array, search_text: String, limit: int) -> Array:
	var result: Array = []
	var visible_entries := _skill_library_visible_deck_entries(filtered_entries, limit)
	var count := mini(maxi(0, limit), visible_entries.size())
	for index in range(count):
		var skill_variant: Variant = visible_entries[index]
		if skill_variant is Dictionary:
			result.append(_skill_library_hero_card_entry(skill_variant as Dictionary, search_text))
	return result


static func _skill_library_visible_deck_entries(filtered_entries: Array, limit: int) -> Array:
	var target := filtered_entries.size() if limit <= 0 else mini(maxi(0, limit), filtered_entries.size())
	if target <= 0:
		return []
	var priority: Array = []
	var fallback: Array = []
	for skill_variant in filtered_entries:
		if not (skill_variant is Dictionary):
			continue
		var skill := skill_variant as Dictionary
		var display := _skill_library_display_entry(skill)
		if _skill_controller_display_name(display) != "" or str(display.get("skill_level", display.get("skillLevel", ""))).strip_edges() != "":
			priority.append(skill)
		else:
			fallback.append(skill)
	var result: Array = []
	for skill in priority:
		if result.size() >= target:
			break
		result.append(skill)
	for skill in fallback:
		if result.size() >= target:
			break
		result.append(skill)
	return result


static func _skill_library_hero_card_entry(skill: Dictionary, search_text: String = "") -> Dictionary:
	var display := _skill_library_display_entry(skill)
	var grade := _skill_grade_label(skill)
	var skill_name := UI_COMPONENT_FACTORY.general_skill_library_deck_card_title_text(display).strip_edges()
	if skill_name == "":
		skill_name = str(skill.get("name", "战法")).strip_edges()
	if skill_name == "":
		skill_name = "战法"
	var skill_id := str(skill.get("id", skill_name)).strip_edges()
	return {
		"id": skill_id if skill_id != "" else skill_name,
		"name": skill_name,
		"displayName": skill_name,
		"title": "战法",
		"faction": "战法",
		"campName": "战法",
		"type": _skill_type_label(display),
		"skill_type": _skill_type_label(display),
		"quality": grade,
		"rarity": grade,
		"stars": "",
		"level": display.get("level", ""),
		"skill_level": display.get("skill_level", display.get("skillLevel", "")),
		"equipped_hero_name": str(display.get("equipped_hero_name", display.get("equippedHeroName", ""))).strip_edges(),
		"controller_display_name": _skill_controller_display_name(display),
		"owner_display_name": _skill_controller_display_name(display),
		"troopType": "战法",
		"troop": "战法",
		"value": skill_name,
		"description": UI_COMPONENT_FACTORY.general_skill_library_deck_card_description_text(display),
		"effect": _skill_effect_line(display),
		"meta": _skill_preview_meta_text(display, search_text),
		"trigger": str(display.get("trigger", "")).strip_edges(),
		"target": str(display.get("target", "")).strip_edges(),
		"compatible_troops": _string_array(display.get("compatible_troops", [])),
		"source": (display.get("source", {}) as Dictionary).duplicate(true) if display.get("source", {}) is Dictionary else display.get("source", ""),
		"skill_detail": _skill_detail_read_model(display),
		"result_label": "",
		"draw_label": "",
		"status": _skill_library_equip_status_text(display),
		"preview_kind": "skill",
		"tone": "skill",
		"asset_ref": _skill_asset_ref(display),
	}


static func _skill_detail_read_model(skill: Dictionary) -> Dictionary:
	var raw_detail: Variant = skill.get("skill_detail", skill.get("skillDetail", skill.get("read_model", skill.get("readModel", {}))))
	var source := (raw_detail as Dictionary).duplicate(true) if raw_detail is Dictionary else {}
	var nested_read_model: Variant = source.get("read_model", source.get("readModel", {}))
	if nested_read_model is Dictionary:
		source = (nested_read_model as Dictionary).duplicate(true)
	return {
		"id": str(skill.get("id", "")).strip_edges(),
		"name": str(skill.get("name", "")).strip_edges(),
		"grade": str(skill.get("grade", "")).strip_edges(),
		"type": str(skill.get("type", "")).strip_edges(),
		"level": source.get("level", skill.get("level", "")),
		"skill_level": source.get("skill_level", source.get("skillLevel", skill.get("skill_level", skill.get("skillLevel", "")))),
		"status": str(source.get("status", skill.get("status", ""))).strip_edges(),
		"equipped_hero_name": str(source.get("equipped_hero_name", source.get("equippedHeroName", skill.get("equipped_hero_name", "")))).strip_edges(),
		"controller_display_name": _skill_controller_display_name(source) if _skill_controller_display_name(source) != "" else _skill_controller_display_name(skill),
		"owner_display_name": _skill_controller_display_name(source) if _skill_controller_display_name(source) != "" else _skill_controller_display_name(skill),
		"description": UI_COMPONENT_FACTORY.general_skill_library_deck_card_description_text(skill),
		"trigger": str(source.get("trigger", skill.get("trigger", ""))).strip_edges(),
		"target": str(source.get("target", skill.get("target", ""))).strip_edges(),
		"effect": str(source.get("effect", skill.get("effect", ""))).strip_edges(),
		"attribute_effects": (source.get("attribute_effects", skill.get("attribute_effects", {})) as Dictionary).duplicate(true) if source.get("attribute_effects", skill.get("attribute_effects", {})) is Dictionary else {},
		"compatible_troops": _string_array(source.get("compatible_troops", source.get("compatibleTroops", skill.get("compatible_troops", [])))),
		"source": (source.get("source", skill.get("source", {})) as Dictionary).duplicate(true) if source.get("source", skill.get("source", {})) is Dictionary else source.get("source", skill.get("source", "")),
		"unlock_hint": str(source.get("unlock_hint", skill.get("unlock_hint", ""))).strip_edges(),
		"asset_ref": _skill_asset_ref(source) if not _skill_asset_ref(source).is_empty() else _skill_asset_ref(skill),
	}


static func _skill_library_display_entry(skill: Dictionary) -> Dictionary:
	var display := skill.duplicate(true)
	var detail := _skill_detail_read_model(skill)
	display["skill_detail"] = detail.duplicate(true)
	display["read_model"] = detail.duplicate(true)
	for key in ["id", "name", "grade", "type", "description", "trigger", "target", "effect", "source", "unlock_hint", "level", "skill_level", "skillLevel", "status", "equipped_hero_name", "equippedHeroName", "equipped_by", "equippedBy", "controller_display_name", "controllerDisplayName", "controller_name", "controllerName", "owner_display_name", "ownerDisplayName", "owner_name", "ownerName", "player_display_name", "playerDisplayName", "player_name", "playerName", "equipped_owner_name", "equippedOwnerName", "owner"]:
		var value: Variant = detail.get(key, "")
		if value is String and str(value).strip_edges() == "":
			continue
		display[key] = value
	for key in ["attribute_effects", "asset_ref"]:
		display[key] = detail.get(key, {})
	display["compatible_troops"] = detail.get("compatible_troops", [])
	return display


static func _skill_asset_ref(skill: Dictionary) -> Dictionary:
	var raw_asset_ref: Variant = skill.get("asset_ref", skill.get("assetRef", {}))
	if raw_asset_ref is Dictionary:
		return (raw_asset_ref as Dictionary).duplicate(true)
	return {}


static func _skill_controller_display_name(skill: Dictionary) -> String:
	for key in ["controller_display_name", "controllerDisplayName", "controller_name", "controllerName", "owner_display_name", "ownerDisplayName", "owner_name", "ownerName", "player_display_name", "playerDisplayName", "player_name", "playerName", "equipped_owner_name", "equippedOwnerName", "owner"]:
		var value := str(skill.get(key, "")).strip_edges()
		if value != "":
			return value
	return ""


static func _skill_library_equip_status_text(skill: Dictionary) -> String:
	var status := str(skill.get("status", "")).strip_edges()
	if status != "":
		return status
	var equipped_hero_name := str(skill.get("equipped_hero_name", skill.get("equippedHeroName", ""))).strip_edges()
	if equipped_hero_name != "":
		return "%s携带" % equipped_hero_name
	return "可装配"


static func _skill_preview_meta_text(skill: Dictionary, search_text: String = "") -> String:
	var parts: Array[String] = []
	var troops := _string_array(skill.get("compatible_troops", []))
	if not troops.is_empty():
		parts.append("兵种 " + "、".join(troops.slice(0, 3)))
	var role := str(skill.get("combat_role", "")).strip_edges()
	if role != "":
		parts.append("定位 " + role)
	if parts.is_empty():
		parts.append(_skill_type_label(skill))
	if search_text.strip_edges() != "":
		var match_line := _skill_library_search_match_line(skill, search_text)
		if match_line != "":
			parts.append(_trim_text(match_line, 16))
	return _trim_text(" · ".join(parts), 22)


static func _skill_hero_star_text(grade: String) -> String:
	match grade.to_upper():
		"S":
			return "★★★★★"
		"A":
			return "★★★★"
		_:
			return "★★★"


static func _build_skill_library_showcase_header(filtered_count: int, total_count: int, active_filter_line: String, action_callback: Callable, has_active_filter: bool) -> Control:
	var row := UI_COMPONENT_FACTORY.make_general_skill_library_showcase_header_row()
	var title_stack := UI_COMPONENT_FACTORY.make_general_skill_library_showcase_header_title_stack()
	row.add_child(title_stack)
	title_stack.add_child(_nowrap_label("通用战法库", UI_COMPONENT_FACTORY.general_skill_library_showcase_header_title_font_size(), TEXT_GOLD))
	title_stack.add_child(_label(_trim_text(active_filter_line, 36), UI_COMPONENT_FACTORY.general_skill_library_showcase_header_subtitle_font_size(), TEXT_MUTED))
	var count_panel := UI_COMPONENT_FACTORY.make_general_skill_library_showcase_header_count_panel(BORDER_ACTIVE)
	var count_margin := UI_COMPONENT_FACTORY.make_general_skill_library_showcase_header_count_margin()
	count_panel.add_child(count_margin)
	var count_column := UI_COMPONENT_FACTORY.make_general_skill_library_showcase_header_count_column()
	count_margin.add_child(count_column)
	count_column.add_child(_nowrap_label(str(filtered_count), UI_COMPONENT_FACTORY.general_skill_library_showcase_header_count_value_font_size(), TEXT_GOLD, HORIZONTAL_ALIGNMENT_CENTER))
	count_column.add_child(_nowrap_label("战法", UI_COMPONENT_FACTORY.general_skill_library_showcase_header_count_caption_font_size(), TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	row.add_child(count_panel)
	var reset_button := _filter_button("重置", has_active_filter, "skill_library_filter:reset:全部", action_callback)
	UI_COMPONENT_FACTORY.apply_general_skill_library_showcase_header_reset_button_style(reset_button)
	row.add_child(reset_button)
	return row


static func _build_skill_library_showcase_filters(filter_state: Dictionary, source_options: Array, source_scope_count: int, tag_options: Array, tag_scope_count: int, action_callback: Callable) -> Control:
	var panel := UI_COMPONENT_FACTORY.make_general_skill_library_showcase_filters_panel(BORDER_DATA)
	var margin := UI_COMPONENT_FACTORY.make_general_skill_library_showcase_filters_margin()
	panel.add_child(margin)
	var column := UI_COMPONENT_FACTORY.make_general_skill_library_showcase_filters_column()
	margin.add_child(column)
	column.add_child(_build_skill_library_filter_row("品质", "grade", ["全部", "S", "A", "B"], str(filter_state.get("grade", "全部")), action_callback))
	column.add_child(_build_skill_library_filter_row("类型", "type", ["全部", "指挥", "主动", "被动", "追击"], str(filter_state.get("type", "全部")), action_callback))
	column.add_child(_build_skill_library_filter_row("兵种", "troop", ["全部", "骑兵", "步兵", "弓兵"], str(filter_state.get("troop", "全部")), action_callback))
	var source_summary := _trim_text("来源 " + _option_summary(source_options, "source", 3), 42)
	var tag_summary := _trim_text("标签 " + _option_summary(tag_options, "tag", 4), 52)
	var hint_row := UI_COMPONENT_FACTORY.make_general_skill_library_showcase_filters_hint_row()
	column.add_child(hint_row)
	hint_row.add_child(_summary_pill(source_summary, source_scope_count > 0))
	hint_row.add_child(_summary_pill(tag_summary, tag_scope_count > 0))
	return panel


static func _build_skill_library_filter_row(title: String, field: String, options: Array, active_value: String, action_callback: Callable) -> Control:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 6)
	row.add_child(_meta_label(title, TEXT_GOLD, 42))
	for option in options:
		var value := str(option)
		row.add_child(_filter_button(value, value == active_value, "skill_library_filter:%s:%s" % [field, value], action_callback))
	return row


static func _normalize_skill_library_filter_state(filter_state: Dictionary) -> Dictionary:
	var state := filter_state if filter_state is Dictionary else {}
	return {
		"grade": "S",
		"type": str(state.get("type", "全部")).strip_edges(),
		"troop": str(state.get("troop", "全部")).strip_edges(),
		"tag": str(state.get("tag", "全部")).strip_edges(),
		"source": str(state.get("source", "全部")).strip_edges(),
		"search": str(state.get("search", "")).strip_edges(),
		"sort": str(state.get("sort", "品质")).strip_edges(),
		"source_expanded": bool(state.get("source_expanded", false)),
		"tag_expanded": bool(state.get("tag_expanded", false)),
	}


static func _skill_library_supported_tags_for_payload(library: Dictionary, skills: Array) -> Array:
	var tags := _string_array(library.get("supported_tags", []))
	if not tags.is_empty():
		return tags
	var seen := {}
	var result: Array = []
	for skill_variant in skills:
		if not (skill_variant is Dictionary):
			continue
		for tag in _string_array((skill_variant as Dictionary).get("tags", [])):
			if tag == "":
				continue
			if not seen.has(tag):
				seen[tag] = true
				result.append(tag)
	return result


static func _skill_library_entries_for_scope(skills: Array, state: Dictionary, include_tag_filter: bool, include_source_filter: bool) -> Array:
	var result: Array = []
	for skill_variant in skills:
		if not (skill_variant is Dictionary):
			continue
		var skill := skill_variant as Dictionary
		if _skill_library_entry_matches_filters(skill, state, include_tag_filter, include_source_filter):
			result.append(skill)
	return result


static func _filtered_skill_library_entries(skills: Array, state: Dictionary) -> Array:
	var result := _skill_library_entries_for_scope(skills, state, true, true)
	_sort_skill_library_results_for_payload(result, state)
	return result


static func _build_skill_library_tag_options_for_payload(skills: Array, supported_tags: Array) -> Array:
	var counts := {}
	for tag in supported_tags:
		if str(tag).strip_edges() == "":
			continue
		counts[str(tag).strip_edges()] = 0
	for skill_variant in skills:
		if not (skill_variant is Dictionary):
			continue
		var skill := skill_variant as Dictionary
		for tag in _string_array(skill.get("tags", [])):
			var normalized := str(tag).strip_edges()
			if normalized == "":
				continue
			counts[normalized] = int(counts.get(normalized, 0)) + 1
	var options: Array = []
	for tag in counts.keys():
		var count := int(counts.get(tag, 0))
		if count <= 0:
			continue
		options.append({"tag": str(tag), "count": count})
	_sort_skill_library_tag_options_for_payload(options)
	return options


static func _build_skill_library_source_options_for_payload(skills: Array) -> Array:
	var counts := {}
	for skill_variant in skills:
		if not (skill_variant is Dictionary):
			continue
		var source := _skill_library_source_label_for_payload(skill_variant as Dictionary)
		if source == "":
			continue
		counts[source] = int(counts.get(source, 0)) + 1
	var options: Array = []
	for source in counts.keys():
		options.append({"source": str(source), "count": int(counts.get(source, 0))})
	_sort_skill_library_source_options_for_payload(options)
	return options


static func _build_skill_library_type_options_for_payload(skills: Array) -> Array:
	var counts := {}
	for skill_variant in skills:
		if not (skill_variant is Dictionary):
			continue
		var type_label := _skill_type_label(skill_variant as Dictionary)
		counts[type_label] = int(counts.get(type_label, 0)) + 1
	var options: Array = []
	var canonical_types := UI_COMPONENT_FACTORY.general_skill_library_type_order()
	for type_label in canonical_types:
		var count := int(counts.get(type_label, 0))
		if count > 0:
			options.append({"type": type_label, "count": count})
	for type_label in counts.keys():
		if canonical_types.has(str(type_label)):
			continue
		var count := int(counts.get(type_label, 0))
		if count > 0:
			options.append({"type": str(type_label), "count": count})
	return options


static func _skill_library_primary_type_labels_for_payload(type_options: Array) -> Array[String]:
	var seen := {}
	var labels: Array[String] = []
	for option_variant in type_options:
		if not (option_variant is Dictionary):
			continue
		var label := str((option_variant as Dictionary).get("type", "")).strip_edges()
		if label == "" or seen.has(label):
			continue
		seen[label] = true
	for label in UI_COMPONENT_FACTORY.general_skill_library_type_order():
		if seen.has(label):
			labels.append(label)
	return labels


static func _sort_skill_library_tag_options_for_payload(options: Array) -> void:
	var item_count := options.size()
	for index in range(1, item_count):
		var current: Variant = options[index]
		var cursor := index - 1
		while cursor >= 0 and _skill_library_tag_option_before_for_payload(current, options[cursor]):
			options[cursor + 1] = options[cursor]
			cursor -= 1
		options[cursor + 1] = current


static func _sort_skill_library_source_options_for_payload(options: Array) -> void:
	var item_count := options.size()
	for index in range(1, item_count):
		var current: Variant = options[index]
		var cursor := index - 1
		while cursor >= 0 and _skill_library_source_option_before_for_payload(current, options[cursor]):
			options[cursor + 1] = options[cursor]
			cursor -= 1
		options[cursor + 1] = current


static func _skill_library_tag_option_before_for_payload(left_variant: Variant, right_variant: Variant) -> bool:
	if not (left_variant is Dictionary) or not (right_variant is Dictionary):
		return false
	var left := left_variant as Dictionary
	var right := right_variant as Dictionary
	var left_count := int(left.get("count", 0))
	var right_count := int(right.get("count", 0))
	if left_count == right_count:
		return str(left.get("tag", "")) < str(right.get("tag", ""))
	return left_count > right_count


static func _skill_library_source_option_before_for_payload(left_variant: Variant, right_variant: Variant) -> bool:
	if not (left_variant is Dictionary) or not (right_variant is Dictionary):
		return false
	var left := left_variant as Dictionary
	var right := right_variant as Dictionary
	var left_count := int(left.get("count", 0))
	var right_count := int(right.get("count", 0))
	if left_count == right_count:
		return str(left.get("source", "")) < str(right.get("source", ""))
	return left_count > right_count


static func _sort_skill_library_results_for_payload(entries: Array, state: Dictionary) -> void:
	var item_count := entries.size()
	for index in range(1, item_count):
		var current: Variant = entries[index]
		var cursor := index - 1
		while cursor >= 0 and _skill_library_result_before_for_payload(current, entries[cursor], state):
			entries[cursor + 1] = entries[cursor]
			cursor -= 1
		entries[cursor + 1] = current


static func _skill_library_result_before_for_payload(left_variant: Variant, right_variant: Variant, state: Dictionary) -> bool:
	if not (left_variant is Dictionary) or not (right_variant is Dictionary):
		return false
	var left := left_variant as Dictionary
	var right := right_variant as Dictionary
	match str(state.get("sort", "品质")):
		"名称":
			return _skill_library_compare_strings_for_payload(str(left.get("name", "")), str(right.get("name", ""))) < 0
		"类型":
			var left_type := _skill_library_type_rank_for_payload(_skill_type_label(left))
			var right_type := _skill_library_type_rank_for_payload(_skill_type_label(right))
			if left_type != right_type:
				return left_type < right_type
		"来源":
			var source_compare := _skill_library_compare_strings_for_payload(_skill_library_source_label_for_payload(left), _skill_library_source_label_for_payload(right))
			if source_compare != 0:
				return source_compare < 0
		_:
			pass
	var left_grade := _skill_library_grade_rank_for_payload(_skill_grade_label(left))
	var right_grade := _skill_library_grade_rank_for_payload(_skill_grade_label(right))
	if left_grade != right_grade:
		return left_grade < right_grade
	var left_type_rank := _skill_library_type_rank_for_payload(_skill_type_label(left))
	var right_type_rank := _skill_library_type_rank_for_payload(_skill_type_label(right))
	if left_type_rank != right_type_rank:
		return left_type_rank < right_type_rank
	return _skill_library_compare_strings_for_payload(str(left.get("name", "")), str(right.get("name", ""))) < 0


static func _skill_library_active_filter_line_for_payload(state: Dictionary) -> String:
	var parts: Array[String] = []
	if state.get("grade", "全部") != "全部":
		parts.append("品质=" + str(state.get("grade", "全部")))
	if state.get("type", "全部") != "全部":
		parts.append("类型=" + str(state.get("type", "全部")))
	if state.get("troop", "全部") != "全部":
		parts.append("兵种=" + str(state.get("troop", "全部")))
	if state.get("source", "全部") != "全部":
		parts.append("来源=" + str(state.get("source", "全部")))
	if state.get("tag", "全部") != "全部":
		parts.append("标签=" + str(state.get("tag", "全部")))
	if state.get("search", "").strip_edges() != "":
		parts.append("搜索=" + state.get("search", "").strip_edges().left(16))
	if parts.is_empty():
		return "全部通用战法"
	return " / ".join(parts)


static func _skill_library_search_summary_for_payload(filtered_entries: Array, search_text: String) -> String:
	var normalized_search := search_text.strip_edges().to_lower()
	var counts := {}
	for skill_variant in filtered_entries:
		if not (skill_variant is Dictionary):
			continue
		for label in _skill_library_search_match_labels(skill_variant as Dictionary, normalized_search):
			counts[label] = int(counts.get(label, 0)) + 1
	var order := ["名称", "描述", "效果", "来源", "兵种", "标签", "解锁", "定位", "ID"]
	var parts: Array[String] = []
	for label in order:
		var count := int(counts.get(label, 0))
		if count > 0:
			parts.append("%s×%s" % [label, str(count)])
	if parts.is_empty():
		return "无"
	return " / ".join(parts)


static func _option_summary_for_payload(options: Array, label_key: String, limit: int) -> String:
	var parts: Array[String] = []
	for option_variant in options:
		if not (option_variant is Dictionary):
			continue
		var option := option_variant as Dictionary
		var label := str(option.get(label_key, ""))
		var count := int(option.get("count", 0))
		if label == "" or count <= 0:
			continue
		parts.append("%s×%s" % [label, str(count)])
		if parts.size() >= limit:
			break
	return "无" if parts.is_empty() else " / ".join(parts)


static func _skill_library_entry_matches_filters(skill: Dictionary, state: Dictionary, include_tag_filter: bool, include_source_filter: bool) -> bool:
	if state.get("grade", "全部") != "全部" and _skill_grade_label(skill) != str(state.get("grade", "全部")):
		return false
	if state.get("type", "全部") != "全部" and _skill_type_label(skill) != str(state.get("type", "全部")):
		return false
	if state.get("troop", "全部") != "全部" and not _string_array(skill.get("compatible_troops", [])).has(str(state.get("troop", "全部"))):
		return false
	if include_source_filter and state.get("source", "全部") != "全部" and _skill_library_source_label_for_payload(skill) != str(state.get("source", "全部")):
		return false
	if include_tag_filter and state.get("tag", "全部") != "全部" and not _string_array(skill.get("tags", [])).has(str(state.get("tag", "全部"))):
		return false
	if not _skill_library_entry_matches_search(skill, state.get("search", "")):
		return false
	return true


static func _skill_library_entry_matches_search(skill: Dictionary, search_text: String) -> bool:
	var needle := search_text.strip_edges().to_lower()
	if needle == "":
		return true
	return not _skill_library_search_match_labels(skill, needle).is_empty()


static func _skill_library_source_label_for_payload(skill: Dictionary) -> String:
	var raw_source: Variant = skill.get("source", {})
	if raw_source is Dictionary:
		return str((raw_source as Dictionary).get("pool", "")).strip_edges()
	return str(raw_source).strip_edges()


static func _skill_library_compare_strings_for_payload(left: String, right: String) -> int:
	var normalized_left := left.strip_edges()
	var normalized_right := right.strip_edges()
	if normalized_left == normalized_right:
		return 0
	return -1 if normalized_left < normalized_right else 1


static func _skill_library_grade_rank_for_payload(grade: String) -> int:
	match grade:
		"S":
			return 0
		"A":
			return 1
		_:
			return 2


static func _skill_library_type_rank_for_payload(type_label: String) -> int:
	return UI_COMPONENT_FACTORY.general_skill_library_type_rank(type_label)


static func _build_skill_library_search_row(search_text: String, action_callback: Callable, search_changed_callback: Callable, search_submitted_callback: Callable) -> Control:
	var row := UI_COMPONENT_FACTORY.make_general_skill_library_search_row()
	row.add_child(_meta_label("搜索", TEXT_GOLD, UI_COMPONENT_FACTORY.general_skill_library_filter_header_title_width()))
	var input := UI_COMPONENT_FACTORY.make_general_skill_library_search_input(search_text)
	if search_changed_callback.is_valid():
		input.text_changed.connect(search_changed_callback)
	if search_submitted_callback.is_valid():
		input.text_submitted.connect(search_submitted_callback)
	row.add_child(input)
	var search_button := _filter_button("搜索", false, "skill_library_filter:search_apply:全部", action_callback)
	search_button.name = UI_COMPONENT_FACTORY.general_skill_library_search_button_node_name()
	row.add_child(search_button)
	var clear_button := _filter_button("清空", search_text != "", "skill_library_filter:search_clear:全部", action_callback)
	clear_button.name = UI_COMPONENT_FACTORY.general_skill_library_clear_button_node_name()
	row.add_child(clear_button)
	return row


static func _build_option_filter_row(title: String, field: String, active_value: String, expanded: bool, options: Array, scope_count: int, label_key: String, action_callback: Callable) -> Control:
	var panel := UI_COMPONENT_FACTORY.make_general_skill_library_filter_row_panel()
	var margin := _margin(0, 0, 0, 0)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 5)
	margin.add_child(column)
	var header := HBoxContainer.new()
	header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_theme_constant_override("separation", 6)
	column.add_child(header)
	header.add_child(_meta_label(title, TEXT_GOLD, UI_COMPONENT_FACTORY.general_skill_library_filter_header_title_width()))
	var summary := _label("当前 %s；Top %s" % [active_value, _option_summary(options, label_key, 4)], UI_COMPONENT_FACTORY.general_skill_library_filter_summary_font_size(), TEXT_MUTED)
	summary.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(summary)
	header.add_child(_filter_button("收起" if expanded else "展开", expanded, "skill_library_filter:toggle_%s:全部" % field, action_callback))
	if not expanded:
		return panel
	var flow := HFlowContainer.new()
	UI_COMPONENT_FACTORY.apply_general_skill_library_filter_option_flow_style(flow)
	if field == "tag":
		var scroll := ScrollContainer.new()
		scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		scroll.custom_minimum_size = Vector2(0, UI_COMPONENT_FACTORY.general_skill_library_filter_option_scroll_min_height())
		column.add_child(scroll)
		scroll.add_child(flow)
	else:
		column.add_child(flow)
	flow.add_child(_filter_button("全部×%s" % str(scope_count), active_value == "全部", "skill_library_filter:%s:全部" % field, action_callback))
	for option_variant in options:
		if not (option_variant is Dictionary):
			continue
		var option := option_variant as Dictionary
		var label := str(option.get(label_key, ""))
		if label == "":
			continue
		var count := int(option.get("count", 0))
		flow.add_child(_filter_button("%s×%s" % [label, str(count)], label == active_value, "skill_library_filter:%s:%s" % [field, label], action_callback))
	return panel


static func _filter_button(text: String, active: bool, action_id: String, action_callback: Callable) -> Button:
	var button := Button.new()
	button.text = text
	UI_COMPONENT_FACTORY.apply_general_skill_library_filter_button_style(button, text, active)
	button.set_meta("skill_library_filter_action_id", action_id)
	button.set_meta("skill_library_filter_live_text_contract", "skill_library_filter_live_text_v1")
	button.set_meta("skill_library_filter_live_text_label", text)
	if action_callback.is_valid():
		button.pressed.connect(action_callback.bind(action_id))
	return button


static func _meta_label(text: String, color: Color, min_width: int) -> Label:
	var label := _nowrap_label(text, 17, color, HORIZONTAL_ALIGNMENT_CENTER)
	label.custom_minimum_size = Vector2(min_width, 0)
	label.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	return label


static func _option_summary(options: Array, label_key: String, limit: int) -> String:
	var parts: Array[String] = []
	for option_variant in options:
		if not (option_variant is Dictionary):
			continue
		var option := option_variant as Dictionary
		var label := str(option.get(label_key, ""))
		var count := int(option.get("count", 0))
		if label == "" or count <= 0:
			continue
		parts.append("%s×%s" % [label, str(count)])
		if parts.size() >= limit:
			break
	return "无" if parts.is_empty() else " / ".join(parts)


static func _summary_pill(text: String, active: bool) -> Control:
	return UI_COMPONENT_FACTORY.make_general_skill_library_summary_pill(text, active)


static func _grade_badge(grade: String, type_label: String, color: Color) -> Control:
	return UI_COMPONENT_FACTORY.make_general_skill_library_badge(grade, type_label, color)


static func _body_label(text: String, size: int, color: Color, max_lines: int) -> Label:
	var label := _label(text, size, color)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	if max_lines > 0:
		label.max_lines_visible = max_lines
	return label


static func _first_skill_or_empty(filtered_entries: Array) -> Dictionary:
	for skill_variant in filtered_entries:
		if skill_variant is Dictionary:
			return skill_variant as Dictionary
	return {}


static func _feature_chips(skill: Dictionary, summary_payload: Dictionary, search_text: String) -> Array[String]:
	var chips: Array[String] = []
	var troops := _string_array(skill.get("compatible_troops", []))
	if not troops.is_empty():
		chips.append("兵种 " + " / ".join(troops.slice(0, 3)))
	var role := str(skill.get("combat_role", "")).strip_edges()
	if role != "":
		chips.append(role)
	var tags := _string_array(skill.get("tags", []))
	if not tags.is_empty():
		chips.append("标签 " + " / ".join(tags.slice(0, 3)))
	if search_text != "":
		var search_summary := str(summary_payload.get("search_summary", "")).strip_edges()
		if search_summary != "":
			chips.append(_trim_text(search_summary, 18))
	return chips


static func _skill_effect_line(skill: Dictionary) -> String:
	var parts: Array[String] = []
	for key in ["trigger", "target", "effect"]:
		var value := str(skill.get(key, "")).strip_edges()
		if value != "":
			parts.append(value)
	var attribute_effects := _format_skill_attribute_effects(skill.get("attribute_effects", {}))
	if attribute_effects != "":
		parts.append(attribute_effects)
	return " / ".join(parts)


static func _trim_text(text: String, limit: int) -> String:
	var value := text.strip_edges()
	if limit <= 0 or value.length() <= limit:
		return value
	return value.left(limit - 1) + "…"


static func _skill_library_search_match_line(skill: Dictionary, search_text: String) -> String:
	var labels := _skill_library_search_match_labels(skill, search_text)
	if labels.is_empty():
		return ""
	return "搜索命中：" + " / ".join(labels)


static func _skill_library_search_match_labels(skill: Dictionary, search_text: String) -> Array[String]:
	var needle := search_text.strip_edges().to_lower()
	var labels: Array[String] = []
	if needle == "":
		return labels
	if _text_matches(str(skill.get("name", "")), needle):
		labels.append("名称")
	if _text_matches(str(skill.get("description", "")), needle):
		labels.append("描述")
	var effect_text := " ".join([
		str(skill.get("trigger", "")),
		str(skill.get("target", "")),
		str(skill.get("effect", "")),
		_format_skill_attribute_effects(skill.get("attribute_effects", {})),
	])
	if _text_matches(effect_text, needle):
		labels.append("效果")
	if _text_matches(_skill_library_source_search_text(skill), needle):
		labels.append("来源")
	if _text_matches(" ".join(_string_array(skill.get("compatible_troops", []))), needle):
		labels.append("兵种")
	if _text_matches(" ".join(_string_array(skill.get("tags", []))), needle):
		labels.append("标签")
	if _text_matches(str(skill.get("unlock_hint", "")), needle):
		labels.append("解锁")
	if _text_matches(str(skill.get("combat_role", "")), needle):
		labels.append("定位")
	if _text_matches(str(skill.get("id", "")), needle):
		labels.append("ID")
	return labels


static func _skill_library_source_search_text(skill: Dictionary) -> String:
	var raw_source: Variant = skill.get("source", {})
	if raw_source is Dictionary:
		var source_parts: Array[String] = []
		for key in (raw_source as Dictionary).keys():
			source_parts.append(str(key))
			source_parts.append(str((raw_source as Dictionary).get(key, "")))
		return " ".join(source_parts)
	return str(raw_source)


static func _text_matches(text: String, needle: String) -> bool:
	return text.to_lower().find(needle) >= 0


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


static func _array(raw_value: Variant) -> Array:
	return raw_value as Array if raw_value is Array else []


static func _string_array(raw_value: Variant) -> Array:
	var result: Array = []
	if not (raw_value is Array):
		return result
	for item in raw_value as Array:
		var text := str(item).strip_edges()
		if text != "":
			result.append(text)
	return result


static func _callable(config: Dictionary, key: String) -> Callable:
	var raw_value: Variant = config.get(key, Callable())
	return raw_value as Callable if raw_value is Callable else Callable()


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
