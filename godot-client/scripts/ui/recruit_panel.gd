extends "res://scripts/ui/slg_snapshot_panel.gd"
class_name RecruitPanel

const BG_ROOT := Color(0.045, 0.041, 0.034, 0.98)
const BG_PANEL := Color(0.075, 0.066, 0.052, 0.92)
const BG_PANEL_ALT := Color(0.105, 0.088, 0.060, 0.88)
const BG_CARD := Color(0.038, 0.036, 0.031, 0.86)
const BG_CARD_ACTIVE := Color(0.16, 0.115, 0.060, 0.92)
const BORDER := Color(0.44, 0.34, 0.17, 0.56)
const BORDER_ACTIVE := Color(0.92, 0.68, 0.25, 0.92)
const TEXT_MAIN := Color(0.94, 0.91, 0.84, 1.0)
const TEXT_MUTED := Color(0.69, 0.66, 0.57, 1.0)
const TEXT_GOLD := Color(0.96, 0.73, 0.32, 1.0)
const TEXT_GREEN := Color(0.45, 0.72, 0.44, 1.0)
const TEXT_BLUE := Color(0.48, 0.61, 0.82, 1.0)
const TEXT_RED := Color(0.84, 0.34, 0.25, 1.0)
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")
const HERO_CARD_VIEW := preload("res://scripts/ui/formal_pack/components/hero_card_view.gd")
const RECRUIT_BLOCK_RENDERER := preload("res://scripts/ui/recruit_components/recruit_block_renderer.gd")
const RECRUIT_FORMAL_PACK_RENDERER := preload("res://scripts/ui/recruit_components/recruit_formal_pack_renderer.gd")

func _init() -> void:
	panel_title = "招募"
	panel_subtitle = "卡池 / 单招 / 五连 / 结果"
	panel_empty_state_text = "等待招募域数据。"

func set_recruit_snapshot(snapshot: Dictionary) -> void:
	set_snapshot(snapshot)

func _refresh_panel() -> void:
	if _panel_host == null or not is_instance_valid(_panel_host):
		return
	if _active_page_id == "":
		_active_page_id = _resolve_default_page_id()
	_panel_host.call("set_panel_title", str(_snapshot.get("title", panel_title)))
	_panel_host.call("set_back_button_label", "返回地图")
	_panel_host.call("set_close_button_label", "关闭")
	_panel_host.call("set_empty_state_text", str(_snapshot.get("empty_state_text", panel_empty_state_text)))
	_panel_host.call("set_tabs", [])
	if _panel_host.has_method("set_header_visible"):
		_panel_host.call("set_header_visible", true)
	if _panel_host.has_method("set_body_margins"):
		_panel_host.call("set_body_margins", 0, 0, 0, 0)
	if _panel_host.has_method("set_content_margins"):
		_panel_host.call("set_content_margins", 0, 0, 0, 0)
	if _panel_host.has_method("set_content_frame_transparent"):
		_panel_host.call("set_content_frame_transparent", true)
	if _active_page_id != "":
		_panel_host.call("set_active_tab", _active_page_id)
	var section := _resolve_active_section_payload()
	if section.is_empty():
		_panel_host.call("show_empty_state", str(_snapshot.get("empty_state_text", panel_empty_state_text)))
		return
	_panel_host.call("set_content_node", _build_recruit_page(section))

func get_mainline_visual_smoke_summary(page_id: String = "") -> Dictionary:
	var summary := super.get_mainline_visual_smoke_summary(page_id)
	var requested_page := str(page_id).strip_edges()
	var active_page := str(summary.get("activePageId", requested_page)).strip_edges()
	if active_page == "":
		active_page = _active_page_id
	var is_player_flow_page := active_page == "pool" or active_page == "single" or active_page == "multi"
	UI_COMPONENT_FACTORY.apply_design_system_summary(summary, "recruit_formal_pack", "preview_read_model_shell", is_player_flow_page)
	UI_COMPONENT_FACTORY.apply_recruit_formal_pack_summary(summary)
	UI_COMPONENT_FACTORY.apply_stage_a_shared_motion_feedback_chain_summary(summary, "recruit_formal_pack_renderer", "recruit_draw_preview")
	var _stage_a_shared_motion_trigger := str(summary.get("stageASharedMotionTrigger", ""))
	summary["recruitThemeTokenSet"] = UI_COMPONENT_FACTORY.DESIGN_SYSTEM_ID
	summary["recruitPageTokenState"] = active_page
	summary["recruitFontScaleMode"] = UI_COMPONENT_FACTORY.DESIGN_TOKEN_VERSION
	summary["recruitButtonScaleMode"] = UI_COMPONENT_FACTORY.DESIGN_TOKEN_VERSION
	summary["recruitMotionFeedbackChainToken"] = "recruit_draw_feedback_chain_v1"
	summary["recruitMotionFeedbackChainStages"] = "click_feedback|resource_prompt|pack_back_frame|reveal|quality_sweep|continue_confirm"
	summary["recruitMotionFeedbackChainSummary"] = "点击反馈 -> 资源/招募令提示 -> 卡背/卡框 -> reveal -> whole-image breathing/frame sweep/glow -> 继续/确认"
	summary["recruitMotionClickFeedbackToken"] = "recruit_draw_click_feedback_v1"
	summary["recruitMotionResourcePromptToken"] = "recruit_draw_resource_prompt_v1"
	summary["recruitMotionPackFrameToken"] = "recruit_draw_pack_frame_v1"
	summary["recruitMotionRevealToken"] = "recruit_draw_reveal_v1"
	summary["recruitMotionQualitySweepToken"] = "recruit_draw_quality_sweep_v1"
	summary["recruitMotionContinueControlToken"] = "recruit_draw_continue_confirm_control_v1"
	summary["recruitMotionPseudoLiveStyle"] = "whole_image_breathing_frame_sweep_glow_no_face_deform"
	if active_page == "pool":
		var pool_count := _dictionary_array(_resolve_active_section_payload().get("item_cards", [])).size()
		HERO_CARD_VIEW.append_smoke_summary(summary, HERO_CARD_VIEW.MODE_POOL_PREVIEW, false, pool_count, false)
		summary["recruitViewMode"] = "formal_pack_pack_carousel"
		summary["recruitPackCount"] = pool_count
		summary["recruitActionMode"] = "preview_only"
		summary["selectedRecruitPackId"] = str(_shared_state().get("selected_pool_id", ""))
		summary["selectedRecruitPackHasInlineActions"] = true
		summary["recruitSingleActionVisible"] = true
		summary["recruitFiveActionVisible"] = true
	elif active_page == "result":
		var draw_result_entries := _resolve_draw_result_preview_entries()
		var draw_result_count := draw_result_entries.size()
		var draw_result_card_config := HERO_CARD_VIEW.full_card_config(HERO_CARD_VIEW.MODE_DRAW_RESULT)
		HERO_CARD_VIEW.append_smoke_summary(summary, HERO_CARD_VIEW.MODE_DRAW_RESULT, false, draw_result_count, true, draw_result_entries, draw_result_card_config)
		summary["drawResultViewMode"] = "formal_pack_draw_result_row"
		summary["drawResultMode"] = "five"
		summary["drawResultCardMode"] = "draw_result"
		summary["drawResultVisibleCount"] = draw_result_count
		summary["drawResultInitialVisibleCardTarget"] = _draw_preview_initial_visible_card_target(draw_result_count)
		UI_COMPONENT_FACTORY.apply_card_rail_summary(summary, "drawResultCardRail", summary["drawResultInitialVisibleCardTarget"])
		_apply_draw_card_rail_metrics(summary, "drawResult", draw_result_card_config, draw_result_count, int(summary["drawResultInitialVisibleCardTarget"]))
		summary["drawResultCommercialStageToken"] = "recruit_multi_draw_result_four_card_first_view_v1"
		summary["drawResultRepeatActionLabel"] = "再招募 5 次"
		summary["drawResultReceiptSource"] = "preview_only"
		summary["authorityTriggered"] = false
	elif active_page == "single" or active_page == "multi":
		var is_multi := active_page == "multi"
		var draw_preview_entries := _resolve_draw_preview_entries("RecruitFivePreviewResultBlock" if is_multi else "RecruitSinglePreviewResultBlock", 5 if is_multi else 1)
		var draw_preview_count := draw_preview_entries.size()
		var draw_preview_card_config := HERO_CARD_VIEW.full_card_config(HERO_CARD_VIEW.MODE_DRAW_RESULT)
		HERO_CARD_VIEW.append_smoke_summary(summary, HERO_CARD_VIEW.MODE_DRAW_RESULT, false, draw_preview_count, true, draw_preview_entries, draw_preview_card_config)
		summary["recruitViewMode"] = "formal_pack_draw_result_display"
		summary["drawPreviewViewMode"] = "formal_pack_multi_draw_result_display" if is_multi else "formal_pack_single_draw_result_display"
		summary["drawPreviewMode"] = "five" if is_multi else "single"
		summary["drawPreviewCardMode"] = "draw_result"
		summary["drawPreviewVisibleCount"] = draw_preview_count
		summary["drawPreviewInitialVisibleCardTarget"] = _draw_preview_initial_visible_card_target(draw_preview_count)
		UI_COMPONENT_FACTORY.apply_card_rail_summary(summary, "drawPreviewCardRail", summary["drawPreviewInitialVisibleCardTarget"])
		_apply_draw_card_rail_metrics(summary, "drawPreview", draw_preview_card_config, draw_preview_count, int(summary["drawPreviewInitialVisibleCardTarget"]))
		summary["drawPreviewCommercialStageToken"] = "recruit_multi_draw_result_four_card_first_view_v1" if is_multi else "recruit_single_draw_result_center_card_v1"
		summary["drawPreviewActionId"] = "draw_multi" if is_multi else "draw_single"
		summary["drawPreviewActionPanelVisible"] = false
		summary["drawPreviewRepeatActionLabel"] = "再招募 5 次" if is_multi else "再招募 1 次"
		summary["drawPreviewReceiptSource"] = "preview_only"
		summary["selectedRecruitPackId"] = str(_shared_state().get("selected_pool_id", ""))
		summary["authorityTriggered"] = false
	return summary

func _apply_draw_card_rail_metrics(summary: Dictionary, prefix: String, card_config: Dictionary, total_count: int, visible_target: int) -> void:
	var card_width := float(card_config.get("width", 0.0))
	var card_height := float(card_config.get("height", 0.0))
	var gap := HERO_CARD_VIEW.FULL_CARD_GAP
	UI_COMPONENT_FACTORY.apply_card_rail_geometry_summary(summary, prefix, card_width, card_height, gap, total_count, visible_target)
	summary["%sRepeatActionGap" % prefix] = UI_COMPONENT_FACTORY.card_rail_repeat_action_gap()
	summary["%sRepeatActionSlotMode" % prefix] = "card_rail_repeat_action_gap_spacer_v1"

func _draw_preview_initial_visible_card_target(total_count: int) -> int:
	if total_count >= 5:
		return 4
	return UI_COMPONENT_FACTORY.card_rail_initial_visible_card_target(total_count)

func _build_recruit_page(section: Dictionary) -> Control:
	if _active_page_id == "pool":
		return RECRUIT_FORMAL_PACK_RENDERER.build_pool_page(section, _shared_state(), Callable(self, "_on_recruit_action_pressed"))
	if _active_page_id == "single" or _active_page_id == "multi":
		return RECRUIT_FORMAL_PACK_RENDERER.build_draw_preview_page(section, _shared_state(), Callable(self, "_on_recruit_action_pressed"), _active_page_id)
	if _active_page_id == "result":
		return RECRUIT_FORMAL_PACK_RENDERER.build_result_page(section, _shared_state(), Callable(self, "_on_recruit_action_pressed"))
	var scroll := ScrollContainer.new()
	scroll.name = "RecruitFormalScroll"
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(scroll)

	var root_panel := _panel(BG_ROOT, Color(0.0, 0.0, 0.0, 0.0), 0)
	root_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(root_panel)

	var root_margin := _margin(18, 16, 18, 18)
	root_panel.add_child(root_margin)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 12)
	root_margin.add_child(column)

	column.add_child(_build_status_header(section))

	var body := HBoxContainer.new()
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 14)
	column.add_child(body)

	var rail := VBoxContainer.new()
	rail.custom_minimum_size = Vector2(360, 0)
	rail.size_flags_vertical = Control.SIZE_EXPAND_FILL
	rail.add_theme_constant_override("separation", 10)
	body.add_child(rail)
	rail.add_child(_build_page_summary_panel(section))
	rail.add_child(_build_item_list_panel(section))

	var content := VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 10)
	body.add_child(content)
	for block in _dictionary_array(section.get("content_blocks", [])):
		content.add_child(_build_content_block(block))
	return scroll

func _build_status_header(section: Dictionary) -> Control:
	var shared := _shared_state()
	var panel := _panel(BG_PANEL_ALT, BORDER_ACTIVE, 5)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(14, 12, 14, 12)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 12)
	margin.add_child(row)

	var title_box := VBoxContainer.new()
	title_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_box.add_theme_constant_override("separation", 4)
	row.add_child(title_box)
	title_box.add_child(_label(str(section.get("summary_title", "招募")), 22, TEXT_GOLD))
	title_box.add_child(_label(_section_intro_line(section), 13, TEXT_MUTED))

	var status_grid := GridContainer.new()
	status_grid.columns = 4
	status_grid.custom_minimum_size = Vector2(620, 0)
	status_grid.add_theme_constant_override("h_separation", 8)
	status_grid.add_theme_constant_override("v_separation", 8)
	row.add_child(status_grid)
	status_grid.add_child(_status_chip("卡池", str(shared.get("selected_pool_label", "未选择")), TEXT_GOLD))
	status_grid.add_child(_status_chip("可抽", str(shared.get("available_draw_count", 0)), TEXT_GREEN))
	status_grid.add_child(_status_chip("结果", str(shared.get("latest_result_label", "暂无结果")), TEXT_BLUE))
	status_grid.add_child(_status_chip("边界", "preview-only", TEXT_MUTED))
	return panel

func _build_page_summary_panel(section: Dictionary) -> Control:
	var panel := _panel(BG_PANEL, BORDER, 5)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(12, 12, 12, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)
	column.add_child(_label(_page_label(_active_page_id), 18, TEXT_GOLD))
	for line in _string_array(section.get("summary_lines", [])):
		column.add_child(_label(line, 13, TEXT_MUTED))
	var shared := _shared_state()
	column.add_child(_thin_separator())
	column.add_child(_metric_row("当前卡池", str(shared.get("selected_pool_label", "未选择"))))
	column.add_child(_metric_row("可抽次数", str(shared.get("available_draw_count", 0))))
	column.add_child(_metric_row("概率摘要", str(shared.get("preview_probability_group_summary", "未读取"))))
	column.add_child(_metric_row("最近回执", str(shared.get("runtime_receipt_summary", "未记录"))))
	return panel

func _build_item_list_panel(section: Dictionary) -> Control:
	var panel := _panel(BG_PANEL, BORDER, 5)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var margin := _margin(12, 12, 12, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)
	column.add_child(_label(str(section.get("list_title", "列表")), 18, TEXT_GOLD))
	var cards := _dictionary_array(section.get("item_cards", []))
	if cards.is_empty():
		column.add_child(_empty_panel("暂无条目", "等待 presenter 提供招募状态。"))
	else:
		for card in cards:
			column.add_child(_build_list_card(card))
	return panel

func _build_content_block(block: Dictionary) -> Control:
	return RECRUIT_BLOCK_RENDERER.build_content_block(block, _shared_state(), Callable(self, "_on_recruit_action_pressed"))

func _build_list_card(card: Dictionary) -> Control:
	var panel := _panel(BG_CARD, BORDER, 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(10, 9, 10, 9)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 4)
	margin.add_child(column)
	column.add_child(_label(str(card.get("title", "")), 15, TEXT_MAIN))
	column.add_child(_label(str(card.get("value", "")), 13, TEXT_GOLD))
	column.add_child(_label(str(card.get("meta", "")), 12, TEXT_MUTED))
	column.add_child(_label(str(card.get("description", "")), 12, TEXT_MUTED))
	return panel

func _status_chip(title: String, value: String, color: Color) -> Control:
	var panel := _panel(BG_CARD, Color(color.r, color.g, color.b, 0.50), 4)
	panel.custom_minimum_size = Vector2(144, 58)
	var margin := _margin(8, 6, 8, 6)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 2)
	margin.add_child(column)
	column.add_child(_label(title, 11, TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	column.add_child(_label(value, 15, color, HORIZONTAL_ALIGNMENT_CENTER))
	return panel

func _metric_row(title: String, value: String) -> Control:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 8)
	row.add_child(_label(title, 12, TEXT_MUTED))
	var value_label := _label(value, 12, TEXT_MAIN, HORIZONTAL_ALIGNMENT_RIGHT)
	value_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(value_label)
	return row

func _thin_separator() -> Control:
	var line := ColorRect.new()
	line.custom_minimum_size = Vector2(0, 1)
	line.color = Color(BORDER.r, BORDER.g, BORDER.b, 0.50)
	return line

func _empty_panel(title: String, description: String) -> Control:
	var panel := _panel(BG_CARD, BORDER, 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(12, 12, 12, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 6)
	margin.add_child(column)
	column.add_child(_label(title, 16, TEXT_GOLD))
	column.add_child(_label(description, 13, TEXT_MUTED))
	return panel

func _section_intro_line(section: Dictionary) -> String:
	var lines := _string_array(section.get("summary_lines", []))
	if lines.is_empty():
		return "招募池、概率、预览结果和边界状态集中展示。"
	return lines[0]

func _page_label(page_id: String) -> String:
	match page_id:
		"single":
			return "单抽预览"
		"multi":
			return "五连预览"
		"result":
			return "最近结果"
		"guide":
			return "规则说明"
		_:
			return "卡池总览"

func _shared_state() -> Dictionary:
	var raw: Variant = _snapshot.get("shared_state", {})
	return raw as Dictionary if raw is Dictionary else {}

func _dictionary_array(raw_value: Variant) -> Array:
	var result: Array = []
	if not (raw_value is Array):
		return result
	for item in raw_value as Array:
		if item is Dictionary:
			result.append((item as Dictionary).duplicate(true))
	return result

func _string_array(raw_value: Variant) -> Array[String]:
	var result: Array[String] = []
	if not (raw_value is Array):
		return result
	for item in raw_value as Array:
		var text := str(item).strip_edges()
		if text != "":
			result.append(text)
	return result

func _resolve_draw_result_preview_count() -> int:
	return _resolve_draw_preview_count("RecruitResultMixedPreviewBlock", 5)

func _resolve_draw_result_preview_entries() -> Array:
	return _resolve_draw_preview_entries("RecruitResultMixedPreviewBlock", 5)

func _resolve_draw_preview_count(node_name: String, limit: int) -> int:
	return _resolve_draw_preview_entries(node_name, limit).size()

func _resolve_draw_preview_entries(node_name: String, limit: int) -> Array:
	var section := _resolve_active_section_payload()
	for block in _dictionary_array(section.get("content_blocks", [])):
		if str(block.get("node_name", "")) == node_name:
			var cards := _dictionary_array(block.get("cards", []))
			var result: Array = []
			for index in range(mini(limit, cards.size())):
				result.append((cards[index] as Dictionary).duplicate(true))
			return result
	return []

func _on_recruit_action_pressed(action_id: String) -> void:
	page_action_requested.emit(_active_page_id, action_id)

func _panel(bg: Color, border: Color, radius: int = 4) -> PanelContainer:
	return UI_COMPONENT_FACTORY.make_panel(bg, border, radius)

func _margin(left: int, top: int, right: int, bottom: int) -> MarginContainer:
	return UI_COMPONENT_FACTORY.make_margin(left, top, right, bottom)

func _label(text: String, size: int, color: Color, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	return UI_COMPONENT_FACTORY.make_label(text, size, color, align)

func _apply_button_style(button: Button, bg: Color, border: Color, font_color: Color) -> void:
	UI_COMPONENT_FACTORY.apply_button_style(button, bg, border, font_color, TEXT_MUTED)
