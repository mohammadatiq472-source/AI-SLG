extends RefCounted

const POLICY_ID: String = "tianxia_yutu_panel_state_policy_v1"


static func build_layout_state(args: Dictionary) -> Dictionary:
	var mobile := bool(args.get("mobile", false))
	var expanded := bool(args.get("expanded", false))
	var target_detail := bool(args.get("target_detail", false))
	var collapsed := bool(args.get("collapsed", false))
	var active_target_detail := target_detail and not collapsed
	var compact_mode := mobile and not expanded and not collapsed
	var drilldown_mode := mobile and expanded and not collapsed and not active_target_detail
	var desktop_full_mode := not mobile and not collapsed
	var mobile_detail_mode := drilldown_mode
	var mode := "full"
	if collapsed:
		mode = "collapsed"
	elif active_target_detail:
		mode = "target_compact"
	elif drilldown_mode:
		mode = "drilldown"
	elif compact_mode:
		mode = "compact"
	return {
		"panelStatePolicyId": POLICY_ID,
		"panelStateHelperActive": true,
		"panelLayoutMode": mode,
		"mobileViewport": mobile,
		"navigationPanelExpanded": expanded,
		"navigationPanelCollapsed": collapsed,
		"targetDetailMode": active_target_detail,
		"targetCompactPanelActive": active_target_detail,
		"compactMode": compact_mode,
		"drilldownMode": drilldown_mode,
		"desktopFullMode": desktop_full_mode,
		"mobileDetailMode": mobile_detail_mode,
		"searchVisible": false,
		"selectorVisible": false,
		"drilldownVisible": (desktop_full_mode or mobile_detail_mode) and not active_target_detail,
		"compactDrilldownVisible": compact_mode and not active_target_detail,
		"coordinateVisible": desktop_full_mode or mobile_detail_mode or active_target_detail,
		"resetViewVisible": (desktop_full_mode or mobile_detail_mode) and not active_target_detail,
		"mobileCloseVisible": drilldown_mode or desktop_full_mode,
	}
