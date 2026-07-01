@tool
extends "res://scripts/dev/stories/map_preview_story_base.gd"
class_name MapUnitsStory

const PAYLOAD_DEFAULT_PATH := "res://data/ui_preview/stories/map_units_story.json"

var _roster_rows: VBoxContainer
var _action_rows: VBoxContainer
var _roster_panel: Control
var _action_panel: Control


func _resolve_default_payload_path() -> String:
	return PAYLOAD_DEFAULT_PATH


func _build_story_shell() -> void:
	var root := get_story_content_root()

	var roster_panel := _create_panel(root, "UnitsRosterPanel")
	_roster_panel = roster_panel
	roster_panel.anchor_left = 0.0
	roster_panel.anchor_top = 0.0
	roster_panel.anchor_right = 0.0
	roster_panel.anchor_bottom = 1.0
	roster_panel.offset_left = 26.0
	roster_panel.offset_top = 214.0
	roster_panel.offset_right = 312.0
	roster_panel.offset_bottom = -24.0
	_apply_panel_style(roster_panel, "panel", "observability_panel")
	var roster_margin := _create_margin_container(roster_panel, "RosterMargin", 16, 16, 16, 16)
	roster_margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_roster_rows = _create_vbox(roster_margin, "RosterRows", 8)
	_roster_rows.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var action_panel := _create_panel(root, "UnitActionPanel")
	_action_panel = action_panel
	action_panel.anchor_left = 1.0
	action_panel.anchor_top = 1.0
	action_panel.anchor_right = 1.0
	action_panel.anchor_bottom = 1.0
	action_panel.offset_left = -386.0
	action_panel.offset_top = -220.0
	action_panel.offset_right = -26.0
	action_panel.offset_bottom = -24.0
	_apply_panel_style(action_panel, "panel", "hud_bottom_bar")
	var action_margin := _create_margin_container(action_panel, "ActionMargin", 16, 16, 16, 16)
	action_margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_action_rows = _create_vbox(action_margin, "ActionRows", 8)
	_action_rows.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


func _story_uses_unit_layer(_state: Dictionary) -> bool:
	return true


func _build_story_fixture_bundle(state: Dictionary) -> Dictionary:
	var width := 8
	var height := 8
	var tile_index := _build_tile_index(width, height, "Central Plains")
	_fill_rect(tile_index, 0, 2, 7, 2, {"terrain": "river"})
	_fill_rect(tile_index, 3, 4, 4, 7, {"terrain": "mountain"})
	_set_tile(tile_index, 1, 5, {"id": "city_player_base", "type": "city", "owner": "player", "cityLevel": 6, "district": "Central Plains"})
	_set_tile(tile_index, 6, 1, {"id": "city_enemy_base", "type": "city", "owner": "enemy_west", "cityLevel": 5, "district": "Central Plains"})
	_set_tile(tile_index, 5, 5, {"id": "res_iron_units", "type": "resource", "resourceKind": "iron", "resourceLevel": 4, "terrain": "hill"})
	var tiles := _finalize_tiles(tile_index)
	tiles.append({"id": "preview_bounds_max", "x": 199, "y": 199, "type": "land", "terrain": "plain", "district": "Preview Bounds"})
	var factions := [
		{"id": "player", "name": "Han Vanguard", "homeTileId": "city_player_base", "heroCommand": {"homeTileId": "city_player_base"}},
		{"id": "enemy_west", "name": "Western Banner", "homeTileId": "city_enemy_base", "heroCommand": {"homeTileId": "city_enemy_base"}}
	]
	var history_payload: Dictionary = state.get("history", {}) as Dictionary
	var prepared_units: Array = _prepare_units_for_visual_preview(state.get("units", []))
	return {
		"mapLayout": _make_map_layout_payload(width, height, tiles, str(state.get("scope", "preview_units")), ["unit_ops"]),
		"world": _make_world_payload(width, height, tiles, factions, prepared_units, int(state.get("tick", 4096)), int(state.get("worldVersion", 96)), history_payload),
		"focus": {
			"zoom": float(state.get("zoom", 0.58)),
			"hoverTileId": str(state.get("hoverTileId", "city_player_base")),
			"hoverX": int(state.get("hoverX", 1)),
			"hoverY": int(state.get("hoverY", 5))
		}
	}


func _apply_story_state(state: Dictionary) -> void:
	var accent := _read_color(state.get("accentColor", null), Color(0.92, 0.54, 0.42, 0.98))
	_rebuild_label_rows(_roster_rows, state.get("rosterLines", []), 13, accent)
	_rebuild_label_rows(_action_rows, state.get("actionLines", []), 13)
	_apply_selected_unit(str(state.get("selectedUnitId", "")).strip_edges())
	_focus_selected_unit_tile(state)


func set_presentation_capture_mode(enabled: bool) -> void:
	super.set_presentation_capture_mode(enabled)
	if _roster_panel != null and is_instance_valid(_roster_panel):
		_roster_panel.visible = not enabled
	if _action_panel != null and is_instance_valid(_action_panel):
		_action_panel.visible = not enabled


func _prepare_units_for_visual_preview(raw_units: Variant) -> Array:
	var units: Array = []
	if not (raw_units is Array):
		return units
	var now_unix: int = int(Time.get_unix_time_from_system())
	for unit_variant in raw_units as Array:
		if not (unit_variant is Dictionary):
			continue
		var unit: Dictionary = (unit_variant as Dictionary).duplicate(true)
		var map_visual: Dictionary = unit.get("mapVisual", {}) as Dictionary
		map_visual = map_visual.duplicate(true)
		var eta_offset_sec: int = int(map_visual.get("etaOffsetSec", 0))
		if eta_offset_sec > 0:
			var eta_at: String = "%sZ" % Time.get_datetime_string_from_unix_time(now_unix + eta_offset_sec, false)
			map_visual["etaAt"] = eta_at
			map_visual["estimatedArrivalAt"] = eta_at
			map_visual.erase("etaOffsetSec")
		if not map_visual.has("label"):
			map_visual["label"] = str(unit.get("name", unit.get("id", ""))).strip_edges()
		unit["mapVisual"] = map_visual
		units.append(unit)
	return units


func _apply_selected_unit(selected_unit_id: String) -> void:
	call_deferred("_apply_selected_unit_deferred", selected_unit_id)


func _apply_selected_unit_deferred(selected_unit_id: String) -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	var unit_layer: Node2D = get_unit_view_layer()
	if unit_layer == null:
		return
	if selected_unit_id == "":
		if unit_layer.has_method("clear_unit_selection"):
			unit_layer.call("clear_unit_selection")
		return
	if unit_layer.has_method("select_unit"):
		unit_layer.call("select_unit", selected_unit_id)


func _focus_selected_unit_tile(state: Dictionary) -> void:
	var selected_unit_id: String = str(state.get("selectedUnitId", "")).strip_edges()
	if selected_unit_id == "":
		return
	var selected_tile_id: String = ""
	var raw_units: Variant = state.get("units", [])
	if raw_units is Array:
		for unit_variant in raw_units as Array:
			if not (unit_variant is Dictionary):
				continue
			var unit: Dictionary = unit_variant as Dictionary
			if str(unit.get("id", "")).strip_edges() != selected_unit_id:
				continue
			selected_tile_id = str(unit.get("tileId", "")).strip_edges()
			break
	if selected_tile_id == "":
		return
	call_deferred("_focus_tile_deferred", selected_tile_id)


func _focus_tile_deferred(tile_id: String) -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	var map_grid: Node2D = get_map_grid()
	if map_grid == null or not map_grid.has_method("tile_id_to_screen_position"):
		return
	var target_screen: Vector2 = map_grid.call("tile_id_to_screen_position", tile_id, 0, 0)
	var viewport_center: Vector2 = get_viewport_rect().size * 0.5 + Vector2(0.0, 36.0)
	var current_pan: Vector2 = map_grid.get("_pan_offset") as Vector2
	map_grid.set("_pan_offset", current_pan + viewport_center - target_screen)
	map_grid.queue_redraw()
	if map_grid.has_method("_emit_view_transform_changed"):
		map_grid.call("_emit_view_transform_changed")
