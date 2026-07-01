extends PanelContainer
class_name BuildingTreeView

signal building_selected(building_id: String)

const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")

@export var item_button_min_width: float = 168.0
@export var item_button_text_size: int = 13

const DEFAULT_TREE_TITLE := "建筑树"
const DEFAULT_STATE_BADGE_TEXT := "建筑树"
const DEFAULT_EMPTY_STATE_TEXT := "请选择一个设施或建筑项后加载建筑树。"
const DEFAULT_DETAIL_PLACEHOLDER := {
	"name": "建筑详情",
	"meta": "等待选择",
	"body": "等待建筑详情。",
	"cost": "消耗：--",
	"effect": "效果：--",
}
const TREE_LAYOUT_HORIZONTAL := "horizontal"
const TREE_LAYOUT_VERTICAL_NORTH_SOUTH := "vertical_north_south"
const TREE_VISUAL_PLATFORM_ANCHOR := "background_platform_anchor_v1"
const TREE_VISUAL_LINE_GRAPH := "line_graph_asset_nodes_v1"

@onready var _header_row: HBoxContainer = $BodyMargin/BodyVBox/HeaderRow
@onready var _title_label: Label = $BodyMargin/BodyVBox/HeaderRow/TitleLabel
@onready var _state_badge: Label = $BodyMargin/BodyVBox/HeaderRow/StateBadge
@onready var _empty_state_label: Label = $BodyMargin/BodyVBox/EmptyHintLabel
@onready var _content_split: HBoxContainer = $BodyMargin/BodyVBox/ContentSplit
@onready var _list_scroll: ScrollContainer = $BodyMargin/BodyVBox/ContentSplit/ListScroll
@onready var _list_container: VBoxContainer = $BodyMargin/BodyVBox/ContentSplit/ListScroll/ListVBox
@onready var _detail_panel: PanelContainer = $BodyMargin/BodyVBox/ContentSplit/DetailPanel
@onready var _detail_name_label: Label = $BodyMargin/BodyVBox/ContentSplit/DetailPanel/DetailMargin/DetailVBox/DetailName
@onready var _detail_meta_label: Label = $BodyMargin/BodyVBox/ContentSplit/DetailPanel/DetailMargin/DetailVBox/DetailMeta
@onready var _detail_body_label: Label = $BodyMargin/BodyVBox/ContentSplit/DetailPanel/DetailMargin/DetailVBox/DetailBody
@onready var _detail_cost_label: Label = $BodyMargin/BodyVBox/ContentSplit/DetailPanel/DetailMargin/DetailVBox/DetailCost
@onready var _detail_effect_label: Label = $BodyMargin/BodyVBox/ContentSplit/DetailPanel/DetailMargin/DetailVBox/DetailEffect

var _tree_items: Array = []
var _item_buttons: Dictionary = {}
var _item_button_labels: Dictionary = {}
var _selected_building_id: String = ""
var _button_group: ButtonGroup = ButtonGroup.new()
var _tree_title: String = DEFAULT_TREE_TITLE
var _state_badge_text: String = DEFAULT_STATE_BADGE_TEXT
var _empty_state_text: String = DEFAULT_EMPTY_STATE_TEXT
var _detail_placeholder: Dictionary = DEFAULT_DETAIL_PLACEHOLDER.duplicate(true)
var _detail_panel_visible: bool = true
var _title_visible: bool = true
var _auto_select_first: bool = true
var _tree_layout_mode: String = TREE_LAYOUT_HORIZONTAL
var _tree_visual_mode: String = TREE_VISUAL_PLATFORM_ANCHOR
var _background_texture_path: String = ""
var _background_opacity_percent: int = 0
var _is_ready: bool = false

func _ready() -> void:
	_is_ready = true
	_apply_reference_style()
	_refresh_static_copy()
	_rebuild_items()

func set_tree_contract(tree_contract: Dictionary) -> void:
	_tree_title = str(tree_contract.get("title", DEFAULT_TREE_TITLE)).strip_edges()
	_state_badge_text = str(tree_contract.get("state_badge", DEFAULT_STATE_BADGE_TEXT)).strip_edges()
	_empty_state_text = str(tree_contract.get("empty_state_text", DEFAULT_EMPTY_STATE_TEXT)).strip_edges()
	_detail_panel_visible = bool(tree_contract.get("detail_panel_visible", true))
	_title_visible = bool(tree_contract.get("title_visible", true))
	_auto_select_first = bool(tree_contract.get("auto_select_first", true))
	_tree_layout_mode = _normalize_tree_layout_mode(
		str(tree_contract.get("layout_mode", tree_contract.get("orientation", TREE_LAYOUT_HORIZONTAL))).strip_edges()
	)
	_tree_visual_mode = str(tree_contract.get("visual_mode", TREE_VISUAL_PLATFORM_ANCHOR)).strip_edges().to_lower()
	if _tree_visual_mode == "":
		_tree_visual_mode = TREE_VISUAL_PLATFORM_ANCHOR
	_background_texture_path = str(tree_contract.get("background_texture_path", "")).strip_edges()
	_background_opacity_percent = int(tree_contract.get(
		"background_opacity_percent",
		UI_COMPONENT_FACTORY.main_city_facility_tree_background_opacity_percent()
	))
	_detail_placeholder = DEFAULT_DETAIL_PLACEHOLDER.duplicate(true)
	var detail_placeholder_variant: Variant = tree_contract.get("detail_placeholder", {})
	if detail_placeholder_variant is Dictionary:
		var detail_placeholder_payload := detail_placeholder_variant as Dictionary
		for key_variant in DEFAULT_DETAIL_PLACEHOLDER.keys():
			var key := str(key_variant)
			var value := str(detail_placeholder_payload.get(key, _detail_placeholder.get(key, ""))).strip_edges()
			if value != "":
				_detail_placeholder[key] = value
	if _is_ready:
		_apply_reference_style()
		_refresh_static_copy()
		_apply_detail_panel_visibility()
	var tree_items_variant: Variant = tree_contract.get("tree_items", [])
	if tree_items_variant is Array:
		set_tree_items(tree_items_variant as Array)
	var selected_building_id := str(tree_contract.get("selected_building_id", "")).strip_edges()
	if selected_building_id != "":
		if _is_ready:
			set_selected_building(selected_building_id)
		else:
			_selected_building_id = selected_building_id

func set_tree_items(tree_items: Array) -> void:
	_tree_items = tree_items.duplicate(true)
	if _is_ready:
		_rebuild_items()

func clear_tree() -> void:
	_tree_items = []
	_selected_building_id = ""
	if _is_ready:
		_rebuild_items()

func get_selected_building_id() -> String:
	return _selected_building_id

func set_selected_building(building_id: String) -> void:
	if not _is_ready:
		_selected_building_id = building_id
		return
	if building_id.is_empty() or not _item_buttons.has(building_id):
		return
	_selected_building_id = building_id
	for item_id in _item_buttons.keys():
		var button := _item_buttons[item_id] as Button
		if button != null:
			button.button_pressed = item_id == _selected_building_id
			_refresh_item_button_state(str(item_id), button, button.button_pressed, not button.disabled)
	_refresh_detail_for_selected()

func has_tree_items() -> bool:
	return not _item_buttons.is_empty()

func _refresh_static_copy() -> void:
	if not _is_ready or _title_label == null:
		return
	_title_label.text = _tree_title if _tree_title != "" else DEFAULT_TREE_TITLE
	_title_label.visible = _title_visible
	_state_badge.text = _state_badge_text if _state_badge_text != "" else DEFAULT_STATE_BADGE_TEXT
	_state_badge.visible = _state_badge_text != ""
	if _header_row != null:
		_header_row.visible = _title_visible or _state_badge_text != ""
	_empty_state_label.text = _empty_state_text if _empty_state_text != "" else DEFAULT_EMPTY_STATE_TEXT
	UI_COMPONENT_FACTORY.apply_interior_building_tree_title_style(_title_label)
	UI_COMPONENT_FACTORY.apply_interior_building_tree_badge_style(_state_badge)
	_refresh_detail_placeholder()


func _apply_reference_style() -> void:
	if _tree_layout_mode == TREE_LAYOUT_VERTICAL_NORTH_SOUTH:
		UI_COMPONENT_FACTORY.apply_main_city_facility_tree_atmosphere_panel_style(self)
	else:
		UI_COMPONENT_FACTORY.apply_interior_building_tree_panel_style(self)
	UI_COMPONENT_FACTORY.apply_interior_building_tree_scroll_style(_list_scroll)
	UI_COMPONENT_FACTORY.apply_interior_building_tree_list_style(_list_container)
	UI_COMPONENT_FACTORY.apply_interior_building_tree_detail_panel_style(_detail_panel)
	_apply_detail_panel_visibility()
	if _content_split != null:
		_content_split.add_theme_constant_override("separation", 0)


func _normalize_tree_layout_mode(layout_mode: String) -> String:
	var normalized := layout_mode.strip_edges().to_lower()
	match normalized:
		"vertical", "north_south", "vertical_north_south":
			return TREE_LAYOUT_VERTICAL_NORTH_SOUTH
		_:
			return TREE_LAYOUT_HORIZONTAL

func _apply_detail_panel_visibility() -> void:
	if _detail_panel == null:
		return
	_detail_panel.visible = _detail_panel_visible

func _refresh_detail_placeholder() -> void:
	if not _is_ready or _detail_name_label == null:
		return
	_detail_name_label.text = str(_detail_placeholder.get("name", DEFAULT_DETAIL_PLACEHOLDER.name))
	_detail_meta_label.text = str(_detail_placeholder.get("meta", DEFAULT_DETAIL_PLACEHOLDER.meta))
	_detail_body_label.text = str(_detail_placeholder.get("body", DEFAULT_DETAIL_PLACEHOLDER.body))
	_detail_cost_label.text = str(_detail_placeholder.get("cost", DEFAULT_DETAIL_PLACEHOLDER.cost))
	_detail_effect_label.text = str(_detail_placeholder.get("effect", DEFAULT_DETAIL_PLACEHOLDER.effect))

func _clear_item_buttons() -> void:
	if not _is_ready or _list_container == null:
		return
	for child in _list_container.get_children():
		child.queue_free()
	_item_buttons.clear()
	_item_button_labels.clear()

func _rebuild_items() -> void:
	if not _is_ready or _list_container == null:
		return
	_clear_item_buttons()
	_button_group = ButtonGroup.new()
	var valid_items: Array = []
	for raw_item in _tree_items:
		var item: Dictionary = raw_item if raw_item is Dictionary else {}
		var building_id := str(item.get("id", "")).strip_edges()
		if building_id.is_empty():
			continue
		valid_items.append(item)
	if not valid_items.is_empty():
		if _tree_layout_mode == TREE_LAYOUT_VERTICAL_NORTH_SOUTH:
			_rebuild_vertical_tree(valid_items)
		else:
			_rebuild_horizontal_tree(valid_items)
	var has_items := not _item_buttons.is_empty()
	_empty_state_label.visible = not has_items
	_list_container.visible = has_items
	if _auto_select_first and has_items and (_selected_building_id.is_empty() or not _item_buttons.has(_selected_building_id)):
		_selected_building_id = str((valid_items[0] as Dictionary).get("id", ""))
	if _selected_building_id != "":
		set_selected_building(_selected_building_id)
	if not has_items:
		_refresh_detail_placeholder()


func _rebuild_horizontal_tree(valid_items: Array) -> void:
	var canvas := HBoxContainer.new()
	canvas.name = "BuildingTreeHorizontalCanvas"
	canvas.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	canvas.size_flags_vertical = Control.SIZE_EXPAND_FILL
	canvas.alignment = BoxContainer.ALIGNMENT_CENTER
	canvas.add_theme_constant_override("separation", UI_COMPONENT_FACTORY.interior_building_tree_column_separation())
	_list_container.add_child(canvas)
	var root_item := valid_items[0] as Dictionary
	var root_building_id := str(root_item.get("id", "")).strip_edges()
	var root_button := _create_item_button(root_item)
	_item_buttons[root_building_id] = root_button
	var root_column := _make_node_column(0)
	root_column.add_child(root_button)
	canvas.add_child(root_column)
	var column_count := UI_COMPONENT_FACTORY.interior_building_tree_column_count()
	var item_index := 1
	var column_index := 1
	while item_index < valid_items.size():
		canvas.add_child(_make_connector_column(column_index))
		var column := _make_node_column(column_index)
		for row_index in range(column_count):
			var current_index := item_index + row_index
			if current_index >= valid_items.size():
				column.add_child(_make_node_column_spacer())
				continue
			var item := valid_items[current_index] as Dictionary
			var building_id := str(item.get("id", "")).strip_edges()
			var button := _create_item_button(item)
			_item_buttons[building_id] = button
			column.add_child(button)
		canvas.add_child(column)
		item_index += column_count
		column_index += 1


func _rebuild_vertical_tree(valid_items: Array) -> void:
	var canvas := Control.new()
	canvas.name = "BuildingTreeVerticalScrollStage"
	UI_COMPONENT_FACTORY.apply_main_city_facility_tree_scroll_stage_style(canvas)
	_list_container.add_child(canvas)
	var background := _make_vertical_stage_background()
	if background != null:
		canvas.add_child(background)
	var tiers := _group_items_by_tier(valid_items)
	var row_positions := _main_city_facility_tree_row_positions(tiers.size())
	if _is_line_graph_visual_mode():
		_add_line_graph_backdrop(canvas)
		_add_line_graph_tier_axis(canvas, row_positions, tiers.size())
		_add_line_graph_connectors(canvas, tiers, row_positions)
	else:
		_add_vertical_stage_connectors(canvas, tiers, row_positions)
	for tier_index in range(tiers.size()):
		var tier_items: Array = tiers[tier_index]
		var row_y := float(row_positions[min(tier_index, row_positions.size() - 1)])
		var node_positions := _main_city_facility_tree_node_positions(tier_items.size())
		for item_variant in tier_items:
			var item := item_variant as Dictionary
			var building_id := str(item.get("id", "")).strip_edges()
			var button := _create_item_button(item)
			_item_buttons[building_id] = button
			var slot := clampi(int(item.get("treeSlot", 0)), 0, max(tier_items.size() - 1, 0))
			var anchor_x := float(item.get("treeAnchorX", node_positions[min(slot, node_positions.size() - 1)]))
			var anchor_y := float(item.get("treeAnchorY", row_y))
			var anchor_mode := str(item.get("treeAnchorMode", "center")).strip_edges().to_lower()
			var baseline_ratio := clampf(
				float(item.get("treeBaselineRatio", UI_COMPONENT_FACTORY.main_city_facility_tree_node_baseline_ratio())),
				0.25,
				1.20
			)
			var top_offset := button.custom_minimum_size.y / 2.0
			if anchor_mode == "baseline":
				top_offset = button.custom_minimum_size.y * baseline_ratio
			button.position = Vector2(anchor_x - button.custom_minimum_size.x / 2.0, anchor_y - top_offset)
			button.size = button.custom_minimum_size
			canvas.add_child(button)


func _is_line_graph_visual_mode() -> bool:
	return _tree_visual_mode == TREE_VISUAL_LINE_GRAPH


func _group_items_by_tier(valid_items: Array) -> Array:
	var tier_map: Dictionary = {}
	var fallback_index := 0
	for item_variant in valid_items:
		var item := item_variant as Dictionary
		var tier := int(item.get("treeTier", fallback_index / 3))
		if not tier_map.has(tier):
			tier_map[tier] = []
		var tier_items: Array = tier_map[tier] as Array
		tier_items.append(item)
		fallback_index += 1
	var tier_keys := tier_map.keys()
	tier_keys.sort()
	var tiers: Array = []
	for tier_key in tier_keys:
		var tier_items: Array = tier_map[tier_key] as Array
		tier_items.sort_custom(func(left: Dictionary, right: Dictionary) -> bool:
			return int(left.get("treeSlot", 0)) < int(right.get("treeSlot", 0))
		)
		tiers.append(tier_items)
	return tiers


func _make_vertical_stage_background() -> TextureRect:
	var normalized_path := _background_texture_path.strip_edges()
	if normalized_path == "":
		return null
	var image_resource := Image.new()
	var texture: Texture2D = null
	if image_resource.load(normalized_path) == OK:
		texture = ImageTexture.create_from_image(image_resource)
	if texture == null:
		var texture_variant: Variant = load(normalized_path)
		texture = texture_variant as Texture2D
	if texture == null:
		return null
	var background := TextureRect.new()
	background.name = "BuildingTreeVerticalStageBackground"
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	background.texture = texture
	background.position = Vector2.ZERO
	background.size = Vector2(
		UI_COMPONENT_FACTORY.main_city_facility_tree_scroll_stage_width(),
		UI_COMPONENT_FACTORY.main_city_facility_tree_scroll_stage_height()
	)
	background.custom_minimum_size = background.size
	UI_COMPONENT_FACTORY.apply_main_city_facility_tree_scroll_background_style(background, _background_opacity_percent)
	return background


func _add_line_graph_backdrop(canvas: Control) -> void:
	if canvas == null:
		return
	var backdrop := ColorRect.new()
	backdrop.name = "BuildingTreeLineGraphBackdrop"
	backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
	backdrop.position = Vector2.ZERO
	UI_COMPONENT_FACTORY.apply_main_city_facility_tree_line_graph_backdrop_style(backdrop)
	backdrop.size = backdrop.custom_minimum_size
	canvas.add_child(backdrop)


func _add_line_graph_tier_axis(canvas: Control, row_positions: PackedFloat32Array, tier_count: int) -> void:
	if canvas == null or tier_count <= 0:
		return
	var axis_x := 164.0
	var top_y := maxf(24.0, float(row_positions[0]) - 94.0)
	var bottom_y := minf(
		UI_COMPONENT_FACTORY.main_city_facility_tree_scroll_stage_height() - 22.0,
		float(row_positions[min(tier_count - 1, row_positions.size() - 1)]) + 120.0
	)
	_add_line_graph_line(canvas, Vector2(axis_x, top_y), Vector2(axis_x, bottom_y), "axis")
	var tier_names := PackedStringArray(["壹", "贰", "叁", "肆", "伍", "陆", "柒"])
	for tier_index in range(tier_count):
		var row_y := float(row_positions[min(tier_index, row_positions.size() - 1)])
		var tier_label := Label.new()
		tier_label.name = "LineGraphTierAxis_%d" % tier_index
		tier_label.text = tier_names[tier_index] if tier_index < tier_names.size() else str(tier_index + 1)
		tier_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		tier_label.position = Vector2(axis_x - 22.0, row_y - 18.0)
		tier_label.custom_minimum_size = Vector2(42.0, 36.0)
		tier_label.add_theme_font_size_override("font_size", 20)
		tier_label.add_theme_color_override("font_color", Color(0.82, 0.78, 0.66, 0.82))
		tier_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		tier_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		canvas.add_child(tier_label)


func _add_line_graph_connectors(canvas: Control, tiers: Array, row_positions: PackedFloat32Array) -> void:
	if canvas == null or tiers.is_empty():
		return
	var line_left := 176.0
	var line_right := UI_COMPONENT_FACTORY.main_city_facility_tree_scroll_stage_width() - 104.0
	for tier_index in range(tiers.size()):
		var row_y := float(row_positions[min(tier_index, row_positions.size() - 1)])
		_add_line_graph_line(canvas, Vector2(line_left, row_y), Vector2(line_right, row_y), "major")
	for tier_index in range(tiers.size() - 1):
		var parent_centers := _line_graph_centers_for_tier(tiers[tier_index] as Array, row_positions, tier_index)
		var child_centers := _line_graph_centers_for_tier(tiers[tier_index + 1] as Array, row_positions, tier_index + 1)
		if parent_centers.is_empty() or child_centers.is_empty():
			continue
		var source_x := _average_vector_x(parent_centers)
		var parent_y := float(row_positions[min(tier_index, row_positions.size() - 1)])
		var child_y := float(row_positions[min(tier_index + 1, row_positions.size() - 1)])
		var child_min_x := _min_vector_x(child_centers)
		var child_max_x := _max_vector_x(child_centers)
		var branch_y := (parent_y + child_y) / 2.0
		_add_line_graph_line(canvas, Vector2(source_x, parent_y), Vector2(source_x, branch_y), "vertical")
		_add_line_graph_line(canvas, Vector2(child_min_x, branch_y), Vector2(child_max_x, branch_y), "minor")
		for child_center in child_centers:
			_add_line_graph_line(canvas, Vector2(child_center.x, branch_y), Vector2(child_center.x, child_y), "vertical")


func _line_graph_centers_for_tier(tier_items: Array, row_positions: PackedFloat32Array, tier_index: int) -> Array:
	var centers: Array = []
	var fallback_positions := _main_city_facility_tree_node_positions(tier_items.size())
	var row_y := float(row_positions[min(tier_index, row_positions.size() - 1)])
	for item_index in range(tier_items.size()):
		var item := tier_items[item_index] as Dictionary
		var fallback_x := float(fallback_positions[min(item_index, fallback_positions.size() - 1)])
		centers.append(Vector2(float(item.get("treeAnchorX", fallback_x)), float(item.get("treeAnchorY", row_y))))
	return centers


func _average_vector_x(points: Array) -> float:
	if points.is_empty():
		return UI_COMPONENT_FACTORY.main_city_facility_tree_scroll_stage_width() / 2.0
	var total := 0.0
	for point_variant in points:
		var point := point_variant as Vector2
		total += point.x
	return total / float(points.size())


func _min_vector_x(points: Array) -> float:
	if points.is_empty():
		return UI_COMPONENT_FACTORY.main_city_facility_tree_scroll_stage_width() / 2.0
	var first_point := points[0] as Vector2
	var result := first_point.x
	for point_variant in points:
		var point := point_variant as Vector2
		result = minf(result, point.x)
	return result


func _max_vector_x(points: Array) -> float:
	if points.is_empty():
		return UI_COMPONENT_FACTORY.main_city_facility_tree_scroll_stage_width() / 2.0
	var first_point := points[0] as Vector2
	var result := first_point.x
	for point_variant in points:
		var point := point_variant as Vector2
		result = maxf(result, point.x)
	return result


func _add_line_graph_line(canvas: Control, from_point: Vector2, to_point: Vector2, role: String) -> void:
	var line := ColorRect.new()
	line.name = "LineGraph%sConnector" % role.capitalize()
	line.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if absf(from_point.x - to_point.x) >= absf(from_point.y - to_point.y):
		line.position = Vector2(minf(from_point.x, to_point.x), from_point.y)
		UI_COMPONENT_FACTORY.apply_main_city_facility_tree_line_graph_connector_style(line, role, absf(from_point.x - to_point.x))
	else:
		line.position = Vector2(from_point.x, minf(from_point.y, to_point.y))
		UI_COMPONENT_FACTORY.apply_main_city_facility_tree_line_graph_connector_style(line, "vertical" if role != "axis" else "axis", absf(from_point.y - to_point.y))
	line.size = line.custom_minimum_size
	canvas.add_child(line)


func _main_city_facility_tree_row_positions(tier_count: int) -> PackedFloat32Array:
	var stage_height := UI_COMPONENT_FACTORY.main_city_facility_tree_scroll_stage_height()
	var positions := PackedFloat32Array()
	var first_row := 150.0
	var row_rhythm := float(UI_COMPONENT_FACTORY.main_city_facility_tree_row_rhythm_px())
	for index in range(tier_count):
		positions.append(minf(first_row + row_rhythm * float(index), stage_height - 110.0 + float(max(index - 4, 0)) * row_rhythm))
	return positions


func _main_city_facility_tree_node_positions(node_count: int) -> PackedFloat32Array:
	var stage_width := UI_COMPONENT_FACTORY.main_city_facility_tree_scroll_stage_width()
	var center := stage_width / 2.0
	match node_count:
		1:
			return PackedFloat32Array([center])
		2:
			return PackedFloat32Array([center - 180.0, center + 180.0])
		3:
			return PackedFloat32Array([center - 300.0, center, center + 300.0])
		4:
			return PackedFloat32Array([center - 430.0, center - 145.0, center + 145.0, center + 430.0])
		5:
			return PackedFloat32Array([center - 520.0, center - 260.0, center, center + 260.0, center + 520.0])
		_:
			var positions := PackedFloat32Array()
			var separation := minf(235.0, maxf(150.0, (stage_width - 220.0) / maxf(float(node_count - 1), 1.0)))
			var first := center - separation * float(node_count - 1) / 2.0
			for index in range(node_count):
				positions.append(first + separation * float(index))
			return positions


func _add_vertical_stage_connectors(canvas: Control, tiers: Array, row_positions: PackedFloat32Array) -> void:
	if canvas == null or tiers.size() < 2:
		return
	for tier_index in range(tiers.size() - 1):
		var parent_items: Array = tiers[tier_index]
		var child_items: Array = tiers[tier_index + 1]
		if parent_items.is_empty() or child_items.is_empty():
			continue
		var parent_positions := _main_city_facility_tree_node_positions(parent_items.size())
		var child_positions := _main_city_facility_tree_node_positions(child_items.size())
		var source_x := _average_positions(parent_positions)
		var child_min_x := _min_position(child_positions)
		var child_max_x := _max_position(child_positions)
		var source_y := float(row_positions[tier_index]) + UI_COMPONENT_FACTORY.main_city_facility_tree_asset_node_min_height() / 2.0 - 10.0
		var branch_y := (float(row_positions[tier_index]) + float(row_positions[tier_index + 1])) / 2.0
		var child_y := float(row_positions[tier_index + 1]) - UI_COMPONENT_FACTORY.main_city_facility_tree_asset_node_min_height() / 2.0 + 10.0
		_add_stage_line(canvas, Vector2(source_x, source_y), Vector2(source_x, branch_y), "vertical")
		_add_stage_line(canvas, Vector2(child_min_x, branch_y), Vector2(child_max_x, branch_y), "horizontal")
		for child_x in child_positions:
			_add_stage_line(canvas, Vector2(float(child_x), branch_y), Vector2(float(child_x), child_y), "vertical")


func _average_positions(positions: PackedFloat32Array) -> float:
	if positions.size() == 0:
		return UI_COMPONENT_FACTORY.main_city_facility_tree_scroll_stage_width() / 2.0
	var total := 0.0
	for position_value in positions:
		total += float(position_value)
	return total / float(positions.size())


func _min_position(positions: PackedFloat32Array) -> float:
	if positions.size() == 0:
		return UI_COMPONENT_FACTORY.main_city_facility_tree_scroll_stage_width() / 2.0
	var result := float(positions[0])
	for position_value in positions:
		result = minf(result, float(position_value))
	return result


func _max_position(positions: PackedFloat32Array) -> float:
	if positions.size() == 0:
		return UI_COMPONENT_FACTORY.main_city_facility_tree_scroll_stage_width() / 2.0
	var result := float(positions[0])
	for position_value in positions:
		result = maxf(result, float(position_value))
	return result


func _add_stage_line(canvas: Control, from_point: Vector2, to_point: Vector2, role: String) -> void:
	var line := ColorRect.new()
	line.name = "Connector%sLayer" % role.capitalize()
	line.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if absf(from_point.x - to_point.x) >= absf(from_point.y - to_point.y):
		line.position = Vector2(minf(from_point.x, to_point.x), from_point.y)
		UI_COMPONENT_FACTORY.apply_main_city_facility_tree_vertical_connector_layer_style(line, "horizontal", absf(from_point.x - to_point.x))
	else:
		line.position = Vector2(from_point.x, minf(from_point.y, to_point.y))
		UI_COMPONENT_FACTORY.apply_main_city_facility_tree_vertical_connector_layer_style(line, "vertical")
		line.custom_minimum_size.y = absf(from_point.y - to_point.y)
	line.size = line.custom_minimum_size
	canvas.add_child(line)


func _make_vertical_connector_row(tier_index: int, next_node_count: int) -> Control:
	var stack := VBoxContainer.new()
	stack.name = "BuildingTreeVerticalConnector_%d" % tier_index
	stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stack.alignment = BoxContainer.ALIGNMENT_CENTER
	stack.add_theme_constant_override("separation", 4)
	var vertical_line := ColorRect.new()
	vertical_line.name = "ConnectorVerticalLayer"
	vertical_line.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	UI_COMPONENT_FACTORY.apply_main_city_facility_tree_vertical_connector_layer_style(vertical_line, "vertical")
	stack.add_child(vertical_line)
	if next_node_count > 1:
		var branch_line := ColorRect.new()
		branch_line.name = "ConnectorBranchLayer"
		branch_line.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		var branch_width: float = (
			UI_COMPONENT_FACTORY.main_city_facility_tree_asset_node_min_width() * next_node_count
			+ UI_COMPONENT_FACTORY.main_city_facility_tree_vertical_row_separation() * max(next_node_count - 1, 0)
		)
		UI_COMPONENT_FACTORY.apply_main_city_facility_tree_vertical_connector_layer_style(branch_line, "horizontal", branch_width)
		stack.add_child(branch_line)
	return stack

func _create_item_button(item: Dictionary) -> Button:
	var building_id := str(item.get("id", "")).strip_edges()
	var label_text := str(item.get("label", building_id))
	var level_text := str(item.get("levelText", item.get("level", "")))
	var status_text := str(item.get("statusText", item.get("status", "")))
	var icon_text := str(item.get("iconText", item.get("icon", ""))).strip_edges()
	var icon_texture_path := str(item.get("iconTexturePath", item.get("iconPath", ""))).strip_edges()
	var description_text := str(item.get("description", ""))
	var enabled := bool(item.get("enabled", true))
	var selected := bool(item.get("selected", false))
	var node_state := _normalize_main_city_facility_tree_node_state(item, enabled, status_text)

	var button := Button.new()
	button.name = "Building_%s" % building_id
	button.text = ""
	button.tooltip_text = description_text
	button.toggle_mode = true
	button.button_group = _button_group
	button.button_pressed = selected
	button.disabled = not enabled
	button.set_meta("main_city_facility_asset_node", icon_texture_path != "")
	button.set_meta("main_city_facility_node_state", node_state)
	button.custom_minimum_size = Vector2(
		maxf(item_button_min_width, UI_COMPONENT_FACTORY.main_city_facility_tree_asset_node_min_width()) if icon_texture_path != "" else maxf(item_button_min_width, UI_COMPONENT_FACTORY.interior_building_tree_node_min_width()),
		UI_COMPONENT_FACTORY.main_city_facility_tree_asset_node_min_height() if icon_texture_path != "" else UI_COMPONENT_FACTORY.interior_building_tree_node_min_height()
	)
	button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	button.size_flags_stretch_ratio = 1.0
	button.focus_mode = Control.FOCUS_ALL
	button.add_theme_font_size_override("font_size", max(item_button_text_size, UI_COMPONENT_FACTORY.interior_building_tree_node_font_size()))
	_add_node_label_stack(button, building_id, label_text, level_text, status_text, icon_text, icon_texture_path, item, selected, enabled, node_state)
	_refresh_item_button_state(building_id, button, selected, enabled)
	button.pressed.connect(func() -> void:
		_on_item_pressed(building_id)
	)
	return button


func _add_node_label_stack(
	button: Button,
	building_id: String,
	label_text: String,
	level_text: String,
	status_text: String,
	icon_text: String,
	icon_texture_path: String,
	item: Dictionary,
	selected: bool,
	enabled: bool,
	node_state: String = ""
) -> void:
	var state_overlay := ColorRect.new()
	state_overlay.name = "NodeStateOverlay"
	UI_COMPONENT_FACTORY.apply_main_city_facility_tree_node_state_overlay_style(state_overlay, node_state, selected, enabled)
	button.add_child(state_overlay)
	var margin := MarginContainer.new()
	margin.name = "NodeLabelStackMargin"
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.anchor_right = 1.0
	margin.anchor_bottom = 1.0
	margin.offset_left = 0.0
	margin.offset_top = 0.0
	margin.offset_right = 0.0
	margin.offset_bottom = 0.0
	margin.add_theme_constant_override("margin_left", UI_COMPONENT_FACTORY.interior_building_tree_node_content_margin_x())
	margin.add_theme_constant_override("margin_top", UI_COMPONENT_FACTORY.interior_building_tree_node_content_margin_y())
	margin.add_theme_constant_override("margin_right", UI_COMPONENT_FACTORY.interior_building_tree_node_content_margin_x())
	margin.add_theme_constant_override("margin_bottom", UI_COMPONENT_FACTORY.interior_building_tree_node_content_margin_y())
	var stack := VBoxContainer.new()
	stack.name = "NodeLabelStack"
	stack.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stack.alignment = BoxContainer.ALIGNMENT_CENTER
	stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stack.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stack.add_theme_constant_override("separation", UI_COMPONENT_FACTORY.interior_building_tree_node_line_spacing())
	var icon_label: Label = null
	var icon_texture := _make_node_stack_texture(icon_texture_path, enabled, node_state)
	if icon_texture != null:
		stack.add_child(icon_texture)
	elif icon_text.strip_edges() != "":
		icon_label = _make_node_stack_label(icon_text, "icon", selected, enabled)
		stack.add_child(icon_label)
	var title_text := "◆ %s" % label_text
	if icon_texture != null:
		title_text = label_text
		if level_text.strip_edges() != "":
			title_text = "%s %s" % [label_text, level_text]
	var title_label := _make_node_stack_label(title_text, "title", selected, enabled)
	var level_label := _make_node_stack_label(level_text, "level", selected, enabled)
	var meta_label := _make_node_stack_label(str(item.get("meta", "")).strip_edges(), "meta", selected, enabled)
	stack.add_child(title_label)
	if icon_texture != null:
		pass
	else:
		stack.add_child(level_label)
		stack.add_child(meta_label)
	margin.add_child(stack)
	button.add_child(margin)
	var label_map := {
		"title": title_label,
		"level": level_label,
		"meta": meta_label,
	}
	if icon_label != null:
		label_map["icon"] = icon_label
	_item_button_labels[building_id] = label_map


func _make_node_stack_label(text: String, role: String, selected: bool, enabled: bool) -> Label:
	var label := Label.new()
	label.name = "Node%sLabel" % role.capitalize()
	label.text = text
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.clip_text = true
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_interior_building_tree_node_label_style(label, role, selected, enabled)
	return label


func _make_node_stack_texture(texture_path: String, enabled: bool, node_state: String = "") -> TextureRect:
	var normalized_path := texture_path.strip_edges()
	if normalized_path == "":
		return null
	var image_resource := Image.new()
	var texture: Texture2D = null
	if image_resource.load(normalized_path) == OK:
		texture = ImageTexture.create_from_image(image_resource)
	if texture == null:
		var texture_variant: Variant = load(normalized_path)
		texture = texture_variant as Texture2D
	if texture == null:
		return null
	var image := TextureRect.new()
	image.name = "NodeBuildingTexture"
	image.mouse_filter = Control.MOUSE_FILTER_IGNORE
	image.texture = texture
	UI_COMPONENT_FACTORY.apply_main_city_facility_tree_node_texture_style(image, enabled, node_state)
	return image


func _refresh_item_button_state(building_id: String, button: Button, selected: bool, enabled: bool) -> void:
	if bool(button.get_meta("main_city_facility_asset_node", false)):
		UI_COMPONENT_FACTORY.apply_main_city_facility_tree_asset_node_button_style(button, selected, enabled)
	else:
		UI_COMPONENT_FACTORY.apply_interior_building_tree_node_button_style(button, selected, enabled)
	var node_state := str(button.get_meta("main_city_facility_node_state", ""))
	var state_overlay := button.get_node_or_null("NodeStateOverlay") as ColorRect
	if state_overlay != null:
		UI_COMPONENT_FACTORY.apply_main_city_facility_tree_node_state_overlay_style(state_overlay, node_state, selected, enabled)
	var labels: Dictionary = _item_button_labels.get(building_id, {}) as Dictionary
	for role_variant in labels.keys():
		var role := str(role_variant)
		var label := labels.get(role_variant) as Label
		UI_COMPONENT_FACTORY.apply_interior_building_tree_node_label_style(label, role, selected, enabled)


func _normalize_main_city_facility_tree_node_state(item: Dictionary, enabled: bool, status_text: String) -> String:
	var explicit_state := str(item.get("nodeState", item.get("state", ""))).strip_edges().to_lower()
	if explicit_state != "":
		return explicit_state
	var normalized_status := status_text.strip_edges()
	if not enabled or normalized_status.find("锁定") >= 0 or normalized_status.find("候建") >= 0:
		return "locked"
	if normalized_status.find("可升级") >= 0:
		return "upgradable"
	if normalized_status.find("中") >= 0:
		return "in_progress"
	return "available"


func _make_node_row(item_index: int, item_count: int) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.name = "BuildingTreeNodeRow_%d" % item_index
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", UI_COMPONENT_FACTORY.interior_building_tree_column_separation())
	if item_index == 0 and item_count > 1:
		row.add_child(_make_node_row_spacer())
	return row


func _make_node_row_spacer() -> Control:
	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(UI_COMPONENT_FACTORY.interior_building_tree_node_min_width(), 1)
	spacer.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	return spacer


func _make_node_column(column_index: int) -> VBoxContainer:
	var column := VBoxContainer.new()
	column.name = "BuildingTreeNodeColumn_%d" % column_index
	column.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.add_theme_constant_override("separation", UI_COMPONENT_FACTORY.interior_building_tree_row_separation())
	return column


func _make_node_column_spacer() -> Control:
	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(UI_COMPONENT_FACTORY.interior_building_tree_node_min_width(), UI_COMPONENT_FACTORY.interior_building_tree_node_min_height())
	spacer.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	return spacer


func _make_connector_column(column_index: int) -> Control:
	var connector := VBoxContainer.new()
	connector.name = "BuildingTreeConnector_%d" % column_index
	connector.custom_minimum_size = Vector2(UI_COMPONENT_FACTORY.interior_building_tree_connector_width(), UI_COMPONENT_FACTORY.interior_building_tree_node_min_height())
	connector.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	connector.size_flags_vertical = Control.SIZE_EXPAND_FILL
	connector.alignment = BoxContainer.ALIGNMENT_CENTER
	var vertical_line := ColorRect.new()
	vertical_line.name = "ConnectorVerticalLayer"
	vertical_line.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	vertical_line.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	UI_COMPONENT_FACTORY.apply_interior_building_tree_connector_layer_style(vertical_line, "vertical")
	connector.add_child(vertical_line)
	var line := ColorRect.new()
	line.name = "ConnectorLine"
	line.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	line.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	UI_COMPONENT_FACTORY.apply_interior_building_tree_connector_layer_style(line, "horizontal")
	connector.add_child(line)
	return connector

func _compose_button_text(label_text: String, level_text: String, status_text: String) -> String:
	var lines: PackedStringArray = PackedStringArray()
	lines.append(label_text)
	if level_text.strip_edges() != "":
		lines.append(level_text)
	if status_text.strip_edges() != "":
		lines.append(status_text)
	return "\n".join(lines)


func _compose_node_button_text(label_text: String, level_text: String, status_text: String, item: Dictionary) -> String:
	var meta_text := str(item.get("meta", "")).strip_edges()
	var lines: PackedStringArray = PackedStringArray()
	lines.append("◆ %s" % label_text)
	if level_text.strip_edges() != "":
		lines.append(level_text)
	if status_text.strip_edges() != "":
		lines.append(status_text)
	if meta_text != "":
		lines.append(meta_text)
	return "\n".join(lines)

func _on_item_pressed(building_id: String) -> void:
	if building_id.is_empty() or not _item_buttons.has(building_id):
		return
	_selected_building_id = building_id
	set_selected_building(building_id)
	building_selected.emit(building_id)

func _refresh_detail_for_selected() -> void:
	if not _is_ready or _detail_name_label == null:
		return
	if _selected_building_id.is_empty():
		_refresh_detail_placeholder()
		return
	var selected_item := _find_tree_item(_selected_building_id)
	if selected_item.is_empty():
		_refresh_detail_placeholder()
		return
	_detail_name_label.text = str(selected_item.get("label", _selected_building_id))
	_detail_meta_label.text = str(selected_item.get("meta", selected_item.get("levelText", "")))
	_detail_body_label.text = str(selected_item.get("description", _detail_placeholder.get("body", DEFAULT_DETAIL_PLACEHOLDER.body)))
	_detail_cost_label.text = "消耗：%s" % str(selected_item.get("costSummary", "待接入"))
	_detail_effect_label.text = "效果：%s" % str(selected_item.get("effectSummary", "待接入"))

func _find_tree_item(building_id: String) -> Dictionary:
	for raw_item in _tree_items:
		var item: Dictionary = raw_item if raw_item is Dictionary else {}
		if str(item.get("id", "")) == building_id:
			return item
	return {}
