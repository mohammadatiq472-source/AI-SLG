extends RefCounted
class_name GeneralProfileDetailStackRenderer


static func build_profile_detail_stack(entry: Dictionary, page_id: String, section_builders: Dictionary) -> Control:
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 9)
	_add_builder_child(column, section_builders, "build_profile_tab_strip", [page_id])
	_add_builder_child(column, section_builders, "build_detail_header", [entry, true])
	if page_id == "tactics":
		_add_builder_child(column, section_builders, "build_point_panel", [entry])
	elif page_id == "library":
		var browser := _build_child(section_builders, "build_skill_library_browser", [])
		if browser != null:
			browser.size_flags_vertical = Control.SIZE_EXPAND_FILL
			column.add_child(browser)
	elif page_id == "growth":
		var troop_block := _build_child(section_builders, "build_troop_block", [entry])
		if troop_block != null:
			troop_block.size_flags_vertical = Control.SIZE_EXPAND_FILL
			column.add_child(troop_block)
	else:
		_add_builder_child(column, section_builders, "build_attribute_overview_panel", [entry])
		_add_builder_child(column, section_builders, "build_skill_block", [entry])
	return column


static func _add_builder_child(parent: Control, section_builders: Dictionary, key: String, args: Array) -> void:
	var child := _build_child(section_builders, key, args)
	if child != null:
		parent.add_child(child)


static func _build_child(section_builders: Dictionary, key: String, args: Array) -> Control:
	var raw_builder: Variant = section_builders.get(key, Callable())
	if not (raw_builder is Callable):
		return null
	var builder := raw_builder as Callable
	if not builder.is_valid():
		return null
	var child: Variant = builder.callv(args)
	return child as Control if child is Control else null
