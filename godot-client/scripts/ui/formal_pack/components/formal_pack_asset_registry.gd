extends RefCounted
class_name FormalPackAssetRegistry

const CommonPortraitRegistryScript := preload("res://scripts/ui/portrait_asset_registry.gd")
const COVER_MANIFEST_PATH := "res://assets/formal_pack/recruit_pack_cover_manifest.preview.json"

static var _cover_manifest_loaded := false
static var _cover_asset_paths: Dictionary = {}
static var _texture_cache: Dictionary = {}
static var _warned: Dictionary = {}

static func cover_texture(asset_key: String) -> Texture2D:
	_ensure_cover_manifest_loaded()
	return _texture_for_asset("cover", asset_key, _cover_asset_paths)

static func portrait_texture_from_ref(asset_ref: Variant) -> Texture2D:
	var payload := _portrait_payload(asset_ref)
	var preview_texture: Texture2D = CommonPortraitRegistryScript.portrait_texture(payload)
	if preview_texture != null:
		return preview_texture
	return null

static func portrait_resolution_source(asset_ref: Variant) -> String:
	var payload := _portrait_payload(asset_ref)
	if CommonPortraitRegistryScript.portrait_res_path(payload) != "":
		return CommonPortraitRegistryScript.REGISTRY_ID
	return ""

static func _ensure_cover_manifest_loaded() -> void:
	if _cover_manifest_loaded:
		return
	_cover_manifest_loaded = true
	_load_manifest_items(
		COVER_MANIFEST_PATH,
		"coverAssetKey",
		["godotResourcePath", "resPath", "coverPath", "postprocessedCoverPath"],
		_cover_asset_paths,
		"cover"
	)

static func _load_manifest_items(manifest_path: String, key_field: String, path_fields: Array, target: Dictionary, label: String) -> void:
	target.clear()
	if not FileAccess.file_exists(manifest_path):
		_warn_once("%s_manifest_missing" % label, "FormalPackAssetRegistry %s manifest missing: %s" % [label, manifest_path])
		return
	var file := FileAccess.open(manifest_path, FileAccess.READ)
	if file == null:
		_warn_once("%s_manifest_open_failed" % label, "FormalPackAssetRegistry %s manifest failed to open: %s" % [label, manifest_path])
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not (parsed is Dictionary):
		_warn_once("%s_manifest_not_dictionary" % label, "FormalPackAssetRegistry %s manifest is not a dictionary: %s" % [label, manifest_path])
		return
	var items: Variant = (parsed as Dictionary).get("items", [])
	if not (items is Array):
		_warn_once("%s_manifest_items_not_array" % label, "FormalPackAssetRegistry %s manifest items is not an array: %s" % [label, manifest_path])
		return
	for item_variant in items:
		if not (item_variant is Dictionary):
			continue
		var item := item_variant as Dictionary
		var asset_key := str(item.get(key_field, "")).strip_edges()
		var res_path := _first_manifest_path(item, path_fields)
		if asset_key == "" or res_path == "":
			continue
		target[asset_key] = res_path

static func _first_manifest_path(item: Dictionary, path_fields: Array) -> String:
	for field_variant in path_fields:
		var field := str(field_variant)
		var raw_path := str(item.get(field, "")).strip_edges()
		if raw_path == "":
			continue
		return _to_res_path(raw_path)
	return ""

static func _portrait_payload(asset_ref: Variant) -> Dictionary:
	if asset_ref is Dictionary and not (asset_ref as Dictionary).is_empty():
		var payload := (asset_ref as Dictionary).duplicate(true)
		var asset_key := _asset_key_from_payload(payload)
		if asset_key != "":
			payload["portraitAssetKey"] = asset_key
		return payload
	return {}

static func _asset_key_from_payload(payload: Dictionary) -> String:
	for field_variant in ["portraitAssetKey", "portrait_asset_key", "assetKey", "asset_key"]:
		var field := str(field_variant)
		var raw_key := str(payload.get(field, "")).strip_edges()
		if raw_key != "":
			return raw_key
	return ""

static func _texture_for_asset(label: String, asset_key: String, path_map: Dictionary) -> Texture2D:
	var normalized_key := asset_key.strip_edges()
	if normalized_key == "":
		return null
	var path := str(path_map.get(normalized_key, "")).strip_edges()
	if path == "":
		return null
	var cache_key := "%s:%s" % [label, path]
	if _texture_cache.has(cache_key):
		return _texture_cache[cache_key]
	if not FileAccess.file_exists(path):
		_warn_once("%s_missing_%s" % [label, normalized_key], "FormalPackAssetRegistry %s asset missing for %s: %s" % [label, normalized_key, path])
		return null
	var image := Image.new()
	var error := image.load(path)
	if error != OK:
		_warn_once("%s_load_failed_%s" % [label, normalized_key], "FormalPackAssetRegistry %s asset failed to load for %s: %s error=%s" % [label, normalized_key, path, str(error)])
		return null
	var texture: Texture2D = ImageTexture.create_from_image(image)
	_texture_cache[cache_key] = texture
	return texture

static func _to_res_path(raw_path: String) -> String:
	var path := raw_path.strip_edges().replace("\\", "/")
	if path.begins_with("res://"):
		return path
	var marker := "godot-client/"
	var marker_index := path.find(marker)
	if marker_index >= 0:
		return "res://" + path.substr(marker_index + marker.length())
	return path

static func _warn_once(key: String, message: String) -> void:
	if _warned.has(key):
		return
	_warned[key] = true
	push_warning(message)
