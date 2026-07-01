extends RefCounted

const TianxiaYutuCompactTargetCardScript = preload("res://scripts/ui/tianxia_yutu_compact_target_card.gd")
const TianxiaYutuLivingWorldHotspotPolicyScript = preload("res://scripts/map/tianxia_yutu_living_world_hotspot_policy.gd")
const POLICY_ID: String = "tianxia_yutu_product_acceptance_contract_v1"
const LABEL_PRIORITY_PRODUCT_ACCEPTANCE_TOKEN: String = "tianxia_yutu_label_priority_product_acceptance_v1"


static func setup_failed(setup: Dictionary) -> Dictionary:
	return {
		"attempted": true,
		"ok": false,
		"reason": "tianxia_yutu_product_acceptance_setup_failed",
		"setup": setup,
		"productAcceptanceContractId": POLICY_ID,
	}


static func build_result(args: Dictionary) -> Dictionary:
	var setup: Dictionary = args.get("setup", {}) as Dictionary if args.get("setup", {}) is Dictionary else {}
	var open_summary: Dictionary = args.get("openSummary", {}) as Dictionary if args.get("openSummary", {}) is Dictionary else {}
	var zoom_pan_summary: Dictionary = args.get("zoomPanSummary", {}) as Dictionary if args.get("zoomPanSummary", {}) is Dictionary else {}
	var drilldown_result: Dictionary = args.get("drilldownResult", {}) as Dictionary if args.get("drilldownResult", {}) is Dictionary else {}
	var drilldown_summary: Dictionary = args.get("drilldownSummary", {}) as Dictionary if args.get("drilldownSummary", {}) is Dictionary else {}
	var hover_gate_result: Dictionary = args.get("hoverGateResult", {}) as Dictionary if args.get("hoverGateResult", {}) is Dictionary else {}
	var hover_map_summary: Dictionary = args.get("hoverMapSummary", {}) as Dictionary if args.get("hoverMapSummary", {}) is Dictionary else {}
	var gate_result: Dictionary = args.get("gateResult", {}) as Dictionary if args.get("gateResult", {}) is Dictionary else {}
	var compact_summary: Dictionary = args.get("compactSummary", {}) as Dictionary if args.get("compactSummary", {}) is Dictionary else {}
	var jump_result: Dictionary = args.get("jumpResult", {}) as Dictionary if args.get("jumpResult", {}) is Dictionary else {}
	var gameplay_wait: Dictionary = args.get("gameplayWait", {}) as Dictionary if args.get("gameplayWait", {}) is Dictionary else {}
	var target: Dictionary = args.get("target", {}) as Dictionary if args.get("target", {}) is Dictionary else {}
	var target_cell: Dictionary = target.get("cell_1km", {}) as Dictionary if target.get("cell_1km", {}) is Dictionary else {}
	var selected_cell: Dictionary = jump_result.get("selectedCell", {}) as Dictionary if jump_result.get("selectedCell", {}) is Dictionary else {}
	var zoom_pan_ok := _zoom_pan_ok(zoom_pan_summary)
	var selected_cell_ok := _selected_cell_ok(target_cell, selected_cell)
	var hover_ok := bool(hover_gate_result.get("ok", false)) and int(hover_map_summary.get("tianxiaYutuGateHoverLabelForceCount", 0)) >= 1
	var compact_ok := _compact_gate_summary_ok(compact_summary)
	var living_world_hotspot_ok := _living_world_hotspot_ok(compact_summary)
	var label_priority_product_acceptance_ok := _label_priority_product_acceptance_ok(compact_summary)
	var tianxia_isolation_ok := (
		_tianxia_controls_hidden(open_summary)
		and _tianxia_controls_hidden(zoom_pan_summary)
		and _tianxia_controls_hidden(drilldown_summary)
		and _tianxia_controls_hidden(compact_summary)
	)
	var ok := (
		bool(setup.get("ok", false))
		and bool(open_summary.get("panelVisible", false))
		and zoom_pan_ok
		and bool(drilldown_result.get("ok", false))
		and bool(drilldown_summary.get("drilldownRowVisible", false))
		and hover_ok
		and bool(gate_result.get("ok", false))
		and compact_ok
		and living_world_hotspot_ok
		and label_priority_product_acceptance_ok
		and bool(jump_result.get("ok", false))
		and bool(gameplay_wait.get("ok", false))
		and selected_cell_ok
		and tianxia_isolation_ok
	)
	var result := args.duplicate(true)
	result.erase("target")
	result["attempted"] = true
	result["ok"] = ok
	result["reason"] = "tianxia_yutu_product_acceptance_qa" if ok else "tianxia_yutu_product_acceptance_qa_failed"
	result["productAcceptanceContractId"] = POLICY_ID
	result["zoomPanOk"] = zoom_pan_ok
	result["targetCell"] = target_cell
	result["selectedCellOk"] = selected_cell_ok
	result["hoverOk"] = hover_ok
	result["compactOk"] = compact_ok
	result["livingWorldHotspotOk"] = living_world_hotspot_ok
	result["productAcceptanceLabelPriorityOk"] = label_priority_product_acceptance_ok
	result["tianxiaIsolationOk"] = tianxia_isolation_ok
	result["productAcceptanceMarkerLabelPolishSpecToken"] = str(compact_summary.get("tianxiaYutuMarkerLabelPolishSpecToken", "")).strip_edges()
	result["productAcceptanceLabelPriorityContractToken"] = LABEL_PRIORITY_PRODUCT_ACCEPTANCE_TOKEN
	result["productAcceptanceLivingWorldMarkerClusterToken"] = str(compact_summary.get("tianxiaYutuLivingWorldMarkerClusterToken", "")).strip_edges()
	result["productAcceptanceAiActivityMarkerFamilyContract"] = str(compact_summary.get("tianxiaYutuAiActivityMarkerFamilyContract", "")).strip_edges()
	result["productAcceptanceAiActivityLabelPriorityToken"] = str(compact_summary.get("tianxiaYutuAiActivityLabelPriorityToken", "")).strip_edges()
	result["productAcceptanceAiActivityFirstTraceId"] = str(compact_summary.get("tianxiaYutuAiActivityFirstTraceId", "")).strip_edges()
	result["productAcceptanceAiActivityHotspotVisualAssetContract"] = str(compact_summary.get("tianxiaYutuAiActivityHotspotVisualAssetContract", "")).strip_edges()
	result["productAcceptanceAiActivityHotspotVisualAssetPath"] = str(compact_summary.get("tianxiaYutuAiActivityHotspotVisualAssetPath", "")).strip_edges()
	result["productAcceptanceAiActivityHotspotVisualAssetLoaded"] = bool(compact_summary.get("tianxiaYutuAiActivityHotspotVisualAssetLoaded", false))
	result["productAcceptanceAiActivityHotspotVisualAssetDrawCount"] = int(compact_summary.get("tianxiaYutuAiActivityHotspotVisualAssetDrawCount", 0))
	result["productAcceptanceAiActivityHotspotInfoAssetContract"] = str(compact_summary.get("tianxiaYutuAiActivityHotspotInfoAssetContract", "")).strip_edges()
	result["productAcceptanceAiActivityHotspotLabelPlateAssetPath"] = str(compact_summary.get("tianxiaYutuAiActivityHotspotLabelPlateAssetPath", "")).strip_edges()
	result["productAcceptanceAiActivityHotspotClusterBadgeAssetPath"] = str(compact_summary.get("tianxiaYutuAiActivityHotspotClusterBadgeAssetPath", "")).strip_edges()
	result["productAcceptanceAiActivityHotspotInfoAssetLoaded"] = bool(compact_summary.get("tianxiaYutuAiActivityHotspotInfoAssetLoaded", false))
	result["productAcceptanceAiActivityHotspotLabelPlateAssetDrawCount"] = int(compact_summary.get("tianxiaYutuAiActivityHotspotLabelPlateAssetDrawCount", 0))
	result["productAcceptanceAiActivityHotspotClusterBadgeAssetDrawCount"] = int(compact_summary.get("tianxiaYutuAiActivityHotspotClusterBadgeAssetDrawCount", 0))
	result["productAcceptanceAiActivityRouteIntentAssetContract"] = str(compact_summary.get("tianxiaYutuAiActivityRouteIntentAssetContract", "")).strip_edges()
	result["productAcceptanceAiActivityRouteArrowAssetPath"] = str(compact_summary.get("tianxiaYutuAiActivityRouteArrowAssetPath", "")).strip_edges()
	result["productAcceptanceAiActivityRouteIntentAssetLoaded"] = bool(compact_summary.get("tianxiaYutuAiActivityRouteIntentAssetLoaded", false))
	result["productAcceptanceAiActivityRouteIntentSourceTargetCount"] = int(compact_summary.get("tianxiaYutuAiActivityRouteIntentSourceTargetCount", 0))
	result["productAcceptanceAiActivityRouteIntentLineDrawCount"] = int(compact_summary.get("tianxiaYutuAiActivityRouteIntentLineDrawCount", 0))
	result["productAcceptanceAiActivityRouteIntentArrowAssetDrawCount"] = int(compact_summary.get("tianxiaYutuAiActivityRouteIntentArrowAssetDrawCount", 0))
	result["productAcceptanceAiActivityRouteHeadingContract"] = str(compact_summary.get("tianxiaYutuAiActivityRouteHeadingContract", "")).strip_edges()
	result["productAcceptanceAiActivityRouteHeadingAppliedCount"] = int(compact_summary.get("tianxiaYutuAiActivityRouteHeadingAppliedCount", 0))
	result["productAcceptanceAiActivityRouteFirstHeadingRadians"] = float(compact_summary.get("tianxiaYutuAiActivityRouteFirstHeadingRadians", 0.0))
	result["productAcceptanceAiActivityRouteStateVariantContract"] = str(compact_summary.get("tianxiaYutuAiActivityRouteStateVariantContract", "")).strip_edges()
	result["productAcceptanceAiActivityRouteActiveArrowAssetPath"] = str(compact_summary.get("tianxiaYutuAiActivityRouteActiveArrowAssetPath", "")).strip_edges()
	result["productAcceptanceAiActivityRouteQueuedArrowAssetPath"] = str(compact_summary.get("tianxiaYutuAiActivityRouteQueuedArrowAssetPath", "")).strip_edges()
	result["productAcceptanceAiActivityRouteStateVariantAssetLoaded"] = bool(compact_summary.get("tianxiaYutuAiActivityRouteStateVariantAssetLoaded", false))
	result["productAcceptanceAiActivityRouteActiveVariantDrawCount"] = int(compact_summary.get("tianxiaYutuAiActivityRouteActiveVariantDrawCount", 0))
	result["productAcceptanceAiActivityRouteQueuedVariantDrawCount"] = int(compact_summary.get("tianxiaYutuAiActivityRouteQueuedVariantDrawCount", 0))
	result["productAcceptanceAiActivityRouteFirstStateVariant"] = str(compact_summary.get("tianxiaYutuAiActivityRouteFirstStateVariant", "")).strip_edges()
	result["productAcceptanceAiActivityHotspotCount"] = int(compact_summary.get("tianxiaYutuAiActivityHotspotCount", 0))
	result["productAcceptanceAiActivityHotspotDrawCount"] = int(compact_summary.get("tianxiaYutuAiActivityHotspotDrawCount", 0))
	result["productAcceptanceAiActivityHotspotLabelDrawCount"] = int(compact_summary.get("tianxiaYutuAiActivityHotspotLabelDrawCount", 0))
	result["productAcceptanceAiActivityHotspotMaxClusterCount"] = int(compact_summary.get("tianxiaYutuAiActivityHotspotMaxClusterCount", 0))
	result["productAcceptanceAiActivityHotspotFirstLabel"] = str(compact_summary.get("tianxiaYutuAiActivityHotspotFirstLabel", "")).strip_edges()
	result["productAcceptanceAiActivityUsesExecutionTrace"] = bool(compact_summary.get("tianxiaYutuAiActivityUsesExecutionTrace", false))
	result["productAcceptanceAiActivityFallbackUsed"] = bool(compact_summary.get("tianxiaYutuAiActivityFallbackUsed", true))
	result["productAcceptanceLabelPriorityDrawCounts"] = (compact_summary.get("tianxiaYutuLabelPriorityDrawCounts", {}) as Dictionary).duplicate(true) if compact_summary.get("tianxiaYutuLabelPriorityDrawCounts", {}) is Dictionary else {}
	result["productAcceptanceLabelPrioritySkipCounts"] = (compact_summary.get("tianxiaYutuLabelPrioritySkipCounts", {}) as Dictionary).duplicate(true) if compact_summary.get("tianxiaYutuLabelPrioritySkipCounts", {}) is Dictionary else {}
	result["productAcceptanceLabelPriorityDrawOrder"] = (compact_summary.get("tianxiaYutuLabelPriorityDrawOrder", []) as Array).duplicate(true) if compact_summary.get("tianxiaYutuLabelPriorityDrawOrder", []) is Array else []
	result["productAcceptanceCityLabelBudgetSkipCount"] = int(compact_summary.get("tianxiaYutuCityLabelBudgetSkipCount", 0))
	result["productAcceptanceGateLabelBudgetSkipCount"] = int(compact_summary.get("tianxiaYutuGateLabelBudgetSkipCount", 0))
	result["productAcceptanceMarkerLabelDrawCounts"] = (compact_summary.get("tianxiaYutuMarkerLabelDrawCounts", {}) as Dictionary).duplicate(true) if compact_summary.get("tianxiaYutuMarkerLabelDrawCounts", {}) is Dictionary else {}
	result["productAcceptanceLabelDensityReliefCount"] = int(compact_summary.get("tianxiaYutuLabelDensityReliefCount", 0))
	return result


static func _zoom_pan_ok(summary: Dictionary) -> bool:
	var view_state: Dictionary = summary.get("tianxiaYutuViewState", {}) as Dictionary if summary.get("tianxiaYutuViewState", {}) is Dictionary else {}
	var pan_offset: Dictionary = view_state.get("panOffset", {}) as Dictionary if view_state.get("panOffset", {}) is Dictionary else {}
	return (
		float(summary.get("tianxiaYutuZoom", 0.0)) > 1.05
		and (absf(float(pan_offset.get("x", 0.0))) > 0.1 or absf(float(pan_offset.get("y", 0.0))) > 0.1)
	)


static func _selected_cell_ok(target_cell: Dictionary, selected_cell: Dictionary) -> bool:
	return (
		not target_cell.is_empty()
		and int(selected_cell.get("cellX", -1)) == int(target_cell.get("x", -2))
		and int(selected_cell.get("cellY", -1)) == int(target_cell.get("y", -2))
	)


static func _compact_gate_summary_ok(summary: Dictionary) -> bool:
	return (
		TianxiaYutuCompactTargetCardScript.summary_ok(summary, "gate")
		and bool(summary.get("gateDetailPanelActive", false))
		and str(summary.get("targetCompactTargetText", "")).find("关口") >= 0
	)


static func _living_world_hotspot_ok(compact_summary: Dictionary) -> bool:
	return (
		TianxiaYutuLivingWorldHotspotPolicyScript.summary_ok(compact_summary)
		and TianxiaYutuLivingWorldHotspotPolicyScript.visual_asset_summary_ok(compact_summary)
		and TianxiaYutuLivingWorldHotspotPolicyScript.info_asset_summary_ok(compact_summary)
		and TianxiaYutuLivingWorldHotspotPolicyScript.route_intent_asset_summary_ok(compact_summary)
		and TianxiaYutuLivingWorldHotspotPolicyScript.route_heading_summary_ok(compact_summary)
		and TianxiaYutuLivingWorldHotspotPolicyScript.route_state_variant_summary_ok(compact_summary)
	)


static func _label_priority_product_acceptance_ok(compact_summary: Dictionary) -> bool:
	var draw_counts: Dictionary = compact_summary.get("tianxiaYutuLabelPriorityDrawCounts", {}) as Dictionary if compact_summary.get("tianxiaYutuLabelPriorityDrawCounts", {}) is Dictionary else {}
	var skip_counts: Dictionary = compact_summary.get("tianxiaYutuLabelPrioritySkipCounts", {}) as Dictionary if compact_summary.get("tianxiaYutuLabelPrioritySkipCounts", {}) is Dictionary else {}
	var draw_order: Array = compact_summary.get("tianxiaYutuLabelPriorityDrawOrder", []) as Array if compact_summary.get("tianxiaYutuLabelPriorityDrawOrder", []) is Array else []
	var marker_label_counts: Dictionary = compact_summary.get("tianxiaYutuMarkerLabelDrawCounts", {}) as Dictionary if compact_summary.get("tianxiaYutuMarkerLabelDrawCounts", {}) is Dictionary else {}
	var label_density_relief_count: int = int(compact_summary.get("tianxiaYutuLabelDensityReliefCount", 0))
	return (
		draw_order.size() >= 4
		and _label_priority_draw_order_rank_ok(draw_order)
		and int(draw_counts.get("selected_region", 0)) >= 1
		and int(draw_counts.get("gate", 0)) >= 1
		and int(draw_counts.get("city", 0)) >= 1
		and int(marker_label_counts.get("gate", 0)) >= 1
		and int(marker_label_counts.get("city", 0)) >= 1
		and int(skip_counts.get("gate", 0)) + int(compact_summary.get("tianxiaYutuGateLabelBudgetSkipCount", 0)) >= 1
		and int(skip_counts.get("city", 0)) + int(compact_summary.get("tianxiaYutuCityLabelBudgetSkipCount", 0)) >= 1
		and label_density_relief_count >= 1
	)


static func _label_priority_draw_order_rank_ok(draw_order: Array) -> bool:
	var expected_order := ["state", "selected_region", "gate", "state_government", "commandery_seat", "city", "focus"]
	var last_rank := -1
	for priority_variant in draw_order:
		var priority := str(priority_variant)
		var priority_rank: int = expected_order.find(priority)
		if priority_rank < 0:
			continue
		if priority_rank < last_rank:
			return false
		last_rank = priority_rank
	return true


static func _tianxia_controls_hidden(summary: Dictionary) -> bool:
	var visible_controls: Array = summary.get("visibleMainWorldTextControls", []) as Array if summary.get("visibleMainWorldTextControls", []) is Array else []
	return visible_controls.is_empty() and not bool(summary.get("mainMapCellActionPanelVisible", true))
