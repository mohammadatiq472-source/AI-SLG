extends RefCounted

const POLICY_ID: String = "tianxia_yutu_compact_target_card_v1"
const MAX_COMPACT_PANEL_MAP_COVERAGE_RATIO: float = 0.24


static func build_card(target: Dictionary, coordinate: Dictionary, context_line: String, jump_label: String) -> PanelContainer:
	var card := PanelContainer.new()
	card.name = "TianxiaYutuCompactTargetCard"
	card.set_meta("compact_target_card_policy_id", POLICY_ID)
	card.set_meta("compact_target_card_helper_active", true)
	var margin := MarginContainer.new()
	margin.name = "CompactTargetCardMargin"
	card.add_child(margin)
	var column := VBoxContainer.new()
	column.name = "CompactTargetCardColumn"
	margin.add_child(column)
	var title := Label.new()
	title.name = "JumpTargetLabel"
	column.add_child(title)
	var coordinate_label := Label.new()
	coordinate_label.name = "CoordinateLabel"
	column.add_child(coordinate_label)
	var context_label := Label.new()
	context_label.name = "HoverSummaryLabel"
	context_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(context_label)
	var jump_button := Button.new()
	jump_button.name = "JumpButton"
	column.add_child(jump_button)
	apply_existing_card_nodes({
		"target": target,
		"coordinate": coordinate,
		"context_line": context_line,
		"jump_label": jump_label,
		"title_label_node": title,
		"coordinate_label_node": coordinate_label,
		"context_label_node": context_label,
		"jump_button_node": jump_button,
		"compact_target": true,
	})
	return card


static func apply_existing_card_nodes(args: Dictionary) -> Dictionary:
	var target: Dictionary = args.get("target", {}) as Dictionary if args.get("target", {}) is Dictionary else {}
	var coordinate: Dictionary = args.get("coordinate", {}) as Dictionary if args.get("coordinate", {}) is Dictionary else {}
	var fallback_label := str(args.get("fallback_label", target.get("label", ""))).strip_edges()
	var navigation_label := str(target.get("navigation_label", fallback_label)).strip_edges()
	var scope_label := str(args.get("scope_label", "")).strip_edges()
	var title_text := str(args.get("title_text", "")).strip_edges()
	if title_text == "":
		var target_name := navigation_label if navigation_label != "" else fallback_label
		title_text = "%s%s" % [target_name, " · %s" % scope_label if scope_label != "" else ""]
	var coordinate_text := str(args.get("coordinate_text", "")).strip_edges()
	if coordinate_text == "":
		coordinate_text = "(%d,%d)" % [int(coordinate.get("x", 0)), int(coordinate.get("y", 0))]
	var context_text := str(args.get("context_line", "")).strip_edges()
	var jump_label := str(args.get("jump_label", "Jump")).strip_edges()
	var compact_target := bool(args.get("compact_target", false))
	var title_label_node = args.get("title_label_node", null)
	var coordinate_label_node = args.get("coordinate_label_node", null)
	var context_label_node = args.get("context_label_node", null)
	var jump_button_node = args.get("jump_button_node", null)
	if title_label_node != null:
		title_label_node.text = title_text
		_apply_card_meta(title_label_node, title_text, coordinate_text, context_text)
	if coordinate_label_node != null:
		coordinate_label_node.text = coordinate_text
		_apply_card_meta(coordinate_label_node, title_text, coordinate_text, context_text)
	if context_label_node != null:
		context_label_node.text = context_text
		_apply_card_meta(context_label_node, title_text, coordinate_text, context_text)
	if jump_button_node != null:
		jump_button_node.text = jump_label
		jump_button_node.custom_minimum_size = Vector2(124, 38) if compact_target else Vector2(86, 38)
		jump_button_node.tooltip_text = str(args.get("jump_tooltip", "")).strip_edges()
		_apply_card_meta(jump_button_node, title_text, coordinate_text, context_text)
	return {
		"policy_id": POLICY_ID,
		"helper_active": true,
		"title_text": title_text,
		"coordinate_text": coordinate_text,
		"context_text": context_text,
		"jump_label": jump_label,
		"compact_target": compact_target,
	}


static func _apply_card_meta(node: Object, title_text: String, coordinate_text: String, context_text: String) -> void:
	node.set_meta("compact_target_card_policy_id", POLICY_ID)
	node.set_meta("compact_target_card_helper_active", true)
	node.set_meta("compact_target_card_title_text", title_text)
	node.set_meta("compact_target_card_coordinate_text", coordinate_text)
	node.set_meta("compact_target_card_context_text", context_text)


static func summary_ok(summary: Dictionary, expected_scope: String = "") -> bool:
	var expected: String = expected_scope.strip_edges()
	var scope_ok: bool = expected == "" or str(summary.get("targetCompactPanelScope", "")).strip_edges() == expected
	return (
		bool(summary.get("panelVisible", false))
		and bool(summary.get("targetCompactPanelActive", false))
		and str(summary.get("compactTargetCardPolicyId", "")).strip_edges() == POLICY_ID
		and bool(summary.get("compactTargetCardHelperActive", false))
		and scope_ok
		and bool(summary.get("jumpButtonVisible", false))
		and str(summary.get("jumpButtonText", "")).strip_edges() == "跳转主世界"
		and str(summary.get("coordinateLabelText", "")).strip_edges().begins_with("(")
		and str(summary.get("targetCompactTargetText", "")).strip_edges() != ""
		and str(summary.get("targetCompactDetailText", "")).strip_edges() != ""
		and not bool(summary.get("searchVisible", true))
		and not bool(summary.get("selectorVisible", true))
		and not bool(summary.get("drilldownRowVisible", true))
		and not bool(summary.get("compactDrilldownVisible", true))
		and float(summary.get("panelMapCoverageRatio", 1.0)) <= MAX_COMPACT_PANEL_MAP_COVERAGE_RATIO
	)
