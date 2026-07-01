extends PanelContainer
class_name BuildUpgradeSheet

signal primary_action_requested(action_id: String)
signal secondary_action_requested(action_id: String)
signal close_requested

const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")

@export var body_font_size: int = 14

const DEFAULT_SHEET_CONTRACT := {
	"title": "建造 / 升级说明",
	"subtitle": "请选择一个建筑项查看建造、升级和条件说明。",
	"body": "当前没有选中任何建筑项。",
	"cost_summary": "消耗：--",
	"effect_summary": "效果：--",
	"primary_action_label": "确认",
	"secondary_action_label": "取消",
	"close_button_label": "关闭",
	"empty_state_text": "等待建造说明。",
	"has_payload": false,
	"primary_action_priority": "primary_hot_enabled_payload_only",
	"submitted_state_visible": false,
	"template_feedback_visible": false,
	"primary_action_enabled": true,
	"secondary_action_enabled": true,
	"secondary_action_visible": true,
	"close_button_visible": true,
	"state_label": "",
	"presentation_mode": "facility_tree_mobile_wide_drawer_v2",
	"body_mode": "resource_effect_rows_v1",
	"summary_text": "",
	"level_text": "",
	"status_text": "",
	"cost_items": [],
	"effect_items": [],
	"building_icon_path": "",
	"engineering_copy_visible": false,
	"detail_rows_mode": "two_row_resource_effect_v1",
}

@onready var _title_label: Label = $BodyMargin/BodyVBox/HeaderRow/TitleLabel
@onready var _subtitle_label: Label = $BodyMargin/BodyVBox/HeaderRow/SubtitleLabel
@onready var _close_button: Button = $BodyMargin/BodyVBox/HeaderRow/CloseButton
@onready var _empty_state_label: Label = $BodyMargin/BodyVBox/PlaceholderLabel
@onready var _body_label: Label = $BodyMargin/BodyVBox/SheetBody
@onready var _cost_label: Label = $BodyMargin/BodyVBox/CostLabel
@onready var _effect_label: Label = $BodyMargin/BodyVBox/EffectLabel
@onready var _primary_button: Button = $BodyMargin/BodyVBox/ActionRow/PrimaryButton
@onready var _secondary_button: Button = $BodyMargin/BodyVBox/ActionRow/SecondaryButton

var _state_label: Label = null
var _detail_rows: VBoxContainer = null
var _building_icon: TextureRect = null
var _building_level_label: Label = null
var _cost_pill_count: int = 0
var _effect_pill_count: int = 0
var _cost_pill_text := ""
var _has_payload: bool = false
var _sheet_contract: Dictionary = DEFAULT_SHEET_CONTRACT.duplicate(true)
var _is_ready: bool = false

func _ready() -> void:
	_is_ready = true
	_ensure_state_label()
	_ensure_mobile_detail_rows()
	_apply_reference_style()
	_refresh_view()
	_primary_button.pressed.connect(_on_primary_pressed)
	_secondary_button.pressed.connect(_on_secondary_pressed)
	_close_button.pressed.connect(_on_close_pressed)

func set_sheet_contract(sheet_contract: Dictionary) -> void:
	_sheet_contract = DEFAULT_SHEET_CONTRACT.duplicate(true)
	for key_variant in sheet_contract.keys():
		var key := str(key_variant)
		_sheet_contract[key] = sheet_contract.get(key_variant)
	var body_text := str(_sheet_contract.get("body", "")).strip_edges()
	if bool(_sheet_contract.get("has_payload", false)):
		_has_payload = true
	else:
		_has_payload = body_text != ""
	if _is_ready:
		_refresh_view()

func clear_sheet() -> void:
	set_sheet_contract(DEFAULT_SHEET_CONTRACT.duplicate(true))

func get_visual_smoke_summary() -> Dictionary:
	var subtitle := str(_sheet_contract.get("subtitle", ""))
	var body := str(_sheet_contract.get("body", ""))
	var template_feedback_visible := _is_template_feedback_visible(body)
	var submitted_state_visible := _is_submitted_state_visible(subtitle)
	var state_text := _state_label.text if _is_ready and _state_label != null and _state_label.visible else ""
	var presentation_mode := str(_sheet_contract.get("presentation_mode", "facility_tree_mobile_wide_drawer_v2"))
	var body_mode := str(_sheet_contract.get("body_mode", "resource_effect_rows_v1"))
	var engineering_copy_visible := _scan_visible_engineering_copy()
	var secondary_visible := _secondary_button != null and _secondary_button.visible and _secondary_button.is_visible_in_tree()
	var primary_visible := _primary_button != null and _primary_button.visible and _primary_button.is_visible_in_tree()
	var close_visible := _close_button != null and _close_button.visible and _close_button.is_visible_in_tree()
	var icon_visible := _building_icon != null and _building_icon.visible and _building_icon.is_visible_in_tree() and _building_icon.texture != null
	return {
		"hasPayload": _has_payload,
		"primaryButtonDisabled": _primary_button.disabled if _is_ready and _primary_button != null else not _has_payload,
		"secondaryButtonDisabled": _secondary_button.disabled if _is_ready and _secondary_button != null else not _has_payload,
		"actionStateToken": UI_COMPONENT_FACTORY.INTERIOR_UPGRADE_SHEET_ACTION_STATE_TOKEN,
		"primaryActionPriority": str(_sheet_contract.get("primary_action_priority", "primary_hot_enabled_payload_only")),
		"templateFeedbackVisible": template_feedback_visible,
		"upgradeSheetTemplateFeedbackVisible": template_feedback_visible,
		"submittedStateVisible": submitted_state_visible,
		"upgradeSheetSubmittedBadgeVisible": submitted_state_visible and _state_label != null and _state_label.visible,
		"upgradeSheetActionStateText": state_text,
		"upgradeSheetToken": UI_COMPONENT_FACTORY.main_city_facility_upgrade_drawer_token(),
		"upgradeSheetPresentationMode": presentation_mode,
		"upgradeSheetBodyMode": body_mode,
		"upgradeSheetEngineeringCopyVisible": engineering_copy_visible,
		"upgradeSheetTopTitleVisible": _title_label != null and _title_label.visible and _title_label.is_visible_in_tree(),
		"upgradeSheetLevelVisible": _detail_rows != null and _detail_rows.visible and str(_sheet_contract.get("level_text", "")).strip_edges() != "",
		"upgradeSheetCostPillCount": _cost_pill_count,
		"upgradeSheetCostPillText": _cost_pill_text,
		"upgradeSheetEffectPillCount": _effect_pill_count,
		"upgradeSheetCostDataSource": str(_sheet_contract.get("cost_data_source", "summary_text")),
		"upgradeSheetEffectDataSource": str(_sheet_contract.get("effect_data_source", "summary_text")),
		"upgradeSheetPrimaryButtonVisible": primary_visible,
		"upgradeSheetSecondaryButtonVisible": secondary_visible,
		"upgradeSheetCloseButtonVisible": close_visible,
		"upgradeSheetBuildingIconVisible": icon_visible,
		"upgradeSheetBuildingLevelUnderIconVisible": _building_level_label != null and _building_level_label.visible and _building_level_label.is_visible_in_tree(),
		"upgradeSheetBuildingLevelText": _building_level_label.text if _building_level_label != null else "",
		"upgradeSheetConsumerCopyMode": "cost_effect_only" if _is_consumer_focus_mode() else "detail_copy",
		"upgradeSheetTitleFontSize": UI_COMPONENT_FACTORY.interior_upgrade_sheet_title_font_size(),
		"upgradeSheetDetailRowsMode": str(_sheet_contract.get("detail_rows_mode", "two_row_resource_effect_v1")),
		"upgradeSheetActionRowInViewport": _is_control_rect_inside_viewport(_primary_button) and ((not secondary_visible) or _is_control_rect_inside_viewport(_secondary_button)),
		"upgradeSheetBottomWithinViewport": _is_control_rect_inside_viewport(self),
	}

func focus_first_action() -> void:
	if not _is_ready:
		return
	if _primary_button != null and not _primary_button.disabled:
		_primary_button.grab_focus()
		return
	if _secondary_button != null and not _secondary_button.disabled:
		_secondary_button.grab_focus()
		return
	if _close_button != null and not _close_button.disabled:
		_close_button.grab_focus()

func _refresh_view() -> void:
	if not _is_ready or _title_label == null:
		return
	_ensure_state_label()
	_ensure_mobile_detail_rows()
	_ensure_building_icon()
	_ensure_building_level_label()
	_title_label.text = str(_sheet_contract.get("title", DEFAULT_SHEET_CONTRACT.title))
	_title_label.visible = not _is_consumer_focus_mode()
	_subtitle_label.text = str(_sheet_contract.get("subtitle", DEFAULT_SHEET_CONTRACT.subtitle))
	_subtitle_label.visible = not _is_consumer_focus_mode()
	_close_button.text = str(_sheet_contract.get("close_button_label", DEFAULT_SHEET_CONTRACT.close_button_label))
	_empty_state_label.text = str(_sheet_contract.get("empty_state_text", DEFAULT_SHEET_CONTRACT.empty_state_text))
	var mobile_drawer_mode := _is_mobile_drawer_mode()
	var summary_text := str(_sheet_contract.get("summary_text", "")).strip_edges()
	if summary_text == "":
		summary_text = str(_sheet_contract.get("body", DEFAULT_SHEET_CONTRACT.body)).strip_edges()
	_body_label.text = summary_text
	_body_label.add_theme_font_size_override("font_size", body_font_size)
	_body_label.size_flags_vertical = Control.SIZE_SHRINK_BEGIN if mobile_drawer_mode else Control.SIZE_EXPAND_FILL
	_cost_label.text = str(_sheet_contract.get("cost_summary", DEFAULT_SHEET_CONTRACT.cost_summary))
	_effect_label.text = str(_sheet_contract.get("effect_summary", DEFAULT_SHEET_CONTRACT.effect_summary))
	_primary_button.text = str(_sheet_contract.get("primary_action_label", DEFAULT_SHEET_CONTRACT.primary_action_label))
	_secondary_button.text = str(_sheet_contract.get("secondary_action_label", DEFAULT_SHEET_CONTRACT.secondary_action_label))
	var submitted_state_visible := _is_submitted_state_visible(str(_sheet_contract.get("subtitle", "")))
	var template_feedback_visible := _is_template_feedback_visible(str(_sheet_contract.get("body", "")))
	_state_label.text = _build_state_label_text(submitted_state_visible, template_feedback_visible)
	_state_label.visible = _has_payload and (submitted_state_visible or template_feedback_visible)
	_apply_action_priority()
	_empty_state_label.visible = not _has_payload
	_body_label.visible = _has_payload and not _is_consumer_focus_mode()
	_cost_label.visible = _has_payload and not mobile_drawer_mode
	_effect_label.visible = _has_payload and not mobile_drawer_mode
	_refresh_building_icon()
	_refresh_building_level_label()
	_refresh_mobile_detail_rows(mobile_drawer_mode)
	var primary_action_enabled := bool(_sheet_contract.get("primary_action_enabled", true))
	var secondary_action_enabled := bool(_sheet_contract.get("secondary_action_enabled", true))
	_primary_button.disabled = (not _has_payload) or submitted_state_visible or (not primary_action_enabled)
	_secondary_button.disabled = (not _has_payload) or (not secondary_action_enabled)
	_secondary_button.visible = bool(_sheet_contract.get("secondary_action_visible", true)) and not _is_consumer_focus_mode()
	_close_button.visible = bool(_sheet_contract.get("close_button_visible", true)) and not _is_consumer_focus_mode()
	_apply_reference_style()


func _apply_reference_style() -> void:
	UI_COMPONENT_FACTORY.apply_interior_upgrade_sheet_panel_style(self)
	UI_COMPONENT_FACTORY.apply_interior_upgrade_sheet_title_style(_title_label)
	UI_COMPONENT_FACTORY.apply_interior_upgrade_sheet_body_style(_subtitle_label)
	UI_COMPONENT_FACTORY.apply_interior_upgrade_sheet_body_style(_empty_state_label)
	UI_COMPONENT_FACTORY.apply_interior_upgrade_sheet_body_style(_body_label)
	UI_COMPONENT_FACTORY.apply_interior_upgrade_sheet_body_style(_cost_label)
	UI_COMPONENT_FACTORY.apply_interior_upgrade_sheet_body_style(_effect_label)
	UI_COMPONENT_FACTORY.apply_interior_upgrade_sheet_state_label_style(_state_label, _is_submitted_state_visible(str(_sheet_contract.get("subtitle", ""))))
	_apply_action_priority()
	UI_COMPONENT_FACTORY.apply_interior_upgrade_sheet_action_button_style(_close_button, false)
	if _detail_rows != null:
		_detail_rows.add_theme_constant_override("separation", UI_COMPONENT_FACTORY.main_city_facility_upgrade_drawer_card_spacing())

func _apply_action_priority() -> void:
	var priority := str(_sheet_contract.get("primary_action_priority", "primary_hot_enabled_payload_only")).to_lower()
	var submitted_state_visible := _is_submitted_state_visible(str(_sheet_contract.get("subtitle", "")))
	var primary_action_enabled := bool(_sheet_contract.get("primary_action_enabled", true))
	var use_primary_style := _has_payload and primary_action_enabled and not submitted_state_visible and priority != "secondary"
	UI_COMPONENT_FACTORY.apply_interior_upgrade_sheet_action_button_style(_primary_button, use_primary_style)
	UI_COMPONENT_FACTORY.apply_interior_upgrade_sheet_action_button_style(_secondary_button, not use_primary_style)

func _on_primary_pressed() -> void:
	if _has_payload and not _primary_button.disabled:
		primary_action_requested.emit(str(_sheet_contract.get("primary_action_label", DEFAULT_SHEET_CONTRACT.primary_action_label)))

func _on_secondary_pressed() -> void:
	if _has_payload and not _secondary_button.disabled:
		secondary_action_requested.emit(str(_sheet_contract.get("secondary_action_label", DEFAULT_SHEET_CONTRACT.secondary_action_label)))

func _on_close_pressed() -> void:
	close_requested.emit()


func _ensure_state_label() -> void:
	if _state_label != null:
		return
	_state_label = Label.new()
	_state_label.name = "UpgradeSheetStateLabel"
	_state_label.visible = false
	var body_vbox := _body_label.get_parent() as VBoxContainer if _body_label != null else null
	if body_vbox == null:
		return
	body_vbox.add_child(_state_label)
	body_vbox.move_child(_state_label, _body_label.get_index())


func _ensure_mobile_detail_rows() -> void:
	if _detail_rows != null:
		return
	var body_vbox := _body_label.get_parent() as VBoxContainer if _body_label != null else null
	if body_vbox == null:
		return
	_detail_rows = VBoxContainer.new()
	_detail_rows.name = "UpgradeSheetMobileDetailRows"
	_detail_rows.visible = false
	_detail_rows.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_detail_rows.add_theme_constant_override("separation", UI_COMPONENT_FACTORY.main_city_facility_upgrade_drawer_card_spacing())
	body_vbox.add_child(_detail_rows)
	body_vbox.move_child(_detail_rows, _cost_label.get_index())


func _ensure_building_icon() -> void:
	if _building_icon != null:
		return
	var body_vbox := _body_label.get_parent() as VBoxContainer if _body_label != null else null
	if body_vbox == null:
		return
	_building_icon = TextureRect.new()
	_building_icon.name = "UpgradeSheetBuildingIcon"
	_building_icon.visible = false
	_building_icon.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
	_building_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_building_icon.custom_minimum_size = Vector2(0.0, 270.0)
	_building_icon.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body_vbox.add_child(_building_icon)
	body_vbox.move_child(_building_icon, _empty_state_label.get_index())


func _refresh_building_icon() -> void:
	if _building_icon == null:
		return
	var icon_path := str(_sheet_contract.get("building_icon_path", "")).strip_edges()
	var focus_mode := _is_consumer_focus_mode()
	_building_icon.visible = focus_mode and _has_payload and icon_path != ""
	_building_icon.texture = null
	if not _building_icon.visible:
		return
	var image := Image.new()
	var image_path := ProjectSettings.globalize_path(icon_path) if icon_path.begins_with("res://") else icon_path
	if image.load(image_path) == OK:
		_building_icon.texture = ImageTexture.create_from_image(image)


func _ensure_building_level_label() -> void:
	if _building_level_label != null:
		return
	var body_vbox := _body_label.get_parent() as VBoxContainer if _body_label != null else null
	if body_vbox == null:
		return
	_building_level_label = Label.new()
	_building_level_label.name = "UpgradeSheetBuildingLevelUnderIcon"
	_building_level_label.visible = false
	_building_level_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	body_vbox.add_child(_building_level_label)
	if _building_icon != null:
		body_vbox.move_child(_building_level_label, _building_icon.get_index() + 1)


func _refresh_building_level_label() -> void:
	if _building_level_label == null:
		return
	var level_text := str(_sheet_contract.get("level_text", "")).strip_edges()
	_building_level_label.text = level_text
	_building_level_label.visible = _is_consumer_focus_mode() and _has_payload and level_text != ""
	UI_COMPONENT_FACTORY.apply_main_city_facility_upgrade_drawer_label_style(_building_level_label, "icon_level")


func _refresh_mobile_detail_rows(enabled: bool) -> void:
	_cost_pill_count = 0
	_effect_pill_count = 0
	_cost_pill_text = ""
	if _detail_rows == null:
		return
	for child in _detail_rows.get_children():
		child.queue_free()
	if not enabled or not _has_payload:
		_detail_rows.visible = false
		return
	_detail_rows.visible = true
	var level_text := str(_sheet_contract.get("level_text", "")).strip_edges()
	if not _is_consumer_focus_mode():
		var top_row := HBoxContainer.new()
		top_row.name = "UpgradeSheetDrawerTopRow"
		top_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		top_row.add_theme_constant_override("separation", UI_COMPONENT_FACTORY.main_city_facility_upgrade_drawer_card_spacing())
		_detail_rows.add_child(top_row)
		var status_text := str(_sheet_contract.get("status_text", "")).strip_edges()
		top_row.add_child(_make_drawer_info_card("等级", level_text, "UpgradeSheetLevelCard", true))
		top_row.add_child(_make_drawer_info_card("状态", status_text, "UpgradeSheetStatusCard", false))
	var cost_items := _filter_consumer_cost_items(_normalize_sheet_items(_sheet_contract.get("cost_items", []), str(_sheet_contract.get("cost_summary", ""))))
	var effect_items := _normalize_sheet_items(_sheet_contract.get("effect_items", []), str(_sheet_contract.get("effect_summary", "")))
	var bottom_row := HBoxContainer.new()
	bottom_row.name = "UpgradeSheetDrawerResourceEffectRow"
	bottom_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bottom_row.add_theme_constant_override("separation", UI_COMPONENT_FACTORY.main_city_facility_upgrade_drawer_card_spacing())
	_detail_rows.add_child(bottom_row)
	bottom_row.add_child(_make_drawer_pill_card("升级消耗", cost_items, "UpgradeSheetCostPill_", true))
	bottom_row.add_child(_make_drawer_pill_card("升级效果", effect_items, "UpgradeSheetEffectPill_", false))
	_cost_pill_count = cost_items.size()
	var cost_pill_parts := PackedStringArray()
	for item in cost_items:
		cost_pill_parts.append(str(item))
	_cost_pill_text = " | ".join(cost_pill_parts)
	_effect_pill_count = effect_items.size()


func _make_drawer_info_card(caption: String, value: String, node_name: String, emphasized: bool) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.name = node_name
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_main_city_facility_upgrade_drawer_card_style(panel, emphasized)
	var margin := UI_COMPONENT_FACTORY.make_margin(12, 8, 12, 8)
	panel.add_child(margin)
	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation", 4)
	margin.add_child(stack)
	var caption_label := Label.new()
	caption_label.text = caption
	UI_COMPONENT_FACTORY.apply_main_city_facility_upgrade_drawer_label_style(caption_label, "caption")
	stack.add_child(caption_label)
	var value_label := Label.new()
	value_label.text = value if value != "" else "--"
	UI_COMPONENT_FACTORY.apply_main_city_facility_upgrade_drawer_label_style(value_label, "value")
	stack.add_child(value_label)
	return panel


func _make_drawer_pill_card(caption: String, items: Array, node_prefix: String, emphasized: bool) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.name = "%sCard" % node_prefix.trim_suffix("_")
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_main_city_facility_upgrade_drawer_card_style(panel, emphasized)
	var margin := UI_COMPONENT_FACTORY.make_margin(14, 10, 14, 10)
	panel.add_child(margin)
	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation", 6)
	margin.add_child(stack)
	var caption_label := Label.new()
	caption_label.text = caption
	UI_COMPONENT_FACTORY.apply_main_city_facility_upgrade_drawer_label_style(caption_label, "caption")
	stack.add_child(caption_label)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 6)
	stack.add_child(row)
	for index in range(items.size()):
		var item := str(items[index]).strip_edges()
		if item == "":
			continue
		var pill := PanelContainer.new()
		pill.name = "%s%d" % [node_prefix, index]
		UI_COMPONENT_FACTORY.apply_main_city_facility_upgrade_drawer_pill_style(pill)
		var pill_margin := UI_COMPONENT_FACTORY.make_margin(10, 4, 10, 4)
		pill.add_child(pill_margin)
		var label := Label.new()
		label.text = item
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		UI_COMPONENT_FACTORY.apply_main_city_facility_upgrade_drawer_label_style(label, "value")
		pill_margin.add_child(label)
		row.add_child(pill)
	return panel


func _filter_consumer_cost_items(items: Array) -> Array:
	if not _is_consumer_focus_mode():
		return items
	var filtered: Array = []
	for item in items:
		var item_text := str(item).strip_edges()
		if item_text == "":
			continue
		if item_text == "令" or item_text.begins_with("令 "):
			continue
		filtered.append(item_text)
	return filtered


func _normalize_sheet_items(raw_items: Variant, fallback_text: String) -> Array:
	var items: Array = []
	if raw_items is Array:
		for item_variant in raw_items as Array:
			var item_text := _format_structured_sheet_item(item_variant)
			if item_text != "":
				items.append(item_text)
	if not items.is_empty():
		return items
	var normalized_text := fallback_text.replace("消耗：", "").replace("效果：", "").strip_edges()
	for part in normalized_text.split("|", false):
		var part_text := str(part).strip_edges()
		if part_text != "" and part_text != "--":
			items.append(part_text)
	return items


func _format_structured_sheet_item(item_variant: Variant) -> String:
	if item_variant is Dictionary:
		var item := item_variant as Dictionary
		var resource := str(item.get("resource", "")).strip_edges()
		var amount := _format_sheet_number(item.get("amount", ""))
		if resource != "":
			return "%s %s" % [resource, amount] if amount != "" else resource
		var stat := str(item.get("stat", "")).strip_edges()
		var before_text := str(item.get("before", "")).strip_edges()
		var after_text := str(item.get("after", "")).strip_edges()
		if stat != "" and before_text != "" and after_text != "":
			return "%s %s -> %s" % [stat, before_text, after_text]
		if stat != "":
			return stat
	return str(item_variant).strip_edges()


func _format_sheet_number(raw_value: Variant) -> String:
	if raw_value is int:
		return str(raw_value)
	if raw_value is float:
		var value := float(raw_value)
		if is_equal_approx(value, roundf(value)):
			return str(int(roundf(value)))
	return str(raw_value).strip_edges()


func _is_mobile_drawer_mode() -> bool:
	var mode := str(_sheet_contract.get("presentation_mode", "")).strip_edges().to_lower()
	return mode == "facility_tree_mobile_wide_drawer_v2" or mode == "facility_tree_consumer_upgrade_focus_v1"


func _is_consumer_focus_mode() -> bool:
	return str(_sheet_contract.get("presentation_mode", "")).strip_edges().to_lower() == "facility_tree_consumer_upgrade_focus_v1"


func _scan_visible_engineering_copy() -> bool:
	if not _is_ready:
		return false
	var text_parts := PackedStringArray()
	for label in [_subtitle_label, _body_label, _cost_label, _effect_label, _state_label]:
		var label_node := label as Label
		if label_node == null or not label_node.visible:
			continue
		text_parts.append(label_node.text)
	var visible_text := "\n".join(text_parts)
	return (
		visible_text.find("模板/排队态") >= 0
		or visible_text.find("不请求后端") >= 0
		or visible_text.find("不扣资源") >= 0
		or visible_text.find("模板预演") >= 0
	)


func _is_control_rect_inside_viewport(control: Control) -> bool:
	if control == null or not control.visible or not control.is_visible_in_tree():
		return false
	var rect := control.get_global_rect()
	var viewport_rect := control.get_viewport_rect()
	return (
		rect.position.x >= viewport_rect.position.x - 1.0
		and rect.position.y >= viewport_rect.position.y - 1.0
		and rect.end.x <= viewport_rect.end.x + 1.0
		and rect.end.y <= viewport_rect.end.y + 1.0
	)


func _is_template_feedback_visible(body: String) -> bool:
	if bool(_sheet_contract.get("template_feedback_visible", false)):
		return true
	return body.find("模板/排队态") >= 0 and body.find("不请求后端") >= 0 and body.find("不扣资源") >= 0


func _is_submitted_state_visible(subtitle: String) -> bool:
	if bool(_sheet_contract.get("submitted_state_visible", false)):
		return true
	return subtitle.find("已加入模板排队") >= 0


func _build_state_label_text(submitted_state_visible: bool, template_feedback_visible: bool) -> String:
	var explicit_text := str(_sheet_contract.get("state_label", "")).strip_edges()
	if explicit_text != "":
		return explicit_text
	if submitted_state_visible:
		return "已加入模板排队 · 不请求后端 · 不扣资源"
	if template_feedback_visible:
		return "模板预演 · 升级按钮只进入排队态"
	return ""
