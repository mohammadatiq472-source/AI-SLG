extends Node

const DEFAULT_BASE_URL := "http://127.0.0.1:8787"
const DEFAULT_CLIENT_PROFILE_PATH := "res://profiles/active.client-profile.json"
const DEFAULT_PLAYER_NAME := "godot_mvp"
const DEFAULT_PROFILE_ID := "local-dev"
const DEFAULT_PROFILE_LABEL := "Local Development"
const DEFAULT_ASSET_MANIFEST_URL := ""
const DEFAULT_MINIMUM_SERVER_BUILD := ""
const DEFAULT_CLIENT_BUILD_CHANNEL := "dev"
const DEFAULT_MAP_LAYOUT_SCOPE := "viewport"
const DEFAULT_MAP_WORLD_ID := "unified_aoi_v0_6_formal_real_map_data_1km"
const DEFAULT_MAP_COORDINATE_SPACE := "real_map_data_1km.cell_1km"
const DEFAULT_MAP_INCLUDE_LAYERS := "base_map,main_world_cells,derived_masks,maritime_passability,resource_overlay,city_gate_anchors,main_world_mountain_boundaries,main_world_chokepoints,cell_overrides,labels"
const DEFAULT_MAP_VISIBLE_CELLS := "512x320"
const DEFAULT_MAP_PRELOAD_MARGIN := "64"
const DEFAULT_MAP_CHUNK_SIZE := "64"

var backend_base_url: String = DEFAULT_BASE_URL
var player_name: String = DEFAULT_PLAYER_NAME
var preferred_faction_id: String = ""
var client_profile_id: String = DEFAULT_PROFILE_ID
var client_profile_label: String = DEFAULT_PROFILE_LABEL
var client_profile_path: String = DEFAULT_CLIENT_PROFILE_PATH
var client_profile_load_status: String = "not_loaded"
var client_profile_error: String = ""
var asset_manifest_url: String = DEFAULT_ASSET_MANIFEST_URL
var minimum_server_build: String = DEFAULT_MINIMUM_SERVER_BUILD
var client_build_channel: String = DEFAULT_CLIENT_BUILD_CHANNEL
var client_capabilities: Dictionary = {}
var client_cache_policy: Dictionary = {"readModels": "read_through_presentation_cache", "offlineAuthority": false}
var client_timeouts_ms: Dictionary = {"read": 10000, "write": 15000}
var map_layout_scope: String = DEFAULT_MAP_LAYOUT_SCOPE
var map_layout_province_id: String = ""
var map_layout_region_id: String = ""
var map_layout_center_x: String = ""
var map_layout_center_y: String = ""
var map_layout_layer: String = ""
var map_layout_visible_cells: String = ""
var map_layout_preload_margin: String = ""
var map_layout_chunk_size: String = ""

func _ready() -> void:
	_apply_client_endpoint_profile(_read_client_endpoint_profile(DEFAULT_CLIENT_PROFILE_PATH))
	backend_base_url = _read_env("SLG_BACKEND_URL", backend_base_url if backend_base_url != "" else DEFAULT_BASE_URL).rstrip("/")
	player_name = _read_env("SLG_PLAYER_NAME", DEFAULT_PLAYER_NAME)
	preferred_faction_id = _read_env("SLG_FACTION_ID", "")
	map_layout_scope = _read_env("SLG_MAP_SCOPE", DEFAULT_MAP_LAYOUT_SCOPE)
	map_layout_province_id = _read_env("SLG_MAP_PROVINCE_ID", "")
	map_layout_region_id = _read_env("SLG_MAP_REGION_ID", "")
	map_layout_center_x = _read_env("SLG_MAP_CENTER_X", "")
	map_layout_center_y = _read_env("SLG_MAP_CENTER_Y", "")
	map_layout_layer = _read_env("SLG_MAP_LAYER", "")
	map_layout_visible_cells = _read_env("SLG_MAP_VISIBLE_CELLS", "")
	map_layout_preload_margin = _read_env("SLG_MAP_PRELOAD_MARGIN", "")
	map_layout_chunk_size = _read_env("SLG_MAP_CHUNK_SIZE", "")

func _read_env(key: String, fallback: String) -> String:
	var value := OS.get_environment(key).strip_edges()
	if value == "":
		return fallback
	return value

func _read_client_endpoint_profile(path: String) -> Dictionary:
	client_profile_path = path
	client_profile_load_status = "missing"
	client_profile_error = ""
	if not FileAccess.file_exists(path):
		return {}
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		client_profile_load_status = "error"
		client_profile_error = "open_failed"
		return {}
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not (parsed is Dictionary):
		client_profile_load_status = "error"
		client_profile_error = "invalid_profile_json"
		return {}
	client_profile_load_status = "loaded"
	return (parsed as Dictionary).duplicate(true)

func _apply_client_endpoint_profile(profile: Dictionary) -> void:
	if profile.is_empty():
		return
	client_profile_id = _profile_string(profile, "profileId", client_profile_id)
	client_profile_label = _profile_string(profile, "profileLabel", client_profile_label)
	backend_base_url = _profile_string(profile, "apiBaseUrl", backend_base_url).rstrip("/")
	asset_manifest_url = _profile_string(profile, "assetManifestUrl", asset_manifest_url)
	minimum_server_build = _profile_string(profile, "minimumServerBuild", minimum_server_build)
	client_build_channel = _profile_string(profile, "clientBuildChannel", client_build_channel)
	client_capabilities = _profile_dictionary(profile, "capabilities", client_capabilities)
	client_cache_policy = _profile_dictionary(profile, "cachePolicy", client_cache_policy)
	client_timeouts_ms = _profile_dictionary(profile, "timeoutsMs", client_timeouts_ms)

func _profile_string(profile: Dictionary, key: String, fallback: String) -> String:
	var value: Variant = profile.get(key, fallback)
	if value is String:
		var normalized := (value as String).strip_edges()
		return normalized if normalized != "" else fallback
	return fallback

func _profile_dictionary(profile: Dictionary, key: String, fallback: Dictionary) -> Dictionary:
	var value: Variant = profile.get(key, {})
	if value is Dictionary:
		return (value as Dictionary).duplicate(true)
	return fallback.duplicate(true)

func get_client_endpoint_profile_summary() -> Dictionary:
	return {
		"profileId": client_profile_id,
		"profileLabel": client_profile_label,
		"apiBaseUrl": backend_base_url,
		"assetManifestUrl": asset_manifest_url,
		"minimumServerBuild": minimum_server_build,
		"clientBuildChannel": client_build_channel,
		"capabilities": client_capabilities.duplicate(true),
		"cachePolicy": client_cache_policy.duplicate(true),
		"timeoutsMs": client_timeouts_ms.duplicate(true),
		"profilePath": client_profile_path,
		"profileLoadStatus": client_profile_load_status,
		"profileError": client_profile_error,
	}

func get_map_layout_query_params() -> Dictionary:
	var params := {}
	if map_layout_province_id != "":
		params["provinceId"] = map_layout_province_id
	if map_layout_region_id != "":
		params["regionId"] = map_layout_region_id
	if map_layout_center_x != "":
		params["centerX"] = map_layout_center_x
	if map_layout_center_y != "":
		params["centerY"] = map_layout_center_y
	if map_layout_layer != "":
		params["layer"] = map_layout_layer
	elif map_layout_scope == "viewport":
		params["layer"] = "layered"
	if map_layout_visible_cells != "":
		params["visibleCells"] = map_layout_visible_cells
		params["visibleSizeCells"] = map_layout_visible_cells
	elif map_layout_scope == "viewport":
		params["visibleCells"] = DEFAULT_MAP_VISIBLE_CELLS
		params["visibleSizeCells"] = DEFAULT_MAP_VISIBLE_CELLS
	if map_layout_preload_margin != "":
		params["preloadMargin"] = map_layout_preload_margin
		params["preloadMarginCells"] = map_layout_preload_margin
	elif map_layout_scope == "viewport":
		params["preloadMargin"] = DEFAULT_MAP_PRELOAD_MARGIN
		params["preloadMarginCells"] = DEFAULT_MAP_PRELOAD_MARGIN
	if map_layout_chunk_size != "":
		params["chunkSize"] = map_layout_chunk_size
	elif map_layout_scope == "viewport":
		params["chunkSize"] = DEFAULT_MAP_CHUNK_SIZE
	if map_layout_scope == "viewport":
		if not params.has("worldId"):
			params["worldId"] = DEFAULT_MAP_WORLD_ID
		if not params.has("coordinateSpace"):
			params["coordinateSpace"] = DEFAULT_MAP_COORDINATE_SPACE
		if not params.has("includeLayers"):
			params["includeLayers"] = DEFAULT_MAP_INCLUDE_LAYERS
	return params
