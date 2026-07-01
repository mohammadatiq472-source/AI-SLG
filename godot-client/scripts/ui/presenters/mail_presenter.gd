extends RefCounted
class_name MailPresenter

const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")
const MAIL_PANEL_CONTRACT_ID := "mail_panel_v1"
const MAIL_PANEL_SOURCE_ID := "mail_presenter_snapshot_v1"
const MAIL_PANEL_VISUAL_MODE := "independent_mail_inbox_snapshot_v1"
const MAIL_PANEL_ORGANIZATION_MODE := "single_alliance_or_nation_membership_v1"
const MAIL_PANEL_BACKEND_BOUNDARY := "ui_read_model_snapshot_no_backend_authority"
const MAIL_READ_MODEL_FIXTURE_PATH := "res://data/ui/mail_inbox_preview_read_model.json"
const MAIL_READ_MODEL_SOURCE_ID := "mail_inbox_preview_read_model_v1"
const MAIL_READ_MODEL_SOURCE_MODE := "external_ui_fixture_backend_ready_v1"
const MAIL_FUTURE_BACKEND_CONTRACT := "backend_owned_per_player_inbox_read_model_v1"
const MAIL_PLAYER_VISIBLE_COPY_FALLBACK := "邮件暂未同步，请稍后再看。"
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

var _world_data: Dictionary = {}
var _map_layout_data: Dictionary = {}
var _target_faction_id: String = ""
var _last_mail_read_model_meta: Dictionary = {}

func configure(world_data: Dictionary, map_layout_data: Dictionary, target_faction_id: String) -> void:
	_world_data = world_data
	_map_layout_data = map_layout_data
	_target_faction_id = target_faction_id.strip_edges()

func build_overlay_payload(runtime_context: Dictionary = {}) -> Dictionary:
	return {
		"snapshot": build_snapshot(runtime_context),
		"runtime_state_patch": {},
	}

func build_live_inbox_overlay_payload(live_inbox: Dictionary, runtime_context: Dictionary = {}) -> Dictionary:
	return {
		"snapshot": build_live_inbox_snapshot(live_inbox, runtime_context),
		"runtime_state_patch": {},
	}

func build_snapshot(_runtime_context: Dictionary = {}) -> Dictionary:
	var organization := _resolve_active_organization()
	var items := _build_mail_items(organization)
	var tabs := _build_tabs(items)
	var hero_stats: Array = []
	var organization_label := str(organization.get("label", "同盟"))
	return {
		"title": "邮件",
		"default_page_id": "system",
		"back_button_label": "返回地图",
		"close_button_label": "关闭",
		"empty_state_text": "暂无可查看邮件。",
		"content_frame_transparent": false,
		"content_margins": [22, 16, 22, 18],
		"body_margins": [16, 12, 16, 12],
		"tab_text_size": UI_COMPONENT_FACTORY.mail_panel_tab_text_size(),
		"tabs": tabs,
		"mail_items": items,
		"mail_panel_summary": _build_mail_panel_summary(organization, items, tabs, hero_stats),
		"shared_state": {
			"mail_contract": MAIL_PANEL_CONTRACT_ID,
			"active_organization_kind": str(organization.get("kind", "alliance")),
			"active_organization_label": str(organization.get("label", "同盟")),
			"active_organization_name": str(organization.get("name", "青州同盟")),
			"organization_mode": MAIL_PANEL_ORGANIZATION_MODE,
		},
		"sections": {
			"organization": _build_section("organization", organization_label, "%s邮件" % organization_label, "%s通知、调度与政策消息集中在这里。" % organization_label, _filter_items(items, "organization"), organization, hero_stats),
			"system": _build_section("system", "系统", "系统邮件", "系统通知和可领取奖励集中在这里。", _filter_items(items, "system"), organization, hero_stats),
		},
	}

func build_live_inbox_snapshot(live_inbox: Dictionary, _runtime_context: Dictionary = {}) -> Dictionary:
	var organization := _resolve_active_organization()
	var items := _build_live_inbox_items(live_inbox, organization)
	var tabs := _build_tabs(items)
	var hero_stats: Array = []
	var organization_label := str(organization.get("label", "同盟"))
	return {
		"title": "邮件",
		"default_page_id": "system",
		"back_button_label": "返回地图",
		"close_button_label": "关闭",
		"empty_state_text": "暂无可领取邮件。",
		"content_frame_transparent": false,
		"content_margins": [22, 16, 22, 18],
		"body_margins": [16, 12, 16, 12],
		"tab_text_size": UI_COMPONENT_FACTORY.mail_panel_tab_text_size(),
		"tabs": tabs,
		"mail_items": items,
		"mail_panel_summary": _build_live_mail_panel_summary(organization, items, tabs, hero_stats, live_inbox),
		"shared_state": {
			"mail_contract": MAIL_PANEL_CONTRACT_ID,
			"active_organization_kind": str(organization.get("kind", "alliance")),
			"active_organization_label": str(organization.get("label", "同盟")),
			"active_organization_name": str(organization.get("name", "青州同盟")),
			"organization_mode": MAIL_PANEL_ORGANIZATION_MODE,
		},
		"sections": {
			"organization": _build_section("organization", organization_label, "%s邮件" % organization_label, "%s通知集中在这里。" % organization_label, _filter_items(items, "organization"), organization, hero_stats),
			"system": _build_section("system", "系统", "系统邮件", "福利、活动和资源到账集中在这里。", _filter_items(items, "system"), organization, hero_stats),
		},
	}

func _build_mail_panel_summary(organization: Dictionary, items: Array, tabs: Array, hero_stats: Array) -> Dictionary:
	var claimable_count := 0
	var unread_count := 0
	for item_variant in items:
		if not (item_variant is Dictionary):
			continue
		var item := item_variant as Dictionary
		var status := str(item.get("status", "")).strip_edges()
		if status == "claimable":
			claimable_count += 1
			unread_count += 1
		elif status == "unread":
			unread_count += 1
	return {
		"mailPanelContract": MAIL_PANEL_CONTRACT_ID,
		"mailPanelSource": MAIL_PANEL_SOURCE_ID,
		"mailPanelVisualMode": MAIL_PANEL_VISUAL_MODE,
		"mailPanelLocation": "mainline_snapshot_overlay",
		"mailPanelReadModelSource": str(_last_mail_read_model_meta.get("source_id", "")),
		"mailPanelReadModelSourceMode": str(_last_mail_read_model_meta.get("source_mode", "")),
		"mailPanelReadModelExamplePath": str(_last_mail_read_model_meta.get("example_path", "")),
		"mailPanelReadModelItemCount": int(_last_mail_read_model_meta.get("item_count", 0)),
		"mailPanelFutureBackendDynamicInboxes": bool(_last_mail_read_model_meta.get("future_backend_dynamic_inboxes", false)),
		"mailPanelFutureBackendContract": str(_last_mail_read_model_meta.get("future_backend_contract", "")),
		"mailPanelPresenterInlineFixtureItemCount": int(_last_mail_read_model_meta.get("inline_fixture_item_count", 0)),
		"mailPanelStandalone": true,
		"mailPanelBattleReportPanelCoupled": false,
		"mailPanelIncludesBattleReportDetail": false,
		"mailPanelBattleReportDeepLinkMode": "action_only",
		"mailPanelOrganizationMode": MAIL_PANEL_ORGANIZATION_MODE,
		"mailPanelActiveOrganizationKind": str(organization.get("kind", "alliance")),
		"mailPanelActiveOrganizationName": str(organization.get("name", "青州同盟")),
		"mailPanelOrganizationTabLabelMode": "dynamic_alliance_or_nation_v1",
		"mailPanelOrganizationTabLabel": str(organization.get("label", "同盟")),
		"mailPanelUnifiedInboxKinds": "daily_welfare/event_reward",
		"mailPanelClaimableCount": claimable_count,
		"mailPanelUnreadCount": unread_count,
		"mailPanelDefaultPageId": "system",
		"mailPanelAllTabPresent": false,
		"mailPanelRewardTabPresent": false,
		"mailPanelSystemItemCount": _filter_items(items, "system").size(),
		"mailPanelSystemIncludesRewards": _system_items_include_rewards(items),
		"mailPanelRewardLongTermCategoryRetained": false,
		"mailPanelTouchInputMode": "touch_mouse_drag_v1",
		"mailPanelScrollbarVisibility": "hidden",
		"mailPanelBackendBoundary": MAIL_PANEL_BACKEND_BOUNDARY,
		"mailPanelNoClaimAuthority": true,
		"mailPanelTabIds": _join_payload_ids(tabs, "id"),
		"mailPanelItemCount": items.size(),
		"mailPanelLayoutToken": UI_COMPONENT_FACTORY.mail_panel_layout_token(),
		"mailPanelPrimaryBlockKind": UI_COMPONENT_FACTORY.mail_panel_primary_block_kind(),
		"mailPanelVisualQualityGate": UI_COMPONENT_FACTORY.mail_panel_visual_quality_gate(),
		"mailPanelDetailPaneMode": UI_COMPONENT_FACTORY.mail_panel_detail_pane_mode(),
		"mailPanelRewardStatusMode": UI_COMPONENT_FACTORY.mail_panel_reward_status_mode(),
		"mailPanelCategoryFilterMode": UI_COMPONENT_FACTORY.mail_panel_category_filter_mode(),
		"mailPanelHeaderCopyMode": UI_COMPONENT_FACTORY.mail_panel_header_copy_mode(),
		"mailPanelLegacyRelayTitlePresent": false,
		"mailPanelHeroStripVisible": false,
		"mailPanelBodyLifted": true,
		"mailPanelTabUnreadBadgeMode": UI_COMPONENT_FACTORY.mail_panel_tab_unread_badge_mode(),
		"mailPanelTabTextSize": UI_COMPONENT_FACTORY.mail_panel_tab_text_size(),
		"mailPanelUnreadBadgeCount": _count_tabs_with_badges(tabs),
		"mailPanelRowSelectionMode": UI_COMPONENT_FACTORY.mail_panel_row_selection_mode(),
		"mailPanelSelectableRowCount": items.size(),
		"mailPanelHeroStatsVisible": false,
		"mailPanelHeroStatCount": 0,
		"mailPanelListScrollMode": UI_COMPONENT_FACTORY.mail_panel_scroll_mode(),
		"mailPanelDetailScrollMode": UI_COMPONENT_FACTORY.mail_panel_scroll_mode(),
		"mailPanelDetailWidthBiasMode": UI_COMPONENT_FACTORY.mail_panel_detail_width_bias_mode(),
		"mailPanelListPreviewMode": UI_COMPONENT_FACTORY.mail_panel_list_preview_mode(),
		"mailPanelRewardStripPlacementMode": UI_COMPONENT_FACTORY.mail_panel_reward_strip_placement_mode(),
		"mailPanelRewardChipFontSize": UI_COMPONENT_FACTORY.mail_panel_reward_chip_font_size(),
		"mailPanelRewardChipMinHeight": UI_COMPONENT_FACTORY.mail_panel_reward_chip_min_height(),
		"mailPanelRewardChipMinWidth": UI_COMPONENT_FACTORY.mail_panel_reward_chip_min_width(),
		"mailPanelRewardStripTopOffset": UI_COMPONENT_FACTORY.mail_panel_reward_strip_top_offset(),
		"mailPanelOrganizationItemCount": _filter_items(items, "organization").size(),
		"mailPanelRewardPreviewCount": 0,
		"mailPanelDetailLineCount": _build_detail_lines(_resolve_featured_item(_filter_items(items, "system")), organization).size(),
	}

func _build_live_mail_panel_summary(organization: Dictionary, items: Array, tabs: Array, hero_stats: Array, live_inbox: Dictionary) -> Dictionary:
	var summary := _build_mail_panel_summary(organization, items, tabs, hero_stats)
	summary["mailPanelSource"] = "live_unified_inbox_route"
	summary["mailPanelVisualMode"] = "live_inbox_mail_snapshot_v1"
	summary["mailPanelBackendBoundary"] = "live_route_readback_player_visible_copy_translated"
	summary["mailPanelNoClaimAuthority"] = true
	summary["mailPanelLiveInboxWired"] = true
	summary["mailPanelLiveInboxItemCount"] = items.size()
	summary["mailPanelLiveInboxVisibleItemCount"] = items.size()
	summary["mailPanelLiveInboxReadbackCount"] = int(live_inbox.get("count", items.size()))
	summary["mailPanelLiveInboxRouteSource"] = "GET /api/inbox"
	summary["mailPanelLiveInboxKinds"] = _join_payload_ids(items, "kind")
	return summary

func _build_tabs(items: Array) -> Array:
	var system_items := _filter_items(items, "system")
	var organization_items := _filter_items(items, "organization")
	var organization := _resolve_active_organization()
	return [
		{"id": "organization", "label": str(organization.get("label", "同盟")), "count": organization_items.size(), "badge_count": _count_unread_or_claimable(organization_items), "tab_text_size": UI_COMPONENT_FACTORY.mail_panel_tab_text_size()},
		{"id": "system", "label": "系统", "count": system_items.size(), "badge_count": _count_unread_or_claimable(system_items), "tab_text_size": UI_COMPONENT_FACTORY.mail_panel_tab_text_size()},
	]

func _build_section(page_id: String, title: String, summary_title: String, summary_line: String, items: Array, organization: Dictionary, hero_stats: Array) -> Dictionary:
	var selected_item := _resolve_featured_item(items)
	return {
		"page_id": page_id,
		"title": title,
		"panel_title": "邮件",
		"summary_title": summary_title,
		"summary_lines": [
			summary_line,
			"当前组织：%s · %s" % [str(organization.get("label", "同盟")), str(organization.get("name", "青州同盟"))],
		],
		"content_first_mode": true,
		"hide_left_panel": true,
		"hide_summary_chrome": true,
		"hide_shared_state": true,
		"hide_detail_title": true,
		"player_reading_mode": true,
		"item_cards": [],
		"content_blocks": [
			{
				"kind": UI_COMPONENT_FACTORY.mail_panel_primary_block_kind(),
				"title": "",
				"node_name": "MailInboxSplit_%s" % page_id,
				"layout_token": UI_COMPONENT_FACTORY.mail_panel_layout_token(),
				"summary_title": summary_title,
				"summary_line": summary_line,
				"organization": organization,
				"hero_visible": false,
				"hero_stats": hero_stats,
				"items": items,
				"selected_item": selected_item,
				"detail_lines": _build_detail_lines(selected_item, organization),
				"reward_preview_items": [],
			},
		],
	}

func _build_item_cards(items: Array) -> Array:
	var cards: Array = []
	for item_variant in items:
		if not (item_variant is Dictionary):
			continue
		var item := item_variant as Dictionary
		cards.append({
			"title": str(item.get("title", "")),
			"value": str(item.get("value", "")),
			"meta": str(item.get("status_label", "")),
			"description": str(item.get("summary", "")),
		})
	return cards

func _build_detail_cards(items: Array) -> Array:
	var cards: Array = []
	for item_variant in items:
		if not (item_variant is Dictionary):
			continue
		var item := item_variant as Dictionary
		cards.append({
			"title": str(item.get("title", "")),
			"value": str(item.get("value", "")),
			"meta": str(item.get("sender", "")),
			"description": "%s · %s" % [str(item.get("status_label", "")), str(item.get("summary", ""))],
		})
	return cards

func _build_hero_stats(items: Array, organization: Dictionary) -> Array:
	return [
		{"label": "未读", "value": str(_count_items_by_status(items, ["unread", "claimable"])), "tone": "red"},
		{"label": "可领", "value": str(_count_items_by_status(items, ["claimable"])), "tone": "gold"},
		{"label": str(organization.get("label", "同盟")), "value": str(_count_items_by_category(items, "organization")), "tone": "green"},
	]

func _resolve_featured_item(items: Array) -> Dictionary:
	for item_variant in items:
		if item_variant is Dictionary and str((item_variant as Dictionary).get("status", "")).strip_edges() == "claimable":
			return (item_variant as Dictionary).duplicate(true)
	for item_variant in items:
		if item_variant is Dictionary and str((item_variant as Dictionary).get("status", "")).strip_edges() == "unread":
			return (item_variant as Dictionary).duplicate(true)
	for item_variant in items:
		if item_variant is Dictionary:
			return (item_variant as Dictionary).duplicate(true)
	return {}

func _build_detail_lines(item: Dictionary, organization: Dictionary) -> Array:
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

func _count_items_by_category(items: Array, category: String) -> int:
	var count := 0
	for item_variant in items:
		if item_variant is Dictionary and str((item_variant as Dictionary).get("category", "")).strip_edges() == category:
			count += 1
	return count

func _count_items_by_status(items: Array, statuses: Array) -> int:
	var accepted: Dictionary = {}
	for status_variant in statuses:
		var status := str(status_variant).strip_edges()
		if status != "":
			accepted[status] = true
	var count := 0
	for item_variant in items:
		if not (item_variant is Dictionary):
			continue
		var item_status := str((item_variant as Dictionary).get("status", "")).strip_edges()
		if bool(accepted.get(item_status, false)):
			count += 1
	return count

func _build_mail_items(organization: Dictionary) -> Array:
	var read_model := _load_mail_read_model_fixture()
	var items: Array = []
	if not read_model.is_empty():
		var raw_items: Variant = read_model.get("items", [])
		if raw_items is Array:
			for item_variant in raw_items as Array:
				if item_variant is Dictionary:
					items.append(_materialize_mail_item(item_variant as Dictionary, organization))
	if not items.is_empty():
		_last_mail_read_model_meta = {
			"source_id": str(read_model.get("schema_id", MAIL_READ_MODEL_SOURCE_ID)),
			"source_mode": str(read_model.get("source_mode", MAIL_READ_MODEL_SOURCE_MODE)),
			"example_path": MAIL_READ_MODEL_FIXTURE_PATH,
			"item_count": items.size(),
			"future_backend_dynamic_inboxes": bool(read_model.get("future_backend_dynamic_inboxes", true)),
			"future_backend_contract": str(read_model.get("future_backend_contract", MAIL_FUTURE_BACKEND_CONTRACT)),
			"inline_fixture_item_count": 0,
		}
		return items
	_last_mail_read_model_meta = {
		"source_id": "mail_inbox_missing_fixture_fallback",
		"source_mode": "inline_empty_fallback_for_missing_fixture",
		"example_path": MAIL_READ_MODEL_FIXTURE_PATH,
		"item_count": 1,
		"future_backend_dynamic_inboxes": true,
		"future_backend_contract": MAIL_FUTURE_BACKEND_CONTRACT,
		"inline_fixture_item_count": 1,
	}
	return [_build_mail_unavailable_item(organization)]

func _build_live_inbox_items(live_inbox: Dictionary, organization: Dictionary) -> Array:
	var items: Array = []
	var raw_items: Variant = live_inbox.get("items", [])
	if raw_items is Array:
		for item_variant in raw_items as Array:
			if item_variant is Dictionary:
				items.append(_materialize_live_inbox_item(item_variant as Dictionary, organization, items.size()))
	return items

func _materialize_live_inbox_item(raw_item: Dictionary, organization: Dictionary, index: int) -> Dictionary:
	var item_id := str(raw_item.get("itemId", raw_item.get("id", ""))).strip_edges()
	if item_id == "":
		item_id = "live_mail_%d" % index
	var kind := str(raw_item.get("kind", "")).strip_edges()
	var title := _clean_live_mail_copy(str(raw_item.get("title", _format_live_inbox_kind_label(kind))).strip_edges(), _format_live_inbox_kind_label(kind))
	if title == "":
		title = _format_live_inbox_kind_label(kind)
	var summary := _clean_live_mail_copy(str(raw_item.get("summary", "")).strip_edges(), "")
	if summary == "":
		summary = _format_live_inbox_summary(raw_item, kind)
	var reward_lines := _build_live_inbox_reward_lines(raw_item)
	var sender := _format_live_inbox_sender(kind, organization)
	return {
		"id": item_id,
		"kind": kind,
		"category": "system",
		"title": title,
		"value": _format_live_inbox_kind_label(kind),
		"sender": sender,
		"status": "claimable",
		"status_label": "可领取",
		"summary": summary,
		"time": "刚刚",
		"tone": _format_live_inbox_tone(kind),
		"body_lines": [
			summary,
			"领取后会进入你的势力资源或奖励记录。",
		],
		"reward_lines": reward_lines,
	}

func _format_live_inbox_kind_label(kind: String) -> String:
	match kind.strip_edges():
		"ai_resource_transfer":
			return "资源到账"
		"daily_welfare":
			return "每日福利"
		"event_reward":
			return "活动奖励"
		_:
			return "新邮件"

func _format_live_inbox_sender(kind: String, organization: Dictionary) -> String:
	match kind.strip_edges():
		"ai_resource_transfer":
			return "后勤官"
		"daily_welfare":
			return "系统"
		"event_reward":
			return str(organization.get("name", "同盟")).strip_edges()
		_:
			return "系统"

func _format_live_inbox_tone(kind: String) -> String:
	match kind.strip_edges():
		"ai_resource_transfer":
			return "green"
		"daily_welfare":
			return "gold"
		"event_reward":
			return "blue"
		_:
			return "blue"

func _format_live_inbox_summary(raw_item: Dictionary, kind: String) -> String:
	if kind == "ai_resource_transfer":
		var resources: Dictionary = raw_item.get("resources", {}) as Dictionary
		return "资源已送达：%s" % _format_live_inbox_resource_bundle(resources)
	var reward: Dictionary = raw_item.get("reward", {}) as Dictionary
	var reward_text := _format_live_inbox_reward_bundle(reward)
	if reward_text != "":
		return "可领取：%s" % reward_text
	return "有一封新奖励可领取。"

func _build_live_inbox_reward_lines(raw_item: Dictionary) -> Array:
	var lines: Array = []
	var resources: Dictionary = raw_item.get("resources", {}) as Dictionary
	var resource_text := _format_live_inbox_resource_bundle(resources)
	if resource_text != "":
		lines.append(resource_text)
	var reward: Dictionary = raw_item.get("reward", {}) as Dictionary
	var reward_text := _format_live_inbox_reward_bundle(reward)
	if reward_text != "":
		lines.append(reward_text)
	if lines.is_empty():
		lines.append("奖励待领取")
	return lines

func _format_live_inbox_resource_bundle(resources: Dictionary) -> String:
	var parts: Array[String] = []
	for key in ["wood", "stone", "iron", "food", "gold"]:
		var amount := int(resources.get(key, 0))
		if amount > 0:
			parts.append("%s +%d" % [_format_live_inbox_resource_label(key), amount])
	return " / ".join(parts)

func _format_live_inbox_reward_bundle(reward: Dictionary) -> String:
	var parts: Array[String] = []
	var resources: Dictionary = reward.get("resources", {}) as Dictionary
	var resource_text := _format_live_inbox_resource_bundle(resources)
	if resource_text != "":
		parts.append(resource_text)
	var food := int(reward.get("food", 0))
	if food > 0:
		parts.append("粮%d" % food)
	var ap := int(reward.get("ap", 0))
	if ap > 0:
		parts.append("行动%d" % ap)
	var xp := int(reward.get("xp", reward.get("experience", 0)))
	if xp > 0:
		parts.append("经验 +%d" % xp)
	var prestige := int(reward.get("prestige", 0))
	if prestige > 0:
		parts.append("声望 +%d" % prestige)
	return " / ".join(parts)

func _format_live_inbox_resource_label(key: String) -> String:
	match key.strip_edges():
		"wood":
			return "木"
		"stone":
			return "石"
		"iron":
			return "铁"
		"food":
			return "粮"
		"gold":
			return "金"
		_:
			return "资源"

func _clean_live_mail_copy(raw_text: String, fallback: String = MAIL_PLAYER_VISIBLE_COPY_FALLBACK) -> String:
	var text := raw_text.strip_edges()
	if text == "":
		return fallback
	var lower_text := text.to_lower()
	for raw_token in MAIL_PLAYER_VISIBLE_FORBIDDEN_TERMS:
		var token := str(raw_token).strip_edges().to_lower()
		if token != "" and lower_text.find(token) >= 0:
			return fallback
	return text


func _load_mail_read_model_fixture() -> Dictionary:
	var file := FileAccess.open(MAIL_READ_MODEL_FIXTURE_PATH, FileAccess.READ)
	if file == null:
		return {}
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if parsed is Dictionary:
		return parsed as Dictionary
	return {}


func _materialize_mail_item(raw_item: Dictionary, organization: Dictionary) -> Dictionary:
	var item: Dictionary = {}
	for key in raw_item.keys():
		item[key] = _materialize_mail_value(raw_item[key], organization)
	return item


func _materialize_mail_value(raw_value: Variant, organization: Dictionary) -> Variant:
	if raw_value is String:
		return _resolve_mail_template(str(raw_value), organization)
	if raw_value is Array:
		var result: Array = []
		for value in raw_value as Array:
			result.append(_materialize_mail_value(value, organization))
		return result
	if raw_value is Dictionary:
		var result_dict: Dictionary = {}
		for key in (raw_value as Dictionary).keys():
			result_dict[key] = _materialize_mail_value((raw_value as Dictionary)[key], organization)
		return result_dict
	return raw_value


func _resolve_mail_template(text: String, organization: Dictionary) -> String:
	var result := text
	result = result.replace("{organization_kind}", str(organization.get("kind", "alliance")))
	result = result.replace("{organization_label}", str(organization.get("label", "同盟")))
	result = result.replace("{organization_name}", str(organization.get("name", "青州同盟")))
	return result


func _build_mail_unavailable_item(organization: Dictionary) -> Dictionary:
	return {
		"id": "mail_read_model_unavailable",
		"category": "system",
		"title": "邮件数据暂不可用",
		"value": "系统",
		"sender": str(organization.get("name", "系统")),
		"status": "quiet",
		"status_label": "待同步",
		"summary": "邮件暂未同步，请稍后再看。",
		"time": "当前",
		"tone": "blue",
		"body_lines": [
			"邮件暂未同步。",
			"系统会在恢复后显示你的个人邮件和奖励。",
		],
		"reward_lines": [],
	}

func _filter_items(items: Array, category: String) -> Array:
	if category == "all":
		return items.duplicate(true)
	var result: Array = []
	for item_variant in items:
		if item_variant is Dictionary and str((item_variant as Dictionary).get("category", "")).strip_edges() == category:
			result.append((item_variant as Dictionary).duplicate(true))
	return result

func _count_unread_or_claimable(items: Array) -> int:
	var count := 0
	for item_variant in items:
		if not (item_variant is Dictionary):
			continue
		var status := str((item_variant as Dictionary).get("status", "")).strip_edges()
		if status == "unread" or status == "claimable":
			count += 1
	return count

func _count_tabs_with_badges(tabs: Array) -> int:
	var count := 0
	for tab_variant in tabs:
		if not (tab_variant is Dictionary):
			continue
		if int((tab_variant as Dictionary).get("badge_count", 0)) > 0:
			count += 1
	return count

func _system_items_include_rewards(items: Array) -> bool:
	for item_variant in items:
		if not (item_variant is Dictionary):
			continue
		var item := item_variant as Dictionary
		if str(item.get("category", "")).strip_edges() == "system" and str(item.get("status", "")).strip_edges() == "claimable":
			return true
	return false

func _resolve_active_organization() -> Dictionary:
	var faction_state := _read_target_faction_state()
	var kind := str(faction_state.get("organizationKind", faction_state.get("orgKind", "alliance"))).strip_edges()
	if kind != "nation":
		kind = "alliance"
	var label := "国家" if kind == "nation" else "同盟"
	var name_candidates: Array = [faction_state.get("organizationName", "")]
	if kind == "nation":
		name_candidates.append(faction_state.get("nationName", ""))
		name_candidates.append(faction_state.get("allianceName", ""))
	else:
		name_candidates.append(faction_state.get("allianceName", ""))
		name_candidates.append(faction_state.get("nationName", ""))
	name_candidates.append(faction_state.get("factionName", ""))
	name_candidates.append(faction_state.get("name", ""))
	name_candidates.append("青州同盟")
	var name := _first_non_empty(name_candidates)
	return {
		"kind": kind,
		"label": label,
		"name": name,
	}

func _read_target_faction_state() -> Dictionary:
	var raw_factions: Variant = _world_data.get("factions", {})
	if raw_factions is Dictionary and _target_faction_id != "":
		var faction_state: Variant = (raw_factions as Dictionary).get(_target_faction_id, {})
		if faction_state is Dictionary:
			return faction_state as Dictionary
	return {}

func _join_payload_ids(payloads: Array, key: String) -> String:
	var ids: Array[String] = []
	for payload_variant in payloads:
		if not (payload_variant is Dictionary):
			continue
		var payload := payload_variant as Dictionary
		var id := str(payload.get(key, "")).strip_edges()
		if id != "":
			ids.append(id)
	return "/".join(ids)

func _first_non_empty(candidates: Array) -> String:
	for candidate in candidates:
		var text := str(candidate).strip_edges()
		if text != "":
			return text
	return ""
