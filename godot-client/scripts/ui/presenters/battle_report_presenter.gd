extends RefCounted
class_name BattleReportPresenter

const ATTACKER_ROLE_ORDER := ["大营", "中军", "前锋"]
const DEFENDER_ROLE_ORDER := ["前锋", "中军", "大营"]
const DETAIL_PAGE_LABELS := {
	"battlefield": "战斗地点",
	"stats": "统计 / 战法",
	"formation": "阵容详情",
}
const GENERAL_PROFILE_PREVIEW_DATA_PATH := "res://data/ui/general_profile_preview.json"
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")
const BATTLE_REPORT_REAL_DATA_SOURCE_MODE := "battle_report_real_data_world_reports_feedback_records_v1"
const BATTLE_REPORT_OWNER_SCOPE_MODE := "human_and_ai_player_battle_report_owner_scope_v1"
const BATTLE_REPORT_AI_OWNER_ATTRIBUTION_MODE := "ai_player_battle_report_owner_attribution_v1"
const BATTLE_REPORT_ORGANIZATION_SOURCE_FILTER_MODE := "organization_battle_report_source_filter_v1"
const BATTLE_REPORT_AI_ACTIVITY_FALLBACK_AVATAR_PATH := "res://assets/portraits/ai_chat/zhao_yun_youth_changban_rescue_v1_avatar_160.png"
const BATTLE_REPORT_PLAYER_VISIBLE_COPY_FALLBACK := "战报内容暂未送达。"
const BATTLE_REPORT_PLAYER_VISIBLE_FORBIDDEN_TERMS := [
	"backend",
	"read model",
	"contract id",
	"authority",
	"tier",
	"snake_case",
	"/api/",
	"fixture",
	"local_only",
	"source_label",
	"battle_report_detail",
	"feedback.battleRecords",
]

var _world_data: Dictionary = {}
var _map_layout_data: Dictionary = {}
var _target_faction_id: String = ""
var _general_profiles_loaded := false
var _general_profiles_by_id: Dictionary = {}

func configure(world_data: Dictionary, map_layout_data: Dictionary, target_faction_id: String) -> void:
	_world_data = world_data
	_map_layout_data = map_layout_data
	_target_faction_id = target_faction_id.strip_edges()

func build_snapshot(runtime_context: Dictionary = {}) -> Dictionary:
	var feedback: Dictionary = _world_data.get("feedback", {}) as Dictionary
	var history: Dictionary = _world_data.get("history", {}) as Dictionary
	var reports: Array = _world_data.get("reports", []) as Array
	var battle_records: Array = feedback.get("battleRecords", []) as Array
	var execution_replays: Array = history.get("executionReplays", []) as Array
	var personal_list_contract: Dictionary = _build_list_contracts(reports, battle_records, execution_replays, runtime_context, false)
	var favorite_list_contract: Dictionary = _build_list_contracts(reports, battle_records, execution_replays, runtime_context, true)
	var personal_entry_contracts: Array = personal_list_contract.get("entry_contracts", []) as Array
	var favorite_entry_contracts: Array = favorite_list_contract.get("entry_contracts", []) as Array
	var has_reports: bool = not personal_entry_contracts.is_empty()
	var raw_source_count := _collect_battle_report_sources(reports, battle_records, runtime_context).size()
	return {
		"title": "个人战报",
		"country_summary": _build_country_summary(),
		"search_label": "搜索",
		"filter_label": "筛\n选",
		"scroll_hint_label": "1\n∨",
		"battle_report_real_data_source_mode": BATTLE_REPORT_REAL_DATA_SOURCE_MODE,
		"battle_report_owner_scope_mode": BATTLE_REPORT_OWNER_SCOPE_MODE,
		"battle_report_ai_owner_attribution_mode": BATTLE_REPORT_AI_OWNER_ATTRIBUTION_MODE,
		"battle_report_organization_source_filter_mode": BATTLE_REPORT_ORGANIZATION_SOURCE_FILTER_MODE,
		"battle_report_raw_world_report_count": reports.size(),
		"battle_report_raw_battle_record_count": battle_records.size(),
		"battle_report_real_source_count": raw_source_count,
		"battle_report_player_owned_count": int(personal_list_contract.get("player_owned_count", 0)),
		"battle_report_ai_owned_count": int(personal_list_contract.get("ai_owned_count", 0)),
		"battle_report_organization_owned_count": int(personal_list_contract.get("organization_owned_count", 0)),
		"battle_report_uses_synthetic_preview_as_real_data": false,
		"header_hint": "暂无新战报，列表保留战报浏览结构。" if not has_reports else "点击战报条目进入详情页。",
		"list_summary_lines": [
			"个人战报按最近交战时间展示。" if not has_reports else "同类交战按时间合并展示。",
			"详情页保留战斗地点、统计和阵容三类信息。" if not has_reports else "点击条目可查看战斗地点、统计和阵容。",
		],
		"default_list_mode": "personal",
		"default_detail_tab": "battlefield",
		"shared_state": {
			"page_id": "list",
			"page_id_label": "列表页",
			"list_mode": "personal",
			"list_mode_label": "个人",
			"selected_report": "",
			"selected_report_label": "未选择",
			"detail_tab": "battlefield",
			"detail_tab_label": "战斗地点",
			"report_count": personal_entry_contracts.size(),
			"report_count_label": "%s 条" % str(personal_entry_contracts.size()),
		},
		"list_modes": {
			"personal": {
				"label": "个人",
				"entry_contracts": personal_entry_contracts,
				"detail_contracts_by_id": personal_list_contract.get("detail_contracts_by_id", {}),
			},
			"favorite": {
				"label": "收藏",
				"entry_contracts": favorite_entry_contracts,
				"detail_contracts_by_id": favorite_list_contract.get("detail_contracts_by_id", {}),
			},
		},
	}

func build_overlay_payload(runtime_context: Dictionary = {}) -> Dictionary:
	return {
		"snapshot": build_snapshot(runtime_context),
		"runtime_state_patch": {},
	}

static func build_empty_state_contracts() -> Dictionary:
	var attacker_slots := [
		{"role_label": "大营", "name": "暂无记录", "star_label": "", "troop_label": "兵力：--", "delta_label": "损兵：--", "level_label": "无交战"},
		{"role_label": "中军", "name": "暂无记录", "star_label": "", "troop_label": "兵力：--", "delta_label": "损兵：--", "level_label": "无交战"},
		{"role_label": "前锋", "name": "暂无记录", "star_label": "", "troop_label": "兵力：--", "delta_label": "损兵：--", "level_label": "无交战"},
	]
	var defender_slots := [
		{"role_label": "前锋", "name": "暂无对手", "star_label": "", "troop_label": "兵力：--", "delta_label": "损兵：--", "level_label": "无交战"},
		{"role_label": "中军", "name": "暂无对手", "star_label": "", "troop_label": "兵力：--", "delta_label": "损兵：--", "level_label": "无交战"},
		{"role_label": "大营", "name": "暂无对手", "star_label": "", "troop_label": "兵力：--", "delta_label": "损兵：--", "level_label": "无交战"},
	]
	var detail_frame_contract := _build_detail_frame_contract(
		"我方队伍",
		"敌方队伍",
		"暂无",
		"当前没有新的战报。",
		0,
		1,
		0,
		1,
		"获得奖励",
		["暂无奖励"],
		attacker_slots,
		defender_slots
	)
	var detail_pages := {
		"battlefield": {
			"page_id": "battlefield",
			"page_label": "战斗地点",
			"summary": "当前没有新的战斗地点记录。",
			"hide_summary_body": true,
			"content_blocks": [
				_build_structure_group_block("stack", "SOM_D07_BattlefieldStructure", [
					_build_structure_box_spec("战斗摘要", 30, "SOM_D07_BattlefieldStructure_Box_1"),
					_build_structure_box_spec("交战过程", 124, "SOM_D07_BattlefieldStructure_Box_2"),
					_build_structure_box_spec("后续处理", 42, "SOM_D07_BattlefieldStructure_Box_3"),
				]),
			],
		},
		"stats": {
			"page_id": "stats",
			"page_label": "统计",
			"summary": "当前没有新的统计记录。",
			"hide_summary_body": true,
			"content_blocks": [
				_build_structure_group_block("row", "SOM_D07_StatsRow", [
					_build_structure_box_spec("伤兵统计", 120, "SOM_D07_StatsBox_1"),
					_build_structure_box_spec("战法记录", 120, "SOM_D07_StatsBox_2"),
					_build_structure_box_spec("资源变化", 120, "SOM_D07_StatsBox_3"),
				]),
			],
		},
		"formation": {
			"page_id": "formation",
			"page_label": "阵容详情",
			"summary": "当前没有新的阵容记录。",
			"hide_summary_body": true,
			"content_blocks": [
				_build_structure_group_block("row", "SOM_D07_FormationRow", [
					_build_structure_box_spec("我方阵容", 120, "SOM_D07_FormationBox_1"),
					_build_structure_box_spec("敌方阵容", 120, "SOM_D07_FormationBox_2"),
				]),
				_build_structure_group_block("stack", "SOM_D07_FormationTail", [
					_build_structure_box_spec("战后说明", 48, "SOM_D07_FormationBox_3"),
				]),
			],
		},
	}
	var report_id := "preview_empty_state"
	return {
		"entry_contracts": [
			_build_entry_contract(
				report_id,
				_build_report_header_block(
					"战",
					"暂无新战报",
					"城内消息",
					"详情保留"
				),
				[
					_build_team_cluster_block("attacker", "0/0", 0, 1, [
						{"name": "暂无记录", "troop_label": "兵力：--", "level_label": "无交战"},
						{"name": "暂无记录", "troop_label": "兵力：--", "level_label": "无交战"},
						{"name": "暂无记录", "troop_label": "兵力：--", "level_label": "无交战"},
					], "我方队伍"),
					_build_result_cluster_block(
						"战报",
						"暂无",
						"--",
						"查看详情"
					),
					_build_team_cluster_block("defender", "0/0", 0, 1, [
						{"name": "暂无对手", "troop_label": "兵力：--", "level_label": "无交战"},
						{"name": "暂无对手", "troop_label": "兵力：--", "level_label": "无交战"},
						{"name": "暂无对手", "troop_label": "兵力：--", "level_label": "无交战"},
					], "敌方队伍"),
					_build_utility_cluster_block("1", "展开"),
				]
			),
		],
		"detail_contracts_by_id": {
			report_id: _compose_detail_page_contract(detail_frame_contract, detail_pages),
		},
	}

static func _build_entry_contract(report_id: String, header_block: Dictionary, body_blocks: Array) -> Dictionary:
	return {
		"report_id": report_id,
		"header_block": header_block,
		"body_blocks": body_blocks,
	}

static func _build_report_header_block(badge_label: String, attacker_team_label: String, location_label: String, defender_team_label: String, maritime_report_result_chip_id: String = "") -> Dictionary:
	return {
		"kind": "report_header",
		"badge_label": badge_label,
		"attacker_team_label": attacker_team_label,
		"location_label": location_label,
		"defender_team_label": defender_team_label,
		"maritime_report_result_chip_id": maritime_report_result_chip_id,
	}

func _resolve_maritime_report_result_chip_id(raw_report: Dictionary, raw_record: Dictionary, runtime_context: Dictionary = {}) -> String:
	var direct_value := _first_non_empty([
		raw_report.get("maritimeReportResultChipId", ""),
		raw_report.get("maritime_report_result_chip_id", ""),
		raw_record.get("maritimeReportResultChipId", ""),
		raw_record.get("maritime_report_result_chip_id", ""),
		runtime_context.get("maritimeReportResultChipId", ""),
		runtime_context.get("maritime_report_result_chip_id", ""),
	])
	if direct_value != "":
		return direct_value
	var detail_text := "%s\n%s\n%s\n%s" % [
		str(raw_report.get("detail", "")),
		str(raw_record.get("detail", "")),
		str(raw_report.get("summary", "")),
		str(raw_record.get("summary", "")),
	]
	if detail_text.find("maritimeReportResultChipId=maritime_report_result_chip_v1") >= 0 or detail_text.find("maritime_report_result_chip_v1") >= 0:
		return "maritime_report_result_chip_v1"
	return ""

static func _build_team_cluster_block(side: String, power_label: String, power_current: int, power_max: int, hero_slots: Array, title: String = "") -> Dictionary:
	var block := {
		"kind": "team_cluster",
		"side": side,
		"power_label": power_label,
		"power_current": power_current,
		"power_max": power_max,
		"hero_slots": hero_slots,
	}
	if title != "":
		block["title"] = title
	return block

static func _build_result_cluster_block(result_note: String, result_text: String, time_label: String, enter_detail_label: String) -> Dictionary:
	return {
		"kind": "result_cluster",
		"result_note": result_note,
		"result_text": result_text,
		"time_label": time_label,
		"enter_detail_label": enter_detail_label,
	}

static func _build_utility_cluster_block(index_label: String, expand_label: String) -> Dictionary:
	return {
		"kind": "utility_cluster",
		"index_label": index_label,
		"expand_label": expand_label,
	}

static func _build_structure_group_block(layout: String, node_name: String, boxes: Array) -> Dictionary:
	return {
		"kind": "structure_group",
		"layout": layout,
		"node_name": node_name,
		"boxes": boxes,
	}

static func _build_structure_box_spec(text: String, height: int, node_name: String) -> Dictionary:
	return {
		"text": text,
		"height": height,
		"node_name": node_name,
	}

func _build_country_summary() -> String:
	var faction_state: Dictionary = _read_target_faction_state()
	var nation_label := _first_non_empty([
		faction_state.get("nation", ""),
		faction_state.get("factionName", ""),
		_target_faction_id,
	])
	if nation_label == "":
		nation_label = "未定势力"
	return "国家 / 势力：%s" % nation_label

func _build_list_contracts(reports: Array, battle_records: Array, execution_replays: Array, runtime_context: Dictionary, is_favorite: bool) -> Dictionary:
	var source_reports := _collect_battle_report_sources(reports, battle_records, runtime_context)
	var source_mode := str(runtime_context.get("source", "")).strip_edges()
	var organization_context: Dictionary = runtime_context.get("organization_context", {}) as Dictionary
	var battle_reports := _filter_organization_battle_reports(source_reports, organization_context) if source_mode == "organization_battle_reports" else _filter_personal_battle_reports(source_reports)
	if is_favorite:
		battle_reports = _filter_favorite_battle_reports(battle_reports)
	var preview_count := 0
	var card_count: int = maxi(battle_reports.size(), preview_count)
	var owner_counts := _count_report_owner_scopes(battle_reports)
	if card_count <= 0:
		return {
			"entry_contracts": [],
			"detail_contracts_by_id": {},
			"player_owned_count": 0,
			"ai_owned_count": 0,
			"organization_owned_count": 0,
		}
	var entry_contracts: Array = []
	var detail_contracts_by_id: Dictionary = {}
	for index in range(card_count):
		var raw_report: Dictionary = battle_reports[index] as Dictionary if index < battle_reports.size() and battle_reports[index] is Dictionary else {}
		var raw_record_variant: Variant = raw_report.get("_source_record", {})
		var raw_record: Dictionary = raw_record_variant as Dictionary if raw_record_variant is Dictionary and not (raw_record_variant as Dictionary).is_empty() else raw_report
		var report_id := _first_non_empty([
			raw_report.get("id", ""),
			raw_report.get("reportId", ""),
			raw_record.get("id", ""),
			raw_record.get("reportId", ""),
			raw_report.get("timestamp", ""),
			raw_record.get("timestamp", ""),
		])
		if report_id == "":
			report_id = "preview_battle_%s" % str(index + 1) if preview_count > 0 else "report_%s" % str(index)
		var owner_scope := str(raw_report.get("owner_scope", "")).strip_edges()
		var ai_owner_id := str(raw_report.get("ai_player_id", "")).strip_edges()
		var attacker_unit_label := _first_non_empty([
			raw_report.get("attacker", ""),
			raw_record.get("attacker", ""),
		])
		var attacker_team_label := _first_non_empty([
			_resolve_report_actor_display_name(raw_report, raw_record, owner_scope, ai_owner_id),
			raw_report.get("playerName", ""),
			attacker_unit_label,
			_resolve_faction_label(),
		])
		var location_label := _first_non_empty([
			raw_report.get("region", ""),
			raw_report.get("location", ""),
			raw_record.get("region", ""),
			raw_record.get("location", ""),
			raw_report.get("targetName", ""),
			"交战地点",
		])
		var list_location_label := _format_report_list_location_label(location_label)
		var defender_team_label := _first_non_empty([
			raw_report.get("defender", ""),
			raw_record.get("defender", ""),
			raw_report.get("target", ""),
			"目标",
		])
		var raw_result_text := _first_non_empty([
			raw_report.get("result", ""),
			raw_record.get("result", ""),
			raw_report.get("outcome", ""),
			raw_record.get("outcome", ""),
			raw_report.get("status", ""),
			raw_record.get("status", ""),
			"",
		])
		var source_id := str(raw_report.get("_battle_report_source", "")).strip_edges()
		var result_text := raw_result_text if source_id == "backend.autonomousCombatPlayerReports" or source_id == "backend.autonomousCombatDailySummary" else _normalize_result_text(raw_result_text)
		var round_label := _format_battle_round_label(raw_report, raw_record)
		var raw_time_label := _first_non_empty([
			raw_report.get("time", ""),
			raw_report.get("timestamp", ""),
			raw_record.get("time", ""),
			raw_record.get("timestamp", ""),
			round_label,
			"--",
		])
		var time_label := _format_report_time_or_round_label(raw_time_label, round_label)
		var attacker_current := _resolve_numeric([
			raw_report.get("attackerTroops", null),
			raw_report.get("attackerPower", null),
			raw_record.get("attackerTroops", null),
			raw_record.get("attackerPower", null),
		])
		var attacker_max := maxi(attacker_current, _resolve_numeric([
			raw_report.get("attackerMaxTroops", null),
			raw_report.get("attackerMaxPower", null),
			raw_record.get("attackerMaxTroops", null),
			raw_record.get("attackerMaxPower", null),
		]))
		var defender_current := _resolve_numeric([
			raw_report.get("defenderTroops", null),
			raw_report.get("defenderPower", null),
			raw_record.get("defenderTroops", null),
			raw_record.get("defenderPower", null),
		])
		var defender_max := maxi(defender_current, _resolve_numeric([
			raw_report.get("defenderMaxTroops", null),
			raw_report.get("defenderMaxPower", null),
			raw_record.get("defenderMaxTroops", null),
			raw_record.get("defenderMaxPower", null),
		]))
		var attacker_heroes := _build_compact_heroes(false, raw_report, raw_record)
		var defender_heroes := _build_compact_heroes(true, raw_report, raw_record)
		var owner_label := ""
		var detail_page_contract := _build_detail_page_contract(
			attacker_team_label,
			defender_team_label,
			result_text,
			time_label,
			location_label,
			attacker_current,
			attacker_max,
			defender_current,
			defender_max,
			attacker_heroes,
			defender_heroes,
			runtime_context,
			execution_replays,
			is_favorite,
			raw_report,
			raw_record
		)
		detail_contracts_by_id[report_id] = detail_page_contract
		var result_cluster := _build_result_cluster_block(
			owner_label,
			result_text,
			_format_report_list_time_label(raw_report, raw_record),
			""
		)
		entry_contracts.append(_build_entry_contract(
			report_id,
			_build_report_header_block(
				_resolve_report_badge_label(raw_report, is_favorite),
				attacker_team_label,
				list_location_label,
				defender_team_label,
				_resolve_maritime_report_result_chip_id(raw_report, raw_record, runtime_context)
			),
			[
				_build_team_cluster_block(
					"attacker",
					"%s/%s" % [str(attacker_current), str(attacker_max)],
					attacker_current,
					attacker_max,
					attacker_heroes,
					attacker_team_label
				),
				result_cluster,
				_build_team_cluster_block(
					"defender",
					"%s/%s" % [str(defender_current), str(defender_max)],
					defender_current,
					defender_max,
					defender_heroes,
					defender_team_label
				),
				_build_utility_cluster_block(str(index + 1), "展开"),
			]
		))
	return {
		"entry_contracts": entry_contracts,
		"detail_contracts_by_id": detail_contracts_by_id,
		"player_owned_count": int(owner_counts.get("player", 0)),
		"ai_owned_count": int(owner_counts.get("ai_player", 0)),
		"organization_owned_count": int(owner_counts.get("organization", 0)),
	}

func _build_owner_action_result_card_payload(owner_scope: String, actor_label: String, target_label: String, result_text: String, raw_report: Dictionary, raw_record: Dictionary) -> Dictionary:
	var scope := owner_scope.strip_edges()
	if scope == "":
		scope = "player"
	var fallback_reason := "AI玩家按当前执行流完成行动。"
	var fallback_next_step := "回到地图继续观察下一步。"
	if scope == "player":
		fallback_reason = "玩家行动已写入战报结果。"
		fallback_next_step = "按战报结果调整下一步。"
	elif scope == "organization":
		fallback_reason = "组织行动已汇总到战报。"
		fallback_next_step = "组织成员继续复盘协同。"
	var reason_label := _first_non_empty([
		raw_report.get("reason", ""),
		raw_record.get("reason", ""),
		raw_report.get("intent", ""),
		raw_record.get("intent", ""),
		raw_report.get("summary", ""),
		raw_record.get("summary", ""),
		fallback_reason,
	])
	var next_step_label := _first_non_empty([
		raw_report.get("nextStep", ""),
		raw_report.get("next_step", ""),
		raw_record.get("nextStep", ""),
		raw_record.get("next_step", ""),
		fallback_next_step,
	])
	return {
		"actor": _first_non_empty([actor_label, "AI玩家" if scope == "ai_player" else ("组织" if scope == "organization" else "玩家")]),
		"reason": _truncate_battle_report_list_ai_action_text(reason_label, 22),
		"target": _first_non_empty([target_label, raw_report.get("targetName", ""), raw_record.get("targetName", ""), "交战目标"]),
		"next_step": _truncate_battle_report_list_ai_action_text(("%s后复盘下一步" % result_text) if result_text != "" else next_step_label, 18),
	}

func _truncate_battle_report_list_ai_action_text(text: String, max_length: int) -> String:
	var normalized := text.strip_edges()
	if normalized.length() <= max_length:
		return normalized
	return "%s…" % normalized.substr(0, maxi(max_length - 1, 1))

func _collect_battle_report_sources(reports: Array, battle_records: Array, runtime_context: Dictionary = {}) -> Array:
	var result: Array = _collect_backend_autonomous_combat_daily_summary(runtime_context)
	result.append_array(_collect_backend_autonomous_combat_player_reports(runtime_context))
	for record_variant in battle_records:
		if not (record_variant is Dictionary):
			continue
		var record := (record_variant as Dictionary).duplicate(true)
		if not _is_battle_report_like(record):
			continue
		if not record.has("title"):
			record["title"] = _first_non_empty([record.get("summary", ""), record.get("reportKind", ""), "战斗记录"])
		record["_battle_report_source"] = "feedback.battleRecords"
		record["_source_record"] = record.duplicate(true)
		_apply_report_identity_metadata(record)
		result.append(record)
	for report_variant in reports:
		if not (report_variant is Dictionary):
			continue
		var report := (report_variant as Dictionary).duplicate(true)
		if not _is_battle_report_like(report):
			continue
		report["_battle_report_source"] = "world.reports"
		_apply_report_identity_metadata(report)
		result.append(report)
	return result

func _collect_backend_autonomous_combat_daily_summary(runtime_context: Dictionary) -> Array:
	var summary_variant: Variant = runtime_context.get("ai_autonomous_combat_daily_summary", {})
	if not (summary_variant is Dictionary):
		return []
	var item := summary_variant as Dictionary
	if str(item.get("itemKind", "")).strip_edges() != "ai_autonomous_combat_daily_summary":
		return []
	var summary := _first_non_empty([
		item.get("summary", ""),
		item.get("result", ""),
	])
	if summary == "":
		return []
	var report_id := _first_non_empty([
		item.get("reportId", ""),
		item.get("id", ""),
		item.get("createdAt", ""),
		"backend_ai_autonomous_combat_daily_summary",
	])
	var report := {
		"id": report_id,
		"reportId": report_id,
		"title": _first_non_empty([item.get("title", ""), "今日战斗总结"]),
		"summary": summary,
		"detail": summary,
		"result": _first_non_empty([item.get("result", ""), summary]),
		"attacker": "AI参谋",
		"defender": "今日总结",
		"location": "个人战报",
		"time": str(item.get("createdAt", "")).strip_edges(),
		"timestamp": str(item.get("createdAt", "")).strip_edges(),
		"aiPlayerId": str(item.get("aiPlayerId", "")).strip_edges(),
		"factionId": str(item.get("factionId", "")).strip_edges(),
		"ownerPlayerId": str(item.get("ownerPlayerId", "")).strip_edges(),
		"actorType": str(item.get("actorType", "ai_player")).strip_edges(),
		"category": "combat_daily_summary",
		"_battle_report_source": "backend.autonomousCombatDailySummary",
	}
	report["_source_record"] = report.duplicate(true)
	_apply_report_identity_metadata(report)
	return [report]

func _collect_backend_autonomous_combat_player_reports(runtime_context: Dictionary) -> Array:
	var items_variant: Variant = runtime_context.get("ai_autonomous_combat_player_report_items", [])
	if not (items_variant is Array):
		items_variant = runtime_context.get("ai_combat_player_report_items", [])
	var items: Array = items_variant as Array if items_variant is Array else []
	var result: Array = []
	for item_variant in items:
		if not (item_variant is Dictionary):
			continue
		var item := item_variant as Dictionary
		if str(item.get("itemKind", "")).strip_edges() != "ai_autonomous_combat":
			continue
		var summary := _first_non_empty([
			item.get("summary", ""),
			item.get("result", ""),
		])
		if summary == "":
			continue
		var report_id := _first_non_empty([
			item.get("reportId", ""),
			item.get("id", ""),
			item.get("createdAt", ""),
		])
		if report_id == "":
			report_id = "backend_ai_autonomous_combat_%s" % str(result.size() + 1)
		var report := {
			"id": report_id,
			"reportId": report_id,
			"title": _first_non_empty([item.get("title", ""), "AI战斗回报"]),
			"summary": summary,
			"detail": summary,
			"result": _first_non_empty([item.get("result", ""), summary]),
			"attacker": "AI参谋",
			"defender": "战后处理",
			"location": "个人战报",
			"time": str(item.get("createdAt", "")).strip_edges(),
			"timestamp": str(item.get("createdAt", "")).strip_edges(),
			"aiPlayerId": str(item.get("aiPlayerId", "")).strip_edges(),
			"factionId": str(item.get("factionId", "")).strip_edges(),
			"ownerPlayerId": str(item.get("ownerPlayerId", "")).strip_edges(),
			"actorType": str(item.get("actorType", "ai_player")).strip_edges(),
			"category": "combat",
			"_battle_report_source": "backend.autonomousCombatPlayerReports",
		}
		report["_source_record"] = report.duplicate(true)
		_apply_report_identity_metadata(report)
		result.append(report)
	return result

func _filter_battle_reports(reports: Array) -> Array:
	return _filter_personal_battle_reports(_collect_battle_report_sources(reports, []))

func _filter_personal_battle_reports(source_reports: Array) -> Array:
	var result: Array = []
	for report_variant in source_reports:
		if not (report_variant is Dictionary):
			continue
		var report := (report_variant as Dictionary).duplicate(true)
		if _has_report_organization_marker(report):
			continue
		if _report_matches_target_faction(report) or _report_ai_owner_matches_target(report):
			result.append(report)
	return result

func _filter_favorite_battle_reports(source_reports: Array) -> Array:
	var result: Array = []
	for report_variant in source_reports:
		if not (report_variant is Dictionary):
			continue
		var report := report_variant as Dictionary
		if bool(report.get("favorite", report.get("isFavorite", false))):
			result.append(report)
	return result

func _resolve_report_actor_display_name(raw_report: Dictionary, raw_record: Dictionary, owner_scope: String, ai_owner_id: String) -> String:
	if owner_scope == "ai_player":
		return _resolve_ai_player_name(ai_owner_id)
	if owner_scope == "organization":
		return _first_non_empty([
			raw_report.get("organizationName", ""),
			raw_report.get("allianceName", ""),
			raw_report.get("nationName", ""),
			raw_record.get("organizationName", ""),
			raw_record.get("allianceName", ""),
			raw_record.get("nationName", ""),
		])
	return _first_non_empty([
		raw_report.get("ownerPlayerName", ""),
		raw_report.get("governorPlayerName", ""),
		raw_report.get("playerDisplayName", ""),
		raw_report.get("playerName", ""),
		raw_record.get("ownerPlayerName", ""),
		raw_record.get("governorPlayerName", ""),
		raw_record.get("playerDisplayName", ""),
		raw_record.get("playerName", ""),
	])

func _filter_organization_battle_reports(source_reports: Array, organization_context: Dictionary = {}) -> Array:
	var result: Array = []
	for report_variant in source_reports:
		if not (report_variant is Dictionary):
			continue
		var report := (report_variant as Dictionary).duplicate(true)
		if _report_matches_organization_context(report, organization_context):
			report["owner_scope"] = "organization"
			report["owner_label"] = _first_non_empty([organization_context.get("label", ""), "组织战报"])
			result.append(report)
	return result

func _is_battle_report_like(report: Dictionary) -> bool:
	if report.has("attacker") or report.has("defender") or report.has("outcome") or report.has("attackerUnitId") or report.has("defenderUnitId") or report.has("attackerFaction") or report.has("reportKind"):
		return true
	var probe := " ".join([
		str(report.get("id", "")),
		str(report.get("title", "")),
		str(report.get("detail", "")),
		str(report.get("type", "")),
		str(report.get("kind", "")),
		str(report.get("category", "")),
	]).to_lower()
	for token in ["战报", "交战", "攻占", "占领", "守军", "battle_report", "battle-record", "tile_occupy", "combat"]:
		if probe.find(token) >= 0:
			return true
	return false

func _apply_report_identity_metadata(report: Dictionary) -> void:
	var ai_owner_id := _resolve_report_ai_owner_id(report)
	var owner_scope := _resolve_report_owner_scope(report)
	report["owner_scope"] = owner_scope
	report["ai_player_id"] = ai_owner_id
	report["owner_label"] = _resolve_report_owner_label(owner_scope, ai_owner_id)
	report["source_label"] = _resolve_report_source_label(str(report.get("_battle_report_source", "")).strip_edges())

func _count_report_owner_scopes(reports: Array) -> Dictionary:
	var result := {
		"player": 0,
		"ai_player": 0,
		"organization": 0,
	}
	for report_variant in reports:
		if not (report_variant is Dictionary):
			continue
		var scope := str((report_variant as Dictionary).get("owner_scope", "player")).strip_edges()
		if scope == "":
			scope = "player"
		result[scope] = int(result.get(scope, 0)) + 1
	return result

func _resolve_report_owner_scope(report: Dictionary) -> String:
	if _resolve_report_ai_owner_id(report) != "":
		return "ai_player"
	if _has_report_organization_marker(report):
		return "organization"
	return "player"

func _resolve_report_ai_owner_id(report: Dictionary) -> String:
	var direct_id := _first_non_empty([
		report.get("aiPlayerId", ""),
		report.get("ai_player_id", ""),
		report.get("ownerAiPlayerId", ""),
		report.get("actorAiPlayerId", ""),
		report.get("controllerAiPlayerId", ""),
		report.get("attackerAiPlayerId", ""),
	])
	if direct_id != "":
		return direct_id
	var attacker_unit_id := _first_non_empty([
		report.get("attackerUnitId", ""),
		report.get("unitId", ""),
	])
	if attacker_unit_id != "":
		var unit := _resolve_unit_by_id(attacker_unit_id)
		return str(unit.get("aiPlayerId", "")).strip_edges()
	return ""

func _resolve_report_owner_label(owner_scope: String, ai_owner_id: String) -> String:
	if owner_scope == "ai_player":
		return "AI战报"
	if owner_scope == "organization":
		return "组织战报"
	return "个人战报"

func _resolve_report_source_label(source: String) -> String:
	match source:
		"feedback.battleRecords":
			return "战斗记录"
		"world.reports":
			return "世界报告"
		"battle_report_detail":
			return "战报详情"
		_:
			return "战报来源"

func _resolve_report_badge_label(report: Dictionary, is_favorite: bool) -> String:
	if is_favorite:
		return "藏"
	var owner_scope := str(report.get("owner_scope", "")).strip_edges()
	if owner_scope == "ai_player":
		return "AI"
	if owner_scope == "organization":
		return "盟"
	return "个人"

func _format_report_list_location_label(location_label: String) -> String:
	var normalized := location_label.strip_edges()
	if normalized == "":
		return ""
	if normalized.is_valid_identifier() or _looks_like_ascii_location_label(normalized):
		return ""
	return normalized

func _format_report_list_time_label(raw_report: Dictionary, raw_record: Dictionary) -> String:
	var normalized := _first_non_empty([
		raw_report.get("time", ""),
		raw_report.get("timestamp", ""),
		raw_record.get("time", ""),
		raw_record.get("timestamp", ""),
	])
	if normalized.begins_with("第") and normalized.find("回合") >= 0:
		return ""
	var round_label := _format_battle_round_label(raw_report, raw_record)
	normalized = _format_report_time_or_round_label(normalized, round_label)
	if normalized == round_label:
		return ""
	return normalized

func _format_report_time_or_round_label(raw_value: String, round_label: String) -> String:
	var normalized := raw_value.strip_edges()
	if normalized == "":
		return round_label
	if normalized.find("刻") >= 0:
		return round_label
	if normalized.is_valid_int() or normalized.is_valid_float():
		return round_label
	return normalized

func _format_battle_round_label(raw_report: Dictionary, raw_record: Dictionary) -> String:
	var round_count := _resolve_battle_round_count(raw_report, raw_record)
	if round_count <= 0:
		round_count = 8
	return "共%s回合" % str(mini(maxi(round_count, 1), 8))

func _resolve_battle_round_count(raw_report: Dictionary, raw_record: Dictionary) -> int:
	var rounds_variant: Variant = raw_record.get("rounds", raw_report.get("rounds", []))
	if rounds_variant is Array:
		var rounds := rounds_variant as Array
		if not rounds.is_empty():
			return rounds.size()
	return _resolve_numeric([
		raw_record.get("roundCount", null),
		raw_report.get("roundCount", null),
		raw_record.get("round_count", null),
		raw_report.get("round_count", null),
		raw_record.get("maxRound", null),
		raw_report.get("maxRound", null),
	])

func _looks_like_ascii_location_label(value: String) -> bool:
	var has_letter := false
	for index in range(value.length()):
		var code := value.unicode_at(index)
		if code >= 128:
			return false
		if (code >= 65 and code <= 90) or (code >= 97 and code <= 122):
			has_letter = true
	return has_letter

func _report_matches_target_faction(report: Dictionary) -> bool:
	if _target_faction_id == "":
		return true
	var faction_ids := _collect_report_faction_ids(report)
	if faction_ids.is_empty():
		return true
	return faction_ids.has(_target_faction_id)

func _report_ai_owner_matches_target(report: Dictionary) -> bool:
	var ai_owner_id := _resolve_report_ai_owner_id(report)
	if ai_owner_id == "":
		return false
	return _ai_player_id_belongs_to_target(ai_owner_id)

func _report_matches_organization_context(report: Dictionary, organization_context: Dictionary) -> bool:
	var organization_id := _first_non_empty([
		organization_context.get("id", ""),
		organization_context.get("faction_id", ""),
		_target_faction_id,
	])
	var organization_name := _first_non_empty([
		organization_context.get("name", ""),
		organization_context.get("label", ""),
		_resolve_faction_label(),
	])
	var report_org_id := _first_non_empty([
		report.get("organizationId", ""),
		report.get("organization_id", ""),
		report.get("allianceId", ""),
		report.get("nationId", ""),
		report.get("ownerOrganizationId", ""),
	])
	if report_org_id != "":
		return report_org_id == organization_id or report_org_id == _target_faction_id
	var report_org_name := _first_non_empty([
		report.get("organizationName", ""),
		report.get("allianceName", ""),
		report.get("nationName", ""),
	])
	if report_org_name != "":
		return report_org_name == organization_name
	return _report_matches_target_faction(report) or _report_ai_owner_matches_target(report)

func _has_report_organization_marker(report: Dictionary) -> bool:
	return _first_non_empty([
		report.get("organizationId", ""),
		report.get("organization_id", ""),
		report.get("allianceId", ""),
		report.get("nationId", ""),
		report.get("organizationName", ""),
		report.get("allianceName", ""),
		report.get("nationName", ""),
	]) != ""

func _collect_report_faction_ids(report: Dictionary) -> Array:
	var result: Array = []
	for key_variant in [
		"factionId",
		"ownerFactionId",
		"playerFactionId",
		"sourceFactionId",
		"attackerFaction",
		"attackerFactionId",
		"defenderFaction",
		"defenderFactionId",
	]:
		var faction_id := str(report.get(str(key_variant), "")).strip_edges()
		if faction_id != "" and not result.has(faction_id):
			result.append(faction_id)
	for unit_key_variant in ["attackerUnitId", "defenderUnitId", "unitId"]:
		var unit_id := str(report.get(str(unit_key_variant), "")).strip_edges()
		var unit_faction := _resolve_unit_faction(unit_id)
		if unit_faction != "" and not result.has(unit_faction):
			result.append(unit_faction)
	return result

func _resolve_unit_by_id(unit_id: String) -> Dictionary:
	var normalized_id := unit_id.strip_edges()
	if normalized_id == "":
		return {}
	var units: Array = _world_data.get("units", []) as Array
	for unit_variant in units:
		if not (unit_variant is Dictionary):
			continue
		var unit := unit_variant as Dictionary
		if str(unit.get("id", "")).strip_edges() == normalized_id:
			return unit
	return {}

func _resolve_unit_faction(unit_id: String) -> String:
	var unit := _resolve_unit_by_id(unit_id)
	return str(unit.get("faction", "")).strip_edges()

func _ai_player_id_belongs_to_target(ai_player_id: String) -> bool:
	var normalized_id := ai_player_id.strip_edges()
	if normalized_id == "":
		return false
	var faction_state := _read_target_faction_state()
	var ai_players: Array = faction_state.get("aiPlayers", []) as Array
	for player_variant in ai_players:
		if not (player_variant is Dictionary):
			continue
		var player := player_variant as Dictionary
		if str(player.get("id", player.get("aiPlayerId", ""))).strip_edges() == normalized_id:
			return true
	return false

func _resolve_ai_player_name(ai_player_id: String) -> String:
	var normalized_id := ai_player_id.strip_edges()
	if normalized_id == "":
		return ""
	var faction_state := _read_target_faction_state()
	var ai_players: Array = faction_state.get("aiPlayers", []) as Array
	for player_variant in ai_players:
		if not (player_variant is Dictionary):
			continue
		var player := player_variant as Dictionary
		if str(player.get("id", player.get("aiPlayerId", ""))).strip_edges() == normalized_id:
			return _first_non_empty([player.get("displayName", ""), player.get("name", ""), normalized_id])
	return normalized_id

func _build_detail_page_contract(
	attacker_team_label: String,
	defender_team_label: String,
	result_text: String,
	time_label: String,
	location_label: String,
	attacker_current: int,
	attacker_max: int,
	defender_current: int,
	defender_max: int,
	attacker_heroes: Array,
	defender_heroes: Array,
	runtime_context: Dictionary,
	execution_replays: Array,
	is_favorite: bool,
	raw_report: Dictionary,
	raw_record: Dictionary
) -> Dictionary:
	var outcome_note := ""
	var summary_line := _first_non_empty([
		raw_record.get("summary", ""),
		raw_report.get("detail", ""),
		raw_report.get("summary", ""),
		"战报摘要待生成。",
	])
	var reward_lines := _build_reward_only_lines(raw_report, raw_record, summary_line)
	var attacker_loss := _resolve_troop_loss(raw_record, raw_report, "attacker", attacker_current, attacker_max)
	var defender_loss := _resolve_troop_loss(raw_record, raw_report, "defender", defender_current, defender_max)
	if attacker_loss > 0 or defender_loss > 0:
		reward_lines.append("我方损失 %s" % str(attacker_loss))
		reward_lines.append("敌方损失 %s" % str(defender_loss))
	var reward_title := "奖励 / 战损" if attacker_loss > 0 or defender_loss > 0 else "获得奖励"
	var replay_hint := "可查看 %s 段行动复盘。" % str(execution_replays.size())
	var attacker_slots := _build_detail_slots(attacker_heroes, ATTACKER_ROLE_ORDER, false)
	var defender_slots := _build_detail_slots(defender_heroes, DEFENDER_ROLE_ORDER, true)
	var detail_frame_contract := _build_detail_frame_contract(
		attacker_team_label,
		defender_team_label,
		result_text,
		outcome_note,
		attacker_current,
		attacker_max,
		defender_current,
		defender_max,
		reward_title,
		reward_lines,
		attacker_slots,
		defender_slots
	)
	var replay_request_id := _resolve_replay_request_id_for_report(raw_report, raw_record, execution_replays)
	detail_frame_contract["replay_request_id"] = replay_request_id
	detail_frame_contract["replay_source_report_id"] = _first_non_empty([
		raw_report.get("id", ""),
		raw_report.get("reportId", ""),
		raw_record.get("id", ""),
		raw_record.get("reportId", ""),
	])
	detail_frame_contract["replay_available"] = replay_request_id != ""
	var detail_pages := _build_detail_pages(
		location_label,
		time_label,
		attacker_team_label,
		result_text,
		attacker_current,
		attacker_max,
		defender_current,
		defender_max,
		attacker_slots,
		defender_slots,
		runtime_context,
		replay_hint,
		raw_report,
		raw_record
	)
	return _compose_detail_page_contract(detail_frame_contract, detail_pages)

func _resolve_replay_request_id_for_report(raw_report: Dictionary, raw_record: Dictionary, execution_replays: Array) -> String:
	var direct_request_id := _first_non_empty([
		raw_report.get("replayRequestId", ""),
		raw_report.get("replay_request_id", ""),
		raw_report.get("requestId", ""),
		raw_report.get("request_id", ""),
		raw_record.get("replayRequestId", ""),
		raw_record.get("replay_request_id", ""),
		raw_record.get("requestId", ""),
		raw_record.get("request_id", ""),
	])
	if direct_request_id != "":
		return direct_request_id
	for replay_variant in execution_replays:
		if not (replay_variant is Dictionary):
			continue
		var replay := replay_variant as Dictionary
		var replay_request_id := _first_non_empty([
			replay.get("requestId", ""),
			replay.get("request_id", ""),
			replay.get("id", ""),
		])
		if replay_request_id != "":
			return replay_request_id
	return ""

func _build_reward_only_lines(raw_report: Dictionary, raw_record: Dictionary, summary_line: String) -> Array[String]:
	var lines: Array[String] = []
	_append_reward_lines_from_value(lines, raw_record.get("rewards", []))
	_append_reward_lines_from_value(lines, raw_record.get("rewardLines", []))
	_append_reward_lines_from_value(lines, raw_record.get("reward_lines", []))
	_append_reward_lines_from_value(lines, raw_report.get("rewards", []))
	_append_reward_lines_from_value(lines, raw_report.get("rewardLines", []))
	_append_reward_lines_from_value(lines, raw_report.get("reward_lines", []))
	_append_reward_lines_from_value(lines, raw_record.get("resourceRewards", []))
	_append_reward_lines_from_value(lines, raw_record.get("rewardResources", []))
	_append_reward_lines_from_value(lines, raw_record.get("loot", []))
	_append_reward_lines_from_value(lines, raw_record.get("resourceDeltas", []))
	_append_reward_lines_from_value(lines, raw_report.get("resourceRewards", []))
	_append_reward_lines_from_value(lines, raw_report.get("rewardResources", []))
	_append_reward_lines_from_value(lines, raw_report.get("loot", []))
	_append_reward_lines_from_value(lines, raw_report.get("resourceDeltas", []))
	lines = _unique_non_empty_lines(lines)
	if lines.is_empty():
		var parsed_reward := _extract_reward_text_from_summary(summary_line)
		if parsed_reward != "":
			lines.append(parsed_reward)
	return lines

func _unique_non_empty_lines(lines: Array[String]) -> Array[String]:
	var result: Array[String] = []
	var seen := {}
	for line in lines:
		var normalized := str(line).strip_edges()
		if normalized == "":
			continue
		if seen.has(normalized):
			continue
		seen[normalized] = true
		result.append(normalized)
	return result


func _append_reward_lines_from_value(lines: Array[String], raw_value: Variant) -> void:
	if raw_value is Array:
		for item_variant in raw_value as Array:
			_append_reward_lines_from_value(lines, item_variant)
		return
	if raw_value is Dictionary:
		var payload := raw_value as Dictionary
		var reward_name := _first_non_empty([
			payload.get("displayName", ""),
			payload.get("name", ""),
			payload.get("resource", ""),
			payload.get("type", ""),
		])
		var amount_text := _format_reward_amount_value([
			payload.get("amount", ""),
			payload.get("value", ""),
			payload.get("count", ""),
		])
		if reward_name != "" and amount_text != "":
			var sign := "" if amount_text.begins_with("+") or amount_text.begins_with("-") else "+"
			lines.append("%s %s%s" % [reward_name, sign, amount_text])
		return
	var text := str(raw_value).strip_edges()
	if text != "":
		lines.append(text)

func _format_reward_amount_value(candidates: Array) -> String:
	for candidate in candidates:
		if candidate == null:
			continue
		if candidate is int:
			return str(int(candidate))
		if candidate is float:
			var number := float(candidate)
			if is_equal_approx(number, round(number)):
				return str(int(round(number)))
			return str(number)
		var text := str(candidate).strip_edges()
		if text != "":
			return text
	return ""


func _extract_reward_text_from_summary(summary_line: String) -> String:
	var markers := ["经验", "粮食", "木材", "石料", "铁矿", "铜币", "玉符", "资源"]
	for clause_variant in summary_line.split("。", false):
		var clause := str(clause_variant).strip_edges()
		if clause == "":
			continue
		for marker in markers:
			if clause.find(marker) >= 0 and (clause.find("+") >= 0 or clause.find("获得") >= 0):
				return clause
	return ""


static func _build_detail_frame_contract(
	attacker_team_label: String,
	defender_team_label: String,
	result_text: String,
	outcome_note: String,
	attacker_current: int,
	attacker_max: int,
	defender_current: int,
	defender_max: int,
	reward_title: String,
	reward_lines: Array[String],
	attacker_slots: Array,
	defender_slots: Array
) -> Dictionary:
	return {
		"attacker_power_label": "%s/%s" % [str(attacker_current), str(attacker_max)],
		"attacker_power_current": attacker_current,
		"attacker_power_max": attacker_max,
		"attacker_team_label": attacker_team_label,
		"result_text": result_text,
		"outcome_note": outcome_note,
		"defender_power_label": "%s/%s" % [str(defender_current), str(defender_max)],
		"defender_power_current": defender_current,
		"defender_power_max": defender_max,
		"defender_team_label": defender_team_label,
		"reward_title": reward_title,
		"reward_lines": reward_lines,
		"reward_copy_mode": UI_COMPONENT_FACTORY.battle_report_detail_reward_copy_mode(),
		"hero_info_mode": UI_COMPONENT_FACTORY.battle_report_detail_hero_info_mode(),
		"show_outcome_note": false,
		"show_replay_button": true,
		"attacker_morale_label": "",
		"defender_morale_label": "",
		"share_label": "分享",
		"favorite_label": "收藏",
		"attacker_slots": attacker_slots,
		"defender_slots": defender_slots,
	}

static func _compose_detail_page_contract(detail_frame_contract: Dictionary, detail_pages: Dictionary) -> Dictionary:
	return {
		"detail_frame_contract": detail_frame_contract,
		"detail_pages": detail_pages,
	}

func _build_detail_pages(
	location_label: String,
	time_label: String,
	attacker_team_label: String,
	result_text: String,
	attacker_current: int,
	attacker_max: int,
	defender_current: int,
	defender_max: int,
	attacker_slots: Array,
	defender_slots: Array,
	runtime_context: Dictionary,
	replay_hint: String,
	raw_report: Dictionary,
	raw_record: Dictionary
) -> Dictionary:
	var battlefield_lines := _build_battlefield_lines(location_label, time_label, raw_report, raw_record)
	var battlefield_meta_rows := _build_battlefield_meta_rows(location_label, time_label, raw_report, raw_record)
	var ai_living_feedback_block := _build_ai_living_feedback_block(
		attacker_slots,
		raw_report,
		raw_record,
		runtime_context,
		attacker_team_label,
		result_text
	)
	var stats_blocks: Array = []
	var stats_grid_block := _build_battle_stats_grid_block(attacker_current, attacker_max, defender_current, defender_max, raw_report, raw_record)
	var round_timeline_block := _build_round_timeline_block(raw_report, raw_record)
	round_timeline_block["node_name"] = "SOM_D11_RoundTimeline"
	var stats_below_fold_blocks := [
		stats_grid_block,
		{
			"kind": "info_card",
			"title": "战报摘要",
			"accent_key": "stats",
			"node_name": "SOM_D11_SummaryCard",
			"lines": _build_battle_summary_lines(raw_report, raw_record),
		},
		round_timeline_block,
		{
			"kind": "info_card",
			"title": "后续",
			"accent_key": "generic",
			"node_name": "SOM_D11_RuntimeCard",
			"lines": [
				_format_runtime_action_player_line(runtime_context),
				"可在战况回放中检查行动帧。",
			],
		},
	]
	return {
		"battlefield": {
			"page_id": "battlefield",
			"page_label": "地点",
			"summary": "",
			"hide_summary_body": true,
			"content_blocks": [
				ai_living_feedback_block,
				{
					"kind": "info_card",
					"title": "地点与时间",
					"accent_key": "battlefield",
					"node_name": "SOM_D07_BattlefieldCard",
					"min_height": 132,
					"lines": battlefield_lines,
					"meta_rows": battlefield_meta_rows,
				},
			],
		},
		"stats": {
			"page_id": "stats",
			"page_label": str(DETAIL_PAGE_LABELS.get("stats", "统计")),
			"summary": "我方损失 %s，敌方损失 %s。" % [str(_resolve_troop_loss(raw_record, raw_report, "attacker", attacker_current, attacker_max)), str(_resolve_troop_loss(raw_record, raw_report, "defender", defender_current, defender_max))],
			"hide_summary_body": true,
			"empty_content_ok": true,
			"below_fold_blocks": stats_below_fold_blocks,
			"deferred_metrics": stats_grid_block.get("metrics", []),
			"deferred_rounds": _build_round_detail_payloads(raw_report, raw_record),
			"deferred_summary_lines": _build_battle_summary_lines(raw_report, raw_record),
			"deferred_runtime_lines": [
				_format_runtime_action_player_line(runtime_context),
			],
			"content_blocks": stats_blocks,
		},
		"formation": {
			"page_id": "formation",
			"page_label": str(DETAIL_PAGE_LABELS.get("formation", "阵容详情")),
			"summary": "阵容、站位和卡内信息统一走阵容页合同。",
			"content_blocks": [
				{
					"kind": "roster_card",
					"title": "我方阵容",
					"slot_source": "attacker_slots",
					"is_defender": false,
					"node_name": "SOM_D07_AttackerRosterCard",
				},
				{
					"kind": "roster_card",
					"title": "敌方阵容",
					"slot_source": "defender_slots",
					"is_defender": true,
					"node_name": "SOM_D07_DefenderRosterCard",
				},
			],
			"footer_note": replay_hint,
		},
	}

func _build_ai_living_feedback_block(
	attacker_slots: Array,
	raw_report: Dictionary,
	raw_record: Dictionary,
	runtime_context: Dictionary,
	attacker_team_label: String,
	result_text: String
) -> Dictionary:
	var ai_player_id := _first_non_empty([
		raw_report.get("ai_player_id", ""),
		raw_report.get("aiPlayerId", ""),
		raw_record.get("ai_player_id", ""),
		raw_record.get("aiPlayerId", ""),
	])
	var primary_hero_name := ""
	if not attacker_slots.is_empty() and attacker_slots[0] is Dictionary:
		primary_hero_name = str((attacker_slots[0] as Dictionary).get("name", "")).strip_edges()
	var actor_label := _sanitize_battle_report_player_visible_copy(_first_non_empty([
		_resolve_ai_player_name(ai_player_id),
		raw_report.get("owner_label", ""),
		raw_report.get("ownerPlayerName", ""),
		attacker_team_label,
		primary_hero_name,
		"AI玩家",
	]), "AI玩家")
	var action_label := _sanitize_battle_report_player_visible_copy(_first_non_empty([
		raw_report.get("actionLabel", ""),
		raw_report.get("actionName", ""),
		raw_record.get("actionLabel", ""),
		raw_record.get("actionName", ""),
		raw_report.get("title", ""),
		raw_record.get("title", ""),
		raw_record.get("reportKind", ""),
		raw_report.get("reportKind", ""),
		"战后复盘",
	]), "战后复盘")
	var reason_line := _sanitize_battle_report_player_visible_copy(_first_non_empty([
		raw_report.get("reason", ""),
		raw_record.get("reason", ""),
		raw_report.get("intent", ""),
		raw_record.get("intent", ""),
		raw_record.get("summary", ""),
		raw_report.get("summary", ""),
		raw_report.get("detail", ""),
		"根据本次交战结果更新下一步行动判断。",
	]), "根据本次交战结果更新下一步行动判断。")
	var result_line := _sanitize_battle_report_player_visible_copy(_first_non_empty([
		result_text,
		raw_report.get("result", ""),
		raw_record.get("result", ""),
		raw_report.get("outcome", ""),
		raw_record.get("outcome", ""),
		"结果待确认",
	]), "结果待确认")
	var source_label := _resolve_battle_report_detail_source_label(raw_report, raw_record)
	var ai_activity_continuity := _resolve_battle_report_ai_activity_continuity(ai_player_id, raw_report, raw_record, runtime_context)
	var execution_trace_ids: Array = ai_activity_continuity.get("execution_trace_ids", []) as Array
	return {
		"kind": "ai_living_feedback_card",
		"node_name": "BattleReportAiLivingFeedbackCard",
		"ai_living_feedback_contract": UI_COMPONENT_FACTORY.battle_report_detail_ai_living_feedback_token(),
		"ai_activity_continuity_contract": UI_COMPONENT_FACTORY.battle_report_detail_ai_activity_continuity_token(),
		"ai_player_id": ai_player_id,
		"title": "AI玩家战后反馈",
		"actor_label": actor_label,
		"action_label": action_label,
		"reason_line": reason_line,
		"result_line": result_line,
		"source_label": source_label,
		"avatar_image_path": str(ai_activity_continuity.get("avatar_image_path", "")).strip_edges(),
		"status_dot": str(ai_activity_continuity.get("status_dot", "green")).strip_edges(),
		"status_reason": str(ai_activity_continuity.get("status_reason", "")).strip_edges(),
		"execution_trace_count": int(ai_activity_continuity.get("execution_trace_count", 1)),
		"execution_trace_ids": execution_trace_ids.duplicate(true),
		"maritime_report_result_chip_id": _resolve_maritime_report_result_chip_id(raw_report, raw_record, runtime_context),
	}

func _resolve_battle_report_detail_source_label(raw_report: Dictionary, raw_record: Dictionary) -> String:
	var raw_source := _first_non_empty([
		raw_report.get("_battle_report_source", ""),
		raw_record.get("_battle_report_source", ""),
		raw_report.get("source", ""),
		raw_record.get("source", ""),
		"battle_report_detail",
	])
	return _resolve_report_source_label(raw_source)

func _format_runtime_action_player_line(runtime_context: Dictionary) -> String:
	var last_action := str(runtime_context.get("last_action", "")).strip_edges()
	var last_status := str(runtime_context.get("last_action_status", "")).strip_edges()
	if last_action == "" or last_action == "none" or last_status == "idle":
		return "后续行动待确认。"
	if _battle_report_copy_has_forbidden_term(last_action) or _battle_report_copy_has_forbidden_term(last_status):
		return "后续行动待确认。"
	return "后续行动已记录。"

func _sanitize_battle_report_player_visible_copy(value: String, fallback: String = BATTLE_REPORT_PLAYER_VISIBLE_COPY_FALLBACK) -> String:
	var text := value.strip_edges()
	if text == "":
		return fallback
	if _battle_report_copy_has_forbidden_term(text):
		return fallback
	return text

func _battle_report_copy_has_forbidden_term(value: String) -> bool:
	var lower_value := value.strip_edges().to_lower()
	if lower_value == "":
		return false
	for raw_term in BATTLE_REPORT_PLAYER_VISIBLE_FORBIDDEN_TERMS:
		var term := str(raw_term).strip_edges().to_lower()
		if term != "" and lower_value.find(term) >= 0:
			return true
	return false

func _resolve_battle_report_ai_activity_continuity(ai_player_id: String, raw_report: Dictionary, raw_record: Dictionary, runtime_context: Dictionary) -> Dictionary:
	var runtime_item := _resolve_battle_report_ai_runtime_item(ai_player_id)
	var list_card_variant: Variant = runtime_item.get("listCard", {})
	var list_card: Dictionary = list_card_variant as Dictionary if list_card_variant is Dictionary else {}
	var trace_items := _collect_battle_report_ai_execution_trace_items(ai_player_id, raw_report, raw_record, runtime_context)
	var trace_count := maxi(trace_items.size(), 1)
	var trace_id_keys := ["traceId", "trace_id", "reportId"]
	var trace_ids := _collect_battle_report_ai_execution_trace_ids(trace_items, trace_id_keys)
	return {
		"avatar_image_path": _first_non_empty([
			raw_report.get("avatarImagePath", ""),
			raw_report.get("avatar_image_path", ""),
			raw_record.get("avatarImagePath", ""),
			raw_record.get("avatar_image_path", ""),
			runtime_item.get("avatarImagePath", ""),
			runtime_item.get("avatar_image_path", ""),
			BATTLE_REPORT_AI_ACTIVITY_FALLBACK_AVATAR_PATH,
		]),
		"status_dot": _first_non_empty([
			raw_report.get("statusDot", ""),
			raw_report.get("status_dot", ""),
			raw_record.get("statusDot", ""),
			raw_record.get("status_dot", ""),
			list_card.get("statusDot", ""),
			list_card.get("status_dot", ""),
			"green",
		]),
		"status_reason": _first_non_empty([
			raw_report.get("statusReason", ""),
			raw_report.get("status_reason", ""),
			raw_record.get("statusReason", ""),
			raw_record.get("status_reason", ""),
			list_card.get("statusReason", ""),
			list_card.get("status_reason", ""),
			"battle_report_execution_trace_linked",
		]),
		"execution_trace_count": trace_count,
		"execution_trace_ids": trace_ids,
	}

func _resolve_battle_report_ai_runtime_item(ai_player_id: String) -> Dictionary:
	var normalized_id := ai_player_id.strip_edges()
	var faction_state := _read_target_faction_state()
	var ai_players: Array = faction_state.get("aiPlayers", []) as Array
	for player_variant in ai_players:
		if not (player_variant is Dictionary):
			continue
		var player := player_variant as Dictionary
		if normalized_id != "" and str(player.get("id", player.get("aiPlayerId", ""))).strip_edges() != normalized_id:
			continue
		return player.duplicate(true)
	return {}

func _collect_battle_report_ai_execution_trace_items(ai_player_id: String, raw_report: Dictionary, raw_record: Dictionary, runtime_context: Dictionary) -> Array:
	var result: Array = []
	var runtime_trace_sources := [
		runtime_context.get("playerRuntimeExecutionTraceItems", []),
		runtime_context.get("ai_execution_trace_items", []),
		runtime_context.get("aiExecutionTraceItems", []),
	]
	var runtime_read_model_variant: Variant = runtime_context.get("playerRuntimeExecutionTraceReadModel", {})
	if runtime_read_model_variant is Dictionary:
		runtime_trace_sources.append((runtime_read_model_variant as Dictionary).get("items", []))
	runtime_trace_sources.append(raw_report.get("executionTraceItems", []))
	runtime_trace_sources.append(raw_record.get("executionTraceItems", []))
	for source_variant in runtime_trace_sources:
		if not (source_variant is Array):
			continue
		for trace_variant in source_variant as Array:
			if not (trace_variant is Dictionary):
				continue
			var trace := trace_variant as Dictionary
			var trace_ai_player_id := str(trace.get("aiPlayerId", trace.get("ai_player_id", ""))).strip_edges()
			if ai_player_id.strip_edges() != "" and trace_ai_player_id != "" and trace_ai_player_id != ai_player_id.strip_edges():
				continue
			result.append(trace.duplicate(true))
	if result.is_empty():
		result.append({
			"aiPlayerId": ai_player_id,
			"phase": "completed",
			"title": _first_non_empty([raw_report.get("title", ""), raw_record.get("title", ""), "AI战斗回报"]),
			"summary": _first_non_empty([raw_report.get("summary", ""), raw_record.get("summary", ""), raw_report.get("result", ""), raw_record.get("result", "")]),
		})
	return result


func _collect_battle_report_ai_execution_trace_ids(trace_items: Array, trace_id_keys: Array) -> Array:
	var result: Array[String] = []
	for trace_variant in trace_items:
		if not (trace_variant is Dictionary):
			continue
		var trace := trace_variant as Dictionary
		var trace_id := ""
		for key_variant in trace_id_keys:
			trace_id = str(trace.get(str(key_variant), "")).strip_edges()
			if trace_id != "":
				break
		if trace_id != "" and not result.has(trace_id):
			result.append(trace_id)
	return result


func _build_battlefield_lines(location_label: String, time_label: String, raw_report: Dictionary, raw_record: Dictionary) -> Array:
	var lines: Array[String] = [
		"地点：%s" % location_label,
		"时间：%s" % time_label,
	]
	var tile_x := _first_non_empty([
		raw_record.get("tileX", ""),
		raw_report.get("tileX", ""),
		raw_record.get("x", ""),
		raw_report.get("x", ""),
	])
	var tile_y := _first_non_empty([
		raw_record.get("tileY", ""),
		raw_report.get("tileY", ""),
		raw_record.get("y", ""),
		raw_report.get("y", ""),
	])
	tile_x = _normalize_numeric_label(tile_x)
	tile_y = _normalize_numeric_label(tile_y)
	if tile_x != "" and tile_y != "":
		lines.append("坐标：(%s,%s)" % [tile_x, tile_y])
		return lines
	var tile_id := _first_non_empty([
		raw_record.get("tileId", ""),
		raw_report.get("tileId", ""),
		raw_report.get("targetTileId", ""),
	])
	if tile_id != "":
		lines.append("地块：%s" % tile_id)
	return lines

func _build_battlefield_meta_rows(location_label: String, time_label: String, raw_report: Dictionary, raw_record: Dictionary) -> Array:
	var rows: Array = [
		{
			"label": "地点",
			"value": location_label,
			"role": "location",
		},
		{
			"label": "时间",
			"value": time_label,
			"role": "time",
		},
	]
	var tile_x := _normalize_numeric_label(_first_non_empty([
		raw_record.get("tileX", ""),
		raw_report.get("tileX", ""),
		raw_record.get("x", ""),
		raw_report.get("x", ""),
	]))
	var tile_y := _normalize_numeric_label(_first_non_empty([
		raw_record.get("tileY", ""),
		raw_report.get("tileY", ""),
		raw_record.get("y", ""),
		raw_report.get("y", ""),
	]))
	if tile_x != "" and tile_y != "":
		var coordinate := {
			"x": int(tile_x),
			"y": int(tile_y),
			"coordinate_space": "cell_1km",
			"source": "battle_report_detail",
		}
		rows.append({
			"label": "坐标",
			"value": "(%s,%s)" % [tile_x, tile_y],
			"role": "coordinate",
			"coordinate": coordinate,
			"action": {
				"id": "jump_coordinate",
				"label": "跳转",
			},
		})
		return rows
	var tile_id := _first_non_empty([
		raw_record.get("tileId", ""),
		raw_report.get("tileId", ""),
		raw_report.get("targetTileId", ""),
	])
	if tile_id != "":
		rows.append({
			"label": "地块",
			"value": tile_id,
			"role": "tile",
		})
	return rows

func _build_battle_loss_lines(
	attacker_current: int,
	attacker_max: int,
	defender_current: int,
	defender_max: int,
	raw_report: Dictionary,
	raw_record: Dictionary
) -> Array:
	var attacker_loss := _resolve_troop_loss(raw_record, raw_report, "attacker", attacker_current, attacker_max)
	var defender_loss := _resolve_troop_loss(raw_record, raw_report, "defender", defender_current, defender_max)
	return [
		"我方兵力：%s / %s（损失 %s）" % [str(attacker_current), str(attacker_max), str(attacker_loss)],
		"敌方兵力：%s / %s（损失 %s）" % [str(defender_current), str(defender_max), str(defender_loss)],
	]

func _build_battle_stats_grid_block(
	attacker_current: int,
	attacker_max: int,
	defender_current: int,
	defender_max: int,
	raw_report: Dictionary,
	raw_record: Dictionary
) -> Dictionary:
	var attacker_loss := _resolve_troop_loss(raw_record, raw_report, "attacker", attacker_current, attacker_max)
	var defender_loss := _resolve_troop_loss(raw_record, raw_report, "defender", defender_current, defender_max)
	var result_text := _normalize_result_text(_first_non_empty([
		raw_record.get("result", ""),
		raw_report.get("result", ""),
		raw_record.get("outcome", ""),
		raw_report.get("outcome", ""),
	]))
	var allied_support := _first_non_empty([
		raw_record.get("alliedSupport", ""),
		raw_report.get("alliedSupport", ""),
		"0",
	])
	return {
		"kind": "stats_grid",
		"title": "战况统计",
		"accent_key": "stats",
		"node_name": "SOM_D07_StatsGrid",
		"metrics": [
			{"label": "我方兵力", "value": "%s/%s" % [str(attacker_current), str(attacker_max)], "delta": "损失 %s" % str(attacker_loss), "tone": "attacker"},
			{"label": "敌方兵力", "value": "%s/%s" % [str(defender_current), str(defender_max)], "delta": "损失 %s" % str(defender_loss), "tone": "defender"},
			{"label": "战斗结果", "value": result_text, "delta": _first_non_empty([raw_record.get("reportKind", ""), raw_report.get("reportKind", ""), "battle"]), "tone": "result"},
			{"label": "同盟支援", "value": allied_support, "delta": "战场支援值", "tone": "support"},
		],
	}

func _build_battle_summary_lines(raw_report: Dictionary, raw_record: Dictionary) -> Array:
	var summary := _first_non_empty([
		raw_record.get("summary", ""),
		raw_report.get("summary", ""),
		raw_report.get("detail", ""),
		"暂无战报摘要。",
	])
	var lines: Array[String] = [summary]
	var allied_support := _first_non_empty([
		raw_record.get("alliedSupport", ""),
		raw_report.get("alliedSupport", ""),
	])
	if allied_support != "":
		lines.append("同盟支援：%s" % allied_support)
	return lines

func _build_round_timeline_block(raw_report: Dictionary, raw_record: Dictionary) -> Dictionary:
	return {
		"kind": "round_timeline",
		"title": "战法回合",
		"accent_key": "rounds",
		"node_name": "SOM_D07_RoundTimeline",
		"rounds": _build_round_detail_payloads(raw_report, raw_record),
	}

func _build_round_detail_payloads(raw_report: Dictionary, raw_record: Dictionary) -> Array:
	var rounds_variant: Variant = raw_record.get("rounds", raw_report.get("rounds", []))
	var rounds: Array = rounds_variant as Array if rounds_variant is Array else []
	var payloads: Array = []
	for index in range(mini(rounds.size(), 4)):
		var round_variant: Variant = rounds[index]
		if not (round_variant is Dictionary):
			continue
		var round := round_variant as Dictionary
		var event_rows: Array = []
		var summary := str(round.get("summary", "")).strip_edges()
		var events_variant: Variant = round.get("events", [])
		var events: Array = events_variant as Array if events_variant is Array else []
		for event_index in range(mini(events.size(), 5)):
			var event_variant: Variant = events[event_index]
			if not (event_variant is Dictionary):
				continue
			var event := event_variant as Dictionary
			event_rows.append({
				"actor": str(event.get("actor", "system")),
				"actor_label": _battle_event_actor_label(str(event.get("actor", "system"))),
				"skill_name": str(event.get("skillName", "")).strip_edges(),
				"summary": str(event.get("summary", "")).strip_edges(),
				"damage": _resolve_numeric([event.get("damage", null)]),
				"healing": _resolve_numeric([event.get("healing", null)]),
				"prevented_damage": _resolve_numeric([event.get("preventedDamage", null)]),
			})
		var round_number := str(round.get("round", index + 1))
		var title := _first_non_empty([
			round.get("title", ""),
			"第%s回合" % round_number,
		])
		payloads.append({
			"round": round_number,
			"title": title,
			"summary": summary,
			"events": event_rows,
		})
	if payloads.is_empty():
		payloads.append({
			"round": "1",
			"title": "第1回合",
			"summary": "暂无战法回合明细。",
			"events": [],
		})
	return payloads

func _battle_event_actor_label(actor: String) -> String:
	var normalized := actor.strip_edges()
	if normalized == "attacker":
		return "我方"
	if normalized == "defender":
		return "敌方"
	return "系统"

func _build_compact_heroes(is_defender: bool, raw_report: Dictionary = {}, raw_record: Dictionary = {}) -> Array:
	if is_defender:
		return _build_guard_heroes(raw_report, raw_record)
	return _build_attacker_heroes(raw_report, raw_record)


func _build_attacker_heroes(raw_report: Dictionary, raw_record: Dictionary) -> Array:
	var role_order := ATTACKER_ROLE_ORDER
	var primary_unit_id := _first_non_empty([
		raw_record.get("attackerUnitId", ""),
		raw_report.get("attackerUnitId", ""),
		raw_report.get("unitId", ""),
	])
	var units := _resolve_attacker_units(primary_unit_id)
	var read_model_heroes := _build_read_model_heroes(
		raw_record,
		"attackerUnits",
		"attackerUnit",
		"attackerHeroSlot",
		role_order,
		false,
		units
	)
	var heroes: Array = []
	for slot_index in range(role_order.size()):
		if slot_index < read_model_heroes.size() and read_model_heroes[slot_index] is Dictionary:
			heroes.append(read_model_heroes[slot_index])
			continue
		if slot_index < units.size() and units[slot_index] is Dictionary:
			heroes.append(_build_unit_hero_slot(units[slot_index] as Dictionary, str(role_order[slot_index]), slot_index))
			continue
		heroes.append(_build_placeholder_hero_slot(str(role_order[slot_index]), slot_index))
	return heroes


func _build_guard_heroes(raw_report: Dictionary, raw_record: Dictionary) -> Array:
	var role_order := DEFENDER_ROLE_ORDER
	var guard_units := _resolve_report_guard_units(raw_report, raw_record)
	var read_model_heroes := _build_read_model_heroes(
		raw_record,
		"defenderUnits",
		"defenderUnit",
		"defenderHeroSlot",
		role_order,
		true,
		guard_units
	)
	var heroes: Array = []
	for slot_index in range(role_order.size()):
		if slot_index < read_model_heroes.size() and read_model_heroes[slot_index] is Dictionary:
			heroes.append(read_model_heroes[slot_index])
			continue
		if slot_index < guard_units.size() and guard_units[slot_index] is Dictionary:
			heroes.append(_build_guard_hero_slot(guard_units[slot_index] as Dictionary, str(role_order[slot_index]), slot_index))
			continue
		heroes.append(_build_fallback_guard_slot(str(role_order[slot_index]), slot_index))
	return heroes


func _resolve_attacker_units(primary_unit_id: String) -> Array:
	var units: Array = _world_data.get("units", []) as Array
	var primary_unit: Dictionary = {}
	var resolved_faction_id := _target_faction_id
	if primary_unit_id.strip_edges() != "":
		for unit_variant in units:
			if not (unit_variant is Dictionary):
				continue
			var unit := unit_variant as Dictionary
			if str(unit.get("id", "")).strip_edges() != primary_unit_id.strip_edges():
				continue
			primary_unit = unit
			resolved_faction_id = str(unit.get("faction", resolved_faction_id)).strip_edges()
			break
	var result: Array = []
	if not primary_unit.is_empty():
		result.append(primary_unit)
	for unit_variant in units:
		if not (unit_variant is Dictionary):
			continue
		var unit := unit_variant as Dictionary
		if not primary_unit.is_empty() and str(unit.get("id", "")).strip_edges() == str(primary_unit.get("id", "")).strip_edges():
			continue
		var faction := str(unit.get("faction", "")).strip_edges()
		if faction == "system_guard":
			continue
		if resolved_faction_id != "" and faction != resolved_faction_id:
			continue
		result.append(unit)
		if result.size() >= ATTACKER_ROLE_ORDER.size():
			return result
	if result.is_empty():
		for unit_variant in units:
			if not (unit_variant is Dictionary):
				continue
			var fallback_unit := unit_variant as Dictionary
			if str(fallback_unit.get("faction", "")).strip_edges() == "system_guard":
				continue
			result.append(fallback_unit)
			if result.size() >= ATTACKER_ROLE_ORDER.size():
				break
	return result


func _resolve_report_guard_units(raw_report: Dictionary, raw_record: Dictionary) -> Array:
	var tile_id := _first_non_empty([
		raw_record.get("tileId", ""),
		raw_report.get("tileId", ""),
		raw_report.get("targetTileId", ""),
	])
	var guard := _resolve_resource_guard_for_tile(tile_id)
	if guard.is_empty():
		guard = _resolve_first_resource_guard()
	var units_variant: Variant = guard.get("units", [])
	if units_variant is Array and not (units_variant as Array).is_empty():
		return units_variant as Array
	return []


func _resolve_resource_guard_for_tile(tile_id: String) -> Dictionary:
	var normalized_tile_id := tile_id.strip_edges()
	if normalized_tile_id == "":
		return {}
	var tiles: Array = _map_layout_data.get("tiles", []) as Array
	for tile_variant in tiles:
		if not (tile_variant is Dictionary):
			continue
		var tile := tile_variant as Dictionary
		if str(tile.get("id", "")).strip_edges() != normalized_tile_id:
			continue
		var guard_variant: Variant = tile.get("resourceGuard", {})
		return guard_variant as Dictionary if guard_variant is Dictionary else {}
	return {}


func _resolve_first_resource_guard() -> Dictionary:
	var tiles: Array = _map_layout_data.get("tiles", []) as Array
	for tile_variant in tiles:
		if not (tile_variant is Dictionary):
			continue
		var tile := tile_variant as Dictionary
		var guard_variant: Variant = tile.get("resourceGuard", {})
		if guard_variant is Dictionary and not (guard_variant as Dictionary).is_empty():
			return guard_variant as Dictionary
	return {}


func _build_read_model_heroes(
	raw_record: Dictionary,
	units_key: String,
	unit_key: String,
	hero_slot_key: String,
	role_order: Array,
	is_defender: bool,
	fallback_units: Array
) -> Array:
	var read_model_units := _extract_read_model_units(raw_record, units_key, unit_key, hero_slot_key)
	_apply_record_troop_snapshot_fallback(read_model_units, raw_record, "defender" if is_defender else "attacker")
	var heroes: Array = []
	for slot_index in range(mini(read_model_units.size(), role_order.size())):
		if not (read_model_units[slot_index] is Dictionary):
			continue
		var fallback_unit: Dictionary = {}
		if slot_index < fallback_units.size() and fallback_units[slot_index] is Dictionary:
			fallback_unit = fallback_units[slot_index] as Dictionary
		heroes.append(_build_read_model_hero_slot(
			read_model_units[slot_index] as Dictionary,
			str(role_order[slot_index]),
			slot_index,
			is_defender,
			fallback_unit
		))
	return heroes


func _apply_record_troop_snapshot_fallback(read_model_units: Array, raw_record: Dictionary, side: String) -> void:
	if read_model_units.is_empty():
		return
	var current_total := _resolve_numeric([
		raw_record.get("%sTroops" % side, null),
		raw_record.get("%sCurrentTroops" % side, null),
		raw_record.get("%sPower" % side, null),
	])
	var max_total := maxi(current_total, _resolve_numeric([
		raw_record.get("%sMaxTroops" % side, null),
		raw_record.get("%sMaxPower" % side, null),
	]))
	var loss_total := _resolve_troop_loss(raw_record, {}, side, current_total, max_total)
	if current_total <= 0 and max_total <= 0 and loss_total <= 0:
		return
	var slot_count := mini(read_model_units.size(), ATTACKER_ROLE_ORDER.size() if side == "attacker" else DEFENDER_ROLE_ORDER.size())
	if slot_count <= 0:
		return
	var current_slots := _split_non_negative_integer(current_total, slot_count)
	var max_slots := _split_non_negative_integer(max_total, slot_count)
	var loss_slots := _split_non_negative_integer(loss_total, slot_count)
	for index in range(slot_count):
		if not (read_model_units[index] is Dictionary):
			continue
		var unit := read_model_units[index] as Dictionary
		_apply_slot_troop_snapshot_if_missing(unit, current_slots[index], max_slots[index], loss_slots[index])


func _apply_slot_troop_snapshot_if_missing(unit: Dictionary, current_value: int, max_value: int, loss_value: int) -> void:
	if _resolve_numeric([unit.get("currentTroops", null), unit.get("troopCurrent", null)]) <= 0 and current_value > 0:
		unit["currentTroops"] = current_value
	if _resolve_numeric([unit.get("maxTroops", null), unit.get("troopMax", null)]) <= 0 and max_value > 0:
		unit["maxTroops"] = max_value
	if _resolve_numeric([unit.get("lossTroops", null), unit.get("troopLoss", null)]) <= 0 and loss_value > 0:
		unit["lossTroops"] = loss_value
	var hero_variant: Variant = unit.get("hero", {})
	if not (hero_variant is Dictionary):
		return
	var hero := hero_variant as Dictionary
	if _resolve_numeric([hero.get("currentTroops", null), hero.get("troopCurrent", null)]) <= 0 and current_value > 0:
		hero["currentTroops"] = current_value
	if _resolve_numeric([hero.get("maxTroops", null), hero.get("troopMax", null)]) <= 0 and max_value > 0:
		hero["maxTroops"] = max_value
	if _resolve_numeric([hero.get("lossTroops", null), hero.get("troopLoss", null)]) <= 0 and loss_value > 0:
		hero["lossTroops"] = loss_value


func _split_non_negative_integer(total_value: int, slot_count: int) -> Array:
	var result: Array = []
	if slot_count <= 0:
		return result
	var base := int(total_value / slot_count)
	var remainder := total_value % slot_count
	for index in range(slot_count):
		result.append(base + (1 if index < remainder else 0))
	return result


func _extract_read_model_units(raw_record: Dictionary, units_key: String, unit_key: String, hero_slot_key: String) -> Array:
	var result: Array = []
	var units_variant: Variant = raw_record.get(units_key, [])
	if units_variant is Array:
		for unit_variant in (units_variant as Array):
			if unit_variant is Dictionary:
				_append_read_model_unit_slots(result, unit_variant as Dictionary)
	var unit_variant: Variant = raw_record.get(unit_key, {})
	if result.is_empty() and unit_variant is Dictionary and not (unit_variant as Dictionary).is_empty():
		_append_read_model_unit_slots(result, unit_variant as Dictionary)
	var hero_slot_variant: Variant = raw_record.get(hero_slot_key, {})
	if result.is_empty() and hero_slot_variant is Dictionary and not (hero_slot_variant as Dictionary).is_empty():
		result.append({"hero": hero_slot_variant})
	return result


func _append_read_model_unit_slots(result: Array, unit_read_model: Dictionary) -> void:
	result.append(unit_read_model)
	var co_heroes_variant: Variant = unit_read_model.get("coHeroes", [])
	if not (co_heroes_variant is Array):
		return
	for co_hero_variant in (co_heroes_variant as Array):
		if not (co_hero_variant is Dictionary):
			continue
		var co_hero := co_hero_variant as Dictionary
		result.append({
			"unitId": str(unit_read_model.get("unitId", "")),
			"name": str(unit_read_model.get("name", "")),
			"strength": unit_read_model.get("strength", null),
			"troops": unit_read_model.get("troops", null),
			"currentTroops": unit_read_model.get("currentTroops", null),
			"maxTroops": unit_read_model.get("maxTroops", null),
			"lossTroops": unit_read_model.get("lossTroops", null),
			"hero": co_hero,
		})


func _build_read_model_hero_slot(
	unit_read_model: Dictionary,
	role_label: String,
	slot_index: int,
	is_defender: bool,
	fallback_unit: Dictionary
) -> Dictionary:
	var hero_variant: Variant = unit_read_model.get("hero", {})
	var hero: Dictionary = hero_variant as Dictionary if hero_variant is Dictionary else {}
	if hero.is_empty():
		hero = unit_read_model
	var hero_id := _first_non_empty([hero.get("heroId", ""), hero.get("id", "")])
	var profile := _read_general_profile(hero_id)
	var quality := _first_non_empty([hero.get("quality", ""), profile.get("quality", "")])
	var star_count := _resolve_numeric([hero.get("starCount", null), hero.get("stars", null), profile.get("stars", null)])
	var faction_label := _first_non_empty([
		hero.get("factionLabel", ""),
		hero.get("faction", ""),
		profile.get("faction", ""),
	])
	var level := _resolve_numeric([hero.get("level", null), profile.get("level", null), 1])
	if level <= 0:
		level = 1
	var portrait_asset_key := str(hero.get("portraitAssetKey", "")).strip_edges()
	var portrait_key := str(hero.get("portraitKey", "")).strip_edges()
	var avatar_key := str(hero.get("avatarKey", "")).strip_edges()
	var asset_kind := "hero"
	if is_defender and (
		portrait_asset_key.begins_with("npc_guard.")
		or hero_id.begins_with("npc_")
		or str(fallback_unit.get("faction", "")).strip_edges() == "system_guard"
	):
		asset_kind = "npc_guard"
	var current_troops := _resolve_numeric([
		hero.get("currentTroops", null),
		hero.get("troopCurrent", null),
		hero.get("troops", null),
		unit_read_model.get("currentTroops", null),
		unit_read_model.get("troopCurrent", null),
		unit_read_model.get("troops", null),
		unit_read_model.get("strength", null),
		fallback_unit.get("currentTroops", null),
		fallback_unit.get("troopCurrent", null),
		fallback_unit.get("troops", null),
		fallback_unit.get("strength", null),
	])
	var max_troops := _resolve_numeric([
		hero.get("maxTroops", null),
		hero.get("troopMax", null),
		unit_read_model.get("maxTroops", null),
		unit_read_model.get("troopMax", null),
		fallback_unit.get("maxTroops", null),
		fallback_unit.get("troopMax", null),
	])
	var loss_troops := _resolve_numeric([
		hero.get("lossTroops", null),
		hero.get("troopLoss", null),
		hero.get("loss", null),
		unit_read_model.get("lossTroops", null),
		unit_read_model.get("troopLoss", null),
		fallback_unit.get("lossTroops", null),
		fallback_unit.get("troopLoss", null),
	])
	var troop_label := "守军" if is_defender else "兵力 --"
	if loss_troops <= 0 and max_troops > 0 and current_troops > 0 and max_troops >= current_troops:
		loss_troops = max_troops - current_troops
	if current_troops > 0 and max_troops > 0:
		troop_label = "兵力 %s/%s" % [str(current_troops), str(max_troops)]
	elif current_troops > 0:
		troop_label = "兵力 %s" % str(current_troops)
	var skill_label := _first_non_empty([
		hero.get("mainSkillName", ""),
		hero.get("signatureSkillName", ""),
		unit_read_model.get("mainSkillName", ""),
		fallback_unit.get("mainSkillName", ""),
		"战法位" if is_defender else "伤兵 / 增益位",
	])
	var level_label := "Lv.%s" % str(level)
	if loss_troops > 0:
		level_label = "损失 %s | %s" % [str(loss_troops), level_label]
	var fallback_name := "守军%s" % str(slot_index + 1) if is_defender else "我方武将位%s" % str(slot_index + 1)
	var asset_ref := UI_COMPONENT_FACTORY.battle_report_portrait_asset_ref(
		asset_kind,
		hero_id,
		portrait_asset_key,
		portrait_key,
		avatar_key,
		str(unit_read_model.get("assetKey", fallback_unit.get("assetKey", ""))).strip_edges()
	)
	return {
		"role_label": role_label,
		"name": _first_non_empty([hero.get("name", ""), profile.get("name", ""), unit_read_model.get("name", ""), fallback_name]),
		"star_label": "★".repeat(clampi(star_count, 1, 5)) if star_count > 0 else _resolve_profile_star_label(profile, quality),
		"star_count": star_count,
		"level_label": level_label,
		"faction_label": faction_label,
		"quality_label": quality,
		"troop_label": troop_label,
		"delta_label": skill_label,
		"asset_ref": asset_ref,
	}


func _build_unit_hero_slot(unit: Dictionary, role_label: String, slot_index: int) -> Dictionary:
	var hero_variant: Variant = unit.get("hero", {})
	var hero: Dictionary = hero_variant as Dictionary if hero_variant is Dictionary else {}
	var hero_id := str(hero.get("id", "")).strip_edges()
	var profile := _read_general_profile(hero_id)
	var hero_name := _first_non_empty([profile.get("name", ""), hero.get("name", ""), unit.get("name", ""), "我方武将位%s" % str(slot_index + 1)])
	var quality := _first_non_empty([profile.get("quality", ""), hero.get("quality", "")])
	var level := int(hero.get("level", profile.get("level", 1)))
	var faction_label := _first_non_empty([profile.get("faction", ""), hero.get("faction", "")])
	var asset_ref := UI_COMPONENT_FACTORY.battle_report_portrait_asset_ref(
		"hero",
		hero_id,
		str(hero.get("portraitAssetKey", "")).strip_edges(),
		str(hero.get("portraitKey", "")).strip_edges(),
		str(hero.get("avatarKey", "")).strip_edges()
	)
	return {
		"role_label": role_label,
		"name": hero_name,
		"star_label": _resolve_profile_star_label(profile, quality),
		"level_label": "Lv.%s" % str(level),
		"faction_label": faction_label,
		"quality_label": quality,
		"troop_label": "兵力 %s" % str(int(unit.get("strength", 0)) * 100),
		"delta_label": str(hero.get("signatureSkill", {}).get("name", "伤兵 / 增益位")) if hero.get("signatureSkill", {}) is Dictionary else "伤兵 / 增益位",
		"asset_ref": asset_ref,
	}


func _build_guard_hero_slot(unit: Dictionary, role_label: String, slot_index: int) -> Dictionary:
	var asset_ref := UI_COMPONENT_FACTORY.battle_report_portrait_asset_ref(
		"npc_guard",
		"",
		str(unit.get("portraitAssetKey", "")).strip_edges(),
		"",
		"",
		str(unit.get("assetKey", "")).strip_edges()
	)
	return {
		"role_label": role_label,
		"name": str(unit.get("name", "守军%s" % str(slot_index + 1))).strip_edges(),
		"star_label": _resolve_unit_star_label(unit),
		"level_label": "Lv.%s" % str(int(unit.get("level", 1))),
		"troop_label": "守军",
		"delta_label": str(unit.get("mainSkillName", unit.get("fixedSkillSummary", "战法位"))).strip_edges(),
		"asset_ref": asset_ref,
	}


func _build_placeholder_hero_slot(role_label: String, slot_index: int) -> Dictionary:
	return {
		"role_label": role_label,
		"name": "我方武将位%s" % str(slot_index + 1),
		"star_label": "",
		"level_label": "Lv.%s" % str(43 - slot_index),
		"troop_label": "兵力 %s" % str(8500 - slot_index * 500),
		"delta_label": "伤兵 / 增益位",
	}


func _build_fallback_guard_slot(role_label: String, slot_index: int) -> Dictionary:
	var fallback_units := [
		{"name": "黄巾小卒", "assetKey": "npc_guard_yellow_turban_recruit", "portraitAssetKey": "npc_guard.portrait.npc_guard_yellow_turban_recruit.v2", "level": 2, "mainSkillName": "乱兵挥砍"},
		{"name": "黄巾枪卒", "assetKey": "npc_guard_yellow_turban_spearman", "portraitAssetKey": "npc_guard.portrait.npc_guard_yellow_turban_spearman.v2", "level": 3, "mainSkillName": "枪阵压制"},
		{"name": "流寇斥候", "assetKey": "npc_guard_bandit_scout", "portraitAssetKey": "npc_guard.portrait.npc_guard_bandit_scout.v2", "level": 4, "mainSkillName": "斥候袭扰"},
	]
	return _build_guard_hero_slot(fallback_units[clampi(slot_index, 0, fallback_units.size() - 1)], role_label, slot_index)


func _resolve_star_label(quality_value: Variant) -> String:
	var quality := str(quality_value).strip_edges()
	if quality.begins_with("5"):
		return "★★★★★"
	if quality.begins_with("4"):
		return "★★★★"
	if quality.begins_with("3"):
		return "★★★"
	return ""

func _resolve_profile_star_label(profile: Dictionary, quality_value: Variant) -> String:
	var star_text := str(profile.get("star_text", "")).strip_edges()
	if star_text != "":
		return star_text
	var stars := clampi(int(profile.get("stars", 0)), 0, 5)
	if stars > 0:
		return "★".repeat(stars)
	return _resolve_star_label(quality_value)

func _resolve_unit_star_label(unit: Dictionary) -> String:
	var stars := _resolve_numeric([
		unit.get("starCount", null),
		unit.get("star_count", null),
		unit.get("stars", null),
		unit.get("star", null),
		unit.get("starLevel", null),
	])
	if stars > 0:
		return "★".repeat(clampi(stars, 1, 5))
	return _resolve_star_label(_first_non_empty([unit.get("quality", ""), unit.get("rarity", "")]))

func _read_general_profile(raw_hero_id: String) -> Dictionary:
	_ensure_general_profiles_loaded()
	var hero_id := _normalize_hero_id(raw_hero_id)
	if hero_id != "" and _general_profiles_by_id.has(hero_id):
		var profile_variant: Variant = _general_profiles_by_id.get(hero_id, {})
		return profile_variant as Dictionary if profile_variant is Dictionary else {}
	return {}

func _ensure_general_profiles_loaded() -> void:
	if _general_profiles_loaded:
		return
	_general_profiles_loaded = true
	_general_profiles_by_id.clear()
	if not FileAccess.file_exists(GENERAL_PROFILE_PREVIEW_DATA_PATH):
		return
	var file := FileAccess.open(GENERAL_PROFILE_PREVIEW_DATA_PATH, FileAccess.READ)
	if file == null:
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not (parsed is Dictionary):
		return
	var profiles_variant: Variant = (parsed as Dictionary).get("hero_profiles", {})
	if not (profiles_variant is Dictionary):
		return
	for key_variant in (profiles_variant as Dictionary).keys():
		var profile_variant: Variant = (profiles_variant as Dictionary).get(key_variant, {})
		if not (profile_variant is Dictionary):
			continue
		var hero_id := _normalize_hero_id(str(key_variant))
		if hero_id != "":
			_general_profiles_by_id[hero_id] = (profile_variant as Dictionary).duplicate(true)

func _normalize_hero_id(raw_value: String) -> String:
	var value := raw_value.strip_edges()
	var digits := ""
	for index in range(value.length()):
		var character := value.substr(index, 1)
		if character.is_valid_int():
			digits += character
	if digits != "":
		return digits
	return value

func _build_detail_slots(hero_list: Array, role_order: Array, is_defender: bool) -> Array:
	var slots: Array = []
	for index in range(mini(hero_list.size(), role_order.size())):
		var hero: Dictionary = hero_list[index] as Dictionary
		var asset_ref: Dictionary = {}
		var raw_asset_ref: Variant = hero.get("asset_ref", hero.get("assetRef", {}))
		if raw_asset_ref is Dictionary and not (raw_asset_ref as Dictionary).is_empty():
			asset_ref = (raw_asset_ref as Dictionary).duplicate(true)
		else:
			asset_ref = UI_COMPONENT_FACTORY.battle_report_portrait_asset_ref(
				str(hero.get("assetKind", "")).strip_edges(),
				str(hero.get("heroId", "")).strip_edges(),
				str(hero.get("portraitAssetKey", "")).strip_edges(),
				str(hero.get("portraitKey", "")).strip_edges(),
				str(hero.get("avatarKey", "")).strip_edges(),
				str(hero.get("assetKey", "")).strip_edges()
			)
		slots.append({
			"role_label": str(role_order[index]),
			"name": str(hero.get("name", "武将位")),
			"star_label": str(hero.get("star_label", "")),
			"troop_label": str(hero.get("troop_label", "兵力 --")),
			"delta_label": str(hero.get("delta_label", "损兵：--")),
			"level_label": str(hero.get("level_label", "Lv.--")),
			"faction_label": str(hero.get("faction_label", "")),
			"quality_label": str(hero.get("quality_label", "")),
			"asset_ref": asset_ref,
		})
	return slots

func _normalize_result_text(raw_value: String) -> String:
	var normalized := raw_value.strip_edges()
	var lower := normalized.to_lower()
	if normalized.find("胜") != -1:
		return "胜"
	if normalized.find("败") != -1:
		return "败"
	if normalized.find("平") != -1:
		return "平"
	if lower == "win" or lower == "attacker_win" or lower == "victory":
		return "胜"
	if lower == "loss" or lower == "defeat" or lower == "defender_win":
		return "败"
	if lower == "draw":
		return "平"
	return "未结"

func _format_tick_label(raw_value: String) -> String:
	var normalized := raw_value.strip_edges()
	if normalized == "":
		return ""
	if normalized.is_valid_int():
		return "第 %s 回合" % normalized
	return normalized

func _resolve_numeric(candidates: Array) -> int:
	for candidate in candidates:
		if candidate == null:
			continue
		if candidate is int:
			return maxi(0, int(candidate))
		if candidate is float:
			return maxi(0, int(round(float(candidate))))
		var text: String = str(candidate).strip_edges()
		if text.is_valid_int():
			return maxi(0, int(text))
	return 0

func _resolve_troop_loss(raw_record: Dictionary, raw_report: Dictionary, side: String, current_value: int, max_value: int) -> int:
	var explicit_loss := _resolve_numeric([
		raw_record.get("%sLoss" % side, null),
		raw_record.get("%sTroopLoss" % side, null),
		raw_record.get("%sTroopsLost" % side, null),
		raw_record.get("%sCasualties" % side, null),
		raw_report.get("%sLoss" % side, null),
		raw_report.get("%sTroopLoss" % side, null),
		raw_report.get("%sTroopsLost" % side, null),
		raw_report.get("%sCasualties" % side, null),
	])
	if explicit_loss > 0:
		return explicit_loss
	var nested_loss := _resolve_nested_troop_loss(raw_record, side)
	if nested_loss > 0:
		return nested_loss
	nested_loss = _resolve_nested_troop_loss(raw_report, side)
	if nested_loss > 0:
		return nested_loss
	if max_value > 0 and current_value >= 0 and max_value >= current_value:
		return max_value - current_value
	return 0

func _resolve_nested_troop_loss(payload: Dictionary, side: String) -> int:
	for key in ["losses", "troopLosses", "casualties"]:
		var value: Variant = payload.get(key, {})
		if value is Dictionary:
			var loss_dict := value as Dictionary
			var resolved := _resolve_numeric([
				loss_dict.get(side, null),
				loss_dict.get("%sLoss" % side, null),
				loss_dict.get("%sTroops" % side, null),
			])
			if resolved > 0:
				return resolved
	return 0

func _resolve_faction_label() -> String:
	var faction_state: Dictionary = _read_target_faction_state()
	return _first_non_empty([
		faction_state.get("factionName", ""),
		faction_state.get("name", ""),
		_target_faction_id,
		"风华",
	])

func _normalize_numeric_label(text: String) -> String:
	var normalized := text.strip_edges()
	if normalized.ends_with(".0"):
		var whole := normalized.substr(0, normalized.length() - 2)
		if whole.is_valid_int():
			return whole
	return normalized

func _read_target_faction_state() -> Dictionary:
	var raw_factions: Variant = _world_data.get("factions", {})
	if raw_factions is Dictionary and _target_faction_id != "":
		var faction_state: Variant = (raw_factions as Dictionary).get(_target_faction_id, {})
		if faction_state is Dictionary:
			return faction_state as Dictionary
	return {}

func _first_non_empty(candidates: Array) -> String:
	for candidate in candidates:
		var text: String = str(candidate).strip_edges()
		if text != "":
			return text
	return ""
