extends RefCounted

const POLICY_ID: String = "tianxia_yutu_navigation_matrix_contract_v1"
const PANEL_STATE_POLICY_ID: String = "tianxia_yutu_panel_state_policy_v1"
const MAX_PANEL_MAP_COVERAGE_RATIO: float = 0.28


static func row_ok(summary: Dictionary, expected_mode: String, expected_panel_visible: bool, expected_jump_visible: bool) -> bool:
	var mode := expected_mode.strip_edges()
	var visible_controls: Array = summary.get("visibleMainWorldTextControls", []) as Array if summary.get("visibleMainWorldTextControls", []) is Array else []
	return (
		str(summary.get("panelLayoutMode", "")).strip_edges() == mode
		and bool(summary.get("panelVisible", false)) == expected_panel_visible
		and bool(summary.get("jumpButtonVisible", false)) == expected_jump_visible
		and not bool(summary.get("searchVisible", true))
		and not bool(summary.get("selectorVisible", true))
		and visible_controls.is_empty()
		and str(summary.get("panelStatePolicyId", "")).strip_edges() == PANEL_STATE_POLICY_ID
		and bool(summary.get("panelStateHelperActive", false))
		and float(summary.get("panelMapCoverageRatio", 1.0)) <= MAX_PANEL_MAP_COVERAGE_RATIO
	)


static func build_row(row_id: String, summary: Dictionary, screenshot: Dictionary, expected_mode: String, expected_panel_visible: bool, expected_jump_visible: bool) -> Dictionary:
	var ok := row_ok(summary, expected_mode, expected_panel_visible, expected_jump_visible)
	return {
		"rowId": row_id,
		"ok": ok,
		"navigationMatrixContractId": POLICY_ID,
		"expectedPanelLayoutMode": expected_mode,
		"summary": summary,
		"screenshot": screenshot,
		"reportedFields": {
			"panelLayoutMode": summary.get("panelLayoutMode", ""),
			"panelMapCoverageRatio": summary.get("panelMapCoverageRatio", 0.0),
			"searchVisible": summary.get("searchVisible", null),
			"selectorVisible": summary.get("selectorVisible", null),
			"drilldownRowVisible": summary.get("drilldownRowVisible", null),
			"compactDrilldownVisible": summary.get("compactDrilldownVisible", null),
			"jumpButtonVisible": summary.get("jumpButtonVisible", null),
			"visibleMainWorldTextControls": summary.get("visibleMainWorldTextControls", []),
		},
	}
