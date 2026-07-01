extends RefCounted
class_name RecruitFormalPackRenderer

const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")
const HeroCardViewScript := preload("res://scripts/ui/formal_pack/components/hero_card_view.gd")
const FormalPackAssetRegistryScript := preload("res://scripts/ui/formal_pack/components/formal_pack_asset_registry.gd")

const BG_ROOT := Color(0.030, 0.032, 0.034, 1.0)
const BG_BAND := Color(0.070, 0.071, 0.067, 0.94)
const BG_PANEL := Color(0.045, 0.046, 0.047, 0.86)
const BG_CARD := Color(0.095, 0.087, 0.074, 0.94)
const BG_DARK := Color(0.028, 0.028, 0.027, 0.92)
const BORDER := Color(0.440, 0.370, 0.210, 0.52)
const BORDER_ACTIVE := Color(0.950, 0.710, 0.290, 0.90)
const TEXT_MAIN := Color(0.930, 0.900, 0.820, 1.0)
const TEXT_MUTED := Color(0.690, 0.670, 0.600, 1.0)
const TEXT_GOLD := Color(0.960, 0.730, 0.330, 1.0)
const TEXT_GREEN := Color(0.420, 0.760, 0.470, 1.0)
const TEXT_RED := Color(0.900, 0.360, 0.300, 1.0)
const TEXT_VIOLET := Color(0.900, 0.420, 0.920, 1.0)

const PACK_WIDTH := 330.0
const PACK_CARD_HEIGHT := 642.0
const RESULT_CARD_GAP := 22
const MULTI_DRAW_RESULT_STAGE_TOKEN := "recruit_multi_draw_result_four_card_first_view_v1"

const POOL_VISUALS := {
	"pool_standard": {
		"title": "王佐烽烟",
		"subtitle": "S级",
		"cover_asset_key": "formal_pack.cover.wangzuo_fengyan",
		"cost": "40000",
		"single": "40000铜钱",
		"five": "20万铜钱",
		"currency_badge": "铜",
		"corner_badge": "令",
		"tone": Color(0.300, 0.230, 0.180, 1.0),
	},
	"pool_season": {
		"title": "江东战鼓",
		"subtitle": "S级",
		"cover_asset_key": "formal_pack.cover.jiangdong_zhangu",
		"cost": "50000",
		"single": "50000铜钱",
		"five": "25万铜钱",
		"currency_badge": "铜",
		"corner_badge": "令",
		"tone": Color(0.170, 0.150, 0.180, 1.0),
	},
	"pool_limited": {
		"title": "西凉铁骑",
		"subtitle": "S级",
		"cover_asset_key": "formal_pack.cover.xiliang_tieqi",
		"cost": "50000",
		"single": "50000铜钱",
		"five": "25万铜钱",
		"currency_badge": "铜",
		"corner_badge": "令",
		"tone": Color(0.210, 0.150, 0.120, 1.0),
	},
}

static func build_pool_page(section: Dictionary, shared_state: Dictionary, action_callback: Callable) -> Control:
	var root := _build_root("", "", "", false)
	var column := root.get("column") as VBoxContainer
	var packs := _build_pool_entries(section, shared_state)
	if packs.is_empty():
		column.add_child(_empty_panel("暂无可用卡池", "等待 presenter 提供 visiblePools。"))
	else:
		column.add_child(_build_pack_scroll(packs, shared_state, action_callback))
	column.add_child(_build_bottom_resource_bar(shared_state))
	return root.get("scroll") as Control

static func build_result_page(section: Dictionary, shared_state: Dictionary, action_callback: Callable) -> Control:
	var root := _build_root("", "", "", false)
	var column := root.get("column") as VBoxContainer
	column.add_child(_build_result_panel(section, shared_state, action_callback, "result"))
	return root.get("scroll") as Control

static func build_draw_preview_page(section: Dictionary, shared_state: Dictionary, action_callback: Callable, draw_mode: String) -> Control:
	var is_multi := draw_mode == "multi"
	var root := _build_root("", "", "", false)
	var column := root.get("column") as VBoxContainer
	column.add_child(_build_draw_result_display_panel(
		section,
		shared_state,
		action_callback,
		"RecruitFivePreviewResultBlock" if is_multi else "RecruitSinglePreviewResultBlock",
		5 if is_multi else 1,
		_result_card_width(),
		_result_card_height(),
		"再招募 5 次" if is_multi else "再招募 1 次",
		"draw_multi" if is_multi else "draw_single",
		"DrawResultFiveCardRow" if is_multi else "DrawResultSingleCardRow"
	))
	return root.get("scroll") as Control

static func _build_root(title: String, status: String, badge: String, show_header: bool = true) -> Dictionary:
	var scroll := ScrollContainer.new()
	scroll.name = "RecruitFormalPackScroll"
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(scroll)

	var root_panel := _panel(BG_ROOT, Color(0, 0, 0, 0), 0)
	root_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.add_child(root_panel)

	var root_margin := _margin(22, 18, 22, 18)
	root_panel.add_child(root_margin)
	var band := _panel(BG_BAND, BORDER, 4)
	band.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	band.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_margin.add_child(band)

	var content_margin := _margin(18, 14, 18, 14)
	band.add_child(content_margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	content_margin.add_child(column)
	if show_header and title.strip_edges() != "":
		column.add_child(_build_header(title, status, badge))
	return {
		"scroll": scroll,
		"column": column,
	}

static func _build_header(title: String, status: String, badge: String) -> Control:
	var header := HBoxContainer.new()
	header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_recruit_formal_pack_header_style(header)
	header.add_child(_label(title, UI_COMPONENT_FACTORY.recruit_formal_pack_header_title_font_size(), TEXT_GOLD))
	header.add_spacer(false)
	if status.strip_edges() != "":
		header.add_child(_compact_label(status, UI_COMPONENT_FACTORY.recruit_formal_pack_header_status_font_size(), TEXT_GREEN, HORIZONTAL_ALIGNMENT_RIGHT))
	if badge.strip_edges() != "":
		header.add_child(_badge(badge, TEXT_MAIN))
	return header

static func _build_pool_entries(section: Dictionary, shared_state: Dictionary) -> Array:
	var selected_pool_id := str(shared_state.get("selected_pool_id", "pool_standard")).strip_edges()
	var result: Array = []
	for card in _dictionary_array(section.get("item_cards", [])):
		var pool_id := str(card.get("meta", "")).strip_edges()
		if pool_id == "":
			continue
		var visual := (POOL_VISUALS.get(pool_id, {}) as Dictionary).duplicate(true)
		visual["id"] = pool_id
		visual["label"] = str(card.get("title", pool_id))
		visual["status"] = str(card.get("value", "可抽"))
		visual["description"] = str(card.get("description", ""))
		visual["selected"] = pool_id == selected_pool_id
		visual["resource_state"] = "可抽次数 %s" % str(shared_state.get("available_draw_count", 0))
		visual["capacity_state"] = "武将 %s" % str(shared_state.get("prospect_count", 0))
		result.append(visual)
	if result.is_empty():
		for pool_id in ["pool_standard", "pool_season", "pool_limited"]:
			var visual := (POOL_VISUALS.get(pool_id, {}) as Dictionary).duplicate(true)
			visual["id"] = pool_id
			visual["status"] = "当前" if pool_id == selected_pool_id else "候选"
			visual["selected"] = pool_id == selected_pool_id
			result.append(visual)
	return result

static func _build_pack_scroll(packs: Array, shared_state: Dictionary, action_callback: Callable) -> Control:
	var scroll := ScrollContainer.new()
	scroll.name = "RecruitPackHorizontalScroll"
	UI_COMPONENT_FACTORY.apply_card_rail_scroll_container(scroll, PACK_WIDTH, PACK_CARD_HEIGHT, RESULT_CARD_GAP, packs.size())
	var row := HBoxContainer.new()
	row.name = "RecruitPackRow"
	row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	row.custom_minimum_size = Vector2(UI_COMPONENT_FACTORY.card_rail_content_width(PACK_WIDTH, RESULT_CARD_GAP, packs.size() + 1), PACK_CARD_HEIGHT)
	row.add_theme_constant_override("separation", RESULT_CARD_GAP)
	scroll.add_child(row)
	for index in range(packs.size()):
		var pack := packs[index] as Dictionary
		var pack_card := _build_pack_card(pack, action_callback)
		row.add_child(pack_card)
		UI_COMPONENT_FACTORY.apply_motion_recruit_pack_enter(pack_card, index)
		if bool(pack.get("selected", false)):
			var inline_panel := _build_inline_action_panel(pack, shared_state, action_callback)
			row.add_child(inline_panel)
			UI_COMPONENT_FACTORY.apply_motion_recruit_pack_enter(inline_panel, index + 1)
	return scroll

static func _build_pack_card(pack: Dictionary, action_callback: Callable) -> Button:
	var button := Button.new()
	button.name = "RecruitPackButton_%s" % str(pack.get("id", "pool"))
	button.text = ""
	button.flat = true
	button.focus_mode = Control.FOCUS_NONE
	button.custom_minimum_size = Vector2(PACK_WIDTH, PACK_CARD_HEIGHT)
	button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	button.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_apply_button_style(button, BG_CARD, BORDER_ACTIVE if bool(pack.get("selected", false)) else BORDER, TEXT_MAIN)
	button.pressed.connect(action_callback.bind(str(pack.get("id", ""))))

	var card_margin := _margin(9, 9, 9, 9)
	card_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card_margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	button.add_child(card_margin)
	var column := VBoxContainer.new()
	column.mouse_filter = Control.MOUSE_FILTER_IGNORE
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 7)
	card_margin.add_child(column)

	var glow := ColorRect.new()
	glow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	glow.color = Color(0.950, 0.710, 0.290, 0.72) if bool(pack.get("selected", false)) else Color(0.400, 0.330, 0.190, 0.22)
	glow.custom_minimum_size = Vector2(0, 4)
	column.add_child(glow)

	var art := _panel(pack.get("tone", BG_CARD) as Color, Color(0.780, 0.650, 0.330, 0.42), 2)
	art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	art.custom_minimum_size = Vector2(0, 548)
	art.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	art.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(art)
	var art_margin := _margin(12, 14, 12, 12)
	art_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	art_margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	art.add_child(art_margin)
	art_margin.add_child(_build_cover_visual(pack))

	var price_plate := _panel(Color(0.035, 0.027, 0.045, 0.94), Color(0.740, 0.560, 0.260, 0.72), 2)
	price_plate.mouse_filter = Control.MOUSE_FILTER_IGNORE
	UI_COMPONENT_FACTORY.apply_recruit_formal_pack_price_plate_style(price_plate)
	column.add_child(price_plate)
	var plate_margin := UI_COMPONENT_FACTORY.make_recruit_formal_pack_price_plate_margin()
	plate_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	plate_margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	price_plate.add_child(plate_margin)
	var footer := HBoxContainer.new()
	footer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	footer.add_theme_constant_override("separation", UI_COMPONENT_FACTORY.recruit_formal_pack_price_plate_footer_separation())
	plate_margin.add_child(footer)
	footer.add_child(_corner_badge(str(pack.get("currency_badge", "铜"))))
	var cost_label := _compact_label(str(pack.get("cost", "")), UI_COMPONENT_FACTORY.recruit_formal_pack_price_plate_cost_font_size(), TEXT_VIOLET)
	cost_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	footer.add_child(cost_label)
	footer.add_child(_compact_label(str(pack.get("status", "")), UI_COMPONENT_FACTORY.recruit_formal_pack_price_plate_status_font_size(), TEXT_GOLD, HORIZONTAL_ALIGNMENT_RIGHT))
	return button

static func _build_cover_visual(pack: Dictionary) -> Control:
	var root := Control.new()
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	UI_COMPONENT_FACTORY.apply_recruit_formal_pack_cover_stage(root)
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var cover_texture: Texture2D = FormalPackAssetRegistryScript.cover_texture(str(pack.get("cover_asset_key", "")))
	if cover_texture != null:
		var image := TextureRect.new()
		image.mouse_filter = Control.MOUSE_FILTER_IGNORE
		image.texture = cover_texture
		UI_COMPONENT_FACTORY.apply_recruit_formal_pack_cover_texture(image)
		root.add_child(image)
		var shade := ColorRect.new()
		shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
		shade.color = Color(0.018, 0.016, 0.014, 0.18)
		shade.set_anchors_preset(Control.PRESET_FULL_RECT)
		root.add_child(shade)

	var stage_bg := pack.get("tone", BG_CARD) as Color
	if cover_texture != null:
		stage_bg = Color(0.020, 0.018, 0.015, 0.08)
	var stage := _panel(stage_bg, Color(0.620, 0.520, 0.300, 0.36), 1)
	stage.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stage.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(stage)
	var stage_margin := _margin(9, 8, 9, 8)
	stage.add_child(stage_margin)
	var stage_col := VBoxContainer.new()
	stage_col.name = "RecruitPackCoverAssetSlot"
	stage_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage_col.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stage_col.add_theme_constant_override("separation", 0)
	stage_margin.add_child(stage_col)
	stage_col.add_spacer(false)
	var badge_row := HBoxContainer.new()
	badge_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stage_col.add_child(badge_row)
	badge_row.add_spacer(false)
	badge_row.add_child(_corner_badge(str(pack.get("corner_badge", "令"))))

	var left_strip := _panel(Color(0.018, 0.016, 0.015, 0.28), Color(0.230, 0.180, 0.120, 0.38), 1)
	left_strip.custom_minimum_size = Vector2(42, 300)
	root.add_child(left_strip)
	var strip_margin := _margin(2, 10, 2, 10)
	left_strip.add_child(strip_margin)
	var strip_col := VBoxContainer.new()
	strip_col.add_theme_constant_override("separation", 3)
	strip_margin.add_child(strip_col)
	strip_col.add_child(_compact_label(_vertical_text(str(pack.get("title", ""))), 16, TEXT_VIOLET, HORIZONTAL_ALIGNMENT_CENTER))
	strip_col.add_child(_compact_label(_vertical_text(str(pack.get("subtitle", ""))), 12, TEXT_VIOLET, HORIZONTAL_ALIGNMENT_CENTER))
	strip_col.add_spacer(false)
	return root

static func _build_inline_action_panel(pack: Dictionary, shared_state: Dictionary, action_callback: Callable) -> Control:
	var panel := _panel(BG_DARK, BORDER_ACTIVE, 4)
	panel.name = "RecruitInlineActionPanel_%s" % str(pack.get("id", "pool"))
	_apply_recruit_draw_chain_metadata(panel, false)
	panel.custom_minimum_size = Vector2(PACK_WIDTH, PACK_CARD_HEIGHT)
	panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var margin := _margin(16, 18, 16, 16)
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 14)
	margin.add_child(column)
	var top := HBoxContainer.new()
	column.add_child(top)
	top.add_child(_compact_label("?", 34, TEXT_GOLD, HORIZONTAL_ALIGNMENT_CENTER))
	top.add_spacer(false)
	top.add_child(_badge("概率说明", TEXT_MAIN))
	column.add_spacer(false)
	column.add_child(_state_line("当前卡池", str(pack.get("title", "")), TEXT_GREEN))
	column.add_child(_state_line("资源", str(pack.get("resource_state", "")), TEXT_MAIN))
	column.add_child(_state_line("容量", str(pack.get("capacity_state", "")), TEXT_MAIN))
	column.add_child(_state_line("后端 authority", "等待回执，不做本地随机", TEXT_MUTED))
	var draw_col := VBoxContainer.new()
	draw_col.add_theme_constant_override("separation", 12)
	column.add_child(draw_col)
	draw_col.add_child(_draw_button("招募 1 次", str(pack.get("single", "")), "draw_single", action_callback, int(shared_state.get("available_draw_count", 0)) < 1))
	draw_col.add_child(_draw_button("招募 5 次", str(pack.get("five", "")), "draw_multi", action_callback, int(shared_state.get("available_draw_count", 0)) < 1))
	column.add_child(_compact_label("等待选择招募次数", 14, TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	column.add_spacer(false)
	var probability := _panel(Color(0.035, 0.034, 0.030, 0.96), Color(0.730, 0.580, 0.260, 0.72), 3)
	probability.name = "RecruitProbabilityInlinePanel"
	column.add_child(probability)
	var prob_margin := _margin(10, 8, 10, 8)
	probability.add_child(prob_margin)
	var prob_col := VBoxContainer.new()
	prob_col.add_theme_constant_override("separation", 3)
	prob_margin.add_child(prob_col)
	prob_col.add_child(_compact_label("概率说明 / 当前卡池", 15, TEXT_GOLD))
	prob_col.add_child(_compact_label(str(shared_state.get("preview_probability_group_summary", "概率预览待填写")), 13, TEXT_MAIN))
	prob_col.add_child(_compact_label(str(shared_state.get("preview_boundary_summary", "只读、不消耗、不落库")), 12, TEXT_MUTED))
	return panel

static func _build_draw_preview_panel(section: Dictionary, shared_state: Dictionary, action_callback: Callable, draw_mode: String) -> Control:
	var is_multi := draw_mode == "multi"
	var card_width := _result_card_width()
	var card_height := _result_card_height()
	var panel := _panel(BG_PANEL, Color(0.150, 0.140, 0.110, 0.34), 2)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var margin := _margin(18, 6, 18, 12)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 18)
	margin.add_child(row)
	row.add_child(_build_draw_preview_action_panel(section, shared_state, action_callback, draw_mode, card_height))
	row.add_child(_build_draw_preview_card_scroll(section, "RecruitFivePreviewResultBlock" if is_multi else "RecruitSinglePreviewResultBlock", 5 if is_multi else 1, card_width, card_height))
	return panel

static func _build_draw_preview_action_panel(section: Dictionary, shared_state: Dictionary, action_callback: Callable, draw_mode: String, panel_height: float = -1.0) -> Control:
	var is_multi := draw_mode == "multi"
	if panel_height <= 0.0:
		panel_height = _result_card_height()
	var panel := _panel(BG_DARK, BORDER_ACTIVE, 4)
	panel.name = "RecruitDrawPreviewActionPanel_%s" % draw_mode
	_apply_recruit_draw_chain_metadata(panel, false)
	panel.custom_minimum_size = Vector2(PACK_WIDTH, panel_height)
	panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var margin := _margin(16, 18, 16, 16)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 12)
	margin.add_child(column)
	column.add_child(_compact_label("?", 34, TEXT_GOLD, HORIZONTAL_ALIGNMENT_CENTER))
	column.add_child(_compact_label("当前卡池", 14, TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	column.add_child(_compact_label(str(shared_state.get("selected_pool_label", "未选择")), 22, TEXT_GOLD, HORIZONTAL_ALIGNMENT_CENTER))
	column.add_child(_thin_line())
	column.add_child(_state_line("招募模式", "五连" if is_multi else "单招", TEXT_MAIN))
	column.add_child(_state_line("可抽次数", str(shared_state.get("available_draw_count", 0)), TEXT_GREEN))
	column.add_child(_state_line("预览摘要", str(shared_state.get("preview_five_summary" if is_multi else "preview_single_label", "待生成")), TEXT_MAIN))
	column.add_child(_state_line("后端 authority", "等待回执，不做本地随机", TEXT_MUTED))
	column.add_spacer(false)
	var action_id := "draw_multi" if is_multi else "draw_single"
	var button_title := "招募 5 次" if is_multi else "招募 1 次"
	var cost := str(shared_state.get("selected_pool_five_cost" if is_multi else "selected_pool_single_cost", ""))
	column.add_child(_draw_button(button_title, cost, action_id, action_callback, int(shared_state.get("available_draw_count", 0)) < 1))
	column.add_child(_compact_label("只读预览；真实写入等待回执", 13, TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	return panel

static func _build_draw_preview_card_scroll(section: Dictionary, node_name: String, expected_count: int, card_width: float = -1.0, card_height: float = -1.0) -> Control:
	if card_width <= 0.0:
		card_width = _result_card_width()
	if card_height <= 0.0:
		card_height = _result_card_height()
	var card_gap := _result_card_gap()
	var scroll := ScrollContainer.new()
	scroll.name = "RecruitDrawPreviewCardScroll_%s" % node_name
	UI_COMPONENT_FACTORY.apply_card_rail_scroll_container(scroll, card_width, card_height, card_gap, expected_count)
	var row := HBoxContainer.new()
	row.name = "DrawPreviewCardRow_%s" % node_name
	row.add_theme_constant_override("separation", card_gap)
	row.custom_minimum_size = Vector2(UI_COMPONENT_FACTORY.card_rail_content_width(card_width, card_gap, expected_count), card_height)
	scroll.add_child(row)
	var preview_cards := _build_draw_result_entries(section, node_name)
	if preview_cards.is_empty():
		row.add_child(_empty_panel("暂无预览结果", "等待 presenter 提供 preview cards。"))
	else:
		for index in range(mini(expected_count, preview_cards.size())):
			var card := _build_result_card(preview_cards[index] as Dictionary, index, card_width, card_height)
			row.add_child(card)
			UI_COMPONENT_FACTORY.apply_motion_recruit_hero_card_enter(card, index)
			UI_COMPONENT_FACTORY.apply_motion_recruit_hero_card_reveal_pseudo_live(card, index)
	return scroll

static func _build_result_panel(section: Dictionary, shared_state: Dictionary, action_callback: Callable, draw_mode: String) -> Control:
	return _build_draw_result_display_panel(
		section,
		shared_state,
		action_callback,
		"RecruitResultMixedPreviewBlock",
		5,
		_result_card_width(),
		_result_card_height(),
		"再招募 5 次" if draw_mode == "result" else "继续招募",
		"draw_multi",
		"DrawResultFiveCardRow"
	)

static func _build_draw_result_display_panel(section: Dictionary, shared_state: Dictionary, action_callback: Callable, node_name: String, expected_count: int, card_width: float, card_height: float, repeat_label: String, action_id: String, row_name: String) -> Control:
	var panel := _panel(BG_PANEL, Color(0.150, 0.140, 0.110, 0.34), 2)
	_apply_recruit_draw_chain_metadata(panel, false)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var margin := _margin(18, 6, 18, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)
	var center := CenterContainer.new()
	center.name = "RecruitDrawResultCardRailStage_%s" % row_name
	center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	center.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	center.custom_minimum_size = Vector2(0, UI_COMPONENT_FACTORY.card_rail_min_height(card_height))
	column.add_child(center)
	var scroll := ScrollContainer.new()
	scroll.name = "RecruitDrawResultCardRail_%s" % row_name
	var initial_visible_target := _draw_result_initial_visible_card_target(expected_count)
	UI_COMPONENT_FACTORY.apply_card_rail_scroll_container(scroll, card_width, card_height, _result_card_gap(), expected_count, initial_visible_target)
	scroll.set_meta("commercial_stage_token", MULTI_DRAW_RESULT_STAGE_TOKEN if expected_count >= 5 else "recruit_single_draw_result_center_card_v1")
	center.add_child(scroll)
	var row := HBoxContainer.new()
	row.name = row_name
	row.add_theme_constant_override("separation", _result_card_gap())
	row.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	row.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	row.custom_minimum_size = Vector2(UI_COMPONENT_FACTORY.card_rail_content_width(card_width, _result_card_gap(), expected_count), card_height)
	scroll.add_child(row)
	var result_cards := _build_draw_result_entries(section, node_name)
	if result_cards.is_empty():
		row.add_child(_empty_panel("暂无招募结果", "执行招募动作后由后端回执填充。"))
	else:
		for index in range(mini(expected_count, result_cards.size())):
			var card := _build_result_card(result_cards[index] as Dictionary, index, card_width, card_height)
			row.add_child(card)
			if expected_count <= 1:
				UI_COMPONENT_FACTORY.apply_motion_recruit_hero_card_enter(card, index)
				UI_COMPONENT_FACTORY.apply_motion_recruit_hero_card_reveal_pseudo_live(card, index)
	column.add_child(UI_COMPONENT_FACTORY.make_card_rail_repeat_action_gap_spacer())
	var action_center := CenterContainer.new()
	action_center.name = "DrawResultRepeatActionSlot"
	action_center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_child(action_center)
	var repeat_button := _draw_button(repeat_label, "", action_id, action_callback, int(shared_state.get("available_draw_count", 0)) < 1, UI_COMPONENT_FACTORY.recruit_formal_pack_repeat_button_size())
	_apply_recruit_draw_chain_metadata(repeat_button, true)
	action_center.add_child(repeat_button)
	return panel

static func _draw_result_initial_visible_card_target(expected_count: int) -> int:
	if expected_count >= 5:
		return 4
	return UI_COMPONENT_FACTORY.card_rail_initial_visible_card_target(expected_count)

static func _build_draw_result_entries(section: Dictionary, node_name: String) -> Array:
	for block in _dictionary_array(section.get("content_blocks", [])):
		if str(block.get("node_name", "")) != node_name:
			continue
		var result: Array = []
		for card in _dictionary_array(block.get("cards", [])):
			result.append(_to_draw_result_entry(card, result.size()))
		return result
	return []

static func _to_draw_result_entry(card: Dictionary, index: int) -> Dictionary:
	var value := str(card.get("value", "B · 待揭示")).strip_edges()
	var parts := value.split("·", false)
	var rarity := parts[0].strip_edges() if parts.size() > 0 else "B"
	var name := parts[1].strip_edges() if parts.size() > 1 else value
	var meta := str(card.get("meta", "")).strip_edges()
	var meta_parts := meta.split("/", false)
	var is_hero := str(card.get("preview_kind", "")) == "hero"
	if not is_hero:
		return _fallback_draw_result_entry(card, index, rarity)
	var faction := meta_parts[0].strip_edges() if is_hero and meta_parts.size() > 0 else "战法"
	var troop := meta_parts[1].strip_edges() if meta_parts.size() > 1 else ("武将" if is_hero else "战法")
	return {
		"id": "recruit_draw_result_%s" % str(index + 1),
		"name": name,
		"displayName": name,
		"heroId": str(card.get("heroId", card.get("hero_id", ""))).strip_edges(),
		"faction": faction,
		"level": 30,
		"stars": "★★★★★" if rarity == "S" else "★★★★",
		"troopType": troop,
		"quality": rarity,
		"rarity": rarity,
		"status": "招募获得" if is_hero else "战法入库",
		"result_label": "%s级" % rarity,
		"draw_label": "招募获得" if is_hero else "已入库",
		"tone": str(card.get("tone", "")),
		"asset_ref": _structured_asset_ref(card),
	}

static func _fallback_draw_result_entry(card: Dictionary, index: int, rarity: String) -> Dictionary:
	var value := str(card.get("value", "B · 战法")).strip_edges()
	var parts := value.split("·", false)
	var name := parts[1].strip_edges() if parts.size() > 1 else value
	var raw_detail: Variant = card.get("skill_detail", card.get("skillDetail", card.get("read_model", card.get("readModel", {}))))
	var skill_detail := (raw_detail as Dictionary).duplicate(true) if raw_detail is Dictionary else {}
	var skill_type := str(card.get("type", card.get("skill_type", skill_detail.get("type", "")))).strip_edges()
	if skill_type == "":
		var meta_parts := str(card.get("meta", "")).split("/", false)
		skill_type = meta_parts[0].strip_edges() if meta_parts.size() > 0 else ""
	if skill_type == "":
		skill_type = "战法"
	return {
		"id": "recruit_draw_result_%s" % str(index + 1),
		"name": name,
		"displayName": name,
		"faction": "战法",
		"level": card.get("level", ""),
		"stars": "",
		"troopType": "战法",
		"type": skill_type,
		"skill_type": skill_type,
		"quality": rarity,
		"rarity": rarity,
		"value": value,
		"meta": str(card.get("meta", "")).strip_edges(),
		"description": str(card.get("description", card.get("desc", ""))).strip_edges(),
		"effect": str(card.get("effect", card.get("effectText", ""))).strip_edges(),
		"trigger": str(card.get("trigger", "")).strip_edges(),
		"target": str(card.get("target", "")).strip_edges(),
		"compatible_troops": (card.get("compatible_troops", []) as Array).duplicate(true) if card.get("compatible_troops", []) is Array else card.get("compatible_troops", []),
		"source": (card.get("source", {}) as Dictionary).duplicate(true) if card.get("source", {}) is Dictionary else card.get("source", ""),
		"skill_detail": skill_detail,
		"status": "已入库",
		"result_label": "",
		"draw_label": "",
		"tone": str(card.get("tone", "")),
		"preview_kind": "skill",
		"title": "战法",
		"asset_ref": _structured_asset_ref(card),
	}

static func _structured_asset_ref(card: Dictionary) -> Dictionary:
	var raw_asset_ref: Variant = card.get("asset_ref", card.get("assetRef", {}))
	if raw_asset_ref is Dictionary and not (raw_asset_ref as Dictionary).is_empty():
		return (raw_asset_ref as Dictionary).duplicate(true)
	var raw_detail: Variant = card.get("skill_detail", card.get("skillDetail", card.get("read_model", card.get("readModel", {}))))
	if raw_detail is Dictionary:
		var detail := raw_detail as Dictionary
		raw_asset_ref = detail.get("asset_ref", detail.get("assetRef", {}))
		if raw_asset_ref is Dictionary and not (raw_asset_ref as Dictionary).is_empty():
			return (raw_asset_ref as Dictionary).duplicate(true)
	return UI_COMPONENT_FACTORY.hero_portrait_payload_from_entry(card)

static func _build_result_card(entry: Dictionary, index: int, card_width: float = -1.0, card_height: float = -1.0) -> Button:
	var card_config := _result_card_config()
	if card_width > 0.0:
		card_config["width"] = card_width
	if card_height > 0.0:
		card_config["height"] = card_height
	card_width = float(card_config.get("width", HeroCardViewScript.FULL_CARD_WIDTH))
	card_height = float(card_config.get("height", HeroCardViewScript.FULL_CARD_HEIGHT))
	var card := HeroCardViewScript.build_card(entry, HeroCardViewScript.MODE_DRAW_RESULT, card_config)
	card.name = "DrawResultCard_%s" % str(index + 1)
	card.custom_minimum_size = Vector2(card_width, card_height)
	card.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	card.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	UI_COMPONENT_FACTORY.apply_motion_recruit_hero_card_reveal_pseudo_live(card, index)
	return card

static func _result_card_config(overrides: Dictionary = {}) -> Dictionary:
	return HeroCardViewScript.full_card_config(HeroCardViewScript.MODE_DRAW_RESULT, overrides)

static func _result_card_width() -> float:
	return float(_result_card_config().get("width", HeroCardViewScript.FULL_CARD_WIDTH))

static func _result_card_height() -> float:
	return float(_result_card_config().get("height", HeroCardViewScript.FULL_CARD_HEIGHT))

static func _result_card_gap() -> int:
	return int(HeroCardViewScript.FULL_CARD_GAP)

static func _draw_button(title: String, cost: String, action_id: String, action_callback: Callable, disabled: bool, size: Vector2 = Vector2(0, 62)) -> Button:
	var button := Button.new()
	button.name = "RecruitAction_%s" % action_id
	button.set_meta("recruit_draw_action_id", action_id)
	button.set_meta("recruit_draw_feedback_chain_token", "recruit_draw_feedback_chain_v1")
	button.set_meta("recruit_draw_click_feedback_token", "recruit_draw_click_feedback_v1")
	button.set_meta("recruit_draw_resource_prompt_token", "recruit_draw_resource_prompt_v1")
	button.set_meta("recruit_draw_pack_frame_token", "recruit_draw_pack_frame_v1")
	button.set_meta("recruit_draw_reveal_token", "recruit_draw_reveal_v1")
	button.set_meta("recruit_draw_quality_sweep_token", "recruit_draw_quality_sweep_v1")
	button.set_meta("recruit_draw_pseudo_live_style_token", "whole_image_breathing_frame_sweep_glow_no_face_deform")
	button.set_meta("recruit_draw_button_token", UI_COMPONENT_FACTORY.RECRUIT_FORMAL_PACK_ACTION_BUTTON_TOKEN)
	button.set_meta("recruit_draw_command_bg_token", UI_COMPONENT_FACTORY.RECRUIT_DRAW_COMMAND_BG_TOKEN)
	button.set_meta("recruit_draw_live_text_contract", "recruit_draw_live_text_v1")
	button.set_meta("recruit_draw_live_text_label", title)
	button.set_meta("recruit_draw_cost_label", cost if not disabled else "暂不可用")
	button.text = title if cost == "" else "%s\n%s" % [title, cost if not disabled else "暂不可用"]
	button.disabled = disabled
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.focus_mode = Control.FOCUS_NONE
	UI_COMPONENT_FACTORY.apply_recruit_formal_pack_action_button_style(button, disabled, size)
	button.pressed.connect(func() -> void:
		UI_COMPONENT_FACTORY.apply_motion_recruit_draw_click_feedback(button)
	)
	button.pressed.connect(action_callback.bind(action_id))
	return button

static func _build_bottom_resource_bar(shared_state: Dictionary) -> Control:
	var panel := _panel(Color(0.045, 0.047, 0.050, 0.96), Color(0.180, 0.170, 0.140, 0.62), 2)
	panel.custom_minimum_size = Vector2(0, 60)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(14, 8, 14, 8)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)
	margin.add_child(row)
	row.add_child(_resource_chip("发展", str(shared_state.get("development_points", 0))))
	row.add_child(_resource_chip("可抽", str(shared_state.get("available_draw_count", 0))))
	row.add_child(_resource_chip("最近", str(shared_state.get("latest_result_label", "暂无结果"))))
	row.add_spacer(false)
	row.add_child(_resource_chip("武将", str(shared_state.get("prospect_count", 0))))
	return panel

static func _apply_recruit_draw_chain_metadata(target: Control, include_continue_control: bool) -> void:
	if target == null:
		return
	target.set_meta("recruit_draw_feedback_chain_token", "recruit_draw_feedback_chain_v1")
	target.set_meta("recruit_draw_click_feedback_token", "recruit_draw_click_feedback_v1")
	target.set_meta("recruit_draw_resource_prompt_token", "recruit_draw_resource_prompt_v1")
	target.set_meta("recruit_draw_pack_frame_token", "recruit_draw_pack_frame_v1")
	target.set_meta("recruit_draw_reveal_token", "recruit_draw_reveal_v1")
	target.set_meta("recruit_draw_quality_sweep_token", "recruit_draw_quality_sweep_v1")
	target.set_meta("recruit_draw_pseudo_live_style_token", "whole_image_breathing_frame_sweep_glow_no_face_deform")
	if include_continue_control:
		target.set_meta("recruit_draw_continue_confirm_control_token", "recruit_draw_continue_confirm_control_v1")

static func _state_line(title: String, value: String, color: Color) -> Control:
	var row := HBoxContainer.new()
	UI_COMPONENT_FACTORY.apply_recruit_formal_pack_state_line_style(row)
	row.add_child(_compact_label(title, UI_COMPONENT_FACTORY.recruit_formal_pack_state_line_title_font_size(), TEXT_MUTED))
	var label := _compact_label(value, UI_COMPONENT_FACTORY.recruit_formal_pack_state_line_value_font_size(), color, HORIZONTAL_ALIGNMENT_RIGHT)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(label)
	return row

static func _thin_line() -> Control:
	var line := ColorRect.new()
	line.custom_minimum_size = Vector2(0, 1)
	line.color = Color(BORDER.r, BORDER.g, BORDER.b, 0.55)
	return line

static func _resource_chip(title: String, value: String) -> Control:
	var panel := _panel(Color(0.030, 0.030, 0.028, 0.78), Color(0.260, 0.230, 0.150, 0.52), 2)
	panel.custom_minimum_size = UI_COMPONENT_FACTORY.recruit_formal_pack_resource_chip_size()
	var margin := _margin(10, 6, 10, 6)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	margin.add_child(row)
	row.add_child(_compact_label(title, UI_COMPONENT_FACTORY.recruit_formal_pack_resource_chip_title_font_size(), TEXT_MUTED))
	row.add_child(_compact_label(value, UI_COMPONENT_FACTORY.recruit_formal_pack_resource_chip_value_font_size(), TEXT_MAIN))
	return panel

static func _corner_badge(text: String) -> Control:
	var badge := _panel(Color(0.110, 0.060, 0.090, 0.95), Color(0.900, 0.680, 0.320, 0.86), 2)
	badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
	badge.custom_minimum_size = UI_COMPONENT_FACTORY.recruit_formal_pack_corner_badge_size()
	var margin := _margin(5, 4, 5, 4)
	badge.add_child(margin)
	margin.add_child(_compact_label(text, UI_COMPONENT_FACTORY.recruit_formal_pack_corner_badge_font_size(), TEXT_GOLD, HORIZONTAL_ALIGNMENT_CENTER))
	return badge

static func _badge(text: String, color: Color) -> Control:
	var panel := _panel(Color(0.036, 0.036, 0.034, 0.78), Color(0.240, 0.210, 0.150, 0.54), 2)
	var margin := UI_COMPONENT_FACTORY.make_recruit_formal_pack_small_badge_margin()
	panel.add_child(margin)
	margin.add_child(_compact_label(text, UI_COMPONENT_FACTORY.recruit_formal_pack_small_badge_font_size(), color))
	return panel

static func _empty_panel(title: String, description: String) -> Control:
	var panel := _panel(BG_CARD, BORDER, 4)
	panel.custom_minimum_size = UI_COMPONENT_FACTORY.recruit_formal_pack_empty_panel_size()
	var margin := _margin(18, 16, 18, 16)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)
	column.add_child(_compact_label(title, UI_COMPONENT_FACTORY.recruit_formal_pack_empty_panel_title_font_size(), TEXT_GOLD, HORIZONTAL_ALIGNMENT_CENTER))
	column.add_child(_label(description, UI_COMPONENT_FACTORY.recruit_formal_pack_empty_panel_body_font_size(), TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	return panel

static func _vertical_text(text: String) -> String:
	var result: Array[String] = []
	for index in range(text.length()):
		result.append(text.substr(index, 1))
	return "\n".join(result)

static func _dictionary_array(raw_value: Variant) -> Array:
	var result: Array = []
	if not (raw_value is Array):
		return result
	for item in raw_value as Array:
		if item is Dictionary:
			result.append((item as Dictionary).duplicate(true))
	return result

static func _compact_label(text: String, size: int, color: Color, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	var label := _label(text, size, color, align)
	label.autowrap_mode = TextServer.AUTOWRAP_OFF
	label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	label.clip_text = true
	return label

static func _label(text: String, size: int, color: Color, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	return UI_COMPONENT_FACTORY.make_label(text, size, color, align)

static func _panel(bg: Color, border: Color, radius: int = 4) -> PanelContainer:
	return UI_COMPONENT_FACTORY.make_panel(bg, border, radius)

static func _margin(left: int, top: int, right: int, bottom: int) -> MarginContainer:
	return UI_COMPONENT_FACTORY.make_margin(left, top, right, bottom)

static func _apply_button_style(button: Button, bg: Color, border: Color, font_color: Color) -> void:
	UI_COMPONENT_FACTORY.apply_button_style(button, bg, border, font_color, TEXT_MUTED, 2, 0.04, 0.06)
