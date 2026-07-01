extends RefCounted
class_name GeneralRosterPreviewRenderer

const BG_PANEL_ALT := Color(0.080, 0.072, 0.060, 0.58)
const BORDER := Color(0.42, 0.34, 0.18, 0.52)
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")

static func build_roster_preview_panel(entry: Dictionary, section_builders: Dictionary) -> Control:
	var panel := UI_COMPONENT_FACTORY.make_panel(BG_PANEL_ALT, BORDER, 5)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(430, 540)
	var margin := UI_COMPONENT_FACTORY.make_margin(14, 14, 14, 14)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)
	_add_builder_child(column, section_builders, "build_detail_header", [entry, false])
	_add_builder_child(column, section_builders, "build_compact_stat_grid", [entry])
	_add_builder_child(column, section_builders, "build_skill_block", [entry])
	_add_builder_child(column, section_builders, "build_troop_block", [entry])
	_add_builder_child(column, section_builders, "build_action_row", [entry])
	return panel

static func _add_builder_child(parent: Control, section_builders: Dictionary, key: String, args: Array) -> void:
	var raw_builder: Variant = section_builders.get(key, Callable())
	if not (raw_builder is Callable):
		return
	var builder := raw_builder as Callable
	if not builder.is_valid():
		return
	var child: Variant = builder.callv(args)
	if child is Control:
		parent.add_child(child as Control)
