extends "res://scripts/ui/slg_snapshot_panel.gd"
class_name SettingsPanel

const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")

func set_settings_snapshot(snapshot: Dictionary) -> void:
	set_snapshot(snapshot)

func get_mainline_visual_smoke_summary(page_id: String = "") -> Dictionary:
	var summary: Dictionary = super.get_mainline_visual_smoke_summary(page_id)
	UI_COMPONENT_FACTORY.apply_design_system_summary(summary, "settings_shell", "preview_read_model_shell", false)
	UI_COMPONENT_FACTORY.apply_snapshot_edge_motion_summary(summary)

	var raw_settings_summary: Variant = _snapshot.get("settings_summary", {})
	if raw_settings_summary is Dictionary:
		for key in (raw_settings_summary as Dictionary).keys():
			summary[key] = (raw_settings_summary as Dictionary).get(key)

	summary["settingsTabIds"] = _settings_tab_ids()
	summary["settingsPageCount"] = _settings_page_count()
	summary["settingsOptionCount"] = _settings_option_count()
	summary["settingsForbiddenEngineeringCopyCount"] = _settings_forbidden_engineering_copy_count()
	var action_button_meta := _settings_collect_action_button_meta()
	summary["settingsActionRowButtonToken"] = UI_COMPONENT_FACTORY.settings_action_row_button_token()
	summary["settingsActionRowLiveTextContract"] = UI_COMPONENT_FACTORY.settings_action_row_live_text_contract()
	summary["settingsActionRowButtonVisibleCount"] = action_button_meta.size()
	summary["settingsActionRowButtonTokenCount"] = _settings_count_action_button_meta(action_button_meta, "token")
	summary["settingsActionRowButtonMissingMetaCount"] = _settings_count_action_button_missing_meta(action_button_meta)
	summary["settingsActionRowActionIds"] = _settings_join_action_button_meta(action_button_meta, "action_id")
	summary["settingsActionRowLabels"] = _settings_join_action_button_meta(action_button_meta, "label")
	return summary

func _settings_tab_ids() -> String:
	var tab_ids: Array[String] = []
	for tab_variant in _snapshot.get("tabs", []) as Array:
		if not (tab_variant is Dictionary):
			continue
		var tab_id := str((tab_variant as Dictionary).get("id", "")).strip_edges()
		if tab_id != "":
			tab_ids.append(tab_id)
	return "/".join(tab_ids)

func _settings_page_count() -> int:
	var sections: Dictionary = _snapshot.get("sections", {}) as Dictionary
	return sections.size()

func _settings_option_count() -> int:
	var total := 0
	var sections: Dictionary = _snapshot.get("sections", {}) as Dictionary
	for section_id in sections.keys():
		var section_variant: Variant = sections.get(section_id)
		if not (section_variant is Dictionary):
			continue
		var section := section_variant as Dictionary
		total += _settings_dictionary_array(section.get("item_cards", [])).size()
		for block_variant in _settings_dictionary_array(section.get("content_blocks", [])):
			var block := block_variant as Dictionary
			total += _settings_dictionary_array(block.get("cards", [])).size()
			total += _settings_dictionary_array(block.get("actions", [])).size()
	return total

func _settings_forbidden_engineering_copy_count() -> int:
	var total := 0
	var sections: Dictionary = _snapshot.get("sections", {}) as Dictionary
	for section_id in sections.keys():
		var section_variant: Variant = sections.get(section_id)
		if section_variant is Dictionary:
			total += _settings_count_forbidden_terms_in_value(section_variant)
	return total

func _settings_count_forbidden_terms_in_value(value: Variant) -> int:
	var forbidden_terms := [
		"开发中",
		"占位",
		"待接入",
		"API Key",
		"provider",
		"供应商",
		"后端未连接",
	]
	var total := 0
	if value is Dictionary:
		for key in (value as Dictionary).keys():
			total += _settings_count_forbidden_terms_in_value((value as Dictionary).get(key))
		return total
	if value is Array:
		for item in value as Array:
			total += _settings_count_forbidden_terms_in_value(item)
		return total
	var text := str(value)
	for term in forbidden_terms:
		if term in text:
			total += 1
	return total

func _settings_dictionary_array(raw_value: Variant) -> Array:
	var result: Array = []
	if not (raw_value is Array):
		return result
	for item in raw_value as Array:
		if item is Dictionary:
			result.append(item)
	return result

func _settings_collect_action_button_meta() -> Array[Dictionary]:
	var rows: Array[Dictionary] = []
	_settings_collect_action_button_meta_recursive(self, rows)
	return rows

func _settings_collect_action_button_meta_recursive(node: Node, rows: Array[Dictionary]) -> void:
	if node is Button:
		var button := node as Button
		var action_id := str(button.get_meta("settings_action_row_action_id", "")).strip_edges()
		if action_id != "" and button.visible and button.is_visible_in_tree():
			rows.append({
				"action_id": action_id,
				"label": str(button.get_meta("settings_action_row_live_text_label", button.text)).strip_edges(),
				"token": str(button.get_meta("settings_action_row_button_token", "")).strip_edges(),
				"live_text_contract": str(button.get_meta("settings_action_row_live_text_contract", "")).strip_edges(),
			})
	for child in node.get_children():
		_settings_collect_action_button_meta_recursive(child, rows)

func _settings_join_action_button_meta(rows: Array[Dictionary], key: String) -> String:
	var values: Array[String] = []
	for row in rows:
		var value := str(row.get(key, "")).strip_edges()
		if value != "":
			values.append(value)
	return " / ".join(values)

func _settings_count_action_button_meta(rows: Array[Dictionary], key: String) -> int:
	var count := 0
	for row in rows:
		if str(row.get(key, "")).strip_edges() != "":
			count += 1
	return count

func _settings_count_action_button_missing_meta(rows: Array[Dictionary]) -> int:
	var count := 0
	for row in rows:
		if str(row.get("action_id", "")).strip_edges() == "":
			count += 1
		if str(row.get("label", "")).strip_edges() == "":
			count += 1
		if str(row.get("token", "")).strip_edges() != UI_COMPONENT_FACTORY.settings_action_row_button_token():
			count += 1
		if str(row.get("live_text_contract", "")).strip_edges() != UI_COMPONENT_FACTORY.settings_action_row_live_text_contract():
			count += 1
	return count
