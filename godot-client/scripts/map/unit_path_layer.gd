extends Node2D

@export var path_color: Color = Color(0.98, 0.84, 0.32, 0.86)
@export var path_width: float = 2.0
@export var target_color: Color = Color(1.0, 0.52, 0.34, 0.94)
@export var target_radius: float = 4.5
@export var arrow_spacing: float = 54.0
@export var arrow_size: float = 7.0
@export var path_shadow_color: Color = Color(0.02, 0.04, 0.08, 0.36)

var _unit_path_data_by_id: Dictionary = {}


func set_unit_path_data(next_path_data_by_id: Dictionary) -> void:
	_unit_path_data_by_id = next_path_data_by_id.duplicate(true)
	queue_redraw()


func _draw() -> void:
	for path_variant in _unit_path_data_by_id.values():
		if not (path_variant is Dictionary):
			continue
		var path_data: Dictionary = path_variant as Dictionary
		_draw_path_line(path_data)
		_draw_path_arrowheads(path_data)
		_draw_target_marker(path_data)


func _draw_path_line(path_data: Dictionary) -> void:
	var line_color: Color = _resolve_color(path_data, "pathColor", path_color)
	var points_variant: Variant = path_data.get("points", [])
	if not (points_variant is Array):
		return
	var points: Array = points_variant as Array
	if points.size() < 2:
		return
	var packed_points := PackedVector2Array()
	for point_variant in points:
		if point_variant is Vector2:
			packed_points.append(point_variant as Vector2)
	if packed_points.size() < 2:
		return
	draw_polyline(packed_points, path_shadow_color, path_width + 2.6, true)
	draw_polyline(packed_points, line_color, path_width, true)


func _draw_path_arrowheads(path_data: Dictionary) -> void:
	var arrow_color: Color = _resolve_color(path_data, "pathColor", path_color)
	var points_variant: Variant = path_data.get("points", [])
	if not (points_variant is Array):
		return
	var points: Array = points_variant as Array
	if points.size() < 2:
		return
	for index in range(points.size() - 1):
		var from_variant: Variant = points[index]
		var to_variant: Variant = points[index + 1]
		if not (from_variant is Vector2) or not (to_variant is Vector2):
			continue
		var from_point: Vector2 = from_variant as Vector2
		var to_point: Vector2 = to_variant as Vector2
		var segment: Vector2 = to_point - from_point
		var distance: float = segment.length()
		if distance < 16.0:
			continue
		var direction: Vector2 = segment.normalized()
		var arrow_count: int = maxi(1, floori(distance / maxf(arrow_spacing, 12.0)))
		for arrow_index in range(arrow_count):
			var fraction: float = float(arrow_index + 1) / float(arrow_count + 1)
			_draw_arrowhead(from_point.lerp(to_point, fraction), direction, arrow_color)


func _draw_arrowhead(center: Vector2, direction: Vector2, color: Color) -> void:
	if direction.length() <= 0.001:
		return
	var forward: Vector2 = direction.normalized()
	var normal := Vector2(-forward.y, forward.x)
	var tip: Vector2 = center + forward * arrow_size
	var base: Vector2 = center - forward * arrow_size * 0.62
	var left: Vector2 = base + normal * arrow_size * 0.48
	var right: Vector2 = base - normal * arrow_size * 0.48
	var fill_color := Color(color.r, color.g, color.b, clampf(color.a * 0.88, 0.0, 1.0))
	var edge_color := Color(0.04, 0.05, 0.07, 0.42)
	draw_colored_polygon(PackedVector2Array([tip, left, right]), fill_color)
	draw_polyline(PackedVector2Array([tip, left, right, tip]), edge_color, 0.8, true)


func _draw_target_marker(path_data: Dictionary) -> void:
	var has_target: bool = bool(path_data.get("hasTarget", false))
	if not has_target:
		return
	var target_position_variant: Variant = path_data.get("targetPosition", Vector2.ZERO)
	if not (target_position_variant is Vector2):
		return
	var target_position: Vector2 = target_position_variant as Vector2
	var marker_color: Color = _resolve_color(path_data, "targetColor", target_color)
	var glow_color := Color(marker_color.r, marker_color.g, marker_color.b, 0.18)
	var edge_color := Color(marker_color.r, marker_color.g, marker_color.b, 0.92)
	var diamond := PackedVector2Array([
		target_position + Vector2(0.0, -target_radius - 4.0),
		target_position + Vector2(target_radius + 6.0, 0.0),
		target_position + Vector2(0.0, target_radius + 4.0),
		target_position + Vector2(-target_radius - 6.0, 0.0),
	])
	draw_colored_polygon(diamond, glow_color)
	draw_polyline(PackedVector2Array([diamond[0], diamond[1], diamond[2], diamond[3], diamond[0]]), edge_color, 1.4, true)
	draw_circle(target_position, target_radius, marker_color)
	draw_arc(target_position, target_radius + 5.0, deg_to_rad(-36.0), deg_to_rad(324.0), 28, edge_color, 1.2)
	draw_line(target_position + Vector2(-target_radius - 6.0, 0.0), target_position + Vector2(-target_radius - 2.0, 0.0), edge_color, 1.1)
	draw_line(target_position + Vector2(target_radius + 2.0, 0.0), target_position + Vector2(target_radius + 6.0, 0.0), edge_color, 1.1)


func get_visual_debug_summary() -> Dictionary:
	var target_count: int = 0
	var arrow_estimate_count: int = 0
	for path_variant in _unit_path_data_by_id.values():
		if not (path_variant is Dictionary):
			continue
		var path_data: Dictionary = path_variant as Dictionary
		if bool(path_data.get("hasTarget", false)):
			target_count += 1
		arrow_estimate_count += _estimate_arrow_count(path_data)
	return {
		"pathCount": _unit_path_data_by_id.size(),
		"targetCount": target_count,
		"arrowEstimateCount": arrow_estimate_count,
	}


func _estimate_arrow_count(path_data: Dictionary) -> int:
	var points_variant: Variant = path_data.get("points", [])
	if not (points_variant is Array):
		return 0
	var points: Array = points_variant as Array
	var arrow_count: int = 0
	for index in range(points.size() - 1):
		var from_variant: Variant = points[index]
		var to_variant: Variant = points[index + 1]
		if not (from_variant is Vector2) or not (to_variant is Vector2):
			continue
		var from_point: Vector2 = from_variant as Vector2
		var to_point: Vector2 = to_variant as Vector2
		var distance: float = from_point.distance_to(to_point)
		if distance < 16.0:
			continue
		arrow_count += maxi(1, floori(distance / maxf(arrow_spacing, 12.0)))
	return arrow_count


func _resolve_color(path_data: Dictionary, key: String, fallback: Color) -> Color:
	var value: Variant = path_data.get(key, fallback)
	if value is Color:
		return value as Color
	if value is Dictionary:
		var color_dict: Dictionary = value as Dictionary
		if color_dict.has("r") and color_dict.has("g") and color_dict.has("b"):
			return Color(
				float(color_dict.get("r", fallback.r)),
				float(color_dict.get("g", fallback.g)),
				float(color_dict.get("b", fallback.b)),
				float(color_dict.get("a", fallback.a))
			)
	return fallback
