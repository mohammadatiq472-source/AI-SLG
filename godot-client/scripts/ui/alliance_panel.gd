extends Control
class_name AlliancePanel

signal back_requested
signal close_requested
signal page_changed(page_id: String)
signal page_action_requested(page_id: String, action_id: String)
signal action_requested(tab_id: String, action_id: String)
signal coordinate_jump_requested(payload: Dictionary)

const DEFAULT_ALLIANCE_NAME := "逐鹿盟"
const DEFAULT_TOP_TAB_ID := "overview"
const PANEL_TAB_STRIP_SCENE: PackedScene = preload("res://scenes/ui/panel_tab_strip.tscn")
const CHILD_PAGE_BLOCK_FACTORY_SCRIPT := preload("res://scripts/ui/child_page_block_factory.gd")
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")
const BATTLE_REPORT_LIST_PAGE_SCENE: PackedScene = preload("res://scenes/ui/battle_report_list_page.tscn")
const BATTLE_REPORT_DETAIL_PAGE_SCENE: PackedScene = preload("res://scenes/ui/battle_report_detail_page.tscn")
const BATTLE_REPORT_PRESENTER_SCRIPT := preload("res://scripts/ui/presenters/battle_report_presenter.gd")
const ORGANIZATION_LIFECYCLE_FIXTURE_PATH := "res://data/ui/organization_lifecycle_preview_read_model.json"

const ORGANIZATION_PANEL_CONTRACT := "organization_panel_v1"
const ORGANIZATION_ROUTE_MODE := "alliance_to_nation_lifecycle_route_v1"
const ORGANIZATION_ENTRY_LABEL_MODE := "dynamic_alliance_or_nation_v1"
const ORGANIZATION_HOME_VISUAL_MODE := "full_bleed_hall_art_overlay_entry_stage_v6"
const ORGANIZATION_HOME_STATUS_MODE := "transparent_faction_status_city_bonus_v2"
const ORGANIZATION_HOME_HERO_STAGE_MODE := "full_bleed_hall_art_real_ui_controls_v2"
const ORGANIZATION_HOME_ART_LAYER_MODE := "asset_drop_hall_art_layer_v1"
const ORGANIZATION_HOME_ART_FIT_MODE := "proportional_contain_full_image_no_crop_v1"
const ORGANIZATION_HOME_REAL_UI_CONTROL_MODE := "transparent_game_control_overlay_v2"
const ORGANIZATION_HOME_NOTICE_FEED_MODE := "minimal_transparent_notice_badge_v3"
const ORGANIZATION_HOME_ENTRY_GROUP_MODE := "centered_two_row_command_array_with_sovereign_group_v1"
const ORGANIZATION_HOME_ENTRY_BUTTON_TOKEN := "organization_home_entry_button_v1"
const ORGANIZATION_HOME_ENTRY_LIVE_TEXT_CONTRACT := "organization_home_entry_live_text_v1"
const ORGANIZATION_HOME_TOP_NAV_MODE := "hidden_host_tabs_art_entry_navigation_v1"
const ORGANIZATION_HOME_PRIMARY_FOCUS_MODE := "single_hall_art_stage_v1"
const ORGANIZATION_TOUCH_INPUT_MODE := "touch_mouse_drag_v1"
const ORGANIZATION_MOTION_TOKEN := "snapshot_edge_page_enter_v1"
const ALLIANCE_FOUND_NATION_ENTRY_MODE := "eligible_requirements_cta_v1"
const NATION_PROFILE_CONFIG_ENTRY_MODE := "alliance_founding_nation_profile_name_color_v1"
const NATION_PROFILE_DRAFT_MODE := "alliance_founding_local_ui_draft_before_authoritative_submit_v1"
const NATION_PROFILE_BACKEND_SUBMIT_MODE := "enabled_authoritative_nation_found_v1"
const NATION_FOUNDING_FAILURE_COPY_MODE := "mobile_large_player_copy_v1"
const NATION_POLICY_TREE_MODE := "season_permanent_bonus_policy_tree_v1"
const NATION_MARKET_VISIBILITY_MODE := "nation_only_market_v1"
const ORGANIZATION_MEMBER_GROUPING_MODE := "corps_or_group_read_model_v1"
const ORGANIZATION_OFFICER_PERMISSION_MODE := "official_permission_gated_management_v1"
const ORGANIZATION_DIPLOMACY_RELATION_MODE := "friendly_enemy_relation_read_model_v1"
const ORGANIZATION_LOG_MODE := "member_ai_player_join_leave_audit_v1"
const ORGANIZATION_BATTLE_REPORT_MODE := "member_battle_report_feed_v1"
const ORGANIZATION_READ_MODEL_SOURCE_MODE := "alliance_presenter_runtime_world_snapshot_v1"
const ORGANIZATION_LIFECYCLE_FIXTURE_MODE := "organization_lifecycle_ui_fixture_v1"
const ORGANIZATION_SECONDARY_VISUAL_MODE := "organization_secondary_game_card_stack_v1"
const ORGANIZATION_SECONDARY_CARD_STYLE_MODE := "seal_icon_layered_card_rows_v1"
const ORGANIZATION_SECONDARY_SUMMARY_MODE := "seal_compact_summary_bar_v1"
const ORGANIZATION_SECONDARY_GENERATED_BG_MODE := "generated_section_background_layer_v1"
const ORGANIZATION_SECONDARY_BG_FIT_MODE := "proportional_cover_crop_no_deform_v1"
const ORGANIZATION_SECONDARY_REAL_UI_OVERLAY_MODE := "real_ui_on_translucent_game_panels_v1"
const ORGANIZATION_SECONDARY_STAGE_LAYOUT_MODE := "single_stage_real_ui_no_dual_column_v1"
const ORGANIZATION_SECONDARY_PAGE_FACTORY_BOUNDARY := "bespoke_game_stage_without_child_page_dual_column_v1"
const ORGANIZATION_MEMBER_ROSTER_LAYOUT_MODE := "single_roster_stage_no_duplicate_preview_v1"
const ORGANIZATION_MEMBER_TABLE_MODE := "member_roster_card_table_v2"
const ORGANIZATION_CORPS_CARD_GRID_MODE := "corps_game_card_grid_v2"
const ORGANIZATION_HOME_DEFAULT_ROUTE_MODE := "organization_overview_home_default_entry_v1"
const ORGANIZATION_OFFICER_HIERARCHY_CANVAS_MODE := "official_hierarchy_zoom_canvas_v1"
const ORGANIZATION_POLICY_TREE_CANVAS_MODE := "policy_tree_climb_zoom_canvas_v1"
const ORGANIZATION_POLICY_READ_MODEL_MODE := "nation_policy_read_model_tree_canvas_v1"
const ORGANIZATION_DIPLOMACY_BOARD_MODE := "diplomacy_relation_board_game_cards_v3"
const ORGANIZATION_MARKET_CARD_GRID_MODE := "market_supply_read_model_card_grid_v3"
const ORGANIZATION_NATION_BUILDING_READ_MODEL_MODE := "nation_building_read_model_card_grid_v1"
const ORGANIZATION_LOG_TIMELINE_MODE := "organization_log_filter_timeline_cards_v3"
const ORGANIZATION_LOG_FILTER_MODE := "organization_log_report_filter_strip_v1"
const ORGANIZATION_BATTLE_REPORT_NAVIGATION_MODE := "organization_battle_report_list_then_detail_route_v1"
const ORGANIZATION_BATTLE_REPORT_LIST_MODE := "organization_battle_report_list_page_v2"
const ORGANIZATION_BATTLE_REPORT_DETAIL_MODE := "organization_battle_report_detail_page_v2"
const ORGANIZATION_BATTLE_REPORT_REUSE_SOURCE_MODE := "battle_report_list_detail_contract_adapter_v1"
const ORGANIZATION_BATTLE_REPORT_FILTER_MODE := "battle_report_core_data_filter_no_visible_extra_strip_v1"
const ORGANIZATION_BATTLE_REPORT_EMBEDDED_CHROME_MODE := "battle_report_core_scene_no_organization_dashboard_chrome_v1"
const BATTLE_REPORT_REAL_DATA_SOURCE_MODE := "battle_report_real_data_world_reports_feedback_records_v1"
const BATTLE_REPORT_OWNER_SCOPE_MODE := "human_and_ai_player_battle_report_owner_scope_v1"
const BATTLE_REPORT_AI_OWNER_ATTRIBUTION_MODE := "ai_player_battle_report_owner_attribution_v1"
const ORGANIZATION_BATTLE_REPORT_SOURCE_FILTER_MODE := "organization_battle_report_source_filter_v1"
const NATION_MIDGAME_FRONTEND_SKELETON_CONTRACT := "nation_midgame_frontend_skeleton_v1"
const NATION_MIDGAME_PLAYER_UI_COPY_CONTRACT := "nation_midgame_player_ui_copy_v1"
const NATION_MIDGAME_LUOYANG_ROUTE_ACTION_ID := "open_tianxia_luoyang_target"
const NATION_MIDGAME_LUOYANG_ROUTE_LABEL := "进军洛阳"
const NATION_MIDGAME_ROUTE_SCOPE := "luoyang_route_only_not_full_unification"
const ORGANIZATION_HOME_ALLIANCE_ART_ASSET_PATH := "res://data/ui/organization_lifecycle_visual_asset_drop/organization_alliance_council_hall_hero_wide_stage_v1.png"
const ORGANIZATION_HOME_NATION_ART_ASSET_PATH := "res://data/ui/organization_lifecycle_visual_asset_drop/organization_nation_throne_hall_hero_wide_stage_v1.png"
const ORGANIZATION_SECONDARY_MEMBERS_BG_ASSET_PATH := "res://data/ui/organization_lifecycle_visual_asset_drop/organization_secondary_members_bg_v1.png"
const ORGANIZATION_SECONDARY_OFFICERS_BG_ASSET_PATH := "res://data/ui/organization_lifecycle_visual_asset_drop/organization_secondary_officers_bg_v1.png"
const ORGANIZATION_SECONDARY_DIPLOMACY_BG_ASSET_PATH := "res://data/ui/organization_lifecycle_visual_asset_drop/organization_secondary_diplomacy_bg_v1.png"
const ORGANIZATION_SECONDARY_BATTLE_REPORTS_BG_ASSET_PATH := "res://data/ui/organization_lifecycle_visual_asset_drop/organization_secondary_battle_reports_bg_v1.png"
const ORGANIZATION_SECONDARY_POLICY_BG_ASSET_PATH := "res://data/ui/organization_lifecycle_visual_asset_drop/organization_secondary_policy_council_bg_v1.png"
const ORGANIZATION_SECONDARY_MARKET_BG_ASSET_PATH := "res://data/ui/organization_lifecycle_visual_asset_drop/organization_secondary_market_supply_bg_v1.png"

const HOME_LEFT_COLUMN_WIDTH := 300.0
const HOME_RIGHT_COLUMN_WIDTH := 270.0
const HOME_MIN_VISUAL_HEIGHT := 666.0
const HOME_ART_STAGE_MIN_HEIGHT := 666.0
const HOME_STAGE_REFERENCE_WIDTH := 1530.0
const HOME_ENTRY_BUTTON_MIN_WIDTH := 152.0
const HOME_ENTRY_BUTTON_MIN_HEIGHT := 62.0
const ORGANIZATION_CANVAS_MIN_ZOOM := 0.48
const ORGANIZATION_CANVAS_MAX_ZOOM := 1.65
const ORGANIZATION_CANVAS_DEFAULT_ZOOM := 0.82
const OFFICER_CANVAS_BASE_SIZE := Vector2(2160, 2540)
const POLICY_CANVAS_BASE_SIZE := Vector2(1620, 940)

const TOP_TAB_ORDER := [
	"overview",
	"members",
	"governance",
	"diplomacy",
	"battle_reports",
	"nation",
]

const PANEL_DEFS := {
	"overview": {
		"label": "驻地",
		"summary_title": "组织总览",
		"summary_lines": [
			"驻地首页承接同盟/国家的身份、领地、公告、日志和阶段入口。",
			"首页只放摘要与入口，完整成员、官员、外交、政策、市井进入子页。",
		],
		"sections": [
			{
				"id": "home",
				"label": "驻地总览",
				"title": "组织总览",
				"item_cards": [],
				"content_blocks": [],
			},
		],
	},
	"members": {
		"label": "成员",
		"summary_title": "成员总览",
		"summary_lines": [
			"成员页承接名册、分组、下属成员、官员架构、势力分布与军略。",
			"这里保留成员战功、坐标、州郡和角色信息的正式位置。",
		],
		"sections": [
			{
				"id": "overview",
				"label": "成员总览",
				"title": "成员名册",
				"item_cards": [
					{"title": "乌林义从军", "value": "盟主", "meta": "并州", "description": "战功 18.2k"},
					{"title": "滕海", "value": "副盟主", "meta": "兖州", "description": "战功 15.6k"},
					{"title": "天赐", "value": "官员", "meta": "巴州", "description": "战功 12.4k"},
					{"title": "青山", "value": "成员", "meta": "资源州", "description": "战功 9.8k"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "成员摘要",
						"lines": [
							"当前活跃成员：24",
							"编制席位：24",
							"主战队列：5",
						],
						"node_name": "AllianceMembersOverviewDefaultSummaryBlock",
					},
					{
						"kind": "text_block",
						"title": "补充",
						"lines": [
							"成员页保留战功、坐标、州郡和角色信息。",
							"成员个人资料页可以继续向下展开。",
						],
						"node_name": "AllianceMembersOverviewDefaultFooterBlock",
					},
				],
			},
			{
				"id": "groups",
				"label": "军团",
				"title": "军团编制",
				"item_cards": [
					{"title": "一团", "value": "主攻", "meta": "同盟分组", "description": "默认分组卡位。"},
					{"title": "二团", "value": "驻守", "meta": "同盟分组", "description": "默认分组卡位。"},
					{"title": "三团", "value": "调度", "meta": "同盟分组", "description": "默认分组卡位。"},
					{"title": "预备组", "value": "待命", "meta": "同盟分组", "description": "默认分组卡位。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "分组摘要",
						"lines": [
							"分组用于区分主力、协同和预备成员。",
							"分组切换不改变总体同盟身份。",
						],
						"node_name": "AllianceMembersGroupsDefaultSummaryBlock",
					},
				],
			},
			{
				"id": "subordinates",
				"label": "下属成员",
				"title": "下属成员",
				"item_cards": [
					{"title": "巴州组", "value": "5 人", "meta": "州郡队列", "description": "默认下属成员卡位。"},
					{"title": "兖州组", "value": "6 人", "meta": "州郡队列", "description": "默认下属成员卡位。"},
					{"title": "豫州组", "value": "4 人", "meta": "州郡队列", "description": "默认下属成员卡位。"},
					{"title": "资源州组", "value": "3 人", "meta": "州郡队列", "description": "默认下属成员卡位。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "下属成员摘要",
						"lines": [
							"下属成员页与成员总览分开。",
							"这里更像组织下钻，而不是简单成员列表。",
						],
						"node_name": "AllianceMembersSubordinatesDefaultSummaryBlock",
					},
				],
			},
			{
				"id": "officers",
				"label": "官员架构",
				"title": "官职层级",
				"item_cards": [
					{"title": "盟主", "value": "官员架构", "meta": "官职层级", "description": "默认官员架构卡位。"},
					{"title": "副盟主", "value": "官员架构", "meta": "官职层级", "description": "默认官员架构卡位。"},
					{"title": "大司马", "value": "官员架构", "meta": "官职层级", "description": "默认官员架构卡位。"},
					{"title": "治中从事", "value": "官员架构", "meta": "官职层级", "description": "默认官员架构卡位。"},
					{"title": "功曹", "value": "官员架构", "meta": "官职层级", "description": "默认官员架构卡位。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "官员摘要",
						"lines": [
							"官员架构不是简单成员列表，而是组织图。",
							"后续可直接接官职权限、职责和审批链。",
						],
						"node_name": "AllianceMembersOfficersDefaultSummaryBlock",
					},
				],
			},
			{
				"id": "territory",
				"label": "势力分布",
				"title": "区域分布",
				"item_cards": [
					{"title": "并州前线", "value": "区域分布", "meta": "默认区域卡位", "description": "默认势力分布入口。"},
					{"title": "兖州缓冲带", "value": "区域分布", "meta": "默认区域卡位", "description": "默认势力分布入口。"},
					{"title": "巴州要点", "value": "区域分布", "meta": "默认区域卡位", "description": "默认势力分布入口。"},
					{"title": "资源州接力点", "value": "区域分布", "meta": "默认区域卡位", "description": "默认势力分布入口。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "势力摘要",
						"lines": [
							"势力分布用于显示同盟影响范围和驻点密度。",
							"它和地图层共享事实，但不共享路由层级。",
						],
						"node_name": "AllianceMembersTerritoryDefaultSummaryBlock",
					},
				],
			},
			{
				"id": "strategy",
				"label": "军略",
				"title": "军略项",
				"item_cards": [
					{"title": "攻坚", "value": "军略项", "meta": "默认军略卡位", "description": "默认军略入口。"},
					{"title": "集中调动", "value": "军略项", "meta": "默认军略卡位", "description": "默认军略入口。"},
					{"title": "驻守轮换", "value": "军略项", "meta": "默认军略卡位", "description": "默认军略入口。"},
					{"title": "营造", "value": "军略项", "meta": "默认军略卡位", "description": "默认军略入口。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "军略摘要",
						"lines": [
							"军略保持为策略子层，不埋进成员页。",
							"后续可继续接战区计划和执行节奏。",
						],
						"node_name": "AllianceMembersStrategyDefaultSummaryBlock",
					},
				],
			},
		],
	},
	"governance": {
		"label": "治理",
		"summary_title": "官员与立国",
		"summary_lines": [
			"治理页承接官员任免、军团管理权限和同盟立国条件。",
			"立国成功后立国入口隐藏，国家能力转入国家页。",
		],
		"sections": [
			{
				"id": "officers",
				"label": "官员",
				"title": "官员架构",
				"item_cards": [
					{"title": "盟主", "value": "主控", "meta": "最高权限", "description": "官员任免与立国权限由组织职责决定。"},
					{"title": "指挥官", "value": "待编制", "meta": "军团权限", "description": "军团创建需要官员权限。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "官员摘要",
						"lines": [
							"官员页只展示职责、席位与可操作状态，任免结果由后续组织链路处理。",
						],
						"node_name": "OrganizationGovernanceOfficersDefaultSummaryBlock",
					},
				],
			},
			{
				"id": "founding",
				"label": "立国",
				"title": "王国立国条件",
				"item_cards": [
					{"title": "同盟等级", "value": "20", "meta": "王国条件", "description": "达到 20 级后可发起王国立国。"},
					{"title": "占有郡", "value": "1", "meta": "王国条件", "description": "占有一个郡后选择郡城作为都城。"},
					{"title": "国号", "value": "同盟名升级", "meta": "同盟-立国", "description": "立国确认前在本入口配置国号。"},
					{"title": "势力色", "value": "#c95f32", "meta": "一次选择", "description": "立国后随都城锁定，迁都后才可重选。"},
					{"title": "权限", "value": "待检测", "meta": "盟主/授权官员", "description": "UI 不本地推断权限。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "立国摘要",
						"lines": [
							"同盟满足王国条件后显示立国入口；立国成功后入口隐藏。",
							"帝国是王国后的晋升目标：90 级、1 个州治、10 个郡城和 200 玉符。",
						],
						"node_name": "OrganizationGovernanceFoundingDefaultSummaryBlock",
					},
				],
			},
		],
	},
	"diplomacy": {
		"label": "外交",
		"summary_title": "组织外交",
		"summary_lines": [
			"外交页承接友好、敌对、中立关系。",
			"关系色标后续会接入地图视觉，本页先保留组织层级与外交态势。",
		],
		"sections": [
			{
				"id": "relations",
				"label": "关系",
				"title": "外交关系",
				"item_cards": [
					{"title": "友好组织", "value": "0", "meta": "外交关系", "description": "淡蓝关系表现后续由地图视觉承接。"},
					{"title": "敌对组织", "value": "0", "meta": "外交关系", "description": "深红关系表现后续由地图视觉承接。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "外交摘要",
						"lines": [
							"外交页只展示组织关系，不直接修改地图格子或战斗规则。",
						],
						"node_name": "OrganizationDiplomacyRelationsDefaultSummaryBlock",
					},
				],
			},
		],
	},
	"applications": {
		"label": "申请",
		"summary_title": "申请处理",
		"summary_lines": [
			"申请页承接同盟加入、审核和历史记录。",
			"后续可接审批流和通知流，不把申请塞回成员页。",
		],
		"sections": [
			{
				"id": "pending",
				"label": "待审",
				"title": "待审申请",
				"item_cards": [
					{"title": "巴州义从", "value": "加入申请", "meta": "备注：前线转入", "description": "默认待审申请卡位。"},
					{"title": "兖州前锋", "value": "加入申请", "meta": "备注：可驻守", "description": "默认待审申请卡位。"},
					{"title": "豫州预备", "value": "加入申请", "meta": "备注：待面试", "description": "默认待审申请卡位。"},
					{"title": "青州游侠", "value": "加入申请", "meta": "备注：补位队列", "description": "默认待审申请卡位。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "审批摘要",
						"lines": [
							"待审申请保留来源、主推人、当前州郡和备注。",
							"审批动作后续可以接同盟通知与战区提醒。",
						],
						"node_name": "AllianceApplicationsPendingDefaultSummaryBlock",
					},
				],
			},
			{
				"id": "review",
				"label": "审批中",
				"title": "审批中",
				"item_cards": [
					{"title": "待审批", "value": "4", "meta": "审批节点", "description": "默认审批状态卡位。"},
					{"title": "待补材料", "value": "2", "meta": "审批节点", "description": "默认审批状态卡位。"},
					{"title": "待确认", "value": "1", "meta": "审批节点", "description": "默认审批状态卡位。"},
					{"title": "待分配", "value": "3", "meta": "审批节点", "description": "默认审批状态卡位。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "审批摘要",
						"lines": [
							"审批中条目用于记录当前审批链状态。",
							"后续可接盟主、官员和指挥官的操作权限。",
						],
						"node_name": "AllianceApplicationsReviewDefaultSummaryBlock",
					},
				],
			},
			{
				"id": "history",
				"label": "历史记录",
				"title": "历史记录",
				"item_cards": [
					{"title": "昨日通过", "value": "3", "meta": "历史记录", "description": "默认审核历史卡位。"},
					{"title": "昨日拒绝", "value": "1", "meta": "历史记录", "description": "默认审核历史卡位。"},
					{"title": "过期申请", "value": "2", "meta": "历史记录", "description": "默认审核历史卡位。"},
					{"title": "本周归档", "value": "6", "meta": "历史记录", "description": "默认审核历史卡位。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "历史摘要",
						"lines": [
							"历史记录用于追溯申请流和审批结果。",
							"后续可接筛选、检索和批量处理。",
						],
						"node_name": "AllianceApplicationsHistoryDefaultSummaryBlock",
					},
				],
			},
		],
	},
	"nation": {
		"label": "国家",
		"summary_title": "国家能力",
		"summary_lines": [
			"国家页承接中局目标、政策与市井。",
			"同盟阶段显示锁定说明，立国后切换为中局目标、政策和市井。",
		],
		"sections": [
			{
				"id": "midgame",
				"label": "中局",
				"title": "国家中局",
				"item_cards": [],
				"content_blocks": [],
			},
			{
				"id": "policy",
				"label": "政策",
				"title": "政策树",
				"item_cards": [
					{"title": "国家政策", "value": "立国后可用", "meta": "赛季永久加成", "description": "政策不是同盟短期军略。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "政策摘要",
						"lines": [
							"政策完成后在本赛季提供永久加成；同盟阶段显示锁定态。",
						],
						"node_name": "OrganizationNationPolicyDefaultSummaryBlock",
					},
				],
			},
			{
				"id": "market",
				"label": "市井",
				"title": "国家市井",
				"item_cards": [
					{"title": "市井", "value": "立国后开放", "meta": "资源与供给", "description": "同盟阶段不提供可操作购买入口。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "市井摘要",
						"lines": [
							"市井只在国家阶段开放，购买与结算后续交由系统处理。",
						],
						"node_name": "OrganizationNationMarketDefaultSummaryBlock",
					},
				],
			},
		],
	},
	"battle_reports": {
		"label": "战情",
		"summary_title": "战情总览",
		"summary_lines": [
			"战报页承接交战回放、重点战况与历史归档。",
			"后续可接战区过滤、时间线检索和指挥摘要。",
		],
		"sections": [
			{
				"id": "latest",
				"label": "最新战报",
				"title": "最新战报",
				"item_cards": [
					{"title": "并州北线交战", "value": "最新战报", "meta": "默认战报卡位", "description": "默认最新战报入口。"},
					{"title": "资源州抢点", "value": "最新战报", "meta": "默认战报卡位", "description": "默认最新战报入口。"},
					{"title": "夜袭回放", "value": "最新战报", "meta": "默认战报卡位", "description": "默认最新战报入口。"},
					{"title": "营地损失复盘", "value": "最新战报", "meta": "默认战报卡位", "description": "默认最新战报入口。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "战报摘要",
						"lines": [
							"战报以时间线和战区维度组织。",
							"点击后可继续接战斗详情与行动批注。",
						],
						"node_name": "AllianceBattleReportsLatestDefaultSummaryBlock",
					},
				],
			},
			{
				"id": "detail",
				"label": "战报详情",
				"title": "战报详情",
				"item_cards": [],
				"content_blocks": [],
			},
			{
				"id": "highlights",
				"label": "重点战况",
				"title": "重点战况",
				"item_cards": [
					{"title": "关键战斗", "value": "重点节点", "meta": "默认重点战况卡位", "description": "默认重点战况入口。"},
					{"title": "重伤队伍", "value": "重点节点", "meta": "默认重点战况卡位", "description": "默认重点战况入口。"},
					{"title": "突破点", "value": "重点节点", "meta": "默认重点战况卡位", "description": "默认重点战况入口。"},
					{"title": "驻守变更", "value": "重点节点", "meta": "默认重点战况卡位", "description": "默认重点战况入口。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "重点摘要",
						"lines": [
							"重点战况用于快速定位战报价值点。",
							"后续可直接接战区视图和战报标记。",
						],
						"node_name": "AllianceBattleReportsHighlightsDefaultSummaryBlock",
					},
				],
			},
			{
				"id": "archive",
				"label": "归档",
				"title": "战报归档",
				"item_cards": [
					{"title": "本周归档", "value": "战报归档", "meta": "默认归档卡位", "description": "默认战报归档入口。"},
					{"title": "本月归档", "value": "战报归档", "meta": "默认归档卡位", "description": "默认战报归档入口。"},
					{"title": "历史归档", "value": "战报归档", "meta": "默认归档卡位", "description": "默认战报归档入口。"},
					{"title": "战区分类", "value": "战报归档", "meta": "默认归档卡位", "description": "默认战报归档入口。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "归档摘要",
						"lines": [
							"归档用于沉淀历史交战记录。",
							"后续可接筛选、导出和复盘标签。",
						],
						"node_name": "AllianceBattleReportsArchiveDefaultSummaryBlock",
					},
				],
			},
			{
				"id": "log",
				"label": "日志",
				"title": "组织日志",
				"item_cards": [
					{"title": "成员加入", "value": "日志", "meta": "成员/AI 玩家", "description": "记录成员与 AI 玩家进入组织。"},
					{"title": "官员任免", "value": "日志", "meta": "治理记录", "description": "记录官员任免和权限变化。"},
					{"title": "外交变化", "value": "日志", "meta": "关系记录", "description": "记录友好、敌对、中立关系调整。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "日志摘要",
						"lines": [
							"日志页记录成员加入、AI 玩家加入、官员任免、立国和外交变化。",
							"它不是邮件页，也不承载奖励领取。",
						],
						"node_name": "OrganizationBattleReportsLogDefaultSummaryBlock",
					},
				],
			},
		],
	},
	"coordination": {
		"label": "协同目标",
		"summary_title": "协同目标",
		"summary_lines": [
			"协同目标页承接攻城、驻守、补给和执行进度。",
			"后续可接目标卡、里程碑和协同日志。",
		],
		"sections": [
			{
				"id": "board",
				"label": "目标看板",
				"title": "目标看板",
				"item_cards": [
					{"title": "攻城目标", "value": "目标看板", "meta": "默认协同卡位", "description": "默认目标看板入口。"},
					{"title": "驻点维护", "value": "目标看板", "meta": "默认协同卡位", "description": "默认目标看板入口。"},
					{"title": "补给线", "value": "目标看板", "meta": "默认协同卡位", "description": "默认目标看板入口。"},
					{"title": "协同防守", "value": "目标看板", "meta": "默认协同卡位", "description": "默认目标看板入口。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "看板摘要",
						"lines": [
							"目标看板用于承接当前同盟协同主线。",
							"可继续扩展为攻城、驻守和补给三类目标。",
						],
						"node_name": "AllianceCoordinationBoardDefaultSummaryBlock",
					},
				],
			},
			{
				"id": "progress",
				"label": "执行进度",
				"title": "执行进度",
				"item_cards": [
					{"title": "待执行", "value": "执行进度", "meta": "默认进度卡位", "description": "默认执行进度入口。"},
					{"title": "进行中", "value": "执行进度", "meta": "默认进度卡位", "description": "默认执行进度入口。"},
					{"title": "已完成", "value": "执行进度", "meta": "默认进度卡位", "description": "默认执行进度入口。"},
					{"title": "延期复盘", "value": "执行进度", "meta": "默认进度卡位", "description": "默认执行进度入口。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "进度摘要",
						"lines": [
							"执行进度用于记录当前协同目标状态。",
							"后续可接里程碑和责任人。",
						],
						"node_name": "AllianceCoordinationProgressDefaultSummaryBlock",
					},
				],
			},
			{
				"id": "log",
				"label": "协同日志",
				"title": "协同日志",
				"item_cards": [
					{"title": "调动记录", "value": "协同日志", "meta": "默认日志卡位", "description": "默认协同日志入口。"},
					{"title": "执行变更", "value": "协同日志", "meta": "默认日志卡位", "description": "默认协同日志入口。"},
					{"title": "协同批注", "value": "协同日志", "meta": "默认日志卡位", "description": "默认协同日志入口。"},
					{"title": "复盘摘要", "value": "协同日志", "meta": "默认日志卡位", "description": "默认协同日志入口。"},
				],
				"content_blocks": [
					{
						"kind": "text_block",
						"title": "日志摘要",
						"lines": [
							"协同日志用于回看目标推进与执行变化。",
							"后续可接成员批注和任务回执。",
						],
						"node_name": "AllianceCoordinationLogDefaultSummaryBlock",
					},
				],
			},
		],
	},
}

@onready var _host = $AllianceHost

var _alliance_snapshot: Dictionary = {
	"alliance_name": DEFAULT_ALLIANCE_NAME,
	"organization_kind": "alliance",
	"organization_lifecycle_stage": "alliance",
	"organization_state_name": "青州",
	"organization_level": 1,
	"organization_exp": 0,
	"organization_exp_required": 1,
	"organization_power": 0,
	"owned_commandery_count": 0,
	"owned_city_count": 0,
	"announcement_title": "同盟公告",
	"announcement_body": "同盟事务、立国目标和组织通知会在这里汇总。",
	"recent_log_lines": ["暂无组织日志。"],
	"recent_report_lines": ["暂无组织战报。"],
	"found_nation_visible": true,
	"found_nation_can_found": false,
	"found_nation_requirement_lines": ["王国条件：同盟等级 1 / 20", "占有郡：0 / 1"],
	"empire_upgrade_requirement_lines": ["帝国升级：王国等级 1 / 90", "州治：0 / 1", "郡城：0 / 10", "费用：200 玉符"],
	"nation_profile_draft": {
		"nation_name": "齐国",
		"color_hex": "#c95f32",
		"capital_tile_id": "",
		"capital_name": "当前郡城",
		"capital_options": [],
		"source_page": "governance/founding",
		"local_only": true,
		"dirty": false,
	},
	"organization_fixture_applied": false,
	"organization_fixture_id": "",
	"organization_fixture_source": ORGANIZATION_LIFECYCLE_FIXTURE_PATH,
	"member_count": 24,
	"online_count": 8,
	"territory_count": 3,
	"goal_count": 2,
}
var _tab_views: Dictionary = {}
var _current_top_tab_id: String = ""
var _current_section_by_tab: Dictionary = {}
var _last_emitted_page_id: String = ""
var _suppress_page_changed := false
var _organization_battle_report_selected_id: String = ""
var _war_room_selected_enemy_id: String = ""
var _war_room_history_page_by_enemy: Dictionary = {}
var _war_room_live_refresh_count: int = 0
var _war_room_live_refresh_timer: Timer = null
var _canvas_zoom_by_name: Dictionary = {}
var _canvas_scroll_by_name: Dictionary = {}
var _canvas_inertia_tweens: Dictionary = {}


func _ready() -> void:
	_bind_host_signals()
	_ensure_war_room_live_refresh_timer()
	_rebuild_panel()
	UI_COMPONENT_FACTORY.apply_motion_snapshot_edge_page_enter(self, 0)


func _ensure_war_room_live_refresh_timer() -> void:
	if _war_room_live_refresh_timer != null:
		return
	_war_room_live_refresh_timer = Timer.new()
	_war_room_live_refresh_timer.name = "OrganizationWarRoomLiveRefreshTimer"
	_war_room_live_refresh_timer.wait_time = 20.0
	_war_room_live_refresh_timer.one_shot = false
	_war_room_live_refresh_timer.autostart = true
	_war_room_live_refresh_timer.timeout.connect(Callable(self, "_on_war_room_live_refresh_timer_timeout"))
	add_child(_war_room_live_refresh_timer)


func _on_war_room_live_refresh_timer_timeout() -> void:
	_war_room_live_refresh_count += 1
	if get_active_page_id() == "battle_reports/detail":
		page_action_requested.emit("battle_reports/detail", "war_room_live_refresh_poll")
		action_requested.emit("battle_reports", "war_room_live_refresh_poll")
		_render_section_content("battle_reports", "detail")


func set_alliance_snapshot(snapshot: Dictionary) -> void:
	_alliance_snapshot = snapshot.duplicate(true)
	_suppress_page_changed = true
	_rebuild_panel()
	_suppress_page_changed = false


func apply_organization_lifecycle_fixture(fixture_id: String) -> Dictionary:
	var normalized_fixture_id := fixture_id.strip_edges()
	if normalized_fixture_id == "":
		return {
			"ok": false,
			"reason": "fixture_id_empty",
			"fixturePath": ORGANIZATION_LIFECYCLE_FIXTURE_PATH,
		}
	if not FileAccess.file_exists(ORGANIZATION_LIFECYCLE_FIXTURE_PATH):
		return {
			"ok": false,
			"reason": "fixture_file_missing",
			"fixtureId": normalized_fixture_id,
			"fixturePath": ORGANIZATION_LIFECYCLE_FIXTURE_PATH,
		}
	var file := FileAccess.open(ORGANIZATION_LIFECYCLE_FIXTURE_PATH, FileAccess.READ)
	if file == null:
		return {
			"ok": false,
			"reason": "fixture_file_open_failed",
			"fixtureId": normalized_fixture_id,
			"fixturePath": ORGANIZATION_LIFECYCLE_FIXTURE_PATH,
		}
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not (parsed is Dictionary):
		return {
			"ok": false,
			"reason": "fixture_json_invalid",
			"fixtureId": normalized_fixture_id,
			"fixturePath": ORGANIZATION_LIFECYCLE_FIXTURE_PATH,
		}
	var root: Dictionary = parsed as Dictionary
	var fixtures_variant: Variant = root.get("fixtures", {})
	if not (fixtures_variant is Dictionary):
		return {
			"ok": false,
			"reason": "fixtures_missing",
			"fixtureId": normalized_fixture_id,
			"fixturePath": ORGANIZATION_LIFECYCLE_FIXTURE_PATH,
		}
	var fixtures: Dictionary = fixtures_variant as Dictionary
	var fixture_variant: Variant = fixtures.get(normalized_fixture_id, {})
	if not (fixture_variant is Dictionary):
		return {
			"ok": false,
			"reason": "fixture_not_found",
			"fixtureId": normalized_fixture_id,
			"fixturePath": ORGANIZATION_LIFECYCLE_FIXTURE_PATH,
		}
	var fixture: Dictionary = fixture_variant as Dictionary
	var snapshot_variant: Variant = fixture.get("snapshot", {})
	if not (snapshot_variant is Dictionary):
		return {
			"ok": false,
			"reason": "fixture_snapshot_missing",
			"fixtureId": normalized_fixture_id,
			"fixturePath": ORGANIZATION_LIFECYCLE_FIXTURE_PATH,
		}
	var snapshot_payload: Dictionary = snapshot_variant as Dictionary
	var next_snapshot := _alliance_snapshot.duplicate(true)
	for key_variant in snapshot_payload.keys():
		var current_variant: Variant = next_snapshot.get(key_variant)
		var next_variant: Variant = snapshot_payload.get(key_variant)
		if current_variant is Dictionary and next_variant is Dictionary:
			next_snapshot[key_variant] = _merge_dictionary_recursive(current_variant as Dictionary, next_variant as Dictionary)
		else:
			next_snapshot[key_variant] = next_variant
	if snapshot_payload.has("nation_profile_draft") and not snapshot_payload.has("nation_profile_update_draft"):
		var draft_variant: Variant = next_snapshot.get("nation_profile_draft", {})
		if draft_variant is Dictionary:
			next_snapshot["nation_profile_update_draft"] = (draft_variant as Dictionary).duplicate(true)
	next_snapshot["organization_fixture_applied"] = true
	next_snapshot["organization_fixture_id"] = normalized_fixture_id
	next_snapshot["organization_fixture_source"] = ORGANIZATION_LIFECYCLE_FIXTURE_PATH
	next_snapshot["organization_fixture_mode"] = ORGANIZATION_LIFECYCLE_FIXTURE_MODE
	set_alliance_snapshot(next_snapshot)
	return {
		"ok": true,
		"reason": "organization_lifecycle_fixture_applied",
		"fixtureId": normalized_fixture_id,
		"fixturePath": ORGANIZATION_LIFECYCLE_FIXTURE_PATH,
		"organizationKind": _organization_kind(),
		"organizationLifecycleStage": _organization_lifecycle_stage(),
	}


func apply_nation_profile_visual_smoke_draft(draft_patch: Dictionary) -> Dictionary:
	var draft := _nation_profile_draft()
	var nation_name := str(draft_patch.get("nation_name", draft_patch.get("nationName", ""))).strip_edges()
	var color_hex := str(draft_patch.get("color_hex", draft_patch.get("colorHex", draft_patch.get("color", "")))).strip_edges().to_lower()
	var capital_tile_id := str(draft_patch.get("capital_tile_id", draft_patch.get("capitalTileId", ""))).strip_edges()
	var capital_name := str(draft_patch.get("capital_name", draft_patch.get("capitalName", ""))).strip_edges()
	if nation_name != "":
		draft["nation_name"] = nation_name
	if color_hex != "":
		draft["color_hex"] = color_hex
	if capital_tile_id != "":
		draft["capital_tile_id"] = capital_tile_id
	if capital_name != "":
		draft["capital_name"] = capital_name
	var options: Array = []
	var has_capital_option := false
	for option_variant in _nation_profile_draft_capital_options():
		if not (option_variant is Dictionary):
			continue
		var option: Dictionary = (option_variant as Dictionary).duplicate(true)
		var option_tile_id := str(option.get("tile_id", option.get("tileId", ""))).strip_edges()
		option["selected"] = option_tile_id != "" and option_tile_id == capital_tile_id
		if option_tile_id == capital_tile_id:
			has_capital_option = true
			if capital_name != "":
				option["name"] = capital_name
				option["label"] = capital_name
		options.append(option)
	if capital_tile_id != "" and not has_capital_option:
		options.insert(0, {
			"tile_id": capital_tile_id,
			"name": capital_name if capital_name != "" else "青石城",
			"label": capital_name if capital_name != "" else "青石城",
			"selected": true,
		})
	draft["capital_options"] = options
	draft["source_page"] = "governance/founding"
	draft["local_only"] = true
	draft["dirty"] = true
	_alliance_snapshot["nation_profile_draft"] = draft
	_alliance_snapshot["nation_profile_update_draft"] = draft.duplicate(true)
	_suppress_page_changed = true
	_rebuild_panel()
	_suppress_page_changed = false
	return {
		"ok": capital_tile_id != "" and _nation_profile_draft_capital_tile_id() == capital_tile_id,
		"reason": "nation_profile_visual_smoke_draft_applied",
		"capitalTileId": _nation_profile_draft_capital_tile_id(),
		"nationName": _nation_profile_draft_name(),
		"colorHex": _nation_profile_color_hex(),
	}


func _merge_dictionary_recursive(base: Dictionary, overlay: Dictionary) -> Dictionary:
	var result := base.duplicate(true)
	for key_variant in overlay.keys():
		var base_value: Variant = result.get(key_variant)
		var overlay_value: Variant = overlay.get(key_variant)
		if base_value is Dictionary and overlay_value is Dictionary:
			result[key_variant] = _merge_dictionary_recursive(base_value as Dictionary, overlay_value as Dictionary)
		else:
			result[key_variant] = overlay_value
	return result


func get_active_top_tab_id() -> String:
	return _current_top_tab_id


func get_active_page_id() -> String:
	return _compose_page_id(_current_top_tab_id, _get_current_section_id(_current_top_tab_id))


func get_mainline_visual_smoke_summary(page_id: String = "") -> Dictionary:
	var active_page_id := get_active_page_id()
	var requested_page_id := page_id.strip_edges()
	if requested_page_id == "":
		requested_page_id = active_page_id
	var active_scroll := _get_active_alliance_scroll()
	var has_scroll := active_scroll != null and is_instance_valid(active_scroll)
	var touch_input_mode := str(active_scroll.get_meta("touch_scroll_input_mode", "")) if has_scroll else ""
	var touch_scrollbar_visibility := str(active_scroll.get_meta("touch_scrollbar_visibility", "")) if has_scroll else ""
	var touch_drag_bound := bool(active_scroll.get_meta("touch_drag_handler_bound", false)) if has_scroll else false
	var hidden_scroll_mode := (
		has_scroll
		and active_scroll.horizontal_scroll_mode == ScrollContainer.SCROLL_MODE_SHOW_NEVER
		and active_scroll.vertical_scroll_mode == ScrollContainer.SCROLL_MODE_SHOW_NEVER
	)
	var active_section_payload := _resolve_section_payload(_current_top_tab_id, _get_current_section_id(_current_top_tab_id))
	var is_battle_report_page := active_page_id == "battle_reports/latest" or active_page_id == "battle_reports/detail"
	var battle_report_core_summary := _organization_battle_report_core_component_summary(active_section_payload)
	var nation_profile_name_edit := find_child("NationProfileNameEdit", true, false) as LineEdit
	var nation_profile_submit_button := find_child("NationProfileSubmitButton", true, false) as Button
	var nation_founding_failure_label := find_child("NationProfileFoundingFailureLabel", true, false) as Label
	var nation_profile_update_name_edit := find_child("NationProfileUpdateNameEdit", true, false) as LineEdit
	var nation_profile_update_name_button := find_child("NationProfileUpdateNameSubmitButton", true, false) as Button
	var nation_profile_update_color_button := find_child("NationProfileUpdateColorSubmitButton", true, false) as Button
	var nation_capital_migration_panel := find_child("OrganizationNationCapitalMigrationPanel", true, false) as Control
	var nation_capital_migration_option_button := find_child("NationProfileCapitalMigrationOptionButton", true, false) as OptionButton
	var nation_capital_migration_name_edit := find_child("NationProfileCapitalMigrationNameEdit", true, false) as LineEdit
	var nation_capital_migration_submit_button := find_child("NationProfileCapitalMigrationSubmitButton", true, false) as Button
	var nation_founding_entry := find_child("OrganizationNationFoundingEntry", true, false) as Control
	var nation_kingdom_entry := find_child("OrganizationNationKingdomFoundingEntry", true, false) as Control
	var nation_empire_entry := find_child("OrganizationNationEmpireFoundingEntry", true, false) as Control
	var nation_empire_submit_button := find_child("NationFoundEmpireActionButton", true, false) as Button
	var nation_founded_summary := find_child("OrganizationNationFoundedKingdomSummary", true, false) as Control
	var nation_current_color_preview := find_child("NationCurrentColorPreview", true, false) as Control
	var nation_profile_management_entry := find_child("OrganizationNationProfileManagementEntry", true, false) as Control
	var nation_profile_config_visible := nation_kingdom_entry != null and nation_kingdom_entry.visible and nation_kingdom_entry.is_visible_in_tree()
	var nation_profile_management_visible := nation_profile_management_entry != null and nation_profile_management_entry.visible and nation_profile_management_entry.is_visible_in_tree()
	var nation_capital_migration_visible := nation_capital_migration_panel != null and nation_capital_migration_panel.visible and nation_capital_migration_panel.is_visible_in_tree()
	var nation_founding_entry_visible := nation_founding_entry != null and nation_founding_entry.visible and nation_founding_entry.is_visible_in_tree()
	var nation_kingdom_entry_visible := nation_kingdom_entry != null and nation_kingdom_entry.visible and nation_kingdom_entry.is_visible_in_tree()
	var nation_empire_entry_visible := nation_empire_entry != null and nation_empire_entry.visible and nation_empire_entry.is_visible_in_tree()
	var nation_founded_summary_visible := nation_founded_summary != null and nation_founded_summary.visible and nation_founded_summary.is_visible_in_tree()
	var nation_current_color_preview_visible := nation_current_color_preview != null and nation_current_color_preview.visible and nation_current_color_preview.is_visible_in_tree()
	var nation_profile_submit_visible := nation_profile_submit_button != null and nation_profile_submit_button.visible and nation_profile_submit_button.is_visible_in_tree()
	var nation_founding_failure_visible := nation_founding_failure_label != null and nation_founding_failure_label.visible and nation_founding_failure_label.is_visible_in_tree()
	var nation_profile_update_name_submit_visible := nation_profile_update_name_button != null and nation_profile_update_name_button.visible and nation_profile_update_name_button.is_visible_in_tree()
	var nation_profile_update_color_submit_visible := nation_profile_update_color_button != null and nation_profile_update_color_button.visible and nation_profile_update_color_button.is_visible_in_tree()
	var nation_empire_submit_visible := nation_empire_submit_button != null and nation_empire_submit_button.visible and nation_empire_submit_button.is_visible_in_tree()
	var nation_profile_submit_enabled := (
		nation_profile_config_visible
		and nation_profile_submit_visible
		and not nation_profile_submit_button.disabled
	)
	var nation_profile_history_entries := _nation_profile_history_entries()
	var nation_profile_audit_entries := _nation_profile_audit_entries()
	var nation_war_objective_model := _nation_war_objective_read_model()
	var nation_midgame_skeleton := _nation_midgame_frontend_skeleton()
	var nation_midgame_player_ui := _nation_midgame_player_ui_copy()
	var nation_midgame_forbidden_copy_hits := _nation_midgame_forbidden_visible_copy_hits()
	var nation_midgame_route_cta_variant: Variant = nation_midgame_player_ui.get("objective_route_cta", {})
	var nation_midgame_route_cta: Dictionary = nation_midgame_route_cta_variant as Dictionary if nation_midgame_route_cta_variant is Dictionary else {}
	var nation_midgame_luoyang_button := find_child("NationMidgameLuoyangRouteButton", true, false) as Button
	var nation_midgame_luoyang_button_visible := nation_midgame_luoyang_button != null and nation_midgame_luoyang_button.visible and nation_midgame_luoyang_button.is_visible_in_tree()
	var nation_empire_objective := _nation_war_objective_by_id("empire_status")
	var latest_nation_profile_failure_code := _nation_profile_latest_rejection_failure_code()
	var nation_profile_color_conflict_visible := nation_profile_management_visible and (
		latest_nation_profile_failure_code == "nation_color_conflict"
		or latest_nation_profile_failure_code == "nation_capital_migration_color_conflict"
	)
	var home_art_entry_labels := _organization_home_art_entry_labels()
	var home_art_label_parts: PackedStringArray = PackedStringArray()
	if home_art_entry_labels != "":
		home_art_label_parts = home_art_entry_labels.split("/")
	var summary := {
		"ok": requested_page_id != "" and TOP_TAB_ORDER.size() > 0 and _count_alliance_sections() > 0 and has_scroll,
		"panelScript": str(get_script().resource_path) if get_script() != null else "",
		"activePageId": active_page_id,
		"requestedPageId": requested_page_id,
		"activeTopTabId": _current_top_tab_id,
		"organizationPanelChromeTitle": str(_host.panel_title) if _host != null else "",
		"allianceTopTabIds": _alliance_top_tab_ids(),
		"allianceMailTabPresent": TOP_TAB_ORDER.has("mail"),
		"allianceStandaloneMailBoundary": "mail_panel_v1_independent_mainline_overlay",
		"topTabCount": TOP_TAB_ORDER.size(),
		"sectionCount": _count_alliance_sections(),
		"allianceName": _snapshot_string("alliance_name", DEFAULT_ALLIANCE_NAME),
		"allianceThemeTokenSet": UI_COMPONENT_FACTORY.DESIGN_SYSTEM_ID,
		"alliancePageTokenState": active_page_id,
		"allianceFontScaleMode": UI_COMPONENT_FACTORY.DESIGN_TOKEN_VERSION,
		"allianceButtonScaleMode": UI_COMPONENT_FACTORY.DESIGN_TOKEN_VERSION,
		"allianceTouchScrollInputMode": touch_input_mode,
		"allianceTouchScrollbarVisibility": touch_scrollbar_visibility,
		"allianceTouchDragHandlerBound": touch_drag_bound,
		"allianceRootScrollMode": "hidden_scrollbar_touch_scroll" if hidden_scroll_mode else "legacy_scroll",
		"organizationPanelContract": ORGANIZATION_PANEL_CONTRACT,
		"organizationRouteMode": ORGANIZATION_ROUTE_MODE,
		"organizationKind": _organization_kind(),
		"organizationLifecycleStage": _organization_lifecycle_stage(),
		"organizationEntryLabelMode": ORGANIZATION_ENTRY_LABEL_MODE,
		"organizationReadModelSourceMode": ORGANIZATION_READ_MODEL_SOURCE_MODE,
		"organizationHomeVisualMode": ORGANIZATION_HOME_VISUAL_MODE,
		"organizationHomeDefaultRouteMode": ORGANIZATION_HOME_DEFAULT_ROUTE_MODE,
		"organizationHomeStatusMode": ORGANIZATION_HOME_STATUS_MODE,
		"organizationHomeHeroStageMode": ORGANIZATION_HOME_HERO_STAGE_MODE,
		"organizationHomeArtLayerMode": ORGANIZATION_HOME_ART_LAYER_MODE,
		"organizationHomeArtFitMode": ORGANIZATION_HOME_ART_FIT_MODE,
		"organizationHomeRealUiControlMode": ORGANIZATION_HOME_REAL_UI_CONTROL_MODE,
		"organizationHomeTopNavMode": ORGANIZATION_HOME_TOP_NAV_MODE,
		"organizationHomePrimaryFocusMode": ORGANIZATION_HOME_PRIMARY_FOCUS_MODE,
		"organizationHomeArtAssetPath": _organization_home_art_asset_path(),
		"organizationHomeAllianceArtAssetPath": ORGANIZATION_HOME_ALLIANCE_ART_ASSET_PATH,
		"organizationHomeNationArtAssetPath": ORGANIZATION_HOME_NATION_ART_ASSET_PATH,
		"organizationHomeArtTexturePresent": _organization_home_art_texture_available(_organization_home_art_asset_path()),
		"organizationHomeUsesFullPagePng": false,
		"organizationHomeRealControlOverlay": true,
		"organizationHomeNoticeFeedMode": ORGANIZATION_HOME_NOTICE_FEED_MODE,
		"organizationHomeStatusStatCount": _organization_home_status_stat_count(),
		"organizationHomeHeroNodePresent": true,
		"organizationHomeNoticeNodePresent": true,
		"organizationHomeEntryGroupMode": ORGANIZATION_HOME_ENTRY_GROUP_MODE,
		"organizationHomeEntryButtonToken": ORGANIZATION_HOME_ENTRY_BUTTON_TOKEN,
		"organizationHomeEntryLiveTextContract": ORGANIZATION_HOME_ENTRY_LIVE_TEXT_CONTRACT,
		"organizationHomeEntryButtonCount": _count_home_entry_buttons(),
		"organizationHomeEntryButtonLabels": _organization_home_entry_button_labels(),
		"organizationHomeEntryTargetPageIds": _organization_home_entry_target_page_ids(),
		"organizationHomeArtEntryLabels": home_art_entry_labels,
		"organizationHomeArtEntryRowCount": _organization_home_art_entry_row_count(),
		"organizationHomeArtEntryButtonCount": _organization_home_art_entry_button_count(),
		"allianceMemberCoordinateJumpButtonCount": _count_visible_named_buttons("AllianceMemberCoordinateJumpButton"),
		"allianceMemberCoordinateJumpButtonToken": UI_COMPONENT_FACTORY.battle_report_coordinate_jump_button_token(),
		"allianceMemberCoordinateJumpPayloadContract": UI_COMPONENT_FACTORY.battle_report_coordinate_jump_payload_contract(),
		"organizationHomeArtStretchMode": _organization_home_art_stretch_mode_label(),
		"organizationHomeArtNoCropFit": _organization_home_art_stretch_mode_label() == "keep_aspect" or _organization_home_art_stretch_mode_label() == "keep_aspect_centered",
		"organizationHomeNationEmblemVisible": _organization_home_nation_emblem_visible(),
		"organizationHomeNationEmblemText": _organization_home_nation_emblem_text(),
		"organizationHomeArtHasFoundingEntry": home_art_label_parts.has("立国") or home_art_label_parts.has("晋升"),
		"organizationHomeArtHasPromotionEntry": home_art_label_parts.has("晋升"),
		"organizationHomeArtHasPolicyBookEntry": home_art_label_parts.has("政策"),
		"organizationHomeArtHasPolicyEntry": home_art_label_parts.has("政策"),
		"organizationMailBoundary": "mail_panel_v1_independent_inbox_only",
		"organizationTopTabIds": _alliance_top_tab_ids(),
		"organizationLifecycleFixtureMode": _snapshot_string("organization_fixture_mode", ORGANIZATION_LIFECYCLE_FIXTURE_MODE),
		"organizationLifecycleFixtureApplied": _snapshot_bool("organization_fixture_applied", false),
		"organizationLifecycleFixtureId": _snapshot_string("organization_fixture_id", ""),
		"organizationLifecycleFixtureSource": _snapshot_string("organization_fixture_source", ORGANIZATION_LIFECYCLE_FIXTURE_PATH),
		"organizationTouchInputMode": ORGANIZATION_TOUCH_INPUT_MODE,
		"organizationMotionToken": ORGANIZATION_MOTION_TOKEN,
		"allianceFoundNationEntryMode": ALLIANCE_FOUND_NATION_ENTRY_MODE,
		"allianceFoundNationHiddenAfterNation": _organization_kind() == "nation",
		"organizationNationFoundingEntryVisible": nation_founding_entry_visible,
		"organizationNationKingdomFoundingEntryVisible": nation_kingdom_entry_visible,
		"organizationNationEmpireFoundingEntryVisible": nation_empire_entry_visible,
		"organizationNationEmpireSubmitButtonVisible": nation_empire_submit_visible,
		"organizationNationEmpireSubmitButtonDisabled": nation_empire_submit_button.disabled if nation_empire_submit_button != null else true,
		"organizationNationEmpireBackendSubmitMode": "enabled_authoritative_empire_upgrade_v1",
		"organizationNationEmpireActorCommanderId": "ally_west",
		"organizationNationWarObjectiveContractId": str(nation_war_objective_model.get("contractId", "")),
		"organizationNationEmpireObjectiveStatus": str(nation_empire_objective.get("status", "")),
		"organizationNationEmpireObjectiveAchieved": str(nation_empire_objective.get("status", "")) == "achieved",
		"organizationNationEmpireObjectiveSourceMode": "nation_war_objective_read_model_v1",
		"organizationNationMidgameFrontendContractId": str(nation_midgame_skeleton.get("contract_id", "")),
		"organizationNationMidgameFrontendSkeletonVisible": _active_content_block_node_names(active_section_payload, active_page_id).contains("NationMidgameFrontendSkeletonBlock"),
		"organizationNationMidgameObjectiveRowCount": int(nation_midgame_skeleton.get("objective_row_count", 0)),
		"organizationNationMidgameMembershipContractId": str(nation_midgame_skeleton.get("membership_contract_id", "")),
		"organizationNationMidgameMembershipAuthorityVisible": bool(nation_midgame_skeleton.get("membership_authority_visible", false)),
		"organizationNationMidgameStageChain": "/".join(_coerce_string_array(nation_midgame_skeleton.get("stage_chain", []))),
		"organizationNationMidgameCurrentStage": str(nation_midgame_skeleton.get("current_stage", "")),
		"organizationNationMidgamePlayerUiCopyContractId": str(nation_midgame_player_ui.get("contract_id", "")),
		"organizationNationMidgamePrimaryGoalText": str(nation_midgame_player_ui.get("primary_goal_text", "")),
		"organizationNationMidgamePrimaryGoalTextShortChinese": _nation_midgame_short_chinese_goal_text(str(nation_midgame_player_ui.get("primary_goal_text", ""))),
		"organizationNationMidgameForbiddenVisibleCopyHits": nation_midgame_forbidden_copy_hits,
		"organizationNationMidgameForbiddenVisibleCopyClear": nation_midgame_forbidden_copy_hits.is_empty(),
		"organizationNationMidgamePlayerStageCardCount": _nation_midgame_player_card_count("stage_cards"),
		"organizationNationMidgamePlayerMemberCardCount": _nation_midgame_player_card_count("member_cards"),
		"organizationNationMidgameVisiblePrimaryCardCount": _nation_midgame_visible_primary_card_count(),
		"organizationNationMidgameVisiblePrimaryCardLimit": 5,
		"organizationNationMidgameVisibleDensityOk": _nation_midgame_visible_primary_card_count() <= 5,
		"nationMidgameLuoyangRouteButtonVisible": nation_midgame_luoyang_button_visible,
		"nationMidgameLuoyangRouteButtonLabel": nation_midgame_luoyang_button.text if nation_midgame_luoyang_button != null else "",
		"nationMidgameLuoyangRouteActionId": str(nation_midgame_luoyang_button.get_meta("nation_midgame_route_action_id", "")) if nation_midgame_luoyang_button != null else "",
		"nationMidgameObjectiveRouteHeadline": str(nation_midgame_route_cta.get("headline", "")),
		"nationMidgameObjectiveRouteTargetLabel": str(nation_midgame_route_cta.get("target_label", "")),
		"nationMidgameObjectiveRouteTargetSurface": str(nation_midgame_route_cta.get("target_surface", "")),
		"nationMidgameObjectiveRouteTargetSubtitle": str(nation_midgame_route_cta.get("target_subtitle", "")),
		"nationMidgameObjectiveRouteButtonNodeName": str(nation_midgame_route_cta.get("button_node_name", "NationMidgameLuoyangRouteButton")),
		"nationMidgameObjectiveRouteStyleOwnerPanel": "AlliancePanel",
		"nationMidgameObjectiveRouteStyleOwnerPresenter": "AlliancePresenter",
		"nationMidgameRouteScope": NATION_MIDGAME_ROUTE_SCOPE,
		"organizationNationFoundedKingdomSummaryVisible": nation_founded_summary_visible,
		"organizationNationCurrentColorPreviewVisible": nation_current_color_preview_visible,
		"organizationNationPolicyBookSeparateFromFounding": active_page_id == "governance/founding" or active_page_id == "nation/policy",
		"nationProfileConfigEntryMode": NATION_PROFILE_CONFIG_ENTRY_MODE,
		"organizationNationProfileDraftMode": NATION_PROFILE_DRAFT_MODE,
		"organizationNationProfileDraftLocalOnly": true,
		"organizationNationProfileDraftDirty": _nation_profile_draft_dirty(),
		"organizationNationProfileBackendSubmitMode": NATION_PROFILE_BACKEND_SUBMIT_MODE,
		"organizationNationProfileBackendSubmitEnabled": nation_profile_submit_enabled,
		"organizationNationProfileConfigEntryVisible": nation_profile_config_visible,
		"organizationNationProfileConfigEntryPage": "governance/founding",
		"organizationNationNameDraft": _nation_profile_draft_name(),
		"organizationNationColorHex": _nation_profile_color_hex(),
		"organizationNationCapitalTileIdDraft": _nation_profile_draft_capital_tile_id(),
		"organizationNationCapitalNameDraft": _nation_profile_draft_capital_name(),
		"organizationNationCapitalOptionCount": _nation_profile_draft_capital_options().size(),
		"organizationNationFoundingCopyText": _organization_nation_founding_copy_text(),
		"organizationNationFoundingFailureCopyMode": NATION_FOUNDING_FAILURE_COPY_MODE,
		"organizationNationFoundingFailureText": _nation_profile_founding_failure_message(),
		"organizationNationFoundingFailureLabelText": nation_founding_failure_label.text.strip_edges() if nation_founding_failure_label != null else "",
		"organizationNationFoundingFailureVisible": nation_founding_failure_visible,
		"organizationNationColorConfigSource": "alliance_founding_button_entry",
		"organizationNationNameInputVisible": nation_profile_name_edit != null and nation_profile_name_edit.visible and nation_profile_name_edit.is_visible_in_tree(),
		"organizationNationColorSwatchCount": _count_visible_nation_profile_color_swatches(),
		"organizationNationProfileSubmitButtonVisible": nation_profile_submit_visible,
		"organizationNationProfileSubmitButtonDisabled": nation_profile_submit_button.disabled if nation_profile_submit_button != null else true,
		"organizationNationProfileValidationMessage": _nation_profile_draft_validation_message(),
		"organizationNationProfileManagementEntryVisible": nation_profile_management_visible,
		"organizationNationProfileUpdateNameDraft": _nation_profile_update_name(),
		"organizationNationProfileUpdateColorHex": _nation_profile_update_color_hex(),
		"organizationNationProfileUpdateNameInputVisible": nation_profile_update_name_edit != null and nation_profile_update_name_edit.visible and nation_profile_update_name_edit.is_visible_in_tree(),
		"organizationNationProfileUpdateColorSwatchCount": _count_visible_nation_profile_update_color_swatches(),
		"organizationNationProfileUpdateNameSubmitButtonVisible": nation_profile_update_name_submit_visible,
		"organizationNationProfileUpdateColorSubmitButtonVisible": nation_profile_update_color_submit_visible,
		"organizationNationProfileUpdateNameSubmitEnabled": nation_profile_management_visible and nation_profile_update_name_submit_visible and not nation_profile_update_name_button.disabled,
		"organizationNationProfileUpdateColorSubmitEnabled": nation_profile_management_visible and nation_profile_update_color_submit_visible and not nation_profile_update_color_button.disabled,
		"organizationNationProfileUpdateNameValidationMessage": _nation_profile_update_name_validation_message(),
		"organizationNationProfileUpdateColorValidationMessage": _nation_profile_update_color_validation_message(),
		"organizationNationProfileGovernanceVisible": nation_profile_management_visible,
		"organizationNationProfileLockedVisible": nation_profile_management_visible,
		"organizationNationCapitalTileId": _nation_profile_capital_tile_id(),
		"organizationNationCapitalName": _nation_profile_capital_name(),
		"organizationNationCapitalMigrationEntryVisible": nation_profile_management_visible,
		"organizationNationCapitalMigrationPanelVisible": nation_capital_migration_visible,
		"organizationNationCapitalMigrationOptionCount": nation_capital_migration_option_button.item_count if nation_capital_migration_option_button != null else 0,
		"organizationNationCapitalMigrationCapitalTileId": _nation_profile_migration_capital_tile_id(),
		"organizationNationCapitalMigrationCapitalName": _nation_profile_migration_capital_name(),
		"organizationNationCapitalMigrationNationName": _nation_profile_migration_name(),
		"organizationNationCapitalMigrationNameInputVisible": nation_capital_migration_name_edit != null and nation_capital_migration_name_edit.visible and nation_capital_migration_name_edit.is_visible_in_tree(),
		"organizationNationCapitalMigrationColorHex": _nation_profile_migration_color_hex(),
		"organizationNationCapitalMigrationColorSwatchCount": _count_visible_nation_profile_migration_color_swatches(),
		"organizationNationCapitalMigrationSubmitButtonVisible": nation_capital_migration_submit_button != null and nation_capital_migration_submit_button.visible and nation_capital_migration_submit_button.is_visible_in_tree(),
		"organizationNationCapitalMigrationSubmitButtonDisabled": nation_capital_migration_submit_button.disabled if nation_capital_migration_submit_button != null else true,
		"organizationNationCapitalMigrationCostText": _nation_profile_capital_migration_cost_text(),
		"organizationNationCapitalMigrationCooldownText": _nation_profile_rename_cooldown_text(),
		"organizationNationCapitalMigrationFailureText": _nation_profile_capital_migration_failure_message(),
		"organizationNationCapitalMigrationActorCommanderId": "ally_west",
		"organizationNationProfileLockText": _nation_profile_profile_lock_text(),
		"organizationNationRenameCooldownVisible": nation_profile_management_visible and _nation_profile_rename_cooldown_until() != "",
		"organizationNationRenameCooldownText": _nation_profile_rename_cooldown_text(),
		"organizationNationProfileHistoricalNameCount": nation_profile_history_entries.size(),
		"organizationNationProfileAuditLogCount": nation_profile_audit_entries.size(),
		"organizationNationProfileHistoryEntryVisible": nation_profile_management_visible and nation_profile_history_entries.size() > 0,
		"organizationNationProfileAuditLogEntryVisible": nation_profile_management_visible and nation_profile_audit_entries.size() > 0,
		"organizationNationProfileColorConflictVisible": nation_profile_color_conflict_visible,
		"organizationNationProfileLatestRejectionFailureCode": _nation_profile_latest_rejection_failure_code(),
		"organizationNationProfileLatestConflictNationName": _nation_profile_latest_conflict_nation_name(),
		"organizationNationProfileColorConflictText": _nation_profile_color_conflict_text(),
		"nationPolicyTreeMode": NATION_POLICY_TREE_MODE,
		"nationMarketVisibilityMode": NATION_MARKET_VISIBILITY_MODE,
		"organizationMemberGroupingMode": ORGANIZATION_MEMBER_GROUPING_MODE,
		"organizationOfficerPermissionMode": ORGANIZATION_OFFICER_PERMISSION_MODE,
		"organizationMemberTableMode": ORGANIZATION_MEMBER_TABLE_MODE,
		"organizationMemberRosterLayoutMode": ORGANIZATION_MEMBER_ROSTER_LAYOUT_MODE if active_page_id == "members/overview" else "",
		"organizationMemberRosterDuplicatePreview": false,
		"organizationSecondaryStageLayoutMode": _active_secondary_stage_layout_mode(active_page_id),
		"organizationSecondaryPageFactoryBoundary": _active_secondary_page_factory_boundary(active_page_id),
		"organizationSecondaryUsesDualColumnFactory": not (active_page_id == "members/overview" or _uses_bespoke_secondary_stage(active_page_id)),
		"organizationCorpsCardGridMode": ORGANIZATION_CORPS_CARD_GRID_MODE,
		"organizationOfficerHierarchyCanvasMode": ORGANIZATION_OFFICER_HIERARCHY_CANVAS_MODE,
		"organizationOfficerHierarchyZoomEnabled": active_page_id == "governance/officers",
		"organizationPolicyTreeCanvasMode": ORGANIZATION_POLICY_TREE_CANVAS_MODE,
		"organizationPolicyReadModelMode": ORGANIZATION_POLICY_READ_MODEL_MODE,
		"organizationPolicyTreeZoomEnabled": active_page_id == "nation/policy",
		"organizationDiplomacyBoardMode": ORGANIZATION_DIPLOMACY_BOARD_MODE,
		"organizationMarketCardGridMode": ORGANIZATION_MARKET_CARD_GRID_MODE,
		"organizationMarketSupplyReadModelMode": ORGANIZATION_MARKET_CARD_GRID_MODE,
		"organizationNationBuildingReadModelMode": ORGANIZATION_NATION_BUILDING_READ_MODEL_MODE,
		"organizationLogTimelineMode": ORGANIZATION_LOG_TIMELINE_MODE,
		"organizationLogFilterMode": ORGANIZATION_LOG_FILTER_MODE,
		"organizationBattleReportNavigationMode": ORGANIZATION_BATTLE_REPORT_NAVIGATION_MODE,
		"organizationBattleReportListMode": ORGANIZATION_BATTLE_REPORT_LIST_MODE,
		"organizationBattleReportDetailMode": ORGANIZATION_BATTLE_REPORT_DETAIL_MODE,
		"organizationBattleReportReuseSourceMode": ORGANIZATION_BATTLE_REPORT_REUSE_SOURCE_MODE,
		"organizationBattleReportFilterMode": ORGANIZATION_BATTLE_REPORT_FILTER_MODE,
		"organizationBattleReportSourceFilterMode": ORGANIZATION_BATTLE_REPORT_SOURCE_FILTER_MODE,
		"organizationBattleReportEmbeddedChromeMode": ORGANIZATION_BATTLE_REPORT_EMBEDDED_CHROME_MODE,
		"battleReportRealDataSourceMode": BATTLE_REPORT_REAL_DATA_SOURCE_MODE,
		"battleReportOwnerScopeMode": BATTLE_REPORT_OWNER_SCOPE_MODE,
		"battleReportAiOwnerAttributionMode": BATTLE_REPORT_AI_OWNER_ATTRIBUTION_MODE,
		"battleReportOrganizationSourceFilterMode": ORGANIZATION_BATTLE_REPORT_SOURCE_FILTER_MODE,
		"battleReportRawWorldReportCount": _snapshot_int("battle_report_raw_world_report_count", _snapshot_int("report_count", 0)),
		"battleReportRawBattleRecordCount": _snapshot_int("battle_report_raw_battle_record_count", 0),
		"battleReportUsesSyntheticPreviewAsRealData": false,
		"organizationBattleReportOrgDashboardHeaderHidden": is_battle_report_page,
		"organizationBattleReportVisibleExtraFilterStrip": false if is_battle_report_page else true,
		"organizationBattleReportListSummaryHidden": is_battle_report_page,
		"organizationBattleReportListSharedStateHidden": is_battle_report_page,
		"organizationBattleReportListUtilityRailHidden": false,
		"organizationBackButtonRouteMode": "panel_internal_back_then_world_close_v1",
		"organizationCloseButtonRouteMode": "close_to_main_world_v1",
		"organizationActiveSecondaryStructureMode": _active_secondary_structure_mode(active_page_id),
		"organizationSecondaryVisualMode": ORGANIZATION_SECONDARY_VISUAL_MODE,
		"organizationSecondaryCardStyleMode": ORGANIZATION_SECONDARY_CARD_STYLE_MODE,
		"organizationSecondarySummaryMode": ORGANIZATION_SECONDARY_SUMMARY_MODE,
		"organizationSecondaryGeneratedBackgroundMode": ORGANIZATION_SECONDARY_GENERATED_BG_MODE,
		"organizationSecondaryBackgroundFitMode": ORGANIZATION_SECONDARY_BG_FIT_MODE,
		"organizationSecondaryRealUiOverlayMode": ORGANIZATION_SECONDARY_REAL_UI_OVERLAY_MODE,
		"organizationSecondaryBackgroundAssetPath": _organization_secondary_background_asset_path(_current_top_tab_id, _get_current_section_id(_current_top_tab_id)),
		"organizationSecondaryBackgroundTexturePresent": _organization_home_art_texture_available(_organization_secondary_background_asset_path(_current_top_tab_id, _get_current_section_id(_current_top_tab_id))),
		"organizationSecondaryUsesFullPagePng": false,
		"organizationSecondaryRealControlOverlay": true,
		"organizationSecondaryUsesLegacyTextWall": false,
		"organizationActivePageTableBlockCount": _count_content_block_kind(active_section_payload, "table_block"),
		"organizationActivePageCardGridBlockCount": _count_content_block_kind(active_section_payload, "card_grid"),
		"organizationActivePageRelationBoardBlockCount": _count_content_block_kind(active_section_payload, "relation_board"),
		"organizationActivePageTimelineCardBlockCount": _count_content_block_kind(active_section_payload, "timeline_cards"),
		"organizationActivePageMarketSupplyBlockCount": _count_content_block_kind(active_section_payload, "market_supply"),
		"organizationActivePageBuildingReadModelBlockCount": _count_content_block_kind(active_section_payload, "building_grid"),
		"organizationActivePageHierarchyCanvasBlockCount": _count_content_block_kind(active_section_payload, "hierarchy_canvas"),
		"organizationActivePagePolicyTreeCanvasBlockCount": _count_content_block_kind(active_section_payload, "policy_tree_canvas"),
		"organizationActivePageBattleReportListBlockCount": _count_content_block_kind(active_section_payload, "battle_report_list"),
		"organizationActivePageBattleReportDetailBlockCount": 1 if active_page_id == "battle_reports/detail" else 0,
		"organizationActiveContentBlockNodeNames": _active_content_block_node_names(active_section_payload, active_page_id),
		"organizationDiplomacyRelationMode": ORGANIZATION_DIPLOMACY_RELATION_MODE,
		"organizationLogMode": ORGANIZATION_LOG_MODE,
		"organizationBattleReportMode": ORGANIZATION_BATTLE_REPORT_MODE,
	}
	for key_variant in battle_report_core_summary.keys():
		summary[key_variant] = battle_report_core_summary.get(key_variant)
	UI_COMPONENT_FACTORY.apply_design_system_summary(summary, "alliance_shell", "preview_read_model_shell", false)
	UI_COMPONENT_FACTORY.apply_snapshot_edge_motion_summary(summary)
	return summary


func _organization_battle_report_core_component_summary(active_section_payload: Dictionary = {}) -> Dictionary:
	var list_page := find_child("OrganizationBattleReportListPage", true, false)
	if list_page != null and list_page.has_method("get_mainline_visual_smoke_list_summary"):
		var result_variant: Variant = list_page.call("get_mainline_visual_smoke_list_summary")
		if result_variant is Dictionary:
			return result_variant as Dictionary
	var detail_page := find_child("OrganizationBattleReportDetailPage", true, false)
	if detail_page != null and detail_page.has_method("get_mainline_visual_smoke_detail_summary"):
		var detail_variant: Variant = detail_page.call("get_mainline_visual_smoke_detail_summary")
		if detail_variant is Dictionary:
			var detail_summary: Dictionary = (detail_variant as Dictionary).duplicate(true)
			UI_COMPONENT_FACTORY.apply_battle_report_shell_summary(detail_summary)
			var contracts := _build_organization_battle_report_contracts(active_section_payload)
			var entry_contracts: Array = contracts.get("entry_contracts", []) as Array
			detail_summary["battleReportListSummaryVisible"] = false
			detail_summary["battleReportListSharedStateVisible"] = false
			detail_summary["battleReportListSharedStateChipCount"] = 0
			detail_summary["battleReportListEntryCount"] = entry_contracts.size()
			detail_summary["battleReportListUtilityRailVisible"] = false
			detail_summary["battleReportSearchButtonVisible"] = false
			return detail_summary
	return {
		"battleReportListSummaryVisible": false,
		"battleReportListSharedStateVisible": false,
		"battleReportListSharedStateChipCount": 0,
		"battleReportListEntryCount": 0,
		"battleReportListUtilityRailVisible": false,
	}

func _count_visible_nation_profile_color_swatches() -> int:
	var count := 0
	for node in find_children("NationProfileColorSwatch_*", "Button", true, false):
		if node is Button and (node as Button).visible and (node as Button).is_visible_in_tree():
			count += 1
	return count


func _count_visible_nation_profile_update_color_swatches() -> int:
	var count := 0
	for node in find_children("NationProfileUpdateColorSwatch_*", "Button", true, false):
		if node is Button and (node as Button).visible and (node as Button).is_visible_in_tree():
			count += 1
	return count


func _count_visible_nation_profile_migration_color_swatches() -> int:
	var count := 0
	for node in find_children("NationProfileCapitalMigrationColorSwatch_*", "Button", true, false):
		if node is Button and (node as Button).visible and (node as Button).is_visible_in_tree():
			count += 1
	return count


func _count_visible_named_buttons(button_name: String) -> int:
	var count := 0
	for node in find_children(button_name, "Button", true, false):
		if node is Button and (node as Button).visible and (node as Button).is_visible_in_tree():
			count += 1
	return count


func _alliance_top_tab_ids() -> String:
	var ids: Array[String] = []
	for tab_id_variant in TOP_TAB_ORDER:
		var tab_id := str(tab_id_variant).strip_edges()
		if tab_id != "":
			ids.append(tab_id)
	return "/".join(ids)


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
	var sections: Array = tab_def.get("sections", []) as Array
	if sections.is_empty():
		return
	var section_ids: Array = []
	for raw_section in sections:
		var section: Dictionary = raw_section if raw_section is Dictionary else {}
		var current_section_id := str(section.get("id", "")).strip_edges()
		if not current_section_id.is_empty():
			section_ids.append(current_section_id)
	if not section_ids.has(section_id):
		return
	_current_section_by_tab[top_tab_id] = section_id
	var state: Dictionary = _ensure_tab_view(top_tab_id)
	var section_strip = state.get("section_strip")
	if section_strip != null:
		section_strip.set_active_tab(section_id)
	_render_section_content(top_tab_id, section_id)
	_emit_page_changed(_compose_page_id(top_tab_id, section_id))


func _bind_host_signals() -> void:
	if _host == null:
		push_error("[alliance-panel] host is missing.")
		return
	if not _host.back_requested.is_connected(Callable(self, "_on_host_back_requested")):
		_host.back_requested.connect(Callable(self, "_on_host_back_requested"))
	if not _host.close_requested.is_connected(Callable(self, "_on_host_close_requested")):
		_host.close_requested.connect(Callable(self, "_on_host_close_requested"))
	if not _host.tab_selected.is_connected(Callable(self, "_on_host_tab_selected")):
		_host.tab_selected.connect(Callable(self, "_on_host_tab_selected"))


func _rebuild_panel() -> void:
	_tab_views.clear()
	var preserved_top_tab := _current_top_tab_id if not _current_top_tab_id.is_empty() else DEFAULT_TOP_TAB_ID
	_host.set_panel_title(_panel_title_for_page(_compose_page_id(preserved_top_tab, _get_current_section_id(preserved_top_tab))))
	_host.set_back_button_label("返回")
	_host.set_close_button_label("关闭")
	_host.set_empty_state_text("请选择一个组织功能入口。")
	_host.set_title_font_size(28)
	_host.set_empty_state_font_size(15)
	_host.set_content_frame_transparent(true)
	_host.set_content_margins(0, 0, 0, 0)
	_host.set_tab_settings([])
	_select_top_tab(preserved_top_tab)


func _build_top_tab_settings() -> Array:
	var tab_settings: Array = []
	for tab_id in TOP_TAB_ORDER:
		var tab_def: Dictionary = _get_tab_def(tab_id)
		if tab_def.is_empty():
			continue
		if tab_id == "nation" and _organization_kind() != "nation" and not _snapshot_bool("found_nation_visible", false):
			continue
		var label := str(tab_def.get("label", tab_id))
		if tab_id == "nation":
			label = "国家" if _organization_kind() == "nation" else "立国"
		tab_settings.append({
			"id": tab_id,
			"label": label,
			"tooltip": str(tab_def.get("summary_title", "")),
			"tab_text_size": 16,
			"tab_min_height": 52,
		})
	return tab_settings


func _select_top_tab(tab_id: String) -> void:
	var tab_def: Dictionary = _get_tab_def(tab_id)
	if tab_def.is_empty():
		return
	_current_top_tab_id = tab_id
	_host.set_active_tab(tab_id)
	_host.set_content_node(_ensure_tab_view(tab_id).get("root") as Node)
	_emit_page_changed(_compose_page_id(tab_id, _get_current_section_id(tab_id)))


func _ensure_tab_view(tab_id: String) -> Dictionary:
	if _tab_views.has(tab_id):
		return _tab_views[tab_id]
	var tab_def: Dictionary = _get_tab_def(tab_id)
	if tab_def.is_empty():
		return {}

	var root := ScrollContainer.new()
	root.name = "AllianceTabRoot_%s" % tab_id
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.mouse_filter = Control.MOUSE_FILTER_PASS
	UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(root)

	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 12)
	root.add_child(root_vbox)

	if tab_id != "overview" and not _uses_custom_secondary_shell(tab_id):
		root_vbox.add_child(_build_summary_card(tab_id))

	var section_strip: Control = null
	if tab_id != "overview" and not _uses_custom_secondary_shell(tab_id):
		section_strip = _build_section_strip(tab_id)
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


func _build_summary_card(tab_id: String) -> Control:
	var tab_def: Dictionary = _get_tab_def(tab_id)
	var alliance_name := _snapshot_string("alliance_name", DEFAULT_ALLIANCE_NAME)
	var member_count := _snapshot_int("member_count", 24)
	var territory_count := _snapshot_int("territory_count", 3)
	var goal_count := _snapshot_int("goal_count", 2)
	var commander_count := _snapshot_int("commander_count", 0)
	var recent_action_count := _snapshot_int("recent_action_count", 0)
	var report_count := _snapshot_int("report_count", 0)
	var card := _make_home_panel(Color(0.055, 0.034, 0.020, 0.50), Color(0.74, 0.52, 0.24, 0.48))
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.custom_minimum_size = Vector2(0, 92)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 16)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_right", 16)
	margin.add_theme_constant_override("margin_bottom", 12)

	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 14)
	row.add_child(_build_summary_seal(str(tab_def.get("label", "同盟"))))

	var vbox := VBoxContainer.new()
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.add_theme_constant_override("separation", 5)
	row.add_child(vbox)

	var title := _make_label("%s · %s" % [alliance_name, str(tab_def.get("label", "同盟"))], 20)
	title.add_theme_color_override("font_color", Color(1.0, 0.92, 0.72, 0.98))
	vbox.add_child(title)
	var stat_line := "成员 %d | 城池 %d | 指挥 %d | 战报 %d" % [member_count, territory_count, commander_count, report_count]
	if recent_action_count > 0:
		stat_line = "%s | 行动 %d" % [stat_line, recent_action_count]
	vbox.add_child(_make_label(stat_line, 14))
	var summary_lines := _resolve_tab_summary_lines(tab_id, tab_def)
	var summary_limit := mini(1, summary_lines.size())
	for index in range(summary_limit):
		vbox.add_child(_make_label(str(summary_lines[index]), 13, true))
	var current_section_id := str(_current_section_by_tab.get(tab_id, _get_default_section_id(tab_id)))
	var section_hint := _make_label(_format_section_hint(tab_id, current_section_id), 12, true)
	section_hint.add_theme_color_override("font_color", Color(0.84, 0.73, 0.58, 0.80))
	vbox.add_child(section_hint)

	margin.add_child(row)
	card.add_child(margin)
	return card


func _build_section_strip(tab_id: String) -> Control:
	var section_strip = PANEL_TAB_STRIP_SCENE.instantiate()
	section_strip.empty_state_text = "暂无同盟切项"
	section_strip.tab_button_min_width = 100.0
	section_strip.tab_button_text_size = 13
	section_strip.set_tab_settings(_build_section_tab_settings(tab_id))
	var section_callback := Callable(self, "_on_section_tab_selected").bind(tab_id)
	if not section_strip.tab_selected.is_connected(section_callback):
		section_strip.tab_selected.connect(section_callback)
	return section_strip


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
			"enabled": bool(section.get("enabled", true)),
			"tab_text_size": 14,
			"tab_min_height": 44,
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
		section_view = _make_label("等待同盟切项加载。", 14, true)
	if section_view is Control:
		var section_control := section_view as Control
		section_control.set_anchors_preset(Control.PRESET_FULL_RECT)
		section_control.offset_left = 0.0
		section_control.offset_top = 0.0
		section_control.offset_right = 0.0
		section_control.offset_bottom = 0.0
		section_control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		section_control.size_flags_vertical = Control.SIZE_EXPAND_FILL
	resolved_section_host.add_child(section_view)
	UI_COMPONENT_FACTORY.apply_motion_snapshot_edge_page_enter(section_view, 1)


func _build_section_view(tab_id: String, section_id: String) -> Control:
	if tab_id == "overview" and section_id == "home":
		return _build_organization_home_view()
	var section_def: Dictionary = _resolve_section_payload(tab_id, section_id)
	if section_def.is_empty():
		return _make_label("暂无可用切项。", 14, true)
	var page_id := _compose_page_id(tab_id, section_id)
	if tab_id == "members" and section_id == "overview":
		return _build_member_roster_stage_view(_build_child_page_payload(tab_id, section_id, section_def))
	if page_id == "governance/officers":
		return _build_officer_hierarchy_stage_view(_build_child_page_payload(tab_id, section_id, section_def))
	if page_id == "nation/policy":
		return _build_policy_tree_stage_view(_build_child_page_payload(tab_id, section_id, section_def))
	if page_id == "battle_reports/latest":
		return _build_organization_battle_report_stage_view(_build_child_page_payload(tab_id, section_id, section_def))
	if page_id == "battle_reports/detail":
		return _build_organization_battle_report_detail_stage_view(_build_child_page_payload(tab_id, section_id, section_def))
	if _uses_bespoke_secondary_stage(page_id):
		return _build_secondary_single_stage_view(
			_build_child_page_payload(tab_id, section_id, section_def),
			tab_id,
			section_id
		)
	return CHILD_PAGE_BLOCK_FACTORY_SCRIPT.new().build_section_page(
		_build_child_page_payload(tab_id, section_id, section_def),
		Callable(self, "_on_action_button_pressed")
	)

func _build_organization_home_view() -> Control:
	var root := Control.new()
	root.name = "OrganizationOverviewHomeSummaryBlock"
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.custom_minimum_size = Vector2(0, HOME_MIN_VISUAL_HEIGHT)
	var stage := _build_home_hall_visual_board()
	_fill_parent_rect(stage)
	root.add_child(stage)
	return root


func _build_member_roster_stage_view(section_payload: Dictionary) -> Control:
	var stage := Control.new()
	stage.name = "OrganizationMemberSingleRosterStage"
	stage.custom_minimum_size = Vector2(0, 650)
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stage.clip_contents = true

	var art := TextureRect.new()
	art.name = "OrganizationMemberRosterBackground"
	art.texture = _load_home_texture(ORGANIZATION_SECONDARY_MEMBERS_BG_ASSET_PATH)
	art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	art.modulate = Color(1.0, 0.96, 0.88, 0.94)
	art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fill_parent_rect(art)
	stage.add_child(art)

	var shade := ColorRect.new()
	shade.name = "OrganizationMemberRosterReadabilityLayer"
	shade.color = Color(0.018, 0.012, 0.008, 0.36)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fill_parent_rect(shade)
	stage.add_child(shade)

	var overlay := MarginContainer.new()
	overlay.name = "OrganizationMemberRosterRealUiOverlay"
	overlay.add_theme_constant_override("margin_left", 26)
	overlay.add_theme_constant_override("margin_top", 24)
	overlay.add_theme_constant_override("margin_right", 26)
	overlay.add_theme_constant_override("margin_bottom", 24)
	_fill_parent_rect(overlay)
	stage.add_child(overlay)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 14)
	overlay.add_child(column)

	column.add_child(_build_member_roster_header(section_payload))
	column.add_child(_build_member_roster_table_panel(section_payload))

	var sync_layers := func() -> void:
		_sync_home_art_layer_rect(stage, [art, shade, overlay])
	stage.resized.connect(sync_layers)
	sync_layers.call()
	return stage


func _build_secondary_single_stage_view(section_payload: Dictionary, tab_id: String, section_id: String) -> Control:
	var page_id := _compose_page_id(tab_id, section_id)
	var stage := Control.new()
	stage.name = _secondary_stage_node_name(page_id)
	stage.custom_minimum_size = Vector2(0, 650)
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stage.clip_contents = true

	var art := TextureRect.new()
	art.name = "OrganizationSecondaryStageBackground"
	art.texture = _load_home_texture(_organization_secondary_background_asset_path(tab_id, section_id))
	art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	art.modulate = _secondary_stage_art_modulate(page_id)
	art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fill_parent_rect(art)
	stage.add_child(art)

	var shade := ColorRect.new()
	shade.name = "OrganizationSecondaryStageReadabilityLayer"
	shade.color = Color(0.020, 0.014, 0.010, 0.34)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fill_parent_rect(shade)
	stage.add_child(shade)

	var overlay := MarginContainer.new()
	overlay.name = "OrganizationSecondaryStageRealUiOverlay"
	overlay.add_theme_constant_override("margin_left", 26)
	overlay.add_theme_constant_override("margin_top", 24)
	overlay.add_theme_constant_override("margin_right", 26)
	overlay.add_theme_constant_override("margin_bottom", 24)
	_fill_parent_rect(overlay)
	stage.add_child(overlay)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 14)
	overlay.add_child(column)

	column.add_child(_build_secondary_stage_header(section_payload, page_id))
	column.add_child(_build_secondary_stage_content(section_payload, page_id))

	var sync_layers := func() -> void:
		_sync_home_art_layer_rect(stage, [art, shade, overlay])
	stage.resized.connect(sync_layers)
	sync_layers.call()
	return stage


func _build_secondary_stage_header(section_payload: Dictionary, page_id: String) -> Control:
	var header := _make_home_panel(Color(0.034, 0.022, 0.014, 0.52), Color(0.86, 0.60, 0.26, 0.42))
	header.name = "OrganizationSecondaryStageHeader"
	header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.custom_minimum_size = Vector2(0, 104)

	var margin := UI_COMPONENT_FACTORY.make_margin(18, 14, 18, 14)
	header.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 14)
	margin.add_child(row)

	row.add_child(_build_summary_seal(_secondary_page_seal(page_id)))
	var title_column := VBoxContainer.new()
	title_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_column.add_theme_constant_override("separation", 5)
	row.add_child(title_column)

	var title := _make_label("%s · %s" % [_snapshot_string("alliance_name", DEFAULT_ALLIANCE_NAME), _secondary_page_title(section_payload, page_id)], 24, true)
	title.add_theme_color_override("font_color", Color(1.0, 0.92, 0.72, 0.98))
	title_column.add_child(title)
	title_column.add_child(_make_label(_secondary_page_stat_line(page_id), 14, true))
	var summary_lines := _coerce_string_array(section_payload.get("summary_lines", []))
	if not summary_lines.is_empty():
		var hint := _make_label(str(summary_lines[0]), 13, true)
		hint.add_theme_color_override("font_color", Color(0.84, 0.76, 0.60, 0.90))
		title_column.add_child(hint)

	var phase_chip := _build_secondary_stage_phase_chip(page_id)
	row.add_child(phase_chip)
	return header


func _build_secondary_stage_content(section_payload: Dictionary, page_id: String) -> Control:
	var panel := _make_home_panel(Color(0.026, 0.017, 0.011, 0.56), Color(0.82, 0.56, 0.24, 0.50))
	panel.name = "OrganizationSecondarySingleStageContent"
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 500)

	var margin := UI_COMPONENT_FACTORY.make_margin(16, 16, 16, 16)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 12)
	margin.add_child(column)

	var block := _secondary_primary_content_block(section_payload, page_id)
	var kind := str(block.get("kind", "")).strip_edges()
	if kind == "relation_board":
		column.add_child(_build_diplomacy_relation_board(block, section_payload, page_id))
	elif kind == "timeline_cards":
		column.add_child(_build_organization_log_timeline_board(block, section_payload, page_id))
	elif kind == "market_supply":
		column.add_child(_build_market_supply_board(block, section_payload, page_id))
	elif kind == "building_grid":
		column.add_child(_build_nation_building_board(block, section_payload, page_id))
	elif kind == "table_block":
		column.add_child(_build_secondary_stage_relation_cards(block, page_id))
	else:
		column.add_child(_build_secondary_stage_card_grid(block, section_payload, page_id))
	if page_id == "nation/midgame":
		column.add_child(_build_nation_midgame_luoyang_route_button())
	var edge_note := _secondary_stage_edge_note(section_payload)
	if edge_note != "":
		var note := _make_label(edge_note, 12, true)
		note.add_theme_color_override("font_color", Color(0.82, 0.74, 0.60, 0.84))
		column.add_child(note)
	return panel


func _build_secondary_stage_card_grid(block_payload: Dictionary, section_payload: Dictionary, page_id: String) -> Control:
	if page_id == "governance/founding":
		return _build_nation_founding_stage(block_payload, section_payload)
	var grid := GridContainer.new()
	grid.name = "OrganizationSecondarySingleStageCardGrid"
	grid.columns = _secondary_stage_grid_columns(block_payload, page_id)
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 14)
	grid.add_theme_constant_override("v_separation", 14)
	var cards := _secondary_stage_cards(block_payload, section_payload)
	if cards.is_empty():
		grid.add_child(_build_secondary_stage_empty_card("暂无组织内容", "组织内容暂未送达。", page_id))
		return grid
	for card_variant in cards:
		if card_variant is Dictionary:
			grid.add_child(_build_secondary_stage_card(card_variant as Dictionary, page_id))
	return grid


func _build_nation_founding_stage(_block_payload: Dictionary, _section_payload: Dictionary) -> Control:
	var column := VBoxContainer.new()
	column.name = "OrganizationNationFoundingEntry"
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 14)
	if _organization_kind() == "nation":
		column.add_child(_build_current_kingdom_summary_entry())
		column.add_child(_build_nation_profile_management_entry())
		column.add_child(_build_empire_foundation_entry(true))
	else:
		column.add_child(_build_nation_profile_config_entry())
	return column


func _build_nation_profile_config_entry() -> Control:
	var panel := _make_home_panel(Color(0.050, 0.034, 0.024, 0.72), Color(0.92, 0.52, 0.30, 0.66))
	panel.name = "OrganizationNationKingdomFoundingEntry"
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	panel.custom_minimum_size = Vector2(0, 270)

	var margin := UI_COMPONENT_FACTORY.make_margin(22, 18, 22, 18)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 12)
	margin.add_child(column)

	var title := _make_label("立国", 28, true)
	title.add_theme_color_override("font_color", Color(1.0, 0.91, 0.68, 0.98))
	column.add_child(title)

	var organization_level := _snapshot_int("organization_level", 1)
	var commandery_count := _snapshot_int("owned_commandery_count", _snapshot_int("territory_count", 0))
	var requirement_label := _make_label("等级 %s/20    郡 %s/1" % [str(organization_level), str(commandery_count)], 18, true)
	requirement_label.add_theme_color_override("font_color", Color(0.96, 0.86, 0.62, 0.96))
	column.add_child(requirement_label)

	var capital_label := _make_label("选择都城", 18, true)
	capital_label.name = "NationProfileCapitalDraftLabel"
	capital_label.add_theme_color_override("font_color", Color(0.92, 0.84, 0.68, 0.96))
	column.add_child(capital_label)

	var capital_options := _nation_profile_draft_capital_options()
	if not capital_options.is_empty():
		column.add_child(_build_nation_capital_selector(capital_options))
	else:
		var capital_empty := _make_label("暂无可选郡城", 18, true)
		capital_empty.add_theme_color_override("font_color", Color(1.0, 0.70, 0.48, 0.90))
		column.add_child(capital_empty)

	var name_edit := LineEdit.new()
	name_edit.name = "NationProfileNameEdit"
	name_edit.text = _nation_profile_draft_name()
	name_edit.placeholder_text = "国号"
	name_edit.custom_minimum_size = Vector2(0, 54)
	name_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_edit.add_theme_font_size_override("font_size", 20)
	name_edit.text_changed.connect(func(next_text: String) -> void:
		var draft := _nation_profile_draft()
		draft["nation_name"] = next_text.strip_edges()
		draft["source_page"] = "governance/founding"
		draft["local_only"] = true
		draft["dirty"] = true
		_alliance_snapshot["nation_profile_draft"] = draft
		_refresh_nation_profile_submit_state()
	)
	column.add_child(name_edit)

	var color_row := HFlowContainer.new()
	color_row.name = "NationProfileColorSwatchFlow"
	color_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	color_row.add_theme_constant_override("h_separation", 10)
	color_row.add_theme_constant_override("v_separation", 8)
	column.add_child(color_row)
	for option in _nation_profile_color_options():
		if not (option is Dictionary):
			continue
		var swatch: Dictionary = option as Dictionary
		var color_hex := str(swatch.get("hex", "#c95f32")).strip_edges()
		var button := Button.new()
		button.name = "NationProfileColorSwatch_%s" % color_hex.replace("#", "")
		button.text = "选" if color_hex.to_lower() == _nation_profile_color_hex().to_lower() else ""
		button.tooltip_text = "势力色"
		button.custom_minimum_size = Vector2(66, 46)
		button.add_theme_font_size_override("font_size", 18)
		var swatch_color: Color = swatch.get("color", Color(0.79, 0.37, 0.20)) as Color
		button.add_theme_stylebox_override("normal", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(swatch_color.r, swatch_color.g, swatch_color.b, 0.90), Color(1.0, 0.90, 0.74, 0.72), 1, 4, 0.12))
		button.add_theme_stylebox_override("hover", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(swatch_color.r, swatch_color.g, swatch_color.b, 0.98), Color(1.0, 0.96, 0.84, 0.96), 1, 5, 0.16))
		button.pressed.connect(func() -> void:
			var draft := _nation_profile_draft()
			draft["color_hex"] = color_hex
			draft["source_page"] = "governance/founding"
			draft["local_only"] = true
			draft["dirty"] = true
			_alliance_snapshot["nation_profile_draft"] = draft
			_refresh_nation_profile_submit_state()
		)
		color_row.add_child(button)

	var founding_failure_text := _nation_profile_founding_failure_message()
	if founding_failure_text != "":
		var failure_label := _make_label(founding_failure_text, 22, true)
		failure_label.name = "NationProfileFoundingFailureLabel"
		failure_label.custom_minimum_size = Vector2(0, 54)
		failure_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		failure_label.add_theme_color_override("font_color", Color(1.0, 0.72, 0.46, 0.98))
		column.add_child(failure_label)

	var submit_button := Button.new()
	submit_button.name = "NationProfileSubmitButton"
	submit_button.text = "立国"
	submit_button.custom_minimum_size = Vector2(168, 54)
	submit_button.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	_apply_organization_paper_command_button_style(submit_button, false, true)
	submit_button.disabled = not _nation_profile_draft_submit_enabled()
	submit_button.tooltip_text = _nation_profile_draft_validation_message()
	submit_button.pressed.connect(func() -> void:
		_on_action_button_pressed("found_nation_submit")
	)
	column.add_child(submit_button)
	return panel


func _build_nation_capital_selector(capital_options: Array) -> Control:
	var selector := OptionButton.new()
	selector.name = "NationProfileCapitalOptionButton"
	selector.custom_minimum_size = Vector2(0, 54)
	selector.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	selector.add_theme_font_size_override("font_size", 20)
	var selected_tile_id := _nation_profile_draft_capital_tile_id()
	var selected_index := 0
	for index in range(capital_options.size()):
		var option_variant: Variant = capital_options[index]
		if not (option_variant is Dictionary):
			continue
		var option: Dictionary = option_variant as Dictionary
		var tile_id := str(option.get("tile_id", option.get("tileId", ""))).strip_edges()
		var name := str(option.get("name", option.get("label", "郡城"))).strip_edges()
		selector.add_item(name if name != "" else "郡城")
		selector.set_item_metadata(selector.item_count - 1, {
			"tile_id": tile_id,
			"name": name,
		})
		if bool(option.get("selected", false)) or tile_id == selected_tile_id:
			selected_index = selector.item_count - 1
	if selector.item_count > 0:
		selector.select(selected_index)
		var selected_meta_variant: Variant = selector.get_item_metadata(selected_index)
		if selected_meta_variant is Dictionary:
			var selected_meta: Dictionary = selected_meta_variant as Dictionary
			var draft := _nation_profile_draft()
			draft["capital_tile_id"] = str(selected_meta.get("tile_id", "")).strip_edges()
			draft["capital_name"] = str(selected_meta.get("name", "")).strip_edges()
			draft["source_page"] = "governance/founding"
			draft["local_only"] = true
			_alliance_snapshot["nation_profile_draft"] = draft
	selector.item_selected.connect(func(index: int) -> void:
		var meta_variant: Variant = selector.get_item_metadata(index)
		if not (meta_variant is Dictionary):
			return
		var meta: Dictionary = meta_variant as Dictionary
		var draft := _nation_profile_draft()
		draft["capital_tile_id"] = str(meta.get("tile_id", "")).strip_edges()
		draft["capital_name"] = str(meta.get("name", "")).strip_edges()
		draft["source_page"] = "governance/founding"
		draft["local_only"] = true
		draft["dirty"] = true
		_alliance_snapshot["nation_profile_draft"] = draft
		_refresh_nation_profile_submit_state()
	)
	return selector


func _build_current_kingdom_summary_entry() -> Control:
	var panel := _make_home_panel(Color(0.042, 0.052, 0.040, 0.78), Color(0.45, 0.82, 0.62, 0.68))
	panel.name = "OrganizationNationFoundedKingdomSummary"
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 188)

	var margin := UI_COMPONENT_FACTORY.make_margin(14, 14, 14, 14)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)

	var title := _make_label("%s已立" % _lifecycle_label(), 20, true)
	title.add_theme_color_override("font_color", Color(0.86, 1.0, 0.86, 0.98))
	column.add_child(title)
	var note := _make_label("国号、都城和势力色已锁定；后续调整走迁都治理。", 13, true)
	note.add_theme_color_override("font_color", Color(0.82, 0.92, 0.78, 0.92))
	column.add_child(note)

	var grid := GridContainer.new()
	grid.name = "NationFoundedKingdomInfoGrid"
	grid.columns = 3
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 10)
	grid.add_theme_constant_override("v_separation", 10)
	column.add_child(grid)
	grid.add_child(_build_nation_profile_readonly_row("国号", _nation_profile_update_name()))
	grid.add_child(_build_nation_profile_readonly_row("都城", _nation_profile_capital_name()))
	grid.add_child(_build_nation_current_color_row())
	return panel


func _build_nation_current_color_row() -> Control:
	var panel := _make_home_panel(Color(0.020, 0.032, 0.028, 0.62), Color(0.40, 0.82, 0.66, 0.34))
	panel.name = "NationCurrentColorPreview"
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 58)
	var margin := UI_COMPONENT_FACTORY.make_margin(10, 6, 10, 6)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)
	margin.add_child(row)
	var labels := VBoxContainer.new()
	labels.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	labels.add_theme_constant_override("separation", 1)
	row.add_child(labels)
	var title_label := _make_label("势力色", 11, true)
	title_label.add_theme_color_override("font_color", Color(0.70, 0.86, 0.74, 0.86))
	labels.add_child(title_label)
	var value_label := _make_label("已选定", 15, true)
	value_label.add_theme_color_override("font_color", Color(0.90, 1.0, 0.88, 0.98))
	labels.add_child(value_label)
	var swatch_color := _nation_profile_color_from_hex(_nation_profile_update_color_hex())
	var swatch := _make_home_panel(Color(swatch_color.r, swatch_color.g, swatch_color.b, 0.96), Color(1.0, 0.92, 0.72, 0.90))
	swatch.name = "NationCurrentColorSwatch"
	swatch.custom_minimum_size = Vector2(72, 40)
	row.add_child(swatch)
	return panel


func _build_empire_foundation_entry(after_kingdom: bool) -> Control:
	var panel := _make_home_panel(Color(0.050, 0.034, 0.024, 0.70), Color(0.92, 0.66, 0.30, 0.62))
	panel.name = "OrganizationNationEmpireFoundingEntry"
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 170)
	var margin := UI_COMPONENT_FACTORY.make_margin(14, 14, 14, 14)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)
	var title := _make_label("晋升帝国", 20, true)
	title.add_theme_color_override("font_color", Color(1.0, 0.91, 0.68, 0.98))
	column.add_child(title)
	var intro := "王国满足州治、郡城和玉符条件后，可晋升帝国。" if after_kingdom else "先立国成为王国后开放。"
	var intro_label := _make_label(intro, 13, true)
	intro_label.add_theme_color_override("font_color", Color(0.92, 0.84, 0.68, 0.94))
	column.add_child(intro_label)
	for line in _filtered_empire_requirement_lines().slice(0, 4):
		column.add_child(_make_label(str(line), 13, true))
	var latest_failure_code := _nation_profile_latest_rejection_failure_code()
	if latest_failure_code.begins_with("nation_empire_"):
		var rejection_label := _make_label(_nation_profile_latest_rejection_message(), 12, true)
		rejection_label.name = "NationEmpireLatestRejectionLabel"
		rejection_label.add_theme_color_override("font_color", Color(1.0, 0.70, 0.48, 0.96))
		column.add_child(rejection_label)
	var button := Button.new()
	button.name = "NationFoundEmpireActionButton"
	button.text = "晋升"
	button.custom_minimum_size = Vector2(132, 38)
	_apply_organization_paper_command_button_style(button, true, true)
	button.disabled = not after_kingdom
	button.tooltip_text = "提交后校验官员权限、帝国条件和玉符费用。" if after_kingdom else "先立国成为王国后开放。"
	if after_kingdom:
		button.pressed.connect(func() -> void:
			_on_action_button_pressed("empire_upgrade_submit")
		)
	column.add_child(button)
	return panel

func _build_nation_profile_management_entry() -> Control:
	var panel := _make_home_panel(Color(0.038, 0.046, 0.040, 0.74), Color(0.36, 0.78, 0.62, 0.66))
	panel.name = "OrganizationNationProfileManagementEntry"
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	panel.custom_minimum_size = Vector2(0, 260)

	var margin := UI_COMPONENT_FACTORY.make_margin(18, 16, 18, 16)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 12)
	margin.add_child(column)

	var title := _make_label("国家档案", 24, true)
	title.add_theme_color_override("font_color", Color(0.82, 1.0, 0.86, 0.98))
	column.add_child(title)
	column.add_child(_build_nation_profile_governance_hint_strip())

	column.add_child(_build_nation_profile_locked_profile_block())

	var migration_button := Button.new()
	migration_button.name = "NationProfileCapitalMigrationEntryButton"
	migration_button.text = "迁都"
	migration_button.custom_minimum_size = Vector2(180, 56)
	migration_button.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	_apply_organization_paper_command_button_style(migration_button, false, true)
	migration_button.tooltip_text = "打开迁都二级面板，重选都城、国号和势力色。"
	migration_button.disabled = _organization_kind() != "nation"
	migration_button.pressed.connect(func() -> void:
		_open_nation_profile_migration_panel()
	)
	column.add_child(migration_button)

	if _nation_profile_migration_panel_open():
		column.add_child(_build_nation_profile_capital_migration_panel())
	return panel


func _build_nation_profile_capital_migration_panel() -> Control:
	var panel := _make_home_panel(Color(0.034, 0.030, 0.024, 0.82), Color(0.86, 0.60, 0.30, 0.62))
	panel.name = "OrganizationNationCapitalMigrationPanel"
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	panel.custom_minimum_size = Vector2(0, 330)
	var margin := UI_COMPONENT_FACTORY.make_margin(18, 16, 18, 16)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 12)
	margin.add_child(column)

	var header := HBoxContainer.new()
	header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_theme_constant_override("separation", 10)
	column.add_child(header)
	var title := _make_label("迁都", 24, true)
	title.add_theme_color_override("font_color", Color(1.0, 0.90, 0.66, 0.98))
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)
	var close_button := Button.new()
	close_button.name = "NationProfileCapitalMigrationCollapseButton"
	close_button.text = "收起"
	close_button.custom_minimum_size = Vector2(96, 44)
	close_button.add_theme_font_size_override("font_size", 18)
	close_button.pressed.connect(func() -> void:
		_close_nation_profile_migration_panel()
	)
	header.add_child(close_button)

	var meta_line := _make_label("费用 %s    %s" % [_nation_profile_capital_migration_cost_text(), _nation_profile_rename_cooldown_text()], 16, true)
	meta_line.name = "NationProfileCapitalMigrationMetaLabel"
	meta_line.add_theme_color_override("font_color", Color(0.90, 0.84, 0.68, 0.92))
	column.add_child(meta_line)

	var capital_label := _make_label("新都城", 18, true)
	capital_label.name = "NationProfileCapitalMigrationCapitalLabel"
	capital_label.add_theme_color_override("font_color", Color(0.92, 0.84, 0.68, 0.96))
	column.add_child(capital_label)
	var capital_options := _nation_profile_migration_capital_options()
	if not capital_options.is_empty():
		column.add_child(_build_nation_profile_migration_capital_selector(capital_options))
	else:
		var empty_label := _make_label("暂无可迁都的己方郡城", 18, true)
		empty_label.add_theme_color_override("font_color", Color(1.0, 0.70, 0.48, 0.94))
		column.add_child(empty_label)

	var name_edit := LineEdit.new()
	name_edit.name = "NationProfileCapitalMigrationNameEdit"
	name_edit.text = _nation_profile_migration_name()
	name_edit.placeholder_text = "国号"
	name_edit.custom_minimum_size = Vector2(0, 54)
	name_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_edit.add_theme_font_size_override("font_size", 20)
	name_edit.text_changed.connect(func(next_text: String) -> void:
		var draft := _nation_profile_migration_draft()
		draft["nation_name"] = next_text.strip_edges()
		draft["dirty"] = true
		_alliance_snapshot["nation_profile_capital_migration_draft"] = draft
		_refresh_nation_profile_migration_submit_state()
	)
	column.add_child(name_edit)

	var color_row := HFlowContainer.new()
	color_row.name = "NationProfileCapitalMigrationColorSwatchFlow"
	color_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	color_row.add_theme_constant_override("h_separation", 10)
	color_row.add_theme_constant_override("v_separation", 8)
	column.add_child(color_row)
	for option in _nation_profile_color_options():
		if not (option is Dictionary):
			continue
		var swatch: Dictionary = option as Dictionary
		var color_hex := str(swatch.get("hex", "#c95f32")).strip_edges()
		var button := Button.new()
		button.name = "NationProfileCapitalMigrationColorSwatch_%s" % color_hex.replace("#", "")
		button.text = "选" if color_hex.to_lower() == _nation_profile_migration_color_hex().to_lower() else ""
		button.tooltip_text = "势力色"
		button.custom_minimum_size = Vector2(66, 46)
		button.add_theme_font_size_override("font_size", 18)
		var swatch_color: Color = swatch.get("color", Color(0.79, 0.37, 0.20)) as Color
		button.add_theme_stylebox_override("normal", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(swatch_color.r, swatch_color.g, swatch_color.b, 0.90), Color(1.0, 0.90, 0.74, 0.72), 1, 4, 0.12))
		button.add_theme_stylebox_override("hover", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(swatch_color.r, swatch_color.g, swatch_color.b, 0.98), Color(1.0, 0.96, 0.84, 0.96), 1, 5, 0.16))
		button.pressed.connect(func() -> void:
			var draft := _nation_profile_migration_draft()
			draft["color_hex"] = color_hex
			draft["dirty"] = true
			_alliance_snapshot["nation_profile_capital_migration_draft"] = draft
			_refresh_nation_profile_migration_submit_state()
		)
		color_row.add_child(button)

	var footer := HBoxContainer.new()
	footer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	footer.add_theme_constant_override("separation", 10)
	column.add_child(footer)
	var failure_label := _make_label(_nation_profile_capital_migration_failure_message(), 12, true)
	failure_label.name = "NationProfileCapitalMigrationFailureLabel"
	failure_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	failure_label.add_theme_font_size_override("font_size", 16)
	failure_label.add_theme_color_override("font_color", Color(1.0, 0.70, 0.48, 0.96))
	footer.add_child(failure_label)
	var submit_button := Button.new()
	submit_button.name = "NationProfileCapitalMigrationSubmitButton"
	submit_button.text = "提交迁都"
	submit_button.custom_minimum_size = Vector2(160, 54)
	_apply_organization_paper_command_button_style(submit_button, false, true)
	submit_button.disabled = not _nation_profile_migration_submit_enabled()
	submit_button.tooltip_text = _nation_profile_migration_validation_message()
	submit_button.pressed.connect(func() -> void:
		_on_action_button_pressed("nation_capital_migration_submit")
	)
	footer.add_child(submit_button)
	return panel


func _build_nation_profile_migration_capital_selector(capital_options: Array) -> Control:
	var selector := OptionButton.new()
	selector.name = "NationProfileCapitalMigrationOptionButton"
	selector.custom_minimum_size = Vector2(0, 54)
	selector.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	selector.add_theme_font_size_override("font_size", 20)
	var selected_tile_id := _nation_profile_migration_capital_tile_id()
	var current_capital_tile_id := _nation_profile_capital_tile_id()
	var selected_index := 0
	for index in range(capital_options.size()):
		var option_variant: Variant = capital_options[index]
		if not (option_variant is Dictionary):
			continue
		var option: Dictionary = option_variant as Dictionary
		var tile_id := str(option.get("tile_id", option.get("tileId", ""))).strip_edges()
		var name := str(option.get("name", option.get("label", "郡城"))).strip_edges()
		var suffix := "当前都城" if tile_id == current_capital_tile_id else "可迁都"
		var label := "%s · %s" % [name if name != "" else "郡城", suffix]
		selector.add_item(label)
		selector.set_item_metadata(selector.item_count - 1, {
			"tile_id": tile_id,
			"name": name,
		})
		if tile_id == selected_tile_id:
			selected_index = selector.item_count - 1
	if selector.item_count > 0:
		selector.select(selected_index)
		var selected_meta_variant: Variant = selector.get_item_metadata(selected_index)
		if selected_meta_variant is Dictionary:
			_store_nation_profile_migration_capital(selected_meta_variant as Dictionary, false)
	selector.item_selected.connect(func(index: int) -> void:
		var meta_variant: Variant = selector.get_item_metadata(index)
		if not (meta_variant is Dictionary):
			return
		_store_nation_profile_migration_capital(meta_variant as Dictionary, true)
		_refresh_nation_profile_migration_submit_state()
	)
	return selector


func _build_nation_profile_locked_profile_block() -> Control:
	var grid := GridContainer.new()
	grid.name = "NationProfileLockedProfileBlock"
	grid.columns = 2
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	grid.add_child(_build_nation_profile_readonly_row("国号", _nation_profile_update_name()))
	grid.add_child(_build_nation_profile_readonly_row("都城", _nation_profile_capital_name()))
	grid.add_child(_build_nation_profile_readonly_color_row("势力色", _nation_profile_update_color_hex()))
	grid.add_child(_build_nation_profile_readonly_row("档案", _nation_profile_profile_lock_text()))
	return grid


func _build_nation_profile_readonly_row(title: String, value: String) -> Control:
	var panel := _make_home_panel(Color(0.020, 0.032, 0.028, 0.62), Color(0.40, 0.82, 0.66, 0.34))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 64)
	var margin := UI_COMPONENT_FACTORY.make_margin(12, 8, 12, 8)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 2)
	margin.add_child(column)
	var title_label := _make_label(title, 13, true)
	title_label.add_theme_color_override("font_color", Color(0.70, 0.86, 0.74, 0.86))
	column.add_child(title_label)
	var value_label := _make_label(value if value.strip_edges() != "" else "未设定", 18, true)
	value_label.add_theme_color_override("font_color", Color(0.90, 1.0, 0.88, 0.98))
	column.add_child(value_label)
	return panel


func _build_nation_profile_readonly_color_row(title: String, color_hex: String) -> Control:
	var panel := _make_home_panel(Color(0.020, 0.032, 0.028, 0.62), Color(0.40, 0.82, 0.66, 0.34))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 64)
	var margin := UI_COMPONENT_FACTORY.make_margin(12, 8, 12, 8)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 4)
	margin.add_child(column)
	var title_label := _make_label(title, 13, true)
	title_label.add_theme_color_override("font_color", Color(0.70, 0.86, 0.74, 0.86))
	column.add_child(title_label)
	var swatch := ColorRect.new()
	swatch.name = "NationProfileCurrentColorPreview"
	swatch.custom_minimum_size = Vector2(96, 24)
	swatch.color = _nation_profile_color_from_hex(color_hex)
	column.add_child(swatch)
	return panel


func _build_nation_profile_governance_hint_strip() -> Control:
	var panel := _make_home_panel(Color(0.018, 0.030, 0.026, 0.68), Color(0.38, 0.78, 0.64, 0.40))
	panel.name = "NationProfileGovernanceHintStrip"
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := UI_COMPONENT_FACTORY.make_margin(12, 10, 12, 10)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 6)
	margin.add_child(column)

	var row := HFlowContainer.new()
	row.name = "NationProfileGovernanceHintFlow"
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("h_separation", 8)
	row.add_theme_constant_override("v_separation", 6)
	column.add_child(row)

	var history_count := _nation_profile_history_entries().size()
	var audit_count := _nation_profile_audit_entries().size()
	row.add_child(_build_nation_profile_governance_button("NationProfileRenameCooldownEntryButton", "改名冷却", _nation_profile_rename_cooldown_text(), "国号再次变更的冷却状态"))
	row.add_child(_build_nation_profile_governance_button("NationProfileColorConflictEntryButton", "颜色占用", _nation_profile_color_conflict_text(), "最近一次势力色冲突提示"))
	row.add_child(_build_nation_profile_governance_button("NationProfileHistoryEntryButton", "历史国号", "%s 条" % str(history_count), _format_nation_profile_history_preview()))
	row.add_child(_build_nation_profile_governance_button("NationProfileAuditLogEntryButton", "审计记录", "%s 条" % str(audit_count), _format_nation_profile_audit_preview()))
	return panel


func _build_nation_profile_governance_button(node_name: String, title: String, value: String, tooltip: String) -> Button:
	var button := Button.new()
	button.name = node_name
	button.text = "%s\n%s" % [title, value]
	button.tooltip_text = tooltip
	button.custom_minimum_size = Vector2(156, 58)
	button.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	button.add_theme_font_size_override("font_size", 15)
	button.add_theme_color_override("font_color", Color(0.88, 1.0, 0.90, 0.98))
	button.add_theme_stylebox_override("normal", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(0.035, 0.052, 0.044, 0.84), Color(0.40, 0.82, 0.66, 0.46), 1, 4, 0.10))
	button.add_theme_stylebox_override("hover", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(0.055, 0.078, 0.066, 0.96), Color(0.56, 0.92, 0.74, 0.74), 1, 4, 0.12))
	return button


func _nation_profile_color_options() -> Array:
	return [
		{"hex": "#c95f32", "color": Color(0.79, 0.37, 0.20)},
		{"hex": "#3f7fbf", "color": Color(0.25, 0.50, 0.75)},
		{"hex": "#6b9f45", "color": Color(0.42, 0.62, 0.27)},
		{"hex": "#b4933e", "color": Color(0.71, 0.58, 0.24)},
	]


func _nation_profile_color_from_hex(color_hex: String) -> Color:
	var normalized := color_hex.strip_edges().to_lower()
	for option in _nation_profile_color_options():
		if not (option is Dictionary):
			continue
		var swatch: Dictionary = option as Dictionary
		if str(swatch.get("hex", "")).strip_edges().to_lower() == normalized:
			return swatch.get("color", Color(0.79, 0.37, 0.20)) as Color
	return Color(0.79, 0.37, 0.20)


func _build_secondary_stage_card(card_payload: Dictionary, page_id: String) -> Control:
	var panel := _make_home_panel(Color(0.058, 0.036, 0.020, 0.62), _secondary_page_accent_color(page_id, 0.50))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var is_nation_midgame := page_id == "nation/midgame"
	panel.custom_minimum_size = Vector2(0, 170 if is_nation_midgame else 148)

	var margin := UI_COMPONENT_FACTORY.make_margin(18, 18, 18, 18) if is_nation_midgame else UI_COMPONENT_FACTORY.make_margin(12, 12, 12, 12)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 18 if is_nation_midgame else 12)
	margin.add_child(row)

	row.add_child(_build_summary_seal(str(card_payload.get("title", _secondary_page_seal(page_id)))))
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10 if is_nation_midgame else 5)
	row.add_child(column)

	var title := _make_label(str(card_payload.get("title", "待展开")), 24 if is_nation_midgame else 18, true)
	title.add_theme_color_override("font_color", Color(1.0, 0.91, 0.68, 0.98))
	column.add_child(title)
	var value := _make_label(str(card_payload.get("value", "")), 30 if is_nation_midgame else 22, true)
	value.add_theme_color_override("font_color", Color(1.0, 0.72, 0.28, 0.98))
	column.add_child(value)
	if is_nation_midgame:
		return panel
	var meta := str(card_payload.get("meta", "")).strip_edges()
	if meta != "":
		var meta_label := _make_label(meta, 13, true)
		meta_label.add_theme_color_override("font_color", Color(0.78, 0.88, 0.72, 0.92))
		column.add_child(meta_label)
	var description := str(card_payload.get("description", "")).strip_edges()
	if description != "":
		var desc_label := _make_label(description, 12, true)
		desc_label.add_theme_color_override("font_color", Color(0.84, 0.78, 0.66, 0.90))
		column.add_child(desc_label)
	return panel


func _build_secondary_stage_empty_card(title: String, line: String, page_id: String) -> Control:
	return _build_secondary_stage_card({
		"title": title,
		"value": _secondary_page_title({}, page_id),
		"meta": "待展开",
		"description": line,
	}, page_id)


func _build_diplomacy_relation_board(block_payload: Dictionary, section_payload: Dictionary, page_id: String) -> Control:
	var panel := _make_home_panel(Color(0.030, 0.020, 0.014, 0.60), _secondary_page_accent_color(page_id, 0.48))
	panel.name = str(block_payload.get("node_name", "OrganizationDiplomacyRelationBoardBlock"))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 500)

	var margin := UI_COMPONENT_FACTORY.make_margin(14, 14, 14, 14)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 12)
	margin.add_child(column)

	column.add_child(_build_stage_filter_strip(_stage_payload_array(block_payload, ["filters", "filter_chips"]), ["全部", "友好", "敌对", "中立"]))
	column.add_child(_build_relation_count_row(block_payload))

	var grid := GridContainer.new()
	grid.name = "OrganizationDiplomacyRelationCardGrid"
	grid.columns = 2
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 14)
	grid.add_theme_constant_override("v_separation", 14)
	column.add_child(grid)

	var columns := _secondary_stage_table_columns(block_payload)
	var rows := _stage_payload_array(block_payload, ["rows", "relations"])
	if rows.is_empty():
		grid.add_child(_build_secondary_stage_empty_card("暂无外交", "当前没有正式关系记录。", page_id))
		return panel
	for row_variant in rows:
		if row_variant is Dictionary:
			grid.add_child(_build_secondary_stage_relation_card(row_variant as Dictionary, columns, page_id))
	return panel


func _build_organization_log_timeline_board(block_payload: Dictionary, section_payload: Dictionary, page_id: String) -> Control:
	var panel := _make_home_panel(Color(0.030, 0.018, 0.012, 0.60), _secondary_page_accent_color(page_id, 0.48))
	panel.name = str(block_payload.get("node_name", "OrganizationLogFilterTimelineBlock"))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 500)

	var margin := UI_COMPONENT_FACTORY.make_margin(14, 14, 14, 14)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 12)
	margin.add_child(column)

	column.add_child(_build_stage_filter_strip(_stage_payload_array(block_payload, ["filters", "filter_chips"]), ["全部", "成员", "官员", "外交", "战报"]))
	var rows := _stage_payload_array(block_payload, ["rows", "entries", "logs"])
	if rows.is_empty():
		column.add_child(_build_secondary_stage_empty_card("暂无组织日志", "组织日志暂未送达。", page_id))
		return panel
	for row_variant in rows:
		if row_variant is Dictionary:
			column.add_child(_build_log_timeline_card(row_variant as Dictionary, page_id))
	return panel


func _build_market_supply_board(block_payload: Dictionary, section_payload: Dictionary, page_id: String) -> Control:
	var panel := _make_home_panel(Color(0.032, 0.022, 0.014, 0.60), _secondary_page_accent_color(page_id, 0.50))
	panel.name = str(block_payload.get("node_name", "OrganizationMarketSupplyCardGridBlock"))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 500)

	var margin := UI_COMPONENT_FACTORY.make_margin(14, 14, 14, 14)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 12)
	margin.add_child(column)

	column.add_child(_build_stage_filter_strip(_stage_payload_array(block_payload, ["categories", "filters"]), ["全部", "资源", "军需", "限购"]))
	var currency_line := str(block_payload.get("currency_line", "")).strip_edges()
	if currency_line != "":
		var currency_label := _make_label(currency_line, 14, true)
		currency_label.add_theme_color_override("font_color", Color(1.0, 0.86, 0.58, 0.94))
		column.add_child(currency_label)
	column.add_child(_build_secondary_stage_card_grid(block_payload, section_payload, page_id))
	return panel


func _build_nation_building_board(block_payload: Dictionary, section_payload: Dictionary, page_id: String) -> Control:
	var panel := _make_home_panel(Color(0.030, 0.020, 0.014, 0.60), _secondary_page_accent_color(page_id, 0.50))
	panel.name = str(block_payload.get("node_name", "OrganizationNationBuildingReadModelBlock"))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 500)

	var margin := UI_COMPONENT_FACTORY.make_margin(14, 14, 14, 14)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 12)
	margin.add_child(column)

	column.add_child(_build_stage_filter_strip(_stage_payload_array(block_payload, ["filters", "categories"]), ["全部", "治理", "府库", "军务", "营造"]))
	column.add_child(_build_secondary_stage_card_grid(block_payload, section_payload, page_id))
	return panel


func _build_relation_count_row(block_payload: Dictionary) -> Control:
	var row := HBoxContainer.new()
	row.name = "OrganizationDiplomacyRelationCountRow"
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)
	var counts: Dictionary = block_payload.get("relation_counts", {}) as Dictionary
	row.add_child(_build_stage_count_chip("友好", str(int(counts.get("friendly", 0))), Color(0.28, 0.54, 0.78, 0.82)))
	row.add_child(_build_stage_count_chip("敌对", str(int(counts.get("hostile", 0))), Color(0.82, 0.26, 0.18, 0.82)))
	row.add_child(_build_stage_count_chip("中立", str(int(counts.get("neutral", 0))), Color(0.82, 0.60, 0.24, 0.72)))
	return row


func _build_stage_filter_strip(filters: Array, fallback_labels: Array) -> Control:
	var row := HBoxContainer.new()
	row.name = "OrganizationSecondaryFilterStrip"
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 8)
	var consumed := false
	for filter_variant in filters:
		if filter_variant is Dictionary:
			var filter_payload := filter_variant as Dictionary
			row.add_child(_build_stage_filter_chip(str(filter_payload.get("label", filter_payload.get("title", "筛选"))), str(filter_payload.get("value", "")), bool(filter_payload.get("active", false))))
			consumed = true
		elif str(filter_variant).strip_edges() != "":
			row.add_child(_build_stage_filter_chip(str(filter_variant), "", false))
			consumed = true
	if not consumed:
		for label_variant in fallback_labels:
			row.add_child(_build_stage_filter_chip(str(label_variant), "", false))
	return row


func _build_stage_filter_chip(label_text: String, value_text: String, active: bool) -> Control:
	var accent := _resolve_relation_accent(label_text)
	var panel := _make_home_panel(
		Color(0.120, 0.075, 0.036, 0.78) if active else Color(0.044, 0.030, 0.020, 0.66),
		accent if active else Color(accent.r, accent.g, accent.b, 0.38)
	)
	panel.custom_minimum_size = Vector2(116, 42)
	var margin := UI_COMPONENT_FACTORY.make_margin(10, 6, 10, 6)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 0)
	margin.add_child(column)
	var label := _make_label(label_text, 14, true)
	label.add_theme_color_override("font_color", Color(1.0, 0.90, 0.68, 0.96))
	column.add_child(label)
	if value_text != "":
		var value := _make_label(value_text, 12, true)
		value.add_theme_color_override("font_color", Color(0.84, 0.78, 0.66, 0.88))
		column.add_child(value)
	return panel


func _build_stage_count_chip(title: String, value: String, accent: Color) -> Control:
	var panel := _make_home_panel(Color(0.050, 0.032, 0.020, 0.68), accent)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 58)
	var margin := UI_COMPONENT_FACTORY.make_margin(12, 8, 12, 8)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 1)
	margin.add_child(column)
	var title_label := _make_label(title, 12, true)
	title_label.add_theme_color_override("font_color", Color(0.86, 0.78, 0.62, 0.90))
	column.add_child(title_label)
	var value_label := _make_label(value, 22, true)
	value_label.add_theme_color_override("font_color", Color(1.0, 0.76, 0.34, 0.98))
	column.add_child(value_label)
	return panel


func _build_log_timeline_card(row_payload: Dictionary, page_id: String) -> Control:
	var panel := _make_home_panel(Color(0.052, 0.034, 0.020, 0.62), _secondary_page_accent_color(page_id, 0.42))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 82)
	var margin := UI_COMPONENT_FACTORY.make_margin(12, 9, 12, 9)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 12)
	margin.add_child(row)
	row.add_child(_build_summary_seal(str(row_payload.get("type", "志"))))
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 3)
	row.add_child(column)
	var event_label := _make_label(str(row_payload.get("event", row_payload.get("title", "组织日志"))), 17, true)
	event_label.add_theme_color_override("font_color", Color(1.0, 0.92, 0.72, 0.98))
	column.add_child(event_label)
	var meta_label := _make_label("%s · %s · %s" % [str(row_payload.get("time", "--")), str(row_payload.get("type", "记录")), str(row_payload.get("actor", "组织"))], 12, true)
	meta_label.add_theme_color_override("font_color", Color(0.78, 0.88, 0.72, 0.92))
	column.add_child(meta_label)
	var detail := str(row_payload.get("detail", row_payload.get("description", ""))).strip_edges()
	if detail != "":
		var detail_label := _make_label(detail, 12, true)
		detail_label.add_theme_color_override("font_color", Color(0.84, 0.78, 0.66, 0.90))
		column.add_child(detail_label)
	return panel


func _stage_payload_array(block_payload: Dictionary, keys: Array) -> Array:
	for key_variant in keys:
		var key := str(key_variant).strip_edges()
		if key == "":
			continue
		var value: Variant = block_payload.get(key, [])
		if value is Array and not (value as Array).is_empty():
			return value as Array
	return []


func _build_secondary_stage_relation_cards(block_payload: Dictionary, page_id: String) -> Control:
	var grid := GridContainer.new()
	grid.name = "OrganizationSecondarySingleStageRelationCards"
	grid.columns = 2
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 14)
	grid.add_theme_constant_override("v_separation", 14)

	var columns := _secondary_stage_table_columns(block_payload)
	var rows := _secondary_stage_table_rows(block_payload)
	if rows.is_empty():
		grid.add_child(_build_secondary_stage_empty_card("暂无外交", "当前没有正式关系记录。", page_id))
		return grid
	for row_variant in rows:
		if row_variant is Dictionary:
			grid.add_child(_build_secondary_stage_relation_card(row_variant as Dictionary, columns, page_id))
	return grid


func _build_secondary_stage_relation_card(row_payload: Dictionary, columns: Array, page_id: String) -> Control:
	var relation := _secondary_table_cell(row_payload, columns, "relation", "关系")
	var accent := _resolve_relation_accent(relation)
	var panel := _make_home_panel(Color(0.052, 0.034, 0.020, 0.64), accent)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 126)

	var margin := UI_COMPONENT_FACTORY.make_margin(12, 12, 12, 12)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 12)
	margin.add_child(row)

	row.add_child(_build_summary_seal(_secondary_table_cell(row_payload, columns, "target", _secondary_page_seal(page_id))))
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 5)
	row.add_child(column)

	var target := _make_label(_secondary_table_cell(row_payload, columns, "target", "组织"), 19, true)
	target.add_theme_color_override("font_color", Color(1.0, 0.91, 0.68, 0.98))
	column.add_child(target)
	var relation_label := _make_label("%s · %s" % [relation, _secondary_table_cell(row_payload, columns, "status", "状态")], 18, true)
	relation_label.add_theme_color_override("font_color", Color(1.0, 0.72, 0.28, 0.98))
	column.add_child(relation_label)
	var scope := _make_label(_secondary_table_cell(row_payload, columns, "scope", "范围"), 13, true)
	scope.add_theme_color_override("font_color", Color(0.78, 0.88, 0.72, 0.92))
	column.add_child(scope)
	var note_text := _secondary_table_cell(row_payload, columns, "note", "")
	if note_text != "":
		var note := _make_label(note_text, 12, true)
		note.add_theme_color_override("font_color", Color(0.84, 0.78, 0.66, 0.90))
		column.add_child(note)
	return panel


func _build_secondary_stage_phase_chip(page_id: String) -> Control:
	var chip := _make_home_panel(Color(0.090, 0.056, 0.026, 0.72), _secondary_page_accent_color(page_id, 0.62))
	chip.custom_minimum_size = Vector2(148, 62)
	var margin := UI_COMPONENT_FACTORY.make_margin(12, 8, 12, 8)
	chip.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 2)
	margin.add_child(column)
	column.add_child(_make_label(_lifecycle_label(), 13, true))
	var value := _make_label(_secondary_page_short_status(page_id), 18, true)
	value.add_theme_color_override("font_color", Color(1.0, 0.76, 0.34, 0.98))
	column.add_child(value)
	return chip


func _build_member_roster_header(section_payload: Dictionary) -> Control:
	var header := _make_home_panel(Color(0.035, 0.022, 0.014, 0.54), Color(0.86, 0.60, 0.26, 0.42))
	header.name = "OrganizationMemberRosterHeader"
	header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.custom_minimum_size = Vector2(0, 72)

	var margin := UI_COMPONENT_FACTORY.make_margin(18, 14, 18, 14)
	header.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 14)
	margin.add_child(row)

	var title_column := VBoxContainer.new()
	title_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_column.add_theme_constant_override("separation", 0)
	row.add_child(title_column)
	var title := _make_label("%s · 成员" % _snapshot_string("alliance_name", DEFAULT_ALLIANCE_NAME), 27, true)
	title.add_theme_color_override("font_color", Color(1.0, 0.92, 0.72, 0.98))
	title_column.add_child(title)
	return header


func _build_member_roster_table_panel(section_payload: Dictionary) -> Control:
	var panel := _make_home_panel(Color(0.026, 0.017, 0.011, 0.58), Color(0.82, 0.56, 0.24, 0.52))
	panel.name = "OrganizationMemberRosterTableBlock"
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 480)

	var margin := UI_COMPONENT_FACTORY.make_margin(14, 14, 14, 14)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)

	column.add_child(_build_member_roster_column_header())
	for row_payload in _extract_member_roster_rows(section_payload):
		column.add_child(_build_member_roster_row(row_payload))
	return panel


func _build_member_roster_column_header() -> Control:
	var row := HBoxContainer.new()
	row.name = "OrganizationMemberRosterColumnHeader"
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)
	row.add_child(_make_member_header_label("成员", 300))
	row.add_child(_make_member_header_label("状态", 150))
	row.add_child(_make_member_header_label("军团", 130))
	row.add_child(_make_member_header_label("势力", 100))
	row.add_child(_make_member_header_label("州", 100))
	row.add_child(_make_member_header_label("身份", 120))
	row.add_child(_make_member_header_label("坐标", 260))
	return row


func _make_member_header_label(text: String, width: int) -> Label:
	var label := _make_label(text, 13, true)
	label.custom_minimum_size = Vector2(width, 28)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.add_theme_color_override("font_color", Color(1.0, 0.86, 0.58, 0.94))
	return label


func _build_member_roster_row(row_payload: Dictionary) -> Control:
	var panel := _make_home_panel(Color(0.055, 0.034, 0.020, 0.58), Color(0.74, 0.50, 0.22, 0.42))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 72)

	var margin := UI_COMPONENT_FACTORY.make_margin(10, 8, 10, 8)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)
	margin.add_child(row)

	var name_box := HBoxContainer.new()
	name_box.custom_minimum_size = Vector2(300, 0)
	name_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_box.add_theme_constant_override("separation", 10)
	row.add_child(name_box)
	var name_column := VBoxContainer.new()
	name_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_column.add_theme_constant_override("separation", 2)
	name_box.add_child(name_column)
	var name_label := _make_label(str(row_payload.get("name", "成员")), 19, true)
	name_label.add_theme_color_override("font_color", Color(1.0, 0.92, 0.72, 0.98))
	name_column.add_child(name_label)

	row.add_child(_make_member_cell_label(_format_member_roster_text(row_payload.get("contribution", "")), 150))
	row.add_child(_make_member_cell_label(_format_member_roster_text(row_payload.get("merit", "")), 130))
	row.add_child(_make_member_cell_label(_format_member_roster_text(row_payload.get("power", "")), 100))
	row.add_child(_make_member_cell_label(_format_member_roster_text(row_payload.get("state", "")), 100))
	row.add_child(_make_member_cell_label(_format_member_roster_text(row_payload.get("role", "")), 120))
	row.add_child(_build_member_coordinate_cell(row_payload, 260))
	return panel


func _build_member_coordinate_cell(row_payload: Dictionary, width: int) -> Control:
	var cell := HBoxContainer.new()
	cell.custom_minimum_size = Vector2(width, 0)
	cell.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cell.alignment = BoxContainer.ALIGNMENT_BEGIN
	cell.add_theme_constant_override("separation", 8)
	var fallback_tile_id := str(row_payload.get("targetTileId", "")).strip_edges()
	var tile_id := str(row_payload.get("tileId", fallback_tile_id)).strip_edges()
	var coordinate_text := _format_member_coordinate_text(row_payload.get("coordinate", ""), tile_id)
	var label := _make_member_cell_label(coordinate_text, 96)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cell.add_child(label)
	if tile_id != "":
		var button := Button.new()
		button.name = "AllianceMemberCoordinateJumpButton"
		button.text = "跳转"
		button.tooltip_text = "跳转到成员坐标"
		button.set_meta("coordinate_jump_tile_id", tile_id)
		button.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		UI_COMPONENT_FACTORY.apply_battle_report_detail_coordinate_jump_button_style(button)
		button.pressed.connect(Callable(self, "_on_member_coordinate_jump_pressed").bind(tile_id, coordinate_text))
		cell.add_child(button)
	return cell


func _make_member_cell_label(text: String, width: int) -> Label:
	var label := _make_label(text, 16, true)
	label.custom_minimum_size = Vector2(width, 0)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_color_override("font_color", Color(0.90, 0.84, 0.72, 0.95))
	return label


func _format_member_roster_text(value: Variant) -> String:
	var text := str(value).strip_edges()
	match text.to_lower():
		"west front", "west_front":
			return "前线"
		"north recon", "north_recon":
			return "侦察"
		"east expansion", "east_expansion":
			return "拓展"
	return text


func _format_member_coordinate_text(value: Variant, tile_id: String = "") -> String:
	var tile_coordinate := _parse_member_coordinate_from_tile_id(tile_id)
	if not tile_coordinate.is_empty():
		return "(%d,%d)" % [int(tile_coordinate.get("x", 0)), int(tile_coordinate.get("y", 0))]
	if value is Dictionary:
		var coordinate: Dictionary = value as Dictionary
		if coordinate.has("x") and coordinate.has("y"):
			return "(%d,%d)" % [int(coordinate.get("x", 0)), int(coordinate.get("y", 0))]
		return "未设坐标"
	var text := _format_member_roster_text(value)
	if text == "":
		return "未设坐标"
	var lower := text.to_lower()
	if lower.find("_") >= 0 or lower in ["前线", "侦察", "拓展"] or text.find("城") >= 0:
		return "未设坐标"
	return text


func _parse_member_coordinate_from_tile_id(tile_id: String) -> Dictionary:
	var normalized := tile_id.strip_edges()
	if normalized == "":
		return {}
	var parts := normalized.split("_")
	if parts.size() < 3:
		return {}
	var x_text := str(parts[parts.size() - 2]).strip_edges()
	var y_text := str(parts[parts.size() - 1]).strip_edges()
	if not x_text.is_valid_int() or not y_text.is_valid_int():
		return {}
	return {
		"x": int(x_text),
		"y": int(y_text),
	}


func _extract_member_roster_rows(section_payload: Dictionary) -> Array:
	var blocks_variant: Variant = section_payload.get("content_blocks", [])
	if blocks_variant is Array:
		for block_variant in blocks_variant as Array:
			if not (block_variant is Dictionary):
				continue
			var block := block_variant as Dictionary
			if str(block.get("node_name", "")).strip_edges() == "OrganizationMemberRosterTableBlock":
				var rows: Variant = block.get("rows", [])
				if rows is Array and not (rows as Array).is_empty():
					return rows as Array
	return []


func _resolve_member_row_accent(row_payload: Dictionary) -> Color:
	var combined := "%s %s %s" % [
		str(row_payload.get("role", "")),
		str(row_payload.get("merit", "")),
		str(row_payload.get("contribution", "")),
	]
	if combined.contains("盟主") or combined.contains("主控"):
		return Color(0.92, 0.64, 0.18, 0.96)
	if combined.contains("前线") or combined.contains("指挥"):
		return Color(0.70, 0.32, 0.18, 0.96)
	if combined.contains("侦") or combined.contains("拓展"):
		return Color(0.42, 0.60, 0.32, 0.96)
	return Color(0.64, 0.40, 0.15, 0.96)


func _build_officer_hierarchy_stage_view(section_payload: Dictionary) -> Control:
	return _build_bespoke_visual_stage(
		section_payload,
		"governance",
		"officers",
		_build_officer_hierarchy_canvas_panel(section_payload)
	)


func _build_policy_tree_stage_view(section_payload: Dictionary) -> Control:
	return _build_bespoke_visual_stage(
		section_payload,
		"nation",
		"policy",
		_build_policy_tree_canvas_panel(section_payload)
	)


func _build_organization_battle_report_stage_view(section_payload: Dictionary) -> Control:
	return _build_bespoke_visual_stage(
		section_payload,
		"battle_reports",
		"latest",
		_build_organization_battle_report_panel(section_payload),
		false
	)


func _build_organization_battle_report_detail_stage_view(section_payload: Dictionary) -> Control:
	return _build_bespoke_visual_stage(
		section_payload,
		"battle_reports",
		"detail",
		_build_organization_battle_report_detail_panel(section_payload),
		false
	)


func _build_bespoke_visual_stage(section_payload: Dictionary, tab_id: String, section_id: String, content: Control, show_stage_header: bool = true) -> Control:
	var page_id := _compose_page_id(tab_id, section_id)
	var stage := Control.new()
	stage.name = _secondary_stage_node_name(page_id)
	stage.custom_minimum_size = Vector2(0, 650)
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stage.clip_contents = true

	var art := TextureRect.new()
	art.name = "OrganizationSecondaryStageBackground"
	art.texture = _load_home_texture(_organization_secondary_background_asset_path(tab_id, section_id))
	art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	art.modulate = _secondary_stage_art_modulate(page_id)
	art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fill_parent_rect(art)
	stage.add_child(art)

	var shade := ColorRect.new()
	shade.name = "OrganizationSecondaryStageReadabilityLayer"
	shade.color = Color(0.018, 0.012, 0.008, 0.30)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fill_parent_rect(shade)
	stage.add_child(shade)

	var overlay := MarginContainer.new()
	overlay.name = "OrganizationSecondaryStageRealUiOverlay"
	overlay.add_theme_constant_override("margin_left", 26)
	overlay.add_theme_constant_override("margin_top", 24)
	overlay.add_theme_constant_override("margin_right", 26)
	overlay.add_theme_constant_override("margin_bottom", 24)
	_fill_parent_rect(overlay)
	stage.add_child(overlay)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 12)
	overlay.add_child(column)
	if show_stage_header:
		column.add_child(_build_secondary_stage_header(section_payload, page_id))
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(content)

	var sync_layers := func() -> void:
		_sync_home_art_layer_rect(stage, [art, shade, overlay])
	stage.resized.connect(sync_layers)
	sync_layers.call()
	return stage


func _build_officer_hierarchy_canvas_panel(section_payload: Dictionary) -> Control:
	var panel := _make_home_panel(Color(0.022, 0.014, 0.009, 0.48), Color(0.84, 0.58, 0.25, 0.50))
	panel.name = "OrganizationOfficerHierarchyCanvasBlock"
	panel.custom_minimum_size = Vector2(0, 508)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var margin := UI_COMPONENT_FACTORY.make_margin(14, 12, 14, 14)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)

	var toolbar := _build_canvas_toolbar("官职层级", "拖动查看下级官职，缩放用于容纳大型组织。", ORGANIZATION_OFFICER_HIERARCHY_CANVAS_MODE)
	column.add_child(toolbar)
	var canvas_bundle := _build_zoomable_canvas_shell("OrganizationOfficerHierarchyZoomViewport", OFFICER_CANVAS_BASE_SIZE, Vector2(40, 44))
	column.add_child(canvas_bundle.get("root") as Control)
	var canvas := canvas_bundle.get("canvas") as Control
	var nodes := _extract_officer_hierarchy_nodes(section_payload)
	_draw_hierarchy_canvas(canvas, nodes, "officer")
	_wire_canvas_zoom_buttons(
		toolbar.get_node_or_null("zoom_out") as Button,
		toolbar.get_node_or_null("zoom_reset") as Button,
		toolbar.get_node_or_null("zoom_in") as Button,
		toolbar.get_node_or_null("zoom_percent") as Label,
		canvas_bundle.get("holder") as Control,
		canvas,
		OFFICER_CANVAS_BASE_SIZE
	)
	return panel


func _build_policy_tree_canvas_panel(section_payload: Dictionary) -> Control:
	var panel := _make_home_panel(Color(0.022, 0.014, 0.009, 0.48), Color(0.92, 0.66, 0.28, 0.52))
	panel.name = "OrganizationPolicyTreeCanvasBlock"
	panel.custom_minimum_size = Vector2(0, 508)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var margin := UI_COMPONENT_FACTORY.make_margin(14, 12, 14, 14)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)

	var toolbar := _build_canvas_toolbar("政策树", "底层政策更多，上层政策更少；拖动向上查看高阶政策。", ORGANIZATION_POLICY_TREE_CANVAS_MODE)
	column.add_child(toolbar)
	var canvas_bundle := _build_zoomable_canvas_shell("OrganizationPolicyTreeZoomViewport", POLICY_CANVAS_BASE_SIZE, Vector2(180, 245))
	column.add_child(canvas_bundle.get("root") as Control)
	var canvas := canvas_bundle.get("canvas") as Control
	var nodes := _extract_policy_tree_nodes(section_payload)
	_draw_hierarchy_canvas(canvas, nodes, "policy")
	_wire_canvas_zoom_buttons(
		toolbar.get_node_or_null("zoom_out") as Button,
		toolbar.get_node_or_null("zoom_reset") as Button,
		toolbar.get_node_or_null("zoom_in") as Button,
		toolbar.get_node_or_null("zoom_percent") as Label,
		canvas_bundle.get("holder") as Control,
		canvas,
		POLICY_CANVAS_BASE_SIZE
	)
	return panel


func _build_canvas_toolbar(title_text: String, hint_text: String, mode_text: String) -> Control:
	var row := HBoxContainer.new()
	row.name = "OrganizationCanvasToolbar"
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)
	var title_column := VBoxContainer.new()
	title_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_column.add_theme_constant_override("separation", 3)
	row.add_child(title_column)
	var title := _make_label(title_text, 20, true)
	title.add_theme_color_override("font_color", Color(1.0, 0.90, 0.68, 0.98))
	title_column.add_child(title)
	var hint := _make_label(hint_text, 12, true)
	hint.add_theme_color_override("font_color", Color(0.82, 0.76, 0.64, 0.86))
	title_column.add_child(hint)
	var zoom_percent := _make_label("%d%%" % int(round(ORGANIZATION_CANVAS_DEFAULT_ZOOM * 100.0)), 15, true)
	zoom_percent.name = "zoom_percent"
	zoom_percent.custom_minimum_size = Vector2(58, 34)
	zoom_percent.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	zoom_percent.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	zoom_percent.add_theme_color_override("font_color", Color(1.0, 0.86, 0.54, 0.96))
	row.add_child(zoom_percent)
	row.add_child(_build_canvas_zoom_control_button("缩小", "zoom_out"))
	row.add_child(_build_canvas_zoom_control_button("复位", "zoom_reset"))
	row.add_child(_build_canvas_zoom_control_button("放大", "zoom_in"))
	return row


func _build_zoomable_canvas_shell(node_name: String, base_size: Vector2, initial_scroll: Vector2) -> Dictionary:
	var root := VBoxContainer.new()
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_theme_constant_override("separation", 8)

	var scroll := ScrollContainer.new()
	scroll.name = node_name
	scroll.custom_minimum_size = Vector2(0, 430)
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(scroll)
	root.add_child(scroll)

	var initial_zoom := _resolve_canvas_saved_zoom(node_name)
	var holder := Control.new()
	holder.name = "%sHolder" % node_name
	holder.custom_minimum_size = base_size * initial_zoom
	holder.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	holder.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.add_child(holder)

	var canvas := Control.new()
	canvas.name = "%sCanvas" % node_name
	canvas.custom_minimum_size = base_size
	canvas.size = base_size
	canvas.scale = Vector2(initial_zoom, initial_zoom)
	holder.add_child(canvas)

	var hint := _build_canvas_drag_hint()
	_place_canvas_control(hint, Vector2(600, 12), Vector2(230, 40))
	canvas.add_child(hint)
	call_deferred("_fade_canvas_drag_hint", hint)
	_apply_canvas_inertia(scroll, node_name)
	call_deferred("_set_canvas_initial_scroll", scroll, int(initial_scroll.x), int(initial_scroll.y), node_name)
	return {
		"root": root,
		"scroll": scroll,
		"holder": holder,
		"canvas": canvas,
	}


func _wire_canvas_zoom_buttons(zoom_out: Button, zoom_reset: Button, zoom_in: Button, zoom_percent: Label, holder: Control, canvas: Control, base_size: Vector2) -> void:
	var canvas_key := _canvas_key_from_canvas(canvas)
	var zoom_state := {"value": _resolve_canvas_saved_zoom(canvas_key)}
	var apply_zoom := func(next_zoom: float) -> void:
		var resolved_zoom := clampf(next_zoom, ORGANIZATION_CANVAS_MIN_ZOOM, ORGANIZATION_CANVAS_MAX_ZOOM)
		zoom_state["value"] = resolved_zoom
		if canvas_key != "":
			_canvas_zoom_by_name[canvas_key] = resolved_zoom
		canvas.scale = Vector2(resolved_zoom, resolved_zoom)
		holder.custom_minimum_size = base_size * resolved_zoom
		holder.size = holder.custom_minimum_size
		if zoom_percent != null:
			zoom_percent.text = "%d%%" % int(round(resolved_zoom * 100.0))
	if zoom_out != null:
		zoom_out.pressed.connect(func() -> void: apply_zoom.call(float(zoom_state.get("value", _resolve_canvas_saved_zoom(canvas_key))) - 0.12))
	if zoom_reset != null:
		zoom_reset.pressed.connect(func() -> void: apply_zoom.call(ORGANIZATION_CANVAS_DEFAULT_ZOOM))
	if zoom_in != null:
		zoom_in.pressed.connect(func() -> void: apply_zoom.call(float(zoom_state.get("value", _resolve_canvas_saved_zoom(canvas_key))) + 0.12))
	apply_zoom.call(float(zoom_state.get("value", _resolve_canvas_saved_zoom(canvas_key))))


func _build_canvas_zoom_control_button(label_text: String, node_name: String) -> Button:
	var button := Button.new()
	button.name = node_name
	button.text = label_text
	button.custom_minimum_size = Vector2(70, 34)
	button.add_theme_font_size_override("font_size", 13)
	button.add_theme_stylebox_override("normal", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(0.064, 0.040, 0.022, 0.80), Color(0.82, 0.56, 0.24, 0.58), 1, 4, 0.10))
	button.add_theme_stylebox_override("hover", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(0.128, 0.076, 0.032, 0.88), Color(1.00, 0.72, 0.32, 0.78), 1, 5, 0.14))
	button.add_theme_stylebox_override("pressed", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(0.048, 0.030, 0.018, 0.92), Color(1.00, 0.76, 0.34, 0.96), 1, 2, 0.10))
	return button


func _build_canvas_drag_hint() -> Control:
	var overlay := MarginContainer.new()
	overlay.name = "OrganizationCanvasDragHint"
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.add_theme_constant_override("margin_left", 18)
	overlay.add_theme_constant_override("margin_top", 18)
	overlay.add_theme_constant_override("margin_right", 18)
	var column := VBoxContainer.new()
	column.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.add_child(column)
	var row := HBoxContainer.new()
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	column.add_child(row)
	var plate := PanelContainer.new()
	plate.mouse_filter = Control.MOUSE_FILTER_IGNORE
	plate.custom_minimum_size = Vector2(230, 40)
	plate.add_theme_stylebox_override("panel", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(0.060, 0.038, 0.020, 0.74), Color(1.0, 0.72, 0.30, 0.62), 1, 8, 0.10))
	row.add_child(plate)
	var margin := UI_COMPONENT_FACTORY.make_margin(14, 8, 14, 8)
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	plate.add_child(margin)
	var label := _make_label("拖动画布查看全体官职", 15, false)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_color_override("font_color", Color(1.0, 0.88, 0.58, 0.92))
	margin.add_child(label)
	return overlay


func _fade_canvas_drag_hint(hint_node: Object) -> void:
	if hint_node == null or not is_instance_valid(hint_node) or not (hint_node is CanvasItem):
		return
	var hint := hint_node as CanvasItem
	hint.modulate = Color(1.0, 1.0, 1.0, 1.0)
	var tween := create_tween()
	tween.tween_interval(0.85)
	tween.tween_property(hint, "modulate:a", 0.0, 0.45).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)


func _resolve_canvas_saved_zoom(canvas_key: String) -> float:
	if canvas_key.strip_edges() == "":
		return ORGANIZATION_CANVAS_DEFAULT_ZOOM
	return clampf(float(_canvas_zoom_by_name.get(canvas_key, ORGANIZATION_CANVAS_DEFAULT_ZOOM)), ORGANIZATION_CANVAS_MIN_ZOOM, ORGANIZATION_CANVAS_MAX_ZOOM)


func _resolve_canvas_saved_scroll(canvas_key: String, fallback: Vector2) -> Vector2:
	if canvas_key.strip_edges() == "":
		return fallback
	var saved_variant: Variant = _canvas_scroll_by_name.get(canvas_key, fallback)
	if saved_variant is Vector2:
		return saved_variant as Vector2
	return fallback


func _canvas_key_from_canvas(canvas: Control) -> String:
	if canvas == null:
		return ""
	var key := canvas.name
	if key.ends_with("Canvas"):
		key = key.substr(0, key.length() - "Canvas".length())
	return key


func _apply_canvas_inertia(scroll: ScrollContainer, canvas_key: String) -> void:
	if scroll == null or bool(scroll.get_meta("organization_canvas_inertia_bound", false)):
		return
	scroll.set_meta("organization_canvas_inertia_bound", true)
	scroll.gui_input.connect(func(event: InputEvent) -> void:
		_handle_canvas_inertia_input(scroll, canvas_key, event)
	)


func _handle_canvas_inertia_input(scroll: ScrollContainer, canvas_key: String, event: InputEvent) -> void:
	if scroll == null:
		return
	if event is InputEventMouseButton:
		var mouse_button := event as InputEventMouseButton
		if mouse_button.button_index != MOUSE_BUTTON_LEFT:
			return
		if mouse_button.pressed:
			_stop_canvas_inertia(canvas_key)
			scroll.set_meta("organization_canvas_last_drag_ms", Time.get_ticks_msec())
			scroll.set_meta("organization_canvas_last_velocity", Vector2.ZERO)
		else:
			_store_canvas_scroll(scroll, canvas_key)
			_start_canvas_inertia(scroll, canvas_key)
		return
	if event is InputEventMouseMotion and bool(scroll.get_meta("touch_drag_active", false)):
		var motion := event as InputEventMouseMotion
		_record_canvas_drag_velocity(scroll, -motion.relative)
		_store_canvas_scroll(scroll, canvas_key)
		return
	if event is InputEventScreenTouch:
		var touch := event as InputEventScreenTouch
		if touch.pressed:
			_stop_canvas_inertia(canvas_key)
			scroll.set_meta("organization_canvas_last_drag_ms", Time.get_ticks_msec())
			scroll.set_meta("organization_canvas_last_velocity", Vector2.ZERO)
		else:
			_store_canvas_scroll(scroll, canvas_key)
			_start_canvas_inertia(scroll, canvas_key)
		return
	if event is InputEventScreenDrag:
		var drag := event as InputEventScreenDrag
		_record_canvas_drag_velocity(scroll, -drag.relative)
		_store_canvas_scroll(scroll, canvas_key)


func _record_canvas_drag_velocity(scroll: ScrollContainer, scroll_delta: Vector2) -> void:
	var now := Time.get_ticks_msec()
	var last_ms := int(scroll.get_meta("organization_canvas_last_drag_ms", now))
	var delta_ms := maxi(1, now - last_ms)
	var velocity := scroll_delta * (1000.0 / float(delta_ms))
	scroll.set_meta("organization_canvas_last_drag_ms", now)
	scroll.set_meta("organization_canvas_last_velocity", velocity)


func _start_canvas_inertia(scroll: ScrollContainer, canvas_key: String) -> void:
	var velocity_variant: Variant = scroll.get_meta("organization_canvas_last_velocity", Vector2.ZERO)
	if not (velocity_variant is Vector2):
		return
	var velocity := velocity_variant as Vector2
	if velocity.length() < 420.0:
		return
	var target := Vector2(float(scroll.scroll_horizontal), float(scroll.scroll_vertical)) + velocity * 0.22
	target.x = maxf(0.0, target.x)
	target.y = maxf(0.0, target.y)
	var tween := create_tween()
	_canvas_inertia_tweens[canvas_key] = tween
	tween.tween_property(scroll, "scroll_horizontal", int(target.x), 0.28).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.parallel().tween_property(scroll, "scroll_vertical", int(target.y), 0.28).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.finished.connect(func() -> void:
		_store_canvas_scroll(scroll, canvas_key)
		_canvas_inertia_tweens.erase(canvas_key)
	)


func _stop_canvas_inertia(canvas_key: String) -> void:
	var tween_variant: Variant = _canvas_inertia_tweens.get(canvas_key)
	if tween_variant is Tween:
		var tween := tween_variant as Tween
		tween.kill()
	_canvas_inertia_tweens.erase(canvas_key)


func _store_canvas_scroll(scroll: ScrollContainer, canvas_key: String) -> void:
	if scroll == null or canvas_key.strip_edges() == "":
		return
	_canvas_scroll_by_name[canvas_key] = Vector2(float(scroll.scroll_horizontal), float(scroll.scroll_vertical))


func _set_canvas_initial_scroll(scroll_node: Object, horizontal: int, vertical: int, canvas_key: String = "") -> void:
	if scroll_node == null or not is_instance_valid(scroll_node) or not (scroll_node is ScrollContainer):
		return
	var scroll := scroll_node as ScrollContainer
	var saved_scroll := _resolve_canvas_saved_scroll(canvas_key, Vector2(float(horizontal), float(vertical)))
	scroll.scroll_horizontal = int(saved_scroll.x)
	scroll.scroll_vertical = int(saved_scroll.y)


func _draw_hierarchy_canvas(canvas: Control, nodes: Array, mode: String) -> void:
	var node_by_id: Dictionary = {}
	var children_by_parent: Dictionary = {}
	for node_variant in nodes:
		if not (node_variant is Dictionary):
			continue
		var hierarchy_payload := node_variant as Dictionary
		var node_id := str(hierarchy_payload.get("id", ""))
		node_by_id[node_id] = hierarchy_payload
		var parent_id := str(hierarchy_payload.get("parent", "")).strip_edges()
		if parent_id == "":
			continue
		if not children_by_parent.has(parent_id):
			children_by_parent[parent_id] = []
		(children_by_parent[parent_id] as Array).append(hierarchy_payload)
	for parent_id_variant in children_by_parent.keys():
		var parent_id := str(parent_id_variant).strip_edges()
		if not node_by_id.has(parent_id):
			continue
		var parent_payload := node_by_id.get(parent_id, {}) as Dictionary
		var children := children_by_parent.get(parent_id, []) as Array
		if mode == "officer" and children.size() >= 4:
			_draw_canvas_connector_bus(canvas, parent_payload, children, mode)
		else:
			for child_variant in children:
				if child_variant is Dictionary:
					_draw_canvas_connector(canvas, parent_payload, child_variant as Dictionary, mode)
	for node_variant in nodes:
		if node_variant is Dictionary:
			var canvas_payload := node_variant as Dictionary
			var node_control := _build_canvas_node(canvas_payload, mode)
			_place_canvas_control(
				node_control,
				Vector2(float(canvas_payload.get("x", 0.0)), float(canvas_payload.get("y", 0.0))),
				Vector2(float(canvas_payload.get("width", 220.0)), float(canvas_payload.get("height", 86.0)))
			)
			canvas.add_child(node_control)


func _draw_canvas_connector(canvas: Control, parent_payload: Dictionary, child_payload: Dictionary, mode: String) -> void:
	var parent_pos := Vector2(float(parent_payload.get("x", 0.0)), float(parent_payload.get("y", 0.0)))
	var parent_size := Vector2(float(parent_payload.get("width", 220.0)), float(parent_payload.get("height", 86.0)))
	var child_pos := Vector2(float(child_payload.get("x", 0.0)), float(child_payload.get("y", 0.0)))
	var child_size := Vector2(float(child_payload.get("width", 220.0)), float(child_payload.get("height", 86.0)))
	var from_point := parent_pos + Vector2(parent_size.x * 0.5, parent_size.y)
	var to_point := child_pos + Vector2(child_size.x * 0.5, 0.0)
	_draw_canvas_polyline(canvas, [from_point, to_point], _resolve_canvas_connector_color(parent_payload, child_payload, mode, 0.50), 2.0)


func _draw_canvas_connector_bus(canvas: Control, parent_payload: Dictionary, children: Array, mode: String) -> void:
	var parent_pos := Vector2(float(parent_payload.get("x", 0.0)), float(parent_payload.get("y", 0.0)))
	var parent_size := Vector2(float(parent_payload.get("width", 220.0)), float(parent_payload.get("height", 86.0)))
	var parent_anchor := parent_pos + Vector2(parent_size.x * 0.5, parent_size.y)
	var rows: Dictionary = {}
	for child_variant in children:
		if not (child_variant is Dictionary):
			continue
		var child := child_variant as Dictionary
		var row_key := str(int(float(child.get("y", 0.0))))
		if not rows.has(row_key):
			rows[row_key] = []
		(rows[row_key] as Array).append(child)
	var sorted_row_keys := rows.keys()
	sorted_row_keys.sort_custom(func(a, b): return int(str(a)) < int(str(b)))
	for row_key_variant in sorted_row_keys:
		var row_children := rows.get(row_key_variant, []) as Array
		if row_children.is_empty():
			continue
		var min_x := 999999.0
		var max_x := -999999.0
		var row_y := float(row_key_variant)
		for child_variant in row_children:
			var child := child_variant as Dictionary
			var child_x := float(child.get("x", 0.0)) + float(child.get("width", 220.0)) * 0.5
			min_x = minf(min_x, child_x)
			max_x = maxf(max_x, child_x)
		var bus_y := maxf(parent_anchor.y + 34.0, row_y - 26.0)
		var first_child := row_children[0] as Dictionary
		var bus_color := _resolve_canvas_connector_color(parent_payload, first_child, mode, 0.54)
		_draw_canvas_polyline(canvas, [parent_anchor, Vector2(parent_anchor.x, bus_y), Vector2(min_x, bus_y), Vector2(max_x, bus_y)], bus_color, 2.2)
		for child_variant in row_children:
			var child := child_variant as Dictionary
			var child_pos := Vector2(float(child.get("x", 0.0)), float(child.get("y", 0.0)))
			var child_size := Vector2(float(child.get("width", 220.0)), float(child.get("height", 86.0)))
			var child_anchor := child_pos + Vector2(child_size.x * 0.5, 0.0)
			_draw_canvas_polyline(canvas, [Vector2(child_anchor.x, bus_y), child_anchor], _resolve_canvas_connector_color(parent_payload, child, mode, 0.42), 1.8)


func _draw_canvas_polyline(canvas: Control, points: Array, color: Color, width: float) -> void:
	var line := Line2D.new()
	line.width = width
	line.default_color = color
	for point_variant in points:
		if point_variant is Vector2:
			line.add_point(point_variant)
	canvas.add_child(line)


func _build_canvas_node(node_payload: Dictionary, mode: String) -> Control:
	var accent := _resolve_canvas_node_accent(node_payload, mode)
	var button := Button.new()
	button.text = ""
	button.clip_contents = true
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.size_flags_vertical = Control.SIZE_EXPAND_FILL
	button.add_theme_stylebox_override("normal", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(0.052, 0.032, 0.018, 0.74), accent, 1, 5, 0.12))
	button.add_theme_stylebox_override("hover", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(0.116, 0.072, 0.030, 0.88), Color(accent.r, accent.g, accent.b, minf(accent.a + 0.22, 1.0)), 1, 6, 0.16))
	button.add_theme_stylebox_override("pressed", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(0.038, 0.024, 0.014, 0.92), Color(accent.r, accent.g, accent.b, 0.96), 1, 3, 0.12))

	var margin := UI_COMPONENT_FACTORY.make_margin(10, 8, 10, 8)
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	button.add_child(margin)
	var row := HBoxContainer.new()
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 9)
	margin.add_child(row)

	var tier := int(node_payload.get("tier", 0))
	var show_seal := not (mode == "officer" and tier >= 2)
	if show_seal:
		var seal := _build_summary_seal(str(node_payload.get("seal", node_payload.get("title", ""))))
		seal.mouse_filter = Control.MOUSE_FILTER_IGNORE
		seal.custom_minimum_size = Vector2(52, 52) if mode == "officer" else Vector2(48, 48)
		row.add_child(seal)
	var column := VBoxContainer.new()
	column.mouse_filter = Control.MOUSE_FILTER_IGNORE
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 3)
	row.add_child(column)
	var title_size := 18 if mode == "officer" else 15
	if mode == "officer" and tier >= 2:
		title_size = 20
	var title := _make_label(str(node_payload.get("title", "节点")), title_size, true)
	title.add_theme_color_override("font_color", Color(1.0, 0.91, 0.66, 0.98))
	column.add_child(title)
	var name := str(node_payload.get("name", "")).strip_edges()
	if name != "":
		var name_label := _make_label(name, 20 if mode == "officer" and tier <= 1 else 17, true)
		name_label.add_theme_color_override("font_color", Color(1.0, 0.76, 0.34, 0.98))
		column.add_child(name_label)
	var meta := "" if mode == "officer" else str(node_payload.get("meta", "")).strip_edges()
	if meta != "":
		var meta_label := _make_label(meta, 12, true)
		meta_label.add_theme_color_override("font_color", Color(0.80, 0.88, 0.70, 0.90))
		column.add_child(meta_label)
	var desc := "" if mode == "officer" else str(node_payload.get("description", "")).strip_edges()
	if desc != "":
		var desc_label := _make_label(desc, 11, true)
		desc_label.add_theme_color_override("font_color", Color(0.84, 0.78, 0.66, 0.88))
		column.add_child(desc_label)
	return button


func _resolve_canvas_node_accent(node_payload: Dictionary, mode: String) -> Color:
	var tier := int(node_payload.get("tier", 0))
	if mode == "policy":
		if tier <= 0:
			return Color(1.0, 0.72, 0.26, 0.88)
		if tier == 1:
			return Color(0.86, 0.58, 0.24, 0.72)
		return Color(0.60, 0.43, 0.22, 0.58)
	if mode == "officer":
		var lineage := _resolve_officer_lineage_key(node_payload)
		if lineage == "military":
			return Color(1.0, 0.50, 0.28, 0.78)
		if lineage == "civil":
			return Color(1.0, 0.82, 0.50, 0.76)
		if lineage == "commandant":
			return Color(0.86, 0.58, 0.34, 0.72)
		if lineage == "ruler":
			return Color(1.0, 0.72, 0.28, 0.88)
	if tier <= 0:
		return Color(1.0, 0.72, 0.28, 0.88)
	if tier == 1:
		return Color(0.86, 0.58, 0.26, 0.72)
	if tier == 2:
		return Color(0.70, 0.42, 0.20, 0.62)
	return Color(0.54, 0.36, 0.20, 0.54)


func _resolve_canvas_connector_color(parent_payload: Dictionary, child_payload: Dictionary, mode: String, alpha: float) -> Color:
	if mode == "policy":
		return Color(0.98, 0.74, 0.34, alpha)
	var lineage := _resolve_officer_lineage_key(child_payload)
	if lineage == "military":
		return Color(1.0, 0.45, 0.24, alpha)
	if lineage == "civil":
		return Color(1.0, 0.84, 0.54, alpha)
	if lineage == "commandant":
		return Color(0.84, 0.56, 0.32, alpha)
	if lineage == "ruler":
		return Color(1.0, 0.72, 0.28, alpha)
	if not parent_payload.is_empty():
		return _resolve_canvas_connector_color({}, parent_payload, mode, alpha)
	return Color(0.95, 0.70, 0.34, alpha)


func _resolve_officer_lineage_key(node_payload: Dictionary) -> String:
	var node_id := str(node_payload.get("id", "")).strip_edges()
	var parent_id := str(node_payload.get("parent", "")).strip_edges()
	if node_id == "grand_general" or parent_id == "grand_general" or node_id.begins_with("general_"):
		return "military"
	if node_id == "prime_minister" or parent_id == "prime_minister" or node_id.begins_with("civil_"):
		return "civil"
	if node_id == "grand_commandant" or parent_id == "grand_commandant":
		return "commandant"
	if node_id == "nation_ruler":
		return "ruler"
	return "alliance"


func _place_canvas_control(control: Control, position: Vector2, size: Vector2) -> void:
	control.anchor_left = 0.0
	control.anchor_top = 0.0
	control.anchor_right = 0.0
	control.anchor_bottom = 0.0
	control.position = position
	control.size = size
	control.offset_left = position.x
	control.offset_top = position.y
	control.offset_right = position.x + size.x
	control.offset_bottom = position.y + size.y
	control.custom_minimum_size = size


func _extract_officer_hierarchy_nodes(section_payload: Dictionary) -> Array:
	if _organization_kind() != "nation":
		return _default_alliance_officer_hierarchy_nodes(section_payload)
	if _organization_kind() == "nation":
		return _default_nation_officer_hierarchy_nodes(section_payload)
	var block := _find_content_block(section_payload, "OrganizationOfficerHierarchyCanvasBlock")
	var nodes_variant: Variant = block.get("nodes", [])
	if nodes_variant is Array and not (nodes_variant as Array).is_empty():
		return _normalize_officer_hierarchy_nodes(nodes_variant as Array)
	return _default_officer_hierarchy_nodes(section_payload)


func _normalize_officer_hierarchy_nodes(nodes: Array) -> Array:
	var normalized_nodes: Array = []
	for node_variant in nodes:
		if not (node_variant is Dictionary):
			continue
		var node := (node_variant as Dictionary).duplicate(true)
		node["title"] = _normalize_officer_title(str(node.get("title", "")).strip_edges())
		node["name"] = _normalize_officer_copy(str(node.get("name", "")).strip_edges())
		node["meta"] = _normalize_officer_copy(str(node.get("meta", "")).strip_edges())
		node["description"] = _normalize_officer_copy(str(node.get("description", "")).strip_edges())
		var title := str(node.get("title", "")).strip_edges()
		if title != "":
			node["seal"] = title.substr(0, 1)
		normalized_nodes.append(node)
	return normalized_nodes


func _normalize_officer_title(title: String) -> String:
	match title:
		"丞相":
			return "副盟主"
		"大将军":
			return "大司马"
		"前线指挥":
			return "军司马"
		"侦察官":
			return "候曹掾"
		"后勤官":
			return "治中从事"
		"外交官":
			return "功曹"
		"第一军团":
			return "别部司马"
		"第二军团":
			return "门下督"
		"粮草署":
			return "仓曹掾"
		"使节署":
			return "议曹掾"
		_:
			return title


func _normalize_officer_copy(text: String) -> String:
	var normalized := text
	normalized = normalized.replace("青州后勤官", "青州从事")
	normalized = normalized.replace("后勤官", "治中从事")
	normalized = normalized.replace("前线指挥", "军司马")
	normalized = normalized.replace("侦察官", "候曹掾")
	normalized = normalized.replace("外交官", "功曹")
	normalized = normalized.replace("丞相", "副盟主")
	normalized = normalized.replace("大将军", "大司马")
	return normalized


func _extract_policy_tree_nodes(section_payload: Dictionary) -> Array:
	var block := _find_content_block(section_payload, "OrganizationPolicyTreeCanvasBlock")
	var nodes_variant: Variant = block.get("nodes", [])
	if nodes_variant is Array and not (nodes_variant as Array).is_empty():
		return nodes_variant as Array
	return _default_policy_tree_nodes(section_payload)


func _find_content_block(section_payload: Dictionary, node_name: String) -> Dictionary:
	var blocks_variant: Variant = section_payload.get("content_blocks", [])
	if blocks_variant is Array:
		for block_variant in blocks_variant as Array:
			if not (block_variant is Dictionary):
				continue
			var block := block_variant as Dictionary
			if str(block.get("node_name", "")).strip_edges() == node_name:
				return block
	return {}


func _default_officer_hierarchy_nodes(section_payload: Dictionary) -> Array:
	if _organization_kind() != "nation":
		return _default_alliance_officer_hierarchy_nodes(section_payload)
	return _default_nation_officer_hierarchy_nodes(section_payload)


func _default_alliance_officer_hierarchy_nodes(section_payload: Dictionary) -> Array:
	var cards := _secondary_stage_cards({"cards": section_payload.get("item_cards", [])}, section_payload)
	var ruler_name := _snapshot_string("ruler_display_name", "玩家主控")
	if not cards.is_empty() and cards[0] is Dictionary:
		ruler_name = str((cards[0] as Dictionary).get("value", ruler_name))
	return [
		{"id": "alliance_ruler", "title": "盟主", "name": ruler_name, "seal": "盟", "meta": "最高权限", "description": "同盟阶段最高位。", "tier": 0, "x": 650, "y": 36, "width": 260, "height": 96},
		{"id": "alliance_deputy", "parent": "alliance_ruler", "title": "副盟主", "name": "佐理盟务", "seal": "副", "meta": "副位", "description": "协助盟主处理同盟事务。", "tier": 1, "x": 480, "y": 210, "width": 240, "height": 90},
		{"id": "alliance_officer", "parent": "alliance_ruler", "title": "官员", "name": "待任命", "seal": "官", "meta": "同盟官员", "description": "普通官员席，立国后才展开正式官职树。", "tier": 1, "x": 830, "y": 210, "width": 240, "height": 90},
	]


func _default_nation_officer_hierarchy_nodes(_section_payload: Dictionary) -> Array:
	var nodes: Array = [
		_make_officer_node("nation_ruler", "", "王", "玩家主控", "王", "国家最高位", "成立国家后启用正式官职。", 0, 880, 24, 300, 104),
		_make_officer_node("prime_minister", "nation_ruler", "丞相", "政务总揽", "丞", "中枢辅政", "承接任免、政策和内政。", 1, 250, 178, 270, 96),
		_make_officer_node("grand_general", "nation_ruler", "大将军", "统军中枢", "将", "最高军职", "统摄国家军务和武将任官。", 1, 880, 178, 270, 96),
		_make_officer_node("grand_commandant", "nation_ruler", "太尉", "军政监察", "尉", "三公", "承接军政监察和军令校核。", 1, 1510, 178, 270, 96),
	]
	var civil_titles := ["司徒", "司空", "太常", "光禄勋", "卫尉", "廷尉", "太仆", "大鸿胪", "宗正", "大司农", "少府", "执金吾", "将作大匠", "河南尹", "京兆尹", "左冯翊", "右扶风", "尚书令", "尚书仆射", "御史中丞", "司隶校尉", "侍中", "黄门侍郎", "中常侍", "议郎", "谏议大夫", "太史令", "博士祭酒", "主簿", "长史", "功曹", "治中从事", "别驾从事", "簿曹从事"]
	_append_officer_title_grid(nodes, civil_titles, "prime_minister", "civil", "文官官署", 2, 40, 335, 3, 252, 106)
	var general_titles := ["骠骑将军", "车骑将军", "卫将军", "前将军", "后将军", "左将军", "右将军", "征东将军", "征西将军", "征南将军", "征北将军", "镇东将军", "镇西将军", "镇南将军", "镇北将军", "安东将军", "安西将军", "安南将军", "安北将军", "平东将军", "平西将军", "平南将军", "平北将军", "奋威将军", "奋武将军", "扬威将军", "扬武将军", "建威将军", "建武将军", "振威将军", "振武将军", "鹰扬将军", "虎威将军", "虎牙将军", "折冲将军", "横野将军", "楼船将军", "伏波将军", "凌江将军", "荡寇将军", "讨寇将军", "破虏将军", "讨虏将军", "平虏将军", "威虏将军", "讨逆将军", "辅国将军", "安国将军", "护军将军", "中军将军", "领军将军", "武卫将军", "武锋将军", "牙门将军", "偏将军", "裨将军", "骑都尉", "奉车都尉", "驸马都尉", "中垒校尉", "屯骑校尉", "步兵校尉", "越骑校尉", "长水校尉", "射声校尉", "虎贲校尉", "西园校尉", "护羌校尉", "护乌桓校尉", "度辽将军", "材官将军", "积弩将军", "强弩将军", "轻车将军", "冠军将军", "讨暴将军", "殄虏将军", "昭武将军", "昭烈将军", "宣威将军", "宣武将军", "宁朔将军", "宁远将军", "安远将军", "绥远将军", "镇军将军", "辅军将军", "荡难将军", "横海将军", "横江将军", "广武将军", "广威将军", "建义将军", "建忠将军", "立节将军", "忠义将军", "武烈将军", "武毅将军"]
	_append_officer_title_grid(nodes, general_titles, "grand_general", "general", "武将官职", 3, 790, 335, 5, 252, 106)
	return nodes


func _make_officer_node(id: String, parent: String, title: String, name: String, seal: String, meta: String, description: String, tier: int, x: int, y: int, width: int, height: int) -> Dictionary:
	var node := {"id": id, "title": title, "name": name, "seal": seal, "meta": meta, "description": description, "tier": tier, "x": x, "y": y, "width": width, "height": height}
	if parent != "":
		node["parent"] = parent
	return node


func _append_officer_title_grid(nodes: Array, titles: Array, parent_id: String, id_prefix: String, meta: String, tier: int, start_x: int, start_y: int, columns: int, step_x: int, step_y: int) -> void:
	for index in range(titles.size()):
		var title := str(titles[index])
		nodes.append(_make_officer_node(
			"%s_%s" % [id_prefix, str(index)],
			parent_id,
			title,
			"待任命",
			title.substr(0, 1),
			meta,
			"国家阶段官职席，可随等级逐步开放。",
			tier,
			start_x + (index % columns) * step_x,
			start_y + int(index / columns) * step_y,
			232,
			88
		))


func _default_policy_tree_nodes(_section_payload: Dictionary) -> Array:
	return [
		{"id": "season_core", "title": "王制纲领", "name": "赛季总策", "seal": "王", "meta": "最高政策 / 立国后", "description": "高阶政策更少，承接下层政策完成状态。", "tier": 0, "x": 700, "y": 24, "width": 260, "height": 96},
		{"id": "military_core", "parent": "season_core", "title": "军府纲领", "name": "军务中枢", "seal": "军", "meta": "高阶政策", "description": "统合军团与战区加成。", "tier": 1, "x": 520, "y": 165, "width": 240, "height": 88},
		{"id": "civil_core", "parent": "season_core", "title": "民政纲领", "name": "内政中枢", "seal": "政", "meta": "高阶政策", "description": "统合资源、城池和建设加成。", "tier": 1, "x": 900, "y": 165, "width": 240, "height": 88},
		{"id": "mobilize", "parent": "military_core", "title": "征调整备", "name": "待解锁", "seal": "征", "meta": "中阶政策", "description": "提升组织调动效率。", "tier": 2, "x": 245, "y": 310, "width": 230, "height": 86},
		{"id": "frontline", "parent": "military_core", "title": "前线军略", "name": "待解锁", "seal": "略", "meta": "中阶政策", "description": "提升战区协同效率。", "tier": 2, "x": 535, "y": 310, "width": 230, "height": 86},
		{"id": "granary", "parent": "civil_core", "title": "屯田令", "name": "进行中", "seal": "屯", "meta": "中阶政策", "description": "本赛季粮食产出加成。", "tier": 2, "x": 825, "y": 310, "width": 230, "height": 86},
		{"id": "workshop", "parent": "civil_core", "title": "工坊令", "name": "待解锁", "seal": "工", "meta": "中阶政策", "description": "提升木材与铁矿收益。", "tier": 2, "x": 1115, "y": 310, "width": 230, "height": 86},
		{"id": "base_1", "parent": "mobilize", "title": "兵册清点", "name": "可研究", "seal": "兵", "meta": "底层政策", "description": "底层节点更多，便于赛季成长。", "tier": 3, "x": 80, "y": 470, "width": 200, "height": 80},
		{"id": "base_2", "parent": "mobilize", "title": "军粮预置", "name": "可研究", "seal": "粮", "meta": "底层政策", "description": "为上层军务政策铺路。", "tier": 3, "x": 315, "y": 470, "width": 200, "height": 80},
		{"id": "base_3", "parent": "frontline", "title": "斥候整备", "name": "可研究", "seal": "侦", "meta": "底层政策", "description": "提升前线情报效率。", "tier": 3, "x": 550, "y": 470, "width": 200, "height": 80},
		{"id": "base_4", "parent": "granary", "title": "仓廪修缮", "name": "可研究", "seal": "仓", "meta": "底层政策", "description": "提高城池资源承载。", "tier": 3, "x": 785, "y": 470, "width": 200, "height": 80},
		{"id": "base_5", "parent": "workshop", "title": "匠作调度", "name": "可研究", "seal": "匠", "meta": "底层政策", "description": "提高建设和供给效率。", "tier": 3, "x": 1020, "y": 470, "width": 200, "height": 80},
		{"id": "base_6", "parent": "workshop", "title": "市井税契", "name": "立国后", "seal": "市", "meta": "底层政策", "description": "连接市井与国家供给。", "tier": 3, "x": 1255, "y": 470, "width": 200, "height": 80},
	]


func _build_organization_battle_report_panel(section_payload: Dictionary) -> Control:
	var panel := _make_home_panel(Color(0.018, 0.012, 0.009, 0.48), Color(0.88, 0.42, 0.24, 0.50))
	panel.name = "OrganizationBattleReportListBlock"
	panel.custom_minimum_size = Vector2(0, 520)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var margin := UI_COMPONENT_FACTORY.make_margin(12, 12, 12, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)

	var contracts := _build_organization_battle_report_contracts(section_payload)
	var entry_contracts: Array = contracts.get("entry_contracts", []) as Array
	var selected_report_id := _first_report_id(entry_contracts)
	if _organization_battle_report_selected_id.strip_edges() == "":
		_organization_battle_report_selected_id = selected_report_id
	var enemy_dossier_cards_variant: Variant = section_payload.get("enemy_dossier_cards", [])
	var enemy_dossier_cards: Array = enemy_dossier_cards_variant as Array if enemy_dossier_cards_variant is Array else []
	if not enemy_dossier_cards.is_empty():
		var dossier_title := _make_label("敌军档案查询列表", 18, true)
		dossier_title.name = "OrganizationEnemyDossierQueryListTitle"
		dossier_title.add_theme_color_override("font_color", Color(1.0, 0.86, 0.56, 0.98))
		column.add_child(dossier_title)
		var dossier_grid := _build_secondary_stage_card_grid({
			"title": "敌军档案查询列表",
			"cards": enemy_dossier_cards.slice(0, 2),
			"columns": 2,
		}, section_payload, "battle_reports/latest")
		dossier_grid.name = "OrganizationEnemyDossierQueryListBlock"
		dossier_grid.custom_minimum_size = Vector2(0, 178)
		dossier_grid.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
		column.add_child(dossier_grid)

	var list_page := BATTLE_REPORT_LIST_PAGE_SCENE.instantiate() as Control
	list_page.name = "OrganizationBattleReportListPage"
	list_page.custom_minimum_size = Vector2(0, 310 if not enemy_dossier_cards.is_empty() else 500)
	list_page.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list_page.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(list_page)

	var refresh_list := func(report_id: String) -> void:
		var resolved_report_id := report_id.strip_edges()
		if resolved_report_id == "":
			resolved_report_id = _first_report_id(entry_contracts)
		_organization_battle_report_selected_id = resolved_report_id
		var shared_state := {
			"page_id": "list",
			"page_id_label": _organization_battle_report_label(),
			"list_mode": "organization",
			"list_mode_label": _organization_label(),
			"selected_report": resolved_report_id,
			"selected_report_label": resolved_report_id,
			"detail_tab": "battlefield",
			"detail_tab_label": "战斗地点",
			"report_count": entry_contracts.size(),
			"report_count_label": "%s 条" % str(entry_contracts.size()),
		}
		if list_page != null and list_page.has_method("set_page_payload"):
			list_page.call("set_page_payload", {
				"page_contract": {
					"page_id": "organization_battle_reports",
					"page_label": _organization_battle_report_label(),
					"list_frame_contract": {
						"hide_summary_card": true,
						"hide_shared_state_card": true,
						"show_utility_rail": true,
						"embedded_chrome_mode": ORGANIZATION_BATTLE_REPORT_EMBEDDED_CHROME_MODE,
					},
					"entry_contracts": entry_contracts,
				},
				"shared_state": shared_state,
			})
	if list_page != null and list_page.has_signal("report_selected"):
		list_page.connect("report_selected", func(report_id: String) -> void:
			_organization_battle_report_selected_id = report_id.strip_edges()
			set_active_page_id("battle_reports/detail")
		)
	refresh_list.call(_organization_battle_report_selected_id)
	return panel


func _build_organization_battle_report_detail_panel(section_payload: Dictionary) -> Control:
	var panel := _make_home_panel(Color(0.018, 0.012, 0.009, 0.50), Color(0.88, 0.42, 0.24, 0.56))
	panel.name = "OrganizationBattleReportDetailBlock"
	panel.custom_minimum_size = Vector2(0, 520)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var margin := UI_COMPONENT_FACTORY.make_margin(12, 12, 12, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)

	var contracts := _build_organization_battle_report_contracts(section_payload)
	var entry_contracts: Array = contracts.get("entry_contracts", []) as Array
	var detail_contracts_by_id: Dictionary = contracts.get("detail_contracts_by_id", {}) as Dictionary
	var resolved_report_id := _organization_battle_report_selected_id.strip_edges()
	if resolved_report_id == "":
		resolved_report_id = _first_report_id(entry_contracts)
		_organization_battle_report_selected_id = resolved_report_id
	var enemy_detail_cards_variant: Variant = section_payload.get("enemy_dossier_detail_cards", [])
	var enemy_detail_cards: Array = enemy_detail_cards_variant as Array if enemy_detail_cards_variant is Array else []
	var war_room_cards_variant: Variant = section_payload.get("war_room_query_cards", [])
	var war_room_cards: Array = war_room_cards_variant as Array if war_room_cards_variant is Array else []
	var war_room_controls := _build_war_room_drilldown_controls(section_payload)
	if war_room_controls != null:
		column.add_child(war_room_controls)
	if not enemy_detail_cards.is_empty():
		var dossier_title := _make_label("单个敌军档案详情", 18, true)
		dossier_title.name = "OrganizationEnemyDossierDetailTitle"
		dossier_title.add_theme_color_override("font_color", Color(1.0, 0.86, 0.56, 0.98))
		column.add_child(dossier_title)
		var dossier_grid := _build_secondary_stage_card_grid({
			"title": "单个敌军档案详情",
			"cards": enemy_detail_cards.slice(0, 1),
			"columns": 1,
		}, section_payload, "battle_reports/detail")
		dossier_grid.name = "OrganizationEnemyDossierDetailBlock"
		dossier_grid.custom_minimum_size = Vector2(0, 150)
		dossier_grid.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
		column.add_child(dossier_grid)
	if not war_room_cards.is_empty():
		var war_room_title := _make_label("战情室查询", 16, true)
		war_room_title.name = "OrganizationWarRoomQueryTitle"
		war_room_title.add_theme_color_override("font_color", Color(1.0, 0.78, 0.48, 0.96))
		column.add_child(war_room_title)
		var war_room_grid := _build_secondary_stage_card_grid({
			"title": "战情室查询",
			"cards": war_room_cards.slice(0, 8),
			"columns": 2,
		}, section_payload, "battle_reports/detail")
		war_room_grid.name = "OrganizationWarRoomQueryBlock"
		war_room_grid.custom_minimum_size = Vector2(0, 320)
		war_room_grid.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
		column.add_child(war_room_grid)
	var detail_page := BATTLE_REPORT_DETAIL_PAGE_SCENE.instantiate() as Control
	detail_page.name = "OrganizationBattleReportDetailPage"
	detail_page.custom_minimum_size = Vector2(0, 220 if (not enemy_detail_cards.is_empty() or not war_room_cards.is_empty()) else 500)
	detail_page.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	detail_page.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(detail_page)
	var shared_state := {
		"page_id": "detail",
		"page_id_label": "%s详情" % _organization_battle_report_label(),
		"list_mode": "organization",
		"list_mode_label": _organization_label(),
		"selected_report": resolved_report_id,
		"selected_report_label": resolved_report_id,
		"detail_tab": "battlefield",
		"detail_tab_label": "战斗地点",
		"report_count": entry_contracts.size(),
		"report_count_label": "%s 条" % str(entry_contracts.size()),
	}
	if detail_page != null and detail_page.has_method("set_page_payload"):
		detail_page.call("set_page_payload", {
			"active_tab_id": "battlefield",
			"page_contract": detail_contracts_by_id.get(resolved_report_id, {}),
			"shared_state": shared_state,
		})
	if detail_page != null and detail_page.has_signal("coordinate_jump_requested"):
		detail_page.connect("coordinate_jump_requested", Callable(self, "_on_coordinate_jump_requested"))
	return panel


func _build_nation_midgame_luoyang_route_button() -> Button:
	var player_ui := _nation_midgame_player_ui_copy()
	var route_cta_variant: Variant = player_ui.get("objective_route_cta", {})
	var route_cta: Dictionary = route_cta_variant as Dictionary if route_cta_variant is Dictionary else {}
	var visible_label := str(route_cta.get("button_label", NATION_MIDGAME_LUOYANG_ROUTE_LABEL)).strip_edges()
	if visible_label == "":
		visible_label = NATION_MIDGAME_LUOYANG_ROUTE_LABEL
	var tooltip := str(route_cta.get("button_tooltip", "前往洛阳目标")).strip_edges()
	if tooltip == "":
		tooltip = "前往洛阳目标"
	var action_id := str(route_cta.get("action_id", NATION_MIDGAME_LUOYANG_ROUTE_ACTION_ID)).strip_edges()
	if action_id == "":
		action_id = NATION_MIDGAME_LUOYANG_ROUTE_ACTION_ID
	var button_node_name := str(route_cta.get("button_node_name", "NationMidgameLuoyangRouteButton")).strip_edges()
	if button_node_name == "":
		button_node_name = "NationMidgameLuoyangRouteButton"
	var target_label := str(route_cta.get("target_label", "洛阳")).strip_edges()
	var target_surface := str(route_cta.get("target_surface", "天下舆图")).strip_edges()
	var target_subtitle := str(route_cta.get("target_subtitle", "争夺目标")).strip_edges()
	var button := Button.new()
	button.name = button_node_name
	button.text = visible_label
	button.tooltip_text = tooltip
	button.custom_minimum_size = Vector2(168, 46)
	button.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	button.set_meta("nation_midgame_route_action_id", action_id)
	button.set_meta("nation_midgame_route_scope", NATION_MIDGAME_ROUTE_SCOPE)
	button.set_meta("player_visible_label", visible_label)
	button.set_meta("route_target_label", target_label)
	button.set_meta("route_target_surface", target_surface)
	button.set_meta("route_target_subtitle", target_subtitle)
	_apply_organization_paper_command_button_style(button, true, true)
	button.pressed.connect(func() -> void:
		page_action_requested.emit("nation/midgame", "open_tianxia_luoyang_target")
		action_requested.emit(_current_top_tab_id, "open_tianxia_luoyang_target")
	)
	return button


func _build_war_room_drilldown_controls(section_payload: Dictionary) -> Control:
	var drilldown_variant: Variant = section_payload.get("war_room_drilldown", {})
	var drilldown: Dictionary = drilldown_variant as Dictionary if drilldown_variant is Dictionary else {}
	if drilldown.is_empty():
		return null
	var filter_options: Array = drilldown.get("enemyFilterOptions", []) as Array if drilldown.get("enemyFilterOptions", []) is Array else []
	var history_pages: Array = drilldown.get("enemyHistoryPages", []) as Array if drilldown.get("enemyHistoryPages", []) is Array else []
	var live_updates: Array = drilldown.get("liveIncomingAttackUpdates", []) as Array if drilldown.get("liveIncomingAttackUpdates", []) is Array else []
	var response_plans: Array = drilldown.get("responsePlanCandidates", []) as Array if drilldown.get("responsePlanCandidates", []) is Array else []
	var defense_outcome_rows: Array = drilldown.get("defenseExecutionOutcomeRows", []) as Array if drilldown.get("defenseExecutionOutcomeRows", []) is Array else []
	var defense_settlement_entries: Array = drilldown.get("defenseSettlementRecapEntries", []) as Array if drilldown.get("defenseSettlementRecapEntries", []) is Array else []
	var access_scope: Dictionary = drilldown.get("warRoomAccessScope", {}) as Dictionary if drilldown.get("warRoomAccessScope", {}) is Dictionary else {}
	var ui_state: Dictionary = drilldown.get("uiState", {}) as Dictionary if drilldown.get("uiState", {}) is Dictionary else {}
	if filter_options.is_empty() and history_pages.is_empty() and live_updates.is_empty() and response_plans.is_empty():
		return null
	var saved_enemy_id := str(ui_state.get("selectedEnemyId", "")).strip_edges()
	if saved_enemy_id != "":
		_war_room_selected_enemy_id = saved_enemy_id
	var saved_history_page := int(ui_state.get("enemyHistoryPage", 0))
	if saved_history_page > 0 and _war_room_selected_enemy_id != "":
		_war_room_history_page_by_enemy[_war_room_selected_enemy_id] = saved_history_page
	if _war_room_selected_enemy_id == "" and not filter_options.is_empty() and filter_options[0] is Dictionary:
		_war_room_selected_enemy_id = str((filter_options[0] as Dictionary).get("enemyId", "")).strip_edges()
	var panel := _make_home_panel(Color(0.028, 0.024, 0.020, 0.58), Color(0.92, 0.60, 0.32, 0.42))
	panel.name = "OrganizationWarRoomDrilldownControls"
	panel.custom_minimum_size = Vector2(0, 134)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := UI_COMPONENT_FACTORY.make_margin(10, 10, 10, 10)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)
	var title := _make_label("战情室操作台", 16, true)
	title.name = "OrganizationWarRoomDrilldownTitle"
	title.add_theme_color_override("font_color", Color(1.0, 0.84, 0.56, 0.98))
	column.add_child(title)
	var filter_row := HBoxContainer.new()
	filter_row.name = "OrganizationWarRoomEnemyFilterControlRow"
	filter_row.add_theme_constant_override("separation", 8)
	column.add_child(filter_row)
	var filter_label := _make_label("按敌军筛选", 13, true)
	filter_label.name = "OrganizationWarRoomEnemyFilterLabel"
	filter_row.add_child(filter_label)
	var filter_index := 0
	for option_variant in filter_options.slice(0, 3):
		if not (option_variant is Dictionary):
			continue
		var option: Dictionary = option_variant as Dictionary
		filter_index += 1
		var enemy_id := str(option.get("enemyId", "敌军%s" % str(filter_index))).strip_edges()
		var button := Button.new()
		button.name = "OrganizationWarRoomEnemyFilterButton_%s" % str(filter_index)
		button.text = "敌军%s" % str(filter_index)
		button.tooltip_text = str(option.get("playerFacingSummary", "按敌军筛选"))
		button.custom_minimum_size = Vector2(82, 34)
		button.add_theme_font_size_override("font_size", 13)
		button.disabled = enemy_id == _war_room_selected_enemy_id
		button.pressed.connect(func() -> void:
			_war_room_selected_enemy_id = enemy_id
			_war_room_history_page_by_enemy[enemy_id] = int(_war_room_history_page_by_enemy.get(enemy_id, 1))
			page_action_requested.emit("battle_reports/detail", "war_room_ui_state_save::%s::%s" % [enemy_id, str(_war_room_history_page_by_enemy[enemy_id])])
			action_requested.emit("battle_reports", "war_room_ui_state_save::%s::%s" % [enemy_id, str(_war_room_history_page_by_enemy[enemy_id])])
			_render_section_content("battle_reports", "detail")
		)
		filter_row.add_child(button)
	var selected_enemy := _war_room_selected_enemy_id if _war_room_selected_enemy_id != "" else "默认敌军"
	var current_history_page := int(_war_room_history_page_by_enemy.get(selected_enemy, 1))
	var history_row := HBoxContainer.new()
	history_row.name = "OrganizationWarRoomHistoryPaginationRow"
	history_row.add_theme_constant_override("separation", 8)
	column.add_child(history_row)
	var history_label := _make_label("单敌军历史分页 · 第%s页" % str(current_history_page), 13, true)
	history_label.name = "OrganizationWarRoomHistoryPaginationLabel"
	history_row.add_child(history_label)
	var next_button := Button.new()
	next_button.name = "OrganizationWarRoomNextHistoryPageButton"
	next_button.text = "下一页"
	next_button.tooltip_text = "切换当前敌军的历史分页，本页显示战情摘要。"
	next_button.custom_minimum_size = Vector2(88, 34)
	next_button.add_theme_font_size_override("font_size", 13)
	next_button.pressed.connect(func() -> void:
		_war_room_history_page_by_enemy[selected_enemy] = current_history_page + 1
		page_action_requested.emit("battle_reports/detail", "war_room_ui_state_save::%s::%s" % [selected_enemy, str(current_history_page + 1)])
		action_requested.emit("battle_reports", "war_room_ui_state_save::%s::%s" % [selected_enemy, str(current_history_page + 1)])
		_render_section_content("battle_reports", "detail")
	)
	history_row.add_child(next_button)
	var live_refresh: Dictionary = drilldown.get("liveRefresh", {}) as Dictionary if drilldown.get("liveRefresh", {}) is Dictionary else {}
	var live_label := _make_label("战情刷新已开启 · 已刷新%s次 · 最新来袭%s条 · 序号%s" % [str(_war_room_live_refresh_count), str(live_updates.size()), str(live_refresh.get("pushSequence", "-"))], 13, true)
	live_label.name = "OrganizationWarRoomLiveRefreshStatus"
	live_label.add_theme_color_override("font_color", Color(0.74, 0.92, 1.0, 0.94))
	history_row.add_child(live_label)
	if not access_scope.is_empty():
		var scope_label := _make_label(str(access_scope.get("permissionSummary", "")), 13, true)
		scope_label.name = "OrganizationWarRoomAccessScopeStatus"
		scope_label.add_theme_color_override("font_color", Color(0.85, 0.93, 1.0, 0.92))
		panel.add_child(scope_label)
	if not defense_outcome_rows.is_empty():
		var outcome: Dictionary = defense_outcome_rows[0] as Dictionary if defense_outcome_rows[0] is Dictionary else {}
		var outcome_label := _make_label(str(outcome.get("playerFacingSummary", "")), 13, true)
		outcome_label.name = "OrganizationWarRoomDefenseOutcomeStatus"
		outcome_label.add_theme_color_override("font_color", Color(0.82, 0.96, 0.86, 0.92))
		panel.add_child(outcome_label)
	var batch_button := Button.new()
	batch_button.name = "OrganizationWarRoomBatchDefenseProposalButton"
	batch_button.text = "批量防守分配候选"
	batch_button.tooltip_text = "等待真人确认后提交多成员驻防计划。"
	batch_button.custom_minimum_size = Vector2(170, 34)
	batch_button.add_theme_font_size_override("font_size", 13)
	batch_button.pressed.connect(func() -> void:
		page_action_requested.emit("battle_reports/detail", "war_room_batch_defense_candidate")
		action_requested.emit("battle_reports", "war_room_batch_defense_candidate")
	)
	history_row.add_child(batch_button)
	if not response_plans.is_empty() and response_plans[0] is Dictionary:
		var readiness := _make_label(str((response_plans[0] as Dictionary).get("batchProposalReadinessSummary", "等待真人确认")), 12, false)
		readiness.name = "OrganizationWarRoomBatchDefenseReadiness"
		readiness.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		readiness.add_theme_color_override("font_color", Color(1.0, 0.90, 0.66, 0.92))
		column.add_child(readiness)
	if not ui_state.is_empty():
		var ui_state_label := _make_label(str(ui_state.get("playerFacingSummary", "玩家筛选和分页状态已保存。")), 12, false)
		ui_state_label.name = "OrganizationWarRoomUiStateStatus"
		ui_state_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		ui_state_label.add_theme_color_override("font_color", Color(0.78, 0.95, 0.82, 0.92))
		column.add_child(ui_state_label)
	if not defense_settlement_entries.is_empty() and defense_settlement_entries[0] is Dictionary:
		var settlement_label := _make_label(str((defense_settlement_entries[0] as Dictionary).get("playerFacingSummary", "防守结算复盘已更新。")), 12, false)
		settlement_label.name = "OrganizationWarRoomDefenseSettlementStatus"
		settlement_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		settlement_label.add_theme_color_override("font_color", Color(0.95, 0.84, 0.66, 0.92))
		column.add_child(settlement_label)
	return panel


func _build_organization_battle_report_contracts(section_payload: Dictionary) -> Dictionary:
	var block := _find_content_block(section_payload, "OrganizationBattleReportListBlock")
	var reports_variant: Variant = block.get("reports", [])
	var reports: Array = reports_variant as Array if reports_variant is Array else []
	var battle_records_variant: Variant = block.get("battleRecords", block.get("battle_records", []))
	var battle_records: Array = battle_records_variant as Array if battle_records_variant is Array else []
	if reports.is_empty() and battle_records.is_empty():
		reports = _default_organization_battle_report_rows(section_payload)
	var presenter = BATTLE_REPORT_PRESENTER_SCRIPT.new()
	presenter.configure({
		"reports": reports,
		"feedback": {
			"battleRecords": battle_records,
		},
		"factions": {
			"player": {
				"factionName": _snapshot_string("alliance_name", DEFAULT_ALLIANCE_NAME),
				"nation": _organization_label(),
			},
		},
	}, {}, "player")
	var snapshot: Dictionary = presenter.build_snapshot({
		"source": "organization_battle_reports",
		"organization_context": {
			"id": "player",
			"faction_id": "player",
			"name": _snapshot_string("alliance_name", DEFAULT_ALLIANCE_NAME),
			"label": _organization_label(),
		},
	})
	var modes: Dictionary = snapshot.get("list_modes", {}) as Dictionary
	var personal: Dictionary = modes.get("personal", {}) as Dictionary
	var entry_contracts: Array = personal.get("entry_contracts", []) as Array
	var detail_contracts_by_id: Dictionary = personal.get("detail_contracts_by_id", {}) as Dictionary
	if entry_contracts.is_empty():
		var empty_contracts: Dictionary = BATTLE_REPORT_PRESENTER_SCRIPT.build_empty_state_contracts()
		entry_contracts = empty_contracts.get("entry_contracts", []) as Array
		detail_contracts_by_id = empty_contracts.get("detail_contracts_by_id", {}) as Dictionary
	return {
		"entry_contracts": entry_contracts,
		"detail_contracts_by_id": detail_contracts_by_id,
	}


func _default_organization_battle_report_rows(section_payload: Dictionary) -> Array:
	var reports: Array = []
	var cards := _secondary_stage_cards({"cards": section_payload.get("item_cards", [])}, section_payload)
	var index := 0
	for card_variant in cards:
		if not (card_variant is Dictionary):
			continue
		var card := card_variant as Dictionary
		index += 1
		reports.append({
			"id": "organization_report_%s" % str(index),
			"attacker": _snapshot_string("alliance_name", DEFAULT_ALLIANCE_NAME),
			"defender": str(card.get("title", "敌对目标")),
			"region": str(card.get("meta", "组织战区")),
			"result": "胜" if index % 2 == 1 else "未结",
			"time": "最近 %s" % str(index),
			"summary": str(card.get("description", "组织战报详情待接入。")),
			"attackerTroops": 8600 + index * 420,
			"attackerMaxTroops": 12000,
			"defenderTroops": 6800 + index * 360,
			"defenderMaxTroops": 11000,
			"alliedSupport": str(3 + index),
		})
	if reports.is_empty():
		reports.append({
			"id": "organization_report_empty",
			"attacker": _snapshot_string("alliance_name", DEFAULT_ALLIANCE_NAME),
			"defender": "暂无敌情",
			"region": "组织战情",
			"result": "未结",
			"time": "--",
			"summary": "当前没有新的组织战报，列表和详情结构保留。",
		})
	return reports


func _first_report_id(entry_contracts: Array) -> String:
	for entry_variant in entry_contracts:
		if not (entry_variant is Dictionary):
			continue
		var report_id := str((entry_variant as Dictionary).get("report_id", "")).strip_edges()
		if report_id != "":
			return report_id
	return ""


func _uses_bespoke_secondary_stage(page_id: String) -> bool:
	match page_id.strip_edges():
		"governance/officers", "governance/founding", "diplomacy/relations", "battle_reports/latest", "battle_reports/detail", "battle_reports/log", "nation/midgame", "nation/policy", "nation/market":
			return true
		_:
			return false


func _active_secondary_stage_layout_mode(active_page_id: String) -> String:
	if active_page_id == "members/overview" or _uses_bespoke_secondary_stage(active_page_id):
		return ORGANIZATION_SECONDARY_STAGE_LAYOUT_MODE
	return ""


func _active_secondary_page_factory_boundary(active_page_id: String) -> String:
	if _uses_bespoke_secondary_stage(active_page_id):
		return ORGANIZATION_SECONDARY_PAGE_FACTORY_BOUNDARY
	if active_page_id == "members/overview":
		return "bespoke_member_roster_stage_without_child_page_dual_column_v1"
	return ""


func _secondary_stage_node_name(page_id: String) -> String:
	match page_id:
		"governance/officers":
			return "OrganizationOfficerSingleStage"
		"governance/founding":
			return "OrganizationNationFoundingSingleStage"
		"diplomacy/relations":
			return "OrganizationDiplomacySingleStage"
		"battle_reports/latest":
			return "OrganizationBattleReportSingleStage"
		"battle_reports/detail":
			return "OrganizationBattleReportDetailSingleStage"
		"battle_reports/log":
			return "OrganizationLogSingleStage"
		"nation/midgame":
			return "OrganizationNationMidgameSingleStage"
		"nation/policy":
			return "OrganizationPolicySingleStage"
		"nation/market":
			return "OrganizationMarketSingleStage"
		_:
			return "OrganizationSecondarySingleStage"


func _secondary_stage_art_modulate(page_id: String) -> Color:
	match page_id:
		"diplomacy/relations":
			return Color(1.0, 0.98, 0.94, 0.94)
		"battle_reports/latest", "battle_reports/detail", "battle_reports/log":
			return Color(1.0, 0.94, 0.88, 0.94)
		"nation/midgame", "nation/policy", "nation/market":
			return Color(1.0, 0.98, 0.90, 0.95)
		_:
			return Color(1.0, 0.96, 0.88, 0.94)


func _secondary_page_title(section_payload: Dictionary, page_id: String) -> String:
	var title := str(section_payload.get("summary_title", section_payload.get("title", ""))).strip_edges()
	if title != "":
		return title
	match page_id:
		"governance/officers":
			return "官员任命"
		"governance/founding":
			return "立国"
		"diplomacy/relations":
			return "外交关系"
		"battle_reports/latest":
			return _organization_battle_report_label()
		"battle_reports/detail":
			return "%s详情" % _organization_battle_report_label()
		"battle_reports/log":
			return "组织日志"
		"nation/midgame":
			return "国家中局"
		"nation/policy":
			return "国家政策"
		"nation/market":
			return "国家市井"
		_:
			return "组织页"


func _secondary_page_seal(page_id: String) -> String:
	match page_id:
		"governance/officers":
			return "官"
		"governance/founding":
			return "立"
		"diplomacy/relations":
			return "外"
		"battle_reports/latest":
			return "战"
		"battle_reports/detail":
			return "详"
		"battle_reports/log":
			return "志"
		"nation/midgame":
			return "国"
		"nation/policy":
			return "政"
		"nation/market":
			return "市"
		_:
			return "盟"


func _secondary_page_stat_line(page_id: String) -> String:
	match page_id:
		"governance/officers":
			return "成员 %s | 指挥 %s | 城池 %s" % [str(_snapshot_int("member_count", 0)), str(_snapshot_int("commander_count", 0)), str(_snapshot_int("owned_city_count", _snapshot_int("territory_count", 0)))]
		"governance/founding":
			return "%s | 都城 %s" % [_lifecycle_label(), _nation_profile_capital_name()]
		"diplomacy/relations":
			return "友好 %s | 敌对 %s | 中立 %s" % [str(_snapshot_int("friendly_relation_count", 0)), str(_snapshot_int("hostile_relation_count", 0)), str(_snapshot_int("neutral_relation_count", 0))]
		"battle_reports/latest":
			return "战报 %s | 行动 %s | 城池 %s" % [str(_snapshot_int("report_count", 0)), str(_snapshot_int("recent_action_count", 0)), str(_snapshot_int("owned_city_count", _snapshot_int("territory_count", 0)))]
		"battle_reports/detail":
			return "详情 | 战报 %s | 城池 %s" % [str(_snapshot_int("report_count", 0)), str(_snapshot_int("owned_city_count", _snapshot_int("territory_count", 0)))]
		"battle_reports/log":
			return "日志 %s | 行动 %s | 战报 %s" % [str(_snapshot_int("organization_log_count", _snapshot_int("recent_action_count", 0))), str(_snapshot_int("recent_action_count", 0)), str(_snapshot_int("report_count", 0))]
		"nation/midgame":
			return "国家目标"
		"nation/policy":
			return "%s | 城池 %s | 资源加成 %s" % [_lifecycle_label(), str(_snapshot_int("owned_city_count", _snapshot_int("territory_count", 0))), _format_home_commandery_bonus_label()]
		"nation/market":
			return "%s | 府库供给 | 城池 %s" % [_lifecycle_label(), str(_snapshot_int("owned_city_count", _snapshot_int("territory_count", 0)))]
		_:
			return "成员 %s | 城池 %s" % [str(_snapshot_int("member_count", 0)), str(_snapshot_int("owned_city_count", _snapshot_int("territory_count", 0)))]


func _secondary_page_short_status(page_id: String) -> String:
	match page_id:
		"governance/officers":
			return "任免"
		"governance/founding":
			return "晋升" if _organization_kind() == "nation" else "立国"
		"diplomacy/relations":
			return "关系"
		"battle_reports/latest":
			return _lifecycle_label()
		"battle_reports/detail":
			return "详情"
		"battle_reports/log":
			return "日志"
		"nation/midgame":
			return "目标"
		"nation/policy":
			return "政策"
		"nation/market":
			return "供给"
		_:
			return "组织"


func _secondary_primary_content_block(section_payload: Dictionary, page_id: String) -> Dictionary:
	var preferred_node := ""
	var preferred_kind := "card_grid"
	match page_id:
		"governance/officers":
			preferred_node = "OrganizationOfficerHierarchyCanvasBlock"
			preferred_kind = "hierarchy_canvas"
		"diplomacy/relations":
			preferred_node = "OrganizationDiplomacyRelationBoardBlock"
			preferred_kind = "relation_board"
		"battle_reports/latest":
			preferred_node = "OrganizationBattleReportListBlock"
			preferred_kind = "battle_report_list"
		"battle_reports/detail":
			preferred_node = "OrganizationBattleReportListBlock"
			preferred_kind = "battle_report_list"
		"battle_reports/log":
			preferred_node = "OrganizationLogFilterTimelineBlock"
			preferred_kind = "timeline_cards"
		"nation/policy":
			preferred_node = "OrganizationPolicyTreeCanvasBlock"
			preferred_kind = "policy_tree_canvas"
		"nation/market":
			preferred_node = "OrganizationMarketSupplyCardGridBlock"
			preferred_kind = "market_supply"
	var blocks_variant: Variant = section_payload.get("content_blocks", [])
	if blocks_variant is Array:
		for block_variant in blocks_variant as Array:
			if not (block_variant is Dictionary):
				continue
			var block := block_variant as Dictionary
			if str(block.get("node_name", "")).strip_edges() == preferred_node:
				return block
		for block_variant in blocks_variant as Array:
			if not (block_variant is Dictionary):
				continue
			var block := block_variant as Dictionary
			if str(block.get("kind", "")).strip_edges() == preferred_kind:
				return block
	return {
		"kind": preferred_kind,
		"title": _secondary_page_title(section_payload, page_id),
		"cards": section_payload.get("item_cards", []),
		"rows": [],
	}


func _secondary_stage_cards(block_payload: Dictionary, section_payload: Dictionary) -> Array:
	var cards_variant: Variant = block_payload.get("cards", [])
	if cards_variant is Array and not (cards_variant as Array).is_empty():
		return cards_variant as Array
	var item_cards_variant: Variant = section_payload.get("item_cards", [])
	if item_cards_variant is Array and not (item_cards_variant as Array).is_empty():
		return item_cards_variant as Array
	return []


func _secondary_stage_table_columns(block_payload: Dictionary) -> Array:
	var columns_variant: Variant = block_payload.get("columns", [])
	if columns_variant is Array:
		return columns_variant as Array
	return []


func _secondary_stage_table_rows(block_payload: Dictionary) -> Array:
	var rows_variant: Variant = block_payload.get("rows", [])
	if rows_variant is Array:
		return rows_variant as Array
	return []


func _secondary_stage_grid_columns(block_payload: Dictionary, page_id: String) -> int:
	match page_id:
		"nation/policy", "nation/market":
			return 3
		_:
			return maxi(1, mini(2, int(block_payload.get("columns", 2))))


func _secondary_stage_edge_note(section_payload: Dictionary) -> String:
	var blocks_variant: Variant = section_payload.get("content_blocks", [])
	if not (blocks_variant is Array):
		return ""
	for block_variant in blocks_variant as Array:
		if not (block_variant is Dictionary):
			continue
		var block := block_variant as Dictionary
		if str(block.get("kind", "")).strip_edges() != "text_block":
			continue
		var lines := _coerce_string_array(block.get("lines", []))
		if not lines.is_empty():
			return str(lines[0])
	return ""


func _secondary_table_cell(row_payload: Dictionary, columns: Array, column_id: String, fallback: String) -> String:
	if row_payload.has(column_id):
		return str(row_payload.get(column_id, fallback)).strip_edges()
	for column_variant in columns:
		if not (column_variant is Dictionary):
			continue
		var column := column_variant as Dictionary
		var resolved_id := str(column.get("id", "")).strip_edges()
		if resolved_id == column_id:
			return str(row_payload.get(resolved_id, fallback)).strip_edges()
	return fallback


func _resolve_relation_accent(relation: String) -> Color:
	var text := relation.strip_edges()
	if text.contains("敌") or text.to_lower().contains("hostile"):
		return Color(0.82, 0.26, 0.18, 0.82)
	if text.contains("友") or text.to_lower().contains("friendly"):
		return Color(0.28, 0.54, 0.78, 0.78)
	if text.contains("中"):
		return Color(0.82, 0.60, 0.24, 0.70)
	return Color(0.74, 0.50, 0.22, 0.54)


func _secondary_page_accent_color(page_id: String, alpha: float) -> Color:
	match page_id:
		"diplomacy/relations":
			return Color(0.48, 0.62, 0.86, alpha)
		"battle_reports/latest", "battle_reports/detail", "battle_reports/log":
			return Color(0.88, 0.42, 0.24, alpha)
		"governance/founding":
			return Color(0.92, 0.56, 0.26, alpha)
		"nation/policy":
			return Color(0.92, 0.68, 0.30, alpha)
		"nation/market":
			return Color(0.84, 0.60, 0.22, alpha)
		_:
			return Color(0.82, 0.56, 0.24, alpha)


func _build_home_status_panel() -> Control:
	var panel := _make_home_panel(Color(0.030, 0.020, 0.012, 0.48), Color(0.90, 0.66, 0.34, 0.22))
	panel.name = "OrganizationHomeStatusPanel"
	panel.custom_minimum_size = Vector2(HOME_LEFT_COLUMN_WIDTH, 0)
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var margin := UI_COMPONENT_FACTORY.make_margin(20, 22, 18, 20)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 9)
	margin.add_child(column)

	column.add_child(_build_home_identity_title_row())
	column.add_child(_make_label("%s · %s" % [_organization_label(), _lifecycle_label()], 14, true))
	column.add_child(_build_progress_line())
	column.add_child(_build_home_stat_row("成员", str(_snapshot_int("member_count", 0))))
	column.add_child(_build_home_stat_row("势力", str(_snapshot_int("organization_power", 0))))
	column.add_child(_build_home_stat_row("所属州", _snapshot_string("organization_state_name", "未知州")))
	column.add_child(_build_home_stat_row("城池", str(_snapshot_int("owned_city_count", _snapshot_int("territory_count", 0)))))
	column.add_child(_build_home_stat_row("城池加成", _format_home_commandery_bonus_label()))
	for bonus_line in _format_home_city_bonus_detail_lines():
		column.add_child(_make_label(bonus_line, 12, true))

	var founding_lines := _filtered_founding_requirement_lines()
	if not founding_lines.is_empty() and _organization_kind() != "nation" and _snapshot_bool("found_nation_visible", true):
		column.add_child(_make_divider())
		column.add_child(_make_label("立国条件", 17, true))
		for line in founding_lines.slice(0, 3):
			column.add_child(_make_label(str(line), 13, true))
	return panel


func _build_home_identity_title_row() -> Control:
	var row := HBoxContainer.new()
	row.name = "OrganizationHomeIdentityTitleRow"
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)
	var title := _make_label(_snapshot_string("alliance_name", DEFAULT_ALLIANCE_NAME), 26, true)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	row.add_child(title)
	if _organization_kind() == "nation":
		row.add_child(_build_home_nation_emblem())
	return row


func _build_home_nation_emblem() -> Control:
	var accent := _nation_profile_color_from_hex(_nation_profile_update_color_hex())
	var emblem := PanelContainer.new()
	emblem.name = "OrganizationHomeNationEmblem"
	emblem.custom_minimum_size = Vector2(54, 54)
	emblem.add_theme_stylebox_override("panel", UI_COMPONENT_FACTORY.make_flat_panel_style(
		Color(accent.r, accent.g, accent.b, 0.78),
		Color(1.0, 0.90, 0.64, 0.92),
		1,
		4,
		0.16
	))
	var center := CenterContainer.new()
	emblem.add_child(center)
	var seal := _make_label(_organization_home_nation_emblem_text(), 28)
	seal.name = "OrganizationHomeNationEmblemText"
	seal.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	seal.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	seal.add_theme_color_override("font_color", Color(1.0, 0.94, 0.76, 0.98))
	center.add_child(seal)
	return emblem


func _build_home_hall_panel() -> Control:
	var panel := _make_home_panel(Color(0.060, 0.038, 0.022, 0.30), Color(0.92, 0.66, 0.30, 0.30))
	panel.name = "OrganizationHomeHeroStage"
	panel.custom_minimum_size = Vector2(0, HOME_MIN_VISUAL_HEIGHT)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var margin := UI_COMPONENT_FACTORY.make_margin(10, 10, 10, 10)
	panel.add_child(margin)
	margin.add_child(_build_home_hall_visual_board())
	return panel


func _build_home_hall_visual_board() -> Control:
	var stage := Control.new()
	stage.name = "OrganizationHomeCommandHallArtStage"
	stage.clip_contents = true
	stage.custom_minimum_size = Vector2(0, HOME_ART_STAGE_MIN_HEIGHT)
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var art := TextureRect.new()
	art.name = "OrganizationHomeCommandHallArt"
	art.texture = _load_home_texture(_organization_home_art_asset_path())
	art.custom_minimum_size = Vector2.ZERO
	art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT
	art.modulate = Color(1.0, 0.98, 0.92, 1.0)
	art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fill_parent_rect(art)
	stage.add_child(art)

	var shadow := ColorRect.new()
	shadow.name = "OrganizationHomeArtReadabilityShadow"
	shadow.color = Color(0.030, 0.018, 0.010, 0.18)
	shadow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fill_parent_rect(shadow)
	stage.add_child(shadow)

	var overlay := Control.new()
	overlay.name = "OrganizationHomeArtRealUiOverlay"
	overlay.custom_minimum_size = Vector2.ZERO
	_fill_parent_rect(overlay)
	stage.add_child(overlay)

	var status_panel := _build_home_status_panel()
	_place_home_overlay_rect(status_panel, 30.0, 22.0, HOME_LEFT_COLUMN_WIDTH, HOME_MIN_VISUAL_HEIGHT - 44.0)
	overlay.add_child(status_panel)

	var notice_panel := _build_home_notice_badge()
	_place_home_overlay_rect(notice_panel, -330.0, 30.0, 300.0, 142.0, true)
	overlay.add_child(notice_panel)

	var headline := _make_label("同盟驻地" if _organization_kind() != "nation" else "国家中枢", 34, true)
	headline.modulate = Color(1.0, 0.94, 0.78, 0.92)
	_place_home_overlay_rect(headline, HOME_LEFT_COLUMN_WIDTH + 72.0, 34.0, 520.0, 56.0)
	overlay.add_child(headline)

	var command_cluster := _build_home_art_command_cluster()
	_place_home_overlay_rect(
		command_cluster,
		HOME_LEFT_COLUMN_WIDTH + 76.0,
		HOME_MIN_VISUAL_HEIGHT - 174.0,
		HOME_STAGE_REFERENCE_WIDTH - HOME_LEFT_COLUMN_WIDTH - 148.0,
		146.0
	)
	overlay.add_child(command_cluster)
	var sync_layers := func() -> void:
		_sync_home_art_layer_rect(stage, [art, shadow, overlay])
	stage.resized.connect(sync_layers)
	sync_layers.call()
	return stage


func _build_home_art_command_cluster() -> Control:
	var command_bar := VBoxContainer.new()
	command_bar.name = "OrganizationHomeArtSealEntryFlow"
	command_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	command_bar.custom_minimum_size = Vector2(0, 146)
	command_bar.alignment = BoxContainer.ALIGNMENT_CENTER
	command_bar.add_theme_constant_override("separation", 10)
	if _organization_kind() == "nation":
		command_bar.add_child(_build_home_art_command_row("OrganizationHomeArtPrimaryCommandRow", [
			{"title": "成员", "subtitle": "名册", "page": "members/overview", "enabled": true},
			{"title": "军团", "subtitle": "编制", "page": "members/groups", "enabled": true},
			{"title": "官员", "subtitle": "任命", "page": "governance/officers", "enabled": true},
			{"title": "外交", "subtitle": "关系", "page": "diplomacy/relations", "enabled": true},
			{"title": _organization_battle_report_label(), "subtitle": "", "page": "battle_reports/latest", "enabled": true},
			{"title": "日志", "subtitle": "记录", "page": "battle_reports/log", "enabled": true},
		]))
		command_bar.add_child(_build_home_art_command_row("OrganizationHomeArtSovereignCommandRow", [
			{"title": "国家中局", "subtitle": "目标", "page": "nation/midgame", "enabled": true},
			{"title": "晋升", "subtitle": "帝国", "page": "governance/founding", "enabled": true},
			{"title": "政策", "subtitle": "加成", "page": "nation/policy", "enabled": true},
			{"title": "市井", "subtitle": "供给", "page": "nation/market", "enabled": true},
		]))
	else:
		command_bar.add_child(_build_home_art_command_row("OrganizationHomeArtPrimaryCommandRow", [
			{"title": "成员", "subtitle": "名册", "page": "members/overview", "enabled": true},
			{"title": "军团", "subtitle": "编制", "page": "members/groups", "enabled": true},
			{"title": "官员", "subtitle": "任命", "page": "governance/officers", "enabled": true},
			{"title": "外交", "subtitle": "关系", "page": "diplomacy/relations", "enabled": true},
		]))
		var second_row_entries: Array = [
			{"title": _organization_battle_report_label(), "subtitle": "", "page": "battle_reports/latest", "enabled": true},
			{"title": "日志", "subtitle": "记录", "page": "battle_reports/log", "enabled": true},
		]
		if _snapshot_bool("found_nation_visible", true):
			second_row_entries.append({"title": "立国", "subtitle": "王国", "page": "governance/founding", "enabled": true})
		command_bar.add_child(_build_home_art_command_row("OrganizationHomeArtSovereignCommandRow", second_row_entries))
	return command_bar


func _build_home_art_command_row(row_name: String, entries: Array) -> Control:
	var row := HBoxContainer.new()
	row.name = row_name
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 10)
	for entry_variant in entries:
		if not (entry_variant is Dictionary):
			continue
		var entry := entry_variant as Dictionary
		row.add_child(_build_home_art_command_button(
			str(entry.get("title", "")),
			str(entry.get("subtitle", "")),
			str(entry.get("page", "")),
			bool(entry.get("enabled", true))
		))
	return row


func _organization_home_art_asset_path() -> String:
	if _organization_kind() == "nation":
		return ORGANIZATION_HOME_NATION_ART_ASSET_PATH
	return ORGANIZATION_HOME_ALLIANCE_ART_ASSET_PATH


func _load_home_texture(asset_path: String) -> Texture2D:
	if asset_path.strip_edges() == "":
		return null
	if not FileAccess.file_exists(asset_path):
		if ResourceLoader.exists(asset_path):
			var resource := load(asset_path)
			if resource is Texture2D:
				return resource as Texture2D
		return null
	var image := Image.new()
	var load_error := image.load(asset_path)
	if load_error != OK:
		return null
	return ImageTexture.create_from_image(image)


func _organization_home_art_texture_available(asset_path: String) -> bool:
	if asset_path.strip_edges() == "":
		return false
	return ResourceLoader.exists(asset_path) or FileAccess.file_exists(asset_path)


func _uses_custom_secondary_shell(tab_id: String) -> bool:
	return tab_id in ["members", "governance", "diplomacy", "battle_reports", "nation"]


func _fill_parent_rect(control: Control) -> void:
	control.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	control.offset_left = 0.0
	control.offset_top = 0.0
	control.offset_right = 0.0
	control.offset_bottom = 0.0


func _sync_home_art_layer_rect(parent: Control, layers: Array) -> void:
	if parent == null or not is_instance_valid(parent) or not parent.is_inside_tree():
		return
	var target_size := parent.size
	for raw_layer in layers:
		var layer := raw_layer as Control
		if layer == null or not is_instance_valid(layer) or not layer.is_inside_tree():
			continue
		layer.set_deferred("position", Vector2.ZERO)
		layer.set_deferred("size", target_size)


func _place_home_overlay_rect(control: Control, x: float, y: float, width: float, height: float, from_right: bool = false) -> void:
	control.anchor_top = 0.0
	control.anchor_bottom = 0.0
	control.offset_top = y
	control.offset_bottom = y + height
	if from_right:
		control.anchor_left = 1.0
		control.anchor_right = 1.0
		control.offset_left = x
		control.offset_right = x + width
	else:
		control.anchor_left = 0.0
		control.anchor_right = 0.0
		control.offset_left = x
		control.offset_right = x + width


func _place_home_overlay_span(control: Control, left: float, right: float, top: float, bottom: float) -> void:
	control.anchor_left = 0.0
	control.anchor_right = 1.0
	control.anchor_top = 1.0
	control.anchor_bottom = 1.0
	control.offset_left = left
	control.offset_right = right
	control.offset_top = top
	control.offset_bottom = bottom


func _build_home_stage_chip(value: String, meta: String) -> Control:
	var chip := _make_home_panel(Color(0.040, 0.026, 0.014, 0.66), Color(0.92, 0.66, 0.30, 0.48))
	chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := UI_COMPONENT_FACTORY.make_margin(12, 8, 12, 8)
	chip.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 1)
	margin.add_child(column)
	column.add_child(_make_label(value, 19, true))
	column.add_child(_make_label(meta, 11, true))
	return chip


func _build_home_art_command_button(title: String, subtitle: String, target_page_id: String, enabled: bool) -> Button:
	var button := _build_home_entry_button(title, subtitle, target_page_id, enabled)
	button.custom_minimum_size = Vector2(128, 62)
	_apply_organization_paper_command_button_style(button, true)
	return button


func _apply_organization_paper_command_button_style(button: Button, compact: bool = false, important: bool = false) -> void:
	var font_size := 16 if compact else 21
	if important:
		font_size += 1
	button.add_theme_font_size_override("font_size", font_size)
	button.add_theme_color_override("font_color", Color(0.17, 0.07, 0.025, 0.98))
	button.add_theme_color_override("font_hover_color", Color(0.10, 0.035, 0.010, 1.0))
	button.add_theme_color_override("font_pressed_color", Color(0.09, 0.025, 0.008, 1.0))
	button.add_theme_color_override("font_disabled_color", Color(0.44, 0.36, 0.25, 0.76))
	var normal_fill := Color(0.82, 0.62, 0.34, 0.78) if compact else Color(0.88, 0.69, 0.39, 0.82)
	var hover_fill := Color(0.96, 0.77, 0.43, 0.94)
	var pressed_fill := Color(0.72, 0.48, 0.24, 0.94)
	var disabled_fill := Color(0.38, 0.32, 0.24, 0.58)
	var border := Color(1.0, 0.88, 0.58, 0.92) if important else Color(0.96, 0.78, 0.42, 0.82)
	button.add_theme_stylebox_override("normal", UI_COMPONENT_FACTORY.make_flat_panel_style(normal_fill, border, 2, 5, 0.16))
	button.add_theme_stylebox_override("hover", UI_COMPONENT_FACTORY.make_flat_panel_style(hover_fill, Color(1.0, 0.94, 0.66, 1.0), 2, 6, 0.20))
	button.add_theme_stylebox_override("pressed", UI_COMPONENT_FACTORY.make_flat_panel_style(pressed_fill, Color(1.0, 0.82, 0.48, 1.0), 2, 3, 0.12))
	button.add_theme_stylebox_override("disabled", UI_COMPONENT_FACTORY.make_flat_panel_style(disabled_fill, Color(0.58, 0.48, 0.34, 0.68), 1, 4, 0.08))
	button.add_theme_constant_override("h_separation", 8)
	button.add_theme_constant_override("outline_size", 0)


func _build_home_metric_tile(title: String, value: String, meta: String) -> Control:
	var tile := _make_home_panel(Color(0.155, 0.098, 0.044, 0.86), Color(0.82, 0.58, 0.26, 0.58))
	tile.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := UI_COMPONENT_FACTORY.make_margin(12, 10, 12, 10)
	tile.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 4)
	margin.add_child(column)
	column.add_child(_make_label(title, 13, true))
	column.add_child(_make_label(value, 28, true))
	column.add_child(_make_label(meta, 12, true))
	return tile


func _build_home_route_node(title: String, value: String, meta: String) -> Control:
	var node := _make_home_panel(Color(0.176, 0.112, 0.050, 0.88), Color(0.88, 0.62, 0.28, 0.58))
	node.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := UI_COMPONENT_FACTORY.make_margin(10, 8, 10, 8)
	node.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 3)
	margin.add_child(column)
	column.add_child(_make_label(title, 13, true))
	column.add_child(_make_label(value, 16, true))
	column.add_child(_make_label(meta, 11, true))
	return node


func _build_home_route_line() -> Control:
	var holder := CenterContainer.new()
	holder.custom_minimum_size = Vector2(34, 0)
	holder.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var line := ColorRect.new()
	line.custom_minimum_size = Vector2(34, 2)
	line.color = Color(0.86, 0.62, 0.28, 0.62)
	holder.add_child(line)
	return holder


func _build_home_notice_panel() -> Control:
	var panel := _make_home_panel(Color(0.112, 0.076, 0.046, 0.94), Color(0.74, 0.54, 0.26, 0.76))
	panel.name = "OrganizationHomeNoticeFeed"
	panel.custom_minimum_size = Vector2(HOME_RIGHT_COLUMN_WIDTH, 0)
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var margin := UI_COMPONENT_FACTORY.make_margin(16, 16, 16, 16)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)

	column.add_child(_make_label(_snapshot_string("announcement_title", "组织公告"), 20, true))
	column.add_child(_make_label(_snapshot_string("announcement_body", "暂无公告。"), 14, true))
	column.add_child(_make_divider())
	column.add_child(_make_label("最近日志", 17, true))
	for line in _snapshot_string_array("recent_log_lines").slice(0, 3):
		column.add_child(_make_label(str(line), 13, true))
	column.add_child(_make_divider())
	column.add_child(_make_label("最近战报", 17, true))
	for line in _snapshot_string_array("recent_report_lines").slice(0, 3):
		column.add_child(_make_label(str(line), 13, true))
	return panel


func _build_home_notice_badge() -> Control:
	var panel := _make_home_panel(Color(0.020, 0.014, 0.010, 0.54), Color(0.90, 0.64, 0.28, 0.34))
	panel.name = "OrganizationHomeNoticeFeed"
	panel.custom_minimum_size = Vector2(300, 142)

	var margin := UI_COMPONENT_FACTORY.make_margin(14, 12, 14, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 7)
	margin.add_child(column)

	column.add_child(_make_label(_snapshot_string("announcement_title", "组织公告"), 18, true))
	var body := _make_label(_snapshot_string("announcement_body", "暂无公告。"), 12, true)
	body.add_theme_color_override("font_color", Color(0.93, 0.86, 0.72, 0.92))
	column.add_child(body)
	var latest_lines := _snapshot_string_array("recent_log_lines")
	if not latest_lines.is_empty():
		var log_line := _make_label("近况：" + str(latest_lines[0]), 12, true)
		log_line.add_theme_color_override("font_color", Color(0.86, 0.74, 0.56, 0.86))
		column.add_child(log_line)
	return panel


func _build_home_entry_panel() -> Control:
	var panel := _make_home_panel(Color(0.104, 0.070, 0.038, 0.92), Color(0.76, 0.52, 0.22, 0.72))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	var margin := UI_COMPONENT_FACTORY.make_margin(14, 14, 14, 14)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)
	column.add_child(_make_label("组织入口", 18, true))

	var entries := HFlowContainer.new()
	entries.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	entries.add_theme_constant_override("h_separation", 10)
	entries.add_theme_constant_override("v_separation", 10)
	column.add_child(entries)

	entries.add_child(_build_home_entry_button("成员", "名册与坐标", "members/overview", true))
	entries.add_child(_build_home_entry_button("军团", "分组编制", "members/groups", true))
	entries.add_child(_build_home_entry_button("官员", "权限职责", "governance/officers", true))
	entries.add_child(_build_home_entry_button("外交", "友好敌对", "diplomacy/relations", true))
	entries.add_child(_build_home_entry_button(_organization_battle_report_label(), "战况", "battle_reports/latest", true))
	entries.add_child(_build_home_entry_button("日志", "组织记录", "battle_reports/log", true))
	if _organization_kind() == "nation":
		entries.add_child(_build_home_entry_button("国家中局", "目标", "nation/midgame", true))
		entries.add_child(_build_home_entry_button("晋升", "帝国", "governance/founding", true))
		entries.add_child(_build_home_entry_button("政策", "加成", "nation/policy", true))
		entries.add_child(_build_home_entry_button("市井", "资源供给", "nation/market", true))
	else:
		entries.add_child(_build_home_entry_button("立国", "王国", "governance/founding", _snapshot_bool("found_nation_visible", true)))
	return panel


func _build_home_entry_button(title: String, subtitle: String, target_page_id: String, enabled: bool) -> Button:
	var button := Button.new()
	button.name = "OrganizationHomeEntryButton_%s" % target_page_id.replace("/", "_")
	button.text = title if subtitle.strip_edges() == "" else "%s\n%s" % [title, subtitle]
	button.disabled = not enabled
	button.custom_minimum_size = Vector2(HOME_ENTRY_BUTTON_MIN_WIDTH, HOME_ENTRY_BUTTON_MIN_HEIGHT)
	button.set_meta("organization_home_entry_button_token", ORGANIZATION_HOME_ENTRY_BUTTON_TOKEN)
	button.set_meta("organization_home_entry_live_text_contract", ORGANIZATION_HOME_ENTRY_LIVE_TEXT_CONTRACT)
	button.set_meta("organization_home_entry_label", title)
	button.set_meta("organization_home_entry_target_page_id", target_page_id)
	button.add_theme_font_size_override("font_size", 15)
	button.add_theme_color_override("font_color", Color(0.98, 0.90, 0.72, 0.98))
	button.add_theme_color_override("font_disabled_color", Color(0.58, 0.54, 0.46, 0.78))
	button.add_theme_stylebox_override("normal", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(0.175, 0.105, 0.048, 0.96), Color(0.82, 0.58, 0.26, 0.86), 1, 4, 0.14))
	button.add_theme_stylebox_override("hover", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(0.230, 0.145, 0.065, 0.98), Color(0.98, 0.74, 0.35, 0.96), 1, 5, 0.18))
	button.add_theme_stylebox_override("pressed", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(0.122, 0.080, 0.040, 0.98), Color(1.00, 0.78, 0.40, 1.0), 1, 2, 0.10))
	button.add_theme_stylebox_override("disabled", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(0.070, 0.064, 0.058, 0.72), Color(0.28, 0.24, 0.18, 0.72), 1))
	if enabled:
		button.pressed.connect(func() -> void:
			set_active_page_id(target_page_id)
		)
	return button


func _organization_home_art_entry_labels() -> String:
	var flow := find_child("OrganizationHomeArtSealEntryFlow", true, false) as Control
	if flow == null:
		return ""
	var labels: Array[String] = []
	_collect_home_art_entry_button_labels(flow, labels)
	return "/".join(labels)


func _organization_home_entry_button_labels() -> String:
	var labels: Array[String] = []
	_collect_home_entry_button_meta("organization_home_entry_label", labels)
	return "/".join(labels)


func _organization_home_entry_target_page_ids() -> String:
	var target_page_ids: Array[String] = []
	_collect_home_entry_button_meta("organization_home_entry_target_page_id", target_page_ids)
	return "/".join(target_page_ids)


func _count_home_entry_buttons() -> int:
	var labels: Array[String] = []
	_collect_home_entry_button_meta("organization_home_entry_label", labels)
	return labels.size()


func _collect_home_entry_button_meta(meta_key: String, values: Array[String]) -> void:
	_collect_home_entry_button_meta_recursive(self, meta_key, values)


func _collect_home_entry_button_meta_recursive(root: Node, meta_key: String, values: Array[String]) -> void:
	for child in root.get_children():
		if child is Button:
			var button := child as Button
			if str(button.get_meta("organization_home_entry_button_token", "")).strip_edges() == ORGANIZATION_HOME_ENTRY_BUTTON_TOKEN:
				var value := str(button.get_meta(meta_key, "")).strip_edges()
				if value != "":
					values.append(value)
		if child is Node:
			_collect_home_entry_button_meta_recursive(child as Node, meta_key, values)


func _collect_home_art_entry_button_labels(root: Node, labels: Array[String]) -> void:
	for child in root.get_children():
		if child is Button:
			var text := str((child as Button).text).strip_edges()
			if text != "":
				labels.append(text.split("\n")[0])
			continue
		if child is Node:
			_collect_home_art_entry_button_labels(child as Node, labels)


func _organization_home_art_entry_row_count() -> int:
	var flow := find_child("OrganizationHomeArtSealEntryFlow", true, false) as Control
	if flow == null:
		return 0
	var count := 0
	for child in flow.get_children():
		if child is Container and (child as Container).visible and (child as Container).is_visible_in_tree():
			count += 1
	return count


func _organization_home_art_entry_button_count() -> int:
	var labels := _organization_home_art_entry_labels()
	return labels.split("/").size() if labels != "" else 0


func _organization_home_art_stretch_mode_label() -> String:
	var art := find_child("OrganizationHomeCommandHallArt", true, false) as TextureRect
	if art == null:
		return ""
	match art.stretch_mode:
		TextureRect.STRETCH_KEEP_ASPECT_CENTERED:
			return "keep_aspect_centered"
		TextureRect.STRETCH_KEEP_ASPECT_COVERED:
			return "keep_aspect_covered"
		TextureRect.STRETCH_KEEP_ASPECT:
			return "keep_aspect"
		TextureRect.STRETCH_SCALE:
			return "scale"
		_:
			return str(int(art.stretch_mode))


func _organization_home_nation_emblem_visible() -> bool:
	var emblem := find_child("OrganizationHomeNationEmblem", true, false) as Control
	return emblem != null and emblem.visible and emblem.is_visible_in_tree()


func _organization_home_nation_emblem_text() -> String:
	var nation_name := _nation_profile_update_name().strip_edges()
	if nation_name == "":
		nation_name = _snapshot_string("alliance_name", DEFAULT_ALLIANCE_NAME)
	if nation_name.ends_with("国") and nation_name.length() > 1:
		nation_name = nation_name.substr(0, nation_name.length() - 1)
	return nation_name.substr(0, 1) if nation_name != "" else "国"


func _build_summary_seal(label_text: String) -> Control:
	var seal := PanelContainer.new()
	seal.custom_minimum_size = Vector2(56, 56)
	seal.add_theme_stylebox_override("panel", UI_COMPONENT_FACTORY.make_flat_panel_style(Color(0.34, 0.20, 0.07, 0.94), Color(0.94, 0.68, 0.30, 0.94), 1, 4, 0.18))
	var center := CenterContainer.new()
	seal.add_child(center)
	var trimmed := label_text.strip_edges()
	var seal_text := trimmed.substr(0, 1) if trimmed != "" else "盟"
	var label := _make_label(seal_text, 22)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_color_override("font_color", Color(1.0, 0.88, 0.58, 0.98))
	center.add_child(label)
	return seal


func _build_home_seal(title: String, subtitle: String, target_page_id: String) -> Control:
	var button := _build_home_entry_button(title, subtitle, target_page_id, true)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return button


func _build_progress_line() -> Control:
	var level := _snapshot_int("organization_level", 1)
	var exp_value := _snapshot_int("organization_exp", 0)
	var exp_required := maxi(1, _snapshot_int("organization_exp_required", 1))
	return _build_home_stat_row("等级", "Lv.%s  %s/%s" % [str(level), str(exp_value), str(exp_required)])


func _build_home_stat_row(label_text: String, value_text: String) -> Control:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var label := _make_label(label_text, 13, true)
	label.custom_minimum_size = Vector2(72, 0)
	row.add_child(label)
	var value := _make_label(value_text, 15, true)
	value.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	value.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(value)
	return row


func _make_home_panel(bg_color: Color, border_color: Color) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UI_COMPONENT_FACTORY.make_flat_panel_style(bg_color, border_color, 1, 5, 0.16))
	return panel


func _make_divider() -> Control:
	var line := ColorRect.new()
	line.custom_minimum_size = Vector2(0, 1)
	line.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	line.color = Color(0.74, 0.52, 0.24, 0.42)
	return line


func _make_label(text: String, font_size: int, wrap: bool = false) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if wrap else TextServer.AUTOWRAP_OFF
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return label


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


func _resolve_tab_summary_lines(tab_id: String, tab_def: Dictionary) -> Array:
	var summary_lines_by_tab: Dictionary = _alliance_snapshot.get("tab_summary_lines", {}) as Dictionary
	if summary_lines_by_tab.has(tab_id):
		var dynamic_lines: Variant = summary_lines_by_tab.get(tab_id, [])
		if dynamic_lines is Array and not (dynamic_lines as Array).is_empty():
			return dynamic_lines as Array
	return tab_def.get("summary_lines", []) as Array


func _resolve_section_payload(tab_id: String, section_id: String) -> Dictionary:
	var payload_section_id := section_id
	if tab_id == "battle_reports" and section_id == "detail":
		payload_section_id = "latest"
	var section_def: Dictionary = _get_section_def(tab_id, payload_section_id)
	if section_def.is_empty():
		return {}
	var resolved_section: Dictionary = section_def.duplicate(true)
	var section_payloads: Dictionary = _alliance_snapshot.get("section_payloads", {}) as Dictionary
	var tab_payloads: Dictionary = section_payloads.get(tab_id, {}) as Dictionary
	var override_payload: Dictionary = tab_payloads.get(payload_section_id, {}) as Dictionary
	for key_variant in override_payload.keys():
		var key := str(key_variant).strip_edges()
		if key == "":
			continue
		resolved_section[key] = override_payload.get(key_variant)
	if tab_id == "battle_reports" and section_id == "detail":
		resolved_section["id"] = "detail"
		resolved_section["label"] = "战报详情"
		resolved_section["title"] = "战报详情"
		resolved_section["summary_title"] = "战报详情"
	return resolved_section


func _build_child_page_payload(tab_id: String, section_id: String, section_payload: Dictionary) -> Dictionary:
	var payload := section_payload.duplicate(true)
	payload["summary_title"] = str(payload.get("summary_title", payload.get("title", section_id))).strip_edges()
	payload["list_title"] = str(payload.get("list_title", payload.get("title", "列表"))).strip_edges()
	if not payload.has("summary_lines"):
		payload["summary_lines"] = [
			_format_section_hint(tab_id, section_id),
			"组织：%s | 成员 %s | 城池 %s | 目标 %s" % [
				_snapshot_string("alliance_name", DEFAULT_ALLIANCE_NAME),
				str(_snapshot_int("member_count", 0)),
				str(_snapshot_int("territory_count", 0)),
				str(_snapshot_int("goal_count", 0)),
			],
		]
	payload["page_id"] = _compose_page_id(tab_id, section_id)
	payload["background_image_path"] = _organization_secondary_background_asset_path(tab_id, section_id)
	payload["background_layer_mode"] = ORGANIZATION_SECONDARY_GENERATED_BG_MODE
	payload["background_fit_mode"] = ORGANIZATION_SECONDARY_BG_FIT_MODE
	payload["real_ui_overlay_mode"] = ORGANIZATION_SECONDARY_REAL_UI_OVERLAY_MODE
	payload["background_min_height"] = 640
	payload["contract_boundary_kind"] = str(payload.get("contract_boundary_kind", "block_schema")).strip_edges()
	if str(payload.get("contract_boundary_kind", "")).strip_edges() == "":
		payload["contract_boundary_kind"] = "block_schema"
	return payload


func _organization_secondary_background_asset_path(tab_id: String, section_id: String) -> String:
	var page_id := _compose_page_id(tab_id, section_id)
	match page_id:
		"members/overview", "members/groups":
			return ORGANIZATION_SECONDARY_MEMBERS_BG_ASSET_PATH
		"governance/officers", "governance/founding":
			return ORGANIZATION_SECONDARY_OFFICERS_BG_ASSET_PATH
		"diplomacy/relations":
			return ORGANIZATION_SECONDARY_DIPLOMACY_BG_ASSET_PATH
		"battle_reports/latest", "battle_reports/detail", "battle_reports/log", "battle_reports/highlights", "battle_reports/archive":
			return ORGANIZATION_SECONDARY_BATTLE_REPORTS_BG_ASSET_PATH
		"nation/policy":
			return ORGANIZATION_SECONDARY_POLICY_BG_ASSET_PATH
		"nation/market":
			return ORGANIZATION_SECONDARY_MARKET_BG_ASSET_PATH
		_:
			return ""


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


func _get_default_section_id(tab_id: String) -> String:
	var tab_def: Dictionary = _get_tab_def(tab_id)
	for raw_section in tab_def.get("sections", []) as Array:
		var section: Dictionary = raw_section if raw_section is Dictionary else {}
		var section_id := str(section.get("id", "")).strip_edges()
		if not section_id.is_empty():
			return section_id
	return ""


func _get_active_alliance_scroll() -> ScrollContainer:
	var state: Dictionary = _tab_views.get(_current_top_tab_id, {}) as Dictionary
	return state.get("root") as ScrollContainer


func _count_alliance_sections() -> int:
	var total := 0
	for tab_id in TOP_TAB_ORDER:
		var tab_def: Dictionary = _get_tab_def(tab_id)
		for raw_section in tab_def.get("sections", []) as Array:
			if raw_section is Dictionary:
				total += 1
	return total


func _format_section_hint(tab_id: String, section_id: String) -> String:
	var tab_def: Dictionary = _get_tab_def(tab_id)
	var section_def: Dictionary = _get_section_def(tab_id, section_id)
	var tab_label := str(tab_def.get("label", _organization_label()))
	var section_label := str(section_def.get("label", section_id))
	var summary_title := str(tab_def.get("summary_title", "组织面板"))
	return "当前切项：%s · %s | %s" % [tab_label, section_label, summary_title]


func _organization_kind() -> String:
	var kind := _snapshot_string("organization_kind", "alliance").to_lower()
	if kind != "nation" and kind != "alliance":
		kind = "alliance"
	return kind


func _organization_lifecycle_stage() -> String:
	var stage := _snapshot_string("organization_lifecycle_stage", "alliance")
	if stage == "":
		stage = "alliance"
	return stage


func _organization_label() -> String:
	return "国家" if _organization_kind() == "nation" else "同盟"


func _organization_battle_report_label() -> String:
	return "%s战报" % _lifecycle_label()


func _panel_title_for_page(page_id: String) -> String:
	match page_id.strip_edges():
		"governance/founding":
			return "立国"
		"nation/midgame":
			return "国家中局"
		"nation/policy":
			return "政策加成"
		"nation/market":
			return "市井"
		_:
			return _organization_label()


func _nation_profile_draft() -> Dictionary:
	var draft_variant: Variant = _alliance_snapshot.get("nation_profile_draft", {})
	if draft_variant is Dictionary:
		return (draft_variant as Dictionary).duplicate(true)
	return {}

func _nation_profile_draft_name() -> String:
	var draft: Dictionary = _nation_profile_draft()
	var name := str(draft.get("nation_name", draft.get("name", ""))).strip_edges()
	if name != "":
		return name
	if _organization_kind() == "nation":
		return _snapshot_string("alliance_name", DEFAULT_ALLIANCE_NAME)
	return "%s国" % _snapshot_string("organization_state_name", "青州").trim_suffix("州")

func _nation_profile_color_hex() -> String:
	var draft: Dictionary = _nation_profile_draft()
	var color_hex := str(draft.get("color_hex", draft.get("nation_color_hex", draft.get("color", "")))).strip_edges()
	if color_hex.begins_with("#") and color_hex.length() >= 7:
		return color_hex.substr(0, 7)
	return "#c95f32"

func _nation_profile_draft_dirty() -> bool:
	var draft: Dictionary = _nation_profile_draft()
	return bool(draft.get("dirty", false))


func _nation_profile_draft_validation_message() -> String:
	if _organization_kind() == "nation":
		return "已立国"
	var name := _nation_profile_draft_name()
	if name.length() < 2:
		return "国号至少两个字"
	var color_hex := _nation_profile_color_hex()
	if not _is_valid_nation_profile_color_hex(color_hex):
		return "势力色需为 #RRGGBB"
	return "可提交"


func _nation_profile_draft_submit_enabled() -> bool:
	return _nation_profile_draft_validation_message() == "可提交"


func _is_valid_nation_profile_color_hex(color_hex: String) -> bool:
	var normalized := color_hex.strip_edges().to_lower()
	if normalized.length() != 7 or not normalized.begins_with("#"):
		return false
	for index in range(1, 7):
		if "0123456789abcdef".find(normalized.substr(index, 1)) < 0:
			return false
	return true


func _refresh_nation_profile_submit_state() -> void:
	var submit_button := find_child("NationProfileSubmitButton", true, false) as Button
	if submit_button == null:
		return
	submit_button.disabled = not _nation_profile_draft_submit_enabled()
	submit_button.tooltip_text = _nation_profile_draft_validation_message()


func _nation_profile_update_draft() -> Dictionary:
	var draft_variant: Variant = _alliance_snapshot.get("nation_profile_update_draft", {})
	if draft_variant is Dictionary:
		return (draft_variant as Dictionary).duplicate(true)
	return {}


func _nation_profile_update_name() -> String:
	var draft: Dictionary = _nation_profile_update_draft()
	var name := str(draft.get("nation_name", draft.get("name", ""))).strip_edges()
	if name != "":
		return name
	return _nation_profile_draft_name()


func _nation_profile_update_color_hex() -> String:
	var draft: Dictionary = _nation_profile_update_draft()
	var color_hex := str(draft.get("color_hex", draft.get("nation_color_hex", draft.get("color", "")))).strip_edges()
	if color_hex.begins_with("#") and color_hex.length() >= 7:
		return color_hex.substr(0, 7).to_lower()
	return _nation_profile_color_hex().to_lower()


func _nation_profile_migration_panel_open() -> bool:
	return _snapshot_bool("nation_profile_capital_migration_open", false)


func _open_nation_profile_migration_panel() -> void:
	_alliance_snapshot["nation_profile_capital_migration_open"] = true
	_alliance_snapshot["nation_profile_capital_migration_draft"] = _ensure_nation_profile_migration_draft()
	_suppress_page_changed = true
	_rebuild_panel()
	_suppress_page_changed = false


func _close_nation_profile_migration_panel() -> void:
	_alliance_snapshot["nation_profile_capital_migration_open"] = false
	_suppress_page_changed = true
	_rebuild_panel()
	_suppress_page_changed = false


func _nation_profile_migration_draft() -> Dictionary:
	var draft_variant: Variant = _alliance_snapshot.get("nation_profile_capital_migration_draft", {})
	if draft_variant is Dictionary:
		return (draft_variant as Dictionary).duplicate(true)
	return _ensure_nation_profile_migration_draft()


func _ensure_nation_profile_migration_draft() -> Dictionary:
	var draft_variant: Variant = _alliance_snapshot.get("nation_profile_capital_migration_draft", {})
	var draft: Dictionary = (draft_variant as Dictionary).duplicate(true) if draft_variant is Dictionary else {}
	var default_option := _nation_profile_migration_default_capital_option()
	if str(draft.get("capital_tile_id", draft.get("capitalTileId", ""))).strip_edges() == "" and not default_option.is_empty():
		draft["capital_tile_id"] = str(default_option.get("tile_id", default_option.get("tileId", ""))).strip_edges()
		draft["capital_name"] = str(default_option.get("name", default_option.get("label", ""))).strip_edges()
	if str(draft.get("nation_name", draft.get("name", ""))).strip_edges() == "":
		draft["nation_name"] = _nation_profile_update_name()
	if str(draft.get("color_hex", draft.get("nation_color_hex", draft.get("color", "")))).strip_edges() == "":
		draft["color_hex"] = _nation_profile_update_color_hex()
	draft["source_page"] = "governance/founding"
	draft["local_only"] = true
	return draft


func _nation_profile_migration_default_capital_option() -> Dictionary:
	var current_capital_tile_id := _nation_profile_capital_tile_id()
	for option_variant in _nation_profile_migration_capital_options():
		if not (option_variant is Dictionary):
			continue
		var option: Dictionary = option_variant as Dictionary
		var tile_id := str(option.get("tile_id", option.get("tileId", ""))).strip_edges()
		if tile_id != "" and tile_id != current_capital_tile_id:
			return option.duplicate(true)
	for option_variant in _nation_profile_migration_capital_options():
		if option_variant is Dictionary:
			return (option_variant as Dictionary).duplicate(true)
	return {}


func _store_nation_profile_migration_capital(meta: Dictionary, dirty: bool) -> void:
	var draft := _nation_profile_migration_draft()
	draft["capital_tile_id"] = str(meta.get("tile_id", meta.get("tileId", ""))).strip_edges()
	draft["capital_name"] = str(meta.get("name", meta.get("label", ""))).strip_edges()
	draft["source_page"] = "governance/founding"
	draft["local_only"] = true
	if dirty:
		draft["dirty"] = true
	_alliance_snapshot["nation_profile_capital_migration_draft"] = draft


func _nation_profile_draft_capital_tile_id() -> String:
	var draft: Dictionary = _nation_profile_draft()
	return str(draft.get("capital_tile_id", draft.get("capitalTileId", ""))).strip_edges()


func _nation_profile_draft_capital_name() -> String:
	var draft: Dictionary = _nation_profile_draft()
	var capital_name := str(draft.get("capital_name", draft.get("capitalName", ""))).strip_edges()
	return capital_name if capital_name != "" else "当前郡城"


func _nation_profile_draft_capital_options() -> Array:
	var draft: Dictionary = _nation_profile_draft()
	var raw_options: Variant = draft.get("capital_options", draft.get("capitalOptions", []))
	if raw_options is Array:
		return raw_options as Array
	return []


func _nation_profile_migration_capital_options() -> Array:
	var draft: Dictionary = _nation_profile_draft()
	var raw_options: Variant = draft.get("capital_options", draft.get("capitalOptions", []))
	var options: Array = raw_options as Array if raw_options is Array else []
	if not options.is_empty():
		return options
	var current_tile_id := _nation_profile_capital_tile_id()
	if current_tile_id == "":
		return []
	return [{
		"tile_id": current_tile_id,
		"name": _nation_profile_capital_name(),
		"district": _snapshot_string("organization_state_name", ""),
		"selected": true,
	}]


func _nation_profile_migration_capital_tile_id() -> String:
	var draft := _nation_profile_migration_draft()
	return str(draft.get("capital_tile_id", draft.get("capitalTileId", ""))).strip_edges()


func _nation_profile_migration_capital_name() -> String:
	var draft := _nation_profile_migration_draft()
	var capital_name := str(draft.get("capital_name", draft.get("capitalName", ""))).strip_edges()
	return capital_name if capital_name != "" else "未选择"


func _nation_profile_migration_name() -> String:
	var draft := _nation_profile_migration_draft()
	var name := str(draft.get("nation_name", draft.get("name", ""))).strip_edges()
	return name if name != "" else _nation_profile_update_name()


func _nation_profile_migration_color_hex() -> String:
	var draft := _nation_profile_migration_draft()
	var color_hex := str(draft.get("color_hex", draft.get("nation_color_hex", draft.get("color", "")))).strip_edges().to_lower()
	if color_hex.begins_with("#") and color_hex.length() >= 7:
		return color_hex.substr(0, 7)
	return _nation_profile_update_color_hex()


func _nation_profile_migration_validation_message() -> String:
	if _organization_kind() != "nation":
		return "尚未立国"
	if _nation_profile_migration_capital_tile_id() == "":
		return "请选择新都城"
	if _nation_profile_migration_capital_tile_id() == _nation_profile_capital_tile_id():
		return "新都城不能与当前都城相同"
	if _nation_profile_migration_name().length() < 2:
		return "国号至少两个字"
	if not _is_valid_nation_profile_color_hex(_nation_profile_migration_color_hex()):
		return "势力色需为 #RRGGBB"
	return "可提交迁都"


func _nation_profile_migration_submit_enabled() -> bool:
	return _nation_profile_migration_validation_message() == "可提交迁都"


func _refresh_nation_profile_migration_submit_state() -> void:
	var submit_button := find_child("NationProfileCapitalMigrationSubmitButton", true, false) as Button
	if submit_button == null:
		return
	submit_button.disabled = not _nation_profile_migration_submit_enabled()
	submit_button.tooltip_text = _nation_profile_migration_validation_message()


func _organization_nation_founding_copy_text() -> String:
	var parts: Array[String] = []
	for line in _filtered_founding_requirement_lines():
		parts.append(str(line))
	parts.append("都城：%s" % _nation_profile_draft_capital_name())
	parts.append("国号：%s" % _nation_profile_draft_name())
	parts.append("势力色")
	if _organization_kind() == "nation":
		for line in _filtered_empire_requirement_lines():
			parts.append(str(line))
	return " / ".join(parts)


func record_nation_profile_governance_rejection(rejection: Dictionary) -> void:
	var governance := _nation_profile_governance()
	governance["latest_rejection"] = rejection.duplicate(true)
	_alliance_snapshot["nation_profile_governance"] = governance
	_suppress_page_changed = true
	_rebuild_panel()
	_suppress_page_changed = false


func _nation_profile_governance() -> Dictionary:
	var governance_variant: Variant = _alliance_snapshot.get("nation_profile_governance", {})
	if governance_variant is Dictionary:
		return (governance_variant as Dictionary).duplicate(true)
	return {}


func _nation_war_objective_read_model() -> Dictionary:
	var raw_value: Variant = _alliance_snapshot.get("nation_war_objective_read_model", _alliance_snapshot.get("nationWarObjectiveReadModel", {}))
	if raw_value is Dictionary:
		return (raw_value as Dictionary).duplicate(true)
	return {}


func _nation_midgame_frontend_skeleton() -> Dictionary:
	var raw_value: Variant = _alliance_snapshot.get("nation_midgame_frontend_skeleton", _alliance_snapshot.get("nationMidgameFrontendSkeleton", {}))
	if raw_value is Dictionary:
		return (raw_value as Dictionary).duplicate(true)
	return {}


func _nation_midgame_player_ui_copy() -> Dictionary:
	var skeleton := _nation_midgame_frontend_skeleton()
	var raw_value: Variant = skeleton.get("player_ui", skeleton.get("playerUi", {}))
	if raw_value is Dictionary:
		return (raw_value as Dictionary).duplicate(true)
	return {}


func _nation_midgame_player_card_count(card_key: String) -> int:
	var player_ui := _nation_midgame_player_ui_copy()
	var raw_cards: Variant = player_ui.get(card_key, [])
	if raw_cards is Array:
		return (raw_cards as Array).size()
	return 0


func _nation_midgame_visible_primary_card_count() -> int:
	var player_ui := _nation_midgame_player_ui_copy()
	var count := _nation_midgame_player_card_count("stage_cards")
	var member_summary_variant: Variant = player_ui.get("member_summary_card", {})
	if member_summary_variant is Dictionary and not (member_summary_variant as Dictionary).is_empty():
		count += 1
	return count


func _nation_midgame_player_visible_copy_lines() -> Array[String]:
	var forbidden_terms := [
		"region_control",
		"state_capital",
		"luoyang_control",
		"empire_status",
		"east_han_unification",
		"alliance -> kingdom -> empire",
		"alliance",
		"kingdom",
		"empire",
		"nation tier",
		"read model",
		"authority",
		"tier",
	]
	var player_ui := _nation_midgame_player_ui_copy()
	var lines: Array[String] = []
	for key in ["headline", "primary_goal_text", "summary_text"]:
		var value := str(player_ui.get(key, "")).strip_edges()
		if value != "":
			lines.append(value)
	var route_cta_variant: Variant = player_ui.get("objective_route_cta", {})
	if route_cta_variant is Dictionary:
		var route_cta: Dictionary = route_cta_variant as Dictionary
		for key in ["headline", "button_label", "button_tooltip", "target_label", "target_surface", "target_subtitle"]:
			var cta_text := str(route_cta.get(key, "")).strip_edges()
			if cta_text != "":
				lines.append(cta_text)
	for raw_line in _coerce_string_array(player_ui.get("summary_lines", [])):
		lines.append(raw_line)
	for card_group_key in ["stage_cards", "member_cards"]:
		var raw_cards: Variant = player_ui.get(card_group_key, [])
		if not (raw_cards is Array):
			continue
		for raw_card in raw_cards as Array:
			if not (raw_card is Dictionary):
				continue
			var card: Dictionary = raw_card as Dictionary
			for key in ["title", "value", "meta", "description"]:
				var text := str(card.get(key, "")).strip_edges()
				if text != "":
					lines.append(text)
	var member_summary_variant: Variant = player_ui.get("member_summary_card", {})
	if member_summary_variant is Dictionary:
		var member_summary: Dictionary = member_summary_variant as Dictionary
		for key in ["title", "value", "meta", "description"]:
			var text := str(member_summary.get(key, "")).strip_edges()
			if text != "":
				lines.append(text)
	for forbidden in forbidden_terms:
		var _term := str(forbidden)
	return lines


func _nation_midgame_forbidden_visible_copy_hits() -> Array[String]:
	var forbidden_terms := [
		"region_control",
		"state_capital",
		"luoyang_control",
		"empire_status",
		"east_han_unification",
		"alliance -> kingdom -> empire",
		"alliance",
		"kingdom",
		"empire",
		"nation tier",
		"read model",
		"authority",
		"tier",
	]
	var lines := _nation_midgame_player_visible_copy_lines()
	var hits: Array[String] = []
	for forbidden in forbidden_terms:
		var lowered_forbidden := str(forbidden).to_lower()
		for line in lines:
			if str(line).to_lower().find(lowered_forbidden) >= 0:
				if not hits.has(str(forbidden)):
					hits.append(str(forbidden))
	return hits


func _nation_midgame_short_chinese_goal_text(text: String) -> bool:
	var normalized := text.strip_edges()
	if normalized == "" or normalized.length() > 18:
		return false
	for index in range(normalized.length()):
		var code := normalized.unicode_at(index)
		if code == 32 or code == 45 or code == 95:
			return false
		if code >= 65 and code <= 90:
			return false
		if code >= 97 and code <= 122:
			return false
	return true


func _nation_war_objective_by_id(objective_id: String) -> Dictionary:
	var model := _nation_war_objective_read_model()
	var raw_objectives: Variant = model.get("objectives", [])
	var objectives: Array = raw_objectives if raw_objectives is Array else []
	for raw_objective in objectives:
		if not (raw_objective is Dictionary):
			continue
		var objective: Dictionary = raw_objective as Dictionary
		if str(objective.get("objectiveId", "")) == objective_id:
			return objective.duplicate(true)
	return {}


func _nation_profile_governance_array(primary_key: String, fallback_key: String = "") -> Array:
	var governance := _nation_profile_governance()
	var raw_value: Variant = governance.get(primary_key, [])
	if fallback_key != "" and not (raw_value is Array):
		raw_value = governance.get(fallback_key, [])
	if raw_value is Array:
		return raw_value as Array
	return []


func _nation_profile_history_entries() -> Array:
	return _nation_profile_governance_array("historical_names", "historicalNames")


func _nation_profile_audit_entries() -> Array:
	return _nation_profile_governance_array("audit_log", "auditLog")


func _nation_profile_rename_cooldown_until() -> String:
	var governance := _nation_profile_governance()
	return str(governance.get("rename_cooldown_until", governance.get("renameCooldownUntil", ""))).strip_edges()


func _nation_profile_rename_cooldown_text() -> String:
	var governance := _nation_profile_governance()
	var text := str(governance.get("rename_cooldown_text", governance.get("renameCooldownText", ""))).strip_edges()
	if text != "":
		return text
	var cooldown_until := _nation_profile_rename_cooldown_until()
	return "改名冷却至 %s" % cooldown_until if cooldown_until != "" else "国号随都城锁定"


func _nation_profile_capital_tile_id() -> String:
	var governance := _nation_profile_governance()
	var capital_tile_id := str(governance.get("capital_tile_id", governance.get("capitalTileId", ""))).strip_edges()
	return capital_tile_id if capital_tile_id != "" else _nation_profile_draft_capital_tile_id()


func _nation_profile_capital_name() -> String:
	var governance := _nation_profile_governance()
	var capital_name := str(governance.get("capital_name", governance.get("capitalName", ""))).strip_edges()
	if capital_name != "":
		return capital_name
	return _nation_profile_draft_capital_name()


func _nation_profile_profile_lock_text() -> String:
	var governance := _nation_profile_governance()
	var lock_text := str(governance.get("profile_lock_text", governance.get("profileLockText", ""))).strip_edges()
	return lock_text if lock_text != "" else "国号和势力色已随都城锁定"


func _nation_profile_capital_migration_text() -> String:
	var governance := _nation_profile_governance()
	var text := str(governance.get("capital_migration_text", governance.get("capitalMigrationText", ""))).strip_edges()
	return text if text != "" else "迁都后可重选都城、国号和势力色"


func _nation_profile_capital_migration_cost_text() -> String:
	var governance := _nation_profile_governance()
	var text := str(governance.get("capital_migration_cost_text", governance.get("capitalMigrationCostText", ""))).strip_edges()
	return text if text != "" else "200 玉符"


func _nation_profile_latest_rejection() -> Dictionary:
	var governance := _nation_profile_governance()
	var rejection_variant: Variant = governance.get("latest_rejection", governance.get("latestRejection", {}))
	if rejection_variant is Dictionary:
		return (rejection_variant as Dictionary).duplicate(true)
	return {}


func _nation_profile_latest_rejection_failure_code() -> String:
	var rejection := _nation_profile_latest_rejection()
	return str(rejection.get("failureCode", rejection.get("failure_code", ""))).strip_edges()


func _nation_profile_latest_rejection_message() -> String:
	var rejection := _nation_profile_latest_rejection()
	var failure_code := _nation_profile_latest_rejection_failure_code()
	if failure_code.begins_with("nation_found_") or failure_code == "nation_color_conflict":
		return _nation_profile_found_rejection_message(failure_code)
	if failure_code.begins_with("nation_empire_"):
		return _nation_empire_rejection_message(failure_code)
	if failure_code.begins_with("nation_capital_migration_"):
		return _nation_profile_capital_migration_rejection_message(failure_code)
	var message := str(rejection.get("message", "")).strip_edges()
	return message if message != "" else failure_code


func _nation_profile_founding_failure_message() -> String:
	var failure_code := _nation_profile_latest_rejection_failure_code()
	if failure_code.begins_with("nation_found_") or failure_code == "nation_color_conflict":
		return _nation_profile_found_rejection_message(failure_code)
	return ""


func _nation_profile_found_rejection_message(failure_code: String) -> String:
	match failure_code:
		"nation_found_session_required":
			return "需要重新登录后再立国。"
		"nation_found_session_faction_mismatch":
			return "当前账号不属于这个同盟。"
		"nation_found_forbidden":
			return "只有盟主或授权官员可以立国。"
		"nation_found_already_nation":
			return "当前已经立国。"
		"nation_found_level_required":
			return "同盟等级不足，达到 20 级后可立国。"
		"nation_found_commandery_required":
			return "还没有占领郡城，占有 1 个郡后可立国。"
		"nation_found_invalid_capital":
			return "请选择己方郡城作为都城。"
		"nation_found_capital_not_controlled":
			return "都城必须选择己方郡城。"
		"nation_color_conflict":
			return "势力色已被其他国家占用。"
		_:
			return failure_code


func _nation_empire_rejection_message(failure_code: String) -> String:
	match failure_code:
		"nation_empire_session_required":
			return "需要重新登录后再提交。"
		"nation_empire_session_faction_mismatch":
			return "当前账号不属于这个同盟。"
		"nation_empire_forbidden":
			return "只有盟主或授权官员可以晋升帝国。"
		"nation_empire_requires_kingdom":
			return "先立国成为王国后，才可晋升帝国。"
		"nation_empire_already_empire":
			return "当前已经是帝国。"
		"nation_empire_level_required":
			return "王国等级未达到 90。"
		"nation_empire_state_capital_required":
			return "需要占领至少 1 个州治。"
		"nation_empire_commandery_required":
			return "需要占领至少 10 个郡城。"
		"nation_empire_insufficient_jade":
			return "玉符不足，无法晋升帝国。"
		_:
			return failure_code


func _nation_profile_capital_migration_failure_message() -> String:
	var failure_code := _nation_profile_latest_rejection_failure_code()
	if failure_code.begins_with("nation_capital_migration_"):
		return _nation_profile_capital_migration_rejection_message(failure_code)
	return _nation_profile_migration_validation_message()


func _nation_profile_capital_migration_rejection_message(failure_code: String) -> String:
	match failure_code:
		"nation_capital_migration_session_required":
			return "需要重新登录后再提交迁都。"
		"nation_capital_migration_session_faction_mismatch":
			return "当前账号不属于这个国家。"
		"nation_capital_migration_forbidden":
			return "只有盟主或授权官员可以迁都。"
		"nation_capital_migration_requires_nation":
			return "先立国成为王国后，才可迁都。"
		"nation_capital_migration_invalid_capital":
			return "请选择可作为都城的己方郡城。"
		"nation_capital_migration_capital_not_controlled":
			return "目标郡城不在当前国家控制下。"
		"nation_capital_migration_capital_unchanged":
			return "新都城不能与当前都城相同。"
		"nation_capital_migration_rename_cooldown":
			return "国号变更仍在冷却中。"
		"nation_capital_migration_color_conflict":
			return "势力色已被其他国家占用。"
		"nation_capital_migration_insufficient_jade":
			return "玉符不足，无法迁都。"
		_:
			return failure_code


func _nation_profile_latest_conflict_nation_name() -> String:
	var rejection := _nation_profile_latest_rejection()
	return str(rejection.get("conflictingNationName", rejection.get("conflicting_nation_name", ""))).strip_edges()


func _nation_profile_color_conflict_text() -> String:
	var failure_code := _nation_profile_latest_rejection_failure_code()
	if failure_code != "nation_color_conflict" and failure_code != "nation_capital_migration_color_conflict":
		return "无冲突"
	var conflict_name := _nation_profile_latest_conflict_nation_name()
	if conflict_name != "":
		return "被 %s 占用" % conflict_name
	return "颜色已被占用"


func _format_nation_profile_history_preview() -> String:
	var entries := _nation_profile_history_entries()
	if entries.is_empty():
		return "暂无历史国号"
	var entry_variant: Variant = entries[entries.size() - 1]
	if not (entry_variant is Dictionary):
		return "历史国号 %s 条" % str(entries.size())
	var entry: Dictionary = entry_variant as Dictionary
	var old_name := str(entry.get("nationName", entry.get("previousNationName", ""))).strip_edges()
	var next_name := str(entry.get("changedTo", entry.get("nextNationName", ""))).strip_edges()
	var changed_at := str(entry.get("changedAt", "")).strip_edges()
	if old_name != "" and next_name != "":
		return "历史国号：%s -> %s" % [old_name, next_name]
	if old_name != "":
		return "历史国号：%s" % old_name
	return "历史国号 %s 条%s" % [str(entries.size()), " / %s" % changed_at if changed_at != "" else ""]


func _format_nation_profile_audit_preview() -> String:
	var entries := _nation_profile_audit_entries()
	if entries.is_empty():
		return "暂无审计记录"
	var entry_variant: Variant = entries[entries.size() - 1]
	if not (entry_variant is Dictionary):
		return "审计记录 %s 条" % str(entries.size())
	var entry: Dictionary = entry_variant as Dictionary
	var action := str(entry.get("action", "updateNationProfile")).strip_edges()
	var changed_fields_variant: Variant = entry.get("changedFields", [])
	var changed_fields: Array = changed_fields_variant as Array if changed_fields_variant is Array else []
	var field_text := "、".join(PackedStringArray(changed_fields.map(func(value: Variant) -> String: return str(value))))
	if field_text == "":
		field_text = "国家档案"
	return "审计记录：%s / %s" % [action, field_text]


func _nation_profile_update_name_validation_message() -> String:
	if _organization_kind() != "nation":
		return "尚未立国"
	return _nation_profile_capital_migration_text()


func _nation_profile_update_color_validation_message() -> String:
	if _organization_kind() != "nation":
		return "尚未立国"
	return _nation_profile_capital_migration_text()


func _nation_profile_update_name_submit_enabled() -> bool:
	return false


func _nation_profile_update_color_submit_enabled() -> bool:
	return false


func _refresh_nation_profile_update_submit_state() -> void:
	var name_button := find_child("NationProfileUpdateNameSubmitButton", true, false) as Button
	if name_button != null:
		name_button.disabled = not _nation_profile_update_name_submit_enabled()
		name_button.tooltip_text = _nation_profile_update_name_validation_message()
	var color_button := find_child("NationProfileUpdateColorSubmitButton", true, false) as Button
	if color_button != null:
		color_button.disabled = not _nation_profile_update_color_submit_enabled()
		color_button.tooltip_text = _nation_profile_update_color_validation_message()


func _lifecycle_label() -> String:
	match _organization_lifecycle_stage():
		"eligible_to_found_nation":
			return "同盟"
		"nation":
			return "帝国" if _snapshot_string("organization_rank_stage", "kingdom") == "empire" else "王国"
		_:
			return "同盟"


func _format_home_commandery_bonus_label() -> String:
	var city_count := _snapshot_int("owned_city_count", _snapshot_int("territory_count", 0))
	if city_count <= 0:
		return "待占领"
	return "资源 +%s%%" % str(mini(24, city_count * 2))


func _format_home_city_bonus_detail_lines() -> Array[String]:
	var city_count := _snapshot_int("owned_city_count", _snapshot_int("territory_count", 0))
	if city_count <= 0:
		return ["暂无城池加成。"]
	return [
		"资源产出 +%s%%" % str(mini(24, city_count * 2)),
		"屯田收益 +%s%%" % str(mini(12, city_count)),
		"调兵整备 +%s%%" % str(mini(10, maxi(1, city_count / 2))),
	]


func _filtered_founding_requirement_lines() -> Array[String]:
	var result: Array[String] = []
	for line in _snapshot_string_array("found_nation_requirement_lines"):
		if line.find("权限") >= 0 or line.find("成员") >= 0 or line.find("状态") >= 0:
			continue
		result.append(line)
	return result


func _filtered_empire_requirement_lines() -> Array[String]:
	var result: Array[String] = []
	for line in _snapshot_string_array("empire_upgrade_requirement_lines"):
		if line.find("成员") >= 0:
			continue
		result.append(line)
	return result


func _organization_home_status_stat_count() -> int:
	return 6 + _format_home_city_bonus_detail_lines().size()


func _active_secondary_structure_mode(active_page_id: String) -> String:
	match active_page_id:
		"members/overview":
			return ORGANIZATION_MEMBER_TABLE_MODE
		"members/groups":
			return ORGANIZATION_CORPS_CARD_GRID_MODE
		"governance/officers":
			return ORGANIZATION_OFFICER_HIERARCHY_CANVAS_MODE
		"governance/founding":
			return "kingdom_empire_foundation_entry_v1"
		"nation/policy":
			return ORGANIZATION_POLICY_TREE_CANVAS_MODE
		"diplomacy/relations":
			return ORGANIZATION_DIPLOMACY_BOARD_MODE
		"nation/market":
			return ORGANIZATION_MARKET_CARD_GRID_MODE
		"battle_reports/log":
			return ORGANIZATION_LOG_TIMELINE_MODE
		"battle_reports/latest":
			return ORGANIZATION_BATTLE_REPORT_LIST_MODE
		"battle_reports/detail":
			return ORGANIZATION_BATTLE_REPORT_DETAIL_MODE
		_:
			return ""


func _count_content_block_kind(section_payload: Dictionary, kind_id: String) -> int:
	var target_kind := kind_id.strip_edges()
	if target_kind == "":
		return 0
	var count := 0
	var blocks_variant: Variant = section_payload.get("content_blocks", [])
	if not (blocks_variant is Array):
		return 0
	for block_variant in blocks_variant as Array:
		if not (block_variant is Dictionary):
			continue
		var block: Dictionary = block_variant as Dictionary
		if str(block.get("kind", "text_block")).strip_edges() == target_kind:
			count += 1
	return count


func _content_block_node_names(section_payload: Dictionary) -> String:
	var names: Array[String] = []
	var blocks_variant: Variant = section_payload.get("content_blocks", [])
	if blocks_variant is Array:
		for block_variant in blocks_variant as Array:
			if not (block_variant is Dictionary):
				continue
			var block: Dictionary = block_variant as Dictionary
			var node_name := str(block.get("node_name", "")).strip_edges()
			if node_name != "":
				names.append(node_name)
	return "/".join(names)


func _active_content_block_node_names(section_payload: Dictionary, active_page_id: String) -> String:
	var names := _content_block_node_names(section_payload)
	if active_page_id == "battle_reports/detail":
		return "%s/OrganizationBattleReportDetailBlock" % names if names != "" else "OrganizationBattleReportDetailBlock"
	return names


func _snapshot_string(key: String, fallback: String) -> String:
	if not _alliance_snapshot.has(key):
		return fallback
	var value := str(_alliance_snapshot.get(key, fallback)).strip_edges()
	return value if value != "" else fallback


func _snapshot_int(key: String, fallback: int) -> int:
	if not _alliance_snapshot.has(key):
		return fallback
	var raw_value = _alliance_snapshot.get(key, fallback)
	if raw_value is int:
		return raw_value
	return int(str(raw_value))


func _snapshot_bool(key: String, fallback: bool) -> bool:
	if not _alliance_snapshot.has(key):
		return fallback
	var raw_value = _alliance_snapshot.get(key, fallback)
	if raw_value is bool:
		return bool(raw_value)
	var text := str(raw_value).strip_edges().to_lower()
	if text in ["true", "1", "yes", "enabled"]:
		return true
	if text in ["false", "0", "no", "disabled"]:
		return false
	return fallback


func _snapshot_string_array(key: String) -> Array[String]:
	var result: Array[String] = []
	var raw_value: Variant = _alliance_snapshot.get(key, [])
	if raw_value is Array:
		for item in raw_value as Array:
			var text := str(item).strip_edges()
			if text != "":
				result.append(text)
	if result.is_empty():
		match key:
			"recent_log_lines":
				result.append("暂无组织日志。")
			"recent_report_lines":
				result.append("暂无组织战报。")
			"found_nation_requirement_lines":
				result.append("王国条件：同盟等级 1 / 20")
	return result


func _clear_control_children(node: Control) -> void:
	for child in node.get_children():
		child.queue_free()


func _on_host_back_requested() -> void:
	if _handle_internal_back_requested():
		return
	back_requested.emit()


func _on_host_close_requested() -> void:
	close_requested.emit()


func _on_coordinate_jump_requested(payload: Dictionary) -> void:
	coordinate_jump_requested.emit(payload.duplicate(true))


func _on_member_coordinate_jump_pressed(tile_id: String, coordinate_text: String) -> void:
	var coordinate := _parse_member_coordinate_from_tile_id(tile_id)
	var payload := {
		"tileId": tile_id.strip_edges(),
		"value": coordinate_text.strip_edges() if coordinate_text.strip_edges() != "" else tile_id.strip_edges(),
		"source": "alliance_member",
	}
	if not coordinate.is_empty():
		payload["coordinate"] = coordinate
	coordinate_jump_requested.emit(payload)


func _handle_internal_back_requested() -> bool:
	var active_page_id := get_active_page_id()
	if active_page_id == "battle_reports/detail":
		set_active_page_id("battle_reports/latest")
		return true
	if active_page_id != "overview/home":
		set_active_page_id("overview/home")
		return true
	return false


func _on_host_tab_selected(tab_id: String) -> void:
	_select_top_tab(tab_id)


func _on_section_tab_selected(section_id: String, top_tab_id: String) -> void:
	if top_tab_id.is_empty():
		return
	var tab_def: Dictionary = _get_tab_def(top_tab_id)
	if tab_def.is_empty():
		return
	_current_section_by_tab[top_tab_id] = section_id
	var state: Dictionary = _ensure_tab_view(top_tab_id)
	var section_strip = state.get("section_strip")
	if section_strip != null:
		section_strip.set_active_tab(section_id)
	_render_section_content(top_tab_id, section_id)
	_emit_page_changed(_compose_page_id(top_tab_id, section_id))


func _emit_page_changed(page_id: String) -> void:
	var resolved_page_id := page_id.strip_edges()
	if resolved_page_id == "":
		return
	if _host != null:
		_host.set_panel_title(_panel_title_for_page(resolved_page_id))
	if _suppress_page_changed:
		_last_emitted_page_id = resolved_page_id
		return
	if resolved_page_id == _last_emitted_page_id:
		return
	_last_emitted_page_id = resolved_page_id
	page_changed.emit(resolved_page_id)


func _on_action_button_pressed(action_id: String) -> void:
	if _current_top_tab_id == "":
		return
	page_action_requested.emit(get_active_page_id(), action_id)
	action_requested.emit(_current_top_tab_id, action_id)


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
