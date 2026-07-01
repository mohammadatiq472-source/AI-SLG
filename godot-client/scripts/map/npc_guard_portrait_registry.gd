extends RefCounted
class_name NpcGuardPortraitRegistry

const MANIFEST_PATH := "res://assets/npc_guards/npc_guard_portrait_manifest_v2.godot.json"

static var _manifest_loaded := false
static var _portrait_paths: Dictionary = {}
static var _asset_paths: Dictionary = {}
static var _items_by_portrait_key: Dictionary = {}
static var _texture_cache: Dictionary = {}
static var _warned: Dictionary = {}


static func portrait_texture(portrait_asset_key: String) -> Texture2D:
	_ensure_manifest_loaded()
	return _texture_for_key("portrait", portrait_asset_key, _portrait_paths)


static func asset_texture(asset_key: String) -> Texture2D:
	_ensure_manifest_loaded()
	return _texture_for_key("asset", asset_key, _asset_paths)


static func portrait_res_path(portrait_asset_key: String) -> String:
	_ensure_manifest_loaded()
	return str(_portrait_paths.get(portrait_asset_key.strip_edges(), "")).strip_edges()


static func item_for_portrait(portrait_asset_key: String) -> Dictionary:
	_ensure_manifest_loaded()
	var normalized_key := portrait_asset_key.strip_edges()
	if not _items_by_portrait_key.has(normalized_key):
		return {}
	return (_items_by_portrait_key[normalized_key] as Dictionary).duplicate(true)


static func resolve_unit_portrait_texture(unit_data: Dictionary) -> Texture2D:
	var portrait_asset_key := str(unit_data.get("portraitAssetKey", "")).strip_edges()
	if portrait_asset_key != "":
		return portrait_texture(portrait_asset_key)
	var asset_key := str(unit_data.get("assetKey", "")).strip_edges()
	if asset_key != "":
		return asset_texture(asset_key)
	return null


static func _ensure_manifest_loaded() -> void:
	if _manifest_loaded:
		return
	_manifest_loaded = true
	_portrait_paths.clear()
	_asset_paths.clear()
	_items_by_portrait_key.clear()

	if not FileAccess.file_exists(MANIFEST_PATH):
		_warn_once("manifest_missing", "NpcGuardPortraitRegistry manifest missing: %s" % MANIFEST_PATH)
		return

	var file := FileAccess.open(MANIFEST_PATH, FileAccess.READ)
	if file == null:
		_warn_once("manifest_open_failed", "NpcGuardPortraitRegistry manifest failed to open: %s" % MANIFEST_PATH)
		return

	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not (parsed is Dictionary):
		_warn_once("manifest_not_dictionary", "NpcGuardPortraitRegistry manifest is not a dictionary: %s" % MANIFEST_PATH)
		return

	var items: Variant = (parsed as Dictionary).get("items", [])
	if not (items is Array):
		_warn_once("manifest_items_not_array", "NpcGuardPortraitRegistry manifest items is not an array: %s" % MANIFEST_PATH)
		return

	for item_variant in items:
		if not (item_variant is Dictionary):
			continue
		var item := item_variant as Dictionary
		var portrait_asset_key := str(item.get("portraitAssetKey", "")).strip_edges()
		var asset_key := str(item.get("assetKey", "")).strip_edges()
		var res_path := _to_res_path(str(item.get("resPath", "")).strip_edges())
		if portrait_asset_key == "" or res_path == "":
			continue
		_portrait_paths[portrait_asset_key] = res_path
		_items_by_portrait_key[portrait_asset_key] = item.duplicate(true)
		if asset_key != "":
			_asset_paths[asset_key] = res_path


static func _texture_for_key(label: String, asset_key: String, path_map: Dictionary) -> Texture2D:
	var normalized_key := asset_key.strip_edges()
	if normalized_key == "":
		return null
	var path := str(path_map.get(normalized_key, "")).strip_edges()
	if path == "":
		return null
	if _texture_cache.has(path):
		return _texture_cache[path] as Texture2D
	if not FileAccess.file_exists(path) and not ResourceLoader.exists(path):
		_warn_once("%s_missing_%s" % [label, normalized_key], "NpcGuardPortraitRegistry asset missing for %s: %s" % [normalized_key, path])
		return null
	var texture: Texture2D = null
	if ResourceLoader.exists(path):
		var loaded_resource: Resource = load(path)
		if loaded_resource is Texture2D:
			texture = loaded_resource as Texture2D
	if texture == null:
		var image := Image.new()
		var image_path := path
		if image_path.begins_with("res://"):
			image_path = ProjectSettings.globalize_path(image_path)
		var error := image.load(image_path)
		if error != OK:
			_warn_once("%s_load_failed_%s" % [label, normalized_key], "NpcGuardPortraitRegistry asset failed to load for %s: %s error=%s" % [normalized_key, path, str(error)])
			return null
		texture = ImageTexture.create_from_image(image)
	_texture_cache[path] = texture
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
