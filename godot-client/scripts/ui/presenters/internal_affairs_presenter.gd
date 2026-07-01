extends RefCounted
class_name InternalAffairsPresenter

var _world_data: Dictionary = {}
var _map_layout_data: Dictionary = {}
var _target_faction_id: String = ""

func configure(world_data: Dictionary, map_layout_data: Dictionary, target_faction_id: String) -> void:
	_world_data = world_data
	_map_layout_data = map_layout_data
	_target_faction_id = target_faction_id.strip_edges()

func build_snapshot() -> Dictionary:
	return _build_snapshot_bundle().get("snapshot", {}) as Dictionary

func build_overlay_payload() -> Dictionary:
	var snapshot_bundle := _build_snapshot_bundle()
	return {
		"snapshot": snapshot_bundle.get("snapshot", {}) as Dictionary,
		"runtime_state_patch": _build_runtime_state_patch(snapshot_bundle),
	}

func _build_snapshot_bundle() -> Dictionary:
	var faction_state := _read_target_faction_state()
	var hero_command: Dictionary = faction_state.get("heroCommand", {}) as Dictionary
	var city_clusters := _read_city_clusters()
	var home_tile_id := str(hero_command.get("homeTileId", ""))
	var primary_cluster := _find_primary_city_cluster(city_clusters, home_tile_id)
	var tech_levels: Dictionary = primary_cluster.get("techLevels", {}) as Dictionary
	var city_name := str(primary_cluster.get("name", "")).strip_edges()
	var captured_cities: Array = faction_state.get("capturedCities", []) as Array
	if city_name == "":
		city_name = _read_tile_name(home_tile_id)
	if city_name == "":
		city_name = "主城待识别"
	var city_state_id := _build_city_state_id(home_tile_id, city_name)
	var default_building_groups := _build_city_building_groups(primary_cluster, faction_state, hero_command)
	var default_affairs_queue := _build_governance_queue(primary_cluster, faction_state, hero_command, city_name)
	WorldStore.bootstrap_city_building_groups(city_state_id, default_building_groups)
	WorldStore.bootstrap_affairs_queue(city_state_id, default_affairs_queue)
	var building_groups := WorldStore.get_city_building_groups(city_state_id)
	var affairs_queue := WorldStore.get_affairs_queue(city_state_id)
	var development_points := int(hero_command.get("developmentPoints", 0))
	var order := int(faction_state.get("actionPoints", 0))
	var food := int(faction_state.get("food", 0))
	var gold := int(faction_state.get("gold", 0))
	var wood := int(faction_state.get("wood", 0))
	var stone := int(faction_state.get("stone", 0))
	var iron := int(faction_state.get("iron", 0))
	var logistics := int(tech_levels.get("logistics", 0))
	var defense := int(tech_levels.get("defense", 0))
	var recruitment := int(tech_levels.get("recruitment", 0))
	var governance := int(tech_levels.get("governance", 0))
	var recruit_cooldown := int(faction_state.get("recruitCooldown", 0))
	var interior_read_model := _build_pending_main_city_interior_read_model(city_state_id)
	var tax_runtime := _dictionary_from(interior_read_model.get("tax_runtime", {}))
	var construction_queues := _dictionary_from(interior_read_model.get("construction_queues", {}))
	var section_payloads := _build_section_payloads(
		city_name,
		home_tile_id,
		development_points,
		order,
		food,
		gold,
		wood,
		stone,
		iron,
		logistics,
		defense,
		recruitment,
		governance,
		captured_cities.size(),
		recruit_cooldown,
		affairs_queue
	)
	return {
		"city_state_id": city_state_id,
		"snapshot": {
			"city_state_id": city_state_id,
			"city_name": city_name,
			"home_tile_id": home_tile_id,
			"development_points": development_points,
			"food": food,
			"gold": gold,
			"wood": wood,
			"stone": stone,
			"iron": iron,
			"order": order,
			"logistics": logistics,
			"defense": defense,
			"recruitment": recruitment,
			"governance": governance,
			"captured_city_count": captured_cities.size(),
			"recruit_cooldown": recruit_cooldown,
			"tech_levels": tech_levels,
			"building_groups": building_groups,
			"affairs_queue": affairs_queue,
			"target_faction_id": _target_faction_id,
			"tax_runtime": tax_runtime,
			"construction_queues": construction_queues,
			"main_city_interior_read_model": interior_read_model,
			"main_city_interior_schema_version": str(interior_read_model.get("schema_version", "")),
			"main_city_interior_asset_ref_mode": str(interior_read_model.get("asset_ref_mode", "")),
			"main_city_interior_data_source": "pending_backend_read_model",
			"section_payloads": section_payloads,
			"summary_note": "主城内政已接入税收、建设和政务队列。",
		},
	}

func _build_runtime_state_patch(snapshot_bundle: Dictionary) -> Dictionary:
	return {
		"active_city_state_id": str(snapshot_bundle.get("city_state_id", "")).strip_edges(),
	}

func _build_city_state_id(home_tile_id: String, city_name: String) -> String:
	var resolved_home_tile_id := home_tile_id.strip_edges()
	if resolved_home_tile_id != "":
		return resolved_home_tile_id
	var resolved_city_name := city_name.strip_edges()
	if resolved_city_name != "":
		return resolved_city_name
	return "primary_city"

func _build_city_building_groups(primary_cluster: Dictionary, faction_state: Dictionary, hero_command: Dictionary) -> Dictionary:
	var tech_levels: Dictionary = primary_cluster.get("techLevels", {}) as Dictionary
	var governance_level := maxi(1, int(tech_levels.get("governance", 0)))
	var logistics_level := maxi(1, int(tech_levels.get("logistics", 0)))
	var defense_level := maxi(1, int(tech_levels.get("defense", 0)))
	var recruitment_level := maxi(1, int(tech_levels.get("recruitment", 0)))
	var development_points := int(hero_command.get("developmentPoints", 0))
	var action_points := int(faction_state.get("actionPoints", 0))
	var food := int(faction_state.get("food", 0))
	var wood := int(faction_state.get("wood", 0))
	var stone := int(faction_state.get("stone", 0))
	var iron := int(faction_state.get("iron", 0))
	return {
		"market": {
			"treeTitle": "市井建设",
			"treeItems": [
				_build_city_building_item("market_plaza", "市井", governance_level + 1, governance_level + 2, "可扩建" if action_points >= 1 else "军令不足", "开发%s 令%s" % [str(development_points), str(action_points)], "经营、交易和日常收益都从这里进入。", "市井升级单", "开发点 %s。升级后提高经营上限和资源处理速度。" % str(development_points), "木220 石140 令1", "经营+1 收益稳定", "扩建市井", "稍后", wood >= 220 and stone >= 140 and action_points >= 1),
				_build_city_building_item("granary", "仓廪", logistics_level + 1, logistics_level + 2, "粮%s %s" % [str(food), "可扩仓" if food >= 260 else "不足"], "后勤%s" % str(logistics_level), "存粮和仓储入口，保证募兵与建设不断档。", "仓廪升级单", "升级后增加粮草容量，并提升日常周转。", "粮260 木120 令1", "仓储+1 粮草+1", "扩建仓廪", "返回", food >= 260 and wood >= 120 and action_points >= 1),
				_build_city_building_item("workshop", "作坊", maxi(governance_level, logistics_level), maxi(governance_level, logistics_level) + 1, "木%s 石%s" % [str(wood), str(stone)], "经营%s" % str(governance_level), "加工木石，支撑建筑升级和经营订单。", "作坊升级单", "升级后提升建设材料处理速度。", "木180 石180 令1", "建设+1 周转+1", "升级作坊", "返回", wood >= 180 and stone >= 180 and action_points >= 1),
			],
		},
		"tax": {
			"treeTitle": "税收建设",
			"treeItems": [
				_build_city_building_item("tax_office", "田赋司", governance_level, governance_level + 1, "可征收" if action_points >= 1 else "军令不足", "治理%s 开发%s" % [str(governance_level), str(development_points)], "管理田赋和日常收入，让税收更稳定。", "田赋司升级单", "升级后提高日常税收和结算效率。", "木160 石120 令1", "税收+1 收入稳定", "升级田赋司", "稍后", wood >= 160 and stone >= 120 and action_points >= 1),
				_build_city_building_item("storage_bureau", "仓储司", logistics_level, logistics_level + 1, "粮%s 铁%s" % [str(food), str(iron)], "后勤%s" % str(logistics_level), "整理税后物资，减少粮草与铁料堆积。", "仓储司升级单", "升级后提升物资入仓速度。", "粮180 铁140 令1", "入仓+1 周转+1", "升级仓储司", "返回", food >= 180 and iron >= 140 and action_points >= 1),
				_build_city_building_item("relay_station", "转运站", maxi(logistics_level, defense_level), maxi(logistics_level, defense_level) + 1, "石%s 铁%s" % [str(stone), str(iron)], "后勤%s 防%s" % [str(logistics_level), str(defense_level)], "把税收物资送到建设和军备位置。", "转运站升级单", "升级后提升城内运输效率。", "石160 铁160 令1", "转运+1 供给稳定", "升级转运站", "返回", stone >= 160 and iron >= 160 and action_points >= 1),
			],
		},
		"policy": {
			"treeTitle": "政策建设",
			"treeItems": [
				_build_city_building_item("policy_hall", "政令台", governance_level, governance_level + 1, "可发布" if development_points >= 1 else "开发不足", "开发%s" % str(development_points), "发布发展政策，决定主城建设节奏。", "政令台升级单", "升级后增加政策容量和处理速度。", "木150 石150 令1", "政策+1 治理+1", "升级政令台", "稍后", development_points >= 1 and wood >= 150 and stone >= 150 and action_points >= 1),
				_build_city_building_item("recruit_policy_board", "募兵令", recruitment_level, recruitment_level + 1, "募兵%s" % str(recruitment_level), "粮%s 铁%s" % [str(food), str(iron)], "安排征兵优先级，配合招募与补员。", "募兵令升级单", "升级后提高补员效率和批次上限。", "粮220 铁120 令1", "补员+1 批次+1", "升级募兵令", "返回", food >= 220 and iron >= 120 and action_points >= 1),
				_build_city_building_item("defense_board", "守备司", defense_level, defense_level + 1, "防务%s" % str(defense_level), "石%s 铁%s" % [str(stone), str(iron)], "安排城防和驻守顺序。", "守备司升级单", "升级后提高城防准备和驻守效率。", "石200 铁180 令1", "城防+1 驻守+1", "升级守备司", "返回", stone >= 200 and iron >= 180 and action_points >= 1),
			],
		},
	}

func _build_city_building_item(
	building_id: String,
	label: String,
	current_level: int,
	next_level: int,
	status_text: String,
	meta_text: String,
	description: String,
	sheet_subtitle: String,
	sheet_body: String,
	cost_summary: String,
	effect_summary: String,
	primary_action_label: String,
	secondary_action_label: String,
	enabled: bool
) -> Dictionary:
	return {
		"id": building_id,
		"label": label,
		"levelText": "Lv.%s -> Lv.%s" % [str(current_level), str(next_level)],
		"statusText": status_text,
		"meta": meta_text,
		"description": description,
		"sheetSubtitle": sheet_subtitle,
		"sheetBody": sheet_body,
		"costSummary": cost_summary,
		"effectSummary": effect_summary,
		"primaryActionLabel": primary_action_label,
		"secondaryActionLabel": secondary_action_label,
		"enabled": enabled,
	}

func _build_pending_main_city_interior_read_model(city_state_id: String) -> Dictionary:
	return {
		"schema_version": "",
		"player_id": _target_faction_id,
		"city_state_id": city_state_id.strip_edges(),
		"asset_ref_mode": "",
		"tax_runtime": {},
		"construction_queues": {
			"mode": "construction_work_orders_v1",
			"city_inner": [],
			"world_outer": [],
		},
	}


func _dictionary_from(value: Variant) -> Dictionary:
	return value as Dictionary if value is Dictionary else {}


func _build_governance_queue(
	primary_cluster: Dictionary,
	faction_state: Dictionary,
	hero_command: Dictionary,
	city_name: String
) -> Array:
	var tech_levels: Dictionary = primary_cluster.get("techLevels", {}) as Dictionary
	var governance_level := maxi(1, int(tech_levels.get("governance", 0)))
	var defense_level := maxi(1, int(tech_levels.get("defense", 0)))
	var recruitment_level := maxi(1, int(tech_levels.get("recruitment", 0)))
	var development_points := int(hero_command.get("developmentPoints", 0))
	var recruit_cooldown := int(faction_state.get("recruitCooldown", 0))
	var captured_cities: Array = faction_state.get("capturedCities", []) as Array
	var ai_players: Array = faction_state.get("aiPlayers", []) as Array
	var action_points := int(faction_state.get("actionPoints", 0))
	return [
		{"id": "queue_market_upgrade", "label": "市井扩建", "statusText": "待处理" if action_points >= 1 else "军令不足", "description": "%s 当前开发点 %s，市井扩建被列为主城经营的第一优先级。" % [city_name, str(development_points)]},
		{"id": "queue_tax_upgrade", "label": "税务整编", "statusText": "待处理" if action_points >= 1 else "军令不足", "description": "税务升级已纳入主城政务队列，用于提升收税、入仓和周转。"},
		{"id": "queue_recruit_batch", "label": "募兵批次", "statusText": "冷却 %s" % str(recruit_cooldown) if recruit_cooldown > 0 else "可入队", "description": "募兵技 %s，当前征兵冷却 %s，补员会参考部队募兵节奏。" % [str(recruitment_level), str(recruit_cooldown)]},
		{"id": "queue_defense_ready", "label": "城防整备", "statusText": "进行中" if defense_level >= 2 else "待强化", "description": "防务等级 %s，已占城池 %s，政务队列需要为主城和已占点准备守备节奏。" % [str(defense_level), str(captured_cities.size())]},
		{"id": "queue_ai_dispatch", "label": "协同委任", "statusText": "待分配" if ai_players.size() > 0 else "暂无对象", "description": "当前助手数 %s，可安排助手协助处理城市事务。" % str(ai_players.size())},
		{"id": "queue_policy_review", "label": "政策复盘", "statusText": "治理 %s" % str(governance_level), "description": "治理等级 %s，政令台与守备司升级后会影响下一轮政策安排。" % str(governance_level)},
	]


func _build_section_payloads(
	city_name: String,
	home_tile_id: String,
	development_points: int,
	order: int,
	food: int,
	gold: int,
	wood: int,
	stone: int,
	iron: int,
	logistics: int,
	defense: int,
	recruitment: int,
	governance: int,
	captured_city_count: int,
	recruit_cooldown: int,
	affairs_queue: Array
) -> Dictionary:
	var recruit_queue_item := _find_affair_queue_item(affairs_queue, "queue_recruit_batch")
	var defense_queue_item := _find_affair_queue_item(affairs_queue, "queue_defense_ready")
	var dispatch_queue_item := _find_affair_queue_item(affairs_queue, "queue_ai_dispatch")
	var policy_review_queue_item := _find_affair_queue_item(affairs_queue, "queue_policy_review")
	return {
		"market": {
			"economy": {
				"summary_lines": [
					"主城经营收益在这里汇总。",
					"先看钱粮、工料和军备储备，再决定下一步建设。",
				],
				"list_title": "收益卡片",
				"item_cards": [
					_build_section_item_card("财政收益", "铜钱 %s" % str(gold), "军令 %s" % str(order), "主城经营和日常财政在这里汇总。"),
					_build_section_item_card("粮草补充", "粮 %s" % str(food), "募兵冷却 %s" % str(recruit_cooldown), "粮草支撑募兵与经营。"),
					_build_section_item_card("建设转化", "木 %s / 石 %s" % [str(wood), str(stone)], "开发点 %s" % str(development_points), "木石用于建设升级。"),
					_build_section_item_card("军备支撑", "铁 %s" % str(iron), "已占城池 %s" % str(captured_city_count), "铁料会影响守备和扩张成本。"),
				],
				"content_blocks": [
					_build_section_text_block(
							"收益摘要",
							[
							"%s 的经营收入、建设储备和军备余量都在这里看。" % city_name,
							"资源够不够、军令能不能动，一眼先看这几张卡。",
						],
						"InteriorMarketEconomySummaryBlock"
					),
					_build_section_text_block(
							"经营提示",
							[
							"治理 %s / 后勤 %s，当前收益结构会同时影响仓储、税收和募兵节奏。" % [str(governance), str(logistics)],
							"收益越稳，建设、收税和补兵就越不容易断档。",
						],
						"InteriorMarketEconomyHintBlock"
					),
					_build_static_section_boundary_block(
						"market/overview",
						"市井总览",
						"要处理经营升级，可以回到市井总览继续操作。",
						"InteriorMarketEconomyBoundaryBlock"
					),
				],
			},
			"routing": {
				"summary_lines": [
					"主城常用入口在这里集中。",
					"市井、城建、队列和政务之间的去向更清楚。",
				],
				"list_title": "入口路径卡",
				"item_cards": [
					_build_section_item_card("主城首页", city_name, "主城位置 %s" % (home_tile_id if home_tile_id != "" else "未定位"), "内政和市井都从这里回到主城。"),
					_build_section_item_card("城建入口", "建筑树", "开发点 %s" % str(development_points), "用于查看设施和升级。"),
					_build_section_item_card("队列入口", "%s 项政务" % str(affairs_queue.size()), "军令 %s" % str(order), "队列和政务从这里进入。"),
					_build_section_item_card("政务入口", "治理 %s" % str(governance), "后勤 %s / 防务 %s" % [str(logistics), str(defense)], "治理相关入口在这里集中。"),
				],
				"content_blocks": [
					_build_section_text_block(
							"动线摘要",
							[
							"从这里能看清主城、市井、城建、队列和政务的关系。",
							"玩家回到这里时，不需要重新猜下一步入口。",
						],
						"InteriorMarketRoutingSummaryBlock"
					),
					_build_section_text_block(
							"路径说明",
							[
							"城建看设施，政务看队列，资源流转看市井。",
							"每个入口只保留玩家下一步会用到的信息。",
						],
						"InteriorMarketRoutingHintBlock"
					),
					_build_static_section_boundary_block(
						"market/overview",
						"市井总览",
						"需要处理经营或建设时，回到市井总览即可继续。",
						"InteriorMarketRoutingBoundaryBlock"
					),
				],
			},
		},
		"tax": {
			"flow": {
				"summary_lines": [
					"主城收支在这里看。",
					"%s 的钱粮、工料和军令会影响每次征收。" % city_name,
				],
				"list_title": "收支指标",
				"item_cards": [
					_build_section_item_card("财政池", "铜钱 %s" % str(gold), "军令 %s" % str(order), "主城税务与日常财政节奏的锚点。"),
					_build_section_item_card("粮草流", "粮 %s" % str(food), "募兵冷却 %s" % str(recruit_cooldown), "税收与募兵节奏共享这条粮草流。"),
					_build_section_item_card("建设料流", "木 %s / 石 %s" % [str(wood), str(stone)], "开发点 %s" % str(development_points), "建设消耗和税务结余在这里看。"),
					_build_section_item_card("战备料流", "铁 %s" % str(iron), "已占城池 %s" % str(captured_city_count), "铁料会影响防务补给。"),
				],
				"content_blocks": [
					_build_section_text_block(
							"收支摘要",
							[
							"主城：%s" % city_name,
							"治理 %s / 后勤 %s，决定税务处理和入库效率。" % [str(governance), str(logistics)],
						],
						"InteriorTaxFlowSummaryBlock"
					),
					_build_section_text_block(
							"流转判断",
							[
							"当前军令 %s，%s。" % [str(order), "可继续处理税收与建设动作" if order > 0 else "暂不适合继续推进税务动作"],
							"要先判断能不能征收，再决定是否安排下一轮建设。",
						],
						"InteriorTaxFlowStatusBlock"
					),
				],
			},
			"reserve": {
				"summary_lines": [
					"仓储储备在这里看。",
					"粮草、工料、军备和调拨压力分开呈现。",
				],
				"list_title": "仓储卡片",
				"item_cards": [
					_build_section_item_card("粮仓", "粮 %s" % str(food), "后勤 %s" % str(logistics), "主城持续经营与募兵的基础储备。"),
					_build_section_item_card("工料仓", "木 %s / 石 %s" % [str(wood), str(stone)], "治理 %s" % str(governance), "建筑与税务调拨共同占用仓储空间。"),
					_build_section_item_card("军备仓", "铁 %s" % str(iron), "防务 %s" % str(defense), "防务与驻守补给优先从这里抽取军备资源。"),
					_build_section_item_card("调拨冗余", "队列 %s 项" % str(affairs_queue.size()), "军令 %s" % str(order), "政务队列数量用于表示当前仓储调拨压力。"),
				],
				"content_blocks": [
					_build_section_text_block(
							"仓储摘要",
							[
							"%s 的仓储会直接影响收税、建设和补兵。" % city_name,
							"资源少的时候，先看哪一类储备最紧。",
						],
						"InteriorTaxReserveSummaryBlock"
					),
					_build_section_text_block(
							"调拨提示",
							[
							"已占城池 %s，仓储链需要同时覆盖主城与已占点的回流。" % str(captured_city_count),
							"城外据点越多，回流与调拨压力越需要提前看。",
						],
						"InteriorTaxReserveDispatchBlock"
					),
				],
			},
		},
		"policy": {
			"recruitment": {
				"summary_lines": [
					"募兵政策在这里看。",
					"粮草、铁料、冷却和城市联动会影响补员节奏。",
				],
				"list_title": "募兵政策卡",
				"item_cards": [
					_build_section_item_card("募兵等级", "Lv.%s" % str(recruitment), "冷却 %s" % str(recruit_cooldown), "募兵政策负责征兵批次与补员节奏。"),
					_build_section_item_card("粮草储备", "粮 %s" % str(food), "军令 %s" % str(order), "募兵政策首先受粮草和军令约束。"),
					_build_section_item_card("军备补员", "铁 %s" % str(iron), "开发点 %s" % str(development_points), "补员和战备一起影响募兵节奏。"),
					_build_section_item_card("城市调度", "已占城池 %s" % str(captured_city_count), "治理 %s" % str(governance), "募兵政策会影响城市和队列安排。"),
				],
				"content_blocks": [
					_build_section_text_block(
							"募兵摘要",
							[
							"募兵政策负责征兵批次和补员节奏。",
							"先看粮草、铁料和冷却，再决定是否推进募兵。",
						],
						"InteriorPolicyRecruitmentSummaryBlock"
					),
					_build_section_text_block(
						"队列参考",
						[
							"政务队列状态：%s" % str(recruit_queue_item.get("statusText", "待安排")),
							str(recruit_queue_item.get("description", "当前还没有募兵批次队列说明。")),
						],
						"InteriorPolicyRecruitmentQueueBlock"
					),
				],
			},
			"defense": {
				"summary_lines": [
					"防务政策在这里看。",
					"城防、驻守和补给一起影响主城安全。",
				],
				"list_title": "防务政策卡",
				"item_cards": [
					_build_section_item_card("防务等级", "Lv.%s" % str(defense), "已占城池 %s" % str(captured_city_count), "防务等级决定主城和已占点的守备节奏。"),
					_build_section_item_card("城防料池", "石 %s / 铁 %s" % [str(stone), str(iron)], "军令 %s" % str(order), "城防与驻守动作优先吃石料和军备。"),
					_build_section_item_card("守备冗余", "后勤 %s" % str(logistics), "治理 %s" % str(governance), "后勤与治理共同决定防务调度稳定度。"),
					_build_section_item_card("政策调度", "开发点 %s" % str(development_points), "主城 %s" % city_name, "防务政策会影响驻守和建筑树。"),
				],
				"content_blocks": [
					_build_section_text_block(
							"防务摘要",
							[
							"防务政策负责城防、驻守和补给优先级。",
							"石料、铁料和已占城池数量会影响守备节奏。",
						],
						"InteriorPolicyDefenseSummaryBlock"
					),
					_build_section_text_block(
						"队列参考",
						[
							"政务队列状态：%s" % str(defense_queue_item.get("statusText", "待安排")),
							str(defense_queue_item.get("description", "当前还没有城防整备队列说明。")),
						],
						"InteriorPolicyDefenseQueueBlock"
					),
				],
			},
		},
		"affairs": {
			"appointment": {
				"summary_lines": [
					"委任职责在这里看。",
					"城内、资源、防务和助手协同分开呈现。",
				],
				"list_title": "委任职责卡",
				"item_cards": [
					_build_section_item_card("城内委任", city_name, "治理 %s" % str(governance), "主城治理职责先固定在委任页的第一层。"),
					_build_section_item_card("资源委任", "粮 %s / 木 %s" % [str(food), str(wood)], "石 %s / 铁 %s" % [str(stone), str(iron)], "资源岗位优先承接主城经营与仓储协同。"),
					_build_section_item_card("防务委任", "防务 %s" % str(defense), "已占城池 %s" % str(captured_city_count), "防务岗位负责守备节奏与已占点协同。"),
					_build_section_item_card("协同委任", str(dispatch_queue_item.get("statusText", "待分配")), "队列 %s 项" % str(affairs_queue.size()), "助手协同和城市职责在这里分配。"),
				],
				"content_blocks": [
					_build_section_text_block(
							"委任摘要",
							[
							"委任用于治理职责分配。",
							"玩家先看哪些职责有人处理，哪些还需要安排。",
						],
						"InteriorAffairsAppointmentSummaryBlock"
					),
					_build_section_text_block(
						"队列参考",
						[
							"政务队列状态：%s" % str(dispatch_queue_item.get("statusText", "待安排")),
							str(dispatch_queue_item.get("description", "当前还没有协同委任队列说明。")),
						],
						"InteriorAffairsAppointmentQueueBlock"
					),
					_build_static_section_boundary_block(
						"affairs/queue",
						"正在建设",
						"要看具体进度，可以回到正在建设继续处理。",
						"InteriorAffairsAppointmentBoundaryBlock"
					),
				],
			},
			"bounty": {
				"summary_lines": [
					"城内任务在这里看。",
					"主城、资源、战备和复盘任务分开呈现。",
				],
				"list_title": "悬赏任务卡",
				"item_cards": [
					_build_section_item_card("主城悬赏", city_name, "开发点 %s" % str(development_points), "主城长期建设与经营任务先汇总在这里。"),
					_build_section_item_card("资源悬赏", "铜钱 %s / 粮 %s" % [str(gold), str(food)], "木 %s / 石 %s" % [str(wood), str(stone)], "资源目标优先承接经营和税务侧任务。"),
					_build_section_item_card("战备悬赏", "铁 %s" % str(iron), "防务 %s" % str(defense), "战备任务会参考防务策略。"),
					_build_section_item_card("复盘任务", str(policy_review_queue_item.get("statusText", "待安排")), "治理 %s / 募兵 %s" % [str(governance), str(recruitment)], "政策复盘队列会提示下一步任务。"),
				],
				"content_blocks": [
					_build_section_text_block(
							"悬赏摘要",
							[
							"悬赏用于承接阶段性内政任务和治理目标。",
							"玩家可以先看哪类任务最接近完成，再决定投入资源。",
						],
						"InteriorAffairsBountySummaryBlock"
					),
					_build_section_text_block(
						"队列参考",
						[
							"政务队列状态：%s" % str(policy_review_queue_item.get("statusText", "待安排")),
							str(policy_review_queue_item.get("description", "当前还没有政策复盘任务说明。")),
						],
						"InteriorAffairsBountyQueueBlock"
					),
					_build_static_section_boundary_block(
						"affairs/queue",
						"正在建设",
						"要查看正在推进的事项，可以回到正在建设。",
						"InteriorAffairsBountyBoundaryBlock"
					),
				],
			},
		},
	}


func _find_affair_queue_item(affairs_queue: Array, affair_id: String) -> Dictionary:
	for raw_queue_item in affairs_queue:
		var queue_item: Dictionary = raw_queue_item as Dictionary
		if str(queue_item.get("id", "")).strip_edges() == affair_id:
			return queue_item
	return {}


func _build_static_section_boundary_block(anchor_page_id: String, anchor_label: String, decision_text: String, node_name: String) -> Dictionary:
	var anchor_text := anchor_label.strip_edges()
	if anchor_text == "":
		anchor_text = anchor_page_id.strip_edges()
	if anchor_page_id.strip_edges() != "":
		anchor_text = "%s" % anchor_text
	return _build_section_text_block(
		"相关入口",
		[
			"可前往：%s。" % anchor_text,
			decision_text,
		],
		node_name
	)


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
	for item in city_clusters:
		var cluster: Dictionary = item as Dictionary
		if str(cluster.get("centerTileId", "")) == home_tile_id or str(cluster.get("cityHallTileId", "")) == home_tile_id:
			return cluster
		var tile_ids: Variant = cluster.get("tileIds", [])
		if tile_ids is Array and home_tile_id in (tile_ids as Array):
			return cluster
	for item in city_clusters:
		var cluster: Dictionary = item as Dictionary
		if str(cluster.get("owner", "")) == _target_faction_id:
			return cluster
	return {}

func _read_tile_name(tile_id: String) -> String:
	if tile_id == "":
		return ""
	var candidate_tile_lists: Array = [
		(_map_layout_data.get("map", {}) as Dictionary).get("tiles", []),
		_map_layout_data.get("tiles", []),
		(_world_data.get("map", {}) as Dictionary).get("tiles", []),
	]
	for candidate in candidate_tile_lists:
		if not (candidate is Array):
			continue
		for item in candidate:
			var tile: Dictionary = item as Dictionary
			if str(tile.get("id", "")) == tile_id:
				return str(tile.get("name", ""))
	return ""
