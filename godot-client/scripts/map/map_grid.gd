extends Node2D

const FactionVisualsScript = preload("res://scripts/map/faction_visuals.gd")
const NpcGuardPortraitRegistryScript = preload("res://scripts/map/npc_guard_portrait_registry.gd")
const TianxiaYutuMarkerVisualPolicyScript = preload("res://scripts/map/tianxia_yutu_marker_visual_policy.gd")
const TianxiaYutuLivingWorldHotspotPolicyScript = preload("res://scripts/map/tianxia_yutu_living_world_hotspot_policy.gd")
const TianxiaYutuProductContractScript = preload("res://scripts/app/helpers/tianxia_yutu_product_contract.gd")
const MAX_VISIBLE_TILE_DRAW_COUNT: int = 20000
const THEME_MAP_TMX_PATH: String = "res://assets/themes/slgclient/current/world/map.tmx"
const THEME_WORLD_ROOT: String = "res://assets/themes/slgclient/current/world"
const THEME_OVERLAY_MANIFEST_PATH: String = "res://assets/themes/slgclient/manifests/overlay_frames_manifest.json"
const THEME_WORLD_REGION_OVERLAY_MANIFEST_PATH: String = "res://assets/themes/slgclient/manifests/world_region_overlay_manifest_v1.json"
const THEME_WORLD_ROUTE_ASSETS_MANIFEST_PATH: String = "res://assets/themes/slgclient/manifests/world_route_assets_manifest_v1.json"
const THEME_WORLD_EVENT_MARKER_MANIFEST_PATH: String = "res://assets/themes/slgclient/manifests/world_event_marker_manifest_v1.json"
const THEME_WORLD_LABEL_CHROME_MANIFEST_PATH: String = "res://assets/themes/slgclient/manifests/world_label_chrome_manifest_v1.json"
const THEME_WORLD_RESOURCE_ASSET_MANIFEST_PATH: String = "res://assets/themes/slgclient/current/world/resources/world_resource_assets_manifest_v1.json"
const THEME_WORLD_CELL_ASSET_MANIFEST_PATH: String = "res://assets/themes/slgclient/current/world/world_cell_assets_manifest_v1.json"
const THEME_WORLD_CELL_FOOTPRINT_MANIFEST_PATH: String = "res://assets/themes/slgclient/current/world/world_cell_footprint_manifest_v1.json"
const THEME_MAIN_WORLD_MOUNTAIN_BOUNDARY_ASSET_MANIFEST_PATH: String = "res://assets/themes/slgclient/current/world/mountains/main_world_mountain_boundary_assets_manifest_v0_47.json"
const THEME_ZERO_LEVEL_SUBSTRATE_PATH: String = "res://assets/themes/slgclient/current/world/substrate/world_cell_zero_level_substrate_v1.png"
const WORLD_MAP_MANIFEST_RENDERER_WIRING_STATUS: String = "asset_ready_and_renderer_wired"
const WORLD_MAP_MANIFEST_FALLBACK_STATUS: String = "asset_manifest_fallback_active"
const WORLD_MAP_REGION_BORDER_WIDTH_MIN: float = 2.6
const WORLD_MAP_ROUTE_LINE_WIDTH_SCALE: float = 1.28
const WORLD_MAP_ROUTE_LINE_WIDTH_MIN: float = 3.2
const TIANXIA_YUTU_ROUTE_ENDPOINT_ANCHOR_OUTER_RADIUS: float = 3.8
const TIANXIA_YUTU_ROUTE_ENDPOINT_ANCHOR_INNER_RADIUS: float = 2.1
const TIANXIA_YUTU_ROUTE_TARGET_ANCHOR_RING_RADIUS: float = 5.6
const TIANXIA_YUTU_HOTSPOT_HALO_RING_RADIUS_PAD: float = 7.6
const TIANXIA_YUTU_HOTSPOT_HALO_RING_WIDTH: float = 2.2
const WORLD_MAP_SELECTION_HALO_RADIUS_SCALE: float = 1.12
const WORLD_MAP_SELECTION_HALO_MIN_RADIUS: float = 18.0
const WORLD_MAP_SELECTION_HALO_MIN_WIDTH: float = 4.8
const WORLD_MAP_LABEL_PLATE_FONT_SCALE_MIN: float = 0.92
const WORLD_MAP_LABEL_PLATE_PADDING_X: float = 8.0
const WORLD_MAP_LABEL_PLATE_PADDING_Y: float = 5.0
const WORLD_MAP_LABEL_PLATE_BORDER_WIDTH: float = 1.4
const MAIN_MAP_WORLD_ID: String = "unified_aoi_v0_6_formal_real_map_data_1km"
const MAIN_MAP_COORDINATE_SPACE: String = "real_map_data_1km.cell_1km"
const MAIN_MAP_WORLD_WIDTH_CELLS: int = 8070
const MAIN_MAP_WORLD_HEIGHT_CELLS: int = 7390
const MAIN_MAP_VISIBLE_WIDTH_CELLS: int = 512
const MAIN_MAP_VISIBLE_HEIGHT_CELLS: int = 320
const MAIN_MAP_VISIBLE_SIZE_CELLS_QUERY: String = "512x320"
const MAIN_MAP_PRELOAD_MARGIN_CELLS: int = 64
const MAIN_MAP_CHUNK_SIZE_CELLS: int = 64
const MAIN_MAP_INITIAL_FOCUS_CELL_X: int = 4387
const MAIN_MAP_INITIAL_FOCUS_CELL_Y: int = 2482
const MAIN_MAP_VIEW_MODE_GAMEPLAY: String = "gameplay"
const MAIN_MAP_VIEW_MODE_TIANXIA_YUTU: String = "tianxia_yutu"
const MAIN_MAP_INCLUDE_LAYERS_QUERY: String = "base_map,main_world_cells,derived_masks,maritime_passability,resource_overlay,city_gate_anchors,main_world_mountain_boundaries,main_world_chokepoints,cell_overrides,labels"
const TIANXIA_YUTU_INCLUDE_LAYERS_QUERY: String = "tianxia_yutu_overview,labels"
const TIANXIA_YUTU_PLAYER_SOURCE_LABELS := {
	"west_highland_tianzhu": "高原天竺",
}
const TIANXIA_YUTU_GATE_LABEL_OVERLAP_LABELS: Array = []
const TIANXIA_YUTU_GATE_LABEL_OVERLAP_OFFSET_ZHEN_NAN_GUAN: Vector2 = Vector2(-7.0, -7.0)
const TIANXIA_YUTU_GATE_LABEL_OVERLAP_OFFSET_GU_GUAN: Vector2 = Vector2(7.0, 7.0)
const MAIN_MAP_INCLUDE_LAYERS := [
	"base_map",
	"main_world_cells",
	"derived_masks",
	"maritime_passability",
	"resource_overlay",
	"city_gate_anchors",
	"main_world_mountain_boundaries",
	"main_world_chokepoints",
	"cell_overrides",
	"labels",
]
const HUMAN_HOME_LABEL: String = "我"
const AI_HOME_LABEL: String = "他"
const WORLD_CELL_FOOTPRINT_RESOURCE_1X1: String = "resource_1x1"
const WORLD_CELL_FOOTPRINT_PLAYER_CITY_3X3_INITIAL: String = "player_city_3x3_initial"
const WORLD_CELL_FOOTPRINT_AI_CITY_3X3_INITIAL: String = "ai_city_3x3_initial"
const WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L03_L04_3X3: String = "system_city_l03_l04_3x3"
const WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L05_L06_5X5: String = "system_city_l05_l06_5x5"
const WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L07_L08_7X7: String = "system_city_l07_l08_7x7"
const WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L09_9X9: String = "system_city_l09_9x9"
const WORLD_CELL_FOOTPRINT_PASS_1X1: String = "pass_1x1"
const WORLD_CELL_FOOTPRINT_FORT_1X1: String = "fort_1x1"
const WORLD_CELL_FOOTPRINT_DOCK_1X1: String = "dock_1x1"
const WORLD_CELL_FOOTPRINT_MOUNTAIN_BARRIER_1X1: String = "mountain_barrier_1x1"
const WORLD_CELL_FOOTPRINT_RIVER_CORRIDOR_1X1: String = "river_corridor_1x1"
const WORLD_CELL_RUNTIME_STRATEGY_CITY: String = "city"
const WORLD_CELL_RUNTIME_STRATEGY_NODE_DISPATCH: String = "node_dispatch"
const WORLD_CELL_PLACEMENT_ACTION_RESERVE_CELLS: String = "reserve_cells"
const WORLD_CELL_PLACEMENT_ACTION_BLOCK_RESOURCE_FILL: String = "block_resource_fill"
const WORLD_CELL_PLACEMENT_ACTION_BLOCK_FREE_CELL_BASE: String = "block_free_cell_base"
const WORLD_CELL_PLACEMENT_ACTION_BLOCK_RESOURCE_OVERLAY: String = "block_resource_overlay"
const WORLD_CELL_PLACEMENT_ACTION_BLOCK_MOVEMENT: String = "block_movement"
const WORLD_CELL_PLACEMENT_CONTEXT_EMPTY_RESOURCE_FILL: String = "empty_resource_fill"
const WORLD_CELL_PLACEMENT_CONTEXT_FREE_CELL_BASE: String = "free_cell_base"
const WORLD_CELL_PLACEMENT_CONTEXT_RESOURCE_OVERLAY: String = "resource_overlay"
const WORLD_CELL_PLACEMENT_CONTEXT_MOVEMENT: String = "movement"
const WORLD_CELL_PLACEMENT_CONTEXT_PREVIEW_NODE_PLACEMENT: String = "preview_node_placement"
const WORLD_CELL_PLACEMENT_POLICY_SOURCE_RESERVED_FOOTPRINT: String = "reserved_footprint"
const WORLD_CELL_PLACEMENT_POLICY_SOURCE_BACKEND_TILE: String = "backend_tile"
const WORLD_CELL_PLACEMENT_BLOCK_RULE_RESERVED_FOOTPRINT: String = "reserved_footprint"
const WORLD_CELL_PLACEMENT_BLOCK_RULE_PREVIEW_TILE: String = "preview_tile"
const WORLD_CELL_PLACEMENT_BLOCK_RULE_RESOURCE_OVERLAY: String = "resource_overlay"
const WORLD_CELL_PLACEMENT_BLOCK_RULE_BACKEND_TYPE: String = "backend_type"
const WORLD_CELL_PLACEMENT_BLOCK_RULE_BACKEND_TERRAIN: String = "backend_terrain"
const WORLD_CELL_PLACEMENT_BLOCK_RULE_POLICY_CONTEXT: String = "policy_context"
const WORLD_CELL_CAPTURE_MODE_PREVIEW: String = "preview"
const WORLD_CELL_CAPTURE_MODE_LIVE_PASS: String = "live_pass"
const WORLD_CELL_CAPTURE_MODE_LIVE_NODES: String = "live_nodes"
const WORLD_CELL_DUPLICATE_ANCHOR_POLICY: String = "last_write_wins"
const WORLD_CELL_RUNTIME_AUDIT_SAMPLE_LIMIT: int = 12
const WORLD_CELL_PLACEMENT_POLICY_ACTION_MAP := {
	WORLD_CELL_PLACEMENT_ACTION_RESERVE_CELLS: {
		"field": "reserve_cells",
		"default": true,
	},
	WORLD_CELL_PLACEMENT_ACTION_BLOCK_RESOURCE_FILL: {
		"field": "block_resource_fill",
		"default": true,
	},
	WORLD_CELL_PLACEMENT_ACTION_BLOCK_FREE_CELL_BASE: {
		"field": "block_free_cell_base",
		"default": true,
	},
	WORLD_CELL_PLACEMENT_ACTION_BLOCK_RESOURCE_OVERLAY: {
		"field": "block_resource_overlay",
		"fallback_fields": ["block_resource_generation"],
		"default": true,
	},
	WORLD_CELL_PLACEMENT_ACTION_BLOCK_MOVEMENT: {
		"field": "block_movement",
		"default": false,
	},
}
const WORLD_CELL_PLACEMENT_CONTEXT_RULE_MAP := {
	WORLD_CELL_PLACEMENT_CONTEXT_EMPTY_RESOURCE_FILL: {
		"policy_action": WORLD_CELL_PLACEMENT_ACTION_BLOCK_RESOURCE_FILL,
	},
	WORLD_CELL_PLACEMENT_CONTEXT_FREE_CELL_BASE: {
		"policy_action": WORLD_CELL_PLACEMENT_ACTION_BLOCK_FREE_CELL_BASE,
	},
	WORLD_CELL_PLACEMENT_CONTEXT_RESOURCE_OVERLAY: {
		"policy_action": WORLD_CELL_PLACEMENT_ACTION_BLOCK_RESOURCE_OVERLAY,
	},
	WORLD_CELL_PLACEMENT_CONTEXT_MOVEMENT: {
		"policy_action": WORLD_CELL_PLACEMENT_ACTION_BLOCK_MOVEMENT,
	},
	WORLD_CELL_PLACEMENT_CONTEXT_PREVIEW_NODE_PLACEMENT: {
		"block_rules": [
			{"kind": WORLD_CELL_PLACEMENT_BLOCK_RULE_RESERVED_FOOTPRINT},
			{"kind": WORLD_CELL_PLACEMENT_BLOCK_RULE_PREVIEW_TILE},
			{"kind": WORLD_CELL_PLACEMENT_BLOCK_RULE_RESOURCE_OVERLAY},
			{"kind": WORLD_CELL_PLACEMENT_BLOCK_RULE_BACKEND_TYPE, "values": ["resource"]},
			{
				"kind": WORLD_CELL_PLACEMENT_BLOCK_RULE_BACKEND_TERRAIN,
				"values": ["mountain", "riverland"],
				"allow_by_node_type": {
					"pass": ["mountain"],
					"dock": ["riverland"],
				},
			},
			{"kind": WORLD_CELL_PLACEMENT_BLOCK_RULE_POLICY_CONTEXT, "context": WORLD_CELL_PLACEMENT_CONTEXT_EMPTY_RESOURCE_FILL},
		],
	},
}
const WORLD_CELL_PLACEMENT_POLICY_SOURCE_ORDER := [
	WORLD_CELL_PLACEMENT_POLICY_SOURCE_RESERVED_FOOTPRINT,
	WORLD_CELL_PLACEMENT_POLICY_SOURCE_BACKEND_TILE,
]
const WORLD_CELL_LIVE_STRATEGIC_NODE_TYPES := ["pass", "fort", "dock"]
const WORLD_CELL_NODE_PREVIEW_TYPES := ["pass", "fort", "dock"]
const WORLD_CELL_NODE_PREVIEW_PLACEHOLDER_TYPES := ["mountain_barrier", "river_corridor"]
const WORLD_CELL_DIRECT_SELECTION_FRAME_TYPES := ["resource", "city", "player_city", "ai_city", "system_city"]
const WORLD_CELL_CITY_RUNTIME_TYPES := ["city", "player_city", "ai_city", "system_city"]
const WORLD_CELL_RUNTIME_STRATEGY_ORDER := [
	WORLD_CELL_RUNTIME_STRATEGY_CITY,
	WORLD_CELL_RUNTIME_STRATEGY_NODE_DISPATCH,
]
const WORLD_CELL_RUNTIME_STRATEGY_HANDLER_KEYS := [
	"footprint_resolver",
	"composite_resolver",
	"payload_stage_resolver",
]
const WORLD_CELL_RUNTIME_STRATEGY_RULES := {
	WORLD_CELL_RUNTIME_STRATEGY_CITY: {
		"tile_types": WORLD_CELL_CITY_RUNTIME_TYPES,
		"priority": 10,
		"footprint_resolver": "_resolve_world_cell_city_strategy_footprint_id",
		"composite_resolver": "_resolve_world_cell_city_strategy_composite_id",
		"payload_stage_resolver": "_resolve_world_cell_city_strategy_payload_stage",
	},
	WORLD_CELL_RUNTIME_STRATEGY_NODE_DISPATCH: {
		"priority": 30,
		"fallback_priority": 90,
	},
}
const WORLD_CELL_NODE_DISPATCH_RULES := {
	"pass": {
		"backend_enabled": true,
		"footprint_id": WORLD_CELL_FOOTPRINT_PASS_1X1,
		"default_terrain": "passland",
		"default_composite_id": "world_node_pass_sw_v1",
		"orientation_composites": {
			"se": "world_node_pass_se_v1",
			"southeast": "world_node_pass_se_v1",
			"south_east": "world_node_pass_se_v1",
			"right": "world_node_pass_se_v1",
			"sw": "world_node_pass_sw_v1",
			"southwest": "world_node_pass_sw_v1",
			"south_west": "world_node_pass_sw_v1",
			"left": "world_node_pass_sw_v1",
		},
	},
	"fort": {
		"backend_enabled": true,
		"footprint_id": WORLD_CELL_FOOTPRINT_FORT_1X1,
		"default_terrain": "fortland",
		"default_composite_id": "world_node_fort_v1",
	},
	"dock": {
		"backend_enabled": true,
		"footprint_id": WORLD_CELL_FOOTPRINT_DOCK_1X1,
		"default_terrain": "riverland",
		"default_composite_id": "world_node_dock_v1",
	},
}
const WORLD_CELL_NODE_PREVIEW_SAMPLE_RULES := {
	"pass": {
		"preview_spec_samples": [
			{
				"id": "preview_pass_sw",
				"label": "Pass SW composite",
				"preferred_offset": [-1, 4],
				"compositeId": "world_node_pass_sw_v1",
				"stateTag": "node_composite",
				"focus": "hover",
			},
			{
				"id": "preview_pass_se",
				"label": "Pass SE composite",
				"preferred_offset": [1, 3],
				"compositeId": "world_node_pass_se_v1",
				"stateTag": "node_composite",
			},
		],
		"preview_formal_samples": [
			{
				"id": "preview_pass_formal",
				"label": "Pass formal",
				"preferred_offset": [1, 2],
				"compositeId": "world_node_pass_sw_v1",
				"district": "preview_formal",
				"stateTag": "formal_node",
			},
		],
	},
	"fort": {
		"preview_spec_samples": [
			{
				"id": "preview_fort",
				"label": "Fort composite",
				"preferred_offset": [4, 5],
				"stateTag": "node_composite",
				"focus": "selected",
			},
		],
		"preview_formal_samples": [
			{
				"id": "preview_fort_formal",
				"label": "Fort formal",
				"preferred_offset": [5, 3],
				"district": "preview_formal",
				"stateTag": "formal_node",
			},
		],
	},
	"dock": {
		"preview_spec_samples": [
			{
				"id": "preview_dock",
				"label": "Dock composite",
				"preferred_offset": [8, 6],
				"stateTag": "node_composite",
			},
		],
		"preview_formal_samples": [
			{
				"id": "preview_dock_formal",
				"label": "Dock formal",
				"preferred_offset": [9, 4],
				"district": "preview_formal",
				"stateTag": "formal_node",
			},
		],
	},
	"mountain_barrier": {
		"footprint_id": WORLD_CELL_FOOTPRINT_MOUNTAIN_BARRIER_1X1,
		"default_terrain": "mountain",
		"preview_spec_samples": [
			{
				"id": "preview_mountain_barrier_a",
				"preferred_offset": [0, 8],
				"placeholderRole": "mountain_barrier",
			},
			{
				"id": "preview_mountain_barrier_b",
				"preferred_offset": [1, 7],
				"placeholderRole": "mountain_barrier",
			},
		],
	},
	"river_corridor": {
		"footprint_id": WORLD_CELL_FOOTPRINT_RIVER_CORRIDOR_1X1,
		"default_terrain": "riverland",
		"preview_spec_samples": [
			{
				"id": "preview_river_corridor_a",
				"preferred_offset": [4, 9],
				"placeholderRole": "river_corridor",
			},
			{
				"id": "preview_river_corridor_b",
				"preferred_offset": [5, 9],
				"placeholderRole": "river_corridor",
			},
			{
				"id": "preview_river_corridor_c",
				"preferred_offset": [6, 9],
				"placeholderRole": "river_corridor",
			},
		],
	},
}
const WORLD_CELL_CITY_STRATEGY_RULES := [
	{
		"id": "player_city_legacy_landmark",
		"any_of": [
			{"tile_ids": ["tile_08"]},
			{"landmark_ids": ["qingshi"]},
		],
		"footprint_id": WORLD_CELL_FOOTPRINT_PLAYER_CITY_3X3_INITIAL,
		"composite_fallback": "world_node_city_v1",
	},
	{
		"id": "ai_city_legacy_landmark",
		"any_of": [
			{"tile_ids": ["tile_10"]},
			{"landmark_ids": ["chilei"]},
		],
		"footprint_id": WORLD_CELL_FOOTPRINT_AI_CITY_3X3_INITIAL,
		"composite_fallback": "world_node_capital_v1",
	},
	{
		"id": "owned_small_city",
		"owner_required": true,
		"owner_excludes": ["", "neutral"],
		"max_group_size": 9,
		"footprint_id": WORLD_CELL_FOOTPRINT_AI_CITY_3X3_INITIAL,
		"composite_fallback": "world_node_capital_v1",
	},
	{
		"id": "large_system_city",
		"any_of": [
			{"min_group_size": 25},
			{"min_city_level": 7},
		],
		"composite_fallback": "world_node_capital_v1",
	},
	{
		"id": "system_city_default",
		"composite_fallback": "world_node_city_v1",
	},
]
const WORLD_RESOURCE_DEFAULT_EFFECTIVE_FOOTPRINT := Vector2(320.0, 160.0)
const WORLD_RESOURCE_DEFAULT_FIT_FOOTPRINT := Vector2(320.0, 160.0)
const WORLD_RESOURCE_DEFAULT_SOURCE_ANCHOR := Vector2(192.0, 310.0)
const WORLD_CELL_DEFAULT_FIT_FOOTPRINT := Vector2(240.0, 120.0)
const WORLD_CELL_DEFAULT_SOURCE_ANCHOR := Vector2(192.0, 300.0)
const MOUNTAIN_MASK_N: int = 1
const MOUNTAIN_MASK_E: int = 2
const MOUNTAIN_MASK_S: int = 4
const MOUNTAIN_MASK_W: int = 8
const MOUNTAIN_MASK_NE: int = 16
const MOUNTAIN_MASK_SE: int = 32
const MOUNTAIN_MASK_SW: int = 64
const MOUNTAIN_MASK_NW: int = 128
const EDGE_VARIANTS_ISOLATED := ["11", "12"]
const EDGE_VARIANTS_SINGLE := ["21", "22"]
const EDGE_VARIANTS_STRAIGHT := ["31", "32"]
const EDGE_VARIANTS_CORNER := ["41", "42"]
const EDGE_VARIANTS_TEE := ["51", "52", "53"]
const EDGE_VARIANTS_FULL := ["61", "62", "63"]

signal view_transform_changed(view_state: Dictionary)
signal hud_snapshot_changed(snapshot: Dictionary)
signal player_home_city_node_clicked(context: Dictionary)
signal main_map_cell_selected(context: Dictionary)

@export var tile_size: float = 12.0
@export var tile_gap: float = 1.0
@export var min_zoom: float = 0.25
@export var max_zoom: float = 2.10
@export var zoom_step: float = 1.12
@export_range(0.20, 1.20, 0.01) var cell_layer_min_zoom: float = 0.42
@export_range(4, 24, 1) var camera_viewport_max_visible_cells: int = 14
@export var free_cell_base_enabled: bool = true
@export_range(0.00, 0.55, 0.01) var free_cell_base_alpha: float = 0.34
@export var zero_level_substrate_enabled: bool = true
@export_range(0.00, 1.00, 0.01) var zero_level_substrate_alpha: float = 0.96
@export var empty_cell_resource_fill_enabled: bool = false
@export_range(0.20, 1.00, 0.01) var empty_cell_resource_fill_alpha: float = 0.82
@export var empty_cell_resource_fill_base_frames_enabled: bool = true
@export_range(1, 9, 1) var empty_cell_resource_fill_max_level: int = 9
@export var main_world_mountain_boundary_assets_enabled: bool = true
@export_range(0.20, 1.00, 0.01) var main_world_mountain_boundary_asset_alpha: float = 1.0
@export_range(0.40, 1.40, 0.01) var main_world_mountain_boundary_asset_scale: float = 1.0
@export_range(0.80, 1.40, 0.01) var city_prefab_3x3_fit_scale: float = 1.26
@export_range(0.80, 1.40, 0.01) var city_prefab_5x5_fit_scale: float = 1.12
@export_range(0.80, 1.40, 0.01) var city_prefab_7x7_fit_scale: float = 1.10
@export var hover_label_path: NodePath = NodePath("../HoverLayer/HoverInfo")
@export var perf_label_path: NodePath = NodePath("../HoverLayer/PerfInfo")
@export var export_button_path: NodePath = NodePath("../HoverLayer/ExportPerfButton")
@export var export_status_label_path: NodePath = NodePath("../HoverLayer/ExportStatus")
@export var perf_window_seconds: float = 5.0
@export var perf_hud_update_interval: float = 0.25
@export var export_hotkey: Key = KEY_F8
@export var mountain_overlay_enabled: bool = true
@export var mountain_bitmask_enabled: bool = true
@export var mountain_rotation_enabled: bool = true
@export_enum("custom", "smooth", "sharp", "low_noise") var mountain_visual_profile: String = "custom"
@export_range(32.0, 160.0, 1.0) var mountain_overlay_base_height: float = 92.0
@export_range(0.10, 0.95, 0.01) var mountain_overlay_alpha_min: float = 0.24
@export_range(0.10, 0.95, 0.01) var mountain_overlay_alpha_max: float = 0.56
@export var mountain_edge_denoise_enabled: bool = true
@export_range(0.00, 1.00, 0.01) var mountain_edge_noise_alpha_threshold: float = 0.20
@export var mountain_ridge_bias_enabled: bool = true
@export_range(0.00, 0.40, 0.01) var mountain_ridge_bias_strength: float = 0.10
@export var terrain_edge_overlay_enabled: bool = true
@export var terrain_edge_bitmask_enabled: bool = true
@export var terrain_edge_rotation_enabled: bool = true
@export var river_edge_enabled: bool = true
@export var terrain_edge_enabled: bool = true
@export_range(24.0, 140.0, 1.0) var terrain_edge_overlay_base_height: float = 86.0
@export_range(0.05, 0.90, 0.01) var terrain_edge_alpha_min: float = 0.20
@export_range(0.05, 0.95, 0.01) var terrain_edge_alpha_max: float = 0.50
@export var resource_overlay_enabled: bool = true
@export var resource_overlay_text_enabled: bool = false
@export_range(20.0, 120.0, 1.0) var resource_overlay_base_height: float = 62.0
@export_range(0.20, 1.00, 0.01) var resource_overlay_alpha: float = 1.0
@export_range(0.20, 2.00, 0.01) var resource_overlay_full_zoom: float = 0.72
@export_range(0.10, 1.60, 0.01) var resource_overlay_mid_zoom: float = 0.42
@export_range(0.05, 1.00, 0.01) var resource_overlay_far_alpha: float = 0.54
@export_range(0.10, 1.00, 0.01) var resource_overlay_mid_alpha: float = 0.78
@export var resource_cell_debug_overlay_enabled: bool = false
@export_range(0.10, 1.00, 0.01) var resource_cell_debug_overlay_alpha: float = 0.86
@export var resource_cell_debug_non_resource_enabled: bool = false
@export_range(0.05, 0.70, 0.01) var resource_cell_debug_non_resource_alpha: float = 0.42
@export var main_world_cell_layer_enabled: bool = true
@export_range(0.02, 0.45, 0.01) var main_world_cell_layer_alpha: float = 0.16
@export var world_cell_node_visuals_enabled: bool = true
@export_range(0.20, 1.00, 0.01) var world_cell_node_visual_alpha: float = 0.96
@export var world_cell_preview_nodes_enabled: bool = true
@export var world_cell_preview_placeholders_enabled: bool = true
@export var world_cell_interaction_grid_debug_enabled: bool = false
@export var world_cell_runtime_conflict_warning_enabled: bool = false
@export var world_cell_state_overlay_enabled: bool = true
@export_range(0.20, 1.80, 0.01) var home_city_overlay_scale: float = 1.0
@export var home_city_badge_enabled: bool = true

var _tiles: Array = []
var _tile_by_coord: Dictionary = {}
var _backend_tile_by_tmx_key: Dictionary = {}
var _tmx_cell_by_tile_id: Dictionary = {}
var _tmx_cell_by_coord_key: Dictionary = {}
var _mountain_coord_set: Dictionary = {}
var _mountain_overlay_entries: Array = []
var _terrain_edge_overlay_entries: Array = []
var _resource_overlay_entries: Array = []
var _resource_overlay_by_tmx_key: Dictionary = {}
var _resource_debug_png_drawn_tmx_keys: Dictionary = {}
var _resource_debug_non_resource_entries: Array = []
# Home overlay read-model caches, not generic world-cell builder caches.
var _city_overlay_by_tile_id: Dictionary = {}
var _world_city_overlay_by_tile_id: Dictionary = {}
var _world_cell_node_base_by_tmx_key: Dictionary = {}
var _world_cell_node_anchor_by_tmx_key: Dictionary = {}
var _world_cell_footprint_rule_by_id: Dictionary = {}
var _world_cell_reserved_footprint_tmx_keys: Dictionary = {}
var _world_cell_reserved_anchor_by_tmx_key: Dictionary = {}
var _world_cell_reserved_center_by_tmx_key: Dictionary = {}
var _world_cell_preview_tile_by_tmx_key: Dictionary = {}
var _world_cell_preview_focus_tiles: Dictionary = {}
var _world_cell_preview_sample_by_id: Dictionary = {}
var _world_cell_preview_sample_order: Array = []
var _world_cell_preview_placement_audit_by_sample_id: Dictionary = {}
var _world_cell_live_capture_sample_by_id: Dictionary = {}
var _world_cell_live_capture_sample_order: Array = []
var _world_cell_runtime_builder_stats: Dictionary = {}
var _world_cell_runtime_strategy_handler_audit: Dictionary = {}
var _home_city_overlay_entries: Array = []
var _map_width: int = 0
var _map_height: int = 0
var _backend_x_min: int = 0
var _backend_x_max: int = 0
var _backend_y_min: int = 0
var _backend_y_max: int = 0
var _chunk_scope: String = "unknown"
var _chunk_id: String = ""
var _loaded_province_ids: Array = []
var _camera_viewport_metadata: Dictionary = {}
var _main_map_layer_order: Array = []
var _main_map_chunk_layer: Dictionary = {}
var _main_map_base_map_layer: Dictionary = {}
var _main_map_substrate_chunk_texture_by_id: Dictionary = {}
var _main_map_cell_layer: Dictionary = {}
var _main_world_cell_chunk_range_by_id: Dictionary = {}
var _main_map_derived_mask_layer: Dictionary = {}
var _main_map_maritime_passability_layer: Dictionary = {}
var _main_map_resource_overlay_layer: Dictionary = {}
var _main_map_city_gate_anchor_layer: Dictionary = {}
var _main_map_mountain_boundary_layer: Dictionary = {}
var _main_map_chokepoint_layer: Dictionary = {}
var _click_priority_formal_sample_layer: Dictionary = {}
var _click_priority_formal_sample_by_tmx_key: Dictionary = {}
var _main_world_chokepoint_anchor_cell_keys: Dictionary = {}
var _main_world_mountain_boundary_asset_manifest: Dictionary = {}
var _main_world_mountain_boundary_piece_meta_by_id: Dictionary = {}
var _main_world_mountain_boundary_texture_by_piece_id: Dictionary = {}
var _main_world_mountain_boundary_runtime_copy_gate: String = ""
var _main_map_cell_override_layer: Dictionary = {}
var _main_map_labels_layer: Dictionary = {}
var _tianxia_yutu_overview_layer: Dictionary = {}
var _main_world_frontline_markers: Array = []
var _main_map_loaded_chunk_ids: Array = []
var _main_map_unload_candidate_chunk_ids: Array = []
var _main_map_cell_override_by_cell_id: Dictionary = {}
var _main_map_cell_override_by_tmx_key: Dictionary = {}
var _main_map_initial_focus_applied: bool = false
var _main_map_view_mode: String = MAIN_MAP_VIEW_MODE_GAMEPLAY
var _tianxia_yutu_overview_texture: Texture2D = null
var _tianxia_yutu_overview_texture_path: String = ""
var _tianxia_yutu_ai_activity_hotspot_texture: Texture2D = null
var _tianxia_yutu_ai_activity_hotspot_label_plate_texture: Texture2D = null
var _tianxia_yutu_ai_activity_hotspot_cluster_badge_texture: Texture2D = null
var _tianxia_yutu_ai_activity_route_arrow_texture: Texture2D = null
var _tianxia_yutu_ai_activity_route_queued_arrow_texture: Texture2D = null
var _tianxia_yutu_admin_focus_mask_texture_cache: Dictionary = {}
var _tianxia_yutu_pan_offset: Vector2 = Vector2.ZERO
var _tianxia_yutu_zoom: float = 1.0
var _tianxia_yutu_last_draw_rect: Rect2 = Rect2()
var _tianxia_yutu_focus_marker_cell: Vector2i = Vector2i(-1, -1)
var _tianxia_yutu_focus_marker_label: String = ""
var _last_zoom_interaction_kind: String = ""
var _last_wheel_pivot_drift_px: float = 0.0
var _last_pinch_pivot_drift_px: float = 0.0
var _last_pivot_cell_drift: float = 0.0
var _last_wheel_pivot_metric_recorded: bool = false
var _last_pinch_pivot_metric_recorded: bool = false
var _last_tianxia_yutu_wheel_pivot_metric_recorded: bool = false
var _last_tianxia_yutu_pinch_pivot_metric_recorded: bool = false
var _last_tianxia_yutu_wheel_pivot_drift_px: float = 0.0
var _last_tianxia_yutu_pinch_pivot_drift_px: float = 0.0
var _last_tianxia_yutu_pivot_cell_drift: float = 0.0
var _last_tianxia_yutu_state_fill_ratio_2k: float = 0.0
var _last_tianxia_yutu_hit_radius_px: float = 0.0
var _last_tianxia_yutu_hit_metric_recorded: bool = false
var _last_tianxia_yutu_overview_draw_count: int = 0
var _last_tianxia_yutu_state_boundary_draw_count: int = 0
var _last_tianxia_yutu_frontline_draw_count: int = 0
var _last_tianxia_yutu_frontline_arrow_draw_count: int = 0
var _last_tianxia_yutu_frontline_marker_label: String = ""
var _last_tianxia_yutu_ai_activity_hotspot_count: int = 0
var _last_tianxia_yutu_ai_activity_hotspot_draw_count: int = 0
var _last_tianxia_yutu_ai_activity_hotspot_label_draw_count: int = 0
var _last_tianxia_yutu_ai_activity_hotspot_max_cluster_count: int = 0
var _last_tianxia_yutu_ai_activity_hotspot_first_label: String = ""
var _last_tianxia_yutu_ai_activity_first_trace_id: String = ""
var _last_tianxia_yutu_ai_activity_uses_execution_trace: bool = false
var _last_tianxia_yutu_ai_activity_fallback_used: bool = false
var _last_tianxia_yutu_ai_activity_hotspot_visual_asset_loaded: bool = false
var _last_tianxia_yutu_ai_activity_hotspot_visual_asset_draw_count: int = 0
var _last_tianxia_yutu_ai_activity_hotspot_halo_draw_count: int = 0
var _last_tianxia_yutu_ai_activity_hotspot_info_asset_loaded: bool = false
var _last_tianxia_yutu_ai_activity_hotspot_label_plate_asset_draw_count: int = 0
var _last_tianxia_yutu_ai_activity_hotspot_cluster_badge_asset_draw_count: int = 0
var _last_tianxia_yutu_ai_activity_route_intent_asset_loaded: bool = false
var _last_tianxia_yutu_ai_activity_route_intent_source_target_count: int = 0
var _last_tianxia_yutu_ai_activity_route_intent_line_draw_count: int = 0
var _last_tianxia_yutu_ai_activity_route_intent_arrow_asset_draw_count: int = 0
var _last_tianxia_yutu_ai_activity_route_intent_endpoint_anchor_draw_count: int = 0
var _last_tianxia_yutu_ai_activity_route_heading_applied_count: int = 0
var _last_tianxia_yutu_ai_activity_route_first_heading_radians: float = 0.0
var _last_tianxia_yutu_ai_activity_route_state_variant_asset_loaded: bool = false
var _last_tianxia_yutu_ai_activity_route_active_variant_draw_count: int = 0
var _last_tianxia_yutu_ai_activity_route_queued_variant_draw_count: int = 0
var _last_tianxia_yutu_ai_activity_route_first_state_variant: String = ""
var _last_tianxia_yutu_state_label_draw_count: int = 0
var _last_tianxia_yutu_region_label_draw_count: int = 0
var _last_tianxia_yutu_city_gate_marker_draw_count: int = 0
var _last_tianxia_yutu_label_collision_skip_count: int = 0
var _last_tianxia_yutu_label_panel_avoidance_skip_count: int = 0
var _last_tianxia_yutu_duplicate_label_suppression_count: int = 0
var _last_tianxia_yutu_label_priority_draw_counts: Dictionary = {}
var _last_tianxia_yutu_label_priority_skip_counts: Dictionary = {}
var _last_tianxia_yutu_label_priority_draw_order: Array = []
var _last_tianxia_yutu_marker_scope_draw_counts: Dictionary = {}
var _last_tianxia_yutu_marker_label_draw_counts: Dictionary = {}
var _last_tianxia_yutu_city_label_budget_skip_count: int = 0
var _last_tianxia_yutu_gate_label_budget_skip_count: int = 0
var _last_tianxia_yutu_gate_hover_label_force_count: int = 0
var _last_tianxia_yutu_gate_detail_callout_draw_count: int = 0
var _last_tianxia_yutu_hover_gate_summary: Dictionary = {}
var _last_tianxia_yutu_selected_gate_summary: Dictionary = {}
var _last_tianxia_yutu_gate_boundary_label_offset_count: int = 0
var _last_tianxia_yutu_focus_label_dense_suppression_count: int = 0
var _last_tianxia_yutu_context_gate_focus_draw_count: int = 0
var _last_tianxia_yutu_out_of_region_gate_dim_draw_count: int = 0
var _last_tianxia_yutu_compact_target_marker_focus_draw_count: int = 0
var _last_tianxia_yutu_compact_target_marker_dim_draw_count: int = 0
var _last_tianxia_yutu_compact_target_label_suppression_count: int = 0
var _last_tianxia_yutu_compact_target_candidate_focus_count: int = 0
var _last_tianxia_yutu_compact_admin_label_suppression_count: int = 0
var _last_tianxia_yutu_normal_dense_admin_label_suppression_count: int = 0
var _last_tianxia_yutu_low_emphasis_marker_draw_count: int = 0
var _last_tianxia_yutu_out_of_region_gate_micro_draw_count: int = 0
var _last_tianxia_yutu_ordinary_city_micro_draw_count: int = 0
var _last_tianxia_yutu_marker_visual_weight_estimate: float = 0.0
var _tianxia_yutu_label_occupied_rects: Array = []
var _tianxia_yutu_drawn_label_texts: Dictionary = {}
var _last_tianxia_yutu_state_focus_shape_draw_count: int = 0
var _last_tianxia_yutu_region_focus_boundary_draw_count: int = 0
var _last_tianxia_yutu_admin_focus_asset_mask_draw_count: int = 0
var _last_tianxia_yutu_admin_focus_mask_missing_count: int = 0
var _last_tianxia_yutu_admin_focus_mask_load_failed_count: int = 0
var _last_tianxia_yutu_admin_focus_runtime_hull_blocked_count: int = 0
var _last_tianxia_yutu_density_level: String = "state"
var _tianxia_yutu_drilldown_context: Dictionary = {}
var _last_main_world_frontline_draw_count: int = 0
var _last_main_world_frontline_arrow_draw_count: int = 0
var _last_main_world_frontline_marker_label: String = ""
var _last_main_world_mountain_boundary_sprite_draw_count: int = 0
var _last_main_world_mountain_boundary_sprite_failed_count: int = 0
var _last_main_world_mountain_boundary_sprite_on_screen_count: int = 0
var _last_main_world_chokepoint_sprite_draw_count: int = 0
var _last_main_world_chokepoint_sprite_failed_count: int = 0
var _last_main_world_chokepoint_sprite_on_screen_count: int = 0
var _last_main_world_chokepoint_suppressed_city_gate_anchor_count: int = 0
var _last_main_map_owner_override_draw_count: int = 0
var _last_main_map_owner_override_relation_counts: Dictionary = {}
var _last_main_map_immunity_border_draw_count: int = 0
var _tianxia_yutu_overlay_visibility: Dictionary = {}
var _last_view_transform_restore_count: int = 0

var _draw_origin: Vector2 = Vector2(880.0, 60.0)
var _pan_offset: Vector2 = Vector2.ZERO
var _zoom: float = 1.68
var _is_dragging: bool = false
var _drag_last_mouse: Vector2 = Vector2.ZERO
var _drag_start_mouse: Vector2 = Vector2.ZERO
var _is_touch_dragging: bool = false
var _touch_drag_index: int = -1
var _touch_points: Dictionary = {}
var _pinch_last_distance: float = 0.0

var _hover_tile: Dictionary = {}
var _hover_tile_key: String = ""
var _selected_tile: Dictionary = {}
var _selected_tile_key: String = ""
var _selected_main_map_cell_action_context: Dictionary = {}
var _hover_label: Label
var _perf_label: Label
var _export_button: Button
var _export_status_label: Label

var _last_visible_draw_count: int = 0
var _last_visible_candidate_count: int = 0
var _last_sampling_step: int = 1
var _last_resource_debug_visible_count: int = 0
var _last_resource_debug_png_drawn_count: int = 0
var _last_resource_debug_missing_png_count: int = 0
var _last_resource_debug_non_resource_visible_count: int = 0
var _last_zero_level_substrate_draw_count: int = 0
var _last_world_cell_anchor_visible_count: int = 0
var _last_world_cell_node_draw_count: int = 0
var _last_world_cell_node_draw_failed_count: int = 0
var _perf_elapsed: float = 0.0
var _frame_timestamps: Array = []
var _frame_deltas: Array = []
var _frame_delta_sum: float = 0.0
var _avg_fps_5s: float = 0.0
var _avg_frame_ms_5s: float = 0.0
var _auto_export_requested: bool = false
var _auto_export_done: bool = false
var _runtime_preview_capture_requested: bool = false
var _runtime_preview_capture_done: bool = false

var _tmx_loaded: bool = false
var _tmx_map_width: int = 0
var _tmx_map_height: int = 0
var _tmx_tile_width: float = 200.0
var _tmx_tile_height: float = 100.0
var _tmx_layers: Array = []
var _tmx_tilesets: Array = []
var _overlay_manifest: Dictionary = {}
var _world_region_overlay_manifest: Dictionary = {}
var _world_route_assets_manifest: Dictionary = {}
var _world_event_marker_manifest: Dictionary = {}
var _world_label_chrome_manifest: Dictionary = {}
var _world_map_manifest_visible_layer_tokens: Dictionary = {
	"region_overlay": ["tianxia_yutu_overview", "main_world_cells", "state_boundary_overlay"],
	"route_overlay": ["tianxia_yutu_overview", "main_world_cells", "route_intent_overlay"],
	"event_marker_overlay": ["tianxia_yutu_overview", "main_world_cells", "living_activity_marker_overlay", "selection_halo_overlay"],
	"label_chrome_overlay": ["labels", "city_gate_anchors", "strategic_overlay_layer"],
}
var _world_map_manifest_renderer_wiring_status: String = WORLD_MAP_MANIFEST_RENDERER_WIRING_STATUS
var _world_map_manifest_fallback_used: bool = false
var _world_map_manifest_fallback_reason_by_manifest: Dictionary = {}
var _overlay_texture_by_frame: Dictionary = {}
var _zero_level_substrate_texture: Texture2D = null
var _world_resource_frame_meta_by_frame: Dictionary = {}
var _world_cell_frame_meta_by_frame: Dictionary = {}
var _world_cell_composite_by_id: Dictionary = {}
var _applied_mountain_visual_profile: String = ""


func _ready() -> void:
	set_process(true)
	set_process_unhandled_input(true)
	_hover_label = get_node_or_null(hover_label_path) as Label
	_perf_label = get_node_or_null(perf_label_path) as Label
	_export_button = get_node_or_null(export_button_path) as Button
	_export_status_label = get_node_or_null(export_status_label_path) as Label
	_auto_export_requested = _is_truthy_env("SLG_EXPORT_BASELINE_ON_START")
	_runtime_preview_capture_requested = _is_truthy_env("SLG_EXPORT_WORLD_CELL_PREVIEW_CAPTURE")
	var env_zoom_applied: bool = _apply_initial_zoom_from_env()
	if not env_zoom_applied and _resolve_world_cell_preview_variant() == "stages" and _zoom > 0.32:
		_zoom = 0.32

	var export_callback := Callable(self, "_on_export_button_pressed")
	if _export_button != null and not _export_button.pressed.is_connected(export_callback):
		_export_button.pressed.connect(export_callback)

	_tmx_loaded = _load_theme_tmx()
	_zoom = clampf(_zoom, _effective_min_zoom(), max_zoom)
	_load_overlay_manifest()
	_load_world_region_overlay_manifest()
	_load_world_route_assets_manifest()
	_load_world_event_marker_manifest()
	_load_world_label_chrome_manifest()
	_load_zero_level_substrate_texture()
	_load_world_resource_asset_manifest()
	_load_world_cell_asset_manifest()
	_load_world_cell_footprint_manifest()
	_load_main_world_mountain_boundary_asset_manifest()
	_load_tianxia_yutu_ai_activity_hotspot_texture()
	_load_tianxia_yutu_ai_activity_hotspot_info_textures()
	_load_tianxia_yutu_ai_activity_route_intent_textures()
	_sync_mountain_visual_profile(true)
	_validate_world_cell_runtime_strategy_handlers()
	if WorldStore.has_signal("map_layout_updated"):
		WorldStore.map_layout_updated.connect(_on_map_layout_updated)
	if WorldStore.has_signal("world_updated"):
		WorldStore.world_updated.connect(_on_world_updated)
	_apply_map_layout(WorldStore.map_layout)
	_apply_world(WorldStore.world)
	_update_hover_label()
	_update_perf_label()
	if _tmx_loaded:
		_update_export_status("SLG theme loaded | export via button/F8")
	else:
		_update_export_status("SLG theme load failed | check world assets")
	_emit_hud_snapshot_changed()
	_emit_view_transform_changed()


func _on_map_layout_updated(next_map_layout: Dictionary) -> void:
	_apply_map_layout(next_map_layout)


func _on_world_updated(next_world: Dictionary) -> void:
	_apply_world(next_world)


func _sync_mountain_visual_profile(force: bool = false) -> bool:
	var normalized_profile: String = mountain_visual_profile.strip_edges().to_lower()
	if normalized_profile == "":
		normalized_profile = "custom"
	if not force and normalized_profile == _applied_mountain_visual_profile:
		return false
	_applied_mountain_visual_profile = normalized_profile
	_apply_mountain_visual_profile(normalized_profile)
	return true


func _apply_mountain_visual_profile(profile: String) -> void:
	match profile:
		"smooth":
			mountain_edge_denoise_enabled = true
			mountain_edge_noise_alpha_threshold = 0.28
			mountain_ridge_bias_enabled = true
			mountain_ridge_bias_strength = 0.14
			mountain_overlay_base_height = 98.0
			mountain_overlay_alpha_min = 0.26
			mountain_overlay_alpha_max = 0.60
		"sharp":
			mountain_edge_denoise_enabled = true
			mountain_edge_noise_alpha_threshold = 0.12
			mountain_ridge_bias_enabled = true
			mountain_ridge_bias_strength = 0.22
			mountain_overlay_base_height = 94.0
			mountain_overlay_alpha_min = 0.22
			mountain_overlay_alpha_max = 0.66
		"low_noise":
			mountain_edge_denoise_enabled = true
			mountain_edge_noise_alpha_threshold = 0.34
			mountain_ridge_bias_enabled = false
			mountain_ridge_bias_strength = 0.0
			mountain_overlay_base_height = 90.0
			mountain_overlay_alpha_min = 0.22
			mountain_overlay_alpha_max = 0.50
		_:
			# custom profile leaves current params untouched for manual tuning.
			pass


func _process(delta: float) -> void:
	if _sync_mountain_visual_profile(false):
		if not _tiles.is_empty():
			_rebuild_backend_tile_index()
			_refresh_home_city_overlay_entries(WorldStore.world)
		queue_redraw()
	_record_frame_sample(delta)
	_refresh_perf_metrics()
	_perf_elapsed += delta
	if _perf_elapsed >= perf_hud_update_interval:
		_perf_elapsed = 0.0
		_update_perf_label()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey:
		var key_event: InputEventKey = event as InputEventKey
		if key_event.pressed and not key_event.echo and key_event.keycode == export_hotkey:
			_export_perf_baseline("hotkey")
		return

	if event is InputEventMouseButton:
		var mouse_button: InputEventMouseButton = event as InputEventMouseButton
		if _main_map_view_mode == MAIN_MAP_VIEW_MODE_TIANXIA_YUTU:
			if mouse_button.button_index == MOUSE_BUTTON_WHEEL_UP and mouse_button.pressed:
				_last_zoom_interaction_kind = "wheel"
				_apply_tianxia_yutu_zoom(1.16, mouse_button.position)
			elif mouse_button.button_index == MOUSE_BUTTON_WHEEL_DOWN and mouse_button.pressed:
				_last_zoom_interaction_kind = "wheel"
				_apply_tianxia_yutu_zoom(1.0 / 1.16, mouse_button.position)
			elif mouse_button.button_index == MOUSE_BUTTON_LEFT:
				if mouse_button.pressed:
					_is_dragging = true
					_drag_last_mouse = mouse_button.position
					_drag_start_mouse = mouse_button.position
				else:
					var click_like := _is_dragging and mouse_button.position.distance_to(_drag_start_mouse) <= 8.0
					_is_dragging = false
					if click_like:
						_select_tile_at(mouse_button.position)
			elif _is_pan_button(mouse_button.button_index):
				_is_dragging = mouse_button.pressed
				_drag_last_mouse = mouse_button.position
				_drag_start_mouse = mouse_button.position
			_update_hover(mouse_button.position)
			return
		if mouse_button.button_index == MOUSE_BUTTON_WHEEL_UP and mouse_button.pressed:
			_last_zoom_interaction_kind = "wheel"
			_apply_zoom(zoom_step, mouse_button.position)
		elif mouse_button.button_index == MOUSE_BUTTON_WHEEL_DOWN and mouse_button.pressed:
			_last_zoom_interaction_kind = "wheel"
			_apply_zoom(1.0 / zoom_step, mouse_button.position)
		elif mouse_button.button_index == MOUSE_BUTTON_LEFT and mouse_button.pressed:
			_select_tile_at(mouse_button.position)
		elif _is_pan_button(mouse_button.button_index):
			_is_dragging = mouse_button.pressed
			_drag_last_mouse = mouse_button.position

		_update_hover(mouse_button.position)
		return

	if event is InputEventMouseMotion:
		var motion: InputEventMouseMotion = event as InputEventMouseMotion
		if _is_dragging:
			if _main_map_view_mode == MAIN_MAP_VIEW_MODE_TIANXIA_YUTU:
				_tianxia_yutu_pan_offset += motion.position - _drag_last_mouse
			else:
				_pan_offset += motion.position - _drag_last_mouse
			_drag_last_mouse = motion.position
			queue_redraw()
			_emit_view_transform_changed()
		_update_hover(motion.position)
		return

	if event is InputEventScreenTouch:
		var touch: InputEventScreenTouch = event as InputEventScreenTouch
		if touch.pressed:
			_touch_points[touch.index] = touch.position
			if _touch_points.size() >= 2:
				_is_touch_dragging = false
				_touch_drag_index = -1
				_pinch_last_distance = _touch_pinch_distance()
			else:
				_is_touch_dragging = true
				_touch_drag_index = touch.index
				_drag_last_mouse = touch.position
				_pinch_last_distance = 0.0
		else:
			_touch_points.erase(touch.index)
			_pinch_last_distance = _touch_pinch_distance() if _touch_points.size() >= 2 else 0.0
			_reset_touch_drag_to_remaining_point()
		_update_hover(touch.position)
		return

	if event is InputEventScreenDrag:
		var drag: InputEventScreenDrag = event as InputEventScreenDrag
		_touch_points[drag.index] = drag.position
		if _touch_points.size() >= 2:
			var next_distance: float = _touch_pinch_distance()
			if _pinch_last_distance > 0.0 and next_distance > 0.0:
				_last_zoom_interaction_kind = "pinch"
				if _main_map_view_mode == MAIN_MAP_VIEW_MODE_TIANXIA_YUTU:
					_apply_tianxia_yutu_zoom(next_distance / _pinch_last_distance, _touch_pinch_center())
				else:
					_apply_zoom(next_distance / _pinch_last_distance, _touch_pinch_center())
			_pinch_last_distance = next_distance
			_update_hover(drag.position)
			return
		if _is_touch_dragging and drag.index == _touch_drag_index:
			if _main_map_view_mode == MAIN_MAP_VIEW_MODE_TIANXIA_YUTU:
				_tianxia_yutu_pan_offset += drag.relative
			else:
				_pan_offset += drag.relative
			_drag_last_mouse = drag.position
			queue_redraw()
			_emit_view_transform_changed()
		_update_hover(drag.position)


func _apply_map_layout(next_map_layout: Dictionary) -> void:
	var map_payload: Dictionary = next_map_layout.get("map", {}) as Dictionary
	var chunk_payload: Dictionary = next_map_layout.get("chunk", {}) as Dictionary

	var raw_tiles: Variant = map_payload.get("tiles", [])
	_tiles = raw_tiles if raw_tiles is Array else []
	_map_width = int(map_payload.get("width", 0))
	_map_height = int(map_payload.get("height", 0))
	var raw_frontline_markers: Variant = map_payload.get("allianceFrontlineMarkers", [])
	_main_world_frontline_markers = (raw_frontline_markers as Array).duplicate(true) if raw_frontline_markers is Array else []

	var raw_loaded_province_ids: Variant = chunk_payload.get("loadedProvinceIds", [])
	_loaded_province_ids = raw_loaded_province_ids if raw_loaded_province_ids is Array else []
	_chunk_scope = str(chunk_payload.get("scope", "unknown"))
	_chunk_id = str(chunk_payload.get("id", ""))
	var raw_camera_viewport: Variant = chunk_payload.get("cameraViewport", {})
	_camera_viewport_metadata = (raw_camera_viewport as Dictionary).duplicate(true) if raw_camera_viewport is Dictionary else {}

	_rebuild_backend_tile_index()
	_apply_main_map_layered_response(next_map_layout)
	_ingest_world_city_overlays(WorldStore.world)
	_refresh_home_city_overlay_entries(WorldStore.world)
	_update_hover(get_viewport().get_mouse_position())
	queue_redraw()
	_emit_view_transform_changed()
	if _runtime_preview_capture_requested and not _runtime_preview_capture_done:
		if _should_schedule_runtime_capture_now():
			_schedule_runtime_preview_capture()

	if _auto_export_requested and not _auto_export_done and _tiles.size() > 0:
		_auto_export_done = true
		_export_perf_baseline("auto")

	print("[map-grid-theme] scope=%s backendTiles=%d tmxLoaded=%s" % [_chunk_scope, _tiles.size(), str(_tmx_loaded)])


func _apply_world(next_world: Dictionary) -> void:
	_ingest_world_city_overlays(next_world)
	_refresh_home_city_overlay_entries(next_world)
	queue_redraw()


func _rebuild_backend_tile_index() -> void:
	_tile_by_coord = {}
	_backend_tile_by_tmx_key = {}
	_tmx_cell_by_tile_id = {}
	_tmx_cell_by_coord_key = {}
	_mountain_coord_set = {}
	_mountain_overlay_entries = []
	_terrain_edge_overlay_entries = []
	_resource_overlay_entries = []
	_resource_overlay_by_tmx_key = {}
	_resource_debug_non_resource_entries = []
	_city_overlay_by_tile_id = {}
	_world_cell_node_base_by_tmx_key = {}
	_world_cell_node_anchor_by_tmx_key = {}
	_world_cell_reserved_footprint_tmx_keys = {}
	_world_cell_reserved_anchor_by_tmx_key = {}
	_world_cell_reserved_center_by_tmx_key = {}
	_world_cell_preview_tile_by_tmx_key = {}
	_world_cell_preview_focus_tiles = {}
	_world_cell_preview_sample_by_id = {}
	_world_cell_preview_sample_order = []
	_world_cell_live_capture_sample_by_id = {}
	_world_cell_live_capture_sample_order = []
	_reset_world_cell_runtime_builder_stats()
	var has_bounds: bool = false
	var mountain_backend_entries: Array = []
	var river_coord_set: Dictionary = {}
	var river_backend_entries: Array = []
	var sand_coord_set: Dictionary = {}
	var sand_backend_entries: Array = []
	var world_cell_backend_entries: Array = []

	for tile_variant in _tiles:
		if not (tile_variant is Dictionary):
			continue
		var tile_data: Dictionary = tile_variant as Dictionary
		var tile_x: int = int(tile_data.get("x", 0))
		var tile_y: int = int(tile_data.get("y", 0))
		_tile_by_coord[_coord_key(tile_x, tile_y)] = tile_data
		if not has_bounds:
			_backend_x_min = tile_x
			_backend_x_max = tile_x
			_backend_y_min = tile_y
			_backend_y_max = tile_y
			has_bounds = true
		else:
			_backend_x_min = min(_backend_x_min, tile_x)
			_backend_x_max = max(_backend_x_max, tile_x)
			_backend_y_min = min(_backend_y_min, tile_y)
			_backend_y_max = max(_backend_y_max, tile_y)

	if not has_bounds:
		_backend_x_min = 0
		_backend_x_max = 0
		_backend_y_min = 0
		_backend_y_max = 0
		_rebuild_world_cell_preview_entries()
		return

	for tile_variant in _tiles:
		if not (tile_variant is Dictionary):
			continue
		var tile_data: Dictionary = tile_variant as Dictionary
		var tile_x: int = int(tile_data.get("x", 0))
		var tile_y: int = int(tile_data.get("y", 0))
		var mapped_x: int = _map_backend_to_tmx_axis(tile_x, _backend_x_min, _backend_x_max, _tmx_map_width)
		var mapped_y: int = _map_backend_to_tmx_axis(tile_y, _backend_y_min, _backend_y_max, _tmx_map_height)
		var mapped_cell := Vector2i(mapped_x, mapped_y)
		_backend_tile_by_tmx_key[_coord_key(mapped_x, mapped_y)] = tile_data
		_tmx_cell_by_coord_key[_coord_key(tile_x, tile_y)] = mapped_cell
		var tile_id: String = str(tile_data.get("id", "")).strip_edges()
		if tile_id != "":
			_tmx_cell_by_tile_id[tile_id] = mapped_cell

		var tile_type: String = str(tile_data.get("type", "")).strip_edges().to_lower()
		if tile_type == "resource":
			var resource_level: int = clampi(maxi(1, int(tile_data.get("resourceLevel", 1))), 1, 9)
			var resource_kind: String = str(tile_data.get("resourceKind", "")).strip_edges().to_lower()
			var resource_entry := {
				"tileId": tile_id,
				"tmxX": mapped_x,
				"tmxY": mapped_y,
				"resourceLevel": resource_level,
				"resourceKind": resource_kind,
				"overlayFrame": _resolve_resource_overlay_frame(resource_kind, resource_level),
			}
			_resource_overlay_entries.append(resource_entry)
			_resource_overlay_by_tmx_key[_coord_key(mapped_x, mapped_y)] = resource_entry
		else:
			_resource_debug_non_resource_entries.append(
				{
					"tileId": tile_id,
					"tmxX": mapped_x,
					"tmxY": mapped_y,
					"tileType": tile_type,
					"terrain": str(tile_data.get("terrain", "")).strip_edges().to_lower(),
				}
			)
		if tile_type == "city" and tile_id != "":
			var city_owner: String = str(tile_data.get("owner", "")).strip_edges().to_lower()
			var city_entry := {
				"id": tile_id,
				"tileId": tile_id,
				"type": "city",
				"title": str(tile_data.get("title", tile_data.get("name", tile_id))).strip_edges(),
				"x": tile_x,
				"y": tile_y,
				"backendX": tile_x,
				"backendY": tile_y,
				"tmxX": mapped_x,
				"tmxY": mapped_y,
				"terrain": str(tile_data.get("terrain", "cityland")).strip_edges().to_lower(),
				"district": str(tile_data.get("district", "world")).strip_edges(),
				"cityLevel": maxi(1, int(tile_data.get("cityLevel", 1))),
				"owner": city_owner,
				"landmarkId": str(tile_data.get("landmarkId", "")).strip_edges(),
				"compositeId": str(tile_data.get("compositeId", "")).strip_edges(),
				"groupKey": _resolve_city_group_key(tile_id),
			}
			_city_overlay_by_tile_id[tile_id] = city_entry
			world_cell_backend_entries.append(city_entry)
		elif _is_supported_world_cell_node_tile_type(tile_type):
			_record_world_cell_runtime_raw_backend_node(tile_type)
			var node_entry: Dictionary = _build_world_cell_backend_node_entry(tile_data, tile_id, tile_x, tile_y, mapped_x, mapped_y)
			if not node_entry.is_empty():
				world_cell_backend_entries.append(node_entry)

		if tile_type == "resource":
			continue

		var terrain: String = str(tile_data.get("terrain", "")).strip_edges().to_lower()
		if terrain == "mountain":
			_mountain_coord_set[_coord_key(tile_x, tile_y)] = true
			mountain_backend_entries.append(
				{
					"x": tile_x,
					"y": tile_y,
					"tmxX": mapped_x,
					"tmxY": mapped_y,
				}
			)
		elif terrain == "riverland":
			river_coord_set[_coord_key(tile_x, tile_y)] = true
			river_backend_entries.append(
				{
					"x": tile_x,
					"y": tile_y,
					"tmxX": mapped_x,
					"tmxY": mapped_y,
				}
			)
		elif terrain == "wasteland":
			sand_coord_set[_coord_key(tile_x, tile_y)] = true
			sand_backend_entries.append(
				{
					"x": tile_x,
					"y": tile_y,
					"tmxX": mapped_x,
					"tmxY": mapped_y,
				}
			)

	_rebuild_mountain_overlay_entries(mountain_backend_entries)
	_rebuild_terrain_edge_overlay_entries(
		river_backend_entries,
		river_coord_set,
		sand_backend_entries,
		sand_coord_set
	)
	_rebuild_world_cell_runtime_entries(world_cell_backend_entries)
	_rebuild_world_cell_live_capture_samples()
	_rebuild_world_cell_preview_entries()


func _apply_main_map_layered_response(next_map_layout: Dictionary) -> void:
	var layered_payload: Dictionary = _resolve_main_map_layered_payload(next_map_layout)
	if layered_payload.is_empty():
		_clear_main_map_layered_state()
		return

	var raw_layer_order: Variant = layered_payload.get("layer_order", MAIN_MAP_INCLUDE_LAYERS)
	_main_map_layer_order = (raw_layer_order as Array).duplicate(true) if raw_layer_order is Array else MAIN_MAP_INCLUDE_LAYERS.duplicate(true)
	_main_map_chunk_layer = _dictionary_from_variant(layered_payload.get("chunk_layer", {}))
	_main_map_base_map_layer = _dictionary_from_variant(layered_payload.get("base_map_layer", {}))
	_apply_main_map_base_map_layer(_main_map_base_map_layer)
	_main_map_cell_layer = _dictionary_from_variant(layered_payload.get("main_world_cell_layer", {}))
	_apply_main_world_cell_layer(_main_map_cell_layer)
	_main_map_derived_mask_layer = _dictionary_from_variant(layered_payload.get("derived_mask_layer", {}))
	_main_map_maritime_passability_layer = _dictionary_from_variant(layered_payload.get("maritime_passability_layer", {}))
	_main_map_resource_overlay_layer = _dictionary_from_variant(layered_payload.get("resource_overlay_layer", {}))
	_main_map_city_gate_anchor_layer = _dictionary_from_variant(layered_payload.get("city_gate_anchor_layer", {}))
	_main_map_mountain_boundary_layer = _dictionary_from_variant(layered_payload.get("main_world_mountain_boundary_layer", {}))
	_main_map_chokepoint_layer = _dictionary_from_variant(layered_payload.get("main_world_chokepoint_layer", {}))
	_click_priority_formal_sample_layer = _dictionary_from_variant(layered_payload.get("click_priority_formal_sample_layer", {}))
	_rebuild_click_priority_formal_sample_index()
	_main_world_chokepoint_anchor_cell_keys = _collect_main_world_chokepoint_anchor_cell_keys(_main_map_chokepoint_layer)
	_main_map_cell_override_layer = _dictionary_from_variant(layered_payload.get("cell_override_layer", {}))
	_main_map_labels_layer = _dictionary_from_variant(layered_payload.get("labels_layer", {}))
	_tianxia_yutu_overview_layer = _dictionary_from_variant(layered_payload.get("tianxia_yutu_overview_layer", {}))
	_apply_tianxia_yutu_overview_layer(_tianxia_yutu_overview_layer)

	var raw_loaded_chunk_ids: Variant = _main_map_chunk_layer.get("loaded_chunk_ids", [])
	_main_map_loaded_chunk_ids = (raw_loaded_chunk_ids as Array).duplicate(true) if raw_loaded_chunk_ids is Array else []
	var raw_unload_candidate_chunk_ids: Variant = _main_map_chunk_layer.get("unload_candidate_chunk_ids", [])
	_main_map_unload_candidate_chunk_ids = (raw_unload_candidate_chunk_ids as Array).duplicate(true) if raw_unload_candidate_chunk_ids is Array else []
	if not _main_map_loaded_chunk_ids.is_empty():
		_loaded_province_ids = _main_map_loaded_chunk_ids.duplicate(true)

	if not _main_map_resource_overlay_layer.is_empty():
		_resource_overlay_entries = _build_main_map_resource_overlay_entries(_main_map_resource_overlay_layer)
		_resource_overlay_by_tmx_key = {}
		for entry_variant in _resource_overlay_entries:
			if not (entry_variant is Dictionary):
				continue
			var entry: Dictionary = entry_variant as Dictionary
			_resource_overlay_by_tmx_key[_coord_key(int(entry.get("tmxX", -1)), int(entry.get("tmxY", -1)))] = entry
	else:
		_resource_overlay_entries = []
		_resource_overlay_by_tmx_key = {}

	if not _main_map_city_gate_anchor_layer.is_empty():
		var city_gate_world_cell_entries: Array = _build_main_map_city_gate_world_cell_entries(_main_map_city_gate_anchor_layer)
		city_gate_world_cell_entries = _filter_main_map_city_gate_world_cell_entries_for_chokepoints(city_gate_world_cell_entries)
		_rebuild_world_cell_runtime_entries(city_gate_world_cell_entries)
	else:
		_last_main_world_chokepoint_suppressed_city_gate_anchor_count = 0
		_rebuild_world_cell_runtime_entries([])
	_apply_main_map_cell_override_layer(_main_map_cell_override_layer, _main_map_unload_candidate_chunk_ids)
	_camera_viewport_metadata["layeredAdapter"] = {
		"worldId": MAIN_MAP_WORLD_ID,
		"coordinateSpace": MAIN_MAP_COORDINATE_SPACE,
		"layerOrder": _main_map_layer_order.duplicate(true),
		"loadedChunkIds": _main_map_loaded_chunk_ids.duplicate(true),
		"unloadCandidateChunkIds": _main_map_unload_candidate_chunk_ids.duplicate(true),
		"resourceSampleCount": _collect_main_map_resource_objects(_main_map_resource_overlay_layer).size(),
		"cityGateVisibleCount": _collect_main_map_city_gate_objects(_main_map_city_gate_anchor_layer).size(),
		"mainWorldMountainBoundaryVisiblePlacementCount": int(_main_map_mountain_boundary_layer.get("visible_placement_count", 0)),
		"mainWorldMountainBoundaryHardReservedCellCount": int(_main_map_mountain_boundary_layer.get("hard_reserved_cell_count_in_loaded_viewport", 0)),
		"mainWorldMountainBoundaryRenderPieceInstanceCount": int(_main_map_mountain_boundary_layer.get("render_piece_instance_count", 0)),
		"mainWorldMountainBoundaryRuntimeAssetLoadedCount": _main_world_mountain_boundary_texture_by_piece_id.size(),
		"mainWorldMountainBoundaryRuntimeCopyGate": _main_world_mountain_boundary_runtime_copy_gate,
		"mainWorldMountainBoundarySpriteOnScreenCount": _last_main_world_mountain_boundary_sprite_on_screen_count,
		"mainWorldChokepointLayerPresent": not _main_map_chokepoint_layer.is_empty(),
		"mainWorldChokepointAcceptedNodeCount": int(_main_map_chokepoint_layer.get("accepted_pass_wall_node_count", 0)),
		"mainWorldChokepointSpriteOnScreenCount": _last_main_world_chokepoint_sprite_on_screen_count,
		"mainWorldChokepointSuppressedCityGateAnchorCount": _last_main_world_chokepoint_suppressed_city_gate_anchor_count,
		"cellOverrideUpsertCount": _collect_main_map_cell_override_upserts(_main_map_cell_override_layer).size(),
		"cellOverrideCacheCount": _main_map_cell_override_by_cell_id.size(),
		"tianxiaYutuOverviewTileCount": int(_tianxia_yutu_overview_layer.get("tile_count", 0)),
		"tianxiaYutuOverviewMaxDetailSize": _tianxia_yutu_overview_layer.get("max_detail_size_px", []),
		"tianxiaYutuOverviewTexturePath": _tianxia_yutu_overview_texture_path,
	}
	_apply_main_map_initial_focus_if_needed()


func _clear_main_map_layered_state() -> void:
	_main_map_layer_order = []
	_main_map_chunk_layer = {}
	_main_map_base_map_layer = {}
	_main_map_substrate_chunk_texture_by_id = {}
	_main_map_cell_layer = {}
	_main_world_cell_chunk_range_by_id = {}
	_main_map_derived_mask_layer = {}
	_main_map_maritime_passability_layer = {}
	_main_map_resource_overlay_layer = {}
	_main_map_city_gate_anchor_layer = {}
	_main_map_mountain_boundary_layer = {}
	_main_map_chokepoint_layer = {}
	_main_world_chokepoint_anchor_cell_keys = {}
	_main_map_cell_override_layer = {}
	_main_map_labels_layer = {}
	_tianxia_yutu_overview_layer = {}
	_tianxia_yutu_overview_texture = null
	_tianxia_yutu_overview_texture_path = ""
	_tianxia_yutu_admin_focus_mask_texture_cache.clear()
	_last_tianxia_yutu_overview_draw_count = 0
	_last_tianxia_yutu_state_boundary_draw_count = 0
	_last_tianxia_yutu_frontline_draw_count = 0
	_last_tianxia_yutu_frontline_arrow_draw_count = 0
	_last_tianxia_yutu_frontline_marker_label = ""
	_main_world_frontline_markers = []
	_last_main_world_frontline_draw_count = 0
	_last_main_world_frontline_arrow_draw_count = 0
	_last_main_world_frontline_marker_label = ""
	_last_main_world_mountain_boundary_sprite_draw_count = 0
	_last_main_world_mountain_boundary_sprite_failed_count = 0
	_last_main_world_mountain_boundary_sprite_on_screen_count = 0
	_last_main_world_chokepoint_sprite_draw_count = 0
	_last_main_world_chokepoint_sprite_failed_count = 0
	_last_main_world_chokepoint_sprite_on_screen_count = 0
	_last_main_world_chokepoint_suppressed_city_gate_anchor_count = 0
	_main_map_loaded_chunk_ids = []
	_main_map_unload_candidate_chunk_ids = []
	_main_map_cell_override_by_cell_id = {}
	_main_map_cell_override_by_tmx_key = {}


func _apply_tianxia_yutu_overview_layer(layer: Dictionary) -> void:
	if layer.is_empty():
		_tianxia_yutu_overview_texture = null
		_tianxia_yutu_overview_texture_path = ""
		_last_tianxia_yutu_overview_draw_count = 0
		_update_hover_label()
		return
	var preview: Dictionary = _dictionary_from_variant(layer.get("preview_image", {}))
	var preview_path: String = str(preview.get("path", "")).strip_edges()
	if preview_path == _tianxia_yutu_overview_texture_path and _tianxia_yutu_overview_texture != null:
		return
	_tianxia_yutu_overview_texture_path = preview_path
	_tianxia_yutu_overview_texture = _load_repo_or_res_texture(preview_path)
	if _tianxia_yutu_overview_texture == null and preview_path != "":
		push_warning("[map-grid] tianxia yutu overview texture missing: %s" % preview_path)
	_update_hover_label()


func _resolve_main_map_layered_payload(next_map_layout: Dictionary) -> Dictionary:
	if next_map_layout.has("chunk_layer") or next_map_layout.has("main_world_cell_layer") or next_map_layout.has("resource_overlay_layer") or next_map_layout.has("city_gate_anchor_layer") or next_map_layout.has("cell_override_layer") or next_map_layout.has("tianxia_yutu_overview_layer"):
		return next_map_layout
	for key in ["layeredAdapter", "layered", "layers"]:
		var nested_variant: Variant = next_map_layout.get(key, {})
		if not (nested_variant is Dictionary):
			continue
		var nested: Dictionary = nested_variant as Dictionary
		if nested.has("chunk_layer") or nested.has("main_world_cell_layer") or nested.has("resource_overlay_layer") or nested.has("city_gate_anchor_layer") or nested.has("cell_override_layer") or nested.has("tianxia_yutu_overview_layer"):
			return nested
	return {}


func _dictionary_from_variant(value: Variant) -> Dictionary:
	return (value as Dictionary).duplicate(true) if value is Dictionary else {}


func _apply_main_map_base_map_layer(base_map_layer: Dictionary) -> void:
	_main_map_substrate_chunk_texture_by_id = {}
	if base_map_layer.is_empty():
		return
	var raw_textures: Variant = base_map_layer.get("substrate_chunk_textures", [])
	if not (raw_textures is Array):
		return
	for texture_variant in raw_textures as Array:
		if not (texture_variant is Dictionary):
			continue
		var texture_data: Dictionary = texture_variant as Dictionary
		var chunk_id: String = str(texture_data.get("chunk_id", "")).strip_edges()
		if chunk_id == "":
			continue
		var cell_range: Dictionary = _dictionary_from_variant(texture_data.get("cell_range", {}))
		_main_map_substrate_chunk_texture_by_id[chunk_id] = {
			"chunkId": chunk_id,
			"textureId": str(texture_data.get("texture_id", "")).strip_edges(),
			"textureKind": str(texture_data.get("texture_kind", "")).strip_edges(),
			"startX": int(cell_range.get("start_x", 0)),
			"startY": int(cell_range.get("start_y", 0)),
			"endXExclusive": int(cell_range.get("end_x_exclusive", 0)),
			"endYExclusive": int(cell_range.get("end_y_exclusive", 0)),
		}


func _apply_main_world_cell_layer(cell_layer: Dictionary) -> void:
	_main_world_cell_chunk_range_by_id = {}
	if cell_layer.is_empty():
		return
	var raw_ranges: Variant = cell_layer.get("selectable_chunk_ranges", [])
	if not (raw_ranges is Array):
		return
	for range_variant in raw_ranges as Array:
		if not (range_variant is Dictionary):
			continue
		var range_data: Dictionary = range_variant as Dictionary
		var chunk_id: String = str(range_data.get("chunk_id", "")).strip_edges()
		if chunk_id == "":
			continue
		var raw_cell_range: Variant = range_data.get("cell_range", {})
		if not (raw_cell_range is Dictionary):
			continue
		var cell_range: Dictionary = raw_cell_range as Dictionary
		_main_world_cell_chunk_range_by_id[chunk_id] = {
			"chunkId": chunk_id,
			"startX": int(cell_range.get("start_x", 0)),
			"startY": int(cell_range.get("start_y", 0)),
			"endXExclusive": int(cell_range.get("end_x_exclusive", 0)),
			"endYExclusive": int(cell_range.get("end_y_exclusive", 0)),
			"selectableCellCount": int(range_data.get("selectable_cell_count", 0)),
		}


func _is_main_world_cell_layer_active() -> bool:
	return not _main_map_cell_layer.is_empty() and not _main_world_cell_chunk_range_by_id.is_empty()


func _is_main_world_substrate_chunk_renderer_active() -> bool:
	return (
		str(_main_map_base_map_layer.get("renderer_mode", "")).strip_edges() == "chunk_texture_substrate"
		and not _main_map_substrate_chunk_texture_by_id.is_empty()
	)


func uses_main_world_cell_projection() -> bool:
	return _is_main_world_substrate_chunk_renderer_active()


func _apply_main_map_initial_focus_if_needed() -> void:
	if _main_map_initial_focus_applied:
		return
	if not _is_main_world_substrate_chunk_renderer_active():
		return
	if OS.get_environment("SLG_MAP_CENTER_X").strip_edges() != "" or OS.get_environment("SLG_MAP_CENTER_Y").strip_edges() != "":
		_main_map_initial_focus_applied = true
		return
	if _is_truthy_env("SLG_MAP_DYNAMIC_VIEWPORT_DISABLED"):
		_main_map_initial_focus_applied = true
		return
	_main_map_initial_focus_applied = true
	_focus_main_map_cell(MAIN_MAP_INITIAL_FOCUS_CELL_X, MAIN_MAP_INITIAL_FOCUS_CELL_Y)


func _focus_main_map_cell(cell_x: int, cell_y: int, emit_transform: bool = true) -> bool:
	var runtime_width: int = _main_map_runtime_tmx_width()
	var runtime_height: int = _main_map_runtime_tmx_height()
	if runtime_width <= 0 or runtime_height <= 0:
		return false
	var tmx_x: int = _main_map_cell_axis_to_runtime_tmx(cell_x, runtime_width, MAIN_MAP_WORLD_WIDTH_CELLS)
	var tmx_y: int = _main_map_cell_axis_to_runtime_tmx(cell_y, runtime_height, MAIN_MAP_WORLD_HEIGHT_CELLS)
	var target_screen: Vector2 = _tmx_to_screen(tmx_x, tmx_y)
	var viewport_center: Vector2 = get_viewport_rect().size * 0.5
	_pan_offset += viewport_center - target_screen
	queue_redraw()
	if emit_transform:
		_emit_view_transform_changed()
	return true


func get_view_transform_state() -> Dictionary:
	return {
		"schema": "map_grid_view_transform_v0_1",
		"panOffset": [_pan_offset.x, _pan_offset.y],
		"zoom": _zoom,
		"centerCell": get_view_center_cell_1km(),
	}


func get_view_center_cell_1km() -> Dictionary:
	var runtime_width: int = _main_map_runtime_tmx_width()
	var runtime_height: int = _main_map_runtime_tmx_height()
	if runtime_width <= 0 or runtime_height <= 0:
		return {}
	var viewport_center: Vector2 = get_viewport_rect().size * 0.5
	var center_tmx: Vector2 = _screen_to_tmx(viewport_center, _zoom)
	return {
		"x": _main_map_runtime_tmx_axis_to_cell(center_tmx.x, runtime_width, MAIN_MAP_WORLD_WIDTH_CELLS),
		"y": _main_map_runtime_tmx_axis_to_cell(center_tmx.y, runtime_height, MAIN_MAP_WORLD_HEIGHT_CELLS),
	}


func restore_view_transform_state(view_transform_state: Dictionary, emit_transform: bool = true) -> bool:
	if view_transform_state.is_empty():
		return false
	var raw_pan_offset: Variant = view_transform_state.get("panOffset", [])
	var next_pan_offset: Vector2 = _pan_offset
	if raw_pan_offset is Array and raw_pan_offset.size() >= 2:
		next_pan_offset = Vector2(float(raw_pan_offset[0]), float(raw_pan_offset[1]))
	elif raw_pan_offset is Dictionary:
		var raw_pan_dict: Dictionary = raw_pan_offset as Dictionary
		next_pan_offset = Vector2(
			float(raw_pan_dict.get("x", _pan_offset.x)),
			float(raw_pan_dict.get("y", _pan_offset.y))
		)
	_pan_offset = next_pan_offset
	_zoom = clampf(float(view_transform_state.get("zoom", _zoom)), _effective_min_zoom(), max_zoom)
	_last_view_transform_restore_count += 1
	queue_redraw()
	if emit_transform:
		_emit_view_transform_changed()
	return true


func _main_map_runtime_tmx_width() -> int:
	return MAIN_MAP_WORLD_WIDTH_CELLS if _is_main_world_substrate_chunk_renderer_active() else _tmx_map_width


func _main_map_runtime_tmx_height() -> int:
	return MAIN_MAP_WORLD_HEIGHT_CELLS if _is_main_world_substrate_chunk_renderer_active() else _tmx_map_height


func _main_map_runtime_tmx_max_x() -> int:
	return maxi(0, _main_map_runtime_tmx_width() - 1)


func _main_map_runtime_tmx_max_y() -> int:
	return maxi(0, _main_map_runtime_tmx_height() - 1)


func _main_map_runtime_tmx_axis_to_cell(axis_value: float, runtime_axis_size: int, world_axis_size: int) -> int:
	if _is_main_world_substrate_chunk_renderer_active():
		return clampi(int(round(axis_value)), 0, world_axis_size - 1)
	return _map_tmx_axis_to_main_map_cell(axis_value, runtime_axis_size, world_axis_size)


func _main_map_cell_axis_to_runtime_tmx(world_axis_value: int, runtime_axis_size: int, world_axis_size: int) -> int:
	if _is_main_world_substrate_chunk_renderer_active():
		return clampi(world_axis_value, 0, world_axis_size - 1)
	return _map_main_map_axis_to_tmx(world_axis_value, runtime_axis_size, world_axis_size)


func _is_main_world_cell_selectable(cell_x: int, cell_y: int) -> bool:
	if not _is_main_world_cell_layer_active():
		return true
	var chunk_id: String = _main_map_chunk_id_for_cell(Vector2i(cell_x, cell_y))
	var range_variant: Variant = _main_world_cell_chunk_range_by_id.get(chunk_id, {})
	if not (range_variant is Dictionary):
		return false
	var range_data: Dictionary = range_variant as Dictionary
	return (
		cell_x >= int(range_data.get("startX", 0))
		and cell_x < int(range_data.get("endXExclusive", 0))
		and cell_y >= int(range_data.get("startY", 0))
		and cell_y < int(range_data.get("endYExclusive", 0))
	)


func _build_main_map_resource_overlay_entries(resource_layer: Dictionary) -> Array:
	var entries: Array = []
	for object_variant in _collect_main_map_resource_objects(resource_layer):
		if not (object_variant is Dictionary):
			continue
		var object_data: Dictionary = object_variant as Dictionary
		var tmx_cell: Vector2i = _extract_main_map_object_tmx_cell(object_data)
		if tmx_cell.x < 0 or tmx_cell.y < 0:
			continue
		var resource_kind: String = str(object_data.get("resource_type", object_data.get("resourceKind", ""))).strip_edges().to_lower()
		var resource_level: int = clampi(maxi(1, int(object_data.get("resource_level", object_data.get("resourceLevel", 1)))), 1, 9)
		var overlay_frame: String = _main_map_resource_frame_from_asset_path(str(object_data.get("asset_path", "")))
		if overlay_frame == "":
			overlay_frame = _resolve_resource_overlay_frame(resource_kind, resource_level)
		entries.append({
			"tileId": str(object_data.get("object_id", object_data.get("id", ""))).strip_edges(),
			"objectId": str(object_data.get("object_id", object_data.get("id", ""))).strip_edges(),
			"tmxX": tmx_cell.x,
			"tmxY": tmx_cell.y,
			"resourceLevel": resource_level,
			"resourceKind": resource_kind,
			"overlayFrame": overlay_frame,
			"source": "main_map_layered_adapter",
			"chunkId": str(object_data.get("chunk_id", "")).strip_edges(),
			"drawSortKey": int(object_data.get("draw_sort_key", 0)),
		})
	return entries


func _collect_main_map_resource_objects(resource_layer: Dictionary) -> Array:
	var objects: Array = []
	for key in ["resource_objects", "resource_upserts", "upsert_objects", "sample_resource_objects"]:
		var raw_objects: Variant = resource_layer.get(key, [])
		if raw_objects is Array:
			objects.append_array(raw_objects as Array)
	return objects


func _main_map_resource_frame_from_asset_path(asset_path: String) -> String:
	var normalized_path: String = asset_path.strip_edges()
	if normalized_path == "":
		return ""
	var file_name: String = normalized_path.get_file()
	return file_name if file_name.ends_with(".png") else ""


func _build_main_map_city_gate_world_cell_entries(city_gate_anchor_layer: Dictionary) -> Array:
	var entries: Array = []
	for object_variant in _collect_main_map_city_gate_objects(city_gate_anchor_layer):
		if not (object_variant is Dictionary):
			continue
		var object_data: Dictionary = object_variant as Dictionary
		var entry: Dictionary = _build_main_map_city_gate_world_cell_entry(object_data)
		if not entry.is_empty():
			entries.append(entry)
	return entries


func _filter_main_map_city_gate_world_cell_entries_for_chokepoints(entries: Array) -> Array:
	_last_main_world_chokepoint_suppressed_city_gate_anchor_count = 0
	if _main_world_chokepoint_anchor_cell_keys.is_empty():
		return entries
	var filtered_entries: Array = []
	for entry_variant in entries:
		if not (entry_variant is Dictionary):
			filtered_entries.append(entry_variant)
			continue
		var entry: Dictionary = entry_variant as Dictionary
		var cell_key: String = _coord_key(int(entry.get("x", -1)), int(entry.get("y", -1)))
		var entry_type: String = str(entry.get("type", "")).strip_edges().to_lower()
		var footprint_id: String = str(entry.get("footprintId", "")).strip_edges()
		var is_legacy_pass_visual: bool = entry_type == "pass" or footprint_id == WORLD_CELL_FOOTPRINT_PASS_1X1
		if is_legacy_pass_visual:
			_last_main_world_chokepoint_suppressed_city_gate_anchor_count += 1
			continue
		filtered_entries.append(entry)
	return filtered_entries


func _collect_main_world_chokepoint_anchor_cell_keys(chokepoint_layer: Dictionary) -> Dictionary:
	var cell_keys: Dictionary = {}
	if chokepoint_layer.is_empty():
		return cell_keys
	var raw_nodes: Variant = chokepoint_layer.get("visible_nodes", [])
	if not (raw_nodes is Array):
		return cell_keys
	for node_variant in raw_nodes as Array:
		if not (node_variant is Dictionary):
			continue
		var node: Dictionary = node_variant as Dictionary
		_register_main_world_chokepoint_anchor_cell_key(cell_keys, node.get("cell_1km", {}))
		var raw_render_pieces: Variant = node.get("render_pieces", [])
		if not (raw_render_pieces is Array):
			continue
		for piece_variant in raw_render_pieces as Array:
			if not (piece_variant is Dictionary):
				continue
			var piece: Dictionary = piece_variant as Dictionary
			_register_main_world_chokepoint_anchor_cell_key(cell_keys, piece.get("cell_1km", []))
	return cell_keys


func _register_main_world_chokepoint_anchor_cell_key(cell_keys: Dictionary, raw_cell: Variant) -> void:
	var cell: Vector2i = _main_world_chokepoint_cell_from_variant(raw_cell)
	if cell.x < 0 or cell.y < 0:
		return
	cell_keys[_coord_key(cell.x, cell.y)] = true


func _main_world_chokepoint_cell_from_variant(raw_cell: Variant) -> Vector2i:
	if raw_cell is Dictionary:
		var cell_dict: Dictionary = raw_cell as Dictionary
		if cell_dict.has("x") and cell_dict.has("y"):
			return Vector2i(int(cell_dict.get("x", -1)), int(cell_dict.get("y", -1)))
	if raw_cell is Array:
		return _vector2i_from_json_array(raw_cell, Vector2i(-1, -1))
	return Vector2i(-1, -1)


func _collect_main_map_city_gate_objects(city_gate_anchor_layer: Dictionary) -> Array:
	var objects: Array = []
	var seen: Dictionary = {}
	for key in ["anchor_upserts", "render_objects", "render_projection_samples", "visible_objects"]:
		var raw_objects: Variant = city_gate_anchor_layer.get(key, [])
		if not (raw_objects is Array):
			continue
		for object_variant in raw_objects as Array:
			if not (object_variant is Dictionary):
				continue
			var object_data: Dictionary = object_variant as Dictionary
			var object_id: String = str(object_data.get("object_id", object_data.get("id", ""))).strip_edges()
			if object_id == "":
				object_id = "%s:%s" % [str(object_data.get("kind", "object")), JSON.stringify(object_data.get("cell_1km", {}))]
			if seen.has(object_id):
				continue
			seen[object_id] = true
			objects.append(object_data)
	return objects


func _rebuild_click_priority_formal_sample_index() -> void:
	_click_priority_formal_sample_by_tmx_key = {}
	var raw_samples: Variant = _click_priority_formal_sample_layer.get("samples", [])
	if not (raw_samples is Array):
		return
	for sample_variant in raw_samples as Array:
		if not (sample_variant is Dictionary):
			continue
		var sample: Dictionary = sample_variant as Dictionary
		var cell: Dictionary = _dictionary_from_variant(sample.get("cell_1km", {}))
		var tmx: Dictionary = _dictionary_from_variant(sample.get("tmx", {}))
		var tmx_x: int = int(tmx.get("x", cell.get("x", -1)))
		var tmx_y: int = int(tmx.get("y", cell.get("y", -1)))
		if tmx_x < 0 or tmx_y < 0:
			continue
		_click_priority_formal_sample_by_tmx_key[_coord_key(tmx_x, tmx_y)] = sample


func _apply_main_map_cell_override_layer(cell_override_layer: Dictionary, unload_candidate_chunk_ids: Array) -> void:
	_remove_main_map_cell_overrides_for_chunks(unload_candidate_chunk_ids)
	if cell_override_layer.is_empty():
		_rebuild_main_map_cell_override_tmx_index()
		return
	var remove_ids: Array = _collect_main_map_cell_override_removes(cell_override_layer)
	for remove_id_variant in remove_ids:
		var cell_id: String = str(remove_id_variant).strip_edges()
		if cell_id != "":
			_main_map_cell_override_by_cell_id.erase(cell_id)
	for override_variant in _collect_main_map_cell_override_upserts(cell_override_layer):
		if not (override_variant is Dictionary):
			continue
		var normalized: Dictionary = _normalize_main_map_cell_override_entry(override_variant as Dictionary)
		if normalized.is_empty():
			continue
		_main_map_cell_override_by_cell_id[str(normalized.get("cellId", ""))] = normalized
	_rebuild_main_map_cell_override_tmx_index()


func _collect_main_map_cell_override_upserts(cell_override_layer: Dictionary) -> Array:
	var objects: Array = []
	for key in ["override_upserts", "upserts", "cell_override_upserts"]:
		var raw_objects: Variant = cell_override_layer.get(key, [])
		if raw_objects is Array:
			objects.append_array(raw_objects as Array)
	return objects


func _collect_main_map_cell_override_removes(cell_override_layer: Dictionary) -> Array:
	var removes: Array = []
	for key in ["override_removes", "remove_cell_ids", "cell_override_removes"]:
		var raw_removes: Variant = cell_override_layer.get(key, [])
		if raw_removes is Array:
			for remove_variant in raw_removes as Array:
				if remove_variant is Dictionary:
					var remove_data: Dictionary = remove_variant as Dictionary
					var cell_id: String = str(remove_data.get("cell_id", remove_data.get("cellId", ""))).strip_edges()
					if cell_id != "":
						removes.append(cell_id)
				else:
					var raw_cell_id: String = str(remove_variant).strip_edges()
					if raw_cell_id != "":
						removes.append(raw_cell_id)
	return removes


func _normalize_main_map_cell_override_entry(override_data: Dictionary) -> Dictionary:
	var tmx_cell: Vector2i = _extract_main_map_object_tmx_cell(override_data)
	var logical_cell: Vector2i = _extract_main_map_object_cell(override_data)
	if tmx_cell.x < 0 or tmx_cell.y < 0 or logical_cell.x < 0 or logical_cell.y < 0:
		return {}
	var cell_id: String = str(override_data.get("cell_id", override_data.get("cellId", ""))).strip_edges()
	if cell_id == "":
		cell_id = "%s:%d:%d" % [MAIN_MAP_WORLD_ID, logical_cell.x, logical_cell.y]
	var chunk_id: String = str(override_data.get("chunk_id", override_data.get("chunkId", ""))).strip_edges()
	if chunk_id == "":
		chunk_id = _main_map_chunk_id_for_cell(logical_cell)
	var normalized: Dictionary = {
		"cellId": cell_id,
		"worldId": str(override_data.get("world_id", override_data.get("worldId", MAIN_MAP_WORLD_ID))).strip_edges(),
		"coordinateSpace": str(override_data.get("coordinate_space", override_data.get("coordinateSpace", MAIN_MAP_COORDINATE_SPACE))).strip_edges(),
		"tmxX": tmx_cell.x,
		"tmxY": tmx_cell.y,
		"backendX": logical_cell.x,
		"backendY": logical_cell.y,
		"chunkId": chunk_id,
		"owner": str(override_data.get("owner", "neutral")).strip_edges(),
		"cellVersion": int(override_data.get("cell_version", override_data.get("cellVersion", 0))),
		"lastEventType": str(override_data.get("last_event_type", override_data.get("lastEventType", ""))).strip_edges(),
		"lastEventId": str(override_data.get("last_event_id", override_data.get("lastEventId", ""))).strip_edges(),
		"updatedWorldVersion": int(override_data.get("updated_world_version", override_data.get("updatedWorldVersion", 0))),
	}
	var immunity_until: String = _read_main_map_cell_immunity_until(override_data)
	if immunity_until != "":
		normalized["immunityUntil"] = immunity_until
	var immunity_active: Variant = _read_main_map_cell_immunity_active(override_data)
	if immunity_active != null:
		normalized["immunityActive"] = bool(immunity_active)
	var immunity_source: String = str(override_data.get("immunitySource", override_data.get("immunity_source", ""))).strip_edges()
	if immunity_source != "":
		normalized["immunitySource"] = immunity_source
	return normalized


func _copy_main_map_cell_immunity_fields(source: Dictionary, target: Dictionary) -> void:
	for key_variant in [
		"immunityUntil",
		"immunity_until",
		"protectionUntil",
		"protection_until",
		"protectedUntil",
		"protected_until",
		"warFreeUntil",
		"war_free_until",
		"truceUntil",
		"truce_until",
		"shieldUntil",
		"shield_until",
		"immunityActive",
		"immunity_active",
		"isImmune",
		"is_immune",
		"protected",
		"isProtected",
		"is_protected",
		"warFree",
		"war_free",
		"shielded",
		"hasImmunity",
		"has_immunity",
		"immunitySource",
		"immunity_source",
	]:
		var key: String = str(key_variant)
		if source.has(key):
			target[key] = source.get(key)

func _read_main_map_cell_immunity_until(data: Dictionary) -> String:
	for key_variant in [
		"immunityUntil",
		"immunity_until",
		"protectionUntil",
		"protection_until",
		"protectedUntil",
		"protected_until",
		"warFreeUntil",
		"war_free_until",
		"truceUntil",
		"truce_until",
		"shieldUntil",
		"shield_until",
	]:
		var key: String = str(key_variant)
		if not data.has(key):
			continue
		var value: String = str(data.get(key, "")).strip_edges()
		if value != "":
			return value
	return ""

func _read_main_map_cell_immunity_active(data: Dictionary) -> Variant:
	for key_variant in [
		"immunityActive",
		"immunity_active",
		"immunity",
		"isImmune",
		"is_immune",
		"protected",
		"isProtected",
		"is_protected",
		"warFree",
		"war_free",
		"shielded",
		"hasImmunity",
		"has_immunity",
	]:
		var key: String = str(key_variant)
		if data.has(key):
			return _truthy_variant(data.get(key))
	return null

func _truthy_variant(value: Variant) -> bool:
	if value is bool:
		return bool(value)
	if value is int or value is float:
		return float(value) > 0.0
	var text: String = str(value).strip_edges().to_lower()
	return text == "1" or text == "true" or text == "yes" or text == "y" or text == "on"

func _is_main_map_cell_immunity_active(override_entry: Dictionary) -> bool:
	var immunity_until: String = str(override_entry.get("immunityUntil", "")).strip_edges()
	var explicit_active: bool = bool(override_entry.get("immunityActive", false))
	if immunity_until != "":
		var until_unix: int = _parse_iso8601_to_unix_seconds(immunity_until)
		if until_unix > 0:
			return explicit_active and until_unix > int(Time.get_unix_time_from_system())
		return explicit_active
	return explicit_active

func _parse_iso8601_to_unix_seconds(raw_value: String) -> int:
	var normalized: String = raw_value.strip_edges()
	if normalized == "":
		return -1
	if normalized.ends_with("Z"):
		normalized = normalized.substr(0, normalized.length() - 1)
	var date_time_parts: PackedStringArray = normalized.split("T")
	if date_time_parts.size() != 2:
		return -1
	var date_parts: PackedStringArray = date_time_parts[0].split("-")
	var time_parts: PackedStringArray = date_time_parts[1].split(":")
	if date_parts.size() != 3 or time_parts.size() < 3:
		return -1
	var seconds_text: String = str(time_parts[2])
	if seconds_text.find(".") >= 0:
		seconds_text = seconds_text.split(".")[0]
	var datetime := {
		"year": int(date_parts[0]),
		"month": int(date_parts[1]),
		"day": int(date_parts[2]),
		"hour": int(time_parts[0]),
		"minute": int(time_parts[1]),
		"second": int(seconds_text),
	}
	return int(Time.get_unix_time_from_datetime_dict(datetime))


func apply_main_map_owner_delta_invalidation(message: Dictionary) -> bool:
	var cell_x: int = int(message.get("cellX", message.get("cell_x", -1)))
	var cell_y: int = int(message.get("cellY", message.get("cell_y", -1)))
	if cell_x < 0 or cell_y < 0:
		return false
	var cell_id: String = str(message.get("cellId", message.get("cell_id", ""))).strip_edges()
	if cell_id == "":
		cell_id = "%s:%d:%d" % [MAIN_MAP_WORLD_ID, cell_x, cell_y]
	var override_data: Dictionary = {
		"cell_id": cell_id,
		"world_id": str(message.get("worldId", message.get("world_id", MAIN_MAP_WORLD_ID))).strip_edges(),
		"coordinate_space": str(message.get("coordinateSpace", message.get("coordinate_space", MAIN_MAP_COORDINATE_SPACE))).strip_edges(),
		"cell_1km": {"x": cell_x, "y": cell_y},
		"chunk_id": str(message.get("chunkId", message.get("chunk_id", _main_map_chunk_id_for_cell(Vector2i(cell_x, cell_y))))).strip_edges(),
		"owner": str(message.get("owner", message.get("nextOwner", "neutral"))).strip_edges(),
		"cell_version": int(message.get("cellVersion", message.get("nextCellVersion", 0))),
		"last_event_type": str(message.get("eventType", message.get("lastEventType", ""))).strip_edges(),
		"last_event_id": str(message.get("eventId", message.get("lastEventId", ""))).strip_edges(),
		"updated_world_version": int(message.get("worldVersion", message.get("updatedWorldVersion", 0))),
	}
	_copy_main_map_cell_immunity_fields(message, override_data)
	var normalized: Dictionary = _normalize_main_map_cell_override_entry(override_data)
	if normalized.is_empty():
		return false
	_main_map_cell_override_by_cell_id[str(normalized.get("cellId", cell_id))] = normalized
	_rebuild_main_map_cell_override_tmx_index()
	_apply_main_map_owner_delta_to_selected_cell(normalized)
	queue_redraw()
	return true


func _apply_main_map_owner_delta_to_selected_cell(override_entry: Dictionary) -> void:
	if override_entry.is_empty():
		return
	var cell_id: String = str(override_entry.get("cellId", "")).strip_edges()
	var backend_x: int = int(override_entry.get("backendX", -1))
	var backend_y: int = int(override_entry.get("backendY", -1))
	var selected_cell_id: String = str(_selected_main_map_cell_action_context.get("cellId", "")).strip_edges()
	var selected_x: int = int(_selected_main_map_cell_action_context.get("cellX", -1))
	var selected_y: int = int(_selected_main_map_cell_action_context.get("cellY", -1))
	var matches_selected: bool = (
		(selected_cell_id != "" and selected_cell_id == cell_id)
		or (selected_x == backend_x and selected_y == backend_y)
	)
	if not matches_selected:
		return
	for key in ["cellId", "chunkId", "owner", "cellVersion", "lastEventType", "lastEventId", "updatedWorldVersion", "immunityUntil", "immunityActive", "immunitySource"]:
		_selected_main_map_cell_action_context[key] = override_entry.get(key, _selected_main_map_cell_action_context.get(key, null))
	_selected_main_map_cell_action_context["cellX"] = backend_x
	_selected_main_map_cell_action_context["cellY"] = backend_y
	_selected_main_map_cell_action_context["backendX"] = backend_x
	_selected_main_map_cell_action_context["backendY"] = backend_y
	_selected_main_map_cell_action_context["tmxX"] = int(override_entry.get("tmxX", _selected_main_map_cell_action_context.get("tmxX", backend_x)))
	_selected_main_map_cell_action_context["tmxY"] = int(override_entry.get("tmxY", _selected_main_map_cell_action_context.get("tmxY", backend_y)))
	if not _selected_tile.is_empty():
		_selected_tile["owner"] = str(override_entry.get("owner", _selected_tile.get("owner", "neutral"))).strip_edges()
		_selected_tile["cellVersion"] = int(override_entry.get("cellVersion", _selected_tile.get("cellVersion", 0)))
		_selected_tile["chunkId"] = str(override_entry.get("chunkId", _selected_tile.get("chunkId", ""))).strip_edges()
		_selected_tile["immunityUntil"] = str(override_entry.get("immunityUntil", _selected_tile.get("immunityUntil", ""))).strip_edges()
		_selected_tile["immunityActive"] = _is_main_map_cell_immunity_active(override_entry)
		_selected_tile["cellId"] = cell_id


func _remove_main_map_cell_overrides_for_chunks(chunk_ids: Array) -> void:
	if chunk_ids.is_empty() or _main_map_cell_override_by_cell_id.is_empty():
		return
	var chunk_set: Dictionary = {}
	for chunk_id_variant in chunk_ids:
		var chunk_id: String = str(chunk_id_variant).strip_edges()
		if chunk_id != "":
			chunk_set[chunk_id] = true
	if chunk_set.is_empty():
		return
	var remove_cell_ids: Array = []
	for cell_id_variant in _main_map_cell_override_by_cell_id.keys():
		var cell_id: String = str(cell_id_variant)
		var override_variant: Variant = _main_map_cell_override_by_cell_id.get(cell_id, {})
		if not (override_variant is Dictionary):
			continue
		var override_entry: Dictionary = override_variant as Dictionary
		var chunk_id: String = str(override_entry.get("chunkId", "")).strip_edges()
		if chunk_set.has(chunk_id):
			remove_cell_ids.append(cell_id)
	for cell_id_variant in remove_cell_ids:
		_main_map_cell_override_by_cell_id.erase(str(cell_id_variant))


func _rebuild_main_map_cell_override_tmx_index() -> void:
	_main_map_cell_override_by_tmx_key = {}
	for override_variant in _main_map_cell_override_by_cell_id.values():
		if not (override_variant is Dictionary):
			continue
		var override_entry: Dictionary = override_variant as Dictionary
		var tmx_x: int = int(override_entry.get("tmxX", -1))
		var tmx_y: int = int(override_entry.get("tmxY", -1))
		if tmx_x < 0 or tmx_y < 0:
			continue
		_main_map_cell_override_by_tmx_key[_coord_key(tmx_x, tmx_y)] = override_entry


func _main_map_chunk_id_for_cell(cell_1km: Vector2i) -> String:
	var chunk_x: int = int(floor(float(cell_1km.x) / float(MAIN_MAP_CHUNK_SIZE_CELLS)))
	var chunk_y: int = int(floor(float(cell_1km.y) / float(MAIN_MAP_CHUNK_SIZE_CELLS)))
	return "chunk_y%03d_x%03d" % [chunk_y, chunk_x]


func _build_main_map_city_gate_world_cell_entry(object_data: Dictionary) -> Dictionary:
	var tmx_cell: Vector2i = _extract_main_map_object_tmx_cell(object_data)
	if tmx_cell.x < 0 or tmx_cell.y < 0:
		return {}
	var cell_1km: Vector2i = _extract_main_map_object_cell(object_data)
	var kind: String = str(object_data.get("kind", "")).strip_edges().to_lower()
	var is_gate: bool = kind == "gate" or str(object_data.get("prefab_key", "")).begins_with("gate_")
	var object_id: String = str(object_data.get("object_id", object_data.get("id", ""))).strip_edges()
	if object_id == "":
		object_id = "main_map_%s_%d_%d" % [kind if kind != "" else "anchor", tmx_cell.x, tmx_cell.y]
	var title: String = str(object_data.get("city_name", object_data.get("name", object_id))).strip_edges()
	var footprint_id: String = _resolve_main_map_city_gate_footprint_id(object_data, is_gate)
	var composite_id: String = _resolve_main_map_city_gate_composite_id(footprint_id, is_gate)
	var node_type: String = _resolve_main_map_city_gate_node_type(object_data, is_gate)
	return {
		"id": object_id,
		"tileId": object_id,
		"sourceTileId": str(object_data.get("source_tile_id", object_data.get("sourceTileId", ""))).strip_edges(),
		"type": node_type,
		"title": title,
		"name": title,
		"x": cell_1km.x,
		"y": cell_1km.y,
		"backendX": cell_1km.x,
		"backendY": cell_1km.y,
		"tmxX": tmx_cell.x,
		"tmxY": tmx_cell.y,
		"terrain": "passland" if is_gate else "cityland",
		"district": str(object_data.get("region_label", object_data.get("state_label", "main_map"))).strip_edges(),
		"cityLevel": _resolve_main_map_city_level(object_data, footprint_id, is_gate),
		"owner": str(object_data.get("owner", "neutral")).strip_edges(),
		"factionId": str(object_data.get("faction_id", object_data.get("factionId", ""))).strip_edges(),
		"cityRole": str(object_data.get("city_role", object_data.get("cityRole", ""))).strip_edges(),
		"anchorDeltaSource": str(object_data.get("anchor_delta_source", object_data.get("anchorDeltaSource", ""))).strip_edges(),
		"footprintId": footprint_id,
		"compositeId": composite_id,
		"source": "main_map_layered_adapter",
		"prefabKey": str(object_data.get("prefab_key", "")).strip_edges(),
		"assetStatus": str(object_data.get("asset_status", object_data.get("assetStatus", ""))).strip_edges(),
		"assetPath": str(object_data.get("asset_path", object_data.get("assetPath", ""))).strip_edges(),
		"sourceAssetPath": str(object_data.get("source_asset_path", object_data.get("sourceAssetPath", ""))).strip_edges(),
		"acceptedArtIndexPath": str(object_data.get("accepted_experiment_art_asset_index_path", object_data.get("acceptedArtIndexPath", ""))).strip_edges(),
		"logicPlaceholder": bool(object_data.get("logic_placeholder", object_data.get("logicPlaceholder", false))),
		"placeholderRole": str(object_data.get("placeholder_role", object_data.get("placeholderRole", ""))).strip_edges(),
		"boundaryRole": str(object_data.get("boundary_role", object_data.get("boundaryRole", ""))).strip_edges(),
		"barrierRole": str(object_data.get("barrier_role", object_data.get("barrierRole", ""))).strip_edges(),
		"blocksMovement": bool(object_data.get("blocks_movement", object_data.get("blocksMovement", false))),
		"blocksResourceGeneration": bool(object_data.get("blocks_resource_generation", object_data.get("blocksResourceGeneration", false))),
		"chunkId": str(object_data.get("chunk_id", "")).strip_edges(),
		"drawSortKey": int(object_data.get("draw_sort_key", 0)),
	}


func _resolve_main_map_city_gate_node_type(object_data: Dictionary, is_gate: bool) -> String:
	if is_gate:
		return "pass"
	var kind: String = str(object_data.get("kind", "")).strip_edges().to_lower()
	if kind == "player_city" or kind == "ai_city":
		return kind
	var role: String = str(object_data.get("city_role", object_data.get("cityRole", ""))).strip_edges().to_lower()
	if role == "player_main_city":
		return "player_city"
	if role == "ai_main_city":
		return "ai_city"
	return "system_city"


func _extract_main_map_object_tmx_cell(object_data: Dictionary) -> Vector2i:
	var logical_cell: Vector2i = _extract_main_map_object_cell(object_data)
	if logical_cell.x >= 0 and logical_cell.y >= 0 and _is_main_world_substrate_chunk_renderer_active():
		return logical_cell
	if logical_cell.x >= 0 and logical_cell.y >= 0 and _is_main_map_projection_scaled_to_preview():
		var runtime_width: int = _main_map_runtime_tmx_width()
		var runtime_height: int = _main_map_runtime_tmx_height()
		return Vector2i(
			_main_map_cell_axis_to_runtime_tmx(logical_cell.x, runtime_width, MAIN_MAP_WORLD_WIDTH_CELLS),
			_main_map_cell_axis_to_runtime_tmx(logical_cell.y, runtime_height, MAIN_MAP_WORLD_HEIGHT_CELLS)
		)
	var projection: Dictionary = _dictionary_from_variant(object_data.get("projection", {}))
	var iso_projection: Dictionary = _dictionary_from_variant(projection.get("isometric_tmx_equivalent", {}))
	if iso_projection.has("tmxX") and iso_projection.has("tmxY"):
		return Vector2i(int(iso_projection.get("tmxX", -1)), int(iso_projection.get("tmxY", -1)))
	return logical_cell


func _extract_main_map_object_cell(object_data: Dictionary) -> Vector2i:
	var cell: Dictionary = _dictionary_from_variant(object_data.get("cell_1km", {}))
	if cell.has("x") and cell.has("y"):
		return Vector2i(int(cell.get("x", -1)), int(cell.get("y", -1)))
	return Vector2i(int(object_data.get("x", -1)), int(object_data.get("y", -1)))


func _is_main_map_projection_scaled_to_preview() -> bool:
	if _is_main_world_substrate_chunk_renderer_active():
		return false
	return (
		_tmx_map_width > 1
		and _tmx_map_height > 1
		and (_tmx_map_width != MAIN_MAP_WORLD_WIDTH_CELLS or _tmx_map_height != MAIN_MAP_WORLD_HEIGHT_CELLS)
	)


func _resolve_main_map_city_gate_footprint_id(object_data: Dictionary, is_gate: bool) -> String:
	if is_gate:
		return WORLD_CELL_FOOTPRINT_PASS_1X1
	var existing_id: String = str(object_data.get("footprint_id", object_data.get("footprintId", ""))).strip_edges()
	if existing_id != "":
		return existing_id
	var footprint_cells: Vector2i = _vector2i_from_json_array(object_data.get("footprint_cells", []), Vector2i(3, 3))
	var side: int = maxi(footprint_cells.x, footprint_cells.y)
	if side >= 9:
		return WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L09_9X9
	if side >= 7:
		return WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L07_L08_7X7
	if side >= 5:
		return WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L05_L06_5X5
	return WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L03_L04_3X3


func _resolve_main_map_city_gate_composite_id(footprint_id: String, is_gate: bool) -> String:
	if is_gate:
		return "world_node_pass_sw_v1"
	if footprint_id == WORLD_CELL_FOOTPRINT_PLAYER_CITY_3X3_INITIAL:
		return "world_node_city_v1"
	if footprint_id == WORLD_CELL_FOOTPRINT_AI_CITY_3X3_INITIAL:
		return "world_node_ai_city_3x3_v1"
	match footprint_id:
		WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L09_9X9:
			return "world_node_system_city_9x9_v1"
		WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L07_L08_7X7:
			return "world_node_system_city_7x7_v1"
		WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L05_L06_5X5:
			return "world_node_system_city_5x5_v1"
		_:
			return "world_node_system_city_3x3_v1"


func _resolve_main_map_city_level(object_data: Dictionary, footprint_id: String, is_gate: bool) -> int:
	if is_gate:
		return 1
	if object_data.has("city_level") or object_data.has("cityLevel"):
		return clampi(int(object_data.get("city_level", object_data.get("cityLevel", 3))), 1, 9)
	var role: String = str(object_data.get("city_role", "")).strip_edges().to_lower()
	if role == "state_government":
		return 9
	if role == "commandery_seat":
		return 7
	match footprint_id:
		WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L09_9X9:
			return 9
		WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L07_L08_7X7:
			return 7
		WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L05_L06_5X5:
			return 5
		_:
			return 3


func _draw() -> void:
	if not _tmx_loaded:
		_last_visible_draw_count = 0
		if _hover_tile_key == "":
			_update_hover_label()
		return

	var visible_bounds: Dictionary = _compute_visible_tmx_bounds()
	if not bool(visible_bounds.get("valid", false)):
		_last_visible_draw_count = 0
		return

	if _main_map_view_mode == MAIN_MAP_VIEW_MODE_TIANXIA_YUTU:
		_last_visible_draw_count = 0
		_last_zero_level_substrate_draw_count = 0
		_last_main_world_mountain_boundary_sprite_draw_count = 0
		_last_main_world_mountain_boundary_sprite_failed_count = 0
		_last_main_world_mountain_boundary_sprite_on_screen_count = 0
		_last_main_world_chokepoint_sprite_draw_count = 0
		_last_main_world_chokepoint_sprite_failed_count = 0
		_last_main_world_chokepoint_sprite_on_screen_count = 0
		_last_world_cell_anchor_visible_count = 0
		_last_world_cell_node_draw_count = 0
		_last_world_cell_node_draw_failed_count = 0
		if _draw_tianxia_yutu_overview_layer():
			return

	var start_x: int = int(visible_bounds.get("startX", 0))
	var end_x: int = int(visible_bounds.get("endX", -1))
	var start_y: int = int(visible_bounds.get("startY", 0))
	var end_y: int = int(visible_bounds.get("endY", -1))
	var visible_width: int = max(0, end_x - start_x + 1)
	var visible_height: int = max(0, end_y - start_y + 1)
	var candidate_count: int = visible_width * visible_height
	var sampling_step: int = _resolve_sampling_step(candidate_count)
	var draw_count: int = 0
	_last_zero_level_substrate_draw_count = 0
	_last_main_world_frontline_draw_count = 0
	_last_main_world_frontline_arrow_draw_count = 0
	_last_main_world_frontline_marker_label = ""
	_last_main_world_mountain_boundary_sprite_draw_count = 0
	_last_main_world_mountain_boundary_sprite_failed_count = 0
	_last_main_world_mountain_boundary_sprite_on_screen_count = 0
	_last_main_world_chokepoint_sprite_draw_count = 0
	_last_main_world_chokepoint_sprite_failed_count = 0
	_last_main_world_chokepoint_sprite_on_screen_count = 0

	_draw_main_world_substrate_chunk_layer(visible_bounds)
	for tile_y in range(start_y, end_y + 1, sampling_step):
		for tile_x in range(start_x, end_x + 1, sampling_step):
			if draw_count >= MAX_VISIBLE_TILE_DRAW_COUNT:
				break
			_draw_tmx_cell(tile_x, tile_y)
			draw_count += 1
		if draw_count >= MAX_VISIBLE_TILE_DRAW_COUNT:
			break

	if _last_visible_candidate_count != candidate_count:
		_last_visible_candidate_count = candidate_count
	if _last_sampling_step != sampling_step:
		_last_sampling_step = sampling_step
	if _last_visible_draw_count != draw_count:
		_last_visible_draw_count = draw_count
		if _hover_tile_key == "":
			_update_hover_label()

	_reset_resource_cell_debug_overlay_frame()
	_draw_main_world_cell_layer(visible_bounds)
	_draw_resource_level_overlays(visible_bounds)
	_draw_main_map_cell_owner_overrides(visible_bounds)
	_draw_main_world_mountain_boundary_assets(visible_bounds)
	_draw_main_world_chokepoint_assets(visible_bounds)
	_draw_main_world_frontline_markers(visible_bounds)
	_draw_world_cell_nodes(visible_bounds)
	_draw_resource_cell_debug_overlay(visible_bounds)
	if not _is_main_world_substrate_chunk_renderer_active():
		_draw_home_city_overlays(visible_bounds)
	_draw_world_cell_interaction_grids()

	if _selected_tile_key != "":
		_draw_selected_tile_overlay()

	if _hover_tile_key != "":
		_draw_hover_tile_overlay()


func _draw_tianxia_yutu_overview_layer() -> bool:
	_last_tianxia_yutu_overview_draw_count = 0
	_last_tianxia_yutu_state_boundary_draw_count = 0
	_last_tianxia_yutu_frontline_draw_count = 0
	_last_tianxia_yutu_frontline_arrow_draw_count = 0
	_last_tianxia_yutu_frontline_marker_label = ""
	_last_tianxia_yutu_ai_activity_hotspot_count = 0
	_last_tianxia_yutu_ai_activity_hotspot_draw_count = 0
	_last_tianxia_yutu_ai_activity_hotspot_label_draw_count = 0
	_last_tianxia_yutu_ai_activity_hotspot_max_cluster_count = 0
	_last_tianxia_yutu_ai_activity_hotspot_first_label = ""
	_last_tianxia_yutu_ai_activity_first_trace_id = ""
	_last_tianxia_yutu_ai_activity_uses_execution_trace = false
	_last_tianxia_yutu_ai_activity_fallback_used = false
	_last_tianxia_yutu_ai_activity_hotspot_visual_asset_loaded = _tianxia_yutu_ai_activity_hotspot_texture != null
	_last_tianxia_yutu_ai_activity_hotspot_visual_asset_draw_count = 0
	_last_tianxia_yutu_ai_activity_hotspot_halo_draw_count = 0
	_last_tianxia_yutu_ai_activity_hotspot_info_asset_loaded = _tianxia_yutu_ai_activity_hotspot_label_plate_texture != null and _tianxia_yutu_ai_activity_hotspot_cluster_badge_texture != null
	_last_tianxia_yutu_ai_activity_hotspot_label_plate_asset_draw_count = 0
	_last_tianxia_yutu_ai_activity_hotspot_cluster_badge_asset_draw_count = 0
	_last_tianxia_yutu_ai_activity_route_intent_asset_loaded = _tianxia_yutu_ai_activity_route_arrow_texture != null
	_last_tianxia_yutu_ai_activity_route_intent_source_target_count = 0
	_last_tianxia_yutu_ai_activity_route_intent_line_draw_count = 0
	_last_tianxia_yutu_ai_activity_route_intent_arrow_asset_draw_count = 0
	_last_tianxia_yutu_ai_activity_route_intent_endpoint_anchor_draw_count = 0
	_last_tianxia_yutu_ai_activity_route_heading_applied_count = 0
	_last_tianxia_yutu_ai_activity_route_first_heading_radians = 0.0
	_last_tianxia_yutu_ai_activity_route_state_variant_asset_loaded = _tianxia_yutu_ai_activity_route_arrow_texture != null and _tianxia_yutu_ai_activity_route_queued_arrow_texture != null
	_last_tianxia_yutu_ai_activity_route_active_variant_draw_count = 0
	_last_tianxia_yutu_ai_activity_route_queued_variant_draw_count = 0
	_last_tianxia_yutu_ai_activity_route_first_state_variant = ""
	_last_tianxia_yutu_state_label_draw_count = 0
	_last_tianxia_yutu_region_label_draw_count = 0
	_last_tianxia_yutu_city_gate_marker_draw_count = 0
	_last_tianxia_yutu_label_collision_skip_count = 0
	_last_tianxia_yutu_label_panel_avoidance_skip_count = 0
	_last_tianxia_yutu_duplicate_label_suppression_count = 0
	_last_tianxia_yutu_label_priority_draw_counts = {}
	_last_tianxia_yutu_label_priority_skip_counts = {}
	_last_tianxia_yutu_label_priority_draw_order = []
	_last_tianxia_yutu_marker_scope_draw_counts = {}
	_last_tianxia_yutu_marker_label_draw_counts = {}
	_last_tianxia_yutu_city_label_budget_skip_count = 0
	_last_tianxia_yutu_gate_label_budget_skip_count = 0
	_last_tianxia_yutu_gate_hover_label_force_count = 0
	_last_tianxia_yutu_gate_detail_callout_draw_count = 0
	_last_tianxia_yutu_gate_boundary_label_offset_count = 0
	_last_tianxia_yutu_focus_label_dense_suppression_count = 0
	_last_tianxia_yutu_context_gate_focus_draw_count = 0
	_last_tianxia_yutu_out_of_region_gate_dim_draw_count = 0
	_last_tianxia_yutu_compact_target_marker_focus_draw_count = 0
	_last_tianxia_yutu_compact_target_marker_dim_draw_count = 0
	_last_tianxia_yutu_compact_target_label_suppression_count = 0
	_last_tianxia_yutu_compact_target_candidate_focus_count = 0
	_last_tianxia_yutu_compact_admin_label_suppression_count = 0
	_last_tianxia_yutu_normal_dense_admin_label_suppression_count = 0
	_last_tianxia_yutu_low_emphasis_marker_draw_count = 0
	_last_tianxia_yutu_out_of_region_gate_micro_draw_count = 0
	_last_tianxia_yutu_ordinary_city_micro_draw_count = 0
	_last_tianxia_yutu_marker_visual_weight_estimate = 0.0
	_tianxia_yutu_label_occupied_rects.clear()
	_tianxia_yutu_drawn_label_texts.clear()
	_last_tianxia_yutu_state_focus_shape_draw_count = 0
	_last_tianxia_yutu_region_focus_boundary_draw_count = 0
	_last_tianxia_yutu_admin_focus_asset_mask_draw_count = 0
	_last_tianxia_yutu_admin_focus_mask_missing_count = 0
	_last_tianxia_yutu_admin_focus_mask_load_failed_count = 0
	_last_tianxia_yutu_admin_focus_runtime_hull_blocked_count = 0
	_last_tianxia_yutu_density_level = _resolve_tianxia_yutu_density_level()
	var viewport_size: Vector2 = get_viewport_rect().size
	if viewport_size.x <= 0.0 or viewport_size.y <= 0.0:
		return false
	draw_rect(Rect2(Vector2.ZERO, viewport_size), Color(0.025, 0.035, 0.04, 1.0), true)
	if _tianxia_yutu_overview_texture == null:
		return true
	var texture_size: Vector2 = _tianxia_yutu_overview_texture.get_size()
	if texture_size.x <= 0.0 or texture_size.y <= 0.0:
		return true
	var draw_rect: Rect2 = _resolve_tianxia_yutu_draw_rect_for_zoom(_tianxia_yutu_zoom, true)
	_tianxia_yutu_last_draw_rect = draw_rect
	var draw_pos: Vector2 = draw_rect.position
	var draw_size: Vector2 = draw_rect.size
	draw_texture_rect(_tianxia_yutu_overview_texture, Rect2(draw_pos, draw_size), false, Color(1.0, 1.0, 1.0, 1.0))
	_last_tianxia_yutu_overview_draw_count = 1
	if _tianxia_yutu_selected_state_id() != "":
		draw_rect(Rect2(Vector2.ZERO, viewport_size), Color(0.02, 0.025, 0.022, 0.22), true)
	_draw_tianxia_yutu_administrative_drilldown_overlays(draw_pos, draw_size)
	_draw_tianxia_yutu_frontline_markers(draw_pos, draw_size)
	_draw_tianxia_yutu_living_world_hotspots(draw_pos, draw_size)
	_draw_tianxia_yutu_focus_marker(draw_pos, draw_size)
	return true


func _draw_tianxia_yutu_focus_marker(draw_pos: Vector2, draw_size: Vector2) -> void:
	if _tianxia_yutu_focus_marker_cell.x < 0 or _tianxia_yutu_focus_marker_cell.y < 0:
		return
	var marker_pos := _tianxia_yutu_world_cell_to_screen(_tianxia_yutu_focus_marker_cell.x, _tianxia_yutu_focus_marker_cell.y, Rect2(draw_pos, draw_size))
	var selection_entry: Dictionary = _world_map_event_selection_entry("selected")
	var halo_color := _world_map_color_from_variant(selection_entry.get("haloColor", "#FFE884E6"), Color8(255, 232, 132, 230))
	var ring_width: float = maxf(float(selection_entry.get("ringWidthPx", 2.5)), WORLD_MAP_SELECTION_HALO_MIN_WIDTH)
	var ring_radius: float = max(
		clampf(11.0 * sqrt(_tianxia_yutu_zoom), WORLD_MAP_SELECTION_HALO_MIN_RADIUS, 24.0),
		float(selection_entry.get("radiusPx", 34)) * WORLD_MAP_SELECTION_HALO_RADIUS_SCALE
	)
	draw_circle(marker_pos, ring_radius + 3.0, Color(halo_color.r * 0.06, halo_color.g * 0.06, halo_color.b * 0.06, 0.32))
	draw_arc(marker_pos, ring_radius, 0.0, TAU, 40, halo_color, ring_width, true)
	draw_arc(
		marker_pos,
		ring_radius + 4.0,
		-0.42,
		0.42,
		12,
		Color(halo_color.r, halo_color.g, halo_color.b, 0.77),
		maxf(ring_width * 0.40, 1.8),
		true
	)
	draw_arc(
		marker_pos,
		ring_radius + 4.0,
		PI - 0.42,
		PI + 0.42,
		12,
		Color(halo_color.r, halo_color.g, halo_color.b, 0.77),
		maxf(ring_width * 0.40, 1.8),
		true
	)
	draw_line(marker_pos + Vector2(-ring_radius - 5.0, 0.0), marker_pos + Vector2(-4.0, 0.0), halo_color, ring_width * 0.35, true)
	draw_line(marker_pos + Vector2(4.0, 0.0), marker_pos + Vector2(ring_radius + 5.0, 0.0), halo_color, ring_width * 0.35, true)
	draw_line(marker_pos + Vector2(0.0, -ring_radius - 5.0), marker_pos + Vector2(0.0, -4.0), halo_color, ring_width * 0.35, true)
	draw_line(marker_pos + Vector2(0.0, 4.0), marker_pos + Vector2(0.0, ring_radius + 5.0), halo_color, ring_width * 0.35, true)
	var font := ThemeDB.fallback_font
	if font != null and _should_draw_tianxia_yutu_focus_marker_label():
		var font_size := 15
		var candidates := _build_tianxia_yutu_label_candidates(marker_pos, _tianxia_yutu_focus_marker_label, font_size, ring_radius + 12.0, ring_radius + 6.0)
		var label_slot: Dictionary = _reserve_tianxia_yutu_label_slot(_tianxia_yutu_focus_marker_label, font_size, candidates, "focus")
		if bool(label_slot.get("ok", false)):
			var label_pos: Vector2 = label_slot.get("position", marker_pos) as Vector2
			draw_string(font, label_pos + Vector2(1.0, 1.0), _tianxia_yutu_focus_marker_label, HORIZONTAL_ALIGNMENT_LEFT, -1.0, font_size, Color(0.02, 0.015, 0.01, 0.80))
			draw_string(font, label_pos, _tianxia_yutu_focus_marker_label, HORIZONTAL_ALIGNMENT_LEFT, -1.0, font_size, Color8(255, 242, 183, 245))
			_record_tianxia_yutu_label_priority_draw("focus")


func _should_draw_tianxia_yutu_focus_marker_label() -> bool:
	var label: String = _tianxia_yutu_focus_marker_label.strip_edges()
	if label == "":
		return false
	if label == _tianxia_yutu_selected_region_label():
		_last_tianxia_yutu_duplicate_label_suppression_count += 1
		return false
	if _last_tianxia_yutu_density_level == "near" and _tianxia_yutu_selected_region_id() != "":
		_last_tianxia_yutu_focus_label_dense_suppression_count += 1
		_record_tianxia_yutu_label_priority_skip("focus")
		return false
	return true


func _tianxia_yutu_selected_region_label() -> String:
	var context_label: String = str(_tianxia_yutu_drilldown_context.get("selectedRegionLabel", "")).strip_edges()
	if context_label != "":
		return context_label
	var selected_region_id: String = _tianxia_yutu_selected_region_id()
	if selected_region_id == "":
		return ""
	var administrative_layer: Dictionary = _tianxia_yutu_overview_layer.get("administrative_ownership_layer", {}) as Dictionary if _tianxia_yutu_overview_layer.get("administrative_ownership_layer", {}) is Dictionary else {}
	var raw_regions: Variant = administrative_layer.get("regions", [])
	if not (raw_regions is Array):
		return ""
	for region_variant in raw_regions as Array:
		if not (region_variant is Dictionary):
			continue
		var region: Dictionary = region_variant as Dictionary
		if str(region.get("region_id", "")).strip_edges() == selected_region_id:
			return str(region.get("region_label", "")).strip_edges()
	return ""


func _resolve_tianxia_yutu_draw_rect_for_zoom(target_zoom: float, include_pan: bool) -> Rect2:
	var viewport_size: Vector2 = get_viewport_rect().size
	if viewport_size.x <= 0.0 or viewport_size.y <= 0.0 or _tianxia_yutu_overview_texture == null:
		return Rect2()
	var texture_size: Vector2 = _tianxia_yutu_overview_texture.get_size()
	if texture_size.x <= 0.0 or texture_size.y <= 0.0:
		return Rect2()
	var fit_scale: float = maxf(viewport_size.x / texture_size.x, viewport_size.y / texture_size.y)
	var draw_size: Vector2 = texture_size * fit_scale * clampf(target_zoom, 0.82, 6.0)
	var draw_pos: Vector2 = (viewport_size - draw_size) * 0.5
	if include_pan:
		draw_pos += _tianxia_yutu_pan_offset
	return Rect2(draw_pos, draw_size)


func _tianxia_yutu_world_cell_to_screen(cell_x: int, cell_y: int, draw_rect: Rect2) -> Vector2:
	var x_ratio: float = clampf(float(cell_x) / float(MAIN_MAP_WORLD_WIDTH_CELLS), 0.0, 1.0)
	var y_ratio: float = clampf(float(cell_y) / float(MAIN_MAP_WORLD_HEIGHT_CELLS), 0.0, 1.0)
	return draw_rect.position + Vector2(draw_rect.size.x * x_ratio, draw_rect.size.y * y_ratio)


func _resolve_tianxia_yutu_density_level() -> String:
	if _tianxia_yutu_zoom < 1.55:
		return "state"
	if _tianxia_yutu_zoom < 2.8:
		return "region"
	if _tianxia_yutu_zoom < 4.25:
		return "city_gate"
	return "near"


func _tianxia_yutu_selected_state_id() -> String:
	return str(_tianxia_yutu_drilldown_context.get("selectedStateId", "")).strip_edges()


func _tianxia_yutu_selected_region_id() -> String:
	return str(_tianxia_yutu_drilldown_context.get("selectedRegionId", "")).strip_edges()


func _tianxia_yutu_compact_target_active() -> bool:
	return bool(_tianxia_yutu_drilldown_context.get("compactTargetActive", false))


func _tianxia_yutu_compact_target_scope() -> String:
	return str(_tianxia_yutu_drilldown_context.get("compactTargetScope", "")).strip_edges()


func _tianxia_yutu_compact_target_context_summary() -> Dictionary:
	return {
		"active": _tianxia_yutu_compact_target_active(),
		"scope": _tianxia_yutu_compact_target_scope(),
		"id": str(_tianxia_yutu_drilldown_context.get("compactTargetId", "")).strip_edges(),
		"label": str(_tianxia_yutu_drilldown_context.get("compactTargetLabel", "")).strip_edges(),
		"cellX": int(_tianxia_yutu_drilldown_context.get("compactTargetCellX", -1)),
		"cellY": int(_tianxia_yutu_drilldown_context.get("compactTargetCellY", -1)),
	}


func _tianxia_yutu_city_marker_target_id(marker: Dictionary) -> String:
	var cell: Dictionary = marker.get("cell_1km", {}) as Dictionary if marker.get("cell_1km", {}) is Dictionary else {}
	return "city_marker_%s_%s_%d_%d" % [
		str(marker.get("state_id", "")).strip_edges(),
		str(marker.get("region_id", "")).strip_edges(),
		int(cell.get("x", -1)),
		int(cell.get("y", -1)),
	]


func _tianxia_yutu_target_matches_compact_focus(target: Dictionary, scope: String) -> bool:
	if not _tianxia_yutu_compact_target_active():
		return false
	if _is_tianxia_yutu_target_hovered_or_selected(target, scope):
		return true
	var compact_scope: String = _tianxia_yutu_compact_target_scope()
	if compact_scope == "" or compact_scope != scope:
		return false
	var compact_id: String = str(_tianxia_yutu_drilldown_context.get("compactTargetId", "")).strip_edges()
	var target_id: String = _tianxia_yutu_target_identity(target)
	if compact_id != "" and target_id == compact_id:
		return true
	var cell: Dictionary = target.get("cell_1km", {}) as Dictionary if target.get("cell_1km", {}) is Dictionary else {}
	if cell.is_empty():
		return false
	var compact_x: int = int(_tianxia_yutu_drilldown_context.get("compactTargetCellX", -1))
	var compact_y: int = int(_tianxia_yutu_drilldown_context.get("compactTargetCellY", -1))
	if compact_x != int(cell.get("x", -2)) or compact_y != int(cell.get("y", -2)):
		return false
	var compact_label: String = str(_tianxia_yutu_drilldown_context.get("compactTargetLabel", "")).strip_edges()
	if compact_label == "":
		return true
	var target_label: String = str(target.get("navigation_label", target.get("label", ""))).strip_edges()
	return target_label == compact_label or str(target.get("label", "")).strip_edges() == compact_label


func _tianxia_yutu_target_should_dim_for_compact_focus(target: Dictionary, scope: String) -> bool:
	return _tianxia_yutu_compact_target_active() and not _tianxia_yutu_target_matches_compact_focus(target, scope)


func _tianxia_yutu_normal_dense_region_focus_active(selected_state_id: String, selected_region_id: String, density_level: String) -> bool:
	return TianxiaYutuMarkerVisualPolicyScript.normal_dense_region_focus_active(
		_tianxia_yutu_compact_target_active(),
		selected_state_id,
		selected_region_id,
		density_level
	)


func _tianxia_yutu_gate_label_limit_for_context(density_level: String, selected_state_id: String, selected_region_id: String) -> int:
	return TianxiaYutuMarkerVisualPolicyScript.gate_label_limit_for_context(
		_tianxia_yutu_compact_target_active(),
		selected_state_id,
		selected_region_id,
		density_level
	)


func _tianxia_yutu_city_label_limit_for_context(selected_state_id: String, selected_region_id: String) -> int:
	var normal_dense_region_focus := _tianxia_yutu_normal_dense_region_focus_active(
		selected_state_id,
		selected_region_id,
		_last_tianxia_yutu_density_level
	)
	return TianxiaYutuMarkerVisualPolicyScript.city_label_limit_for_context(
		_tianxia_yutu_compact_target_active(),
		normal_dense_region_focus,
		selected_region_id,
		_last_tianxia_yutu_density_level
	)


func _draw_tianxia_yutu_administrative_drilldown_overlays(draw_pos: Vector2, draw_size: Vector2) -> void:
	var administrative_layer: Dictionary = _tianxia_yutu_overview_layer.get("administrative_ownership_layer", {}) as Dictionary if _tianxia_yutu_overview_layer.get("administrative_ownership_layer", {}) is Dictionary else {}
	if administrative_layer.is_empty():
		return
	var draw_rect := Rect2(draw_pos, draw_size)
	var selected_state_id: String = _tianxia_yutu_selected_state_id()
	var selected_region_id: String = _tianxia_yutu_selected_region_id()
	var density_level: String = _last_tianxia_yutu_density_level
	var compact_target_active := _tianxia_yutu_compact_target_active()
	var normal_dense_region_focus := _tianxia_yutu_normal_dense_region_focus_active(selected_state_id, selected_region_id, density_level)
	_draw_tianxia_yutu_focus_shapes(administrative_layer, draw_rect, selected_state_id, selected_region_id)
	var raw_states: Variant = administrative_layer.get("states", [])
	if raw_states is Array:
		if compact_target_active:
			_last_tianxia_yutu_compact_admin_label_suppression_count += (raw_states as Array).size()
		else:
			for state_variant in raw_states as Array:
				if not (state_variant is Dictionary):
					continue
				var state: Dictionary = state_variant as Dictionary
				var state_id: String = str(state.get("state_id", "")).strip_edges()
				var is_selected_state: bool = selected_state_id != "" and state_id == selected_state_id
				if selected_state_id != "" and not is_selected_state and density_level != "state":
					continue
				if normal_dense_region_focus:
					_last_tianxia_yutu_normal_dense_admin_label_suppression_count += 1
					_record_tianxia_yutu_label_priority_skip("state")
					continue
				_draw_tianxia_yutu_administrative_label(state, draw_rect, "state", is_selected_state)
	var should_draw_regions: bool = selected_state_id != "" or density_level == "region" or density_level == "city_gate" or density_level == "near"
	if should_draw_regions and not compact_target_active:
		_draw_tianxia_yutu_region_labels(administrative_layer, draw_rect, selected_state_id, selected_region_id)
	elif should_draw_regions and compact_target_active:
		var raw_regions: Variant = administrative_layer.get("regions", [])
		if raw_regions is Array:
			_last_tianxia_yutu_compact_admin_label_suppression_count += (raw_regions as Array).size()
	if density_level == "city_gate" or density_level == "near" or selected_region_id != "":
		_draw_tianxia_yutu_city_gate_markers(draw_rect, selected_state_id, selected_region_id, density_level)
	if density_level == "near" or selected_region_id != "":
		_draw_tianxia_yutu_ordinary_city_markers(draw_rect, selected_state_id, selected_region_id)


func _draw_tianxia_yutu_focus_shapes(administrative_layer: Dictionary, draw_rect: Rect2, selected_state_id: String, selected_region_id: String) -> void:
	if selected_state_id == "":
		return
	var state_mask_result := _draw_tianxia_yutu_admin_focus_asset_mask(draw_rect, "state", selected_state_id, "")
	if bool(state_mask_result.get("drawn", false)):
		_last_tianxia_yutu_state_focus_shape_draw_count += 1
	elif bool(state_mask_result.get("hardRequired", false)):
		_last_tianxia_yutu_admin_focus_runtime_hull_blocked_count += 1
	else:
		_draw_tianxia_yutu_focus_hull_shape(administrative_layer, draw_rect, selected_state_id, "", true)
	if selected_region_id == "":
		return
	var region_mask_result := _draw_tianxia_yutu_admin_focus_asset_mask(draw_rect, "region", selected_state_id, selected_region_id)
	if bool(region_mask_result.get("drawn", false)):
		_last_tianxia_yutu_region_focus_boundary_draw_count += 1
	elif bool(region_mask_result.get("hardRequired", false)):
		_last_tianxia_yutu_admin_focus_runtime_hull_blocked_count += 1
	else:
		_draw_tianxia_yutu_focus_hull_shape(administrative_layer, draw_rect, selected_state_id, selected_region_id, false)


func _draw_tianxia_yutu_focus_hull_shape(administrative_layer: Dictionary, draw_rect: Rect2, selected_state_id: String, selected_region_id: String, is_state: bool) -> void:
	var state_points: PackedVector2Array = _build_tianxia_yutu_focus_hull(administrative_layer, selected_state_id, "")
	if not is_state:
		state_points = _build_tianxia_yutu_focus_hull(administrative_layer, selected_state_id, selected_region_id)
	if state_points.size() < 3:
		return
	var screen_points := PackedVector2Array()
	for point in state_points:
		screen_points.append(_tianxia_yutu_world_cell_to_screen(int(point.x), int(point.y), draw_rect))
	var zoom_tier: String = _world_map_zoom_semantic_tier()
	if is_state:
		var palette_entry: Dictionary = _world_map_region_palette_entry("ally")
		var border_entry: Dictionary = _world_map_overlay_family_entry("region_border_line")
		var fill_color := _world_map_color_from_variant(palette_entry.get("fill", "#F2BA4728"), Color(0.95, 0.73, 0.28, 0.16))
		var border_color := _world_map_color_from_variant(palette_entry.get("emphasis", "#FFD462D1"), Color(1.0, 0.82, 0.38, 0.82))
		var border_width: float = _world_map_width_px_from_entry(border_entry, zoom_tier, 3.5)
		draw_colored_polygon(screen_points, fill_color)
		draw_polyline(screen_points, border_color, border_width, true)
		draw_line(screen_points[screen_points.size() - 1], screen_points[0], border_color, border_width, true)
		_last_tianxia_yutu_state_focus_shape_draw_count += 1
	else:
		var palette_entry: Dictionary = _world_map_region_palette_entry("friendly")
		var border_entry: Dictionary = _world_map_overlay_family_entry("contested_border_line")
		var fill_color := _world_map_color_from_variant(palette_entry.get("fill", "#56D5EB1F"), Color(0.33, 0.86, 0.92, 0.12))
		var border_color := _world_map_color_from_variant(palette_entry.get("border", "#70ECFFE8"), Color(0.44, 0.93, 1.0, 0.92))
		var border_width: float = _world_map_width_px_from_entry(border_entry, zoom_tier, 3.0)
		draw_colored_polygon(screen_points, fill_color)
		draw_polyline(screen_points, border_color, border_width, true)
		draw_line(screen_points[screen_points.size() - 1], screen_points[0], border_color, border_width, true)
		_last_tianxia_yutu_region_focus_boundary_draw_count += 1


func _is_tianxia_yutu_admin_focus_mask_hard_required() -> bool:
	var layer_variant: Variant = _tianxia_yutu_overview_layer.get("admin_focus_mask_layer", {})
	if not (layer_variant is Dictionary):
		return false
	var layer: Dictionary = layer_variant as Dictionary
	var status: String = str(layer.get("status", "")).strip_edges()
	var manifest_status: String = str(layer.get("manifest_status", "")).strip_edges()
	return status == "admin_focus_masks_ready_full" or manifest_status == "admin_focus_masks_ready_full"


func _draw_tianxia_yutu_admin_focus_asset_mask(draw_rect: Rect2, scope: String, selected_state_id: String, selected_region_id: String) -> Dictionary:
	var hard_required := _is_tianxia_yutu_admin_focus_mask_hard_required()
	var mask_entry := _resolve_tianxia_yutu_admin_focus_mask(scope, selected_state_id, selected_region_id)
	if mask_entry.is_empty():
		if hard_required:
			_last_tianxia_yutu_admin_focus_mask_missing_count += 1
		return {"drawn": false, "hardRequired": hard_required, "reason": "mask_missing"}
	var path: String = str(mask_entry.get("path", "")).strip_edges()
	if path == "":
		if hard_required:
			_last_tianxia_yutu_admin_focus_mask_missing_count += 1
		return {"drawn": false, "hardRequired": hard_required, "reason": "mask_path_missing"}
	var texture: Texture2D = _tianxia_yutu_admin_focus_mask_texture_cache.get(path, null)
	if texture == null:
		texture = _load_repo_or_res_texture(path)
		if texture != null:
			_tianxia_yutu_admin_focus_mask_texture_cache[path] = texture
	if texture == null:
		if hard_required:
			_last_tianxia_yutu_admin_focus_mask_load_failed_count += 1
		return {"drawn": false, "hardRequired": hard_required, "reason": "mask_texture_load_failed", "path": path}
	var target_rect := draw_rect
	var bounds_variant: Variant = mask_entry.get("bounds_px", {})
	if bounds_variant is Dictionary:
		var bounds: Dictionary = bounds_variant as Dictionary
		var focus_layer_variant: Variant = _tianxia_yutu_overview_layer.get("admin_focus_mask_layer", {})
		var base_size: Array = []
		if focus_layer_variant is Dictionary:
			var focus_layer: Dictionary = focus_layer_variant as Dictionary
			var base_size_variant: Variant = focus_layer.get("base_size_px", [])
			if base_size_variant is Array:
				base_size = base_size_variant as Array
		if base_size.size() >= 2:
			var base_w := float(base_size[0])
			var base_h := float(base_size[1])
			var bounds_x := float(bounds.get("x", 0.0))
			var bounds_y := float(bounds.get("y", 0.0))
			var bounds_w := float(bounds.get("w", base_w))
			var bounds_h := float(bounds.get("h", base_h))
			if base_w > 0.0 and base_h > 0.0 and bounds_w > 0.0 and bounds_h > 0.0:
				target_rect = Rect2(
					draw_rect.position + Vector2(bounds_x / base_w * draw_rect.size.x, bounds_y / base_h * draw_rect.size.y),
					Vector2(bounds_w / base_w * draw_rect.size.x, bounds_h / base_h * draw_rect.size.y)
				)
	draw_texture_rect(texture, target_rect, false, Color(1.0, 1.0, 1.0, 1.0))
	_last_tianxia_yutu_admin_focus_asset_mask_draw_count += 1
	return {"drawn": true, "hardRequired": hard_required, "reason": "mask_drawn", "path": path}


func _resolve_tianxia_yutu_admin_focus_mask(scope: String, selected_state_id: String, selected_region_id: String) -> Dictionary:
	var layer: Dictionary = _tianxia_yutu_overview_layer.get("admin_focus_mask_layer", {}) as Dictionary if _tianxia_yutu_overview_layer.get("admin_focus_mask_layer", {}) is Dictionary else {}
	var masks: Variant = layer.get("masks", [])
	if not (masks is Array):
		return {}
	for mask_variant in masks as Array:
		if not (mask_variant is Dictionary):
			continue
		var mask: Dictionary = mask_variant as Dictionary
		if str(mask.get("scope", "")).strip_edges() != scope:
			continue
		if str(mask.get("state_id", "")).strip_edges() != selected_state_id:
			continue
		if scope == "region" and str(mask.get("region_id", "")).strip_edges() != selected_region_id:
			continue
		return mask
	return {}


func inject_tianxia_yutu_admin_focus_mask_fault(scope: String, selected_state_id: String, selected_region_id: String, fault_path: String) -> Dictionary:
	var layer_variant: Variant = _tianxia_yutu_overview_layer.get("admin_focus_mask_layer", {})
	if not (layer_variant is Dictionary):
		return {"ok": false, "reason": "admin_focus_mask_layer_missing"}
	var layer: Dictionary = (layer_variant as Dictionary).duplicate(true)
	var masks_variant: Variant = layer.get("masks", [])
	if not (masks_variant is Array):
		return {"ok": false, "reason": "admin_focus_mask_list_missing"}
	var masks: Array = masks_variant as Array
	for mask_index in range(masks.size()):
		var mask_variant: Variant = masks[mask_index]
		if not (mask_variant is Dictionary):
			continue
		var mask: Dictionary = (mask_variant as Dictionary).duplicate(true)
		if str(mask.get("scope", "")).strip_edges() != scope:
			continue
		if str(mask.get("state_id", "")).strip_edges() != selected_state_id:
			continue
		if scope == "region" and str(mask.get("region_id", "")).strip_edges() != selected_region_id:
			continue
		var previous_path: String = str(mask.get("path", "")).strip_edges()
		mask["path"] = fault_path
		masks[mask_index] = mask
		layer["masks"] = masks
		_tianxia_yutu_overview_layer["admin_focus_mask_layer"] = layer
		_tianxia_yutu_admin_focus_mask_texture_cache.clear()
		queue_redraw()
		return {
			"ok": true,
			"reason": "admin_focus_mask_fault_injected",
			"scope": scope,
			"stateId": selected_state_id,
			"regionId": selected_region_id,
			"previousPath": previous_path,
			"faultPath": fault_path,
		}
	return {
		"ok": false,
		"reason": "admin_focus_mask_entry_not_found",
		"scope": scope,
		"stateId": selected_state_id,
		"regionId": selected_region_id,
	}


func _build_tianxia_yutu_focus_hull(administrative_layer: Dictionary, selected_state_id: String, selected_region_id: String) -> PackedVector2Array:
	var source_points: Array[Vector2] = []
	var regions: Variant = administrative_layer.get("regions", [])
	if regions is Array:
		for region_variant in regions as Array:
			if not (region_variant is Dictionary):
				continue
			var region: Dictionary = region_variant as Dictionary
			if str(region.get("state_id", "")).strip_edges() != selected_state_id:
				continue
			if selected_region_id != "" and str(region.get("region_id", "")).strip_edges() != selected_region_id:
				continue
			_append_tianxia_yutu_cell_point(source_points, region.get("centroid_base_8k", {}))
	if selected_region_id == "" and source_points.size() >= 3:
		return _convex_hull_tianxia_yutu_points(_pad_tianxia_yutu_hull_points(source_points, false))
	var city_markers: Variant = _tianxia_yutu_overview_layer.get("city_markers", [])
	if city_markers is Array:
		for marker_variant in city_markers as Array:
			if not (marker_variant is Dictionary):
				continue
			var marker: Dictionary = marker_variant as Dictionary
			if str(marker.get("state_id", "")).strip_edges() != selected_state_id:
				continue
			if selected_region_id != "" and str(marker.get("region_id", "")).strip_edges() != selected_region_id:
				continue
			_append_tianxia_yutu_cell_point(source_points, marker.get("cell_1km", {}))
	if selected_region_id == "" and source_points.size() >= 3:
		return _convex_hull_tianxia_yutu_points(_pad_tianxia_yutu_hull_points(source_points, false))
	var jump_targets: Variant = _tianxia_yutu_overview_layer.get("jump_targets", [])
	if jump_targets is Array:
		for target_variant in jump_targets as Array:
			if not (target_variant is Dictionary):
				continue
			var target: Dictionary = target_variant as Dictionary
			if not _tianxia_yutu_target_matches_state(target, selected_state_id):
				continue
			if selected_region_id != "":
				var target_region_id: String = str(target.get("region_id", "")).strip_edges()
				var target_from_region_id: String = str(target.get("from_region_id", "")).strip_edges()
				var target_to_region_id: String = str(target.get("to_region_id", "")).strip_edges()
				if target_region_id != selected_region_id and target_from_region_id != selected_region_id and target_to_region_id != selected_region_id:
					continue
			_append_tianxia_yutu_cell_point(source_points, target.get("cell_1km", {}))
	if source_points.is_empty():
		return PackedVector2Array()
	return _convex_hull_tianxia_yutu_points(_pad_tianxia_yutu_hull_points(source_points, selected_region_id != ""))


func _append_tianxia_yutu_cell_point(points: Array[Vector2], raw_cell: Variant) -> void:
	if not (raw_cell is Dictionary):
		return
	var cell: Dictionary = raw_cell as Dictionary
	var x := float(cell.get("x", NAN))
	var y := float(cell.get("y", NAN))
	if not is_finite(x) or not is_finite(y):
		return
	points.append(Vector2(x, y))


func _pad_tianxia_yutu_hull_points(points: Array[Vector2], is_region: bool) -> Array[Vector2]:
	var padded: Array[Vector2] = []
	var pad := 24.0 if is_region else 48.0
	for point in points:
		padded.append(point + Vector2(-pad, -pad))
		padded.append(point + Vector2(pad, -pad))
		padded.append(point + Vector2(pad, pad))
		padded.append(point + Vector2(-pad, pad))
	return padded


func _convex_hull_tianxia_yutu_points(points: Array[Vector2]) -> PackedVector2Array:
	var sorted_points := _sort_tianxia_yutu_points(points)
	if sorted_points.size() < 3:
		return PackedVector2Array()
	var lower: Array[Vector2] = []
	for point in sorted_points:
		while lower.size() >= 2 and _tianxia_yutu_cross(lower[lower.size() - 2], lower[lower.size() - 1], point) <= 0.0:
			lower.pop_back()
		lower.append(point)
	var upper: Array[Vector2] = []
	for index in range(sorted_points.size() - 1, -1, -1):
		var point: Vector2 = sorted_points[index]
		while upper.size() >= 2 and _tianxia_yutu_cross(upper[upper.size() - 2], upper[upper.size() - 1], point) <= 0.0:
			upper.pop_back()
		upper.append(point)
	lower.pop_back()
	upper.pop_back()
	var hull := PackedVector2Array()
	for point in lower:
		hull.append(point)
	for point in upper:
		hull.append(point)
	return hull


func _sort_tianxia_yutu_points(points: Array[Vector2]) -> Array[Vector2]:
	var sorted_points: Array[Vector2] = []
	for point in points:
		var inserted := false
		for index in range(sorted_points.size()):
			var current: Vector2 = sorted_points[index]
			if point.x < current.x or (is_equal_approx(point.x, current.x) and point.y < current.y):
				sorted_points.insert(index, point)
				inserted = true
				break
		if not inserted:
			sorted_points.append(point)
	return sorted_points


func _tianxia_yutu_cross(origin: Vector2, a: Vector2, b: Vector2) -> float:
	return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x)


func _draw_tianxia_yutu_region_labels(administrative_layer: Dictionary, draw_rect: Rect2, selected_state_id: String, selected_region_id: String) -> void:
	var raw_regions: Variant = administrative_layer.get("regions", [])
	if not (raw_regions is Array):
		return
	var draw_limit: int = 36 if selected_state_id == "" else 80
	var selected_regions: Array = []
	var other_regions: Array = []
	for region_variant in raw_regions as Array:
		if not (region_variant is Dictionary):
			continue
		var region: Dictionary = region_variant as Dictionary
		var region_state_id: String = str(region.get("state_id", "")).strip_edges()
		if selected_state_id != "" and region_state_id != selected_state_id:
			continue
		var region_id: String = str(region.get("region_id", "")).strip_edges()
		var is_selected_region: bool = selected_region_id != "" and region_id == selected_region_id
		if is_selected_region:
			selected_regions.append(region)
		else:
			other_regions.append(region)
	var regions_to_draw: Array = selected_regions if selected_region_id != "" else selected_regions + other_regions
	for region_variant in regions_to_draw:
		if _last_tianxia_yutu_region_label_draw_count >= draw_limit:
			return
		if not (region_variant is Dictionary):
			continue
		var draw_region: Dictionary = region_variant as Dictionary
		var draw_region_id: String = str(draw_region.get("region_id", "")).strip_edges()
		var draw_selected_region: bool = selected_region_id != "" and draw_region_id == selected_region_id
		_draw_tianxia_yutu_administrative_label(draw_region, draw_rect, "region", draw_selected_region)


func _draw_tianxia_yutu_administrative_label(entry: Dictionary, draw_rect: Rect2, level: String, selected: bool) -> void:
	var centroid: Dictionary = entry.get("centroid_base_8k", {}) as Dictionary if entry.get("centroid_base_8k", {}) is Dictionary else {}
	if centroid.is_empty():
		return
	var point := _tianxia_yutu_world_cell_to_screen(int(centroid.get("x", 0)), int(centroid.get("y", 0)), draw_rect)
	if point.x < -80.0 or point.y < -40.0 or point.x > get_viewport_rect().size.x + 80.0 or point.y > get_viewport_rect().size.y + 40.0:
		return
	var font := ThemeDB.fallback_font
	if font == null:
		return
	var label_key := "state_label" if level == "state" else "region_label"
	var fallback_key := "state_id" if level == "state" else "region_id"
	var label: String = str(entry.get(label_key, entry.get(fallback_key, ""))).strip_edges()
	if _is_tianxia_yutu_placeholder_admin_label(label):
		return
	if label == "":
		return
	var font_size: int = 20 if level == "state" else 15
	var radius: float = 8.0 if level == "state" else 5.0
	var label_family: Dictionary = _world_map_label_family_entry("region_title" if level == "state" else "county_title")
	var font_scale: float = maxf(0.75, float(label_family.get("fontScale", 1.0)))
	var scaled_font_size: int = int(round(font_size * font_scale))
	var fill_color := _world_map_color_from_variant(
		label_family.get("textColor", "#F6CF70F5" if level == "state" else "#A6E1BEE1"),
		Color8(246, 207, 112, 245) if level == "state" else Color8(166, 225, 190, 225)
	)
	var text_color := _world_map_color_from_variant(
		label_family.get("textColor", "#FFF2C6F5" if level == "state" else "#D6F5DEE6"),
		Color8(255, 242, 198, 245) if level == "state" else Color8(214, 245, 222, 230)
	)
	var outline_color := _world_map_color_from_variant(
		label_family.get("shadowColor", "#0F0A0680"),
		Color(0.06, 0.05, 0.04, 0.72)
	)
	if selected:
		fill_color = _world_map_color_from_variant(label_family.get("textColor", "#FFECA6FF"), Color8(255, 236, 134, 255))
		radius += 5.0
	draw_circle(point, radius + 4.0, outline_color)
	draw_circle(point, radius, fill_color)
	var candidates := _build_tianxia_yutu_label_candidates(point, label, scaled_font_size, radius + 7.0, radius + 4.0)
	var priority := "state" if level == "state" else ("selected_region" if selected else "region")
	var label_slot: Dictionary = _reserve_tianxia_yutu_label_slot(label, scaled_font_size, candidates, priority)
	if bool(label_slot.get("ok", false)):
		var label_pos: Vector2 = label_slot.get("position", point) as Vector2
		draw_string(font, label_pos + Vector2(1.0, 1.0), label, HORIZONTAL_ALIGNMENT_LEFT, -1.0, scaled_font_size, Color(0.01, 0.01, 0.008, 0.86))
		draw_string(font, label_pos, label, HORIZONTAL_ALIGNMENT_LEFT, -1.0, scaled_font_size, text_color)
		if level == "state":
			_last_tianxia_yutu_state_label_draw_count += 1
		else:
			_last_tianxia_yutu_region_label_draw_count += 1
		_record_tianxia_yutu_label_priority_draw(priority)


func _is_tianxia_yutu_placeholder_admin_label(label: String) -> bool:
	var normalized_label: String = label.strip_edges()
	if normalized_label == "":
		return true
	return normalized_label.find("未定区") >= 0 or normalized_label.find("未定") >= 0


func _build_tianxia_yutu_label_candidates(anchor: Vector2, label: String, font_size: int, x_gap: float, y_gap: float) -> Array:
	var label_size: Vector2 = _estimate_tianxia_yutu_label_size(label, font_size)
	return [
		anchor + Vector2(x_gap, -y_gap),
		anchor + Vector2(-label_size.x - x_gap, -y_gap),
		anchor + Vector2(x_gap, y_gap + label_size.y),
		anchor + Vector2(-label_size.x - x_gap, y_gap + label_size.y),
	]


func _build_tianxia_yutu_marker_label_candidates(anchor: Vector2, label: String, font_size: int, scope: String, marker_radius: float) -> Array:
	if scope != "gate":
		return _build_tianxia_yutu_label_candidates(anchor, label, font_size, marker_radius + 6.0, marker_radius + 3.0)
	var label_size: Vector2 = _estimate_tianxia_yutu_label_size(label, font_size)
	_last_tianxia_yutu_gate_boundary_label_offset_count += 1
	return [
		anchor + Vector2(-label_size.x * 0.5, -marker_radius - font_size - 10.0),
		anchor + Vector2(marker_radius + 12.0, -marker_radius - 8.0),
		anchor + Vector2(-label_size.x - marker_radius - 12.0, -marker_radius - 8.0),
		anchor + Vector2(-label_size.x * 0.5, marker_radius + font_size + 8.0),
	]


func _estimate_tianxia_yutu_label_size(label: String, font_size: int) -> Vector2:
	var char_count: int = max(1, label.length())
	return Vector2(float(char_count) * float(font_size) * 0.92, float(font_size) + 4.0)


func _reserve_tianxia_yutu_label_slot(label: String, font_size: int, candidates: Array, priority: String = "other") -> Dictionary:
	var normalized_label: String = label.strip_edges()
	if normalized_label != "" and _tianxia_yutu_drawn_label_texts.has(normalized_label):
		_last_tianxia_yutu_duplicate_label_suppression_count += 1
		_record_tianxia_yutu_label_priority_skip(priority)
		return {"ok": false}
	for candidate_variant in candidates:
		if not (candidate_variant is Vector2):
			continue
		var candidate: Vector2 = candidate_variant as Vector2
		var label_rect: Rect2 = Rect2(candidate, _estimate_tianxia_yutu_label_size(label, font_size)).grow(3.0)
		var blocked_by_panel := false
		for block_rect_variant in _tianxia_yutu_label_block_rects():
			if not (block_rect_variant is Rect2):
				continue
			var block_rect: Rect2 = block_rect_variant as Rect2
			if label_rect.intersects(block_rect, true):
				blocked_by_panel = true
				break
		if blocked_by_panel:
			continue
		var blocked_by_label := false
		for occupied_variant in _tianxia_yutu_label_occupied_rects:
			if not (occupied_variant is Rect2):
				continue
			var occupied_rect: Rect2 = occupied_variant as Rect2
			if label_rect.intersects(occupied_rect, true):
				blocked_by_label = true
				break
		if blocked_by_label:
			continue
		_tianxia_yutu_label_occupied_rects.append(label_rect)
		if normalized_label != "":
			_tianxia_yutu_drawn_label_texts[normalized_label] = true
		return {
			"ok": true,
			"position": candidate,
			"rect": label_rect,
		}
	if _label_candidates_intersect_tianxia_yutu_panel(label, font_size, candidates):
		_last_tianxia_yutu_label_panel_avoidance_skip_count += 1
	else:
		_last_tianxia_yutu_label_collision_skip_count += 1
	_record_tianxia_yutu_label_priority_skip(priority)
	return {"ok": false}


func _record_tianxia_yutu_label_priority_draw(priority: String) -> void:
	var key := priority.strip_edges()
	if key == "":
		key = "other"
	_last_tianxia_yutu_label_priority_draw_counts[key] = int(_last_tianxia_yutu_label_priority_draw_counts.get(key, 0)) + 1
	if not _last_tianxia_yutu_label_priority_draw_order.has(key):
		_last_tianxia_yutu_label_priority_draw_order.append(key)


func _record_tianxia_yutu_label_priority_skip(priority: String) -> void:
	var key := priority.strip_edges()
	if key == "":
		key = "other"
	_last_tianxia_yutu_label_priority_skip_counts[key] = int(_last_tianxia_yutu_label_priority_skip_counts.get(key, 0)) + 1


func _record_tianxia_yutu_marker_scope_draw(scope: String) -> void:
	var key := scope.strip_edges()
	if key == "":
		key = "other"
	_last_tianxia_yutu_marker_scope_draw_counts[key] = int(_last_tianxia_yutu_marker_scope_draw_counts.get(key, 0)) + 1


func _record_tianxia_yutu_marker_label_draw(priority: String) -> void:
	var key := priority.strip_edges()
	if key == "":
		key = "other"
	_last_tianxia_yutu_marker_label_draw_counts[key] = int(_last_tianxia_yutu_marker_label_draw_counts.get(key, 0)) + 1


func _tianxia_yutu_marker_label_priority(scope: String) -> String:
	match scope:
		"gate":
			return "gate"
		"state_government":
			return "state_government"
		"commandery_seat":
			return "commandery_seat"
		"city":
			return "city"
		_:
			return "other"


func _tianxia_yutu_label_priority_rank(priority: String) -> int:
	match priority:
		"state":
			return 10
		"selected_region":
			return 20
		"gate":
			return 30
		"state_government":
			return 40
		"commandery_seat":
			return 50
		"city":
			return 60
		"focus":
			return 70
		"region":
			return 80
		_:
			return 90


func _label_candidates_intersect_tianxia_yutu_panel(label: String, font_size: int, candidates: Array) -> bool:
	var block_rects: Array = _tianxia_yutu_label_block_rects()
	if block_rects.is_empty():
		return false
	for candidate_variant in candidates:
		if not (candidate_variant is Vector2):
			continue
		var candidate: Vector2 = candidate_variant as Vector2
		var label_rect: Rect2 = Rect2(candidate, _estimate_tianxia_yutu_label_size(label, font_size)).grow(3.0)
		for block_rect_variant in block_rects:
			if not (block_rect_variant is Rect2):
				continue
			var block_rect: Rect2 = block_rect_variant as Rect2
			if label_rect.intersects(block_rect, true):
				return true
	return false


func _is_tianxia_yutu_duplicate_context_label(label: String) -> bool:
	var normalized_label: String = label.strip_edges()
	if normalized_label == "":
		return false
	return normalized_label == _tianxia_yutu_selected_region_label()


func _tianxia_yutu_label_block_rects() -> Array:
	var raw_panel_rect: Variant = _tianxia_yutu_drilldown_context.get("panelBlockRect", {})
	if not (raw_panel_rect is Dictionary):
		return []
	var panel_rect_data: Dictionary = raw_panel_rect as Dictionary
	if not bool(panel_rect_data.get("visible", false)):
		return []
	var w: float = float(panel_rect_data.get("w", 0.0))
	var h: float = float(panel_rect_data.get("h", 0.0))
	if w <= 0.0 or h <= 0.0:
		return []
	return [Rect2(Vector2(float(panel_rect_data.get("x", 0.0)), float(panel_rect_data.get("y", 0.0))), Vector2(w, h)).grow(8.0)]


func _draw_tianxia_yutu_city_gate_markers(draw_rect: Rect2, selected_state_id: String, selected_region_id: String, density_level: String) -> void:
	var raw_targets: Variant = _tianxia_yutu_overview_layer.get("jump_targets", [])
	if not (raw_targets is Array):
		return
	var compact_target_active := _tianxia_yutu_compact_target_active()
	var draw_limit: int = 42
	if density_level == "near":
		draw_limit = 80
	if compact_target_active:
		draw_limit = 34
	var gate_label_limit: int = _tianxia_yutu_gate_label_limit_for_context(density_level, selected_state_id, selected_region_id)
	var gate_label_attempt_count := 0

	var filtered_targets: Array = []
	for target_variant in raw_targets as Array:
		if _last_tianxia_yutu_city_gate_marker_draw_count >= draw_limit:
			return
		if not (target_variant is Dictionary):
			continue
		var target: Dictionary = target_variant as Dictionary
		var scope: String = str(target.get("target_scope", target.get("kind", ""))).strip_edges()
		if scope != "state_government" and scope != "commandery_seat" and scope != "city" and scope != "gate":
			continue
		var target_region_id: String = str(target.get("region_id", "")).strip_edges()
		if selected_region_id != "" and scope != "gate" and target_region_id != selected_region_id:
			continue
		if selected_state_id != "" and not _tianxia_yutu_target_matches_state(target, selected_state_id):
			continue
		if selected_state_id == "" and density_level != "near" and (scope == "commandery_seat" or scope == "city"):
			continue
		filtered_targets.append(target)
	filtered_targets.sort_custom(func(left: Dictionary, right: Dictionary) -> bool:
		var left_scope: String = str(left.get("target_scope", left.get("kind", ""))).strip_edges()
		var right_scope: String = str(right.get("target_scope", right.get("kind", ""))).strip_edges()
		var left_compact_focus := _tianxia_yutu_target_matches_compact_focus(left, left_scope)
		var right_compact_focus := _tianxia_yutu_target_matches_compact_focus(right, right_scope)
		if left_compact_focus != right_compact_focus:
			return left_compact_focus
		var left_rank := _tianxia_yutu_label_priority_rank(_tianxia_yutu_marker_label_priority(left_scope))
		var right_rank := _tianxia_yutu_label_priority_rank(_tianxia_yutu_marker_label_priority(right_scope))
		if left_rank == right_rank:
			if left_scope == "gate" and selected_region_id != "":
				var left_selected_region_gate := _tianxia_yutu_target_matches_region(left, selected_region_id)
				var right_selected_region_gate := _tianxia_yutu_target_matches_region(right, selected_region_id)
				if left_selected_region_gate != right_selected_region_gate:
					return left_selected_region_gate
			return str(left.get("label", "")).strip_edges() < str(right.get("label", "")).strip_edges()
		return left_rank < right_rank
	)

	for target in filtered_targets as Array:
		if _last_tianxia_yutu_city_gate_marker_draw_count >= draw_limit:
			return
		if not (target is Dictionary):
			continue
		var scope: String = str(target.get("target_scope", target.get("kind", ""))).strip_edges()
		var display_offset: Vector2 = _resolve_tianxia_yutu_gate_display_offset(target, filtered_targets)
		var compact_focus := _tianxia_yutu_target_matches_compact_focus(target, scope)
		var compact_dim := _tianxia_yutu_target_should_dim_for_compact_focus(target, scope)
		if compact_focus:
			_last_tianxia_yutu_compact_target_candidate_focus_count += 1
		if scope == "gate":
			var gate_target := (target as Dictionary).duplicate(true)
			var matches_selected_region := selected_region_id == "" or _tianxia_yutu_target_matches_region(gate_target, selected_region_id)
			gate_target["compact_focus"] = compact_focus
			gate_target["compact_dim"] = compact_dim
			if selected_region_id != "":
				if matches_selected_region:
					gate_target["context_focus"] = true
				else:
					gate_target["context_dim"] = true
					gate_target["low_emphasis_marker"] = true
					gate_target["gate_micro_marker"] = true
			var allow_gate_label := gate_label_attempt_count < gate_label_limit and matches_selected_region and not compact_dim
			var force_gate_label := _is_tianxia_yutu_target_hovered_or_selected(gate_target, scope)
			if compact_focus:
				gate_target["force_label"] = true
			elif allow_gate_label:
				gate_label_attempt_count += 1
			elif force_gate_label:
				gate_target["force_label"] = true
				_last_tianxia_yutu_gate_hover_label_force_count += 1
			else:
				gate_target["suppress_label"] = true
			_draw_tianxia_yutu_jump_marker(gate_target, draw_rect, scope, display_offset)
			continue
		var draw_target := (target as Dictionary).duplicate(true)
		draw_target["compact_focus"] = compact_focus
		draw_target["compact_dim"] = compact_dim
		if compact_focus:
			draw_target["force_label"] = true
		elif compact_dim:
			draw_target["suppress_label"] = true
		_draw_tianxia_yutu_jump_marker(draw_target, draw_rect, scope, display_offset)


func _resolve_tianxia_yutu_budget_gate_qa_target(gate_targets: Array, gate_label_limit: int) -> Dictionary:
	for target_variant in gate_targets:
		if not (target_variant is Dictionary):
			continue
		var target: Dictionary = target_variant as Dictionary
		if _tianxia_yutu_target_identity(target) == "gate_040" or str(target.get("label", "")).strip_edges() == "故道":
			return target
	if gate_targets.size() <= gate_label_limit:
		return {}
	return gate_targets[gate_label_limit] as Dictionary


func force_tianxia_yutu_hover_budget_gate_for_visual_qa() -> Dictionary:
	var selected_state_id: String = _tianxia_yutu_selected_state_id()
	var selected_region_id: String = _tianxia_yutu_selected_region_id()
	var density_level: String = _last_tianxia_yutu_density_level
	var raw_targets: Variant = _tianxia_yutu_overview_layer.get("jump_targets", [])
	if not (raw_targets is Array):
		return {"ok": false, "reason": "jump_targets_missing"}
	var gate_targets: Array = []
	for target_variant in raw_targets as Array:
		if not (target_variant is Dictionary):
			continue
		var target: Dictionary = target_variant as Dictionary
		if str(target.get("target_scope", target.get("kind", ""))).strip_edges() != "gate":
			continue
		if not _is_tianxia_yutu_jump_target_visible_for_hit(target, selected_state_id, selected_region_id, density_level):
			continue
		gate_targets.append(target)
	gate_targets.sort_custom(func(left: Dictionary, right: Dictionary) -> bool:
		if selected_region_id != "":
			var left_selected_region_gate := _tianxia_yutu_target_matches_region(left, selected_region_id)
			var right_selected_region_gate := _tianxia_yutu_target_matches_region(right, selected_region_id)
			if left_selected_region_gate != right_selected_region_gate:
				return left_selected_region_gate
		return str(left.get("label", "")).strip_edges() < str(right.get("label", "")).strip_edges()
	)
	var gate_label_limit: int = _tianxia_yutu_gate_label_limit_for_context(density_level, selected_state_id, selected_region_id)
	if gate_targets.size() <= gate_label_limit:
		return {"ok": false, "reason": "no_budget_gate_available", "gateCount": gate_targets.size(), "gateLabelLimit": gate_label_limit}
	var target: Dictionary = _resolve_tianxia_yutu_budget_gate_qa_target(gate_targets, gate_label_limit)
	if target.is_empty():
		return {"ok": false, "reason": "budget_gate_target_missing", "gateCount": gate_targets.size(), "gateLabelLimit": gate_label_limit}
	var cell: Dictionary = target.get("cell_1km", {}) as Dictionary if target.get("cell_1km", {}) is Dictionary else {}
	if cell.is_empty():
		return {"ok": false, "reason": "target_cell_missing"}
	var cell_x: int = int(cell.get("x", 0))
	var cell_y: int = int(cell.get("y", 0))
	var target_id: String = _tianxia_yutu_target_identity(target)
	var boundary_summary: String = _format_tianxia_yutu_gate_boundary_summary(target)
	_hover_tile = {
		"id": "tianxia_yutu_hover_gate_%s" % target_id,
		"tileId": "tianxia_yutu_hover_gate_%s" % target_id,
		"type": "tianxia_yutu_marker_snap",
		"terrain": "overview",
		"district": str(target.get("label", "关口")).strip_edges(),
		"x": cell_x,
		"y": cell_y,
		"backendX": cell_x,
		"backendY": cell_y,
		"mainMapCellX": cell_x,
		"mainMapCellY": cell_y,
		"tianxiaYutuMarkerSnap": true,
		"snapTargetId": target_id,
		"snapTargetLabel": str(target.get("label", "")).strip_edges(),
		"snapTargetNavigationLabel": str(target.get("navigation_label", target.get("label", ""))).strip_edges(),
		"snapTargetScope": "gate",
		"snapBoundarySummary": boundary_summary,
	}
	_hover_tile_key = "%s:%s" % [_coord_key(cell_x, cell_y), target_id]
	_update_hover_label()
	queue_redraw()
	return {
		"ok": true,
		"targetId": target_id,
		"label": str(target.get("label", "")).strip_edges(),
		"navigationLabel": str(target.get("navigation_label", target.get("label", ""))).strip_edges(),
		"boundarySummary": boundary_summary,
		"gateCount": gate_targets.size(),
		"gateLabelLimit": gate_label_limit,
	}


func force_tianxia_yutu_select_budget_gate_for_visual_qa() -> Dictionary:
	var selected_state_id: String = _tianxia_yutu_selected_state_id()
	var selected_region_id: String = _tianxia_yutu_selected_region_id()
	var density_level: String = _last_tianxia_yutu_density_level
	var raw_targets: Variant = _tianxia_yutu_overview_layer.get("jump_targets", [])
	if not (raw_targets is Array):
		return {"ok": false, "reason": "jump_targets_missing"}
	var gate_targets: Array = []
	for target_variant in raw_targets as Array:
		if not (target_variant is Dictionary):
			continue
		var target: Dictionary = target_variant as Dictionary
		if str(target.get("target_scope", target.get("kind", ""))).strip_edges() != "gate":
			continue
		if not _is_tianxia_yutu_jump_target_visible_for_hit(target, selected_state_id, selected_region_id, density_level):
			continue
		gate_targets.append(target)
	gate_targets.sort_custom(func(left: Dictionary, right: Dictionary) -> bool:
		if selected_region_id != "":
			var left_selected_region_gate := _tianxia_yutu_target_matches_region(left, selected_region_id)
			var right_selected_region_gate := _tianxia_yutu_target_matches_region(right, selected_region_id)
			if left_selected_region_gate != right_selected_region_gate:
				return left_selected_region_gate
		return str(left.get("label", "")).strip_edges() < str(right.get("label", "")).strip_edges()
	)
	var gate_label_limit: int = _tianxia_yutu_gate_label_limit_for_context(density_level, selected_state_id, selected_region_id)
	if gate_targets.size() <= gate_label_limit:
		return {"ok": false, "reason": "no_budget_gate_available", "gateCount": gate_targets.size(), "gateLabelLimit": gate_label_limit}
	var target: Dictionary = _resolve_tianxia_yutu_budget_gate_qa_target(gate_targets, gate_label_limit)
	if target.is_empty():
		return {"ok": false, "reason": "budget_gate_target_missing", "gateCount": gate_targets.size(), "gateLabelLimit": gate_label_limit}
	var cell: Dictionary = target.get("cell_1km", {}) as Dictionary if target.get("cell_1km", {}) is Dictionary else {}
	if cell.is_empty():
		return {"ok": false, "reason": "target_cell_missing"}
	var draw_rect: Rect2 = _tianxia_yutu_last_draw_rect
	if draw_rect.size.x <= 0.0 or draw_rect.size.y <= 0.0:
		draw_rect = _resolve_tianxia_yutu_draw_rect_for_zoom(_tianxia_yutu_zoom, false)
	if draw_rect.size.x <= 0.0 or draw_rect.size.y <= 0.0:
		return {"ok": false, "reason": "draw_rect_missing"}
	var cell_x: int = int(cell.get("x", 0))
	var cell_y: int = int(cell.get("y", 0))
	var target_id: String = _tianxia_yutu_target_identity(target)
	var boundary_summary: String = _format_tianxia_yutu_gate_boundary_summary(target)
	var display_offset: Vector2 = _resolve_tianxia_yutu_gate_display_offset(target, gate_targets)
	focus_tianxia_yutu_cell(cell_x, cell_y, 4.8, str(target.get("navigation_label", target.get("label", "关口"))).strip_edges())
	draw_rect = _resolve_tianxia_yutu_draw_rect_for_zoom(_tianxia_yutu_zoom, true)
	if draw_rect.size.x <= 0.0 or draw_rect.size.y <= 0.0:
		return {"ok": false, "reason": "focused_draw_rect_missing"}
	var marker_point: Vector2 = _tianxia_yutu_world_cell_to_screen(cell_x, cell_y, draw_rect) + display_offset
	_select_tile_at(marker_point)
	_hover_tile = {}
	_hover_tile_key = ""
	_last_tianxia_yutu_hover_gate_summary = {}
	_update_hover_label()
	queue_redraw()
	var selected_summary: Dictionary = _last_tianxia_yutu_selected_gate_summary.duplicate(true)
	return {
		"ok": not selected_summary.is_empty() and str(selected_summary.get("targetId", "")).strip_edges() == target_id,
		"targetId": target_id,
		"label": str(target.get("label", "")).strip_edges(),
		"navigationLabel": str(target.get("navigation_label", target.get("label", ""))).strip_edges(),
		"boundarySummary": boundary_summary,
		"selectedSummary": selected_summary,
		"gateCount": gate_targets.size(),
		"gateLabelLimit": gate_label_limit,
	}


func force_tianxia_yutu_select_city_marker_for_visual_qa() -> Dictionary:
	var selected_state_id: String = _tianxia_yutu_selected_state_id()
	var selected_region_id: String = _tianxia_yutu_selected_region_id()
	var raw_markers: Variant = _tianxia_yutu_overview_layer.get("city_markers", [])
	if not (raw_markers is Array):
		return {"ok": false, "reason": "city_markers_missing"}
	var city_markers: Array = []
	for marker_variant in raw_markers as Array:
		if not (marker_variant is Dictionary):
			continue
		var marker: Dictionary = marker_variant as Dictionary
		var state_id: String = str(marker.get("state_id", "")).strip_edges()
		var region_id: String = str(marker.get("region_id", "")).strip_edges()
		if selected_state_id != "" and state_id != selected_state_id:
			continue
		if selected_region_id != "" and region_id != selected_region_id:
			continue
		var cell: Dictionary = marker.get("cell_1km", {}) as Dictionary if marker.get("cell_1km", {}) is Dictionary else {}
		if cell.is_empty():
			continue
		city_markers.append(marker)
	if city_markers.is_empty():
		return {"ok": false, "reason": "city_marker_not_found", "selectedStateId": selected_state_id, "selectedRegionId": selected_region_id}
	city_markers.sort_custom(func(left: Dictionary, right: Dictionary) -> bool:
		return str(left.get("label", "")).strip_edges() < str(right.get("label", "")).strip_edges()
	)
	var marker: Dictionary = city_markers[0] as Dictionary
	var cell: Dictionary = marker.get("cell_1km", {}) as Dictionary
	var cell_x: int = int(cell.get("x", 0))
	var cell_y: int = int(cell.get("y", 0))
	var label: String = str(marker.get("label", "城池")).strip_edges()
	if label == "":
		label = "城池"
	var state_id: String = str(marker.get("state_id", "")).strip_edges()
	var region_id: String = str(marker.get("region_id", "")).strip_edges()
	var state_label: String = _tianxia_yutu_state_label_for_id(state_id)
	var region_label: String = _tianxia_yutu_region_label_for_id(region_id)
	focus_tianxia_yutu_cell(cell_x, cell_y, 4.8, label)
	var tile := {
		"id": "tianxia_yutu_city_marker_%d_%d" % [cell_x, cell_y],
		"tileId": "tianxia_yutu_city_marker_%d_%d" % [cell_x, cell_y],
		"type": "tianxia_yutu_marker_snap",
		"terrain": "overview",
		"district": label,
		"x": cell_x,
		"y": cell_y,
		"backendX": cell_x,
		"backendY": cell_y,
		"tmxX": cell_x,
		"tmxY": cell_y,
		"mainMapCellX": cell_x,
		"mainMapCellY": cell_y,
		"worldId": MAIN_MAP_WORLD_ID,
		"coordinateSpace": MAIN_MAP_COORDINATE_SPACE,
		"owner": "neutral",
		"cellVersion": 0,
		"tianxiaYutuMarkerSnap": true,
		"snapTargetId": _tianxia_yutu_city_marker_target_id(marker),
		"snapTargetLabel": label,
		"snapTargetNavigationLabel": label,
		"snapTargetScope": "city",
		"snapStateId": state_id,
		"snapStateLabel": state_label,
		"snapRegionId": region_id,
		"snapRegionLabel": region_label,
	}
	_selected_tile = tile
	_selected_tile_key = "%s:%s" % [_coord_key(cell_x, cell_y), str(tile.get("snapTargetId", ""))]
	_tianxia_yutu_focus_marker_cell = Vector2i(cell_x, cell_y)
	_tianxia_yutu_focus_marker_label = label
	_last_tianxia_yutu_selected_gate_summary = {}
	var main_map_context: Dictionary = _build_main_map_cell_action_context(tile)
	_selected_main_map_cell_action_context = main_map_context.duplicate(true)
	if not main_map_context.is_empty():
		main_map_cell_selected.emit(main_map_context.duplicate(true))
	queue_redraw()
	return {
		"ok": not main_map_context.is_empty(),
		"label": label,
		"stateId": state_id,
		"stateLabel": state_label,
		"regionId": region_id,
		"regionLabel": region_label,
		"cell": {"x": cell_x, "y": cell_y},
		"context": main_map_context,
	}


func _draw_tianxia_yutu_ordinary_city_markers(draw_rect: Rect2, selected_state_id: String, selected_region_id: String) -> void:
	var raw_markers: Variant = _tianxia_yutu_overview_layer.get("city_markers", [])
	if not (raw_markers is Array):
		return
	var compact_target_active := _tianxia_yutu_compact_target_active()
	var draw_limit: int = 30
	if selected_region_id != "":
		draw_limit = 52
	if compact_target_active:
		draw_limit = 46
	var city_label_limit: int = _tianxia_yutu_city_label_limit_for_context(selected_state_id, selected_region_id)
	var city_label_attempt_count := 0
	var city_targets: Array = []
	for marker_variant in raw_markers as Array:
		if not (marker_variant is Dictionary):
			continue
		var marker: Dictionary = marker_variant as Dictionary
		var state_id: String = str(marker.get("state_id", "")).strip_edges()
		var region_id: String = str(marker.get("region_id", "")).strip_edges()
		if selected_region_id != "" and region_id != selected_region_id:
			continue
		if selected_state_id != "" and state_id != selected_state_id:
			continue
		var cell: Dictionary = marker.get("cell_1km", {}) as Dictionary if marker.get("cell_1km", {}) is Dictionary else {}
		if cell.is_empty():
			continue
		city_targets.append({
			"target_id": _tianxia_yutu_city_marker_target_id(marker),
			"label": str(marker.get("label", "")).strip_edges(),
			"target_scope": "city",
			"state_id": state_id,
			"state_label": _tianxia_yutu_state_label_for_id(state_id),
			"region_id": region_id,
			"region_label": _tianxia_yutu_region_label_for_id(region_id),
			"cell_1km": cell,
			"city_visual_tier": "ordinary",
		})
	city_targets.sort_custom(func(left: Dictionary, right: Dictionary) -> bool:
		var left_focus := _tianxia_yutu_target_matches_compact_focus(left, "city")
		var right_focus := _tianxia_yutu_target_matches_compact_focus(right, "city")
		if left_focus != right_focus:
			return left_focus
		return str(left.get("label", "")).strip_edges() < str(right.get("label", "")).strip_edges()
	)
	for target_variant in city_targets:
		if _last_tianxia_yutu_city_gate_marker_draw_count >= draw_limit:
			return
		if not (target_variant is Dictionary):
			continue
		var target: Dictionary = (target_variant as Dictionary).duplicate(true)
		var compact_focus := _tianxia_yutu_target_matches_compact_focus(target, "city")
		var compact_dim := _tianxia_yutu_target_should_dim_for_compact_focus(target, "city")
		if compact_focus:
			_last_tianxia_yutu_compact_target_candidate_focus_count += 1
		if compact_focus:
			target["city_visual_tier"] = "focus"
			target["compact_focus"] = true
			target["force_label"] = true
		elif compact_dim:
			target["compact_dim"] = true
			target["suppress_label"] = true
		var allow_city_label := city_label_attempt_count < city_label_limit and not compact_dim
		if allow_city_label or compact_focus:
			city_label_attempt_count += 1
		if not allow_city_label and not compact_focus:
			target["city_visual_tier"] = "ordinary_micro"
			target["low_emphasis_marker"] = true
			target["ordinary_city_micro_marker"] = true
			target["suppress_label"] = true
		_draw_tianxia_yutu_jump_marker(target, draw_rect, "city")


func _draw_tianxia_yutu_jump_marker(target: Dictionary, draw_rect: Rect2, scope: String, display_offset: Vector2 = Vector2.ZERO) -> void:
	var cell: Dictionary = target.get("cell_1km", {}) as Dictionary if target.get("cell_1km", {}) is Dictionary else {}
	if cell.is_empty():
		return
	var point := _tianxia_yutu_world_cell_to_screen(int(cell.get("x", 0)), int(cell.get("y", 0)), draw_rect) + display_offset
	if point.x < -80.0 or point.y < -40.0 or point.x > get_viewport_rect().size.x + 80.0 or point.y > get_viewport_rect().size.y + 40.0:
		return
	var font := ThemeDB.fallback_font
	if font == null:
		return
	var visual_tier: String = str(target.get("city_visual_tier", "")).strip_edges()
	var compact_focus := bool(target.get("compact_focus", false))
	var compact_dim := bool(target.get("compact_dim", false)) and not compact_focus
	var active_gate := scope == "gate" and _is_tianxia_yutu_target_hovered_or_selected(target, scope)
	var context_gate_focus := scope == "gate" and bool(target.get("context_focus", false))
	var context_gate_dim := scope == "gate" and bool(target.get("context_dim", false)) and not active_gate
	var low_emphasis_marker := bool(target.get("low_emphasis_marker", false))
	var gate_micro_marker := bool(target.get("gate_micro_marker", false))
	var ordinary_city_micro_marker := bool(target.get("ordinary_city_micro_marker", false))
	var visual_policy: Dictionary = TianxiaYutuMarkerVisualPolicyScript.classify_marker(
		scope,
		visual_tier,
		compact_focus,
		compact_dim,
		context_gate_focus,
		context_gate_dim,
		active_gate,
		low_emphasis_marker,
		gate_micro_marker,
		ordinary_city_micro_marker
	)
	var color: Color = visual_policy.get("color", Color8(255, 196, 96, 245)) as Color
	var marker_radius: float = float(visual_policy.get("marker_radius", 5.0))
	low_emphasis_marker = bool(visual_policy.get("low_emphasis_marker", low_emphasis_marker))
	gate_micro_marker = bool(visual_policy.get("gate_micro_marker", gate_micro_marker))
	ordinary_city_micro_marker = bool(visual_policy.get("ordinary_city_micro_marker", ordinary_city_micro_marker))
	var selection_entry: Dictionary = _world_map_event_selection_entry("hover" if active_gate else "selected")
	var selection_color := _world_map_color_from_variant(
		selection_entry.get("haloColor", "#F3E3A1AA"),
		Color(0.88, 0.72, 0.34, 0.20)
	)
	var selection_ring_width: float = float(selection_entry.get("ringWidthPx", 1.7))
	var selection_radius: float = maxf(marker_radius + 10.0, float(selection_entry.get("radiusPx", 26)) * 0.80)
	selection_radius = maxf(selection_radius, marker_radius * 3.0)
	var route_entry: Dictionary = _world_map_route_family_entry("selected_route")
	var route_line_color := _world_map_color_from_variant(
		route_entry.get("strokeColor", "#F0E3AA"),
		Color(0.96, 0.95, 0.65, 0.90)
	)
	var route_width: float = _world_map_width_px_from_entry(route_entry, _world_map_zoom_semantic_tier(), 3.0) + 1.2
	if compact_focus:
		draw_circle(point, selection_radius + 2.0, Color(route_line_color.r, route_line_color.g, route_line_color.b, 0.58))
		draw_arc(point, selection_radius, 0.0, TAU, 32, selection_color, selection_ring_width, true)
		draw_line(
			point + Vector2(-route_width - 2.0, 0.0),
			point + Vector2(route_width + 2.0, 0.0),
			route_line_color,
			maxf(0.9, route_width * 0.15),
			true
		)
		_last_tianxia_yutu_compact_target_marker_focus_draw_count += 1
	elif compact_dim:
		_last_tianxia_yutu_compact_target_marker_dim_draw_count += 1
	if scope == "gate":
		if context_gate_focus and not compact_focus:
			draw_circle(point, marker_radius + 10.0, Color(0.52, 0.82, 0.88, 0.18))
			draw_arc(point, marker_radius + 9.0, 0.0, TAU, 28, Color(0.62, 0.88, 0.92, 0.70), 1.5)
			_last_tianxia_yutu_context_gate_focus_draw_count += 1
		elif context_gate_dim:
			_last_tianxia_yutu_out_of_region_gate_dim_draw_count += 1
		var gate_backdrop_radius: float = float(visual_policy.get("gate_backdrop_radius", marker_radius + (4.0 if context_gate_dim else 7.0)))
		var gate_diamond_padding: float = float(visual_policy.get("gate_diamond_padding", 2.3 if context_gate_dim else 4.0))
		draw_circle(point, gate_backdrop_radius, Color(0.03, 0.12, 0.14, 0.14 if context_gate_dim else 0.34))
		var diamond := PackedVector2Array([
			point + Vector2(0.0, -marker_radius - gate_diamond_padding),
			point + Vector2(marker_radius + gate_diamond_padding, 0.0),
			point + Vector2(0.0, marker_radius + gate_diamond_padding),
			point + Vector2(-marker_radius - gate_diamond_padding, 0.0),
		])
		draw_colored_polygon(diamond, Color(0.005, 0.012, 0.014, 0.72 if context_gate_dim else 0.90))
		var inner := PackedVector2Array([
			point + Vector2(0.0, -marker_radius),
			point + Vector2(marker_radius, 0.0),
			point + Vector2(0.0, marker_radius),
			point + Vector2(-marker_radius, 0.0),
		])
		draw_colored_polygon(inner, color)
	else:
		var outline_alpha: float = float(visual_policy.get("outline_alpha", 0.70))
		draw_circle(point, marker_radius + 3.0, Color(0.01, 0.012, 0.012, outline_alpha))
		draw_circle(point, marker_radius, color)
	if low_emphasis_marker:
		_last_tianxia_yutu_low_emphasis_marker_draw_count += 1
	if gate_micro_marker:
		_last_tianxia_yutu_out_of_region_gate_micro_draw_count += 1
	if ordinary_city_micro_marker:
		_last_tianxia_yutu_ordinary_city_micro_draw_count += 1
	_last_tianxia_yutu_marker_visual_weight_estimate += marker_radius
	_record_tianxia_yutu_marker_scope_draw(scope)
	if active_gate:
		_draw_tianxia_yutu_gate_detail_callout(point, target, marker_radius)
	var label: String = str(target.get("label", "")).strip_edges()
	var suppress_label := bool(target.get("suppress_label", false))
	var force_label := bool(target.get("force_label", false))
	if compact_focus:
		force_label = true
	elif compact_dim:
		suppress_label = true
	if force_label:
		suppress_label = false
	if compact_dim and label != "" and suppress_label:
		_last_tianxia_yutu_compact_target_label_suppression_count += 1
	if suppress_label and label != "" and scope == "city":
		_last_tianxia_yutu_city_label_budget_skip_count += 1
		_record_tianxia_yutu_label_priority_skip("city")
	elif suppress_label and label != "" and scope == "gate":
		_last_tianxia_yutu_gate_label_budget_skip_count += 1
		_record_tianxia_yutu_label_priority_skip("gate")
	if label != "" and not suppress_label and (_last_tianxia_yutu_density_level == "near" or scope == "state_government" or scope == "gate"):
		var font_size := 14
		if scope == "state_government":
			font_size = 16
		elif scope == "commandery_seat":
			font_size = 13
		elif scope == "city":
			font_size = 11 if visual_tier == "ordinary" else 12
		if scope == "gate" and label.find("关") < 0:
			label = "%s关" % label
		if _is_tianxia_yutu_duplicate_context_label(label):
			_last_tianxia_yutu_duplicate_label_suppression_count += 1
		else:
			var priority := _tianxia_yutu_marker_label_priority(scope)
			var candidates := _build_tianxia_yutu_marker_label_candidates(point, label, font_size, scope, marker_radius)
			var label_slot: Dictionary = _reserve_tianxia_yutu_label_slot(label, font_size, candidates, priority)
			if bool(label_slot.get("ok", false)):
				var label_pos: Vector2 = label_slot.get("position", point) as Vector2
				var label_family_key := "strategic_node_caption" if scope == "gate" else "city_plate"
				_draw_world_map_label_plate(font, label_pos, label, font_size, label_family_key)
				var label_family: Dictionary = _world_map_label_family_entry(label_family_key)
				var label_color := _world_map_color_from_variant(
					label_family.get("textColor", "#F2F8E6EB"),
					Color8(242, 248, 230, 235)
				)
				draw_string(font, label_pos + Vector2(1.0, 1.0), label, HORIZONTAL_ALIGNMENT_LEFT, -1.0, font_size, Color(0.01, 0.01, 0.008, 0.86))
				draw_string(font, label_pos, label, HORIZONTAL_ALIGNMENT_LEFT, -1.0, font_size, label_color)
				_record_tianxia_yutu_label_priority_draw(priority)
				_record_tianxia_yutu_marker_label_draw(priority)
	_last_tianxia_yutu_city_gate_marker_draw_count += 1


func _draw_tianxia_yutu_gate_detail_callout(point: Vector2, target: Dictionary, marker_radius: float) -> void:
	var font := ThemeDB.fallback_font
	if font == null:
		return
	var gate_label: String = str(target.get("navigation_label", target.get("label", "关口"))).strip_edges()
	if gate_label == "":
		gate_label = "未命名关口"
	if gate_label.find("关") < 0:
		gate_label = "%s关" % gate_label
	var boundary_summary: String = _format_tianxia_yutu_gate_boundary_summary(target)
	if boundary_summary == "":
		boundary_summary = "边界语义待补"
	var title_size := 13
	var detail_size := 11
	var estimated_title_width := float(gate_label.length()) * float(title_size) * 0.78
	var estimated_detail_width := float(boundary_summary.length()) * float(detail_size) * 0.66
	var viewport_size: Vector2 = get_viewport_rect().size
	var card_width := clampf(maxf(estimated_title_width, estimated_detail_width) + 24.0, 168.0, minf(312.0, viewport_size.x - 18.0))
	var card_height := 48.0
	var card_pos := point + Vector2(marker_radius + 18.0, -card_height - 12.0)
	if card_pos.x + card_width > viewport_size.x - 8.0:
		card_pos.x = point.x - card_width - marker_radius - 18.0
	if card_pos.x < 8.0:
		card_pos.x = 8.0
	if card_pos.y < 8.0:
		card_pos.y = point.y + marker_radius + 16.0
	if card_pos.y + card_height > viewport_size.y - 8.0:
		card_pos.y = viewport_size.y - card_height - 8.0
	var card_rect := Rect2(card_pos, Vector2(card_width, card_height))
	draw_rect(card_rect, Color(0.025, 0.040, 0.040, 0.88), true)
	draw_rect(card_rect, Color(0.78, 0.70, 0.48, 0.70), false, 1.0)
	var title_pos := card_pos + Vector2(10.0, 18.0)
	var detail_pos := card_pos + Vector2(10.0, 37.0)
	draw_string(font, title_pos + Vector2(1.0, 1.0), gate_label, HORIZONTAL_ALIGNMENT_LEFT, card_width - 20.0, title_size, Color(0.0, 0.0, 0.0, 0.72))
	draw_string(font, title_pos, gate_label, HORIZONTAL_ALIGNMENT_LEFT, card_width - 20.0, title_size, Color8(255, 237, 174, 248))
	draw_string(font, detail_pos + Vector2(1.0, 1.0), boundary_summary, HORIZONTAL_ALIGNMENT_LEFT, card_width - 20.0, detail_size, Color(0.0, 0.0, 0.0, 0.66))
	draw_string(font, detail_pos, boundary_summary, HORIZONTAL_ALIGNMENT_LEFT, card_width - 20.0, detail_size, Color8(212, 242, 238, 238))
	_last_tianxia_yutu_gate_detail_callout_draw_count += 1


func _resolve_tianxia_yutu_gate_display_offset(target: Dictionary, visible_targets: Array) -> Vector2:
	var label: String = str(target.get("label", "")).strip_edges()
	if TIANXIA_YUTU_GATE_LABEL_OVERLAP_LABELS.find(label) < 0:
		return Vector2.ZERO

	var cell: Dictionary = target.get("cell_1km", {}) as Dictionary if target.get("cell_1km", {}) is Dictionary else {}
	if cell.is_empty():
		return Vector2.ZERO
	var target_x: int = int(cell.get("x", 0))
	var target_y: int = int(cell.get("y", 0))

	var overlap_target := false
	for peer_variant in visible_targets:
		if not (peer_variant is Dictionary):
			continue
		var peer: Dictionary = peer_variant as Dictionary
		var peer_label: String = str(peer.get("label", "")).strip_edges()
		if peer_label == label or TIANXIA_YUTU_GATE_LABEL_OVERLAP_LABELS.find(peer_label) < 0:
			continue
		var peer_cell: Dictionary = peer.get("cell_1km", {}) as Dictionary if peer.get("cell_1km", {}) is Dictionary else {}
		if peer_cell.is_empty():
			continue
		if int(peer_cell.get("x", 0)) == target_x and int(peer_cell.get("y", 0)) == target_y:
			overlap_target = true
			break

	if not overlap_target:
		return Vector2.ZERO

	if label == "镇南关":
		return TIANXIA_YUTU_GATE_LABEL_OVERLAP_OFFSET_ZHEN_NAN_GUAN
	return TIANXIA_YUTU_GATE_LABEL_OVERLAP_OFFSET_GU_GUAN


func _tianxia_yutu_target_matches_state(target: Dictionary, selected_state_id: String) -> bool:
	if selected_state_id == "":
		return true
	if str(target.get("state_id", "")).strip_edges() == selected_state_id:
		return true
	if str(target.get("from_state_group_id", "")).strip_edges() == selected_state_id:
		return true
	if str(target.get("to_state_group_id", "")).strip_edges() == selected_state_id:
		return true
	return false


func _tianxia_yutu_target_matches_region(target: Dictionary, selected_region_id: String) -> bool:
	if selected_region_id == "":
		return true
	if str(target.get("region_id", "")).strip_edges() == selected_region_id:
		return true
	if str(target.get("from_region_id", "")).strip_edges() == selected_region_id:
		return true
	if str(target.get("to_region_id", "")).strip_edges() == selected_region_id:
		return true
	return false


func _tianxia_yutu_target_identity(target: Dictionary) -> String:
	var target_id: String = str(target.get("target_id", target.get("id", ""))).strip_edges()
	if target_id != "":
		return target_id
	var cell: Dictionary = target.get("cell_1km", {}) as Dictionary if target.get("cell_1km", {}) is Dictionary else {}
	return "%s:%s:%s" % [
		str(target.get("label", "")).strip_edges(),
		int(cell.get("x", -1)),
		int(cell.get("y", -1)),
	]


func _is_tianxia_yutu_target_hovered_or_selected(target: Dictionary, scope: String) -> bool:
	var target_identity: String = _tianxia_yutu_target_identity(target)
	if target_identity == "":
		return false
	for tile_variant in [_hover_tile, _selected_tile, _selected_main_map_cell_action_context]:
		if not (tile_variant is Dictionary):
			continue
		var tile: Dictionary = tile_variant as Dictionary
		if not bool(tile.get("tianxiaYutuMarkerSnap", false)):
			continue
		if str(tile.get("snapTargetScope", "")).strip_edges() != scope:
			continue
		if str(tile.get("snapTargetId", "")).strip_edges() == target_identity:
			return true
		var cell: Dictionary = target.get("cell_1km", {}) as Dictionary if target.get("cell_1km", {}) is Dictionary else {}
		if not cell.is_empty():
			var tile_x: int = int(tile.get("mainMapCellX", tile.get("x", -1)))
			var tile_y: int = int(tile.get("mainMapCellY", tile.get("y", -1)))
			if tile_x == int(cell.get("x", -2)) and tile_y == int(cell.get("y", -2)):
				var tile_label: String = str(tile.get("snapTargetNavigationLabel", tile.get("snapTargetLabel", ""))).strip_edges()
				var target_label: String = str(target.get("navigation_label", target.get("label", ""))).strip_edges()
				if tile_label == "" or target_label == "" or tile_label == target_label:
					return true
	return false


func _build_tianxia_yutu_selected_gate_summary(tile: Dictionary) -> Dictionary:
	if tile.is_empty():
		return {}
	if not bool(tile.get("tianxiaYutuMarkerSnap", false)):
		return {}
	if str(tile.get("snapTargetScope", "")).strip_edges() != "gate":
		return {}
	var gate_label: String = str(tile.get("snapTargetNavigationLabel", tile.get("snapTargetLabel", "关口"))).strip_edges()
	var short_label: String = str(tile.get("snapTargetLabel", gate_label)).strip_edges()
	var boundary_summary: String = str(tile.get("snapBoundarySummary", "")).strip_edges()
	var coord_text := "(%d,%d)" % [int(tile.get("mainMapCellX", tile.get("x", 0))), int(tile.get("mainMapCellY", tile.get("y", 0)))]
	return {
		"targetId": str(tile.get("snapTargetId", "")).strip_edges(),
		"label": gate_label,
		"shortLabel": short_label,
		"boundarySummary": boundary_summary,
		"coordinate": coord_text,
	}


func _format_tianxia_yutu_gate_boundary_summary(target: Dictionary) -> String:
	var from_state_id: String = str(target.get("from_state_group_id", target.get("state_id", ""))).strip_edges()
	var to_state_id: String = str(target.get("to_state_group_id", "")).strip_edges()
	var from_region_id: String = str(target.get("from_region_id", target.get("region_id", ""))).strip_edges()
	var to_region_id: String = str(target.get("to_region_id", "")).strip_edges()
	var from_state: String = str(target.get("from_state_label", "")).strip_edges()
	if from_state == "":
		from_state = _tianxia_yutu_state_label_for_id(from_state_id)
	var to_state: String = str(target.get("to_state_label", "")).strip_edges()
	if to_state == "":
		to_state = _tianxia_yutu_state_label_for_id(to_state_id)
	var from_region: String = str(target.get("from_region_label", "")).strip_edges()
	if from_region == "":
		from_region = _tianxia_yutu_region_label_for_id(from_region_id)
	var to_region: String = str(target.get("to_region_label", "")).strip_edges()
	if to_region == "":
		to_region = _tianxia_yutu_region_label_for_id(to_region_id)
	var left: String = from_state
	if from_region != "" and from_region != from_state:
		left = "%s/%s" % [from_state, from_region] if from_state != "" else from_region
	var right: String = to_state
	if to_region != "" and to_region != to_state:
		right = "%s/%s" % [to_state, to_region] if to_state != "" else to_region
	if left == "" and right == "":
		return ""
	if left == "":
		return right
	if right == "":
		return left
	return "%s ↔ %s" % [left, right]


func _tianxia_yutu_state_label_for_id(state_id: String) -> String:
	var normalized_id: String = state_id.strip_edges()
	if normalized_id == "":
		return ""
	if TIANXIA_YUTU_PLAYER_SOURCE_LABELS.has(normalized_id):
		return str(TIANXIA_YUTU_PLAYER_SOURCE_LABELS.get(normalized_id, normalized_id)).strip_edges()
	var administrative_layer: Dictionary = _tianxia_yutu_overview_layer.get("administrative_ownership_layer", {}) as Dictionary if _tianxia_yutu_overview_layer.get("administrative_ownership_layer", {}) is Dictionary else {}
	var raw_states: Variant = administrative_layer.get("states", [])
	if raw_states is Array:
		for state_variant in raw_states as Array:
			if not (state_variant is Dictionary):
				continue
			var state: Dictionary = state_variant as Dictionary
			if str(state.get("state_id", "")).strip_edges() == normalized_id:
				return str(state.get("state_label", normalized_id)).strip_edges()
	return normalized_id


func _tianxia_yutu_region_label_for_id(region_id: String) -> String:
	var normalized_id: String = region_id.strip_edges()
	if normalized_id == "":
		return ""
	var administrative_layer: Dictionary = _tianxia_yutu_overview_layer.get("administrative_ownership_layer", {}) as Dictionary if _tianxia_yutu_overview_layer.get("administrative_ownership_layer", {}) is Dictionary else {}
	var raw_regions: Variant = administrative_layer.get("regions", [])
	if raw_regions is Array:
		for region_variant in raw_regions as Array:
			if not (region_variant is Dictionary):
				continue
			var region: Dictionary = region_variant as Dictionary
			if str(region.get("region_id", "")).strip_edges() == normalized_id:
				return str(region.get("region_label", normalized_id)).strip_edges()
	return normalized_id


func _draw_tianxia_yutu_frontline_markers(draw_pos: Vector2, draw_size: Vector2) -> void:
	if not bool(_tianxia_yutu_overlay_visibility.get("frontiers", false)):
		return
	var strategic_layer: Dictionary = _tianxia_yutu_overview_layer.get("strategic_overlay_layer", {}) as Dictionary if _tianxia_yutu_overview_layer.get("strategic_overlay_layer", {}) is Dictionary else {}
	_draw_tianxia_yutu_outer_boundary_segments(strategic_layer, draw_pos, draw_size)
	var route_entry: Dictionary = _world_map_route_family_entry("selected_route")
	var route_shadow_color := _world_map_color_from_variant(route_entry.get("shadowColor", "#06120E61"), Color(0.02, 0.015, 0.01, 0.34))
	var route_width: float = maxf(
		_world_map_width_px_from_entry(route_entry, _world_map_zoom_semantic_tier(), 2.2) * WORLD_MAP_ROUTE_LINE_WIDTH_SCALE,
		WORLD_MAP_ROUTE_LINE_WIDTH_MIN
	)
	var raw_markers: Variant = strategic_layer.get("frontline_markers", [])
	if not (raw_markers is Array):
		return
	for marker_variant in raw_markers as Array:
		if not (marker_variant is Dictionary):
			continue
		var marker: Dictionary = marker_variant as Dictionary
		var from_cell: Dictionary = marker.get("from_cell", {}) as Dictionary if marker.get("from_cell", {}) is Dictionary else {}
		var to_cell: Dictionary = marker.get("to_cell", {}) as Dictionary if marker.get("to_cell", {}) is Dictionary else {}
		if from_cell.is_empty() or to_cell.is_empty():
			continue
		var from_point := _tianxia_yutu_cell_to_preview_point(from_cell, draw_pos, draw_size)
		var to_point := _tianxia_yutu_cell_to_preview_point(to_cell, draw_pos, draw_size)
		if from_point.distance_to(to_point) < 8.0:
			continue
		var marker_color := _resolve_tianxia_yutu_frontline_marker_color(str(marker.get("faction_id", "")).strip_edges())
		draw_line(from_point, to_point, route_shadow_color, route_width + 2.2, true)
		draw_line(from_point, to_point, marker_color, route_width, true)
		_draw_tianxia_yutu_frontline_arrowhead(from_point, to_point, marker_color)
		_last_tianxia_yutu_frontline_draw_count += 1
		_last_tianxia_yutu_frontline_arrow_draw_count += 1
		if _last_tianxia_yutu_frontline_marker_label == "":
			_last_tianxia_yutu_frontline_marker_label = str(marker.get("label", "")).strip_edges()


func _draw_tianxia_yutu_living_world_hotspots(draw_pos: Vector2, draw_size: Vector2) -> void:
	var ai_state: Dictionary = WorldStore.get_ai_state(_resolve_human_faction_id())
	var raw_trace_items: Variant = ai_state.get("playerRuntimeExecutionTraceItems", [])
	var trace_items: Array = raw_trace_items as Array if raw_trace_items is Array else []
	var hotspots: Dictionary = {}
	var cluster_counts_by_cell_key: Dictionary = {}
	for trace_variant in trace_items:
		if not (trace_variant is Dictionary):
			continue
		var trace_item: Dictionary = trace_variant as Dictionary
		var trace_id := str(trace_item.get("traceId", trace_item.get("trace_id", ""))).strip_edges()
		var marker_payload_variant: Variant = trace_item.get("marker", {})
		var marker_payload: Dictionary = marker_payload_variant as Dictionary if marker_payload_variant is Dictionary else {}
		var targetTileId: String = str(trace_item.get("targetTileId", marker_payload.get("targetTileId", ""))).strip_edges()
		var cell: Dictionary = _resolve_tianxia_yutu_ai_activity_hotspot_cell(trace_item, marker_payload, targetTileId)
		if cell.is_empty():
			continue
		if _last_tianxia_yutu_ai_activity_first_trace_id == "" and trace_id != "":
			_last_tianxia_yutu_ai_activity_first_trace_id = trace_id
		var source_cell: Dictionary = _resolve_tianxia_yutu_ai_activity_hotspot_source_cell(trace_item, marker_payload)
		var cell_key := _coord_key(int(cell.get("x", -1)), int(cell.get("y", -1)))
		cluster_counts_by_cell_key[cell_key] = int(cluster_counts_by_cell_key.get(cell_key, 0)) + 1
		var route_items: Array = []
		if not hotspots.has(cell_key):
			route_items = []
			hotspots[cell_key] = {
				"cell": cell,
				"sourceCell": source_cell,
				"routeItems": route_items,
				"label": _resolve_tianxia_yutu_ai_activity_hotspot_label(trace_item, marker_payload),
			}
		else:
			var existing_hotspot: Dictionary = hotspots[cell_key] as Dictionary if hotspots[cell_key] is Dictionary else {}
			route_items = existing_hotspot.get("routeItems", []) as Array if existing_hotspot.get("routeItems", []) is Array else []
		if not source_cell.is_empty():
			route_items.append({
				"sourceCell": source_cell,
				"stateVariant": _resolve_tianxia_yutu_ai_activity_route_state_variant(trace_item, marker_payload),
			})
	_last_tianxia_yutu_ai_activity_hotspot_count = hotspots.size()
	_last_tianxia_yutu_ai_activity_uses_execution_trace = _last_tianxia_yutu_ai_activity_hotspot_count > 0
	_last_tianxia_yutu_ai_activity_fallback_used = false
	if hotspots.is_empty():
		return
	var font := ThemeDB.fallback_font
	for cell_key_variant in hotspots.keys():
		var cell_key := str(cell_key_variant)
		var hotspot: Dictionary = hotspots[cell_key] as Dictionary
		var cell: Dictionary = hotspot.get("cell", {}) as Dictionary if hotspot.get("cell", {}) is Dictionary else {}
		if cell.is_empty():
			continue
		var cluster_count: int = maxi(1, int(cluster_counts_by_cell_key.get(cell_key, 1)))
		var point := _tianxia_yutu_cell_to_preview_point(cell, draw_pos, draw_size)
		var radius := clampf(7.0 * sqrt(_tianxia_yutu_zoom), 7.0, 16.0)
		var route_items: Array = hotspot.get("routeItems", []) as Array if hotspot.get("routeItems", []) is Array else []
		for route_item_variant in route_items:
			if not (route_item_variant is Dictionary):
				continue
			var route_item: Dictionary = route_item_variant as Dictionary
			var source_cell: Dictionary = route_item.get("sourceCell", {}) as Dictionary if route_item.get("sourceCell", {}) is Dictionary else {}
			if source_cell.is_empty():
				continue
			var source_point := _tianxia_yutu_cell_to_preview_point(source_cell, draw_pos, draw_size)
			if source_point.distance_to(point) >= 4.0:
				_last_tianxia_yutu_ai_activity_route_intent_source_target_count += 1
				if _draw_tianxia_yutu_ai_activity_route_intent(source_point, point):
					_last_tianxia_yutu_ai_activity_route_intent_line_draw_count += 1
				var arrow_pos := source_point.lerp(point, 0.68)
				var route_heading := (point - source_point).angle()
				var state_variant := str(route_item.get("stateVariant", "active")).strip_edges()
				if _draw_tianxia_yutu_ai_activity_route_arrow_asset(arrow_pos, route_heading, state_variant):
					_last_tianxia_yutu_ai_activity_route_intent_arrow_asset_draw_count += 1
					if state_variant == "queued":
						_last_tianxia_yutu_ai_activity_route_queued_variant_draw_count += 1
					else:
						_last_tianxia_yutu_ai_activity_route_active_variant_draw_count += 1
					if _last_tianxia_yutu_ai_activity_route_first_state_variant == "":
						_last_tianxia_yutu_ai_activity_route_first_state_variant = state_variant
					_last_tianxia_yutu_ai_activity_route_heading_applied_count += 1
					if _last_tianxia_yutu_ai_activity_route_heading_applied_count == 1:
						_last_tianxia_yutu_ai_activity_route_first_heading_radians = route_heading
		draw_circle(point, radius + 7.0, Color(0.08, 0.42, 0.40, 0.20))
		draw_arc(point, radius + TIANXIA_YUTU_HOTSPOT_HALO_RING_RADIUS_PAD, 0.0, TAU, 36, Color8(86, 230, 255, 182), TIANXIA_YUTU_HOTSPOT_HALO_RING_WIDTH, true)
		_last_tianxia_yutu_ai_activity_hotspot_halo_draw_count += 1
		if _draw_tianxia_yutu_ai_activity_hotspot_asset(point, radius):
			_last_tianxia_yutu_ai_activity_hotspot_visual_asset_draw_count += 1
		else:
			draw_arc(point, radius + 5.0, 0.0, TAU, 32, Color8(86, 230, 255, 205), 2.0, true)
			draw_circle(point, radius + 2.0, Color(0.02, 0.015, 0.01, 0.52))
			draw_circle(point, radius, Color8(255, 206, 92, 230))
		if cluster_count > 1:
			var cluster_pos := point + Vector2(radius + 7.0, -radius - 5.0)
			if _draw_tianxia_yutu_ai_activity_hotspot_cluster_badge_asset(cluster_pos, cluster_count):
				_last_tianxia_yutu_ai_activity_hotspot_cluster_badge_asset_draw_count += 1
			else:
				draw_circle(cluster_pos, 8.0, Color(0.02, 0.015, 0.01, 0.82))
				draw_circle(cluster_pos, 6.2, Color8(74, 220, 214, 236))
			draw_string(font, cluster_pos + Vector2(-3.2, 4.0), str(cluster_count), HORIZONTAL_ALIGNMENT_LEFT, -1.0, 12, Color(0.02, 0.015, 0.01, 0.92))
		var label := str(hotspot.get("label", "")).strip_edges()
		if label != "" and _last_tianxia_yutu_ai_activity_hotspot_label_draw_count < 3:
			var label_pos := point + Vector2(radius + 10.0, -radius - 7.0)
			if _draw_tianxia_yutu_ai_activity_hotspot_label_plate_asset(label_pos, label):
				_last_tianxia_yutu_ai_activity_hotspot_label_plate_asset_draw_count += 1
			var label_text_pos := label_pos + Vector2(17.0, 14.0)
			draw_string(font, label_text_pos + Vector2(1.0, 1.0), label, HORIZONTAL_ALIGNMENT_LEFT, 142.0, 14, Color(0.01, 0.01, 0.008, 0.88))
			draw_string(font, label_text_pos, label, HORIZONTAL_ALIGNMENT_LEFT, 142.0, 14, Color8(232, 251, 237, 242))
			_last_tianxia_yutu_ai_activity_hotspot_label_draw_count += 1
			if _last_tianxia_yutu_ai_activity_hotspot_first_label == "":
				_last_tianxia_yutu_ai_activity_hotspot_first_label = label
		_last_tianxia_yutu_ai_activity_hotspot_draw_count += 1
		_last_tianxia_yutu_ai_activity_hotspot_max_cluster_count = maxi(_last_tianxia_yutu_ai_activity_hotspot_max_cluster_count, cluster_count)


func _load_tianxia_yutu_ai_activity_hotspot_texture() -> void:
	_tianxia_yutu_ai_activity_hotspot_texture = _load_texture_with_fallback(TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_VISUAL_ASSET_PATH)
	_last_tianxia_yutu_ai_activity_hotspot_visual_asset_loaded = _tianxia_yutu_ai_activity_hotspot_texture != null


func _load_tianxia_yutu_ai_activity_hotspot_info_textures() -> void:
	_tianxia_yutu_ai_activity_hotspot_label_plate_texture = _load_texture_with_fallback(TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_LABEL_PLATE_ASSET_PATH)
	_tianxia_yutu_ai_activity_hotspot_cluster_badge_texture = _load_texture_with_fallback(TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_CLUSTER_BADGE_ASSET_PATH)
	_last_tianxia_yutu_ai_activity_hotspot_info_asset_loaded = _tianxia_yutu_ai_activity_hotspot_label_plate_texture != null and _tianxia_yutu_ai_activity_hotspot_cluster_badge_texture != null


func _load_tianxia_yutu_ai_activity_route_intent_textures() -> void:
	_tianxia_yutu_ai_activity_route_arrow_texture = _load_texture_with_fallback(TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_ROUTE_ARROW_ASSET_PATH)
	_last_tianxia_yutu_ai_activity_route_intent_asset_loaded = _tianxia_yutu_ai_activity_route_arrow_texture != null
	_tianxia_yutu_ai_activity_route_queued_arrow_texture = _load_texture_with_fallback(TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_ROUTE_QUEUED_ARROW_ASSET_PATH)
	_last_tianxia_yutu_ai_activity_route_state_variant_asset_loaded = _tianxia_yutu_ai_activity_route_arrow_texture != null and _tianxia_yutu_ai_activity_route_queued_arrow_texture != null


func _draw_tianxia_yutu_ai_activity_route_intent(source_point: Vector2, target_point: Vector2) -> bool:
	if source_point.distance_to(target_point) < 4.0:
		return false
	draw_line(source_point, target_point, Color(0.02, 0.015, 0.01, 0.38), 5.0, true)
	draw_line(source_point, target_point, Color8(78, 225, 218, 182), 2.4, true)
	draw_circle(source_point, TIANXIA_YUTU_ROUTE_ENDPOINT_ANCHOR_OUTER_RADIUS, Color(0.02, 0.015, 0.01, 0.58))
	draw_circle(source_point, TIANXIA_YUTU_ROUTE_ENDPOINT_ANCHOR_INNER_RADIUS, Color8(244, 186, 82, 210))
	draw_circle(target_point, TIANXIA_YUTU_ROUTE_TARGET_ANCHOR_RING_RADIUS, Color(0.02, 0.015, 0.01, 0.46))
	draw_arc(target_point, TIANXIA_YUTU_ROUTE_TARGET_ANCHOR_RING_RADIUS - 1.0, 0.0, TAU, 24, Color8(78, 225, 218, 190), 1.8, true)
	_last_tianxia_yutu_ai_activity_route_intent_endpoint_anchor_draw_count += 2
	return true


func _draw_tianxia_yutu_ai_activity_route_arrow_asset(arrow_pos: Vector2, route_heading: float, state_variant: String) -> bool:
	var arrow_texture := _tianxia_yutu_ai_activity_route_queued_arrow_texture if state_variant == "queued" else _tianxia_yutu_ai_activity_route_arrow_texture
	if arrow_texture == null:
		return false
	var draw_size := Vector2(72.0, 24.0) * clampf(_tianxia_yutu_zoom * 0.54, 0.72, 1.04)
	draw_set_transform(arrow_pos, route_heading, Vector2.ONE)
	draw_texture_rect(arrow_texture, Rect2(-draw_size * 0.5, draw_size), false, Color(1.0, 1.0, 1.0, 0.9))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	return true


func _draw_tianxia_yutu_ai_activity_hotspot_asset(point: Vector2, radius: float) -> bool:
	if _tianxia_yutu_ai_activity_hotspot_texture == null:
		return false
	var draw_size := Vector2.ONE * clampf(radius * 4.4, 38.0, 64.0)
	var draw_rect := Rect2(point - draw_size * 0.5, draw_size)
	draw_texture_rect(_tianxia_yutu_ai_activity_hotspot_texture, draw_rect, false, Color(1.0, 1.0, 1.0, 0.96))
	return true


func _draw_tianxia_yutu_ai_activity_hotspot_label_plate_asset(label_pos: Vector2, label: String) -> bool:
	if _tianxia_yutu_ai_activity_hotspot_label_plate_texture == null or label.strip_edges() == "":
		return false
	var draw_size := Vector2(192.0, 42.0) * clampf(_tianxia_yutu_zoom * 0.54, 0.64, 0.92)
	var draw_rect := Rect2(label_pos + Vector2(-6.0, -19.0), draw_size)
	draw_texture_rect(_tianxia_yutu_ai_activity_hotspot_label_plate_texture, draw_rect, false, Color(1.0, 1.0, 1.0, 0.94))
	return true


func _draw_tianxia_yutu_ai_activity_hotspot_cluster_badge_asset(cluster_pos: Vector2, cluster_count: int) -> bool:
	if _tianxia_yutu_ai_activity_hotspot_cluster_badge_texture == null or cluster_count <= 1:
		return false
	var draw_size := Vector2(42.0, 30.0) * clampf(_tianxia_yutu_zoom * 0.58, 0.72, 1.05)
	var draw_rect := Rect2(cluster_pos - draw_size * 0.5, draw_size)
	draw_texture_rect(_tianxia_yutu_ai_activity_hotspot_cluster_badge_texture, draw_rect, false, Color(1.0, 1.0, 1.0, 0.96))
	return true


func _resolve_tianxia_yutu_ai_activity_hotspot_cell(trace_item: Dictionary, marker_payload: Dictionary, target_tile_id: String) -> Dictionary:
	for key in ["targetCell", "target_cell", "cell_1km", "cell", "toCell"]:
		var marker_cell := _normalize_tianxia_yutu_ai_activity_cell(_dictionary_from_variant(marker_payload.get(key, {})))
		if not marker_cell.is_empty():
			return marker_cell
		var trace_cell := _normalize_tianxia_yutu_ai_activity_cell(_dictionary_from_variant(trace_item.get(key, {})))
		if not trace_cell.is_empty():
			return trace_cell
	for key in ["tileId", "toTileId"]:
		var marker_tile_id := str(marker_payload.get(key, "")).strip_edges()
		var marker_cell_from_tile := _resolve_tianxia_yutu_ai_activity_cell_from_tile_id(marker_tile_id)
		if not marker_cell_from_tile.is_empty():
			return marker_cell_from_tile
	var direct_cell := _resolve_tianxia_yutu_ai_activity_cell_from_tile_id(target_tile_id)
	if not direct_cell.is_empty():
		return direct_cell
	for key in ["tileId", "toTileId"]:
		var trace_tile_id := str(trace_item.get(key, "")).strip_edges()
		var trace_cell_from_tile := _resolve_tianxia_yutu_ai_activity_cell_from_tile_id(trace_tile_id)
		if not trace_cell_from_tile.is_empty():
			return trace_cell_from_tile
	return {}


func _resolve_tianxia_yutu_ai_activity_hotspot_source_cell(trace_item: Dictionary, marker_payload: Dictionary) -> Dictionary:
	for key in ["sourceCell", "source_cell", "fromCell", "originCell"]:
		var marker_cell := _normalize_tianxia_yutu_ai_activity_cell(_dictionary_from_variant(marker_payload.get(key, {})))
		if not marker_cell.is_empty():
			return marker_cell
		var trace_cell := _normalize_tianxia_yutu_ai_activity_cell(_dictionary_from_variant(trace_item.get(key, {})))
		if not trace_cell.is_empty():
			return trace_cell
	for key in ["sourceTileId", "fromTileId", "originTileId"]:
		var marker_tile_id := str(marker_payload.get(key, "")).strip_edges()
		var marker_cell_from_tile := _resolve_tianxia_yutu_ai_activity_cell_from_tile_id(marker_tile_id)
		if not marker_cell_from_tile.is_empty():
			return marker_cell_from_tile
		var trace_tile_id := str(trace_item.get(key, "")).strip_edges()
		var trace_cell_from_tile := _resolve_tianxia_yutu_ai_activity_cell_from_tile_id(trace_tile_id)
		if not trace_cell_from_tile.is_empty():
			return trace_cell_from_tile
	return {}


func _resolve_tianxia_yutu_ai_activity_route_state_variant(trace_item: Dictionary, marker_payload: Dictionary) -> String:
	for key in ["kind", "state", "status", "executionState"]:
		var marker_state := str(marker_payload.get(key, "")).strip_edges().to_lower()
		if marker_state == "queued" or marker_state == "queue" or marker_state == "pending":
			return "queued"
		var trace_state := str(trace_item.get(key, "")).strip_edges().to_lower()
		if trace_state == "queued" or trace_state == "queue" or trace_state == "pending":
			return "queued"
	return "active"


func _resolve_tianxia_yutu_ai_activity_cell_from_tile_id(tile_id: String) -> Dictionary:
	var normalized := tile_id.strip_edges()
	if normalized == "":
		return {}
	if normalized.find(",") > 0:
		var parts := normalized.split(",", false)
		if parts.size() >= 2 and str(parts[0]).strip_edges().is_valid_int() and str(parts[1]).strip_edges().is_valid_int():
			return _normalize_tianxia_yutu_ai_activity_cell({
				"x": int(str(parts[0]).strip_edges()),
				"y": int(str(parts[1]).strip_edges()),
			})
	if _tmx_cell_by_tile_id.has(normalized):
		var tmx_cell: Vector2i = _tmx_cell_by_tile_id[normalized] as Vector2i
		return _normalize_tianxia_yutu_ai_activity_cell({"x": tmx_cell.x, "y": tmx_cell.y})
	return {}


func _normalize_tianxia_yutu_ai_activity_cell(cell: Dictionary) -> Dictionary:
	if cell.is_empty():
		return {}
	var x: int = int(cell.get("x", cell.get("cellX", cell.get("cell_x", -1))))
	var y: int = int(cell.get("y", cell.get("cellY", cell.get("cell_y", -1))))
	if x < 0 or y < 0:
		return {}
	return {
		"x": clampi(x, 0, MAIN_MAP_WORLD_WIDTH_CELLS),
		"y": clampi(y, 0, MAIN_MAP_WORLD_HEIGHT_CELLS),
	}


func _resolve_tianxia_yutu_ai_activity_hotspot_label(trace_item: Dictionary, marker_payload: Dictionary) -> String:
	for key in ["label", "currentTaskText", "title", "summary"]:
		var marker_text := str(marker_payload.get(key, "")).strip_edges()
		if marker_text != "":
			return marker_text
		var trace_text := str(trace_item.get(key, "")).strip_edges()
		if trace_text != "":
			return trace_text
	return "战略节点活动"


func _draw_tianxia_yutu_outer_boundary_segments(strategic_layer: Dictionary, draw_pos: Vector2, draw_size: Vector2) -> void:
	var raw_outer_segments: Variant = strategic_layer.get("outer_boundary_segments", [])
	if not (raw_outer_segments is Array):
		return
	var border_entry: Dictionary = _world_map_overlay_family_entry("region_border_line")
	var palette_entry: Dictionary = _world_map_region_palette_entry("neutral")
	var border_color := _world_map_color_from_variant(palette_entry.get("border", "#50EBF587"), Color8(80, 235, 245, 135))
	var shadow_color := _world_map_color_from_variant(palette_entry.get("fill", "#0A52595A"), Color8(10, 82, 89, 90))
	var border_width: float = maxf(_world_map_width_px_from_entry(border_entry, _world_map_zoom_semantic_tier(), 2.0), WORLD_MAP_REGION_BORDER_WIDTH_MIN)
	for segment_variant in raw_outer_segments as Array:
		if not (segment_variant is Dictionary):
			continue
		var segment: Dictionary = segment_variant as Dictionary
		if str(segment.get("render_overlay_id", "frontiers")).strip_edges() != "frontiers":
			continue
		var points := _tianxia_yutu_segment_points_to_preview_point_cloud(segment, draw_pos, draw_size)
		if points.size() < 2:
			continue
		draw_polyline(points, shadow_color, border_width + 1.4, true)
		draw_polyline(points, border_color, border_width, true)
		_last_tianxia_yutu_state_boundary_draw_count += 1


func _draw_main_world_mountain_boundary_assets(visible_bounds: Dictionary) -> void:
	if not main_world_mountain_boundary_assets_enabled:
		return
	if _main_map_mountain_boundary_layer.is_empty():
		return
	if _main_world_mountain_boundary_texture_by_piece_id.is_empty():
		return
	var raw_placements: Variant = _main_map_mountain_boundary_layer.get("visible_placements", [])
	if not (raw_placements is Array):
		return
	var render_pieces: Array = []
	for placement_variant in raw_placements as Array:
		if not (placement_variant is Dictionary):
			continue
		var placement: Dictionary = placement_variant as Dictionary
		var raw_pieces: Variant = placement.get("render_pieces", [])
		if not (raw_pieces is Array):
			continue
		for piece_variant in raw_pieces as Array:
			if piece_variant is Dictionary:
				render_pieces.append(piece_variant)
	render_pieces.sort_custom(Callable(self, "_sort_main_world_mountain_boundary_render_piece"))
	for piece_variant in render_pieces:
		var piece: Dictionary = piece_variant as Dictionary
		var anchor_cell: Vector2i = _vector2i_from_json_array(piece.get("cell_1km", []), Vector2i(-1, -1))
		if anchor_cell.x < 0 or anchor_cell.y < 0:
			_last_main_world_mountain_boundary_sprite_failed_count += 1
			continue
		# The backend already filters visible placements with a preload margin. Do not
		# cull large mountain sprites by anchor cell; their anchor can sit outside the
		# viewport while the footprint still overlaps the screen.
		if _draw_main_world_mountain_boundary_piece(piece, anchor_cell):
			_last_main_world_mountain_boundary_sprite_draw_count += 1
		else:
			_last_main_world_mountain_boundary_sprite_failed_count += 1


func _sort_main_world_mountain_boundary_render_piece(a: Variant, b: Variant) -> bool:
	var left: Dictionary = a as Dictionary if a is Dictionary else {}
	var right: Dictionary = b as Dictionary if b is Dictionary else {}
	var left_cell: Vector2i = _vector2i_from_json_array(left.get("cell_1km", []), Vector2i.ZERO)
	var right_cell: Vector2i = _vector2i_from_json_array(right.get("cell_1km", []), Vector2i.ZERO)
	var left_key: int = left_cell.x + left_cell.y
	var right_key: int = right_cell.x + right_cell.y
	if left_key == right_key:
		return left_cell.y < right_cell.y
	return left_key < right_key


func _resolve_main_world_mountain_boundary_piece_visibility_margin(piece: Dictionary) -> int:
	var piece_id: String = str(piece.get("piece_id", "")).strip_edges()
	var meta_variant: Variant = _main_world_mountain_boundary_piece_meta_by_id.get(piece_id, {})
	var meta: Dictionary = meta_variant as Dictionary if meta_variant is Dictionary else {}
	var fit_cells: Vector2 = _vector2_from_json_array(
		piece.get("fit_footprint_cells", meta.get("fit_footprint_cells", [])),
		Vector2(8.0, 8.0)
	)
	return maxi(10, int(ceil(maxf(absf(fit_cells.x), absf(fit_cells.y)))) + 12)


func _draw_main_world_mountain_boundary_piece(piece: Dictionary, anchor_cell: Vector2i) -> bool:
	var piece_id: String = str(piece.get("piece_id", "")).strip_edges()
	if piece_id == "":
		return false
	var asset_path: String = str(piece.get("asset_path", "")).strip_edges()
	var texture: Texture2D = _resolve_main_world_mountain_boundary_piece_texture(piece_id, asset_path)
	if texture == null:
		return false
	var raw_size: Vector2 = texture.get_size()
	if raw_size.x <= 0.0 or raw_size.y <= 0.0:
		return false
	var meta_variant: Variant = _main_world_mountain_boundary_piece_meta_by_id.get(piece_id, {})
	var meta: Dictionary = meta_variant as Dictionary if meta_variant is Dictionary else {}
	var source_anchor: Vector2 = _vector2_from_json_array(
		piece.get("source_anchor_px", meta.get("source_anchor_px", [])),
		raw_size * 0.5
	)
	var source_cell_width: float = maxf(
		1.0,
		float(piece.get("source_cell_width_px", meta.get("source_cell_width_px", 64.0)))
	)
	var visual_fit_scale: float = clampf(
		float(piece.get("visual_fit_scale", meta.get("visual_fit_scale", 1.0))) * main_world_mountain_boundary_asset_scale,
		0.05,
		4.0
	)
	var scale: float = clampf((_tmx_tile_width * _zoom / source_cell_width) * visual_fit_scale, 0.01, 12.0)
	var draw_size: Vector2 = raw_size * scale
	var destination_anchor: Vector2 = _tmx_to_screen(anchor_cell.x, anchor_cell.y)
	var draw_rect := Rect2(destination_anchor - source_anchor * scale, draw_size)
	draw_texture_rect(
		texture,
		draw_rect,
		false,
		Color(1.0, 1.0, 1.0, clampf(main_world_mountain_boundary_asset_alpha, 0.0, 1.0))
	)
	if draw_rect.intersects(Rect2(Vector2.ZERO, get_viewport_rect().size)):
		_last_main_world_mountain_boundary_sprite_on_screen_count += 1
	return true


func _resolve_main_world_mountain_boundary_piece_texture(piece_id: String, asset_path: String) -> Texture2D:
	var texture: Texture2D = _main_world_mountain_boundary_texture_by_piece_id.get(piece_id, null) as Texture2D
	if texture != null:
		return texture
	if asset_path == "":
		return null
	texture = _load_texture_with_fallback(asset_path)
	if texture != null:
		_main_world_mountain_boundary_texture_by_piece_id[piece_id] = texture
	return texture


func _draw_main_world_chokepoint_assets(_visible_bounds: Dictionary) -> void:
	if not main_world_mountain_boundary_assets_enabled:
		return
	if _main_map_chokepoint_layer.is_empty():
		return
	var raw_nodes: Variant = _main_map_chokepoint_layer.get("visible_nodes", [])
	if not (raw_nodes is Array):
		return
	var render_pieces: Array = []
	for node_variant in raw_nodes as Array:
		if not (node_variant is Dictionary):
			continue
		var node: Dictionary = node_variant as Dictionary
		var raw_pieces: Variant = node.get("render_pieces", [])
		if not (raw_pieces is Array):
			continue
		for piece_variant in raw_pieces as Array:
			if piece_variant is Dictionary:
				render_pieces.append(piece_variant)
	render_pieces.sort_custom(Callable(self, "_sort_main_world_mountain_boundary_render_piece"))
	for piece_variant in render_pieces:
		var piece: Dictionary = piece_variant as Dictionary
		var anchor_cell: Vector2i = _vector2i_from_json_array(piece.get("cell_1km", []), Vector2i(-1, -1))
		if anchor_cell.x < 0 or anchor_cell.y < 0:
			_last_main_world_chokepoint_sprite_failed_count += 1
			continue
		if _draw_main_world_chokepoint_piece(piece, anchor_cell):
			_last_main_world_chokepoint_sprite_draw_count += 1
		else:
			_last_main_world_chokepoint_sprite_failed_count += 1


func _draw_main_world_chokepoint_piece(piece: Dictionary, anchor_cell: Vector2i) -> bool:
	var piece_id: String = str(piece.get("piece_id", "")).strip_edges()
	if piece_id == "":
		return false
	var asset_path: String = str(piece.get("asset_path", "")).strip_edges()
	var texture: Texture2D = _resolve_main_world_mountain_boundary_piece_texture(piece_id, asset_path)
	if texture == null:
		return false
	var raw_size: Vector2 = texture.get_size()
	if raw_size.x <= 0.0 or raw_size.y <= 0.0:
		return false
	var source_anchor: Vector2 = _vector2_from_json_array(piece.get("source_anchor_px", []), raw_size * 0.5)
	var source_cell_width: float = maxf(1.0, float(piece.get("source_cell_width_px", 153.6)))
	var visual_fit_scale: float = clampf(
		float(piece.get("visual_fit_scale", 1.0)) * main_world_mountain_boundary_asset_scale,
		0.05,
		4.0
	)
	var scale: float = clampf((_tmx_tile_width * _zoom / source_cell_width) * visual_fit_scale, 0.01, 12.0)
	var draw_size: Vector2 = raw_size * scale
	var destination_anchor: Vector2 = _tmx_to_screen(anchor_cell.x, anchor_cell.y)
	var draw_rect := Rect2(destination_anchor - source_anchor * scale, draw_size)
	draw_texture_rect(
		texture,
		draw_rect,
		false,
		Color(1.0, 1.0, 1.0, clampf(main_world_mountain_boundary_asset_alpha, 0.0, 1.0))
	)
	if draw_rect.intersects(Rect2(Vector2.ZERO, get_viewport_rect().size)):
		_last_main_world_chokepoint_sprite_on_screen_count += 1
	return true


func _tianxia_yutu_segment_points_to_preview_polyline(segment: Dictionary, draw_pos: Vector2, draw_size: Vector2) -> PackedVector2Array:
	var result := PackedVector2Array()
	var raw_points: Variant = segment.get("cell_1km_polyline", [])
	if not (raw_points is Array):
		return result
	for point_variant in raw_points as Array:
		if not (point_variant is Dictionary):
			continue
		var point: Dictionary = point_variant as Dictionary
		result.append(_tianxia_yutu_cell_to_preview_point(point, draw_pos, draw_size))
	return result


func _tianxia_yutu_segment_points_to_preview_point_cloud(segment: Dictionary, draw_pos: Vector2, draw_size: Vector2) -> PackedVector2Array:
	var result := PackedVector2Array()
	var raw_points: Variant = segment.get("cell_1km_point_cloud", [])
	if not (raw_points is Array):
		return result
	for point_variant in raw_points as Array:
		if not (point_variant is Dictionary):
			continue
		var point: Dictionary = point_variant as Dictionary
		result.append(_tianxia_yutu_cell_to_preview_point(point, draw_pos, draw_size))
	return result


func _draw_main_world_frontline_markers(visible_bounds: Dictionary) -> void:
	if _main_world_frontline_markers.is_empty():
		return
	var route_entry: Dictionary = _world_map_route_family_entry("selected_route")
	var route_shadow_color := _world_map_color_from_variant(route_entry.get("shadowColor", "#06120E94"), Color(0.02, 0.015, 0.01, 0.58))
	var route_width: float = maxf(
		_world_map_width_px_from_entry(route_entry, "local", 4.5) * WORLD_MAP_ROUTE_LINE_WIDTH_SCALE,
		WORLD_MAP_ROUTE_LINE_WIDTH_MIN
	)
	for marker_variant in _main_world_frontline_markers:
		if not (marker_variant is Dictionary):
			continue
		var marker: Dictionary = marker_variant as Dictionary
		var from_cell: Dictionary = _dictionary_from_variant(marker.get("fromCell", marker.get("from_cell", {})))
		var to_cell: Dictionary = _dictionary_from_variant(marker.get("toCell", marker.get("to_cell", {})))
		if from_cell.is_empty() or to_cell.is_empty():
			continue
		var from_x: int = int(from_cell.get("x", -1))
		var from_y: int = int(from_cell.get("y", -1))
		var to_x: int = int(to_cell.get("x", -1))
		var to_y: int = int(to_cell.get("y", -1))
		if not _frontline_segment_intersects_visible_bounds(from_x, from_y, to_x, to_y, visible_bounds):
			continue
		var from_point := _tmx_to_screen(from_x, from_y)
		var to_point := _tmx_to_screen(to_x, to_y)
		if from_point.distance_to(to_point) < 8.0:
			continue
		var faction_id := str(marker.get("factionId", marker.get("faction_id", ""))).strip_edges()
		var marker_color := _resolve_main_world_frontline_marker_color(faction_id)
		draw_line(from_point, to_point, route_shadow_color, route_width + 3.5, true)
		draw_line(from_point, to_point, marker_color, route_width, true)
		_draw_main_world_frontline_arrowhead(from_point, to_point, marker_color)
		_last_main_world_frontline_draw_count += 1
		_last_main_world_frontline_arrow_draw_count += 1
		if _last_main_world_frontline_marker_label == "":
			_last_main_world_frontline_marker_label = str(marker.get("label", "")).strip_edges()


func _frontline_segment_intersects_visible_bounds(
	from_x: int,
	from_y: int,
	to_x: int,
	to_y: int,
	visible_bounds: Dictionary
) -> bool:
	var margin := 48
	var start_x: int = int(visible_bounds.get("startX", 0)) - margin
	var end_x: int = int(visible_bounds.get("endX", -1)) + margin
	var start_y: int = int(visible_bounds.get("startY", 0)) - margin
	var end_y: int = int(visible_bounds.get("endY", -1)) + margin
	var min_x: int = mini(from_x, to_x)
	var max_x: int = maxi(from_x, to_x)
	var min_y: int = mini(from_y, to_y)
	var max_y: int = maxi(from_y, to_y)
	return max_x >= start_x and min_x <= end_x and max_y >= start_y and min_y <= end_y


func _resolve_main_world_frontline_marker_color(faction_id: String) -> Color:
	if faction_id.strip_edges().to_lower() == "player":
		return Color(0.98, 0.66, 0.22, 0.96)
	return Color(0.82, 0.92, 1.0, 0.90)


func _draw_main_world_frontline_arrowhead(from_point: Vector2, to_point: Vector2, color: Color) -> void:
	var direction := to_point - from_point
	if direction.length() < 0.01:
		return
	var unit := direction.normalized()
	var side := Vector2(-unit.y, unit.x)
	var arrow_len := clampf(20.0 * _zoom, 10.0, 28.0)
	var arrow_width := clampf(12.0 * _zoom, 6.0, 18.0)
	var tip := to_point
	var base := tip - unit * arrow_len
	var left := base + side * arrow_width
	var right := base - side * arrow_width
	draw_polygon(PackedVector2Array([tip, left, right]), PackedColorArray([color, color, color]))
	draw_polyline(PackedVector2Array([tip, left, right, tip]), Color(0.02, 0.015, 0.01, 0.62), 2.0, true)


func _tianxia_yutu_cell_to_preview_point(cell: Dictionary, draw_pos: Vector2, draw_size: Vector2) -> Vector2:
	var cell_x: float = float(cell.get("x", 0.0))
	var cell_y: float = float(cell.get("y", 0.0))
	var x_ratio: float = clampf(cell_x / float(MAIN_MAP_WORLD_WIDTH_CELLS), 0.0, 1.0)
	var y_ratio: float = clampf(cell_y / float(MAIN_MAP_WORLD_HEIGHT_CELLS), 0.0, 1.0)
	return draw_pos + Vector2(draw_size.x * x_ratio, draw_size.y * y_ratio)


func _resolve_tianxia_yutu_frontline_marker_color(faction_id: String) -> Color:
	var fallback := Color(1.0, 0.72, 0.24, 0.62)
	var faction_layer: Dictionary = _tianxia_yutu_overview_layer.get("faction_color_layer", {}) as Dictionary if _tianxia_yutu_overview_layer.get("faction_color_layer", {}) is Dictionary else {}
	var raw_entries: Variant = faction_layer.get("current_runtime_color_entries", [])
	if not (raw_entries is Array):
		return fallback
	for entry_variant in raw_entries as Array:
		if not (entry_variant is Dictionary):
			continue
		var entry: Dictionary = entry_variant as Dictionary
		if str(entry.get("faction_id", "")).strip_edges() != faction_id:
			continue
		var color_hex := str(entry.get("color_hex", "")).strip_edges()
		if color_hex.begins_with("#") and color_hex.length() == 7:
			var resolved := Color.from_string(color_hex, fallback)
			resolved.a = 0.62
			return resolved
	return fallback


func _draw_tianxia_yutu_frontline_arrowhead(from_point: Vector2, to_point: Vector2, color: Color) -> void:
	var direction := to_point - from_point
	if direction.length() <= 0.1:
		return
	direction = direction.normalized()
	var normal := Vector2(-direction.y, direction.x)
	var tip := to_point
	var length := 13.0
	var wing := 6.0
	var left := tip - direction * length + normal * wing
	var right := tip - direction * length - normal * wing
	var outline := PackedVector2Array([tip, left, right, tip])
	draw_polyline(outline, Color(0.02, 0.015, 0.01, 0.32), 2.4, true)
	draw_polygon(
		PackedVector2Array([tip, left, right]),
		PackedColorArray([color, color, color])
	)


func _draw_tmx_cell(tmx_x: int, tmx_y: int) -> void:
	if _main_map_runtime_tmx_width() <= 0 or _main_map_runtime_tmx_height() <= 0:
		return
	var tmx_key: String = _coord_key(tmx_x, tmx_y)
	var has_resource_overlay: bool = _resource_overlay_by_tmx_key.has(tmx_key)
	if not has_resource_overlay and not _is_main_world_cell_layer_active() and empty_cell_resource_fill_enabled and _should_fill_empty_cell_with_resource(tmx_x, tmx_y):
		var filler_frame: String = _resolve_empty_cell_resource_fill_frame(tmx_x, tmx_y)
		if _draw_world_resource_frame(filler_frame, _tmx_to_screen(tmx_x, tmx_y), empty_cell_resource_fill_alpha):
			return
	if _should_world_cell_block_free_cell_base(tmx_key):
		return
	if not free_cell_base_enabled:
		return
	_draw_free_cell_base(tmx_x, tmx_y)


func _should_fill_empty_cell_with_resource(tmx_x: int, tmx_y: int) -> bool:
	var tmx_key: String = _coord_key(tmx_x, tmx_y)
	if _should_world_cell_block_empty_resource_fill(tmx_key):
		return false
	if _resource_overlay_by_tmx_key.has(tmx_key):
		return false
	return true


func _resolve_empty_cell_resource_fill_frame(tmx_x: int, tmx_y: int) -> String:
	var hash_value: int = int(abs((tmx_x * 83492791) ^ (tmx_y * 2971215073)))
	var kind_index: int = posmod(hash_value, 5)
	var kind: String = "grain"
	match kind_index:
		1:
			kind = "wood"
		2:
			kind = "stone"
		3:
			kind = "iron"
		4:
			kind = "copper"
	if empty_cell_resource_fill_base_frames_enabled and posmod(int(hash_value / 11), 10) == 0:
		return "world_resource_%s_base_v1.png" % kind
	var level_max: int = clampi(empty_cell_resource_fill_max_level, 1, 9)
	var level: int = 1 + posmod(int(hash_value / 7), level_max)
	return "world_resource_%s_l%02d_v1.png" % [kind, level]


func _draw_world_cell_nodes(visible_bounds: Dictionary) -> void:
	_last_world_cell_anchor_visible_count = 0
	_last_world_cell_node_draw_count = 0
	_last_world_cell_node_draw_failed_count = 0
	if not world_cell_node_visuals_enabled:
		return
	_draw_world_cell_base_nodes(visible_bounds)
	if _world_cell_node_anchor_by_tmx_key.is_empty():
		return
	for anchor_variant in _world_cell_node_anchor_by_tmx_key.values():
		if not (anchor_variant is Dictionary):
			continue
		var anchor_entry: Dictionary = anchor_variant as Dictionary
		var tmx_x: int = int(anchor_entry.get("tmxX", -1))
		var tmx_y: int = int(anchor_entry.get("tmxY", -1))
		if tmx_x < 0 or tmx_y < 0:
			continue
		if not _is_tmx_cell_visible(tmx_x, tmx_y, visible_bounds, _resolve_world_cell_anchor_visibility_margin(anchor_entry)):
			continue
		_last_world_cell_anchor_visible_count += 1
		if _draw_world_cell_node(tmx_x, tmx_y, anchor_entry):
			_last_world_cell_node_draw_count += 1
		else:
			_last_world_cell_node_draw_failed_count += 1


func _draw_world_cell_base_nodes(visible_bounds: Dictionary) -> void:
	if _world_cell_node_base_by_tmx_key.is_empty():
		return
	for base_variant in _world_cell_node_base_by_tmx_key.values():
		if not (base_variant is Dictionary):
			continue
		var base_entry: Dictionary = base_variant as Dictionary
		var tmx_x: int = int(base_entry.get("tmxX", -1))
		var tmx_y: int = int(base_entry.get("tmxY", -1))
		if tmx_x < 0 or tmx_y < 0:
			continue
		if not _is_tmx_cell_visible(tmx_x, tmx_y, visible_bounds, 1):
			continue
		var cell_center: Vector2 = _tmx_to_screen(tmx_x, tmx_y)
		var base_mode: String = str(base_entry.get("baseMode", "frame")).strip_edges().to_lower()
		if base_mode == "free_cell_base":
			_draw_free_cell_base(tmx_x, tmx_y, world_cell_node_visual_alpha * float(base_entry.get("alpha", zero_level_substrate_alpha)))
		else:
			var frame_offset: Vector2 = _vector2_from_json_array(base_entry.get("offset", []), Vector2.ZERO) * _zoom
			_draw_world_cell_frame(
				str(base_entry.get("frame", "world_cell_city_ground_base_v1.png")),
				cell_center + frame_offset,
				world_cell_node_visual_alpha * float(base_entry.get("alpha", 0.96)),
				float(base_entry.get("scale", 1.0))
			)
		_draw_world_cell_base_state_overlay(cell_center, base_entry)


func _resolve_world_cell_anchor_visibility_margin(anchor_entry: Dictionary) -> int:
	var footprint_tiles: Array = _resolve_world_cell_footprint_tiles(str(anchor_entry.get("footprintId", "")), [3, 3])
	if footprint_tiles.size() < 2:
		return 3
	var side_length: int = maxi(int(footprint_tiles[0]), int(footprint_tiles[1]))
	return maxi(3, int(ceil(float(side_length) * 0.5)) + 2)


func _is_world_cell_city_footprint_id(footprint_id: String) -> bool:
	var normalized_id: String = footprint_id.strip_edges().to_lower()
	return (
		normalized_id.begins_with("player_city_")
		or normalized_id.begins_with("ai_city_")
		or normalized_id.begins_with("system_city_")
	)


func _draw_world_cell_node(tmx_x: int, tmx_y: int, anchor_entry: Dictionary) -> bool:
	var cell_center: Vector2 = _tmx_to_screen(tmx_x, tmx_y)
	var drawn: bool = false
	if anchor_entry.is_empty():
		return false
	var frame_name: String = str(anchor_entry.get("frame", "")).strip_edges()
	if frame_name != "":
		var frame_offset: Vector2 = _vector2_from_json_array(anchor_entry.get("offset", []), Vector2.ZERO) * _zoom
		drawn = _draw_world_cell_frame(
			frame_name,
			cell_center + frame_offset,
			world_cell_node_visual_alpha * float(anchor_entry.get("alpha", 0.86)),
			float(anchor_entry.get("scale", 0.36))
		) or drawn
	else:
		var composite_offset: Vector2 = _vector2_from_json_array(anchor_entry.get("offset", []), Vector2.ZERO) * _zoom
		var layered_layers_variant: Variant = anchor_entry.get("layeredLayers", [])
		if layered_layers_variant is Array and not (layered_layers_variant as Array).is_empty():
			drawn = _draw_world_cell_layers(
				layered_layers_variant as Array,
				cell_center + composite_offset,
				world_cell_node_visual_alpha * float(anchor_entry.get("alpha", 1.0))
			) or drawn
		var payload_slots_variant: Variant = anchor_entry.get("payloadSlots", [])
		if payload_slots_variant is Array and not (payload_slots_variant as Array).is_empty():
			drawn = _draw_world_cell_payload_slots(
				payload_slots_variant as Array,
				cell_center + composite_offset,
				world_cell_node_visual_alpha * float(anchor_entry.get("alpha", 1.0))
			) or drawn
		else:
			var composite_id: String = str(anchor_entry.get("compositeId", "")).strip_edges()
			if composite_id != "":
				drawn = _draw_world_cell_composite(
					composite_id,
					cell_center + composite_offset,
					world_cell_node_visual_alpha * float(anchor_entry.get("alpha", 1.0))
				) or drawn
			else:
				drawn = _draw_world_cell_placeholder(anchor_entry, cell_center + composite_offset) or drawn
	return drawn


func _draw_free_cell_base(tmx_x: int, tmx_y: int, alpha_override: float = -1.0) -> void:
	var center: Vector2 = _tmx_to_screen(tmx_x, tmx_y)
	if _draw_zero_level_substrate_cell(center, alpha_override):
		return
	var half_w: float = _tmx_tile_width * 0.5 * _zoom
	var half_h: float = _tmx_tile_height * 0.5 * _zoom
	var points := PackedVector2Array(
		[
			Vector2(center.x, center.y - half_h),
			Vector2(center.x + half_w, center.y),
			Vector2(center.x, center.y + half_h),
			Vector2(center.x - half_w, center.y),
		]
	)
	var variation: float = float(posmod((tmx_x * 1103515245 + tmx_y * 12345), 7)) / 6.0
	var alpha: float = clampf(alpha_override if alpha_override >= 0.0 else free_cell_base_alpha, 0.0, 0.55)
	var fill := Color(
		lerpf(0.29, 0.34, variation),
		lerpf(0.35, 0.40, variation),
		lerpf(0.31, 0.35, variation),
		alpha
	)
	var outline := Color(0.54, 0.58, 0.48, alpha * 0.58)
	draw_colored_polygon(points, fill)
	var outline_points := PackedVector2Array(points)
	outline_points.append(points[0])
	draw_polyline(outline_points, outline, max(0.6, _zoom * 0.65))
	return


func _draw_zero_level_substrate_cell(cell_center: Vector2, alpha_override: float = -1.0) -> bool:
	if not zero_level_substrate_enabled:
		return false
	if _zero_level_substrate_texture == null:
		return false
	var raw_size: Vector2 = _zero_level_substrate_texture.get_size()
	if raw_size.x <= 0.0 or raw_size.y <= 0.0:
		return false
	var tile_screen_width: float = max(1.0, _tmx_tile_width * _zoom)
	var tile_screen_height: float = max(1.0, _tmx_tile_height * _zoom)
	var scale: float = min(
		tile_screen_width / max(1.0, raw_size.x),
		tile_screen_height / max(1.0, raw_size.y)
	)
	var draw_size: Vector2 = raw_size * scale
	var draw_rect := Rect2(cell_center - draw_size * 0.5, draw_size)
	var alpha: float = clampf(alpha_override if alpha_override >= 0.0 else zero_level_substrate_alpha, 0.0, 1.0)
	draw_texture_rect(_zero_level_substrate_texture, draw_rect, false, Color(1.0, 1.0, 1.0, alpha))
	var outline_alpha: float = clampf(min(alpha, free_cell_base_alpha) * 0.42, 0.0, 0.28)
	if outline_alpha > 0.001:
		var half_w: float = _tmx_tile_width * 0.5 * _zoom
		var half_h: float = _tmx_tile_height * 0.5 * _zoom
		var points := PackedVector2Array([
			Vector2(cell_center.x, cell_center.y - half_h),
			Vector2(cell_center.x + half_w, cell_center.y),
			Vector2(cell_center.x, cell_center.y + half_h),
			Vector2(cell_center.x - half_w, cell_center.y),
			Vector2(cell_center.x, cell_center.y - half_h),
		])
		draw_polyline(points, Color(0.20, 0.25, 0.18, outline_alpha), max(0.35, _zoom * 0.35))
	_last_zero_level_substrate_draw_count += 1
	return true


func _draw_resource_level_overlays(visible_bounds: Dictionary) -> void:
	if not resource_overlay_enabled:
		return
	if _resource_overlay_entries.is_empty():
		return

	var font: Font = ThemeDB.fallback_font
	var zoom_alpha: float = _resource_overlay_alpha_for_zoom()
	for entry_variant in _resource_overlay_entries:
		if not (entry_variant is Dictionary):
			continue
		var entry: Dictionary = entry_variant as Dictionary
		var tmx_x: int = int(entry.get("tmxX", -1))
		var tmx_y: int = int(entry.get("tmxY", -1))
		if not _is_tmx_cell_visible(tmx_x, tmx_y, visible_bounds, 1):
			continue
		var resource_cell_key: String = _coord_key(tmx_x, tmx_y)
		if _should_world_cell_block_resource_overlay(resource_cell_key):
			continue
		var level: int = clampi(maxi(1, int(entry.get("resourceLevel", 1))), 1, 9)
		var cell_center: Vector2 = _tmx_to_screen(tmx_x, tmx_y)
		var marker_center: Vector2 = cell_center + Vector2(0.0, -_tmx_tile_height * 0.16 * _zoom)
		var overlay_frame: String = str(entry.get("overlayFrame", ""))
		var texture_drawn: bool = false
		var world_resource_png_drawn: bool = false
		if _world_resource_frame_meta_by_frame.has(overlay_frame):
			world_resource_png_drawn = _draw_world_resource_frame(overlay_frame, cell_center, zoom_alpha)
			texture_drawn = world_resource_png_drawn
		else:
			texture_drawn = _draw_overlay_frame(
				overlay_frame,
				marker_center,
				clampf(resource_overlay_base_height * _zoom, 12.0, 64.0),
				zoom_alpha
			)
		if texture_drawn:
			if resource_cell_debug_overlay_enabled and world_resource_png_drawn:
				_resource_debug_png_drawn_tmx_keys[resource_cell_key] = true
			if resource_overlay_text_enabled and font != null and _zoom >= 0.72:
				var text: String = str(level)
				var font_size: int = int(clampf(11.0 * _zoom, 8.0, 13.0))
				_draw_centered_text(font, marker_center + Vector2(0.0, clampf(10.0 * _zoom, 3.0, 8.0)), text, font_size, Color(0.05, 0.05, 0.05, 0.95))
			continue

		var radius: float = clampf(4.8 * _zoom, 2.0, 8.6)
		var fill_color: Color = _resource_level_color(level)
		draw_circle(marker_center, radius + 1.0, Color(0.0, 0.0, 0.0, 0.52))
		draw_circle(marker_center, radius, fill_color)
		draw_arc(marker_center, radius + 0.3, 0.0, TAU, 20, Color(1.0, 1.0, 1.0, 0.58), 1.0)
		if resource_overlay_text_enabled and font != null and _zoom >= 0.50:
			var text_fallback: String = str(level)
			var font_size_fallback: int = int(clampf(12.0 * _zoom, 8.0, 15.0))
			_draw_centered_text(font, marker_center + Vector2(0.0, radius * 0.42), text_fallback, font_size_fallback, Color(0.05, 0.05, 0.05, 0.95))


func _draw_main_world_cell_layer(visible_bounds: Dictionary) -> void:
	if not main_world_cell_layer_enabled:
		return
	if not _is_main_world_cell_layer_active():
		return
	var start_x: int = int(visible_bounds.get("startX", 0))
	var end_x: int = int(visible_bounds.get("endX", -1))
	var start_y: int = int(visible_bounds.get("startY", 0))
	var end_y: int = int(visible_bounds.get("endY", -1))
	if start_x > end_x or start_y > end_y:
		return
	var candidate_count: int = max(0, end_x - start_x + 1) * max(0, end_y - start_y + 1)
	var sampling_step: int = _resolve_sampling_step(candidate_count)
	var outline_alpha: float = clampf(main_world_cell_layer_alpha, 0.02, 0.45)
	var outline := Color(0.62, 0.82, 0.86, outline_alpha)
	var fill := Color(0.20, 0.38, 0.40, outline_alpha * 0.10)
	var draw_count: int = 0
	for tmx_y in range(start_y, end_y + 1, sampling_step):
		for tmx_x in range(start_x, end_x + 1, sampling_step):
			if draw_count >= MAX_VISIBLE_TILE_DRAW_COUNT:
				return
			var cell_x: int = _main_map_runtime_tmx_axis_to_cell(float(tmx_x), _main_map_runtime_tmx_width(), MAIN_MAP_WORLD_WIDTH_CELLS)
			var cell_y: int = _main_map_runtime_tmx_axis_to_cell(float(tmx_y), _main_map_runtime_tmx_height(), MAIN_MAP_WORLD_HEIGHT_CELLS)
			if not _is_main_world_cell_selectable(cell_x, cell_y):
				continue
			_draw_tile_diamond_overlay(
				_tmx_to_screen(tmx_x, tmx_y),
				fill,
				outline,
				max(0.45, _zoom * 0.45)
			)
			draw_count += 1


func _draw_main_world_substrate_chunk_layer(visible_bounds: Dictionary) -> void:
	if not _is_main_world_substrate_chunk_renderer_active():
		return
	if zero_level_substrate_enabled and _zero_level_substrate_texture != null:
		return
	var visible_start_x: int = int(visible_bounds.get("startX", 0))
	var visible_end_x: int = int(visible_bounds.get("endX", -1))
	var visible_start_y: int = int(visible_bounds.get("startY", 0))
	var visible_end_y: int = int(visible_bounds.get("endY", -1))
	for texture_variant in _main_map_substrate_chunk_texture_by_id.values():
		if not (texture_variant is Dictionary):
			continue
		var texture_data: Dictionary = texture_variant as Dictionary
		var start_x: int = int(texture_data.get("startX", 0))
		var start_y: int = int(texture_data.get("startY", 0))
		var end_x_exclusive: int = int(texture_data.get("endXExclusive", 0))
		var end_y_exclusive: int = int(texture_data.get("endYExclusive", 0))
		if end_x_exclusive <= visible_start_x or start_x > visible_end_x:
			continue
		if end_y_exclusive <= visible_start_y or start_y > visible_end_y:
			continue
		var chunk_id: String = str(texture_data.get("chunkId", "")).strip_edges()
		var fill: Color = _resolve_main_world_substrate_chunk_color(chunk_id)
		var outline: Color = Color(fill.r * 0.78, fill.g * 0.78, fill.b * 0.78, 0.22)
		var points := PackedVector2Array([
			_tmx_to_screen(start_x, start_y),
			_tmx_to_screen(maxi(start_x, end_x_exclusive - 1), start_y),
			_tmx_to_screen(maxi(start_x, end_x_exclusive - 1), maxi(start_y, end_y_exclusive - 1)),
			_tmx_to_screen(start_x, maxi(start_y, end_y_exclusive - 1)),
		])
		draw_colored_polygon(points, fill)
		var outline_points := PackedVector2Array(points)
		outline_points.append(points[0])
		draw_polyline(outline_points, outline, max(0.4, _zoom * 0.35))


func _resolve_main_world_substrate_chunk_color(chunk_id: String) -> Color:
	var hash_value: int = int(abs(chunk_id.hash()))
	var variation: float = float(posmod(hash_value, 11)) / 10.0
	return Color(
		lerpf(0.25, 0.33, variation),
		lerpf(0.34, 0.43, variation),
		lerpf(0.28, 0.36, variation),
		0.34
	)


func _draw_main_map_cell_owner_overrides(visible_bounds: Dictionary) -> void:
	_last_main_map_owner_override_draw_count = 0
	_last_main_map_owner_override_relation_counts = {"own": 0, "ally": 0, "enemy": 0, "neutral": 0}
	_last_main_map_immunity_border_draw_count = 0
	if _main_map_cell_override_by_tmx_key.is_empty():
		return
	for override_variant in _main_map_cell_override_by_tmx_key.values():
		if not (override_variant is Dictionary):
			continue
		var override_entry: Dictionary = override_variant as Dictionary
		var owner_id: String = str(override_entry.get("owner", "")).strip_edges().to_lower()
		var immunity_active: bool = _is_main_map_cell_immunity_active(override_entry)
		var has_owner_overlay: bool = owner_id != "" and owner_id != "neutral"
		if not has_owner_overlay and not immunity_active:
			continue
		var tmx_x: int = int(override_entry.get("tmxX", -1))
		var tmx_y: int = int(override_entry.get("tmxY", -1))
		if not _is_tmx_cell_visible(tmx_x, tmx_y, visible_bounds, 1):
			continue
		var center: Vector2 = _tmx_to_screen(tmx_x, tmx_y)
		if has_owner_overlay:
			var relation: String = _resolve_main_map_cell_owner_relation(owner_id)
			_draw_tile_diamond_overlay(
				center,
				_resolve_main_map_cell_owner_fill_color(owner_id),
				_resolve_main_map_cell_owner_outline_color(owner_id),
				max(0.9, _zoom * 0.85)
			)
			_last_main_map_owner_override_draw_count += 1
			_last_main_map_owner_override_relation_counts[relation] = int(_last_main_map_owner_override_relation_counts.get(relation, 0)) + 1
		if immunity_active:
			_draw_tile_diamond_overlay(
				center,
				Color(1.0, 0.78, 0.20, 0.020),
				Color(1.0, 0.80, 0.28, 0.88),
				max(1.4, _zoom * 1.25)
			)
			_last_main_map_immunity_border_draw_count += 1


func _resolve_main_map_cell_owner_fill_color(owner_id: String) -> Color:
	match _resolve_main_map_cell_owner_relation(owner_id):
		"own":
			return Color(0.45, 0.86, 0.48, 0.105)
		"ally":
			return Color(0.36, 0.62, 1.0, 0.100)
		"enemy":
			return Color(0.92, 0.18, 0.15, 0.095)
		_:
			return Color(0.0, 0.0, 0.0, 0.0)


func _resolve_main_map_cell_owner_outline_color(owner_id: String) -> Color:
	match _resolve_main_map_cell_owner_relation(owner_id):
		"own":
			return Color(0.56, 1.0, 0.60, 0.62)
		"ally":
			return Color(0.46, 0.72, 1.0, 0.62)
		"enemy":
			return Color(1.0, 0.34, 0.30, 0.62)
		_:
			return Color(0.0, 0.0, 0.0, 0.0)


func _resolve_main_map_cell_owner_relation(owner_id: String) -> String:
	var normalized_owner: String = owner_id.strip_edges().to_lower()
	if normalized_owner == "" or normalized_owner == "neutral":
		return "neutral"
	var human_faction_id: String = _resolve_human_faction_id().strip_edges().to_lower()
	if normalized_owner == "player" or normalized_owner == "human" or (human_faction_id != "" and normalized_owner == human_faction_id):
		return "own"
	if normalized_owner == "ally" or normalized_owner == "alliance" or normalized_owner == "friendly" or normalized_owner == "friend":
		return "ally"
	return "enemy"


func _resource_overlay_alpha_for_zoom() -> float:
	var base_alpha: float = clampf(resource_overlay_alpha, 0.0, 1.0)
	var full_zoom: float = max(0.01, resource_overlay_full_zoom)
	var mid_zoom: float = clampf(resource_overlay_mid_zoom, 0.01, full_zoom)
	if _zoom >= full_zoom:
		return base_alpha
	if _zoom >= mid_zoom:
		var mid_t: float = inverse_lerp(mid_zoom, full_zoom, _zoom)
		return base_alpha * lerpf(clampf(resource_overlay_mid_alpha, 0.0, 1.0), 1.0, mid_t)
	var far_t: float = clampf(_zoom / mid_zoom, 0.0, 1.0)
	return base_alpha * lerpf(clampf(resource_overlay_far_alpha, 0.0, 1.0), clampf(resource_overlay_mid_alpha, 0.0, 1.0), far_t)


func _resource_overlay_sample_step_for_zoom() -> int:
	return 1


func _reset_resource_cell_debug_overlay_frame() -> void:
	_resource_debug_png_drawn_tmx_keys = {}
	_last_resource_debug_visible_count = 0
	_last_resource_debug_png_drawn_count = 0
	_last_resource_debug_missing_png_count = 0
	_last_resource_debug_non_resource_visible_count = 0


func _draw_resource_cell_debug_overlay(visible_bounds: Dictionary) -> void:
	if not resource_cell_debug_overlay_enabled:
		return
	if _resource_overlay_entries.is_empty() and _resource_debug_non_resource_entries.is_empty():
		return

	var alpha: float = clampf(resource_cell_debug_overlay_alpha, 0.10, 1.0)
	var backend_outline := Color(0.05, 0.95, 1.0, alpha)
	var png_marker := Color(0.20, 1.0, 0.38, alpha)
	var missing_outline := Color(1.0, 0.16, 0.55, alpha)
	var non_resource_alpha: float = clampf(resource_cell_debug_non_resource_alpha, 0.05, 0.70)
	var non_resource_outline := Color(1.0, 0.68, 0.18, non_resource_alpha)
	var visible_count: int = 0
	var png_drawn_count: int = 0
	var missing_png_count: int = 0
	var non_resource_visible_count: int = 0

	if resource_cell_debug_non_resource_enabled:
		for non_resource_variant in _resource_debug_non_resource_entries:
			if not (non_resource_variant is Dictionary):
				continue
			var non_resource_entry: Dictionary = non_resource_variant as Dictionary
			var non_resource_tmx_x: int = int(non_resource_entry.get("tmxX", -1))
			var non_resource_tmx_y: int = int(non_resource_entry.get("tmxY", -1))
			if not _is_tmx_cell_visible(non_resource_tmx_x, non_resource_tmx_y, visible_bounds, 1):
				continue
			non_resource_visible_count += 1
			var non_resource_center: Vector2 = _tmx_to_screen(non_resource_tmx_x, non_resource_tmx_y)
			_draw_tile_diamond_overlay(
				non_resource_center,
				Color(1.0, 0.68, 0.18, non_resource_alpha * 0.04),
				non_resource_outline,
				max(0.7, _zoom * 0.85)
			)
			_draw_non_resource_cell_debug_marker(non_resource_center, non_resource_outline)

	for entry_variant in _resource_overlay_entries:
		if not (entry_variant is Dictionary):
			continue
		var entry: Dictionary = entry_variant as Dictionary
		var tmx_x: int = int(entry.get("tmxX", -1))
		var tmx_y: int = int(entry.get("tmxY", -1))
		if not _is_tmx_cell_visible(tmx_x, tmx_y, visible_bounds, 1):
			continue

		visible_count += 1
		var resource_cell_key: String = _coord_key(tmx_x, tmx_y)
		var cell_center: Vector2 = _tmx_to_screen(tmx_x, tmx_y)
		var png_drawn: bool = _resource_debug_png_drawn_tmx_keys.has(resource_cell_key)
		_draw_tile_diamond_overlay(
			cell_center,
			Color(0.0, 0.0, 0.0, 0.0),
			backend_outline,
			max(0.9, _zoom * 1.25)
		)
		if png_drawn:
			png_drawn_count += 1
			_draw_resource_cell_debug_marker(cell_center, png_marker, false)
		else:
			missing_png_count += 1
			_draw_tile_diamond_overlay(
				cell_center,
				Color(1.0, 0.16, 0.55, alpha * 0.08),
				missing_outline,
				max(1.2, _zoom * 1.8)
			)
			_draw_resource_cell_debug_marker(cell_center, missing_outline, true)

	_last_resource_debug_visible_count = visible_count
	_last_resource_debug_png_drawn_count = png_drawn_count
	_last_resource_debug_missing_png_count = missing_png_count
	_last_resource_debug_non_resource_visible_count = non_resource_visible_count


func _draw_resource_cell_debug_marker(center: Vector2, color: Color, is_missing_png: bool) -> void:
	var radius: float = max(1.8, 3.8 * _zoom)
	draw_circle(center, radius + 1.2, Color(0.0, 0.0, 0.0, min(0.55, color.a)))
	draw_circle(center, radius, color)
	if not is_missing_png:
		return
	var arm: float = max(5.0, _tmx_tile_height * 0.12 * _zoom)
	var width: float = max(1.2, 1.6 * _zoom)
	draw_line(center + Vector2(-arm, -arm * 0.5), center + Vector2(arm, arm * 0.5), Color(0.0, 0.0, 0.0, min(0.60, color.a)), width + 1.5)
	draw_line(center + Vector2(-arm, arm * 0.5), center + Vector2(arm, -arm * 0.5), Color(0.0, 0.0, 0.0, min(0.60, color.a)), width + 1.5)
	draw_line(center + Vector2(-arm, -arm * 0.5), center + Vector2(arm, arm * 0.5), color, width)
	draw_line(center + Vector2(-arm, arm * 0.5), center + Vector2(arm, -arm * 0.5), color, width)


func _draw_non_resource_cell_debug_marker(center: Vector2, color: Color) -> void:
	var half_w: float = max(3.5, _tmx_tile_width * 0.045 * _zoom)
	var half_h: float = max(1.8, _tmx_tile_height * 0.045 * _zoom)
	var width: float = max(1.0, _zoom * 1.1)
	var left := center + Vector2(-half_w, 0.0)
	var right := center + Vector2(half_w, 0.0)
	var top := center + Vector2(0.0, -half_h)
	var bottom := center + Vector2(0.0, half_h)
	draw_line(left, right, Color(0.0, 0.0, 0.0, min(0.50, color.a)), width + 1.4)
	draw_line(top, bottom, Color(0.0, 0.0, 0.0, min(0.50, color.a)), width + 1.4)
	draw_line(left, right, color, width)
	draw_line(top, bottom, color, width)


func _draw_world_cell_interaction_grids() -> void:
	if not world_cell_interaction_grid_debug_enabled:
		return
	var drawn_centers: Dictionary = {}
	if _selected_tile_key != "":
		_draw_world_cell_interaction_grid_for_tile(
			_selected_tile,
			Color(0.58, 0.84, 1.0, 0.56),
			drawn_centers
		)
	if _hover_tile_key != "":
		_draw_world_cell_interaction_grid_for_tile(
			_hover_tile,
			Color(1.0, 0.92, 0.54, 0.52),
			drawn_centers
		)


func _draw_world_cell_interaction_grid_for_tile(tile_data: Dictionary, outline_color: Color, drawn_centers: Dictionary) -> void:
	if tile_data.is_empty():
		return
	var tmx_key: String = _resolve_tmx_key_for_backend_tile(tile_data)
	if tmx_key == "":
		return
	var footprint_id: String = str(_world_cell_reserved_footprint_tmx_keys.get(tmx_key, "")).strip_edges()
	if footprint_id == "" or footprint_id == WORLD_CELL_FOOTPRINT_RESOURCE_1X1:
		return
	var center_variant: Variant = _world_cell_reserved_center_by_tmx_key.get(tmx_key, [])
	var center_tmx: Vector2i = _vector2i_from_json_array(center_variant, Vector2i(-1, -1))
	if center_tmx.x < 0 or center_tmx.y < 0:
		return
	var center_key: String = _coord_key(center_tmx.x, center_tmx.y)
	if drawn_centers.has(center_key):
		return
	drawn_centers[center_key] = true
	var offsets: Array = _resolve_world_cell_footprint_offsets(footprint_id, [3, 3])
	if offsets.size() <= 1:
		return
	var footprint_tiles: Array = _resolve_world_cell_footprint_tiles(footprint_id, [3, 3])
	var width: float = max(0.85, _zoom * 0.88)
	for offset_variant in offsets:
		var offset: Vector2i = _vector2i_from_json_array(offset_variant, Vector2i.ZERO)
		if not _is_world_cell_perimeter_offset(offset, footprint_tiles):
			continue
		var tmx_x: int = clampi(center_tmx.x + offset.x, 0, _main_map_runtime_tmx_max_x())
		var tmx_y: int = clampi(center_tmx.y + offset.y, 0, _main_map_runtime_tmx_max_y())
		var state_entry_variant: Variant = _world_cell_node_base_by_tmx_key.get(_coord_key(tmx_x, tmx_y), {})
		var state_entry: Dictionary = state_entry_variant as Dictionary if state_entry_variant is Dictionary else {}
		var cell_state: String = str(state_entry.get("cellState", "reserved_base")).strip_edges().to_lower()
		var cell_outline: Color = _resolve_world_cell_interaction_outline_color(outline_color, cell_state)
		var cell_fill: Color = _resolve_world_cell_interaction_fill_color(cell_state)
		_draw_tile_diamond_overlay(
			_tmx_to_screen(tmx_x, tmx_y),
			cell_fill,
			cell_outline,
			width
		)
		if cell_state == "active_building_cell":
			_draw_world_cell_active_corner_marks(_tmx_to_screen(tmx_x, tmx_y), cell_outline)


func _is_world_cell_perimeter_offset(offset: Vector2i, footprint_tiles: Array) -> bool:
	if footprint_tiles.size() < 2:
		return true
	var half_w: int = maxi(0, int(floor(float(footprint_tiles[0]) * 0.5)))
	var half_h: int = maxi(0, int(floor(float(footprint_tiles[1]) * 0.5)))
	return abs(offset.x) >= half_w or abs(offset.y) >= half_h


func _resolve_tmx_key_for_backend_tile(tile_data: Dictionary) -> String:
	var direct_tmx_x: int = int(tile_data.get("tmxX", -1))
	var direct_tmx_y: int = int(tile_data.get("tmxY", -1))
	if direct_tmx_x >= 0 and direct_tmx_y >= 0:
		return _coord_key(direct_tmx_x, direct_tmx_y)
	var backend_x: int = int(tile_data.get("x", 0))
	var backend_y: int = int(tile_data.get("y", 0))
	var mapped_variant: Variant = _tmx_cell_by_coord_key.get(_coord_key(backend_x, backend_y), null)
	if mapped_variant is Vector2i:
		var mapped: Vector2i = mapped_variant as Vector2i
		return _coord_key(mapped.x, mapped.y)
	if _backend_x_min <= _backend_x_max and _backend_y_min <= _backend_y_max:
		return _coord_key(
			_map_backend_to_tmx_axis(backend_x, _backend_x_min, _backend_x_max, _tmx_map_width),
			_map_backend_to_tmx_axis(backend_y, _backend_y_min, _backend_y_max, _tmx_map_height)
		)
	return ""


func _draw_hover_tile_overlay() -> void:
	var hover_pos: Vector2 = _resolve_screen_position_for_tile(_hover_tile)
	var hover_state: String = str(_hover_tile.get("cellState", "")).strip_edges().to_lower()
	_draw_tile_diamond_overlay(
		hover_pos,
		_resolve_world_cell_overlay_fill_color("hover", hover_state),
		_resolve_world_cell_overlay_outline_color("hover", hover_state),
		max(1.4, _zoom * 1.10)
	)
	_draw_world_cell_state_overlay_for_tile(_hover_tile, hover_pos, "hover")


func _draw_selected_tile_overlay() -> void:
	var selected_pos: Vector2 = _resolve_screen_position_for_tile(_selected_tile)
	var selected_state: String = str(_selected_tile.get("cellState", "")).strip_edges().to_lower()
	_draw_tile_diamond_overlay(
		selected_pos,
		_resolve_world_cell_overlay_fill_color("selected", selected_state),
		_resolve_world_cell_overlay_outline_color("selected", selected_state),
		max(1.6, _zoom * 1.45)
	)
	_draw_world_cell_state_overlay_for_tile(_selected_tile, selected_pos, "selected")
	if _should_draw_world_cell_selection_frame(_selected_tile):
		_draw_selected_node_frame(selected_pos)


func _should_draw_world_cell_selection_frame(tile_data: Dictionary) -> bool:
	if tile_data.is_empty():
		return false
	var tmx_key: String = _resolve_tmx_key_for_backend_tile(tile_data)
	if tmx_key != "" and _world_cell_reserved_footprint_tmx_keys.has(tmx_key):
		return true
	var tile_type: String = str(tile_data.get("type", tile_data.get("tileType", ""))).strip_edges().to_lower()
	if _string_array_has(WORLD_CELL_DIRECT_SELECTION_FRAME_TYPES, tile_type):
		return true
	var footprint_id: String = _resolve_world_cell_footprint_id_for_runtime_tile(tile_data)
	return footprint_id != ""


func _draw_world_cell_state_overlay_for_tile(tile_data: Dictionary, center: Vector2, kind: String) -> void:
	if not world_cell_state_overlay_enabled:
		return
	if tile_data.is_empty():
		return
	var state_contract: Dictionary = _resolve_world_cell_state_contract_for_tile(tile_data)
	if state_contract.is_empty():
		return
	var ownership_state: String = _resolve_world_cell_ownership_state_for_tile(tile_data, state_contract)
	var interaction_state: String = _resolve_world_cell_interaction_state_for_tile(tile_data, state_contract)
	if ownership_state == "" and interaction_state == "":
		return
	_draw_tile_diamond_overlay(
		center,
		_resolve_world_cell_state_overlay_fill_color(ownership_state, interaction_state, kind),
		_resolve_world_cell_state_overlay_outline_color(ownership_state, interaction_state, kind),
		max(1.0, _zoom * 1.0)
	)


func _resolve_world_cell_state_contract_for_tile(tile_data: Dictionary) -> Dictionary:
	var composite_id: String = str(tile_data.get("compositeId", "")).strip_edges()
	if composite_id != "":
		var composite_variant: Variant = _world_cell_composite_by_id.get(composite_id, {})
		if composite_variant is Dictionary:
			var composite: Dictionary = composite_variant as Dictionary
			if not str(composite.get("package_id", "")).strip_edges().is_empty():
				return composite
	var footprint_id: String = _resolve_world_cell_footprint_id_for_runtime_tile(tile_data)
	var tile_type: String = str(tile_data.get("type", tile_data.get("tileType", ""))).strip_edges().to_lower()
	if footprint_id == "" and tile_type == "resource":
		footprint_id = WORLD_CELL_FOOTPRINT_RESOURCE_1X1
	var footprint_rule: Dictionary = _get_world_cell_footprint_rule(footprint_id)
	if not footprint_rule.is_empty() and not str(footprint_rule.get("package_id", "")).strip_edges().is_empty():
		return footprint_rule
	return {}


func _resolve_world_cell_ownership_state_for_tile(tile_data: Dictionary, state_contract: Dictionary) -> String:
	var supported_states_variant: Variant = state_contract.get("supported_ownership_states", [])
	var default_state: String = str(state_contract.get("default_ownership_state", "neutral")).strip_edges().to_lower()
	var tile_type: String = str(tile_data.get("type", tile_data.get("tileType", ""))).strip_edges().to_lower()
	var owner_id: String = str(tile_data.get("owner", "")).strip_edges().to_lower()
	var human_faction_id: String = _resolve_human_faction_id().strip_edges().to_lower()
	var resolved_state: String = default_state
	if owner_id != "" and owner_id != "neutral":
		if owner_id == "player" or owner_id == "human" or (human_faction_id != "" and owner_id == human_faction_id):
			resolved_state = "own"
		else:
			resolved_state = "enemy"
	elif tile_type == "player_city":
		resolved_state = "own"
	elif tile_type == "ai_city":
		resolved_state = "enemy"
	return _resolve_world_cell_supported_state(resolved_state, default_state, supported_states_variant)


func _resolve_world_cell_interaction_state_for_tile(tile_data: Dictionary, state_contract: Dictionary) -> String:
	var supported_states_variant: Variant = state_contract.get("supported_interaction_states", [])
	var explicit_state: String = str(tile_data.get("interactionState", "")).strip_edges().to_lower()
	if explicit_state == "disabled" or bool(tile_data.get("disabled", false)):
		return _resolve_world_cell_supported_state("disabled", "", supported_states_variant)
	return _resolve_world_cell_supported_state("selectable", "", supported_states_variant)


func _resolve_world_cell_supported_state(requested_state: String, fallback_state: String, supported_states_variant: Variant) -> String:
	var requested: String = requested_state.strip_edges().to_lower()
	var fallback: String = fallback_state.strip_edges().to_lower()
	if supported_states_variant is Array:
		var supported_states: Array = supported_states_variant as Array
		if requested != "" and _string_array_has(supported_states, requested):
			return requested
		if fallback != "" and _string_array_has(supported_states, fallback):
			return fallback
		if not supported_states.is_empty():
			return str(supported_states[0]).strip_edges().to_lower()
	return requested if requested != "" else fallback


func _resolve_world_cell_state_overlay_outline_color(ownership_state: String, interaction_state: String, kind: String) -> Color:
	if interaction_state == "disabled":
		return Color(0.58, 0.62, 0.62, 0.64 if kind == "selected" else 0.48)
	match ownership_state:
		"own":
			return Color(0.36, 0.82, 1.0, 0.74 if kind == "selected" else 0.54)
		"enemy":
			return Color(1.0, 0.36, 0.30, 0.76 if kind == "selected" else 0.56)
		_:
			return Color(0.98, 0.84, 0.42, 0.58 if kind == "selected" else 0.42)


func _resolve_world_cell_state_overlay_fill_color(ownership_state: String, interaction_state: String, kind: String) -> Color:
	if interaction_state == "disabled":
		return Color(0.30, 0.32, 0.32, 0.070 if kind == "selected" else 0.045)
	match ownership_state:
		"own":
			return Color(0.16, 0.54, 0.86, 0.085 if kind == "selected" else 0.050)
		"enemy":
			return Color(0.86, 0.20, 0.16, 0.090 if kind == "selected" else 0.052)
		_:
			return Color(0.82, 0.66, 0.24, 0.055 if kind == "selected" else 0.034)


func _draw_world_cell_base_state_overlay(center: Vector2, base_entry: Dictionary) -> void:
	if base_entry.is_empty():
		return
	if not bool(base_entry.get("isPerimeter", false)):
		return
	var cell_state: String = str(base_entry.get("cellState", "reserved_base")).strip_edges().to_lower()
	match cell_state:
		"reserved_building_cell":
			_draw_tile_diamond_overlay(
				center,
				Color(0.90, 0.87, 0.60, 0.045),
				Color(0.92, 0.84, 0.42, 0.16),
				max(0.65, _zoom * 0.55)
			)
		"active_building_cell":
			_draw_tile_diamond_overlay(
				center,
				Color(0.40, 0.50, 0.54, 0.028),
				Color(0.72, 0.76, 0.70, 0.14),
				max(0.62, _zoom * 0.52)
			)
			_draw_world_cell_active_corner_marks(center, Color(0.90, 0.84, 0.58, 0.32))
		_:
			return


func _resolve_world_cell_interaction_outline_color(base_color: Color, cell_state: String) -> Color:
	match cell_state:
		"reserved_building_cell":
			return Color(
				min(1.0, base_color.r * 1.06 + 0.06),
				min(1.0, base_color.g * 0.96 + 0.04),
				min(1.0, base_color.b * 0.72 + 0.02),
				min(1.0, base_color.a * 1.02)
			)
		"active_building_cell":
			return Color(
				min(1.0, base_color.r * 0.86 + 0.06),
				min(1.0, base_color.g * 0.96 + 0.04),
				min(1.0, base_color.b * 1.04 + 0.06),
				min(1.0, base_color.a * 1.08)
			)
		_:
			return base_color


func _resolve_world_cell_interaction_fill_color(cell_state: String) -> Color:
	match cell_state:
		"reserved_building_cell":
			return Color(1.0, 0.90, 0.44, 0.040)
		"active_building_cell":
			return Color(0.34, 0.52, 0.66, 0.048)
		_:
			return Color(0.0, 0.0, 0.0, 0.0)


func _resolve_world_cell_overlay_outline_color(kind: String, cell_state: String) -> Color:
	var base_color: Color = Color(1.0, 0.96, 0.70, 0.95)
	if kind == "selected":
		base_color = Color(0.56, 0.82, 1.0, 0.92)
	return _resolve_world_cell_interaction_outline_color(base_color, cell_state)


func _resolve_world_cell_overlay_fill_color(kind: String, cell_state: String) -> Color:
	if kind == "selected":
		match cell_state:
			"reserved_building_cell":
				return Color(1.0, 0.90, 0.48, 0.10)
			"active_building_cell":
				return Color(0.38, 0.66, 1.0, 0.11)
			_:
				return Color(0.36, 0.66, 1.0, 0.0)
	match cell_state:
		"reserved_building_cell":
			return Color(1.0, 0.93, 0.54, 0.08)
		"active_building_cell":
			return Color(0.50, 0.74, 0.96, 0.08)
		_:
			return Color(1.0, 0.96, 0.70, 0.0)


func _draw_world_cell_active_corner_marks(center: Vector2, color: Color) -> void:
	var inset_w: float = max(5.0, _tmx_tile_width * 0.12 * _zoom)
	var inset_h: float = max(2.6, _tmx_tile_height * 0.12 * _zoom)
	var arm_w: float = max(5.0, _tmx_tile_width * 0.07 * _zoom)
	var arm_h: float = max(2.8, _tmx_tile_height * 0.07 * _zoom)
	var width: float = max(0.9, _zoom * 0.90)
	var corners := [
		[
			Vector2(center.x, center.y - _tmx_tile_height * 0.5 * _zoom + inset_h),
			Vector2(-arm_w, arm_h),
			Vector2(arm_w, arm_h),
		],
		[
			Vector2(center.x + _tmx_tile_width * 0.5 * _zoom - inset_w, center.y),
			Vector2(-arm_w, -arm_h),
			Vector2(-arm_w, arm_h),
		],
		[
			Vector2(center.x, center.y + _tmx_tile_height * 0.5 * _zoom - inset_h),
			Vector2(-arm_w, -arm_h),
			Vector2(arm_w, -arm_h),
		],
		[
			Vector2(center.x - _tmx_tile_width * 0.5 * _zoom + inset_w, center.y),
			Vector2(arm_w, -arm_h),
			Vector2(arm_w, arm_h),
		],
	]
	for corner_variant in corners:
		var corner: Array = corner_variant
		_draw_corner_tick(corner[0], corner[1], corner[2], color, width)


func _draw_tile_diamond_overlay(center: Vector2, fill_color: Color, outline_color: Color, outline_width: float) -> void:
	var half_w: float = _tmx_tile_width * 0.5 * _zoom
	var half_h: float = _tmx_tile_height * 0.5 * _zoom
	var points := PackedVector2Array(
		[
			Vector2(center.x, center.y - half_h),
			Vector2(center.x + half_w, center.y),
			Vector2(center.x, center.y + half_h),
			Vector2(center.x - half_w, center.y),
		]
	)
	if fill_color.a > 0.001:
		draw_colored_polygon(points, fill_color)
	var outline := PackedVector2Array(points)
	outline.append(points[0])
	draw_polyline(outline, Color(0.0, 0.0, 0.0, 0.38), outline_width + 2.0)
	draw_polyline(outline, outline_color, outline_width)


func _draw_selected_node_frame(center: Vector2) -> void:
	var half_w: float = _tmx_tile_width * 0.5 * _zoom
	var half_h: float = _tmx_tile_height * 0.5 * _zoom
	var pad_w: float = max(4.0, 7.0 * _zoom)
	var pad_h: float = max(2.0, 4.0 * _zoom)
	var corner_len_w: float = max(10.0, half_w * 0.16)
	var corner_len_h: float = max(5.0, half_h * 0.16)
	var top := Vector2(center.x, center.y - half_h - pad_h)
	var right := Vector2(center.x + half_w + pad_w, center.y)
	var bottom := Vector2(center.x, center.y + half_h + pad_h)
	var left := Vector2(center.x - half_w - pad_w, center.y)
	var color := Color(0.98, 0.83, 0.42, 0.94)
	var width: float = max(1.4, _zoom * 1.6)
	_draw_corner_tick(top, Vector2(-corner_len_w, corner_len_h), Vector2(corner_len_w, corner_len_h), color, width)
	_draw_corner_tick(right, Vector2(-corner_len_w, -corner_len_h), Vector2(-corner_len_w, corner_len_h), color, width)
	_draw_corner_tick(bottom, Vector2(-corner_len_w, -corner_len_h), Vector2(corner_len_w, -corner_len_h), color, width)
	_draw_corner_tick(left, Vector2(corner_len_w, -corner_len_h), Vector2(corner_len_w, corner_len_h), color, width)


func _draw_corner_tick(origin: Vector2, arm_a: Vector2, arm_b: Vector2, color: Color, width: float) -> void:
	draw_line(origin, origin + arm_a, Color(0.0, 0.0, 0.0, 0.38), width + 2.0)
	draw_line(origin, origin + arm_b, Color(0.0, 0.0, 0.0, 0.38), width + 2.0)
	draw_line(origin, origin + arm_a, color, width)
	draw_line(origin, origin + arm_b, color, width)


func _draw_world_cell_placeholder(anchor_entry: Dictionary, cell_center: Vector2) -> bool:
	var placeholder_role: String = str(anchor_entry.get("placeholderRole", "")).strip_edges().to_lower()
	if placeholder_role == "":
		return false
	var fill := Color(0.0, 0.0, 0.0, 0.0)
	var outline := Color(0.70, 0.78, 0.74, 0.60)
	match placeholder_role:
		"river_corridor":
			fill = Color(0.20, 0.37, 0.42, 0.72)
			outline = Color(0.52, 0.80, 0.88, 0.78)
		"mountain_barrier":
			fill = Color(0.30, 0.34, 0.32, 0.82)
			outline = Color(0.74, 0.80, 0.76, 0.72)
		_:
			return false
	_draw_tile_diamond_overlay(
		cell_center,
		fill,
		outline,
		max(0.9, _zoom * 0.95)
	)
	return true


func _draw_terrain_edge_overlays(visible_bounds: Dictionary) -> void:
	if not terrain_edge_overlay_enabled:
		return
	if _terrain_edge_overlay_entries.is_empty():
		return
	if _zoom < 0.32:
		return

	for entry_variant in _terrain_edge_overlay_entries:
		if not (entry_variant is Dictionary):
			continue
		var entry: Dictionary = entry_variant as Dictionary
		var tmx_x: int = int(entry.get("tmxX", -1))
		var tmx_y: int = int(entry.get("tmxY", -1))
		if not _is_tmx_cell_visible(tmx_x, tmx_y, visible_bounds, 1):
			continue
		var center: Vector2 = _tmx_to_screen(tmx_x, tmx_y) + Vector2(0.0, -_tmx_tile_height * 0.05 * _zoom)
		var frame_name: String = str(entry.get("overlayFrame", ""))
		var alpha: float = float(entry.get("alpha", 0.35))
		var rotation: float = float(entry.get("rotation", 0.0))
		var overlay_height: float = float(entry.get("overlayHeight", terrain_edge_overlay_base_height))
		_draw_overlay_frame(frame_name, center, clampf(overlay_height * _zoom, 16.0, 110.0), alpha, rotation)


func _draw_mountain_continuity_overlays(visible_bounds: Dictionary) -> void:
	if not mountain_overlay_enabled:
		return
	if _mountain_overlay_entries.is_empty():
		return
	if _zoom < 0.34:
		return

	for entry_variant in _mountain_overlay_entries:
		if not (entry_variant is Dictionary):
			continue
		var entry: Dictionary = entry_variant as Dictionary
		var tmx_x: int = int(entry.get("tmxX", -1))
		var tmx_y: int = int(entry.get("tmxY", -1))
		if not _is_tmx_cell_visible(tmx_x, tmx_y, visible_bounds, 1):
			continue
		var center: Vector2 = _tmx_to_screen(tmx_x, tmx_y) + Vector2(0.0, -_tmx_tile_height * 0.07 * _zoom)
		var frame_name: String = str(entry.get("overlayFrame", ""))
		var alpha: float = float(entry.get("alpha", 0.40))
		var rotation: float = float(entry.get("rotation", 0.0))
		var overlay_height: float = float(entry.get("overlayHeight", mountain_overlay_base_height))
		_draw_overlay_frame(frame_name, center, clampf(overlay_height * _zoom, 18.0, 110.0), alpha, rotation)


func _draw_home_city_overlays(visible_bounds: Dictionary) -> void:
	if _main_map_view_mode == MAIN_MAP_VIEW_MODE_TIANXIA_YUTU:
		return
	if _home_city_overlay_entries.is_empty():
		return

	var font: Font = ThemeDB.fallback_font
	var human_faction_id: String = _resolve_human_faction_id()
	var scale: float = clampf(home_city_overlay_scale, 0.2, 1.8)
	for entry_variant in _home_city_overlay_entries:
		if not (entry_variant is Dictionary):
			continue
		var entry: Dictionary = entry_variant as Dictionary
		var tmx_x: int = int(entry.get("tmxX", -1))
		var tmx_y: int = int(entry.get("tmxY", -1))
		if not _is_tmx_cell_visible(tmx_x, tmx_y, visible_bounds, 2):
			continue

		var center: Vector2 = _tmx_to_screen(tmx_x, tmx_y)
		var faction_id: String = str(entry.get("factionId", "")).strip_edges()
		var is_human: bool = bool(entry.get("isHuman", false))
		var accent: Color = FactionVisualsScript.resolve_marker_color(faction_id, human_faction_id)
		var defend_center: Vector2 = center + Vector2(0.0, -_tmx_tile_height * 0.05 * _zoom * scale)
		var flag_center: Vector2 = center + Vector2(0.0, -_tmx_tile_height * 0.28 * _zoom * scale)
		var defend_drawn: bool = _draw_overlay_frame(
			str(entry.get("homeDefendFrame", "home_defend.png")),
			defend_center,
			clampf(38.0 * _zoom * scale, 10.0, 46.0)
		)
		var flag_drawn: bool = _draw_overlay_frame(
			str(entry.get("flagFrame", "")),
			flag_center,
			clampf(42.0 * _zoom * scale, 10.0, 48.0)
		)
		if not defend_drawn and not flag_drawn:
			var ring_radius: float = clampf(10.0 * _zoom, 3.5, 13.0)
			draw_arc(center, ring_radius, 0.0, TAU, 28, accent, max(1.0, 1.2 * _zoom))

		if not home_city_badge_enabled:
			continue
		if _zoom < 0.38:
			continue
		var label: String = str(entry.get("label", AI_HOME_LABEL))
		var city_level: int = maxi(1, int(entry.get("cityLevel", 1)))
		var badge_text: String = "%s城%d" % [label, city_level]
		var badge_size := Vector2(clampf(46.0 * _zoom * scale, 20.0, 64.0), clampf(18.0 * _zoom * scale, 10.0, 28.0))
		var badge_center := center + Vector2(0.0, -_tmx_tile_height * 0.26 * _zoom * scale)
		var badge_rect := Rect2(badge_center - badge_size * 0.5, badge_size)
		draw_rect(badge_rect, Color(accent.r, accent.g, accent.b, 0.85), true)
		draw_rect(badge_rect, Color(0.08, 0.08, 0.08, 0.75), false, 1.0)
		if font != null:
			var font_size: int = int(clampf(11.0 * _zoom, 8.0, 14.0))
			_draw_centered_text(font, badge_center + Vector2(0.0, badge_size.y * 0.25), badge_text, font_size, Color(0.05, 0.05, 0.05, 0.95))


func _draw_centered_text(font: Font, baseline_center: Vector2, text: String, font_size: int, color: Color) -> void:
	if font == null:
		return
	draw_string(font, baseline_center, text, HORIZONTAL_ALIGNMENT_CENTER, -1.0, font_size, color)


func _is_tmx_cell_visible(tmx_x: int, tmx_y: int, visible_bounds: Dictionary, margin: int = 0) -> bool:
	var start_x: int = int(visible_bounds.get("startX", 0)) - margin
	var end_x: int = int(visible_bounds.get("endX", -1)) + margin
	var start_y: int = int(visible_bounds.get("startY", 0)) - margin
	var end_y: int = int(visible_bounds.get("endY", -1)) + margin
	return tmx_x >= start_x and tmx_x <= end_x and tmx_y >= start_y and tmx_y <= end_y


func _resource_level_color(level: int) -> Color:
	match clampi(level, 1, 5):
		1:
			return Color(0.73, 0.87, 0.66, 0.90)
		2:
			return Color(0.58, 0.84, 0.95, 0.91)
		3:
			return Color(0.98, 0.86, 0.56, 0.93)
		4:
			return Color(0.99, 0.70, 0.42, 0.94)
		5:
			return Color(0.95, 0.50, 0.45, 0.96)
		_:
			return Color(0.72, 0.84, 0.70, 0.90)


func _refresh_home_city_overlay_entries(world_payload: Dictionary) -> void:
	_home_city_overlay_entries = []
	if _is_main_world_substrate_chunk_renderer_active():
		return
	if (_city_overlay_by_tile_id.is_empty() and _world_city_overlay_by_tile_id.is_empty()) or world_payload.is_empty():
		return
	var factions_variant: Variant = world_payload.get("factions", {})
	var human_faction_id: String = _resolve_human_faction_id()
	if factions_variant is Dictionary:
		var factions_map: Dictionary = factions_variant as Dictionary
		for faction_key in factions_map.keys():
			var faction_id: String = str(faction_key).strip_edges()
			var faction_data: Variant = factions_map.get(faction_key, {})
			if faction_id == "" or not (faction_data is Dictionary):
				continue
			_try_append_home_city_entry(faction_id, faction_data as Dictionary, human_faction_id)
	elif factions_variant is Array:
		for faction_variant in factions_variant:
			if not (faction_variant is Dictionary):
				continue
			var faction_data: Dictionary = faction_variant as Dictionary
			var faction_id: String = str(faction_data.get("id", faction_data.get("factionId", ""))).strip_edges()
			if faction_id == "":
				continue
			_try_append_home_city_entry(faction_id, faction_data, human_faction_id)


func _try_append_home_city_entry(faction_id: String, faction_data: Dictionary, human_faction_id: String) -> void:
	var hero_command: Dictionary = faction_data.get("heroCommand", {}) as Dictionary
	var home_tile_id: String = str(hero_command.get("homeTileId", faction_data.get("homeTileId", ""))).strip_edges()
	var city_entry: Dictionary = _resolve_city_entry_for_home(home_tile_id, faction_id)
	if city_entry.is_empty():
		return
	var resolved_tile_id: String = str(city_entry.get("tileId", home_tile_id)).strip_edges()
	if resolved_tile_id == "":
		return
	var is_human: bool = faction_id == human_faction_id
	var city_level: int = int(city_entry.get("cityLevel", 1))
	_home_city_overlay_entries.append(
		{
			"tileId": resolved_tile_id,
			"title": str(city_entry.get("title", resolved_tile_id)).strip_edges(),
			"tileX": int(city_entry.get("x", city_entry.get("backendX", -1))),
			"tileY": int(city_entry.get("y", city_entry.get("backendY", -1))),
			"tmxX": int(city_entry.get("tmxX", -1)),
			"tmxY": int(city_entry.get("tmxY", -1)),
			"cityLevel": city_level,
			"factionId": faction_id,
			"isHuman": is_human,
			"label": HUMAN_HOME_LABEL if is_human else AI_HOME_LABEL,
			"flagFrame": _resolve_home_city_flag_frame(faction_id, human_faction_id, city_level),
			"homeDefendFrame": "home_defend.png",
		}
	)


func _resolve_city_entry_for_home(home_tile_id: String, faction_id: String) -> Dictionary:
	if home_tile_id != "":
		var local_entry: Dictionary = _city_overlay_by_tile_id.get(home_tile_id, {}) as Dictionary
		if not local_entry.is_empty():
			return local_entry
		var world_entry: Dictionary = _world_city_overlay_by_tile_id.get(home_tile_id, {}) as Dictionary
		if not world_entry.is_empty():
			return world_entry

	var owner_hint: String = faction_id.strip_edges().to_lower()
	if owner_hint == "":
		return {}
	return _resolve_city_entry_by_owner(owner_hint)


func _resolve_city_entry_by_owner(owner_id: String) -> Dictionary:
	var normalized_owner: String = owner_id.strip_edges().to_lower()
	if normalized_owner == "":
		return {}

	var best_level: int = -1
	var best_entry: Dictionary = {}
	var sources: Array = [_city_overlay_by_tile_id, _world_city_overlay_by_tile_id]
	for source_variant in sources:
		if not (source_variant is Dictionary):
			continue
		var source: Dictionary = source_variant as Dictionary
		for entry_variant in source.values():
			if not (entry_variant is Dictionary):
				continue
			var entry: Dictionary = entry_variant as Dictionary
			var entry_owner: String = str(entry.get("owner", "")).strip_edges().to_lower()
			if entry_owner != normalized_owner:
				continue
			var level: int = maxi(1, int(entry.get("cityLevel", 1)))
			if level > best_level:
				best_level = level
				best_entry = entry
	return best_entry


func _resolve_human_faction_id() -> String:
	var session_faction_id: String = SessionStore.faction_id.strip_edges()
	if session_faction_id != "":
		return session_faction_id
	return "player"


func _rebuild_world_cell_runtime_entries(world_cell_entries: Array) -> void:
	_world_cell_node_base_by_tmx_key = {}
	_world_cell_node_anchor_by_tmx_key = {}
	_world_cell_reserved_footprint_tmx_keys = {}
	_world_cell_reserved_anchor_by_tmx_key = {}
	_world_cell_reserved_center_by_tmx_key = {}
	_ensure_world_cell_runtime_builder_stats()
	if world_cell_entries.is_empty():
		return

	var grouped_entries: Dictionary = {}
	for entry_variant in world_cell_entries:
		if not (entry_variant is Dictionary):
			continue
		var entry: Dictionary = entry_variant as Dictionary
		var tmx_x: int = int(entry.get("tmxX", -1))
		var tmx_y: int = int(entry.get("tmxY", -1))
		if tmx_x < 0 or tmx_y < 0:
			continue
		var group_key: String = str(entry.get("groupKey", entry.get("tileId", entry.get("id", "")))).strip_edges()
		if group_key == "":
			group_key = _coord_key(tmx_x, tmx_y)
		if not grouped_entries.has(group_key):
			grouped_entries[group_key] = []
		var group: Array = grouped_entries[group_key] as Array
		group.append(entry)

	var runtime_groups: Array = []
	for group_key_variant in grouped_entries.keys():
		runtime_groups.append(grouped_entries[group_key_variant] as Array)
	runtime_groups.sort_custom(Callable(self, "_compare_world_cell_runtime_group_priority"))
	for group_variant in runtime_groups:
		var group_entries: Array = group_variant as Array
		_register_world_cell_runtime_group(group_entries)


func _compare_world_cell_runtime_group_priority(a: Array, b: Array) -> bool:
	var a_priority: int = _resolve_world_cell_runtime_group_priority(a)
	var b_priority: int = _resolve_world_cell_runtime_group_priority(b)
	if a_priority != b_priority:
		return a_priority < b_priority
	return a.size() > b.size()


func _resolve_world_cell_runtime_group_priority(group_entries: Array) -> int:
	if group_entries.is_empty():
		return 999
	var anchor_entry: Dictionary = _pick_world_cell_runtime_anchor_entry(group_entries)
	var tile_type: String = _resolve_world_cell_runtime_type(anchor_entry, str(anchor_entry.get("footprintId", "")))
	var strategy: String = _resolve_world_cell_runtime_strategy_for_type(tile_type)
	return _resolve_world_cell_runtime_strategy_priority(strategy, tile_type)


func _register_world_cell_runtime_group(group_entries: Array) -> void:
	var runtime_group: Dictionary = _build_world_cell_runtime_group(group_entries)
	if runtime_group.is_empty():
		return
	var anchor_key: String = str(runtime_group.get("anchorKey", "")).strip_edges()
	var footprint_id: String = str(runtime_group.get("footprintId", "")).strip_edges()
	var footprint_center: Vector2i = runtime_group.get("footprintCenterTmx", Vector2i(-1, -1)) as Vector2i
	var anchor_visual_entry: Dictionary = runtime_group.get("anchorVisualEntry", {}) as Dictionary
	var stats_type: String = _resolve_world_cell_runtime_group_stats_type(group_entries, runtime_group)
	if anchor_key == "" or footprint_id == "" or footprint_center.x < 0 or footprint_center.y < 0 or anchor_visual_entry.is_empty():
		_record_world_cell_runtime_skipped_invalid(stats_type)
		return
	var conflict: Dictionary = _resolve_world_cell_footprint_conflict_at(footprint_center.x, footprint_center.y, footprint_id, anchor_key)
	if not conflict.is_empty():
		_record_world_cell_runtime_skipped_conflict(stats_type, conflict, runtime_group)
		if world_cell_runtime_conflict_warning_enabled:
			push_warning("[world-cell] runtime group skipped by reserved footprint conflict | anchor=%s footprint=%s" % [anchor_key, footprint_id])
		return
	if _world_cell_node_anchor_by_tmx_key.has(anchor_key):
		var previous_anchor_variant: Variant = _world_cell_node_anchor_by_tmx_key.get(anchor_key, {})
		var previous_anchor: Dictionary = previous_anchor_variant as Dictionary if previous_anchor_variant is Dictionary else {}
		_record_world_cell_runtime_duplicate_last_write(stats_type, previous_anchor, runtime_group)
	_record_world_cell_runtime_registered_attempt(stats_type)
	_world_cell_node_anchor_by_tmx_key[anchor_key] = anchor_visual_entry
	_populate_world_cell_base_entries(
		footprint_center.x,
		footprint_center.y,
		footprint_id,
		anchor_key,
		anchor_visual_entry
	)
	_reserve_world_cell_footprint_at(
		footprint_center.x,
		footprint_center.y,
		footprint_id,
		anchor_key
	)


func _can_reserve_world_cell_footprint_at(center_tmx_x: int, center_tmx_y: int, footprint_id: String, anchor_key: String) -> bool:
	return _resolve_world_cell_footprint_conflict_at(center_tmx_x, center_tmx_y, footprint_id, anchor_key).is_empty()


func _resolve_world_cell_footprint_conflict_at(center_tmx_x: int, center_tmx_y: int, footprint_id: String, anchor_key: String) -> Dictionary:
	if not _does_world_cell_placement_policy_apply(footprint_id, WORLD_CELL_PLACEMENT_ACTION_RESERVE_CELLS):
		return {}
	var offsets: Array = _resolve_world_cell_footprint_offsets(footprint_id, [3, 3])
	for offset_variant in offsets:
		var offset: Vector2i = _vector2i_from_json_array(offset_variant, Vector2i.ZERO)
		var tmx_x: int = clampi(center_tmx_x + offset.x, 0, _main_map_runtime_tmx_max_x())
		var tmx_y: int = clampi(center_tmx_y + offset.y, 0, _main_map_runtime_tmx_max_y())
		var tmx_key: String = _coord_key(tmx_x, tmx_y)
		var existing_anchor_key: String = str(_world_cell_reserved_anchor_by_tmx_key.get(tmx_key, "")).strip_edges()
		if existing_anchor_key != "" and existing_anchor_key != anchor_key:
			var existing_anchor_variant: Variant = _world_cell_node_anchor_by_tmx_key.get(existing_anchor_key, {})
			var existing_anchor: Dictionary = existing_anchor_variant as Dictionary if existing_anchor_variant is Dictionary else {}
			return {
				"tmxKey": tmx_key,
				"tmx": [tmx_x, tmx_y],
				"footprintOffset": [offset.x, offset.y],
				"existingAnchorKey": existing_anchor_key,
				"existingFootprintId": str(_world_cell_reserved_footprint_tmx_keys.get(tmx_key, "")).strip_edges(),
				"existingType": str(existing_anchor.get("type", "")).strip_edges(),
				"existingTileId": str(existing_anchor.get("tileId", existing_anchor.get("id", ""))).strip_edges(),
				"nextAnchorKey": anchor_key,
				"nextFootprintId": footprint_id,
			}
	return {}


func _reset_world_cell_runtime_builder_stats() -> void:
	_world_cell_runtime_builder_stats = {
		"rawBackendNodeCounts": {},
		"registeredAttemptCounts": {},
		"registeredAnchorCounts": {},
		"registeredAnchorCountsSemantics": "registered_attempts_before_duplicate_last_write",
		"duplicateAnchorCounts": {},
		"duplicateAnchorPolicy": WORLD_CELL_DUPLICATE_ANCHOR_POLICY,
		"skippedConflictCounts": {},
		"skippedInvalidCounts": {},
		"skippedConflictSamples": {},
		"duplicateAnchorSamples": {},
	}


func _ensure_world_cell_runtime_builder_stats() -> void:
	if _world_cell_runtime_builder_stats.is_empty():
		_reset_world_cell_runtime_builder_stats()


func _record_world_cell_runtime_raw_backend_node(node_type: String) -> void:
	_increment_world_cell_runtime_builder_stat("rawBackendNodeCounts", node_type)


func _record_world_cell_runtime_registered_attempt(node_type: String) -> void:
	_increment_world_cell_runtime_builder_stat("registeredAttemptCounts", node_type)
	_increment_world_cell_runtime_builder_stat("registeredAnchorCounts", node_type)


func _record_world_cell_runtime_skipped_invalid(node_type: String) -> void:
	_increment_world_cell_runtime_builder_stat("skippedInvalidCounts", node_type)


func _record_world_cell_runtime_skipped_conflict(node_type: String, conflict: Dictionary, runtime_group: Dictionary) -> void:
	_increment_world_cell_runtime_builder_stat("skippedConflictCounts", node_type)
	_append_world_cell_runtime_builder_conflict_sample(node_type, conflict, runtime_group)


func _record_world_cell_runtime_duplicate_last_write(node_type: String, previous_anchor: Dictionary, runtime_group: Dictionary) -> void:
	_increment_world_cell_runtime_builder_stat("duplicateAnchorCounts", node_type)
	_append_world_cell_runtime_builder_duplicate_anchor_sample(node_type, previous_anchor, runtime_group)


func _increment_world_cell_runtime_builder_stat(bucket_name: String, node_type: String) -> void:
	_ensure_world_cell_runtime_builder_stats()
	var normalized_type: String = node_type.strip_edges().to_lower()
	if normalized_type == "":
		normalized_type = "unknown"
	var bucket_variant: Variant = _world_cell_runtime_builder_stats.get(bucket_name, {})
	var bucket: Dictionary = bucket_variant as Dictionary if bucket_variant is Dictionary else {}
	bucket[normalized_type] = int(bucket.get(normalized_type, 0)) + 1
	bucket["total"] = int(bucket.get("total", 0)) + 1
	_world_cell_runtime_builder_stats[bucket_name] = bucket


func _append_world_cell_runtime_builder_conflict_sample(node_type: String, conflict: Dictionary, runtime_group: Dictionary) -> void:
	_ensure_world_cell_runtime_builder_stats()
	var normalized_type: String = node_type.strip_edges().to_lower()
	if normalized_type == "":
		normalized_type = "unknown"
	var samples_variant: Variant = _world_cell_runtime_builder_stats.get("skippedConflictSamples", {})
	var samples_by_type: Dictionary = samples_variant as Dictionary if samples_variant is Dictionary else {}
	var type_samples_variant: Variant = samples_by_type.get(normalized_type, [])
	var type_samples: Array = type_samples_variant as Array if type_samples_variant is Array else []
	if type_samples.size() >= WORLD_CELL_RUNTIME_AUDIT_SAMPLE_LIMIT:
		samples_by_type[normalized_type] = type_samples
		_world_cell_runtime_builder_stats["skippedConflictSamples"] = samples_by_type
		return
	var anchor_entry: Dictionary = runtime_group.get("anchorEntry", {}) as Dictionary
	var footprint_center: Vector2i = runtime_group.get("footprintCenterTmx", Vector2i(-1, -1)) as Vector2i
	var conflict_tmx_key: String = str(conflict.get("tmxKey", "")).strip_edges()
	type_samples.append({
		"nodeType": normalized_type,
		"anchorKey": str(runtime_group.get("anchorKey", "")).strip_edges(),
		"footprintId": str(runtime_group.get("footprintId", "")).strip_edges(),
		"footprintCenterTmx": [footprint_center.x, footprint_center.y],
		"tileId": str(anchor_entry.get("tileId", anchor_entry.get("id", ""))).strip_edges(),
		"backend": [
			int(anchor_entry.get("backendX", anchor_entry.get("x", 0))),
			int(anchor_entry.get("backendY", anchor_entry.get("y", 0))),
		],
		"conflict": conflict.duplicate(true),
		"placementContextMatches": _build_world_cell_placement_context_matches_at_tmx_key(conflict_tmx_key),
	})
	samples_by_type[normalized_type] = type_samples
	_world_cell_runtime_builder_stats["skippedConflictSamples"] = samples_by_type


func _append_world_cell_runtime_builder_duplicate_anchor_sample(node_type: String, previous_anchor: Dictionary, runtime_group: Dictionary) -> void:
	_ensure_world_cell_runtime_builder_stats()
	var normalized_type: String = node_type.strip_edges().to_lower()
	if normalized_type == "":
		normalized_type = "unknown"
	var samples_variant: Variant = _world_cell_runtime_builder_stats.get("duplicateAnchorSamples", {})
	var samples_by_type: Dictionary = samples_variant as Dictionary if samples_variant is Dictionary else {}
	var type_samples_variant: Variant = samples_by_type.get(normalized_type, [])
	var type_samples: Array = type_samples_variant as Array if type_samples_variant is Array else []
	if type_samples.size() >= WORLD_CELL_RUNTIME_AUDIT_SAMPLE_LIMIT:
		samples_by_type[normalized_type] = type_samples
		_world_cell_runtime_builder_stats["duplicateAnchorSamples"] = samples_by_type
		return
	var anchor_entry: Dictionary = runtime_group.get("anchorEntry", {}) as Dictionary
	var footprint_center: Vector2i = runtime_group.get("footprintCenterTmx", Vector2i(-1, -1)) as Vector2i
	var anchor_key: String = str(runtime_group.get("anchorKey", "")).strip_edges()
	type_samples.append({
		"nodeType": normalized_type,
		"anchorKey": anchor_key,
		"policy": WORLD_CELL_DUPLICATE_ANCHOR_POLICY,
		"nextFootprintId": str(runtime_group.get("footprintId", "")).strip_edges(),
		"nextTileId": str(anchor_entry.get("tileId", anchor_entry.get("id", ""))).strip_edges(),
		"nextBackend": [
			int(anchor_entry.get("backendX", anchor_entry.get("x", 0))),
			int(anchor_entry.get("backendY", anchor_entry.get("y", 0))),
		],
		"nextFootprintCenterTmx": [footprint_center.x, footprint_center.y],
		"previousFootprintId": str(previous_anchor.get("footprintId", "")).strip_edges(),
		"previousTileId": str(previous_anchor.get("tileId", previous_anchor.get("id", ""))).strip_edges(),
		"previousType": str(previous_anchor.get("type", "")).strip_edges(),
		"placementContextMatches": _build_world_cell_placement_context_matches_at_tmx_key(anchor_key),
		"ownership": {
			"policy": WORLD_CELL_DUPLICATE_ANCHOR_POLICY,
			"previous": _build_world_cell_runtime_anchor_ownership_summary(previous_anchor),
			"next": _build_world_cell_runtime_anchor_ownership_summary(anchor_entry, runtime_group),
		},
	})
	samples_by_type[normalized_type] = type_samples
	_world_cell_runtime_builder_stats["duplicateAnchorSamples"] = samples_by_type


func _build_world_cell_runtime_anchor_ownership_summary(anchor_entry: Dictionary, runtime_group: Dictionary = {}) -> Dictionary:
	var footprint_center: Vector2i = runtime_group.get("footprintCenterTmx", Vector2i(-1, -1)) as Vector2i
	var summary := {
		"anchorKey": str(runtime_group.get("anchorKey", anchor_entry.get("anchorKey", ""))).strip_edges(),
		"type": str(anchor_entry.get("type", "")).strip_edges(),
		"footprintId": str(runtime_group.get("footprintId", anchor_entry.get("footprintId", ""))).strip_edges(),
		"tileId": str(anchor_entry.get("tileId", anchor_entry.get("id", ""))).strip_edges(),
		"owner": str(anchor_entry.get("owner", "")).strip_edges(),
		"compositeId": str(anchor_entry.get("compositeId", "")).strip_edges(),
		"backend": [
			int(anchor_entry.get("backendX", anchor_entry.get("x", 0))),
			int(anchor_entry.get("backendY", anchor_entry.get("y", 0))),
		],
	}
	if footprint_center.x >= 0 and footprint_center.y >= 0:
		summary["footprintCenterTmx"] = [footprint_center.x, footprint_center.y]
	return summary


func _resolve_world_cell_runtime_group_stats_type(group_entries: Array, runtime_group: Dictionary = {}) -> String:
	var anchor_entry: Dictionary = {}
	if not runtime_group.is_empty():
		var runtime_anchor_variant: Variant = runtime_group.get("anchorEntry", {})
		if runtime_anchor_variant is Dictionary:
			anchor_entry = runtime_anchor_variant as Dictionary
	if anchor_entry.is_empty():
		anchor_entry = _pick_world_cell_runtime_anchor_entry(group_entries)
	var footprint_id: String = str(runtime_group.get("footprintId", anchor_entry.get("footprintId", ""))).strip_edges()
	var node_type: String = _resolve_world_cell_runtime_type(anchor_entry, footprint_id)
	if node_type != "":
		return node_type
	if footprint_id != "":
		var footprint_rule: Dictionary = _get_world_cell_footprint_rule(footprint_id)
		node_type = str(footprint_rule.get("role", "")).strip_edges().to_lower()
		if node_type != "":
			return node_type
	return "unknown"


func _resolve_world_cell_runtime_builder_stats_snapshot() -> Dictionary:
	_ensure_world_cell_runtime_builder_stats()
	return _world_cell_runtime_builder_stats.duplicate(true)


func _build_world_cell_runtime_group(group_entries: Array) -> Dictionary:
	if group_entries.is_empty():
		return {}
	var anchor_entry: Dictionary = _pick_world_cell_runtime_anchor_entry(group_entries)
	var group_size: int = group_entries.size()
	if anchor_entry.is_empty():
		return {}
	var anchor_key: String = _coord_key(int(anchor_entry.get("tmxX", -1)), int(anchor_entry.get("tmxY", -1)))
	var footprint_id: String = _resolve_world_cell_runtime_footprint_id(anchor_entry, group_size)
	if footprint_id == "":
		return {}
	var composite_id: String = _resolve_world_cell_runtime_composite_id(anchor_entry, footprint_id, group_size)
	var footprint_center: Vector2i = _resolve_world_cell_runtime_footprint_center_tmx(anchor_entry, group_entries)
	var anchor_visual_entry: Dictionary = _build_world_cell_anchor_visual_entry(
		anchor_entry,
		group_entries,
		footprint_id,
		composite_id,
		group_size
	)
	anchor_visual_entry["anchorKey"] = anchor_key
	return {
		"anchorKey": anchor_key,
		"anchorEntry": anchor_entry,
		"anchorVisualEntry": anchor_visual_entry,
		"footprintId": footprint_id,
		"compositeId": composite_id,
		"footprintCenterTmx": footprint_center,
		"groupSize": group_size,
	}

func _pick_world_cell_runtime_anchor_entry(group_entries: Array) -> Dictionary:
	if group_entries.is_empty():
		return {}
	var center_x: float = 0.0
	var center_y: float = 0.0
	for entry_variant in group_entries:
		var entry: Dictionary = entry_variant as Dictionary
		center_x += float(entry.get("backendX", 0))
		center_y += float(entry.get("backendY", 0))
	center_x /= float(group_entries.size())
	center_y /= float(group_entries.size())

	var best_entry: Dictionary = {}
	var best_score: float = INF
	var best_level: int = -1
	for entry_variant in group_entries:
		if not (entry_variant is Dictionary):
			continue
		var entry: Dictionary = entry_variant as Dictionary
		var dx: float = float(entry.get("backendX", 0)) - center_x
		var dy: float = float(entry.get("backendY", 0)) - center_y
		var level: int = maxi(1, int(entry.get("cityLevel", 1)))
		var score: float = dx * dx + dy * dy - float(level) * 0.015
		if score < best_score or (is_equal_approx(score, best_score) and level > best_level):
			best_score = score
			best_level = level
			best_entry = entry
	return best_entry


func _resolve_world_cell_runtime_group_anchor_offset(group_entries: Array, anchor_entry: Dictionary) -> Array:
	if group_entries.size() <= 1 or anchor_entry.is_empty():
		return [0.0, 0.0]
	var center_x: float = 0.0
	var center_y: float = 0.0
	var valid_count: int = 0
	for entry_variant in group_entries:
		if not (entry_variant is Dictionary):
			continue
		var entry: Dictionary = entry_variant as Dictionary
		center_x += float(entry.get("tmxX", 0))
		center_y += float(entry.get("tmxY", 0))
		valid_count += 1
	if valid_count <= 0:
		return [0.0, 0.0]
	center_x /= float(valid_count)
	center_y /= float(valid_count)

	var locked_center_x: float = float(int(round(center_x)))
	var locked_center_y: float = float(int(round(center_y)))
	var delta_x: float = locked_center_x - float(anchor_entry.get("tmxX", locked_center_x))
	var delta_y: float = locked_center_y - float(anchor_entry.get("tmxY", locked_center_y))
	return [
		(delta_x - delta_y) * _tmx_tile_width * 0.5,
		(delta_x + delta_y) * _tmx_tile_height * 0.5,
	]


func _build_world_cell_anchor_visual_entry(
	anchor_entry: Dictionary,
	group_entries: Array,
	footprint_id: String,
	composite_id: String,
	group_size: int
) -> Dictionary:
	var visual_entry: Dictionary = anchor_entry.duplicate(true)
	visual_entry["compositeId"] = composite_id
	visual_entry["alpha"] = float(anchor_entry.get("alpha", 1.0))
	visual_entry["groupSize"] = group_size
	visual_entry["tmxX"] = int(anchor_entry.get("tmxX", -1))
	visual_entry["tmxY"] = int(anchor_entry.get("tmxY", -1))
	visual_entry["footprintId"] = footprint_id
	visual_entry["footprintTiles"] = _resolve_world_cell_footprint_tiles(footprint_id, [1, 1])
	visual_entry["offset"] = _resolve_world_cell_anchor_visual_offset(anchor_entry, group_entries)
	if str(visual_entry.get("type", "")).strip_edges() == "":
		visual_entry["type"] = _resolve_world_cell_runtime_type(anchor_entry, footprint_id)
	if str(visual_entry.get("id", "")).strip_edges() == "":
		var anchor_id: String = str(anchor_entry.get("tileId", anchor_entry.get("id", ""))).strip_edges()
		if anchor_id == "":
			anchor_id = "world_cell_%s" % _coord_key(int(anchor_entry.get("tmxX", -1)), int(anchor_entry.get("tmxY", -1))).replace(":", "_")
		visual_entry["id"] = anchor_id
	var composite: Dictionary = _get_world_cell_composite(composite_id)
	var rule: Dictionary = _get_world_cell_footprint_rule(footprint_id)
	var render_mode: String = str(composite.get("render_mode", rule.get("render_mode", ""))).strip_edges()
	if _should_world_cell_runtime_consume_payload_slots(render_mode, composite):
		var anchor_layers: Array = _resolve_world_cell_anchor_layers(composite)
		if not anchor_layers.is_empty():
			visual_entry["layeredLayers"] = anchor_layers
		var payload_slots: Array = _resolve_world_cell_payload_slots(composite, anchor_entry, footprint_id, group_size)
		if not payload_slots.is_empty():
			visual_entry["payloadSlots"] = payload_slots
	return visual_entry


func _should_world_cell_runtime_consume_payload_slots(render_mode: String, composite: Dictionary) -> bool:
	match render_mode.strip_edges().to_lower():
		"layered_city", "layered_node", "payload_node":
			return true
	var payload_slots_variant: Variant = composite.get("payload_slots", [])
	return payload_slots_variant is Array and not (payload_slots_variant as Array).is_empty()


func _resolve_world_cell_anchor_visual_offset(anchor_entry: Dictionary, group_entries: Array) -> Array:
	if group_entries.size() > 1:
		return _resolve_world_cell_runtime_group_anchor_offset(group_entries, anchor_entry)
	var explicit_offset: Variant = anchor_entry.get("offset", [0.0, 0.0])
	if explicit_offset is Array:
		var offset_values: Array = explicit_offset as Array
		if offset_values.size() >= 2:
			return [float(offset_values[0]), float(offset_values[1])]
	return [0.0, 0.0]


func _resolve_world_cell_runtime_footprint_center_tmx(anchor_entry: Dictionary, group_entries: Array) -> Vector2i:
	var center_tmx_x: float = float(anchor_entry.get("tmxX", -1))
	var center_tmx_y: float = float(anchor_entry.get("tmxY", -1))
	if group_entries.size() > 1:
		center_tmx_x = 0.0
		center_tmx_y = 0.0
		var valid_count: int = 0
		for entry_variant in group_entries:
			if not (entry_variant is Dictionary):
				continue
			var entry: Dictionary = entry_variant as Dictionary
			center_tmx_x += float(entry.get("tmxX", 0))
			center_tmx_y += float(entry.get("tmxY", 0))
			valid_count += 1
		if valid_count > 0:
			center_tmx_x /= float(valid_count)
			center_tmx_y /= float(valid_count)
	return Vector2i(int(round(center_tmx_x)), int(round(center_tmx_y)))


func _populate_world_cell_base_entries(
	center_tmx_x: int,
	center_tmx_y: int,
	footprint_id: String,
	anchor_key: String,
	anchor_visual_entry: Dictionary
) -> void:
	var rule: Dictionary = _get_world_cell_footprint_rule(footprint_id)
	if rule.is_empty():
		return
	var base_mode: String = str(rule.get("base_mode", "frame")).strip_edges().to_lower()
	if base_mode == "":
		base_mode = "frame"
	if base_mode == "none":
		return
	var base_frame: String = str(rule.get("base_frame", "")).strip_edges()
	if base_mode != "free_cell_base" and base_frame == "":
		return
	var base_alpha: float = float(rule.get("base_alpha", 0.96))
	var base_scale: float = float(rule.get("base_scale", 1.0))
	var base_offset: Array = rule.get("base_offset", [0.0, 0.0]) as Array
	if _is_world_cell_city_footprint_id(footprint_id):
		base_mode = "free_cell_base"
		base_frame = ""
		base_alpha = zero_level_substrate_alpha
		base_scale = 1.0
		base_offset = [0.0, 0.0]
	var payload_state_by_offset: Dictionary = _build_world_cell_payload_state_by_offset(
		anchor_visual_entry.get("payloadSlots", [])
	)
	var offsets: Array = _resolve_world_cell_footprint_offsets(footprint_id, [3, 3])
	for offset_variant in offsets:
		var offset: Vector2i = _vector2i_from_json_array(offset_variant, Vector2i.ZERO)
		var tmx_x: int = clampi(center_tmx_x + offset.x, 0, _main_map_runtime_tmx_max_x())
		var tmx_y: int = clampi(center_tmx_y + offset.y, 0, _main_map_runtime_tmx_max_y())
		var tmx_key: String = _coord_key(tmx_x, tmx_y)
		var existing_base_variant: Variant = _world_cell_node_base_by_tmx_key.get(tmx_key, {})
		if existing_base_variant is Dictionary:
			var existing_base: Dictionary = existing_base_variant as Dictionary
			var existing_anchor_key: String = str(existing_base.get("anchorKey", "")).strip_edges()
			if existing_anchor_key != "" and existing_anchor_key != anchor_key:
				push_warning("[world-cell] footprint base conflict skipped | tmx=%s footprint=%s existingAnchor=%s nextAnchor=%s" % [tmx_key, footprint_id, existing_anchor_key, anchor_key])
				continue
		var offset_key: String = _coord_key(offset.x, offset.y)
		var payload_meta: Dictionary = payload_state_by_offset.get(offset_key, {}) as Dictionary
		var is_perimeter: bool = _is_world_cell_perimeter_offset(offset, rule.get("footprint_tiles", [3, 3]) as Array)
		_world_cell_node_base_by_tmx_key[tmx_key] = {
			"tmxX": tmx_x,
			"tmxY": tmx_y,
			"frame": base_frame,
			"baseMode": base_mode,
			"alpha": base_alpha,
			"scale": base_scale,
			"offset": base_offset,
			"anchorKey": anchor_key,
			"footprintId": footprint_id,
			"cellState": str(payload_meta.get("cellState", "reserved_base")),
			"slotId": str(payload_meta.get("slotId", "")).strip_edges(),
			"isPerimeter": is_perimeter,
			"footprintOffset": [offset.x, offset.y],
		}


func _reserve_world_cell_footprint_at(center_tmx_x: int, center_tmx_y: int, footprint_id: String, anchor_key: String) -> void:
	if not _does_world_cell_placement_policy_apply(footprint_id, WORLD_CELL_PLACEMENT_ACTION_RESERVE_CELLS):
		return
	var offsets: Array = _resolve_world_cell_footprint_offsets(footprint_id, [3, 3])
	for offset_variant in offsets:
		var offset: Vector2i = _vector2i_from_json_array(offset_variant, Vector2i.ZERO)
		var tmx_x: int = clampi(center_tmx_x + offset.x, 0, _main_map_runtime_tmx_max_x())
		var tmx_y: int = clampi(center_tmx_y + offset.y, 0, _main_map_runtime_tmx_max_y())
		var tmx_key: String = _coord_key(tmx_x, tmx_y)
		var existing_anchor_key: String = str(_world_cell_reserved_anchor_by_tmx_key.get(tmx_key, "")).strip_edges()
		if existing_anchor_key != "" and existing_anchor_key != anchor_key:
			push_warning("[world-cell] footprint reservation conflict skipped | tmx=%s footprint=%s existingAnchor=%s nextAnchor=%s" % [tmx_key, footprint_id, existing_anchor_key, anchor_key])
			continue
		_world_cell_reserved_footprint_tmx_keys[tmx_key] = footprint_id
		_world_cell_reserved_anchor_by_tmx_key[tmx_key] = anchor_key
		_world_cell_reserved_center_by_tmx_key[tmx_key] = [center_tmx_x, center_tmx_y]


func _rebuild_world_cell_preview_entries() -> void:
	_world_cell_preview_tile_by_tmx_key = {}
	_world_cell_preview_focus_tiles = {}
	_world_cell_preview_sample_by_id = {}
	_world_cell_preview_sample_order = []
	_world_cell_preview_placement_audit_by_sample_id = {}
	if _is_world_cell_live_capture_requested():
		return
	if not world_cell_preview_nodes_enabled:
		return
	if _tmx_map_width <= 0 or _tmx_map_height <= 0:
		return
	var preview_layout: Dictionary = _resolve_world_cell_preview_layout()
	var samples_variant: Variant = preview_layout.get("samples", [])
	if not (samples_variant is Array):
		return
	var samples: Array = samples_variant as Array
	for sample_variant in samples:
		if not (sample_variant is Dictionary):
			continue
		var sample: Dictionary = sample_variant as Dictionary
		var footprint_id: String = str(sample.get("footprintId", "")).strip_edges()
		if footprint_id == "":
			continue
		var preferred_tmx: Vector2i = _vector2i_from_json_array(sample.get("preferredTmx", []), Vector2i(-1, -1))
		var sample_id: String = str(sample.get("id", _coord_key(preferred_tmx.x, preferred_tmx.y))).strip_edges()
		var node_type: String = str(sample.get("type", "")).strip_edges().to_lower()
		var placement_resolution: Dictionary = _resolve_world_cell_preview_anchor_resolution(preferred_tmx, footprint_id, node_type)
		placement_resolution["sampleId"] = sample_id
		placement_resolution["type"] = node_type
		_world_cell_preview_placement_audit_by_sample_id[sample_id] = placement_resolution
		var anchor_tmx: Vector2i = _vector2i_from_json_array(placement_resolution.get("anchorTmx", [-1, -1]), Vector2i(-1, -1))
		if anchor_tmx.x < 0 or anchor_tmx.y < 0:
			continue
		_register_world_cell_preview_anchor(anchor_tmx, sample)


func _resolve_world_cell_preview_layout() -> Dictionary:
	var visible_bounds: Dictionary = _compute_visible_tmx_bounds()
	var preview_mode: String = _resolve_world_cell_preview_mode()
	var preview_variant: String = _resolve_world_cell_preview_variant()
	var start_x: int = 10
	var start_y: int = 10
	if preview_variant == "formal":
		start_x = 4
		start_y = 12
	elif preview_variant == "stages":
		start_x = 3
		start_y = 9
	if bool(visible_bounds.get("valid", false)):
		var start_x_bias: int = 12
		var start_y_bias: int = 12
		if preview_variant == "formal":
			start_x_bias = 6
		elif preview_variant == "stages":
			start_x_bias = 4
			start_y_bias = 8
		start_x = clampi(int(visible_bounds.get("startX", 0)) + start_x_bias, 2, maxi(2, _main_map_runtime_tmx_width() - 12))
		start_y = clampi(int(visible_bounds.get("startY", 0)) + start_y_bias, 2, maxi(2, _main_map_runtime_tmx_height() - 12))
	var samples: Array = []
	if preview_mode == "city" or preview_mode == "mixed":
		samples.append_array(_build_world_cell_city_preview_samples(Vector2i(start_x, start_y), preview_variant))
	if preview_mode == "nodes" or preview_mode == "mixed":
		samples.append_array(_build_world_cell_node_preview_samples(start_x, start_y, preview_variant))
	return {"mode": preview_mode, "variant": preview_variant, "samples": samples}


func _resolve_world_cell_preview_mode() -> String:
	var preview_mode: String = OS.get_environment("SLG_WORLD_CELL_PREVIEW_MODE").strip_edges().to_lower()
	if preview_mode == "nodes" or preview_mode == "mixed" or preview_mode == "city":
		return preview_mode
	return "city"


func _resolve_world_cell_capture_mode() -> String:
	var capture_mode: String = OS.get_environment("SLG_WORLD_CELL_CAPTURE_MODE").strip_edges().to_lower()
	if capture_mode == "live_pass" or capture_mode == "backend_pass":
		return WORLD_CELL_CAPTURE_MODE_LIVE_PASS
	if capture_mode == "live_nodes" or capture_mode == "backend_nodes" or capture_mode == "live_backend_nodes":
		return WORLD_CELL_CAPTURE_MODE_LIVE_NODES
	return WORLD_CELL_CAPTURE_MODE_PREVIEW


func _is_world_cell_live_capture_requested() -> bool:
	var capture_mode: String = _resolve_world_cell_capture_mode()
	return capture_mode == WORLD_CELL_CAPTURE_MODE_LIVE_PASS or capture_mode == WORLD_CELL_CAPTURE_MODE_LIVE_NODES


func _is_world_cell_live_pass_capture_requested() -> bool:
	return _resolve_world_cell_capture_mode() == WORLD_CELL_CAPTURE_MODE_LIVE_PASS


func _resolve_world_cell_preview_variant() -> String:
	var preview_variant: String = OS.get_environment("SLG_WORLD_CELL_PREVIEW_VARIANT").strip_edges().to_lower()
	if preview_variant == "formal":
		return "formal"
	if preview_variant == "stages":
		return "stages"
	return "spec"


func _build_world_cell_city_preview_samples(base_tmx: Vector2i, preview_variant: String = "spec") -> Array:
	if preview_variant == "formal":
		return _build_world_cell_city_formal_preview_samples(base_tmx)
	if preview_variant == "stages":
		return _build_world_cell_city_stage_preview_samples(base_tmx)
	return _build_world_cell_city_spec_preview_samples(base_tmx)


func _build_world_cell_city_spec_preview_samples(base_tmx: Vector2i) -> Array:
	var samples: Array = []
	samples.append_array([
		{
			"id": "preview_city_3x3_hall_only",
			"label": "3x3 hall-only",
			"footprintId": WORLD_CELL_FOOTPRINT_PLAYER_CITY_3X3_INITIAL,
			"compositeId": "world_node_city_v1",
			"preferredTmx": _preview_tmx_to_array(_offset_world_cell_preview_tmx(base_tmx, 0, 0)),
			"type": "player_city",
			"terrain": "cityland",
			"district": "preview",
			"owner": "player",
			"cityLevel": 3,
			"expansionStage": 0,
			"stateTag": "hall_only",
			"focus": "selected",
			"focusOffset": [1, 0],
		},
		{
			"id": "preview_city_5x5_activated",
			"label": "5x5 activated",
			"footprintId": WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L05_L06_5X5,
			"compositeId": "world_node_system_city_5x5_v1",
			"preferredTmx": _preview_tmx_to_array(_offset_world_cell_preview_tmx(base_tmx, 6, 0)),
			"type": "system_city",
			"terrain": "cityland",
			"district": "preview",
			"owner": "neutral",
			"cityLevel": 6,
			"expansionStage": 2,
			"stateTag": "activated",
			"focus": "hover",
			"focusOffset": [1, 1],
		},
		{
			"id": "preview_city_7x7_activated",
			"label": "7x7 activated",
			"footprintId": WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L07_L08_7X7,
			"compositeId": "world_node_system_city_7x7_v1",
			"preferredTmx": _preview_tmx_to_array(_offset_world_cell_preview_tmx(base_tmx, 0, 6)),
			"type": "system_city",
			"terrain": "cityland",
			"district": "preview",
			"owner": "neutral",
			"cityLevel": 8,
			"expansionStage": 3,
			"stateTag": "activated",
		},
		{
			"id": "preview_city_9x9_activated",
			"label": "9x9 activated",
			"footprintId": WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L09_9X9,
			"compositeId": "world_node_system_city_9x9_v1",
			"preferredTmx": _preview_tmx_to_array(_offset_world_cell_preview_tmx(base_tmx, 6, 7)),
			"type": "system_city",
			"terrain": "cityland",
			"district": "preview",
			"owner": "neutral",
			"cityLevel": 9,
			"expansionStage": 4,
			"stateTag": "activated",
		},
	])
	return samples


func _build_world_cell_city_formal_preview_samples(base_tmx: Vector2i) -> Array:
	var samples: Array = []
	samples.append_array([
		{
			"id": "preview_system_city_5x5_formal",
			"label": "5x5 formal layout",
			"footprintId": WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L05_L06_5X5,
			"compositeId": "world_node_system_city_5x5_v1",
			"preferredTmx": _preview_tmx_to_array(_offset_world_cell_preview_tmx(base_tmx, 0, 0)),
			"type": "system_city",
			"terrain": "cityland",
			"district": "preview_formal",
			"owner": "neutral",
			"cityLevel": 5,
			"expansionStage": 1,
			"stateTag": "formal_layout",
			"focus": "selected",
			"focusOffset": [0, 0],
		},
		{
			"id": "preview_system_city_7x7_formal",
			"label": "7x7 formal layout",
			"footprintId": WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L07_L08_7X7,
			"compositeId": "world_node_system_city_7x7_v1",
			"preferredTmx": _preview_tmx_to_array(_offset_world_cell_preview_tmx(base_tmx, 6, 1)),
			"type": "system_city",
			"terrain": "cityland",
			"district": "preview_formal",
			"owner": "neutral",
			"cityLevel": 7,
			"expansionStage": 2,
			"stateTag": "formal_layout",
			"focus": "hover",
			"focusOffset": [1, 0],
		},
		{
			"id": "preview_system_city_9x9_formal",
			"label": "9x9 formal layout",
			"footprintId": WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L09_9X9,
			"compositeId": "world_node_system_city_9x9_v1",
			"preferredTmx": _preview_tmx_to_array(_offset_world_cell_preview_tmx(base_tmx, 1, 8)),
			"type": "system_city",
			"terrain": "cityland",
			"district": "preview_formal",
			"owner": "neutral",
			"cityLevel": 9,
			"expansionStage": 3,
			"stateTag": "formal_layout",
		},
	])
	return samples


func _build_world_cell_city_stage_preview_samples(base_tmx: Vector2i) -> Array:
	var samples: Array = []
	samples.append_array([
		{
			"id": "preview_city_stage_0",
			"label": "Stage 0 / hall-only",
			"footprintId": WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L03_L04_3X3,
			"compositeId": "world_node_system_city_3x3_v1",
			"preferredTmx": _preview_tmx_to_array(_offset_world_cell_preview_tmx(base_tmx, 0, 0)),
			"type": "system_city",
			"terrain": "cityland",
			"district": "preview_stages",
			"owner": "neutral",
			"cityLevel": 3,
			"expansionStage": 0,
			"stateTag": "stage_0",
		},
		{
			"id": "preview_city_stage_1",
			"label": "Stage 1 / inner ring",
			"footprintId": WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L05_L06_5X5,
			"compositeId": "world_node_system_city_5x5_v1",
			"preferredTmx": _preview_tmx_to_array(_offset_world_cell_preview_tmx(base_tmx, 6, 0)),
			"type": "system_city",
			"terrain": "cityland",
			"district": "preview_stages",
			"owner": "neutral",
			"cityLevel": 5,
			"expansionStage": 1,
			"stateTag": "stage_1",
			"focus": "selected",
			"focusOffset": [0, 0],
		},
		{
			"id": "preview_city_stage_2",
			"label": "Stage 2 / core district",
			"footprintId": WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L07_L08_7X7,
			"compositeId": "world_node_system_city_7x7_v1",
			"preferredTmx": _preview_tmx_to_array(_offset_world_cell_preview_tmx(base_tmx, 0, 6)),
			"type": "system_city",
			"terrain": "cityland",
			"district": "preview_stages",
			"owner": "neutral",
			"cityLevel": 7,
			"expansionStage": 2,
			"stateTag": "stage_2",
		},
		{
			"id": "preview_city_stage_3",
			"label": "Stage 3 / outer district",
			"footprintId": WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L09_9X9,
			"compositeId": "world_node_system_city_9x9_v1",
			"preferredTmx": _preview_tmx_to_array(_offset_world_cell_preview_tmx(base_tmx, 7, 6)),
			"type": "system_city",
			"terrain": "cityland",
			"district": "preview_stages",
			"owner": "neutral",
			"cityLevel": 9,
			"expansionStage": 3,
			"stateTag": "stage_3",
		},
		{
			"id": "preview_city_stage_4",
			"label": "Stage 4 / full footprint",
			"footprintId": WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L09_9X9,
			"compositeId": "world_node_system_city_9x9_v1",
			"preferredTmx": _preview_tmx_to_array(_offset_world_cell_preview_tmx(base_tmx, 4, 13)),
			"type": "system_city",
			"terrain": "cityland",
			"district": "preview_stages",
			"owner": "neutral",
			"cityLevel": 9,
			"expansionStage": 4,
			"stateTag": "stage_4",
			"focus": "hover",
			"focusOffset": [3, 4],
		},
	])
	return samples


func _build_world_cell_node_preview_samples(start_x: int, start_y: int, preview_variant: String = "spec") -> Array:
	var samples: Array = WORLD_CELL_NODE_PREVIEW_TYPES.duplicate()
	if preview_variant != "formal" and world_cell_preview_placeholders_enabled:
		samples.append_array(WORLD_CELL_NODE_PREVIEW_PLACEHOLDER_TYPES)
	var preview_samples: Array = []
	for node_type_variant in samples:
		var node_type: String = str(node_type_variant).strip_edges()
		preview_samples.append_array(
			_build_world_cell_node_preview_samples_for_type(node_type, start_x, start_y, preview_variant)
		)
	return preview_samples


func _build_world_cell_node_preview_samples_for_type(
	node_type: String,
	start_x: int,
	start_y: int,
	preview_variant: String
) -> Array:
	var dispatch_rule: Dictionary = _resolve_world_cell_node_dispatch_rule(node_type)
	var preview_rule: Dictionary = _resolve_world_cell_node_preview_sample_rule(node_type)
	if dispatch_rule.is_empty() and preview_rule.is_empty():
		return []
	var sample_defs_variant: Variant = preview_rule.get(
		"preview_formal_samples" if preview_variant == "formal" else "preview_spec_samples",
		[]
	)
	if not (sample_defs_variant is Array):
		return []
	var sample_defs: Array = sample_defs_variant as Array
	var preview_samples: Array = []
	for sample_def_variant in sample_defs:
		if not (sample_def_variant is Dictionary):
			continue
		var sample_def: Dictionary = sample_def_variant as Dictionary
		var preferred_offset: Vector2i = _vector2i_from_json_array(sample_def.get("preferred_offset", [0, 0]), Vector2i.ZERO)
		var fallback_footprint_id: String = str(preview_rule.get("footprint_id", dispatch_rule.get("footprint_id", ""))).strip_edges()
		var fallback_terrain: String = str(preview_rule.get("default_terrain", dispatch_rule.get("default_terrain", ""))).strip_edges()
		var sample := {
			"id": str(sample_def.get("id", "%s_preview" % node_type)).strip_edges(),
			"label": str(sample_def.get("label", node_type)).strip_edges(),
			"footprintId": str(sample_def.get("footprintId", fallback_footprint_id)).strip_edges(),
			"preferredTmx": [start_x + preferred_offset.x, start_y + preferred_offset.y],
			"type": node_type,
			"terrain": str(sample_def.get("terrain", fallback_terrain)).strip_edges(),
			"district": str(sample_def.get("district", "preview_formal" if preview_variant == "formal" else "preview")).strip_edges(),
		}
		var default_composite_id: String = str(preview_rule.get("default_composite_id", dispatch_rule.get("default_composite_id", ""))).strip_edges()
		if sample_def.has("compositeId"):
			sample["compositeId"] = str(sample_def.get("compositeId", "")).strip_edges()
		elif default_composite_id != "":
			sample["compositeId"] = default_composite_id
		for key in ["stateTag", "focus", "focusOffset", "placeholderRole", "scale", "offset", "frame", "alpha"]:
			if sample_def.has(key):
				sample[key] = sample_def.get(key)
		preview_samples.append(sample)
	return preview_samples


func _offset_world_cell_preview_tmx(base_tmx: Vector2i, right_steps: int, down_steps: int) -> Vector2i:
	return Vector2i(
		base_tmx.x + right_steps + down_steps,
		base_tmx.y - right_steps + down_steps
	)


func _preview_tmx_to_array(cell: Vector2i) -> Array:
	return [cell.x, cell.y]


func _resolve_world_cell_preview_anchor_resolution(preferred_tmx: Vector2i, footprint_id: String, node_type: String = "") -> Dictionary:
	var normalized_node_type: String = node_type.strip_edges().to_lower()
	var audit := {
		"ok": false,
		"context": WORLD_CELL_PLACEMENT_CONTEXT_PREVIEW_NODE_PLACEMENT,
		"footprintId": footprint_id,
		"nodeType": normalized_node_type,
		"preferredTmx": [preferred_tmx.x, preferred_tmx.y],
		"anchorTmx": [-1, -1],
		"candidateCount": 0,
		"blockedCandidateCount": 0,
		"blockedSamples": [],
	}
	var base_x: int = clampi(preferred_tmx.x, 0, _main_map_runtime_tmx_max_x())
	var base_y: int = clampi(preferred_tmx.y, 0, _main_map_runtime_tmx_max_y())
	for radius in range(0, 14):
		for dy in range(-radius, radius + 1):
			for dx in range(-radius, radius + 1):
				if radius > 0 and maxi(abs(dx), abs(dy)) != radius:
					continue
				var candidate := Vector2i(base_x + dx, base_y + dy)
				audit["candidateCount"] = int(audit.get("candidateCount", 0)) + 1
				var placement_match: Dictionary = _resolve_world_cell_preview_placement_match(candidate, footprint_id, normalized_node_type)
				if placement_match.is_empty():
					audit["ok"] = true
					audit["anchorTmx"] = [candidate.x, candidate.y]
					audit["searchRadius"] = radius
					audit["displacedFromPreferred"] = candidate != preferred_tmx
					return audit
				audit["blockedCandidateCount"] = int(audit.get("blockedCandidateCount", 0)) + 1
				var blocked_samples: Array = audit.get("blockedSamples", []) as Array
				if blocked_samples.size() < 8:
					blocked_samples.append(placement_match)
					audit["blockedSamples"] = blocked_samples
	audit["searchRadius"] = 13
	audit["displacedFromPreferred"] = true
	return audit


func _find_world_cell_preview_anchor(preferred_tmx: Vector2i, footprint_id: String, node_type: String = "") -> Vector2i:
	var resolution: Dictionary = _resolve_world_cell_preview_anchor_resolution(preferred_tmx, footprint_id, node_type)
	return _vector2i_from_json_array(resolution.get("anchorTmx", [-1, -1]), Vector2i(-1, -1))


func _resolve_world_cell_preview_placement_match(center_tmx: Vector2i, footprint_id: String, node_type: String = "") -> Dictionary:
	var normalized_node_type: String = node_type.strip_edges().to_lower()
	var placement_context := {
		"nodeType": normalized_node_type,
		"footprintId": footprint_id,
	}
	var offsets: Array = _resolve_world_cell_footprint_offsets(footprint_id, [1, 1])
	for offset_variant in offsets:
		var offset: Vector2i = _vector2i_from_json_array(offset_variant, Vector2i.ZERO)
		var tmx_x: int = center_tmx.x + offset.x
		var tmx_y: int = center_tmx.y + offset.y
		if tmx_x < 0 or tmx_y < 0 or tmx_x >= _tmx_map_width or tmx_y >= _tmx_map_height:
			return {
				"blocked": true,
				"reason": "out_of_bounds",
				"centerTmx": [center_tmx.x, center_tmx.y],
				"footprintId": footprint_id,
				"nodeType": normalized_node_type,
				"footprintOffset": [offset.x, offset.y],
				"tmx": [tmx_x, tmx_y],
			}
		var tmx_key: String = _coord_key(tmx_x, tmx_y)
		var context_match: Dictionary = _resolve_world_cell_placement_context_match_at_tmx_key(
			tmx_key,
			WORLD_CELL_PLACEMENT_CONTEXT_PREVIEW_NODE_PLACEMENT,
			0,
			placement_context
		)
		if not context_match.is_empty():
			return {
				"blocked": true,
				"reason": "placement_context",
				"centerTmx": [center_tmx.x, center_tmx.y],
				"footprintId": footprint_id,
				"nodeType": normalized_node_type,
				"footprintOffset": [offset.x, offset.y],
				"tmx": [tmx_x, tmx_y],
				"tmxKey": tmx_key,
				"context": WORLD_CELL_PLACEMENT_CONTEXT_PREVIEW_NODE_PLACEMENT,
				"match": context_match,
			}
	return {}


func _can_place_world_cell_preview_at(center_tmx: Vector2i, footprint_id: String, node_type: String = "") -> bool:
	return _resolve_world_cell_preview_placement_match(center_tmx, footprint_id, node_type).is_empty()


func _register_world_cell_preview_anchor(center_tmx: Vector2i, sample: Dictionary) -> void:
	var footprint_id: String = str(sample.get("footprintId", "")).strip_edges()
	var anchor_key: String = _coord_key(center_tmx.x, center_tmx.y)
	var anchor_entry := {
		"tmxX": center_tmx.x,
		"tmxY": center_tmx.y,
		"footprintId": footprint_id,
		"footprintTiles": _resolve_world_cell_footprint_tiles(footprint_id, [1, 1]),
		"alpha": float(sample.get("alpha", 1.0)),
		"frame": str(sample.get("frame", "")).strip_edges(),
		"offset": sample.get("offset", [0.0, 0.0]),
		"scale": float(sample.get("scale", 1.0)),
		"compositeId": str(sample.get("compositeId", "")).strip_edges(),
		"placeholderRole": str(sample.get("placeholderRole", "")).strip_edges(),
		"owner": str(sample.get("owner", "")).strip_edges(),
		"cityLevel": int(sample.get("cityLevel", 1)),
		"tileId": str(sample.get("tileId", "")).strip_edges(),
		"landmarkId": str(sample.get("landmarkId", "")).strip_edges(),
	}
	if sample.has("expansionStage"):
		anchor_entry["expansionStage"] = int(sample.get("expansionStage", 0))
	var anchor_visual_entry: Dictionary = anchor_entry.duplicate(true)
	var composite_id: String = str(anchor_entry.get("compositeId", "")).strip_edges()
	var preview_frame: String = str(anchor_entry.get("frame", "")).strip_edges()
	if preview_frame == "" and composite_id != "":
		var group_size: int = _resolve_world_cell_footprint_offsets(footprint_id, [1, 1]).size()
		anchor_visual_entry = _build_world_cell_anchor_visual_entry(anchor_entry, [anchor_entry], footprint_id, composite_id, group_size)
		if anchor_visual_entry.is_empty():
			anchor_visual_entry = anchor_entry.duplicate(true)
		else:
			for key in ["owner", "cityLevel", "tileId", "landmarkId", "expansionStage", "placeholderRole"]:
				if anchor_entry.has(key):
					anchor_visual_entry[key] = anchor_entry.get(key)
	_world_cell_node_anchor_by_tmx_key[anchor_key] = anchor_visual_entry
	_reserve_world_cell_footprint_at(center_tmx.x, center_tmx.y, footprint_id, anchor_key)
	if not anchor_visual_entry.is_empty():
		_populate_world_cell_base_entries(center_tmx.x, center_tmx.y, footprint_id, anchor_key, anchor_visual_entry)
	_register_world_cell_preview_tiles(center_tmx, footprint_id, sample, anchor_key, anchor_visual_entry)
	_register_world_cell_preview_sample(center_tmx, footprint_id, sample, anchor_key, anchor_visual_entry)


func _register_world_cell_preview_tiles(
	center_tmx: Vector2i,
	footprint_id: String,
	sample: Dictionary,
	anchor_key: String,
	anchor_entry: Dictionary = {}
) -> void:
	var offsets: Array = _resolve_world_cell_footprint_offsets(footprint_id, [1, 1])
	var focus_slot: String = str(sample.get("focus", "")).strip_edges().to_lower()
	var focus_offset: Vector2i = _vector2i_from_json_array(sample.get("focusOffset", []), Vector2i(99999, 99999))
	var role: String = str(sample.get("type", footprint_id)).strip_edges().to_lower()
	var terrain: String = str(sample.get("terrain", role)).strip_edges().to_lower()
	var district: String = str(sample.get("district", "preview")).strip_edges()
	var sample_id: String = str(sample.get("id", anchor_key)).strip_edges()
	var payload_state_by_offset: Dictionary = _build_world_cell_payload_state_by_offset(anchor_entry.get("payloadSlots", []))
	for offset_variant in offsets:
		var offset: Vector2i = _vector2i_from_json_array(offset_variant, Vector2i.ZERO)
		var tmx_x: int = center_tmx.x + offset.x
		var tmx_y: int = center_tmx.y + offset.y
		var tmx_key: String = _coord_key(tmx_x, tmx_y)
		var payload_meta: Dictionary = payload_state_by_offset.get(_coord_key(offset.x, offset.y), {}) as Dictionary
		var preview_tile := {
			"id": "preview_%s_%s" % [sample_id, tmx_key.replace(":", "_")],
			"x": tmx_x,
			"y": tmx_y,
			"tmxX": tmx_x,
			"tmxY": tmx_y,
			"type": role,
			"terrain": terrain,
			"district": district,
			"footprintId": footprint_id,
			"anchorKey": anchor_key,
			"isPreview": true,
			"sampleId": sample_id,
			"cellState": str(payload_meta.get("cellState", "reserved_base")).strip_edges(),
			"slotId": str(payload_meta.get("slotId", "")).strip_edges(),
		}
		_world_cell_preview_tile_by_tmx_key[tmx_key] = preview_tile
		var is_focus_tile: bool = false
		if focus_slot != "":
			if focus_offset != Vector2i(99999, 99999):
				is_focus_tile = offset == focus_offset
			else:
				is_focus_tile = tmx_key == anchor_key
		if is_focus_tile:
			_world_cell_preview_focus_tiles[focus_slot] = preview_tile


func _register_world_cell_preview_sample(
	center_tmx: Vector2i,
	footprint_id: String,
	sample: Dictionary,
	anchor_key: String,
	anchor_entry: Dictionary
) -> void:
	var sample_id: String = str(sample.get("id", anchor_key)).strip_edges()
	var composite_id: String = str(anchor_entry.get("compositeId", sample.get("compositeId", ""))).strip_edges()
	var composite: Dictionary = _get_world_cell_composite(composite_id)
	var group_size: int = _resolve_world_cell_footprint_offsets(footprint_id, [1, 1]).size()
	var payload_slots: Array = anchor_entry.get("payloadSlots", []) as Array
	var active_count: int = 0
	var reserved_count: int = 0
	var hall_active: int = 0
	for slot_variant in payload_slots:
		if not (slot_variant is Dictionary):
			continue
		var slot: Dictionary = slot_variant as Dictionary
		var is_active: bool = bool(slot.get("active", false))
		if is_active:
			active_count += 1
			if str(slot.get("slot_role", "")).strip_edges() == "hall":
				hall_active += 1
		else:
			reserved_count += 1
	var summary := {
		"id": sample_id,
		"label": str(sample.get("label", sample_id)).strip_edges(),
		"stateTag": str(sample.get("stateTag", "")).strip_edges(),
		"anchorKey": anchor_key,
		"anchorTmx": [center_tmx.x, center_tmx.y],
		"footprintId": footprint_id,
		"compositeId": composite_id,
		"payloadStage": _resolve_world_cell_node_payload_stage(anchor_entry, footprint_id, group_size, composite),
		"activePayloadCells": active_count,
		"reservedPayloadCells": reserved_count,
		"hallActiveCount": hall_active,
		"cellCount": group_size,
		"captureRect": _rect2_to_json_array(_estimate_world_cell_preview_sample_rect(center_tmx, footprint_id)),
	}
	var placement_resolution_variant: Variant = _world_cell_preview_placement_audit_by_sample_id.get(sample_id, {})
	if placement_resolution_variant is Dictionary:
		summary["placementResolution"] = (placement_resolution_variant as Dictionary).duplicate(true)
	_world_cell_preview_sample_by_id[sample_id] = summary
	_world_cell_preview_sample_order.append(sample_id)


func _rebuild_world_cell_live_capture_samples() -> void:
	_world_cell_live_capture_sample_by_id = {}
	_world_cell_live_capture_sample_order = []
	if not _is_world_cell_live_capture_requested():
		return
	var selected_anchors: Array = _select_world_cell_live_capture_anchors()
	if selected_anchors.is_empty():
		return
	var sample_index: int = 0
	for anchor_variant in selected_anchors:
		if not (anchor_variant is Dictionary):
			continue
		_register_world_cell_live_node_capture_sample(anchor_variant as Dictionary, sample_index)
		sample_index += 1


func _resolve_world_cell_live_capture_node_types() -> Array:
	if _resolve_world_cell_capture_mode() == WORLD_CELL_CAPTURE_MODE_LIVE_NODES:
		return WORLD_CELL_LIVE_STRATEGIC_NODE_TYPES.duplicate(true)
	return ["pass"]


func _resolve_world_cell_live_pass_anchor_entries() -> Array:
	return _resolve_world_cell_live_node_anchor_entries("pass")


func _resolve_world_cell_live_node_anchor_entries(node_type_filter: String = "") -> Array:
	var normalized_filter: String = node_type_filter.strip_edges().to_lower()
	var anchors: Array = []
	for anchor_variant in _world_cell_node_anchor_by_tmx_key.values():
		if not (anchor_variant is Dictionary):
			continue
		var anchor_entry: Dictionary = anchor_variant as Dictionary
		var node_type: String = str(anchor_entry.get("type", "")).strip_edges().to_lower()
		var footprint_id: String = str(anchor_entry.get("footprintId", "")).strip_edges()
		var expected_footprint_id: String = _resolve_world_cell_node_dispatch_footprint_id(normalized_filter)
		if normalized_filter == "":
			if _is_supported_world_cell_node_tile_type(node_type):
				anchors.append(anchor_entry)
		elif node_type == normalized_filter or (expected_footprint_id != "" and footprint_id == expected_footprint_id):
			anchors.append(anchor_entry)
	return anchors


func _select_world_cell_live_capture_anchors() -> Array:
	var capture_node_types: Array = _resolve_world_cell_live_capture_node_types()
	if capture_node_types.size() == 1 and str(capture_node_types[0]).strip_edges().to_lower() == "pass":
		return _select_world_cell_live_pass_capture_anchors(_resolve_world_cell_live_pass_anchor_entries())
	var selected_anchors: Array = []
	var used_anchor_keys: Dictionary = {}
	for node_type_variant in capture_node_types:
		var node_type: String = str(node_type_variant).strip_edges().to_lower()
		var anchors: Array = _resolve_world_cell_live_node_anchor_entries(node_type)
		if anchors.is_empty():
			continue
		var primary_anchor: Dictionary = _pick_world_cell_live_pass_primary_anchor(anchors)
		_append_world_cell_live_capture_anchor(selected_anchors, used_anchor_keys, primary_anchor)
		if selected_anchors.size() >= 6:
			break
		var nearest_anchor: Dictionary = _pick_nearest_world_cell_live_pass_anchor(anchors, primary_anchor, used_anchor_keys)
		_append_world_cell_live_capture_anchor(selected_anchors, used_anchor_keys, nearest_anchor)
		if selected_anchors.size() >= 6:
			break
	return selected_anchors


func _select_world_cell_live_pass_capture_anchors(pass_anchors: Array) -> Array:
	var selected_anchors: Array = []
	var used_anchor_keys: Dictionary = {}
	var primary_anchor: Dictionary = _pick_world_cell_live_pass_primary_anchor(pass_anchors)
	if primary_anchor.is_empty():
		return selected_anchors
	_append_world_cell_live_capture_anchor(selected_anchors, used_anchor_keys, primary_anchor)
	while selected_anchors.size() < 3 and selected_anchors.size() < pass_anchors.size():
		var nearest_anchor: Dictionary = _pick_nearest_world_cell_live_pass_anchor(pass_anchors, primary_anchor, used_anchor_keys)
		if nearest_anchor.is_empty():
			break
		_append_world_cell_live_capture_anchor(selected_anchors, used_anchor_keys, nearest_anchor)
	return selected_anchors


func _append_world_cell_live_pass_capture_anchor(selected_anchors: Array, used_anchor_keys: Dictionary, anchor_entry: Dictionary) -> void:
	_append_world_cell_live_capture_anchor(selected_anchors, used_anchor_keys, anchor_entry)


func _append_world_cell_live_capture_anchor(selected_anchors: Array, used_anchor_keys: Dictionary, anchor_entry: Dictionary) -> void:
	var tmx_x: int = int(anchor_entry.get("tmxX", -1))
	var tmx_y: int = int(anchor_entry.get("tmxY", -1))
	if tmx_x < 0 or tmx_y < 0:
		return
	var anchor_key: String = _coord_key(tmx_x, tmx_y)
	if used_anchor_keys.has(anchor_key):
		return
	used_anchor_keys[anchor_key] = true
	selected_anchors.append(anchor_entry)


func _pick_world_cell_live_pass_primary_anchor(pass_anchors: Array) -> Dictionary:
	var best_anchor: Dictionary = {}
	var best_score: float = INF
	var target_x: float = float(_tmx_map_width) * 0.5
	var target_y: float = float(_tmx_map_height) * 0.5
	for anchor_variant in pass_anchors:
		if not (anchor_variant is Dictionary):
			continue
		var anchor_entry: Dictionary = anchor_variant as Dictionary
		var tmx_x: float = float(anchor_entry.get("tmxX", -1))
		var tmx_y: float = float(anchor_entry.get("tmxY", -1))
		if tmx_x < 0.0 or tmx_y < 0.0:
			continue
		var dx: float = tmx_x - target_x
		var dy: float = tmx_y - target_y
		var score: float = dx * dx + dy * dy
		if score < best_score:
			best_score = score
			best_anchor = anchor_entry
	return best_anchor


func _pick_nearest_world_cell_live_pass_anchor(pass_anchors: Array, primary_anchor: Dictionary, used_anchor_keys: Dictionary) -> Dictionary:
	var best_anchor: Dictionary = {}
	var best_score: float = INF
	var primary_tmx_x: float = float(primary_anchor.get("tmxX", 0))
	var primary_tmx_y: float = float(primary_anchor.get("tmxY", 0))
	for anchor_variant in pass_anchors:
		if not (anchor_variant is Dictionary):
			continue
		var anchor_entry: Dictionary = anchor_variant as Dictionary
		var tmx_x: int = int(anchor_entry.get("tmxX", -1))
		var tmx_y: int = int(anchor_entry.get("tmxY", -1))
		if tmx_x < 0 or tmx_y < 0:
			continue
		var anchor_key: String = _coord_key(tmx_x, tmx_y)
		if used_anchor_keys.has(anchor_key):
			continue
		var dx: float = float(tmx_x) - primary_tmx_x
		var dy: float = float(tmx_y) - primary_tmx_y
		var score: float = dx * dx + dy * dy
		if score < best_score:
			best_score = score
			best_anchor = anchor_entry
	return best_anchor


func _register_world_cell_live_pass_capture_sample(anchor_entry: Dictionary, sample_index: int) -> void:
	_register_world_cell_live_node_capture_sample(anchor_entry, sample_index)


func _register_world_cell_live_node_capture_sample(anchor_entry: Dictionary, sample_index: int) -> void:
	var tmx_x: int = int(anchor_entry.get("tmxX", -1))
	var tmx_y: int = int(anchor_entry.get("tmxY", -1))
	if tmx_x < 0 or tmx_y < 0:
		return
	var anchor_key: String = _coord_key(tmx_x, tmx_y)
	var node_type: String = str(anchor_entry.get("type", "")).strip_edges().to_lower()
	if node_type == "":
		node_type = "pass"
	var footprint_id: String = str(anchor_entry.get("footprintId", _resolve_world_cell_node_dispatch_footprint_id(node_type))).strip_edges()
	var source_tile: Dictionary = _resolve_backend_tile_for_tmx_key(anchor_key)
	var screen_hit_tile: Dictionary = _screen_to_backend_tile_data(_tmx_to_screen(tmx_x, tmx_y))
	var reserved_hit_tile: Dictionary = _build_reserved_world_cell_hit_tile(tmx_x, tmx_y, source_tile)
	var hit_tile: Dictionary = screen_hit_tile if not screen_hit_tile.is_empty() else reserved_hit_tile
	var sample_id: String = "live_backend_%s_%02d" % [node_type, sample_index]
	var hit_ok: bool = _is_world_cell_live_node_hit_ok(hit_tile, anchor_entry, anchor_key, node_type, footprint_id)
	var screen_roundtrip_ok: bool = _is_world_cell_live_node_hit_ok(screen_hit_tile, anchor_entry, anchor_key, node_type, footprint_id)
	var reserved_proxy_ok: bool = _is_world_cell_live_node_hit_ok(reserved_hit_tile, anchor_entry, anchor_key, node_type, footprint_id)
	var selection_ok: bool = _is_world_cell_live_node_hit_ok(reserved_hit_tile, anchor_entry, anchor_key, node_type, footprint_id)
	var hover_ok: bool = _is_world_cell_live_node_hit_ok(hit_tile, anchor_entry, anchor_key, node_type, footprint_id)
	var hit_summary := {
		"ok": hit_ok,
		"screenRoundtripOk": screen_roundtrip_ok,
		"reservedProxyOk": reserved_proxy_ok,
		"type": str(hit_tile.get("type", "")).strip_edges(),
		"id": str(hit_tile.get("id", "")).strip_edges(),
		"tileId": str(hit_tile.get("tileId", "")).strip_edges(),
		"anchorKey": str(hit_tile.get("anchorKey", "")).strip_edges(),
		"footprintId": str(hit_tile.get("footprintId", "")).strip_edges(),
		"isReservedHit": bool(hit_tile.get("isReservedHit", false)),
		"tmx": [int(hit_tile.get("tmxX", -1)), int(hit_tile.get("tmxY", -1))],
	}
	var summary := {
		"id": sample_id,
		"label": "Live backend %s %d" % [node_type, sample_index + 1],
		"captureSource": "live_backend_map_layout",
		"anchorKey": anchor_key,
		"anchorTmx": [tmx_x, tmx_y],
		"backend": {
			"x": int(anchor_entry.get("backendX", anchor_entry.get("x", 0))),
			"y": int(anchor_entry.get("backendY", anchor_entry.get("y", 0))),
		},
		"tileId": str(anchor_entry.get("tileId", anchor_entry.get("id", ""))).strip_edges(),
		"type": node_type,
		"terrain": str(anchor_entry.get("terrain", "")).strip_edges(),
		"footprintId": footprint_id,
		"compositeId": str(anchor_entry.get("compositeId", "")).strip_edges(),
		"cellCount": _resolve_world_cell_footprint_offsets(footprint_id, [1, 1]).size(),
		"captureRect": _rect2_to_json_array(_estimate_world_cell_preview_sample_rect(Vector2i(tmx_x, tmx_y), footprint_id)),
		"hitOk": hit_ok,
		"screenRoundtripOk": screen_roundtrip_ok,
		"reservedProxyOk": reserved_proxy_ok,
		"hit": hit_summary,
		"hitTile": hit_tile,
		"interaction": {
			"selectionOk": selection_ok,
			"hoverOk": hover_ok,
			"reservedProxyOk": reserved_proxy_ok,
		},
	}
	_world_cell_live_capture_sample_by_id[sample_id] = summary
	_world_cell_live_capture_sample_order.append(sample_id)


func _is_world_cell_live_pass_hit_ok(hit_tile: Dictionary, anchor_entry: Dictionary, anchor_key: String) -> bool:
	return _is_world_cell_live_node_hit_ok(hit_tile, anchor_entry, anchor_key, "pass", WORLD_CELL_FOOTPRINT_PASS_1X1)


func _is_world_cell_live_node_hit_ok(
	hit_tile: Dictionary,
	anchor_entry: Dictionary,
	anchor_key: String,
	expected_node_type: String,
	expected_footprint_id: String
) -> bool:
	if hit_tile.is_empty():
		return false
	var hit_type: String = str(hit_tile.get("type", "")).strip_edges().to_lower()
	var hit_footprint_id: String = str(hit_tile.get("footprintId", "")).strip_edges()
	var hit_anchor_key: String = str(hit_tile.get("anchorKey", "")).strip_edges()
	var anchor_id: String = str(anchor_entry.get("id", anchor_entry.get("tileId", ""))).strip_edges()
	var hit_id: String = str(hit_tile.get("id", hit_tile.get("tileId", ""))).strip_edges()
	if hit_type != expected_node_type.strip_edges().to_lower():
		return false
	if hit_footprint_id != expected_footprint_id:
		return false
	if hit_anchor_key != anchor_key:
		return false
	if anchor_id != "" and hit_id != "" and anchor_id != hit_id:
		return false
	return true


func _build_world_cell_capture_node_sample_hit_stats(samples: Array) -> Dictionary:
	var stats := {
		"sampleCount": samples.size(),
		"hitOkCount": 0,
		"screenRoundtripOkCount": 0,
		"reservedProxyOkCount": 0,
		"selectionOkCount": 0,
		"hoverOkCount": 0,
		"failedSampleIds": [],
	}
	for sample_variant in samples:
		if not (sample_variant is Dictionary):
			continue
		var sample: Dictionary = sample_variant as Dictionary
		var hit_variant: Variant = sample.get("hit", {})
		var hit: Dictionary = hit_variant as Dictionary if hit_variant is Dictionary else {}
		var interaction_variant: Variant = sample.get("interaction", {})
		var interaction: Dictionary = interaction_variant as Dictionary if interaction_variant is Dictionary else {}
		var hit_ok: bool = bool(sample.get("hitOk", hit.get("ok", false)))
		var screen_roundtrip_ok: bool = bool(sample.get("screenRoundtripOk", hit.get("screenRoundtripOk", false)))
		var reserved_proxy_ok: bool = bool(sample.get("reservedProxyOk", hit.get("reservedProxyOk", false)))
		var selection_ok: bool = bool(interaction.get("selectionOk", hit_ok))
		var hover_ok: bool = bool(interaction.get("hoverOk", hit_ok))
		if hit_ok:
			stats["hitOkCount"] = int(stats.get("hitOkCount", 0)) + 1
		if screen_roundtrip_ok:
			stats["screenRoundtripOkCount"] = int(stats.get("screenRoundtripOkCount", 0)) + 1
		if reserved_proxy_ok:
			stats["reservedProxyOkCount"] = int(stats.get("reservedProxyOkCount", 0)) + 1
		if selection_ok:
			stats["selectionOkCount"] = int(stats.get("selectionOkCount", 0)) + 1
		if hover_ok:
			stats["hoverOkCount"] = int(stats.get("hoverOkCount", 0)) + 1
		if not (hit_ok and screen_roundtrip_ok and reserved_proxy_ok and selection_ok and hover_ok):
			var failed_samples: Array = stats.get("failedSampleIds", []) as Array
			if failed_samples.size() < 8:
				failed_samples.append(str(sample.get("id", "")).strip_edges())
				stats["failedSampleIds"] = failed_samples
	stats["allHitOk"] = int(stats.get("hitOkCount", 0)) == samples.size()
	stats["allScreenRoundtripOk"] = int(stats.get("screenRoundtripOkCount", 0)) == samples.size()
	stats["allReservedProxyOk"] = int(stats.get("reservedProxyOkCount", 0)) == samples.size()
	stats["allSelectionOk"] = int(stats.get("selectionOkCount", 0)) == samples.size()
	stats["allHoverOk"] = int(stats.get("hoverOkCount", 0)) == samples.size()
	return stats


func _build_world_cell_capture_node_reserved_hit_coverage_audit(samples: Array, capture_node_type: String = "pass") -> Dictionary:
	var normalized_capture_node_type: String = capture_node_type.strip_edges().to_lower()
	if normalized_capture_node_type == "":
		normalized_capture_node_type = "unknown"
	var audit := {
		"auditVersion": "live_pass_reserved_hit_coverage_v1",
		"coverageScope": "live_backend_%s_samples" % normalized_capture_node_type,
		"sampleCount": samples.size(),
		"footprintCellHitCount": 0,
		"anchorCellHitCount": 0,
		"nonAnchorCellHitCount": 0,
		"okCellCount": 0,
		"failedCellCount": 0,
		"failedSamples": [],
		"samples": {},
	}
	for sample_variant in samples:
		if not (sample_variant is Dictionary):
			continue
		var sample: Dictionary = sample_variant as Dictionary
		var sample_id: String = str(sample.get("id", "")).strip_edges()
		var anchor_key: String = str(sample.get("anchorKey", "")).strip_edges()
		var footprint_id: String = str(sample.get("footprintId", "")).strip_edges()
		var sample_node_type: String = str(sample.get("type", normalized_capture_node_type)).strip_edges().to_lower()
		var anchor_tmx: Vector2i = _vector2i_from_json_array(sample.get("anchorTmx", []), Vector2i(-1, -1))
		if sample_id == "":
			sample_id = anchor_key
		if sample_id == "" or anchor_key == "" or footprint_id == "" or anchor_tmx.x < 0 or anchor_tmx.y < 0:
			continue
		var anchor_entry_variant: Variant = _world_cell_node_anchor_by_tmx_key.get(anchor_key, {})
		var anchor_entry: Dictionary = anchor_entry_variant as Dictionary if anchor_entry_variant is Dictionary else sample
		var sample_audit := {
			"sampleId": sample_id,
			"anchorKey": anchor_key,
			"footprintId": footprint_id,
			"anchorTmx": [anchor_tmx.x, anchor_tmx.y],
			"cellCount": 0,
			"okCellCount": 0,
			"failedCellCount": 0,
			"nonAnchorCellCount": 0,
			"allReservedHitsOk": true,
			"cells": [],
		}
		var offsets: Array = _resolve_world_cell_footprint_offsets(footprint_id, [1, 1])
		for offset_variant in offsets:
			var offset: Vector2i = _vector2i_from_json_array(offset_variant, Vector2i.ZERO)
			var tmx_x: int = anchor_tmx.x + offset.x
			var tmx_y: int = anchor_tmx.y + offset.y
			var tmx_key: String = _coord_key(tmx_x, tmx_y)
			var source_tile: Dictionary = _resolve_backend_tile_for_tmx_key(tmx_key)
			var reserved_hit_tile: Dictionary = _build_reserved_world_cell_hit_tile(tmx_x, tmx_y, source_tile)
			var hit_ok: bool = _is_world_cell_live_node_hit_ok(reserved_hit_tile, anchor_entry, anchor_key, sample_node_type, footprint_id)
			audit["footprintCellHitCount"] = int(audit.get("footprintCellHitCount", 0)) + 1
			sample_audit["cellCount"] = int(sample_audit.get("cellCount", 0)) + 1
			if offset == Vector2i.ZERO:
				audit["anchorCellHitCount"] = int(audit.get("anchorCellHitCount", 0)) + 1
			else:
				audit["nonAnchorCellHitCount"] = int(audit.get("nonAnchorCellHitCount", 0)) + 1
				sample_audit["nonAnchorCellCount"] = int(sample_audit.get("nonAnchorCellCount", 0)) + 1
			if hit_ok:
				audit["okCellCount"] = int(audit.get("okCellCount", 0)) + 1
				sample_audit["okCellCount"] = int(sample_audit.get("okCellCount", 0)) + 1
			else:
				audit["failedCellCount"] = int(audit.get("failedCellCount", 0)) + 1
				sample_audit["failedCellCount"] = int(sample_audit.get("failedCellCount", 0)) + 1
				sample_audit["allReservedHitsOk"] = false
				var failed_samples: Array = audit.get("failedSamples", []) as Array
				if failed_samples.size() < 8:
					failed_samples.append(sample_id)
					audit["failedSamples"] = failed_samples
			var cell_audit := {
				"tmxKey": tmx_key,
				"tmx": [tmx_x, tmx_y],
				"offset": [offset.x, offset.y],
				"isAnchorCell": offset == Vector2i.ZERO,
				"ok": hit_ok,
				"hit": {
					"id": str(reserved_hit_tile.get("id", reserved_hit_tile.get("tileId", ""))).strip_edges(),
					"type": str(reserved_hit_tile.get("type", "")).strip_edges(),
					"anchorKey": str(reserved_hit_tile.get("anchorKey", "")).strip_edges(),
					"footprintId": str(reserved_hit_tile.get("footprintId", "")).strip_edges(),
					"isReservedHit": bool(reserved_hit_tile.get("isReservedHit", false)),
				},
			}
			(sample_audit["cells"] as Array).append(cell_audit)
		(audit["samples"] as Dictionary)[sample_id] = sample_audit
	audit["allReservedHitsOk"] = int(audit.get("failedCellCount", 0)) == 0
	audit["nonAnchorCoverageAvailable"] = int(audit.get("nonAnchorCellHitCount", 0)) > 0
	audit["allNonAnchorReservedHitsOk"] = true if int(audit.get("nonAnchorCellHitCount", 0)) == 0 else bool(audit.get("allReservedHitsOk", false))
	audit["coverageMode"] = "multi_cell" if bool(audit.get("nonAnchorCoverageAvailable", false)) else "anchor_only"
	audit["dataShape"] = {
		"source": "live_backend",
		"nodeType": normalized_capture_node_type,
		"observedFootprintCellCount": int(audit.get("footprintCellHitCount", 0)),
		"observedNonAnchorCellCount": int(audit.get("nonAnchorCellHitCount", 0)),
		"nonAnchorCoverageExpected": bool(audit.get("nonAnchorCoverageAvailable", false)),
	}
	return audit


func _build_world_cell_capture_node_placement_context_audit(samples: Array) -> Dictionary:
	var audit := {}
	var contexts: Array = _resolve_world_cell_default_placement_context_audit_order()
	for sample_variant in samples:
		if not (sample_variant is Dictionary):
			continue
		var sample: Dictionary = sample_variant as Dictionary
		var anchor_key: String = str(sample.get("anchorKey", "")).strip_edges()
		if anchor_key == "":
			continue
		audit[anchor_key] = {
			"sampleId": str(sample.get("id", "")).strip_edges(),
			"tileId": str(sample.get("tileId", "")).strip_edges(),
			"footprintId": str(sample.get("footprintId", "")).strip_edges(),
			"contexts": _build_world_cell_placement_context_matches_at_tmx_key(anchor_key, contexts),
		}
	return audit


func _build_world_cell_capture_node_placement_context_status(placement_context_audit: Dictionary) -> Dictionary:
	var reserved_contexts: Array = [
		WORLD_CELL_PLACEMENT_CONTEXT_EMPTY_RESOURCE_FILL,
		WORLD_CELL_PLACEMENT_CONTEXT_FREE_CELL_BASE,
		WORLD_CELL_PLACEMENT_CONTEXT_RESOURCE_OVERLAY,
		WORLD_CELL_PLACEMENT_CONTEXT_PREVIEW_NODE_PLACEMENT,
	]
	var deferred_contexts: Array = [WORLD_CELL_PLACEMENT_CONTEXT_MOVEMENT]
	var status := {
		"sampleCount": placement_context_audit.size(),
		"reservedContexts": reserved_contexts.duplicate(true),
		"deferredContexts": deferred_contexts.duplicate(true),
		"blockedCountsByContext": {},
		"unblockedCountsByContext": {},
		"failedReservedContextSamples": [],
		"failedDeferredContextSamples": [],
	}
	var blocked_counts: Dictionary = {}
	var unblocked_counts: Dictionary = {}
	for anchor_key_variant in placement_context_audit.keys():
		var anchor_key: String = str(anchor_key_variant).strip_edges()
		var sample_variant: Variant = placement_context_audit.get(anchor_key_variant, {})
		if not (sample_variant is Dictionary):
			continue
		var sample: Dictionary = sample_variant as Dictionary
		var contexts_variant: Variant = sample.get("contexts", {})
		var contexts: Dictionary = contexts_variant as Dictionary if contexts_variant is Dictionary else {}
		for context_variant in reserved_contexts:
			var context: String = str(context_variant).strip_edges()
			var context_status: Dictionary = contexts.get(context, {}) as Dictionary
			if bool(context_status.get("blocked", false)):
				_increment_world_cell_audit_count(blocked_counts, context)
			else:
				_increment_world_cell_audit_count(unblocked_counts, context)
				(status["failedReservedContextSamples"] as Array).append({
					"anchorKey": anchor_key,
					"sampleId": str(sample.get("sampleId", "")).strip_edges(),
					"context": context,
				})
		for context_variant in deferred_contexts:
			var context: String = str(context_variant).strip_edges()
			var context_status: Dictionary = contexts.get(context, {}) as Dictionary
			if bool(context_status.get("blocked", false)):
				_increment_world_cell_audit_count(blocked_counts, context)
				(status["failedDeferredContextSamples"] as Array).append({
					"anchorKey": anchor_key,
					"sampleId": str(sample.get("sampleId", "")).strip_edges(),
					"context": context,
					"expected": "unblocked_until_movement_chain_closes",
				})
			else:
				_increment_world_cell_audit_count(unblocked_counts, context)
	status["blockedCountsByContext"] = blocked_counts
	status["unblockedCountsByContext"] = unblocked_counts
	var expected_sample_count: int = int(status.get("sampleCount", 0))
	var all_reserved_contexts_blocked: bool = expected_sample_count > 0
	for context_variant in reserved_contexts:
		var context: String = str(context_variant).strip_edges()
		if int(blocked_counts.get(context, 0)) != expected_sample_count:
			all_reserved_contexts_blocked = false
	status["allReservedPlacementContextsBlocked"] = all_reserved_contexts_blocked
	status["allDeferredMovementContextsUnblocked"] = expected_sample_count > 0 and int(unblocked_counts.get(WORLD_CELL_PLACEMENT_CONTEXT_MOVEMENT, 0)) == expected_sample_count
	return status


func _resolve_world_cell_default_placement_context_audit_order() -> Array:
	return [
		WORLD_CELL_PLACEMENT_CONTEXT_EMPTY_RESOURCE_FILL,
		WORLD_CELL_PLACEMENT_CONTEXT_FREE_CELL_BASE,
		WORLD_CELL_PLACEMENT_CONTEXT_RESOURCE_OVERLAY,
		WORLD_CELL_PLACEMENT_CONTEXT_PREVIEW_NODE_PLACEMENT,
		WORLD_CELL_PLACEMENT_CONTEXT_MOVEMENT,
	]


func _build_world_cell_placement_context_matches_at_tmx_key(tmx_key: String, contexts: Array = []) -> Dictionary:
	var normalized_tmx_key: String = tmx_key.strip_edges()
	var matches := {}
	if normalized_tmx_key == "":
		return matches
	var context_order: Array = contexts
	if context_order.is_empty():
		context_order = _resolve_world_cell_default_placement_context_audit_order()
	for context_variant in context_order:
		var context: String = str(context_variant).strip_edges()
		if context == "":
			continue
		var match: Dictionary = _resolve_world_cell_placement_context_match_at_tmx_key(normalized_tmx_key, context)
		matches[context] = {
			"blocked": not match.is_empty(),
			"match": match,
		}
	return matches


func _build_world_cell_runtime_sample_preview_placement_current_context_audit(samples: Array) -> Dictionary:
	var audit := {}
	for sample_variant in samples:
		if not (sample_variant is Dictionary):
			continue
		var sample: Dictionary = sample_variant as Dictionary
		var sample_id: String = str(sample.get("id", "")).strip_edges()
		var anchor_key: String = str(sample.get("anchorKey", "")).strip_edges()
		var footprint_id: String = str(sample.get("footprintId", "")).strip_edges()
		var node_type: String = str(sample.get("type", "")).strip_edges().to_lower()
		var anchor_tmx: Vector2i = _vector2i_from_json_array(sample.get("anchorTmx", []), Vector2i(-1, -1))
		if sample_id == "":
			sample_id = anchor_key
		if sample_id == "" or footprint_id == "" or anchor_tmx.x < 0 or anchor_tmx.y < 0:
			continue
		var placement_match: Dictionary = _resolve_world_cell_preview_placement_match(anchor_tmx, footprint_id, node_type)
		audit[sample_id] = {
			"sampleId": sample_id,
			"anchorKey": anchor_key,
			"anchorTmx": [anchor_tmx.x, anchor_tmx.y],
			"footprintId": footprint_id,
			"nodeType": node_type,
			"context": WORLD_CELL_PLACEMENT_CONTEXT_PREVIEW_NODE_PLACEMENT,
			"eligibleInCurrentContext": placement_match.is_empty(),
			"match": placement_match,
		}
	return audit


func _build_world_cell_runtime_builder_audit_summary(builder_stats: Dictionary) -> Dictionary:
	var summary := {
		"duplicateAnchorPolicy": WORLD_CELL_DUPLICATE_ANCHOR_POLICY,
		"sampleLimitPerType": WORLD_CELL_RUNTIME_AUDIT_SAMPLE_LIMIT,
		"conflictSampleCount": 0,
		"duplicateSampleCount": 0,
		"conflictReasonCounts": {},
		"duplicateReasonCounts": {},
		"conflictReasonCountsByType": {},
		"duplicateReasonCountsByType": {},
		"conflictSampleCoverageByType": {},
		"duplicateSampleCoverageByType": {},
	}
	var conflict_samples_variant: Variant = builder_stats.get("skippedConflictSamples", {})
	if conflict_samples_variant is Dictionary:
		for node_type_variant in (conflict_samples_variant as Dictionary).keys():
			var node_type: String = str(node_type_variant).strip_edges().to_lower()
			var samples_variant: Variant = (conflict_samples_variant as Dictionary).get(node_type_variant, [])
			if not (samples_variant is Array):
				continue
			for sample_variant in samples_variant as Array:
				if not (sample_variant is Dictionary):
					continue
				summary["conflictSampleCount"] = int(summary.get("conflictSampleCount", 0)) + 1
				var reason: String = _resolve_world_cell_runtime_conflict_summary_reason(sample_variant as Dictionary)
				_increment_world_cell_runtime_builder_summary_reason(summary, "conflictReasonCounts", "conflictReasonCountsByType", node_type, reason)
	var duplicate_samples_variant: Variant = builder_stats.get("duplicateAnchorSamples", {})
	if duplicate_samples_variant is Dictionary:
		for node_type_variant in (duplicate_samples_variant as Dictionary).keys():
			var node_type: String = str(node_type_variant).strip_edges().to_lower()
			var samples_variant: Variant = (duplicate_samples_variant as Dictionary).get(node_type_variant, [])
			if not (samples_variant is Array):
				continue
			for sample_variant in samples_variant as Array:
				if not (sample_variant is Dictionary):
					continue
				summary["duplicateSampleCount"] = int(summary.get("duplicateSampleCount", 0)) + 1
				var reason: String = _resolve_world_cell_runtime_duplicate_anchor_summary_reason(sample_variant as Dictionary)
				_increment_world_cell_runtime_builder_summary_reason(summary, "duplicateReasonCounts", "duplicateReasonCountsByType", node_type, reason)
	summary["conflictSampleCoverageByType"] = _build_world_cell_runtime_builder_sample_coverage_by_type(
		builder_stats.get("skippedConflictCounts", {}),
		conflict_samples_variant
	)
	summary["duplicateSampleCoverageByType"] = _build_world_cell_runtime_builder_sample_coverage_by_type(
		builder_stats.get("duplicateAnchorCounts", {}),
		duplicate_samples_variant
	)
	var conflict_sample_coverage_by_type: Dictionary = summary.get("conflictSampleCoverageByType", {}) as Dictionary
	var duplicate_sample_coverage_by_type: Dictionary = summary.get("duplicateSampleCoverageByType", {}) as Dictionary
	summary["conflictReasonCountSemanticsByType"] = _build_world_cell_runtime_builder_reason_count_semantics_by_type(
		conflict_sample_coverage_by_type
	)
	summary["duplicateReasonCountSemanticsByType"] = _build_world_cell_runtime_builder_reason_count_semantics_by_type(
		duplicate_sample_coverage_by_type
	)
	var conflict_reason_count_semantics_by_type: Dictionary = summary.get("conflictReasonCountSemanticsByType", {}) as Dictionary
	var duplicate_reason_count_semantics_by_type: Dictionary = summary.get("duplicateReasonCountSemanticsByType", {}) as Dictionary
	summary["conflictReasonCountMode"] = _resolve_world_cell_runtime_builder_reason_count_mode(
		conflict_reason_count_semantics_by_type
	)
	summary["duplicateReasonCountMode"] = _resolve_world_cell_runtime_builder_reason_count_mode(
		duplicate_reason_count_semantics_by_type
	)
	return summary


func _build_world_cell_runtime_builder_sample_coverage_by_type(counts_variant: Variant, samples_variant: Variant) -> Dictionary:
	var coverage := {}
	var counts: Dictionary = counts_variant as Dictionary if counts_variant is Dictionary else {}
	var samples_by_type: Dictionary = samples_variant as Dictionary if samples_variant is Dictionary else {}
	for node_type_variant in counts.keys():
		var node_type: String = str(node_type_variant).strip_edges().to_lower()
		if node_type == "" or node_type == "total":
			continue
		var expected_count: int = int(counts.get(node_type_variant, 0))
		var type_samples_variant: Variant = samples_by_type.get(node_type, [])
		if not (type_samples_variant is Array):
			type_samples_variant = samples_by_type.get(node_type_variant, [])
		var sample_count: int = (type_samples_variant as Array).size() if type_samples_variant is Array else 0
		coverage[node_type] = {
			"count": expected_count,
			"sampleCount": sample_count,
			"sampleLimit": WORLD_CELL_RUNTIME_AUDIT_SAMPLE_LIMIT,
			"truncated": sample_count < expected_count,
			"complete": sample_count >= expected_count,
		}
	return coverage


func _build_world_cell_runtime_builder_reason_count_semantics_by_type(coverage_by_type: Dictionary) -> Dictionary:
	var semantics := {}
	for node_type_variant in coverage_by_type.keys():
		var node_type: String = str(node_type_variant).strip_edges().to_lower()
		if node_type == "":
			continue
		var coverage_variant: Variant = coverage_by_type.get(node_type_variant, {})
		if not (coverage_variant is Dictionary):
			continue
		var coverage: Dictionary = coverage_variant as Dictionary
		var complete: bool = bool(coverage.get("complete", false))
		semantics[node_type] = {
			"mode": "full" if complete else "sampled",
			"isFull": complete,
			"isSampled": not complete,
			"count": int(coverage.get("count", 0)),
			"sampleCount": int(coverage.get("sampleCount", 0)),
			"sampleLimit": int(coverage.get("sampleLimit", WORLD_CELL_RUNTIME_AUDIT_SAMPLE_LIMIT)),
			"truncated": bool(coverage.get("truncated", false)),
		}
	return semantics


func _resolve_world_cell_runtime_builder_reason_count_mode(semantics_by_type: Dictionary) -> String:
	var has_full := false
	var has_sampled := false
	for semantics_variant in semantics_by_type.values():
		if not (semantics_variant is Dictionary):
			continue
		var semantics: Dictionary = semantics_variant as Dictionary
		var mode: String = str(semantics.get("mode", "")).strip_edges().to_lower()
		if mode == "full":
			has_full = true
		elif mode == "sampled":
			has_sampled = true
	if has_full and has_sampled:
		return "mixed"
	if has_sampled:
		return "sampled"
	if has_full:
		return "full"
	return "none"


func _increment_world_cell_runtime_builder_summary_reason(
	summary: Dictionary,
	counts_key: String,
	by_type_key: String,
	node_type: String,
	reason: String
) -> void:
	var normalized_type: String = node_type.strip_edges().to_lower()
	if normalized_type == "":
		normalized_type = "unknown"
	var normalized_reason: String = reason.strip_edges().to_lower()
	if normalized_reason == "":
		normalized_reason = "unknown"
	var counts_variant: Variant = summary.get(counts_key, {})
	var counts: Dictionary = counts_variant as Dictionary if counts_variant is Dictionary else {}
	_increment_world_cell_audit_count(counts, normalized_reason)
	summary[counts_key] = counts
	var by_type_variant: Variant = summary.get(by_type_key, {})
	var by_type: Dictionary = by_type_variant as Dictionary if by_type_variant is Dictionary else {}
	var type_counts_variant: Variant = by_type.get(normalized_type, {})
	var type_counts: Dictionary = type_counts_variant as Dictionary if type_counts_variant is Dictionary else {}
	_increment_world_cell_audit_count(type_counts, normalized_reason)
	by_type[normalized_type] = type_counts
	summary[by_type_key] = by_type


func _resolve_world_cell_runtime_conflict_summary_reason(sample: Dictionary) -> String:
	var node_type: String = str(sample.get("nodeType", "")).strip_edges().to_lower()
	var conflict_variant: Variant = sample.get("conflict", {})
	var conflict: Dictionary = conflict_variant as Dictionary if conflict_variant is Dictionary else {}
	var existing_type: String = str(conflict.get("existingType", "")).strip_edges().to_lower()
	if node_type == "pass" and existing_type == "city":
		return "city_pass_overlap"
	if str(conflict.get("existingAnchorKey", "")).strip_edges() != "":
		return "reserved_footprint"
	return "unknown_conflict"


func _resolve_world_cell_runtime_duplicate_anchor_summary_reason(sample: Dictionary) -> String:
	if str(sample.get("anchorKey", "")).strip_edges() != "":
		return "same_anchor"
	return "duplicate_anchor"


func _build_world_cell_capture_node_builder_audit_status(
	capture_node_type: String,
	builder_audit_summary: Dictionary,
	skipped_conflict_count: int,
	duplicate_anchor_count: int
) -> Dictionary:
	var normalized_type: String = capture_node_type.strip_edges().to_lower()
	if normalized_type == "":
		normalized_type = "unknown"
	var conflict_sample_coverage_by_type: Dictionary = builder_audit_summary.get("conflictSampleCoverageByType", {}) as Dictionary
	var conflict_sample_coverage: Dictionary = conflict_sample_coverage_by_type.get(normalized_type, {}) as Dictionary
	var duplicate_sample_coverage_by_type: Dictionary = builder_audit_summary.get("duplicateSampleCoverageByType", {}) as Dictionary
	var duplicate_sample_coverage: Dictionary = duplicate_sample_coverage_by_type.get(normalized_type, {}) as Dictionary
	return {
		"captureNodeType": normalized_type,
		"conflictSampleCoverage": conflict_sample_coverage,
		"duplicateSampleCoverage": duplicate_sample_coverage,
		"conflictSamplesComplete": skipped_conflict_count == 0 or bool(conflict_sample_coverage.get("complete", false)),
		"duplicateSamplesComplete": duplicate_anchor_count == 0 or bool(duplicate_sample_coverage.get("complete", false)),
	}


func _build_world_cell_capture_node_reason_audit_status(
	capture_node_type: String,
	builder_audit_summary: Dictionary,
	skipped_conflict_count: int,
	duplicate_anchor_count: int
) -> Dictionary:
	var normalized_type: String = capture_node_type.strip_edges().to_lower()
	if normalized_type == "":
		normalized_type = "unknown"
	var conflict_by_type: Dictionary = builder_audit_summary.get("conflictReasonCountsByType", {}) as Dictionary
	var conflict_reason_counts: Dictionary = conflict_by_type.get(normalized_type, {}) as Dictionary
	var duplicate_by_type: Dictionary = builder_audit_summary.get("duplicateReasonCountsByType", {}) as Dictionary
	var duplicate_reason_counts: Dictionary = duplicate_by_type.get(normalized_type, {}) as Dictionary
	var conflict_semantics_by_type: Dictionary = builder_audit_summary.get("conflictReasonCountSemanticsByType", {}) as Dictionary
	var duplicate_semantics_by_type: Dictionary = builder_audit_summary.get("duplicateReasonCountSemanticsByType", {}) as Dictionary
	var conflict_semantics: Dictionary = conflict_semantics_by_type.get(normalized_type, {}) as Dictionary
	var duplicate_semantics: Dictionary = duplicate_semantics_by_type.get(normalized_type, {}) as Dictionary
	var conflict_reason_total: int = int(conflict_reason_counts.get("total", 0))
	var duplicate_reason_total: int = int(duplicate_reason_counts.get("total", 0))
	return {
		"captureNodeType": normalized_type,
		"conflictReasonCounts": conflict_reason_counts,
		"duplicateReasonCounts": duplicate_reason_counts,
		"conflictReasonCountSemantics": conflict_semantics,
		"duplicateReasonCountSemantics": duplicate_semantics,
		"conflictReasonTotal": conflict_reason_total,
		"duplicateReasonTotal": duplicate_reason_total,
		"conflictReasonTotalMatchesSkippedCount": conflict_reason_total == skipped_conflict_count,
		"duplicateReasonTotalMatchesDuplicateCount": duplicate_reason_total == duplicate_anchor_count,
	}


func _build_world_cell_live_strategic_node_availability_status(raw_backend_node_counts: Dictionary, registered_anchor_counts: Dictionary, active_unique_anchor_counts_by_type: Dictionary = {}) -> Dictionary:
	var observed_raw_counts := {}
	var observed_registered_counts := {}
	var observed_active_unique_counts := {}
	var live_available_types: Array = []
	var missing_live_types: Array = []
	for node_type_variant in WORLD_CELL_LIVE_STRATEGIC_NODE_TYPES:
		var node_type: String = str(node_type_variant).strip_edges().to_lower()
		var raw_count: int = int(raw_backend_node_counts.get(node_type, 0))
		var registered_count: int = int(registered_anchor_counts.get(node_type, 0))
		var active_unique_count: int = int(active_unique_anchor_counts_by_type.get(node_type, 0))
		observed_raw_counts[node_type] = raw_count
		observed_registered_counts[node_type] = registered_count
		observed_active_unique_counts[node_type] = active_unique_count
		if raw_count > 0:
			live_available_types.append(node_type)
		else:
			missing_live_types.append(node_type)
	return {
		"source": "/api/world/map-layout",
		"expectedNodeTypes": WORLD_CELL_LIVE_STRATEGIC_NODE_TYPES.duplicate(true),
		"observedRawBackendCounts": observed_raw_counts,
		"observedRegisteredAnchorCounts": observed_registered_counts,
		"observedRegisteredAnchorCountsSemantics": "registered_attempts_before_duplicate_last_write",
		"observedActiveUniqueAnchorCounts": observed_active_unique_counts,
		"liveAvailableTypes": live_available_types,
		"missingLiveTypes": missing_live_types,
		"liveRegressionCoveredTypes": live_available_types.duplicate(true),
		"liveRegressionMissingTypes": missing_live_types.duplicate(true),
		"allExpectedTypesAvailable": missing_live_types.is_empty(),
		"passOnlyCurrentBackend": live_available_types.size() == 1 and str(live_available_types[0]) == "pass",
	}


func _build_world_cell_live_pass_audit_status(live_backend: Dictionary) -> Dictionary:
	var node_type_stats: Dictionary = live_backend.get("nodeTypeStats", {}) as Dictionary
	var raw_backend_node_counts: Dictionary = live_backend.get("rawBackendNodeCounts", {}) as Dictionary
	var sample_hit_stats: Dictionary = live_backend.get("sampleHitStats", {}) as Dictionary
	var reserved_hit_coverage_audit: Dictionary = live_backend.get("reservedHitCoverageAudit", {}) as Dictionary
	var builder_audit_summary: Dictionary = live_backend.get("builderAuditSummary", {}) as Dictionary
	var runtime_strategy_handler_audit: Dictionary = live_backend.get("runtimeStrategyHandlerAudit", {}) as Dictionary
	var placement_context_status: Dictionary = live_backend.get("placementContextStatus", {}) as Dictionary
	var strategic_node_availability: Dictionary = live_backend.get("strategicNodeAvailability", {}) as Dictionary
	var strategic_node_raw_counts: Dictionary = strategic_node_availability.get("observedRawBackendCounts", {}) as Dictionary
	var pass_only_current_backend: bool = bool(strategic_node_availability.get("passOnlyCurrentBackend", false))
	var raw_backend_node_count: int = int(node_type_stats.get("rawBackendNodeCount", 0))
	var registered_attempt_count: int = int(node_type_stats.get("registeredAttemptCount", node_type_stats.get("registeredAnchorCount", 0)))
	var registered_anchor_count: int = int(node_type_stats.get("registeredAnchorCount", registered_attempt_count))
	var active_unique_anchor_count: int = int(node_type_stats.get("activeUniqueAnchorCount", 0))
	var duplicate_anchor_count: int = int(node_type_stats.get("duplicateAnchorCount", 0))
	var skipped_conflict_count: int = int(node_type_stats.get("skippedConflictCount", 0))
	var skipped_invalid_count: int = int(node_type_stats.get("skippedInvalidCount", 0))
	var raw_total_count: int = int(raw_backend_node_counts.get("total", 0))
	var capture_node_type: String = str(node_type_stats.get("nodeType", "pass")).strip_edges().to_lower()
	if capture_node_type == "":
		capture_node_type = "pass"
	var conflict_by_type: Dictionary = builder_audit_summary.get("conflictReasonCountsByType", {}) as Dictionary
	var pass_conflicts: Dictionary = conflict_by_type.get("pass", {}) as Dictionary
	var duplicate_by_type: Dictionary = builder_audit_summary.get("duplicateReasonCountsByType", {}) as Dictionary
	var pass_duplicates: Dictionary = duplicate_by_type.get("pass", {}) as Dictionary
	var capture_node_builder_audit_status: Dictionary = live_backend.get("captureNodeBuilderAuditStatus", {}) as Dictionary
	if capture_node_builder_audit_status.is_empty():
		capture_node_builder_audit_status = _build_world_cell_capture_node_builder_audit_status(
			capture_node_type,
			builder_audit_summary,
			skipped_conflict_count,
			duplicate_anchor_count
		)
	var capture_node_reason_audit_status: Dictionary = live_backend.get("captureNodeReasonAuditStatus", {}) as Dictionary
	if capture_node_reason_audit_status.is_empty():
		capture_node_reason_audit_status = _build_world_cell_capture_node_reason_audit_status(
			capture_node_type,
			builder_audit_summary,
			skipped_conflict_count,
			duplicate_anchor_count
		)
	var pass_specific_checks_apply: bool = capture_node_type == "pass"
	var checks := {
		"rawBackendPassOnly": true if not pass_only_current_backend else raw_total_count == raw_backend_node_count,
		"registeredPlusDuplicateMatchesRaw": registered_anchor_count + duplicate_anchor_count == raw_backend_node_count,
		"registeredAttemptPlusSkippedMatchesRaw": registered_attempt_count + skipped_conflict_count + skipped_invalid_count == raw_backend_node_count,
		"activeUniquePlusDuplicatePlusSkippedMatchesRaw": active_unique_anchor_count + duplicate_anchor_count + skipped_conflict_count + skipped_invalid_count == raw_backend_node_count,
		"skippedInvalidZero": skipped_invalid_count == 0,
		"sampleHitAllOk": bool(sample_hit_stats.get("allHitOk", false)),
		"sampleScreenRoundtripAllOk": bool(sample_hit_stats.get("allScreenRoundtripOk", false)),
		"sampleReservedProxyAllOk": bool(sample_hit_stats.get("allReservedProxyOk", false)),
		"sampleSelectionAllOk": bool(sample_hit_stats.get("allSelectionOk", false)),
		"sampleHoverAllOk": bool(sample_hit_stats.get("allHoverOk", false)),
		"reservedHitCoverageHasCells": int(reserved_hit_coverage_audit.get("footprintCellHitCount", 0)) > 0,
		"reservedHitCoverageAllOk": bool(reserved_hit_coverage_audit.get("allReservedHitsOk", false)),
		"captureNodeConflictReasonTotalMatchesSkippedCount": bool(capture_node_reason_audit_status.get("conflictReasonTotalMatchesSkippedCount", false)),
		"captureNodeDuplicateReasonTotalMatchesDuplicateCount": bool(capture_node_reason_audit_status.get("duplicateReasonTotalMatchesDuplicateCount", false)),
		"passConflictReasonMatchesSkippedCount": true if not pass_specific_checks_apply else int(pass_conflicts.get("city_pass_overlap", 0)) == skipped_conflict_count,
		"passDuplicateReasonMatchesDuplicateCount": true if not pass_specific_checks_apply else int(pass_duplicates.get("same_anchor", 0)) == duplicate_anchor_count,
		"captureNodeConflictSamplesComplete": bool(capture_node_builder_audit_status.get("conflictSamplesComplete", false)),
		"captureNodeDuplicateSamplesComplete": bool(capture_node_builder_audit_status.get("duplicateSamplesComplete", false)),
		"passConflictSamplesComplete": bool(capture_node_builder_audit_status.get("conflictSamplesComplete", false)),
		"passDuplicateSamplesComplete": bool(capture_node_builder_audit_status.get("duplicateSamplesComplete", false)),
		"placementPolicyReservedContextsAllBlocked": bool(placement_context_status.get("allReservedPlacementContextsBlocked", false)),
		"placementPolicyMovementDeferredUnblocked": bool(placement_context_status.get("allDeferredMovementContextsUnblocked", false)),
		"runtimeStrategyHandlersOk": bool(runtime_strategy_handler_audit.get("ok", false)),
		"strategicNodeLivePassAvailable": int(strategic_node_raw_counts.get("pass", 0)) > 0,
		"allExpectedStrategicNodeTypesAvailable": bool(strategic_node_availability.get("allExpectedTypesAvailable", false)),
	}
	var failed_checks: Array = []
	for check_key_variant in checks.keys():
		var check_key: String = str(check_key_variant)
		if not bool(checks.get(check_key, false)):
			failed_checks.append(check_key)
	return {
		"ok": failed_checks.is_empty(),
		"checks": checks,
		"failedChecks": failed_checks,
		"expected": {
			"captureNodeType": capture_node_type,
			"rawBackendNodeCount": raw_backend_node_count,
			"registeredAttemptCount": registered_attempt_count,
			"registeredAnchorCount": registered_anchor_count,
			"registeredAnchorCountSemantics": str(node_type_stats.get("registeredAnchorCountSemantics", "registered_attempts_before_duplicate_last_write")).strip_edges(),
			"activeUniqueAnchorCount": active_unique_anchor_count,
			"duplicateAnchorCount": duplicate_anchor_count,
			"skippedConflictCount": skipped_conflict_count,
			"skippedInvalidCount": skipped_invalid_count,
			"duplicateAnchorPolicy": WORLD_CELL_DUPLICATE_ANCHOR_POLICY,
			"passConflictReason": "city_pass_overlap",
			"passDuplicateReason": "same_anchor",
			"passSpecificChecksApplied": pass_specific_checks_apply,
			"captureNodeReasonAuditStatus": capture_node_reason_audit_status,
			"captureNodeBuilderAuditStatus": capture_node_builder_audit_status,
			"passConflictSampleCoverage": capture_node_builder_audit_status.get("conflictSampleCoverage", {}),
			"passDuplicateSampleCoverage": capture_node_builder_audit_status.get("duplicateSampleCoverage", {}),
			"reservedHitFootprintCellCount": int(reserved_hit_coverage_audit.get("footprintCellHitCount", 0)),
			"reservedHitNonAnchorCoverageAvailable": bool(reserved_hit_coverage_audit.get("nonAnchorCoverageAvailable", false)),
			"reservedHitCoverageMode": str(reserved_hit_coverage_audit.get("coverageMode", "")).strip_edges(),
			"reservedHitDataShape": reserved_hit_coverage_audit.get("dataShape", {}),
			"placementContextStatus": placement_context_status,
			"runtimeStrategyHandlerAudit": runtime_strategy_handler_audit,
			"strategicNodeAvailability": strategic_node_availability,
		},
	}


func _build_world_cell_live_node_capture_status(live_backend: Dictionary, samples: Array) -> Dictionary:
	var expected_node_types: Array = WORLD_CELL_LIVE_STRATEGIC_NODE_TYPES.duplicate(true)
	var strategic_node_availability: Dictionary = live_backend.get("strategicNodeAvailability", {}) as Dictionary
	var observed_raw_counts: Dictionary = strategic_node_availability.get("observedRawBackendCounts", {}) as Dictionary
	var sample_hit_stats: Dictionary = live_backend.get("sampleHitStats", {}) as Dictionary
	var reserved_hit_coverage_audit: Dictionary = live_backend.get("reservedHitCoverageAudit", {}) as Dictionary
	var sample_counts_by_type := {}
	var hit_ok_by_type := {}
	var screen_roundtrip_ok_by_type := {}
	var reserved_proxy_ok_by_type := {}
	var selection_ok_by_type := {}
	var hover_ok_by_type := {}
	for sample_variant in samples:
		if not (sample_variant is Dictionary):
			continue
		var sample: Dictionary = sample_variant as Dictionary
		var node_type: String = str(sample.get("type", "")).strip_edges().to_lower()
		if node_type == "":
			node_type = "unknown"
		var hit_variant: Variant = sample.get("hit", {})
		var hit: Dictionary = hit_variant as Dictionary if hit_variant is Dictionary else {}
		var interaction_variant: Variant = sample.get("interaction", {})
		var interaction: Dictionary = interaction_variant as Dictionary if interaction_variant is Dictionary else {}
		var hit_ok: bool = bool(sample.get("hitOk", hit.get("ok", false)))
		var screen_roundtrip_ok: bool = bool(sample.get("screenRoundtripOk", hit.get("screenRoundtripOk", false)))
		var reserved_proxy_ok: bool = bool(sample.get("reservedProxyOk", hit.get("reservedProxyOk", false)))
		var selection_ok: bool = bool(interaction.get("selectionOk", hit_ok))
		var hover_ok: bool = bool(interaction.get("hoverOk", hit_ok))
		_increment_world_cell_audit_count(sample_counts_by_type, node_type)
		if hit_ok:
			_increment_world_cell_audit_count(hit_ok_by_type, node_type)
		if screen_roundtrip_ok:
			_increment_world_cell_audit_count(screen_roundtrip_ok_by_type, node_type)
		if reserved_proxy_ok:
			_increment_world_cell_audit_count(reserved_proxy_ok_by_type, node_type)
		if selection_ok:
			_increment_world_cell_audit_count(selection_ok_by_type, node_type)
		if hover_ok:
			_increment_world_cell_audit_count(hover_ok_by_type, node_type)
	var missing_sample_types: Array = []
	var missing_raw_types: Array = []
	for expected_type_variant in expected_node_types:
		var expected_type: String = str(expected_type_variant).strip_edges().to_lower()
		if expected_type == "":
			continue
		if int(sample_counts_by_type.get(expected_type, 0)) <= 0:
			missing_sample_types.append(expected_type)
		if int(observed_raw_counts.get(expected_type, 0)) <= 0:
			missing_raw_types.append(expected_type)
	var checks := {
		"sampleCountPositive": samples.size() > 0,
		"allExpectedTypesSampled": missing_sample_types.is_empty(),
		"allExpectedTypesAvailable": bool(strategic_node_availability.get("allExpectedTypesAvailable", false)),
		"expectedRawTypesPresent": missing_raw_types.is_empty(),
		"sampleHitAllOk": bool(sample_hit_stats.get("allHitOk", false)),
		"sampleScreenRoundtripAllOk": bool(sample_hit_stats.get("allScreenRoundtripOk", false)),
		"sampleReservedProxyAllOk": bool(sample_hit_stats.get("allReservedProxyOk", false)),
		"sampleSelectionAllOk": bool(sample_hit_stats.get("allSelectionOk", false)),
		"sampleHoverAllOk": bool(sample_hit_stats.get("allHoverOk", false)),
		"reservedHitCoverageHasCells": int(reserved_hit_coverage_audit.get("footprintCellHitCount", 0)) > 0,
		"reservedHitCoverageAllOk": bool(reserved_hit_coverage_audit.get("allReservedHitsOk", false)),
	}
	var failed_checks: Array = []
	for check_key_variant in checks.keys():
		var check_key: String = str(check_key_variant)
		if not bool(checks.get(check_key, false)):
			failed_checks.append(check_key)
	return {
		"ok": failed_checks.is_empty(),
		"checks": checks,
		"failedChecks": failed_checks,
		"expectedNodeTypes": expected_node_types,
		"sampleCountsByType": sample_counts_by_type,
		"hitOkByType": hit_ok_by_type,
		"screenRoundtripOkByType": screen_roundtrip_ok_by_type,
		"reservedProxyOkByType": reserved_proxy_ok_by_type,
		"selectionOkByType": selection_ok_by_type,
		"hoverOkByType": hover_ok_by_type,
		"missingSampleTypes": missing_sample_types,
		"missingRawTypes": missing_raw_types,
		"observedRawBackendCounts": observed_raw_counts,
		"sampleHitStats": sample_hit_stats,
		"reservedHitCoverageAuditSummary": {
			"footprintCellHitCount": int(reserved_hit_coverage_audit.get("footprintCellHitCount", 0)),
			"allReservedHitsOk": bool(reserved_hit_coverage_audit.get("allReservedHitsOk", false)),
			"coverageMode": str(reserved_hit_coverage_audit.get("coverageMode", "")).strip_edges(),
		},
	}


func _build_world_cell_live_pass_runtime_strategy_audit(samples: Array) -> Dictionary:
	var strategy_rules := {}
	for strategy_variant in WORLD_CELL_RUNTIME_STRATEGY_ORDER:
		var strategy: String = str(strategy_variant).strip_edges()
		strategy_rules[strategy] = _resolve_world_cell_runtime_strategy_rule(strategy).duplicate(true)
	var sample_strategies := {}
	for sample_variant in samples:
		if not (sample_variant is Dictionary):
			continue
		var sample: Dictionary = sample_variant as Dictionary
		var sample_id: String = str(sample.get("id", "")).strip_edges()
		if sample_id == "":
			continue
		var tile_type: String = str(sample.get("type", "")).strip_edges().to_lower()
		var strategy: String = _resolve_world_cell_runtime_strategy_for_type(tile_type)
		sample_strategies[sample_id] = {
			"type": tile_type,
			"footprintId": str(sample.get("footprintId", "")).strip_edges(),
			"compositeId": str(sample.get("compositeId", "")).strip_edges(),
			"strategy": strategy,
			"priority": _resolve_world_cell_runtime_strategy_priority(strategy, tile_type),
		}
	return {
		"strategyRules": strategy_rules,
		"samples": sample_strategies,
	}


func _increment_world_cell_audit_count(bucket: Dictionary, key: String) -> void:
	var normalized_key: String = key.strip_edges()
	if normalized_key == "":
		normalized_key = "unknown"
	bucket[normalized_key] = int(bucket.get(normalized_key, 0)) + 1
	bucket["total"] = int(bucket.get("total", 0)) + 1


func _build_world_cell_active_unique_anchor_audit() -> Dictionary:
	var active_anchor_counts_by_footprint := {}
	var active_anchor_counts_by_type := {}
	for anchor_key_variant in _world_cell_node_anchor_by_tmx_key.keys():
		var anchor_key: String = str(anchor_key_variant).strip_edges()
		var anchor_entry_variant: Variant = _world_cell_node_anchor_by_tmx_key.get(anchor_key, {})
		if not (anchor_entry_variant is Dictionary):
			continue
		var anchor_entry: Dictionary = anchor_entry_variant as Dictionary
		_increment_world_cell_audit_count(
			active_anchor_counts_by_footprint,
			str(anchor_entry.get("footprintId", "")).strip_edges()
		)
		_increment_world_cell_audit_count(
			active_anchor_counts_by_type,
			str(anchor_entry.get("type", "")).strip_edges().to_lower()
		)
	return {
		"activeAnchorCountsByFootprint": active_anchor_counts_by_footprint,
		"activeAnchorCountsByType": active_anchor_counts_by_type,
	}


func _build_world_cell_runtime_builder_lifecycle_summary(builder_stats: Dictionary, active_unique_anchor_counts_by_type: Dictionary) -> Dictionary:
	var raw_counts: Dictionary = builder_stats.get("rawBackendNodeCounts", {}) as Dictionary
	var registered_attempt_counts: Dictionary = builder_stats.get("registeredAttemptCounts", builder_stats.get("registeredAnchorCounts", {})) as Dictionary
	var registered_anchor_counts: Dictionary = builder_stats.get("registeredAnchorCounts", registered_attempt_counts) as Dictionary
	var duplicate_counts: Dictionary = builder_stats.get("duplicateAnchorCounts", {}) as Dictionary
	var skipped_conflict_counts: Dictionary = builder_stats.get("skippedConflictCounts", {}) as Dictionary
	var skipped_invalid_counts: Dictionary = builder_stats.get("skippedInvalidCounts", {}) as Dictionary
	var node_type_set := {}
	for counts in [
		raw_counts,
		registered_attempt_counts,
		registered_anchor_counts,
		active_unique_anchor_counts_by_type,
		duplicate_counts,
		skipped_conflict_counts,
		skipped_invalid_counts,
	]:
		_collect_world_cell_runtime_builder_lifecycle_node_types(node_type_set, counts)
	var counts_by_type := {}
	for node_type_variant in node_type_set.keys():
		var node_type: String = str(node_type_variant).strip_edges().to_lower()
		if node_type == "":
			continue
		counts_by_type[node_type] = {
			"rawBackendNodeCount": int(raw_counts.get(node_type, 0)),
			"registeredAttemptCount": int(registered_attempt_counts.get(node_type, 0)),
			"registeredAnchorCount": int(registered_anchor_counts.get(node_type, 0)),
			"activeUniqueAnchorCount": int(active_unique_anchor_counts_by_type.get(node_type, 0)),
			"duplicateAnchorCount": int(duplicate_counts.get(node_type, 0)),
			"skippedConflictCount": int(skipped_conflict_counts.get(node_type, 0)),
			"skippedInvalidCount": int(skipped_invalid_counts.get(node_type, 0)),
		}
	return {
		"duplicateAnchorPolicy": WORLD_CELL_DUPLICATE_ANCHOR_POLICY,
		"countFieldSemantics": {
			"rawBackendNodeCounts": "raw supported backend strategic node records before runtime grouping",
			"registeredAttemptCounts": "runtime groups accepted for anchor registration before duplicate last-write",
			"registeredAnchorCounts": "compat alias for registeredAttemptCounts",
			"activeUniqueAnchorCountsByType": "active anchors after duplicate last-write by tmx anchor key",
			"duplicateAnchorCounts": "accepted groups that overwrote an existing anchor key",
			"skippedConflictCounts": "groups rejected by reserved footprint conflict before registration",
			"skippedInvalidCounts": "groups rejected before conflict checks because anchor/footprint/visual data was invalid",
		},
		"countsByType": counts_by_type,
		"totals": {
			"rawBackendNodeCount": int(raw_counts.get("total", 0)),
			"registeredAttemptCount": int(registered_attempt_counts.get("total", 0)),
			"registeredAnchorCount": int(registered_anchor_counts.get("total", 0)),
			"activeUniqueAnchorCount": int(active_unique_anchor_counts_by_type.get("total", 0)),
			"duplicateAnchorCount": int(duplicate_counts.get("total", 0)),
			"skippedConflictCount": int(skipped_conflict_counts.get("total", 0)),
			"skippedInvalidCount": int(skipped_invalid_counts.get("total", 0)),
		},
	}


func _collect_world_cell_runtime_builder_lifecycle_node_types(node_type_set: Dictionary, counts: Dictionary) -> void:
	for node_type_variant in counts.keys():
		var node_type: String = str(node_type_variant).strip_edges().to_lower()
		if node_type == "" or node_type == "total":
			continue
		node_type_set[node_type] = true


func _build_world_cell_reserved_footprint_audit() -> Dictionary:
	var reserved_cell_counts_by_footprint := {}
	var reserved_cell_samples_by_footprint := {}
	for tmx_key_variant in _world_cell_reserved_footprint_tmx_keys.keys():
		var tmx_key: String = str(tmx_key_variant).strip_edges()
		var footprint_id: String = str(_world_cell_reserved_footprint_tmx_keys.get(tmx_key, "")).strip_edges()
		_increment_world_cell_audit_count(reserved_cell_counts_by_footprint, footprint_id)
		var samples_variant: Variant = reserved_cell_samples_by_footprint.get(footprint_id, [])
		var samples: Array = samples_variant as Array if samples_variant is Array else []
		if samples.size() < 8:
			samples.append({
				"tmxKey": tmx_key,
				"anchorKey": str(_world_cell_reserved_anchor_by_tmx_key.get(tmx_key, "")).strip_edges(),
				"center": _world_cell_reserved_center_by_tmx_key.get(tmx_key, []),
			})
			reserved_cell_samples_by_footprint[footprint_id] = samples
	var active_anchor_audit: Dictionary = _build_world_cell_active_unique_anchor_audit()
	return {
		"reservedCellCountsByFootprint": reserved_cell_counts_by_footprint,
		"activeAnchorCountsByFootprint": active_anchor_audit.get("activeAnchorCountsByFootprint", {}),
		"activeAnchorCountsByType": active_anchor_audit.get("activeAnchorCountsByType", {}),
		"reservedCellSamplesByFootprint": reserved_cell_samples_by_footprint,
	}


func _estimate_world_cell_preview_sample_rect(center_tmx: Vector2i, footprint_id: String) -> Rect2:
	var offsets: Array = _resolve_world_cell_footprint_offsets(footprint_id, [1, 1])
	if offsets.is_empty():
		var cell_center: Vector2 = _tmx_to_screen(center_tmx.x, center_tmx.y)
		return Rect2(cell_center - Vector2(120.0, 160.0), Vector2(240.0, 260.0))
	var min_x: float = INF
	var min_y: float = INF
	var max_x: float = -INF
	var max_y: float = -INF
	for offset_variant in offsets:
		var offset: Vector2i = _vector2i_from_json_array(offset_variant, Vector2i.ZERO)
		var cell_center: Vector2 = _tmx_to_screen(center_tmx.x + offset.x, center_tmx.y + offset.y)
		min_x = min(min_x, cell_center.x)
		min_y = min(min_y, cell_center.y)
		max_x = max(max_x, cell_center.x)
		max_y = max(max_y, cell_center.y)
	var padding_x: float = max(96.0, 240.0 * _zoom)
	var padding_top: float = max(128.0, 380.0 * _zoom)
	var padding_bottom: float = max(84.0, 180.0 * _zoom)
	return Rect2(
		Vector2(min_x - padding_x, min_y - padding_top),
		Vector2((max_x - min_x) + padding_x * 2.0, (max_y - min_y) + padding_top + padding_bottom)
	)


func _rect2_to_json_array(rect: Rect2) -> Array:
	return [rect.position.x, rect.position.y, rect.size.x, rect.size.y]


func _get_world_cell_composite(composite_id: String) -> Dictionary:
	var normalized_id: String = composite_id.strip_edges()
	if normalized_id == "":
		return {}
	var composite_variant: Variant = _world_cell_composite_by_id.get(normalized_id, {})
	if composite_variant is Dictionary:
		return composite_variant as Dictionary
	return {}


func _resolve_world_cell_anchor_layers(composite: Dictionary) -> Array:
	if composite.is_empty():
		return []
	var layers_variant: Variant = composite.get("layers", [])
	if not (layers_variant is Array):
		return []
	var anchor_layers: Array = []
	for layer_variant in layers_variant:
		if not (layer_variant is Dictionary):
			continue
		var layer: Dictionary = layer_variant as Dictionary
		var layer_role: String = str(layer.get("layer_role", "")).strip_edges()
		var frame_name: String = str(layer.get("frame", "")).strip_edges()
		if layer_role == "":
			if frame_name == "world_cell_city_ground_base_v1.png":
				layer_role = "base"
			elif frame_name == "city_wall_ring_profile_v1.png":
				layer_role = "perimeter"
			elif frame_name != "":
				layer_role = "structure"
		if layer_role == "base":
			continue
		anchor_layers.append(layer.duplicate(true))
	return anchor_layers


func _resolve_world_cell_payload_slots(
	composite: Dictionary,
	anchor_entry: Dictionary,
	footprint_id: String,
	group_size: int
) -> Array:
	if composite.is_empty():
		return []
	var payload_slots_variant: Variant = composite.get("payload_slots", [])
	if not (payload_slots_variant is Array):
		return []
	var payload_slots: Array = payload_slots_variant as Array
	if payload_slots.is_empty():
		return []
	var active_stage: int = _resolve_world_cell_node_payload_stage(anchor_entry, footprint_id, group_size, composite)
	var resolved_slots: Array = []
	for slot_variant in payload_slots:
		if not (slot_variant is Dictionary):
			continue
		var slot: Dictionary = (slot_variant as Dictionary).duplicate(true)
		var activation_stage: int = maxi(0, int(slot.get("activation_stage", 0)))
		var is_active: bool = active_stage >= activation_stage
		slot["active"] = is_active
		slot["cellState"] = "active_building_cell" if is_active else "reserved_building_cell"
		resolved_slots.append(slot)
	return resolved_slots


func _resolve_world_cell_node_payload_stage(
	anchor_entry: Dictionary,
	footprint_id: String,
	group_size: int,
	composite: Dictionary
) -> int:
	if anchor_entry.has("expansionStage"):
		return maxi(0, int(anchor_entry.get("expansionStage", 0)))
	if anchor_entry.has("payloadStage"):
		return maxi(0, int(anchor_entry.get("payloadStage", 0)))
	var strategy: String = _resolve_world_cell_runtime_strategy(anchor_entry, footprint_id)
	return _resolve_world_cell_strategy_payload_stage(strategy, anchor_entry, footprint_id, group_size, composite)


func _resolve_world_cell_city_strategy_payload_stage(
	anchor_entry: Dictionary,
	footprint_id: String,
	group_size: int,
	composite: Dictionary
) -> int:
	var composite_stage_max: int = maxi(0, int(composite.get("payload_stage_max", 0)))
	if footprint_id == WORLD_CELL_FOOTPRINT_PLAYER_CITY_3X3_INITIAL:
		return 0
	if footprint_id == WORLD_CELL_FOOTPRINT_AI_CITY_3X3_INITIAL:
		return 0
	var owner_id: String = str(anchor_entry.get("owner", "")).strip_edges().to_lower()
	if owner_id != "" and owner_id != "neutral" and group_size <= 9:
		return 0
	var city_level: int = clampi(int(anchor_entry.get("cityLevel", 1)), 1, 9)
	return clampi(city_level - 3, 0, composite_stage_max)


func _build_world_cell_payload_state_by_offset(payload_slots_variant: Variant) -> Dictionary:
	var payload_state_by_offset: Dictionary = {}
	if not (payload_slots_variant is Array):
		return payload_state_by_offset
	var payload_slots: Array = payload_slots_variant as Array
	for slot_variant in payload_slots:
		if not (slot_variant is Dictionary):
			continue
		var slot: Dictionary = slot_variant as Dictionary
		var cell_offset: Vector2i = _vector2i_from_json_array(slot.get("cell_offset", []), Vector2i.ZERO)
		payload_state_by_offset[_coord_key(cell_offset.x, cell_offset.y)] = {
			"slotId": str(slot.get("slot_id", "")).strip_edges(),
			"cellState": str(slot.get("cellState", "reserved_building_cell")).strip_edges(),
			"active": bool(slot.get("active", false)),
		}
	return payload_state_by_offset


func _resolve_world_cell_city_strategy_composite_id(anchor_entry: Dictionary, group_size: int) -> String:
	var city_level: int = maxi(1, int(anchor_entry.get("cityLevel", 1)))
	var strategy_rule: Dictionary = _resolve_world_cell_city_strategy_rule(anchor_entry, group_size)
	var footprint_id: String = str(strategy_rule.get("footprint_id", _resolve_system_city_footprint_id(city_level))).strip_edges()
	var composite_fallback: String = str(strategy_rule.get("composite_fallback", "world_node_city_v1")).strip_edges()
	var footprint_rule: Dictionary = _get_world_cell_footprint_rule(footprint_id)
	var composite_id: String = str(footprint_rule.get("default_composite_id", composite_fallback)).strip_edges()
	if composite_id != "" and _world_cell_composite_by_id.has(composite_id):
		return composite_id
	return ""


func _resolve_world_cell_runtime_footprint_id(anchor_entry: Dictionary, group_size: int) -> String:
	var explicit_footprint_id: String = str(anchor_entry.get("footprintId", "")).strip_edges()
	if explicit_footprint_id != "" and not _get_world_cell_footprint_rule(explicit_footprint_id).is_empty():
		return explicit_footprint_id
	var strategy: String = _resolve_world_cell_runtime_strategy(anchor_entry, explicit_footprint_id)
	var strategy_footprint_id: String = _resolve_world_cell_strategy_footprint_id(strategy, anchor_entry, group_size)
	if strategy_footprint_id != "":
		return strategy_footprint_id
	var tile_type: String = _resolve_world_cell_runtime_type(anchor_entry, explicit_footprint_id)
	return _resolve_world_cell_node_dispatch_footprint_id(tile_type)


func _resolve_world_cell_runtime_composite_id(anchor_entry: Dictionary, footprint_id: String, group_size: int) -> String:
	var explicit_composite_id: String = str(anchor_entry.get("compositeId", "")).strip_edges()
	if explicit_composite_id != "" and _world_cell_composite_by_id.has(explicit_composite_id):
		return explicit_composite_id
	var strategy: String = _resolve_world_cell_runtime_strategy(anchor_entry, footprint_id)
	var strategy_composite_id: String = _resolve_world_cell_strategy_composite_id(strategy, anchor_entry, group_size)
	if strategy_composite_id != "":
		return strategy_composite_id
	var tile_type: String = _resolve_world_cell_runtime_type(anchor_entry, footprint_id)
	var node_composite_id: String = _resolve_world_cell_node_dispatch_composite_id(tile_type, anchor_entry)
	if node_composite_id != "" and _world_cell_composite_by_id.has(node_composite_id):
		return node_composite_id
	var rule: Dictionary = _get_world_cell_footprint_rule(footprint_id)
	var default_composite_id: String = str(rule.get("default_composite_id", "")).strip_edges()
	if default_composite_id != "" and _world_cell_composite_by_id.has(default_composite_id):
		return default_composite_id
	return explicit_composite_id


func _resolve_world_cell_city_strategy_footprint_id(anchor_entry: Dictionary, group_size: int) -> String:
	var city_level: int = maxi(1, int(anchor_entry.get("cityLevel", 1)))
	var strategy_rule: Dictionary = _resolve_world_cell_city_strategy_rule(anchor_entry, group_size)
	var strategy_footprint_id: String = str(strategy_rule.get("footprint_id", "")).strip_edges()
	if strategy_footprint_id != "":
		return strategy_footprint_id
	return _resolve_system_city_footprint_id(city_level)


func _resolve_world_cell_city_strategy_rule(anchor_entry: Dictionary, group_size: int) -> Dictionary:
	for rule_variant in WORLD_CELL_CITY_STRATEGY_RULES:
		if not (rule_variant is Dictionary):
			continue
		var rule: Dictionary = rule_variant as Dictionary
		if _does_world_cell_city_strategy_rule_match(rule, anchor_entry, group_size):
			return rule
	return {}


func _does_world_cell_city_strategy_rule_match(rule: Dictionary, anchor_entry: Dictionary, group_size: int) -> bool:
	var any_of_variant: Variant = rule.get("any_of", [])
	if any_of_variant is Array:
		var any_rules: Array = any_of_variant as Array
		if not any_rules.is_empty():
			var any_matched: bool = false
			for any_rule_variant in any_rules:
				if any_rule_variant is Dictionary and _does_world_cell_city_strategy_rule_match(any_rule_variant as Dictionary, anchor_entry, group_size):
					any_matched = true
					break
			if not any_matched:
				return false
	var tile_ids_variant: Variant = rule.get("tile_ids", [])
	if tile_ids_variant is Array and not (tile_ids_variant as Array).is_empty():
		var tile_id: String = str(anchor_entry.get("tileId", "")).strip_edges().to_lower()
		if not _string_array_has(tile_ids_variant, tile_id):
			return false
	var landmark_ids_variant: Variant = rule.get("landmark_ids", [])
	if landmark_ids_variant is Array and not (landmark_ids_variant as Array).is_empty():
		var landmark_id: String = str(anchor_entry.get("landmarkId", "")).strip_edges().to_lower()
		if not _string_array_has(landmark_ids_variant, landmark_id):
			return false
	var owner_excludes_variant: Variant = rule.get("owner_excludes", [])
	if bool(rule.get("owner_required", false)):
		var owner_id: String = str(anchor_entry.get("owner", "")).strip_edges().to_lower()
		if owner_id == "" or _string_array_has(owner_excludes_variant, owner_id):
			return false
	if rule.has("max_group_size") and group_size > int(rule.get("max_group_size", group_size)):
		return false
	if rule.has("min_group_size") and group_size < int(rule.get("min_group_size", group_size)):
		return false
	if rule.has("min_city_level"):
		var city_level: int = maxi(1, int(anchor_entry.get("cityLevel", 1)))
		if city_level < int(rule.get("min_city_level", city_level)):
			return false
	return true


func _resolve_world_cell_runtime_strategy(anchor_entry: Dictionary, footprint_id: String) -> String:
	var tile_type: String = _resolve_world_cell_runtime_type(anchor_entry, footprint_id)
	return _resolve_world_cell_runtime_strategy_for_type(tile_type)


func _resolve_world_cell_runtime_strategy_for_type(tile_type: String) -> String:
	var normalized_type: String = tile_type.strip_edges().to_lower()
	for strategy_variant in WORLD_CELL_RUNTIME_STRATEGY_ORDER:
		var strategy: String = str(strategy_variant).strip_edges()
		var strategy_rule: Dictionary = _resolve_world_cell_runtime_strategy_rule(strategy)
		var tile_types_variant: Variant = strategy_rule.get("tile_types", [])
		if tile_types_variant is Array and _string_array_has(tile_types_variant, normalized_type):
			return strategy
	return WORLD_CELL_RUNTIME_STRATEGY_NODE_DISPATCH


func _resolve_world_cell_runtime_strategy_rule(strategy: String) -> Dictionary:
	var rule_variant: Variant = WORLD_CELL_RUNTIME_STRATEGY_RULES.get(strategy.strip_edges(), {})
	if rule_variant is Dictionary:
		return rule_variant as Dictionary
	return {}


func _resolve_world_cell_strategy_handler_name(strategy: String, handler_key: String) -> String:
	var strategy_rule: Dictionary = _resolve_world_cell_runtime_strategy_rule(strategy)
	return str(strategy_rule.get(handler_key, "")).strip_edges()


func _call_world_cell_strategy_handler(strategy: String, handler_key: String, args: Array) -> Variant:
	var handler_name: String = _resolve_world_cell_strategy_handler_name(strategy, handler_key)
	if handler_name == "" or not has_method(handler_name):
		return null
	return callv(handler_name, args)


func _validate_world_cell_runtime_strategy_handlers() -> void:
	_world_cell_runtime_strategy_handler_audit = _build_world_cell_runtime_strategy_handler_audit()
	if bool(_world_cell_runtime_strategy_handler_audit.get("ok", true)):
		return
	push_warning("[world-cell] runtime strategy handler audit failed | missing=%s" % JSON.stringify(_world_cell_runtime_strategy_handler_audit.get("missingHandlers", [])))


func _build_world_cell_runtime_strategy_handler_audit() -> Dictionary:
	var audit := {
		"ok": true,
		"handlerKeys": WORLD_CELL_RUNTIME_STRATEGY_HANDLER_KEYS.duplicate(true),
		"strategyOrder": WORLD_CELL_RUNTIME_STRATEGY_ORDER.duplicate(true),
		"strategies": {},
		"missingHandlers": [],
	}
	for strategy_variant in WORLD_CELL_RUNTIME_STRATEGY_ORDER:
		var strategy: String = str(strategy_variant).strip_edges()
		var strategy_rule: Dictionary = _resolve_world_cell_runtime_strategy_rule(strategy)
		var strategy_audit := {
			"ruleFound": not strategy_rule.is_empty(),
			"handlers": {},
		}
		for handler_key_variant in WORLD_CELL_RUNTIME_STRATEGY_HANDLER_KEYS:
			var handler_key: String = str(handler_key_variant).strip_edges()
			var handler_name: String = str(strategy_rule.get(handler_key, "")).strip_edges()
			var configured: bool = handler_name != ""
			var exists: bool = true if not configured else has_method(handler_name)
			(strategy_audit["handlers"] as Dictionary)[handler_key] = {
				"configured": configured,
				"handler": handler_name,
				"exists": exists,
			}
			if configured and not exists:
				audit["ok"] = false
				(audit["missingHandlers"] as Array).append({
					"strategy": strategy,
					"handlerKey": handler_key,
					"handler": handler_name,
				})
		(audit["strategies"] as Dictionary)[strategy] = strategy_audit
	return audit


func _resolve_world_cell_strategy_footprint_id(strategy: String, anchor_entry: Dictionary, group_size: int) -> String:
	var handler_result: Variant = _call_world_cell_strategy_handler(
		strategy,
		"footprint_resolver",
		[anchor_entry, group_size]
	)
	if handler_result == null:
		return ""
	return str(handler_result).strip_edges()


func _resolve_world_cell_strategy_composite_id(strategy: String, anchor_entry: Dictionary, group_size: int) -> String:
	var handler_result: Variant = _call_world_cell_strategy_handler(
		strategy,
		"composite_resolver",
		[anchor_entry, group_size]
	)
	if handler_result == null:
		return ""
	return str(handler_result).strip_edges()


func _resolve_world_cell_strategy_payload_stage(
	strategy: String,
	anchor_entry: Dictionary,
	footprint_id: String,
	group_size: int,
	composite: Dictionary
) -> int:
	var handler_result: Variant = _call_world_cell_strategy_handler(
		strategy,
		"payload_stage_resolver",
		[anchor_entry, footprint_id, group_size, composite]
	)
	if handler_result == null:
		return 0
	return maxi(0, int(handler_result))


func _resolve_world_cell_runtime_strategy_priority(strategy: String, tile_type: String) -> int:
	var strategy_rule: Dictionary = _resolve_world_cell_runtime_strategy_rule(strategy)
	if strategy_rule.is_empty():
		return 999
	var priority: int = int(strategy_rule.get("priority", 999))
	if strategy == WORLD_CELL_RUNTIME_STRATEGY_NODE_DISPATCH and _resolve_world_cell_node_dispatch_rule(tile_type).is_empty():
		return int(strategy_rule.get("fallback_priority", priority))
	return priority


func _resolve_world_cell_runtime_type(anchor_entry: Dictionary, footprint_id: String) -> String:
	var explicit_type: String = str(anchor_entry.get("type", anchor_entry.get("role", ""))).strip_edges().to_lower()
	if explicit_type != "":
		return explicit_type
	var rule: Dictionary = _get_world_cell_footprint_rule(footprint_id)
	return str(rule.get("role", "")).strip_edges().to_lower()


func _resolve_world_cell_node_dispatch_rule(node_type: String) -> Dictionary:
	var rule_variant: Variant = WORLD_CELL_NODE_DISPATCH_RULES.get(node_type.strip_edges().to_lower(), {})
	if rule_variant is Dictionary:
		return rule_variant as Dictionary
	return {}


func _resolve_world_cell_node_preview_sample_rule(node_type: String) -> Dictionary:
	var rule_variant: Variant = WORLD_CELL_NODE_PREVIEW_SAMPLE_RULES.get(node_type.strip_edges().to_lower(), {})
	if rule_variant is Dictionary:
		return rule_variant as Dictionary
	return {}


func _is_supported_world_cell_node_tile_type(tile_type: String) -> bool:
	var dispatch_rule: Dictionary = _resolve_world_cell_node_dispatch_rule(tile_type)
	return not dispatch_rule.is_empty() and bool(dispatch_rule.get("backend_enabled", false))


func _resolve_world_cell_node_dispatch_footprint_id(node_type: String) -> String:
	var dispatch_rule: Dictionary = _resolve_world_cell_node_dispatch_rule(node_type)
	return str(dispatch_rule.get("footprint_id", "")).strip_edges()


func _resolve_world_cell_node_dispatch_composite_id(node_type: String, entry: Dictionary = {}) -> String:
	var explicit_composite_id: String = str(entry.get("compositeId", "")).strip_edges()
	if explicit_composite_id != "" and _world_cell_composite_by_id.has(explicit_composite_id):
		return explicit_composite_id
	var dispatch_rule: Dictionary = _resolve_world_cell_node_dispatch_rule(node_type)
	if dispatch_rule.is_empty():
		return ""
	var orientation: String = str(entry.get("orientation", entry.get("direction", entry.get("nodeVariant", entry.get("variant", ""))))).strip_edges().to_lower()
	var orientation_map_variant: Variant = dispatch_rule.get("orientation_composites", {})
	if orientation_map_variant is Dictionary:
		var orientation_map: Dictionary = orientation_map_variant as Dictionary
		var orientation_composite_id: String = str(orientation_map.get(orientation, "")).strip_edges()
		if orientation_composite_id != "":
			return orientation_composite_id
	return str(dispatch_rule.get("default_composite_id", "")).strip_edges()


func _resolve_world_cell_node_dispatch_default_terrain(node_type: String) -> String:
	var dispatch_rule: Dictionary = _resolve_world_cell_node_dispatch_rule(node_type)
	var default_terrain: String = str(dispatch_rule.get("default_terrain", "")).strip_edges().to_lower()
	if default_terrain != "":
		return default_terrain
	return node_type.strip_edges().to_lower()


func _build_world_cell_backend_node_entry(
	tile_data: Dictionary,
	tile_id: String,
	tile_x: int,
	tile_y: int,
	mapped_x: int,
	mapped_y: int
) -> Dictionary:
	var tile_type: String = str(tile_data.get("type", "")).strip_edges().to_lower()
	var footprint_id: String = _resolve_world_cell_node_dispatch_footprint_id(tile_type)
	if footprint_id == "":
		return {}
	var node_id: String = tile_id
	if node_id == "":
		node_id = "%s_%d_%d" % [tile_type, tile_x, tile_y]
	var terrain_fallback: String = _resolve_world_cell_node_dispatch_default_terrain(tile_type)
	return {
		"id": node_id,
		"tileId": tile_id,
		"type": tile_type,
		"x": tile_x,
		"y": tile_y,
		"backendX": tile_x,
		"backendY": tile_y,
		"tmxX": mapped_x,
		"tmxY": mapped_y,
		"terrain": str(tile_data.get("terrain", terrain_fallback)).strip_edges().to_lower(),
		"district": str(tile_data.get("district", "world")).strip_edges(),
		"footprintId": footprint_id,
		"compositeId": _resolve_world_cell_node_dispatch_composite_id(tile_type, tile_data),
		"owner": str(tile_data.get("owner", "")).strip_edges().to_lower(),
		"landmarkId": str(tile_data.get("landmarkId", "")).strip_edges(),
		"nodeVariant": str(tile_data.get("variant", tile_data.get("orientation", tile_data.get("direction", "")))).strip_edges().to_lower(),
		"groupKey": node_id,
	}


func _resolve_system_city_footprint_id(city_level: int) -> String:
	var normalized_level: int = clampi(city_level, 3, 9)
	if normalized_level >= 9:
		return WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L09_9X9
	if normalized_level >= 7:
		return WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L07_L08_7X7
	if normalized_level >= 5:
		return WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L05_L06_5X5
	return WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L03_L04_3X3


func _resolve_city_group_key(tile_id: String) -> String:
	var normalized_id: String = tile_id.strip_edges()
	if normalized_id == "":
		return ""
	var parts: PackedStringArray = normalized_id.split("_")
	if parts.size() < 3:
		return normalized_id
	var local_x_text: String = parts[parts.size() - 2]
	var local_y_text: String = parts[parts.size() - 1]
	if not local_x_text.is_valid_int() or not local_y_text.is_valid_int():
		return normalized_id
	var prefix_parts: Array[String] = []
	for index in range(parts.size() - 2):
		prefix_parts.append(parts[index])
	var prefix: String = "_".join(prefix_parts)
	if prefix == "" or prefix == "grid":
		return normalized_id
	var local_x: int = int(local_x_text)
	var local_y: int = int(local_y_text)
	if absi(local_x) > 16 or absi(local_y) > 16:
		return normalized_id
	return prefix


func _ingest_world_city_overlays(world_payload: Dictionary) -> void:
	_world_city_overlay_by_tile_id = {}
	if world_payload.is_empty():
		return
	var map_variant: Variant = world_payload.get("map", {})
	if not (map_variant is Dictionary):
		return
	var map_payload: Dictionary = map_variant as Dictionary
	var tiles_variant: Variant = map_payload.get("tiles", [])
	if not (tiles_variant is Array):
		return
	if _tmx_map_width <= 0 or _tmx_map_height <= 0:
		return
	if _backend_x_min > _backend_x_max or _backend_y_min > _backend_y_max:
		return

	var tiles: Array = tiles_variant as Array
	for tile_variant in tiles:
		if not (tile_variant is Dictionary):
			continue
		var tile_data: Dictionary = tile_variant as Dictionary
		var tile_type: String = str(tile_data.get("type", "")).strip_edges().to_lower()
		if tile_type != "city":
			continue
		var tile_id: String = str(tile_data.get("id", "")).strip_edges()
		if tile_id == "":
			continue
		var tile_x: int = int(tile_data.get("x", 0))
		var tile_y: int = int(tile_data.get("y", 0))
		var mapped_x: int = _map_backend_to_tmx_axis(tile_x, _backend_x_min, _backend_x_max, _tmx_map_width)
		var mapped_y: int = _map_backend_to_tmx_axis(tile_y, _backend_y_min, _backend_y_max, _tmx_map_height)
		_world_city_overlay_by_tile_id[tile_id] = {
			"tileId": tile_id,
			"backendX": tile_x,
			"backendY": tile_y,
			"tmxX": mapped_x,
			"tmxY": mapped_y,
			"cityLevel": maxi(1, int(tile_data.get("cityLevel", 1))),
			"owner": str(tile_data.get("owner", "")).strip_edges().to_lower(),
		}


func _rebuild_terrain_edge_overlay_entries(
	river_backend_entries: Array,
	river_coord_set: Dictionary,
	sand_backend_entries: Array,
	sand_coord_set: Dictionary,
) -> void:
	_terrain_edge_overlay_entries = []
	if not terrain_edge_overlay_enabled:
		return
	if river_edge_enabled:
		_append_terrain_edge_family_entries(river_backend_entries, river_coord_set, "water")
	if terrain_edge_enabled:
		_append_terrain_edge_family_entries(sand_backend_entries, sand_coord_set, "sand")


func _append_terrain_edge_family_entries(backend_entries: Array, terrain_coord_set: Dictionary, family: String) -> void:
	for entry_variant in backend_entries:
		if not (entry_variant is Dictionary):
			continue
		var entry: Dictionary = entry_variant as Dictionary
		var tile_x: int = int(entry.get("x", 0))
		var tile_y: int = int(entry.get("y", 0))
		var overlay_meta: Dictionary = _resolve_terrain_edge_overlay_meta(tile_x, tile_y, terrain_coord_set, family)
		_terrain_edge_overlay_entries.append(
			{
				"tmxX": int(entry.get("tmxX", -1)),
				"tmxY": int(entry.get("tmxY", -1)),
				"overlayFrame": str(overlay_meta.get("frame", "")),
				"alpha": float(overlay_meta.get("alpha", 0.35)),
				"rotation": float(overlay_meta.get("rotation", 0.0)),
				"overlayHeight": float(overlay_meta.get("height", terrain_edge_overlay_base_height)),
			}
		)


func _resolve_terrain_edge_overlay_meta(tile_x: int, tile_y: int, terrain_coord_set: Dictionary, family: String) -> Dictionary:
	if terrain_edge_bitmask_enabled:
		return _resolve_terrain_edge_overlay_meta_bitmask(tile_x, tile_y, terrain_coord_set, family)

	var cardinal_mask: int = _compute_terrain_cardinal_mask(tile_x, tile_y, terrain_coord_set)
	var diagonal_mask: int = _compute_terrain_diagonal_mask(tile_x, tile_y, terrain_coord_set)
	var cardinal_count: int = _mask_bit_count(cardinal_mask)
	var diagonal_count: int = _mask_bit_count(diagonal_mask)
	var variant_code: String = _pick_edge_variant_code(EDGE_VARIANTS_SINGLE, tile_x, tile_y, diagonal_count)
	var frame_name: String = _resolve_terrain_edge_frame_name(family, variant_code, cardinal_count, diagonal_count, tile_x, tile_y)
	var alpha_min: float = min(clampf(terrain_edge_alpha_min, 0.0, 1.0), clampf(terrain_edge_alpha_max, 0.0, 1.0))
	var alpha_max: float = max(clampf(terrain_edge_alpha_min, 0.0, 1.0), clampf(terrain_edge_alpha_max, 0.0, 1.0))
	return {
		"frame": frame_name,
		"alpha": lerpf(alpha_min, alpha_max, clampf(float(cardinal_count) * 0.2, 0.0, 1.0)),
		"rotation": 0.0,
		"height": terrain_edge_overlay_base_height,
	}


func _resolve_terrain_edge_overlay_meta_bitmask(
	tile_x: int,
	tile_y: int,
	terrain_coord_set: Dictionary,
	family: String
) -> Dictionary:
	var cardinal_mask: int = _compute_terrain_cardinal_mask(tile_x, tile_y, terrain_coord_set)
	var diagonal_mask: int = _compute_terrain_diagonal_mask(tile_x, tile_y, terrain_coord_set)
	var cardinal_count: int = _mask_bit_count(cardinal_mask)
	var diagonal_count: int = _mask_bit_count(diagonal_mask)
	var rotation: float = 0.0
	var alpha_weight: float = 0.18
	var variants: Array = EDGE_VARIANTS_ISOLATED

	if cardinal_count <= 0:
		variants = EDGE_VARIANTS_ISOLATED
		alpha_weight = 0.16 + 0.04 * float(mini(3, diagonal_count))
	elif cardinal_count == 1:
		variants = EDGE_VARIANTS_SINGLE
		rotation = _rotation_for_single_mountain_link(cardinal_mask)
		alpha_weight = 0.32 + 0.05 * float(mini(2, diagonal_count))
	elif cardinal_count == 2:
		if cardinal_mask == (MOUNTAIN_MASK_N | MOUNTAIN_MASK_S):
			variants = EDGE_VARIANTS_STRAIGHT
			rotation = 0.0
			alpha_weight = 0.54
		elif cardinal_mask == (MOUNTAIN_MASK_E | MOUNTAIN_MASK_W):
			variants = EDGE_VARIANTS_STRAIGHT
			rotation = PI * 0.5
			alpha_weight = 0.54
		else:
			variants = EDGE_VARIANTS_CORNER
			rotation = _rotation_for_corner_mountain_link(cardinal_mask)
			alpha_weight = 0.62
			if not _corner_has_diagonal_support(cardinal_mask, diagonal_mask):
				alpha_weight -= 0.16
	elif cardinal_count == 3:
		variants = EDGE_VARIANTS_TEE
		rotation = _rotation_for_tee_mountain_link(cardinal_mask)
		alpha_weight = 0.76
	else:
		variants = EDGE_VARIANTS_FULL
		rotation = 0.0
		alpha_weight = 0.90

	var variant_code: String = _pick_edge_variant_code(variants, tile_x, tile_y, diagonal_count)
	var frame_name: String = _resolve_terrain_edge_frame_name(family, variant_code, cardinal_count, diagonal_count, tile_x, tile_y)
	var alpha_min: float = min(clampf(terrain_edge_alpha_min, 0.0, 1.0), clampf(terrain_edge_alpha_max, 0.0, 1.0))
	var alpha_max: float = max(clampf(terrain_edge_alpha_min, 0.0, 1.0), clampf(terrain_edge_alpha_max, 0.0, 1.0))
	var alpha: float = lerpf(alpha_min, alpha_max, clampf(alpha_weight, 0.0, 1.0))
	var overlay_height: float = terrain_edge_overlay_base_height * lerpf(0.84, 1.08, clampf(alpha_weight, 0.0, 1.0))
	if not terrain_edge_rotation_enabled:
		rotation = 0.0
	return {
		"frame": frame_name,
		"alpha": alpha,
		"rotation": rotation,
		"height": overlay_height,
	}


func _compute_terrain_cardinal_mask(tile_x: int, tile_y: int, terrain_coord_set: Dictionary) -> int:
	var mask: int = 0
	if _terrain_set_has(terrain_coord_set, tile_x, tile_y - 1):
		mask |= MOUNTAIN_MASK_N
	if _terrain_set_has(terrain_coord_set, tile_x + 1, tile_y):
		mask |= MOUNTAIN_MASK_E
	if _terrain_set_has(terrain_coord_set, tile_x, tile_y + 1):
		mask |= MOUNTAIN_MASK_S
	if _terrain_set_has(terrain_coord_set, tile_x - 1, tile_y):
		mask |= MOUNTAIN_MASK_W
	return mask


func _compute_terrain_diagonal_mask(tile_x: int, tile_y: int, terrain_coord_set: Dictionary) -> int:
	var mask: int = 0
	if _terrain_set_has(terrain_coord_set, tile_x + 1, tile_y - 1):
		mask |= MOUNTAIN_MASK_NE
	if _terrain_set_has(terrain_coord_set, tile_x + 1, tile_y + 1):
		mask |= MOUNTAIN_MASK_SE
	if _terrain_set_has(terrain_coord_set, tile_x - 1, tile_y + 1):
		mask |= MOUNTAIN_MASK_SW
	if _terrain_set_has(terrain_coord_set, tile_x - 1, tile_y - 1):
		mask |= MOUNTAIN_MASK_NW
	return mask


func _terrain_set_has(terrain_coord_set: Dictionary, tile_x: int, tile_y: int) -> bool:
	return terrain_coord_set.has(_coord_key(tile_x, tile_y))


func _pick_edge_variant_code(variants: Array, tile_x: int, tile_y: int, extra_seed: int = 0) -> String:
	if variants.is_empty():
		return "11"
	var hash_value: int = _edge_hash(tile_x, tile_y, extra_seed)
	var idx: int = posmod(hash_value, variants.size())
	return str(variants[idx])


func _resolve_terrain_edge_frame_name(
	family: String,
	variant_code: String,
	cardinal_count: int,
	diagonal_count: int,
	tile_x: int,
	tile_y: int
) -> String:
	var style_suffix: String = "3" if cardinal_count >= 3 or diagonal_count >= 2 else "1"
	if (cardinal_count == 2 and diagonal_count <= 1 and (posmod(_edge_hash(tile_x, tile_y, 3), 4) == 0)):
		style_suffix = "3" if style_suffix == "1" else "1"

	var primary: String = "%s_%s_%s.png" % [family, variant_code, style_suffix]
	if _overlay_texture_by_frame.has(primary):
		return primary
	var alt_style: String = "1" if style_suffix == "3" else "3"
	var fallback_style: String = "%s_%s_%s.png" % [family, variant_code, alt_style]
	if _overlay_texture_by_frame.has(fallback_style):
		return fallback_style
	var hard_fallback: String = "%s_11_1.png" % family
	if _overlay_texture_by_frame.has(hard_fallback):
		return hard_fallback
	return primary


func _edge_hash(tile_x: int, tile_y: int, extra_seed: int = 0) -> int:
	var value: int = int(tile_x * 73856093) ^ int(tile_y * 19349663) ^ int(extra_seed * 83492791)
	return absi(value)


func _rebuild_mountain_overlay_entries(mountain_backend_entries: Array) -> void:
	_mountain_overlay_entries = []
	if not mountain_overlay_enabled:
		return
	for entry_variant in mountain_backend_entries:
		if not (entry_variant is Dictionary):
			continue
		var entry: Dictionary = entry_variant as Dictionary
		var tile_x: int = int(entry.get("x", 0))
		var tile_y: int = int(entry.get("y", 0))
		var overlay_meta: Dictionary = _resolve_mountain_overlay_meta(tile_x, tile_y)
		if bool(overlay_meta.get("skip", false)):
			continue
		_mountain_overlay_entries.append(
			{
				"tmxX": int(entry.get("tmxX", -1)),
				"tmxY": int(entry.get("tmxY", -1)),
				"overlayFrame": str(overlay_meta.get("frame", "hill1.png")),
				"alpha": float(overlay_meta.get("alpha", 0.32)),
				"rotation": float(overlay_meta.get("rotation", 0.0)),
				"overlayHeight": float(overlay_meta.get("height", mountain_overlay_base_height)),
			}
		)


func _is_mountain_backend_tile(tile_x: int, tile_y: int) -> bool:
	return _mountain_coord_set.has(_coord_key(tile_x, tile_y))


func _count_mountain_cardinal_neighbors(tile_x: int, tile_y: int) -> int:
	var count: int = 0
	if _is_mountain_backend_tile(tile_x, tile_y - 1):
		count += 1
	if _is_mountain_backend_tile(tile_x + 1, tile_y):
		count += 1
	if _is_mountain_backend_tile(tile_x, tile_y + 1):
		count += 1
	if _is_mountain_backend_tile(tile_x - 1, tile_y):
		count += 1
	return count


func _count_mountain_diagonal_neighbors(tile_x: int, tile_y: int) -> int:
	var count: int = 0
	if _is_mountain_backend_tile(tile_x + 1, tile_y - 1):
		count += 1
	if _is_mountain_backend_tile(tile_x + 1, tile_y + 1):
		count += 1
	if _is_mountain_backend_tile(tile_x - 1, tile_y + 1):
		count += 1
	if _is_mountain_backend_tile(tile_x - 1, tile_y - 1):
		count += 1
	return count


func _resolve_mountain_overlay_meta(tile_x: int, tile_y: int) -> Dictionary:
	if mountain_bitmask_enabled:
		return _resolve_mountain_overlay_meta_bitmask(tile_x, tile_y)
	return {
		"frame": _resolve_mountain_overlay_frame(tile_x, tile_y),
		"alpha": _resolve_mountain_overlay_alpha(tile_x, tile_y),
		"rotation": 0.0,
		"height": mountain_overlay_base_height,
	}


func _resolve_mountain_overlay_meta_bitmask(tile_x: int, tile_y: int) -> Dictionary:
	var cardinal_mask: int = _compute_mountain_cardinal_mask(tile_x, tile_y)
	var diagonal_mask: int = _compute_mountain_diagonal_mask(tile_x, tile_y)
	var cardinal_count: int = _mask_bit_count(cardinal_mask)
	var diagonal_count: int = _mask_bit_count(diagonal_mask)
	var frame_name: String = "hill1.png"
	var rotation: float = 0.0
	var alpha_weight: float = 0.15

	if cardinal_count <= 0:
		frame_name = "hill1.png"
		alpha_weight = 0.12 + 0.05 * float(mini(3, diagonal_count))
	elif cardinal_count == 1:
		frame_name = "hill2.png"
		rotation = _rotation_for_single_mountain_link(cardinal_mask)
		alpha_weight = 0.32 + 0.04 * float(mini(2, diagonal_count))
	elif cardinal_count == 2:
		if cardinal_mask == (MOUNTAIN_MASK_N | MOUNTAIN_MASK_S):
			frame_name = "hill3.png"
			rotation = 0.0
			alpha_weight = 0.56
		elif cardinal_mask == (MOUNTAIN_MASK_E | MOUNTAIN_MASK_W):
			frame_name = "hill3.png"
			rotation = PI * 0.5
			alpha_weight = 0.56
		else:
			frame_name = "hill4.png"
			rotation = _rotation_for_corner_mountain_link(cardinal_mask)
			alpha_weight = 0.66
			if not _corner_has_diagonal_support(cardinal_mask, diagonal_mask):
				alpha_weight -= 0.14
	elif cardinal_count == 3:
		frame_name = "hill5.png"
		rotation = _rotation_for_tee_mountain_link(cardinal_mask)
		alpha_weight = 0.82
	else:
		frame_name = "hill5.png"
		rotation = 0.0
		alpha_weight = 1.0

	var ridge_score: float = _compute_mountain_ridge_score(cardinal_mask, diagonal_mask, cardinal_count, diagonal_count)
	if mountain_ridge_bias_enabled:
		alpha_weight += ridge_score * clampf(mountain_ridge_bias_strength, 0.0, 0.40)

	var clamped_weight: float = clampf(alpha_weight, 0.0, 1.0)
	if mountain_edge_denoise_enabled and _should_skip_mountain_overlay(cardinal_count, diagonal_count, clamped_weight):
		return {
			"skip": true,
			"frame": frame_name,
			"alpha": 0.0,
			"rotation": rotation,
			"height": mountain_overlay_base_height,
		}

	var alpha_min: float = min(clampf(mountain_overlay_alpha_min, 0.0, 1.0), clampf(mountain_overlay_alpha_max, 0.0, 1.0))
	var alpha_max: float = max(clampf(mountain_overlay_alpha_min, 0.0, 1.0), clampf(mountain_overlay_alpha_max, 0.0, 1.0))
	var alpha: float = lerpf(alpha_min, alpha_max, clamped_weight)
	var height_scale: float = lerpf(0.80, 1.10, clamped_weight)
	var overlay_height: float = mountain_overlay_base_height * height_scale
	if not mountain_rotation_enabled:
		rotation = 0.0
	return {
		"skip": false,
		"frame": frame_name,
		"alpha": alpha,
		"rotation": rotation,
		"height": overlay_height,
	}


func _compute_mountain_cardinal_mask(tile_x: int, tile_y: int) -> int:
	var mask: int = 0
	if _is_mountain_backend_tile(tile_x, tile_y - 1):
		mask |= MOUNTAIN_MASK_N
	if _is_mountain_backend_tile(tile_x + 1, tile_y):
		mask |= MOUNTAIN_MASK_E
	if _is_mountain_backend_tile(tile_x, tile_y + 1):
		mask |= MOUNTAIN_MASK_S
	if _is_mountain_backend_tile(tile_x - 1, tile_y):
		mask |= MOUNTAIN_MASK_W
	return mask


func _compute_mountain_diagonal_mask(tile_x: int, tile_y: int) -> int:
	var mask: int = 0
	if _is_mountain_backend_tile(tile_x + 1, tile_y - 1):
		mask |= MOUNTAIN_MASK_NE
	if _is_mountain_backend_tile(tile_x + 1, tile_y + 1):
		mask |= MOUNTAIN_MASK_SE
	if _is_mountain_backend_tile(tile_x - 1, tile_y + 1):
		mask |= MOUNTAIN_MASK_SW
	if _is_mountain_backend_tile(tile_x - 1, tile_y - 1):
		mask |= MOUNTAIN_MASK_NW
	return mask


func _mask_bit_count(mask: int) -> int:
	var count: int = 0
	var value: int = mask
	while value != 0:
		count += value & 1
		value >>= 1
	return count


func _rotation_for_single_mountain_link(cardinal_mask: int) -> float:
	if cardinal_mask == MOUNTAIN_MASK_N:
		return 0.0
	if cardinal_mask == MOUNTAIN_MASK_E:
		return PI * 0.5
	if cardinal_mask == MOUNTAIN_MASK_S:
		return PI
	if cardinal_mask == MOUNTAIN_MASK_W:
		return PI * 1.5
	return 0.0


func _rotation_for_corner_mountain_link(cardinal_mask: int) -> float:
	if cardinal_mask == (MOUNTAIN_MASK_N | MOUNTAIN_MASK_E):
		return 0.0
	if cardinal_mask == (MOUNTAIN_MASK_E | MOUNTAIN_MASK_S):
		return PI * 0.5
	if cardinal_mask == (MOUNTAIN_MASK_S | MOUNTAIN_MASK_W):
		return PI
	if cardinal_mask == (MOUNTAIN_MASK_W | MOUNTAIN_MASK_N):
		return PI * 1.5
	return 0.0


func _rotation_for_tee_mountain_link(cardinal_mask: int) -> float:
	if (cardinal_mask & MOUNTAIN_MASK_S) == 0:
		return 0.0
	if (cardinal_mask & MOUNTAIN_MASK_W) == 0:
		return PI * 0.5
	if (cardinal_mask & MOUNTAIN_MASK_N) == 0:
		return PI
	if (cardinal_mask & MOUNTAIN_MASK_E) == 0:
		return PI * 1.5
	return 0.0


func _corner_has_diagonal_support(cardinal_mask: int, diagonal_mask: int) -> bool:
	if cardinal_mask == (MOUNTAIN_MASK_N | MOUNTAIN_MASK_E):
		return (diagonal_mask & MOUNTAIN_MASK_NE) != 0
	if cardinal_mask == (MOUNTAIN_MASK_E | MOUNTAIN_MASK_S):
		return (diagonal_mask & MOUNTAIN_MASK_SE) != 0
	if cardinal_mask == (MOUNTAIN_MASK_S | MOUNTAIN_MASK_W):
		return (diagonal_mask & MOUNTAIN_MASK_SW) != 0
	if cardinal_mask == (MOUNTAIN_MASK_W | MOUNTAIN_MASK_N):
		return (diagonal_mask & MOUNTAIN_MASK_NW) != 0
	return true


func _compute_mountain_ridge_score(cardinal_mask: int, diagonal_mask: int, cardinal_count: int, diagonal_count: int) -> float:
	if cardinal_count <= 0:
		return 0.05 * float(mini(2, diagonal_count))
	if cardinal_count == 1:
		return 0.24 + 0.04 * float(mini(2, diagonal_count))
	if cardinal_count == 2:
		if cardinal_mask == (MOUNTAIN_MASK_N | MOUNTAIN_MASK_S):
			var ns_support: int = 0
			if (diagonal_mask & MOUNTAIN_MASK_NE) != 0:
				ns_support += 1
			if (diagonal_mask & MOUNTAIN_MASK_NW) != 0:
				ns_support += 1
			if (diagonal_mask & MOUNTAIN_MASK_SE) != 0:
				ns_support += 1
			if (diagonal_mask & MOUNTAIN_MASK_SW) != 0:
				ns_support += 1
			return 0.60 + 0.08 * float(ns_support)
		if cardinal_mask == (MOUNTAIN_MASK_E | MOUNTAIN_MASK_W):
			var ew_support: int = 0
			if (diagonal_mask & MOUNTAIN_MASK_NE) != 0:
				ew_support += 1
			if (diagonal_mask & MOUNTAIN_MASK_SE) != 0:
				ew_support += 1
			if (diagonal_mask & MOUNTAIN_MASK_NW) != 0:
				ew_support += 1
			if (diagonal_mask & MOUNTAIN_MASK_SW) != 0:
				ew_support += 1
			return 0.60 + 0.08 * float(ew_support)
		var corner_support: float = 0.55 if _corner_has_diagonal_support(cardinal_mask, diagonal_mask) else 0.30
		return corner_support + 0.04 * float(mini(2, diagonal_count))
	if cardinal_count == 3:
		return 0.74 + 0.05 * float(mini(2, diagonal_count))
	return 0.92


func _should_skip_mountain_overlay(cardinal_count: int, diagonal_count: int, clamped_weight: float) -> bool:
	var threshold: float = clampf(mountain_edge_noise_alpha_threshold, 0.0, 1.0)
	if cardinal_count == 0 and diagonal_count <= 1:
		return true
	if cardinal_count <= 1 and clamped_weight < threshold:
		return true
	return false


func _resolve_mountain_overlay_frame(tile_x: int, tile_y: int) -> String:
	var cardinal_count: int = _count_mountain_cardinal_neighbors(tile_x, tile_y)
	var diagonal_count: int = _count_mountain_diagonal_neighbors(tile_x, tile_y)
	if cardinal_count >= 4:
		return "hill5.png"
	if cardinal_count == 3:
		return "hill4.png"
	if cardinal_count == 2:
		if diagonal_count >= 2:
			return "hill4.png"
		return "hill3.png"
	if cardinal_count == 1:
		return "hill2.png"
	if diagonal_count >= 3:
		return "hill3.png"
	return "hill1.png"


func _resolve_mountain_overlay_alpha(tile_x: int, tile_y: int) -> float:
	var cardinal_count: int = _count_mountain_cardinal_neighbors(tile_x, tile_y)
	match cardinal_count:
		4:
			return 0.52
		3:
			return 0.48
		2:
			return 0.43
		1:
			return 0.36
		_:
			if _count_mountain_diagonal_neighbors(tile_x, tile_y) >= 2:
				return 0.34
			return 0.28


func _resolve_resource_overlay_frame(resource_kind: String, resource_level: int) -> String:
	var normalized_kind: String = resource_kind.strip_edges().to_lower()
	var level: int = maxi(1, resource_level)
	if normalized_kind == "fortress" or normalized_kind == "sys_fortress":
		return "sys_fortress.png"
	if normalized_kind == "":
		var ground_index: int = clampi(level, 1, 9)
		return "world_resource_grain_l%02d_v1.png" % ground_index

	var world_resource_level_index: int = clampi(level, 1, 9)
	match normalized_kind:
		"food", "grain":
			return "world_resource_grain_l%02d_v1.png" % world_resource_level_index
		"wood":
			return "world_resource_wood_l%02d_v1.png" % world_resource_level_index
		"stone":
			return "world_resource_stone_l%02d_v1.png" % world_resource_level_index
		"iron":
			return "world_resource_iron_l%02d_v1.png" % world_resource_level_index
		"copper":
			return "world_resource_copper_l%02d_v1.png" % world_resource_level_index

	return "world_resource_stone_l%02d_v1.png" % world_resource_level_index


func _load_world_resource_asset_manifest() -> void:
	_world_resource_frame_meta_by_frame = {}
	if not FileAccess.file_exists(THEME_WORLD_RESOURCE_ASSET_MANIFEST_PATH):
		push_warning("[map-grid-theme] world resource asset manifest missing: %s" % THEME_WORLD_RESOURCE_ASSET_MANIFEST_PATH)
		return

	var file := FileAccess.open(THEME_WORLD_RESOURCE_ASSET_MANIFEST_PATH, FileAccess.READ)
	if file == null:
		push_warning("[map-grid-theme] world resource asset manifest open failed: %s" % THEME_WORLD_RESOURCE_ASSET_MANIFEST_PATH)
		return

	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not (parsed is Dictionary):
		push_warning("[map-grid-theme] world resource asset manifest parse failed")
		return

	var manifest: Dictionary = parsed as Dictionary
	var effective_footprint: Vector2 = _vector2_from_json_array(
		manifest.get("effective_footprint", []),
		WORLD_RESOURCE_DEFAULT_EFFECTIVE_FOOTPRINT
	)
	var fit_footprint: Vector2 = _vector2_from_json_array(
		manifest.get("fit_footprint", []),
		WORLD_RESOURCE_DEFAULT_FIT_FOOTPRINT
	)
	var projection_variant: Variant = manifest.get("projection", {})
	var projection: Dictionary = {}
	if projection_variant is Dictionary:
		projection = projection_variant as Dictionary
	var source_anchor: Vector2 = _vector2_from_json_array(
		projection.get("anchor_pixel", []),
		WORLD_RESOURCE_DEFAULT_SOURCE_ANCHOR
	)
	var resources_variant: Variant = manifest.get("resources", {})
	if not (resources_variant is Dictionary):
		push_warning("[map-grid-theme] world resource asset manifest missing resources")
		return

	var loaded_count: int = 0
	var resources: Dictionary = resources_variant as Dictionary
	for kind_variant in resources.keys():
		var entries_variant: Variant = resources.get(kind_variant, {})
		if not (entries_variant is Dictionary):
			continue
		var entries: Dictionary = entries_variant as Dictionary
		for entry_key_variant in entries.keys():
			var filename: String = str(entries.get(entry_key_variant, "")).strip_edges()
			if filename == "" or not filename.ends_with(".png"):
				continue
			var texture_path: String = "%s/resources/%s" % [THEME_WORLD_ROOT, filename]
			var texture: Texture2D = _load_texture_with_fallback(texture_path)
			if texture == null:
				continue
			_overlay_texture_by_frame[filename] = texture
			_world_resource_frame_meta_by_frame[filename] = {
				"effectiveFootprint": effective_footprint,
				"fitFootprint": fit_footprint,
				"sourceAnchor": source_anchor,
			}
			loaded_count += 1

	print("[map-grid-theme] world resource assets loaded=%d" % loaded_count)


func _load_world_map_theme_manifest(path: String, expected_manifest_id: String, fallback_warning_label: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		_world_map_manifest_fallback_used = true
		_world_map_manifest_renderer_wiring_status = WORLD_MAP_MANIFEST_FALLBACK_STATUS
		_world_map_manifest_fallback_reason_by_manifest[expected_manifest_id] = "missing"
		push_warning("[map-grid-theme] %s missing: %s" % [fallback_warning_label, path])
		return {}

	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		_world_map_manifest_fallback_used = true
		_world_map_manifest_renderer_wiring_status = WORLD_MAP_MANIFEST_FALLBACK_STATUS
		_world_map_manifest_fallback_reason_by_manifest[expected_manifest_id] = "open_failed"
		push_warning("[map-grid-theme] %s open failed: %s" % [fallback_warning_label, path])
		return {}

	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not (parsed is Dictionary):
		_world_map_manifest_fallback_used = true
		_world_map_manifest_renderer_wiring_status = WORLD_MAP_MANIFEST_FALLBACK_STATUS
		_world_map_manifest_fallback_reason_by_manifest[expected_manifest_id] = "parse_failed"
		push_warning("[map-grid-theme] %s parse failed: %s" % [fallback_warning_label, path])
		return {}

	var manifest: Dictionary = parsed as Dictionary
	if str(manifest.get("manifestId", "")).strip_edges() != expected_manifest_id:
		_world_map_manifest_fallback_used = true
		_world_map_manifest_renderer_wiring_status = WORLD_MAP_MANIFEST_FALLBACK_STATUS
		_world_map_manifest_fallback_reason_by_manifest[expected_manifest_id] = "manifest_id_mismatch"
		push_warning("[map-grid-theme] %s manifestId mismatch: %s" % [fallback_warning_label, path])
		return {}

	_world_map_manifest_fallback_reason_by_manifest.erase(expected_manifest_id)
	return manifest


func _load_world_region_overlay_manifest() -> void:
	_world_region_overlay_manifest = _load_world_map_theme_manifest(
		THEME_WORLD_REGION_OVERLAY_MANIFEST_PATH,
		"world_region_overlay_manifest_v1",
		"world region overlay manifest"
	)


func _load_world_route_assets_manifest() -> void:
	_world_route_assets_manifest = _load_world_map_theme_manifest(
		THEME_WORLD_ROUTE_ASSETS_MANIFEST_PATH,
		"world_route_assets_manifest_v1",
		"world route assets manifest"
	)


func _load_world_event_marker_manifest() -> void:
	_world_event_marker_manifest = _load_world_map_theme_manifest(
		THEME_WORLD_EVENT_MARKER_MANIFEST_PATH,
		"world_event_marker_manifest_v1",
		"world event marker manifest"
	)


func _load_world_label_chrome_manifest() -> void:
	_world_label_chrome_manifest = _load_world_map_theme_manifest(
		THEME_WORLD_LABEL_CHROME_MANIFEST_PATH,
		"world_label_chrome_manifest_v1",
		"world label chrome manifest"
	)


func _load_world_cell_asset_manifest() -> void:
	_world_cell_frame_meta_by_frame = {}
	_world_cell_composite_by_id = {}
	if not FileAccess.file_exists(THEME_WORLD_CELL_ASSET_MANIFEST_PATH):
		push_warning("[map-grid-theme] world cell asset manifest missing: %s" % THEME_WORLD_CELL_ASSET_MANIFEST_PATH)
		return

	var file := FileAccess.open(THEME_WORLD_CELL_ASSET_MANIFEST_PATH, FileAccess.READ)
	if file == null:
		push_warning("[map-grid-theme] world cell asset manifest open failed: %s" % THEME_WORLD_CELL_ASSET_MANIFEST_PATH)
		return

	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not (parsed is Dictionary):
		push_warning("[map-grid-theme] world cell asset manifest parse failed")
		return

	var manifest: Dictionary = parsed as Dictionary
	var defaults_variant: Variant = manifest.get("defaults", {})
	var defaults: Dictionary = {}
	if defaults_variant is Dictionary:
		defaults = defaults_variant as Dictionary
	var default_fit_footprint: Vector2 = _vector2_from_json_array(
		defaults.get("fit_footprint", []),
		WORLD_CELL_DEFAULT_FIT_FOOTPRINT
	)
	var default_source_anchor: Vector2 = _vector2_from_json_array(
		defaults.get("source_anchor", []),
		WORLD_CELL_DEFAULT_SOURCE_ANCHOR
	)

	var frames_variant: Variant = manifest.get("frames", {})
	if not (frames_variant is Dictionary):
		push_warning("[map-grid-theme] world cell asset manifest missing frames")
		return

	var loaded_count: int = 0
	var frames: Dictionary = frames_variant as Dictionary
	for frame_key_variant in frames.keys():
		var frame_meta_variant: Variant = frames.get(frame_key_variant, {})
		if not (frame_meta_variant is Dictionary):
			continue
		var frame_meta: Dictionary = frame_meta_variant as Dictionary
		var filename: String = str(frame_meta.get("file", str(frame_key_variant))).strip_edges()
		if filename == "" or not filename.ends_with(".png"):
			continue
		var texture_path: String = "%s/%s" % [THEME_WORLD_ROOT, filename]
		var texture: Texture2D = _load_texture_with_fallback(texture_path)
		if texture == null:
			continue
		_overlay_texture_by_frame[filename] = texture
		_world_cell_frame_meta_by_frame[filename] = {
			"fitFootprint": _vector2_from_json_array(frame_meta.get("fit_footprint", []), default_fit_footprint),
			"sourceAnchor": _vector2_from_json_array(frame_meta.get("source_anchor", []), default_source_anchor),
			"visualFitScale": float(frame_meta.get("visual_fit_scale", 1.0)),
			"anchorRule": str(frame_meta.get("anchor_rule", defaults.get("anchor_rule", "bottom_center"))).strip_edges(),
			"drawLayer": str(frame_meta.get("draw_layer", "")).strip_edges(),
		}
		loaded_count += 1

	var composites_variant: Variant = manifest.get("composites", {})
	if composites_variant is Dictionary:
		var composites: Dictionary = composites_variant as Dictionary
		for composite_id_variant in composites.keys():
			var composite_variant: Variant = composites.get(composite_id_variant, {})
			if composite_variant is Dictionary:
				_world_cell_composite_by_id[str(composite_id_variant)] = composite_variant

	print("[map-grid-theme] world cell assets loaded=%d composites=%d" % [loaded_count, _world_cell_composite_by_id.size()])


func _load_main_world_mountain_boundary_asset_manifest() -> void:
	_main_world_mountain_boundary_asset_manifest = {}
	_main_world_mountain_boundary_piece_meta_by_id = {}
	_main_world_mountain_boundary_texture_by_piece_id = {}
	_main_world_mountain_boundary_runtime_copy_gate = ""
	if not FileAccess.file_exists(THEME_MAIN_WORLD_MOUNTAIN_BOUNDARY_ASSET_MANIFEST_PATH):
		push_warning("[map-grid-theme] main-world mountain asset manifest missing: %s" % THEME_MAIN_WORLD_MOUNTAIN_BOUNDARY_ASSET_MANIFEST_PATH)
		return

	var file := FileAccess.open(THEME_MAIN_WORLD_MOUNTAIN_BOUNDARY_ASSET_MANIFEST_PATH, FileAccess.READ)
	if file == null:
		push_warning("[map-grid-theme] main-world mountain asset manifest open failed: %s" % THEME_MAIN_WORLD_MOUNTAIN_BOUNDARY_ASSET_MANIFEST_PATH)
		return

	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not (parsed is Dictionary):
		push_warning("[map-grid-theme] main-world mountain asset manifest parse failed")
		return

	var manifest: Dictionary = parsed as Dictionary
	_main_world_mountain_boundary_asset_manifest = manifest
	_main_world_mountain_boundary_runtime_copy_gate = str(manifest.get("runtime_copy_gate", "")).strip_edges()
	var asset_root: String = str(manifest.get("asset_root", "res://assets/themes/slgclient/current/world/mountains")).strip_edges()
	var frames_variant: Variant = manifest.get("frames", {})
	if not (frames_variant is Dictionary):
		push_warning("[map-grid-theme] main-world mountain asset manifest missing frames")
		return

	var loaded_count: int = 0
	var frames: Dictionary = frames_variant as Dictionary
	for piece_id_variant in frames.keys():
		var frame_variant: Variant = frames.get(piece_id_variant, {})
		if not (frame_variant is Dictionary):
			continue
		var piece_id: String = str(piece_id_variant).strip_edges()
		var frame: Dictionary = (frame_variant as Dictionary).duplicate(true)
		var asset_path: String = str(frame.get("asset_path", "")).strip_edges()
		if asset_path == "":
			var filename: String = str(frame.get("file", "")).strip_edges()
			if filename != "":
				asset_path = "%s/%s" % [asset_root, filename]
		if piece_id == "" or asset_path == "":
			continue
		var texture: Texture2D = _load_texture_with_fallback(asset_path)
		if texture == null:
			continue
		frame["asset_path"] = asset_path
		_main_world_mountain_boundary_piece_meta_by_id[piece_id] = frame
		_main_world_mountain_boundary_texture_by_piece_id[piece_id] = texture
		loaded_count += 1

	print("[map-grid-theme] main-world mountain boundary assets loaded=%d" % loaded_count)


func _load_world_cell_footprint_manifest() -> void:
	_world_cell_footprint_rule_by_id = {}
	if not FileAccess.file_exists(THEME_WORLD_CELL_FOOTPRINT_MANIFEST_PATH):
		_install_default_world_cell_footprint_rules()
		push_warning("[map-grid-theme] world cell footprint manifest missing: %s" % THEME_WORLD_CELL_FOOTPRINT_MANIFEST_PATH)
		return

	var file := FileAccess.open(THEME_WORLD_CELL_FOOTPRINT_MANIFEST_PATH, FileAccess.READ)
	if file == null:
		_install_default_world_cell_footprint_rules()
		push_warning("[map-grid-theme] world cell footprint manifest open failed: %s" % THEME_WORLD_CELL_FOOTPRINT_MANIFEST_PATH)
		return

	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not (parsed is Dictionary):
		_install_default_world_cell_footprint_rules()
		push_warning("[map-grid-theme] world cell footprint manifest parse failed")
		return

	var manifest: Dictionary = parsed as Dictionary
	var footprints_variant: Variant = manifest.get("footprints", {})
	if footprints_variant is Dictionary:
		var footprints: Dictionary = footprints_variant as Dictionary
		for footprint_id_variant in footprints.keys():
			var rule_variant: Variant = footprints.get(footprint_id_variant, {})
			if rule_variant is Dictionary:
				var footprint_id: String = str(footprint_id_variant).strip_edges()
				if footprint_id != "":
					_world_cell_footprint_rule_by_id[footprint_id] = rule_variant

	if _world_cell_footprint_rule_by_id.is_empty():
		_install_default_world_cell_footprint_rules()

	print("[map-grid-theme] world cell footprints loaded=%d" % _world_cell_footprint_rule_by_id.size())


func _install_default_world_cell_footprint_rules() -> void:
	_world_cell_footprint_rule_by_id = {
		WORLD_CELL_FOOTPRINT_RESOURCE_1X1: {
			"id": WORLD_CELL_FOOTPRINT_RESOURCE_1X1,
			"role": "resource",
			"footprint_tiles": [1, 1],
			"cell_offsets": [[0, 0]],
			"draw_layer": "resource_cell",
		},
		WORLD_CELL_FOOTPRINT_PLAYER_CITY_3X3_INITIAL: {
			"id": WORLD_CELL_FOOTPRINT_PLAYER_CITY_3X3_INITIAL,
			"role": "player_city",
			"footprint_tiles": [3, 3],
			"cell_offsets": [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]],
			"draw_layer": "world_node",
			"render_mode": "layered_city",
			"base_frame": "world_cell_city_ground_base_v1.png",
			"base_alpha": 0.96,
			"base_scale": 1.0,
			"default_composite_id": "world_node_city_v1",
		},
		WORLD_CELL_FOOTPRINT_AI_CITY_3X3_INITIAL: {
			"id": WORLD_CELL_FOOTPRINT_AI_CITY_3X3_INITIAL,
			"role": "ai_city",
			"footprint_tiles": [3, 3],
			"cell_offsets": [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]],
			"draw_layer": "world_node",
			"render_mode": "layered_city",
			"base_frame": "world_cell_city_ground_base_v1.png",
			"base_alpha": 0.98,
			"base_scale": 1.0,
			"default_composite_id": "world_node_capital_v1",
		},
		WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L03_L04_3X3: {
			"id": WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L03_L04_3X3,
			"role": "system_city",
			"footprint_tiles": [3, 3],
			"cell_offsets": [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]],
			"draw_layer": "world_node",
			"render_mode": "layered_city",
			"base_frame": "world_cell_city_ground_base_v1.png",
			"base_alpha": 0.97,
			"base_scale": 1.0,
			"default_composite_id": "world_node_city_v1",
		},
		WORLD_CELL_FOOTPRINT_PASS_1X1: {
			"id": WORLD_CELL_FOOTPRINT_PASS_1X1,
			"role": "pass",
			"footprint_tiles": [1, 1],
			"cell_offsets": [[0, 0]],
			"draw_layer": "world_node",
			"render_mode": "payload_node",
			"base_frame": "world_cell_node_ground_base_v1.png",
			"base_alpha": 1.0,
			"base_scale": 1.0,
			"default_composite_id": "world_node_pass_sw_v1",
			"placement_policy": {
				"reserve_cells": true,
				"block_resource_generation": true,
				"block_resource_overlay": true,
				"block_resource_fill": true,
				"block_free_cell_base": true,
				"block_movement": false,
				"allow_selection_overlay_above": true,
				"allow_hover_overlay_above": true,
			},
		},
		WORLD_CELL_FOOTPRINT_FORT_1X1: {
			"id": WORLD_CELL_FOOTPRINT_FORT_1X1,
			"role": "fort",
			"footprint_tiles": [1, 1],
			"cell_offsets": [[0, 0]],
			"draw_layer": "world_node",
			"render_mode": "payload_node",
			"base_frame": "world_cell_node_ground_base_v1.png",
			"base_alpha": 1.0,
			"base_scale": 1.0,
			"default_composite_id": "world_node_fort_v1",
			"placement_policy": {
				"reserve_cells": true,
				"block_resource_generation": true,
				"block_resource_overlay": true,
				"block_resource_fill": true,
				"block_free_cell_base": true,
				"block_movement": false,
				"allow_selection_overlay_above": true,
				"allow_hover_overlay_above": true,
			},
		},
		WORLD_CELL_FOOTPRINT_DOCK_1X1: {
			"id": WORLD_CELL_FOOTPRINT_DOCK_1X1,
			"role": "dock",
			"footprint_tiles": [1, 1],
			"cell_offsets": [[0, 0]],
			"draw_layer": "world_node",
			"render_mode": "payload_node",
			"base_frame": "world_cell_node_ground_base_v1.png",
			"base_alpha": 1.0,
			"base_scale": 1.0,
			"default_composite_id": "world_node_dock_v1",
			"placement_policy": {
				"reserve_cells": true,
				"block_resource_generation": true,
				"block_resource_overlay": true,
				"block_resource_fill": true,
				"block_free_cell_base": true,
				"block_movement": false,
				"allow_selection_overlay_above": true,
				"allow_hover_overlay_above": true,
			},
		},
	}


func _get_world_cell_footprint_rule(footprint_id: String) -> Dictionary:
	var normalized_id: String = footprint_id.strip_edges()
	var rule_variant: Variant = _world_cell_footprint_rule_by_id.get(normalized_id, {})
	if rule_variant is Dictionary:
		return rule_variant as Dictionary
	return {}


func _resolve_world_cell_placement_policy(footprint_id: String) -> Dictionary:
	var rule: Dictionary = _get_world_cell_footprint_rule(footprint_id)
	var policy_variant: Variant = rule.get("placement_policy", {})
	if policy_variant is Dictionary:
		return policy_variant as Dictionary
	return {}


func _build_world_cell_placement_policy_audit(footprint_ids: Array) -> Dictionary:
	var audit := {}
	for footprint_variant in footprint_ids:
		var footprint_id: String = str(footprint_variant).strip_edges()
		if footprint_id == "":
			continue
		var rule: Dictionary = _get_world_cell_footprint_rule(footprint_id)
		var actions := {}
		for action_variant in WORLD_CELL_PLACEMENT_POLICY_ACTION_MAP.keys():
			var action: String = str(action_variant).strip_edges()
			actions[action] = _does_world_cell_placement_policy_apply(footprint_id, action)
		audit[footprint_id] = {
			"role": str(rule.get("role", "")).strip_edges(),
			"renderMode": str(rule.get("render_mode", "")).strip_edges(),
			"footprintTiles": rule.get("footprint_tiles", []),
			"placementPolicy": _resolve_world_cell_placement_policy(footprint_id).duplicate(true),
			"resolvedActions": actions,
		}
	return audit


func _resolve_world_cell_placement_policy_action_spec(action: String) -> Dictionary:
	var action_spec_variant: Variant = WORLD_CELL_PLACEMENT_POLICY_ACTION_MAP.get(action, {})
	if action_spec_variant is Dictionary:
		return action_spec_variant as Dictionary
	return {}


func _resolve_world_cell_placement_context_rule(context: String) -> Dictionary:
	var context_rule_variant: Variant = WORLD_CELL_PLACEMENT_CONTEXT_RULE_MAP.get(context.strip_edges().to_lower(), {})
	if context_rule_variant is Dictionary:
		return context_rule_variant as Dictionary
	return {}


func _does_world_cell_placement_policy_apply(footprint_id: String, action: String) -> bool:
	if footprint_id == "":
		return false
	var action_spec: Dictionary = _resolve_world_cell_placement_policy_action_spec(action)
	if action_spec.is_empty():
		return false
	var policy: Dictionary = _resolve_world_cell_placement_policy(footprint_id)
	var default_value: bool = bool(action_spec.get("default", false))
	if policy.is_empty():
		return default_value
	var policy_field: String = str(action_spec.get("field", "")).strip_edges()
	if policy_field != "" and policy.has(policy_field):
		return bool(policy.get(policy_field, default_value))
	var fallback_fields_variant: Variant = action_spec.get("fallback_fields", [])
	if fallback_fields_variant is Array:
		for fallback_field_variant in fallback_fields_variant as Array:
			var fallback_field: String = str(fallback_field_variant).strip_edges()
			if fallback_field != "" and policy.has(fallback_field):
				return bool(policy.get(fallback_field, default_value))
	return default_value


func _resolve_world_cell_placement_policy_source_footprint_id(tmx_key: String, source: String) -> String:
	match source:
		WORLD_CELL_PLACEMENT_POLICY_SOURCE_RESERVED_FOOTPRINT:
			return _resolve_reserved_world_cell_footprint_id(tmx_key)
		WORLD_CELL_PLACEMENT_POLICY_SOURCE_BACKEND_TILE:
			var backend_tile_variant: Variant = _backend_tile_by_tmx_key.get(tmx_key, {})
			if backend_tile_variant is Dictionary:
				return _resolve_world_cell_footprint_id_for_runtime_tile(backend_tile_variant as Dictionary)
	return ""


func _resolve_world_cell_placement_action_match_at_tmx_key(tmx_key: String, action: String) -> Dictionary:
	for source_variant in WORLD_CELL_PLACEMENT_POLICY_SOURCE_ORDER:
		var source: String = str(source_variant)
		var footprint_id: String = _resolve_world_cell_placement_policy_source_footprint_id(tmx_key, source)
		if _does_world_cell_placement_policy_apply(footprint_id, action):
			return {
				"tmxKey": tmx_key,
				"source": source,
				"footprintId": footprint_id,
				"action": action,
			}
	return {}


func _does_world_cell_placement_action_apply_at_tmx_key(tmx_key: String, action: String) -> bool:
	return not _resolve_world_cell_placement_action_match_at_tmx_key(tmx_key, action).is_empty()


func _does_world_cell_placement_context_apply_at_tmx_key(tmx_key: String, context: String) -> bool:
	return not _resolve_world_cell_placement_context_match_at_tmx_key(tmx_key, context).is_empty()


func _resolve_world_cell_placement_context_match_at_tmx_key(tmx_key: String, context: String, depth: int = 0, placement_context: Dictionary = {}) -> Dictionary:
	if depth > 4:
		return {}
	var context_rule: Dictionary = _resolve_world_cell_placement_context_rule(context)
	if context_rule.is_empty():
		return {}
	var action: String = str(context_rule.get("policy_action", "")).strip_edges()
	if action != "":
		var action_match: Dictionary = _resolve_world_cell_placement_action_match_at_tmx_key(tmx_key, action)
		if not action_match.is_empty():
			action_match["context"] = context
			action_match["reason"] = "policy_action"
			return action_match
	var block_rules_variant: Variant = context_rule.get("block_rules", [])
	if block_rules_variant is Array:
		for rule_variant in block_rules_variant as Array:
			if not (rule_variant is Dictionary):
				continue
			var rule_match: Dictionary = _resolve_world_cell_placement_context_block_rule_match(tmx_key, rule_variant as Dictionary, depth, placement_context)
			if not rule_match.is_empty():
				rule_match["context"] = context
				rule_match["reason"] = "block_rule"
				return rule_match
	return {}


func _does_world_cell_placement_context_block_rule_apply(tmx_key: String, rule: Dictionary) -> bool:
	return not _resolve_world_cell_placement_context_block_rule_match(tmx_key, rule).is_empty()


func _resolve_world_cell_placement_context_block_rule_match(tmx_key: String, rule: Dictionary, depth: int = 0, placement_context: Dictionary = {}) -> Dictionary:
	var rule_kind: String = str(rule.get("kind", "")).strip_edges().to_lower()
	match rule_kind:
		WORLD_CELL_PLACEMENT_BLOCK_RULE_RESERVED_FOOTPRINT:
			if _world_cell_reserved_footprint_tmx_keys.has(tmx_key):
				return {
					"tmxKey": tmx_key,
					"ruleKind": rule_kind,
					"footprintId": str(_world_cell_reserved_footprint_tmx_keys.get(tmx_key, "")).strip_edges(),
					"anchorKey": str(_world_cell_reserved_anchor_by_tmx_key.get(tmx_key, "")).strip_edges(),
				}
		WORLD_CELL_PLACEMENT_BLOCK_RULE_PREVIEW_TILE:
			if _world_cell_preview_tile_by_tmx_key.has(tmx_key):
				return {
					"tmxKey": tmx_key,
					"ruleKind": rule_kind,
				}
		WORLD_CELL_PLACEMENT_BLOCK_RULE_RESOURCE_OVERLAY:
			if _resource_overlay_by_tmx_key.has(tmx_key):
				return {
					"tmxKey": tmx_key,
					"ruleKind": rule_kind,
				}
		WORLD_CELL_PLACEMENT_BLOCK_RULE_BACKEND_TYPE:
			var backend_type_tile: Dictionary = _resolve_backend_tile_for_tmx_key(tmx_key)
			var backend_type: String = str(backend_type_tile.get("type", "")).strip_edges().to_lower()
			if _string_array_has(rule.get("values", []), backend_type):
				return {
					"tmxKey": tmx_key,
					"ruleKind": rule_kind,
					"value": backend_type,
					"values": rule.get("values", []),
				}
		WORLD_CELL_PLACEMENT_BLOCK_RULE_BACKEND_TERRAIN:
			var backend_terrain_tile: Dictionary = _resolve_backend_tile_for_tmx_key(tmx_key)
			var backend_terrain: String = str(backend_terrain_tile.get("terrain", "")).strip_edges().to_lower()
			if _string_array_has(rule.get("values", []), backend_terrain):
				var node_type: String = str(placement_context.get("nodeType", "")).strip_edges().to_lower()
				var allow_by_node_type_variant: Variant = rule.get("allow_by_node_type", {})
				if allow_by_node_type_variant is Dictionary:
					var allowed_terrains_variant: Variant = (allow_by_node_type_variant as Dictionary).get(node_type, [])
					if _string_array_has(allowed_terrains_variant, backend_terrain):
						return {}
				return {
					"tmxKey": tmx_key,
					"ruleKind": rule_kind,
					"value": backend_terrain,
					"values": rule.get("values", []),
					"nodeType": node_type,
				}
		WORLD_CELL_PLACEMENT_BLOCK_RULE_POLICY_CONTEXT:
			var nested_context: String = str(rule.get("context", "")).strip_edges()
			if nested_context == "":
				return {}
			var nested_match: Dictionary = _resolve_world_cell_placement_context_match_at_tmx_key(tmx_key, nested_context, depth + 1, placement_context)
			if not nested_match.is_empty():
				return {
					"tmxKey": tmx_key,
					"ruleKind": rule_kind,
					"nestedContext": nested_context,
					"nestedMatch": nested_match,
				}
	return {}


func _resolve_backend_tile_for_tmx_key(tmx_key: String) -> Dictionary:
	var backend_tile_variant: Variant = _backend_tile_by_tmx_key.get(tmx_key, {})
	if backend_tile_variant is Dictionary:
		return backend_tile_variant as Dictionary
	return {}


func _string_array_has(values_variant: Variant, target: String) -> bool:
	if not (values_variant is Array):
		return false
	var normalized_target: String = target.strip_edges().to_lower()
	for value_variant in values_variant as Array:
		if str(value_variant).strip_edges().to_lower() == normalized_target:
			return true
	return false


func _should_world_cell_block_empty_resource_fill(tmx_key: String) -> bool:
	return _does_world_cell_placement_context_apply_at_tmx_key(
		tmx_key,
		WORLD_CELL_PLACEMENT_CONTEXT_EMPTY_RESOURCE_FILL
	)


func _should_world_cell_block_free_cell_base(tmx_key: String) -> bool:
	return _does_world_cell_placement_context_apply_at_tmx_key(
		tmx_key,
		WORLD_CELL_PLACEMENT_CONTEXT_FREE_CELL_BASE
	)


func _should_world_cell_block_resource_overlay(tmx_key: String) -> bool:
	return _does_world_cell_placement_context_apply_at_tmx_key(
		tmx_key,
		WORLD_CELL_PLACEMENT_CONTEXT_RESOURCE_OVERLAY
	)


func _resolve_reserved_world_cell_footprint_id(tmx_key: String) -> String:
	return str(_world_cell_reserved_footprint_tmx_keys.get(tmx_key, "")).strip_edges()


func _resolve_world_cell_footprint_id_for_runtime_tile(tile_data: Dictionary) -> String:
	var explicit_footprint_id: String = str(tile_data.get("footprintId", "")).strip_edges()
	if explicit_footprint_id != "":
		return explicit_footprint_id
	var tile_type: String = str(tile_data.get("type", tile_data.get("tileType", ""))).strip_edges().to_lower()
	var strategy: String = _resolve_world_cell_runtime_strategy_for_type(tile_type)
	var strategy_footprint_id: String = _resolve_world_cell_strategy_footprint_id(strategy, tile_data, 1)
	if strategy_footprint_id != "":
		return strategy_footprint_id
	return _resolve_world_cell_node_dispatch_footprint_id(tile_type)


func _resolve_world_cell_footprint_tiles(footprint_id: String, fallback: Array) -> Array:
	var rule: Dictionary = _get_world_cell_footprint_rule(footprint_id)
	var tiles_variant: Variant = rule.get("footprint_tiles", fallback)
	if not (tiles_variant is Array):
		return fallback
	var tiles: Array = tiles_variant as Array
	if tiles.size() < 2:
		return fallback
	return [maxi(1, int(tiles[0])), maxi(1, int(tiles[1]))]


func _resolve_world_cell_footprint_offsets(footprint_id: String, fallback_tiles: Array) -> Array:
	var rule: Dictionary = _get_world_cell_footprint_rule(footprint_id)
	var offsets_variant: Variant = rule.get("cell_offsets", [])
	if offsets_variant is Array:
		var offsets: Array = offsets_variant as Array
		if not offsets.is_empty():
			return offsets
	return _build_centered_world_cell_footprint_offsets(_resolve_world_cell_footprint_tiles(footprint_id, fallback_tiles))


func _build_centered_world_cell_footprint_offsets(footprint_tiles: Array) -> Array:
	var width: int = 1
	var height: int = 1
	if footprint_tiles.size() >= 2:
		width = maxi(1, int(footprint_tiles[0]))
		height = maxi(1, int(footprint_tiles[1]))
	var half_x: int = int(floor(float(width) * 0.5))
	var half_y: int = int(floor(float(height) * 0.5))
	var offsets: Array = []
	for y in range(height):
		for x in range(width):
			offsets.append([x - half_x, y - half_y])
	return offsets


func _vector2i_from_json_array(value: Variant, fallback: Vector2i) -> Vector2i:
	if not (value is Array):
		return fallback
	var values: Array = value as Array
	if values.size() < 2:
		return fallback
	return Vector2i(int(values[0]), int(values[1]))


func _vector2_from_json_array(value: Variant, fallback: Vector2) -> Vector2:
	if not (value is Array):
		return fallback
	var values: Array = value as Array
	if values.size() < 2:
		return fallback
	return Vector2(float(values[0]), float(values[1]))


func _draw_world_resource_frame(frame_name: String, cell_center: Vector2, alpha: float = 1.0) -> bool:
	var normalized_name: String = frame_name.strip_edges()
	if normalized_name == "":
		return false
	var texture: Texture2D = _overlay_texture_by_frame.get(normalized_name, null) as Texture2D
	if texture == null:
		return false
	var raw_size: Vector2 = texture.get_size()
	if raw_size.y <= 0.0 or raw_size.x <= 0.0:
		return false

	var meta_variant: Variant = _world_resource_frame_meta_by_frame.get(normalized_name, {})
	var meta: Dictionary = {}
	if meta_variant is Dictionary:
		meta = meta_variant as Dictionary
	var effective_footprint: Vector2 = WORLD_RESOURCE_DEFAULT_EFFECTIVE_FOOTPRINT
	var effective_footprint_variant: Variant = meta.get("effectiveFootprint", effective_footprint)
	if effective_footprint_variant is Vector2:
		effective_footprint = effective_footprint_variant as Vector2
	var fit_footprint: Vector2 = WORLD_RESOURCE_DEFAULT_FIT_FOOTPRINT
	var fit_footprint_variant: Variant = meta.get("fitFootprint", fit_footprint)
	if fit_footprint_variant is Vector2:
		fit_footprint = fit_footprint_variant as Vector2
	var source_anchor: Vector2 = WORLD_RESOURCE_DEFAULT_SOURCE_ANCHOR
	var source_anchor_variant: Variant = meta.get("sourceAnchor", source_anchor)
	if source_anchor_variant is Vector2:
		source_anchor = source_anchor_variant as Vector2
	var visual_fit_scale: float = clampf(float(meta.get("visualFitScale", 1.0)), 0.05, 4.0)

	var tile_screen_width: float = max(1.0, _tmx_tile_width * _zoom)
	var tile_screen_height: float = max(1.0, _tmx_tile_height * _zoom)
	var scale: float = min(
		tile_screen_width / max(1.0, fit_footprint.x),
		tile_screen_height / max(1.0, fit_footprint.y)
	)
	scale = clampf(scale, 0.01, 8.0)
	var draw_size: Vector2 = raw_size * scale
	var destination_anchor: Vector2 = cell_center + Vector2(0.0, tile_screen_height * 0.5)
	var draw_rect := Rect2(destination_anchor - source_anchor * scale, draw_size)
	draw_texture_rect(texture, draw_rect, false, Color(1.0, 1.0, 1.0, clampf(alpha, 0.0, 1.0)))
	return true


func _draw_world_cell_composite(composite_id: String, cell_center: Vector2, alpha: float = 1.0) -> bool:
	var normalized_id: String = composite_id.strip_edges()
	if normalized_id == "":
		return false
	var composite_variant: Variant = _world_cell_composite_by_id.get(normalized_id, {})
	if not (composite_variant is Dictionary):
		return false
	var composite: Dictionary = composite_variant as Dictionary
	var layers_variant: Variant = composite.get("layers", [])
	if not (layers_variant is Array):
		return false

	var drawn: bool = false
	var layers: Array = layers_variant as Array
	var composite_fit_scale: float = _resolve_world_cell_composite_fit_scale(composite, normalized_id)
	for layer_variant in layers:
		if not (layer_variant is Dictionary):
			continue
		var layer: Dictionary = layer_variant as Dictionary
		var frame_name: String = str(layer.get("frame", "")).strip_edges()
		if frame_name == "":
			continue
		var layer_alpha: float = clampf(alpha * float(layer.get("alpha", 1.0)), 0.0, 1.0)
		var layer_scale: float = clampf(float(layer.get("scale", 1.0)) * composite_fit_scale, 0.05, 2.4)
		var layer_offset: Vector2 = _vector2_from_json_array(layer.get("offset", []), Vector2.ZERO) * _zoom
		if _draw_world_cell_frame(frame_name, cell_center + layer_offset, layer_alpha, layer_scale):
			drawn = true
	return drawn


func _resolve_world_cell_composite_fit_scale(composite: Dictionary, composite_id: String) -> float:
	var role: String = str(composite.get("role", "")).strip_edges().to_lower()
	var footprint_id: String = str(composite.get("footprint_contract_id", "")).strip_edges().to_lower()
	var normalized_composite_id: String = composite_id.strip_edges().to_lower()
	var is_city_prefab: bool = (
		role.find("city") >= 0
		or footprint_id.find("city") >= 0
		or normalized_composite_id.find("city") >= 0
		or normalized_composite_id.find("capital") >= 0
	)
	if not is_city_prefab:
		return 1.0
	if footprint_id.find("7x7") >= 0:
		return city_prefab_7x7_fit_scale
	if footprint_id.find("5x5") >= 0:
		return city_prefab_5x5_fit_scale
	if footprint_id.find("3x3") >= 0:
		return city_prefab_3x3_fit_scale
	return 1.0


func _draw_world_cell_layers(layers: Array, cell_center: Vector2, alpha: float = 1.0) -> bool:
	var drawn: bool = false
	for layer_variant in layers:
		if not (layer_variant is Dictionary):
			continue
		var layer: Dictionary = layer_variant as Dictionary
		var frame_name: String = str(layer.get("frame", "")).strip_edges()
		if frame_name == "":
			continue
		var layer_alpha: float = clampf(alpha * float(layer.get("alpha", 1.0)), 0.0, 1.0)
		var layer_scale: float = clampf(float(layer.get("scale", 1.0)), 0.05, 2.0)
		var layer_offset: Vector2 = _vector2_from_json_array(layer.get("offset", []), Vector2.ZERO) * _zoom
		if _draw_world_cell_frame(frame_name, cell_center + layer_offset, layer_alpha, layer_scale):
			drawn = true
	return drawn


func _draw_world_cell_payload_slots(payload_slots: Array, cell_center: Vector2, alpha: float = 1.0) -> bool:
	var drawn: bool = false
	for slot_variant in payload_slots:
		if not (slot_variant is Dictionary):
			continue
		var slot: Dictionary = slot_variant as Dictionary
		if not bool(slot.get("active", false)):
			continue
		var frame_name: String = str(slot.get("frame", "")).strip_edges()
		if frame_name == "":
			continue
		var cell_offset: Vector2i = _vector2i_from_json_array(slot.get("cell_offset", []), Vector2i.ZERO)
		var payload_offset: Vector2 = _resolve_world_cell_payload_cell_offset(cell_offset)
		payload_offset += _vector2_from_json_array(slot.get("offset", []), Vector2.ZERO) * _zoom
		var slot_alpha: float = clampf(alpha * float(slot.get("alpha", 1.0)), 0.0, 1.0)
		var slot_scale: float = clampf(float(slot.get("scale", 1.0)), 0.05, 2.0)
		if _draw_world_cell_frame(frame_name, cell_center + payload_offset, slot_alpha, slot_scale):
			drawn = true
	return drawn


func _resolve_world_cell_payload_cell_offset(cell_offset: Vector2i) -> Vector2:
	return Vector2(
		(float(cell_offset.x - cell_offset.y) * _tmx_tile_width * 0.5),
		(float(cell_offset.x + cell_offset.y) * _tmx_tile_height * 0.5)
	) * _zoom


func _draw_world_cell_frame(frame_name: String, cell_center: Vector2, alpha: float = 1.0, scale_multiplier: float = 1.0) -> bool:
	var normalized_name: String = frame_name.strip_edges()
	if normalized_name == "":
		return false
	var texture: Texture2D = _overlay_texture_by_frame.get(normalized_name, null) as Texture2D
	if texture == null:
		return false
	var raw_size: Vector2 = texture.get_size()
	if raw_size.y <= 0.0 or raw_size.x <= 0.0:
		return false

	var meta_variant: Variant = _world_cell_frame_meta_by_frame.get(normalized_name, {})
	var meta: Dictionary = {}
	if meta_variant is Dictionary:
		meta = meta_variant as Dictionary
	var fit_footprint: Vector2 = WORLD_CELL_DEFAULT_FIT_FOOTPRINT
	var fit_footprint_variant: Variant = meta.get("fitFootprint", fit_footprint)
	if fit_footprint_variant is Vector2:
		fit_footprint = fit_footprint_variant as Vector2
	var source_anchor: Vector2 = WORLD_CELL_DEFAULT_SOURCE_ANCHOR
	var source_anchor_variant: Variant = meta.get("sourceAnchor", source_anchor)
	if source_anchor_variant is Vector2:
		source_anchor = source_anchor_variant as Vector2
	var visual_fit_scale: float = clampf(float(meta.get("visualFitScale", 1.0)), 0.05, 4.0)

	var tile_screen_width: float = max(1.0, _tmx_tile_width * _zoom)
	var tile_screen_height: float = max(1.0, _tmx_tile_height * _zoom)
	var scale: float = min(
		tile_screen_width / max(1.0, fit_footprint.x),
		tile_screen_height / max(1.0, fit_footprint.y)
	)
	scale = clampf(scale * scale_multiplier * visual_fit_scale, 0.01, 8.0)
	var draw_size: Vector2 = raw_size * scale
	var destination_anchor: Vector2 = cell_center + Vector2(0.0, tile_screen_height * 0.5)
	var draw_rect := Rect2(destination_anchor - source_anchor * scale, draw_size)
	draw_texture_rect(texture, draw_rect, false, Color(1.0, 1.0, 1.0, clampf(alpha, 0.0, 1.0)))
	return true


func _resolve_home_city_flag_frame(faction_id: String, human_faction_id: String, city_level: int) -> String:
	return FactionVisualsScript.resolve_flag_frame(
		_overlay_texture_by_frame,
		faction_id,
		human_faction_id,
		city_level,
	)


func _load_overlay_manifest() -> void:
	_overlay_manifest = {}
	_overlay_texture_by_frame = {}
	if not FileAccess.file_exists(THEME_OVERLAY_MANIFEST_PATH):
		push_warning("[map-grid-theme] overlay manifest missing: %s" % THEME_OVERLAY_MANIFEST_PATH)
		return

	var manifest_file := FileAccess.open(THEME_OVERLAY_MANIFEST_PATH, FileAccess.READ)
	if manifest_file == null:
		push_warning("[map-grid-theme] overlay manifest open failed: err=%d" % FileAccess.get_open_error())
		return
	var parsed: Variant = JSON.parse_string(manifest_file.get_as_text())
	manifest_file.close()
	if not (parsed is Dictionary):
		push_warning("[map-grid-theme] overlay manifest parse failed: %s" % THEME_OVERLAY_MANIFEST_PATH)
		return
	_overlay_manifest = parsed as Dictionary
	var frame_table_variant: Variant = _overlay_manifest.get("frames", {})
	if not (frame_table_variant is Dictionary):
		push_warning("[map-grid-theme] overlay manifest missing frames dictionary")
		return

	var frame_table: Dictionary = frame_table_variant as Dictionary
	for frame_name_variant in frame_table.keys():
		var frame_name: String = str(frame_name_variant)
		var frame_meta_variant: Variant = frame_table.get(frame_name_variant, {})
		if not (frame_meta_variant is Dictionary):
			continue
		var frame_meta: Dictionary = frame_meta_variant as Dictionary
		var texture_path: String = str(frame_meta.get("texturePath", "")).strip_edges()
		if texture_path == "":
			continue
		var texture: Texture2D = _load_texture_with_fallback(texture_path)
		if texture != null:
			_overlay_texture_by_frame[frame_name] = texture

	print("[map-grid-theme] overlay frames loaded=%d" % _overlay_texture_by_frame.size())


func _world_map_manifest_loaded(manifest: Dictionary) -> bool:
	return not manifest.is_empty()


func _world_map_manifest_authority_status(manifest: Dictionary) -> String:
	var authority_variant: Variant = manifest.get("authority", {})
	if authority_variant is Dictionary:
		return str((authority_variant as Dictionary).get("status", "")).strip_edges()
	return ""


func _world_map_manifest_visible_layer_tokens_for(manifest_key: String) -> Array:
	var tokens_variant: Variant = _world_map_manifest_visible_layer_tokens.get(manifest_key, [])
	if tokens_variant is Array:
		return (tokens_variant as Array).duplicate(true)
	return []


func _world_map_manifest_visible_layer_tokens_all() -> Array:
	var tokens: Array = []
	for manifest_key in ["region_overlay", "route_overlay", "event_marker_overlay", "label_chrome_overlay"]:
		tokens.append_array(_world_map_manifest_visible_layer_tokens_for(manifest_key))
	return tokens


func _world_map_screenshot_acceptance_metric_fields() -> Array:
	return [
		"mapFirstComposition",
		"uiOcclusion",
		"regionTintReadable",
		"routeNetworkReadable",
		"cityPlateReadable",
		"eventMarkerUiConflict",
		"playerVisibleEngineeringLeakFree",
	]


func _world_map_screenshot_acceptance_reject_criteria() -> Dictionary:
	return {
		"mapFirstComposition": "reject_if_ui_cards_are_first_read_or_map_body_is_secondary",
		"uiOcclusion": "reject_if_left_or_right_chrome_blocks_core_region_route_city_marker_read",
		"regionTintReadable": "reject_if_state_or_faction_color_blocks_cannot_be_distinguished",
		"routeNetworkReadable": "reject_if_road_or_route_lines_are_not_visible_without_debug_summary",
		"cityPlateReadable": "reject_if_city_or_gate_label_chrome_is_missing_or_unreadable",
		"eventMarkerUiConflict": "reject_if_event_or_selection_markers_collide_with_side_panels",
		"playerVisibleEngineeringLeakFree": "reject_if_player_surface_shows_engineering_terms",
	}


func _world_map_screenshot_acceptance_contract() -> Dictionary:
	return {
		"status": "visual_quality_pending",
		"rendererVisibleRequired": true,
		"requiresGodotScreenshot": true,
		"metricFields": _world_map_screenshot_acceptance_metric_fields(),
		"rejectIf": _world_map_screenshot_acceptance_reject_criteria(),
	}


func _world_map_visible_layer_draw_path_evidence() -> Dictionary:
	return {
		"status": "renderer_visible_visual_quality_pending",
		"requiresGodotScreenshot": true,
		"regionOverlay": {
			"acceptanceRow": "A02",
			"visibleTokenField": "worldMapRegionOverlayVisibleLayerTokens",
			"visibleLayerTokens": _world_map_manifest_visible_layer_tokens_for("region_overlay"),
			"drawPath": "_draw_tianxia_yutu_administrative_drilldown_overlays",
			"drawCountFields": [
				"stateFillRatio2k",
				"tianxiaYutuStateBoundaryDrawCount",
				"tianxiaYutuRuntimeFactionColorEntryCount",
			],
			"rejectIfOnlySummaryProvesVisibility": true,
		},
		"routeOverlay": {
			"acceptanceRow": "A03",
			"visibleTokenField": "worldMapRouteVisibleLayerTokens",
			"visibleLayerTokens": _world_map_manifest_visible_layer_tokens_for("route_overlay"),
			"drawPath": "_draw_tianxia_yutu_frontline_markers",
			"drawCountFields": [
				"tianxiaYutuFrontlineDrawCount",
				"tianxiaYutuFrontlineArrowDrawCount",
				"tianxiaYutuAiActivityRouteIntentLineDrawCount",
				"tianxiaYutuAiActivityRouteIntentEndpointAnchorDrawCount",
			],
			"visibleRelationshipCue": "route_source_and_target_endpoint_anchors",
			"rejectIfOnlySummaryProvesVisibility": true,
		},
		"labelChrome": {
			"acceptanceRow": "A04",
			"visibleTokenField": "worldMapLabelChromeVisibleLayerTokens",
			"visibleLayerTokens": _world_map_manifest_visible_layer_tokens_for("label_chrome_overlay"),
			"drawPath": "_draw_world_map_label_plate",
			"drawCountFields": [
				"tianxiaYutuCityGateMarkerDrawCount",
				"tianxiaYutuMarkerLabelDrawCounts",
			],
			"requiredVisibleCopyExamples": [
				"我城3",
				"他城3",
			],
			"rejectIfOnlySummaryProvesVisibility": true,
		},
		"eventMarkerOverlay": {
			"acceptanceRow": "A05",
			"visibleTokenField": "worldMapEventMarkerVisibleLayerTokens",
			"visibleLayerTokens": _world_map_manifest_visible_layer_tokens_for("event_marker_overlay"),
			"drawPath": "_draw_tianxia_yutu_living_world_hotspots",
			"drawCountFields": [
				"tianxiaYutuAiActivityHotspotDrawCount",
				"tianxiaYutuAiActivityHotspotLabelDrawCount",
				"tianxiaYutuAiActivityHotspotHaloDrawCount",
				"tianxiaYutuAiActivityRouteIntentLineDrawCount",
			],
			"visibleRelationshipCue": "hotspot_halo_drawn_above_route_intent",
			"drawOrderCue": "route_intent_before_hotspot_halo",
			"rejectIfOnlySummaryProvesVisibility": true,
		},
	}


func _world_map_manifest_zoom_tiers(manifest: Dictionary) -> Array:
	var zoom_variant: Variant = manifest.get("zoomSemantics", {})
	if not (zoom_variant is Dictionary):
		return []
	var zoom_semantics: Dictionary = zoom_variant as Dictionary
	var tiers: Array = []
	for tier_variant in zoom_semantics.keys():
		tiers.append(str(tier_variant))
	return tiers


func _world_map_manifest_family_count(manifest: Dictionary, family_key: String) -> int:
	var families_variant: Variant = manifest.get(family_key, {})
	if families_variant is Dictionary:
		return (families_variant as Dictionary).size()
	return 0


func _world_map_color_from_variant(color_variant: Variant, fallback: Color) -> Color:
	var color_text: String = str(color_variant).strip_edges()
	if color_text.begins_with("#"):
		return Color.from_string(color_text, fallback)
	return fallback


func _world_map_zoom_semantic_tier() -> String:
	match _last_tianxia_yutu_density_level:
		"near":
			return "local"
		"city_gate", "region":
			return "region"
		_:
			return "overview"


func _world_map_region_palette_entry(entry_key: String) -> Dictionary:
	var palette_variant: Variant = _world_region_overlay_manifest.get("paletteTokens", {})
	if not (palette_variant is Dictionary):
		return {}
	var palette_tokens: Dictionary = palette_variant as Dictionary
	var entry_variant: Variant = palette_tokens.get(entry_key, {})
	return entry_variant as Dictionary if entry_variant is Dictionary else {}


func _world_map_overlay_family_entry(family_key: String) -> Dictionary:
	var family_variant: Variant = _world_region_overlay_manifest.get("overlayFamilies", {})
	if not (family_variant is Dictionary):
		return {}
	var families: Dictionary = family_variant as Dictionary
	var entry_variant: Variant = families.get(family_key, {})
	return entry_variant as Dictionary if entry_variant is Dictionary else {}


func _world_map_route_family_entry(family_key: String) -> Dictionary:
	var family_variant: Variant = _world_route_assets_manifest.get("routeFamilies", {})
	if not (family_variant is Dictionary):
		return {}
	var families: Dictionary = family_variant as Dictionary
	var entry_variant: Variant = families.get(family_key, {})
	return entry_variant as Dictionary if entry_variant is Dictionary else {}


func _world_map_label_family_entry(family_key: String) -> Dictionary:
	var family_variant: Variant = _world_label_chrome_manifest.get("labelFamilies", {})
	if not (family_variant is Dictionary):
		return {}
	var families: Dictionary = family_variant as Dictionary
	var entry_variant: Variant = families.get(family_key, {})
	return entry_variant as Dictionary if entry_variant is Dictionary else {}


func _world_map_event_selection_entry(state_key: String) -> Dictionary:
	var selection_variant: Variant = _world_event_marker_manifest.get("selectionStates", {})
	if not (selection_variant is Dictionary):
		return {}
	var selections: Dictionary = selection_variant as Dictionary
	var entry_variant: Variant = selections.get(state_key, {})
	return entry_variant as Dictionary if entry_variant is Dictionary else {}


func _world_map_width_px_from_entry(entry: Dictionary, tier: String, fallback: float) -> float:
	var width_variant: Variant = entry.get("widthPx", {})
	if width_variant is Dictionary:
		return float((width_variant as Dictionary).get(tier, fallback))
	return fallback


func _draw_world_map_label_plate(font: Font, baseline_pos: Vector2, label: String, font_size: int, family_key: String) -> void:
	if label == "":
		return
	var family: Dictionary = _world_map_label_family_entry(family_key)
	var font_scale: float = maxf(0.7, float(family.get("fontScale", 1.0)))
	var background_color: Color = _world_map_color_from_variant(
		family.get("backgroundColor", "#16110ED8"),
		Color(0.09, 0.07, 0.06, 0.84)
	)
	var border_color: Color = _world_map_color_from_variant(
		family.get("borderColor", "#B69154CC"),
		Color(0.72, 0.57, 0.33, 0.80)
	)
	var scaled_font_size: int = int(round(font_size * font_scale))
	var scaled_font_size_clamped: int = maxi(10, scaled_font_size)
	var text_size: Vector2 = font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1.0, scaled_font_size_clamped)
	var ascent: float = font.get_ascent(scaled_font_size_clamped)
	var height: float = font.get_height(scaled_font_size_clamped)
	var pad_x: float = 7.0 * font_scale
	var pad_y: float = 4.0 * font_scale
	var plate_rect := Rect2(
		baseline_pos + Vector2(-pad_x, -ascent - pad_y),
		Vector2(text_size.x + pad_x * 2.0, height + pad_y * 2.0)
	)
	draw_rect(plate_rect, background_color, true)
	draw_rect(plate_rect, border_color, false, 1.0, true)


func _load_zero_level_substrate_texture() -> void:
	_zero_level_substrate_texture = _load_texture_with_fallback(THEME_ZERO_LEVEL_SUBSTRATE_PATH)
	if _zero_level_substrate_texture == null:
		push_warning("[map-grid-theme] zero-level substrate texture missing: %s" % THEME_ZERO_LEVEL_SUBSTRATE_PATH)


func _draw_overlay_frame(frame_name: String, center: Vector2, target_height: float, alpha: float = 1.0, rotation: float = 0.0) -> bool:
	var normalized_name: String = frame_name.strip_edges()
	if normalized_name == "":
		return false
	var texture: Texture2D = _overlay_texture_by_frame.get(normalized_name, null) as Texture2D
	if texture == null:
		return false
	var raw_size: Vector2 = texture.get_size()
	if raw_size.y <= 0.0 or raw_size.x <= 0.0:
		return false
	var scale: float = clampf(target_height / raw_size.y, 0.01, 8.0)
	var draw_size: Vector2 = raw_size * scale
	var draw_rect := Rect2(center - draw_size * 0.5, draw_size)
	var clamped_alpha: float = clampf(alpha, 0.0, 1.0)
	if absf(rotation) <= 0.0001:
		draw_texture_rect(texture, draw_rect, false, Color(1.0, 1.0, 1.0, clamped_alpha))
		return true

	draw_set_transform(center, rotation, Vector2.ONE)
	draw_texture_rect(texture, Rect2(-draw_size * 0.5, draw_size), false, Color(1.0, 1.0, 1.0, clamped_alpha))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	return true


func _resolve_gid_tile_info(gid: int) -> Dictionary:
	for i in range(_tmx_tilesets.size() - 1, -1, -1):
		var tileset: Dictionary = _tmx_tilesets[i] as Dictionary
		var first_gid: int = int(tileset.get("firstGid", 0))
		if gid < first_gid:
			continue
		var local_id: int = gid - first_gid
		var columns: int = max(1, int(tileset.get("columns", 1)))
		var tile_w: float = float(tileset.get("tileWidth", _tmx_tile_width))
		var tile_h: float = float(tileset.get("tileHeight", _tmx_tile_height))
		var region_x: float = float(local_id % columns) * tile_w
		var region_y: float = float(local_id / columns) * tile_h
		return {
			"texture": tileset.get("texture", null),
			"region": Rect2(region_x, region_y, tile_w, tile_h),
			"tileWidth": tile_w,
			"tileHeight": tile_h,
		}
	return {}


func _load_theme_tmx() -> bool:
	_tmx_layers = []
	_tmx_tilesets = []
	var tmx_path: String = _normalize_theme_resource_path(THEME_MAP_TMX_PATH)
	if not FileAccess.file_exists(tmx_path):
		push_warning("[map-grid-theme] missing TMX: %s" % tmx_path)
		return false

	var parser := XMLParser.new()
	var open_err: Error = parser.open(tmx_path)
	if open_err != OK:
		push_warning("[map-grid-theme] TMX open failed: %s (err=%d)" % [tmx_path, int(open_err)])
		return false

	var tileset_refs: Array = []
	var current_layer: Dictionary = {}
	while true:
		var read_err: Error = parser.read()
		if read_err != OK:
			break
		if parser.get_node_type() != XMLParser.NODE_ELEMENT:
			continue
		var node_name: String = parser.get_node_name()
		if node_name == "map":
			_tmx_map_width = _xml_attr_int(parser, "width", 200)
			_tmx_map_height = _xml_attr_int(parser, "height", 200)
			_tmx_tile_width = float(_xml_attr_int(parser, "tilewidth", 200))
			_tmx_tile_height = float(_xml_attr_int(parser, "tileheight", 100))
		elif node_name == "tileset":
			tileset_refs.append(
				{
					"firstGid": _xml_attr_int(parser, "firstgid", 1),
					"source": _xml_attr(parser, "source", ""),
				}
			)
		elif node_name == "layer":
			current_layer = {
				"name": _xml_attr(parser, "name", "layer"),
				"width": _xml_attr_int(parser, "width", _tmx_map_width),
				"height": _xml_attr_int(parser, "height", _tmx_map_height),
			}
		elif node_name == "data" and not current_layer.is_empty():
			var encoding: String = _xml_attr(parser, "encoding", "")
			if encoding != "csv":
				continue
			var layer_total: int = int(current_layer.get("width", _tmx_map_width)) * int(current_layer.get("height", _tmx_map_height))
			var data_text: String = ""
			while true:
				var next_err: Error = parser.read()
				if next_err != OK:
					break
				if parser.get_node_type() == XMLParser.NODE_ELEMENT_END and parser.get_node_name() == "data":
					break
				if parser.get_node_type() == XMLParser.NODE_TEXT:
					data_text += parser.get_node_data()
			current_layer["data"] = _parse_csv_layer_data(data_text, layer_total)
			_tmx_layers.append(current_layer)
			current_layer = {}

	if _tmx_layers.is_empty() and _tmx_map_width > 0 and _tmx_map_height > 0:
		_tmx_layers.append({
			"name": "world_resource_grid",
			"width": _tmx_map_width,
			"height": _tmx_map_height,
			"data": PackedInt32Array(),
		})
	if _tmx_layers.is_empty():
		push_warning("[map-grid-theme] TMX parsed but missing layers")
		return false

	print(
		"[map-grid-theme] loaded tmx | map=%dx%d | tile=%.1fx%.1f | layers=%d | pureResourceGrid=true"
		% [_tmx_map_width, _tmx_map_height, _tmx_tile_width, _tmx_tile_height, _tmx_layers.size()]
	)
	return true


func _load_tsx_info(first_gid: int, source_name: String) -> Dictionary:
	if source_name == "":
		return {}
	var tsx_res_path: String = "%s/%s" % [THEME_WORLD_ROOT, source_name]
	var tsx_path: String = _normalize_theme_resource_path(tsx_res_path)
	if not FileAccess.file_exists(tsx_path):
		push_warning("[map-grid-theme] missing TSX: %s" % tsx_path)
		return {}

	var parser := XMLParser.new()
	var open_err: Error = parser.open(tsx_path)
	if open_err != OK:
		push_warning("[map-grid-theme] TSX open failed: %s (err=%d)" % [tsx_path, int(open_err)])
		return {}

	var tileset_name: String = source_name
	var tile_w: int = int(_tmx_tile_width)
	var tile_h: int = int(_tmx_tile_height)
	var columns: int = 1
	var image_source: String = ""

	while true:
		var read_err: Error = parser.read()
		if read_err != OK:
			break
		if parser.get_node_type() != XMLParser.NODE_ELEMENT:
			continue
		var node_name: String = parser.get_node_name()
		if node_name == "tileset":
			tileset_name = _xml_attr(parser, "name", tileset_name)
			tile_w = _xml_attr_int(parser, "tilewidth", tile_w)
			tile_h = _xml_attr_int(parser, "tileheight", tile_h)
			columns = max(1, _xml_attr_int(parser, "columns", columns))
		elif node_name == "image":
			image_source = _xml_attr(parser, "source", "")

	if image_source == "":
		push_warning("[map-grid-theme] TSX image source missing: %s" % source_name)
		return {}
	var texture_path: String = "%s/%s" % [THEME_WORLD_ROOT, image_source]
	var texture: Texture2D = _load_texture_with_fallback(texture_path)
	if texture == null:
		push_warning("[map-grid-theme] texture load failed: %s" % texture_path)
		return {}

	return {
		"name": tileset_name,
		"firstGid": first_gid,
		"columns": columns,
		"tileWidth": tile_w,
		"tileHeight": tile_h,
		"texture": texture,
		"imageSource": image_source,
	}


func _load_texture_with_fallback(res_path: String) -> Texture2D:
	var resource_path: String = _normalize_theme_resource_path(res_path)
	var normalized_path: String = resource_path.to_lower()
	if ResourceLoader.exists(resource_path):
		var loaded_resource: Resource = ResourceLoader.load(resource_path)
		if loaded_resource is Texture2D:
			return loaded_resource as Texture2D
	if normalized_path.ends_with(".png") or normalized_path.ends_with(".jpg") or normalized_path.ends_with(".jpeg") or normalized_path.ends_with(".webp"):
		return _load_image_texture(resource_path)

	var texture: Texture2D = load(resource_path) as Texture2D
	if texture != null:
		return texture
	return _load_image_texture(resource_path)


func _normalize_theme_resource_path(path_value: String) -> String:
	var normalized_path: String = path_value.strip_edges().replace("\\", "/")
	if normalized_path == "":
		return ""
	if normalized_path.begins_with("res://") or normalized_path.begins_with("user://"):
		return normalized_path
	if normalized_path.begins_with("assets/"):
		return "res://%s" % normalized_path
	return normalized_path


func _load_repo_or_res_texture(path_value: String) -> Texture2D:
	var normalized_path: String = path_value.strip_edges()
	if normalized_path == "":
		return null
	if normalized_path.begins_with("res://") or normalized_path.begins_with("assets/"):
		return _load_texture_with_fallback(normalized_path)
	var abs_path: String = ProjectSettings.globalize_path("res://../%s" % normalized_path)
	var image := Image.new()
	var image_err: Error = image.load(abs_path)
	if image_err != OK:
		push_warning("[map-grid] repo image load failed: %s (err=%d)" % [abs_path, int(image_err)])
		return null
	return ImageTexture.create_from_image(image)


func _load_image_texture(res_path: String) -> Texture2D:
	var resource_path: String = _normalize_theme_resource_path(res_path)
	if OS.has_feature("template"):
		push_warning("[map-grid-theme] image load fallback skipped in export: %s" % resource_path)
		return null
	var abs_path: String = ProjectSettings.globalize_path(resource_path)
	var image := Image.new()
	var image_err: Error = image.load(abs_path)
	if image_err != OK:
		push_warning("[map-grid-theme] image load fallback failed: %s (err=%d)" % [abs_path, int(image_err)])
		return null

	var fallback_texture: ImageTexture = ImageTexture.create_from_image(image)
	return fallback_texture


func _parse_csv_layer_data(text: String, expected_size: int) -> PackedInt32Array:
	var values := PackedInt32Array()
	if text.strip_edges() == "":
		return values
	var normalized := text.replace("\r", "").replace("\n", "")
	var raw_tokens: PackedStringArray = normalized.split(",")
	for token in raw_tokens:
		var trimmed: String = token.strip_edges()
		if trimmed == "":
			continue
		values.append(int(trimmed))
	if expected_size > 0 and values.size() < expected_size:
		var missing: int = expected_size - values.size()
		for _i in range(missing):
			values.append(0)
	return values


func _xml_attr(parser: XMLParser, key: String, fallback: String) -> String:
	for i in range(parser.get_attribute_count()):
		if parser.get_attribute_name(i) == key:
			return parser.get_attribute_value(i)
	return fallback


func _xml_attr_int(parser: XMLParser, key: String, fallback: int) -> int:
	var raw: String = _xml_attr(parser, key, "")
	if raw == "":
		return fallback
	return int(raw)


func _sort_tileset_by_first_gid(a: Dictionary, b: Dictionary) -> bool:
	return int(a.get("firstGid", 0)) < int(b.get("firstGid", 0))


func _is_pan_button(button_index: MouseButton) -> bool:
	return button_index == MOUSE_BUTTON_MIDDLE or button_index == MOUSE_BUTTON_RIGHT


func _reset_touch_drag_to_remaining_point() -> void:
	if _touch_points.size() == 1:
		var remaining_keys: Array = _touch_points.keys()
		_touch_drag_index = int(remaining_keys[0])
		_drag_last_mouse = _touch_points.get(_touch_drag_index, Vector2.ZERO) as Vector2
		_is_touch_dragging = true
	else:
		_touch_drag_index = -1
		_is_touch_dragging = false


func _touch_pinch_distance() -> float:
	var positions: Array = _touch_points.values()
	if positions.size() < 2:
		return 0.0
	var first: Vector2 = positions[0] as Vector2
	var second: Vector2 = positions[1] as Vector2
	return first.distance_to(second)


func _touch_pinch_center() -> Vector2:
	var positions: Array = _touch_points.values()
	if positions.size() < 2:
		return _drag_last_mouse
	var first: Vector2 = positions[0] as Vector2
	var second: Vector2 = positions[1] as Vector2
	return (first + second) * 0.5


func _record_main_map_zoom_pivot_metrics(interaction_kind: String, pivot_pos: Vector2, pivot_tmx_before: Vector2) -> void:
	var pivot_tmx_after: Vector2 = _screen_to_tmx(pivot_pos, _zoom)
	_last_pivot_cell_drift = pivot_tmx_before.distance_to(pivot_tmx_after)
	var snapped_before := Vector2i(int(round(pivot_tmx_before.x)), int(round(pivot_tmx_before.y)))
	var snapped_screen_after: Vector2 = _tmx_to_screen(snapped_before.x, snapped_before.y)
	var drift_px: float = pivot_pos.distance_to(snapped_screen_after)
	if interaction_kind == "pinch":
		_last_pinch_pivot_drift_px = drift_px
		_last_pinch_pivot_metric_recorded = true
	elif interaction_kind == "wheel":
		_last_wheel_pivot_drift_px = drift_px
		_last_wheel_pivot_metric_recorded = true


func _resolve_tianxia_yutu_focus_mask_target_rect(draw_rect: Rect2, mask_entry: Dictionary) -> Rect2:
	var target_rect := draw_rect
	var bounds_variant: Variant = mask_entry.get("bounds_px", {})
	if not (bounds_variant is Dictionary):
		return target_rect
	var bounds: Dictionary = bounds_variant as Dictionary
	var focus_layer_variant: Variant = _tianxia_yutu_overview_layer.get("admin_focus_mask_layer", {})
	var base_size: Array = []
	if focus_layer_variant is Dictionary:
		var focus_layer: Dictionary = focus_layer_variant as Dictionary
		var base_size_variant: Variant = focus_layer.get("base_size_px", [])
		if base_size_variant is Array:
			base_size = base_size_variant as Array
	if base_size.size() < 2:
		return target_rect
	var base_w := float(base_size[0])
	var base_h := float(base_size[1])
	var bounds_x := float(bounds.get("x", 0.0))
	var bounds_y := float(bounds.get("y", 0.0))
	var bounds_w := float(bounds.get("w", base_w))
	var bounds_h := float(bounds.get("h", base_h))
	if base_w <= 0.0 or base_h <= 0.0 or bounds_w <= 0.0 or bounds_h <= 0.0:
		return target_rect
	return Rect2(
		draw_rect.position + Vector2(bounds_x / base_w * draw_rect.size.x, bounds_y / base_h * draw_rect.size.y),
		Vector2(bounds_w / base_w * draw_rect.size.x, bounds_h / base_h * draw_rect.size.y)
	)


func _record_tianxia_yutu_zoom_pivot_metrics(interaction_kind: String, pivot_pos: Vector2, before_rect: Rect2) -> void:
	if before_rect.size.x <= 0.0 or before_rect.size.y <= 0.0:
		return
	var normalized_pivot := Vector2(
		clampf((pivot_pos.x - before_rect.position.x) / before_rect.size.x, 0.0, 1.0),
		clampf((pivot_pos.y - before_rect.position.y) / before_rect.size.y, 0.0, 1.0)
	)
	var after_rect: Rect2 = _resolve_tianxia_yutu_draw_rect_for_zoom(_tianxia_yutu_zoom, true)
	if after_rect.size.x <= 0.0 or after_rect.size.y <= 0.0:
		return
	var final_pivot := after_rect.position + Vector2(normalized_pivot.x * after_rect.size.x, normalized_pivot.y * after_rect.size.y)
	var pivot_cell_before := Vector2(
		normalized_pivot.x * float(MAIN_MAP_WORLD_WIDTH_CELLS - 1),
		normalized_pivot.y * float(MAIN_MAP_WORLD_HEIGHT_CELLS - 1)
	)
	var pivot_cell_after := Vector2(
		clampf((final_pivot.x - after_rect.position.x) / after_rect.size.x, 0.0, 1.0) * float(MAIN_MAP_WORLD_WIDTH_CELLS - 1),
		clampf((final_pivot.y - after_rect.position.y) / after_rect.size.y, 0.0, 1.0) * float(MAIN_MAP_WORLD_HEIGHT_CELLS - 1)
	)
	_last_tianxia_yutu_pivot_cell_drift = pivot_cell_before.distance_to(pivot_cell_after)
	var drift_px: float = pivot_pos.distance_to(final_pivot)
	if interaction_kind == "pinch":
		_last_tianxia_yutu_pinch_pivot_drift_px = drift_px
		_last_tianxia_yutu_pinch_pivot_metric_recorded = true
	elif interaction_kind == "wheel":
		_last_tianxia_yutu_wheel_pivot_drift_px = drift_px
		_last_tianxia_yutu_wheel_pivot_metric_recorded = true


func _compute_tianxia_yutu_state_fill_ratio_2k() -> float:
	var selected_state_id: String = _tianxia_yutu_selected_state_id()
	if selected_state_id == "":
		return 0.0
	var draw_rect: Rect2 = _resolve_tianxia_yutu_draw_rect_for_zoom(_tianxia_yutu_zoom, true)
	if draw_rect.size.x <= 0.0 or draw_rect.size.y <= 0.0:
		return 0.0
	var mask_entry := _resolve_tianxia_yutu_admin_focus_mask("state", selected_state_id, "")
	if mask_entry.is_empty():
		return 0.0
	var target_rect: Rect2 = _resolve_tianxia_yutu_focus_mask_target_rect(draw_rect, mask_entry)
	if target_rect.size.x <= 0.0 or target_rect.size.y <= 0.0:
		return 0.0
	var viewport_area: float = max(1.0, draw_rect.size.x * draw_rect.size.y)
	return clampf((target_rect.size.x * target_rect.size.y) / viewport_area, 0.0, 1.0)


func _apply_zoom(multiplier: float, pivot_pos: Vector2) -> void:
	var previous_zoom: float = _zoom
	_zoom = clampf(_zoom * multiplier, _effective_min_zoom(), max_zoom)
	if is_equal_approx(previous_zoom, _zoom):
		return
	var tmx_before: Vector2 = _screen_to_tmx(pivot_pos, previous_zoom)
	var tmx_after: Vector2 = _screen_to_tmx(pivot_pos, _zoom)
	var tmx_delta: Vector2 = tmx_before - tmx_after
	_pan_offset += Vector2(tmx_delta.x * _tmx_tile_width * 0.5 * _zoom, tmx_delta.y * _tmx_tile_height * 0.5 * _zoom)
	_record_main_map_zoom_pivot_metrics(_last_zoom_interaction_kind, pivot_pos, tmx_before)
	queue_redraw()
	_emit_view_transform_changed()
	_update_hover(pivot_pos)


func _apply_tianxia_yutu_zoom(multiplier: float, pivot_pos: Vector2) -> void:
	var previous_zoom: float = _tianxia_yutu_zoom
	_tianxia_yutu_zoom = clampf(_tianxia_yutu_zoom * multiplier, 0.82, 6.0)
	if is_equal_approx(previous_zoom, _tianxia_yutu_zoom):
		return
	var before_rect: Rect2 = _resolve_tianxia_yutu_draw_rect_for_zoom(previous_zoom, true)
	var after_rect: Rect2 = _resolve_tianxia_yutu_draw_rect_for_zoom(_tianxia_yutu_zoom, true)
	if before_rect.size.x > 0.0 and before_rect.size.y > 0.0 and after_rect.size.x > 0.0 and after_rect.size.y > 0.0:
		var normalized_pivot := Vector2(
			(pivot_pos.x - before_rect.position.x) / before_rect.size.x,
			(pivot_pos.y - before_rect.position.y) / before_rect.size.y
		)
		var after_pivot := after_rect.position + Vector2(normalized_pivot.x * after_rect.size.x, normalized_pivot.y * after_rect.size.y)
		_tianxia_yutu_pan_offset += pivot_pos - after_pivot
	_record_tianxia_yutu_zoom_pivot_metrics(_last_zoom_interaction_kind, pivot_pos, before_rect)
	queue_redraw()
	_emit_view_transform_changed()
	_update_hover(pivot_pos)


func adjust_tianxia_yutu_zoom(multiplier: float) -> Dictionary:
	_apply_tianxia_yutu_zoom(multiplier, get_viewport_rect().size * 0.5)
	return get_tianxia_yutu_view_state()


func reset_tianxia_yutu_view() -> Dictionary:
	_tianxia_yutu_pan_offset = Vector2.ZERO
	_tianxia_yutu_zoom = 1.0
	_tianxia_yutu_focus_marker_cell = Vector2i(-1, -1)
	_tianxia_yutu_focus_marker_label = ""
	_last_tianxia_yutu_selected_gate_summary = {}
	queue_redraw()
	_emit_view_transform_changed()
	_update_hover(get_viewport().get_mouse_position())
	return get_tianxia_yutu_view_state()


func focus_tianxia_yutu_cell(cell_x: int, cell_y: int, target_zoom: float = 3.2, marker_label: String = "我方位置") -> Dictionary:
	_tianxia_yutu_zoom = clampf(target_zoom, 0.82, 6.0)
	_tianxia_yutu_pan_offset = Vector2.ZERO
	_tianxia_yutu_focus_marker_cell = Vector2i(
		clampi(cell_x, 0, MAIN_MAP_WORLD_WIDTH_CELLS - 1),
		clampi(cell_y, 0, MAIN_MAP_WORLD_HEIGHT_CELLS - 1)
	)
	_tianxia_yutu_focus_marker_label = marker_label.strip_edges()
	var base_rect: Rect2 = _resolve_tianxia_yutu_draw_rect_for_zoom(_tianxia_yutu_zoom, false)
	if base_rect.size.x <= 0.0 or base_rect.size.y <= 0.0:
		return get_tianxia_yutu_view_state()
	var target_screen: Vector2 = _tianxia_yutu_world_cell_to_screen(cell_x, cell_y, base_rect)
	_tianxia_yutu_pan_offset = get_viewport_rect().size * 0.5 - target_screen
	_last_tianxia_yutu_state_fill_ratio_2k = _compute_tianxia_yutu_state_fill_ratio_2k()
	queue_redraw()
	_emit_view_transform_changed()
	_update_hover(get_viewport().get_mouse_position())
	return get_tianxia_yutu_view_state()


func get_tianxia_yutu_view_state() -> Dictionary:
	return {
		"schema": "tianxia_yutu_view_state_v0_1",
		"zoom": _tianxia_yutu_zoom,
		"panOffset": {"x": _tianxia_yutu_pan_offset.x, "y": _tianxia_yutu_pan_offset.y},
		"supportsMouseWheelZoom": true,
		"supportsMouseDragPan": true,
		"supportsTouchDragPan": true,
		"supportsTouchPinchZoom": true,
		"focusMarkerMaxRadiusPx": 24.0,
		"focusMarker": {
			"x": _tianxia_yutu_focus_marker_cell.x,
			"y": _tianxia_yutu_focus_marker_cell.y,
			"label": _tianxia_yutu_focus_marker_label,
		},
		"drawRect": {
			"x": _tianxia_yutu_last_draw_rect.position.x,
			"y": _tianxia_yutu_last_draw_rect.position.y,
			"w": _tianxia_yutu_last_draw_rect.size.x,
			"h": _tianxia_yutu_last_draw_rect.size.y,
		},
	}


func _apply_initial_zoom_from_env() -> bool:
	var raw_zoom: String = OS.get_environment("SLG_MAP_INITIAL_ZOOM").strip_edges()
	if raw_zoom == "":
		return false
	var parsed_zoom: float = raw_zoom.to_float()
	if parsed_zoom <= 0.0:
		push_warning("[map-grid-theme] ignored invalid SLG_MAP_INITIAL_ZOOM=%s" % raw_zoom)
		return false
	_zoom = clampf(parsed_zoom, _effective_min_zoom(), max_zoom)
	return true


func _effective_min_zoom() -> float:
	var base_min_zoom: float = min(max_zoom, max(min_zoom, cell_layer_min_zoom))
	if _resolve_world_cell_preview_variant() == "stages":
		return base_min_zoom
	if camera_viewport_max_visible_cells <= 0 or _tmx_map_width <= 0 or _tmx_map_height <= 0:
		return base_min_zoom
	if _visible_square_cell_count_for_zoom(base_min_zoom) <= camera_viewport_max_visible_cells:
		return base_min_zoom
	var low_zoom: float = base_min_zoom
	var high_zoom: float = max_zoom
	for _i in range(14):
		var mid_zoom: float = (low_zoom + high_zoom) * 0.5
		if _visible_square_cell_count_for_zoom(mid_zoom) <= camera_viewport_max_visible_cells:
			high_zoom = mid_zoom
		else:
			low_zoom = mid_zoom
	return clampf(high_zoom, base_min_zoom, max_zoom)


func _visible_square_cell_count_for_zoom(target_zoom: float) -> int:
	var visible_bounds: Dictionary = _compute_visible_tmx_bounds_with_margin(0, target_zoom)
	if not bool(visible_bounds.get("valid", false)):
		return 0
	var visible_width: int = maxi(1, int(visible_bounds.get("endX", -1)) - int(visible_bounds.get("startX", 0)) + 1)
	var visible_height: int = maxi(1, int(visible_bounds.get("endY", -1)) - int(visible_bounds.get("startY", 0)) + 1)
	return maxi(visible_width, visible_height)


func _update_hover(mouse_screen_pos: Vector2) -> void:
	var previous_hover_key: String = _hover_tile_key
	var hovered: Dictionary = _screen_to_backend_tile_data(mouse_screen_pos)
	if hovered.is_empty():
		_hover_tile = {}
		_hover_tile_key = ""
	else:
		_hover_tile = hovered
		var hover_marker_id: String = str(hovered.get("snapTargetId", "")).strip_edges()
		_hover_tile_key = "%s:%s" % [_coord_key(int(hovered.get("x", 0)), int(hovered.get("y", 0))), hover_marker_id]
	_update_hover_label()
	if previous_hover_key != _hover_tile_key:
		queue_redraw()


func _select_tile_at(mouse_screen_pos: Vector2) -> void:
	var selected: Dictionary = _screen_to_backend_tile_data(mouse_screen_pos)
	if selected.is_empty():
		if _selected_tile_key != "":
			_selected_tile = {}
			_selected_tile_key = ""
			_last_tianxia_yutu_selected_gate_summary = {}
			if not _selected_main_map_cell_action_context.is_empty():
				_selected_main_map_cell_action_context = {}
				main_map_cell_selected.emit({})
			queue_redraw()
		return
	_selected_tile = selected
	var selected_coord_key: String = _coord_key(int(selected.get("x", 0)), int(selected.get("y", 0)))
	var selected_marker_id: String = str(selected.get("snapTargetId", "")).strip_edges()
	_selected_tile_key = "%s:%s" % [selected_coord_key, selected_marker_id] if selected_marker_id != "" else selected_coord_key
	if _main_map_view_mode == MAIN_MAP_VIEW_MODE_TIANXIA_YUTU:
		_tianxia_yutu_focus_marker_cell = Vector2i(int(selected.get("mainMapCellX", selected.get("x", -1))), int(selected.get("mainMapCellY", selected.get("y", -1))))
		_tianxia_yutu_focus_marker_label = str(selected.get("snapTargetNavigationLabel", selected.get("snapTargetLabel", "选定坐标"))).strip_edges() if bool(selected.get("tianxiaYutuMarkerSnap", false)) else "选定坐标"
		if _tianxia_yutu_focus_marker_label == "":
			_tianxia_yutu_focus_marker_label = "选定坐标"
		_last_tianxia_yutu_selected_gate_summary = _build_tianxia_yutu_selected_gate_summary(selected)
	else:
		_last_tianxia_yutu_selected_gate_summary = {}
	_emit_player_home_city_node_clicked_if_applicable(selected)
	var main_map_context: Dictionary = _build_main_map_cell_action_context(selected)
	_selected_main_map_cell_action_context = main_map_context.duplicate(true)
	if not main_map_context.is_empty():
		main_map_cell_selected.emit(main_map_context.duplicate(true))
	queue_redraw()


func get_selected_main_map_cell_action_context() -> Dictionary:
	if _selected_tile.is_empty():
		return _selected_main_map_cell_action_context.duplicate(true)
	var refreshed_context: Dictionary = _build_main_map_cell_action_context(_selected_tile)
	if not refreshed_context.is_empty():
		_selected_main_map_cell_action_context = refreshed_context.duplicate(true)
	return _selected_main_map_cell_action_context.duplicate(true)


func build_click_priority_matrix_samples() -> Dictionary:
	var required_samples := [
		"player_city_3x3_initial",
		"ai_city_3x3_initial",
		"system_city_l05_l06_5x5",
		"pass_1x1",
		"dock_1x1",
		"fort_1x1",
		"mountain_barrier_1x1",
	]
	var protected_samples: Array = []
	var seen: Dictionary = {}
	var raw_formal_samples: Variant = _click_priority_formal_sample_layer.get("samples", [])
	if raw_formal_samples is Array:
		for formal_sample_variant in raw_formal_samples as Array:
			if not (formal_sample_variant is Dictionary):
				continue
			var formal_sample: Dictionary = formal_sample_variant as Dictionary
			var sample_id := str(formal_sample.get("sample_id", "")).strip_edges()
			if sample_id == "" or seen.has(sample_id):
				continue
			var sample := _build_click_priority_matrix_formal_layer_sample(formal_sample)
			if sample.is_empty():
				continue
			seen[sample_id] = true
			protected_samples.append(sample)
	for anchor_key_variant in _world_cell_node_anchor_by_tmx_key.keys():
		var anchor_key := str(anchor_key_variant).strip_edges()
		var anchor_variant: Variant = _world_cell_node_anchor_by_tmx_key.get(anchor_key, {})
		if not (anchor_variant is Dictionary):
			continue
		var anchor: Dictionary = anchor_variant as Dictionary
		var footprint_id := str(anchor.get("footprintId", "")).strip_edges()
		var sample_id := _resolve_click_priority_matrix_sample_id(anchor, footprint_id)
		if sample_id == "" or seen.has(sample_id):
			continue
		seen[sample_id] = true
		protected_samples.append(_build_click_priority_matrix_anchor_sample(sample_id, anchor, footprint_id))
	for tmx_key_variant in _world_cell_reserved_footprint_tmx_keys.keys():
		var tmx_key := str(tmx_key_variant).strip_edges()
		var footprint_id := str(_world_cell_reserved_footprint_tmx_keys.get(tmx_key, "")).strip_edges()
		var sample_id := _resolve_click_priority_matrix_sample_id({}, footprint_id)
		if sample_id == "" or seen.has(sample_id):
			continue
		var parts := tmx_key.split(":")
		if parts.size() != 2:
			continue
		var anchor := {
			"tmxX": int(parts[0]),
			"tmxY": int(parts[1]),
			"footprintId": footprint_id,
			"type": _resolve_world_cell_runtime_type({}, footprint_id),
		}
		seen[sample_id] = true
		protected_samples.append(_build_click_priority_matrix_anchor_sample(sample_id, anchor, footprint_id))
	var unavailable_samples: Array = []
	for sample_id_variant in required_samples:
		var sample_id := str(sample_id_variant).strip_edges()
		if not seen.has(sample_id):
			unavailable_samples.append({
				"sampleId": sample_id,
				"reason": "not_present_in_current_formal_map_layout",
			})
	return {
		"protectedSamples": protected_samples,
		"unavailableProtectedSamples": unavailable_samples,
		"protectedSampleCount": protected_samples.size(),
		"requiredProtectedSamples": required_samples,
	}


func _build_click_priority_matrix_formal_layer_sample(formal_sample: Dictionary) -> Dictionary:
	var cell: Dictionary = _dictionary_from_variant(formal_sample.get("cell_1km", {}))
	var tmx: Dictionary = _dictionary_from_variant(formal_sample.get("tmx", {}))
	var tmx_x := int(tmx.get("x", cell.get("x", -1)))
	var tmx_y := int(tmx.get("y", cell.get("y", -1)))
	var sample_id := str(formal_sample.get("sample_id", "")).strip_edges()
	var footprint_id := str(formal_sample.get("footprint_id", "")).strip_edges()
	if sample_id == "" or footprint_id == "" or tmx_x < 0 or tmx_y < 0:
		return {}
	return {
		"sampleId": sample_id,
		"expectedKind": "protected_footprint",
		"tmxX": tmx_x,
		"tmxY": tmx_y,
		"cellX": int(cell.get("x", tmx_x)),
		"cellY": int(cell.get("y", tmx_y)),
		"tileId": str(formal_sample.get("tile_id", formal_sample.get("tileId", ""))).strip_edges(),
		"tileType": str(formal_sample.get("type", "")).strip_edges(),
		"footprintId": footprint_id,
		"formalObjectId": str(formal_sample.get("formal_object_id", formal_sample.get("formalObjectId", ""))).strip_edges(),
		"sampleSource": str(formal_sample.get("source", "")).strip_edges(),
	}


func _resolve_click_priority_matrix_sample_id(anchor: Dictionary, footprint_id: String) -> String:
	match footprint_id:
		WORLD_CELL_FOOTPRINT_PLAYER_CITY_3X3_INITIAL:
			return "player_city_3x3_initial"
		WORLD_CELL_FOOTPRINT_AI_CITY_3X3_INITIAL:
			return "ai_city_3x3_initial"
		WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L05_L06_5X5:
			return "system_city_l05_l06_5x5"
		WORLD_CELL_FOOTPRINT_PASS_1X1:
			return "pass_1x1"
		WORLD_CELL_FOOTPRINT_DOCK_1X1:
			return "dock_1x1"
		WORLD_CELL_FOOTPRINT_FORT_1X1:
			return "fort_1x1"
		WORLD_CELL_FOOTPRINT_MOUNTAIN_BARRIER_1X1:
			return "mountain_barrier_1x1"
	var node_type := str(anchor.get("type", "")).strip_edges().to_lower()
	match node_type:
		"player_city":
			return "player_city_3x3_initial"
		"ai_city":
			return "ai_city_3x3_initial"
		"system_city":
			return "system_city_l05_l06_5x5"
		"pass":
			return "pass_1x1"
		"dock":
			return "dock_1x1"
		"fort":
			return "fort_1x1"
		"mountain_barrier":
			return "mountain_barrier_1x1"
	return ""


func _build_click_priority_matrix_anchor_sample(sample_id: String, anchor: Dictionary, footprint_id: String) -> Dictionary:
	var tmx_x := int(anchor.get("tmxX", -1))
	var tmx_y := int(anchor.get("tmxY", -1))
	var source_marker := str(anchor.get("source", "")).strip_edges()
	if source_marker == "":
		source_marker = str(anchor.get("anchorDeltaSource", "")).strip_edges()
	if source_marker == "":
		source_marker = "world_cell_reserved_footprint_projection"
	var formal_object_id := str(anchor.get("id", anchor.get("tileId", ""))).strip_edges()
	if formal_object_id == "":
		formal_object_id = "%s:%d:%d" % [footprint_id, tmx_x, tmx_y]
	return {
		"sampleId": sample_id,
		"expectedKind": "protected_footprint",
		"tmxX": tmx_x,
		"tmxY": tmx_y,
		"cellX": int(anchor.get("backendX", anchor.get("x", _map_tmx_to_backend_axis(float(tmx_x), _backend_x_min, _backend_x_max, _main_map_runtime_tmx_width())))),
		"cellY": int(anchor.get("backendY", anchor.get("y", _map_tmx_to_backend_axis(float(tmx_y), _backend_y_min, _backend_y_max, _main_map_runtime_tmx_height())))),
		"tileId": str(anchor.get("tileId", anchor.get("id", ""))).strip_edges(),
		"tileType": str(anchor.get("type", "")).strip_edges(),
		"footprintId": footprint_id,
		"formalObjectId": formal_object_id,
		"sampleSource": source_marker,
	}


func focus_and_select_main_map_tmx_for_action(tmx_x: int, tmx_y: int) -> Dictionary:
	if tmx_x < 0 or tmx_y < 0:
		return {}
	var cell_x := _main_map_runtime_tmx_axis_to_cell(float(tmx_x), _main_map_runtime_tmx_width(), MAIN_MAP_WORLD_WIDTH_CELLS)
	var cell_y := _main_map_runtime_tmx_axis_to_cell(float(tmx_y), _main_map_runtime_tmx_height(), MAIN_MAP_WORLD_HEIGHT_CELLS)
	if not _focus_main_map_cell(cell_x, cell_y):
		return {}
	var direct_cell_tile: Dictionary = _build_reserved_world_cell_hit_tile(tmx_x, tmx_y, {})
	if direct_cell_tile.is_empty():
		direct_cell_tile = _build_click_priority_formal_sample_hit_tile(tmx_x, tmx_y)
	if direct_cell_tile.is_empty():
		direct_cell_tile = _build_main_map_cell_hit_tile(tmx_x, tmx_y)
	if direct_cell_tile.is_empty():
		return {}
	_selected_tile = direct_cell_tile
	_selected_tile_key = _coord_key(int(direct_cell_tile.get("x", cell_x)), int(direct_cell_tile.get("y", cell_y)))
	var main_map_context: Dictionary = _build_main_map_cell_action_context(direct_cell_tile)
	_selected_main_map_cell_action_context = main_map_context.duplicate(true)
	if not main_map_context.is_empty():
		main_map_cell_selected.emit(main_map_context.duplicate(true))
	queue_redraw()
	return get_selected_main_map_cell_action_context()


func focus_and_select_main_map_cell_for_action(cell_x: int, cell_y: int) -> Dictionary:
	if not _focus_main_map_cell(cell_x, cell_y):
		return {}
	var runtime_width: int = _main_map_runtime_tmx_width()
	var runtime_height: int = _main_map_runtime_tmx_height()
	var tmx_x: int = _main_map_cell_axis_to_runtime_tmx(cell_x, runtime_width, MAIN_MAP_WORLD_WIDTH_CELLS)
	var tmx_y: int = _main_map_cell_axis_to_runtime_tmx(cell_y, runtime_height, MAIN_MAP_WORLD_HEIGHT_CELLS)
	var viewport_center: Vector2 = get_viewport_rect().size * 0.5
	var direct_key := _coord_key(cell_x, cell_y)
	var direct_cell_tile: Dictionary = {}
	var reserved_hit_tile: Dictionary = _build_reserved_world_cell_hit_tile(tmx_x, tmx_y, {})
	if not reserved_hit_tile.is_empty():
		direct_cell_tile = reserved_hit_tile
	elif _tile_by_coord.has(direct_key):
		direct_cell_tile = (_tile_by_coord[direct_key] as Dictionary).duplicate(true)
	if direct_cell_tile.is_empty():
		var world_map: Dictionary = WorldStore.world.get("map", {}) as Dictionary
		var world_tiles_variant: Variant = world_map.get("tiles", [])
		if world_tiles_variant is Array:
			for tile_variant in world_tiles_variant as Array:
				if not (tile_variant is Dictionary):
					continue
				var world_tile: Dictionary = tile_variant as Dictionary
				if int(world_tile.get("x", -1)) == cell_x and int(world_tile.get("y", -1)) == cell_y:
					direct_cell_tile = world_tile.duplicate(true)
					direct_cell_tile["tmxX"] = tmx_x
					direct_cell_tile["tmxY"] = tmx_y
					break
	if direct_cell_tile.is_empty():
		direct_cell_tile = _build_main_map_cell_hit_tile(tmx_x, tmx_y)
	if not direct_cell_tile.is_empty():
		_selected_tile = direct_cell_tile
		_selected_tile_key = _coord_key(int(direct_cell_tile.get("x", 0)), int(direct_cell_tile.get("y", 0)))
		var main_map_context: Dictionary = _build_main_map_cell_action_context(direct_cell_tile)
		_selected_main_map_cell_action_context = main_map_context.duplicate(true)
		if not main_map_context.is_empty():
			main_map_cell_selected.emit(main_map_context.duplicate(true))
		queue_redraw()
	else:
		_select_tile_at(viewport_center)
	return get_selected_main_map_cell_action_context()


func select_main_map_backend_tile_for_action(tile_data: Dictionary) -> Dictionary:
	if tile_data.is_empty():
		return {}
	var selected := tile_data.duplicate(true)
	var runtime_width: int = _main_map_runtime_tmx_width()
	var runtime_height: int = _main_map_runtime_tmx_height()
	var cell_x := int(selected.get("x", selected.get("backendX", -1)))
	var cell_y := int(selected.get("y", selected.get("backendY", -1)))
	if cell_x < 0 or cell_y < 0:
		return {}
	selected["tmxX"] = _main_map_cell_axis_to_runtime_tmx(cell_x, runtime_width, MAIN_MAP_WORLD_WIDTH_CELLS)
	selected["tmxY"] = _main_map_cell_axis_to_runtime_tmx(cell_y, runtime_height, MAIN_MAP_WORLD_HEIGHT_CELLS)
	var protected_hit_tile: Dictionary = _build_reserved_world_cell_hit_tile(int(selected.get("tmxX", -1)), int(selected.get("tmxY", -1)), selected)
	if not protected_hit_tile.is_empty():
		selected = protected_hit_tile
	_selected_tile = selected
	_selected_tile_key = _coord_key(cell_x, cell_y)
	var main_map_context: Dictionary = _build_main_map_cell_action_context(selected)
	_selected_main_map_cell_action_context = main_map_context.duplicate(true)
	if not main_map_context.is_empty():
		main_map_cell_selected.emit(main_map_context.duplicate(true))
	queue_redraw()
	return get_selected_main_map_cell_action_context()


func focus_main_city_asset_entry_camera_push(cell_x: int, cell_y: int, target_zoom: float = 2.04, duration_sec: float = 0.34) -> Dictionary:
	var before_state := get_view_transform_state()
	var resolved_zoom := clampf(target_zoom, _effective_min_zoom(), max_zoom)
	var before_zoom := _zoom
	var before_pan_offset := _pan_offset
	_zoom = resolved_zoom
	_pan_offset = before_pan_offset
	var focus_ok := _focus_main_map_cell(cell_x, cell_y, false)
	var target_pan_offset := _pan_offset
	_zoom = before_zoom
	_pan_offset = before_pan_offset
	var selected_context := {}
	if focus_ok:
		selected_context = focus_and_select_main_map_cell_for_action(cell_x, cell_y)
		_zoom = before_zoom
		_pan_offset = before_pan_offset
		_play_main_city_asset_camera_ease(before_zoom, resolved_zoom, before_pan_offset, target_pan_offset, duration_sec)
	_emit_view_transform_changed()
	return {
		"ok": focus_ok,
		"token": "main_city_world_asset_enter_camera_push_v1",
		"cameraEaseToken": "main_city_world_asset_camera_ease_v2",
		"cameraPushMode": "focus_cell_then_zoom_main_city_asset_eased_v2",
		"easing": "TRANS_SINE/EASE_IN_OUT",
		"durationSec": duration_sec,
		"targetCell": {"x": cell_x, "y": cell_y},
		"targetZoom": resolved_zoom,
		"beforeZoom": float(before_state.get("zoom", 0.0)),
		"afterZoom": resolved_zoom,
		"plannedFinalPanOffset": {"x": target_pan_offset.x, "y": target_pan_offset.y},
		"selectedContext": selected_context,
	}


func _play_main_city_asset_camera_ease(before_zoom: float, target_zoom: float, before_pan_offset: Vector2, target_pan_offset: Vector2, duration_sec: float) -> void:
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_SINE)
	tween.set_ease(Tween.EASE_IN_OUT)
	tween.tween_method(
		func(progress: float) -> void:
			_zoom = lerpf(before_zoom, target_zoom, progress)
			_pan_offset = before_pan_offset.lerp(target_pan_offset, progress)
			queue_redraw()
			_emit_view_transform_changed(),
		0.0,
		1.0,
		maxf(0.08, duration_sec)
	)


func _emit_player_home_city_node_clicked_if_applicable(tile_data: Dictionary) -> void:
	var context: Dictionary = _resolve_player_home_city_click_context(tile_data)
	if context.is_empty():
		return
	player_home_city_node_clicked.emit(context)


func _resolve_player_home_city_click_context(tile_data: Dictionary) -> Dictionary:
	if _main_map_view_mode == MAIN_MAP_VIEW_MODE_TIANXIA_YUTU:
		return {}
	if tile_data.is_empty():
		return {}
	var formal_context: Dictionary = _resolve_formal_player_home_city_click_context(tile_data)
	if not formal_context.is_empty():
		return formal_context
	if _home_city_overlay_entries.is_empty():
		return {}
	for entry_variant in _home_city_overlay_entries:
		if not (entry_variant is Dictionary):
			continue
		var entry: Dictionary = entry_variant as Dictionary
		if not bool(entry.get("isHuman", false)):
			continue
		var home_tile_id: String = str(entry.get("tileId", "")).strip_edges()
		if home_tile_id == "":
			continue
		if not _does_home_city_entry_match_click_tile(entry, tile_data):
			continue
		return {
			"tileId": home_tile_id,
			"tileX": int(entry.get("tileX", int(tile_data.get("x", -1)))),
			"tileY": int(entry.get("tileY", int(tile_data.get("y", -1)))),
			"tmxX": int(entry.get("tmxX", int(tile_data.get("tmxX", -1)))),
			"tmxY": int(entry.get("tmxY", int(tile_data.get("tmxY", -1)))),
			"title": str(entry.get("title", home_tile_id)).strip_edges(),
			"factionId": str(entry.get("factionId", "")).strip_edges(),
			"cityLevel": int(entry.get("cityLevel", 1)),
		}
	return {}


func _resolve_formal_player_home_city_click_context(tile_data: Dictionary) -> Dictionary:
	var tile_type: String = str(tile_data.get("type", tile_data.get("tileType", ""))).strip_edges().to_lower()
	var footprint_id: String = str(tile_data.get("footprintId", tile_data.get("footprint_id", ""))).strip_edges()
	if tile_type != "player_city" and footprint_id != WORLD_CELL_FOOTPRINT_PLAYER_CITY_3X3_INITIAL:
		return {}
	return {
		"tileId": str(tile_data.get("sourceTileId", tile_data.get("tileId", tile_data.get("id", "")))).strip_edges(),
		"tileX": int(tile_data.get("backendX", tile_data.get("x", -1))),
		"tileY": int(tile_data.get("backendY", tile_data.get("y", -1))),
		"tmxX": int(tile_data.get("anchorTmxX", tile_data.get("tmxX", -1))),
		"tmxY": int(tile_data.get("anchorTmxY", tile_data.get("tmxY", -1))),
		"title": str(tile_data.get("title", tile_data.get("name", tile_data.get("tileId", "")))).strip_edges(),
		"factionId": str(tile_data.get("factionId", tile_data.get("owner", "player"))).strip_edges(),
		"cityLevel": int(tile_data.get("cityLevel", 1)),
		"source": "formal_main_world_anchor_delta",
	}


func _does_home_city_entry_match_click_tile(entry: Dictionary, tile_data: Dictionary) -> bool:
	var home_tile_id: String = str(entry.get("tileId", "")).strip_edges()
	if home_tile_id == "":
		return false
	for id_key in ["tileId", "id", "anchorTileId", "anchorId", "sourceTileId"]:
		var clicked_id: String = str(tile_data.get(id_key, "")).strip_edges()
		if clicked_id != "" and clicked_id == home_tile_id:
			return true
	var home_tmx_x: int = int(entry.get("tmxX", -1))
	var home_tmx_y: int = int(entry.get("tmxY", -1))
	if home_tmx_x < 0 or home_tmx_y < 0:
		return false
	if _does_click_tile_tmx_match_home(tile_data, "tmxX", "tmxY", home_tmx_x, home_tmx_y):
		return true
	if _does_click_tile_tmx_match_home(tile_data, "anchorTmxX", "anchorTmxY", home_tmx_x, home_tmx_y):
		return true
	var anchor_key: String = str(tile_data.get("anchorKey", "")).strip_edges()
	return anchor_key != "" and anchor_key == _coord_key(home_tmx_x, home_tmx_y)


func _does_click_tile_tmx_match_home(
	tile_data: Dictionary,
	x_key: String,
	y_key: String,
	home_tmx_x: int,
	home_tmx_y: int
) -> bool:
	if not tile_data.has(x_key) or not tile_data.has(y_key):
		return false
	return int(tile_data.get(x_key, -1)) == home_tmx_x and int(tile_data.get(y_key, -1)) == home_tmx_y


func _screen_to_backend_tile_data(mouse_screen_pos: Vector2) -> Dictionary:
	if _main_map_view_mode == MAIN_MAP_VIEW_MODE_TIANXIA_YUTU:
		return _screen_to_tianxia_yutu_tile_data(mouse_screen_pos)
	var runtime_width: int = _main_map_runtime_tmx_width()
	var runtime_height: int = _main_map_runtime_tmx_height()
	if runtime_width <= 0 or runtime_height <= 0:
		return {}
	var tmx_coord: Vector2 = _screen_to_tmx(mouse_screen_pos, _zoom)
	if tmx_coord.x < -0.5 or tmx_coord.y < -0.5 or tmx_coord.x > float(runtime_width) or tmx_coord.y > float(runtime_height):
		return {}
	var preview_tmx_x: int = clampi(int(round(tmx_coord.x)), 0, maxi(0, runtime_width - 1))
	var preview_tmx_y: int = clampi(int(round(tmx_coord.y)), 0, maxi(0, runtime_height - 1))
	var preview_key: String = _coord_key(preview_tmx_x, preview_tmx_y)
	var preview_tile: Dictionary = {}
	if _world_cell_preview_tile_by_tmx_key.has(preview_key):
		preview_tile = _world_cell_preview_tile_by_tmx_key[preview_key] as Dictionary
		var preview_reserved_hit: Dictionary = _build_reserved_world_cell_hit_tile(preview_tmx_x, preview_tmx_y, preview_tile)
		if not preview_reserved_hit.is_empty():
			return preview_reserved_hit
		return preview_tile
	var direct_reserved_hit: Dictionary = _build_reserved_world_cell_hit_tile(preview_tmx_x, preview_tmx_y, {})
	if not direct_reserved_hit.is_empty():
		return direct_reserved_hit
	if _tiles.is_empty():
		return _build_main_map_cell_hit_tile(preview_tmx_x, preview_tmx_y)

	var backend_x: int = _map_tmx_to_backend_axis(tmx_coord.x, _backend_x_min, _backend_x_max, runtime_width)
	var backend_y: int = _map_tmx_to_backend_axis(tmx_coord.y, _backend_y_min, _backend_y_max, runtime_height)
	var direct_key: String = _coord_key(backend_x, backend_y)
	var direct_tile: Dictionary = {}
	if _tile_by_coord.has(direct_key):
		direct_tile = _tile_by_coord[direct_key] as Dictionary
	var reserved_hit_tile: Dictionary = _build_reserved_world_cell_hit_tile(preview_tmx_x, preview_tmx_y, direct_tile)
	if not reserved_hit_tile.is_empty():
		return reserved_hit_tile
	if not direct_tile.is_empty():
		return direct_tile

	for radius in range(1, 3):
		for dy in range(-radius, radius + 1):
			for dx in range(-radius, radius + 1):
				var key: String = _coord_key(backend_x + dx, backend_y + dy)
				if _tile_by_coord.has(key):
					var nearby_tile: Dictionary = _tile_by_coord[key] as Dictionary
					var nearby_tmx_variant: Variant = _tmx_cell_by_coord_key.get(key, null)
					if nearby_tmx_variant is Vector2i:
						var nearby_tmx: Vector2i = nearby_tmx_variant as Vector2i
						var nearby_reserved_hit: Dictionary = _build_reserved_world_cell_hit_tile(nearby_tmx.x, nearby_tmx.y, nearby_tile)
						if not nearby_reserved_hit.is_empty():
							return nearby_reserved_hit
					return nearby_tile
	return _build_main_map_cell_hit_tile(preview_tmx_x, preview_tmx_y)


func _screen_to_tianxia_yutu_tile_data(mouse_screen_pos: Vector2) -> Dictionary:
	var draw_rect: Rect2 = _resolve_tianxia_yutu_draw_rect_for_zoom(_tianxia_yutu_zoom, true)
	if draw_rect.size.x <= 0.0 or draw_rect.size.y <= 0.0:
		return {}
	var marker_hit: Dictionary = _resolve_tianxia_yutu_marker_hit(mouse_screen_pos, draw_rect)
	var x_ratio: float = clampf((mouse_screen_pos.x - draw_rect.position.x) / draw_rect.size.x, 0.0, 1.0)
	var y_ratio: float = clampf((mouse_screen_pos.y - draw_rect.position.y) / draw_rect.size.y, 0.0, 1.0)
	var cell_x: int = clampi(roundi(x_ratio * float(MAIN_MAP_WORLD_WIDTH_CELLS - 1)), 0, MAIN_MAP_WORLD_WIDTH_CELLS - 1)
	var cell_y: int = clampi(roundi(y_ratio * float(MAIN_MAP_WORLD_HEIGHT_CELLS - 1)), 0, MAIN_MAP_WORLD_HEIGHT_CELLS - 1)
	if not marker_hit.is_empty():
		cell_x = int(marker_hit.get("x", cell_x))
		cell_y = int(marker_hit.get("y", cell_y))
	var tile := {
		"id": "tianxia_yutu_cell_%d_%d" % [cell_x, cell_y],
		"tileId": "tianxia_yutu_cell_%d_%d" % [cell_x, cell_y],
		"type": "tianxia_yutu_marker_snap" if not marker_hit.is_empty() else "tianxia_yutu_coordinate",
		"terrain": "overview",
		"district": str(marker_hit.get("label", "tianxia_yutu")).strip_edges() if not marker_hit.is_empty() else "tianxia_yutu",
		"x": cell_x,
		"y": cell_y,
		"backendX": cell_x,
		"backendY": cell_y,
		"tmxX": cell_x,
		"tmxY": cell_y,
		"mainMapCellX": cell_x,
		"mainMapCellY": cell_y,
		"worldId": MAIN_MAP_WORLD_ID,
		"coordinateSpace": MAIN_MAP_COORDINATE_SPACE,
		"owner": "neutral",
		"cellVersion": 0,
	}
	if not marker_hit.is_empty():
		tile["tianxiaYutuMarkerSnap"] = true
		tile["snapTargetId"] = str(marker_hit.get("targetId", "")).strip_edges()
		tile["snapTargetLabel"] = str(marker_hit.get("label", "")).strip_edges()
		tile["snapTargetNavigationLabel"] = str(marker_hit.get("navigationLabel", marker_hit.get("label", ""))).strip_edges()
		tile["snapTargetScope"] = str(marker_hit.get("scope", "")).strip_edges()
		tile["snapDistancePx"] = float(marker_hit.get("distancePx", 0.0))
		tile["snapBoundarySummary"] = str(marker_hit.get("boundarySummary", "")).strip_edges()
		tile["snapStateId"] = str(marker_hit.get("stateId", "")).strip_edges()
		tile["snapStateLabel"] = str(marker_hit.get("stateLabel", "")).strip_edges()
		tile["snapRegionId"] = str(marker_hit.get("regionId", "")).strip_edges()
		tile["snapRegionLabel"] = str(marker_hit.get("regionLabel", "")).strip_edges()
	return tile


func _resolve_tianxia_yutu_marker_hit(mouse_screen_pos: Vector2, draw_rect: Rect2) -> Dictionary:
	var selected_state_id: String = _tianxia_yutu_selected_state_id()
	var selected_region_id: String = _tianxia_yutu_selected_region_id()
	var density_level: String = _last_tianxia_yutu_density_level
	var best_hit: Dictionary = {}
	var best_distance: float = 1000000.0
	var raw_targets: Variant = _tianxia_yutu_overview_layer.get("jump_targets", [])
	var visible_targets: Array = []
	if raw_targets is Array:
		for target_variant in raw_targets as Array:
			if not (target_variant is Dictionary):
				continue
			var target: Dictionary = target_variant as Dictionary
			if _is_tianxia_yutu_jump_target_visible_for_hit(target, selected_state_id, selected_region_id, density_level):
				visible_targets.append(target)
		for target in visible_targets:
			if not (target is Dictionary):
				continue
			var scope: String = str((target as Dictionary).get("target_scope", (target as Dictionary).get("kind", ""))).strip_edges()
			var display_offset: Vector2 = _resolve_tianxia_yutu_gate_display_offset(target as Dictionary, visible_targets)
			var hit: Dictionary = _build_tianxia_yutu_marker_hit(target as Dictionary, scope, draw_rect, display_offset, mouse_screen_pos)
			if hit.is_empty():
				continue
			var distance_px: float = float(hit.get("distancePx", 1000000.0))
			if distance_px < best_distance:
				best_distance = distance_px
				best_hit = hit
	var raw_markers: Variant = _tianxia_yutu_overview_layer.get("city_markers", [])
	if raw_markers is Array and (density_level == "near" or selected_region_id != ""):
		for marker_variant in raw_markers as Array:
			if not (marker_variant is Dictionary):
				continue
			var marker: Dictionary = marker_variant as Dictionary
			var state_id: String = str(marker.get("state_id", "")).strip_edges()
			var region_id: String = str(marker.get("region_id", "")).strip_edges()
			if selected_region_id != "" and region_id != selected_region_id:
				continue
			if selected_state_id != "" and state_id != selected_state_id:
				continue
			var cell: Dictionary = marker.get("cell_1km", {}) as Dictionary if marker.get("cell_1km", {}) is Dictionary else {}
			var hit: Dictionary = _build_tianxia_yutu_marker_hit({
				"target_id": _tianxia_yutu_city_marker_target_id(marker),
				"label": str(marker.get("label", "")).strip_edges(),
				"target_scope": "city",
				"state_id": state_id,
				"state_label": _tianxia_yutu_state_label_for_id(state_id),
				"region_id": region_id,
				"region_label": _tianxia_yutu_region_label_for_id(region_id),
				"cell_1km": cell,
			}, "city", draw_rect, Vector2.ZERO, mouse_screen_pos)
			if hit.is_empty():
				continue
			var distance_px: float = float(hit.get("distancePx", 1000000.0))
			if distance_px < best_distance:
				best_distance = distance_px
				best_hit = hit
	return best_hit


func _is_tianxia_yutu_jump_target_visible_for_hit(target: Dictionary, selected_state_id: String, selected_region_id: String, density_level: String) -> bool:
	var scope: String = str(target.get("target_scope", target.get("kind", ""))).strip_edges()
	if scope != "state_government" and scope != "commandery_seat" and scope != "city" and scope != "gate":
		return false
	var target_region_id: String = str(target.get("region_id", "")).strip_edges()
	if selected_region_id != "" and scope != "gate" and target_region_id != selected_region_id:
		return false
	if selected_state_id != "" and not _tianxia_yutu_target_matches_state(target, selected_state_id):
		return false
	if selected_state_id == "" and density_level != "near" and (scope == "commandery_seat" or scope == "city"):
		return false
	return true


func _build_tianxia_yutu_marker_hit(target: Dictionary, scope: String, draw_rect: Rect2, display_offset: Vector2, mouse_screen_pos: Vector2) -> Dictionary:
	var cell: Dictionary = target.get("cell_1km", {}) as Dictionary if target.get("cell_1km", {}) is Dictionary else {}
	if cell.is_empty():
		return {}
	var cell_x: int = int(cell.get("x", 0))
	var cell_y: int = int(cell.get("y", 0))
	var point := _tianxia_yutu_world_cell_to_screen(cell_x, cell_y, draw_rect) + display_offset
	var distance_px: float = point.distance_to(mouse_screen_pos)
	var hit_radius: float = 18.0
	if scope == "gate":
		hit_radius = 24.0
	elif scope == "state_government" or scope == "commandery_seat":
		hit_radius = 22.0
	if distance_px > hit_radius:
		return {}
	_last_tianxia_yutu_hit_radius_px = hit_radius
	_last_tianxia_yutu_hit_metric_recorded = true
	return {
		"x": cell_x,
		"y": cell_y,
		"targetId": str(target.get("target_id", target.get("id", ""))).strip_edges(),
		"label": str(target.get("label", "")).strip_edges(),
		"navigationLabel": str(target.get("navigation_label", target.get("label", ""))).strip_edges(),
		"scope": scope,
		"stateId": str(target.get("state_id", "")).strip_edges(),
		"stateLabel": str(target.get("state_label", "")).strip_edges(),
		"regionId": str(target.get("region_id", "")).strip_edges(),
		"regionLabel": str(target.get("region_label", "")).strip_edges(),
		"boundarySummary": _format_tianxia_yutu_gate_boundary_summary(target) if scope == "gate" else "",
		"distancePx": distance_px,
		"hitRadiusPx": hit_radius,
	}


func _build_main_map_cell_hit_tile(tmx_x: int, tmx_y: int) -> Dictionary:
	var runtime_width: int = _main_map_runtime_tmx_width()
	var runtime_height: int = _main_map_runtime_tmx_height()
	if tmx_x < 0 or tmx_y < 0 or runtime_width <= 0 or runtime_height <= 0:
		return {}
	var cell_x: int = _main_map_runtime_tmx_axis_to_cell(float(tmx_x), runtime_width, MAIN_MAP_WORLD_WIDTH_CELLS)
	var cell_y: int = _main_map_runtime_tmx_axis_to_cell(float(tmx_y), runtime_height, MAIN_MAP_WORLD_HEIGHT_CELLS)
	if not _is_main_world_cell_selectable(cell_x, cell_y):
		return {}
	var tmx_key: String = _coord_key(tmx_x, tmx_y)
	var override_variant: Variant = _main_map_cell_override_by_tmx_key.get(tmx_key, {})
	var override_entry: Dictionary = override_variant as Dictionary if override_variant is Dictionary else {}
	var owner_id: String = str(override_entry.get("owner", "neutral")).strip_edges() if not override_entry.is_empty() else "neutral"
	var cell_version: int = int(override_entry.get("cellVersion", 0)) if not override_entry.is_empty() else 0
	var immunity_until: String = str(override_entry.get("immunityUntil", "")).strip_edges() if not override_entry.is_empty() else ""
	var immunity_active: bool = _is_main_map_cell_immunity_active(override_entry) if not override_entry.is_empty() else false
	return {
		"id": "main_map_cell_%d_%d" % [cell_x, cell_y],
		"tileId": "main_map_cell_%d_%d" % [cell_x, cell_y],
		"type": "main_map_cell",
		"terrain": "main_map",
		"district": "main_map",
		"x": cell_x,
		"y": cell_y,
		"backendX": cell_x,
		"backendY": cell_y,
		"tmxX": tmx_x,
		"tmxY": tmx_y,
		"mainMapCellX": cell_x,
		"mainMapCellY": cell_y,
		"worldId": MAIN_MAP_WORLD_ID,
		"coordinateSpace": MAIN_MAP_COORDINATE_SPACE,
		"chunkId": _main_map_chunk_id_for_cell(Vector2i(cell_x, cell_y)),
		"owner": owner_id,
		"cellVersion": cell_version,
		"immunityUntil": immunity_until,
		"immunityActive": immunity_active,
	}


func _build_main_map_cell_action_context(tile_data: Dictionary) -> Dictionary:
	if tile_data.is_empty():
		return {}
	var tmx_x: int = int(tile_data.get("tmxX", -1))
	var tmx_y: int = int(tile_data.get("tmxY", -1))
	if (tmx_x < 0 or tmx_y < 0) and tile_data.has("anchorTmxX") and tile_data.has("anchorTmxY"):
		tmx_x = int(tile_data.get("anchorTmxX", -1))
		tmx_y = int(tile_data.get("anchorTmxY", -1))
	if tmx_x < 0 or tmx_y < 0:
		var coord_key: String = _coord_key(int(tile_data.get("x", 0)), int(tile_data.get("y", 0)))
		var cached_tmx_variant: Variant = _tmx_cell_by_coord_key.get(coord_key, null)
		if cached_tmx_variant is Vector2i:
			var cached_tmx: Vector2i = cached_tmx_variant as Vector2i
			tmx_x = cached_tmx.x
			tmx_y = cached_tmx.y
	if tmx_x < 0 or tmx_y < 0:
		return {}

	var cell_x: int = int(tile_data.get("mainMapCellX", tile_data.get("backendX", tile_data.get("x", -1))))
	var cell_y: int = int(tile_data.get("mainMapCellY", tile_data.get("backendY", tile_data.get("y", -1))))
	if _is_main_map_projection_scaled_to_preview() or cell_x < 0 or cell_y < 0:
		cell_x = _main_map_runtime_tmx_axis_to_cell(float(tmx_x), _main_map_runtime_tmx_width(), MAIN_MAP_WORLD_WIDTH_CELLS)
		cell_y = _main_map_runtime_tmx_axis_to_cell(float(tmx_y), _main_map_runtime_tmx_height(), MAIN_MAP_WORLD_HEIGHT_CELLS)
	if cell_x < 0 or cell_y < 0:
		return {}

	var tmx_key: String = _coord_key(tmx_x, tmx_y)
	var override_variant: Variant = _main_map_cell_override_by_tmx_key.get(tmx_key, {})
	var override_entry: Dictionary = override_variant as Dictionary if override_variant is Dictionary else {}
	var owner_id: String = str(tile_data.get("owner", "neutral")).strip_edges()
	var cell_version: int = int(tile_data.get("cellVersion", 0))
	var last_event_type: String = ""
	var last_event_id: String = ""
	var updated_world_version: int = 0
	var immunity_until: String = str(tile_data.get("immunityUntil", "")).strip_edges()
	var immunity_active: bool = bool(tile_data.get("immunityActive", false))
	if not override_entry.is_empty():
		owner_id = str(override_entry.get("owner", owner_id)).strip_edges()
		cell_version = int(override_entry.get("cellVersion", cell_version))
		last_event_type = str(override_entry.get("lastEventType", "")).strip_edges()
		last_event_id = str(override_entry.get("lastEventId", "")).strip_edges()
		updated_world_version = int(override_entry.get("updatedWorldVersion", 0))
		immunity_until = str(override_entry.get("immunityUntil", immunity_until)).strip_edges()
		immunity_active = _is_main_map_cell_immunity_active(override_entry)
	if owner_id == "":
		owner_id = "neutral"

	var chunk_id: String = str(tile_data.get("chunkId", "")).strip_edges()
	if not override_entry.is_empty():
		chunk_id = str(override_entry.get("chunkId", chunk_id)).strip_edges()
	if chunk_id == "":
		chunk_id = _main_map_chunk_id_for_cell(Vector2i(cell_x, cell_y))
	var cell_id: String = str(tile_data.get("cellId", "")).strip_edges()
	if not override_entry.is_empty():
		cell_id = str(override_entry.get("cellId", cell_id)).strip_edges()
	if cell_id == "":
		cell_id = "%s:%d:%d" % [MAIN_MAP_WORLD_ID, cell_x, cell_y]
	var tile_id: String = str(tile_data.get("id", tile_data.get("tileId", ""))).strip_edges()
	var tile_type: String = str(tile_data.get("type", "")).strip_edges().to_lower()
	var tile_name: String = str(tile_data.get("name", tile_data.get("title", ""))).strip_edges()
	var resource_level: int = clampi(maxi(0, int(tile_data.get("resourceLevel", 0))), 0, 9)
	var resource_kind: String = str(tile_data.get("resourceKind", "")).strip_edges().to_lower()
	var resource_guard: Dictionary = {}
	var resource_guard_variant: Variant = tile_data.get("resourceGuard", {})
	if resource_guard_variant is Dictionary:
		resource_guard = (resource_guard_variant as Dictionary).duplicate(true)
	var resource_economy: Dictionary = {}
	var resource_economy_variant: Variant = tile_data.get("resourceEconomy", {})
	if resource_economy_variant is Dictionary:
		resource_economy = (resource_economy_variant as Dictionary).duplicate(true)
	var resource_tile_expedition_preview: Dictionary = {}
	var resource_tile_expedition_preview_variant: Variant = tile_data.get("resourceTileExpeditionPreview", {})
	if resource_tile_expedition_preview_variant is Dictionary:
		resource_tile_expedition_preview = (resource_tile_expedition_preview_variant as Dictionary).duplicate(true)

	var context := {
		"worldId": MAIN_MAP_WORLD_ID,
		"coordinateSpace": MAIN_MAP_COORDINATE_SPACE,
		"cellX": cell_x,
		"cellY": cell_y,
		"tmxX": tmx_x,
		"tmxY": tmx_y,
		"chunkId": chunk_id,
		"cellId": cell_id,
		"owner": owner_id,
		"cellVersion": cell_version,
		"lastEventType": last_event_type,
		"lastEventId": last_event_id,
		"updatedWorldVersion": updated_world_version,
		"immunityUntil": immunity_until,
		"immunityActive": immunity_active,
		"tileId": tile_id,
		"tileName": tile_name,
		"tileType": tile_type,
		"resourceLevel": resource_level,
		"resourceKind": resource_kind,
		"resourceGuard": resource_guard,
		"resourceEconomy": resource_economy,
		"resourceTileExpeditionPreview": resource_tile_expedition_preview,
	}
	for snap_key in ["tianxiaYutuMarkerSnap", "snapTargetId", "snapTargetLabel", "snapTargetNavigationLabel", "snapTargetScope", "snapDistancePx", "snapBoundarySummary", "snapStateId", "snapStateLabel", "snapRegionId", "snapRegionLabel"]:
		if tile_data.has(snap_key):
			context[snap_key] = tile_data.get(snap_key)
	if not _last_tianxia_yutu_selected_gate_summary.is_empty():
		context["tianxiaYutuSelectedGateSummary"] = _last_tianxia_yutu_selected_gate_summary.duplicate(true)
	return context


func _build_reserved_world_cell_hit_tile(tmx_x: int, tmx_y: int, source_tile: Dictionary = {}) -> Dictionary:
	var tmx_key: String = _coord_key(tmx_x, tmx_y)
	var footprint_id: String = _resolve_reserved_world_cell_footprint_id(tmx_key)
	if not _should_world_cell_reserved_hit_proxy_apply(footprint_id):
		return {}
	var anchor_key: String = str(_world_cell_reserved_anchor_by_tmx_key.get(tmx_key, "")).strip_edges()
	var anchor_variant: Variant = _world_cell_node_anchor_by_tmx_key.get(anchor_key, {})
	var anchor_entry: Dictionary = anchor_variant as Dictionary if anchor_variant is Dictionary else {}
	var hit_tile: Dictionary = source_tile.duplicate(true) if not source_tile.is_empty() else {}
	var backend_x: int = int(hit_tile.get("x", _map_tmx_to_backend_axis(float(tmx_x), _backend_x_min, _backend_x_max, _main_map_runtime_tmx_width())))
	var backend_y: int = int(hit_tile.get("y", _map_tmx_to_backend_axis(float(tmx_y), _backend_y_min, _backend_y_max, _main_map_runtime_tmx_height())))
	hit_tile["x"] = backend_x
	hit_tile["y"] = backend_y
	hit_tile["tmxX"] = tmx_x
	hit_tile["tmxY"] = tmx_y
	hit_tile["footprintId"] = footprint_id
	hit_tile["isReservedHit"] = true
	hit_tile["anchorKey"] = anchor_key
	if not anchor_entry.is_empty():
		for key in ["id", "tileId", "sourceTileId", "title", "name", "type", "terrain", "district", "owner", "factionId", "cityLevel", "cityRole", "anchorDeltaSource", "landmarkId", "compositeId", "placeholderRole", "x", "y", "backendX", "backendY"]:
			if anchor_entry.has(key):
				hit_tile[key] = anchor_entry.get(key)
		hit_tile["anchorTmxX"] = int(anchor_entry.get("tmxX", tmx_x))
		hit_tile["anchorTmxY"] = int(anchor_entry.get("tmxY", tmx_y))
	var base_variant: Variant = _world_cell_node_base_by_tmx_key.get(tmx_key, {})
	if base_variant is Dictionary:
		var base_entry: Dictionary = base_variant as Dictionary
		hit_tile["cellState"] = str(base_entry.get("cellState", "reserved_base")).strip_edges()
		hit_tile["slotId"] = str(base_entry.get("slotId", "")).strip_edges()
	else:
		hit_tile["cellState"] = str(hit_tile.get("cellState", "reserved_base")).strip_edges()
		hit_tile["slotId"] = str(hit_tile.get("slotId", "")).strip_edges()
	if str(hit_tile.get("type", "")).strip_edges() == "":
		hit_tile["type"] = _resolve_world_cell_runtime_type(anchor_entry, footprint_id)
	if str(hit_tile.get("terrain", "")).strip_edges() == "":
		hit_tile["terrain"] = _resolve_world_cell_runtime_default_terrain(str(hit_tile.get("type", "")).strip_edges().to_lower())
	if str(hit_tile.get("id", "")).strip_edges() == "":
		hit_tile["id"] = "world_cell_%s" % tmx_key.replace(":", "_")
	return hit_tile


func _build_click_priority_formal_sample_hit_tile(tmx_x: int, tmx_y: int) -> Dictionary:
	var formal_variant: Variant = _click_priority_formal_sample_by_tmx_key.get(_coord_key(tmx_x, tmx_y), {})
	if not (formal_variant is Dictionary):
		return {}
	var formal_sample: Dictionary = formal_variant as Dictionary
	var cell: Dictionary = _dictionary_from_variant(formal_sample.get("cell_1km", {}))
	var footprint_id := str(formal_sample.get("footprint_id", "")).strip_edges()
	if footprint_id == "":
		return {}
	var tile_type := str(formal_sample.get("type", "")).strip_edges().to_lower()
	if tile_type == "":
		tile_type = _resolve_world_cell_runtime_type({}, footprint_id)
	var backend_x := int(cell.get("x", tmx_x))
	var backend_y := int(cell.get("y", tmx_y))
	var tile_id := str(formal_sample.get("tile_id", "")).strip_edges()
	if tile_id == "":
		tile_id = str(formal_sample.get("formal_object_id", "")).strip_edges()
	return {
		"id": tile_id,
		"tileId": tile_id,
		"name": str(formal_sample.get("name", tile_id)).strip_edges(),
		"title": str(formal_sample.get("name", tile_id)).strip_edges(),
		"type": tile_type,
		"terrain": _resolve_world_cell_runtime_default_terrain(tile_type),
		"owner": str(formal_sample.get("owner", "neutral")).strip_edges(),
		"x": backend_x,
		"y": backend_y,
		"backendX": backend_x,
		"backendY": backend_y,
		"tmxX": tmx_x,
		"tmxY": tmx_y,
		"footprintId": footprint_id,
		"cellId": str(formal_sample.get("cell_id", "%s:%d:%d" % [MAIN_MAP_WORLD_ID, backend_x, backend_y])).strip_edges(),
		"chunkId": str(formal_sample.get("chunk_id", _main_map_chunk_id_for_cell(Vector2i(backend_x, backend_y)))).strip_edges(),
		"isReservedHit": true,
		"anchorKey": str(formal_sample.get("formal_object_id", tile_id)).strip_edges(),
	}


func _should_world_cell_reserved_hit_proxy_apply(footprint_id: String) -> bool:
	if footprint_id == "":
		return false
	return footprint_id != WORLD_CELL_FOOTPRINT_RESOURCE_1X1


func _resolve_world_cell_runtime_default_terrain(tile_type: String) -> String:
	if not _resolve_world_cell_node_dispatch_rule(tile_type).is_empty():
		return _resolve_world_cell_node_dispatch_default_terrain(tile_type)
	match tile_type:
		"city", "player_city", "ai_city", "system_city":
			return "cityland"
		_:
			return tile_type


func _resolve_screen_position_for_tile(tile_data: Dictionary) -> Vector2:
	var direct_tmx_x: int = int(tile_data.get("tmxX", -1))
	var direct_tmx_y: int = int(tile_data.get("tmxY", -1))
	if direct_tmx_x >= 0 and direct_tmx_y >= 0:
		return _tmx_to_screen(direct_tmx_x, direct_tmx_y)
	return tile_to_screen_position(int(tile_data.get("x", 0)), int(tile_data.get("y", 0)))


func _map_tmx_to_backend_axis(value: float, min_axis: int, max_axis: int, tmx_size: int) -> int:
	if tmx_size <= 1 or max_axis <= min_axis:
		return min_axis
	var ratio: float = clampf(value / float(tmx_size - 1), 0.0, 1.0)
	return int(round(lerpf(float(min_axis), float(max_axis), ratio)))


func _format_tianxia_yutu_hover_label() -> String:
	if bool(_hover_tile.get("tianxiaYutuMarkerSnap", false)) and str(_hover_tile.get("snapTargetScope", "")).strip_edges() == "gate":
		var gate_label: String = str(_hover_tile.get("snapTargetNavigationLabel", _hover_tile.get("snapTargetLabel", "关口"))).strip_edges()
		var boundary_summary: String = str(_hover_tile.get("snapBoundarySummary", "")).strip_edges()
		var coord_text := "(%d,%d)" % [int(_hover_tile.get("x", 0)), int(_hover_tile.get("y", 0))]
		_last_tianxia_yutu_hover_gate_summary = {
			"label": gate_label,
			"boundarySummary": boundary_summary,
			"coordinate": coord_text,
		}
		return "天下舆图 | 关口 | %s | %s | %s" % [
			gate_label if gate_label != "" else "未命名关口",
			boundary_summary if boundary_summary != "" else "边界语义待补",
			coord_text,
		]
	_last_tianxia_yutu_hover_gate_summary = {}
	if _hover_tile_key == "" and not _last_tianxia_yutu_selected_gate_summary.is_empty():
		var selected_label: String = str(_last_tianxia_yutu_selected_gate_summary.get("label", "关口")).strip_edges()
		var selected_boundary: String = str(_last_tianxia_yutu_selected_gate_summary.get("boundarySummary", "")).strip_edges()
		var selected_coord: String = str(_last_tianxia_yutu_selected_gate_summary.get("coordinate", "")).strip_edges()
		return "天下舆图 | 已选关口 | %s | %s | %s" % [
			selected_label if selected_label != "" else "未命名关口",
			selected_boundary if selected_boundary != "" else "边界语义待补",
			selected_coord if selected_coord != "" else "坐标待补",
		]
	var strategic_layer: Dictionary = _tianxia_yutu_overview_layer.get("strategic_overlay_layer", {}) as Dictionary if _tianxia_yutu_overview_layer.get("strategic_overlay_layer", {}) is Dictionary else {}
	var raw_overlays: Variant = strategic_layer.get("overlays", [])
	var enabled_labels: PackedStringArray = PackedStringArray()
	if raw_overlays is Array:
		for overlay_variant in raw_overlays as Array:
			if not (overlay_variant is Dictionary):
				continue
			var overlay: Dictionary = overlay_variant as Dictionary
			var overlay_id: String = str(overlay.get("id", "")).strip_edges()
			if overlay_id == "":
				continue
			var default_visible: bool = bool(overlay.get("default_visible", true))
			if bool(_tianxia_yutu_overlay_visibility.get(overlay_id, default_visible)):
				enabled_labels.append(str(overlay.get("label", overlay_id)).strip_edges())
	var admin_layer: Dictionary = _tianxia_yutu_overview_layer.get("administrative_ownership_layer", {}) as Dictionary if _tianxia_yutu_overview_layer.get("administrative_ownership_layer", {}) is Dictionary else {}
	var faction_layer: Dictionary = _tianxia_yutu_overview_layer.get("faction_color_layer", {}) as Dictionary if _tianxia_yutu_overview_layer.get("faction_color_layer", {}) is Dictionary else {}
	var color_mode: String = str(faction_layer.get("color_mode", "neutral")).strip_edges()
	var runtime_color_entries: Array = faction_layer.get("current_runtime_color_entries", []) as Array if faction_layer.get("current_runtime_color_entries", []) is Array else []
	var frontline_markers: Array = strategic_layer.get("frontline_markers", []) as Array if strategic_layer.get("frontline_markers", []) is Array else []
	return "天下舆图 | hover 摘要 | 州%d 郡%d | 开启 %s | 势力色 %s(%d) | 战线%d" % [
		int(admin_layer.get("state_count", 0)),
		int(admin_layer.get("region_count", 0)),
		" / ".join(enabled_labels) if not enabled_labels.is_empty() else "无",
		"运行时" if color_mode.find("runtime") >= 0 else "中性",
		runtime_color_entries.size(),
		frontline_markers.size(),
	]

func _update_hover_label() -> void:
	if _hover_label == null:
		return
	if _main_map_view_mode == MAIN_MAP_VIEW_MODE_TIANXIA_YUTU:
		_hover_label.text = _format_tianxia_yutu_hover_label()
		_emit_hud_snapshot_changed()
		return
	if _hover_tile_key == "":
		_hover_label.text = (
			"SLG Theme | scope=%s | zoom=%.2f | backendTiles=%d | visibleDrawn=%d | sampleStep=%d"
			% [_chunk_scope, _zoom, _tiles.size(), _last_visible_draw_count, _last_sampling_step]
		)
		_emit_hud_snapshot_changed()
		return
	var tile_id: String = str(_hover_tile.get("id", "-"))
	var tile_x: int = int(_hover_tile.get("x", 0))
	var tile_y: int = int(_hover_tile.get("y", 0))
	var tile_type: String = str(_hover_tile.get("type", "-"))
	var terrain: String = str(_hover_tile.get("terrain", "-"))
	var district: String = str(_hover_tile.get("district", "-"))
	var cell_state: String = str(_hover_tile.get("cellState", "")).strip_edges()
	var slot_id: String = str(_hover_tile.get("slotId", "")).strip_edges()
	var sample_id: String = str(_hover_tile.get("sampleId", "")).strip_edges()
	var extra_line: String = ""
	if cell_state != "" or slot_id != "" or sample_id != "":
		extra_line = "\nCellState:%s  Slot:%s  Sample:%s" % [
			cell_state if cell_state != "" else "-",
			slot_id if slot_id != "" else "-",
			sample_id if sample_id != "" else "-",
		]
	var resource_guard_line: String = _build_resource_guard_hover_line(_hover_tile)
	if resource_guard_line != "":
		extra_line += resource_guard_line
	_hover_label.text = (
		"SLG Theme | scope=%s | zoom=%.2f | visible=%d | sample=%d\nID:%s  Pos:(%d,%d)\nType:%s  Terrain:%s  District:%s%s"
		% [_chunk_scope, _zoom, _last_visible_draw_count, _last_sampling_step, tile_id, tile_x, tile_y, tile_type, terrain, district, extra_line]
	)
	_emit_hud_snapshot_changed()


func _build_resource_guard_hover_line(tile_data: Dictionary) -> String:
	if str(tile_data.get("type", "")).strip_edges().to_lower() != "resource":
		return ""
	var guard_variant: Variant = tile_data.get("resourceGuard", {})
	if not (guard_variant is Dictionary):
		return ""
	var guard: Dictionary = guard_variant as Dictionary
	if guard.is_empty():
		return ""
	var guard_names: String = _join_variant_strings(guard.get("guardNames", []), "未配置")
	var resource_level: int = int(guard.get("resourceLevel", tile_data.get("resourceLevel", 1)))
	var recommended_strength: int = int(guard.get("recommendedAttackerStrength", 0))
	var skill_summary: String = str(guard.get("skillSummary", "")).strip_edges()
	if skill_summary == "":
		skill_summary = "未配置"
	var portrait_status_line: String = _build_resource_guard_portrait_status_line(guard)
	return "\n资源地等级：%d  守军：%s\n推荐兵力：%d  战法摘要：%s%s" % [
		resource_level,
		guard_names,
		recommended_strength,
		skill_summary,
		portrait_status_line,
	]


func _build_resource_guard_portrait_status_line(guard: Dictionary) -> String:
	var units_variant: Variant = guard.get("units", [])
	if not (units_variant is Array):
		return ""
	var total_count: int = 0
	var resolved_count: int = 0
	for unit_variant in units_variant:
		if not (unit_variant is Dictionary):
			continue
		var unit_data: Dictionary = unit_variant as Dictionary
		var portrait_asset_key: String = str(unit_data.get("portraitAssetKey", "")).strip_edges()
		if portrait_asset_key == "":
			continue
		total_count += 1
		var texture: Texture2D = NpcGuardPortraitRegistryScript.portrait_texture(portrait_asset_key)
		if texture != null:
			resolved_count += 1
	if total_count <= 0:
		return ""
	return "\n守军画像：已解析 %d/%d" % [resolved_count, total_count]


func _join_variant_strings(value: Variant, fallback: String) -> String:
	if not (value is Array):
		return fallback
	var parts := PackedStringArray()
	for item_variant in value:
		var item: String = str(item_variant).strip_edges()
		if item != "":
			parts.append(item)
	if parts.is_empty():
		return fallback
	return "、".join(parts)


func _update_perf_label() -> void:
	if _perf_label == null:
		return
	var instant_fps: int = Engine.get_frames_per_second()
	var instant_frame_ms: float = 1000.0 / max(1.0, float(instant_fps))
	_perf_label.text = (
		"Perf(5s) | avgFPS=%.1f | avgFrameMs=%.2f | instFPS=%d | instFrameMs=%.2f | visibleDrawn=%d | visibleCandidates=%d | sampleStep=%d"
		% [_avg_fps_5s, _avg_frame_ms_5s, instant_fps, instant_frame_ms, _last_visible_draw_count, _last_visible_candidate_count, _last_sampling_step]
	)
	_emit_hud_snapshot_changed()


func _record_frame_sample(delta: float) -> void:
	var now_sec: float = float(Time.get_ticks_msec()) / 1000.0
	_frame_timestamps.append(now_sec)
	_frame_deltas.append(delta)
	_frame_delta_sum += delta
	while not _frame_timestamps.is_empty() and now_sec - float(_frame_timestamps[0]) > perf_window_seconds:
		_frame_timestamps.pop_front()
		if not _frame_deltas.is_empty():
			var removed_delta: float = float(_frame_deltas.pop_front())
			_frame_delta_sum = max(0.0, _frame_delta_sum - removed_delta)


func _refresh_perf_metrics() -> void:
	var frame_count: int = _frame_deltas.size()
	if frame_count <= 0 or _frame_delta_sum <= 0.0:
		_avg_fps_5s = 0.0
		_avg_frame_ms_5s = 0.0
		return
	_avg_fps_5s = float(frame_count) / _frame_delta_sum
	_avg_frame_ms_5s = (_frame_delta_sum / float(frame_count)) * 1000.0


func _on_export_button_pressed() -> void:
	_export_perf_baseline("button")


func _export_perf_baseline(source: String) -> void:
	var export_dir: String = _resolve_export_dir_path()
	if export_dir == "":
		_update_export_status("Export failed | tmp dir unavailable")
		return
	var stamp: String = str(Time.get_unix_time_from_system()).replace(".", "_")
	var file_name: String = "godot_perf_baseline_%s.json" % stamp
	var output_path: String = _join_path(export_dir, file_name)
	var payload: Dictionary = {
		"exportedAtUnixSec": float(Time.get_unix_time_from_system()),
		"source": source,
		"theme": {
			"name": "slgclient",
			"tmxLoaded": _tmx_loaded,
			"tmxPath": THEME_MAP_TMX_PATH,
			"tmxMapWidth": _tmx_map_width,
			"tmxMapHeight": _tmx_map_height,
			"tmxTileWidth": _tmx_tile_width,
			"tmxTileHeight": _tmx_tile_height,
		},
		"metrics": {
			"avgFPS5s": _avg_fps_5s,
			"avgFrameMs5s": _avg_frame_ms_5s,
			"instantFPS": Engine.get_frames_per_second(),
			"visibleDrawn": _last_visible_draw_count,
			"visibleCandidates": _last_visible_candidate_count,
			"sampleStep": _last_sampling_step,
		},
		"backendMap": {
			"scope": _chunk_scope,
			"tileCount": _tiles.size(),
			"mapWidth": _map_width,
			"mapHeight": _map_height,
			"loadedProvinceCount": _loaded_province_ids.size(),
		},
		"camera": {
			"zoom": _zoom,
			"panOffset": {"x": _pan_offset.x, "y": _pan_offset.y},
		},
	}
	var export_file := FileAccess.open(output_path, FileAccess.WRITE)
	if export_file == null:
		_update_export_status("Export failed | open error=%d" % FileAccess.get_open_error())
		return
	export_file.store_string(JSON.stringify(payload, "  "))
	export_file.flush()
	export_file.close()
	_update_export_status("Exported: %s" % output_path)
	print("[map-grid-theme] baseline exported | source=%s | path=%s" % [source, output_path])


func _resolve_export_dir_path() -> String:
	var repo_tmp_dir: String = ProjectSettings.globalize_path("res://../tmp")
	if DirAccess.make_dir_recursive_absolute(repo_tmp_dir) == OK:
		return repo_tmp_dir
	var user_tmp_dir: String = ProjectSettings.globalize_path("user://tmp")
	if DirAccess.make_dir_recursive_absolute(user_tmp_dir) == OK:
		return user_tmp_dir
	return ""


func _update_export_status(message: String) -> void:
	if _export_status_label != null:
		_export_status_label.text = message
	_emit_hud_snapshot_changed()


func get_hud_snapshot() -> Dictionary:
	return {
		"hover_summary": _hover_label.text if _hover_label != null else "",
		"perf_summary": _perf_label.text if _perf_label != null else "",
		"export_status_text": _export_status_label.text if _export_status_label != null else "",
	}


func _emit_hud_snapshot_changed() -> void:
	hud_snapshot_changed.emit(get_hud_snapshot())


func _is_truthy_env(key: String) -> bool:
	var value: String = OS.get_environment(key).strip_edges().to_lower()
	return value == "1" or value == "true" or value == "yes"


func _schedule_runtime_preview_capture() -> void:
	if _runtime_preview_capture_done or not _runtime_preview_capture_requested:
		return
	_runtime_preview_capture_done = true
	call_deferred("_export_runtime_preview_capture")


func _should_schedule_runtime_capture_now() -> bool:
	if not _is_world_cell_live_capture_requested():
		return true
	return not _world_cell_live_capture_sample_order.is_empty()


func _export_runtime_preview_capture() -> void:
	if not _runtime_preview_capture_requested:
		return
	_selected_tile = {}
	_selected_tile_key = ""
	_hover_tile = {}
	_hover_tile_key = ""
	var previous_visible: bool = visible
	var restore_zoom: bool = false
	var previous_zoom: float = _zoom
	var restore_pan: bool = false
	var previous_pan_offset: Vector2 = _pan_offset
	if _resolve_world_cell_preview_variant() == "stages" and _zoom > 0.32:
		_zoom = 0.32
		restore_zoom = true
	if not visible:
		visible = true
	if _is_world_cell_live_capture_requested():
		_focus_runtime_live_pass_capture_camera()
		restore_pan = true
		_rebuild_world_cell_live_capture_samples()
		_apply_runtime_live_pass_capture_interaction_focus()
	elif _resolve_world_cell_preview_variant() != "formal":
		var selected_variant: Variant = _world_cell_preview_focus_tiles.get("selected", {})
		if selected_variant is Dictionary:
			_selected_tile = (selected_variant as Dictionary).duplicate(true)
			_selected_tile_key = _coord_key(int(_selected_tile.get("x", 0)), int(_selected_tile.get("y", 0)))
		var hover_variant: Variant = _world_cell_preview_focus_tiles.get("hover", {})
		if hover_variant is Dictionary:
			_hover_tile = (hover_variant as Dictionary).duplicate(true)
			_hover_tile_key = _coord_key(int(_hover_tile.get("x", 0)), int(_hover_tile.get("y", 0)))
	_update_hover_label()
	queue_redraw()
	var hidden_canvas_items: Array = _set_runtime_preview_capture_canvas_items_visible(false)
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var capture_path: String = _resolve_runtime_preview_capture_path()
	if capture_path == "":
		visible = previous_visible
		if restore_zoom:
			_zoom = previous_zoom
		if restore_pan:
			_pan_offset = previous_pan_offset
		_restore_runtime_preview_capture_canvas_items(hidden_canvas_items)
		_update_export_status("Runtime capture failed | tmp screenshot dir unavailable")
		return
	var viewport_texture: ViewportTexture = get_viewport().get_texture()
	if viewport_texture == null:
		visible = previous_visible
		if restore_zoom:
			_zoom = previous_zoom
		if restore_pan:
			_pan_offset = previous_pan_offset
		_restore_runtime_preview_capture_canvas_items(hidden_canvas_items)
		_update_export_status("Runtime capture failed | viewport texture missing")
		return
	var image: Image = viewport_texture.get_image()
	if image == null:
		visible = previous_visible
		if restore_zoom:
			_zoom = previous_zoom
		if restore_pan:
			_pan_offset = previous_pan_offset
		_restore_runtime_preview_capture_canvas_items(hidden_canvas_items)
		_update_export_status("Runtime capture failed | viewport image missing")
		return
	var save_err: Error = image.save_png(capture_path)
	_restore_runtime_preview_capture_canvas_items(hidden_canvas_items)
	visible = previous_visible
	if restore_zoom:
		_zoom = previous_zoom
	if restore_pan:
		_pan_offset = previous_pan_offset
	if save_err != OK:
		_update_export_status("Runtime capture failed | err=%d" % int(save_err))
		return
	var crop_path: String = _resolve_runtime_preview_capture_crop_path()
	var crop_rect: Rect2i = _resolve_runtime_preview_capture_crop_rect(image)
	if crop_path != "" and crop_rect.size.x > 0 and crop_rect.size.y > 0:
		var crop_image: Image = image.get_region(crop_rect)
		if crop_image != null:
			crop_image.save_png(crop_path)
	var metadata_path: String = _resolve_runtime_preview_capture_metadata_path()
	if metadata_path != "":
		_save_runtime_preview_capture_metadata(metadata_path, image, crop_rect)
	_update_export_status("Runtime capture saved: %s" % capture_path)
	print("[map-grid-theme] runtime preview capture exported | path=%s" % capture_path)


func _focus_runtime_live_pass_capture_camera() -> void:
	if _world_cell_live_capture_sample_order.is_empty():
		return
	var min_x: float = INF
	var min_y: float = INF
	var max_x: float = -INF
	var max_y: float = -INF
	for sample_id_variant in _world_cell_live_capture_sample_order:
		var sample_variant: Variant = _world_cell_live_capture_sample_by_id.get(str(sample_id_variant), {})
		if not (sample_variant is Dictionary):
			continue
		var sample: Dictionary = sample_variant as Dictionary
		var anchor_tmx: Vector2i = _vector2i_from_json_array(sample.get("anchorTmx", []), Vector2i(-1, -1))
		if anchor_tmx.x < 0 or anchor_tmx.y < 0:
			continue
		var screen_pos: Vector2 = _tmx_to_screen(anchor_tmx.x, anchor_tmx.y)
		min_x = min(min_x, screen_pos.x)
		min_y = min(min_y, screen_pos.y)
		max_x = max(max_x, screen_pos.x)
		max_y = max(max_y, screen_pos.y)
	if min_x == INF or min_y == INF:
		return
	var sample_center := Vector2((min_x + max_x) * 0.5, (min_y + max_y) * 0.5)
	var viewport_center: Vector2 = get_viewport_rect().size * 0.5
	_pan_offset += viewport_center - sample_center


func _apply_runtime_live_pass_capture_interaction_focus() -> void:
	if _world_cell_live_capture_sample_order.is_empty():
		return
	var selected_tile: Dictionary = _resolve_runtime_live_pass_capture_hit_tile(0)
	if not selected_tile.is_empty():
		_selected_tile = selected_tile
		_selected_tile_key = _coord_key(int(selected_tile.get("x", 0)), int(selected_tile.get("y", 0)))
	var hover_index: int = 1 if _world_cell_live_capture_sample_order.size() > 1 else 0
	var hover_tile: Dictionary = _resolve_runtime_live_pass_capture_hit_tile(hover_index)
	if not hover_tile.is_empty():
		_hover_tile = hover_tile
		_hover_tile_key = _coord_key(int(hover_tile.get("x", 0)), int(hover_tile.get("y", 0)))


func _resolve_runtime_live_pass_capture_hit_tile(sample_index: int) -> Dictionary:
	if sample_index < 0 or sample_index >= _world_cell_live_capture_sample_order.size():
		return {}
	var sample_id: String = str(_world_cell_live_capture_sample_order[sample_index]).strip_edges()
	var sample_variant: Variant = _world_cell_live_capture_sample_by_id.get(sample_id, {})
	if not (sample_variant is Dictionary):
		return {}
	var sample: Dictionary = sample_variant as Dictionary
	var hit_tile_variant: Variant = sample.get("hitTile", {})
	if hit_tile_variant is Dictionary:
		return (hit_tile_variant as Dictionary).duplicate(true)
	return {}


func _join_path(base_path: String, file_name: String) -> String:
	if base_path.ends_with("/") or base_path.ends_with("\\"):
		return base_path + file_name
	return base_path + "/" + file_name


func _resolve_runtime_preview_capture_path() -> String:
	var screenshot_dir: String = ProjectSettings.globalize_path("res://../tmp/screenshots/world_resource_alignment")
	if DirAccess.make_dir_recursive_absolute(screenshot_dir) != OK:
		return ""
	return _join_path(screenshot_dir, "world_cell_runtime_preview_capture%s.png" % _resolve_world_cell_preview_capture_suffix())


func _resolve_runtime_preview_capture_crop_path() -> String:
	var screenshot_dir: String = ProjectSettings.globalize_path("res://../tmp/screenshots/world_resource_alignment")
	if DirAccess.make_dir_recursive_absolute(screenshot_dir) != OK:
		return ""
	return _join_path(screenshot_dir, "world_cell_runtime_preview_capture%s_crop.png" % _resolve_world_cell_preview_capture_suffix())


func _resolve_runtime_preview_capture_metadata_path() -> String:
	var screenshot_dir: String = ProjectSettings.globalize_path("res://../tmp/screenshots/world_resource_alignment")
	if DirAccess.make_dir_recursive_absolute(screenshot_dir) != OK:
		return ""
	return _join_path(screenshot_dir, "world_cell_runtime_preview_capture%s.json" % _resolve_world_cell_preview_capture_suffix())


func _resolve_world_cell_preview_capture_suffix() -> String:
	var capture_mode: String = _resolve_world_cell_capture_mode()
	if capture_mode == WORLD_CELL_CAPTURE_MODE_LIVE_PASS:
		return "_live_pass"
	if capture_mode == WORLD_CELL_CAPTURE_MODE_LIVE_NODES:
		return "_live_nodes"
	var preview_mode: String = _resolve_world_cell_preview_mode()
	var preview_variant: String = _resolve_world_cell_preview_variant()
	var suffix_parts: Array = []
	if preview_mode != "city":
		suffix_parts.append(preview_mode)
	if preview_variant == "formal":
		suffix_parts.append("formal")
	elif preview_variant == "stages":
		suffix_parts.append("stages")
	if suffix_parts.is_empty():
		return ""
	return "_" + "_".join(suffix_parts)


func _set_runtime_preview_capture_canvas_items_visible(visible: bool) -> Array:
	var saved_states: Array = []
	for node_path in [
		NodePath("../HoverLayer"),
		NodePath("../UiLayer"),
		NodePath("../ObservabilityPanel"),
		NodePath("../UnitViewLayer"),
	]:
		var node: Node = get_node_or_null(node_path)
		if node == null:
			continue
		_collect_runtime_preview_capture_canvas_item_states(node, saved_states, visible)
	return saved_states


func _restore_runtime_preview_capture_canvas_items(saved_states: Array) -> void:
	for state_variant in saved_states:
		if not (state_variant is Dictionary):
			continue
		var state: Dictionary = state_variant as Dictionary
		var item: CanvasItem = state.get("item", null) as CanvasItem
		if item == null:
			continue
		item.visible = bool(state.get("visible", true))
	queue_redraw()


func _collect_runtime_preview_capture_canvas_item_states(node: Node, saved_states: Array, visible: bool) -> void:
	if node is CanvasItem:
		var item: CanvasItem = node as CanvasItem
		saved_states.append({"item": item, "visible": item.visible})
		item.visible = visible
	for child in node.get_children():
		if child is Node:
			_collect_runtime_preview_capture_canvas_item_states(child as Node, saved_states, visible)


func _resolve_runtime_preview_capture_crop_rect(image: Image) -> Rect2i:
	if image == null:
		return Rect2i()
	var image_width: int = image.get_width()
	var image_height: int = image.get_height()
	if image_width <= 0 or image_height <= 0:
		return Rect2i()
	var sample_rects: Array = []
	for sample_id_variant in _resolve_runtime_capture_sample_order():
		var sample_id: String = str(sample_id_variant).strip_edges()
		var sample_variant: Variant = _resolve_runtime_capture_sample(sample_id)
		if not (sample_variant is Dictionary):
			continue
		var sample: Dictionary = sample_variant as Dictionary
		var capture_rect_data: Array = sample.get("captureRect", []) as Array
		if capture_rect_data.size() < 4:
			continue
		var rect := Rect2(
			Vector2(float(capture_rect_data[0]), float(capture_rect_data[1])),
			Vector2(float(capture_rect_data[2]), float(capture_rect_data[3]))
		)
		sample_rects.append(rect)
	if sample_rects.is_empty():
		return Rect2i(0, 0, image_width, image_height)
	var union_rect: Rect2 = sample_rects[0]
	for rect_variant in sample_rects:
		if not (rect_variant is Rect2):
			continue
		union_rect = union_rect.merge(rect_variant as Rect2)
	var crop_padding_x: int = maxi(32, int(ceil(_tmx_tile_width * maxf(_zoom, 0.25) * 0.60)))
	var crop_padding_y: int = maxi(48, int(ceil(_tmx_tile_height * maxf(_zoom, 0.25) * 1.40)))
	var min_x: int = clampi(int(floor(union_rect.position.x)) - crop_padding_x, 0, image_width - 1)
	var min_y: int = clampi(int(floor(union_rect.position.y)) - crop_padding_y, 0, image_height - 1)
	var max_x: int = clampi(int(ceil(union_rect.end.x)) + crop_padding_x, min_x + 1, image_width)
	var max_y: int = clampi(int(ceil(union_rect.end.y)) + crop_padding_y, min_y + 1, image_height)
	return Rect2i(min_x, min_y, max_x - min_x, max_y - min_y)


func _build_world_cell_live_pass_backend_metadata() -> Dictionary:
	var live_backend: Dictionary = _build_world_cell_capture_node_backend_metadata("pass")
	live_backend["totalPassAnchors"] = _resolve_world_cell_live_pass_anchor_entries().size()
	return live_backend


func _build_world_cell_live_nodes_backend_metadata() -> Dictionary:
	var live_backend: Dictionary = _build_world_cell_capture_node_backend_metadata("live_nodes")
	live_backend["capturedNodeTypes"] = _resolve_world_cell_live_capture_node_types()
	return live_backend


func _build_world_cell_capture_node_backend_metadata(capture_node_type: String) -> Dictionary:
	var normalized_capture_node_type: String = capture_node_type.strip_edges().to_lower()
	if normalized_capture_node_type == "":
		normalized_capture_node_type = "pass"
	var builder_stats: Dictionary = _resolve_world_cell_runtime_builder_stats_snapshot()
	var raw_backend_node_counts: Dictionary = (builder_stats.get("rawBackendNodeCounts", {}) as Dictionary).duplicate(true)
	var registered_attempt_counts: Dictionary = (builder_stats.get("registeredAttemptCounts", builder_stats.get("registeredAnchorCounts", {})) as Dictionary).duplicate(true)
	var registered_anchor_counts: Dictionary = (builder_stats.get("registeredAnchorCounts", {}) as Dictionary).duplicate(true)
	var duplicate_anchor_counts: Dictionary = (builder_stats.get("duplicateAnchorCounts", {}) as Dictionary).duplicate(true)
	var skipped_conflict_counts: Dictionary = (builder_stats.get("skippedConflictCounts", {}) as Dictionary).duplicate(true)
	var skipped_invalid_counts: Dictionary = (builder_stats.get("skippedInvalidCounts", {}) as Dictionary).duplicate(true)
	var skipped_conflict_samples: Dictionary = (builder_stats.get("skippedConflictSamples", {}) as Dictionary).duplicate(true)
	var duplicate_anchor_samples: Dictionary = (builder_stats.get("duplicateAnchorSamples", {}) as Dictionary).duplicate(true)
	var active_unique_anchor_audit: Dictionary = _build_world_cell_active_unique_anchor_audit()
	var active_unique_anchor_counts_by_type: Dictionary = (active_unique_anchor_audit.get("activeAnchorCountsByType", {}) as Dictionary).duplicate(true)
	var active_unique_anchor_counts_by_footprint: Dictionary = (active_unique_anchor_audit.get("activeAnchorCountsByFootprint", {}) as Dictionary).duplicate(true)
	var builder_lifecycle_summary: Dictionary = _build_world_cell_runtime_builder_lifecycle_summary(builder_stats, active_unique_anchor_counts_by_type)
	return {
		"metadataBuilder": "capture_node_backend_v1",
		"nodeType": normalized_capture_node_type,
		"source": "/api/world/map-layout",
		"sampleCount": _world_cell_live_capture_sample_order.size(),
		"duplicateAnchorPolicy": WORLD_CELL_DUPLICATE_ANCHOR_POLICY,
		"nodeTypeStats": {
			"nodeType": normalized_capture_node_type,
			"rawBackendNodeCount": int(raw_backend_node_counts.get(normalized_capture_node_type, 0)),
			"registeredAttemptCount": int(registered_attempt_counts.get(normalized_capture_node_type, 0)),
			"registeredAnchorCount": int(registered_anchor_counts.get(normalized_capture_node_type, 0)),
			"registeredAnchorCountSemantics": "registered_attempts_before_duplicate_last_write",
			"activeUniqueAnchorCount": int(active_unique_anchor_counts_by_type.get(normalized_capture_node_type, 0)),
			"duplicateAnchorCount": int(duplicate_anchor_counts.get(normalized_capture_node_type, 0)),
			"skippedConflictCount": int(skipped_conflict_counts.get(normalized_capture_node_type, 0)),
			"skippedInvalidCount": int(skipped_invalid_counts.get(normalized_capture_node_type, 0)),
		},
		"rawBackendNodeCounts": raw_backend_node_counts,
		"registeredAttemptCounts": registered_attempt_counts,
		"registeredAnchorCounts": registered_anchor_counts,
		"registeredAnchorCountsSemantics": "registered_attempts_before_duplicate_last_write",
		"activeUniqueAnchorCountsByType": active_unique_anchor_counts_by_type,
		"activeUniqueAnchorCountsByFootprint": active_unique_anchor_counts_by_footprint,
		"duplicateAnchorCounts": duplicate_anchor_counts,
		"skippedConflictCounts": skipped_conflict_counts,
		"skippedInvalidCounts": skipped_invalid_counts,
		"skippedConflictSamples": skipped_conflict_samples,
		"duplicateAnchorSamples": duplicate_anchor_samples,
		"builderStats": builder_stats,
		"builderLifecycleSummary": builder_lifecycle_summary,
		"builderAuditSummary": _build_world_cell_runtime_builder_audit_summary(builder_stats),
		"runtimeStrategyHandlerAudit": _world_cell_runtime_strategy_handler_audit.duplicate(true),
		"strategicNodeAvailability": _build_world_cell_live_strategic_node_availability_status(raw_backend_node_counts, registered_attempt_counts, active_unique_anchor_counts_by_type),
		"placementPolicyAudit": _build_world_cell_placement_policy_audit([
			WORLD_CELL_FOOTPRINT_PASS_1X1,
			WORLD_CELL_FOOTPRINT_FORT_1X1,
			WORLD_CELL_FOOTPRINT_DOCK_1X1,
			WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L03_L04_3X3,
			WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L05_L06_5X5,
			WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L07_L08_7X7,
			WORLD_CELL_FOOTPRINT_SYSTEM_CITY_L09_9X9,
		]),
	}


func _finalize_world_cell_capture_node_backend_metadata(live_backend: Dictionary, samples: Array) -> Dictionary:
	var finalized: Dictionary = live_backend.duplicate(true)
	var capture_node_type: String = str(finalized.get("nodeType", "pass")).strip_edges().to_lower()
	if capture_node_type == "":
		capture_node_type = "pass"
	finalized["sampleHitStats"] = _build_world_cell_capture_node_sample_hit_stats(samples)
	finalized["reservedHitCoverageAudit"] = _build_world_cell_capture_node_reserved_hit_coverage_audit(samples, capture_node_type)
	finalized["placementContextAudit"] = _build_world_cell_capture_node_placement_context_audit(samples)
	finalized["placementContextStatus"] = _build_world_cell_capture_node_placement_context_status(finalized["placementContextAudit"] as Dictionary)
	var node_type_stats: Dictionary = finalized.get("nodeTypeStats", {}) as Dictionary
	var builder_audit_summary: Dictionary = finalized.get("builderAuditSummary", {}) as Dictionary
	var skipped_conflict_count: int = int(node_type_stats.get("skippedConflictCount", 0))
	var duplicate_anchor_count: int = int(node_type_stats.get("duplicateAnchorCount", 0))
	finalized["captureNodeBuilderAuditStatus"] = _build_world_cell_capture_node_builder_audit_status(
		capture_node_type,
		builder_audit_summary,
		skipped_conflict_count,
		duplicate_anchor_count
	)
	finalized["captureNodeReasonAuditStatus"] = _build_world_cell_capture_node_reason_audit_status(
		capture_node_type,
		builder_audit_summary,
		skipped_conflict_count,
		duplicate_anchor_count
	)
	finalized["previewPlacementCurrentContextAudit"] = _build_world_cell_runtime_sample_preview_placement_current_context_audit(samples)
	finalized["runtimeStrategyAudit"] = _build_world_cell_live_pass_runtime_strategy_audit(samples)
	finalized["reservedFootprintAudit"] = _build_world_cell_reserved_footprint_audit()
	return finalized


func _save_runtime_preview_capture_metadata(path: String, image: Image, crop_rect: Rect2i) -> void:
	var capture_mode: String = _resolve_world_cell_capture_mode()
	var metadata := {
		"captureMode": capture_mode,
		"mode": _resolve_world_cell_capture_metadata_mode(capture_mode),
		"variant": "runtime" if _is_world_cell_live_capture_requested() else _resolve_world_cell_preview_variant(),
		"zoom": _zoom,
		"fullCapturePath": _resolve_runtime_preview_capture_path(),
		"cropCapturePath": _resolve_runtime_preview_capture_crop_path(),
		"imageSize": [image.get_width(), image.get_height()],
		"cropRect": [crop_rect.position.x, crop_rect.position.y, crop_rect.size.x, crop_rect.size.y],
		"mapLayout": {
			"chunkScope": _chunk_scope,
			"chunkId": _chunk_id,
			"backendTileCount": _tiles.size(),
			"loadedProvinceIds": _loaded_province_ids.duplicate(true),
			"cameraViewport": _camera_viewport_metadata.duplicate(true),
		},
		"samples": [],
	}
	if capture_mode == WORLD_CELL_CAPTURE_MODE_LIVE_PASS:
		metadata["liveBackend"] = _build_world_cell_live_pass_backend_metadata()
	elif capture_mode == WORLD_CELL_CAPTURE_MODE_LIVE_NODES:
		metadata["liveBackend"] = _build_world_cell_live_nodes_backend_metadata()
	for sample_id_variant in _resolve_runtime_capture_sample_order():
		var sample_id: String = str(sample_id_variant).strip_edges()
		var sample_variant: Variant = _resolve_runtime_capture_sample(sample_id)
		if sample_variant is Dictionary:
			(metadata["samples"] as Array).append((sample_variant as Dictionary).duplicate(true))
	if _is_world_cell_live_capture_requested() and metadata.has("liveBackend"):
		var live_backend: Dictionary = metadata.get("liveBackend", {}) as Dictionary
		live_backend = _finalize_world_cell_capture_node_backend_metadata(live_backend, metadata["samples"] as Array)
		if capture_mode == WORLD_CELL_CAPTURE_MODE_LIVE_PASS:
			live_backend["livePassAuditStatus"] = _build_world_cell_live_pass_audit_status(live_backend)
		elif capture_mode == WORLD_CELL_CAPTURE_MODE_LIVE_NODES:
			live_backend["liveNodeCaptureStatus"] = _build_world_cell_live_node_capture_status(live_backend, metadata["samples"] as Array)
		metadata["liveBackend"] = live_backend
	elif capture_mode == WORLD_CELL_CAPTURE_MODE_PREVIEW:
		metadata["previewPlacementEligibilityAudit"] = _world_cell_preview_placement_audit_by_sample_id.duplicate(true)
	var file: FileAccess = FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return
	file.store_string(JSON.stringify(metadata, "\t"))
	file.close()


func _resolve_world_cell_capture_metadata_mode(capture_mode: String) -> String:
	if capture_mode == WORLD_CELL_CAPTURE_MODE_LIVE_PASS:
		return "live_backend_pass"
	if capture_mode == WORLD_CELL_CAPTURE_MODE_LIVE_NODES:
		return "live_backend_nodes"
	return _resolve_world_cell_preview_mode()


func _resolve_runtime_capture_sample_order() -> Array:
	if _is_world_cell_live_capture_requested():
		return _world_cell_live_capture_sample_order
	return _world_cell_preview_sample_order


func _resolve_runtime_capture_sample(sample_id: String) -> Variant:
	if _is_world_cell_live_capture_requested():
		return _world_cell_live_capture_sample_by_id.get(sample_id, {})
	return _world_cell_preview_sample_by_id.get(sample_id, {})


func _resolve_sampling_step(candidate_count: int) -> int:
	if candidate_count <= MAX_VISIBLE_TILE_DRAW_COUNT:
		return 1
	var ratio: float = float(candidate_count) / float(MAX_VISIBLE_TILE_DRAW_COUNT)
	return maxi(1, int(ceil(sqrt(max(1.0, ratio)))))


func _compute_visible_tmx_bounds() -> Dictionary:
	return _compute_visible_tmx_bounds_with_margin(2)


func set_main_map_view_mode(next_mode: String) -> void:
	var normalized_mode: String = next_mode.strip_edges().to_lower()
	if normalized_mode != MAIN_MAP_VIEW_MODE_TIANXIA_YUTU:
		normalized_mode = MAIN_MAP_VIEW_MODE_GAMEPLAY
	if _main_map_view_mode == normalized_mode:
		return
	_main_map_view_mode = normalized_mode
	_hover_tile_key = ""
	_selected_tile_key = ""
	if normalized_mode != MAIN_MAP_VIEW_MODE_TIANXIA_YUTU:
		_last_tianxia_yutu_selected_gate_summary = {}
	_update_hover_label()
	queue_redraw()

func set_tianxia_yutu_overlay_visibility(overlay_visibility: Dictionary) -> void:
	_tianxia_yutu_overlay_visibility = overlay_visibility.duplicate(true)
	_update_hover_label()
	queue_redraw()


func set_tianxia_yutu_drilldown_context(context: Dictionary) -> void:
	_tianxia_yutu_drilldown_context = context.duplicate(true)
	_update_hover_label()
	queue_redraw()


func _resolve_main_map_include_layers_query() -> String:
	if _main_map_view_mode == MAIN_MAP_VIEW_MODE_TIANXIA_YUTU:
		return TIANXIA_YUTU_INCLUDE_LAYERS_QUERY
	return MAIN_MAP_INCLUDE_LAYERS_QUERY


func get_camera_viewport_query_params() -> Dictionary:
	var visible_bounds: Dictionary = _compute_visible_tmx_bounds_with_margin(0)
	if not bool(visible_bounds.get("valid", false)):
		return {}

	var start_x: int = int(visible_bounds.get("startX", 0))
	var end_x: int = int(visible_bounds.get("endX", -1))
	var start_y: int = int(visible_bounds.get("startY", 0))
	var end_y: int = int(visible_bounds.get("endY", -1))
	var center_tmx_x: float = (float(start_x) + float(end_x)) * 0.5
	var center_tmx_y: float = (float(start_y) + float(end_y)) * 0.5
	var runtime_width: int = _main_map_runtime_tmx_width()
	var runtime_height: int = _main_map_runtime_tmx_height()
	return {
		"worldId": MAIN_MAP_WORLD_ID,
		"scope": "viewport",
		"centerX": str(_main_map_runtime_tmx_axis_to_cell(center_tmx_x, runtime_width, MAIN_MAP_WORLD_WIDTH_CELLS)),
		"centerY": str(_main_map_runtime_tmx_axis_to_cell(center_tmx_y, runtime_height, MAIN_MAP_WORLD_HEIGHT_CELLS)),
		"visibleCells": MAIN_MAP_VISIBLE_SIZE_CELLS_QUERY,
		"visibleSizeCells": MAIN_MAP_VISIBLE_SIZE_CELLS_QUERY,
		"preloadMargin": str(MAIN_MAP_PRELOAD_MARGIN_CELLS),
		"preloadMarginCells": str(MAIN_MAP_PRELOAD_MARGIN_CELLS),
		"chunkSize": str(MAIN_MAP_CHUNK_SIZE_CELLS),
		"includeLayers": _resolve_main_map_include_layers_query(),
		"loadedChunkIds": _main_map_loaded_chunk_ids_string(),
		"coordinateSpace": MAIN_MAP_COORDINATE_SPACE,
	}


func get_main_map_streaming_debug_summary() -> Dictionary:
	var resource_objects: Array = _collect_main_map_resource_objects(_main_map_resource_overlay_layer)
	var city_gate_objects: Array = _collect_main_map_city_gate_objects(_main_map_city_gate_anchor_layer)
	return {
		"ok": true,
		"mainMapViewMode": _main_map_view_mode,
		"rendererMode": str(_main_map_cell_layer.get("renderer_mode", "scaled_preview_bridge")).strip_edges(),
		"baseMapRendererMode": str(_main_map_base_map_layer.get("renderer_mode", "")).strip_edges(),
		"substrateRendererActive": _is_main_world_substrate_chunk_renderer_active(),
		"substrateChunkTextureCount": _main_map_substrate_chunk_texture_by_id.size(),
		"worldId": MAIN_MAP_WORLD_ID,
		"coordinateSpace": MAIN_MAP_COORDINATE_SPACE,
		"worldSizeCells": [MAIN_MAP_WORLD_WIDTH_CELLS, MAIN_MAP_WORLD_HEIGHT_CELLS],
		"chunkSizeCells": [MAIN_MAP_CHUNK_SIZE_CELLS, MAIN_MAP_CHUNK_SIZE_CELLS],
		"visibleSizeCells": [MAIN_MAP_VISIBLE_WIDTH_CELLS, MAIN_MAP_VISIBLE_HEIGHT_CELLS],
		"preloadMarginCells": MAIN_MAP_PRELOAD_MARGIN_CELLS,
		"layerOrder": _main_map_layer_order.duplicate(true),
		"loadedChunkCount": _main_map_loaded_chunk_ids.size(),
		"loadedChunkIds": _main_map_loaded_chunk_ids.duplicate(true),
		"unloadCandidateChunkCount": _main_map_unload_candidate_chunk_ids.size(),
		"unloadCandidateChunkIds": _main_map_unload_candidate_chunk_ids.duplicate(true),
		"mainWorldCellLayerChunkCount": _main_world_cell_chunk_range_by_id.size(),
		"mainWorldCellLayerSelectableCellCount": int(_main_map_cell_layer.get("selectable_cell_count", 0)),
		"mainWorldCellLayerObjectUpsertCount": int(_main_map_cell_layer.get("object_upsert_count", 0)),
		"resourceOverlayEntryCount": _resource_overlay_entries.size(),
		"resourceOverlayObjectCount": resource_objects.size(),
		"mainWorldMountainBoundaryLayerPresent": not _main_map_mountain_boundary_layer.is_empty(),
		"mainWorldMountainBoundaryVisiblePlacementCount": int(_main_map_mountain_boundary_layer.get("visible_placement_count", 0)),
		"mainWorldMountainBoundaryHardReservedCellCount": int(_main_map_mountain_boundary_layer.get("hard_reserved_cell_count_in_loaded_viewport", 0)),
		"mainWorldMountainBoundaryRenderPieceInstanceCount": int(_main_map_mountain_boundary_layer.get("render_piece_instance_count", 0)),
		"mainWorldMountainBoundaryRuntimeAssetLoadedCount": _main_world_mountain_boundary_texture_by_piece_id.size(),
		"mainWorldMountainBoundaryRuntimeCopyGate": _main_world_mountain_boundary_runtime_copy_gate,
		"mainWorldMountainBoundarySpriteDrawCount": _last_main_world_mountain_boundary_sprite_draw_count,
		"mainWorldMountainBoundarySpriteFailedCount": _last_main_world_mountain_boundary_sprite_failed_count,
		"mainWorldMountainBoundarySpriteOnScreenCount": _last_main_world_mountain_boundary_sprite_on_screen_count,
		"mainWorldChokepointLayerPresent": not _main_map_chokepoint_layer.is_empty(),
		"mainWorldChokepointAcceptedNodeCount": int(_main_map_chokepoint_layer.get("accepted_pass_wall_node_count", 0)),
		"mainWorldChokepointRenderPieceInstanceCount": int(_main_map_chokepoint_layer.get("render_piece_instance_count", 0)),
		"mainWorldChokepointSpriteDrawCount": _last_main_world_chokepoint_sprite_draw_count,
		"mainWorldChokepointSpriteFailedCount": _last_main_world_chokepoint_sprite_failed_count,
		"mainWorldChokepointSpriteOnScreenCount": _last_main_world_chokepoint_sprite_on_screen_count,
		"mainWorldChokepointSuppressedCityGateAnchorCount": _last_main_world_chokepoint_suppressed_city_gate_anchor_count,
		"cityGateAnchorObjectCount": city_gate_objects.size(),
		"worldCellAnchorCount": _world_cell_node_anchor_by_tmx_key.size(),
		"worldCellAnchorVisibleCount": _last_world_cell_anchor_visible_count,
		"worldCellNodeDrawCount": _last_world_cell_node_draw_count,
		"worldCellNodeDrawFailedCount": _last_world_cell_node_draw_failed_count,
		"worldCellRuntimeBuilderStats": _resolve_world_cell_runtime_builder_stats_snapshot(),
		"cellOverrideCacheCount": _main_map_cell_override_by_cell_id.size(),
		"mainMapOwnerOverrideDrawCount": _last_main_map_owner_override_draw_count,
		"mainMapOwnerOverrideRelationCounts": _last_main_map_owner_override_relation_counts.duplicate(true),
		"mainMapImmunityBorderDrawCount": _last_main_map_immunity_border_draw_count,
		"tianxiaYutuOverviewLayerPresent": not _tianxia_yutu_overview_layer.is_empty(),
		"tianxiaYutuOverviewTileCount": int(_tianxia_yutu_overview_layer.get("tile_count", 0)),
		"tianxiaYutuOverviewMaxDetailSize": _tianxia_yutu_overview_layer.get("max_detail_size_px", []),
		"tianxiaYutuOverviewTextureLoaded": _tianxia_yutu_overview_texture != null,
		"tianxiaYutuOverviewTexturePath": _tianxia_yutu_overview_texture_path,
		"tianxiaYutuOverviewDrawCount": _last_tianxia_yutu_overview_draw_count,
		"tianxiaYutuOverlayVisibility": _tianxia_yutu_overlay_visibility.duplicate(true),
		"tianxiaYutuDensityLevel": _last_tianxia_yutu_density_level,
		"wheelPivotDriftPx": _last_wheel_pivot_drift_px,
		"pinchPivotDriftPx": _last_pinch_pivot_drift_px,
		"pivotCellDrift": _last_pivot_cell_drift,
		"wheelPivotMetricRecorded": _last_wheel_pivot_metric_recorded,
		"pinchPivotMetricRecorded": _last_pinch_pivot_metric_recorded,
		"tianxiaYutuSelectedStateId": _tianxia_yutu_selected_state_id(),
		"tianxiaYutuSelectedRegionId": _tianxia_yutu_selected_region_id(),
		"tianxiaYutuWheelPivotDriftPx": _last_tianxia_yutu_wheel_pivot_drift_px,
		"tianxiaYutuPinchPivotDriftPx": _last_tianxia_yutu_pinch_pivot_drift_px,
		"tianxiaYutuPivotCellDrift": _last_tianxia_yutu_pivot_cell_drift,
		"tianxiaYutuWheelPivotMetricRecorded": _last_tianxia_yutu_wheel_pivot_metric_recorded,
		"tianxiaYutuPinchPivotMetricRecorded": _last_tianxia_yutu_pinch_pivot_metric_recorded,
		"stateFillRatio2k": _last_tianxia_yutu_state_fill_ratio_2k,
		"hitRadiusPx": _last_tianxia_yutu_hit_radius_px,
		"tianxiaYutuHitMetricRecorded": _last_tianxia_yutu_hit_metric_recorded,
		"labelOverlapCount": _last_tianxia_yutu_label_collision_skip_count,
		"tianxiaYutuStateLabelDrawCount": _last_tianxia_yutu_state_label_draw_count,
		"tianxiaYutuRegionLabelDrawCount": _last_tianxia_yutu_region_label_draw_count,
		"tianxiaYutuCityGateMarkerDrawCount": _last_tianxia_yutu_city_gate_marker_draw_count,
		"tianxiaYutuLabelCollisionSkipCount": _last_tianxia_yutu_label_collision_skip_count,
		"tianxiaYutuLabelPanelAvoidanceSkipCount": _last_tianxia_yutu_label_panel_avoidance_skip_count,
		"tianxiaYutuDuplicateLabelSuppressionCount": _last_tianxia_yutu_duplicate_label_suppression_count,
		"tianxiaYutuLabelPriorityDrawCounts": _last_tianxia_yutu_label_priority_draw_counts.duplicate(true),
		"tianxiaYutuLabelPrioritySkipCounts": _last_tianxia_yutu_label_priority_skip_counts.duplicate(true),
		"tianxiaYutuLabelPriorityDrawOrder": _last_tianxia_yutu_label_priority_draw_order.duplicate(true),
		"tianxiaYutuMarkerScopeDrawCounts": _last_tianxia_yutu_marker_scope_draw_counts.duplicate(true),
		"tianxiaYutuMarkerLabelDrawCounts": _last_tianxia_yutu_marker_label_draw_counts.duplicate(true),
		"tianxiaYutuCityLabelBudgetSkipCount": _last_tianxia_yutu_city_label_budget_skip_count,
		"tianxiaYutuGateLabelBudgetSkipCount": _last_tianxia_yutu_gate_label_budget_skip_count,
		"tianxiaYutuGateHoverLabelForceCount": _last_tianxia_yutu_gate_hover_label_force_count,
		"tianxiaYutuGateDetailCalloutDrawCount": _last_tianxia_yutu_gate_detail_callout_draw_count,
		"tianxiaYutuHoverGateSummary": _last_tianxia_yutu_hover_gate_summary.duplicate(true),
		"tianxiaYutuSelectedGateSummary": _last_tianxia_yutu_selected_gate_summary.duplicate(true),
		"tianxiaYutuLabelArtPolishToken": "gate_boundary_focus_dense_v9",
		"tianxiaYutuMarkerLabelPolishSpecToken": TianxiaYutuMarkerVisualPolicyScript.MARKER_LABEL_POLISH_SPEC_TOKEN,
		"tianxiaYutuMarkerLabelPolishMode": "gate_hover_selected_compact_label_v2",
		"tianxiaYutuProductSurfaceContract": TianxiaYutuProductContractScript.PRODUCT_SURFACE_CONTRACT,
		"tianxiaYutuReadabilityContract": TianxiaYutuProductContractScript.READABILITY_CONTRACT,
		"tianxiaYutuInteractionContract": TianxiaYutuProductContractScript.INTERACTION_CONTRACT,
		"tianxiaYutuMarkerVisualPolicyId": TianxiaYutuMarkerVisualPolicyScript.POLICY_ID,
		"tianxiaYutuMarkerVisualPolicyHelperActive": true,
		"tianxiaYutuLabelBudgetPolicyId": TianxiaYutuMarkerVisualPolicyScript.LABEL_BUDGET_POLICY_ID,
		"tianxiaYutuLabelBudgetPolicyHelperActive": true,
		"tianxiaYutuGateBoundaryLabelOffsetCount": _last_tianxia_yutu_gate_boundary_label_offset_count,
		"tianxiaYutuFocusLabelDenseSuppressionCount": _last_tianxia_yutu_focus_label_dense_suppression_count,
		"tianxiaYutuContextGateFocusDrawCount": _last_tianxia_yutu_context_gate_focus_draw_count,
		"tianxiaYutuOutOfRegionGateDimDrawCount": _last_tianxia_yutu_out_of_region_gate_dim_draw_count,
		"tianxiaYutuLowEmphasisMarkerDrawCount": _last_tianxia_yutu_low_emphasis_marker_draw_count,
		"tianxiaYutuOutOfRegionGateMicroDrawCount": _last_tianxia_yutu_out_of_region_gate_micro_draw_count,
		"tianxiaYutuOrdinaryCityMicroDrawCount": _last_tianxia_yutu_ordinary_city_micro_draw_count,
		"tianxiaYutuMarkerVisualWeightEstimate": snappedf(_last_tianxia_yutu_marker_visual_weight_estimate, 0.01),
		"tianxiaYutuCompactTargetMarkerFocusDrawCount": _last_tianxia_yutu_compact_target_marker_focus_draw_count,
		"tianxiaYutuCompactTargetMarkerDimDrawCount": _last_tianxia_yutu_compact_target_marker_dim_draw_count,
		"tianxiaYutuCompactTargetLabelSuppressionCount": _last_tianxia_yutu_compact_target_label_suppression_count,
		"tianxiaYutuCompactTargetCandidateFocusCount": _last_tianxia_yutu_compact_target_candidate_focus_count,
		"tianxiaYutuCompactTargetContext": _tianxia_yutu_compact_target_context_summary(),
		"tianxiaYutuCompactAdminLabelSuppressionCount": _last_tianxia_yutu_compact_admin_label_suppression_count,
		"tianxiaYutuNormalDenseAdminLabelSuppressionCount": _last_tianxia_yutu_normal_dense_admin_label_suppression_count,
		"tianxiaYutuStateFocusShapeDrawCount": _last_tianxia_yutu_state_focus_shape_draw_count,
		"tianxiaYutuRegionFocusBoundaryDrawCount": _last_tianxia_yutu_region_focus_boundary_draw_count,
		"tianxiaYutuAdminFocusAssetMaskDrawCount": _last_tianxia_yutu_admin_focus_asset_mask_draw_count,
		"tianxiaYutuAdminFocusMaskHardRequired": _is_tianxia_yutu_admin_focus_mask_hard_required(),
		"tianxiaYutuAdminFocusMaskMissingCount": _last_tianxia_yutu_admin_focus_mask_missing_count,
		"tianxiaYutuAdminFocusMaskLoadFailedCount": _last_tianxia_yutu_admin_focus_mask_load_failed_count,
		"tianxiaYutuAdminFocusRuntimeHullBlockedCount": _last_tianxia_yutu_admin_focus_runtime_hull_blocked_count,
		"tianxiaYutuResourcePointsVisible": bool(_tianxia_yutu_overlay_visibility.get("resource_points", false)),
		"tianxiaYutuFrontiersVisible": bool(_tianxia_yutu_overlay_visibility.get("frontiers", false)),
		"tianxiaYutuRuntimeFactionColorEntryCount": _tianxia_yutu_runtime_faction_color_entry_count(),
		"tianxiaYutuStateBoundarySegmentCount": _tianxia_yutu_state_boundary_segment_count(),
		"tianxiaYutuStateBoundaryDrawCount": _last_tianxia_yutu_state_boundary_draw_count,
		"tianxiaYutuFrontlineMarkerCount": _tianxia_yutu_frontline_marker_count(),
		"tianxiaYutuFrontlineDrawCount": _last_tianxia_yutu_frontline_draw_count,
		"tianxiaYutuFrontlineArrowDrawCount": _last_tianxia_yutu_frontline_arrow_draw_count,
		"tianxiaYutuFrontlineLastMarkerLabel": _last_tianxia_yutu_frontline_marker_label,
		"tianxiaYutuAiActivityMarkerFamilyContract": TianxiaYutuLivingWorldHotspotPolicyScript.AI_LIVING_ACTIVITY_MARKER_FAMILY_CONTRACT,
		"tianxiaYutuLivingWorldMarkerClusterToken": TianxiaYutuLivingWorldHotspotPolicyScript.LIVING_WORLD_MARKER_CLUSTER_TOKEN,
		"tianxiaYutuAiActivityLabelPriorityToken": TianxiaYutuLivingWorldHotspotPolicyScript.AI_ACTIVITY_LABEL_PRIORITY_TOKEN,
		"tianxiaYutuAiActivityHotspotVisualAssetContract": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_VISUAL_ASSET_CONTRACT,
		"tianxiaYutuAiActivityHotspotVisualAssetPath": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_VISUAL_ASSET_PATH,
		"tianxiaYutuAiActivityHotspotVisualAssetManifestPath": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_VISUAL_ASSET_MANIFEST_PATH,
		"tianxiaYutuAiActivityHotspotVisualAssetLoaded": _last_tianxia_yutu_ai_activity_hotspot_visual_asset_loaded,
		"tianxiaYutuAiActivityHotspotVisualAssetDrawCount": _last_tianxia_yutu_ai_activity_hotspot_visual_asset_draw_count,
		"tianxiaYutuAiActivityHotspotHaloDrawCount": _last_tianxia_yutu_ai_activity_hotspot_halo_draw_count,
		"tianxiaYutuAiActivityHotspotInfoAssetContract": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_INFO_ASSET_CONTRACT,
		"tianxiaYutuAiActivityHotspotLabelPlateAssetPath": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_LABEL_PLATE_ASSET_PATH,
		"tianxiaYutuAiActivityHotspotClusterBadgeAssetPath": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_CLUSTER_BADGE_ASSET_PATH,
		"tianxiaYutuAiActivityHotspotInfoAssetLoaded": _last_tianxia_yutu_ai_activity_hotspot_info_asset_loaded,
		"tianxiaYutuAiActivityHotspotLabelPlateAssetDrawCount": _last_tianxia_yutu_ai_activity_hotspot_label_plate_asset_draw_count,
		"tianxiaYutuAiActivityHotspotClusterBadgeAssetDrawCount": _last_tianxia_yutu_ai_activity_hotspot_cluster_badge_asset_draw_count,
		"tianxiaYutuAiActivityRouteIntentAssetContract": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_ROUTE_INTENT_ASSET_CONTRACT,
		"tianxiaYutuAiActivityRouteArrowAssetPath": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_ROUTE_ARROW_ASSET_PATH,
		"tianxiaYutuAiActivityRouteIntentAssetLoaded": _last_tianxia_yutu_ai_activity_route_intent_asset_loaded,
		"tianxiaYutuAiActivityRouteIntentSourceTargetCount": _last_tianxia_yutu_ai_activity_route_intent_source_target_count,
		"tianxiaYutuAiActivityRouteIntentLineDrawCount": _last_tianxia_yutu_ai_activity_route_intent_line_draw_count,
		"tianxiaYutuAiActivityRouteIntentArrowAssetDrawCount": _last_tianxia_yutu_ai_activity_route_intent_arrow_asset_draw_count,
		"tianxiaYutuAiActivityRouteIntentEndpointAnchorDrawCount": _last_tianxia_yutu_ai_activity_route_intent_endpoint_anchor_draw_count,
		"tianxiaYutuAiActivityRouteHeadingContract": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_ROUTE_HEADING_CONTRACT,
		"tianxiaYutuAiActivityRouteHeadingAppliedCount": _last_tianxia_yutu_ai_activity_route_heading_applied_count,
		"tianxiaYutuAiActivityRouteFirstHeadingRadians": _last_tianxia_yutu_ai_activity_route_first_heading_radians,
		"tianxiaYutuAiActivityRouteStateVariantContract": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_ROUTE_STATE_VARIANT_CONTRACT,
		"tianxiaYutuAiActivityRouteActiveArrowAssetPath": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_ROUTE_ACTIVE_ARROW_ASSET_PATH,
		"tianxiaYutuAiActivityRouteQueuedArrowAssetPath": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_ROUTE_QUEUED_ARROW_ASSET_PATH,
		"tianxiaYutuAiActivityRouteStateVariantAssetLoaded": _last_tianxia_yutu_ai_activity_route_state_variant_asset_loaded,
		"tianxiaYutuAiActivityRouteActiveVariantDrawCount": _last_tianxia_yutu_ai_activity_route_active_variant_draw_count,
		"tianxiaYutuAiActivityRouteQueuedVariantDrawCount": _last_tianxia_yutu_ai_activity_route_queued_variant_draw_count,
		"tianxiaYutuAiActivityRouteFirstStateVariant": _last_tianxia_yutu_ai_activity_route_first_state_variant,
		"tianxiaYutuAiActivityHotspotCount": _last_tianxia_yutu_ai_activity_hotspot_count,
		"tianxiaYutuAiActivityHotspotDrawCount": _last_tianxia_yutu_ai_activity_hotspot_draw_count,
		"tianxiaYutuAiActivityHotspotLabelDrawCount": _last_tianxia_yutu_ai_activity_hotspot_label_draw_count,
		"tianxiaYutuAiActivityHotspotMaxClusterCount": _last_tianxia_yutu_ai_activity_hotspot_max_cluster_count,
		"tianxiaYutuAiActivityHotspotFirstLabel": _last_tianxia_yutu_ai_activity_hotspot_first_label,
		"tianxiaYutuAiActivityFirstTraceId": _last_tianxia_yutu_ai_activity_first_trace_id,
		"tianxiaYutuAiActivityUsesExecutionTrace": _last_tianxia_yutu_ai_activity_uses_execution_trace,
		"tianxiaYutuAiActivityFallbackUsed": _last_tianxia_yutu_ai_activity_fallback_used,
		"mainWorldFrontlineMarkerCount": _main_world_frontline_markers.size(),
		"mainWorldFrontlineDrawCount": _last_main_world_frontline_draw_count,
		"mainWorldFrontlineArrowDrawCount": _last_main_world_frontline_arrow_draw_count,
		"mainWorldFrontlineLastMarkerLabel": _last_main_world_frontline_marker_label,
		"worldMapManifestRendererWiringStatus": _world_map_manifest_renderer_wiring_status,
		"worldMapAssetReadyAndRendererWired": _world_map_manifest_renderer_wiring_status == WORLD_MAP_MANIFEST_RENDERER_WIRING_STATUS,
		"worldMapManifestFallbackUsed": _world_map_manifest_fallback_used,
		"worldMapManifestFallbackReasonByManifest": _world_map_manifest_fallback_reason_by_manifest.duplicate(true),
		"worldMapManifestVisibleLayerTokens": _world_map_manifest_visible_layer_tokens_all(),
		"worldMapScreenshotAcceptanceStatus": "visual_quality_pending",
		"worldMapScreenshotAcceptanceMetricFields": _world_map_screenshot_acceptance_metric_fields(),
		"worldMapScreenshotAcceptanceContract": _world_map_screenshot_acceptance_contract(),
		"worldMapVisibleLayerDrawPathEvidence": _world_map_visible_layer_draw_path_evidence(),
		"worldMapRegionOverlayManifestLoaded": _world_map_manifest_loaded(_world_region_overlay_manifest),
		"worldMapRegionOverlayManifestPath": THEME_WORLD_REGION_OVERLAY_MANIFEST_PATH,
		"worldMapRegionOverlayAuthorityStatus": _world_map_manifest_authority_status(_world_region_overlay_manifest),
		"worldMapRegionOverlayFamilyCount": _world_map_manifest_family_count(_world_region_overlay_manifest, "overlayFamilies"),
		"worldMapRegionOverlayVisibleLayerTokens": _world_map_manifest_visible_layer_tokens_for("region_overlay"),
		"worldMapRegionOverlayZoomTiers": _world_map_manifest_zoom_tiers(_world_region_overlay_manifest),
		"worldMapRouteManifestLoaded": _world_map_manifest_loaded(_world_route_assets_manifest),
		"worldMapRouteManifestPath": THEME_WORLD_ROUTE_ASSETS_MANIFEST_PATH,
		"worldMapRouteAuthorityStatus": _world_map_manifest_authority_status(_world_route_assets_manifest),
		"worldMapRouteFamilyCount": _world_map_manifest_family_count(_world_route_assets_manifest, "routeFamilies"),
		"worldMapRouteVisibleLayerTokens": _world_map_manifest_visible_layer_tokens_for("route_overlay"),
		"worldMapRouteZoomTiers": _world_map_manifest_zoom_tiers(_world_route_assets_manifest),
		"worldMapEventMarkerManifestLoaded": _world_map_manifest_loaded(_world_event_marker_manifest),
		"worldMapEventMarkerManifestPath": THEME_WORLD_EVENT_MARKER_MANIFEST_PATH,
		"worldMapEventMarkerAuthorityStatus": _world_map_manifest_authority_status(_world_event_marker_manifest),
		"worldMapEventMarkerFamilyCount": _world_map_manifest_family_count(_world_event_marker_manifest, "markerFamilies"),
		"worldMapEventMarkerVisibleLayerTokens": _world_map_manifest_visible_layer_tokens_for("event_marker_overlay"),
		"worldMapEventMarkerZoomTiers": _world_map_manifest_zoom_tiers(_world_event_marker_manifest),
		"worldMapLabelChromeManifestLoaded": _world_map_manifest_loaded(_world_label_chrome_manifest),
		"worldMapLabelChromeManifestPath": THEME_WORLD_LABEL_CHROME_MANIFEST_PATH,
		"worldMapLabelChromeAuthorityStatus": _world_map_manifest_authority_status(_world_label_chrome_manifest),
		"worldMapLabelChromeFamilyCount": _world_map_manifest_family_count(_world_label_chrome_manifest, "labelFamilies"),
		"worldMapLabelChromeVisibleLayerTokens": _world_map_manifest_visible_layer_tokens_for("label_chrome_overlay"),
		"worldMapLabelChromeZoomTiers": _world_map_manifest_zoom_tiers(_world_label_chrome_manifest),
		"viewTransformRestoreCount": _last_view_transform_restore_count,
		"zeroLevelSubstrateEnabled": zero_level_substrate_enabled,
		"zeroLevelSubstrateTextureLoaded": _zero_level_substrate_texture != null,
		"zeroLevelSubstrateDrawCount": _last_zero_level_substrate_draw_count,
		"zeroLevelGroundObjectMode": "implicit_base_map",
		"projectionScaledToPreview": _is_main_map_projection_scaled_to_preview(),
		"selectedCell": get_selected_main_map_cell_action_context(),
	}


func _tianxia_yutu_runtime_faction_color_entry_count() -> int:
	var faction_layer: Dictionary = _tianxia_yutu_overview_layer.get("faction_color_layer", {}) as Dictionary if _tianxia_yutu_overview_layer.get("faction_color_layer", {}) is Dictionary else {}
	var runtime_entries: Variant = faction_layer.get("current_runtime_color_entries", [])
	return (runtime_entries as Array).size() if runtime_entries is Array else 0


func _tianxia_yutu_frontline_marker_count() -> int:
	var strategic_layer: Dictionary = _tianxia_yutu_overview_layer.get("strategic_overlay_layer", {}) as Dictionary if _tianxia_yutu_overview_layer.get("strategic_overlay_layer", {}) is Dictionary else {}
	var frontline_markers: Variant = strategic_layer.get("frontline_markers", [])
	return (frontline_markers as Array).size() if frontline_markers is Array else 0


func _tianxia_yutu_state_boundary_segment_count() -> int:
	var strategic_layer: Dictionary = _tianxia_yutu_overview_layer.get("strategic_overlay_layer", {}) as Dictionary if _tianxia_yutu_overview_layer.get("strategic_overlay_layer", {}) is Dictionary else {}
	var segments: Variant = strategic_layer.get("state_boundary_segments", [])
	return (segments as Array).size() if segments is Array else 0


func _main_map_loaded_chunk_ids_string() -> String:
	var packed: PackedStringArray = PackedStringArray()
	for chunk_id_variant in _main_map_loaded_chunk_ids:
		var chunk_id: String = str(chunk_id_variant).strip_edges()
		if chunk_id != "":
			packed.append(chunk_id)
	return ",".join(packed)


func _map_tmx_axis_to_main_map_cell(tmx_axis_value: float, tmx_axis_size: int, world_axis_size: int) -> int:
	if world_axis_size <= 1:
		return 0
	if tmx_axis_size <= 1:
		return clampi(int(round(tmx_axis_value)), 0, world_axis_size - 1)
	var ratio: float = clampf(tmx_axis_value / float(tmx_axis_size - 1), 0.0, 1.0)
	return clampi(int(round(ratio * float(world_axis_size - 1))), 0, world_axis_size - 1)


func _map_main_map_axis_to_tmx(world_axis_value: int, tmx_axis_size: int, world_axis_size: int) -> int:
	if tmx_axis_size <= 1:
		return 0
	if world_axis_size <= 1:
		return clampi(world_axis_value, 0, tmx_axis_size - 1)
	var ratio: float = clampf(float(world_axis_value) / float(world_axis_size - 1), 0.0, 1.0)
	return clampi(int(round(ratio * float(tmx_axis_size - 1))), 0, tmx_axis_size - 1)


func _compute_visible_tmx_bounds_with_margin(margin_tiles: int, target_zoom: float = -1.0) -> Dictionary:
	var runtime_width: int = _main_map_runtime_tmx_width()
	var runtime_height: int = _main_map_runtime_tmx_height()
	if runtime_width <= 0 or runtime_height <= 0:
		return {"valid": false}
	var bounds_zoom: float = _zoom if target_zoom <= 0.0 else target_zoom
	var viewport_rect: Rect2 = get_viewport_rect()
	var corners: Array = [
		viewport_rect.position,
		viewport_rect.position + Vector2(viewport_rect.size.x, 0.0),
		viewport_rect.position + Vector2(0.0, viewport_rect.size.y),
		viewport_rect.position + viewport_rect.size,
	]
	var min_u: float = INF
	var max_u: float = -INF
	var min_v: float = INF
	var max_v: float = -INF
	for corner_variant in corners:
		var corner: Vector2 = corner_variant as Vector2
		var uv: Vector2 = _screen_to_tmx(corner, bounds_zoom)
		min_u = min(min_u, uv.x)
		max_u = max(max_u, uv.x)
		min_v = min(min_v, uv.y)
		max_v = max(max_v, uv.y)

	var start_x: int = clampi(int(floor(min_u)) - margin_tiles, 0, runtime_width - 1)
	var end_x: int = clampi(int(ceil(max_u)) + margin_tiles, 0, runtime_width - 1)
	var start_y: int = clampi(int(floor(min_v)) - margin_tiles, 0, runtime_height - 1)
	var end_y: int = clampi(int(ceil(max_v)) + margin_tiles, 0, runtime_height - 1)
	if start_x > end_x or start_y > end_y:
		return {"valid": false}
	return {
		"valid": true,
		"startX": start_x,
		"endX": end_x,
		"startY": start_y,
		"endY": end_y,
	}


func _tmx_to_screen(tmx_x: int, tmx_y: int) -> Vector2:
	var world_x: float = (float(tmx_x) - float(tmx_y)) * (_tmx_tile_width * 0.5)
	var world_y: float = (float(tmx_x) + float(tmx_y)) * (_tmx_tile_height * 0.5)
	return _draw_origin + _pan_offset + Vector2(world_x, world_y) * _zoom


func _screen_to_tmx(screen_pos: Vector2, target_zoom: float) -> Vector2:
	var safe_zoom: float = max(0.0001, target_zoom)
	var local: Vector2 = (screen_pos - _draw_origin - _pan_offset) / safe_zoom
	var half_w: float = max(0.001, _tmx_tile_width * 0.5)
	var half_h: float = max(0.001, _tmx_tile_height * 0.5)
	var a: float = local.x / half_w
	var b: float = local.y / half_h
	var u: float = (a + b) * 0.5
	var v: float = (b - a) * 0.5
	return Vector2(u, v)


func _coord_key(tile_x: int, tile_y: int) -> String:
	return "%d:%d" % [tile_x, tile_y]


func tile_to_screen_position(tile_x: int, tile_y: int) -> Vector2:
	var coord_key: String = _coord_key(tile_x, tile_y)
	if _tmx_cell_by_coord_key.has(coord_key):
		var cached_cell: Vector2i = _tmx_cell_by_coord_key[coord_key] as Vector2i
		return _tmx_to_screen(cached_cell.x, cached_cell.y)

	var mapped_x: int = _map_backend_to_tmx_axis(tile_x, _backend_x_min, _backend_x_max, _tmx_map_width)
	var mapped_y: int = _map_backend_to_tmx_axis(tile_y, _backend_y_min, _backend_y_max, _tmx_map_height)
	return _tmx_to_screen(mapped_x, mapped_y)


func tile_id_to_screen_position(tile_id: String, fallback_x: int = 0, fallback_y: int = 0) -> Vector2:
	var normalized_tile_id: String = tile_id.strip_edges()
	if _is_main_world_substrate_chunk_renderer_active() and fallback_x >= 1000 and fallback_y >= 1000:
		return _tmx_to_screen(
			clampi(fallback_x, 0, MAIN_MAP_WORLD_WIDTH_CELLS - 1),
			clampi(fallback_y, 0, MAIN_MAP_WORLD_HEIGHT_CELLS - 1)
		)
	if normalized_tile_id != "" and _tmx_cell_by_tile_id.has(normalized_tile_id):
		var cached_cell: Vector2i = _tmx_cell_by_tile_id[normalized_tile_id] as Vector2i
		return _tmx_to_screen(cached_cell.x, cached_cell.y)
	return tile_to_screen_position(fallback_x, fallback_y)


func _map_backend_to_tmx_axis(value: int, min_axis: int, max_axis: int, tmx_size: int) -> int:
	if tmx_size <= 1:
		return 0
	if max_axis <= min_axis:
		return 0
	var ratio: float = clampf((float(value) - float(min_axis)) / max(1.0, float(max_axis - min_axis)), 0.0, 1.0)
	return clampi(int(round(ratio * float(tmx_size - 1))), 0, tmx_size - 1)


func get_view_state() -> Dictionary:
	return {
		"zoom": _zoom,
		"panOffsetX": _pan_offset.x,
		"panOffsetY": _pan_offset.y,
		"drawOriginX": _draw_origin.x,
		"drawOriginY": _draw_origin.y,
		"tmxTileWidth": _tmx_tile_width,
		"tmxTileHeight": _tmx_tile_height,
		"tmxMapWidth": _tmx_map_width,
		"tmxMapHeight": _tmx_map_height,
	}


func _emit_view_transform_changed() -> void:
	view_transform_changed.emit(get_view_state())
