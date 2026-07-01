extends Node2D

signal ai_living_activity_marker_requested(payload: Dictionary)

const UnitMarkerScript = preload("res://scripts/map/unit_marker.gd")
const UnitPathLayerScript = preload("res://scripts/map/unit_path_layer.gd")
const AIMapIntentMarkerScript = preload("res://scripts/map/ai_map_intent_marker.gd")
const FactionVisualsScript = preload("res://scripts/map/faction_visuals.gd")
const SlgUiComponentFactoryScript = preload("res://scripts/ui/slg_ui_component_factory.gd")
const ENGAGE_KIND_BATTLE: String = "battle"
const ENGAGE_KIND_TILE_CONTROL: String = "tile_control"
const ENGAGE_KIND_LOGISTICS: String = "logistics"
const ENGAGE_KIND_FALLBACK: String = ENGAGE_KIND_TILE_CONTROL
const VISUAL_TYPE_INFANTRY: String = "infantry"
const VISUAL_TYPE_CAVALRY: String = "cavalry"
const VISUAL_TYPE_ARCHER: String = "archer"
const DEFAULT_VISUAL_TYPE: String = VISUAL_TYPE_CAVALRY
const IDENTITY_KIND_HUMAN: String = "human"
const IDENTITY_KIND_AI: String = "ai"
const IDENTITY_KIND_NEUTRAL: String = "neutral"
const NEUTRAL_FACTION_HINTS: Array[String] = [
	"",
	"neutral",
	"npc",
	"world",
	"environment",
]
const KNOWN_NON_ENGAGE_HIGHLIGHT_KINDS: Array[String] = [
	"enemy_turn",
	"alliance_turn",
	"intel",
	"planning",
]
const AI_MAP_INTENT_MARKER_LIMIT: int = 12
const AI_MAP_RESOURCE_STATE_MARKER_LIMIT: int = 24
const AI_LIVING_ACTIVITY_LAYER_CONTRACT := "ai_living_activity_layer_v1"
const AI_LIVING_ACTIVITY_MARKER_VISUAL_ASSET_CONTRACT := "ai_living_activity_marker_visual_asset_v1"
const AI_LIVING_ACTIVITY_MARKER_QUEUE_CLUSTER_CONTRACT := "ai_living_activity_marker_queue_cluster_v1"
const AI_LIVING_ACTIVITY_LONG_TRACE_POSITION_CONTRACT := "ai_living_activity_long_trace_position_v1"
const AI_LIVING_ACTIVITY_MARKER_FALLBACK_AVATAR_PATH := "res://assets/portraits/ai_chat/liu_bei_mature_hanzhong_sworddance_face_smile_v2_avatar_160.png"
const WORLD_TROOP_MARCH_MOTION_CONTRACT := "world_troop_march_motion_v1"
const WORLD_TROOP_MARCH_RESULT_MOTION_CONTRACT := "world_troop_march_result_motion_v1"
const WORLD_TROOP_MARCH_FEEDBACK_CHAIN_CONTRACT := "world_troop_march_feedback_chain_partial_v1"
const WORLD_TROOP_MARCH_BLOCKED_RECOVERY_VISIBLE_LABEL := "行军受阻\n重试行军 / 改走别线"
const UNIT_SELECTION_HIT_RADIUS: float = 34.0
const UNIT_LABEL_REFRESH_SEC: float = 0.50
const UNIT_LABEL_AVOIDANCE_PADDING: float = 8.0
const UNIT_LABEL_CITY_RECT_SIZE: Vector2 = Vector2(132.0, 90.0)
const UNIT_LABEL_TARGET_RECT_SIZE: Vector2 = Vector2(62.0, 46.0)
const UNIT_LABEL_MAX_WIDTH: float = 188.0
const UNIT_LABEL_MIN_WIDTH: float = 78.0
const UNIT_LABEL_FONT_SIZE: int = 17
const UNIT_LABEL_SELECTED_FONT_SIZE: int = 18
const UNIT_LABEL_HORIZONTAL_PADDING: float = 9.0
const UNIT_LABEL_VERTICAL_PADDING: float = 5.0
const UNIT_LABEL_DENSITY_SELECTED_RADIUS: float = 150.0
const UNIT_LABEL_DENSITY_CITY_RADIUS: float = 96.0
const UNIT_LABEL_DENSITY_CITY_SUPPRESS_RADIUS: float = 190.0
const MAIN_WORLD_SCENARIO_ANCHOR_TILE_ID: String = "tile_08"
const MAIN_WORLD_SCENARIO_ANCHOR_COORD: Vector2i = Vector2i(152, 159)
const MAIN_WORLD_HOME_CITY_ANCHOR_COORD: Vector2i = Vector2i(4300, 2538)
const MAIN_WORLD_SCENARIO_TILE_FALLBACK_COORDS := {
	"tile_01": Vector2i(150, 158),
	"tile_02": Vector2i(151, 158),
	"tile_03": Vector2i(152, 158),
	"tile_04": Vector2i(153, 158),
	"tile_05": Vector2i(154, 158),
	"tile_06": Vector2i(150, 159),
	"tile_07": Vector2i(151, 159),
	"tile_08": Vector2i(152, 159),
	"tile_09": Vector2i(153, 159),
	"tile_10": Vector2i(154, 159),
	"tile_11": Vector2i(150, 160),
	"tile_12": Vector2i(151, 160),
	"tile_13": Vector2i(152, 160),
	"tile_14": Vector2i(153, 160),
	"tile_15": Vector2i(154, 160),
	"ai_living_activity_fixture_tile": Vector2i(156, 162),
}
const MAIN_WORLD_SCENARIO_CITY_TILE_IDS := {
	"tile_08": true,
	"tile_10": true,
}
const MAIN_WORLD_UNIT_VISUAL_ANCHOR_CONFIG_PATH: String = "res://assets/themes/slgclient/current/units/main_world_unit_visual_anchors_v1.json"
const MAIN_CITY_TROOP_FORMATION_READ_MODEL_PATH: String = "res://data/ui/main_city_troop_formation_read_model.json"
const CITY_QUEUE_ANCHOR_SOURCE_MODE_BACKEND: String = "backend_footprint"
const CITY_QUEUE_ANCHOR_SOURCE_MODE_LOCAL: String = "local_profile_fallback"
const CITY_QUEUE_ANCHOR_SOURCE_MODE_DEFAULT: String = "fallback_default"
const CITY_QUEUE_ANCHOR_DIRECTION_SOURCE_BACKEND: String = "backend_exit"
const CITY_QUEUE_ANCHOR_DIRECTION_SOURCE_LOCAL: String = "local_direction"
const DEFAULT_MAIN_WORLD_CITY_VISUAL_FOOTPRINT_TILE_IDS := {
	"tile_01": true,
	"tile_02": true,
	"tile_03": true,
	"tile_04": true,
	"tile_05": true,
	"tile_06": true,
	"tile_07": true,
	"tile_08": true,
	"tile_09": true,
	"tile_10": true,
	"tile_11": true,
	"tile_12": true,
	"tile_13": true,
	"tile_14": true,
	"tile_15": true,
}
const DEFAULT_MAIN_WORLD_CITY_VISUAL_STAGING_OFFSET: Vector2 = Vector2(0.0, 132.0)
const UNIT_LABEL_CANDIDATE_OFFSETS: Array[Vector2] = [
	Vector2(0.0, -1.0),
	Vector2(1.0, -0.45),
	Vector2(-1.0, -0.45),
	Vector2(1.0, 0.45),
	Vector2(-1.0, 0.45),
	Vector2(0.0, 0.85),
]

@export var map_grid_path: NodePath = NodePath("../MapGrid")
@export var marker_radius: float = 4.0
@export var marker_vertical_offset: float = -2.0
@export var move_duration_sec: float = 0.35

var _map_grid: Node
var _tile_positions_by_id: Dictionary = {}
var _city_tile_ids: Dictionary = {}
var _markers_by_unit_id: Dictionary = {}
var _ai_map_markers_by_key: Dictionary = {}
var _ai_living_activity_marker_count: int = 0
var _ai_living_activity_uses_execution_trace: bool = false
var _ai_living_activity_fallback_used: bool = false
var _ai_living_activity_marker_viewport_clamped_count: int = 0
var _unit_labels_by_id: Dictionary = {}
var _selected_unit_id: String = ""
var _world_troop_march_blocked_screenshot_fixture_unit_id: String = ""
var _world_troop_march_intercepted_screenshot_fixture_unit_id: String = ""
var _world_troop_march_retreating_screenshot_fixture_unit_id: String = ""
var _prev_units_by_id: Dictionary = {}
var _unit_path_layer: Node2D
var _label_refresh_timer: float = 0.0
var _label_avoidance_applied_count: int = 0
var _label_clamp_applied_count: int = 0
var _label_density_compact_count: int = 0
var _label_density_suppressed_count: int = 0
var _label_density_suppressed_unit_ids: Dictionary = {}
var _city_stationed_hidden_unit_ids: Dictionary = {}
var _city_visual_footprint_tile_ids: Dictionary = DEFAULT_MAIN_WORLD_CITY_VISUAL_FOOTPRINT_TILE_IDS.duplicate(true)
var _city_visual_staging_offset: Vector2 = DEFAULT_MAIN_WORLD_CITY_VISUAL_STAGING_OFFSET
var _city_visual_anchor_config_source: String = "fallback_default"
var _city_visual_anchor_config_schema_version: String = "fallback_default"
var _city_visual_anchor_profiles_by_id: Dictionary = {}
var _city_visual_anchor_profile_by_tile_id: Dictionary = {}
var _city_visual_anchor_profile_by_footprint_id: Dictionary = {}
var _city_visual_anchor_active_profile_ids: Dictionary = {}
var _city_visual_anchor_last_profile_id: String = "fallback_default"
var _city_visual_anchor_last_matched_tile_id: String = ""
var _city_visual_backend_profile_by_tile_id: Dictionary = {}
var _city_visual_backend_footprint_by_tile_id: Dictionary = {}
var _city_visual_backend_anchor_count: int = 0
var _city_visual_backend_match_count: int = 0
var _city_visual_backend_active_profile_ids: Dictionary = {}
var _city_visual_backend_profile_coverage: Dictionary = {}
var _city_visual_anchor_last_source_mode: String = CITY_QUEUE_ANCHOR_SOURCE_MODE_DEFAULT
var _city_visual_anchor_last_backend_footprint_id: String = ""
var _city_visual_anchor_last_backend_matched_tile_id: String = ""
var _city_visual_anchor_last_backend_footprint_tile_count: int = 0
var _city_visual_anchor_last_backend_profile_resolved: bool = false
var _city_visual_anchor_last_selection_reason: String = "fallback_default"
var _city_visual_anchor_last_queue_anchor_id: String = ""
var _city_visual_anchor_last_queue_anchor_direction: String = ""
var _city_visual_anchor_last_queue_anchor_offset: Vector2 = Vector2.ZERO
var _city_visual_anchor_last_queue_anchor_source: String = CITY_QUEUE_ANCHOR_DIRECTION_SOURCE_LOCAL
var _city_visual_anchor_last_backend_exit_anchor_id: String = ""
var _city_visual_anchor_last_backend_road_exit_direction: String = ""
var _seen_replay_frame_ids: Dictionary = {}
var _seen_replay_frame_order: Array = []
var _replay_engage_kind_counts: Dictionary = {
	ENGAGE_KIND_BATTLE: 0,
	ENGAGE_KIND_TILE_CONTROL: 0,
	ENGAGE_KIND_LOGISTICS: 0,
}
var _replay_engage_unknown_kind_count: int = 0
var _replay_engage_unknown_kind_samples: Array[String] = []
var _replay_engage_trigger_count: int = 0
var _replay_engage_direction_direct_hits: int = 0
var _replay_engage_direction_fallback_hits: int = 0
var _replay_engage_last_frame_summary: Dictionary = {}

func _ready() -> void:
	set_process_unhandled_input(true)
	_load_main_world_unit_visual_anchor_config()
	_ensure_unit_overlay_layers()
	_map_grid = get_node_or_null(map_grid_path)
	if _map_grid != null and _map_grid.has_signal("view_transform_changed"):
		_map_grid.view_transform_changed.connect(_on_view_transform_changed)

	if WorldStore.has_signal("map_layout_updated"):
		WorldStore.map_layout_updated.connect(_on_map_layout_updated)
	if WorldStore.has_signal("world_updated"):
		WorldStore.world_updated.connect(_on_world_updated)

	_on_map_layout_updated(WorldStore.map_layout)
	_on_world_updated(WorldStore.world)

func _try_emit_ai_living_activity_marker_requested(screen_position: Vector2) -> bool:
	for key_variant in _ai_map_markers_by_key.keys():
		var key := str(key_variant)
		if not key.begins_with("living_activity:"):
			continue
		var marker := _ai_map_markers_by_key[key] as Node2D
		if marker == null or not marker.visible:
			continue
		var marker_screen_position := marker.get_global_transform_with_canvas().origin
		var marker_radius := float(marker.get("radius")) if marker.has_method("get") else 42.0
		if marker_screen_position.distance_to(screen_position) > maxf(44.0, marker_radius + 8.0):
			continue
		var payload := _build_ai_living_activity_marker_request_payload(key, marker)
		ai_living_activity_marker_requested.emit(payload)
		return true
	return false

func request_first_ai_living_activity_marker_for_visual_smoke() -> Dictionary:
	for key_variant in _ai_map_markers_by_key.keys():
		var key := str(key_variant)
		if not key.begins_with("living_activity:"):
			continue
		var marker := _ai_map_markers_by_key[key] as Node2D
		if marker == null:
			continue
		var payload := _build_ai_living_activity_marker_request_payload(key, marker)
		payload["ok"] = true
		payload["source"] = "visual_smoke"
		ai_living_activity_marker_requested.emit(payload)
		return payload
	return {
		"ok": false,
		"contract": "ai_activity_card_marker_entry_v1",
		"reason": "living_activity_marker_missing",
	}

func _build_ai_living_activity_marker_request_payload(key: String, marker: Node2D) -> Dictionary:
	var map_target_tile_id := str(marker.get_meta("map_target_tile_id", marker.get_meta("tile_id", ""))).strip_edges()
	var raw_jump_target: Variant = marker.get_meta("jump_target", {})
	var jump_target: Dictionary = raw_jump_target as Dictionary if raw_jump_target is Dictionary else {}
	var focus_expectation := _build_ai_living_activity_focus_expectation(jump_target, map_target_tile_id)
	var raw_source_ref: Variant = marker.get_meta("source_ref", {})
	var source_ref: Dictionary = raw_source_ref as Dictionary if raw_source_ref is Dictionary else {}
	return {
		"contract": "ai_activity_card_marker_entry_v1",
		"markerKey": key,
		"tileId": str(marker.get_meta("tile_id", "")).strip_edges(),
		"activityEventId": str(marker.get_meta("activity_event_id", "")).strip_edges(),
		"mapTargetTileId": map_target_tile_id,
		"jumpTarget": jump_target,
		"jumpTargetReady": bool(focus_expectation.get("ready", false)),
		"focusExpectation": focus_expectation,
		"focusExpectationReady": bool(focus_expectation.get("ready", false)),
		"focusExpectationTargetId": str(focus_expectation.get("targetId", "")).strip_edges(),
		"focusExpectationSurface": str(focus_expectation.get("surface", "")).strip_edges(),
		"focusExpectationRequiresRuntimeClick": bool(focus_expectation.get("requiresRuntimeClick", false)),
		"focusExpectationFocusPerformed": false,
		"sourceRef": source_ref,
		"sourceRefRequestId": str(source_ref.get("requestId", "")).strip_edges(),
		"traceId": str(marker.get_meta("trace_id", "")).strip_edges(),
		"aiPlayerId": str(marker.get_meta("ai_player_id", "")).strip_edges(),
		"label": str(marker.get_meta("activity_label", "")).strip_edges(),
		"screenPosition": {
			"x": marker.get_global_transform_with_canvas().origin.x,
			"y": marker.get_global_transform_with_canvas().origin.y,
		},
	}


func _resolve_first_ai_living_activity_marker_trace_id() -> String:
	for key_variant in _ai_map_markers_by_key.keys():
		var key := str(key_variant)
		if not key.begins_with("living_activity:"):
			continue
		var marker: Node2D = _ai_map_markers_by_key[key] as Node2D
		if marker == null:
			continue
		var trace_id := str(marker.get_meta("trace_id", "")).strip_edges()
		if trace_id != "":
			return trace_id
	return ""


func _load_main_world_unit_visual_anchor_config() -> void:
	_reset_main_world_unit_visual_anchor_config_to_default()
	if not FileAccess.file_exists(MAIN_WORLD_UNIT_VISUAL_ANCHOR_CONFIG_PATH):
		return
	var file := FileAccess.open(MAIN_WORLD_UNIT_VISUAL_ANCHOR_CONFIG_PATH, FileAccess.READ)
	if file == null:
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not (parsed is Dictionary):
		return
	var root: Dictionary = parsed as Dictionary
	var footprints: Variant = root.get("mainWorldCityVisualFootprints", {})
	if not (footprints is Dictionary):
		return
	var next_profiles_by_id: Dictionary = {}
	var next_profile_by_tile_id: Dictionary = {}
	var next_profile_by_footprint_id: Dictionary = {}
	var next_tile_ids: Dictionary = {}
	for profile_id_variant in (footprints as Dictionary).keys():
		var profile_id := str(profile_id_variant).strip_edges()
		var profile_variant: Variant = (footprints as Dictionary).get(profile_id_variant, {})
		if profile_id == "" or not (profile_variant is Dictionary):
			continue
		var parsed_profile := _parse_main_world_city_visual_anchor_profile(profile_id, profile_variant as Dictionary)
		var profile_tile_ids: Dictionary = parsed_profile.get("tileIds", {}) as Dictionary
		if profile_tile_ids.is_empty():
			continue
		next_profiles_by_id[profile_id] = parsed_profile
		for tile_id_variant in profile_tile_ids.keys():
			var tile_id := str(tile_id_variant).strip_edges()
			if tile_id == "":
				continue
			next_tile_ids[tile_id] = true
			next_profile_by_tile_id[tile_id] = profile_id
		var profile_footprint_ids: Array = parsed_profile.get("footprintIds", [])
		for footprint_id_variant in profile_footprint_ids:
			var footprint_id := str(footprint_id_variant).strip_edges()
			if footprint_id != "" and not next_profile_by_footprint_id.has(footprint_id):
				next_profile_by_footprint_id[footprint_id] = profile_id
	if next_profiles_by_id.is_empty():
		return
	_city_visual_anchor_profiles_by_id = next_profiles_by_id
	_city_visual_anchor_profile_by_tile_id = next_profile_by_tile_id
	_city_visual_anchor_profile_by_footprint_id = next_profile_by_footprint_id
	_city_visual_footprint_tile_ids = next_tile_ids
	_city_visual_staging_offset = _resolve_first_city_visual_anchor_profile_offset()
	_city_visual_anchor_config_source = MAIN_WORLD_UNIT_VISUAL_ANCHOR_CONFIG_PATH
	_city_visual_anchor_config_schema_version = str(root.get("schemaVersion", "")).strip_edges()

func _reset_main_world_unit_visual_anchor_config_to_default() -> void:
	_city_visual_footprint_tile_ids = DEFAULT_MAIN_WORLD_CITY_VISUAL_FOOTPRINT_TILE_IDS.duplicate(true)
	_city_visual_staging_offset = DEFAULT_MAIN_WORLD_CITY_VISUAL_STAGING_OFFSET
	_city_visual_anchor_config_source = "fallback_default"
	_city_visual_anchor_config_schema_version = "fallback_default"
	_city_visual_anchor_profiles_by_id = {
		"fallback_default": {
			"id": "fallback_default",
			"footprintId": "fallback_default",
			"footprintIds": ["fallback_default"],
			"tileIds": DEFAULT_MAIN_WORLD_CITY_VISUAL_FOOTPRINT_TILE_IDS.duplicate(true),
			"stagingOffset": DEFAULT_MAIN_WORLD_CITY_VISUAL_STAGING_OFFSET,
			"queueAnchorOffset": DEFAULT_MAIN_WORLD_CITY_VISUAL_STAGING_OFFSET,
			"queueAnchorIds": [],
			"queueAnchorApplied": false,
		}
	}
	_city_visual_anchor_profile_by_tile_id = {}
	for tile_id_variant in DEFAULT_MAIN_WORLD_CITY_VISUAL_FOOTPRINT_TILE_IDS.keys():
		_city_visual_anchor_profile_by_tile_id[str(tile_id_variant)] = "fallback_default"
	_city_visual_anchor_profile_by_footprint_id = {"fallback_default": "fallback_default"}
	_city_visual_anchor_active_profile_ids = {}
	_city_visual_anchor_last_profile_id = "fallback_default"
	_city_visual_anchor_last_matched_tile_id = ""
	_city_visual_backend_profile_by_tile_id = {}
	_city_visual_backend_footprint_by_tile_id = {}
	_city_visual_backend_anchor_count = 0
	_city_visual_backend_match_count = 0
	_city_visual_backend_active_profile_ids = {}
	_city_visual_backend_profile_coverage = {}
	_city_visual_anchor_last_source_mode = CITY_QUEUE_ANCHOR_SOURCE_MODE_DEFAULT
	_city_visual_anchor_last_backend_footprint_id = ""
	_city_visual_anchor_last_backend_matched_tile_id = ""
	_city_visual_anchor_last_backend_footprint_tile_count = 0
	_city_visual_anchor_last_backend_profile_resolved = false
	_city_visual_anchor_last_selection_reason = "fallback_default"
	_city_visual_anchor_last_queue_anchor_id = ""
	_city_visual_anchor_last_queue_anchor_direction = ""
	_city_visual_anchor_last_queue_anchor_offset = Vector2.ZERO
	_city_visual_anchor_last_queue_anchor_source = CITY_QUEUE_ANCHOR_DIRECTION_SOURCE_LOCAL
	_city_visual_anchor_last_backend_exit_anchor_id = ""
	_city_visual_anchor_last_backend_road_exit_direction = ""

func _parse_main_world_city_visual_anchor_profile(profile_id: String, raw_profile: Dictionary) -> Dictionary:
	var tile_ids: Dictionary = {}
	var raw_tile_ids: Variant = raw_profile.get("tileIds", [])
	if raw_tile_ids is Array:
		for tile_id_variant in raw_tile_ids as Array:
			var tile_id := str(tile_id_variant).strip_edges()
			if tile_id != "":
				tile_ids[tile_id] = true
	var staging_offset := _parse_main_world_city_visual_offset(raw_profile.get("stagingOffset", {}), DEFAULT_MAIN_WORLD_CITY_VISUAL_STAGING_OFFSET)
	var queue_anchor_offset := staging_offset
	var queue_anchor_applied := false
	var queue_anchor_ids: Array[String] = []
	var queue_anchor_records: Array = []
	var raw_queue_anchors: Variant = raw_profile.get("queueAnchors", [])
	if raw_queue_anchors is Array:
		for anchor_variant in raw_queue_anchors as Array:
			if not (anchor_variant is Dictionary):
				continue
			var anchor: Dictionary = anchor_variant as Dictionary
			var anchor_id := str(anchor.get("id", "")).strip_edges()
			if anchor_id != "":
				queue_anchor_ids.append(anchor_id)
			var anchor_offset := _parse_main_world_city_visual_offset(anchor.get("offset", {}), staging_offset)
			var anchor_record := {
				"id": anchor_id,
				"role": str(anchor.get("role", "")).strip_edges(),
				"directions": _string_array_from_variant(anchor.get("directions", [])),
				"offset": anchor_offset,
			}
			queue_anchor_records.append(anchor_record)
			if str(anchor.get("role", "")).strip_edges() == "march_start":
				queue_anchor_offset = anchor_offset
				queue_anchor_applied = true
	var footprint_id := str(raw_profile.get("footprintId", profile_id)).strip_edges()
	var footprint_ids: Array = []
	if footprint_id != "":
		footprint_ids.append(footprint_id)
	for alias_key in ["backendFootprintIds", "footprintAliases"]:
		var raw_aliases: Variant = raw_profile.get(alias_key, [])
		if not (raw_aliases is Array):
			continue
		for alias_variant in raw_aliases as Array:
			var alias_id := str(alias_variant).strip_edges()
			if alias_id != "" and not footprint_ids.has(alias_id):
				footprint_ids.append(alias_id)
	return {
		"id": profile_id,
		"footprintId": footprint_id,
		"footprintIds": footprint_ids,
		"tileIds": tile_ids,
		"stagingOffset": staging_offset,
		"queueAnchorOffset": queue_anchor_offset,
		"queueAnchorIds": queue_anchor_ids,
		"queueAnchors": queue_anchor_records,
		"queueAnchorApplied": queue_anchor_applied,
		"policy": raw_profile.get("policy", {}),
	}

func _parse_main_world_city_visual_offset(raw_offset: Variant, fallback: Vector2) -> Vector2:
	if not (raw_offset is Dictionary):
		return fallback
	var offset: Dictionary = raw_offset as Dictionary
	return Vector2(
		float(offset.get("x", fallback.x)),
		float(offset.get("y", fallback.y))
	)

func _resolve_first_city_visual_anchor_profile_offset() -> Vector2:
	for profile_variant in _city_visual_anchor_profiles_by_id.values():
		if profile_variant is Dictionary:
			var profile: Dictionary = profile_variant as Dictionary
			return profile.get("queueAnchorOffset", profile.get("stagingOffset", DEFAULT_MAIN_WORLD_CITY_VISUAL_STAGING_OFFSET)) as Vector2
	return DEFAULT_MAIN_WORLD_CITY_VISUAL_STAGING_OFFSET

func _process(delta: float) -> void:
	_sync_time_interpolated_marker_positions()
	_label_refresh_timer += delta
	if _label_refresh_timer < UNIT_LABEL_REFRESH_SEC:
		return
	_label_refresh_timer = 0.0
	_sync_unit_labels(_prev_units_by_id)

func _unhandled_input(event: InputEvent) -> void:
	if not (event is InputEventMouseButton):
		return
	var mouse_event: InputEventMouseButton = event as InputEventMouseButton
	if mouse_event.button_index != MOUSE_BUTTON_LEFT or not mouse_event.pressed:
		return
	if _try_emit_ai_living_activity_marker_requested(mouse_event.position):
		get_viewport().set_input_as_handled()
		return
	var hit_unit_id: String = _resolve_unit_id_at_global_position(get_global_mouse_position())
	if hit_unit_id == "":
		return
	if select_unit(hit_unit_id):
		get_viewport().set_input_as_handled()

func _on_view_transform_changed(_view_state: Dictionary) -> void:
	_sync_marker_positions()
	_sync_ai_map_visual_positions()
	_sync_unit_path_layer(_prev_units_by_id)
	_sync_unit_labels(_prev_units_by_id)

func _on_map_layout_updated(next_map_layout: Dictionary) -> void:
	_rebuild_tile_positions(next_map_layout)
	_rebuild_backend_city_visual_footprints(next_map_layout)
	_sync_marker_positions()
	_sync_unit_path_layer(_prev_units_by_id)
	_sync_unit_labels(_prev_units_by_id)
	_sync_ai_map_visuals(WorldStore.world)

func _on_world_updated(next_world: Dictionary) -> void:
	if next_world.is_empty():
		return

	_merge_world_tile_positions(next_world)
	_merge_backend_city_visual_footprints_from_world(next_world)
	var next_units_by_id: Dictionary = _index_units(next_world.get("units", []))
	_city_stationed_hidden_unit_ids = {}
	var visible_units_by_id: Dictionary = {}
	for unit_id_variant in next_units_by_id.keys():
		var unit_id: String = str(unit_id_variant)
		var unit: Dictionary = next_units_by_id[unit_id] as Dictionary
		if _should_hide_city_stationed_unit(unit):
			_city_stationed_hidden_unit_ids[unit_id] = _resolve_city_stationed_tile_id(unit)
			_remove_unit_marker(unit_id)
			continue
		visible_units_by_id[unit_id] = unit

	for unit_id_variant in _markers_by_unit_id.keys():
		var unit_id: String = str(unit_id_variant)
		if visible_units_by_id.has(unit_id):
			continue
		_remove_unit_marker(unit_id)

	for unit_id_variant in visible_units_by_id.keys():
		var unit_id: String = str(unit_id_variant)
		var unit: Dictionary = visible_units_by_id[unit_id] as Dictionary
		var marker: Node2D = _ensure_marker(unit_id, unit)

		if marker == null:
			continue

		var target_position: Vector2 = _resolve_unit_position(unit, marker.position)
		var has_previous: bool = _prev_units_by_id.has(unit_id)
		if not has_previous:
			_set_marker_position(marker, target_position)
			_sync_marker_march_animation(marker, unit)
			continue

		var previous_unit: Dictionary = _prev_units_by_id[unit_id] as Dictionary
		var moved: bool = str(previous_unit.get("tileId", "")) != str(unit.get("tileId", ""))
		var strength_drop: bool = int(previous_unit.get("strength", 0)) > int(unit.get("strength", 0))
		var status_changed: bool = str(previous_unit.get("status", "")) != str(unit.get("status", ""))
		var engage_intensity_after_move: float = 0.0
		var engage_kind_after_move: String = ""
		var engage_direction_after_move: Vector2 = _resolve_unit_direction_vector(previous_unit, unit)
		if strength_drop:
			engage_intensity_after_move = _resolve_engage_intensity_for_kind("battle")
			engage_kind_after_move = "battle"
		elif status_changed:
			engage_intensity_after_move = _resolve_engage_intensity_for_kind("tile_control")
			engage_kind_after_move = "tile_control"

		if moved:
			var from_position: Vector2 = _resolve_unit_position(previous_unit, marker.position)
			_animate_marker_move(
				marker,
				from_position,
				target_position,
				engage_intensity_after_move,
				engage_kind_after_move,
				engage_direction_after_move,
				_unit_should_play_march_loop(unit),
				_resolve_unit_march_direction(unit, engage_direction_after_move),
			)
			continue

		_set_marker_position(marker, target_position)
		_sync_marker_march_animation(marker, unit)
		if strength_drop or status_changed:
			marker.call(
				"play_engage",
				_resolve_engage_intensity_for_kind("battle" if strength_drop else "tile_control"),
				engage_direction_after_move,
				"battle" if strength_drop else "tile_control",
			)

	_trigger_engage_from_replay_frames(next_world, next_units_by_id)
	_prev_units_by_id = next_units_by_id
	_sync_unit_path_layer(visible_units_by_id)
	_sync_unit_labels(visible_units_by_id)
	_sync_ai_map_visuals(next_world)

func activate_world_troop_march_blocked_screenshot_fixture(unit_id: String) -> void:
	var normalized_unit_id := unit_id.strip_edges()
	_world_troop_march_blocked_screenshot_fixture_unit_id = normalized_unit_id
	if normalized_unit_id == "":
		return
	if _prev_units_by_id.has(normalized_unit_id):
		var unit: Dictionary = (_prev_units_by_id[normalized_unit_id] as Dictionary).duplicate(true)
		var map_visual: Dictionary = {}
		var map_visual_variant: Variant = unit.get("mapVisual", {})
		if map_visual_variant is Dictionary:
			map_visual = (map_visual_variant as Dictionary).duplicate(true)
		map_visual["feedbackLabel"] = WORLD_TROOP_MARCH_BLOCKED_RECOVERY_VISIBLE_LABEL
		unit["mapVisual"] = map_visual
		_prev_units_by_id[normalized_unit_id] = unit
	if _markers_by_unit_id.has(normalized_unit_id):
		_selected_unit_id = normalized_unit_id
	_sync_unit_labels(_prev_units_by_id)

func activate_world_troop_march_intercepted_screenshot_fixture(unit_id: String) -> void:
	var normalized_unit_id := unit_id.strip_edges()
	_world_troop_march_intercepted_screenshot_fixture_unit_id = normalized_unit_id
	if normalized_unit_id == "":
		return
	if _prev_units_by_id.has(normalized_unit_id):
		var unit: Dictionary = (_prev_units_by_id[normalized_unit_id] as Dictionary).duplicate(true)
		var map_visual: Dictionary = {}
		var map_visual_variant: Variant = unit.get("mapVisual", {})
		if map_visual_variant is Dictionary:
			map_visual = (map_visual_variant as Dictionary).duplicate(true)
		unit["status"] = "intercepted"
		unit["resultState"] = "intercepted"
		map_visual["status"] = "intercepted"
		map_visual["resultState"] = "intercepted"
		map_visual["feedbackLabel"] = "遭遇拦截"
		unit["mapVisual"] = map_visual
		_prev_units_by_id[normalized_unit_id] = unit
	if _markers_by_unit_id.has(normalized_unit_id):
		_selected_unit_id = normalized_unit_id
	_sync_unit_labels(_prev_units_by_id)

func activate_world_troop_march_retreating_screenshot_fixture(unit_id: String) -> void:
	var normalized_unit_id := unit_id.strip_edges()
	_world_troop_march_retreating_screenshot_fixture_unit_id = normalized_unit_id
	if normalized_unit_id == "":
		return
	if _prev_units_by_id.has(normalized_unit_id):
		var unit: Dictionary = (_prev_units_by_id[normalized_unit_id] as Dictionary).duplicate(true)
		var map_visual: Dictionary = {}
		var map_visual_variant: Variant = unit.get("mapVisual", {})
		if map_visual_variant is Dictionary:
			map_visual = (map_visual_variant as Dictionary).duplicate(true)
		unit["status"] = "retreating"
		unit["resultState"] = "retreating"
		map_visual["status"] = "retreating"
		map_visual["resultState"] = "retreating"
		map_visual["feedbackLabel"] = "部队撤回中"
		unit["mapVisual"] = map_visual
		_prev_units_by_id[normalized_unit_id] = unit
	if _markers_by_unit_id.has(normalized_unit_id):
		_selected_unit_id = normalized_unit_id
	_sync_unit_labels(_prev_units_by_id)

func select_unit(unit_id: String) -> bool:
	var normalized_unit_id: String = unit_id.strip_edges()
	if normalized_unit_id == "" or not _markers_by_unit_id.has(normalized_unit_id):
		return false
	if _selected_unit_id == normalized_unit_id:
		return true
	_selected_unit_id = normalized_unit_id
	_sync_marker_selection_states()
	return true

func clear_unit_selection() -> void:
	if _selected_unit_id == "":
		return
	_selected_unit_id = ""
	_sync_marker_selection_states()

func _remove_unit_marker(unit_id: String) -> void:
	var normalized_unit_id: String = unit_id.strip_edges()
	if normalized_unit_id == "":
		return
	if _markers_by_unit_id.has(normalized_unit_id):
		var marker: Node2D = _markers_by_unit_id[normalized_unit_id] as Node2D
		if marker != null:
			marker.queue_free()
		_markers_by_unit_id.erase(normalized_unit_id)
	_remove_unit_label(normalized_unit_id)
	if _selected_unit_id == normalized_unit_id:
		clear_unit_selection()

func _sync_marker_selection_states() -> void:
	for unit_id_variant in _markers_by_unit_id.keys():
		var unit_id: String = str(unit_id_variant)
		var marker: Node2D = _markers_by_unit_id[unit_id] as Node2D
		if marker == null or not marker.has_method("set_selected"):
			continue
		marker.call("set_selected", unit_id == _selected_unit_id)

func _ensure_unit_overlay_layers() -> void:
	if _unit_path_layer != null and is_instance_valid(_unit_path_layer):
		return
	_unit_path_layer = Node2D.new()
	_unit_path_layer.name = "UnitPathLayer"
	_unit_path_layer.z_index = 3
	_unit_path_layer.set_script(UnitPathLayerScript)
	add_child(_unit_path_layer)

func _rebuild_tile_positions(next_map_layout: Dictionary) -> void:
	_tile_positions_by_id = {}
	_city_tile_ids = {}
	var map_payload: Dictionary = next_map_layout.get("map", {}) as Dictionary
	_merge_tile_positions_from_list(map_payload.get("tiles", []))
	_merge_tile_positions_from_list(next_map_layout.get("tiles", []))
	_merge_world_tile_positions(WorldStore.world)

func _merge_world_tile_positions(world_payload: Dictionary) -> void:
	if world_payload.is_empty():
		return
	var world_map: Dictionary = world_payload.get("map", {}) as Dictionary
	_merge_tile_positions_from_list(world_map.get("tiles", []))

func _merge_tile_positions_from_list(raw_tiles: Variant) -> void:
	if not (raw_tiles is Array):
		return
	for tile_variant in raw_tiles:
		if not (tile_variant is Dictionary):
			continue
		var tile: Dictionary = tile_variant as Dictionary
		var tile_id: String = str(tile.get("id", "")).strip_edges()
		if tile_id == "":
			continue
		_tile_positions_by_id[tile_id] = Vector2i(int(tile.get("x", 0)), int(tile.get("y", 0)))
		if str(tile.get("type", "")).strip_edges() == "city":
			_city_tile_ids[tile_id] = true

func _rebuild_backend_city_visual_footprints(next_map_layout: Dictionary) -> void:
	_city_visual_backend_profile_by_tile_id = {}
	_city_visual_backend_footprint_by_tile_id = {}
	_city_visual_backend_anchor_count = 0
	_city_visual_backend_match_count = 0
	_city_visual_backend_active_profile_ids = {}
	_city_visual_backend_profile_coverage = {}
	_city_visual_anchor_last_source_mode = CITY_QUEUE_ANCHOR_SOURCE_MODE_DEFAULT
	_city_visual_anchor_last_backend_footprint_id = ""
	_city_visual_anchor_last_backend_matched_tile_id = ""
	_city_visual_anchor_last_backend_footprint_tile_count = 0
	_city_visual_anchor_last_backend_profile_resolved = false
	_city_visual_anchor_last_selection_reason = "fallback_default"
	_city_visual_anchor_last_queue_anchor_source = CITY_QUEUE_ANCHOR_DIRECTION_SOURCE_LOCAL
	_city_visual_anchor_last_backend_exit_anchor_id = ""
	_city_visual_anchor_last_backend_road_exit_direction = ""
	var map_payload: Dictionary = next_map_layout.get("map", {}) as Dictionary
	_merge_backend_city_visual_footprints_from_tiles(map_payload.get("tiles", []), "map.tiles")
	_merge_backend_city_visual_footprints_from_tiles(next_map_layout.get("tiles", []), "layout.tiles")
	_merge_backend_city_visual_footprints_from_layered_payload(next_map_layout)
	_merge_backend_city_visual_footprints_from_world(WorldStore.world)

func _merge_backend_city_visual_footprints_from_world(world_payload: Dictionary) -> void:
	if world_payload.is_empty():
		return
	var world_map: Dictionary = world_payload.get("map", {}) as Dictionary
	_merge_backend_city_visual_footprints_from_tiles(world_map.get("tiles", []), "world.map.tiles")

func _merge_backend_city_visual_footprints_from_tiles(raw_tiles: Variant, source: String) -> void:
	if not (raw_tiles is Array):
		return
	for tile_variant in raw_tiles:
		if not (tile_variant is Dictionary):
			continue
		var tile: Dictionary = tile_variant as Dictionary
		var footprint_id := str(tile.get("footprintId", tile.get("footprint_id", ""))).strip_edges()
		if footprint_id == "":
			continue
		var anchor_ids: Array = _string_array_from_variant(tile.get("footprintTileIds", tile.get("footprint_tile_ids", [])))
		for key in ["id", "tileId", "sourceTileId", "footprintAnchorTileId", "footprint_anchor_tile_id"]:
			var anchor_id := str(tile.get(key, "")).strip_edges()
			if anchor_id != "" and not anchor_ids.has(anchor_id):
				anchor_ids.append(anchor_id)
		_register_backend_city_visual_footprint(footprint_id, anchor_ids, source)

func _merge_backend_city_visual_footprints_from_layered_payload(next_map_layout: Dictionary) -> void:
	var layered_payload := _resolve_backend_city_visual_layered_payload(next_map_layout)
	if layered_payload.is_empty():
		return
	var city_gate_layer: Dictionary = {}
	var city_gate_layer_variant: Variant = layered_payload.get("city_gate_anchor_layer", {})
	if city_gate_layer_variant is Dictionary:
		city_gate_layer = city_gate_layer_variant as Dictionary
	if city_gate_layer.is_empty():
		return
	for list_key in ["visible_objects", "anchor_upserts", "render_objects", "render_projection_samples"]:
		var raw_objects: Variant = city_gate_layer.get(list_key, [])
		if not (raw_objects is Array):
			continue
		for object_variant in raw_objects as Array:
			if not (object_variant is Dictionary):
				continue
			_register_backend_city_visual_footprint_from_layer_object(object_variant as Dictionary, "city_gate_anchor_layer.%s" % list_key)

func _resolve_backend_city_visual_layered_payload(next_map_layout: Dictionary) -> Dictionary:
	if next_map_layout.has("city_gate_anchor_layer"):
		return next_map_layout
	for key in ["layeredAdapter", "layered", "layers"]:
		var nested_variant: Variant = next_map_layout.get(key, {})
		if not (nested_variant is Dictionary):
			continue
		var nested: Dictionary = nested_variant as Dictionary
		if nested.has("city_gate_anchor_layer"):
			return nested
	return {}

func _register_backend_city_visual_footprint_from_layer_object(object_data: Dictionary, source: String) -> void:
	var footprint_id := str(object_data.get("footprintId", object_data.get("footprint_id", ""))).strip_edges()
	if footprint_id == "":
		return
	var tile_ids: Array = _string_array_from_variant(object_data.get("footprintTileIds", object_data.get("footprint_tile_ids", [])))
	for key in ["sourceTileId", "source_tile_id", "tileId", "tile_id", "id", "object_id", "footprintAnchorTileId", "footprint_anchor_tile_id"]:
		var tile_id := str(object_data.get(key, "")).strip_edges()
		if tile_id != "" and not tile_ids.has(tile_id):
			tile_ids.append(tile_id)
	_register_backend_city_visual_footprint(footprint_id, tile_ids, source)

func _register_backend_city_visual_footprint(footprint_id: String, raw_tile_ids: Array, source: String) -> void:
	var normalized_footprint_id := footprint_id.strip_edges()
	if normalized_footprint_id == "":
		return
	var profile_id := _resolve_main_world_city_visual_profile_id_for_footprint(normalized_footprint_id)
	if profile_id == "" or not _city_visual_anchor_profiles_by_id.has(profile_id):
		return
	var tile_ids: Array = []
	for tile_id_variant in raw_tile_ids:
		var tile_id := str(tile_id_variant).strip_edges()
		if tile_id != "" and not tile_ids.has(tile_id):
			tile_ids.append(tile_id)
	if tile_ids.is_empty():
		return
	_city_visual_backend_anchor_count += 1
	_city_visual_backend_match_count += tile_ids.size()
	var footprint_record := {
		"footprintId": normalized_footprint_id,
		"footprintTileCount": tile_ids.size(),
		"profileId": profile_id,
		"source": source,
	}
	_register_backend_city_visual_profile_coverage(profile_id, normalized_footprint_id, tile_ids.size(), source)
	for tile_id_variant in tile_ids:
		var tile_id := str(tile_id_variant).strip_edges()
		if tile_id == "":
			continue
		_city_visual_backend_profile_by_tile_id[tile_id] = profile_id
		_city_visual_backend_footprint_by_tile_id[tile_id] = footprint_record

func _register_backend_city_visual_profile_coverage(profile_id: String, footprint_id: String, tile_count: int, source: String) -> void:
	var normalized_profile_id := profile_id.strip_edges()
	var normalized_footprint_id := footprint_id.strip_edges()
	if normalized_profile_id == "" or normalized_footprint_id == "":
		return
	var record: Dictionary = {}
	var existing_record_variant: Variant = _city_visual_backend_profile_coverage.get(normalized_profile_id, {})
	if existing_record_variant is Dictionary:
		record = (existing_record_variant as Dictionary).duplicate(true)
	if record.is_empty():
		record = {
			"profileId": normalized_profile_id,
			"footprintCount": 0,
			"matchedTileCount": 0,
			"footprintIds": [],
			"sources": [],
		}
	var footprint_ids: Array = record.get("footprintIds", []) as Array
	if not footprint_ids.has(normalized_footprint_id):
		footprint_ids.append(normalized_footprint_id)
		record["footprintCount"] = int(record.get("footprintCount", 0)) + 1
	record["matchedTileCount"] = int(record.get("matchedTileCount", 0)) + maxi(0, tile_count)
	var sources: Array = record.get("sources", []) as Array
	var normalized_source := source.strip_edges()
	if normalized_source != "" and not sources.has(normalized_source):
		sources.append(normalized_source)
	record["footprintIds"] = footprint_ids
	record["sources"] = sources
	_city_visual_backend_profile_coverage[normalized_profile_id] = record

func _string_array_from_variant(raw_values: Variant) -> Array:
	var values: Array = []
	if raw_values is Array:
		for value_variant in raw_values as Array:
			var value := str(value_variant).strip_edges()
			if value != "" and not values.has(value):
				values.append(value)
	return values

func _resolve_main_world_city_visual_profile_id_for_footprint(footprint_id: String) -> String:
	var normalized_footprint_id := footprint_id.strip_edges()
	if normalized_footprint_id == "":
		return ""
	if _city_visual_anchor_profile_by_footprint_id.has(normalized_footprint_id):
		return str(_city_visual_anchor_profile_by_footprint_id.get(normalized_footprint_id, "")).strip_edges()
	if normalized_footprint_id.begins_with("ai_city_") and normalized_footprint_id.find("3x3") >= 0 and _city_visual_anchor_profiles_by_id.has("ai_city_3x3_template_v1"):
		return "ai_city_3x3_template_v1"
	if normalized_footprint_id.begins_with("system_city_"):
		if normalized_footprint_id.find("9x9") >= 0 and _city_visual_anchor_profiles_by_id.has("neutral_city_9x9_template_v1"):
			return "neutral_city_9x9_template_v1"
		if normalized_footprint_id.find("7x7") >= 0 and _city_visual_anchor_profiles_by_id.has("neutral_city_7x7_template_v1"):
			return "neutral_city_7x7_template_v1"
		if normalized_footprint_id.find("5x5") >= 0 and _city_visual_anchor_profiles_by_id.has("neutral_city_5x5_template_v1"):
			return "neutral_city_5x5_template_v1"
		if _city_visual_anchor_profiles_by_id.has("neutral_city_3x3_template_v1"):
			return "neutral_city_3x3_template_v1"
	if normalized_footprint_id.begins_with("player_city_") and normalized_footprint_id.find("3x3") >= 0 and _city_visual_anchor_profiles_by_id.has("player_city_3x3_template_v1"):
		return "player_city_3x3_template_v1"
	return ""

func _has_tile_marker_position(tile_id: String) -> bool:
	var normalized_tile_id := tile_id.strip_edges()
	return (
		normalized_tile_id != ""
		and (
			_tile_positions_by_id.has(normalized_tile_id)
			or MAIN_WORLD_SCENARIO_TILE_FALLBACK_COORDS.has(normalized_tile_id)
		)
	)

func _resolve_tile_coord(tile_id: String) -> Vector2i:
	var normalized_tile_id := tile_id.strip_edges()
	if normalized_tile_id == "":
		return Vector2i.ZERO
	var tile_coord := Vector2i.ZERO
	if _tile_positions_by_id.has(normalized_tile_id):
		tile_coord = _tile_positions_by_id[normalized_tile_id] as Vector2i
	elif MAIN_WORLD_SCENARIO_TILE_FALLBACK_COORDS.has(normalized_tile_id):
		tile_coord = MAIN_WORLD_SCENARIO_TILE_FALLBACK_COORDS[normalized_tile_id] as Vector2i
	else:
		return Vector2i.ZERO
	return _project_tile_coord_for_active_map(normalized_tile_id, tile_coord)

func _project_tile_coord_for_active_map(tile_id: String, tile_coord: Vector2i) -> Vector2i:
	if not _is_main_world_cell_projection_active():
		return tile_coord
	if not _looks_like_seed_scenario_tile(tile_id, tile_coord):
		return tile_coord
	return Vector2i(
		MAIN_WORLD_HOME_CITY_ANCHOR_COORD.x + tile_coord.x - MAIN_WORLD_SCENARIO_ANCHOR_COORD.x,
		MAIN_WORLD_HOME_CITY_ANCHOR_COORD.y + tile_coord.y - MAIN_WORLD_SCENARIO_ANCHOR_COORD.y
	)

func _is_main_world_cell_projection_active() -> bool:
	if _map_grid == null or not is_instance_valid(_map_grid):
		return false
	if _map_grid.has_method("uses_main_world_cell_projection"):
		return bool(_map_grid.call("uses_main_world_cell_projection"))
	var map_layout_world_id := str(WorldStore.map_layout.get("world_id", WorldStore.map_layout.get("worldId", ""))).strip_edges()
	return map_layout_world_id.find("real_map_data_1km") >= 0 or map_layout_world_id.find("unified_aoi") >= 0

func _looks_like_seed_scenario_tile(tile_id: String, tile_coord: Vector2i) -> bool:
	if not tile_id.begins_with("tile_"):
		return false
	if tile_coord.x >= 1000 or tile_coord.y >= 1000:
		return false
	return abs(tile_coord.x - MAIN_WORLD_SCENARIO_ANCHOR_COORD.x) <= 128 and abs(tile_coord.y - MAIN_WORLD_SCENARIO_ANCHOR_COORD.y) <= 128

func _index_units(raw_units: Variant) -> Dictionary:
	var indexed: Dictionary = {}
	if not (raw_units is Array):
		return indexed

	for unit_variant in raw_units:
		if not (unit_variant is Dictionary):
			continue
		var unit: Dictionary = unit_variant as Dictionary
		var unit_id: String = str(unit.get("id", "")).strip_edges()
		if unit_id == "":
			continue
		indexed[unit_id] = unit

	return indexed

func _should_hide_city_stationed_unit(unit: Dictionary) -> bool:
	if not _is_main_world_cell_projection_active():
		return false
	if _unit_should_play_march_loop(unit):
		return false
	return _resolve_city_stationed_tile_id(unit) != ""

func _resolve_city_stationed_tile_id(unit: Dictionary) -> String:
	var map_visual: Dictionary = unit.get("mapVisual", {}) as Dictionary
	for key in ["currentTileId", "tileId", "stationedTileId"]:
		var tile_id: String = str(map_visual.get(key, "")).strip_edges()
		if _is_city_stationed_tile_id(tile_id):
			return tile_id
	for key in ["currentTileId", "tileId", "stationedTileId"]:
		var tile_id: String = str(unit.get(key, "")).strip_edges()
		if _is_city_stationed_tile_id(tile_id):
			return tile_id
	return ""

func _is_city_stationed_tile_id(tile_id: String) -> bool:
	var normalized_tile_id: String = tile_id.strip_edges()
	if normalized_tile_id == "":
		return false
	if _city_tile_ids.has(normalized_tile_id):
		return true
	return _is_main_world_cell_projection_active() and MAIN_WORLD_SCENARIO_CITY_TILE_IDS.has(normalized_tile_id)

func _ensure_marker(unit_id: String, unit: Dictionary) -> Node2D:
	if _markers_by_unit_id.has(unit_id):
		var existing: Node2D = _markers_by_unit_id[unit_id] as Node2D
		_update_marker_style(existing, unit)
		return existing

	var marker := Node2D.new()
	marker.name = "UnitMarker_%s" % unit_id
	marker.z_index = 4
	marker.set_script(UnitMarkerScript)
	add_child(marker)
	_markers_by_unit_id[unit_id] = marker
	_update_marker_style(marker, unit)
	return marker

func _update_marker_style(marker: Node2D, unit: Dictionary) -> void:
	if marker == null:
		return
	var faction_id: String = _resolve_unit_faction_id(unit)
	marker.set("radius", marker_radius)
	marker.call("set_faction_color", _resolve_unit_banner_color(unit, faction_id))
	if marker.has_method("set_visual_type"):
		marker.call("set_visual_type", _resolve_visual_type(unit))
	if marker.has_method("set_formation_slots"):
		marker.call("set_formation_slots", _resolve_formation_slots(unit))
	if marker.has_method("set_identity_kind"):
		marker.call("set_identity_kind", _resolve_identity_kind(unit))
	if marker.has_method("set_selected"):
		marker.call("set_selected", str(unit.get("id", "")).strip_edges() == _selected_unit_id)

func _resolve_visual_type(unit: Dictionary) -> String:
	var map_visual: Dictionary = unit.get("mapVisual", {}) as Dictionary
	var visual_type: String = str(map_visual.get("visualType", "")).strip_edges().to_lower()
	match visual_type:
		VISUAL_TYPE_INFANTRY:
			return VISUAL_TYPE_INFANTRY
		VISUAL_TYPE_CAVALRY:
			return VISUAL_TYPE_CAVALRY
		VISUAL_TYPE_ARCHER:
			return VISUAL_TYPE_ARCHER
		_:
			return DEFAULT_VISUAL_TYPE

func _resolve_formation_slots(unit: Dictionary) -> Array:
	var map_visual: Dictionary = unit.get("mapVisual", {}) as Dictionary
	var raw_slots: Variant = map_visual.get("formationSlots", [])
	var slots: Array = []
	if not (raw_slots is Array):
		return slots
	for slot_variant in raw_slots as Array:
		if not (slot_variant is Dictionary):
			continue
		var slot: Dictionary = slot_variant as Dictionary
		var visual_type: String = str(slot.get("visualType", "")).strip_edges().to_lower()
		match visual_type:
			VISUAL_TYPE_INFANTRY, VISUAL_TYPE_CAVALRY, VISUAL_TYPE_ARCHER:
				pass
			_:
				visual_type = DEFAULT_VISUAL_TYPE
		slots.append({
			"role": str(slot.get("role", "")),
			"heroId": str(slot.get("heroId", "")),
			"heroName": str(slot.get("heroName", "")),
			"troopType": str(slot.get("troopType", "")),
			"visualType": visual_type,
		})
		if slots.size() >= 3:
			break
	return slots

func _resolve_unit_faction_id(unit: Dictionary) -> String:
	var faction_id: String = str(unit.get("faction", unit.get("factionId", ""))).strip_edges()
	return faction_id

func _resolve_identity_kind(unit: Dictionary) -> String:
	var ai_player_id: String = str(unit.get("aiPlayerId", "")).strip_edges()
	if ai_player_id != "":
		return IDENTITY_KIND_AI
	var faction_id: String = _resolve_unit_faction_id(unit)
	var normalized_faction: String = faction_id.strip_edges().to_lower()
	if normalized_faction in NEUTRAL_FACTION_HINTS:
		return IDENTITY_KIND_NEUTRAL
	var human_faction_id: String = _resolve_human_faction_id()
	if human_faction_id != "" and normalized_faction == human_faction_id:
		return IDENTITY_KIND_HUMAN
	return IDENTITY_KIND_AI

func _resolve_human_faction_id() -> String:
	var session_faction_id: String = SessionStore.faction_id.strip_edges().to_lower()
	if session_faction_id != "":
		return session_faction_id
	return "player"

func _resolve_unit_position(unit: Dictionary, fallback: Vector2) -> Vector2:
	var march_display: Dictionary = _resolve_unit_march_display_position(unit, fallback)
	if bool(march_display.get("ok", false)):
		return march_display.get("position", fallback) as Vector2
	var tile_id: String = str(unit.get("tileId", "")).strip_edges()
	var map_visual: Dictionary = unit.get("mapVisual", {}) as Dictionary
	var target_tile_id: String = _resolve_unit_target_tile_id(unit, map_visual)
	return _resolve_unit_tile_anchor_position(
		tile_id,
		fallback,
		target_tile_id,
		_resolve_unit_exit_anchor_id(unit, map_visual),
		_resolve_unit_road_exit_direction(unit, map_visual),
		_resolve_unit_exit_anchor_source(unit, map_visual),
	)

func _resolve_unit_tile_anchor_position(
	tile_id: String,
	fallback: Vector2,
	target_tile_id: String = "",
	preferred_anchor_id: String = "",
	preferred_direction: String = "",
	preferred_source: String = CITY_QUEUE_ANCHOR_DIRECTION_SOURCE_LOCAL,
) -> Vector2:
	if tile_id == "":
		return fallback
	if not _has_tile_marker_position(tile_id):
		return fallback
	if _map_grid == null or not _map_grid.has_method("tile_to_screen_position"):
		return fallback

	var tile_coord: Vector2i = _resolve_tile_coord(tile_id)
	var base_position: Vector2
	if _map_grid.has_method("tile_id_to_screen_position"):
		base_position = _map_grid.tile_id_to_screen_position(tile_id, tile_coord.x, tile_coord.y)
	else:
		base_position = _map_grid.tile_to_screen_position(tile_coord.x, tile_coord.y)
	var queue_direction := preferred_direction
	if queue_direction == "":
		queue_direction = _resolve_city_visual_queue_direction(tile_id, target_tile_id)
	return _apply_main_world_city_visual_staging_offset(
		tile_id,
		base_position + Vector2(0.0, marker_vertical_offset),
		queue_direction,
		preferred_anchor_id,
		preferred_source,
	)

func _sync_time_interpolated_marker_positions() -> void:
	for unit_id_variant in _prev_units_by_id.keys():
		var unit_id: String = str(unit_id_variant)
		if not _markers_by_unit_id.has(unit_id):
			continue
		var marker: Node2D = _markers_by_unit_id[unit_id] as Node2D
		if marker == null:
			continue
		var unit: Dictionary = _prev_units_by_id[unit_id] as Dictionary
		var march_display: Dictionary = _resolve_unit_march_display_position(unit, marker.position)
		if not bool(march_display.get("ok", false)):
			continue
		_cancel_marker_tween(marker)
		marker.position = march_display.get("position", marker.position) as Vector2
		if marker.has_method("set_moving"):
			marker.call("set_moving", true, march_display.get("direction", _resolve_unit_march_direction(unit)) as Vector2)

func _sync_marker_positions() -> void:
	for unit_id_variant in _prev_units_by_id.keys():
		var unit_id: String = str(unit_id_variant)
		if not _markers_by_unit_id.has(unit_id):
			continue
		var marker: Node2D = _markers_by_unit_id[unit_id] as Node2D
		if marker == null:
			continue
		var unit: Dictionary = _prev_units_by_id[unit_id] as Dictionary
		var target_position: Vector2 = _resolve_unit_position(unit, marker.position)
		_set_marker_position(marker, target_position)
		_sync_marker_march_animation(marker, unit)

func _resolve_unit_id_at_global_position(global_position: Vector2) -> String:
	var selected_unit_id: String = ""
	var selected_priority: float = UNIT_SELECTION_HIT_RADIUS
	for unit_id_variant in _markers_by_unit_id.keys():
		var unit_id: String = str(unit_id_variant)
		var marker: Node2D = _markers_by_unit_id[unit_id] as Node2D
		if marker == null:
			continue
		var distance: float = marker.global_position.distance_to(global_position)
		var hit_priority: float = _resolve_unit_hit_priority(unit_id, distance)
		if distance <= UNIT_SELECTION_HIT_RADIUS and hit_priority <= selected_priority:
			selected_unit_id = unit_id
			selected_priority = hit_priority
	return selected_unit_id

func _resolve_unit_hit_priority(unit_id: String, distance: float) -> float:
	var priority: float = distance
	if unit_id == _selected_unit_id:
		priority -= 6.0
	return priority

func _sync_unit_path_layer(units_by_id: Dictionary) -> void:
	_ensure_unit_overlay_layers()
	if _unit_path_layer == null or not is_instance_valid(_unit_path_layer):
		return
	if not _unit_path_layer.has_method("set_unit_path_data"):
		return
	var path_data_by_id: Dictionary = {}
	for unit_id_variant in units_by_id.keys():
		var unit_id: String = str(unit_id_variant)
		if _city_stationed_hidden_unit_ids.has(unit_id):
			continue
		var unit: Dictionary = units_by_id[unit_id] as Dictionary
		var unit_path_data: Dictionary = _build_unit_path_data(unit)
		if unit_path_data.is_empty():
			continue
		path_data_by_id[unit_id] = unit_path_data
	_unit_path_layer.call("set_unit_path_data", path_data_by_id)

func _build_unit_path_data(unit: Dictionary) -> Dictionary:
	var map_visual: Dictionary = unit.get("mapVisual", {}) as Dictionary
	var points: Array = _resolve_unit_path_points(unit, map_visual)
	var target_position := Vector2.ZERO
	var has_target: bool = false
	var target_tile_id: String = _resolve_unit_target_tile_id(unit, map_visual)
	if target_tile_id != "" and _has_tile_marker_position(target_tile_id):
		target_position = _resolve_tile_marker_position(target_tile_id, Vector2.ZERO)
		has_target = true
	if points.size() < 2 and not has_target:
		return {}
	return {
		"points": points,
		"targetPosition": target_position,
		"hasTarget": has_target,
		"pathColor": _resolve_unit_path_color(unit),
		"targetColor": _resolve_unit_target_color(unit),
	}

func _resolve_unit_path_points(unit: Dictionary, map_visual: Dictionary) -> Array:
	var points: Array = []
	for tile_id in _resolve_unit_path_tile_ids(unit, map_visual):
		if not _has_tile_marker_position(tile_id):
			continue
		var tile_point: Vector2 = _resolve_tile_marker_position(tile_id, Vector2.ZERO)
		points.append(tile_point)
	if points.size() < 2:
		var start_tile_id: String = _resolve_unit_path_start_tile_id(unit, map_visual)
		var target_tile_id: String = _resolve_unit_target_tile_id(unit, map_visual)
		if start_tile_id != "" and target_tile_id != "" and start_tile_id != target_tile_id:
			if not _has_tile_marker_position(start_tile_id) or not _has_tile_marker_position(target_tile_id):
				return points
			var start_point: Vector2 = _resolve_tile_marker_position(start_tile_id, Vector2.ZERO)
			var end_point: Vector2 = _resolve_tile_marker_position(target_tile_id, Vector2.ZERO)
			points = [start_point, end_point]
	return points

func _resolve_unit_path_tile_ids(unit: Dictionary, map_visual: Dictionary) -> Array[String]:
	var tile_ids: Array[String] = []
	_append_path_tile_ids(tile_ids, map_visual.get("currentPath", []))
	if tile_ids.size() >= 2:
		return tile_ids
	var march: Dictionary = unit.get("march", {}) as Dictionary
	_append_path_tile_ids(tile_ids, march.get("path", []))
	if tile_ids.size() >= 2:
		return tile_ids
	var origin_tile_id := _resolve_unit_path_start_tile_id(unit, map_visual)
	var target_tile_id := _resolve_unit_target_tile_id(unit, map_visual)
	if origin_tile_id != "" and target_tile_id != "" and origin_tile_id != target_tile_id:
		tile_ids.clear()
		tile_ids.append(origin_tile_id)
		tile_ids.append(target_tile_id)
	return tile_ids

func _append_path_tile_ids(target_tile_ids: Array[String], raw_path: Variant) -> void:
	if not (raw_path is Array):
		return
	for tile_id_variant in raw_path as Array:
		var tile_id: String = str(tile_id_variant).strip_edges()
		if tile_id == "" or target_tile_ids.has(tile_id):
			continue
		target_tile_ids.append(tile_id)

func _resolve_unit_target_tile_id(unit: Dictionary, map_visual: Dictionary) -> String:
	var target_tile_id: String = str(map_visual.get("targetTileId", "")).strip_edges()
	if target_tile_id != "":
		return target_tile_id
	var march: Dictionary = unit.get("march", {}) as Dictionary
	target_tile_id = str(march.get("targetTileId", "")).strip_edges()
	if target_tile_id != "":
		return target_tile_id
	return str(unit.get("targetTileId", "")).strip_edges()

func _resolve_unit_exit_anchor_id(unit: Dictionary, map_visual: Dictionary) -> String:
	var exit_anchor_id: String = str(map_visual.get("exitAnchorId", "")).strip_edges()
	if exit_anchor_id != "":
		return exit_anchor_id
	var march: Dictionary = unit.get("march", {}) as Dictionary
	exit_anchor_id = str(march.get("exitAnchorId", "")).strip_edges()
	if exit_anchor_id != "":
		return exit_anchor_id
	return str(unit.get("exitAnchorId", "")).strip_edges()

func _resolve_unit_road_exit_direction(unit: Dictionary, map_visual: Dictionary) -> String:
	var direction: String = str(map_visual.get("roadExitDirection", "")).strip_edges()
	if direction != "":
		return direction
	var march: Dictionary = unit.get("march", {}) as Dictionary
	direction = str(march.get("roadExitDirection", "")).strip_edges()
	if direction != "":
		return direction
	return str(unit.get("roadExitDirection", "")).strip_edges()

func _resolve_unit_exit_anchor_source(unit: Dictionary, map_visual: Dictionary) -> String:
	if _resolve_unit_exit_anchor_id(unit, map_visual) != "" or _resolve_unit_road_exit_direction(unit, map_visual) != "":
		return CITY_QUEUE_ANCHOR_DIRECTION_SOURCE_BACKEND
	return CITY_QUEUE_ANCHOR_DIRECTION_SOURCE_LOCAL

func _resolve_unit_path_start_tile_id(unit: Dictionary, map_visual: Dictionary) -> String:
	var march: Dictionary = unit.get("march", {}) as Dictionary
	var origin_tile_id: String = str(march.get("originTileId", "")).strip_edges()
	if origin_tile_id != "":
		return origin_tile_id
	origin_tile_id = str(map_visual.get("originTileId", "")).strip_edges()
	if origin_tile_id != "":
		return origin_tile_id
	return str(unit.get("tileId", "")).strip_edges()

func _resolve_unit_march_display_position(unit: Dictionary, fallback: Vector2) -> Dictionary:
	if not _unit_should_play_march_loop(unit):
		return {"ok": false, "reason": "not_marching"}
	var map_visual: Dictionary = unit.get("mapVisual", {}) as Dictionary
	var path_tile_ids: Array[String] = _resolve_unit_path_tile_ids(unit, map_visual)
	if path_tile_ids.size() < 2:
		return {"ok": false, "reason": "path_too_short"}
	var progress_result: Dictionary = _resolve_unit_march_progress(unit, map_visual)
	if not bool(progress_result.get("ok", false)):
		return {"ok": false, "reason": str(progress_result.get("reason", "progress_unavailable"))}

	var points: Array[Vector2] = []
	var backend_exit_anchor_id := _resolve_unit_exit_anchor_id(unit, map_visual)
	var backend_road_exit_direction := _resolve_unit_road_exit_direction(unit, map_visual)
	var exit_anchor_source := _resolve_unit_exit_anchor_source(unit, map_visual)
	for index in range(path_tile_ids.size()):
		var tile_id: String = path_tile_ids[index]
		if not _has_tile_marker_position(tile_id):
			continue
		var next_tile_id := ""
		if index < path_tile_ids.size() - 1:
			next_tile_id = path_tile_ids[index + 1]
		points.append(
			_resolve_unit_tile_anchor_position(
				tile_id,
				fallback,
				next_tile_id,
				backend_exit_anchor_id if index == 0 else "",
				backend_road_exit_direction if index == 0 else "",
				exit_anchor_source if index == 0 else CITY_QUEUE_ANCHOR_DIRECTION_SOURCE_LOCAL,
			)
		)
	if points.size() < 2:
		return {"ok": false, "reason": "points_too_short"}

	var interpolation: Dictionary = _interpolate_unit_path_points(points, float(progress_result.get("progress", 0.0)))
	interpolation["ok"] = true
	interpolation["progress"] = float(progress_result.get("progress", 0.0))
	interpolation["startedAt"] = str(progress_result.get("startedAt", ""))
	interpolation["estimatedArrivalAt"] = str(progress_result.get("estimatedArrivalAt", ""))
	interpolation["durationSec"] = float(progress_result.get("durationSec", 0.0))
	interpolation["pathTileIds"] = path_tile_ids
	return interpolation

func _resolve_unit_march_progress(unit: Dictionary, map_visual: Dictionary) -> Dictionary:
	var march: Dictionary = unit.get("march", {}) as Dictionary
	var started_at: String = str(march.get("startedAt", "")).strip_edges()
	if started_at == "":
		started_at = str(map_visual.get("marchStartedAt", map_visual.get("startedAt", ""))).strip_edges()
	var estimated_arrival_at: String = str(march.get("estimatedArrivalAt", "")).strip_edges()
	if estimated_arrival_at == "":
		estimated_arrival_at = str(map_visual.get("etaAt", map_visual.get("estimatedArrivalAt", ""))).strip_edges()
	if started_at == "" or estimated_arrival_at == "":
		return {"ok": false, "reason": "missing_time"}

	var started_unix: int = _parse_iso8601_to_unix_seconds(started_at)
	var arrival_unix: int = _parse_iso8601_to_unix_seconds(estimated_arrival_at)
	var duration_sec: float = float(march.get("durationSec", 0.0))
	if arrival_unix <= started_unix and duration_sec > 0.0 and started_unix > 0:
		arrival_unix = started_unix + int(ceil(duration_sec))
	if started_unix <= 0 or arrival_unix <= started_unix:
		return {"ok": false, "reason": "invalid_time"}

	var total_duration: float = float(arrival_unix - started_unix)
	var now_unix: float = Time.get_unix_time_from_system()
	var progress: float = clampf((now_unix - float(started_unix)) / total_duration, 0.0, 1.0)
	return {
		"ok": true,
		"progress": progress,
		"startedAt": started_at,
		"estimatedArrivalAt": estimated_arrival_at,
		"durationSec": total_duration,
	}

func _interpolate_unit_path_points(points: Array[Vector2], progress: float) -> Dictionary:
	if points.size() <= 0:
		return {"position": Vector2.ZERO, "direction": Vector2.ZERO, "segmentIndex": -1}
	if points.size() == 1:
		return {"position": points[0], "direction": Vector2.ZERO, "segmentIndex": 0}
	var segment_lengths: Array[float] = []
	var total_length: float = 0.0
	for index in range(points.size() - 1):
		var segment_length: float = points[index].distance_to(points[index + 1])
		segment_lengths.append(segment_length)
		total_length += segment_length
	if total_length <= 0.001:
		return {"position": points[0], "direction": Vector2.ZERO, "segmentIndex": 0}

	var target_distance: float = total_length * clampf(progress, 0.0, 1.0)
	var travelled: float = 0.0
	for index in range(segment_lengths.size()):
		var length: float = segment_lengths[index]
		var from_point: Vector2 = points[index]
		var to_point: Vector2 = points[index + 1]
		if target_distance <= travelled + length or index == segment_lengths.size() - 1:
			var local_t: float = 1.0 if length <= 0.001 else clampf((target_distance - travelled) / length, 0.0, 1.0)
			var direction: Vector2 = (to_point - from_point).normalized() if from_point.distance_to(to_point) > 0.001 else Vector2.ZERO
			return {
				"position": from_point.lerp(to_point, local_t),
				"direction": direction,
				"segmentIndex": index,
			}
		travelled += length
	return {
		"position": points[points.size() - 1],
		"direction": (points[points.size() - 1] - points[points.size() - 2]).normalized(),
		"segmentIndex": points.size() - 2,
	}

func _sync_unit_labels(units_by_id: Dictionary) -> void:
	_label_avoidance_applied_count = 0
	_label_clamp_applied_count = 0
	_label_density_compact_count = 0
	_label_density_suppressed_count = 0
	_label_density_suppressed_unit_ids = {}
	for unit_id_variant in _sort_unit_label_ids_by_priority(units_by_id):
		var unit_id: String = str(unit_id_variant)
		if not _markers_by_unit_id.has(unit_id):
			continue
		var marker: Node2D = _markers_by_unit_id[unit_id] as Node2D
		if marker == null:
			continue
		var unit: Dictionary = units_by_id[unit_id] as Dictionary
		if _should_suppress_unit_label_for_density(unit_id, unit, marker.position):
			_remove_unit_label(unit_id)
			_label_density_suppressed_count += 1
			_label_density_suppressed_unit_ids[unit_id] = true
			continue
		_upsert_unit_label(unit_id, unit, marker.position)
	for label_unit_id_variant in _unit_labels_by_id.keys():
		var label_unit_id: String = str(label_unit_id_variant)
		if units_by_id.has(label_unit_id):
			continue
		_remove_unit_label(label_unit_id)

func _upsert_unit_label(unit_id: String, unit: Dictionary, marker_position: Vector2) -> void:
	var density_compacted: bool = _should_compact_unit_label(unit_id, unit, marker_position)
	var label_text: String = _resolve_unit_label_text(unit, density_compacted)
	if label_text == "":
		_remove_unit_label(unit_id)
		return
	var label: Control
	if _unit_labels_by_id.has(unit_id):
		label = _unit_labels_by_id[unit_id] as Control
	else:
		label = _make_unit_label_panel(unit_id)
		add_child(label)
		_unit_labels_by_id[unit_id] = label
	if label == null:
		return
	var text_label := _get_unit_label_text_label(label)
	if text_label == null:
		return
	_apply_unit_label_style(label, text_label, unit_id == _selected_unit_id)
	text_label.text = label_text
	var label_size := _measure_unit_label_size(label, text_label)
	var placement: Dictionary = _resolve_unit_label_position(unit_id, unit, marker_position, label_size)
	label.position = placement.get("position", marker_position)
	var avoidance_applied: bool = bool(placement.get("avoidanceApplied", false))
	label.set_meta("avoidance_applied", avoidance_applied)
	if avoidance_applied:
		_label_avoidance_applied_count += 1
	var clamp_applied: bool = bool(placement.get("clampApplied", false))
	label.set_meta("clamp_applied", clamp_applied)
	if clamp_applied:
		_label_clamp_applied_count += 1
	label.set_meta("density_compacted", density_compacted)
	if density_compacted:
		_label_density_compact_count += 1

func _make_unit_label_panel(unit_id: String) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.name = "UnitLabel_%s" % unit_id
	panel.z_index = 6
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var text_label := Label.new()
	text_label.name = "Text"
	text_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	text_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	text_label.clip_text = true
	text_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	text_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	text_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_child(text_label)
	return panel

func _get_unit_label_text_label(label_control: Control) -> Label:
	if label_control == null:
		return null
	if label_control is Label:
		return label_control as Label
	var child := label_control.get_node_or_null("Text")
	if child is Label:
		return child as Label
	return null

func _apply_unit_label_style(label_control: Control, text_label: Label, selected: bool) -> void:
	var panel := label_control as PanelContainer
	if panel != null:
		var style := StyleBoxFlat.new()
		style.bg_color = Color(0.020, 0.025, 0.032, 0.70 if selected else 0.58)
		style.border_color = Color(1.00, 0.78, 0.36, 0.70) if selected else Color(0.42, 0.54, 0.64, 0.34)
		style.border_width_left = 1
		style.border_width_top = 1
		style.border_width_right = 1
		style.border_width_bottom = 1
		style.corner_radius_top_left = 4
		style.corner_radius_top_right = 4
		style.corner_radius_bottom_left = 4
		style.corner_radius_bottom_right = 4
		style.content_margin_left = UNIT_LABEL_HORIZONTAL_PADDING
		style.content_margin_right = UNIT_LABEL_HORIZONTAL_PADDING
		style.content_margin_top = UNIT_LABEL_VERTICAL_PADDING
		style.content_margin_bottom = UNIT_LABEL_VERTICAL_PADDING
		panel.add_theme_stylebox_override("panel", style)
	label_control.z_index = 8 if selected else 6
	text_label.add_theme_font_size_override("font_size", UNIT_LABEL_SELECTED_FONT_SIZE if selected else UNIT_LABEL_FONT_SIZE)
	text_label.add_theme_color_override("font_color", Color(1.0, 0.92, 0.62, 1.0) if selected else Color(0.95, 0.98, 1.0, 0.98))
	text_label.add_theme_color_override("font_outline_color", Color(0.015, 0.018, 0.024, 0.96))
	text_label.add_theme_constant_override("outline_size", 4 if selected else 3)
	text_label.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.45))
	text_label.add_theme_constant_override("shadow_offset_x", 0)
	text_label.add_theme_constant_override("shadow_offset_y", 2)

func _measure_unit_label_size(label_control: Control, text_label: Label) -> Vector2:
	text_label.custom_minimum_size = Vector2.ZERO
	text_label.size = Vector2.ZERO
	text_label.reset_size()
	label_control.custom_minimum_size = Vector2.ZERO
	label_control.size = Vector2.ZERO
	label_control.reset_size()
	var natural_size := label_control.get_combined_minimum_size()
	var estimated_width := _estimate_unit_label_text_width(text_label)
	var label_width := clampf(maxf(natural_size.x, estimated_width), UNIT_LABEL_MIN_WIDTH, UNIT_LABEL_MAX_WIDTH)
	if text_label.text == "行军受阻" or text_label.text == WORLD_TROOP_MARCH_BLOCKED_RECOVERY_VISIBLE_LABEL or text_label.text == "遭遇拦截" or text_label.text == "部队撤回中":
		label_width = maxf(label_width, 116.0)
	var text_width := maxf(24.0, label_width - UNIT_LABEL_HORIZONTAL_PADDING * 2.0)
	text_label.custom_minimum_size = Vector2(text_width, 0.0)
	text_label.size = Vector2(text_width, text_label.get_combined_minimum_size().y)
	var label_height := maxf(natural_size.y, text_label.get_combined_minimum_size().y + UNIT_LABEL_VERTICAL_PADDING * 2.0)
	var label_size := Vector2(label_width, label_height)
	label_control.custom_minimum_size = label_size
	label_control.size = label_size
	return label_size

func _estimate_unit_label_text_width(text_label: Label) -> float:
	var font_size := float(text_label.get_theme_font_size("font_size"))
	if font_size <= 0.0:
		font_size = float(UNIT_LABEL_FONT_SIZE)
	var max_line_width := 0.0
	for line_variant in text_label.text.split("\n"):
		var line := str(line_variant)
		var line_width := 0.0
		for index in range(line.length()):
			var code := line.unicode_at(index)
			line_width += font_size * (0.98 if code > 127 else 0.58)
		max_line_width = maxf(max_line_width, line_width)
	return max_line_width + UNIT_LABEL_HORIZONTAL_PADDING * 2.0

func _sort_unit_label_ids_by_priority(units_by_id: Dictionary) -> Array:
	var unit_ids: Array = units_by_id.keys()
	unit_ids.sort()
	if _selected_unit_id != "" and unit_ids.has(_selected_unit_id):
		unit_ids.erase(_selected_unit_id)
		unit_ids.push_front(_selected_unit_id)
	return unit_ids

func _resolve_unit_label_position(unit_id: String, unit: Dictionary, marker_position: Vector2, label_size: Vector2) -> Dictionary:
	if unit_id == _world_troop_march_blocked_screenshot_fixture_unit_id or unit_id == _world_troop_march_intercepted_screenshot_fixture_unit_id or unit_id == _world_troop_march_retreating_screenshot_fixture_unit_id:
		var viewport := get_viewport()
		var visible_size := Vector2(960.0, 540.0)
		if viewport != null:
			visible_size = viewport.get_visible_rect().size
		return {
			"position": Vector2(visible_size.x * 0.54, visible_size.y * 0.42),
			"avoidanceApplied": false,
			"clampApplied": false,
		}
	var candidate_positions: Array[Vector2] = []
	var base_half_width: float = label_size.x * 0.5
	var base_above: float = 30.0 + label_size.y
	var side_gap: float = maxf(42.0, base_half_width + 30.0)
	for offset in UNIT_LABEL_CANDIDATE_OFFSETS:
		var x_offset: float = float(offset.x) * side_gap
		var y_offset: float = float(offset.y) * base_above
		if offset == Vector2(0.0, -1.0):
			candidate_positions.append(marker_position + Vector2(-base_half_width, -base_above))
		else:
			candidate_positions.append(marker_position + Vector2(x_offset - base_half_width, y_offset - label_size.y * 0.5))

	var avoidance_rects: Array[Rect2] = _build_label_avoidance_rects(unit_id, unit)
	var best_position: Vector2 = candidate_positions[0]
	var best_overlap: float = INF
	var best_index: int = 0
	for index in range(candidate_positions.size()):
		var candidate_position: Vector2 = candidate_positions[index]
		var candidate_rect := Rect2(
			candidate_position - Vector2(UNIT_LABEL_AVOIDANCE_PADDING, UNIT_LABEL_AVOIDANCE_PADDING),
			label_size + Vector2(UNIT_LABEL_AVOIDANCE_PADDING * 2.0, UNIT_LABEL_AVOIDANCE_PADDING * 2.0),
		)
		var overlap_area: float = 0.0
		for avoid_rect in avoidance_rects:
			overlap_area += _rect_overlap_area(candidate_rect, avoid_rect)
		if overlap_area < best_overlap:
			best_overlap = overlap_area
			best_position = candidate_position
			best_index = index
		if overlap_area <= 0.001:
			break
	var clamp_result: Dictionary = _clamp_label_position_to_viewport(best_position, label_size)
	return {
		"position": clamp_result.get("position", best_position),
		"avoidanceApplied": best_index != 0,
		"clampApplied": bool(clamp_result.get("clampApplied", false)),
	}

func _clamp_label_position_to_viewport(raw_position: Vector2, label_size: Vector2) -> Dictionary:
	var viewport := get_viewport()
	if viewport == null:
		return {"position": raw_position, "clampApplied": false}
	var visible_rect: Rect2 = viewport.get_visible_rect()
	var padding := UNIT_LABEL_AVOIDANCE_PADDING
	var max_x: float = maxf(padding, visible_rect.size.x - label_size.x - padding)
	var max_y: float = maxf(padding, visible_rect.size.y - label_size.y - padding)
	var clamped_position := Vector2(
		clampf(raw_position.x, padding, max_x),
		clampf(raw_position.y, padding, max_y),
	)
	return {
		"position": clamped_position,
		"clampApplied": clamped_position.distance_to(raw_position) > 0.10,
	}

func _build_label_avoidance_rects(unit_id: String, _unit: Dictionary) -> Array[Rect2]:
	var rects: Array[Rect2] = []
	for city_tile_id_variant in _city_tile_ids.keys():
		var city_tile_id: String = str(city_tile_id_variant)
		var city_position: Vector2 = _resolve_tile_marker_position(city_tile_id, Vector2.ZERO)
		if city_position == Vector2.ZERO:
			continue
		rects.append(Rect2(city_position - UNIT_LABEL_CITY_RECT_SIZE * 0.5, UNIT_LABEL_CITY_RECT_SIZE))

	for path_unit_id_variant in _prev_units_by_id.keys():
		var path_unit: Dictionary = _prev_units_by_id[path_unit_id_variant] as Dictionary
		var map_visual: Dictionary = path_unit.get("mapVisual", {}) as Dictionary
		var target_tile_id: String = str(map_visual.get("targetTileId", "")).strip_edges()
		if target_tile_id == "" or not _has_tile_marker_position(target_tile_id):
			continue
		var target_position: Vector2 = _resolve_tile_marker_position(target_tile_id, Vector2.ZERO)
		rects.append(Rect2(target_position - UNIT_LABEL_TARGET_RECT_SIZE * 0.5, UNIT_LABEL_TARGET_RECT_SIZE))

	for label_unit_id_variant in _unit_labels_by_id.keys():
		var label_unit_id: String = str(label_unit_id_variant)
		if label_unit_id == unit_id:
			continue
		var label: Control = _unit_labels_by_id[label_unit_id] as Control
		if label == null:
			continue
		rects.append(
			Rect2(
				label.position - Vector2(UNIT_LABEL_AVOIDANCE_PADDING, UNIT_LABEL_AVOIDANCE_PADDING),
				label.size + Vector2(UNIT_LABEL_AVOIDANCE_PADDING * 2.0, UNIT_LABEL_AVOIDANCE_PADDING * 2.0),
			)
		)
	return rects

func _rect_overlap_area(left_rect: Rect2, right_rect: Rect2) -> float:
	var left: float = maxf(left_rect.position.x, right_rect.position.x)
	var top: float = maxf(left_rect.position.y, right_rect.position.y)
	var right: float = minf(left_rect.position.x + left_rect.size.x, right_rect.position.x + right_rect.size.x)
	var bottom: float = minf(left_rect.position.y + left_rect.size.y, right_rect.position.y + right_rect.size.y)
	if right <= left or bottom <= top:
		return 0.0
	return (right - left) * (bottom - top)

func _resolve_unit_label_text(unit: Dictionary, compact: bool = false) -> String:
	if _is_world_troop_march_blocked_screenshot_fixture_unit(unit):
		return WORLD_TROOP_MARCH_BLOCKED_RECOVERY_VISIBLE_LABEL
	if _is_world_troop_march_intercepted_screenshot_fixture_unit(unit):
		return "遭遇拦截"
	if _is_world_troop_march_retreating_screenshot_fixture_unit(unit):
		return "部队撤回中"
	var map_visual: Dictionary = unit.get("mapVisual", {}) as Dictionary
	var label: String = str(map_visual.get("label", "")).strip_edges()
	if label == "":
		label = str(unit.get("name", "")).strip_edges()
	if compact:
		return label
	var countdown: String = _resolve_unit_countdown_text(unit)
	if countdown == "":
		return label
	if label == "":
		return countdown
	return "%s\n%s" % [label, countdown]

func _is_world_troop_march_blocked_screenshot_fixture_unit(unit: Dictionary) -> bool:
	var unit_id := str(unit.get("id", unit.get("unitId", ""))).strip_edges()
	return unit_id != "" and unit_id == _world_troop_march_blocked_screenshot_fixture_unit_id

func _is_world_troop_march_intercepted_screenshot_fixture_unit(unit: Dictionary) -> bool:
	var unit_id := str(unit.get("id", unit.get("unitId", ""))).strip_edges()
	return unit_id != "" and unit_id == _world_troop_march_intercepted_screenshot_fixture_unit_id

func _is_world_troop_march_retreating_screenshot_fixture_unit(unit: Dictionary) -> bool:
	var unit_id := str(unit.get("id", unit.get("unitId", ""))).strip_edges()
	return unit_id != "" and unit_id == _world_troop_march_retreating_screenshot_fixture_unit_id

func _should_compact_unit_label(unit_id: String, unit: Dictionary, marker_position: Vector2) -> bool:
	if unit_id == _selected_unit_id:
		return false
	if _unit_should_play_march_loop(unit):
		return false
	if _unit_has_path_debug_interest(unit):
		return false
	if _selected_unit_id != "" and _markers_by_unit_id.has(_selected_unit_id):
		var selected_marker: Node2D = _markers_by_unit_id[_selected_unit_id] as Node2D
		if selected_marker != null and selected_marker.position.distance_to(marker_position) <= UNIT_LABEL_DENSITY_SELECTED_RADIUS:
			return true
	if _is_near_unit_label_density_city(marker_position, UNIT_LABEL_DENSITY_CITY_RADIUS):
		return true
	return false

func _should_suppress_unit_label_for_density(unit_id: String, unit: Dictionary, marker_position: Vector2) -> bool:
	if unit_id == _selected_unit_id:
		return false
	if not _is_main_world_cell_projection_active():
		return false
	if _unit_should_play_march_loop(unit):
		return false
	if _unit_has_path_debug_interest(unit):
		return false
	return _is_near_unit_label_density_city(marker_position, UNIT_LABEL_DENSITY_CITY_SUPPRESS_RADIUS)

func _is_near_unit_label_density_city(marker_position: Vector2, radius: float) -> bool:
	for city_tile_id_variant in _collect_unit_label_density_city_tile_ids():
		var city_tile_id: String = str(city_tile_id_variant)
		var city_position: Vector2 = _resolve_tile_marker_position(city_tile_id, Vector2.ZERO)
		if city_position != Vector2.ZERO and city_position.distance_to(marker_position) <= radius:
			return true
	return false

func _collect_unit_label_density_city_tile_ids() -> Array:
	var result: Array = []
	var seen: Dictionary = {}
	for city_tile_id_variant in _city_tile_ids.keys():
		var city_tile_id: String = str(city_tile_id_variant).strip_edges()
		if city_tile_id == "" or seen.has(city_tile_id):
			continue
		seen[city_tile_id] = true
		result.append(city_tile_id)
	if _is_main_world_cell_projection_active():
		for city_tile_id_variant in MAIN_WORLD_SCENARIO_CITY_TILE_IDS.keys():
			var scenario_city_tile_id: String = str(city_tile_id_variant).strip_edges()
			if scenario_city_tile_id == "" or seen.has(scenario_city_tile_id):
				continue
			seen[scenario_city_tile_id] = true
			result.append(scenario_city_tile_id)
	return result

func _resolve_unit_countdown_text(unit: Dictionary) -> String:
	var map_visual: Dictionary = unit.get("mapVisual", {}) as Dictionary
	var eta_at: String = str(map_visual.get("etaAt", map_visual.get("estimatedArrivalAt", ""))).strip_edges()
	if eta_at == "":
		eta_at = str(map_visual.get("estimatedArrivalAt", "")).strip_edges()
	if eta_at == "":
		return ""
	var remaining_sec: int = _resolve_remaining_seconds_until(eta_at)
	if remaining_sec < 0:
		return ""
	return _format_countdown_seconds(remaining_sec)

func _resolve_remaining_seconds_until(iso_datetime: String) -> int:
	var eta_unix: int = _parse_iso8601_to_unix_seconds(iso_datetime)
	if eta_unix <= 0:
		return -1
	var now_unix: int = int(Time.get_unix_time_from_system())
	return maxi(0, eta_unix - now_unix)

func _format_countdown_seconds(total_seconds: int) -> String:
	var clamped_seconds: int = maxi(0, total_seconds)
	var minutes: int = floori(float(clamped_seconds) / 60.0)
	var seconds: int = clamped_seconds % 60
	return "%02d:%02d" % [minutes, seconds]

func _parse_iso8601_to_unix_seconds(raw_value: String) -> int:
	var normalized: String = raw_value.strip_edges()
	if normalized == "":
		return -1
	if normalized.ends_with("Z"):
		normalized = normalized.substr(0, normalized.length() - 1)
	var date_time_parts: PackedStringArray = normalized.split("T")
	if date_time_parts.size() != 2:
		return -1
	var date_parts: PackedStringArray = date_time_parts[0].split("-")
	var time_parts: PackedStringArray = date_time_parts[1].split(":")
	if date_parts.size() != 3 or time_parts.size() < 3:
		return -1
	var seconds_text: String = str(time_parts[2])
	if seconds_text.find(".") >= 0:
		seconds_text = seconds_text.split(".")[0]
	var datetime := {
		"year": int(date_parts[0]),
		"month": int(date_parts[1]),
		"day": int(date_parts[2]),
		"hour": int(time_parts[0]),
		"minute": int(time_parts[1]),
		"second": int(seconds_text),
	}
	return int(Time.get_unix_time_from_datetime_dict(datetime))

func _remove_unit_label(unit_id: String) -> void:
	if not _unit_labels_by_id.has(unit_id):
		return
	var stale_label: Control = _unit_labels_by_id[unit_id] as Control
	if stale_label != null:
		stale_label.queue_free()
	_unit_labels_by_id.erase(unit_id)

func _sync_ai_map_visuals(world_payload: Dictionary) -> void:
	if world_payload.is_empty():
		for marker_variant in _ai_map_markers_by_key.values():
			if marker_variant is Node2D:
				(marker_variant as Node2D).queue_free()
		_ai_map_markers_by_key.clear()
		return

	var desired_markers: Dictionary = {}
	_collect_ai_intent_markers(desired_markers)
	_collect_ai_resource_state_markers(world_payload, desired_markers)
	_ai_living_activity_marker_viewport_clamped_count = 0
	var living_activity_clamp_index_by_tile: Dictionary = {}

	for key_variant in _ai_map_markers_by_key.keys():
		var key := str(key_variant)
		if desired_markers.has(key):
			continue
		var stale_marker: Node2D = _ai_map_markers_by_key[key] as Node2D
		if stale_marker != null:
			stale_marker.queue_free()
		_ai_map_markers_by_key.erase(key)

	for key_variant in desired_markers.keys():
		var key := str(key_variant)
		var marker_meta: Dictionary = desired_markers[key] as Dictionary
		var tile_id := str(marker_meta.get("tileId", "")).strip_edges()
		if tile_id == "":
			continue
		var marker := _ensure_ai_map_marker(
			key,
			str(marker_meta.get("kind", "intent")),
			str(marker_meta.get("status", "pending"))
		)
		if marker == null:
			continue
		marker.set_meta("tile_id", tile_id)
		var marker_kind := str(marker_meta.get("kind", "intent"))
		if marker_kind == "living_activity":
			marker.set_meta("ai_activity_card_marker_entry_contract", "ai_activity_card_marker_entry_v1")
			marker.set_meta("trace_id", str(marker_meta.get("traceId", "")).strip_edges())
			marker.set_meta("activity_event_id", str(marker_meta.get("activityEventId", "")).strip_edges())
			marker.set_meta("map_target_tile_id", str(marker_meta.get("mapTargetTileId", tile_id)).strip_edges())
			marker.set_meta("jump_target", marker_meta.get("jumpTarget", {}))
			marker.set_meta("jump_target_ready", bool(marker_meta.get("jumpTargetReady", false)))
			marker.set_meta("focus_expectation", marker_meta.get("focusExpectation", {}))
			marker.set_meta("source_ref", marker_meta.get("sourceRef", {}))
			marker.set_meta("source_ref_request_id", str(marker_meta.get("sourceRefRequestId", "")).strip_edges())
			marker.set_meta("ai_player_id", str(marker_meta.get("aiPlayerId", "")).strip_edges())
			marker.set_meta("activity_label", str(marker_meta.get("label", "")).strip_edges())
			marker.set_meta("current_task_text", str(marker_meta.get("currentTaskText", "")).strip_edges())
			marker.set_meta("avatar_image_path", str(marker_meta.get("avatarImagePath", "")).strip_edges())
			marker.set_meta("status_dot", str(marker_meta.get("statusDot", "")).strip_edges())
			marker.set_meta("source_tile_id", str(marker_meta.get("sourceTileId", "")).strip_edges())
			marker.set_meta("target_line_visible", bool(marker_meta.get("targetLineVisible", false)))
			var carrying_troops_slots: Array = []
			var carrying_troops_slots_variant: Variant = marker_meta.get("carryingTroopsSlots", [])
			if carrying_troops_slots_variant is Array:
				carrying_troops_slots = (carrying_troops_slots_variant as Array).duplicate(true)
			marker.set_meta("carrying_troops_slots", carrying_troops_slots.duplicate(true))
			var target_line_vector_variant: Variant = marker_meta.get("targetLineVector", Vector2.ZERO)
			var target_line_vector := target_line_vector_variant as Vector2 if target_line_vector_variant is Vector2 else Vector2.ZERO
			if marker.has_method("set_living_activity_visual_identity"):
				marker.call(
					"set_living_activity_visual_identity",
					str(marker_meta.get("avatarImagePath", "")).strip_edges(),
					str(marker_meta.get("statusDot", "")).strip_edges(),
					target_line_vector,
					bool(marker_meta.get("targetLineVisible", false))
				)
			if marker.has_method("set_living_activity_queue_cluster"):
				marker.call(
					"set_living_activity_queue_cluster",
					int(marker_meta.get("queueCount", 1)),
					int(marker_meta.get("aggregationDotCount", 0))
				)
			if marker.has_method("set_living_activity_carrying_troops_slots"):
				marker.call("set_living_activity_carrying_troops_slots", carrying_troops_slots)
		var next_position := _resolve_tile_marker_position(tile_id, marker.position)
		if marker_kind == "living_activity":
			var clamp_lane_index := _resolve_ai_living_activity_clamp_lane_index(tile_id, living_activity_clamp_index_by_tile)
			var clamp_result := _clamp_ai_living_activity_marker_position_to_viewport(next_position, clamp_lane_index)
			next_position = clamp_result.get("position", next_position) as Vector2
			var viewport_clamped := bool(clamp_result.get("clamped", false))
			marker.set_meta("viewport_clamped", viewport_clamped)
			if viewport_clamped:
				_ai_living_activity_marker_viewport_clamped_count += 1
		else:
			marker.set_meta("viewport_clamped", false)
		marker.position = next_position

func _sync_ai_map_visual_positions() -> void:
	_ai_living_activity_marker_viewport_clamped_count = 0
	var living_activity_clamp_index_by_tile: Dictionary = {}
	for key_variant in _ai_map_markers_by_key.keys():
		var key := str(key_variant)
		var marker: Node2D = _ai_map_markers_by_key[key] as Node2D
		if marker == null or not marker.has_meta("tile_id"):
			continue
		var tile_id := str(marker.get_meta("tile_id")).strip_edges()
		var next_position := _resolve_tile_marker_position(tile_id, marker.position)
		if str(marker.get_meta("kind", "")).strip_edges() == "living_activity":
			var clamp_lane_index := _resolve_ai_living_activity_clamp_lane_index(tile_id, living_activity_clamp_index_by_tile)
			var clamp_result := _clamp_ai_living_activity_marker_position_to_viewport(next_position, clamp_lane_index)
			next_position = clamp_result.get("position", next_position) as Vector2
			var viewport_clamped := bool(clamp_result.get("clamped", false))
			marker.set_meta("viewport_clamped", viewport_clamped)
			if viewport_clamped:
				_ai_living_activity_marker_viewport_clamped_count += 1
		marker.position = next_position

func refresh_ai_living_activity_markers_for_visual_smoke() -> void:
	_sync_ai_map_visuals(WorldStore.world)

func _resolve_ai_living_activity_clamp_lane_index(tile_id: String, living_activity_clamp_index_by_tile: Dictionary) -> int:
	var normalized_tile_id := tile_id.strip_edges()
	if normalized_tile_id == "":
		return 0
	if living_activity_clamp_index_by_tile.has(normalized_tile_id):
		return int(living_activity_clamp_index_by_tile[normalized_tile_id])
	var clamp_lane_index := living_activity_clamp_index_by_tile.size()
	living_activity_clamp_index_by_tile[normalized_tile_id] = clamp_lane_index
	return clamp_lane_index

func _clamp_ai_living_activity_marker_position_to_viewport(raw_position: Vector2, clamp_lane_index: int = 0) -> Dictionary:
	var viewport := get_viewport()
	if viewport == null:
		return {"position": raw_position, "clamped": false}
	var visible_rect := viewport.get_visible_rect()
	var min_x := 300.0
	var min_y := 120.0
	var max_x := maxf(min_x, visible_rect.size.x - 180.0)
	var max_y := maxf(min_y, visible_rect.size.y - 260.0)
	var clamped_position := Vector2(
		clampf(raw_position.x, min_x, max_x),
		clampf(raw_position.y, min_y, max_y)
	)
	var was_clamped := clamped_position.distance_to(raw_position) > 0.10
	if was_clamped and clamp_lane_index > 0:
		var lane_y_offset := float(clamp_lane_index % 5) * 86.0
		var lane_x_offset := floorf(float(clamp_lane_index) / 5.0) * 74.0
		clamped_position = Vector2(
			clampf(clamped_position.x + lane_x_offset, min_x, max_x),
			clampf(clamped_position.y + lane_y_offset, min_y, max_y)
		)
	return {
		"position": clamped_position,
		"clamped": was_clamped,
	}

func _collect_ai_intent_markers(markers: Dictionary) -> void:
	var ai_state: Dictionary = WorldStore.get_ai_state(_resolve_human_faction_id())
	var execution_trace_items: Array = ai_state.get("playerRuntimeExecutionTraceItems", []) as Array
	_ai_living_activity_marker_count = _collect_ai_living_activity_markers_from_execution_trace(execution_trace_items, markers)
	_ai_living_activity_uses_execution_trace = _ai_living_activity_marker_count > 0
	_ai_living_activity_fallback_used = not _ai_living_activity_uses_execution_trace
	if _ai_living_activity_uses_execution_trace:
		return
	var proposal_items: Array = ai_state.get("playerRuntimeProposalItems", []) as Array
	var intent_marker_count := 0
	for proposal_variant in proposal_items:
		if intent_marker_count >= AI_MAP_INTENT_MARKER_LIMIT:
			break
		if not (proposal_variant is Dictionary):
			continue
		var proposal: Dictionary = proposal_variant as Dictionary
		var status := str(proposal.get("status", "")).strip_edges()
		if status != "pending_approval" and status != "approved":
			continue
		var action := str(proposal.get("action", "")).strip_edges()
		if action != "march_move" and action != "tile_occupy" and action != "resource_gather":
			continue
		var args: Dictionary = proposal.get("args", {}) as Dictionary
		var tile_id := _resolve_tile_id_from_ai_payload(args)
		if tile_id == "":
			continue
		var proposal_id := str(proposal.get("proposalId", proposal.get("id", ""))).strip_edges()
		var key := "intent:%s:%s" % [action, proposal_id if proposal_id != "" else tile_id]
		markers[key] = {
			"kind": "intent",
			"status": status,
			"tileId": tile_id,
		}
		intent_marker_count += 1

func _collect_ai_living_activity_markers_from_execution_trace(trace_items: Array, markers: Dictionary) -> int:
	var marker_count := 0
	var ai_state: Dictionary = WorldStore.get_ai_state(_resolve_human_faction_id())
	for trace_variant in trace_items:
		if marker_count >= AI_MAP_INTENT_MARKER_LIMIT:
			break
		if not (trace_variant is Dictionary):
			continue
		var trace_item: Dictionary = trace_variant as Dictionary
		var marker_payload_variant: Variant = trace_item.get("marker", {})
		var marker_payload: Dictionary = marker_payload_variant as Dictionary if marker_payload_variant is Dictionary else {}
		var tile_id := _resolve_tile_id_from_ai_living_activity_trace(trace_item, marker_payload)
		if tile_id == "":
			continue
		var trace_id := str(trace_item.get("traceId", trace_item.get("reportId", ""))).strip_edges()
		var ai_player_id := str(trace_item.get("aiPlayerId", "")).strip_edges()
		var action := str(trace_item.get("action", "")).strip_edges()
		var source_kind := str(trace_item.get("sourceKind", "")).strip_edges()
		if source_kind == "":
			source_kind = "governed_proposal" if action == "maritime_patrol_intercept" else "unknown"
		var runtime_item := _resolve_ai_living_activity_runtime_item(ai_state, ai_player_id)
		var list_card_variant: Variant = runtime_item.get("listCard", {})
		var list_card: Dictionary = list_card_variant as Dictionary if list_card_variant is Dictionary else {}
		var source_tile_id := _resolve_ai_living_activity_marker_source_tile_id(trace_item, marker_payload)
		var target_line_vector := _resolve_ai_living_activity_marker_target_line_vector(trace_item, marker_payload, tile_id)
		var activity_event_id := _resolve_ai_living_activity_event_id(trace_item, marker_payload, trace_id)
		var map_target_tile_id := _resolve_ai_living_activity_map_target_tile_id(trace_item, marker_payload, tile_id)
		var jump_target := _resolve_ai_living_activity_jump_target(trace_item, marker_payload, map_target_tile_id)
		var source_ref := _resolve_ai_living_activity_source_ref(trace_item, marker_payload, activity_event_id, trace_id)
		var focus_expectation := _build_ai_living_activity_focus_expectation(jump_target, map_target_tile_id)
		var source_ref_request_id := str(source_ref.get("requestId", "")).strip_edges()
		var queue_count := _count_ai_living_activity_trace_items_for_tile(trace_items, tile_id)
		var aggregation_dot_count := _resolve_ai_living_activity_aggregation_dot_count(queue_count)
		var carrying_troops_slots := _resolve_ai_living_activity_marker_carrying_troop_slots(ai_player_id)
		var key_suffix := trace_id
		if key_suffix == "":
			key_suffix = "%s:%s:%s" % [ai_player_id, action, tile_id]
		var key := "living_activity:%s" % key_suffix
		markers[key] = {
			"kind": "living_activity",
			"status": _resolve_ai_living_activity_marker_status(trace_item, marker_payload),
			"tileId": tile_id,
			"activityEventId": activity_event_id,
			"mapTargetTileId": map_target_tile_id,
			"jumpTarget": jump_target,
			"jumpTargetReady": bool(focus_expectation.get("ready", false)),
			"focusExpectation": focus_expectation,
			"sourceRef": source_ref,
			"sourceRefRequestId": source_ref_request_id,
			"traceId": trace_id,
			"aiPlayerId": ai_player_id,
			"action": action,
			"sourceKind": source_kind,
			"label": str(marker_payload.get("label", trace_item.get("title", ""))).strip_edges(),
			"currentTaskText": str(trace_item.get("currentTaskText", "")).strip_edges(),
			"avatarImagePath": _resolve_ai_living_activity_marker_avatar_path(runtime_item),
			"statusDot": str(list_card.get("statusDot", list_card.get("status_dot", "green"))).strip_edges(),
			"sourceTileId": source_tile_id,
			"targetLineVector": target_line_vector,
			"targetLineVisible": target_line_vector.length() > 1.0,
			"queueCount": queue_count,
			"aggregationDotCount": aggregation_dot_count,
			"carryingTroopsSlots": carrying_troops_slots,
		}
		marker_count += 1
	return marker_count

func _resolve_tile_id_from_ai_living_activity_trace(trace_item: Dictionary, marker_payload: Dictionary) -> String:
	for key in ["tileId", "targetTileId", "toTileId"]:
		var marker_tile_id := str(marker_payload.get(key, "")).strip_edges()
		if marker_tile_id != "":
			return marker_tile_id
	for key in ["targetTileId", "tileId", "toTileId"]:
		var trace_tile_id := str(trace_item.get(key, "")).strip_edges()
		if trace_tile_id != "":
			return trace_tile_id
	return ""

func _resolve_ai_living_activity_event_id(trace_item: Dictionary, marker_payload: Dictionary, fallback_id: String) -> String:
	for key in ["activityEventId", "worldEventId", "eventId"]:
		var marker_value := str(marker_payload.get(key, "")).strip_edges()
		if marker_value != "":
			return marker_value
		var trace_value := str(trace_item.get(key, "")).strip_edges()
		if trace_value != "":
			return trace_value
	return fallback_id

func _resolve_ai_living_activity_map_target_tile_id(trace_item: Dictionary, marker_payload: Dictionary, fallback_tile_id: String) -> String:
	for key in ["mapTargetTileId", "targetTileId", "tileId", "toTileId"]:
		var marker_value := str(marker_payload.get(key, "")).strip_edges()
		if marker_value != "":
			return marker_value
		var trace_value := str(trace_item.get(key, "")).strip_edges()
		if trace_value != "":
			return trace_value
	return fallback_tile_id

func _resolve_ai_living_activity_jump_target(trace_item: Dictionary, marker_payload: Dictionary, map_target_tile_id: String) -> Dictionary:
	var raw_jump_target: Variant = marker_payload.get("jumpTarget", trace_item.get("jumpTarget", {}))
	if raw_jump_target is Dictionary:
		return (raw_jump_target as Dictionary).duplicate(true)
	if map_target_tile_id == "":
		return {}
	var label := str(marker_payload.get("label", trace_item.get("title", "目标地"))).strip_edges()
	if label == "":
		label = "目标地"
	return {
		"surface": "world_map",
		"targetId": map_target_tile_id,
		"label": label,
	}

func _resolve_ai_living_activity_jump_target_id(jump_target: Dictionary) -> String:
	var target_id := str(jump_target.get("targetId", "")).strip_edges()
	if target_id == "":
		target_id = str(jump_target.get("target_id", "")).strip_edges()
	return target_id


func _is_ai_living_activity_jump_target_ready(jump_target: Dictionary, map_target_tile_id: String) -> bool:
	var surface := str(jump_target.get("surface", "")).strip_edges()
	var target_id := _resolve_ai_living_activity_jump_target_id(jump_target)
	if surface != "world_map" or target_id == "":
		return false
	return map_target_tile_id == "" or target_id == map_target_tile_id


func _build_ai_living_activity_focus_expectation(jump_target: Dictionary, map_target_tile_id: String) -> Dictionary:
	var target_id := _resolve_ai_living_activity_jump_target_id(jump_target)
	var surface := str(jump_target.get("surface", "")).strip_edges()
	var label := str(jump_target.get("label", "")).strip_edges()
	var ready := _is_ai_living_activity_jump_target_ready(jump_target, map_target_tile_id)
	return {
		"ready": ready,
		"surface": surface,
		"targetId": target_id,
		"mapTargetTileId": map_target_tile_id,
		"label": label,
		"requiresRuntimeClick": true,
		"focusPerformed": false,
		"reason": "jump_target_ready_pending_runtime_click" if ready else "jump_target_not_ready",
	}


func _resolve_ai_living_activity_source_ref(trace_item: Dictionary, marker_payload: Dictionary, activity_event_id: String, fallback_request_id: String) -> Dictionary:
	var raw_source_ref: Variant = marker_payload.get("sourceRef", trace_item.get("sourceRef", {}))
	var source_ref: Dictionary = raw_source_ref.duplicate(true) if raw_source_ref is Dictionary else {}
	if not source_ref.has("visibility"):
		source_ref["visibility"] = "internal_link_only"
	source_ref["visible"] = false
	if not source_ref.has("worldEventId") and activity_event_id != "":
		source_ref["worldEventId"] = activity_event_id
	var request_id := str(marker_payload.get("requestId", trace_item.get("requestId", ""))).strip_edges()
	if request_id == "":
		request_id = fallback_request_id
	if not source_ref.has("requestId") and request_id != "":
		source_ref["requestId"] = request_id
	return source_ref

func _resolve_ai_living_activity_marker_status(trace_item: Dictionary, marker_payload: Dictionary) -> String:
	var marker_kind := str(marker_payload.get("kind", "")).strip_edges()
	if marker_kind != "":
		return marker_kind
	var phase := str(trace_item.get("phase", "")).strip_edges()
	if phase != "":
		return phase
	return str(trace_item.get("action", "active")).strip_edges()

func _resolve_ai_living_activity_runtime_item(ai_state: Dictionary, ai_player_id: String) -> Dictionary:
	var runtime_items_variant: Variant = ai_state.get("playerRuntimeList", [])
	if not (runtime_items_variant is Array):
		return {}
	var fallback_item: Dictionary = {}
	for runtime_variant in runtime_items_variant as Array:
		if not (runtime_variant is Dictionary):
			continue
		var runtime_item: Dictionary = runtime_variant as Dictionary
		if fallback_item.is_empty():
			fallback_item = runtime_item.duplicate(true)
		var runtime_ai_player_id := str(runtime_item.get("aiPlayerId", "")).strip_edges()
		if ai_player_id != "" and runtime_ai_player_id == ai_player_id:
			return runtime_item.duplicate(true)
	if ai_player_id == "" and not fallback_item.is_empty():
		return fallback_item.duplicate(true)
	return {}

func _resolve_ai_living_activity_marker_avatar_path(runtime_item: Dictionary) -> String:
	var direct_path := str(runtime_item.get("avatarImagePath", runtime_item.get("avatar_image_path", ""))).strip_edges()
	if _ai_living_activity_marker_texture_path_exists(direct_path):
		return direct_path
	var list_card_variant: Variant = runtime_item.get("listCard", {})
	if list_card_variant is Dictionary:
		var list_card: Dictionary = list_card_variant as Dictionary
		var list_card_path := str(list_card.get("avatarImagePath", list_card.get("avatar_image_path", ""))).strip_edges()
		if _ai_living_activity_marker_texture_path_exists(list_card_path):
			return list_card_path
	return AI_LIVING_ACTIVITY_MARKER_FALLBACK_AVATAR_PATH

func _load_ai_living_activity_marker_troop_formation_read_model() -> Dictionary:
	if not FileAccess.file_exists(MAIN_CITY_TROOP_FORMATION_READ_MODEL_PATH):
		return {}
	var raw_text := FileAccess.get_file_as_string(MAIN_CITY_TROOP_FORMATION_READ_MODEL_PATH)
	var parsed: Variant = JSON.parse_string(raw_text)
	if parsed is Dictionary:
		return parsed as Dictionary
	return {}

func _resolve_ai_living_activity_marker_carrying_troop_slots(ai_player_id: String) -> Array:
	var read_model := _load_ai_living_activity_marker_troop_formation_read_model()
	var teams_variant: Variant = read_model.get("teams", [])
	if not (teams_variant is Array):
		return []
	var preferred_ai_player_id := ai_player_id.strip_edges()
	var fallback_ai_player_id := "ai_player_jihan_vanguard"
	var fallback_team: Dictionary = {}
	var selected_team: Dictionary = {}
	for team_variant in teams_variant as Array:
		if not (team_variant is Dictionary):
			continue
		var team: Dictionary = team_variant as Dictionary
		var owner_type := str(team.get("owner_type", team.get("ownerType", ""))).strip_edges().to_lower()
		var team_ai_player_id := str(team.get("ai_player_id", team.get("aiPlayerId", ""))).strip_edges()
		if owner_type != "ai" and team_ai_player_id == "":
			continue
		if fallback_team.is_empty() or team_ai_player_id == fallback_ai_player_id:
			fallback_team = team.duplicate(true)
		if preferred_ai_player_id != "" and team_ai_player_id == preferred_ai_player_id:
			selected_team = team.duplicate(true)
			break
	if selected_team.is_empty():
		selected_team = fallback_team
	if selected_team.is_empty():
		return []
	var slots_variant: Variant = selected_team.get("slots", [])
	if not (slots_variant is Array):
		return []
	var slot_payloads: Array = []
	for slot_variant in slots_variant as Array:
		if slot_payloads.size() >= 3:
			break
		if not (slot_variant is Dictionary):
			continue
		var slot: Dictionary = slot_variant as Dictionary
		var troop_label := str(slot.get("troop_type", slot.get("troopType", ""))).strip_edges()
		if troop_label == "":
			continue
		var general_name := str(slot.get("general_name", slot.get("generalName", ""))).strip_edges()
		if general_name == "":
			general_name = "武将"
		var asset_path := SlgUiComponentFactoryScript.generated_troop_illustration_for_label(troop_label)
		slot_payloads.append({
			"generalName": general_name,
			"troopType": troop_label,
			"label": "%s %s" % [general_name, troop_label],
			"assetPath": asset_path,
			"aiPlayerId": str(selected_team.get("ai_player_id", selected_team.get("aiPlayerId", ""))).strip_edges(),
			"teamId": str(selected_team.get("id", selected_team.get("team_id", ""))).strip_edges(),
			"source": "main_city_troop_formation_read_model",
			"sourcePath": "main_city_troop_formation_read_model.json",
		})
	return slot_payloads

func _ai_living_activity_marker_texture_path_exists(path_value: String) -> bool:
	var normalized_path := path_value.strip_edges()
	if normalized_path == "":
		return false
	if FileAccess.file_exists(normalized_path):
		return true
	if normalized_path.begins_with("res://"):
		return false
	return FileAccess.file_exists(ProjectSettings.globalize_path("res://../%s" % normalized_path))

func _resolve_ai_living_activity_marker_source_tile_id(trace_item: Dictionary, marker_payload: Dictionary) -> String:
	for key in ["sourceTileId", "originTileId", "fromTileId"]:
		var marker_source_tile_id := str(marker_payload.get(key, "")).strip_edges()
		if marker_source_tile_id != "":
			return marker_source_tile_id
	for key in ["sourceTileId", "originTileId", "fromTileId"]:
		var trace_source_tile_id := str(trace_item.get(key, "")).strip_edges()
		if trace_source_tile_id != "":
			return trace_source_tile_id
	return ""

func _resolve_ai_living_activity_marker_target_line_vector(trace_item: Dictionary, marker_payload: Dictionary, target_tile_id: String) -> Vector2:
	var source_tile_id := _resolve_ai_living_activity_marker_source_tile_id(trace_item, marker_payload)
	if source_tile_id == "" or target_tile_id == "":
		return Vector2.ZERO
	if not _has_tile_marker_position(source_tile_id) or not _has_tile_marker_position(target_tile_id):
		return Vector2.ZERO
	var source_position := _resolve_tile_marker_position(source_tile_id, Vector2.ZERO)
	var target_position := _resolve_tile_marker_position(target_tile_id, Vector2.ZERO)
	var source_vector := source_position - target_position
	if source_vector.length() <= 1.0:
		return Vector2.ZERO
	return source_vector.normalized() * minf(source_vector.length(), 58.0)

func _count_ai_living_activity_trace_items_for_tile(trace_items: Array, target_tile_id: String) -> int:
	var normalized_target_tile_id := target_tile_id.strip_edges()
	if normalized_target_tile_id == "":
		return 1
	var count := 0
	for trace_variant in trace_items:
		if not (trace_variant is Dictionary):
			continue
		var trace_item: Dictionary = trace_variant as Dictionary
		var marker_payload_variant: Variant = trace_item.get("marker", {})
		var marker_payload: Dictionary = marker_payload_variant as Dictionary if marker_payload_variant is Dictionary else {}
		if _resolve_tile_id_from_ai_living_activity_trace(trace_item, marker_payload) == normalized_target_tile_id:
			count += 1
	return maxi(1, count)

func _resolve_ai_living_activity_aggregation_dot_count(queue_count: int) -> int:
	if queue_count <= 1:
		return 0
	return clampi(queue_count - 1, 1, 4)

func _collect_ai_resource_state_markers(world_payload: Dictionary, markers: Dictionary) -> void:
	var human_faction_id := _resolve_human_faction_id()
	var faction_state := _read_world_faction_state(world_payload, human_faction_id)
	var gathered_tile_count := 0
	var raw_claims_variant: Variant = faction_state.get("aiResourceGatherClaims", {})
	var raw_claims: Dictionary = (raw_claims_variant as Dictionary) if raw_claims_variant is Dictionary else {}
	for claim_variant in raw_claims.values():
		if not (claim_variant is Dictionary):
			continue
		var claim: Dictionary = claim_variant as Dictionary
		var tile_id := str(claim.get("tileId", "")).strip_edges()
		if tile_id == "":
			continue
		markers["gathered:%s" % tile_id] = {
			"kind": "gathered",
			"status": "claimed",
			"tileId": tile_id,
		}
		gathered_tile_count += 1
		if gathered_tile_count >= AI_MAP_RESOURCE_STATE_MARKER_LIMIT:
			break

	var map_payload: Dictionary = world_payload.get("map", {}) as Dictionary
	var raw_tiles_variant: Variant = map_payload.get("tiles", [])
	if not (raw_tiles_variant is Array):
		return
	var raw_tiles: Array = raw_tiles_variant as Array
	var occupied_tile_count := 0
	for tile_variant in raw_tiles:
		if not (tile_variant is Dictionary):
			continue
		var tile: Dictionary = tile_variant as Dictionary
		if str(tile.get("owner", "")).strip_edges().to_lower() != human_faction_id:
			continue
		var tile_type := str(tile.get("type", "")).strip_edges()
		var resource_kind := str(tile.get("resourceKind", "")).strip_edges()
		if tile_type != "resource" and resource_kind == "":
			continue
		var tile_id := str(tile.get("id", "")).strip_edges()
		if tile_id == "":
			continue
		var key := "occupied:%s" % tile_id
		if markers.has("gathered:%s" % tile_id):
			continue
		markers[key] = {
			"kind": "occupied",
			"status": "owned",
			"tileId": tile_id,
		}
		occupied_tile_count += 1
		if occupied_tile_count >= AI_MAP_RESOURCE_STATE_MARKER_LIMIT:
			break

func _ensure_ai_map_marker(key: String, kind: String, status: String) -> Node2D:
	var marker: Node2D = null
	if _ai_map_markers_by_key.has(key):
		marker = _ai_map_markers_by_key[key] as Node2D
	else:
		marker = Node2D.new()
		marker.name = "AIMapMarker_%s" % key.replace(":", "_")
		marker.set_script(AIMapIntentMarkerScript)
		add_child(marker)
		_ai_map_markers_by_key[key] = marker
	if marker != null and marker.has_method("set_visual_state"):
		marker.call("set_visual_state", kind, status)
	if marker != null:
		marker.set_meta("kind", kind)
		if kind == "living_activity":
			marker.set("radius", 42.0)
			marker.z_index = 240
		else:
			marker.set("radius", 16.0)
			marker.z_index = 1
	return marker

func _resolve_tile_id_from_ai_payload(payload: Dictionary) -> String:
	for key in ["tileId", "targetTileId", "toTileId"]:
		var tile_id := str(payload.get(key, "")).strip_edges()
		if tile_id != "":
			return tile_id
	return ""

func _read_world_faction_state(world_payload: Dictionary, faction_id: String) -> Dictionary:
	var raw_factions: Variant = world_payload.get("factions", {})
	if raw_factions is Dictionary:
		var faction_state: Variant = (raw_factions as Dictionary).get(faction_id, {})
		if faction_state is Dictionary:
			return faction_state as Dictionary
	return {}

func _resolve_tile_marker_position(tile_id: String, fallback: Vector2) -> Vector2:
	if tile_id == "" or not _has_tile_marker_position(tile_id):
		return fallback
	if _map_grid == null or not _map_grid.has_method("tile_to_screen_position"):
		return fallback
	var tile_coord: Vector2i = _resolve_tile_coord(tile_id)
	var base_position: Vector2
	if _map_grid.has_method("tile_id_to_screen_position"):
		base_position = _map_grid.tile_id_to_screen_position(tile_id, tile_coord.x, tile_coord.y)
	else:
		base_position = _map_grid.tile_to_screen_position(tile_coord.x, tile_coord.y)
	return _apply_main_world_city_visual_staging_offset(tile_id, base_position + Vector2(0.0, marker_vertical_offset - 4.0))

func _apply_main_world_city_visual_staging_offset(
	tile_id: String,
	position: Vector2,
	queue_direction: String = "",
	preferred_anchor_id: String = "",
	preferred_source: String = CITY_QUEUE_ANCHOR_DIRECTION_SOURCE_LOCAL,
) -> Vector2:
	var profile := _resolve_main_world_city_visual_anchor_profile(tile_id)
	if profile.is_empty():
		return position
	var anchor_record := _resolve_main_world_city_visual_queue_anchor(profile, queue_direction, preferred_anchor_id)
	var profile_id := str(profile.get("id", "")).strip_edges()
	if profile_id != "":
		_city_visual_anchor_active_profile_ids[profile_id] = true
		var backend_profile_id := str(_city_visual_backend_profile_by_tile_id.get(tile_id.strip_edges(), "")).strip_edges()
		if backend_profile_id == profile_id or not _city_visual_anchor_last_backend_profile_resolved:
			_city_visual_anchor_last_profile_id = profile_id
			_city_visual_anchor_last_matched_tile_id = tile_id
			_city_visual_anchor_last_queue_anchor_id = str(anchor_record.get("id", "")).strip_edges()
			_city_visual_anchor_last_queue_anchor_direction = queue_direction
			_city_visual_anchor_last_queue_anchor_offset = anchor_record.get("offset", Vector2.ZERO) as Vector2
			_city_visual_anchor_last_queue_anchor_source = preferred_source
			_city_visual_anchor_last_backend_exit_anchor_id = preferred_anchor_id if preferred_source == CITY_QUEUE_ANCHOR_DIRECTION_SOURCE_BACKEND else ""
			_city_visual_anchor_last_backend_road_exit_direction = queue_direction if preferred_source == CITY_QUEUE_ANCHOR_DIRECTION_SOURCE_BACKEND else ""
	var offset: Vector2 = anchor_record.get("offset", profile.get("queueAnchorOffset", profile.get("stagingOffset", _city_visual_staging_offset))) as Vector2
	return position + offset

func _resolve_main_world_city_visual_queue_anchor(profile: Dictionary, queue_direction: String, preferred_anchor_id: String = "") -> Dictionary:
	var raw_anchors: Variant = profile.get("queueAnchors", [])
	var fallback_anchor := {
		"id": "default_queue_anchor",
		"role": "march_start",
		"directions": [],
		"offset": profile.get("queueAnchorOffset", profile.get("stagingOffset", _city_visual_staging_offset)),
	}
	if not (raw_anchors is Array):
		return fallback_anchor
	var normalized_direction := queue_direction.strip_edges()
	var normalized_anchor_id := preferred_anchor_id.strip_edges()
	var march_start_anchor: Dictionary = {}
	for anchor_variant in raw_anchors as Array:
		if not (anchor_variant is Dictionary):
			continue
		var anchor: Dictionary = anchor_variant as Dictionary
		if normalized_anchor_id != "" and str(anchor.get("id", "")).strip_edges() == normalized_anchor_id:
			return anchor
		var raw_directions: Variant = anchor.get("directions", [])
		if normalized_direction != "" and raw_directions is Array:
			for direction_variant in raw_directions as Array:
				if str(direction_variant).strip_edges() == normalized_direction:
					return anchor
		if march_start_anchor.is_empty() and str(anchor.get("role", "")).strip_edges() == "march_start":
			march_start_anchor = anchor
	if not march_start_anchor.is_empty():
		return march_start_anchor
	return fallback_anchor

func _resolve_city_visual_queue_direction(from_tile_id: String, to_tile_id: String) -> String:
	var normalized_from := from_tile_id.strip_edges()
	var normalized_to := to_tile_id.strip_edges()
	if normalized_from == "" or normalized_to == "" or normalized_from == normalized_to:
		return "south"
	if not _has_tile_marker_position(normalized_from) or not _has_tile_marker_position(normalized_to):
		return "south"
	var from_coord: Vector2i = _resolve_tile_coord(normalized_from)
	var to_coord: Vector2i = _resolve_tile_coord(normalized_to)
	var dx := to_coord.x - from_coord.x
	var dy := to_coord.y - from_coord.y
	if dy < 0:
		return "northwest"
	if dx > 0:
		return "east"
	if dx < 0:
		return "northwest"
	return "south"

func _resolve_main_world_city_visual_anchor_profile(tile_id: String) -> Dictionary:
	var normalized_tile_id := tile_id.strip_edges()
	if normalized_tile_id == "":
		return {}
	if _city_visual_backend_profile_by_tile_id.has(normalized_tile_id):
		var backend_profile_id := str(_city_visual_backend_profile_by_tile_id.get(normalized_tile_id, "")).strip_edges()
		if backend_profile_id != "" and _city_visual_anchor_profiles_by_id.has(backend_profile_id):
			var backend_record: Dictionary = {}
			var backend_record_variant: Variant = _city_visual_backend_footprint_by_tile_id.get(normalized_tile_id, {})
			if backend_record_variant is Dictionary:
				backend_record = backend_record_variant as Dictionary
			_city_visual_anchor_last_source_mode = CITY_QUEUE_ANCHOR_SOURCE_MODE_BACKEND
			_city_visual_anchor_last_backend_footprint_id = str(backend_record.get("footprintId", "")).strip_edges()
			_city_visual_anchor_last_backend_matched_tile_id = normalized_tile_id
			_city_visual_anchor_last_backend_footprint_tile_count = int(backend_record.get("footprintTileCount", 0))
			_city_visual_anchor_last_backend_profile_resolved = true
			_city_visual_anchor_last_selection_reason = "backend_profile_matched"
			_city_visual_backend_active_profile_ids[backend_profile_id] = true
			return _city_visual_anchor_profiles_by_id[backend_profile_id] as Dictionary
	if _city_visual_anchor_profile_by_tile_id.has(normalized_tile_id):
		var profile_id := str(_city_visual_anchor_profile_by_tile_id.get(normalized_tile_id, "")).strip_edges()
		if profile_id != "" and _city_visual_anchor_profiles_by_id.has(profile_id):
			if not _city_visual_anchor_last_backend_profile_resolved:
				_city_visual_anchor_last_source_mode = CITY_QUEUE_ANCHOR_SOURCE_MODE_LOCAL
				_city_visual_anchor_last_backend_footprint_id = ""
				_city_visual_anchor_last_backend_matched_tile_id = ""
				_city_visual_anchor_last_backend_footprint_tile_count = 0
				_city_visual_anchor_last_backend_profile_resolved = false
				_city_visual_anchor_last_selection_reason = "local_tile_profile_fallback"
			return _city_visual_anchor_profiles_by_id[profile_id] as Dictionary
	if _city_visual_footprint_tile_ids.has(normalized_tile_id) and _city_visual_anchor_profiles_by_id.has("fallback_default"):
		if not _city_visual_anchor_last_backend_profile_resolved:
			_city_visual_anchor_last_source_mode = CITY_QUEUE_ANCHOR_SOURCE_MODE_DEFAULT
			_city_visual_anchor_last_backend_footprint_id = ""
			_city_visual_anchor_last_backend_matched_tile_id = ""
			_city_visual_anchor_last_backend_footprint_tile_count = 0
			_city_visual_anchor_last_backend_profile_resolved = false
			_city_visual_anchor_last_selection_reason = "fallback_default"
		return _city_visual_anchor_profiles_by_id["fallback_default"] as Dictionary
	return {}

func _set_marker_position(marker: Node2D, target_position: Vector2) -> void:
	_cancel_marker_tween(marker)
	marker.position = target_position
	if marker != null and marker.has_method("set_moving"):
		marker.call("set_moving", false, Vector2.ZERO)

func _sync_marker_march_animation(marker: Node2D, unit: Dictionary) -> void:
	if marker == null or not marker.has_method("set_moving"):
		return
	if _unit_should_play_march_loop(unit):
		marker.call("set_moving", true, _resolve_unit_march_direction(unit))
	else:
		marker.call("set_moving", false, Vector2.ZERO)

func _unit_should_play_march_loop(unit: Dictionary) -> bool:
	var status := str(unit.get("status", "")).strip_edges().to_lower()
	var map_visual: Dictionary = unit.get("mapVisual", {}) as Dictionary
	var map_status := str(map_visual.get("status", "")).strip_edges().to_lower()
	var march: Dictionary = unit.get("march", {}) as Dictionary
	return (
		status == "marching"
		or status == "行军"
		or status == "intercepted"
		or status == "拦截"
		or status == "retreating"
		or status == "撤退"
		or map_status == "marching"
		or map_status == "行军"
		or map_status == "intercepted"
		or map_status == "拦截"
		or map_status == "retreating"
		or map_status == "撤退"
		or not march.is_empty()
	)

func _build_world_troop_march_result_motion_summary(
	moving_unit_ids: Array,
	path_cue_count: int,
	target_cue_count: int,
	arrow_cue_count: int,
) -> Dictionary:
	var arrived_unit_ids: Array = []
	var intercepted_unit_ids: Array = []
	var retreating_unit_ids: Array = []
	var active_unit_ids: Array = []
	for unit_id_variant in moving_unit_ids:
		var unit_id := str(unit_id_variant).strip_edges()
		if unit_id == "" or not _prev_units_by_id.has(unit_id):
			continue
		active_unit_ids.append(unit_id)
		var unit: Dictionary = _prev_units_by_id[unit_id] as Dictionary
		var map_visual: Dictionary = unit.get("mapVisual", {}) as Dictionary
		var resolved_target_tile_id := _resolve_unit_target_tile_id(unit, map_visual)
		var current_tile_id := str(unit.get("tileId", map_visual.get("currentTileId", ""))).strip_edges()
		if resolved_target_tile_id != "" and current_tile_id == resolved_target_tile_id:
			arrived_unit_ids.append(unit_id)
		if _unit_has_intercepted_result_motion(unit, map_visual):
			intercepted_unit_ids.append(unit_id)
		if _unit_has_retreating_result_motion(unit, map_visual):
			retreating_unit_ids.append(unit_id)
	active_unit_ids.sort()
	arrived_unit_ids.sort()
	intercepted_unit_ids.sort()
	retreating_unit_ids.sort()

	var history_anchor := _world_has_troop_march_history_anchor(active_unit_ids)
	var arrived_motion := (
		not arrived_unit_ids.is_empty()
		and target_cue_count > 0
		and arrow_cue_count > 0
	)
	var blocked_motion := (
		not active_unit_ids.is_empty()
		and target_cue_count > 0
		and (
			path_cue_count <= 0
			or arrow_cue_count <= 0
		)
	)
	var blocked_retry_feedback := "重试行军" if blocked_motion else ""
	var blocked_alternate_route_feedback := "改走别线" if blocked_motion else ""
	var blocked_next_action_feedback := "重试行军 / 改走别线" if blocked_motion else ""
	var intercepted_motion := not intercepted_unit_ids.is_empty()
	var retreating_motion := not retreating_unit_ids.is_empty()
	var feedback_chain_partial := blocked_motion or intercepted_motion or retreating_motion
	var feedback_chain_token := WORLD_TROOP_MARCH_FEEDBACK_CHAIN_CONTRACT
	var feedback_chain_state := ""
	var feedback_chain_visible_reason := ""
	var feedback_chain_next_action_hint := ""
	var feedback_chain_visible_budget_lines := 0
	if blocked_motion:
		feedback_chain_state = "blocked"
		feedback_chain_visible_reason = "前方路线受阻"
		feedback_chain_next_action_hint = blocked_next_action_feedback
		feedback_chain_visible_budget_lines = 3
	elif intercepted_motion:
		feedback_chain_state = "intercepted"
		feedback_chain_visible_reason = "遭遇拦截"
		feedback_chain_next_action_hint = "查看战况 / 等待回合"
		feedback_chain_visible_budget_lines = 2
	elif retreating_motion:
		feedback_chain_state = "retreating"
		feedback_chain_visible_reason = "部队撤回中"
		feedback_chain_next_action_hint = "返回地图 / 等待撤回完成"
		feedback_chain_visible_budget_lines = 2
	elif arrived_motion:
		feedback_chain_state = "arrived"
		feedback_chain_visible_reason = "已抵达目标"
		feedback_chain_next_action_hint = "查看结果"
		feedback_chain_visible_budget_lines = 2
	elif not active_unit_ids.is_empty():
		feedback_chain_state = "marching"
		feedback_chain_visible_reason = "行军中"
		feedback_chain_next_action_hint = "等待结果"
		feedback_chain_visible_budget_lines = 2
	var feedback_chain_visible_budget_guard := feedback_chain_visible_budget_lines > 0 and feedback_chain_visible_budget_lines <= 3
	var feedback_chain_visible_budget_guard_reason := "compact_text_only" if feedback_chain_visible_budget_guard else "budget_overrun"
	var states: Array = []
	if not active_unit_ids.is_empty():
		states.append("marching")
	if arrived_motion:
		states.append("arrived")
	if intercepted_motion:
		states.append("intercepted")
	if retreating_motion:
		states.append("retreating")
	if blocked_motion:
		states.append("blocked")
	if history_anchor:
		states.append("result_anchor")
	return {
		"token": WORLD_TROOP_MARCH_RESULT_MOTION_CONTRACT,
		"ok": (arrived_motion and history_anchor) or intercepted_motion or retreating_motion or blocked_motion,
		"feedbackChainToken": feedback_chain_token,
		"feedbackChainPartial": feedback_chain_partial,
		"feedbackChainState": feedback_chain_state,
		"feedbackChainVisibleReason": feedback_chain_visible_reason,
		"feedbackChainNextActionHint": feedback_chain_next_action_hint,
		"feedbackChainVisibleBudgetLines": feedback_chain_visible_budget_lines,
		"feedbackChainVisibleBudgetGuard": feedback_chain_visible_budget_guard,
		"feedbackChainVisibleBudgetGuardReason": feedback_chain_visible_budget_guard_reason,
		"arrived": arrived_motion,
		"intercepted": intercepted_motion,
		"interceptedFeedback": "遭遇拦截" if intercepted_motion else "",
		"retreating": retreating_motion,
		"retreatingFeedback": "部队撤回中" if retreating_motion else "",
		"blocked": blocked_motion,
		"blockedFeedback": "行军受阻" if blocked_motion else "",
		"blockedRetryFeedback": blocked_retry_feedback,
		"blockedAlternateRouteFeedback": blocked_alternate_route_feedback,
		"blockedNextActionFeedback": blocked_next_action_feedback,
		"historyAnchor": history_anchor,
		"states": states,
		"activeUnitIds": active_unit_ids,
		"arrivedUnitIds": arrived_unit_ids,
		"interceptedUnitIds": intercepted_unit_ids,
		"retreatingUnitIds": retreating_unit_ids,
		"pathCueCount": path_cue_count,
		"targetCueCount": target_cue_count,
		"arrowCueCount": arrow_cue_count,
	}

func _unit_has_intercepted_result_motion(unit: Dictionary, map_visual: Dictionary) -> bool:
	for value_variant in [
		unit.get("status", ""),
		map_visual.get("status", ""),
		unit.get("resultState", ""),
		map_visual.get("resultState", ""),
		unit.get("motionState", ""),
		map_visual.get("motionState", ""),
	]:
		var value := str(value_variant).strip_edges().to_lower()
		if value == "intercepted" or value == "intercept" or value == "engaged" or value == "拦截":
			return true
	var march_variant: Variant = unit.get("march", {})
	if march_variant is Dictionary:
		var march: Dictionary = march_variant as Dictionary
		for march_value_variant in [march.get("status", ""), march.get("resultState", ""), march.get("motionState", "")]:
			var march_value := str(march_value_variant).strip_edges().to_lower()
			if march_value == "intercepted" or march_value == "intercept" or march_value == "engaged" or march_value == "拦截":
				return true
	return false

func _unit_has_retreating_result_motion(unit: Dictionary, map_visual: Dictionary) -> bool:
	for value_variant in [
		unit.get("status", ""),
		map_visual.get("status", ""),
		unit.get("resultState", ""),
		map_visual.get("resultState", ""),
		unit.get("motionState", ""),
		map_visual.get("motionState", ""),
	]:
		var value := str(value_variant).strip_edges().to_lower()
		if value == "retreating" or value == "retreat" or value == "撤退":
			return true
	var march_variant: Variant = unit.get("march", {})
	if march_variant is Dictionary:
		var march: Dictionary = march_variant as Dictionary
		for march_value_variant in [march.get("status", ""), march.get("resultState", ""), march.get("motionState", "")]:
			var march_value := str(march_value_variant).strip_edges().to_lower()
			if march_value == "retreating" or march_value == "retreat" or march_value == "撤退":
				return true
	return false

func _world_has_troop_march_history_anchor(unit_ids: Array) -> bool:
	var world_payload: Dictionary = WorldStore.world
	for report_key in ["reports", "battleReports", "events", "worldEvents"]:
		var raw_entries: Variant = world_payload.get(report_key, [])
		if _entry_list_has_troop_march_anchor(raw_entries, unit_ids):
			return true
	var history_payload: Dictionary = world_payload.get("history", {}) as Dictionary
	for history_key in ["timeline", "events", "worldEvents", "executionReplays"]:
		var raw_history_entries: Variant = history_payload.get(history_key, [])
		if _entry_list_has_troop_march_anchor(raw_history_entries, unit_ids):
			return true
	return false

func _entry_list_has_troop_march_anchor(raw_entries: Variant, unit_ids: Array) -> bool:
	if not (raw_entries is Array):
		return false
	for entry_variant in raw_entries as Array:
		var entry_text := str(entry_variant)
		var lower_entry_text := entry_text.to_lower()
		var mentions_march := (
			lower_entry_text.find("move_unit") >= 0
			or lower_entry_text.find("moveunit") >= 0
			or entry_text.find("行军") >= 0
			or entry_text.find("机动") >= 0
		)
		if not mentions_march:
			continue
		if unit_ids.is_empty():
			return true
		for unit_id_variant in unit_ids:
			var unit_id := str(unit_id_variant).strip_edges()
			if unit_id != "" and entry_text.find(unit_id) >= 0:
				return true
		return true
	return false

func _resolve_unit_march_direction(unit: Dictionary, fallback: Vector2 = Vector2.ZERO) -> Vector2:
	var march: Dictionary = unit.get("march", {}) as Dictionary
	var origin_tile_id := str(march.get("originTileId", "")).strip_edges()
	var target_tile_id := str(march.get("targetTileId", "")).strip_edges()
	var direction := _resolve_tile_direction_vector(origin_tile_id, target_tile_id)
	if direction != Vector2.ZERO:
		return direction

	var map_visual: Dictionary = unit.get("mapVisual", {}) as Dictionary
	var path_tile_ids: Array[String] = _resolve_unit_path_tile_ids(unit, map_visual)
	if path_tile_ids.size() >= 2:
		direction = _resolve_tile_direction_vector(path_tile_ids[0], path_tile_ids[path_tile_ids.size() - 1])
		if direction != Vector2.ZERO:
			return direction

	return fallback

func _animate_marker_move(
	marker: Node2D,
	from_position: Vector2,
	target_position: Vector2,
	engage_intensity_after_move: float,
	engage_kind_after_move: String,
	engage_direction_after_move: Vector2,
	keep_march_loop: bool = false,
	march_direction_after_move: Vector2 = Vector2.ZERO,
) -> void:
	_cancel_marker_tween(marker)
	marker.position = from_position
	var move_direction: Vector2 = (target_position - from_position).normalized() if target_position.distance_to(from_position) > 0.001 else engage_direction_after_move
	if move_direction == Vector2.ZERO:
		move_direction = march_direction_after_move
	if marker != null and marker.has_method("set_moving"):
		marker.call("set_moving", true, move_direction)
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_CUBIC)
	tween.set_ease(Tween.EASE_OUT)
	marker.set_meta("move_tween", tween)
	tween.tween_property(marker, "position", target_position, move_duration_sec)
	if engage_intensity_after_move > 0.0:
		tween.tween_callback(
			Callable(marker, "play_engage").bind(
				engage_intensity_after_move,
				engage_direction_after_move,
				engage_kind_after_move,
			),
		)
	tween.tween_callback(Callable(self, "_on_marker_move_finished").bind(marker, keep_march_loop, march_direction_after_move))

func _cancel_marker_tween(marker: Node2D) -> void:
	if marker == null or not marker.has_meta("move_tween"):
		return
	var running_tween: Variant = marker.get_meta("move_tween")
	if running_tween is Tween:
		(running_tween as Tween).kill()
	marker.remove_meta("move_tween")

func _on_marker_move_finished(marker: Node2D, keep_march_loop: bool = false, march_direction: Vector2 = Vector2.ZERO) -> void:
	if marker == null:
		return
	if marker.has_meta("move_tween"):
		marker.remove_meta("move_tween")
	if marker.has_method("set_moving"):
		marker.call("set_moving", keep_march_loop, march_direction)

func _resolve_faction_color(faction_id: String) -> Color:
	return FactionVisualsScript.resolve_marker_color(faction_id, _resolve_human_faction_id())

func _resolve_unit_banner_color(unit: Dictionary, faction_id: String = "") -> Color:
	var fallback_faction_id: String = faction_id
	if fallback_faction_id == "":
		fallback_faction_id = _resolve_unit_faction_id(unit)
	var fallback_color: Color = _resolve_faction_color(fallback_faction_id)
	var map_visual: Dictionary = unit.get("mapVisual", {}) as Dictionary
	var banner_color_text: String = str(map_visual.get("bannerColor", "")).strip_edges()
	if banner_color_text == "":
		return fallback_color
	return _parse_hex_color(banner_color_text, fallback_color)

func _resolve_unit_path_color(unit: Dictionary) -> Color:
	var banner_color: Color = _resolve_unit_banner_color(unit)
	var color: Color = banner_color.lerp(Color(1.0, 0.84, 0.34, 0.86), 0.32)
	color.a = 0.86
	return color

func _resolve_unit_target_color(unit: Dictionary) -> Color:
	var banner_color: Color = _resolve_unit_banner_color(unit)
	var color: Color = banner_color.lerp(Color(1.0, 0.50, 0.28, 0.96), 0.24)
	color.a = 0.96
	return color

func _parse_hex_color(raw_value: String, fallback: Color) -> Color:
	var normalized: String = raw_value.strip_edges()
	if normalized.begins_with("#"):
		normalized = normalized.substr(1)
	if normalized.length() != 6 and normalized.length() != 8:
		return fallback
	if not _is_hex_string(normalized):
		return fallback
	var red: float = float(normalized.substr(0, 2).hex_to_int()) / 255.0
	var green: float = float(normalized.substr(2, 2).hex_to_int()) / 255.0
	var blue: float = float(normalized.substr(4, 2).hex_to_int()) / 255.0
	var alpha: float = fallback.a
	if normalized.length() == 8:
		alpha = float(normalized.substr(6, 2).hex_to_int()) / 255.0
	return Color(red, green, blue, alpha)

func _is_hex_string(value: String) -> bool:
	for index in range(value.length()):
		var code: int = value.unicode_at(index)
		var is_digit := code >= 48 and code <= 57
		var is_upper := code >= 65 and code <= 70
		var is_lower := code >= 97 and code <= 102
		if not (is_digit or is_upper or is_lower):
			return false
	return true

func get_visual_acceptance_summary() -> Dictionary:
	var markers: Array = []
	var visual_type_counts: Dictionary = {}
	var moving_unit_body_visual_contracts: Array = []
	var moving_unit_body_visual_types: Array = []
	var moving_unit_body_formation_visual_types: Array = []
	var moving_unit_body_formation_marker_count := 0
	var moving_unit_body_frame_source := ""
	var moving_unit_body_frame_manifest_path := ""
	var moving_unit_body_uses_generated_troops_foreground := false
	var world_troop_march_motion_moving_unit_ids: Array = []
	for unit_id_variant in _prev_units_by_id.keys():
		var unit_id: String = str(unit_id_variant)
		if _city_stationed_hidden_unit_ids.has(unit_id):
			continue
		var unit: Dictionary = _prev_units_by_id[unit_id] as Dictionary
		var visual_type: String = _resolve_visual_type(unit)
		visual_type_counts[visual_type] = int(visual_type_counts.get(visual_type, 0)) + 1
		var marker_summary: Dictionary = {}
		var marker_position := Vector2.ZERO
		var marker_screen_position := Vector2.ZERO
		if _markers_by_unit_id.has(unit_id):
			var marker: Node2D = _markers_by_unit_id[unit_id] as Node2D
			if marker != null:
				marker_position = marker.global_position
				marker_screen_position = marker.get_global_transform_with_canvas().origin
				if marker.has_method("get_visual_debug_state"):
					marker_summary = marker.call("get_visual_debug_state") as Dictionary
					var body_contract := str(marker_summary.get("movingUnitBodyVisualContract", "")).strip_edges()
					if body_contract != "" and not moving_unit_body_visual_contracts.has(body_contract):
						moving_unit_body_visual_contracts.append(body_contract)
					var body_visual_type := str(marker_summary.get("visualType", "")).strip_edges()
					if body_visual_type != "" and not moving_unit_body_visual_types.has(body_visual_type):
						moving_unit_body_visual_types.append(body_visual_type)
					var formation_visual_types_variant: Variant = marker_summary.get("movingUnitBodyFormationVisualTypes", [])
					if formation_visual_types_variant is Array:
						for formation_visual_type_variant in formation_visual_types_variant as Array:
							var formation_visual_type := str(formation_visual_type_variant).strip_edges()
							if formation_visual_type != "" and not moving_unit_body_formation_visual_types.has(formation_visual_type):
								moving_unit_body_formation_visual_types.append(formation_visual_type)
					if int(marker_summary.get("movingUnitBodyFormationSlotCount", 0)) >= 2:
						moving_unit_body_formation_marker_count += 1
					if moving_unit_body_frame_source == "":
						moving_unit_body_frame_source = str(marker_summary.get("movingUnitBodyFrameSource", "")).strip_edges()
					if moving_unit_body_frame_manifest_path == "":
						moving_unit_body_frame_manifest_path = str(marker_summary.get("movingUnitBodyFrameManifestPath", "")).strip_edges()
					moving_unit_body_uses_generated_troops_foreground = (
						moving_unit_body_uses_generated_troops_foreground
						or bool(marker_summary.get("movingUnitBodyUsesGeneratedTroopsForeground", false))
					)
					if bool(marker_summary.get("moving", false)) and not world_troop_march_motion_moving_unit_ids.has(unit_id):
						world_troop_march_motion_moving_unit_ids.append(unit_id)
		var march_display_summary: Dictionary = _build_unit_march_display_debug_summary(unit, marker_position)
		if bool(march_display_summary.get("active", false)) and not world_troop_march_motion_moving_unit_ids.has(unit_id):
			world_troop_march_motion_moving_unit_ids.append(unit_id)
		markers.append({
			"unitId": unit_id,
			"visualType": visual_type,
			"selected": unit_id == _selected_unit_id,
			"position": {"x": marker_position.x, "y": marker_position.y},
			"screenPosition": {"x": marker_screen_position.x, "y": marker_screen_position.y},
			"marchDisplay": march_display_summary,
			"marker": marker_summary,
		})

	var label_texts: Array = []
	var label_text_values: Array = []
	var countdown_label_count: int = 0
	for unit_id_variant in _unit_labels_by_id.keys():
		var unit_id: String = str(unit_id_variant)
		var label: Control = _unit_labels_by_id[unit_id] as Control
		if label == null:
			continue
		var text_label := _get_unit_label_text_label(label)
		var text: String = text_label.text if text_label != null else ""
		if text != "" and not label_text_values.has(text):
			label_text_values.append(text)
		label_texts.append({
			"unitId": unit_id,
			"text": text,
			"position": {"x": label.position.x, "y": label.position.y},
			"size": {"x": label.size.x, "y": label.size.y},
			"avoidanceApplied": bool(label.get_meta("avoidance_applied", false)),
			"clampApplied": bool(label.get_meta("clamp_applied", false)),
			"densityCompacted": bool(label.get_meta("density_compacted", false)),
			"hasPlate": label is PanelContainer,
			"fontSize": text_label.get_theme_font_size("font_size") if text_label != null else 0,
		})
		if text.find(":") >= 0:
			countdown_label_count += 1

	var path_debug_samples: Array = []
	if _selected_unit_id != "" and _prev_units_by_id.has(_selected_unit_id):
		path_debug_samples.append(_build_unit_path_debug_summary(_selected_unit_id, _prev_units_by_id[_selected_unit_id] as Dictionary))
	for unit_id_variant in _prev_units_by_id.keys():
		var unit_id: String = str(unit_id_variant)
		if unit_id == _selected_unit_id:
			continue
		var unit: Dictionary = _prev_units_by_id[unit_id] as Dictionary
		if unit_id != _selected_unit_id and not _unit_has_path_debug_interest(unit):
			continue
		path_debug_samples.append(_build_unit_path_debug_summary(unit_id, unit))
		if path_debug_samples.size() >= 4:
			break

	var path_summary: Dictionary = {}
	if _unit_path_layer != null and is_instance_valid(_unit_path_layer) and _unit_path_layer.has_method("get_visual_debug_summary"):
		path_summary = _unit_path_layer.call("get_visual_debug_summary") as Dictionary
	world_troop_march_motion_moving_unit_ids.sort()
	var world_troop_march_motion_path_cue_count := int(path_summary.get("pathCount", 0))
	var world_troop_march_motion_target_cue_count := int(path_summary.get("targetCount", 0))
	var world_troop_march_motion_arrow_cue_count := int(path_summary.get("arrowEstimateCount", 0))
	var world_troop_march_blocked_screenshot_fixture_active := (
		_world_troop_march_blocked_screenshot_fixture_unit_id != ""
		and world_troop_march_motion_moving_unit_ids.has(_world_troop_march_blocked_screenshot_fixture_unit_id)
	)
	var world_troop_march_intercepted_screenshot_fixture_active := (
		_world_troop_march_intercepted_screenshot_fixture_unit_id != ""
		and world_troop_march_motion_moving_unit_ids.has(_world_troop_march_intercepted_screenshot_fixture_unit_id)
	)
	var world_troop_march_retreating_screenshot_fixture_active := (
		_world_troop_march_retreating_screenshot_fixture_unit_id != ""
		and world_troop_march_motion_moving_unit_ids.has(_world_troop_march_retreating_screenshot_fixture_unit_id)
	)
	if world_troop_march_blocked_screenshot_fixture_active:
		world_troop_march_motion_path_cue_count = 0
		world_troop_march_motion_target_cue_count = maxi(world_troop_march_motion_target_cue_count, 1)
		world_troop_march_motion_arrow_cue_count = 0
	var world_troop_march_result_motion_summary := _build_world_troop_march_result_motion_summary(
		world_troop_march_motion_moving_unit_ids,
		world_troop_march_motion_path_cue_count,
		world_troop_march_motion_target_cue_count,
		world_troop_march_motion_arrow_cue_count,
	)
	var world_troop_march_result_motion_ok := bool(world_troop_march_result_motion_summary.get("ok", false))
	var world_troop_march_motion_ok := (
		not world_troop_march_motion_moving_unit_ids.is_empty()
		and world_troop_march_motion_path_cue_count > 0
		and world_troop_march_motion_target_cue_count > 0
		and world_troop_march_motion_arrow_cue_count > 0
		and not moving_unit_body_visual_contracts.is_empty()
		and moving_unit_body_frame_source != ""
		and not moving_unit_body_uses_generated_troops_foreground
	)
	var active_anchor_profile_ids: Array = _city_visual_anchor_active_profile_ids.keys()
	active_anchor_profile_ids.sort()
	var backend_active_anchor_profile_ids: Array = _city_visual_backend_active_profile_ids.keys()
	backend_active_anchor_profile_ids.sort()
	var anchor_profile: Dictionary = {}
	if _city_visual_anchor_profiles_by_id.has(_city_visual_anchor_last_profile_id):
		anchor_profile = _city_visual_anchor_profiles_by_id[_city_visual_anchor_last_profile_id] as Dictionary
	var anchor_profile_ids: Array = _city_visual_anchor_profiles_by_id.keys()
	anchor_profile_ids.sort()
	var queue_anchor_ids: Array = []
	var raw_queue_anchor_ids: Variant = anchor_profile.get("queueAnchorIds", [])
	if raw_queue_anchor_ids is Array:
		queue_anchor_ids = raw_queue_anchor_ids as Array
	var ai_living_activity_marker_keys: Array = []
	var ai_living_activity_marker_tile_ids: Array = []
	var ai_living_activity_marker_screen_positions: Array = []
	var ai_living_activity_distinct_target_tile_ids: Array = []
	var ai_living_activity_separated_marker_positions: Array = []
	var ai_living_activity_marker_avatar_visible_count := 0
	var ai_living_activity_marker_status_badge_visible_count := 0
	var ai_living_activity_marker_target_line_visible_count := 0
	var ai_living_activity_marker_avatar_image_paths: Array = []
	var ai_living_activity_marker_visual_debug_samples: Array = []
	var ai_living_activity_marker_family_contracts: Array = []
	var ai_living_activity_marker_frame_asset_loaded_count := 0
	var ai_living_activity_marker_frame_asset_draw_count := 0
	var ai_living_activity_marker_route_arrow_asset_draw_count := 0
	var ai_living_activity_marker_cluster_badge_asset_draw_count := 0
	var ai_living_activity_marker_queue_count_visible_count := 0
	var ai_living_activity_marker_max_queue_count := 0
	var ai_living_activity_marker_aggregation_dot_visible_count := 0
	var ai_living_activity_marker_max_aggregation_dot_count := 0
	var ai_living_activity_marker_carrying_troops_strip_contracts: Array = []
	var ai_living_activity_marker_carrying_troops_generated_sources: Array = []
	var ai_living_activity_marker_carrying_troops_strip_visible_count := 0
	var ai_living_activity_marker_carrying_troops_slot_count := 0
	var ai_living_activity_marker_carrying_troops_texture_draw_count := 0
	var ai_living_activity_marker_carrying_troops_labels: Array = []
	var ai_living_activity_marker_carrying_troops_asset_paths: Array = []
	var ai_living_activity_marker_jump_target_ready_count := 0
	var ai_living_activity_marker_focus_expectation_ready_count := 0
	var ai_living_activity_marker_focus_expectation_target_ids: Array = []
	for ai_marker_key_variant in _ai_map_markers_by_key.keys():
		var ai_marker_key := str(ai_marker_key_variant)
		if not ai_marker_key.begins_with("living_activity:"):
			continue
		ai_living_activity_marker_keys.append(ai_marker_key)
		var ai_marker: Node2D = _ai_map_markers_by_key[ai_marker_key] as Node2D
		if ai_marker != null and ai_marker.has_meta("tile_id"):
			var ai_marker_tile_id := str(ai_marker.get_meta("tile_id")).strip_edges()
			ai_living_activity_marker_tile_ids.append(ai_marker_tile_id)
			if ai_marker_tile_id != "" and not ai_living_activity_distinct_target_tile_ids.has(ai_marker_tile_id):
				ai_living_activity_distinct_target_tile_ids.append(ai_marker_tile_id)
			var screen_position := ai_marker.get_global_transform_with_canvas().origin
			ai_living_activity_marker_screen_positions.append({"x": screen_position.x, "y": screen_position.y})
			if bool(ai_marker.get_meta("jump_target_ready", false)):
				ai_living_activity_marker_jump_target_ready_count += 1
			var focus_expectation_variant: Variant = ai_marker.get_meta("focus_expectation", {})
			if focus_expectation_variant is Dictionary:
				var focus_expectation: Dictionary = focus_expectation_variant as Dictionary
				if bool(focus_expectation.get("ready", false)):
					ai_living_activity_marker_focus_expectation_ready_count += 1
					var focus_target_id := str(focus_expectation.get("targetId", "")).strip_edges()
					if focus_target_id != "" and not ai_living_activity_marker_focus_expectation_target_ids.has(focus_target_id):
						ai_living_activity_marker_focus_expectation_target_ids.append(focus_target_id)
			var is_separated_position := true
			for existing_position_variant in ai_living_activity_separated_marker_positions:
				var existing_position: Vector2 = existing_position_variant as Vector2
				if existing_position.distance_to(screen_position) < 40.0:
					is_separated_position = false
					break
			if is_separated_position:
				ai_living_activity_separated_marker_positions.append(screen_position)
			if ai_marker.has_method("get_visual_debug_state"):
				var visual_debug_variant: Variant = ai_marker.call("get_visual_debug_state")
				if visual_debug_variant is Dictionary:
					var visual_debug: Dictionary = visual_debug_variant as Dictionary
					ai_living_activity_marker_visual_debug_samples.append(visual_debug.duplicate(true))
					var marker_family_contract := str(visual_debug.get("markerFamilyContract", "")).strip_edges()
					if marker_family_contract != "" and not ai_living_activity_marker_family_contracts.has(marker_family_contract):
						ai_living_activity_marker_family_contracts.append(marker_family_contract)
					if bool(visual_debug.get("markerFrameAssetLoaded", false)):
						ai_living_activity_marker_frame_asset_loaded_count += 1
					if bool(visual_debug.get("markerFrameAssetDrawn", false)):
						ai_living_activity_marker_frame_asset_draw_count += 1
					if bool(visual_debug.get("routeArrowAssetDrawn", false)):
						ai_living_activity_marker_route_arrow_asset_draw_count += 1
					if bool(visual_debug.get("clusterBadgeAssetDrawn", false)):
						ai_living_activity_marker_cluster_badge_asset_draw_count += 1
					if bool(visual_debug.get("avatarVisible", false)):
						ai_living_activity_marker_avatar_visible_count += 1
					if bool(visual_debug.get("statusBadgeVisible", false)):
						ai_living_activity_marker_status_badge_visible_count += 1
					if bool(visual_debug.get("targetLineVisible", false)):
						ai_living_activity_marker_target_line_visible_count += 1
					if bool(visual_debug.get("queueCountVisible", false)):
						ai_living_activity_marker_queue_count_visible_count += 1
					if bool(visual_debug.get("aggregationDotsVisible", false)):
						ai_living_activity_marker_aggregation_dot_visible_count += 1
					ai_living_activity_marker_max_queue_count = maxi(ai_living_activity_marker_max_queue_count, int(visual_debug.get("queueCount", 0)))
					ai_living_activity_marker_max_aggregation_dot_count = maxi(ai_living_activity_marker_max_aggregation_dot_count, int(visual_debug.get("aggregationDotCount", 0)))
					var carrying_troops_strip_contract := str(visual_debug.get("aiLivingActivityMarkerCarryingTroopsStripContract", "")).strip_edges()
					if carrying_troops_strip_contract != "" and not ai_living_activity_marker_carrying_troops_strip_contracts.has(carrying_troops_strip_contract):
						ai_living_activity_marker_carrying_troops_strip_contracts.append(carrying_troops_strip_contract)
					var carrying_troops_generated_source := str(visual_debug.get("aiLivingActivityMarkerCarryingTroopsGeneratedAssetSource", "")).strip_edges()
					if carrying_troops_generated_source != "" and not ai_living_activity_marker_carrying_troops_generated_sources.has(carrying_troops_generated_source):
						ai_living_activity_marker_carrying_troops_generated_sources.append(carrying_troops_generated_source)
					if bool(visual_debug.get("aiLivingActivityMarkerCarryingTroopsStripVisible", false)):
						ai_living_activity_marker_carrying_troops_strip_visible_count += 1
					ai_living_activity_marker_carrying_troops_slot_count = maxi(
						ai_living_activity_marker_carrying_troops_slot_count,
						int(visual_debug.get("aiLivingActivityMarkerCarryingTroopsSlotCount", 0))
					)
					ai_living_activity_marker_carrying_troops_texture_draw_count = maxi(
						ai_living_activity_marker_carrying_troops_texture_draw_count,
						int(visual_debug.get("aiLivingActivityMarkerCarryingTroopsTextureDrawCount", 0))
					)
					var carrying_troops_labels_variant: Variant = visual_debug.get("aiLivingActivityMarkerCarryingTroopsLabels", [])
					if carrying_troops_labels_variant is Array:
						for label_variant in carrying_troops_labels_variant as Array:
							var carrying_label := str(label_variant).strip_edges()
							if carrying_label != "" and not ai_living_activity_marker_carrying_troops_labels.has(carrying_label):
								ai_living_activity_marker_carrying_troops_labels.append(carrying_label)
					var carrying_troops_asset_paths_variant: Variant = visual_debug.get("aiLivingActivityMarkerCarryingTroopsAssetPaths", [])
					if carrying_troops_asset_paths_variant is Array:
						for asset_path_variant in carrying_troops_asset_paths_variant as Array:
							var carrying_asset_path := str(asset_path_variant).strip_edges()
							if carrying_asset_path != "" and not ai_living_activity_marker_carrying_troops_asset_paths.has(carrying_asset_path):
								ai_living_activity_marker_carrying_troops_asset_paths.append(carrying_asset_path)
					var avatar_image_path := str(visual_debug.get("avatarImagePath", "")).strip_edges()
					if avatar_image_path != "" and not ai_living_activity_marker_avatar_image_paths.has(avatar_image_path):
						ai_living_activity_marker_avatar_image_paths.append(avatar_image_path)
	ai_living_activity_marker_keys.sort()
	ai_living_activity_marker_tile_ids.sort()
	ai_living_activity_distinct_target_tile_ids.sort()
	ai_living_activity_marker_avatar_image_paths.sort()
	ai_living_activity_marker_family_contracts.sort()
	ai_living_activity_marker_carrying_troops_strip_contracts.sort()
	ai_living_activity_marker_carrying_troops_generated_sources.sort()
	ai_living_activity_marker_carrying_troops_labels.sort()
	ai_living_activity_marker_carrying_troops_asset_paths.sort()
	ai_living_activity_marker_focus_expectation_target_ids.sort()
	moving_unit_body_visual_contracts.sort()
	moving_unit_body_visual_types.sort()
	moving_unit_body_formation_visual_types.sort()

	var summary := {
		"aiLivingActivityLayerContract": AI_LIVING_ACTIVITY_LAYER_CONTRACT,
		"aiLivingActivityMarkerFamilyContract": ai_living_activity_marker_family_contracts[0] if not ai_living_activity_marker_family_contracts.is_empty() else "",
		"aiLivingActivityMarkerFamilyContracts": ai_living_activity_marker_family_contracts,
		"aiLivingActivityMarkerVisualAssetContract": AI_LIVING_ACTIVITY_MARKER_VISUAL_ASSET_CONTRACT,
		"aiLivingActivityMarkerQueueClusterContract": AI_LIVING_ACTIVITY_MARKER_QUEUE_CLUSTER_CONTRACT,
		"aiLivingActivityMarkerFrameAssetLoadedCount": ai_living_activity_marker_frame_asset_loaded_count,
		"aiLivingActivityMarkerFrameAssetDrawCount": ai_living_activity_marker_frame_asset_draw_count,
		"aiLivingActivityMarkerRouteArrowAssetDrawCount": ai_living_activity_marker_route_arrow_asset_draw_count,
		"aiLivingActivityMarkerClusterBadgeAssetDrawCount": ai_living_activity_marker_cluster_badge_asset_draw_count,
		"aiLivingActivityMarkerCount": _ai_living_activity_marker_count,
		"aiLivingActivityMarkerAvatarVisibleCount": ai_living_activity_marker_avatar_visible_count,
		"aiLivingActivityMarkerStatusBadgeVisibleCount": ai_living_activity_marker_status_badge_visible_count,
		"aiLivingActivityMarkerTargetLineVisibleCount": ai_living_activity_marker_target_line_visible_count,
		"aiLivingActivityMarkerQueueCountVisibleCount": ai_living_activity_marker_queue_count_visible_count,
		"aiLivingActivityMarkerMaxQueueCount": ai_living_activity_marker_max_queue_count,
		"aiLivingActivityMarkerAggregationDotVisibleCount": ai_living_activity_marker_aggregation_dot_visible_count,
		"aiLivingActivityMarkerMaxAggregationDotCount": ai_living_activity_marker_max_aggregation_dot_count,
		"aiLivingActivityMarkerAvatarImagePaths": ai_living_activity_marker_avatar_image_paths,
		"aiLivingActivityMarkerCarryingTroopsStripContract": ai_living_activity_marker_carrying_troops_strip_contracts[0] if not ai_living_activity_marker_carrying_troops_strip_contracts.is_empty() else "",
		"aiLivingActivityMarkerCarryingTroopsStripContracts": ai_living_activity_marker_carrying_troops_strip_contracts,
		"aiLivingActivityMarkerCarryingTroopsGeneratedAssetSource": ai_living_activity_marker_carrying_troops_generated_sources[0] if not ai_living_activity_marker_carrying_troops_generated_sources.is_empty() else "",
		"aiLivingActivityMarkerCarryingTroopsGeneratedAssetSources": ai_living_activity_marker_carrying_troops_generated_sources,
		"aiLivingActivityMarkerCarryingTroopsStripVisibleCount": ai_living_activity_marker_carrying_troops_strip_visible_count,
		"aiLivingActivityMarkerCarryingTroopsSlotCount": ai_living_activity_marker_carrying_troops_slot_count,
		"aiLivingActivityMarkerCarryingTroopsTextureDrawCount": ai_living_activity_marker_carrying_troops_texture_draw_count,
		"aiLivingActivityMarkerCarryingTroopsLabels": ai_living_activity_marker_carrying_troops_labels,
		"aiLivingActivityMarkerCarryingTroopsAssetPaths": ai_living_activity_marker_carrying_troops_asset_paths,
		"aiLivingActivityMarkerVisualDebugSamples": ai_living_activity_marker_visual_debug_samples,
		"aiLivingActivityUsesExecutionTrace": _ai_living_activity_uses_execution_trace,
		"aiLivingActivityFallbackUsed": _ai_living_activity_fallback_used,
		"aiLivingActivityFirstTraceId": _resolve_first_ai_living_activity_marker_trace_id(),
		"aiLivingActivityMarkerViewportClampedCount": _ai_living_activity_marker_viewport_clamped_count,
		"aiActivityMarkerJumpTargetReady": ai_living_activity_marker_jump_target_ready_count > 0,
		"aiActivityMarkerJumpTargetReadyCount": ai_living_activity_marker_jump_target_ready_count,
		"aiActivityMarkerFocusExpectationReady": ai_living_activity_marker_focus_expectation_ready_count > 0,
		"aiActivityMarkerFocusExpectationReadyCount": ai_living_activity_marker_focus_expectation_ready_count,
		"aiActivityMarkerFocusExpectationTargetIds": ai_living_activity_marker_focus_expectation_target_ids,
		"aiActivityMarkerFocusExpectationRequiresRuntimeClick": ai_living_activity_marker_focus_expectation_ready_count > 0,
		"aiActivityMarkerFocusExpectationFocusPerformed": false,
		"aiLivingActivityLongTracePositionContract": AI_LIVING_ACTIVITY_LONG_TRACE_POSITION_CONTRACT,
		"aiLivingActivityRouteTraceStepCount": _ai_living_activity_marker_count,
		"aiLivingActivityDistinctTargetTileCount": ai_living_activity_distinct_target_tile_ids.size(),
		"aiLivingActivitySeparatedMarkerPositionCount": ai_living_activity_separated_marker_positions.size(),
		"aiLivingActivitySeparatedMarkerPositionOk": _ai_living_activity_marker_count >= 3 and ai_living_activity_distinct_target_tile_ids.size() >= 2 and ai_living_activity_separated_marker_positions.size() >= 2,
		"aiLivingActivityMarkerKeys": ai_living_activity_marker_keys,
		"aiLivingActivityMarkerTileIds": ai_living_activity_marker_tile_ids,
		"aiLivingActivityMarkerScreenPositions": ai_living_activity_marker_screen_positions,
		"aiMapMarkerCount": _ai_map_markers_by_key.size(),
		"markerCount": _markers_by_unit_id.size(),
		"cityStationedHiddenCount": _city_stationed_hidden_unit_ids.size(),
		"cityStationedHiddenUnitIds": _city_stationed_hidden_unit_ids.keys(),
		"selectedUnitId": _selected_unit_id,
		"visualTypeCounts": visual_type_counts,
		"movingUnitBodyVisualContract": moving_unit_body_visual_contracts[0] if not moving_unit_body_visual_contracts.is_empty() else "",
		"movingUnitBodyVisualContracts": moving_unit_body_visual_contracts,
		"movingUnitBodyFrameSource": moving_unit_body_frame_source,
		"movingUnitBodyFrameManifestPath": moving_unit_body_frame_manifest_path,
		"movingUnitBodyUsesGeneratedTroopsForeground": moving_unit_body_uses_generated_troops_foreground,
		"movingUnitBodyFormationMarkerCount": moving_unit_body_formation_marker_count,
		"movingUnitBodyFormationVisualTypes": moving_unit_body_formation_visual_types,
		"movingUnitBodyVisualTypes": moving_unit_body_visual_types,
		"worldTroopMarchMotionContract": WORLD_TROOP_MARCH_MOTION_CONTRACT,
		"worldTroopMarchMotionOk": world_troop_march_motion_ok,
		"worldTroopMarchMotionMovingUnitCount": world_troop_march_motion_moving_unit_ids.size(),
		"worldTroopMarchMotionMovingUnitIds": world_troop_march_motion_moving_unit_ids,
		"worldTroopMarchMotionPathCueCount": world_troop_march_motion_path_cue_count,
		"worldTroopMarchMotionTargetCueCount": world_troop_march_motion_target_cue_count,
		"worldTroopMarchMotionArrowCueCount": world_troop_march_motion_arrow_cue_count,
		"worldTroopMarchMotionMovingBodyContract": moving_unit_body_visual_contracts[0] if not moving_unit_body_visual_contracts.is_empty() else "",
		"worldTroopMarchMotionFrameSource": moving_unit_body_frame_source,
		"worldTroopMarchResultMotionToken": WORLD_TROOP_MARCH_RESULT_MOTION_CONTRACT,
		"worldTroopMarchResultMotionOk": world_troop_march_result_motion_ok,
		"worldTroopMarchFeedbackChainToken": str(world_troop_march_result_motion_summary.get("feedbackChainToken", "")),
		"worldTroopMarchFeedbackChainPartial": bool(world_troop_march_result_motion_summary.get("feedbackChainPartial", false)),
		"worldTroopMarchFeedbackChainState": str(world_troop_march_result_motion_summary.get("feedbackChainState", "")),
		"worldTroopMarchFeedbackChainVisibleReason": str(world_troop_march_result_motion_summary.get("feedbackChainVisibleReason", "")),
		"worldTroopMarchFeedbackChainNextActionHint": str(world_troop_march_result_motion_summary.get("feedbackChainNextActionHint", "")),
		"worldTroopMarchFeedbackChainVisibleBudgetLines": int(world_troop_march_result_motion_summary.get("feedbackChainVisibleBudgetLines", 0)),
		"worldTroopMarchFeedbackChainVisibleBudgetGuard": bool(world_troop_march_result_motion_summary.get("feedbackChainVisibleBudgetGuard", false)),
		"worldTroopMarchFeedbackChainVisibleBudgetGuardReason": str(world_troop_march_result_motion_summary.get("feedbackChainVisibleBudgetGuardReason", "")),
		"worldTroopMarchArrivedMotion": bool(world_troop_march_result_motion_summary.get("arrived", false)),
		"worldTroopMarchInterceptedMotion": bool(world_troop_march_result_motion_summary.get("intercepted", false)),
		"worldTroopMarchInterceptedFeedback": str(world_troop_march_result_motion_summary.get("interceptedFeedback", "")),
		"worldTroopMarchInterceptedVisibleFeedback": label_text_values.has("遭遇拦截"),
		"worldTroopMarchInterceptedScreenshotFixtureActive": world_troop_march_intercepted_screenshot_fixture_active,
		"worldTroopMarchRetreatingMotion": bool(world_troop_march_result_motion_summary.get("retreating", false)),
		"worldTroopMarchRetreatingFeedback": str(world_troop_march_result_motion_summary.get("retreatingFeedback", "")),
		"worldTroopMarchRetreatingVisibleFeedback": label_text_values.has("部队撤回中"),
		"worldTroopMarchRetreatingScreenshotFixtureActive": world_troop_march_retreating_screenshot_fixture_active,
		"worldTroopMarchBlockedMotion": bool(world_troop_march_result_motion_summary.get("blocked", false)),
		"worldTroopMarchBlockedFeedback": str(world_troop_march_result_motion_summary.get("blockedFeedback", "")),
		"worldTroopMarchBlockedRetryFeedback": str(world_troop_march_result_motion_summary.get("blockedRetryFeedback", "")),
		"worldTroopMarchBlockedAlternateRouteFeedback": str(world_troop_march_result_motion_summary.get("blockedAlternateRouteFeedback", "")),
		"worldTroopMarchBlockedNextActionFeedback": str(world_troop_march_result_motion_summary.get("blockedNextActionFeedback", "")),
		"worldTroopMarchBlockedVisibleFeedback": label_text_values.has("行军受阻") or label_text_values.has(WORLD_TROOP_MARCH_BLOCKED_RECOVERY_VISIBLE_LABEL),
		"worldTroopMarchBlockedRecoveryVisibleFeedback": label_text_values.has(WORLD_TROOP_MARCH_BLOCKED_RECOVERY_VISIBLE_LABEL),
		"worldTroopMarchBlockedScreenshotFixtureActive": world_troop_march_blocked_screenshot_fixture_active,
		"worldTroopMarchHistoryAnchor": bool(world_troop_march_result_motion_summary.get("historyAnchor", false)),
		"worldTroopMarchResultStates": world_troop_march_result_motion_summary.get("states", []),
		"worldTroopMarchResultMotionSummary": world_troop_march_result_motion_summary,
		"countdownLabelCount": countdown_label_count,
		"labelAvoidanceAppliedCount": _label_avoidance_applied_count,
		"labelClampAppliedCount": _label_clamp_applied_count,
		"labelDensityCompactCount": _label_density_compact_count,
		"labelDensitySuppressedCount": _label_density_suppressed_count,
		"labelDensitySuppressedUnitIds": _label_density_suppressed_unit_ids.keys(),
		"labelVisibleCount": label_texts.size(),
		"labelTexts": label_texts,
		"pathLayer": path_summary,
		"pathDebugSamples": path_debug_samples,
		"cityQueueAnchor": {
			"source": _city_visual_anchor_config_source,
			"sourceMode": _city_visual_anchor_last_source_mode,
			"footprintSelectionMode": "backend-first",
			"configSchemaVersion": _city_visual_anchor_config_schema_version,
			"profileCount": _city_visual_anchor_profiles_by_id.size(),
			"profileIds": anchor_profile_ids,
			"activeProfileIds": active_anchor_profile_ids,
			"backendActiveProfileIds": backend_active_anchor_profile_ids,
			"activeProfileId": _city_visual_anchor_last_profile_id,
			"matchedTileId": _city_visual_anchor_last_matched_tile_id,
			"fallbackUsed": _city_visual_anchor_last_profile_id == "fallback_default",
			"localProfileFallbackUsed": _city_visual_anchor_last_source_mode != CITY_QUEUE_ANCHOR_SOURCE_MODE_BACKEND,
			"profileResolvedFromBackend": _city_visual_anchor_last_backend_profile_resolved,
			"backendFootprintInputMode": "backend" if _city_visual_backend_match_count > 0 else "none",
			"backendFootprintId": _city_visual_anchor_last_backend_footprint_id,
			"backendMatchedTileId": _city_visual_anchor_last_backend_matched_tile_id,
			"backendFootprintTileCount": _city_visual_anchor_last_backend_footprint_tile_count,
			"backendFootprintAnchorCount": _city_visual_backend_anchor_count,
			"backendFootprintMatchedTileCount": _city_visual_backend_match_count,
			"backendProfileCoverage": _city_visual_backend_profile_coverage.duplicate(true),
			"selectionReason": _city_visual_anchor_last_selection_reason,
			"footprintTileCount": _city_visual_footprint_tile_ids.size(),
			"stagingOffset": {"x": _city_visual_staging_offset.x, "y": _city_visual_staging_offset.y},
			"queueAnchorIds": queue_anchor_ids,
			"selectedQueueAnchorId": _city_visual_anchor_last_queue_anchor_id,
			"selectedQueueDirection": _city_visual_anchor_last_queue_anchor_direction,
			"selectedQueueAnchorSource": _city_visual_anchor_last_queue_anchor_source,
			"backendExitAnchorId": _city_visual_anchor_last_backend_exit_anchor_id,
			"backendRoadExitDirection": _city_visual_anchor_last_backend_road_exit_direction,
			"selectedQueueAnchorOffset": {
				"x": _city_visual_anchor_last_queue_anchor_offset.x,
				"y": _city_visual_anchor_last_queue_anchor_offset.y,
			},
			"queueAnchorApplied": bool(anchor_profile.get("queueAnchorApplied", false)),
		},
		"markers": markers,
	}
	SlgUiComponentFactoryScript.apply_stage_a_shared_motion_feedback_chain_summary(summary, "UnitViewLayer", "world_troop_march_result")
	var _stage_b_shared_motion_trigger := str(summary.get("stageASharedMotionTrigger", ""))
	return summary

func _build_unit_march_display_debug_summary(unit: Dictionary, marker_position: Vector2) -> Dictionary:
	var display: Dictionary = _resolve_unit_march_display_position(unit, marker_position)
	if not bool(display.get("ok", false)):
		return {
			"active": false,
			"reason": str(display.get("reason", "")),
		}
	var position: Vector2 = display.get("position", marker_position) as Vector2
	var direction: Vector2 = display.get("direction", Vector2.ZERO) as Vector2
	return {
		"active": true,
		"progress": float(display.get("progress", 0.0)),
		"segmentIndex": int(display.get("segmentIndex", -1)),
		"position": {"x": position.x, "y": position.y},
		"direction": {"x": direction.x, "y": direction.y},
		"startedAt": str(display.get("startedAt", "")),
		"estimatedArrivalAt": str(display.get("estimatedArrivalAt", "")),
		"durationSec": float(display.get("durationSec", 0.0)),
	}

func _unit_has_path_debug_interest(unit: Dictionary) -> bool:
	var map_visual: Dictionary = unit.get("mapVisual", {}) as Dictionary
	var march: Dictionary = unit.get("march", {}) as Dictionary
	var raw_current_path: Variant = map_visual.get("currentPath", [])
	var current_path_size := (raw_current_path as Array).size() if raw_current_path is Array else 0
	var raw_march_path: Variant = march.get("path", [])
	var march_path_size := (raw_march_path as Array).size() if raw_march_path is Array else 0
	return (
		str(map_visual.get("targetTileId", "")).strip_edges() != ""
		or str(map_visual.get("etaAt", map_visual.get("estimatedArrivalAt", ""))).strip_edges() != ""
		or current_path_size > 0
		or str(march.get("targetTileId", "")).strip_edges() != ""
		or march_path_size > 0
	)

func _build_unit_path_debug_summary(unit_id: String, unit: Dictionary) -> Dictionary:
	var map_visual: Dictionary = unit.get("mapVisual", {}) as Dictionary
	var march: Dictionary = unit.get("march", {}) as Dictionary
	var path_tile_ids: Array[String] = _resolve_unit_path_tile_ids(unit, map_visual)
	var path_data: Dictionary = _build_unit_path_data(unit)
	var current_path_size := 0
	var raw_current_path: Variant = map_visual.get("currentPath", [])
	if raw_current_path is Array:
		current_path_size = (raw_current_path as Array).size()
	var march_path_size := 0
	var raw_march_path: Variant = march.get("path", [])
	if raw_march_path is Array:
		march_path_size = (raw_march_path as Array).size()
	return {
		"unitId": unit_id,
		"tileId": str(unit.get("tileId", "")).strip_edges(),
		"selected": unit_id == _selected_unit_id,
		"mapVisualStatus": str(map_visual.get("status", "")).strip_edges(),
		"mapVisualTargetTileId": str(map_visual.get("targetTileId", "")).strip_edges(),
		"mapVisualCurrentPathSize": current_path_size,
		"marchTargetTileId": str(march.get("targetTileId", "")).strip_edges(),
		"marchOriginTileId": str(march.get("originTileId", "")).strip_edges(),
		"marchPathSize": march_path_size,
		"resolvedStartTileId": _resolve_unit_path_start_tile_id(unit, map_visual),
		"resolvedTargetTileId": _resolve_unit_target_tile_id(unit, map_visual),
		"resolvedPathTileIds": path_tile_ids,
		"hasStartPosition": _has_tile_marker_position(_resolve_unit_path_start_tile_id(unit, map_visual)),
		"hasTargetPosition": _has_tile_marker_position(_resolve_unit_target_tile_id(unit, map_visual)),
		"tilePositionCount": _tile_positions_by_id.size(),
		"pathDataEmpty": path_data.is_empty(),
		"pathPointCount": (path_data.get("points", []) as Array).size() if path_data.get("points", []) is Array else 0,
		"pathHasTarget": bool(path_data.get("hasTarget", false)),
		"marchDisplay": _build_unit_march_display_debug_summary(unit, Vector2.ZERO),
	}

func _trigger_engage_from_replay_frames(world_payload: Dictionary, next_units_by_id: Dictionary) -> void:
	var history_payload: Dictionary = world_payload.get("history", {}) as Dictionary
	var raw_replays: Variant = history_payload.get("executionReplays", [])
	if not (raw_replays is Array):
		return
	var units_by_tile: Dictionary = _index_unit_ids_by_tile(next_units_by_id)

	for replay_variant in raw_replays:
		if not (replay_variant is Dictionary):
			continue
		var replay: Dictionary = replay_variant as Dictionary
		var request_id: String = str(replay.get("requestId", "")).strip_edges()
		if request_id == "":
			continue
		var raw_frames: Variant = replay.get("frames", [])
		if not (raw_frames is Array):
			continue

		for frame_variant in raw_frames:
			if not (frame_variant is Dictionary):
				continue
			var frame: Dictionary = frame_variant as Dictionary
			var frame_id: String = _build_replay_frame_id(request_id, frame)
			if frame_id == "" or _seen_replay_frame_ids.has(frame_id):
				continue
			_remember_replay_frame_id(frame_id)

			if not _frame_has_engage_highlight(frame):
				continue

			var engage_targets: Dictionary = _collect_engage_targets_from_highlights(frame, units_by_tile)
			if engage_targets.is_empty():
				engage_targets = _collect_engage_targets_from_frame(frame)
				_replay_engage_kind_counts[ENGAGE_KIND_TILE_CONTROL] = int(_replay_engage_kind_counts.get(ENGAGE_KIND_TILE_CONTROL, 0)) + engage_targets.size()
			var frame_trigger_count: int = 0
			for unit_id_variant in engage_targets.keys():
				var unit_id: String = str(unit_id_variant)
				if not _markers_by_unit_id.has(unit_id):
					continue
				var marker: Node2D = _markers_by_unit_id[unit_id] as Node2D
				if marker != null:
					var target_meta: Dictionary = engage_targets[unit_id] as Dictionary
					var target_intensity: float = float(target_meta.get("intensity", 0.65))
					var target_kind: String = str(target_meta.get("kind", "tile_control")).strip_edges()
					var replay_direction: Vector2 = _resolve_replay_engage_direction(
						unit_id,
						target_meta,
						next_units_by_id,
					)
					marker.call("play_engage", target_intensity, replay_direction, target_kind)
					frame_trigger_count += 1
					_replay_engage_trigger_count += 1
			_update_replay_engage_metrics_snapshot(frame_id, frame_trigger_count)

func _build_replay_frame_id(request_id: String, frame: Dictionary) -> String:
	var tick: int = int(frame.get("tick", -1))
	var world_version: int = int(frame.get("worldVersion", -1))
	var label: String = str(frame.get("label", ""))
	if tick < 0 or world_version < 0:
		return ""
	return "%s:%d:%d:%s" % [request_id, tick, world_version, label]

func _frame_has_engage_highlight(frame: Dictionary) -> bool:
	var raw_highlights: Variant = frame.get("highlights", [])
	if not (raw_highlights is Array):
		return false

	for highlight_variant in raw_highlights:
		if not (highlight_variant is Dictionary):
			continue
		var highlight: Dictionary = highlight_variant as Dictionary
		var kind: String = str(highlight.get("kind", "")).strip_edges()
		if kind == "battle" or kind == "tile_control" or kind == "logistics":
			return true
		if _is_replay_engage_unknown_with_anchor(kind, highlight):
			return true
	return false

func _is_known_non_engage_kind(kind: String) -> bool:
	return kind in KNOWN_NON_ENGAGE_HIGHLIGHT_KINDS

func _is_replay_engage_unknown_with_anchor(kind: String, highlight: Dictionary) -> bool:
	if kind == "" or _is_known_non_engage_kind(kind):
		return false
	return _highlight_has_engage_anchor(highlight)

func _highlight_has_engage_anchor(highlight: Dictionary) -> bool:
	return (
		str(highlight.get("unitId", "")).strip_edges() != ""
		or str(highlight.get("tileId", "")).strip_edges() != ""
		or str(highlight.get("fromTileId", "")).strip_edges() != ""
		or str(highlight.get("toTileId", "")).strip_edges() != ""
	)

func _normalize_replay_engage_kind(raw_kind: String, highlight: Dictionary) -> String:
	var kind: String = raw_kind.strip_edges()
	if kind == ENGAGE_KIND_BATTLE or kind == ENGAGE_KIND_TILE_CONTROL or kind == ENGAGE_KIND_LOGISTICS:
		return kind
	if kind == "" or _is_known_non_engage_kind(kind):
		return ""
	if not _highlight_has_engage_anchor(highlight):
		return ""
	_replay_engage_unknown_kind_count += 1
	if _replay_engage_unknown_kind_samples.size() < 8 and not _replay_engage_unknown_kind_samples.has(kind):
		_replay_engage_unknown_kind_samples.append(kind)
	return ENGAGE_KIND_FALLBACK

func _register_replay_engage_kind(kind: String) -> void:
	if kind == "":
		return
	_replay_engage_kind_counts[kind] = int(_replay_engage_kind_counts.get(kind, 0)) + 1

func _collect_engage_targets_from_frame(frame: Dictionary) -> Dictionary:
	var targets: Dictionary = {}
	var raw_order_states: Variant = frame.get("orderStates", [])
	if not (raw_order_states is Array):
		return targets

	for order_state_variant in raw_order_states:
		if not (order_state_variant is Dictionary):
			continue
		var order_state: Dictionary = order_state_variant as Dictionary
		var status: String = str(order_state.get("status", ""))
		if status != "running" and status != "completed" and status != "failed":
			continue

		var unit_id: String = str(order_state.get("unitId", "")).strip_edges()
		if unit_id == "" or targets.has(unit_id):
			continue
		targets[unit_id] = {
			"intensity": _resolve_engage_intensity_for_kind("tile_control"),
			"kind": "tile_control",
			"fromTileId": "",
			"toTileId": str(order_state.get("target", "")).strip_edges(),
		}
		if targets.size() >= 4:
			break

	return targets

func _collect_engage_targets_from_highlights(frame: Dictionary, units_by_tile: Dictionary) -> Dictionary:
	var targets: Dictionary = {}
	var raw_highlights: Variant = frame.get("highlights", [])
	if not (raw_highlights is Array):
		return targets

	for highlight_variant in raw_highlights:
		if not (highlight_variant is Dictionary):
			continue
		var highlight: Dictionary = highlight_variant as Dictionary
		var kind: String = _normalize_replay_engage_kind(str(highlight.get("kind", "")).strip_edges(), highlight)
		if kind == "":
			continue
		_register_replay_engage_kind(kind)
		var intensity: float = _resolve_engage_intensity_for_kind(kind)
		if intensity <= 0.0:
			continue

		var from_tile_id: String = str(highlight.get("fromTileId", "")).strip_edges()
		var to_tile_id: String = str(highlight.get("toTileId", "")).strip_edges()
		var tile_id: String = str(highlight.get("tileId", "")).strip_edges()
		if to_tile_id == "" and tile_id != "":
			to_tile_id = tile_id

		var unit_id: String = str(highlight.get("unitId", "")).strip_edges()
		if unit_id != "":
			_upsert_engage_target(targets, unit_id, intensity, kind, from_tile_id, to_tile_id)
			continue

		var anchor_tile_id: String = tile_id if tile_id != "" else to_tile_id
		if anchor_tile_id == "" or not units_by_tile.has(anchor_tile_id):
			continue
		var units_on_tile: Array = units_by_tile[anchor_tile_id] as Array
		for tile_unit_id_variant in units_on_tile:
			var tile_unit_id: String = str(tile_unit_id_variant)
			if tile_unit_id == "":
				continue
			_upsert_engage_target(targets, tile_unit_id, intensity, kind, from_tile_id, to_tile_id)
			if targets.size() >= 8:
				return targets

	return targets

func _upsert_engage_target(
	targets: Dictionary,
	unit_id: String,
	intensity: float,
	kind: String,
	from_tile_id: String,
	to_tile_id: String,
) -> void:
	if not targets.has(unit_id):
		targets[unit_id] = {
			"intensity": intensity,
			"kind": kind,
			"fromTileId": from_tile_id,
			"toTileId": to_tile_id,
		}
		return

	var previous: Dictionary = targets[unit_id] as Dictionary
	var previous_intensity: float = float(previous.get("intensity", 0.0))
	if intensity <= previous_intensity:
		return

	targets[unit_id] = {
		"intensity": intensity,
		"kind": kind,
		"fromTileId": from_tile_id,
		"toTileId": to_tile_id,
	}

func _remember_replay_frame_id(frame_id: String) -> void:
	_seen_replay_frame_ids[frame_id] = true
	_seen_replay_frame_order.append(frame_id)
	const MAX_SEEN_REPLAY_FRAME_IDS: int = 512
	while _seen_replay_frame_order.size() > MAX_SEEN_REPLAY_FRAME_IDS:
		var stale_id: String = str(_seen_replay_frame_order.pop_front())
		_seen_replay_frame_ids.erase(stale_id)

func _update_replay_engage_metrics_snapshot(frame_id: String, frame_trigger_count: int) -> void:
	_replay_engage_last_frame_summary = {
		"frameId": frame_id,
		"frameTriggerCount": frame_trigger_count,
		"totalTriggerCount": _replay_engage_trigger_count,
		"kindCounts": _replay_engage_kind_counts.duplicate(true),
		"unknownKindCount": _replay_engage_unknown_kind_count,
		"unknownKindSamples": _replay_engage_unknown_kind_samples.duplicate(),
		"directionDirectHits": _replay_engage_direction_direct_hits,
		"directionFallbackHits": _replay_engage_direction_fallback_hits,
	}
	set_meta("replay_engage_metrics", _replay_engage_last_frame_summary)

func _index_unit_ids_by_tile(next_units_by_id: Dictionary) -> Dictionary:
	var indexed: Dictionary = {}
	for unit_id_variant in next_units_by_id.keys():
		var unit_id: String = str(unit_id_variant)
		var unit: Dictionary = next_units_by_id[unit_id] as Dictionary
		var tile_id: String = str(unit.get("tileId", "")).strip_edges()
		if tile_id == "":
			continue
		if not indexed.has(tile_id):
			indexed[tile_id] = []
		var units_on_tile: Array = indexed[tile_id] as Array
		if not units_on_tile.has(unit_id):
			units_on_tile.append(unit_id)
	return indexed

func _resolve_engage_intensity_for_kind(kind: String) -> float:
	match kind:
		"battle":
			return 1.20
		"tile_control":
			return 0.82
		"logistics":
			return 0.55
		_:
			return 0.0

func _resolve_unit_direction_vector(previous_unit: Dictionary, next_unit: Dictionary) -> Vector2:
	var from_tile_id: String = str(previous_unit.get("tileId", "")).strip_edges()
	var to_tile_id: String = str(next_unit.get("tileId", "")).strip_edges()
	return _resolve_tile_direction_vector(from_tile_id, to_tile_id)

func _resolve_replay_engage_direction(unit_id: String, target_meta: Dictionary, next_units_by_id: Dictionary) -> Vector2:
	var from_tile_id: String = str(target_meta.get("fromTileId", "")).strip_edges()
	var to_tile_id: String = str(target_meta.get("toTileId", "")).strip_edges()
	var replay_vector: Vector2 = _resolve_tile_direction_vector(from_tile_id, to_tile_id)
	if replay_vector != Vector2.ZERO:
		_replay_engage_direction_direct_hits += 1
		return replay_vector

	_replay_engage_direction_fallback_hits += 1
	if _prev_units_by_id.has(unit_id) and next_units_by_id.has(unit_id):
		var previous_unit: Dictionary = _prev_units_by_id[unit_id] as Dictionary
		var next_unit: Dictionary = next_units_by_id[unit_id] as Dictionary
		var delta_vector: Vector2 = _resolve_unit_direction_vector(previous_unit, next_unit)
		if delta_vector != Vector2.ZERO:
			return delta_vector

	if to_tile_id != "" and next_units_by_id.has(unit_id):
		var unit: Dictionary = next_units_by_id[unit_id] as Dictionary
		var current_tile_id: String = str(unit.get("tileId", "")).strip_edges()
		var toward_target: Vector2 = _resolve_tile_direction_vector(current_tile_id, to_tile_id)
		if toward_target != Vector2.ZERO:
			return toward_target

	return Vector2.ZERO

func _resolve_tile_direction_vector(from_tile_id: String, to_tile_id: String) -> Vector2:
	if from_tile_id == "" or to_tile_id == "" or from_tile_id == to_tile_id:
		return Vector2.ZERO
	if not _has_tile_marker_position(from_tile_id) or not _has_tile_marker_position(to_tile_id):
		return Vector2.ZERO

	var from_coord: Vector2i = _resolve_tile_coord(from_tile_id)
	var to_coord: Vector2i = _resolve_tile_coord(to_tile_id)
	var delta: Vector2 = Vector2(float(to_coord.x - from_coord.x), float(to_coord.y - from_coord.y))
	if delta.length() <= 0.001:
		return Vector2.ZERO
	return delta.normalized()
