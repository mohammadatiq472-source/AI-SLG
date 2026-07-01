extends RefCounted
class_name ChildPageBlockFactory

const CHILD_PAGE_FACTORY_VISUAL_MODE := "child_page_game_card_factory_v2"
const CHILD_PAGE_ICON_SEAL_MODE := "auto_title_seal_icons_v1"
const CHILD_PAGE_CARD_SURFACE_MODE := "layered_gold_card_surfaces_v1"
const CHILD_PAGE_ROW_VISUAL_MODE := "seal_left_card_table_rows_v1"
const CHILD_PAGE_GENERATED_BACKGROUND_MODE := "generated_section_background_layer_v1"
const CHILD_PAGE_REAL_UI_OVERLAY_MODE := "real_ui_on_translucent_game_panels_v1"
const CHILD_PAGE_BACKGROUND_FIT_MODE := "proportional_cover_crop_no_deform_v1"

var _uses_generated_background := false

func build_section_page(section_payload: Dictionary, action_callback: Callable = Callable()) -> Control:
	_emit_legacy_contract_warnings(section_payload)
	_uses_generated_background = str(section_payload.get("background_image_path", "")).strip_edges() != ""
	var root := VBoxContainer.new()
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_theme_constant_override("separation", 14)

	var summary_card := _build_summary_card(section_payload)
	if summary_card != null:
		root.add_child(summary_card)

	var body_row := HBoxContainer.new()
	body_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body_row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body_row.add_theme_constant_override("separation", 14)
	root.add_child(body_row)

	body_row.add_child(_build_item_card_panel(section_payload))
	body_row.add_child(_build_content_block_column(section_payload, action_callback))
	if _uses_generated_background:
		return _wrap_page_with_generated_background(root, section_payload)
	return root


func _wrap_page_with_generated_background(content: Control, section_payload: Dictionary) -> Control:
	var stage := Control.new()
	stage.name = "ChildPageGeneratedBackgroundStage"
	stage.custom_minimum_size = Vector2(0, int(section_payload.get("background_min_height", 650)))
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stage.clip_contents = true

	var background := TextureRect.new()
	background.name = "ChildPageGeneratedBackground"
	background.texture = _load_texture(str(section_payload.get("background_image_path", "")).strip_edges())
	background.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	background.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	background.modulate = Color(1.0, 0.97, 0.90, 0.95)
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fill_parent_rect(background)
	stage.add_child(background)

	var readability := ColorRect.new()
	readability.name = "ChildPageBackgroundReadabilityLayer"
	readability.color = Color(0.018, 0.013, 0.010, 0.34)
	readability.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fill_parent_rect(readability)
	stage.add_child(readability)

	var margin := MarginContainer.new()
	margin.name = "ChildPageRealUiOverlay"
	_apply_margin(margin, 16, 16, 16, 16)
	_fill_parent_rect(margin)
	stage.add_child(margin)
	margin.add_child(content)

	var sync_layers := func() -> void:
		_sync_child_background_layer_rect(stage, [background, readability, margin])
	stage.resized.connect(sync_layers)
	sync_layers.call()
	return stage


func _emit_legacy_contract_warnings(section_payload: Dictionary) -> void:
	if not OS.is_debug_build():
		return
	var legacy_keys: Array[String] = []
	if str(section_payload.get("section_summary", "")).strip_edges() != "":
		legacy_keys.append("section_summary")
	if not _coerce_string_array(section_payload.get("items", [])).is_empty():
		legacy_keys.append("items")
	if not _coerce_string_array(section_payload.get("detail_lines", [])).is_empty():
		legacy_keys.append("detail_lines")
	if not _coerce_string_array(section_payload.get("footer_lines", [])).is_empty():
		legacy_keys.append("footer_lines")
	var actions_variant: Variant = section_payload.get("actions", [])
	if actions_variant is Array and not (actions_variant as Array).is_empty():
		legacy_keys.append("actions")
	if legacy_keys.is_empty():
		return
	var page_id := str(section_payload.get("page_id", section_payload.get("id", section_payload.get("title", "unknown_page")))).strip_edges()
	if page_id == "":
		page_id = "unknown_page"
	var message := (
		"ChildPageBlockFactory received legacy top-level fields for %s: %s. UI mainline must provide explicit summary_lines/item_cards/content_blocks and button_row blocks only."
		% [page_id, ", ".join(legacy_keys)]
	)
	push_error(message)
	assert(false, message)

func _build_summary_card(section_payload: Dictionary) -> Control:
	var title := str(section_payload.get("summary_title", section_payload.get("title", ""))).strip_edges()
	if title == "":
		return null
	var summary_lines := _coerce_string_array(section_payload.get("summary_lines", []))
	if summary_lines.is_empty():
		summary_lines = ["当前切项已进入 child page 结构化展示。"]

	var panel := PanelContainer.new()
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 88)
	_apply_panel_linework(panel, Color(0.118, 0.075, 0.036, 0.95), Color(0.86, 0.62, 0.28, 0.78))

	var margin := MarginContainer.new()
	_apply_margin(margin, 16, 14, 16, 14)
	panel.add_child(margin)

	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 14)
	margin.add_child(row)

	row.add_child(_build_seal_icon(title, Color(0.64, 0.40, 0.15, 0.94), Vector2(58, 58)))

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 7)
	row.add_child(column)

	column.add_child(_build_label(title, 22, Color(1.0, 0.92, 0.72, 0.98)))
	for summary_line in summary_lines:
		column.add_child(_build_label(summary_line, 14, Color(0.90, 0.84, 0.70, 0.96), true))
	return panel

func _build_item_card_panel(section_payload: Dictionary) -> Control:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(300, 0)
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_apply_panel_linework(panel, Color(0.086, 0.056, 0.030, 0.94), Color(0.72, 0.50, 0.22, 0.70))

	var margin := MarginContainer.new()
	_apply_margin(margin, 12, 12, 12, 12)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)

	column.add_child(_build_label(str(section_payload.get("list_title", "列表")), 18, Color(0.98, 0.88, 0.66, 0.98)))

	var cards_grid := GridContainer.new()
	cards_grid.columns = 1
	cards_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cards_grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	cards_grid.add_theme_constant_override("h_separation", 8)
	cards_grid.add_theme_constant_override("v_separation", 10)
	column.add_child(cards_grid)

	var item_cards := _resolve_item_cards(section_payload)
	if item_cards.is_empty():
		cards_grid.add_child(_build_text_block(
			{
				"title": "当前项",
				"lines": ["暂无切项内容。"],
				"node_name": "ChildPageEmptyItemBlock",
			}
		))
	else:
		for card_variant in item_cards:
			if not (card_variant is Dictionary):
				continue
			cards_grid.add_child(_build_item_card(card_variant as Dictionary))
	return panel

func _build_content_block_column(section_payload: Dictionary, action_callback: Callable = Callable()) -> Control:
	var panel := PanelContainer.new()
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_apply_panel_linework(panel, Color(0.078, 0.050, 0.027, 0.94), Color(0.72, 0.50, 0.22, 0.64))

	var margin := MarginContainer.new()
	_apply_margin(margin, 14, 14, 14, 14)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)

	for block_variant in _resolve_content_blocks(section_payload):
		if not (block_variant is Dictionary):
			continue
		var block_payload := block_variant as Dictionary
		var kind := str(block_payload.get("kind", "text_block")).strip_edges()
		match kind:
			"button_row":
				column.add_child(_build_action_block(block_payload, action_callback))
			"table_block":
				column.add_child(_build_table_block(block_payload))
			"card_grid":
				column.add_child(_build_card_grid_block(block_payload))
			_:
				column.add_child(_build_text_block(block_payload))
	return panel

func _build_item_card(card_payload: Dictionary) -> Control:
	var panel := PanelContainer.new()
	var node_name := str(card_payload.get("node_name", "")).strip_edges()
	if node_name != "":
		panel.name = node_name
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 90)
	_apply_panel_linework(panel, Color(0.150, 0.088, 0.038, 0.94), Color(0.86, 0.60, 0.24, 0.78))

	var margin := MarginContainer.new()
	_apply_margin(margin, 10, 10, 12, 10)
	panel.add_child(margin)

	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)
	margin.add_child(row)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 4)

	var title := str(card_payload.get("title", "")).strip_edges()
	var value := str(card_payload.get("value", "")).strip_edges()
	var meta := str(card_payload.get("meta", "")).strip_edges()
	var description := str(card_payload.get("description", "")).strip_edges()
	row.add_child(_build_seal_icon(title if title != "" else value, _resolve_card_accent(card_payload), Vector2(44, 44)))
	row.add_child(column)
	if title != "":
		column.add_child(_build_label(title, 15, Color(1.0, 0.92, 0.72, 0.98)))
	if value != "":
		column.add_child(_build_label(value, 16, Color(1.00, 0.74, 0.30, 0.98), true))
	if meta != "":
		column.add_child(_build_label(meta, 12, Color(0.78, 0.88, 0.72, 0.96), true))
	if description != "":
		column.add_child(_build_label(description, 12, Color(0.84, 0.78, 0.66, 0.94), true))
	return panel

func _build_table_block(block_payload: Dictionary) -> Control:
	var panel := PanelContainer.new()
	var node_name := str(block_payload.get("node_name", "")).strip_edges()
	if node_name != "":
		panel.name = node_name
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_apply_panel_linework(panel, Color(0.098, 0.062, 0.030, 0.94), Color(0.82, 0.58, 0.24, 0.72))

	var margin := MarginContainer.new()
	_apply_margin(margin, 12, 12, 12, 12)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)

	var title := str(block_payload.get("title", "")).strip_edges()
	if title != "":
		column.add_child(_build_label(title, 19, Color(0.98, 0.88, 0.66, 0.98)))

	var columns := _resolve_table_columns(block_payload)
	var rows := _resolve_table_rows(block_payload)
	if columns.is_empty():
		column.add_child(_build_label("暂无表格列。", 13, Color(0.86, 0.80, 0.68, 0.96), true))
		return panel

	var table := VBoxContainer.new()
	table.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	table.add_theme_constant_override("separation", 4)
	column.add_child(table)
	table.add_child(_build_table_row(columns, {}, true))
	if rows.is_empty():
		table.add_child(_build_label("暂无记录。", 13, Color(0.86, 0.80, 0.68, 0.96), true))
	else:
		for row_variant in rows:
			if row_variant is Dictionary:
				table.add_child(_build_table_row(columns, row_variant as Dictionary, false))
	return panel


func _build_table_row(columns: Array, row_payload: Dictionary, is_header: bool) -> Control:
	var row_panel := PanelContainer.new()
	row_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row_panel.custom_minimum_size = Vector2(0, 44 if is_header else 72)
	var bg_color := Color(0.190, 0.118, 0.050, 0.92) if is_header else Color(0.116, 0.070, 0.034, 0.78)
	var border_color := Color(0.88, 0.64, 0.28, 0.66) if is_header else Color(0.70, 0.48, 0.22, 0.50)
	_apply_panel_linework(row_panel, bg_color, border_color)

	var margin := MarginContainer.new()
	_apply_margin(margin, 8, 7, 10, 7)
	row_panel.add_child(margin)

	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 8)
	margin.add_child(row)

	if not is_header:
		row.add_child(_build_vertical_accent(_resolve_row_accent(row_payload)))
		var first_label := _first_table_cell_text(columns, row_payload)
		row.add_child(_build_seal_icon(first_label, _resolve_row_accent(row_payload), Vector2(38, 38)))

	for column_variant in columns:
		if not (column_variant is Dictionary):
			continue
		var column_payload: Dictionary = column_variant as Dictionary
		var column_id := str(column_payload.get("id", "")).strip_edges()
		var label_text := str(column_payload.get("label", column_id)).strip_edges()
		var cell_text := label_text if is_header else str(row_payload.get(column_id, "")).strip_edges()
		var cell := _build_label(cell_text, 14 if is_header else 13, Color(1.0, 0.88, 0.62, 0.98) if is_header else Color(0.90, 0.84, 0.72, 0.96), true)
		cell.custom_minimum_size = Vector2(int(column_payload.get("min_width", 86)), 0)
		cell.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(cell)
	return row_panel


func _build_card_grid_block(block_payload: Dictionary) -> Control:
	var panel := PanelContainer.new()
	var node_name := str(block_payload.get("node_name", "")).strip_edges()
	if node_name != "":
		panel.name = node_name
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_apply_panel_linework(panel, Color(0.098, 0.062, 0.030, 0.94), Color(0.82, 0.58, 0.24, 0.72))

	var margin := MarginContainer.new()
	_apply_margin(margin, 12, 12, 12, 12)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)

	var title := str(block_payload.get("title", "")).strip_edges()
	if title != "":
		column.add_child(_build_label(title, 19, Color(0.98, 0.88, 0.66, 0.98)))

	var grid := GridContainer.new()
	grid.columns = maxi(1, int(block_payload.get("columns", 2)))
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 12)
	column.add_child(grid)

	var cards := _resolve_grid_cards(block_payload)
	if cards.is_empty():
		grid.add_child(_build_text_block({
			"title": "暂无卡片",
			"lines": ["当前结构位等待组织数据。"],
			"node_name": "ChildPageCardGridEmptyBlock",
		}))
	else:
		for card_variant in cards:
			if card_variant is Dictionary:
				grid.add_child(_build_item_card(card_variant as Dictionary))
	return panel


func _build_text_block(block_payload: Dictionary) -> Control:
	var panel := PanelContainer.new()
	var node_name := str(block_payload.get("node_name", "")).strip_edges()
	if node_name != "":
		panel.name = node_name
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_apply_panel_linework(panel, Color(0.086, 0.054, 0.028, 0.86), Color(0.62, 0.44, 0.22, 0.50))

	var margin := MarginContainer.new()
	_apply_margin(margin, 12, 12, 12, 12)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 6)
	margin.add_child(column)

	var title := str(block_payload.get("title", "")).strip_edges()
	if title != "":
		column.add_child(_build_label(title, 16, Color(0.96, 0.86, 0.66, 0.98)))
	for line in _coerce_string_array(block_payload.get("lines", [])):
		column.add_child(_build_label(line, 13, Color(0.86, 0.80, 0.68, 0.96), true))
	return panel

func _build_action_block(block_payload: Dictionary, action_callback: Callable = Callable()) -> Control:
	var panel := PanelContainer.new()
	var node_name := str(block_payload.get("node_name", "")).strip_edges()
	if node_name != "":
		panel.name = node_name
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_apply_panel_linework(panel, Color(0.108, 0.066, 0.030, 0.94), Color(0.82, 0.58, 0.24, 0.72))

	var margin := MarginContainer.new()
	_apply_margin(margin, 12, 12, 12, 12)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)

	var title := str(block_payload.get("title", "动作")).strip_edges()
	column.add_child(_build_label(title, 15, Color(0.96, 0.86, 0.66, 0.98)))

	var wrap := HFlowContainer.new()
	wrap.add_theme_constant_override("h_separation", 8)
	wrap.add_theme_constant_override("v_separation", 8)
	wrap.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_child(wrap)

	var actions := block_payload.get("actions", []) as Array
	for action_variant in actions:
		if not (action_variant is Dictionary):
			continue
		var action_payload := action_variant as Dictionary
		var action_id := str(action_payload.get("id", "")).strip_edges()
		if action_id == "":
			continue
		var button := Button.new()
		button.text = str(action_payload.get("label", action_id))
		button.disabled = bool(action_payload.get("disabled", false))
		button.custom_minimum_size = Vector2(126, 48)
		button.add_theme_font_size_override("font_size", 15)
		button.add_theme_stylebox_override("normal", _make_button_style(Color(0.176, 0.102, 0.044, 0.96), Color(0.88, 0.62, 0.26, 0.76)))
		button.add_theme_stylebox_override("hover", _make_button_style(Color(0.240, 0.142, 0.060, 0.98), Color(1.00, 0.74, 0.32, 0.92)))
		button.add_theme_stylebox_override("pressed", _make_button_style(Color(0.104, 0.062, 0.030, 0.98), Color(1.00, 0.80, 0.42, 0.98)))
		button.add_theme_stylebox_override("disabled", _make_button_style(Color(0.060, 0.054, 0.046, 0.80), Color(0.30, 0.26, 0.20, 0.62)))
		if action_callback.is_valid():
			button.pressed.connect(action_callback.bind(action_id))
		wrap.add_child(button)
	return panel

func _resolve_item_cards(section_payload: Dictionary) -> Array:
	var raw_cards: Variant = section_payload.get("item_cards", [])
	if raw_cards is Array and not (raw_cards as Array).is_empty():
		return raw_cards as Array
	return []

func _resolve_content_blocks(section_payload: Dictionary) -> Array:
	var raw_blocks: Variant = section_payload.get("content_blocks", [])
	if raw_blocks is Array and not (raw_blocks as Array).is_empty():
		return raw_blocks as Array
	return [{
		"kind": "text_block",
		"title": "当前页",
		"lines": ["当前切项还没有可显示内容。"],
		"node_name": "ChildPageFallbackBlock",
	}]


func _resolve_table_columns(block_payload: Dictionary) -> Array:
	var raw_columns: Variant = block_payload.get("columns", [])
	if raw_columns is Array:
		return raw_columns as Array
	return []


func _resolve_table_rows(block_payload: Dictionary) -> Array:
	var raw_rows: Variant = block_payload.get("rows", [])
	if raw_rows is Array:
		return raw_rows as Array
	return []


func _resolve_grid_cards(block_payload: Dictionary) -> Array:
	var raw_cards: Variant = block_payload.get("cards", [])
	if raw_cards is Array:
		return raw_cards as Array
	return []


func _has_nonempty_array(raw_value: Variant) -> bool:
	return raw_value is Array and not (raw_value as Array).is_empty()


func _coerce_string_array(raw_value: Variant) -> Array[String]:
	var result: Array[String] = []
	if raw_value is Array:
		for item in raw_value as Array:
			var text := str(item).strip_edges()
			if text != "":
				result.append(text)
	return result


func _first_table_cell_text(columns: Array, row_payload: Dictionary) -> String:
	for column_variant in columns:
		if not (column_variant is Dictionary):
			continue
		var column_payload := column_variant as Dictionary
		var column_id := str(column_payload.get("id", "")).strip_edges()
		if column_id == "":
			continue
		var cell_text := str(row_payload.get(column_id, "")).strip_edges()
		if cell_text != "":
			return cell_text
	return ""


func _resolve_card_accent(card_payload: Dictionary) -> Color:
	var combined := "%s %s %s %s" % [
		str(card_payload.get("title", "")),
		str(card_payload.get("value", "")),
		str(card_payload.get("meta", "")),
		str(card_payload.get("description", "")),
	]
	return _resolve_text_accent(combined)


func _resolve_row_accent(row_payload: Dictionary) -> Color:
	var combined := "%s %s %s %s %s" % [
		str(row_payload.get("role", "")),
		str(row_payload.get("relation", "")),
		str(row_payload.get("type", "")),
		str(row_payload.get("status", "")),
		str(row_payload.get("event", "")),
	]
	return _resolve_text_accent(combined)


func _resolve_text_accent(text: String) -> Color:
	var normalized := text.strip_edges().to_lower()
	if normalized.contains("敌") or normalized.contains("war") or normalized.contains("hostile") or normalized.contains("enemy"):
		return Color(0.78, 0.18, 0.12, 0.96)
	if normalized.contains("友") or normalized.contains("ally") or normalized.contains("friendly") or normalized.contains("ceasefire"):
		return Color(0.24, 0.54, 0.86, 0.96)
	if normalized.contains("盟主") or normalized.contains("主控") or normalized.contains("政策") or normalized.contains("国家"):
		return Color(0.92, 0.64, 0.18, 0.96)
	if normalized.contains("军") or normalized.contains("战") or normalized.contains("指挥"):
		return Color(0.70, 0.32, 0.18, 0.96)
	if normalized.contains("市") or normalized.contains("粮") or normalized.contains("木") or normalized.contains("资源"):
		return Color(0.38, 0.62, 0.28, 0.96)
	return Color(0.64, 0.40, 0.15, 0.96)


func _build_vertical_accent(color: Color) -> Control:
	var accent := ColorRect.new()
	accent.color = color
	accent.custom_minimum_size = Vector2(4, 0)
	accent.size_flags_vertical = Control.SIZE_EXPAND_FILL
	return accent


func _build_seal_icon(text: String, color: Color, min_size: Vector2) -> Control:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = min_size
	panel.add_theme_stylebox_override("panel", _make_seal_style(color))
	var center := CenterContainer.new()
	panel.add_child(center)
	var label := _build_label(_derive_icon_text(text), int(maxi(15, int(min_size.x * 0.34))), Color(1.0, 0.90, 0.66, 0.98))
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	center.add_child(label)
	return panel


func _derive_icon_text(text: String) -> String:
	var trimmed := text.strip_edges()
	if trimmed == "":
		return "令"
	var first := trimmed.substr(0, 1)
	if first == "":
		return "令"
	return first


func _load_texture(asset_path: String) -> Texture2D:
	if asset_path == "":
		return null
	if ResourceLoader.exists(asset_path) and _can_load_texture_resource_without_import_cache_error(asset_path):
		var resource := load(asset_path)
		if resource is Texture2D:
			return resource as Texture2D
	var image_path := asset_path
	if asset_path.begins_with("res://"):
		image_path = ProjectSettings.globalize_path(asset_path)
	if not FileAccess.file_exists(image_path):
		return null
	var image := Image.new()
	var load_error := image.load(image_path)
	if load_error != OK:
		return null
	return ImageTexture.create_from_image(image)


func _can_load_texture_resource_without_import_cache_error(texture_path: String) -> bool:
	if not texture_path.to_lower().ends_with(".png"):
		return true
	var import_path := texture_path + ".import"
	if not FileAccess.file_exists(import_path):
		return true
	var import_file := FileAccess.open(import_path, FileAccess.READ)
	if import_file == null:
		return false
	var import_text := import_file.get_as_text()
	import_file.close()
	var marker := "dest_files=[\""
	var start := import_text.find(marker)
	if start < 0:
		return false
	start += marker.length()
	var end := import_text.find("\"", start)
	if end <= start:
		return false
	var imported_texture_path := import_text.substr(start, end - start)
	if FileAccess.file_exists(imported_texture_path):
		return true
	if imported_texture_path.begins_with("res://"):
		return FileAccess.file_exists(ProjectSettings.globalize_path(imported_texture_path))
	return false


func _fill_parent_rect(control: Control) -> void:
	control.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	control.offset_left = 0.0
	control.offset_top = 0.0
	control.offset_right = 0.0
	control.offset_bottom = 0.0


func _sync_child_background_layer_rect(parent: Control, layers: Array) -> void:
	for raw_layer in layers:
		var layer := raw_layer as Control
		if layer == null:
			continue
		layer.position = Vector2.ZERO
		layer.size = parent.size


func _make_seal_style(color: Color) -> StyleBoxFlat:
	var style_box := StyleBoxFlat.new()
	style_box.bg_color = Color(color.r * 0.46, color.g * 0.46, color.b * 0.46, 0.92)
	style_box.border_color = Color(color.r, color.g, color.b, 0.95)
	style_box.set_border_width_all(1)
	style_box.corner_radius_top_left = 4
	style_box.corner_radius_top_right = 4
	style_box.corner_radius_bottom_left = 4
	style_box.corner_radius_bottom_right = 4
	return style_box


func _make_button_style(bg_color: Color, border_color: Color) -> StyleBoxFlat:
	var style_box := StyleBoxFlat.new()
	style_box.bg_color = bg_color
	style_box.border_color = border_color
	style_box.set_border_width_all(1)
	style_box.corner_radius_top_left = 4
	style_box.corner_radius_top_right = 4
	style_box.corner_radius_bottom_left = 4
	style_box.corner_radius_bottom_right = 4
	return style_box


func _build_label(text: String, font_size: int, color: Color, wrap: bool = false) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if wrap else TextServer.AUTOWRAP_OFF
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return label

func _apply_margin(container: MarginContainer, left: int, top: int, right: int, bottom: int) -> void:
	container.add_theme_constant_override("margin_left", left)
	container.add_theme_constant_override("margin_top", top)
	container.add_theme_constant_override("margin_right", right)
	container.add_theme_constant_override("margin_bottom", bottom)

func _apply_panel_linework(panel: PanelContainer, bg_color: Color, border_color: Color) -> void:
	var style_box := StyleBoxFlat.new()
	if _uses_generated_background:
		style_box.bg_color = Color(bg_color.r, bg_color.g, bg_color.b, minf(bg_color.a, 0.72))
		style_box.border_color = Color(border_color.r, border_color.g, border_color.b, minf(border_color.a, 0.62))
	else:
		style_box.bg_color = bg_color
		style_box.border_color = border_color
	style_box.set_border_width_all(1)
	style_box.corner_radius_top_left = 4
	style_box.corner_radius_top_right = 4
	style_box.corner_radius_bottom_left = 4
	style_box.corner_radius_bottom_right = 4
	style_box.shadow_color = Color(0.0, 0.0, 0.0, 0.18)
	style_box.shadow_size = 4
	panel.add_theme_stylebox_override("panel", style_box)
