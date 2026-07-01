extends RefCounted
class_name PortraitAssetRegistry

const REGISTRY_ID := "portrait_asset_registry_v1"
const HERO_RUNTIME_LOOKUP_PATH := "res://assets/formal_pack/formal_pack_asset_runtime_lookup.preview.json"
const HERO_CARD_MANIFEST_PATH := "res://assets/formal_pack/portraits/card/postprocessed/formal_pack_card_portraits_postprocessed_handoff.preview.json"
const NPC_GUARD_MANIFEST_PATH := "res://assets/npc_guards/npc_guard_portrait_manifest_v2.godot.json"

const HERO_ID_TO_PORTRAIT_ASSET_KEY := {
	"100013": "formal_pack.portrait.ma_chao_mature_xiliang_retreat_v1",
	"100016": "formal_pack.portrait.liu_bei_mature_hanzhong_sworddance_face_smile_v2",
	"100017": "formal_pack.portrait.zhuge_liang_mature_beifa_v1",
	"100021": "formal_pack.portrait.zhao_yun_youth_changban_rescue_v1",
	"100023": "formal_pack.portrait.cao_cao_fate_v1",
	"100027": "formal_pack.portrait.zhang_liao_mature_hefei_v1",
	"100031": "formal_pack.portrait.zhou_yu_mature_chibi_v1",
	"100090": "formal_pack.portrait.tai_shi_ci_mature_yishi_v1",
	"100451": "formal_pack.portrait.guan_yu_mature_mounted_jingzhou_v1",
	"100661": "formal_pack.portrait.lu_bu_mature_wenhou_v1",
	"100701": "formal_pack.portrait.cao_pi_mature_shanrang_v1",
	"100702": "formal_pack.portrait.dian_wei_mature_huzhu_v1",
	"100703": "formal_pack.portrait.dong_zhuo_early_xiliang_campaign_v1",
	"100704": "formal_pack.portrait.gan_ning_mature_jinfan_raid_v1",
	"100705": "formal_pack.portrait.guo_jia_mature_fate_liaodong_v1",
	"100706": "formal_pack.portrait.han_xiandi_disempowered_v1",
	"100707": "formal_pack.portrait.jia_xu_mature_duoshi_v1",
	"100708": "formal_pack.portrait.ma_chao_mature_xiliang_retreat_v1",
	"100709": "formal_pack.portrait.sima_yi_fate_gaopingling_v1",
	"100710": "formal_pack.portrait.sun_ce_young_founder_v1",
	"100711": "formal_pack.portrait.sun_quan_mature_successor_v1",
	"100712": "formal_pack.portrait.sun_quan_succession_entrustment_v1",
	"100713": "formal_pack.portrait.xiahou_dun_mature_duyan_v1",
	"100714": "formal_pack.portrait.xun_yu_youth_wangzuo_v1",
	"100715": "formal_pack.portrait.yuan_shao_mature_coalition_oath_v1",
	"100716": "formal_pack.portrait.zhang_fei_mature_baxi_v1",
	"100717": "formal_pack.portrait.zhou_tai_mature_victory_shout_v1",
	"100718": "formal_pack.portrait.cai_wenji_fate_frontier_qin_v1",
}

static var _hero_manifest_loaded := false
static var _npc_manifest_loaded := false
static var _hero_paths: Dictionary = {}
static var _npc_portrait_paths: Dictionary = {}
static var _npc_asset_paths: Dictionary = {}
static var _texture_cache: Dictionary = {}
static var _warned: Dictionary = {}
static var _fallback_texture: Texture2D = null


static func portrait_texture(slot_payload: Dictionary) -> Texture2D:
	var resolved_path := portrait_res_path(slot_payload)
	if resolved_path == "":
		if _has_portrait_identity(slot_payload):
			return _commercial_fallback_texture()
		return null
	if _texture_cache.has(resolved_path):
		return _texture_cache[resolved_path] as Texture2D
	if not _res_file_exists(resolved_path):
		_warn_once("missing_%s" % resolved_path, "PortraitAssetRegistry asset missing: %s" % resolved_path)
		return null
	var texture: Texture2D = null
	if ResourceLoader.exists(resolved_path):
		var loaded_resource: Resource = load(resolved_path)
		if loaded_resource is Texture2D:
			texture = loaded_resource as Texture2D
	if texture == null:
		var image := Image.new()
		var image_path := resolved_path
		if image_path.begins_with("res://"):
			image_path = ProjectSettings.globalize_path(image_path)
		var error := image.load(image_path)
		if error != OK:
			_warn_once("load_failed_%s" % resolved_path, "PortraitAssetRegistry asset failed to load: %s error=%s" % [resolved_path, str(error)])
			return _commercial_fallback_texture() if _has_portrait_identity(slot_payload) else null
		texture = ImageTexture.create_from_image(image)
	_texture_cache[resolved_path] = texture
	return texture


static func portrait_res_path(slot_payload: Dictionary) -> String:
	var portrait_asset_key := _resolve_portrait_asset_key(slot_payload)
	var asset_kind := str(slot_payload.get("assetKind", slot_payload.get("asset_kind", ""))).strip_edges()
	if _allows_direct_res_path(slot_payload):
		return _resolve_direct_res_path(slot_payload)
	if portrait_asset_key.begins_with("npc_guard.") or asset_kind == "npc_guard":
		_ensure_npc_manifest_loaded()
		var npc_path := str(_npc_portrait_paths.get(portrait_asset_key, "")).strip_edges()
		if npc_path != "":
			return npc_path
		var asset_key := str(slot_payload.get("assetKey", slot_payload.get("asset_key", ""))).strip_edges()
		return str(_npc_asset_paths.get(asset_key, "")).strip_edges()
	_ensure_hero_manifest_loaded()
	var hero_path := str(_hero_paths.get(portrait_asset_key, "")).strip_edges()
	if hero_path != "":
		return hero_path
	return ""


static func portrait_asset_source(slot_payload: Dictionary) -> String:
	if portrait_res_path(slot_payload) != "":
		return "locked_preview_or_display_preview"
	return ""


static func _resolve_portrait_asset_key(slot_payload: Dictionary) -> String:
	var direct_key := str(slot_payload.get("portraitAssetKey", slot_payload.get("portrait_asset_key", ""))).strip_edges()
	if direct_key != "":
		return direct_key
	var hero_id := _extract_numeric_hero_id(str(slot_payload.get("heroId", slot_payload.get("hero_id", ""))))
	if hero_id != "" and HERO_ID_TO_PORTRAIT_ASSET_KEY.has(hero_id):
		return str(HERO_ID_TO_PORTRAIT_ASSET_KEY[hero_id])
	var portrait_key := _extract_numeric_hero_id(str(slot_payload.get("portraitKey", slot_payload.get("portrait_key", ""))))
	if portrait_key != "" and HERO_ID_TO_PORTRAIT_ASSET_KEY.has(portrait_key):
		return str(HERO_ID_TO_PORTRAIT_ASSET_KEY[portrait_key])
	var avatar_key := _extract_numeric_hero_id(str(slot_payload.get("avatarKey", slot_payload.get("avatar_key", ""))))
	if avatar_key != "" and HERO_ID_TO_PORTRAIT_ASSET_KEY.has(avatar_key):
		return str(HERO_ID_TO_PORTRAIT_ASSET_KEY[avatar_key])
	return ""


static func _has_portrait_identity(slot_payload: Dictionary) -> bool:
	for key in [
		"portraitAssetKey",
		"portrait_asset_key",
		"heroId",
		"hero_id",
		"portraitKey",
		"portrait_key",
		"avatarKey",
		"avatar_key",
		"generalName",
		"general_name",
		"name",
	]:
		if str(slot_payload.get(key, "")).strip_edges() != "":
			return true
	return false


static func _commercial_fallback_texture() -> Texture2D:
	if _fallback_texture != null:
		return _fallback_texture
	var width: int = 192
	var height: int = 240
	var image: Image = Image.create(width, height, false, Image.FORMAT_RGBA8)
	for y in range(height):
		var t: float = float(y) / float(max(height - 1, 1))
		for x in range(width):
			var vignette_x: float = abs(float(x) / float(max(width - 1, 1)) - 0.5) * 2.0
			var vignette: float = clampf(1.0 - vignette_x * 0.22 - t * 0.16, 0.0, 1.0)
			var base: Color = Color(0.105 + 0.070 * (1.0 - t), 0.077 + 0.045 * (1.0 - t), 0.045 + 0.025 * (1.0 - t), 1.0)
			var gold_wash: Color = Color(0.30, 0.21, 0.095, 1.0)
			image.set_pixel(x, y, base.lerp(gold_wash, 0.18 * vignette))

	var border: Color = Color(0.78, 0.56, 0.24, 0.92)
	var inner: Color = Color(0.19, 0.13, 0.070, 0.96)
	for x in range(width):
		for y in [0, 1, 2, height - 3, height - 2, height - 1]:
			image.set_pixel(x, y, border)
	for y in range(height):
		for x in [0, 1, 2, width - 3, width - 2, width - 1]:
			image.set_pixel(x, y, border)
	for x in range(9, width - 9):
		image.set_pixel(x, 10, inner)
		image.set_pixel(x, height - 11, inner)
	for y in range(9, height - 9):
		image.set_pixel(10, y, inner)
		image.set_pixel(width - 11, y, inner)

	var center_x: int = width / 2
	var head_y: int = 80
	var head_r: int = 30
	var body_y: int = 158
	var body_rx: int = 58
	var body_ry: int = 68
	var silhouette: Color = Color(0.035, 0.032, 0.028, 0.90)
	var highlight: Color = Color(0.86, 0.62, 0.26, 0.18)
	for y in range(height):
		for x in range(width):
			var dx_head: float = float(x - center_x) / float(head_r)
			var dy_head: float = float(y - head_y) / float(head_r)
			var dx_body: float = float(x - center_x) / float(body_rx)
			var dy_body: float = float(y - body_y) / float(body_ry)
			var in_head: bool = dx_head * dx_head + dy_head * dy_head <= 1.0
			var in_body: bool = dx_body * dx_body + dy_body * dy_body <= 1.0 and y >= head_y + 20
			if in_head or in_body:
				image.set_pixel(x, y, image.get_pixel(x, y).lerp(silhouette, 0.82))
			elif abs(x - center_x) < 2 and y > 42 and y < height - 28:
				image.set_pixel(x, y, image.get_pixel(x, y).lerp(highlight, 0.65))

	_fallback_texture = ImageTexture.create_from_image(image)
	return _fallback_texture


static func _extract_numeric_hero_id(raw_value: String) -> String:
	var digits := ""
	for index in range(raw_value.length()):
		var character := raw_value.substr(index, 1)
		if character.is_valid_int():
			digits += character
	if digits == "":
		return raw_value.strip_edges()
	return digits


static func _allows_direct_res_path(slot_payload: Dictionary) -> bool:
	var asset_kind := str(slot_payload.get("assetKind", slot_payload.get("asset_kind", ""))).strip_edges()
	return asset_kind == "ai_chat_portrait"


static func _resolve_direct_res_path(slot_payload: Dictionary) -> String:
	var candidate_values := [
		str(slot_payload.get("path", "")),
		str(slot_payload.get("resPath", slot_payload.get("res_path", ""))),
		str(slot_payload.get("portraitPath", slot_payload.get("portrait_path", ""))),
	]
	for raw_value in candidate_values:
		var candidate_path: String = str(raw_value).strip_edges()
		if _res_file_exists(candidate_path):
			return candidate_path
	return ""


static func _res_file_exists(candidate_path: String) -> bool:
	return candidate_path != "" and (FileAccess.file_exists(candidate_path) or ResourceLoader.exists(candidate_path))


static func _ensure_hero_manifest_loaded() -> void:
	if _hero_manifest_loaded:
		return
	_hero_manifest_loaded = true
	_load_runtime_lookup_paths(HERO_RUNTIME_LOOKUP_PATH, _hero_paths, {}, "hero")
	if _hero_paths.is_empty():
		_load_manifest_paths(HERO_CARD_MANIFEST_PATH, "portraitAssetKey", ["resPath", "projectPath"], _hero_paths, {}, "hero")


static func _ensure_npc_manifest_loaded() -> void:
	if _npc_manifest_loaded:
		return
	_npc_manifest_loaded = true
	_load_manifest_paths(NPC_GUARD_MANIFEST_PATH, "portraitAssetKey", ["resPath"], _npc_portrait_paths, _npc_asset_paths, "npc_guard")


static func _load_manifest_paths(
	manifest_path: String,
	key_field: String,
	path_fields: Array,
	portrait_target: Dictionary,
	asset_target: Dictionary,
	label: String
) -> void:
	portrait_target.clear()
	asset_target.clear()
	if not FileAccess.file_exists(manifest_path):
		_warn_once("%s_manifest_missing" % label, "PortraitAssetRegistry %s manifest missing: %s" % [label, manifest_path])
		return
	var file := FileAccess.open(manifest_path, FileAccess.READ)
	if file == null:
		_warn_once("%s_manifest_open_failed" % label, "PortraitAssetRegistry %s manifest failed to open: %s" % [label, manifest_path])
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not (parsed is Dictionary):
		_warn_once("%s_manifest_not_dictionary" % label, "PortraitAssetRegistry %s manifest is not a dictionary: %s" % [label, manifest_path])
		return
	var items: Variant = (parsed as Dictionary).get("items", [])
	if not (items is Array):
		_warn_once("%s_manifest_items_not_array" % label, "PortraitAssetRegistry %s manifest items is not an array: %s" % [label, manifest_path])
		return
	for item_variant in items:
		if not (item_variant is Dictionary):
			continue
		var item := item_variant as Dictionary
		var portrait_key := str(item.get(key_field, "")).strip_edges()
		var res_path := _first_manifest_path(item, path_fields)
		if portrait_key == "" or res_path == "":
			continue
		portrait_target[portrait_key] = res_path
		var asset_key := str(item.get("assetKey", item.get("heroTemplateId", ""))).strip_edges()
		if asset_key != "":
			asset_target[asset_key] = res_path


static func _load_runtime_lookup_paths(
	lookup_path: String,
	portrait_target: Dictionary,
	asset_target: Dictionary,
	label: String
) -> void:
	portrait_target.clear()
	asset_target.clear()
	if not FileAccess.file_exists(lookup_path):
		_warn_once("%s_runtime_lookup_missing" % label, "PortraitAssetRegistry %s runtime lookup missing: %s" % [label, lookup_path])
		return
	var file := FileAccess.open(lookup_path, FileAccess.READ)
	if file == null:
		_warn_once("%s_runtime_lookup_open_failed" % label, "PortraitAssetRegistry %s runtime lookup failed to open: %s" % [label, lookup_path])
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not (parsed is Dictionary):
		_warn_once("%s_runtime_lookup_not_dictionary" % label, "PortraitAssetRegistry %s runtime lookup is not a dictionary: %s" % [label, lookup_path])
		return
	var portraits: Variant = (parsed as Dictionary).get("portraitByAssetKey", {})
	if not (portraits is Dictionary):
		_warn_once("%s_runtime_lookup_portraits_not_dictionary" % label, "PortraitAssetRegistry %s portraitByAssetKey is not a dictionary: %s" % [label, lookup_path])
		return
	for key_variant in (portraits as Dictionary).keys():
		var portrait_key := str(key_variant).strip_edges()
		var item_variant: Variant = (portraits as Dictionary).get(key_variant, {})
		if portrait_key == "" or not (item_variant is Dictionary):
			continue
		var item := item_variant as Dictionary
		var res_path := _first_manifest_path(item, ["resPath", "projectPath"])
		if res_path == "":
			continue
		portrait_target[portrait_key] = res_path
		var asset_key := portrait_key.replace("formal_pack.portrait.", "")
		if asset_key != "":
			asset_target[asset_key] = res_path


static func _first_manifest_path(item: Dictionary, path_fields: Array) -> String:
	for field_variant in path_fields:
		var raw_path := str(item.get(str(field_variant), "")).strip_edges()
		if raw_path != "":
			return _to_res_path(raw_path)
	return ""


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
