extends RefCounted

const POLICY_ID: String = "tianxia_yutu_marker_visual_policy_v1"
const LABEL_BUDGET_POLICY_ID: String = "tianxia_yutu_label_budget_policy_v1"
const MARKER_LABEL_POLISH_SPEC_TOKEN: String = "tianxia_yutu_marker_label_polish_v2"


static func normal_dense_region_focus_active(
	compact_target_active: bool,
	selected_state_id: String,
	selected_region_id: String,
	density_level: String
) -> bool:
	return (
		not compact_target_active
		and selected_state_id.strip_edges() != ""
		and selected_region_id.strip_edges() != ""
		and density_level.strip_edges() == "near"
	)


static func gate_label_limit_for_context(
	compact_target_active: bool,
	selected_state_id: String,
	selected_region_id: String,
	density_level: String
) -> int:
	if compact_target_active:
		return 2
	if normal_dense_region_focus_active(compact_target_active, selected_state_id, selected_region_id, density_level):
		return 1
	return 8 if density_level.strip_edges() == "near" else 5


static func city_label_limit_for_context(
	compact_target_active: bool,
	normal_dense_region_focus: bool,
	selected_region_id: String,
	density_level: String
) -> int:
	if compact_target_active:
		return 1
	if normal_dense_region_focus:
		return 1
	if selected_region_id.strip_edges() != "" and density_level.strip_edges() == "near":
		return 10
	return 0


static func classify_marker(
	scope: String,
	visual_tier: String,
	compact_focus: bool,
	compact_dim: bool,
	context_gate_focus: bool,
	context_gate_dim: bool,
	active_gate: bool,
	initial_low_emphasis_marker: bool = false,
	initial_gate_micro_marker: bool = false,
	initial_ordinary_city_micro_marker: bool = false
) -> Dictionary:
	var low_emphasis_marker := initial_low_emphasis_marker
	var gate_micro_marker := initial_gate_micro_marker
	var ordinary_city_micro_marker := initial_ordinary_city_micro_marker
	var color := Color8(255, 196, 96, 245)
	var marker_radius := 5.0
	var outline_alpha := 0.70
	var gate_backdrop_radius := 0.0
	var gate_diamond_padding := 0.0

	if scope == "gate":
		color = Color8(92, 224, 255, 252)
		marker_radius = 8.0
		if compact_focus:
			color = Color8(152, 246, 255, 255)
			marker_radius = 10.0
		elif compact_dim:
			color = Color8(62, 154, 174, 118)
			marker_radius = 4.8
		elif context_gate_focus:
			color = Color8(118, 238, 255, 255)
			marker_radius = 9.0
		elif context_gate_dim and not active_gate:
			color = Color8(54, 142, 164, 108)
			marker_radius = 3.0
			low_emphasis_marker = true
			gate_micro_marker = true
		gate_backdrop_radius = marker_radius + (4.0 if context_gate_dim else 7.0)
		gate_diamond_padding = 2.3 if context_gate_dim else 4.0
	elif scope == "city":
		if compact_focus:
			color = Color8(255, 224, 142, 255)
			marker_radius = 5.8
		elif compact_dim:
			color = Color8(176, 154, 102, 104)
			marker_radius = 2.4
		elif visual_tier == "ordinary_micro":
			color = Color8(178, 156, 106, 98)
			marker_radius = 2.1
			low_emphasis_marker = true
			ordinary_city_micro_marker = true
		elif visual_tier == "ordinary":
			color = Color8(214, 188, 126, 168)
			marker_radius = 3.1
		else:
			color = Color8(232, 205, 142, 220)
			marker_radius = 4.4
	elif scope == "state_government":
		color = Color8(190, 174, 98, 132) if compact_dim else Color8(255, 235, 132, 255)
		marker_radius = 4.2 if compact_dim else 7.0
	elif scope == "commandery_seat":
		color = Color8(158, 142, 92, 112) if compact_dim else Color8(232, 205, 142, 220)
		marker_radius = 3.4 if compact_dim else 4.4

	if visual_tier == "ordinary":
		outline_alpha = 0.42
	elif visual_tier == "ordinary_micro":
		outline_alpha = 0.24
	if compact_dim:
		outline_alpha = 0.20

	return {
		"policy_id": POLICY_ID,
		"color": color,
		"marker_radius": marker_radius,
		"outline_alpha": outline_alpha,
		"gate_backdrop_radius": gate_backdrop_radius,
		"gate_diamond_padding": gate_diamond_padding,
		"low_emphasis_marker": low_emphasis_marker,
		"gate_micro_marker": gate_micro_marker,
		"ordinary_city_micro_marker": ordinary_city_micro_marker,
	}
