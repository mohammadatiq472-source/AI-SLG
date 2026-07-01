extends Node2D
class_name UnitMarker

const UNIT_MANIFEST_PATH: String = "res://assets/themes/slgclient/manifests/unit_frames_manifest.json"
const FLAG_ATLAS_MANIFEST_PATH: String = "res://assets/themes/slgclient/current/units/flags/flag_atlas_manifest.json"
const MOVING_UNIT_BODY_VISUAL_CONTRACT: String = "main_world_moving_unit_body_visual_v1"
const MOVING_UNIT_BODY_FRAME_SOURCE: String = "unit_frames_manifest_v2_visual_types"
const DIRECTION_ORDER: Array[String] = ["r", "ru", "u", "lu", "l", "ld", "d", "rd"]
const FLAG_FRAME_KEYS: Array[String] = ["blue", "green", "red", "yellow", "purple", "neutral"]
const VISUAL_TYPE_INFANTRY: String = "infantry"
const VISUAL_TYPE_CAVALRY: String = "cavalry"
const VISUAL_TYPE_ARCHER: String = "archer"
const DEFAULT_VISUAL_TYPE: String = VISUAL_TYPE_CAVALRY
const ENGAGE_KIND_BATTLE: String = "battle"
const ENGAGE_KIND_TILE_CONTROL: String = "tile_control"
const ENGAGE_KIND_LOGISTICS: String = "logistics"
const IDENTITY_KIND_HUMAN: String = "human"
const IDENTITY_KIND_AI: String = "ai"
const IDENTITY_KIND_NEUTRAL: String = "neutral"

@export var radius: float = 4.0
@export var visual_scale: float = 0.64
@export var frame_fps: float = 14.0

static var _shared_loaded: bool = false
static var _shared_frames_by_visual_type: Dictionary = {}
static var _shared_default_visual_type: String = DEFAULT_VISUAL_TYPE
static var _shared_texture_cache: Dictionary = {}
static var _shared_flag_loaded: bool = false
static var _shared_flag_frames_by_key: Dictionary = {}

var _sprite: Sprite2D
var _flag_sprite: Sprite2D
var _formation_sprites: Array[Sprite2D] = []
var _formation_slots: Array = []
var _formation_slot_offsets: Array[Vector2] = [
	Vector2(-4.0, -64.0),
	Vector2(-25.0, -48.0),
	Vector2(24.0, -35.0),
]
var _base_color: Color = Color(0.88, 0.88, 0.90, 0.95)
var _engaged: bool = false
var _is_moving: bool = false
var _selected: bool = false
var _direction_key: String = "d"
var _engage_kind: String = ENGAGE_KIND_BATTLE
var _identity_kind: String = IDENTITY_KIND_NEUTRAL
var _visual_type: String = DEFAULT_VISUAL_TYPE
var _flag_source: String = "missing"
var _frame_timer: float = 0.0
var _frame_index: int = 0


func _ready() -> void:
	_ensure_shared_frames_loaded()
	_ensure_shared_flag_atlas_loaded()
	if _sprite == null:
		_sprite = Sprite2D.new()
		_sprite.name = "UnitSprite"
		_sprite.centered = true
		_sprite.position = Vector2(0.0, -34.0)
		_sprite.scale = Vector2(visual_scale, visual_scale)
		add_child(_sprite)
	_ensure_flag_sprite()
	_ensure_formation_sprites()
	_apply_sprite_modulate()
	_sync_flag_sprite()
	_apply_current_frame(true)


func _process(delta: float) -> void:
	if _is_moving:
		_frame_timer += delta
		var frame_step: float = 1.0 / max(1.0, frame_fps)
		while _frame_timer >= frame_step:
			_frame_timer -= frame_step
			_frame_index += 1
			_apply_current_frame(false)
	else:
		if _frame_index != 0:
			_frame_index = 0
			_apply_current_frame(false)


func set_faction_color(next_color: Color) -> void:
	_base_color = next_color
	_apply_sprite_modulate()
	_sync_flag_sprite()
	queue_redraw()


func set_identity_kind(next_identity_kind: String) -> void:
	var normalized_kind: String = _normalize_identity_kind(next_identity_kind)
	if _identity_kind == normalized_kind:
		return
	_identity_kind = normalized_kind
	_apply_sprite_modulate()
	queue_redraw()


func set_visual_type(next_visual_type: String) -> void:
	var normalized_type: String = _normalize_visual_type(next_visual_type)
	if _visual_type == normalized_type:
		return
	_visual_type = normalized_type
	_frame_timer = 0.0
	_frame_index = 0
	_apply_current_frame(true)


func set_formation_slots(next_slots: Array) -> void:
	_formation_slots = []
	for slot_variant in next_slots:
		if not (slot_variant is Dictionary):
			continue
		var slot: Dictionary = slot_variant as Dictionary
		var visual_type := _normalize_visual_type(str(slot.get("visualType", "")))
		_formation_slots.append({
			"role": str(slot.get("role", "")),
			"heroId": str(slot.get("heroId", "")),
			"heroName": str(slot.get("heroName", "")),
			"troopType": str(slot.get("troopType", "")),
			"visualType": visual_type,
		})
		if _formation_slots.size() >= 3:
			break
	_ensure_formation_sprites()
	_frame_timer = 0.0
	_frame_index = 0
	_apply_current_frame(true)
	queue_redraw()


func set_selected(next_selected: bool) -> void:
	if _selected == next_selected:
		return
	_selected = next_selected
	queue_redraw()


func set_move_direction(direction: Vector2) -> void:
	_direction_key = _resolve_direction_key(direction)
	_apply_current_frame(false)


func set_moving(next_moving: bool, direction: Vector2 = Vector2.ZERO) -> void:
	if direction.length() > 0.001:
		_direction_key = _resolve_direction_key(direction)
	_is_moving = next_moving
	if not _is_moving:
		_frame_timer = 0.0
		_frame_index = 0
	_apply_current_frame(false)


func play_engage(intensity: float = 1.0, direction: Vector2 = Vector2.ZERO, kind: String = ENGAGE_KIND_BATTLE) -> void:
	if direction.length() > 0.001:
		_direction_key = _resolve_direction_key(direction)
	_engage_kind = _normalize_engage_kind(kind)
	var profile: Dictionary = _resolve_engage_profile(_engage_kind)
	var normalized_intensity: float = clampf(intensity * float(profile.get("boost", 1.0)), 0.30, 1.55)
	var dir: Vector2 = direction.normalized() if direction.length() > 0.001 else Vector2.ZERO
	var base_position: Vector2 = position
	_kill_engage_tween()
	_engaged = true
	_apply_sprite_modulate()
	queue_redraw()
	var tween := create_tween()
	set_meta("engage_tween", tween)
	tween.set_trans(Tween.TRANS_SINE)
	tween.set_ease(Tween.EASE_OUT)
	var pre_scale: float = 1.0 + float(profile.get("preScale", 0.10)) * normalized_intensity
	var peak_scale: float = 1.0 + float(profile.get("peakScale", 0.28)) * normalized_intensity
	var pre_duration: float = float(profile.get("preDuration", 0.04)) + 0.04 * normalized_intensity
	var burst_duration: float = float(profile.get("burstDuration", 0.06)) + 0.05 * normalized_intensity
	var settle_duration: float = float(profile.get("settleDuration", 0.10)) + 0.08 * normalized_intensity
	var push: float = float(profile.get("push", 1.0))
	var pre_offset: Vector2 = dir * (-0.60 - 1.05 * normalized_intensity * push)
	var burst_offset: Vector2 = dir * (1.20 + 2.20 * normalized_intensity * push)

	tween.tween_property(self, "scale", Vector2(pre_scale, pre_scale), pre_duration)
	if dir != Vector2.ZERO:
		tween.parallel().tween_property(self, "position", base_position + pre_offset, pre_duration)
	tween.tween_property(self, "scale", Vector2(peak_scale, peak_scale), burst_duration)
	if dir != Vector2.ZERO:
		tween.parallel().tween_property(self, "position", base_position + burst_offset, burst_duration)
	tween.tween_property(self, "scale", Vector2.ONE, settle_duration)
	if dir != Vector2.ZERO:
		tween.parallel().tween_property(self, "position", base_position, settle_duration)
	tween.tween_callback(Callable(self, "_clear_engage_state"))
	tween.tween_callback(Callable(self, "_clear_engage_tween"))


func _clear_engage_state() -> void:
	_engaged = false
	_apply_sprite_modulate()
	queue_redraw()


func _clear_engage_tween() -> void:
	if has_meta("engage_tween"):
		remove_meta("engage_tween")


func _kill_engage_tween() -> void:
	if not has_meta("engage_tween"):
		return
	var running_tween: Variant = get_meta("engage_tween")
	if running_tween is Tween:
		(running_tween as Tween).kill()
	remove_meta("engage_tween")


func _draw() -> void:
	var identity_color: Color = _resolve_identity_color(_identity_kind)
	var ring_color: Color = identity_color
	if _engaged:
		ring_color = ring_color.lerp(_resolve_engage_accent_color(_engage_kind), 0.58)
	if _has_rendered_unit_texture():
		_draw_ground_shadow()
	_sync_flag_sprite()
	if _flag_sprite == null or _flag_sprite.texture == null:
		_draw_faction_banner(_base_color, ring_color)
	if _selected:
		_draw_selection_frame(ring_color)

	if _has_rendered_unit_texture():
		_draw_identity_ring(ring_color, radius + 2.0, 1.15)
		_draw_identity_badge(ring_color, radius + 2.0)
		return

	var draw_color: Color = _resolve_engage_accent_color(_engage_kind) if _engaged else _base_color
	draw_circle(Vector2.ZERO, radius, draw_color)
	_draw_identity_ring(ring_color, radius + 1.5, 1.0)
	_draw_identity_badge(ring_color, radius + 1.5)


func _draw_ground_shadow() -> void:
	var shadow_width := 72.0 if _uses_formation_slots() else 42.0
	var shadow_height := 22.0 if _uses_formation_slots() else 13.0
	var shadow_center := Vector2(0.0, 4.0)
	var points := PackedVector2Array()
	var steps := 28
	for index in range(steps):
		var angle := TAU * float(index) / float(steps)
		points.append(shadow_center + Vector2(cos(angle) * shadow_width * 0.5, sin(angle) * shadow_height * 0.5))
	draw_colored_polygon(points, Color(0.0, 0.0, 0.0, 0.26))
	draw_polyline(points, Color(0.0, 0.0, 0.0, 0.18), 1.0, true)


func _has_rendered_unit_texture() -> bool:
	if _uses_formation_slots():
		for formation_sprite in _formation_sprites:
			if formation_sprite != null and formation_sprite.visible and formation_sprite.texture != null:
				return true
		return false
	return _sprite != null and _sprite.visible and _sprite.texture != null


func _uses_formation_slots() -> bool:
	return _formation_slots.size() >= 2


func _ensure_formation_sprites() -> void:
	while _formation_sprites.size() < _formation_slots.size():
		var slot_sprite := Sprite2D.new()
		slot_sprite.name = "FormationSlot%d" % _formation_sprites.size()
		slot_sprite.centered = true
		slot_sprite.z_index = _formation_sprites.size()
		add_child(slot_sprite)
		_formation_sprites.append(slot_sprite)
	for index in range(_formation_sprites.size()):
		var formation_sprite: Sprite2D = _formation_sprites[index]
		var visible_slot: bool = index < _formation_slots.size() and _uses_formation_slots()
		formation_sprite.visible = visible_slot
		if index < _formation_slot_offsets.size():
			formation_sprite.position = _formation_slot_offsets[index]
		else:
			formation_sprite.position = Vector2(0.0, -34.0 + float(index) * 10.0)
		var formation_scale: float = clampf(visual_scale * 0.88, 0.42, 0.62)
		formation_sprite.scale = Vector2(formation_scale, formation_scale)


func _hide_formation_sprites() -> void:
	for formation_sprite in _formation_sprites:
		if formation_sprite != null:
			formation_sprite.visible = false


func _ensure_flag_sprite() -> void:
	if _flag_sprite != null:
		return
	_flag_sprite = Sprite2D.new()
	_flag_sprite.name = "UnitFlag"
	_flag_sprite.centered = true
	_flag_sprite.position = Vector2(-23.0, -61.0)
	_flag_sprite.scale = Vector2(0.88, 0.88)
	_flag_sprite.z_index = 6
	add_child(_flag_sprite)


func _sync_flag_sprite() -> void:
	_ensure_flag_sprite()
	if _flag_sprite == null:
		_flag_source = "missing"
		return
	var flag_key := _resolve_flag_frame_key(_base_color)
	var texture: Texture2D = _shared_flag_frames_by_key.get(flag_key, null) as Texture2D
	if texture == null:
		texture = _shared_flag_frames_by_key.get("neutral", null) as Texture2D
	if texture == null:
		_flag_sprite.texture = null
		_flag_sprite.visible = false
		_flag_source = "fallback"
		return
	_flag_sprite.texture = texture
	_flag_sprite.visible = true
	_flag_sprite.modulate = Color(1.0, 1.0, 1.0, 0.94).lerp(_base_color, 0.42)
	_flag_source = "atlas"


func _resolve_flag_frame_key(color: Color) -> String:
	var red := color.r
	var green := color.g
	var blue := color.b
	var max_channel: float = max(red, max(green, blue))
	var min_channel: float = min(red, min(green, blue))
	if max_channel - min_channel < 0.10:
		return "neutral"
	if red >= 0.66 and green >= 0.55 and blue < 0.42:
		return "yellow"
	if red >= green and red >= blue:
		return "purple" if blue > 0.48 else "red"
	if green >= red and green >= blue:
		return "green"
	if blue >= red and blue >= green:
		return "blue"
	return "neutral"


func _draw_selection_frame(color: Color) -> void:
	var selection_color := Color(color.r, color.g, color.b, 0.92)
	var glow_color := Color(color.r, color.g, color.b, 0.20)
	var frame := PackedVector2Array([
		Vector2(0.0, -23.0),
		Vector2(42.0, 0.0),
		Vector2(0.0, 23.0),
		Vector2(-42.0, 0.0),
		Vector2(0.0, -23.0),
	])
	draw_colored_polygon(PackedVector2Array([
		Vector2(0.0, -26.0),
		Vector2(46.0, 0.0),
		Vector2(0.0, 26.0),
		Vector2(-46.0, 0.0),
	]), glow_color)
	draw_polyline(frame, selection_color, 1.8, true)
	draw_circle(Vector2(0.0, -23.0), 2.0, selection_color)
	draw_circle(Vector2(42.0, 0.0), 2.0, selection_color)
	draw_circle(Vector2(0.0, 23.0), 2.0, selection_color)
	draw_circle(Vector2(-42.0, 0.0), 2.0, selection_color)


func _draw_faction_banner(fill_color: Color, outline_color: Color) -> void:
	var pole_top := Vector2(-18.0, -53.0)
	var pole_base := Vector2(-18.0, -18.0)
	var pole_color := Color(0.18, 0.14, 0.10, 0.82)
	var cloth_color := Color(fill_color.r, fill_color.g, fill_color.b, 0.88)
	var cloth_shadow := cloth_color.darkened(0.34)
	var edge_color := Color(outline_color.r, outline_color.g, outline_color.b, 0.72)
	draw_line(pole_base, pole_top, pole_color, 1.6)
	var cloth := PackedVector2Array([
		pole_top + Vector2(0.0, 0.0),
		pole_top + Vector2(22.0, 3.2),
		pole_top + Vector2(17.0, 14.0),
		pole_top + Vector2(0.0, 11.2),
	])
	draw_colored_polygon(cloth, cloth_color)
	draw_colored_polygon(
		PackedVector2Array([
			pole_top + Vector2(0.0, 8.8),
			pole_top + Vector2(17.0, 11.6),
			pole_top + Vector2(17.0, 14.0),
			pole_top + Vector2(0.0, 11.2),
		]),
		Color(cloth_shadow.r, cloth_shadow.g, cloth_shadow.b, 0.42),
	)
	draw_polyline(PackedVector2Array([cloth[0], cloth[1], cloth[2], cloth[3], cloth[0]]), edge_color, 0.9, true)
	draw_circle(pole_top, 1.7, edge_color)


func get_visual_debug_state() -> Dictionary:
	var formation_visual_types: Array = []
	for slot_variant in _formation_slots:
		if not (slot_variant is Dictionary):
			continue
		var slot: Dictionary = slot_variant as Dictionary
		formation_visual_types.append(str(slot.get("visualType", "")))
	return {
		"movingUnitBodyVisualContract": MOVING_UNIT_BODY_VISUAL_CONTRACT,
		"movingUnitBodyFrameSource": MOVING_UNIT_BODY_FRAME_SOURCE,
		"movingUnitBodyFrameManifestPath": UNIT_MANIFEST_PATH,
		"movingUnitBodyUsesGeneratedTroopsForeground": false,
		"movingUnitBodyDirectionCount": DIRECTION_ORDER.size(),
		"movingUnitBodyFrameCountByVisualType": _build_visual_type_frame_count_summary(),
		"movingUnitBodyFormationSlotCount": _formation_slots.size(),
		"movingUnitBodyFormationVisualTypes": formation_visual_types,
		"selected": _selected,
		"visualType": _visual_type,
		"formationSlotCount": _formation_slots.size(),
		"formationVisualTypes": formation_visual_types,
		"directionKey": _direction_key,
		"identityKind": _identity_kind,
		"flagSource": _flag_source,
		"bannerColor": {
			"r": _base_color.r,
			"g": _base_color.g,
			"b": _base_color.b,
			"a": _base_color.a,
		},
		"moving": _is_moving,
		"frameIndex": _frame_index,
	}


static func _build_visual_type_frame_count_summary() -> Dictionary:
	var summary: Dictionary = {}
	for visual_type_variant in _shared_frames_by_visual_type.keys():
		var visual_type_key := str(visual_type_variant)
		var frames_by_direction: Dictionary = _shared_frames_by_visual_type.get(visual_type_variant, {}) as Dictionary
		var direction_counts: Dictionary = {}
		for direction in DIRECTION_ORDER:
			direction_counts[direction] = (frames_by_direction.get(direction, []) as Array).size()
		summary[visual_type_key] = direction_counts
	return summary


func _resolve_direction_key(direction: Vector2) -> String:
	if direction.length() <= 0.001:
		return _direction_key if _direction_key in DIRECTION_ORDER else "d"
	var angle_deg: float = rad_to_deg(direction.angle())
	if angle_deg < 0.0:
		angle_deg += 360.0
	if angle_deg >= 337.5 or angle_deg < 22.5:
		return "r"
	if angle_deg < 67.5:
		return "rd"
	if angle_deg < 112.5:
		return "d"
	if angle_deg < 157.5:
		return "ld"
	if angle_deg < 202.5:
		return "l"
	if angle_deg < 247.5:
		return "lu"
	if angle_deg < 292.5:
		return "u"
	return "ru"


func _apply_current_frame(force_reset: bool) -> void:
	if _sprite == null:
		return
	if _uses_formation_slots():
		_sprite.visible = false
		_ensure_formation_sprites()
		if force_reset:
			_frame_index = 0
		for index in range(_formation_sprites.size()):
			var formation_sprite: Sprite2D = _formation_sprites[index]
			var slot: Dictionary = _formation_slots[index] as Dictionary
			var slot_frames: Array = _resolve_frames_for_direction(str(slot.get("visualType", DEFAULT_VISUAL_TYPE)), _direction_key)
			if slot_frames.is_empty():
				slot_frames = _resolve_frames_for_direction(DEFAULT_VISUAL_TYPE, _direction_key)
			if slot_frames.is_empty():
				formation_sprite.texture = null
				continue
			var slot_frame: Dictionary = slot_frames[_frame_index % slot_frames.size()] as Dictionary
			formation_sprite.texture = slot_frame.get("texture", null) as Texture2D
			formation_sprite.region_enabled = false
			formation_sprite.visible = formation_sprite.texture != null
		_apply_sprite_modulate()
		return
	_hide_formation_sprites()
	_sprite.visible = true
	var frames: Array = _resolve_frames_for_direction(_visual_type, _direction_key)
	if frames.is_empty():
		frames = _resolve_frames_for_direction(DEFAULT_VISUAL_TYPE, _direction_key)
	if frames.is_empty():
		frames = _resolve_frames_for_direction(_shared_default_visual_type, _direction_key)
	if frames.is_empty():
		_sprite.texture = null
		return
	if force_reset:
		_frame_index = 0
	var frame: Dictionary = frames[_frame_index % frames.size()] as Dictionary
	var frame_texture: Texture2D = frame.get("texture", null) as Texture2D
	_sprite.texture = frame_texture
	_sprite.region_enabled = false
	_apply_sprite_modulate()


func _resolve_frames_for_direction(visual_type: String, direction_key: String) -> Array:
	var normalized_type: String = _normalize_visual_type(visual_type)
	if not _shared_frames_by_visual_type.has(normalized_type):
		return []
	var frames_by_direction: Dictionary = _shared_frames_by_visual_type.get(normalized_type, {}) as Dictionary
	var frames: Array = frames_by_direction.get(direction_key, []) as Array
	if frames.is_empty():
		frames = frames_by_direction.get("d", []) as Array
	return frames


func _apply_sprite_modulate() -> void:
	var tint := Color(1.0, 1.0, 1.0, 0.96).lerp(_base_color, 0.22)
	tint = tint.lerp(_resolve_identity_color(_identity_kind), 0.16)
	if _engaged:
		tint = tint.lerp(_resolve_engage_accent_color(_engage_kind), 0.34)
	if _sprite != null:
		_sprite.modulate = tint
	for formation_sprite in _formation_sprites:
		if formation_sprite != null:
			formation_sprite.modulate = tint


func _draw_identity_ring(color: Color, ring_radius: float, width: float) -> void:
	match _identity_kind:
		IDENTITY_KIND_HUMAN:
			draw_arc(Vector2.ZERO, ring_radius, 0.0, TAU, 28, color, width + 0.25)
			var accent_color := Color(color.r, color.g, color.b, clampf(color.a * 0.78, 0.0, 1.0))
			draw_arc(
				Vector2.ZERO,
				ring_radius + 1.4,
				deg_to_rad(-116.0),
				deg_to_rad(-64.0),
				10,
				accent_color,
				width,
			)
		IDENTITY_KIND_AI:
			draw_arc(Vector2.ZERO, ring_radius, 0.20, PI - 0.20, 14, color, width + 0.25)
			draw_arc(Vector2.ZERO, ring_radius, PI + 0.20, TAU - 0.20, 14, color, width + 0.25)
			draw_line(
				Vector2(ring_radius + 0.9, 0.0),
				Vector2(ring_radius + 3.0, 0.0),
				color,
				width,
			)
			draw_line(
				Vector2(-ring_radius - 0.9, 0.0),
				Vector2(-ring_radius - 3.0, 0.0),
				color,
				width,
			)
		_:
			var neutral_color := Color(color.r, color.g, color.b, clampf(color.a * 0.74, 0.0, 1.0))
			draw_arc(Vector2.ZERO, ring_radius, 0.0, TAU, 20, neutral_color, width)
			draw_circle(Vector2(0.0, -ring_radius), 0.9, color)
			draw_circle(Vector2(ring_radius, 0.0), 0.9, color)
			draw_circle(Vector2(0.0, ring_radius), 0.9, color)
			draw_circle(Vector2(-ring_radius, 0.0), 0.9, color)


func _draw_identity_badge(color: Color, ring_radius: float) -> void:
	match _identity_kind:
		IDENTITY_KIND_HUMAN:
			var tip: Vector2 = Vector2(0.0, -ring_radius - 2.8)
			var left: Vector2 = Vector2(-2.2, -ring_radius + 0.2)
			var right: Vector2 = Vector2(2.2, -ring_radius + 0.2)
			draw_colored_polygon(PackedVector2Array([tip, right, left]), color)
		IDENTITY_KIND_AI:
			var center: Vector2 = Vector2(ring_radius + 2.4, 0.0)
			draw_colored_polygon(
				PackedVector2Array(
					[
						center + Vector2(0.0, -1.8),
						center + Vector2(1.8, 0.0),
						center + Vector2(0.0, 1.8),
						center + Vector2(-1.8, 0.0),
					]
				),
				color,
			)
		_:
			draw_circle(Vector2(0.0, -ring_radius - 1.7), 1.2, color)


func _normalize_identity_kind(kind: String) -> String:
	match kind.strip_edges().to_lower():
		IDENTITY_KIND_HUMAN:
			return IDENTITY_KIND_HUMAN
		IDENTITY_KIND_AI:
			return IDENTITY_KIND_AI
		IDENTITY_KIND_NEUTRAL:
			return IDENTITY_KIND_NEUTRAL
		_:
			return IDENTITY_KIND_NEUTRAL


func _resolve_identity_color(kind: String) -> Color:
	match _normalize_identity_kind(kind):
		IDENTITY_KIND_HUMAN:
			return Color(0.28, 0.82, 1.0, 0.95)
		IDENTITY_KIND_AI:
			return Color(1.0, 0.48, 0.34, 0.95)
		_:
			return Color(0.74, 0.78, 0.86, 0.90)


func _normalize_engage_kind(kind: String) -> String:
	match kind:
		ENGAGE_KIND_BATTLE:
			return ENGAGE_KIND_BATTLE
		ENGAGE_KIND_TILE_CONTROL:
			return ENGAGE_KIND_TILE_CONTROL
		ENGAGE_KIND_LOGISTICS:
			return ENGAGE_KIND_LOGISTICS
		_:
			return ENGAGE_KIND_BATTLE


func _resolve_engage_profile(kind: String) -> Dictionary:
	match _normalize_engage_kind(kind):
		ENGAGE_KIND_BATTLE:
			return {
				"boost": 1.08,
				"preScale": 0.13,
				"peakScale": 0.34,
				"preDuration": 0.035,
				"burstDuration": 0.055,
				"settleDuration": 0.10,
				"push": 1.35,
			}
		ENGAGE_KIND_TILE_CONTROL:
			return {
				"boost": 0.97,
				"preScale": 0.10,
				"peakScale": 0.27,
				"preDuration": 0.04,
				"burstDuration": 0.065,
				"settleDuration": 0.11,
				"push": 1.0,
			}
		ENGAGE_KIND_LOGISTICS:
			return {
				"boost": 0.84,
				"preScale": 0.08,
				"peakScale": 0.21,
				"preDuration": 0.05,
				"burstDuration": 0.075,
				"settleDuration": 0.13,
				"push": 0.72,
			}
		_:
			return {
				"boost": 1.0,
				"preScale": 0.10,
				"peakScale": 0.28,
				"preDuration": 0.04,
				"burstDuration": 0.06,
				"settleDuration": 0.10,
				"push": 1.0,
			}


func _resolve_engage_accent_color(kind: String) -> Color:
	match _normalize_engage_kind(kind):
		ENGAGE_KIND_BATTLE:
			return Color(1.0, 0.45, 0.34, 0.96)
		ENGAGE_KIND_TILE_CONTROL:
			return Color(1.0, 0.82, 0.38, 0.93)
		ENGAGE_KIND_LOGISTICS:
			return Color(0.50, 0.82, 1.0, 0.90)
		_:
			return Color(1.0, 0.45, 0.34, 0.96)


static func _ensure_shared_frames_loaded() -> void:
	if _shared_loaded:
		return
	_shared_loaded = true
	_shared_frames_by_visual_type = {}
	_shared_default_visual_type = DEFAULT_VISUAL_TYPE
	var file := FileAccess.open(UNIT_MANIFEST_PATH, FileAccess.READ)
	if file == null:
		push_warning("[unit-marker] manifest missing: %s" % UNIT_MANIFEST_PATH)
		return
	var raw_text: String = file.get_as_text()
	file.close()
	var parsed: Variant = JSON.parse_string(raw_text)
	if not (parsed is Dictionary):
		push_warning("[unit-marker] manifest parse failed")
		return
	var manifest: Dictionary = parsed as Dictionary
	var raw_visual_types: Dictionary = manifest.get("visualTypes", {}) as Dictionary
	if not raw_visual_types.is_empty():
		for visual_type_variant in raw_visual_types.keys():
			var visual_type_key: String = _normalize_visual_type(str(visual_type_variant))
			var visual_type_payload: Dictionary = raw_visual_types.get(visual_type_variant, {}) as Dictionary
			var raw_directions: Dictionary = visual_type_payload.get("directions", {}) as Dictionary
			_shared_frames_by_visual_type[visual_type_key] = _build_cooked_frames_by_direction(raw_directions)
	else:
		var raw_directions: Dictionary = manifest.get("directions", {}) as Dictionary
		_shared_frames_by_visual_type[VISUAL_TYPE_CAVALRY] = _build_cooked_frames_by_direction(raw_directions)

	if _shared_frames_by_visual_type.has(VISUAL_TYPE_CAVALRY):
		_shared_default_visual_type = VISUAL_TYPE_CAVALRY
	elif not _shared_frames_by_visual_type.is_empty():
		_shared_default_visual_type = str(_shared_frames_by_visual_type.keys()[0])


static func _ensure_shared_flag_atlas_loaded() -> void:
	if _shared_flag_loaded:
		return
	_shared_flag_loaded = true
	_shared_flag_frames_by_key = {}
	var file := FileAccess.open(FLAG_ATLAS_MANIFEST_PATH, FileAccess.READ)
	if file == null:
		push_warning("[unit-marker] flag atlas manifest missing: %s" % FLAG_ATLAS_MANIFEST_PATH)
		return
	var raw_text: String = file.get_as_text()
	file.close()
	var parsed: Variant = JSON.parse_string(raw_text)
	if not (parsed is Dictionary):
		push_warning("[unit-marker] flag atlas manifest parse failed")
		return
	var manifest: Dictionary = parsed as Dictionary
	var atlas_path: String = str(manifest.get("atlasPath", "")).strip_edges()
	var atlas_texture: Texture2D = null
	if atlas_path != "":
		atlas_texture = _shared_texture_cache.get(atlas_path, null) as Texture2D
		if atlas_texture == null:
			atlas_texture = _load_texture_with_fallback(atlas_path)
			if atlas_texture != null:
				_shared_texture_cache[atlas_path] = atlas_texture
	var raw_flags: Dictionary = manifest.get("flags", {}) as Dictionary
	for flag_key in FLAG_FRAME_KEYS:
		var flag_payload: Dictionary = raw_flags.get(flag_key, {}) as Dictionary
		var texture: Texture2D = null
		var atlas_rect: Variant = flag_payload.get("atlasRect", {})
		if atlas_texture != null and atlas_rect is Dictionary:
			texture = _build_flag_atlas_texture(atlas_texture, atlas_rect as Dictionary)
		if texture == null:
			var texture_path: String = str(flag_payload.get("texturePath", "")).strip_edges()
			if texture_path == "":
				continue
			texture = _shared_texture_cache.get(texture_path, null) as Texture2D
			if texture == null:
				texture = _load_texture_with_fallback(texture_path)
				if texture != null:
					_shared_texture_cache[texture_path] = texture
		if texture != null:
			_shared_flag_frames_by_key[flag_key] = texture


static func _build_flag_atlas_texture(atlas_texture: Texture2D, atlas_rect: Dictionary) -> Texture2D:
	var region := Rect2(
		float(atlas_rect.get("x", 0.0)),
		float(atlas_rect.get("y", 0.0)),
		float(atlas_rect.get("width", 64.0)),
		float(atlas_rect.get("height", 64.0)),
	)
	var texture := AtlasTexture.new()
	texture.atlas = atlas_texture
	texture.region = region
	return texture


static func _build_cooked_frames_by_direction(raw_directions: Dictionary) -> Dictionary:
	var frames_by_direction: Dictionary = {}
	for direction in DIRECTION_ORDER:
		var frame_list: Array = raw_directions.get(direction, []) as Array
		var cooked: Array = []
		for frame_variant in frame_list:
			if not (frame_variant is Dictionary):
				continue
			var frame: Dictionary = frame_variant as Dictionary
			var texture_path: String = str(frame.get("texturePath", "")).strip_edges()
			if texture_path == "":
				continue
			var texture: Texture2D = _shared_texture_cache.get(texture_path, null) as Texture2D
			if texture == null:
				texture = _load_texture_with_fallback(texture_path)
				if texture != null:
					_shared_texture_cache[texture_path] = texture
			if texture == null:
				continue
			cooked.append(
				{
					"name": str(frame.get("name", "")),
					"direction": direction,
					"sequence": int(frame.get("sequence", 0)),
					"texture": texture,
				}
			)
		frames_by_direction[direction] = cooked
	return frames_by_direction


static func _normalize_visual_type(visual_type: String) -> String:
	match visual_type.strip_edges().to_lower():
		VISUAL_TYPE_INFANTRY:
			return VISUAL_TYPE_INFANTRY
		VISUAL_TYPE_CAVALRY:
			return VISUAL_TYPE_CAVALRY
		VISUAL_TYPE_ARCHER:
			return VISUAL_TYPE_ARCHER
		_:
			return DEFAULT_VISUAL_TYPE


static func _load_texture_with_fallback(res_path: String) -> Texture2D:
	if _can_load_imported_texture(res_path):
		var texture: Texture2D = load(res_path) as Texture2D
		if texture != null:
			return texture
	return _load_image_texture(res_path)


static func _can_load_imported_texture(res_path: String) -> bool:
	if not ResourceLoader.exists(res_path):
		return false
	var import_path := "%s.import" % res_path
	if not FileAccess.file_exists(import_path):
		return true
	var file := FileAccess.open(import_path, FileAccess.READ)
	if file == null:
		return false
	var import_text := file.get_as_text()
	file.close()
	var imported_path := _resolve_imported_texture_cache_path(import_text)
	if imported_path == "":
		return true
	return FileAccess.file_exists(imported_path)


static func _resolve_imported_texture_cache_path(import_text: String) -> String:
	for raw_line in import_text.split("\n"):
		var line := str(raw_line).strip_edges()
		if not line.begins_with("path="):
			continue
		var value := line.trim_prefix("path=").strip_edges()
		value = value.trim_prefix("\"").trim_suffix("\"")
		if value != "":
			return value
	return ""


static func _load_image_texture(res_path: String) -> Texture2D:
	var abs_path: String = ProjectSettings.globalize_path(res_path)
	var image := Image.new()
	var image_err: Error = image.load(abs_path)
	if image_err != OK:
		push_warning("[unit-marker] image load fallback failed: %s (err=%d)" % [abs_path, int(image_err)])
		return null
	return ImageTexture.create_from_image(image)
