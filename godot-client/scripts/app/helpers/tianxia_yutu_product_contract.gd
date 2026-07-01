extends RefCounted

const PRODUCT_SURFACE_CONTRACT: String = "tianxia_yutu_product_surface_v1"
const READABILITY_CONTRACT: String = "admin_focus_marker_budget_hover_detail_v1"
const INTERACTION_CONTRACT: String = "pan_zoom_drilldown_target_jump_v1"


static func build_debug_summary_fields() -> Dictionary:
	return {
		"tianxiaYutuProductSurfaceContract": PRODUCT_SURFACE_CONTRACT,
		"tianxiaYutuReadabilityContract": READABILITY_CONTRACT,
		"tianxiaYutuInteractionContract": INTERACTION_CONTRACT,
	}


static func summary_matches(summary: Dictionary) -> bool:
	return (
		str(summary.get("productSurfaceContract", summary.get("tianxiaYutuProductSurfaceContract", ""))).strip_edges() == PRODUCT_SURFACE_CONTRACT
		and str(summary.get("readabilityContract", summary.get("tianxiaYutuReadabilityContract", ""))).strip_edges() == READABILITY_CONTRACT
		and str(summary.get("interactionContract", summary.get("tianxiaYutuInteractionContract", ""))).strip_edges() == INTERACTION_CONTRACT
	)
