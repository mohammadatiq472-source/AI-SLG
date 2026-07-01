extends "res://scripts/ui/slg_snapshot_panel.gd"
class_name WorldEventActivityPanel

const WORLD_EVENT_ACTIVITY_PRESENTER_SCRIPT: GDScript = preload("res://scripts/ui/presenters/world_event_activity_presenter.gd")
const BACKEND_API_CLIENT_SCRIPT: GDScript = preload("res://scripts/infra/http/backend_api_client.gd")
const WORLD_AFFAIRS_READ_MODEL_PATH := "/api/world/world-affairs"
const WORLD_TASKS_READ_MODEL_PATH := "/api/world/tasks"
const WORLD_AFFAIRS_ACTION_PATH := "/api/world/action?includeWorld=true"
const WORLD_TASKS_ACTION_PATH := "/api/world/action?includeWorld=false"
const WORLD_EVENT_UI_COMPONENT_FACTORY: GDScript = preload("res://scripts/ui/slg_ui_component_factory.gd")

var _presenter: RefCounted = WORLD_EVENT_ACTIVITY_PRESENTER_SCRIPT.new()
var _using_standalone_default_snapshot := false
var _backend_api_client: Node = null
var _world_affairs_read_model_inflight := false
var _world_affairs_claim_inflight := false
var _world_affairs_read_model_cache: Dictionary = {}
var _tasks_read_model_inflight := false
var _tasks_claim_inflight := false
var _tasks_read_model_cache: Dictionary = {}
var _focused_civil_memory_internal_id := ""
var _civil_memory_focus_requested := false
var _civil_memory_focus_visible := false
var _civil_memory_focus_payload: Dictionary = {}
var _focused_civil_memory_share_token := ""
var _civil_memory_detail_inflight := false
var _civil_memory_detail_loaded := false
var _civil_memory_detail_visible := false
var _civil_memory_detail_unavailable_visible := false
var _civil_memory_detail_unavailable_copy := ""
var _civil_memory_detail_page_visible := false
var _civil_memory_detail_read_model_cache: Dictionary = {}
var _civil_memory_share_inflight := false
var _civil_memory_share_action_visible := false
var _civil_memory_share_feedback_visible := false
var _civil_memory_share_feedback_copy := ""
var _civil_memory_share_token_issued := false

func _init() -> void:
	panel_title = "精彩活动 / 天下大事 / 任务 / 势力状态"
	panel_subtitle = "正式二级页模板"
	panel_empty_state_text = "等待活动、天下大事、任务、势力状态模板快照。"

func _ready() -> void:
	super._ready()
	if _snapshot.is_empty():
		_using_standalone_default_snapshot = true
		var preview_snapshot: Dictionary = _presenter.build_snapshot({})
		preview_snapshot["entry_focus_mode"] = false
		preview_snapshot["activity_motion_prewarm_summary"] = WORLD_EVENT_UI_COMPONENT_FACTORY.prewarm_activity_feature_card_textures_from_snapshot(preview_snapshot)
		set_snapshot(preview_snapshot)
		_refresh_world_affairs_read_model_if_needed()
		_refresh_tasks_read_model_if_needed()

func set_world_event_activity_snapshot(snapshot: Dictionary) -> void:
	var normalized_snapshot := _normalize_entry_snapshot(snapshot)
	if not _world_affairs_read_model_cache.is_empty():
		normalized_snapshot = _presenter.apply_world_affairs_read_model_to_snapshot(normalized_snapshot, _world_affairs_read_model_cache)
	if not _tasks_read_model_cache.is_empty():
		normalized_snapshot = _presenter.apply_tasks_read_model_to_snapshot(normalized_snapshot, _tasks_read_model_cache)
	var requested_default_page_id := str(snapshot.get("default_page_id", "")).strip_edges()
	if _using_standalone_default_snapshot and requested_default_page_id != "":
		_active_page_id = requested_default_page_id
	_using_standalone_default_snapshot = false
	normalized_snapshot["activity_motion_prewarm_summary"] = WORLD_EVENT_UI_COMPONENT_FACTORY.prewarm_activity_feature_card_textures_from_snapshot(normalized_snapshot)
	set_snapshot(normalized_snapshot)
	_refresh_world_affairs_read_model_if_needed()
	_refresh_tasks_read_model_if_needed()

func build_template_snapshot(runtime_context: Dictionary = {}) -> Dictionary:
	return _presenter.build_snapshot(runtime_context)

func get_world_affairs_visual_smoke_summary() -> Dictionary:
	var nodes_summary: Array = []
	var nodes_variant: Variant = _world_affairs_read_model_cache.get("nodes", [])
	if nodes_variant is Array:
		for node_variant in nodes_variant as Array:
			if not (node_variant is Dictionary):
				continue
			var node: Dictionary = node_variant as Dictionary
			nodes_summary.append({
				"nodeId": str(node.get("nodeId", "")).strip_edges(),
				"title": str(node.get("title", "")).strip_edges(),
				"status": str(node.get("status", "")).strip_edges(),
				"claimState": str(node.get("claimState", "")).strip_edges(),
				"canClaim": bool(node.get("canClaim", false)),
			})
	return {
		"readModelLoaded": not _world_affairs_read_model_cache.is_empty(),
		"scenarioId": str(_world_affairs_read_model_cache.get("scenarioId", "")).strip_edges(),
		"scenarioVersion": str(_world_affairs_read_model_cache.get("scenarioVersion", "")).strip_edges(),
		"seasonRunId": str(_world_affairs_read_model_cache.get("seasonRunId", "")).strip_edges(),
		"activeNodeId": str(_world_affairs_read_model_cache.get("activeNodeId", "")).strip_edges(),
		"nodes": nodes_summary,
	}

func get_tasks_visual_smoke_summary() -> Dictionary:
	var tasks_summary: Array = []
	var tasks_variant: Variant = _tasks_read_model_cache.get("tasks", [])
	if tasks_variant is Array:
		for task_variant in tasks_variant as Array:
			if not (task_variant is Dictionary):
				continue
			var task: Dictionary = task_variant as Dictionary
			tasks_summary.append({
				"taskId": str(task.get("taskId", "")).strip_edges(),
				"title": str(task.get("title", "")).strip_edges(),
				"status": str(task.get("status", "")).strip_edges(),
				"claimState": str(task.get("claimState", "")).strip_edges(),
				"canClaim": bool(task.get("canClaim", false)),
			})
	return {
		"readModelLoaded": not _tasks_read_model_cache.is_empty(),
		"scenarioId": str(_tasks_read_model_cache.get("scenarioId", "")).strip_edges(),
		"scenarioVersion": str(_tasks_read_model_cache.get("scenarioVersion", "")).strip_edges(),
		"seasonRunId": str(_tasks_read_model_cache.get("seasonRunId", "")).strip_edges(),
		"activeChapterId": str(_tasks_read_model_cache.get("activeChapterId", "")).strip_edges(),
		"tasks": tasks_summary,
	}

func get_world_event_activity_visual_smoke_summary(page_id: String = "") -> Dictionary:
	var resolved_page_id := page_id.strip_edges()
	if resolved_page_id == "":
		resolved_page_id = get_active_page_id()
	var sections := _visual_smoke_snapshot_dict("sections")
	var entry_configs := _visual_smoke_snapshot_dict("entry_configs")
	var section := _visual_smoke_dict(sections.get(resolved_page_id, {}))
	var entry_config := _visual_smoke_dict(entry_configs.get(resolved_page_id, {}))
	var content_blocks := _visual_smoke_array(section.get("content_blocks", []))
	var block_kinds := _visual_smoke_block_kinds(content_blocks)
	var has_section := not section.is_empty()
	var registered := not entry_config.is_empty()
	var base_ok := resolved_page_id != "" and registered and has_section and content_blocks.size() > 0
	var summary := {
		"ok": base_ok,
		"pageId": resolved_page_id,
		"activePageId": get_active_page_id(),
		"registered": registered,
		"hasSection": has_section,
		"entryPanelIds": _visual_smoke_array(entry_config.get("entry_panel_ids", [])),
		"focusedEntryPageId": str(_snapshot.get("focused_entry_page_id", "")).strip_edges(),
		"civilMemoryFocusRequested": _civil_memory_focus_requested,
		"civilMemoryFocusIdResolved": _focused_civil_memory_internal_id != "",
		"civilMemoryFocusVisible": _civil_memory_focus_visible,
		"civilMemoryDetailLoaded": _civil_memory_detail_loaded,
		"civilMemoryDetailVisible": _civil_memory_detail_visible,
		"civilMemoryDetailUnavailableVisible": _civil_memory_detail_unavailable_visible,
		"civilMemoryDetailUnavailableCopy": _civil_memory_detail_unavailable_copy,
		"civilMemoryDetailPageVisible": _civil_memory_detail_page_visible,
		"civilMemoryDetailSharedVisible": _civil_memory_detail_shared_visible(),
		"civilMemoryShareActionVisible": _civil_memory_share_action_visible,
		"civilMemoryShareFeedbackVisible": _civil_memory_share_feedback_visible,
		"civilMemoryShareFeedbackCopy": _civil_memory_share_feedback_copy,
		"civilMemoryShareTokenIssued": _civil_memory_share_token_issued,
		"contentBlockCount": content_blocks.size(),
		"contentBlockKinds": block_kinds,
		"summaryTitle": str(section.get("summary_title", "")).strip_edges(),
	}
	WORLD_EVENT_UI_COMPONENT_FACTORY.apply_design_system_summary(summary, "world_event_activity_shell", "preview_read_model_shell", false)
	summary["worldEventThemeTokenSet"] = WORLD_EVENT_UI_COMPONENT_FACTORY.DESIGN_SYSTEM_ID
	summary["worldEventPageTokenState"] = resolved_page_id
	summary["worldEventFontScaleMode"] = WORLD_EVENT_UI_COMPONENT_FACTORY.DESIGN_TOKEN_VERSION
	summary["worldEventButtonScaleMode"] = WORLD_EVENT_UI_COMPONENT_FACTORY.DESIGN_TOKEN_VERSION
	WORLD_EVENT_UI_COMPONENT_FACTORY.apply_world_event_activity_shell_summary(summary)
	WORLD_EVENT_UI_COMPONENT_FACTORY.apply_mainline_motion_summary(summary)
	WORLD_EVENT_UI_COMPONENT_FACTORY.apply_snapshot_edge_motion_summary(summary)
	match resolved_page_id:
		"activities":
			var cards := _visual_smoke_first_block_array(content_blocks, "cards")
			var activity_feature_block := _visual_smoke_first_block_dict(content_blocks, "feature_card_grid")
			var activity_feature_layout := str(activity_feature_block.get("layout", "")).strip_edges()
			var activity_feature_featured_count := int(activity_feature_block.get("featured_count", -1))
			var activity_asset_summary := _visual_smoke_activity_asset_summary(cards)
			var activity_prewarm_summary := _visual_smoke_dict(_snapshot.get("activity_motion_prewarm_summary", {}))
			summary["activityCardCount"] = cards.size()
			summary["activityCardGridLayout"] = activity_feature_layout
			summary["activityCardGridFeaturedCount"] = activity_feature_featured_count
			summary["activityCardGridColumns"] = int(activity_feature_block.get("columns", 0))
			summary["activityCardGridUniformReusable"] = activity_feature_layout == "uniform_reusable_grid_v1" and activity_feature_featured_count == 0
			summary["activityCardShowcaseReusable"] = activity_feature_layout == "showcase" and activity_feature_featured_count == 1
			WORLD_EVENT_UI_COMPONENT_FACTORY.apply_activity_motion_sample_summary(summary, activity_feature_layout)
			for key in activity_prewarm_summary.keys():
				summary[key] = activity_prewarm_summary[key]
			for key in activity_asset_summary.keys():
				summary[key] = activity_asset_summary[key]
			summary["ok"] = base_ok and block_kinds.has("feature_card_grid") and cards.size() >= 3 and bool(activity_asset_summary.get("activityAssetContractOk", false))
		"world_affairs":
			var world_affairs_summary := get_world_affairs_visual_smoke_summary()
			var timeline := _visual_smoke_first_block_array(content_blocks, "timeline")
			summary["readModelLoaded"] = bool(world_affairs_summary.get("readModelLoaded", false))
			summary["worldAffairsNodeCount"] = max(timeline.size(), _visual_smoke_array(world_affairs_summary.get("nodes", [])).size())
			summary["ok"] = base_ok and block_kinds.has("world_affairs_scene") and int(summary.get("worldAffairsNodeCount", 0)) >= 1
		"civil_memory_detail":
			var detail_block := _visual_smoke_find_block_by_node_name(content_blocks, "CivilMemoryDedicatedDetailPageBlock")
			summary["civilMemoryDetailPageBlockVisible"] = not detail_block.is_empty()
			summary["ok"] = base_ok and bool(summary.get("civilMemoryDetailPageBlockVisible", false))
		"tasks":
			var tasks_summary := get_tasks_visual_smoke_summary()
			var items := _visual_smoke_first_block_array(content_blocks, "items")
			var nation_midgame_entry := _visual_smoke_find_task_item(items, "nation_midgame_task_entry")
			summary["readModelLoaded"] = bool(tasks_summary.get("readModelLoaded", false))
			summary["taskCount"] = max(items.size(), _visual_smoke_array(tasks_summary.get("tasks", [])).size())
			summary["nationMidgameTaskEntryContractId"] = str(nation_midgame_entry.get("entry_contract_id", "")).strip_edges()
			summary["nationMidgameTaskEntryVisible"] = not nation_midgame_entry.is_empty()
			summary["nationMidgameTaskEntryActionId"] = str(nation_midgame_entry.get("action_id", "")).strip_edges()
			summary["nationMidgameTaskEntryTargetClickAction"] = str(nation_midgame_entry.get("target_click_action", "")).strip_edges()
			summary["ok"] = base_ok and block_kinds.has("task_chapter_split") and int(summary.get("taskCount", 0)) >= 1
		"faction_status":
			var territories := _visual_smoke_first_block_array(content_blocks, "territories")
			summary["territoryCount"] = territories.size()
			summary["emptyShellOk"] = block_kinds.has("faction_status_split")
			summary["ok"] = base_ok and bool(summary.get("emptyShellOk", false))
		_:
			summary["ok"] = false
			summary["reason"] = "unknown_world_event_activity_page"
	return summary

func open_civil_memory_by_internal_id(civil_memory_id: String, focus_payload: Dictionary = {}) -> bool:
	var resolved_id := civil_memory_id.strip_edges()
	if resolved_id == "":
		return false
	_focused_civil_memory_internal_id = resolved_id
	_civil_memory_focus_requested = true
	_civil_memory_focus_payload = _sanitize_civil_memory_focus_payload(focus_payload)
	_focused_civil_memory_share_token = _sanitize_civil_memory_share_token(focus_payload)
	_civil_memory_detail_loaded = false
	_civil_memory_detail_visible = false
	_civil_memory_detail_unavailable_visible = false
	_civil_memory_detail_unavailable_copy = ""
	_civil_memory_detail_page_visible = false
	_civil_memory_detail_read_model_cache = {}
	_civil_memory_share_inflight = false
	_civil_memory_share_action_visible = false
	_civil_memory_share_feedback_visible = false
	_civil_memory_share_feedback_copy = ""
	_civil_memory_share_token_issued = false
	_civil_memory_focus_visible = _insert_civil_memory_focus_block()
	call_deferred("_fetch_civil_memory_detail_if_needed")
	if has_method("set_active_page_id"):
		call("set_active_page_id", "world_affairs")
	return true

func _insert_civil_memory_focus_block() -> bool:
	var sections_variant: Variant = _snapshot.get("sections", {})
	if not (sections_variant is Dictionary):
		return false
	var sections: Dictionary = (sections_variant as Dictionary).duplicate(true)
	var section_variant: Variant = sections.get("world_affairs", {})
	if not (section_variant is Dictionary):
		return false
	var section: Dictionary = (section_variant as Dictionary).duplicate(true)
	var content_blocks: Array = _visual_smoke_array(section.get("content_blocks", []))
	var focus_title := str(_civil_memory_focus_payload.get("title", "传闻已定位")).strip_edges()
	if focus_title == "":
		focus_title = "传闻已定位"
	var focus_summary := str(_civil_memory_focus_payload.get("summary", "已为你打开相关传闻。")).strip_edges()
	if focus_summary == "":
		focus_summary = "已为你打开相关传闻。"
	var focus_result := str(_civil_memory_focus_payload.get("resultLabel", "传闻已定位")).strip_edges()
	if focus_result == "":
		focus_result = "传闻已定位"
	var focus_next := str(_civil_memory_focus_payload.get("nextActionLabel", "可在这里查看相关局势与传闻线索。")).strip_edges()
	if focus_next == "":
		focus_next = "可在这里查看相关局势与传闻线索。"
	var next_blocks: Array = []
	next_blocks.append({
		"kind": "feature_card_grid",
		"title": focus_result,
		"node_name": "CivilMemoryFocusedHintBlock",
		"columns": 1,
		"mobile_columns": 1,
		"featured_count": 0,
		"layout": "compact",
		"cards": [{
			"title": focus_title,
			"value": focus_summary,
			"meta": "天下大势",
			"description": focus_next,
			"tone": "gold",
		}],
	})
	for block_variant in content_blocks:
		next_blocks.append(block_variant)
	section["content_blocks"] = next_blocks
	sections["world_affairs"] = section
	_snapshot["sections"] = sections
	return true

func _sanitize_civil_memory_focus_payload(payload: Dictionary) -> Dictionary:
	return {
		"title": str(payload.get("title", "")).strip_edges(),
		"summary": str(payload.get("summary", "")).strip_edges(),
		"resultLabel": str(payload.get("resultLabel", "")).strip_edges(),
		"consequenceLabel": str(payload.get("consequenceLabel", "")).strip_edges(),
		"nextActionLabel": str(payload.get("nextActionLabel", "")).strip_edges(),
	}

func _sanitize_civil_memory_share_token(payload: Dictionary) -> String:
	return str(payload.get("shareToken", "")).strip_edges()

func _fetch_civil_memory_detail_if_needed() -> void:
	if _civil_memory_detail_inflight or _civil_memory_detail_loaded:
		return
	var resolved_id := _focused_civil_memory_internal_id.strip_edges()
	if resolved_id == "":
		return
	var api_client = _ensure_backend_api_client()
	if api_client == null:
		return
	_civil_memory_detail_inflight = true
	var response: Dictionary = {}
	var share_token := _focused_civil_memory_share_token.strip_edges()
	if api_client.has_method("get_player_history_civil_memory_detail"):
		response = await api_client.call("get_player_history_civil_memory_detail", resolved_id, share_token)
	else:
		var query_parts: Array = ["civilMemoryId=%s" % resolved_id.uri_encode()]
		if share_token != "":
			query_parts.append("shareToken=%s" % share_token.uri_encode())
		response = await api_client.request_json("GET", "/api/player-history/civil-memory-detail?%s" % "&".join(query_parts))
	_civil_memory_detail_inflight = false
	if not bool(response.get("ok", false)):
		_apply_civil_memory_detail_unavailable_response(response)
		return
	var data_variant: Variant = response.get("data", {})
	if not (data_variant is Dictionary):
		_apply_civil_memory_detail_unavailable_copy("这段传闻暂时不可查看")
		return
	var data: Dictionary = data_variant as Dictionary
	var detail_variant: Variant = data.get("civilMemoryDetail", {})
	if not (detail_variant is Dictionary):
		_apply_civil_memory_detail_unavailable_copy("这段传闻暂时不可查看")
		return
	_apply_civil_memory_detail_read_model(detail_variant as Dictionary)

func _apply_civil_memory_detail_read_model(read_model: Dictionary) -> void:
	var contract_id := str(read_model.get("contractId", "")).strip_edges()
	if contract_id != "civil_memory_detail_read_model_v1":
		return
	_civil_memory_detail_read_model_cache = _sanitize_civil_memory_detail_read_model(read_model)
	_civil_memory_detail_loaded = not _civil_memory_detail_read_model_cache.is_empty()
	_civil_memory_detail_visible = _insert_civil_memory_detail_block()
	_civil_memory_detail_page_visible = _insert_civil_memory_detail_page()
	_civil_memory_detail_unavailable_visible = false
	_civil_memory_detail_unavailable_copy = ""
	if _civil_memory_detail_page_visible and has_method("set_active_page_id"):
		call("set_active_page_id", "civil_memory_detail")

func _apply_civil_memory_detail_unavailable_response(response: Dictionary) -> void:
	var data_variant: Variant = response.get("data", {})
	var copy := ""
	if data_variant is Dictionary:
		copy = str((data_variant as Dictionary).get("deniedCopy", "")).strip_edges()
	if copy == "":
		copy = "这段传闻暂时不可查看"
	_apply_civil_memory_detail_unavailable_copy(copy)

func _apply_civil_memory_detail_unavailable_copy(copy: String) -> void:
	var resolved_copy := copy.strip_edges()
	if resolved_copy == "":
		resolved_copy = "这段传闻暂时不可查看"
	_civil_memory_detail_loaded = false
	_civil_memory_detail_visible = false
	_civil_memory_detail_page_visible = false
	_civil_memory_detail_read_model_cache = {}
	_civil_memory_detail_unavailable_copy = resolved_copy
	_civil_memory_detail_unavailable_visible = _insert_civil_memory_detail_unavailable_block()

func _sanitize_civil_memory_detail_read_model(read_model: Dictionary) -> Dictionary:
	var sanitized := {
		"contractId": "civil_memory_detail_read_model_v1",
		"title": str(read_model.get("title", "")).strip_edges(),
		"summary": str(read_model.get("summary", "")).strip_edges(),
		"affectedPartyLabel": str(read_model.get("affectedPartyLabel", "")).strip_edges(),
		"resultLabel": str(read_model.get("resultLabel", "")).strip_edges(),
		"consequenceLabel": str(read_model.get("consequenceLabel", "")).strip_edges(),
		"followUpLabel": str(read_model.get("followUpLabel", "")).strip_edges(),
		"timestampLabel": str(read_model.get("timestampLabel", "")).strip_edges(),
		"relatedCountLabel": str(read_model.get("relatedCountLabel", "")).strip_edges(),
		"responsibilityCountLabel": str(read_model.get("responsibilityCountLabel", "")).strip_edges(),
		"archiveStateLabel": str(read_model.get("archiveStateLabel", "")).strip_edges(),
	}
	var shared_scope := str(read_model.get("sharedScope", "")).strip_edges()
	var share_state_label := str(read_model.get("shareStateLabel", "")).strip_edges()
	var share_retention_label := str(read_model.get("shareRetentionLabel", "")).strip_edges()
	if shared_scope == "public_context" and share_state_label != "":
		sanitized["sharedScope"] = "public_context"
		sanitized["shareStateLabel"] = share_state_label
		if share_retention_label != "":
			sanitized["shareRetentionLabel"] = share_retention_label
	return sanitized

func _civil_memory_detail_shared_visible() -> bool:
	return str(_civil_memory_detail_read_model_cache.get("sharedScope", "")).strip_edges() == "public_context" and str(_civil_memory_detail_read_model_cache.get("shareStateLabel", "")).strip_edges() != ""

func _civil_memory_share_action() -> Dictionary:
	return {
		"id": "civil_memory_share:issue",
		"label": "分享传闻",
	}

func _append_civil_memory_share_feedback_card(cards: Array) -> void:
	if not _civil_memory_share_feedback_visible:
		return
	var resolved_copy := _civil_memory_share_feedback_copy.strip_edges()
	if resolved_copy == "":
		resolved_copy = "分享已准备"
	cards.append({
		"title": "分享",
		"value": resolved_copy,
		"meta": _civil_memory_share_retention_label("可发送给同盟成员"),
		"description": "不会公开内部编号。",
		"tone": "green",
	})

func _append_civil_memory_retention_card(cards: Array) -> void:
	var retention_label := _civil_memory_share_retention_label("")
	if retention_label == "":
		return
	cards.append({
		"title": "有效期",
		"value": retention_label,
		"meta": "短期查看",
		"description": "过期后需重新分享。",
		"tone": "blue",
	})

func _civil_memory_share_retention_label(fallback: String = "") -> String:
	var retention_label := str(_civil_memory_detail_read_model_cache.get("shareRetentionLabel", "")).strip_edges()
	if retention_label != "":
		return retention_label
	return fallback.strip_edges()

func _insert_civil_memory_detail_block() -> bool:
	if _civil_memory_detail_read_model_cache.is_empty():
		return false
	var sections_variant: Variant = _snapshot.get("sections", {})
	if not (sections_variant is Dictionary):
		return false
	var sections: Dictionary = (sections_variant as Dictionary).duplicate(true)
	var section_variant: Variant = sections.get("world_affairs", {})
	if not (section_variant is Dictionary):
		return false
	var section: Dictionary = (section_variant as Dictionary).duplicate(true)
	var content_blocks: Array = _without_civil_memory_block(_visual_smoke_array(section.get("content_blocks", [])), "CivilMemoryDetailBlock")
	var title := str(_civil_memory_detail_read_model_cache.get("title", "传闻详情")).strip_edges()
	if title == "":
		title = "传闻详情"
	var summary := str(_civil_memory_detail_read_model_cache.get("summary", "这段传闻已打开。")).strip_edges()
	if summary == "":
		summary = "这段传闻已打开。"
	var consequence := str(_civil_memory_detail_read_model_cache.get("consequenceLabel", "可继续查看相关局势。")).strip_edges()
	if consequence == "":
		consequence = "可继续查看相关局势。"
	var follow_up := str(_civil_memory_detail_read_model_cache.get("followUpLabel", "继续查看天下大势")).strip_edges()
	if follow_up == "":
		follow_up = "继续查看天下大势"
	var detail_cards: Array = [{
		"title": title,
		"value": summary,
		"meta": str(_civil_memory_detail_read_model_cache.get("timestampLabel", "已记录")).strip_edges(),
		"description": consequence,
		"tone": "gold",
	}, {
		"title": str(_civil_memory_detail_read_model_cache.get("affectedPartyLabel", "相关势力")).strip_edges(),
		"value": str(_civil_memory_detail_read_model_cache.get("resultLabel", "已记录")).strip_edges(),
		"meta": str(_civil_memory_detail_read_model_cache.get("archiveStateLabel", "记录已归档")).strip_edges(),
		"description": follow_up,
		"tone": "blue",
	}, {
		"title": "线索",
		"value": str(_civil_memory_detail_read_model_cache.get("relatedCountLabel", "关联 0 项")).strip_edges(),
		"meta": str(_civil_memory_detail_read_model_cache.get("responsibilityCountLabel", "责任 0 项")).strip_edges(),
		"description": "用于判断后续行动的依据。",
		"tone": "green",
	}]
	if _civil_memory_detail_shared_visible():
		detail_cards.append({
			"title": "共享",
			"value": str(_civil_memory_detail_read_model_cache.get("shareStateLabel", "已开放只读传闻")).strip_edges(),
			"meta": _civil_memory_share_retention_label("只读查看"),
			"description": "可安全查看这段传闻。",
			"tone": "gold",
		})
	_append_civil_memory_retention_card(detail_cards)
	_append_civil_memory_share_feedback_card(detail_cards)
	var detail_actions: Array = [_civil_memory_share_action()]
	var next_blocks: Array = []
	next_blocks.append({
		"kind": "feature_card_grid",
		"title": "传闻详情",
		"node_name": "CivilMemoryDetailBlock",
		"columns": 2,
		"mobile_columns": 1,
		"featured_count": 1,
		"layout": "showcase",
		"actions": detail_actions,
		"cards": detail_cards,
	})
	_civil_memory_share_action_visible = true
	for block_variant in content_blocks:
		next_blocks.append(block_variant)
	section["content_blocks"] = next_blocks
	sections["world_affairs"] = section
	_snapshot["sections"] = sections
	return true

func _insert_civil_memory_detail_unavailable_block() -> bool:
	var sections_variant: Variant = _snapshot.get("sections", {})
	if not (sections_variant is Dictionary):
		return false
	var sections: Dictionary = (sections_variant as Dictionary).duplicate(true)
	var section_variant: Variant = sections.get("world_affairs", {})
	if not (section_variant is Dictionary):
		return false
	var section: Dictionary = (section_variant as Dictionary).duplicate(true)
	var content_blocks: Array = _without_civil_memory_block(_visual_smoke_array(section.get("content_blocks", [])), "CivilMemoryDetailUnavailableBlock")
	var resolved_copy := _civil_memory_detail_unavailable_copy.strip_edges()
	if resolved_copy == "":
		resolved_copy = "这段传闻暂时不可查看"
	var next_blocks: Array = []
	next_blocks.append({
		"kind": "feature_card_grid",
		"title": "传闻暂不可查看",
		"node_name": "CivilMemoryDetailUnavailableBlock",
		"columns": 1,
		"mobile_columns": 1,
		"featured_count": 0,
		"layout": "compact",
		"cards": [{
			"title": "传闻暂不可查看",
			"value": resolved_copy,
			"meta": "天下大势",
			"description": "你仍可先查看相关局势，稍后再回到这段传闻。",
			"tone": "gold",
		}],
	})
	for block_variant in content_blocks:
		next_blocks.append(block_variant)
	section["content_blocks"] = next_blocks
	sections["world_affairs"] = section
	_snapshot["sections"] = sections
	return true

func _insert_civil_memory_detail_page() -> bool:
	if _civil_memory_detail_read_model_cache.is_empty():
		return false
	var sections_variant: Variant = _snapshot.get("sections", {})
	if not (sections_variant is Dictionary):
		return false
	var sections: Dictionary = (sections_variant as Dictionary).duplicate(true)
	var entry_configs: Dictionary = _visual_smoke_snapshot_dict("entry_configs")
	entry_configs["civil_memory_detail"] = {
		"page_id": "civil_memory_detail",
		"panel_title": "传闻详情",
		"panel_subtitle": "已定位的天下传闻",
		"hide_tab_strip": true,
		"entry_panel_ids": ["event", "world_event", "world_affairs"],
		"asset_slots": [],
	}
	sections["civil_memory_detail"] = _build_civil_memory_detail_page_section()
	_snapshot["entry_configs"] = entry_configs
	_snapshot["sections"] = sections
	return true

func _build_civil_memory_detail_page_section() -> Dictionary:
	var title := str(_civil_memory_detail_read_model_cache.get("title", "传闻详情")).strip_edges()
	if title == "":
		title = "传闻详情"
	var summary := str(_civil_memory_detail_read_model_cache.get("summary", "这段传闻已打开。")).strip_edges()
	if summary == "":
		summary = "这段传闻已打开。"
	var consequence := str(_civil_memory_detail_read_model_cache.get("consequenceLabel", "可继续查看相关局势。")).strip_edges()
	if consequence == "":
		consequence = "可继续查看相关局势。"
	var follow_up := str(_civil_memory_detail_read_model_cache.get("followUpLabel", "继续查看天下大势")).strip_edges()
	if follow_up == "":
		follow_up = "继续查看天下大势"
	var detail_cards: Array = [{
		"title": title,
		"value": summary,
		"meta": str(_civil_memory_detail_read_model_cache.get("timestampLabel", "已记录")).strip_edges(),
		"description": consequence,
		"tone": "gold",
	}, {
		"title": str(_civil_memory_detail_read_model_cache.get("affectedPartyLabel", "相关势力")).strip_edges(),
		"value": str(_civil_memory_detail_read_model_cache.get("resultLabel", "已记录")).strip_edges(),
		"meta": str(_civil_memory_detail_read_model_cache.get("archiveStateLabel", "记录已归档")).strip_edges(),
		"description": follow_up,
		"tone": "blue",
	}, {
		"title": "线索",
		"value": str(_civil_memory_detail_read_model_cache.get("relatedCountLabel", "关联 0 项")).strip_edges(),
		"meta": str(_civil_memory_detail_read_model_cache.get("responsibilityCountLabel", "责任 0 项")).strip_edges(),
		"description": "用于判断后续行动的依据。",
		"tone": "green",
	}]
	if _civil_memory_detail_shared_visible():
		detail_cards.append({
			"title": "共享",
			"value": str(_civil_memory_detail_read_model_cache.get("shareStateLabel", "已开放只读传闻")).strip_edges(),
			"meta": _civil_memory_share_retention_label("只读查看"),
			"description": "可安全查看这段传闻。",
			"tone": "gold",
		})
	_append_civil_memory_retention_card(detail_cards)
	_append_civil_memory_share_feedback_card(detail_cards)
	var detail_actions: Array = [_civil_memory_share_action(), {
		"id": "template_open:world_affairs",
		"label": "返回天下大势",
	}]
	return {
		"panel_title": "传闻详情",
		"panel_subtitle": "已定位的天下传闻",
		"back_button_label": "返回",
		"summary_title": title,
		"summary_lines": [summary, consequence],
		"content_first_mode": true,
		"hide_summary_chrome": true,
		"hide_shared_state": true,
		"hide_left_panel": true,
		"hide_detail_title": true,
		"player_reading_mode": true,
		"content_frame_transparent": false,
		"content_margins": [8, 8, 8, 8],
		"body_margins": [44, 24, 44, 30],
		"title_font_size": 34,
		"content_blocks": [{
			"kind": "feature_card_grid",
			"title": "传闻详情",
			"node_name": "CivilMemoryDedicatedDetailPageBlock",
			"columns": 2,
			"mobile_columns": 1,
			"featured_count": 1,
			"layout": "showcase",
			"actions": detail_actions,
			"cards": detail_cards,
		}],
	}

func _without_civil_memory_block(blocks: Array, node_name: String) -> Array:
	var next_blocks: Array = []
	for block_variant in blocks:
		if not (block_variant is Dictionary):
			next_blocks.append(block_variant)
			continue
		var block: Dictionary = block_variant as Dictionary
		if str(block.get("node_name", "")).strip_edges() == node_name:
			continue
		next_blocks.append(block_variant)
	return next_blocks

func _visual_smoke_find_block_by_node_name(blocks: Array, node_name: String) -> Dictionary:
	var resolved_node_name := node_name.strip_edges()
	if resolved_node_name == "":
		return {}
	for block_variant in blocks:
		if not (block_variant is Dictionary):
			continue
		var block: Dictionary = block_variant as Dictionary
		if str(block.get("node_name", "")).strip_edges() == resolved_node_name:
			return block.duplicate(true)
	return {}

func _visual_smoke_find_task_item(items: Array, task_id: String) -> Dictionary:
	var normalized_task_id := task_id.strip_edges()
	for item_variant in items:
		if not (item_variant is Dictionary):
			continue
		var item := item_variant as Dictionary
		if str(item.get("task_id", "")).strip_edges() == normalized_task_id:
			return item.duplicate(true)
	return {}

func _normalize_entry_snapshot(snapshot: Dictionary) -> Dictionary:
	var normalized := snapshot.duplicate(true)
	var entry_focus_mode := bool(normalized.get("entry_focus_mode", true))
	if not entry_focus_mode:
		return normalized
	var default_page_id := str(normalized.get("default_page_id", "")).strip_edges()
	if default_page_id == "":
		return normalized
	var entry_configs: Dictionary = normalized.get("entry_configs", {}) as Dictionary
	if not entry_configs.has(default_page_id):
		return normalized
	var raw_profile: Variant = entry_configs.get(default_page_id, null)
	if not (raw_profile is Dictionary):
		return normalized
	var profile := (raw_profile as Dictionary).duplicate(true)
	var sections: Dictionary = normalized.get("sections", {}) as Dictionary
	if not sections.has(default_page_id):
		return normalized
	var focused_sections := {
		default_page_id: sections.get(default_page_id, {})
	}
	normalized["sections"] = focused_sections
	normalized["focused_entry_page_id"] = default_page_id
	normalized["focused_entry_panel_ids"] = profile.get("entry_panel_ids", [])
	normalized["focused_asset_slots"] = profile.get("asset_slots", [])
	if bool(profile.get("hide_tab_strip", true)):
		normalized["tabs"] = []
	var panel_title_text := str(profile.get("panel_title", "")).strip_edges()
	if panel_title_text != "":
		normalized["title"] = panel_title_text
	var panel_subtitle_text := str(profile.get("panel_subtitle", "")).strip_edges()
	if panel_subtitle_text != "":
		normalized["subtitle"] = panel_subtitle_text
	return normalized

func _on_section_page_action_requested(action_id: String) -> void:
	if action_id.begins_with("world_affairs_claim:"):
		var node_id := action_id.trim_prefix("world_affairs_claim:").strip_edges()
		if node_id != "":
			call_deferred("_claim_world_affairs_node_reward", node_id)
		return
	if action_id.begins_with("task_claim:"):
		var task_id := action_id.trim_prefix("task_claim:").strip_edges()
		if task_id != "":
			call_deferred("_claim_task_reward", task_id)
		return
	if action_id == "civil_memory_share:issue":
		call_deferred("_issue_civil_memory_share_token")
		return
	if action_id.begins_with("template_open:"):
		var page_id := action_id.trim_prefix("template_open:").strip_edges()
		if page_id != "":
			set_active_page_id(page_id)
			page_changed.emit(page_id)
		return
	if action_id == "template_back":
		back_requested.emit()
		return
	if action_id == "template_close":
		close_requested.emit()
		return
	page_action_requested.emit(get_active_page_id(), action_id)

func _issue_civil_memory_share_token() -> void:
	if _civil_memory_share_inflight:
		return
	var resolved_id := _focused_civil_memory_internal_id.strip_edges()
	if resolved_id == "":
		_apply_civil_memory_share_feedback("这段传闻暂时无法分享", false)
		return
	var api_client = _ensure_backend_api_client()
	if api_client == null:
		_apply_civil_memory_share_feedback("这段传闻暂时无法分享", false)
		return
	_civil_memory_share_inflight = true
	var response: Dictionary = {}
	if api_client.has_method("post_player_history_civil_memory_detail_share_token"):
		response = await api_client.call("post_player_history_civil_memory_detail_share_token", resolved_id, "player", 300000)
	else:
		response = await api_client.request_json("POST", "/api/player-history/civil-memory-detail/share-token?civilMemoryId=%s&factionId=player" % resolved_id.uri_encode(), {
			"ttlMs": 300000,
		})
	_civil_memory_share_inflight = false
	if not bool(response.get("ok", false)):
		var denied_copy := "这段传闻暂时无法分享"
		var data_variant: Variant = response.get("data", {})
		if data_variant is Dictionary:
			var copy := str((data_variant as Dictionary).get("deniedCopy", "")).strip_edges()
			if copy != "":
				denied_copy = copy
		_apply_civil_memory_share_feedback(denied_copy, false)
		return
	var data: Dictionary = {}
	var data_variant: Variant = response.get("data", {})
	if data_variant is Dictionary:
		data = data_variant as Dictionary
	var issued_token := str(data.get("shareToken", "")).strip_edges()
	if issued_token == "":
		_apply_civil_memory_share_feedback("这段传闻暂时无法分享", false)
		return
	_focused_civil_memory_share_token = issued_token
	_civil_memory_share_token_issued = true
	var retention_label := str(data.get("shareRetentionLabel", "")).strip_edges()
	if retention_label != "":
		_civil_memory_detail_read_model_cache["shareRetentionLabel"] = retention_label
	_apply_civil_memory_share_feedback("分享已准备", true)

func _apply_civil_memory_share_feedback(copy: String, issued: bool) -> void:
	var resolved_copy := copy.strip_edges()
	if resolved_copy == "":
		resolved_copy = "分享已准备" if issued else "这段传闻暂时无法分享"
	_civil_memory_share_feedback_copy = resolved_copy
	_civil_memory_share_feedback_visible = true
	if issued:
		_civil_memory_share_token_issued = true
	if not _civil_memory_detail_read_model_cache.is_empty():
		_civil_memory_detail_visible = _insert_civil_memory_detail_block()
		_civil_memory_detail_page_visible = _insert_civil_memory_detail_page()
		if _civil_memory_detail_page_visible and has_method("set_active_page_id"):
			call("set_active_page_id", "civil_memory_detail")

func _refresh_world_affairs_read_model_if_needed() -> void:
	if _world_affairs_read_model_inflight:
		return
	if not _snapshot_has_page("world_affairs"):
		return
	_world_affairs_read_model_inflight = true
	call_deferred("_fetch_world_affairs_read_model")

func _refresh_tasks_read_model_if_needed() -> void:
	if _tasks_read_model_inflight:
		return
	if not _snapshot_has_page("tasks"):
		return
	_tasks_read_model_inflight = true
	call_deferred("_fetch_tasks_read_model")

func _fetch_world_affairs_read_model() -> void:
	if get_tree() != null:
		await get_tree().process_frame
	var api_client = _ensure_backend_api_client()
	if api_client == null:
		_world_affairs_read_model_inflight = false
		return
	var response: Dictionary = await api_client.request_json("GET", WORLD_AFFAIRS_READ_MODEL_PATH)
	_world_affairs_read_model_inflight = false
	if not bool(response.get("ok", false)):
		return
	var data_variant: Variant = response.get("data", {})
	if not (data_variant is Dictionary):
		return
	var data: Dictionary = data_variant as Dictionary
	var read_model_variant: Variant = data.get("worldAffairs", data)
	if not (read_model_variant is Dictionary):
		return
	var read_model: Dictionary = read_model_variant as Dictionary
	if read_model.is_empty():
		return
	_world_affairs_read_model_cache = read_model.duplicate(true)
	var merged_snapshot: Dictionary = _presenter.apply_world_affairs_read_model_to_snapshot(_snapshot, read_model)
	set_snapshot(merged_snapshot)

func _fetch_tasks_read_model() -> void:
	if get_tree() != null:
		await get_tree().process_frame
	var api_client: Node = _ensure_backend_api_client()
	if api_client == null:
		_tasks_read_model_inflight = false
		return
	var response: Dictionary = await api_client.request_json("GET", WORLD_TASKS_READ_MODEL_PATH)
	_tasks_read_model_inflight = false
	if not bool(response.get("ok", false)):
		return
	var data_variant: Variant = response.get("data", {})
	if not (data_variant is Dictionary):
		return
	var data: Dictionary = data_variant as Dictionary
	var read_model_variant: Variant = data.get("worldTasks", data)
	if not (read_model_variant is Dictionary):
		return
	var read_model: Dictionary = read_model_variant as Dictionary
	if read_model.is_empty():
		return
	_tasks_read_model_cache = read_model.duplicate(true)
	var merged_snapshot: Dictionary = _presenter.apply_tasks_read_model_to_snapshot(_snapshot, read_model)
	set_snapshot(merged_snapshot)

func _claim_world_affairs_node_reward(node_id: String) -> void:
	if _world_affairs_claim_inflight:
		return
	var claim_node := _find_world_affairs_node(node_id)
	if claim_node.is_empty():
		return
	if not bool(claim_node.get("canClaim", false)):
		return
	var claim_state := str(claim_node.get("claimState", "")).strip_edges()
	if claim_state != "" and claim_state != "claimable":
		return
	var payload := _build_world_affairs_claim_payload(node_id)
	if payload.is_empty():
		return
	var api_client = _ensure_backend_api_client()
	if api_client == null:
		return
	_world_affairs_claim_inflight = true
	var response: Dictionary = await api_client.request_json("POST", WORLD_AFFAIRS_ACTION_PATH, {
		"action": "claimWorldAffairsNodeReward",
		"payload": payload,
	})
	_world_affairs_claim_inflight = false
	if not bool(response.get("ok", false)):
		return
	var data_variant: Variant = response.get("data", {})
	if not (data_variant is Dictionary):
		return
	var data: Dictionary = data_variant as Dictionary
	if not bool(data.get("ok", false)):
		return
	var world_variant: Variant = data.get("world", null)
	if world_variant is Dictionary:
		WorldStore.set_world(world_variant as Dictionary)
	else:
		await _refresh_authoritative_world_summary(api_client)
	await _fetch_world_affairs_read_model()

func _claim_task_reward(task_id: String) -> void:
	if _tasks_claim_inflight:
		return
	var claim_task := _find_task(task_id)
	if claim_task.is_empty():
		return
	if not bool(claim_task.get("canClaim", false)):
		return
	var claim_state := str(claim_task.get("claimState", "")).strip_edges()
	if claim_state != "" and claim_state != "claimable":
		return
	var payload := _build_task_claim_payload(task_id)
	if payload.is_empty():
		return
	var api_client: Node = _ensure_backend_api_client()
	if api_client == null:
		return
	_tasks_claim_inflight = true
	var response: Dictionary = await api_client.request_json("POST", WORLD_TASKS_ACTION_PATH, {
		"action": "claimTaskReward",
		"payload": payload,
	})
	_tasks_claim_inflight = false
	if not bool(response.get("ok", false)):
		return
	var data_variant: Variant = response.get("data", {})
	if not (data_variant is Dictionary):
		return
	var data: Dictionary = data_variant as Dictionary
	if not bool(data.get("ok", false)):
		return
	var world_variant: Variant = data.get("world", null)
	if world_variant is Dictionary:
		WorldStore.set_world(world_variant as Dictionary)
	else:
		await _refresh_authoritative_world_summary(api_client)
	await _fetch_tasks_read_model()

func _build_world_affairs_claim_payload(node_id: String) -> Dictionary:
	var scenario_id := str(_world_affairs_read_model_cache.get("scenarioId", "")).strip_edges()
	var scenario_version := str(_world_affairs_read_model_cache.get("scenarioVersion", "")).strip_edges()
	var season_run_id := str(_world_affairs_read_model_cache.get("seasonRunId", "")).strip_edges()
	var normalized_node_id := node_id.strip_edges()
	if scenario_id == "" or scenario_version == "" or season_run_id == "" or normalized_node_id == "":
		return {}
	return {
		"factionId": "player",
		"scenarioId": scenario_id,
		"scenarioVersion": scenario_version,
		"seasonRunId": season_run_id,
		"nodeId": normalized_node_id,
	}

func _build_task_claim_payload(task_id: String) -> Dictionary:
	var scenario_id := str(_tasks_read_model_cache.get("scenarioId", "")).strip_edges()
	var scenario_version := str(_tasks_read_model_cache.get("scenarioVersion", "")).strip_edges()
	var season_run_id := str(_tasks_read_model_cache.get("seasonRunId", "")).strip_edges()
	var faction_id := str(_tasks_read_model_cache.get("factionId", "player")).strip_edges()
	var normalized_task_id := task_id.strip_edges()
	if faction_id == "":
		faction_id = "player"
	if scenario_id == "" or scenario_version == "" or season_run_id == "" or normalized_task_id == "":
		return {}
	return {
		"factionId": faction_id,
		"scenarioId": scenario_id,
		"scenarioVersion": scenario_version,
		"seasonRunId": season_run_id,
		"taskId": normalized_task_id,
	}

func _find_world_affairs_node(node_id: String) -> Dictionary:
	var normalized_node_id := node_id.strip_edges()
	if normalized_node_id == "":
		return {}
	var nodes_variant: Variant = _world_affairs_read_model_cache.get("nodes", [])
	if not (nodes_variant is Array):
		return {}
	for node_variant in nodes_variant as Array:
		if not (node_variant is Dictionary):
			continue
		var node: Dictionary = node_variant as Dictionary
		if str(node.get("nodeId", "")).strip_edges() == normalized_node_id:
			return node.duplicate(true)
	return {}

func _find_task(task_id: String) -> Dictionary:
	var normalized_task_id := task_id.strip_edges()
	if normalized_task_id == "":
		return {}
	var tasks_variant: Variant = _tasks_read_model_cache.get("tasks", [])
	if not (tasks_variant is Array):
		return {}
	for task_variant in tasks_variant as Array:
		if not (task_variant is Dictionary):
			continue
		var task: Dictionary = task_variant as Dictionary
		if str(task.get("taskId", "")).strip_edges() == normalized_task_id:
			return task.duplicate(true)
	return {}

func _refresh_authoritative_world_summary(api_client: Node) -> void:
	if api_client == null or not api_client.has_method("get_world_summary"):
		return
	var world_result: Dictionary = await api_client.get_world_summary()
	if not bool(world_result.get("ok", false)):
		return
	var world_response_variant: Variant = world_result.get("data", {})
	if not (world_response_variant is Dictionary):
		return
	var world_response: Dictionary = world_response_variant as Dictionary
	var world_variant: Variant = world_response.get("world", world_response)
	if world_variant is Dictionary:
		var world_data: Dictionary = world_variant as Dictionary
		if not world_data.is_empty():
			WorldStore.set_world(world_data)

func _ensure_backend_api_client() -> Node:
	if _backend_api_client != null and is_instance_valid(_backend_api_client):
		return _backend_api_client
	var client: Node = BACKEND_API_CLIENT_SCRIPT.new()
	if client == null:
		return null
	add_child(client)
	_backend_api_client = client
	if _backend_api_client.has_method("configure"):
		_backend_api_client.call("configure", AppConfig.backend_base_url)
	return _backend_api_client

func _visual_smoke_snapshot_dict(key: String) -> Dictionary:
	return _visual_smoke_dict(_snapshot.get(key, {}))

func _visual_smoke_dict(value: Variant) -> Dictionary:
	if value is Dictionary:
		return (value as Dictionary).duplicate(true)
	return {}

func _visual_smoke_array(value: Variant) -> Array:
	if value is Array:
		return (value as Array).duplicate(true)
	return []


func _visual_smoke_block_kinds(blocks: Array) -> Array:
	var kinds: Array = []
	for block_variant in blocks:
		if not (block_variant is Dictionary):
			continue
		var kind := str((block_variant as Dictionary).get("kind", "")).strip_edges()
		if kind != "":
			kinds.append(kind)
	return kinds

func _visual_smoke_first_block_array(blocks: Array, key: String) -> Array:
	for block_variant in blocks:
		if not (block_variant is Dictionary):
			continue
		var block: Dictionary = block_variant as Dictionary
		var value: Variant = block.get(key, [])
		if value is Array:
			return (value as Array).duplicate(true)
	return []


func _visual_smoke_first_block_dict(blocks: Array, kind: String) -> Dictionary:
	for block_variant in blocks:
		if not (block_variant is Dictionary):
			continue
		var block: Dictionary = block_variant as Dictionary
		if str(block.get("kind", "")).strip_edges() == kind:
			return block.duplicate(true)
	return {}


func _visual_smoke_activity_asset_summary(cards: Array) -> Dictionary:
	var assigned_count := 0
	var slot_count := 0
	var allowed_root_count := 0
	var cover_mode_count := 0
	var empty_missing_count := 0
	var invalid_path_count := 0
	for card_variant in cards:
		if not (card_variant is Dictionary):
			continue
		var card: Dictionary = card_variant as Dictionary
		var image_path := str(card.get("image_path", "")).strip_edges()
		var asset_slot := str(card.get("asset_slot", card.get("assetSlot", ""))).strip_edges()
		var cover_mode := str(card.get("cover_mode", card.get("coverMode", ""))).strip_edges()
		var is_empty := bool(card.get("empty", false))
		if asset_slot != "":
			slot_count += 1
		if image_path == "":
			if is_empty:
				empty_missing_count += 1
			continue
		assigned_count += 1
		if _visual_smoke_activity_asset_path_allowed(image_path):
			allowed_root_count += 1
		else:
			invalid_path_count += 1
		if cover_mode == "asset_drop_cover":
			cover_mode_count += 1
	return {
		"activityAssetSlotCount": slot_count,
		"activityAssetAssignedCount": assigned_count,
		"activityAssetAllowedRootCount": allowed_root_count,
		"activityAssetCoverModeCount": cover_mode_count,
		"activityAssetEmptyMissingCount": empty_missing_count,
		"activityAssetInvalidPathCount": invalid_path_count,
		"activityAssetContractOk": assigned_count >= 3 and assigned_count == allowed_root_count and assigned_count == cover_mode_count and invalid_path_count == 0,
	}


func _visual_smoke_activity_asset_path_allowed(image_path: String) -> bool:
	var normalized_path := image_path.strip_edges()
	if normalized_path == "":
		return false
	for root_variant in WORLD_EVENT_UI_COMPONENT_FACTORY.snapshot_feature_card_allowed_asset_roots():
		var root := str(root_variant).strip_edges()
		if root != "" and normalized_path.begins_with(root):
			return true
	return false
