extends Control
class_name InteriorPanel

signal back_requested
signal close_requested
signal page_changed(page_id: String)
signal building_upgrade_requested(tab_id: String, building_id: String)
signal affair_enqueued(affair_id: String)
signal work_order_action_requested(action_id: String, queue_item_id: String)

const DEFAULT_CITY_NAME := "主城待识别"
const DEFAULT_TOP_TAB_ID := "home"
const PANEL_TAB_STRIP_SCENE := preload("res://scenes/ui/panel_tab_strip.tscn")
const BUILDING_TREE_VIEW_SCENE := preload("res://scenes/ui/building_tree_view.tscn")
const BUILD_UPGRADE_SHEET_SCENE := preload("res://scenes/ui/build_upgrade_sheet.tscn")
const AFFAIRS_QUEUE_VIEW_SCENE := preload("res://scenes/ui/affairs_queue_view.tscn")
const CHILD_PAGE_BLOCK_FACTORY_SCRIPT := preload("res://scripts/ui/child_page_block_factory.gd")
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")
const BACKEND_API_CLIENT_SCRIPT := preload("res://scripts/infra/http/backend_api_client.gd")
const MAIN_CITY_INTERIOR_READ_MODEL_PATH := "/api/world/main-city/interior"
const INTERIOR_HOME_LOBBY_BACKGROUND_PATH := "res://ui_generated/interior/interior_lobby_bg.png"
const INTERIOR_HOME_ENTRY_BADGE_PATHS := {
	"market": "res://ui_generated/interior/icons/market_badge.png",
	"trade": "res://ui_generated/interior/icons/trade_badge.png",
	"tax": "res://ui_generated/interior/icons/tax_badge.png",
	"affairs": "res://ui_generated/interior/icons/affairs_badge.png",
}
const INTERIOR_SECONDARY_BACKGROUND_PATHS := {
	"market": "res://ui_generated/interior/secondary/interior_market_secondary_bg_dim_v1.png",
	"trade": "res://ui_generated/interior/secondary/interior_trade_secondary_bg_dim_v1.png",
	"tax": "res://ui_generated/interior/secondary/interior_tax_secondary_bg_dim_v1.png",
	"affairs": "res://ui_generated/interior/secondary/interior_affairs_secondary_bg_dim_v1.png",
}
const INTERIOR_HOME_ENTRY_BUTTON_TOKEN := "interior_home_entry_button_v1"
const INTERIOR_HOME_ENTRY_LIVE_TEXT_CONTRACT := "interior_home_entry_live_text_v1"
const INTERIOR_WORK_ORDER_ACTION_BUTTON_TOKEN := "interior_work_order_action_button_v1"
const INTERIOR_WORK_ORDER_ACTION_LIVE_TEXT_CONTRACT := "interior_work_order_action_live_text_v1"
const INTERIOR_TAX_TREASURY_LAYOUT_PRIORITY_TOKEN := "interior_tax_treasury_layout_priority_v1"
const BUILDING_SECTION_BY_TAB := {}
const SPECIALIZED_ANCHOR_PAGE_BY_TAB := {
	"home": "home/lobby",
	"market": "market/overview",
	"trade": "trade/overview",
	"tax": "tax/structure",
	"policy": "policy/development",
	"affairs": "affairs/queue",
}
const HOME_ENTRY_DEFS := [
	{"id": "market", "label": "市井", "meta": "资源与经营", "page_id": "market/overview", "symbol": "市"},
	{"id": "trade", "label": "交易", "meta": "买卖与兑换", "page_id": "trade/overview", "symbol": "交"},
	{"id": "tax", "label": "税收", "meta": "征收与收支", "page_id": "tax/structure", "symbol": "税"},
	{"id": "affairs", "label": "政务", "meta": "队列与委任", "page_id": "affairs/queue", "symbol": "政"},
]
const HOME_FORBIDDEN_ENTRY_IDS := [
	"selection",
	"policy",
	"bounty",
]
const BUILDING_GROUP_CONTRACT_ORDER := [
	"market",
	"tax",
	"policy",
]
const BUILDING_GROUP_COPY_SCAN_KEYS := [
	"treeTitle",
	"label",
	"levelText",
	"statusText",
	"meta",
	"description",
	"sheetSubtitle",
	"sheetBody",
	"costSummary",
	"effectSummary",
	"primaryActionLabel",
	"secondaryActionLabel",
]
const BUILDING_GROUP_FORBIDDEN_COPY_TERMS := [
	"锚点",
	"冗余",
	"回写",
	"联动",
	"内政域",
	"城市域",
	"正式",
	"待接入",
	"结构位",
	"Presenter",
	"scene",
	"building group",
	"占位",
	"路由",
	"template",
	"backend",
	"read model",
	"contract",
	"authority",
	"tier",
	"/api/",
	"fixture",
	"local_only",
	"割裂",
	"替代部队面板",
]

const TOP_TAB_ORDER := [
	"home",
]

const FACILITY_NODE_DEFS := [
	{"id": "policy", "label": "政策", "meta": "治理", "page_id": "policy/development"},
	{"id": "selection", "label": "选拔", "meta": "募兵", "page_id": "policy/recruitment"},
	{"id": "market", "label": "市井", "meta": "经营", "page_id": "market/overview"},
	{"id": "trade", "label": "交易", "meta": "收益", "page_id": "market/economy"},
	{"id": "tax", "label": "税收", "meta": "财政", "page_id": "tax/structure"},
	{"id": "affairs", "label": "政务", "meta": "队列", "page_id": "affairs/queue"},
	{"id": "bounty", "label": "悬赏", "meta": "短令", "page_id": "affairs/bounty"},
]

const PANEL_DEFS := {
	"home": {
		"label": "内政",
		"summary_title": "内政大厅",
		"summary_lines": [
			"内政首页只保留功能入口，不承载建筑树、设施网格或升级单。",
			"市井、交易、税收、政务进入后再展开各自二级页。",
		],
		"sections": [
			{
				"id": "lobby",
				"label": "大厅",
				"title": "内政大厅",
				"item_cards": [],
				"content_blocks": [],
			},
		],
	},
	"market": {
		"label": "市井",
		"summary_title": "主城经营",
		"summary_lines": [
			"市井已确认归内政域，承接主城经营、收益与城政入口。",
			"这里先保留主城经营的正式结构，不再用 preview story 代替。",
		],
		"sections": [
			{
				"id": "overview",
				"label": "总览",
				"title": "市井总览",
				"item_cards": [
					{"title": "粮仓余量", "value": "粮", "meta": "粮草", "description": "军需与征发基底。"},
					{"title": "木材储备", "value": "木", "meta": "营造", "description": "建筑与设施维护。"},
					{"title": "石料储备", "value": "石", "meta": "城防", "description": "城墙与工事消耗。"},
					{"title": "铁料储备", "value": "铁", "meta": "军械", "description": "兵装与器械消耗。"},
					{"title": "经营效率", "value": "开发", "meta": "上限", "description": "影响经营容量。"},
					{"title": "市井调度", "value": "稳定", "meta": "秩序", "description": "日常收支状态。"},
				],
				"content_blocks": [],
			},
			{
				"id": "economy",
				"label": "收益",
				"title": "市井收益",
				"item_cards": [
					{"title": "铜钱产出", "value": "市井收益", "meta": "默认收益卡位", "description": "默认收益页入口。"},
					{"title": "粮草补充", "value": "市井收益", "meta": "默认收益卡位", "description": "默认收益页入口。"},
					{"title": "资源调度", "value": "市井收益", "meta": "默认收益卡位", "description": "默认收益页入口。"},
					{"title": "经营加成", "value": "市井收益", "meta": "默认收益卡位", "description": "默认收益页入口。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "收益摘要",
						"lines": [
							"市井经营信息在这里汇总。",
							"可查看资源、产出和加成来源。",
						],
						"node_name": "InteriorMarketEconomyDefaultSummaryBlock",
					},
				],
			},
		],
	},
	"trade": {
		"label": "交易",
		"summary_title": "交易总览",
		"summary_lines": [
			"交易是市井之外的独立页面，用于买卖、兑换和记录。",
			"买卖、兑换、记录分开显示，玩家不用回到内政首页寻找。",
		],
		"sections": [
			{
				"id": "overview",
				"label": "总览",
				"title": "交易总览",
				"item_cards": [
					{"title": "买入", "value": "待开放", "meta": "交易入口", "description": "用于资源或货币购买。"},
					{"title": "卖出", "value": "待开放", "meta": "交易入口", "description": "用于资源换取。"},
					{"title": "兑换", "value": "待开放", "meta": "交易入口", "description": "用于资源兑换。"},
					{"title": "记录", "value": "待开放", "meta": "交易入口", "description": "用于查看交易历史。"},
				],
				"content_blocks": [],
			},
		],
	},
	"tax": {
		"label": "税收",
		"summary_title": "财政结构",
		"summary_lines": [
			"税收页承接主城财政、仓储调度和资源回收。",
			"税收与城内经营共享状态，但不混层级。",
		],
		"sections": [
			{
				"id": "structure",
				"label": "税制",
				"title": "税收结构",
				"item_cards": [
					{"title": "主城税收", "value": "税收结构", "meta": "默认税制卡位", "description": "默认税制页入口。"},
					{"title": "市井收益", "value": "税收结构", "meta": "默认税制卡位", "description": "默认税制页入口。"},
					{"title": "仓储调度", "value": "税收结构", "meta": "默认税制卡位", "description": "默认税制页入口。"},
					{"title": "资源回流", "value": "税收结构", "meta": "默认税制卡位", "description": "默认税制页入口。"},
				],
				"content_blocks": [],
			},
			{
				"id": "flow",
				"label": "收支",
				"title": "收支趋势",
				"item_cards": [
					{"title": "日常收入", "value": "收支趋势", "meta": "默认收支卡位", "description": "默认收支页入口。"},
					{"title": "日常支出", "value": "收支趋势", "meta": "默认收支卡位", "description": "默认收支页入口。"},
					{"title": "战时消耗", "value": "收支趋势", "meta": "默认收支卡位", "description": "默认收支页入口。"},
					{"title": "建设消耗", "value": "收支趋势", "meta": "默认收支卡位", "description": "默认收支页入口。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "收支摘要",
						"lines": [
							"收支趋势用于展示财政流转。",
							"后续可直接接统计图或折线信息。",
						],
						"node_name": "InteriorTaxFlowDefaultSummaryBlock",
					},
				],
			},
			{
				"id": "reserve",
				"label": "仓储",
				"title": "仓储调度",
				"item_cards": [
					{"title": "粮仓", "value": "仓储调度", "meta": "默认仓储卡位", "description": "默认仓储页入口。"},
					{"title": "资源仓", "value": "仓储调度", "meta": "默认仓储卡位", "description": "默认仓储页入口。"},
					{"title": "调拨", "value": "仓储调度", "meta": "默认仓储卡位", "description": "默认仓储页入口。"},
					{"title": "回收", "value": "仓储调度", "meta": "默认仓储卡位", "description": "默认仓储页入口。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "仓储摘要",
						"lines": [
							"仓储页保留资源储备和调度信息。",
							"后续可接真实仓储容量与调配链。",
						],
						"node_name": "InteriorTaxReserveDefaultSummaryBlock",
					},
				],
			},
		],
	},
	"policy": {
		"label": "政策",
		"summary_title": "政策树",
		"summary_lines": [
			"政策页承接发展、募兵、防务等治理策略。",
			"政策更偏治理选择，不是单纯数值面板。",
		],
		"sections": [
			{
				"id": "development",
				"label": "发展",
				"title": "发展政策",
				"item_cards": [
					{"title": "主城发展", "value": "发展政策", "meta": "默认政策卡位", "description": "默认发展政策入口。"},
					{"title": "建筑加速", "value": "发展政策", "meta": "默认政策卡位", "description": "默认发展政策入口。"},
					{"title": "资源倾斜", "value": "发展政策", "meta": "默认政策卡位", "description": "默认发展政策入口。"},
					{"title": "长期建设", "value": "发展政策", "meta": "默认政策卡位", "description": "默认发展政策入口。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "发展摘要",
						"lines": [
							"发展政策侧重长期经营和建筑节奏。",
							"后续可接实际政策树与效果。",
						],
						"node_name": "InteriorPolicyDevelopmentDefaultSummaryBlock",
					},
				],
			},
			{
				"id": "recruitment",
				"label": "募兵",
				"title": "募兵政策",
				"item_cards": [
					{"title": "募兵加速", "value": "募兵政策", "meta": "默认政策卡位", "description": "默认募兵政策入口。"},
					{"title": "兵力补充", "value": "募兵政策", "meta": "默认政策卡位", "description": "默认募兵政策入口。"},
					{"title": "补给优先", "value": "募兵政策", "meta": "默认政策卡位", "description": "默认募兵政策入口。"},
					{"title": "战备调整", "value": "募兵政策", "meta": "默认政策卡位", "description": "默认募兵政策入口。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "募兵摘要",
						"lines": [
							"募兵政策承接征兵和兵力补充。",
							"后续可与部队面板的征兵联动。",
						],
						"node_name": "InteriorPolicyRecruitmentDefaultSummaryBlock",
					},
				],
			},
			{
				"id": "defense",
				"label": "防务",
				"title": "防务政策",
				"item_cards": [
					{"title": "城防加固", "value": "防务政策", "meta": "默认政策卡位", "description": "默认防务政策入口。"},
					{"title": "驻守优先", "value": "防务政策", "meta": "默认政策卡位", "description": "默认防务政策入口。"},
					{"title": "补给防线", "value": "防务政策", "meta": "默认政策卡位", "description": "默认防务政策入口。"},
					{"title": "前线强化", "value": "防务政策", "meta": "默认政策卡位", "description": "默认防务政策入口。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "防务摘要",
						"lines": [
							"防务政策用于城防和驻守侧的治理策略。",
							"后续可接与地图和驻点相关的联动效果。",
						],
						"node_name": "InteriorPolicyDefenseDefaultSummaryBlock",
					},
				],
			},
		],
	},
	"affairs": {
		"label": "政务",
		"summary_title": "政务总览",
		"summary_lines": [
			"政务页承接城内与城外正在执行的建设。",
			"助手只给建议，执行由玩家确认。",
		],
		"sections": [
			{
				"id": "queue",
				"label": "建设队列",
				"title": "建设队列",
				"item_cards": [
					{"title": "主城队列", "value": "建设队列", "meta": "默认政务卡位", "description": "默认建设队列入口。"},
					{"title": "升级队列", "value": "建设队列", "meta": "默认政务卡位", "description": "默认建设队列入口。"},
					{"title": "候补队列", "value": "建设队列", "meta": "默认政务卡位", "description": "默认建设队列入口。"},
					{"title": "维护队列", "value": "建设队列", "meta": "默认政务卡位", "description": "默认建设队列入口。"},
				],
				"content_blocks": [],
			},
		],
	},
}

var _host = null

var _interior_snapshot: Dictionary = {
	"city_name": DEFAULT_CITY_NAME,
	"home_tile_id": "",
	"development_points": 0,
	"food": 0,
	"gold": 0,
	"wood": 0,
	"stone": 0,
	"iron": 0,
	"order": 0,
	"logistics": 0,
	"defense": 0,
	"recruitment": 0,
	"governance": 0,
	"captured_city_count": 0,
	"recruit_cooldown": 0,
	"tech_levels": {},
	"building_groups": {},
	"affairs_queue": [],
	"tax_runtime": {},
	"construction_queues": {},
	"summary_note": "",
}
var _tab_views: Dictionary = {}
var _current_top_tab_id: String = ""
var _current_section_by_tab: Dictionary = {}
var _selected_affair_id: String = ""
var _refresh_pending: bool = false
var _refresh_deferred: bool = false
var _backend_api_client: Node = null
var _main_city_interior_read_model_inflight := false
var _main_city_interior_read_model_cache: Dictionary = {}
var _selected_work_order_queue_item_id: String = ""
var _selected_work_order_action_id: String = ""
var _selected_work_order_detail_visible := false
var _selected_work_order_uses_asset_ref := false


func _ready() -> void:
	_bind_host_signals()
	var host := _ensure_host() as Control
	if host != null:
		UI_COMPONENT_FACTORY.apply_motion_interior_section_enter(host, 0)
	_request_panel_refresh()


func set_interior_snapshot(snapshot: Dictionary) -> void:
	_interior_snapshot = _merge_snapshot(snapshot)
	if not _main_city_interior_read_model_cache.is_empty():
		_apply_main_city_interior_read_model(_main_city_interior_read_model_cache, false)
	_request_panel_refresh()
	_refresh_main_city_interior_read_model_if_needed()


func set_interior_summary(summary: String) -> void:
	_interior_snapshot["summary_note"] = summary
	_request_panel_refresh()


func get_active_top_tab_id() -> String:
	return _current_top_tab_id


func get_active_page_id() -> String:
	return _compose_page_id(_current_top_tab_id, _get_current_section_id(_current_top_tab_id))


func get_mainline_visual_smoke_summary(page_id: String = "") -> Dictionary:
	var resolved := _resolve_visual_smoke_page_id(page_id)
	var tab_id := str(resolved.get("tab_id", "")).strip_edges()
	var section_id := str(resolved.get("section_id", "")).strip_edges()
	var active_page_id := _compose_page_id(tab_id, section_id)
	var requested_page_id := page_id.strip_edges()
	if requested_page_id == "":
		requested_page_id = active_page_id
	var tab_def: Dictionary = _get_tab_def(tab_id)
	if tab_def.is_empty():
		return {
			"ok": false,
			"reason": "interior_tab_missing",
			"requestedPageId": requested_page_id,
			"activePageId": get_active_page_id(),
			"activeTopTabId": _current_top_tab_id,
		}
	var section_payload: Dictionary = _resolve_section_payload(tab_id, section_id)
	if section_payload.is_empty():
		return {
			"ok": false,
			"reason": "interior_section_missing",
			"requestedPageId": requested_page_id,
			"activePageId": active_page_id,
			"activeTopTabId": tab_id,
			"activeSectionId": section_id,
			"topTabCount": TOP_TAB_ORDER.size(),
			"sectionCount": _get_section_ids(tab_def).size(),
		}
	var content_blocks: Array = _visual_smoke_array(section_payload.get("content_blocks", []))
	var item_cards: Array = _visual_smoke_array(section_payload.get("item_cards", []))
	var building_group: Dictionary = _snapshot_building_group(tab_id)
	var building_items: Array = _visual_smoke_array(building_group.get("treeItems", []))
	var affairs_queue := _snapshot_affairs_queue()
	var uses_building_group := _should_use_building_group_view(tab_id, section_id)
	var uses_affairs_queue := tab_id == "affairs" and section_id == "queue"
	var uses_home_lobby := tab_id == "home" and section_id == "lobby"
	var selected_building_id := str(building_group.get("selectedBuildingId", building_group.get("selected_building_id", ""))).strip_edges()
	if selected_building_id == "" and not building_items.is_empty() and building_items[0] is Dictionary:
		var first_building := building_items[0] as Dictionary
		selected_building_id = str(first_building.get("id", "")).strip_edges()
	var has_selected_building := selected_building_id != ""
	var has_valid_building_selection := not uses_building_group or has_selected_building
	var content_surface_count := item_cards.size() + content_blocks.size()
	if uses_building_group:
		content_surface_count += building_items.size()
	if uses_home_lobby:
		content_surface_count += HOME_ENTRY_DEFS.size()
	if uses_affairs_queue:
		content_surface_count += affairs_queue.size()
	if uses_building_group:
		content_surface_count += FACILITY_NODE_DEFS.size()
	var content_ready := content_surface_count > 0 and has_valid_building_selection
	var summary := {
		"ok": content_ready,
		"reason": "interior_content_ready" if content_ready else "interior_content_incomplete",
		"requestedPageId": requested_page_id,
		"activePageId": active_page_id,
		"activeTopTabId": tab_id,
		"activeSectionId": section_id,
		"interiorSummaryVersion": "interior_summary_v2",
		"topTabCount": TOP_TAB_ORDER.size(),
		"sectionCount": _get_section_ids(tab_def).size(),
		"snapshotKeyCount": _interior_snapshot.keys().size(),
		"itemCardCount": item_cards.size(),
		"contentBlockCount": content_blocks.size(),
		"contentBlockKinds": _visual_smoke_dictionary_values(content_blocks, "kind"),
		"contentBlockNodeNames": _visual_smoke_dictionary_values(content_blocks, "node_name"),
		"contentSurfaceCount": content_surface_count,
		"usesInteriorHomeLobby": uses_home_lobby,
		"usesBuildingGroupView": uses_building_group,
		"buildingGroupCount": _visual_smoke_dictionary_count(_visual_smoke_dictionary(_interior_snapshot.get("building_groups", {}))),
		"activeBuildingCount": building_items.size(),
		"hasBuildingTree": uses_building_group and not building_items.is_empty(),
		"selectedBuildingId": selected_building_id,
		"hasSelectedBuilding": has_selected_building,
		"hasValidBuildingSelection": has_valid_building_selection,
		"upgradeSheetHasPayload": uses_building_group and has_selected_building,
		"usesAffairsQueueView": uses_affairs_queue,
		"affairsQueueCount": affairs_queue.size(),
		"hasAffairsQueue": uses_affairs_queue and not affairs_queue.is_empty(),
		"sectionTitle": str(section_payload.get("title", section_id)),
		"sectionLabel": str(section_payload.get("label", section_id)),
		"preferredViewKind": _get_preferred_view_kind(tab_id, section_id),
		"specializedAnchorPageId": _get_specialized_anchor_page_id(tab_id),
		"interiorTopTabStripVisible": false,
		"interiorSecondarySummaryCardVisible": false if _is_home_entry_tab(tab_id) else true,
		"authorityTriggered": false,
	}
	UI_COMPONENT_FACTORY.apply_design_system_summary(summary, "interior_shell", "preview_read_model_shell", false)
	UI_COMPONENT_FACTORY.apply_interior_motion_summary(summary)
	summary["interiorThemeTokenSet"] = UI_COMPONENT_FACTORY.DESIGN_SYSTEM_ID
	summary["interiorPageTokenState"] = active_page_id
	summary["interiorFontScaleMode"] = UI_COMPONENT_FACTORY.DESIGN_TOKEN_VERSION
	summary["interiorButtonScaleMode"] = UI_COMPONENT_FACTORY.DESIGN_TOKEN_VERSION
	if uses_home_lobby:
		_apply_home_lobby_summary(summary)
	else:
		_apply_secondary_page_summary(summary, active_page_id)
	if _should_use_market_overview_view(tab_id, section_id):
		_apply_market_overview_summary(summary, content_blocks.size())
	if _should_use_trade_exchange_view(tab_id, section_id):
		_apply_trade_exchange_summary(summary)
	if _should_use_tax_treasury_view(tab_id, section_id):
		_apply_tax_treasury_summary(summary)
	if _should_use_affairs_operations_view(tab_id, section_id):
		_apply_affairs_operations_summary(summary)
	if _should_use_secondary_consumer_cards_view(tab_id, section_id):
		_apply_secondary_consumer_cards_summary(summary, tab_id, content_blocks.size())
	if uses_building_group:
		UI_COMPONENT_FACTORY.apply_interior_building_contract_summary(summary, building_items.size())
		UI_COMPONENT_FACTORY.apply_interior_facility_node_hub_summary(summary, FACILITY_NODE_DEFS.size())
		_apply_building_group_copy_density_summary(summary)
	return summary


func set_active_page_id(page_id: String) -> void:
	var resolved_tab_id := page_id.strip_edges()
	if resolved_tab_id == "":
		return
	var top_tab_id := resolved_tab_id
	var section_id := ""
	var separator_index := resolved_tab_id.find("/")
	if separator_index != -1:
		top_tab_id = resolved_tab_id.substr(0, separator_index).strip_edges()
		section_id = resolved_tab_id.substr(separator_index + 1).strip_edges()
	set_active_top_tab(top_tab_id)
	if section_id != "":
		set_active_section(top_tab_id, section_id)


func set_active_top_tab(tab_id: String) -> void:
	_select_top_tab(tab_id)


func set_active_section(top_tab_id: String, section_id: String) -> void:
	var tab_def: Dictionary = _get_tab_def(top_tab_id)
	if tab_def.is_empty():
		return
	if not _get_section_ids(tab_def).has(section_id):
		return
	_current_section_by_tab[top_tab_id] = section_id
	var state: Dictionary = _ensure_tab_view(top_tab_id)
	var section_strip = state.get("section_strip")
	if section_strip != null:
		section_strip.set_active_tab(section_id)
	_render_section_content(top_tab_id, section_id)
	page_changed.emit(_compose_page_id(top_tab_id, section_id))


func _request_panel_refresh() -> void:
	_refresh_pending = true
	if not is_inside_tree():
		return
	if _refresh_deferred:
		return
	_refresh_deferred = true
	call_deferred("_flush_panel_refresh")


func _flush_panel_refresh() -> void:
	_refresh_deferred = false
	if not _refresh_pending:
		return
	_refresh_pending = false
	_rebuild_panel()


func _bind_host_signals() -> void:
	var host = _ensure_host()
	if host == null:
		push_error("[interior-panel] host is missing.")
		return
	if not host.back_requested.is_connected(Callable(self, "_on_host_back_requested")):
		host.back_requested.connect(Callable(self, "_on_host_back_requested"))
	if not host.close_requested.is_connected(Callable(self, "_on_host_close_requested")):
		host.close_requested.connect(Callable(self, "_on_host_close_requested"))
	if not host.tab_selected.is_connected(Callable(self, "_on_host_tab_selected")):
		host.tab_selected.connect(Callable(self, "_on_host_tab_selected"))


func _rebuild_panel() -> void:
	var host = _ensure_host()
	if host == null:
		return
	_tab_views.clear()
	var preserved_top_tab := _current_top_tab_id if not _current_top_tab_id.is_empty() else DEFAULT_TOP_TAB_ID
	host.set_panel_title("内政")
	host.set_back_button_label("返回")
	if host.has_method("set_back_button_target_page_id"):
		host.set_back_button_target_page_id("")
	host.set_close_button_label("关闭")
	host.set_empty_state_text("请选择一个内政功能入口。")
	host.set_title_font_size(22)
	host.set_empty_state_font_size(14)
	if host.has_method("set_body_margins"):
		host.call("set_body_margins", 16, 12, 16, 14)
	if host.has_method("set_content_margins"):
		host.call("set_content_margins", 12, 10, 12, 12)
	host.set_tab_settings([])
	_select_top_tab(preserved_top_tab)


func _build_top_tab_settings() -> Array:
	var tab_settings: Array = []
	for tab_id in TOP_TAB_ORDER:
		var tab_def: Dictionary = _get_tab_def(tab_id)
		if tab_def.is_empty():
			continue
		tab_settings.append({
			"id": tab_id,
			"label": str(tab_def.get("label", tab_id)),
			"tooltip": str(tab_def.get("summary_title", "")),
		})
	return tab_settings


func _select_top_tab(tab_id: String) -> void:
	var tab_def: Dictionary = _get_tab_def(tab_id)
	if tab_def.is_empty():
		return
	var host = _ensure_host()
	if host == null:
		return
	_current_top_tab_id = tab_id
	_apply_panel_chrome(tab_id)
	host.set_active_tab(tab_id)
	host.set_content_node(_ensure_tab_view(tab_id).get("root") as Node)
	page_changed.emit(_compose_page_id(tab_id, _get_current_section_id(tab_id)))


func _apply_panel_chrome(tab_id: String) -> void:
	var host = _ensure_host()
	if host == null:
		return
	host.set_panel_title(_panel_chrome_title(tab_id))
	host.set_back_button_label("返回")
	if host.has_method("set_back_button_target_page_id"):
		if _is_home_entry_tab(tab_id):
			host.set_back_button_target_page_id("home/lobby")
		else:
			host.set_back_button_target_page_id("")
	host.set_close_button_label("关闭")
	host.set_title_font_size(24 if _is_home_entry_tab(tab_id) else 22)


func _panel_chrome_title(tab_id: String) -> String:
	if _is_home_entry_tab(tab_id):
		var tab_def := _get_tab_def(tab_id)
		var tab_label := str(tab_def.get("label", tab_id)).strip_edges()
		return "内政 · %s" % tab_label if tab_label != "" else "内政"
	return "内政"


func _ensure_tab_view(tab_id: String) -> Dictionary:
	if _tab_views.has(tab_id):
		return _tab_views[tab_id]
	if tab_id == "home":
		return _ensure_home_lobby_view()
	var tab_def: Dictionary = _get_tab_def(tab_id)
	if tab_def.is_empty():
		return {}

	var root := ScrollContainer.new()
	root.name = "InteriorTabRoot_%s" % tab_id
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.mouse_filter = Control.MOUSE_FILTER_PASS
	root.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	root.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(root)

	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 10)
	root.add_child(root_vbox)

	if not _is_home_entry_tab(tab_id):
		root_vbox.add_child(_build_summary_card(tab_id))

	var section_strip = _build_section_strip(tab_id) if _should_show_section_strip(tab_id) else null
	if section_strip != null:
		root_vbox.add_child(section_strip)

	var section_host := Control.new()
	section_host.name = "SectionHost"
	section_host.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	section_host.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(section_host)

	var default_section_id := _get_default_section_id(tab_id)
	_current_section_by_tab[tab_id] = _current_section_by_tab.get(tab_id, default_section_id)
	var current_section_id := str(_current_section_by_tab.get(tab_id, default_section_id))
	if section_strip != null:
		section_strip.set_active_tab(current_section_id)
	_render_section_content(tab_id, current_section_id, section_host)

	var state := {
		"root": root,
		"section_strip": section_strip,
		"section_host": section_host,
		"current_section_id": current_section_id,
	}
	_tab_views[tab_id] = state
	return state


func _ensure_home_lobby_view() -> Dictionary:
	var root := Control.new()
	root.name = "InteriorHomeLobbyRoot"
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var background := TextureRect.new()
	background.name = "InteriorHomeLobbyBackground"
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	background.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	background.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	var background_texture := _load_texture_from_res_path(INTERIOR_HOME_LOBBY_BACKGROUND_PATH)
	if background_texture != null:
		background.texture = background_texture
	_set_full_rect(background)
	root.add_child(background)

	var scene_scrim := ColorRect.new()
	scene_scrim.name = "InteriorHomeLobbySceneScrim"
	scene_scrim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	scene_scrim.color = Color(0.0, 0.0, 0.0, 0.26)
	_set_full_rect(scene_scrim)
	root.add_child(scene_scrim)

	var lower_scrim := ColorRect.new()
	lower_scrim.name = "InteriorHomeLobbyLowerScrim"
	lower_scrim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	lower_scrim.color = Color(0.0, 0.0, 0.0, 0.34)
	_set_anchor_rect(lower_scrim, 0.0, 0.56, 1.0, 1.0)
	root.add_child(lower_scrim)

	var header := VBoxContainer.new()
	header.name = "InteriorHomeLobbyHeader"
	header.alignment = BoxContainer.ALIGNMENT_CENTER
	header.add_theme_constant_override("separation", 10)
	_set_anchor_rect(header, 0.14, 0.06, 0.86, 0.26)
	root.add_child(header)

	var title := _make_label("%s · 内政" % _snapshot_string("city_name", DEFAULT_CITY_NAME), 30, false)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_color_override("font_color", Color(0.98, 0.90, 0.74, 1.0))
	header.add_child(title)

	var resource_rail := _make_home_resource_strip()
	_set_anchor_rect(resource_rail, 0.035, 0.20, 0.205, 0.70)
	root.add_child(resource_rail)

	var entry_stage := Control.new()
	entry_stage.name = "InteriorHomeEntryStage"
	_set_anchor_rect(entry_stage, 0.27, 0.40, 0.87, 0.82)
	root.add_child(entry_stage)
	for raw_entry in HOME_ENTRY_DEFS:
		var entry: Dictionary = raw_entry if raw_entry is Dictionary else {}
		var entry_node := _make_home_entry_node(entry)
		_place_home_entry_node(entry_node, str(entry.get("id", "")).strip_edges())
		entry_stage.add_child(entry_node)
	_current_section_by_tab["home"] = "lobby"
	var state := {
		"root": root,
		"section_strip": null,
		"section_host": null,
		"current_section_id": "lobby",
	}
	_tab_views["home"] = state
	return state


func _make_home_entry_node(entry: Dictionary) -> Control:
	var entry_id := str(entry.get("id", "")).strip_edges()
	var label := str(entry.get("label", entry_id)).strip_edges()
	var meta := str(entry.get("meta", "")).strip_edges()
	var page_id := str(entry.get("page_id", "")).strip_edges()
	var root := Control.new()
	root.name = "InteriorHomeEntry_%s" % entry_id
	root.mouse_filter = Control.MOUSE_FILTER_PASS
	root.set_meta("interior_home_entry_chrome_convergence_token", UI_COMPONENT_FACTORY.interior_home_entry_chrome_convergence_token())
	var badge_button := Button.new()
	badge_button.name = "BadgeHitArea"
	badge_button.text = ""
	badge_button.tooltip_text = label
	badge_button.focus_mode = Control.FOCUS_ALL
	badge_button.mouse_filter = Control.MOUSE_FILTER_STOP
	badge_button.set_meta("interior_home_entry_chrome_convergence_token", UI_COMPONENT_FACTORY.interior_home_entry_chrome_convergence_token())
	UI_COMPONENT_FACTORY.apply_interior_home_entry_badge_hit_area_style(badge_button)
	_set_anchor_rect(badge_button, 0.12, 0.00, 0.88, 0.58)
	root.add_child(badge_button)
	var badge_image := TextureRect.new()
	badge_image.name = "BadgeImage"
	badge_image.mouse_filter = Control.MOUSE_FILTER_IGNORE
	badge_image.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	badge_image.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	var badge_texture := _load_texture_from_res_path(str(INTERIOR_HOME_ENTRY_BADGE_PATHS.get(entry_id, "")))
	if badge_texture != null:
		badge_image.texture = badge_texture
	_set_full_rect(badge_image)
	badge_button.add_child(badge_image)
	var button := Button.new()
	button.name = "InteriorHomeEntryButton_%s" % entry_id
	button.text = "%s\n%s" % [label, meta]
	button.focus_mode = Control.FOCUS_ALL
	button.tooltip_text = label
	button.mouse_filter = Control.MOUSE_FILTER_STOP
	button.set_meta("interior_home_entry_button_token", INTERIOR_HOME_ENTRY_BUTTON_TOKEN)
	button.set_meta("interior_home_entry_action_id", "interior_home_entry:%s" % entry_id)
	button.set_meta("interior_home_entry_target_page_id", page_id)
	button.set_meta("interior_home_entry_live_text_contract", INTERIOR_HOME_ENTRY_LIVE_TEXT_CONTRACT)
	button.set_meta("interior_home_entry_live_text_label", label)
	button.set_meta("interior_home_entry_chrome_convergence_token", UI_COMPONENT_FACTORY.interior_home_entry_chrome_convergence_token())
	_set_anchor_rect(button, 0.00, 0.48, 1.00, 1.00)
	UI_COMPONENT_FACTORY.apply_interior_home_entry_button_style(button)
	root.add_child(button)
	badge_button.pressed.connect(func() -> void:
		_on_home_entry_pressed(page_id)
	)
	button.pressed.connect(Callable(self, "_on_home_entry_pressed").bind(page_id))
	return root


func _place_home_entry_node(node: Control, entry_id: String) -> void:
	match entry_id:
		"market":
			_set_anchor_rect(node, 0.34, 0.34, 0.58, 0.76)
		"trade":
			_set_anchor_rect(node, 0.10, 0.50, 0.34, 0.92)
		"tax":
			_set_anchor_rect(node, 0.60, 0.14, 0.84, 0.56)
		"affairs":
			_set_anchor_rect(node, 0.66, 0.54, 0.90, 0.96)
		_:
			_set_anchor_rect(node, 0.38, 0.44, 0.62, 0.86)


func _make_home_resource_strip() -> Control:
	var strip := PanelContainer.new()
	strip.name = "InteriorHomeResourceStrip"
	UI_COMPONENT_FACTORY.apply_interior_home_resource_rail_style(strip)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_top", 14)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_bottom", 14)
	strip.add_child(margin)
	var column := VBoxContainer.new()
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)
	var rail_title := _make_label("府库", 22, false)
	rail_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	rail_title.add_theme_color_override("font_color", Color(0.98, 0.86, 0.58, 1.0))
	column.add_child(rail_title)
	var resource_defs := [
		{"label": "粮", "value": _snapshot_int("food", 0)},
		{"label": "木", "value": _snapshot_int("wood", 0)},
		{"label": "石", "value": _snapshot_int("stone", 0)},
		{"label": "铁", "value": _snapshot_int("iron", 0)},
		{"label": "开发", "value": _snapshot_int("development_points", 0)},
		{"label": "军令", "value": _snapshot_int("order", 0)},
	]
	for resource_def in resource_defs:
		column.add_child(_make_home_resource_chip(resource_def))
	return strip


func _make_home_resource_chip(resource_def: Dictionary) -> Control:
	var chip := PanelContainer.new()
	UI_COMPONENT_FACTORY.apply_interior_home_resource_chip_style(chip)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 8)
	margin.add_theme_constant_override("margin_top", 4)
	margin.add_theme_constant_override("margin_right", 8)
	margin.add_theme_constant_override("margin_bottom", 4)
	chip.add_child(margin)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 6)
	margin.add_child(row)
	var label := _make_label(str(resource_def.get("label", "")), UI_COMPONENT_FACTORY.interior_home_resource_chip_font_size(), false)
	label.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	label.add_theme_color_override("font_color", Color(0.96, 0.76, 0.36, 1.0))
	row.add_child(label)
	var value := _make_label(str(resource_def.get("value", 0)), UI_COMPONENT_FACTORY.interior_home_resource_chip_font_size(), false)
	value.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	value.add_theme_color_override("font_color", Color(0.95, 0.91, 0.84, 1.0))
	row.add_child(value)
	return chip


func _on_home_entry_pressed(page_id: String) -> void:
	if page_id.strip_edges() == "":
		return
	set_active_page_id(page_id)


func _build_summary_card(tab_id: String) -> Control:
	var tab_def: Dictionary = _get_tab_def(tab_id)
	var city_name := _snapshot_string("city_name", DEFAULT_CITY_NAME)
	var home_tile_id := _snapshot_string("home_tile_id", "")
	var development_points := _snapshot_int("development_points", 0)
	var food := _snapshot_int("food", _snapshot_int("gold", 0))
	var wood := _snapshot_int("wood", 0)
	var stone := _snapshot_int("stone", 0)
	var iron := _snapshot_int("iron", 0)
	var order := _snapshot_int("order", 0)
	var governance := _snapshot_int("governance", 0)
	var logistics := _snapshot_int("logistics", 0)
	var defense := _snapshot_int("defense", 0)
	var recruitment := _snapshot_int("recruitment", 0)
	var captured_city_count := _snapshot_int("captured_city_count", 0)
	var recruit_cooldown := _snapshot_int("recruit_cooldown", 0)
	var tech_levels: Dictionary = _interior_snapshot.get("tech_levels", {}) as Dictionary
	var building_groups: Dictionary = _interior_snapshot.get("building_groups", {}) as Dictionary
	var active_group_count := _snapshot_building_count(tab_id, building_groups)
	var affairs_queue := _snapshot_affairs_queue()
	if active_group_count > 0 and BUILDING_SECTION_BY_TAB.has(tab_id):
		return _build_compact_building_summary_card(
			tab_def,
			city_name,
			home_tile_id,
			development_points,
			order,
			food,
			wood,
			stone,
			iron,
			governance,
			logistics,
			defense,
			recruitment,
			active_group_count
		)
	var card := PanelContainer.new()
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_bottom", 10)

	var vbox := VBoxContainer.new()
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.add_theme_constant_override("separation", 6)
	vbox.add_child(_make_label("%s · %s" % [city_name, str(tab_def.get("label", "内政"))], 22))
	vbox.add_child(_make_label("粮 %d    木 %d    石 %d    铁 %d    开发点 %d    军令 %d" % [food, wood, stone, iron, development_points, order], 14, true))
	vbox.add_child(_make_label(str(tab_def.get("summary_title", "内政面板")), 16))
	var shown_summary_lines := 0
	for line in tab_def.get("summary_lines", []) as Array:
		if shown_summary_lines >= 2:
			break
		vbox.add_child(_make_label(str(line), 13, true))
		shown_summary_lines += 1
	margin.add_child(vbox)
	card.add_child(margin)
	return card


func _build_compact_building_summary_card(
	tab_def: Dictionary,
	city_name: String,
	home_tile_id: String,
	development_points: int,
	order: int,
	food: int,
	wood: int,
	stone: int,
	iron: int,
	governance: int,
	logistics: int,
	defense: int,
	recruitment: int,
	active_group_count: int
) -> Control:
	var card := PanelContainer.new()
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.custom_minimum_size = Vector2(0, 112)
	card.add_theme_stylebox_override("panel", UI_COMPONENT_FACTORY.make_surface_panel_style(Color(0.040, 0.039, 0.036, 0.94), Color(0.58, 0.45, 0.22, 0.48), 1, 4))
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 10)
	var vbox := VBoxContainer.new()
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.add_theme_constant_override("separation", 3)
	var tile_label := home_tile_id if home_tile_id != "" else "未定位"
	var lines := [
		"%s · %s" % [city_name, str(tab_def.get("label", "内政"))],
		"homeTile：%s | 开发点：%d | 军令：%d" % [tile_label, development_points, order],
		"粮 %d | 木 %d | 石 %d | 铁 %d" % [food, wood, stone, iron],
		"技术 政%d / 后%d / 防%d / 募%d    建筑树 %d 项" % [governance, logistics, defense, recruitment, active_group_count],
	]
	for index in range(lines.size()):
		var label := _make_label(str(lines[index]), 18 if index == 0 else 12, true)
		vbox.add_child(label)
	margin.add_child(vbox)
	card.add_child(margin)
	return card


func _build_facility_node_hub(active_tab_id: String, active_section_id: String) -> Control:
	var panel := PanelContainer.new()
	panel.name = "InteriorFacilityNodeHub"
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_interior_facility_node_hub_panel_style(panel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 16)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_right", 16)
	margin.add_theme_constant_override("margin_bottom", 12)

	var vbox := VBoxContainer.new()
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.add_theme_constant_override("separation", UI_COMPONENT_FACTORY.interior_facility_node_hub_spacing())

	var title := _make_label("主城设施", UI_COMPONENT_FACTORY.interior_facility_node_hub_title_font_size())
	UI_COMPONENT_FACTORY.apply_interior_facility_node_hub_title_style(title)
	vbox.add_child(title)

	var row_container := VBoxContainer.new()
	row_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row_container.add_theme_constant_override("separation", UI_COMPONENT_FACTORY.interior_facility_node_hub_spacing())
	var row_count := UI_COMPONENT_FACTORY.interior_facility_node_hub_rows()
	var columns_per_row := int(ceil(float(FACILITY_NODE_DEFS.size()) / float(row_count)))
	var node_index := 0
	for row_index in range(row_count):
		var row := HBoxContainer.new()
		row.name = "FacilityNodeRow_%d" % row_index
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.alignment = BoxContainer.ALIGNMENT_CENTER
		row.add_theme_constant_override("separation", UI_COMPONENT_FACTORY.interior_facility_node_hub_spacing())
		for _column_index in range(columns_per_row):
			if node_index >= FACILITY_NODE_DEFS.size():
				row.add_child(_make_facility_node_spacer())
				continue
			var node := FACILITY_NODE_DEFS[node_index] as Dictionary
			row.add_child(_make_facility_node_button(node, active_tab_id, active_section_id))
			node_index += 1
		row_container.add_child(row)
	vbox.add_child(row_container)

	margin.add_child(vbox)
	panel.add_child(margin)
	return panel


func _make_facility_node_button(node_def: Dictionary, active_tab_id: String, active_section_id: String) -> Button:
	var page_id := str(node_def.get("page_id", "")).strip_edges()
	var node_tab_id := page_id
	var node_section_id := ""
	var separator_index := page_id.find("/")
	if separator_index != -1:
		node_tab_id = page_id.substr(0, separator_index).strip_edges()
		node_section_id = page_id.substr(separator_index + 1).strip_edges()
	var active := node_tab_id == active_tab_id and node_section_id == active_section_id
	var button := Button.new()
	button.name = "InteriorFacilityNode_%s" % str(node_def.get("id", "node"))
	button.text = "%s\n%s" % [
		str(node_def.get("label", "设施")),
		str(node_def.get("meta", "")),
	]
	button.tooltip_text = page_id
	button.focus_mode = Control.FOCUS_ALL
	button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	UI_COMPONENT_FACTORY.apply_interior_facility_node_button_style(button, active)
	button.pressed.connect(func() -> void:
		if page_id != "":
			set_active_page_id(page_id)
	)
	return button


func _make_facility_node_spacer() -> Control:
	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(UI_COMPONENT_FACTORY.interior_facility_node_min_width(), 1)
	spacer.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	return spacer


func _build_section_strip(tab_id: String) -> Control:
	var section_strip = PANEL_TAB_STRIP_SCENE.instantiate()
	section_strip.empty_state_text = "暂无内政切项"
	section_strip.tab_button_min_width = 172.0
	section_strip.tab_button_text_size = 18
	section_strip.set_tab_settings(_build_section_tab_settings(tab_id))
	var section_callback := Callable(self, "_on_section_tab_selected").bind(tab_id)
	if not section_strip.tab_selected.is_connected(section_callback):
		section_strip.tab_selected.connect(section_callback)
	return section_strip


func _should_show_section_strip(tab_id: String) -> bool:
	return not _is_home_entry_tab(tab_id)


func _build_section_tab_settings(tab_id: String) -> Array:
	var tab_def: Dictionary = _get_tab_def(tab_id)
	var section_settings: Array = []
	for raw_section in tab_def.get("sections", []) as Array:
		var section: Dictionary = raw_section if raw_section is Dictionary else {}
		var section_id := str(section.get("id", "")).strip_edges()
		if section_id.is_empty():
			continue
		section_settings.append({
			"id": section_id,
			"label": str(section.get("label", section_id)),
			"tooltip": str(section.get("title", "")),
		})
	return section_settings


func _render_section_content(tab_id: String, section_id: String, section_host: Control = null) -> void:
	var resolved_section_host: Control = section_host
	if resolved_section_host == null:
		var state: Dictionary = _tab_views.get(tab_id, {}) as Dictionary
		resolved_section_host = state.get("section_host") as Control
	if resolved_section_host == null:
		return
	_clear_control_children(resolved_section_host)
	var section_view := _build_section_view(tab_id, section_id)
	if section_view == null:
		section_view = _make_label("等待内政切项加载。", 14, true)
	if section_view is Control:
		_set_full_rect(section_view as Control)
	resolved_section_host.add_child(section_view)
	if section_view is Control:
		UI_COMPONENT_FACTORY.apply_motion_interior_section_enter(section_view as Control, 0)


func _build_section_view(tab_id: String, section_id: String) -> Control:
	var section_def: Dictionary = _resolve_section_payload(tab_id, section_id)
	if section_def.is_empty():
		return _make_label("暂无可用内政切项。", 14, true)
	var dynamic_view: Control = _build_dynamic_section_view(tab_id, section_id, section_def)
	if dynamic_view != null:
		return dynamic_view
	return CHILD_PAGE_BLOCK_FACTORY_SCRIPT.new().build_section_page(_build_child_page_payload(tab_id, section_id, section_def))


func _build_dynamic_section_view(tab_id: String, section_id: String, section_def: Dictionary) -> Control:
	if _should_use_building_group_view(tab_id, section_id):
		return _build_building_group_view(tab_id, section_def)
	if _should_use_market_overview_view(tab_id, section_id):
		return _build_market_overview_page_view(section_def)
	if _should_use_trade_exchange_view(tab_id, section_id):
		return _build_trade_exchange_page_view(section_def)
	if _should_use_tax_treasury_view(tab_id, section_id):
		return _build_tax_treasury_page_view(section_def)
	if _should_use_affairs_operations_view(tab_id, section_id):
		return _build_affairs_operations_page_view(section_def)
	if _should_use_secondary_consumer_cards_view(tab_id, section_id):
		return _build_secondary_consumer_cards_page_view(tab_id, section_def)
	if _is_home_entry_tab(tab_id):
		return _build_secondary_page_view(tab_id, section_id, section_def)
	return null


func _should_use_market_overview_view(tab_id: String, section_id: String) -> bool:
	return tab_id == "market" and section_id == "overview"


func _should_use_trade_exchange_view(tab_id: String, section_id: String) -> bool:
	return tab_id == "trade" and section_id == "overview"


func _should_use_tax_treasury_view(tab_id: String, section_id: String) -> bool:
	return tab_id == "tax" and section_id == "structure"


func _should_use_affairs_operations_view(tab_id: String, section_id: String) -> bool:
	return tab_id == "affairs" and section_id == "queue"


func _should_use_secondary_consumer_cards_view(tab_id: String, section_id: String) -> bool:
	match "%s/%s" % [tab_id, section_id]:
		_:
			return false


func _is_home_entry_tab(tab_id: String) -> bool:
	for raw_entry in HOME_ENTRY_DEFS:
		var entry: Dictionary = raw_entry if raw_entry is Dictionary else {}
		if str(entry.get("id", "")).strip_edges() == tab_id:
			return true
	return false


func _build_secondary_atmosphere_shell(tab_id: String, root_name: String) -> Dictionary:
	var root := Control.new()
	root.name = "%sAtmosphereRoot" % root_name
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.custom_minimum_size = Vector2(0, 492)

	var background_path := str(INTERIOR_SECONDARY_BACKGROUND_PATHS.get(tab_id, "")).strip_edges()
	var background := TextureRect.new()
	background.name = "InteriorSecondaryAtmosphereBackground_%s" % tab_id
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	background.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	background.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	var background_texture := _load_texture_from_res_path(background_path)
	if background_texture != null:
		background.texture = background_texture
	_set_full_rect(background)
	root.add_child(background)

	var scrim := ColorRect.new()
	scrim.name = "InteriorSecondaryAtmosphereScrim_%s" % tab_id
	scrim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	scrim.color = Color(0.12, 0.08, 0.03, UI_COMPONENT_FACTORY.interior_secondary_atmosphere_scrim_alpha())
	_set_full_rect(scrim)
	root.add_child(scrim)

	var panel := PanelContainer.new()
	panel.name = root_name
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_interior_secondary_atmosphere_surface_style(panel)
	_set_anchor_rect(panel, 0.0, 0.0, 1.0, 1.0)
	root.add_child(panel)
	return {
		"root": root,
		"panel": panel,
		"background_loaded": background_texture != null,
		"background_path": background_path,
	}


func _build_market_overview_page_view(section_def: Dictionary) -> Control:
	var shell := _build_secondary_atmosphere_shell("market", "InteriorMarketOverviewConsumerCards")
	var root: Control = shell.get("root") as Control
	var panel: PanelContainer = shell.get("panel") as PanelContainer

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 22)
	margin.add_theme_constant_override("margin_top", 18)
	margin.add_theme_constant_override("margin_right", 22)
	margin.add_theme_constant_override("margin_bottom", 18)
	panel.add_child(margin)

	var vbox := VBoxContainer.new()
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_theme_constant_override("separation", 16)
	margin.add_child(vbox)

	var header := HBoxContainer.new()
	header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_theme_constant_override("separation", 18)
	vbox.add_child(header)

	var title_box := VBoxContainer.new()
	title_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_box.add_theme_constant_override("separation", 4)
	header.add_child(title_box)

	var title := _make_label(str(section_def.get("title", "市井总览")), UI_COMPONENT_FACTORY.interior_secondary_page_title_font_size(), true)
	title.add_theme_color_override("font_color", Color(0.98, 0.88, 0.62, 1.0))
	title_box.add_child(title)

	var subtitle := _make_label("府库与经营", UI_COMPONENT_FACTORY.interior_secondary_page_body_font_size(), true)
	subtitle.add_theme_color_override("font_color", Color(0.88, 0.82, 0.68, 1.0))
	title_box.add_child(subtitle)

	var grid := GridContainer.new()
	grid.columns = 3
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	grid.add_theme_constant_override("h_separation", UI_COMPONENT_FACTORY.interior_secondary_page_grid_separation())
	grid.add_theme_constant_override("v_separation", UI_COMPONENT_FACTORY.interior_secondary_page_grid_separation())
	vbox.add_child(grid)

	for raw_card in _market_overview_card_defs():
		var card: Dictionary = raw_card if raw_card is Dictionary else {}
		grid.add_child(_build_market_overview_card(card))
	return root


func _build_secondary_consumer_cards_page_view(tab_id: String, section_def: Dictionary) -> Control:
	var root := PanelContainer.new()
	root.name = "InteriorSecondaryConsumerCards_%s" % tab_id
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.custom_minimum_size = Vector2(0, 492)
	UI_COMPONENT_FACTORY.apply_interior_secondary_page_panel_style(root)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 22)
	margin.add_theme_constant_override("margin_top", 18)
	margin.add_theme_constant_override("margin_right", 22)
	margin.add_theme_constant_override("margin_bottom", 18)
	root.add_child(margin)

	var vbox := VBoxContainer.new()
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_theme_constant_override("separation", 16)
	margin.add_child(vbox)

	var title := _make_label(str(section_def.get("title", "")), UI_COMPONENT_FACTORY.interior_secondary_page_title_font_size(), true)
	title.add_theme_color_override("font_color", Color(0.98, 0.88, 0.62, 1.0))
	vbox.add_child(title)

	var grid := GridContainer.new()
	grid.columns = 4
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", UI_COMPONENT_FACTORY.interior_secondary_page_grid_separation())
	grid.add_theme_constant_override("v_separation", UI_COMPONENT_FACTORY.interior_secondary_page_grid_separation())
	vbox.add_child(grid)

	for raw_card in _secondary_consumer_card_defs(tab_id):
		var card: Dictionary = raw_card if raw_card is Dictionary else {}
		grid.add_child(_build_market_overview_card(card))
	return root


func _build_trade_exchange_page_view(section_def: Dictionary) -> Control:
	var shell := _build_secondary_atmosphere_shell("trade", "InteriorTradeExchangeBoard")
	var root: Control = shell.get("root") as Control
	var panel: PanelContainer = shell.get("panel") as PanelContainer

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 22)
	margin.add_theme_constant_override("margin_top", 18)
	margin.add_theme_constant_override("margin_right", 22)
	margin.add_theme_constant_override("margin_bottom", 18)
	panel.add_child(margin)

	var vbox := VBoxContainer.new()
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_theme_constant_override("separation", 18)
	margin.add_child(vbox)

	var header := HBoxContainer.new()
	header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_theme_constant_override("separation", 18)
	vbox.add_child(header)
	var title_box := VBoxContainer.new()
	title_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_box.add_theme_constant_override("separation", 4)
	header.add_child(title_box)
	var title := _make_label(str(section_def.get("title", "交易总览")), UI_COMPONENT_FACTORY.interior_secondary_page_title_font_size(), true)
	title.add_theme_color_override("font_color", Color(0.98, 0.88, 0.62, 1.0))
	title_box.add_child(title)
	var hint := _make_label("粮、木、石、铁按折损比例互换", UI_COMPONENT_FACTORY.interior_secondary_page_body_font_size(), true)
	hint.add_theme_color_override("font_color", Color(0.86, 0.80, 0.68, 1.0))
	title_box.add_child(hint)

	var split := HBoxContainer.new()
	split.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	split.size_flags_vertical = Control.SIZE_EXPAND_FILL
	split.alignment = BoxContainer.ALIGNMENT_BEGIN
	split.add_theme_constant_override("separation", 18)
	vbox.add_child(split)

	split.add_child(_build_trade_resource_column("持有资源", _trade_resource_defs(), true))
	split.add_child(_build_trade_exchange_center_panel())
	split.add_child(_build_trade_resource_column("可换资源", _trade_resource_defs(), false))
	return root


func _build_trade_resource_column(title_text: String, resource_defs: Array, source_side: bool) -> Control:
	var panel := PanelContainer.new()
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_interior_market_overview_card_style(panel, source_side)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 14)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 14)
	panel.add_child(margin)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)

	var title := _make_label(title_text, UI_COMPONENT_FACTORY.interior_market_overview_primary_font_size(), true)
	title.add_theme_color_override("font_color", Color(0.98, 0.91, 0.76, 1.0))
	column.add_child(title)
	for raw_def in resource_defs:
		var resource_def: Dictionary = raw_def if raw_def is Dictionary else {}
		column.add_child(_build_trade_resource_row(resource_def, source_side))
	return panel


func _build_trade_resource_row(resource_def: Dictionary, source_side: bool) -> Control:
	var row_panel := PanelContainer.new()
	row_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row_panel.custom_minimum_size = Vector2(0, 64)
	UI_COMPONENT_FACTORY.apply_interior_market_overview_symbol_badge_style(row_panel)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_top", 8)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_bottom", 8)
	row_panel.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 12)
	margin.add_child(row)
	var symbol := _make_label(str(resource_def.get("symbol", "")), 24, false)
	symbol.custom_minimum_size = Vector2(36, 0)
	symbol.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	symbol.add_theme_color_override("font_color", Color(1.0, 0.82, 0.30, 1.0))
	row.add_child(symbol)
	var label := _make_label(str(resource_def.get("label", "")), 18, true)
	label.add_theme_color_override("font_color", Color(0.98, 0.92, 0.78, 1.0))
	row.add_child(label)
	var value_text := str(resource_def.get("value", ""))
	if not source_side:
		value_text = "可换"
	var value := _make_label(value_text, 20, false)
	value.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	value.add_theme_color_override("font_color", Color(0.98, 0.70, 0.28, 1.0))
	row.add_child(value)
	return row_panel


func _build_tax_treasury_page_view(section_def: Dictionary) -> Control:
	var shell := _build_secondary_atmosphere_shell("tax", "InteriorTaxTreasuryBoard")
	var root: Control = shell.get("root") as Control
	var panel: PanelContainer = shell.get("panel") as PanelContainer

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 34)
	margin.add_theme_constant_override("margin_top", 42)
	margin.add_theme_constant_override("margin_right", 34)
	margin.add_theme_constant_override("margin_bottom", 36)
	panel.add_child(margin)

	var vbox := VBoxContainer.new()
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.alignment = BoxContainer.ALIGNMENT_BEGIN
	margin.add_child(vbox)
	var top_focus_spacer := Control.new()
	top_focus_spacer.custom_minimum_size = Vector2(0, 36)
	vbox.add_child(top_focus_spacer)
	vbox.add_child(_build_tax_timeline_panel())
	return root


func _build_affairs_operations_page_view(section_def: Dictionary) -> Control:
	var construction_queues := _snapshot_construction_queues()
	var city_orders := _visual_smoke_array(construction_queues.get("city_inner", []))
	var world_orders := _visual_smoke_array(construction_queues.get("world_outer", []))
	var all_orders := city_orders + world_orders
	_ensure_selected_work_order_from_orders(all_orders)
	var shell := _build_secondary_atmosphere_shell("affairs", "InteriorAffairsOperationsBoard")
	var root: Control = shell.get("root") as Control
	var panel: PanelContainer = shell.get("panel") as PanelContainer

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 22)
	margin.add_theme_constant_override("margin_top", 18)
	margin.add_theme_constant_override("margin_right", 22)
	margin.add_theme_constant_override("margin_bottom", 18)
	panel.add_child(margin)

	var vbox := VBoxContainer.new()
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_theme_constant_override("separation", 14)
	margin.add_child(vbox)

	var header := HBoxContainer.new()
	header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_theme_constant_override("separation", 12)
	vbox.add_child(header)
	var title := _make_label("正在建设", UI_COMPONENT_FACTORY.interior_secondary_page_title_font_size(), true)
	title.add_theme_color_override("font_color", Color(0.98, 0.88, 0.62, 1.0))
	header.add_child(title)
	vbox.add_child(_build_construction_work_order_feed(city_orders, world_orders))
	return root


func _build_affairs_queue_summary_panel() -> Control:
	var panel := PanelContainer.new()
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(520, 0)
	UI_COMPONENT_FACTORY.apply_interior_market_overview_card_style(panel, true)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 24)
	margin.add_theme_constant_override("margin_top", 18)
	margin.add_theme_constant_override("margin_right", 24)
	margin.add_theme_constant_override("margin_bottom", 18)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 18)
	margin.add_child(column)
	var title := _make_label("当前队列", 32, true)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_color_override("font_color", Color(0.98, 0.91, 0.76, 1.0))
	column.add_child(title)
	var count := _snapshot_affairs_queue().size()
	var value := _make_label(str(count), 72, false)
	value.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	value.add_theme_color_override("font_color", Color(0.98, 0.70, 0.28, 1.0))
	column.add_child(value)
	var meta := _make_label("项待处理", 26, true)
	meta.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	meta.add_theme_color_override("font_color", Color(0.86, 0.82, 0.70, 1.0))
	column.add_child(meta)
	var primary_button := _build_affairs_operation_button({"id": "submit", "title": "提交", "meta": "确认安排", "primary": true})
	primary_button.custom_minimum_size = Vector2(0, 106)
	column.add_child(primary_button)
	return panel


func _build_affairs_operation_button(action_def: Dictionary) -> Control:
	var button := Button.new()
	button.text = "%s\n%s" % [
		str(action_def.get("title", "")),
		str(action_def.get("meta", "")),
	]
	button.tooltip_text = str(action_def.get("title", ""))
	button.focus_mode = Control.FOCUS_ALL
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.size_flags_vertical = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_interior_home_entry_button_style(button)
	button.custom_minimum_size = Vector2(0, 112 if bool(action_def.get("primary", false)) else 102)
	button.add_theme_font_size_override("font_size", 24 if bool(action_def.get("primary", false)) else 22)
	return button


func _build_tax_collection_hero_panel() -> Control:
	var tax_runtime := _snapshot_tax_runtime()
	var active_slot := _active_tax_slot()
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(430, 470)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	UI_COMPONENT_FACTORY.apply_interior_market_overview_card_style(panel, true)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 24)
	margin.add_theme_constant_override("margin_top", 22)
	margin.add_theme_constant_override("margin_right", 24)
	margin.add_theme_constant_override("margin_bottom", 22)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)
	column.add_child(_build_facility_asset_box(_asset_path_from_ref(tax_runtime.get("hero_asset_ref", {}), str(tax_runtime.get("asset_path", ""))), Vector2(320, 210), "税"))
	var current_tax_title := str(active_slot.get("title", tax_runtime.get("title", "税课"))).strip_edges()
	var title := _make_label(current_tax_title, 42, true)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_color_override("font_color", Color(0.98, 0.91, 0.76, 1.0))
	column.add_child(title)
	var countdown := _make_label(str(tax_runtime.get("remaining_label", "现在可收")), 28, true)
	countdown.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	countdown.add_theme_color_override("font_color", Color(0.98, 0.92, 0.78, 1.0))
	column.add_child(countdown)
	if _primary_action_enabled(tax_runtime, "primary_action_enabled", false):
		var button := Button.new()
		button.text = _primary_action_label(tax_runtime, "primary_action_label", "征收")
		button.tooltip_text = button.text
		button.focus_mode = Control.FOCUS_ALL
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		UI_COMPONENT_FACTORY.apply_interior_home_entry_button_style(button)
		button.custom_minimum_size = Vector2(0, 96)
		button.add_theme_font_size_override("font_size", 28)
		column.add_child(button)
	return panel


func _build_tax_schedule_panel() -> Control:
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 12)
	for raw_slot in _tax_schedule_slots():
		var slot: Dictionary = raw_slot if raw_slot is Dictionary else {}
		column.add_child(_build_tax_schedule_slot_card(slot))
	return column


func _build_tax_schedule_slot_card(slot: Dictionary) -> Control:
	var card := PanelContainer.new()
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.size_flags_vertical = Control.SIZE_EXPAND_FILL
	card.custom_minimum_size = Vector2(0, 108)
	UI_COMPONENT_FACTORY.apply_interior_market_overview_card_style(card, bool(slot.get("emphasized", false)))
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 10)
	card.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 14)
	margin.add_child(row)
	row.add_child(_build_facility_asset_box(_asset_path_from_ref(slot.get("asset_ref", {}), str(slot.get("asset_path", ""))), Vector2(96, 78), str(slot.get("label", "税")).left(1)))
	var text_box := VBoxContainer.new()
	text_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	text_box.add_theme_constant_override("separation", 4)
	row.add_child(text_box)
	var top := _make_label("%s  %s" % [str(slot.get("label", "")), str(slot.get("time_label", ""))], 20, true)
	top.add_theme_color_override("font_color", Color(0.86, 0.78, 0.58, 1.0))
	text_box.add_child(top)
	var title := _make_label(str(slot.get("title", "")), 28, true)
	title.add_theme_color_override("font_color", Color(0.98, 0.92, 0.78, 1.0))
	text_box.add_child(title)
	var reward := _make_label(str(slot.get("reward_label", "")), 20, true)
	reward.add_theme_color_override("font_color", Color(0.80, 0.75, 0.66, 1.0))
	text_box.add_child(reward)
	var state_box := VBoxContainer.new()
	state_box.custom_minimum_size = Vector2(108, 0)
	state_box.alignment = BoxContainer.ALIGNMENT_CENTER
	state_box.add_theme_constant_override("separation", 4)
	row.add_child(state_box)
	var state := _make_label(str(slot.get("state_label", "")), 24, true)
	state.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	state.add_theme_color_override("font_color", Color(0.98, 0.70, 0.28, 1.0))
	state_box.add_child(state)
	var remaining := _make_label(str(slot.get("remaining_label", "")), 18, true)
	remaining.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	remaining.add_theme_color_override("font_color", Color(0.86, 0.82, 0.70, 1.0))
	state_box.add_child(remaining)
	return card


func _build_tax_timeline_panel() -> Control:
	var panel := PanelContainer.new()
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	panel.custom_minimum_size = Vector2(0, 430)
	UI_COMPONENT_FACTORY.apply_interior_market_overview_card_style(panel, true)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 28)
	margin.add_theme_constant_override("margin_top", 24)
	margin.add_theme_constant_override("margin_right", 28)
	margin.add_theme_constant_override("margin_bottom", 24)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 8)
	margin.add_child(row)
	var slots := _tax_schedule_slots()
	var compact_timeline := slots.size() >= 6
	for index in range(slots.size()):
		var slot: Dictionary = slots[index] if slots[index] is Dictionary else {}
		row.add_child(_build_tax_timeline_node(slot, compact_timeline))
		if index < slots.size() - 1:
			row.add_child(_build_tax_timeline_connector(compact_timeline))
	return panel


func _build_tax_timeline_connector(compact: bool = false) -> Control:
	var center := CenterContainer.new()
	center.custom_minimum_size = Vector2(34 if compact else 86, 0)
	center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	center.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var line := ColorRect.new()
	line.color = Color(0.92, 0.62, 0.22, 0.82)
	line.custom_minimum_size = Vector2(42 if compact else 106, 4 if compact else 5)
	center.add_child(line)
	return center


func _build_tax_timeline_node(slot: Dictionary, compact: bool = false) -> Control:
	var state_text := str(slot.get("state", "")).strip_edges()
	var is_collected := state_text == "collected" or bool(slot.get("collected_today", false))
	var is_collectable := state_text == "collectable" or bool(slot.get("collectable_now", false))
	var is_upcoming := not is_collected and not is_collectable
	var node := VBoxContainer.new()
	node.custom_minimum_size = Vector2(168 if compact else 280, 0)
	node.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	node.size_flags_vertical = Control.SIZE_EXPAND_FILL
	node.alignment = BoxContainer.ALIGNMENT_CENTER
	node.add_theme_constant_override("separation", 8 if compact else 14)

	var time_label := _make_label("%s  %s" % [str(slot.get("label", "")), str(slot.get("time_label", ""))], 17 if compact else 24, true)
	time_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	time_label.add_theme_color_override("font_color", Color(0.98, 0.88, 0.58, 1.0) if not is_upcoming else Color(0.72, 0.68, 0.58, 1.0))
	node.add_child(time_label)

	node.add_child(_build_tax_timeline_asset_button(slot, is_collected, is_collectable, is_upcoming, compact))

	var title_text := "今日已领取" if is_collected else str(slot.get("title", "税课")).strip_edges()
	var title := _make_label(title_text, 23 if compact and is_collectable else 20 if compact else 32 if is_collectable else 28, true)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_color_override("font_color", Color(1.0, 0.82, 0.32, 1.0) if is_collectable else Color(0.94, 0.88, 0.74, 1.0))
	if is_upcoming:
		title.add_theme_color_override("font_color", Color(0.58, 0.56, 0.50, 1.0))
	node.add_child(title)

	var status_text := "点击征收" if is_collectable else str(slot.get("remaining_label", "")).strip_edges()
	if status_text == "":
		status_text = str(slot.get("state_label", "")).strip_edges()
	var status := _make_label(status_text, 16 if compact else 22, true)
	status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status.add_theme_color_override("font_color", Color(0.98, 0.70, 0.28, 1.0) if is_collectable else Color(0.74, 0.70, 0.62, 1.0))
	node.add_child(status)
	return node


func _build_tax_timeline_asset_button(slot: Dictionary, is_collected: bool, is_collectable: bool, is_upcoming: bool, compact: bool = false) -> Control:
	var button := Button.new()
	button.text = ""
	button.tooltip_text = "征收" if is_collectable else str(slot.get("state_label", ""))
	button.focus_mode = Control.FOCUS_ALL
	button.disabled = not is_collectable
	button.custom_minimum_size = Vector2(136 if not is_collectable and compact else 152 if compact else 238 if not is_collectable else 268, 112 if not is_collectable and compact else 126 if compact else 196 if not is_collectable else 218)
	button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	UI_COMPONENT_FACTORY.apply_interior_home_entry_button_style(button)
	if is_collectable:
		button.modulate = Color(1.12, 1.05, 0.82, 1.0)
	elif is_upcoming:
		button.modulate = Color(0.52, 0.52, 0.50, 1.0)
	else:
		button.modulate = Color(0.72, 0.72, 0.68, 1.0)

	var center := CenterContainer.new()
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_set_full_rect(center)
	button.add_child(center)
	var asset_box := _build_facility_asset_box(
		_asset_path_from_ref(slot.get("asset_ref", {}), str(slot.get("asset_path", ""))),
		Vector2(132 if compact and is_collectable else 118 if compact else 230 if is_collectable else 206, 90 if compact and is_collectable else 80 if compact else 160 if is_collectable else 144),
		str(slot.get("label", "税")).left(1)
	)
	asset_box.modulate = Color(1.08, 1.02, 0.86, 1.0) if is_collectable else Color(0.64, 0.64, 0.62, 1.0) if is_upcoming else Color(0.82, 0.78, 0.70, 1.0)
	center.add_child(asset_box)

	if is_collected:
		var seal_center := CenterContainer.new()
		seal_center.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_set_full_rect(seal_center)
		button.add_child(seal_center)
		var seal := ColorRect.new()
		seal.color = Color(0.92, 0.80, 0.52, 0.88)
		seal.custom_minimum_size = Vector2(126 if compact else 218, 34 if compact else 46)
		seal_center.add_child(seal)
		var seal_label := _make_label("已领取", 16 if compact else 22, true)
		seal_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		seal_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		seal_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		seal_label.add_theme_color_override("font_color", Color(0.23, 0.12, 0.04, 1.0))
		_set_full_rect(seal_label)
		seal.add_child(seal_label)
	return button


func _build_construction_queue_group_panel(title_text: String, work_orders: Array) -> Control:
	var panel := PanelContainer.new()
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(450, 0)
	UI_COMPONENT_FACTORY.apply_interior_market_overview_card_style(panel, true)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 18)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 18)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 12)
	margin.add_child(column)
	var header := HBoxContainer.new()
	header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_theme_constant_override("separation", 10)
	column.add_child(header)
	var title := _make_label(title_text, 28, true)
	title.add_theme_color_override("font_color", Color(0.98, 0.90, 0.70, 1.0))
	header.add_child(title)
	var scroll := ScrollContainer.new()
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	scroll.mouse_filter = Control.MOUSE_FILTER_PASS
	UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(scroll)
	column.add_child(scroll)
	var list := VBoxContainer.new()
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list.size_flags_vertical = Control.SIZE_EXPAND_FILL
	list.add_theme_constant_override("separation", 12)
	scroll.add_child(list)
	var order_index := 0
	for raw_order in work_orders:
		var work_order: Dictionary = raw_order if raw_order is Dictionary else {}
		var work_order_card := _build_construction_work_order_card(work_order)
		list.add_child(work_order_card)
		UI_COMPONENT_FACTORY.apply_motion_interior_section_enter(work_order_card, order_index)
		order_index += 1
	return panel


func _build_construction_work_order_feed(city_orders: Array, world_orders: Array) -> Control:
	var scroll := ScrollContainer.new()
	scroll.name = "InteriorAffairsWorkOrderTouchScroll"
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	scroll.mouse_filter = Control.MOUSE_FILTER_PASS
	scroll.follow_focus = true
	UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(scroll)

	var grid := GridContainer.new()
	grid.name = "InteriorAffairsUnifiedWorkOrderGrid"
	grid.columns = 2
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	grid.add_theme_constant_override("h_separation", 16)
	grid.add_theme_constant_override("v_separation", 14)
	scroll.add_child(grid)

	for raw_order in city_orders:
		var work_order: Dictionary = raw_order if raw_order is Dictionary else {}
		if not work_order.is_empty():
			grid.add_child(_build_construction_work_order_card(work_order))
	for raw_order in world_orders:
		var work_order: Dictionary = raw_order if raw_order is Dictionary else {}
		if not work_order.is_empty():
			grid.add_child(_build_construction_work_order_card(work_order))
	if grid.get_child_count() == 0:
		grid.add_child(_build_construction_work_order_empty_card())
	return scroll


func _build_construction_work_order_empty_card() -> Control:
	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(0, 170)
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	card.set_meta("interior_affairs_card_chrome_convergence_token", UI_COMPONENT_FACTORY.interior_affairs_card_chrome_convergence_token())
	card.set_meta("interior_affairs_work_order_selected", false)
	UI_COMPONENT_FACTORY.apply_interior_affairs_work_order_card_style(card, false)
	var center := CenterContainer.new()
	card.add_child(center)
	var label := _make_label("暂无建设", 28, true)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_color_override("font_color", Color(0.86, 0.80, 0.66, 1.0))
	center.add_child(label)
	return card


func _build_construction_work_order_card(work_order: Dictionary) -> Control:
	var card := PanelContainer.new()
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	card.custom_minimum_size = Vector2(0, 170)
	var queue_item_id := str(work_order.get("queue_item_id", work_order.get("id", ""))).strip_edges()
	var is_selected := queue_item_id != "" and queue_item_id == _selected_work_order_queue_item_id
	card.set_meta("interior_affairs_card_chrome_convergence_token", UI_COMPONENT_FACTORY.interior_affairs_card_chrome_convergence_token())
	card.set_meta("interior_affairs_work_order_selected", is_selected)
	UI_COMPONENT_FACTORY.apply_interior_affairs_work_order_card_style(card, is_selected)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 16)
	margin.add_theme_constant_override("margin_top", 14)
	margin.add_theme_constant_override("margin_right", 16)
	margin.add_theme_constant_override("margin_bottom", 14)
	card.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 16)
	margin.add_child(row)
	row.add_child(_build_facility_asset_box(_asset_path_from_ref(work_order.get("asset_ref", {}), str(work_order.get("asset_path", ""))), Vector2(150, 122), "建"))
	var body := VBoxContainer.new()
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 6)
	row.add_child(body)

	var badge_row := HBoxContainer.new()
	badge_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	badge_row.add_theme_constant_override("separation", 8)
	body.add_child(badge_row)
	badge_row.add_child(_build_work_order_domain_badge(_domain_label_for_work_order(work_order), str(work_order.get("domain", ""))))
	if is_selected:
		badge_row.add_child(_build_work_order_selected_badge())

	var title := _make_label(_work_order_display_title(work_order), 30, true)
	title.add_theme_color_override("font_color", Color(0.98, 0.92, 0.78, 1.0))
	body.add_child(title)
	var location_text := str(work_order.get("location_label", "")).strip_edges()
	var target_text := str(work_order.get("target_name", "")).strip_edges()
	if target_text != "" and target_text != title.text and location_text != "":
		location_text = "%s · %s" % [location_text, target_text]
	elif target_text != "" and target_text != title.text:
		location_text = target_text
	var location := _make_label(location_text, 19, true)
	location.add_theme_color_override("font_color", Color(0.80, 0.75, 0.66, 1.0))
	body.add_child(location)
	var visible_state_label := _work_order_visible_state_label(work_order)
	var remaining_label := _work_order_remaining_display_label(work_order)
	var state_text := "%s · %s" % [visible_state_label, remaining_label] if remaining_label != "" else visible_state_label
	var state := _make_label(state_text, 24, true)
	state.add_theme_color_override("font_color", Color(0.98, 0.74, 0.34, 1.0))
	body.add_child(state)
	body.add_child(_build_consumer_progress_bar(int(work_order.get("progress_percent", 0))))
	var action := Button.new()
	action.text = _primary_action_label(work_order, "primary_action_label", "查看")
	action.tooltip_text = action.text
	action.focus_mode = Control.FOCUS_ALL
	action.set_meta("interior_work_order_action_button_token", INTERIOR_WORK_ORDER_ACTION_BUTTON_TOKEN)
	action.set_meta("interior_work_order_action_live_text_contract", INTERIOR_WORK_ORDER_ACTION_LIVE_TEXT_CONTRACT)
	action.disabled = not _primary_action_enabled(work_order, "primary_action_enabled", true)
	action.size_flags_horizontal = Control.SIZE_SHRINK_END
	action.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	UI_COMPONENT_FACTORY.apply_interior_home_entry_button_style(action)
	action.custom_minimum_size = Vector2(108, 72)
	action.add_theme_font_size_override("font_size", 22)
	var action_id := _primary_action_id(work_order, "primary_action_id", "open_work_order")
	action.name = "InteriorWorkOrderActionButton_%s" % queue_item_id
	action.set_meta("interior_work_order_action_id", action_id)
	action.set_meta("interior_work_order_action_queue_item_id", queue_item_id)
	action.set_meta("interior_work_order_action_live_text_label", action.text.strip_edges())
	action.pressed.connect(func() -> void:
		if queue_item_id != "":
			_set_selected_work_order(work_order, action_id, queue_item_id)
			work_order_action_requested.emit(action_id, queue_item_id)
	)
	row.add_child(action)
	return card


func _build_work_order_selected_badge() -> Control:
	var badge := PanelContainer.new()
	badge.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	badge.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	badge.custom_minimum_size = Vector2(74, 32)
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.22, 0.14, 0.06, 0.95)
	style.border_color = Color(1.0, 0.72, 0.26, 0.92)
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 4
	style.corner_radius_top_right = 4
	style.corner_radius_bottom_right = 4
	style.corner_radius_bottom_left = 4
	style.content_margin_left = 10
	style.content_margin_top = 4
	style.content_margin_right = 10
	style.content_margin_bottom = 4
	badge.add_theme_stylebox_override("panel", style)
	var label := _make_label("已选", 16, true)
	label.custom_minimum_size = Vector2(44, 24)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_color_override("font_color", Color(1.0, 0.88, 0.55, 1.0))
	badge.add_child(label)
	return badge


func _apply_work_order_card_selection_style(card: PanelContainer, is_selected: bool) -> void:
	UI_COMPONENT_FACTORY.apply_interior_affairs_work_order_card_style(card, is_selected)


func _domain_label_for_work_order(work_order: Dictionary) -> String:
	var domain := str(work_order.get("domain", "")).strip_edges()
	if domain == "world_outer":
		return "城外"
	return "城内"


func _work_order_display_title(work_order: Dictionary) -> String:
	var target_name := str(work_order.get("target_name", "")).strip_edges()
	if target_name != "":
		return target_name
	return str(work_order.get("title", "")).strip_edges()


func _work_order_visible_state_label(work_order: Dictionary) -> String:
	var display_state_label := str(work_order.get("display_state_label", "")).strip_edges()
	if display_state_label != "":
		return display_state_label
	var state_group_label := str(work_order.get("state_group_label", "")).strip_edges()
	if state_group_label != "":
		return state_group_label
	var state_group := str(work_order.get("state_group", "")).strip_edges().to_lower()
	if state_group == "running":
		return "进行中"
	if state_group in ["complete", "completed", "done", "finished"]:
		return "已完成"
	var state := str(work_order.get("state", "")).strip_edges().to_lower()
	if state == "running":
		return "进行中"
	if state in ["complete", "completed", "done", "finished"]:
		return "已完成"
	var state_label := str(work_order.get("state_label", "")).strip_edges()
	if state_label in ["升级中", "施工中", "修筑中", "整备中"]:
		return "进行中"
	return state_label if state_label != "" else "进行中"


func _work_order_is_complete(work_order: Dictionary) -> bool:
	var state := str(work_order.get("state", "")).strip_edges().to_lower()
	if state in ["complete", "completed", "done", "finished"]:
		return true
	var state_group := str(work_order.get("state_group", "")).strip_edges().to_lower()
	return state_group in ["complete", "completed", "done", "finished"]


func _work_order_is_running(work_order: Dictionary) -> bool:
	var state_group_label := str(work_order.get("state_group_label", "")).strip_edges()
	if state_group_label == "进行中":
		return true
	var state_group := str(work_order.get("state_group", "")).strip_edges().to_lower()
	if state_group == "running":
		return true
	if _work_order_is_complete(work_order):
		return false
	var state := str(work_order.get("state", "")).strip_edges().to_lower()
	return state == "running"


func _work_order_remaining_display_label(work_order: Dictionary) -> String:
	var remaining_label := str(work_order.get("remaining_label", "")).strip_edges()
	var action_label := _primary_action_label(work_order, "primary_action_label", "").strip_edges()
	if action_label != "" and remaining_label == action_label:
		remaining_label = ""
	return remaining_label


func _build_work_order_domain_badge(text: String, domain: String) -> Control:
	var badge := PanelContainer.new()
	badge.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	badge.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	badge.custom_minimum_size = Vector2(66, 32)
	var style := StyleBoxFlat.new()
	if domain == "world_outer":
		style.bg_color = Color(0.17, 0.12, 0.06, 0.92)
		style.border_color = Color(0.92, 0.56, 0.20, 0.82)
	else:
		style.bg_color = Color(0.14, 0.10, 0.06, 0.92)
		style.border_color = Color(0.92, 0.70, 0.28, 0.82)
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 4
	style.corner_radius_top_right = 4
	style.corner_radius_bottom_right = 4
	style.corner_radius_bottom_left = 4
	style.content_margin_left = 10
	style.content_margin_top = 4
	style.content_margin_right = 10
	style.content_margin_bottom = 4
	badge.add_theme_stylebox_override("panel", style)
	var label := _make_label(text, 18, false)
	label.custom_minimum_size = Vector2(44, 24)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_color_override("font_color", Color(0.98, 0.86, 0.56, 1.0))
	badge.add_child(label)
	return badge


func _build_consumer_progress_bar(progress_percent: int) -> Control:
	var bar := Control.new()
	bar.custom_minimum_size = Vector2(0, 12)
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var track := ColorRect.new()
	track.color = Color(0.24, 0.15, 0.06, 0.76)
	track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_set_full_rect(track)
	bar.add_child(track)
	var fill := ColorRect.new()
	fill.color = Color(1.0, 0.66, 0.22, 0.98)
	fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_set_anchor_rect(fill, 0.0, 0.0, clamp(float(progress_percent) / 100.0, 0.04, 1.0), 1.0)
	bar.add_child(fill)
	return bar


func _asset_path_from_ref(asset_ref_value: Variant, legacy_asset_path: String = "") -> String:
	if asset_ref_value is Dictionary:
		var asset_ref: Dictionary = asset_ref_value as Dictionary
		var fallback_path := str(asset_ref.get("fallback_path", "")).strip_edges()
		if fallback_path != "":
			return fallback_path
		var res_path := str(asset_ref.get("res_path", "")).strip_edges()
		if res_path != "":
			return res_path
	return legacy_asset_path.strip_edges()


func _primary_action_payload(payload: Dictionary) -> Dictionary:
	var action_variant: Variant = payload.get("primary_action", {})
	return action_variant as Dictionary if action_variant is Dictionary else {}


func _primary_action_label(payload: Dictionary, legacy_key: String, fallback_label: String) -> String:
	var action := _primary_action_payload(payload)
	var label := str(action.get("label", "")).strip_edges()
	if label != "":
		return label
	label = str(payload.get(legacy_key, "")).strip_edges()
	return label if label != "" else fallback_label


func _primary_action_enabled(payload: Dictionary, legacy_key: String, fallback_enabled: bool) -> bool:
	var action := _primary_action_payload(payload)
	if action.has("enabled"):
		return bool(action.get("enabled", fallback_enabled))
	if payload.has(legacy_key):
		return bool(payload.get(legacy_key, fallback_enabled))
	return fallback_enabled


func _primary_action_id(payload: Dictionary, legacy_key: String, fallback_action_id: String) -> String:
	var action := _primary_action_payload(payload)
	var action_id := str(action.get("action_id", "")).strip_edges()
	if action_id != "":
		return action_id
	action_id = str(payload.get(legacy_key, "")).strip_edges()
	return action_id if action_id != "" else fallback_action_id


func trigger_first_work_order_action_for_visual_smoke() -> Dictionary:
	var all_orders := _construction_queue_items("city_inner") + _construction_queue_items("world_outer")
	if all_orders.is_empty() or not (all_orders[0] is Dictionary):
		return {"ok": false, "reason": "work_order_missing"}
	var work_order := all_orders[0] as Dictionary
	var action_id := _primary_action_id(work_order, "primary_action_id", "open_work_order")
	var queue_item_id := str(work_order.get("queue_item_id", work_order.get("id", ""))).strip_edges()
	if queue_item_id == "":
		return {"ok": false, "reason": "queue_item_id_missing"}
	return _trigger_work_order_action_button_for_visual_smoke(action_id, queue_item_id)


func trigger_first_focus_work_order_action_for_visual_smoke() -> Dictionary:
	var all_orders := _construction_queue_items("city_inner") + _construction_queue_items("world_outer")
	for raw_order in all_orders:
		if not (raw_order is Dictionary):
			continue
		var work_order := raw_order as Dictionary
		var action_id := _primary_action_id(work_order, "primary_action_id", "open_work_order")
		if action_id != "focus_world_target":
			continue
		var queue_item_id := str(work_order.get("queue_item_id", work_order.get("id", ""))).strip_edges()
		if queue_item_id == "":
			return {"ok": false, "reason": "queue_item_id_missing"}
		return _trigger_work_order_action_button_for_visual_smoke(action_id, queue_item_id)
	return {"ok": false, "reason": "focus_work_order_missing"}


func _trigger_work_order_action_button_for_visual_smoke(action_id: String, queue_item_id: String) -> Dictionary:
	var button := _find_work_order_action_button(action_id, queue_item_id)
	if button == null:
		return {
			"ok": false,
			"reason": "work_order_action_button_missing",
			"actionId": action_id,
			"queueItemId": queue_item_id,
		}
	if button.disabled:
		return {
			"ok": false,
			"reason": "work_order_action_button_disabled",
			"actionId": action_id,
			"queueItemId": queue_item_id,
		}
	var clicked_label := str(button.get_meta("interior_work_order_action_live_text_label", button.text)).strip_edges()
	var clicked_token := str(button.get_meta("interior_work_order_action_button_token", "")).strip_edges()
	var clicked_contract := str(button.get_meta("interior_work_order_action_live_text_contract", "")).strip_edges()
	button.emit_signal("pressed")
	return {
		"ok": true,
		"actionId": action_id,
		"queueItemId": queue_item_id,
		"clickedLabel": clicked_label,
		"clickedToken": clicked_token,
		"clickedLiveTextContract": clicked_contract,
		"clickedButtonName": str(button.name),
	}


func _find_work_order_action_button(action_id: String, queue_item_id: String) -> Button:
	for node in find_children("InteriorWorkOrderActionButton_*", "Button", true, false):
		if not (node is Button):
			continue
		var button := node as Button
		if not button.visible or not button.is_visible_in_tree():
			continue
		if str(button.get_meta("interior_work_order_action_id", "")).strip_edges() != action_id:
			continue
		if str(button.get_meta("interior_work_order_action_queue_item_id", "")).strip_edges() != queue_item_id:
			continue
		return button
	return null


func _build_facility_asset_box(asset_path: String, min_size: Vector2, fallback_text: String) -> Control:
	var frame := PanelContainer.new()
	frame.custom_minimum_size = min_size
	frame.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	frame.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	frame.clip_contents = true
	UI_COMPONENT_FACTORY.apply_interior_market_overview_symbol_badge_style(frame)
	frame.custom_minimum_size = min_size
	var center := CenterContainer.new()
	center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	center.size_flags_vertical = Control.SIZE_EXPAND_FILL
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	frame.add_child(center)
	var texture := _load_texture_from_res_path(asset_path)
	if texture != null:
		var image := TextureRect.new()
		image.texture = texture
		image.custom_minimum_size = Vector2(maxf(32.0, min_size.x - 26.0), maxf(32.0, min_size.y - 20.0))
		image.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		image.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		image.mouse_filter = Control.MOUSE_FILTER_IGNORE
		center.add_child(image)
	else:
		var label := _make_label(fallback_text, 30, false)
		label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.add_theme_color_override("font_color", Color(1.0, 0.84, 0.34, 1.0))
		center.add_child(label)
	return frame


func _build_trade_exchange_center_panel() -> Control:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(330, 0)
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_interior_market_overview_card_style(panel, true)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 18)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 18)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 16)
	margin.add_child(column)
	var title := _make_label("兑换预览", UI_COMPONENT_FACTORY.interior_market_overview_primary_font_size(), true)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_color_override("font_color", Color(0.98, 0.91, 0.76, 1.0))
	column.add_child(title)
	var ratio := _make_label("%d%%" % _trade_exchange_ratio_percent(), 42, false)
	ratio.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ratio.add_theme_color_override("font_color", Color(1.0, 0.70, 0.25, 1.0))
	column.add_child(ratio)
	var hint := _make_label("选择左侧资源，再选右侧目标资源", 17, true)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.add_theme_color_override("font_color", Color(0.86, 0.80, 0.68, 1.0))
	column.add_child(hint)
	var arrow := _make_label("持有  →  可换", 24, false)
	arrow.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	arrow.add_theme_color_override("font_color", Color(0.98, 0.86, 0.52, 1.0))
	column.add_child(arrow)
	return panel


func _make_market_overview_header_chip(label_text: String, value_text: String) -> Control:
	var chip := PanelContainer.new()
	UI_COMPONENT_FACTORY.apply_interior_home_resource_rail_style(chip)
	chip.custom_minimum_size = Vector2(148, 56)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_top", 7)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_bottom", 7)
	chip.add_child(margin)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 8)
	margin.add_child(row)
	var label := _make_label(label_text, 16, false)
	label.add_theme_color_override("font_color", Color(0.96, 0.80, 0.42, 1.0))
	row.add_child(label)
	var value := _make_label(value_text, 20, false)
	value.add_theme_color_override("font_color", Color(1.0, 0.94, 0.76, 1.0))
	row.add_child(value)
	return chip


func _build_market_overview_card(card_payload: Dictionary) -> Control:
	var panel := PanelContainer.new()
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	UI_COMPONENT_FACTORY.apply_interior_market_overview_card_style(panel, bool(card_payload.get("emphasized", false)))
	panel.custom_minimum_size = Vector2(UI_COMPONENT_FACTORY.interior_market_overview_card_min_width(), 118)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 12)
	panel.add_child(margin)

	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	row.add_theme_constant_override("separation", 12)
	margin.add_child(row)

	var symbol_panel := PanelContainer.new()
	symbol_panel.custom_minimum_size = Vector2(58, 58)
	symbol_panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	symbol_panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	UI_COMPONENT_FACTORY.apply_interior_market_overview_symbol_badge_style(symbol_panel)
	symbol_panel.custom_minimum_size = Vector2(58, 58)
	row.add_child(symbol_panel)
	var symbol_margin := MarginContainer.new()
	symbol_margin.add_theme_constant_override("margin_left", 6)
	symbol_margin.add_theme_constant_override("margin_top", 5)
	symbol_margin.add_theme_constant_override("margin_right", 6)
	symbol_margin.add_theme_constant_override("margin_bottom", 5)
	symbol_panel.add_child(symbol_margin)
	var symbol := _make_label(str(card_payload.get("symbol", "")), 26, false)
	symbol.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	symbol.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	symbol.add_theme_color_override("font_color", Color(1.0, 0.84, 0.34, 1.0))
	symbol_margin.add_child(symbol)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	column.add_theme_constant_override("separation", 4)
	row.add_child(column)

	var top_row := HBoxContainer.new()
	top_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top_row.add_theme_constant_override("separation", 10)
	column.add_child(top_row)

	var title := _make_label(str(card_payload.get("title", "")), 24, true)
	title.add_theme_color_override("font_color", Color(0.98, 0.91, 0.76, 1.0))
	top_row.add_child(title)
	var value := _make_label(str(card_payload.get("value", "")), UI_COMPONENT_FACTORY.interior_market_overview_value_font_size(), false)
	value.size_flags_horizontal = Control.SIZE_SHRINK_END
	value.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	value.add_theme_color_override("font_color", Color(0.98, 0.70, 0.28, 1.0))
	top_row.add_child(value)

	var meta := _make_label(str(card_payload.get("meta", "")), 16, true)
	meta.add_theme_color_override("font_color", Color(0.80, 0.88, 0.76, 1.0))
	column.add_child(meta)
	return panel


func _market_overview_card_defs() -> Array:
	return [
		{"symbol": "粮", "title": "粮仓余量", "value": str(_snapshot_int("food", 0)), "meta": "军需与征发基底", "kind": "resource"},
		{"symbol": "木", "title": "木材储备", "value": str(_snapshot_int("wood", 0)), "meta": "建筑与设施维护", "kind": "resource"},
		{"symbol": "石", "title": "石料储备", "value": str(_snapshot_int("stone", 0)), "meta": "城防与工事消耗", "kind": "resource"},
		{"symbol": "铁", "title": "铁料储备", "value": str(_snapshot_int("iron", 0)), "meta": "兵装与器械消耗", "kind": "resource"},
		{"symbol": "开", "title": "经营效率", "value": str(_snapshot_int("development_points", 0)), "meta": "影响市井容量", "kind": "operation", "emphasized": true},
		{"symbol": "稳", "title": "市井秩序", "value": "稳定", "meta": "日常收支状态", "kind": "operation", "emphasized": true},
	]


func _trade_resource_defs() -> Array:
	return [
		{"symbol": "粮", "label": "粮食", "value": str(_snapshot_int("food", 0))},
		{"symbol": "木", "label": "木头", "value": str(_snapshot_int("wood", 0))},
		{"symbol": "石", "label": "石料", "value": str(_snapshot_int("stone", 0))},
		{"symbol": "铁", "label": "铁料", "value": str(_snapshot_int("iron", 0))},
	]


func _trade_exchange_ratio_percent() -> int:
	return 50


func _tax_treasury_card_defs() -> Array:
	return [
		{"symbol": "征", "title": "征收", "value": "可执行", "meta": "军令 %d" % _snapshot_int("order", 0), "kind": "tax", "emphasized": true},
		{"symbol": "入", "title": "收入", "value": str(_snapshot_int("development_points", 0)), "meta": "市井经营基数", "kind": "tax"},
		{"symbol": "耗", "title": "消耗", "value": "建设", "meta": "粮木石铁支出", "kind": "tax"},
		{"symbol": "库", "title": "入库", "value": "稳定", "meta": "资源回流仓储", "kind": "tax", "emphasized": true},
	]


func _affairs_operation_defs() -> Array:
	return [
		{"id": "queue", "title": "队列", "meta": "%d 项待处理" % _snapshot_affairs_queue().size()},
		{"id": "submit", "title": "提交", "meta": "确认政务安排"},
		{"id": "refresh", "title": "刷新", "meta": "更新当前状态"},
		{"id": "status", "title": "状态", "meta": "查看执行结果"},
	]


func _secondary_consumer_card_defs(tab_id: String) -> Array:
	match tab_id:
		"trade":
			return [
				{"symbol": "买", "title": "资源买入", "value": "开放", "meta": "补足短缺资源", "kind": "operation", "emphasized": true},
				{"symbol": "卖", "title": "资源售出", "value": "开放", "meta": "换取通用货币", "kind": "operation"},
				{"symbol": "兑", "title": "资源兑换", "value": "4 类", "meta": "粮木石铁互换", "kind": "operation"},
				{"symbol": "账", "title": "交易记录", "value": "待接", "meta": "保留交易流水", "kind": "operation"},
			]
		"tax":
			return [
				{"symbol": "税", "title": "主城税收", "value": "稳定", "meta": "基础财政来源", "kind": "operation", "emphasized": true},
				{"symbol": "收", "title": "市井收益", "value": "经营", "meta": "承接市井产出", "kind": "operation"},
				{"symbol": "仓", "title": "仓储调度", "value": "可用", "meta": "资源入库分配", "kind": "operation"},
				{"symbol": "回", "title": "资源回流", "value": "待接", "meta": "回收与再分配", "kind": "operation"},
			]
		"affairs":
			return [
				{"symbol": "队", "title": "建设队列", "value": str(_snapshot_affairs_queue().size()), "meta": "当前执行项", "kind": "operation", "emphasized": true},
				{"symbol": "升", "title": "升级安排", "value": "待排", "meta": "建筑升级节奏", "kind": "operation"},
				{"symbol": "委", "title": "城内委任", "value": "预留", "meta": "治理岗位分配", "kind": "operation"},
				{"symbol": "令", "title": "政务短令", "value": str(_snapshot_int("order", 0)), "meta": "可用军令", "kind": "operation"},
			]
		_:
			return []


func _build_secondary_page_view(tab_id: String, section_id: String, section_def: Dictionary) -> Control:
	var root := PanelContainer.new()
	root.name = "InteriorSecondaryPage_%s_%s" % [tab_id, section_id]
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.custom_minimum_size = Vector2(0, 492)
	UI_COMPONENT_FACTORY.apply_interior_secondary_page_panel_style(root)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 16)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 16)
	root.add_child(margin)

	var vbox := VBoxContainer.new()
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_theme_constant_override("separation", 16)
	margin.add_child(vbox)

	var title := _make_label(str(section_def.get("title", section_id)), UI_COMPONENT_FACTORY.interior_secondary_page_title_font_size(), true)
	title.add_theme_color_override("font_color", Color(0.96, 0.86, 0.62, 1.0))
	vbox.add_child(title)

	var resource_line := _make_label(
		"粮 %d    木 %d    石 %d    铁 %d    开发点 %d    军令 %d" % [
			_snapshot_int("food", 0),
			_snapshot_int("wood", 0),
			_snapshot_int("stone", 0),
			_snapshot_int("iron", 0),
			_snapshot_int("development_points", 0),
			_snapshot_int("order", 0),
		],
		UI_COMPONENT_FACTORY.interior_secondary_page_body_font_size(),
		true
	)
	resource_line.add_theme_color_override("font_color", Color(0.88, 0.84, 0.74, 1.0))
	vbox.add_child(resource_line)

	var grid := GridContainer.new()
	grid.columns = 4
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", UI_COMPONENT_FACTORY.interior_secondary_page_grid_separation())
	grid.add_theme_constant_override("v_separation", UI_COMPONENT_FACTORY.interior_secondary_page_grid_separation())
	vbox.add_child(grid)

	var item_cards := _visual_smoke_array(section_def.get("item_cards", []))
	var card_index := 0
	for raw_card in item_cards:
		var card: Dictionary = raw_card if raw_card is Dictionary else {}
		if not card.is_empty():
			var card_panel := _build_secondary_feature_card(card)
			grid.add_child(card_panel)
			UI_COMPONENT_FACTORY.apply_motion_interior_section_enter(card_panel, card_index)
			card_index += 1

	var block_row := HBoxContainer.new()
	block_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	block_row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	block_row.add_theme_constant_override("separation", UI_COMPONENT_FACTORY.interior_secondary_page_grid_separation())
	vbox.add_child(block_row)

	var content_blocks := _visual_smoke_array(section_def.get("content_blocks", []))
	var block_index := 0
	for raw_block in content_blocks:
		var block: Dictionary = raw_block if raw_block is Dictionary else {}
		if not block.is_empty():
			var block_panel := _build_secondary_text_panel(block)
			block_row.add_child(block_panel)
			UI_COMPONENT_FACTORY.apply_motion_interior_section_enter(block_panel, block_index)
			block_index += 1
	return root


func _build_secondary_feature_card(card_payload: Dictionary) -> Control:
	var panel := PanelContainer.new()
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_interior_secondary_feature_card_style(panel)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 5)
	margin.add_child(column)
	var title := _make_label(str(card_payload.get("title", "")), UI_COMPONENT_FACTORY.interior_secondary_page_card_title_font_size(), true)
	title.add_theme_color_override("font_color", Color(0.97, 0.90, 0.72, 1.0))
	column.add_child(title)
	var value := str(card_payload.get("value", "")).strip_edges()
	if value != "":
		var value_label := _make_label(value, UI_COMPONENT_FACTORY.interior_secondary_page_body_font_size(), true)
		value_label.add_theme_color_override("font_color", Color(0.94, 0.78, 0.42, 1.0))
		column.add_child(value_label)
	var meta := str(card_payload.get("meta", "")).strip_edges()
	if meta != "":
		var meta_label := _make_label(meta, 14, true)
		meta_label.add_theme_color_override("font_color", Color(0.78, 0.86, 0.76, 1.0))
		column.add_child(meta_label)
	var description := str(card_payload.get("description", "")).strip_edges()
	if description != "":
		var description_label := _make_label(description, 14, true)
		description_label.add_theme_color_override("font_color", Color(0.84, 0.80, 0.70, 1.0))
		column.add_child(description_label)
	return panel


func _build_secondary_text_panel(block_payload: Dictionary) -> Control:
	var panel := PanelContainer.new()
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_interior_secondary_feature_card_style(panel)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 7)
	margin.add_child(column)
	var title := str(block_payload.get("title", "")).strip_edges()
	if title != "":
		var title_label := _make_label(title, UI_COMPONENT_FACTORY.interior_secondary_page_card_title_font_size(), true)
		title_label.add_theme_color_override("font_color", Color(0.97, 0.90, 0.72, 1.0))
		column.add_child(title_label)
	for line in _visual_smoke_array(block_payload.get("lines", [])):
		var line_label := _make_label(str(line), UI_COMPONENT_FACTORY.interior_secondary_page_body_font_size(), true)
		line_label.add_theme_color_override("font_color", Color(0.88, 0.84, 0.76, 1.0))
		column.add_child(line_label)
	return panel


func _should_use_building_group_view(tab_id: String, section_id: String) -> bool:
	if not BUILDING_SECTION_BY_TAB.has(tab_id):
		return false
	if str(BUILDING_SECTION_BY_TAB.get(tab_id, "")) != section_id:
		return false
	var group: Dictionary = _snapshot_building_group(tab_id)
	var tree_items_variant: Variant = group.get("treeItems", [])
	return tree_items_variant is Array and not (tree_items_variant as Array).is_empty()


func _build_building_group_view(tab_id: String, section_def: Dictionary) -> Control:
	var group: Dictionary = _snapshot_building_group(tab_id)
	if group.is_empty():
		var empty_payload := section_def.duplicate(true)
		empty_payload["summary_lines"] = [
			"当前还没有可显示的建筑节点。",
			"有建筑数据后会自动显示升级入口。",
		]
		empty_payload["item_cards"] = [
			{
				"title": "等待建筑数据",
				"value": "暂无节点",
				"meta": str(section_def.get("title", "城市建筑树")),
				"description": "建筑数据出现后会显示升级入口。",
			},
		]
		var empty_blocks: Array = section_def.get("content_blocks", []) as Array
		empty_blocks.append({
			"kind": "text_block",
			"title": "暂无节点",
			"lines": [
				"城市建筑树当前还没有可显示节点。",
				"建筑数据出现后会自动显示升级入口。",
			],
			"node_name": "InteriorBuildingGroupEmptyStateBlock",
		})
		empty_payload["content_blocks"] = empty_blocks
		return CHILD_PAGE_BLOCK_FACTORY_SCRIPT.new().build_section_page(_build_child_page_payload(tab_id, str(section_def.get("id", "")), empty_payload))

	var root := VBoxContainer.new()
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.custom_minimum_size = Vector2(0, UI_COMPONENT_FACTORY.interior_building_tree_panel_min_height())
	root.add_theme_constant_override("separation", 12)

	var split := HBoxContainer.new()
	split.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	split.size_flags_vertical = Control.SIZE_EXPAND_FILL
	split.add_theme_constant_override("separation", 14)

	var building_tree = BUILDING_TREE_VIEW_SCENE.instantiate()
	var upgrade_sheet = BUILD_UPGRADE_SHEET_SCENE.instantiate()
	if building_tree is Control:
		(building_tree as Control).size_flags_horizontal = Control.SIZE_EXPAND_FILL
		(building_tree as Control).size_flags_vertical = Control.SIZE_EXPAND_FILL
		(building_tree as Control).custom_minimum_size = Vector2(UI_COMPONENT_FACTORY.interior_building_tree_panel_min_width(), UI_COMPONENT_FACTORY.interior_building_tree_panel_min_height())
	if upgrade_sheet is Control:
		(upgrade_sheet as Control).size_flags_horizontal = Control.SIZE_SHRINK_END
		(upgrade_sheet as Control).size_flags_vertical = Control.SIZE_EXPAND_FILL
		(upgrade_sheet as Control).custom_minimum_size = Vector2(UI_COMPONENT_FACTORY.interior_upgrade_sheet_min_width(), UI_COMPONENT_FACTORY.interior_upgrade_sheet_min_height())
	split.add_child(building_tree)
	split.add_child(upgrade_sheet)
	root.add_child(split)

	var tree_title := str(group.get("treeTitle", section_def.get("title", "城市建筑树")))
	var tree_items_variant: Variant = group.get("treeItems", [])
	var tree_items: Array = tree_items_variant as Array if tree_items_variant is Array else []
	if building_tree != null and building_tree.has_method("set_tree_contract"):
		building_tree.call("set_tree_contract", _build_building_tree_contract(tree_title, tree_items))
	if tree_items.is_empty():
		if upgrade_sheet != null and upgrade_sheet.has_method("set_sheet_contract"):
			upgrade_sheet.call("set_sheet_contract", _build_upgrade_sheet_contract({}, tree_title))
		return root

	var selected_building_id := str((tree_items[0] as Dictionary).get("id", "")).strip_edges()
	if building_tree != null and selected_building_id != "" and building_tree.has_method("set_tree_contract"):
		building_tree.call("set_tree_contract", _build_building_tree_contract(tree_title, tree_items, selected_building_id))
	var selected_item: Dictionary = _find_building_tree_item(tree_items, selected_building_id)
	_apply_building_item_to_sheet(upgrade_sheet, selected_item, tree_title)
	if building_tree != null and building_tree.has_signal("building_selected"):
		var building_selected_callback := func(building_id: String) -> void:
			var tree_item := _find_building_tree_item(tree_items, building_id)
			_apply_building_item_to_sheet(upgrade_sheet, tree_item, tree_title)
		if not building_tree.is_connected("building_selected", building_selected_callback):
			building_tree.connect("building_selected", building_selected_callback)
	if upgrade_sheet != null and upgrade_sheet.has_signal("primary_action_requested"):
		var primary_action_callback := func(_action_id: String) -> void:
			var building_id := ""
			if building_tree != null and building_tree.has_method("get_selected_building_id"):
				building_id = str(building_tree.call("get_selected_building_id"))
			var queue_item := _find_building_tree_item(tree_items, building_id)
			if queue_item.is_empty():
				return
			# This main-city context chain is template-only; do not dispatch building authority here.
			if upgrade_sheet.has_method("set_sheet_contract"):
				upgrade_sheet.call("set_sheet_contract", _build_upgrade_sheet_contract(queue_item, tree_title, true))
		if not upgrade_sheet.is_connected("primary_action_requested", primary_action_callback):
			upgrade_sheet.connect("primary_action_requested", primary_action_callback)
	if upgrade_sheet != null and upgrade_sheet.has_signal("secondary_action_requested"):
		var secondary_action_callback := func(_action_id: String) -> void:
			var building_id := ""
			if building_tree != null and building_tree.has_method("get_selected_building_id"):
				building_id = str(building_tree.call("get_selected_building_id"))
			var tree_item := _find_building_tree_item(tree_items, building_id)
			_apply_building_item_to_sheet(upgrade_sheet, tree_item, tree_title)
		if not upgrade_sheet.is_connected("secondary_action_requested", secondary_action_callback):
			upgrade_sheet.connect("secondary_action_requested", secondary_action_callback)
	return root


func _build_affairs_queue_view(section_def: Dictionary) -> Control:
	var queue_items := _snapshot_affairs_queue()
	var queue_view = AFFAIRS_QUEUE_VIEW_SCENE.instantiate()
	if queue_view == null:
		return CHILD_PAGE_BLOCK_FACTORY_SCRIPT.new().build_section_page(_build_child_page_payload("affairs", str(section_def.get("id", "queue")), section_def))
	if queue_view.has_method("set_queue_contract"):
		queue_view.call("set_queue_contract", _build_affairs_queue_contract(section_def, queue_items))
	if queue_view.has_signal("queue_item_pressed"):
		var queue_item_pressed_callback := func(affair_id: String) -> void:
			affair_enqueued.emit(affair_id)
		if not queue_view.is_connected("queue_item_pressed", queue_item_pressed_callback):
			queue_view.connect("queue_item_pressed", queue_item_pressed_callback)
	if queue_view.has_signal("selected_affair_changed"):
		var selected_affair_changed_callback := func(affair_id: String) -> void:
			_selected_affair_id = affair_id
		if not queue_view.is_connected("selected_affair_changed", selected_affair_changed_callback):
			queue_view.connect("selected_affair_changed", selected_affair_changed_callback)
	if queue_view.has_signal("detail_action_requested"):
		var detail_action_requested_callback := func(action_id: String, affair_id: String) -> void:
			if action_id == "enqueue_selected" and affair_id != "":
				affair_enqueued.emit(affair_id)
		if not queue_view.is_connected("detail_action_requested", detail_action_requested_callback):
			queue_view.connect("detail_action_requested", detail_action_requested_callback)
	return queue_view as Control


func _apply_building_item_to_sheet(upgrade_sheet, tree_item: Dictionary, fallback_title: String) -> void:
	if upgrade_sheet == null:
		return
	if tree_item.is_empty():
		if upgrade_sheet.has_method("set_sheet_contract"):
			upgrade_sheet.call("set_sheet_contract", _build_upgrade_sheet_contract({}, fallback_title))
		return
	if upgrade_sheet.has_method("set_sheet_contract"):
		upgrade_sheet.call("set_sheet_contract", _build_upgrade_sheet_contract(tree_item, fallback_title))

func _build_affairs_queue_contract(section_def: Dictionary, queue_items: Array) -> Dictionary:
	var queue_empty_lines := _extract_text_block_lines(section_def)
	var footer_lines: Array[String] = queue_empty_lines.duplicate()
	footer_lines.append("政务队列现在直接读取主城快照，不再只是静态占位。")
	return {
		"title": str(section_def.get("title", "建设队列")),
		"subtitle": "当前政务队列",
		"summary_title": "执行摘要",
		"queue_items": queue_items,
		"selected_affair_id": _selected_affair_id,
		"detail_actions": [
			{"id": "enqueue_selected", "label": "提交政务"},
			{"id": "refresh_selected", "label": "刷新详情"},
		],
		"empty_state": {
			"list_label": "等待政务项。",
			"title": "当前政务队列为空。",
			"body": "\n".join(queue_empty_lines) if not queue_empty_lines.is_empty() else "当前还没有可显示的政务队列说明。",
			"footer_lines": footer_lines,
		},
	}

func _build_building_tree_contract(tree_title: String, tree_items: Array, selected_building_id: String = "") -> Dictionary:
	return {
		"title": tree_title,
		"state_badge": "建筑树",
		"empty_state_text": "等待城市建筑树数据。" if tree_items.is_empty() else "请选择一个设施或建筑项后加载建筑树。",
		"detail_placeholder": {
			"name": "建筑详情",
			"meta": "等待选择",
			"body": "等待建筑详情。",
			"cost": "消耗：--",
			"effect": "效果：--",
		},
		"tree_items": tree_items,
		"selected_building_id": selected_building_id,
	}

func _build_upgrade_sheet_contract(tree_item: Dictionary, fallback_title: String, submitted: bool = false) -> Dictionary:
	if tree_item.is_empty():
		return {
			"title": fallback_title,
			"subtitle": "等待升级单数据。",
			"body": "",
			"cost_summary": "消耗：--",
			"effect_summary": "效果：--",
			"primary_action_label": "确认",
			"secondary_action_label": "返回",
			"close_button_label": "关闭",
			"empty_state_text": "等待升级单数据。",
			"has_payload": false,
			"primary_action_priority": "primary_hot_enabled_payload_only",
			"submitted_state_visible": false,
			"template_feedback_visible": false,
			"primary_action_enabled": false,
			"secondary_action_enabled": false,
			"state_label": "",
		}
	var subtitle := str(tree_item.get("sheetSubtitle", tree_item.get("description", "")))
	var body := str(tree_item.get("sheetBody", tree_item.get("description", "等待说明加载。")))
	if submitted:
		subtitle = "%s · 已加入模板排队" % str(tree_item.get("label", fallback_title))
		body = "%s\n\n已加入待办安排，暂不消耗资源。" % body
	return {
		"title": str(tree_item.get("label", fallback_title)),
		"subtitle": subtitle,
		"body": body,
		"cost_summary": "消耗：" + str(tree_item.get("costSummary", "--")),
		"effect_summary": "效果：" + str(tree_item.get("effectSummary", "--")),
		"primary_action_label": str(tree_item.get("primaryActionLabel", "确认")),
		"secondary_action_label": str(tree_item.get("secondaryActionLabel", "返回")),
		"close_button_label": "关闭",
		"empty_state_text": "等待升级单数据。",
		"has_payload": true,
		"primary_action_priority": "primary_hot_enabled_payload_only",
		"submitted_state_visible": submitted,
		"template_feedback_visible": true,
		"primary_action_enabled": not submitted,
		"secondary_action_enabled": true,
		"state_label": "",
	}


func _find_building_tree_item(tree_items: Array, building_id: String) -> Dictionary:
	for raw_item in tree_items:
		var tree_item: Dictionary = raw_item if raw_item is Dictionary else {}
		if str(tree_item.get("id", "")).strip_edges() == building_id:
			return tree_item
	return {}


func _snapshot_building_group(tab_id: String) -> Dictionary:
	var building_groups: Dictionary = _interior_snapshot.get("building_groups", {}) as Dictionary
	if not building_groups.has(tab_id):
		return {}
	return building_groups.get(tab_id, {}) as Dictionary


func _snapshot_building_count(tab_id: String, building_groups: Dictionary) -> int:
	if not building_groups.has(tab_id):
		return 0
	var group: Dictionary = building_groups.get(tab_id, {}) as Dictionary
	var tree_items_variant: Variant = group.get("treeItems", [])
	if not (tree_items_variant is Array):
		return 0
	return (tree_items_variant as Array).size()


func _snapshot_affairs_queue() -> Array:
	var queue_variant: Variant = _interior_snapshot.get("affairs_queue", [])
	return queue_variant as Array if queue_variant is Array else []


func _snapshot_tax_runtime() -> Dictionary:
	var runtime_variant: Variant = _interior_snapshot.get("tax_runtime", {})
	if runtime_variant is Dictionary and not (runtime_variant as Dictionary).is_empty():
		return runtime_variant as Dictionary
	return _fallback_tax_runtime()


func _snapshot_construction_queues() -> Dictionary:
	var queues_variant: Variant = _interior_snapshot.get("construction_queues", {})
	if queues_variant is Dictionary and not (queues_variant as Dictionary).is_empty():
		return queues_variant as Dictionary
	return _fallback_construction_queues()


func _refresh_main_city_interior_read_model_if_needed() -> void:
	if _main_city_interior_read_model_inflight:
		return
	_main_city_interior_read_model_inflight = true
	call_deferred("_fetch_main_city_interior_read_model")


func _fetch_main_city_interior_read_model() -> void:
	if get_tree() != null:
		await get_tree().process_frame
	var api_client = _ensure_backend_api_client()
	if api_client == null:
		_main_city_interior_read_model_inflight = false
		return
	var faction_id := _snapshot_string("target_faction_id", "")
	if faction_id == "":
		var pending_read_model := _snapshot_dictionary("main_city_interior_read_model")
		faction_id = str(pending_read_model.get("player_id", "")).strip_edges()
	var city_state_id := _snapshot_string("city_state_id", "")
	var city_label := _snapshot_string("city_name", DEFAULT_CITY_NAME)
	var response: Dictionary = {}
	if api_client.has_method("get_main_city_interior_read_model"):
		response = await api_client.get_main_city_interior_read_model(faction_id, city_state_id, city_label)
	else:
		var query_parts: Array = []
		if faction_id != "":
			query_parts.append("playerId=%s" % faction_id.uri_encode())
		if city_state_id != "":
			query_parts.append("cityStateId=%s" % city_state_id.uri_encode())
		if city_label != "":
			query_parts.append("cityLabel=%s" % city_label.uri_encode())
		var query := "?%s" % "&".join(query_parts) if not query_parts.is_empty() else ""
		response = await api_client.request_json("GET", "%s%s" % [MAIN_CITY_INTERIOR_READ_MODEL_PATH, query])
	_main_city_interior_read_model_inflight = false
	if not bool(response.get("ok", false)):
		_interior_snapshot["main_city_interior_data_source"] = "backend_read_model_failed"
		_request_panel_refresh()
		return
	var data_variant: Variant = response.get("data", {})
	if not (data_variant is Dictionary):
		return
	var data := data_variant as Dictionary
	var read_model_variant: Variant = data.get("mainCityInterior", data)
	if not (read_model_variant is Dictionary):
		return
	var read_model := read_model_variant as Dictionary
	if read_model.is_empty():
		return
	_main_city_interior_read_model_cache = read_model.duplicate(true)
	_apply_main_city_interior_read_model(read_model, true)


func _apply_main_city_interior_read_model(read_model: Dictionary, refresh_panel: bool) -> void:
	_interior_snapshot["main_city_interior_read_model"] = read_model.duplicate(true)
	_interior_snapshot["main_city_interior_schema_version"] = str(read_model.get("schema_version", "")).strip_edges()
	_interior_snapshot["main_city_interior_asset_ref_mode"] = str(read_model.get("asset_ref_mode", "")).strip_edges()
	_interior_snapshot["main_city_interior_asset_catalog_version"] = str(read_model.get("asset_catalog_version", "")).strip_edges()
	_interior_snapshot["main_city_interior_data_source"] = "backend_read_model"
	_interior_snapshot["main_city_interior_endpoint"] = MAIN_CITY_INTERIOR_READ_MODEL_PATH
	var tax_runtime := _snapshot_dictionary_from(read_model.get("tax_runtime", {}))
	if not tax_runtime.is_empty():
		_interior_snapshot["tax_runtime"] = tax_runtime
	var construction_queues := _snapshot_dictionary_from(read_model.get("construction_queues", {}))
	if not construction_queues.is_empty():
		construction_queues = _expand_construction_queues_for_visual_smoke(construction_queues)
		_interior_snapshot["construction_queues"] = construction_queues
	if refresh_panel:
		_request_panel_refresh()


func _ensure_backend_api_client():
	if _backend_api_client != null and is_instance_valid(_backend_api_client):
		return _backend_api_client
	var client := BACKEND_API_CLIENT_SCRIPT.new()
	if client == null:
		return null
	add_child(client)
	_backend_api_client = client
	if _backend_api_client.has_method("configure"):
		_backend_api_client.call("configure", AppConfig.backend_base_url)
	return _backend_api_client


func _tax_schedule_slots() -> Array:
	var runtime := _snapshot_tax_runtime()
	var slots_variant: Variant = runtime.get("schedule_slots", [])
	return slots_variant as Array if slots_variant is Array else []


func _active_tax_slot() -> Dictionary:
	var first_slot: Dictionary = {}
	var first_upcoming_slot: Dictionary = {}
	for raw_slot in _tax_schedule_slots():
		if not (raw_slot is Dictionary):
			continue
		var slot := raw_slot as Dictionary
		if first_slot.is_empty():
			first_slot = slot
		if bool(slot.get("collectable_now", false)):
			return slot
		if first_upcoming_slot.is_empty() and str(slot.get("state", "")).strip_edges() == "upcoming":
			first_upcoming_slot = slot
	return first_upcoming_slot if not first_upcoming_slot.is_empty() else first_slot


func _construction_queue_items(domain: String) -> Array:
	var queues := _snapshot_construction_queues()
	var items_variant: Variant = queues.get(domain, [])
	return items_variant as Array if items_variant is Array else []


func _ensure_selected_work_order_from_orders(all_orders: Array) -> void:
	if _selected_work_order_queue_item_id == "":
		var first_order := _selected_work_order_from_orders(all_orders)
		if not first_order.is_empty():
			_selected_work_order_queue_item_id = str(first_order.get("queue_item_id", first_order.get("id", ""))).strip_edges()
			_selected_work_order_action_id = _primary_action_id(first_order, "primary_action_id", "open_work_order")
		return
	for raw_order in all_orders:
		if not (raw_order is Dictionary):
			continue
		var work_order := raw_order as Dictionary
		var queue_item_id := str(work_order.get("queue_item_id", work_order.get("id", ""))).strip_edges()
		if queue_item_id == _selected_work_order_queue_item_id:
			return
	var fallback := _selected_work_order_from_orders(all_orders)
	if not fallback.is_empty():
		_selected_work_order_queue_item_id = str(fallback.get("queue_item_id", fallback.get("id", ""))).strip_edges()
		_selected_work_order_action_id = _primary_action_id(fallback, "primary_action_id", "open_work_order")


func _selected_work_order_from_orders(all_orders: Array) -> Dictionary:
	for raw_order in all_orders:
		if not (raw_order is Dictionary):
			continue
		var work_order := raw_order as Dictionary
		var queue_item_id := str(work_order.get("queue_item_id", work_order.get("id", ""))).strip_edges()
		if _selected_work_order_queue_item_id != "" and queue_item_id == _selected_work_order_queue_item_id:
			return work_order
	if not all_orders.is_empty() and all_orders[0] is Dictionary:
		return all_orders[0] as Dictionary
	return {}


func _set_selected_work_order(work_order: Dictionary, action_id: String, queue_item_id: String) -> void:
	_selected_work_order_queue_item_id = queue_item_id
	_selected_work_order_action_id = action_id
	var asset_path := _asset_path_from_ref(work_order.get("asset_ref", {}), str(work_order.get("asset_path", "")))
	_selected_work_order_uses_asset_ref = asset_path != ""
	_selected_work_order_detail_visible = true
	if _current_top_tab_id == "affairs" and _get_current_section_id("affairs") == "queue":
		_request_panel_refresh()


func _mainline_visual_smoke_work_order_stress_count() -> int:
	if OS.get_environment("SLG_MAINLINE_VISUAL_SMOKE") != "1":
		return 0
	var raw_count := OS.get_environment("SLG_MAIN_CITY_INTERIOR_WORK_ORDER_STRESS_COUNT").strip_edges()
	if raw_count == "" or not raw_count.is_valid_int():
		return 0
	return maxi(0, raw_count.to_int())


func _expand_construction_queues_for_visual_smoke(queues: Dictionary) -> Dictionary:
	var target_count := _mainline_visual_smoke_work_order_stress_count()
	_interior_snapshot["main_city_interior_work_order_stress_target"] = target_count
	if target_count <= 0:
		return queues
	var result := queues.duplicate(true)
	var city_items: Array = []
	var world_items: Array = []
	var city_variant: Variant = result.get("city_inner", [])
	if city_variant is Array:
		city_items = (city_variant as Array).duplicate(true)
	var world_variant: Variant = result.get("world_outer", [])
	if world_variant is Array:
		world_items = (world_variant as Array).duplicate(true)

	var base_orders: Array = []
	for raw_city_order in city_items:
		if raw_city_order is Dictionary:
			base_orders.append((raw_city_order as Dictionary).duplicate(true))
	for raw_world_order in world_items:
		if raw_world_order is Dictionary:
			base_orders.append((raw_world_order as Dictionary).duplicate(true))
	if base_orders.is_empty():
		return result

	var cursor := 0
	while city_items.size() + world_items.size() < target_count:
		var base_order: Dictionary = (base_orders[cursor % base_orders.size()] as Dictionary).duplicate(true)
		var next_index := city_items.size() + world_items.size() + 1
		var base_id := str(base_order.get("queue_item_id", base_order.get("id", "work_order"))).strip_edges()
		if base_id == "":
			base_id = "work_order"
		var stress_id := "%s_stress_%02d" % [base_id, next_index]
		base_order["queue_item_id"] = stress_id
		base_order["id"] = stress_id
		base_order["stress_fixture"] = true
		var target_name := str(base_order.get("target_name", "")).strip_edges()
		if target_name != "":
			base_order["target_name"] = "%s %02d" % [target_name, next_index]
		var domain := str(base_order.get("domain", "")).strip_edges()
		if domain == "world_outer":
			world_items.append(base_order)
		else:
			base_order["domain"] = "city_inner"
			city_items.append(base_order)
		cursor += 1

	result["city_inner"] = city_items
	result["world_outer"] = world_items
	return result


func _fallback_tax_runtime() -> Dictionary:
	return {
		"mode": "tax_schedule_runtime_v1",
		"title": "今日税课",
		"state_label": "等待同步",
		"remaining_label": "等待同步",
		"next_collect_label": "等待同步",
		"primary_action": {"action_id": "sync_tax_runtime", "label": "等待", "enabled": false},
		"hero_asset_ref": {},
		"schedule_slots": [],
	}


func _fallback_construction_queues() -> Dictionary:
	return {
		"mode": "construction_work_orders_v1",
		"city_inner": [],
		"world_outer": [],
	}


func _make_label(text: String, font_size: int, wrap: bool = false) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if wrap else TextServer.AUTOWRAP_OFF
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return label


func _set_full_rect(control: Control) -> void:
	_set_anchor_rect(control, 0.0, 0.0, 1.0, 1.0)


func _set_anchor_rect(control: Control, left: float, top: float, right: float, bottom: float) -> void:
	control.anchor_left = left
	control.anchor_top = top
	control.anchor_right = right
	control.anchor_bottom = bottom
	control.offset_left = 0.0
	control.offset_top = 0.0
	control.offset_right = 0.0
	control.offset_bottom = 0.0


func _load_texture_from_res_path(path: String) -> Texture2D:
	var normalized_path := path.strip_edges()
	if normalized_path == "":
		return null
	var loaded_resource := load(normalized_path)
	if loaded_resource is Texture2D:
		return loaded_resource as Texture2D
	var image_path := ProjectSettings.globalize_path(normalized_path)
	if not FileAccess.file_exists(image_path):
		return null
	var image := Image.new()
	if image.load(image_path) != OK:
		return null
	return ImageTexture.create_from_image(image)


func _home_lobby_background_available() -> bool:
	return _load_texture_from_res_path(INTERIOR_HOME_LOBBY_BACKGROUND_PATH) != null


func _secondary_background_path(tab_id: String) -> String:
	return str(INTERIOR_SECONDARY_BACKGROUND_PATHS.get(tab_id, "")).strip_edges()


func _secondary_background_available(tab_id: String) -> bool:
	var background_path := _secondary_background_path(tab_id)
	return background_path != "" and _load_texture_from_res_path(background_path) != null


func _home_entry_badge_count() -> int:
	var count := 0
	for raw_entry in HOME_ENTRY_DEFS:
		var entry: Dictionary = raw_entry if raw_entry is Dictionary else {}
		var entry_id := str(entry.get("id", "")).strip_edges()
		if INTERIOR_HOME_ENTRY_BADGE_PATHS.has(entry_id):
			count += 1
	return count


func _home_entry_badges_available() -> bool:
	for raw_entry in HOME_ENTRY_DEFS:
		var entry: Dictionary = raw_entry if raw_entry is Dictionary else {}
		var entry_id := str(entry.get("id", "")).strip_edges()
		var badge_path := str(INTERIOR_HOME_ENTRY_BADGE_PATHS.get(entry_id, "")).strip_edges()
		if badge_path == "" or _load_texture_from_res_path(badge_path) == null:
			return false
	return true


func _merge_snapshot(snapshot: Dictionary) -> Dictionary:
	var merged := _interior_snapshot.duplicate(true)
	for key in snapshot.keys():
		merged[key] = snapshot[key]
	return merged


func _snapshot_string(key: String, fallback: String) -> String:
	if not _interior_snapshot.has(key):
		return fallback
	var value := str(_interior_snapshot.get(key, fallback)).strip_edges()
	return value if value != "" else fallback


func _snapshot_int(key: String, fallback: int) -> int:
	if not _interior_snapshot.has(key):
		return fallback
	var raw_value = _interior_snapshot.get(key, fallback)
	if raw_value is int:
		return raw_value
	return int(str(raw_value))


func _snapshot_dictionary(key: String) -> Dictionary:
	return _snapshot_dictionary_from(_interior_snapshot.get(key, {}))


func _snapshot_dictionary_from(value: Variant) -> Dictionary:
	return (value as Dictionary).duplicate(true) if value is Dictionary else {}


func _snapshot_tech_level(tech_levels: Dictionary, key: String) -> int:
	if not tech_levels.has(key):
		return 0
	var raw_value = tech_levels.get(key, 0)
	if raw_value is int:
		return raw_value
	return int(str(raw_value))


func _get_tab_def(tab_id: String) -> Dictionary:
	if not PANEL_DEFS.has(tab_id):
		return {}
	return PANEL_DEFS.get(tab_id, {}) as Dictionary


func _get_section_def(tab_id: String, section_id: String) -> Dictionary:
	var tab_def: Dictionary = _get_tab_def(tab_id)
	for raw_section in tab_def.get("sections", []) as Array:
		var section: Dictionary = raw_section if raw_section is Dictionary else {}
		if str(section.get("id", "")).strip_edges() == section_id:
			return section
	return {}


func _resolve_section_payload(tab_id: String, section_id: String) -> Dictionary:
	var section_def: Dictionary = _get_section_def(tab_id, section_id)
	if section_def.is_empty():
		return {}
	var resolved_section: Dictionary = section_def.duplicate(true)
	var section_payloads: Dictionary = _interior_snapshot.get("section_payloads", {}) as Dictionary
	var tab_payloads: Dictionary = section_payloads.get(tab_id, {}) as Dictionary
	var override_payload: Dictionary = tab_payloads.get(section_id, {}) as Dictionary
	for key_variant in override_payload.keys():
		var key := str(key_variant).strip_edges()
		if key == "":
			continue
		resolved_section[key] = override_payload.get(key_variant)
	return resolved_section


func _get_default_section_id(tab_id: String) -> String:
	var tab_def: Dictionary = _get_tab_def(tab_id)
	for raw_section in tab_def.get("sections", []) as Array:
		var section: Dictionary = raw_section if raw_section is Dictionary else {}
		var section_id := str(section.get("id", "")).strip_edges()
		if not section_id.is_empty():
			return section_id
	return ""


func _build_child_page_payload(tab_id: String, section_id: String, section_payload: Dictionary) -> Dictionary:
	var city_name := _snapshot_string("city_name", DEFAULT_CITY_NAME)
	var payload := section_payload.duplicate(true)
	var preferred_view_kind := _get_preferred_view_kind(tab_id, section_id)
	payload["summary_title"] = str(payload.get("summary_title", payload.get("title", section_id))).strip_edges()
	payload["list_title"] = str(payload.get("list_title", payload.get("title", "列表"))).strip_edges()
	if not payload.has("summary_lines"):
		payload["summary_lines"] = [
			_format_section_hint(tab_id, section_id),
			"主城：%s | 开发点 %s | 军令 %s | 已占城池 %s" % [
				city_name,
				str(_snapshot_int("development_points", 0)),
				str(_snapshot_int("order", 0)),
				str(_snapshot_int("captured_city_count", 0)),
			],
		]
	payload["page_id"] = _compose_page_id(tab_id, section_id)
	payload["preferred_view_kind"] = str(payload.get("preferred_view_kind", preferred_view_kind)).strip_edges()
	var contract_boundary_kind := str(payload.get(
		"contract_boundary_kind",
		"specialized_scene_fallback" if preferred_view_kind != "block_schema" else "block_schema"
	)).strip_edges()
	if contract_boundary_kind == "":
		contract_boundary_kind = "specialized_scene_fallback" if preferred_view_kind != "block_schema" else "block_schema"
	payload["contract_boundary_kind"] = contract_boundary_kind
	payload["specialized_anchor_page_id"] = str(payload.get("specialized_anchor_page_id", _get_specialized_anchor_page_id(tab_id))).strip_edges()
	return payload


func _get_preferred_view_kind(tab_id: String, section_id: String) -> String:
	if BUILDING_SECTION_BY_TAB.has(tab_id) and str(BUILDING_SECTION_BY_TAB.get(tab_id, "")) == section_id:
		return "building_group_scene"
	if tab_id == "affairs" and section_id == "queue":
		return "affairs_queue_view"
	return "block_schema"


func _get_specialized_anchor_page_id(tab_id: String) -> String:
	return str(SPECIALIZED_ANCHOR_PAGE_BY_TAB.get(tab_id, "")).strip_edges()


func _resolve_visual_smoke_page_id(page_id: String) -> Dictionary:
	var resolved_page_id := page_id.strip_edges()
	var tab_id := _current_top_tab_id
	var section_id := _get_current_section_id(tab_id)
	if resolved_page_id != "":
		var separator_index := resolved_page_id.find("/")
		if separator_index == -1:
			tab_id = resolved_page_id
			section_id = _get_current_section_id(tab_id)
		else:
			tab_id = resolved_page_id.substr(0, separator_index).strip_edges()
			section_id = resolved_page_id.substr(separator_index + 1).strip_edges()
	if tab_id == "":
		tab_id = DEFAULT_TOP_TAB_ID
	if section_id == "":
		section_id = _get_default_section_id(tab_id)
	return {
		"tab_id": tab_id,
		"section_id": section_id,
	}


func _visual_smoke_array(value: Variant) -> Array:
	return (value as Array).duplicate(true) if value is Array else []


func _visual_smoke_dictionary(value: Variant) -> Dictionary:
	return (value as Dictionary).duplicate(true) if value is Dictionary else {}


func _apply_home_lobby_summary(summary: Dictionary) -> void:
	UI_COMPONENT_FACTORY.apply_interior_home_lobby_summary(
		summary,
		HOME_ENTRY_DEFS.size(),
		_home_entry_ids_string(),
		_home_forbidden_entry_count(),
		INTERIOR_HOME_LOBBY_BACKGROUND_PATH,
		_home_lobby_background_available(),
		6,
		_home_entry_badge_count(),
		_home_entry_badges_available()
	)
	UI_COMPONENT_FACTORY.apply_interior_home_entry_chrome_summary(summary)


func _apply_secondary_page_summary(summary: Dictionary, page_id: String) -> void:
	var resolved_page_id := page_id.strip_edges()
	UI_COMPONENT_FACTORY.apply_interior_secondary_page_summary(
		summary,
		resolved_page_id,
		_home_entry_ids_string()
	)
	var tab_id := resolved_page_id
	var separator_index := resolved_page_id.find("/")
	if separator_index != -1:
		tab_id = resolved_page_id.substr(0, separator_index).strip_edges()
	if INTERIOR_SECONDARY_BACKGROUND_PATHS.has(tab_id):
		var background_path := _secondary_background_path(tab_id)
		UI_COMPONENT_FACTORY.apply_interior_secondary_atmosphere_summary(
			summary,
			_secondary_background_available(tab_id),
			background_path
		)
	summary["interiorSecondarySectionStripVisible"] = _should_show_section_strip(tab_id)
	summary["interiorSecondaryChromeTitle"] = _panel_chrome_title(tab_id)
	summary["interiorSecondaryChromeTitleMode"] = "panel_title_current_entry_v1"
	summary["interiorSecondaryBackButtonLabel"] = "返回"
	summary["interiorSecondaryCloseButtonLabel"] = "关闭"
	summary["interiorSecondaryChromeTitleFontSize"] = 24


func _apply_market_overview_summary(summary: Dictionary, text_block_count: int) -> void:
	var cards := _market_overview_card_defs()
	var resource_count := 0
	var operation_count := 0
	for raw_card in cards:
		var card: Dictionary = raw_card if raw_card is Dictionary else {}
		match str(card.get("kind", "")).strip_edges():
			"resource":
				resource_count += 1
			"operation":
				operation_count += 1
	UI_COMPONENT_FACTORY.apply_interior_secondary_card_chrome_summary(summary)
	UI_COMPONENT_FACTORY.apply_interior_market_overview_summary(
		summary,
		cards.size(),
		resource_count,
		operation_count,
		text_block_count,
		_market_section_ids_string(),
		_market_routing_section_present()
	)


func _apply_trade_exchange_summary(summary: Dictionary) -> void:
	UI_COMPONENT_FACTORY.apply_interior_secondary_card_chrome_summary(summary)
	summary["interiorTradeExchangeMode"] = "resource_exchange_board_v1"
	summary["interiorTradeExchangeSourceResourceCount"] = _trade_resource_defs().size()
	summary["interiorTradeExchangeTargetResourceCount"] = _trade_resource_defs().size()
	summary["interiorTradeExchangeRatioPercent"] = _trade_exchange_ratio_percent()
	summary["interiorTradeExchangeUsesGenericEntryCards"] = false


func _join_dictionary_field(items: Array, field_name: String) -> String:
	var values: Array[String] = []
	for raw_item in items:
		if not (raw_item is Dictionary):
			continue
		var item := raw_item as Dictionary
		var value := str(item.get(field_name, "")).strip_edges()
		if value != "":
			values.append(value)
	return "/".join(values)


func _count_dictionary_field(items: Array, field_name: String) -> int:
	var count := 0
	for raw_item in items:
		if not (raw_item is Dictionary):
			continue
		var item := raw_item as Dictionary
		if str(item.get(field_name, "")).strip_edges() != "":
			count += 1
	return count


func _count_work_order_remaining_display_labels(items: Array) -> int:
	var count := 0
	for raw_item in items:
		if not (raw_item is Dictionary):
			continue
		var item := raw_item as Dictionary
		if _work_order_remaining_display_label(item) != "":
			count += 1
	return count


func _count_running_work_orders(items: Array) -> int:
	var count := 0
	for raw_item in items:
		if not (raw_item is Dictionary):
			continue
		var item := raw_item as Dictionary
		if _work_order_is_running(item):
			count += 1
	return count


func _join_visible_work_order_state_labels(items: Array) -> String:
	var labels: Array[String] = []
	for raw_item in items:
		if not (raw_item is Dictionary):
			continue
		var item := raw_item as Dictionary
		var label := _work_order_visible_state_label(item)
		if label != "" and not labels.has(label):
			labels.append(label)
	return "/".join(labels)


func _join_primary_action_ids(items: Array) -> String:
	var action_ids: Array[String] = []
	for raw_item in items:
		if not (raw_item is Dictionary):
			continue
		var item := raw_item as Dictionary
		var action_id := _primary_action_id(item, "primary_action_id", "")
		if action_id != "" and not action_ids.has(action_id):
			action_ids.append(action_id)
	return "/".join(action_ids)


func _join_primary_action_labels(items: Array) -> String:
	var action_labels: Array[String] = []
	for raw_item in items:
		if not (raw_item is Dictionary):
			continue
		var item := raw_item as Dictionary
		var action_label := _primary_action_label(item, "primary_action_label", "")
		if action_label != "" and not action_labels.has(action_label):
			action_labels.append(action_label)
	return "/".join(action_labels)


func _apply_tax_treasury_summary(summary: Dictionary) -> void:
	var tax_runtime := _snapshot_tax_runtime()
	var active_slot := _active_tax_slot()
	var slots := _tax_schedule_slots()
	var has_collectable := false
	var has_collected := false
	var has_unavailable := false
	for raw_slot in slots:
		var slot: Dictionary = raw_slot if raw_slot is Dictionary else {}
		var slot_state := str(slot.get("state", "")).strip_edges()
		if slot_state == "collectable" or bool(slot.get("collectable_now", false)):
			has_collectable = true
		if slot_state == "collected" or bool(slot.get("collected_today", false)):
			has_collected = true
		if slot_state != "collectable" and slot_state != "collected" and not bool(slot.get("collectable_now", false)):
			has_unavailable = true
	UI_COMPONENT_FACTORY.apply_interior_secondary_card_chrome_summary(summary)
	summary["interiorTaxTreasuryMode"] = "tax_timeline_touch_collect_v1"
	summary["interiorTaxTreasuryCardCount"] = _tax_schedule_slots().size()
	summary["interiorTaxTreasuryCardIds"] = _join_dictionary_field(_tax_schedule_slots(), "slot_id")
	summary["interiorTaxTreasuryHeaderMetaVisible"] = false
	summary["interiorTaxTreasuryTopResourceChipVisible"] = false
	summary["interiorTaxTreasuryQuestionVisible"] = false
	summary["interiorTaxTreasuryStateHeroVisible"] = false
	summary["interiorTaxTreasuryNextLabelVisible"] = false
	summary["interiorTaxTreasuryCurrentTaxTitle"] = str(active_slot.get("title", tax_runtime.get("title", ""))).strip_edges()
	summary["interiorTaxTreasuryPrimaryActionLabel"] = _primary_action_label(tax_runtime, "primary_action_label", "征收")
	summary["interiorTaxTreasuryCollectableNow"] = "true" if bool(tax_runtime.get("collectable_now", false)) else "false"
	summary["interiorTaxTreasuryPrimaryFontSize"] = UI_COMPONENT_FACTORY.interior_market_overview_primary_font_size()
	summary["interiorTaxTreasuryUsesGenericEntryCards"] = false
	summary["interiorTaxTreasuryPrimaryButtonVisible"] = false
	summary["interiorTaxTreasuryHeroValueFontSize"] = 52
	summary["interiorTaxTreasuryActionButtonMinHeight"] = 0
	summary["interiorTaxTreasuryResourceChipCount"] = 0
	summary["interiorTaxTreasuryScheduleSlotCount"] = _tax_schedule_slots().size()
	summary["interiorTaxTreasuryScheduleLayoutMode"] = "horizontal_dayline_v1"
	summary["interiorTaxTreasuryScheduleCadence"] = "six_daily_slots_06_21_v1" if slots.size() >= 6 else "three_daily_slots_legacy_v1"
	summary["interiorTaxTreasuryScheduleHeaderVisible"] = false
	summary["interiorTaxTreasuryScheduleChromeMode"] = "node_button_line_v1"
	summary["interiorTaxTreasuryTimelineCompactMode"] = "six_slots_compact_fit_v1" if slots.size() >= 6 else "three_slots_standard_fit_v1"
	summary["interiorTaxTreasuryLayoutPriorityToken"] = INTERIOR_TAX_TREASURY_LAYOUT_PRIORITY_TOKEN
	summary["interiorTaxTreasuryHeroLayoutMode"] = "timeline_centered_primary_node_v2"
	summary["interiorTaxTreasuryTimelineVerticalMode"] = "upper_midline_no_top_void_v1"
	summary["interiorTaxTreasuryAssetFrameMode"] = "fit_no_clip_v1"
	summary["interiorTaxTreasuryHeroPanelVerticalMode"] = "primary_timeline_focus_band_v1"
	summary["interiorTaxTreasuryImageActionMode"] = "asset_button_collect_v1"
	summary["interiorTaxTreasuryStandaloneCollectButtonVisible"] = false
	summary["interiorTaxTreasuryPrimaryNodeRole"] = "primary_collect_center"
	summary["interiorTaxTreasuryTimelinePanelMinHeight"] = 430
	summary["interiorTaxTreasuryTopVoidGuard"] = "single_panel_not_bottom_anchored_v1"
	summary["interiorTaxTreasuryTimelineNodeCount"] = slots.size()
	summary["interiorTaxTreasuryTimelineStates"] = _join_dictionary_field(slots, "state")
	summary["interiorTaxTreasuryCollectableNodeHighlighted"] = has_collectable
	summary["interiorTaxTreasuryCollectedSealVisible"] = has_collected
	summary["interiorTaxTreasuryUnavailableDimmedVisible"] = has_unavailable
	summary["interiorTaxTreasuryCountdownVisible"] = str(tax_runtime.get("remaining_label", "")).strip_edges() != ""
	summary["interiorTaxTreasuryNextCollectLabel"] = str(tax_runtime.get("next_collect_label", ""))
	summary["interiorTaxRuntimeDataSource"] = _snapshot_string("main_city_interior_data_source", "")
	summary["interiorTaxRuntimeSchemaVersion"] = _snapshot_string("main_city_interior_schema_version", "")
	summary["interiorTaxTreasuryAssetRefMode"] = _snapshot_string("main_city_interior_asset_ref_mode", "")
	summary["interiorTaxTreasuryAssetCatalogVersion"] = _snapshot_string("main_city_interior_asset_catalog_version", "")
	summary["interiorTaxRuntimeEndpoint"] = _snapshot_string("main_city_interior_endpoint", "")
	summary["interiorTaxTreasuryPrimaryAssetVisible"] = _asset_path_from_ref(tax_runtime.get("hero_asset_ref", {}), str(tax_runtime.get("asset_path", ""))) != ""
	summary["interiorTaxTreasuryEngineeringCopyVisible"] = false


func _apply_affairs_operations_summary(summary: Dictionary) -> void:
	var city_orders := _construction_queue_items("city_inner")
	var world_orders := _construction_queue_items("world_outer")
	var all_orders := city_orders + world_orders
	_ensure_selected_work_order_from_orders(all_orders)
	var selected_order := _selected_work_order_from_orders(all_orders)
	var selected_queue_item_id := str(selected_order.get("queue_item_id", selected_order.get("id", ""))).strip_edges()
	var selected_action_id := _primary_action_id(selected_order, "primary_action_id", "") if not selected_order.is_empty() else ""
	var selected_asset_path := _asset_path_from_ref(selected_order.get("asset_ref", {}), str(selected_order.get("asset_path", ""))) if not selected_order.is_empty() else ""
	var asset_count := 0
	for raw_order in all_orders:
		var work_order: Dictionary = raw_order if raw_order is Dictionary else {}
		if _asset_path_from_ref(work_order.get("asset_ref", {}), str(work_order.get("asset_path", ""))) != "":
			asset_count += 1
	summary["interiorAffairsOperationsMode"] = "active_work_order_touch_grid_v2"
	summary["interiorAffairsOperationCount"] = all_orders.size()
	summary["interiorAffairsOperationIds"] = _join_dictionary_field(all_orders, "queue_item_id")
	summary["interiorAffairsPlayerQuestion"] = "哪里正在建设"
	summary["interiorAffairsQueueTitle"] = "正在建设"
	summary["interiorAffairsTopWorkOrderChipVisible"] = false
	summary["interiorAffairsGroupCountChipVisible"] = false
	summary["interiorAffairsNestedFrameMode"] = "flat_cards_no_group_frame_v1"
	summary["interiorAffairsQueueScrollMode"] = "touch_vertical_hidden_scrollbar_v1"
	summary["interiorAffairsQueueScrollbarVisible"] = false
	summary["interiorAffairsCityOuterSplitVisible"] = false
	summary["interiorAffairsQueueLayoutMode"] = "unified_two_column_touch_grid_v1"
	summary["interiorAffairsCardGridColumns"] = 2
	summary["interiorAffairsDomainBadgeVisible"] = all_orders.size() > 0
	summary["interiorAffairsStandaloneGroupPanelVisible"] = false
	summary["interiorAffairsHeaderHintVisible"] = false
	summary["interiorAffairsLargeBlankGroupPanelVisible"] = false
	summary["interiorAffairsWorkOrderCardMinHeight"] = 170
	summary["interiorAffairsUnifiedStateLabelMode"] = "display_state_label_v1"
	summary["interiorAffairsVisibleStateLabelSet"] = _join_visible_work_order_state_labels(all_orders)
	summary["interiorAffairsMixedFineStateLabelsVisible"] = false
	summary["interiorAffairsAiLinkMode"] = "suggestions_only_no_authority_dispatch"
	summary["interiorAffairsUsesGenericEntryCards"] = false
	summary["interiorAffairsPrimaryButtonVisible"] = false
	summary["interiorAffairsHeroValueFontSize"] = 28
	summary["interiorAffairsActionButtonMinHeight"] = 72
	summary["interiorAffairsConstructionQueueMode"] = str(_snapshot_construction_queues().get("mode", ""))
	summary["interiorAffairsConstructionQueueDataSource"] = _snapshot_string("main_city_interior_data_source", "")
	summary["interiorAffairsInteriorReadModelSchemaVersion"] = _snapshot_string("main_city_interior_schema_version", "")
	summary["interiorAffairsAssetRefMode"] = _snapshot_string("main_city_interior_asset_ref_mode", "")
	summary["interiorAffairsAssetCatalogVersion"] = _snapshot_string("main_city_interior_asset_catalog_version", "")
	summary["interiorAffairsInteriorReadModelEndpoint"] = _snapshot_string("main_city_interior_endpoint", "")
	summary["interiorAffairsCityWorkOrderCount"] = city_orders.size()
	summary["interiorAffairsWorldWorkOrderCount"] = world_orders.size()
	summary["interiorAffairsActiveWorkOrderCount"] = all_orders.size()
	summary["interiorAffairsRunningWorkOrderCount"] = _count_running_work_orders(all_orders)
	summary["interiorAffairsRemainingLabelCount"] = _count_dictionary_field(all_orders, "remaining_label")
	summary["interiorAffairsRemainingDisplayLabelCount"] = _count_work_order_remaining_display_labels(all_orders)
	summary["interiorAffairsWorkOrderAssetCount"] = asset_count
	summary["interiorAffairsProgressBarCount"] = all_orders.size()
	summary["interiorAffairsFieldWorkOrderCount"] = world_orders.size()
	summary["interiorAffairsStressWorkOrderTarget"] = _snapshot_int("main_city_interior_work_order_stress_target", 0)
	summary["interiorAffairsConfirmCopyVisible"] = false
	summary["interiorAffairsWorkOrderActionButtonVisible"] = all_orders.size() > 0
	summary["interiorAffairsWorkOrderActionButtonToken"] = INTERIOR_WORK_ORDER_ACTION_BUTTON_TOKEN
	summary["interiorAffairsWorkOrderActionLiveTextContract"] = INTERIOR_WORK_ORDER_ACTION_LIVE_TEXT_CONTRACT
	summary["interiorAffairsWorkOrderActionButtonCount"] = all_orders.size()
	summary["interiorAffairsWorkOrderActionLabels"] = _join_primary_action_labels(all_orders)
	summary["interiorAffairsWorkOrderActionAdapterMode"] = "work_order_primary_action_signal_v1"
	summary["interiorAffairsWorkOrderActionSignalBound"] = all_orders.size() > 0
	summary["interiorAffairsWorkOrderActionIds"] = _join_primary_action_ids(all_orders)
	var has_selected_work_order := _selected_work_order_queue_item_id != "" and not selected_order.is_empty()
	summary["interiorAffairsSelectedWorkOrderId"] = _selected_work_order_queue_item_id if _selected_work_order_queue_item_id != "" else selected_queue_item_id
	summary["interiorAffairsSelectedWorkOrderActionId"] = _selected_work_order_action_id if _selected_work_order_action_id != "" else selected_action_id
	summary["interiorAffairsSelectedWorkOrderDetailVisible"] = _selected_work_order_detail_visible and has_selected_work_order
	summary["interiorAffairsSelectedWorkOrderStandaloneDetailVisible"] = false
	var selected_work_order_asset_ref_visible := (_selected_work_order_uses_asset_ref or selected_asset_path != "") and has_selected_work_order
	UI_COMPONENT_FACTORY.apply_interior_affairs_card_chrome_summary(summary)
	summary["interiorAffairsSelectedWorkOrderUsesAssetRef"] = selected_work_order_asset_ref_visible
	summary["interiorAffairsSelectedWorkOrderAssetRefVisible"] = selected_work_order_asset_ref_visible
	summary["interiorAffairsSelectedWorkOrderHighlightVisible"] = has_selected_work_order
	summary["interiorAffairsSelectedWorkOrderDetailMode"] = "selected_card_only_v1"
	summary["interiorAffairsSelectedWorkOrderEngineeringCopyVisible"] = false
	summary["interiorAffairsEngineeringCopyVisible"] = false


func _apply_secondary_consumer_cards_summary(summary: Dictionary, tab_id: String, text_block_count: int) -> void:
	var cards := _secondary_consumer_card_defs(tab_id)
	UI_COMPONENT_FACTORY.apply_interior_secondary_consumer_cards_summary(
		summary,
		cards.size(),
		text_block_count
	)


func _home_entry_ids_string() -> String:
	var ids: Array[String] = []
	for raw_entry in HOME_ENTRY_DEFS:
		var entry: Dictionary = raw_entry if raw_entry is Dictionary else {}
		var entry_id := str(entry.get("id", "")).strip_edges()
		if entry_id != "":
			ids.append(entry_id)
	return "/".join(ids)


func _market_section_ids_string() -> String:
	var tab_def: Dictionary = _get_tab_def("market")
	var ids: Array[String] = []
	for raw_section in tab_def.get("sections", []) as Array:
		var section: Dictionary = raw_section if raw_section is Dictionary else {}
		var section_id := str(section.get("id", "")).strip_edges()
		if section_id != "":
			ids.append(section_id)
	return "/".join(ids)


func _market_routing_section_present() -> bool:
	return _get_section_ids(_get_tab_def("market")).has("routing")


func _home_forbidden_entry_count() -> int:
	var count := 0
	var ids := _home_entry_ids_string()
	for forbidden_id_variant in HOME_FORBIDDEN_ENTRY_IDS:
		var forbidden_id := str(forbidden_id_variant).strip_edges()
		if forbidden_id != "" and ids.find(forbidden_id) != -1:
			count += 1
	return count


func _apply_building_group_copy_density_summary(summary: Dictionary) -> void:
	var stats := _build_building_group_copy_density_stats()
	UI_COMPONENT_FACTORY.apply_interior_building_group_copy_density_summary(
		summary,
		str(stats.get("group_order", "")),
		str(stats.get("node_label_order", "")),
		int(stats.get("total_node_count", 0)),
		int(stats.get("max_cost_text_length", 0)),
		int(stats.get("cost_separator_count", 0)),
		int(stats.get("forbidden_term_count", 0)),
		int(stats.get("max_status_text_length", 0)),
		int(stats.get("max_meta_text_length", 0))
	)


func _build_building_group_copy_density_stats() -> Dictionary:
	var building_groups := _visual_smoke_dictionary(_interior_snapshot.get("building_groups", {}))
	var group_order: Array[String] = []
	var label_groups: Array[String] = []
	var total_node_count := 0
	var max_cost_text_length := 0
	var max_status_text_length := 0
	var max_meta_text_length := 0
	var cost_separator_count := 0
	var forbidden_term_count := 0
	for group_id_variant in BUILDING_GROUP_CONTRACT_ORDER:
		var group_id := str(group_id_variant).strip_edges()
		var group_variant: Variant = building_groups.get(group_id, {})
		if not (group_variant is Dictionary):
			continue
		var group := group_variant as Dictionary
		group_order.append(group_id)
		forbidden_term_count += _building_group_forbidden_term_hits(str(group.get("treeTitle", "")))
		var items_variant: Variant = group.get("treeItems", [])
		if not (items_variant is Array):
			label_groups.append("")
			continue
		var labels: Array[String] = []
		for item_variant in items_variant as Array:
			if not (item_variant is Dictionary):
				continue
			var item := item_variant as Dictionary
			total_node_count += 1
			var label_text := str(item.get("label", "")).strip_edges()
			if label_text != "":
				labels.append(label_text)
			var cost_text := str(item.get("costSummary", "")).strip_edges()
			var status_text := str(item.get("statusText", "")).strip_edges()
			var meta_text := str(item.get("meta", "")).strip_edges()
			max_cost_text_length = maxi(max_cost_text_length, cost_text.length())
			max_status_text_length = maxi(max_status_text_length, status_text.length())
			max_meta_text_length = maxi(max_meta_text_length, meta_text.length())
			cost_separator_count += _count_text_occurrences(cost_text, "|")
			for scan_key_variant in BUILDING_GROUP_COPY_SCAN_KEYS:
				var scan_key := str(scan_key_variant).strip_edges()
				forbidden_term_count += _building_group_forbidden_term_hits(str(item.get(scan_key, "")))
		label_groups.append("/".join(labels))
	return {
		"group_order": "/".join(group_order),
		"node_label_order": "|".join(label_groups),
		"total_node_count": total_node_count,
		"max_cost_text_length": max_cost_text_length,
		"cost_separator_count": cost_separator_count,
		"forbidden_term_count": forbidden_term_count,
		"max_status_text_length": max_status_text_length,
		"max_meta_text_length": max_meta_text_length,
	}


func _building_group_forbidden_term_hits(text: String) -> int:
	var normalized_text := text.strip_edges().to_lower()
	if normalized_text == "":
		return 0
	var hit_count := 0
	for term_variant in BUILDING_GROUP_FORBIDDEN_COPY_TERMS:
		var term := str(term_variant).strip_edges().to_lower()
		if term != "" and normalized_text.find(term) != -1:
			hit_count += 1
	return hit_count


func _count_text_occurrences(text: String, needle: String) -> int:
	if needle == "":
		return 0
	var count := 0
	var offset := 0
	while offset < text.length():
		var index := text.find(needle, offset)
		if index == -1:
			break
		count += 1
		offset = index + needle.length()
	return count


func _visual_smoke_dictionary_count(value: Dictionary) -> int:
	var count := 0
	for key in value.keys():
		if value.get(key) is Dictionary:
			count += 1
	return count


func _visual_smoke_dictionary_values(items: Array, key: String) -> Array:
	var result: Array = []
	for raw_item in items:
		var item: Dictionary = raw_item if raw_item is Dictionary else {}
		var value := str(item.get(key, "")).strip_edges()
		if value != "":
			result.append(value)
	return result


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


func _extract_text_block_lines(section_payload: Dictionary) -> Array[String]:
	var raw_blocks: Variant = section_payload.get("content_blocks", [])
	if raw_blocks is Array:
		for raw_block in raw_blocks as Array:
			var block: Dictionary = raw_block as Dictionary if raw_block is Dictionary else {}
			if str(block.get("kind", "text_block")).strip_edges() != "text_block":
				continue
			var lines := _coerce_string_array(block.get("lines", []))
			if not lines.is_empty():
				return lines
	return []


func _get_section_ids(tab_def: Dictionary) -> Array:
	var section_ids: Array = []
	for raw_section in tab_def.get("sections", []) as Array:
		var section: Dictionary = raw_section if raw_section is Dictionary else {}
		var section_id := str(section.get("id", "")).strip_edges()
		if not section_id.is_empty():
			section_ids.append(section_id)
	return section_ids


func _format_section_hint(tab_id: String, section_id: String) -> String:
	var tab_def: Dictionary = _get_tab_def(tab_id)
	var section_def: Dictionary = _get_section_def(tab_id, section_id)
	var tab_label := str(tab_def.get("label", "内政"))
	var section_label := str(section_def.get("label", section_id))
	var summary_title := str(tab_def.get("summary_title", "内政面板"))
	return "当前切项：%s · %s | %s" % [tab_label, section_label, summary_title]


func _clear_control_children(node: Control) -> void:
	for child in node.get_children():
		child.queue_free()


func _on_host_back_requested() -> void:
	if _current_top_tab_id != DEFAULT_TOP_TAB_ID:
		set_active_page_id("home/lobby")
		return
	back_requested.emit()


func _on_host_close_requested() -> void:
	close_requested.emit()


func _on_host_tab_selected(tab_id: String) -> void:
	_select_top_tab(tab_id)


func _on_section_tab_selected(section_id: String, top_tab_id: String) -> void:
	if top_tab_id.is_empty():
		return
	var tab_def: Dictionary = _get_tab_def(top_tab_id)
	if tab_def.is_empty():
		return
	if not _get_section_ids(tab_def).has(section_id):
		return
	_current_section_by_tab[top_tab_id] = section_id
	var state: Dictionary = _ensure_tab_view(top_tab_id)
	var section_strip = state.get("section_strip")
	if section_strip != null:
		section_strip.set_active_tab(section_id)
	_render_section_content(top_tab_id, section_id)
	page_changed.emit(_compose_page_id(top_tab_id, section_id))


func _get_current_section_id(tab_id: String) -> String:
	return str(_current_section_by_tab.get(tab_id, _get_default_section_id(tab_id))).strip_edges()


func _compose_page_id(top_tab_id: String, section_id: String) -> String:
	var resolved_top_tab_id := top_tab_id.strip_edges()
	var resolved_section_id := section_id.strip_edges()
	if resolved_top_tab_id == "":
		return ""
	if resolved_section_id == "":
		return resolved_top_tab_id
	return "%s/%s" % [resolved_top_tab_id, resolved_section_id]


func _ensure_host():
	if _host == null:
		_host = get_node_or_null("InteriorHost")
	return _host
