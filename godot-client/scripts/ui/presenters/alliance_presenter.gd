extends RefCounted
class_name AlliancePresenter

var _world_data: Dictionary = {}
var _map_layout_data: Dictionary = {}
var _target_faction_id: String = ""

const DIRECTIVE_ACTION_STANCE_ORDER := ["hold", "support", "harass", "expand"]
const DIRECTIVE_ACTION_LIMIT := 3
const ORGANIZATION_BATTLE_REPORT_SOURCE_FILTER_MODE := "organization_battle_report_source_filter_v1"
const NATION_MIDGAME_FRONTEND_SKELETON_CONTRACT := "nation_midgame_frontend_skeleton_v1"
const NATION_MIDGAME_PLAYER_UI_COPY_CONTRACT := "nation_midgame_player_ui_copy_v1"
const ORGANIZATION_EMPTY_STATE_PLAYER_COPY_CONTRACT := "organization_empty_state_player_copy_v1"

func configure(world_data: Dictionary, map_layout_data: Dictionary, target_faction_id: String) -> void:
	_world_data = world_data
	_map_layout_data = map_layout_data
	_target_faction_id = target_faction_id.strip_edges()

func build_snapshot(runtime_context: Dictionary = {}) -> Dictionary:
	var alliance_data: Dictionary = _world_data.get("alliance", {}) as Dictionary
	var feedback: Dictionary = _world_data.get("feedback", {}) as Dictionary
	var history: Dictionary = _world_data.get("history", {}) as Dictionary
	var executions: Dictionary = _world_data.get("executions", {}) as Dictionary
	var faction_state: Dictionary = _read_target_faction_state()
	var city_clusters: Array = _read_city_clusters()
	var owned_clusters: Array = _collect_owned_city_clusters(city_clusters)
	var directives_by_region: Dictionary = alliance_data.get("directives", {}) as Dictionary
	var directives: Array = _collect_directive_dicts(directives_by_region)
	var commanders: Array = alliance_data.get("commanders", []) as Array
	var alliance_actions: Array = feedback.get("allianceActions", []) as Array
	var battle_records: Array = feedback.get("battleRecords", []) as Array
	var diplomacy_agreements: Array = feedback.get("diplomacyAgreements", []) as Array
	var reports: Array = _world_data.get("reports", []) as Array
	var execution_replays: Array = history.get("executionReplays", []) as Array
	var player_execution: Dictionary = executions.get(_target_faction_id, {}) as Dictionary
	if player_execution.is_empty():
		player_execution = executions.get("player", {}) as Dictionary
	var player_orders: Array = player_execution.get("orders", []) as Array
	var ai_players: Array = faction_state.get("aiPlayers", []) as Array
	var organization_kind := _resolve_organization_kind(alliance_data, faction_state)
	var alliance_name := _resolve_organization_display_name(alliance_data, faction_state, organization_kind)
	var nation_tier := _resolve_nation_tier(faction_state, organization_kind)
	var runtime_seat_count: int = int(runtime_context.get("seat_count", 0))
	var runtime_online_count: int = int(runtime_context.get("online_seat_count", 0))
	var commander_count: int = commanders.size()
	var member_count: int = max(runtime_seat_count, commander_count + ai_players.size() + 1)
	if member_count <= 0:
		member_count = 1
	var online_count: int = runtime_online_count
	if online_count <= 0:
		online_count = mini(member_count, commander_count + 1)
	var low_support_count: int = _count_low_support_directives(directives)
	var status_counts: Dictionary = _build_order_status_counts(player_orders)
	var owned_commandery_count := _count_owned_commanderies(owned_clusters)
	var organization_level := _resolve_organization_level(alliance_data, owned_clusters)
	var lifecycle_stage := _resolve_lifecycle_stage(organization_kind, owned_commandery_count, organization_level)
	var can_found_nation := organization_kind != "nation" and _can_found_kingdom(organization_level, owned_commandery_count)
	var nation_profile_draft := _build_nation_profile_draft(faction_state, alliance_name, organization_kind, owned_clusters)
	var nation_profile_governance := _build_nation_profile_governance(faction_state)
	var nation_war_objective_model := _read_nation_war_objective_model(faction_state)
	var organization_membership_model := _read_organization_membership_model(faction_state, commanders, ai_players, organization_kind, alliance_name, nation_tier)
	var nation_midgame_skeleton := _build_nation_midgame_frontend_skeleton(
		organization_kind,
		nation_tier,
		lifecycle_stage,
		nation_war_objective_model,
		organization_membership_model
	)
	var empire_objective := _read_nation_war_objective(nation_war_objective_model, "empire_status")
	return {
		"alliance_name": alliance_name,
		"organization_kind": organization_kind,
		"organization_lifecycle_stage": lifecycle_stage,
		"organization_state_name": _resolve_state_name(faction_state, owned_clusters),
		"organization_level": organization_level,
		"organization_rank_stage": nation_tier if organization_kind == "nation" else "alliance",
		"organization_exp": _resolve_organization_exp(alliance_data, owned_clusters),
		"organization_exp_required": _resolve_organization_exp_required(alliance_data, owned_clusters),
		"organization_power": _resolve_organization_power(faction_state, owned_clusters, directives),
		"owned_commandery_count": owned_commandery_count,
		"owned_city_count": owned_clusters.size(),
		"announcement_title": "同盟公告" if organization_kind != "nation" else "国家公告",
		"announcement_body": _build_announcement_body(alliance_name, organization_kind, owned_commandery_count, directives.size()),
		"recent_log_lines": _build_recent_log_lines(alliance_actions, execution_replays, ai_players),
		"recent_report_lines": _build_recent_report_lines(reports, battle_records),
		"found_nation_visible": organization_kind != "nation",
		"found_nation_can_found": can_found_nation,
		"found_nation_requirement_lines": _build_found_nation_requirement_lines(can_found_nation, owned_commandery_count, member_count, organization_level),
		"empire_upgrade_requirement_lines": _build_empire_upgrade_requirement_lines(organization_level, owned_commandery_count),
		"nation_profile_draft": nation_profile_draft,
		"nation_profile_update_draft": nation_profile_draft.duplicate(true),
		"nation_profile_governance": nation_profile_governance,
		"nation_war_objective_read_model": nation_war_objective_model,
		"organization_membership_read_model": organization_membership_model,
		"nation_midgame_frontend_skeleton": nation_midgame_skeleton,
		"nation_midgame_frontend_contract_id": NATION_MIDGAME_FRONTEND_SKELETON_CONTRACT,
		"nation_war_objective_contract_id": str(nation_war_objective_model.get("contractId", "")),
		"nation_empire_objective_status": str(empire_objective.get("status", "")),
		"nation_empire_objective_achieved": str(empire_objective.get("status", "")) == "achieved",
		"member_count": member_count,
		"online_count": online_count,
		"territory_count": max(owned_clusters.size(), directives.size()),
		"goal_count": directives.size(),
		"commander_count": commander_count,
		"ai_player_count": ai_players.size(),
		"recent_action_count": alliance_actions.size(),
		"report_count": reports.size(),
		"battle_report_raw_world_report_count": reports.size(),
		"battle_report_raw_battle_record_count": battle_records.size(),
		"organization_battle_report_source_filter_mode": ORGANIZATION_BATTLE_REPORT_SOURCE_FILTER_MODE,
		"organization_log_count": _count_organization_log_entries(alliance_actions, execution_replays),
		"tab_summary_lines": _build_tab_summary_lines(
			member_count,
			online_count,
			owned_clusters,
			directives,
			alliance_actions,
			reports,
			execution_replays,
			low_support_count,
			status_counts
		),
		"section_payloads": _build_section_payloads(
			faction_state,
			runtime_context,
			owned_clusters,
			directives,
			commanders,
			alliance_actions,
			battle_records,
			diplomacy_agreements,
			reports,
			execution_replays,
			player_execution,
			status_counts,
			alliance_name,
			organization_level,
			nation_midgame_skeleton
		),
	}

func _build_tab_summary_lines(
	member_count: int,
	online_count: int,
	owned_clusters: Array,
	directives: Array,
	alliance_actions: Array,
	reports: Array,
	execution_replays: Array,
	low_support_count: int,
	status_counts: Dictionary
) -> Dictionary:
	return {
		"members": [
			"名册按盟主、官员、军团与普通成员分层展示。",
			"当前成员 %s，已占城池 %s，协同目标 %s。" % [str(member_count), str(owned_clusters.size()), str(directives.size())],
		],
		"applications": [
			"入盟申请位先按容量、指挥缺口和待补目标展示。",
			"低支援协同目标 %s，执行中协同单 %s。" % [str(low_support_count), str(int(status_counts.get("running", 0)))],
		],
		"battle_reports": [
			"战报页聚合组织战况、协同行动与执行回放。",
			"最近战报 %s，协同行动摘要 %s，执行回放 %s。" % [str(reports.size()), str(alliance_actions.size()), str(execution_replays.size())],
		],
		"coordination": [
			"协同目标页展示组织目标、执行单和行动反馈。",
			"目标 %s，待执行 %s，进行中 %s，已完成 %s。" % [
				str(directives.size()),
				str(int(status_counts.get("queued", 0))),
				str(int(status_counts.get("running", 0))),
				str(int(status_counts.get("completed", 0))),
			],
		],
	}

func _build_section_payloads(
	faction_state: Dictionary,
	runtime_context: Dictionary,
	owned_clusters: Array,
	directives: Array,
	commanders: Array,
	alliance_actions: Array,
	battle_records: Array,
	diplomacy_agreements: Array,
	reports: Array,
	execution_replays: Array,
	player_execution: Dictionary,
	status_counts: Dictionary,
	alliance_name: String,
	organization_level: int,
	nation_midgame_skeleton: Dictionary
) -> Dictionary:
	var capital_name: String = _resolve_home_city_name(faction_state, owned_clusters)
	var member_count: int = max(int(runtime_context.get("seat_count", 0)), commanders.size() + 1)
	var online_count: int = int(runtime_context.get("online_seat_count", 0))
	if online_count <= 0:
		online_count = mini(member_count, commanders.size() + 1)
	var commander_gap: int = maxi(0, directives.size() - commanders.size())
	var seat_gap: int = maxi(0, max(int(runtime_context.get("seat_count", 0)), member_count) - member_count)
	var low_support_count: int = _count_low_support_directives(directives)
	return {
		"overview": {
			"home": _build_overview_home_section(owned_clusters, directives, alliance_actions, reports),
		},
		"members": {
			"overview": _build_members_overview_section(capital_name, faction_state, owned_clusters, directives, commanders, member_count, online_count),
			"groups": _build_member_groups_section(commanders, member_count),
			"subordinates": _build_subordinates_section(owned_clusters),
			"officers": _build_officer_hierarchy_section(capital_name, commanders, directives, "alliance"),
			"territory": _build_territory_section(owned_clusters, directives),
			"strategy": _build_strategy_section(directives, alliance_actions),
		},
		"applications": {
			"pending": _build_applications_pending_section(
				member_count,
				online_count,
				seat_gap,
				commander_gap,
				low_support_count,
				status_counts,
				reports.size()
			),
			"review": _build_applications_review_section(status_counts, low_support_count, reports.size()),
			"history": _build_applications_history_section(alliance_actions.size(), execution_replays.size(), reports.size(), diplomacy_agreements.size()),
		},
		"governance": {
			"officers": _build_officer_hierarchy_section(capital_name, commanders, directives, _resolve_organization_kind({}, faction_state)),
			"founding": _build_founding_section(owned_clusters, member_count, faction_state, alliance_name, organization_level),
		},
		"diplomacy": {
			"relations": _build_diplomacy_section(diplomacy_agreements, runtime_context),
		},
		"battle_reports": {
			"latest": _build_organization_battle_report_section(reports, battle_records, runtime_context),
			"highlights": _build_report_highlights_section(alliance_actions, battle_records),
			"archive": _build_report_archive_section(reports, execution_replays, battle_records, diplomacy_agreements),
			"log": _build_coordination_log_section(alliance_actions, execution_replays),
		},
		"nation": {
			"midgame": _build_nation_midgame_section(nation_midgame_skeleton),
			"policy": _build_policy_tree_section(owned_clusters),
			"market": _build_nation_market_section(owned_clusters),
		},
		"coordination": {
			"board": _build_coordination_board_section(directives, status_counts),
			"progress": _build_coordination_progress_section(player_execution, status_counts, directives),
			"log": _build_coordination_log_section(alliance_actions, execution_replays),
		},
	}

func _build_members_overview_section(capital_name: String, faction_state: Dictionary, owned_clusters: Array, directives: Array, commanders: Array, member_count: int, online_count: int) -> Dictionary:
	var item_cards: Array = []
	var roster_rows: Array = []
	var covered_regions: Dictionary = {}
	var action_points := int(faction_state.get("actionPoints", 0))
	var home_tile_id := str(faction_state.get("homeTileId", faction_state.get("capitalTileId", ""))).strip_edges()
	var hero_command_variant: Variant = faction_state.get("heroCommand", {})
	if home_tile_id == "" and hero_command_variant is Dictionary:
		home_tile_id = str((hero_command_variant as Dictionary).get("homeTileId", "")).strip_edges()
	item_cards.append(_build_section_item_card(
		"玩家主控",
		capital_name,
		"盟主位 | 行令 %s" % str(action_points),
		"主控席位已进入正式同盟名册骨架。"
	))
	roster_rows.append({
		"name": "玩家主控",
		"contribution": "在盟",
		"merit": "主控",
		"power": str(int(faction_state.get("power", faction_state.get("factionPower", 0)))),
		"state": str(faction_state.get("stateName", faction_state.get("homeStateName", "青州"))),
		"coordinate": _resolve_member_home_coordinate(home_tile_id, owned_clusters),
		"tileId": home_tile_id,
		"role": "盟主",
	})
	for raw_commander in commanders:
		var commander: Dictionary = raw_commander as Dictionary
		var region_label: String = _format_region_label(str(commander.get("assignedRegionId", "")))
		var specialty_label := _format_specialty_label(str(commander.get("specialty", "")))
		var readiness_text := str(int(commander.get("readiness", 0)))
		covered_regions[region_label] = true
		item_cards.append(_build_section_item_card(
			str(commander.get("name", "同盟指挥")),
			specialty_label,
			region_label,
			"就绪 %s" % readiness_text
		))
		roster_rows.append({
			"name": str(commander.get("name", "同盟指挥")),
			"contribution": "在盟",
			"merit": specialty_label,
			"power": str(int(commander.get("readiness", 0)) * 100),
			"state": _format_region_label(str(commander.get("assignedRegionId", ""))),
			"coordinate": str(commander.get("assignedRegionId", "待分配")),
			"role": _resolve_officer_title(str(commander.get("specialty", ""))),
		})
	return {
		"summary_lines": [
			"名册汇总主控、指挥位、州郡与驻地，方便快速判断组织骨架。",
			"成员 %s / 指挥位 %s / 协同目标 %s。" % [
				str(member_count),
				str(commanders.size()),
				str(directives.size()),
			],
		],
		"item_cards": item_cards,
		"content_blocks": [
			_build_section_table_block(
				"成员名册",
				[
					_build_table_column("name", "成员", 120),
					_build_table_column("contribution", "状态", 112),
					_build_table_column("merit", "军团", 88),
					_build_table_column("power", "势力", 76),
					_build_table_column("state", "州", 72),
					_build_table_column("coordinate", "坐标", 120),
					_build_table_column("role", "身份", 92),
				],
				roster_rows,
				"OrganizationMemberRosterTableBlock"
			),
			_build_section_text_block(
				"成员关系",
				[
					"主控位负责组织中枢，指挥位按所在区域与职责展示。",
					"当前覆盖区域 %s。" % str(covered_regions.size()),
				],
				"AllianceMembersOverviewStructureBlock"
			),
		],
	}


func _build_overview_home_section(owned_clusters: Array, directives: Array, alliance_actions: Array, reports: Array) -> Dictionary:
	return {
		"summary_lines": [
			"组织首页按驻地大厅结构展示，只放身份、领地、公告和入口摘要。",
			"已占城池 %s / 协同目标 %s / 组织行动 %s / 战报 %s。" % [
				str(owned_clusters.size()),
				str(directives.size()),
				str(alliance_actions.size()),
				str(reports.size()),
			],
		],
		"item_cards": [
			_build_section_item_card("领地", "%s 城" % str(owned_clusters.size()), "首页状态", "完整领地细节进入成员/势力分布或后续国家页。"),
			_build_section_item_card("协同", "%s 项" % str(directives.size()), "军略短周期", "协同目标不同于国家长期政策。"),
			_build_section_item_card("战情", "%s 条" % str(reports.size()), "组织战报", "首页只展示摘要，完整战报进入战情页。"),
		],
		"content_blocks": [
			_build_section_text_block(
				"驻地说明",
				[
					"同盟/国家共用组织首页壳，国家是同盟立国后的生命周期形态。",
					"首页按钮、文字、数值和状态都是真 UI 控件，不做整页 PNG。",
				],
				"OrganizationOverviewHomeSummaryBlock"
			),
		],
	}


func _build_member_groups_section(commanders: Array, member_count: int) -> Dictionary:
	var grouped: Dictionary = {}
	for raw_commander in commanders:
		var commander: Dictionary = raw_commander as Dictionary
		var specialty_id: String = str(commander.get("specialty", "reserve"))
		if not grouped.has(specialty_id):
			grouped[specialty_id] = []
		(grouped[specialty_id] as Array).append(str(commander.get("name", "同盟指挥")))
	var item_cards: Array = []
	for specialty_id in grouped.keys():
		var names: Array = grouped[specialty_id] as Array
		item_cards.append(_build_section_item_card(
			_format_specialty_label(str(specialty_id)),
			"%s 人" % str(names.size()),
			"成员：%s" % " / ".join(names),
			"当前分组按指挥职责聚合生成。"
		))
	if item_cards.is_empty():
		item_cards.append(_build_section_item_card("主控组", "1 人", "当前尚未编成更多同盟分组", "军团编制补齐后会直接落到这里。"))
	return {
		"summary_lines": [
			"军团按职责聚合成员，主攻、驻守、后勤与预备位分层展示。",
			"当前同盟成员 %s / 军团编制 %s。" % [str(member_count), str(maxi(item_cards.size(), 1))],
		],
		"item_cards": item_cards,
		"content_blocks": [
			_build_section_card_grid_block(
				"军团编制",
				item_cards,
				"OrganizationCorpsCardGridBlock",
				2
			),
			_build_section_text_block(
				"军团关系",
				[
					"主控位和指挥位都归入军团视角，便于查看谁负责哪一路。",
					"军团卡片保留人数、职责和当前负责人。",
				],
				"AllianceMembersGroupsStructureBlock"
			),
		],
	}

func _build_subordinates_section(owned_clusters: Array) -> Dictionary:
	var district_groups: Dictionary = _group_city_clusters_by_district(owned_clusters)
	var item_cards: Array = []
	for district_id in district_groups.keys():
		var district_clusters: Array = district_groups[district_id] as Array
		item_cards.append(_build_section_item_card(
			"%s组" % _format_district_label(str(district_id)),
			"%s 城" % str(district_clusters.size()),
			_summarize_cluster_names(district_clusters),
			"下属成员当前按已占城池所在州郡聚合。"
		))
	if item_cards.is_empty():
		item_cards.append(_build_section_item_card(
			"暂无下属城池",
			"待接入",
			"当前势力尚未在地图上形成可聚合州郡",
			"占领更多城池后会按州郡展开。"
		))
	return {
		"summary_lines": [
			"下属城池按州郡层级聚合为卡片。",
			"当前已占城池 %s / 聚合州郡 %s。" % [str(owned_clusters.size()), str(maxi(item_cards.size(), 1))],
		],
		"item_cards": item_cards,
		"content_blocks": [
			_build_section_text_block(
				"下属成员摘要",
				[
					"下属成员按已占城池所在州郡聚合，反映真实地图占领面而不是静态组织样例。",
					"下属城市和驻点补齐后，可继续向组织层下钻。",
				],
				"AllianceMembersSubordinatesSummaryBlock"
			),
		],
	}

func _build_officers_section(capital_name: String, commanders: Array, directives: Array) -> Dictionary:
	var item_cards: Array = [
		_build_section_item_card("盟主", "玩家主控", "主城 %s" % capital_name, "官员架构先固定主控位。"),
	]
	var officer_cards: Array = [
		_build_section_item_card("盟主", "玩家主控", "官员任免 / 立国", "最高权限由组织身份决定。"),
	]
	for raw_commander in commanders:
		var commander: Dictionary = raw_commander as Dictionary
		var region_label: String = _format_region_label(str(commander.get("assignedRegionId", "")))
		var officer_title := _resolve_officer_title(str(commander.get("specialty", "")))
		var commander_name := str(commander.get("name", "同盟指挥"))
		item_cards.append(_build_section_item_card(
			officer_title,
			commander_name,
			region_label,
			"当前官员架构按主控位和指挥职责生成。"
		))
		officer_cards.append(_build_section_item_card(
			officer_title,
			commander_name,
			"%s | 军团管理候选" % region_label,
			"官员职责按组织任命状态展示。"
		))
	var structure_lines: Array[String] = ["当前官员架构按主控位和指挥职责生成。"]
	if directives.size() > commanders.size():
		structure_lines.append("仍有 %s 个目标缺少专属指挥位，可继续补编。" % str(directives.size() - commanders.size()))
	return {
		"summary_lines": [
			"官员页展示组织职位、职责与管辖区域。",
			"主控位 1 / 指挥位 %s / 协同目标 %s。" % [str(commanders.size()), str(directives.size())],
		],
		"item_cards": item_cards,
		"content_blocks": [
			_build_section_card_grid_block(
				"官员与权限",
				officer_cards,
				"OrganizationOfficerPermissionCardGridBlock",
				2
			),
			_build_section_text_block(
				"官员关系",
				structure_lines + [
					"官员页保持主控位、指挥位和区域归属三层关系。",
					"任命、调防和军团管理会在这里形成清晰入口。",
				],
				"AllianceMembersOfficersStructureBlock"
			),
		],
	}


func _build_officer_hierarchy_section(capital_name: String, commanders: Array, directives: Array, organization_kind: String = "alliance") -> Dictionary:
	var is_nation := organization_kind.strip_edges().to_lower() == "nation"
	var nodes := _build_officer_hierarchy_nodes(capital_name, commanders, directives, organization_kind)
	var item_cards: Array = [
		_build_section_item_card("盟主", "玩家主控", "可任免 / 可立国", "最高位可设置尊号与官职命名。"),
		_build_section_item_card("官位", "%s 个" % str(nodes.size()), "东汉官制" if is_nation else "同盟官员", "国家成立后展开东汉官职；同盟阶段只保留盟主、副盟主、官员。"),
		_build_section_item_card("将军席", "%s 个" % str(_count_general_officer_nodes(nodes)), "武将任官" if is_nation else "立国后开放", "国家阶段优先给武将和军团开放将军名号。"),
	]
	return {
		"summary_lines": [
			"国家成立后才启用东汉官职树；同盟阶段只显示盟主、副盟主、官员。",
			"当前官位节点 %s / 将军席 %s / 协同目标 %s。" % [str(nodes.size()), str(_count_general_officer_nodes(nodes)), str(directives.size())],
		],
		"item_cards": item_cards,
		"content_blocks": [
			{
				"kind": "hierarchy_canvas",
				"title": "官员架构",
				"node_name": "OrganizationOfficerHierarchyCanvasBlock",
				"nodes": nodes,
				"zoom_contract": "touch_mouse_drag_v1 + zoom_step_buttons_v1",
				"scale_range": "0.70-1.25",
			},
		],
	}


func _build_officer_hierarchy_nodes(capital_name: String, commanders: Array, directives: Array, organization_kind: String = "alliance") -> Array:
	if organization_kind.strip_edges().to_lower() != "nation":
		return _build_alliance_officer_nodes()
	return _build_nation_officer_nodes(capital_name)


func _build_alliance_officer_nodes() -> Array:
	return [
		{"id": "alliance_ruler", "title": "盟主", "name": "玩家主控", "seal": "盟", "meta": "最高权限", "description": "同盟阶段最高位。", "tier": 0, "x": 650, "y": 36, "width": 260, "height": 96},
		{"id": "alliance_deputy", "parent": "alliance_ruler", "title": "副盟主", "name": "佐理盟务", "seal": "副", "meta": "副位", "description": "协助盟主处理同盟事务。", "tier": 1, "x": 480, "y": 210, "width": 240, "height": 90},
		{"id": "alliance_officer", "parent": "alliance_ruler", "title": "官员", "name": "待任命", "seal": "官", "meta": "同盟官员", "description": "普通官员席，立国后才展开正式官职树。", "tier": 1, "x": 830, "y": 210, "width": 240, "height": 90},
	]


func _build_nation_officer_nodes(capital_name: String) -> Array:
	var nodes: Array = [
		_make_officer_node("nation_ruler", "", "王", "玩家主控", "王", "国家最高位", "成立国家后启用正式官职。", 0, 660, 24, 270, 96),
		_make_officer_node("prime_minister", "nation_ruler", "丞相", "政务总揽", "丞", "中枢辅政", "承接任免、政策和内政。", 1, 380, 160, 235, 88),
		_make_officer_node("grand_marshal", "nation_ruler", "大将军", "统军中枢", "将", "最高军职", "统摄国家军务和武将任官。", 1, 660, 160, 235, 88),
		_make_officer_node("grand_commandant", "nation_ruler", "太尉", "军政监察", "尉", "三公", "承接军政监察和军令校核。", 1, 940, 160, 235, 88),
		_make_officer_node("situ", "prime_minister", "司徒", "民政教化", "徒", "三公", "承接户籍、民政与功绩。", 2, 170, 300, 220, 84),
		_make_officer_node("sikong", "prime_minister", "司空", capital_name, "空", "三公", "承接城池、营造和资源工程。", 2, 430, 300, 220, 84),
		_make_officer_node("taichang", "prime_minister", "太常", "礼制祭祀", "常", "九卿", "礼制和典章。", 2, 690, 300, 220, 84),
		_make_officer_node("guangluxun", "grand_commandant", "光禄勋", "宿卫郎官", "光", "九卿", "宿卫与郎官。", 2, 950, 300, 220, 84),
		_make_officer_node("weiwei", "grand_commandant", "卫尉", "宫城宿卫", "卫", "九卿", "城防与宿卫。", 2, 1210, 300, 220, 84),
	]
	var civil_titles := ["廷尉", "太仆", "大鸿胪", "宗正", "大司农", "少府", "执金吾", "将作大匠", "河南尹", "京兆尹", "左冯翊", "右扶风", "尚书令", "尚书仆射", "御史中丞", "司隶校尉", "侍中", "黄门侍郎", "中常侍", "城门校尉", "虎贲中郎将", "羽林中郎将", "五官中郎将", "议郎", "谏议大夫", "太史令", "博士祭酒", "主簿", "长史", "功曹", "治中从事", "别驾从事", "簿曹从事"]
	_append_officer_title_grid(nodes, civil_titles, "prime_minister", "civil", "文官官署", 3, 100, 440, 6, 225, 92)
	var general_titles := [
		"骠骑将军", "车骑将军", "卫将军", "前将军", "后将军", "左将军", "右将军", "征东将军", "征西将军", "征南将军", "征北将军", "镇东将军", "镇西将军", "镇南将军", "镇北将军",
		"安东将军", "安西将军", "安南将军", "安北将军", "平东将军", "平西将军", "平南将军", "平北将军", "奋威将军", "奋武将军", "扬威将军", "扬武将军", "建威将军", "建武将军",
		"振威将军", "振武将军", "鹰扬将军", "虎威将军", "虎牙将军", "折冲将军", "横野将军", "楼船将军", "伏波将军", "凌江将军", "荡寇将军", "讨寇将军", "破虏将军", "讨虏将军",
		"平虏将军", "威虏将军", "讨逆将军", "辅国将军", "安国将军", "护军将军", "中军将军", "领军将军", "武卫将军", "武锋将军", "牙门将军", "偏将军", "裨将军", "校尉将军",
		"骑都尉", "奉车都尉", "驸马都尉", "中垒校尉", "屯骑校尉", "步兵校尉", "越骑校尉", "长水校尉", "射声校尉", "虎贲校尉", "西园校尉", "护羌校尉", "护乌桓校尉", "度辽将军",
		"材官将军", "积弩将军", "强弩将军", "轻车将军", "冠军将军", "讨暴将军", "殄虏将军", "昭武将军", "昭烈将军", "宣威将军", "宣武将军", "宁朔将军", "宁远将军", "安远将军",
		"绥远将军", "镇军将军", "辅军将军", "荡难将军", "横海将军", "横江将军", "广武将军", "广威将军", "建义将军", "建忠将军", "立节将军", "忠义将军", "武烈将军", "武毅将军"
	]
	_append_officer_title_grid(nodes, general_titles, "grand_marshal", "general", "武将官职", 4, 80, 780, 6, 225, 92)
	return nodes


func _make_officer_node(id: String, parent: String, title: String, name: String, seal: String, meta: String, description: String, tier: int, x: int, y: int, width: int, height: int) -> Dictionary:
	var node := {"id": id, "title": title, "name": name, "seal": seal, "meta": meta, "description": description, "tier": tier, "x": x, "y": y, "width": width, "height": height}
	if parent != "":
		node["parent"] = parent
	return node


func _append_officer_title_grid(nodes: Array, titles: Array, parent_id: String, id_prefix: String, meta: String, tier: int, start_x: int, start_y: int, columns: int, step_x: int, step_y: int) -> void:
	for index in range(titles.size()):
		var title := str(titles[index])
		var x := start_x + (index % columns) * step_x
		var y := start_y + int(index / columns) * step_y
		nodes.append(_make_officer_node(
			"%s_%s" % [id_prefix, str(index)],
			parent_id,
			title,
			"待任命",
			title.substr(0, 1),
			meta,
			"国家阶段官职席，可随等级逐步开放。",
			tier,
			x,
			y,
			205,
			78
		))


func _count_general_officer_nodes(nodes: Array) -> int:
	var count := 0
	for node_variant in nodes:
		if not (node_variant is Dictionary):
			continue
		var title := str((node_variant as Dictionary).get("title", ""))
		if title.find("将军") >= 0 or title.find("校尉") >= 0 or title.find("都尉") >= 0:
			count += 1
	return count


func _resolve_nation_name_draft(faction_state: Dictionary, alliance_name: String) -> String:
	var direct := _first_non_empty([
		faction_state.get("nationName", ""),
		faction_state.get("stateName", ""),
	])
	if direct != "":
		return direct
	var normalized_alliance_name := alliance_name.strip_edges()
	if normalized_alliance_name.ends_with("同盟"):
		normalized_alliance_name = normalized_alliance_name.trim_suffix("同盟")
	if normalized_alliance_name == "":
		normalized_alliance_name = "青州"
	return "%s国" % normalized_alliance_name


func _resolve_nation_color_hex(faction_state: Dictionary) -> String:
	var direct := _first_non_empty([
		faction_state.get("nationColorHex", ""),
		faction_state.get("factionColorHex", ""),
		faction_state.get("colorHex", ""),
	])
	if direct.begins_with("#") and direct.length() >= 7:
		return direct.substr(0, 7)
	return "#c95f32"


func _build_nation_profile_draft(faction_state: Dictionary, alliance_name: String, organization_kind: String, owned_clusters: Array = []) -> Dictionary:
	var capital_tile_id := _resolve_nation_capital_tile_id(faction_state, owned_clusters)
	return {
		"nation_name": _resolve_nation_name_draft(faction_state, alliance_name),
		"color_hex": _resolve_nation_color_hex(faction_state).to_lower(),
		"capital_tile_id": capital_tile_id,
		"capital_name": _resolve_nation_capital_name(faction_state, owned_clusters, capital_tile_id),
		"capital_options": _build_nation_capital_options(owned_clusters, capital_tile_id),
		"source_page": "nation/policy" if organization_kind == "nation" else "governance/founding",
		"local_only": organization_kind != "nation",
		"dirty": false,
	}


func _build_nation_profile_governance(faction_state: Dictionary) -> Dictionary:
	var rename_cooldown_until := str(faction_state.get("nationRenameCooldownUntil", "")).strip_edges()
	var historical_names := _variant_array(faction_state.get("nationNameHistory", []))
	var audit_log := _variant_array(faction_state.get("nationProfileAuditLog", []))
	var capital_tile_id := str(faction_state.get("nationCapitalTileId", "")).strip_edges()
	var capital_name := str(faction_state.get("nationCapitalName", "")).strip_edges()
	return {
		"capital_tile_id": capital_tile_id,
		"capital_name": capital_name,
		"profile_lock_text": "国号和势力色已随都城锁定",
		"capital_migration_text": "迁都后可重选都城、国号和势力色",
		"capital_migration_cost_text": "200 玉符",
		"rename_cooldown_until": rename_cooldown_until,
		"rename_cooldown_text": "改名冷却至 %s" % rename_cooldown_until if rename_cooldown_until != "" else "国号随都城锁定",
		"historical_names": historical_names,
		"audit_log": audit_log,
		"history_count": historical_names.size(),
		"audit_count": audit_log.size(),
		"latest_rejection": {},
	}


func _resolve_nation_capital_tile_id(faction_state: Dictionary, owned_clusters: Array) -> String:
	var direct := _first_non_empty([
		faction_state.get("nationCapitalTileId", ""),
		(faction_state.get("heroCommand", {}) as Dictionary).get("homeTileId", "") if faction_state.get("heroCommand", {}) is Dictionary else "",
	])
	if direct != "":
		return direct
	for raw_cluster in owned_clusters:
		if not (raw_cluster is Dictionary):
			continue
		var cluster: Dictionary = raw_cluster as Dictionary
		var tile_id := _first_non_empty([
			cluster.get("cityHallTileId", ""),
			cluster.get("centerTileId", ""),
			cluster.get("tileId", ""),
			cluster.get("id", ""),
		])
		if tile_id != "":
			return tile_id
	return ""


func _resolve_member_home_coordinate(home_tile_id: String, owned_clusters: Array) -> Dictionary:
	var cluster := _find_primary_city_cluster(owned_clusters, home_tile_id)
	if not cluster.is_empty():
		var tile_x := int(cluster.get("tileX", cluster.get("tmxX", cluster.get("x", -1))))
		var tile_y := int(cluster.get("tileY", cluster.get("tmxY", cluster.get("y", -1))))
		if tile_x >= 0 and tile_y >= 0:
			return {
				"x": tile_x,
				"y": tile_y,
			}
	return _read_tile_coordinate(home_tile_id)


func _resolve_nation_capital_name(faction_state: Dictionary, owned_clusters: Array, capital_tile_id: String) -> String:
	var direct := _first_non_empty([
		faction_state.get("nationCapitalName", ""),
		faction_state.get("capitalName", ""),
	])
	if direct != "":
		return direct
	for raw_cluster in owned_clusters:
		if not (raw_cluster is Dictionary):
			continue
		var cluster: Dictionary = raw_cluster as Dictionary
		var tile_id := _first_non_empty([
			cluster.get("cityHallTileId", ""),
			cluster.get("centerTileId", ""),
			cluster.get("tileId", ""),
			cluster.get("id", ""),
		])
		if tile_id == capital_tile_id:
			var cluster_name := _first_non_empty([
				cluster.get("name", ""),
				cluster.get("cityName", ""),
				cluster.get("label", ""),
			])
			if cluster_name != "":
				return cluster_name
	var tile_name := _read_tile_name(capital_tile_id)
	return tile_name if tile_name != "" else "当前郡城"


func _build_nation_capital_options(owned_clusters: Array, selected_tile_id: String) -> Array:
	var options: Array = []
	var seen: Dictionary = {}
	for raw_cluster in owned_clusters:
		if not (raw_cluster is Dictionary):
			continue
		var cluster: Dictionary = raw_cluster as Dictionary
		var tile_id := _first_non_empty([
			cluster.get("cityHallTileId", ""),
			cluster.get("centerTileId", ""),
			cluster.get("tileId", ""),
			cluster.get("id", ""),
		])
		if tile_id == "" or seen.has(tile_id):
			continue
		seen[tile_id] = true
		options.append({
			"tile_id": tile_id,
			"name": _resolve_nation_capital_name({}, [cluster], tile_id),
			"district": str(cluster.get("district", cluster.get("commanderyId", ""))).strip_edges(),
			"selected": tile_id == selected_tile_id,
		})
	if selected_tile_id != "" and not seen.has(selected_tile_id):
		options.push_front({
			"tile_id": selected_tile_id,
			"name": _resolve_nation_capital_name({}, [], selected_tile_id),
			"district": "",
			"selected": true,
		})
	return options


func _build_founding_section(owned_clusters: Array, _member_count: int, faction_state: Dictionary, alliance_name: String, organization_level: int = 1) -> Dictionary:
	var commandery_count := _count_owned_commanderies(owned_clusters)
	var nation_name_draft := _resolve_nation_name_draft(faction_state, alliance_name)
	var capital_tile_id := _resolve_nation_capital_tile_id(faction_state, owned_clusters)
	var capital_name := _resolve_nation_capital_name(faction_state, owned_clusters, capital_tile_id)
	return {
		"summary_lines": [
			"等级 %s/20，郡 %s/1。" % [
				str(organization_level),
				str(commandery_count),
			],
		],
		"item_cards": [
			_build_section_item_card("等级", "%s/20" % str(organization_level), "立国", ""),
			_build_section_item_card("占郡", "%s/1" % str(commandery_count), "立国", ""),
			_build_section_item_card("都城", capital_name, "选择", ""),
			_build_section_item_card("国号", nation_name_draft, "填写", ""),
			_build_section_item_card("势力色", "已选", "选择", ""),
		],
		"content_blocks": [],
	}


func _build_diplomacy_section(diplomacy_agreements: Array, runtime_context: Dictionary = {}) -> Dictionary:
	var diplomacy_read_model := _read_organization_bucket(["diplomacy", "diplomacyReadModel", "organizationDiplomacy"])
	var relation_source := _variant_array(diplomacy_read_model.get("relations", []))
	if relation_source.is_empty():
		relation_source = _variant_array(diplomacy_read_model.get("agreements", []))
	if relation_source.is_empty():
		relation_source = diplomacy_agreements
	var friendly_count := 0
	var hostile_count := 0
	var neutral_count := 0
	var relation_rows: Array = []
	for raw_agreement in relation_source:
		if not (raw_agreement is Dictionary):
			continue
		var agreement: Dictionary = raw_agreement as Dictionary
		var relation := str(agreement.get("relation", agreement.get("type", agreement.get("stance", "")))).strip_edges().to_lower()
		var relation_label := _format_relation_label(relation)
		match relation_label:
			"友好":
				friendly_count += 1
			"敌对":
				hostile_count += 1
			_:
				neutral_count += 1
		relation_rows.append({
			"target": str(agreement.get("targetName", agreement.get("target", agreement.get("factionId", "未知组织")))),
			"relation": relation_label,
			"scope": str(agreement.get("scope", agreement.get("regionId", "全局"))),
			"status": str(agreement.get("status", "生效中")),
			"note": str(agreement.get("note", agreement.get("reason", agreement.get("description", "外交关系记录")))),
			"updated": str(agreement.get("updatedAt", agreement.get("tick", ""))),
		})
	if relation_rows.is_empty():
		neutral_count = 1
		relation_rows.append({
			"target": "周边组织",
			"relation": "中立",
			"scope": "全局",
			"status": "待建立",
			"note": "暂未建立外交往来。",
		})
	var relation_count := relation_rows.size()
	var content_blocks: Array = []
	var backend_campaign_cards := _build_backend_ai_rally_campaign_cards(runtime_context)
	var summary_lines: Array = [
		"外交页集中展示友好、敌对和中立关系，使用关系牌而不是网页表格。",
		"友好 %s / 敌对 %s / 中立 %s / 总关系 %s。" % [str(friendly_count), str(hostile_count), str(neutral_count), str(relation_count)],
	]
	var item_cards: Array = [
		_build_section_item_card("友好", str(friendly_count), "淡蓝关系", "后续用于地图视觉关系提示。"),
		_build_section_item_card("敌对", str(hostile_count), "深红关系", "后续用于地图视觉关系提示。"),
		_build_section_item_card("中立/其他", str(neutral_count), "外交关系", "不影响本页结构。"),
	]
	if not backend_campaign_cards.is_empty():
		item_cards = backend_campaign_cards + item_cards
		var campaign_relation_rows: Array = []
		for card_variant in backend_campaign_cards:
			if not (card_variant is Dictionary):
				continue
			var card: Dictionary = card_variant as Dictionary
			var title := str(card.get("title", "")).strip_edges()
			var value := str(card.get("value", "")).strip_edges()
			summary_lines.append("%s：%s" % [title, value])
			campaign_relation_rows.append({
				"target": title,
				"relation": "友好" if title == "同盟集结记忆" else "中立",
				"scope": str(card.get("meta", "")).strip_edges(),
				"status": value,
				"note": str(card.get("description", "")).strip_edges(),
				"updated": "",
			})
		relation_rows = campaign_relation_rows + relation_rows
		relation_count = relation_rows.size()
		content_blocks.append(_build_section_card_grid_block(
			"AI集结战役",
			backend_campaign_cards,
			"OrganizationBackendAiRallyCampaignBlock",
			3
		))
	content_blocks.append({
			"kind": "relation_board",
			"title": "外交关系",
			"node_name": "OrganizationDiplomacyRelationBoardBlock",
			"rows": relation_rows,
			"relation_counts": {
				"friendly": friendly_count,
				"hostile": hostile_count,
				"neutral": neutral_count,
			},
			"filters": [
				{"label": "全部", "value": "%s" % str(relation_count), "active": true},
				{"label": "友好", "value": "%s" % str(friendly_count)},
				{"label": "敌对", "value": "%s" % str(hostile_count)},
				{"label": "中立", "value": "%s" % str(neutral_count)},
			],
			"source_mode": "diplomacy_read_model_or_feedback_agreements_v1",
		})
	content_blocks.append(_build_section_text_block(
		"外交边界",
		[
			"关系状态用于判断周边组织态度。",
			"敌对、友好和中立应在后续地图视觉中保持一致。",
		],
		"OrganizationDiplomacyRelationsSummaryBlock"
	))
	return {
		"summary_lines": summary_lines,
		"list_title": "外交概览",
		"item_cards": item_cards,
		"content_blocks": content_blocks,
	}


func _build_backend_ai_rally_campaign_cards(runtime_context: Dictionary) -> Array:
	var campaign_archive := _read_backend_ai_rally_campaign_archive(runtime_context)
	if not campaign_archive.is_empty():
		var archive_cards: Array = []
		var long_term_text := _player_facing_campaign_text(campaign_archive, "longTermMemory")
		if long_term_text != "":
			archive_cards.append(_build_section_item_card("长期战役档案", long_term_text, _player_facing_campaign_text(campaign_archive, "playerFacingTitle"), "同盟页展示长期战役摘要。"))
		var diplomacy_timeline_text := _player_facing_campaign_text(campaign_archive, "diplomacyTimelineSummary")
		if diplomacy_timeline_text != "":
			archive_cards.append(_build_section_item_card("外交变化", diplomacy_timeline_text, "", "外交变化来自战役档案。"))
		var cross_day_target_text := _first_campaign_archive_item_text(campaign_archive, "crossDayRallyTargets")
		if cross_day_target_text != "":
			archive_cards.append(_build_section_item_card("跨日目标", cross_day_target_text, _player_facing_campaign_text(campaign_archive, "crossDayActionRecap"), "跨日目标来自战役档案。"))
		var recap_text := _first_campaign_archive_item_text(campaign_archive, "recapEntries")
		if recap_text != "":
			archive_cards.append(_build_section_item_card("战役复盘", recap_text, "", "同盟战役复盘来自长期档案。"))
		var transition_text := _first_campaign_archive_item_text(campaign_archive, "stateTransitions")
		if transition_text != "":
			archive_cards.append(_build_section_item_card("阶段迁移", transition_text, "", "战役阶段迁移来自长期档案。"))
		var diplomacy_task_text := _first_campaign_archive_item_text(campaign_archive, "diplomacyTasks")
		if diplomacy_task_text != "":
			archive_cards.append(_build_section_item_card("外交建议", diplomacy_task_text, "", "外交建议只作参考，不在本页生成执行入口。"))
		var hostile_dossier_text := _first_campaign_archive_item_text(campaign_archive, "hostileDossiers")
		if hostile_dossier_text != "":
			archive_cards.append(_build_section_item_card("敌对势力复盘", hostile_dossier_text, "", "交手记录来自战役档案。"))
		var incoming_attack_text := _first_campaign_archive_item_text(campaign_archive, "incomingAttackReports")
		if incoming_attack_text != "":
			archive_cards.append(_build_section_item_card("来袭战报", incoming_attack_text, "", "敌方攻打记录来自战报复盘。"))
		var enemy_target_text := _first_campaign_archive_item_text(campaign_archive, "enemyTargetHistory")
		if enemy_target_text != "":
			archive_cards.append(_build_section_item_card("敌方目标历史", enemy_target_text, "", "敌方目标历史来自战役档案。"))
		var battle_analysis := _read_campaign_archive_analysis(campaign_archive)
		var defense_text := _player_facing_campaign_text(battle_analysis, "recommendedDefenseSummary")
		if defense_text != "":
			archive_cards.append(_build_section_item_card("防守建议", defense_text, _player_facing_campaign_text(battle_analysis, "winLossSummary"), "胜负分析会给出防守建议。"))
		var failed_target_text := _first_campaign_archive_item_text(campaign_archive, "failedTargetMemories")
		if failed_target_text != "":
			archive_cards.append(_build_section_item_card("失败目标记忆", failed_target_text, "", "失败目标记忆来自长期档案。"))
		var cross_day_action_text := _first_campaign_archive_item_text(campaign_archive, "crossDayActionList")
		if cross_day_action_text != "":
			archive_cards.append(_build_section_item_card("跨日行动", cross_day_action_text, "", "跨日行动来自长期档案。"))
		if not archive_cards.is_empty():
			return archive_cards
	var campaign_state := _read_backend_ai_rally_campaign_state(runtime_context)
	if campaign_state.is_empty():
		return []
	var cards: Array = []
	var memory_text := _player_facing_campaign_text(campaign_state, "campaignMemory")
	if memory_text != "":
		cards.append(_build_section_item_card("同盟集结记忆", memory_text, _player_facing_campaign_text(campaign_state, "targetName"), "战役记忆进入同盟外交页。"))
	var diplomacy_text := _player_facing_campaign_text(campaign_state, "diplomacyPosture")
	if diplomacy_text != "":
		cards.append(_build_section_item_card("外交态势", diplomacy_text, _player_facing_campaign_text(campaign_state, "currentPhase"), "只展示战役判断。"))
	var recap_text := _player_facing_campaign_text(campaign_state, "crossDayRecap")
	if recap_text != "":
		cards.append(_build_section_item_card("跨日复盘", recap_text, _player_facing_campaign_text(campaign_state, "updatedAt"), "跨日行动复盘不暴露工程字段。"))
	return cards


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


func _read_campaign_archive_analysis(source: Dictionary) -> Dictionary:
	var analysis_variant: Variant = source.get("enemyBattleAnalysis", {})
	if analysis_variant is Dictionary:
		return analysis_variant as Dictionary
	return {}


func _build_territory_section(owned_clusters: Array, directives: Array) -> Dictionary:
	var item_cards: Array = []
	for raw_cluster in owned_clusters.slice(0, 4):
		var cluster: Dictionary = raw_cluster as Dictionary
		item_cards.append(_build_section_item_card(
			str(cluster.get("name", "已占城池")),
			_format_district_label(str(cluster.get("district", ""))),
			"政%s / 后%s / 防%s / 募%s" % [
				str(int((cluster.get("techLevels", {}) as Dictionary).get("governance", 0))),
				str(int((cluster.get("techLevels", {}) as Dictionary).get("logistics", 0))),
				str(int((cluster.get("techLevels", {}) as Dictionary).get("defense", 0))),
				str(int((cluster.get("techLevels", {}) as Dictionary).get("recruitment", 0))),
			],
			"势力分布优先展示已占城池与科技结构。"
		))
	for raw_directive in directives.slice(0, max(0, 4 - item_cards.size())):
		var directive: Dictionary = raw_directive as Dictionary
		item_cards.append(_build_section_item_card(
			_format_region_label(str(directive.get("regionId", ""))),
			_format_stance_label(str(directive.get("stance", ""))),
			"支援 %s" % str(int(directive.get("supportLevel", 0))),
			"已占城池不足时，先展示协同目标。"
		))
	if item_cards.is_empty():
		item_cards.append(_build_section_item_card(
			"暂无可展示领地",
			"待接入",
			"当前世界占领面尚未形成正式同盟版图",
			"城市占领面更新后会自动替换。"
		))
	return {
		"summary_lines": [
			"势力分布以领地卡片承接州郡与资源面。",
			"已占城池 %s / 协同目标 %s。" % [str(owned_clusters.size()), str(directives.size())],
		],
		"item_cards": item_cards,
		"content_blocks": [
			_build_section_text_block(
				"势力摘要",
				[
					"势力分布当前优先展示已占城池，保持和地图状态一致。",
					"地图驻点和区域密度补齐后会继续细分。",
				],
				"AllianceMembersTerritorySummaryBlock"
			),
		],
	}

func _build_strategy_section(directives: Array, alliance_actions: Array) -> Dictionary:
	var item_cards: Array = []
	for raw_directive in directives.slice(0, 4):
		var directive: Dictionary = raw_directive as Dictionary
		item_cards.append(_build_section_item_card(
			_format_region_label(str(directive.get("regionId", ""))),
			_format_stance_label(str(directive.get("stance", ""))),
			"支援 %s" % str(int(directive.get("supportLevel", 0))),
			"军略页优先展示当前协同目标。"
		))
	if item_cards.is_empty():
		item_cards.append(_build_section_item_card(
			"暂无正式同盟目标",
			"待命",
			"当前暂无协同目标",
			"协同目标更新后会刷新。"
		))
	var strategy_lines: Array[String] = []
	if not alliance_actions.is_empty():
		var latest_action: Dictionary = alliance_actions[0] as Dictionary
		strategy_lines.append("最近协同行动：%s" % str(latest_action.get("detail", "等待协同行动反馈。")))
	else:
		strategy_lines.append("当前尚未产出同盟行动反馈，军略先显示协同目标。")
	return {
		"summary_lines": [
			"军略以目标卡片呈现当前协同节奏。",
			"当前正式协同目标 %s / 最新协同行动 %s。" % [str(directives.size()), str(alliance_actions.size())],
		],
		"item_cards": item_cards,
		"content_blocks": [
			_build_section_text_block(
				"军略摘要",
				strategy_lines,
				"AllianceMembersStrategySummaryBlock"
			),
			_build_section_text_block(
				"结构说明",
				[
					"军略页当前固定为目标卡片 + 协同行动摘要的二层结构。",
					"区域策略和执行节奏补齐后会继续细分。",
				],
				"AllianceMembersStrategyStructureBlock"
			),
		],
	}

func _build_latest_reports_section(reports: Array, battle_records: Array) -> Dictionary:
	var item_cards: Array = []
	for raw_report in reports.slice(0, 4):
		var report: Dictionary = raw_report as Dictionary
		item_cards.append(_build_section_item_card(
			str(report.get("title", "战报")),
			"近期战事",
			"战报来源",
			"最新战报优先展示组织战报。"
		))
	if item_cards.is_empty():
		for raw_record in battle_records.slice(0, 4):
			var record: Dictionary = raw_record as Dictionary
			item_cards.append(_build_section_item_card(
				str(record.get("summary", "战斗记录")),
				"近期战事",
				"战斗记录",
				"当前组织战报为空时展示战斗记录。"
			))
	if item_cards.is_empty():
		item_cards.append(_build_section_item_card(
			"暂无最新战报",
			"等待回写",
			"当前暂无组织战报",
			"战报流更新后会刷新。"
		))
	return {
		"summary_lines": [
			"最新战报以卡片形式展示近期战况。",
			"当前战报 %s / 战斗记录 %s。" % [str(reports.size()), str(battle_records.size())],
		],
		"list_title": "战报卡片",
		"item_cards": item_cards,
		"content_blocks": [
			_build_section_card_grid_block(
				"组织战报",
				item_cards,
				"OrganizationBattleReportFeedCardGridBlock",
				2
			),
			_build_section_text_block(
				"战报摘要",
				[
					"战报卡片优先展示标题、时间和来源。",
					"当前组织战报 %s / 战斗记录 %s。" % [str(reports.size()), str(battle_records.size())],
				],
				"AllianceBattleReportsLatestSummaryBlock"
			),
			_build_section_text_block(
				"来源说明",
				[
					"战报列表用于快速判断组织近期交战方向。",
					"完整详情进入战报详情页后再展开。",
				],
				"AllianceBattleReportsLatestSourceBlock"
			),
		],
	}

func _build_organization_battle_report_section(reports: Array, battle_records: Array, runtime_context: Dictionary = {}) -> Dictionary:
	var report_rows := _build_organization_battle_report_rows(reports, battle_records)
	var enemy_dossier_cards := _build_backend_enemy_dossier_query_cards(runtime_context)
	var enemy_dossier_detail_cards := enemy_dossier_cards.slice(0, 1)
	var war_room_query_cards := _build_backend_war_room_query_cards(runtime_context)
	var war_room_drilldown := _build_backend_war_room_drilldown_payload(runtime_context)
	var item_cards: Array = []
	if not enemy_dossier_cards.is_empty():
		item_cards.append_array(enemy_dossier_cards.slice(0, 2))
	if not war_room_query_cards.is_empty():
		item_cards.append_array(war_room_query_cards.slice(0, 2))
	for raw_report in report_rows.slice(0, 4):
		var report: Dictionary = raw_report as Dictionary
		item_cards.append(_build_section_item_card(
			str(report.get("title", "同盟战报")),
			_first_non_empty([report.get("location", ""), report.get("region", ""), "交战地点"]),
			_normalize_result_text(str(report.get("result", report.get("outcome", "未结")))),
			str(report.get("summary", "点击战报条目查看详情。"))
		))
	if item_cards.is_empty():
		item_cards.append(_build_section_item_card(
			"暂无组织战报",
			"等待回写",
			"列表详情已就绪",
			"同盟战报进入后会直接展示列表和详情。"
		))
	var content_blocks: Array = []
	if not enemy_dossier_cards.is_empty():
		content_blocks.append(_build_section_card_grid_block(
			"敌军档案查询列表",
			enemy_dossier_cards,
			"OrganizationEnemyDossierQueryListBlock",
			2
		))
	content_blocks.append({
		"kind": "battle_report_list",
		"title": "组织战报",
		"node_name": "OrganizationBattleReportListBlock",
		"reports": report_rows,
		"reuse_source": "battle_report_list_detail_contract_adapter_v1",
		"navigation_contract": "organization_battle_report_list_then_detail_route_v1",
		"filter_contract": "battle_report_core_data_filter_no_visible_extra_strip_v1",
		"source_filter_contract": ORGANIZATION_BATTLE_REPORT_SOURCE_FILTER_MODE,
	})
	var summary_lines: Array = [
		"组织战报复用主战报页的列表 + 详情合同，不在同盟页重造战报结构。",
		"当前组织战报 %s / 战斗记录 %s。" % [str(report_rows.size()), str(battle_records.size())],
	]
	if not enemy_dossier_cards.is_empty():
		summary_lines.append("敌军档案查询列表来自长期战报复盘。")
	if not war_room_query_cards.is_empty():
		summary_lines.append("战情室展示敌军对比、来袭时间线、重复失败目标和反击/驻防计划。")
	return {
		"summary_lines": summary_lines,
		"list_title": "组织战报",
		"item_cards": item_cards,
		"enemy_dossier_cards": enemy_dossier_cards,
		"enemy_dossier_detail_cards": enemy_dossier_detail_cards,
		"war_room_query_cards": war_room_query_cards,
		"war_room_drilldown": war_room_drilldown,
		"content_blocks": content_blocks,
	}


func _build_backend_enemy_dossier_query_cards(runtime_context: Dictionary) -> Array:
	var campaign_archive := _read_backend_ai_rally_campaign_archive(runtime_context)
	if campaign_archive.is_empty():
		return []
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
		var meta := _player_facing_campaign_text(item, "winLossSummary")
		var description_parts: Array = []
		for key in ["frequentTargetSummary", "frequentUnitSummary", "siegePreferenceSummary", "counterAdviceSummary"]:
			var part := _player_facing_campaign_text(item, key)
			if part != "":
				description_parts.append(part)
		cards.append(_build_section_item_card(
			"敌军档案查询",
			summary,
			meta,
			" ".join(description_parts)
		))
		if cards.size() >= 6:
			break
	return cards


func _build_backend_war_room_query_cards(runtime_context: Dictionary) -> Array:
	var campaign_archive := _read_backend_ai_rally_campaign_archive(runtime_context)
	if campaign_archive.is_empty():
		return []
	var cards: Array = []
	var sources: Array = [
		{"key": "enemyFilterOptions", "title": "按敌军筛选", "meta": "敌军过滤"},
		{"key": "enemyHistoryPages", "title": "单敌军历史分页", "meta": "历史分页"},
		{"key": "liveIncomingAttackUpdates", "title": "实时来袭更新", "meta": "实时刷新"},
		{"key": "enemyComparisonRows", "title": "敌军对比", "meta": "威胁排序"},
		{"key": "incomingAttackTimeline", "title": "来袭时间线", "meta": "战报时间"},
		{"key": "repeatedFailedTargetRows", "title": "重复失败目标", "meta": "高损复盘"},
		{"key": "responsePlanCandidates", "title": "反击/驻防计划", "meta": "等待真人确认"},
	]
	for source_variant in sources:
		var source: Dictionary = source_variant as Dictionary
		var items_variant: Variant = campaign_archive.get(str(source.get("key", "")), [])
		if not (items_variant is Array):
			continue
		for item_variant in items_variant as Array:
			if not (item_variant is Dictionary):
				continue
			var item: Dictionary = item_variant as Dictionary
			var summary: String = _player_facing_campaign_text(item, "playerFacingSummary")
			if summary == "":
				continue
			var description: String = _player_facing_campaign_text(item, "proposalReadinessSummary")
			if description == "":
				description = _player_facing_campaign_text(item, "nextPageLabel")
			if description == "":
				var history_items_variant: Variant = item.get("items", [])
				if history_items_variant is Array:
					var item_summaries: Array = []
					var history_items: Array = history_items_variant as Array
					for row_variant in history_items.slice(0, 2):
						if row_variant is Dictionary:
							var row: Dictionary = row_variant as Dictionary
							var row_summary: String = _player_facing_campaign_text(row, "playerFacingSummary")
							if row_summary != "":
								item_summaries.append(row_summary)
					description = " ".join(item_summaries)
			if description == "":
				description = "同盟战情室只展示战情摘要。"
			cards.append(_build_section_item_card(
				str(source.get("title", "战情室查询")),
				summary,
				str(source.get("meta", "")),
				description
			))
			break
	return cards


func _build_backend_war_room_drilldown_payload(runtime_context: Dictionary) -> Dictionary:
	var campaign_archive := _read_backend_ai_rally_campaign_archive(runtime_context)
	var live_refresh: Dictionary = runtime_context.get("ai_autonomous_combat_war_room_live_refresh", {}) as Dictionary if runtime_context.get("ai_autonomous_combat_war_room_live_refresh", {}) is Dictionary else {}
	var ui_state: Dictionary = runtime_context.get("ai_autonomous_combat_war_room_ui_state", {}) as Dictionary if runtime_context.get("ai_autonomous_combat_war_room_ui_state", {}) is Dictionary else {}
	if campaign_archive.is_empty() and live_refresh.is_empty() and ui_state.is_empty():
		return {}
	var result: Dictionary = {}
	for key in ["enemyFilterOptions", "enemyHistoryPages", "liveIncomingAttackUpdates", "responsePlanCandidates", "defenseAssignmentResults", "defenseExecutionOutcomeRows", "defenseSettlementRecapEntries"]:
		var items_variant: Variant = campaign_archive.get(key, [])
		if items_variant is Array:
			result[key] = (items_variant as Array).duplicate(true)
	var scope_variant: Variant = campaign_archive.get("warRoomAccessScope", {})
	if scope_variant is Dictionary:
		result["warRoomAccessScope"] = (scope_variant as Dictionary).duplicate(true)
	if not live_refresh.is_empty():
		for key in ["enemyFilterOptions", "enemyHistoryPages", "liveIncomingAttackUpdates", "responsePlanCandidates", "defenseAssignmentResults", "defenseExecutionOutcomeRows", "defenseSettlementRecapEntries"]:
			var live_items_variant: Variant = live_refresh.get(key, [])
			if live_items_variant is Array and not (live_items_variant as Array).is_empty():
				result[key] = (live_items_variant as Array).duplicate(true)
		var live_scope_variant: Variant = live_refresh.get("warRoomAccessScope", {})
		if live_scope_variant is Dictionary:
			result["warRoomAccessScope"] = (live_scope_variant as Dictionary).duplicate(true)
		result["liveRefresh"] = live_refresh.duplicate(true)
	if not ui_state.is_empty():
		result["uiState"] = ui_state.duplicate(true)
	return result


func _build_organization_battle_report_rows(reports: Array, battle_records: Array) -> Array:
	var rows: Array = []
	for raw_record in battle_records.slice(0, 8):
		if not (raw_record is Dictionary):
			continue
		var record: Dictionary = (raw_record as Dictionary).duplicate(true)
		var title := _first_non_empty([record.get("title", ""), record.get("summary", ""), "同盟战斗记录"])
		record["id"] = _first_non_empty([record.get("id", ""), record.get("reportId", ""), "organization_record_%s" % str(rows.size() + 1)])
		record["title"] = title
		record["type"] = "battle_report"
		record["attacker"] = _first_non_empty([record.get("attacker", ""), "同盟军"])
		record["defender"] = _first_non_empty([record.get("defender", ""), record.get("target", ""), "敌方"])
		record["location"] = _first_non_empty([record.get("location", ""), record.get("region", ""), "交战地点"])
		record["result"] = _first_non_empty([record.get("result", ""), record.get("outcome", ""), record.get("status", ""), "未结"])
		record["summary"] = _first_non_empty([record.get("summary", ""), "组织战报预览。"])
		record["_battle_report_source"] = "feedback.battleRecords"
		rows.append(record)
	for raw_report in reports.slice(0, 8):
		if rows.size() >= 8:
			break
		if not (raw_report is Dictionary):
			continue
		var report: Dictionary = (raw_report as Dictionary).duplicate(true)
		var title := _first_non_empty([report.get("title", ""), report.get("summary", ""), "同盟战报"])
		report["id"] = _first_non_empty([report.get("id", ""), report.get("reportId", ""), "organization_report_%s" % str(rows.size() + 1)])
		report["title"] = title
		report["type"] = _first_non_empty([report.get("type", ""), "battle_report"])
		report["attacker"] = _first_non_empty([report.get("attacker", ""), report.get("playerName", ""), "同盟军"])
		report["defender"] = _first_non_empty([report.get("defender", ""), report.get("target", ""), "敌方"])
		report["location"] = _first_non_empty([report.get("location", ""), report.get("region", ""), report.get("targetName", ""), "交战地点"])
		report["result"] = _first_non_empty([report.get("result", ""), report.get("outcome", ""), report.get("status", ""), "未结"])
		report["summary"] = _first_non_empty([report.get("summary", ""), report.get("detail", ""), "组织战报已同步。"])
		rows.append(report)
	return _filter_organization_battle_report_rows(rows)


func _filter_organization_battle_report_rows(rows: Array) -> Array:
	var result: Array = []
	for raw_row in rows:
		if not (raw_row is Dictionary):
			continue
		var row: Dictionary = (raw_row as Dictionary).duplicate(true)
		if _organization_report_row_matches(row) and _organization_report_row_is_strategic(row):
			row["organizationSourceFilterMode"] = ORGANIZATION_BATTLE_REPORT_SOURCE_FILTER_MODE
			result.append(row)
	return result


func _organization_report_row_is_strategic(report: Dictionary) -> bool:
	var report_kind := str(report.get("reportKind", report.get("report_kind", ""))).strip_edges().to_lower()
	if report_kind == "resource_guard":
		return false
	if report_kind == "field_battle":
		return true
	var probe := " ".join([
		str(report.get("type", "")),
		str(report.get("kind", "")),
		str(report.get("category", "")),
		str(report.get("title", "")),
		str(report.get("summary", "")),
		str(report.get("attacker", "")),
		str(report.get("defender", "")),
		str(report.get("target", "")),
		str(report.get("location", "")),
	]).to_lower()
	for blocked_token in ["resource_guard", "resource guard", "tile_occupy", "resource_tile", "资源地", "守军", "系统城"]:
		if probe.find(blocked_token) >= 0:
			return false
	for allowed_token in ["field_battle", "pvp", "siege", "city_battle", "kingdom_war", "war", "交战", "接敌", "攻城", "国战", "会战"]:
		if probe.find(allowed_token) >= 0:
			return true
	return false


func _organization_report_row_matches(report: Dictionary) -> bool:
	var alliance_data: Dictionary = _world_data.get("alliance", {}) as Dictionary
	var organization_name := _first_non_empty([
		alliance_data.get("name", ""),
		_target_faction_id,
	])
	var explicit_org_id := _first_non_empty([
		report.get("organizationId", ""),
		report.get("organization_id", ""),
		report.get("allianceId", ""),
		report.get("nationId", ""),
		report.get("ownerOrganizationId", ""),
	])
	if explicit_org_id != "":
		return explicit_org_id == _target_faction_id or explicit_org_id == organization_name
	var explicit_org_name := _first_non_empty([
		report.get("organizationName", ""),
		report.get("allianceName", ""),
		report.get("nationName", ""),
	])
	if explicit_org_name != "":
		return explicit_org_name == organization_name
	var faction_id := _first_non_empty([
		report.get("factionId", ""),
		report.get("ownerFactionId", ""),
		report.get("attackerFaction", ""),
		report.get("attackerFactionId", ""),
	])
	return faction_id == "" or faction_id == _target_faction_id


func _build_report_highlights_section(alliance_actions: Array, battle_records: Array) -> Dictionary:
	var item_cards: Array = []
	for raw_action in alliance_actions.slice(0, 4):
		var action: Dictionary = raw_action as Dictionary
		item_cards.append(_build_section_item_card(
			str(action.get("title", "协同行动")),
			str(action.get("severity", "medium")),
			"组织行动",
			"重点战况优先展示正式协同行动。"
		))
	if item_cards.is_empty():
		for raw_record in battle_records.slice(0, 4):
			var record: Dictionary = raw_record as Dictionary
			item_cards.append(_build_section_item_card(
				str(record.get("summary", "战斗记录")),
				"支援 %s" % str(int(record.get("alliedSupport", 0))),
				"战斗记录",
				"当前正式重点行动为空时先保留战斗记录入口。"
			))
	if item_cards.is_empty():
		item_cards.append(_build_section_item_card(
			"暂无重点战况",
			"等待回写",
			"当前暂无重点战况",
			"重点战况更新后会刷新。"
		))
	return {
		"summary_lines": [
			"重点战况以战事卡片展示关键节点。",
			"当前优先展示组织行动，如为空则回退到战斗记录。",
		],
		"list_title": "重点卡片",
		"item_cards": item_cards,
		"content_blocks": [
			_build_section_text_block(
				"重点摘要",
				[
					"重点战况优先展示组织行动，如无则展示战斗记录。",
					"当前组织行动 %s / 战斗记录 %s。" % [str(alliance_actions.size()), str(battle_records.size())],
				],
				"AllianceBattleReportsHighlightsSummaryBlock"
			),
			_build_section_text_block(
				"筛选说明",
				[
					"重点页用于快速定位高价值战况，不在本轮展开更细的战区过滤。",
					"后续可继续接突破点、伤亡高点和驻守变更标签。",
				],
				"AllianceBattleReportsHighlightsStructureBlock"
			),
		],
	}

func _build_report_archive_section(reports: Array, execution_replays: Array, battle_records: Array, diplomacy_agreements: Array) -> Dictionary:
	return {
		"summary_lines": [
			"战报归档按战报、回放、战斗记录和外交协议分组。",
			"当前按战报、执行回放、战斗记录和外交协议聚合。",
		],
		"list_title": "归档卡片",
		"item_cards": [
			_build_section_item_card("战报总数", str(reports.size()), "组织归档", "正式战报数量作为归档主锚点。"),
			_build_section_item_card("执行回放", str(execution_replays.size()), "行动复盘", "执行回放和战报并列展示。"),
			_build_section_item_card("战斗记录", str(battle_records.size()), "战斗脉络", "战斗记录用于补足回放前后的历史节点。"),
			_build_section_item_card("外交协议", str(diplomacy_agreements.size()), "外交往来", "外交协议继续作为同盟战报域的上下文归档。"),
		],
		"content_blocks": [
			_build_section_text_block(
				"归档摘要",
				[
					"归档当前按战报、执行回放、战斗记录和外交协议聚合。",
					"这部分先固定来源和数量关系，不在本轮展开导出与筛选。",
				],
				"AllianceBattleReportsArchiveSummaryBlock"
			),
			_build_section_text_block(
				"归档说明",
				[
					"战报、回放、战斗记录和外交协议并列展示。",
					"后续可在这一页继续接时间筛选、战区标签和复盘标记。",
				],
				"AllianceBattleReportsArchiveStructureBlock"
			),
		],
	}

func _build_applications_pending_section(
	member_count: int,
	online_count: int,
	seat_gap: int,
	commander_gap: int,
	low_support_count: int,
	status_counts: Dictionary,
	report_count: int
) -> Dictionary:
	return {
		"summary_lines": [
			"申请待审页先展示容量、指挥席和支援缺口。",
			"当前成员 %s，可扩编席位 %s，后续申请流会直接刷新卡片。" % [str(member_count), str(seat_gap)],
		],
		"list_title": "审批指标",
		"item_cards": [
			_build_section_item_card("待审申请", "0", "申请入口", "先保留审批位置与容量关系。"),
			_build_section_item_card("可扩编席位", str(seat_gap), "成员 %s" % str(member_count), "用于表示当前同盟的可补位空间。"),
			_build_section_item_card("指挥位缺口", str(commander_gap), "进行中 %s / 待执行 %s" % [str(int(status_counts.get("running", 0))), str(int(status_counts.get("queued", 0)))], "优先补足协同目标缺少专属指挥位的部分。"),
			_build_section_item_card("低支援目标", str(low_support_count), "待回执战报 %s" % str(mini(4, report_count)), "低支援目标会优先进入审批与补位视线。"),
		],
		"content_blocks": [
			_build_section_text_block(
				"审批口径",
				[
					"当前先按组织容量与协同缺口展示申请位置。",
					"后续接申请流后，这一栏可直接替换，不需要改面板骨架。",
				],
				"AllianceApplicationsPendingPolicyBlock"
			),
			_build_section_text_block(
				"容量校验",
				[
					"当前成员 %s，可扩编席位 %s。" % [str(member_count), str(seat_gap)],
					"进行中协同单 %s，待执行协同单 %s。" % [str(int(status_counts.get("running", 0))), str(int(status_counts.get("queued", 0)))],
				],
				"AllianceApplicationsPendingCapacityBlock"
			),
		],
	}


func _build_applications_review_section(status_counts: Dictionary, low_support_count: int, report_count: int) -> Dictionary:
	return {
		"summary_lines": [
			"审批复核以复核卡片承接继续确认的同盟事务。",
			"运行中与待执行协同单会优先进入这一页的复核视野。",
		],
		"list_title": "复核卡片",
		"item_cards": [
			_build_section_item_card("进行中协同单", str(int(status_counts.get("running", 0))), "当前执行链在跑的协同单", "优先确认正在运行中的同盟事务。"),
			_build_section_item_card("待执行协同单", str(int(status_counts.get("queued", 0))), "等待编排层推进", "表示还没真正进入运行态的同盟单。"),
			_build_section_item_card("低支援复核", str(low_support_count), "需要继续补支援或补位", "低支援目标会持续停留在复核页。"),
			_build_section_item_card("待回执战报", str(mini(4, report_count)), "最近战报等待回执", "先保留战报回执和审批链的结构关系。"),
		],
		"content_blocks": [
			_build_section_text_block(
				"复核摘要",
				[
					"审批中先借用执行链和低支援目标，表示需要继续确认的同盟事务。",
					"复核数量会随同盟事务变化。",
				],
				"AllianceApplicationsReviewSummaryBlock"
			),
			_build_section_text_block(
				"处理提示",
				[
					"运行中协同单建议优先看执行态，待执行协同单建议优先看编排缺口。",
					"待回执战报当前先作为复核提醒，不在这一页展开战报详情。",
				],
				"AllianceApplicationsReviewHintBlock"
			),
		],
	}


func _build_applications_history_section(alliance_action_count: int, execution_replay_count: int, report_count: int, diplomacy_count: int) -> Dictionary:
	return {
		"summary_lines": [
			"历史页以归档卡片承接协同行动、回放和战报记录。",
			"当前先按正式反馈源数量聚合，不再只保留一串归档文本。",
		],
		"list_title": "归档卡片",
		"item_cards": [
			_build_section_item_card("本轮协同行动", str(alliance_action_count), "组织行动", "协同行动反馈是历史页的第一层正式来源。"),
			_build_section_item_card("执行回放归档", str(execution_replay_count), "行动复盘", "用于承接后续可回放的执行链历史。"),
			_build_section_item_card("战报归档", str(report_count), "战事记录", "战报数量先在这里固定为历史页的正式锚点。"),
			_build_section_item_card("外交协定", str(diplomacy_count), "外交往来", "后续可把同盟准入通过/拒绝继续并入这里。"),
		],
		"content_blocks": [
			_build_section_text_block(
				"历史摘要",
				[
					"历史记录按正式协同行动、执行回放与战报数量聚合。",
					"后续接真实申请流后，可把同盟准入的通过/拒绝也放进这里。",
				],
				"AllianceApplicationsHistorySummaryBlock"
			),
			_build_section_text_block(
				"归档说明",
				[
					"当前历史页先固定正式来源和数量关系，不在这一轮展开筛选与检索层。",
					"外交协定、执行回放和战报并列展示。",
				],
				"AllianceApplicationsHistoryArchiveBlock"
			),
		],
	}


func _build_nation_policy_section(owned_clusters: Array) -> Dictionary:
	var policy_cards: Array = [
		_build_section_item_card("资源政策", "立国后可用", "赛季永久加成", "提升占有城池资源收益。"),
		_build_section_item_card("军务政策", "立国后可用", "赛季永久加成", "提升组织协同效率。"),
		_build_section_item_card("内政政策", "立国后可用", "赛季永久加成", "提升建设或治理收益。"),
	]
	return {
		"summary_lines": [
			"政策页展示国家阶段的长期赛季加成。",
			"政策不是同盟短周期军略，完成后影响本赛季组织能力。",
		],
		"list_title": "政策节点",
		"item_cards": policy_cards,
		"content_blocks": [
			_build_section_card_grid_block(
				"政策树",
				policy_cards,
				"OrganizationPolicyTreeCardGridBlock",
				3
			),
			_build_section_text_block(
				"政策边界",
				[
					"同盟阶段显示为锁定，国家阶段展示可推进的政策树。",
					"已占城池 %s 个，可作为政策条件参考。" % str(owned_clusters.size()),
				],
				"OrganizationNationPolicySummaryBlock"
			),
		],
	}


func _build_policy_tree_section(owned_clusters: Array) -> Dictionary:
	var policy_read_model := _read_organization_bucket(["policy", "nationPolicy", "policies", "policyTree"])
	var nodes := _variant_array(policy_read_model.get("nodes", []))
	if nodes.is_empty():
		nodes = _build_policy_tree_nodes(owned_clusters)
	var completed_count := _count_policy_nodes_by_status(nodes, ["completed", "done", "已完成"])
	var available_count := _count_policy_nodes_by_status(nodes, ["available", "ready", "可研究", "进行中"])
	var item_cards: Array = [
		_build_section_item_card("政策节点", "%s 项" % str(nodes.size()), "政策树", "政策节点按国家成长路径展示。"),
		_build_section_item_card("已完成", "%s 项" % str(completed_count), "赛季永久加成", "完成状态由组织进度同步。"),
		_build_section_item_card("可推进", "%s 项" % str(available_count), "立国后推进", "国家阶段可推进赛季永久加成。"),
		_build_section_item_card("城池条件", "%s 城" % str(owned_clusters.size()), "推进条件", "政策条件由组织进度同步，不在 UI 本地判定。"),
	]
	return {
		"summary_lines": [
			"政策页使用可缩放政策树，底部多节点向上汇聚，符合赛季成长路径。",
			"当前政策节点 %s / 已占城池 %s。" % [str(nodes.size()), str(owned_clusters.size())],
		],
		"list_title": "政策树",
		"item_cards": item_cards,
		"content_blocks": [
			{
				"kind": "policy_tree_canvas",
				"title": "政策树",
				"node_name": "OrganizationPolicyTreeCanvasBlock",
				"nodes": nodes,
				"zoom_contract": "touch_mouse_drag_v1 + zoom_step_buttons_v1",
				"scale_range": "0.70-1.25",
				"source_mode": "nation_policy_read_model_tree_canvas_v1",
			},
		],
	}


func _build_policy_tree_nodes(owned_clusters: Array) -> Array:
	var city_count := owned_clusters.size()
	return [
		{"id": "season_core", "title": "王制纲领", "name": "赛季总策", "seal": "王", "meta": "最高政策 / 立国后", "description": "高阶政策更少，承接下层政策完成状态。", "tier": 0, "x": 700, "y": 24, "width": 260, "height": 96},
		{"id": "military_core", "parent": "season_core", "title": "军府纲领", "name": "军务中枢", "seal": "军", "meta": "高阶政策", "description": "统合军团与战区加成。", "tier": 1, "x": 520, "y": 165, "width": 240, "height": 88},
		{"id": "civil_core", "parent": "season_core", "title": "民政纲领", "name": "内政中枢", "seal": "政", "meta": "高阶政策", "description": "统合资源、城池和建设加成。", "tier": 1, "x": 900, "y": 165, "width": 240, "height": 88},
		{"id": "mobilize", "parent": "military_core", "title": "征调整备", "name": "待解锁", "seal": "征", "meta": "中阶政策", "description": "提升组织调动效率。", "tier": 2, "x": 245, "y": 310, "width": 230, "height": 86},
		{"id": "frontline", "parent": "military_core", "title": "前线军略", "name": "待解锁", "seal": "略", "meta": "中阶政策", "description": "提升战区协同效率。", "tier": 2, "x": 535, "y": 310, "width": 230, "height": 86},
		{"id": "granary", "parent": "civil_core", "title": "屯田令", "name": "进行中", "seal": "屯", "meta": "中阶政策", "description": "本赛季粮食产出加成；当前城池 %s。" % str(city_count), "tier": 2, "x": 825, "y": 310, "width": 230, "height": 86},
		{"id": "workshop", "parent": "civil_core", "title": "工坊令", "name": "待解锁", "seal": "工", "meta": "中阶政策", "description": "提升木材与铁矿收益。", "tier": 2, "x": 1115, "y": 310, "width": 230, "height": 86},
		{"id": "base_1", "parent": "mobilize", "title": "兵册清点", "name": "可研究", "seal": "兵", "meta": "底层政策", "description": "底层节点更多，便于赛季成长。", "tier": 3, "x": 80, "y": 470, "width": 200, "height": 80},
		{"id": "base_2", "parent": "mobilize", "title": "军粮预置", "name": "可研究", "seal": "粮", "meta": "底层政策", "description": "为上层军务政策铺路。", "tier": 3, "x": 315, "y": 470, "width": 200, "height": 80},
		{"id": "base_3", "parent": "frontline", "title": "斥候整备", "name": "可研究", "seal": "侦", "meta": "底层政策", "description": "提升前线情报效率。", "tier": 3, "x": 550, "y": 470, "width": 200, "height": 80},
		{"id": "base_4", "parent": "granary", "title": "仓廪修缮", "name": "可研究", "seal": "仓", "meta": "底层政策", "description": "提高城池资源承载。", "tier": 3, "x": 785, "y": 470, "width": 200, "height": 80},
		{"id": "base_5", "parent": "workshop", "title": "匠作调度", "name": "可研究", "seal": "匠", "meta": "底层政策", "description": "提高建设和供给效率。", "tier": 3, "x": 1020, "y": 470, "width": 200, "height": 80},
		{"id": "base_6", "parent": "workshop", "title": "市井税契", "name": "立国后", "seal": "市", "meta": "底层政策", "description": "连接市井与国家供给。", "tier": 3, "x": 1255, "y": 470, "width": 200, "height": 80},
	]


func _build_nation_market_section(owned_clusters: Array) -> Dictionary:
	var supply_items := _read_market_supply_items()
	var supply_cards: Array = []
	for raw_item in supply_items:
		if raw_item is Dictionary:
			supply_cards.append(_build_market_supply_card(raw_item as Dictionary))
	if supply_cards.is_empty():
		supply_cards = [
			_build_section_item_card("粮草", "立国后开放", "资源供给", "购买与扣费由府库结算。"),
			_build_section_item_card("木材", "立国后开放", "资源供给", "购买与库存由府库结算。"),
			_build_section_item_card("军需", "立国后开放", "组织供给", "不放进邮件页。"),
		]
	return {
		"summary_lines": [
			"市井页展示国家阶段的资源与军需供给。",
			"供给项按资源、库存、限购和用途分层排列。",
		],
		"list_title": "供给",
		"item_cards": supply_cards,
		"content_blocks": [
			{
				"kind": "market_supply",
				"title": "国家市井",
				"node_name": "OrganizationMarketSupplyCardGridBlock",
				"cards": supply_cards,
				"columns": 3,
				"categories": _build_market_supply_filter_chips(supply_cards),
				"currency_line": _build_market_currency_line(),
				"source_mode": "market_supply_read_model_card_grid_v3",
			},
			_build_section_text_block(
				"市井边界",
				[
					"市井不是邮件奖励，也不是系统邮件分类。",
					"这里承接国家组织供给、库存和购买状态。",
				],
				"OrganizationNationMarketSummaryBlock"
			),
		],
	}


func _build_nation_midgame_section(skeleton: Dictionary) -> Dictionary:
	var player_ui: Dictionary = skeleton.get("player_ui", {}) as Dictionary
	var stage_cards: Array = _variant_array(player_ui.get("stage_cards", []))
	var member_summary_card: Dictionary = player_ui.get("member_summary_card", {}) as Dictionary
	var content_cards: Array = []
	content_cards.append_array(stage_cards)
	if not member_summary_card.is_empty():
		content_cards.append(member_summary_card)
	var item_cards: Array = [
		_build_section_item_card(
			"国家中局",
			str(player_ui.get("primary_goal_text", "从同盟发育到东汉十三州"))
		),
	]
	if content_cards.is_empty():
		content_cards = item_cards.duplicate(true)
	return {
		"summary_lines": [],
		"item_cards": item_cards,
		"nation_midgame_frontend_skeleton": skeleton,
		"nation_midgame_player_ui": player_ui,
		"content_blocks": [
			_build_section_card_grid_block(
				str(player_ui.get("headline", "国家中局")),
				content_cards,
				"NationMidgameFrontendSkeletonBlock",
				2
			),
		],
	}


func _build_nation_midgame_frontend_skeleton(
	organization_kind: String,
	nation_tier: String,
	lifecycle_stage: String,
	nation_war_objective_model: Dictionary,
	organization_membership_model: Dictionary
) -> Dictionary:
	var objective_rows := _build_nation_midgame_objective_rows(nation_war_objective_model)
	var membership_cards := _build_membership_authority_cards(organization_membership_model)
	return {
		"contract_id": NATION_MIDGAME_FRONTEND_SKELETON_CONTRACT,
		"stage_chain": ["alliance", "kingdom", "empire"],
		"current_stage": _resolve_midgame_current_stage(organization_kind, nation_tier, lifecycle_stage),
		"stage_cards": _build_midgame_stage_cards(organization_kind, nation_tier, lifecycle_stage),
		"war_objective_contract_id": str(nation_war_objective_model.get("contractId", "")),
		"membership_contract_id": str(organization_membership_model.get("contractId", "")),
		"objective_rows": objective_rows,
		"objective_row_count": objective_rows.size(),
		"membership_authority_cards": membership_cards,
		"membership_authority_visible": str(organization_membership_model.get("contractId", "")) == "organization_membership_authority_v1" and not membership_cards.is_empty(),
		"player_ui": _build_nation_midgame_player_ui_copy(
			_resolve_midgame_current_stage(organization_kind, nation_tier, lifecycle_stage),
			objective_rows,
			membership_cards
		),
		"summary_lines": [
			"同盟、王国、帝国阶段由组织状态判断。",
			"国家目标覆盖州治、都城、洛阳、帝业和东汉十三州。",
			"成员、AI 玩家和官职席位已接入。",
		],
	}


func _build_nation_midgame_player_ui_copy(current_step: String, objective_rows: Array, member_rows: Array) -> Dictionary:
	var cards := _build_nation_midgame_player_stage_cards(current_step, objective_rows)
	var members := _build_nation_midgame_player_member_cards(member_rows)
	return {
		"contract_id": NATION_MIDGAME_PLAYER_UI_COPY_CONTRACT,
		"headline": "国家中局",
		"primary_goal_text": "从同盟发育到东汉十三州",
		"summary_text": "",
		"summary_lines": [],
		"stage_cards": cards,
		"member_cards": members,
		"member_summary_card": _build_nation_midgame_player_member_summary_card(members),
		"objective_route_cta": _build_nation_midgame_objective_route_cta(objective_rows),
	}


func _build_nation_midgame_objective_route_cta(objective_rows: Array) -> Dictionary:
	var luoyang_status := _player_objective_status_text(objective_rows, "luoyang_control")
	var target_subtitle := "东都要冲"
	if luoyang_status == "已达成":
		target_subtitle = "固守要地"
	elif luoyang_status == "推进中":
		target_subtitle = "争夺目标"
	return {
		"headline": "洛阳目标",
		"button_label": "进军洛阳",
		"button_tooltip": "前往洛阳目标",
		"target_label": "洛阳",
		"target_surface": "天下舆图",
		"target_subtitle": target_subtitle,
		"action_id": "open_tianxia_luoyang_target",
		"button_node_name": "NationMidgameLuoyangRouteButton",
	}


func _build_nation_midgame_player_stage_cards(current_stage: String, objective_rows: Array) -> Array:
	var region_status := _player_objective_status_text(objective_rows, "region_control")
	var capital_status := _player_objective_status_text(objective_rows, "state_capital")
	var luoyang_status := _player_objective_status_text(objective_rows, "luoyang_control")
	var unification_status := _player_objective_status_text(objective_rows, "east_han_unification")
	return [
		_build_section_item_card(
			"同盟发育",
			_player_stage_status_text(current_stage, "alliance", region_status)
		),
		_build_section_item_card(
			"建国称王",
			_player_stage_status_text(current_stage, "kingdom", capital_status)
		),
		_build_section_item_card(
			"晋升帝国",
			_player_stage_status_text(current_stage, "empire", _player_objective_status_text(objective_rows, "empire_status"))
		),
		_build_section_item_card(
			"东汉十三州",
			unification_status
		),
	]


func _build_nation_midgame_player_member_cards(member_rows: Array) -> Array:
	var player_count := _player_member_card_value(member_rows, "玩家席位")
	var ai_count := _player_member_card_value(member_rows, "AI 玩家")
	var officer_count := _player_member_card_value(member_rows, "官职授权")
	return [
		_build_section_item_card("成员", "玩家 %s / AI %s / 官职 %s" % [player_count, ai_count, officer_count]),
	]


func _build_nation_midgame_player_member_summary_card(member_cards: Array) -> Dictionary:
	var player_count := _player_member_card_value(member_cards, "玩家席位")
	var ai_count := _player_member_card_value(member_cards, "AI 玩家")
	var officer_count := _player_member_card_value(member_cards, "官职分工")
	return _build_section_item_card(
		"成员",
		"玩家 %s / AI %s / 官职 %s" % [player_count, ai_count, officer_count]
	)


func _player_objective_status_text(objective_rows: Array, objective_id: String) -> String:
	for raw_row in objective_rows:
		if not (raw_row is Dictionary):
			continue
		var row: Dictionary = raw_row as Dictionary
		if str(row.get("objective_id", "")).strip_edges() == objective_id:
			return _format_objective_status_label(str(row.get("status", "")))
	return "待推进"


func _player_stage_status_text(current_stage: String, stage_id: String, objective_status: String) -> String:
	if objective_status == "已达成":
		return "已达成"
	if stage_id == current_stage:
		return "今日推进"
	if _midgame_stage_index(stage_id) < _midgame_stage_index(current_stage):
		return "已解锁"
	return objective_status if objective_status != "" and objective_status != "缺读模型" else "待推进"


func _player_member_card_value(member_rows: Array, card_title: String) -> String:
	for raw_card in member_rows:
		if not (raw_card is Dictionary):
			continue
		var card: Dictionary = raw_card as Dictionary
		if str(card.get("title", "")).strip_edges() == card_title:
			return str(card.get("value", "0")).strip_edges()
	return "0"


func _build_midgame_stage_cards(organization_kind: String, nation_tier: String, lifecycle_stage: String) -> Array:
	var current_stage := _resolve_midgame_current_stage(organization_kind, nation_tier, lifecycle_stage)
	var cards: Array = []
	for stage_id in ["alliance", "kingdom", "empire"]:
		cards.append(_build_section_item_card(
			_format_midgame_stage_label(stage_id),
			"当前" if stage_id == current_stage else "已解锁" if _midgame_stage_index(stage_id) < _midgame_stage_index(current_stage) else "待推进",
			"alliance -> kingdom -> empire",
			"阶段状态来自组织 kind / lifecycle / nation tier。"
		))
	return cards


func _build_nation_midgame_objective_rows(nation_war_objective_model: Dictionary) -> Array:
	var rows: Array = []
	for objective_id in ["region_control", "state_capital", "luoyang_control", "empire_status", "east_han_unification"]:
		var objective := _read_nation_war_objective(nation_war_objective_model, objective_id)
		if objective.is_empty():
			rows.append({
				"objective_id": objective_id,
				"title": _format_objective_title(objective_id),
				"status": "missing",
				"authority": "read_model_missing",
				"description": "国家目标暂未送达。",
			})
			continue
		objective["objective_id"] = objective_id
		objective["title"] = str(objective.get("title", _format_objective_title(objective_id)))
		rows.append(objective)
	return rows


func _build_membership_authority_cards(organization_membership_model: Dictionary) -> Array:
	var members := _variant_array(organization_membership_model.get("members", []))
	var counts := {
		"player": 0,
		"ai_player": 0,
		"alliance_officer": 0,
		"faction_attribution": 0,
	}
	for raw_member in members:
		if not (raw_member is Dictionary):
			continue
		var member: Dictionary = raw_member as Dictionary
		var kind := str(member.get("memberKind", "")).strip_edges()
		if counts.has(kind):
			counts[kind] = int(counts.get(kind, 0)) + 1
	return [
		_build_section_item_card("玩家席位", str(int(counts.get("player", 0))), "玩家成员", "真人玩家成员。"),
		_build_section_item_card("AI 玩家", str(int(counts.get("ai_player", 0))), "势力成员", "AI 玩家归属当前势力。"),
		_build_section_item_card("官职授权", str(int(counts.get("alliance_officer", 0))), "官职席", "官员席位已接入。"),
	]


func _read_organization_membership_model(
	faction_state: Dictionary,
	commanders: Array,
	ai_players: Array,
	organization_kind: String,
	alliance_name: String,
	nation_tier: String
) -> Dictionary:
	var candidates: Array = [
		_world_data.get("organizationMembershipReadModel", {}),
		_world_data.get("organizationMembership", {}),
		_world_data.get("organization_membership_read_model", {}),
		faction_state.get("organizationMembershipReadModel", {}),
		faction_state.get("organizationMembership", {}),
		faction_state.get("organization_membership_read_model", {}),
	]
	for candidate in candidates:
		if candidate is Dictionary and str((candidate as Dictionary).get("contractId", "")) == "organization_membership_authority_v1":
			return (candidate as Dictionary).duplicate(true)
	var members: Array = [
		{
			"memberKind": "player",
			"displayName": "玩家主控",
			"authoritySource": "session_player",
		},
	]
	for ai_player in ai_players:
		if ai_player is Dictionary:
			members.append({
				"memberKind": "ai_player",
				"displayName": str((ai_player as Dictionary).get("name", (ai_player as Dictionary).get("id", "AI 玩家"))),
				"aiPlayerId": str((ai_player as Dictionary).get("id", "")),
				"authoritySource": "world_faction_ai_players",
			})
	for commander in commanders.slice(0, 2):
		if commander is Dictionary:
			members.append({
				"memberKind": "alliance_officer",
				"displayName": str((commander as Dictionary).get("name", (commander as Dictionary).get("id", "官员"))),
				"commanderId": str((commander as Dictionary).get("id", "")),
				"authoritySource": "alliance_officer_authority_table",
			})
	members.append({
		"memberKind": "faction_attribution",
		"displayName": alliance_name,
		"authoritySource": "world_faction_organization_attribution",
	})
	return {
		"contractId": "organization_membership_authority_v1",
		"organizationKind": organization_kind,
		"organizationName": alliance_name,
		"nationTier": nation_tier,
		"authoritySource": "world_faction_alliance_membership_read_model",
		"members": members,
	}


func _build_coordination_board_section(directives: Array, status_counts: Dictionary) -> Dictionary:
	var item_cards: Array = []
	for raw_directive in directives.slice(0, 4):
		var directive: Dictionary = raw_directive as Dictionary
		var region_label := _format_region_label(str(directive.get("regionId", "")))
		var stance_label := _format_stance_label(str(directive.get("stance", "")))
		var support_level := int(directive.get("supportLevel", 0))
		item_cards.append(_build_section_item_card(
			region_label,
			stance_label,
			"支援 %s" % str(support_level),
			"低支援待补" if support_level < 70 else "协同态稳定"
		))
	if item_cards.is_empty():
		item_cards.append(_build_section_item_card("暂无协同目标", "待命", "当前暂无组织目标", "协同目标更新后会刷新。"))
	var actions: Array = _build_directive_actions(directives)
	var content_blocks: Array = [
		_build_section_text_block(
			"目标摘要",
			[
				"目标看板展示组织协同目标，不再写死攻城、驻点和补给样例。",
				"总目标 %s / 低支援 %s / 待执行 %s / 进行中 %s / 已完成 %s。" % [
					str(directives.size()),
					str(_count_low_support_directives(directives)),
					str(int(status_counts.get("queued", 0))),
					str(int(status_counts.get("running", 0))),
					str(int(status_counts.get("completed", 0))),
				],
			],
			"AllianceCoordinationBoardSummaryBlock"
		),
	]
	if not actions.is_empty():
		content_blocks.append({
			"kind": "button_row",
			"title": "姿态调整",
			"actions": actions,
			"node_name": "AllianceCoordinationBoardActionBlock",
		})
	var footer_lines := _build_directive_action_footer_lines(directives)
	if not footer_lines.is_empty():
		content_blocks.append(_build_section_text_block(
			"动作说明",
			footer_lines,
			"AllianceCoordinationBoardFooterBlock"
		))
	return {
		"summary_lines": [
			"协同看板以目标卡片和姿态按钮呈现。",
			"只开放前 %s 个正式协同目标的姿态调整。" % str(DIRECTIVE_ACTION_LIMIT),
		],
		"item_cards": item_cards,
		"content_blocks": content_blocks,
	}

func _build_coordination_progress_section(player_execution: Dictionary, status_counts: Dictionary, directives: Array) -> Dictionary:
	var item_cards: Array = [
		_build_section_item_card("待执行", str(int(status_counts.get("queued", 0))), "执行状态", "当前待进入正式执行链的协同目标。"),
		_build_section_item_card("进行中", str(int(status_counts.get("running", 0))), "执行状态", "当前处于执行中的正式协同目标。"),
		_build_section_item_card("已完成", str(int(status_counts.get("completed", 0))), "执行状态", "当前已经收口到完成态的协同目标。"),
		_build_section_item_card("低支援目标", str(_count_low_support_directives(directives)), "风险状态", "当前需要补支援或调整姿态的目标数量。"),
	]
	var progress_lines: Array[String] = []
	if not player_execution.is_empty():
		progress_lines.append("当前战略命令：%s" % str(player_execution.get("strategicCommand", "无")))
		progress_lines.append("计划来源：组织计划")
	else:
		progress_lines.append("当前无执行单，进度先按协同目标和状态计数展示。")
	return {
		"summary_lines": [
			"执行进度以进度卡片展示各类协同状态。",
			"总目标 %s / 当前执行单 %s。" % [str(directives.size()), "已接入" if not player_execution.is_empty() else "未接入"],
		],
		"item_cards": item_cards,
		"content_blocks": [
			_build_section_text_block(
				"进度摘要",
				progress_lines,
				"AllianceCoordinationProgressSummaryBlock"
			),
			_build_section_text_block(
				"结构说明",
				[
					"进度页当前固定为状态卡片 + 执行说明块。",
					"逐目标里程碑补齐后会继续细分。",
				],
				"AllianceCoordinationProgressStructureBlock"
			),
		],
	}

func _build_coordination_log_section(alliance_actions: Array, execution_replays: Array) -> Dictionary:
	var item_cards: Array = []
	var log_rows: Array = []
	var read_model_entries := _read_organization_log_items()
	for raw_entry in read_model_entries.slice(0, 8):
		if not (raw_entry is Dictionary):
			continue
		var entry: Dictionary = raw_entry as Dictionary
		item_cards.append(_build_section_item_card(
			str(entry.get("event", entry.get("title", "组织日志"))),
			str(entry.get("type", "日志")),
			str(entry.get("actor", "组织")),
			str(entry.get("detail", entry.get("description", "组织日志记录。")))
		))
		log_rows.append({
			"time": str(entry.get("time", entry.get("tick", "--"))),
			"type": str(entry.get("type", "组织记录")),
			"actor": str(entry.get("actor", entry.get("source", "组织"))),
			"event": str(entry.get("event", entry.get("title", "组织日志"))),
			"detail": str(entry.get("detail", entry.get("description", "组织日志记录。"))),
		})
	if log_rows.is_empty():
		for raw_action in alliance_actions.slice(0, 4):
			var action: Dictionary = raw_action as Dictionary
			item_cards.append(_build_section_item_card(
				str(action.get("title", "协同行动")),
				"执行日志",
				str(action.get("detail", "")),
				"协同日志优先展示组织行动。"
			))
			log_rows.append({
				"time": "近期记录",
				"type": str(action.get("type", action.get("severity", "行动"))),
				"actor": str(action.get("actorName", action.get("source", "组织"))),
				"event": str(action.get("title", "协同行动")),
				"detail": str(action.get("detail", "已记录到组织日志。")),
			})
	if item_cards.is_empty():
		for raw_replay in execution_replays.slice(0, 4):
			var replay: Dictionary = raw_replay as Dictionary
			item_cards.append(_build_section_item_card(
				str(replay.get("strategicCommand", "执行回放")),
				"近期复盘",
				"执行回放",
				"当前组织行动为空时，先展示执行回放入口。"
			))
			log_rows.append({
				"time": "近期复盘",
				"type": "执行回放",
				"actor": str(replay.get("source", "组织")),
				"event": str(replay.get("strategicCommand", "执行回放")),
				"detail": "当前组织行动为空时，先展示执行回放入口。",
			})
	if item_cards.is_empty():
		item_cards.append(_build_section_item_card(
			"暂无协同日志",
			"待接入",
			"当前暂无协同日志",
			"协同行动或执行回放更新后会刷新。"
		))
	if log_rows.is_empty():
		log_rows.append({
			"time": "今日",
			"type": "组织记录",
			"actor": "系统",
			"event": "等待日志回写",
			"detail": "当前暂无协同日志，时间线保持可用。",
		})
	return {
		"summary_lines": [
			"组织日志按时间线展示成员、官员和协同行动记录。",
			"组织行动 %s / 复盘记录 %s。" % [str(alliance_actions.size()), str(execution_replays.size())],
		],
		"item_cards": item_cards,
		"content_blocks": [
			{
				"kind": "timeline_cards",
				"title": "组织日志",
				"node_name": "OrganizationLogFilterTimelineBlock",
				"rows": log_rows,
				"filters": _build_log_filter_chips(log_rows),
				"filter_contract": "organization_log_report_filter_strip_v1",
				"source_mode": "organization_log_read_model_or_feedback_actions_v1",
			},
			_build_section_text_block(
				"日志摘要",
				[
					"日志用于追溯谁进入组织、谁被任命、哪条行动被执行。",
					"重要事件可以在右侧时间线中快速扫读。",
				],
				"AllianceCoordinationLogSummaryBlock"
			),
		],
	}


func _build_section_item_card(title: String, value: String, meta: String = "", description: String = "") -> Dictionary:
	return {
		"title": title,
		"value": value,
		"meta": meta,
		"description": description,
	}


func _build_section_text_block(title: String, lines: Array, node_name: String) -> Dictionary:
	return {
		"kind": "text_block",
		"title": title,
		"lines": lines,
		"node_name": node_name,
	}


func _build_section_table_block(title: String, columns: Array, rows: Array, node_name: String) -> Dictionary:
	return {
		"kind": "table_block",
		"title": title,
		"columns": columns,
		"rows": rows,
		"node_name": node_name,
	}


func _build_table_column(column_id: String, label: String, min_width: int) -> Dictionary:
	return {
		"id": column_id,
		"label": label,
		"min_width": min_width,
	}


func _build_section_card_grid_block(title: String, cards: Array, node_name: String, columns: int = 2) -> Dictionary:
	return {
		"kind": "card_grid",
		"title": title,
		"cards": cards,
		"columns": maxi(1, columns),
		"node_name": node_name,
	}

func _collect_directive_dicts(directives_by_region: Dictionary) -> Array:
	var directives: Array = []
	for region_id_variant in directives_by_region.keys():
		var region_id: String = str(region_id_variant).strip_edges()
		if region_id == "":
			continue
		var raw_directive: Variant = directives_by_region.get(region_id_variant, {})
		var directive: Dictionary = raw_directive as Dictionary if raw_directive is Dictionary else {}
		var directive_copy: Dictionary = directive.duplicate(true)
		directive_copy["regionId"] = str(directive_copy.get("regionId", region_id))
		directives.append(directive_copy)
	return directives

func _collect_owned_city_clusters(city_clusters: Array) -> Array:
	var owned_clusters: Array = []
	for raw_cluster in city_clusters:
		var cluster: Dictionary = raw_cluster as Dictionary
		if _target_faction_id != "" and str(cluster.get("owner", "")) != _target_faction_id:
			continue
		owned_clusters.append(cluster)
	return owned_clusters

func _group_city_clusters_by_district(city_clusters: Array) -> Dictionary:
	var district_groups: Dictionary = {}
	for raw_cluster in city_clusters:
		var cluster: Dictionary = raw_cluster as Dictionary
		var district_id: String = str(cluster.get("district", "unknown")).strip_edges()
		if district_id == "":
			district_id = "unknown"
		if not district_groups.has(district_id):
			district_groups[district_id] = []
		(district_groups[district_id] as Array).append(cluster)
	return district_groups

func _build_order_status_counts(orders: Array) -> Dictionary:
	var counts: Dictionary = {
		"queued": 0,
		"running": 0,
		"completed": 0,
	}
	for raw_order in orders:
		var order: Dictionary = raw_order as Dictionary
		var status_id: String = str(order.get("status", "")).strip_edges().to_lower()
		if counts.has(status_id):
			counts[status_id] = int(counts.get(status_id, 0)) + 1
	return counts

func _count_low_support_directives(directives: Array) -> int:
	var low_support_count: int = 0
	for raw_directive in directives:
		var directive: Dictionary = raw_directive as Dictionary
		if int(directive.get("supportLevel", 0)) < 70:
			low_support_count += 1
	return low_support_count


func _build_directive_actions(directives: Array) -> Array:
	var actions: Array = []
	for raw_directive in directives.slice(0, DIRECTIVE_ACTION_LIMIT):
		var directive: Dictionary = raw_directive as Dictionary
		var region_id: String = str(directive.get("regionId", "")).strip_edges()
		var current_stance: String = str(directive.get("stance", "")).strip_edges()
		if region_id == "":
			continue
		for stance_id_variant in DIRECTIVE_ACTION_STANCE_ORDER:
			var stance_id: String = str(stance_id_variant).strip_edges()
			if stance_id == "":
				continue
			actions.append({
				"id": "directive|%s|%s" % [region_id, stance_id],
				"label": "%s -> %s" % [_format_region_label(region_id), _format_stance_label(stance_id)],
				"disabled": current_stance == stance_id,
			})
	return actions


func _build_directive_action_footer_lines(directives: Array) -> Array:
	if directives.is_empty():
		return []
	var footer_lines: Array = [
		"当前只开放前 %s 个正式协同目标的姿态切换按钮，避免主面板一次堆叠过多控制项。" % str(DIRECTIVE_ACTION_LIMIT),
	]
	if directives.size() > DIRECTIVE_ACTION_LIMIT:
		footer_lines.append("其余目标仍保留在列表里展示，后续再补更细的选中态和逐目标控制。")
	return footer_lines

func _summarize_cluster_names(city_clusters: Array) -> String:
	var names: Array = []
	for raw_cluster in city_clusters.slice(0, 3):
		var cluster: Dictionary = raw_cluster as Dictionary
		names.append(str(cluster.get("name", "城池")))
	var summary: String = " / ".join(names)
	if city_clusters.size() > names.size():
		summary = "%s 等 %s 城" % [summary, str(city_clusters.size())]
	return summary

func _resolve_home_city_name(faction_state: Dictionary, owned_clusters: Array) -> String:
	var hero_command: Dictionary = faction_state.get("heroCommand", {}) as Dictionary
	var home_tile_id: String = str(hero_command.get("homeTileId", ""))
	var primary_cluster: Dictionary = _find_primary_city_cluster(owned_clusters, home_tile_id)
	var city_name: String = str(primary_cluster.get("name", "")).strip_edges()
	if city_name == "":
		city_name = _read_tile_name(home_tile_id)
	if city_name == "":
		city_name = "主城待识别"
	return city_name

func _resolve_officer_title(specialty_id: String) -> String:
	match specialty_id:
		"frontier":
			return "别部司马"
		"recon":
			return "候曹掾"
		"resource":
			return "仓曹掾"
		_:
			return "从事"


func _first_non_empty(candidates: Array) -> String:
	for candidate in candidates:
		var value := str(candidate).strip_edges()
		if value != "":
			return value
	return ""


func _resolve_faction_label() -> String:
	var faction_state: Dictionary = _read_target_faction_state()
	return _first_non_empty([
		faction_state.get("factionName", ""),
		faction_state.get("name", ""),
		_target_faction_id,
		"风华",
	])


func _normalize_result_text(value: String) -> String:
	var normalized := value.strip_edges().to_lower()
	match normalized:
		"win", "victory", "success", "won", "胜利":
			return "胜"
		"loss", "lose", "lost", "defeat", "失败":
			return "败"
		"draw", "tie", "平局":
			return "平"
		"pending", "running", "queued", "unknown", "":
			return "未结"
		_:
			return value.strip_edges() if value.strip_edges() != "" else "未结"


func _variant_array(raw_value: Variant) -> Array:
	if raw_value is Array:
		return raw_value as Array
	return []


func _read_organization_bucket(keys: Array) -> Dictionary:
	var alliance_data: Dictionary = _world_data.get("alliance", {}) as Dictionary
	var faction_state := _read_target_faction_state()
	var candidates: Array = [
		_world_data.get("organizationReadModel", {}),
		_world_data.get("organization", {}),
		_world_data.get("nationReadModel", {}),
		_world_data.get("nation", {}),
		alliance_data.get("organizationReadModel", {}),
		alliance_data.get("organization", {}),
		alliance_data.get("nationReadModel", {}),
		alliance_data.get("nation", {}),
		alliance_data.get("readModel", {}),
		faction_state.get("organizationReadModel", {}),
		faction_state.get("organization", {}),
		faction_state.get("nationReadModel", {}),
		faction_state.get("nation", {}),
		faction_state.get("readModel", {}),
		alliance_data,
		faction_state,
	]
	for candidate in candidates:
		if not (candidate is Dictionary):
			continue
		var bucket: Dictionary = candidate as Dictionary
		for key_variant in keys:
			var key := str(key_variant).strip_edges()
			if key == "":
				continue
			var value: Variant = bucket.get(key, {})
			if value is Dictionary:
				return value as Dictionary
	return {}


func _read_nation_war_objective_model(faction_state: Dictionary) -> Dictionary:
	var candidates: Array = [
		_world_data.get("nationReadModel", {}),
		_world_data.get("nationWarObjectiveReadModel", {}),
		_world_data.get("nationWarObjectives", {}),
		faction_state.get("nationReadModel", {}),
		faction_state.get("nationWarObjectiveReadModel", {}),
		faction_state.get("nationWarObjectives", {}),
	]
	for candidate in candidates:
		if not (candidate is Dictionary):
			continue
		var model: Dictionary = candidate as Dictionary
		if str(model.get("contractId", "")) == "nation_war_objective_read_model_v1":
			return model.duplicate(true)
		var nested: Variant = model.get("warObjectives", model.get("nationWarObjectives", {}))
		if nested is Dictionary and str((nested as Dictionary).get("contractId", "")) == "nation_war_objective_read_model_v1":
			return (nested as Dictionary).duplicate(true)
	return {}


func _read_nation_war_objective(model: Dictionary, objective_id: String) -> Dictionary:
	var objectives := _variant_array(model.get("objectives", []))
	for raw_objective in objectives:
		if not (raw_objective is Dictionary):
			continue
		var objective: Dictionary = raw_objective as Dictionary
		if str(objective.get("objectiveId", "")) == objective_id:
			return objective.duplicate(true)
	return {}


func _read_organization_log_items() -> Array:
	var log_read_model := _read_organization_bucket(["logs", "organizationLogs", "auditLog", "battleLog"])
	for key in ["entries", "items", "rows", "logs"]:
		var items := _variant_array(log_read_model.get(key, []))
		if not items.is_empty():
			return items
	return []


func _count_organization_log_entries(alliance_actions: Array, execution_replays: Array) -> int:
	var read_model_count := _read_organization_log_items().size()
	if read_model_count > 0:
		return read_model_count
	return alliance_actions.size() + execution_replays.size()


func _read_market_supply_items() -> Array:
	var market_read_model := _read_organization_bucket(["market", "nationMarket", "marketSupply", "marketSupplies"])
	for key in ["supplies", "offers", "items", "cards"]:
		var items := _variant_array(market_read_model.get(key, []))
		if not items.is_empty():
			return items
	return []


func _build_market_supply_card(item: Dictionary) -> Dictionary:
	var title := _first_non_empty([item.get("displayName", ""), item.get("name", ""), item.get("title", ""), item.get("id", ""), "供给"])
	var stock := _first_non_empty([item.get("stockLabel", ""), item.get("stock", ""), item.get("limit", ""), "库存待回写"])
	var category := _first_non_empty([item.get("category", ""), item.get("type", ""), "资源供给"])
	var price := _first_non_empty([item.get("priceLabel", ""), item.get("costLabel", ""), item.get("price", ""), item.get("cost", ""), "价格由府库结算"])
	var description := _first_non_empty([item.get("description", ""), item.get("note", ""), "购买、扣费、限购和刷新均由府库处理。"])
	return _build_section_item_card(title, stock, "%s | %s" % [category, price], description)


func _build_market_supply_filter_chips(cards: Array) -> Array:
	return [
		{"label": "全部", "value": "%s" % str(cards.size()), "active": true},
		{"label": "资源", "value": ""},
		{"label": "军需", "value": ""},
		{"label": "限购", "value": ""},
	]


func _build_market_currency_line() -> String:
	var market_read_model := _read_organization_bucket(["market", "nationMarket", "marketSupply", "marketSupplies"])
	var currency_line := str(market_read_model.get("currencyLine", market_read_model.get("currency_line", ""))).strip_edges()
	if currency_line != "":
		return currency_line
	var currencies: Variant = market_read_model.get("currencies", {})
	if currencies is Dictionary:
		var parts: Array[String] = []
		for key_variant in (currencies as Dictionary).keys():
			parts.append("%s %s" % [str(key_variant), str((currencies as Dictionary).get(key_variant))])
		if not parts.is_empty():
			return "府库：" + " / ".join(parts)
	return "府库余额、库存刷新和购买结算由府库同步。"


func _build_log_filter_chips(rows: Array) -> Array:
	var member_count := 0
	var officer_count := 0
	var diplomacy_count := 0
	var battle_count := 0
	for raw_row in rows:
		if not (raw_row is Dictionary):
			continue
		var text := "%s %s" % [str((raw_row as Dictionary).get("type", "")), str((raw_row as Dictionary).get("event", ""))]
		if text.contains("成员") or text.contains("AI"):
			member_count += 1
		if text.contains("官") or text.contains("任免"):
			officer_count += 1
		if text.contains("外交") or text.contains("友好") or text.contains("敌对"):
			diplomacy_count += 1
		if text.contains("战") or text.contains("战报"):
			battle_count += 1
	return [
		{"label": "全部", "value": "%s" % str(rows.size()), "active": true},
		{"label": "成员", "value": "%s" % str(member_count)},
		{"label": "官员", "value": "%s" % str(officer_count)},
		{"label": "外交", "value": "%s" % str(diplomacy_count)},
		{"label": "战报", "value": "%s" % str(battle_count)},
	]


func _build_battle_report_filter_chips(report_rows: Array) -> Array:
	var win_count := 0
	var pending_count := 0
	for raw_report in report_rows:
		if not (raw_report is Dictionary):
			continue
		var result_text := _normalize_result_text(str((raw_report as Dictionary).get("result", (raw_report as Dictionary).get("outcome", ""))))
		if result_text == "胜":
			win_count += 1
		if result_text == "未结":
			pending_count += 1
	return [
		{"label": "全部", "value": "%s" % str(report_rows.size()), "active": true},
		{"label": "胜报", "value": "%s" % str(win_count)},
		{"label": "未结", "value": "%s" % str(pending_count)},
	]


func _count_policy_nodes_by_status(nodes: Array, statuses: Array) -> int:
	var count := 0
	for raw_node in nodes:
		if not (raw_node is Dictionary):
			continue
		var node: Dictionary = raw_node as Dictionary
		var state_text := "%s %s" % [str(node.get("status", "")), str(node.get("name", ""))]
		var normalized := state_text.to_lower()
		for status_variant in statuses:
			var status_text := str(status_variant).to_lower()
			if status_text != "" and normalized.contains(status_text):
				count += 1
				break
	return count


func _format_specialty_label(specialty_id: String) -> String:
	match specialty_id:
		"frontier":
			return "前线组"
		"recon":
			return "侦察组"
		"resource":
			return "拓展组"
		_:
			return "待命组"

func _format_stance_label(stance_id: String) -> String:
	match stance_id:
		"support":
			return "策应"
		"harass":
			return "袭扰"
		"hold":
			return "固守"
		"expand":
			return "推进"
		_:
			return stance_id if stance_id != "" else "待命"

func _format_relation_label(relation_id: String) -> String:
	match relation_id:
		"friendly", "ally", "alliance", "ceasefire":
			return "友好"
		"hostile", "enemy", "war":
			return "敌对"
		"neutral":
			return "中立"
		_:
			return relation_id if relation_id != "" else "中立"


func _resolve_midgame_current_stage(organization_kind: String, nation_tier: String, lifecycle_stage: String) -> String:
	if organization_kind == "nation" and nation_tier == "empire":
		return "empire"
	if organization_kind == "nation":
		return "kingdom"
	if lifecycle_stage == "eligible_to_found_nation":
		return "alliance"
	return "alliance"


func _midgame_stage_index(stage_id: String) -> int:
	match stage_id:
		"alliance":
			return 0
		"kingdom":
			return 1
		"empire":
			return 2
		_:
			return -1


func _format_midgame_stage_label(stage_id: String) -> String:
	match stage_id:
		"alliance":
			return "同盟"
		"kingdom":
			return "王国"
		"empire":
			return "帝国"
		_:
			return stage_id


func _format_objective_title(objective_id: String) -> String:
	match objective_id:
		"region_control":
			return "区域攻伐"
		"state_capital":
			return "州治控制"
		"luoyang_control":
			return "洛阳控制"
		"empire_status":
			return "帝国状态"
		"east_han_unification":
			return "东汉十三州统一"
		_:
			return objective_id


func _format_objective_status_label(status: String) -> String:
	match status.strip_edges().to_lower():
		"achieved":
			return "已达成"
		"active":
			return "推进中"
		"locked":
			return "未解锁"
		"missing":
			return "缺读模型"
		_:
			return status if status != "" else "未知"


func _format_region_label(region_id: String) -> String:
	if region_id == "":
		return "未定区域"
	var words: Array = region_id.replace("_", " ").split(" ")
	var normalized_words: Array = []
	for raw_word in words:
		var word: String = str(raw_word).strip_edges()
		if word == "":
			continue
		normalized_words.append(word.capitalize())
	return " ".join(normalized_words)

func _format_district_label(district_id: String) -> String:
	if district_id == "":
		return "未知州郡"
	match district_id:
		"sili":
			return "司隶"
		"jizhou":
			return "冀州"
		"jingzhou":
			return "荆州"
		"yanzhou":
			return "兖州"
		_:
			return district_id.capitalize()


func _resolve_organization_display_name(alliance_data: Dictionary, faction_state: Dictionary, organization_kind: String) -> String:
	var resolved_name := ""
	if organization_kind == "nation":
		resolved_name = _first_non_empty([
			faction_state.get("nationName", ""),
			faction_state.get("organizationName", ""),
			alliance_data.get("nationName", ""),
			alliance_data.get("organizationName", ""),
			alliance_data.get("name", ""),
		])
	else:
		resolved_name = _first_non_empty([
			alliance_data.get("name", ""),
			faction_state.get("organizationName", ""),
			faction_state.get("factionName", ""),
			faction_state.get("name", ""),
		])
	if resolved_name != "":
		return resolved_name
	return "%s同盟" % (_target_faction_id if _target_faction_id != "" else "原生SLG")


func _resolve_organization_kind(alliance_data: Dictionary, faction_state: Dictionary = {}) -> String:
	var raw_kind := str(faction_state.get("organizationKind", faction_state.get("kind", ""))).strip_edges().to_lower()
	if raw_kind == "":
		raw_kind = str(alliance_data.get("kind", alliance_data.get("organizationKind", ""))).strip_edges().to_lower()
	if raw_kind == "nation":
		return "nation"
	var raw_stage := str(faction_state.get("organizationLifecycleStage", faction_state.get("lifecycleStage", faction_state.get("phase", "")))).strip_edges().to_lower()
	if raw_stage == "":
		raw_stage = str(alliance_data.get("lifecycleStage", alliance_data.get("phase", ""))).strip_edges().to_lower()
	if raw_stage == "nation" or raw_stage == "founded":
		return "nation"
	return "alliance"


func _resolve_lifecycle_stage(organization_kind: String, owned_commandery_count: int, organization_level: int = 1) -> String:
	if organization_kind == "nation":
		return "nation"
	if _can_found_kingdom(organization_level, owned_commandery_count):
		return "eligible_to_found_nation"
	return "alliance"


func _can_found_kingdom(organization_level: int, owned_commandery_count: int) -> bool:
	return organization_level >= 20 and owned_commandery_count >= 1


func _count_owned_commanderies(owned_clusters: Array) -> int:
	var commanderies: Dictionary = {}
	for raw_cluster in owned_clusters:
		var cluster: Dictionary = raw_cluster as Dictionary
		var district_id := str(cluster.get("district", "")).strip_edges()
		if district_id == "":
			district_id = str(cluster.get("commanderyId", "")).strip_edges()
		if district_id == "":
			district_id = "unknown"
		commanderies[district_id] = true
	return commanderies.size()


func _resolve_state_name(faction_state: Dictionary, owned_clusters: Array) -> String:
	var direct_state := str(faction_state.get("stateName", faction_state.get("homeStateName", ""))).strip_edges()
	if direct_state != "":
		return direct_state
	if not owned_clusters.is_empty():
		var cluster: Dictionary = owned_clusters[0] as Dictionary
		var district_id := str(cluster.get("district", "")).strip_edges()
		if district_id != "":
			return _format_district_label(district_id)
	return "青州"


func _resolve_organization_level(alliance_data: Dictionary, owned_clusters: Array) -> int:
	var raw_level = alliance_data.get("level", alliance_data.get("organizationLevel", 0))
	var level := int(raw_level) if raw_level != null else 0
	return maxi(1, level if level > 0 else 1 + owned_clusters.size())


func _resolve_organization_exp(alliance_data: Dictionary, owned_clusters: Array) -> int:
	var raw_exp = alliance_data.get("exp", alliance_data.get("organizationExp", -1))
	var exp_value := int(raw_exp) if raw_exp != null else -1
	if exp_value >= 0:
		return exp_value
	return owned_clusters.size() * 2500


func _resolve_organization_exp_required(alliance_data: Dictionary, owned_clusters: Array) -> int:
	var raw_required = alliance_data.get("expRequired", alliance_data.get("organizationExpRequired", 0))
	var required := int(raw_required) if raw_required != null else 0
	return maxi(required, maxi(1, (owned_clusters.size() + 2) * 5000))


func _resolve_organization_power(faction_state: Dictionary, owned_clusters: Array, directives: Array) -> int:
	var direct_power := int(faction_state.get("power", faction_state.get("factionPower", 0)))
	if direct_power > 0:
		return direct_power
	return owned_clusters.size() * 12000 + directives.size() * 3500


func _build_announcement_body(alliance_name: String, organization_kind: String, owned_commandery_count: int, directive_count: int) -> String:
	if organization_kind == "nation":
		return "%s已进入国家阶段，政策与市井在国家页展示。" % alliance_name
	if owned_commandery_count > 0:
		return "%s已满足立国基础条件，可查看立国清单；协同目标 %s。" % [alliance_name, str(directive_count)]
	return "%s仍处于同盟阶段，优先扩展城池与协同目标后再立国。" % alliance_name


func _build_recent_log_lines(alliance_actions: Array, execution_replays: Array, ai_players: Array) -> Array[String]:
	var lines: Array[String] = []
	if not ai_players.is_empty():
		lines.append("AI 玩家席位 %s 个，已进入组织名册候选。" % str(ai_players.size()))
	for raw_action in alliance_actions.slice(0, 2):
		var action: Dictionary = raw_action as Dictionary
		var title := str(action.get("title", action.get("type", "协同行动"))).strip_edges()
		if title != "":
			lines.append("组织行动：%s" % title)
	if lines.is_empty() and not execution_replays.is_empty():
		lines.append("执行回放 %s 条，等待组织日志归档。" % str(execution_replays.size()))
	if lines.is_empty():
		lines.append("暂无成员加入、AI 玩家加入或官员任免记录。")
	return lines


func _build_recent_report_lines(reports: Array, battle_records: Array) -> Array[String]:
	var lines: Array[String] = []
	for raw_report in reports.slice(0, 2):
		var report: Dictionary = raw_report as Dictionary
		var title := str(report.get("title", report.get("id", "组织战报"))).strip_edges()
		if title != "":
			lines.append(title)
	if lines.is_empty() and not battle_records.is_empty():
		lines.append("战斗记录 %s 条，等待组织战报整理。" % str(battle_records.size()))
	if lines.is_empty():
		lines.append("暂无组织战报。")
	return lines


func _build_found_nation_requirement_lines(can_found_nation: bool, owned_commandery_count: int, _member_count: int, organization_level: int = 1) -> Array[String]:
	var lines: Array[String] = []
	lines.append("王国条件：同盟等级 %s / 20%s" % [str(organization_level), "（已满足）" if organization_level >= 20 else ""])
	lines.append("占有郡：%s / 1%s" % [str(owned_commandery_count), "（已满足）" if owned_commandery_count > 0 else ""])
	if not can_found_nation:
		lines.append("未满足王国条件")
	return lines


func _build_empire_upgrade_requirement_lines(organization_level: int, owned_commandery_count: int) -> Array[String]:
	return [
		"帝国升级：王国等级 %s / 90" % str(organization_level),
		"州治：1 / 1（需正式州治占领读模型）",
		"郡城：%s / 10" % str(owned_commandery_count),
		"费用：200 玉符",
	]


func _resolve_nation_tier(faction_state: Dictionary, organization_kind: String) -> String:
	if organization_kind != "nation":
		return "alliance"
	var tier := str(faction_state.get("nationTier", faction_state.get("nation_tier", ""))).strip_edges().to_lower()
	if tier == "empire":
		return "empire"
	return "kingdom"


func _read_target_faction_state() -> Dictionary:
	var raw_factions: Variant = _world_data.get("factions", {})
	if raw_factions is Dictionary and _target_faction_id != "":
		var faction_state: Variant = (raw_factions as Dictionary).get(_target_faction_id, {})
		if faction_state is Dictionary:
			return faction_state
	return {}

func _read_city_clusters() -> Array:
	var layout_map: Dictionary = _map_layout_data.get("map", {}) as Dictionary
	var layout_overlays: Dictionary = layout_map.get("overlays", {}) as Dictionary
	var direct_layout_overlays: Dictionary = _map_layout_data.get("overlays", {}) as Dictionary
	var world_map: Dictionary = _world_data.get("map", {}) as Dictionary
	var world_overlays: Dictionary = world_map.get("overlays", {}) as Dictionary
	var candidates: Array = [
		layout_overlays.get("cityClusters", []),
		direct_layout_overlays.get("cityClusters", []),
		world_overlays.get("cityClusters", []),
	]
	for candidate in candidates:
		if candidate is Array and not (candidate as Array).is_empty():
			return candidate
	return []

func _find_primary_city_cluster(city_clusters: Array, home_tile_id: String) -> Dictionary:
	for raw_cluster in city_clusters:
		var cluster: Dictionary = raw_cluster as Dictionary
		if str(cluster.get("centerTileId", "")) == home_tile_id or str(cluster.get("cityHallTileId", "")) == home_tile_id:
			return cluster
		var tile_ids: Variant = cluster.get("tileIds", [])
		if tile_ids is Array and home_tile_id in (tile_ids as Array):
			return cluster
	for raw_cluster in city_clusters:
		var cluster: Dictionary = raw_cluster as Dictionary
		if str(cluster.get("owner", "")) == _target_faction_id:
			return cluster
	return {}

func _read_tile_name(tile_id: String) -> String:
	if tile_id == "":
		return ""
	var tile := _read_tile_payload(tile_id)
	if not tile.is_empty():
		return str(tile.get("name", tile.get("landmarkName", "")))
	return ""


func _read_tile_coordinate(tile_id: String) -> Dictionary:
	var tile := _read_tile_payload(tile_id)
	if not tile.is_empty() and tile.has("x") and tile.has("y"):
		return {
			"x": roundi(float(tile.get("x", 0))),
			"y": roundi(float(tile.get("y", 0))),
		}
	return _read_known_home_tile_coordinate(tile_id)


func _read_known_home_tile_coordinate(tile_id: String) -> Dictionary:
	match tile_id.strip_edges():
		"tile_08":
			return {
				"x": 4300,
				"y": 2538,
			}
	return {}


func _read_tile_payload(tile_id: String) -> Dictionary:
	var normalized_tile_id := tile_id.strip_edges()
	if normalized_tile_id == "":
		return {}
	var candidate_tile_lists: Array = [
		(_map_layout_data.get("map", {}) as Dictionary).get("tiles", []),
		_map_layout_data.get("tiles", []),
		(_world_data.get("map", {}) as Dictionary).get("tiles", []),
	]
	for candidate in candidate_tile_lists:
		if not (candidate is Array):
			continue
		for raw_tile in candidate:
			var tile: Dictionary = raw_tile as Dictionary
			if str(tile.get("id", "")) == normalized_tile_id:
				return tile
	return {}
