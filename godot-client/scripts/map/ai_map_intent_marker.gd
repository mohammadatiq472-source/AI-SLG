extends Node2D
class_name AIMapIntentMarker

const SlgUiComponentFactoryScript = preload("res://scripts/ui/slg_ui_component_factory.gd")
const KIND_INTENT: String = "intent"
const KIND_LIVING_ACTIVITY: String = "living_activity"
const KIND_OCCUPIED: String = "occupied"
const KIND_GATHERED: String = "gathered"
const AI_LIVING_ACTIVITY_MARKER_FAMILY_CONTRACT := "ai_living_activity_marker_family_v1"
const AI_LIVING_ACTIVITY_MARKER_CARRYING_TROOPS_STRIP_CONTRACT := "ai_living_activity_marker_carrying_troops_strip_v1"
const AI_LIVING_ACTIVITY_MARKER_FAMILY_MANIFEST_PATH := "res://assets/themes/slgclient/current/ui/map_markers/ai_living_activity_marker_family_manifest_v1.json"
const AI_LIVING_ACTIVITY_MARKER_VISUAL_ASSET_CONTRACT := "ai_living_activity_marker_visual_asset_v1"
const AI_LIVING_ACTIVITY_MARKER_QUEUE_CLUSTER_CONTRACT := "ai_living_activity_marker_queue_cluster_v1"
const AI_LIVING_ACTIVITY_MAIN_WORLD_MARKER_FRAME_ASSET_PATH := "res://assets/themes/slgclient/current/ui/map_markers/ai_living_activity_main_world_marker_frame_v1.png"
const AI_LIVING_ACTIVITY_MAIN_WORLD_ROUTE_ARROW_ASSET_PATH := "res://assets/themes/slgclient/current/ui/map_markers/ai_living_activity_main_world_route_arrow_v1.png"
const AI_LIVING_ACTIVITY_MAIN_WORLD_CLUSTER_BADGE_ASSET_PATH := "res://assets/themes/slgclient/current/ui/map_markers/ai_living_activity_main_world_cluster_badge_v1.png"

@export var radius: float = 16.0

var _kind: String = KIND_INTENT
var _status: String = "pending"
var _pulse: float = 0.0
var _avatar_image_path: String = ""
var _avatar_texture: Texture2D = null
var _status_dot: String = ""
var _target_line_visible: bool = false
var _target_line_vector: Vector2 = Vector2.ZERO
var _queue_count: int = 1
var _aggregation_dot_count: int = 0
var _marker_frame_texture: Texture2D = null
var _route_arrow_texture: Texture2D = null
var _cluster_badge_texture: Texture2D = null
var _marker_frame_asset_drawn: bool = false
var _route_arrow_asset_drawn: bool = false
var _cluster_badge_asset_drawn: bool = false
var _carrying_troops_slots: Array = []
var _carrying_troops_texture_draw_count: int = 0

func _ready() -> void:
	_load_living_activity_marker_family_textures()
	set_process(true)

func set_visual_state(kind: String, status: String = "pending") -> void:
	_kind = _normalize_kind(kind)
	_status = status.strip_edges()
	queue_redraw()

func set_living_activity_visual_identity(avatar_image_path: String, status_dot: String, target_line_vector: Vector2, target_line_visible: bool) -> void:
	_avatar_image_path = avatar_image_path.strip_edges()
	_status_dot = status_dot.strip_edges()
	_target_line_vector = target_line_vector
	_target_line_visible = target_line_visible and _target_line_vector.length() > 1.0
	_avatar_texture = _load_living_activity_avatar_texture(_avatar_image_path)
	queue_redraw()

func set_living_activity_queue_cluster(queue_count: int, aggregation_dot_count: int) -> void:
	_queue_count = maxi(1, queue_count)
	_aggregation_dot_count = clampi(aggregation_dot_count, 0, 4)
	queue_redraw()

func set_living_activity_carrying_troops_slots(slots: Array) -> void:
	_carrying_troops_slots = []
	for slot_variant in slots:
		if _carrying_troops_slots.size() >= 3:
			break
		if not (slot_variant is Dictionary):
			continue
		var slot: Dictionary = (slot_variant as Dictionary).duplicate(true)
		var label := str(slot.get("label", "")).strip_edges()
		if label == "":
			label = str(slot.get("troopType", slot.get("troop_type", ""))).strip_edges()
		var asset_path := str(slot.get("assetPath", slot.get("asset_path", ""))).strip_edges()
		if asset_path == "":
			continue
		slot["label"] = label
		slot["assetPath"] = asset_path
		slot["texture"] = _load_living_activity_marker_family_texture(asset_path)
		_carrying_troops_slots.append(slot)
	queue_redraw()

func _process(delta: float) -> void:
	_pulse = fmod(_pulse + delta, 1.0)
	queue_redraw()

func _draw() -> void:
	_marker_frame_asset_drawn = false
	_route_arrow_asset_drawn = false
	_cluster_badge_asset_drawn = false
	_carrying_troops_texture_draw_count = 0
	var color := _resolve_kind_color(_kind)
	var alpha_boost := 0.16 * sin(_pulse * TAU)
	color.a = clampf(color.a + alpha_boost, 0.32, 0.88)
	match _kind:
		KIND_LIVING_ACTIVITY:
			_draw_living_activity_marker(color)
		KIND_OCCUPIED:
			_draw_occupied_marker(color)
		KIND_GATHERED:
			_draw_gathered_marker(color)
		_:
			_draw_intent_ring(color)

func _normalize_kind(kind: String) -> String:
	var normalized := kind.strip_edges()
	if normalized == KIND_LIVING_ACTIVITY or normalized == KIND_OCCUPIED or normalized == KIND_GATHERED:
		return normalized
	return KIND_INTENT

func _resolve_kind_color(kind: String) -> Color:
	match kind:
		KIND_LIVING_ACTIVITY:
			return Color(0.98, 0.48, 0.18, 0.76)
		KIND_OCCUPIED:
			return Color(0.26, 0.68, 0.38, 0.62)
		KIND_GATHERED:
			return Color(0.90, 0.70, 0.20, 0.64)
		_:
			return Color(0.22, 0.52, 0.86, 0.66)

func _draw_intent_ring(color: Color) -> void:
	draw_arc(Vector2.ZERO, radius, deg_to_rad(-42.0), deg_to_rad(222.0), 34, color, 2.0)
	draw_arc(Vector2.ZERO, radius + 4.0, deg_to_rad(138.0), deg_to_rad(320.0), 24, Color(color.r, color.g, color.b, color.a * 0.56), 1.25)
	draw_circle(Vector2(radius, 0.0), 2.2, color)

func _draw_living_activity_marker(color: Color) -> void:
	_draw_living_activity_target_line()
	_draw_living_activity_marker_frame_asset()
	draw_circle(Vector2.ZERO, radius * 0.42, Color(color.r, color.g, color.b, color.a * 0.34))
	draw_arc(Vector2.ZERO, radius, deg_to_rad(-56.0), deg_to_rad(238.0), 36, color, 2.4)
	draw_arc(Vector2.ZERO, radius + 5.0, deg_to_rad(126.0), deg_to_rad(326.0), 24, Color(color.r, color.g, color.b, color.a * 0.54), 1.35)
	draw_circle(Vector2(radius, 0.0), 2.8, color)
	_draw_living_activity_avatar_pin()
	_draw_living_activity_status_badge()
	_draw_living_activity_queue_count_pill()
	_draw_living_activity_aggregation_dots()
	_draw_living_activity_carrying_troops_strip()

func _draw_living_activity_avatar_pin() -> void:
	var avatar_size := radius * 0.92
	var frame_rect := Rect2(Vector2(-avatar_size * 0.5, -avatar_size * 0.5), Vector2(avatar_size, avatar_size))
	draw_rect(frame_rect.grow(2.0), Color(0.055, 0.044, 0.028, 0.92), true)
	draw_rect(frame_rect.grow(2.0), Color(0.88, 0.66, 0.30, 0.92), false, 1.8)
	if _avatar_texture != null:
		draw_texture_rect(_avatar_texture, frame_rect, false, Color(0.95, 0.93, 0.86, 1.0))
	else:
		draw_circle(Vector2.ZERO, avatar_size * 0.28, Color(0.86, 0.68, 0.36, 0.82))

func _draw_living_activity_status_badge() -> void:
	if _status_dot.strip_edges() == "":
		return
	var badge_position := Vector2(radius * 0.36, -radius * 0.36)
	draw_circle(badge_position, 6.6, Color(0.035, 0.026, 0.014, 0.92))
	draw_circle(badge_position, 4.8, _resolve_status_dot_color(_status_dot))

func _draw_living_activity_queue_count_pill() -> void:
	if _queue_count <= 1:
		return
	var pill_size := Vector2(25.0, 16.0)
	var pill_position := Vector2(-pill_size.x * 0.5, radius * 0.32)
	var pill_rect := Rect2(pill_position, pill_size)
	if not _draw_living_activity_cluster_badge_asset(pill_rect.get_center(), _queue_count):
		draw_rect(pill_rect.grow(1.6), Color(0.035, 0.025, 0.014, 0.92), true)
		draw_rect(pill_rect.grow(1.6), Color(0.90, 0.62, 0.24, 0.88), false, 1.2)
	var font: Font = ThemeDB.fallback_font
	var label := str(_queue_count)
	draw_string(font, pill_position + Vector2(0.0, 12.0), label, HORIZONTAL_ALIGNMENT_CENTER, pill_size.x, 12, Color(1.0, 0.90, 0.62, 1.0))

func _draw_living_activity_aggregation_dots() -> void:
	if _aggregation_dot_count <= 0:
		return
	var start_x := -float(_aggregation_dot_count - 1) * 4.2
	for index in range(_aggregation_dot_count):
		var dot_position := Vector2(start_x + float(index) * 8.4, radius * 0.82)
		draw_circle(dot_position, 3.3, Color(0.035, 0.025, 0.014, 0.90))
		draw_circle(dot_position, 2.2, Color(1.0, 0.74, 0.26, 0.92))

func _draw_living_activity_target_line() -> void:
	if not _target_line_visible:
		return
	var line_vector := _target_line_vector
	if line_vector.length() < 1.0:
		return
	if line_vector.length() > 64.0:
		line_vector = line_vector.normalized() * 64.0
	draw_line(line_vector, Vector2.ZERO, Color(1.0, 0.74, 0.28, 0.76), 3.0)
	draw_line(line_vector, Vector2.ZERO, Color(0.12, 0.070, 0.030, 0.82), 1.0)
	draw_circle(line_vector, 3.0, Color(1.0, 0.82, 0.38, 0.90))
	_draw_living_activity_route_arrow_asset(line_vector)

func _draw_living_activity_marker_frame_asset() -> bool:
	if _marker_frame_texture == null:
		return false
	var draw_size := Vector2.ONE * clampf(radius * 2.28, 72.0, 98.0)
	draw_texture_rect(_marker_frame_texture, Rect2(-draw_size * 0.5, draw_size), false, Color(1.0, 1.0, 1.0, 0.94))
	_marker_frame_asset_drawn = true
	return true

func _draw_living_activity_route_arrow_asset(line_vector: Vector2) -> bool:
	if _route_arrow_texture == null or line_vector.length() < 6.0:
		return false
	var draw_size := Vector2(72.0, 24.0) * clampf(radius / 42.0, 0.74, 1.05)
	var arrow_position := line_vector * 0.58
	draw_set_transform(arrow_position, line_vector.angle(), Vector2.ONE)
	draw_texture_rect(_route_arrow_texture, Rect2(-draw_size * 0.5, draw_size), false, Color(1.0, 1.0, 1.0, 0.92))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	_route_arrow_asset_drawn = true
	return true

func _draw_living_activity_cluster_badge_asset(center: Vector2, queue_count: int) -> bool:
	if _cluster_badge_texture == null or queue_count <= 1:
		return false
	var draw_size := Vector2(42.0, 30.0) * clampf(radius / 42.0, 0.78, 1.0)
	draw_texture_rect(_cluster_badge_texture, Rect2(center - draw_size * 0.5, draw_size), false, Color(1.0, 1.0, 1.0, 0.96))
	_cluster_badge_asset_drawn = true
	return true

func _draw_living_activity_carrying_troops_strip() -> void:
	if _carrying_troops_slots.is_empty():
		return
	var slot_count := mini(3, _carrying_troops_slots.size())
	var cell_size := Vector2(18.0, 18.0) * clampf(radius / 42.0, 0.78, 1.0)
	var gap := 3.0
	var strip_width := float(slot_count) * cell_size.x + float(slot_count - 1) * gap
	var strip_origin := Vector2(-strip_width * 0.5, radius * 0.98)
	var backing_rect := Rect2(strip_origin - Vector2(4.0, 3.0), Vector2(strip_width + 8.0, cell_size.y + 6.0))
	draw_rect(backing_rect, Color(0.035, 0.026, 0.014, 0.88), true)
	draw_rect(backing_rect, Color(0.90, 0.62, 0.24, 0.82), false, 1.1)
	for slot_index in range(slot_count):
		var slot: Dictionary = _carrying_troops_slots[slot_index] as Dictionary
		var cell_rect := Rect2(strip_origin + Vector2(float(slot_index) * (cell_size.x + gap), 0.0), cell_size)
		draw_rect(cell_rect.grow(1.0), Color(0.16, 0.11, 0.052, 0.86), true)
		draw_rect(cell_rect.grow(1.0), Color(0.70, 0.46, 0.20, 0.72), false, 0.8)
		var texture: Texture2D = slot.get("texture", null) as Texture2D
		if texture != null:
			draw_texture_rect(texture, cell_rect, false, Color(1.0, 0.96, 0.82, 0.96))
			_carrying_troops_texture_draw_count += 1

func _resolve_status_dot_color(status_dot: String) -> Color:
	match status_dot.strip_edges().to_lower():
		"green", "active", "completed":
			return Color(0.34, 0.88, 0.42, 1.0)
		"yellow", "pending":
			return Color(0.96, 0.76, 0.28, 1.0)
		"red", "failed":
			return Color(0.92, 0.24, 0.18, 1.0)
		"gold":
			return Color(0.95, 0.66, 0.22, 1.0)
		_:
			return Color(0.70, 0.76, 0.68, 1.0)

func _load_living_activity_avatar_texture(path_value: String) -> Texture2D:
	var normalized_path := path_value.strip_edges()
	if normalized_path == "":
		return null
	var load_path := normalized_path
	if not FileAccess.file_exists(load_path) and not normalized_path.begins_with("res://"):
		load_path = ProjectSettings.globalize_path("res://../%s" % normalized_path)
	if not FileAccess.file_exists(load_path):
		return null
	var image := Image.new()
	if image.load(load_path) != OK:
		return null
	return ImageTexture.create_from_image(image)

func _load_living_activity_marker_family_textures() -> void:
	_marker_frame_texture = _load_living_activity_marker_family_texture(AI_LIVING_ACTIVITY_MAIN_WORLD_MARKER_FRAME_ASSET_PATH)
	_route_arrow_texture = _load_living_activity_marker_family_texture(AI_LIVING_ACTIVITY_MAIN_WORLD_ROUTE_ARROW_ASSET_PATH)
	_cluster_badge_texture = _load_living_activity_marker_family_texture(AI_LIVING_ACTIVITY_MAIN_WORLD_CLUSTER_BADGE_ASSET_PATH)

func _load_living_activity_marker_family_texture(path_value: String) -> Texture2D:
	var normalized_path := path_value.strip_edges()
	if normalized_path == "":
		return null
	if normalized_path.ends_with(".png"):
		var png_load_path := normalized_path
		if normalized_path.begins_with("res://"):
			png_load_path = ProjectSettings.globalize_path(normalized_path)
		elif not FileAccess.file_exists(png_load_path):
			png_load_path = ProjectSettings.globalize_path("res://../%s" % normalized_path)
		if FileAccess.file_exists(png_load_path):
			var png_image := Image.new()
			if png_image.load(png_load_path) == OK:
				return ImageTexture.create_from_image(png_image)
	if ResourceLoader.exists(normalized_path):
		var resource := load(normalized_path)
		if resource is Texture2D:
			return resource as Texture2D
	var load_path := normalized_path
	if normalized_path.begins_with("res://"):
		load_path = ProjectSettings.globalize_path(normalized_path)
	elif not FileAccess.file_exists(load_path):
		load_path = ProjectSettings.globalize_path("res://../%s" % normalized_path)
	var image := Image.new()
	if image.load(load_path) != OK:
		return null
	return ImageTexture.create_from_image(image)

func get_visual_debug_state() -> Dictionary:
	return {
		"markerFamilyContract": AI_LIVING_ACTIVITY_MARKER_FAMILY_CONTRACT,
		"markerFamilyManifestPath": AI_LIVING_ACTIVITY_MARKER_FAMILY_MANIFEST_PATH,
		"contract": AI_LIVING_ACTIVITY_MARKER_VISUAL_ASSET_CONTRACT,
		"kind": _kind,
		"status": _status,
		"markerFrameAssetPath": AI_LIVING_ACTIVITY_MAIN_WORLD_MARKER_FRAME_ASSET_PATH,
		"markerFrameAssetLoaded": _marker_frame_texture != null,
		"markerFrameAssetDrawn": _marker_frame_asset_drawn,
		"routeArrowAssetPath": AI_LIVING_ACTIVITY_MAIN_WORLD_ROUTE_ARROW_ASSET_PATH,
		"routeArrowAssetLoaded": _route_arrow_texture != null,
		"routeArrowAssetDrawn": _route_arrow_asset_drawn,
		"clusterBadgeAssetPath": AI_LIVING_ACTIVITY_MAIN_WORLD_CLUSTER_BADGE_ASSET_PATH,
		"clusterBadgeAssetLoaded": _cluster_badge_texture != null,
		"clusterBadgeAssetDrawn": _cluster_badge_asset_drawn,
		"avatarVisible": _kind == KIND_LIVING_ACTIVITY and _avatar_texture != null,
		"avatarImagePath": _avatar_image_path,
		"statusBadgeVisible": _kind == KIND_LIVING_ACTIVITY and _status_dot.strip_edges() != "",
		"statusDot": _status_dot,
		"targetLineVisible": _kind == KIND_LIVING_ACTIVITY and _target_line_visible,
		"targetLineLength": _target_line_vector.length(),
		"queueClusterContract": AI_LIVING_ACTIVITY_MARKER_QUEUE_CLUSTER_CONTRACT,
		"queueCountVisible": _kind == KIND_LIVING_ACTIVITY and _queue_count > 1,
		"queueCount": _queue_count,
		"aggregationDotsVisible": _kind == KIND_LIVING_ACTIVITY and _aggregation_dot_count > 0,
		"aggregationDotCount": _aggregation_dot_count,
		"aiLivingActivityMarkerCarryingTroopsStripContract": AI_LIVING_ACTIVITY_MARKER_CARRYING_TROOPS_STRIP_CONTRACT,
		"aiActivityCarryingTroopsChipContract": SlgUiComponentFactoryScript.ai_activity_carrying_troops_chip_contract(),
		"aiLivingActivityMarkerCarryingTroopsGeneratedAssetSource": SlgUiComponentFactoryScript.generated_troops_illustration_source(),
		"aiLivingActivityMarkerCarryingTroopsStripVisible": _kind == KIND_LIVING_ACTIVITY and not _carrying_troops_slots.is_empty(),
		"aiLivingActivityMarkerCarryingTroopsSlotCount": _carrying_troops_slots.size(),
		"aiLivingActivityMarkerCarryingTroopsTextureDrawCount": _carrying_troops_texture_draw_count,
		"aiLivingActivityMarkerCarryingTroopsLabels": _collect_living_activity_carrying_troops_labels(),
		"aiLivingActivityMarkerCarryingTroopsAssetPaths": _collect_living_activity_carrying_troops_asset_paths(),
	}

func _collect_living_activity_carrying_troops_labels() -> Array:
	var labels: Array[String] = []
	for slot_variant in _carrying_troops_slots:
		if not (slot_variant is Dictionary):
			continue
		var label := str((slot_variant as Dictionary).get("label", "")).strip_edges()
		if label != "" and not labels.has(label):
			labels.append(label)
	return labels

func _collect_living_activity_carrying_troops_asset_paths() -> Array:
	var asset_paths: Array[String] = []
	for slot_variant in _carrying_troops_slots:
		if not (slot_variant is Dictionary):
			continue
		var asset_path := str((slot_variant as Dictionary).get("assetPath", "")).strip_edges()
		if asset_path != "" and not asset_paths.has(asset_path):
			asset_paths.append(asset_path)
	return asset_paths

func _draw_occupied_marker(color: Color) -> void:
	var points := PackedVector2Array([
		Vector2(0.0, -radius * 0.72),
		Vector2(radius * 0.72, 0.0),
		Vector2(0.0, radius * 0.72),
		Vector2(-radius * 0.72, 0.0),
	])
	draw_colored_polygon(points, Color(color.r, color.g, color.b, color.a * 0.34))
	for index in range(points.size()):
		var next_index := (index + 1) % points.size()
		draw_line(points[index], points[next_index], color, 2.0)

func _draw_gathered_marker(color: Color) -> void:
	draw_arc(Vector2.ZERO, radius * 0.82, 0.0, TAU, 26, color, 1.8)
	draw_line(Vector2(-radius * 0.42, 0.0), Vector2(radius * 0.42, 0.0), color, 2.0)
	draw_line(Vector2(0.0, -radius * 0.42), Vector2(0.0, radius * 0.42), color, 2.0)
