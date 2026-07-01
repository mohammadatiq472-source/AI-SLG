extends Control
class_name MainCityHubOverlay

signal hub_entry_requested(action_id: String)
signal troop_formation_submit_requested(payload: Dictionary)
signal coordinate_jump_requested(payload: Dictionary)
signal ai_troop_team_viewed(payload: Dictionary)

const DISPLAY_MODE_WORLD := "world"
const HUB_SIZE := Vector2(112.0, 40.0)
const ENTRY_SIZE := Vector2(58.0, 28.0)
const ENTRY_GAP := 6
const HUB_OFFSET := Vector2(230.0, -20.0)
const COMPACT_HUB_BUTTON_VISIBLE := false
const WORLD_ANCHOR_ENTRY_POPOVER_TOKEN := "main_city_world_anchor_entry_popover_v1"
const WORLD_ASSET_ENTRY_BUTTON_TOKEN := "main_city_world_asset_entry_button_v1"
const WORLD_ASSET_ENTER_CAMERA_PUSH_TOKEN := "main_city_world_asset_enter_camera_push_v1"
const WORLD_ASSET_CAMERA_EASE_TOKEN := "main_city_world_asset_camera_ease_v2"
const ENTER_TRANSITION_MASK_TOKEN := "main_city_enter_transition_mask_v1"
const ENTERED_SPACE_STAGE_LAYOUT_TOKEN := "main_city_entered_space_stage_layout_v2"
const ENTERED_SPACE_GATEHOUSE_TRANSITION_TOKEN := "main_city_gatehouse_axis_mansion_transition_v1"
const ENTERED_SPACE_MANSION_HIGHLIGHT_TOKEN := "main_city_mansion_highlight_focus_v1"
const SPATIAL_ENTRY_MOTION_CONTRACT_ID := "main_city_spatial_entry_motion_static_contract_v1"
const SPATIAL_ENTRY_MOTION_PROOF_LEVEL := "code_chain"
const SPATIAL_ENTRY_MOTION_STATES := "world_anchor|camera_push|transition_mask|entered_city_space|return_map"
const REDUCED_MOTION_SKIP_CONTRACT_ID := "main_city_reduced_motion_skip_ux_v1"
const REDUCED_MOTION_SKIP_BUTTON_TOKEN := "main_city_reduced_motion_skip_button_v1"
const REDUCED_MOTION_SKIP_ACTION_ID := "main_city_motion_skip_toggle"
const REDUCED_MOTION_SKIP_PLAYER_LABEL := "简略动效"
const SLG_CAMERA_TRUE_CLOSURE_CONTRACT_ID := "main_city_slg_camera_true_closure_v1"
const SLG_CAMERA_RAIL_TOKEN := "main_city_slg_camera_push_in_rail_v1"
const SLG_CAMERA_DEPTH_LAYER_TOKEN := "main_city_slg_camera_depth_layers_v1"
const SLG_CAMERA_STATES := "world_anchor|push_in|gate_parallax|city_depth|settle"
const SLG_CAMERA_PUSH_MOTION_STAGE600_CONTRACT_ID := "main_city_slg_camera_push_motion_stage600_v1"
const SLG_CAMERA_PUSH_MARKER_TOKEN := "main_city_slg_camera_push_marker_v1"
const SLG_CAMERA_PUSH_TRAIL_TOKEN := "main_city_slg_camera_push_trail_v1"
const SLG_CAMERA_PUSH_MOTION_STATES := "approach_gate|push_along_rail|foreground_pass|settle_in_city"
const SLG_CAMERA_PUSH_MOTION_DURATION_SEC := 0.48
const LIVING_SPACE_STAGE605_CONTRACT_ID := "main_city_living_space_atmosphere_stage605_v1"
const LIVING_SPACE_MARKET_TOKEN := "main_city_living_market_assets_v1"
const LIVING_SPACE_CROWD_TOKEN := "main_city_living_crowd_flow_v1"
const LIVING_SPACE_BUILDING_TOKEN := "main_city_living_building_hierarchy_v1"
const LIVING_SPACE_ECONOMY_TOKEN := "main_city_living_economy_feedback_cue_v1"
const MAIN_CITY_SCENE_ENTRY_BUTTON_TOKEN := "main_city_scene_entry_button_v1"
const MAIN_CITY_SCENE_ENTRY_LIVE_TEXT_CONTRACT := "main_city_scene_entry_live_text_v1"
const MAIN_CITY_SCENE_RETURN_BUTTON_TOKEN := "main_city_scene_return_button_v1"
const MAIN_CITY_SCENE_RETURN_LIVE_TEXT_CONTRACT := "main_city_scene_return_live_text_v1"
const MAIN_CITY_CONTEXT_RETURN_BUTTON_TOKEN := "main_city_context_return_button_v1"
const MAIN_CITY_CONTEXT_RETURN_LIVE_TEXT_CONTRACT := "main_city_context_return_live_text_v1"
const CLOSE_BACK_BUTTON_SPEC_TOKEN := "close_back_button_spec_v1"
const TROOP_TEAM_CARD_BUTTON_TOKEN := "troop_team_card_button_v1"
const TROOP_TEAM_CARD_LIVE_TEXT_CONTRACT := "troop_team_card_live_text_v1"
const WORLD_ASSET_ENTRY_POPOVER_SIZE := Vector2(220.0, 116.0)
const WORLD_ASSET_ENTRY_CAMERA_TARGET_ZOOM := 2.04
const WORLD_ASSET_ENTRY_CAMERA_EASE_DURATION_SEC := 0.34
const FALLBACK_SCREEN_POSITION := Vector2(760.0, 470.0)
const CONTEXT_PANEL_SIZE := Vector2(1180.0, 640.0)
const CONTEXT_PANEL_MARGIN := Vector2(16.0, 16.0)
const CONTEXT_PANEL_TOP_MARGIN := 86.0
const CONTEXT_PANEL_BOTTOM_MARGIN := 24.0
const INTERIOR_HOME_LOBBY_BACKGROUND_PATH := "res://ui_generated/interior/interior_lobby_bg.png"
const TROOP_FORMATION_READ_MODEL_PATH := "res://data/ui/main_city_troop_formation_read_model.json"
const FACILITY_TREE_ASSET_ROOT := "res://data/ui/main_city_facility_tree_asset_drop/round_04"
const MAIN_CITY_PRIMARY_ASSET_FILE := "maincity_facility_city_lord_mansion_v4.png"
const MAIN_CITY_PRIMARY_ASSET_BINDING_TOKEN := "player_main_city_primary_asset_binding_v1"
const TROOP_FORMATION_SCENE_BACKGROUND_PATH := "res://assets/themes/slgclient/current/ui/drill_ground/drill_ground_empty_yard_bg_v2_2x1.png"
const TROOP_UNIT_UI_ASSET_BY_TYPE := {
	"步兵": "res://assets/themes/slgclient/current/units/infantry_ai_frames/r_07_infantry_ai_sheet_v1.png",
	"枪兵": "res://assets/themes/slgclient/current/units/infantry_ai_frames/r_07_infantry_ai_sheet_v1.png",
	"盾兵": "res://assets/themes/slgclient/current/units/infantry_ai_frames/r_07_infantry_ai_sheet_v1.png",
	"骑兵": "res://assets/themes/slgclient/current/units/qibing_frames/r_07_map_qibing_0_7.png",
	"弓兵": "res://assets/themes/slgclient/current/units/archer_ai_frames/r_07_archer_ai_sheet_v1.png",
	"谋略": "res://assets/themes/slgclient/current/units/archer_ai_frames/r_07_archer_ai_sheet_v1.png",
}
const TROOP_UNIT_MANIFEST_VISUAL_TYPE_BY_TROOP_TYPE := {
	"步兵": "infantry",
	"枪兵": "infantry",
	"盾兵": "infantry",
	"骑兵": "cavalry",
	"弓兵": "archer",
	"谋略": "archer",
}
const TROOP_UNIT_MANIFEST_DEFAULT_DIRECTION := "r"
const TROOP_UNIT_PREVIEW_ANIMATION_FRAME_INTERVAL_SEC := 0.14
const PAPER_PANEL_BG := Color(0.92, 0.88, 0.76, 0.86)
const PAPER_PANEL_BORDER := Color(0.64, 0.46, 0.25, 0.76)
const PAPER_TEXT := Color(0.23, 0.17, 0.10, 0.96)
const PAPER_MUTED_TEXT := Color(0.44, 0.36, 0.25, 0.84)
const CONTEXT_TABS := [
	{"id": "overview", "label": "组成"},
	{"id": "troop", "label": "编队"},
	{"id": "facility", "label": "设施"},
	{"id": "building_tree", "label": "建筑树"},
]
const ACTIONS := [
	{"id": "interior", "label": "内政"},
	{"id": "recruit", "label": "招募"},
	{"id": "generals", "label": "武将"},
	{"id": "skill_library", "label": "战法"},
	{"id": "alliance", "label": "同盟"},
	{"id": "ai_hub", "label": "AI"},
	{"id": "troop", "label": "部队"},
]
const PREVIEW_GENERALS := [
	{"id": "general_yue", "name": "岳平", "role": "前锋", "meta": "骑兵 / 突击"},
	{"id": "general_lu", "name": "陆昭", "role": "中军", "meta": "弓兵 / 指挥"},
	{"id": "general_qin", "name": "秦让", "role": "大营", "meta": "步兵 / 防御"},
	{"id": "general_shen", "name": "沈陵", "role": "中军", "meta": "谋略 / 辅助"},
]
const PREVIEW_BUILDINGS := [
	{"id": "drill_ground", "label": "校场", "level": "Lv.4 -> Lv.5", "status": "可升级", "body": "提升部队操练效率和编组稳定度。", "cost": "木 180 | 石 120 | 令 1", "effect": "操练效率 +1 | 编组稳定 +1"},
	{"id": "barracks", "label": "募兵所", "level": "Lv.4 -> Lv.5", "status": "待补给", "body": "承接征兵入口与预备兵状态。", "cost": "粮 260 | 木 140 | 令 1", "effect": "征兵队列 +1"},
	{"id": "command_hall", "label": "统帅厅", "level": "Lv.3 -> Lv.4", "status": "条件不足", "body": "强化统帅位与部队上限。", "cost": "木 220 | 石 220 | 令 1", "effect": "统帅上限 +1"},
	{"id": "market_plaza", "label": "市井", "level": "Lv.5 -> Lv.6", "status": "经营中", "body": "主城经营、交易入口和基础收益锚点。", "cost": "木 220 | 石 140 | 令 1", "effect": "经营收益 +1"},
]
const BUILDING_TREE_VIEW_SCENE := preload("res://scenes/ui/building_tree_view.tscn")
const BUILD_UPGRADE_SHEET_SCENE := preload("res://scenes/ui/build_upgrade_sheet.tscn")
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")
const PORTRAIT_ASSET_REGISTRY := preload("res://scripts/ui/portrait_asset_registry.gd")
const HERO_CARD_VIEW := preload("res://scripts/ui/formal_pack/components/hero_card_view.gd")
const TROOP_DETAIL_ACTION_BUTTON_TOKEN := "troop_detail_action_button_v1"
const TROOP_DETAIL_ACTION_LIVE_TEXT_CONTRACT := "troop_detail_action_live_text_v1"
const TROOP_DETAIL_BACK_BUTTON_TOKEN := "troop_detail_back_button_v1"
const TROOP_DETAIL_BACK_LIVE_TEXT_CONTRACT := "troop_detail_back_live_text_v1"
const TROOP_FORMATION_TROOP_TYPE_CHIP_TOKEN := "troop_formation_troop_type_chip_v1"

var _map_grid: Node = null
var _display_mode: String = ""
var _context: Dictionary = {}
var _expanded: bool = false
var _active_context_tab: String = "overview"
var _active_slot_id: String = "camp"
var _selected_troop_detail_slot_id: String = "front"
var _troop_detail_tool_mode: String = "config"
var _active_team_id: String = ""
var _active_building_id: String = "drill_ground"
var _formation_slots := {
	"camp": "",
	"mid": "",
	"front": "",
}
var _hub_panel: PanelContainer
var _title_label: Label
var _subtitle_label: Label
var _hub_button: Button
var _entry_panel: PanelContainer
var _entry_grid: GridContainer
var _world_enter_button: Button
var _context_backdrop: ColorRect
var _context_panel: PanelContainer
var _context_margin: MarginContainer
var _context_header: HBoxContainer
var _context_title_label: Label
var _context_subtitle_label: Label
var _reduced_motion_button: Button
var _context_anchor_band_host: VBoxContainer
var _context_tab_row: HBoxContainer
var _context_content_host: VBoxContainer
var _enter_transition_mask: ColorRect
var _context_tab_buttons: Dictionary = {}
var _building_tree: Node = null
var _upgrade_sheet: Node = null
var _troop_formation_read_model_cache: Dictionary = {}
var _troop_unit_manifest_cache: Dictionary = {}
var _troop_unit_texture_sequence_cache: Dictionary = {}
var _last_troop_formation_submit_payload: Dictionary = {}
var _troop_action_hint_text: String = ""
var _world_anchor_entry_visible: bool = false
var _last_world_entry_camera_push: Dictionary = {}
var _reduced_motion_enabled: bool = false


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	z_index = 120
	_build_view()
	set_display_mode("")


func configure(map_grid: Node) -> void:
	if _map_grid != null and _map_grid.has_signal("view_transform_changed"):
		var old_callback := Callable(self, "_on_map_view_transform_changed")
		if _map_grid.is_connected("view_transform_changed", old_callback):
			_map_grid.disconnect("view_transform_changed", old_callback)
	_map_grid = map_grid
	if _map_grid != null and _map_grid.has_signal("view_transform_changed"):
		var callback := Callable(self, "_on_map_view_transform_changed")
		if not _map_grid.is_connected("view_transform_changed", callback):
			_map_grid.connect("view_transform_changed", callback)
	_update_position()


func set_display_mode(next_mode: String) -> void:
	_display_mode = next_mode.strip_edges().to_lower()
	visible = _display_mode == DISPLAY_MODE_WORLD
	if not visible:
		set_expanded(false)
		_set_world_anchor_entry_visible(false)
		return
	if _hub_panel != null:
		_hub_panel.visible = COMPACT_HUB_BUTTON_VISIBLE and not _expanded and not _world_anchor_entry_visible
	_update_position()


func set_context(next_context: Dictionary) -> void:
	_context = next_context.duplicate(true)
	var title := str(_context.get("title", "主城中枢")).strip_edges()
	if title == "":
		title = "主城中枢"
	var subtitle := str(_context.get("subtitle", "")).strip_edges()
	if subtitle == "":
		subtitle = "内政 / 招募 / 武将 / 战法 / 同盟 / AI / 部队"
	_title_label.text = title
	_title_label.visible = false
	_subtitle_label.text = subtitle
	_subtitle_label.visible = false
	if _context_title_label != null:
		_context_title_label.text = title
	if _context_subtitle_label != null:
		_context_subtitle_label.text = "主城空间"
	_hub_button.tooltip_text = _build_tooltip()
	_update_position()


func set_troop_formation_read_model(next_read_model: Dictionary) -> void:
	if next_read_model.is_empty():
		return
	_troop_formation_read_model_cache = next_read_model.duplicate(true)
	if _active_context_tab == "troop":
		_select_context_tab("troop")


func set_expanded(next_expanded: bool) -> void:
	_expanded = next_expanded
	if _expanded:
		_set_world_anchor_entry_visible(false)
	if _hub_panel != null:
		_hub_panel.visible = COMPACT_HUB_BUTTON_VISIBLE and not _expanded and not _world_anchor_entry_visible
	if _entry_panel != null:
		_entry_panel.visible = _world_anchor_entry_visible
	if _context_backdrop != null:
		_context_backdrop.visible = _expanded
		_context_backdrop.color = Color(0.0, 0.0, 0.0, 0.58) if _expanded else Color(0.0, 0.0, 0.0, 0.0)
	if _context_panel != null:
		_context_panel.visible = _expanded
		if _expanded:
			_select_context_tab(_active_context_tab)
			_update_context_panel_chrome()
			_play_context_panel_intro()


func is_expanded() -> bool:
	return _expanded


func _troop_detail_fullscreen_active() -> bool:
	return _expanded and _active_context_tab == "troop" and _active_team_id.strip_edges() != ""


func _update_context_panel_chrome() -> void:
	var fullscreen_detail := _troop_detail_fullscreen_active()
	var overview_stage := _expanded and _active_context_tab == "overview"
	if _context_header != null:
		_context_header.visible = not fullscreen_detail and not overview_stage
	if _context_margin != null:
		var margin_value := 0 if (fullscreen_detail or overview_stage) else 18
		_context_margin.add_theme_constant_override("margin_left", margin_value)
		_context_margin.add_theme_constant_override("margin_top", 0 if (fullscreen_detail or overview_stage) else 16)
		_context_margin.add_theme_constant_override("margin_right", margin_value)
		_context_margin.add_theme_constant_override("margin_bottom", 0 if (fullscreen_detail or overview_stage) else 16)
	if _context_panel != null:
		if fullscreen_detail:
			_context_panel.add_theme_stylebox_override("panel", _make_panel_style(Color(0.010, 0.008, 0.006, 0.98), Color(0.0, 0.0, 0.0, 0.0), 0))
		elif _active_context_tab == "overview":
			_context_panel.add_theme_stylebox_override("panel", _make_panel_style(Color(0.035, 0.026, 0.016, 0.18), Color(0.0, 0.0, 0.0, 0.0), 0))
		else:
			_context_panel.add_theme_stylebox_override("panel", _make_panel_style(Color(0.078, 0.055, 0.034, 0.940), Color(0.88, 0.64, 0.30, 0.72), 1))


func is_hub_visible() -> bool:
	var compact_visible := _hub_panel != null and _hub_panel.visible
	var entry_visible := _entry_panel != null and _entry_panel.visible
	var context_visible := _context_panel != null and _context_panel.visible
	return visible and (compact_visible or entry_visible or context_visible)


func get_context_summary() -> Dictionary:
	var viewport_size := get_viewport_rect().size
	var context_size := _context_panel.size if _context_panel != null else Vector2.ZERO
	var viewport_fill := (
		context_size.x >= viewport_size.x * 0.90
		and context_size.y >= viewport_size.y * 0.72
	)
	var mobile_overlap_summary := _build_main_city_mobile_overlap_summary(viewport_size)
	var summary := {
		"visible": is_hub_visible(),
		"expanded": _expanded,
		"contextPanelVisible": _context_panel != null and _context_panel.visible,
		"activeContextTab": _active_context_tab,
		"hubVisualMode": "main_city_scene_gateway_v3",
		"worldAnchorEntryPopoverToken": WORLD_ANCHOR_ENTRY_POPOVER_TOKEN,
		"worldAssetEntryButtonToken": WORLD_ASSET_ENTRY_BUTTON_TOKEN,
		"worldAssetEnterCameraPushToken": WORLD_ASSET_ENTER_CAMERA_PUSH_TOKEN,
		"worldAssetCameraEaseToken": WORLD_ASSET_CAMERA_EASE_TOKEN,
		"worldAssetCameraEaseDurationSec": WORLD_ASSET_ENTRY_CAMERA_EASE_DURATION_SEC,
		"mainCityEnterTransitionMaskToken": ENTER_TRANSITION_MASK_TOKEN,
		"mainCityEnterTransitionMaskVisible": _enter_transition_mask != null and _enter_transition_mask.visible,
		"mainCityEnteredSpaceStageLayoutToken": ENTERED_SPACE_STAGE_LAYOUT_TOKEN,
		"mainCityGatehouseTransitionToken": ENTERED_SPACE_GATEHOUSE_TRANSITION_TOKEN,
		"mainCityMansionHighlightToken": ENTERED_SPACE_MANSION_HIGHLIGHT_TOKEN,
		"mainCityEnteredSpaceStageVisible": _count_visible_nodes_by_name_prefix(self, "MainCityEnteredSpaceStage") > 0,
		"mainCitySceneSpatialEntryDockVisible": _count_visible_nodes_by_name_prefix(self, "MainCitySceneSpatialEntryDock") > 0,
		"mainCitySceneGatehouseLayerVisible": _count_visible_nodes_by_name_prefix(self, "MainCitySceneGatehouseTransitionLayer") > 0,
		"mainCitySceneAxisLineVisible": _count_visible_nodes_by_name_prefix(self, "MainCitySceneCentralAxisLine") > 0,
		"mainCitySceneMansionHighlightVisible": _count_visible_nodes_by_name_prefix(self, "MainCitySceneMansionHighlight") > 0,
		"mainCityPlayerBoundPrimaryAssetToken": MAIN_CITY_PRIMARY_ASSET_BINDING_TOKEN,
		"mainCityPlayerBoundPrimaryAssetFile": MAIN_CITY_PRIMARY_ASSET_FILE,
		"mainCityPlayerBoundPrimaryAssetNode": "MainCitySceneFacilityModel",
		"mainCityPlayerBoundPrimaryAssetVisible": _count_visible_nodes_by_name_prefix(self, "MainCitySceneFacilityModel") > 0,
		"mainCityPlayerBoundEntryDockAnchoredToPrimaryAsset": _count_visible_nodes_by_name_prefix(self, "MainCitySceneSpatialEntryDock") > 0 and _count_visible_nodes_by_name_prefix(self, "MainCitySceneFacilityModel") > 0,
		"mainCityPlayerBoundEntryDockPlacementMode": "center_bottom_asset_dock_v2",
		"mainCityPlayerBoundEntryDockNearPrimaryAsset": true,
		"worldAnchorEntryVisible": _entry_panel != null and _entry_panel.visible,
		"worldAnchorEntryOpenedFromAsset": _world_anchor_entry_visible,
		"worldAnchorEntryButtonLabels": _world_anchor_entry_button_labels(),
		"worldAnchorEntryButtonCount": _world_anchor_entry_button_count(),
		"worldAnchorEntryAnchoredToTile": _world_anchor_entry_anchor_ok(),
		"worldAnchorEntryPanelWidth": int(_entry_panel.size.x) if _entry_panel != null else 0,
		"worldAnchorEntryPanelHeight": int(_entry_panel.size.y) if _entry_panel != null else 0,
		"worldAnchorEnterCameraPush": _last_world_entry_camera_push.duplicate(true),
		"hubCompactEntryRole": "weak_fallback_not_primary",
		"hubCompactButtonPrimaryVisible": _hub_panel != null and _hub_panel.visible,
		"hubColorMode": "warm_unified_no_color_grid_v2",
		"hubSceneMode": "city_space_focus_v1",
		"hubCinematicIntroToken": "map_node_to_city_space_push_v1",
		"mainCitySpatialEntryMotionContractId": SPATIAL_ENTRY_MOTION_CONTRACT_ID,
		"mainCitySpatialEntryMotionProofLevel": SPATIAL_ENTRY_MOTION_PROOF_LEVEL,
		"mainCitySpatialEntryMotionStates": SPATIAL_ENTRY_MOTION_STATES,
		"mainCitySpatialEntryNoDirectPopup": true,
		"mainCitySpatialEntryRealButtonActionIds": "main_city_world_enter|main_city_scene_return_map|main_city_scene_entry:troop|main_city_scene_entry:building_tree",
		"mainCitySpatialEntryPlayerLabels": "进入主城|返回地图|部队编组|建筑树",
		"mainCityReducedMotionSkipContractId": REDUCED_MOTION_SKIP_CONTRACT_ID,
		"mainCityReducedMotionSkipButtonToken": REDUCED_MOTION_SKIP_BUTTON_TOKEN,
		"mainCityReducedMotionSkipActionId": REDUCED_MOTION_SKIP_ACTION_ID,
		"mainCityReducedMotionSkipPlayerLabel": REDUCED_MOTION_SKIP_PLAYER_LABEL,
		"mainCityReducedMotionSkipButtonVisible": _reduced_motion_button != null and _reduced_motion_button.visible,
		"mainCityReducedMotionSkipButtonNodeName": _reduced_motion_button.name if _reduced_motion_button != null else "",
		"mainCityReducedMotionEnabled": _reduced_motion_enabled,
		"mainCityReducedMotionSkipsTransitionMask": true,
		"mainCityReducedMotionSkipsStageTween": true,
		"mainCitySlgCameraTrueClosureContractId": SLG_CAMERA_TRUE_CLOSURE_CONTRACT_ID,
		"mainCitySlgCameraRailToken": SLG_CAMERA_RAIL_TOKEN,
		"mainCitySlgCameraDepthLayerToken": SLG_CAMERA_DEPTH_LAYER_TOKEN,
		"mainCitySlgCameraStates": SLG_CAMERA_STATES,
		"mainCitySlgCameraProofLevel": "visual_smoke_3_frame",
		"mainCitySlgCameraMovementFrameTargetCount": 3,
		"mainCitySlgCameraRailVisible": _count_visible_nodes_by_name_prefix(self, "MainCityCameraLensRail") > 0,
		"mainCitySlgCameraForegroundLayerVisible": _count_visible_nodes_by_name_prefix(self, "MainCityCameraForeground") > 0,
		"mainCitySlgCameraMidgroundLayerVisible": _count_visible_nodes_by_name_prefix(self, "MainCityCameraMidground") > 0,
		"mainCitySlgCameraBackgroundLayerVisible": _count_visible_nodes_by_name_prefix(self, "MainCityCameraBackground") > 0,
		"mainCitySlgCameraDepthLayerCount": _count_visible_nodes_by_name_prefix(self, "MainCityCameraForeground") + _count_visible_nodes_by_name_prefix(self, "MainCityCameraMidground") + _count_visible_nodes_by_name_prefix(self, "MainCityCameraBackground"),
		"mainCitySlgCameraPreservesReducedMotionSkip": true,
		"mainCitySlgCameraPushMotionStage600ContractId": SLG_CAMERA_PUSH_MOTION_STAGE600_CONTRACT_ID,
		"mainCitySlgCameraPushMarkerToken": SLG_CAMERA_PUSH_MARKER_TOKEN,
		"mainCitySlgCameraPushTrailToken": SLG_CAMERA_PUSH_TRAIL_TOKEN,
		"mainCitySlgCameraPushMotionStates": SLG_CAMERA_PUSH_MOTION_STATES,
		"mainCitySlgCameraPushMotionDurationSec": SLG_CAMERA_PUSH_MOTION_DURATION_SEC,
		"mainCitySlgCameraPushMotionFrameTargetCount": 4,
		"mainCitySlgCameraPushMarkerVisible": _count_visible_nodes_by_name_prefix(self, "MainCityCameraPushMarker") > 0,
		"mainCitySlgCameraPushTrailVisible": _count_visible_nodes_by_name_prefix(self, "MainCityCameraPushTrail") > 0,
		"mainCitySlgCameraPushSettleHaloVisible": _count_visible_nodes_by_name_prefix(self, "MainCityCameraPushSettleHalo") > 0,
		"mainCitySlgCameraPushMotionPreservesReducedMotionSkip": true,
		"mainCityLivingSpaceStage605ContractId": LIVING_SPACE_STAGE605_CONTRACT_ID,
		"mainCityLivingSpaceMarketToken": LIVING_SPACE_MARKET_TOKEN,
		"mainCityLivingSpaceCrowdToken": LIVING_SPACE_CROWD_TOKEN,
		"mainCityLivingSpaceBuildingToken": LIVING_SPACE_BUILDING_TOKEN,
		"mainCityLivingSpaceEconomyToken": LIVING_SPACE_ECONOMY_TOKEN,
		"mainCityLivingSpaceMarketVisible": _count_visible_nodes_by_name_prefix(self, "MainCityLivingMarket") > 0,
		"mainCityLivingSpaceCrowdVisible": _count_visible_nodes_by_name_prefix(self, "MainCityLivingCrowd") > 0,
		"mainCityLivingSpaceWorkerVisible": _count_visible_nodes_by_name_prefix(self, "MainCityLivingWorker") > 0,
		"mainCityLivingSpaceBuildingVisible": _count_visible_nodes_by_name_prefix(self, "MainCityLivingBuilding") > 0,
		"mainCityLivingSpaceEconomyCueVisible": _count_visible_nodes_by_name_prefix(self, "MainCityLivingEconomy") > 0,
		"mainCityLivingSpacePlayerCopy": "市井往来|粮税入库",
		"mainCityLivingSpaceLayerCount": _count_visible_nodes_by_name_prefix(self, "MainCityLivingMarket") + _count_visible_nodes_by_name_prefix(self, "MainCityLivingCrowd") + _count_visible_nodes_by_name_prefix(self, "MainCityLivingWorker") + _count_visible_nodes_by_name_prefix(self, "MainCityLivingBuilding") + _count_visible_nodes_by_name_prefix(self, "MainCityLivingEconomy"),
		"mainCityLivingSpaceCommerceLayerCount": _count_visible_nodes_by_name_prefix(self, "MainCityLivingMarket") + _count_visible_nodes_by_name_prefix(self, "MainCityLivingCrowd") + _count_visible_nodes_by_name_prefix(self, "MainCityLivingWorker") + _count_visible_nodes_by_name_prefix(self, "MainCityLivingBuilding") + _count_visible_nodes_by_name_prefix(self, "MainCityLivingEconomy"),
		"mainCityLivingSpacePreservesRealButtons": true,
		"mainCityLivingSpaceBuildingForegroundBlocked": true,
		"mainCityLivingSpaceBuildingLayerZIndex": 1,
		"mainCityLivingSpaceBuildingRowZIndex": 2,
		"hubPrimaryEntryCount": 2,
		"hubVisibleEntryLabels": "部队编组|建筑树",
		"hubSceneEntryButtonToken": MAIN_CITY_SCENE_ENTRY_BUTTON_TOKEN,
		"hubSceneEntryLiveTextContract": MAIN_CITY_SCENE_ENTRY_LIVE_TEXT_CONTRACT,
		"hubSceneEntryButtonVisibleCount": _main_city_scene_entry_button_meta().size(),
		"hubSceneEntryButtonMissingMetaCount": _main_city_scene_entry_button_missing_meta_count(),
		"hubSceneEntryButtonActionIds": _main_city_scene_entry_button_meta_join("action_id"),
		"hubSceneEntryButtonLabels": _main_city_scene_entry_button_meta_join("label"),
		"hubSceneReturnButtonToken": MAIN_CITY_SCENE_RETURN_BUTTON_TOKEN,
		"hubSceneReturnLiveTextContract": MAIN_CITY_SCENE_RETURN_LIVE_TEXT_CONTRACT,
		"hubSceneReturnCloseBackSpecToken": CLOSE_BACK_BUTTON_SPEC_TOKEN,
		"hubSceneReturnButtonRole": "return_map",
		"hubSceneReturnButtonVariant": "neutral",
		"hubSceneReturnButtonVisibleCount": _main_city_scene_return_button_meta().size(),
		"hubSceneReturnButtonMissingMetaCount": _main_city_scene_return_button_missing_meta_count(),
		"hubSceneReturnButtonActionIds": _main_city_scene_return_button_meta_join("action_id"),
		"hubSceneReturnButtonLabels": _main_city_scene_return_button_meta_join("label"),
		"hubSceneReturnButtonLessIntrusive": true,
		"hubSceneReturnButtonCornerChrome": true,
		"hubTabStripVisible": _context_tab_row != null and _context_tab_row.visible,
		"hubContextPanelViewportFill": viewport_fill,
		"hubContextPanelWidth": int(context_size.x),
		"hubContextPanelHeight": int(context_size.y),
		"hubViewportWidth": int(viewport_size.x),
		"hubViewportHeight": int(viewport_size.y),
		"mainCityHubMobileViewport": bool(mobile_overlap_summary.get("mainCityHubMobileViewport", false)),
		"mainCityHubMobileOverlapFree": bool(mobile_overlap_summary.get("mainCityHubMobileOverlapFree", true)),
		"mainCityHubMobileOverlapHitCount": int(mobile_overlap_summary.get("mainCityHubMobileOverlapHitCount", 0)),
		"mainCityHubMobileOverlapPairs": str(mobile_overlap_summary.get("mainCityHubMobileOverlapPairs", "")),
		"mainCityHubMobileOverlapCheckCount": int(mobile_overlap_summary.get("mainCityHubMobileOverlapCheckCount", 0)),
		"hubOverviewResourceStripVisible": false,
		"hubOverviewAnchorBandVisible": false,
		"hubPrimaryFlow": "composition_to_troop_facility_tree",
		"templateAssignmentCount": _template_assignment_count(),
		"formationSlots": _formation_slots.duplicate(true),
		"hasFacilityTree": _building_tree != null and is_instance_valid(_building_tree),
		"hasUpgradeSheet": _upgrade_sheet != null and is_instance_valid(_upgrade_sheet),
		"tileId": str(_context.get("tileId", "")),
		"tileX": int(_context.get("tileX", -1)),
		"tileY": int(_context.get("tileY", -1)),
		"hubCoordinateJumpButtonVisible": _count_visible_nodes_by_name_prefix(self, "MainCityHubCoordinateJumpButton") > 0,
		"hubCoordinateJumpButtonCount": _count_visible_nodes_by_name_prefix(self, "MainCityHubCoordinateJumpButton"),
		"hubCoordinateJumpButtonToken": UI_COMPONENT_FACTORY.battle_report_coordinate_jump_button_token(),
		"hubCoordinateJumpPayloadContract": UI_COMPONENT_FACTORY.battle_report_coordinate_jump_payload_contract(),
		"hubCoordinateJumpButtonMinWidth": UI_COMPONENT_FACTORY.battle_report_coordinate_jump_button_min_size().x,
		"hubCoordinateJumpButtonMinHeight": UI_COMPONENT_FACTORY.battle_report_coordinate_jump_button_min_size().y,
		"hubCoordinateJumpButtonFontSize": UI_COMPONENT_FACTORY.battle_report_coordinate_jump_button_font_size(),
		"title": str(_context.get("title", "")),
	}
	UI_COMPONENT_FACTORY.apply_main_city_hub_card_chrome_summary(
		summary,
		_count_nodes_by_meta(self, "main_city_hub_card_chrome_token", UI_COMPONENT_FACTORY.main_city_hub_card_chrome_token())
	)
	summary["mainCityHubCardChromeToken"] = str(summary.get("mainCityHubCardChromeToken", ""))
	summary["mainCityHubCardChromeMode"] = str(summary.get("mainCityHubCardChromeMode", ""))
	summary["mainCityHubCardChromeSharedFactory"] = bool(summary.get("mainCityHubCardChromeSharedFactory", false))
	summary["mainCityHubCardChromeNodeCount"] = int(summary.get("mainCityHubCardChromeNodeCount", 0))
	summary["mainCityHubCardChromeRadius"] = int(summary.get("mainCityHubCardChromeRadius", 0))
	if _active_context_tab == "troop":
		var troop_summary := _build_troop_context_summary()
		for key in troop_summary.keys():
			summary[key] = troop_summary[key]
	UI_COMPONENT_FACTORY.apply_stage_a_shared_motion_feedback_chain_summary(summary, "MainCityHubOverlay", "main_city_world_enter")
	var _stage_a_shared_motion_trigger := str(summary.get("stageASharedMotionTrigger", ""))
	return summary

func get_visual_skin_summary() -> Dictionary:
	var compact_panel_style := _hub_panel.get_theme_stylebox("panel") as StyleBoxFlat if _hub_panel != null else null
	var compact_button_style := _hub_button.get_theme_stylebox("normal") as StyleBoxFlat if _hub_button != null else null
	var title_color := _title_label.get_theme_color("font_color") if _title_label != null else Color.BLACK
	var subtitle_color := _subtitle_label.get_theme_color("font_color") if _subtitle_label != null else Color.BLACK
	var panel_bg := compact_panel_style.bg_color if compact_panel_style != null else Color.BLACK
	var button_bg := compact_button_style.bg_color if compact_button_style != null else Color.BLACK
	var panel_light_ok := compact_panel_style != null and panel_bg.r >= 0.72 and panel_bg.g >= 0.66 and panel_bg.b >= 0.50 and panel_bg.a <= 0.94
	var button_light_ok := compact_button_style != null and button_bg.r >= 0.74 and button_bg.g >= 0.68 and button_bg.b >= 0.52
	var text_dark_ok := title_color.r <= 0.42 and title_color.g <= 0.34 and title_color.b <= 0.24 and subtitle_color.r <= 0.52
	var contract_ok := panel_light_ok and button_light_ok and text_dark_ok
	return {
		"ok": contract_ok,
		"hubCompactPaperOk": contract_ok,
		"hubCompactPanelLightOk": panel_light_ok,
		"hubCompactButtonLightOk": button_light_ok,
		"hubCompactTextDarkOk": text_dark_ok,
		"hubCompactPanelBg": _color_to_summary(panel_bg),
		"hubCompactButtonBg": _color_to_summary(button_bg),
		"hubCompactTitleColor": _color_to_summary(title_color),
		"hubCompactSubtitleColor": _color_to_summary(subtitle_color),
	}


func open_world_anchor_entry(next_context: Dictionary = {}) -> void:
	if not next_context.is_empty():
		set_context(next_context)
	_expanded = false
	if _context_backdrop != null:
		_context_backdrop.visible = false
	if _context_panel != null:
		_context_panel.visible = false
	_set_world_anchor_entry_visible(true, true)


func request_entry(action_id: String) -> void:
	var normalized := action_id.strip_edges()
	if normalized == "":
		return
	_set_world_anchor_entry_visible(false)
	set_expanded(false)
	hub_entry_requested.emit(normalized)


func select_context_tab(tab_id: String) -> void:
	var normalized := tab_id.strip_edges()
	if normalized == "":
		normalized = "overview"
	if not _expanded:
		set_expanded(true)
	_select_context_tab(normalized)


func assign_preview_general(general_id: String = "") -> bool:
	var resolved_general_id := general_id.strip_edges()
	if resolved_general_id == "":
		resolved_general_id = str(PREVIEW_GENERALS[0].get("id", ""))
	var general := _find_preview_general(resolved_general_id)
	if general.is_empty():
		return false
	_assign_preview_general_to_slot(resolved_general_id)
	_select_context_tab("troop")
	return true


func _build_view() -> void:
	_hub_panel = PanelContainer.new()
	_hub_panel.name = "MainCityHubPanel"
	_hub_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hub_panel.set_anchors_preset(Control.PRESET_TOP_LEFT)
	_hub_panel.custom_minimum_size = HUB_SIZE
	_hub_panel.size = HUB_SIZE
	_hub_panel.visible = COMPACT_HUB_BUTTON_VISIBLE
	_hub_panel.add_theme_stylebox_override("panel", _make_panel_style(PAPER_PANEL_BG, PAPER_PANEL_BORDER, 1))
	add_child(_hub_panel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 6)
	margin.add_theme_constant_override("margin_right", 6)
	margin.add_theme_constant_override("margin_top", 5)
	margin.add_theme_constant_override("margin_bottom", 5)
	_hub_panel.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 4)
	margin.add_child(column)

	_title_label = Label.new()
	_title_label.text = "主城中枢"
	_title_label.visible = false
	_title_label.add_theme_font_size_override("font_size", 16)
	_title_label.add_theme_color_override("font_color", PAPER_TEXT)
	column.add_child(_title_label)

	_subtitle_label = Label.new()
	_subtitle_label.text = "内政 / 招募 / 武将 / 战法 / 同盟 / AI / 部队"
	_subtitle_label.visible = false
	_subtitle_label.add_theme_font_size_override("font_size", 10)
	_subtitle_label.add_theme_color_override("font_color", PAPER_MUTED_TEXT)
	_subtitle_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(_subtitle_label)

	_hub_button = Button.new()
	_hub_button.name = "MainCityHubButton"
	_hub_button.text = "主城"
	_hub_button.focus_mode = Control.FOCUS_NONE
	_hub_button.mouse_filter = Control.MOUSE_FILTER_STOP
	_hub_button.custom_minimum_size = Vector2(92.0, 28.0)
	_apply_light_paper_button_style(_hub_button)
	_hub_button.pressed.connect(_on_hub_button_pressed)
	column.add_child(_hub_button)

	_entry_panel = PanelContainer.new()
	_entry_panel.name = "MainCityHubEntryPanel"
	_entry_panel.visible = false
	_entry_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	_entry_panel.set_anchors_preset(Control.PRESET_TOP_LEFT)
	_entry_panel.custom_minimum_size = WORLD_ASSET_ENTRY_POPOVER_SIZE
	_entry_panel.size = WORLD_ASSET_ENTRY_POPOVER_SIZE
	_entry_panel.set_meta("main_city_hub_card_chrome_token", UI_COMPONENT_FACTORY.main_city_hub_card_chrome_token())
	UI_COMPONENT_FACTORY.apply_main_city_hub_card_chrome(_entry_panel, "world_entry_popover")
	add_child(_entry_panel)

	var entry_margin := MarginContainer.new()
	entry_margin.add_theme_constant_override("margin_left", 12)
	entry_margin.add_theme_constant_override("margin_right", 12)
	entry_margin.add_theme_constant_override("margin_top", 10)
	entry_margin.add_theme_constant_override("margin_bottom", 10)
	_entry_panel.add_child(entry_margin)

	var entry_col := VBoxContainer.new()
	entry_col.add_theme_constant_override("separation", 8)
	entry_margin.add_child(entry_col)

	var entry_title := _make_context_label("主城", 20)
	entry_title.name = "MainCityWorldEntryTitle"
	entry_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	entry_col.add_child(entry_title)

	var entry_hint := _make_context_label("点击进入主城空间", 12, true)
	entry_hint.name = "MainCityWorldEntryHint"
	entry_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	entry_hint.add_theme_color_override("font_color", Color(0.92, 0.84, 0.66, 0.90))
	entry_col.add_child(entry_hint)

	_world_enter_button = Button.new()
	var button := _world_enter_button
	button.name = "MainCityWorldEnterButton"
	button.text = "进入主城"
	button.focus_mode = Control.FOCUS_NONE
	button.mouse_filter = Control.MOUSE_FILTER_STOP
	button.custom_minimum_size = Vector2(138.0, 44.0)
	button.tooltip_text = "进入主城空间"
	button.set_meta("main_city_world_asset_entry_button_token", WORLD_ASSET_ENTRY_BUTTON_TOKEN)
	button.set_meta("main_city_world_asset_entry_action_id", "main_city_world_enter")
	_apply_world_anchor_entry_button_style(button, true)
	button.pressed.connect(_on_world_enter_button_pressed)
	entry_col.add_child(button)

	_build_context_panel()


func _build_context_panel() -> void:
	_context_backdrop = ColorRect.new()
	_context_backdrop.name = "MainCityContextBackdrop"
	_context_backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	_context_backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_context_backdrop.visible = false
	_context_backdrop.color = Color(0.0, 0.0, 0.0, 0.0)
	add_child(_context_backdrop)

	_context_panel = PanelContainer.new()
	_context_panel.name = "MainCityContextPanel"
	_context_panel.visible = false
	_context_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	_context_panel.custom_minimum_size = CONTEXT_PANEL_SIZE
	_context_panel.size = CONTEXT_PANEL_SIZE
	_context_panel.set_meta("main_city_hub_card_chrome_token", UI_COMPONENT_FACTORY.main_city_hub_card_chrome_token())
	UI_COMPONENT_FACTORY.apply_main_city_hub_card_chrome(_context_panel, "context_panel")
	add_child(_context_panel)

	_context_margin = MarginContainer.new()
	_context_margin.add_theme_constant_override("margin_left", 18)
	_context_margin.add_theme_constant_override("margin_top", 16)
	_context_margin.add_theme_constant_override("margin_right", 18)
	_context_margin.add_theme_constant_override("margin_bottom", 16)
	_context_panel.add_child(_context_margin)

	var root := VBoxContainer.new()
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_theme_constant_override("separation", 12)
	_context_margin.add_child(root)

	_context_header = HBoxContainer.new()
	_context_header.add_theme_constant_override("separation", 12)
	root.add_child(_context_header)

	var title_box := VBoxContainer.new()
	title_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_box.add_theme_constant_override("separation", 2)
	_context_header.add_child(title_box)

	_context_title_label = Label.new()
	_context_title_label.text = str(_context.get("title", "主城中枢"))
	_context_title_label.add_theme_font_size_override("font_size", 30)
	_context_title_label.add_theme_color_override("font_color", Color(1.0, 0.84, 0.42, 1.0))
	title_box.add_child(_context_title_label)

	_context_subtitle_label = Label.new()
	_context_subtitle_label.text = "主城空间"
	_context_subtitle_label.add_theme_font_size_override("font_size", 13)
	_context_subtitle_label.add_theme_color_override("font_color", Color(0.92, 0.88, 0.74, 0.96))
	_context_subtitle_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	title_box.add_child(_context_subtitle_label)

	_reduced_motion_button = _make_context_action_button(REDUCED_MOTION_SKIP_PLAYER_LABEL)
	_reduced_motion_button.name = "MainCityReducedMotionSkipButton"
	_reduced_motion_button.tooltip_text = "减少主城转场动效"
	_reduced_motion_button.toggle_mode = true
	_reduced_motion_button.button_pressed = _reduced_motion_enabled
	_reduced_motion_button.set_meta("main_city_reduced_motion_skip_button_token", REDUCED_MOTION_SKIP_BUTTON_TOKEN)
	_reduced_motion_button.set_meta("main_city_reduced_motion_skip_action_id", REDUCED_MOTION_SKIP_ACTION_ID)
	_reduced_motion_button.set_meta("main_city_reduced_motion_skip_player_label", REDUCED_MOTION_SKIP_PLAYER_LABEL)
	_reduced_motion_button.pressed.connect(_on_reduced_motion_button_pressed)
	_context_header.add_child(_reduced_motion_button)

	var close_button := _make_context_action_button("返回地图")
	close_button.name = "MainCityContextReturnMapButton"
	close_button.set_meta("main_city_context_return_button_token", MAIN_CITY_CONTEXT_RETURN_BUTTON_TOKEN)
	close_button.set_meta("main_city_context_return_action_id", "main_city_context_return_map")
	close_button.set_meta("main_city_context_return_live_text_contract", MAIN_CITY_CONTEXT_RETURN_LIVE_TEXT_CONTRACT)
	close_button.set_meta("main_city_context_return_live_text_label", "返回地图")
	close_button.custom_minimum_size = Vector2(94.0, 38.0)
	_apply_scene_return_map_button_style(close_button)
	close_button.pressed.connect(func() -> void:
		set_expanded(false)
	)
	_context_header.add_child(close_button)

	_context_anchor_band_host = VBoxContainer.new()
	_context_anchor_band_host.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_context_anchor_band_host.visible = false
	root.add_child(_context_anchor_band_host)

	_context_tab_row = HBoxContainer.new()
	_context_tab_row.add_theme_constant_override("separation", 8)
	_context_tab_row.visible = false
	root.add_child(_context_tab_row)
	for tab in CONTEXT_TABS:
		var tab_id := str(tab.get("id", ""))
		var button := _make_context_tab_button(str(tab.get("label", tab_id)))
		button.pressed.connect(func() -> void:
			_select_context_tab(tab_id)
		)
		_context_tab_buttons[tab_id] = button
		_context_tab_row.add_child(button)

	_context_content_host = VBoxContainer.new()
	_context_content_host.name = "ContextContentHost"
	_context_content_host.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_context_content_host.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_context_content_host.add_theme_constant_override("separation", 10)
	root.add_child(_context_content_host)

	_enter_transition_mask = ColorRect.new()
	_enter_transition_mask.name = "MainCityEnterTransitionMask"
	_enter_transition_mask.set_meta("main_city_enter_transition_mask_token", ENTER_TRANSITION_MASK_TOKEN)
	_enter_transition_mask.set_anchors_preset(Control.PRESET_FULL_RECT)
	_enter_transition_mask.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_enter_transition_mask.visible = false
	_enter_transition_mask.color = Color(0.0, 0.0, 0.0, 0.0)
	_enter_transition_mask.z_index = 40
	add_child(_enter_transition_mask)


func _make_panel_style(bg: Color, border: Color, border_width: int) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = border
	style.border_width_left = border_width
	style.border_width_right = border_width
	style.border_width_top = border_width
	style.border_width_bottom = border_width
	style.corner_radius_top_left = 6
	style.corner_radius_top_right = 6
	style.corner_radius_bottom_left = 6
	style.corner_radius_bottom_right = 6
	return style

func _apply_light_paper_button_style(button: Button) -> void:
	if button == null:
		return
	button.flat = false
	button.add_theme_stylebox_override("normal", _make_panel_style(Color(0.93, 0.88, 0.76, 0.92), Color(0.62, 0.44, 0.24, 0.62), 1))
	button.add_theme_stylebox_override("hover", _make_panel_style(Color(0.98, 0.94, 0.84, 0.96), Color(0.74, 0.52, 0.27, 0.82), 1))
	button.add_theme_stylebox_override("pressed", _make_panel_style(Color(0.82, 0.75, 0.62, 0.96), Color(0.52, 0.36, 0.20, 0.82), 1))
	button.add_theme_stylebox_override("disabled", _make_panel_style(Color(0.82, 0.78, 0.68, 0.62), Color(0.52, 0.45, 0.34, 0.42), 1))
	button.add_theme_color_override("font_color", PAPER_TEXT)
	button.add_theme_color_override("font_hover_color", Color(0.13, 0.22, 0.14, 0.98))
	button.add_theme_color_override("font_pressed_color", Color(0.14, 0.10, 0.06, 0.98))
	button.add_theme_color_override("font_disabled_color", Color(0.42, 0.36, 0.28, 0.70))


func _apply_world_anchor_entry_button_style(button: Button, primary: bool) -> void:
	if button == null:
		return
	button.flat = false
	button.add_theme_font_size_override("font_size", 18 if primary else 16)
	button.add_theme_color_override("font_color", Color(1.0, 0.89, 0.58, 1.0))
	button.add_theme_color_override("font_hover_color", Color(1.0, 0.96, 0.74, 1.0))
	button.add_theme_color_override("font_pressed_color", Color(1.0, 0.84, 0.42, 1.0))
	button.add_theme_stylebox_override("normal", _make_panel_style(Color(0.36, 0.15, 0.070, 0.96) if primary else Color(0.145, 0.105, 0.070, 0.92), Color(1.0, 0.70, 0.32, 0.88), 2 if primary else 1))
	button.add_theme_stylebox_override("hover", _make_panel_style(Color(0.48, 0.20, 0.080, 0.98) if primary else Color(0.210, 0.145, 0.080, 0.96), Color(1.0, 0.82, 0.42, 0.98), 2))
	button.add_theme_stylebox_override("pressed", _make_panel_style(Color(0.28, 0.11, 0.052, 0.98), Color(1.0, 0.88, 0.52, 1.0), 2))

func _color_to_summary(color: Color) -> Dictionary:
	return {
		"r": snapped(color.r, 0.001),
		"g": snapped(color.g, 0.001),
		"b": snapped(color.b, 0.001),
		"a": snapped(color.a, 0.001),
	}


func _make_panel_style_with_margins(bg: Color, border: Color, border_width: int, content_margin: int = 10) -> StyleBoxFlat:
	var style := _make_panel_style(bg, border, border_width)
	style.content_margin_left = content_margin
	style.content_margin_right = content_margin
	style.content_margin_top = content_margin
	style.content_margin_bottom = content_margin
	return style


func _make_context_action_button(label: String) -> Button:
	var button := Button.new()
	button.text = label
	button.focus_mode = Control.FOCUS_NONE
	button.custom_minimum_size = Vector2(126.0, 50.0)
	button.add_theme_font_size_override("font_size", 16)
	button.add_theme_color_override("font_disabled_color", Color(0.78, 0.74, 0.64, 0.96))
	button.add_theme_stylebox_override("normal", _make_panel_style(Color(0.235, 0.158, 0.074, 0.94), Color(0.80, 0.58, 0.28, 0.82), 1))
	button.add_theme_stylebox_override("hover", _make_panel_style(Color(0.315, 0.205, 0.090, 0.98), Color(0.98, 0.74, 0.36, 0.96), 1))
	button.add_theme_stylebox_override("pressed", _make_panel_style(Color(0.390, 0.245, 0.095, 0.98), Color(1.00, 0.78, 0.36, 1.0), 2))
	button.add_theme_stylebox_override("disabled", _make_panel_style(Color(0.15, 0.125, 0.090, 0.92), Color(0.55, 0.42, 0.24, 0.68), 1))
	return button


func _apply_scene_return_map_button_style(button: Button) -> void:
	if button == null:
		return
	button.flat = false
	button.add_theme_font_size_override("font_size", 14)
	button.add_theme_color_override("font_color", Color(0.96, 0.89, 0.75, 0.94))
	button.add_theme_color_override("font_hover_color", Color(1.0, 0.96, 0.82, 0.98))
	button.add_theme_color_override("font_pressed_color", Color(1.0, 0.86, 0.56, 1.0))
	button.add_theme_color_override("font_disabled_color", Color(0.76, 0.72, 0.63, 0.86))
	button.add_theme_stylebox_override("normal", _make_panel_style(Color(0.15, 0.12, 0.086, 0.72), Color(0.62, 0.47, 0.26, 0.60), 1))
	button.add_theme_stylebox_override("hover", _make_panel_style(Color(0.20, 0.15, 0.10, 0.86), Color(0.82, 0.62, 0.30, 0.76), 1))
	button.add_theme_stylebox_override("pressed", _make_panel_style(Color(0.26, 0.18, 0.10, 0.92), Color(1.0, 0.76, 0.34, 0.88), 1))
	button.add_theme_stylebox_override("disabled", _make_panel_style(Color(0.13, 0.11, 0.09, 0.54), Color(0.50, 0.40, 0.28, 0.42), 1))


func _make_context_tab_button(label: String) -> Button:
	var button := Button.new()
	button.text = label
	button.toggle_mode = true
	button.focus_mode = Control.FOCUS_NONE
	button.custom_minimum_size = Vector2(118.0, 36.0)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.add_theme_font_size_override("font_size", 14)
	button.add_theme_stylebox_override("normal", _make_panel_style(Color(0.12, 0.11, 0.09, 0.90), Color(0.36, 0.30, 0.18, 0.78), 1))
	button.add_theme_stylebox_override("hover", _make_panel_style(Color(0.18, 0.15, 0.10, 0.96), Color(0.72, 0.54, 0.24, 0.88), 1))
	button.add_theme_stylebox_override("pressed", _make_panel_style(Color(0.34, 0.22, 0.09, 0.98), Color(0.98, 0.76, 0.32, 0.96), 1))
	return button


func _make_context_label(text: String, font_size: int = 14, wrap: bool = false) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", Color(0.90, 0.90, 0.86, 0.98))
	if wrap:
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	return label


func _make_context_panel(bg: Color = Color(0.05, 0.052, 0.058, 0.92), border: Color = Color(0.38, 0.34, 0.24, 0.62)) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.add_theme_stylebox_override("panel", _make_panel_style(bg, border, 1))
	return panel


func _select_context_tab(tab_id: String) -> void:
	var normalized := tab_id.strip_edges()
	if normalized == "":
		normalized = "overview"
	if not ["overview", "troop", "facility", "building_tree"].has(normalized):
		normalized = "overview"
	var previous_tab := _active_context_tab
	if normalized == "troop" and previous_tab != "troop":
		_active_team_id = ""
	_active_context_tab = normalized
	_clear_context_content()
	_refresh_context_anchor_band()
	_update_context_tab_buttons()
	match _active_context_tab:
		"troop":
			_context_content_host.add_child(_build_context_troop_view())
		"facility":
			_context_content_host.add_child(_build_context_facility_view())
		"building_tree":
			_context_content_host.add_child(_build_context_building_tree_view())
		_:
			_context_content_host.add_child(_build_context_overview())
	_update_context_panel_chrome()
	_update_position()
	call_deferred("_play_context_content_intro")


func _clear_context_content() -> void:
	_building_tree = null
	_upgrade_sheet = null
	if _context_content_host == null:
		return
	for child in _context_content_host.get_children():
		child.queue_free()


func _refresh_context_anchor_band() -> void:
	if _context_anchor_band_host == null:
		return
	for child in _context_anchor_band_host.get_children():
		child.queue_free()
	_context_anchor_band_host.add_child(_build_context_anchor_band())


func _build_context_anchor_band() -> Control:
	var band := _make_context_panel(Color(0.070, 0.060, 0.046, 0.58), Color(0.65, 0.50, 0.27, 0.44))
	band.custom_minimum_size = Vector2(0.0, 34.0)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_top", 6)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_bottom", 6)
	band.add_child(margin)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	margin.add_child(row)
	var route_items := ["地图节点", str(_context.get("title", "青石城"))]
	match _active_context_tab:
		"troop":
			route_items.append("城门集结线")
		"facility":
			route_items.append("%s节点" % _active_facility_label())
		"building_tree":
			route_items.append("%s建筑树" % _active_facility_label())
		_:
			route_items.append("主府中轴")
	for index in route_items.size():
		if index > 0:
			var arrow := _make_context_label(">", 12)
			arrow.add_theme_color_override("font_color", Color(0.82, 0.66, 0.38, 0.88))
			row.add_child(arrow)
		var chip := _make_context_panel(Color(0.16, 0.12, 0.075, 0.70), Color(0.62, 0.48, 0.26, 0.52))
		chip.custom_minimum_size = Vector2(112.0, 22.0)
		var label := _make_context_label(str(route_items[index]), 11)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		chip.add_child(label)
		row.add_child(chip)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(spacer)
	var tile_label := _make_context_label("Lv%s | %s" % [str(_context.get("cityLevel", 6)), str(_context.get("factionId", "player"))], 11)
	tile_label.add_theme_color_override("font_color", Color(0.88, 0.80, 0.62, 0.78))
	row.add_child(tile_label)
	return band


func _update_context_tab_buttons() -> void:
	for tab_id_variant in _context_tab_buttons.keys():
		var tab_id := str(tab_id_variant)
		var button := _context_tab_buttons.get(tab_id_variant) as Button
		if button != null:
			button.button_pressed = tab_id == _active_context_tab


func _build_context_overview() -> Control:
	return _build_city_space_gateway()


func _build_city_space_gateway() -> Control:
	var viewport_size := get_viewport_rect().size
	var compact := viewport_size.x < 1100.0 or viewport_size.y < 650.0
	var mobile := _is_main_city_mobile_viewport(viewport_size)
	var stage := Panel.new()
	stage.name = "MainCityEnteredSpaceStage"
	stage.set_meta("main_city_entered_space_stage_layout_token", ENTERED_SPACE_STAGE_LAYOUT_TOKEN)
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stage.clip_contents = true
	stage.set_meta("main_city_hub_card_chrome_token", UI_COMPONENT_FACTORY.main_city_hub_card_chrome_token())
	UI_COMPONENT_FACTORY.apply_main_city_hub_card_chrome(stage, "city_space_stage")

	var background := TextureRect.new()
	background.name = "MainCitySceneBackdrop"
	background.set_anchors_preset(Control.PRESET_FULL_RECT)
	background.offset_left = 0.0
	background.offset_top = 0.0
	background.offset_right = 0.0
	background.offset_bottom = 0.0
	background.texture = _load_context_texture(INTERIOR_HOME_LOBBY_BACKGROUND_PATH)
	background.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	background.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	background.modulate = Color(0.96, 0.82, 0.58, 0.64)
	stage.add_child(background)

	var shade := ColorRect.new()
	shade.name = "MainCitySceneWarmShade"
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.color = Color(0.040, 0.023, 0.012, 0.58)
	stage.add_child(shade)

	var gate_vignette := ColorRect.new()
	gate_vignette.name = "MainCitySceneGateVignette"
	gate_vignette.set_anchors_preset(Control.PRESET_FULL_RECT)
	gate_vignette.color = Color(0.0, 0.0, 0.0, 0.22)
	stage.add_child(gate_vignette)

	_add_city_slg_camera_depth_layers(stage, compact)
	_add_city_living_space_building_layer(stage, compact)
	_add_city_living_space_atmosphere(stage, compact)
	_add_city_gatehouse_transition_layer(stage, compact)

	var stage_title := VBoxContainer.new()
	stage_title.name = "MainCitySceneStageTitle"
	stage_title.z_index = 20
	stage_title.set_anchors_preset(Control.PRESET_TOP_LEFT)
	stage_title.offset_left = 26.0
	stage_title.offset_top = 18.0
	stage_title.offset_right = 224.0 if mobile else 360.0
	stage_title.offset_bottom = 92.0
	stage_title.add_theme_constant_override("separation", 2)
	stage.add_child(stage_title)
	var title_label := _make_context_label(str(_context.get("title", "青石城")), 26 if mobile else (30 if compact else 34))
	title_label.add_theme_color_override("font_color", Color(1.0, 0.83, 0.34, 1.0))
	stage_title.add_child(title_label)
	var subtitle_label := _make_context_label("主城空间", 12 if mobile else (14 if compact else 16))
	subtitle_label.add_theme_color_override("font_color", Color(0.95, 0.88, 0.70, 0.96))
	stage_title.add_child(subtitle_label)

	var stage_return_button := _make_context_action_button("返回地图")
	stage_return_button.name = "MainCitySceneReturnMapButton"
	stage_return_button.custom_minimum_size = Vector2(92.0, 36.0) if mobile else Vector2(100.0, 38.0)
	stage_return_button.set_meta("main_city_scene_return_button_token", MAIN_CITY_SCENE_RETURN_BUTTON_TOKEN)
	stage_return_button.set_meta("main_city_scene_return_action_id", "main_city_scene_return_map")
	stage_return_button.set_meta("main_city_scene_return_live_text_contract", MAIN_CITY_SCENE_RETURN_LIVE_TEXT_CONTRACT)
	stage_return_button.set_meta("main_city_scene_return_live_text_label", "返回地图")
	stage_return_button.set_meta("close_back_button_spec_token", CLOSE_BACK_BUTTON_SPEC_TOKEN)
	stage_return_button.set_meta("close_back_button_role", "return_map")
	stage_return_button.set_meta("close_back_button_variant", "neutral")
	stage_return_button.z_index = 22
	stage_return_button.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	stage_return_button.offset_left = -110.0 if mobile else -122.0
	stage_return_button.offset_top = 10.0 if mobile else 12.0
	stage_return_button.offset_right = -12.0 if mobile else -16.0
	stage_return_button.offset_bottom = 46.0 if mobile else 48.0
	_apply_scene_return_map_button_style(stage_return_button)
	stage_return_button.pressed.connect(func() -> void:
		set_expanded(false)
	)
	stage.add_child(stage_return_button)

	_add_city_scene_lines(stage)

	var center := CenterContainer.new()
	center.name = "MainCityModelCenter"
	center.z_index = 14
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.offset_left = 0.0
	center.offset_top = -18.0 if mobile else (-26.0 if compact else -18.0)
	center.offset_right = 0.0
	center.offset_bottom = -96.0 if mobile else (-118.0 if compact else -140.0)
	stage.add_child(center)

	var model_stack := VBoxContainer.new()
	model_stack.name = "MainCityModelStack"
	model_stack.alignment = BoxContainer.ALIGNMENT_CENTER
	model_stack.add_theme_constant_override("separation", 6 if mobile else 8)
	center.add_child(model_stack)

	var city_model_size := Vector2(340.0, 226.0) if mobile else (Vector2(470.0, 334.0) if compact else Vector2(610.0, 434.0))
	var city_model := _make_facility_scene_texture(MAIN_CITY_PRIMARY_ASSET_FILE, city_model_size)
	city_model.name = "MainCitySceneFacilityModel"
	city_model.set_meta("main_city_primary_asset_binding_token", MAIN_CITY_PRIMARY_ASSET_BINDING_TOKEN)
	city_model.set_meta("main_city_primary_asset_file", MAIN_CITY_PRIMARY_ASSET_FILE)
	city_model.z_index = 14
	model_stack.add_child(city_model)
	_add_mansion_highlight(model_stack, city_model_size)
	call_deferred("_play_city_space_stage_transition", city_model)

	var entry_row := HBoxContainer.new()
	entry_row.name = "MainCitySceneSpatialEntryDock"
	entry_row.z_index = 18
	entry_row.set_meta("main_city_entered_space_stage_layout_token", ENTERED_SPACE_STAGE_LAYOUT_TOKEN)
	entry_row.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	entry_row.offset_left = -176.0 if mobile else (-214.0 if compact else -252.0)
	entry_row.offset_right = 176.0 if mobile else (214.0 if compact else 252.0)
	entry_row.offset_top = -104.0 if mobile else (-120.0 if compact else -138.0)
	entry_row.offset_bottom = -46.0 if mobile else (-54.0 if compact else -62.0)
	entry_row.alignment = BoxContainer.ALIGNMENT_CENTER
	entry_row.add_theme_constant_override("separation", 10 if mobile else (14 if compact else 18))
	stage.add_child(entry_row)
	var entry_button_size := Vector2(164.0, 48.0) if mobile else (Vector2(182.0, 50.0) if compact else Vector2(196.0, 54.0))
	var entry_font_size := 16 if mobile else (18 if compact else 20)
	entry_row.add_child(_make_scene_entry_button("部队编组", "troop", entry_button_size, entry_font_size))
	entry_row.add_child(_make_scene_entry_button("建筑树", "building_tree", entry_button_size, entry_font_size))

	return stage


func _add_city_slg_camera_depth_layers(stage: Control, compact: bool) -> void:
	var background := ColorRect.new()
	background.name = "MainCityCameraBackgroundCitySilhouette"
	background.set_meta("main_city_slg_camera_depth_layer_token", SLG_CAMERA_DEPTH_LAYER_TOKEN)
	background.set_anchors_preset(Control.PRESET_TOP_WIDE)
	background.offset_left = 88.0 if compact else 150.0
	background.offset_top = 126.0 if compact else 138.0
	background.offset_right = -88.0 if compact else -150.0
	background.offset_bottom = 214.0 if compact else 252.0
	background.color = Color(0.27, 0.18, 0.09, 0.08)
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stage.add_child(background)

	var midground := ColorRect.new()
	midground.name = "MainCityCameraMidgroundMarketBand"
	midground.set_meta("main_city_slg_camera_depth_layer_token", SLG_CAMERA_DEPTH_LAYER_TOKEN)
	midground.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	midground.offset_left = 88.0 if compact else 136.0
	midground.offset_top = -190.0 if compact else -220.0
	midground.offset_right = -88.0 if compact else -136.0
	midground.offset_bottom = -126.0 if compact else -142.0
	midground.color = Color(0.64, 0.42, 0.18, 0.07)
	midground.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stage.add_child(midground)

	var left_foreground := ColorRect.new()
	left_foreground.name = "MainCityCameraForegroundLeftGate"
	left_foreground.set_meta("main_city_slg_camera_depth_layer_token", SLG_CAMERA_DEPTH_LAYER_TOKEN)
	left_foreground.set_anchors_preset(Control.PRESET_LEFT_WIDE)
	left_foreground.offset_left = 0.0
	left_foreground.offset_top = 130.0 if compact else 150.0
	left_foreground.offset_right = 74.0 if compact else 112.0
	left_foreground.offset_bottom = -120.0 if compact else -140.0
	left_foreground.color = Color(0.09, 0.055, 0.025, 0.46)
	left_foreground.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stage.add_child(left_foreground)

	var right_foreground := ColorRect.new()
	right_foreground.name = "MainCityCameraForegroundRightGate"
	right_foreground.set_meta("main_city_slg_camera_depth_layer_token", SLG_CAMERA_DEPTH_LAYER_TOKEN)
	right_foreground.set_anchors_preset(Control.PRESET_RIGHT_WIDE)
	right_foreground.offset_left = -74.0 if compact else -112.0
	right_foreground.offset_top = 130.0 if compact else 150.0
	right_foreground.offset_right = 0.0
	right_foreground.offset_bottom = -120.0 if compact else -140.0
	right_foreground.color = Color(0.09, 0.055, 0.025, 0.46)
	right_foreground.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stage.add_child(right_foreground)

	var rail := Line2D.new()
	rail.name = "MainCityCameraLensRail"
	rail.set_meta("main_city_slg_camera_rail_token", SLG_CAMERA_RAIL_TOKEN)
	var viewport_size := get_viewport_rect().size
	var center_x := viewport_size.x * 0.5
	rail.points = PackedVector2Array([
		Vector2(center_x, viewport_size.y * 0.28),
		Vector2(center_x - viewport_size.x * 0.28, viewport_size.y * 0.86),
		Vector2(center_x + viewport_size.x * 0.28, viewport_size.y * 0.86),
	])
	rail.width = 3.0
	rail.default_color = Color(1.0, 0.78, 0.34, 0.16)
	rail.z_index = 2
	stage.add_child(rail)

	var push_trail := Line2D.new()
	push_trail.name = "MainCityCameraPushTrail"
	push_trail.set_meta("main_city_slg_camera_push_trail_token", SLG_CAMERA_PUSH_TRAIL_TOKEN)
	push_trail.points = PackedVector2Array([
		Vector2(center_x, viewport_size.y * 0.31),
		Vector2(center_x, viewport_size.y * 0.62),
	])
	push_trail.width = 5.0
	push_trail.default_color = Color(1.0, 0.86, 0.46, 0.12)
	push_trail.z_index = 2
	stage.add_child(push_trail)

	var push_marker := ColorRect.new()
	push_marker.name = "MainCityCameraPushMarker"
	push_marker.set_meta("main_city_slg_camera_push_marker_token", SLG_CAMERA_PUSH_MARKER_TOKEN)
	push_marker.set_anchors_preset(Control.PRESET_TOP_LEFT)
	push_marker.offset_left = center_x - 7.0
	push_marker.offset_top = viewport_size.y * 0.31
	push_marker.offset_right = center_x + 7.0
	push_marker.offset_bottom = viewport_size.y * 0.31 + 14.0
	push_marker.color = Color(1.0, 0.88, 0.42, 0.28)
	push_marker.mouse_filter = Control.MOUSE_FILTER_IGNORE
	push_marker.z_index = 3
	stage.add_child(push_marker)

	var settle_halo := ColorRect.new()
	settle_halo.name = "MainCityCameraPushSettleHalo"
	settle_halo.set_meta("main_city_slg_camera_push_marker_token", SLG_CAMERA_PUSH_MARKER_TOKEN)
	settle_halo.set_anchors_preset(Control.PRESET_TOP_LEFT)
	settle_halo.offset_left = center_x - 42.0
	settle_halo.offset_top = viewport_size.y * 0.61
	settle_halo.offset_right = center_x + 42.0
	settle_halo.offset_bottom = viewport_size.y * 0.61 + 18.0
	settle_halo.color = Color(1.0, 0.75, 0.30, 0.08)
	settle_halo.mouse_filter = Control.MOUSE_FILTER_IGNORE
	settle_halo.z_index = 2
	stage.add_child(settle_halo)
	call_deferred("_play_city_slg_camera_depth_transition", stage)


func _add_city_living_space_atmosphere(stage: Control, compact: bool) -> void:
	var market := ColorRect.new()
	market.name = "MainCityLivingMarketStallBand"
	market.set_meta("main_city_living_market_token", LIVING_SPACE_MARKET_TOKEN)
	market.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	market.offset_left = 144.0 if compact else 220.0
	market.offset_top = -172.0 if compact else -194.0
	market.offset_right = 286.0 if compact else 398.0
	market.offset_bottom = -146.0 if compact else -166.0
	market.color = Color(0.74, 0.48, 0.20, 0.16)
	market.mouse_filter = Control.MOUSE_FILTER_IGNORE
	market.z_index = 2
	stage.add_child(market)

	var crowd := HBoxContainer.new()
	crowd.name = "MainCityLivingCrowdFlow"
	crowd.set_meta("main_city_living_crowd_token", LIVING_SPACE_CROWD_TOKEN)
	crowd.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	crowd.offset_left = 210.0 if compact else 290.0
	crowd.offset_top = -176.0 if compact else -202.0
	crowd.offset_right = -210.0 if compact else -290.0
	crowd.offset_bottom = -138.0 if compact else -158.0
	crowd.alignment = BoxContainer.ALIGNMENT_CENTER
	crowd.add_theme_constant_override("separation", 10 if compact else 14)
	crowd.mouse_filter = Control.MOUSE_FILTER_IGNORE
	crowd.z_index = 8
	stage.add_child(crowd)
	var crowd_count := 5 if compact else 7
	for index in range(crowd_count):
		var worker := ColorRect.new()
		worker.name = "MainCityLivingWorkerSilhouette_%d" % index
		worker.set_meta("main_city_living_crowd_token", LIVING_SPACE_CROWD_TOKEN)
		worker.custom_minimum_size = Vector2(10.0, 22.0 + float(index % 2) * 4.0)
		worker.color = Color(0.12, 0.075, 0.035, 0.72)
		worker.mouse_filter = Control.MOUSE_FILTER_IGNORE
		crowd.add_child(worker)

	var economy_label := Label.new()
	economy_label.name = "MainCityLivingEconomyCueLabel"
	economy_label.set_meta("main_city_living_economy_token", LIVING_SPACE_ECONOMY_TOKEN)
	economy_label.text = "粮税入库"
	economy_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	economy_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	economy_label.add_theme_font_size_override("font_size", 15 if compact else 17)
	economy_label.add_theme_color_override("font_color", Color(1.0, 0.86, 0.44, 0.96))
	economy_label.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	economy_label.offset_left = -288.0 if compact else -340.0
	economy_label.offset_top = -202.0 if compact else -238.0
	economy_label.offset_right = -112.0 if compact else -140.0
	economy_label.offset_bottom = -166.0 if compact else -196.0
	economy_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	economy_label.z_index = 9
	stage.add_child(economy_label)

	call_deferred("_play_city_living_space_atmosphere", stage)


func _add_city_living_space_building_layer(stage: Control, compact: bool) -> void:
	var building_band := ColorRect.new()
	building_band.name = "MainCityLivingBuildingFacadeBand"
	building_band.set_meta("main_city_living_building_token", LIVING_SPACE_BUILDING_TOKEN)
	building_band.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	building_band.offset_left = 258.0 if compact else 300.0
	building_band.offset_top = -286.0 if compact else -318.0
	building_band.offset_right = -258.0 if compact else -300.0
	building_band.offset_bottom = -188.0 if compact else -214.0
	building_band.color = Color(0.18, 0.11, 0.06, 0.12)
	building_band.mouse_filter = Control.MOUSE_FILTER_IGNORE
	building_band.z_index = 1
	stage.add_child(building_band)

	var building_row := HBoxContainer.new()
	building_row.name = "MainCityLivingBuildingRow"
	building_row.set_meta("main_city_living_building_token", LIVING_SPACE_BUILDING_TOKEN)
	building_row.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	building_row.offset_left = 272.0 if compact else 324.0
	building_row.offset_top = -256.0 if compact else -288.0
	building_row.offset_right = -272.0 if compact else -324.0
	building_row.offset_bottom = -194.0 if compact else -220.0
	building_row.alignment = BoxContainer.ALIGNMENT_CENTER
	building_row.add_theme_constant_override("separation", 8 if compact else 12)
	building_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	building_row.z_index = 2
	stage.add_child(building_row)

	var facade_count := 5 if compact else 7
	for index in range(facade_count):
		var facade := VBoxContainer.new()
		facade.name = "MainCityLivingBuildingFacade_%d" % index
		facade.set_meta("main_city_living_building_token", LIVING_SPACE_BUILDING_TOKEN)
		facade.custom_minimum_size = Vector2(26.0 + float(index % 3) * 4.0, 48.0 + float(index % 2) * 8.0)
		facade.add_theme_constant_override("separation", 1)
		facade.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var roof := ColorRect.new()
		roof.custom_minimum_size = Vector2(28.0 + float(index % 3) * 4.0, 9.0)
		roof.color = Color(0.15, 0.09, 0.05, 0.36)
		roof.mouse_filter = Control.MOUSE_FILTER_IGNORE
		facade.add_child(roof)
		var body := ColorRect.new()
		body.custom_minimum_size = Vector2(30.0 + float(index % 3) * 5.0, 32.0 + float(index % 2) * 8.0)
		body.color = Color(0.30 + float(index % 2) * 0.04, 0.18, 0.09, 0.30)
		body.mouse_filter = Control.MOUSE_FILTER_IGNORE
		facade.add_child(body)
		var awning := ColorRect.new()
		awning.custom_minimum_size = Vector2(30.0 + float(index % 3) * 5.0, 6.0)
		awning.color = Color(0.72, 0.50 - float(index % 2) * 0.03, 0.20, 0.26)
		awning.mouse_filter = Control.MOUSE_FILTER_IGNORE
		facade.add_child(awning)
		building_row.add_child(facade)


func _add_city_gatehouse_transition_layer(stage: Control, compact: bool) -> void:
	var gate_layer := Control.new()
	gate_layer.name = "MainCitySceneGatehouseTransitionLayer"
	gate_layer.set_meta("main_city_gatehouse_transition_token", ENTERED_SPACE_GATEHOUSE_TRANSITION_TOKEN)
	gate_layer.set_anchors_preset(Control.PRESET_FULL_RECT)
	gate_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	gate_layer.z_index = 3
	stage.add_child(gate_layer)

	var gate_shadow := ColorRect.new()
	gate_shadow.name = "MainCitySceneGatehouseShadow"
	gate_shadow.set_anchors_preset(Control.PRESET_TOP_WIDE)
	gate_shadow.offset_left = 150.0 if compact else 210.0
	gate_shadow.offset_top = 76.0 if compact else 82.0
	gate_shadow.offset_right = -150.0 if compact else -210.0
	gate_shadow.offset_bottom = 250.0 if compact else 292.0
	gate_shadow.color = Color(0.030, 0.018, 0.010, 0.12)
	gate_layer.add_child(gate_shadow)

	var left_pillar := ColorRect.new()
	left_pillar.name = "MainCitySceneGatehouseLeftPillar"
	left_pillar.set_anchors_preset(Control.PRESET_TOP_LEFT)
	left_pillar.offset_left = 142.0 if compact else 206.0
	left_pillar.offset_top = 88.0 if compact else 96.0
	left_pillar.offset_right = 174.0 if compact else 246.0
	left_pillar.offset_bottom = 360.0 if compact else 410.0
	left_pillar.color = Color(0.12, 0.075, 0.035, 0.12)
	gate_layer.add_child(left_pillar)

	var right_pillar := ColorRect.new()
	right_pillar.name = "MainCitySceneGatehouseRightPillar"
	right_pillar.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	right_pillar.offset_left = -174.0 if compact else -246.0
	right_pillar.offset_top = 88.0 if compact else 96.0
	right_pillar.offset_right = -142.0 if compact else -206.0
	right_pillar.offset_bottom = 360.0 if compact else 410.0
	right_pillar.color = Color(0.12, 0.075, 0.035, 0.12)
	gate_layer.add_child(right_pillar)

	var axis_line := Line2D.new()
	axis_line.name = "MainCitySceneCentralAxisLine"
	axis_line.set_meta("main_city_gatehouse_transition_token", ENTERED_SPACE_GATEHOUSE_TRANSITION_TOKEN)
	var viewport_size := get_viewport_rect().size
	var center_x := viewport_size.x * 0.5
	axis_line.points = PackedVector2Array([
		Vector2(center_x, viewport_size.y * 0.34),
		Vector2(center_x - viewport_size.x * 0.22, viewport_size.y * 0.82),
		Vector2(center_x + viewport_size.x * 0.22, viewport_size.y * 0.82),
		Vector2(center_x, viewport_size.y * 0.34),
	])
	axis_line.width = 2.2
	axis_line.default_color = Color(1.0, 0.70, 0.30, 0.14)
	gate_layer.add_child(axis_line)


func _add_mansion_highlight(model_stack: VBoxContainer, city_model_size: Vector2) -> void:
	var highlight := ColorRect.new()
	highlight.name = "MainCitySceneMansionHighlight"
	highlight.set_meta("main_city_mansion_highlight_token", ENTERED_SPACE_MANSION_HIGHLIGHT_TOKEN)
	highlight.custom_minimum_size = Vector2(city_model_size.x * 0.74, 10.0)
	highlight.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	highlight.color = Color(1.0, 0.72, 0.28, 0.20)
	model_stack.add_child(highlight)


func _play_city_space_stage_transition(city_model: TextureRect) -> void:
	if city_model == null or not is_instance_valid(city_model):
		return
	city_model.pivot_offset = city_model.custom_minimum_size * 0.5
	if _reduced_motion_enabled:
		city_model.modulate = Color(1.0, 1.0, 1.0, 1.0)
		city_model.scale = Vector2.ONE
		return
	city_model.modulate = Color(1.0, 0.90, 0.72, 0.82)
	city_model.scale = Vector2(0.94, 0.94)
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_SINE)
	tween.set_ease(Tween.EASE_OUT)
	tween.tween_property(city_model, "scale", Vector2.ONE, 0.24)
	tween.parallel().tween_property(city_model, "modulate", Color(1.0, 1.0, 1.0, 1.0), 0.28)


func _play_city_slg_camera_depth_transition(stage: Control) -> void:
	if stage == null or not is_instance_valid(stage):
		return
	var foreground_left := stage.get_node_or_null("MainCityCameraForegroundLeftGate") as ColorRect
	var foreground_right := stage.get_node_or_null("MainCityCameraForegroundRightGate") as ColorRect
	var midground := stage.get_node_or_null("MainCityCameraMidgroundMarketBand") as ColorRect
	var background := stage.get_node_or_null("MainCityCameraBackgroundCitySilhouette") as ColorRect
	var rail := stage.get_node_or_null("MainCityCameraLensRail") as Line2D
	var push_marker := stage.get_node_or_null("MainCityCameraPushMarker") as ColorRect
	var push_trail := stage.get_node_or_null("MainCityCameraPushTrail") as Line2D
	var settle_halo := stage.get_node_or_null("MainCityCameraPushSettleHalo") as ColorRect
	if _reduced_motion_enabled:
		for item in [foreground_left, foreground_right, midground, background, rail, push_marker, push_trail, settle_halo]:
			if item != null:
				item.modulate = Color(1.0, 1.0, 1.0, 1.0)
		if push_marker != null and settle_halo != null:
			push_marker.position = Vector2(settle_halo.position.x + settle_halo.size.x * 0.5 - push_marker.size.x * 0.5, settle_halo.position.y)
		return
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_SINE)
	tween.set_ease(Tween.EASE_OUT)
	for item in [foreground_left, foreground_right, midground, background, rail, push_marker, push_trail, settle_halo]:
		if item != null:
			item.modulate = Color(1.0, 1.0, 1.0, 0.62)
			tween.parallel().tween_property(item, "modulate", Color(1.0, 1.0, 1.0, 1.0), SLG_CAMERA_PUSH_MOTION_DURATION_SEC)
	if foreground_left != null:
		var left_start := foreground_left.position
		foreground_left.position = left_start + Vector2(-18.0, 0.0)
		tween.parallel().tween_property(foreground_left, "position", left_start, 0.34)
	if foreground_right != null:
		var right_start := foreground_right.position
		foreground_right.position = right_start + Vector2(18.0, 0.0)
		tween.parallel().tween_property(foreground_right, "position", right_start, 0.34)
	if midground != null:
		var mid_start := midground.position
		midground.position = mid_start + Vector2(0.0, 10.0)
		tween.parallel().tween_property(midground, "position", mid_start, 0.34)
	if push_marker != null and settle_halo != null:
		var push_start := push_marker.position
		var push_end := Vector2(settle_halo.position.x + settle_halo.size.x * 0.5 - push_marker.size.x * 0.5, settle_halo.position.y)
		push_marker.position = push_start + Vector2(0.0, -20.0)
		tween.parallel().tween_property(push_marker, "position", push_end, SLG_CAMERA_PUSH_MOTION_DURATION_SEC)


func _play_city_living_space_atmosphere(stage: Control) -> void:
	if stage == null or not is_instance_valid(stage):
		return
	var market := stage.get_node_or_null("MainCityLivingMarketStallBand") as ColorRect
	var crowd := stage.get_node_or_null("MainCityLivingCrowdFlow") as HBoxContainer
	var economy_label := stage.get_node_or_null("MainCityLivingEconomyCueLabel") as Label
	if _reduced_motion_enabled:
		for item in [market, crowd, economy_label]:
			if item != null:
				item.modulate = Color(1.0, 1.0, 1.0, 1.0)
		return
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_SINE)
	tween.set_ease(Tween.EASE_OUT)
	for item in [market, crowd, economy_label]:
		if item != null:
			item.modulate = Color(1.0, 1.0, 1.0, 0.58)
			tween.parallel().tween_property(item, "modulate", Color(1.0, 1.0, 1.0, 1.0), 0.42)
	if crowd != null:
		var start := crowd.position
		crowd.position = start + Vector2(-12.0, 0.0)
		tween.parallel().tween_property(crowd, "position", start, 0.42)
	if economy_label != null:
		var label_start := economy_label.position
		economy_label.position = label_start + Vector2(0.0, 8.0)
		tween.parallel().tween_property(economy_label, "position", label_start, 0.42)


func _build_coordinate_jump_info_card(compact: bool) -> Control:
	var panel := _make_context_panel(Color(0.105, 0.082, 0.058, 0.88), Color(0.70, 0.52, 0.28, 0.74))
	panel.name = "MainCityHubCoordinateInfoCard"
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	panel.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	panel.offset_left = -382.0 if compact else -430.0
	panel.offset_top = 16.0
	panel.offset_right = -18.0
	panel.offset_bottom = 120.0 if compact else 136.0

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_bottom", 10)
	panel.add_child(margin)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	margin.add_child(row)

	var meta_col := VBoxContainer.new()
	meta_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	meta_col.alignment = BoxContainer.ALIGNMENT_CENTER
	meta_col.add_theme_constant_override("separation", 5)
	row.add_child(meta_col)

	meta_col.add_child(_make_context_label("地块定位", 16 if compact else 18))
	var tile_id := str(_context.get("tileId", "")).strip_edges()
	if tile_id == "":
		tile_id = "未定位"
	meta_col.add_child(_make_context_label("地块：%s" % tile_id, 12 if compact else 13, true))
	meta_col.add_child(_make_context_label("坐标：%s" % _current_coordinate_label(), 12 if compact else 13, true))

	var button := Button.new()
	button.name = "MainCityHubCoordinateJumpButton"
	button.text = "跳转"
	button.focus_mode = Control.FOCUS_NONE
	button.mouse_filter = Control.MOUSE_FILTER_STOP
	button.tooltip_text = "跳转到主城地块坐标"
	UI_COMPONENT_FACTORY.apply_battle_report_detail_coordinate_jump_button_style(button)
	button.disabled = _build_current_coordinate_jump_payload().is_empty()
	button.pressed.connect(_on_coordinate_jump_button_pressed)
	row.add_child(button)
	return panel


func _current_coordinate_label() -> String:
	var tile_x := int(_context.get("tileX", -1))
	var tile_y := int(_context.get("tileY", -1))
	if tile_x < 0 or tile_y < 0:
		return "未定位"
	return "(%d,%d)" % [tile_x, tile_y]


func _build_current_coordinate_jump_payload() -> Dictionary:
	var tile_x := int(_context.get("tileX", -1))
	var tile_y := int(_context.get("tileY", -1))
	if tile_x < 0 or tile_y < 0:
		return {}
	return {
		"coordinate": {
			"x": tile_x,
			"y": tile_y,
			"coordinate_space": "cell_1km",
			"source": "main_city_hub",
		},
		"value": _current_coordinate_label(),
		"source": "main_city_hub",
	}


func _add_city_scene_lines(stage: Control) -> void:
	for line_points in [
		[Vector2(220, 540), Vector2(620, 318), Vector2(1020, 540)],
		[Vector2(330, 620), Vector2(800, 348), Vector2(1270, 620)],
		[Vector2(160, 650), Vector2(800, 250), Vector2(1440, 650)],
	]:
		var line := Line2D.new()
		line.points = PackedVector2Array(line_points)
		line.width = 2.0
		line.default_color = Color(0.86, 0.63, 0.30, 0.20)
		stage.add_child(line)


func _make_facility_scene_texture(file_name: String, min_size: Vector2) -> TextureRect:
	var image := TextureRect.new()
	image.custom_minimum_size = min_size
	image.texture = _load_context_texture("%s/%s" % [FACILITY_TREE_ASSET_ROOT, file_name])
	image.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	image.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	image.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	image.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return image


func _make_scene_entry_button(label: String, tab_id: String, min_size: Vector2, font_size: int) -> Button:
	var button := _make_context_action_button(label)
	button.name = "MainCityScene%sButton" % tab_id.capitalize()
	button.custom_minimum_size = min_size
	button.add_theme_font_size_override("font_size", font_size)
	button.set_meta("main_city_scene_entry_button_token", MAIN_CITY_SCENE_ENTRY_BUTTON_TOKEN)
	button.set_meta("main_city_scene_entry_action_id", "main_city_scene_entry:%s" % tab_id)
	button.set_meta("main_city_scene_entry_target_tab_id", tab_id)
	button.set_meta("main_city_scene_entry_live_text_contract", MAIN_CITY_SCENE_ENTRY_LIVE_TEXT_CONTRACT)
	button.set_meta("main_city_scene_entry_live_text_label", label)
	button.pressed.connect(func() -> void:
		_select_context_tab(tab_id)
	)
	return button


func _load_context_texture(path: String) -> Texture2D:
	var resolved := path.strip_edges()
	if resolved == "":
		return null
	if ResourceLoader.exists(resolved) and _can_load_texture_resource_without_import_cache_error(resolved):
		var resource := load(resolved)
		if resource is Texture2D:
			return resource as Texture2D
	var image_path := resolved
	if resolved.begins_with("res://"):
		image_path = ProjectSettings.globalize_path(resolved)
	var image_resource := Image.new()
	if image_resource.load(image_path) == OK:
		return ImageTexture.create_from_image(image_resource)
	return null


func _can_load_texture_resource_without_import_cache_error(texture_path: String) -> bool:
	if not texture_path.to_lower().ends_with(".png"):
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


func _load_troop_portrait_texture(asset_ref: Dictionary) -> Texture2D:
	var registry_texture := PORTRAIT_ASSET_REGISTRY.portrait_texture(asset_ref)
	if registry_texture != null:
		return registry_texture
	return _load_context_texture(str(asset_ref.get("path", "")))


func _load_troop_unit_texture(slot: Dictionary) -> Texture2D:
	var unit_ref := _snapshot_dictionary_from(slot.get("unit_asset_ref", slot.get("unitAssetRef", {})))
	var explicit_path := str(unit_ref.get("path", "")).strip_edges()
	if explicit_path != "":
		var explicit_texture := _load_context_texture(explicit_path)
		if explicit_texture != null:
			return explicit_texture
	var troop_type := str(slot.get("troop_type", slot.get("troopType", ""))).strip_edges()
	var fallback_path := str(TROOP_UNIT_UI_ASSET_BY_TYPE.get(troop_type, TROOP_UNIT_UI_ASSET_BY_TYPE.get("步兵", "")))
	return _load_context_texture(fallback_path)


func _load_troop_unit_frame_textures(slot: Dictionary) -> Array:
	var unit_ref := _snapshot_dictionary_from(slot.get("unit_asset_ref", slot.get("unitAssetRef", {})))
	var manifest_path := str(unit_ref.get("manifest", "")).strip_edges()
	if manifest_path == "":
		return []
	var direction := str(unit_ref.get("direction", TROOP_UNIT_MANIFEST_DEFAULT_DIRECTION)).strip_edges()
	if direction == "":
		direction = TROOP_UNIT_MANIFEST_DEFAULT_DIRECTION
	var visual_type := _resolve_troop_unit_visual_type(slot, unit_ref)
	if visual_type == "":
		return []
	var cache_key := "%s|%s|%s" % [manifest_path, visual_type, direction]
	if _troop_unit_texture_sequence_cache.has(cache_key):
		var cached_variant: Variant = _troop_unit_texture_sequence_cache.get(cache_key, [])
		if cached_variant is Array:
			return cached_variant as Array

	var manifest := _load_troop_unit_manifest(manifest_path)
	var visual_types_variant: Variant = manifest.get("visualTypes", {})
	var visual_types: Dictionary = {}
	if visual_types_variant is Dictionary:
		visual_types = visual_types_variant as Dictionary
	var visual_entry_variant: Variant = visual_types.get(visual_type, {})
	var visual_entry: Dictionary = {}
	if visual_entry_variant is Dictionary:
		visual_entry = visual_entry_variant as Dictionary
	var directions_variant: Variant = visual_entry.get("directions", {})
	var directions: Dictionary = {}
	if directions_variant is Dictionary:
		directions = directions_variant as Dictionary
	var frames_variant: Variant = directions.get(direction, [])
	var frames: Array = []
	if frames_variant is Array:
		frames = (frames_variant as Array).duplicate(true)
	frames.sort_custom(func(left: Variant, right: Variant) -> bool:
		if not (left is Dictionary) or not (right is Dictionary):
			return false
		return int((left as Dictionary).get("sequence", 0)) < int((right as Dictionary).get("sequence", 0))
	)

	var textures: Array = []
	for frame_variant in frames:
		if not (frame_variant is Dictionary):
			continue
		var frame: Dictionary = frame_variant as Dictionary
		var texture_path := str(frame.get("texturePath", frame.get("path", ""))).strip_edges()
		if texture_path == "":
			continue
		var texture := _load_context_texture(texture_path)
		if texture != null:
			textures.append(texture)
	_troop_unit_texture_sequence_cache[cache_key] = textures
	return textures


func _load_troop_unit_manifest(manifest_path: String) -> Dictionary:
	var resolved := manifest_path.strip_edges()
	if resolved == "":
		return {}
	if _troop_unit_manifest_cache.has(resolved):
		var cached_variant: Variant = _troop_unit_manifest_cache.get(resolved, {})
		if cached_variant is Dictionary:
			return cached_variant as Dictionary
	var file := FileAccess.open(resolved, FileAccess.READ)
	if file == null:
		_troop_unit_manifest_cache[resolved] = {}
		return {}
	var text := file.get_as_text()
	file.close()
	var parsed: Variant = JSON.parse_string(text)
	if parsed is Dictionary:
		_troop_unit_manifest_cache[resolved] = parsed as Dictionary
	else:
		_troop_unit_manifest_cache[resolved] = {}
	var manifest_variant: Variant = _troop_unit_manifest_cache.get(resolved, {})
	if manifest_variant is Dictionary:
		return manifest_variant as Dictionary
	return {}


func _resolve_troop_unit_visual_type(slot: Dictionary, unit_ref: Dictionary) -> String:
	var explicit_visual_type := str(unit_ref.get("visualType", unit_ref.get("visual_type", ""))).strip_edges()
	if explicit_visual_type != "":
		return explicit_visual_type
	var troop_type := str(slot.get("troop_type", slot.get("troopType", ""))).strip_edges()
	return str(TROOP_UNIT_MANIFEST_VISUAL_TYPE_BY_TROOP_TYPE.get(troop_type, TROOP_UNIT_MANIFEST_VISUAL_TYPE_BY_TROOP_TYPE.get("步兵", ""))).strip_edges()


func _resolve_troop_unit_animation_start_index(slot: Dictionary, frame_count: int) -> int:
	if frame_count <= 0:
		return 0
	var unit_ref := _snapshot_dictionary_from(slot.get("unit_asset_ref", slot.get("unitAssetRef", {})))
	return clampi(int(unit_ref.get("sequence", 0)), 0, frame_count - 1)


func _attach_troop_unit_frame_animation(unit: TextureRect, frame_textures: Array, start_index: int, slot: Dictionary) -> void:
	if unit == null or frame_textures.size() <= 1:
		return
	var timer := Timer.new()
	timer.name = "TroopSlotSquadFrameTimer_%s" % str(slot.get("slot", "unit"))
	timer.wait_time = TROOP_UNIT_PREVIEW_ANIMATION_FRAME_INTERVAL_SEC
	timer.one_shot = false
	timer.autostart = true
	unit.set_meta("troop_unit_animation_frame_index", clampi(start_index, 0, frame_textures.size() - 1))
	timer.timeout.connect(func() -> void:
		if unit == null or not is_instance_valid(unit):
			return
		var current_index := int(unit.get_meta("troop_unit_animation_frame_index", 0))
		var next_index := (current_index + 1) % frame_textures.size()
		unit.set_meta("troop_unit_animation_frame_index", next_index)
		var next_texture_variant: Variant = frame_textures[next_index]
		if next_texture_variant is Texture2D:
			unit.texture = next_texture_variant as Texture2D
	)
	unit.add_child(timer)


func _build_overview_gate_card(title_text: String, body_text: String, button_text: String, tab_id: String, entry_id: String) -> Control:
	var panel := _make_context_panel(Color(0.120, 0.086, 0.052, 0.92), Color(0.68, 0.50, 0.26, 0.72))
	panel.custom_minimum_size = Vector2(0.0, 126.0)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 16)
	margin.add_theme_constant_override("margin_top", 14)
	margin.add_theme_constant_override("margin_right", 16)
	margin.add_theme_constant_override("margin_bottom", 14)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)
	margin.add_child(row)
	var text_col := VBoxContainer.new()
	text_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	text_col.alignment = BoxContainer.ALIGNMENT_CENTER
	text_col.add_theme_constant_override("separation", 7)
	row.add_child(text_col)
	text_col.add_child(_make_context_label(title_text, 24))
	var body_label := _make_context_label(body_text, 16, true)
	body_label.add_theme_color_override("font_color", Color(0.88, 0.81, 0.66, 0.92))
	text_col.add_child(body_label)
	var button := _make_context_action_button(button_text)
	button.custom_minimum_size = Vector2(142.0, 68.0)
	if entry_id.strip_edges() != "":
		button.pressed.connect(Callable(self, "request_entry").bind(entry_id.strip_edges()))
	else:
		var target_tab := tab_id.strip_edges()
		button.pressed.connect(func() -> void:
			_select_context_tab(target_tab)
		)
	row.add_child(button)
	return panel


func _build_context_resource_strip() -> Control:
	var panel := _make_context_panel(Color(0.12, 0.10, 0.075, 0.90), Color(0.64, 0.47, 0.24, 0.74))
	panel.custom_minimum_size = Vector2(0.0, 96.0)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 10)
	panel.add_child(margin)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8)
	margin.add_child(col)
	col.add_child(_make_context_label("资源与状态", 15))
	var resource_row := HBoxContainer.new()
	resource_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	resource_row.add_theme_constant_override("separation", 8)
	col.add_child(resource_row)
	for item in [
		{"label": "木", "value": "192748"},
		{"label": "铁", "value": "134627"},
		{"label": "石", "value": "174933"},
		{"label": "粮", "value": "222874"},
	]:
		var chip := _make_context_panel(Color(0.20, 0.16, 0.10, 0.92), Color(0.62, 0.48, 0.26, 0.72))
		chip.custom_minimum_size = Vector2(112.0, 38.0)
		chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var chip_label := _make_context_label("%s  %s" % [str(item.get("label", "")), str(item.get("value", ""))], 13)
		chip_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		chip_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		chip.add_child(chip_label)
		resource_row.add_child(chip)
	return panel


func _build_context_entry_cards() -> Control:
	var grid := GridContainer.new()
	grid.columns = 2
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 10)
	grid.add_theme_constant_override("v_separation", 10)
	var entries := [
		{"title": "部队", "body": "五队总览与大营 / 中军 / 前锋编排", "tab": "troop"},
		{"title": "设施", "body": "校场、募兵所、统帅厅和市井入口", "tab": "facility"},
		{"title": "建筑树", "body": "设施节点、升级单和模板反馈", "tab": "building_tree"},
		{"title": "内政", "body": "进入现有正式内政全屏面板", "entry": "interior"},
	]
	for entry in entries:
		var card := _make_context_panel(Color(0.105, 0.092, 0.075, 0.90), Color(0.53, 0.42, 0.24, 0.70))
		card.custom_minimum_size = Vector2(0.0, 106.0)
		var margin := MarginContainer.new()
		margin.add_theme_constant_override("margin_left", 14)
		margin.add_theme_constant_override("margin_top", 12)
		margin.add_theme_constant_override("margin_right", 14)
		margin.add_theme_constant_override("margin_bottom", 12)
		card.add_child(margin)
		var col := VBoxContainer.new()
		col.add_theme_constant_override("separation", 6)
		margin.add_child(col)
		col.add_child(_make_context_label(str(entry.get("title", "")), 18))
		col.add_child(_make_context_label(str(entry.get("body", "")), 12, true))
		var button := _make_context_action_button("进入")
		if str(entry.get("entry", "")) != "":
			button.pressed.connect(Callable(self, "request_entry").bind(str(entry.get("entry", ""))))
		else:
			var tab_id := str(entry.get("tab", "overview"))
			button.pressed.connect(func() -> void:
				_select_context_tab(tab_id)
			)
		col.add_child(button)
		grid.add_child(card)
	return grid


func _build_context_object_feedback() -> Control:
	var panel := _make_context_panel(Color(0.095, 0.082, 0.066, 0.90), Color(0.58, 0.44, 0.24, 0.70))
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 12)
	panel.add_child(margin)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 10)
	margin.add_child(col)
	col.add_child(_make_context_label("主府已选中 · 近场反馈", 18))
	col.add_child(_make_context_label("左侧主城舞台高亮主府，右侧只呈现和该对象相关的钻取动作；资源、武将和模板状态仍留在同一主城上下文。", 12, true))

	var focus_row := HBoxContainer.new()
	focus_row.add_theme_constant_override("separation", 10)
	col.add_child(focus_row)
	for item in [
		{"title": "城务", "body": "内政全屏"},
		{"title": "军务", "body": "部队编排"},
		{"title": "营建", "body": "设施 / 建筑树"},
	]:
		var tile := _make_context_panel(Color(0.14, 0.115, 0.085, 0.92), Color(0.60, 0.46, 0.26, 0.72))
		tile.custom_minimum_size = Vector2(0.0, 74.0)
		tile.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var tile_col := VBoxContainer.new()
		tile_col.alignment = BoxContainer.ALIGNMENT_CENTER
		tile.add_child(tile_col)
		var title := _make_context_label(str(item.get("title", "")), 16)
		title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		tile_col.add_child(title)
		var body := _make_context_label(str(item.get("body", "")), 11, true)
		body.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		tile_col.add_child(body)
		focus_row.add_child(tile)

	var action_row := HBoxContainer.new()
	action_row.add_theme_constant_override("separation", 8)
	col.add_child(action_row)
	for action in [
		{"label": "部队编排", "tab": "troop"},
		{"label": "设施组成", "tab": "facility"},
		{"label": "建筑树", "tab": "building_tree"},
		{"label": "内政全屏", "entry": "interior"},
	]:
		var button := _make_context_action_button(str(action.get("label", "")))
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		if str(action.get("entry", "")) != "":
			button.pressed.connect(Callable(self, "request_entry").bind(str(action.get("entry", ""))))
		else:
			var tab_id := str(action.get("tab", "overview"))
			button.pressed.connect(func() -> void:
				_select_context_tab(tab_id)
			)
		action_row.add_child(button)

	var route := _make_context_panel(Color(0.105, 0.095, 0.078, 0.82), Color(0.48, 0.37, 0.22, 0.64))
	route.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(route)
	var route_margin := MarginContainer.new()
	route_margin.add_theme_constant_override("margin_left", 12)
	route_margin.add_theme_constant_override("margin_top", 10)
	route_margin.add_theme_constant_override("margin_right", 12)
	route_margin.add_theme_constant_override("margin_bottom", 10)
	route.add_child(route_margin)
	var route_col := VBoxContainer.new()
	route_col.add_theme_constant_override("separation", 8)
	route_margin.add_child(route_col)
	route_col.add_child(_make_context_label("承接路径", 15))
	var route_row := HBoxContainer.new()
	route_row.add_theme_constant_override("separation", 6)
	route_col.add_child(route_row)
	for line in ["地图节点", "对象组成", "焦点动作", "模板反馈"]:
		var chip := _make_context_action_button(line)
		chip.disabled = true
		chip.custom_minimum_size = Vector2(0.0, 40.0)
		chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		route_row.add_child(chip)
	return panel


func _build_context_general_strip() -> Control:
	var panel := _make_context_panel(Color(0.085, 0.080, 0.070, 0.88), Color(0.56, 0.43, 0.25, 0.68))
	panel.custom_minimum_size = Vector2(0.0, 116.0)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 10)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	margin.add_child(row)
	for general in PREVIEW_GENERALS:
		var card := _make_context_panel(Color(0.16, 0.125, 0.085, 0.94), Color(0.66, 0.50, 0.27, 0.72))
		card.custom_minimum_size = Vector2(128.0, 92.0)
		var col := VBoxContainer.new()
		col.add_theme_constant_override("separation", 3)
		card.add_child(col)
		var name_label := _make_context_label(str(general.get("name", "")), 15)
		name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		col.add_child(name_label)
		var role_label := _make_context_label(str(general.get("role", "")), 12)
		role_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		col.add_child(role_label)
		var meta_label := _make_context_label(str(general.get("meta", "")), 11, true)
		meta_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		col.add_child(meta_label)
		row.add_child(card)
	return panel


func _troop_compact_layout_active() -> bool:
	var viewport_size := get_viewport_rect().size
	return viewport_size.x < 1360.0 or viewport_size.y < 760.0


func _troop_team_card_size(compact: bool) -> Vector2:
	return Vector2(164.0, 206.0) if compact else Vector2(218.0, 258.0)


func _troop_team_card_portrait_size(compact: bool) -> Vector2:
	return Vector2(150.0, 170.0) if compact else Vector2(202.0, 220.0)


func _troop_team_card_gap(compact: bool) -> int:
	return 12 if compact else 18


func _build_context_troop_view() -> Control:
	var compact := _troop_compact_layout_active()
	var read_model := _troop_formation_read_model()
	var detail_mode := _active_team_id.strip_edges() != ""

	var stage := Panel.new()
	stage.name = "MainCityTroopFormationView"
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stage.clip_contents = true
	if detail_mode:
		stage.add_theme_stylebox_override("panel", _make_panel_style(Color(0.0, 0.0, 0.0, 0.0), Color(0.0, 0.0, 0.0, 0.0), 0))
	else:
		stage.add_theme_stylebox_override("panel", _make_panel_style(Color(0.085, 0.063, 0.042, 0.94), Color(0.74, 0.54, 0.28, 0.72), 1))

	var background_ref := _snapshot_dictionary_from(read_model.get("background_asset_ref", {}))
	var background_path := str(background_ref.get("path", "res://data/ui/world_event_activity_fixtures/world_affairs_battlefield_fixture.png"))
	if detail_mode:
		background_path = str(read_model.get("scene_background_path", TROOP_FORMATION_SCENE_BACKGROUND_PATH))
	var background := TextureRect.new()
	background.set_anchors_preset(Control.PRESET_FULL_RECT)
	background.texture = _load_context_texture(background_path)
	background.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	background.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	background.modulate = Color(1.0, 0.98, 0.91, 1.0) if detail_mode else Color(0.94, 0.86, 0.70, 0.34)
	stage.add_child(background)

	var shade := ColorRect.new()
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.color = Color(0.030, 0.024, 0.018, 0.04) if detail_mode else Color(0.052, 0.038, 0.024, 0.46)
	stage.add_child(shade)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 0 if detail_mode else (18 if compact else 28))
	margin.add_theme_constant_override("margin_top", 0 if detail_mode else (18 if compact else 26))
	margin.add_theme_constant_override("margin_right", 0 if detail_mode else (18 if compact else 28))
	margin.add_theme_constant_override("margin_bottom", 0 if detail_mode else (16 if compact else 24))
	stage.add_child(margin)

	if detail_mode:
		margin.add_child(_build_troop_team_detail_panel(_selected_troop_team(), compact))
	else:
		margin.add_child(_build_troop_team_list_panel(compact))
	return stage


func _build_troop_team_list_panel(compact: bool) -> Control:
	var root := VBoxContainer.new()
	root.name = "TroopCitySpaceWithTeamPool"
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_theme_constant_override("separation", 8 if compact else 10)

	var upper := HBoxContainer.new()
	upper.name = "TroopCitySpaceUpper"
	upper.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	upper.size_flags_vertical = Control.SIZE_EXPAND_FILL
	upper.add_theme_constant_override("separation", 10 if compact else 14)
	root.add_child(upper)
	upper.add_child(_build_troop_city_composition_panel(compact))
	upper.add_child(_build_troop_facility_entry_panel(compact))
	root.add_child(_build_troop_team_pool_strip(compact))
	return root


func _build_troop_city_composition_panel(compact: bool) -> Control:
	var panel := _make_context_panel(Color(0.078, 0.058, 0.038, 0.84), Color(0.68, 0.50, 0.27, 0.68))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.size_flags_stretch_ratio = 1.82
	panel.name = "TroopCityCompositionModelPanel"
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12 if compact else 16)
	margin.add_theme_constant_override("margin_top", 12 if compact else 16)
	margin.add_theme_constant_override("margin_right", 12 if compact else 16)
	margin.add_theme_constant_override("margin_bottom", 12 if compact else 16)
	panel.add_child(margin)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8 if compact else 12)
	margin.add_child(col)

	var model_center := CenterContainer.new()
	model_center.name = "TroopCityModelCenter"
	model_center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	model_center.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(model_center)
	var city_model_size := Vector2(370.0, 220.0) if compact else Vector2(560.0, 320.0)
	var city_model := _make_facility_scene_texture("maincity_facility_city_lord_mansion_v4.png", city_model_size)
	city_model.name = "TroopCityCompositionModel"
	model_center.add_child(city_model)
	return panel


func _build_troop_facility_entry_panel(compact: bool) -> Control:
	var panel := _make_context_panel(Color(0.105, 0.072, 0.040, 0.88), Color(0.82, 0.58, 0.28, 0.78))
	panel.name = "TroopFacilityEntryPanel"
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.size_flags_stretch_ratio = 0.48
	panel.custom_minimum_size = Vector2(190.0, 0.0) if compact else Vector2(250.0, 0.0)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12 if compact else 18)
	margin.add_theme_constant_override("margin_top", 12 if compact else 16)
	margin.add_theme_constant_override("margin_right", 12 if compact else 18)
	margin.add_theme_constant_override("margin_bottom", 12 if compact else 16)
	panel.add_child(margin)

	var col := VBoxContainer.new()
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 10 if compact else 14)
	margin.add_child(col)
	var button := _make_context_action_button("建筑树")
	button.name = "TroopFacilityBuildingTreeEntryButton"
	button.custom_minimum_size = Vector2(164.0, 164.0) if compact else Vector2(218.0, 218.0)
	button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	button.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	button.add_theme_font_size_override("font_size", 28 if compact else 34)
	button.pressed.connect(func() -> void:
		_select_context_tab("building_tree")
	)
	col.add_child(button)
	return panel


func _build_troop_team_pool_strip(compact: bool) -> Control:
	var panel := _make_context_panel(Color(0.090, 0.070, 0.045, 0.86), Color(0.70, 0.52, 0.28, 0.74))
	panel.name = "TroopTeamCardPoolStrip"
	panel.custom_minimum_size = Vector2(0.0, 242.0) if compact else Vector2(0.0, 286.0)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_SHRINK_END
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 10 if compact else 14)
	margin.add_theme_constant_override("margin_top", 5 if compact else 6)
	margin.add_theme_constant_override("margin_right", 10 if compact else 14)
	margin.add_theme_constant_override("margin_bottom", 5 if compact else 6)
	panel.add_child(margin)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 0)
	margin.add_child(col)

	var scroll := ScrollContainer.new()
	scroll.name = "TroopTeamCardPoolHiddenScroll"
	var card_size := _troop_team_card_size(compact)
	var card_width := card_size.x
	var card_height := card_size.y
	var card_gap := _troop_team_card_gap(compact)
	var team_count := _troop_formation_teams().size()
	var rail_metrics := UI_COMPONENT_FACTORY.card_rail_metrics(card_width, card_height, card_gap, team_count)
	UI_COMPONENT_FACTORY.apply_card_rail_scroll_container(scroll, card_width, card_height, card_gap, team_count)
	col.add_child(scroll)

	var list := HBoxContainer.new()
	list.name = "TroopTeamCardPool"
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list.size_flags_vertical = Control.SIZE_EXPAND_FILL
	list.alignment = BoxContainer.ALIGNMENT_CENTER
	list.custom_minimum_size = Vector2(float(rail_metrics.get("content_width", card_width)), card_height)
	list.add_theme_constant_override("separation", card_gap)
	scroll.add_child(list)
	for team_value in _troop_formation_teams():
		if team_value is Dictionary:
			var team := team_value as Dictionary
			list.add_child(_build_troop_team_button(team, compact))
	return panel


func _build_troop_team_button(team: Dictionary, compact: bool) -> Button:
	var team_id := str(team.get("id", ""))
	var leader := _troop_leader_slot(team)
	var live_text_label := _troop_team_card_live_text_label(team)
	var button := Button.new()
	button.name = "TroopTeamButton_%s" % team_id
	button.text = ""
	button.set_meta("troop_team_card_button_token", TROOP_TEAM_CARD_BUTTON_TOKEN)
	button.set_meta("troop_team_card_action_id", "troop_team_select:%s" % team_id)
	button.set_meta("troop_team_card_team_id", team_id)
	button.set_meta("troop_team_card_live_text_contract", TROOP_TEAM_CARD_LIVE_TEXT_CONTRACT)
	button.set_meta("troop_team_card_live_text_label", live_text_label)
	button.custom_minimum_size = _troop_team_card_size(compact)
	button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	button.size_flags_vertical = Control.SIZE_EXPAND_FILL
	button.add_theme_stylebox_override("normal", _make_panel_style(Color(0.125, 0.095, 0.060, 0.88), Color(0.55, 0.42, 0.24, 0.78), 1))
	button.add_theme_stylebox_override("hover", _make_panel_style(Color(0.19, 0.13, 0.065, 0.96), Color(0.88, 0.64, 0.30, 0.90), 1))
	button.add_theme_stylebox_override("pressed", _make_panel_style(Color(0.33, 0.21, 0.095, 0.98), Color(1.00, 0.72, 0.30, 0.98), 2))

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 5 if compact else 6)
	margin.add_theme_constant_override("margin_top", 5 if compact else 6)
	margin.add_theme_constant_override("margin_right", 5 if compact else 6)
	margin.add_theme_constant_override("margin_bottom", 5 if compact else 6)
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	button.add_child(margin)

	var card_col := VBoxContainer.new()
	card_col.alignment = BoxContainer.ALIGNMENT_CENTER
	card_col.size_flags_vertical = Control.SIZE_EXPAND_FILL
	card_col.add_theme_constant_override("separation", 3 if compact else 4)
	card_col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.add_child(card_col)

	if _troop_slot_has_general(leader):
		var portrait_ref := _snapshot_dictionary_from(leader.get("asset_ref", {}))
		var portrait := TextureRect.new()
		portrait.name = "TroopRosterLeaderPortrait_%s" % team_id
		portrait.custom_minimum_size = _troop_team_card_portrait_size(compact)
		portrait.texture = _load_troop_portrait_texture(portrait_ref)
		UI_COMPONENT_FACTORY.apply_portrait_frame_texture(portrait)
		portrait.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		portrait.size_flags_vertical = Control.SIZE_EXPAND_FILL
		portrait.mouse_filter = Control.MOUSE_FILTER_IGNORE
		card_col.add_child(portrait)
	else:
		var empty_stage := CenterContainer.new()
		empty_stage.name = "TroopRosterEmptyStage_%s" % team_id
		empty_stage.custom_minimum_size = _troop_team_card_portrait_size(compact)
		empty_stage.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		empty_stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
		empty_stage.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var empty_label := _make_context_label("待配置", 16 if compact else 20)
		empty_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		empty_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		empty_label.add_theme_color_override("font_color", Color(0.92, 0.78, 0.46, 0.82))
		empty_stage.add_child(empty_label)
		card_col.add_child(empty_stage)

	var info_col := VBoxContainer.new()
	info_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info_col.size_flags_vertical = Control.SIZE_SHRINK_END
	info_col.alignment = BoxContainer.ALIGNMENT_CENTER
	info_col.add_theme_constant_override("separation", 3 if compact else 5)
	info_col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card_col.add_child(info_col)

	var state_text := _format_troop_int(team.get("soldiers_current", 0)) if _troop_assigned_slot_count(team) > 0 else "空队列"
	var state := _make_context_label(state_text, 14 if compact else 18)
	state.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	state.add_theme_color_override("font_color", Color(0.93, 0.84, 0.68, 0.96))
	info_col.add_child(state)

	button.pressed.connect(Callable(self, "_select_troop_team").bind(team_id))
	return button


func _build_troop_team_detail_panel(team: Dictionary, compact: bool) -> Control:
	var root := Control.new()
	root.name = "TroopFormationSceneOverlay"
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.mouse_filter = Control.MOUSE_FILTER_STOP

	var status_row := _build_troop_team_status_row(team, compact)
	status_row.name = "TroopFormationSceneStatusRow"
	status_row.set_anchors_preset(Control.PRESET_TOP_WIDE)
	status_row.offset_left = 16.0 if compact else 28.0
	status_row.offset_top = 14.0 if compact else 20.0
	status_row.offset_right = -16.0 if compact else -28.0
	status_row.offset_bottom = 70.0 if compact else 92.0
	root.add_child(status_row)

	var overview_panel := _build_troop_team_overview_panel(team, compact)
	overview_panel.set_anchors_preset(Control.PRESET_TOP_LEFT)
	overview_panel.offset_left = 20.0 if compact else 30.0
	overview_panel.offset_top = 108.0 if compact else 132.0
	overview_panel.offset_right = 178.0 if compact else 214.0
	overview_panel.offset_bottom = 308.0 if compact else 382.0
	root.add_child(overview_panel)

	var slot_anchor_row := _build_troop_background_slot_anchor_row(team, compact)
	slot_anchor_row.set_anchors_preset(Control.PRESET_TOP_WIDE)
	slot_anchor_row.offset_left = 190.0 if compact else 250.0
	slot_anchor_row.offset_top = 96.0 if compact else 132.0
	slot_anchor_row.offset_right = -190.0 if compact else -250.0
	slot_anchor_row.offset_bottom = 632.0 if compact else 852.0
	root.add_child(slot_anchor_row)

	var slot_row := HBoxContainer.new()
	slot_row.name = "TroopThreeGeneralSlots"
	slot_row.set_anchors_preset(Control.PRESET_TOP_WIDE)
	slot_row.offset_left = 190.0 if compact else 250.0
	slot_row.offset_top = 92.0 if compact else 122.0
	slot_row.offset_right = -190.0 if compact else -250.0
	slot_row.offset_bottom = 636.0 if compact else 852.0
	slot_row.alignment = BoxContainer.ALIGNMENT_CENTER
	slot_row.add_theme_constant_override("separation", 16 if compact else 26)
	root.add_child(slot_row)
	for slot_value in _troop_team_slots(team):
		if slot_value is Dictionary:
			slot_row.add_child(_build_troop_general_slot_lane(slot_value as Dictionary, compact, team))

	var action_row := _build_troop_detail_action_row(team, compact)
	action_row.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	action_row.offset_left = 424.0 if compact else 560.0
	action_row.offset_top = -126.0 if compact else -136.0
	action_row.offset_right = -424.0 if compact else -560.0
	action_row.offset_bottom = -20.0 if compact else -28.0
	root.add_child(action_row)

	return root


func _build_troop_background_slot_anchor_row(team: Dictionary, compact: bool) -> Control:
	var row := HBoxContainer.new()
	row.name = "TroopBackgroundSlotAnchorRow"
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 16 if compact else 26)
	for slot_value in _troop_team_slots(team):
		if slot_value is Dictionary:
			row.add_child(_build_troop_background_slot_anchor(slot_value as Dictionary, compact))
	return row


func _build_troop_background_slot_anchor(slot: Dictionary, compact: bool) -> Control:
	var root := Control.new()
	root.name = "TroopBackgroundSlotAnchor_%s" % str(slot.get("slot", ""))
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE

	var card_anchor := Panel.new()
	card_anchor.name = "TroopBackgroundCardAnchor_%s" % str(slot.get("slot", ""))
	card_anchor.set_anchors_preset(Control.PRESET_TOP_WIDE)
	card_anchor.offset_left = 8.0 if compact else 12.0
	card_anchor.offset_top = 0.0
	card_anchor.offset_right = -8.0 if compact else -12.0
	card_anchor.offset_bottom = 364.0 if compact else 514.0
	card_anchor.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card_anchor.add_theme_stylebox_override("panel", _make_panel_style(Color(0.015, 0.012, 0.008, 0.00), Color(0.94, 0.76, 0.42, 0.18), 1))
	root.add_child(card_anchor)

	return root


func _build_troop_team_status_row(team: Dictionary, compact: bool) -> Control:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 12)

	var back_button := _make_context_action_button("返回")
	back_button.name = "TroopFormationDetailBackButton"
	back_button.set_meta("troop_detail_back_button_token", TROOP_DETAIL_BACK_BUTTON_TOKEN)
	back_button.set_meta("troop_detail_back_action_id", "troop_detail_back_to_roster")
	back_button.set_meta("troop_detail_back_target_mode", "team_roster")
	back_button.set_meta("troop_detail_back_live_text_contract", TROOP_DETAIL_BACK_LIVE_TEXT_CONTRACT)
	back_button.set_meta("troop_detail_back_live_text_label", "返回")
	back_button.custom_minimum_size = Vector2(72.0 if compact else 96.0, 44.0 if compact else 56.0)
	back_button.add_theme_font_size_override("font_size", 17 if compact else 21)
	back_button.pressed.connect(Callable(self, "_show_troop_roster"))
	row.add_child(back_button)

	var title_col := VBoxContainer.new()
	title_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_col.add_theme_constant_override("separation", 4)
	row.add_child(title_col)
	var title := _make_context_label(str(team.get("name", "第一队")), 28 if compact else 38)
	title.add_theme_color_override("font_color", Color(1.0, 0.88, 0.54, 1.0))
	title_col.add_child(title)

	return row


func _build_troop_team_overview_panel(team: Dictionary, compact: bool) -> Control:
	var panel := _make_context_panel(Color(0.060, 0.045, 0.030, 0.36), Color(0.72, 0.52, 0.28, 0.42))
	panel.name = "TroopFormationOverviewPanel"
	panel.custom_minimum_size = Vector2(158.0, 0.0) if compact else Vector2(184.0, 0.0)
	panel.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	panel.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 8 if compact else 10)
	margin.add_theme_constant_override("margin_top", 8 if compact else 10)
	margin.add_theme_constant_override("margin_right", 8 if compact else 10)
	margin.add_theme_constant_override("margin_bottom", 8 if compact else 10)
	panel.add_child(margin)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8 if compact else 10)
	margin.add_child(col)
	var title := _make_context_label("部队", 24 if compact else 30)
	title.add_theme_color_override("font_color", Color(1.0, 0.84, 0.42, 1.0))
	col.add_child(title)
	var metrics := [
		{"label": "兵力", "value": "%s/%s" % [_format_troop_int(team.get("soldiers_current", 0)), _format_troop_int(team.get("soldiers_max", 0))]},
		{"label": "攻城", "value": _format_troop_int(team.get("siege", 86))},
		{"label": "速度", "value": _format_troop_int(team.get("speed", 72))},
	]
	for metric in metrics:
		col.add_child(_build_troop_metric_row(metric as Dictionary, compact))
	if _troop_detail_tool_mode == "recruit":
		col.add_child(_build_troop_recruit_rows(team, compact))
	return panel


func _build_troop_metric_row(metric: Dictionary, compact: bool) -> Control:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 8 if compact else 10)
	var label := _make_context_label(str(metric.get("label", "")), 17 if compact else 22)
	label.custom_minimum_size = Vector2(48.0 if compact else 62.0, 30.0)
	label.add_theme_color_override("font_color", Color(0.78, 0.70, 0.55, 0.96))
	row.add_child(label)
	var value := _make_context_label(str(metric.get("value", "")), 17 if compact else 22)
	value.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	value.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	value.add_theme_color_override("font_color", Color(0.96, 0.84, 0.58, 1.0))
	row.add_child(value)
	return row


func _troop_slot_frame_color(slot_id: String) -> Color:
	match slot_id.strip_edges():
		"camp":
			return Color(0.98, 0.74, 0.30, 0.96)
		"mid":
			return Color(0.62, 0.82, 0.96, 0.92)
		"front":
			return Color(0.86, 0.38, 0.30, 0.94)
		_:
			return Color(0.78, 0.57, 0.30, 0.84)


func _build_troop_general_slot_lane(slot: Dictionary, compact: bool, team: Dictionary = {}) -> Control:
	var lane := VBoxContainer.new()
	lane.name = "TroopGeneralSlotLane_%s" % str(slot.get("slot", ""))
	lane.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	lane.size_flags_vertical = Control.SIZE_EXPAND_FILL
	lane.alignment = BoxContainer.ALIGNMENT_CENTER
	lane.add_theme_constant_override("separation", 6 if compact else 10)
	lane.add_child(_build_troop_slot_role_header(slot, compact))
	if _troop_slot_has_general(slot):
		lane.add_child(_build_troop_formation_troop_type_chip(slot, compact))
	lane.add_child(_build_troop_general_slot_card(slot, compact, team))
	if _troop_slot_has_general(slot):
		lane.add_child(_build_troop_slot_soldier_bar(slot, compact))
		lane.add_child(_build_troop_slot_squad_preview(slot, compact))
	else:
		lane.add_child(_build_troop_empty_slot_spacer(slot, compact))
	return lane


func _build_troop_slot_role_header(slot: Dictionary, compact: bool) -> Control:
	var slot_id := str(slot.get("slot", "")).strip_edges()
	var label_text := _troop_slot_role_label(slot_id)
	var frame_color := _troop_slot_frame_color(slot_id)
	var panel := PanelContainer.new()
	panel.name = "TroopSlotRoleHeader_%s" % slot_id
	panel.custom_minimum_size = Vector2(146.0, 30.0) if compact else Vector2(190.0, 40.0)
	panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	panel.add_theme_stylebox_override("panel", _make_panel_style(Color(0.070, 0.045, 0.022, 0.78), frame_color, 1))
	var label := _make_context_label(label_text, 22 if compact else 30)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_color_override("font_color", Color(1.0, 0.86, 0.48, 1.0))
	label.add_theme_color_override("font_outline_color", Color(0.10, 0.060, 0.025, 0.96))
	label.add_theme_constant_override("outline_size", 2)
	panel.add_child(label)
	return panel


func _build_troop_formation_troop_type_chip(slot: Dictionary, compact: bool) -> Control:
	var slot_id := str(slot.get("slot", "")).strip_edges()
	var troop_type := str(slot.get("troop_type", slot.get("troopType", ""))).strip_edges()
	if troop_type == "":
		troop_type = "部队"
	var unit_ref := _snapshot_dictionary_from(slot.get("unit_asset_ref", slot.get("unitAssetRef", {})))
	var visual_type := _resolve_troop_unit_visual_type(slot, unit_ref)
	var frame_color := _troop_slot_frame_color(slot_id)
	var panel := PanelContainer.new()
	panel.name = "TroopFormationTroopTypeChip_%s" % slot_id
	panel.custom_minimum_size = Vector2(126.0, 28.0) if compact else Vector2(164.0, 34.0)
	panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	panel.set_meta("troop_formation_troop_type_chip_token", TROOP_FORMATION_TROOP_TYPE_CHIP_TOKEN)
	panel.set_meta("troop_formation_troop_type", troop_type)
	panel.set_meta("troop_formation_visual_type", visual_type)
	panel.add_theme_stylebox_override("panel", _make_panel_style(Color(0.11, 0.075, 0.034, 0.86), frame_color.lightened(0.18), 1))
	var label := _make_context_label(troop_type, 16 if compact else 20)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_color_override("font_color", Color(1.0, 0.90, 0.58, 0.98))
	label.add_theme_color_override("font_outline_color", Color(0.09, 0.050, 0.020, 0.96))
	label.add_theme_constant_override("outline_size", 1)
	panel.add_child(label)
	return panel


func _troop_slot_role_label(slot_id: String) -> String:
	match slot_id.strip_edges():
		"camp":
			return "大营"
		"mid":
			return "中军"
		"front":
			return "前锋"
		_:
			return "部队"


func _build_troop_general_slot_card(slot: Dictionary, compact: bool, team: Dictionary = {}) -> Control:
	if not _troop_slot_has_general(slot):
		return _build_troop_empty_general_slot_card(slot, compact)
	var slot_id := str(slot.get("slot", "")).strip_edges()
	var selected := slot_id != "" and slot_id == _selected_troop_detail_slot_id
	var frame_color := _troop_slot_frame_color(slot_id)
	var frame_hover_color := frame_color.lightened(0.24)
	var frame_pressed_color := frame_color.lightened(0.36)
	var card := HERO_CARD_VIEW.build_card(
		_troop_hero_card_entry(slot, team),
		HERO_CARD_VIEW.MODE_OWNED_ROSTER,
		_troop_hero_card_config(slot, compact)
	)
	card.name = "TroopGeneralSlotButton_%s" % slot_id
	card.toggle_mode = true
	card.button_pressed = selected
	card.custom_minimum_size = Vector2(260.0, 360.0) if compact else Vector2(340.0, 510.0)
	card.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	card.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	card.add_theme_stylebox_override("normal", _make_panel_style(Color(0.075, 0.055, 0.036, 0.66), frame_color, 2))
	card.add_theme_stylebox_override("hover", _make_panel_style(Color(0.13, 0.090, 0.046, 0.74), frame_hover_color, 2))
	card.add_theme_stylebox_override("pressed", _make_panel_style(Color(0.24, 0.15, 0.065, 0.82), frame_pressed_color, 3))
	card.pressed.connect(Callable(self, "_select_troop_detail_slot").bind(slot_id))
	return card


func _build_troop_empty_general_slot_card(slot: Dictionary, compact: bool) -> Control:
	var slot_id := str(slot.get("slot", "")).strip_edges()
	var selected := slot_id != "" and slot_id == _selected_troop_detail_slot_id
	var frame_color := _troop_slot_frame_color(slot_id)
	var card := Button.new()
	card.name = "TroopGeneralEmptySlotButton_%s" % slot_id
	card.text = ""
	card.toggle_mode = true
	card.button_pressed = selected
	card.custom_minimum_size = Vector2(260.0, 360.0) if compact else Vector2(340.0, 510.0)
	card.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	card.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	card.add_theme_stylebox_override("normal", _make_panel_style(Color(0.052, 0.040, 0.028, 0.54), frame_color.darkened(0.18), 2))
	card.add_theme_stylebox_override("hover", _make_panel_style(Color(0.080, 0.058, 0.034, 0.64), frame_color, 2))
	card.add_theme_stylebox_override("pressed", _make_panel_style(Color(0.12, 0.080, 0.040, 0.72), frame_color.lightened(0.24), 3))
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.add_child(center)
	var label := _make_context_label("待配置", 24 if compact else 32)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_color_override("font_color", Color(0.96, 0.82, 0.46, 0.82))
	label.add_theme_color_override("font_outline_color", Color(0.08, 0.045, 0.020, 0.94))
	label.add_theme_constant_override("outline_size", 2)
	center.add_child(label)
	card.pressed.connect(Callable(self, "_select_troop_detail_slot").bind(slot_id))
	return card


func _build_troop_empty_slot_spacer(slot: Dictionary, compact: bool) -> Control:
	var spacer := Control.new()
	spacer.name = "TroopEmptySlotNoUnitPreview_%s" % str(slot.get("slot", ""))
	spacer.custom_minimum_size = Vector2(0.0, 132.0 if compact else 176.0)
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	spacer.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return spacer


func _troop_hero_card_entry(slot: Dictionary, team: Dictionary = {}) -> Dictionary:
	var asset_ref := _snapshot_dictionary_from(slot.get("asset_ref", {}))
	return {
		"id": str(slot.get("slot", "")),
		"name": str(slot.get("general_name", "")),
		"display_name": str(slot.get("general_name", "")),
		"faction": _troop_slot_faction_label(slot),
		"stars": "",
		"level": _format_troop_int(slot.get("level", 0)),
		"troop": str(slot.get("troop_type", "")),
		"power": _format_troop_int(slot.get("soldiers_current", 0)),
		"status": "%s/%s" % [_format_troop_int(slot.get("soldiers_current", 0)), _format_troop_int(slot.get("soldiers_max", 0))],
		"owner": _troop_slot_controller_label(slot, team),
		"hero_id": str(slot.get("hero_id", "")),
		"portraitAssetKey": str(slot.get("portrait_asset_key", "")),
		"asset_ref": asset_ref,
	}


func _troop_slot_controller_label(slot: Dictionary, team: Dictionary = {}) -> String:
	var explicit_label := _first_non_empty_troop_text([
		slot.get("ownerDisplayName", ""),
		slot.get("owner_display_name", ""),
		slot.get("controllerDisplayName", ""),
		slot.get("controller_display_name", ""),
		slot.get("playerDisplayName", ""),
		slot.get("player_display_name", ""),
		slot.get("playerName", ""),
		slot.get("player_name", ""),
		slot.get("aiPlayerName", ""),
		slot.get("ai_player_name", ""),
		slot.get("ownerName", ""),
		slot.get("owner_name", ""),
		team.get("ownerDisplayName", ""),
		team.get("owner_display_name", ""),
		team.get("controllerDisplayName", ""),
		team.get("controller_display_name", ""),
		team.get("playerDisplayName", ""),
		team.get("player_display_name", ""),
		team.get("playerName", ""),
		team.get("player_name", ""),
		team.get("aiPlayerName", ""),
		team.get("ai_player_name", ""),
		_troop_formation_read_model().get("ownerDisplayName", ""),
		_troop_formation_read_model().get("owner_display_name", ""),
		_context.get("ownerDisplayName", ""),
		_context.get("owner_display_name", ""),
		_context.get("playerName", ""),
		_context.get("player_name", ""),
	])
	if explicit_label != "":
		return explicit_label
	var owner_type := str(team.get("owner_type", team.get("ownerType", slot.get("owner_type", slot.get("ownerType", ""))))).strip_edges().to_lower()
	var ai_player_id := str(team.get("ai_player_id", team.get("aiPlayerId", slot.get("ai_player_id", slot.get("aiPlayerId", ""))))).strip_edges()
	if owner_type == "ai" or owner_type == "ai_player" or ai_player_id != "":
		return "AI玩家"
	return "真人玩家"


func _first_non_empty_troop_text(values: Array) -> String:
	for value in values:
		var text := str(value).strip_edges()
		if text != "":
			return text
	return ""


func _troop_hero_card_config(slot: Dictionary, compact: bool) -> Dictionary:
	return HERO_CARD_VIEW.full_card_config(HERO_CARD_VIEW.MODE_OWNED_ROSTER, {
		"layout_preset_id": "troop_formation_reused_hero_card_340x510_v1",
		"width": 260.0 if compact else 340.0,
		"height": 360.0 if compact else 510.0,
		"compact": compact,
		"outer_margin": 4.0 if compact else 6.0,
		"inner_margin": 3.0 if compact else 5.0,
		"stage_margin": 2.0 if compact else 3.0,
		"top_height": 26.0 if compact else 34.0,
		"top_left_width": 82.0 if compact else 112.0,
		"left_strip_width": 34.0 if compact else 48.0,
		"identity_strip_height": 122.0 if compact else 180.0,
		"identity_faction_font_size": 10 if compact else 13,
		"identity_name_font_size": 14 if compact else 18,
		"overlay_height": 30.0 if compact else 38.0,
		"bottom_height": 34.0 if compact else 42.0,
		"bottom_font_size": 13 if compact else 17,
		"status_font_size": 12 if compact else 16,
		"portrait_shade_alpha": 0.08,
	})


func _troop_slot_faction_label(slot: Dictionary) -> String:
	var name := str(slot.get("general_name", "")).strip_edges()
	match name:
		"诸葛亮", "刘备", "赵云", "关羽", "张飞":
			return "季汉"
		"周瑜", "孙策", "孙权", "甘宁", "太史慈", "周泰":
			return "东吴"
		"马超", "吕布", "董卓", "袁绍":
			return "群雄"
		"曹操", "曹丕", "夏侯惇", "典韦", "郭嘉", "荀彧":
			return "曹魏"
		_:
			return str(slot.get("label", "部队"))


func _build_troop_slot_soldier_bar(slot: Dictionary, compact: bool) -> Control:
	var wrap := MarginContainer.new()
	wrap.name = "TroopSlotSoldierBarWrap_%s" % str(slot.get("slot", ""))
	wrap.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	wrap.add_theme_constant_override("margin_left", 16 if compact else 26)
	wrap.add_theme_constant_override("margin_right", 16 if compact else 26)
	wrap.add_theme_constant_override("margin_top", 0)
	wrap.add_theme_constant_override("margin_bottom", 0)
	var bar := ProgressBar.new()
	bar.name = "TroopSlotSoldierBar_%s" % str(slot.get("slot", ""))
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar.custom_minimum_size = Vector2(0.0, 12.0 if compact else 16.0)
	bar.min_value = 0.0
	bar.max_value = max(1.0, float(slot.get("soldiers_max", 1)))
	bar.value = clamp(float(slot.get("soldiers_current", 0)), 0.0, bar.max_value)
	bar.show_percentage = false
	bar.add_theme_stylebox_override("background", _make_panel_style(Color(0.018, 0.014, 0.010, 0.92), Color(0.18, 0.14, 0.09, 0.86), 1))
	bar.add_theme_stylebox_override("fill", _make_panel_style(Color(0.96, 0.94, 0.88, 0.98), Color(1.0, 0.98, 0.90, 0.96), 1))
	wrap.add_child(bar)
	return wrap


func _build_troop_slot_squad_preview(slot: Dictionary, compact: bool) -> Control:
	var panel := Control.new()
	panel.name = "TroopSlotSquadPreview_%s" % str(slot.get("slot", ""))
	panel.custom_minimum_size = Vector2(0.0, 116.0 if compact else 158.0)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var troop_type := str(slot.get("troop_type", slot.get("troopType", ""))).strip_edges()
	var cavalry_scale_bonus := troop_type == "骑兵"
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	if cavalry_scale_bonus:
		center.offset_top = -34.0 if compact else -46.0
		center.offset_bottom = -34.0 if compact else -46.0
	else:
		center.offset_top = -4.0 if compact else -8.0
		center.offset_bottom = -4.0 if compact else -8.0
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_child(center)
	var unit := TextureRect.new()
	unit.name = "TroopSlotSquadSprite_%s" % str(slot.get("slot", ""))
	unit.custom_minimum_size = (Vector2(250.0, 132.0) if compact else Vector2(338.0, 178.0)) if cavalry_scale_bonus else (Vector2(244.0, 124.0) if compact else Vector2(324.0, 162.0))
	var frame_textures := _load_troop_unit_frame_textures(slot)
	if frame_textures.size() > 0:
		var start_index := _resolve_troop_unit_animation_start_index(slot, frame_textures.size())
		var texture_variant: Variant = frame_textures[start_index]
		if texture_variant is Texture2D:
			unit.texture = texture_variant as Texture2D
		_attach_troop_unit_frame_animation(unit, frame_textures, start_index, slot)
	else:
		unit.texture = _load_troop_unit_texture(slot)
	unit.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
	unit.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	if cavalry_scale_bonus:
		unit.scale = Vector2(1.16, 1.16) if compact else Vector2(1.20, 1.20)
	unit.mouse_filter = Control.MOUSE_FILTER_IGNORE
	center.add_child(unit)
	return panel


func _build_troop_recruit_rows(team: Dictionary, compact: bool) -> Control:
	var panel := _make_context_panel(Color(0.060, 0.050, 0.037, 0.62), Color(0.58, 0.43, 0.24, 0.70))
	panel.custom_minimum_size = Vector2(0.0, 70.0 if compact else 86.0)
	panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 8 if compact else 16)
	margin.add_theme_constant_override("margin_top", 5 if compact else 8)
	margin.add_theme_constant_override("margin_right", 8 if compact else 16)
	margin.add_theme_constant_override("margin_bottom", 5 if compact else 8)
	panel.add_child(margin)
	var rows := VBoxContainer.new()
	rows.add_theme_constant_override("separation", 1 if compact else 3)
	margin.add_child(rows)
	for slot_value in _troop_team_slots(team):
		if slot_value is Dictionary:
			rows.add_child(_build_troop_recruit_row(slot_value as Dictionary, compact))
	return panel


func _build_troop_full_formation_preview(team: Dictionary, compact: bool) -> Control:
	var panel := _make_context_panel(Color(0.052, 0.044, 0.034, 0.28), Color(0.64, 0.46, 0.24, 0.52))
	panel.name = "TroopFullFormationPreview"
	panel.custom_minimum_size = Vector2(0.0, 118.0 if compact else 130.0)
	panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 8 if compact else 14)
	margin.add_theme_constant_override("margin_top", 6 if compact else 10)
	margin.add_theme_constant_override("margin_right", 8 if compact else 14)
	margin.add_theme_constant_override("margin_bottom", 6 if compact else 10)
	panel.add_child(margin)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 18 if compact else 28)
	margin.add_child(row)
	for slot_value in _troop_team_slots(team):
		if slot_value is Dictionary:
			row.add_child(_build_troop_preview_lane(slot_value as Dictionary, compact))
	return panel


func _build_troop_preview_lane(slot: Dictionary, compact: bool) -> Control:
	var col := VBoxContainer.new()
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 2 if compact else 4)
	var sprite := TextureRect.new()
	sprite.name = "TroopFormationPreviewSprite_%s" % str(slot.get("slot", ""))
	sprite.custom_minimum_size = Vector2(158.0, 78.0) if compact else Vector2(220.0, 110.0)
	sprite.texture = _load_troop_unit_texture(slot)
	sprite.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
	sprite.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	col.add_child(sprite)
	var label := _make_context_label("%s · %s" % [str(slot.get("label", "")), str(slot.get("troop_type", ""))], 11 if compact else 14)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_color_override("font_color", Color(0.90, 0.82, 0.64, 0.95))
	col.add_child(label)
	return col


func _build_troop_recruit_row(slot: Dictionary, compact: bool) -> Control:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 6 if compact else 12)
	var label := _make_context_label("%s  %s" % [str(slot.get("general_name", "")), str(slot.get("label", ""))], 11 if compact else 14)
	label.custom_minimum_size = Vector2(88.0 if compact else 132.0, 18.0)
	row.add_child(label)
	var bar := ProgressBar.new()
	bar.name = "TroopRecruitBar_%s" % str(slot.get("slot", ""))
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar.custom_minimum_size = Vector2(0.0, 8.0 if compact else 12.0)
	bar.min_value = 0.0
	bar.max_value = max(1.0, float(slot.get("soldiers_max", 1)))
	bar.value = clamp(float(slot.get("soldiers_current", 0)), 0.0, bar.max_value)
	bar.show_percentage = false
	bar.add_theme_stylebox_override("background", _make_panel_style(Color(0.11, 0.085, 0.055, 0.88), Color(0.25, 0.19, 0.12, 0.80), 1))
	bar.add_theme_stylebox_override("fill", _make_panel_style(Color(0.88, 0.62, 0.25, 0.98), Color(0.88, 0.62, 0.25, 0.98), 1))
	row.add_child(bar)
	var value := _make_context_label("%s/%s" % [_format_troop_int(slot.get("soldiers_current", 0)), _format_troop_int(slot.get("soldiers_max", 0))], 11 if compact else 13)
	value.custom_minimum_size = Vector2(64.0 if compact else 88.0, 18.0)
	value.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	row.add_child(value)
	return row


func _build_troop_detail_action_row(team: Dictionary, compact: bool) -> Control:
	var root := VBoxContainer.new()
	root.name = "TroopDetailActionArea"
	root.alignment = BoxContainer.ALIGNMENT_CENTER
	root.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	root.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	root.add_theme_constant_override("separation", 6 if compact else 8)

	var locked := _troop_team_action_locked(team)
	var hint_panel := PanelContainer.new()
	hint_panel.name = "TroopFormationAiLockedHintPanel"
	hint_panel.visible = locked and _troop_action_hint_text.strip_edges() != ""
	hint_panel.custom_minimum_size = Vector2(430.0 if compact else 520.0, 30.0 if compact else 34.0)
	hint_panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	hint_panel.add_theme_stylebox_override("panel", _make_panel_style(Color(0.08, 0.055, 0.030, 0.82), Color(0.74, 0.58, 0.31, 0.76), 1))
	var hint := _make_context_label(_troop_action_hint_text, 14 if compact else 17, false)
	hint.name = "TroopFormationAiLockedHint"
	hint.custom_minimum_size = hint_panel.custom_minimum_size
	hint.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hint.size_flags_vertical = Control.SIZE_EXPAND_FILL
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hint.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	hint.add_theme_color_override("font_color", Color(0.98, 0.88, 0.64, 0.98))
	hint.add_theme_color_override("font_outline_color", Color(0.04, 0.025, 0.010, 0.98))
	hint.add_theme_constant_override("outline_size", 2)
	hint_panel.add_child(hint)
	root.add_child(hint_panel)

	var row := HBoxContainer.new()
	row.name = "TroopDetailActionRow"
	row.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	row.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 58 if compact else 220)
	root.add_child(row)
	for action in [
		{"id": "config", "label": "配置"},
		{"id": "recruit", "label": "征兵"},
	]:
		var action_id := str(action.get("id", ""))
		var button := _make_troop_command_button(str(action.get("label", "")), action_id == _troop_detail_tool_mode and not locked, locked)
		button.name = "TroopFormation%sModeButton" % action_id.capitalize()
		button.set_meta("troop_detail_action_button_token", TROOP_DETAIL_ACTION_BUTTON_TOKEN)
		button.set_meta("troop_detail_action_id", "troop_detail_mode:%s" % action_id)
		button.set_meta("troop_detail_action_mode", action_id)
		button.set_meta("troop_detail_action_live_text_contract", TROOP_DETAIL_ACTION_LIVE_TEXT_CONTRACT)
		button.set_meta("troop_detail_action_live_text_label", str(action.get("label", "")))
		button.toggle_mode = true
		button.button_pressed = action_id == _troop_detail_tool_mode and not locked
		button.custom_minimum_size = Vector2(166.0, 58.0) if compact else Vector2(176.0, 72.0)
		button.add_theme_font_size_override("font_size", 21 if compact else 25)
		if locked:
			button.pressed.connect(Callable(self, "_show_troop_ai_locked_hint"))
		else:
			button.pressed.connect(Callable(self, "_set_troop_detail_tool_mode").bind(action_id))
		row.add_child(button)
	return root


func _make_troop_command_button(label: String, primary: bool, locked: bool = false) -> Button:
	var command_text := "◆ %s ◆" % label if primary else "◇ %s ◇" % label
	var button := _make_context_action_button(command_text)
	if locked:
		var locked_fill := Color(0.13, 0.12, 0.10, 0.72)
		var locked_edge := Color(0.48, 0.43, 0.34, 0.78)
		button.add_theme_stylebox_override("normal", _make_panel_style(locked_fill, locked_edge, 1))
		button.add_theme_stylebox_override("hover", _make_panel_style(locked_fill.lightened(0.06), locked_edge.lightened(0.08), 1))
		button.add_theme_stylebox_override("pressed", _make_panel_style(locked_fill.darkened(0.04), locked_edge.lightened(0.10), 1))
		button.add_theme_color_override("font_color", Color(0.74, 0.70, 0.62, 0.92))
		button.add_theme_color_override("font_hover_color", Color(0.86, 0.80, 0.66, 0.96))
		button.add_theme_color_override("font_pressed_color", Color(0.92, 0.84, 0.66, 1.0))
		return button
	var fill := Color(0.50, 0.11, 0.060, 0.96) if primary else Color(0.18, 0.12, 0.070, 0.88)
	var edge := Color(1.00, 0.72, 0.34, 1.0) if primary else Color(0.82, 0.63, 0.34, 0.86)
	button.add_theme_stylebox_override("normal", _make_panel_style(fill, edge, 3 if primary else 2))
	button.add_theme_stylebox_override("hover", _make_panel_style(fill.lightened(0.10), edge.lightened(0.12), 3 if primary else 2))
	button.add_theme_stylebox_override("pressed", _make_panel_style(fill.darkened(0.08), edge.lightened(0.22), 4 if primary else 3))
	button.add_theme_color_override("font_color", Color(1.0, 0.90, 0.62, 1.0))
	button.add_theme_color_override("font_hover_color", Color(1.0, 0.96, 0.72, 1.0))
	button.add_theme_color_override("font_pressed_color", Color(1.0, 0.82, 0.48, 1.0))
	return button


func _show_troop_ai_locked_hint() -> void:
	_troop_action_hint_text = "AI队伍暂不可直接编组或征兵，请前往聊天频道。"
	if _active_context_tab == "troop" and _active_team_id.strip_edges() != "":
		_select_context_tab("troop")


func _set_troop_detail_tool_mode(mode: String) -> void:
	var normalized := mode.strip_edges()
	if normalized != "config" and normalized != "recruit":
		normalized = "config"
	_troop_action_hint_text = ""
	_troop_detail_tool_mode = normalized
	if _active_context_tab == "troop" and _active_team_id.strip_edges() != "":
		_select_context_tab("troop")


func _select_troop_detail_slot(slot_id: String) -> void:
	var normalized := slot_id.strip_edges()
	if normalized == "":
		return
	_selected_troop_detail_slot_id = normalized
	if _active_context_tab == "troop" and _active_team_id.strip_edges() != "":
		_select_context_tab("troop")


func _select_troop_team(team_id: String) -> void:
	var normalized := team_id.strip_edges()
	if normalized == "":
		return
	_active_team_id = normalized
	_selected_troop_detail_slot_id = "front"
	_troop_detail_tool_mode = "config"
	_troop_action_hint_text = ""
	if _active_context_tab == "troop":
		_select_context_tab("troop")
	var selected_team := _selected_troop_team()
	var ai_context_payload := _build_ai_troop_team_view_context_payload(selected_team)
	if not ai_context_payload.is_empty():
		ai_troop_team_viewed.emit(ai_context_payload)


func _show_troop_roster() -> void:
	_active_team_id = ""
	_selected_troop_detail_slot_id = "front"
	_troop_detail_tool_mode = "config"
	_troop_action_hint_text = ""
	if _active_context_tab == "troop":
		_select_context_tab("troop")


func select_troop_team_for_smoke(team_id: String) -> Dictionary:
	var normalized := team_id.strip_edges()
	if normalized == "":
		return {"ok": false, "reason": "team_id_empty"}
	var button := _find_troop_team_button(normalized)
	if button == null:
		return {"ok": false, "reason": "troop_team_button_missing", "teamId": normalized}
	var clicked_action_id := str(button.get_meta("troop_team_card_action_id", "")).strip_edges()
	var clicked_team_id := str(button.get_meta("troop_team_card_team_id", "")).strip_edges()
	var clicked_label := str(button.get_meta("troop_team_card_live_text_label", button.text)).strip_edges()
	var clicked_token := str(button.get_meta("troop_team_card_button_token", "")).strip_edges()
	var clicked_live_text_contract := str(button.get_meta("troop_team_card_live_text_contract", "")).strip_edges()
	var clicked_button_name := button.name
	button.emit_signal("pressed")
	await get_tree().process_frame
	var selected_ok := _active_team_id == normalized
	return {
		"ok": selected_ok,
		"reason": "troop_team_button_clicked" if selected_ok else "troop_team_button_click_failed",
		"teamId": normalized,
		"clickedActionId": clicked_action_id,
		"clickedTeamId": clicked_team_id,
		"clickedLabel": clicked_label,
		"clickedToken": clicked_token,
		"clickedLiveTextContract": clicked_live_text_contract,
		"clickedButtonName": clicked_button_name,
	}


func _find_troop_team_button(team_id: String) -> Button:
	return _find_troop_team_button_recursive(self, "TroopTeamButton_%s" % team_id)


func _find_troop_team_button_recursive(root: Node, target_name: String) -> Button:
	if root == null or not is_instance_valid(root):
		return null
	var button := root as Button
	if button != null and button.name == target_name:
		return button
	for child in root.get_children():
		var found := _find_troop_team_button_recursive(child, target_name)
		if found != null:
			return found
	return null


func _build_ai_troop_team_view_context_payload(team: Dictionary) -> Dictionary:
	if team.is_empty():
		return {}
	var team_id := str(team.get("id", "")).strip_edges()
	if team_id == "":
		return {}
	var owner_type := str(team.get("owner_type", team.get("ownerType", ""))).strip_edges().to_lower()
	var ai_player_id := str(team.get("ai_player_id", team.get("aiPlayerId", ""))).strip_edges()
	if owner_type != "ai" and ai_player_id == "":
		return {}
	var hero_names: Array[String] = []
	for slot_value in _troop_team_slots(team):
		if slot_value is Dictionary:
			var slot := slot_value as Dictionary
			var general_name := str(slot.get("general_name", slot.get("generalName", ""))).strip_edges()
			if general_name != "":
				hero_names.append(general_name)
	return {
		"teamId": team_id,
		"teamIndex": int(team.get("team_index", team.get("teamIndex", 0))),
		"teamName": str(team.get("name", "")).strip_edges(),
		"ownerType": "ai",
		"aiPlayerId": ai_player_id,
		"aiPlayerName": str(team.get("aiPlayerName", team.get("ai_player_name", ""))).strip_edges(),
		"controllerLabel": _troop_slot_controller_label({}, team),
		"heroNames": hero_names,
	}


func _troop_formation_read_model() -> Dictionary:
	if not _troop_formation_read_model_cache.is_empty():
		return _troop_formation_read_model_cache
	if not FileAccess.file_exists(TROOP_FORMATION_READ_MODEL_PATH):
		return {}
	var file := FileAccess.open(TROOP_FORMATION_READ_MODEL_PATH, FileAccess.READ)
	if file == null:
		return {}
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	file.close()
	if parsed is Dictionary:
		_troop_formation_read_model_cache = (parsed as Dictionary).duplicate(true)
	return _troop_formation_read_model_cache


func _troop_formation_teams() -> Array:
	var teams_value: Variant = _troop_formation_read_model().get("teams", [])
	if teams_value is Array:
		return teams_value as Array
	return []


func _selected_troop_team() -> Dictionary:
	if _active_team_id.strip_edges() == "":
		return {}
	var selected := _find_troop_team(_active_team_id)
	if not selected.is_empty():
		return selected
	for team_value in _troop_formation_teams():
		if team_value is Dictionary:
			var team := team_value as Dictionary
			return team
	return {}


func _find_troop_team(team_id: String) -> Dictionary:
	var normalized := team_id.strip_edges()
	for team_value in _troop_formation_teams():
		if team_value is Dictionary:
			var team := team_value as Dictionary
			if str(team.get("id", "")) == normalized:
				return team
	return {}


func _troop_team_index(team: Dictionary) -> int:
	var explicit_index := int(team.get("team_index", team.get("teamIndex", 0)))
	if explicit_index > 0:
		return explicit_index
	var team_id := str(team.get("id", team.get("team_id", ""))).strip_edges()
	var digits := ""
	for index in range(team_id.length()):
		var character := team_id.substr(index, 1)
		if character.is_valid_int():
			digits += character
	return int(digits) if digits != "" else 1


func _troop_team_slots(team: Dictionary) -> Array:
	var slots_value: Variant = team.get("slots", [])
	if slots_value is Array:
		return slots_value as Array
	return []


func _troop_slot_has_general(slot: Dictionary) -> bool:
	if str(slot.get("slot_state", slot.get("slotState", ""))).strip_edges().to_lower() == "empty":
		return false
	return (
		str(slot.get("hero_id", slot.get("heroId", ""))).strip_edges() != ""
		or str(slot.get("general_name", slot.get("generalName", ""))).strip_edges() != ""
	)


func _troop_assigned_slot_count(team: Dictionary) -> int:
	var count := 0
	for slot_value in _troop_team_slots(team):
		if slot_value is Dictionary and _troop_slot_has_general(slot_value as Dictionary):
			count += 1
	return count


func _troop_leader_slot(team: Dictionary) -> Dictionary:
	for slot_value in _troop_team_slots(team):
		if slot_value is Dictionary:
			var slot := slot_value as Dictionary
			if str(slot.get("slot", "")) == "camp" and _troop_slot_has_general(slot):
				return slot
	for slot_value in _troop_team_slots(team):
		if slot_value is Dictionary and _troop_slot_has_general(slot_value as Dictionary):
			return slot_value as Dictionary
	return {}


func _troop_team_card_live_text_label(team: Dictionary) -> String:
	var team_id := str(team.get("id", "")).strip_edges()
	var controller_label := _troop_slot_controller_label({}, team).strip_edges()
	if controller_label != "":
		return "%s %s" % [team_id, controller_label]
	return team_id


func submit_selected_troop_formation_for_smoke() -> bool:
	var team := _selected_troop_team()
	if team.is_empty():
		return false
	_emit_troop_formation_submit(team)
	return true


func _emit_troop_formation_submit(team: Dictionary) -> void:
	var payload := _build_troop_formation_submit_payload(team)
	_last_troop_formation_submit_payload = payload.duplicate(true)
	troop_formation_submit_requested.emit(payload)


func _build_troop_formation_submit_payload(team: Dictionary) -> Dictionary:
	var slot_by_id := _troop_slot_dictionary_by_id(team)
	var ordered_slot_ids := ["front", "mid", "camp"]
	var hero_ids: Array[String] = []
	var hero_names: Array[String] = []
	var slot_payloads: Array = []
	for slot_id_variant in ordered_slot_ids:
		var slot_id := str(slot_id_variant)
		var slot: Dictionary = slot_by_id.get(slot_id, {}) as Dictionary
		if slot.is_empty():
			continue
		var hero_id := _troop_slot_hero_id(slot)
		var hero_name := str(slot.get("general_name", slot.get("heroName", ""))).strip_edges()
		slot_payloads.append({
			"slot": slot_id,
			"mapVisualRole": _troop_slot_map_visual_role(slot_id),
			"heroId": hero_id,
			"heroName": hero_name,
			"troopType": str(slot.get("troop_type", slot.get("troopType", ""))).strip_edges(),
		})
		if hero_id != "" and not hero_ids.has(hero_id):
			hero_ids.append(hero_id)
		if hero_name != "":
			hero_names.append(hero_name)
	var co_hero_ids: Array[String] = []
	for hero_index in range(1, hero_ids.size()):
		co_hero_ids.append(hero_ids[hero_index])
		if co_hero_ids.size() >= 2:
			break
	var submit_mode := _resolve_troop_team_submit_mode(team)
	var ai_player_id := str(team.get("ai_player_id", team.get("aiPlayerId", ""))).strip_edges()
	var duplicate_names := _troop_duplicate_general_names(hero_names)
	var duplicate_name_blocked := not duplicate_names.is_empty()
	return {
		"teamId": str(team.get("id", "")).strip_edges(),
		"teamIndex": _troop_team_index(team),
		"teamTitle": str(team.get("title", team.get("name", ""))).strip_edges(),
		"submitMode": submit_mode,
		"ownerType": str(team.get("owner_type", team.get("ownerType", ""))).strip_edges(),
		"factionId": str(team.get("faction_id", team.get("factionId", _context.get("factionId", "")))).strip_edges(),
		"aiPlayerId": ai_player_id,
		"tileId": str(_context.get("tileId", "")).strip_edges(),
		"formationOrder": "front_mid_camp_to_map_visual_roles_v1",
		"heroId": hero_ids[0] if not hero_ids.is_empty() else "",
		"coHeroIds": co_hero_ids,
		"heroIds": hero_ids,
		"slots": slot_payloads,
		"duplicateNameRule": "block_same_general_name_v1",
		"duplicateNameBlocked": duplicate_name_blocked,
		"duplicateGeneralNames": duplicate_names,
		"canSubmit": submit_mode == "player_direct" and hero_ids.size() >= 3 and str(_context.get("tileId", "")).strip_edges() != "" and not duplicate_name_blocked,
	}


func _troop_slot_dictionary_by_id(team: Dictionary) -> Dictionary:
	var result := {}
	for slot_value in _troop_team_slots(team):
		if not (slot_value is Dictionary):
			continue
		var slot := slot_value as Dictionary
		var slot_id := str(slot.get("slot", "")).strip_edges()
		if slot_id != "":
			result[slot_id] = slot
	return result


func _troop_duplicate_general_names(hero_names: Array[String]) -> Array[String]:
	var seen := {}
	var duplicates: Array[String] = []
	for name in hero_names:
		var normalized := name.strip_edges()
		if normalized == "":
			continue
		if seen.has(normalized):
			if not duplicates.has(normalized):
				duplicates.append(normalized)
		else:
			seen[normalized] = true
	return duplicates


func _troop_slot_hero_id(slot: Dictionary) -> String:
	return str(slot.get("hero_id", slot.get("heroId", ""))).strip_edges()


func _troop_slot_map_visual_role(slot_id: String) -> String:
	match slot_id.strip_edges():
		"front":
			return "vanguard"
		"mid":
			return "center"
		"camp":
			return "camp"
		_:
			return ""


func _resolve_troop_team_submit_mode(team: Dictionary) -> String:
	var owner_type := str(team.get("owner_type", team.get("ownerType", ""))).strip_edges().to_lower()
	var ai_player_id := str(team.get("ai_player_id", team.get("aiPlayerId", ""))).strip_edges()
	if owner_type == "ai" or ai_player_id != "":
		return "ai_instruction_required"
	var team_faction_id := str(team.get("faction_id", team.get("factionId", ""))).strip_edges()
	var context_faction_id := str(_context.get("factionId", "")).strip_edges()
	if owner_type == "human" or owner_type == "player":
		return "player_direct"
	if team_faction_id != "" and context_faction_id != "" and team_faction_id == context_faction_id:
		return "player_direct"
	return "ai_instruction_required"


func _troop_team_action_locked(team: Dictionary) -> bool:
	return _resolve_troop_team_submit_mode(team) == "ai_instruction_required"


func _troop_detail_portrait_resolution_summary(team: Dictionary) -> Dictionary:
	var fallback_count := 0
	var slot_count := 0
	for slot_value in _troop_team_slots(team):
		if not (slot_value is Dictionary):
			continue
		var slot := slot_value as Dictionary
		if not _troop_slot_has_general(slot):
			continue
		var asset_ref := _snapshot_dictionary_from(slot.get("asset_ref", {}))
		if asset_ref.is_empty():
			continue
		slot_count += 1
		if PORTRAIT_ASSET_REGISTRY.portrait_res_path(asset_ref) == "":
			fallback_count += 1
	var resolved_by := UI_COMPONENT_FACTORY.PORTRAIT_FRAME_REGISTRY_ID
	if slot_count <= 0:
		resolved_by = ""
	elif fallback_count > 0:
		resolved_by = "asset_ref_path"
	return {
		"resolve_mode": "registry_first",
		"resolved_by": resolved_by,
		"fallback_count": fallback_count,
	}


func _troop_roster_portrait_resolution_summary() -> Dictionary:
	var fallback_count := 0
	var slot_count := 0
	for team_value in _troop_formation_teams():
		if not (team_value is Dictionary):
			continue
		var leader_slot := _troop_leader_slot(team_value as Dictionary)
		if not _troop_slot_has_general(leader_slot):
			continue
		var asset_ref := _snapshot_dictionary_from(leader_slot.get("asset_ref", {}))
		if asset_ref.is_empty():
			continue
		slot_count += 1
		if PORTRAIT_ASSET_REGISTRY.portrait_res_path(asset_ref) == "":
			fallback_count += 1
	var resolved_by := UI_COMPONENT_FACTORY.PORTRAIT_FRAME_REGISTRY_ID
	if slot_count <= 0:
		resolved_by = ""
	elif fallback_count > 0:
		resolved_by = "asset_ref_path"
	return {
		"resolve_mode": "registry_first",
		"resolved_by": resolved_by,
		"fallback_count": fallback_count,
	}


func _troop_roster_general_line(team: Dictionary) -> String:
	var parts: Array[String] = []
	for slot_value in _troop_team_slots(team):
		if slot_value is Dictionary:
			var slot := slot_value as Dictionary
			parts.append("%s %s" % [str(slot.get("label", "")), str(slot.get("general_name", ""))])
	var line := ""
	for index in parts.size():
		if index > 0:
			line += "  /  "
		line += parts[index]
	return line


func _snapshot_dictionary_from(value: Variant) -> Dictionary:
	if value is Dictionary:
		return (value as Dictionary).duplicate(true)
	return {}


func _format_troop_int(value: Variant) -> String:
	return str(int(round(float(value))))


func _build_troop_context_summary() -> Dictionary:
	var read_model: Dictionary = _troop_formation_read_model()
	var selected_team: Dictionary = _selected_troop_team()
	var slot_count: int = _troop_team_slots(selected_team).size()
	var detail_visible: bool = _active_team_id.strip_edges() != ""
	var assigned_slot_count: int = _troop_assigned_slot_count(selected_team) if detail_visible else 0
	var empty_slot_count: int = max(0, slot_count - assigned_slot_count)
	var compact: bool = _troop_compact_layout_active()
	var team_count: int = _troop_formation_teams().size()
	var team_card_size: Vector2 = _troop_team_card_size(compact)
	var team_card_gap: int = _troop_team_card_gap(compact)
	var team_pool_placement := str(read_model.get("team_pool_placement", "bottom_strip"))
	var roster_portrait_resolution := _troop_roster_portrait_resolution_summary()
	var detail_portrait_resolution := _troop_detail_portrait_resolution_summary(selected_team) if detail_visible else {}
	var submit_payload := _build_troop_formation_submit_payload(selected_team) if detail_visible else {}
	var selected_controller_label := ""
	var action_labels := ["配置", "征兵"] if detail_visible else []
	var action_locked := detail_visible and _troop_team_action_locked(selected_team)
	var troop_type_chip_labels: Array[String] = []
	var troop_type_chip_visual_types: Array[String] = []
	if detail_visible:
		selected_controller_label = _troop_slot_controller_label({}, selected_team)
		for slot_value in _troop_team_slots(selected_team):
			if not (slot_value is Dictionary):
				continue
			var slot := slot_value as Dictionary
			if not _troop_slot_has_general(slot):
				continue
			var troop_type := str(slot.get("troop_type", slot.get("troopType", ""))).strip_edges()
			if troop_type == "":
				troop_type = "部队"
			troop_type_chip_labels.append(troop_type)
			var unit_ref := _snapshot_dictionary_from(slot.get("unit_asset_ref", slot.get("unitAssetRef", {})))
			troop_type_chip_visual_types.append(_resolve_troop_unit_visual_type(slot, unit_ref))
	var summary := {
		"troopFormationViewMode": "three_general_team_detail_v2" if detail_visible else "team_card_pool_v1",
		"troopFormationDataSource": str(read_model.get("data_source", "read_model")),
		"troopFormationReadModelAuthoritySource": str(read_model.get("read_model_authority_source", "")),
		"troopFormationReadModelPath": TROOP_FORMATION_READ_MODEL_PATH,
		"troopFormationSchemaVersion": str(read_model.get("schema_version", "")),
		"troopFormationAssetRefMode": str(read_model.get("asset_ref_mode", "")),
		"troopFormationLayoutToken": "city_space_team_card_pool_to_detail_v2",
		"troopFormationDetailLayoutToken": "commercial_drill_ground_layered_slot_anchor_polish_v10" if detail_visible else "",
		"troopFormationDetailSlotRoleMode": "camp_mid_front_layered_hero_cards_grounded_manifest_units_v10" if detail_visible else "",
		"troopFormationTeamListOrientation": str(read_model.get("team_list_orientation", "vertical")),
		"troopFormationTeamPoolPlacement": team_pool_placement,
		"troopFormationRosterCardTextMode": str(read_model.get("roster_card_text_mode", "portrait_current_soldiers_only_v1")),
		"troopFormationRosterCardVisualDensity": str(read_model.get("roster_card_visual_density", "larger_portrait_raised_pool_v3")),
		"troopFormationRosterPortraitScaleMode": str(read_model.get("roster_portrait_scale_mode", UI_COMPONENT_FACTORY.PORTRAIT_FRAME_FIT_CONTAINED_SAFE)),
		"troopFormationPoolTitleVisible": false,
		"troopFormationTeamNameVisible": false,
		"troopFormationSoldierMaxVisible": false,
		"troopFormationCityCompositionTextVisible": false,
		"troopFormationCityModelVisible": not detail_visible,
		"troopFormationFacilityEntryVisible": not detail_visible,
		"troopFormationCompositionNodeLabelVisible": false,
		"troopFormationFacilityEntryMode": "building_tree_single_tile_v1",
		"troopFormationFacilityEntryTileOnly": true,
		"troopFormationFacilityEntryPngVisible": false,
		"troopFormationRosterCardPortraitSource": "leader_slot_asset_ref",
		"troopFormationPortraitAssetSource": str(read_model.get("portrait_asset_source", UI_COMPONENT_FACTORY.PORTRAIT_FRAME_ASSET_LOCKED_OR_DISPLAY_PREVIEW)),
		"troopFormationRosterPortraitResolveMode": str(roster_portrait_resolution.get("resolve_mode", "")),
		"troopFormationRosterPortraitResolvedBy": str(roster_portrait_resolution.get("resolved_by", "")),
		"troopFormationRosterPortraitFallbackCount": int(roster_portrait_resolution.get("fallback_count", 0)),
		"troopFormationExternalExchangeBundleVisible": false,
		"troopFormationDetailVisible": detail_visible,
		"troopFormationOverviewPanelVisible": detail_visible,
		"troopFormationFullPreviewVisible": false,
		"troopFormationDetailTeamNameVisible": false,
		"troopFormationDetailSoldierMaxVisible": false,
		"troopFormationDetailActionRowVisible": detail_visible,
		"troopFormationSubmitButtonVisible": false,
		"troopFormationActionLabels": action_labels,
		"troopFormationActionLocked": action_locked,
		"troopFormationActionLockedHintVisible": action_locked and _troop_action_hint_text.strip_edges() != "",
		"troopFormationActionLockedHintText": _troop_action_hint_text if action_locked else "",
		"troopFormationAiTeamContextPayload": _build_ai_troop_team_view_context_payload(selected_team) if detail_visible else {},
		"troopFormationDetailToolMode": _troop_detail_tool_mode if detail_visible else "",
		"troopFormationUnitAssetSource": str(read_model.get("unit_preview_asset_source", "")),
		"troopFormationUnitAnimationMode": "manifest_direction_r_10_frame_timer_cycle_v1" if detail_visible else "",
		"troopFormationUnitAnimationFrameCount": 10 if detail_visible else 0,
		"troopFormationUnitAnimationIntervalSec": TROOP_UNIT_PREVIEW_ANIMATION_FRAME_INTERVAL_SEC if detail_visible else 0.0,
		"troopFormationSelectedDetailSlotId": _selected_troop_detail_slot_id,
		"troopFormationSubmitMode": str(submit_payload.get("submitMode", "")),
		"troopFormationFormalSubmitAvailable": bool(submit_payload.get("canSubmit", false)),
		"troopFormationDuplicateNameRule": str(submit_payload.get("duplicateNameRule", "")),
		"troopFormationDuplicateNameBlocked": bool(submit_payload.get("duplicateNameBlocked", false)),
		"troopFormationDuplicateGeneralNames": submit_payload.get("duplicateGeneralNames", []),
		"troopFormationAiInstructionRequired": str(submit_payload.get("submitMode", "")) == "ai_instruction_required",
		"troopFormationSubmitFormationOrder": str(submit_payload.get("formationOrder", "")),
		"troopFormationLastSubmitMode": str(_last_troop_formation_submit_payload.get("submitMode", "")),
		"troopFormationLastSubmitTeamId": str(_last_troop_formation_submit_payload.get("teamId", "")),
		"troopFormationDetailPortraitResolveMode": str(detail_portrait_resolution.get("resolve_mode", "")),
		"troopFormationDetailPortraitResolvedBy": str(detail_portrait_resolution.get("resolved_by", "")),
		"troopFormationDetailPortraitFallbackCount": int(detail_portrait_resolution.get("fallback_count", 0)),
		"troopFormationTeamCount": team_count,
		"troopFormationSelectedTeamId": str(selected_team.get("id", "")),
		"troopFormationSelectedTeamIndex": int(selected_team.get("team_index", selected_team.get("teamIndex", 0))) if detail_visible else 0,
		"troopFormationSelectedTeamBindSource": str(selected_team.get("team_bind_source", selected_team.get("teamBindSource", ""))).strip_edges() if detail_visible else "",
		"troopFormationSelectedTeamSourceUnitId": str(selected_team.get("source_unit_id", selected_team.get("sourceUnitId", ""))).strip_edges() if detail_visible else "",
		"troopFormationSelectedTeamSourceTeamId": str(selected_team.get("source_team_id", selected_team.get("sourceTeamId", ""))).strip_edges() if detail_visible else "",
		"troopFormationSelectedTeamSourceTeamIndex": int(selected_team.get("source_team_index", selected_team.get("sourceTeamIndex", 0))) if detail_visible else 0,
		"troopFormationSelectedTeamOwnerType": str(selected_team.get("owner_type", selected_team.get("ownerType", ""))).strip_edges(),
		"troopFormationSelectedTeamAiPlayerId": str(selected_team.get("ai_player_id", selected_team.get("aiPlayerId", ""))).strip_edges(),
		"troopFormationSelectedTeamControllerLabel": selected_controller_label,
		"troopFormationGeneralSlotCount": slot_count,
		"troopFormationAssignedSlotCount": assigned_slot_count,
		"troopFormationEmptySlotCount": empty_slot_count,
		"troopFormationRecruitBarCount": assigned_slot_count if detail_visible and _troop_detail_tool_mode == "recruit" else 0,
		"troopFormationSoldierBarCount": assigned_slot_count if detail_visible else 0,
		"troopFormationSlotSquadPreviewCount": assigned_slot_count if detail_visible else 0,
		"troopFormationTroopTypeChipToken": TROOP_FORMATION_TROOP_TYPE_CHIP_TOKEN if detail_visible else "",
		"troopFormationTroopTypeChipVisible": detail_visible and troop_type_chip_labels.size() > 0,
		"troopFormationTroopTypeChipCount": _count_visible_nodes_by_meta(self, "troop_formation_troop_type_chip_token", TROOP_FORMATION_TROOP_TYPE_CHIP_TOKEN) if detail_visible else 0,
		"troopFormationTroopTypeChipLabels": troop_type_chip_labels,
		"troopFormationTroopTypeChipVisualTypes": troop_type_chip_visual_types,
		"troopFormationEmptySlotVisualMode": "empty_slot_card_no_unit_preview_v1" if detail_visible and empty_slot_count > 0 else "",
		"troopFormationVisibleTeamCardCount": team_count,
		"troopFormationEngineeringCopyVisible": false,
		"troopFormationBrowserScrollbarVisible": false,
	}
	var visible_target := UI_COMPONENT_FACTORY.card_rail_initial_visible_card_target(team_count)
	summary["troopFormationInitialVisibleCardTarget"] = visible_target
	UI_COMPONENT_FACTORY.apply_card_rail_summary(summary, "troopFormationCardRail", visible_target)
	UI_COMPONENT_FACTORY.apply_card_rail_geometry_summary(summary, "troopFormation", team_card_size.x, team_card_size.y, team_card_gap, team_count, visible_target)
	UI_COMPONENT_FACTORY.apply_portrait_frame_summary(summary, "troopFormationRoster", UI_COMPONENT_FACTORY.PORTRAIT_FRAME_ROSTER_CARD_VARIANT)
	UI_COMPONENT_FACTORY.apply_portrait_frame_summary(summary, "troopFormationDetail", UI_COMPONENT_FACTORY.PORTRAIT_FRAME_DETAIL_LARGE_VARIANT)
	return summary


func _build_slot_button(slot_id: String, label: String) -> Button:
	var button := Button.new()
	button.toggle_mode = true
	button.button_pressed = _active_slot_id == slot_id
	button.custom_minimum_size = Vector2(0.0, 82.0)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var assigned_id := str(_formation_slots.get(slot_id, ""))
	var assigned := _find_preview_general(assigned_id)
	var assigned_text := "待编入"
	if not assigned.is_empty():
		assigned_text = "%s | %s" % [str(assigned.get("name", "")), str(assigned.get("meta", ""))]
	button.text = "%s\n%s" % [label, assigned_text]
	button.add_theme_font_size_override("font_size", 15)
	button.add_theme_stylebox_override("normal", _make_panel_style(Color(0.15, 0.13, 0.10, 0.96), Color(0.48, 0.38, 0.22, 0.82), 1))
	button.add_theme_stylebox_override("hover", _make_panel_style(Color(0.22, 0.17, 0.10, 0.98), Color(0.82, 0.62, 0.28, 0.92), 1))
	button.add_theme_stylebox_override("pressed", _make_panel_style(Color(0.32, 0.22, 0.11, 0.98), Color(1.00, 0.74, 0.32, 0.96), 2))
	button.pressed.connect(func() -> void:
		_active_slot_id = slot_id
		_select_context_tab("troop")
	)
	return button


func _build_context_facility_view() -> Control:
	var split := HBoxContainer.new()
	split.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	split.size_flags_vertical = Control.SIZE_EXPAND_FILL
	split.add_theme_constant_override("separation", 12)
	split.add_child(_build_facility_context_stage())
	var note := _make_context_panel(Color(0.090, 0.080, 0.066, 0.90), Color(0.56, 0.43, 0.24, 0.70))
	note.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	split.add_child(note)
	var note_margin := MarginContainer.new()
	note_margin.add_theme_constant_override("margin_left", 16)
	note_margin.add_theme_constant_override("margin_top", 14)
	note_margin.add_theme_constant_override("margin_right", 16)
	note_margin.add_theme_constant_override("margin_bottom", 14)
	note.add_child(note_margin)
	var note_col := VBoxContainer.new()
	note_col.add_theme_constant_override("separation", 10)
	note_margin.add_child(note_col)
	note_col.add_child(_make_context_label("设施说明", 18))
	note_col.add_child(_make_context_label("校场、募兵所、统帅厅与市井围绕主府展开，点选节点查看当前营建设令。", 13, true))
	note_col.add_child(_build_facility_status_cards())
	note_col.add_child(_build_facility_route_preview())
	var interior_button := _make_context_action_button("打开内政面板")
	interior_button.pressed.connect(Callable(self, "request_entry").bind("interior"))
	note_col.add_child(interior_button)
	return split


func _build_facility_context_stage() -> Control:
	var panel := _make_context_panel(Color(0.105, 0.115, 0.092, 0.91), Color(0.66, 0.50, 0.27, 0.76))
	panel.custom_minimum_size = Vector2(560.0, 0.0)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 16)
	margin.add_theme_constant_override("margin_top", 14)
	margin.add_theme_constant_override("margin_right", 16)
	margin.add_theme_constant_override("margin_bottom", 14)
	panel.add_child(margin)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 10)
	margin.add_child(col)
	col.add_child(_make_context_label("主城设施组成 · %s已选中" % _active_facility_label(), 19))
	col.add_child(_make_context_label("主府内城节点已聚焦，设施状态、队列与营建设令随选中对象同步。", 12, true))
	col.add_child(_build_facility_city_core())

	var grid := GridContainer.new()
	grid.columns = 2
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 10)
	grid.add_theme_constant_override("v_separation", 10)
	col.add_child(grid)
	for building in PREVIEW_BUILDINGS:
		var building_id := str(building.get("id", ""))
		var selected := building_id == _active_building_id
		var border := Color(0.62, 0.48, 0.27, 0.74)
		var border_width := 1
		if selected:
			border = Color(1.00, 0.74, 0.28, 0.98)
			border_width = 2
		var card := _make_context_panel(_facility_node_color(building_id), border)
		card.add_theme_stylebox_override("panel", _make_panel_style(_facility_node_color(building_id), border, border_width))
		card.custom_minimum_size = Vector2(0.0, 82.0)
		var card_margin := MarginContainer.new()
		card_margin.add_theme_constant_override("margin_left", 12)
		card_margin.add_theme_constant_override("margin_top", 10)
		card_margin.add_theme_constant_override("margin_right", 12)
		card_margin.add_theme_constant_override("margin_bottom", 10)
		card.add_child(card_margin)
		var card_col := VBoxContainer.new()
		card_col.add_theme_constant_override("separation", 4)
		card_margin.add_child(card_col)
		var selected_suffix := " · 选中" if selected else ""
		card_col.add_child(_make_context_label("%s · %s%s" % [str(building.get("label", "")), str(building.get("status", "")), selected_suffix], 15, true))
		card_col.add_child(_make_context_label(str(building.get("body", "")), 11, true))
		var button := _make_context_action_button("进入节点" if not selected else "查看模板反馈")
		button.pressed.connect(Callable(self, "_open_context_building_tree_for").bind(building_id))
		card_col.add_child(button)
		grid.add_child(card)
	return panel


func _build_facility_status_cards() -> Control:
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	for building in PREVIEW_BUILDINGS:
		var chip := _make_context_panel(Color(0.14, 0.12, 0.09, 0.90), Color(0.56, 0.43, 0.24, 0.68))
		chip.custom_minimum_size = Vector2(0.0, 42.0)
		var label := _make_context_label("%s  %s" % [str(building.get("label", "")), str(building.get("level", ""))], 11, true)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		chip.add_child(label)
		grid.add_child(chip)
	return grid


func _open_context_building_tree_for(building_id: String) -> void:
	if not _find_preview_building(building_id).is_empty():
		_active_building_id = building_id
	_select_context_tab("building_tree")


func _build_context_building_tree_view() -> Control:
	var split := HBoxContainer.new()
	split.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	split.size_flags_vertical = Control.SIZE_EXPAND_FILL
	split.add_theme_constant_override("separation", 12)
	_building_tree = BUILDING_TREE_VIEW_SCENE.instantiate()
	_upgrade_sheet = BUILD_UPGRADE_SHEET_SCENE.instantiate()
	if _building_tree is Control:
		var tree_control := _building_tree as Control
		tree_control.custom_minimum_size = Vector2(330.0, 0.0)
		tree_control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		tree_control.size_flags_vertical = Control.SIZE_EXPAND_FILL
	if _upgrade_sheet is Control:
		var sheet_control := _upgrade_sheet as Control
		sheet_control.custom_minimum_size = Vector2(350.0, 0.0)
		sheet_control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		sheet_control.size_flags_vertical = Control.SIZE_EXPAND_FILL
	split.add_child(_build_facility_composition_stage())
	split.add_child(_building_tree)
	split.add_child(_upgrade_sheet)
	if _building_tree != null and _building_tree.has_method("set_tree_contract"):
		_building_tree.call("set_tree_contract", _build_context_tree_contract())
	if _upgrade_sheet != null and _upgrade_sheet.has_method("set_sheet_contract"):
		var initial_building := _find_preview_building(_active_building_id)
		if initial_building.is_empty():
			initial_building = PREVIEW_BUILDINGS[0]
			_active_building_id = str(initial_building.get("id", ""))
		_upgrade_sheet.call("set_sheet_contract", _build_context_sheet_contract(initial_building))
	if _building_tree != null and _building_tree.has_signal("building_selected"):
		var callback := func(building_id: String) -> void:
			_select_context_building_template(building_id)
		_building_tree.connect("building_selected", callback)
	return split


func _build_facility_composition_stage() -> Control:
	var stage := _make_context_panel(Color(0.13, 0.12, 0.09, 0.90), Color(0.72, 0.54, 0.28, 0.78))
	stage.custom_minimum_size = Vector2(380.0, 0.0)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 12)
	stage.add_child(margin)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 10)
	margin.add_child(col)
	col.add_child(_make_context_label("主城设施组成 · %s已选中" % _active_facility_label(), 18))
	col.add_child(_make_context_label("选中设施沿城内节点承接到建筑树与营建设令，右侧显示当前模板反馈。", 12, true))
	col.add_child(_build_facility_city_core())
	var node_grid := GridContainer.new()
	node_grid.columns = 2
	node_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	node_grid.add_theme_constant_override("h_separation", 8)
	node_grid.add_theme_constant_override("v_separation", 8)
	col.add_child(node_grid)
	for building in PREVIEW_BUILDINGS:
		var building_id := str(building.get("id", ""))
		var selected := building_id == _active_building_id
		var button := Button.new()
		button.focus_mode = Control.FOCUS_NONE
		button.custom_minimum_size = Vector2(0.0, 58.0)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.text = "%s\n%s%s" % [str(building.get("label", "")), str(building.get("status", "")), "\n选中" if selected else ""]
		button.add_theme_font_size_override("font_size", 13)
		var normal_border := Color(0.58, 0.44, 0.24, 0.72)
		var normal_width := 1
		if selected:
			normal_border = Color(1.00, 0.74, 0.28, 0.98)
			normal_width = 2
		button.add_theme_stylebox_override("normal", _make_panel_style(_facility_node_color(building_id), normal_border, normal_width))
		button.add_theme_stylebox_override("hover", _make_panel_style(Color(0.24, 0.17, 0.09, 0.98), Color(0.90, 0.66, 0.30, 0.96), 1))
		button.add_theme_stylebox_override("pressed", _make_panel_style(Color(0.34, 0.22, 0.10, 0.98), Color(1.00, 0.76, 0.32, 0.96), 2))
		button.pressed.connect(Callable(self, "_select_context_building_template").bind(building_id))
		node_grid.add_child(button)
	col.add_child(_build_facility_stage_footer())
	return stage


func _build_facility_city_core() -> Control:
	var core := _make_context_panel(Color(0.20, 0.19, 0.13, 0.92), Color(0.70, 0.54, 0.28, 0.76))
	core.custom_minimum_size = Vector2(0.0, 138.0)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_bottom", 10)
	core.add_child(margin)
	var rows := VBoxContainer.new()
	rows.add_theme_constant_override("separation", 6)
	margin.add_child(rows)
	rows.add_child(_build_facility_stage_row(["城门", "校场", "募兵所"]))
	rows.add_child(_build_facility_stage_row(["市井", "主府", "统帅厅"]))
	rows.add_child(_build_facility_stage_row(["仓廪", "道路", "巡防"]))
	return core


func _build_facility_stage_row(labels: Array) -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 6)
	for label_variant in labels:
		var label_text := str(label_variant)
		var building_id := _facility_label_to_building_id(label_text)
		var selected := building_id != "" and building_id == _active_building_id
		var tile_color := _facility_node_color(building_id) if building_id != "" else _city_tile_color(label_text)
		var border := Color(0.64, 0.49, 0.27, 0.72)
		var border_width := 1
		if selected:
			border = Color(1.00, 0.74, 0.28, 0.98)
			border_width = 2
		var tile := _make_context_panel(tile_color, border)
		tile.add_theme_stylebox_override("panel", _make_panel_style(tile_color, border, border_width))
		tile.custom_minimum_size = Vector2(0.0, 34.0)
		tile.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var label := _make_context_label(label_text if not selected else "%s\n选中" % label_text, 12)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		tile.add_child(label)
		row.add_child(tile)
	return row


func _build_facility_stage_footer() -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 6)
	for item in ["%s节点" % _active_facility_label(), "建筑树", "模板反馈"]:
		var chip := _make_context_panel(Color(0.16, 0.13, 0.09, 0.92), Color(0.58, 0.44, 0.24, 0.72))
		chip.custom_minimum_size = Vector2(0.0, 30.0)
		chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var label := _make_context_label(item, 12)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		chip.add_child(label)
		row.add_child(chip)
	return row


func _facility_node_color(building_id: String) -> Color:
	if building_id == _active_building_id:
		return Color(0.340, 0.210, 0.086, 0.98)
	if building_id == "drill_ground":
		return Color(0.205, 0.150, 0.084, 0.94)
	if building_id == "barracks":
		return Color(0.225, 0.156, 0.082, 0.94)
	if building_id == "command_hall":
		return Color(0.198, 0.142, 0.084, 0.94)
	return Color(0.215, 0.152, 0.078, 0.94)


func _facility_label_to_building_id(label: String) -> String:
	match label:
		"校场":
			return "drill_ground"
		"募兵所":
			return "barracks"
		"统帅厅":
			return "command_hall"
		"市井":
			return "market_plaza"
		_:
			return ""


func _active_facility_label() -> String:
	var selected := _find_preview_building(_active_building_id)
	if selected.is_empty():
		return "设施"
	return str(selected.get("label", "设施"))


func _build_city_stage() -> Control:
	var stage := _make_context_panel(Color(0.150, 0.105, 0.064, 0.86), Color(0.74, 0.55, 0.28, 0.74))
	stage.custom_minimum_size = Vector2(0.0, 340.0)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 16)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 16)
	stage.add_child(margin)
	var rows := VBoxContainer.new()
	rows.add_theme_constant_override("separation", 10)
	margin.add_child(rows)
	rows.add_child(_build_city_wall_row(["城门", "前锋", "中军", "大营"]))
	rows.add_child(_build_city_wall_row(["市井", "主府", "校场", "募兵所"]))
	rows.add_child(_build_city_wall_row(["仓廪", "统帅厅", "道路", "巡防"]))
	return stage


func _build_city_wall_row(labels: Array) -> Control:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 8)
	for label_variant in labels:
		var label := str(label_variant)
		var selected := label == "主府"
		var border := Color(0.68, 0.53, 0.30, 0.68)
		var border_width := 1
		if selected:
			border = Color(1.0, 0.74, 0.28, 0.98)
			border_width = 2
		var tile := _make_context_panel(_city_tile_color(label), border)
		tile.add_theme_stylebox_override("panel", _make_panel_style(_city_tile_color(label), border, border_width))
		tile.custom_minimum_size = Vector2(0.0, 78.0)
		tile.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var tile_label := _make_context_label(label, 19)
		tile_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		tile_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		tile.add_child(tile_label)
		row.add_child(tile)
	return row


func _city_tile_color(label: String) -> Color:
	if label == "主府":
		return Color(0.410, 0.245, 0.095, 0.98)
	if ["大营", "中军", "前锋", "校场", "募兵所", "统帅厅"].has(label):
		return Color(0.220, 0.155, 0.088, 0.94)
	if ["市井", "仓廪", "道路", "巡防"].has(label):
		return Color(0.245, 0.170, 0.090, 0.93)
	return Color(0.180, 0.135, 0.082, 0.92)


func _build_city_status_row() -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	for item in ["城防 82", "队列 3/5", "设施 4", "模板态"]:
		var chip := _make_context_panel(Color(0.14, 0.12, 0.09, 0.90), Color(0.58, 0.44, 0.24, 0.70))
		chip.custom_minimum_size = Vector2(0.0, 34.0)
		chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var label := _make_context_label(item, 12)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		chip.add_child(label)
		row.add_child(chip)
	return row


func _build_city_object_action_strip() -> Control:
	var panel := _make_context_panel(Color(0.120, 0.086, 0.052, 0.92), Color(0.70, 0.52, 0.27, 0.76))
	panel.custom_minimum_size = Vector2(0.0, 118.0)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_bottom", 10)
	panel.add_child(margin)
	var actions := GridContainer.new()
	actions.columns = 4
	actions.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	actions.add_theme_constant_override("h_separation", 10)
	actions.add_theme_constant_override("v_separation", 10)
	margin.add_child(actions)
	var entries := [
		{"label": "编队", "tab": "troop"},
		{"label": "设施", "tab": "facility"},
		{"label": "建筑树", "tab": "building_tree"},
		{"label": "内政", "entry": "interior"},
	]
	for entry in entries:
		var button := _make_context_action_button(str(entry.get("label", "")))
		button.custom_minimum_size = Vector2(0.0, 78.0)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		if str(entry.get("building", "")) != "":
			button.pressed.connect(Callable(self, "_open_context_building_tree_for").bind(str(entry.get("building", ""))))
		elif str(entry.get("entry", "")) != "":
			button.pressed.connect(Callable(self, "request_entry").bind(str(entry.get("entry", ""))))
		else:
			var tab_id := str(entry.get("tab", "overview"))
			button.pressed.connect(func() -> void:
				_select_context_tab(tab_id)
			)
		actions.add_child(button)
	return panel


func _build_troop_lane_preview() -> Control:
	var panel := _make_context_panel(Color(0.105, 0.095, 0.078, 0.90), Color(0.58, 0.44, 0.25, 0.70))
	panel.custom_minimum_size = Vector2(0.0, 144.0)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 10)
	panel.add_child(margin)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8)
	margin.add_child(col)
	col.add_child(_make_context_label("城门集结线", 15))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	col.add_child(row)
	for item in ["前锋", "中军", "大营", "预备"]:
		var lane := _make_context_panel(Color(0.16, 0.14, 0.10, 0.92), Color(0.62, 0.48, 0.27, 0.72))
		lane.custom_minimum_size = Vector2(0.0, 58.0)
		lane.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var label := _make_context_label(item, 13)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		lane.add_child(label)
		row.add_child(lane)
	return panel


func _build_facility_route_preview() -> Control:
	var panel := _make_context_panel(Color(0.14, 0.12, 0.09, 0.88), Color(0.60, 0.46, 0.25, 0.70))
	panel.custom_minimum_size = Vector2(0.0, 170.0)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 12)
	panel.add_child(margin)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8)
	margin.add_child(col)
	for item in ["主城节点", "设施入口", "建筑树", "升级模板反馈"]:
		var row := _make_context_panel(Color(0.19, 0.15, 0.10, 0.92), Color(0.66, 0.50, 0.27, 0.72))
		row.custom_minimum_size = Vector2(0.0, 30.0)
		var label := _make_context_label(item, 12)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		row.add_child(label)
		col.add_child(row)
	return panel


func _build_context_tree_contract() -> Dictionary:
	var items: Array = []
	for building in PREVIEW_BUILDINGS:
		items.append({
			"id": str(building.get("id", "")),
			"label": str(building.get("label", "")),
			"meta": str(building.get("level", "")),
			"statusText": str(building.get("status", "")),
			"body": str(building.get("body", "")),
			"cost": str(building.get("cost", "")),
			"effect": str(building.get("effect", "")),
		})
	return {
		"title": "主城设施建筑树",
		"state_badge": "模板态",
		"tree_items": items,
		"selected_building_id": str(PREVIEW_BUILDINGS[0].get("id", "")),
		"empty_state_text": "等待设施建筑树数据。",
	}


func _build_context_sheet_contract(building: Dictionary) -> Dictionary:
	return {
		"title": "%s升级单" % str(building.get("label", "设施")),
		"subtitle": "来自主城设施节点的模板反馈，不请求后端。",
		"body": "%s\n\n对象链：主城设施组成 -> %s节点 -> 建筑树 -> 模板/排队态反馈。\n点击确认只显示反馈，不请求后端，不扣资源。" % [str(building.get("body", "")), str(building.get("label", "设施"))],
		"cost_summary": str(building.get("cost", "消耗：--")),
		"effect_summary": str(building.get("effect", "效果：--")),
		"primary_action_label": "加入模板队列",
		"secondary_action_label": "稍后处理",
		"close_button_label": "关闭",
		"has_payload": true,
	}


func _find_preview_general(general_id: String) -> Dictionary:
	for item in PREVIEW_GENERALS:
		var general: Dictionary = item as Dictionary
		if str(general.get("id", "")) == general_id:
			return general
	return {}


func _find_preview_building(building_id: String) -> Dictionary:
	for item in PREVIEW_BUILDINGS:
		var building: Dictionary = item as Dictionary
		if str(building.get("id", "")) == building_id:
			return building
	return {}


func _select_context_building_template(building_id: String) -> void:
	var selected := _find_preview_building(building_id)
	if selected.is_empty():
		return
	_active_building_id = building_id
	if _active_context_tab == "building_tree" and _context_content_host != null:
		_select_context_tab("building_tree")
	elif _upgrade_sheet != null and _upgrade_sheet.has_method("set_sheet_contract"):
		_upgrade_sheet.call("set_sheet_contract", _build_context_sheet_contract(selected))


func _assign_preview_general_to_slot(general_id: String) -> void:
	var target_slot := _active_slot_id
	if str(_formation_slots.get(target_slot, "")) != "":
		for slot_id in ["camp", "mid", "front"]:
			if str(_formation_slots.get(slot_id, "")) == "":
				target_slot = slot_id
				break
	_formation_slots[target_slot] = general_id
	_active_slot_id = target_slot


func _template_assignment_count() -> int:
	var count := 0
	for slot_id in _formation_slots.keys():
		if str(_formation_slots.get(slot_id, "")) != "":
			count += 1
	return count


func _play_context_panel_intro() -> void:
	if _context_panel == null:
		return
	if _context_backdrop != null:
		_context_backdrop.visible = true
		_context_backdrop.color = Color(0.0, 0.0, 0.0, 0.0)
	_context_panel.pivot_offset = _resolve_context_intro_pivot()
	_context_panel.modulate = Color(1.0, 1.0, 1.0, 0.0)
	_context_panel.scale = Vector2(0.945, 0.945)
	var tween := create_tween()
	tween.set_parallel(true)
	if _context_backdrop != null:
		tween.tween_property(_context_backdrop, "color:a", 0.30, 0.18).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(_context_panel, "modulate:a", 1.0, 0.18).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(_context_panel, "scale", Vector2.ONE, 0.24).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)


func _play_context_content_intro() -> void:
	if _context_content_host == null or not is_instance_valid(_context_content_host):
		return
	if _context_content_host.get_child_count() <= 0:
		return
	var root := _context_content_host.get_child(0) as Control
	if root == null:
		return
	var targets: Array[Control] = []
	for child in root.get_children():
		if child is Control:
			targets.append(child as Control)
	if targets.is_empty():
		targets.append(root)
	var tween := create_tween()
	tween.set_parallel(true)
	for index in targets.size():
		var target := targets[index]
		if target == null or not is_instance_valid(target):
			continue
		target.pivot_offset = target.size * 0.5
		target.modulate = Color(1.0, 1.0, 1.0, 0.0)
		target.scale = Vector2(0.985, 0.985)
		var delay := float(index) * 0.035
		tween.tween_property(target, "modulate:a", 1.0, 0.14).set_delay(delay).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tween.tween_property(target, "scale", Vector2.ONE, 0.18).set_delay(delay).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)


func _set_world_anchor_entry_visible(next_visible: bool, play_intro: bool = false) -> void:
	_world_anchor_entry_visible = next_visible
	if _entry_panel != null:
		_entry_panel.visible = next_visible
	if _hub_panel != null:
		_hub_panel.visible = COMPACT_HUB_BUTTON_VISIBLE and not _expanded and not next_visible
	if next_visible:
		_update_position()
		if play_intro:
			_play_world_anchor_entry_intro()


func _play_world_anchor_entry_intro() -> void:
	if _entry_panel == null:
		return
	_entry_panel.pivot_offset = _entry_panel.size * 0.5
	_entry_panel.modulate = Color(1.0, 1.0, 1.0, 0.0)
	_entry_panel.scale = Vector2(0.88, 0.88)
	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(_entry_panel, "modulate:a", 1.0, 0.16).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(_entry_panel, "scale", Vector2.ONE, 0.22).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


func _world_anchor_entry_button_labels() -> String:
	var labels: Array[String] = []
	if _world_enter_button != null:
		labels.append(_world_enter_button.text)
	return "|".join(labels)


func _world_anchor_entry_button_count() -> int:
	var count := 0
	if _world_enter_button != null and _world_enter_button is Button:
		count += 1
	return count


func _main_city_scene_entry_button_meta() -> Array[Dictionary]:
	var values: Array[Dictionary] = []
	_collect_main_city_scene_entry_button_meta(self, values)
	return values


func _collect_main_city_scene_entry_button_meta(root: Node, values: Array[Dictionary]) -> void:
	if root == null or not is_instance_valid(root):
		return
	var button := root as Button
	if button != null and button.visible and button.is_visible_in_tree() and button.has_meta("main_city_scene_entry_action_id"):
		values.append({
			"action_id": str(button.get_meta("main_city_scene_entry_action_id", "")).strip_edges(),
			"target_tab_id": str(button.get_meta("main_city_scene_entry_target_tab_id", "")).strip_edges(),
			"label": str(button.get_meta("main_city_scene_entry_live_text_label", button.text)).strip_edges(),
			"token": str(button.get_meta("main_city_scene_entry_button_token", "")).strip_edges(),
			"live_text_contract": str(button.get_meta("main_city_scene_entry_live_text_contract", "")).strip_edges(),
		})
	for child in root.get_children():
		_collect_main_city_scene_entry_button_meta(child, values)


func _main_city_scene_entry_button_meta_join(key: String) -> String:
	var values: Array[String] = []
	for row in _main_city_scene_entry_button_meta():
		values.append(str(row.get(key, "")).strip_edges())
	return "|".join(values)


func _main_city_scene_entry_button_missing_meta_count() -> int:
	var missing := 0
	for row in _main_city_scene_entry_button_meta():
		if str(row.get("action_id", "")).strip_edges() == "":
			missing += 1
		if str(row.get("target_tab_id", "")).strip_edges() == "":
			missing += 1
		if str(row.get("label", "")).strip_edges() == "":
			missing += 1
		if str(row.get("token", "")).strip_edges() != MAIN_CITY_SCENE_ENTRY_BUTTON_TOKEN:
			missing += 1
		if str(row.get("live_text_contract", "")).strip_edges() != MAIN_CITY_SCENE_ENTRY_LIVE_TEXT_CONTRACT:
			missing += 1
	return missing


func _main_city_scene_return_button_meta() -> Array[Dictionary]:
	var values: Array[Dictionary] = []
	_collect_main_city_scene_return_button_meta(self, values)
	return values


func _collect_main_city_scene_return_button_meta(root: Node, values: Array[Dictionary]) -> void:
	if root == null or not is_instance_valid(root):
		return
	var button := root as Button
	if button != null and button.visible and button.is_visible_in_tree() and button.has_meta("main_city_scene_return_action_id"):
		values.append({
			"action_id": str(button.get_meta("main_city_scene_return_action_id", "")).strip_edges(),
			"label": str(button.get_meta("main_city_scene_return_live_text_label", button.text)).strip_edges(),
			"token": str(button.get_meta("main_city_scene_return_button_token", "")).strip_edges(),
			"live_text_contract": str(button.get_meta("main_city_scene_return_live_text_contract", "")).strip_edges(),
		})
	for child in root.get_children():
		_collect_main_city_scene_return_button_meta(child, values)


func _main_city_scene_return_button_meta_join(key: String) -> String:
	var values: Array[String] = []
	for row in _main_city_scene_return_button_meta():
		values.append(str(row.get(key, "")).strip_edges())
	return "|".join(values)


func _main_city_scene_return_button_missing_meta_count() -> int:
	var missing := 0
	for row in _main_city_scene_return_button_meta():
		if str(row.get("action_id", "")).strip_edges() == "":
			missing += 1
		if str(row.get("label", "")).strip_edges() == "":
			missing += 1
		if str(row.get("token", "")).strip_edges() != MAIN_CITY_SCENE_RETURN_BUTTON_TOKEN:
			missing += 1
		if str(row.get("live_text_contract", "")).strip_edges() != MAIN_CITY_SCENE_RETURN_LIVE_TEXT_CONTRACT:
			missing += 1
	return missing


func _world_anchor_entry_anchor_ok() -> bool:
	var tile_id := str(_context.get("tileId", "")).strip_edges()
	var tile_x := int(_context.get("tileX", -1))
	var tile_y := int(_context.get("tileY", -1))
	return tile_id != "" and tile_x >= 0 and tile_y >= 0


func _resolve_context_intro_pivot() -> Vector2:
	var panel_position := _context_panel.global_position if _context_panel != null else Vector2.ZERO
	var anchor_position := _resolve_anchor_position()
	var local := anchor_position - panel_position
	var panel_size := _context_panel.size if _context_panel != null else CONTEXT_PANEL_SIZE
	return Vector2(
		clampf(local.x, 48.0, maxf(48.0, panel_size.x - 48.0)),
		clampf(local.y, 48.0, maxf(48.0, panel_size.y - 48.0))
	)


func _on_hub_button_pressed() -> void:
	if _expanded:
		set_expanded(false)
	else:
		open_world_anchor_entry(_context)


func _on_reduced_motion_button_pressed() -> void:
	if _reduced_motion_button != null:
		_reduced_motion_enabled = _reduced_motion_button.button_pressed
		_reduced_motion_button.button_pressed = _reduced_motion_enabled


func _on_world_enter_button_pressed() -> void:
	_last_world_entry_camera_push = {}
	var tile_x := int(_context.get("tileX", -1))
	var tile_y := int(_context.get("tileY", -1))
	if _map_grid != null and is_instance_valid(_map_grid) and tile_x >= 0 and tile_y >= 0:
		if _map_grid.has_method("focus_main_city_asset_entry_camera_push"):
			var push_variant: Variant = _map_grid.call("focus_main_city_asset_entry_camera_push", tile_x, tile_y, WORLD_ASSET_ENTRY_CAMERA_TARGET_ZOOM, WORLD_ASSET_ENTRY_CAMERA_EASE_DURATION_SEC)
			if push_variant is Dictionary:
				_last_world_entry_camera_push = (push_variant as Dictionary).duplicate(true)
		elif _map_grid.has_method("focus_and_select_main_map_cell_for_action"):
			var focus_variant: Variant = _map_grid.call("focus_and_select_main_map_cell_for_action", tile_x, tile_y)
			_last_world_entry_camera_push = {
				"ok": focus_variant is Dictionary,
				"token": WORLD_ASSET_ENTER_CAMERA_PUSH_TOKEN,
				"cameraPushMode": "focus_cell_without_zoom_fallback_v1",
				"targetCell": {"x": tile_x, "y": tile_y},
			}
	_set_world_anchor_entry_visible(false)
	await _play_main_city_enter_transition_mask()
	set_expanded(true)


func _play_main_city_enter_transition_mask() -> void:
	if _enter_transition_mask == null:
		return
	if _reduced_motion_enabled:
		_enter_transition_mask.visible = false
		_enter_transition_mask.color = Color(0.0, 0.0, 0.0, 0.0)
		return
	_enter_transition_mask.visible = true
	_enter_transition_mask.color = Color(0.0, 0.0, 0.0, 0.0)
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_SINE)
	tween.set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(_enter_transition_mask, "color", Color(0.0, 0.0, 0.0, 0.52), 0.12)
	tween.tween_property(_enter_transition_mask, "color", Color(0.0, 0.0, 0.0, 0.18), 0.16)
	await tween.finished
	_enter_transition_mask.visible = false
	_enter_transition_mask.color = Color(0.0, 0.0, 0.0, 0.0)


func _on_coordinate_jump_button_pressed() -> void:
	var payload := _build_current_coordinate_jump_payload()
	if payload.is_empty():
		return
	coordinate_jump_requested.emit(payload)


func _on_map_view_transform_changed(_view_state: Dictionary) -> void:
	_update_position()


func _update_position() -> void:
	if _hub_panel == null:
		return
	var viewport_size := get_viewport_rect().size
	var hub_position := Vector2(
		minf(maxf(230.0, viewport_size.x * 0.18), viewport_size.x - HUB_SIZE.x - 16.0),
		72.0
	)
	_hub_panel.size = HUB_SIZE
	_hub_panel.position = _clamp_panel_position(hub_position, HUB_SIZE)
	if _entry_panel != null:
		_entry_panel.size = WORLD_ASSET_ENTRY_POPOVER_SIZE
		var anchor_position := _resolve_anchor_position()
		var entry_position := anchor_position + Vector2(26.0, -WORLD_ASSET_ENTRY_POPOVER_SIZE.y - 24.0)
		_entry_panel.position = _clamp_panel_position(entry_position, WORLD_ASSET_ENTRY_POPOVER_SIZE)
	if _context_panel != null:
		var context_size := _resolve_context_panel_size(viewport_size)
		_context_panel.custom_minimum_size = context_size
		_context_panel.size = context_size
		if _troop_detail_fullscreen_active():
			_context_panel.position = Vector2.ZERO
		elif _active_context_tab == "overview":
			_context_panel.position = Vector2(0.0, minf(76.0, maxf(0.0, viewport_size.y - context_size.y)))
		else:
			_context_panel.position = Vector2(
				max(CONTEXT_PANEL_MARGIN.x, (viewport_size.x - context_size.x) * 0.5),
				max(CONTEXT_PANEL_TOP_MARGIN, viewport_size.y - context_size.y - CONTEXT_PANEL_BOTTOM_MARGIN)
			)
		_update_context_panel_chrome()


func _resolve_context_panel_size(viewport_size: Vector2) -> Vector2:
	if _troop_detail_fullscreen_active():
		return Vector2(maxf(320.0, viewport_size.x), maxf(320.0, viewport_size.y))
	if _active_context_tab == "overview":
		return Vector2(maxf(320.0, viewport_size.x), maxf(320.0, viewport_size.y - 76.0))
	var available_width := maxf(320.0, viewport_size.x - CONTEXT_PANEL_MARGIN.x * 2.0)
	var available_height := maxf(320.0, viewport_size.y - CONTEXT_PANEL_TOP_MARGIN - CONTEXT_PANEL_BOTTOM_MARGIN)
	var width := available_width
	var height := available_height
	return Vector2(width, height)


func _resolve_anchor_position() -> Vector2:
	if _map_grid == null or not is_instance_valid(_map_grid):
		return FALLBACK_SCREEN_POSITION
	var tile_id := str(_context.get("tileId", "")).strip_edges()
	var tile_x := int(_context.get("tileX", -1))
	var tile_y := int(_context.get("tileY", -1))
	if tile_id != "" and _map_grid.has_method("tile_id_to_screen_position"):
		return _map_grid.call("tile_id_to_screen_position", tile_id, maxi(tile_x, 0), maxi(tile_y, 0))
	if tile_x >= 0 and tile_y >= 0 and _map_grid.has_method("tile_to_screen_position"):
		return _map_grid.call("tile_to_screen_position", tile_x, tile_y)
	return FALLBACK_SCREEN_POSITION


func _clamp_panel_position(panel_position: Vector2, panel_size: Vector2) -> Vector2:
	var viewport_size := get_viewport_rect().size
	var margin := 12.0
	return Vector2(
		clampf(panel_position.x, margin, max(margin, viewport_size.x - panel_size.x - margin)),
		clampf(panel_position.y, margin, max(margin, viewport_size.y - panel_size.y - margin))
	)


func _build_tooltip() -> String:
	var title := str(_context.get("title", "主城中枢")).strip_edges()
	var tile_id := str(_context.get("tileId", "")).strip_edges()
	var status := str(_context.get("status", "")).strip_edges()
	var parts: Array[String] = [title]
	if tile_id != "":
		parts.append("地块 %s" % tile_id)
	if status != "":
		parts.append(status)
	return " | ".join(parts)


func _count_visible_nodes_by_name_prefix(root: Node, prefix: String) -> int:
	if root == null or not is_instance_valid(root):
		return 0
	var count := 0
	if root.name.begins_with(prefix):
		if not (root is CanvasItem) or (root as CanvasItem).visible:
			count += 1
	for child in root.get_children():
		count += _count_visible_nodes_by_name_prefix(child, prefix)
	return count


func _count_visible_nodes_by_meta(root: Node, meta_key: String, expected_value: String) -> int:
	var count := 0
	for child in root.get_children():
		count += _count_visible_nodes_by_meta(child, meta_key, expected_value)
	if root is CanvasItem:
		var item := root as CanvasItem
		if not item.visible or not item.is_visible_in_tree():
			return count
	if str(root.get_meta(meta_key, "")).strip_edges() == expected_value:
		count += 1
	return count


func _count_nodes_by_meta(root: Node, meta_key: String, expected_value: String) -> int:
	var count := 0
	for child in root.get_children():
		count += _count_nodes_by_meta(child, meta_key, expected_value)
	if str(root.get_meta(meta_key, "")).strip_edges() == expected_value:
		count += 1
	return count


func _is_main_city_mobile_viewport(viewport_size: Vector2) -> bool:
	return viewport_size.x < 920.0 or viewport_size.y < 560.0


func _rect_from_control(node: Node) -> Rect2:
	var control := node as Control
	if control == null or not is_instance_valid(control):
		return Rect2()
	return control.get_global_rect()


func _build_main_city_mobile_overlap_summary(viewport_size: Vector2) -> Dictionary:
	var mobile := _is_main_city_mobile_viewport(viewport_size)
	if not mobile:
		return {
			"mainCityHubMobileViewport": false,
			"mainCityHubMobileOverlapFree": true,
			"mainCityHubMobileOverlapHitCount": 0,
			"mainCityHubMobileOverlapPairs": "",
			"mainCityHubMobileOverlapCheckCount": 0,
		}
	var stage := _find_first_visible_node_by_name_prefix(self, "MainCityEnteredSpaceStage")
	if stage == null or not is_instance_valid(stage):
		var stage_anchor := _find_first_visible_node_by_name_prefix(self, "MainCitySceneStageTitle")
		if stage_anchor == null or not is_instance_valid(stage_anchor):
			stage_anchor = _find_first_visible_node_by_name_prefix(self, "MainCitySceneReturnMapButton")
		if stage_anchor == null or not is_instance_valid(stage_anchor):
			stage_anchor = _find_first_visible_node_by_name_prefix(self, "MainCitySceneFacilityModel")
		if stage_anchor == null or not is_instance_valid(stage_anchor):
			stage_anchor = _find_first_visible_node_by_name_prefix(self, "MainCityLivingBuildingFacadeBand")
		if stage_anchor != null and is_instance_valid(stage_anchor):
			var parent_stage := stage_anchor.get_parent()
			if parent_stage != null and is_instance_valid(parent_stage):
				stage = parent_stage
	if stage == null or not is_instance_valid(stage):
		return {
			"mainCityHubMobileViewport": true,
			"mainCityHubMobileOverlapFree": false,
			"mainCityHubMobileOverlapHitCount": 1,
			"mainCityHubMobileOverlapPairs": "MainCityEnteredSpaceStage|missing",
			"mainCityHubMobileOverlapCheckCount": 0,
		}
	var title := stage.get_node_or_null("MainCitySceneStageTitle")
	var return_button := stage.get_node_or_null("MainCitySceneReturnMapButton")
	var entry_dock := stage.get_node_or_null("MainCitySceneSpatialEntryDock")
	var model := stage.get_node_or_null("MainCitySceneFacilityModel")
	var building_band := stage.get_node_or_null("MainCityLivingBuildingFacadeBand")
	var economy_label := stage.get_node_or_null("MainCityLivingEconomyCueLabel")
	var checks := [
		{"left": "MainCitySceneStageTitle", "right": "MainCitySceneReturnMapButton", "a": title, "b": return_button},
		{"left": "MainCitySceneStageTitle", "right": "MainCitySceneFacilityModel", "a": title, "b": model},
		{"left": "MainCitySceneReturnMapButton", "right": "MainCitySceneFacilityModel", "a": return_button, "b": model},
		{"left": "MainCitySceneStageTitle", "right": "MainCityLivingBuildingFacadeBand", "a": title, "b": building_band},
		{"left": "MainCitySceneSpatialEntryDock", "right": "MainCitySceneFacilityModel", "a": entry_dock, "b": model},
		{"left": "MainCitySceneSpatialEntryDock", "right": "MainCityLivingBuildingFacadeBand", "a": entry_dock, "b": building_band},
		{"left": "MainCitySceneSpatialEntryDock", "right": "MainCityLivingEconomyCueLabel", "a": entry_dock, "b": economy_label},
	]
	var overlap_pairs: Array[String] = []
	for check_variant in checks:
		var check: Dictionary = check_variant as Dictionary
		var left_rect := _rect_from_control(check.get("a", null))
		var right_rect := _rect_from_control(check.get("b", null))
		if left_rect.size == Vector2.ZERO or right_rect.size == Vector2.ZERO:
			continue
		if left_rect.intersects(right_rect):
			overlap_pairs.append("%s|%s" % [str(check.get("left", "")), str(check.get("right", ""))])
	return {
		"mainCityHubMobileViewport": true,
		"mainCityHubMobileOverlapFree": overlap_pairs.is_empty(),
		"mainCityHubMobileOverlapHitCount": overlap_pairs.size(),
		"mainCityHubMobileOverlapPairs": "|".join(overlap_pairs),
		"mainCityHubMobileOverlapCheckCount": checks.size(),
	}


func _find_first_visible_node_by_name_prefix(root: Node, prefix: String) -> Node:
	if root == null or not is_instance_valid(root):
		return null
	if root.name.begins_with(prefix):
		if not (root is CanvasItem) or ((root as CanvasItem).visible and (root as CanvasItem).is_visible_in_tree()):
			return root
	for child in root.get_children():
		var found := _find_first_visible_node_by_name_prefix(child, prefix)
		if found != null:
			return found
	return null
