extends Control
class_name NativeSlgShell

signal mode_toggle_requested(next_mode: String)
signal shell_action_requested(action_id: String)
signal troop_slot_requested(troop_id: String)
signal interior_tab_requested(tab_id: String)
signal ai_activity_badge_requested

const NativeShellChromeProfileCatalogScript = preload("res://scripts/ui/native_shell_chrome_profile_catalog.gd")
const PortraitAssetRegistryScript = preload("res://scripts/ui/portrait_asset_registry.gd")
const CITY_MODE := "city"
const WORLD_MODE := "world"
const MAIN_MAP_VIEW_MODE_GAMEPLAY := "gameplay"
const MAIN_MAP_VIEW_MODE_TIANXIA_YUTU := "tianxia_yutu"
const DEFAULT_CITY_ACTION := "interior"
const TROOP_SLOT_ARCHETYPE_PRIMARY := NativeShellChromeProfileCatalogScript.TROOP_ARCHETYPE_PRIMARY
const TROOP_SLOT_ARCHETYPE_MOBILE := NativeShellChromeProfileCatalogScript.TROOP_ARCHETYPE_MOBILE
const TROOP_SLOT_ARCHETYPE_RESERVE := NativeShellChromeProfileCatalogScript.TROOP_ARCHETYPE_RESERVE
const CHROME_PROFILE_FALLBACK := NativeShellChromeProfileCatalogScript.PROFILE_FALLBACK
const CITY_ACTION_SURFACE_MAIN_NAV := NativeShellChromeProfileCatalogScript.ACTION_SURFACE_MAIN_NAV
const CITY_ACTION_SURFACE_ENTRY := NativeShellChromeProfileCatalogScript.ACTION_SURFACE_ENTRY
const TROOP_SLOT_VISIBLE_COUNT := 5
const TROOP_STRENGTH_TRACK_WIDTH := 96
const TROOP_MORALE_TRACK_WIDTH := 62
const CITY_GRID_DEBUG_CELL_WIDTH := 26
const CITY_GRID_DEBUG_CELL_HEIGHT := 15
const MOBILE_SHELL_BREAKPOINT := 720.0
const MOBILE_LANDSCAPE_SHELL_MAX_WIDTH := 1366.0
const MOBILE_LANDSCAPE_SHELL_MAX_HEIGHT := 768.0
const MOBILE_SHELL_SIDE_MARGIN := 8.0
const MOBILE_BOTTOM_NAV_HEIGHT := 236.0
const MOBILE_MAIN_NAV_BUTTON_SIZE := Vector2(96.0, 100.0)
const MOBILE_MAIN_NAV_BUTTON_MIN_WIDTH := 96.0
const MOBILE_MAIN_NAV_BUTTON_MAX_WIDTH := 96.0
const MOBILE_MAIN_NAV_BUTTON_HEIGHT := 100.0
const MOBILE_MAIN_NAV_MENU_BUTTON_MIN_WIDTH := 52.0
const MOBILE_MAIN_NAV_MENU_BUTTON_MIN_HEIGHT := 100.0
const DESKTOP_MAIN_NAV_MENU_BUTTON_MIN_SIZE := Vector2(52.0, 100.0)
const DESKTOP_BOTTOM_NAV_RIGHT := 960.0
const DESKTOP_BOTTOM_NAV_TOP := -236.0
const DESKTOP_MAIN_NAV_BUTTON_SIZE := Vector2(96.0, 100.0)
const DESKTOP_MAIN_NAV_BUTTON_FONT_SIZE := 13
const RIGHT_CONTEXT_PANEL_ENABLED := false
const COPY_MAIN_WORLD_TITLE := "主世界"
const COPY_TIANXIA_YUTU_TITLE := "天下舆图"
const AI_SWITCH_COMMAND_BG_TOKEN := "ai_switch_command_bg_v1"
const AI_ACTIVITY_STATUS_BADGE_CONTRACT := "ai_activity_status_badge_v1"
const AI_ACTIVITY_STATUS_BADGE_NODE_NAME := "AiActivityStatusBadge"
const AI_ACTIVITY_STATUS_BADGE_SOURCE_EXECUTION_TRACE := "execution_trace"
const AI_ACTIVITY_STATUS_BADGE_SOURCE_NONE := "none"
const AI_ACTIVITY_STATUS_BADGE_MIN_SIZE := Vector2(42.0, 20.0)
const AI_SWITCH_TRACE_COMMAND_CHROME_TOKEN := "ai_switch_trace_command_chrome_v1"
const SHELL_COMMAND_CHROME_TOKEN := "shell_command_chrome_v1"
const LEFT_RAIL_PLAYER_DENSITY_CONTRACT := "native_shell_left_rail_player_density_v1"
const MAINLINE_COMMAND_BUTTON_SKIN_PATHS := {
	"ai_hub": "res://assets/themes/slgclient/current/ui/command_buttons/mainline_command_button_ai_hub_scroll_component_v1.png",
	"ai_switch": "res://assets/themes/slgclient/current/ui/command_buttons/mainline_command_button_ai_switch_scroll_component_v1.png",
	"chat": "res://assets/themes/slgclient/current/ui/command_buttons/mainline_command_button_chat_scroll_component_v1.png",
	"battle_report": "res://assets/themes/slgclient/current/ui/command_buttons/mainline_command_button_battle_report_scroll_component_v1.png",
	"generals": "res://assets/themes/slgclient/current/ui/command_buttons/mainline_command_button_generals_scroll_component_v1.png",
	"recruit": "res://assets/themes/slgclient/current/ui/command_buttons/mainline_command_button_recruit_scroll_component_v1.png",
	"settings": "res://assets/themes/slgclient/current/ui/command_buttons/mainline_command_button_settings_scroll_component_v1.png",
	"skill_library": "res://assets/themes/slgclient/current/ui/command_buttons/mainline_command_button_skill_library_scroll_component_v1.png",
	"interior": "res://assets/themes/slgclient/current/ui/command_buttons/mainline_command_button_interior_scroll_component_v1.png",
	"alliance": "res://assets/themes/slgclient/current/ui/command_buttons/mainline_command_button_alliance_scroll_component_v1.png",
	"mail": "res://assets/themes/slgclient/current/ui/command_buttons/mainline_command_button_mail_scroll_component_v1.png",
	"activity": "res://assets/themes/slgclient/current/ui/command_buttons/mainline_command_button_activity_scroll_component_v1.png",
	"help": "res://assets/themes/slgclient/current/ui/command_buttons/mainline_command_button_help_scroll_component_v1.png",
}
const MAINLINE_COMMAND_BUTTON_SKIN_TEXT_MARGIN_LEFT := 6.0
const MAINLINE_COMMAND_BUTTON_SKIN_TEXT_MARGIN_TOP := 64.0
const MAINLINE_COMMAND_BUTTON_SKIN_TEXT_MARGIN_RIGHT := 6.0
const MAINLINE_COMMAND_BUTTON_SKIN_TEXT_MARGIN_BOTTOM := 5.0
const MAINLINE_COMMAND_BUTTON_SKIN_FONT_COLOR := Color(0.18, 0.14, 0.09, 1.0)
const MAINLINE_COMMAND_BUTTON_SKIN_FONT_HOVER_COLOR := Color(0.10, 0.20, 0.14, 1.0)
const MAINLINE_COMMAND_BUTTON_SKIN_FONT_PRESSED_COLOR := Color(0.12, 0.10, 0.07, 1.0)
const MAINLINE_COMMAND_BUTTON_SKIN_FONT_DISABLED_COLOR := Color(0.37, 0.34, 0.29, 0.72)
const MAINLINE_COMMAND_BUTTON_SKIN_FONT_OUTLINE_COLOR := Color(0.97, 0.93, 0.82, 0.62)
const MAINLINE_SUPPORT_BUTTON_PAPER_BG := Color(0.93, 0.89, 0.79, 0.96)
const MAINLINE_SUPPORT_BUTTON_PAPER_SELECTED_BG := Color(0.98, 0.94, 0.82, 0.98)
const MAINLINE_SUPPORT_BUTTON_PAPER_BORDER := Color(0.61, 0.43, 0.24, 0.86)
const MAINLINE_SUPPORT_BUTTON_PAPER_HOVER_BG := Color(1.0, 0.96, 0.86, 0.98)
const MAINLINE_SUPPORT_BUTTON_PAPER_PRESSED_BG := Color(0.82, 0.76, 0.64, 0.98)
const MAINLINE_SUPPORT_UTILITY_BUTTON_MIN_SIZE := Vector2(64.0, 64.0)
const LEFT_TROOP_RAIL_STYLE_TOKEN := "left_troop_rail_paper_card_skin_v3"
const LEFT_TROOP_RAIL_FIXED_5_ALIGNMENT_TOKEN := "left_troop_rail_fixed_5_alignment_v1"
const LEFT_TROOP_RAIL_PANEL_WIDTH := 236.0
const LEFT_TROOP_RAIL_CARD_MIN_SIZE := Vector2(212.0, 84.0)
const LEFT_TROOP_RAIL_CARD_COMPACT_MIN_SIZE := Vector2(212.0, 84.0)
const LEFT_TROOP_RAIL_ALIGNMENT_TOLERANCE_PX := 2.0
const LEFT_TROOP_RAIL_ROLE_ICON_SIZE := Vector2(42.0, 42.0)
const LEFT_TROOP_RAIL_TYPE_ICON_SIZE := Vector2(16.0, 16.0)
const LEFT_TROOP_RAIL_STATUS_ICON_SIZE := Vector2(16.0, 16.0)
const LEFT_TROOP_RAIL_STATUS_BADGE_SIZE := Vector2(22.0, 22.0)
const LEFT_TROOP_RAIL_CARD_SKIN_USAGE_ID := "left_troop_rail_card_skin_v1_2026_06_03"
const LEFT_TROOP_RAIL_CARD_SKIN_NINE_SLICE_MARGIN := 32.0
const LEFT_TROOP_RAIL_CARD_SKIN_PATHS := {
	"normal": "res://assets/themes/slgclient/current/ui/left_troop_rail/cards/left_troop_rail_card_normal_v1.png",
	"marching": "res://assets/themes/slgclient/current/ui/left_troop_rail/cards/left_troop_rail_card_marching_v1.png",
	"selected": "res://assets/themes/slgclient/current/ui/left_troop_rail/cards/left_troop_rail_card_selected_v1.png",
	"disabled": "res://assets/themes/slgclient/current/ui/left_troop_rail/cards/left_troop_rail_card_disabled_v1.png",
}
const LEFT_TROOP_RAIL_FALLBACK_PORTRAIT_KEYS := [
	"formal_pack.portrait.guan_yu_mature_mounted_jingzhou_v1",
	"formal_pack.portrait.zhao_yun_youth_changban_rescue_v1",
	"formal_pack.portrait.zhang_liao_mature_hefei_v1",
	"formal_pack.portrait.liu_bei_mature_hanzhong_sworddance_face_smile_v2",
	"formal_pack.portrait.tai_shi_ci_mature_yishi_v1",
]
const MAINLINE_TOP_PAPER_BG := Color(0.92, 0.88, 0.76, 0.88)
const MAINLINE_TOP_PAPER_BORDER := Color(0.62, 0.45, 0.24, 0.74)
const MAINLINE_TOP_PAPER_TEXT := Color(0.22, 0.16, 0.10, 0.96)
const TOP_PLAYER_AVATAR_SIZE := Vector2(34.0, 34.0)
const TOP_PLAYER_AVATAR_PATH := "res://assets/portraits/ai_chat/liu_bei_mature_hanzhong_sworddance_face_smile_v2_avatar_160.png"
const PLAYER_PROFILE_CONFIG_PATH := "user://player_profile.cfg"
const PLAYER_PROFILE_SECTION := "player"
const PLAYER_DISPLAY_NAME_KEY := "display_name"
const PLAYER_NAME_READY_KEY := "name_ready"
const PLAYER_DEFAULT_DISPLAY_NAME := "真人玩家"
const PLAYER_NAME_MAX_LENGTH := 8
const TOP_RESOURCE_IDS := ["grain", "wood", "stone", "iron", "copper"]
const TOP_RESOURCE_ICON_SIZE := Vector2(32.0, 32.0)
const TOP_RESOURCE_CHIP_MIN_SIZE := Vector2(92.0, 36.0)
const TOP_RESOURCE_ICON_PATHS := {
	"grain": "res://assets/themes/slgclient/current/ui/hud_resources/icons/hud_resource_grain_v1.png",
	"wood": "res://assets/themes/slgclient/current/ui/hud_resources/icons/hud_resource_wood_v1.png",
	"stone": "res://assets/themes/slgclient/current/ui/hud_resources/icons/hud_resource_stone_v1.png",
	"iron": "res://assets/themes/slgclient/current/ui/hud_resources/icons/hud_resource_iron_v1.png",
	"copper": "res://assets/themes/slgclient/current/ui/hud_resources/icons/hud_resource_copper_v1.png",
}
const TOP_FLAG_ICON_PATH := "res://assets/themes/slgclient/source/svg_shell_icons/alliance_banner.svg"
const LEFT_TROOP_RAIL_ICON_PATHS := {
	"squad_primary": "res://assets/themes/slgclient/current/ui/left_troop_rail/icons/left_troop_rail_icon_squad_primary_v1.png",
	"squad_mobile": "res://assets/themes/slgclient/current/ui/left_troop_rail/icons/left_troop_rail_icon_squad_mobile_v1.png",
	"squad_reserve": "res://assets/themes/slgclient/current/ui/left_troop_rail/icons/left_troop_rail_icon_squad_reserve_v1.png",
	"squad_empty": "res://assets/themes/slgclient/current/ui/left_troop_rail/icons/left_troop_rail_icon_squad_empty_v1.png",
	"troop_infantry": "res://assets/themes/slgclient/current/ui/left_troop_rail/icons/left_troop_rail_icon_troop_infantry_v1.png",
	"troop_cavalry": "res://assets/themes/slgclient/current/ui/left_troop_rail/icons/left_troop_rail_icon_troop_cavalry_v1.png",
	"troop_archer": "res://assets/themes/slgclient/current/ui/left_troop_rail/icons/left_troop_rail_icon_troop_archer_v1.png",
	"troop_siege": "res://assets/themes/slgclient/current/ui/left_troop_rail/icons/left_troop_rail_icon_troop_siege_v1.png",
	"status_idle": "res://assets/themes/slgclient/current/ui/left_troop_rail/icons/left_troop_rail_icon_status_idle_v1.png",
	"status_marching": "res://assets/themes/slgclient/current/ui/left_troop_rail/icons/left_troop_rail_icon_status_marching_v1.png",
	"status_returning": "res://assets/themes/slgclient/current/ui/left_troop_rail/icons/left_troop_rail_icon_status_returning_v1.png",
	"status_garrison": "res://assets/themes/slgclient/current/ui/left_troop_rail/icons/left_troop_rail_icon_status_garrison_v1.png",
	"status_recruiting": "res://assets/themes/slgclient/current/ui/left_troop_rail/icons/left_troop_rail_icon_status_recruiting_v1.png",
	"status_healing": "res://assets/themes/slgclient/current/ui/left_troop_rail/icons/left_troop_rail_icon_status_healing_v1.png",
	"status_low_morale": "res://assets/themes/slgclient/current/ui/left_troop_rail/icons/left_troop_rail_icon_status_low_morale_v1.png",
	"status_locked": "res://assets/themes/slgclient/current/ui/left_troop_rail/icons/left_troop_rail_icon_status_locked_v1.png",
}

@onready var _backdrop: ColorRect = $Backdrop
@onready var _mode_badge: Label = $CenterStage/StageMargin/StageColumn/ModeBadge
@onready var _stage_title: Label = $CenterStage/StageMargin/StageColumn/StageTitle
@onready var _stage_body: Label = $CenterStage/StageMargin/StageColumn/StageBody
@onready var _city_focus: Label = $CenterStage/StageMargin/StageColumn/CityFocus
@onready var _city_entry_grid: GridContainer = $CenterStage/StageMargin/StageColumn/CityEntryGrid
@onready var _entry_status: Label = $CenterStage/StageMargin/StageColumn/EntryStatus
@onready var _mode_hint: Label = $CenterStage/StageMargin/StageColumn/ModeHint
@onready var _top_strip: PanelContainer = $TopStrip
@onready var _top_margin_container: MarginContainer = $TopStrip/TopMargin
@onready var _top_row: HBoxContainer = $TopStrip/TopMargin/TopRow
@onready var _top_actions_row: HBoxContainer = $TopStrip/TopMargin/TopRow/Actions
@onready var _center_stage: PanelContainer = $CenterStage
@onready var _stage_margin_container: MarginContainer = $CenterStage/StageMargin
@onready var _stage_column: VBoxContainer = $CenterStage/StageMargin/StageColumn
@onready var _left_rail_panel: PanelContainer = $LeftRail
@onready var _bottom_nav_panel: PanelContainer = $BottomNav
@onready var _bottom_margin_container: MarginContainer = $BottomNav/BottomMargin
@onready var _bottom_row: HBoxContainer = $BottomNav/BottomMargin/BottomRow
@onready var _main_nav_column: VBoxContainer = $BottomNav/BottomMargin/BottomRow/MainNav
@onready var _nav_buttons: HFlowContainer = $BottomNav/BottomMargin/BottomRow/MainNav/NavControlRow/NavButtons
@onready var _mail_button: Button = $BottomNav/BottomMargin/BottomRow/MainNav/UtilityRow/MailButton
@onready var _activity_button: Button = $BottomNav/BottomMargin/BottomRow/MainNav/UtilityRow/ActivityButton
@onready var _help_button: Button = $BottomNav/BottomMargin/BottomRow/MainNav/UtilityRow/HelpButton
@onready var _utility_row: HBoxContainer = $BottomNav/BottomMargin/BottomRow/MainNav/UtilityRow
@onready var _mode_toggle_button: Button = $TopStrip/TopMargin/TopRow/Actions/ModeToggleButton
@onready var _resource_strip: Label = $TopStrip/TopMargin/TopRow/ResourceStrip
@onready var _profile_badge: Label = $TopStrip/TopMargin/TopRow/ProfileBadge
@onready var _premium_currency_row: HBoxContainer = $TopStrip/TopMargin/TopRow/Actions/PremiumCurrencyRow
@onready var _jade_currency_badge: Button = $TopStrip/TopMargin/TopRow/Actions/PremiumCurrencyRow/JadeCurrencyBadge
@onready var _copper_currency_badge: Button = $TopStrip/TopMargin/TopRow/Actions/PremiumCurrencyRow/CopperCurrencyBadge
@onready var _left_margin: MarginContainer = $LeftRail/LeftMargin
@onready var _left_column: VBoxContainer = $LeftRail/LeftMargin/LeftColumn
@onready var _task_header_row: HBoxContainer = $LeftRail/LeftMargin/LeftColumn/TaskHeaderRow
@onready var _task_icon: TextureRect = $LeftRail/LeftMargin/LeftColumn/TaskHeaderRow/TaskIcon
@onready var _task_title: Label = $LeftRail/LeftMargin/LeftColumn/TaskHeaderRow/TaskTitle
@onready var _task_body: Label = $LeftRail/LeftMargin/LeftColumn/TaskBody
@onready var _task_hint: Label = $LeftRail/LeftMargin/LeftColumn/TaskHint
@onready var _city_state_title: Label = $LeftRail/LeftMargin/LeftColumn/CityStateTitle
@onready var _city_state_summary: Label = $LeftRail/LeftMargin/LeftColumn/CityStateSummary
@onready var _city_tech_summary: Label = $LeftRail/LeftMargin/LeftColumn/CityTechSummary
@onready var _interior_quick_links: HBoxContainer = $LeftRail/LeftMargin/LeftColumn/InteriorQuickLinks
@onready var _interior_summary_button_market: Button = $LeftRail/LeftMargin/LeftColumn/InteriorQuickLinks/MarketQuickLinkButton
@onready var _interior_summary_button_tax: Button = $LeftRail/LeftMargin/LeftColumn/InteriorQuickLinks/TaxQuickLinkButton
@onready var _interior_summary_button_policy: Button = $LeftRail/LeftMargin/LeftColumn/InteriorQuickLinks/PolicyQuickLinkButton
@onready var _interior_summary_button_affairs: Button = $LeftRail/LeftMargin/LeftColumn/InteriorQuickLinks/AffairsQuickLinkButton
@onready var _troop_section_title: Label = $LeftRail/LeftMargin/LeftColumn/TroopSectionTitle
@onready var _troop_summary: Label = $LeftRail/LeftMargin/LeftColumn/TroopSummary
@onready var _troop_slot_scroll: ScrollContainer = $LeftRail/LeftMargin/LeftColumn/TroopSlotScroll
@onready var _troop_slot_list: VBoxContainer = $LeftRail/LeftMargin/LeftColumn/TroopSlotScroll/TroopSlotList
@onready var _troop_slot_01_button: Button = $LeftRail/LeftMargin/LeftColumn/TroopSlotScroll/TroopSlotList/TroopSlot01Button
@onready var _troop_slot_02_button: Button = $LeftRail/LeftMargin/LeftColumn/TroopSlotScroll/TroopSlotList/TroopSlot02Button
@onready var _troop_slot_03_button: Button = $LeftRail/LeftMargin/LeftColumn/TroopSlotScroll/TroopSlotList/TroopSlot03Button
@onready var _troop_slot_04_button: Button = $LeftRail/LeftMargin/LeftColumn/TroopSlotScroll/TroopSlotList/TroopSlot04Button
@onready var _troop_slot_05_button: Button = $LeftRail/LeftMargin/LeftColumn/TroopSlotScroll/TroopSlotList/TroopSlot05Button
@onready var _right_context_panel: PanelContainer = $RightContext
@onready var _right_margin_container: MarginContainer = $RightContext/RightMargin
@onready var _right_column: VBoxContainer = $RightContext/RightMargin/RightColumn
@onready var _context_slot_list: VBoxContainer = $RightContext/RightMargin/RightColumn/ContextSlotList
@onready var _context_slot_01_panel: PanelContainer = $RightContext/RightMargin/RightColumn/ContextSlotList/ContextSlot01Panel
@onready var _context_slot_02_panel: PanelContainer = $RightContext/RightMargin/RightColumn/ContextSlotList/ContextSlot02Panel
@onready var _context_slot_03_panel: PanelContainer = $RightContext/RightMargin/RightColumn/ContextSlotList/ContextSlot03Panel
@onready var _context_slot_01_label: Label = $RightContext/RightMargin/RightColumn/ContextSlotList/ContextSlot01Panel/SlotMargin/SlotLabel
@onready var _context_slot_02_label: Label = $RightContext/RightMargin/RightColumn/ContextSlotList/ContextSlot02Panel/SlotMargin/SlotLabel
@onready var _context_slot_03_label: Label = $RightContext/RightMargin/RightColumn/ContextSlotList/ContextSlot03Panel/SlotMargin/SlotLabel
@onready var _context_body: Label = $RightContext/RightMargin/RightColumn/ContextBody
@onready var _context_title: Label = $RightContext/RightMargin/RightColumn/ContextTitle
@onready var _world_entry_hint: Label = $BottomNav/BottomMargin/BottomRow/MainNav/WorldEntryHint
@onready var _generals_button: Button = $BottomNav/BottomMargin/BottomRow/MainNav/NavControlRow/NavButtons/GeneralsButton
@onready var _skill_library_button: Button = $BottomNav/BottomMargin/BottomRow/MainNav/NavControlRow/NavButtons/SkillLibraryButton
@onready var _interior_button: Button = $BottomNav/BottomMargin/BottomRow/MainNav/NavControlRow/NavButtons/InteriorButton
@onready var _alliance_button: Button = $BottomNav/BottomMargin/BottomRow/MainNav/NavControlRow/NavButtons/AllianceButton
@onready var _war_button: Button = $BottomNav/BottomMargin/BottomRow/MainNav/NavControlRow/NavButtons/WarButton
@onready var _ai_hub_button: Button = $BottomNav/BottomMargin/BottomRow/MainNav/NavControlRow/NavButtons/AiHubButton
@onready var _chat_button: Button = $BottomNav/BottomMargin/BottomRow/MainNav/NavControlRow/NavButtons/ChatButton
@onready var _recruit_button: Button = $BottomNav/BottomMargin/BottomRow/MainNav/NavControlRow/NavButtons/RecruitButton
@onready var _bag_button: Button = $BottomNav/BottomMargin/BottomRow/MainNav/NavControlRow/NavButtons/BagButton
@onready var _settings_button: Button = $BottomNav/BottomMargin/BottomRow/MainNav/NavControlRow/NavButtons/SettingsButton
@onready var _interior_entry_button: Button = $CenterStage/StageMargin/StageColumn/CityEntryGrid/InteriorEntryButton
@onready var _recruit_entry_button: Button = $CenterStage/StageMargin/StageColumn/CityEntryGrid/RecruitEntryButton
@onready var _generals_entry_button: Button = $CenterStage/StageMargin/StageColumn/CityEntryGrid/GeneralsEntryButton
@onready var _alliance_entry_button: Button = $CenterStage/StageMargin/StageColumn/CityEntryGrid/AllianceEntryButton
@onready var _ai_hub_entry_button: Button = $CenterStage/StageMargin/StageColumn/CityEntryGrid/AiHubEntryButton
@onready var _main_nav_menu_button: Button = $BottomNav/BottomMargin/BottomRow/MainNav/NavControlRow/MainNavMenuButton

@export var chrome_profile_catalog: Resource

var _current_mode: String = CITY_MODE
var _main_map_view_mode: String = MAIN_MAP_VIEW_MODE_GAMEPLAY
var _current_city_action: String = DEFAULT_CITY_ACTION
var _chrome_profile_id: String = CHROME_PROFILE_FALLBACK
var _troop_slot_buttons: Array = []
var _troop_slot_views: Array = []
var _context_slot_panels: Array = []
var _context_slot_labels: Array = []
var _last_context_slots: Array = []
var _last_troop_slot_payloads: Array = []
var _interior_summary_buttons: Dictionary = {}
var _left_troop_rail_icon_cache: Dictionary = {}
var _ui_texture_cache: Dictionary = {}
var _top_identity_panel: PanelContainer
var _top_player_avatar_texture: TextureRect
var _top_resource_icon_row: HBoxContainer
var _top_resource_chip_nodes: Dictionary = {}
var _last_resource_summary := ""
var _left_troop_rail_backdrop: Panel = null
var _city_action_button_groups: Dictionary = {}
var _is_main_nav_collapsed: bool = false
var _main_nav_recruit_spacer: Control
var _ai_switch_spacer: Control
var _ai_switch_button: Button
var _ai_activity_status_badge: Label
var _ai_activity_status_badge_trace_count: int = 0
var _ai_activity_status_badge_current_task: String = ""
var _ai_activity_status_badge_source: String = AI_ACTIVITY_STATUS_BADGE_SOURCE_NONE
var _fallback_chrome_profile_catalog: Resource = NativeShellChromeProfileCatalogScript.new()
var _city_grid_debug_preview: Control
var _city_grid_foundation_texture: TextureRect
var _city_grid_wall_ring_texture: TextureRect
var _city_grid_debug_cells: Array = []
var _player_display_name: String = PLAYER_DEFAULT_DISPLAY_NAME
var _player_name_ready: bool = false
var _player_name_dialog: AcceptDialog = null
var _player_name_input: LineEdit = null
var _player_name_feedback: Label = null

func _ready() -> void:
	_clear_placeholder_text_nodes()
	var mode_toggle_callback := Callable(self, "_on_mode_toggle_pressed")
	if not _mode_toggle_button.pressed.is_connected(mode_toggle_callback):
		_mode_toggle_button.pressed.connect(mode_toggle_callback)
	_bind_action_button(_mail_button, "mail")
	_bind_action_button(_activity_button, "activity")
	_bind_action_button(_help_button, "help")
	_register_city_action_button(_war_button, "battle_report", CITY_ACTION_SURFACE_MAIN_NAV)
	if _main_nav_menu_button != null:
		var menu_callback := Callable(self, "_on_main_nav_menu_button_pressed")
		if not _main_nav_menu_button.pressed.is_connected(menu_callback):
			_main_nav_menu_button.pressed.connect(menu_callback)
	_register_city_action_button(_interior_button, "interior", CITY_ACTION_SURFACE_MAIN_NAV)
	_register_city_action_button(_recruit_button, "recruit", CITY_ACTION_SURFACE_MAIN_NAV)
	_register_city_action_button(_generals_button, "generals", CITY_ACTION_SURFACE_MAIN_NAV)
	_register_city_action_button(_skill_library_button, "skill_library", CITY_ACTION_SURFACE_MAIN_NAV)
	_register_city_action_button(_alliance_button, "alliance", CITY_ACTION_SURFACE_MAIN_NAV)
	_register_city_action_button(_ai_hub_button, "ai_hub", CITY_ACTION_SURFACE_MAIN_NAV)
	_register_city_action_button(_chat_button, "chat", CITY_ACTION_SURFACE_MAIN_NAV)
	_register_city_action_button(_settings_button, "settings", CITY_ACTION_SURFACE_MAIN_NAV)
	_register_city_action_button(_interior_entry_button, "interior", CITY_ACTION_SURFACE_ENTRY)
	_register_city_action_button(_recruit_entry_button, "recruit", CITY_ACTION_SURFACE_ENTRY)
	_register_city_action_button(_generals_entry_button, "generals", CITY_ACTION_SURFACE_ENTRY)
	_register_city_action_button(_alliance_entry_button, "alliance", CITY_ACTION_SURFACE_ENTRY)
	_register_city_action_button(_ai_hub_entry_button, "ai_hub", CITY_ACTION_SURFACE_ENTRY)
	_interior_summary_buttons = {
		"market": _interior_summary_button_market,
		"tax": _interior_summary_button_tax,
		"policy": _interior_summary_button_policy,
		"affairs": _interior_summary_button_affairs,
	}
	for tab_id in _interior_summary_buttons.keys():
		_bind_interior_summary_button(_interior_summary_buttons[tab_id] as Button, str(tab_id))
	_troop_slot_buttons = [
		_troop_slot_01_button,
		_troop_slot_02_button,
		_troop_slot_03_button,
		_troop_slot_04_button,
		_troop_slot_05_button,
	]
	_troop_slot_views.clear()
	_context_slot_panels = [
		_context_slot_01_panel,
		_context_slot_02_panel,
		_context_slot_03_panel,
	]
	_context_slot_labels = [
		_context_slot_01_label,
		_context_slot_02_label,
		_context_slot_03_label,
	]
	for index in range(_troop_slot_buttons.size()):
		var troop_button := _troop_slot_buttons[index] as Button
		_troop_slot_views.append(_ensure_troop_slot_view(troop_button))
		_bind_troop_slot_button(troop_button, index)
	_ensure_top_identity_block()
	_ensure_top_resource_icon_row()
	_ensure_bottom_utility_row_layout()
	set_resource_summary("")
	set_troop_summary("")
	_apply_shell_icons()
	_ensure_city_grid_debug_preview()
	_apply_typography_profile()
	_apply_shell_layout_geometry_profile()
	_refresh_city_grid_debug_preview()
	_refresh_top_strip_chrome()
	_refresh_backdrop_chrome()
	_refresh_bottom_nav_chrome()
	_refresh_right_context_chrome()
	_refresh_left_troop_rail_chrome()
	set_premium_currency_summary("")
	_refresh_top_strip_chrome()
	_load_player_profile()
	_apply_player_display_name()
	call_deferred("_show_player_name_dialog_if_needed")
	if _context_title != null:
		_context_title.text = _resolve_shell_copy_value("default_context_title_text", "城市上下文")
	_apply_left_rail_density_style()
	set_context_slots([])
	set_troop_slots([])
	set_display_mode(CITY_MODE)
	set_city_overview({})
	set_context_summary("")
	_apply_static_action_button_copy()
	_apply_utility_row_style()
	_reorder_left_rail_layout()
	_ensure_bottom_utility_row_layout()
	_ensure_main_nav_recruit_spacer()
	_ensure_ai_switch_recruit_nav_button()
	set_ai_activity_status_badge([])
	_apply_main_nav_button_order()
	_refresh_troop_slot_scroll_container()
	set_city_action_focus(DEFAULT_CITY_ACTION)
	_refresh_interior_summary_buttons()
	_refresh_under_construction_buttons()
	_set_main_nav_collapsed(false, true)
	_apply_mainline_command_button_skin_poc()

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED and is_inside_tree():
		_apply_shell_layout_geometry_profile()
		_refresh_top_strip_chrome()
		_refresh_left_troop_rail_chrome()

func _clear_placeholder_text_nodes() -> void:
	var text_nodes: Array = [
		_profile_badge,
		_resource_strip,
		_jade_currency_badge,
		_copper_currency_badge,
		_mode_toggle_button,
		_task_title,
		_task_body,
		_task_hint,
		_city_state_title,
		_city_state_summary,
		_city_tech_summary,
		_interior_summary_button_market,
		_interior_summary_button_tax,
		_interior_summary_button_policy,
		_interior_summary_button_affairs,
		_troop_section_title,
		_troop_summary,
		_troop_slot_01_button,
		_troop_slot_02_button,
		_troop_slot_03_button,
		_troop_slot_04_button,
		_troop_slot_05_button,
		_context_title,
		_context_body,
		_context_slot_01_label,
		_context_slot_02_label,
		_context_slot_03_label,
		_mode_badge,
		_stage_title,
		_stage_body,
		_city_focus,
		_interior_entry_button,
		_recruit_entry_button,
		_generals_entry_button,
		_alliance_entry_button,
		_ai_hub_entry_button,
		_entry_status,
		_mode_hint,
		_mail_button,
		_activity_button,
		_help_button,
		_generals_button,
		_interior_button,
		_alliance_button,
		_war_button,
		_ai_hub_button,
		_chat_button,
		_recruit_button,
		_bag_button,
		_settings_button,
		_world_entry_hint,
	]
	for node_variant in text_nodes:
		if node_variant == null:
			continue
		if node_variant is Label:
			(node_variant as Label).text = ""
		elif node_variant is Button:
			(node_variant as Button).text = ""

func set_chrome_profile(profile_id: String) -> void:
	_chrome_profile_id = _normalize_chrome_profile_id(profile_id)
	if not is_inside_tree():
		return
	_refresh_chrome_profile()

func set_main_map_view_mode(next_mode: String) -> void:
	var normalized_mode: String = next_mode.strip_edges().to_lower()
	if normalized_mode != MAIN_MAP_VIEW_MODE_TIANXIA_YUTU:
		normalized_mode = MAIN_MAP_VIEW_MODE_GAMEPLAY
	if _main_map_view_mode == normalized_mode:
		set_display_mode(_current_mode)
		return
	_main_map_view_mode = normalized_mode
	if is_inside_tree():
		set_display_mode(_current_mode)

func set_display_mode(next_mode: String) -> void:
	_current_mode = WORLD_MODE if next_mode == WORLD_MODE else CITY_MODE
	var is_world_mode: bool = _current_mode == WORLD_MODE
	var is_tianxia_yutu_view: bool = is_world_mode and _main_map_view_mode == MAIN_MAP_VIEW_MODE_TIANXIA_YUTU
	var world_title: String = COPY_TIANXIA_YUTU_TITLE if is_tianxia_yutu_view else COPY_MAIN_WORLD_TITLE
	_mode_badge.text = world_title if is_world_mode else _resolve_shell_copy_value("default_mode_badge_city", "主城")
	_stage_title.text = world_title if is_world_mode else _resolve_shell_copy_value("default_stage_title_city", "主城入口")
	var raw_stage_body := (
		"天下舆图用于查看州郡边界、建国范围、定位与跳转。"
		if is_tianxia_yutu_view
		else "主世界用于资源格、城池、关口、占领与行军等玩家操作。"
		if is_world_mode
		else _resolve_shell_copy_value("default_stage_body_city", "主城先稳定任务、队列和入口层级。")
	)
	_stage_body.text = _compact_multiline_text(raw_stage_body, 2, 20)
	_stage_body.tooltip_text = raw_stage_body
	var raw_mode_hint := (
		"当前为天下舆图总览，可通过舆图导航定位并返回主世界。"
		if is_tianxia_yutu_view
		else "当前为主世界玩法地图，可从右上切到天下舆图。"
		if is_world_mode
		else _resolve_shell_copy_value("default_mode_hint_city", "当前继续压主壳层级，让地图回到主视区。")
	)
	_mode_hint.text = _compact_multiline_text(raw_mode_hint, 2, 18)
	_mode_hint.tooltip_text = raw_mode_hint
	var raw_world_entry_hint := (
		"当前正在浏览天下舆图；使用舆图导航前往目标。"
		if is_tianxia_yutu_view
		else "当前为主世界；右上进入天下舆图。"
		if is_world_mode
		else _resolve_shell_copy_value("default_world_entry_hint_city", "主线入口留底栏；战报/活动降为辅助。")
	)
	_world_entry_hint.text = _compact_single_line_text(raw_world_entry_hint, 20)
	_world_entry_hint.tooltip_text = raw_world_entry_hint
	if is_world_mode:
		_mode_toggle_button.text = COPY_MAIN_WORLD_TITLE if is_tianxia_yutu_view else COPY_TIANXIA_YUTU_TITLE
	else:
		_mode_toggle_button.text = COPY_MAIN_WORLD_TITLE
	var show_center_stage := not is_world_mode
	if _center_stage != null:
		_center_stage.visible = show_center_stage
	if _bottom_nav_panel != null:
		_bottom_nav_panel.visible = not is_tianxia_yutu_view
	_apply_tianxia_yutu_shell_hud_visibility(is_tianxia_yutu_view)
	_mode_badge.visible = false
	_stage_title.visible = show_center_stage
	_stage_body.visible = show_center_stage
	_city_focus.visible = show_center_stage
	_entry_status.visible = show_center_stage
	_mode_hint.visible = show_center_stage
	var has_city_grid_profile := _refresh_city_grid_debug_preview()
	_city_entry_grid.visible = not is_world_mode and not has_city_grid_profile
	if _city_grid_debug_preview != null:
		_city_grid_debug_preview.visible = not is_world_mode and has_city_grid_profile
	_city_entry_grid.columns = 5 if not is_world_mode else 3
	_refresh_city_shell_density()
	_refresh_city_action_button_states()
	_refresh_utility_row_density()
	_refresh_ai_switch_button_visibility()
	_apply_main_nav_layout_state()
	_refresh_interior_summary_buttons()
	_refresh_under_construction_buttons()
	_refresh_right_context_visibility()

func _apply_tianxia_yutu_shell_hud_visibility(is_tianxia_yutu_view: bool) -> void:
	if _top_strip != null:
		_top_strip.visible = not is_tianxia_yutu_view
		if is_tianxia_yutu_view:
			_top_strip.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
			_top_strip.offset_left = -188.0
			_top_strip.offset_top = 10.0
			_top_strip.offset_right = -12.0
			_top_strip.offset_bottom = 50.0
		else:
			_top_strip.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
			var layout_profile := _resolve_shell_layout_profile()
			_apply_control_offsets(_top_strip, layout_profile, "top_strip")
	if _top_margin_container != null:
		if is_tianxia_yutu_view:
			_top_margin_container.add_theme_constant_override("margin_left", 6)
			_top_margin_container.add_theme_constant_override("margin_top", 5)
			_top_margin_container.add_theme_constant_override("margin_right", 6)
			_top_margin_container.add_theme_constant_override("margin_bottom", 5)
		else:
			_apply_margin_offsets(_top_margin_container, _resolve_shell_layout_profile(), "top")
	if _top_identity_panel != null:
		_top_identity_panel.visible = not is_tianxia_yutu_view
	if _profile_badge != null:
		_profile_badge.visible = not is_tianxia_yutu_view
	if _top_resource_icon_row != null:
		_top_resource_icon_row.visible = not is_tianxia_yutu_view
	if _resource_strip != null:
		_resource_strip.visible = false
	if _premium_currency_row != null:
		_premium_currency_row.visible = not is_tianxia_yutu_view
	if _top_actions_row != null:
		_top_actions_row.visible = not is_tianxia_yutu_view
	if _mode_toggle_button != null:
		_mode_toggle_button.visible = not is_tianxia_yutu_view
	if _left_rail_panel != null:
		_left_rail_panel.visible = not is_tianxia_yutu_view
	_sync_left_troop_rail_backdrop()

func set_context_summary(summary: String) -> void:
	var normalized_summary := summary.strip_edges()
	if normalized_summary == "":
		normalized_summary = _resolve_shell_copy_value("default_context_summary", "等待 runtime 与 world 数据加载。")
	_context_body.text = normalized_summary
	_context_body.tooltip_text = normalized_summary
	_refresh_right_context_visibility()

func set_context_slots(slot_payloads: Array) -> void:
	_last_context_slots = slot_payloads.duplicate(true)
	var resolved_slot_payloads: Array = slot_payloads if not slot_payloads.is_empty() else _resolve_default_context_slots()
	for index in range(_context_slot_labels.size()):
		var slot_panel := _context_slot_panels[index] as PanelContainer
		var slot_label := _context_slot_labels[index] as Label
		if slot_panel == null or slot_label == null:
			continue
		if index >= resolved_slot_payloads.size() or not (resolved_slot_payloads[index] is Dictionary):
			slot_panel.visible = false
			slot_label.text = ""
			slot_label.tooltip_text = ""
			continue
		var slot_payload := resolved_slot_payloads[index] as Dictionary
		var label := str(slot_payload.get("label", "")).strip_edges()
		var value := str(slot_payload.get("value", "")).strip_edges()
		var tooltip := str(slot_payload.get("tooltip", "")).strip_edges()
		var line_text := _format_copy_template(
			"context_slot_line_template",
			{
				"label": label,
				"value": value,
			},
			"{label} | {value}"
		).strip_edges()
		slot_panel.visible = line_text != ""
		slot_label.text = _compact_single_line_text(line_text, 18)
		slot_label.tooltip_text = tooltip if tooltip != "" else line_text
	_refresh_right_context_visibility()


func set_resource_summary(summary: String) -> void:
	_last_resource_summary = summary if summary.strip_edges() != "" else _resolve_shell_copy_value("default_resource_summary", "粮 -- | 木 -- | 石 -- | 铁 -- | 铜 --")
	if _resource_strip != null:
		_resource_strip.text = _last_resource_summary
		_resource_strip.visible = false
	_ensure_top_resource_icon_row()
	_update_top_resource_icon_row(_last_resource_summary)

func _ensure_top_identity_block() -> void:
	if _top_row == null or _profile_badge == null:
		return
	if _top_identity_panel != null and is_instance_valid(_top_identity_panel):
		return
	var old_parent := _profile_badge.get_parent()
	var original_index := _profile_badge.get_index()
	if old_parent != null:
		old_parent.remove_child(_profile_badge)
	_top_identity_panel = PanelContainer.new()
	_top_identity_panel.name = "TopIdentityBlock"
	_top_identity_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	_top_identity_panel.custom_minimum_size = Vector2(184.0, 42.0)
	_top_identity_panel.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	_top_identity_panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_top_identity_panel.tooltip_text = "点击修改名字"
	_top_identity_panel.add_theme_stylebox_override("panel", _build_button_stylebox(Color(0.96, 0.93, 0.84, 0.82), Color(0.62, 0.45, 0.24, 0.48), 4, 1, 10, 10, 4, 4))
	_top_row.add_child(_top_identity_panel)
	_top_row.move_child(_top_identity_panel, maxi(0, original_index))
	var identity_callback := Callable(self, "_on_top_identity_block_gui_input")
	if not _top_identity_panel.gui_input.is_connected(identity_callback):
		_top_identity_panel.gui_input.connect(identity_callback)
	var margin := MarginContainer.new()
	margin.name = "IdentityMargin"
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.add_theme_constant_override("margin_left", 7)
	margin.add_theme_constant_override("margin_top", 4)
	margin.add_theme_constant_override("margin_right", 10)
	margin.add_theme_constant_override("margin_bottom", 4)
	_top_identity_panel.add_child(margin)
	var identity_row := HBoxContainer.new()
	identity_row.name = "IdentityRow"
	identity_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	identity_row.add_theme_constant_override("separation", 7)
	margin.add_child(identity_row)
	_top_player_avatar_texture = TextureRect.new()
	_top_player_avatar_texture.name = "PlayerAvatar"
	_top_player_avatar_texture.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_top_player_avatar_texture.custom_minimum_size = TOP_PLAYER_AVATAR_SIZE
	_top_player_avatar_texture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_top_player_avatar_texture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	_top_player_avatar_texture.texture = _load_ui_texture(TOP_PLAYER_AVATAR_PATH)
	identity_row.add_child(_top_player_avatar_texture)
	_profile_badge.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_profile_badge.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_profile_badge.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_profile_badge.text = _player_display_name
	_profile_badge.visible = true
	identity_row.add_child(_profile_badge)

func _on_top_identity_block_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed:
			_show_player_name_dialog(false)

func _load_player_profile() -> void:
	var config := ConfigFile.new()
	var load_err := config.load(PLAYER_PROFILE_CONFIG_PATH)
	if load_err != OK:
		_player_display_name = PLAYER_DEFAULT_DISPLAY_NAME
		_player_name_ready = false
		return
	_player_display_name = _sanitize_player_display_name(str(config.get_value(PLAYER_PROFILE_SECTION, PLAYER_DISPLAY_NAME_KEY, PLAYER_DEFAULT_DISPLAY_NAME)), true)
	_player_name_ready = bool(config.get_value(PLAYER_PROFILE_SECTION, PLAYER_NAME_READY_KEY, false)) and _player_display_name != PLAYER_DEFAULT_DISPLAY_NAME

func _save_player_profile(display_name: String, name_ready: bool) -> bool:
	var config := ConfigFile.new()
	config.set_value(PLAYER_PROFILE_SECTION, PLAYER_DISPLAY_NAME_KEY, display_name)
	config.set_value(PLAYER_PROFILE_SECTION, PLAYER_NAME_READY_KEY, name_ready)
	return config.save(PLAYER_PROFILE_CONFIG_PATH) == OK

func _apply_player_display_name() -> void:
	if _profile_badge == null:
		return
	_profile_badge.text = _player_display_name
	_profile_badge.tooltip_text = "点击修改名字"
	if _top_identity_panel != null:
		_top_identity_panel.tooltip_text = "点击修改名字"

func _show_player_name_dialog_if_needed() -> void:
	if not _player_name_ready:
		_show_player_name_dialog(true)

func _show_player_name_dialog(is_first_time: bool) -> void:
	_ensure_player_name_dialog()
	if _player_name_dialog == null:
		return
	_player_name_dialog.title = "给自己起个名字"
	_player_name_dialog.dialog_text = ""
	if _player_name_input != null:
		_player_name_input.text = "" if is_first_time and _player_display_name == PLAYER_DEFAULT_DISPLAY_NAME else _player_display_name
		_player_name_input.placeholder_text = "输入你的名字"
		_player_name_input.call_deferred("grab_focus")
	if _player_name_feedback != null:
		_player_name_feedback.text = "名字会显示在左上角。"
	_player_name_dialog.popup_centered(Vector2i(420, 220))

func _ensure_player_name_dialog() -> void:
	if _player_name_dialog != null and is_instance_valid(_player_name_dialog):
		return
	_player_name_dialog = AcceptDialog.new()
	_player_name_dialog.name = "PlayerNameFirstRunDialog"
	_player_name_dialog.title = "给自己起个名字"
	_player_name_dialog.ok_button_text = "确认"
	_player_name_dialog.close_requested.connect(_on_player_name_dialog_close_requested)
	_player_name_dialog.confirmed.connect(_on_player_name_dialog_confirmed)
	add_child(_player_name_dialog)
	var margin := MarginContainer.new()
	margin.name = "PlayerNameDialogMargin"
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 8)
	_player_name_dialog.add_child(margin)
	var column := VBoxContainer.new()
	column.name = "PlayerNameDialogColumn"
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)
	var title_label := Label.new()
	title_label.name = "PlayerNameTitle"
	title_label.text = "起个名字"
	title_label.add_theme_font_size_override("font_size", 22)
	title_label.add_theme_color_override("font_color", MAINLINE_TOP_PAPER_TEXT)
	column.add_child(title_label)
	var hint_label := Label.new()
	hint_label.name = "PlayerNameHint"
	hint_label.text = "这个名字会替换左上角的真人玩家。"
	hint_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hint_label.add_theme_font_size_override("font_size", 15)
	hint_label.add_theme_color_override("font_color", Color(0.25, 0.20, 0.13, 0.88))
	column.add_child(hint_label)
	_player_name_input = LineEdit.new()
	_player_name_input.name = "PlayerNameInput"
	_player_name_input.max_length = PLAYER_NAME_MAX_LENGTH
	_player_name_input.custom_minimum_size = Vector2(330, 42)
	_player_name_input.text_submitted.connect(_on_player_name_input_submitted)
	column.add_child(_player_name_input)
	_player_name_feedback = Label.new()
	_player_name_feedback.name = "PlayerNameFeedback"
	_player_name_feedback.text = "名字会显示在左上角。"
	_player_name_feedback.add_theme_font_size_override("font_size", 13)
	_player_name_feedback.add_theme_color_override("font_color", Color(0.34, 0.25, 0.14, 0.86))
	column.add_child(_player_name_feedback)

func _on_player_name_dialog_close_requested() -> void:
	if not _player_name_ready:
		_save_player_name_from_dialog(PLAYER_DEFAULT_DISPLAY_NAME, true)

func _on_player_name_dialog_confirmed() -> void:
	_save_player_name_from_dialog(_player_name_input.text if _player_name_input != null else "", false)

func _on_player_name_input_submitted(_text: String) -> void:
	_save_player_name_from_dialog(_player_name_input.text if _player_name_input != null else "", false)
	if _player_name_dialog != null:
		_player_name_dialog.hide()

func _save_player_name_from_dialog(raw_name: String, allow_default: bool) -> void:
	var next_name := _sanitize_player_display_name(raw_name, allow_default)
	if next_name == "" or (next_name == PLAYER_DEFAULT_DISPLAY_NAME and not allow_default):
		if _player_name_feedback != null:
			_player_name_feedback.text = "请输入 1 到 8 个字。"
		_show_player_name_dialog(true)
		return
	_player_display_name = next_name
	_player_name_ready = true
	_apply_player_display_name()
	if not _save_player_profile(_player_display_name, _player_name_ready) and _player_name_feedback != null:
		_player_name_feedback.text = "名字已显示，本机保存失败。"

func _sanitize_player_display_name(raw_name: String, allow_default: bool = true) -> String:
	var cleaned := raw_name.strip_edges()
	cleaned = cleaned.replace("\n", "").replace("\r", "").replace("\t", "")
	if cleaned.length() > PLAYER_NAME_MAX_LENGTH:
		cleaned = cleaned.substr(0, PLAYER_NAME_MAX_LENGTH)
	if cleaned == "":
		return PLAYER_DEFAULT_DISPLAY_NAME if allow_default else ""
	return cleaned

func _ensure_top_resource_icon_row() -> void:
	if _top_row == null:
		return
	if _top_resource_icon_row != null and is_instance_valid(_top_resource_icon_row):
		return
	_top_resource_icon_row = HBoxContainer.new()
	_top_resource_icon_row.name = "TopResourceIconRow"
	_top_resource_icon_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_top_resource_icon_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_top_resource_icon_row.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_top_resource_icon_row.add_theme_constant_override("separation", 8)
	_top_row.add_child(_top_resource_icon_row)
	if _resource_strip != null and _resource_strip.get_parent() == _top_row:
		_top_row.move_child(_top_resource_icon_row, _resource_strip.get_index() + 1)
		_resource_strip.visible = false
	for resource_id in TOP_RESOURCE_IDS:
		_top_resource_icon_row.add_child(_build_top_resource_chip(resource_id))

func _build_top_resource_chip(resource_id: String) -> PanelContainer:
	var chip := PanelContainer.new()
	chip.name = "ResourceChip%s" % resource_id.capitalize()
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.custom_minimum_size = TOP_RESOURCE_CHIP_MIN_SIZE
	chip.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	chip.add_theme_stylebox_override("panel", _build_button_stylebox(Color(0.96, 0.93, 0.84, 0.82), Color(0.62, 0.45, 0.24, 0.46), 4, 1, 7, 7, 3, 3))
	var margin := MarginContainer.new()
	margin.name = "ChipMargin"
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.add_theme_constant_override("margin_left", 6)
	margin.add_theme_constant_override("margin_top", 3)
	margin.add_theme_constant_override("margin_right", 8)
	margin.add_theme_constant_override("margin_bottom", 3)
	chip.add_child(margin)
	var row := HBoxContainer.new()
	row.name = "ChipRow"
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 6)
	margin.add_child(row)
	var icon := TextureRect.new()
	icon.name = "ResourceIcon"
	icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	icon.custom_minimum_size = TOP_RESOURCE_ICON_SIZE
	icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	icon.texture = _load_ui_texture(str(TOP_RESOURCE_ICON_PATHS.get(resource_id, "")))
	row.add_child(icon)
	var value_label := Label.new()
	value_label.name = "ResourceValue"
	value_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	value_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	value_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	value_label.text = "--"
	value_label.add_theme_font_size_override("font_size", 15)
	value_label.add_theme_color_override("font_color", MAINLINE_TOP_PAPER_TEXT)
	value_label.add_theme_color_override("font_shadow_color", Color(1.0, 0.96, 0.86, 0.42))
	value_label.add_theme_constant_override("shadow_offset_x", 0)
	value_label.add_theme_constant_override("shadow_offset_y", 1)
	row.add_child(value_label)
	_top_resource_chip_nodes[resource_id] = {
		"panel": chip,
		"icon": icon,
		"value_label": value_label,
	}
	return chip

func _update_top_resource_icon_row(summary: String) -> void:
	var parsed := _parse_top_resource_summary(summary)
	for resource_id in TOP_RESOURCE_IDS:
		var refs: Dictionary = _top_resource_chip_nodes.get(resource_id, {}) as Dictionary
		var value_label := refs.get("value_label") as Label
		if value_label != null:
			value_label.text = str(parsed.get(resource_id, "--"))
			value_label.tooltip_text = "%s %s" % [_top_resource_label(resource_id), value_label.text]

func _parse_top_resource_summary(summary: String) -> Dictionary:
	var parsed := {
		"grain": "--",
		"wood": "--",
		"stone": "--",
		"iron": "--",
		"copper": "--",
	}
	for segment_variant in summary.split("|"):
		var segment := str(segment_variant).strip_edges()
		if segment == "":
			continue
		var resource_id := _top_resource_id_from_segment(segment)
		if resource_id == "":
			continue
		var value := segment
		for label in ["粮", "粮草", "food", "grain", "木", "木材", "wood", "石", "石料", "stone", "铁", "铁矿", "iron", "铜矿", "铜", "copper_ore", "copperore", "copper"]:
			value = value.replace(label, "")
		value = value.strip_edges()
		parsed[resource_id] = value if value != "" else "--"
	return parsed

func _top_resource_id_from_segment(segment: String) -> String:
	var normalized := segment.to_lower()
	if normalized.contains("粮") or normalized.contains("food") or normalized.contains("grain"):
		return "grain"
	if normalized.contains("木") or normalized.contains("wood"):
		return "wood"
	if normalized.contains("石") or normalized.contains("stone"):
		return "stone"
	if normalized.contains("铁") or normalized.contains("iron"):
		return "iron"
	if normalized.contains("铜") or normalized.contains("copper"):
		return "copper"
	return ""

func _top_resource_label(resource_id: String) -> String:
	match resource_id:
		"grain":
			return "粮"
		"wood":
			return "木"
		"stone":
			return "石"
		"iron":
			return "铁"
		"copper":
			return "铜"
		_:
			return resource_id

func set_premium_currency_summary(summary: String) -> void:
	if _premium_currency_row == null or _jade_currency_badge == null or _copper_currency_badge == null:
		return
	var normalized := _parse_premium_currency_summary(summary)
	var jade_value := str(normalized.get("jade", "0")).strip_edges()
	var copper_value := str(normalized.get("copper", "0")).strip_edges()
	var jade_label := _resolve_shell_copy_value("currency_jade_label", "玉符")
	var copper_label := _resolve_shell_copy_value("currency_copper_label", "铜钱")
	_jade_currency_badge.text = jade_value if jade_value != "" else "0"
	_copper_currency_badge.text = copper_value if copper_value != "" else "0"
	_premium_currency_row.tooltip_text = _format_copy_template(
		"currency_tooltip_template",
		{
			"jade_label": jade_label,
			"jade": _jade_currency_badge.text,
			"copper_label": copper_label,
			"copper": _copper_currency_badge.text,
		},
		"{jade_label} {jade} | {copper_label} {copper}"
	)
	_refresh_top_strip_chrome()

func set_city_overview(payload: Dictionary) -> void:
	var raw_task_title := str(payload.get("taskTitle", _resolve_shell_copy_value("default_city_task_title", "主城经营")))
	var raw_task_body := str(payload.get("taskBody", _resolve_shell_copy_value("default_city_task_body", "等待主城任务流加载。")))
	var raw_task_hint := str(payload.get("taskHint", _resolve_shell_copy_value("default_city_task_hint", "保持主城壳层稳定，再向大地图递进。")))
	var raw_city_state_title := str(payload.get("cityStateTitle", _resolve_shell_copy_value("default_city_state_title", "主城态势")))
	var raw_city_state_summary := str(payload.get("cityStateSummary", _resolve_shell_copy_value("default_city_state_summary", "等待主城业务数据加载。")))
	var raw_city_tech_summary := str(payload.get("cityTechSummary", _resolve_shell_copy_value("default_city_tech_summary", "政 0 后 0 防 0 募 0")))
	var raw_city_focus := str(payload.get("cityFocus", _resolve_shell_copy_value("default_city_focus", "主城：等待识别 | 已占城池 0 | 开发点 0")))
	_task_title.text = raw_task_title
	_task_body.text = ""
	_task_body.tooltip_text = _build_tooltip_text([raw_task_body, raw_task_hint])
	_task_body.visible = false
	_task_hint.text = ""
	_task_hint.tooltip_text = ""
	_task_hint.visible = false
	_city_state_title.text = raw_city_state_title
	_city_state_summary.text = ""
	_city_state_summary.tooltip_text = _build_tooltip_text([raw_city_state_summary, raw_city_tech_summary])
	_city_state_summary.visible = false
	_city_tech_summary.text = ""
	_city_tech_summary.tooltip_text = raw_city_tech_summary
	_city_tech_summary.visible = false
	_city_focus.text = _compact_single_line_text(raw_city_focus, 20)
	_city_focus.tooltip_text = raw_city_focus
	if payload.has("activeCityAction"):
		set_city_action_focus(str(payload.get("activeCityAction", DEFAULT_CITY_ACTION)))
	var raw_entry_status := str(payload.get("entryStatus", _resolve_shell_copy_value("default_entry_status", "当前：内政")))
	if payload.has("entryStatus"):
		raw_entry_status = str(payload.get("entryStatus", raw_entry_status))
	_entry_status.text = _compact_single_line_text(raw_entry_status, 12)
	_entry_status.tooltip_text = _build_tooltip_text([raw_entry_status, raw_task_hint])
	_refresh_city_shell_density()

func set_troop_summary(summary: String) -> void:
	_troop_section_title.text = ""
	_troop_section_title.visible = false
	var normalized := summary if summary.strip_edges() != "" else _resolve_shell_copy_value("default_troop_summary", "等待 5 部队总览加载。")
	_troop_summary.text = ""
	_troop_summary.tooltip_text = normalized
	_troop_summary.visible = false

func set_troop_slots(slot_payloads: Array) -> void:
	_last_troop_slot_payloads = slot_payloads.duplicate(true)
	var slot_labels: Array = ["一队", "二队", "三队", "四队", "五队"]
	for index in range(_troop_slot_buttons.size()):
		var button := _troop_slot_buttons[index] as Button
		if button == null:
			continue
		var payload: Dictionary = {}
		if index < slot_payloads.size() and slot_payloads[index] is Dictionary:
			payload = slot_payloads[index] as Dictionary
		var troop_id := str(payload.get("id", "")).strip_edges()
		var label := str(payload.get("label", slot_labels[index]))
		var subtitle := str(payload.get("subtitle", ""))
		var status_text := str(payload.get("statusText", ""))
		var is_enabled := troop_id != "" and bool(payload.get("enabled", troop_id != ""))
		var has_map_position := bool(payload.get("hasMapPosition", false)) and str(payload.get("tileId", "")).strip_edges() != ""
		button.visible = is_enabled
		var role_tag := _resolve_troop_slot_role_tag(index, is_enabled)
		var state_tag := _resolve_troop_slot_state_tag(status_text, subtitle, is_enabled)
		button.text = ""
		var tooltip_state := status_text if status_text.strip_edges() != "" else subtitle
		var strength := int(payload.get("strength", 0))
		var strength_max := maxi(maxi(int(payload.get("strengthMax", 0)), strength), 1)
		button.tooltip_text = _build_tooltip_text([
			_format_copy_template(
				"troop_slot_tooltip_template",
				{
					"label": label,
					"role": role_tag,
					"state": tooltip_state,
				},
				"{label} | {role} | {state}"
			),
			"兵力：%s/%s" % [
				_format_grouped_int(strength),
				_format_grouped_int(strength_max),
			],
			str(payload.get("description", _resolve_shell_copy_value("default_troop_slot_description", "等待部队编组。"))),
		])
		button.disabled = not is_enabled
		button.set_meta("troop_id", troop_id)
		button.set_meta("troop_tile_id", str(payload.get("tileId", "")).strip_edges())
		button.set_meta("left_troop_rail_jump_action_id", str(payload.get("jumpActionId", "")).strip_edges())
		button.set_meta("left_troop_rail_jump_action_node_name", str(payload.get("jumpActionNodeName", button.name)).strip_edges())
		button.set_meta("left_troop_rail_jump_action_available", is_enabled and has_map_position)
		button.set_meta("troop_strength", strength)
		button.set_meta("troop_strength_max", strength_max)
		button.set_meta("troop_status_label", _resolve_troop_slot_status_label(payload, status_text, subtitle, is_enabled))
		button.set_meta("troop_title_label", label)
		var hero_name := _resolve_troop_slot_hero_name(payload, subtitle)
		button.set_meta("troop_portrait_label", _resolve_troop_slot_portrait_text(hero_name, slot_labels[index], is_enabled))
		button.set_meta("troop_slot_label", slot_labels[index])
		button.set_meta("troop_role_tag", role_tag)
		_apply_troop_slot_button_style(button, status_text, button.disabled, role_tag, index)
		_apply_troop_slot_content(button, payload, slot_labels[index], role_tag, is_enabled)
	_refresh_troop_slot_scroll_container(_resolve_shell_layout_profile())

func get_left_troop_rail_visual_summary() -> Dictionary:
	_sync_left_troop_rail_backdrop()
	var panel_exists := _left_rail_panel != null
	var panel_visible := panel_exists and _left_rail_panel.visible and _left_rail_panel.is_visible_in_tree()
	var panel_rect := _left_rail_panel.get_global_rect() if panel_exists else Rect2()
	var bottom_nav_rect := _bottom_nav_panel.get_global_rect() if _bottom_nav_panel != null else Rect2()
	var overlaps_bottom_nav := panel_exists and _bottom_nav_panel != null and _bottom_nav_panel.visible and _left_troop_rail_rects_overlap(panel_rect, bottom_nav_rect)
	var style_token := str(_left_rail_panel.get_meta("left_troop_rail_style_token", "")) if panel_exists else ""
	var backdrop_rect := _left_troop_rail_backdrop.get_global_rect() if _left_troop_rail_backdrop != null and is_instance_valid(_left_troop_rail_backdrop) else Rect2()
	var backdrop_ok := (
		_left_troop_rail_backdrop != null
		and is_instance_valid(_left_troop_rail_backdrop)
		and _left_troop_rail_backdrop.visible
		and _left_troop_rail_backdrop.is_visible_in_tree()
		and absf(backdrop_rect.position.x - panel_rect.position.x) <= 1.0
		and absf(backdrop_rect.position.y - panel_rect.position.y) <= 1.0
		and absf(backdrop_rect.size.x - panel_rect.size.x) <= 1.0
		and absf(backdrop_rect.size.y - panel_rect.size.y) <= 1.0
	)
	var slots: Array = []
	var visible_slot_count := 0
	var card_contract_ok := true
	var icon_contract_ok := true
	var secondary_icons_removed_ok := true
	var status_badge_contract_ok := true
	var text_contract_ok := true
	var metric_bars_ok := true
	var morale_hidden_ok := true
	var slim_card_ok := true
	var real_button_ok := true
	var old_shell_hidden_ok := true
	var uniform_size_ok := true
	var no_phantom_empty_frame_ok := true
	var jump_action_available := false
	var jump_action_node_name := ""
	var no_standby_copy := true
	var slot_grid_aligned_ok := true
	var avatar_column_aligned_ok := true
	var status_column_aligned_ok := true
	var strength_column_aligned_ok := true
	var bar_column_aligned_ok := true
	var jump_button_column_aligned_ok := true
	var reference_slot_rect := Rect2()
	var reference_avatar_rect := Rect2()
	var reference_status_rect := Rect2()
	var reference_strength_rect := Rect2()
	var reference_bar_rect := Rect2()
	var has_reference_slot_rect := false
	var has_reference_avatar_rect := false
	var has_reference_status_rect := false
	var has_reference_strength_rect := false
	var has_reference_bar_rect := false
	var task_body_hidden := _task_body == null or not _task_body.visible or not _task_body.is_visible_in_tree() or _task_body.text.strip_edges() == ""
	var city_state_title_hidden := _city_state_title == null or not _city_state_title.visible or not _city_state_title.is_visible_in_tree() or _city_state_title.text.strip_edges() == ""
	var city_state_summary_hidden := _city_state_summary == null or not _city_state_summary.visible or not _city_state_summary.is_visible_in_tree() or _city_state_summary.text.strip_edges() == ""
	var city_tech_summary_hidden := _city_tech_summary == null or not _city_tech_summary.visible or not _city_tech_summary.is_visible_in_tree() or _city_tech_summary.text.strip_edges() == ""
	var troop_section_title_hidden := _troop_section_title == null or not _troop_section_title.visible or not _troop_section_title.is_visible_in_tree() or _troop_section_title.text.strip_edges() == ""
	var troop_summary_hidden := _troop_summary == null or not _troop_summary.visible or not _troop_summary.is_visible_in_tree() or _troop_summary.text.strip_edges() == ""
	var troop_strength_tags_hidden_ok := true
	var player_density_ok := false
	var reference_size := Vector2.ZERO
	for index in range(_troop_slot_buttons.size()):
		var button := _troop_slot_buttons[index] as Button
		if button == null:
			real_button_ok = false
			continue
		var refs := _resolve_troop_slot_view(button)
		var button_visible := button.visible and button.is_visible_in_tree()
		if button_visible:
			visible_slot_count += 1
		if button_visible and str(button.get_meta("troop_id", "")).strip_edges() == "":
			no_phantom_empty_frame_ok = false
		var slot_jump_available := bool(button.get_meta("left_troop_rail_jump_action_available", false))
		if slot_jump_available and jump_action_node_name == "":
			jump_action_available = true
			jump_action_node_name = button.name
		var button_rect := button.get_global_rect()
		if button_visible and reference_size == Vector2.ZERO:
			reference_size = button_rect.size
		if button_visible and reference_size != Vector2.ZERO:
			uniform_size_ok = uniform_size_ok and absf(button_rect.size.x - reference_size.x) <= 1.0 and absf(button_rect.size.y - reference_size.y) <= 1.0
		var portrait_texture := refs.get("portrait_texture") as TextureRect
		var role_icon := refs.get("role_icon") as TextureRect
		var type_icon := refs.get("type_icon") as TextureRect
		var status_icon := refs.get("status_icon") as TextureRect
		var shell_texture := refs.get("shell_texture") as TextureRect
		var portrait_panel := refs.get("portrait_panel") as PanelContainer
		var slot_label := refs.get("slot_label") as Label
		var role_label := refs.get("role_label") as Label
		var status_label := refs.get("status_label") as Label
		var title_label := refs.get("title_label") as Label
		var strength_value := refs.get("strength_value") as Label
		var strength_tag := refs.get("strength_tag") as Label
		var strength_track := refs.get("strength_track") as PanelContainer
		var morale_track := refs.get("morale_track") as PanelContainer
		var morale_row := refs.get("morale_row") as Control
		if button_visible:
			if not has_reference_slot_rect:
				reference_slot_rect = button_rect
				has_reference_slot_rect = true
			else:
				slot_grid_aligned_ok = slot_grid_aligned_ok and _left_troop_rail_column_rect_aligned(button_rect, reference_slot_rect, LEFT_TROOP_RAIL_ALIGNMENT_TOLERANCE_PX, true)
				jump_button_column_aligned_ok = jump_button_column_aligned_ok and _left_troop_rail_column_rect_aligned(button_rect, reference_slot_rect, LEFT_TROOP_RAIL_ALIGNMENT_TOLERANCE_PX, true)
			var avatar_rect := _left_troop_rail_control_rect(portrait_panel)
			if avatar_rect.size.x > 0.0 and avatar_rect.size.y > 0.0:
				if not has_reference_avatar_rect:
					reference_avatar_rect = avatar_rect
					has_reference_avatar_rect = true
				else:
					avatar_column_aligned_ok = avatar_column_aligned_ok and _left_troop_rail_column_rect_aligned(avatar_rect, reference_avatar_rect, LEFT_TROOP_RAIL_ALIGNMENT_TOLERANCE_PX, true)
			var status_rect := _left_troop_rail_control_rect(status_icon)
			if status_rect.size.x > 0.0 and status_rect.size.y > 0.0:
				if not has_reference_status_rect:
					reference_status_rect = status_rect
					has_reference_status_rect = true
				else:
					status_column_aligned_ok = status_column_aligned_ok and _left_troop_rail_column_rect_aligned(status_rect, reference_status_rect, LEFT_TROOP_RAIL_ALIGNMENT_TOLERANCE_PX, true)
			var strength_rect := _left_troop_rail_control_rect(strength_value)
			if strength_rect.size.x > 0.0 and strength_rect.size.y > 0.0:
				if not has_reference_strength_rect:
					reference_strength_rect = strength_rect
					has_reference_strength_rect = true
				else:
					strength_column_aligned_ok = strength_column_aligned_ok and _left_troop_rail_right_column_rect_aligned(strength_rect, reference_strength_rect, LEFT_TROOP_RAIL_ALIGNMENT_TOLERANCE_PX)
			var bar_rect := _left_troop_rail_control_rect(strength_track)
			if bar_rect.size.x > 0.0 and bar_rect.size.y > 0.0:
				if not has_reference_bar_rect:
					reference_bar_rect = bar_rect
					has_reference_bar_rect = true
				else:
					bar_column_aligned_ok = bar_column_aligned_ok and _left_troop_rail_column_rect_aligned(bar_rect, reference_bar_rect, LEFT_TROOP_RAIL_ALIGNMENT_TOLERANCE_PX, true)
		var portrait_icon_ok := button.disabled or (portrait_texture != null and portrait_texture.visible and portrait_texture.texture != null)
		var role_icon_hidden_ok := role_icon == null or not role_icon.visible
		var status_badge_ok := button.disabled or (status_icon != null and status_icon.visible and status_icon.texture != null)
		var type_icon_removed_ok := type_icon == null or not type_icon.visible
		var secondary_icon_ok := role_icon_hidden_ok and type_icon_removed_ok
		var team_name_hidden_ok := title_label == null or not title_label.visible or title_label.text.strip_edges() == ""
		var slot_role_hidden_ok := (
			(slot_label == null or not slot_label.visible or slot_label.text.strip_edges() == "")
			and (role_label == null or not role_label.visible or role_label.text.strip_edges() == "")
		)
		var status_label_text := status_label.text.strip_edges() if status_label != null else ""
		var status_label_copy_ok := status_label == null or status_label_text.find("待命") < 0
		no_standby_copy = no_standby_copy and status_label_text.find("待命") < 0
		var text_ok := (
			status_label_copy_ok
			and strength_value != null and strength_value.visible and strength_value.text.strip_edges() != ""
			and team_name_hidden_ok
			and slot_role_hidden_ok
		)
		var metric_ok := strength_track != null and strength_track.visible
		var morale_ok := (
			(morale_row == null or not morale_row.visible)
			and (morale_track == null or not morale_track.visible)
		)
		var shell_hidden := shell_texture == null or not shell_texture.visible
		var strength_tag_hidden := strength_tag == null or not strength_tag.visible or strength_tag.text.strip_edges() == ""
		var card_size_ok := not button_visible or (button_rect.size.x >= 200.0 and button_rect.size.y >= 78.0 and button_rect.size.y <= 98.0)
		var button_style_token := str(button.get_meta("left_troop_rail_style_token", ""))
		var card_skin_ok := bool(button.get_meta("left_troop_rail_card_skin_loaded", false))
		card_contract_ok = card_contract_ok and card_size_ok and button_style_token == LEFT_TROOP_RAIL_STYLE_TOKEN and card_skin_ok
		icon_contract_ok = icon_contract_ok and portrait_icon_ok
		secondary_icons_removed_ok = secondary_icons_removed_ok and secondary_icon_ok
		status_badge_contract_ok = status_badge_contract_ok and status_badge_ok
		text_contract_ok = text_contract_ok and text_ok
		metric_bars_ok = metric_bars_ok and metric_ok
		morale_hidden_ok = morale_hidden_ok and morale_ok
		slim_card_ok = slim_card_ok and card_size_ok
		old_shell_hidden_ok = old_shell_hidden_ok and shell_hidden
		troop_strength_tags_hidden_ok = troop_strength_tags_hidden_ok and strength_tag_hidden
		slots.append({
			"name": button.name,
			"index": index,
			"visible": button_visible,
			"disabled": button.disabled,
			"rect": _left_troop_rail_rect_to_dict(button_rect),
			"styleToken": button_style_token,
			"cardSkinUsageId": str(button.get_meta("left_troop_rail_card_skin_usage_id", "")),
			"cardSkinState": str(button.get_meta("left_troop_rail_card_skin_state", "")),
			"cardSkinSource": str(button.get_meta("left_troop_rail_card_skin_source", "")),
			"cardSkinLoaded": card_skin_ok,
			"roleIconId": str(button.get_meta("left_troop_rail_role_icon_id", "")),
			"typeIconId": str(button.get_meta("left_troop_rail_type_icon_id", "")),
			"statusIconId": str(button.get_meta("left_troop_rail_status_icon_id", "")),
			"portraitAssetKey": str(button.get_meta("left_troop_rail_portrait_asset_key", "")),
			"portraitIconOk": portrait_icon_ok,
			"secondaryIconsRemovedOk": secondary_icon_ok,
			"roleIconOk": role_icon_hidden_ok,
			"typeIconOk": type_icon_removed_ok,
			"statusBadgeOk": status_badge_ok,
			"textOk": text_ok,
			"teamNameHiddenOk": team_name_hidden_ok,
			"slotRoleHiddenOk": slot_role_hidden_ok,
			"metricOk": metric_ok,
			"moraleHiddenOk": morale_ok,
			"oldShellTextureHidden": shell_hidden,
			"slotLabel": slot_label.text if slot_label != null else "",
			"roleLabel": role_label.text if role_label != null else "",
			"statusLabel": status_label_text,
			"titleLabel": title_label.text if title_label != null else "",
			"strengthValue": strength_value.text if strength_value != null else "",
			"strengthTagHidden": strength_tag_hidden,
			"avatarRect": _left_troop_rail_rect_to_dict(_left_troop_rail_control_rect(portrait_panel)),
			"statusRect": _left_troop_rail_rect_to_dict(_left_troop_rail_control_rect(status_icon)),
			"strengthRect": _left_troop_rail_rect_to_dict(_left_troop_rail_control_rect(strength_value)),
			"barRect": _left_troop_rail_rect_to_dict(_left_troop_rail_control_rect(strength_track)),
			"troopId": str(button.get_meta("troop_id", "")),
			"tileId": str(button.get_meta("troop_tile_id", "")),
			"jumpActionId": str(button.get_meta("left_troop_rail_jump_action_id", "")),
			"jumpActionNodeName": str(button.get_meta("left_troop_rail_jump_action_node_name", "")),
			"jumpActionAvailable": slot_jump_available,
		})
	var panel_max_height := 540.0 if visible_slot_count >= 5 else 380.0
	var panel_paper_ok := panel_visible and style_token == LEFT_TROOP_RAIL_STYLE_TOKEN and panel_rect.size.x >= 206.0 and panel_rect.size.y >= 220.0 and panel_rect.size.y <= panel_max_height
	var transparent_backdrop_ok := backdrop_ok and _left_troop_rail_backdrop.modulate.a <= 0.84
	var quick_links_collapsed := _interior_quick_links == null or not _interior_quick_links.visible
	var no_bottom_nav_overlap := not overlaps_bottom_nav
	var compact_roster_contract_ok := icon_contract_ok and status_badge_contract_ok and text_contract_ok and metric_bars_ok and morale_hidden_ok and old_shell_hidden_ok and uniform_size_ok
	player_density_ok = task_body_hidden and city_state_title_hidden and city_state_summary_hidden and city_tech_summary_hidden and troop_section_title_hidden and troop_summary_hidden and troop_strength_tags_hidden_ok
	var no_visible_empty_slot_frame := no_phantom_empty_frame_ok
	var fixed_5_alignment_ok := (
		visible_slot_count == TROOP_SLOT_VISIBLE_COUNT
		and slot_grid_aligned_ok
		and avatar_column_aligned_ok
		and status_column_aligned_ok
		and strength_column_aligned_ok
		and bar_column_aligned_ok
		and jump_button_column_aligned_ok
		and no_visible_empty_slot_frame
		and has_reference_slot_rect
		and has_reference_avatar_rect
		and has_reference_status_rect
		and has_reference_strength_rect
		and has_reference_bar_rect
	)
	var component_ok := (
		panel_paper_ok
		and backdrop_ok
		and real_button_ok
		and visible_slot_count >= TROOP_SLOT_VISIBLE_COUNT
		and card_contract_ok
		and icon_contract_ok
		and secondary_icons_removed_ok
		and text_contract_ok
		and metric_bars_ok
		and morale_hidden_ok
		and slim_card_ok
		and transparent_backdrop_ok
		and old_shell_hidden_ok
		and uniform_size_ok
		and player_density_ok
		and quick_links_collapsed
		and no_bottom_nav_overlap
		and no_phantom_empty_frame_ok
		and no_standby_copy
		and fixed_5_alignment_ok
	)
	return {
		"ok": component_ok,
		"leftTroopRailComponentContractOk": component_ok,
		"leftTroopRailCompactRosterContractOk": compact_roster_contract_ok,
		"leftRailPlayerDensityContractId": LEFT_RAIL_PLAYER_DENSITY_CONTRACT,
		"leftRailTaskBodyHidden": task_body_hidden,
		"leftRailCityStateTitleHidden": city_state_title_hidden,
		"leftRailCityStateSummaryHidden": city_state_summary_hidden,
		"leftRailCityTechSummaryHidden": city_tech_summary_hidden,
		"leftRailTroopSectionTitleHidden": troop_section_title_hidden,
		"leftRailTroopSummaryHidden": troop_summary_hidden,
		"leftRailTroopStrengthTagsHidden": troop_strength_tags_hidden_ok,
		"leftRailPlayerDensityContractOk": player_density_ok,
		"leftTroopRailStyleToken": style_token,
		"leftTroopRailPanelPaperOk": panel_paper_ok,
		"leftTroopRailBackdropOk": backdrop_ok,
		"leftTroopRailBackdropTransparentOk": transparent_backdrop_ok,
		"leftTroopRailBackdropRect": _left_troop_rail_rect_to_dict(backdrop_rect),
		"leftTroopRailPanelVisible": panel_visible,
		"leftTroopRailPanelRect": _left_troop_rail_rect_to_dict(panel_rect),
		"leftTroopRailBottomNavRect": _left_troop_rail_rect_to_dict(bottom_nav_rect),
		"leftTroopRailNoBottomNavOverlap": no_bottom_nav_overlap,
		"leftTroopRailButtonRealOk": real_button_ok,
		"leftTroopRailCardContractOk": card_contract_ok,
		"leftTroopRailCardSkinContractOk": card_contract_ok,
		"leftTroopRailCardSkinUsageId": LEFT_TROOP_RAIL_CARD_SKIN_USAGE_ID,
		"leftTroopRailUniformCardSizeOk": uniform_size_ok,
		"leftTroopRailSlotIconContractOk": icon_contract_ok,
		"leftTroopRailPortraitIconContractOk": icon_contract_ok,
		"leftTroopRailTypeIconContractOk": secondary_icons_removed_ok,
		"leftTroopRailSecondaryIconsRemovedOk": secondary_icons_removed_ok,
		"leftTroopRailStatusBadgeOk": status_badge_contract_ok,
		"leftTroopRailTextContractOk": text_contract_ok,
		"leftTroopRailMetricBarsOk": metric_bars_ok,
		"leftTroopRailNoMoraleOk": morale_hidden_ok,
		"leftTroopRailSlimRowsOk": slim_card_ok,
		"leftTroopRailOldShellTextureHiddenOk": old_shell_hidden_ok,
		"leftTroopRailQuickLinksCollapsed": quick_links_collapsed,
		"leftTroopRailVisibleSlotCount": visible_slot_count,
		"leftTroopRailVisibleCountMode": "fixed_5",
		"leftTroopRailTargetVisibleSlotCount": TROOP_SLOT_VISIBLE_COUNT,
		"leftTroopRailNoPhantomEmptyFrameOk": no_phantom_empty_frame_ok,
		"leftTroopRailNoStandbyCopy": no_standby_copy,
		"leftTroopRailFixed5AlignmentToken": LEFT_TROOP_RAIL_FIXED_5_ALIGNMENT_TOKEN,
		"leftTroopRailFixed5AlignmentOk": fixed_5_alignment_ok,
		"leftTroopRailSlotGridAlignedOk": slot_grid_aligned_ok,
		"leftTroopRailAvatarColumnAlignedOk": avatar_column_aligned_ok,
		"leftTroopRailStatusColumnAlignedOk": status_column_aligned_ok,
		"leftTroopRailStrengthColumnAlignedOk": strength_column_aligned_ok,
		"leftTroopRailBarColumnAlignedOk": bar_column_aligned_ok,
		"leftTroopRailJumpButtonColumnAlignedOk": jump_button_column_aligned_ok,
		"leftTroopRailNoVisibleEmptySlotFrame": no_visible_empty_slot_frame,
		"leftTroopRailSlotRowHeightPx": reference_slot_rect.size.y if has_reference_slot_rect else 0.0,
		"leftTroopRailJumpActionId": "world_left_troop_rail_jump_to_unit_fixture",
		"leftTroopRailJumpActionNodeName": jump_action_node_name,
		"leftTroopRailJumpActionAvailable": jump_action_available,
		"leftTroopRailSlots": slots,
	}

func get_world_shell_visual_unification_summary() -> Dictionary:
	var left_summary := get_left_troop_rail_visual_summary()
	var viewport_size := get_viewport_rect().size
	var bottom_nav_rect := _bottom_nav_panel.get_global_rect() if _bottom_nav_panel != null else Rect2()
	var bottom_nav_chrome_token := str(_bottom_nav_panel.get_meta("shell_command_chrome_token", "")) if _bottom_nav_panel != null else ""
	var shell_command_chrome_button_count := 0
	var shell_command_chrome_buttons_ok := true
	for button_variant in [_generals_button, _skill_library_button, _interior_button, _alliance_button, _ai_hub_button, _chat_button, _settings_button, _war_button, _ai_switch_button, _recruit_button]:
		var command_button := button_variant as Button
		if command_button == null or not command_button.visible:
			continue
		var command_button_token := str(command_button.get_meta("shell_command_chrome_token", "")).strip_edges()
		if command_button_token == SHELL_COMMAND_CHROME_TOKEN:
			shell_command_chrome_button_count += 1
		else:
			shell_command_chrome_buttons_ok = false
	var top_style := _top_strip.get_theme_stylebox("panel") as StyleBoxFlat if _top_strip != null else null
	var jade_style := _jade_currency_badge.get_theme_stylebox("normal") as StyleBoxFlat if _jade_currency_badge != null else null
	var copper_style := _copper_currency_badge.get_theme_stylebox("normal") as StyleBoxFlat if _copper_currency_badge != null else null
	var top_bg := top_style.bg_color if top_style != null else Color.BLACK
	var jade_bg := jade_style.bg_color if jade_style != null else Color.BLACK
	var copper_bg := copper_style.bg_color if copper_style != null else Color.BLACK
	var top_strip_light_ok := top_style != null and top_bg.r >= 0.72 and top_bg.g >= 0.66 and top_bg.b >= 0.50 and top_bg.a <= 0.94
	var resource_chip_count := 0
	var resource_chip_icons_ok := true
	var resource_chip_values_ok := true
	for resource_id in TOP_RESOURCE_IDS:
		var chip_refs: Dictionary = _top_resource_chip_nodes.get(resource_id, {}) as Dictionary
		if chip_refs.is_empty():
			resource_chip_icons_ok = false
			resource_chip_values_ok = false
			continue
		resource_chip_count += 1
		var icon := chip_refs.get("icon") as TextureRect
		var value_label := chip_refs.get("value_label") as Label
		resource_chip_icons_ok = resource_chip_icons_ok and icon != null and icon.texture != null
		resource_chip_values_ok = resource_chip_values_ok and value_label != null and value_label.text.strip_edges() != ""
	var top_identity_text := _profile_badge.text.strip_edges() if _profile_badge != null else ""
	var top_identity_text_ok := top_identity_text != "" and top_identity_text not in ["主城", "主公"]
	var top_identity_resource_ok := (
		_profile_badge != null
		and _top_identity_panel != null
		and _top_identity_panel.visible
		and _profile_badge.visible
		and top_identity_text_ok
		and _top_player_avatar_texture != null
		and _top_player_avatar_texture.visible
		and _top_player_avatar_texture.texture != null
		and _top_resource_icon_row != null
		and _top_resource_icon_row.visible
		and resource_chip_count == TOP_RESOURCE_IDS.size()
		and resource_chip_icons_ok
		and resource_chip_values_ok
		and (_resource_strip == null or not _resource_strip.visible)
		and _premium_currency_row != null
		and _premium_currency_row.visible
		and _mode_toggle_button != null
		and _mode_toggle_button.visible
	)
	var currency_light_ok := (
		jade_style != null
		and copper_style != null
		and jade_bg.r >= 0.72
		and copper_bg.r >= 0.72
	)
	var bottom_nav_bottom_gap := viewport_size.y - (bottom_nav_rect.position.y + bottom_nav_rect.size.y)
	var bottom_nav_tight_ok := (
		_bottom_nav_panel != null
		and _bottom_nav_panel.visible
		and bottom_nav_rect.size.y <= 252.0
		and bottom_nav_rect.position.y >= viewport_size.y - 260.0
		and bottom_nav_bottom_gap >= 0.0
		and bottom_nav_bottom_gap <= 18.0
	)
	var shell_command_chrome_ok := (
		bottom_nav_chrome_token == SHELL_COMMAND_CHROME_TOKEN
		and shell_command_chrome_buttons_ok
		and shell_command_chrome_button_count >= 9
	)
	var contract_ok := (
		bool(left_summary.get("leftTroopRailComponentContractOk", false))
		and bool(left_summary.get("leftTroopRailCompactRosterContractOk", false))
		and top_strip_light_ok
		and top_identity_resource_ok
		and currency_light_ok
		and bottom_nav_tight_ok
		and shell_command_chrome_ok
	)
	return {
		"ok": contract_ok,
		"worldShellVisualUnifiedContractOk": contract_ok,
		"shellCommandChromeToken": SHELL_COMMAND_CHROME_TOKEN,
		"shellBottomNavChromeToken": bottom_nav_chrome_token,
		"shellCommandChromeButtonCount": shell_command_chrome_button_count,
		"shellCommandChromeOk": shell_command_chrome_ok,
		"topStripLightPaperOk": top_strip_light_ok,
		"topIdentityResourceContractOk": top_identity_resource_ok,
		"topIdentityText": top_identity_text,
		"topIdentityTextOk": top_identity_text_ok,
		"topResourceChipCount": resource_chip_count,
		"topResourceExpectedChipCount": TOP_RESOURCE_IDS.size(),
		"topResourceChipIconsOk": resource_chip_icons_ok,
		"topResourceChipValuesOk": resource_chip_values_ok,
		"topResourceStripHiddenOk": _resource_strip == null or not _resource_strip.visible,
		"leftTroopRailCompactRosterContractOk": bool(left_summary.get("leftTroopRailCompactRosterContractOk", false)),
		"currencyBadgesLightPaperOk": currency_light_ok,
		"bottomNavTightToBottomOk": bottom_nav_tight_ok,
		"bottomNavRect": _left_troop_rail_rect_to_dict(bottom_nav_rect),
		"topStripBg": _color_to_summary(top_bg),
		"jadeBadgeBg": _color_to_summary(jade_bg),
		"copperBadgeBg": _color_to_summary(copper_bg),
		"leftTroopRail": left_summary,
	}

func _left_troop_rail_rect_to_dict(rect: Rect2) -> Dictionary:
	return {
		"x": rect.position.x,
		"y": rect.position.y,
		"w": rect.size.x,
		"h": rect.size.y,
	}

func _left_troop_rail_control_rect(control: Control) -> Rect2:
	if control == null or not control.visible or not control.is_visible_in_tree():
		return Rect2()
	return control.get_global_rect()

func _left_troop_rail_column_rect_aligned(current: Rect2, reference: Rect2, tolerance_px: float, include_height: bool = false) -> bool:
	if current.size.x <= 0.0 or current.size.y <= 0.0 or reference.size.x <= 0.0 or reference.size.y <= 0.0:
		return false
	var aligned := absf(current.position.x - reference.position.x) <= tolerance_px and absf(current.size.x - reference.size.x) <= tolerance_px
	if include_height:
		aligned = aligned and absf(current.size.y - reference.size.y) <= tolerance_px
	return aligned

func _left_troop_rail_right_column_rect_aligned(current: Rect2, reference: Rect2, tolerance_px: float) -> bool:
	if current.size.x <= 0.0 or current.size.y <= 0.0 or reference.size.x <= 0.0 or reference.size.y <= 0.0:
		return false
	var current_right := current.position.x + current.size.x
	var reference_right := reference.position.x + reference.size.x
	return absf(current_right - reference_right) <= tolerance_px and absf(current.size.y - reference.size.y) <= tolerance_px

func _color_to_summary(color: Color) -> Dictionary:
	return {
		"r": snapped(color.r, 0.001),
		"g": snapped(color.g, 0.001),
		"b": snapped(color.b, 0.001),
		"a": snapped(color.a, 0.001),
	}

func _left_troop_rail_rects_overlap(left: Rect2, right: Rect2) -> bool:
	if left.size.x <= 0.0 or left.size.y <= 0.0 or right.size.x <= 0.0 or right.size.y <= 0.0:
		return false
	return left.position.x < right.position.x + right.size.x and left.position.x + left.size.x > right.position.x and left.position.y < right.position.y + right.size.y and left.position.y + left.size.y > right.position.y

func set_city_action_focus(action_id: String) -> void:
	var action_copy := _resolve_city_action_copy(action_id)
	if action_copy.is_empty():
		return
	_current_city_action = action_id
	var label: String = str(action_copy.get("label", "入口"))
	var description: String = str(action_copy.get("description", "等待入口说明加载。"))
	_entry_status.text = _compact_single_line_text(_format_copy_template("current_entry_status_template", {"label": label}, "当前：{label}"), 12)
	_entry_status.tooltip_text = _format_copy_template(
		"current_entry_tooltip_template",
		{
			"label": label,
			"description": description,
		},
		"当前入口：{label} | {description}"
	)
	_refresh_city_shell_density()
	_refresh_city_action_button_states()
	_refresh_utility_row_density()
	_apply_main_nav_layout_state()
	_refresh_interior_summary_buttons()
	_refresh_right_context_visibility()

func _on_mode_toggle_pressed() -> void:
	mode_toggle_requested.emit(WORLD_MODE)

func _bind_action_button(button: Button, action_id: String) -> void:
	if button == null:
		return
	var callback := func() -> void:
		_on_action_button_pressed(action_id)
	if not button.pressed.is_connected(callback):
		button.pressed.connect(callback)

func _register_city_action_button(button: Button, action_id: String, surface_role: String) -> void:
	if button == null:
		return
	button.set_meta("city_action_id", action_id)
	button.set_meta("city_action_surface_role", surface_role)
	_bind_action_button(button, action_id)
	var button_group: Dictionary = _city_action_button_groups.get(action_id, {}) as Dictionary
	button_group[surface_role] = button
	_city_action_button_groups[action_id] = button_group

func _bind_troop_slot_button(button: Button, slot_index: int) -> void:
	if button == null:
		return
	var callback := func() -> void:
		_on_troop_slot_pressed(slot_index)
	if not button.pressed.is_connected(callback):
		button.pressed.connect(callback)

func _ensure_troop_slot_view(button: Button) -> Dictionary:
	if button == null:
		return {}
	if button.has_meta("troop_slot_view"):
		var cached_variant: Variant = button.get_meta("troop_slot_view", {})
		if cached_variant is Dictionary:
			return cached_variant as Dictionary
	var shell_texture := TextureRect.new()
	shell_texture.name = "ShellTexture"
	shell_texture.mouse_filter = Control.MOUSE_FILTER_IGNORE
	shell_texture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	shell_texture.stretch_mode = TextureRect.STRETCH_SCALE
	button.add_child(shell_texture)
	_pin_control_to_full_rect(shell_texture)

	var paper_surface := ColorRect.new()
	paper_surface.name = "PaperSurface"
	paper_surface.mouse_filter = Control.MOUSE_FILTER_IGNORE
	paper_surface.color = Color(0.98, 0.95, 0.86, 0.98)
	button.add_child(paper_surface)
	_pin_control_to_full_rect(paper_surface)

	var root := MarginContainer.new()
	root.name = "ShellMargin"
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_theme_constant_override("margin_left", 8)
	root.add_theme_constant_override("margin_top", 6)
	root.add_theme_constant_override("margin_right", 8)
	root.add_theme_constant_override("margin_bottom", 6)
	button.add_child(root)
	_pin_control_to_full_rect(root)

	var left_inlay := ColorRect.new()
	left_inlay.name = "LeftInlay"
	left_inlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	left_inlay.set_anchors_and_offsets_preset(Control.PRESET_LEFT_WIDE)
	left_inlay.custom_minimum_size = Vector2(2, 0)
	left_inlay.offset_left = 0
	left_inlay.offset_top = 0
	left_inlay.offset_right = 2
	left_inlay.offset_bottom = 0
	root.add_child(left_inlay)

	var top_line := ColorRect.new()
	top_line.name = "TopLine"
	top_line.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top_line.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	top_line.custom_minimum_size = Vector2(0, 1)
	top_line.offset_left = 10
	top_line.offset_right = -8
	top_line.offset_top = 0
	top_line.offset_bottom = 1
	root.add_child(top_line)

	var bottom_line := ColorRect.new()
	bottom_line.name = "BottomLine"
	bottom_line.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bottom_line.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	bottom_line.custom_minimum_size = Vector2(0, 1)
	bottom_line.offset_left = 12
	bottom_line.offset_right = -10
	bottom_line.offset_top = -1
	bottom_line.offset_bottom = 0
	root.add_child(bottom_line)

	var card_row := HBoxContainer.new()
	card_row.name = "CardRow"
	card_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card_row.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	card_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card_row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	card_row.add_theme_constant_override("separation", 9)
	root.add_child(card_row)

	var portrait_panel := PanelContainer.new()
	portrait_panel.name = "PortraitPanel"
	portrait_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	portrait_panel.custom_minimum_size = Vector2(56, 0)
	portrait_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	portrait_panel.clip_contents = true
	card_row.add_child(portrait_panel)

	var portrait_stack := Control.new()
	portrait_stack.name = "PortraitStack"
	portrait_stack.mouse_filter = Control.MOUSE_FILTER_IGNORE
	portrait_stack.custom_minimum_size = Vector2(56, 56)
	portrait_stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	portrait_stack.size_flags_vertical = Control.SIZE_EXPAND_FILL
	portrait_stack.clip_contents = true
	portrait_panel.add_child(portrait_stack)

	var portrait_texture := TextureRect.new()
	portrait_texture.name = "PortraitTexture"
	portrait_texture.mouse_filter = Control.MOUSE_FILTER_IGNORE
	portrait_texture.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	portrait_texture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait_texture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	portrait_stack.add_child(portrait_texture)

	var role_icon := TextureRect.new()
	role_icon.name = "RoleIcon"
	role_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	role_icon.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	role_icon.custom_minimum_size = LEFT_TROOP_RAIL_ROLE_ICON_SIZE
	role_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	role_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	portrait_stack.add_child(role_icon)

	var portrait_label := Label.new()
	portrait_label.name = "PortraitLabel"
	portrait_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	portrait_label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	portrait_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	portrait_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	portrait_stack.add_child(portrait_label)

	var status_icon := TextureRect.new()
	status_icon.name = "StatusIcon"
	status_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	status_icon.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	status_icon.offset_left = -23.0
	status_icon.offset_top = -23.0
	status_icon.offset_right = -1.0
	status_icon.offset_bottom = -1.0
	status_icon.custom_minimum_size = LEFT_TROOP_RAIL_STATUS_BADGE_SIZE
	status_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	status_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	portrait_stack.add_child(status_icon)

	var info_column := VBoxContainer.new()
	info_column.name = "InfoColumn"
	info_column.mouse_filter = Control.MOUSE_FILTER_IGNORE
	info_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info_column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	info_column.add_theme_constant_override("separation", 3)
	card_row.add_child(info_column)

	var headline_row := HBoxContainer.new()
	headline_row.name = "HeadlineRow"
	headline_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	headline_row.add_theme_constant_override("separation", 4)
	info_column.add_child(headline_row)

	var slot_label := Label.new()
	slot_label.name = "SlotLabel"
	slot_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	headline_row.add_child(slot_label)

	var role_label := Label.new()
	role_label.name = "RoleLabel"
	role_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	headline_row.add_child(role_label)

	var headline_spacer := Control.new()
	headline_spacer.name = "HeadlineSpacer"
	headline_spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	headline_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	headline_row.add_child(headline_spacer)

	var status_label := Label.new()
	status_label.name = "StatusLabel"
	status_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	headline_row.add_child(status_label)

	var title_row := HBoxContainer.new()
	title_row.name = "TitleRow"
	title_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	title_row.add_theme_constant_override("separation", 4)
	info_column.add_child(title_row)

	var type_icon := TextureRect.new()
	type_icon.name = "TypeIcon"
	type_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	type_icon.custom_minimum_size = LEFT_TROOP_RAIL_TYPE_ICON_SIZE
	type_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	type_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	title_row.add_child(type_icon)

	var title_label := Label.new()
	title_label.name = "TitleLabel"
	title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	title_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.add_child(title_label)

	var strength_row := HBoxContainer.new()
	strength_row.name = "StrengthRow"
	strength_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	strength_row.add_theme_constant_override("separation", 4)
	info_column.add_child(strength_row)

	var strength_tag := Label.new()
	strength_tag.name = "StrengthTag"
	strength_tag.mouse_filter = Control.MOUSE_FILTER_IGNORE
	strength_tag.text = "兵力"
	strength_row.add_child(strength_tag)

	var strength_track := PanelContainer.new()
	strength_track.name = "StrengthTrack"
	strength_track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	strength_track.custom_minimum_size = Vector2(TROOP_STRENGTH_TRACK_WIDTH, 9)
	strength_track.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	strength_row.add_child(strength_track)

	var strength_fill := ColorRect.new()
	strength_fill.name = "StrengthFill"
	strength_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	strength_fill.set_anchors_and_offsets_preset(Control.PRESET_LEFT_WIDE)
	strength_fill.custom_minimum_size = Vector2(0, 0)
	strength_fill.offset_left = 0
	strength_fill.offset_top = 0
	strength_fill.offset_bottom = 0
	strength_track.add_child(strength_fill)

	var strength_value := Label.new()
	strength_value.name = "StrengthValue"
	strength_value.mouse_filter = Control.MOUSE_FILTER_IGNORE
	strength_value.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	strength_value.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	strength_row.add_child(strength_value)

	var morale_row := HBoxContainer.new()
	morale_row.name = "MoraleRow"
	morale_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	morale_row.visible = false
	morale_row.add_theme_constant_override("separation", 4)
	info_column.add_child(morale_row)

	var morale_tag := Label.new()
	morale_tag.name = "MoraleTag"
	morale_tag.mouse_filter = Control.MOUSE_FILTER_IGNORE
	morale_tag.text = "士气"
	morale_row.add_child(morale_tag)

	var morale_track := PanelContainer.new()
	morale_track.name = "MoraleTrack"
	morale_track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	morale_track.custom_minimum_size = Vector2(TROOP_MORALE_TRACK_WIDTH, 4)
	morale_track.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	morale_row.add_child(morale_track)

	var morale_fill := ColorRect.new()
	morale_fill.name = "MoraleFill"
	morale_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	morale_fill.set_anchors_and_offsets_preset(Control.PRESET_LEFT_WIDE)
	morale_fill.custom_minimum_size = Vector2(0, 0)
	morale_fill.offset_left = 0
	morale_fill.offset_top = 0
	morale_fill.offset_bottom = 0
	morale_track.add_child(morale_fill)

	var morale_value := Label.new()
	morale_value.name = "MoraleValue"
	morale_value.mouse_filter = Control.MOUSE_FILTER_IGNORE
	morale_value.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	morale_value.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	morale_row.add_child(morale_value)

	var refs := {
		"shell_texture": shell_texture,
		"paper_surface": paper_surface,
		"root": root,
		"left_inlay": left_inlay,
		"top_line": top_line,
		"bottom_line": bottom_line,
		"portrait_panel": portrait_panel,
		"portrait_stack": portrait_stack,
		"portrait_texture": portrait_texture,
		"role_icon": role_icon,
		"portrait_label": portrait_label,
		"slot_label": slot_label,
		"role_label": role_label,
		"status_icon": status_icon,
		"status_label": status_label,
		"type_icon": type_icon,
		"title_label": title_label,
		"strength_tag": strength_tag,
		"strength_track": strength_track,
		"strength_fill": strength_fill,
		"strength_value": strength_value,
		"morale_row": morale_row,
		"morale_tag": morale_tag,
		"morale_track": morale_track,
		"morale_fill": morale_fill,
		"morale_value": morale_value,
	}
	button.set_meta("troop_slot_view", refs)
	return refs

func _pin_control_to_full_rect(control: Control) -> void:
	if control == null:
		return
	control.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	control.offset_left = 0.0
	control.offset_top = 0.0
	control.offset_right = 0.0
	control.offset_bottom = 0.0

func _create_troop_slot_stylebox(bg_color: Color, border_color: Color, radius: int = 1, border_width: int = 1) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg_color
	style.border_color = border_color
	style.set_corner_radius_all(radius)
	style.set_border_width_all(border_width)
	return style

func _format_grouped_int(value: int) -> String:
	var normalized := maxi(value, 0)
	var raw := str(normalized)
	if raw.length() <= 3:
		return raw
	var segments: Array[String] = []
	var cursor := raw.length()
	while cursor > 3:
		segments.push_front(raw.substr(cursor - 3, 3))
		cursor -= 3
	segments.push_front(raw.substr(0, cursor))
	return ",".join(segments)

func _resolve_troop_slot_hero_name(payload: Dictionary, fallback_subtitle: String) -> String:
	var hero_name := str(payload.get("heroName", "")).strip_edges()
	if hero_name != "":
		return hero_name
	var subtitle := fallback_subtitle.strip_edges()
	if subtitle.contains("|"):
		var parts := subtitle.split("|")
		if not parts.is_empty():
			return str(parts[0]).strip_edges()
	return subtitle

func _resolve_troop_slot_status_label(payload: Dictionary, status_text: String, subtitle: String, is_enabled: bool) -> String:
	if not is_enabled:
		return "空位"
	var explicit_label := str(payload.get("statusLabel", "")).strip_edges()
	if explicit_label != "":
		if explicit_label == "待命":
			return ""
		return _truncate_text(explicit_label, 4)
	var normalized := status_text.strip_edges()
	if normalized == "":
		normalized = subtitle.strip_edges()
	if normalized.contains("|"):
		var segments := normalized.split("|")
		if not segments.is_empty():
			normalized = str(segments[0]).strip_edges()
	if normalized == "待命":
		return ""
	return _truncate_text(normalized, 4)

func _resolve_troop_slot_portrait_text(hero_name: String, slot_label: String, is_enabled: bool) -> String:
	if not is_enabled:
		return "空"
	var source := hero_name.strip_edges()
	if source == "":
		source = slot_label.strip_edges()
	if source == "":
		return "队"
	return source.substr(0, 1)

func _resolve_troop_ratio(value: int, max_value: int) -> float:
	if max_value <= 0:
		return 0.0
	return clamp(float(value) / float(max_value), 0.0, 1.0)

func _resolve_troop_slot_view(button: Button) -> Dictionary:
	if button == null:
		return {}
	var cached_variant: Variant = button.get_meta("troop_slot_view", {})
	return cached_variant as Dictionary if cached_variant is Dictionary else {}

func _refresh_troop_slot_scroll_container(layout_profile: Dictionary = {}) -> void:
	if _troop_slot_scroll == null:
		return
	_troop_slot_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_troop_slot_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	var viewport_height := int(layout_profile.get("troop_slot_scroll_min_height", 0))
	viewport_height = maxi(viewport_height, _compute_troop_slot_scroll_height())
	_troop_slot_scroll.custom_minimum_size = Vector2(0, viewport_height)
	var scroll_bar := _troop_slot_scroll.get_v_scroll_bar()
	if scroll_bar != null:
		scroll_bar.modulate = Color(1.0, 1.0, 1.0, 0.0)
		scroll_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
		scroll_bar.custom_minimum_size = Vector2.ZERO

func _compute_troop_slot_scroll_height() -> int:
	var visible_count := mini(TROOP_SLOT_VISIBLE_COUNT, _troop_slot_buttons.size())
	if visible_count <= 0:
		return 0
	var gap := 1
	if _troop_slot_list != null:
		gap = _troop_slot_list.get_theme_constant("separation")
	var total_height := 0
	for index in range(visible_count):
		var button := _troop_slot_buttons[index] as Button
		if button == null:
			continue
		var height := int(button.custom_minimum_size.y)
		if height <= 0:
			height = int(button.get_combined_minimum_size().y)
		if height <= 0:
			height = 40
		total_height += height
		if index > 0:
			total_height += gap
	return total_height

func _bind_interior_summary_button(button: Button, tab_id: String) -> void:
	if button == null:
		return
	var callback := func() -> void:
		_on_interior_summary_button_pressed(tab_id)
	if not button.pressed.is_connected(callback):
		button.pressed.connect(callback)

func _on_action_button_pressed(action_id: String) -> void:
	if action_id == "world":
		var world_copy := _resolve_under_construction_button_copy("world")
		var world_label := str(world_copy.get("label", COPY_MAIN_WORLD_TITLE)).strip_edges()
		var world_description := str(world_copy.get("description", "进入主世界玩法地图。")).strip_edges()
		if _entry_status != null:
			_entry_status.text = _compact_single_line_text(_format_copy_template("world_entry_selected_status_template", {"label": world_label}, "已选：{label}"), 14)
			_entry_status.tooltip_text = _format_copy_template(
				"world_entry_selected_tooltip_template",
				{
					"label": world_label,
					"description": world_description,
				},
				"已选入口：{label}（开发中） | {description}"
			)
		shell_action_requested.emit(action_id)
		return
	if action_id == "chat":
		shell_action_requested.emit(action_id)
		return
	if action_id == "ai_switch_home_city":
		shell_action_requested.emit(action_id)
		return
	set_city_action_focus(action_id)
	shell_action_requested.emit(action_id)


func _on_main_nav_menu_button_pressed() -> void:
	_set_main_nav_collapsed(not _is_main_nav_collapsed, true)


func _set_main_nav_collapsed(is_collapsed: bool, should_apply_layout: bool = true) -> void:
	_is_main_nav_collapsed = is_collapsed
	if should_apply_layout:
		_apply_main_nav_layout_state()


func _apply_main_nav_layout_state() -> void:
	if _main_nav_menu_button == null:
		return
	_ensure_bottom_utility_row_layout()
	_ensure_main_nav_recruit_spacer()
	_ensure_ai_switch_recruit_nav_button()
	_apply_main_nav_button_order()
	_main_nav_menu_button.visible = true
	if _nav_buttons != null:
		_nav_buttons.visible = not _is_main_nav_collapsed
	if _is_main_nav_collapsed:
		_refresh_utility_row_density()
		if _world_entry_hint != null:
			_world_entry_hint.visible = false
		_main_nav_menu_button.text = "▶"
		_main_nav_menu_button.tooltip_text = _resolve_shell_copy_value("main_nav_expand_button_label", "展开主导航")
		_main_nav_menu_button.custom_minimum_size = DESKTOP_MAIN_NAV_MENU_BUTTON_MIN_SIZE
		_main_nav_menu_button.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
		_main_nav_menu_button.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	else:
		_main_nav_menu_button.text = "▶"
		_main_nav_menu_button.tooltip_text = _resolve_shell_copy_value("main_nav_collapse_button_label", "收起主导航")
		_main_nav_menu_button.custom_minimum_size = DESKTOP_MAIN_NAV_MENU_BUTTON_MIN_SIZE
		_main_nav_menu_button.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
		_main_nav_menu_button.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		_refresh_utility_row_density()
		if _world_entry_hint != null:
			_world_entry_hint.visible = false
	_main_nav_menu_button.alignment = HORIZONTAL_ALIGNMENT_CENTER
	_main_nav_menu_button.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_apply_button_chrome_profile(_main_nav_menu_button, _resolve_city_action_chrome_profile(false, CITY_ACTION_SURFACE_MAIN_NAV))
	_main_nav_menu_button.add_theme_font_size_override("font_size", DESKTOP_MAIN_NAV_BUTTON_FONT_SIZE)
	_main_nav_menu_button.flat = false
	_apply_mainline_support_button_paper_style_poc()


func _ensure_bottom_utility_row_layout() -> void:
	if _utility_row == null or _main_nav_menu_button == null:
		return
	var nav_control_row := _main_nav_menu_button.get_parent() as HBoxContainer
	if nav_control_row == null:
		return
	var main_nav := nav_control_row.get_parent() as VBoxContainer
	if main_nav == null:
		return
	nav_control_row.add_theme_constant_override("separation", 2)
	_utility_row.add_theme_constant_override("separation", 6)
	if _utility_row.get_parent() != main_nav:
		var old_parent := _utility_row.get_parent()
		if old_parent != null:
			old_parent.remove_child(_utility_row)
		main_nav.add_child(_utility_row)
	var utility_index := _utility_row.get_index()
	var nav_index := nav_control_row.get_index()
	var target_index := nav_index
	if utility_index < nav_index:
		target_index = max(0, nav_index - 1)
	if utility_index != target_index:
		main_nav.move_child(_utility_row, target_index)
	_ensure_utility_row_lead_spacer(nav_control_row)
	_utility_row.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	_utility_row.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	for button_variant in [_mail_button, _activity_button, _help_button]:
		var utility_button := button_variant as Button
		if utility_button == null:
			continue
		utility_button.custom_minimum_size = DESKTOP_MAIN_NAV_BUTTON_SIZE
		utility_button.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
		utility_button.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	if _world_entry_hint != null:
		_world_entry_hint.visible = false


func _ensure_utility_row_lead_spacer(nav_control_row: HBoxContainer) -> void:
	if _utility_row == null:
		return
	var lead_spacer := _utility_row.get_node_or_null("UtilityRowLeadSpacer") as Control
	if lead_spacer == null:
		lead_spacer = Control.new()
		lead_spacer.name = "UtilityRowLeadSpacer"
		lead_spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_utility_row.add_child(lead_spacer)
	_utility_row.move_child(lead_spacer, 0)
	var nav_separation := float(nav_control_row.get_theme_constant("separation"))
	var utility_separation := float(_utility_row.get_theme_constant("separation"))
	var spacer_width := maxf(0.0, DESKTOP_MAIN_NAV_MENU_BUTTON_MIN_SIZE.x + nav_separation - utility_separation)
	lead_spacer.custom_minimum_size = Vector2(spacer_width, 0.0)
	lead_spacer.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	lead_spacer.size_flags_vertical = Control.SIZE_FILL


func _ensure_main_nav_recruit_spacer() -> void:
	if _nav_buttons == null:
		return
	if _main_nav_recruit_spacer != null and is_instance_valid(_main_nav_recruit_spacer):
		return
	var existing_spacer := _nav_buttons.get_node_or_null("RecruitSpacer") as Control
	if existing_spacer == null:
		existing_spacer = Control.new()
		existing_spacer.name = "RecruitSpacer"
		existing_spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_nav_buttons.add_child(existing_spacer)
	_main_nav_recruit_spacer = existing_spacer
	_main_nav_recruit_spacer.custom_minimum_size = Vector2(24.0, 0.0)
	_main_nav_recruit_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_main_nav_recruit_spacer.size_flags_vertical = Control.SIZE_FILL


func _apply_main_nav_button_order() -> void:
	if _nav_buttons == null:
		return
	var ordered_nodes: Array = [
		_generals_button,
		_skill_library_button,
		_interior_button,
		_alliance_button,
		_ai_hub_button,
		_chat_button,
		_settings_button,
		_war_button,
		_main_nav_recruit_spacer,
		_ai_switch_button,
		_recruit_button,
		_bag_button,
	]
	var target_index := 0
	for node_variant in ordered_nodes:
		var node := node_variant as Node
		if node == null or node.get_parent() != _nav_buttons:
			continue
		_nav_buttons.move_child(node, target_index)
		target_index += 1

func _on_troop_slot_pressed(slot_index: int) -> void:
	if slot_index < 0 or slot_index >= _troop_slot_buttons.size():
		return
	var button := _troop_slot_buttons[slot_index] as Button
	if button == null:
		return
	var troop_id := str(button.get_meta("troop_id", "")).strip_edges()
	if troop_id == "":
		return
	troop_slot_requested.emit(troop_id)

func _on_interior_summary_button_pressed(tab_id: String) -> void:
	set_city_action_focus(DEFAULT_CITY_ACTION)
	interior_tab_requested.emit(tab_id)

func _refresh_interior_summary_buttons() -> void:
	var is_city_mode := _current_mode == CITY_MODE
	var show_interior_quick_links := is_city_mode and _current_city_action == DEFAULT_CITY_ACTION
	if _interior_quick_links != null:
		_interior_quick_links.visible = show_interior_quick_links
	for tab_id_variant in _interior_summary_buttons.keys():
		var tab_id := str(tab_id_variant)
		var button := _interior_summary_buttons[tab_id_variant] as Button
		if button == null:
			continue
		button.visible = show_interior_quick_links
		button.disabled = not show_interior_quick_links
		button.text = _resolve_interior_tab_label(tab_id)
		button.tooltip_text = _format_copy_template("interior_quick_link_tooltip_template", {"label": button.text}, "直达内政/{label}")

func _refresh_city_shell_density() -> void:
	var is_city_mode := _current_mode == CITY_MODE
	var is_interior_focus := _current_city_action == DEFAULT_CITY_ACTION
	var show_city_detail := is_city_mode and is_interior_focus
	var has_non_default_focus := is_city_mode and not is_interior_focus
	_city_focus.visible = has_non_default_focus
	_city_state_title.visible = false
	_city_state_summary.visible = false
	_city_tech_summary.visible = false
	_entry_status.visible = has_non_default_focus
	_world_entry_hint.visible = false
	_refresh_center_stage_chrome()

func _refresh_city_action_button_states() -> void:
	for action_id_variant in _city_action_button_groups.keys():
		var action_id := str(action_id_variant)
		var is_selected := _current_mode == CITY_MODE and _current_city_action == action_id
		var button_group: Dictionary = _city_action_button_groups.get(action_id_variant, {}) as Dictionary
		for surface_role_variant in button_group.keys():
			var surface_role := str(surface_role_variant)
			var button := button_group[surface_role_variant] as Button
			if button == null:
				continue
			_apply_city_action_button_state(button, is_selected, surface_role)
	_apply_mainline_command_button_skin_poc()

func _refresh_utility_row_density() -> void:
	if _utility_row == null:
		return
	var show_utility_row := not _is_main_nav_collapsed
	_mail_button.visible = show_utility_row
	_activity_button.visible = show_utility_row
	_help_button.visible = show_utility_row
	_utility_row.visible = show_utility_row

func _ensure_ai_switch_recruit_nav_button() -> void:
	if _nav_buttons == null:
		return
	if _ai_switch_button != null and is_instance_valid(_ai_switch_button):
		return
	var stale_left_button: Button = null
	if _left_column != null:
		stale_left_button = _left_column.get_node_or_null("AiSwitchButton") as Button
	if stale_left_button != null:
		_left_column.remove_child(stale_left_button)
		_nav_buttons.add_child(stale_left_button)
	var stale_left_spacer: Control = null
	if _left_column != null:
		stale_left_spacer = _left_column.get_node_or_null("AiSwitchLowerSpacer") as Control
	if stale_left_spacer != null:
		stale_left_spacer.queue_free()
	var existing_button := _nav_buttons.get_node_or_null("AiSwitchButton") as Button
	if existing_button == null:
		existing_button = Button.new()
		existing_button.name = "AiSwitchButton"
		existing_button.focus_mode = Control.FOCUS_NONE
		existing_button.custom_minimum_size = DESKTOP_MAIN_NAV_BUTTON_SIZE
		_nav_buttons.add_child(existing_button)
		_bind_action_button(existing_button, "ai_switch_home_city")
	_ai_switch_button = existing_button
	_ai_switch_spacer = null
	_ai_switch_button.set_meta("city_action_id", "ai_switch_home_city")
	_ai_switch_button.set_meta("shell_action_id", "ai_switch_home_city")
	_ai_switch_button.set_meta("shell_action_placement", "bottom_nav_recruit_adjacent_main_world")
	_ai_switch_button.set_meta("ai_switch_command_bg_token", AI_SWITCH_COMMAND_BG_TOKEN)
	_ai_switch_button.text = "AI切换"
	_ai_switch_button.tooltip_text = "切换到 AI 玩家系统，处理开启 AI 玩家、选择主城和 AI 主城设施入口。"
	_apply_mainline_command_button_skin(_ai_switch_button, "ai_switch")
	_refresh_ai_switch_trace_command_chrome()
	_ensure_ai_activity_status_badge()
	_refresh_ai_switch_button_visibility()

func _refresh_ai_switch_button_visibility() -> void:
	var show_ai_switch := _current_mode == WORLD_MODE and _main_map_view_mode == MAIN_MAP_VIEW_MODE_GAMEPLAY
	if _ai_switch_spacer != null and is_instance_valid(_ai_switch_spacer):
		_ai_switch_spacer.visible = show_ai_switch
	if _ai_switch_button != null and is_instance_valid(_ai_switch_button):
		_ai_switch_button.visible = show_ai_switch
		_ai_switch_button.disabled = not show_ai_switch
	_refresh_ai_activity_status_badge_visibility()

func set_ai_activity_status_badge(trace_items: Array) -> void:
	_ensure_ai_activity_status_badge()
	_ai_activity_status_badge_trace_count = 0
	_ai_activity_status_badge_current_task = ""
	_ai_activity_status_badge_source = AI_ACTIVITY_STATUS_BADGE_SOURCE_NONE
	for trace_item_variant in trace_items:
		if not (trace_item_variant is Dictionary):
			continue
		var trace_item := trace_item_variant as Dictionary
		var task_text := _resolve_ai_activity_status_badge_task_text(trace_item)
		_ai_activity_status_badge_trace_count += 1
		if _ai_activity_status_badge_current_task == "" and task_text != "":
			_ai_activity_status_badge_current_task = task_text
	if _ai_activity_status_badge_trace_count > 0:
		_ai_activity_status_badge_source = AI_ACTIVITY_STATUS_BADGE_SOURCE_EXECUTION_TRACE
	_refresh_ai_switch_trace_command_chrome()
	_refresh_ai_activity_status_badge_visibility()

func get_ai_activity_status_badge_summary() -> Dictionary:
	_ensure_ai_activity_status_badge()
	var badge_exists := _ai_activity_status_badge != null and is_instance_valid(_ai_activity_status_badge)
	var badge_visible := badge_exists and _ai_activity_status_badge.visible and _ai_activity_status_badge.is_visible_in_tree()
	var badge_text := _ai_activity_status_badge.text.strip_edges() if badge_exists else ""
	var badge_rect := _ai_activity_status_badge.get_global_rect() if badge_exists else Rect2()
	return {
		"contract": AI_ACTIVITY_STATUS_BADGE_CONTRACT,
		"nodeName": AI_ACTIVITY_STATUS_BADGE_NODE_NAME,
		"buttonName": "AiSwitchButton",
		"exists": badge_exists,
		"visible": badge_visible,
		"text": badge_text,
		"traceCount": _ai_activity_status_badge_trace_count,
		"currentTaskText": _ai_activity_status_badge_current_task,
		"source": _ai_activity_status_badge_source,
		"usesExecutionTrace": _ai_activity_status_badge_source == AI_ACTIVITY_STATUS_BADGE_SOURCE_EXECUTION_TRACE,
		"fallbackUsed": false,
		"rect": {
			"x": badge_rect.position.x,
			"y": badge_rect.position.y,
			"w": badge_rect.size.x,
			"h": badge_rect.size.y,
		},
	}

func _ensure_ai_activity_status_badge() -> void:
	if _ai_switch_button == null or not is_instance_valid(_ai_switch_button):
		return
	if _ai_activity_status_badge == null or not is_instance_valid(_ai_activity_status_badge):
		_ai_activity_status_badge = _ai_switch_button.get_node_or_null(AI_ACTIVITY_STATUS_BADGE_NODE_NAME) as Label
	if _ai_activity_status_badge == null:
		_ai_activity_status_badge = Label.new()
		_ai_activity_status_badge.name = AI_ACTIVITY_STATUS_BADGE_NODE_NAME
		_ai_activity_status_badge.mouse_filter = Control.MOUSE_FILTER_STOP
		_ai_activity_status_badge.custom_minimum_size = AI_ACTIVITY_STATUS_BADGE_MIN_SIZE
		_ai_activity_status_badge.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_ai_activity_status_badge.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		_ai_activity_status_badge.clip_text = true
		_ai_activity_status_badge.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		_ai_activity_status_badge.anchor_left = 1.0
		_ai_activity_status_badge.anchor_top = 0.0
		_ai_activity_status_badge.anchor_right = 1.0
		_ai_activity_status_badge.anchor_bottom = 0.0
		_ai_activity_status_badge.offset_left = -48.0
		_ai_activity_status_badge.offset_top = 5.0
		_ai_activity_status_badge.offset_right = -5.0
		_ai_activity_status_badge.offset_bottom = 25.0
		_ai_activity_status_badge.z_index = 12
		_ai_switch_button.add_child(_ai_activity_status_badge)
	_ai_activity_status_badge.mouse_filter = Control.MOUSE_FILTER_STOP
	_ai_activity_status_badge.set_meta("ai_activity_status_badge_contract", AI_ACTIVITY_STATUS_BADGE_CONTRACT)
	_ai_activity_status_badge.set_meta("ai_activity_status_badge_source", _ai_activity_status_badge_source)
	_ai_activity_status_badge.set_meta("ai_activity_status_badge_trace_count", _ai_activity_status_badge_trace_count)
	var badge_input_callback := Callable(self, "_on_ai_activity_status_badge_gui_input")
	if not _ai_activity_status_badge.gui_input.is_connected(badge_input_callback):
		_ai_activity_status_badge.gui_input.connect(badge_input_callback)
	_ai_activity_status_badge.add_theme_stylebox_override("normal", _build_button_stylebox(Color(0.86, 0.32, 0.10, 0.96), Color(1.0, 0.82, 0.38, 0.95), 5, 1, 4, 4, 1, 1))
	_ai_activity_status_badge.add_theme_font_size_override("font_size", 10)
	_ai_activity_status_badge.add_theme_color_override("font_color", Color(1.0, 0.96, 0.82, 1.0))
	_ai_activity_status_badge.add_theme_color_override("font_outline_color", Color(0.20, 0.06, 0.02, 0.88))
	_ai_activity_status_badge.add_theme_constant_override("outline_size", 1)

func _refresh_ai_activity_status_badge_visibility() -> void:
	if _ai_activity_status_badge == null or not is_instance_valid(_ai_activity_status_badge):
		_ensure_ai_activity_status_badge()
	if _ai_activity_status_badge == null or not is_instance_valid(_ai_activity_status_badge):
		return
	var switch_visible := _ai_switch_button != null and is_instance_valid(_ai_switch_button) and _ai_switch_button.visible and _ai_switch_button.is_visible_in_tree()
	var show_badge := switch_visible and _current_mode == WORLD_MODE and _main_map_view_mode == MAIN_MAP_VIEW_MODE_GAMEPLAY and _ai_activity_status_badge_trace_count > 0
	_ai_activity_status_badge.visible = show_badge
	_ai_activity_status_badge.text = "行动" if _ai_activity_status_badge_trace_count > 0 else ""
	_ai_activity_status_badge.tooltip_text = "AI玩家正在行动：%s" % _ai_activity_status_badge_current_task if _ai_activity_status_badge_current_task != "" else "AI玩家正在行动"
	_ai_activity_status_badge.set_meta("ai_activity_status_badge_source", _ai_activity_status_badge_source)
	_ai_activity_status_badge.set_meta("ai_activity_status_badge_trace_count", _ai_activity_status_badge_trace_count)

func _refresh_ai_switch_trace_command_chrome() -> void:
	if _ai_switch_button == null or not is_instance_valid(_ai_switch_button):
		return
	var trace_active := _ai_activity_status_badge_trace_count > 0 and _ai_activity_status_badge_source == AI_ACTIVITY_STATUS_BADGE_SOURCE_EXECUTION_TRACE
	_ai_switch_button.set_meta("ai_switch_trace_command_chrome_token", AI_SWITCH_TRACE_COMMAND_CHROME_TOKEN)
	_ai_switch_button.set_meta("ai_switch_trace_command_chrome_active", trace_active)
	_ai_switch_button.set_meta("ai_switch_trace_command_current_task", _ai_activity_status_badge_current_task)
	if trace_active:
		_ai_switch_button.tooltip_text = "AI玩家正在行动：%s" % _ai_activity_status_badge_current_task if _ai_activity_status_badge_current_task != "" else "AI玩家正在行动"
		_ai_switch_button.add_theme_stylebox_override("normal", _build_button_stylebox(Color(0.34, 0.14, 0.045, 0.96), Color(1.0, 0.70, 0.30, 0.94), 5, 2, 6, 6, 2, 2))
	else:
		_ai_switch_button.tooltip_text = "切换到 AI 玩家系统，处理开启 AI 玩家、选择主城和 AI 主城设施入口。"
		_apply_mainline_command_button_skin(_ai_switch_button, "ai_switch")


func _resolve_ai_activity_status_badge_task_text(trace_item: Dictionary) -> String:
	var current_task := str(trace_item.get("currentTaskText", "")).strip_edges()
	if current_task != "":
		return _compact_single_line_text(current_task, 18)
	var title := str(trace_item.get("title", "")).strip_edges()
	if title != "":
		return _compact_single_line_text(title, 18)
	var summary := str(trace_item.get("summary", "")).strip_edges()
	if summary != "":
		return _compact_single_line_text(summary, 18)
	return "AI正在行动"

func _on_ai_activity_status_badge_gui_input(event: InputEvent) -> void:
	if not (event is InputEventMouseButton):
		return
	var mouse_event := event as InputEventMouseButton
	if mouse_event.button_index != MOUSE_BUTTON_LEFT or not mouse_event.pressed:
		return
	if _ai_activity_status_badge_trace_count <= 0:
		return
	if _ai_activity_status_badge != null and is_instance_valid(_ai_activity_status_badge):
		_ai_activity_status_badge.accept_event()
	ai_activity_badge_requested.emit()

func _apply_city_action_button_state(button: Button, is_selected: bool, surface_role: String) -> void:
	_apply_button_chrome_profile(button, _resolve_city_action_chrome_profile(is_selected, surface_role))
	if surface_role == CITY_ACTION_SURFACE_MAIN_NAV and _has_main_nav_button_shell_texture(is_selected):
		_apply_button_texture_backing(
			button,
			_resolve_main_nav_button_shell_profile(is_selected),
			_resolve_main_nav_button_pressed_shell_profile(is_selected)
		)

func _has_main_nav_button_shell_texture(is_selected: bool) -> bool:
	return _resolve_main_nav_button_shell_profile(is_selected).get("texture", null) != null

func _apply_button_texture_backing(button: Button, profile: Dictionary, pressed_profile: Dictionary = {}) -> void:
	if button == null:
		return
	var texture := profile.get("texture", null) as Texture2D
	if texture == null:
		return
	var normal_style := _build_texture_stylebox_from_profile(profile, texture)
	var pressed_texture := pressed_profile.get("texture", null) as Texture2D
	var pressed_style := _build_texture_stylebox_from_profile(pressed_profile, pressed_texture) if pressed_texture != null else normal_style.duplicate()
	button.add_theme_stylebox_override("normal", normal_style)
	button.add_theme_stylebox_override("hover", normal_style.duplicate())
	button.add_theme_stylebox_override("pressed", pressed_style)
	button.add_theme_stylebox_override("focus", normal_style.duplicate())
	button.add_theme_stylebox_override("disabled", normal_style.duplicate())

func _apply_mainline_command_button_skin_poc() -> void:
	_apply_mainline_command_button_skin(_ai_hub_button, "ai_hub")
	_apply_mainline_command_button_skin(_ai_switch_button, "ai_switch")
	_apply_mainline_command_button_skin(_chat_button, "chat")
	_apply_mainline_command_button_skin(_war_button, "battle_report")
	_apply_mainline_command_button_skin(_generals_button, "generals")
	_apply_mainline_command_button_skin(_recruit_button, "recruit")
	_apply_mainline_command_button_skin(_settings_button, "settings")
	_apply_mainline_command_button_skin(_skill_library_button, "skill_library")
	_apply_mainline_command_button_skin(_interior_button, "interior")
	_apply_mainline_command_button_skin(_alliance_button, "alliance")
	_apply_mainline_command_button_skin(_mail_button, "mail")
	_apply_mainline_command_button_skin(_activity_button, "activity")
	_apply_mainline_command_button_skin(_help_button, "help")
	_apply_mainline_support_button_paper_style_poc()

func _apply_mainline_command_button_skin(button: Button, action_id: String) -> void:
	if button == null:
		return
	var texture_path := str(MAINLINE_COMMAND_BUTTON_SKIN_PATHS.get(action_id, "")).strip_edges()
	if texture_path == "":
		return
	var texture := _load_mainline_command_button_skin_texture(texture_path)
	if texture == null:
		return
	button.set_meta("mainline_command_button_skin_action_id", action_id)
	button.set_meta("mainline_command_button_skin_path", texture_path)
	button.set_meta("shell_command_chrome_token", SHELL_COMMAND_CHROME_TOKEN)
	_clear_mainline_command_button_skin_overlay_nodes(button)
	_apply_mainline_command_button_skin_style(button)
	button.add_theme_stylebox_override("normal", _build_mainline_command_button_skin_style(texture, Color(1.0, 1.0, 1.0, 1.0)))
	button.add_theme_stylebox_override("hover", _build_mainline_command_button_skin_style(texture, Color(1.07, 1.05, 0.96, 1.0)))
	button.add_theme_stylebox_override("pressed", _build_mainline_command_button_skin_style(texture, Color(0.92, 0.89, 0.80, 1.0), 2.0))
	button.add_theme_stylebox_override("focus", _build_mainline_command_button_skin_style(texture, Color(1.04, 1.02, 0.95, 1.0)))
	button.add_theme_stylebox_override("disabled", _build_mainline_command_button_skin_style(texture, Color(0.76, 0.74, 0.68, 0.72)))

func _load_mainline_command_button_skin_texture(texture_path: String) -> Texture2D:
	if ResourceLoader.exists(texture_path) and _can_load_texture_resource_without_import_cache_error(texture_path):
		var loaded_resource: Resource = load(texture_path)
		if loaded_resource is Texture2D:
			return loaded_resource as Texture2D
	var image := Image.new()
	if image.load(ProjectSettings.globalize_path(texture_path)) == OK:
		return ImageTexture.create_from_image(image)
	return null

func _can_load_texture_resource_without_import_cache_error(texture_path: String) -> bool:
	if not texture_path.to_lower().ends_with(".png"):
		return true
	if OS.has_feature("template"):
		return true
	var import_path := texture_path + ".import"
	if not FileAccess.file_exists(import_path):
		return true
	var import_file := FileAccess.open(import_path, FileAccess.READ)
	if import_file == null:
		return false
	var import_text := import_file.get_as_text()
	import_file.close()
	var marker := "dest_files=[\""
	var start := import_text.find(marker)
	if start < 0:
		return false
	start += marker.length()
	var end := import_text.find("\"", start)
	if end <= start:
		return false
	var imported_texture_path := import_text.substr(start, end - start)
	if FileAccess.file_exists(imported_texture_path):
		return true
	if imported_texture_path.begins_with("res://"):
		return FileAccess.file_exists(ProjectSettings.globalize_path(imported_texture_path))
	return false

func _apply_mainline_command_button_skin_style(button: Button) -> void:
	if button == null:
		return
	button.flat = false
	button.alignment = HORIZONTAL_ALIGNMENT_CENTER
	button.clip_text = true
	button.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	button.custom_minimum_size = DESKTOP_MAIN_NAV_MENU_BUTTON_MIN_SIZE if button == _main_nav_menu_button else DESKTOP_MAIN_NAV_BUTTON_SIZE
	button.icon = null
	button.expand_icon = false
	button.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
	button.add_theme_constant_override("h_separation", 0)
	button.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	button.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	button.size_flags_stretch_ratio = 0.0
	button.add_theme_font_size_override("font_size", DESKTOP_MAIN_NAV_BUTTON_FONT_SIZE)
	button.add_theme_color_override("font_color", MAINLINE_COMMAND_BUTTON_SKIN_FONT_COLOR)
	button.add_theme_color_override("font_hover_color", MAINLINE_COMMAND_BUTTON_SKIN_FONT_HOVER_COLOR)
	button.add_theme_color_override("font_pressed_color", MAINLINE_COMMAND_BUTTON_SKIN_FONT_PRESSED_COLOR)
	button.add_theme_color_override("font_disabled_color", MAINLINE_COMMAND_BUTTON_SKIN_FONT_DISABLED_COLOR)
	button.add_theme_color_override("font_outline_color", MAINLINE_COMMAND_BUTTON_SKIN_FONT_OUTLINE_COLOR)
	button.add_theme_constant_override("outline_size", 1)

func _build_mainline_command_button_skin_style(texture: Texture2D, modulate_color: Color, pressed_text_offset: float = 0.0) -> StyleBoxTexture:
	var style := StyleBoxTexture.new()
	style.texture = texture
	style.modulate_color = modulate_color
	style.content_margin_left = MAINLINE_COMMAND_BUTTON_SKIN_TEXT_MARGIN_LEFT
	style.content_margin_top = MAINLINE_COMMAND_BUTTON_SKIN_TEXT_MARGIN_TOP + pressed_text_offset
	style.content_margin_right = MAINLINE_COMMAND_BUTTON_SKIN_TEXT_MARGIN_RIGHT
	style.content_margin_bottom = maxf(2.0, MAINLINE_COMMAND_BUTTON_SKIN_TEXT_MARGIN_BOTTOM - pressed_text_offset)
	return style

func _clear_mainline_command_button_skin_overlay_nodes(button: Button) -> void:
	if button == null:
		return
	for stale_node_name in ["Mainline" + "CommandButtonSkinTexture", "Mainline" + "CommandButtonSkinLabel"]:
		var stale_node := button.get_node_or_null(stale_node_name)
		if stale_node != null:
			stale_node.queue_free()

func _apply_mainline_support_button_paper_style_poc() -> void:
	_apply_mainline_support_button_paper_style(_main_nav_menu_button, false)

func _apply_mainline_support_button_paper_style(button: Button, is_selected: bool) -> void:
	if button == null:
		return
	button.flat = false
	button.alignment = HORIZONTAL_ALIGNMENT_CENTER
	button.clip_text = true
	button.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	var is_utility_button := button != _main_nav_menu_button
	if button == _main_nav_menu_button:
		button.custom_minimum_size = DESKTOP_MAIN_NAV_MENU_BUTTON_MIN_SIZE
	else:
		button.custom_minimum_size = MAINLINE_SUPPORT_UTILITY_BUTTON_MIN_SIZE
		button.icon = null
		button.expand_icon = false
		button.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
		button.add_theme_constant_override("h_separation", 0)
	button.add_theme_font_size_override("font_size", 15 if is_utility_button else DESKTOP_MAIN_NAV_BUTTON_FONT_SIZE)
	button.add_theme_color_override("font_color", MAINLINE_COMMAND_BUTTON_SKIN_FONT_COLOR)
	button.add_theme_color_override("font_hover_color", MAINLINE_COMMAND_BUTTON_SKIN_FONT_HOVER_COLOR)
	button.add_theme_color_override("font_pressed_color", MAINLINE_COMMAND_BUTTON_SKIN_FONT_PRESSED_COLOR)
	button.add_theme_color_override("font_disabled_color", MAINLINE_COMMAND_BUTTON_SKIN_FONT_DISABLED_COLOR)
	button.add_theme_color_override("font_outline_color", MAINLINE_COMMAND_BUTTON_SKIN_FONT_OUTLINE_COLOR)
	button.add_theme_constant_override("outline_size", 1)
	var normal_bg := MAINLINE_SUPPORT_BUTTON_PAPER_SELECTED_BG if is_selected else MAINLINE_SUPPORT_BUTTON_PAPER_BG
	button.add_theme_stylebox_override("normal", _build_mainline_support_button_paper_style(normal_bg))
	button.add_theme_stylebox_override("hover", _build_mainline_support_button_paper_style(MAINLINE_SUPPORT_BUTTON_PAPER_HOVER_BG))
	button.add_theme_stylebox_override("pressed", _build_mainline_support_button_paper_style(MAINLINE_SUPPORT_BUTTON_PAPER_PRESSED_BG, 2.0))
	button.add_theme_stylebox_override("focus", _build_mainline_support_button_paper_style(MAINLINE_SUPPORT_BUTTON_PAPER_HOVER_BG))
	button.add_theme_stylebox_override("disabled", _build_mainline_support_button_paper_style(MAINLINE_SUPPORT_BUTTON_PAPER_BG, 0.0, 0.58))

func _build_mainline_support_button_paper_style(bg_color: Color, pressed_text_offset: float = 0.0, alpha_scale: float = 1.0) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(bg_color.r, bg_color.g, bg_color.b, bg_color.a * alpha_scale)
	style.border_color = MAINLINE_SUPPORT_BUTTON_PAPER_BORDER
	style.set_border_width_all(1)
	style.corner_radius_top_left = 3
	style.corner_radius_top_right = 3
	style.corner_radius_bottom_right = 3
	style.corner_radius_bottom_left = 3
	style.content_margin_left = 4
	style.content_margin_top = 5 + pressed_text_offset
	style.content_margin_right = 4
	style.content_margin_bottom = maxf(3.0, 5.0 - pressed_text_offset)
	return style

func _build_texture_stylebox_from_profile(profile: Dictionary, texture: Texture2D) -> StyleBoxTexture:
	var style := StyleBoxTexture.new()
	style.texture = texture
	style.modulate_color = profile.get("modulate", Color(1.0, 1.0, 1.0, 1.0))
	return style

func _apply_left_rail_density_style() -> void:
	var density_profile := _resolve_left_rail_density_profile()
	var title_color := Color(0.25, 0.17, 0.09, 0.96)
	var token_color := Color(0.20, 0.16, 0.11, 0.96)
	var secondary_color := Color(0.45, 0.36, 0.25, 0.86)
	if _left_margin != null:
		var outer_margin := maxi(int(density_profile.get("outer_margin", 6)), 8)
		_left_margin.add_theme_constant_override("margin_left", outer_margin)
		_left_margin.add_theme_constant_override("margin_top", outer_margin)
		_left_margin.add_theme_constant_override("margin_right", outer_margin)
		_left_margin.add_theme_constant_override("margin_bottom", outer_margin)
	if _left_column != null:
		_left_column.add_theme_constant_override("separation", maxi(int(density_profile.get("section_gap", 1)), 4))
	if _task_header_row != null:
		_task_header_row.add_theme_constant_override("separation", maxi(int(density_profile.get("task_header_gap", 1)), 4))
	if _task_icon != null:
		_task_icon.custom_minimum_size = Vector2(18, 18)
		_task_icon.modulate = Color(0.42, 0.31, 0.18, 0.84)
	if _task_title != null:
		_task_title.add_theme_font_size_override("font_size", maxi(int(density_profile.get("task_title_font_size", 11)), 13))
		_task_title.add_theme_color_override("font_color", title_color)
	if _task_body != null:
		_task_body.custom_minimum_size = Vector2(0, maxi(int(density_profile.get("task_body_min_height", 18)), 22))
		_task_body.add_theme_font_size_override("font_size", maxi(int(density_profile.get("primary_token_font_size", 8)), 10))
		_task_body.add_theme_color_override("font_color", token_color)
	if _city_state_title != null:
		_city_state_title.custom_minimum_size = Vector2(0, maxi(int(density_profile.get("section_label_min_height", 12)), 14))
		_city_state_title.add_theme_font_size_override("font_size", maxi(int(density_profile.get("section_title_font_size", 7)), 9))
		_city_state_title.add_theme_color_override("font_color", secondary_color)
	if _city_state_summary != null:
		_city_state_summary.custom_minimum_size = Vector2(0, maxi(int(density_profile.get("summary_row_min_height", 13)), 16))
		_city_state_summary.add_theme_font_size_override("font_size", maxi(int(density_profile.get("secondary_token_font_size", 6)), 8))
		_city_state_summary.add_theme_color_override("font_color", token_color)
	if _city_tech_summary != null:
		_city_tech_summary.custom_minimum_size = Vector2(0, maxi(int(density_profile.get("section_label_min_height", 12)), 14))
		_city_tech_summary.add_theme_font_size_override("font_size", maxi(int(density_profile.get("secondary_token_font_size", 6)), 8))
		_city_tech_summary.add_theme_color_override("font_color", secondary_color)
	if _troop_section_title != null:
		_troop_section_title.custom_minimum_size = Vector2(0, maxi(int(density_profile.get("section_label_min_height", 12)), 15))
		_troop_section_title.add_theme_font_size_override("font_size", maxi(int(density_profile.get("section_title_font_size", 7)), 10))
		_troop_section_title.add_theme_color_override("font_color", secondary_color)
	if _troop_summary != null:
		_troop_summary.add_theme_font_size_override("font_size", maxi(int(density_profile.get("secondary_token_font_size", 6)), 8))
		_troop_summary.add_theme_color_override("font_color", token_color)
	if _troop_slot_list != null:
		_troop_slot_list.add_theme_constant_override("separation", maxi(int(density_profile.get("card_list_gap", 1)), 6))
	_refresh_troop_slot_scroll_container(_resolve_shell_layout_profile())
	if _interior_quick_links != null:
		_interior_quick_links.add_theme_constant_override("separation", maxi(int(density_profile.get("quick_link_gap", 1)), 4))
		_interior_quick_links.visible = false
	for button in [_interior_summary_button_market, _interior_summary_button_tax, _interior_summary_button_policy, _interior_summary_button_affairs]:
		var quick_link_button := button as Button
		if quick_link_button == null:
			continue
		quick_link_button.custom_minimum_size = Vector2(0, maxi(int(density_profile.get("quick_link_min_height", 18)), 22))
		quick_link_button.add_theme_font_size_override("font_size", maxi(int(density_profile.get("quick_link_font_size", 7)), 9))
		quick_link_button.add_theme_color_override("font_color", secondary_color)
		quick_link_button.add_theme_color_override("font_hover_color", token_color)
		quick_link_button.add_theme_color_override("font_pressed_color", token_color)
		_apply_button_chrome_profile(quick_link_button, _resolve_left_rail_quick_link_chrome_profile())
	for button in _troop_slot_buttons:
		var troop_button := button as Button
		if troop_button == null:
			continue
		_apply_troop_slot_density_style(troop_button, density_profile)
	_refresh_left_troop_rail_chrome()

func _refresh_left_troop_rail_chrome() -> void:
	if _left_rail_panel == null:
		return
	_left_rail_panel.modulate = Color(1.0, 1.0, 1.0, 1.0)
	_left_rail_panel.self_modulate = Color(1.0, 1.0, 1.0, 0.0)
	_remove_left_troop_rail_layout_background()
	_ensure_left_troop_rail_backdrop()
	_left_rail_panel.add_theme_stylebox_override("panel", _build_button_stylebox(
		Color(0.0, 0.0, 0.0, 0.0),
		Color(0.70, 0.52, 0.28, 0.92),
		5,
		1,
		0,
		0,
		0,
		0
	))
	_left_rail_panel.set_meta("left_troop_rail_style_token", LEFT_TROOP_RAIL_STYLE_TOKEN)
	_left_rail_panel.offset_right = maxf(_left_rail_panel.offset_right, _left_rail_panel.offset_left + LEFT_TROOP_RAIL_PANEL_WIDTH)
	_sync_left_troop_rail_backdrop()
	if _troop_slot_list != null:
		_troop_slot_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		_troop_slot_list.add_theme_constant_override("separation", 4)
	if _troop_slot_scroll != null:
		_troop_slot_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	for button_variant in _troop_slot_buttons:
		var troop_button := button_variant as Button
		if troop_button != null:
			troop_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_apply_left_troop_rail_compact_mode(_uses_mobile_shell_layout(get_viewport_rect().size))
	_refresh_troop_slot_scroll_container(_resolve_shell_layout_profile())

func _remove_left_troop_rail_layout_background() -> void:
	if _left_rail_panel == null:
		return
	var paper_surface := _left_rail_panel.get_node_or_null("PaperSurface") as ColorRect
	if paper_surface != null:
		paper_surface.queue_free()

func _ensure_left_troop_rail_backdrop() -> void:
	if _left_rail_panel == null:
		return
	if _left_troop_rail_backdrop != null and is_instance_valid(_left_troop_rail_backdrop):
		return
	var parent_control := _left_rail_panel.get_parent() as Control
	if parent_control == null:
		return
	_left_troop_rail_backdrop = Panel.new()
	_left_troop_rail_backdrop.name = "LeftTroopRailPaperBackdrop"
	_left_troop_rail_backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_left_troop_rail_backdrop.set_anchors_preset(Control.PRESET_TOP_LEFT)
	_left_troop_rail_backdrop.modulate = Color(1.0, 1.0, 1.0, 0.82)
	_left_troop_rail_backdrop.add_theme_stylebox_override("panel", _build_button_stylebox(
		Color(0.96, 0.92, 0.80, 0.78),
		Color(0.70, 0.52, 0.28, 0.72),
		5,
		1,
		0,
		0,
		0,
		0
	))
	parent_control.add_child(_left_troop_rail_backdrop)
	parent_control.move_child(_left_troop_rail_backdrop, max(0, _left_rail_panel.get_index()))

func _sync_left_troop_rail_backdrop() -> void:
	if _left_rail_panel == null or _left_troop_rail_backdrop == null or not is_instance_valid(_left_troop_rail_backdrop):
		return
	_left_troop_rail_backdrop.visible = _left_rail_panel.visible
	_left_troop_rail_backdrop.position = _left_rail_panel.position
	_left_troop_rail_backdrop.size = _left_rail_panel.size
	_left_troop_rail_backdrop.modulate = Color(1.0, 1.0, 1.0, 0.82)
	_left_troop_rail_backdrop.z_index = 60
	_left_rail_panel.z_index = 61

func _apply_troop_slot_button_style(button: Button, status_text: String, is_disabled: bool, _role_tag: String, slot_index: int) -> void:
	if button == null:
		return
	var is_moving := status_text.begins_with("行军")
	_apply_left_troop_rail_card_button_style(button, slot_index, is_disabled, is_moving)
	_apply_troop_slot_view_style(button, slot_index, is_disabled, is_moving)

func _apply_left_troop_rail_card_button_style(button: Button, slot_index: int, is_disabled: bool, is_moving: bool) -> void:
	var border := Color(0.70, 0.52, 0.30, 0.30)
	var normal_bg := Color(0.98, 0.95, 0.86, 0.22)
	var hover_bg := Color(1.0, 0.98, 0.90, 0.38)
	var pressed_bg := Color(0.86, 0.78, 0.62, 0.46)
	if slot_index >= 2:
		border = Color(0.60, 0.47, 0.29, 0.24)
	if is_moving:
		border = Color(0.80, 0.56, 0.25, 0.40)
		normal_bg = Color(0.99, 0.94, 0.79, 0.30)
	if is_disabled:
		normal_bg = Color(0.88, 0.85, 0.77, 0.18)
		hover_bg = normal_bg
		pressed_bg = normal_bg
		border = Color(0.55, 0.49, 0.39, 0.18)
	var skin_state := "disabled" if is_disabled else ("marching" if is_moving else "normal")
	var normal_style := _build_left_troop_rail_card_skin_stylebox(skin_state, normal_bg, border)
	var hover_style := _build_left_troop_rail_card_skin_stylebox("selected", hover_bg, border.lightened(0.08))
	var pressed_style := _build_left_troop_rail_card_skin_stylebox("selected", pressed_bg, border.darkened(0.06), 1.0)
	var disabled_style := _build_left_troop_rail_card_skin_stylebox("disabled", normal_bg, border)
	button.add_theme_stylebox_override("normal", normal_style)
	button.add_theme_stylebox_override("hover", hover_style)
	button.add_theme_stylebox_override("pressed", pressed_style)
	button.add_theme_stylebox_override("focus", hover_style)
	button.add_theme_stylebox_override("disabled", disabled_style)
	button.add_theme_color_override("font_color", Color(0.20, 0.16, 0.11, 0.96))
	button.add_theme_color_override("font_hover_color", Color(0.12, 0.20, 0.14, 0.98))
	button.add_theme_color_override("font_pressed_color", Color(0.12, 0.10, 0.07, 0.98))
	button.add_theme_color_override("font_disabled_color", Color(0.42, 0.38, 0.31, 0.70))
	var is_mobile_compact := _uses_mobile_shell_layout(get_viewport_rect().size)
	button.custom_minimum_size = LEFT_TROOP_RAIL_CARD_COMPACT_MIN_SIZE if is_mobile_compact else LEFT_TROOP_RAIL_CARD_MIN_SIZE
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.alignment = HORIZONTAL_ALIGNMENT_LEFT
	button.flat = false
	button.modulate = Color(1.0, 1.0, 1.0, 1.0)
	button.self_modulate = Color(1.0, 1.0, 1.0, 1.0)
	button.set_meta("left_troop_rail_style_token", LEFT_TROOP_RAIL_STYLE_TOKEN)
	button.set_meta("left_troop_rail_card_skin_usage_id", LEFT_TROOP_RAIL_CARD_SKIN_USAGE_ID)
	button.set_meta("left_troop_rail_card_skin_state", skin_state)
	button.set_meta("left_troop_rail_card_skin_source", _resolve_left_troop_rail_card_skin_path(skin_state))
	button.set_meta("left_troop_rail_card_skin_loaded", _load_left_troop_rail_card_skin_texture(skin_state) != null)

func _build_left_troop_rail_card_skin_stylebox(state: String, fallback_bg: Color, fallback_border: Color, pressed_text_offset: float = 0.0) -> StyleBox:
	var texture := _load_left_troop_rail_card_skin_texture(state)
	if texture == null:
		return _build_button_stylebox(fallback_bg, fallback_border, 5, 1, 0, 0, 0, 0)
	var style := StyleBoxTexture.new()
	style.texture = texture
	style.texture_margin_left = LEFT_TROOP_RAIL_CARD_SKIN_NINE_SLICE_MARGIN
	style.texture_margin_top = LEFT_TROOP_RAIL_CARD_SKIN_NINE_SLICE_MARGIN
	style.texture_margin_right = LEFT_TROOP_RAIL_CARD_SKIN_NINE_SLICE_MARGIN
	style.texture_margin_bottom = LEFT_TROOP_RAIL_CARD_SKIN_NINE_SLICE_MARGIN
	style.content_margin_left = 0
	style.content_margin_top = pressed_text_offset
	style.content_margin_right = 0
	style.content_margin_bottom = maxf(0.0, 0.0 - pressed_text_offset)
	return style

func _load_left_troop_rail_card_skin_texture(state: String) -> Texture2D:
	var path := _resolve_left_troop_rail_card_skin_path(state)
	if path == "":
		return null
	return _load_ui_texture(path)

func _resolve_left_troop_rail_card_skin_path(state: String) -> String:
	var normalized_state := state.strip_edges().to_lower()
	if not LEFT_TROOP_RAIL_CARD_SKIN_PATHS.has(normalized_state):
		normalized_state = "normal"
	return str(LEFT_TROOP_RAIL_CARD_SKIN_PATHS.get(normalized_state, ""))

func _apply_transparent_button_backing(button: Button) -> void:
	var transparent_style := _build_button_stylebox(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 0, 0, 0, 0, 0, 0)
	button.add_theme_stylebox_override("normal", transparent_style)
	button.add_theme_stylebox_override("hover", transparent_style)
	button.add_theme_stylebox_override("pressed", transparent_style)
	button.add_theme_stylebox_override("focus", transparent_style)
	button.add_theme_stylebox_override("disabled", transparent_style)

func _has_troop_slot_shell_texture() -> bool:
	return _resolve_troop_slot_shell_profile().get("texture", null) != null

func _apply_troop_slot_shell_texture(button: Button) -> void:
	var refs := _resolve_troop_slot_view(button)
	if refs.is_empty():
		return
	var shell_texture := refs.get("shell_texture") as TextureRect
	if shell_texture == null:
		return
	var profile := _resolve_troop_slot_shell_profile()
	var texture := profile.get("texture", null) as Texture2D
	shell_texture.texture = texture
	shell_texture.visible = texture != null
	if texture == null:
		return
	shell_texture.modulate = profile.get("modulate", Color(1.0, 1.0, 1.0, 1.0))
	shell_texture.expand_mode = int(profile.get("expand_mode", TextureRect.EXPAND_IGNORE_SIZE))
	shell_texture.stretch_mode = int(profile.get("stretch_mode", TextureRect.STRETCH_SCALE))

func _apply_troop_slot_density_style(button: Button, density_profile: Dictionary) -> void:
	var refs := _resolve_troop_slot_view(button)
	if refs.is_empty():
		return
	var primary_size := maxi(int(density_profile.get("primary_token_font_size", 8)), 12)
	var secondary_size := maxi(int(density_profile.get("secondary_token_font_size", 6)), 10)
	var title_size := maxi(primary_size + 2, 14)
	var title_color := Color(0.27, 0.19, 0.10, 0.96)
	var token_color := Color(0.20, 0.16, 0.11, 0.96)
	var secondary_color := Color(0.50, 0.40, 0.28, 0.86)
	var portrait_label := refs.get("portrait_label") as Label
	if portrait_label != null:
		portrait_label.visible = false
		portrait_label.add_theme_font_size_override("font_size", title_size)
		portrait_label.add_theme_color_override("font_color", token_color)
	var portrait_texture := refs.get("portrait_texture") as TextureRect
	if portrait_texture != null:
		portrait_texture.custom_minimum_size = Vector2(64.0, 64.0)
		portrait_texture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		portrait_texture.modulate = Color(1.04, 1.02, 0.96, 1.0)
	var slot_label := refs.get("slot_label") as Label
	if slot_label != null:
		slot_label.visible = false
		slot_label.add_theme_font_size_override("font_size", primary_size)
		slot_label.add_theme_color_override("font_color", token_color)
	var role_label := refs.get("role_label") as Label
	if role_label != null:
		role_label.visible = false
		role_label.add_theme_font_size_override("font_size", secondary_size)
		role_label.add_theme_color_override("font_color", secondary_color)
	var status_label := refs.get("status_label") as Label
	if status_label != null:
		status_label.visible = true
		status_label.add_theme_font_size_override("font_size", maxi(15, secondary_size + 1))
		status_label.add_theme_color_override("font_color", Color(0.30, 0.20, 0.09, 0.96))
	var title_label := refs.get("title_label") as Label
	if title_label != null:
		title_label.visible = false
		title_label.add_theme_font_size_override("font_size", title_size)
		title_label.add_theme_color_override("font_color", title_color)
		var title_row := title_label.get_parent() as Control
		if title_row != null:
			title_row.visible = false
	var strength_tag := refs.get("strength_tag") as Label
	if strength_tag != null:
		strength_tag.visible = false
		strength_tag.text = ""
		strength_tag.add_theme_font_size_override("font_size", maxi(11, secondary_size))
		strength_tag.add_theme_color_override("font_color", Color(0.48, 0.36, 0.19, 0.90))
	var strength_value := refs.get("strength_value") as Label
	if strength_value != null:
		strength_value.visible = true
		strength_value.add_theme_font_size_override("font_size", 18)
		strength_value.add_theme_color_override("font_color", Color(0.31, 0.20, 0.08, 0.98))
	var morale_row := refs.get("morale_row") as Control
	if morale_row != null:
		morale_row.visible = false
	var morale_tag := refs.get("morale_tag") as Label
	if morale_tag != null:
		morale_tag.visible = false
		morale_tag.add_theme_font_size_override("font_size", secondary_size)
		morale_tag.add_theme_color_override("font_color", secondary_color)
	var morale_value := refs.get("morale_value") as Label
	if morale_value != null:
		morale_value.visible = false
		morale_value.add_theme_font_size_override("font_size", secondary_size)
		morale_value.add_theme_color_override("font_color", secondary_color)
	var morale_track := refs.get("morale_track") as PanelContainer
	if morale_track != null:
		morale_track.visible = false
	for icon_key in ["role_icon", "type_icon", "status_icon"]:
		var icon := refs.get(icon_key) as TextureRect
		if icon == null:
			continue
		match icon_key:
			"role_icon":
				icon.custom_minimum_size = LEFT_TROOP_RAIL_ROLE_ICON_SIZE
			"type_icon":
				icon.custom_minimum_size = LEFT_TROOP_RAIL_TYPE_ICON_SIZE
			_:
				icon.custom_minimum_size = LEFT_TROOP_RAIL_STATUS_BADGE_SIZE
		icon.visible = icon_key == "status_icon"

func _apply_troop_slot_view_style(button: Button, slot_index: int, is_disabled: bool, is_moving: bool) -> void:
	var refs := _resolve_troop_slot_view(button)
	if refs.is_empty():
		return
	var archetype := _resolve_troop_slot_archetype(slot_index)
	var accent := Color(0.54, 0.40, 0.22, 0.86)
	var base_line := Color(0.76, 0.62, 0.38, 0.32)
	var bottom_line_color := Color(0.54, 0.40, 0.22, 0.25)
	match archetype:
		TROOP_SLOT_ARCHETYPE_PRIMARY:
			accent = Color(0.62, 0.42, 0.21, 0.92)
		TROOP_SLOT_ARCHETYPE_MOBILE:
			accent = Color(0.42, 0.48, 0.33, 0.86)
		_:
			accent = Color(0.45, 0.38, 0.29, 0.72)
	if is_moving:
		accent = Color(0.80, 0.50, 0.20, 0.96)
		base_line = Color(0.80, 0.50, 0.20, 0.38)
	if is_disabled:
		accent.a *= 0.6
		base_line.a *= 0.55
		bottom_line_color.a *= 0.5
	var shell_texture := refs.get("shell_texture") as TextureRect
	if shell_texture != null:
		shell_texture.visible = false
	var paper_surface := refs.get("paper_surface") as ColorRect
	if paper_surface != null:
		var paper_color := Color(0.98, 0.95, 0.86, 0.10)
		if is_moving:
			paper_color = Color(0.99, 0.94, 0.79, 0.14)
		if is_disabled:
			paper_color = Color(0.88, 0.85, 0.77, 0.08)
		paper_surface.color = paper_color
	var portrait_bg := Color(0.92, 0.86, 0.72, 0.62)
	var portrait_border := Color(0.72, 0.52, 0.28, 0.82)
	if is_disabled:
		portrait_bg = Color(0.74, 0.72, 0.66, 0.22)
		portrait_border = Color(0.50, 0.45, 0.37, 0.36)
	var left_inlay := refs.get("left_inlay") as ColorRect
	if left_inlay != null:
		left_inlay.color = base_line
	var top_line := refs.get("top_line") as ColorRect
	if top_line != null:
		top_line.color = accent
	var bottom_line_node := refs.get("bottom_line") as ColorRect
	if bottom_line_node != null:
		bottom_line_node.color = bottom_line_color
	var portrait_panel := refs.get("portrait_panel") as PanelContainer
	if portrait_panel != null:
		portrait_panel.add_theme_stylebox_override("panel", _create_troop_slot_stylebox(portrait_bg, portrait_border, 3, 1))
	var strength_track := refs.get("strength_track") as PanelContainer
	if strength_track != null:
		strength_track.add_theme_stylebox_override("panel", _create_troop_slot_stylebox(Color(0.64, 0.55, 0.36, 0.62), Color(0.48, 0.35, 0.18, 0.58), 3, 1))
	var morale_track := refs.get("morale_track") as PanelContainer
	if morale_track != null:
		morale_track.visible = false
		morale_track.add_theme_stylebox_override("panel", _create_troop_slot_stylebox(Color(0.74, 0.69, 0.57, 0.42), Color(0.50, 0.43, 0.32, 0.34), 2, 1))
	var strength_fill := refs.get("strength_fill") as ColorRect
	if strength_fill != null:
		strength_fill.color = Color(accent.r, accent.g, accent.b, 0.94)
	var morale_fill := refs.get("morale_fill") as ColorRect
	if morale_fill != null:
		morale_fill.visible = false
		morale_fill.color = Color(0.56, 0.45, 0.30, 0.80)
	var status_label := refs.get("status_label") as Label
	if status_label != null:
		status_label.add_theme_color_override("font_color", Color(0.20, 0.13, 0.06, 0.98))

func _apply_troop_slot_content(button: Button, payload: Dictionary, slot_label: String, role_tag: String, is_enabled: bool) -> void:
	var refs := _resolve_troop_slot_view(button)
	if refs.is_empty():
		return
	var label := str(payload.get("label", slot_label)).strip_edges()
	var subtitle := str(payload.get("subtitle", "")).strip_edges()
	var hero_name := _resolve_troop_slot_hero_name(payload, subtitle)
	var strength := maxi(int(payload.get("strength", 0)), 0)
	var strength_max := maxi(maxi(int(payload.get("strengthMax", 0)), strength), 1)
	var status_label := _resolve_troop_slot_status_label(payload, str(payload.get("statusText", "")), subtitle, is_enabled)
	var role_icon_id := _resolve_left_troop_rail_role_icon_id(slot_label, role_tag, is_enabled)
	var type_icon_id := _resolve_left_troop_rail_type_icon_id(payload, slot_label, is_enabled)
	var status_icon_id := _resolve_left_troop_rail_status_icon_id(payload, status_label, subtitle, is_enabled)
	var display_title := label if label != "" else slot_label
	if not is_enabled:
		display_title = "待补位"
		hero_name = "待补位"
		strength = 0
		type_icon_id = "squad_empty"
	var slot_label_node := refs.get("slot_label") as Label
	if slot_label_node != null:
		slot_label_node.text = ""
		slot_label_node.visible = false
	var role_label_node := refs.get("role_label") as Label
	if role_label_node != null:
		role_label_node.text = ""
		role_label_node.visible = false
	var status_label_node := refs.get("status_label") as Label
	if status_label_node != null:
		status_label_node.text = status_label
		status_label_node.visible = status_label != ""
	var title_label_node := refs.get("title_label") as Label
	if title_label_node != null:
		title_label_node.text = ""
		title_label_node.visible = false
		var title_row := title_label_node.get_parent() as Control
		if title_row != null:
			title_row.visible = false
	(refs.get("portrait_label") as Label).text = _resolve_troop_slot_portrait_text(hero_name, slot_label, is_enabled)
	var strength_tag_node := refs.get("strength_tag") as Label
	if strength_tag_node != null:
		strength_tag_node.text = ""
		strength_tag_node.visible = false
	var strength_value_node := refs.get("strength_value") as Label
	if strength_value_node != null:
		strength_value_node.text = _format_grouped_int(strength)
		strength_value_node.visible = true
	var strength_track_node := refs.get("strength_track") as PanelContainer
	if strength_track_node != null:
		strength_track_node.visible = true
	var morale_row := refs.get("morale_row") as Control
	if morale_row != null:
		morale_row.visible = false
	var morale_track := refs.get("morale_track") as PanelContainer
	if morale_track != null:
		morale_track.visible = false
	var morale_value := refs.get("morale_value") as Label
	if morale_value != null:
		morale_value.text = ""
		morale_value.visible = false
	var portrait_asset_key := _resolve_left_troop_rail_portrait_asset_key(payload, slot_label, is_enabled)
	var portrait_texture_asset := _resolve_left_troop_rail_portrait_texture(payload, portrait_asset_key, is_enabled)
	var portrait_texture := refs.get("portrait_texture") as TextureRect
	if portrait_texture != null:
		portrait_texture.texture = portrait_texture_asset
		portrait_texture.visible = portrait_texture_asset != null
		portrait_texture.tooltip_text = portrait_asset_key
	var portrait_label := refs.get("portrait_label") as Label
	if portrait_label != null:
		portrait_label.visible = portrait_texture_asset == null
	var role_icon := refs.get("role_icon") as TextureRect
	if portrait_texture_asset == null:
		_apply_left_troop_rail_icon(role_icon, role_icon_id, LEFT_TROOP_RAIL_ROLE_ICON_SIZE, is_enabled)
	else:
		_clear_left_troop_rail_icon(role_icon)
	_clear_left_troop_rail_icon(refs.get("type_icon") as TextureRect)
	_apply_left_troop_rail_icon(refs.get("status_icon") as TextureRect, status_icon_id, LEFT_TROOP_RAIL_STATUS_BADGE_SIZE, is_enabled)
	button.set_meta("left_troop_rail_role_icon_id", role_icon_id)
	button.set_meta("left_troop_rail_type_icon_id", type_icon_id)
	button.set_meta("left_troop_rail_status_icon_id", status_icon_id)
	button.set_meta("left_troop_rail_role_icon_path", _resolve_left_troop_rail_icon_path(role_icon_id))
	button.set_meta("left_troop_rail_type_icon_path", _resolve_left_troop_rail_icon_path(type_icon_id))
	button.set_meta("left_troop_rail_status_icon_path", _resolve_left_troop_rail_icon_path(status_icon_id))
	button.set_meta("left_troop_rail_portrait_asset_key", portrait_asset_key)
	var strength_fill := refs.get("strength_fill") as ColorRect
	if strength_fill != null:
		var strength_ratio := _resolve_troop_ratio(strength, strength_max)
		strength_fill.color = _resolve_left_troop_rail_strength_fill_color(strength_ratio, is_enabled, status_icon_id)
		strength_fill.custom_minimum_size = Vector2(maxi(0, int(round(TROOP_STRENGTH_TRACK_WIDTH * strength_ratio))), 0)
		strength_fill.offset_right = strength_fill.custom_minimum_size.x
	var morale_fill := refs.get("morale_fill") as ColorRect
	if morale_fill != null:
		morale_fill.visible = false
		morale_fill.custom_minimum_size = Vector2.ZERO
		morale_fill.offset_right = 0.0

func _resolve_left_troop_rail_role_icon_id(_slot_label: String, role_tag: String, is_enabled: bool) -> String:
	if not is_enabled:
		return "squad_empty"
	if role_tag.contains("机动"):
		return "squad_mobile"
	if role_tag.contains("后备") or role_tag.contains("后位"):
		return "squad_reserve"
	return "squad_primary"

func _resolve_left_troop_rail_type_icon_id(payload: Dictionary, slot_label: String, is_enabled: bool) -> String:
	if not is_enabled:
		return "squad_empty"
	var normalized := ""
	for key in ["troopType", "unitType", "armsType", "type", "subtitle", "label"]:
		normalized += " %s" % str(payload.get(key, ""))
	normalized = normalized.strip_edges().to_lower()
	if normalized.contains("骑") or normalized.contains("cavalry"):
		return "troop_cavalry"
	if normalized.contains("弓") or normalized.contains("archer"):
		return "troop_archer"
	if normalized.contains("器械") or normalized.contains("攻城") or normalized.contains("siege"):
		return "troop_siege"
	if normalized.contains("步") or normalized.contains("infantry"):
		return "troop_infantry"
	var slot_index := _resolve_left_troop_rail_slot_index(slot_label)
	match slot_index % 4:
		1:
			return "troop_cavalry"
		2:
			return "troop_archer"
		3:
			return "troop_siege"
		_:
			return "troop_infantry"

func _resolve_left_troop_rail_status_icon_id(payload: Dictionary, status_label: String, subtitle: String, is_enabled: bool) -> String:
	if not is_enabled:
		return "status_locked"
	var normalized := ("%s %s %s" % [status_label, subtitle, str(payload.get("statusText", ""))]).strip_edges()
	if normalized.contains("返回") or normalized.contains("回城") or normalized.contains("撤"):
		return "status_returning"
	if normalized.contains("行军") or normalized.contains("出征") or normalized.contains("移动"):
		return "status_marching"
	if normalized.contains("驻守") or normalized.contains("守"):
		return "status_garrison"
	if normalized.contains("征兵") or normalized.contains("募兵"):
		return "status_recruiting"
	if normalized.contains("治疗") or normalized.contains("恢复") or normalized.contains("伤"):
		return "status_healing"
	return "status_idle"

func _resolve_left_troop_rail_strength_fill_color(ratio: float, is_enabled: bool, status_icon_id: String) -> Color:
	if not is_enabled:
		return Color(0.46, 0.43, 0.37, 0.58)
	if ratio < 0.28:
		return Color(0.68, 0.44, 0.18, 0.96)
	if ratio < 0.56:
		return Color(0.78, 0.58, 0.24, 0.96)
	if status_icon_id == "status_marching" or status_icon_id == "status_returning":
		return Color(0.86, 0.62, 0.24, 0.98)
	return Color(0.50, 0.64, 0.32, 0.98)

func _resolve_left_troop_rail_slot_index(slot_label: String) -> int:
	var slot_labels := ["一队", "二队", "三队", "四队", "五队"]
	var index := slot_labels.find(slot_label)
	return maxi(index, 0)

func _apply_left_troop_rail_icon(texture_rect: TextureRect, icon_id: String, icon_size: Vector2, visible_when_empty: bool) -> void:
	if texture_rect == null:
		return
	texture_rect.custom_minimum_size = icon_size
	texture_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	texture_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	var texture := _load_left_troop_rail_icon(icon_id)
	texture_rect.texture = texture
	texture_rect.visible = texture != null and visible_when_empty
	texture_rect.modulate = Color(1.0, 1.0, 1.0, 0.96 if visible_when_empty else 0.0)
	texture_rect.tooltip_text = icon_id

func _clear_left_troop_rail_icon(texture_rect: TextureRect) -> void:
	if texture_rect == null:
		return
	texture_rect.texture = null
	texture_rect.visible = false
	texture_rect.modulate = Color(1.0, 1.0, 1.0, 0.0)
	texture_rect.tooltip_text = ""

func _resolve_left_troop_rail_portrait_asset_key(payload: Dictionary, slot_label: String, is_enabled: bool) -> String:
	if not is_enabled:
		return ""
	for key in ["portraitAssetKey", "portrait_asset_key"]:
		var direct_key := str(payload.get(key, "")).strip_edges()
		if direct_key != "":
			return direct_key
	var hero_variant: Variant = payload.get("hero", {})
	if hero_variant is Dictionary:
		var hero := hero_variant as Dictionary
		for key in ["portraitAssetKey", "portrait_asset_key"]:
			var hero_key := str(hero.get(key, "")).strip_edges()
			if hero_key != "":
				return hero_key
	var slot_index := _resolve_left_troop_rail_slot_index(slot_label)
	if slot_index >= 0 and slot_index < LEFT_TROOP_RAIL_FALLBACK_PORTRAIT_KEYS.size():
		return str(LEFT_TROOP_RAIL_FALLBACK_PORTRAIT_KEYS[slot_index])
	return str(LEFT_TROOP_RAIL_FALLBACK_PORTRAIT_KEYS[0])

func _resolve_left_troop_rail_portrait_texture(payload: Dictionary, portrait_asset_key: String, is_enabled: bool) -> Texture2D:
	if not is_enabled:
		return null
	var portrait_payload := payload.duplicate(true)
	if portrait_asset_key != "":
		portrait_payload["portraitAssetKey"] = portrait_asset_key
	var texture := PortraitAssetRegistryScript.portrait_texture(portrait_payload)
	if texture != null:
		return texture
	if portrait_asset_key != "":
		return PortraitAssetRegistryScript.portrait_texture({"portraitAssetKey": portrait_asset_key})
	return null

func _load_left_troop_rail_icon(icon_id: String) -> Texture2D:
	var path := _resolve_left_troop_rail_icon_path(icon_id)
	if path == "":
		return null
	return _load_ui_texture(path)

func _load_ui_texture(path: String) -> Texture2D:
	if path == "":
		return null
	if _ui_texture_cache.has(path):
		return _ui_texture_cache.get(path, null) as Texture2D
	var texture: Texture2D = null
	if ResourceLoader.exists(path) and _can_load_texture_resource_without_import_cache_error(path):
		var loaded: Resource = load(path)
		if loaded is Texture2D:
			texture = loaded as Texture2D
	if texture == null and (path.to_lower().ends_with(".png") or path.to_lower().ends_with(".svg")):
		var image_path := path
		if path.begins_with("res://"):
			image_path = ProjectSettings.globalize_path(path)
		var image := Image.new()
		if image.load(image_path) == OK:
			texture = ImageTexture.create_from_image(image)
	_ui_texture_cache[path] = texture
	return texture

func _load_left_troop_rail_icon_legacy(icon_id: String) -> Texture2D:
	var path := _resolve_left_troop_rail_icon_path(icon_id)
	if path == "":
		return null
	if _left_troop_rail_icon_cache.has(path):
		return _left_troop_rail_icon_cache.get(path, null) as Texture2D
	var texture: Texture2D = null
	if ResourceLoader.exists(path) and _can_load_texture_resource_without_import_cache_error(path):
		var loaded: Resource = load(path)
		if loaded is Texture2D:
			texture = loaded as Texture2D
	if texture == null and path.to_lower().ends_with(".png"):
		var image_path := path
		if path.begins_with("res://"):
			image_path = ProjectSettings.globalize_path(path)
		var image := Image.new()
		if image.load(image_path) == OK:
			texture = ImageTexture.create_from_image(image)
	_left_troop_rail_icon_cache[path] = texture
	return texture

func _resolve_left_troop_rail_icon_path(icon_id: String) -> String:
	return str(LEFT_TROOP_RAIL_ICON_PATHS.get(icon_id, ""))

func _apply_utility_row_style() -> void:
	for button in [_mail_button, _activity_button, _help_button]:
		var utility_button := button as Button
		if utility_button == null:
			continue
		_apply_button_chrome_profile(utility_button, _resolve_utility_button_chrome_profile())

func _refresh_top_strip_chrome() -> void:
	if _top_strip != null:
		_top_strip.add_theme_stylebox_override("panel", _build_button_stylebox(
			MAINLINE_TOP_PAPER_BG,
			MAINLINE_TOP_PAPER_BORDER,
			4,
			1,
			0,
			0,
			0,
			0
		))
	if _top_identity_panel != null:
		_top_identity_panel.add_theme_stylebox_override("panel", _build_button_stylebox(Color(0.96, 0.93, 0.84, 0.82), Color(0.62, 0.45, 0.24, 0.48), 4, 1, 10, 10, 4, 4))
	for label_variant in [_profile_badge, _resource_strip]:
		var label := label_variant as Label
		if label == null:
			continue
		var target_font_size := 17 if label == _profile_badge else 14
		label.add_theme_font_size_override("font_size", target_font_size)
		label.add_theme_color_override("font_color", MAINLINE_TOP_PAPER_TEXT)
		label.add_theme_color_override("font_shadow_color", Color(1.0, 0.96, 0.86, 0.45))
		label.add_theme_constant_override("shadow_offset_x", 0)
		label.add_theme_constant_override("shadow_offset_y", 1)
	for button_variant in [_mode_toggle_button, _jade_currency_badge, _copper_currency_badge]:
		var button := button_variant as Button
		if button == null:
			continue
		_apply_top_strip_paper_button_style(button)
	if _premium_currency_row != null:
		_premium_currency_row.add_theme_constant_override("separation", 8)

func _apply_top_strip_paper_button_style(button: Button) -> void:
	var normal_style := _build_button_stylebox(Color(0.93, 0.89, 0.78, 0.88), Color(0.61, 0.43, 0.24, 0.62), 4, 1, 8, 8, 3, 3)
	var hover_style := _build_button_stylebox(Color(0.98, 0.94, 0.84, 0.94), Color(0.70, 0.50, 0.27, 0.78), 4, 1, 8, 8, 3, 3)
	var pressed_style := _build_button_stylebox(Color(0.82, 0.75, 0.62, 0.96), Color(0.52, 0.36, 0.20, 0.82), 4, 1, 8, 8, 3, 3)
	button.flat = false
	button.add_theme_stylebox_override("normal", normal_style)
	button.add_theme_stylebox_override("hover", hover_style)
	button.add_theme_stylebox_override("pressed", pressed_style)
	button.add_theme_stylebox_override("focus", hover_style)
	button.add_theme_stylebox_override("disabled", normal_style.duplicate())
	button.add_theme_color_override("font_color", MAINLINE_TOP_PAPER_TEXT)
	button.add_theme_color_override("font_hover_color", Color(0.13, 0.22, 0.14, 0.98))
	button.add_theme_color_override("font_pressed_color", Color(0.14, 0.10, 0.06, 0.98))
	button.add_theme_color_override("font_disabled_color", Color(0.42, 0.36, 0.28, 0.70))
	button.add_theme_font_size_override("font_size", 15 if button == _mode_toggle_button else 13)

func _refresh_center_stage_chrome() -> void:
	if _center_stage == null:
		return
	_center_stage.add_theme_stylebox_override("panel", _build_stylebox_from_chrome_profile(_resolve_center_stage_chrome_profile()))

func _ensure_city_grid_debug_preview() -> void:
	if _city_grid_debug_preview != null:
		return
	if _stage_column == null:
		return
	_city_grid_debug_preview = Control.new()
	_city_grid_debug_preview.name = "CityGridDebugPreview"
	_city_grid_debug_preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_city_grid_debug_preview.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_city_grid_debug_preview.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_city_grid_debug_preview.clip_contents = false
	_stage_column.add_child(_city_grid_debug_preview)
	if _city_entry_grid != null and _city_entry_grid.get_parent() == _stage_column:
		_stage_column.move_child(_city_grid_debug_preview, _city_entry_grid.get_index())
	_city_grid_foundation_texture = TextureRect.new()
	_city_grid_foundation_texture.name = "MainCityFoundationTexture"
	_city_grid_foundation_texture.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_city_grid_foundation_texture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_city_grid_foundation_texture.stretch_mode = TextureRect.STRETCH_SCALE
	_city_grid_foundation_texture.visible = false
	_city_grid_foundation_texture.z_index = 0
	_city_grid_debug_preview.add_child(_city_grid_foundation_texture)
	_city_grid_wall_ring_texture = TextureRect.new()
	_city_grid_wall_ring_texture.name = "CityWallRingTexture"
	_city_grid_wall_ring_texture.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_city_grid_wall_ring_texture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_city_grid_wall_ring_texture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_city_grid_wall_ring_texture.visible = false
	_city_grid_wall_ring_texture.z_index = 0
	_city_grid_debug_preview.add_child(_city_grid_wall_ring_texture)

func _refresh_city_grid_debug_preview() -> bool:
	_ensure_city_grid_debug_preview()
	if _city_grid_debug_preview == null:
		return false
	var profile := _resolve_city_grid_profile()
	if profile.is_empty():
		_city_grid_debug_preview.visible = false
		return false
	var visual_grid := profile.get("visual_grid", {}) as Dictionary
	var projection := _resolve_city_grid_projection(profile)
	var columns: int = maxi(1, int(visual_grid.get("columns", 5)))
	var rows: int = maxi(1, int(visual_grid.get("rows", 5)))
	var cell_size := _resolve_city_grid_debug_cell_size(profile)
	var preview_size := _resolve_city_grid_debug_preview_size(profile, projection, columns, rows, cell_size)
	_city_grid_debug_preview.custom_minimum_size = preview_size
	_city_grid_debug_preview.size = preview_size
	var cell_count: int = columns * rows
	while _city_grid_debug_cells.size() < cell_count:
		var cell := _create_city_grid_debug_cell()
		_city_grid_debug_cells.append(cell)
		_city_grid_debug_preview.add_child(cell)
	var slot_map := _build_city_grid_debug_slot_map(profile, columns, rows)
	var asset_slots := _resolve_city_grid_asset_slots(profile)
	_apply_city_grid_layer_texture(_city_grid_foundation_texture, profile, asset_slots, "foundation", preview_size)
	_apply_city_grid_wall_ring(profile, asset_slots, preview_size)
	var show_debug_labels := bool(profile.get("debug_labels_enabled_by_default", false))
	for index in range(_city_grid_debug_cells.size()):
		var cell := _city_grid_debug_cells[index] as PanelContainer
		if cell == null:
			continue
		var is_active_cell: bool = index < cell_count
		cell.visible = is_active_cell
		if not is_active_cell:
			continue
		cell.custom_minimum_size = cell_size
		cell.size = cell_size
		var x: int = index % columns
		var y: int = int(index / columns)
		var key := _city_grid_key_from_xy(x, y)
		var slot := slot_map.get(key, {}) as Dictionary
		var slot_kind := str(slot.get("slot_kind", "breathing"))
		var grid := Vector2i(x, y)
		cell.position = _project_city_grid_position(profile, grid, preview_size, cell_size, 0.0, "center")
		cell.z_index = _resolve_city_grid_z_index(projection, grid, slot_kind)
		_apply_city_grid_debug_cell(cell, slot, asset_slots, x, y, columns, rows, show_debug_labels)
	return true

func _create_city_grid_debug_cell() -> PanelContainer:
	var cell := PanelContainer.new()
	cell.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cell.custom_minimum_size = Vector2(CITY_GRID_DEBUG_CELL_WIDTH, CITY_GRID_DEBUG_CELL_HEIGHT)
	cell.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	cell.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var content := Control.new()
	content.name = "CellContent"
	content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	cell.add_child(content)
	var asset_texture := TextureRect.new()
	asset_texture.name = "AssetTexture"
	asset_texture.mouse_filter = Control.MOUSE_FILTER_IGNORE
	asset_texture.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	asset_texture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	asset_texture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	asset_texture.visible = false
	content.add_child(asset_texture)
	var label := Label.new()
	label.name = "CellLabel"
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 7)
	content.add_child(label)
	return cell

func _resolve_city_grid_debug_cell_size(profile: Dictionary) -> Vector2:
	var visual_grid := profile.get("visual_grid", {}) as Dictionary
	return _city_grid_profile_vector2(
		visual_grid.get("cell_size", Vector2(CITY_GRID_DEBUG_CELL_WIDTH, CITY_GRID_DEBUG_CELL_HEIGHT)),
		Vector2(CITY_GRID_DEBUG_CELL_WIDTH, CITY_GRID_DEBUG_CELL_HEIGHT)
	)

func _resolve_city_grid_debug_preview_size(profile: Dictionary, projection: Dictionary, columns: int, rows: int, cell_size: Vector2) -> Vector2:
	var visual_grid := profile.get("visual_grid", {}) as Dictionary
	var tile_width := float(projection.get("tile_width", 56.0))
	var tile_height := float(projection.get("tile_height", 28.0))
	var fallback_step := Vector2(tile_width * 0.5, tile_height * 0.5)
	var fallback_size := Vector2(
		maxi(int(round((columns + rows - 2) * fallback_step.x + cell_size.x)), 1),
		maxi(int(round((columns + rows - 2) * fallback_step.y + cell_size.y)), 1)
	)
	return _city_grid_profile_vector2(visual_grid.get("preview_size", fallback_size), fallback_size)

func _resolve_city_grid_projection(profile: Dictionary) -> Dictionary:
	var visual_grid := profile.get("visual_grid", {}) as Dictionary
	var legacy_projection := visual_grid.get("projection", {}) as Dictionary
	var projection := profile.get("city_grid_projection", {}) as Dictionary
	var resolved := projection.duplicate(true)
	if resolved.is_empty() and not legacy_projection.is_empty():
		resolved["type"] = legacy_projection.get("type", "isometric_2_to_1")
		var legacy_step := _city_grid_profile_vector2(legacy_projection.get("cell_step", Vector2(28, 14)), Vector2(28, 14))
		resolved["tile_width"] = legacy_step.x * 2.0
		resolved["tile_height"] = legacy_step.y * 2.0
		resolved["origin"] = legacy_projection.get("origin", Vector2.ZERO)
	if not resolved.has("type"):
		resolved["type"] = "isometric_2_to_1"
	if not resolved.has("tile_width"):
		resolved["tile_width"] = 56.0
	if not resolved.has("tile_height"):
		resolved["tile_height"] = 28.0
	if not resolved.has("origin"):
		resolved["origin"] = Vector2.ZERO
	if not resolved.has("elevation_scale"):
		resolved["elevation_scale"] = 1.0
	if not resolved.has("anchor_rule"):
		resolved["anchor_rule"] = "center"
	if not resolved.has("z_sort_rule"):
		resolved["z_sort_rule"] = {
			"type": "grid_sum_then_x",
			"base_z_index": 10,
			"sort_step": 10,
			"x_step": 1,
			"layer_offsets": {},
			"flat_layers": [],
		}
	return resolved

func _project_city_grid_position(
	profile: Dictionary,
	grid: Vector2i,
	preview_size: Vector2,
	target_size: Vector2,
	elevation: float = 0.0,
	anchor_rule_override: String = ""
) -> Vector2:
	var projection := _resolve_city_grid_projection(profile)
	var tile_width := float(projection.get("tile_width", 56.0))
	var tile_height := float(projection.get("tile_height", 28.0))
	var elevation_scale := float(projection.get("elevation_scale", 1.0))
	var fallback_origin := Vector2(preview_size.x * 0.5, target_size.y * 1.5)
	var origin := _city_grid_profile_vector2(projection.get("origin", fallback_origin), fallback_origin)
	var center := Vector2(
		float(grid.x - grid.y) * tile_width * 0.5,
		float(grid.x + grid.y) * tile_height * 0.5 - elevation * elevation_scale
	) + origin
	var anchor_rule := anchor_rule_override.strip_edges()
	if anchor_rule == "":
		anchor_rule = str(projection.get("anchor_rule", "center")).strip_edges()
	match anchor_rule:
		"bottom_center", "bottom-center footprint center":
			return center - Vector2(target_size.x * 0.5, target_size.y)
		"top_left":
			return center
		_:
			return center - target_size * 0.5

func _resolve_city_grid_z_index(projection: Dictionary, grid: Vector2i, slot_kind: String) -> int:
	var rule := projection.get("z_sort_rule", {}) as Dictionary
	var rule_type := str(rule.get("type", "grid_sum_then_x"))
	var layer_offsets := rule.get("layer_offsets", {}) as Dictionary
	var flat_layers := rule.get("flat_layers", []) as Array
	var layer_offset := int(layer_offsets.get(slot_kind, 0))
	if flat_layers.has(slot_kind):
		return int(rule.get("base_z_index", 10)) + layer_offset
	match rule_type:
		"grid_sum_then_x":
			var base_z := int(rule.get("base_z_index", 10))
			var sort_step := int(rule.get("sort_step", 10))
			var x_step := int(rule.get("x_step", 1))
			return base_z + ((grid.x + grid.y) * sort_step) + (grid.x * x_step) + layer_offset
		_:
			return int(rule.get("base_z_index", 10)) + layer_offset

func _apply_city_grid_debug_cell(
	cell: PanelContainer,
	slot: Dictionary,
	asset_slots: Dictionary,
	x: int,
	y: int,
	columns: int,
	rows: int,
	show_debug_labels: bool
) -> void:
	var asset_slot := _resolve_city_grid_asset_slot(slot, asset_slots)
	var has_texture := _city_grid_asset_slot_has_texture(asset_slot)
	cell.add_theme_stylebox_override("panel", _resolve_city_grid_debug_cell_style(slot, x, y, columns, rows, has_texture))
	cell.tooltip_text = _build_city_grid_debug_tooltip(slot, asset_slot, x, y)
	_apply_city_grid_asset_slot_texture(cell, asset_slot)
	var label := cell.get_node_or_null("CellContent/CellLabel") as Label
	if label == null:
		return
	label.text = _resolve_city_grid_debug_token(slot, asset_slot) if show_debug_labels else ""
	label.add_theme_color_override("font_color", Color(0.86, 0.72, 0.46, 0.88))

func _build_city_grid_debug_slot_map(profile: Dictionary, columns: int, rows: int) -> Dictionary:
	var slot_map := {}
	var visual_shell := profile.get("visual_shell", {}) as Dictionary
	var perimeter := visual_shell.get("perimeter", {}) as Dictionary
	if not perimeter.is_empty():
		for y in range(rows):
			for x in range(columns):
				if not _is_city_grid_edge_cell(x, y, columns, rows):
					continue
				var key := _city_grid_key_from_xy(x, y)
				var slot := perimeter.duplicate(true)
				slot["grid"] = Vector2i(x, y)
				slot_map[key] = slot
	_append_city_grid_slot_map(slot_map, visual_shell.get("breathing_slots", []), "breathing")
	_append_city_grid_slot_map(slot_map, profile.get("active_core_slots", []), "active_building")
	_append_city_grid_slot_map(slot_map, visual_shell.get("corner_slots", []), "corner_tower")
	_append_city_grid_slot_map(slot_map, visual_shell.get("gate_slots", []), "city_gate")
	_append_city_grid_slot_map(slot_map, visual_shell.get("reserved_slots", []), "reserved_plot")
	return slot_map

func _append_city_grid_slot_map(slot_map: Dictionary, slots_variant: Variant, fallback_kind: String) -> void:
	if not (slots_variant is Array):
		return
	for slot_variant in slots_variant:
		var slot := {}
		if slot_variant is Dictionary:
			slot = (slot_variant as Dictionary).duplicate(true)
		else:
			slot = {
				"grid": slot_variant,
				"slot_kind": fallback_kind,
			}
		var key := _city_grid_key_from_variant(slot.get("grid", Vector2i(-1, -1)))
		if key == "":
			continue
		if fallback_kind == "breathing" and slot_map.has(key):
			continue
		if not slot.has("slot_kind"):
			slot["slot_kind"] = fallback_kind
		slot_map[key] = slot

func _resolve_city_grid_asset_slots(profile: Dictionary) -> Dictionary:
	var asset_slots_variant: Variant = profile.get("asset_slots", {})
	if asset_slots_variant is Dictionary:
		return (asset_slots_variant as Dictionary).duplicate(true)
	return {}

func _resolve_city_grid_asset_slot(slot: Dictionary, asset_slots: Dictionary) -> Dictionary:
	if str(slot.get("slot_kind", "")) == "continuous_city_wall_ring":
		return {}
	var asset_id := str(slot.get("asset_id", "")).strip_edges()
	if asset_id != "" and asset_slots.has(asset_id):
		var asset_slot_variant: Variant = asset_slots.get(asset_id, {})
		if asset_slot_variant is Dictionary:
			return (asset_slot_variant as Dictionary).duplicate(true)
	return {}

func _city_grid_asset_slot_has_texture(asset_slot: Dictionary) -> bool:
	if asset_slot.get("texture", null) is Texture2D:
		return true
	return str(asset_slot.get("texture_path", "")).strip_edges() != ""

func _apply_city_grid_wall_ring(profile: Dictionary, asset_slots: Dictionary, preview_size: Vector2) -> void:
	_apply_city_grid_layer_texture(_city_grid_wall_ring_texture, profile, asset_slots, "perimeter", preview_size)

func _apply_city_grid_layer_texture(texture_rect: TextureRect, profile: Dictionary, asset_slots: Dictionary, visual_shell_key: String, preview_size: Vector2) -> void:
	if texture_rect == null:
		return
	var visual_shell := profile.get("visual_shell", {}) as Dictionary
	var layer := visual_shell.get(visual_shell_key, {}) as Dictionary
	if layer.is_empty():
		texture_rect.visible = false
		texture_rect.texture = null
		return
	var asset_id := str(layer.get("asset_id", "")).strip_edges()
	var asset_slot_variant: Variant = asset_slots.get(asset_id, {})
	var asset_slot: Dictionary = asset_slot_variant as Dictionary if asset_slot_variant is Dictionary else {}
	var texture := _resolve_city_grid_asset_slot_texture(asset_slot)
	texture_rect.texture = texture
	texture_rect.visible = texture != null
	if texture == null:
		return
	var fallback_size := _city_grid_profile_vector2(layer.get("display_size", preview_size), preview_size)
	var display_size := _city_grid_profile_vector2(asset_slot.get("display_size", fallback_size), fallback_size)
	var fallback_offset := _city_grid_profile_vector2(layer.get("display_offset", Vector2.ZERO), Vector2.ZERO)
	var display_offset := _city_grid_profile_vector2(asset_slot.get("display_offset", fallback_offset), fallback_offset)
	var layer_grid := _city_grid_vector2i_from_variant(layer.get("grid", _resolve_city_grid_default_layer_grid(profile)))
	var slot_kind := str(asset_slot.get("slot_kind", layer.get("slot_kind", visual_shell_key))).strip_edges()
	var elevation := float(asset_slot.get("elevation", layer.get("elevation", 0.0)))
	var anchor_rule := str(asset_slot.get("anchor", layer.get("anchor", "center"))).strip_edges()
	texture_rect.custom_minimum_size = display_size
	texture_rect.size = display_size
	texture_rect.position = _project_city_grid_position(profile, layer_grid, preview_size, display_size, elevation, anchor_rule) + display_offset
	texture_rect.modulate = asset_slot.get("modulate", Color(1.0, 1.0, 1.0, 1.0))
	texture_rect.expand_mode = int(asset_slot.get("expand_mode", TextureRect.EXPAND_IGNORE_SIZE))
	texture_rect.stretch_mode = int(asset_slot.get("stretch_mode", TextureRect.STRETCH_SCALE))
	texture_rect.z_index = _resolve_city_grid_z_index(_resolve_city_grid_projection(profile), layer_grid, slot_kind)

func _apply_city_grid_asset_slot_texture(cell: PanelContainer, asset_slot: Dictionary) -> void:
	var texture_rect := cell.get_node_or_null("CellContent/AssetTexture") as TextureRect
	if texture_rect == null:
		return
	var texture := _resolve_city_grid_asset_slot_texture(asset_slot)
	texture_rect.texture = texture
	texture_rect.visible = texture != null
	if texture == null:
		return
	_apply_city_grid_asset_texture_anchor(cell, texture_rect, asset_slot)
	texture_rect.modulate = asset_slot.get("modulate", Color(1.0, 1.0, 1.0, 1.0))
	texture_rect.expand_mode = int(asset_slot.get("expand_mode", TextureRect.EXPAND_IGNORE_SIZE))
	texture_rect.stretch_mode = int(asset_slot.get("stretch_mode", TextureRect.STRETCH_KEEP_ASPECT_CENTERED))

func _resolve_city_grid_asset_slot_texture(asset_slot: Dictionary) -> Texture2D:
	var texture := asset_slot.get("texture", null) as Texture2D
	if texture != null:
		return texture
	var texture_path := str(asset_slot.get("texture_path", "")).strip_edges()
	if texture_path == "":
		return null
	if ResourceLoader.exists(texture_path) and _can_load_texture_resource_without_import_cache_error(texture_path):
		var loaded_resource: Resource = load(texture_path)
		if loaded_resource is Texture2D:
			return loaded_resource as Texture2D
	if texture_path.to_lower().ends_with(".png"):
		var image_path := texture_path
		if texture_path.begins_with("res://"):
			image_path = ProjectSettings.globalize_path(texture_path)
		var image := Image.new()
		if image.load(image_path) == OK:
			return ImageTexture.create_from_image(image)
	return null

func _apply_city_grid_asset_texture_anchor(cell: PanelContainer, texture_rect: TextureRect, asset_slot: Dictionary) -> void:
	var display_size := _city_grid_profile_vector2(
		asset_slot.get("display_size", cell.custom_minimum_size),
		cell.custom_minimum_size
	)
	var display_offset := _city_grid_profile_vector2(asset_slot.get("display_offset", Vector2.ZERO), Vector2.ZERO)
	var anchor := str(asset_slot.get("anchor", "cell_fill")).strip_edges()
	texture_rect.set_anchors_preset(Control.PRESET_TOP_LEFT)
	texture_rect.custom_minimum_size = display_size
	texture_rect.size = display_size
	match anchor:
		"bottom_center", "bottom-center footprint center":
			texture_rect.position = Vector2(
				(cell.custom_minimum_size.x - display_size.x) * 0.5,
				cell.custom_minimum_size.y - display_size.y
			) + display_offset
		"center":
			texture_rect.position = (cell.custom_minimum_size - display_size) * 0.5 + display_offset
		_:
			texture_rect.position = display_offset

func _city_grid_profile_vector2(value: Variant, fallback: Vector2) -> Vector2:
	if value is Vector2:
		return value as Vector2
	if value is Vector2i:
		var int_value := value as Vector2i
		return Vector2(int_value.x, int_value.y)
	if value is Array:
		var value_array := value as Array
		if value_array.size() >= 2:
			return Vector2(float(value_array[0]), float(value_array[1]))
	if value is Dictionary:
		var value_dict := value as Dictionary
		return Vector2(float(value_dict.get("x", fallback.x)), float(value_dict.get("y", fallback.y)))
	return fallback

func _resolve_city_grid_debug_cell_style(slot: Dictionary, x: int, y: int, columns: int, rows: int, has_texture: bool) -> StyleBoxFlat:
	var slot_kind := str(slot.get("slot_kind", "breathing"))
	var building_id := str(slot.get("building_id", ""))
	if has_texture or slot_kind == "continuous_city_wall_ring" or slot_kind == "breathing":
		return _build_button_stylebox(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 0, 0, 0, 0, 0, 0)
	var bg_color := Color(0.05, 0.04, 0.03, 0.20)
	var border_color := Color(0.26, 0.19, 0.11, 0.36)
	var border_width := 1
	if _is_city_grid_edge_cell(x, y, columns, rows):
		bg_color = Color(0.08, 0.06, 0.035, 0.32)
		border_color = Color(0.40, 0.28, 0.14, 0.45)
	match slot_kind:
		"active_building":
			bg_color = Color(0.28, 0.19, 0.08, 0.48)
			border_color = Color(0.72, 0.52, 0.24, 0.62)
		"corner_tower":
			bg_color = Color(0.19, 0.12, 0.055, 0.54)
			border_color = Color(0.74, 0.50, 0.22, 0.70)
		"city_gate":
			bg_color = Color(0.24, 0.15, 0.06, 0.56)
			border_color = Color(0.84, 0.57, 0.24, 0.76)
		"reserved_plot":
			bg_color = Color(0.05, 0.08, 0.065, 0.32)
			border_color = Color(0.28, 0.40, 0.34, 0.50)
		"breathing":
			bg_color = Color(0.0, 0.0, 0.0, 0.08)
			border_color = Color(0.20, 0.15, 0.09, 0.22)
	if building_id == "city_hall":
		bg_color = Color(0.38, 0.23, 0.08, 0.66)
		border_color = Color(0.95, 0.69, 0.30, 0.86)
		border_width = 2
	return _build_button_stylebox(bg_color, border_color, 1, border_width, 0, 0, 0, 0)

func _resolve_city_grid_debug_token(slot: Dictionary, asset_slot: Dictionary) -> String:
	var placeholder_token := str(asset_slot.get("placeholder_token", "")).strip_edges()
	if placeholder_token != "":
		return placeholder_token.substr(0, 1)
	var slot_kind := str(slot.get("slot_kind", ""))
	var building_id := str(slot.get("building_id", ""))
	if building_id == "city_hall":
		return "府"
	match slot_kind:
		"active_building":
			return _first_non_empty_city_grid_label_char(slot, "筑")
		"corner_tower":
			return "角"
		"city_gate":
			return "门"
		"reserved_plot":
			return "预"
		"continuous_city_wall_ring":
			return "墙"
		_:
			return ""

func _first_non_empty_city_grid_label_char(slot: Dictionary, fallback: String) -> String:
	var label := str(slot.get("debug_label", slot.get("display_name_zh", ""))).strip_edges()
	if label == "":
		return fallback
	return label.substr(0, 1)

func _build_city_grid_debug_tooltip(slot: Dictionary, asset_slot: Dictionary, x: int, y: int) -> String:
	if slot.is_empty():
		return "主城占位 [%d,%d]" % [x, y]
	var label := str(slot.get("debug_label", slot.get("display_name_zh", "主城占位"))).strip_edges()
	var slot_kind := str(slot.get("slot_kind", "unknown"))
	var asset_id := str(slot.get("asset_id", "unbound_asset"))
	var state := str(slot.get("state", "debug"))
	var asset_slot_id := str(asset_slot.get("asset_id", asset_id)).strip_edges()
	var texture_path := str(asset_slot.get("texture_path", "")).strip_edges()
	return "%s [%d,%d]\nkind=%s\nasset=%s\nslot=%s\ntexture_path=%s\nstate=%s" % [label, x, y, slot_kind, asset_id, asset_slot_id, texture_path, state]

func _is_city_grid_edge_cell(x: int, y: int, columns: int, rows: int) -> bool:
	return x == 0 or y == 0 or x == columns - 1 or y == rows - 1

func _city_grid_key_from_xy(x: int, y: int) -> String:
	return "%d,%d" % [x, y]

func _city_grid_key_from_variant(grid_variant: Variant) -> String:
	if grid_variant is Vector2i:
		var grid := grid_variant as Vector2i
		return _city_grid_key_from_xy(grid.x, grid.y)
	if grid_variant is Vector2:
		var grid_float := grid_variant as Vector2
		return _city_grid_key_from_xy(int(grid_float.x), int(grid_float.y))
	if grid_variant is Array:
		var grid_array := grid_variant as Array
		if grid_array.size() >= 2:
			return _city_grid_key_from_xy(int(grid_array[0]), int(grid_array[1]))
	return ""

func _city_grid_vector2i_from_variant(grid_variant: Variant) -> Vector2i:
	if grid_variant is Vector2i:
		return grid_variant as Vector2i
	if grid_variant is Vector2:
		var grid_float := grid_variant as Vector2
		return Vector2i(int(grid_float.x), int(grid_float.y))
	if grid_variant is Array:
		var grid_array := grid_variant as Array
		if grid_array.size() >= 2:
			return Vector2i(int(grid_array[0]), int(grid_array[1]))
	if grid_variant is Dictionary:
		var grid_dict := grid_variant as Dictionary
		return Vector2i(int(grid_dict.get("x", 0)), int(grid_dict.get("y", 0)))
	return Vector2i.ZERO

func _resolve_city_grid_default_layer_grid(profile: Dictionary) -> Vector2i:
	var visual_grid := profile.get("visual_grid", {}) as Dictionary
	var columns: int = maxi(1, int(visual_grid.get("columns", 5)))
	var rows: int = maxi(1, int(visual_grid.get("rows", 5)))
	return Vector2i(int(columns / 2), int(rows / 2))

func _refresh_backdrop_chrome() -> void:
	if _backdrop == null:
		return
	var profile := _resolve_backdrop_chrome_profile()
	_backdrop.color = profile.get("bg_color", _backdrop.color)

func _refresh_bottom_nav_chrome() -> void:
	if _bottom_nav_panel == null:
		return
	_bottom_nav_panel.add_theme_stylebox_override("panel", _build_stylebox_from_chrome_profile(_resolve_bottom_nav_chrome_profile()))
	_bottom_nav_panel.set_meta("shell_command_chrome_token", SHELL_COMMAND_CHROME_TOKEN)

func _refresh_right_context_chrome() -> void:
	if _right_context_panel == null:
		return
	_right_context_panel.add_theme_stylebox_override("panel", _build_stylebox_from_chrome_profile(_resolve_right_context_chrome_profile()))
	var slot_profile := _resolve_right_context_slot_chrome_profile()
	for slot_panel_variant in _context_slot_panels:
		var slot_panel := slot_panel_variant as PanelContainer
		if slot_panel == null:
			continue
		slot_panel.add_theme_stylebox_override("panel", _build_stylebox_from_chrome_profile(slot_profile))

func _refresh_chrome_profile() -> void:
	_apply_typography_profile()
	_apply_shell_layout_geometry_profile()
	_refresh_city_grid_debug_preview()
	_apply_left_rail_density_style()
	_apply_utility_row_style()
	_refresh_top_strip_chrome()
	_refresh_backdrop_chrome()
	_refresh_bottom_nav_chrome()
	_refresh_right_context_chrome()
	_refresh_left_troop_rail_chrome()
	_refresh_center_stage_chrome()
	_refresh_city_action_button_states()
	_refresh_interior_summary_buttons()
	_refresh_under_construction_buttons()
	_refresh_right_context_visibility()
	set_troop_slots(_last_troop_slot_payloads)
	_apply_main_nav_layout_state()

func _normalize_chrome_profile_id(profile_id: String) -> String:
	return _get_chrome_profile_catalog().normalize_profile_id(profile_id)

func _get_chrome_profile_catalog():
	if chrome_profile_catalog != null and chrome_profile_catalog.has_method("normalize_profile_id"):
		return chrome_profile_catalog
	if _fallback_chrome_profile_catalog == null:
		_fallback_chrome_profile_catalog = NativeShellChromeProfileCatalogScript.new()
	return _fallback_chrome_profile_catalog

func _resolve_city_action_chrome_profile(is_selected: bool, surface_role: String) -> Dictionary:
	return _get_chrome_profile_catalog().resolve_city_action_profile(_chrome_profile_id, surface_role, is_selected)

func _resolve_left_rail_quick_link_chrome_profile() -> Dictionary:
	return _get_chrome_profile_catalog().resolve_left_rail_quick_link_profile(_chrome_profile_id)

func _resolve_left_rail_density_profile() -> Dictionary:
	return _get_chrome_profile_catalog().resolve_left_rail_density_profile(_chrome_profile_id)

func _resolve_default_button_fallback_profile() -> Dictionary:
	return _get_chrome_profile_catalog().resolve_default_button_fallback_profile(_chrome_profile_id)

func _resolve_shell_layout_profile() -> Dictionary:
	return _get_chrome_profile_catalog().resolve_shell_layout_profile(_chrome_profile_id)

func _resolve_city_grid_profile() -> Dictionary:
	return _get_chrome_profile_catalog().resolve_city_grid_profile(_chrome_profile_id)

func _resolve_typography_profile() -> Dictionary:
	return _get_chrome_profile_catalog().resolve_typography_profile(_chrome_profile_id)

func _resolve_copy_profile() -> Dictionary:
	return _get_chrome_profile_catalog().resolve_copy_profile(_chrome_profile_id)

func _resolve_backdrop_chrome_profile() -> Dictionary:
	return _get_chrome_profile_catalog().resolve_backdrop_profile(_chrome_profile_id)

func _resolve_bottom_nav_chrome_profile() -> Dictionary:
	return _get_chrome_profile_catalog().resolve_bottom_nav_profile(_chrome_profile_id)

func _resolve_task_icon_profile() -> Dictionary:
	return _get_chrome_profile_catalog().resolve_task_icon_profile(_chrome_profile_id)

func _resolve_button_icon_profile(slot_id: String) -> Dictionary:
	return _get_chrome_profile_catalog().resolve_button_icon_profile(_chrome_profile_id, slot_id)

func _resolve_troop_slot_chrome_profile(slot_index: int, is_disabled: bool, is_moving: bool) -> Dictionary:
	return _get_chrome_profile_catalog().resolve_troop_slot_profile(
		_chrome_profile_id,
		_resolve_troop_slot_archetype(slot_index),
		is_disabled,
		is_moving
	)

func _resolve_troop_slot_shell_profile() -> Dictionary:
	return _get_chrome_profile_catalog().resolve_troop_slot_shell_profile(_chrome_profile_id)

func _resolve_main_nav_button_shell_profile(is_selected: bool = false) -> Dictionary:
	return _get_chrome_profile_catalog().resolve_main_nav_button_shell_profile(_chrome_profile_id, is_selected)

func _resolve_main_nav_button_pressed_shell_profile(is_selected: bool = false) -> Dictionary:
	return _get_chrome_profile_catalog().resolve_main_nav_button_pressed_shell_profile(_chrome_profile_id, is_selected)

func _resolve_utility_button_chrome_profile() -> Dictionary:
	return _get_chrome_profile_catalog().resolve_utility_button_profile(_chrome_profile_id)

func _resolve_under_construction_chrome_profile(is_disabled: bool) -> Dictionary:
	return _get_chrome_profile_catalog().resolve_under_construction_profile(_chrome_profile_id, is_disabled)

func _resolve_center_stage_chrome_profile() -> Dictionary:
	return _get_chrome_profile_catalog().resolve_center_stage_profile(
		_chrome_profile_id,
		_current_mode == WORLD_MODE,
		_current_city_action != DEFAULT_CITY_ACTION
	)

func _resolve_right_context_chrome_profile() -> Dictionary:
	return _get_chrome_profile_catalog().resolve_right_context_profile(_chrome_profile_id)

func _resolve_right_context_slot_chrome_profile() -> Dictionary:
	return _get_chrome_profile_catalog().resolve_right_context_slot_profile(_chrome_profile_id)

func _apply_typography_profile() -> void:
	var typography_profile := _resolve_typography_profile()
	if typography_profile.is_empty():
		return
	_apply_label_font_size(_profile_badge, typography_profile, "profile_badge_font_size")
	_apply_label_font_size(_resource_strip, typography_profile, "resource_strip_font_size")
	_apply_button_font_size(_jade_currency_badge, typography_profile, "currency_badge_font_size")
	_apply_button_font_size(_copper_currency_badge, typography_profile, "currency_badge_font_size")
	_apply_label_font_size(_context_title, typography_profile, "right_context_title_font_size")
	_apply_label_font_size(_context_body, typography_profile, "right_context_body_font_size")
	for slot_label_variant in _context_slot_labels:
		_apply_label_font_size(slot_label_variant as Label, typography_profile, "right_context_slot_font_size")
	_apply_label_font_size(_mode_badge, typography_profile, "center_mode_badge_font_size")
	_apply_label_font_size(_stage_title, typography_profile, "center_stage_title_font_size")
	_apply_label_font_size(_stage_body, typography_profile, "center_stage_body_font_size")
	_apply_label_font_size(_city_focus, typography_profile, "center_city_focus_font_size")
	_apply_button_font_size(_interior_entry_button, typography_profile, "center_entry_button_font_size")
	_apply_button_font_size(_recruit_entry_button, typography_profile, "center_entry_button_font_size")
	_apply_button_font_size(_generals_entry_button, typography_profile, "center_entry_button_font_size")
	_apply_button_font_size(_alliance_entry_button, typography_profile, "center_entry_button_font_size")
	_apply_button_font_size(_ai_hub_entry_button, typography_profile, "center_entry_button_font_size")
	_apply_label_font_size(_entry_status, typography_profile, "center_entry_status_font_size")
	_apply_label_font_size(_mode_hint, typography_profile, "center_mode_hint_font_size")
	for button in [_mail_button, _activity_button, _help_button]:
		_apply_button_font_size(button as Button, typography_profile, "utility_button_font_size")
	for button in [_generals_button, _skill_library_button, _interior_button, _alliance_button, _ai_hub_button, _chat_button, _settings_button, _war_button, _ai_switch_button, _recruit_button, _bag_button, _main_nav_menu_button]:
		_apply_button_font_size(button as Button, typography_profile, "main_nav_button_font_size")
	_apply_label_font_size(_world_entry_hint, typography_profile, "world_entry_hint_font_size")

func _apply_shell_layout_geometry_profile() -> void:
	var layout_profile := _resolve_shell_layout_profile()
	if layout_profile.is_empty():
		return
	_apply_control_offsets(_top_strip, layout_profile, "top_strip")
	_apply_control_offsets(_left_rail_panel, layout_profile, "left_rail")
	_apply_control_offsets(_right_context_panel, layout_profile, "right_context")
	_apply_control_offsets(_center_stage, layout_profile, "center_stage")
	_apply_control_offsets(_bottom_nav_panel, layout_profile, "bottom_nav")
	_apply_margin_offsets(_top_margin_container, layout_profile, "top")
	_apply_box_separation(_top_row, layout_profile, "top_row_separation")
	_apply_box_separation(_top_actions_row, layout_profile, "top_actions_separation")
	_apply_box_separation(_premium_currency_row, layout_profile, "premium_currency_row_separation")
	_apply_margin_offsets(_right_margin_container, layout_profile, "right")
	_apply_box_separation(_right_column, layout_profile, "right_column_separation")
	_apply_box_separation(_context_slot_list, layout_profile, "right_context_slot_list_separation")
	_apply_margin_offsets(_stage_margin_container, layout_profile, "stage")
	_apply_box_separation(_stage_column, layout_profile, "stage_column_separation")
	_apply_grid_separation(_city_entry_grid, layout_profile)
	_apply_grid_separation(_city_grid_debug_preview, layout_profile)
	_apply_margin_offsets(_bottom_margin_container, layout_profile, "bottom")
	_apply_box_separation(_bottom_row, layout_profile, "bottom_row_separation")
	_apply_box_separation(_main_nav_column, layout_profile, "main_nav_separation")
	_apply_box_separation(_utility_row, layout_profile, "utility_row_separation")
	_apply_box_separation(_nav_buttons, layout_profile, "nav_buttons_separation")
	if _premium_currency_row != null:
		_premium_currency_row.custom_minimum_size = layout_profile.get("premium_currency_row_min_size", _premium_currency_row.custom_minimum_size)
	if _jade_currency_badge != null:
		_jade_currency_badge.custom_minimum_size = layout_profile.get("jade_currency_badge_min_size", _jade_currency_badge.custom_minimum_size)
	if _copper_currency_badge != null:
		_copper_currency_badge.custom_minimum_size = layout_profile.get("copper_currency_badge_min_size", _copper_currency_badge.custom_minimum_size)
	if _mode_toggle_button != null:
		_mode_toggle_button.custom_minimum_size = layout_profile.get("mode_toggle_button_min_size", _mode_toggle_button.custom_minimum_size)
	for button in [_interior_entry_button, _recruit_entry_button, _generals_entry_button, _alliance_entry_button, _ai_hub_entry_button]:
		var entry_button := button as Button
		if entry_button == null:
			continue
		entry_button.custom_minimum_size = layout_profile.get("city_entry_button_min_size", entry_button.custom_minimum_size)
	var utility_button_size_map := {
		_mail_button: "utility_mail_button_min_size",
		_activity_button: "utility_activity_button_min_size",
		_help_button: "utility_help_button_min_size",
	}
	for button_variant in utility_button_size_map.keys():
		var utility_button := button_variant as Button
		if utility_button == null:
			continue
		var layout_key := str(utility_button_size_map[button_variant])
		utility_button.custom_minimum_size = layout_profile.get(layout_key, utility_button.custom_minimum_size)
	for button in [_generals_button, _skill_library_button, _interior_button, _alliance_button, _ai_hub_button, _chat_button, _settings_button, _war_button, _ai_switch_button, _recruit_button, _bag_button]:
		var main_nav_button := button as Button
		if main_nav_button == null:
			continue
		main_nav_button.custom_minimum_size = layout_profile.get("main_nav_button_min_size", main_nav_button.custom_minimum_size)
	for button in [_war_button, _bag_button, _settings_button]:
		var under_construction_button := button as Button
		if under_construction_button == null:
			continue
		under_construction_button.custom_minimum_size = layout_profile.get("under_construction_button_min_size", under_construction_button.custom_minimum_size)
	if _context_body != null:
		_context_body.custom_minimum_size = Vector2(0, int(layout_profile.get("context_body_min_height", _context_body.custom_minimum_size.y)))
	for slot_panel_variant in _context_slot_panels:
		var slot_panel := slot_panel_variant as PanelContainer
		if slot_panel == null:
			continue
		slot_panel.custom_minimum_size = Vector2(0, int(layout_profile.get("context_slot_min_height", slot_panel.custom_minimum_size.y)))
	_apply_responsive_shell_layout_overrides(layout_profile)
	_refresh_troop_slot_scroll_container(layout_profile)
	_apply_main_nav_layout_state()

func _apply_responsive_shell_layout_overrides(layout_profile: Dictionary) -> void:
	var viewport_size := get_viewport_rect().size
	if viewport_size.x <= 0.0:
		return
	if _uses_mobile_shell_layout(viewport_size):
		_apply_mobile_shell_layout(viewport_size)
		return
	_apply_desktop_shell_density(layout_profile)

func _uses_mobile_shell_layout(viewport_size: Vector2) -> bool:
	if viewport_size.x <= MOBILE_SHELL_BREAKPOINT:
		return true
	return viewport_size.x <= MOBILE_LANDSCAPE_SHELL_MAX_WIDTH and viewport_size.y <= MOBILE_LANDSCAPE_SHELL_MAX_HEIGHT

func _apply_left_troop_rail_compact_mode(is_compact: bool) -> void:
	if _left_rail_panel != null:
		_left_rail_panel.set_meta("left_troop_rail_compact_mode", is_compact)
	for node_variant in [_task_header_row, _task_body, _task_hint, _city_state_title, _city_state_summary, _city_tech_summary, _troop_section_title, _troop_summary, _interior_quick_links]:
		var node := node_variant as Control
		if node != null:
			node.visible = false if is_compact else node.visible
	var card_size := LEFT_TROOP_RAIL_CARD_COMPACT_MIN_SIZE if is_compact else LEFT_TROOP_RAIL_CARD_MIN_SIZE
	for button_variant in _troop_slot_buttons:
		var button := button_variant as Button
		if button == null:
			continue
		button.custom_minimum_size = card_size
		var refs := _resolve_troop_slot_view(button)
		var root := refs.get("root") as MarginContainer
		if root != null:
			var vertical_margin := 3
			root.add_theme_constant_override("margin_top", vertical_margin)
			root.add_theme_constant_override("margin_bottom", vertical_margin)
		var portrait_panel := refs.get("portrait_panel") as PanelContainer
		if portrait_panel != null:
			portrait_panel.custom_minimum_size = Vector2(58.0, 0.0)
		button.set_meta("left_troop_rail_compact_mode", is_compact)

func _apply_desktop_shell_density(layout_profile: Dictionary) -> void:
	if _bottom_nav_panel != null:
		var viewport_size := get_viewport_rect().size
		var left_edge := float(layout_profile.get("bottom_nav_offset_left", _bottom_nav_panel.offset_left))
		var right_edge := maxf(
			float(layout_profile.get("bottom_nav_offset_right", _bottom_nav_panel.offset_right)),
			DESKTOP_BOTTOM_NAV_RIGHT
		)
		if viewport_size.x > DESKTOP_BOTTOM_NAV_RIGHT:
			right_edge = maxf(right_edge, viewport_size.x - maxf(left_edge, 16.0))
		_bottom_nav_panel.offset_right = maxf(
			right_edge,
			left_edge + DESKTOP_BOTTOM_NAV_RIGHT
		)
		_bottom_nav_panel.offset_top = maxf(
			float(layout_profile.get("bottom_nav_offset_top", _bottom_nav_panel.offset_top)),
			DESKTOP_BOTTOM_NAV_TOP
		)
	if _nav_buttons != null:
		_apply_main_nav_button_flow_separation(max(6, int(layout_profile.get("nav_buttons_separation", 4))), 4)
	if _main_nav_recruit_spacer != null and is_instance_valid(_main_nav_recruit_spacer):
		_resize_main_nav_recruit_spacer(DESKTOP_MAIN_NAV_BUTTON_SIZE.x, _resolve_main_nav_button_h_separation(), false)
	_apply_left_troop_rail_compact_mode(false)
	for button in _active_main_nav_buttons():
		button.custom_minimum_size = DESKTOP_MAIN_NAV_BUTTON_SIZE
		button.add_theme_font_size_override("font_size", DESKTOP_MAIN_NAV_BUTTON_FONT_SIZE)
	_sync_left_troop_rail_backdrop()

func _apply_mobile_shell_layout(viewport_size: Vector2) -> void:
	var side_margin := MOBILE_SHELL_SIDE_MARGIN
	if viewport_size.x < 380.0:
		side_margin = 6.0
	if _bottom_nav_panel != null:
		_bottom_nav_panel.offset_left = side_margin
		_bottom_nav_panel.offset_right = maxf(side_margin, viewport_size.x - side_margin)
		_bottom_nav_panel.offset_top = -MOBILE_BOTTOM_NAV_HEIGHT
		_bottom_nav_panel.offset_bottom = -side_margin
	if _left_rail_panel != null:
		_apply_left_troop_rail_compact_mode(true)
		_left_rail_panel.offset_left = side_margin
		_left_rail_panel.offset_top = 78.0
		_left_rail_panel.offset_right = side_margin + minf(LEFT_TROOP_RAIL_PANEL_WIDTH, viewport_size.x * 0.34)
		var left_rail_bottom_limit := viewport_size.y - MOBILE_BOTTOM_NAV_HEIGHT - side_margin - 10.0
		var left_rail_target_bottom := _left_rail_panel.offset_top + 252.0
		_left_rail_panel.offset_bottom = maxf(_left_rail_panel.offset_top + 224.0, minf(left_rail_target_bottom, left_rail_bottom_limit))
		_sync_left_troop_rail_backdrop()
	if _bottom_margin_container != null:
		_bottom_margin_container.add_theme_constant_override("margin_left", 6)
		_bottom_margin_container.add_theme_constant_override("margin_top", 8)
		_bottom_margin_container.add_theme_constant_override("margin_right", 6)
		_bottom_margin_container.add_theme_constant_override("margin_bottom", 8)
	if _nav_buttons != null:
		_apply_main_nav_button_flow_separation(2, 4)
	if _main_nav_recruit_spacer != null and is_instance_valid(_main_nav_recruit_spacer):
		_resize_main_nav_recruit_spacer(MOBILE_MAIN_NAV_BUTTON_SIZE.x, _resolve_main_nav_button_h_separation(), true)
	var button_width := _resolve_mobile_main_nav_button_width()
	for button in _active_main_nav_buttons():
		button.custom_minimum_size = Vector2(button_width, MOBILE_MAIN_NAV_BUTTON_HEIGHT)
	if _world_entry_hint != null:
		_world_entry_hint.visible = false
	if _right_context_panel != null:
		var right_margin := side_margin
		var right_context_width := minf(348.0, maxf(300.0, viewport_size.x - side_margin * 2.0))
		_right_context_panel.offset_left = -right_context_width - right_margin
		_right_context_panel.offset_right = -right_margin
		_right_context_panel.offset_top = 82.0
		_right_context_panel.offset_bottom = minf(viewport_size.y - 178.0, 566.0)
	if _center_stage != null:
		var stage_half_width := minf(220.0, maxf(148.0, viewport_size.x * 0.46))
		_center_stage.offset_left = -stage_half_width
		_center_stage.offset_right = stage_half_width
	if _city_entry_grid != null:
		_city_entry_grid.columns = 3

func _resolve_mobile_main_nav_button_width() -> float:
	return clampf(MOBILE_MAIN_NAV_BUTTON_SIZE.x, MOBILE_MAIN_NAV_BUTTON_MIN_WIDTH, MOBILE_MAIN_NAV_BUTTON_MAX_WIDTH)

func _apply_main_nav_button_flow_separation(h_separation: int, v_separation: int) -> void:
	if _nav_buttons == null:
		return
	_nav_buttons.add_theme_constant_override("h_separation", h_separation)
	_nav_buttons.add_theme_constant_override("v_separation", v_separation)

func _resolve_main_nav_button_h_separation() -> float:
	if _nav_buttons == null:
		return 0.0
	return float(_nav_buttons.get_theme_constant("h_separation"))

func _resolve_main_nav_inner_width() -> float:
	var available_width := 360.0
	if _bottom_nav_panel != null:
		available_width = maxf(1.0, _bottom_nav_panel.offset_right - _bottom_nav_panel.offset_left)
	var inner_margin := 12.0
	if _bottom_margin_container != null:
		inner_margin = float(_bottom_margin_container.get_theme_constant("margin_left") + _bottom_margin_container.get_theme_constant("margin_right"))
	var menu_column_width := 0.0
	if _main_nav_menu_button != null and _main_nav_menu_button.visible:
		menu_column_width = maxf(_main_nav_menu_button.custom_minimum_size.x, DESKTOP_MAIN_NAV_MENU_BUTTON_MIN_SIZE.x)
		var menu_parent := _main_nav_menu_button.get_parent()
		if menu_parent is BoxContainer:
			menu_column_width += float((menu_parent as BoxContainer).get_theme_constant("separation"))
	var utility_row_width := 0.0
	if _utility_row != null and _utility_row.visible and _utility_row.get_parent() == _main_nav_menu_button.get_parent():
		utility_row_width = _utility_row.get_combined_minimum_size().x
		var utility_parent := _utility_row.get_parent()
		if utility_parent is BoxContainer:
			utility_row_width += float((utility_parent as BoxContainer).get_theme_constant("separation"))
	return maxf(1.0, available_width - inner_margin - menu_column_width - utility_row_width)

func _resize_main_nav_recruit_spacer(button_width: float, h_separation: float, is_mobile: bool) -> void:
	if _main_nav_recruit_spacer == null or not is_instance_valid(_main_nav_recruit_spacer):
		return
	var nav_width := _resolve_main_nav_inner_width()
	var visible_button_count_without_spacer := 0
	for button in _active_main_nav_buttons():
		if button != null and button != _bag_button:
			visible_button_count_without_spacer += 1
	var spacer_width := nav_width - button_width * float(visible_button_count_without_spacer) - h_separation * float(visible_button_count_without_spacer)
	_main_nav_recruit_spacer.custom_minimum_size = Vector2(maxf(0.0, spacer_width), 0.0)

func _active_main_nav_buttons() -> Array[Button]:
	var buttons: Array[Button] = []
	for button_variant in [_generals_button, _skill_library_button, _interior_button, _alliance_button, _ai_hub_button, _chat_button, _settings_button, _war_button, _ai_switch_button, _recruit_button, _bag_button]:
		var button := button_variant as Button
		if button != null and button.visible:
			buttons.append(button)
	return buttons

func _apply_control_offsets(control: Control, layout_profile: Dictionary, prefix: String) -> void:
	if control == null:
		return
	control.offset_left = float(layout_profile.get("%s_offset_left" % prefix, control.offset_left))
	control.offset_top = float(layout_profile.get("%s_offset_top" % prefix, control.offset_top))
	control.offset_right = float(layout_profile.get("%s_offset_right" % prefix, control.offset_right))
	control.offset_bottom = float(layout_profile.get("%s_offset_bottom" % prefix, control.offset_bottom))

func _apply_margin_offsets(container: MarginContainer, layout_profile: Dictionary, prefix: String) -> void:
	if container == null:
		return
	container.add_theme_constant_override("margin_left", int(layout_profile.get("%s_margin_left" % prefix, container.get_theme_constant("margin_left"))))
	container.add_theme_constant_override("margin_top", int(layout_profile.get("%s_margin_top" % prefix, container.get_theme_constant("margin_top"))))
	container.add_theme_constant_override("margin_right", int(layout_profile.get("%s_margin_right" % prefix, container.get_theme_constant("margin_right"))))
	container.add_theme_constant_override("margin_bottom", int(layout_profile.get("%s_margin_bottom" % prefix, container.get_theme_constant("margin_bottom"))))

func _apply_box_separation(container: Control, layout_profile: Dictionary, key: String) -> void:
	if container == null:
		return
	container.add_theme_constant_override("separation", int(layout_profile.get(key, container.get_theme_constant("separation"))))

func _apply_grid_separation(container: Control, layout_profile: Dictionary) -> void:
	if container == null:
		return
	if not (container is GridContainer):
		return
	var grid_container := container as GridContainer
	grid_container.add_theme_constant_override("h_separation", int(layout_profile.get("city_entry_grid_h_separation", grid_container.get_theme_constant("h_separation"))))
	grid_container.add_theme_constant_override("v_separation", int(layout_profile.get("city_entry_grid_v_separation", grid_container.get_theme_constant("v_separation"))))

func _apply_label_font_size(label: Label, typography_profile: Dictionary, key: String) -> void:
	if label == null:
		return
	if not typography_profile.has(key):
		return
	label.add_theme_font_size_override("font_size", int(typography_profile.get(key, label.get_theme_font_size("font_size"))))

func _apply_button_font_size(button: Button, typography_profile: Dictionary, key: String) -> void:
	if button == null:
		return
	if not typography_profile.has(key):
		return
	button.add_theme_font_size_override("font_size", int(typography_profile.get(key, button.get_theme_font_size("font_size"))))

func _apply_button_chrome_profile(button: Button, profile: Dictionary, allow_size_override: bool = false) -> void:
	if button == null:
		return
	var fallback_profile := _resolve_default_button_fallback_profile()
	var fallback_font_color: Color = fallback_profile.get("font_color", button.get_theme_color("font_color"))
	var fallback_hover_font_color: Color = fallback_profile.get("font_hover_color", fallback_font_color)
	var fallback_pressed_font_color: Color = fallback_profile.get("font_pressed_color", fallback_font_color)
	var fallback_disabled_font_color: Color = fallback_profile.get("font_disabled_color", button.get_theme_color("font_disabled_color"))
	if allow_size_override and profile.has("min_size"):
		button.custom_minimum_size = profile.get("min_size", button.custom_minimum_size)
	if allow_size_override and profile.has("font_size"):
		var density_profile: Dictionary = _resolve_left_rail_density_profile()
		button.add_theme_font_size_override("font_size", int(profile.get("font_size", density_profile.get("primary_token_font_size", 8))))
	var normal_style := _build_stylebox_from_chrome_profile(profile)
	var hover_style: StyleBoxFlat = normal_style.duplicate()
	if profile.has("hover_bg_color"):
		hover_style.bg_color = profile.get("hover_bg_color", hover_style.bg_color)
	else:
		hover_style.bg_color = hover_style.bg_color.lightened(float(profile.get("hover_lighten", 0.05)))
	var pressed_style: StyleBoxFlat = normal_style.duplicate()
	if profile.has("pressed_bg_color"):
		pressed_style.bg_color = profile.get("pressed_bg_color", pressed_style.bg_color)
	else:
		pressed_style.bg_color = pressed_style.bg_color.darkened(float(profile.get("pressed_darken", 0.05)))
	button.add_theme_stylebox_override("normal", normal_style)
	button.add_theme_stylebox_override("hover", hover_style)
	button.add_theme_stylebox_override("pressed", pressed_style)
	button.add_theme_stylebox_override("focus", pressed_style)
	button.add_theme_stylebox_override("disabled", normal_style)
	button.add_theme_color_override("font_color", profile.get("font_color", fallback_font_color))
	button.add_theme_color_override("font_hover_color", profile.get("font_hover_color", fallback_hover_font_color))
	button.add_theme_color_override("font_pressed_color", profile.get("font_pressed_color", fallback_pressed_font_color))
	button.add_theme_color_override("font_disabled_color", profile.get("font_disabled_color", fallback_disabled_font_color))
	button.alignment = int(profile.get("alignment", fallback_profile.get("alignment", button.alignment)))
	if profile.has("modulate"):
		button.modulate = profile.get("modulate", Color(1.0, 1.0, 1.0, 1.0))
	if profile.has("flat"):
		button.flat = bool(profile.get("flat", button.flat))

func _apply_button_visual_profile(button: Button, profile: Dictionary) -> void:
	if button == null:
		return
	var fallback_profile := _resolve_default_button_fallback_profile()
	var fallback_font_color: Color = fallback_profile.get("font_color", button.get_theme_color("font_color"))
	var fallback_hover_font_color: Color = fallback_profile.get("font_hover_color", fallback_font_color)
	var fallback_pressed_font_color: Color = fallback_profile.get("font_pressed_color", fallback_font_color)
	var fallback_disabled_font_color: Color = fallback_profile.get("font_disabled_color", button.get_theme_color("font_disabled_color"))
	var font_color: Color = profile.get("font_color", fallback_font_color)
	button.add_theme_color_override("font_color", font_color)
	button.add_theme_color_override("font_hover_color", profile.get("font_hover_color", fallback_hover_font_color))
	button.add_theme_color_override("font_pressed_color", profile.get("font_pressed_color", fallback_pressed_font_color))
	button.add_theme_color_override("font_disabled_color", profile.get("font_disabled_color", fallback_disabled_font_color))
	button.modulate = profile.get("modulate", Color(1.0, 1.0, 1.0, 1.0))
	if profile.has("flat"):
		button.flat = bool(profile.get("flat", button.flat))

func _build_stylebox_from_chrome_profile(profile: Dictionary) -> StyleBoxFlat:
	return _build_button_stylebox(
		profile.get("bg_color", Color(0.0, 0.0, 0.0, 0.0)),
		profile.get("border_color", Color(0.0, 0.0, 0.0, 0.0)),
		int(profile.get("radius", 0)),
		int(profile.get("border_width", 0)),
		int(profile.get("margin_left", 0)),
		int(profile.get("margin_right", 0)),
		int(profile.get("margin_top", 0)),
		int(profile.get("margin_bottom", 0))
	)

func _build_button_stylebox(
	bg_color: Color,
	border_color: Color,
	radius: int,
	border_width: int,
	margin_left: int,
	margin_right: int,
	margin_top: int,
	margin_bottom: int
) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg_color
	style.border_color = border_color
	style.set_border_width_all(border_width)
	style.corner_radius_top_left = radius
	style.corner_radius_top_right = radius
	style.corner_radius_bottom_right = radius
	style.corner_radius_bottom_left = radius
	style.content_margin_left = margin_left
	style.content_margin_right = margin_right
	style.content_margin_top = margin_top
	style.content_margin_bottom = margin_bottom
	return style

func _refresh_under_construction_buttons() -> void:
	if _war_button != null:
		_war_button.visible = true
		_war_button.disabled = false
	_apply_under_construction_button_state(_bag_button, "bag")
	if _settings_button != null:
		_settings_button.visible = true
		_settings_button.disabled = false
	if is_inside_tree():
		_apply_responsive_shell_layout_overrides(_resolve_shell_layout_profile())

func _apply_under_construction_button_state(button: Button, action_id: String) -> void:
	if button == null:
		return
	var button_copy := _resolve_under_construction_button_copy(action_id)
	if button_copy.is_empty():
		return
	var label := str(button_copy.get("stateLabel", button.text)).strip_edges()
	var description := str(button_copy.get("description", "该入口仍在开发中。")).strip_edges()
	var is_disabled := bool(button_copy.get("disabled", true))
	if action_id == "bag" or action_id == "settings":
		label = str(button_copy.get("label", label)).strip_edges()
	button.text = label
	button.visible = false
	button.tooltip_text = description if button.visible else _format_copy_template("under_construction_tooltip_template", {"description": description}, "开发中：{description}")
	button.disabled = is_disabled
	_apply_button_visual_profile(button, _resolve_under_construction_chrome_profile(is_disabled))

func _apply_shell_icons() -> void:
	_apply_texture_icon_profile(_task_icon, _resolve_task_icon_profile())
	_apply_button_icon_profile(_mail_button, _resolve_button_icon_profile("mail"))
	_apply_button_icon_profile(_activity_button, _resolve_button_icon_profile("activity"))
	_apply_button_icon_profile(_help_button, _resolve_button_icon_profile("help"))
	_apply_button_icon_profile(_jade_currency_badge, _resolve_button_icon_profile("jade"))
	_apply_button_icon_profile(_copper_currency_badge, _resolve_button_icon_profile("copper"))
	if _mode_toggle_button != null:
		_mode_toggle_button.icon = _load_ui_texture(TOP_FLAG_ICON_PATH)
		_mode_toggle_button.expand_icon = true
		_mode_toggle_button.icon_alignment = HORIZONTAL_ALIGNMENT_LEFT
		_mode_toggle_button.add_theme_constant_override("h_separation", 6)

func _apply_texture_icon_profile(texture_rect: TextureRect, profile: Dictionary) -> void:
	if texture_rect == null:
		return
	texture_rect.texture = profile.get("icon_texture", null)
	texture_rect.tooltip_text = str(profile.get("tooltip_text", "")).strip_edges()

func _apply_button_icon_profile(button: Button, profile: Dictionary) -> void:
	if button == null:
		return
	button.icon = profile.get("icon_texture", null)
	button.expand_icon = bool(profile.get("expand_icon", true))
	button.icon_alignment = int(profile.get("icon_alignment", HORIZONTAL_ALIGNMENT_LEFT))
	if profile.has("h_separation"):
		button.add_theme_constant_override("h_separation", int(profile.get("h_separation", 4)))
	var tooltip_text := str(profile.get("tooltip_text", "")).strip_edges()
	if tooltip_text != "":
		button.tooltip_text = tooltip_text


func _apply_static_action_button_copy() -> void:
	_apply_city_action_button_copy(_interior_button, "interior")
	_apply_city_action_button_copy(_recruit_button, "recruit")
	_apply_city_action_button_copy(_generals_button, "generals")
	_apply_city_action_button_copy(_skill_library_button, "skill_library")
	_apply_city_action_button_copy(_alliance_button, "alliance")
	_apply_city_action_button_copy(_war_button, "battle_report")
	_apply_city_action_button_copy(_ai_hub_button, "ai_hub")
	_apply_city_action_button_copy(_chat_button, "chat")
	_apply_city_action_button_copy(_settings_button, "settings")
	_apply_city_action_button_copy(_interior_entry_button, "interior")
	_apply_city_action_button_copy(_recruit_entry_button, "recruit")
	_apply_city_action_button_copy(_generals_entry_button, "generals")
	_apply_city_action_button_copy(_alliance_entry_button, "alliance")
	_apply_city_action_button_copy(_ai_hub_entry_button, "ai_hub")
	_apply_utility_action_button_copy(_mail_button, "mail")
	_apply_utility_action_button_copy(_activity_button, "activity")
	_apply_utility_action_button_copy(_help_button, "help")


func _apply_city_action_button_copy(button: Button, action_id: String) -> void:
	if button == null:
		return
	var action_copy := _resolve_city_action_copy(action_id)
	if action_copy.is_empty():
		return
	var label: String = str(action_copy.get("label", action_id)).strip_edges()
	var description: String = str(action_copy.get("description", "")).strip_edges()
	button.text = label
	if description != "":
		button.tooltip_text = description


func _apply_utility_action_button_copy(button: Button, action_id: String) -> void:
	if button == null:
		return
	var button_copy := _resolve_utility_action_copy(action_id)
	if button_copy.is_empty():
		return
	var label: String = str(button_copy.get("label", action_id)).strip_edges()
	var description: String = str(button_copy.get("description", "")).strip_edges()
	button.text = label
	if description != "":
		button.tooltip_text = description

func _parse_premium_currency_summary(summary: String) -> Dictionary:
	var normalized_summary := summary.strip_edges()
	if normalized_summary == "":
		normalized_summary = _format_copy_template(
			"currency_tooltip_template",
			{
				"jade_label": _resolve_shell_copy_value("currency_jade_label", "玉符"),
				"jade": "0",
				"copper_label": _resolve_shell_copy_value("currency_copper_label", "铜钱"),
				"copper": "0",
			},
			"{jade_label} {jade} | {copper_label} {copper}"
		)
	var parsed := {
		"jade": "0",
		"copper": "0",
	}
	var jade_label := _resolve_shell_copy_value("currency_jade_label", "玉符")
	var copper_label := _resolve_shell_copy_value("currency_copper_label", "铜钱")
	for segment_variant in normalized_summary.split("|"):
		var segment := str(segment_variant).strip_edges()
		if segment == "":
			continue
		if segment.begins_with(jade_label):
			parsed["jade"] = _strip_currency_prefix(segment, jade_label)
		elif segment.begins_with(copper_label):
			parsed["copper"] = _strip_currency_prefix(segment, copper_label)
	return parsed

func _resolve_city_action_copy(action_id: String) -> Dictionary:
	if action_id == "ai_hub":
		return {
			"label": "AI系统",
			"description": "AI 系统入口，承接托管、议程和城市上下文助手。",
		}
	if action_id == "battle_report":
		return {
			"label": "个人战报",
			"description": "独立战报入口，打开个人/收藏战报列表，再进入战报详情。",
		}
	return _resolve_copy_entry("city_action_copy", action_id)

func _resolve_utility_action_copy(action_id: String) -> Dictionary:
	return _resolve_copy_entry("utility_action_copy", action_id)

func _resolve_under_construction_button_copy(action_id: String) -> Dictionary:
	return _resolve_copy_entry("under_construction_copy", action_id)

func _resolve_copy_entry(map_key: String, entry_id: String) -> Dictionary:
	var copy_profile := _resolve_copy_profile()
	var copy_map_variant: Variant = copy_profile.get(map_key, {})
	if copy_map_variant is Dictionary:
		var copy_map := copy_map_variant as Dictionary
		if copy_map.has(entry_id):
			var entry_variant: Variant = copy_map.get(entry_id, {})
			if entry_variant is Dictionary:
				return (entry_variant as Dictionary).duplicate(true)
	return {}

func _resolve_default_context_slots() -> Array:
	var copy_profile := _resolve_copy_profile()
	var default_slots_variant: Variant = copy_profile.get("default_context_slots", [])
	if default_slots_variant is Array:
		return (default_slots_variant as Array).duplicate(true)
	return []

func _resolve_shell_copy_value(key: String, fallback: String) -> String:
	var copy_profile := _resolve_copy_profile()
	var resolved := str(copy_profile.get(key, fallback)).strip_edges()
	return resolved if resolved != "" else fallback

func _format_copy_template(template_key: String, replacements: Dictionary, fallback_template: String) -> String:
	var template := _resolve_shell_copy_value(template_key, fallback_template)
	for key_variant in replacements.keys():
		var token := "{%s}" % str(key_variant)
		template = template.replace(token, str(replacements[key_variant]))
	return template

func _refresh_right_context_visibility() -> void:
	if _right_context_panel == null:
		return
	if not RIGHT_CONTEXT_PANEL_ENABLED:
		_right_context_panel.visible = false
		return
	var has_summary := _context_body != null and _context_body.text.strip_edges() != ""
	var has_slot_content := false
	for slot_panel_variant in _context_slot_panels:
		var slot_panel := slot_panel_variant as PanelContainer
		if slot_panel != null and slot_panel.visible:
			has_slot_content = true
			break
	var is_context_mode := _current_mode == WORLD_MODE or _current_city_action != DEFAULT_CITY_ACTION
	_right_context_panel.visible = is_context_mode and (has_summary or has_slot_content)

func _strip_currency_prefix(segment: String, prefix: String) -> String:
	var value := segment.strip_edges()
	if value.begins_with(prefix):
		value = value.substr(prefix.length()).strip_edges()
	while value.begins_with(":") or value.begins_with("："):
		value = value.substr(1).strip_edges()
	return value if value != "" else "0"

func _resolve_interior_tab_label(tab_id: String) -> String:
	var interior_tab_label := _resolve_copy_map_string("interior_tab_labels", tab_id, "")
	if interior_tab_label != "":
		return interior_tab_label
	match tab_id:
		"market":
			return "市井"
		"tax":
			return "税收"
		"policy":
			return "政策"
		"affairs":
			return "政务"
		_:
			return tab_id

func _resolve_copy_map_string(map_key: String, entry_id: String, fallback: String) -> String:
	var copy_profile := _resolve_copy_profile()
	var copy_map_variant: Variant = copy_profile.get(map_key, {})
	if copy_map_variant is Dictionary:
		var copy_map := copy_map_variant as Dictionary
		if copy_map.has(entry_id):
			var resolved := str(copy_map.get(entry_id, fallback)).strip_edges()
			if resolved != "":
				return resolved
	return fallback

func _build_tooltip_text(parts: Array) -> String:
	var segments: Array[String] = []
	for part_variant in parts:
		var part := str(part_variant).strip_edges()
		if part != "":
			segments.append(part)
	return "\n".join(segments)

func _compact_multiline_text(text: String, max_lines: int, max_chars_per_line: int) -> String:
	var lines := text.split("\n")
	var compacted: Array[String] = []
	for raw_line_variant in lines:
		var raw_line := str(raw_line_variant).strip_edges()
		if raw_line == "":
			continue
		compacted.append(_truncate_text(raw_line, max_chars_per_line))
		if compacted.size() >= max_lines:
			break
	if compacted.is_empty():
		return ""
	return "\n".join(compacted)

func _compact_single_line_text(text: String, max_chars: int) -> String:
	var normalized := text.replace("\n", " | ").replace("\r", " ").strip_edges()
	return _truncate_text(normalized, max_chars)

func _truncate_text(text: String, max_chars: int) -> String:
	if max_chars <= 0:
		return text
	if text.length() <= max_chars:
		return text
	return "%s…" % text.substr(0, max_chars - 1)

func _compose_troop_slot_text(slot_label: String, label: String, role_tag: String, state_tag: String, slot_index: int, is_enabled: bool) -> String:
	var normalized_label := label.strip_edges()
	if normalized_label == "":
		normalized_label = slot_label
	var archetype := _resolve_troop_slot_archetype(slot_index)
	var headline := "%s%s" % [slot_label, role_tag]
	var detail_label := _truncate_text(normalized_label, 4)
	if not is_enabled:
		detail_label = _resolve_empty_slot_caption(archetype)
	elif archetype == TROOP_SLOT_ARCHETYPE_PRIMARY:
		detail_label = _truncate_text(normalized_label, 5)
	var detail := "%s·%s" % [state_tag, detail_label]
	return "%s\n%s" % [headline, detail]

func _resolve_troop_slot_archetype(slot_index: int) -> String:
	if slot_index <= 1:
		return TROOP_SLOT_ARCHETYPE_PRIMARY
	if slot_index <= 3:
		return TROOP_SLOT_ARCHETYPE_MOBILE
	return TROOP_SLOT_ARCHETYPE_RESERVE

func _resolve_empty_slot_caption(archetype: String) -> String:
	match archetype:
		TROOP_SLOT_ARCHETYPE_PRIMARY:
			return "主位"
		TROOP_SLOT_ARCHETYPE_MOBILE:
			return "机位"
		_:
			return "后位"

func _resolve_troop_slot_role_tag(slot_index: int, is_enabled: bool) -> String:
	var archetype := _resolve_troop_slot_archetype(slot_index)
	if not is_enabled:
		match archetype:
			TROOP_SLOT_ARCHETYPE_PRIMARY:
				return "主位"
			TROOP_SLOT_ARCHETYPE_MOBILE:
				return "机位"
			_:
				return "后位"
	match archetype:
		TROOP_SLOT_ARCHETYPE_PRIMARY:
			return "主力"
		TROOP_SLOT_ARCHETYPE_MOBILE:
			return "机动"
		_:
			return "后备"

func _resolve_troop_slot_state_tag(status_text: String, subtitle: String, is_enabled: bool) -> String:
	if not is_enabled:
		return "空位"
	var normalized := status_text.strip_edges()
	if normalized == "":
		normalized = subtitle.strip_edges()
	if normalized.begins_with("行军"):
		return "行军"
	if normalized.begins_with("驻守"):
		return "驻守"
	if normalized.begins_with("征兵"):
		return "征兵"
	if normalized.begins_with("待命"):
		return ""
	return _truncate_text(normalized, 4)


func _reorder_left_rail_layout() -> void:
	if _left_column == null:
		return
	var desired_order := [
		$LeftRail/LeftMargin/LeftColumn/TaskHeaderRow,
		_task_body,
		_city_state_title,
		_city_state_summary,
		_city_tech_summary,
		_troop_section_title,
		_troop_summary,
		$LeftRail/LeftMargin/LeftColumn/TroopSlotScroll,
		$LeftRail/LeftMargin/LeftColumn/InteriorQuickLinks,
		_task_hint,
	]
	for index in range(desired_order.size()):
		var node: Node = desired_order[index]
		if node != null and node.get_parent() == _left_column:
			_left_column.move_child(node, index)
