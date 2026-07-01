extends "res://scripts/ui/slg_snapshot_panel.gd"
class_name MailPanel

const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")
const MAIL_PLAYER_VISIBLE_COPY_CONTRACT := "mail_empty_error_player_copy_v1"
const MAIL_PLAYER_VISIBLE_FORBIDDEN_TERMS := [
	"/api/inbox",
	"inbox_mail",
	"read model",
	"backend",
	"contract id",
	"authority",
	"tier",
	"snake_case",
	"fixture",
	"local_only",
	"provider",
	".env",
	"key",
	"v0",
]

func set_mail_snapshot(snapshot: Dictionary) -> void:
	set_snapshot(snapshot)

func get_mainline_visual_smoke_summary(page_id: String = "") -> Dictionary:
	var summary: Dictionary = super.get_mainline_visual_smoke_summary(page_id)
	UI_COMPONENT_FACTORY.apply_design_system_summary(summary, "mail_shell", "preview_read_model_shell", false)
	UI_COMPONENT_FACTORY.apply_snapshot_edge_motion_summary(summary)

	var raw_mail_summary: Variant = _snapshot.get("mail_panel_summary", {})
	if raw_mail_summary is Dictionary:
		for key in (raw_mail_summary as Dictionary).keys():
			summary[key] = (raw_mail_summary as Dictionary).get(key)

	summary["mailPanelTabIds"] = _mail_tab_ids()
	summary["mailPanelPageCount"] = _mail_page_count()
	summary["mailPanelItemCount"] = _mail_item_count()
	summary["mailPanelForbiddenEngineeringCopyCount"] = _mail_forbidden_engineering_copy_count()
	var visible_copy_hits := _mail_player_visible_forbidden_copy_hits()
	summary["mailPanelPlayerVisibleCopyContract"] = MAIL_PLAYER_VISIBLE_COPY_CONTRACT
	summary["mailPanelPlayerVisibleCopyForbiddenHits"] = visible_copy_hits
	summary["mailPanelPlayerVisibleCopyOk"] = visible_copy_hits.is_empty()
	summary["mailPanelEmptyErrorCopyOwner"] = "MailPresenter + MailPanel"
	var selected_summary := _mail_selected_item_summary(page_id)
	for key in selected_summary.keys():
		summary[key] = selected_summary.get(key)
	var row_button_meta := _mail_collect_row_select_button_meta()
	summary["mailPanelRowSelectButtonToken"] = UI_COMPONENT_FACTORY.mail_panel_row_select_button_token()
	summary["mailPanelRowSelectLiveTextContract"] = UI_COMPONENT_FACTORY.mail_panel_row_select_live_text_contract()
	summary["mailPanelRowSelectButtonVisibleCount"] = row_button_meta.size()
	summary["mailPanelRowSelectButtonTokenCount"] = _mail_count_row_button_meta(row_button_meta, "token")
	summary["mailPanelRowSelectButtonMissingMetaCount"] = _mail_count_row_button_missing_meta(row_button_meta)
	summary["mailPanelRowSelectActionIds"] = _mail_join_row_button_meta(row_button_meta, "action_id")
	summary["mailPanelRowSelectLabels"] = _mail_join_row_button_meta(row_button_meta, "label")
	return summary

func _on_section_page_action_requested(action_id: String) -> void:
	var resolved_action_id := action_id.strip_edges()
	if resolved_action_id.begins_with("mail_select:"):
		var mail_item_id := resolved_action_id.substr("mail_select:".length()).strip_edges()
		if mail_item_id != "":
			_apply_mail_selection_to_active_page(mail_item_id)
			_refresh_panel()
		return
	page_action_requested.emit(_active_page_id, resolved_action_id)

func _apply_mail_selection_to_active_page(mail_item_id: String) -> void:
	var sections: Dictionary = _snapshot.get("sections", {}) as Dictionary
	var page_id := _active_page_id
	if page_id == "":
		page_id = str(_snapshot.get("default_page_id", "system")).strip_edges()
	if not sections.has(page_id):
		return
	var section: Dictionary = sections.get(page_id, {}) as Dictionary
	var content_blocks: Array = section.get("content_blocks", []) as Array
	for index in range(content_blocks.size()):
		if not (content_blocks[index] is Dictionary):
			continue
		var block := content_blocks[index] as Dictionary
		if str(block.get("kind", "")).strip_edges() != UI_COMPONENT_FACTORY.mail_panel_primary_block_kind():
			continue
		var selected_item := _mail_find_item(block.get("items", []) as Array, mail_item_id)
		if selected_item.is_empty():
			return
		block["selected_item"] = selected_item
		block["detail_lines"] = _mail_build_detail_lines(selected_item, block.get("organization", {}) as Dictionary)
		content_blocks[index] = block
		section["content_blocks"] = content_blocks
		sections[page_id] = section
		_snapshot["sections"] = sections
		var raw_mail_summary: Variant = _snapshot.get("mail_panel_summary", {})
		if raw_mail_summary is Dictionary:
			var mail_summary := raw_mail_summary as Dictionary
			mail_summary["mailPanelSelectedMailId"] = mail_item_id
			mail_summary["mailPanelSelectedMailTitle"] = str(selected_item.get("title", "")).strip_edges()
			mail_summary["mailPanelDetailLineCount"] = (block.get("detail_lines", []) as Array).size()
			_snapshot["mail_panel_summary"] = mail_summary
		return

func _mail_tab_ids() -> String:
	var ids: Array[String] = []
	for tab_variant in _snapshot.get("tabs", []) as Array:
		if not (tab_variant is Dictionary):
			continue
		var tab_id := str((tab_variant as Dictionary).get("id", "")).strip_edges()
		if tab_id != "":
			ids.append(tab_id)
	return "/".join(ids)

func _mail_page_count() -> int:
	var sections: Dictionary = _snapshot.get("sections", {}) as Dictionary
	return sections.size()

func _mail_item_count() -> int:
	var items: Variant = _snapshot.get("mail_items", [])
	return (items as Array).size() if items is Array else 0

func _mail_forbidden_engineering_copy_count() -> int:
	return _mail_count_forbidden_terms_in_value(_snapshot)

func _mail_selected_item_summary(page_id: String) -> Dictionary:
	var resolved_page_id := page_id.strip_edges()
	if resolved_page_id == "":
		resolved_page_id = _active_page_id
	if resolved_page_id == "":
		resolved_page_id = str(_snapshot.get("default_page_id", "system")).strip_edges()
	var block := _mail_resolve_block(resolved_page_id)
	var selected_item: Dictionary = block.get("selected_item", {}) as Dictionary
	var detail_lines: Array = block.get("detail_lines", []) as Array
	var raw_reward_lines: Variant = selected_item.get("reward_lines", [])
	var reward_lines: Array = []
	if raw_reward_lines is Array:
		reward_lines = raw_reward_lines as Array
	return {
		"mailPanelSelectedMailId": str(selected_item.get("id", "")).strip_edges(),
		"mailPanelSelectedMailTitle": str(selected_item.get("title", "")).strip_edges(),
		"mailPanelSelectedRewardLineCount": reward_lines.size(),
		"mailPanelDetailLineCount": detail_lines.size(),
	}

func _mail_resolve_block(page_id: String) -> Dictionary:
	var sections: Dictionary = _snapshot.get("sections", {}) as Dictionary
	if not sections.has(page_id):
		return {}
	var section: Dictionary = sections.get(page_id, {}) as Dictionary
	var content_blocks: Array = section.get("content_blocks", []) as Array
	for block_variant in content_blocks:
		if block_variant is Dictionary and str((block_variant as Dictionary).get("kind", "")).strip_edges() == UI_COMPONENT_FACTORY.mail_panel_primary_block_kind():
			return block_variant as Dictionary
	return {}

func _mail_find_item(items: Array, mail_item_id: String) -> Dictionary:
	for item_variant in items:
		if not (item_variant is Dictionary):
			continue
		var item := item_variant as Dictionary
		if str(item.get("id", "")).strip_edges() == mail_item_id:
			return item.duplicate(true)
	return {}

func _mail_collect_row_select_button_meta() -> Array[Dictionary]:
	var rows: Array[Dictionary] = []
	_mail_collect_row_select_button_meta_recursive(self, rows)
	return rows

func _mail_collect_row_select_button_meta_recursive(node: Node, rows: Array[Dictionary]) -> void:
	if node is Button:
		var button := node as Button
		var action_id := str(button.get_meta("mail_panel_row_select_action_id", "")).strip_edges()
		if action_id != "" and button.visible and button.is_visible_in_tree():
			rows.append({
				"action_id": action_id,
				"label": str(button.get_meta("mail_panel_row_select_live_text_label", button.text)).strip_edges(),
				"token": str(button.get_meta("mail_panel_row_select_button_token", "")).strip_edges(),
				"live_text_contract": str(button.get_meta("mail_panel_row_select_live_text_contract", "")).strip_edges(),
			})
	for child in node.get_children():
		_mail_collect_row_select_button_meta_recursive(child, rows)

func _mail_join_row_button_meta(rows: Array[Dictionary], key: String) -> String:
	var values: Array[String] = []
	for row in rows:
		var value := str(row.get(key, "")).strip_edges()
		if value != "":
			values.append(value)
	return " / ".join(values)

func _mail_count_row_button_meta(rows: Array[Dictionary], key: String) -> int:
	var count := 0
	for row in rows:
		if str(row.get(key, "")).strip_edges() != "":
			count += 1
	return count

func _mail_count_row_button_missing_meta(rows: Array[Dictionary]) -> int:
	var count := 0
	for row in rows:
		if str(row.get("action_id", "")).strip_edges() == "":
			count += 1
		if str(row.get("label", "")).strip_edges() == "":
			count += 1
		if str(row.get("token", "")).strip_edges() != UI_COMPONENT_FACTORY.mail_panel_row_select_button_token():
			count += 1
		if str(row.get("live_text_contract", "")).strip_edges() != UI_COMPONENT_FACTORY.mail_panel_row_select_live_text_contract():
			count += 1
	return count

func _mail_build_detail_lines(item: Dictionary, organization: Dictionary) -> Array:
	var raw_lines: Variant = item.get("body_lines", [])
	var result: Array = []
	if raw_lines is Array:
		for line_variant in raw_lines as Array:
			var line := str(line_variant).strip_edges()
			if line != "":
				result.append(line)
	if result.is_empty():
		var summary := str(item.get("summary", "")).strip_edges()
		if summary != "":
			result.append(summary)
	result.append("来自：%s" % str(item.get("sender", str(organization.get("name", "青州同盟")))).strip_edges())
	result.append("状态：%s" % str(item.get("status_label", "已读")).strip_edges())
	return result

func _mail_count_forbidden_terms_in_value(value: Variant) -> int:
	var forbidden_terms := [
		"开发中",
		"占位",
		"待接入",
		"SOM-",
		"结构预览",
		"后端未连接",
	]
	var total := 0
	if value is Dictionary:
		for key in (value as Dictionary).keys():
			total += _mail_count_forbidden_terms_in_value((value as Dictionary).get(key))
		return total
	if value is Array:
		for item in value as Array:
			total += _mail_count_forbidden_terms_in_value(item)
		return total
	var text := str(value)
	for term in forbidden_terms:
		if text.find(term) >= 0:
			total += 1
	return total

func _mail_player_visible_forbidden_copy_hits() -> Array:
	var visible_parts := _mail_collect_player_visible_copy_parts()
	var hits: Array = []
	for raw_part in visible_parts:
		var lower_part := str(raw_part).strip_edges().to_lower()
		if lower_part == "":
			continue
		for raw_term in MAIL_PLAYER_VISIBLE_FORBIDDEN_TERMS:
			var term := str(raw_term).strip_edges().to_lower()
			if term != "" and lower_part.find(term) >= 0 and not hits.has(term):
				hits.append(term)
	return hits

func _mail_collect_player_visible_copy_parts() -> Array:
	var parts: Array = []
	for key in ["title", "empty_state_text", "back_button_label", "close_button_label"]:
		_mail_append_visible_text(parts, _snapshot.get(key, ""))
	for tab_variant in _snapshot.get("tabs", []) as Array:
		if tab_variant is Dictionary:
			_mail_append_visible_text(parts, (tab_variant as Dictionary).get("label", ""))
	var sections: Dictionary = _snapshot.get("sections", {}) as Dictionary
	for page_id in sections.keys():
		var section_variant: Variant = sections.get(page_id, {})
		if not (section_variant is Dictionary):
			continue
		var section := section_variant as Dictionary
		for key in ["title", "panel_title", "summary_title"]:
			_mail_append_visible_text(parts, section.get(key, ""))
		for line_variant in section.get("summary_lines", []) as Array:
			_mail_append_visible_text(parts, line_variant)
		for block_variant in section.get("content_blocks", []) as Array:
			if block_variant is Dictionary:
				_mail_collect_visible_copy_from_block(parts, block_variant as Dictionary)
	return parts

func _mail_collect_visible_copy_from_block(parts: Array, block: Dictionary) -> void:
	for key in ["title", "summary_title", "summary_line"]:
		_mail_append_visible_text(parts, block.get(key, ""))
	for line_variant in block.get("detail_lines", []) as Array:
		_mail_append_visible_text(parts, line_variant)
	var selected_item_variant: Variant = block.get("selected_item", {})
	if selected_item_variant is Dictionary:
		_mail_collect_visible_copy_from_mail_item(parts, selected_item_variant as Dictionary)
	for item_variant in block.get("items", []) as Array:
		if item_variant is Dictionary:
			_mail_collect_visible_copy_from_mail_item(parts, item_variant as Dictionary)

func _mail_collect_visible_copy_from_mail_item(parts: Array, item: Dictionary) -> void:
	for key in ["title", "value", "sender", "status_label", "summary", "time"]:
		_mail_append_visible_text(parts, item.get(key, ""))
	for line_variant in item.get("body_lines", []) as Array:
		_mail_append_visible_text(parts, line_variant)
	for reward_variant in item.get("reward_lines", []) as Array:
		_mail_append_visible_text(parts, reward_variant)

func _mail_append_visible_text(parts: Array, value: Variant) -> void:
	var text := str(value).strip_edges()
	if text != "":
		parts.append(text)
