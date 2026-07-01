extends RefCounted
class_name WorldEventActivityPresenter

const TEMPLATE_FIXTURE_PATH := "res://data/ui/world_event_activity_template_fixture.json"
const MOBILE_LANDSCAPE_STACK_BREAKPOINT := 1024
const NATION_MIDGAME_TASK_ENTRY_CONTRACT := "nation_midgame_task_entry_v1"
const WORLD_AFFAIRS_ROUND02_ASSET_ROOT := "res://data/ui/world_event_activity_asset_drop/round_02_window4_2026_04_30/world_affairs"
const TASK_CHAPTER_ROUND02_ASSET_ROOT := "res://data/ui/world_event_activity_asset_drop/round_02_window4_2026_04_30/tasks"
const WORLD_AFFAIRS_ASSET_SLOT_PATHS := {
	"world_affairs_node_01": "%s/world_affairs_node_01_huang_tian.jpg" % WORLD_AFFAIRS_ROUND02_ASSET_ROOT,
	"world_affairs_node_huangtian_01": "%s/world_affairs_node_01_huang_tian.jpg" % WORLD_AFFAIRS_ROUND02_ASSET_ROOT,
	"world_affairs_node_02": "%s/world_affairs_node_02_han_decline.jpg" % WORLD_AFFAIRS_ROUND02_ASSET_ROOT,
	"world_affairs_node_huangtian_02": "%s/world_affairs_node_02_han_decline.jpg" % WORLD_AFFAIRS_ROUND02_ASSET_ROOT,
	"world_affairs_node_03": "%s/world_affairs_node_03_chaos.jpg" % WORLD_AFFAIRS_ROUND02_ASSET_ROOT,
	"world_affairs_node_huangtian_03": "%s/world_affairs_node_03_chaos.jpg" % WORLD_AFFAIRS_ROUND02_ASSET_ROOT,
	"world_affairs_node_04": "%s/world_affairs_node_04_prepare_army.jpg" % WORLD_AFFAIRS_ROUND02_ASSET_ROOT,
	"world_affairs_node_05": "%s/world_affairs_node_05_warlords.jpg" % WORLD_AFFAIRS_ROUND02_ASSET_ROOT,
	"world_affairs_node_06": "%s/world_affairs_node_06_campaign_ready.jpg" % WORLD_AFFAIRS_ROUND02_ASSET_ROOT,
	"world_affairs_node_07": "%s/world_affairs_node_07_states_rise.jpg" % WORLD_AFFAIRS_ROUND02_ASSET_ROOT,
	"world_affairs_node_08": "%s/world_affairs_node_08_seven_wars.jpg" % WORLD_AFFAIRS_ROUND02_ASSET_ROOT,
	"world_affairs_node_09": "%s/world_affairs_node_09_restore_order.jpg" % WORLD_AFFAIRS_ROUND02_ASSET_ROOT,
	"world_affairs_node_10": "%s/world_affairs_node_10_unstoppable.jpg" % WORLD_AFFAIRS_ROUND02_ASSET_ROOT,
}
const TASK_CHAPTER_SCENE_PATHS := {
	"chapter_01": "%s/task_chapter_01_beginner_city.jpg" % TASK_CHAPTER_ROUND02_ASSET_ROOT,
	"huangtian_chapter_01": "%s/task_chapter_01_beginner_city.jpg" % TASK_CHAPTER_ROUND02_ASSET_ROOT,
	"task_chapter_huangtian_01": "%s/task_chapter_01_beginner_city.jpg" % TASK_CHAPTER_ROUND02_ASSET_ROOT,
	"chapter_02": "%s/task_chapter_02_land_claim.jpg" % TASK_CHAPTER_ROUND02_ASSET_ROOT,
	"huangtian_chapter_02": "%s/task_chapter_02_land_claim.jpg" % TASK_CHAPTER_ROUND02_ASSET_ROOT,
	"task_chapter_huangtian_02": "%s/task_chapter_02_land_claim.jpg" % TASK_CHAPTER_ROUND02_ASSET_ROOT,
	"chapter_03": "%s/task_chapter_03_recruit_army.jpg" % TASK_CHAPTER_ROUND02_ASSET_ROOT,
	"huangtian_chapter_03": "%s/task_chapter_03_recruit_army.jpg" % TASK_CHAPTER_ROUND02_ASSET_ROOT,
	"task_chapter_huangtian_03": "%s/task_chapter_03_recruit_army.jpg" % TASK_CHAPTER_ROUND02_ASSET_ROOT,
	"chapter_04": "%s/task_chapter_04_build_upgrade.jpg" % TASK_CHAPTER_ROUND02_ASSET_ROOT,
	"huangtian_chapter_04": "%s/task_chapter_04_build_upgrade.jpg" % TASK_CHAPTER_ROUND02_ASSET_ROOT,
	"task_chapter_huangtian_04": "%s/task_chapter_04_build_upgrade.jpg" % TASK_CHAPTER_ROUND02_ASSET_ROOT,
	"chapter_05": "%s/task_chapter_05_first_campaign.jpg" % TASK_CHAPTER_ROUND02_ASSET_ROOT,
	"huangtian_chapter_05": "%s/task_chapter_05_first_campaign.jpg" % TASK_CHAPTER_ROUND02_ASSET_ROOT,
	"task_chapter_huangtian_05": "%s/task_chapter_05_first_campaign.jpg" % TASK_CHAPTER_ROUND02_ASSET_ROOT,
}

func build_snapshot(runtime_context: Dictionary = {}) -> Dictionary:
	var fixture: Dictionary = _load_template_fixture()
	var shared_state: Dictionary = _build_shared_state(fixture, runtime_context)
	return {
		"title": "精彩活动 / 天下大势 / 任务 / 势力状态",
		"subtitle": "正式二级页模板：活动卡、赛季目标线、章节任务、势力状态。",
		"empty_state_text": "当前页暂无可显示内容。",
		"shared_state": shared_state,
		"default_page_id": "activities",
		"entry_configs": _build_entry_configs(fixture),
		"short_viewport_compact": true,
		"short_viewport_compact_height": 760,
		"tabs": [
			{"id": "activities", "label": "精彩活动"},
			{"id": "world_affairs", "label": "天下大势"},
			{"id": "tasks", "label": "任务"},
			{"id": "faction_status", "label": "势力状态"},
		],
		"sections": {
			"activities": _build_activities_section(fixture),
			"world_affairs": _build_world_affairs_section(fixture, runtime_context),
			"tasks": _build_tasks_section(fixture, runtime_context),
			"faction_status": _build_faction_status_section(fixture),
		},
	}

func apply_world_affairs_read_model_to_snapshot(snapshot: Dictionary, read_model: Dictionary) -> Dictionary:
	if read_model.is_empty():
		return snapshot.duplicate(true)
	var normalized: Dictionary = snapshot.duplicate(true)
	var sections_variant: Variant = normalized.get("sections", {})
	if not (sections_variant is Dictionary):
		return normalized
	var sections: Dictionary = (sections_variant as Dictionary).duplicate(true)
	if not sections.has("world_affairs"):
		return normalized
	var section_variant: Variant = sections.get("world_affairs", {})
	if not (section_variant is Dictionary):
		return normalized
	var section: Dictionary = (section_variant as Dictionary).duplicate(true)
	var previous_blocks := _page_array(section, "content_blocks", [])
	var preserved_campaign_blocks := _filter_backend_ai_campaign_blocks(previous_blocks)
	var page: Dictionary = _build_world_affairs_page_from_read_model(read_model)
	section["summary_title"] = _page_string(page, "headline", "天下大势")
	section["summary_lines"] = _page_array(page, "summary_lines", [])
	var next_blocks: Array = preserved_campaign_blocks
	next_blocks.append(_build_world_affairs_scene_block("天下", page, _page_array(page, "timeline", []), "WorldAffairsSceneBlock"))
	section["content_blocks"] = next_blocks
	sections["world_affairs"] = section
	normalized["sections"] = sections
	normalized["world_affairs_source"] = "backend_read_model"
	return normalized

func apply_tasks_read_model_to_snapshot(snapshot: Dictionary, read_model: Dictionary) -> Dictionary:
	if read_model.is_empty():
		return snapshot.duplicate(true)
	var normalized: Dictionary = snapshot.duplicate(true)
	var sections_variant: Variant = normalized.get("sections", {})
	if not (sections_variant is Dictionary):
		return normalized
	var sections: Dictionary = (sections_variant as Dictionary).duplicate(true)
	if not sections.has("tasks"):
		return normalized
	var section_variant: Variant = sections.get("tasks", {})
	if not (section_variant is Dictionary):
		return normalized
	var section: Dictionary = (section_variant as Dictionary).duplicate(true)
	var page: Dictionary = _build_task_page_from_read_model(read_model)
	var task_items: Array = _page_array(page, "task_items", [])
	section["summary_title"] = _page_string(page, "headline", "任务")
	section["summary_lines"] = _page_array(page, "summary_lines", [])
	section["content_blocks"] = [
		_build_task_chapter_split_block("主要事宜", page, task_items, "TaskChapterSplitBlock"),
	]
	sections["tasks"] = section
	normalized["sections"] = sections
	normalized["tasks_source"] = "backend_read_model"
	return normalized

func _build_entry_configs(fixture: Dictionary) -> Dictionary:
	var fixture_configs: Dictionary = _fixture_dict(fixture, "entry_configs")
	var defaults: Dictionary = {
		"activities": {
			"page_id": "activities",
			"panel_title": "精彩活动",
			"panel_subtitle": "活动卡模板",
			"hide_tab_strip": true,
			"entry_panel_ids": ["activity"],
			"asset_slots": ["activity_login_reward", "activity_inherit", "activity_shop"],
			"asset_contract": {
				"contract_id": "world_event_activity_card_asset_roots_v1",
				"allowed_roots": ["res://data/ui/world_event_activity_asset_drop/"],
				"recommended_size": {"width": 1280, "height": 720},
				"minimum_size": {"width": 640, "height": 360},
				"aspect_ratio": "16:9",
				"layout_mode": "original_showcase",
				"required_cover_mode": "asset_drop_cover",
				"missing_asset_policy": "empty_slot_placeholder",
			},
		},
		"world_affairs": {
			"page_id": "world_affairs",
			"panel_title": "天下大势",
			"panel_subtitle": "赛季目标线模板",
			"hide_tab_strip": true,
			"entry_panel_ids": ["event", "world_event", "world_affairs"],
			"asset_slots": [
				"world_affairs_scene",
				"world_affairs_node_01",
				"world_affairs_node_02",
				"world_affairs_node_03",
				"world_affairs_node_04",
				"world_affairs_node_05",
				"world_affairs_node_06",
				"world_affairs_node_07",
				"world_affairs_node_08",
				"world_affairs_node_09",
				"world_affairs_node_10",
			],
		},
		"tasks": {
			"page_id": "tasks",
			"panel_title": "任务",
			"panel_subtitle": "章节任务模板",
			"hide_tab_strip": true,
			"entry_panel_ids": ["tasks"],
			"asset_slots": ["task_chapter_scene"],
		},
		"faction_status": {
			"page_id": "faction_status",
			"panel_title": "势力状态",
			"panel_subtitle": "领地动态模板",
			"hide_tab_strip": true,
			"entry_panel_ids": ["faction_status"],
			"asset_slots": [],
		},
	}
	for key in fixture_configs.keys():
		var raw_config: Variant = fixture_configs.get(key, null)
		if not (raw_config is Dictionary):
			continue
		var merged: Dictionary = {}
		if defaults.has(key):
			merged = (defaults[key] as Dictionary).duplicate(true)
		var config_dict: Dictionary = (raw_config as Dictionary).duplicate(true)
		for config_key in config_dict.keys():
			merged[config_key] = config_dict[config_key]
		defaults[key] = merged
	return defaults

func _with_content_first(panel_title: String, section: Dictionary) -> Dictionary:
	section["panel_title"] = panel_title
	section["content_first_mode"] = true
	section["hide_summary_chrome"] = true
	section["hide_shared_state"] = true
	section["hide_left_panel"] = true
	section["hide_detail_title"] = true
	section["player_reading_mode"] = true
	section["content_frame_transparent"] = false
	section["content_margins"] = [8, 8, 8, 8]
	section["body_margins"] = [44, 24, 44, 30]
	section["title_font_size"] = 34
	return section

func _build_shared_state(fixture: Dictionary, runtime_context: Dictionary) -> Dictionary:
	return {
		"season_label": _resolve_context_string(runtime_context, fixture, "season_label", "赛季 S1"),
		"season_phase": _resolve_context_string(runtime_context, fixture, "season_phase", "立业月"),
		"template_scope": _resolve_context_string(runtime_context, fixture, "template_scope", "正式二级页模板"),
		"activity_status": _resolve_context_string(runtime_context, fixture, "activity_status", "精彩活动模板"),
		"world_affairs_status": _resolve_context_string(runtime_context, fixture, "world_affairs_status", "天下大势模板"),
		"task_status": _resolve_context_string(runtime_context, fixture, "task_status", "章节任务模板"),
		"faction_status": _resolve_context_string(runtime_context, fixture, "faction_status_label", "势力状态模板"),
		"jade_currency_label": _resolve_context_string(runtime_context, fixture, "jade_currency_label", "玉符"),
		"resource_reward_label": _resolve_context_string(runtime_context, fixture, "resource_reward_label", "资源"),
		"authority_binding": _resolve_context_string(runtime_context, fixture, "authority_binding", "尚未接入系统判定"),
	}

func _build_activities_section(fixture: Dictionary) -> Dictionary:
	var page: Dictionary = _fixture_dict(fixture, "activities")
	var cards: Array = _page_array(page, "cards", [])
	return _with_content_first("精彩活动", {
		"summary_title": "精彩活动",
		"shared_state_title": "活动模板状态",
		"shared_state_fields": [
			{"key": "activity_status", "label": "活动"},
			{"key": "jade_currency_label", "label": "主要奖励"},
			{"key": "authority_binding", "label": "权属"},
		],
		"summary_lines": _page_array(page, "summary_lines", [
			"精彩活动页展示活动卡片矩阵。",
			"章节奖励以后续结算为准。",
		]),
		"list_title": "",
		"left_card_columns": 2,
		"mobile_stack": true,
		"mobile_stack_breakpoint": MOBILE_LANDSCAPE_STACK_BREAKPOINT,
		"item_cards": [],
		"detail_title": "",
		"content_blocks": [
			_build_feature_card_grid_block("精彩活动", cards, "ActivityFeatureGridBlock", 3, 1, "showcase"),
		],
	})

func _build_world_affairs_section(fixture: Dictionary, runtime_context: Dictionary = {}) -> Dictionary:
	var page: Dictionary = _resolve_world_affairs_page(fixture, runtime_context)
	var content_blocks: Array = []
	var backend_campaign_cards := _build_backend_ai_campaign_cards(runtime_context)
	if not backend_campaign_cards.is_empty():
		content_blocks.append(_build_feature_card_grid_block(
			"AI战役复盘",
			backend_campaign_cards,
			"WorldAffairsBackendAiCampaignBlock",
			3,
			0,
			"compact"
		))
	content_blocks.append(_build_world_affairs_scene_block("天下", page, _page_array(page, "timeline", []), "WorldAffairsSceneBlock"))
	return _with_content_first("天下大势", {
		"summary_title": "天下大势",
		"shared_state_title": "天下大势状态",
		"shared_state_fields": [
			{"key": "season_label", "label": "赛季"},
			{"key": "season_phase", "label": "阶段"},
			{"key": "world_affairs_status", "label": "模板"},
			{"key": "jade_currency_label", "label": "奖励"},
		],
		"summary_lines": _page_array(page, "summary_lines", [
			"天下大势展示本月目标线和局势推进。",
			"当前不做国战规则。",
		]),
		"list_title": "",
		"left_card_columns": 3,
		"mobile_stack": true,
		"mobile_stack_breakpoint": MOBILE_LANDSCAPE_STACK_BREAKPOINT,
		"item_cards": [],
		"detail_title": "",
		"content_blocks": content_blocks,
	})

func _resolve_world_affairs_page(fixture: Dictionary, runtime_context: Dictionary) -> Dictionary:
	var read_model_variant: Variant = runtime_context.get("world_affairs_read_model", {})
	if read_model_variant is Dictionary and not (read_model_variant as Dictionary).is_empty():
		return _build_world_affairs_page_from_read_model(read_model_variant as Dictionary)
	var page: Dictionary = _fixture_dict(fixture, "world_affairs").duplicate(true)
	var scenario_variants: Variant = page.get("scenario_catalog", [])
	if not (scenario_variants is Array):
		return page
	var scenarios: Array = scenario_variants as Array
	if scenarios.is_empty():
		return page
	var scenario_id: String = _resolve_context_string(runtime_context, fixture, "world_affairs_scenario_id", str(page.get("active_scenario_id", ""))).strip_edges()
	var selected: Dictionary = {}
	for scenario_variant in scenarios:
		if not (scenario_variant is Dictionary):
			continue
		var scenario: Dictionary = scenario_variant as Dictionary
		if selected.is_empty() and bool(scenario.get("default", false)):
			selected = scenario
		if scenario_id != "" and str(scenario.get("scenario_id", "")).strip_edges() == scenario_id:
			selected = scenario
			break
	if selected.is_empty():
		for scenario_variant in scenarios:
			if scenario_variant is Dictionary:
				selected = scenario_variant as Dictionary
				break
	if selected.is_empty():
		return page
	page["active_scenario_id"] = str(selected.get("scenario_id", scenario_id)).strip_edges()
	page["active_script_id"] = str(selected.get("script_id", "")).strip_edges()
	page["active_season_id"] = str(selected.get("season_id", "")).strip_edges()
	for key in ["headline", "subtitle", "state", "target", "achieved_at", "scene_image_path", "timeline", "summary_cards", "summary_lines"]:
		if selected.has(key):
			page[key] = selected[key]
	return page


func _build_backend_ai_campaign_cards(runtime_context: Dictionary) -> Array:
	var campaign_archive := _read_backend_ai_rally_campaign_archive(runtime_context)
	if not campaign_archive.is_empty():
		var archive_cards: Array = []
		var long_term_text := _player_facing_campaign_text(campaign_archive, "longTermMemory")
		if long_term_text != "":
			archive_cards.append({
				"title": "长期战役档案",
				"value": long_term_text,
				"meta": _player_facing_campaign_text(campaign_archive, "playerFacingTitle"),
				"description": "赛季页只展示后端长期战役自然语言。",
				"tone": "gold",
			})
		var diplomacy_timeline_text := _player_facing_campaign_text(campaign_archive, "diplomacyTimelineSummary")
		if diplomacy_timeline_text != "":
			archive_cards.append({
				"title": "外交变化",
				"value": diplomacy_timeline_text,
				"meta": "",
				"description": "外交变化来自后端战役档案。",
				"tone": "blue",
			})
		var cross_day_target_text := _first_campaign_archive_item_text(campaign_archive, "crossDayRallyTargets")
		if cross_day_target_text != "":
			archive_cards.append({
				"title": "跨日目标",
				"value": cross_day_target_text,
				"meta": _player_facing_campaign_text(campaign_archive, "crossDayActionRecap"),
				"description": "跨日 rally 目标由后端档案决定。",
				"tone": "green",
			})
		var recap_text := _first_campaign_archive_item_text(campaign_archive, "recapEntries")
		if recap_text != "":
			archive_cards.append({
				"title": "战役复盘",
				"value": recap_text,
				"meta": "",
				"description": "同盟战役复盘来自后端长期档案。",
				"tone": "purple",
			})
		var transition_text := _first_campaign_archive_item_text(campaign_archive, "stateTransitions")
		if transition_text != "":
			archive_cards.append({
				"title": "阶段迁移",
				"value": transition_text,
				"meta": "",
				"description": "战役阶段迁移来自后端长期档案。",
				"tone": "gold",
			})
		var diplomacy_task_text := _first_campaign_archive_item_text(campaign_archive, "diplomacyTasks")
		if diplomacy_task_text != "":
			archive_cards.append({
				"title": "外交建议",
				"value": diplomacy_task_text,
				"meta": "",
				"description": "外交相关内容只作为后端建议展示，不在赛季页生成执行入口。",
				"tone": "blue",
			})
		var hostile_dossier_text := _first_campaign_archive_item_text(campaign_archive, "hostileDossiers")
		if hostile_dossier_text != "":
			archive_cards.append({
				"title": "敌对势力复盘",
				"value": hostile_dossier_text,
				"meta": "",
				"description": "敌对玩家和敌对 AI 玩家交手记录来自后端档案。",
				"tone": "red",
			})
		for dossier_card_variant in _build_enemy_dossier_query_cards(campaign_archive).slice(0, 3):
			if dossier_card_variant is Dictionary:
				archive_cards.append(dossier_card_variant as Dictionary)
		var incoming_attack_text := _first_campaign_archive_item_text(campaign_archive, "incomingAttackReports")
		if incoming_attack_text != "":
			archive_cards.append({
				"title": "来袭战报",
				"value": incoming_attack_text,
				"meta": "",
				"description": "敌方攻打记录来自后端战报复盘。",
				"tone": "red",
			})
		var enemy_target_text := _first_campaign_archive_item_text(campaign_archive, "enemyTargetHistory")
		if enemy_target_text != "":
			archive_cards.append({
				"title": "敌方目标历史",
				"value": enemy_target_text,
				"meta": "",
				"description": "敌方目标历史来自后端战役档案。",
				"tone": "gold",
			})
		var battle_analysis := _read_campaign_archive_analysis(campaign_archive)
		var defense_text := _player_facing_campaign_text(battle_analysis, "recommendedDefenseSummary")
		if defense_text != "":
			archive_cards.append({
				"title": "防守建议",
				"value": defense_text,
				"meta": _player_facing_campaign_text(battle_analysis, "winLossSummary"),
				"description": "胜负分析和防守建议由后端生成。",
				"tone": "green",
			})
		var failed_target_text := _first_campaign_archive_item_text(campaign_archive, "failedTargetMemories")
		if failed_target_text != "":
			archive_cards.append({
				"title": "失败目标记忆",
				"value": failed_target_text,
				"meta": "",
				"description": "失败目标记忆来自后端长期档案。",
				"tone": "red",
			})
		var cross_day_action_text := _first_campaign_archive_item_text(campaign_archive, "crossDayActionList")
		if cross_day_action_text != "":
			archive_cards.append({
				"title": "跨日行动",
				"value": cross_day_action_text,
				"meta": "",
				"description": "跨日行动查询列表来自后端长期档案。",
				"tone": "green",
			})
		if not archive_cards.is_empty():
			return archive_cards
	var campaign_state := _read_backend_ai_rally_campaign_state(runtime_context)
	if campaign_state.is_empty():
		return []
	var cards: Array = []
	var memory_text := _player_facing_campaign_text(campaign_state, "campaignMemory")
	if memory_text != "":
		cards.append({
			"title": "同盟集结记忆",
			"value": memory_text,
			"meta": _player_facing_campaign_text(campaign_state, "targetName"),
			"description": "后端战役记忆进入赛季页，只展示自然语言结果。",
			"tone": "gold",
		})
	var diplomacy_text := _player_facing_campaign_text(campaign_state, "diplomacyPosture")
	if diplomacy_text != "":
		cards.append({
			"title": "外交态势",
			"value": diplomacy_text,
			"meta": _player_facing_campaign_text(campaign_state, "currentPhase"),
			"description": "赛季页复用后端外交判断。",
			"tone": "blue",
		})
	var recap_text := _player_facing_campaign_text(campaign_state, "crossDayRecap")
	if recap_text != "":
		cards.append({
			"title": "跨日复盘",
			"value": recap_text,
			"meta": _player_facing_campaign_text(campaign_state, "updatedAt"),
			"description": "跨日行动复盘来自后端每日总结。",
			"tone": "green",
		})
	return cards


func _filter_backend_ai_campaign_blocks(blocks: Array) -> Array:
	var preserved: Array = []
	for block_variant in blocks:
		if not (block_variant is Dictionary):
			continue
		var block: Dictionary = block_variant as Dictionary
		if str(block.get("node_name", "")).strip_edges() == "WorldAffairsBackendAiCampaignBlock":
			preserved.append(block.duplicate(true))
	return preserved


func _read_backend_ai_rally_campaign_archive(runtime_context: Dictionary) -> Dictionary:
	var archive_variant: Variant = runtime_context.get("ai_autonomous_combat_campaign_archive", {})
	var archive: Dictionary = {}
	if archive_variant is Dictionary:
		archive = archive_variant as Dictionary
	if archive.is_empty():
		var summary_variant: Variant = runtime_context.get("ai_autonomous_combat_daily_summary", {})
		if summary_variant is Dictionary:
			var summary: Dictionary = summary_variant as Dictionary
			var nested_archive_variant: Variant = summary.get("campaignArchive", {})
			if nested_archive_variant is Dictionary:
				archive = nested_archive_variant as Dictionary
	var campaigns_variant: Variant = archive.get("campaigns", [])
	if campaigns_variant is Array:
		for campaign_variant in campaigns_variant as Array:
			if campaign_variant is Dictionary:
				var campaign: Dictionary = campaign_variant as Dictionary
				if str(campaign.get("stateKind", "")).strip_edges() == "ai_rally_campaign_archive":
					return campaign
	return {}


func _read_backend_ai_rally_campaign_state(runtime_context: Dictionary) -> Dictionary:
	var summary_variant: Variant = runtime_context.get("ai_autonomous_combat_daily_summary", {})
	if not (summary_variant is Dictionary):
		return {}
	var summary: Dictionary = summary_variant as Dictionary
	var state_variant: Variant = summary.get("rallyCampaignState", {})
	if state_variant is Dictionary:
		var state: Dictionary = state_variant as Dictionary
		if str(state.get("stateKind", "")).strip_edges() == "ai_rally_campaign_state":
			return state
	return {}


func _player_facing_campaign_text(source: Dictionary, key: String) -> String:
	var text := str(source.get(key, "")).strip_edges()
	for forbidden in ["stateKind", "campaignId", "aiPlayerId", "factionId", "regionId", "JSON", "tool", "proposalId", "worldAction", "queuePlanExecution", "provider", "env", "key", "war-room"]:
		text = text.replace(str(forbidden), "")
	return text.strip_edges()


func _first_campaign_archive_item_text(source: Dictionary, key: String) -> String:
	var items_variant: Variant = source.get(key, [])
	if not (items_variant is Array):
		return ""
	for item_variant in items_variant as Array:
		if item_variant is Dictionary:
			var item: Dictionary = item_variant as Dictionary
			var text := _player_facing_campaign_text(item, "playerFacingSummary")
			if text == "":
				text = _player_facing_campaign_text(item, "summary")
			if text != "":
				return text
		else:
			var text := str(item_variant).strip_edges()
			if text != "":
				return text
	return ""


func _build_enemy_dossier_query_cards(campaign_archive: Dictionary) -> Array:
	var items_variant: Variant = campaign_archive.get("enemyDossierEntries", [])
	if not (items_variant is Array):
		return []
	var cards: Array = []
	for item_variant in items_variant as Array:
		if not (item_variant is Dictionary):
			continue
		var item: Dictionary = item_variant as Dictionary
		var summary := _player_facing_campaign_text(item, "playerFacingSummary")
		if summary == "":
			continue
		var description_parts: Array = []
		for key in ["frequentTargetSummary", "frequentUnitSummary", "siegePreferenceSummary", "counterAdviceSummary"]:
			var part := _player_facing_campaign_text(item, key)
			if part != "":
				description_parts.append(part)
		cards.append({
			"title": "敌军档案查询",
			"value": summary,
			"meta": _player_facing_campaign_text(item, "winLossSummary"),
			"description": " ".join(description_parts),
			"tone": "red",
		})
		if cards.size() >= 6:
			break
	return cards


func _read_campaign_archive_analysis(source: Dictionary) -> Dictionary:
	var analysis_variant: Variant = source.get("enemyBattleAnalysis", {})
	if analysis_variant is Dictionary:
		return analysis_variant as Dictionary
	return {}

func _build_world_affairs_page_from_read_model(read_model: Dictionary) -> Dictionary:
	var title: String = str(read_model.get("title", "天下大势")).strip_edges()
	if title == "":
		title = "天下大势"
	var subtitle: String = str(read_model.get("subtitle", "剧本大势读取中。")).strip_edges()
	var nodes: Array = _read_model_array(read_model, "nodes")
	var active_node: Dictionary = _resolve_focus_world_affairs_node(read_model, nodes)
	var timeline: Array = _build_world_affairs_timeline_from_read_model(nodes)
	var active_reward_preview: Array = _read_model_array(active_node, "rewardPreview")
	var unlocks: Array = _format_world_affairs_reward_preview(active_reward_preview)
	if unlocks.is_empty():
		unlocks = ["玉符 0"]
	var target_text: String = str(active_node.get("objectiveText", "")).strip_edges()
	if target_text == "":
		target_text = "等待天下大势目标更新。"
	var progress_text: String = str(active_node.get("progressText", "")).strip_edges()
	if progress_text == "":
		progress_text = _resolve_world_affairs_status_label(str(active_node.get("status", "locked")).strip_edges())
	var focus_node_id: String = str(active_node.get("nodeId", "")).strip_edges()
	var focus_status: String = str(active_node.get("status", "")).strip_edges()
	var claim_state: String = str(active_node.get("claimState", "")).strip_edges()
	var can_claim: bool = bool(active_node.get("canClaim", false))
	var focus_asset_slot: String = str(active_node.get("assetSlot", active_node.get("asset_slot", ""))).strip_edges()
	var page: Dictionary = {
		"headline": title,
		"subtitle": subtitle,
		"state": "大势进展：%s" % progress_text,
		"target": target_text,
		"achieved_at": progress_text,
		"scene_image_path": _resolve_world_affairs_asset_path(focus_asset_slot, 0),
		"unlocks": unlocks,
		"timeline": timeline,
		"focus_node_id": focus_node_id,
		"node_status": focus_status,
		"claim_node_id": focus_node_id,
		"claim_state": claim_state,
		"can_claim": can_claim,
		"claim_action_id": "world_affairs_claim:%s" % focus_node_id if focus_node_id != "" else "",
		"summary_lines": [
			"当前展示天下大势进展与奖励预览。",
			"满足条件后可领取资源奖励。",
		],
	}
	if read_model.has("scriptId"):
		page["active_script_id"] = str(read_model.get("scriptId", "")).strip_edges()
	if read_model.has("scenarioId"):
		page["active_scenario_id"] = str(read_model.get("scenarioId", "")).strip_edges()
	if read_model.has("scenarioVersion"):
		page["scenario_version"] = str(read_model.get("scenarioVersion", "")).strip_edges()
	if read_model.has("seasonRunId"):
		page["season_run_id"] = str(read_model.get("seasonRunId", "")).strip_edges()
	return page

func _resolve_focus_world_affairs_node(read_model: Dictionary, nodes: Array) -> Dictionary:
	for node_variant in nodes:
		if not (node_variant is Dictionary):
			continue
		var node: Dictionary = node_variant as Dictionary
		if bool(node.get("canClaim", false)) or str(node.get("claimState", "")).strip_edges() == "claimable":
			return node.duplicate(true)
	return _resolve_active_world_affairs_node(read_model, nodes)

func _resolve_active_world_affairs_node(read_model: Dictionary, nodes: Array) -> Dictionary:
	var active_node_id: String = str(read_model.get("activeNodeId", "")).strip_edges()
	for node_variant in nodes:
		if not (node_variant is Dictionary):
			continue
		var node: Dictionary = node_variant as Dictionary
		if active_node_id != "" and str(node.get("nodeId", "")).strip_edges() == active_node_id:
			return node.duplicate(true)
	for node_variant in nodes:
		if not (node_variant is Dictionary):
			continue
		var node: Dictionary = node_variant as Dictionary
		if str(node.get("status", "")).strip_edges() == "active":
			return node.duplicate(true)
	if not nodes.is_empty() and nodes[0] is Dictionary:
		return (nodes[0] as Dictionary).duplicate(true)
	return {}

func _build_world_affairs_timeline_from_read_model(nodes: Array) -> Array:
	var timeline: Array = []
	for index in range(nodes.size()):
		var node_variant: Variant = nodes[index]
		if not (node_variant is Dictionary):
			continue
		var node: Dictionary = node_variant as Dictionary
		var title: String = str(node.get("title", "")).strip_edges()
		if title == "":
			title = "节点 %d" % (index + 1)
		var status: String = str(node.get("status", "locked")).strip_edges()
		var reward_preview: Array = _read_model_array(node, "rewardPreview")
		var reward_text: String = _format_world_affairs_reward_summary(reward_preview)
		var asset_slot: String = str(node.get("assetSlot", node.get("asset_slot", ""))).strip_edges()
		var item: Dictionary = {
			"node_id": str(node.get("nodeId", "")).strip_edges(),
			"badge": _resolve_world_affairs_badge_text(status, index),
			"title": title,
			"state": str(node.get("objectiveText", "")).strip_edges(),
			"progress": str(node.get("progressText", "")).strip_edges(),
			"reward": reward_text,
			"reward_preview": reward_preview.duplicate(true),
			"asset_slot": asset_slot,
			"image_path": _resolve_world_affairs_asset_path(asset_slot, index),
			"tone": _resolve_world_affairs_tone(status),
			"completed": status == "achieved" or status == "claimed",
			"current": status == "active",
			"claim_state": str(node.get("claimState", "")).strip_edges(),
			"can_claim": bool(node.get("canClaim", false)),
		}
		timeline.append(item)
	return timeline

func _resolve_world_affairs_asset_path(asset_slot: String, index: int) -> String:
	var slot: String = asset_slot.strip_edges()
	if slot != "" and WORLD_AFFAIRS_ASSET_SLOT_PATHS.has(slot):
		return str(WORLD_AFFAIRS_ASSET_SLOT_PATHS[slot])
	var numbered_slot: String = "world_affairs_node_%02d" % (index + 1)
	if WORLD_AFFAIRS_ASSET_SLOT_PATHS.has(numbered_slot):
		return str(WORLD_AFFAIRS_ASSET_SLOT_PATHS[numbered_slot])
	return ""

func _read_model_array(payload: Dictionary, key: String) -> Array:
	var value: Variant = payload.get(key, [])
	if value is Array:
		return (value as Array).duplicate(true)
	return []

func _format_world_affairs_reward_preview(reward_preview: Array) -> Array:
	var labels: Array = []
	for reward_variant in reward_preview:
		if not (reward_variant is Dictionary):
			continue
		var reward: Dictionary = reward_variant as Dictionary
		var label: String = str(reward.get("label", _resolve_reward_label(str(reward.get("kind", "")).strip_edges()))).strip_edges()
		var amount: int = int(reward.get("amount", 0))
		if label == "":
			continue
		labels.append("%s %d" % [label, amount])
	return labels

func _format_world_affairs_reward_summary(reward_preview: Array) -> String:
	var labels: Array = _format_world_affairs_reward_preview(reward_preview)
	if labels.is_empty():
		return ""
	if labels.size() <= 2:
		return " / ".join(labels)
	return "%s / %s" % [str(labels[0]), str(labels[1])]

func _resolve_reward_label(kind: String) -> String:
	match kind:
		"jade":
			return "玉符"
		"copper":
			return "铜钱"
		"food":
			return "粮草"
		"wood":
			return "木材"
		"stone":
			return "石料"
		"iron":
			return "铁矿"
		_:
			return kind

func _resolve_world_affairs_badge_text(status: String, index: int) -> String:
	match status:
		"claimed":
			return "已领"
		"achieved":
			return "达成"
		"active":
			return "进行中"
		_:
			return str(index + 1)

func _resolve_world_affairs_tone(status: String) -> String:
	match status:
		"claimed", "achieved":
			return "gold"
		"active":
			return "blue"
		_:
			return "neutral"

func _resolve_world_affairs_status_label(status: String) -> String:
	match status:
		"claimed":
			return "已领取"
		"achieved":
			return "已达成"
		"active":
			return "进行中"
		_:
			return "锁定"

func _build_task_page_from_read_model(read_model: Dictionary) -> Dictionary:
	var raw_title := str(read_model.get("activeChapterTitle", "第一章")).strip_edges()
	if raw_title == "":
		raw_title = "第一章"
	var chapter_index := int(read_model.get("chapterIndex", 1))
	if chapter_index <= 0:
		chapter_index = 1
	var tasks := _read_model_array(read_model, "tasks")
	var chapter_id := str(read_model.get("activeChapterId", "")).strip_edges()
	var asset_slot := str(read_model.get("assetSlot", read_model.get("asset_slot", ""))).strip_edges()
	var chapter_reward_preview := _read_model_array(read_model, "chapterRewardPreview")
	var chapter_reward_text := _format_task_reward_summary(chapter_reward_preview)
	if chapter_reward_text != "":
		chapter_reward_text = "章节奖励：" + chapter_reward_text
	var task_items := _build_task_items_from_read_model(tasks)
	_append_nation_midgame_task_entry(task_items, read_model)
	var page := {
		"headline": "任务",
		"subtitle": "当前章节任务组",
		"state": _task_chapter_state_text(read_model),
		"scene_image_path": _resolve_task_chapter_scene_path_from_slot(chapter_id, asset_slot),
		"chapter_reward_text": chapter_reward_text,
		"current_chapter": {
			"chapter_id": chapter_id,
			"title": _format_task_chapter_plate(chapter_index, raw_title),
			"value": _format_task_chapter_headline(raw_title),
			"meta": _format_task_chapter_progress(tasks),
			"tone": _resolve_task_chapter_tone(tasks),
		},
		"chapters": [],
		"task_items": task_items,
		"summary_lines": [
			"章节进度与任务奖励已同步。",
			"完成任务后，可在此领取奖励。",
		],
	}
	for key in ["factionId", "scenarioId", "scenarioVersion", "seasonRunId", "activeChapterId", "currentTaskGroupId"]:
		if read_model.has(key):
			page[key] = read_model[key]
	return page

func _append_nation_midgame_task_entry(task_items: Array, read_model: Dictionary) -> void:
	for item_variant in task_items:
		if item_variant is Dictionary and str((item_variant as Dictionary).get("task_id", "")).strip_edges() == "nation_midgame_task_entry":
			return
	task_items.append({
		"task_id": "nation_midgame_task_entry",
		"badge": "国",
		"title": "国家中局",
		"value": "同盟 / 王国 / 帝国",
		"description": "查看州郡、洛阳、帝国与一统目标，以及成员和官职分工。",
		"meta": "州郡目标已开启",
		"rewards": [],
		"tone": "gold",
		"action_label": "前往",
		"action_id": "open_nation_midgame_frontend",
		"disabled": false,
		"entry_contract_id": NATION_MIDGAME_TASK_ENTRY_CONTRACT,
		"target_click_action": "world_open_main_city_organization_nation_midgame_frontend",
	})

func _task_chapter_state_text(read_model: Dictionary) -> String:
	var text := str(read_model.get("chapterProgressText", "")).strip_edges()
	if text != "":
		return text
	return "任务奖励以资源为主，不给玉符。"

func _format_task_chapter_plate(chapter_index: int, raw_title: String) -> String:
	var title := raw_title.strip_edges()
	var space_index := title.find(" ")
	if space_index > 0:
		var prefix := title.substr(0, space_index).strip_edges()
		if prefix.find("章") >= 0:
			return prefix
	return "第%d章" % chapter_index

func _format_task_chapter_headline(raw_title: String) -> String:
	var title := raw_title.strip_edges()
	var space_index := title.find(" ")
	if space_index > 0 and title.substr(0, space_index).find("章") >= 0:
		var suffix := title.substr(space_index + 1).strip_edges()
		if suffix != "":
			return suffix
	return title if title != "" else "当前章节"

func _format_task_chapter_progress(tasks: Array) -> String:
	var total := 0
	var completed := 0
	for task_variant in tasks:
		if not (task_variant is Dictionary):
			continue
		total += 1
		var task := task_variant as Dictionary
		var status := str(task.get("status", "")).strip_edges()
		var claim_state := str(task.get("claimState", "")).strip_edges()
		if status == "achieved" or status == "claimed" or claim_state == "claimable" or claim_state == "claimed":
			completed += 1
	if total <= 0:
		return "0/0"
	return "%d/%d" % [completed, total]

func _resolve_task_chapter_tone(tasks: Array) -> String:
	for task_variant in tasks:
		if not (task_variant is Dictionary):
			continue
		var task := task_variant as Dictionary
		if bool(task.get("canClaim", false)) or str(task.get("claimState", "")).strip_edges() == "claimable":
			return "gold"
	for task_variant in tasks:
		if not (task_variant is Dictionary):
			continue
		var status := str((task_variant as Dictionary).get("status", "")).strip_edges()
		if status == "active":
			return "blue"
	return "neutral"

func _build_task_items_from_read_model(tasks: Array) -> Array:
	var items: Array = []
	for index in range(tasks.size()):
		var task_variant: Variant = tasks[index]
		if not (task_variant is Dictionary):
			continue
		var item := _build_task_item_from_read_model(task_variant as Dictionary, index)
		if not item.is_empty():
			items.append(item)
	return items

func _build_task_item_from_read_model(task: Dictionary, index: int) -> Dictionary:
	var task_id := str(task.get("taskId", "")).strip_edges()
	var title := str(task.get("title", "")).strip_edges()
	if title == "":
		title = "任务 %d" % (index + 1)
	var claim_state := str(task.get("claimState", "")).strip_edges()
	var status := str(task.get("status", "locked")).strip_edges()
	var can_claim := bool(task.get("canClaim", false))
	var claimable := can_claim and (claim_state == "" or claim_state == "claimable")
	var rewards := _format_task_reward_chips(_read_model_array(task, "rewardPreview"))
	return {
		"task_id": task_id,
		"badge": str(index + 1),
		"title": title,
		"value": _resolve_task_status_label(status, claim_state, can_claim),
		"description": _format_task_player_description(str(task.get("objectiveText", task.get("progressText", ""))).strip_edges()),
		"meta": _format_task_reward_summary(_read_model_array(task, "rewardPreview")),
		"rewards": rewards,
		"tone": _resolve_task_tone(status, claim_state, can_claim),
		"action_label": _resolve_task_action_label(status, claim_state, can_claim),
		"action_id": "task_claim:%s" % task_id if claimable and task_id != "" else "",
		"disabled": not claimable,
		"claim_state": claim_state,
		"can_claim": can_claim,
	}

func _resolve_task_status_label(status: String, claim_state: String, can_claim: bool) -> String:
	if can_claim or claim_state == "claimable":
		return "可领取"
	if claim_state == "claimed" or status == "claimed":
		return "已领取"
	match status:
		"achieved":
			return "已达成"
		"active":
			return "进行中"
		"locked":
			return "未开启"
		_:
			return "未完成"


func _format_task_player_description(description: String) -> String:
	var text := description.strip_edges()
	text = text.replace("当前只发模板 action", "当前会打开对应入口")
	text = text.replace("页面 action", "页面回执")
	text = text.replace("action", "入口")
	text = text.replace("只保留任务条和前往按钮样式。", "完成前置任务后再继续。")
	text = text.replace("按钮样式", "入口")
	return text

func _resolve_task_action_label(status: String, claim_state: String, can_claim: bool) -> String:
	if can_claim or claim_state == "claimable":
		return "领取"
	if claim_state == "claimed" or status == "claimed":
		return "已领"
	if status == "locked":
		return "未开"
	return "前往"

func _resolve_task_tone(status: String, claim_state: String, can_claim: bool) -> String:
	if can_claim or claim_state == "claimable":
		return "gold"
	if claim_state == "claimed" or status == "claimed" or status == "achieved":
		return "green"
	if status == "active":
		return "blue"
	return "neutral"

func _format_task_reward_chips(reward_preview: Array) -> Array:
	var chips: Array = []
	for reward_variant in reward_preview:
		if not (reward_variant is Dictionary):
			continue
		var reward := reward_variant as Dictionary
		var kind := str(reward.get("kind", "")).strip_edges()
		var label := str(reward.get("label", _resolve_reward_label(kind))).strip_edges()
		if kind == "jade" or label == "玉符" or label == "":
			continue
		chips.append({
			"label": label,
			"amount": str(int(reward.get("amount", 0))),
			"tone": _resolve_task_reward_tone(kind),
		})
	return chips

func _format_task_reward_summary(reward_preview: Array) -> String:
	var labels: Array = []
	for chip_variant in _format_task_reward_chips(reward_preview):
		if not (chip_variant is Dictionary):
			continue
		var chip := chip_variant as Dictionary
		var label := str(chip.get("label", "")).strip_edges()
		var amount := str(chip.get("amount", "")).strip_edges()
		if label == "":
			continue
		labels.append((label + " " + amount).strip_edges())
	if labels.is_empty():
		return ""
	return " / ".join(labels)

func _resolve_task_reward_tone(kind: String) -> String:
	match kind:
		"food", "copper":
			return "gold"
		"wood":
			return "green"
		"stone":
			return "neutral"
		"iron":
			return "blue"
		_:
			return "neutral"

func _resolve_task_chapter_scene_path_from_slot(chapter_id: String, asset_slot: String) -> String:
	var slot := asset_slot.strip_edges()
	if slot != "" and TASK_CHAPTER_SCENE_PATHS.has(slot):
		return str(TASK_CHAPTER_SCENE_PATHS[slot])
	var normalized_chapter_id := chapter_id.strip_edges()
	if normalized_chapter_id != "" and TASK_CHAPTER_SCENE_PATHS.has(normalized_chapter_id):
		return str(TASK_CHAPTER_SCENE_PATHS[normalized_chapter_id])
	return _resolve_task_chapter_scene_path(normalized_chapter_id)

func _build_tasks_section(fixture: Dictionary, runtime_context: Dictionary = {}) -> Dictionary:
	var page := _resolve_task_chapter_page(_fixture_dict(fixture, "tasks"), runtime_context)
	var task_items := _page_array(page, "task_items", [])
	return _with_content_first("任务", {
		"summary_title": "任务",
		"shared_state_title": "任务模板状态",
		"shared_state_fields": [
			{"key": "task_status", "label": "任务"},
			{"key": "resource_reward_label", "label": "奖励"},
			{"key": "authority_binding", "label": "权属"},
		],
		"summary_lines": _page_array(page, "summary_lines", [
			"任务页展示第一章到第十五章。",
			"奖励以粮草、木材、石料、铁矿、铜钱为主，不使用玉符。",
		]),
		"list_title": "",
		"left_card_columns": 1,
		"mobile_stack": true,
		"mobile_stack_breakpoint": MOBILE_LANDSCAPE_STACK_BREAKPOINT,
		"item_cards": [],
		"detail_title": "",
		"content_blocks": [
			_build_task_chapter_split_block("主要事宜", page, task_items, "TaskChapterSplitBlock"),
		],
	})

func _build_faction_status_section(fixture: Dictionary) -> Dictionary:
	var page := _fixture_dict(fixture, "faction_status")
	return _with_content_first("势力状态", {
		"summary_title": "势力状态",
		"shared_state_title": "势力模板状态",
		"shared_state_fields": [
			{"key": "faction_status", "label": "势力"},
			{"key": "template_scope", "label": "范围"},
			{"key": "authority_binding", "label": "权属"},
		],
		"summary_lines": _page_array(page, "summary_lines", [
			"势力状态只保留领地动态壳，等待后端回传 territories[] 再显示。",
			"目标会随章节推进更新。",
		]),
		"list_title": "",
		"left_card_columns": 2,
		"mobile_stack": true,
		"mobile_stack_breakpoint": MOBILE_LANDSCAPE_STACK_BREAKPOINT,
		"item_cards": [],
		"detail_title": "",
		"content_blocks": [
			_build_faction_status_split_block("领地状态入口", _page_array(page, "territories", []), {}, "FactionStatusSplitBlock", _fixture_dict(page, "data_contract")),
		],
	})

func _page_status_payload(page: Dictionary, fallback_headline: String, fallback_subtitle: String, fallback_state: String) -> Dictionary:
	return {
		"headline": _page_string(page, "headline", fallback_headline),
		"subtitle": _page_string(page, "subtitle", fallback_subtitle),
		"state": _page_string(page, "state", fallback_state),
		"facts": [
			{"label": "展示范围", "value": "二级页模板", "tone": "gold"},
			{"label": "真实规则", "value": "未接入", "tone": "neutral"},
			{"label": "奖励写入", "value": "未写入", "tone": "neutral"},
		],
	}

func _compact_cards(cards: Array, limit: int) -> Array:
	var result: Array = []
	for card_variant in cards.slice(0, mini(cards.size(), limit)):
		if not (card_variant is Dictionary):
			continue
		result.append((card_variant as Dictionary).duplicate(true))
	return result

func _build_feature_card_grid_block(title: String, cards: Array, node_name: String = "", columns: int = 3, featured_count: int = 1, layout: String = "") -> Dictionary:
	return {
		"kind": "feature_card_grid",
		"title": title,
		"cards": cards.duplicate(true),
		"columns": columns,
		"mobile_columns": 1,
		"featured_count": featured_count,
		"layout": layout,
		"node_name": node_name,
	}

func _build_timeline_block(title: String, items: Array, node_name: String = "") -> Dictionary:
	return {
		"kind": "timeline",
		"title": title,
		"items": items.duplicate(true),
		"node_name": node_name,
	}

func _build_world_affairs_scene_block(title: String, page: Dictionary, timeline: Array, node_name: String = "") -> Dictionary:
	return {
		"kind": "world_affairs_scene",
		"title": title,
		"headline": _page_string(page, "headline", "天下大势"),
		"scene_image_path": _page_string(page, "scene_image_path", ""),
		"subtitle": _page_string(page, "subtitle", "天下 / 局势先行，赛季后续扩展。"),
		"state": _page_string(page, "state", "模板目标线"),
		"target": _page_string(page, "target", "全地图8000格4级或以上土地被占领"),
		"achieved_at": _page_string(page, "achieved_at", "2026-03-21 16:09:42达成"),
		"unlocks": _page_array(page, "unlocks", ["玉符 100", "局势开启", "赛季推进", "经验奖励"]),
		"timeline": timeline.duplicate(true),
		"scenario_id": _page_string(page, "active_scenario_id", ""),
		"scenario_version": _page_string(page, "scenario_version", ""),
		"season_run_id": _page_string(page, "season_run_id", ""),
		"claim_node_id": _page_string(page, "claim_node_id", ""),
		"node_status": _page_string(page, "node_status", ""),
		"claim_state": _page_string(page, "claim_state", ""),
		"can_claim": bool(page.get("can_claim", false)),
		"claim_action_id": _page_string(page, "claim_action_id", ""),
		"node_name": node_name,
	}

func _build_territory_table_block(title: String, rows: Array, node_name: String = "") -> Dictionary:
	return {
		"kind": "territory_table",
		"title": title,
		"rows": rows.duplicate(true),
		"node_name": node_name,
	}

func _build_task_strip_list_block(title: String, items: Array, node_name: String = "") -> Dictionary:
	return {
		"kind": "task_strip_list",
		"title": title,
		"items": items.duplicate(true),
		"node_name": node_name,
	}

func _build_task_chapter_split_block(title: String, page: Dictionary, items: Array, node_name: String = "") -> Dictionary:
	var chapters := _page_array(page, "chapters", [])
	var chapter := _fixture_dict(page, "current_chapter")
	if chapter.is_empty() and not chapters.is_empty() and chapters[0] is Dictionary:
		chapter = (chapters[0] as Dictionary).duplicate(true)
	return {
		"kind": "task_chapter_split",
		"title": title,
		"headline": _page_string(page, "headline", "任务"),
		"scene_image_path": _page_string(page, "scene_image_path", ""),
		"subtitle": _page_string(page, "subtitle", "从第一章到第十五章逐章推进。"),
		"state": _page_string(page, "state", "资源奖励模板"),
		"chapter_reward_text": _page_string(page, "chapter_reward_text", ""),
		"chapter": chapter,
		"chapters": chapters.duplicate(true),
		"items": items.duplicate(true),
		"node_name": node_name,
	}

func _resolve_task_chapter_page(page: Dictionary, runtime_context: Dictionary) -> Dictionary:
	var resolved := page.duplicate(true)
	var contract := _fixture_dict(resolved, "chapter_contract")
	var active_chapter_id := _resolve_context_string(runtime_context, {}, "task_chapter_id", "")
	if active_chapter_id == "":
		active_chapter_id = str(contract.get("active_chapter_id", "")).strip_edges()
	if active_chapter_id == "":
		active_chapter_id = "chapter_01"
	var selected := _resolve_task_chapter(resolved, active_chapter_id)
	if not selected.is_empty():
		resolved["current_chapter"] = selected.duplicate(true)
		var selected_scene := _resolve_task_chapter_scene_path(str(selected.get("chapter_id", active_chapter_id)).strip_edges())
		if selected_scene != "":
			resolved["scene_image_path"] = selected_scene
	return resolved

func _resolve_task_chapter(page: Dictionary, chapter_id: String) -> Dictionary:
	var chapters := _page_array(page, "chapters", [])
	var normalized_id := chapter_id.strip_edges()
	for chapter_variant in chapters:
		if not (chapter_variant is Dictionary):
			continue
		var chapter := chapter_variant as Dictionary
		if str(chapter.get("chapter_id", "")).strip_edges() == normalized_id:
			return chapter.duplicate(true)
	if not chapters.is_empty() and chapters[0] is Dictionary:
		return (chapters[0] as Dictionary).duplicate(true)
	return {}

func _resolve_task_chapter_scene_path(chapter_id: String) -> String:
	var normalized_id := chapter_id.strip_edges()
	if normalized_id != "" and TASK_CHAPTER_SCENE_PATHS.has(normalized_id):
		return str(TASK_CHAPTER_SCENE_PATHS[normalized_id])
	return ""

func _build_faction_map_preview_block(title: String, payload: Dictionary, node_name: String = "") -> Dictionary:
	return {
		"kind": "faction_map_preview",
		"title": title,
		"payload": payload.duplicate(true),
		"node_name": node_name,
	}

func _build_faction_status_split_block(title: String, territories: Array, map_payload: Dictionary, node_name: String = "", empty_config: Dictionary = {}) -> Dictionary:
	return {
		"kind": "faction_status_split",
		"title": title,
		"territories": territories.duplicate(true),
		"map_payload": map_payload.duplicate(true),
		"empty_config": empty_config.duplicate(true),
		"node_name": node_name,
	}

func _build_status_hero_block(title: String, payload: Dictionary, node_name: String = "") -> Dictionary:
	return {
		"kind": "status_hero",
		"title": title,
		"payload": payload.duplicate(true),
		"node_name": node_name,
	}

func _build_card_grid_block(title: String, cards: Array, node_name: String = "", columns: int = 2) -> Dictionary:
	return {
		"kind": "card_grid",
		"title": title,
		"cards": cards.duplicate(true),
		"columns": columns,
		"mobile_columns": 1,
		"node_name": node_name,
	}

func _build_reading_list_block(title: String, items: Array, node_name: String = "") -> Dictionary:
	return {
		"kind": "reading_list",
		"title": title,
		"items": items.duplicate(true),
		"node_name": node_name,
	}

func _build_text_block(title: String, lines: Array, node_name: String = "") -> Dictionary:
	return {
		"kind": "text_block",
		"title": title,
		"lines": lines.duplicate(true),
		"node_name": node_name,
	}

func _build_button_row_block(title: String, actions: Array, node_name: String = "") -> Dictionary:
	return {
		"kind": "button_row",
		"title": title,
		"actions": actions.duplicate(true),
		"node_name": node_name,
	}

func _load_template_fixture() -> Dictionary:
	if not FileAccess.file_exists(TEMPLATE_FIXTURE_PATH):
		return {}
	var file := FileAccess.open(TEMPLATE_FIXTURE_PATH, FileAccess.READ)
	if file == null:
		return {}
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if parsed is Dictionary:
		return parsed as Dictionary
	return {}

func _fixture_dict(fixture: Dictionary, key: String) -> Dictionary:
	var value: Variant = fixture.get(key, {})
	if value is Dictionary:
		return value as Dictionary
	return {}

func _page_string(page: Dictionary, key: String, fallback: String) -> String:
	var value := str(page.get(key, "")).strip_edges()
	return value if value != "" else fallback

func _page_array(page: Dictionary, key: String, fallback: Array) -> Array:
	var value: Variant = page.get(key, null)
	if value is Array:
		return (value as Array).duplicate(true)
	return fallback.duplicate(true)

func _fixture_string(fixture: Dictionary, key: String, fallback: String) -> String:
	var value := str(fixture.get(key, "")).strip_edges()
	return value if value != "" else fallback

func _resolve_context_string(runtime_context: Dictionary, fixture: Dictionary, key: String, fallback: String) -> String:
	var runtime_value := str(runtime_context.get(key, "")).strip_edges()
	if runtime_value != "":
		return runtime_value
	return _fixture_string(fixture, key, fallback)
