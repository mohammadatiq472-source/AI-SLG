extends RefCounted

const AI_LIVING_ACTIVITY_MARKER_FAMILY_CONTRACT: String = "ai_living_activity_marker_family_v1"
const LIVING_WORLD_MARKER_CLUSTER_TOKEN: String = "tianxia_yutu_living_world_marker_cluster_v1"
const AI_ACTIVITY_LABEL_PRIORITY_TOKEN: String = "tianxia_yutu_ai_activity_label_priority_v1"
const HOTSPOT_VISUAL_ASSET_CONTRACT: String = "tianxia_yutu_ai_hotspot_visual_asset_v1"
const HOTSPOT_VISUAL_ASSET_PATH: String = "res://assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_beacon_v1.png"
const HOTSPOT_VISUAL_ASSET_MANIFEST_PATH: String = "res://assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_manifest_v1.json"
const HOTSPOT_INFO_ASSET_CONTRACT: String = "tianxia_yutu_ai_hotspot_info_asset_v1"
const HOTSPOT_LABEL_PLATE_ASSET_PATH: String = "res://assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_label_plate_v1.png"
const HOTSPOT_CLUSTER_BADGE_ASSET_PATH: String = "res://assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_cluster_badge_v1.png"
const HOTSPOT_ROUTE_INTENT_ASSET_CONTRACT: String = "tianxia_yutu_ai_route_intent_asset_v1"
const HOTSPOT_ROUTE_ARROW_ASSET_PATH: String = "res://assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_route_arrow_v1.png"
const HOTSPOT_ROUTE_HEADING_CONTRACT: String = "tianxia_yutu_ai_route_heading_v1"
const HOTSPOT_ROUTE_STATE_VARIANT_CONTRACT: String = "tianxia_yutu_ai_route_state_variant_v1"
const HOTSPOT_ROUTE_ACTIVE_ARROW_ASSET_PATH: String = "res://assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_route_arrow_v1.png"
const HOTSPOT_ROUTE_QUEUED_ARROW_ASSET_PATH: String = "res://assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_route_arrow_queued_v1.png"


static func build_hotspot_summary(
	hotspot_count: int,
	draw_count: int,
	label_draw_count: int,
	max_cluster_count: int,
	first_label: String,
	uses_execution_trace: bool,
	fallback_used: bool,
	visual_asset_loaded: bool = false,
	visual_asset_draw_count: int = 0,
	info_asset_loaded: bool = false,
	label_plate_asset_draw_count: int = 0,
	cluster_badge_asset_draw_count: int = 0,
	route_intent_asset_loaded: bool = false,
	source_target_count: int = 0,
	route_line_draw_count: int = 0,
	route_arrow_asset_draw_count: int = 0,
	route_heading_applied_count: int = 0,
	first_heading_radians: float = 0.0,
	route_state_variant_asset_loaded: bool = false,
	active_variant_draw_count: int = 0,
	queued_variant_draw_count: int = 0,
	first_state_variant: String = "",
	first_trace_id: String = ""
) -> Dictionary:
	return {
		"tianxiaYutuAiActivityMarkerFamilyContract": AI_LIVING_ACTIVITY_MARKER_FAMILY_CONTRACT,
		"tianxiaYutuLivingWorldMarkerClusterToken": LIVING_WORLD_MARKER_CLUSTER_TOKEN,
		"tianxiaYutuAiActivityLabelPriorityToken": AI_ACTIVITY_LABEL_PRIORITY_TOKEN,
		"tianxiaYutuAiActivityHotspotVisualAssetContract": HOTSPOT_VISUAL_ASSET_CONTRACT,
		"tianxiaYutuAiActivityHotspotVisualAssetPath": HOTSPOT_VISUAL_ASSET_PATH,
		"tianxiaYutuAiActivityHotspotVisualAssetManifestPath": HOTSPOT_VISUAL_ASSET_MANIFEST_PATH,
		"tianxiaYutuAiActivityHotspotVisualAssetLoaded": visual_asset_loaded,
		"tianxiaYutuAiActivityHotspotVisualAssetDrawCount": visual_asset_draw_count,
		"tianxiaYutuAiActivityHotspotInfoAssetContract": HOTSPOT_INFO_ASSET_CONTRACT,
		"tianxiaYutuAiActivityHotspotLabelPlateAssetPath": HOTSPOT_LABEL_PLATE_ASSET_PATH,
		"tianxiaYutuAiActivityHotspotClusterBadgeAssetPath": HOTSPOT_CLUSTER_BADGE_ASSET_PATH,
		"tianxiaYutuAiActivityHotspotInfoAssetLoaded": info_asset_loaded,
		"tianxiaYutuAiActivityHotspotLabelPlateAssetDrawCount": label_plate_asset_draw_count,
		"tianxiaYutuAiActivityHotspotClusterBadgeAssetDrawCount": cluster_badge_asset_draw_count,
		"tianxiaYutuAiActivityRouteIntentAssetContract": HOTSPOT_ROUTE_INTENT_ASSET_CONTRACT,
		"tianxiaYutuAiActivityRouteArrowAssetPath": HOTSPOT_ROUTE_ARROW_ASSET_PATH,
		"tianxiaYutuAiActivityRouteIntentAssetLoaded": route_intent_asset_loaded,
		"tianxiaYutuAiActivityRouteIntentSourceTargetCount": source_target_count,
		"tianxiaYutuAiActivityRouteIntentLineDrawCount": route_line_draw_count,
		"tianxiaYutuAiActivityRouteIntentArrowAssetDrawCount": route_arrow_asset_draw_count,
		"tianxiaYutuAiActivityRouteHeadingContract": HOTSPOT_ROUTE_HEADING_CONTRACT,
		"tianxiaYutuAiActivityRouteHeadingAppliedCount": route_heading_applied_count,
		"tianxiaYutuAiActivityRouteFirstHeadingRadians": first_heading_radians,
		"tianxiaYutuAiActivityRouteStateVariantContract": HOTSPOT_ROUTE_STATE_VARIANT_CONTRACT,
		"tianxiaYutuAiActivityRouteActiveArrowAssetPath": HOTSPOT_ROUTE_ACTIVE_ARROW_ASSET_PATH,
		"tianxiaYutuAiActivityRouteQueuedArrowAssetPath": HOTSPOT_ROUTE_QUEUED_ARROW_ASSET_PATH,
		"tianxiaYutuAiActivityRouteStateVariantAssetLoaded": route_state_variant_asset_loaded,
		"tianxiaYutuAiActivityRouteActiveVariantDrawCount": active_variant_draw_count,
		"tianxiaYutuAiActivityRouteQueuedVariantDrawCount": queued_variant_draw_count,
		"tianxiaYutuAiActivityRouteFirstStateVariant": first_state_variant.strip_edges(),
		"tianxiaYutuAiActivityHotspotCount": hotspot_count,
		"tianxiaYutuAiActivityHotspotDrawCount": draw_count,
		"tianxiaYutuAiActivityHotspotLabelDrawCount": label_draw_count,
		"tianxiaYutuAiActivityHotspotMaxClusterCount": max_cluster_count,
		"tianxiaYutuAiActivityHotspotFirstLabel": first_label.strip_edges(),
		"tianxiaYutuAiActivityFirstTraceId": first_trace_id.strip_edges(),
		"tianxiaYutuAiActivityUsesExecutionTrace": uses_execution_trace,
		"tianxiaYutuAiActivityFallbackUsed": fallback_used,
	}


static func summary_ok(summary: Dictionary) -> bool:
	return (
		str(summary.get("tianxiaYutuLivingWorldMarkerClusterToken", "")).strip_edges() == LIVING_WORLD_MARKER_CLUSTER_TOKEN
		and str(summary.get("tianxiaYutuAiActivityMarkerFamilyContract", "")).strip_edges() == AI_LIVING_ACTIVITY_MARKER_FAMILY_CONTRACT
		and str(summary.get("tianxiaYutuAiActivityLabelPriorityToken", "")).strip_edges() == AI_ACTIVITY_LABEL_PRIORITY_TOKEN
		and int(summary.get("tianxiaYutuAiActivityHotspotCount", 0)) > 0
		and int(summary.get("tianxiaYutuAiActivityHotspotDrawCount", 0)) > 0
		and int(summary.get("tianxiaYutuAiActivityHotspotMaxClusterCount", 0)) > 0
		and str(summary.get("tianxiaYutuAiActivityFirstTraceId", "")).strip_edges() != ""
		and bool(summary.get("tianxiaYutuAiActivityUsesExecutionTrace", false))
		and not bool(summary.get("tianxiaYutuAiActivityFallbackUsed", true))
		and visual_asset_summary_ok(summary)
		and info_asset_summary_ok(summary)
		and route_intent_asset_summary_ok(summary)
		and route_heading_summary_ok(summary)
		and route_state_variant_summary_ok(summary)
	)


static func visual_asset_summary_ok(summary: Dictionary) -> bool:
	return (
		str(summary.get("tianxiaYutuAiActivityHotspotVisualAssetContract", "")).strip_edges() == HOTSPOT_VISUAL_ASSET_CONTRACT
		and str(summary.get("tianxiaYutuAiActivityHotspotVisualAssetPath", "")).strip_edges() == HOTSPOT_VISUAL_ASSET_PATH
		and bool(summary.get("tianxiaYutuAiActivityHotspotVisualAssetLoaded", false))
		and int(summary.get("tianxiaYutuAiActivityHotspotVisualAssetDrawCount", 0)) > 0
	)


static func info_asset_summary_ok(summary: Dictionary) -> bool:
	return (
		str(summary.get("tianxiaYutuAiActivityHotspotInfoAssetContract", "")).strip_edges() == HOTSPOT_INFO_ASSET_CONTRACT
		and str(summary.get("tianxiaYutuAiActivityHotspotLabelPlateAssetPath", "")).strip_edges() == HOTSPOT_LABEL_PLATE_ASSET_PATH
		and str(summary.get("tianxiaYutuAiActivityHotspotClusterBadgeAssetPath", "")).strip_edges() == HOTSPOT_CLUSTER_BADGE_ASSET_PATH
		and bool(summary.get("tianxiaYutuAiActivityHotspotInfoAssetLoaded", false))
		and int(summary.get("tianxiaYutuAiActivityHotspotLabelPlateAssetDrawCount", 0)) > 0
		and int(summary.get("tianxiaYutuAiActivityHotspotClusterBadgeAssetDrawCount", 0)) > 0
	)


static func route_intent_asset_summary_ok(summary: Dictionary) -> bool:
	return (
		str(summary.get("tianxiaYutuAiActivityRouteIntentAssetContract", "")).strip_edges() == HOTSPOT_ROUTE_INTENT_ASSET_CONTRACT
		and str(summary.get("tianxiaYutuAiActivityRouteArrowAssetPath", "")).strip_edges() == HOTSPOT_ROUTE_ARROW_ASSET_PATH
		and bool(summary.get("tianxiaYutuAiActivityRouteIntentAssetLoaded", false))
		and int(summary.get("tianxiaYutuAiActivityRouteIntentSourceTargetCount", 0)) > 0
		and int(summary.get("tianxiaYutuAiActivityRouteIntentLineDrawCount", 0)) > 0
		and int(summary.get("tianxiaYutuAiActivityRouteIntentArrowAssetDrawCount", 0)) > 0
	)


static func route_heading_summary_ok(summary: Dictionary) -> bool:
	return (
		str(summary.get("tianxiaYutuAiActivityRouteHeadingContract", "")).strip_edges() == HOTSPOT_ROUTE_HEADING_CONTRACT
		and int(summary.get("tianxiaYutuAiActivityRouteHeadingAppliedCount", 0)) > 0
	)


static func route_state_variant_summary_ok(summary: Dictionary) -> bool:
	return (
		str(summary.get("tianxiaYutuAiActivityRouteStateVariantContract", "")).strip_edges() == HOTSPOT_ROUTE_STATE_VARIANT_CONTRACT
		and str(summary.get("tianxiaYutuAiActivityRouteActiveArrowAssetPath", "")).strip_edges() == HOTSPOT_ROUTE_ACTIVE_ARROW_ASSET_PATH
		and str(summary.get("tianxiaYutuAiActivityRouteQueuedArrowAssetPath", "")).strip_edges() == HOTSPOT_ROUTE_QUEUED_ARROW_ASSET_PATH
		and bool(summary.get("tianxiaYutuAiActivityRouteStateVariantAssetLoaded", false))
		and int(summary.get("tianxiaYutuAiActivityRouteActiveVariantDrawCount", 0)) > 0
		and int(summary.get("tianxiaYutuAiActivityRouteQueuedVariantDrawCount", 0)) > 0
	)
