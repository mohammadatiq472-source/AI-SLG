#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import struct
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
RUNNER = REPO_ROOT / "godot-client" / "tools" / "run_mainline_visual_smoke.py"
DEFAULT_REPORT_PATH = REPO_ROOT / "tmp" / "gates" / "mainline_ui_closure_batch_latest.json"
DEMO_STORY_LIVING_WORLD_MOBILE_LANDSCAPE_PROFILE = "demo_story_living_world_mobile_landscape"
DEMO_STORY_LIVING_WORLD_MOBILE_LANDSCAPE_ACTIONS = [
    "world_shell_ai_activity_badge_fixture",
    "world_ai_activity_card_from_marker_fixture",
    "battle_report_seeded_open_detail",
    "world_click_main_city_node_troop_assign_preview_open_first_team",
    "world_open_main_city_organization_policy",
    "world_tianxia_yutu_product_acceptance_qa",
]
MAIN_CITY_FACILITY_TREE_READ_MODEL_PATH = REPO_ROOT / "godot-client" / "data" / "ui" / "main_city_facility_tree_read_model.json"
MAIN_CITY_FACILITY_TREE_READ_MODEL_CONTRACT_PATH = REPO_ROOT / "docs" / "MAIN_CITY_FACILITY_TREE_READ_MODEL_CONTRACT_2026_05_24.md"
MAIN_CITY_INTERIOR_READ_MODEL_PATH = REPO_ROOT / "godot-client" / "data" / "ui" / "main_city_interior_player_read_model.json"
MAIN_CITY_INTERIOR_READ_MODEL_CONTRACT_PATH = REPO_ROOT / "docs" / "MAIN_CITY_INTERIOR_PLAYER_READ_MODEL_CONTRACT_2026_05_24.md"
MAIN_CITY_TROOP_FORMATION_READ_MODEL_PATH = REPO_ROOT / "godot-client" / "data" / "ui" / "main_city_troop_formation_read_model.json"
WORLD_EVENT_ACTIVITY_TEMPLATE_FIXTURE_PATH = REPO_ROOT / "godot-client" / "data" / "ui" / "world_event_activity_template_fixture.json"
ORGANIZATION_LIFECYCLE_FIXTURE_PATH = REPO_ROOT / "godot-client" / "data" / "ui" / "organization_lifecycle_preview_read_model.json"
MAIN_CITY_HUB_OVERLAY_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "main_city_hub_overlay.gd"
MAIN_APP_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "app" / "main.gd"
MAIN_CITY_INTERIOR_PANEL_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "interior_panel.gd"
TROOP_PANEL_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "troop_panel.gd"
AI_PANEL_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "ai_panel.gd"
AI_PANEL_PRESENTER_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "presenters" / "ai_panel_presenter.gd"
MAIN_CHAT_OVERLAY_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "main_chat_overlay.gd"
SNAPSHOT_PANEL_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "slg_snapshot_panel.gd"
SNAPSHOT_SECTION_PAGE_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "slg_snapshot_section_page.gd"
SLG_UI_COMPONENT_FACTORY_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "slg_ui_component_factory.gd"
WORLD_EVENT_ACTIVITY_PANEL_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "world_event_activity_panel.gd"
ALLIANCE_PANEL_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "alliance_panel.gd"
ALLIANCE_PRESENTER_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "presenters" / "alliance_presenter.gd"
HERO_CARD_VIEW_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "formal_pack" / "components" / "hero_card_view.gd"
FORMAL_PACK_ASSET_REGISTRY_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "formal_pack" / "components" / "formal_pack_asset_registry.gd"
RECRUIT_FORMAL_PACK_RENDERER_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "recruit_components" / "recruit_formal_pack_renderer.gd"
RECRUIT_FORMAL_PACK_PREVIEW_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "formal_pack" / "recruit" / "recruit_formal_pack_preview.gd"
RECRUIT_GENERAL_FORMAL_PACK_PREVIEW_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "formal_pack" / "recruit_general" / "recruit_general_formal_pack_preview.gd"
DRAW_RESULT_FORMAL_PACK_PREVIEW_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "formal_pack" / "draw_result" / "draw_result_formal_pack_preview.gd"
RECRUIT_PANEL_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "recruit_panel.gd"
RECRUIT_PRESENTER_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "presenters" / "recruit_presenter.gd"
GENERAL_PANEL_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "general_panel.gd"
GENERAL_ROSTER_FORMAL_PACK_PREVIEW_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "formal_pack" / "general_roster" / "general_roster_formal_pack_preview.gd"
GENERAL_PRESENTER_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "presenters" / "general_presenter.gd"
GENERAL_PROFILE_STAGE_RENDERER_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "general_components" / "general_profile_stage_renderer.gd"
GENERAL_PROFILE_CONTENT_RENDERER_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "general_components" / "general_profile_content_renderer.gd"
GENERAL_PROFILE_GROWTH_RENDERER_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "general_components" / "general_profile_growth_renderer.gd"
GENERAL_PROFILE_SKILL_LIBRARY_RENDERER_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "general_components" / "general_profile_skill_library_renderer.gd"
GENERAL_SKILL_LIBRARY_PREVIEW_PATH = REPO_ROOT / "godot-client" / "data" / "ui" / "general_skill_library_preview.json"
GENERAL_ROSTER_LIST_RENDERER_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "general_components" / "general_roster_list_renderer.gd"
BATTLE_REPORT_LIST_PAGE_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "battle_report_list_page.gd"
BATTLE_REPORT_PANEL_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "battle_report_panel.gd"
BATTLE_REPORT_DETAIL_PAGE_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "battle_report_detail_page.gd"
BATTLE_REPORT_PORTRAIT_REGISTRY_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "battle_report_portrait_registry.gd"
BATTLE_REPORT_PRESENTER_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "presenters" / "battle_report_presenter.gd"
PORTRAIT_ASSET_REGISTRY_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "portrait_asset_registry.gd"
UI_COMPONENT_FACTORY_SCRIPT_PATH = REPO_ROOT / "godot-client" / "scripts" / "ui" / "slg_ui_component_factory.gd"
VISUAL_DESIGN_SYSTEM_ID = "slg_gold_black_v1"
VISUAL_DESIGN_TOKEN_SOURCE = "slg_ui_component_factory"
VISUAL_DESIGN_TOKEN_VERSION = "tokens:v1"
VISUAL_SURFACE_TONE = "warm_lift_reading_v3"
VISUAL_SURFACE_DENSITY = "soft_gold_borders_v1"
VISUAL_DATA_MODE = "preview_read_model_shell"
FULLSCREEN_SHELL_CHROME_TOKEN = "fullscreen_shell_chrome_v2"
VISUAL_CARD_DEPTH_TOKEN = "soft_gold_card_depth_v1"
TIANXIA_YUTU_MARKER_LABEL_POLISH_SPEC_TOKEN = "tianxia_yutu_marker_label_polish_v2"
AI_LIVING_ACTIVITY_MARKER_FAMILY_TOKEN = "ai_living_activity_marker_family_v1"
INTERIOR_TAX_TREASURY_LAYOUT_PRIORITY_TOKEN = "interior_tax_treasury_layout_priority_v1"
TIANXIA_YUTU_LIVING_WORLD_MARKER_CLUSTER_TOKEN = "tianxia_yutu_living_world_marker_cluster_v1"
TIANXIA_YUTU_AI_ACTIVITY_LABEL_PRIORITY_TOKEN = "tianxia_yutu_ai_activity_label_priority_v1"
TIANXIA_YUTU_LABEL_PRIORITY_PRODUCT_ACCEPTANCE_TOKEN = "tianxia_yutu_label_priority_product_acceptance_v1"
TIANXIA_YUTU_AI_HOTSPOT_VISUAL_ASSET_TOKEN = "tianxia_yutu_ai_hotspot_visual_asset_v1"
TIANXIA_YUTU_AI_HOTSPOT_INFO_ASSET_TOKEN = "tianxia_yutu_ai_hotspot_info_asset_v1"
TIANXIA_YUTU_AI_ROUTE_INTENT_ASSET_TOKEN = "tianxia_yutu_ai_route_intent_asset_v1"
TIANXIA_YUTU_AI_ROUTE_HEADING_TOKEN = "tianxia_yutu_ai_route_heading_v1"
TIANXIA_YUTU_AI_ROUTE_STATE_VARIANT_TOKEN = "tianxia_yutu_ai_route_state_variant_v1"
HERO_CARD_TOKEN_MODE = "hero_card_tokens:v1"
HERO_CARD_PANEL_STYLE_TOKEN = "formal_pack_hero_card_panel"
HERO_CARD_BUTTON_STYLE_TOKEN = "formal_pack_hero_card_button"
HERO_CARD_FONT_BUCKET = "hero_card_compact_scale_v1"
HERO_CARD_FULL_LAYOUT_PRESET_ID = "hero_full_card_340x510_v1"
HERO_CARD_FULL_LAYOUT_WIDTH = 340
HERO_CARD_FULL_LAYOUT_HEIGHT = 510
HERO_CARD_FULL_LAYOUT_GAP = 22
TROOP_TEAM_CARD_BUTTON_TOKEN = "troop_team_card_button_v1"
TROOP_TEAM_CARD_LIVE_TEXT_CONTRACT = "troop_team_card_live_text_v1"
TROOP_DETAIL_ACTION_BUTTON_TOKEN = "troop_detail_action_button_v1"
TROOP_DETAIL_ACTION_LIVE_TEXT_CONTRACT = "troop_detail_action_live_text_v1"
TROOP_DETAIL_BACK_BUTTON_TOKEN = "troop_detail_back_button_v1"
TROOP_DETAIL_BACK_LIVE_TEXT_CONTRACT = "troop_detail_back_live_text_v1"
RECRUIT_FORMAL_PACK_ACTION_BUTTON_TOKEN = "recruit_formal_pack_action_button_v1"
RECRUIT_DRAW_COMMAND_BG_TOKEN = "recruit_draw_command_bg_v1"
MAIN_CITY_WORLD_ANCHOR_ENTRY_POPOVER_TOKEN = "main_city_world_anchor_entry_popover_v1"
MAIN_CITY_WORLD_ASSET_ENTRY_BUTTON_TOKEN = "main_city_world_asset_entry_button_v1"
MAIN_CITY_WORLD_ASSET_ENTER_CAMERA_PUSH_TOKEN = "main_city_world_asset_enter_camera_push_v1"
MAIN_CITY_WORLD_ASSET_CAMERA_EASE_TOKEN = "main_city_world_asset_camera_ease_v2"
MAIN_CITY_CONTEXT_RETURN_BUTTON_TOKEN = "main_city_context_return_button_v1"
MAIN_CITY_CONTEXT_RETURN_LIVE_TEXT_CONTRACT = "main_city_context_return_live_text_v1"
MAIN_CITY_ENTER_TRANSITION_MASK_TOKEN = "main_city_enter_transition_mask_v1"
MAIN_CITY_ENTERED_SPACE_STAGE_LAYOUT_TOKEN = "main_city_entered_space_stage_layout_v2"
MAIN_CITY_GATEHOUSE_TRANSITION_TOKEN = "main_city_gatehouse_axis_mansion_transition_v1"
MAIN_CITY_MANSION_HIGHLIGHT_TOKEN = "main_city_mansion_highlight_focus_v1"
RECRUIT_FORMAL_PACK_RESOURCE_CHIP_TOKEN = "recruit_formal_pack_resource_chip_v1"
RECRUIT_FORMAL_PACK_CORNER_BADGE_TOKEN = "recruit_formal_pack_corner_badge_v1"
RECRUIT_FORMAL_PACK_EMPTY_PANEL_TOKEN = "recruit_formal_pack_empty_panel_v1"
RECRUIT_FORMAL_PACK_PRICE_PLATE_TOKEN = "recruit_formal_pack_price_plate_v1"
RECRUIT_FORMAL_PACK_HEADER_TOKEN = "recruit_formal_pack_header_v1"
RECRUIT_FORMAL_PACK_SMALL_BADGE_TOKEN = "recruit_formal_pack_small_badge_v1"
RECRUIT_FORMAL_PACK_STATE_LINE_TOKEN = "recruit_formal_pack_state_line_v1"
CARD_RAIL_LAYOUT_TOKEN = "card_rail_touch_horizontal_v1"
CARD_RAIL_SCROLL_MODE = "hidden_scrollbar_touch_horizontal_v1"
CARD_RAIL_SCROLLBAR_VISIBILITY = "hidden"
CARD_RAIL_REPEAT_ACTION_GAP = 34
CARD_RAIL_FULL_CARD_MIN_HEIGHT = HERO_CARD_FULL_LAYOUT_HEIGHT + 18
CARD_RAIL_FULL_CARD_VIEWPORT_WIDTH_3 = HERO_CARD_FULL_LAYOUT_WIDTH * 3 + HERO_CARD_FULL_LAYOUT_GAP * 2
CARD_RAIL_FULL_CARD_CONTENT_WIDTH_5 = HERO_CARD_FULL_LAYOUT_WIDTH * 5 + HERO_CARD_FULL_LAYOUT_GAP * 4
SKILL_CARD_ART_WIDTH = 680
SKILL_CARD_ART_HEIGHT = 1020
SKILL_CARD_ART_TYPES = ("追击", "主动", "被动", "指挥")
SKILL_CARD_ART_PATHS = {
    "追击": "res://data/ui/generated_skill_cards/v2_no_crop/skill_card_chase_v2_safe.png",
    "主动": "res://data/ui/generated_skill_cards/v2_no_crop/skill_card_active_v2_safe.png",
    "被动": "res://data/ui/generated_skill_cards/v2_no_crop/skill_card_passive_v2_safe.png",
    "指挥": "res://data/ui/generated_skill_cards/v2_no_crop/skill_card_command_v2_safe.png",
}
SKILL_CARD_ART_FIT_MODE = "contain_no_crop"
SKILL_CARD_ART_SAFE_MARGIN = "skill_card_art_no_crop_safe_v1"
SKILL_CARD_ART_PREPROCESS = "skill_card_v2_scaled_2x_no_crop_safe_zones_v1"
TROOP_FORMATION_TEAM_CARD_WIDTH = 218
TROOP_FORMATION_TEAM_CARD_HEIGHT = 258
TROOP_FORMATION_TEAM_CARD_GAP = 18
TROOP_FORMATION_TEAM_CARD_MIN_HEIGHT = TROOP_FORMATION_TEAM_CARD_HEIGHT + 18
TROOP_FORMATION_TEAM_CARD_VIEWPORT_WIDTH_3 = TROOP_FORMATION_TEAM_CARD_WIDTH * 3 + TROOP_FORMATION_TEAM_CARD_GAP * 2
TROOP_FORMATION_TEAM_CARD_CONTENT_WIDTH_5 = TROOP_FORMATION_TEAM_CARD_WIDTH * 5 + TROOP_FORMATION_TEAM_CARD_GAP * 4
WORLD_EVENT_ACTIVITY_SHELL_TOKEN = "world_event_activity_shell_v1"
SNAPSHOT_FEATURE_CARD_GRID_TOKEN = "snapshot_feature_card_showcase_grid_v1"
SNAPSHOT_FEATURE_CARD_SHOWCASE_COMPOSITION_TOKEN = "snapshot_feature_card_showcase_composition_v1"
SNAPSHOT_FEATURE_CARD_CHROME_TOKEN = "snapshot_feature_card_chrome_v1"
SNAPSHOT_FEATURE_CARD_TITLE_BAR_TOKEN = "snapshot_feature_card_title_bar_v1"
SNAPSHOT_FEATURE_CARD_PLACEHOLDER_TOKEN = "snapshot_feature_card_placeholder_v1"
SNAPSHOT_FEATURE_CARD_RENDER_STATE_TOKEN = "snapshot_feature_card_render_state_v1"
SNAPSHOT_FEATURE_CARD_CAPTION_ROW_TOKEN = "snapshot_feature_card_caption_row_v1"
SNAPSHOT_FEATURE_CARD_IMAGE_SLOT_TOKEN = "snapshot_feature_card_image_slot_v1"
SNAPSHOT_FEATURE_CARD_PLACEHOLDER_ART_TOKEN = "snapshot_feature_card_placeholder_art_v1"
SNAPSHOT_FEATURE_CARD_ASSET_ROOT_TOKEN = "snapshot_feature_card_asset_roots_v1"
MAINLINE_UI_MOTION_SYSTEM_TOKEN = "mainline_ui_motion_system_v1"
MOTION_TOKENS = {
    "page_enter_fade_v1",
    "page_enter_lift_v1",
    "card_stagger_enter_v1",
    "focus_cta_pulse_v1",
    "reward_glow_v1",
    "modal_pop_v1",
    "disabled_soft_state_v1",
    "activity_unfurl_enter_v1",
    "activity_scroll_unfurl_v2",
    "activity_empty_drop_unfurl_v3",
    "recruit_pack_enter_v1",
    "recruit_hero_card_enter_v1",
    "battle_report_list_enter_v1",
    "interior_section_enter_v1",
    "ai_chat_panel_enter_v1",
    "general_panel_enter_v1",
    "skill_library_browser_enter_v1",
    "troop_panel_enter_v1",
    "snapshot_edge_page_enter_v1",
}
SNAPSHOT_EDGE_PAGE_ENTER_TOKEN = "snapshot_edge_page_enter_v1"
ACTIVITY_MOTION_SAMPLE_TOKEN = "activity_motion_showcase_sample_v1"
WORLD_EVENT_ACTIVITY_CARD_ALLOWED_ASSET_ROOTS = ("res://data/ui/world_event_activity_asset_drop/",)
WORLD_EVENT_ACTIVITY_CARD_WIDTH = 336
WORLD_EVENT_ACTIVITY_CARD_HEIGHT = 244
WORLD_EVENT_ACTIVITY_CARD_GAP = 22
WORLD_EVENT_ACTIVITY_CARD_IMAGE_HEIGHT = 176
SNAPSHOT_SECTION_ACTION_BUTTON_TOKEN = "snapshot_section_action_button_v1"
SNAPSHOT_FEATURE_STATUS_CHIP_TOKEN = "snapshot_feature_status_chip_v1"
VISUAL_WARM_LIFT_SOURCE_MARKERS = (
    'const VISUAL_SURFACE_TONE := "warm_lift_reading_v3"',
    'const VISUAL_CARD_DEPTH_TOKEN := "soft_gold_card_depth_v1"',
    'const FULLSCREEN_SHELL_CHROME_TOKEN := "fullscreen_shell_chrome_v2"',
    "const FULLSCREEN_BACKDROP_COLOR := Color(0.125, 0.088, 0.048, 1.0)",
    "const FULLSCREEN_PANEL_BG := Color(0.182, 0.124, 0.064, 0.960)",
    "const FULLSCREEN_PANEL_BORDER := Color(0.86, 0.62, 0.30, 0.66)",
    "Color(0.182, 0.122, 0.060, 0.78)",
    "Color(0.210, 0.142, 0.070, 0.94)",
    "Color(0.214, 0.146, 0.074, 0.90)",
    "Color(0.150, 0.104, 0.058, 0.34)",
    "Color(0.192, 0.126, 0.064, 0.78)",
    "Color(0.226, 0.154, 0.078, 0.82)",
    "Color(0.300, 0.205, 0.095, 0.96)",
    "Color(0.220, 0.138, 0.052, 0.90)",
    "Color(0.176, 0.116, 0.058, 0.92)",
    "Color(0.204, 0.132, 0.064, 0.94)",
    "Color(0.184, 0.118, 0.056, 0.90)",
    "style.shadow_color = Color(0.45, 0.26, 0.08, shadow_alpha)",
    "style.shadow_size = depth",
    "style.shadow_size = 8",
    "make_surface_panel_style(Color(0.204, 0.132, 0.064, 0.94), Color(1.00, 0.72, 0.32, 0.80), 1, 4, 10, 0.20)",
)
BATTLE_REPORT_SHELL_TOKEN = "battle_report_shell_v1"
BATTLE_REPORT_SHELL_ICON_BUTTON_TOKEN = "battle_report_shell_icon_button_v1"
BATTLE_REPORT_CLEAN_LIST_CHROME_MODE = "battle_report_clean_list_no_summary_state_v1"
BATTLE_REPORT_CLOSE_BUTTON_MODE = "general_profile_close_button_danger_v1"
BATTLE_REPORT_LIST_MODE_TAB_TOKEN = "battle_report_list_mode_tab_v1"
BATTLE_REPORT_LIST_SUMMARY_TOKEN = "battle_report_list_summary_v1"
BATTLE_REPORT_LIST_UTILITY_TOKEN = "battle_report_list_utility_rail_v1"
BATTLE_REPORT_EMPTY_STATE_TOKEN = "battle_report_empty_state_v1"
BATTLE_REPORT_EMPTY_STATE_PREVIEW_TOKEN = "battle_report_empty_state_preview_v1"
BATTLE_REPORT_LIST_CARD_TOKEN = "battle_report_list_card_v1"
BATTLE_REPORT_LIST_CARD_HIERARCHY_TOKEN = "battle_report_list_card_result_first_hierarchy_v1"
BATTLE_REPORT_LIST_CARD_DOSSIER_DENSITY_TOKEN = "battle_report_list_card_dossier_density_v1"
BATTLE_REPORT_AI_ACTION_RESULT_CARD_TOKEN = "battle_report_ai_action_result_card_v1"
BATTLE_REPORT_LIST_CARD_SELECTED_STATE_TOKEN = "battle_report_list_card_selected_state_v1"
BATTLE_REPORT_LIST_HERO_CARD_READABILITY_TOKEN = "battle_report_list_hero_card_readability_v1"
BATTLE_REPORT_LIST_CARD_HEADER_TOKEN = "battle_report_list_card_header_v1"
BATTLE_REPORT_LIST_CARD_BADGE_TOKEN = "battle_report_list_card_badge_v2"
BATTLE_REPORT_LIST_STRUCTURE_BOX_TOKEN = "battle_report_list_structure_box_v1"
BATTLE_REPORT_LIST_CARD_BODY_TOKEN = "battle_report_list_card_body_v1"
BATTLE_REPORT_LIST_DETAIL_ENTRY_TOKEN = "battle_report_list_detail_entry_v1"
BATTLE_REPORT_DETAIL_TAB_BUTTON_TOKEN = "battle_report_detail_tab_button_v1"
BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN = "battle_report_detail_footer_button_v1"
BATTLE_REPORT_DETAIL_BUTTON_LIVE_TEXT_CONTRACT = "battle_report_detail_button_live_text_v1"
BATTLE_REPORT_DETAIL_EMPTY_BLOCK_TOKEN = "battle_report_detail_empty_block_v1"
BATTLE_REPORT_DETAIL_VISUAL_STAGE_TOKEN = "battle_report_detail_game_stage_v2"
BATTLE_REPORT_DETAIL_RESULT_FOCUS_TOKEN = "battle_report_detail_center_result_focus_v1"
BATTLE_REPORT_DETAIL_TEAM_CARD_TOKEN = "battle_report_detail_opposed_army_card_v2"
BATTLE_REPORT_DETAIL_REWARD_PANEL_TOKEN = "battle_report_detail_reward_replay_panel_v2"
BATTLE_REPORT_DETAIL_CARD_COMPOSITION_TOKEN = "battle_report_detail_card_composition_v1"
BATTLE_REPORT_DETAIL_AI_LIVING_FEEDBACK_TOKEN = "battle_report_detail_ai_living_feedback_v1"
BATTLE_REPORT_DETAIL_AI_ACTIVITY_CONTINUITY_TOKEN = "battle_report_detail_ai_activity_continuity_v1"
AI_AVATAR_STATUS_FRAME_FAMILY_TOKEN = "ai_avatar_status_frame_family_v1"
AI_ACTIVITY_CARRYING_TROOPS_CHIP_TOKEN = "ai_activity_carrying_troops_chip_v1"
GENERATED_TROOPS_ILLUSTRATION_SOURCE = "generated_troops_illustration_v1"
BATTLE_REPORT_DETAIL_REWARD_COPY_MODE = "reward_only_no_summary_or_replay_v1"
BATTLE_REPORT_DETAIL_HERO_INFO_MODE = "troop_and_level_only_no_skill_line_v1"
BATTLE_REPORT_DETAIL_SEARCH_VISIBILITY_MODE = "detail_page_hides_header_search_v1"
BATTLE_REPORT_REAL_DATA_SOURCE_MODE = "battle_report_real_data_world_reports_feedback_records_v1"
BATTLE_REPORT_OWNER_SCOPE_MODE = "human_and_ai_player_battle_report_owner_scope_v1"
BATTLE_REPORT_AI_OWNER_ATTRIBUTION_MODE = "ai_player_battle_report_owner_attribution_v1"
BATTLE_REPORT_ORGANIZATION_SOURCE_FILTER_MODE = "organization_battle_report_source_filter_v1"
BATTLE_REPORT_DETAIL_SCROLL_MODE = "hidden_scrollbar_touch_scroll"
BATTLE_REPORT_DETAIL_SCROLL_VERTICAL_MODE_SHOW_NEVER = 3
BATTLE_REPORT_DETAIL_STAR_FALLBACK_POLICY = "data_star_or_blank_v1"
BATTLE_REPORT_LIST_PORTRAIT_FRAME_VARIANT = "list_thumb"
BATTLE_REPORT_DETAIL_PORTRAIT_FRAME_VARIANT = "detail_large"
BATTLE_REPORT_SAFE_PORTRAIT_FIT_MODE = "contained_safe"
BATTLE_REPORT_DETAIL_PORTRAIT_FIT_MODE = "cover_crop_no_deform"
BATTLE_REPORT_SAFE_PORTRAIT_ASSET_SOURCE = "locked_preview_or_display_preview"
BATTLE_REPORT_SAFE_PORTRAIT_STAGE_ASPECT = "4:5"
BATTLE_REPORT_SAFE_PORTRAIT_MARGIN = "portrait_safe_margin_medium"
PORTRAIT_FRAME_HERO_CARD_VARIANT = "hero_card"
PORTRAIT_FRAME_AVATAR_VARIANT = "avatar"
PORTRAIT_FRAME_ROSTER_CARD_VARIANT = "roster_card"
PORTRAIT_FRAME_DETAIL_LARGE_VARIANT = "detail_large"
PORTRAIT_FRAME_SAFE_FIT_MODE = "contained_safe"
PORTRAIT_FRAME_SAFE_ASSET_SOURCE = "locked_preview_or_display_preview"
PORTRAIT_FRAME_SAFE_STAGE_ASPECT = "4:5"
PORTRAIT_FRAME_SAFE_MARGIN = "portrait_safe_margin_medium"
PORTRAIT_FRAME_REGISTRY_ID = "portrait_asset_registry_v1"
PORTRAIT_DISPLAY_STRATEGY_SOURCE_ALLOWLIST = {
    "slg_ui_component_factory.gd",
}
PORTRAIT_HERO_ASSET_REF_SOURCE_ALLOWLIST = {
    "slg_ui_component_factory.gd",
}
PORTRAIT_ASSET_REF_PATH_FALLBACK_SOURCE_ALLOWLIST = {
    "interior_panel.gd",
    "main_city_hub_overlay.gd",
}
INTERIOR_BUILDING_TREE_GRAPH_TOKEN = "interior_building_tree_graph_v1"
INTERIOR_BUILDING_TREE_NODE_CARD_TOKEN = "interior_building_tree_node_card_v2"
INTERIOR_BUILDING_TREE_NODE_LABEL_STACK_TOKEN = "interior_building_tree_node_label_stack_v1"
INTERIOR_BUILDING_UPGRADE_SHEET_TOKEN = "interior_building_upgrade_sheet_v1"
INTERIOR_UPGRADE_SHEET_ACTION_STATE_TOKEN = "interior_upgrade_sheet_action_state_v1"
INTERIOR_FACILITY_NODE_HUB_TOKEN = "interior_facility_node_hub_v1"
INTERIOR_BUILDING_GROUP_COPY_DENSITY_TOKEN = "interior_building_group_copy_density_v1"
INTERIOR_BUILDING_GROUP_ORDER = "market/tax/policy"
INTERIOR_BUILDING_GROUP_NODE_LABEL_ORDER = "市井/仓廪/作坊|田赋司/仓储司/转运站|政令台/募兵令/守备司"
INTERIOR_HOME_LOBBY_TOKEN = "interior_home_lobby_v1"
INTERIOR_HOME_ENTRY_BUTTON_TOKEN = "interior_home_entry_button_v1"
INTERIOR_HOME_ENTRY_LIVE_TEXT_CONTRACT = "interior_home_entry_live_text_v1"
INTERIOR_HOME_ENTRY_CHROME_CONVERGENCE_TOKEN = "interior_home_entry_chrome_convergence_v1"
INTERIOR_AFFAIRS_CARD_CHROME_CONVERGENCE_TOKEN = "interior_affairs_card_chrome_convergence_v1"
INTERIOR_WORK_ORDER_ACTION_BUTTON_TOKEN = "interior_work_order_action_button_v1"
INTERIOR_WORK_ORDER_ACTION_LIVE_TEXT_CONTRACT = "interior_work_order_action_live_text_v1"
MAIL_PANEL_ROW_SELECT_BUTTON_TOKEN = "mail_panel_row_select_button_v1"
MAIL_PANEL_ROW_SELECT_LIVE_TEXT_CONTRACT = "mail_panel_row_select_live_text_v1"
PANEL_TAB_BUTTON_TOKEN = "panel_tab_button_v1"
PANEL_TAB_LIVE_TEXT_CONTRACT = "panel_tab_live_text_v1"
MAIN_CITY_SCENE_ENTRY_BUTTON_TOKEN = "main_city_scene_entry_button_v1"
MAIN_CITY_SCENE_ENTRY_LIVE_TEXT_CONTRACT = "main_city_scene_entry_live_text_v1"
MAIN_CITY_SCENE_RETURN_BUTTON_TOKEN = "main_city_scene_return_button_v1"
MAIN_CITY_SCENE_RETURN_LIVE_TEXT_CONTRACT = "main_city_scene_return_live_text_v1"
SETTINGS_ACTION_ROW_BUTTON_TOKEN = "settings_action_row_button_v1"
SETTINGS_ACTION_ROW_LIVE_TEXT_CONTRACT = "settings_action_row_live_text_v1"
INTERIOR_HOME_BACKGROUND_TOKEN = "interior_home_lobby_background_v1"
INTERIOR_HOME_RESOURCE_STRIP_TOKEN = "interior_home_resource_strip_v1"
INTERIOR_HOME_ENTRY_IDS = "market/trade/tax/affairs"
INTERIOR_SECONDARY_PAGE_TOKEN = "interior_secondary_page_v1"
INTERIOR_SECONDARY_ATMOSPHERE_TOKEN = "interior_secondary_atmosphere_background_v1"
INTERIOR_SECONDARY_CONSUMER_CARDS_TOKEN = "interior_secondary_consumer_cards_v1"
INTERIOR_SECONDARY_CARD_CHROME_CONVERGENCE_TOKEN = "interior_secondary_card_chrome_convergence_v1"
INTERIOR_MARKET_OVERVIEW_TOKEN = "interior_market_overview_cards_v1"
FULLSCREEN_PANEL_BACK_BUTTON_TOKEN = "fullscreen_panel_back_button_v1"
FULLSCREEN_PANEL_BACK_LIVE_TEXT_CONTRACT = "fullscreen_panel_back_live_text_v1"
GENERAL_PROFILE_TAB_STRIP_TOKEN = "general_profile_tab_strip_v1"
GENERAL_PROFILE_TAB_BUTTON_TOKEN = "general_profile_tab_button_v1"
GENERAL_PROFILE_BACK_BUTTON_TOKEN = "general_profile_back_button_v1"
GENERAL_PROFILE_CLOSE_BUTTON_TOKEN = "general_profile_close_button_v1"
CLOSE_BACK_BUTTON_SPEC_TOKEN = "close_back_button_spec_v1"
GENERAL_PROFILE_STAGE_ACTION_BUTTON_TOKEN = "general_profile_stage_action_button_v1"
GENERAL_PROFILE_ACTION_BG_TOKEN = "general_profile_action_bg_v1"
GENERAL_SKILL_DETAIL_POPUP_CLOSE_BUTTON_TOKEN = "general_skill_detail_popup_close_button_v1"
SKILL_FILTER_CHIP_BG_TOKEN = "skill_filter_chip_bg_v1"
AI_PANEL_ACTION_COMMAND_BG_TOKEN = "ai_panel_action_command_bg_v1"
AI_SWITCH_COMMAND_BG_TOKEN = "ai_switch_command_bg_v1"
CHAT_PAPER_ACTION_COMMAND_BG_TOKEN = "chat_paper_action_command_bg_v1"
CHAT_COMMAND_CHROME_TOKEN = "chat_command_chrome_v1"
CHAT_COMMAND_CHANNEL_RAIL_MODE = "command_chrome_text_channel_drawer_v1"
CHAT_AI_ACTIVITY_CONTINUITY_TOKEN = "chat_ai_activity_continuity_v1"
AI_ACTIVITY_SAME_TRACE_CROSS_SURFACE_TOKEN = "ai_activity_same_trace_cross_surface_v1"
AI_ACTIVITY_CARD_TRACE_CONTINUITY_RIBBON_TOKEN = "ai_activity_card_trace_continuity_ribbon_v1"
AI_ACTIVITY_IDENTITY_CHIP_TOKEN = "ai_activity_identity_chip_v1"
SHELL_COMMAND_CHROME_TOKEN = "shell_command_chrome_v1"
ORGANIZATION_HOME_ENTRY_BUTTON_TOKEN = "organization_home_entry_button_v1"
ORGANIZATION_HOME_ENTRY_LIVE_TEXT_CONTRACT = "organization_home_entry_live_text_v1"
GENERAL_PROFILE_ATTRIBUTE_CHIP_TOKEN = "general_profile_attribute_chip_v1"
GENERAL_PROFILE_SKILL_BUTTON_TOKEN = "general_profile_skill_button_v1"
GENERAL_PROFILE_PROGRESS_LINE_TOKEN = "general_profile_progress_line_v1"
GENERAL_PROFILE_SMALL_TAG_TOKEN = "general_profile_small_tag_v1"
GENERAL_ROSTER_CLOSE_BUTTON_TOKEN = "general_roster_close_button_v1"
GENERAL_ROSTER_DETAIL_BUTTON_TOKEN = "general_roster_detail_button_v1"
GENERAL_TACTICS_SCHEME_TAB_TOKEN = "general_tactics_scheme_tab_v1"
GENERAL_TACTICS_STEP_BUTTON_TOKEN = "general_tactics_step_button_v1"
GENERAL_TACTICS_PREVIEW_ACTION_CHIP_TOKEN = "general_tactics_preview_action_chip_v1"
GENERAL_TACTICS_STAT_TAG_TOKEN = "general_tactics_stat_tag_v1"
GENERAL_TACTICS_SUMMARY_CARD_TOKEN = "general_tactics_summary_card_v1"
GENERAL_GROWTH_ENTRY_CARD_TOKEN = "general_growth_entry_card_v1"
GENERAL_GROWTH_TROOP_ARROW_BUTTON_TOKEN = "general_growth_troop_arrow_button_v1"
GENERAL_GROWTH_TROOP_CHIP_TOKEN = "general_growth_troop_chip_v1"
GENERAL_ROSTER_VISUAL_CONTRACT_ACTIONS = {
    "world_open_main_city_generals_close",
}
GENERAL_SECONDARY_PAGE_CONTRACT_ACTIONS = {
    "generals_roster_open_hero_profile": "profile",
    "world_open_main_city_generals_tactics": "tactics",
    "world_open_main_city_generals_tactics_close": "tactics",
    "world_open_main_city_generals_growth": "growth",
    "world_open_main_city_generals_growth_close": "growth",
    "world_open_main_city_generals_growth_next_troop": "growth",
    "world_open_main_city_generals_profile_reset_action": "profile",
    "world_open_main_city_generals_profile_guide_action": "profile",
    "world_open_main_city_generals_profile_share_action": "profile",
    "world_open_main_city_generals_profile_inherit_action": "profile",
    "world_open_main_city_generals_profile_back_close": "profile",
    "world_open_main_city_generals_profile_close": "profile",
    "world_open_main_city_generals_profile_skill_detail_close": "profile",
}
GENERAL_SECONDARY_PAGE_TAB_LABELS = {
    "profile": "详情",
    "tactics": "配点",
    "growth": "兵种",
}
SKILL_LIBRARY_STANDALONE_CONTRACT_ACTIONS = {
    "world_open_main_city_skill_library",
    "world_open_main_city_skill_library_flip_card",
    "world_open_main_city_skill_library_search",
    "world_open_main_city_skill_library_clear_search",
    "world_open_main_city_skill_library_close",
}
SKILL_LIBRARY_DETAIL_CONTRACT_ACTIONS = {
    "world_open_main_city_skill_library_search",
}
SKILL_LIBRARY_SEARCH_CONTRACT_ACTIONS = {
    "world_open_main_city_skill_library_search",
}
SKILL_LIBRARY_CLEAR_SEARCH_CONTRACT_ACTIONS = {
    "world_open_main_city_skill_library_clear_search",
}
SKILL_LIBRARY_TYPE_SHOWCASE_CONTRACT_ACTIONS = {
    "world_open_main_city_skill_library_type_chase": "追击",
    "world_open_main_city_skill_library_type_active": "主动",
    "world_open_main_city_skill_library_type_passive": "被动",
    "world_open_main_city_skill_library_type_command": "指挥",
}
SKILL_LIBRARY_STANDALONE_CONTRACT_ACTIONS = SKILL_LIBRARY_STANDALONE_CONTRACT_ACTIONS | set(SKILL_LIBRARY_TYPE_SHOWCASE_CONTRACT_ACTIONS.keys())
RECRUIT_VISUAL_CONTRACT_ACTIONS = {
    "world_open_main_city_recruit",
    "world_open_main_city_recruit_close",
}
RECRUIT_DRAW_RESULT_VISUAL_CONTRACT_ACTIONS = {
    "world_open_main_city_recruit_result",
    "world_open_main_city_recruit_result_close",
}
RECRUIT_SINGLE_PREVIEW_VISUAL_CONTRACT_ACTIONS = {
    "world_open_main_city_recruit_single",
    "world_open_main_city_recruit_single_close",
}
RECRUIT_MULTI_PREVIEW_VISUAL_CONTRACT_ACTIONS = {
    "world_open_main_city_recruit_multi",
    "world_open_main_city_recruit_multi_close",
}
WORLD_EVENT_ACTIVITY_VISUAL_CONTRACT_ACTIONS = {
    "world_open_main_city_activity_close",
    "world_open_main_city_world_affairs_close",
    "world_open_main_city_tasks_close",
    "world_open_main_city_faction_status_close",
}
ALLIANCE_VISUAL_CONTRACT_ACTIONS = {
    "world_open_main_city_alliance_close",
    "world_open_main_city_organization_alliance_fixture_close",
    "world_open_main_city_organization_eligible_fixture_close",
    "world_open_main_city_organization_alliance_home",
    "world_open_main_city_organization_home_entry_members",
    "world_open_main_city_organization_home_entry_corps",
    "world_open_main_city_organization_nation_fixture_close",
    "world_open_main_city_organization_members",
    "world_open_main_city_organization_corps",
    "world_open_main_city_organization_officers",
    "world_open_main_city_organization_policy",
    "world_open_main_city_organization_diplomacy",
    "world_open_main_city_organization_market",
    "world_open_main_city_organization_buildings",
    "world_open_main_city_organization_logs",
    "world_open_main_city_organization_reports",
    "world_open_main_city_organization_report_detail",
    "world_open_main_city_organization_nation_reports",
    "world_open_main_city_organization_nation_report_detail",
    "world_open_main_city_organization_reports_back",
    "world_open_main_city_organization_report_detail_back",
}
ORGANIZATION_LIFECYCLE_CONTRACT_ACTIONS = {
    "world_open_main_city_organization_alliance_fixture_close",
    "world_open_main_city_organization_eligible_fixture_close",
    "world_open_main_city_organization_alliance_home",
    "world_open_main_city_organization_nation_fixture_close",
    "world_open_main_city_organization_members",
    "world_open_main_city_organization_corps",
    "world_open_main_city_organization_officers",
    "world_open_main_city_organization_policy",
    "world_open_main_city_organization_diplomacy",
    "world_open_main_city_organization_market",
    "world_open_main_city_organization_buildings",
    "world_open_main_city_organization_logs",
    "world_open_main_city_organization_reports",
    "world_open_main_city_organization_report_detail",
    "world_open_main_city_organization_nation_reports",
    "world_open_main_city_organization_nation_report_detail",
    "world_open_main_city_organization_reports_back",
    "world_open_main_city_organization_report_detail_back",
}
ORGANIZATION_HOME_ENTRY_CLICK_CONTRACT_ACTIONS = {
    "world_open_main_city_organization_home_entry_members": ("members/overview", "成员"),
    "world_open_main_city_organization_home_entry_corps": ("members/groups", "军团"),
}
SETTINGS_VISUAL_CONTRACT_ACTIONS = {
    "world_open_main_city_settings_close",
    "world_open_main_city_settings_display_font_plus",
    "world_open_main_city_settings_audio_quiet",
    "world_open_main_city_settings_notice_all",
    "world_open_main_city_settings_notice_focus",
    "world_open_main_city_settings_notice_quiet",
    "world_open_main_city_settings_notice_reset",
    "world_open_main_city_settings_account_open",
    "world_open_main_city_settings_account_copy_id",
    "world_open_main_city_settings_account_privacy",
    "world_open_main_city_settings_account_clear_cache",
}
SETTINGS_ACTION_ROW_BUTTON_IDENTITY_ACTIONS = {
    "world_open_main_city_settings_account_copy_id_button_identity": ("account", "account_copy_id", SETTINGS_ACTION_ROW_BUTTON_TOKEN, "SettingsActionRowButton_account_copy_id"),
    "world_open_main_city_settings_account_privacy_button_identity": ("account", "account_privacy", SETTINGS_ACTION_ROW_BUTTON_TOKEN, "SettingsActionRowButton_account_privacy"),
    "world_open_main_city_settings_account_clear_cache_button_identity": ("account", "account_clear_cache", SETTINGS_ACTION_ROW_BUTTON_TOKEN, "SettingsActionRowButton_account_clear_cache"),
}
MAIN_CITY_OVERLAY_CLOSE_BUTTON_CONTRACT_ACTIONS = {
    "world_open_main_city_activity_close",
    "world_open_main_city_world_affairs_close",
    "world_open_main_city_tasks_close",
    "world_open_main_city_faction_status_close",
    "world_open_main_city_recruit_close",
    "world_open_main_city_generals_close",
    "world_open_main_city_alliance_close",
    "world_open_main_city_mail_close",
    "world_open_main_city_battle_report_close",
    "world_open_main_city_settings_close",
    "world_open_main_city_skill_library_close",
}
MAIN_CITY_OVERLAY_CLOSE_BUTTON_IDENTITY_ACTIONS = {
    "world_open_main_city_mail_close_button_identity": "mail",
}
EDGE_SNAPSHOT_VISUAL_CONTRACT_ACTIONS = (
    WORLD_EVENT_ACTIVITY_VISUAL_CONTRACT_ACTIONS
    | ALLIANCE_VISUAL_CONTRACT_ACTIONS
    | SETTINGS_VISUAL_CONTRACT_ACTIONS
)
BATTLE_REPORT_VISUAL_CONTRACT_ACTIONS = {
    "battle_report_seeded_open_list",
    "world_open_main_city_battle_report_close",
}
BATTLE_REPORT_DETAIL_VISUAL_CONTRACT_ACTIONS = {
    "battle_report_seeded_open_detail",
    "battle_report_open_detail",
    "battle_report_open_stats",
    "battle_report_detail_three_tabs",
}
BATTLE_REPORT_DETAIL_BUTTON_CLICK_CONTRACT_ACTIONS = {
    "battle_report_detail_battlefield_tab_action": ("battle_report_detail_tab:battlefield", "战斗地点", "battlefield", BATTLE_REPORT_DETAIL_TAB_BUTTON_TOKEN),
    "battle_report_detail_stats_tab_action": ("battle_report_detail_tab:stats", "统计 / 战法", "stats", BATTLE_REPORT_DETAIL_TAB_BUTTON_TOKEN),
    "battle_report_detail_formation_tab_action": ("battle_report_detail_tab:formation", "阵容详情", "formation", BATTLE_REPORT_DETAIL_TAB_BUTTON_TOKEN),
    "battle_report_detail_back_action": ("battle_report_detail_back", "返回列表", "personal", BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN),
}
BATTLE_REPORT_DETAIL_TAB_BUTTON_IDENTITY_ACTIONS = {
    "battle_report_detail_battlefield_tab_button_identity": ("battle_report_detail_tab:battlefield", "战斗地点", "battlefield", BATTLE_REPORT_DETAIL_TAB_BUTTON_TOKEN, "BattlefieldTabButton"),
    "battle_report_detail_stats_tab_button_identity": ("battle_report_detail_tab:stats", "统计 / 战法", "stats", BATTLE_REPORT_DETAIL_TAB_BUTTON_TOKEN, "StatsTabButton"),
    "battle_report_detail_formation_tab_button_identity": ("battle_report_detail_tab:formation", "阵容详情", "formation", BATTLE_REPORT_DETAIL_TAB_BUTTON_TOKEN, "FormationTabButton"),
}
BATTLE_REPORT_DETAIL_BACK_BUTTON_IDENTITY_ACTIONS = {
    "battle_report_detail_back_button_identity": ("battle_report_detail_back", "返回列表", "personal", BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN, "SOM_D10_CollapseButton"),
}
BATTLE_REPORT_DETAIL_FOOTER_BUTTON_IDENTITY_ACTIONS = {
    "battle_report_detail_share_button_identity": ("battle_report_detail_share", "分享", BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN, "SOM_D08_ShareButton"),
    "battle_report_detail_favorite_button_identity": ("battle_report_detail_favorite", "收藏", BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN, "SOM_D08_FavoriteButton"),
    "battle_report_detail_replay_button_identity": ("battle_report_detail_replay", "战况回放", BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN, "ReplayButton"),
}
BATTLE_REPORT_SEEDED_CLOSURE_ACTIONS = {
    "battle_report_seeded_open_list",
    "battle_report_seeded_open_detail",
    "battle_report_list_density",
    *BATTLE_REPORT_DETAIL_FOOTER_BUTTON_IDENTITY_ACTIONS.keys(),
}
MAIL_PANEL_VISUAL_CONTRACT_ACTIONS = {
    "world_open_main_city_mail_close",
    "world_open_main_city_mail_select_reward",
}
MAIL_PANEL_ROW_SELECT_BUTTON_IDENTITY_ACTIONS = {
    "world_open_main_city_mail_select_reward_button_identity": ("mail_select:mail_daily_welfare", MAIL_PANEL_ROW_SELECT_BUTTON_TOKEN, "MailInboxItemButton_mail_daily_welfare"),
    "world_open_main_city_mail_select_event_reward_button_identity": ("mail_select:mail_event_reward", MAIL_PANEL_ROW_SELECT_BUTTON_TOKEN, "MailInboxItemButton_mail_event_reward"),
    "world_open_main_city_mail_select_system_notice_button_identity": ("mail_select:mail_system_notice", MAIL_PANEL_ROW_SELECT_BUTTON_TOKEN, "MailInboxItemButton_mail_system_notice"),
    "world_open_main_city_mail_select_org_order_button_identity": ("mail_select:mail_org_order", MAIL_PANEL_ROW_SELECT_BUTTON_TOKEN, "MailInboxItemButton_mail_org_order"),
    "world_open_main_city_mail_select_org_policy_button_identity": ("mail_select:mail_org_policy", MAIL_PANEL_ROW_SELECT_BUTTON_TOKEN, "MailInboxItemButton_mail_org_policy"),
}
MAIL_PANEL_TAB_BUTTON_IDENTITY_ACTIONS = {
    "world_open_main_city_mail_organization_tab_button_identity": ("organization", "panel_tab_select:organization", PANEL_TAB_BUTTON_TOKEN, "Tab_organization"),
    "world_open_main_city_mail_system_tab_button_identity": ("system", "panel_tab_select:system", PANEL_TAB_BUTTON_TOKEN, "Tab_system"),
}
PANEL_TAB_BUTTON_IDENTITY_ACTIONS = {
    "world_open_main_city_settings_display_tab_button_identity": ("settings", "display", "panel_tab_select:display", PANEL_TAB_BUTTON_TOKEN, "Tab_display"),
    "world_open_main_city_settings_audio_tab_button_identity": ("settings", "audio", "panel_tab_select:audio", PANEL_TAB_BUTTON_TOKEN, "Tab_audio"),
    "world_open_main_city_settings_notification_tab_button_identity": ("settings", "notification", "panel_tab_select:notification", PANEL_TAB_BUTTON_TOKEN, "Tab_notification"),
    "world_open_main_city_settings_account_tab_button_identity": ("settings", "account", "panel_tab_select:account", PANEL_TAB_BUTTON_TOKEN, "Tab_account"),
}
INTERIOR_VISUAL_CONTRACT_ACTIONS = {
    "world_open_main_city_interior",
    "world_click_main_city_node_interior",
    "world_click_main_city_node_interior_close",
}
MAIN_CITY_HUB_CONTEXT_CONTRACT_ACTIONS = {
    "world_click_main_city_asset_enter_hub",
}
MAIN_CITY_SCENE_ENTRY_BUTTON_CLICK_CONTRACT_ACTIONS = {
    "world_click_main_city_asset_enter_hub_troop_entry": ("troop", "部队编组"),
    "world_click_main_city_asset_enter_hub_building_tree_entry": ("building_tree", "建筑树"),
}
MAIN_CITY_SCENE_RETURN_BUTTON_CLICK_CONTRACT_ACTIONS = {
    "world_click_main_city_asset_enter_hub_return_map": ("main_city_scene_return_map", "返回地图"),
}
MAIN_CITY_CONTEXT_RETURN_BUTTON_CLICK_CONTRACT_ACTIONS = {
    "world_click_main_city_node_context_return_map_button_identity": ("main_city_context_return_map", "返回地图", "MainCityContextReturnMapButton"),
}
MAIN_CITY_FACILITY_CHAIN_CONTRACT_ACTIONS = {
    "world_click_main_city_node_facility_building_tree",
    "world_click_main_city_node_facility_building_tree_select_node",
    "world_click_main_city_node_facility_building_tree_submit_upgrade",
    "world_click_main_city_node_facility_building_tree_scroll_lower",
}
MAIN_CITY_FACILITY_CHAIN_DETAIL_ACTIONS = {
    "world_click_main_city_node_facility_building_tree_select_node",
    "world_click_main_city_node_facility_building_tree_submit_upgrade",
}
MAIN_CITY_FACILITY_CHAIN_SUBMITTED_ACTIONS = {
    "world_click_main_city_node_facility_building_tree_submit_upgrade",
}
MAIN_CITY_FACILITY_CHAIN_SCROLL_ACTIONS = {
    "world_click_main_city_node_facility_building_tree_scroll_lower",
}
INTERIOR_SECONDARY_PAGE_CONTRACT_ACTIONS = {
    "world_open_main_city_interior_market": "market/overview",
    "world_open_main_city_interior_trade": "trade/overview",
    "world_open_main_city_interior_tax": "tax/structure",
    "world_open_main_city_interior_affairs": "affairs/queue",
    "world_open_main_city_interior_affairs_stress_12": "affairs/queue",
    "world_open_main_city_interior_affairs_press_first_action": "affairs/queue",
    "world_open_main_city_interior_affairs_press_focus_action": "affairs/queue",
}
INTERIOR_SECONDARY_CARD_CHROME_ACTIONS = {
    "world_open_main_city_interior_market",
    "world_open_main_city_interior_trade",
    "world_open_main_city_interior_tax",
}
INTERIOR_SECONDARY_PAGE_TITLE_BY_ACTION = {
    "world_open_main_city_interior_market": "内政 · 市井",
    "world_open_main_city_interior_trade": "内政 · 交易",
    "world_open_main_city_interior_tax": "内政 · 税收",
    "world_open_main_city_interior_affairs": "内政 · 政务",
    "world_open_main_city_interior_affairs_stress_12": "内政 · 政务",
    "world_open_main_city_interior_affairs_press_first_action": "内政 · 政务",
    "world_open_main_city_interior_affairs_press_focus_action": "内政 · 政务",
}
INTERIOR_HOME_ENTRY_BUTTON_IDENTITY_ACTIONS = {
    "world_open_main_city_interior_market_entry_button_identity": ("market/overview", "市井", "interior_home_entry:market", "InteriorHomeEntryButton_market"),
    "world_open_main_city_interior_trade_entry_button_identity": ("trade/overview", "交易", "interior_home_entry:trade", "InteriorHomeEntryButton_trade"),
    "world_open_main_city_interior_tax_entry_button_identity": ("tax/structure", "税收", "interior_home_entry:tax", "InteriorHomeEntryButton_tax"),
    "world_open_main_city_interior_affairs_entry_button_identity": ("affairs/queue", "政务", "interior_home_entry:affairs", "InteriorHomeEntryButton_affairs"),
}
INTERIOR_SECONDARY_BACK_BUTTON_IDENTITY_ACTIONS = {
    "world_open_main_city_interior_market_back_button_identity": "market/overview",
    "world_open_main_city_interior_trade_back_button_identity": "trade/overview",
    "world_open_main_city_interior_tax_back_button_identity": "tax/structure",
    "world_open_main_city_interior_affairs_back_button_identity": "affairs/queue",
}
TROOP_PANEL_VISUAL_CONTRACT_ACTIONS = {
    "world_open_main_city_troop",
    "world_click_main_city_node_troop",
    "world_click_main_city_node_troop_close",
}
TROOP_ASSIGN_PREVIEW_CONTRACT_ACTIONS = {
    "world_click_main_city_node_troop_assign_preview",
}
TROOP_ASSIGN_DETAIL_CONTRACT_ACTIONS = {
    "world_click_main_city_node_troop_assign_preview_open_first_team",
}
MAIN_CITY_TROOP_FORMATION_TROOP_TYPE_CHIP_ACTIONS = {
    "world_click_main_city_node_troop_assign_preview_open_first_team",
    "world_click_main_city_node_troop_assign_preview_open_first_team_button_identity",
    "world_click_main_city_node_troop_assign_preview_open_second_team_button_identity",
    "world_click_main_city_node_troop_assign_preview_open_ai_fallback_team",
    "world_click_main_city_node_troop_assign_preview_open_ai_named_team",
    "world_click_main_city_node_troop_assign_preview_open_ai_multi_team_second",
}
TROOP_TEAM_CARD_BUTTON_IDENTITY_ACTIONS = {
    "world_click_main_city_node_troop_assign_preview_open_first_team_button_identity": ("team_01", "TroopTeamButton_team_01"),
    "world_click_main_city_node_troop_assign_preview_open_second_team_button_identity": ("team_02", "TroopTeamButton_team_02"),
}
TROOP_DETAIL_ACTION_BUTTON_IDENTITY_ACTIONS = {
    "world_click_main_city_node_troop_assign_preview_open_first_team_recruit_mode_button_identity": ("troop_detail_mode:recruit", "recruit", "征兵", "TroopFormationRecruitModeButton"),
    "world_click_main_city_node_troop_assign_preview_open_first_team_config_mode_button_identity": ("troop_detail_mode:config", "config", "配置", "TroopFormationConfigModeButton"),
}
TROOP_DETAIL_BACK_BUTTON_IDENTITY_ACTIONS = {
    "world_click_main_city_node_troop_assign_preview_open_first_team_back_button_identity": ("troop_detail_back_to_roster", "team_roster", "返回", "TroopFormationDetailBackButton"),
}
AI_PLAYER_UI_CONTRACT_ACTIONS = {
    "ai_panel_pending_proposals_review_guard",
}
AI_PLAYER_ACTION_ROW_CONTRACT_ACTIONS = {
    "ai_panel_open_chat_channel",
}
AI_PLAYER_HOME_CITY_BIND_OPEN_CHAIN_ACTIONS = {
    "ai_panel_home_city_bind_open_chain",
}
AI_PLAYER_HOME_CITY_SWITCH_OPEN_ACTIONS = {
    "world_ai_switch_open_home_city",
}
AI_PLAYER_CHAT_METADATA_CONTRACT_ACTIONS = {
    "ai_panel_chat_metadata_contract",
}
AI_PLAYER_AUTONOMY_GUARD_CONTRACT_ACTIONS = {
    "ai_panel_autonomy_guard_contract",
}
AI_PLAYER_LIST_CARD_CONTRACT_ACTIONS = {
    "ai_panel_list_card_contract",
}
AI_PLAYER_SECONDARY_COPY_CONTRACT_ACTIONS = {
    "ai_panel_secondary_pages_copy_contract",
}
AI_PLAYER_RECEIPT_VISUAL_CONTRACT_ACTIONS = {
    "ai_panel_receipt_detail_visual_contract",
}
AI_PLAYER_RECEIPT_FAILURE_CONTRACT_ACTIONS = {
    "ai_panel_receipt_failure_detail_contract",
}
AI_PLAYER_RECEIPT_HISTORY_CONTRACT_ACTIONS = {
    "ai_panel_receipt_history_pagination_contract",
}
AI_PLAYER_CONTEXT_DOCUMENT_CONTRACT_ACTIONS = {
    "ai_panel_context_document_open",
}
AI_PLAYER_CONTEXT_DOCUMENT_BUTTON_ACTIONS = {
    "ai_panel_context_document_cancel_action": ("ai_context_file_cancel", "令 取消"),
    "ai_panel_context_document_save_action": ("ai_context_file_save", "令 保存到AI玩家档案"),
}
AI_PLAYER_DISPLAY_NAME_BUTTON_ACTIONS = {
    "ai_panel_display_name_cancel_action": ("ai_display_name_cancel", "档 取消"),
    "ai_panel_display_name_save_action": ("ai_display_name_save", "档 保存"),
}
AI_PLAYER_AVATAR_SELECT_BUTTON_ACTIONS = {
    "ai_panel_avatar_select_close_action": ("ai_avatar_select_close", "档 关闭"),
    "ai_panel_avatar_select_option_action": ("ai_avatar_select_option:", ""),
}
AI_PLAYER_VOICE_SETTINGS_CONTRACT_ACTIONS = {
    "ai_panel_voice_settings_contract",
}
AI_PLAYER_VOICE_SETTINGS_BUTTON_ACTIONS = {
    "ai_panel_voice_settings_refresh_action": ("ai_voice_profile_refresh", "↺ 刷新"),
    "ai_panel_voice_settings_save_action": ("ai_voice_profile_save", "令 保存"),
}
AI_PLAYER_LIVING_WORLD_FIRST_SCREEN_ACTIONS = {
    "ai_panel_execution_trace_fixture",
}
AI_LIVING_ACTIVITY_LAYER_ACTIONS = {
    "world_ai_living_activity_layer_fixture",
}
AI_ACTIVITY_STATUS_BADGE_ACTIONS = {
    "world_shell_ai_activity_badge_fixture",
}
AI_ACTIVITY_CARD_ACTIONS = {
    "world_ai_activity_card_from_badge_fixture",
    "world_ai_activity_card_from_marker_fixture",
}
CHAT_AI_ACTIVITY_CONTINUITY_ACTIONS = {
    "shell_open_chat_ai_activity_continuity_fixture",
}
AI_ACTIVITY_SAME_TRACE_CROSS_SURFACE_ACTIONS = {
    "ai_activity_same_trace_cross_surface_fixture",
}
MAINLINE_HIGH_FREQUENCY_TOUCH_SCROLL_ACTIONS = (
    RECRUIT_VISUAL_CONTRACT_ACTIONS
    | RECRUIT_DRAW_RESULT_VISUAL_CONTRACT_ACTIONS
    | RECRUIT_SINGLE_PREVIEW_VISUAL_CONTRACT_ACTIONS
    | RECRUIT_MULTI_PREVIEW_VISUAL_CONTRACT_ACTIONS
    | BATTLE_REPORT_VISUAL_CONTRACT_ACTIONS
    | BATTLE_REPORT_DETAIL_VISUAL_CONTRACT_ACTIONS
    | MAIL_PANEL_VISUAL_CONTRACT_ACTIONS
    | INTERIOR_VISUAL_CONTRACT_ACTIONS
    | set(INTERIOR_SECONDARY_PAGE_CONTRACT_ACTIONS.keys())
    | AI_PLAYER_UI_CONTRACT_ACTIONS
    | AI_PLAYER_CHAT_METADATA_CONTRACT_ACTIONS
    | AI_PLAYER_AUTONOMY_GUARD_CONTRACT_ACTIONS
    | AI_PLAYER_LIST_CARD_CONTRACT_ACTIONS
    | AI_PLAYER_SECONDARY_COPY_CONTRACT_ACTIONS
    | AI_PLAYER_RECEIPT_VISUAL_CONTRACT_ACTIONS
    | AI_PLAYER_RECEIPT_FAILURE_CONTRACT_ACTIONS
    | AI_PLAYER_RECEIPT_HISTORY_CONTRACT_ACTIONS
    | AI_PLAYER_CONTEXT_DOCUMENT_CONTRACT_ACTIONS
    | set(AI_PLAYER_CONTEXT_DOCUMENT_BUTTON_ACTIONS.keys())
    | set(AI_PLAYER_DISPLAY_NAME_BUTTON_ACTIONS.keys())
    | set(AI_PLAYER_AVATAR_SELECT_BUTTON_ACTIONS.keys())
    | set(AI_PLAYER_VOICE_SETTINGS_BUTTON_ACTIONS.keys())
    | AI_ACTIVITY_SAME_TRACE_CROSS_SURFACE_ACTIONS
    | {
        "shell_open_chat_channel_keep_open",
        "shell_open_chat_ai_activity_continuity_fixture",
        "shell_open_chat_channel_multi_ai_fixture",
        "shell_open_chat_channel_new_channel",
        "shell_open_chat_channel_new_channel_contacts",
        "shell_open_chat_receipt_detail_popup",
    }
)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

PROFILES: dict[str, list[str]] = {
    DEMO_STORY_LIVING_WORLD_MOBILE_LANDSCAPE_PROFILE: DEMO_STORY_LIVING_WORLD_MOBILE_LANDSCAPE_ACTIONS,
    "world-event-activity": [
        "world_open_main_city_activity_close",
        "world_open_main_city_world_affairs_close",
        "world_open_main_city_tasks_close",
        "world_open_main_city_faction_status_close",
    ],
    "edge-snapshot-pages": [
        "world_open_main_city_world_affairs_close",
        "world_open_main_city_tasks_close",
        "world_open_main_city_faction_status_close",
        "world_open_main_city_alliance_close",
        "world_open_main_city_mail_close",
    ],
    "organization-lifecycle-candidates": [
        "world_open_main_city_organization_alliance_fixture_close",
        "world_open_main_city_organization_eligible_fixture_close",
        "world_open_main_city_organization_alliance_home",
        "world_open_main_city_organization_home_entry_members",
        "world_open_main_city_organization_home_entry_corps",
        "world_open_main_city_organization_nation_fixture_close",
        "world_open_main_city_organization_members",
        "world_open_main_city_organization_corps",
        "world_open_main_city_organization_officers",
        "world_open_main_city_organization_policy",
        "world_open_main_city_organization_diplomacy",
        "world_open_main_city_organization_market",
        "world_open_main_city_organization_buildings",
        "world_open_main_city_organization_logs",
        "world_open_main_city_organization_reports",
        "world_open_main_city_organization_report_detail",
        "world_open_main_city_organization_nation_reports",
        "world_open_main_city_organization_nation_report_detail",
        "world_open_main_city_organization_reports_back",
        "world_open_main_city_organization_report_detail_back",
    ],
    "settings-candidates": [
        "world_open_main_city_settings_close",
        "world_open_main_city_settings_display_tab_button_identity",
        "world_open_main_city_settings_audio_tab_button_identity",
        "world_open_main_city_settings_notification_tab_button_identity",
        "world_open_main_city_settings_account_tab_button_identity",
        "world_open_main_city_settings_display_font_plus",
        "world_open_main_city_settings_audio_quiet",
        "world_open_main_city_settings_notice_all",
        "world_open_main_city_settings_notice_focus",
        "world_open_main_city_settings_notice_quiet",
        "world_open_main_city_settings_notice_reset",
        "world_open_main_city_settings_account_open",
        "world_open_main_city_settings_account_copy_id",
        "world_open_main_city_settings_account_copy_id_button_identity",
        "world_open_main_city_settings_account_privacy",
        "world_open_main_city_settings_account_privacy_button_identity",
        "world_open_main_city_settings_account_clear_cache",
        "world_open_main_city_settings_account_clear_cache_button_identity",
    ],
    "mail-full-candidates": [
        "world_open_main_city_mail_close",
        "world_open_main_city_mail_close_button_identity",
        "world_open_main_city_mail_select_reward",
        "world_open_main_city_mail_select_reward_button_identity",
        "world_open_main_city_mail_select_event_reward_button_identity",
        "world_open_main_city_mail_select_system_notice_button_identity",
        "world_open_main_city_mail_organization_tab_button_identity",
        "world_open_main_city_mail_system_tab_button_identity",
        "world_open_main_city_mail_select_org_order_button_identity",
        "world_open_main_city_mail_select_org_policy_button_identity",
    ],
    "stable-ui-pages": [
        "world_open_main_city_activity_close",
        "world_open_main_city_world_affairs_close",
        "world_open_main_city_tasks_close",
        "world_open_main_city_faction_status_close",
        "world_open_main_city_recruit_close",
        "world_open_main_city_generals_close",
        "world_open_main_city_alliance_close",
        "world_open_main_city_mail_close",
        "world_open_main_city_mail_close_button_identity",
        "world_open_main_city_battle_report_close",
    ],
    "stable-ui-depth": [
        "generals_roster_open_hero_profile",
    ],
    "general-roster-candidates": [
        "generals_roster_open_hero_profile",
    ],
    "general-secondary-candidates": [
        "world_open_main_city_generals_tactics",
        "world_open_main_city_generals_tactics_close",
        "world_open_main_city_generals_growth",
        "world_open_main_city_generals_growth_close",
        "world_open_main_city_generals_growth_next_troop",
        "world_open_main_city_generals_profile_reset_action",
        "world_open_main_city_generals_profile_guide_action",
        "world_open_main_city_generals_profile_share_action",
        "world_open_main_city_generals_profile_inherit_action",
        "world_open_main_city_generals_profile_back_close",
        "world_open_main_city_generals_profile_close",
        "world_open_main_city_generals_profile_skill_detail_close",
    ],
    "skill-library-candidates": [
        "world_open_main_city_skill_library",
        "world_open_main_city_skill_library_flip_card",
        "world_open_main_city_skill_library_search",
        "world_open_main_city_skill_library_clear_search",
        "world_open_main_city_skill_library_close",
    ],
    "skill-library-type-screenshots": [
        "world_open_main_city_skill_library_type_chase",
        "world_open_main_city_skill_library_type_active",
        "world_open_main_city_skill_library_type_passive",
        "world_open_main_city_skill_library_type_command",
    ],
    "ai-player-ui-contract": [
        "ai_panel_chat_metadata_contract",
        "ai_panel_autonomy_guard_contract",
        "ai_panel_list_card_contract",
        "ai_panel_secondary_pages_copy_contract",
        "ai_panel_receipt_detail_visual_contract",
        "ai_panel_receipt_failure_detail_contract",
        "ai_panel_receipt_history_pagination_contract",
        "ai_panel_context_document_open",
        "ai_panel_pending_proposals_review_guard",
        "ai_panel_home_city_bind_open_chain",
        "world_ai_switch_open_home_city",
        "world_shell_ai_activity_badge_fixture",
        "ai_panel_voice_settings_contract",
        "ai_panel_voice_settings_refresh_action",
        "ai_panel_voice_settings_save_action",
    ],
    "chat-channel-candidates": [
        "shell_open_chat_channel_keep_open",
        "shell_open_chat_ai_activity_continuity_fixture",
        "ai_activity_same_trace_cross_surface_fixture",
        "shell_open_chat_channel_multi_ai_fixture",
        "shell_open_chat_channel_new_channel",
        "shell_open_chat_channel_new_channel_contacts",
        "shell_open_chat_receipt_detail_popup",
    ],
    "shell-nav-candidates": [
        "world_toggle_main_nav_collapse_expand",
        "shell_open_chat_channel_keep_open",
    ],
    "recruit-mainline-candidates": [
        "world_open_main_city_recruit",
        "world_open_main_city_recruit_close",
        "world_open_main_city_recruit_single",
        "world_open_main_city_recruit_single_close",
        "world_open_main_city_recruit_multi",
        "world_open_main_city_recruit_multi_close",
    ],
    "interior-candidates": [
        "world_open_main_city_interior",
        "world_open_main_city_interior_market",
        "world_open_main_city_interior_market_entry_button_identity",
        "world_open_main_city_interior_market_back_button_identity",
        "world_open_main_city_interior_trade",
        "world_open_main_city_interior_trade_entry_button_identity",
        "world_open_main_city_interior_trade_back_button_identity",
        "world_open_main_city_interior_tax",
        "world_open_main_city_interior_tax_entry_button_identity",
        "world_open_main_city_interior_tax_back_button_identity",
        "world_open_main_city_interior_affairs",
        "world_open_main_city_interior_affairs_entry_button_identity",
        "world_open_main_city_interior_affairs_back_button_identity",
        "world_open_main_city_interior_affairs_stress_12",
        "world_open_main_city_interior_affairs_press_first_action",
        "world_open_main_city_interior_affairs_press_focus_action",
        "world_click_main_city_node_interior",
        "world_click_main_city_node_interior_close",
    ],
    "main-city-facility-chain-candidates": [
        "world_click_main_city_node_facility_building_tree",
        "world_click_main_city_node_facility_building_tree_scroll_lower",
        "world_click_main_city_node_facility_building_tree_select_node",
        "world_click_main_city_node_facility_building_tree_submit_upgrade",
    ],
    "troop-candidates": [
        "world_open_main_city_troop",
        "world_click_main_city_node_troop",
        "world_click_main_city_node_troop_close",
        "world_click_main_city_node_troop_assign_preview",
        "world_click_main_city_node_troop_assign_preview_open_first_team",
        "world_click_main_city_node_troop_assign_preview_open_first_team_button_identity",
        "world_click_main_city_node_troop_assign_preview_open_second_team_button_identity",
        "world_click_main_city_node_troop_assign_preview_open_first_team_recruit_mode_button_identity",
        "world_click_main_city_node_troop_assign_preview_open_first_team_config_mode_button_identity",
        "world_click_main_city_node_troop_assign_preview_open_first_team_back_button_identity",
    ],
    "portrait-frame-contract": [
        "world_open_main_city_battle_report_close",
        "battle_report_open_detail",
        "world_open_main_city_generals_close",
        "generals_roster_open_hero_profile",
        "world_open_main_city_recruit",
        "world_open_main_city_recruit_result",
        "world_open_main_city_recruit_single",
        "world_open_main_city_recruit_multi",
        "world_click_main_city_node_troop_assign_preview",
        "world_click_main_city_node_troop_assign_preview_open_first_team",
    ],
    "main-city-core-candidates": [
        "world_toggle_main_nav_collapse_expand",
        "world_click_main_city_node",
        "world_click_main_city_node_context_return_map_button_identity",
        "world_open_main_city_interior",
        "world_open_main_city_troop",
        "world_click_main_city_node_interior_close",
        "world_click_main_city_node_troop_close",
    ],
    "main-city-hub-candidates": [
        "world_click_main_city_node",
        "world_click_main_city_asset_enter_hub",
        "world_click_main_city_asset_enter_hub_troop_entry",
        "world_click_main_city_asset_enter_hub_building_tree_entry",
        "world_click_main_city_asset_enter_hub_return_map",
        "world_click_main_city_node_context_return_map_button_identity",
    ],
    "battle-report-depth-candidates": [
        "battle_report_seeded_open_list",
        "battle_report_seeded_open_detail",
        "battle_report_open_detail",
        "battle_report_open_stats",
        "battle_report_detail_three_tabs",
        "battle_report_detail_battlefield_tab_action",
        "battle_report_detail_battlefield_tab_button_identity",
        "battle_report_detail_stats_tab_action",
        "battle_report_detail_stats_tab_button_identity",
        "battle_report_detail_formation_tab_action",
        "battle_report_detail_formation_tab_button_identity",
        "battle_report_detail_back_action",
        "battle_report_detail_back_button_identity",
        "battle_report_detail_share_button_identity",
        "battle_report_detail_favorite_button_identity",
        "battle_report_detail_replay_button_identity",
    ],
    "stable-ui-full": [
        "world_open_main_city_activity_close",
        "world_open_main_city_world_affairs_close",
        "world_open_main_city_tasks_close",
        "world_open_main_city_faction_status_close",
        "world_open_main_city_recruit_close",
        "world_open_main_city_generals_close",
        "world_open_main_city_alliance_close",
        "world_open_main_city_mail_close",
        "world_open_main_city_battle_report_close",
        "generals_roster_open_hero_profile",
    ],
    "stable-ui-visual-review": [
        "world_open_main_city_activity_close",
        "world_open_main_city_world_affairs_close",
        "world_open_main_city_tasks_close",
        "world_open_main_city_faction_status_close",
        "world_open_main_city_recruit_close",
        "world_open_main_city_generals_close",
        "world_open_main_city_alliance_close",
        "world_open_main_city_mail_close",
        "world_open_main_city_battle_report_close",
        "generals_roster_open_hero_profile",
    ],
}

VISUAL_SCREENSHOT_STATS_ACTIONS = set(PROFILES["interior-candidates"]) - {
    "world_open_main_city_interior_market_entry_button_identity",
    "world_open_main_city_interior_trade_entry_button_identity",
    "world_open_main_city_interior_tax_entry_button_identity",
    "world_open_main_city_interior_affairs_entry_button_identity",
    "world_open_main_city_interior_market_back_button_identity",
    "world_open_main_city_interior_trade_back_button_identity",
    "world_open_main_city_interior_tax_back_button_identity",
    "world_open_main_city_interior_affairs_back_button_identity",
    "world_open_main_city_interior_affairs_press_first_action",
    "world_open_main_city_interior_affairs_press_focus_action",
}


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a batch of formal Godot mainline UI closure visual smokes.",
    )
    parser.add_argument("--profile", choices=sorted(PROFILES.keys()), default="stable-ui-pages")
    parser.add_argument("--action", action="append", default=[], help="Override profile with explicit click action. Repeatable.")
    parser.add_argument("--backend-url", default="")
    parser.add_argument("--server-script", default="start")
    parser.add_argument("--timeout-sec", type=float, default=90.0)
    parser.add_argument("--backend-timeout-sec", type=float, default=120.0)
    parser.add_argument("--report-path", type=Path, default=DEFAULT_REPORT_PATH)
    parser.add_argument("--continue-on-failure", action="store_true")
    parser.add_argument("--list-profiles", action="store_true")
    return parser.parse_args()


def _json_from_stdout(stdout: str) -> dict[str, Any]:
    start = stdout.find("{")
    end = stdout.rfind("}")
    if start < 0 or end < start:
        return {"ok": False, "reason": "json_payload_missing", "stdout": stdout[-4000:]}
    raw = stdout[start : end + 1]
    try:
        payload: Any = json.loads(raw)
    except json.JSONDecodeError as exc:
        return {
            "ok": False,
            "reason": "json_parse_failed",
            "message": str(exc),
            "stdout": stdout[-4000:],
        }
    if isinstance(payload, dict):
        return payload
    return {"ok": False, "reason": "json_payload_not_object", "payload": payload}


def _res_path_to_repo_path(res_path: str) -> Path:
    normalized = res_path.replace("\\", "/")
    if normalized.startswith("res://"):
        return REPO_ROOT / "godot-client" / normalized.removeprefix("res://")
    return REPO_ROOT / normalized


def _png_dimensions(path: Path) -> tuple[int, int]:
    try:
        with path.open("rb") as handle:
            header = handle.read(24)
    except OSError:
        return (0, 0)
    if len(header) < 24 or header[:8] != b"\x89PNG\r\n\x1a\n":
        return (0, 0)
    return (int.from_bytes(header[16:20], "big"), int.from_bytes(header[20:24], "big"))


def _validate_skill_card_generated_art_contract() -> list[str]:
    failures: list[str] = []
    try:
        payload = json.loads(GENERAL_SKILL_LIBRARY_PREVIEW_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"skillCardArtReadModelLoadFailed:{exc}"]
    skills = payload.get("skills", [])
    if not isinstance(skills, list):
        return ["skillCardArtReadModelSkillsNotList"]

    seen_types: set[str] = set()
    for item in skills:
        if not isinstance(item, dict):
            continue
        skill_type = str(item.get("type", "")).strip()
        if skill_type not in SKILL_CARD_ART_TYPES:
            continue
        seen_types.add(skill_type)
        asset_ref = item.get("asset_ref", item.get("assetRef", {}))
        if not isinstance(asset_ref, dict):
            failures.append(f"skillCardArtAssetRefMissing:{skill_type}")
            continue
        res_path = str(asset_ref.get("resPath", asset_ref.get("res_path", ""))).strip()
        expected_path = SKILL_CARD_ART_PATHS[skill_type]
        if res_path != expected_path:
            failures.append(f"skillCardArtResPath[{skill_type}]!={expected_path}")
            continue
        if str(asset_ref.get("assetKind", "")).strip() != "skill_card_png":
            failures.append(f"skillCardArtAssetKind[{skill_type}]!=skill_card_png")
        strategy = asset_ref.get("displayStrategy", {})
        if not isinstance(strategy, dict):
            failures.append(f"skillCardArtDisplayStrategyMissing:{skill_type}")
            continue
        if str(strategy.get("fit", "")).strip() != SKILL_CARD_ART_FIT_MODE:
            failures.append(f"skillCardArtFit[{skill_type}]!={SKILL_CARD_ART_FIT_MODE}")
        if str(strategy.get("stageAspect", "")).strip() != "2:3":
            failures.append(f"skillCardArtStageAspect[{skill_type}]!=2:3")
        if str(strategy.get("safeMargin", "")).strip() != SKILL_CARD_ART_SAFE_MARGIN:
            failures.append(f"skillCardArtSafeMargin[{skill_type}]!={SKILL_CARD_ART_SAFE_MARGIN}")
        if str(strategy.get("preprocess", "")).strip() != SKILL_CARD_ART_PREPROCESS:
            failures.append(f"skillCardArtPreprocess[{skill_type}]!={SKILL_CARD_ART_PREPROCESS}")
        asset_path = _res_path_to_repo_path(res_path)
        if not asset_path.exists():
            failures.append(f"skillCardArtFileMissing[{skill_type}]")
            continue
        width, height = _png_dimensions(asset_path)
        if (width, height) != (SKILL_CARD_ART_WIDTH, SKILL_CARD_ART_HEIGHT):
            failures.append(f"skillCardArtPngSize[{skill_type}]!={SKILL_CARD_ART_WIDTH}x{SKILL_CARD_ART_HEIGHT}")

    missing_types = [skill_type for skill_type in SKILL_CARD_ART_TYPES if skill_type not in seen_types]
    for skill_type in missing_types:
        failures.append(f"skillCardArtTypeMissing:{skill_type}")
    return failures


def _find_page_content_summary(click_result: dict[str, Any]) -> tuple[dict[str, Any], Any]:
    candidates: list[dict[str, Any]] = [click_result]
    for key in ("panelResult", "panelOpenResult"):
        nested = click_result.get(key, {})
        if isinstance(nested, dict):
            candidates.append(nested)
            nested_panel_result = nested.get("panelResult", {})
            if isinstance(nested_panel_result, dict):
                candidates.append(nested_panel_result)
    for candidate in candidates:
        page_summary = candidate.get("pageContentSummary", {})
        if isinstance(page_summary, dict) and page_summary:
            return page_summary, candidate.get("pageContentOk")
    main_city_hub = click_result.get("mainCityHub", {})
    if isinstance(main_city_hub, dict) and main_city_hub:
        return main_city_hub, click_result.get("ok")
    main_city_context = click_result.get("mainCityContext", {})
    if isinstance(main_city_context, dict) and main_city_context:
        return main_city_context, click_result.get("ok")
    return {}, click_result.get("pageContentOk")


def _validate_action_result_contract(action: str, click_result: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if action == "world_tianxia_yutu_label_art_polish_qa":
        if click_result.get("markerLabelPolishSpecToken") != TIANXIA_YUTU_MARKER_LABEL_POLISH_SPEC_TOKEN:
            failures.append("markerLabelPolishSpecToken!=tianxia_yutu_marker_label_polish_v2")
    if action == "world_tianxia_yutu_product_acceptance_qa":
        if click_result.get("productAcceptanceMarkerLabelPolishSpecToken") != TIANXIA_YUTU_MARKER_LABEL_POLISH_SPEC_TOKEN:
            failures.append("productAcceptanceMarkerLabelPolishSpecToken!=tianxia_yutu_marker_label_polish_v2")
        if click_result.get("productAcceptanceLivingWorldMarkerClusterToken") != TIANXIA_YUTU_LIVING_WORLD_MARKER_CLUSTER_TOKEN:
            failures.append("productAcceptanceLivingWorldMarkerClusterToken!=tianxia_yutu_living_world_marker_cluster_v1")
        if click_result.get("productAcceptanceAiActivityMarkerFamilyContract") != AI_LIVING_ACTIVITY_MARKER_FAMILY_TOKEN:
            failures.append("productAcceptanceAiActivityMarkerFamilyContract!=ai_living_activity_marker_family_v1")
        if click_result.get("productAcceptanceAiActivityLabelPriorityToken") != TIANXIA_YUTU_AI_ACTIVITY_LABEL_PRIORITY_TOKEN:
            failures.append("productAcceptanceAiActivityLabelPriorityToken!=tianxia_yutu_ai_activity_label_priority_v1")
        if not str(click_result.get("productAcceptanceAiActivityFirstTraceId", "")).strip():
            failures.append("productAcceptanceAiActivityFirstTraceId=empty")
        if click_result.get("productAcceptanceAiActivityHotspotVisualAssetContract") != TIANXIA_YUTU_AI_HOTSPOT_VISUAL_ASSET_TOKEN:
            failures.append("productAcceptanceAiActivityHotspotVisualAssetContract!=tianxia_yutu_ai_hotspot_visual_asset_v1")
        if bool(click_result.get("productAcceptanceAiActivityHotspotVisualAssetLoaded", False)) is not True:
            failures.append("productAcceptanceAiActivityHotspotVisualAssetLoaded!=true")
        if _as_int(click_result.get("productAcceptanceAiActivityHotspotVisualAssetDrawCount"), 0) <= 0:
            failures.append("productAcceptanceAiActivityHotspotVisualAssetDrawCount<=0")
        if click_result.get("productAcceptanceAiActivityHotspotInfoAssetContract") != TIANXIA_YUTU_AI_HOTSPOT_INFO_ASSET_TOKEN:
            failures.append("productAcceptanceAiActivityHotspotInfoAssetContract!=tianxia_yutu_ai_hotspot_info_asset_v1")
        if bool(click_result.get("productAcceptanceAiActivityHotspotInfoAssetLoaded", False)) is not True:
            failures.append("productAcceptanceAiActivityHotspotInfoAssetLoaded!=true")
        if _as_int(click_result.get("productAcceptanceAiActivityHotspotLabelPlateAssetDrawCount"), 0) <= 0:
            failures.append("productAcceptanceAiActivityHotspotLabelPlateAssetDrawCount<=0")
        if _as_int(click_result.get("productAcceptanceAiActivityHotspotClusterBadgeAssetDrawCount"), 0) <= 0:
            failures.append("productAcceptanceAiActivityHotspotClusterBadgeAssetDrawCount<=0")
        if click_result.get("productAcceptanceAiActivityRouteIntentAssetContract") != TIANXIA_YUTU_AI_ROUTE_INTENT_ASSET_TOKEN:
            failures.append("productAcceptanceAiActivityRouteIntentAssetContract!=tianxia_yutu_ai_route_intent_asset_v1")
        if bool(click_result.get("productAcceptanceAiActivityRouteIntentAssetLoaded", False)) is not True:
            failures.append("productAcceptanceAiActivityRouteIntentAssetLoaded!=true")
        if _as_int(click_result.get("productAcceptanceAiActivityRouteIntentSourceTargetCount"), 0) <= 0:
            failures.append("productAcceptanceAiActivityRouteIntentSourceTargetCount<=0")
        if _as_int(click_result.get("productAcceptanceAiActivityRouteIntentLineDrawCount"), 0) <= 0:
            failures.append("productAcceptanceAiActivityRouteIntentLineDrawCount<=0")
        if _as_int(click_result.get("productAcceptanceAiActivityRouteIntentArrowAssetDrawCount"), 0) <= 0:
            failures.append("productAcceptanceAiActivityRouteIntentArrowAssetDrawCount<=0")
        if click_result.get("productAcceptanceAiActivityRouteHeadingContract") != TIANXIA_YUTU_AI_ROUTE_HEADING_TOKEN:
            failures.append("productAcceptanceAiActivityRouteHeadingContract!=tianxia_yutu_ai_route_heading_v1")
        if _as_int(click_result.get("productAcceptanceAiActivityRouteHeadingAppliedCount"), 0) <= 0:
            failures.append("productAcceptanceAiActivityRouteHeadingAppliedCount<=0")
        if click_result.get("productAcceptanceAiActivityRouteStateVariantContract") != TIANXIA_YUTU_AI_ROUTE_STATE_VARIANT_TOKEN:
            failures.append("productAcceptanceAiActivityRouteStateVariantContract!=tianxia_yutu_ai_route_state_variant_v1")
        if bool(click_result.get("productAcceptanceAiActivityRouteStateVariantAssetLoaded", False)) is not True:
            failures.append("productAcceptanceAiActivityRouteStateVariantAssetLoaded!=true")
        if _as_int(click_result.get("productAcceptanceAiActivityRouteActiveVariantDrawCount"), 0) <= 0:
            failures.append("productAcceptanceAiActivityRouteActiveVariantDrawCount<=0")
        if _as_int(click_result.get("productAcceptanceAiActivityRouteQueuedVariantDrawCount"), 0) <= 0:
            failures.append("productAcceptanceAiActivityRouteQueuedVariantDrawCount<=0")
        if _as_int(click_result.get("productAcceptanceAiActivityHotspotCount"), 0) <= 0:
            failures.append("productAcceptanceAiActivityHotspotCount<=0")
        if _as_int(click_result.get("productAcceptanceAiActivityHotspotDrawCount"), 0) <= 0:
            failures.append("productAcceptanceAiActivityHotspotDrawCount<=0")
        if bool(click_result.get("productAcceptanceAiActivityUsesExecutionTrace", False)) is not True:
            failures.append("productAcceptanceAiActivityUsesExecutionTrace!=true")
        if bool(click_result.get("productAcceptanceAiActivityFallbackUsed", True)):
            failures.append("productAcceptanceAiActivityFallbackUsed!=false")
        if (
            click_result.get("productAcceptanceLabelPriorityContractToken")
            != TIANXIA_YUTU_LABEL_PRIORITY_PRODUCT_ACCEPTANCE_TOKEN
        ):
            failures.append("productAcceptanceLabelPriorityContractToken!=tianxia_yutu_label_priority_product_acceptance_v1")
        if bool(click_result.get("productAcceptanceLabelPriorityOk", False)) is not True:
            failures.append("productAcceptanceLabelPriorityOk!=true")
        label_priority_draw_counts = click_result.get("productAcceptanceLabelPriorityDrawCounts", {})
        if not isinstance(label_priority_draw_counts, dict) or not label_priority_draw_counts:
            failures.append("productAcceptanceLabelPriorityDrawCounts=missing")
        label_priority_draw_order = click_result.get("productAcceptanceLabelPriorityDrawOrder", [])
        if not isinstance(label_priority_draw_order, list) or len(label_priority_draw_order) < 4:
            failures.append("productAcceptanceLabelPriorityDrawOrder<4")
        if _as_int(click_result.get("productAcceptanceLabelDensityReliefCount"), 0) <= 0:
            failures.append("productAcceptanceLabelDensityReliefCount<=0")
        if _as_int(click_result.get("productAcceptanceGateLabelBudgetSkipCount"), 0) <= 0:
            failures.append("productAcceptanceGateLabelBudgetSkipCount<=0")
    if action in AI_PLAYER_LIVING_WORLD_FIRST_SCREEN_ACTIONS:
        if click_result.get("aiPanelLivingWorldFirstScreenContract") != "ai_player_living_world_first_screen_v1":
            failures.append("aiPanelLivingWorldFirstScreenContract!=ai_player_living_world_first_screen_v1")
        if bool(click_result.get("aiPanelExecutionTraceVisible", False)) is not True:
            failures.append("aiPanelExecutionTraceVisible!=true")
        if _as_int(click_result.get("aiPanelExecutionTraceCount"), 0) <= 0:
            failures.append("aiPanelExecutionTraceCount<=0")
        if not str(click_result.get("aiPanelLatestExecutionTraceSummary", "")).strip():
            failures.append("aiPanelLatestExecutionTraceSummary=empty")
        if click_result.get("aiPanelExecutionTraceCardChromeToken") != "ai_panel_execution_trace_card_chrome_v1":
            failures.append("aiPanelExecutionTraceCardChromeToken!=ai_panel_execution_trace_card_chrome_v1")
        if _as_int(click_result.get("aiPanelExecutionTraceCardChromeCount"), 0) < 2:
            failures.append("aiPanelExecutionTraceCardChromeCount<2")
        if click_result.get("aiPanelExecutionTraceCardMotionMode") != "phase_chip_stagger_v1":
            failures.append("aiPanelExecutionTraceCardMotionMode!=phase_chip_stagger_v1")
        if _as_int(click_result.get("aiPanelExecutionTraceCardStaggeredCount"), 0) < 2:
            failures.append("aiPanelExecutionTraceCardStaggeredCount<2")
        if bool(click_result.get("traceBlockBeforeHomeCity", False)) is not True:
            failures.append("traceBlockBeforeHomeCity!=true")
        if bool(click_result.get("traceBlockBeforeDailySummary", False)) is not True:
            failures.append("traceBlockBeforeDailySummary!=true")
    if action in AI_LIVING_ACTIVITY_LAYER_ACTIONS:
        if click_result.get("aiLivingActivityLayerContract") != "ai_living_activity_layer_v1":
            failures.append("aiLivingActivityLayerContract!=ai_living_activity_layer_v1")
        if click_result.get("aiLivingActivityMarkerFamilyContract") != AI_LIVING_ACTIVITY_MARKER_FAMILY_TOKEN:
            failures.append("aiLivingActivityMarkerFamilyContract!=ai_living_activity_marker_family_v1")
        if _as_int(click_result.get("aiLivingActivityMarkerFrameAssetDrawCount"), 0) <= 0:
            failures.append("aiLivingActivityMarkerFrameAssetDrawCount<=0")
        if _as_int(click_result.get("aiLivingActivityMarkerRouteArrowAssetDrawCount"), 0) <= 0:
            failures.append("aiLivingActivityMarkerRouteArrowAssetDrawCount<=0")
        if _as_int(click_result.get("aiLivingActivityMarkerClusterBadgeAssetDrawCount"), 0) <= 0:
            failures.append("aiLivingActivityMarkerClusterBadgeAssetDrawCount<=0")
        if click_result.get("aiLivingActivityMarkerVisualAssetContract") != "ai_living_activity_marker_visual_asset_v1":
            failures.append("aiLivingActivityMarkerVisualAssetContract!=ai_living_activity_marker_visual_asset_v1")
        if click_result.get("aiLivingActivityMarkerQueueClusterContract") != "ai_living_activity_marker_queue_cluster_v1":
            failures.append("aiLivingActivityMarkerQueueClusterContract!=ai_living_activity_marker_queue_cluster_v1")
        if _as_int(click_result.get("aiLivingActivityMarkerCount"), 0) <= 0:
            failures.append("aiLivingActivityMarkerCount<=0")
        if _as_int(click_result.get("aiLivingActivityMarkerAvatarVisibleCount"), 0) <= 0:
            failures.append("aiLivingActivityMarkerAvatarVisibleCount<=0")
        if _as_int(click_result.get("aiLivingActivityMarkerStatusBadgeVisibleCount"), 0) <= 0:
            failures.append("aiLivingActivityMarkerStatusBadgeVisibleCount<=0")
        if _as_int(click_result.get("aiLivingActivityMarkerTargetLineVisibleCount"), 0) <= 0:
            failures.append("aiLivingActivityMarkerTargetLineVisibleCount<=0")
        if _as_int(click_result.get("aiLivingActivityMarkerQueueCountVisibleCount"), 0) <= 0:
            failures.append("aiLivingActivityMarkerQueueCountVisibleCount<=0")
        if _as_int(click_result.get("aiLivingActivityMarkerMaxQueueCount"), 0) < 2:
            failures.append("aiLivingActivityMarkerMaxQueueCount<2")
        if _as_int(click_result.get("aiLivingActivityMarkerAggregationDotVisibleCount"), 0) <= 0:
            failures.append("aiLivingActivityMarkerAggregationDotVisibleCount<=0")
        if _as_int(click_result.get("aiLivingActivityMarkerMaxAggregationDotCount"), 0) <= 0:
            failures.append("aiLivingActivityMarkerMaxAggregationDotCount<=0")
        if _as_int(click_result.get("aiLivingActivityMarkerViewportClampedCount"), 0) <= 0:
            failures.append("aiLivingActivityMarkerViewportClampedCount<=0")
        if click_result.get("aiLivingActivityLongTracePositionContract") != "ai_living_activity_long_trace_position_v1":
            failures.append("aiLivingActivityLongTracePositionContract!=ai_living_activity_long_trace_position_v1")
        if _as_int(click_result.get("aiLivingActivityRouteTraceStepCount"), 0) < 3:
            failures.append("aiLivingActivityRouteTraceStepCount<3")
        if _as_int(click_result.get("aiLivingActivityDistinctTargetTileCount"), 0) < 2:
            failures.append("aiLivingActivityDistinctTargetTileCount<2")
        if _as_int(click_result.get("aiLivingActivitySeparatedMarkerPositionCount"), 0) < 2:
            failures.append("aiLivingActivitySeparatedMarkerPositionCount<2")
        if bool(click_result.get("aiLivingActivitySeparatedMarkerPositionOk", False)) is not True:
            failures.append("aiLivingActivitySeparatedMarkerPositionOk!=true")
        if bool(click_result.get("aiLivingActivityUsesExecutionTrace", False)) is not True:
            failures.append("aiLivingActivityUsesExecutionTrace!=true")
        if bool(click_result.get("aiLivingActivityFallbackUsed", True)):
            failures.append("aiLivingActivityFallbackUsed!=false")
        if click_result.get("aiLivingActivityMarkerCarryingTroopsStripContract") != "ai_living_activity_marker_carrying_troops_strip_v1":
            failures.append("aiLivingActivityMarkerCarryingTroopsStripContract!=ai_living_activity_marker_carrying_troops_strip_v1")
        if click_result.get("aiLivingActivityMarkerCarryingTroopsGeneratedAssetSource") != GENERATED_TROOPS_ILLUSTRATION_SOURCE:
            failures.append("aiLivingActivityMarkerCarryingTroopsGeneratedAssetSource!=generated_troops_illustration_v1")
        if _as_int(click_result.get("aiLivingActivityMarkerCarryingTroopsStripVisibleCount"), 0) <= 0:
            failures.append("aiLivingActivityMarkerCarryingTroopsStripVisibleCount<=0")
        if _as_int(click_result.get("aiLivingActivityMarkerCarryingTroopsSlotCount"), 0) < 3:
            failures.append("aiLivingActivityMarkerCarryingTroopsSlotCount<3")
        if _as_int(click_result.get("aiLivingActivityMarkerCarryingTroopsTextureDrawCount"), 0) < 3:
            failures.append("aiLivingActivityMarkerCarryingTroopsTextureDrawCount<3")
        carrying_troop_labels = click_result.get("aiLivingActivityMarkerCarryingTroopsLabels", [])
        if isinstance(carrying_troop_labels, list):
            if len([label for label in carrying_troop_labels if str(label).strip()]) < 3:
                failures.append("aiLivingActivityMarkerCarryingTroopsLabels=empty")
        elif not str(carrying_troop_labels).strip():
            failures.append("aiLivingActivityMarkerCarryingTroopsLabels=empty")
    if action in AI_ACTIVITY_STATUS_BADGE_ACTIONS:
        if click_result.get("shellNavAiActivityBadgeContract") != "ai_activity_status_badge_v1":
            failures.append("shellNavAiActivityBadgeContract!=ai_activity_status_badge_v1")
        if bool(click_result.get("shellNavAiActivityBadgeVisible", False)) is not True:
            failures.append("shellNavAiActivityBadgeVisible!=true")
        if _as_int(click_result.get("shellNavAiActivityBadgeTraceCount"), 0) <= 0:
            failures.append("shellNavAiActivityBadgeTraceCount<=0")
        if not str(click_result.get("shellNavAiActivityBadgeText", "")).strip():
            failures.append("shellNavAiActivityBadgeText=empty")
        if not str(click_result.get("shellNavAiActivityBadgeCurrentTaskText", "")).strip():
            failures.append("shellNavAiActivityBadgeCurrentTaskText=empty")
        if bool(click_result.get("shellNavAiActivityBadgeUsesExecutionTrace", False)) is not True:
            failures.append("shellNavAiActivityBadgeUsesExecutionTrace!=true")
        if bool(click_result.get("shellNavAiActivityBadgeFallbackUsed", True)):
            failures.append("shellNavAiActivityBadgeFallbackUsed!=false")
        if click_result.get("shellNavAiSwitchTraceCommandChromeToken") != "ai_switch_trace_command_chrome_v1":
            failures.append("shellNavAiSwitchTraceCommandChromeToken!=ai_switch_trace_command_chrome_v1")
        if bool(click_result.get("shellNavAiSwitchTraceCommandChromeActive", False)) is not True:
            failures.append("shellNavAiSwitchTraceCommandChromeActive!=true")
        if not str(click_result.get("shellNavAiSwitchTraceCommandCurrentTask", "")).strip():
            failures.append("shellNavAiSwitchTraceCommandCurrentTask=empty")
        if "AI玩家正在行动" not in str(click_result.get("shellNavAiSwitchTraceCommandTooltip", "")):
            failures.append("shellNavAiSwitchTraceCommandTooltipMissingTraceCopy")
    if action in AI_ACTIVITY_CARD_ACTIONS:
        if click_result.get("aiActivityCardContract") != "ai_activity_card_v1":
            failures.append("aiActivityCardContract!=ai_activity_card_v1")
        if click_result.get("aiActivityCardAvatarStatusContract") != "ai_activity_card_avatar_status_v1":
            failures.append("aiActivityCardAvatarStatusContract!=ai_activity_card_avatar_status_v1")
        if bool(click_result.get("aiActivityCardVisible", False)) is not True:
            failures.append("aiActivityCardVisible!=true")
        if bool(click_result.get("aiActivityCardIdentityRowVisible", False)) is not True:
            failures.append("aiActivityCardIdentityRowVisible!=true")
        if bool(click_result.get("aiActivityCardAvatarVisible", False)) is not True:
            failures.append("aiActivityCardAvatarVisible!=true")
        if not str(click_result.get("aiActivityCardAvatarImagePath", "")).strip():
            failures.append("aiActivityCardAvatarImagePath=empty")
        if click_result.get("aiActivityCardAvatarStatusFrameFamilyContract") != AI_AVATAR_STATUS_FRAME_FAMILY_TOKEN:
            failures.append("aiActivityCardAvatarStatusFrameFamilyContract!=ai_avatar_status_frame_family_v1")
        if bool(click_result.get("aiActivityCardAvatarStatusFrameVisible", False)) is not True:
            failures.append("aiActivityCardAvatarStatusFrameVisible!=true")
        if bool(click_result.get("aiActivityCardAvatarIntentBadgeVisible", False)) is not True:
            failures.append("aiActivityCardAvatarIntentBadgeVisible!=true")
        if bool(click_result.get("aiActivityCardStatusDotVisible", False)) is not True:
            failures.append("aiActivityCardStatusDotVisible!=true")
        if not str(click_result.get("aiActivityCardStatusDot", "")).strip():
            failures.append("aiActivityCardStatusDot=empty")
        if click_result.get("aiActivityCardCarryingTroopsChipContract") != AI_ACTIVITY_CARRYING_TROOPS_CHIP_TOKEN:
            failures.append("aiActivityCardCarryingTroopsChipContract!=ai_activity_carrying_troops_chip_v1")
        if click_result.get("aiActivityCardCarryingTroopsGeneratedAssetSource") != GENERATED_TROOPS_ILLUSTRATION_SOURCE:
            failures.append("aiActivityCardCarryingTroopsGeneratedAssetSource!=generated_troops_illustration_v1")
        if bool(click_result.get("aiActivityCardCarryingTroopsChipVisible", False)) is not True:
            failures.append("aiActivityCardCarryingTroopsChipVisible!=true")
        if _as_int(click_result.get("aiActivityCardCarryingTroopsSlotCount"), 0) != 3:
            failures.append("aiActivityCardCarryingTroopsSlotCount!=3")
        if _as_int(click_result.get("aiActivityCardCarryingTroopsTextureCount"), 0) != 3:
            failures.append("aiActivityCardCarryingTroopsTextureCount!=3")
        carrying_troop_labels = click_result.get("aiActivityCardCarryingTroopsLabels", [])
        if isinstance(carrying_troop_labels, list):
            if len([label for label in carrying_troop_labels if str(label).strip()]) <= 0:
                failures.append("aiActivityCardCarryingTroopsLabels=empty")
        elif not str(carrying_troop_labels).strip():
            failures.append("aiActivityCardCarryingTroopsLabels=empty")
        if bool(click_result.get("aiActivityCardUsesExecutionTrace", False)) is not True:
            failures.append("aiActivityCardUsesExecutionTrace!=true")
        if _as_int(click_result.get("aiActivityCardTraceCount"), 0) <= 0:
            failures.append("aiActivityCardTraceCount<=0")
        if click_result.get("aiActivityCardTraceContinuityRibbonToken") != AI_ACTIVITY_CARD_TRACE_CONTINUITY_RIBBON_TOKEN:
            failures.append("aiActivityCardTraceContinuityRibbonToken!=ai_activity_card_trace_continuity_ribbon_v1")
        if bool(click_result.get("aiActivityCardTraceContinuityRibbonVisible", False)) is not True:
            failures.append("aiActivityCardTraceContinuityRibbonVisible!=true")
        if not str(click_result.get("aiActivityCardTraceContinuityTraceId", "")).strip():
            failures.append("aiActivityCardTraceContinuityTraceId=empty")
        if "执行线索" not in str(click_result.get("aiActivityCardTraceContinuityText", "")):
            failures.append("aiActivityCardTraceContinuityTextMissingCopy")
        if not str(click_result.get("aiActivityCardCurrentTaskText", "")).strip():
            failures.append("aiActivityCardCurrentTaskText=empty")
        if click_result.get("aiActivityCardOpenSource") == "badge" and action != "world_ai_activity_card_from_badge_fixture":
            failures.append("aiActivityCardOpenSourceBadgeOnWrongAction")
        if click_result.get("aiActivityCardOpenSource") == "marker" and action != "world_ai_activity_card_from_marker_fixture":
            failures.append("aiActivityCardOpenSourceMarkerOnWrongAction")
        if action == "world_ai_activity_card_from_badge_fixture" and click_result.get("aiActivityCardOpenSource") != "badge":
            failures.append("aiActivityCardOpenSource!=badge")
        if action == "world_ai_activity_card_from_marker_fixture":
            if click_result.get("aiActivityCardOpenSource") != "marker":
                failures.append("aiActivityCardOpenSource!=marker")
            if bool(click_result.get("aiActivityCardMarkerEntryRequested", False)) is not True:
                failures.append("aiActivityCardMarkerEntryRequested!=true")
        forbidden_hits = click_result.get("aiActivityCardForbiddenCopyHits", [])
        if isinstance(forbidden_hits, list) and forbidden_hits:
            failures.append("aiActivityCardForbiddenCopyHitsNotEmpty")
        elif not isinstance(forbidden_hits, list):
            failures.append("aiActivityCardForbiddenCopyHitsNotList")
    if action in MAIN_CITY_OVERLAY_CLOSE_BUTTON_CONTRACT_ACTIONS:
        close_result = click_result.get("closeResult", {})
        if not isinstance(close_result, dict) or not close_result:
            close_result = click_result.get("closeButtonResult", {})
        if not isinstance(close_result, dict):
            failures.append("mainCityOverlayCloseButtonResult missing")
            return failures
        if close_result.get("closeButtonClickedActionId") != "fullscreen_panel_close":
            failures.append("mainCityOverlayCloseButtonClickedActionId!=fullscreen_panel_close")
        if close_result.get("closeButtonClickedToken") != "fullscreen_panel_close_button_v1":
            failures.append("mainCityOverlayCloseButtonClickedToken!=fullscreen_panel_close_button_v1")
        if close_result.get("closeButtonClickedLiveTextContract") != "fullscreen_panel_close_live_text_v1":
            failures.append("mainCityOverlayCloseButtonClickedLiveTextContract!=fullscreen_panel_close_live_text_v1")
        if close_result.get("closeButtonClickedLiveTextLabel") != "关闭":
            failures.append("mainCityOverlayCloseButtonClickedLiveTextLabel!=关闭")
        if not bool(close_result.get("closeButtonClickVerified", False)):
            failures.append("mainCityOverlayCloseButtonClickVerified!=true")
        if not bool(close_result.get("closed", False)):
            failures.append("mainCityOverlayCloseButtonClosed!=true")
    if action in MAIN_CITY_OVERLAY_CLOSE_BUTTON_IDENTITY_ACTIONS:
        expected_panel_id = MAIN_CITY_OVERLAY_CLOSE_BUTTON_IDENTITY_ACTIONS[action]
        if click_result.get("expectedPanelId") != expected_panel_id:
            failures.append(f"mainCityOverlayCloseButtonIdentityPanelId!={expected_panel_id}")
        if not bool(click_result.get("identityOnly", False)):
            failures.append("mainCityOverlayCloseButtonIdentityOnly!=true")
        if not bool(click_result.get("returnedToMap", False)):
            failures.append("mainCityOverlayCloseButtonReturnedToMap!=true")
        close_result = click_result.get("closeResult", {})
        if not isinstance(close_result, dict):
            failures.append("mainCityOverlayCloseButtonResult missing")
            return failures
        if close_result.get("closeButtonClickedActionId") != "fullscreen_panel_close":
            failures.append("mainCityOverlayCloseButtonClickedActionId!=fullscreen_panel_close")
        if close_result.get("closeButtonClickedToken") != "fullscreen_panel_close_button_v1":
            failures.append("mainCityOverlayCloseButtonClickedToken!=fullscreen_panel_close_button_v1")
        if close_result.get("closeButtonClickedLiveTextContract") != "fullscreen_panel_close_live_text_v1":
            failures.append("mainCityOverlayCloseButtonClickedLiveTextContract!=fullscreen_panel_close_live_text_v1")
        if close_result.get("closeButtonClickedLiveTextLabel") != "关闭":
            failures.append("mainCityOverlayCloseButtonClickedLiveTextLabel!=关闭")
        if not bool(close_result.get("closeButtonClickVerified", False)):
            failures.append("mainCityOverlayCloseButtonClickVerified!=true")
        if not bool(close_result.get("closed", False)):
            failures.append("mainCityOverlayCloseButtonClosed!=true")
    if action in BATTLE_REPORT_DETAIL_BACK_BUTTON_IDENTITY_ACTIONS:
        expected_action_id, expected_label, expected_page_id, expected_token, expected_button_name = BATTLE_REPORT_DETAIL_BACK_BUTTON_IDENTITY_ACTIONS[action]
        if not bool(click_result.get("identityOnly", False)):
            failures.append("battleReportDetailBackButtonIdentityOnly!=true")
        if click_result.get("activePageIdAfterBack") != expected_page_id:
            failures.append(f"battleReportDetailBackButtonActivePageId!={expected_page_id}")
        if click_result.get("battleReportDetailBackButtonClickedActionId") != expected_action_id:
            failures.append(f"battleReportDetailBackButtonClickedActionId!={expected_action_id}")
        if click_result.get("battleReportDetailBackButtonClickedLabel") != expected_label:
            failures.append(f"battleReportDetailBackButtonClickedLabel!={expected_label}")
        if click_result.get("battleReportDetailBackButtonClickedToken") != expected_token:
            failures.append(f"battleReportDetailBackButtonClickedToken!={expected_token}")
        if click_result.get("battleReportDetailBackButtonClickedLiveTextContract") != BATTLE_REPORT_DETAIL_BUTTON_LIVE_TEXT_CONTRACT:
            failures.append(f"battleReportDetailBackButtonClickedLiveTextContract!={BATTLE_REPORT_DETAIL_BUTTON_LIVE_TEXT_CONTRACT}")
        if click_result.get("battleReportDetailBackButtonClickedButtonName") != expected_button_name:
            failures.append(f"battleReportDetailBackButtonClickedButtonName!={expected_button_name}")
        if bool(click_result.get("battleReportDetailBackButtonClickVerified", False)) is not True:
            failures.append("battleReportDetailBackButtonClickVerified!=true")
    if action in BATTLE_REPORT_DETAIL_TAB_BUTTON_IDENTITY_ACTIONS:
        expected_action_id, expected_label, expected_page_id, expected_token, expected_button_name = BATTLE_REPORT_DETAIL_TAB_BUTTON_IDENTITY_ACTIONS[action]
        if not bool(click_result.get("identityOnly", False)):
            failures.append("battleReportDetailTabButtonIdentityOnly!=true")
        if click_result.get("activePageIdAfterTab") != expected_page_id:
            failures.append(f"battleReportDetailTabButtonActivePageId!={expected_page_id}")
        if click_result.get("battleReportDetailTabButtonClickedActionId") != expected_action_id:
            failures.append(f"battleReportDetailTabButtonClickedActionId!={expected_action_id}")
        if click_result.get("battleReportDetailTabButtonClickedLabel") != expected_label:
            failures.append(f"battleReportDetailTabButtonClickedLabel!={expected_label}")
        if click_result.get("battleReportDetailTabButtonClickedToken") != expected_token:
            failures.append(f"battleReportDetailTabButtonClickedToken!={expected_token}")
        if click_result.get("battleReportDetailTabButtonClickedLiveTextContract") != BATTLE_REPORT_DETAIL_BUTTON_LIVE_TEXT_CONTRACT:
            failures.append(f"battleReportDetailTabButtonClickedLiveTextContract!={BATTLE_REPORT_DETAIL_BUTTON_LIVE_TEXT_CONTRACT}")
        if click_result.get("battleReportDetailTabButtonClickedButtonName") != expected_button_name:
            failures.append(f"battleReportDetailTabButtonClickedButtonName!={expected_button_name}")
        if bool(click_result.get("battleReportDetailTabButtonClickVerified", False)) is not True:
            failures.append("battleReportDetailTabButtonClickVerified!=true")
    if action in BATTLE_REPORT_DETAIL_FOOTER_BUTTON_IDENTITY_ACTIONS:
        expected_action_id, expected_label, expected_token, expected_button_name = BATTLE_REPORT_DETAIL_FOOTER_BUTTON_IDENTITY_ACTIONS[action]
        if not bool(click_result.get("identityOnly", False)):
            failures.append("battleReportDetailFooterButtonIdentityOnly!=true")
        if click_result.get("activePageIdAfterFooterAction") != click_result.get("detailPageIdBeforeFooterAction"):
            failures.append("battleReportDetailFooterButtonActivePageChanged")
        if click_result.get("battleReportDetailFooterButtonClickedActionId") != expected_action_id:
            failures.append(f"battleReportDetailFooterButtonClickedActionId!={expected_action_id}")
        if click_result.get("battleReportDetailFooterButtonClickedLabel") != expected_label:
            failures.append(f"battleReportDetailFooterButtonClickedLabel!={expected_label}")
        if click_result.get("battleReportDetailFooterButtonClickedToken") != expected_token:
            failures.append(f"battleReportDetailFooterButtonClickedToken!={expected_token}")
        if click_result.get("battleReportDetailFooterButtonClickedLiveTextContract") != BATTLE_REPORT_DETAIL_BUTTON_LIVE_TEXT_CONTRACT:
            failures.append(f"battleReportDetailFooterButtonClickedLiveTextContract!={BATTLE_REPORT_DETAIL_BUTTON_LIVE_TEXT_CONTRACT}")
        if click_result.get("battleReportDetailFooterButtonClickedButtonName") != expected_button_name:
            failures.append(f"battleReportDetailFooterButtonClickedButtonName!={expected_button_name}")
        if bool(click_result.get("battleReportDetailFooterButtonClickVerified", False)) is not True:
            failures.append("battleReportDetailFooterButtonClickVerified!=true")
    if action in MAIL_PANEL_ROW_SELECT_BUTTON_IDENTITY_ACTIONS:
        expected_action_id, expected_token, expected_button_name = MAIL_PANEL_ROW_SELECT_BUTTON_IDENTITY_ACTIONS[action]
        if not bool(click_result.get("identityOnly", False)):
            failures.append("mailPanelRowSelectIdentityOnly!=true")
        if click_result.get("activePageIdAfterMailRowSelect") != click_result.get("beforeActivePageId"):
            failures.append("mailPanelRowSelectActivePageChanged")
        if click_result.get("mailPanelRowSelectClickedActionId") != expected_action_id:
            failures.append(f"mailPanelRowSelectClickedActionId!={expected_action_id}")
        if str(click_result.get("mailPanelRowSelectClickedLabel", "")).strip() == "":
            failures.append("mailPanelRowSelectClickedLabel empty")
        if click_result.get("mailPanelRowSelectClickedToken") != expected_token:
            failures.append(f"mailPanelRowSelectClickedToken!={expected_token}")
        if click_result.get("mailPanelRowSelectClickedLiveTextContract") != MAIL_PANEL_ROW_SELECT_LIVE_TEXT_CONTRACT:
            failures.append(f"mailPanelRowSelectClickedLiveTextContract!={MAIL_PANEL_ROW_SELECT_LIVE_TEXT_CONTRACT}")
        if click_result.get("mailPanelRowSelectClickedButtonName") != expected_button_name:
            failures.append(f"mailPanelRowSelectClickedButtonName!={expected_button_name}")
        if bool(click_result.get("mailPanelRowSelectClickVerified", False)) is not True:
            failures.append("mailPanelRowSelectClickVerified!=true")
    if action in MAIL_PANEL_TAB_BUTTON_IDENTITY_ACTIONS:
        expected_target_page_id, expected_action_id, expected_token, expected_button_name = MAIL_PANEL_TAB_BUTTON_IDENTITY_ACTIONS[action]
        if not bool(click_result.get("identityOnly", False)):
            failures.append("mailPanelTabButtonIdentityOnly!=true")
        if click_result.get("activePageIdAfterMailTab") != expected_target_page_id:
            failures.append(f"mailPanelTabButtonActivePageId!={expected_target_page_id}")
        if click_result.get("mailPanelTabButtonClickedTargetPageId") != expected_target_page_id:
            failures.append(f"mailPanelTabButtonClickedTargetPageId!={expected_target_page_id}")
        if click_result.get("mailPanelTabButtonClickedActionId") != expected_action_id:
            failures.append(f"mailPanelTabButtonClickedActionId!={expected_action_id}")
        if str(click_result.get("mailPanelTabButtonClickedLabel", "")).strip() == "":
            failures.append("mailPanelTabButtonClickedLabel empty")
        if click_result.get("mailPanelTabButtonClickedToken") != expected_token:
            failures.append(f"mailPanelTabButtonClickedToken!={expected_token}")
        if click_result.get("mailPanelTabButtonClickedLiveTextContract") != PANEL_TAB_LIVE_TEXT_CONTRACT:
            failures.append(f"mailPanelTabButtonClickedLiveTextContract!={PANEL_TAB_LIVE_TEXT_CONTRACT}")
        if click_result.get("mailPanelTabButtonClickedButtonName") != expected_button_name:
            failures.append(f"mailPanelTabButtonClickedButtonName!={expected_button_name}")
        if bool(click_result.get("mailPanelTabButtonClickVerified", False)) is not True:
            failures.append("mailPanelTabButtonClickVerified!=true")
    if action in PANEL_TAB_BUTTON_IDENTITY_ACTIONS:
        expected_panel_id, expected_target_page_id, expected_action_id, expected_token, expected_button_name = PANEL_TAB_BUTTON_IDENTITY_ACTIONS[action]
        if not bool(click_result.get("identityOnly", False)):
            failures.append("panelTabButtonIdentityOnly!=true")
        if click_result.get("panelId") != expected_panel_id:
            failures.append(f"panelTabButtonPanelId!={expected_panel_id}")
        if click_result.get("activePageIdAfterPanelTab") != expected_target_page_id:
            failures.append(f"panelTabButtonActivePageId!={expected_target_page_id}")
        if click_result.get("panelTabButtonClickedTargetPageId") != expected_target_page_id:
            failures.append(f"panelTabButtonClickedTargetPageId!={expected_target_page_id}")
        if click_result.get("panelTabButtonClickedActionId") != expected_action_id:
            failures.append(f"panelTabButtonClickedActionId!={expected_action_id}")
        if str(click_result.get("panelTabButtonClickedLabel", "")).strip() == "":
            failures.append("panelTabButtonClickedLabel empty")
        if click_result.get("panelTabButtonClickedToken") != expected_token:
            failures.append(f"panelTabButtonClickedToken!={expected_token}")
        if click_result.get("panelTabButtonClickedLiveTextContract") != PANEL_TAB_LIVE_TEXT_CONTRACT:
            failures.append(f"panelTabButtonClickedLiveTextContract!={PANEL_TAB_LIVE_TEXT_CONTRACT}")
        if click_result.get("panelTabButtonClickedButtonName") != expected_button_name:
            failures.append(f"panelTabButtonClickedButtonName!={expected_button_name}")
        if bool(click_result.get("panelTabButtonClickVerified", False)) is not True:
            failures.append("panelTabButtonClickVerified!=true")
    if action in SETTINGS_ACTION_ROW_BUTTON_IDENTITY_ACTIONS:
        expected_page_id, expected_action_id, expected_token, expected_button_name = SETTINGS_ACTION_ROW_BUTTON_IDENTITY_ACTIONS[action]
        if not bool(click_result.get("identityOnly", False)):
            failures.append("settingsActionRowIdentityOnly!=true")
        if click_result.get("activePageId") != expected_page_id:
            failures.append(f"settingsActionRowActivePageId!={expected_page_id}")
        if click_result.get("settingsActionRowClickedActionId") != expected_action_id:
            failures.append(f"settingsActionRowClickedActionId!={expected_action_id}")
        if str(click_result.get("settingsActionRowClickedLabel", "")).strip() == "":
            failures.append("settingsActionRowClickedLabel empty")
        if click_result.get("settingsActionRowClickedToken") != expected_token:
            failures.append(f"settingsActionRowClickedToken!={expected_token}")
        if click_result.get("settingsActionRowClickedLiveTextContract") != SETTINGS_ACTION_ROW_LIVE_TEXT_CONTRACT:
            failures.append(f"settingsActionRowClickedLiveTextContract!={SETTINGS_ACTION_ROW_LIVE_TEXT_CONTRACT}")
        if click_result.get("settingsActionRowClickedButtonName") != expected_button_name:
            failures.append(f"settingsActionRowClickedButtonName!={expected_button_name}")
        if bool(click_result.get("settingsActionRowClickVerified", False)) is not True:
            failures.append("settingsActionRowClickVerified!=true")
    return failures


def _load_godot_report_payload(payload: dict[str, Any]) -> dict[str, Any]:
    inline_report = payload.get("godotReport", {})
    if isinstance(inline_report, dict) and inline_report:
        return inline_report
    artifacts = payload.get("artifacts", {})
    report_path = artifacts.get("godotReport", "") if isinstance(artifacts, dict) else ""
    if not isinstance(report_path, str) or report_path.strip() == "":
        return {}
    path = Path(report_path)
    if not path.is_absolute():
        path = REPO_ROOT / path
    if not path.exists():
        return {}
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return loaded if isinstance(loaded, dict) else {}


def _load_visual_smoke_summary_payload(payload: dict[str, Any]) -> dict[str, Any]:
    artifacts = payload.get("artifacts", {})
    report_path = artifacts.get("summaryReport", "") if isinstance(artifacts, dict) else ""
    if not isinstance(report_path, str) or report_path.strip() == "":
        return {}
    path = Path(report_path)
    if not path.is_absolute():
        path = REPO_ROOT / path
    if not path.exists():
        return {}
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return loaded if isinstance(loaded, dict) else {}


def _resolve_visual_smoke_screenshot_stats(
    payload: dict[str, Any],
    summary_payload: dict[str, Any],
) -> dict[str, Any]:
    inline_stats = payload.get("screenshotStats", {})
    if isinstance(inline_stats, dict) and inline_stats:
        return inline_stats
    summary_stats = summary_payload.get("screenshotStats", {})
    return summary_stats if isinstance(summary_stats, dict) else {}


def _as_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _res_path_to_local_path(path: str) -> Path:
    normalized = str(path or "").strip()
    if not normalized.startswith("res://"):
        return Path(normalized)
    return REPO_ROOT / "godot-client" / normalized.removeprefix("res://")


def _read_image_size(path: Path) -> tuple[int, int] | None:
    try:
        data = path.read_bytes()
    except OSError:
        return None
    if data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 24:
        width, height = struct.unpack(">II", data[16:24])
        return int(width), int(height)
    if data.startswith(b"\xff\xd8"):
        offset = 2
        while offset + 9 < len(data):
            if data[offset] != 0xFF:
                offset += 1
                continue
            marker = data[offset + 1]
            offset += 2
            if marker in (0xD8, 0xD9):
                continue
            if offset + 2 > len(data):
                return None
            segment_length = int.from_bytes(data[offset:offset + 2], "big")
            if segment_length < 2 or offset + segment_length > len(data):
                return None
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                height = int.from_bytes(data[offset + 3:offset + 5], "big")
                width = int.from_bytes(data[offset + 5:offset + 7], "big")
                return int(width), int(height)
            offset += segment_length
    return None


def _validate_world_event_activity_fixture_asset_contract() -> list[str]:
    failures: list[str] = []
    try:
        data = json.loads(WORLD_EVENT_ACTIVITY_TEMPLATE_FIXTURE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"worldEventActivityFixtureUnreadable:{exc}"]
    entry_configs = data.get("entry_configs", {})
    activities_config = entry_configs.get("activities", {}) if isinstance(entry_configs, dict) else {}
    configured_slots = activities_config.get("asset_slots", []) if isinstance(activities_config, dict) else []
    slot_whitelist = {str(slot).strip() for slot in configured_slots if str(slot).strip()}
    activities = data.get("activities", {})
    cards = activities.get("cards", []) if isinstance(activities, dict) else []
    if not isinstance(cards, list) or len(cards) < 3:
        return ["worldEventActivityCards<3"]
    assigned_count = 0
    for index, card in enumerate(cards, start=1):
        if not isinstance(card, dict):
            failures.append(f"activityCard{index}NotDict")
            continue
        title = str(card.get("title", f"card{index}")).strip()
        image_path = str(card.get("image_path", "")).strip()
        asset_slot = str(card.get("asset_slot", card.get("assetSlot", ""))).strip()
        cover_mode = str(card.get("cover_mode", card.get("coverMode", ""))).strip()
        is_empty = bool(card.get("empty", False))
        if asset_slot and asset_slot not in slot_whitelist:
            failures.append(f"activityCard{index}AssetSlotNotWhitelisted:{asset_slot}")
        if not image_path:
            if not is_empty and asset_slot:
                failures.append(f"activityCard{index}AssetMissing:{title}")
            continue
        assigned_count += 1
        if not any(image_path.startswith(root) for root in WORLD_EVENT_ACTIVITY_CARD_ALLOWED_ASSET_ROOTS):
            failures.append(f"activityCard{index}AssetRootNotAllowed:{image_path}")
        if cover_mode != "asset_drop_cover":
            failures.append(f"activityCard{index}CoverModeNotAssetDropCover:{cover_mode}")
        local_path = _res_path_to_local_path(image_path)
        if not local_path.exists():
            failures.append(f"activityCard{index}AssetMissingOnDisk:{image_path}")
            continue
        size = _read_image_size(local_path)
        if size is None:
            failures.append(f"activityCard{index}AssetSizeUnreadable:{image_path}")
            continue
        width, height = size
        if width < 640 or height < 360:
            failures.append(f"activityCard{index}AssetTooSmall:{width}x{height}")
        if width * 9 != height * 16:
            failures.append(f"activityCard{index}AssetAspectNot16x9:{width}x{height}")
    if assigned_count < 3:
        failures.append("activityAssignedAssetCount<3")
    return failures


def _validate_world_event_activity_feature_card_source_contract() -> list[str]:
    failures: list[str] = []
    try:
        source = SNAPSHOT_SECTION_PAGE_SCRIPT_PATH.read_text(encoding="utf-8")
        panel_source = WORLD_EVENT_ACTIVITY_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
        factory_source = SLG_UI_COMPONENT_FACTORY_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"worldEventActivitySourceUnreadable:{exc}"]
    required_functions = [
        "_build_feature_card_showcase_composition_state",
        "_build_feature_card_render_state",
        "_build_feature_card_caption_row_state",
        "_build_feature_card_image_slot_state",
        "_build_feature_card_placeholder_art_state",
        "_build_feature_card_chrome",
        "_build_feature_caption_bar",
        "_build_feature_image_slot",
        "_build_feature_title_bar",
    ]
    for function_name in required_functions:
        if _extract_gdscript_function(source, f"{function_name}(") == "":
            failures.append(f"activityFeatureCardFunctionMissing:{function_name}")
    build_feature_card_source = _extract_gdscript_function(source, "_build_feature_card(")
    if "_build_feature_card_render_state" not in build_feature_card_source:
        failures.append("activityFeatureCardRenderStateNotUsed")
    if "_build_feature_caption_bar" not in build_feature_card_source:
        failures.append("activityFeatureCardCaptionBarNotUsed")
    grid_block_source = _extract_gdscript_function(source, "_build_feature_card_grid_block(")
    if "_build_feature_card_showcase_composition_state" not in grid_block_source:
        failures.append("activityFeatureCardShowcaseCompositionStateNotUsed")
    showcase_row_source = _extract_gdscript_function(source, "_build_feature_showcase_row(")
    if "showcase_state" not in showcase_row_source:
        failures.append("activityFeatureShowcaseRowStateNotUsed")
    caption_bar_source = _extract_gdscript_function(source, "_build_feature_caption_bar(")
    if "_build_feature_card_caption_row_state" not in caption_bar_source:
        failures.append("activityFeatureCardCaptionRowStateNotUsed")
    image_slot_source = _extract_gdscript_function(source, "_build_feature_image_slot(")
    if "_build_feature_card_image_slot_state" not in image_slot_source:
        failures.append("activityFeatureCardImageSlotStateNotUsed")
    placeholder_art_source = _extract_gdscript_function(source, "_populate_feature_placeholder_art(")
    if "_build_feature_card_placeholder_art_state" not in placeholder_art_source:
        failures.append("activityFeatureCardPlaceholderArtStateNotUsed")
    activity_motion_source = _extract_gdscript_function(source, "_apply_activity_motion_sample(")
    if "apply_motion_activity_empty_drop_unfurl_enter" not in activity_motion_source:
        failures.append("activityMotionEmptyDropUnfurlV3NotUsed")
    if "cached_ui_texture" not in _extract_gdscript_function(source, "_load_card_image_texture("):
        failures.append("activityCardImageLoaderDoesNotUseCachedTexture")
    if "prewarm_activity_feature_card_textures_from_snapshot" not in factory_source:
        failures.append("activityAssetPrewarmFactoryMissing")
    set_snapshot_index = panel_source.find("set_snapshot(normalized_snapshot)")
    prewarm_index = panel_source.find("prewarm_activity_feature_card_textures_from_snapshot(normalized_snapshot)")
    if prewarm_index < 0:
        failures.append("activityPanelPrewarmCallMissing")
    elif set_snapshot_index < 0 or prewarm_index > set_snapshot_index:
        failures.append("activityPanelPrewarmNotBeforeSetSnapshot")
    return failures


def _validate_visual_screenshot_stats(action: str, screenshot_stats: dict[str, Any]) -> list[str]:
    if action not in VISUAL_SCREENSHOT_STATS_ACTIONS:
        return []
    failures: list[str] = []
    if screenshot_stats.get("ok") is not True:
        failures.append("visualScreenshotStatsOk!=true")
    if screenshot_stats.get("nonFlat") is not True:
        failures.append("visualScreenshotNonFlat!=true")
    mean = screenshot_stats.get("mean")
    if not isinstance(mean, list) or len(mean) < 3:
        failures.append("visualScreenshotMeanMissing")
        return failures
    try:
        red = float(mean[0])
        green = float(mean[1])
        blue = float(mean[2])
    except (TypeError, ValueError):
        failures.append("visualScreenshotMeanInvalid")
        return failures
    if red < 30.0:
        failures.append("visualScreenshotMeanRed<30")
    if green < 20.0:
        failures.append("visualScreenshotMeanGreen<20")
    if red <= blue:
        failures.append("visualScreenshotWarmthRedNotAboveBlue")
    return failures


def _validate_chat_channel_new_channel_contract(action: str, click_result: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if click_result.get("newChannelUsesReadModel") is not True:
        failures.append("newChannelUsesReadModel!=true")
    group_ids = click_result.get("newChannelCandidateGroupIds", [])
    if not isinstance(group_ids, list):
        failures.append("newChannelCandidateGroupIdsMissing")
        group_ids = []
    required_group_ids = {"friend", "alliance_member", "managed_member", "ai_player"}
    missing_group_ids = sorted(required_group_ids.difference({str(group_id) for group_id in group_ids}))
    if missing_group_ids:
        failures.append(f"newChannelCandidateGroupIdsMissing:{','.join(missing_group_ids)}")
    if _as_int(click_result.get("newChannelCandidateGroupCount"), -1) < 4:
        failures.append("newChannelCandidateGroupCount<4")
    if _as_int(click_result.get("newChannelAiPlayerCandidateCount"), -1) < 1:
        failures.append("newChannelAiPlayerCandidateCount<1")
    if click_result.get("newChannelAiCandidateOpensChannel") is not True:
        failures.append("newChannelAiCandidateOpensChannel!=true")
    if action == "shell_open_chat_channel_new_channel_contacts":
        if click_result.get("newChannelContactCandidatesFromReadModel") is not True:
            failures.append("newChannelContactCandidatesFromReadModel!=true")
        if _as_int(click_result.get("newChannelContactCandidateCount"), -1) < 3:
            failures.append("newChannelContactCandidateCount<3")
        if click_result.get("newChannelContactCandidateOpensChannel") is not True:
            failures.append("newChannelContactCandidateOpensChannel!=true")
    return failures


def _validate_chat_message_style_contract(click_result: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    failures.extend(_validate_ai_chat_motion_contract(click_result, "chat"))
    if click_result.get("chatMessageBubbleLayout") != "avatar_left_ai_right_player_v1":
        failures.append("chatMessageBubbleLayout!=avatar_left_ai_right_player_v1")
    if click_result.get("chatMessageScrollTarget") != "message_history":
        failures.append("chatMessageScrollTarget!=message_history")
    if click_result.get("chatMessageAvatarMode") != "ai_portrait_or_badge_player_badge_v1":
        failures.append("chatMessageAvatarMode!=ai_portrait_or_badge_player_badge_v1")
    if _as_int(click_result.get("chatMessageAvatarCount"), -1) < 2:
        failures.append("chatMessageAvatarCount<2")
    if _as_int(click_result.get("chatMessagePlayerBubbleCount"), -1) < 1:
        failures.append("chatMessagePlayerBubbleCount<1")
    if _as_int(click_result.get("chatMessageAiBubbleCount"), -1) < 1:
        failures.append("chatMessageAiBubbleCount<1")
    if click_result.get("chatMessagePlayerRightAligned") is not True:
        failures.append("chatMessagePlayerRightAligned!=true")
    if click_result.get("chatMessageAiLeftAligned") is not True:
        failures.append("chatMessageAiLeftAligned!=true")
    if click_result.get("chatChannelRailTitleText") != "频道":
        failures.append("chatChannelRailTitleText!=频道")
    if click_result.get("chatChannelHeaderTitleSeparated") is not True:
        failures.append("chatChannelHeaderTitleSeparated!=true")
    if click_result.get("chatChannelRailMode") != CHAT_COMMAND_CHANNEL_RAIL_MODE:
        failures.append("chatChannelRailMode!=command_chrome_text_channel_drawer_v1")
    if click_result.get("chatChromeUnificationToken") != CHAT_COMMAND_CHROME_TOKEN:
        failures.append("chatChromeUnificationToken!=chat_command_chrome_v1")
    if click_result.get("chatChromeUnificationOk") is not True:
        failures.append("chatChromeUnificationOk!=true")
    if click_result.get("chatChannelDrawerCommandChromeOk") is not True:
        failures.append("chatChannelDrawerCommandChromeOk!=true")
    if click_result.get("chatMessageCommandChromeSurfaceOk") is not True:
        failures.append("chatMessageCommandChromeSurfaceOk!=true")
    if click_result.get("chatComposerCommandChromeOk") is not True:
        failures.append("chatComposerCommandChromeOk!=true")
    base_channel_ids = click_result.get("chatChannelBaseChannelIds", [])
    if not isinstance(base_channel_ids, list):
        failures.append("chatChannelBaseChannelIdsMissing")
        base_channel_ids = []
    for required_id in ["world", "alliance", "new_channel"]:
        if required_id not in {str(channel_id) for channel_id in base_channel_ids}:
            failures.append(f"chatChannelBaseChannelMissing:{required_id}")
    base_channel_labels = click_result.get("chatChannelBaseChannelLabels", [])
    if not isinstance(base_channel_labels, list):
        failures.append("chatChannelBaseChannelLabelsMissing")
        base_channel_labels = []
    base_channel_label_set = {str(label) for label in base_channel_labels}
    if click_result.get("chatChannelWorldLabel") != "世界":
        failures.append("chatChannelWorldLabel!=世界")
    if "世界" not in base_channel_label_set:
        failures.append("chatChannelBaseChannelLabels_missing_世界")
    if "事件" in base_channel_label_set:
        failures.append("chatChannelBaseChannelLabels_has_事件")
    if _as_int(click_result.get("chatChannelAiChannelCount"), -1) < 1:
        failures.append("chatChannelAiChannelCount<1")
    if click_result.get("chatChannelAccentRailVisible") is not False:
        failures.append("chatChannelAccentRailVisible!=false")
    if click_result.get("chatChannelNewChannelLabel") != "＋":
        failures.append("chatChannelNewChannelLabel!=＋")
    if _as_float(click_result.get("chatChannelButtonMinHeight"), -1.0) < 58.0:
        failures.append("chatChannelButtonMinHeight<58")
    section_labels = click_result.get("chatChannelSectionLabels", [])
    if not isinstance(section_labels, list) or "AI玩家" not in {str(label) for label in section_labels}:
        failures.append("chatChannelSectionLabels_missing_AI玩家")
    if click_result.get("chatChannelActiveAiPlayerSeparated") is not True:
        failures.append("chatChannelActiveAiPlayerSeparated!=true")
    if click_result.get("chatChannelRailTileMode") != "full_width_clean_channel_tiles_v1":
        failures.append("chatChannelRailTileMode!=full_width_clean_channel_tiles_v1")
    if click_result.get("chatVoiceSettingsPanelVisible") is not False:
        failures.append("chatVoiceSettingsPanelVisible!=false")
    if click_result.get("chatVoiceSettingsMovedToAiPanel") is not True:
        failures.append("chatVoiceSettingsMovedToAiPanel!=true")
    if click_result.get("chatVoiceSettingsSource") != "ai_panel_voice_page_only_v1":
        failures.append("chatVoiceSettingsSource!=ai_panel_voice_page_only_v1")
    if click_result.get("chatChannelSubtitleHidden") is not True:
        failures.append("chatChannelSubtitleHidden!=true")
    if _as_float(click_result.get("chatChannelPrimaryMinFontSize"), -1.0) < 18.0:
        failures.append("chatChannelPrimaryMinFontSize<18")
    if click_result.get("chatMessageHistoryHintHidden") is not True:
        failures.append("chatMessageHistoryHintHidden!=true")
    if click_result.get("chatVisibleScrollbarsHidden") is not True:
        failures.append("chatVisibleScrollbarsHidden!=true")
    if click_result.get("chatComposerCommandBgToken") != CHAT_PAPER_ACTION_COMMAND_BG_TOKEN:
        failures.append("chatComposerCommandBgToken!=chat_paper_action_command_bg_v1")
    if click_result.get("chatComposerCommandTokenOk") is not True:
        failures.append("chatComposerCommandTokenOk!=true")
    composer_labels = click_result.get("chatComposerCommandLiveLabels", [])
    if not isinstance(composer_labels, list):
        composer_labels = []
    for required_label in ["视频", "说话", "发送"]:
        if required_label not in {str(label) for label in composer_labels}:
            failures.append(f"chatComposerCommandLiveLabels_missing_{required_label}")
    if click_result.get("chatHistoryFilterCommandBgToken") != CHAT_PAPER_ACTION_COMMAND_BG_TOKEN:
        failures.append("chatHistoryFilterCommandBgToken!=chat_paper_action_command_bg_v1")
    if click_result.get("chatHistoryFilterCommandTokenOk") is not True:
        failures.append("chatHistoryFilterCommandTokenOk!=true")
    if click_result.get("chatHistoryLoadEarlierButtonPreserved") is not True:
        failures.append("chatHistoryLoadEarlierButtonPreserved!=true")
    failures.extend(_validate_portrait_frame_contract(click_result, "chatAvatar", PORTRAIT_FRAME_AVATAR_VARIANT))
    failures.extend(_validate_chat_avatar_source_contract())
    failures.extend(_validate_chat_voice_settings_removed_source_contract())
    return failures


def _validate_chat_ai_activity_continuity_contract(click_result: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if click_result.get("chatAiActivityContinuityToken") != CHAT_AI_ACTIVITY_CONTINUITY_TOKEN:
        failures.append("chatAiActivityContinuityToken!=chat_ai_activity_continuity_v1")
    if click_result.get("chatAiActivityContinuityVisible") is not True:
        failures.append("chatAiActivityContinuityVisible!=true")
    if click_result.get("chatAiActivityUsesExecutionTrace") is not True:
        failures.append("chatAiActivityUsesExecutionTrace!=true")
    if click_result.get("chatAiActivityFallbackUsed") is not False:
        failures.append("chatAiActivityFallbackUsed!=false")
    if _as_int(click_result.get("chatAiActivityTraceCount"), 0) < 1:
        failures.append("chatAiActivityTraceCount<1")
    if click_result.get("chatAiActivitySource") != "playerRuntimeExecutionTraceItems":
        failures.append("chatAiActivitySource!=playerRuntimeExecutionTraceItems")
    if _as_int(click_result.get("chatAiActivityStripCount"), 0) < 1:
        failures.append("chatAiActivityStripCount<1")
    if _as_int(click_result.get("chatAiActivityStatusDotCount"), 0) < 1:
        failures.append("chatAiActivityStatusDotCount<1")
    if _as_int(click_result.get("chatAiActivityTaskLabelCount"), 0) < 1:
        failures.append("chatAiActivityTaskLabelCount<1")
    if not str(click_result.get("chatAiActivityCurrentTaskText", "")).strip():
        failures.append("chatAiActivityCurrentTaskTextEmpty")
    if click_result.get("chatAiActivityForbiddenCopyOk") is not True:
        failures.append("chatAiActivityForbiddenCopyOk!=true")
    return failures


def _validate_ai_activity_same_trace_cross_surface_contract(click_result: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if click_result.get("aiActivitySameTraceCrossSurfaceToken") != AI_ACTIVITY_SAME_TRACE_CROSS_SURFACE_TOKEN:
        failures.append("aiActivitySameTraceCrossSurfaceToken!=ai_activity_same_trace_cross_surface_v1")
    if click_result.get("aiActivitySameTraceCrossSurfaceOk") is not True:
        failures.append("aiActivitySameTraceCrossSurfaceOk!=true")
    expected_trace_id = str(click_result.get("aiActivitySameTraceId", "")).strip()
    if not expected_trace_id:
        failures.append("aiActivitySameTraceId=empty")
    if _as_int(click_result.get("aiActivitySameTraceSurfaceCount"), 0) < 5:
        failures.append("aiActivitySameTraceSurfaceCount<5")
    surface_fields = [
        "aiActivitySameTraceAiPanelTraceId",
        "aiActivitySameTraceMainWorldTraceId",
        "aiActivitySameTraceBattleReportTraceId",
        "aiActivitySameTraceTianxiaTraceId",
        "aiActivitySameTraceChatTraceId",
    ]
    for field in surface_fields:
        value = str(click_result.get(field, "")).strip()
        if not value:
            failures.append(f"{field}=empty")
        elif expected_trace_id and value != expected_trace_id:
            failures.append("aiActivitySameTraceMismatch")
    mismatches = click_result.get("aiActivitySameTraceMismatch", [])
    if isinstance(mismatches, list) and mismatches:
        failures.append("aiActivitySameTraceMismatch")
    elif not isinstance(mismatches, list):
        failures.append("aiActivitySameTraceMismatchNotList")
    if click_result.get("aiActivityIdentityChipToken") != AI_ACTIVITY_IDENTITY_CHIP_TOKEN:
        failures.append("aiActivityIdentityChipToken!=ai_activity_identity_chip_v1")
    if click_result.get("aiActivityIdentityChipCrossSurfaceOk") is not True:
        failures.append("aiActivityIdentityChipCrossSurfaceOk!=true")
    if _as_int(click_result.get("aiActivityIdentityChipSurfaceCount"), 0) < 3:
        failures.append("aiActivityIdentityChipSurfaceCount<3")
    identity_chip_count_fields = [
        "aiActivityIdentityChipAiPanelVisibleCount",
        "aiActivityIdentityChipBattleReportVisibleCount",
        "aiActivityIdentityChipChatVisibleCount",
    ]
    for field in identity_chip_count_fields:
        if _as_int(click_result.get(field), 0) < 1:
            failures.append(f"{field}<1")
    if click_result.get("aiActivityMarkerFamilyContract") != AI_LIVING_ACTIVITY_MARKER_FAMILY_TOKEN:
        failures.append("aiActivityMarkerFamilyContract!=ai_living_activity_marker_family_v1")
    if click_result.get("aiActivityMarkerFamilyCrossSurfaceOk") is not True:
        failures.append("aiActivityMarkerFamilyCrossSurfaceOk!=true")
    if _as_int(click_result.get("aiActivityMarkerFamilyMainWorldFrameAssetDrawCount"), 0) <= 0:
        failures.append("aiActivityMarkerFamilyMainWorldFrameAssetDrawCount<=0")
    if _as_int(click_result.get("aiActivityMarkerFamilyTianxiaHotspotAssetDrawCount"), 0) <= 0:
        failures.append("aiActivityMarkerFamilyTianxiaHotspotAssetDrawCount<=0")
    return failures


def _validate_chat_voice_settings_removed_source_contract() -> list[str]:
    failures: list[str] = []
    if not MAIN_CHAT_OVERLAY_SCRIPT_PATH.exists():
        return ["mainChatOverlayScriptMissing"]
    source = MAIN_CHAT_OVERLAY_SCRIPT_PATH.read_text(encoding="utf-8")
    forbidden_needles = [
        "_build_voice_settings_panel",
        "ChatVoiceSettingsPanel",
        "get_ai_player_voice_profile",
        "update_ai_player_voice_profile",
        "voiceProfileId",
        "autoSpeechMode",
    ]
    for needle in forbidden_needles:
        if needle in source:
            failures.append(f"chatVoiceSettingsLegacySourcePresent:{needle}")
    if '"chatVoiceSettingsSource": "ai_panel_voice_page_only_v1"' not in source:
        failures.append("chatVoiceSettingsSourceSummaryMissing")
    return failures


def _validate_chat_avatar_source_contract() -> list[str]:
    failures: list[str] = []
    if not MAIN_CHAT_OVERLAY_SCRIPT_PATH.exists():
        return ["mainChatOverlayScriptMissing"]
    source = MAIN_CHAT_OVERLAY_SCRIPT_PATH.read_text(encoding="utf-8")
    avatar_builder = _extract_gdscript_function(source, "_build_portrait_avatar")
    if avatar_builder == "":
        return ["chatAvatarPortraitBuilderMissing"]
    if "STRETCH_KEEP_ASPECT_COVERED" in avatar_builder:
        failures.append("chatAvatarPortraitStillUsesCovered")
    if "UI_COMPONENT_FACTORY.apply_portrait_frame_texture(portrait)" not in avatar_builder:
        failures.append("chatAvatarPortraitFactoryTextureMissing")
    if "UI_COMPONENT_FACTORY.apply_portrait_frame_stage(frame)" not in avatar_builder:
        failures.append("chatAvatarPortraitFactoryStageMissing")
    return failures


def _validate_chat_multi_ai_fixture_contract(click_result: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if click_result.get("chatMultiAiFixtureApplied") is not True:
        failures.append("chatMultiAiFixtureApplied!=true")
    if click_result.get("chatMultiAiFixtureMode") != "multi_ai_channels_fixture_v1":
        failures.append("chatMultiAiFixtureMode!=multi_ai_channels_fixture_v1")
    if _as_int(click_result.get("chatChannelAiChannelCount"), -1) < 3:
        failures.append("chatChannelAiChannelCount<3")
    channel_ids = click_result.get("chatChannelAiChannelIds", [])
    if not isinstance(channel_ids, list):
        failures.append("chatChannelAiChannelIdsMissing")
        channel_ids = []
    required_ids = {"player_operator_alpha", "player_operator_beta", "player_operator_gamma"}
    missing_ids = sorted(required_ids.difference({str(channel_id) for channel_id in channel_ids}))
    if missing_ids:
        failures.append(f"chatChannelAiChannelIdsMissing:{','.join(missing_ids)}")
    if click_result.get("chatChannelRailMode") != CHAT_COMMAND_CHANNEL_RAIL_MODE:
        failures.append("chatChannelRailMode!=command_chrome_text_channel_drawer_v1")
    if click_result.get("chatChromeUnificationOk") is not True:
        failures.append("chatChromeUnificationOk!=true")
    if click_result.get("chatChannelAccentRailVisible") is not False:
        failures.append("chatChannelAccentRailVisible!=false")
    if _as_float(click_result.get("chatChannelButtonMinHeight"), -1.0) < 58.0:
        failures.append("chatChannelButtonMinHeight<58")
    if click_result.get("chatMultiAiNoTextClipRisk") is not True:
        failures.append("chatMultiAiNoTextClipRisk!=true")
    return failures


def _validate_chat_receipt_detail_click_contract(click_result: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if click_result.get("chatReceiptDetailClickedButton") is not True:
        failures.append("chatReceiptDetailClickedButton!=true")
    if click_result.get("chatReceiptDetailPopupVisible") is not True:
        failures.append("chatReceiptDetailPopupVisible!=true")
    if click_result.get("chatReceiptDetailPopupInsideViewport") is not True:
        failures.append("chatReceiptDetailPopupInsideViewport!=true")
    if click_result.get("chatReceiptDetailSource") != "chat_receipt_message_click_fixture_v1":
        failures.append("chatReceiptDetailSource!=chat_receipt_message_click_fixture_v1")
    if click_result.get("chatReceiptDetailWorldAction") != "occupyTile":
        failures.append("chatReceiptDetailWorldAction!=occupyTile")
    if click_result.get("chatReceiptDetailUsesWorldReceipt") is not True:
        failures.append("chatReceiptDetailUsesWorldReceipt!=true")
    if click_result.get("chatReceiptDetailHasStructuredFields") is not True:
        failures.append("chatReceiptDetailHasStructuredFields!=true")
    if click_result.get("chatReceiptDetailVisualTextStable") is not True:
        failures.append("chatReceiptDetailVisualTextStable!=true")
    detail_text = str(click_result.get("chatReceiptDetailPopupText", ""))
    required_texts = [
        "结果明细",
        "占领目标地块",
        "关羽",
        "Lv.8->9",
        "经验 +20 90->10",
        "消耗",
        "粮草 1",
        "行动点 1",
        "地块 tile_152_159",
    ]
    for needle in required_texts:
        if needle not in detail_text:
            failures.append(f"chatReceiptDetailPopupTextMissing:{needle}")
    if "读取正式提案失败" in detail_text or "proposal not found" in detail_text:
        failures.append("chatReceiptDetailPopupShowsProposalFetchFailure")
    if "upgradeHeroLevel" in detail_text or "hero_level_upgrade" in detail_text or "武将等级升级" in detail_text:
        failures.append("chatReceiptDetailDirectHeroLevelUpgradeVisible")
    return failures


def _as_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _validate_shell_nav_contract(action: str, click_result: dict[str, Any]) -> list[str]:
    if action not in {
        "world_toggle_main_nav_collapse_expand",
        "shell_open_chat_channel_keep_open",
        "shell_open_chat_channel_multi_ai_fixture",
        "shell_open_chat_receipt_detail_popup",
    }:
        return []
    failures: list[str] = []
    if click_result.get("shellNavButtonLayoutMode") != "expanded_large_recruit_right_v1":
        failures.append("shellNavButtonLayoutMode!=expanded_large_recruit_right_v1")
    if click_result.get("shellNavToggleMode") not in {"arrow_hide_expand_v1", "right_arrow_toggle_v1"}:
        failures.append("shellNavToggleMode!=current_arrow_toggle")
    if click_result.get("shellNavRecruitFarRight") is not True:
        failures.append("shellNavRecruitFarRight!=true")
    if _as_float(click_result.get("shellNavRecruitViewportRightGap"), 999999.0) > 48.0:
        failures.append("shellNavRecruitViewportRightGap>48")
    if click_result.get("shellNavVisibleScrollbarsHidden") is not True:
        failures.append("shellNavVisibleScrollbarsHidden!=true")
    if click_result.get("shellCommandChromeToken") != SHELL_COMMAND_CHROME_TOKEN:
        failures.append("shellCommandChromeToken!=shell_command_chrome_v1")
    if click_result.get("shellCommandChromeOk") is not True:
        failures.append("shellCommandChromeOk!=true")
    required_order = [
        "GeneralsButton",
        "SkillLibraryButton",
        "InteriorButton",
        "AllianceButton",
        "AiHubButton",
        "ChatButton",
        "SettingsButton",
        "AiSwitchButton",
        "RecruitButton",
    ]
    actual_order = click_result.get("shellNavVisibleButtonOrder", [])
    if actual_order != required_order:
        failures.append("shellNavVisibleButtonOrder!=required")
    if _as_float(click_result.get("shellNavMinButtonWidth"), -1.0) < 88.0:
        failures.append("shellNavMinButtonWidth<88")
    if _as_float(click_result.get("shellNavMinButtonHeight"), -1.0) < 84.0:
        failures.append("shellNavMinButtonHeight<84")
    if _as_int(click_result.get("shellNavVisibleButtonCount"), -1) < len(required_order):
        failures.append("shellNavVisibleButtonCount<8")
    shell_nav_layout = click_result.get("shellNavLayout", {})
    if not isinstance(shell_nav_layout, dict):
        shell_nav_layout = {}
    battle_report_button = None
    for button in click_result.get("buttons", []) or shell_nav_layout.get("buttons", []):
        if isinstance(button, dict) and button.get("name") == "WarButton":
            battle_report_button = button
            break
    if not isinstance(battle_report_button, dict):
        failures.append("shellBattleReportButtonMissing")
    else:
        if battle_report_button.get("visible") is not True:
            failures.append("shellBattleReportButtonVisible!=true")
        if battle_report_button.get("disabled") is True:
            failures.append("shellBattleReportButtonDisabled!=false")
        if "战报" not in str(battle_report_button.get("text", "")):
            failures.append("shellBattleReportButtonTextMissing")
    overlaps = click_result.get("shellNavOverlaps", [])
    if not isinstance(overlaps, list) or overlaps:
        failures.append("shellNavOverlapsNotEmpty")
    if action == "world_toggle_main_nav_collapse_expand":
        if click_result.get("collapsedOk") is not True:
            failures.append("shellNavCollapsedOk!=true")
        if click_result.get("expandedOk") is not True:
            failures.append("shellNavExpandedOk!=true")
        if "展开" not in str(click_result.get("collapsedText", "")):
            failures.append("shellNavCollapsedTextMissing")
        if "收起" not in str(click_result.get("expandedText", "")):
            failures.append("shellNavExpandedTextMissing")
    return failures


def _validate_main_city_facility_tree_read_model_contract() -> list[str]:
    failures: list[str] = []
    if not MAIN_CITY_FACILITY_TREE_READ_MODEL_CONTRACT_PATH.exists():
        failures.append("mainCityFacilityTreeReadModelContractDocMissing")
    if not MAIN_CITY_FACILITY_TREE_READ_MODEL_PATH.exists():
        return failures + ["mainCityFacilityTreeReadModelJsonMissing"]
    try:
        data = json.loads(MAIN_CITY_FACILITY_TREE_READ_MODEL_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return failures + [f"mainCityFacilityTreeReadModelJsonInvalid:{exc.lineno}"]
    if not isinstance(data, dict):
        return failures + ["mainCityFacilityTreeReadModelRootNotObject"]
    if data.get("schema_version") != "main_city_facility_tree_read_model_v2":
        failures.append("mainCityFacilityTreeReadModelJsonSchemaVersion!=v2")
    if data.get("cost_mode") != "structured_cost_items_v1":
        failures.append("mainCityFacilityTreeReadModelJsonCostMode!=structured_cost_items_v1")
    if data.get("effect_mode") != "structured_effect_items_v1":
        failures.append("mainCityFacilityTreeReadModelJsonEffectMode!=structured_effect_items_v1")
    buildings = data.get("buildings")
    if not isinstance(buildings, list):
        return failures + ["mainCityFacilityTreeReadModelBuildingsNotArray"]
    if len(buildings) < 16:
        failures.append("mainCityFacilityTreeReadModelBuildings<16")
    ids: set[str] = set()
    for index, building in enumerate(buildings):
        if not isinstance(building, dict):
            failures.append(f"mainCityFacilityTreeReadModelBuilding{index}NotObject")
            continue
        building_id = str(building.get("id", "")).strip()
        if not building_id:
            failures.append(f"mainCityFacilityTreeReadModelBuilding{index}IdMissing")
        elif building_id in ids:
            failures.append(f"mainCityFacilityTreeReadModelBuildingDuplicateId:{building_id}")
        ids.add(building_id)
        for legacy_key in ["cost", "effect"]:
            if legacy_key in building:
                failures.append(f"mainCityFacilityTreeReadModelLegacyField:{building_id or index}:{legacy_key}")
        cost_items = building.get("cost_items")
        if not isinstance(cost_items, list) or not cost_items:
            failures.append(f"mainCityFacilityTreeReadModelCostItemsMissing:{building_id or index}")
        else:
            for item_index, item in enumerate(cost_items):
                if not isinstance(item, dict):
                    failures.append(f"mainCityFacilityTreeReadModelCostItemNotObject:{building_id or index}:{item_index}")
                    continue
                resource = str(item.get("resource", "")).strip()
                amount = item.get("amount")
                if not resource:
                    failures.append(f"mainCityFacilityTreeReadModelCostResourceMissing:{building_id or index}:{item_index}")
                if isinstance(amount, bool) or not isinstance(amount, (int, float)):
                    failures.append(f"mainCityFacilityTreeReadModelCostAmountNotNumber:{building_id or index}:{item_index}")
        effect_items = building.get("effect_items")
        if not isinstance(effect_items, list) or not effect_items:
            failures.append(f"mainCityFacilityTreeReadModelEffectItemsMissing:{building_id or index}")
        else:
            for item_index, item in enumerate(effect_items):
                if not isinstance(item, dict):
                    failures.append(f"mainCityFacilityTreeReadModelEffectItemNotObject:{building_id or index}:{item_index}")
                    continue
                for key in ["stat", "before", "after"]:
                    if str(item.get(key, "")).strip() == "":
                        failures.append(f"mainCityFacilityTreeReadModelEffect{key.title()}Missing:{building_id or index}:{item_index}")
    return failures


def _validate_main_city_interior_read_model_contract() -> list[str]:
    failures: list[str] = []
    if not MAIN_CITY_INTERIOR_READ_MODEL_CONTRACT_PATH.exists():
        failures.append("mainCityInteriorReadModelContractDocMissing")
    if not MAIN_CITY_INTERIOR_PANEL_SCRIPT_PATH.exists():
        failures.append("mainCityInteriorPanelScriptMissing")
    else:
        panel_source = MAIN_CITY_INTERIOR_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
        if "_format_work_order_remaining_seconds" in panel_source or "_work_order_remaining_seconds" in panel_source:
            failures.append("mainCityInteriorPanelFormatsWorkOrderCountdownLocally")
    if not MAIN_CITY_INTERIOR_READ_MODEL_PATH.exists():
        return failures + ["mainCityInteriorReadModelJsonMissing"]
    try:
        data = json.loads(MAIN_CITY_INTERIOR_READ_MODEL_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return failures + [f"mainCityInteriorReadModelJsonInvalid:{exc.lineno}"]
    if not isinstance(data, dict):
        return failures + ["mainCityInteriorReadModelRootNotObject"]
    if data.get("schema_version") != "main_city_interior_read_model_v1":
        failures.append("mainCityInteriorReadModelSchemaVersion!=v1")
    if data.get("asset_ref_mode") != "asset_ref_with_fallback_path_v1":
        failures.append("mainCityInteriorReadModelAssetRefMode!=asset_ref_with_fallback_path_v1")
    asset_catalog = data.get("asset_catalog")
    if not isinstance(asset_catalog, list) or len(asset_catalog) < 5:
        failures.append("mainCityInteriorReadModelAssetCatalog<5")
    tax_runtime = data.get("tax_runtime")
    if not isinstance(tax_runtime, dict):
        failures.append("mainCityInteriorReadModelTaxRuntimeMissing")
    else:
        if tax_runtime.get("mode") != "tax_schedule_runtime_v1":
            failures.append("mainCityInteriorReadModelTaxMode!=tax_schedule_runtime_v1")
        if not isinstance(tax_runtime.get("hero_asset_ref"), dict):
            failures.append("mainCityInteriorReadModelHeroAssetRefMissing")
        if not isinstance(tax_runtime.get("primary_action"), dict):
            failures.append("mainCityInteriorReadModelTaxPrimaryActionMissing")
        slots = tax_runtime.get("schedule_slots")
        if not isinstance(slots, list) or len(slots) != 6:
            failures.append("mainCityInteriorReadModelTaxSlotCount!=6")
        else:
            for index, slot in enumerate(slots):
                if not isinstance(slot, dict):
                    failures.append(f"mainCityInteriorReadModelTaxSlot{index}NotObject")
                    continue
                if "asset_path" in slot:
                    failures.append(f"mainCityInteriorReadModelTaxSlotLegacyAssetPath:{slot.get('slot_id', index)}")
                if not isinstance(slot.get("asset_ref"), dict):
                    failures.append(f"mainCityInteriorReadModelTaxSlotAssetRefMissing:{slot.get('slot_id', index)}")
                if isinstance(slot.get("remaining_sec"), bool) or not isinstance(slot.get("remaining_sec"), int):
                    failures.append(f"mainCityInteriorReadModelTaxSlotRemainingSecMissing:{slot.get('slot_id', index)}")
    queues = data.get("construction_queues")
    if not isinstance(queues, dict):
        return failures + ["mainCityInteriorReadModelConstructionQueuesMissing"]
    if queues.get("mode") != "construction_work_orders_v1":
        failures.append("mainCityInteriorReadModelConstructionMode!=construction_work_orders_v1")
    all_orders: list[dict[str, Any]] = []
    for domain in ["city_inner", "world_outer"]:
        items = queues.get(domain)
        if not isinstance(items, list):
            failures.append(f"mainCityInteriorReadModel{domain}NotArray")
            continue
        for index, item in enumerate(items):
            if isinstance(item, dict):
                all_orders.append(item)
            else:
                failures.append(f"mainCityInteriorReadModel{domain}{index}NotObject")
    if len(all_orders) < 4:
        failures.append("mainCityInteriorReadModelWorkOrderCount<4")
    for item in all_orders:
        work_id = str(item.get("queue_item_id", item.get("id", ""))).strip() or "unknown"
        if "asset_path" in item:
            failures.append(f"mainCityInteriorReadModelWorkOrderLegacyAssetPath:{work_id}")
        if not isinstance(item.get("asset_ref"), dict):
            failures.append(f"mainCityInteriorReadModelWorkOrderAssetRefMissing:{work_id}")
        if not isinstance(item.get("primary_action"), dict):
            failures.append(f"mainCityInteriorReadModelWorkOrderPrimaryActionMissing:{work_id}")
        if isinstance(item.get("remaining_sec"), bool) or not isinstance(item.get("remaining_sec"), int):
            failures.append(f"mainCityInteriorReadModelWorkOrderRemainingSecMissing:{work_id}")
        if isinstance(item.get("progress_percent"), bool) or not isinstance(item.get("progress_percent"), int):
            failures.append(f"mainCityInteriorReadModelWorkOrderProgressMissing:{work_id}")
        if not str(item.get("state_group", "")).strip():
            failures.append(f"mainCityInteriorReadModelWorkOrderStateGroupMissing:{work_id}")
        if not str(item.get("state_group_label", "")).strip():
            failures.append(f"mainCityInteriorReadModelWorkOrderStateGroupLabelMissing:{work_id}")
        if not str(item.get("display_state_label", "")).strip():
            failures.append(f"mainCityInteriorReadModelWorkOrderDisplayStateLabelMissing:{work_id}")
    return failures


def _extract_gdscript_function(source: str, name: str) -> str:
    marker = f"func {name}"
    start = source.find(marker)
    if start < 0:
        return ""
    lines = source[start:].splitlines(keepends=True)
    function_lines: list[str] = []
    for index, line in enumerate(lines):
        if index > 0 and (line.startswith("func ") or line.startswith("static func ")):
            break
        function_lines.append(line)
    return "".join(function_lines)


def _validate_ai_panel_presenter_contract() -> list[str]:
    failures: list[str] = []
    if not AI_PANEL_PRESENTER_SCRIPT_PATH.exists():
        return ["aiPanelPresenterScriptMissing"]
    source = AI_PANEL_PRESENTER_SCRIPT_PATH.read_text(encoding="utf-8")
    list_card_reader = _extract_gdscript_function(source, "_read_runtime_list_card")
    if list_card_reader == "":
        failures.append("aiPanelPresenterListCardReaderMissing")
    elif 'runtime.get("listCard", {})' not in list_card_reader:
        failures.append("aiPanelPresenterListCardSourceNotRuntimeListCard")
    autonomy_guard_reader = _extract_gdscript_function(source, "_read_ai_player_autonomy_guard")
    if autonomy_guard_reader == "":
        failures.append("aiPanelPresenterAutonomyGuardReaderMissing")
    else:
        if 'ai_state.get("playerRuntimeAutonomyGuard", {})' not in autonomy_guard_reader:
            failures.append("aiPanelPresenterAutonomyGuardStateSourceMissing")
        if 'runtime.get("autonomyGuard", {})' not in autonomy_guard_reader:
            failures.append("aiPanelPresenterAutonomyGuardRuntimeSourceMissing")
    metadata_reader = _extract_gdscript_function(source, "_read_ai_chat_metadata")
    if metadata_reader == "":
        failures.append("aiPanelPresenterChatMetadataReaderMissing")
    elif 'return _read_dictionary_field(message, "metadata")' not in metadata_reader:
        failures.append("aiPanelPresenterChatMetadataSourceNotMessageMetadata")
    for name in [
        "_format_ai_chat_message_meta",
        "_format_ai_chat_message_description",
        "_resolve_ai_chat_message_tone",
    ]:
        function_source = _extract_gdscript_function(source, name)
        if function_source == "":
            failures.append(f"aiPanelPresenter{name}Missing")
            continue
        if "_read_ai_chat_metadata(message)" not in function_source:
            failures.append(f"aiPanelPresenter{name}DoesNotReadMetadata")
        if 'message.get("body"' in function_source or 'message.get("text"' in function_source:
            failures.append(f"aiPanelPresenter{name}ParsesChatBody")
    action_label_source = _extract_gdscript_function(source, "_format_ai_action_label")
    if action_label_source == "":
        failures.append("aiPanelPresenterActionLabelFormatterMissing")
    else:
        for expected in [
            '"tactical_skill_upgrade"',
            '"hero_star_upgrade"',
            '"building_upgrade"',
        ]:
            if expected not in action_label_source:
                failures.append(f"aiPanelPresenterUpgradeActionLabelMissing:{expected}")
        for blocked in ['"hero_level_upgrade"', '"upgradeHeroLevel"']:
            if blocked in action_label_source:
                failures.append(f"aiPanelPresenterDirectHeroLevelActionRendered:{blocked}")
    if _extract_gdscript_function(source, "_is_ai_direct_hero_level_action") == "":
        failures.append("aiPanelPresenterDirectHeroLevelActionGuardMissing")
    for name in [
        "_build_candidate_action_reading_items",
        "_build_ai_player_management_candidate_cards",
        "_build_ai_player_proposal_cards",
        "_build_ai_player_candidate_action_cards",
        "_build_ai_development_action_cards",
        "_count_ai_development_ready_actions",
        "_count_actionable_ai_proposals",
        "_format_ai_player_next_step_summary",
    ]:
        function_source = _extract_gdscript_function(source, name)
        if function_source == "":
            failures.append(f"aiPanelPresenter{name}Missing")
            continue
        if "_is_ai_direct_hero_level_action(" not in function_source:
            failures.append(f"aiPanelPresenter{name}DoesNotFilterDirectHeroLevelAction")
    target_summary_source = _extract_gdscript_function(source, "_format_ai_action_target_summary")
    if target_summary_source == "":
        failures.append("aiPanelPresenterActionTargetSummaryMissing")
    else:
        if 'payload.get("proposalArgs", payload.get("args", {}))' not in target_summary_source:
            failures.append("aiPanelPresenterProposalArgsNotPrimaryTargetSource")
        for expected in ['"tactical_skill_upgrade"', '"hero_star_upgrade"', '"building_upgrade"']:
            if expected not in target_summary_source:
                failures.append(f"aiPanelPresenterUpgradeProposalArgsTargetMissing:{expected}")
    if _extract_gdscript_function(source, "_format_ai_action_priority_text") == "":
        failures.append("aiPanelPresenterPriorityTextFormatterMissing")
    for name in [
        "_build_candidate_action_reading_items",
        "_build_ai_player_management_candidate_cards",
        "_build_ai_development_action_cards",
    ]:
        function_source = _extract_gdscript_function(source, name)
        if function_source and "_format_ai_action_priority_text(action)" not in function_source:
            failures.append(f"aiPanelPresenter{name}DoesNotDisplayPriorityScoreReason")
    receipt_source = _extract_gdscript_function(source, "_format_receipt_summary")
    if receipt_source == "":
        failures.append("aiPanelPresenterReceiptSummaryMissing")
    else:
        for expected in [
            "worldReceipt",
            "resourcesSpent",
            "readModelRefresh",
            "expGained",
            "previousExp",
            "nextExp",
            "previousLevel",
            "nextLevel",
            "hero",
        ]:
            if expected not in receipt_source:
                failures.append(f"aiPanelPresenterReceiptFieldMissing:{expected}")
    if '"AIReceiptDetailBlock"' not in source:
        failures.append("aiPanelPresenterReceiptDetailBlockMissing")
    receipt_cards_source = _extract_gdscript_function(source, "_build_ai_receipt_detail_cards")
    if receipt_cards_source == "":
        failures.append("aiPanelPresenterReceiptDetailCardsMissing")
    else:
        for expected in ["receipt_items", "latestReceipt", "_build_ai_world_receipt_detail_card"]:
            if expected not in receipt_cards_source:
                failures.append(f"aiPanelPresenterReceiptDetailCardsSourceMissing:{expected}")
    receipt_detail_source = _extract_gdscript_function(source, "_build_ai_world_receipt_detail_card")
    if receipt_detail_source == "":
        failures.append("aiPanelPresenterReceiptDetailCardMissing")
    else:
        level_exp_source = _extract_gdscript_function(source, "_format_receipt_level_exp_detail")
        resource_refresh_source = _extract_gdscript_function(source, "_format_receipt_resource_refresh_detail")
        receipt_detail_contract_source = "\n".join([receipt_detail_source, level_exp_source, resource_refresh_source])
        for expected in [
            "worldReceipt",
            "resourcesSpent",
            "readModelRefresh",
            "expGained",
            "previousExp",
            "nextExp",
            "previousLevel",
            "nextLevel",
            "hero",
        ]:
            if expected not in receipt_detail_contract_source:
                failures.append(f"aiPanelPresenterReceiptDetailCardFieldMissing:{expected}")
        if "_format_receipt_level_exp_detail" not in receipt_detail_source:
            failures.append("aiPanelPresenterReceiptDetailCardLevelExpFormatterMissing")
        if "_format_receipt_resource_refresh_detail" not in receipt_detail_source:
            failures.append("aiPanelPresenterReceiptDetailCardResourceRefreshFormatterMissing")
    return failures


def _validate_main_chat_overlay_receipt_contract() -> list[str]:
    failures: list[str] = []
    if not MAIN_CHAT_OVERLAY_SCRIPT_PATH.exists():
        return ["mainChatOverlayScriptMissing"]
    source = MAIN_CHAT_OVERLAY_SCRIPT_PATH.read_text(encoding="utf-8")
    show_receipt_source = _extract_gdscript_function(source, "_show_receipt_detail")
    merge_source = _extract_gdscript_function(source, "_merge_receipt_context")
    receipt_detail_source = _extract_gdscript_function(source, "_format_receipt_readable_detail")
    world_receipt_detail_source = _extract_gdscript_function(source, "_format_world_receipt_readable_detail")
    normalize_source = _extract_gdscript_function(source, "_normalize_backend_message")
    if show_receipt_source == "":
        failures.append("mainChatOverlayShowReceiptDetailMissing")
    elif "_format_world_receipt_readable_detail" not in show_receipt_source:
        failures.append("mainChatOverlayShowReceiptDetailDoesNotUseWorldReceiptFormatter")
    if merge_source == "":
        failures.append("mainChatOverlayMergeReceiptContextMissing")
    elif "worldReceipt" not in merge_source and "world_receipt" not in merge_source and 'proposal.get("receipt"' not in merge_source:
        failures.append("mainChatOverlayMergeReceiptContextWorldReceiptMissing")
    if receipt_detail_source == "":
        failures.append("mainChatOverlayReceiptReadableDetailMissing")
    if world_receipt_detail_source == "":
        failures.append("mainChatOverlayWorldReceiptReadableDetailMissing")
    else:
        receipt_contract_source = "\n".join([
            show_receipt_source,
            merge_source,
            receipt_detail_source,
            world_receipt_detail_source,
            _extract_gdscript_function(source, "_extract_world_receipt_payload"),
            _extract_gdscript_function(source, "_format_world_receipt_level_exp_detail"),
            _extract_gdscript_function(source, "_format_world_receipt_resource_refresh_detail"),
        ])
        for expected in [
            "worldReceipt",
            "resourcesSpent",
            "readModelRefresh",
            "expGained",
            "previousExp",
            "nextExp",
            "previousLevel",
            "nextLevel",
            "hero",
        ]:
            if expected not in receipt_contract_source:
                failures.append(f"mainChatOverlayWorldReceiptFieldMissing:{expected}")
    if normalize_source == "":
        failures.append("mainChatOverlayNormalizeBackendMessageMissing")
    elif "worldReceipt" not in normalize_source and "receipt" not in normalize_source:
        failures.append("mainChatOverlayNormalizeBackendMessageReceiptPayloadMissing")
    if "后端可直接执行" in source or "不需要人工批准" in source or "无需人工批准" in source:
        failures.append("mainChatOverlayApprovalGuidanceHasDirectExecuteCopy")
    return failures


def _validate_ai_panel_status_pill_contract() -> list[str]:
    failures: list[str] = []
    if not AI_PANEL_PRESENTER_SCRIPT_PATH.exists():
        return ["aiPanelPresenterScriptMissing"]
    presenter_source = AI_PANEL_PRESENTER_SCRIPT_PATH.read_text(encoding="utf-8")
    status_hero_source = _extract_gdscript_function(presenter_source, "_build_ai_player_model_status_hero")
    if status_hero_source == "":
        failures.append("aiPanelModelStatusHeroMissing")
    else:
        if '"fact_mode": "status_pills_v1"' not in status_hero_source:
            failures.append("aiPanelModelStatusHeroFactMode!=status_pills_v1")
        for blocked in ['"能聊"', '"顺畅"', '"参谋"', '"label": "连接"', '"label": "拍板"', '"label": "后手"', '"label": "备用"']:
            if blocked in status_hero_source:
                failures.append(f"aiPanelModelStatusHeroOldFactCopy:{blocked}")
        for expected in ['"label": "问话"', '"label": "接通"', '"label": "主意"', '"label": "出手"', '"label": "保底"']:
            if expected not in status_hero_source:
                failures.append(f"aiPanelModelStatusHeroConsumerFactCopyMissing:{expected}")
    if not SNAPSHOT_SECTION_PAGE_SCRIPT_PATH.exists():
        failures.append("snapshotSectionPageScriptMissing")
    else:
        section_source = SNAPSHOT_SECTION_PAGE_SCRIPT_PATH.read_text(encoding="utf-8")
        status_block_source = _extract_gdscript_function(section_source, "_build_status_hero_block")
        if status_block_source == "":
            failures.append("snapshotSectionStatusHeroBlockMissing")
        else:
            if 'fact_mode == "status_pills_v1"' not in status_block_source:
                failures.append("snapshotSectionStatusHeroPillModeMissing")
            if "_build_status_pill" not in status_block_source:
                failures.append("snapshotSectionStatusHeroPillBuilderNotUsed")
        if _extract_gdscript_function(section_source, "_build_status_pill") == "":
            failures.append("snapshotSectionStatusPillBuilderMissing")
    return failures


def _validate_ai_panel_first_screen_compact_contract() -> list[str]:
    failures: list[str] = []
    if not AI_PANEL_PRESENTER_SCRIPT_PATH.exists():
        return ["aiPanelPresenterScriptMissing"]
    presenter_source = AI_PANEL_PRESENTER_SCRIPT_PATH.read_text(encoding="utf-8")
    priority_source = _extract_gdscript_function(presenter_source, "_build_action_management_priority_items")
    if '"AIPlayerPriorityReadingBlock", {"layout": "ai_first_screen_compact_v1"}' not in presenter_source:
        failures.append("aiPanelPriorityReadingBlockCompactLayoutMissing")
    if '"AIPlayerRuntimeActionBlock", {"layout": "ai_first_screen_compact_v1"}' not in presenter_source:
        failures.append("aiPanelRuntimeActionBlockCompactLayoutMissing")
    if '"hide_detail_title": true' not in presenter_source:
        failures.append("aiPanelFirstScreenDetailTitleNotHidden")
    if '_build_status_hero_block("在岗", _build_ai_player_model_status_hero' in presenter_source:
        failures.append("aiPanelFirstScreenDuplicateStatusHeroTitleStillPresent")
    if '"subtitle": "卡点、建议、拍板都放在这里。"' in presenter_source:
        failures.append("aiPanelFirstScreenExplainerSubtitleStillPresent")
    if '_build_reading_list_block("先看", _build_action_management_priority_items(ai_next_step_summary, ai_failure_player_summary, ai_player_battle_report_items, ai_player_proposal_items, ai_player_runtime_error), "AIPlayerPriorityReadingBlock"' in presenter_source:
        failures.append("aiPanelFirstScreenDuplicateReadingTitleStillPresent")
    for expected in [
        '{"id": "ai_players_refresh", "label": "刷新", "min_width": 156, "min_height": 56}',
        '{"id": "ai_player_pending_proposals_review", "label": "去处理", "disabled": ai_actionable_proposal_count <= 0, "min_width": 196, "min_height": 56}',
    ]:
        if expected not in presenter_source:
            failures.append("aiPanelFirstScreenActionButtonCompactHeightMissing")
    if "ai_player_model_proposal_create" in presenter_source or '"label": "问AI玩家"' in presenter_source:
        failures.append("aiPanelFirstScreenStillUsesDirectChatAction")
    if priority_source == "":
        failures.append("aiPanelFirstScreenPriorityItemsMissing")
    else:
        if 'if proposal_count > 0:' in priority_source:
            failures.append("aiPanelFirstScreenPendingItemConditionallyHidden")
        if 'if not battle_report_items.is_empty():' in priority_source:
            failures.append("aiPanelFirstScreenBattleItemConditionallyHidden")
        for expected in ['"title": "现在可做"', '"title": "需处理"', '"title": "待确认"', '"title": "军情"']:
            if expected not in priority_source:
                failures.append(f"aiPanelFirstScreenPriorityItemMissing:{expected}")
    if not SNAPSHOT_SECTION_PAGE_SCRIPT_PATH.exists():
        failures.append("snapshotSectionPageScriptMissing")
    else:
        section_source = SNAPSHOT_SECTION_PAGE_SCRIPT_PATH.read_text(encoding="utf-8")
        if 'ai_first_screen_compact_v1' not in section_source:
            failures.append("snapshotSectionCompactLayoutSupportMissing")
        if "_build_reading_list_item(item_variant as Dictionary, compact_action_layout)" not in section_source:
            failures.append("snapshotSectionCompactReadingListNotUsed")
        if '12 if compact_action_layout else 20 if _is_player_reading_mode() else 12' not in section_source:
            failures.append("snapshotSectionCompactBlockMarginMissing")
    return failures


def _validate_ai_panel_profile_manager_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if page_summary.get("aiPanelRole") != "ai_player_profile_manager_v1":
        failures.append("aiPanelRole!=ai_player_profile_manager_v1")
    if page_summary.get("aiPanelPrimaryConcept") != "AI玩家":
        failures.append("aiPanelPrimaryConcept!=AI玩家")
    if page_summary.get("aiPanelDefaultPageId") != "advisor":
        failures.append("aiPanelDefaultPageId!=advisor")
    if _as_int(page_summary.get("aiPanelForbiddenAssistantCopyCount"), -1) != 0:
        failures.append("aiPanelForbiddenAssistantCopyCount!=0")
    if page_summary.get("aiPanelArchiveEntryVisible") is not True:
        failures.append("aiPanelArchiveEntryVisible!=true")
    if page_summary.get("aiPanelMemoryEntryVisible") is not True:
        failures.append("aiPanelMemoryEntryVisible!=true")
    if page_summary.get("aiPanelAutonomyEntryVisible") is not True:
        failures.append("aiPanelAutonomyEntryVisible!=true")
    if page_summary.get("aiPanelChatEntryRelocatedToChannel") is not True:
        failures.append("aiPanelChatEntryRelocatedToChannel!=true")
    if page_summary.get("aiPanelChatEntryIsSecondary") is not True:
        failures.append("aiPanelChatEntryIsSecondary!=true")
    if page_summary.get("aiPanelUsesListCardAutonomyGuard") is not True:
        failures.append("aiPanelUsesListCardAutonomyGuard!=true")
    if page_summary.get("aiPanelDirectSuggestedActionExecution") is not False:
        failures.append("aiPanelDirectSuggestedActionExecution!=false")
    labels = page_summary.get("aiPanelSidebarLabels", [])
    if not isinstance(labels, list):
        failures.append("aiPanelSidebarLabelsMissing")
        labels = []
    for expected in ["AI玩家", "档案", "记忆", "托管"]:
        if expected not in labels:
            failures.append(f"aiPanelSidebarLabelMissing:{expected}")
    for forbidden in ["助手", "AI助手", "在线"]:
        if forbidden in labels:
            failures.append(f"aiPanelSidebarLabelForbidden:{forbidden}")
    if not AI_PANEL_PRESENTER_SCRIPT_PATH.exists():
        failures.append("aiPanelPresenterScriptMissing")
    else:
        presenter_source = AI_PANEL_PRESENTER_SCRIPT_PATH.read_text(encoding="utf-8")
        sidebar_source = _extract_gdscript_function(presenter_source, "_build_ai_panel_sidebar_items")
        if '"default_page_id": "advisor"' not in presenter_source:
            failures.append("aiPanelPresenterDefaultPageNotAdvisor")
        for expected in ['"label": "AI玩家"', '"label": "档案"', '"label": "记忆"', '"label": "托管"']:
            if expected not in sidebar_source:
                failures.append(f"aiPanelPresenterSidebarMissing:{expected}")
        if '"label": "在线"' in sidebar_source:
            failures.append("aiPanelPresenterSidebarStillShowsOnline")
        players_section = presenter_source[
            presenter_source.find('"players": {') : presenter_source.find('"advisor": {')
        ]
        if "ai_player_open_chat_channel" in players_section or "ai_player_model_proposal_create" in players_section:
            failures.append("aiPanelPlayersPageStillUsesChatAsPrimaryAction")
    return failures


def _validate_snapshot_section_touch_scroll_contract() -> list[str]:
    failures: list[str] = []
    if not SNAPSHOT_SECTION_PAGE_SCRIPT_PATH.exists():
        return ["snapshotSectionPageScriptMissing"]
    source = SNAPSHOT_SECTION_PAGE_SCRIPT_PATH.read_text(encoding="utf-8")
    desktop_scroll = _extract_gdscript_function(source, "_ensure_desktop_content_scroll")
    if desktop_scroll == "":
        failures.append("snapshotSectionDesktopScrollBuilderMissing")
    else:
        if '_desktop_content_scroll.name = "DesktopContentScroll"' not in desktop_scroll:
            failures.append("snapshotSectionDesktopScrollNameMissing")
        if "_desktop_content_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER" not in desktop_scroll:
            failures.append("snapshotSectionDesktopHorizontalScrollNotHidden")
        if "_desktop_content_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER" not in desktop_scroll:
            failures.append("snapshotSectionDesktopVerticalScrollNotHidden")
        if "_apply_touch_scroll_chrome(_desktop_content_scroll)" not in desktop_scroll:
            failures.append("snapshotSectionDesktopTouchChromeMissing")
    mobile_scroll = _extract_gdscript_function(source, "_ensure_mobile_body")
    if mobile_scroll == "":
        failures.append("snapshotSectionMobileBodyBuilderMissing")
    else:
        if '_mobile_body_scroll.name = "MobileBodyScroll"' not in mobile_scroll:
            failures.append("snapshotSectionMobileScrollNameMissing")
        if "_mobile_body_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER" not in mobile_scroll:
            failures.append("snapshotSectionMobileHorizontalScrollNotHidden")
        if "_mobile_body_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER" not in mobile_scroll:
            failures.append("snapshotSectionMobileVerticalScrollNotHidden")
        if "_apply_touch_scroll_chrome(_mobile_body_scroll)" not in mobile_scroll:
            failures.append("snapshotSectionMobileTouchChromeMissing")
    return failures


def _validate_snapshot_edge_motion_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    try:
        factory_source = SLG_UI_COMPONENT_FACTORY_SCRIPT_PATH.read_text(encoding="utf-8")
        snapshot_panel_source = SNAPSHOT_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
        world_event_source = WORLD_EVENT_ACTIVITY_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"snapshotEdgeMotionSourceReadFailed:{exc}"]
    if page_summary.get("snapshotEdgeMotionSystemToken") != MAINLINE_UI_MOTION_SYSTEM_TOKEN:
        failures.append(f"snapshotEdgeMotionSystemToken!={MAINLINE_UI_MOTION_SYSTEM_TOKEN}")
    if page_summary.get("snapshotEdgeMotionScope") != "ui_layer_only":
        failures.append("snapshotEdgeMotionScope!=ui_layer_only")
    if page_summary.get("snapshotEdgeMotionPageEnterToken") != SNAPSHOT_EDGE_PAGE_ENTER_TOKEN:
        failures.append(f"snapshotEdgeMotionPageEnterToken!={SNAPSHOT_EDGE_PAGE_ENTER_TOKEN}")
    if page_summary.get("snapshotEdgeMotionCardStaggerToken") != "card_stagger_enter_v1":
        failures.append("snapshotEdgeMotionCardStaggerToken!=card_stagger_enter_v1")
    if page_summary.get("snapshotEdgeMotionMethod") != "snapshot_page_fade_lift_stagger_v1":
        failures.append("snapshotEdgeMotionMethod!=snapshot_page_fade_lift_stagger_v1")
    if page_summary.get("snapshotEdgeMotionFutureImpact") != "ui_visual_only_no_snapshot_read_model_backend_map_voice_change":
        failures.append("snapshotEdgeMotionFutureImpact!=ui_visual_only_no_snapshot_read_model_backend_map_voice_change")
    if _as_int(page_summary.get("snapshotEdgeMotionEnterDurationMs")) < 380:
        failures.append("snapshotEdgeMotionEnterDurationMs<380")
    if abs(_as_float(page_summary.get("snapshotEdgeMotionLiftY"))) < 30.0:
        failures.append("snapshotEdgeMotionLiftYAbs<30")
    if f'const MOTION_SNAPSHOT_EDGE_PAGE_ENTER_TOKEN := "{SNAPSHOT_EDGE_PAGE_ENTER_TOKEN}"' not in factory_source:
        failures.append("snapshotEdgeMotionFactoryTokenMissing")
    if "apply_motion_snapshot_edge_page_enter(_section_page, 0)" not in snapshot_panel_source:
        failures.append("snapshotEdgeMotionNotAppliedToSnapshotSectionPage")
    if "apply_snapshot_edge_motion_summary(summary)" not in world_event_source:
        failures.append("worldEventSnapshotEdgeMotionSummaryMissing")
    return failures


def _validate_alliance_snapshot_touch_motion_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    try:
        alliance_source = ALLIANCE_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"allianceSnapshotSourceReadFailed:{exc}"]
    failures.extend(_validate_snapshot_edge_motion_contract(page_summary))
    failures.extend(
        _validate_design_system_contract(
            page_summary,
            "alliance_shell",
            require_production_baseline=False,
        )
    )
    failures.extend(_validate_module_token_contract(page_summary, "alliance"))
    if page_summary.get("allianceTouchScrollInputMode") != "touch_mouse_drag_v1":
        failures.append("allianceTouchScrollInputMode!=touch_mouse_drag_v1")
    if page_summary.get("allianceTouchScrollbarVisibility") != "hidden":
        failures.append("allianceTouchScrollbarVisibility!=hidden")
    if page_summary.get("allianceRootScrollMode") != "hidden_scrollbar_touch_scroll":
        failures.append("allianceRootScrollMode!=hidden_scrollbar_touch_scroll")
    if bool(page_summary.get("allianceMailTabPresent", True)):
        failures.append("allianceMailTabPresent!=false")
    if page_summary.get("allianceStandaloneMailBoundary") != "mail_panel_v1_independent_mainline_overlay":
        failures.append("allianceStandaloneMailBoundary!=mail_panel_v1_independent_mainline_overlay")
    if "mail" in str(page_summary.get("allianceTopTabIds", "")).split("/"):
        failures.append("allianceTopTabIds_contains_mail")
    if bool(page_summary.get("allianceTouchDragHandlerBound", False)) is not True:
        failures.append("allianceTouchDragHandlerBound!=true")
    if "UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(root)" not in alliance_source:
        failures.append("allianceRootTouchScrollFactoryMissing")
    if "UI_COMPONENT_FACTORY.apply_motion_snapshot_edge_page_enter(self, 0)" not in alliance_source:
        failures.append("alliancePanelEnterMotionMissing")
    if "UI_COMPONENT_FACTORY.apply_motion_snapshot_edge_page_enter(section_view, 1)" not in alliance_source:
        failures.append("allianceSectionEnterMotionMissing")
    if "UI_COMPONENT_FACTORY.apply_snapshot_edge_motion_summary(summary)" not in alliance_source:
        failures.append("allianceSnapshotEdgeMotionSummaryMissing")
    if page_summary.get("organizationPanelContract") != "organization_panel_v1":
        failures.append("organizationPanelContract!=organization_panel_v1")
    if page_summary.get("organizationRouteMode") != "alliance_to_nation_lifecycle_route_v1":
        failures.append("organizationRouteMode!=alliance_to_nation_lifecycle_route_v1")
    if page_summary.get("organizationEntryLabelMode") != "dynamic_alliance_or_nation_v1":
        failures.append("organizationEntryLabelMode!=dynamic_alliance_or_nation_v1")
    if page_summary.get("organizationHomeVisualMode") != "full_bleed_hall_art_overlay_entry_stage_v6":
        failures.append("organizationHomeVisualMode!=full_bleed_hall_art_overlay_entry_stage_v6")
    if page_summary.get("organizationHomeEntryGroupMode") != "centered_two_row_command_array_with_sovereign_group_v1":
        failures.append("organizationHomeEntryGroupMode!=centered_two_row_command_array_with_sovereign_group_v1")
    if page_summary.get("organizationHomeTopNavMode") != "hidden_host_tabs_art_entry_navigation_v1":
        failures.append("organizationHomeTopNavMode!=hidden_host_tabs_art_entry_navigation_v1")
    if page_summary.get("organizationHomePrimaryFocusMode") != "single_hall_art_stage_v1":
        failures.append("organizationHomePrimaryFocusMode!=single_hall_art_stage_v1")
    if page_summary.get("organizationHomeStatusMode") != "transparent_faction_status_city_bonus_v2":
        failures.append("organizationHomeStatusMode!=transparent_faction_status_city_bonus_v2")
    if page_summary.get("organizationHomeHeroStageMode") != "full_bleed_hall_art_real_ui_controls_v2":
        failures.append("organizationHomeHeroStageMode!=full_bleed_hall_art_real_ui_controls_v2")
    if page_summary.get("organizationHomeArtLayerMode") != "asset_drop_hall_art_layer_v1":
        failures.append("organizationHomeArtLayerMode!=asset_drop_hall_art_layer_v1")
    if page_summary.get("organizationHomeArtFitMode") != "proportional_contain_full_image_no_crop_v1":
        failures.append("organizationHomeArtFitMode!=proportional_contain_full_image_no_crop_v1")
    if page_summary.get("organizationHomeRealUiControlMode") != "transparent_game_control_overlay_v2":
        failures.append("organizationHomeRealUiControlMode!=transparent_game_control_overlay_v2")
    if bool(page_summary.get("organizationHomeArtTexturePresent", False)) is not True:
        failures.append("organizationHomeArtTexturePresent!=true")
    if bool(page_summary.get("organizationHomeUsesFullPagePng", True)) is not False:
        failures.append("organizationHomeUsesFullPagePng!=false")
    if bool(page_summary.get("organizationHomeRealControlOverlay", False)) is not True:
        failures.append("organizationHomeRealControlOverlay!=true")
    art_path = str(page_summary.get("organizationHomeArtAssetPath", ""))
    if "organization_lifecycle_visual_asset_drop/" not in art_path:
        failures.append("organizationHomeArtAssetPathNotGeneratedDrop")
    if page_summary.get("organizationHomeNoticeFeedMode") != "minimal_transparent_notice_badge_v3":
        failures.append("organizationHomeNoticeFeedMode!=minimal_transparent_notice_badge_v3")
    if _as_int(page_summary.get("organizationHomeStatusStatCount"), 0) < 7:
        failures.append("organizationHomeStatusStatCount<7")
    if bool(page_summary.get("organizationHomeHeroNodePresent", False)) is not True:
        failures.append("organizationHomeHeroNodePresent!=true")
    if bool(page_summary.get("organizationHomeNoticeNodePresent", False)) is not True:
        failures.append("organizationHomeNoticeNodePresent!=true")
    if page_summary.get("organizationMailBoundary") != "mail_panel_v1_independent_inbox_only":
        failures.append("organizationMailBoundary!=mail_panel_v1_independent_inbox_only")
    if page_summary.get("allianceFoundNationEntryMode") != "eligible_requirements_cta_v1":
        failures.append("allianceFoundNationEntryMode!=eligible_requirements_cta_v1")
    if page_summary.get("nationPolicyTreeMode") != "season_permanent_bonus_policy_tree_v1":
        failures.append("nationPolicyTreeMode!=season_permanent_bonus_policy_tree_v1")
    if page_summary.get("nationMarketVisibilityMode") != "nation_only_market_v1":
        failures.append("nationMarketVisibilityMode!=nation_only_market_v1")
    if page_summary.get("organizationTouchInputMode") != "touch_mouse_drag_v1":
        failures.append("organizationTouchInputMode!=touch_mouse_drag_v1")
    if page_summary.get("organizationMotionToken") != SNAPSHOT_EDGE_PAGE_ENTER_TOKEN:
        failures.append(f"organizationMotionToken!={SNAPSHOT_EDGE_PAGE_ENTER_TOKEN}")
    if "ORGANIZATION_PANEL_CONTRACT := \"organization_panel_v1\"" not in alliance_source:
        failures.append("organizationPanelContractSourceMissing")
    if "ORGANIZATION_HOME_VISUAL_MODE := \"full_bleed_hall_art_overlay_entry_stage_v6\"" not in alliance_source:
        failures.append("organizationHomeVisualModeSourceMissing")
    if "ORGANIZATION_HOME_ENTRY_GROUP_MODE := \"centered_two_row_command_array_with_sovereign_group_v1\"" not in alliance_source:
        failures.append("organizationHomeEntryGroupModeSourceMissing")
    if "ORGANIZATION_HOME_TOP_NAV_MODE := \"hidden_host_tabs_art_entry_navigation_v1\"" not in alliance_source:
        failures.append("organizationHomeTopNavModeSourceMissing")
    if "_host.set_tab_settings([])" not in alliance_source:
        failures.append("organizationHomeTopTabsHiddenSourceMissing")
    if "ORGANIZATION_HOME_ALLIANCE_ART_ASSET_PATH" not in alliance_source:
        failures.append("organizationHomeAllianceArtSourceMissing")
    if "ORGANIZATION_HOME_NATION_ART_ASSET_PATH" not in alliance_source:
        failures.append("organizationHomeNationArtSourceMissing")
    if "TextureRect.STRETCH_KEEP_ASPECT" not in _extract_gdscript_function(alliance_source, "_build_home_hall_visual_board"):
        failures.append("organizationHomeArtProportionalContainMissing")
    return failures


def _validate_organization_lifecycle_fixture_source_contract() -> list[str]:
    failures: list[str] = []
    try:
        fixture = json.loads(ORGANIZATION_LIFECYCLE_FIXTURE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"organizationLifecycleFixtureUnreadable:{exc}"]
    fixtures = fixture.get("fixtures", {})
    if not isinstance(fixtures, dict):
        return ["organizationLifecycleFixturesMissing"]
    required = {
        "ordinary_alliance": ("alliance", "alliance"),
        "eligible_alliance": ("alliance", "eligible_to_found_nation"),
        "founded_nation": ("nation", "nation"),
    }
    for fixture_id, (expected_kind, expected_stage) in required.items():
        entry = fixtures.get(fixture_id, {})
        snapshot = entry.get("snapshot", {}) if isinstance(entry, dict) else {}
        if not isinstance(snapshot, dict):
            failures.append(f"organizationLifecycleFixtureSnapshotMissing:{fixture_id}")
            continue
        if snapshot.get("organization_kind") != expected_kind:
            failures.append(f"organizationLifecycleFixtureKind[{fixture_id}]!={expected_kind}")
        if snapshot.get("organization_lifecycle_stage") != expected_stage:
            failures.append(f"organizationLifecycleFixtureStage[{fixture_id}]!={expected_stage}")
        if not str(snapshot.get("alliance_name", "")).strip():
            failures.append(f"organizationLifecycleFixtureNameMissing:{fixture_id}")
    eligible_sections = (
        fixtures.get("eligible_alliance", {})
        .get("snapshot", {})
        .get("section_payloads", {})
    )
    if not isinstance(eligible_sections, dict):
        eligible_sections = {}
    eligible_diplomacy_blocks = (
        eligible_sections.get("diplomacy", {})
        .get("relations", {})
        .get("content_blocks", [])
    )
    if "OrganizationDiplomacyRelationBoardBlock" not in json.dumps(eligible_diplomacy_blocks, ensure_ascii=False):
        failures.append("organizationLifecycleFixtureDiplomacyRelationBoardMissing")
    eligible_log_blocks = (
        eligible_sections.get("battle_reports", {})
        .get("log", {})
        .get("content_blocks", [])
    )
    if "OrganizationLogFilterTimelineBlock" not in json.dumps(eligible_log_blocks, ensure_ascii=False):
        failures.append("organizationLifecycleFixtureLogTimelineMissing")
    eligible_report_blocks = (
        eligible_sections.get("battle_reports", {})
        .get("latest", {})
        .get("content_blocks", [])
    )
    eligible_report_json = json.dumps(eligible_report_blocks, ensure_ascii=False)
    if "battle_report_core_data_filter_no_visible_extra_strip_v1" not in eligible_report_json:
        failures.append("organizationLifecycleFixtureBattleReportCoreFilterModeMissing")
    if "organization_battle_report_filter_strip_v1" in eligible_report_json:
        failures.append("organizationLifecycleFixtureBattleReportVisibleFilterStillPresent")
    nation_sections = (
        fixtures.get("founded_nation", {})
        .get("snapshot", {})
        .get("section_payloads", {})
        .get("nation", {})
    )
    if not isinstance(nation_sections, dict):
        nation_sections = {}
    if "nation_policy_read_model_tree_canvas_v1" not in json.dumps(nation_sections.get("policy", {}), ensure_ascii=False):
        failures.append("organizationLifecycleFixturePolicyReadModelMissing")
    if "OrganizationMarketSupplyCardGridBlock" not in json.dumps(nation_sections.get("market", {}), ensure_ascii=False):
        failures.append("organizationLifecycleFixtureMarketSupplyMissing")
    if "OrganizationNationBuildingReadModelBlock" not in json.dumps(nation_sections.get("buildings", {}), ensure_ascii=False):
        failures.append("organizationLifecycleFixtureNationBuildingMissing")
    return failures


def _validate_organization_lifecycle_contract(action: str, page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    expected_fixture_by_action = {
        "world_open_main_city_organization_alliance_fixture_close": "ordinary_alliance",
        "world_open_main_city_organization_eligible_fixture_close": "eligible_alliance",
        "world_open_main_city_organization_alliance_home": "eligible_alliance",
        "world_open_main_city_organization_home_entry_members": "eligible_alliance",
        "world_open_main_city_organization_home_entry_corps": "eligible_alliance",
        "world_open_main_city_organization_nation_fixture_close": "founded_nation",
        "world_open_main_city_organization_members": "eligible_alliance",
        "world_open_main_city_organization_corps": "eligible_alliance",
        "world_open_main_city_organization_officers": "eligible_alliance",
        "world_open_main_city_organization_policy": "founded_nation",
        "world_open_main_city_organization_diplomacy": "eligible_alliance",
        "world_open_main_city_organization_market": "founded_nation",
        "world_open_main_city_organization_buildings": "founded_nation",
        "world_open_main_city_organization_logs": "eligible_alliance",
        "world_open_main_city_organization_reports": "eligible_alliance",
        "world_open_main_city_organization_report_detail": "eligible_alliance",
        "world_open_main_city_organization_nation_reports": "founded_nation",
        "world_open_main_city_organization_nation_report_detail": "founded_nation",
        "world_open_main_city_organization_reports_back": "eligible_alliance",
        "world_open_main_city_organization_report_detail_back": "eligible_alliance",
    }
    expected_stage_by_fixture = {
        "ordinary_alliance": ("alliance", "alliance"),
        "eligible_alliance": ("alliance", "eligible_to_found_nation"),
        "founded_nation": ("nation", "nation"),
    }
    expected_page_by_action = {
        "world_open_main_city_organization_alliance_fixture_close": "overview/home",
        "world_open_main_city_organization_eligible_fixture_close": "overview/home",
        "world_open_main_city_organization_alliance_home": "overview/home",
        "world_open_main_city_organization_home_entry_members": "members/overview",
        "world_open_main_city_organization_home_entry_corps": "members/groups",
        "world_open_main_city_organization_nation_fixture_close": "overview/home",
        "world_open_main_city_organization_members": "members/overview",
        "world_open_main_city_organization_corps": "members/groups",
        "world_open_main_city_organization_officers": "governance/officers",
        "world_open_main_city_organization_policy": "nation/policy",
        "world_open_main_city_organization_diplomacy": "diplomacy/relations",
        "world_open_main_city_organization_market": "nation/market",
        "world_open_main_city_organization_buildings": "nation/buildings",
        "world_open_main_city_organization_logs": "battle_reports/log",
        "world_open_main_city_organization_reports": "battle_reports/latest",
        "world_open_main_city_organization_report_detail": "battle_reports/detail",
        "world_open_main_city_organization_nation_reports": "battle_reports/latest",
        "world_open_main_city_organization_nation_report_detail": "battle_reports/detail",
        "world_open_main_city_organization_reports_back": "overview/home",
        "world_open_main_city_organization_report_detail_back": "battle_reports/latest",
    }
    expected_fixture = expected_fixture_by_action.get(action, "")
    if page_summary.get("organizationLifecycleFixtureMode") != "organization_lifecycle_ui_fixture_v1":
        failures.append("organizationLifecycleFixtureMode!=organization_lifecycle_ui_fixture_v1")
    if page_summary.get("organizationLifecycleFixtureApplied") is not True:
        failures.append("organizationLifecycleFixtureApplied!=true")
    if page_summary.get("organizationLifecycleFixtureId") != expected_fixture:
        failures.append(f"organizationLifecycleFixtureId!={expected_fixture}")
    if page_summary.get("organizationLifecycleFixtureSource") != "res://data/ui/organization_lifecycle_preview_read_model.json":
        failures.append("organizationLifecycleFixtureSource!=organization_lifecycle_preview_read_model.json")
    expected_kind, expected_stage = expected_stage_by_fixture.get(expected_fixture, ("", ""))
    if page_summary.get("organizationKind") != expected_kind:
        failures.append(f"organizationKind!={expected_kind}")
    if page_summary.get("organizationLifecycleStage") != expected_stage:
        failures.append(f"organizationLifecycleStage!={expected_stage}")
    expected_page = expected_page_by_action.get(action, "")
    if page_summary.get("activePageId") != expected_page:
        failures.append(f"organizationActivePageId!={expected_page}")
    if page_summary.get("organizationSecondaryVisualMode") != "organization_secondary_game_card_stack_v1":
        failures.append("organizationSecondaryVisualMode!=organization_secondary_game_card_stack_v1")
    if page_summary.get("organizationSecondaryCardStyleMode") != "seal_icon_layered_card_rows_v1":
        failures.append("organizationSecondaryCardStyleMode!=seal_icon_layered_card_rows_v1")
    if page_summary.get("organizationSecondarySummaryMode") != "seal_compact_summary_bar_v1":
        failures.append("organizationSecondarySummaryMode!=seal_compact_summary_bar_v1")
    is_secondary_action = expected_page != "overview/home"
    if expected_page == "overview/home":
        if page_summary.get("organizationHomeEntryButtonToken") != ORGANIZATION_HOME_ENTRY_BUTTON_TOKEN:
            failures.append("organizationHomeEntryButtonToken!=organization_home_entry_button_v1")
        if page_summary.get("organizationHomeEntryLiveTextContract") != ORGANIZATION_HOME_ENTRY_LIVE_TEXT_CONTRACT:
            failures.append("organizationHomeEntryLiveTextContract!=organization_home_entry_live_text_v1")
        if _as_int(page_summary.get("organizationHomeEntryButtonCount")) < 7:
            failures.append("organizationHomeEntryButtonCount<7")
        home_entry_labels = str(page_summary.get("organizationHomeEntryButtonLabels", ""))
        for label in ["成员", "军团", "官员", "外交", "战报", "日志"]:
            if label not in home_entry_labels:
                failures.append(f"organizationHomeEntryButtonLabelMissing:{label}")
        if expected_fixture == "eligible_alliance" and "立国" not in home_entry_labels:
            failures.append("organizationHomeEntryButtonLabelMissing:立国")
        home_entry_targets = str(page_summary.get("organizationHomeEntryTargetPageIds", ""))
        for target_page_id in [
            "members/overview",
            "members/groups",
            "governance/officers",
            "diplomacy/relations",
            "battle_reports/latest",
            "battle_reports/log",
        ]:
            if target_page_id not in home_entry_targets:
                failures.append(f"organizationHomeEntryTargetPageMissing:{target_page_id}")
        if expected_fixture == "eligible_alliance" and "governance/founding" not in home_entry_targets:
            failures.append("organizationHomeEntryTargetPageMissing:governance/founding")
    home_entry_click_expectations = {
        "world_open_main_city_organization_home_entry_members": ("members/overview", "成员"),
        "world_open_main_city_organization_home_entry_corps": ("members/groups", "军团"),
    }
    if action in home_entry_click_expectations:
        expected_target_page_id, expected_label = home_entry_click_expectations[action]
        if page_summary.get("organizationHomeEntryClickedTargetPageId") != expected_target_page_id:
            failures.append(f"organizationHomeEntryClickedTargetPageId!={expected_target_page_id}")
        if page_summary.get("organizationHomeEntryClickedLabel") != expected_label:
            failures.append(f"organizationHomeEntryClickedLabel!={expected_label}")
        if page_summary.get("organizationHomeEntryClickedButtonToken") != ORGANIZATION_HOME_ENTRY_BUTTON_TOKEN:
            failures.append(f"organizationHomeEntryClickedButtonToken!={ORGANIZATION_HOME_ENTRY_BUTTON_TOKEN}")
        if page_summary.get("organizationHomeEntryClickedLiveTextContract") != ORGANIZATION_HOME_ENTRY_LIVE_TEXT_CONTRACT:
            failures.append(f"organizationHomeEntryClickedLiveTextContract!={ORGANIZATION_HOME_ENTRY_LIVE_TEXT_CONTRACT}")
        if bool(page_summary.get("organizationHomeEntryClickVerified", False)) is not True:
            failures.append("organizationHomeEntryClickVerified!=true")
    if is_secondary_action:
        if page_summary.get("organizationSecondaryGeneratedBackgroundMode") != "generated_section_background_layer_v1":
            failures.append("organizationSecondaryGeneratedBackgroundMode!=generated_section_background_layer_v1")
        if page_summary.get("organizationSecondaryBackgroundFitMode") != "proportional_cover_crop_no_deform_v1":
            failures.append("organizationSecondaryBackgroundFitMode!=proportional_cover_crop_no_deform_v1")
        if page_summary.get("organizationSecondaryRealUiOverlayMode") != "real_ui_on_translucent_game_panels_v1":
            failures.append("organizationSecondaryRealUiOverlayMode!=real_ui_on_translucent_game_panels_v1")
        secondary_bg_path = str(page_summary.get("organizationSecondaryBackgroundAssetPath", ""))
        if "organization_lifecycle_visual_asset_drop/organization_secondary_" not in secondary_bg_path:
            failures.append("organizationSecondaryBackgroundAssetPathNotGeneratedDrop")
        if bool(page_summary.get("organizationSecondaryBackgroundTexturePresent", False)) is not True:
            failures.append("organizationSecondaryBackgroundTexturePresent!=true")
        if bool(page_summary.get("organizationSecondaryUsesFullPagePng", True)) is not False:
            failures.append("organizationSecondaryUsesFullPagePng!=false")
        if bool(page_summary.get("organizationSecondaryRealControlOverlay", False)) is not True:
            failures.append("organizationSecondaryRealControlOverlay!=true")
    if bool(page_summary.get("organizationSecondaryUsesLegacyTextWall", True)):
        failures.append("organizationSecondaryUsesLegacyTextWall!=false")
    bespoke_stage_pages = {
        "members/overview",
        "governance/officers",
        "diplomacy/relations",
        "battle_reports/latest",
        "battle_reports/log",
        "nation/policy",
        "nation/market",
        "nation/buildings",
    }
    if expected_page in bespoke_stage_pages:
        if page_summary.get("organizationSecondaryStageLayoutMode") != "single_stage_real_ui_no_dual_column_v1":
            failures.append("organizationSecondaryStageLayoutMode!=single_stage_real_ui_no_dual_column_v1")
        if bool(page_summary.get("organizationSecondaryUsesDualColumnFactory", True)):
            failures.append("organizationSecondaryUsesDualColumnFactory!=false")
    if expected_page in bespoke_stage_pages - {"members/overview"}:
        if page_summary.get("organizationSecondaryPageFactoryBoundary") != "bespoke_game_stage_without_child_page_dual_column_v1":
            failures.append("organizationSecondaryPageFactoryBoundary!=bespoke_game_stage_without_child_page_dual_column_v1")
    if page_summary.get("organizationMemberTableMode") != "member_roster_card_table_v2":
        failures.append("organizationMemberTableMode!=member_roster_card_table_v2")
    if page_summary.get("organizationCorpsCardGridMode") != "corps_game_card_grid_v2":
        failures.append("organizationCorpsCardGridMode!=corps_game_card_grid_v2")
    if page_summary.get("organizationHomeDefaultRouteMode") != "organization_overview_home_default_entry_v1":
        failures.append("organizationHomeDefaultRouteMode!=organization_overview_home_default_entry_v1")
    if page_summary.get("organizationOfficerHierarchyCanvasMode") != "official_hierarchy_zoom_canvas_v1":
        failures.append("organizationOfficerHierarchyCanvasMode!=official_hierarchy_zoom_canvas_v1")
    if page_summary.get("organizationPolicyTreeCanvasMode") != "policy_tree_climb_zoom_canvas_v1":
        failures.append("organizationPolicyTreeCanvasMode!=policy_tree_climb_zoom_canvas_v1")
    if page_summary.get("organizationBattleReportNavigationMode") != "organization_battle_report_list_then_detail_route_v1":
        failures.append("organizationBattleReportNavigationMode!=organization_battle_report_list_then_detail_route_v1")
    if page_summary.get("organizationBattleReportReuseSourceMode") != "battle_report_list_detail_contract_adapter_v1":
        failures.append("organizationBattleReportReuseSourceMode!=battle_report_list_detail_contract_adapter_v1")
    if page_summary.get("organizationBattleReportFilterMode") != "battle_report_core_data_filter_no_visible_extra_strip_v1":
        failures.append("organizationBattleReportFilterMode!=battle_report_core_data_filter_no_visible_extra_strip_v1")
    if page_summary.get("organizationBattleReportEmbeddedChromeMode") != "battle_report_core_scene_no_organization_dashboard_chrome_v1":
        failures.append("organizationBattleReportEmbeddedChromeMode!=battle_report_core_scene_no_organization_dashboard_chrome_v1")
    expected_secondary_modes = {
        "world_open_main_city_organization_policy": ("policy_tree_climb_zoom_canvas_v1", "OrganizationPolicyTreeCanvasBlock", "policy_tree_canvas"),
        "world_open_main_city_organization_diplomacy": ("diplomacy_relation_board_game_cards_v3", "OrganizationDiplomacyRelationBoardBlock", "relation_board"),
        "world_open_main_city_organization_market": ("market_supply_read_model_card_grid_v3", "OrganizationMarketSupplyCardGridBlock", "market_supply"),
        "world_open_main_city_organization_buildings": ("nation_building_read_model_card_grid_v1", "OrganizationNationBuildingReadModelBlock", "building_grid"),
        "world_open_main_city_organization_logs": ("organization_log_filter_timeline_cards_v3", "OrganizationLogFilterTimelineBlock", "timeline_cards"),
        "world_open_main_city_organization_reports": ("organization_battle_report_list_page_v2", "OrganizationBattleReportListBlock", "battle_report_list"),
        "world_open_main_city_organization_report_detail": ("organization_battle_report_detail_page_v2", "OrganizationBattleReportDetailBlock", "battle_report_detail"),
        "world_open_main_city_organization_nation_reports": ("organization_battle_report_list_page_v2", "OrganizationBattleReportListBlock", "battle_report_list"),
        "world_open_main_city_organization_nation_report_detail": ("organization_battle_report_detail_page_v2", "OrganizationBattleReportDetailBlock", "battle_report_detail"),
    }
    if action == "world_open_main_city_organization_members":
        if page_summary.get("organizationActiveSecondaryStructureMode") != "member_roster_card_table_v2":
            failures.append("organizationMembersStructureMode!=member_roster_card_table_v2")
        if page_summary.get("organizationMemberRosterLayoutMode") != "single_roster_stage_no_duplicate_preview_v1":
            failures.append("organizationMemberRosterLayoutMode!=single_roster_stage_no_duplicate_preview_v1")
        if bool(page_summary.get("organizationMemberRosterDuplicatePreview", True)):
            failures.append("organizationMemberRosterDuplicatePreview!=false")
        if _as_int(page_summary.get("organizationActivePageTableBlockCount"), 0) < 1:
            failures.append("organizationMembersTableBlockCount<1")
        if "OrganizationMemberRosterTableBlock" not in str(page_summary.get("organizationActiveContentBlockNodeNames", "")):
            failures.append("organizationMembersRosterTableBlockMissing")
    if action == "world_open_main_city_organization_corps":
        if page_summary.get("organizationActiveSecondaryStructureMode") != "corps_game_card_grid_v2":
            failures.append("organizationCorpsStructureMode!=corps_game_card_grid_v2")
        if _as_int(page_summary.get("organizationActivePageCardGridBlockCount"), 0) < 1:
            failures.append("organizationCorpsCardGridBlockCount<1")
        if "OrganizationCorpsCardGridBlock" not in str(page_summary.get("organizationActiveContentBlockNodeNames", "")):
            failures.append("organizationCorpsCardGridBlockMissing")
    if action == "world_open_main_city_organization_officers":
        if page_summary.get("organizationActiveSecondaryStructureMode") != "official_hierarchy_zoom_canvas_v1":
            failures.append("organizationOfficersStructureMode!=official_hierarchy_zoom_canvas_v1")
        if bool(page_summary.get("organizationOfficerHierarchyZoomEnabled", False)) is not True:
            failures.append("organizationOfficerHierarchyZoomEnabled!=true")
        if _as_int(page_summary.get("organizationActivePageHierarchyCanvasBlockCount"), 0) < 1:
            failures.append("organizationOfficersHierarchyCanvasBlockCount<1")
        if "OrganizationOfficerHierarchyCanvasBlock" not in str(page_summary.get("organizationActiveContentBlockNodeNames", "")):
            failures.append("OrganizationOfficerHierarchyCanvasBlockMissing")
    if action in expected_secondary_modes:
        expected_mode, expected_node_name, expected_block_kind = expected_secondary_modes[action]
        if page_summary.get("organizationActiveSecondaryStructureMode") != expected_mode:
            failures.append(f"organizationSecondaryMode!={expected_mode}")
        if expected_block_kind == "table_block" and _as_int(page_summary.get("organizationActivePageTableBlockCount"), 0) < 1:
            failures.append(f"{expected_node_name}TableBlockCount<1")
        if expected_block_kind == "card_grid" and _as_int(page_summary.get("organizationActivePageCardGridBlockCount"), 0) < 1:
            failures.append(f"{expected_node_name}CardGridBlockCount<1")
        if expected_block_kind == "relation_board" and _as_int(page_summary.get("organizationActivePageRelationBoardBlockCount"), 0) < 1:
            failures.append(f"{expected_node_name}RelationBoardBlockCount<1")
        if expected_block_kind == "timeline_cards" and _as_int(page_summary.get("organizationActivePageTimelineCardBlockCount"), 0) < 1:
            failures.append(f"{expected_node_name}TimelineCardBlockCount<1")
        if expected_block_kind == "market_supply" and _as_int(page_summary.get("organizationActivePageMarketSupplyBlockCount"), 0) < 1:
            failures.append(f"{expected_node_name}MarketSupplyBlockCount<1")
        if expected_block_kind == "building_grid" and _as_int(page_summary.get("organizationActivePageBuildingReadModelBlockCount"), 0) < 1:
            failures.append(f"{expected_node_name}BuildingReadModelBlockCount<1")
        if expected_block_kind == "policy_tree_canvas":
            if bool(page_summary.get("organizationPolicyTreeZoomEnabled", False)) is not True:
                failures.append("organizationPolicyTreeZoomEnabled!=true")
            if _as_int(page_summary.get("organizationActivePagePolicyTreeCanvasBlockCount"), 0) < 1:
                failures.append(f"{expected_node_name}PolicyTreeCanvasBlockCount<1")
        if expected_block_kind == "battle_report_list" and _as_int(page_summary.get("organizationActivePageBattleReportListBlockCount"), 0) < 1:
            failures.append(f"{expected_node_name}BattleReportListBlockCount<1")
        if expected_block_kind == "battle_report_detail" and _as_int(page_summary.get("organizationActivePageBattleReportDetailBlockCount"), 0) < 1:
            failures.append(f"{expected_node_name}BattleReportDetailBlockCount<1")
        if expected_node_name not in str(page_summary.get("organizationActiveContentBlockNodeNames", "")):
            failures.append(f"{expected_node_name}Missing")
    organization_report_actions = {
        "world_open_main_city_organization_reports",
        "world_open_main_city_organization_report_detail",
        "world_open_main_city_organization_nation_reports",
        "world_open_main_city_organization_nation_report_detail",
        "world_open_main_city_organization_report_detail_back",
    }
    if action in organization_report_actions:
        if bool(page_summary.get("organizationBattleReportOrgDashboardHeaderHidden", False)) is not True:
            failures.append("organizationBattleReportOrgDashboardHeaderHidden!=true")
        if bool(page_summary.get("organizationBattleReportVisibleExtraFilterStrip", True)):
            failures.append("organizationBattleReportVisibleExtraFilterStrip!=false")
        if _as_int(page_summary.get("battleReportRawBattleRecordCount"), 0) < 4:
            failures.append("organizationBattleReportRawBattleRecordCount<4")
        if action in {
            "world_open_main_city_organization_report_detail",
            "world_open_main_city_organization_nation_report_detail",
        }:
            if page_summary.get("activePageId") != "battle_reports/detail":
                failures.append("organizationBattleReportDetailActivePageId!=battle_reports/detail")
            if _as_int(page_summary.get("organizationActivePageBattleReportDetailBlockCount"), 0) < 1:
                failures.append("organizationBattleReportDetailBlockCount<1")
            if _as_int(page_summary.get("battleReportDetailAttackerPortraitTextureCount"), 0) < 3:
                failures.append("organizationBattleReportDetailAttackerPortraitTextureCount<3")
            if _as_int(page_summary.get("battleReportDetailAttackerPlaceholderHeroCount"), -1) != 0:
                failures.append("organizationBattleReportDetailAttackerPlaceholderHeroCount!=0")
            failures.extend(_validate_battle_report_detail_contract(page_summary))
        else:
            if _as_int(page_summary.get("battleReportListEntryCount"), 0) < 1:
                failures.append("organizationBattleReportListEntryCount<1")
            if _as_int(page_summary.get("battleReportListOrganizationActionResultCardVisibleCount"), 0) < 1:
                failures.append("battleReportListOrganizationActionResultCardVisibleCount<1")
                failures.append("organizationBattleReportActionResultCardVisibleCount<1")
            if bool(page_summary.get("battleReportListSummaryVisible", True)):
                failures.append("battleReportListSummaryVisible!=false")
            if bool(page_summary.get("battleReportListSharedStateVisible", True)):
                failures.append("battleReportListSharedStateVisible!=false")
            if bool(page_summary.get("battleReportListUtilityRailVisible", False)) is not True:
                failures.append("battleReportListUtilityRailVisible!=true")
    try:
        alliance_source = ALLIANCE_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
        presenter_source = (REPO_ROOT / "godot-client" / "scripts" / "ui" / "presenters" / "alliance_presenter.gd").read_text(encoding="utf-8")
        child_page_source = (REPO_ROOT / "godot-client" / "scripts" / "ui" / "child_page_block_factory.gd").read_text(encoding="utf-8")
    except OSError as exc:
        failures.append(f"organizationLifecycleSourceReadFailed:{exc}")
        return failures
    for marker in [
        "ORGANIZATION_LIFECYCLE_FIXTURE_PATH := \"res://data/ui/organization_lifecycle_preview_read_model.json\"",
        "func apply_organization_lifecycle_fixture(",
        "ORGANIZATION_SECONDARY_VISUAL_MODE := \"organization_secondary_game_card_stack_v1\"",
        "ORGANIZATION_SECONDARY_CARD_STYLE_MODE := \"seal_icon_layered_card_rows_v1\"",
        "ORGANIZATION_SECONDARY_SUMMARY_MODE := \"seal_compact_summary_bar_v1\"",
        "ORGANIZATION_SECONDARY_GENERATED_BG_MODE := \"generated_section_background_layer_v1\"",
        "ORGANIZATION_SECONDARY_BG_FIT_MODE := \"proportional_cover_crop_no_deform_v1\"",
        "ORGANIZATION_SECONDARY_REAL_UI_OVERLAY_MODE := \"real_ui_on_translucent_game_panels_v1\"",
        "ORGANIZATION_SECONDARY_STAGE_LAYOUT_MODE := \"single_stage_real_ui_no_dual_column_v1\"",
        "ORGANIZATION_SECONDARY_PAGE_FACTORY_BOUNDARY := \"bespoke_game_stage_without_child_page_dual_column_v1\"",
        "ORGANIZATION_MEMBER_TABLE_MODE := \"member_roster_card_table_v2\"",
        "ORGANIZATION_MEMBER_ROSTER_LAYOUT_MODE := \"single_roster_stage_no_duplicate_preview_v1\"",
        "ORGANIZATION_CORPS_CARD_GRID_MODE := \"corps_game_card_grid_v2\"",
        "ORGANIZATION_HOME_DEFAULT_ROUTE_MODE := \"organization_overview_home_default_entry_v1\"",
        "ORGANIZATION_OFFICER_HIERARCHY_CANVAS_MODE := \"official_hierarchy_zoom_canvas_v1\"",
        "ORGANIZATION_POLICY_TREE_CANVAS_MODE := \"policy_tree_climb_zoom_canvas_v1\"",
        "ORGANIZATION_POLICY_READ_MODEL_MODE := \"nation_policy_read_model_tree_canvas_v1\"",
        "ORGANIZATION_DIPLOMACY_BOARD_MODE := \"diplomacy_relation_board_game_cards_v3\"",
        "ORGANIZATION_MARKET_CARD_GRID_MODE := \"market_supply_read_model_card_grid_v3\"",
        "ORGANIZATION_NATION_BUILDING_READ_MODEL_MODE := \"nation_building_read_model_card_grid_v1\"",
        "ORGANIZATION_LOG_TIMELINE_MODE := \"organization_log_filter_timeline_cards_v3\"",
        "ORGANIZATION_LOG_FILTER_MODE := \"organization_log_report_filter_strip_v1\"",
        "ORGANIZATION_BATTLE_REPORT_NAVIGATION_MODE := \"organization_battle_report_list_then_detail_route_v1\"",
        "ORGANIZATION_BATTLE_REPORT_LIST_MODE := \"organization_battle_report_list_page_v2\"",
        "ORGANIZATION_BATTLE_REPORT_DETAIL_MODE := \"organization_battle_report_detail_page_v2\"",
        "ORGANIZATION_BATTLE_REPORT_REUSE_SOURCE_MODE := \"battle_report_list_detail_contract_adapter_v1\"",
        "ORGANIZATION_BATTLE_REPORT_FILTER_MODE := \"battle_report_core_data_filter_no_visible_extra_strip_v1\"",
        "ORGANIZATION_BATTLE_REPORT_EMBEDDED_CHROME_MODE := \"battle_report_core_scene_no_organization_dashboard_chrome_v1\"",
        "func _build_secondary_single_stage_view(",
        "func _build_officer_hierarchy_stage_view(",
        "func _build_policy_tree_stage_view(",
        "func _build_organization_battle_report_stage_view(",
        "func _uses_bespoke_secondary_stage(",
    ]:
        if marker not in alliance_source:
            failures.append(f"organizationAllianceSourceMissing:{marker}")
    for marker in [
        '"kind": "table_block"',
        '"kind": "card_grid"',
        "OrganizationMemberRosterTableBlock",
        "OrganizationCorpsCardGridBlock",
        "OrganizationOfficerHierarchyCanvasBlock",
        "OrganizationPolicyTreeCanvasBlock",
        "OrganizationDiplomacyRelationBoardBlock",
        "OrganizationMarketSupplyCardGridBlock",
        "OrganizationLogFilterTimelineBlock",
        "OrganizationBattleReportListBlock",
    ]:
        if marker not in presenter_source:
            failures.append(f"organizationPresenterSourceMissing:{marker}")
    if "OrganizationNationBuildingReadModelBlock" not in alliance_source:
        failures.append("organizationAllianceSourceMissing:OrganizationNationBuildingReadModelBlock")
    for marker in [
        '"table_block"',
        '"card_grid"',
        "func _build_table_block(",
        "func _build_card_grid_block(",
        "func _wrap_page_with_generated_background(",
        "TextureRect.STRETCH_KEEP_ASPECT_COVERED",
        "CHILD_PAGE_FACTORY_VISUAL_MODE := \"child_page_game_card_factory_v2\"",
        "CHILD_PAGE_GENERATED_BACKGROUND_MODE := \"generated_section_background_layer_v1\"",
        "CHILD_PAGE_REAL_UI_OVERLAY_MODE := \"real_ui_on_translucent_game_panels_v1\"",
        "CHILD_PAGE_ICON_SEAL_MODE := \"auto_title_seal_icons_v1\"",
        "CHILD_PAGE_ROW_VISUAL_MODE := \"seal_left_card_table_rows_v1\"",
    ]:
        if marker not in child_page_source:
            failures.append(f"organizationChildBlockFactoryMissing:{marker}")
    battle_report_stage_source = _extract_gdscript_function(alliance_source, "_build_organization_battle_report_stage_view")
    battle_report_panel_source = _extract_gdscript_function(alliance_source, "_build_organization_battle_report_panel")
    if "_build_secondary_stage_header" in battle_report_stage_source:
        failures.append("organizationBattleReportStageStillCallsSecondaryHeader")
    if "_build_stage_filter_strip" in battle_report_panel_source:
        failures.append("organizationBattleReportPanelStillBuildsExtraFilterStrip")
    for marker in [
        '"hide_summary_card": true',
        '"hide_shared_state_card": true',
        '"show_utility_rail": true',
    ]:
        if marker not in battle_report_panel_source:
            failures.append(f"organizationBattleReportEmbeddedListFlagMissing:{marker}")
    failures.extend(_validate_organization_lifecycle_fixture_source_contract())
    return failures


def _validate_organization_back_route_contract(action: str, click_result: dict[str, Any]) -> list[str]:
    expected_back_page_by_action = {
        "world_open_main_city_organization_reports_back": ("battle_reports/latest", "overview/home"),
        "world_open_main_city_organization_report_detail_back": ("battle_reports/detail", "battle_reports/latest"),
    }
    expected = expected_back_page_by_action.get(action)
    if expected is None:
        return []
    expected_start_page, expected_back_page = expected
    failures: list[str] = []
    if click_result.get("reason") != "organization_back_returned_to_parent_page":
        failures.append("organizationBackRouteReason!=organization_back_returned_to_parent_page")
    if click_result.get("activePageIdBeforeBack") != expected_start_page:
        failures.append(f"organizationBackRouteBeforePage!={expected_start_page}")
    if click_result.get("activePageId") != expected_back_page:
        failures.append(f"organizationBackRouteAfterPage!={expected_back_page}")
    if click_result.get("panelStillOpen") is not True:
        failures.append("organizationBackRoutePanelStillOpen!=true")
    if click_result.get("displayMode") != "world":
        failures.append("organizationBackRouteDisplayMode!=world")
    return failures


def _validate_settings_panel_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    failures.extend(
        _validate_design_system_contract(
            page_summary,
            "settings_shell",
            require_production_baseline=False,
        )
    )
    failures.extend(_validate_snapshot_edge_motion_contract(page_summary))
    failures.extend(_validate_snapshot_section_touch_scroll_contract())
    expected_tabs = "display/audio/notification/account"
    if page_summary.get("settingsPanelContract") != "settings_panel_v1":
        failures.append("settingsPanelContract!=settings_panel_v1")
    if page_summary.get("settingsPanelLocation") != "mainline_snapshot_overlay":
        failures.append("settingsPanelLocation!=mainline_snapshot_overlay")
    if page_summary.get("settingsSource") != "local_ui_settings_snapshot_v1":
        failures.append("settingsSource!=local_ui_settings_snapshot_v1")
    if page_summary.get("settingsTabIds") != expected_tabs:
        failures.append(f"settingsTabIds!={expected_tabs}")
    if page_summary.get("settingsTouchInputMode") != "touch_mouse_drag_v1":
        failures.append("settingsTouchInputMode!=touch_mouse_drag_v1")
    if page_summary.get("settingsTouchScrollbarVisibility") != "hidden":
        failures.append("settingsTouchScrollbarVisibility!=hidden")
    if page_summary.get("settingsBackendBoundary") != "ui_local_settings_only_no_backend_authority":
        failures.append("settingsBackendBoundary!=ui_local_settings_only_no_backend_authority")
    if page_summary.get("settingsVoiceProviderBoundary") != "no_voice_provider_or_api_key":
        failures.append("settingsVoiceProviderBoundary!=no_voice_provider_or_api_key")
    if page_summary.get("settingsMotionBoundary") != "uses_snapshot_edge_page_enter_no_motion_system_mutation":
        failures.append("settingsMotionBoundary!=uses_snapshot_edge_page_enter_no_motion_system_mutation")
    if page_summary.get("settingsVisualMode") != "compact_mobile_settings_sections_v1":
        failures.append("settingsVisualMode!=compact_mobile_settings_sections_v1")
    if page_summary.get("settingsPanelToken") != "settings_panel_v1":
        failures.append("settingsPanelToken!=settings_panel_v1")
    if bool(page_summary.get("settingsLocalOnly", False)) is not True:
        failures.append("settingsLocalOnly!=true")
    if bool(page_summary.get("settingsNoApiKeySurface", False)) is not True:
        failures.append("settingsNoApiKeySurface!=true")
    if bool(page_summary.get("settingsUsesRawProviderFields", True)):
        failures.append("settingsUsesRawProviderFields!=false")
    if _as_int(page_summary.get("settingsPageCount")) != 4:
        failures.append("settingsPageCount!=4")
    if _as_int(page_summary.get("settingsOptionCount")) < 12:
        failures.append("settingsOptionCount<12")
    if _as_int(page_summary.get("contentBlockCount")) < 1:
        failures.append("settingsContentBlockCount<1")
    if _as_int(page_summary.get("itemCardCount")) < 3:
        failures.append("settingsItemCardCount<3")
    if _as_int(page_summary.get("settingsForbiddenEngineeringCopyCount"), -1) != 0:
        failures.append("settingsForbiddenEngineeringCopyCount!=0")
    if page_summary.get("settingsActionRowButtonToken") != SETTINGS_ACTION_ROW_BUTTON_TOKEN:
        failures.append(f"settingsActionRowButtonToken!={SETTINGS_ACTION_ROW_BUTTON_TOKEN}")
    if page_summary.get("settingsActionRowLiveTextContract") != SETTINGS_ACTION_ROW_LIVE_TEXT_CONTRACT:
        failures.append(f"settingsActionRowLiveTextContract!={SETTINGS_ACTION_ROW_LIVE_TEXT_CONTRACT}")
    action_row_count = _as_int(page_summary.get("settingsActionRowButtonVisibleCount"), -1)
    if action_row_count < 4:
        failures.append("settingsActionRowButtonVisibleCount<4")
    if _as_int(page_summary.get("settingsActionRowButtonTokenCount"), -1) != action_row_count:
        failures.append("settingsActionRowButtonTokenCount!=settingsActionRowButtonVisibleCount")
    if _as_int(page_summary.get("settingsActionRowButtonMissingMetaCount"), -1) != 0:
        failures.append("settingsActionRowButtonMissingMetaCount!=0")
    if str(page_summary.get("settingsActionRowActionIds", "")).strip() == "":
        failures.append("settingsActionRowActionIds empty")
    if str(page_summary.get("settingsActionRowLabels", "")).strip() == "":
        failures.append("settingsActionRowLabels empty")
    for key in [
        "settingsDisplayControlsVisible",
        "settingsAudioControlsVisible",
        "settingsNotificationControlsVisible",
        "settingsAccountControlsVisible",
    ]:
        if bool(page_summary.get(key, False)) is not True:
            failures.append(f"{key}!=true")
    return failures


def _validate_observability_permanently_disabled_contract(godot_report: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    try:
        source = MAIN_APP_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"observabilitySourceReadFailed:{exc}"]
    if "const OBSERVABILITY_PANEL_PERMANENTLY_DISABLED := true" not in source:
        failures.append("observabilityPermanentDisableConstMissing")
    if "func _disable_observability_panel_permanently() -> void:" not in source:
        failures.append("observabilityPermanentDisableFunctionMissing")
    if "_disable_observability_panel_permanently()" not in _extract_gdscript_function(source, "_ready"):
        failures.append("observabilityPermanentDisableNotCalledInReady")
    if "if OBSERVABILITY_PANEL_PERMANENTLY_DISABLED:" not in _extract_gdscript_function(source, "_start_observability"):
        failures.append("observabilityStartGuardMissing")
    if "if OBSERVABILITY_PANEL_PERMANENTLY_DISABLED:" not in _extract_gdscript_function(source, "_update_observability_panel"):
        failures.append("observabilityUpdateGuardMissing")
    if "if OBSERVABILITY_PANEL_PERMANENTLY_DISABLED:" not in _extract_gdscript_function(source, "_should_show_observability_panel"):
        failures.append("observabilityShowGuardMissing")
    if godot_report.get("observabilityPermanentDisabled") is not True:
        failures.append("observabilityPermanentDisabled!=true")
    if godot_report.get("observabilityPanelPresent") is not False:
        failures.append("observabilityPanelPresent!=false")
    if godot_report.get("observabilityPanelVisible") is not False:
        failures.append("observabilityPanelVisible!=false")
    if godot_report.get("observabilityBridgePresent") is not False:
        failures.append("observabilityBridgePresent!=false")
    if godot_report.get("observabilityRemovalMode") != "runtime_remove_panel_skip_bridge_v1":
        failures.append("observabilityRemovalMode!=runtime_remove_panel_skip_bridge_v1")
    return failures


def _validate_snapshot_section_cover_image_boundary_contract() -> list[str]:
    failures: list[str] = []
    if not SNAPSHOT_SECTION_PAGE_SCRIPT_PATH.exists():
        return ["snapshotSectionPageScriptMissing"]
    source = SNAPSHOT_SECTION_PAGE_SCRIPT_PATH.read_text(encoding="utf-8")
    allowed_functions = {
        "_build_feature_image_slot",
        "_build_world_affairs_scene_art",
        "_build_task_chapter_scene_art",
        "_build_state_card",
    }
    cover_required_functions = {
        "_build_feature_image_slot",
        "_build_world_affairs_scene_art",
        "_build_task_chapter_scene_art",
        "_build_state_card",
    }
    covered_total = source.count("STRETCH_KEEP_ASPECT_COVERED")
    covered_in_allowed = 0
    forbidden_portrait_markers = [
        "portraitAssetKey",
        "portrait_asset_key",
        "asset_ref",
        "assetRef",
        "hero_portrait",
        "PORTRAIT_ASSET_REGISTRY",
        "hero_portrait_asset_ref",
        "hero_portrait_payload_from_entry",
        "apply_portrait_frame_texture",
        "apply_portrait_frame_stage",
    ]
    for function_name in allowed_functions:
        function_source = _extract_gdscript_function(source, function_name)
        if function_source == "":
            failures.append(f"snapshotSectionCoverFunctionMissing:{function_name}")
            continue
        function_covered_count = function_source.count("STRETCH_KEEP_ASPECT_COVERED")
        if function_name in cover_required_functions and function_covered_count <= 0:
            failures.append(f"snapshotSectionCoverFunctionCoveredMissing:{function_name}")
        covered_in_allowed += function_covered_count
        for forbidden_marker in forbidden_portrait_markers:
            if forbidden_marker in function_source:
                failures.append(f"snapshotSectionCoverFunctionCarriesPortraitLogic:{function_name}:{forbidden_marker}")
    if covered_total != covered_in_allowed:
        failures.append("snapshotSectionCoveredStretchOutsideCoverWhitelist")
    feature_source = _extract_gdscript_function(source, "_build_feature_image_slot")
    if "uses_full_cover_image" not in feature_source:
        failures.append("snapshotSectionFeatureCoverGateMissing")
    if 'cover_mode == "asset_drop_cover"' not in feature_source:
        failures.append("snapshotSectionAssetDropCoverModeMissing")
    return failures


def _validate_ai_panel_touch_scroll_contract() -> list[str]:
    failures: list[str] = []
    if not AI_PANEL_SCRIPT_PATH.exists():
        return ["aiPanelScriptMissing"]
    source = AI_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
    avatar_popup = _extract_gdscript_function(source, "_ensure_avatar_select_popup")
    if avatar_popup == "":
        failures.append("aiPanelAvatarPopupBuilderMissing")
    else:
        if 'scroll.name = "AIAvatarSelectScroll"' not in avatar_popup:
            failures.append("aiPanelAvatarScrollNameMissing")
        if "scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER" not in avatar_popup:
            failures.append("aiPanelAvatarHorizontalScrollNotHidden")
        if "scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER" not in avatar_popup:
            failures.append("aiPanelAvatarVerticalScrollNotHidden")
        if "_apply_touch_scroll_chrome(scroll)" not in avatar_popup:
            failures.append("aiPanelAvatarTouchChromeMissing")
    if "_hide_scroll_bars_for" not in source:
        failures.append("aiPanelAvatarScrollBarHideHelperMissing")
    return failures


def _validate_recruit_touch_scroll_source_contract() -> list[str]:
    failures: list[str] = []
    try:
        recruit_renderer_source = RECRUIT_FORMAL_PACK_RENDERER_SCRIPT_PATH.read_text(encoding="utf-8")
        recruit_preview_source = RECRUIT_FORMAL_PACK_PREVIEW_SCRIPT_PATH.read_text(encoding="utf-8")
        recruit_general_preview_source = RECRUIT_GENERAL_FORMAL_PACK_PREVIEW_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"recruitTouchScrollSourceReadFailed:{exc}"]

    def require_touch_scroll(label: str, source: str, function_name: str, variable_name: str) -> None:
        function_source = _extract_gdscript_function(source, function_name)
        if function_source == "":
            failures.append(f"{label}{function_name}FunctionMissing")
            return
        expected_call = f"UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container({variable_name})"
        expected_card_rail_call = f"UI_COMPONENT_FACTORY.apply_card_rail_scroll_container({variable_name}"
        if expected_call not in function_source and expected_card_rail_call not in function_source:
            failures.append(f"{label}{function_name}TouchScrollFactoryMissing")
        if "ScrollContainer.SCROLL_MODE_AUTO" in function_source:
            failures.append(f"{label}{function_name}AutoScrollbarStillPresent")

    require_touch_scroll("recruitRenderer", recruit_renderer_source, "_build_root", "scroll")
    require_touch_scroll("recruitRenderer", recruit_renderer_source, "_build_pack_scroll", "scroll")
    require_touch_scroll("recruitRenderer", recruit_renderer_source, "_build_draw_preview_card_scroll", "scroll")
    require_touch_scroll("recruitPreview", recruit_preview_source, "_build_pack_scroll", "_pack_scroll")
    if "const UI_COMPONENT_FACTORY := preload(\"res://scripts/ui/slg_ui_component_factory.gd\")" not in recruit_general_preview_source:
        failures.append("recruitGeneralPreviewUiComponentFactoryPreloadMissing")
    require_touch_scroll("recruitGeneralPreview", recruit_general_preview_source, "_build_recruit_section", "_pack_scroll")
    require_touch_scroll("recruitGeneralPreview", recruit_general_preview_source, "_build_roster_section", "filter_scroll")
    return failures


def _validate_general_roster_touch_flow_source_contract() -> list[str]:
    failures: list[str] = []
    try:
        general_panel_source = GENERAL_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
        general_roster_source = GENERAL_ROSTER_LIST_RENDERER_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"generalRosterTouchFlowSourceReadFailed:{exc}"]
    roster_page_source = _extract_gdscript_function(general_panel_source, "_build_roster_page")
    if roster_page_source == "":
        failures.append("generalPanelBuildRosterPageMissing")
    else:
        if "UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(scroll)" not in roster_page_source:
            failures.append("generalRosterScrollTouchFactoryMissing")
        if "ScrollContainer.SCROLL_MODE_AUTO" in roster_page_source:
            failures.append("generalRosterAutoScrollbarStillPresent")
    if "HFlowContainer.new()" not in general_roster_source:
        failures.append("generalRosterResponsiveFlowContainerMissing")
    if "UI_COMPONENT_FACTORY.apply_general_roster_responsive_flow_layout(flow)" not in general_roster_source:
        failures.append("generalRosterResponsiveFlowFactoryMissing")
    if "card.mouse_filter = Control.MOUSE_FILTER_PASS" not in general_roster_source:
        failures.append("generalRosterCardDragPassThroughMissing")
    if "grid.columns = ROSTER_GRID_COLUMNS" in general_roster_source:
        failures.append("generalRosterFixedGridColumnsStillPresent")
    return failures


def _validate_mainline_high_frequency_touch_scroll_source_contract() -> list[str]:
    failures: list[str] = []
    try:
        ai_panel_source = AI_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
        chat_source = MAIN_CHAT_OVERLAY_SCRIPT_PATH.read_text(encoding="utf-8")
        recruit_panel_source = RECRUIT_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
        battle_detail_source = BATTLE_REPORT_DETAIL_PAGE_SCRIPT_PATH.read_text(encoding="utf-8")
        interior_source = MAIN_CITY_INTERIOR_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"highFrequencyTouchScrollSourceReadFailed:{exc}"]

    def require_mobile_touch_call(label: str, source: str, function_name: str, variable_name: str) -> None:
        function_source = _extract_gdscript_function(source, function_name)
        if function_source == "":
            failures.append(f"{label}{function_name}FunctionMissing")
            return
        expected_call = f"UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container({variable_name})"
        if expected_call not in function_source:
            failures.append(f"{label}{function_name}TouchMouseDragFactoryMissing")
        if "ScrollContainer.SCROLL_MODE_AUTO" in function_source:
            failures.append(f"{label}{function_name}AutoScrollbarStillPresent")

    if 'const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")' not in ai_panel_source:
        failures.append("aiPanelUiComponentFactoryPreloadMissing")
    require_mobile_touch_call("aiPanel", ai_panel_source, "_ensure_avatar_select_popup", "scroll")
    require_mobile_touch_call("chatOverlay", chat_source, "_build_channel_rail", "scroll")
    require_mobile_touch_call("chatOverlay", chat_source, "_build_chat_body", "scroll")
    require_mobile_touch_call("chatOverlay", chat_source, "_build_mailbox_popup", "scroll")
    require_mobile_touch_call("chatOverlay", chat_source, "_build_proposal_detail_popup", "scroll")
    require_mobile_touch_call("recruitPanel", recruit_panel_source, "_build_recruit_page", "scroll")
    detail_scroll_source = _extract_gdscript_function(battle_detail_source, "_ensure_detail_page_scroll")
    if detail_scroll_source == "":
        failures.append("battleReportDetailEnsureScrollFunctionMissing")
    elif "BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_detail_scroll_container(_detail_page_scroll)" not in detail_scroll_source:
        failures.append("battleReportDetailTouchMouseDragFactoryMissing")
    require_mobile_touch_call("interiorPanel", interior_source, "_ensure_tab_view", "root")
    require_mobile_touch_call("interiorPanel", interior_source, "_build_construction_queue_group_panel", "scroll")
    require_mobile_touch_call("interiorPanel", interior_source, "_build_construction_work_order_feed", "scroll")
    return failures


def _validate_hero_card_contract(
    page_summary: dict[str, Any],
    expected_render_mode: str,
    *,
    min_sample_count: int = 1,
    require_portrait_resolution: bool = False,
    min_portrait_checked_count: int = 1,
) -> list[str]:
    failures: list[str] = []
    if page_summary.get("heroCardViewMode") != "hero_card_view":
        failures.append("heroCardViewMode!=hero_card_view")
    if page_summary.get("heroCardRenderMode") != expected_render_mode:
        failures.append(f"heroCardRenderMode!={expected_render_mode}")
    if page_summary.get("heroCardTokenMode") != HERO_CARD_TOKEN_MODE:
        failures.append(f"heroCardTokenMode!={HERO_CARD_TOKEN_MODE}")
    if page_summary.get("heroCardPanelStyleToken") != HERO_CARD_PANEL_STYLE_TOKEN:
        failures.append(f"heroCardPanelStyleToken!={HERO_CARD_PANEL_STYLE_TOKEN}")
    if page_summary.get("heroCardButtonStyleToken") != HERO_CARD_BUTTON_STYLE_TOKEN:
        failures.append(f"heroCardButtonStyleToken!={HERO_CARD_BUTTON_STYLE_TOKEN}")
    if page_summary.get("heroCardFontBucket") != HERO_CARD_FONT_BUCKET:
        failures.append(f"heroCardFontBucket!={HERO_CARD_FONT_BUCKET}")
    if page_summary.get("heroCardAspectLockMode") != "fixed_preset_no_parent_stretch_v2":
        failures.append("heroCardAspectLockMode!=fixed_preset_no_parent_stretch_v2")
    if bool(page_summary.get("heroCardVerticalExpandAllowed", True)):
        failures.append("heroCardVerticalExpandAllowed!=false")
    if _as_int(page_summary.get("heroCardSampleCount")) < min_sample_count:
        failures.append(f"heroCardSampleCount<{min_sample_count}")
    if expected_render_mode in {"owned_roster", "draw_result"}:
        failures.extend(_validate_hero_card_full_layout_contract(page_summary, expected_render_mode))
    failures.extend(_validate_portrait_frame_contract(page_summary, "heroCard", PORTRAIT_FRAME_HERO_CARD_VARIANT))
    if require_portrait_resolution:
        failures.extend(_validate_hero_card_portrait_resolution_contract(page_summary, min_portrait_checked_count))
        failures.extend(_validate_hero_card_stage_fill_contract(page_summary))
        failures.extend(_validate_hero_card_source_contract())
    return failures


def _validate_hero_card_full_layout_contract(page_summary: dict[str, Any], expected_render_mode: str) -> list[str]:
    failures: list[str] = []
    if page_summary.get("heroCardLayoutPresetId") != HERO_CARD_FULL_LAYOUT_PRESET_ID:
        failures.append(f"heroCardLayoutPresetId!={HERO_CARD_FULL_LAYOUT_PRESET_ID}")
    if _as_int(page_summary.get("heroCardWidth")) != HERO_CARD_FULL_LAYOUT_WIDTH:
        failures.append(f"heroCardWidth!={HERO_CARD_FULL_LAYOUT_WIDTH}")
    if _as_int(page_summary.get("heroCardHeight")) != HERO_CARD_FULL_LAYOUT_HEIGHT:
        failures.append(f"heroCardHeight!={HERO_CARD_FULL_LAYOUT_HEIGHT}")
    expected_owner_slot = "owner_display_name" if expected_render_mode == "owned_roster" else "none"
    if page_summary.get("heroCardOwnerSlotMode") != expected_owner_slot:
        failures.append(f"heroCardOwnerSlotMode!={expected_owner_slot}")
    if _as_int(page_summary.get("heroCardIdentityStripHeight")) < 180:
        failures.append("heroCardIdentityStripHeight<180")
    return failures


def _validate_hero_card_portrait_resolution_contract(
    page_summary: dict[str, Any],
    min_portrait_checked_count: int,
) -> list[str]:
    failures: list[str] = []
    if page_summary.get("heroCardPortraitResolveMode") != "registry_first":
        failures.append("heroCardPortraitResolveMode!=registry_first")
    if page_summary.get("heroCardPortraitResolvedBy") != PORTRAIT_FRAME_REGISTRY_ID:
        failures.append(f"heroCardPortraitResolvedBy!={PORTRAIT_FRAME_REGISTRY_ID}")
    if _as_int(page_summary.get("heroCardPortraitFallbackCount"), -1) != 0:
        failures.append("heroCardPortraitFallbackCount!=0")
    if _as_int(page_summary.get("heroCardPortraitSourceMissCount"), -1) != 0:
        failures.append("heroCardPortraitSourceMissCount!=0")
    if _as_int(page_summary.get("heroCardPortraitSampleCheckedCount")) < min_portrait_checked_count:
        failures.append(f"heroCardPortraitSampleCheckedCount<{min_portrait_checked_count}")
    return failures


def _validate_hero_card_stage_fill_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if _as_int(page_summary.get("heroCardPortraitSampleIdentityCount")) <= 0:
        return failures
    if page_summary.get("heroCardPortraitStageFillMode") != "full_card_underlay_v1":
        failures.append("heroCardPortraitStageFillMode!=full_card_underlay_v1")
    if _as_float(page_summary.get("heroCardPortraitStageMinFillRatio")) < 0.80:
        failures.append("heroCardPortraitStageMinFillRatio<0.80")
    if bool(page_summary.get("heroCardPortraitStageUsesContentCrop", True)):
        failures.append("heroCardPortraitStageUsesContentCrop!=false")
    return failures


def _validate_hero_card_skill_visual_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    sample_count = _as_int(page_summary.get("heroCardSampleCount"))
    portrait_identity_count = _as_int(page_summary.get("heroCardPortraitSampleIdentityCount"))
    expected_non_portrait_count = max(0, sample_count - portrait_identity_count)
    skill_count = _as_int(page_summary.get("heroCardSkillCardCount"))
    if skill_count < expected_non_portrait_count:
        failures.append(f"heroCardSkillCardCount<{expected_non_portrait_count}")
    if skill_count > 0:
        if page_summary.get("heroCardSkillCardVisualMode") != "full_card_skill_plate_v2":
            failures.append("heroCardSkillCardVisualMode!=full_card_skill_plate_v2")
        if bool(page_summary.get("heroCardSkillCardCenterTextVisible", True)):
            failures.append("heroCardSkillCardCenterTextVisible!=false")
        if page_summary.get("heroCardSkillCardFrontTextMode") != "hero_card_skill_front_asset_ref_status_only_v1":
            failures.append("heroCardSkillCardFrontTextMode!=hero_card_skill_front_asset_ref_status_only_v1")
        if _as_int(page_summary.get("heroCardSkillCardFrontGradeTextCount")) != 0:
            failures.append("heroCardSkillCardFrontGradeTextCount!=0")
        if _as_int(page_summary.get("heroCardSkillCardFrontNameTextCount")) != 0:
            failures.append("heroCardSkillCardFrontNameTextCount!=0")
        if _as_int(page_summary.get("heroCardSkillCardUnequippedLevelTextCount")) != 0:
            failures.append("heroCardSkillCardUnequippedLevelTextCount!=0")
        if page_summary.get("heroCardSkillCardEquipReadModelSource") != "controller_display_name/equipped_hero_name/skill_level":
            failures.append("heroCardSkillCardEquipReadModelSource!=controller_display_name/equipped_hero_name/skill_level")
        if page_summary.get("heroCardSkillCardLevelReadModelSource") != "skill_level/skillLevel":
            failures.append("heroCardSkillCardLevelReadModelSource!=skill_level/skillLevel")
        if page_summary.get("heroCardSkillCardLevelRangeMode") != "skill_level_1_10_v1":
            failures.append("heroCardSkillCardLevelRangeMode!=skill_level_1_10_v1")
        if _as_int(page_summary.get("heroCardSkillCardLevelRangeInvalidCount")) != 0:
            failures.append("heroCardSkillCardLevelRangeInvalidCount!=0")
        if _as_int(page_summary.get("heroCardSkillCardDefaultLevelFallbackCount")) != 0:
            failures.append("heroCardSkillCardDefaultLevelFallbackCount!=0")
        if _as_int(page_summary.get("heroCardSkillCardEquippedMissingLevelCount")) != 0:
            failures.append("heroCardSkillCardEquippedMissingLevelCount!=0")
        hero_skill_level_count = _as_int(page_summary.get("heroCardSkillCardLevelReadModelCount"))
        if hero_skill_level_count > 0:
            if _as_int(page_summary.get("heroCardSkillCardLevelMin")) < 1:
                failures.append("heroCardSkillCardLevelMin<1")
            if _as_int(page_summary.get("heroCardSkillCardLevelMax")) > 10:
                failures.append("heroCardSkillCardLevelMax>10")
        if page_summary.get("heroCardSkillCardBottomStatusMode") != "skill_type_left_controller_level_right_v1":
            failures.append("heroCardSkillCardBottomStatusMode!=skill_type_left_controller_level_right_v1")
        if _as_int(page_summary.get("heroCardSkillCardTypeLabelTextCount")) < min(3, skill_count):
            failures.append("heroCardSkillCardTypeLabelTextCount<min(3,skill_count)")
        if _as_int(page_summary.get("heroCardSkillCardTypeLabelFontSize")) < 17:
            failures.append("heroCardSkillCardTypeLabelFontSize<17")
        if page_summary.get("heroCardSkillCardAssetRefSlotMode") != "skill_detail_asset_ref_png_v1":
            failures.append("heroCardSkillCardAssetRefSlotMode!=skill_detail_asset_ref_png_v1")
        if _as_int(page_summary.get("heroCardSkillCardAssetRefSlotCount")) < min(3, skill_count):
            failures.append("heroCardSkillCardAssetRefSlotCount<min(3,skill_count)")
        if _as_int(page_summary.get("heroCardSkillCardDrawOverlayTextCount")) != 0:
            failures.append("heroCardSkillCardDrawOverlayTextCount!=0")
        if page_summary.get("heroCardSkillCardEquipStatusMode") != "single_bottom_status_read_model_v1":
            failures.append("heroCardSkillCardEquipStatusMode!=single_bottom_status_read_model_v1")
        if bool(page_summary.get("heroCardSkillCardEmptyStageAllowed", True)):
            failures.append("heroCardSkillCardEmptyStageAllowed!=false")
        if not bool(page_summary.get("heroCardSkillCardFlipEnabled", False)):
            failures.append("heroCardSkillCardFlipEnabled!=true")
        if page_summary.get("heroCardSkillCardFlipMode") != "click_front_back":
            failures.append("heroCardSkillCardFlipMode!=click_front_back")
        if not bool(page_summary.get("heroCardSkillBackFaceAvailable", False)):
            failures.append("heroCardSkillBackFaceAvailable!=true")
        if page_summary.get("heroCardSkillBackFaceReadModelSource") != "skill_detail/read_model":
            failures.append("heroCardSkillBackFaceReadModelSource!=skill_detail/read_model")
        for field_name in [
            "Trigger",
            "Target",
            "Effect",
            "Troops",
            "Source",
        ]:
            key = f"heroCardSkillBackFace{field_name}TextCount"
            if _as_int(page_summary.get(key)) < min(1, skill_count):
                failures.append(f"{key}<1")
    return failures


def _validate_hero_card_source_contract() -> list[str]:
    failures: list[str] = []
    try:
        hero_card_source = HERO_CARD_VIEW_SCRIPT_PATH.read_text(encoding="utf-8")
        formal_pack_asset_registry_source = FORMAL_PACK_ASSET_REGISTRY_SCRIPT_PATH.read_text(encoding="utf-8")
        recruit_renderer_source = RECRUIT_FORMAL_PACK_RENDERER_SCRIPT_PATH.read_text(encoding="utf-8")
        recruit_preview_source = RECRUIT_FORMAL_PACK_PREVIEW_SCRIPT_PATH.read_text(encoding="utf-8")
        draw_result_preview_source = DRAW_RESULT_FORMAL_PACK_PREVIEW_SCRIPT_PATH.read_text(encoding="utf-8")
        recruit_panel_source = RECRUIT_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
        recruit_presenter_source = RECRUIT_PRESENTER_SCRIPT_PATH.read_text(encoding="utf-8")
        ui_component_factory_source = UI_COMPONENT_FACTORY_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"heroCardSourceReadFailed:{exc}"]
    if "static func portrait_frame_display_strategy() -> Dictionary:" not in ui_component_factory_source:
        failures.append("portraitFrameDisplayStrategyFactoryMissing")
    if "static func hero_portrait_asset_ref(" not in ui_component_factory_source:
        failures.append("heroPortraitAssetRefFactoryMissing")
    if "static func hero_portrait_payload_from_entry(" not in ui_component_factory_source:
        failures.append("heroPortraitPayloadFactoryMissing")
    if 'if payload.size() == 0 and (hero_id != "" or portrait_asset_key != ""):' not in ui_component_factory_source:
        failures.append("heroPortraitPayloadDropsPortraitKeyOnlyEntry")
    if "static func with_preview_hero_asset_ref(" not in ui_component_factory_source:
        failures.append("previewHeroAssetRefFactoryMissing")
    preview_asset_ref_function = _extract_gdscript_function(ui_component_factory_source, "with_preview_hero_asset_ref")
    if preview_asset_ref_function == "":
        failures.append("previewHeroAssetRefFunctionMissing")
    else:
        if "hero_portrait_payload_from_entry(normalized)" not in preview_asset_ref_function:
            failures.append("previewHeroAssetRefPayloadDelegateMissing")
        for forbidden_marker in [
            'var raw_asset_ref: Variant = normalized.get("asset_ref", normalized.get("assetRef", {}))',
            '_first_non_empty_text(normalized, ["heroId", "hero_id"])',
            '_first_non_empty_text(normalized, ["portraitAssetKey", "portrait_asset_key"])',
            "hero_portrait_asset_ref(hero_id, portrait_asset_key)",
        ]:
            if forbidden_marker in preview_asset_ref_function:
                failures.append(f"previewHeroAssetRefLocalNormalizerStillPresent:{forbidden_marker}")
    if "static func apply_recruit_formal_pack_cover_stage(" not in ui_component_factory_source:
        failures.append("recruitCoverStageFactoryMissing")
    if "static func apply_recruit_formal_pack_cover_texture(" not in ui_component_factory_source:
        failures.append("recruitCoverTextureFactoryMissing")
    for required_marker in [
        "const CARD_RAIL_LAYOUT_TOKEN := \"card_rail_touch_horizontal_v1\"",
        "const CARD_RAIL_REPEAT_ACTION_GAP := 34",
        "static func apply_card_rail_scroll_container(",
        "static func general_skill_library_deck_visible_card_target(",
        "static func card_rail_min_height(",
        "static func card_rail_metrics(",
        "static func card_rail_repeat_action_gap(",
        "static func make_card_rail_repeat_action_gap_spacer(",
        "static func apply_card_rail_summary(",
        "static func apply_card_rail_geometry_summary(",
    ]:
        if required_marker not in ui_component_factory_source:
            failures.append(f"cardRailFactorySourceMissing:{required_marker}")
    if "UI_COMPONENT_FACTORY.apply_card_rail_scroll_container(scroll, card_width, card_height, card_gap, expected_count)" not in recruit_renderer_source:
        failures.append("recruitRendererDrawPreviewCardRailHelperMissing")
    if "UI_COMPONENT_FACTORY.apply_card_rail_scroll_container(scroll, card_width, card_height, _result_card_gap(), expected_count, initial_visible_target)" not in recruit_renderer_source:
        failures.append("recruitRendererDrawResultCardRailHelperMissing")
    if "center.custom_minimum_size = Vector2(0, UI_COMPONENT_FACTORY.card_rail_min_height(card_height))" not in recruit_renderer_source:
        failures.append("recruitRendererCardRailMinHeightMissing")
    if "UI_COMPONENT_FACTORY.make_card_rail_repeat_action_gap_spacer()" not in recruit_renderer_source:
        failures.append("recruitRendererRepeatActionGapSpacerMissing")
    if "func _apply_draw_card_rail_metrics(" not in recruit_panel_source:
        failures.append("recruitPanelDrawCardRailMetricsMissing")
    for required_marker in [
        "UI_COMPONENT_FACTORY.apply_card_rail_geometry_summary(summary, prefix,",
        '"%sRepeatActionSlotMode" % prefix',
    ]:
        if required_marker not in recruit_panel_source:
            failures.append(f"recruitPanelDrawCardRailMetricSourceMissing:{required_marker}")
    if "portrait_texture_from_ref" not in hero_card_source:
        failures.append("heroCardPortraitRefTexturePathMissing")
    if "HeroCardPortraitUnderlay" not in hero_card_source:
        failures.append("heroCardPortraitFullCardUnderlayMissing")
    if "full_card_skill_plate_v2" not in hero_card_source:
        failures.append("heroCardSkillPlateV2SourceMissing")
    if "HeroCardSkillAssetTexture" not in hero_card_source:
        failures.append("heroCardSkillAssetTextureSourceMissing")
    if "var is_skill_card := _is_skill_card(entry)" not in hero_card_source:
        failures.append("heroCardSkillBranchBeforeTextureMissing")
    if "if not is_skill_card:\n\t\tportrait_texture = _portrait_texture(entry)" not in hero_card_source:
        failures.append("heroCardSkillTextureBypassMissing")
    if "Control.SIZE_SHRINK_CENTER" not in hero_card_source:
        failures.append("heroCardAspectLockSourceMissing")
    for required_marker in [
        f'const LAYOUT_PRESET_FULL_CARD := "{HERO_CARD_FULL_LAYOUT_PRESET_ID}"',
        "static func full_card_config(",
        '"owner_slot_mode": "none" if mode == MODE_DRAW_RESULT else "owner_display_name"',
        "static func _roster_owner_slot_text(",
    ]:
        if required_marker not in hero_card_source:
            failures.append(f"heroCardFullLayoutSourceMissing:{required_marker}")
    for required_marker in [
        "HeroCardViewScript.full_card_config(HeroCardViewScript.MODE_DRAW_RESULT",
        "HeroCardViewScript.FULL_CARD_GAP",
    ]:
        if required_marker not in recruit_renderer_source:
            failures.append(f"recruitRendererFullCardPresetMissing:{required_marker}")
    for forbidden_marker in [
        "const RESULT_CARD_WIDTH :=",
        "const RESULT_CARD_HEIGHT :=",
        "const SINGLE_RESULT_CARD_WIDTH :=",
        "const SINGLE_RESULT_CARD_HEIGHT :=",
    ]:
        if forbidden_marker in recruit_renderer_source:
            failures.append(f"recruitRendererLocalHeroCardSizeStillPresent:{forbidden_marker}")
    if '"preview_kind": "skill"' not in recruit_renderer_source:
        failures.append("recruitRendererSkillPreviewKindMissing")
    for required_marker in [
        '"description": str(card.get("description", card.get("desc", ""))).strip_edges()',
        '"effect": str(card.get("effect", card.get("effectText", ""))).strip_edges()',
        '"meta": str(card.get("meta", "")).strip_edges()',
    ]:
        if required_marker not in recruit_renderer_source:
            failures.append(f"recruitRendererSkillDetailFieldPassthroughMissing:{required_marker}")
    if "HeroCardViewScript.full_card_config(HeroCardViewScript.MODE_DRAW_RESULT" not in draw_result_preview_source:
        failures.append("drawResultPreviewFullCardPresetMissing")
    for forbidden_marker in [
        "const FIVE_CARD_WIDTH :=",
        "const FIVE_CARD_HEIGHT :=",
        "const SINGLE_CARD_WIDTH :=",
        "const SINGLE_CARD_HEIGHT :=",
    ]:
        if forbidden_marker in draw_result_preview_source:
            failures.append(f"drawResultPreviewLocalHeroCardSizeStillPresent:{forbidden_marker}")
    if "UI_COMPONENT_FACTORY.apply_card_rail_scroll_container(scroll, card_width, card_height, int(_result_card_gap()), mini(5, _draw_results.size()))" not in draw_result_preview_source:
        failures.append("drawResultPreviewFiveCardRailHelperMissing")
    if "UI_COMPONENT_FACTORY.card_rail_content_width(card_width, int(_result_card_gap()), mini(5, _draw_results.size()))" not in draw_result_preview_source:
        failures.append("drawResultPreviewFiveCardRailContentWidthMissing")
    if "center.custom_minimum_size = Vector2(0, UI_COMPONENT_FACTORY.card_rail_min_height(_result_card_height()))" not in draw_result_preview_source:
        failures.append("drawResultPreviewCardRailMinHeightMissing")
    if "UI_COMPONENT_FACTORY.make_card_rail_repeat_action_gap_spacer()" not in draw_result_preview_source:
        failures.append("drawResultPreviewRepeatActionGapSpacerMissing")
    if "HeroCardViewScript.full_card_config(HeroCardViewScript.MODE_OWNED_ROSTER" not in GENERAL_ROSTER_LIST_RENDERER_SCRIPT_PATH.read_text(encoding="utf-8"):
        failures.append("generalRosterRendererFullCardPresetMissing")
    general_roster_source = GENERAL_ROSTER_LIST_RENDERER_SCRIPT_PATH.read_text(encoding="utf-8")
    for forbidden_marker in [
        "const ROSTER_CARD_WIDTH :=",
        "const ROSTER_CARD_HEIGHT :=",
    ]:
        if forbidden_marker in general_roster_source:
            failures.append(f"generalRosterLocalHeroCardSizeStillPresent:{forbidden_marker}")
    if '"owner": _production_owner_label(entry)' not in general_roster_source:
        failures.append("generalRosterOwnerLabelNotMapped")
    general_panel_source = GENERAL_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
    general_presenter_source = GENERAL_PRESENTER_SCRIPT_PATH.read_text(encoding="utf-8")
    if '"owner_display_name": owner_info.get("owner_display_name", "")' not in general_presenter_source:
        failures.append("generalPresenterOwnerDisplayNameReadModelMissing")
    if "func _build_roster_owner_info() -> Dictionary:" not in general_presenter_source:
        failures.append("generalPresenterOwnerInfoBuilderMissing")
    if "func _apply_active_hero_owner_summary(" not in general_panel_source:
        failures.append("generalPanelActiveHeroOwnerSummaryMissing")
    if '"activeHeroOwnerSource" = "shared_state.active_hero_profile.owner_display_name"' in general_panel_source:
        failures.append("generalPanelActiveHeroOwnerSourceAssignmentMalformed")
    if 'summary["activeHeroOwnerSource"] = "shared_state.active_hero_profile.owner_display_name"' not in general_panel_source:
        failures.append("generalPanelActiveHeroOwnerSourceMissing")
    if '"portrait_stage_fill_ratio"' not in ui_component_factory_source:
        failures.append("heroCardPortraitStageFillRatioTokenMissing")
    if "FormalPackAssetRegistryScript.portrait_texture(" in hero_card_source:
        failures.append("heroCardDirectStringPortraitTextureCallStillPresent")
    if "portrait_resolution_source" not in hero_card_source:
        failures.append("heroCardPortraitResolutionSourceMissing")
    if "UI_COMPONENT_FACTORY.hero_portrait_payload_from_entry(" not in hero_card_source:
        failures.append("heroCardPortraitPayloadFactoryMissing")
    if "if raw_asset_ref is Dictionary and not (raw_asset_ref as Dictionary).is_empty():" not in hero_card_source:
        failures.append("heroCardEmptyAssetRefBlocksPortraitKey")
    if "if raw_asset_ref is Dictionary and not (raw_asset_ref as Dictionary).is_empty():" not in ui_component_factory_source:
        failures.append("heroPortraitPayloadEmptyAssetRefBlocksPortraitKey")
    if 'entry["hero_id"] = str(_first_value(raw, ["heroId", "hero_id"], entry.get("template_id", "")))' in hero_card_source:
        failures.append("heroCardTemplateIdHeroIdFallbackStillPresent")
    for required_marker in [
        "static func _first_portrait_hero_id(",
        "static func _looks_like_portrait_hero_id(",
        'value == "hero_card"',
        'value.begins_with("recruit_draw_result_")',
    ]:
        if required_marker not in ui_component_factory_source:
            failures.append(f"heroPortraitGenericIdGuardMissing:{required_marker}")
    for forbidden_marker in [
        "var portrait_path :=",
        "var direct_path :=",
        "ResourceLoader.exists(portrait_path)",
        "load(portrait_path)",
    ]:
        if forbidden_marker in hero_card_source:
            failures.append(f"heroCardDirectPortraitPathFallbackStillPresent:{forbidden_marker}")
    if "static func portrait_texture(asset_key: String)" in formal_pack_asset_registry_source:
        failures.append("formalPackAssetRegistryStringPortraitTextureHelperStillPresent")
    if 'return {"portraitAssetKey": asset_key}' in formal_pack_asset_registry_source:
        failures.append("formalPackAssetRegistryStringPayloadStillPresent")
    if 'return portrait_texture_from_ref({"portraitAssetKey": asset_key})' in formal_pack_asset_registry_source:
        failures.append("formalPackAssetRegistryStringTextureBridgeStillPresent")
    if "static func portrait_texture_from_ref(asset_ref: Variant) -> Texture2D:" not in formal_pack_asset_registry_source:
        failures.append("formalPackAssetRegistryStructuredRefTextureMissing")
    if "if asset_ref is Dictionary and not (asset_ref as Dictionary).is_empty():" not in formal_pack_asset_registry_source:
        failures.append("formalPackAssetRegistryEmptyRefAccepted")
    for forbidden_marker in [
        'const PORTRAIT_MANIFEST_PATH :=',
        "static var _portrait_manifest_loaded",
        "static var _portrait_asset_paths",
        "static func _ensure_portrait_manifest_loaded()",
        '"formal_pack_portrait_manifest"',
    ]:
        if forbidden_marker in formal_pack_asset_registry_source:
            failures.append(f"formalPackAssetRegistryPortraitManifestFallbackStillPresent:{forbidden_marker}")
    for forbidden_marker in [
        "RESULT_NAME_PORTRAIT_KEYS",
        "RESULT_FALLBACK_PORTRAIT_KEYS",
        "RESULT_FALLBACK_HERO_PROFILES",
        '"displayStrategy": "portrait_frame_safe"',
        '"assetKind": "hero_portrait"',
        '"fit": "contained_safe"',
        '"stageAspect": "4:5"',
        '"safeMargin": "portrait_safe_margin_medium"',
    ]:
        if forbidden_marker in recruit_renderer_source:
            failures.append(f"recruitRendererPortraitMappingStillPresent:{forbidden_marker}")
    if '"asset_ref"' not in recruit_presenter_source or '"heroId"' not in recruit_presenter_source:
        failures.append("recruitPreviewHeroCardStructuredAssetRefMissing")
    if '"displayStrategy": "portrait_frame_safe"' in recruit_presenter_source:
        failures.append("recruitPresenterDisplayStrategyStillString")
    for forbidden_marker in [
        '"fit": "contained_safe"',
        '"stageAspect": "4:5"',
        '"safeMargin": "portrait_safe_margin_medium"',
    ]:
        if forbidden_marker in recruit_presenter_source:
            failures.append(f"recruitPresenterDisplayStrategyStillInline:{forbidden_marker}")
    if "UI_COMPONENT_FACTORY.hero_portrait_payload_from_entry({" not in recruit_presenter_source:
        failures.append("recruitPresenterAssetRefPayloadFactoryMissing")
    if "UI_COMPONENT_FACTORY.hero_portrait_asset_ref(" in recruit_presenter_source:
        failures.append("recruitPresenterLocalHeroPortraitAssetRefStillPresent")
    if "UI_COMPONENT_FACTORY.hero_portrait_payload_from_entry(card)" not in recruit_renderer_source:
        failures.append("recruitRendererAssetRefPayloadFactoryMissing")
    if "UI_COMPONENT_FACTORY.hero_portrait_asset_ref(" in recruit_renderer_source:
        failures.append("recruitRendererLocalHeroPortraitAssetRefStillPresent")
    for forbidden_marker in [
        'var hero_id := str(card.get("heroId", card.get("hero_id", ""))).strip_edges()',
        'var portrait_asset_key := str(card.get("portraitAssetKey", card.get("portrait_asset_key", ""))).strip_edges()',
    ]:
        if forbidden_marker in recruit_renderer_source:
            failures.append(f"recruitRendererLocalAssetRefNormalizerStillPresent:{forbidden_marker}")
    failures.extend(_validate_recruit_cover_visual_boundary_contract(
        "recruitRenderer",
        recruit_renderer_source,
    ))
    failures.extend(_validate_recruit_cover_visual_boundary_contract(
        "recruitPreview",
        recruit_preview_source,
    ))
    failures.extend(_validate_recruit_hero_card_preview_delegate_contract(
        recruit_renderer_source,
        recruit_preview_source,
        draw_result_preview_source,
    ))
    return failures


def _validate_skill_library_card_rail_source_contract() -> list[str]:
    failures: list[str] = []
    try:
        skill_library_renderer_source = GENERAL_PROFILE_SKILL_LIBRARY_RENDERER_SCRIPT_PATH.read_text(encoding="utf-8")
        general_panel_source = GENERAL_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
        general_presenter_source = GENERAL_PRESENTER_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"skillLibraryCardRailSourceReadFailed:{exc}"]
    full_deck_function = _extract_gdscript_function(skill_library_renderer_source, "_build_skill_library_full_deck")
    if full_deck_function == "":
        failures.append("skillLibraryFullDeckFunctionMissing")
    else:
        for required_marker in [
            "HeroCardViewScript.full_card_config(HeroCardViewScript.MODE_DRAW_RESULT)",
            "HeroCardViewScript.build_card(_skill_library_hero_card_entry(",
            "scroll.set_meta(\"skill_library_deck_card_scroll_anchor_mode\", \"fill_parent_left_content_v1\")",
            "scroll.set_meta(\"skill_library_deck_card_scroll_axis\", \"vertical_touch_scroll_v1\")",
            "grid.name = \"SkillLibraryDeckCardGrid\"",
            "grid.columns = UI_COMPONENT_FACTORY.general_skill_library_deck_visible_card_target(filtered_entries.size())",
            "grid.set_meta(\"skill_library_deck_card_grid_mode\", \"responsive_centered_skill_card_grid_v1\")",
            "grid.set_meta(\"skill_library_deck_card_rail_anchor_mode\", \"centered_visible_cards_responsive_v1\")",
        ]:
            if required_marker not in full_deck_function:
                failures.append(f"skillLibraryFullDeckCardRailSourceMissing:{required_marker}")
        if "make_general_skill_library_result_list_grid()" in full_deck_function:
            failures.append("skillLibraryFullDeckGridStillUsedForDefault")
        if "_build_skill_library_deck_card(" in full_deck_function:
            failures.append("skillLibraryFullDeckCustomCardStillUsedForDefault")
        if "library_skill_detail:%s" in full_deck_function:
            failures.append("skillLibraryFullDeckCardClickStillOpensPopup")
    for required_marker in [
        'row.name = "SkillLibraryControlBandSingleRow"',
        'const HeroCardViewScript := preload("res://scripts/ui/formal_pack/components/hero_card_view.gd")',
        "static func _skill_library_hero_card_entry(",
        '"preview_kind": "skill"',
        '"tone": "skill"',
        '"description": UI_COMPONENT_FACTORY.general_skill_library_deck_card_description_text(display)',
        '"effect": _skill_effect_line(display)',
        '"skill_detail": _skill_detail_read_model(display)',
        '"skill_level": display.get("skill_level", display.get("skillLevel", ""))',
        "static func _skill_detail_read_model(",
        '"skill_level": source.get("skill_level", source.get("skillLevel", skill.get("skill_level", skill.get("skillLevel", ""))))',
    ]:
        if required_marker not in skill_library_renderer_source:
            failures.append(f"skillLibraryHeroCardSourceMissing:{required_marker}")
    for required_marker in [
        "HERO_CARD_VIEW.append_smoke_summary(summary, HERO_CARD_VIEW.MODE_DRAW_RESULT, false, skill_library_card_count, true, skill_library_sample_entries, skill_library_card_config)",
        'UI_COMPONENT_FACTORY.apply_card_rail_summary(summary, "skillLibraryDeckCardRail", skill_library_initial_visible_target)',
        'UI_COMPONENT_FACTORY.apply_card_rail_geometry_summary(summary, "skillLibraryDeck", skill_library_card_width, skill_library_card_height, skill_library_card_gap, skill_library_card_count, skill_library_initial_visible_target)',
        'summary["skillLibraryDeckCardPreviewKind"] = "skill"',
        'summary["skillLibraryDeckCardVisualMode"] = HERO_CARD_VIEW.HERO_CARD_SKILL_PLATE_VISUAL_MODE',
        'summary["skillLibraryDeckCardFrontTextMode"] = str(summary.get("heroCardSkillCardFrontTextMode", ""))',
        'summary["skillLibraryDeckCardAssetRefSlotMode"] = str(summary.get("heroCardSkillCardAssetRefSlotMode", ""))',
        'summary["skillLibraryDeckCardEquipStatusMode"] = str(summary.get("heroCardSkillCardEquipStatusMode", ""))',
        'summary["skillLibraryDeckCardFrontLevelTextCount"] = int(summary.get("heroCardSkillCardFrontLevelTextCount", 0))',
        'summary["skillLibraryDeckCardEquipReadModelSource"] = str(summary.get("heroCardSkillCardEquipReadModelSource", ""))',
        'summary["skillLibraryDeckCardEquippedStatusTextCount"] = int(summary.get("heroCardSkillCardEquippedStatusTextCount", 0))',
        'summary["skillLibraryDeckCardEquippedLevelTextCount"] = int(summary.get("heroCardSkillCardEquippedLevelTextCount", 0))',
        'summary["skillLibraryDeckCardUnequippedLevelTextCount"] = int(summary.get("heroCardSkillCardUnequippedLevelTextCount", 0))',
        'summary["skillLibraryDeckCardDetailTextVisible"] = bool(summary.get("heroCardSkillCardDetailTextVisible", false))',
        'summary["skillLibrarySearchResultReadModelSource"] = "skill_detail/read_model"',
        'summary["skillLibraryDeckCardAuthorityReadModelSource"]',
        'summary["skillLibraryDeckCardAuthorityStaticLevelFallbackAllowed"]',
        'summary["skillLibraryDeckCardAuthorityEquippedSkillLevelCount"]',
        'summary["skillLibraryDeckCardAuthorityMissingLevelCount"]',
        'summary["skillLibraryDeckCardAuthorityInvalidLevelCount"]',
    ]:
        if required_marker not in general_panel_source:
            failures.append(f"skillLibraryCardRailSummarySourceMissing:{required_marker}")
    for required_marker in [
        "func _apply_tactical_skill_slot_read_model(",
        "tacticalSkillSlotsByHeroId",
        "equippedSkillLevelsById",
        "skill_level_authority_source",
        "generalStateByFaction.tacticalSkillSlotsByHeroId/equippedSkillLevelsById",
    ]:
        if required_marker not in general_presenter_source:
            failures.append(f"skillLibraryAuthorityReadModelSourceMissing:{required_marker}")
    hero_card_source = HERO_CARD_VIEW_SCRIPT_PATH.read_text(encoding="utf-8")
    for required_marker in [
        "HeroCardSkillAssetTexture",
        "hero_card_skill_front_asset_ref_status_only_v1",
        "skill_detail_asset_ref_png_v1",
        "single_bottom_status_read_model_v1",
        "static func _skill_card_detail_text(",
        "HeroCardSkillFrontFace",
        "HeroCardSkillBackFace",
        "static func _toggle_skill_card_face(",
        "static func _skill_detail_read_model(",
        "controller_display_name/equipped_hero_name/skill_level",
        "skill_type_left_controller_level_right_v1",
        "heroCardSkillCardUnequippedLevelTextCount",
    ]:
        if required_marker not in hero_card_source:
            failures.append(f"heroCardSkillDetailSourceMissing:{required_marker}")
    for forbidden_marker in [
        "HeroCardSkillDetailText",
        "HeroCardSkillMetaText",
        "HeroCardSkillFrontGradeText",
        "HeroCardSkillCenterText",
    ]:
        if forbidden_marker in hero_card_source:
            failures.append(f"heroCardSkillFrontFaceStillShowsBodyCopy:{forbidden_marker}")
    for required_marker in [
        "static func _skill_library_display_entry(",
        'display["skill_detail"] = detail.duplicate(true)',
        'display["read_model"] = detail.duplicate(true)',
        "var display := _skill_library_display_entry(skill)",
        '"skill_detail": _skill_detail_read_model(display)',
    ]:
        if required_marker not in skill_library_renderer_source:
            failures.append(f"skillLibrarySearchResultReadModelSourceMissing:{required_marker}")
    content_renderer_source = GENERAL_PROFILE_CONTENT_RENDERER_SCRIPT_PATH.read_text(encoding="utf-8")
    for required_marker in [
        "static func skill_popup_read_model_entry(",
        'return "skill_detail/read_model"',
        "var popup_skill := skill_popup_read_model_entry(skill)",
        '"skill_level"',
        '"skillLevel"',
    ]:
        if required_marker not in content_renderer_source:
            failures.append(f"skillPopupReadModelContractMissing:{required_marker}")
    if "ScrollContainer.new()" in _extract_gdscript_function(content_renderer_source, "_build_skill_popup_content"):
        failures.append("skillPopupStillUsesScrollContainer")
    return failures


def _validate_recruit_cover_visual_boundary_contract(label: str, source: str) -> list[str]:
    failures: list[str] = []
    cover_source = _extract_gdscript_function(source, "_build_cover_visual")
    if cover_source == "":
        return [f"{label}CoverVisualFunctionMissing"]
    if "cover_asset_key" not in cover_source:
        failures.append(f"{label}CoverAssetKeyMissing")
    if "UI_COMPONENT_FACTORY.apply_recruit_formal_pack_cover_stage(root)" not in cover_source:
        failures.append(f"{label}CoverStageFactoryMissing")
    if "UI_COMPONENT_FACTORY.apply_recruit_formal_pack_cover_texture(image)" not in cover_source:
        failures.append(f"{label}CoverTextureFactoryMissing")
    if "STRETCH_KEEP_ASPECT_COVERED" in source:
        failures.append(f"{label}CoveredStretchStillPageLocal")
    if "clip_contents = true" in source:
        failures.append(f"{label}ClipStillPageLocal")
    for forbidden_marker in [
        "portraitAssetKey",
        "portrait_asset_key",
        "hero_portrait",
        "asset_ref",
        "assetRef",
        "HeroCardViewScript",
        "portrait_texture",
        "apply_portrait_frame_texture",
    ]:
        if forbidden_marker in cover_source:
            failures.append(f"{label}CoverVisualCarriesPortraitLogic:{forbidden_marker}")
    return failures


def _validate_recruit_hero_card_preview_delegate_contract(
    recruit_renderer_source: str,
    recruit_preview_source: str,
    draw_result_preview_source: str,
) -> list[str]:
    failures: list[str] = []
    if "HeroCardViewScript.build_card(entry, HeroCardViewScript.MODE_DRAW_RESULT" not in recruit_renderer_source:
        failures.append("recruitRendererDrawResultHeroCardDelegateMissing")
    if "HeroCardViewScript.build_card(UI_COMPONENT_FACTORY.with_preview_hero_asset_ref(candidate), HeroCardViewScript.MODE_POOL_PREVIEW" not in recruit_preview_source:
        failures.append("recruitPreviewPoolHeroCardAssetRefDelegateMissing")
    if "HeroCardViewScript.build_card(UI_COMPONENT_FACTORY.with_preview_hero_asset_ref(entry), HeroCardViewScript.MODE_DRAW_RESULT" not in draw_result_preview_source:
        failures.append("drawResultPreviewHeroCardAssetRefDelegateMissing")
    for label, source in [
        ("recruitPreview", recruit_preview_source),
        ("drawResultPreview", draw_result_preview_source),
    ]:
        if "func _with_preview_asset_ref(entry: Dictionary) -> Dictionary:" in source:
            failures.append(f"{label}LocalAssetRefNormalizerStillPresent")
        if "UI_COMPONENT_FACTORY.hero_portrait_asset_ref(" in source:
            failures.append(f"{label}LocalAssetRefFactoryStillPresent")
        if "UI_COMPONENT_FACTORY.with_preview_hero_asset_ref(" not in source:
            failures.append(f"{label}PreviewAssetRefFactoryDelegateMissing")
    if "STRETCH_KEEP_ASPECT_COVERED" in draw_result_preview_source:
        failures.append("drawResultPreviewCoveredStretchStillPresent")
    for label, source in [
        ("recruitRenderer", recruit_renderer_source),
        ("recruitPreview", recruit_preview_source),
        ("drawResultPreview", draw_result_preview_source),
    ]:
        for forbidden_marker in [
            '"assetKind": "hero_portrait"',
            '"fit": "contained_safe"',
            '"stageAspect": "4:5"',
            '"safeMargin": "portrait_safe_margin_medium"',
        ]:
            if forbidden_marker in source:
                failures.append(f"{label}InlinePortraitFrameStrategyStillPresent:{forbidden_marker}")
    return failures


def _validate_general_portrait_source_contract() -> list[str]:
    failures: list[str] = []
    try:
        general_panel_source = GENERAL_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
        general_presenter_source = GENERAL_PRESENTER_SCRIPT_PATH.read_text(encoding="utf-8")
        general_profile_stage_source = GENERAL_PROFILE_STAGE_RENDERER_SCRIPT_PATH.read_text(encoding="utf-8")
        general_profile_content_source = GENERAL_PROFILE_CONTENT_RENDERER_SCRIPT_PATH.read_text(encoding="utf-8")
        general_profile_growth_source = GENERAL_PROFILE_GROWTH_RENDERER_SCRIPT_PATH.read_text(encoding="utf-8")
        general_roster_renderer_source = GENERAL_ROSTER_LIST_RENDERER_SCRIPT_PATH.read_text(encoding="utf-8")
        general_roster_preview_source = GENERAL_ROSTER_FORMAL_PACK_PREVIEW_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"generalPortraitSourceReadFailed:{exc}"]
    if "PORTRAIT_ASSET_REGISTRY.portrait_texture" not in general_panel_source:
        failures.append("generalPanelPortraitRegistryTextureMissing")
    if "UI_COMPONENT_FACTORY.hero_portrait_payload_from_entry(" not in general_panel_source:
        failures.append("generalPanelPortraitPayloadFactoryMissing")
    for forbidden_marker in [
        'entry.get("portrait_path"',
        "var raw_asset_ref: Variant =",
        "ResourceLoader.exists(resolved)",
        "Image.new()",
        "image.load(load_path)",
    ]:
        if forbidden_marker in general_panel_source:
            failures.append(f"generalPanelDirectPortraitPathFallbackStillPresent:{forbidden_marker}")
    if '"asset_ref"' not in general_presenter_source or '"portraitAssetKey"' not in general_presenter_source:
        failures.append("generalPresenterStructuredAssetRefMissing")
    if "UI_COMPONENT_FACTORY.hero_portrait_payload_from_entry({" not in general_presenter_source:
        failures.append("generalPresenterAssetRefPayloadFactoryMissing")
    if "UI_COMPONENT_FACTORY.hero_portrait_asset_ref(" in general_presenter_source:
        failures.append("generalPresenterLocalHeroPortraitAssetRefStillPresent")
    if "UI_COMPONENT_FACTORY.hero_portrait_payload_from_entry(entry)" not in general_roster_renderer_source:
        failures.append("generalRosterAssetRefPayloadFactoryMissing")
    if "UI_COMPONENT_FACTORY.hero_portrait_asset_ref(" in general_roster_renderer_source:
        failures.append("generalRosterLocalHeroPortraitAssetRefStillPresent")
    for forbidden_marker in [
        'var raw_ref: Variant = entry.get("asset_ref", entry.get("assetRef", {}))',
        'var hero_id := str(entry.get("id", entry.get("heroId", entry.get("hero_id", "")))).strip_edges()',
        'var asset_key := str(entry.get("portraitAssetKey", entry.get("portrait_asset_key", entry.get("asset_key", "")))).strip_edges()',
    ]:
        if forbidden_marker in general_roster_renderer_source:
            failures.append(f"generalRosterRendererLocalAssetRefNormalizerStillPresent:{forbidden_marker}")
    profile_stage_function = _extract_gdscript_function(general_profile_stage_source, "build_profile_hero_stage")
    if profile_stage_function == "":
        failures.append("generalProfileStageBuildFunctionMissing")
    else:
        if "UI_COMPONENT_FACTORY.apply_portrait_frame_stage(stage)" not in profile_stage_function:
            failures.append("generalProfileStagePortraitFrameStageFactoryMissing")
        if "stage.clip_contents = true" in profile_stage_function:
            failures.append("generalProfileStagePortraitStageClipStillEnabled")
    if "HeroCardViewScript.build_card(UI_COMPONENT_FACTORY.with_preview_hero_asset_ref(entry), HeroCardViewScript.MODE_OWNED_ROSTER" not in general_roster_preview_source:
        failures.append("generalRosterPreviewHeroCardAssetRefDelegateMissing")
    if "func _with_preview_asset_ref(entry: Dictionary) -> Dictionary:" in general_roster_preview_source:
        failures.append("generalRosterPreviewLocalAssetRefNormalizerStillPresent")
    if "UI_COMPONENT_FACTORY.hero_portrait_asset_ref(" in general_roster_preview_source:
        failures.append("generalRosterPreviewLocalAssetRefFactoryStillPresent")
    if "UI_COMPONENT_FACTORY.with_preview_hero_asset_ref(" not in general_roster_preview_source:
        failures.append("generalRosterPreviewAssetRefFactoryDelegateMissing")
    for source_label, source in [
        ("generalPresenter", general_presenter_source),
        ("generalRosterRenderer", general_roster_renderer_source),
        ("generalRosterPreview", general_roster_preview_source),
    ]:
        for forbidden_marker in [
            '"assetKind": "hero_portrait"',
            '"fit": "contained_safe"',
            '"stageAspect": "4:5"',
            '"safeMargin": "portrait_safe_margin_medium"',
        ]:
            if forbidden_marker in source:
                failures.append(f"{source_label}DisplayStrategyStillInline:{forbidden_marker}")
    if "PORTRAIT_ASSET_REGISTRY.portrait_texture" not in general_profile_stage_source:
        failures.append("generalProfileStagePortraitRegistryTextureMissing")
    if "UI_COMPONENT_FACTORY.apply_portrait_frame_texture(image)" not in general_profile_stage_source:
        failures.append("generalProfileStagePortraitFactoryTextureMissing")
    if "UI_COMPONENT_FACTORY.hero_portrait_payload_from_entry(" not in general_profile_stage_source:
        failures.append("generalProfileStagePortraitPayloadFactoryMissing")
    for forbidden_marker in [
        'entry.get("portrait_path"',
        "var raw_asset_ref: Variant =",
        "ResourceLoader.exists(resolved)",
        "Image.new()",
        "image.load(load_path)",
    ]:
        if forbidden_marker in general_profile_stage_source:
            failures.append(f"generalProfileStageDirectPortraitPathFallbackStillPresent:{forbidden_marker}")
    failures.extend(_validate_non_portrait_general_image_loader_contract(
        "generalProfileContent",
        general_profile_content_source,
        required_loader_marker="static func _load_texture(path: String) -> Texture2D:",
        required_image_marker="image.load(load_path)",
    ))
    failures.extend(_validate_non_portrait_general_image_loader_contract(
        "generalProfileGrowth",
        general_profile_growth_source,
        required_loader_marker="static func _load_texture(path: String) -> Texture2D:",
        required_image_marker="image.load(load_path)",
    ))
    growth_troop_illustration_source = _extract_gdscript_function(general_profile_growth_source, "_troop_illustration_box")
    if growth_troop_illustration_source == "":
        failures.append("generalProfileGrowthTroopIllustrationFunctionMissing")
    else:
        if "UI_COMPONENT_FACTORY.apply_general_growth_troop_illustration_frame(panel)" not in growth_troop_illustration_source:
            failures.append("generalProfileGrowthTroopIllustrationFrameFactoryMissing")
        if "panel.clip_contents = true" in growth_troop_illustration_source:
            failures.append("generalProfileGrowthTroopIllustrationLocalClipStillEnabled")
    return failures


def _validate_non_portrait_general_image_loader_contract(
    label: str,
    source: str,
    *,
    required_loader_marker: str,
    required_image_marker: str,
) -> list[str]:
    failures: list[str] = []
    if required_loader_marker not in source:
        failures.append(f"{label}OrdinaryImageLoaderMissing")
    if required_image_marker not in source:
        failures.append(f"{label}OrdinaryImageLoadMarkerMissing")
    for forbidden_marker in [
        "portraitAssetKey",
        "portrait_asset_key",
        "hero_portrait",
        "PORTRAIT_ASSET_REGISTRY",
        "hero_portrait_asset_ref",
        "hero_portrait_payload_from_entry",
        "apply_portrait_frame_texture",
        "apply_portrait_frame_stage",
    ]:
        if forbidden_marker in source:
            failures.append(f"{label}OrdinaryImageLoaderCarriesPortraitLogic:{forbidden_marker}")
    return failures


def _validate_battle_report_portrait_source_contract() -> list[str]:
    failures: list[str] = []
    try:
        list_page_source = BATTLE_REPORT_LIST_PAGE_SCRIPT_PATH.read_text(encoding="utf-8")
        detail_page_source = BATTLE_REPORT_DETAIL_PAGE_SCRIPT_PATH.read_text(encoding="utf-8")
        registry_source = BATTLE_REPORT_PORTRAIT_REGISTRY_SCRIPT_PATH.read_text(encoding="utf-8")
        presenter_source = BATTLE_REPORT_PRESENTER_SCRIPT_PATH.read_text(encoding="utf-8")
        ui_component_factory_source = UI_COMPONENT_FACTORY_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"battleReportPortraitSourceReadFailed:{exc}"]
    if "static func battle_report_portrait_asset_ref(" not in ui_component_factory_source:
        failures.append("battleReportPortraitAssetRefFactoryMissing")
    if "UI_COMPONENT_FACTORY.battle_report_portrait_asset_ref(" not in presenter_source:
        failures.append("battleReportPresenterPortraitAssetRefFactoryMissing")
    if '"asset_ref":' not in presenter_source:
        failures.append("battleReportPresenterStructuredAssetRefMissing")
    if "if raw_asset_ref is Dictionary and not (raw_asset_ref as Dictionary).is_empty():" not in presenter_source:
        failures.append("battleReportPresenterEmptyAssetRefBlocksPortraitKey")
    for forbidden_marker in [
        '"assetKind": "hero"',
        '"assetKind": "npc_guard"',
    ]:
        if forbidden_marker in presenter_source:
            failures.append(f"battleReportPresenterInlineAssetKindStillPresent:{forbidden_marker}")
    if "_portrait_payload(slot_payload)" not in registry_source:
        failures.append("battleReportPortraitRegistryAssetRefUnwrapMissing")
    if 'slot_payload.get("asset_ref"' not in registry_source:
        failures.append("battleReportPortraitRegistryAssetRefLookupMissing")
    if "if raw_asset_ref is Dictionary and not (raw_asset_ref as Dictionary).is_empty():" not in registry_source:
        failures.append("battleReportPortraitRegistryEmptyAssetRefAccepted")
    if "return slot_payload" in registry_source:
        failures.append("battleReportPortraitRegistryTopLevelPayloadFallbackStillPresent")
    if "return {}" not in registry_source:
        failures.append("battleReportPortraitRegistryMissingEmptyFallback")
    if "PortraitAssetRegistryScript.portrait_texture(_portrait_payload(slot_payload))" not in registry_source:
        failures.append("battleReportPortraitRegistryCommonTextureDelegateMissing")
    if "PortraitAssetRegistryScript.portrait_res_path(_portrait_payload(slot_payload))" not in registry_source:
        failures.append("battleReportPortraitRegistryCommonPathDelegateMissing")
    for label, source in [
        ("list", list_page_source),
        ("detail", detail_page_source),
    ]:
        if "BattleReportPortraitRegistryScript.portrait_texture" not in source:
            failures.append(f"battleReport{label.title()}PortraitRegistryTextureMissing")
        if "apply_portrait_frame_stage" not in source:
            failures.append(f"battleReport{label.title()}PortraitFrameStageMissing")
    if "apply_portrait_frame_texture(image)" not in list_page_source:
        failures.append("battleReportListPortraitFrameTextureMissing")
    if "STRETCH_KEEP_ASPECT_COVERED" in list_page_source:
        failures.append("battleReportListPortraitCoveredStretchStillPresent")
    if "apply_battle_report_detail_portrait_frame_stage(stack)" not in detail_page_source:
        failures.append("battleReportDetailPortraitFrameStageMissing")
    if "apply_battle_report_detail_portrait_frame_texture(image)" not in detail_page_source:
        failures.append("battleReportDetailPortraitFrameTextureMissing")
    list_hero_slot_source = _extract_gdscript_function(list_page_source, "_build_compact_hero_slot")
    if list_hero_slot_source == "":
        failures.append("battleReportListHeroSlotFunctionMissing")
    else:
        if "BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_portrait_frame_stage(panel)" not in list_hero_slot_source:
            failures.append("battleReportListHeroSlotPortraitFrameStageFactoryMissing")
        if "panel.clip_contents = true" in list_hero_slot_source:
            failures.append("battleReportListHeroSlotClipStillEnabled")
    list_team_cluster_source = _extract_gdscript_function(list_page_source, "_build_team_cluster")
    if list_team_cluster_source == "":
        failures.append("battleReportListTeamClusterFunctionMissing")
    else:
        if "BATTLE_REPORT_UI_COMPONENT_FACTORY.apply_battle_report_list_team_cluster_frame(panel)" not in list_team_cluster_source:
            failures.append("battleReportListTeamClusterFrameFactoryMissing")
        if "panel.clip_contents = true" in list_team_cluster_source:
            failures.append("battleReportListTeamClusterClipStillEnabled")
    return failures


def _validate_troop_formation_read_model_portrait_contract() -> list[str]:
    failures: list[str] = []
    try:
        read_model = json.loads(MAIN_CITY_TROOP_FORMATION_READ_MODEL_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"troopFormationReadModelReadFailed:{exc}"]
    if read_model.get("asset_ref_mode") != "structured_asset_ref_v1":
        failures.append("troopFormationAssetRefMode!=structured_asset_ref_v1")
    if read_model.get("portrait_asset_source") != PORTRAIT_FRAME_SAFE_ASSET_SOURCE:
        failures.append(f"troopFormationReadModelPortraitAssetSource!={PORTRAIT_FRAME_SAFE_ASSET_SOURCE}")
    if read_model.get("roster_portrait_scale_mode") != PORTRAIT_FRAME_SAFE_FIT_MODE:
        failures.append(f"troopFormationReadModelRosterPortraitScaleMode!={PORTRAIT_FRAME_SAFE_FIT_MODE}")
    teams = read_model.get("teams", [])
    if not isinstance(teams, list) or len(teams) < 5:
        failures.append("troopFormationReadModelTeamCount<5")
        teams = []
    direct_path_fields = {"path", "resPath", "projectPath", "portraitPath", "portrait_path"}
    for team_index, team in enumerate(teams):
        if not isinstance(team, dict):
            failures.append(f"troopFormationTeam{team_index}NotDictionary")
            continue
        slots = team.get("slots", [])
        if not isinstance(slots, list) or len(slots) != 3:
            failures.append(f"troopFormationTeam{team_index}SlotCount!=3")
            continue
        for slot_index, slot in enumerate(slots):
            if not isinstance(slot, dict):
                failures.append(f"troopFormationTeam{team_index}Slot{slot_index}NotDictionary")
                continue
            asset_ref = slot.get("asset_ref", slot.get("assetRef", {}))
            if not isinstance(asset_ref, dict):
                failures.append(f"troopFormationTeam{team_index}Slot{slot_index}AssetRefMissing")
                continue
            asset_kind = str(asset_ref.get("assetKind", asset_ref.get("asset_kind", ""))).strip()
            if asset_kind != "hero_portrait":
                failures.append(f"troopFormationTeam{team_index}Slot{slot_index}AssetKind!=hero_portrait")
            portrait_key = str(asset_ref.get("portraitAssetKey", asset_ref.get("portrait_asset_key", ""))).strip()
            if portrait_key == "":
                failures.append(f"troopFormationTeam{team_index}Slot{slot_index}PortraitAssetKeyMissing")
            slot_portrait_key = str(slot.get("portrait_asset_key", slot.get("portraitAssetKey", ""))).strip()
            if slot_portrait_key != "" and portrait_key != slot_portrait_key:
                failures.append(f"troopFormationTeam{team_index}Slot{slot_index}PortraitAssetKeyMismatch")
            display_strategy = asset_ref.get("displayStrategy", asset_ref.get("display_strategy", {}))
            if not isinstance(display_strategy, dict):
                failures.append(f"troopFormationTeam{team_index}Slot{slot_index}DisplayStrategyMissing")
                display_strategy = {}
            if display_strategy.get("fit") != PORTRAIT_FRAME_SAFE_FIT_MODE:
                failures.append(f"troopFormationTeam{team_index}Slot{slot_index}DisplayFit!={PORTRAIT_FRAME_SAFE_FIT_MODE}")
            if display_strategy.get("stageAspect") != "4:5":
                failures.append(f"troopFormationTeam{team_index}Slot{slot_index}StageAspect!=4:5")
            if display_strategy.get("safeMargin") != "portrait_safe_margin_medium":
                failures.append(f"troopFormationTeam{team_index}Slot{slot_index}SafeMargin!=portrait_safe_margin_medium")
            if display_strategy.get("assetSource") != PORTRAIT_FRAME_SAFE_ASSET_SOURCE:
                failures.append(f"troopFormationTeam{team_index}Slot{slot_index}AssetSource!={PORTRAIT_FRAME_SAFE_ASSET_SOURCE}")
            for direct_path_field in direct_path_fields:
                direct_path_value = str(asset_ref.get(direct_path_field, "")).strip()
                if direct_path_value != "":
                    failures.append(f"troopFormationTeam{team_index}Slot{slot_index}DirectPathFieldStillPresent:{direct_path_field}")
    return failures


def _validate_troop_panel_touch_scroll_source_contract() -> list[str]:
    failures: list[str] = []
    try:
        source = TROOP_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"troopPanelSourceReadFailed:{exc}"]
    ensure_body_scroll = _extract_gdscript_function(source, "_ensure_body_scroll")
    if ensure_body_scroll == "":
        failures.append("troopPanelEnsureBodyScrollFunctionMissing")
        return failures
    if 'scroll.name = "BodyScroll"' not in ensure_body_scroll:
        failures.append("troopPanelBodyScrollNameMissing")
    if "UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(scroll)" not in ensure_body_scroll:
        failures.append("troopPanelBodyScrollTouchChromeFactoryMissing")
    if "ScrollContainer.SCROLL_MODE_AUTO" in ensure_body_scroll:
        failures.append("troopPanelBodyScrollAutoScrollbarStillPresent")
    return failures


def _validate_main_city_troop_card_rail_source_contract() -> list[str]:
    failures: list[str] = []
    try:
        source = MAIN_CITY_HUB_OVERLAY_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"mainCityHubOverlaySourceReadFailed:{exc}"]
    team_pool_source = _extract_gdscript_function(source, "_build_troop_team_pool_strip")
    if team_pool_source == "":
        failures.append("mainCityTroopTeamCardPoolFunctionMissing")
        return failures
    if "UI_COMPONENT_FACTORY.apply_card_rail_scroll_container(scroll," not in team_pool_source:
        failures.append("mainCityTroopTeamCardPoolCardRailHelperMissing")
    if "UI_COMPONENT_FACTORY.card_rail_metrics(" not in team_pool_source:
        failures.append("mainCityTroopTeamCardPoolCardRailMetricsHelperMissing")
    if '"content_width"' not in team_pool_source:
        failures.append("mainCityTroopTeamCardPoolContentWidthFromMetricsMissing")
    if "UI_COMPONENT_FACTORY.apply_card_rail_geometry_summary(summary, \"troopFormation\"" not in source:
        failures.append("mainCityTroopTeamCardPoolGeometrySummaryMissing")
    if "ScrollContainer.SCROLL_MODE_AUTO" in team_pool_source:
        failures.append("mainCityTroopTeamCardPoolAutoScrollbarStillPresent")
    try:
        app_source = MAIN_APP_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return failures + [f"mainAppSourceReadFailed:{exc}"]
    assign_preview_source = _extract_gdscript_function(app_source, "_press_mainline_visual_smoke_main_city_troop_assign_preview")
    for key in (
        "troopFormationInitialVisibleCardTarget",
        "troopFormationCardRailLayoutToken",
        "troopFormationCardRailScrollMode",
        "troopFormationCardRailScrollbarVisibility",
        "troopFormationCardRailInputMode",
        "troopFormationCardRailViewportWidth",
        "troopFormationCardRailViewportHeight",
        "troopFormationCardRailContentWidth",
        "troopFormationCardRailCardWidth",
        "troopFormationCardRailCardHeight",
        "troopFormationCardRailGap",
        "troopFormationCardRailMinHeight",
        "troopFormationCardRailTotalCount",
    ):
        if key not in assign_preview_source:
            failures.append(f"mainCityTroopAssignPreviewSummaryMissing:{key}")
    return failures


def _validate_portrait_frame_contract(page_summary: dict[str, Any], prefix: str, expected_variant: str) -> list[str]:
    failures: list[str] = []
    if page_summary.get(f"{prefix}PortraitFrameVariant") != expected_variant:
        failures.append(f"{prefix}PortraitFrameVariant!={expected_variant}")
    if page_summary.get(f"{prefix}PortraitFitMode") != PORTRAIT_FRAME_SAFE_FIT_MODE:
        failures.append(f"{prefix}PortraitFitMode!={PORTRAIT_FRAME_SAFE_FIT_MODE}")
    if page_summary.get(f"{prefix}PortraitAssetSource") != PORTRAIT_FRAME_SAFE_ASSET_SOURCE:
        failures.append(f"{prefix}PortraitAssetSource!={PORTRAIT_FRAME_SAFE_ASSET_SOURCE}")
    if page_summary.get(f"{prefix}PortraitStageAspect") != PORTRAIT_FRAME_SAFE_STAGE_ASPECT:
        failures.append(f"{prefix}PortraitStageAspect!={PORTRAIT_FRAME_SAFE_STAGE_ASPECT}")
    if page_summary.get(f"{prefix}PortraitClipEnabled") is not False:
        failures.append(f"{prefix}PortraitClipEnabled!=false")
    if page_summary.get(f"{prefix}PortraitSafeMargin") != PORTRAIT_FRAME_SAFE_MARGIN:
        failures.append(f"{prefix}PortraitSafeMargin!={PORTRAIT_FRAME_SAFE_MARGIN}")
    if page_summary.get(f"{prefix}PortraitRegistryId") != PORTRAIT_FRAME_REGISTRY_ID:
        failures.append(f"{prefix}PortraitRegistryId!={PORTRAIT_FRAME_REGISTRY_ID}")
    return failures


def _validate_portrait_display_strategy_centralized_source_contract() -> list[str]:
    failures: list[str] = []
    ui_root = REPO_ROOT / "godot-client" / "scripts" / "ui"
    if not ui_root.exists():
        return ["portraitDisplayStrategyUiRootMissing"]
    strategy_markers = ("displayStrategy", "display_strategy")
    factory_source = SLG_UI_COMPONENT_FACTORY_SCRIPT_PATH.read_text(encoding="utf-8")
    if "static func portrait_frame_display_strategy()" not in factory_source:
        failures.append("portraitFrameDisplayStrategyFactoryMissing")
    if 'const PORTRAIT_FRAME_FIT_CONTAINED_SAFE := "contained_safe"' not in factory_source:
        failures.append("portraitFrameDisplayStrategyFactoryFitConstMissing")
    if 'const PORTRAIT_FRAME_STAGE_ASPECT_CARD := "4:5"' not in factory_source:
        failures.append("portraitFrameDisplayStrategyFactoryStageAspectConstMissing")
    if 'const PORTRAIT_FRAME_SAFE_MARGIN_MEDIUM := "portrait_safe_margin_medium"' not in factory_source:
        failures.append("portraitFrameDisplayStrategyFactorySafeMarginConstMissing")
    if 'const PORTRAIT_FRAME_ASSET_LOCKED_OR_DISPLAY_PREVIEW := "locked_preview_or_display_preview"' not in factory_source:
        failures.append("portraitFrameDisplayStrategyFactoryAssetSourceConstMissing")
    if '"fit": PORTRAIT_FRAME_FIT_CONTAINED_SAFE' not in factory_source:
        failures.append("portraitFrameDisplayStrategyFactoryFitMissing")
    if '"stageAspect": PORTRAIT_FRAME_STAGE_ASPECT_CARD' not in factory_source:
        failures.append("portraitFrameDisplayStrategyFactoryStageAspectMissing")
    if '"safeMargin": PORTRAIT_FRAME_SAFE_MARGIN_MEDIUM' not in factory_source:
        failures.append("portraitFrameDisplayStrategyFactorySafeMarginMissing")
    if '"assetSource": PORTRAIT_FRAME_ASSET_LOCKED_OR_DISPLAY_PREVIEW' not in factory_source:
        failures.append("portraitFrameDisplayStrategyFactoryAssetSourceMissing")
    for script_path in sorted(ui_root.rglob("*.gd")):
        if script_path.name in PORTRAIT_DISPLAY_STRATEGY_SOURCE_ALLOWLIST:
            continue
        source = script_path.read_text(encoding="utf-8", errors="ignore")
        for marker in strategy_markers:
            if marker in source:
                relative_path = script_path.relative_to(REPO_ROOT).as_posix()
                failures.append(f"portraitDisplayStrategyOutsideFactory:{relative_path}:{marker}")
    return failures


def _validate_hero_portrait_asset_ref_source_contract() -> list[str]:
    failures: list[str] = []
    ui_root = REPO_ROOT / "godot-client" / "scripts" / "ui"
    if not ui_root.exists():
        return ["portraitHeroAssetRefUiRootMissing"]
    direct_asset_ref_markers = (
        "hero_portrait_asset_ref(",
    )
    direct_path_markers = (
        'asset_ref.get("path"',
        'asset_ref.get("resPath"',
        'asset_ref.get("res_path"',
        'asset_ref.get("portraitPath"',
        'asset_ref.get("portrait_path"',
        'assetRef.get("path"',
        'assetRef.get("resPath"',
        'assetRef.get("res_path"',
        'assetRef.get("portraitPath"',
        'assetRef.get("portrait_path"',
    )
    for script_path in sorted(ui_root.rglob("*.gd")):
        source = script_path.read_text(encoding="utf-8", errors="ignore")
        relative_path = script_path.relative_to(REPO_ROOT).as_posix()
        if script_path.name not in PORTRAIT_HERO_ASSET_REF_SOURCE_ALLOWLIST:
            for marker in direct_asset_ref_markers:
                if marker in source:
                    failures.append(f"portraitHeroAssetRefDirectCallOutsideFactory:{relative_path}:{marker}")
        if script_path.name not in PORTRAIT_ASSET_REF_PATH_FALLBACK_SOURCE_ALLOWLIST:
            for marker in direct_path_markers:
                if marker in source:
                    failures.append(f"portraitAssetRefPathFallbackOutsideAllowlist:{relative_path}:{marker}")
    return failures


def _validate_portrait_asset_registry_direct_path_contract() -> list[str]:
    failures: list[str] = []
    try:
        source = PORTRAIT_ASSET_REGISTRY_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"portraitAssetRegistrySourceReadFailed:{exc}"]
    if "static func _allows_direct_res_path(slot_payload: Dictionary) -> bool:" not in source:
        failures.append("portraitAssetRegistryDirectPathGuardHelperMissing")
    if "if _allows_direct_res_path(slot_payload):\n\t\treturn _resolve_direct_res_path(slot_payload)" not in source:
        failures.append("portraitAssetRegistryDirectPathGuardCallMissing")
    if 'if asset_kind == "ai_chat_portrait":\n\t\treturn _resolve_direct_res_path(slot_payload)' in source:
        failures.append("portraitAssetRegistryDirectPathInlineGuardStillPresent")
    if '"manifest_or_generalpic_fallback"' in source:
        failures.append("portraitAssetRegistryLegacyAssetSourceStillPresent")
    allows_function = _extract_gdscript_function(source, "_allows_direct_res_path")
    if allows_function == "":
        failures.append("portraitAssetRegistryDirectPathGuardFunctionMissing")
    elif 'asset_kind == "ai_chat_portrait"' not in allows_function:
        failures.append("portraitAssetRegistryDirectPathGuardNotAiChatOnly")
    direct_function = _extract_gdscript_function(source, "_resolve_direct_res_path")
    if direct_function == "":
        failures.append("portraitAssetRegistryDirectPathResolverMissing")
    source_without_direct_resolver = source.replace(direct_function, "")
    for forbidden_marker in [
        'slot_payload.get("path"',
        'slot_payload.get("resPath"',
        'slot_payload.get("portraitPath"',
        'slot_payload.get("portrait_path"',
    ]:
        if forbidden_marker in source_without_direct_resolver:
            failures.append(f"portraitAssetRegistryDirectPathFieldOutsideResolver:{forbidden_marker}")
    return failures


def _validate_warm_lift_surface_source_contract() -> list[str]:
    failures: list[str] = []
    try:
        source = SLG_UI_COMPONENT_FACTORY_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"visualWarmLiftSourceReadFailed:{exc}"]
    if "warm_lift_reading_v2" in source:
        failures.append("visualWarmLiftOldTokenStillPresent")
    for marker in VISUAL_WARM_LIFT_SOURCE_MARKERS:
        if marker not in source:
            failures.append(f"visualWarmLiftSourceMarkerMissing:{marker}")
    return failures


def _validate_design_system_contract(
    page_summary: dict[str, Any],
    expected_component_family: str,
    *,
    require_production_baseline: bool = True,
) -> list[str]:
    failures: list[str] = []
    if page_summary.get("visualDesignSystemId") != VISUAL_DESIGN_SYSTEM_ID:
        failures.append(f"visualDesignSystemId!={VISUAL_DESIGN_SYSTEM_ID}")
    if page_summary.get("visualDesignTokenSource") != VISUAL_DESIGN_TOKEN_SOURCE:
        failures.append(f"visualDesignTokenSource!={VISUAL_DESIGN_TOKEN_SOURCE}")
    if page_summary.get("visualDesignTokenVersion") != VISUAL_DESIGN_TOKEN_VERSION:
        failures.append(f"visualDesignTokenVersion!={VISUAL_DESIGN_TOKEN_VERSION}")
    if page_summary.get("visualSurfaceTone") != VISUAL_SURFACE_TONE:
        failures.append(f"visualSurfaceTone!={VISUAL_SURFACE_TONE}")
    if page_summary.get("visualSurfaceDensity") != VISUAL_SURFACE_DENSITY:
        failures.append(f"visualSurfaceDensity!={VISUAL_SURFACE_DENSITY}")
    if page_summary.get("visualShellChromeToken") != FULLSCREEN_SHELL_CHROME_TOKEN:
        failures.append(f"visualShellChromeToken!={FULLSCREEN_SHELL_CHROME_TOKEN}")
    if page_summary.get("visualCardDepthToken") != VISUAL_CARD_DEPTH_TOKEN:
        failures.append(f"visualCardDepthToken!={VISUAL_CARD_DEPTH_TOKEN}")
    failures.extend(_validate_warm_lift_surface_source_contract())
    if page_summary.get("visualDataMode") != VISUAL_DATA_MODE:
        failures.append(f"visualDataMode!={VISUAL_DATA_MODE}")
    if page_summary.get("visualComponentFamily") != expected_component_family:
        failures.append(f"visualComponentFamily!={expected_component_family}")
    if require_production_baseline and page_summary.get("visualProductionBaseline") is not True:
        failures.append("visualProductionBaseline!=true")
    return failures


def _validate_module_token_contract(page_summary: dict[str, Any], module_prefix: str) -> list[str]:
    failures: list[str] = []
    theme_key = f"{module_prefix}ThemeTokenSet"
    page_key = f"{module_prefix}PageTokenState"
    font_key = f"{module_prefix}FontScaleMode"
    button_key = f"{module_prefix}ButtonScaleMode"
    if page_summary.get(theme_key) != VISUAL_DESIGN_SYSTEM_ID:
        failures.append(f"{theme_key}!={VISUAL_DESIGN_SYSTEM_ID}")
    if not str(page_summary.get(page_key, "")).strip():
        failures.append(f"{page_key}=empty")
    if page_summary.get(font_key) != VISUAL_DESIGN_TOKEN_VERSION:
        failures.append(f"{font_key}!={VISUAL_DESIGN_TOKEN_VERSION}")
    if page_summary.get(button_key) != VISUAL_DESIGN_TOKEN_VERSION:
        failures.append(f"{button_key}!={VISUAL_DESIGN_TOKEN_VERSION}")
    return failures


def _validate_world_event_activity_shell_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if page_summary.get("worldEventShellToken") != WORLD_EVENT_ACTIVITY_SHELL_TOKEN:
        failures.append(f"worldEventShellToken!={WORLD_EVENT_ACTIVITY_SHELL_TOKEN}")
    if page_summary.get("worldEventActionButtonToken") != SNAPSHOT_SECTION_ACTION_BUTTON_TOKEN:
        failures.append(f"worldEventActionButtonToken!={SNAPSHOT_SECTION_ACTION_BUTTON_TOKEN}")
    if _as_int(page_summary.get("worldEventActionButtonMinHeight")) < 44:
        failures.append("worldEventActionButtonMinHeight<44")
    if _as_int(page_summary.get("worldEventActionButtonReadingMinHeight")) < 58:
        failures.append("worldEventActionButtonReadingMinHeight<58")
    if _as_int(page_summary.get("worldEventActionButtonBaseFontSize")) != 14:
        failures.append("worldEventActionButtonBaseFontSize!=14")
    if _as_int(page_summary.get("worldEventActionButtonStackedFontSize")) != 15:
        failures.append("worldEventActionButtonStackedFontSize!=15")
    if _as_int(page_summary.get("worldEventActionButtonReadingFontSize")) != 18:
        failures.append("worldEventActionButtonReadingFontSize!=18")
    if page_summary.get("worldEventFeatureStatusChipToken") != SNAPSHOT_FEATURE_STATUS_CHIP_TOKEN:
        failures.append(f"worldEventFeatureStatusChipToken!={SNAPSHOT_FEATURE_STATUS_CHIP_TOKEN}")
    if _as_int(page_summary.get("worldEventFeatureStatusChipFontSize")) != 8:
        failures.append("worldEventFeatureStatusChipFontSize!=8")
    if _as_int(page_summary.get("worldEventFeatureStatusChipMarginX")) != 4:
        failures.append("worldEventFeatureStatusChipMarginX!=4")
    if _as_int(page_summary.get("worldEventFeatureStatusChipMarginY")) != 1:
        failures.append("worldEventFeatureStatusChipMarginY!=1")
    if page_summary.get("worldEventFeatureCardGridToken") != SNAPSHOT_FEATURE_CARD_GRID_TOKEN:
        failures.append(f"worldEventFeatureCardGridToken!={SNAPSHOT_FEATURE_CARD_GRID_TOKEN}")
    if page_summary.get("worldEventFeatureCardShowcaseCompositionToken") != SNAPSHOT_FEATURE_CARD_SHOWCASE_COMPOSITION_TOKEN:
        failures.append(f"worldEventFeatureCardShowcaseCompositionToken!={SNAPSHOT_FEATURE_CARD_SHOWCASE_COMPOSITION_TOKEN}")
    if page_summary.get("worldEventFeatureCardChromeToken") != SNAPSHOT_FEATURE_CARD_CHROME_TOKEN:
        failures.append(f"worldEventFeatureCardChromeToken!={SNAPSHOT_FEATURE_CARD_CHROME_TOKEN}")
    if page_summary.get("worldEventFeatureCardTitleBarToken") != SNAPSHOT_FEATURE_CARD_TITLE_BAR_TOKEN:
        failures.append(f"worldEventFeatureCardTitleBarToken!={SNAPSHOT_FEATURE_CARD_TITLE_BAR_TOKEN}")
    if page_summary.get("worldEventFeatureCardPlaceholderToken") != SNAPSHOT_FEATURE_CARD_PLACEHOLDER_TOKEN:
        failures.append(f"worldEventFeatureCardPlaceholderToken!={SNAPSHOT_FEATURE_CARD_PLACEHOLDER_TOKEN}")
    if page_summary.get("worldEventFeatureCardRenderStateToken") != SNAPSHOT_FEATURE_CARD_RENDER_STATE_TOKEN:
        failures.append(f"worldEventFeatureCardRenderStateToken!={SNAPSHOT_FEATURE_CARD_RENDER_STATE_TOKEN}")
    if page_summary.get("worldEventFeatureCardCaptionRowToken") != SNAPSHOT_FEATURE_CARD_CAPTION_ROW_TOKEN:
        failures.append(f"worldEventFeatureCardCaptionRowToken!={SNAPSHOT_FEATURE_CARD_CAPTION_ROW_TOKEN}")
    if page_summary.get("worldEventFeatureCardImageSlotToken") != SNAPSHOT_FEATURE_CARD_IMAGE_SLOT_TOKEN:
        failures.append(f"worldEventFeatureCardImageSlotToken!={SNAPSHOT_FEATURE_CARD_IMAGE_SLOT_TOKEN}")
    if page_summary.get("worldEventFeatureCardPlaceholderArtToken") != SNAPSHOT_FEATURE_CARD_PLACEHOLDER_ART_TOKEN:
        failures.append(f"worldEventFeatureCardPlaceholderArtToken!={SNAPSHOT_FEATURE_CARD_PLACEHOLDER_ART_TOKEN}")
    if _as_int(page_summary.get("worldEventFeatureCardShowcaseFeaturedMinHeight")) != 302:
        failures.append("worldEventFeatureCardShowcaseFeaturedMinHeight!=302")
    if _as_int(page_summary.get("worldEventFeatureCardShowcaseCompactMinHeight")) != WORLD_EVENT_ACTIVITY_CARD_HEIGHT:
        failures.append(f"worldEventFeatureCardShowcaseCompactMinHeight!={WORLD_EVENT_ACTIVITY_CARD_HEIGHT}")
    if _as_int(page_summary.get("worldEventFeatureCardShowcaseSideColumns")) != 3:
        failures.append("worldEventFeatureCardShowcaseSideColumns!=3")
    if _as_int(page_summary.get("worldEventFeatureCardShowcaseConsumedCount")) != 4:
        failures.append("worldEventFeatureCardShowcaseConsumedCount!=4")
    if _as_int(page_summary.get("worldEventFeatureCardUniformMinHeight")) != WORLD_EVENT_ACTIVITY_CARD_HEIGHT:
        failures.append(f"worldEventFeatureCardUniformMinHeight!={WORLD_EVENT_ACTIVITY_CARD_HEIGHT}")
    if _as_int(page_summary.get("worldEventFeatureCardUniformImageHeight")) != WORLD_EVENT_ACTIVITY_CARD_IMAGE_HEIGHT:
        failures.append(f"worldEventFeatureCardUniformImageHeight!={WORLD_EVENT_ACTIVITY_CARD_IMAGE_HEIGHT}")
    if _as_int(page_summary.get("worldEventFeatureCardUniformTitleBarHeight")) != 42:
        failures.append("worldEventFeatureCardUniformTitleBarHeight!=42")
    if page_summary.get("worldEventFeatureCardAssetRootToken") != SNAPSHOT_FEATURE_CARD_ASSET_ROOT_TOKEN:
        failures.append(f"worldEventFeatureCardAssetRootToken!={SNAPSHOT_FEATURE_CARD_ASSET_ROOT_TOKEN}")
    allowed_roots = page_summary.get("worldEventFeatureCardAllowedAssetRoots")
    if allowed_roots != list(WORLD_EVENT_ACTIVITY_CARD_ALLOWED_ASSET_ROOTS):
        failures.append("worldEventFeatureCardAllowedAssetRoots!=world_event_activity_asset_drop")
    if _as_int(page_summary.get("worldEventFeatureCardRecommendedAssetWidth")) != 1280:
        failures.append("worldEventFeatureCardRecommendedAssetWidth!=1280")
    if _as_int(page_summary.get("worldEventFeatureCardRecommendedAssetHeight")) != 720:
        failures.append("worldEventFeatureCardRecommendedAssetHeight!=720")
    if _as_int(page_summary.get("worldEventFeatureCardMinimumAssetWidth")) != 640:
        failures.append("worldEventFeatureCardMinimumAssetWidth!=640")
    if _as_int(page_summary.get("worldEventFeatureCardMinimumAssetHeight")) != 360:
        failures.append("worldEventFeatureCardMinimumAssetHeight!=360")
    if page_summary.get("worldEventFeatureCardAssetAspectRatio") != "16:9":
        failures.append("worldEventFeatureCardAssetAspectRatio!=16:9")
    if page_summary.get("pageId") == "activities":
        if page_summary.get("activityCardGridLayout") != "showcase":
            failures.append("activityCardGridLayout!=showcase")
        if _as_int(page_summary.get("activityCardGridFeaturedCount")) != 1:
            failures.append("activityCardGridFeaturedCount!=1")
        if _as_int(page_summary.get("activityCardGridColumns")) != 3:
            failures.append("activityCardGridColumns!=3")
        if bool(page_summary.get("activityCardShowcaseReusable", False)) is not True:
            failures.append("activityCardShowcaseReusable!=true")
        if bool(page_summary.get("activityAssetContractOk", False)) is not True:
            failures.append("activityAssetContractOk!=true")
        if _as_int(page_summary.get("activityAssetAssignedCount")) < 3:
            failures.append("activityAssetAssignedCount<3")
        if _as_int(page_summary.get("activityAssetInvalidPathCount")) != 0:
            failures.append("activityAssetInvalidPathCount!=0")
        if page_summary.get("worldEventMotionSystemToken") != MAINLINE_UI_MOTION_SYSTEM_TOKEN:
            failures.append(f"worldEventMotionSystemToken!={MAINLINE_UI_MOTION_SYSTEM_TOKEN}")
        motion_tokens = page_summary.get("worldEventMotionTokens", [])
        if not isinstance(motion_tokens, list):
            failures.append("worldEventMotionTokens!list")
            motion_tokens = []
        missing_motion_tokens = sorted(MOTION_TOKENS.difference(str(token) for token in motion_tokens))
        if missing_motion_tokens:
            failures.append("worldEventMotionTokensMissing:%s" % ",".join(missing_motion_tokens))
        if page_summary.get("worldEventMotionScope") != "ui_layer_only":
            failures.append("worldEventMotionScope!=ui_layer_only")
        if bool(page_summary.get("worldEventMotionBackendTouched", True)):
            failures.append("worldEventMotionBackendTouched!=false")
        if bool(page_summary.get("worldEventMotionMapTouched", True)):
            failures.append("worldEventMotionMapTouched!=false")
        if bool(page_summary.get("worldEventMotionBattleRulesTouched", True)):
            failures.append("worldEventMotionBattleRulesTouched!=false")
        if bool(page_summary.get("worldEventMotionVoiceTouched", True)):
            failures.append("worldEventMotionVoiceTouched!=false")
        if page_summary.get("activityMotionSampleToken") != ACTIVITY_MOTION_SAMPLE_TOKEN:
            failures.append(f"activityMotionSampleToken!={ACTIVITY_MOTION_SAMPLE_TOKEN}")
        if page_summary.get("activityMotionSamplePage") != "activities":
            failures.append("activityMotionSamplePage!=activities")
        if page_summary.get("activityMotionOpeningPattern") != "left_to_right_empty_drop_unfurl_v3":
            failures.append("activityMotionOpeningPattern!=left_to_right_empty_drop_unfurl_v3")
        if page_summary.get("activityMotionUnfurlToken") != "activity_empty_drop_unfurl_v3":
            failures.append("activityMotionUnfurlToken!=activity_empty_drop_unfurl_v3")
        if page_summary.get("activityMotionUnfurlMethod") != "pivot_scale_x_alpha_translate_drop_y":
            failures.append("activityMotionUnfurlMethod!=pivot_scale_x_alpha_translate_drop_y")
        if page_summary.get("activityMotionEarlyFrameTarget") != "near_empty_stage_before_cards_v1":
            failures.append("activityMotionEarlyFrameTarget!=near_empty_stage_before_cards_v1")
        if _as_int(page_summary.get("activityMotionUnfurlDurationMs")) < 900:
            failures.append("activityMotionUnfurlDurationMs<900")
        if _as_int(page_summary.get("activityMotionUnfurlBaseDelayMs")) < 260:
            failures.append("activityMotionUnfurlBaseDelayMs<260")
        if float(page_summary.get("activityMotionUnfurlInitialAlpha", 1.0)) > 0.01:
            failures.append("activityMotionUnfurlInitialAlpha>0.01")
        if float(page_summary.get("activityMotionUnfurlInitialScaleX", 1.0)) > 0.08:
            failures.append("activityMotionUnfurlInitialScaleX>0.08")
        if abs(float(page_summary.get("activityMotionUnfurlLiftX", 0.0))) < 170.0:
            failures.append("activityMotionUnfurlLiftXAbs<170")
        if abs(float(page_summary.get("activityMotionUnfurlDropY", 0.0))) < 80.0:
            failures.append("activityMotionUnfurlDropYAbs<80")
        if page_summary.get("activityMotionEvidenceMode") != "multi_frame_or_token_summary_v1":
            failures.append("activityMotionEvidenceMode!=multi_frame_or_token_summary_v1")
        if page_summary.get("activityMotionFutureImpact") != "ui_visual_only_no_layout_or_backend_contract_change":
            failures.append("activityMotionFutureImpact!=ui_visual_only_no_layout_or_backend_contract_change")
        if page_summary.get("activityMotionPrewarmMode") != "snapshot_asset_texture_prewarm_before_render_v1":
            failures.append("activityMotionPrewarmMode!=snapshot_asset_texture_prewarm_before_render_v1")
        if bool(page_summary.get("activityMotionPrewarmBeforeContentBuild", False)) is not True:
            failures.append("activityMotionPrewarmBeforeContentBuild!=true")
        if _as_int(page_summary.get("activityMotionPrewarmedAssetCount")) < 3:
            failures.append("activityMotionPrewarmedAssetCount<3")
        if _as_int(page_summary.get("activityMotionPrewarmFailedCount")) != 0:
            failures.append("activityMotionPrewarmFailedCount!=0")
        if page_summary.get("activityMotionStaggerAxis") != "left_to_right":
            failures.append("activityMotionStaggerAxis!=left_to_right")
        if page_summary.get("activityMotionSampleLayout") != "showcase":
            failures.append("activityMotionSampleLayout!=showcase")
        if page_summary.get("activityMotionCardStaggerToken") != "card_stagger_enter_v1":
            failures.append("activityMotionCardStaggerToken!=card_stagger_enter_v1")
        if page_summary.get("activityMotionPrimaryCtaToken") != "focus_cta_pulse_v1":
            failures.append("activityMotionPrimaryCtaToken!=focus_cta_pulse_v1")
        if page_summary.get("activityMotionRewardGlowToken") != "reward_glow_v1":
            failures.append("activityMotionRewardGlowToken!=reward_glow_v1")
        if page_summary.get("activityMotionDisabledSoftStateToken") != "disabled_soft_state_v1":
            failures.append("activityMotionDisabledSoftStateToken!=disabled_soft_state_v1")
        if page_summary.get("activityMotionPrimaryCtaPlacement") != "below_image_footer_v1":
            failures.append("activityMotionPrimaryCtaPlacement!=below_image_footer_v1")
        if page_summary.get("activityMotionCopyPlacement") != "below_image_caption_title_v1":
            failures.append("activityMotionCopyPlacement!=below_image_caption_title_v1")
        if bool(page_summary.get("activityMotionAssetCoverFooterVisible", False)) is not True:
            failures.append("activityMotionAssetCoverFooterVisible!=true")
        if page_summary.get("activityMotionReservedSoftState") != "single_soft_disabled_art_v1":
            failures.append("activityMotionReservedSoftState!=single_soft_disabled_art_v1")
        if bool(page_summary.get("activityMotionReservedTextDuplicate", True)):
            failures.append("activityMotionReservedTextDuplicate!=false")
        failures.extend(_validate_world_event_activity_fixture_asset_contract())
        failures.extend(_validate_world_event_activity_feature_card_source_contract())
    return failures


def _validate_battle_report_shell_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if page_summary.get("battleReportShellToken") != BATTLE_REPORT_SHELL_TOKEN:
        failures.append(f"battleReportShellToken!={BATTLE_REPORT_SHELL_TOKEN}")
    if page_summary.get("battleReportShellIconButtonToken") != BATTLE_REPORT_SHELL_ICON_BUTTON_TOKEN:
        failures.append(f"battleReportShellIconButtonToken!={BATTLE_REPORT_SHELL_ICON_BUTTON_TOKEN}")
    if _as_int(page_summary.get("battleReportShellIconButtonMinHeight")) < 52:
        failures.append("battleReportShellIconButtonMinHeight<52")
    if page_summary.get("battleReportCloseButtonMode") != BATTLE_REPORT_CLOSE_BUTTON_MODE:
        failures.append(f"battleReportCloseButtonMode!={BATTLE_REPORT_CLOSE_BUTTON_MODE}")
    if page_summary.get("battleReportCleanListChromeMode") != BATTLE_REPORT_CLEAN_LIST_CHROME_MODE:
        failures.append(f"battleReportCleanListChromeMode!={BATTLE_REPORT_CLEAN_LIST_CHROME_MODE}")
    if bool(page_summary.get("battleReportCountrySummaryVisible", True)):
        failures.append("battleReportCountrySummaryVisible!=false")
    if bool(page_summary.get("battleReportHeaderHintVisible", True)):
        failures.append("battleReportHeaderHintVisible!=false")
    if _as_int(page_summary.get("battleReportSearchButtonMinWidth")) < 136:
        failures.append("battleReportSearchButtonMinWidth<136")
    if _as_int(page_summary.get("battleReportDetailBackButtonMinWidth")) < 136:
        failures.append("battleReportDetailBackButtonMinWidth<136")
    if page_summary.get("battleReportListModeTabToken") != BATTLE_REPORT_LIST_MODE_TAB_TOKEN:
        failures.append(f"battleReportListModeTabToken!={BATTLE_REPORT_LIST_MODE_TAB_TOKEN}")
    if _as_int(page_summary.get("battleReportListModeTabMinWidth")) < 132:
        failures.append("battleReportListModeTabMinWidth<132")
    if _as_int(page_summary.get("battleReportListModeTabMinHeight")) < 52:
        failures.append("battleReportListModeTabMinHeight<52")
    if _as_int(page_summary.get("battleReportListModeTabFontSize")) != 20:
        failures.append("battleReportListModeTabFontSize!=20")
    if bool(page_summary.get("battleReportListSummaryVisible", True)):
        failures.append("battleReportListSummaryVisible!=false")
    if bool(page_summary.get("battleReportListSharedStateVisible", True)):
        failures.append("battleReportListSharedStateVisible!=false")
    if bool(page_summary.get("battleReportListUtilityRailVisible", False)) is not True:
        failures.append("battleReportListUtilityRailVisible!=true")
    if page_summary.get("battleReportListSummaryToken") != BATTLE_REPORT_LIST_SUMMARY_TOKEN:
        failures.append(f"battleReportListSummaryToken!={BATTLE_REPORT_LIST_SUMMARY_TOKEN}")
    if _as_int(page_summary.get("battleReportListSummaryMinHeight")) < 46:
        failures.append("battleReportListSummaryMinHeight<46")
    if _as_int(page_summary.get("battleReportListSummaryFontSize")) != 11:
        failures.append("battleReportListSummaryFontSize!=11")
    if page_summary.get("battleReportListUtilityToken") != BATTLE_REPORT_LIST_UTILITY_TOKEN:
        failures.append(f"battleReportListUtilityToken!={BATTLE_REPORT_LIST_UTILITY_TOKEN}")
    if _as_int(page_summary.get("battleReportListUtilityRailWidth")) < 48:
        failures.append("battleReportListUtilityRailWidth<48")
    if _as_int(page_summary.get("battleReportFilterButtonMinHeight")) < 84:
        failures.append("battleReportFilterButtonMinHeight<84")
    if _as_int(page_summary.get("battleReportFilterButtonFontSize")) != 14:
        failures.append("battleReportFilterButtonFontSize!=14")
    if page_summary.get("battleReportEmptyStateToken") != BATTLE_REPORT_EMPTY_STATE_TOKEN:
        failures.append(f"battleReportEmptyStateToken!={BATTLE_REPORT_EMPTY_STATE_TOKEN}")
    if page_summary.get("battleReportEmptyStatePreviewToken") != BATTLE_REPORT_EMPTY_STATE_PREVIEW_TOKEN:
        failures.append(f"battleReportEmptyStatePreviewToken!={BATTLE_REPORT_EMPTY_STATE_PREVIEW_TOKEN}")
    if _as_int(page_summary.get("battleReportEmptyStateMinDisplayCount")) < 1:
        failures.append("battleReportEmptyStateMinDisplayCount<1")
    if page_summary.get("battleReportEmptyStateDetailContractRequired") is not True:
        failures.append("battleReportEmptyStateDetailContractRequired!=true")
    if page_summary.get("battleReportListCardToken") != BATTLE_REPORT_LIST_CARD_TOKEN:
        failures.append(f"battleReportListCardToken!={BATTLE_REPORT_LIST_CARD_TOKEN}")
    if page_summary.get("battleReportListCardHierarchyToken") != BATTLE_REPORT_LIST_CARD_HIERARCHY_TOKEN:
        failures.append("battleReportListCardHierarchyToken!=battle_report_list_card_result_first_hierarchy_v1")
    if page_summary.get("battleReportListCardHierarchyMode") != "header_attack_result_defense_v1":
        failures.append("battleReportListCardHierarchyMode!=header_attack_result_defense_v1")
    if page_summary.get("battleReportListCardBodyOrder") != "attacker_result_defender":
        failures.append("battleReportListCardBodyOrder!=attacker_result_defender")
    if page_summary.get("battleReportListResultClusterVisualRole") != "primary_outcome_focus":
        failures.append("battleReportListResultClusterVisualRole!=primary_outcome_focus")
    if page_summary.get("battleReportListCardDossierDensityToken") != BATTLE_REPORT_LIST_CARD_DOSSIER_DENSITY_TOKEN:
        failures.append(f"battleReportListCardDossierDensityToken!={BATTLE_REPORT_LIST_CARD_DOSSIER_DENSITY_TOKEN}")
    if page_summary.get("battleReportListCardSelectedStateToken") != BATTLE_REPORT_LIST_CARD_SELECTED_STATE_TOKEN:
        failures.append(f"battleReportListCardSelectedStateToken!={BATTLE_REPORT_LIST_CARD_SELECTED_STATE_TOKEN}")
    if page_summary.get("battleReportListHeroCardReadabilityToken") != BATTLE_REPORT_LIST_HERO_CARD_READABILITY_TOKEN:
        failures.append("battleReportListHeroCardReadabilityToken!=battle_report_list_hero_card_readability_v1")
    if page_summary.get("battleReportListCardSelectedStateVisible") is not True:
        failures.append("battleReportListCardSelectedStateVisible!=true")
    if not str(page_summary.get("battleReportListCardSelectedReportId", "")).strip():
        failures.append("battleReportListCardSelectedReportId=empty")
    if _as_int(page_summary.get("battleReportListCardMinHeight")) < 318:
        failures.append("battleReportListCardMinHeight<318")
    if _as_int(page_summary.get("battleReportListCardMarginX")) != 10:
        failures.append("battleReportListCardMarginX!=10")
    if _as_int(page_summary.get("battleReportListCardMarginY")) != 8:
        failures.append("battleReportListCardMarginY!=8")
    if _as_int(page_summary.get("battleReportListCardColumnSpacing")) != 8:
        failures.append("battleReportListCardColumnSpacing!=8")
    if _as_int(page_summary.get("battleReportListCardBodySpacing")) != 8:
        failures.append("battleReportListCardBodySpacing!=8")
    if page_summary.get("battleReportListCardHeaderToken") != BATTLE_REPORT_LIST_CARD_HEADER_TOKEN:
        failures.append(f"battleReportListCardHeaderToken!={BATTLE_REPORT_LIST_CARD_HEADER_TOKEN}")
    if _as_int(page_summary.get("battleReportListCardHeaderSpacing")) != 5:
        failures.append("battleReportListCardHeaderSpacing!=5")
    if page_summary.get("battleReportListCardBadgeToken") != BATTLE_REPORT_LIST_CARD_BADGE_TOKEN:
        failures.append(f"battleReportListCardBadgeToken!={BATTLE_REPORT_LIST_CARD_BADGE_TOKEN}")
    if _as_int(page_summary.get("battleReportListCardBadgeWidth")) < 34:
        failures.append("battleReportListCardBadgeWidth<34")
    if _as_int(page_summary.get("battleReportListCardBadgeHeight")) < 28:
        failures.append("battleReportListCardBadgeHeight<28")
    if _as_int(page_summary.get("battleReportListCardBadgeFontSize")) != 16:
        failures.append("battleReportListCardBadgeFontSize!=16")
    if _as_int(page_summary.get("battleReportListCardTitleFontSize")) != 18:
        failures.append("battleReportListCardTitleFontSize!=18")
    if _as_int(page_summary.get("battleReportListCardLocationFontSize")) != 15:
        failures.append("battleReportListCardLocationFontSize!=15")
    if page_summary.get("battleReportListStructureBoxToken") != BATTLE_REPORT_LIST_STRUCTURE_BOX_TOKEN:
        failures.append(f"battleReportListStructureBoxToken!={BATTLE_REPORT_LIST_STRUCTURE_BOX_TOKEN}")
    if _as_int(page_summary.get("battleReportListStructureBoxFontSize")) != 15:
        failures.append("battleReportListStructureBoxFontSize!=15")
    if page_summary.get("battleReportListCardBodyToken") != BATTLE_REPORT_LIST_CARD_BODY_TOKEN:
        failures.append(f"battleReportListCardBodyToken!={BATTLE_REPORT_LIST_CARD_BODY_TOKEN}")
    if page_summary.get("battleReportListDetailEntryToken") != BATTLE_REPORT_LIST_DETAIL_ENTRY_TOKEN:
        failures.append(f"battleReportListDetailEntryToken!={BATTLE_REPORT_LIST_DETAIL_ENTRY_TOKEN}")
    if page_summary.get("battleReportListDetailEntryTargetPage") != "detail":
        failures.append("battleReportListDetailEntryTargetPage!=detail")
    if _as_int(page_summary.get("battleReportListDetailEntryFontSize")) != 15:
        failures.append("battleReportListDetailEntryFontSize!=15")
    if page_summary.get("battleReportListSelectedExpandLabel") != "已选":
        failures.append("battleReportListSelectedExpandLabel!=已选")
    if _as_int(page_summary.get("battleReportListTeamClusterMinHeight")) < 238:
        failures.append("battleReportListTeamClusterMinHeight<238")
    if _as_int(page_summary.get("battleReportListTeamTitleFontSize")) != 18:
        failures.append("battleReportListTeamTitleFontSize!=18")
    if _as_int(page_summary.get("battleReportListTeamPowerFontSize")) != 16:
        failures.append("battleReportListTeamPowerFontSize!=16")
    if _as_int(page_summary.get("battleReportListHeroSlotWidth")) < 144:
        failures.append("battleReportListHeroSlotWidth<144")
    if _as_int(page_summary.get("battleReportListHeroSlotHeight")) < 194:
        failures.append("battleReportListHeroSlotHeight<194")
    if page_summary.get("battleReportListPortraitFrameVariant") != BATTLE_REPORT_LIST_PORTRAIT_FRAME_VARIANT:
        failures.append(f"battleReportListPortraitFrameVariant!={BATTLE_REPORT_LIST_PORTRAIT_FRAME_VARIANT}")
    if page_summary.get("battleReportListPortraitFitMode") != BATTLE_REPORT_SAFE_PORTRAIT_FIT_MODE:
        failures.append(f"battleReportListPortraitFitMode!={BATTLE_REPORT_SAFE_PORTRAIT_FIT_MODE}")
    if page_summary.get("battleReportListPortraitAssetSource") != BATTLE_REPORT_SAFE_PORTRAIT_ASSET_SOURCE:
        failures.append(f"battleReportListPortraitAssetSource!={BATTLE_REPORT_SAFE_PORTRAIT_ASSET_SOURCE}")
    if page_summary.get("battleReportListPortraitStageAspect") != BATTLE_REPORT_SAFE_PORTRAIT_STAGE_ASPECT:
        failures.append(f"battleReportListPortraitStageAspect!={BATTLE_REPORT_SAFE_PORTRAIT_STAGE_ASPECT}")
    if page_summary.get("battleReportListPortraitClipEnabled") is not False:
        failures.append("battleReportListPortraitClipEnabled!=false")
    if page_summary.get("battleReportListPortraitSafeMargin") != BATTLE_REPORT_SAFE_PORTRAIT_MARGIN:
        failures.append(f"battleReportListPortraitSafeMargin!={BATTLE_REPORT_SAFE_PORTRAIT_MARGIN}")
    if page_summary.get("battleReportListPortraitRegistryId") != PORTRAIT_FRAME_REGISTRY_ID:
        failures.append(f"battleReportListPortraitRegistryId!={PORTRAIT_FRAME_REGISTRY_ID}")
    failures.extend(_validate_battle_report_portrait_source_contract())
    if _as_int(page_summary.get("battleReportListHeroInfoPlateVisibleCount")) < 1:
        failures.append("battleReportListHeroInfoPlateVisibleCount<1")
    if _as_int(page_summary.get("battleReportListHeroInfoPlateMinHeight")) < 42:
        failures.append("battleReportListHeroInfoPlateMinHeight<42")
    if _as_int(page_summary.get("battleReportListHeroFallbackFontSize")) < 15:
        failures.append("battleReportListHeroFallbackFontSize<15")
    if _as_int(page_summary.get("battleReportListHeroStarFontSize")) < 13:
        failures.append("battleReportListHeroStarFontSize<13")
    if _as_int(page_summary.get("battleReportListHeroNameFontSize")) < 16:
        failures.append("battleReportListHeroNameFontSize<16")
    if _as_int(page_summary.get("battleReportListHeroLevelFontSize")) < 14:
        failures.append("battleReportListHeroLevelFontSize<14")
    if _as_int(page_summary.get("battleReportListResultClusterWidth")) < 164:
        failures.append("battleReportListResultClusterWidth<164")
    if _as_int(page_summary.get("battleReportListResultNoteFontSize")) != 13:
        failures.append("battleReportListResultNoteFontSize!=13")
    if _as_int(page_summary.get("battleReportListResultTextFontSize")) != 34:
        failures.append("battleReportListResultTextFontSize!=34")
    if _as_int(page_summary.get("battleReportListResultMetaFontSize")) != 13:
        failures.append("battleReportListResultMetaFontSize!=13")
    if _as_int(page_summary.get("battleReportListUtilityClusterWidth")) < 46:
        failures.append("battleReportListUtilityClusterWidth<46")
    if _as_int(page_summary.get("battleReportListUtilityIndexHeight")) < 34:
        failures.append("battleReportListUtilityIndexHeight<34")
    if _as_int(page_summary.get("battleReportListUtilityExpandHeight")) < 56:
        failures.append("battleReportListUtilityExpandHeight<56")
    if _as_int(page_summary.get("reportCount")) <= 0:
        if page_summary.get("emptyShellOk") is not True:
            failures.append("battleReportEmptyShellOk!=true")
        if _as_int(page_summary.get("emptyStateEntryCount")) < 1:
            failures.append("battleReportEmptyStateEntryCount<1")
        if _as_int(page_summary.get("displayReportCount")) < 1:
            failures.append("battleReportDisplayReportCount<1")
        if not str(page_summary.get("selectedReportId", "")).strip():
            failures.append("battleReportSelectedReportId=empty")
        if page_summary.get("battleReportEmptyStateSelectedReportId") != "preview_empty_state":
            failures.append("battleReportEmptyStateSelectedReportId!=preview_empty_state")
        if _as_int(page_summary.get("battleReportEmptyStateDisplayCount")) < 1:
            failures.append("battleReportEmptyStateDisplayCount<1")
    return failures


def _validate_battle_report_real_data_state_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if page_summary.get("battleReportRealDataSourceMode") != BATTLE_REPORT_REAL_DATA_SOURCE_MODE:
        failures.append(f"battleReportRealDataSourceMode!={BATTLE_REPORT_REAL_DATA_SOURCE_MODE}")
    if page_summary.get("battleReportOwnerScopeMode") != BATTLE_REPORT_OWNER_SCOPE_MODE:
        failures.append(f"battleReportOwnerScopeMode!={BATTLE_REPORT_OWNER_SCOPE_MODE}")
    if page_summary.get("battleReportAiOwnerAttributionMode") != BATTLE_REPORT_AI_OWNER_ATTRIBUTION_MODE:
        failures.append(f"battleReportAiOwnerAttributionMode!={BATTLE_REPORT_AI_OWNER_ATTRIBUTION_MODE}")
    if page_summary.get("battleReportOrganizationSourceFilterMode") != BATTLE_REPORT_ORGANIZATION_SOURCE_FILTER_MODE:
        failures.append(f"battleReportOrganizationSourceFilterMode!={BATTLE_REPORT_ORGANIZATION_SOURCE_FILTER_MODE}")
    if _as_int(page_summary.get("battleReportRawWorldReportCount")) < 0:
        failures.append("battleReportRawWorldReportCount<0")
    if _as_int(page_summary.get("battleReportRawBattleRecordCount")) < 0:
        failures.append("battleReportRawBattleRecordCount<0")
    if bool(page_summary.get("battleReportUsesSyntheticPreviewAsRealData", True)):
        failures.append("battleReportUsesSyntheticPreviewAsRealData!=false")
    presenter_source = BATTLE_REPORT_PRESENTER_SCRIPT_PATH.read_text(encoding="utf-8")
    for marker in [
        'const BATTLE_REPORT_REAL_DATA_SOURCE_MODE := "battle_report_real_data_world_reports_feedback_records_v1"',
        'const BATTLE_REPORT_OWNER_SCOPE_MODE := "human_and_ai_player_battle_report_owner_scope_v1"',
        'const BATTLE_REPORT_AI_OWNER_ATTRIBUTION_MODE := "ai_player_battle_report_owner_attribution_v1"',
        'const BATTLE_REPORT_ORGANIZATION_SOURCE_FILTER_MODE := "organization_battle_report_source_filter_v1"',
        "func _collect_battle_report_sources(",
        "func _filter_personal_battle_reports(",
        "func _resolve_report_owner_scope(",
        "func _resolve_report_ai_owner_id(",
        "func _filter_organization_battle_reports(",
    ]:
        if marker not in presenter_source:
            failures.append(f"battleReportRealDataSourceMarkerMissing:{marker}")
    alliance_source = ALLIANCE_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
    if BATTLE_REPORT_ORGANIZATION_SOURCE_FILTER_MODE not in alliance_source:
        failures.append("organizationBattleReportSourceFilterModeMissingInAlliancePanel")
    alliance_presenter_source = ALLIANCE_PRESENTER_SCRIPT_PATH.read_text(encoding="utf-8")
    if "_filter_organization_battle_report_rows(" not in alliance_presenter_source:
        failures.append("organizationBattleReportPresenterFilterFunctionMissing")
    return failures


def _validate_battle_report_seeded_closure_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if _as_int(page_summary.get("battleReportRawBattleRecordCount"), 0) < 3:
        failures.append("battleReportSeededRawBattleRecordCount<3")
    if _as_int(page_summary.get("battleReportRealSourceCount"), 0) < 3:
        failures.append("battleReportSeededRealSourceCount<3")
    if _as_int(page_summary.get("battleReportPlayerOwnedCount"), 0) < 1:
        failures.append("battleReportSeededPlayerOwnedCount<1")
    if _as_int(page_summary.get("battleReportAiOwnedCount"), 0) < 1:
        failures.append("battleReportSeededAiOwnedCount<1")
    if _as_int(page_summary.get("battleReportListEntryCount"), 0) < 3:
        failures.append("battleReportSeededListEntryCount<3")
    if page_summary.get("battleReportListAiActionResultCardToken") != BATTLE_REPORT_AI_ACTION_RESULT_CARD_TOKEN:
        failures.append("battleReportListAiActionResultCardToken!=battle_report_ai_action_result_card_v1")
    if _as_int(page_summary.get("battleReportListActionResultCardVisibleCount"), -1) != 0:
        failures.append("battleReportListActionResultCardVisibleCount!=0")
    if bool(page_summary.get("battleReportListAiActionResultCardVisible", True)):
        failures.append("battleReportListAiActionResultCardVisible!=false")
    if _as_int(page_summary.get("battleReportListAiActionResultCardVisibleCount"), -1) != 0:
        failures.append("battleReportListAiActionResultCardVisibleCount!=0")
    if _as_int(page_summary.get("battleReportListPlayerActionResultCardVisibleCount"), -1) != 0:
        failures.append("battleReportListPlayerActionResultCardVisibleCount!=0")
    return failures


def _validate_mail_panel_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    expected_tabs = "organization/system"
    expected_unified_kinds = "daily_welfare/event_reward"
    failures.extend(
        _validate_design_system_contract(
            page_summary,
            "mail_shell",
            require_production_baseline=False,
        )
    )
    failures.extend(_validate_snapshot_edge_motion_contract(page_summary))
    failures.extend(_validate_snapshot_section_touch_scroll_contract())
    if page_summary.get("mailPanelContract") != "mail_panel_v1":
        failures.append("mailPanelContract!=mail_panel_v1")
    if page_summary.get("mailPanelSource") != "mail_presenter_snapshot_v1":
        failures.append("mailPanelSource!=mail_presenter_snapshot_v1")
    if page_summary.get("mailPanelVisualMode") != "independent_mail_inbox_snapshot_v1":
        failures.append("mailPanelVisualMode!=independent_mail_inbox_snapshot_v1")
    if page_summary.get("mailPanelLocation") != "mainline_snapshot_overlay":
        failures.append("mailPanelLocation!=mainline_snapshot_overlay")
    if page_summary.get("mailPanelReadModelSource") != "mail_inbox_preview_read_model_v1":
        failures.append("mailPanelReadModelSource!=mail_inbox_preview_read_model_v1")
    if page_summary.get("mailPanelReadModelSourceMode") != "external_ui_fixture_backend_ready_v1":
        failures.append("mailPanelReadModelSourceMode!=external_ui_fixture_backend_ready_v1")
    if page_summary.get("mailPanelReadModelExamplePath") != "res://data/ui/mail_inbox_preview_read_model.json":
        failures.append("mailPanelReadModelExamplePath!=res://data/ui/mail_inbox_preview_read_model.json")
    if bool(page_summary.get("mailPanelFutureBackendDynamicInboxes", False)) is not True:
        failures.append("mailPanelFutureBackendDynamicInboxes!=true")
    if _as_int(page_summary.get("mailPanelPresenterInlineFixtureItemCount"), -1) != 0:
        failures.append("mailPanelPresenterInlineFixtureItemCount!=0")
    if _as_int(page_summary.get("mailPanelReadModelItemCount"), -1) != _as_int(page_summary.get("mailPanelItemCount"), -2):
        failures.append("mailPanelReadModelItemCount!=mailPanelItemCount")
    if page_summary.get("mailPanelTabIds") != expected_tabs:
        failures.append(f"mailPanelTabIds!={expected_tabs}")
    if _as_int(page_summary.get("mailPanelPageCount")) != 2:
        failures.append("mailPanelPageCount!=2")
    if page_summary.get("mailPanelDefaultPageId") != "system":
        failures.append("mailPanelDefaultPageId!=system")
    if bool(page_summary.get("mailPanelAllTabPresent", True)):
        failures.append("mailPanelAllTabPresent!=false")
    if bool(page_summary.get("mailPanelRewardTabPresent", True)):
        failures.append("mailPanelRewardTabPresent!=false")
    if _as_int(page_summary.get("mailPanelItemCount")) < 5:
        failures.append("mailPanelItemCount<5")
    if _as_int(page_summary.get("mailPanelClaimableCount")) < 2:
        failures.append("mailPanelClaimableCount<2")
    if _as_int(page_summary.get("mailPanelUnreadCount")) < 3:
        failures.append("mailPanelUnreadCount<3")
    if _as_int(page_summary.get("mailPanelSystemItemCount")) < 3:
        failures.append("mailPanelSystemItemCount<3")
    if bool(page_summary.get("mailPanelSystemIncludesRewards", False)) is not True:
        failures.append("mailPanelSystemIncludesRewards!=true")
    if bool(page_summary.get("mailPanelRewardLongTermCategoryRetained", True)):
        failures.append("mailPanelRewardLongTermCategoryRetained!=false")
    if page_summary.get("mailPanelUnifiedInboxKinds") != expected_unified_kinds:
        failures.append(f"mailPanelUnifiedInboxKinds!={expected_unified_kinds}")
    if page_summary.get("mailPanelOrganizationMode") != "single_alliance_or_nation_membership_v1":
        failures.append("mailPanelOrganizationMode!=single_alliance_or_nation_membership_v1")
    if page_summary.get("mailPanelOrganizationTabLabelMode") != "dynamic_alliance_or_nation_v1":
        failures.append("mailPanelOrganizationTabLabelMode!=dynamic_alliance_or_nation_v1")
    if page_summary.get("mailPanelOrganizationTabLabel") not in {"同盟", "国家"}:
        failures.append("mailPanelOrganizationTabLabel not in 同盟/国家")
    if page_summary.get("mailPanelOrganizationTabLabel") == "同盟/国家":
        failures.append("mailPanelOrganizationTabLabel uses combined label")
    if bool(page_summary.get("mailPanelStandalone", False)) is not True:
        failures.append("mailPanelStandalone!=true")
    if bool(page_summary.get("mailPanelBattleReportPanelCoupled", True)):
        failures.append("mailPanelBattleReportPanelCoupled!=false")
    if bool(page_summary.get("mailPanelIncludesBattleReportDetail", True)):
        failures.append("mailPanelIncludesBattleReportDetail!=false")
    if page_summary.get("mailPanelBattleReportDeepLinkMode") != "action_only":
        failures.append("mailPanelBattleReportDeepLinkMode!=action_only")
    if page_summary.get("mailPanelTouchInputMode") != "touch_mouse_drag_v1":
        failures.append("mailPanelTouchInputMode!=touch_mouse_drag_v1")
    if page_summary.get("mailPanelScrollbarVisibility") != "hidden":
        failures.append("mailPanelScrollbarVisibility!=hidden")
    if page_summary.get("mailPanelBackendBoundary") != "ui_read_model_snapshot_no_backend_authority":
        failures.append("mailPanelBackendBoundary!=ui_read_model_snapshot_no_backend_authority")
    if bool(page_summary.get("mailPanelNoClaimAuthority", False)) is not True:
        failures.append("mailPanelNoClaimAuthority!=true")
    if _as_int(page_summary.get("mailPanelForbiddenEngineeringCopyCount"), -1) != 0:
        failures.append("mailPanelForbiddenEngineeringCopyCount!=0")
    if page_summary.get("mailPanelLayoutToken") != "mail_inbox_split_no_hero_v3":
        failures.append("mailPanelLayoutToken!=mail_inbox_split_no_hero_v3")
    if page_summary.get("mailPanelPrimaryBlockKind") != "mail_inbox_split":
        failures.append("mailPanelPrimaryBlockKind!=mail_inbox_split")
    if page_summary.get("mailPanelVisualQualityGate") != "standalone_inbox_polished_snapshot_v1":
        failures.append("mailPanelVisualQualityGate!=standalone_inbox_polished_snapshot_v1")
    if page_summary.get("mailPanelDetailPaneMode") != "letter_detail_preview_v1":
        failures.append("mailPanelDetailPaneMode!=letter_detail_preview_v1")
    if page_summary.get("mailPanelRewardStatusMode") != "status_only_no_claim_authority_v1":
        failures.append("mailPanelRewardStatusMode!=status_only_no_claim_authority_v1")
    if page_summary.get("mailPanelRewardStripPlacementMode") != "detail_lower_reward_band_v1":
        failures.append("mailPanelRewardStripPlacementMode!=detail_lower_reward_band_v1")
    if _as_int(page_summary.get("mailPanelRewardChipFontSize")) < 22:
        failures.append("mailPanelRewardChipFontSize<22")
    if _as_int(page_summary.get("mailPanelRewardChipMinHeight")) < 44:
        failures.append("mailPanelRewardChipMinHeight<44")
    if _as_int(page_summary.get("mailPanelRewardStripTopOffset")) < 24:
        failures.append("mailPanelRewardStripTopOffset<24")
    if page_summary.get("mailPanelCategoryFilterMode") != "system_rewards_and_current_organization_tabs_v2":
        failures.append("mailPanelCategoryFilterMode!=system_rewards_and_current_organization_tabs_v2")
    if page_summary.get("mailPanelHeaderCopyMode") != "compact_split_inbox_no_hero_v3":
        failures.append("mailPanelHeaderCopyMode!=compact_split_inbox_no_hero_v3")
    if bool(page_summary.get("mailPanelLegacyRelayTitlePresent", True)):
        failures.append("mailPanelLegacyRelayTitlePresent!=false")
    if bool(page_summary.get("mailPanelHeroStripVisible", True)):
        failures.append("mailPanelHeroStripVisible!=false")
    if bool(page_summary.get("mailPanelBodyLifted", False)) is not True:
        failures.append("mailPanelBodyLifted!=true")
    if page_summary.get("mailPanelTabUnreadBadgeMode") != "panel_tab_badge_count_v1":
        failures.append("mailPanelTabUnreadBadgeMode!=panel_tab_badge_count_v1")
    if _as_int(page_summary.get("mailPanelTabTextSize")) < 22:
        failures.append("mailPanelTabTextSize<22")
    if _as_int(page_summary.get("mailPanelUnreadBadgeCount")) < 2:
        failures.append("mailPanelUnreadBadgeCount<2")
    if page_summary.get("mailPanelRowSelectionMode") != "local_mail_row_select_detail_v1":
        failures.append("mailPanelRowSelectionMode!=local_mail_row_select_detail_v1")
    if _as_int(page_summary.get("mailPanelSelectableRowCount")) < 3:
        failures.append("mailPanelSelectableRowCount<3")
    if page_summary.get("mailPanelRowSelectButtonToken") != MAIL_PANEL_ROW_SELECT_BUTTON_TOKEN:
        failures.append(f"mailPanelRowSelectButtonToken!={MAIL_PANEL_ROW_SELECT_BUTTON_TOKEN}")
    if page_summary.get("mailPanelRowSelectLiveTextContract") != MAIL_PANEL_ROW_SELECT_LIVE_TEXT_CONTRACT:
        failures.append(f"mailPanelRowSelectLiveTextContract!={MAIL_PANEL_ROW_SELECT_LIVE_TEXT_CONTRACT}")
    row_select_button_count = _as_int(page_summary.get("mailPanelRowSelectButtonVisibleCount"), -1)
    if row_select_button_count < 3:
        failures.append("mailPanelRowSelectButtonVisibleCount<3")
    if _as_int(page_summary.get("mailPanelRowSelectButtonTokenCount"), -1) != row_select_button_count:
        failures.append("mailPanelRowSelectButtonTokenCount!=mailPanelRowSelectButtonVisibleCount")
    if _as_int(page_summary.get("mailPanelRowSelectButtonMissingMetaCount"), -1) != 0:
        failures.append("mailPanelRowSelectButtonMissingMetaCount!=0")
    row_select_action_ids = str(page_summary.get("mailPanelRowSelectActionIds", ""))
    if "mail_select:mail_daily_welfare" not in row_select_action_ids:
        failures.append("mailPanelRowSelectActionIds missing mail_select:mail_daily_welfare")
    if str(page_summary.get("mailPanelRowSelectLabels", "")).strip() == "":
        failures.append("mailPanelRowSelectLabels empty")
    if bool(page_summary.get("mailPanelHeroStatsVisible", True)):
        failures.append("mailPanelHeroStatsVisible!=false")
    if _as_int(page_summary.get("mailPanelHeroStatCount")) != 0:
        failures.append("mailPanelHeroStatCount!=0")
    if page_summary.get("mailPanelListScrollMode") != "hidden_scrollbar_touch_mouse_drag_v1":
        failures.append("mailPanelListScrollMode!=hidden_scrollbar_touch_mouse_drag_v1")
    if page_summary.get("mailPanelDetailScrollMode") != "hidden_scrollbar_touch_mouse_drag_v1":
        failures.append("mailPanelDetailScrollMode!=hidden_scrollbar_touch_mouse_drag_v1")
    if page_summary.get("mailPanelDetailWidthBiasMode") != "detail_dominant_split_v1":
        failures.append("mailPanelDetailWidthBiasMode!=detail_dominant_split_v1")
    if page_summary.get("mailPanelListPreviewMode") != "fixed_height_clamped_preview_v1":
        failures.append("mailPanelListPreviewMode!=fixed_height_clamped_preview_v1")
    if _as_int(page_summary.get("mailPanelOrganizationItemCount")) < 2:
        failures.append("mailPanelOrganizationItemCount<2")
    if _as_int(page_summary.get("mailPanelRewardPreviewCount")) != 0:
        failures.append("mailPanelRewardPreviewCount!=0")
    if _as_int(page_summary.get("mailPanelDetailLineCount")) < 3:
        failures.append("mailPanelDetailLineCount<3")
    if "mail_inbox_split" not in page_summary.get("contentBlockKinds", []):
        failures.append("contentBlockKinds missing mail_inbox_split")
    return failures


def _validate_battle_report_detail_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if page_summary.get("battleReportDetailTabButtonToken") != BATTLE_REPORT_DETAIL_TAB_BUTTON_TOKEN:
        failures.append(f"battleReportDetailTabButtonToken!={BATTLE_REPORT_DETAIL_TAB_BUTTON_TOKEN}")
    if _as_int(page_summary.get("battleReportDetailTabButtonMinWidth")) != 132:
        failures.append("battleReportDetailTabButtonMinWidth!=132")
    if _as_int(page_summary.get("battleReportDetailTabButtonMinHeight")) != 42:
        failures.append("battleReportDetailTabButtonMinHeight!=42")
    if _as_int(page_summary.get("battleReportDetailTabButtonFontSize")) != 15:
        failures.append("battleReportDetailTabButtonFontSize!=15")
    if page_summary.get("battleReportDetailFooterButtonToken") != BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN:
        failures.append(f"battleReportDetailFooterButtonToken!={BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN}")
    if page_summary.get("battleReportDetailButtonLiveTextContract") != BATTLE_REPORT_DETAIL_BUTTON_LIVE_TEXT_CONTRACT:
        failures.append(f"battleReportDetailButtonLiveTextContract!={BATTLE_REPORT_DETAIL_BUTTON_LIVE_TEXT_CONTRACT}")
    if _as_int(page_summary.get("battleReportDetailGovernedButtonVisibleCount"), 0) < 6:
        failures.append("battleReportDetailGovernedButtonVisibleCount<6")
    if _as_int(page_summary.get("battleReportDetailGovernedButtonTokenCount"), 0) < _as_int(page_summary.get("battleReportDetailGovernedButtonVisibleCount"), 0):
        failures.append("battleReportDetailGovernedButtonTokenCount<visible")
    if _as_int(page_summary.get("battleReportDetailGovernedButtonMissingMetaCount"), 0) != 0:
        failures.append("battleReportDetailGovernedButtonMissingMetaCount!=0")
    governed_labels = str(page_summary.get("battleReportDetailGovernedButtonLabels", ""))
    for label in ["分享", "收藏", "战斗地点", "统计 / 战法", "阵容详情", "返回列表"]:
        if label not in governed_labels:
            failures.append(f"battleReportDetailGovernedButtonLabelMissing:{label}")
    governed_action_ids = str(page_summary.get("battleReportDetailGovernedButtonActionIds", ""))
    for action_id in [
        "battle_report_detail_share",
        "battle_report_detail_favorite",
        "battle_report_detail_tab:battlefield",
        "battle_report_detail_tab:stats",
        "battle_report_detail_tab:formation",
        "battle_report_detail_back",
    ]:
        if action_id not in governed_action_ids:
            failures.append(f"battleReportDetailGovernedButtonActionIdMissing:{action_id}")
    if _as_int(page_summary.get("battleReportDetailShareButtonMinWidth")) != 104:
        failures.append("battleReportDetailShareButtonMinWidth!=104")
    if _as_int(page_summary.get("battleReportDetailFavoriteButtonMinWidth")) != 104:
        failures.append("battleReportDetailFavoriteButtonMinWidth!=104")
    if _as_int(page_summary.get("battleReportDetailReplayButtonMinWidth")) != 104:
        failures.append("battleReportDetailReplayButtonMinWidth!=104")
    if _as_int(page_summary.get("battleReportDetailCollapseButtonMinWidth")) != 124:
        failures.append("battleReportDetailCollapseButtonMinWidth!=124")
    if _as_int(page_summary.get("battleReportDetailFooterButtonMinHeight")) != 42:
        failures.append("battleReportDetailFooterButtonMinHeight!=42")
    if _as_int(page_summary.get("battleReportDetailFooterButtonFontSize")) != 15:
        failures.append("battleReportDetailFooterButtonFontSize!=15")
    if page_summary.get("battleReportDetailInfoBlockToken") != BATTLE_REPORT_DETAIL_EMPTY_BLOCK_TOKEN:
        failures.append(f"battleReportDetailInfoBlockToken!={BATTLE_REPORT_DETAIL_EMPTY_BLOCK_TOKEN}")
    if _as_int(page_summary.get("battleReportDetailInfoBlockMinHeight")) != 156:
        failures.append("battleReportDetailInfoBlockMinHeight!=156")
    if _as_int(page_summary.get("battleReportDetailInfoBlockTitleFontSize")) != 16:
        failures.append("battleReportDetailInfoBlockTitleFontSize!=16")
    if _as_int(page_summary.get("battleReportDetailInfoBlockLineFontSize")) != 13:
        failures.append("battleReportDetailInfoBlockLineFontSize!=13")
    if _as_int(page_summary.get("battleReportDetailStructureBoxFontSize")) != 13:
        failures.append("battleReportDetailStructureBoxFontSize!=13")
    if page_summary.get("battleReportDetailVisualStageToken") != BATTLE_REPORT_DETAIL_VISUAL_STAGE_TOKEN:
        failures.append(f"battleReportDetailVisualStageToken!={BATTLE_REPORT_DETAIL_VISUAL_STAGE_TOKEN}")
    if page_summary.get("battleReportDetailRuntimeVisualStageToken") != BATTLE_REPORT_DETAIL_VISUAL_STAGE_TOKEN:
        failures.append(f"battleReportDetailRuntimeVisualStageToken!={BATTLE_REPORT_DETAIL_VISUAL_STAGE_TOKEN}")
    if page_summary.get("battleReportDetailResultFocusToken") != BATTLE_REPORT_DETAIL_RESULT_FOCUS_TOKEN:
        failures.append(f"battleReportDetailResultFocusToken!={BATTLE_REPORT_DETAIL_RESULT_FOCUS_TOKEN}")
    if page_summary.get("battleReportDetailRuntimeResultFocusToken") != BATTLE_REPORT_DETAIL_RESULT_FOCUS_TOKEN:
        failures.append(f"battleReportDetailRuntimeResultFocusToken!={BATTLE_REPORT_DETAIL_RESULT_FOCUS_TOKEN}")
    if page_summary.get("battleReportDetailCardCompositionToken") != BATTLE_REPORT_DETAIL_CARD_COMPOSITION_TOKEN:
        failures.append("battleReportDetailCardCompositionToken!=battle_report_detail_card_composition_v1")
    if page_summary.get("battleReportDetailRuntimeCardCompositionToken") != BATTLE_REPORT_DETAIL_CARD_COMPOSITION_TOKEN:
        failures.append("battleReportDetailRuntimeCardCompositionToken!=battle_report_detail_card_composition_v1")
    if page_summary.get("battleReportDetailAiLivingFeedbackToken") != BATTLE_REPORT_DETAIL_AI_LIVING_FEEDBACK_TOKEN:
        failures.append("battleReportDetailAiLivingFeedbackToken!=battle_report_detail_ai_living_feedback_v1")
    if page_summary.get("battleReportDetailAiActivityContinuityToken") != BATTLE_REPORT_DETAIL_AI_ACTIVITY_CONTINUITY_TOKEN:
        failures.append("battleReportDetailAiActivityContinuityToken!=battle_report_detail_ai_activity_continuity_v1")
    if page_summary.get("battleReportFirstOpenStampMotionToken") != "battle_report_first_open_stamp_motion_v1":
        failures.append("battleReportFirstOpenStampMotionToken!=battle_report_first_open_stamp_motion_v1")
    if page_summary.get("battleReportFirstOpenStampVisible") is not True:
        failures.append("battleReportFirstOpenStampVisible!=true")
    if page_summary.get("battleReportFirstOpenStampMotionBound") is not True:
        failures.append("battleReportFirstOpenStampMotionBound!=true")
    if str(page_summary.get("activePageId", "")) == "battlefield":
        if page_summary.get("battleReportDetailAiLivingFeedbackVisible") is not True:
            failures.append("battleReportDetailAiLivingFeedbackVisible!=true")
        if page_summary.get("battleReportDetailAiLivingFeedbackActorVisible") is not True:
            failures.append("battleReportDetailAiLivingFeedbackActorVisible!=true")
        if page_summary.get("battleReportDetailAiLivingFeedbackActionVisible") is not True:
            failures.append("battleReportDetailAiLivingFeedbackActionVisible!=true")
        if page_summary.get("battleReportDetailAiLivingFeedbackReasonVisible") is not True:
            failures.append("battleReportDetailAiLivingFeedbackReasonVisible!=true")
        if page_summary.get("battleReportDetailAiLivingFeedbackResultVisible") is not True:
            failures.append("battleReportDetailAiLivingFeedbackResultVisible!=true")
        if page_summary.get("battleReportDetailAiActivityContinuityVisible") is not True:
            failures.append("battleReportDetailAiActivityContinuityVisible!=true")
        if page_summary.get("battleReportDetailAiActivityAvatarVisible") is not True:
            failures.append("battleReportDetailAiActivityAvatarVisible!=true")
        if page_summary.get("battleReportDetailAiActivityAvatarStatusFrameFamilyContract") != AI_AVATAR_STATUS_FRAME_FAMILY_TOKEN:
            failures.append("battleReportDetailAiActivityAvatarStatusFrameFamilyContract!=ai_avatar_status_frame_family_v1")
        if page_summary.get("battleReportDetailAiActivityAvatarStatusFrameVisible") is not True:
            failures.append("battleReportDetailAiActivityAvatarStatusFrameVisible!=true")
        if page_summary.get("battleReportDetailAiActivityAvatarIntentBadgeVisible") is not True:
            failures.append("battleReportDetailAiActivityAvatarIntentBadgeVisible!=true")
        if page_summary.get("battleReportDetailAiActivityStatusDotVisible") is not True:
            failures.append("battleReportDetailAiActivityStatusDotVisible!=true")
        if _as_int(page_summary.get("battleReportDetailAiActivityTraceCount"), 0) < 1:
            failures.append("battleReportDetailAiActivityTraceCount<1")
        if page_summary.get("battleReportDetailAiActivityCarryingTroopsChipContract") != AI_ACTIVITY_CARRYING_TROOPS_CHIP_TOKEN:
            failures.append("battleReportDetailAiActivityCarryingTroopsChipContract!=ai_activity_carrying_troops_chip_v1")
        if page_summary.get("battleReportDetailAiActivityCarryingTroopsGeneratedAssetSource") != GENERATED_TROOPS_ILLUSTRATION_SOURCE:
            failures.append("battleReportDetailAiActivityCarryingTroopsGeneratedAssetSource!=generated_troops_illustration_v1")
        if page_summary.get("battleReportDetailAiActivityCarryingTroopsChipVisible") is not True:
            failures.append("battleReportDetailAiActivityCarryingTroopsChipVisible!=true")
        if _as_int(page_summary.get("battleReportDetailAiActivityCarryingTroopsSlotCount"), 0) != 3:
            failures.append("battleReportDetailAiActivityCarryingTroopsSlotCount!=3")
        if _as_int(page_summary.get("battleReportDetailAiActivityCarryingTroopsTextureCount"), 0) != 3:
            failures.append("battleReportDetailAiActivityCarryingTroopsTextureCount!=3")
        carrying_troop_labels = page_summary.get("battleReportDetailAiActivityCarryingTroopsLabels", [])
        if isinstance(carrying_troop_labels, list):
            if len([label for label in carrying_troop_labels if str(label).strip()]) < 3:
                failures.append("battleReportDetailAiActivityCarryingTroopsLabels=empty")
        elif not str(carrying_troop_labels).strip():
            failures.append("battleReportDetailAiActivityCarryingTroopsLabels=empty")
    if page_summary.get("battleReportDetailCardCompositionMode") != "opposed_army_result_focus_footer_tabs_v1":
        failures.append("battleReportDetailCardCompositionMode!=opposed_army_result_focus_footer_tabs_v1")
    if page_summary.get("battleReportDetailRuntimeCardCompositionMode") != "opposed_army_result_focus_footer_tabs_v1":
        failures.append("battleReportDetailRuntimeCardCompositionMode!=opposed_army_result_focus_footer_tabs_v1")
    if page_summary.get("battleReportDetailRuntimeCardCompositionOrder") != "attacker_result_defender":
        failures.append("battleReportDetailRuntimeCardCompositionOrder!=attacker_result_defender")
    if page_summary.get("battleReportDetailRuntimeCardCompositionFocus") != "primary_reward_replay_focus":
        failures.append("battleReportDetailRuntimeCardCompositionFocus!=primary_reward_replay_focus")
    if page_summary.get("battleReportDetailTeamCardToken") != BATTLE_REPORT_DETAIL_TEAM_CARD_TOKEN:
        failures.append(f"battleReportDetailTeamCardToken!={BATTLE_REPORT_DETAIL_TEAM_CARD_TOKEN}")
    if page_summary.get("battleReportDetailRuntimeTeamCardToken") != BATTLE_REPORT_DETAIL_TEAM_CARD_TOKEN:
        failures.append(f"battleReportDetailRuntimeTeamCardToken!={BATTLE_REPORT_DETAIL_TEAM_CARD_TOKEN}")
    if page_summary.get("battleReportDetailRewardPanelToken") != BATTLE_REPORT_DETAIL_REWARD_PANEL_TOKEN:
        failures.append(f"battleReportDetailRewardPanelToken!={BATTLE_REPORT_DETAIL_REWARD_PANEL_TOKEN}")
    if page_summary.get("battleReportDetailRuntimeRewardPanelToken") != BATTLE_REPORT_DETAIL_REWARD_PANEL_TOKEN:
        failures.append(f"battleReportDetailRuntimeRewardPanelToken!={BATTLE_REPORT_DETAIL_REWARD_PANEL_TOKEN}")
    if page_summary.get("battleReportDetailRewardCopyMode") != BATTLE_REPORT_DETAIL_REWARD_COPY_MODE:
        failures.append(f"battleReportDetailRewardCopyMode!={BATTLE_REPORT_DETAIL_REWARD_COPY_MODE}")
    if page_summary.get("battleReportDetailRuntimeRewardCopyMode") != BATTLE_REPORT_DETAIL_REWARD_COPY_MODE:
        failures.append(f"battleReportDetailRuntimeRewardCopyMode!={BATTLE_REPORT_DETAIL_REWARD_COPY_MODE}")
    if page_summary.get("battleReportDetailHeroInfoMode") != BATTLE_REPORT_DETAIL_HERO_INFO_MODE:
        failures.append(f"battleReportDetailHeroInfoMode!={BATTLE_REPORT_DETAIL_HERO_INFO_MODE}")
    if page_summary.get("battleReportDetailRuntimeHeroInfoMode") != BATTLE_REPORT_DETAIL_HERO_INFO_MODE:
        failures.append(f"battleReportDetailRuntimeHeroInfoMode!={BATTLE_REPORT_DETAIL_HERO_INFO_MODE}")
    if page_summary.get("battleReportDetailSearchVisibilityMode") != BATTLE_REPORT_DETAIL_SEARCH_VISIBILITY_MODE:
        failures.append(f"battleReportDetailSearchVisibilityMode!={BATTLE_REPORT_DETAIL_SEARCH_VISIBILITY_MODE}")
    if page_summary.get("battleReportSearchButtonVisible") is not False:
        failures.append("battleReportSearchButtonVisible!=false on detail")
    if page_summary.get("battleReportDetailReplayVisible") is not True:
        failures.append("battleReportDetailReplayVisible!=true")
    if page_summary.get("battleReportDetailOutcomeNoteVisible") is not False:
        failures.append("battleReportDetailOutcomeNoteVisible!=false")
    if page_summary.get("battleReportDetailRewardContainsSummaryCopy") is not False:
        failures.append("battleReportDetailRewardContainsSummaryCopy!=false")
    if page_summary.get("battleReportDetailRewardContainsReplayCopy") is not False:
        failures.append("battleReportDetailRewardContainsReplayCopy!=false")
    if page_summary.get("battleReportDetailHeroDeltaLineVisible") is not False:
        failures.append("battleReportDetailHeroDeltaLineVisible!=false")
    if _as_int(page_summary.get("battleReportDetailResultCardMinWidth")) != 188:
        failures.append("battleReportDetailResultCardMinWidth!=188")
    if _as_int(page_summary.get("battleReportDetailOutcomeCardMinWidth")) != 196:
        failures.append("battleReportDetailOutcomeCardMinWidth!=196")
    if _as_int(page_summary.get("battleReportDetailResultFontSize")) != 42:
        failures.append("battleReportDetailResultFontSize!=42")
    if _as_int(page_summary.get("battleReportDetailOutcomeNoteFontSize")) != 14:
        failures.append("battleReportDetailOutcomeNoteFontSize!=14")
    if _as_int(page_summary.get("battleReportDetailTeamPowerFontSize")) != 18:
        failures.append("battleReportDetailTeamPowerFontSize!=18")
    if _as_int(page_summary.get("battleReportDetailTeamNameFontSize")) != 16:
        failures.append("battleReportDetailTeamNameFontSize!=16")
    if _as_int(page_summary.get("battleReportDetailRewardTitleFontSize")) != 20:
        failures.append("battleReportDetailRewardTitleFontSize!=20")
    if _as_int(page_summary.get("battleReportDetailRewardBodyFontSize")) != 17:
        failures.append("battleReportDetailRewardBodyFontSize!=17")
    if _as_int(page_summary.get("battleReportDetailHeroCardMinHeight")) != 404:
        failures.append("battleReportDetailHeroCardMinHeight!=404")
    if _as_int(page_summary.get("battleReportDetailHeroPortraitMinHeight")) != 282:
        failures.append("battleReportDetailHeroPortraitMinHeight!=282")
    if page_summary.get("battleReportDetailPortraitFrameVariant") != BATTLE_REPORT_DETAIL_PORTRAIT_FRAME_VARIANT:
        failures.append(f"battleReportDetailPortraitFrameVariant!={BATTLE_REPORT_DETAIL_PORTRAIT_FRAME_VARIANT}")
    if page_summary.get("battleReportDetailPortraitFitMode") != BATTLE_REPORT_DETAIL_PORTRAIT_FIT_MODE:
        failures.append(f"battleReportDetailPortraitFitMode!={BATTLE_REPORT_DETAIL_PORTRAIT_FIT_MODE}")
    if page_summary.get("battleReportDetailPortraitAssetSource") != BATTLE_REPORT_SAFE_PORTRAIT_ASSET_SOURCE:
        failures.append(f"battleReportDetailPortraitAssetSource!={BATTLE_REPORT_SAFE_PORTRAIT_ASSET_SOURCE}")
    if page_summary.get("battleReportDetailPortraitStageAspect") != BATTLE_REPORT_SAFE_PORTRAIT_STAGE_ASPECT:
        failures.append(f"battleReportDetailPortraitStageAspect!={BATTLE_REPORT_SAFE_PORTRAIT_STAGE_ASPECT}")
    if page_summary.get("battleReportDetailPortraitClipEnabled") is not True:
        failures.append("battleReportDetailPortraitClipEnabled!=true")
    if page_summary.get("battleReportDetailPortraitSafeMargin") != BATTLE_REPORT_SAFE_PORTRAIT_MARGIN:
        failures.append(f"battleReportDetailPortraitSafeMargin!={BATTLE_REPORT_SAFE_PORTRAIT_MARGIN}")
    if page_summary.get("battleReportDetailPortraitRegistryId") != PORTRAIT_FRAME_REGISTRY_ID:
        failures.append(f"battleReportDetailPortraitRegistryId!={PORTRAIT_FRAME_REGISTRY_ID}")
    failures.extend(_validate_battle_report_portrait_source_contract())
    if _as_int(page_summary.get("battleReportDetailHeroRoleFontSize")) != 15:
        failures.append("battleReportDetailHeroRoleFontSize!=15")
    if _as_int(page_summary.get("battleReportDetailHeroNameFontSize")) != 14:
        failures.append("battleReportDetailHeroNameFontSize!=14")
    if _as_int(page_summary.get("battleReportDetailHeroStarFontSize")) != 17:
        failures.append("battleReportDetailHeroStarFontSize!=17")
    if bool(page_summary.get("battleReportDetailMoraleRowVisible", True)):
        failures.append("battleReportDetailMoraleRowVisible!=false")
    if bool(page_summary.get("battleReportDetailRewardNoRewardVisible", True)):
        failures.append("battleReportDetailRewardNoRewardVisible!=false")
    organization_detail_mode = str(page_summary.get("organizationBattleReportDetailMode", ""))
    if organization_detail_mode == "organization_battle_report_detail_page_v2" and _as_int(page_summary.get("battleReportDetailLossLineCount"), 0) < 2:
        failures.append("battleReportDetailLossLineCount<2")
    if bool(page_summary.get("battleReportDetailBattlefieldPlaceholderCopyVisible", True)):
        failures.append("battleReportDetailBattlefieldPlaceholderCopyVisible!=false")
    if _as_int(page_summary.get("battleReportDetailBelowFoldSpacerMinHeight")) != 96:
        failures.append("battleReportDetailBelowFoldSpacerMinHeight!=96")
    if _as_int(page_summary.get("battleReportDetailBelowFoldTitleFontSize")) != 17:
        failures.append("battleReportDetailBelowFoldTitleFontSize!=17")
    if _as_int(page_summary.get("battleReportDetailReplayButtonFontSize")) != 15:
        failures.append("battleReportDetailReplayButtonFontSize!=15")
    if page_summary.get("battleReportDetailScrollMode") != BATTLE_REPORT_DETAIL_SCROLL_MODE:
        failures.append(f"battleReportDetailScrollMode!={BATTLE_REPORT_DETAIL_SCROLL_MODE}")
    if _as_int(page_summary.get("battleReportDetailScrollVerticalMode"), -1) != BATTLE_REPORT_DETAIL_SCROLL_VERTICAL_MODE_SHOW_NEVER:
        failures.append("battleReportDetailScrollVerticalMode!=show_never")
    if page_summary.get("battleReportDetailStarFallbackPolicy") != BATTLE_REPORT_DETAIL_STAR_FALLBACK_POLICY:
        failures.append(f"battleReportDetailStarFallbackPolicy!={BATTLE_REPORT_DETAIL_STAR_FALLBACK_POLICY}")
    if (
        page_summary.get("battleReportEmptyStateSelectedReportId") == "preview_empty_state"
        and _as_int(page_summary.get("battleReportDetailRenderedThreeStarLabelCount"), -1) != 0
    ):
        failures.append("battleReportDetailRenderedThreeStarLabelCount!=0 for empty preview")
    return failures


def _validate_recruit_formal_pack_component_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    failures.extend(_validate_recruit_touch_scroll_source_contract())
    try:
        recruit_renderer_source = RECRUIT_FORMAL_PACK_RENDERER_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        recruit_renderer_source = ""
        failures.append(f"recruitMotionSourceReadFailed:{exc}")
    if page_summary.get("recruitMotionSystemToken") != MAINLINE_UI_MOTION_SYSTEM_TOKEN:
        failures.append(f"recruitMotionSystemToken!={MAINLINE_UI_MOTION_SYSTEM_TOKEN}")
    if page_summary.get("recruitMotionScope") != "ui_layer_only":
        failures.append("recruitMotionScope!=ui_layer_only")
    if page_summary.get("recruitMotionPackToken") != "recruit_pack_enter_v1":
        failures.append("recruitMotionPackToken!=recruit_pack_enter_v1")
    if page_summary.get("recruitMotionHeroCardToken") != "recruit_hero_card_enter_v1":
        failures.append("recruitMotionHeroCardToken!=recruit_hero_card_enter_v1")
    if page_summary.get("recruitMotionMethod") != "staggered_alpha_drop_lift_scale":
        failures.append("recruitMotionMethod!=staggered_alpha_drop_lift_scale")
    if page_summary.get("recruitMotionFutureImpact") != "ui_visual_only_no_authority_or_draw_result_change":
        failures.append("recruitMotionFutureImpact!=ui_visual_only_no_authority_or_draw_result_change")
    if "apply_motion_recruit_pack_enter" not in _extract_gdscript_function(recruit_renderer_source, "_build_pack_scroll("):
        failures.append("recruitPackEnterMotionNotUsed")
    if "apply_motion_recruit_hero_card_enter" not in _extract_gdscript_function(recruit_renderer_source, "_build_draw_preview_card_scroll("):
        failures.append("recruitPreviewHeroCardEnterMotionNotUsed")
    if "apply_motion_recruit_hero_card_enter" not in _extract_gdscript_function(recruit_renderer_source, "_build_draw_result_display_panel("):
        failures.append("recruitResultHeroCardEnterMotionNotUsed")
    if page_summary.get("recruitFormalPackActionButtonToken") != RECRUIT_FORMAL_PACK_ACTION_BUTTON_TOKEN:
        failures.append(f"recruitFormalPackActionButtonToken!={RECRUIT_FORMAL_PACK_ACTION_BUTTON_TOKEN}")
    if page_summary.get("recruitDrawCommandBgToken") != RECRUIT_DRAW_COMMAND_BG_TOKEN:
        failures.append(f"recruitDrawCommandBgToken!={RECRUIT_DRAW_COMMAND_BG_TOKEN}")
    if _as_int(page_summary.get("recruitFormalPackActionButtonMinHeight")) != 62:
        failures.append("recruitFormalPackActionButtonMinHeight!=62")
    if _as_int(page_summary.get("recruitFormalPackActionButtonFontSize")) != 20:
        failures.append("recruitFormalPackActionButtonFontSize!=20")
    if _as_int(page_summary.get("recruitFormalPackRepeatButtonMinWidth")) != 188:
        failures.append("recruitFormalPackRepeatButtonMinWidth!=188")
    if _as_int(page_summary.get("recruitFormalPackRepeatButtonMinHeight")) != 50:
        failures.append("recruitFormalPackRepeatButtonMinHeight!=50")
    if page_summary.get("recruitFormalPackResourceChipToken") != RECRUIT_FORMAL_PACK_RESOURCE_CHIP_TOKEN:
        failures.append(f"recruitFormalPackResourceChipToken!={RECRUIT_FORMAL_PACK_RESOURCE_CHIP_TOKEN}")
    if _as_int(page_summary.get("recruitFormalPackResourceChipWidth")) != 128:
        failures.append("recruitFormalPackResourceChipWidth!=128")
    if _as_int(page_summary.get("recruitFormalPackResourceChipHeight")) != 42:
        failures.append("recruitFormalPackResourceChipHeight!=42")
    if _as_int(page_summary.get("recruitFormalPackResourceChipTitleFontSize")) != 14:
        failures.append("recruitFormalPackResourceChipTitleFontSize!=14")
    if _as_int(page_summary.get("recruitFormalPackResourceChipValueFontSize")) != 18:
        failures.append("recruitFormalPackResourceChipValueFontSize!=18")
    if page_summary.get("recruitFormalPackCornerBadgeToken") != RECRUIT_FORMAL_PACK_CORNER_BADGE_TOKEN:
        failures.append(f"recruitFormalPackCornerBadgeToken!={RECRUIT_FORMAL_PACK_CORNER_BADGE_TOKEN}")
    if _as_int(page_summary.get("recruitFormalPackCornerBadgeWidth")) != 36:
        failures.append("recruitFormalPackCornerBadgeWidth!=36")
    if _as_int(page_summary.get("recruitFormalPackCornerBadgeHeight")) != 32:
        failures.append("recruitFormalPackCornerBadgeHeight!=32")
    if _as_int(page_summary.get("recruitFormalPackCornerBadgeFontSize")) != 14:
        failures.append("recruitFormalPackCornerBadgeFontSize!=14")
    if page_summary.get("cardRailLayoutToken") != CARD_RAIL_LAYOUT_TOKEN:
        failures.append(f"cardRailLayoutToken!={CARD_RAIL_LAYOUT_TOKEN}")
    if page_summary.get("cardRailScrollMode") != CARD_RAIL_SCROLL_MODE:
        failures.append(f"cardRailScrollMode!={CARD_RAIL_SCROLL_MODE}")
    if page_summary.get("cardRailScrollbarVisibility") != "hidden":
        failures.append("cardRailScrollbarVisibility!=hidden")
    if page_summary.get("cardRailInputMode") != "touch_mouse_horizontal_drag":
        failures.append("cardRailInputMode!=touch_mouse_horizontal_drag")
    if page_summary.get("recruitFormalPackEmptyPanelToken") != RECRUIT_FORMAL_PACK_EMPTY_PANEL_TOKEN:
        failures.append(f"recruitFormalPackEmptyPanelToken!={RECRUIT_FORMAL_PACK_EMPTY_PANEL_TOKEN}")
    if _as_int(page_summary.get("recruitFormalPackEmptyPanelWidth")) != 420:
        failures.append("recruitFormalPackEmptyPanelWidth!=420")
    if _as_int(page_summary.get("recruitFormalPackEmptyPanelHeight")) != 220:
        failures.append("recruitFormalPackEmptyPanelHeight!=220")
    if _as_int(page_summary.get("recruitFormalPackEmptyPanelTitleFontSize")) != 24:
        failures.append("recruitFormalPackEmptyPanelTitleFontSize!=24")
    if _as_int(page_summary.get("recruitFormalPackEmptyPanelBodyFontSize")) != 14:
        failures.append("recruitFormalPackEmptyPanelBodyFontSize!=14")
    if page_summary.get("recruitFormalPackPricePlateToken") != RECRUIT_FORMAL_PACK_PRICE_PLATE_TOKEN:
        failures.append(f"recruitFormalPackPricePlateToken!={RECRUIT_FORMAL_PACK_PRICE_PLATE_TOKEN}")
    if _as_int(page_summary.get("recruitFormalPackPricePlateHeight")) != 46:
        failures.append("recruitFormalPackPricePlateHeight!=46")
    if _as_int(page_summary.get("recruitFormalPackPricePlateMarginX")) != 8:
        failures.append("recruitFormalPackPricePlateMarginX!=8")
    if _as_int(page_summary.get("recruitFormalPackPricePlateMarginY")) != 5:
        failures.append("recruitFormalPackPricePlateMarginY!=5")
    if _as_int(page_summary.get("recruitFormalPackPricePlateFooterSeparation")) != 7:
        failures.append("recruitFormalPackPricePlateFooterSeparation!=7")
    if _as_int(page_summary.get("recruitFormalPackPricePlateCostFontSize")) != 21:
        failures.append("recruitFormalPackPricePlateCostFontSize!=21")
    if _as_int(page_summary.get("recruitFormalPackPricePlateStatusFontSize")) != 13:
        failures.append("recruitFormalPackPricePlateStatusFontSize!=13")
    if page_summary.get("recruitFormalPackHeaderToken") != RECRUIT_FORMAL_PACK_HEADER_TOKEN:
        failures.append(f"recruitFormalPackHeaderToken!={RECRUIT_FORMAL_PACK_HEADER_TOKEN}")
    if _as_int(page_summary.get("recruitFormalPackHeaderMinHeight")) != 54:
        failures.append("recruitFormalPackHeaderMinHeight!=54")
    if _as_int(page_summary.get("recruitFormalPackHeaderSeparation")) != 12:
        failures.append("recruitFormalPackHeaderSeparation!=12")
    if _as_int(page_summary.get("recruitFormalPackHeaderTitleFontSize")) != 32:
        failures.append("recruitFormalPackHeaderTitleFontSize!=32")
    if _as_int(page_summary.get("recruitFormalPackHeaderStatusFontSize")) != 16:
        failures.append("recruitFormalPackHeaderStatusFontSize!=16")
    if page_summary.get("recruitFormalPackSmallBadgeToken") != RECRUIT_FORMAL_PACK_SMALL_BADGE_TOKEN:
        failures.append(f"recruitFormalPackSmallBadgeToken!={RECRUIT_FORMAL_PACK_SMALL_BADGE_TOKEN}")
    if _as_int(page_summary.get("recruitFormalPackSmallBadgeMarginX")) != 7:
        failures.append("recruitFormalPackSmallBadgeMarginX!=7")
    if _as_int(page_summary.get("recruitFormalPackSmallBadgeMarginY")) != 3:
        failures.append("recruitFormalPackSmallBadgeMarginY!=3")
    if _as_int(page_summary.get("recruitFormalPackSmallBadgeFontSize")) != 13:
        failures.append("recruitFormalPackSmallBadgeFontSize!=13")
    if page_summary.get("recruitFormalPackStateLineToken") != RECRUIT_FORMAL_PACK_STATE_LINE_TOKEN:
        failures.append(f"recruitFormalPackStateLineToken!={RECRUIT_FORMAL_PACK_STATE_LINE_TOKEN}")
    if _as_int(page_summary.get("recruitFormalPackStateLineSeparation")) != 8:
        failures.append("recruitFormalPackStateLineSeparation!=8")
    if _as_int(page_summary.get("recruitFormalPackStateLineTitleFontSize")) != 14:
        failures.append("recruitFormalPackStateLineTitleFontSize!=14")
    if _as_int(page_summary.get("recruitFormalPackStateLineValueFontSize")) != 14:
        failures.append("recruitFormalPackStateLineValueFontSize!=14")
    return failures


def _validate_battle_report_motion_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    try:
        panel_source = BATTLE_REPORT_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
        list_source = BATTLE_REPORT_LIST_PAGE_SCRIPT_PATH.read_text(encoding="utf-8")
        detail_source = BATTLE_REPORT_DETAIL_PAGE_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"battleReportMotionSourceReadFailed:{exc}"]
    if page_summary.get("battleReportMotionSystemToken") != MAINLINE_UI_MOTION_SYSTEM_TOKEN:
        failures.append(f"battleReportMotionSystemToken!={MAINLINE_UI_MOTION_SYSTEM_TOKEN}")
    if page_summary.get("battleReportMotionScope") != "ui_layer_only":
        failures.append("battleReportMotionScope!=ui_layer_only")
    if page_summary.get("battleReportMotionEnterToken") != "battle_report_list_enter_v1":
        failures.append("battleReportMotionEnterToken!=battle_report_list_enter_v1")
    if page_summary.get("battleReportMotionCardStaggerToken") != "card_stagger_enter_v1":
        failures.append("battleReportMotionCardStaggerToken!=card_stagger_enter_v1")
    if page_summary.get("battleReportMotionMethod") != "page_fade_lift_card_stagger_v1":
        failures.append("battleReportMotionMethod!=page_fade_lift_card_stagger_v1")
    if page_summary.get("battleReportMotionFutureImpact") != "ui_visual_only_no_report_data_or_battle_rule_change":
        failures.append("battleReportMotionFutureImpact!=ui_visual_only_no_report_data_or_battle_rule_change")
    if _as_int(page_summary.get("battleReportMotionEnterDurationMs")) < 380:
        failures.append("battleReportMotionEnterDurationMs<380")
    if abs(_as_float(page_summary.get("battleReportMotionLiftY"))) < 30.0:
        failures.append("battleReportMotionLiftYAbs<30")
    if "apply_motion_battle_report_enter(_panel_frame, 0)" not in panel_source:
        failures.append("battleReportPanelEnterMotionNotUsed")
    if "apply_motion_battle_report_enter(report_card, card_index)" not in list_source:
        failures.append("battleReportListCardMotionNotUsed")
    if "apply_motion_battle_report_enter(_detail_column, 0)" not in detail_source:
        failures.append("battleReportDetailMotionNotUsed")
    return failures


def _validate_interior_motion_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    try:
        interior_source = MAIN_CITY_INTERIOR_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"interiorMotionSourceReadFailed:{exc}"]
    if page_summary.get("interiorMotionSystemToken") != MAINLINE_UI_MOTION_SYSTEM_TOKEN:
        failures.append(f"interiorMotionSystemToken!={MAINLINE_UI_MOTION_SYSTEM_TOKEN}")
    if page_summary.get("interiorMotionScope") != "ui_layer_only":
        failures.append("interiorMotionScope!=ui_layer_only")
    if page_summary.get("interiorMotionSectionEnterToken") != "interior_section_enter_v1":
        failures.append("interiorMotionSectionEnterToken!=interior_section_enter_v1")
    if page_summary.get("interiorMotionCardStaggerToken") != "card_stagger_enter_v1":
        failures.append("interiorMotionCardStaggerToken!=card_stagger_enter_v1")
    if page_summary.get("interiorMotionMethod") != "section_fade_lift_stagger_v1":
        failures.append("interiorMotionMethod!=section_fade_lift_stagger_v1")
    if page_summary.get("interiorMotionFutureImpact") != "ui_visual_only_no_interior_authority_or_backend_change":
        failures.append("interiorMotionFutureImpact!=ui_visual_only_no_interior_authority_or_backend_change")
    if _as_int(page_summary.get("interiorMotionEnterDurationMs")) < 380:
        failures.append("interiorMotionEnterDurationMs<380")
    if abs(_as_float(page_summary.get("interiorMotionLiftY"))) < 30.0:
        failures.append("interiorMotionLiftYAbs<30")
    if "apply_motion_interior_section_enter(host, 0)" not in interior_source:
        failures.append("interiorHostEnterMotionNotUsed")
    if "apply_motion_interior_section_enter(section_view as Control, 0)" not in interior_source:
        failures.append("interiorSectionEnterMotionNotUsed")
    if "apply_motion_interior_section_enter(work_order_card, order_index)" not in interior_source:
        failures.append("interiorWorkOrderCardMotionNotUsed")
    return failures


def _validate_ai_chat_motion_contract(summary: dict[str, Any], source_scope: str = "ai_panel") -> list[str]:
    failures: list[str] = []
    try:
        ai_panel_source = AI_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
        chat_source = MAIN_CHAT_OVERLAY_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"aiChatMotionSourceReadFailed:{exc}"]
    if summary.get("aiChatMotionSystemToken") != MAINLINE_UI_MOTION_SYSTEM_TOKEN:
        failures.append(f"aiChatMotionSystemToken!={MAINLINE_UI_MOTION_SYSTEM_TOKEN}")
    if summary.get("aiChatMotionScope") != "ui_layer_only":
        failures.append("aiChatMotionScope!=ui_layer_only")
    if summary.get("aiChatMotionPanelEnterToken") != "ai_chat_panel_enter_v1":
        failures.append("aiChatMotionPanelEnterToken!=ai_chat_panel_enter_v1")
    if summary.get("aiChatMotionMethod") != "panel_fade_lift_section_stagger_v1":
        failures.append("aiChatMotionMethod!=panel_fade_lift_section_stagger_v1")
    if summary.get("aiChatMotionFutureImpact") != "ui_visual_only_no_ai_provider_voice_or_backend_change":
        failures.append("aiChatMotionFutureImpact!=ui_visual_only_no_ai_provider_voice_or_backend_change")
    if _as_int(summary.get("aiChatMotionEnterDurationMs")) < 380:
        failures.append("aiChatMotionEnterDurationMs<380")
    if abs(_as_float(summary.get("aiChatMotionLiftY"))) < 30.0:
        failures.append("aiChatMotionLiftYAbs<30")
    if source_scope == "ai_panel" and "apply_motion_ai_chat_panel_enter(self, 0)" not in ai_panel_source:
        failures.append("aiPanelEnterMotionNotUsed")
    if source_scope == "chat" and "apply_motion_ai_chat_panel_enter(_chat_panel, 0)" not in chat_source:
        failures.append("chatPanelEnterMotionNotUsed")
    return failures


def _validate_ai_voice_settings_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if page_summary.get("aiVoiceSettingsClosureContract") != "ai_panel_voice_settings_page_v1":
        failures.append("aiVoiceSettingsClosureContract!=ai_panel_voice_settings_page_v1")
    if page_summary.get("activePageId") != "voice" or page_summary.get("aiVoiceSettingsActivePageId") != "voice":
        failures.append("aiVoiceSettingsActivePageId!=voice")
    if page_summary.get("aiVoiceSettingsPageRegistered") is not True:
        failures.append("aiVoiceSettingsPageRegistered!=true")
    if page_summary.get("aiVoiceSettingsPanelLocation") != "ai_panel_voice_page_inline":
        failures.append("aiVoiceSettingsPanelLocation!=ai_panel_voice_page_inline")
    if page_summary.get("aiVoiceSettingsPanelVisible") is not True:
        failures.append("aiVoiceSettingsPanelVisible!=true")
    if str(page_summary.get("aiVoiceSelectedProfileId", "")).strip() == "":
        failures.append("aiVoiceSelectedProfileIdEmpty")
    if page_summary.get("aiVoiceAutoSpeechMode") not in {"off", "auto", "always"}:
        failures.append("aiVoiceAutoSpeechModeInvalid")
    if page_summary.get("aiVoiceClonePlaceholderVisible") is not True:
        failures.append("aiVoiceClonePlaceholderVisible!=true")
    if page_summary.get("aiVoiceProviderNamesHidden") is not True:
        failures.append("aiVoiceProviderNamesHidden!=true")
    if page_summary.get("aiVoiceSettingsPublicFieldsOnly") is not True:
        failures.append("aiVoiceSettingsPublicFieldsOnly!=true")
    if page_summary.get("aiVoiceMotionBoundary") != "ui_settings_only_no_motion_or_provider_change":
        failures.append("aiVoiceMotionBoundary!=ui_settings_only_no_motion_or_provider_change")
    try:
        ai_panel_source = AI_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        failures.append(f"aiVoiceSettingsSourceReadFailed:{exc}")
        return failures
    for forbidden in ["providerMode", ".get(\"provider\"", ".get('provider'", "苏打", "白桦", "冰糖", "茉莉"]:
        if forbidden in ai_panel_source:
            failures.append(f"aiVoiceSettingsProviderInternalSourcePresent:{forbidden}")
    return failures


def _validate_general_motion_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    try:
        general_source = GENERAL_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"generalMotionSourceReadFailed:{exc}"]
    if page_summary.get("generalMotionSystemToken") != MAINLINE_UI_MOTION_SYSTEM_TOKEN:
        failures.append(f"generalMotionSystemToken!={MAINLINE_UI_MOTION_SYSTEM_TOKEN}")
    if page_summary.get("generalMotionScope") != "ui_layer_only":
        failures.append("generalMotionScope!=ui_layer_only")
    if page_summary.get("generalMotionPanelEnterToken") != "general_panel_enter_v1":
        failures.append("generalMotionPanelEnterToken!=general_panel_enter_v1")
    if page_summary.get("generalMotionMethod") != "panel_fade_lift_section_stagger_v1":
        failures.append("generalMotionMethod!=panel_fade_lift_section_stagger_v1")
    if page_summary.get("generalMotionFutureImpact") != "ui_visual_only_no_general_authority_or_backend_change":
        failures.append("generalMotionFutureImpact!=ui_visual_only_no_general_authority_or_backend_change")
    if _as_int(page_summary.get("generalMotionEnterDurationMs")) < 380:
        failures.append("generalMotionEnterDurationMs<380")
    if abs(_as_float(page_summary.get("generalMotionLiftY"))) < 30.0:
        failures.append("generalMotionLiftYAbs<30")
    if "apply_motion_general_panel_enter(content_node, 0)" not in general_source:
        failures.append("generalPanelEnterMotionNotUsed")
    return failures


def _validate_skill_library_motion_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    try:
        general_source = GENERAL_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"skillLibraryMotionSourceReadFailed:{exc}"]
    if page_summary.get("skillLibraryMotionSystemToken") != MAINLINE_UI_MOTION_SYSTEM_TOKEN:
        failures.append(f"skillLibraryMotionSystemToken!={MAINLINE_UI_MOTION_SYSTEM_TOKEN}")
    if page_summary.get("skillLibraryMotionScope") != "ui_layer_only":
        failures.append("skillLibraryMotionScope!=ui_layer_only")
    if page_summary.get("skillLibraryMotionBrowserEnterToken") != "skill_library_browser_enter_v1":
        failures.append("skillLibraryMotionBrowserEnterToken!=skill_library_browser_enter_v1")
    if page_summary.get("skillLibraryMotionCardStaggerToken") != "card_stagger_enter_v1":
        failures.append("skillLibraryMotionCardStaggerToken!=card_stagger_enter_v1")
    if page_summary.get("skillLibraryMotionMethod") != "browser_fade_lift_card_stagger_v1":
        failures.append("skillLibraryMotionMethod!=browser_fade_lift_card_stagger_v1")
    if page_summary.get("skillLibraryMotionFutureImpact") != "ui_visual_only_no_skill_authority_or_backend_change":
        failures.append("skillLibraryMotionFutureImpact!=ui_visual_only_no_skill_authority_or_backend_change")
    if _as_int(page_summary.get("skillLibraryMotionEnterDurationMs")) < 380:
        failures.append("skillLibraryMotionEnterDurationMs<380")
    if abs(_as_float(page_summary.get("skillLibraryMotionLiftY"))) < 30.0:
        failures.append("skillLibraryMotionLiftYAbs<30")
    if "apply_motion_skill_library_browser_enter(library_node, 0)" not in general_source:
        failures.append("skillLibraryBrowserEnterMotionNotUsed")
    return failures


def _validate_troop_motion_contract(page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    try:
        troop_source = TROOP_PANEL_SCRIPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"troopMotionSourceReadFailed:{exc}"]
    if page_summary.get("troopMotionSystemToken") != MAINLINE_UI_MOTION_SYSTEM_TOKEN:
        failures.append(f"troopMotionSystemToken!={MAINLINE_UI_MOTION_SYSTEM_TOKEN}")
    if page_summary.get("troopMotionScope") != "ui_layer_only":
        failures.append("troopMotionScope!=ui_layer_only")
    if page_summary.get("troopMotionPanelEnterToken") != "troop_panel_enter_v1":
        failures.append("troopMotionPanelEnterToken!=troop_panel_enter_v1")
    if page_summary.get("troopMotionCardStaggerToken") != "card_stagger_enter_v1":
        failures.append("troopMotionCardStaggerToken!=card_stagger_enter_v1")
    if page_summary.get("troopMotionMethod") != "panel_fade_lift_button_stagger_v1":
        failures.append("troopMotionMethod!=panel_fade_lift_button_stagger_v1")
    if page_summary.get("troopMotionFutureImpact") != "ui_visual_only_no_troop_authority_or_backend_change":
        failures.append("troopMotionFutureImpact!=ui_visual_only_no_troop_authority_or_backend_change")
    if _as_int(page_summary.get("troopMotionEnterDurationMs")) < 380:
        failures.append("troopMotionEnterDurationMs<380")
    if abs(_as_float(page_summary.get("troopMotionLiftY"))) < 30.0:
        failures.append("troopMotionLiftYAbs<30")
    if "apply_motion_troop_panel_enter(_body_vbox, 0)" not in troop_source:
        failures.append("troopPanelEnterMotionNotUsed")
    if "apply_motion_troop_panel_enter(button, button_index)" not in troop_source:
        failures.append("troopButtonStaggerMotionNotUsed")
    return failures


def _validate_page_summary_contract(action: str, page_summary: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    main_city_enter_stage_actions = {
        "world_click_main_city_node",
        "world_click_main_city_asset_enter_hub",
    }
    if action in main_city_enter_stage_actions:
        if page_summary.get("worldAnchorEntryPopoverToken") != MAIN_CITY_WORLD_ANCHOR_ENTRY_POPOVER_TOKEN:
            failures.append("worldAnchorEntryPopoverToken!=main_city_world_anchor_entry_popover_v1")
        if page_summary.get("worldAssetEntryButtonToken") != MAIN_CITY_WORLD_ASSET_ENTRY_BUTTON_TOKEN:
            failures.append("worldAssetEntryButtonToken!=main_city_world_asset_entry_button_v1")
        if page_summary.get("worldAssetEnterCameraPushToken") != MAIN_CITY_WORLD_ASSET_ENTER_CAMERA_PUSH_TOKEN:
            failures.append("worldAssetEnterCameraPushToken!=main_city_world_asset_enter_camera_push_v1")
        if page_summary.get("worldAssetCameraEaseToken") != MAIN_CITY_WORLD_ASSET_CAMERA_EASE_TOKEN:
            failures.append("worldAssetCameraEaseToken!=main_city_world_asset_camera_ease_v2")
        if page_summary.get("mainCityEnterTransitionMaskToken") != MAIN_CITY_ENTER_TRANSITION_MASK_TOKEN:
            failures.append("mainCityEnterTransitionMaskToken!=main_city_enter_transition_mask_v1")
        if page_summary.get("mainCityEnteredSpaceStageLayoutToken") != MAIN_CITY_ENTERED_SPACE_STAGE_LAYOUT_TOKEN:
            failures.append("mainCityEnteredSpaceStageLayoutToken!=main_city_entered_space_stage_layout_v2")
        if page_summary.get("mainCityGatehouseTransitionToken") != MAIN_CITY_GATEHOUSE_TRANSITION_TOKEN:
            failures.append("mainCityGatehouseTransitionToken!=main_city_gatehouse_axis_mansion_transition_v1")
        if page_summary.get("mainCityMansionHighlightToken") != MAIN_CITY_MANSION_HIGHLIGHT_TOKEN:
            failures.append("mainCityMansionHighlightToken!=main_city_mansion_highlight_focus_v1")
        if page_summary.get("hubCompactEntryRole") != "weak_fallback_not_primary":
            failures.append("hubCompactEntryRole!=weak_fallback_not_primary")
        if bool(page_summary.get("hubCompactButtonPrimaryVisible", True)):
            failures.append("hubCompactButtonPrimaryVisible!=false")
        if page_summary.get("worldAnchorEntryButtonLabels") != "进入主城":
            failures.append("worldAnchorEntryButtonLabels!=进入主城")
        if _as_int(page_summary.get("worldAnchorEntryButtonCount"), 0) != 1:
            failures.append("worldAnchorEntryButtonCount!=1")
        if bool(page_summary.get("worldAnchorEntryAnchoredToTile", False)) is not True:
            failures.append("worldAnchorEntryAnchoredToTile!=true")
        if action == "world_click_main_city_node":
            if bool(page_summary.get("worldAnchorEntryVisible", False)) is not True:
                failures.append("worldAnchorEntryVisible!=true")
            if bool(page_summary.get("expanded", True)):
                failures.append("expanded!=false_before_enter")
        if action == "world_click_main_city_asset_enter_hub":
            if bool(page_summary.get("expanded", False)) is not True:
                failures.append("expanded!=true_after_enter")
            if bool(page_summary.get("worldAnchorEntryVisible", True)):
                failures.append("worldAnchorEntryVisible!=false_after_enter")
            camera_push = page_summary.get("worldAnchorEnterCameraPush", {})
            if not isinstance(camera_push, dict) or not bool(camera_push.get("ok", False)):
                failures.append("worldAnchorEnterCameraPush.ok!=true")
            elif camera_push.get("token") != MAIN_CITY_WORLD_ASSET_ENTER_CAMERA_PUSH_TOKEN:
                failures.append("worldAnchorEnterCameraPush.token!=main_city_world_asset_enter_camera_push_v1")
            elif camera_push.get("cameraEaseToken") != MAIN_CITY_WORLD_ASSET_CAMERA_EASE_TOKEN:
                failures.append("worldAnchorEnterCameraPush.cameraEaseToken!=main_city_world_asset_camera_ease_v2")
            elif camera_push.get("cameraPushMode") != "focus_cell_then_zoom_main_city_asset_eased_v2":
                failures.append("worldAnchorEnterCameraPush.cameraPushMode!=focus_cell_then_zoom_main_city_asset_eased_v2")
            if bool(page_summary.get("mainCityEnteredSpaceStageVisible", False)) is not True:
                failures.append("mainCityEnteredSpaceStageVisible!=true")
            if bool(page_summary.get("mainCitySceneSpatialEntryDockVisible", False)) is not True:
                failures.append("mainCitySceneSpatialEntryDockVisible!=true")
            if bool(page_summary.get("mainCitySceneGatehouseLayerVisible", False)) is not True:
                failures.append("mainCitySceneGatehouseLayerVisible!=true")
            if bool(page_summary.get("mainCitySceneAxisLineVisible", False)) is not True:
                failures.append("mainCitySceneAxisLineVisible!=true")
            if bool(page_summary.get("mainCitySceneMansionHighlightVisible", False)) is not True:
                failures.append("mainCitySceneMansionHighlightVisible!=true")
    if action in MAINLINE_HIGH_FREQUENCY_TOUCH_SCROLL_ACTIONS:
        failures.extend(_validate_mainline_high_frequency_touch_scroll_source_contract())
    failures.extend(_validate_portrait_display_strategy_centralized_source_contract())
    failures.extend(_validate_hero_portrait_asset_ref_source_contract())
    failures.extend(_validate_portrait_asset_registry_direct_path_contract())
    if action in AI_PLAYER_UI_CONTRACT_ACTIONS:
        failures.extend(_validate_ai_panel_presenter_contract())
        failures.extend(_validate_ai_panel_status_pill_contract())
        failures.extend(_validate_ai_panel_first_screen_compact_contract())
        failures.extend(_validate_ai_panel_profile_manager_contract(page_summary))
        failures.extend(_validate_ai_chat_motion_contract(page_summary, "ai_panel"))
        failures.extend(_validate_snapshot_section_touch_scroll_contract())
        failures.extend(_validate_snapshot_section_cover_image_boundary_contract())
        failures.extend(_validate_ai_panel_touch_scroll_contract())
        if bool(page_summary.get("aiDirectExecuteActionVisible", True)):
            failures.append("aiDirectExecuteActionVisible!=false")
        if bool(page_summary.get("aiApprovalOnlyExecuteGuardVerified", False)) is not True:
            failures.append("aiApprovalOnlyExecuteGuardVerified!=true")
        if page_summary.get("aiApprovalOnlyExecuteGuardError") != "approval_only_ui_guard":
            failures.append("aiApprovalOnlyExecuteGuardError!=approval_only_ui_guard")
        if bool(page_summary.get("aiApprovalOnlyExecuteRemoteAttempted", True)):
            failures.append("aiApprovalOnlyExecuteRemoteAttempted!=false")
        if bool(page_summary.get("aiPendingProposalReviewAdapterOk", False)) is not True:
            failures.append("aiPendingProposalReviewAdapterOk!=true")
        if page_summary.get("aiPlayersFirstScreenCopyMode") != "consumer_status_words_v1":
            failures.append("aiPlayersFirstScreenCopyMode!=consumer_status_words_v1")
        if _as_int(page_summary.get("aiPlayersFirstScreenForbiddenCopyCount"), -1) != 0:
            failures.append("aiPlayersFirstScreenForbiddenCopyCount!=0")
        if page_summary.get("aiPanelActionCommandBgToken") != AI_PANEL_ACTION_COMMAND_BG_TOKEN:
            failures.append("aiPanelActionCommandBgToken!=ai_panel_action_command_bg_v1")
        if page_summary.get("aiPanelActionLiveTextContract") != "snapshot_button_row_live_text_v1":
            failures.append("aiPanelActionLiveTextContract!=snapshot_button_row_live_text_v1")
        if _as_int(page_summary.get("aiPanelActionCommandVisibleCount"), 0) <= 0:
            failures.append("aiPanelActionCommandVisibleCount<=0")
        if action == "ai_panel_pending_proposals_review_guard":
            content_block_names = page_summary.get("contentBlockNodeNames", [])
            if not isinstance(content_block_names, list):
                content_block_names = []
            for required_block in (
                "AIPlayerHomeCityStatusBlock",
                "AIPlayerHomeCityActionBlock",
                "AIPlayerHomeCityCandidateActionBlock",
            ):
                if required_block not in content_block_names:
                    failures.append(f"aiPlayerHomeCityBlockMissing:{required_block}")
        if _as_int(page_summary.get("aiPendingProposalCount"), 0) <= 0:
            if bool(page_summary.get("aiPendingProposalReviewButtonRequired", True)):
                failures.append("aiPendingProposalReviewButtonRequired!=false_without_pending")
        elif bool(page_summary.get("aiPendingProposalReviewButtonVisible", False)) is not True:
            failures.append("aiPendingProposalReviewButtonVisible!=true_with_pending")
    if action in AI_PLAYER_ACTION_ROW_CONTRACT_ACTIONS:
        failures.extend(_validate_snapshot_section_touch_scroll_contract())
        failures.extend(_validate_ai_panel_touch_scroll_contract())
        if page_summary.get("aiPanelActionCommandBgToken") != AI_PANEL_ACTION_COMMAND_BG_TOKEN:
            failures.append("aiPanelActionCommandBgToken!=ai_panel_action_command_bg_v1")
        if page_summary.get("aiPanelActionLiveTextContract") != "snapshot_button_row_live_text_v1":
            failures.append("aiPanelActionLiveTextContract!=snapshot_button_row_live_text_v1")
        if page_summary.get("aiPanelActionRowButtonToken") != AI_PANEL_ACTION_COMMAND_BG_TOKEN:
            failures.append("aiPanelActionRowButtonToken!=ai_panel_action_command_bg_v1")
        if page_summary.get("aiPanelActionRowLiveTextContract") != "snapshot_button_row_live_text_v1":
            failures.append("aiPanelActionRowLiveTextContract!=snapshot_button_row_live_text_v1")
        if _as_int(page_summary.get("aiPanelActionRowButtonCount"), 0) <= 0:
            failures.append("aiPanelActionRowButtonCount<=0")
        action_ids = str(page_summary.get("aiPanelActionRowActionIds", ""))
        labels = str(page_summary.get("aiPanelActionRowLabels", ""))
        if "ai_player_open_chat_channel" not in action_ids:
            failures.append("aiPanelActionRowActionIdsMissing:ai_player_open_chat_channel")
        if "打开频道" not in labels and "打开聊天频道" not in labels:
            failures.append("aiPanelActionRowLabelsMissing:打开频道")
        if page_summary.get("aiPanelActionRowClickedActionId") != "ai_player_open_chat_channel":
            failures.append("aiPanelActionRowClickedActionId!=ai_player_open_chat_channel")
        if page_summary.get("aiPanelActionRowClickedToken") != AI_PANEL_ACTION_COMMAND_BG_TOKEN:
            failures.append("aiPanelActionRowClickedToken!=ai_panel_action_command_bg_v1")
        if page_summary.get("aiPanelActionRowClickedLiveTextContract") != "snapshot_button_row_live_text_v1":
            failures.append("aiPanelActionRowClickedLiveTextContract!=snapshot_button_row_live_text_v1")
        if bool(page_summary.get("aiPanelActionRowPanelClosed", False)) is not True:
            failures.append("aiPanelActionRowPanelClosed!=true")
        if bool(page_summary.get("aiPanelActionRowChatOverlayVisibleAfter", False)) is not True:
            failures.append("aiPanelActionRowChatOverlayVisibleAfter!=true")
    if action in AI_PLAYER_LIVING_WORLD_FIRST_SCREEN_ACTIONS:
        failures.extend(_validate_ai_panel_presenter_contract())
        failures.extend(_validate_snapshot_section_touch_scroll_contract())
        failures.extend(_validate_ai_panel_touch_scroll_contract())
    if action in AI_PLAYER_HOME_CITY_BIND_OPEN_CHAIN_ACTIONS:
        binding_status_before = str(page_summary.get("aiHomeCityBindingStatusBefore", "")).strip()
        already_bound_open_path = bool(page_summary.get("aiHomeCityAlreadyBoundOpenPath", False))
        unbound_bind_path = binding_status_before == "unbound"
        bound_open_path = binding_status_before == "bound" and already_bound_open_path
        if not (unbound_bind_path or bound_open_path):
            failures.append("aiHomeCityBindingStatusBeforeNotSupported")
        if unbound_bind_path:
            if _as_int(page_summary.get("aiHomeCityCandidateCount"), 0) <= 0:
                failures.append("aiHomeCityCandidateCount<=0")
            if not str(page_summary.get("aiHomeCitySelectedCenterTileId", "")).strip():
                failures.append("aiHomeCitySelectedCenterTileId=empty")
            if not str(page_summary.get("aiHomeCityBindActionId", "")).startswith("ai_player_home_city_bind:"):
                failures.append("aiHomeCityBindActionIdMissing")
        if binding_status_before == "bound" and not already_bound_open_path:
            failures.append("aiHomeCityAlreadyBoundOpenPath!=true")
        if page_summary.get("mainCityFacilitySource") != "ai_home_city_facility_entry":
            failures.append("mainCityFacilitySource!=ai_home_city_facility_entry")
        if bool(page_summary.get("facilityTreeReadonly", False)) is not True:
            failures.append("facilityTreeReadonly!=true")
        if bool(page_summary.get("aiHomeCityFacilityOpenOk", False)) is not True:
            failures.append("aiHomeCityFacilityOpenOk!=true")
        if bool(page_summary.get("hasFacilityTree", False)) is not True:
            failures.append("aiHomeCityFacilityTreeMissing")
        if page_summary.get("facilityTreeDataSource") != "read_model":
            failures.append("aiHomeCityFacilityTreeDataSource!=read_model")
    if action in AI_PLAYER_HOME_CITY_SWITCH_OPEN_ACTIONS:
        if page_summary.get("aiSwitchOneClickSource") != "AiSwitchButton":
            failures.append("aiSwitchOneClickSource!=AiSwitchButton")
        if page_summary.get("aiSwitchOneClickActionId") != "ai_switch_home_city":
            failures.append("aiSwitchOneClickActionId!=ai_switch_home_city")
        if page_summary.get("aiSwitchOneClickPlacement") != "bottom_nav_recruit_adjacent_main_world":
            failures.append("aiSwitchOneClickPlacement!=bottom_nav_recruit_adjacent_main_world")
        if page_summary.get("aiSwitchOneClickCommandBgToken") != AI_SWITCH_COMMAND_BG_TOKEN:
            failures.append("aiSwitchOneClickCommandBgToken!=ai_switch_command_bg_v1")
        if page_summary.get("aiSwitchOneClickButtonText") != "AI切换":
            failures.append("aiSwitchOneClickButtonText!=AI切换")
        if bool(page_summary.get("aiSwitchOneClickButtonVisible", False)) is not True:
            failures.append("aiSwitchOneClickButtonVisible!=true")
        if bool(page_summary.get("aiSwitchOneClickButtonDisabled", True)):
            failures.append("aiSwitchOneClickButtonDisabled!=false")
        if bool(page_summary.get("aiSwitchOneClickRecruitAdjacentOk", False)) is not True:
            failures.append("aiSwitchOneClickRecruitAdjacentOk!=true")
        if bool(page_summary.get("aiSwitchOneClickShellContractOk", False)) is not True:
            failures.append("aiSwitchOneClickShellContractOk!=true")
        if page_summary.get("mainCityFacilitySource") != "ai_home_city_facility_entry":
            failures.append("aiSwitchMainCityFacilitySource!=ai_home_city_facility_entry")
        if bool(page_summary.get("facilityTreeReadonly", False)) is not True:
            failures.append("aiSwitchFacilityTreeReadonly!=true")
        if bool(page_summary.get("aiSwitchOneClickFacilityOpenOk", False)) is not True:
            failures.append("aiSwitchOneClickFacilityOpenOk!=true")
        if bool(page_summary.get("hasFacilityTree", False)) is not True:
            failures.append("aiSwitchFacilityTreeMissing")
        if page_summary.get("facilityTreeDataSource") != "read_model":
            failures.append("aiSwitchFacilityTreeDataSource!=read_model")
    if action in AI_PLAYER_VOICE_SETTINGS_CONTRACT_ACTIONS:
        failures.extend(_validate_ai_panel_presenter_contract())
        failures.extend(_validate_snapshot_section_touch_scroll_contract())
        failures.extend(_validate_ai_panel_touch_scroll_contract())
        failures.extend(_validate_ai_voice_settings_contract(page_summary))
        failures.extend(_validate_chat_voice_settings_removed_source_contract())
    if action in AI_PLAYER_VOICE_SETTINGS_BUTTON_ACTIONS:
        expected_action_id, expected_label = AI_PLAYER_VOICE_SETTINGS_BUTTON_ACTIONS[action]
        failures.extend(_validate_ai_panel_presenter_contract())
        failures.extend(_validate_snapshot_section_touch_scroll_contract())
        failures.extend(_validate_ai_panel_touch_scroll_contract())
        failures.extend(_validate_ai_voice_settings_contract(page_summary))
        if page_summary.get("aiVoiceActionButtonClickedActionId") != expected_action_id:
            failures.append(f"aiVoiceActionButtonClickedActionId!={expected_action_id}")
        if page_summary.get("aiVoiceActionButtonClickedLabel") != expected_label:
            failures.append(f"aiVoiceActionButtonClickedLabel!={expected_label}")
        if page_summary.get("aiVoiceActionButtonClickedToken") != AI_PANEL_ACTION_COMMAND_BG_TOKEN:
            failures.append(f"aiVoiceActionButtonClickedToken!={AI_PANEL_ACTION_COMMAND_BG_TOKEN}")
        if page_summary.get("aiVoiceActionButtonClickedLiveTextContract") != "snapshot_button_row_live_text_v1":
            failures.append("aiVoiceActionButtonClickedLiveTextContract!=snapshot_button_row_live_text_v1")
        if not str(page_summary.get("aiVoiceActionButtonStatusText", "")).strip():
            failures.append("aiVoiceActionButtonStatusTextEmpty")
        if bool(page_summary.get("aiVoiceActionButtonClickVerified", False)) is not True:
            failures.append("aiVoiceActionButtonClickVerified!=true")
    if action in AI_PLAYER_CHAT_METADATA_CONTRACT_ACTIONS:
        if page_summary.get("aiChatMetadataContractMode") != "presenter_metadata_only_v1":
            failures.append("aiChatMetadataContractMode!=presenter_metadata_only_v1")
        if page_summary.get("aiChatMetadataSource") != "message.metadata":
            failures.append("aiChatMetadataSource!=message.metadata")
        if bool(page_summary.get("aiChatBodyParseForAction", True)):
            failures.append("aiChatBodyParseForAction!=false")
        if bool(page_summary.get("aiChatSuggestedActionExecutesDirectly", True)):
            failures.append("aiChatSuggestedActionExecutesDirectly!=false")
        if bool(page_summary.get("aiChatMetadataDriven", False)) is not True:
            failures.append("aiChatMetadataDriven!=true")
        if bool(page_summary.get("aiChatBodyKeywordIgnored", False)) is not True:
            failures.append("aiChatBodyKeywordIgnored!=true")
        if "主意：" not in str(page_summary.get("aiChatMetadataMetaText", "")):
            failures.append("aiChatMetadataMetaText_missing_suggested_action")
        body_only_meta = str(page_summary.get("aiChatBodyOnlyMetaText", ""))
        if "主意：" in body_only_meta or "战损提醒" in body_only_meta or "紧急" in body_only_meta:
            failures.append("aiChatBodyOnlyMetaText_parsed_body_keywords")
    if action in AI_PLAYER_AUTONOMY_GUARD_CONTRACT_ACTIONS:
        if page_summary.get("aiAutonomyGuardContractMode") != "autonomy_guard_read_model_v1":
            failures.append("aiAutonomyGuardContractMode!=autonomy_guard_read_model_v1")
        if page_summary.get("aiAutonomyGuardSource") != "autonomyGuard":
            failures.append("aiAutonomyGuardSource!=autonomyGuard")
        if bool(page_summary.get("aiAutonomyGuardUsesReadModel", False)) is not True:
            failures.append("aiAutonomyGuardUsesReadModel!=true")
        if bool(page_summary.get("aiAutonomyGuardExecutesDirectly", True)):
            failures.append("aiAutonomyGuardExecutesDirectly!=false")
        if bool(page_summary.get("aiAutonomyGuardPlayerCopyOk", False)) is not True:
            failures.append("aiAutonomyGuardPlayerCopyOk!=true")
    if action in AI_PLAYER_LIST_CARD_CONTRACT_ACTIONS:
        if page_summary.get("aiListCardContractMode") != "runtime_list_card_first_v1":
            failures.append("aiListCardContractMode!=runtime_list_card_first_v1")
        if page_summary.get("aiListCardSource") != "runtime.listCard":
            failures.append("aiListCardSource!=runtime.listCard")
        if bool(page_summary.get("aiListCardUsed", False)) is not True:
            failures.append("aiListCardUsed!=true")
        if bool(page_summary.get("aiListCardRawRuntimeIgnored", False)) is not True:
            failures.append("aiListCardRawRuntimeIgnored!=true")
        if str(page_summary.get("aiListCardValue", "")) != "需查看":
            failures.append("aiListCardValue!=需查看")
        if str(page_summary.get("aiListCardMeta", "")) != "待确认 2":
            failures.append("aiListCardMeta!=待确认 2")
        if "建议次数" in str(page_summary.get("aiListCardDescription", "")):
            failures.append("aiListCardDescription_has_backend_suggestion_copy")
    if action in AI_PLAYER_SECONDARY_COPY_CONTRACT_ACTIONS:
        if page_summary.get("aiSecondaryPagesCopyMode") != "consumer_secondary_pages_v1":
            failures.append("aiSecondaryPagesCopyMode!=consumer_secondary_pages_v1")
        if _as_int(page_summary.get("aiSecondaryPagesForbiddenCopyCount"), -1) != 0:
            failures.append("aiSecondaryPagesForbiddenCopyCount!=0")
        secondary_copy_text = str(page_summary.get("aiSecondaryPagesCopyText", ""))
        if len(secondary_copy_text) > 1250:
            failures.append("aiSecondaryPagesCopyText_too_long")
        if secondary_copy_text.count("待办") > 12:
            failures.append("aiSecondaryPagesCopyText_repeats_pending_copy")
        if secondary_copy_text.count("暂无") > 14:
            failures.append("aiSecondaryPagesCopyText_repeats_empty_copy")
        if secondary_copy_text.count("确认") > 18:
            failures.append("aiSecondaryPagesCopyText_repeats_confirm_copy")
        if "输送资源给总督" in secondary_copy_text or "把可用资源交给总督" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_long_backend_action_copy")
        if "主聊天频道" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_raw_chat_channel_copy")
        if "助手资源" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_backend_resource_pool_copy")
        if "更新：" in secondary_copy_text or "2026-" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_raw_update_timestamp")
        if "确认 待同步" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_confirm_waiting_sync")
        if "现在可交 待同步" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_transfer_waiting_sync")
        if "同步聊天频道" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_sync_chat_channel_copy")
        if "等待第一条聊天记忆" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_waiting_first_memory_copy")
        if "我已同步当前局势" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_synced_current_state_copy")
        if "发育目标：" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_growth_target_label")
        if "还等 " in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_waiting_cooldown_copy")
        if "行动点待同步" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_action_point_waiting_sync")
        if "结果回合：待同步" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_result_tick_waiting_sync")
        if "已同步" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_synced_copy")
        if "同步显示" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_sync_display_copy")
        if "同频显示" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_same_channel_display_copy")
        if "同步" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_sync_word")
        if "刷新议程" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_refresh_agenda_copy")
        if "未启用 保底可用" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_conflicting_fallback_copy")
        if "未启用 未启用" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_duplicate_fallback_copy")
        if "现在可交 可交" in secondary_copy_text:
            failures.append("aiSecondaryPagesCopyText_has_duplicate_transfer_copy")
        for forbidden_term in [
            "当前可用",
            "本轮可用",
            "频道记录",
            "当前批次",
            "来自聊天窗口",
            "是否顺畅",
            "备用",
            "兜底",
            "待入席",
            "现在可交吗",
            "出谋划策",
            "可选建议",
            "等建议",
            "建议次数",
            "待领取资源",
            "待接入",
            "未入席",
            "权威建议",
            "行动建议",
            "AI玩家建议",
            "建议余量",
            "待领取转入",
            "待领转入",
            "聊天整理",
        ]:
            if forbidden_term in secondary_copy_text:
                failures.append(f"aiSecondaryPagesCopyText_has_engineering_copy:{forbidden_term}")
        if bool(page_summary.get("aiSecondaryPagesListCardOk", False)) is not True:
            failures.append("aiSecondaryPagesListCardOk!=true")
        if bool(page_summary.get("aiSecondaryPagesPlayerCopyOk", False)) is not True:
            failures.append("aiSecondaryPagesPlayerCopyOk!=true")
        if bool(page_summary.get("aiReceiptDetailFixtureOk", False)) is not True:
            failures.append("aiReceiptDetailFixtureOk!=true")
        if bool(page_summary.get("aiReceiptDetailTacticalLevelTextOk", False)) is not True:
            failures.append("aiReceiptDetailTacticalLevelTextOk!=true")
        if bool(page_summary.get("aiReceiptDetailOccupyExpTextOk", False)) is not True:
            failures.append("aiReceiptDetailOccupyExpTextOk!=true")
        if bool(page_summary.get("aiReceiptDetailRefreshTextOk", False)) is not True:
            failures.append("aiReceiptDetailRefreshTextOk!=true")
        if bool(page_summary.get("aiReceiptDetailDirectHeroLevelHidden", False)) is not True:
            failures.append("aiReceiptDetailDirectHeroLevelHidden!=true")
    if action in AI_PLAYER_RECEIPT_VISUAL_CONTRACT_ACTIONS:
        failures.extend(_validate_main_chat_overlay_receipt_contract())
        if page_summary.get("aiReceiptDetailVisualContractMode") != "approval_receipt_detail_visual_v1":
            failures.append("aiReceiptDetailVisualContractMode!=approval_receipt_detail_visual_v1")
        if bool(page_summary.get("aiReceiptDetailVisualBlockVisible", False)) is not True:
            failures.append("aiReceiptDetailVisualBlockVisible!=true")
        if bool(page_summary.get("aiReceiptDetailVisualBlockInsideViewport", False)) is not True:
            failures.append("aiReceiptDetailVisualBlockInsideViewport!=true")
        if _as_int(page_summary.get("aiReceiptDetailVisualBlockWidth"), 0) < 520:
            failures.append("aiReceiptDetailVisualBlockWidthTooSmall")
        if _as_int(page_summary.get("aiReceiptDetailVisualBlockHeight"), 0) < 180:
            failures.append("aiReceiptDetailVisualBlockHeightTooSmall")
        if _as_int(page_summary.get("aiReceiptDetailVisualCardCount"), 0) < 6:
            failures.append("aiReceiptDetailVisualCardCount<6")
        if _as_int(page_summary.get("aiReceiptDetailBackendFixtureCount"), 0) < 8:
            failures.append("aiReceiptDetailBackendFixtureCount<8")
        receipt_labels_raw = page_summary.get("aiReceiptDetailVisualActionLabels", [])
        receipt_labels_text = " ".join(str(item) for item in receipt_labels_raw) if isinstance(receipt_labels_raw, list) else str(receipt_labels_raw)
        for expected_label in ["战法升级", "建筑升级", "占地", "交资源", "整补部队", "武将升星"]:
            if expected_label not in receipt_labels_text:
                failures.append(f"aiReceiptDetailVisualMissingActionLabel:{expected_label}")
        if bool(page_summary.get("aiReceiptDetailVisualTextStable", False)) is not True:
            failures.append("aiReceiptDetailVisualTextStable!=true")
        receipt_copy_text = str(page_summary.get("aiReceiptDetailVisualCopyText", ""))
        if "<null>" in receipt_copy_text or "需处理：<null>" in receipt_copy_text:
            failures.append("aiReceiptDetailVisualCopyTextContainsNullFailureCode")
        for expected_detail in ["星级 3->4", "加点 +10"]:
            if expected_detail not in receipt_copy_text:
                failures.append(f"aiReceiptDetailVisualMissingReceiptDetail:{expected_detail}")
        if bool(page_summary.get("aiReceiptDetailDirectHeroLevelHidden", False)) is not True:
            failures.append("aiReceiptDetailDirectHeroLevelHidden!=true")
        if bool(page_summary.get("aiReceiptDetailBackendSchemaAligned", False)) is not True:
            failures.append("aiReceiptDetailBackendSchemaAligned!=true")
        if bool(page_summary.get("aiReceiptDetailRequiredWorldActionsCovered", False)) is not True:
            failures.append("aiReceiptDetailRequiredWorldActionsCovered!=true")
        world_actions_raw = page_summary.get("aiReceiptDetailVisualWorldActions", [])
        world_actions_text = " ".join(str(item) for item in world_actions_raw) if isinstance(world_actions_raw, list) else str(world_actions_raw)
        for expected_world_action in [
            "upgradeTacticalSkill",
            "promoteCityBuilding",
            "occupyTile",
            "transferFactionResourcesToGovernor",
            "healTroop",
            "upgradeHeroStar",
            "gatherAiResourceTile",
            "claimReward",
        ]:
            if expected_world_action not in world_actions_text:
                failures.append(f"aiReceiptDetailVisualMissingWorldAction:{expected_world_action}")
        for ai_action_name in ["resource_transfer_to_governor", "troop_heal", "hero_star_upgrade", "resource_gather", "reward_claim"]:
            if ai_action_name in world_actions_text:
                failures.append(f"aiReceiptDetailVisualWorldActionUsesAiAction:{ai_action_name}")
        if bool(page_summary.get("aiReceiptDetailVisualNoFabricatedWorldReceipts", False)) is not True:
            failures.append("aiReceiptDetailVisualNoFabricatedWorldReceipts!=true")
    if action in AI_PLAYER_RECEIPT_FAILURE_CONTRACT_ACTIONS:
        if page_summary.get("aiReceiptFailureDetailContractMode") != "approval_receipt_failure_detail_v1":
            failures.append("aiReceiptFailureDetailContractMode!=approval_receipt_failure_detail_v1")
        if bool(page_summary.get("aiReceiptFailureDetailBlockVisible", False)) is not True:
            failures.append("aiReceiptFailureDetailBlockVisible!=true")
        if bool(page_summary.get("aiReceiptFailureDetailBlockInsideViewport", False)) is not True:
            failures.append("aiReceiptFailureDetailBlockInsideViewport!=true")
        if _as_int(page_summary.get("aiReceiptFailureDetailBlockWidth"), 0) < 520:
            failures.append("aiReceiptFailureDetailBlockWidthTooSmall")
        if _as_int(page_summary.get("aiReceiptFailureDetailBlockHeight"), 0) < 160:
            failures.append("aiReceiptFailureDetailBlockHeightTooSmall")
        if _as_int(page_summary.get("aiReceiptFailureDetailVisualCardCount"), 0) < 3:
            failures.append("aiReceiptFailureDetailVisualCardCount<3")
        if _as_int(page_summary.get("aiReceiptFailureDetailBackendFixtureCount"), 0) < 3:
            failures.append("aiReceiptFailureDetailBackendFixtureCount<3")
        if bool(page_summary.get("aiReceiptFailureDetailBackendSchemaAligned", False)) is not True:
            failures.append("aiReceiptFailureDetailBackendSchemaAligned!=true")
        if bool(page_summary.get("aiReceiptFailureDetailRequiredWorldActionsCovered", False)) is not True:
            failures.append("aiReceiptFailureDetailRequiredWorldActionsCovered!=true")
        if bool(page_summary.get("aiReceiptFailureDetailNoFabricatedWorldReceipts", False)) is not True:
            failures.append("aiReceiptFailureDetailNoFabricatedWorldReceipts!=true")
        if bool(page_summary.get("aiReceiptFailureDetailVisualTextStable", False)) is not True:
            failures.append("aiReceiptFailureDetailVisualTextStable!=true")
        if bool(page_summary.get("aiReceiptFailureDetailDirectHeroLevelHidden", False)) is not True:
            failures.append("aiReceiptFailureDetailDirectHeroLevelHidden!=true")
        failure_world_actions_raw = page_summary.get("aiReceiptFailureDetailVisualWorldActions", [])
        failure_world_actions_text = " ".join(str(item) for item in failure_world_actions_raw) if isinstance(failure_world_actions_raw, list) else str(failure_world_actions_raw)
        for expected_world_action in ["upgradeTacticalSkill", "promoteCityBuilding", "upgradeHeroStar"]:
            if expected_world_action not in failure_world_actions_text:
                failures.append(f"aiReceiptFailureDetailMissingWorldAction:{expected_world_action}")
        failure_copy_text = str(page_summary.get("aiReceiptFailureDetailVisualCopyText", ""))
        for expected_detail in ["战法升级", "建筑升级", "武将升星", "未完成", "战法已满级", "资源不足", "武将星级已满"]:
            if expected_detail not in failure_copy_text:
                failures.append(f"aiReceiptFailureDetailMissingCopy:{expected_detail}")
        for forbidden_detail in ["<null>", "需处理：<null>", "upgradeHeroLevel", "hero_level_upgrade"]:
            if forbidden_detail in failure_copy_text:
                failures.append(f"aiReceiptFailureDetailForbiddenCopy:{forbidden_detail}")
    if action in AI_PLAYER_RECEIPT_HISTORY_CONTRACT_ACTIONS:
        if page_summary.get("aiReceiptHistoryPaginationContractMode") != "approval_receipt_history_pagination_v1":
            failures.append("aiReceiptHistoryPaginationContractMode!=approval_receipt_history_pagination_v1")
        if bool(page_summary.get("aiReceiptHistoryPaginationBlockVisible", False)) is not True:
            failures.append("aiReceiptHistoryPaginationBlockVisible!=true")
        if bool(page_summary.get("aiReceiptHistoryPaginationBlockInsideViewport", False)) is not True:
            failures.append("aiReceiptHistoryPaginationBlockInsideViewport!=true")
        if _as_int(page_summary.get("aiReceiptHistoryPaginationVisualCardCount"), 0) < 6:
            failures.append("aiReceiptHistoryPaginationVisualCardCount<6")
        if _as_int(page_summary.get("aiReceiptHistoryPaginationBackendFixtureCount"), 0) < 4:
            failures.append("aiReceiptHistoryPaginationBackendFixtureCount<4")
        if bool(page_summary.get("aiReceiptHistoryPaginationBackendSchemaAligned", False)) is not True:
            failures.append("aiReceiptHistoryPaginationBackendSchemaAligned!=true")
        if bool(page_summary.get("aiReceiptHistoryPaginationPageSchemaAligned", False)) is not True:
            failures.append("aiReceiptHistoryPaginationPageSchemaAligned!=true")
        if bool(page_summary.get("aiReceiptHistoryPaginationVisualTextStable", False)) is not True:
            failures.append("aiReceiptHistoryPaginationVisualTextStable!=true")
        if bool(page_summary.get("aiReceiptHistoryPaginationDirectHeroLevelHidden", False)) is not True:
            failures.append("aiReceiptHistoryPaginationDirectHeroLevelHidden!=true")
        if bool(page_summary.get("aiReceiptHistoryPaginationNoFabricatedWorldReceipts", False)) is not True:
            failures.append("aiReceiptHistoryPaginationNoFabricatedWorldReceipts!=true")
        history_world_actions_raw = page_summary.get("aiReceiptHistoryPaginationWorldActions", [])
        history_world_actions_text = " ".join(str(item) for item in history_world_actions_raw) if isinstance(history_world_actions_raw, list) else str(history_world_actions_raw)
        for expected_world_action in ["upgradeTacticalSkill", "promoteCityBuilding", "occupyTile", "upgradeHeroStar"]:
            if expected_world_action not in history_world_actions_text:
                failures.append(f"aiReceiptHistoryPaginationMissingWorldAction:{expected_world_action}")
        history_copy_text = str(page_summary.get("aiReceiptHistoryPaginationVisualCopyText", ""))
        for expected_detail in ["回执历史", "分页游标", "receipt 4/6", "还有更早", "nextBeforeMessageId", "战法升级", "建筑升级", "占地", "武将升星"]:
            if expected_detail not in history_copy_text:
                failures.append(f"aiReceiptHistoryPaginationMissingCopy:{expected_detail}")
        for forbidden_detail in ["<null>", "upgradeHeroLevel", "hero_level_upgrade"]:
            if forbidden_detail in history_copy_text:
                failures.append(f"aiReceiptHistoryPaginationForbiddenCopy:{forbidden_detail}")
    if action in AI_PLAYER_CONTEXT_DOCUMENT_CONTRACT_ACTIONS:
        if page_summary.get("aiContextDocumentPopupResponsiveToken") != "ai_context_file_popup_responsive_v1":
            failures.append("aiContextDocumentPopupResponsiveToken!=ai_context_file_popup_responsive_v1")
        if bool(page_summary.get("aiContextDocumentPopupVisible", False)) is not True:
            failures.append("aiContextDocumentPopupVisible!=true")
        if bool(page_summary.get("aiContextDocumentPopupInsideViewport", False)) is not True:
            failures.append("aiContextDocumentPopupInsideViewport!=true")
        if _as_int(page_summary.get("aiContextDocumentPopupWidth")) > _as_int(page_summary.get("aiContextDocumentViewportWidth")) - 20:
            failures.append("aiContextDocumentPopupWidthTooWide")
        if _as_int(page_summary.get("aiContextDocumentPopupHeight")) > _as_int(page_summary.get("aiContextDocumentViewportHeight")) - 20:
            failures.append("aiContextDocumentPopupHeightTooTall")
    if action in AI_PLAYER_CONTEXT_DOCUMENT_BUTTON_ACTIONS:
        expected_action_id, expected_label = AI_PLAYER_CONTEXT_DOCUMENT_BUTTON_ACTIONS[action]
        failures.extend(_validate_ai_panel_presenter_contract())
        failures.extend(_validate_snapshot_section_touch_scroll_contract())
        failures.extend(_validate_ai_panel_touch_scroll_contract())
        if action == "ai_panel_context_document_cancel_action":
            if page_summary.get("aiContextDocumentCancelClickedActionId") != expected_action_id:
                failures.append(f"aiContextDocumentCancelClickedActionId!={expected_action_id}")
            if page_summary.get("aiContextDocumentCancelClickedLabel") != expected_label:
                failures.append(f"aiContextDocumentCancelClickedLabel!={expected_label}")
            if page_summary.get("aiContextDocumentCancelClickedToken") != AI_PANEL_ACTION_COMMAND_BG_TOKEN:
                failures.append(f"aiContextDocumentCancelClickedToken!={AI_PANEL_ACTION_COMMAND_BG_TOKEN}")
            if page_summary.get("aiContextDocumentCancelClickedLiveTextContract") != "snapshot_button_row_live_text_v1":
                failures.append("aiContextDocumentCancelClickedLiveTextContract!=snapshot_button_row_live_text_v1")
            if bool(page_summary.get("aiContextDocumentCancelPopupVisibleAfterClick", True)):
                failures.append("aiContextDocumentCancelPopupVisibleAfterClick!=false")
            if bool(page_summary.get("aiContextDocumentCancelClickVerified", False)) is not True:
                failures.append("aiContextDocumentCancelClickVerified!=true")
        if action == "ai_panel_context_document_save_action":
            if page_summary.get("aiContextDocumentSaveClickedActionId") != expected_action_id:
                failures.append(f"aiContextDocumentSaveClickedActionId!={expected_action_id}")
            if page_summary.get("aiContextDocumentSaveClickedLabel") != expected_label:
                failures.append(f"aiContextDocumentSaveClickedLabel!={expected_label}")
            if page_summary.get("aiContextDocumentSaveClickedToken") != AI_PANEL_ACTION_COMMAND_BG_TOKEN:
                failures.append(f"aiContextDocumentSaveClickedToken!={AI_PANEL_ACTION_COMMAND_BG_TOKEN}")
            if page_summary.get("aiContextDocumentSaveClickedLiveTextContract") != "snapshot_button_row_live_text_v1":
                failures.append("aiContextDocumentSaveClickedLiveTextContract!=snapshot_button_row_live_text_v1")
            if bool(page_summary.get("aiContextDocumentSavePopupVisibleAfterClick", True)):
                failures.append("aiContextDocumentSavePopupVisibleAfterClick!=false")
            if _as_int(page_summary.get("aiContextDocumentSaveCountAfter")) < max(1, _as_int(page_summary.get("aiContextDocumentSaveCountBefore"))):
                failures.append("aiContextDocumentSaveCountAfterTooSmall")
            if not str(page_summary.get("aiContextDocumentSaveSummaryAfter", "")).strip():
                failures.append("aiContextDocumentSaveSummaryAfterEmpty")
            if bool(page_summary.get("aiContextDocumentSaveClickVerified", False)) is not True:
                failures.append("aiContextDocumentSaveClickVerified!=true")
    if action in AI_PLAYER_DISPLAY_NAME_BUTTON_ACTIONS:
        expected_action_id, expected_label = AI_PLAYER_DISPLAY_NAME_BUTTON_ACTIONS[action]
        failures.extend(_validate_ai_panel_presenter_contract())
        failures.extend(_validate_snapshot_section_touch_scroll_contract())
        failures.extend(_validate_ai_panel_touch_scroll_contract())
        if action == "ai_panel_display_name_cancel_action":
            if page_summary.get("aiDisplayNameCancelClickedActionId") != expected_action_id:
                failures.append(f"aiDisplayNameCancelClickedActionId!={expected_action_id}")
            if page_summary.get("aiDisplayNameCancelClickedLabel") != expected_label:
                failures.append(f"aiDisplayNameCancelClickedLabel!={expected_label}")
            if page_summary.get("aiDisplayNameCancelClickedToken") != AI_PANEL_ACTION_COMMAND_BG_TOKEN:
                failures.append(f"aiDisplayNameCancelClickedToken!={AI_PANEL_ACTION_COMMAND_BG_TOKEN}")
            if page_summary.get("aiDisplayNameCancelClickedLiveTextContract") != "snapshot_button_row_live_text_v1":
                failures.append("aiDisplayNameCancelClickedLiveTextContract!=snapshot_button_row_live_text_v1")
            if bool(page_summary.get("aiDisplayNameCancelPopupVisibleAfterClick", True)):
                failures.append("aiDisplayNameCancelPopupVisibleAfterClick!=false")
            if bool(page_summary.get("aiDisplayNameCancelClickVerified", False)) is not True:
                failures.append("aiDisplayNameCancelClickVerified!=true")
        if action == "ai_panel_display_name_save_action":
            if page_summary.get("aiDisplayNameSaveClickedActionId") != expected_action_id:
                failures.append(f"aiDisplayNameSaveClickedActionId!={expected_action_id}")
            if page_summary.get("aiDisplayNameSaveClickedLabel") != expected_label:
                failures.append(f"aiDisplayNameSaveClickedLabel!={expected_label}")
            if page_summary.get("aiDisplayNameSaveClickedToken") != AI_PANEL_ACTION_COMMAND_BG_TOKEN:
                failures.append(f"aiDisplayNameSaveClickedToken!={AI_PANEL_ACTION_COMMAND_BG_TOKEN}")
            if page_summary.get("aiDisplayNameSaveClickedLiveTextContract") != "snapshot_button_row_live_text_v1":
                failures.append("aiDisplayNameSaveClickedLiveTextContract!=snapshot_button_row_live_text_v1")
            if bool(page_summary.get("aiDisplayNameSavePopupVisibleAfterClick", True)):
                failures.append("aiDisplayNameSavePopupVisibleAfterClick!=false")
            if str(page_summary.get("aiDisplayNameSaveNameAfter", "")).strip() != str(page_summary.get("aiDisplayNameSaveExpectedName", "")).strip():
                failures.append("aiDisplayNameSaveNameAfter!=expected")
            if bool(page_summary.get("aiDisplayNameSaveClickVerified", False)) is not True:
                failures.append("aiDisplayNameSaveClickVerified!=true")
    if action in AI_PLAYER_AVATAR_SELECT_BUTTON_ACTIONS:
        expected_action_id, expected_label = AI_PLAYER_AVATAR_SELECT_BUTTON_ACTIONS[action]
        failures.extend(_validate_ai_panel_presenter_contract())
        failures.extend(_validate_snapshot_section_touch_scroll_contract())
        failures.extend(_validate_ai_panel_touch_scroll_contract())
        if action == "ai_panel_avatar_select_close_action":
            if page_summary.get("aiAvatarSelectCloseClickedActionId") != expected_action_id:
                failures.append(f"aiAvatarSelectCloseClickedActionId!={expected_action_id}")
            if page_summary.get("aiAvatarSelectCloseClickedLabel") != expected_label:
                failures.append(f"aiAvatarSelectCloseClickedLabel!={expected_label}")
            if page_summary.get("aiAvatarSelectCloseClickedToken") != AI_PANEL_ACTION_COMMAND_BG_TOKEN:
                failures.append(f"aiAvatarSelectCloseClickedToken!={AI_PANEL_ACTION_COMMAND_BG_TOKEN}")
            if page_summary.get("aiAvatarSelectCloseClickedLiveTextContract") != "snapshot_button_row_live_text_v1":
                failures.append("aiAvatarSelectCloseClickedLiveTextContract!=snapshot_button_row_live_text_v1")
            if bool(page_summary.get("aiAvatarSelectClosePopupVisibleAfterClick", True)):
                failures.append("aiAvatarSelectClosePopupVisibleAfterClick!=false")
            if bool(page_summary.get("aiAvatarSelectCloseClickVerified", False)) is not True:
                failures.append("aiAvatarSelectCloseClickVerified!=true")
        if action == "ai_panel_avatar_select_option_action":
            if not str(page_summary.get("aiAvatarSelectOptionClickedActionId", "")).startswith(expected_action_id):
                failures.append(f"aiAvatarSelectOptionClickedActionId!prefix={expected_action_id}")
            if not str(page_summary.get("aiAvatarSelectOptionClickedLabel", "")).strip():
                failures.append("aiAvatarSelectOptionClickedLabelEmpty")
            if page_summary.get("aiAvatarSelectOptionClickedToken") != AI_PANEL_ACTION_COMMAND_BG_TOKEN:
                failures.append(f"aiAvatarSelectOptionClickedToken!={AI_PANEL_ACTION_COMMAND_BG_TOKEN}")
            if page_summary.get("aiAvatarSelectOptionClickedLiveTextContract") != "snapshot_button_row_live_text_v1":
                failures.append("aiAvatarSelectOptionClickedLiveTextContract!=snapshot_button_row_live_text_v1")
            if bool(page_summary.get("aiAvatarSelectOptionPopupVisibleAfterClick", True)):
                failures.append("aiAvatarSelectOptionPopupVisibleAfterClick!=false")
            if not str(page_summary.get("aiAvatarSelectOptionExpectedAvatarId", "")).strip():
                failures.append("aiAvatarSelectOptionExpectedAvatarIdEmpty")
            if str(page_summary.get("aiAvatarSelectOptionAvatarIdAfter", "")).strip() != str(page_summary.get("aiAvatarSelectOptionExpectedAvatarId", "")).strip():
                failures.append("aiAvatarSelectOptionAvatarIdAfter!=expected")
            if str(page_summary.get("aiAvatarSelectOptionAvatarImagePathAfter", "")).strip() != str(page_summary.get("aiAvatarSelectOptionExpectedAvatarImagePath", "")).strip():
                failures.append("aiAvatarSelectOptionAvatarImagePathAfter!=expected")
            if bool(page_summary.get("aiAvatarSelectOptionClickVerified", False)) is not True:
                failures.append("aiAvatarSelectOptionClickVerified!=true")
    if action in WORLD_EVENT_ACTIVITY_VISUAL_CONTRACT_ACTIONS:
        failures.extend(
            _validate_design_system_contract(
                page_summary,
                "world_event_activity_shell",
                require_production_baseline=False,
            )
        )
        failures.extend(_validate_module_token_contract(page_summary, "worldEvent"))
        failures.extend(_validate_world_event_activity_shell_contract(page_summary))
        failures.extend(_validate_snapshot_edge_motion_contract(page_summary))
        failures.extend(_validate_snapshot_section_touch_scroll_contract())
        failures.extend(_validate_snapshot_section_cover_image_boundary_contract())
    if action in ALLIANCE_VISUAL_CONTRACT_ACTIONS:
        failures.extend(_validate_alliance_snapshot_touch_motion_contract(page_summary))
    if action in ORGANIZATION_HOME_ENTRY_CLICK_CONTRACT_ACTIONS:
        expected_target_page_id, expected_label = ORGANIZATION_HOME_ENTRY_CLICK_CONTRACT_ACTIONS[action]
        if page_summary.get("activePageId") != expected_target_page_id:
            failures.append(f"organizationActivePageId!={expected_target_page_id}")
        if page_summary.get("organizationHomeEntryClickedTargetPageId") != expected_target_page_id:
            failures.append(f"organizationHomeEntryClickedTargetPageId!={expected_target_page_id}")
        if page_summary.get("organizationHomeEntryClickedLabel") != expected_label:
            failures.append(f"organizationHomeEntryClickedLabel!={expected_label}")
        if page_summary.get("organizationHomeEntryClickedButtonToken") != ORGANIZATION_HOME_ENTRY_BUTTON_TOKEN:
            failures.append(f"organizationHomeEntryClickedButtonToken!={ORGANIZATION_HOME_ENTRY_BUTTON_TOKEN}")
        if page_summary.get("organizationHomeEntryClickedLiveTextContract") != ORGANIZATION_HOME_ENTRY_LIVE_TEXT_CONTRACT:
            failures.append(f"organizationHomeEntryClickedLiveTextContract!={ORGANIZATION_HOME_ENTRY_LIVE_TEXT_CONTRACT}")
        if bool(page_summary.get("organizationHomeEntryClickVerified", False)) is not True:
            failures.append("organizationHomeEntryClickVerified!=true")
    if action in ORGANIZATION_LIFECYCLE_CONTRACT_ACTIONS:
        failures.extend(_validate_organization_lifecycle_contract(action, page_summary))
        if action in {
            "world_open_main_city_organization_reports",
            "world_open_main_city_organization_report_detail",
            "world_open_main_city_organization_nation_reports",
            "world_open_main_city_organization_nation_report_detail",
            "world_open_main_city_organization_report_detail_back",
        }:
            failures.extend(_validate_battle_report_real_data_state_contract(page_summary))
    if action in SETTINGS_VISUAL_CONTRACT_ACTIONS:
        failures.extend(_validate_settings_panel_contract(page_summary))
        if action == "world_open_main_city_settings_display_font_plus":
            if page_summary.get("settingsActionRowClickedActionId") != "display_font_plus":
                failures.append("settingsActionRowClickedActionId!=display_font_plus")
            if page_summary.get("settingsActionRowClickedLabel") != "字号+":
                failures.append("settingsActionRowClickedLabel!=字号+")
            if page_summary.get("settingsActionRowClickedToken") != SETTINGS_ACTION_ROW_BUTTON_TOKEN:
                failures.append(f"settingsActionRowClickedToken!={SETTINGS_ACTION_ROW_BUTTON_TOKEN}")
            if page_summary.get("settingsActionRowClickedLiveTextContract") != SETTINGS_ACTION_ROW_LIVE_TEXT_CONTRACT:
                failures.append(f"settingsActionRowClickedLiveTextContract!={SETTINGS_ACTION_ROW_LIVE_TEXT_CONTRACT}")
            if bool(page_summary.get("settingsActionRowClickVerified", False)) is not True:
                failures.append("settingsActionRowClickVerified!=true")
        if action == "world_open_main_city_settings_audio_quiet":
            if page_summary.get("settingsActionRowClickedActionId") != "audio_preset_quiet":
                failures.append("settingsActionRowClickedActionId!=audio_preset_quiet")
            if page_summary.get("settingsActionRowClickedLabel") != "安静":
                failures.append("settingsActionRowClickedLabel!=安静")
            if page_summary.get("settingsActionRowClickedToken") != SETTINGS_ACTION_ROW_BUTTON_TOKEN:
                failures.append(f"settingsActionRowClickedToken!={SETTINGS_ACTION_ROW_BUTTON_TOKEN}")
            if page_summary.get("settingsActionRowClickedLiveTextContract") != SETTINGS_ACTION_ROW_LIVE_TEXT_CONTRACT:
                failures.append(f"settingsActionRowClickedLiveTextContract!={SETTINGS_ACTION_ROW_LIVE_TEXT_CONTRACT}")
            if bool(page_summary.get("settingsActionRowClickVerified", False)) is not True:
                failures.append("settingsActionRowClickVerified!=true")
        notice_action_expectations = {
            "world_open_main_city_settings_notice_all": ("notice_level_all", "全部"),
            "world_open_main_city_settings_notice_focus": ("notice_level_focus", "重点"),
            "world_open_main_city_settings_notice_quiet": ("notice_level_quiet", "静默"),
            "world_open_main_city_settings_notice_reset": ("notice_level_reset", "恢复默认"),
        }
        account_action_expectations = {
            "world_open_main_city_settings_account_copy_id": ("account_copy_id", "复制编号"),
            "world_open_main_city_settings_account_privacy": ("account_privacy", "隐私说明"),
            "world_open_main_city_settings_account_clear_cache": ("account_clear_cache", "清理缓存"),
        }
        settings_action_expectations = notice_action_expectations | account_action_expectations
        if action in settings_action_expectations:
            expected_action_id, expected_label = settings_action_expectations[action]
            if page_summary.get("settingsActionRowClickedActionId") != expected_action_id:
                failures.append(f"settingsActionRowClickedActionId!={expected_action_id}")
            if page_summary.get("settingsActionRowClickedLabel") != expected_label:
                failures.append(f"settingsActionRowClickedLabel!={expected_label}")
            if page_summary.get("settingsActionRowClickedToken") != SETTINGS_ACTION_ROW_BUTTON_TOKEN:
                failures.append(f"settingsActionRowClickedToken!={SETTINGS_ACTION_ROW_BUTTON_TOKEN}")
            if page_summary.get("settingsActionRowClickedLiveTextContract") != SETTINGS_ACTION_ROW_LIVE_TEXT_CONTRACT:
                failures.append(f"settingsActionRowClickedLiveTextContract!={SETTINGS_ACTION_ROW_LIVE_TEXT_CONTRACT}")
            if bool(page_summary.get("settingsActionRowClickVerified", False)) is not True:
                failures.append("settingsActionRowClickVerified!=true")
    if action in BATTLE_REPORT_VISUAL_CONTRACT_ACTIONS or action in BATTLE_REPORT_DETAIL_VISUAL_CONTRACT_ACTIONS:
        failures.extend(
            _validate_design_system_contract(
                page_summary,
                "battle_report_shell",
                require_production_baseline=False,
            )
        )
        failures.extend(_validate_module_token_contract(page_summary, "battleReport"))
        failures.extend(_validate_battle_report_shell_contract(page_summary))
        failures.extend(_validate_battle_report_real_data_state_contract(page_summary))
        if action in {"battle_report_seeded_open_list", "battle_report_seeded_open_detail"}:
            failures.extend(_validate_battle_report_seeded_closure_contract(page_summary))
        failures.extend(_validate_battle_report_motion_contract(page_summary))
    if action in MAIL_PANEL_VISUAL_CONTRACT_ACTIONS:
        failures.extend(_validate_mail_panel_contract(page_summary))
        if action == "world_open_main_city_mail_select_reward":
            if page_summary.get("mailPanelSelectedMailId") != "mail_daily_welfare":
                failures.append("mailPanelSelectedMailId!=mail_daily_welfare")
            if _as_int(page_summary.get("mailPanelSelectedRewardLineCount")) < 3:
                failures.append("mailPanelSelectedRewardLineCount<3")
            if page_summary.get("mailPanelRowSelectClickedActionId") != "mail_select:mail_daily_welfare":
                failures.append("mailPanelRowSelectClickedActionId!=mail_select:mail_daily_welfare")
            if str(page_summary.get("mailPanelRowSelectClickedLabel", "")).strip() == "":
                failures.append("mailPanelRowSelectClickedLabel empty")
            if page_summary.get("mailPanelRowSelectClickedToken") != MAIL_PANEL_ROW_SELECT_BUTTON_TOKEN:
                failures.append(f"mailPanelRowSelectClickedToken!={MAIL_PANEL_ROW_SELECT_BUTTON_TOKEN}")
            if page_summary.get("mailPanelRowSelectClickedLiveTextContract") != MAIL_PANEL_ROW_SELECT_LIVE_TEXT_CONTRACT:
                failures.append(f"mailPanelRowSelectClickedLiveTextContract!={MAIL_PANEL_ROW_SELECT_LIVE_TEXT_CONTRACT}")
            if bool(page_summary.get("mailPanelRowSelectClickVerified", False)) is not True:
                failures.append("mailPanelRowSelectClickVerified!=true")
    if action in BATTLE_REPORT_DETAIL_VISUAL_CONTRACT_ACTIONS:
        failures.extend(_validate_battle_report_detail_contract(page_summary))
    if action in BATTLE_REPORT_DETAIL_BUTTON_CLICK_CONTRACT_ACTIONS:
        expected_action_id, expected_label, expected_page_id, expected_token = BATTLE_REPORT_DETAIL_BUTTON_CLICK_CONTRACT_ACTIONS[action]
        if page_summary.get("activePageId") != expected_page_id:
            failures.append(f"battleReportDetailActivePageId!={expected_page_id}")
        if page_summary.get("battleReportDetailButtonClickedActionId") != expected_action_id:
            failures.append(f"battleReportDetailButtonClickedActionId!={expected_action_id}")
        if page_summary.get("battleReportDetailButtonClickedLabel") != expected_label:
            failures.append(f"battleReportDetailButtonClickedLabel!={expected_label}")
        if page_summary.get("battleReportDetailButtonClickedToken") != expected_token:
            failures.append(f"battleReportDetailButtonClickedToken!={expected_token}")
        if page_summary.get("battleReportDetailButtonClickedLiveTextContract") != BATTLE_REPORT_DETAIL_BUTTON_LIVE_TEXT_CONTRACT:
            failures.append(f"battleReportDetailButtonClickedLiveTextContract!={BATTLE_REPORT_DETAIL_BUTTON_LIVE_TEXT_CONTRACT}")
        if bool(page_summary.get("battleReportDetailButtonClickVerified", False)) is not True:
            failures.append("battleReportDetailButtonClickVerified!=true")
    if action in MAIN_CITY_HUB_CONTEXT_CONTRACT_ACTIONS:
        if page_summary.get("hubVisualMode") != "main_city_scene_gateway_v3":
            failures.append("mainCityHubVisualMode!=main_city_scene_gateway_v3")
        if page_summary.get("hubColorMode") != "warm_unified_no_color_grid_v2":
            failures.append("mainCityHubColorMode!=warm_unified_no_color_grid_v2")
        if page_summary.get("hubSceneMode") != "city_space_focus_v1":
            failures.append("mainCityHubSceneMode!=city_space_focus_v1")
        if page_summary.get("hubCinematicIntroToken") != "map_node_to_city_space_push_v1":
            failures.append("mainCityHubCinematicIntroToken!=map_node_to_city_space_push_v1")
        if int(page_summary.get("hubPrimaryEntryCount", 0)) != 2:
            failures.append("mainCityHubPrimaryEntryCount!=2")
        if bool(page_summary.get("hubTabStripVisible", True)) is not False:
            failures.append("mainCityHubTabStripVisible!=false")
        if page_summary.get("hubPrimaryFlow") != "composition_to_troop_facility_tree":
            failures.append("mainCityHubPrimaryFlow!=composition_to_troop_facility_tree")
        if bool(page_summary.get("contextPanelVisible", False)) is not True:
            failures.append("mainCityHubContextPanelVisible!=true")
        if page_summary.get("activeContextTab") != "overview":
            failures.append("mainCityHubActiveContextTab!=overview")
        if bool(page_summary.get("hubContextPanelViewportFill", False)) is not True:
            failures.append("mainCityHubContextPanelViewportFill!=true")
        if bool(page_summary.get("hubOverviewResourceStripVisible", True)) is not False:
            failures.append("mainCityHubOverviewResourceStripVisible!=false")
        if bool(page_summary.get("hubOverviewAnchorBandVisible", True)) is not False:
            failures.append("mainCityHubOverviewAnchorBandVisible!=false")
        if page_summary.get("mainCityHubCardChromeToken") != "main_city_hub_card_chrome_v1":
            failures.append("mainCityHubCardChromeToken!=main_city_hub_card_chrome_v1")
        if page_summary.get("mainCityHubCardChromeSharedFactory") is not True:
            failures.append("mainCityHubCardChromeSharedFactory!=true")
        if _as_int(page_summary.get("mainCityHubCardChromeNodeCount"), 0) < 3:
            failures.append("mainCityHubCardChromeNodeCount<3")
    if action in MAIN_CITY_SCENE_ENTRY_BUTTON_CLICK_CONTRACT_ACTIONS:
        expected_tab_id, expected_label = MAIN_CITY_SCENE_ENTRY_BUTTON_CLICK_CONTRACT_ACTIONS[action]
        expected_action_id = f"main_city_scene_entry:{expected_tab_id}"
        if page_summary.get("hubVisualMode") != "main_city_scene_gateway_v3":
            failures.append("mainCityHubVisualMode!=main_city_scene_gateway_v3")
        if page_summary.get("activeContextTab") != expected_tab_id:
            failures.append(f"mainCitySceneEntryActiveContextTab!={expected_tab_id}")
        if page_summary.get("hubSceneEntryButtonToken") != MAIN_CITY_SCENE_ENTRY_BUTTON_TOKEN:
            failures.append(f"hubSceneEntryButtonToken!={MAIN_CITY_SCENE_ENTRY_BUTTON_TOKEN}")
        if page_summary.get("hubSceneEntryLiveTextContract") != MAIN_CITY_SCENE_ENTRY_LIVE_TEXT_CONTRACT:
            failures.append(f"hubSceneEntryLiveTextContract!={MAIN_CITY_SCENE_ENTRY_LIVE_TEXT_CONTRACT}")
        if _as_int(page_summary.get("hubSceneEntryButtonVisibleCountBeforeClick"), 0) != 2:
            failures.append("hubSceneEntryButtonVisibleCountBeforeClick!=2")
        if _as_int(page_summary.get("hubSceneEntryButtonMissingMetaCountBeforeClick"), 1) != 0:
            failures.append("hubSceneEntryButtonMissingMetaCountBeforeClick!=0")
        if expected_action_id not in str(page_summary.get("hubSceneEntryButtonActionIdsBeforeClick", "")).split("|"):
            failures.append(f"hubSceneEntryButtonActionIdsBeforeClick missing {expected_action_id}")
        if expected_label not in str(page_summary.get("hubSceneEntryButtonLabelsBeforeClick", "")).split("|"):
            failures.append(f"hubSceneEntryButtonLabelsBeforeClick missing {expected_label}")
        if bool(page_summary.get("mainCityEnteredSpaceStageVisibleBeforeEntryClick", False)) is not True:
            failures.append("mainCityEnteredSpaceStageVisibleBeforeEntryClick!=true")
        if bool(page_summary.get("mainCitySceneSpatialEntryDockVisibleBeforeEntryClick", False)) is not True:
            failures.append("mainCitySceneSpatialEntryDockVisibleBeforeEntryClick!=true")
        if page_summary.get("mainCitySceneEntryButtonClickedActionId") != expected_action_id:
            failures.append(f"mainCitySceneEntryButtonClickedActionId!={expected_action_id}")
        if page_summary.get("mainCitySceneEntryButtonClickedLabel") != expected_label:
            failures.append(f"mainCitySceneEntryButtonClickedLabel!={expected_label}")
        if page_summary.get("mainCitySceneEntryButtonClickedToken") != MAIN_CITY_SCENE_ENTRY_BUTTON_TOKEN:
            failures.append(f"mainCitySceneEntryButtonClickedToken!={MAIN_CITY_SCENE_ENTRY_BUTTON_TOKEN}")
        if page_summary.get("mainCitySceneEntryButtonClickedLiveTextContract") != MAIN_CITY_SCENE_ENTRY_LIVE_TEXT_CONTRACT:
            failures.append(f"mainCitySceneEntryButtonClickedLiveTextContract!={MAIN_CITY_SCENE_ENTRY_LIVE_TEXT_CONTRACT}")
        if bool(page_summary.get("mainCitySceneEntryButtonClickVerified", False)) is not True:
            failures.append("mainCitySceneEntryButtonClickVerified!=true")
    if action in MAIN_CITY_SCENE_RETURN_BUTTON_CLICK_CONTRACT_ACTIONS:
        expected_action_id, expected_label = MAIN_CITY_SCENE_RETURN_BUTTON_CLICK_CONTRACT_ACTIONS[action]
        if page_summary.get("hubSceneReturnButtonToken") != MAIN_CITY_SCENE_RETURN_BUTTON_TOKEN:
            failures.append(f"hubSceneReturnButtonToken!={MAIN_CITY_SCENE_RETURN_BUTTON_TOKEN}")
        if page_summary.get("hubSceneReturnLiveTextContract") != MAIN_CITY_SCENE_RETURN_LIVE_TEXT_CONTRACT:
            failures.append(f"hubSceneReturnLiveTextContract!={MAIN_CITY_SCENE_RETURN_LIVE_TEXT_CONTRACT}")
        if page_summary.get("hubSceneReturnCloseBackSpecToken") != CLOSE_BACK_BUTTON_SPEC_TOKEN:
            failures.append("hubSceneReturnCloseBackSpecToken!=close_back_button_spec_v1")
        if page_summary.get("hubSceneReturnButtonRole") != "return_map":
            failures.append("hubSceneReturnButtonRole!=return_map")
        if page_summary.get("hubSceneReturnButtonVariant") != "neutral":
            failures.append("hubSceneReturnButtonVariant!=neutral")
        if _as_int(page_summary.get("hubSceneReturnButtonVisibleCountBeforeClick"), 0) != 1:
            failures.append("hubSceneReturnButtonVisibleCountBeforeClick!=1")
        if _as_int(page_summary.get("hubSceneReturnButtonMissingMetaCountBeforeClick"), 1) != 0:
            failures.append("hubSceneReturnButtonMissingMetaCountBeforeClick!=0")
        if expected_action_id not in str(page_summary.get("hubSceneReturnButtonActionIdsBeforeClick", "")).split("|"):
            failures.append(f"hubSceneReturnButtonActionIdsBeforeClick missing {expected_action_id}")
        if expected_label not in str(page_summary.get("hubSceneReturnButtonLabelsBeforeClick", "")).split("|"):
            failures.append(f"hubSceneReturnButtonLabelsBeforeClick missing {expected_label}")
        if bool(page_summary.get("mainCityEnteredSpaceStageVisibleBeforeReturnClick", False)) is not True:
            failures.append("mainCityEnteredSpaceStageVisibleBeforeReturnClick!=true")
        if bool(page_summary.get("mainCitySceneSpatialEntryDockVisibleBeforeReturnClick", False)) is not True:
            failures.append("mainCitySceneSpatialEntryDockVisibleBeforeReturnClick!=true")
        if page_summary.get("mainCitySceneReturnButtonClickedActionId") != expected_action_id:
            failures.append(f"mainCitySceneReturnButtonClickedActionId!={expected_action_id}")
        if page_summary.get("mainCitySceneReturnButtonClickedLabel") != expected_label:
            failures.append(f"mainCitySceneReturnButtonClickedLabel!={expected_label}")
        if page_summary.get("mainCitySceneReturnButtonClickedToken") != MAIN_CITY_SCENE_RETURN_BUTTON_TOKEN:
            failures.append(f"mainCitySceneReturnButtonClickedToken!={MAIN_CITY_SCENE_RETURN_BUTTON_TOKEN}")
        if page_summary.get("mainCitySceneReturnButtonClickedLiveTextContract") != MAIN_CITY_SCENE_RETURN_LIVE_TEXT_CONTRACT:
            failures.append(f"mainCitySceneReturnButtonClickedLiveTextContract!={MAIN_CITY_SCENE_RETURN_LIVE_TEXT_CONTRACT}")
        if bool(page_summary.get("mainCitySceneReturnButtonClickVerified", False)) is not True:
            failures.append("mainCitySceneReturnButtonClickVerified!=true")
        if bool(page_summary.get("mainCitySceneReturnMapVisibleAfterClick", False)) is not True:
            failures.append("mainCitySceneReturnMapVisibleAfterClick!=true")
        if bool(page_summary.get("expanded", True)):
            failures.append("mainCitySceneReturnExpandedAfterClick!=false")
        if bool(page_summary.get("contextPanelVisible", True)):
            failures.append("mainCitySceneReturnContextPanelVisibleAfterClick!=false")
        if bool(page_summary.get("worldAnchorEntryVisible", True)):
            failures.append("mainCitySceneReturnWorldAnchorEntryVisibleAfterClick!=false")
    if action in MAIN_CITY_CONTEXT_RETURN_BUTTON_CLICK_CONTRACT_ACTIONS:
        expected_action_id, expected_label, expected_button_name = MAIN_CITY_CONTEXT_RETURN_BUTTON_CLICK_CONTRACT_ACTIONS[action]
        if bool(page_summary.get("contextPanelVisibleBeforeClick", False)) is not True:
            failures.append("contextPanelVisibleBeforeClick!=true")
        if page_summary.get("activeContextTabBeforeClick") != "troop":
            failures.append("activeContextTabBeforeClick!=troop")
        if bool(page_summary.get("contextPanelVisibleAfterClick", True)):
            failures.append("contextPanelVisibleAfterClick!=false")
        if page_summary.get("mainCityContextReturnButtonClickedActionId") != expected_action_id:
            failures.append("mainCityContextReturnButtonClickedActionId!=main_city_context_return_map")
        if page_summary.get("mainCityContextReturnButtonClickedLabel") != expected_label:
            failures.append(f"mainCityContextReturnButtonClickedLabel!={expected_label}")
        if page_summary.get("mainCityContextReturnButtonClickedToken") != MAIN_CITY_CONTEXT_RETURN_BUTTON_TOKEN:
            failures.append(f"mainCityContextReturnButtonClickedToken!={MAIN_CITY_CONTEXT_RETURN_BUTTON_TOKEN}")
        if page_summary.get("mainCityContextReturnButtonClickedLiveTextContract") != MAIN_CITY_CONTEXT_RETURN_LIVE_TEXT_CONTRACT:
            failures.append(f"mainCityContextReturnButtonClickedLiveTextContract!={MAIN_CITY_CONTEXT_RETURN_LIVE_TEXT_CONTRACT}")
        if page_summary.get("mainCityContextReturnButtonClickedButtonName") != expected_button_name:
            failures.append(f"mainCityContextReturnButtonClickedButtonName!={expected_button_name}")
        if bool(page_summary.get("mainCityContextReturnButtonClickVerified", False)) is not True:
            failures.append("mainCityContextReturnButtonClickVerified!=true")
        if bool(page_summary.get("authorityTriggered", True)):
            failures.append("authorityTriggered!=false")
    if action in MAIN_CITY_FACILITY_CHAIN_CONTRACT_ACTIONS:
        if page_summary.get("facilityTreeMode") != "standalone":
            failures.append("mainCityFacilityTreeMode!=standalone")
        if page_summary.get("layoutMode") != "fullscreen_overlay":
            failures.append("mainCityFacilityLayoutMode!=fullscreen_overlay")
        if page_summary.get("facilityTreeLayoutDirection") != "vertical":
            failures.append("mainCityFacilityTreeLayoutDirection!=vertical")
        if page_summary.get("facilityTreeExpandAxis") != "north_south":
            failures.append("mainCityFacilityTreeExpandAxis!=north_south")
        if page_summary.get("facilityTreeLayoutToken") != "main_city_facility_tree_vertical_north_south_scroll_v1":
            failures.append("mainCityFacilityTreeLayoutToken!=main_city_facility_tree_vertical_north_south_scroll_v1")
        if bool(page_summary.get("facilityTreePageVisible", False)) is not True:
            failures.append("mainCityFacilityTreePageVisible!=true")
        if bool(page_summary.get("facilityTreeHasCompositionPanel", True)) is not False:
            failures.append("mainCityFacilityTreeHasCompositionPanel!=false")
        if bool(page_summary.get("contextPanelLegacyVisible", True)) is not False:
            failures.append("mainCityFacilityContextPanelLegacyVisible!=false")
        if bool(page_summary.get("hasFacilityTree", False)) is not True:
            failures.append("mainCityFacilityHasFacilityTree!=true")
        if bool(page_summary.get("hasUpgradeSheet", False)) is not True:
            failures.append("mainCityFacilityHasUpgradeSheet!=true")
        if page_summary.get("mainCityFacilitySource") != "map_node_click":
            failures.append("mainCityFacilitySource!=map_node_click")
        if page_summary.get("facilityTreeNodeIconToken") != "main_city_facility_tree_node_icon_v1":
            failures.append("mainCityFacilityTreeNodeIconToken!=main_city_facility_tree_node_icon_v1")
        if page_summary.get("facilityTreeNodeAssetToken") != "main_city_facility_tree_node_asset_v1":
            failures.append("mainCityFacilityTreeNodeAssetToken!=main_city_facility_tree_node_asset_v1")
        if page_summary.get("facilityTreeAssetSetToken") != "main_city_facility_tree_asset_set_v4":
            failures.append("mainCityFacilityTreeAssetSetToken!=main_city_facility_tree_asset_set_v4")
        if page_summary.get("facilityTreeAssetMode") != "generated_magenta_contact_sheet_crops_v4":
            failures.append("mainCityFacilityTreeAssetMode!=generated_magenta_contact_sheet_crops_v4")
        if not str(page_summary.get("facilityTreeAssetManifestPath", "")).endswith("maincity_facility_tree_asset_manifest_v4.json"):
            failures.append("mainCityFacilityTreeAssetManifestPath!=maincity_facility_tree_asset_manifest_v4.json")
        if page_summary.get("facilityTreeDataSource") != "read_model":
            failures.append("mainCityFacilityTreeDataSource!=read_model")
        if page_summary.get("facilityTreeReadModelPath") != "res://data/ui/main_city_facility_tree_read_model.json":
            failures.append("mainCityFacilityTreeReadModelPath!=main_city_facility_tree_read_model.json")
        if page_summary.get("facilityTreeReadModelSchemaVersion") != "main_city_facility_tree_read_model_v2":
            failures.append("mainCityFacilityTreeReadModelSchemaVersion!=v2")
        if page_summary.get("facilityTreeReadModelCostMode") != "structured_cost_items_v1":
            failures.append("mainCityFacilityTreeReadModelCostMode!=structured_cost_items_v1")
        if page_summary.get("facilityTreeReadModelEffectMode") != "structured_effect_items_v1":
            failures.append("mainCityFacilityTreeReadModelEffectMode!=structured_effect_items_v1")
        if _as_int(page_summary.get("facilityTreeStructuredCostNodeCount")) < 16:
            failures.append("mainCityFacilityTreeStructuredCostNodeCount<16")
        if _as_int(page_summary.get("facilityTreeStructuredEffectNodeCount")) < 16:
            failures.append("mainCityFacilityTreeStructuredEffectNodeCount<16")
        failures.extend(_validate_main_city_facility_tree_read_model_contract())
        if page_summary.get("facilityTreeNodeAnchorMode") != "baseline":
            failures.append("mainCityFacilityTreeNodeAnchorMode!=baseline")
        if _as_int(page_summary.get("facilityTreeImageNodeCount")) < 16:
            failures.append("mainCityFacilityTreeImageNodeCount<16")
        if page_summary.get("facilityTreeConnectorLayerToken") != "main_city_facility_tree_connector_layer_v1":
            failures.append("mainCityFacilityTreeConnectorLayerToken!=main_city_facility_tree_connector_layer_v1")
        if page_summary.get("facilityTreeBackgroundImageToken") != "main_city_facility_tree_line_graph_backdrop_v1":
            failures.append("mainCityFacilityTreeBackgroundImageToken!=main_city_facility_tree_line_graph_backdrop_v1")
        if bool(page_summary.get("facilityTreeBackgroundLoaded", False)) is not True:
            failures.append("mainCityFacilityTreeBackgroundLoaded!=true")
        if page_summary.get("facilityTreeVisualMode") != "line_graph_asset_nodes_v1":
            failures.append("mainCityFacilityTreeVisualMode!=line_graph_asset_nodes_v1")
        if bool(page_summary.get("facilityTreeLineGraphBackdropVisible", False)) is not True:
            failures.append("mainCityFacilityTreeLineGraphBackdropVisible!=true")
        if page_summary.get("facilityTreeNodeLabelMode") != "name_level_only_v1":
            failures.append("mainCityFacilityTreeNodeLabelMode!=name_level_only_v1")
        if bool(page_summary.get("facilityTreeStatusTextVisible", True)) is not False:
            failures.append("mainCityFacilityTreeStatusTextVisible!=false")
        if bool(page_summary.get("facilityTreeGhostWordVisible", True)) is not False:
            failures.append("mainCityFacilityTreeGhostWordVisible!=false")
        if page_summary.get("facilityTreeBackdropDecorToken") != "han_map_mist_backdrop_v1":
            failures.append("mainCityFacilityTreeBackdropDecorToken!=han_map_mist_backdrop_v1")
        if page_summary.get("facilityTreeGraphToneToken") != "main_city_facility_tree_soft_ink_graph_v1":
            failures.append("mainCityFacilityTreeGraphToneToken!=main_city_facility_tree_soft_ink_graph_v1")
        if page_summary.get("facilityTreeNodeStateToken") != "main_city_facility_tree_node_state_v1":
            failures.append("mainCityFacilityTreeNodeStateToken!=main_city_facility_tree_node_state_v1")
        if page_summary.get("facilityTreeLockedNodeToneToken") != "main_city_facility_tree_locked_node_tone_v1":
            failures.append("mainCityFacilityTreeLockedNodeToneToken!=main_city_facility_tree_locked_node_tone_v1")
        if _as_int(page_summary.get("facilityTreeLockedAlphaPercent")) > 40:
            failures.append("mainCityFacilityTreeLockedAlphaPercent>40")
        if _as_int(page_summary.get("facilityTreeUpgradableGlowAlphaPercent")) > 50:
            failures.append("mainCityFacilityTreeUpgradableGlowAlphaPercent>50")
        if page_summary.get("facilityTreeScrollRhythmToken") != "main_city_facility_tree_scroll_rhythm_v1":
            failures.append("mainCityFacilityTreeScrollRhythmToken!=main_city_facility_tree_scroll_rhythm_v1")
        if _as_int(page_summary.get("facilityTreeRowSpacingPx")) != 230:
            failures.append("mainCityFacilityTreeRowSpacingPx!=230")
        if page_summary.get("facilityTreeScrollMode") != "hidden_scroll_vertical_stage":
            failures.append("mainCityFacilityTreeScrollMode!=hidden_scroll_vertical_stage")
        if page_summary.get("facilityTreeVirtualCanvasMode") != "north_south_long_map":
            failures.append("mainCityFacilityTreeVirtualCanvasMode!=north_south_long_map")
        if page_summary.get("facilityTreePlacementMode") != "line_graph_asset_node_anchor_v1":
            failures.append("mainCityFacilityTreePlacementMode!=line_graph_asset_node_anchor_v1")
        if bool(page_summary.get("facilityTreeCodeConnectorVisible", True)) is not False:
            failures.append("mainCityFacilityTreeCodeConnectorVisible!=false")
        if _as_int(page_summary.get("facilityTreeInitialVisibleNodeCount")) != 7:
            failures.append("mainCityFacilityTreeInitialVisibleNodeCount!=7")
        if _as_int(page_summary.get("facilityTreeInitialVisibleTierCount")) != 3:
            failures.append("mainCityFacilityTreeInitialVisibleTierCount!=3")
        if _as_int(page_summary.get("facilityTreeStageHeight")) < 1000:
            failures.append("mainCityFacilityTreeStageHeight<1000")
        if page_summary.get("facilityTreeBackgroundFitMode") != "programmatic_line_graph_backdrop":
            failures.append("mainCityFacilityTreeBackgroundFitMode!=programmatic_line_graph_backdrop")
        if _as_int(page_summary.get("facilityTreeBackgroundOpacityPercent")) != 0:
            failures.append("mainCityFacilityTreeBackgroundOpacityPercent!=0")
        if _as_int(page_summary.get("facilityTreeNorthSouthTierCount")) < 5:
            failures.append("mainCityFacilityTreeNorthSouthTierCount<5")
        if _as_int(page_summary.get("facilityTreeDisabledNodeCount")) < 1:
            failures.append("mainCityFacilityTreeDisabledNodeCount<1")
        if _as_int(page_summary.get("facilityTreeUpgradableNodeCount")) < 1:
            failures.append("mainCityFacilityTreeUpgradableNodeCount<1")
        if _as_int(page_summary.get("facilityTreeLockedNodeCount")) < 1:
            failures.append("mainCityFacilityTreeLockedNodeCount<1")
        if page_summary.get("facilityTreeDefaultSelectionMode") != "none_until_node_click":
            failures.append("mainCityFacilityTreeDefaultSelectionMode!=none_until_node_click")
        if action in MAIN_CITY_FACILITY_CHAIN_SCROLL_ACTIONS:
            if bool(page_summary.get("facilityTreeScrolledToLowerHalf", False)) is not True:
                failures.append("mainCityFacilityTreeScrolledToLowerHalf!=true")
            if bool(page_summary.get("facilityTreeLowerHalfVisible", False)) is not True:
                failures.append("mainCityFacilityTreeLowerHalfVisible!=true")
            if _as_int(page_summary.get("facilityTreeScrollAfter")) <= _as_int(page_summary.get("facilityTreeScrollBefore")):
                failures.append("mainCityFacilityTreeScrollAfter<=before")
        if action in MAIN_CITY_FACILITY_CHAIN_DETAIL_ACTIONS:
            if bool(page_summary.get("upgradeSheetVisible", False)) is not True:
                failures.append("mainCityFacilityUpgradeSheetVisible!=true_after_node_click")
            if page_summary.get("upgradeSheetLayoutMode") != "center_focus_overlay":
                failures.append("mainCityFacilityUpgradeSheetLayoutMode!=center_focus_overlay")
            if page_summary.get("upgradeSheetCoverageMode") != "single_action_mobile_focus":
                failures.append("mainCityFacilityUpgradeSheetCoverageMode!=single_action_mobile_focus")
            if page_summary.get("upgradeSheetPresentationMode") != "facility_tree_consumer_upgrade_focus_v1":
                failures.append("mainCityFacilityUpgradeSheetPresentationMode!=facility_tree_consumer_upgrade_focus_v1")
            if page_summary.get("upgradeSheetBodyMode") != "building_icon_cost_effect_focus_v1":
                failures.append("mainCityFacilityUpgradeSheetBodyMode!=building_icon_cost_effect_focus_v1")
            if bool(page_summary.get("upgradeSheetEngineeringCopyVisible", True)):
                failures.append("mainCityFacilityUpgradeSheetEngineeringCopyVisible!=false")
            if bool(page_summary.get("upgradeSheetTopTitleVisible", True)):
                failures.append("mainCityFacilityUpgradeSheetTopTitleVisible!=false")
            if bool(page_summary.get("upgradeSheetLevelVisible", False)) is not True:
                failures.append("mainCityFacilityUpgradeSheetLevelVisible!=true")
            if _as_int(page_summary.get("upgradeSheetCostPillCount")) < 2:
                failures.append("mainCityFacilityUpgradeSheetCostPillCount<2")
            if "令" in str(page_summary.get("upgradeSheetCostPillText", "")):
                failures.append("mainCityFacilityUpgradeSheetCostPillTextContainsOrderToken")
            if ".0" in str(page_summary.get("upgradeSheetCostPillText", "")):
                failures.append("mainCityFacilityUpgradeSheetCostPillTextContainsFloatSuffix")
            if _as_int(page_summary.get("upgradeSheetEffectPillCount")) < 1:
                failures.append("mainCityFacilityUpgradeSheetEffectPillCount<1")
            if page_summary.get("upgradeSheetCostDataSource") != "structured_cost_items":
                failures.append("mainCityFacilityUpgradeSheetCostDataSource!=structured_cost_items")
            if page_summary.get("upgradeSheetEffectDataSource") != "structured_effect_items":
                failures.append("mainCityFacilityUpgradeSheetEffectDataSource!=structured_effect_items")
            if bool(page_summary.get("upgradeSheetPrimaryButtonVisible", False)) is not True:
                failures.append("mainCityFacilityUpgradeSheetPrimaryButtonVisible!=true")
            if bool(page_summary.get("upgradeSheetSecondaryButtonVisible", True)):
                failures.append("mainCityFacilityUpgradeSheetSecondaryButtonVisible!=false")
            if bool(page_summary.get("upgradeSheetCloseButtonVisible", True)):
                failures.append("mainCityFacilityUpgradeSheetCloseButtonVisible!=false")
            if bool(page_summary.get("upgradeSheetBuildingIconVisible", False)) is not True:
                failures.append("mainCityFacilityUpgradeSheetBuildingIconVisible!=true")
            if bool(page_summary.get("upgradeSheetBuildingLevelUnderIconVisible", False)) is not True:
                failures.append("mainCityFacilityUpgradeSheetBuildingLevelUnderIconVisible!=true")
            if str(page_summary.get("upgradeSheetBuildingLevelText", "")).strip().startswith("当前"):
                failures.append("mainCityFacilityUpgradeSheetBuildingLevelTextStartsWithCurrent")
            if page_summary.get("upgradeSheetConsumerCopyMode") != "cost_effect_only":
                failures.append("mainCityFacilityUpgradeSheetConsumerCopyMode!=cost_effect_only")
            if bool(page_summary.get("upgradeSheetTemplateFeedbackVisible", True)):
                failures.append("mainCityFacilityUpgradeSheetTemplateFeedbackVisible!=false")
            if _as_int(page_summary.get("upgradeSheetTitleFontSize")) < 24:
                failures.append("mainCityFacilityUpgradeSheetTitleFontSize<24")
            if page_summary.get("upgradeSheetDetailRowsMode") != "icon_cost_effect_focus_v1":
                failures.append("mainCityFacilityUpgradeSheetDetailRowsMode!=icon_cost_effect_focus_v1")
            if bool(page_summary.get("upgradeSheetActionRowInViewport", False)) is not True:
                failures.append("mainCityFacilityUpgradeSheetActionRowInViewport!=true")
            if bool(page_summary.get("upgradeSheetBottomWithinViewport", False)) is not True:
                failures.append("mainCityFacilityUpgradeSheetBottomWithinViewport!=true")
            if action in MAIN_CITY_FACILITY_CHAIN_SUBMITTED_ACTIONS:
                if bool(page_summary.get("submittedStateVisible", False)) is not True:
                    failures.append("mainCityFacilitySubmittedStateVisible!=true_after_submit")
                if bool(page_summary.get("templateFeedbackVisible", True)):
                    failures.append("mainCityFacilityTemplateFeedbackVisible!=false_after_submit")
                if bool(page_summary.get("primaryButtonDisabled", False)) is not True:
                    failures.append("mainCityFacilityPrimaryButtonDisabled!=true_after_submit")
                if bool(page_summary.get("upgradeSheetSubmittedBadgeVisible", False)) is not True:
                    failures.append("mainCityFacilityUpgradeSheetSubmittedBadgeVisible!=true")
                if page_summary.get("upgradeSheetActionStateText") != "升级中":
                    failures.append("mainCityFacilityUpgradeSheetActionStateText!=升级中")
        elif bool(page_summary.get("upgradeSheetVisible", True)) is not False:
            failures.append("mainCityFacilityUpgradeSheetVisible!=false")
        if action not in MAIN_CITY_FACILITY_CHAIN_DETAIL_ACTIONS and str(page_summary.get("selectedBuildingId", "")).strip() != "":
            failures.append("mainCityFacilitySelectedBuildingIdNotEmptyBeforeClick")
        if page_summary.get("upgradeSheetDefaultState") != "collapsed_until_node_click":
            failures.append("mainCityFacilityUpgradeSheetDefaultState!=collapsed_until_node_click")
        if bool(page_summary.get("facilityTreeInlineDetailVisible", True)) is not False:
            failures.append("mainCityFacilityInlineDetailVisible!=false")
        if bool(page_summary.get("facilityTreeHeaderSubtitleVisible", True)) is not False:
            failures.append("mainCityFacilityHeaderSubtitleVisible!=false")
        if bool(page_summary.get("facilityTreeStateBadgeVisible", True)) is not False:
            failures.append("mainCityFacilityStateBadgeVisible!=false")
        if bool(page_summary.get("facilityTreeInnerTitleVisible", True)) is not False:
            failures.append("mainCityFacilityInnerTitleVisible!=false")
        if bool(page_summary.get("facilityTreeIdleNodeFrameVisible", True)) is not False:
            failures.append("mainCityFacilityIdleNodeFrameVisible!=false")
        if page_summary.get("facilityTreeChromeButtonToken") != "main_city_facility_tree_chrome_button_v1":
            failures.append("mainCityFacilityTreeChromeButtonToken!=main_city_facility_tree_chrome_button_v1")
        if bool(page_summary.get("leftTopBackVisible", False)) is not True:
            failures.append("mainCityFacilityLeftTopBackVisible!=true")
        last_click = page_summary.get("lastMapNodeClick", {})
        if not isinstance(last_click, dict) or not last_click:
            failures.append("mainCityFacilityLastMapNodeClickMissing")
    if (
        action in INTERIOR_VISUAL_CONTRACT_ACTIONS
        or action in INTERIOR_SECONDARY_PAGE_CONTRACT_ACTIONS
        or action in INTERIOR_HOME_ENTRY_BUTTON_IDENTITY_ACTIONS
        or action in INTERIOR_SECONDARY_BACK_BUTTON_IDENTITY_ACTIONS
    ):
        failures.extend(
            _validate_design_system_contract(
                page_summary,
                "interior_shell",
                require_production_baseline=False,
            )
        )
        failures.extend(_validate_module_token_contract(page_summary, "interior"))
        failures.extend(_validate_interior_motion_contract(page_summary))
        if page_summary.get("interiorSummaryVersion") != "interior_summary_v2":
            failures.append("interiorSummaryVersion!=interior_summary_v2")
        if not bool(page_summary.get("ok", False)):
            failures.append("interiorSummaryOk!=true")
        if _as_int(page_summary.get("contentSurfaceCount")) <= 0:
            failures.append("interiorContentSurfaceCount<=0")
        if action in INTERIOR_VISUAL_CONTRACT_ACTIONS:
            if page_summary.get("activePageId") != "home/lobby":
                failures.append("interiorActivePageId!=home/lobby")
            if bool(page_summary.get("usesInteriorHomeLobby", False)) is not True:
                failures.append("usesInteriorHomeLobby!=true")
            if page_summary.get("interiorHomeLobbyToken") != INTERIOR_HOME_LOBBY_TOKEN:
                failures.append(f"interiorHomeLobbyToken!={INTERIOR_HOME_LOBBY_TOKEN}")
            if page_summary.get("interiorHomeEntryButtonToken") != INTERIOR_HOME_ENTRY_BUTTON_TOKEN:
                failures.append(f"interiorHomeEntryButtonToken!={INTERIOR_HOME_ENTRY_BUTTON_TOKEN}")
            if page_summary.get("interiorHomeEntryPresentationMode") != "standing_badge_scroll_plaque_v1":
                failures.append("interiorHomeEntryPresentationMode!=standing_badge_scroll_plaque_v1")
            if _as_int(page_summary.get("interiorHomeEntryBadgeCount")) != 4:
                failures.append("interiorHomeEntryBadgeCount!=4")
            if bool(page_summary.get("interiorHomeEntryBadgesLoaded", False)) is not True:
                failures.append("interiorHomeEntryBadgesLoaded!=true")
            if page_summary.get("interiorHomeEntryClickMode") != "badge_and_scroll_shared_target":
                failures.append("interiorHomeEntryClickMode!=badge_and_scroll_shared_target")
            if page_summary.get("interiorHomeEntryChromeConvergenceToken") != INTERIOR_HOME_ENTRY_CHROME_CONVERGENCE_TOKEN:
                failures.append("interiorHomeEntryChromeConvergenceToken!=interior_home_entry_chrome_convergence_v1")
            if page_summary.get("interiorHomeEntryChromeMode") != "badge_scroll_plaque_shared_chrome_v1":
                failures.append("interiorHomeEntryChromeMode!=badge_scroll_plaque_shared_chrome_v1")
            if bool(page_summary.get("interiorHomeEntryChromeSharedFactory", False)) is not True:
                failures.append("interiorHomeEntryChromeSharedFactory!=true")
            if page_summary.get("interiorHomeEntryBadgeHitAreaMode") != "transparent_badge_button_shared_entry_v1":
                failures.append("interiorHomeEntryBadgeHitAreaMode!=transparent_badge_button_shared_entry_v1")
            if page_summary.get("interiorHomeBackgroundToken") != INTERIOR_HOME_BACKGROUND_TOKEN:
                failures.append(f"interiorHomeBackgroundToken!={INTERIOR_HOME_BACKGROUND_TOKEN}")
            if bool(page_summary.get("interiorHomeBackgroundLoaded", False)) is not True:
                failures.append("interiorHomeBackgroundLoaded!=true")
            if page_summary.get("interiorHomeBackgroundStretchMode") != "keep_aspect_covered":
                failures.append("interiorHomeBackgroundStretchMode!=keep_aspect_covered")
            if page_summary.get("interiorHomeResourceStripToken") != INTERIOR_HOME_RESOURCE_STRIP_TOKEN:
                failures.append(f"interiorHomeResourceStripToken!={INTERIOR_HOME_RESOURCE_STRIP_TOKEN}")
            if _as_int(page_summary.get("interiorHomeResourceChipCount")) < 6:
                failures.append("interiorHomeResourceChipCount<6")
            if page_summary.get("interiorHomeEntryIds") != INTERIOR_HOME_ENTRY_IDS:
                failures.append(f"interiorHomeEntryIds!={INTERIOR_HOME_ENTRY_IDS}")
            if _as_int(page_summary.get("interiorHomeEntryCount")) != 4:
                failures.append("interiorHomeEntryCount!=4")
            if _as_int(page_summary.get("interiorHomeForbiddenEntryCount")) != 0:
                failures.append("interiorHomeForbiddenEntryCount!=0")
            if bool(page_summary.get("interiorHomeHasBuildingTree", True)):
                failures.append("interiorHomeHasBuildingTree!=false")
            if bool(page_summary.get("interiorHomeHasUpgradeSheet", True)):
                failures.append("interiorHomeHasUpgradeSheet!=false")
            if bool(page_summary.get("interiorHomeHasFacilityNodeHub", True)):
                failures.append("interiorHomeHasFacilityNodeHub!=false")
        if action in INTERIOR_HOME_ENTRY_BUTTON_IDENTITY_ACTIONS:
            expected_page_id, expected_label, expected_action_id, expected_button_name = INTERIOR_HOME_ENTRY_BUTTON_IDENTITY_ACTIONS[action]
            if page_summary.get("activePageId") != expected_page_id:
                failures.append(f"interiorHomeEntryAfterPageId!={expected_page_id}")
            if page_summary.get("interiorHomeEntryBeforePageId") != "home/lobby":
                failures.append("interiorHomeEntryBeforePageId!=home/lobby")
            if page_summary.get("interiorHomeEntryClickedActionId") != expected_action_id:
                failures.append("interiorHomeEntryClickedActionId!=interior_home_entry:market")
            if page_summary.get("interiorHomeEntryClickedTargetPageId") != expected_page_id:
                if action == "world_open_main_city_interior_trade_entry_button_identity":
                    failures.append("interiorHomeEntryClickedTargetPageId!=trade/overview")
                elif action == "world_open_main_city_interior_tax_entry_button_identity":
                    failures.append("interiorHomeEntryClickedTargetPageId!=tax/structure")
                elif action == "world_open_main_city_interior_affairs_entry_button_identity":
                    failures.append("interiorHomeEntryClickedTargetPageId!=affairs/queue")
                else:
                    failures.append(f"interiorHomeEntryClickedTargetPageId!={expected_page_id}")
            if page_summary.get("interiorHomeEntryClickedLabel") != expected_label:
                failures.append(f"interiorHomeEntryClickedLabel!={expected_label}")
            if page_summary.get("interiorHomeEntryClickedToken") != INTERIOR_HOME_ENTRY_BUTTON_TOKEN:
                failures.append(f"interiorHomeEntryClickedToken!={INTERIOR_HOME_ENTRY_BUTTON_TOKEN}")
            if page_summary.get("interiorHomeEntryClickedChromeToken") != INTERIOR_HOME_ENTRY_CHROME_CONVERGENCE_TOKEN:
                failures.append("interiorHomeEntryClickedChromeToken!=interior_home_entry_chrome_convergence_v1")
            if page_summary.get("interiorHomeEntryClickedLiveTextContract") != INTERIOR_HOME_ENTRY_LIVE_TEXT_CONTRACT:
                failures.append(f"interiorHomeEntryClickedLiveTextContract!={INTERIOR_HOME_ENTRY_LIVE_TEXT_CONTRACT}")
            if page_summary.get("interiorHomeEntryClickedButtonName") != expected_button_name:
                failures.append(f"interiorHomeEntryClickedButtonName!={expected_button_name}")
            if bool(page_summary.get("interiorHomeEntryClickVerified", False)) is not True:
                failures.append("interiorHomeEntryClickVerified!=true")
        if action in INTERIOR_SECONDARY_PAGE_CONTRACT_ACTIONS:
            expected_page_id = INTERIOR_SECONDARY_PAGE_CONTRACT_ACTIONS[action]
            if page_summary.get("activePageId") != expected_page_id:
                failures.append(f"interiorSecondaryActivePageId!={expected_page_id}")
            if bool(page_summary.get("usesInteriorHomeLobby", True)):
                failures.append("interiorSecondaryUsesHomeLobby!=false")
            if page_summary.get("interiorSecondaryPageToken") != INTERIOR_SECONDARY_PAGE_TOKEN:
                failures.append(f"interiorSecondaryPageToken!={INTERIOR_SECONDARY_PAGE_TOKEN}")
            if page_summary.get("interiorSecondaryPageMode") != "home_entry_to_second_level_v1":
                failures.append("interiorSecondaryPageMode!=home_entry_to_second_level_v1")
            if bool(page_summary.get("interiorSecondaryPage", False)) is not True:
                failures.append("interiorSecondaryPage!=true")
            if page_summary.get("interiorSecondaryEntryIds") != INTERIOR_HOME_ENTRY_IDS:
                failures.append(f"interiorSecondaryEntryIds!={INTERIOR_HOME_ENTRY_IDS}")
            if page_summary.get("interiorSecondaryBackTargetPageId") != "home/lobby":
                failures.append("interiorSecondaryBackTargetPageId!=home/lobby")
            expected_title = INTERIOR_SECONDARY_PAGE_TITLE_BY_ACTION.get(action, "")
            if expected_title and page_summary.get("interiorSecondaryChromeTitle") != expected_title:
                failures.append(f"interiorSecondaryChromeTitle!={expected_title}")
            if page_summary.get("interiorSecondaryChromeTitleMode") != "panel_title_current_entry_v1":
                failures.append("interiorSecondaryChromeTitleMode!=panel_title_current_entry_v1")
            if page_summary.get("interiorSecondaryBackButtonLabel") != "返回":
                failures.append("interiorSecondaryBackButtonLabel!=返回")
            if page_summary.get("interiorSecondaryCloseButtonLabel") != "关闭":
                failures.append("interiorSecondaryCloseButtonLabel!=关闭")
            if _as_int(page_summary.get("interiorSecondaryChromeTitleFontSize")) < 24:
                failures.append("interiorSecondaryChromeTitleFontSize<24")
            if bool(page_summary.get("interiorSecondarySummaryCardVisible", True)):
                failures.append("interiorSecondarySummaryCardVisible!=false")
            if action in INTERIOR_SECONDARY_CARD_CHROME_ACTIONS:
                if page_summary.get("interiorSecondaryCardChromeConvergenceToken") != INTERIOR_SECONDARY_CARD_CHROME_CONVERGENCE_TOKEN:
                    failures.append("interiorSecondaryCardChromeConvergenceToken!=interior_secondary_card_chrome_convergence_v1")
                if page_summary.get("interiorSecondaryCardChromeMode") != "shared_market_trade_tax_cards_v1":
                    failures.append("interiorSecondaryCardChromeMode!=shared_market_trade_tax_cards_v1")
                if bool(page_summary.get("interiorSecondaryCardChromeSharedFactory", False)) is not True:
                    failures.append("interiorSecondaryCardChromeSharedFactory!=true")
                if _as_int(page_summary.get("interiorSecondaryCardChromeRadius")) < 6:
                    failures.append("interiorSecondaryCardChromeRadius<6")
                if _as_int(page_summary.get("interiorSecondaryCardChromeMaxBorderWidth")) < 1:
                    failures.append("interiorSecondaryCardChromeMaxBorderWidth<1")
            if action in {
                "world_open_main_city_interior_market",
                "world_open_main_city_interior_trade",
                "world_open_main_city_interior_tax",
                "world_open_main_city_interior_affairs",
                "world_open_main_city_interior_affairs_press_first_action",
            }:
                if bool(page_summary.get("interiorSecondarySectionStripVisible", True)):
                    failures.append("interiorSecondarySectionStripVisible!=false")
                if page_summary.get("interiorSecondaryAtmosphereToken") != INTERIOR_SECONDARY_ATMOSPHERE_TOKEN:
                    failures.append(f"interiorSecondaryAtmosphereToken!={INTERIOR_SECONDARY_ATMOSPHERE_TOKEN}")
                if page_summary.get("interiorSecondaryAtmosphereMode") != "page_level_darkened_scene_background_v1":
                    failures.append("interiorSecondaryAtmosphereMode!=page_level_darkened_scene_background_v1")
                if bool(page_summary.get("interiorSecondaryAtmosphereBackgroundLoaded", False)) is not True:
                    failures.append("interiorSecondaryAtmosphereBackgroundLoaded!=true")
                if page_summary.get("interiorSecondaryAtmosphereStretchMode") != "keep_aspect_covered":
                    failures.append("interiorSecondaryAtmosphereStretchMode!=keep_aspect_covered")
                if page_summary.get("interiorSecondaryAtmosphereTextReadabilityMode") != "dark_scrim_plus_translucent_surface":
                    failures.append("interiorSecondaryAtmosphereTextReadabilityMode!=dark_scrim_plus_translucent_surface")
                if page_summary.get("interiorSecondaryAtmosphereScrimAlpha") != "0.08":
                    failures.append("interiorSecondaryAtmosphereScrimAlpha!=0.08")
                if page_summary.get("interiorSecondaryAtmosphereSurfaceAlpha") != "0.62":
                    failures.append("interiorSecondaryAtmosphereSurfaceAlpha!=0.62")
            if bool(page_summary.get("interiorSecondaryHasBuildingTree", True)):
                failures.append("interiorSecondaryHasBuildingTree!=false")
            if bool(page_summary.get("interiorSecondaryHasUpgradeSheet", True)):
                failures.append("interiorSecondaryHasUpgradeSheet!=false")
            if bool(page_summary.get("interiorSecondaryHasFacilityNodeHub", True)):
                failures.append("interiorSecondaryHasFacilityNodeHub!=false")
            if action == "world_open_main_city_interior_tax":
                if page_summary.get("interiorTaxTreasuryMode") != "tax_timeline_touch_collect_v1":
                    failures.append("interiorTaxTreasuryMode!=tax_timeline_touch_collect_v1")
                if _as_int(page_summary.get("interiorTaxTreasuryCardCount")) != 6:
                    failures.append("interiorTaxTreasuryCardCount!=6")
                if page_summary.get("interiorTaxTreasuryCardIds") != "dawn_market/morning_tax/noon_tax/afternoon_patrol/evening_granary/night_warehouse":
                    failures.append("interiorTaxTreasuryCardIds!=dawn_market/morning_tax/noon_tax/afternoon_patrol/evening_granary/night_warehouse")
                if _as_int(page_summary.get("interiorTaxTreasuryPrimaryFontSize")) < 24:
                    failures.append("interiorTaxTreasuryPrimaryFontSize<24")
                if bool(page_summary.get("interiorTaxTreasuryUsesGenericEntryCards", True)):
                    failures.append("interiorTaxTreasuryUsesGenericEntryCards!=false")
                if bool(page_summary.get("interiorTaxTreasuryHeaderMetaVisible", True)):
                    failures.append("interiorTaxTreasuryHeaderMetaVisible!=false")
                if bool(page_summary.get("interiorTaxTreasuryTopResourceChipVisible", True)):
                    failures.append("interiorTaxTreasuryTopResourceChipVisible!=false")
                if _as_int(page_summary.get("interiorTaxTreasuryHeroValueFontSize")) < 52:
                    failures.append("interiorTaxTreasuryHeroValueFontSize<52")
                if bool(page_summary.get("interiorTaxTreasuryPrimaryButtonVisible", True)):
                    failures.append("interiorTaxTreasuryPrimaryButtonVisible!=false")
                if _as_int(page_summary.get("interiorTaxTreasuryResourceChipCount")) != 0:
                    failures.append("interiorTaxTreasuryResourceChipCount!=0")
                if _as_int(page_summary.get("interiorTaxTreasuryScheduleSlotCount")) != 6:
                    failures.append("interiorTaxTreasuryScheduleSlotCount!=6")
                if page_summary.get("interiorTaxTreasuryScheduleLayoutMode") != "horizontal_dayline_v1":
                    failures.append("interiorTaxTreasuryScheduleLayoutMode!=horizontal_dayline_v1")
                if page_summary.get("interiorTaxTreasuryScheduleCadence") != "six_daily_slots_06_21_v1":
                    failures.append("interiorTaxTreasuryScheduleCadence!=six_daily_slots_06_21_v1")
                if bool(page_summary.get("interiorTaxTreasuryScheduleHeaderVisible", True)):
                    failures.append("interiorTaxTreasuryScheduleHeaderVisible!=false")
                if page_summary.get("interiorTaxTreasuryScheduleChromeMode") != "node_button_line_v1":
                    failures.append("interiorTaxTreasuryScheduleChromeMode!=node_button_line_v1")
                if page_summary.get("interiorTaxTreasuryTimelineCompactMode") != "six_slots_compact_fit_v1":
                    failures.append("interiorTaxTreasuryTimelineCompactMode!=six_slots_compact_fit_v1")
                if page_summary.get("interiorTaxTreasuryLayoutPriorityToken") != INTERIOR_TAX_TREASURY_LAYOUT_PRIORITY_TOKEN:
                    failures.append("interiorTaxTreasuryLayoutPriorityToken!=interior_tax_treasury_layout_priority_v1")
                if page_summary.get("interiorTaxTreasuryHeroLayoutMode") != "timeline_centered_primary_node_v2":
                    failures.append("interiorTaxTreasuryHeroLayoutMode!=timeline_centered_primary_node_v2")
                if page_summary.get("interiorTaxTreasuryTimelineVerticalMode") != "upper_midline_no_top_void_v1":
                    failures.append("interiorTaxTreasuryTimelineVerticalMode!=upper_midline_no_top_void_v1")
                if page_summary.get("interiorTaxTreasuryAssetFrameMode") != "fit_no_clip_v1":
                    failures.append("interiorTaxTreasuryAssetFrameMode!=fit_no_clip_v1")
                if page_summary.get("interiorTaxTreasuryHeroPanelVerticalMode") != "primary_timeline_focus_band_v1":
                    failures.append("interiorTaxTreasuryHeroPanelVerticalMode!=primary_timeline_focus_band_v1")
                if page_summary.get("interiorTaxTreasuryImageActionMode") != "asset_button_collect_v1":
                    failures.append("interiorTaxTreasuryImageActionMode!=asset_button_collect_v1")
                if bool(page_summary.get("interiorTaxTreasuryStandaloneCollectButtonVisible", True)):
                    failures.append("interiorTaxTreasuryStandaloneCollectButtonVisible!=false")
                if page_summary.get("interiorTaxTreasuryPrimaryNodeRole") != "primary_collect_center":
                    failures.append("interiorTaxTreasuryPrimaryNodeRole!=primary_collect_center")
                if _as_int(page_summary.get("interiorTaxTreasuryTimelinePanelMinHeight")) < 430:
                    failures.append("interiorTaxTreasuryTimelinePanelMinHeight<430")
                if page_summary.get("interiorTaxTreasuryTopVoidGuard") != "single_panel_not_bottom_anchored_v1":
                    failures.append("interiorTaxTreasuryTopVoidGuard!=single_panel_not_bottom_anchored_v1")
                if _as_int(page_summary.get("interiorTaxTreasuryTimelineNodeCount")) != 6:
                    failures.append("interiorTaxTreasuryTimelineNodeCount!=6")
                timeline_states = [
                    state.strip()
                    for state in str(page_summary.get("interiorTaxTreasuryTimelineStates", "")).split("/")
                    if state.strip()
                ]
                if len(timeline_states) != 6:
                    failures.append("interiorTaxTreasuryTimelineStates_count!=6")
                invalid_timeline_states = [
                    state
                    for state in timeline_states
                    if state not in {"collected", "collectable", "upcoming"}
                ]
                if invalid_timeline_states:
                    failures.append("interiorTaxTreasuryTimelineStates_invalid")
                has_collectable_tax = "collectable" in timeline_states
                has_collected_tax = "collected" in timeline_states
                has_upcoming_tax = "upcoming" in timeline_states
                if has_collectable_tax and bool(page_summary.get("interiorTaxTreasuryCollectableNodeHighlighted", False)) is not True:
                    failures.append("interiorTaxTreasuryCollectableNodeHighlighted!=true")
                if has_collected_tax and bool(page_summary.get("interiorTaxTreasuryCollectedSealVisible", False)) is not True:
                    failures.append("interiorTaxTreasuryCollectedSealVisible!=true")
                if has_upcoming_tax and bool(page_summary.get("interiorTaxTreasuryUnavailableDimmedVisible", False)) is not True:
                    failures.append("interiorTaxTreasuryUnavailableDimmedVisible!=true")
                if bool(page_summary.get("interiorTaxTreasuryCountdownVisible", False)) is not True:
                    failures.append("interiorTaxTreasuryCountdownVisible!=true")
                if str(page_summary.get("interiorTaxTreasuryNextCollectLabel", "")).strip() == "":
                    failures.append("interiorTaxTreasuryNextCollectLabel_empty")
                if bool(page_summary.get("interiorTaxTreasuryQuestionVisible", True)):
                    failures.append("interiorTaxTreasuryQuestionVisible!=false")
                if bool(page_summary.get("interiorTaxTreasuryStateHeroVisible", True)):
                    failures.append("interiorTaxTreasuryStateHeroVisible!=false")
                if bool(page_summary.get("interiorTaxTreasuryNextLabelVisible", True)):
                    failures.append("interiorTaxTreasuryNextLabelVisible!=false")
                if str(page_summary.get("interiorTaxTreasuryCurrentTaxTitle", "")).strip() == "":
                    failures.append("interiorTaxTreasuryCurrentTaxTitle_empty")
                if str(page_summary.get("interiorTaxTreasuryCollectableNow", "")).strip() not in {"true", "false"}:
                    failures.append("interiorTaxTreasuryCollectableNow_missing")
                if bool(page_summary.get("interiorTaxTreasuryPrimaryAssetVisible", False)) is not True:
                    failures.append("interiorTaxTreasuryPrimaryAssetVisible!=true")
                if page_summary.get("interiorTaxRuntimeDataSource") != "backend_read_model":
                    failures.append("interiorTaxRuntimeDataSource!=backend_read_model")
                if page_summary.get("interiorTaxRuntimeSchemaVersion") != "main_city_interior_read_model_v1":
                    failures.append("interiorTaxRuntimeSchemaVersion!=main_city_interior_read_model_v1")
                if page_summary.get("interiorTaxTreasuryAssetRefMode") != "asset_ref_with_fallback_path_v1":
                    failures.append("interiorTaxTreasuryAssetRefMode!=asset_ref_with_fallback_path_v1")
                if page_summary.get("interiorTaxRuntimeEndpoint") != "/api/world/main-city/interior":
                    failures.append("interiorTaxRuntimeEndpoint!=/api/world/main-city/interior")
                failures.extend(_validate_main_city_interior_read_model_contract())
                if bool(page_summary.get("interiorTaxTreasuryEngineeringCopyVisible", True)):
                    failures.append("interiorTaxTreasuryEngineeringCopyVisible!=false")
            if action in {
                "world_open_main_city_interior_affairs",
                "world_open_main_city_interior_affairs_stress_12",
                "world_open_main_city_interior_affairs_press_first_action",
                "world_open_main_city_interior_affairs_press_focus_action",
            }:
                if page_summary.get("interiorAffairsOperationsMode") != "active_work_order_touch_grid_v2":
                    failures.append("interiorAffairsOperationsMode!=active_work_order_touch_grid_v2")
                if action == "world_open_main_city_interior_affairs":
                    if _as_int(page_summary.get("interiorAffairsOperationCount")) != 4:
                        failures.append("interiorAffairsOperationCount!=4")
                    if page_summary.get("interiorAffairsOperationIds") != "city_tax_office_upgrade/city_market_upgrade/outer_fort_wall/outer_recruit_camp":
                        failures.append("interiorAffairsOperationIds!=city_tax_office_upgrade/city_market_upgrade/outer_fort_wall/outer_recruit_camp")
                if page_summary.get("interiorAffairsAiLinkMode") != "suggestions_only_no_authority_dispatch":
                    failures.append("interiorAffairsAiLinkMode!=suggestions_only_no_authority_dispatch")
                if bool(page_summary.get("interiorAffairsUsesGenericEntryCards", True)):
                    failures.append("interiorAffairsUsesGenericEntryCards!=false")
                if bool(page_summary.get("interiorAffairsPrimaryButtonVisible", True)):
                    failures.append("interiorAffairsPrimaryButtonVisible!=false")
                if page_summary.get("interiorAffairsConstructionQueueMode") != "construction_work_orders_v1":
                    failures.append("interiorAffairsConstructionQueueMode!=construction_work_orders_v1")
                if page_summary.get("interiorAffairsConstructionQueueDataSource") != "backend_read_model":
                    failures.append("interiorAffairsConstructionQueueDataSource!=backend_read_model")
                if page_summary.get("interiorAffairsInteriorReadModelSchemaVersion") != "main_city_interior_read_model_v1":
                    failures.append("interiorAffairsInteriorReadModelSchemaVersion!=main_city_interior_read_model_v1")
                if page_summary.get("interiorAffairsAssetRefMode") != "asset_ref_with_fallback_path_v1":
                    failures.append("interiorAffairsAssetRefMode!=asset_ref_with_fallback_path_v1")
                if page_summary.get("interiorAffairsInteriorReadModelEndpoint") != "/api/world/main-city/interior":
                    failures.append("interiorAffairsInteriorReadModelEndpoint!=/api/world/main-city/interior")
                failures.extend(_validate_main_city_interior_read_model_contract())
                if _as_int(page_summary.get("interiorAffairsCityWorkOrderCount")) < 2:
                    failures.append("interiorAffairsCityWorkOrderCount<2")
                if _as_int(page_summary.get("interiorAffairsWorldWorkOrderCount")) < 2:
                    failures.append("interiorAffairsWorldWorkOrderCount<2")
                if _as_int(page_summary.get("interiorAffairsActiveWorkOrderCount")) < 4:
                    failures.append("interiorAffairsActiveWorkOrderCount<4")
                if _as_int(page_summary.get("interiorAffairsRemainingDisplayLabelCount")) < _as_int(page_summary.get("interiorAffairsRunningWorkOrderCount")):
                    failures.append("interiorAffairsRemainingDisplayLabelCount<interiorAffairsRunningWorkOrderCount")
                if _as_int(page_summary.get("interiorAffairsRunningWorkOrderCount")) <= 0:
                    failures.append("interiorAffairsRunningWorkOrderCount<=0")
                if page_summary.get("interiorAffairsPlayerQuestion") != "哪里正在建设":
                    failures.append("interiorAffairsPlayerQuestion!=哪里正在建设")
                if page_summary.get("interiorAffairsQueueTitle") != "正在建设":
                    failures.append("interiorAffairsQueueTitle!=正在建设")
                if bool(page_summary.get("interiorAffairsTopWorkOrderChipVisible", True)):
                    failures.append("interiorAffairsTopWorkOrderChipVisible!=false")
                if bool(page_summary.get("interiorAffairsGroupCountChipVisible", True)):
                    failures.append("interiorAffairsGroupCountChipVisible!=false")
                if page_summary.get("interiorAffairsNestedFrameMode") != "flat_cards_no_group_frame_v1":
                    failures.append("interiorAffairsNestedFrameMode!=flat_cards_no_group_frame_v1")
                if page_summary.get("interiorAffairsQueueScrollMode") != "touch_vertical_hidden_scrollbar_v1":
                    failures.append("interiorAffairsQueueScrollMode!=touch_vertical_hidden_scrollbar_v1")
                if bool(page_summary.get("interiorAffairsQueueScrollbarVisible", True)):
                    failures.append("interiorAffairsQueueScrollbarVisible!=false")
                if bool(page_summary.get("interiorAffairsCityOuterSplitVisible", True)):
                    failures.append("interiorAffairsCityOuterSplitVisible!=false")
                if page_summary.get("interiorAffairsQueueLayoutMode") != "unified_two_column_touch_grid_v1":
                    failures.append("interiorAffairsQueueLayoutMode!=unified_two_column_touch_grid_v1")
                if _as_int(page_summary.get("interiorAffairsCardGridColumns")) != 2:
                    failures.append("interiorAffairsCardGridColumns!=2")
                if page_summary.get("interiorAffairsCardChromeConvergenceToken") != INTERIOR_AFFAIRS_CARD_CHROME_CONVERGENCE_TOKEN:
                    failures.append("interiorAffairsCardChromeConvergenceToken!=interior_affairs_card_chrome_convergence_v1")
                if page_summary.get("interiorAffairsCardChromeMode") != "shared_mobile_work_order_cards_v1":
                    failures.append("interiorAffairsCardChromeMode!=shared_mobile_work_order_cards_v1")
                if bool(page_summary.get("interiorAffairsCardChromeSharedFactory", False)) is not True:
                    failures.append("interiorAffairsCardChromeSharedFactory!=true")
                if page_summary.get("interiorAffairsCardChromeSelectedStateMode") != "single_selected_card_border_v1":
                    failures.append("interiorAffairsCardChromeSelectedStateMode!=single_selected_card_border_v1")
                if _as_int(page_summary.get("interiorAffairsCardChromeMaxBorderWidth")) < 2:
                    failures.append("interiorAffairsCardChromeMaxBorderWidth<2")
                if _as_int(page_summary.get("interiorAffairsCardChromeRadius")) != 4:
                    failures.append("interiorAffairsCardChromeRadius!=4")
                if bool(page_summary.get("interiorAffairsDomainBadgeVisible", False)) is not True:
                    failures.append("interiorAffairsDomainBadgeVisible!=true")
                if bool(page_summary.get("interiorAffairsStandaloneGroupPanelVisible", True)):
                    failures.append("interiorAffairsStandaloneGroupPanelVisible!=false")
                if bool(page_summary.get("interiorAffairsHeaderHintVisible", True)):
                    failures.append("interiorAffairsHeaderHintVisible!=false")
                if bool(page_summary.get("interiorAffairsLargeBlankGroupPanelVisible", True)):
                    failures.append("interiorAffairsLargeBlankGroupPanelVisible!=false")
                if _as_int(page_summary.get("interiorAffairsWorkOrderCardMinHeight")) < 158:
                    failures.append("interiorAffairsWorkOrderCardMinHeight<158")
                if page_summary.get("interiorAffairsUnifiedStateLabelMode") != "display_state_label_v1":
                    failures.append("interiorAffairsUnifiedStateLabelMode!=display_state_label_v1")
                visible_state_labels = str(page_summary.get("interiorAffairsVisibleStateLabelSet", "")).strip()
                if not visible_state_labels:
                    failures.append("interiorAffairsVisibleStateLabelSet_empty")
                if any(label in visible_state_labels for label in ["升级中", "施工中", "修筑中", "整备中"]):
                    failures.append("interiorAffairsVisibleStateLabelSet_has_fine_labels")
                if visible_state_labels == "已完成":
                    failures.append("interiorAffairsVisibleStateLabelSet_all_completed_on_active_queue")
                if bool(page_summary.get("interiorAffairsMixedFineStateLabelsVisible", True)):
                    failures.append("interiorAffairsMixedFineStateLabelsVisible!=false")
                if _as_int(page_summary.get("interiorAffairsRemainingLabelCount")) < _as_int(page_summary.get("interiorAffairsActiveWorkOrderCount")):
                    failures.append("interiorAffairsRemainingLabelCount<interiorAffairsActiveWorkOrderCount")
                if _as_int(page_summary.get("interiorAffairsWorkOrderAssetCount")) < 4:
                    failures.append("interiorAffairsWorkOrderAssetCount<4")
                if _as_int(page_summary.get("interiorAffairsProgressBarCount")) < 4:
                    failures.append("interiorAffairsProgressBarCount<4")
                if _as_int(page_summary.get("interiorAffairsFieldWorkOrderCount")) < 1:
                    failures.append("interiorAffairsFieldWorkOrderCount<1")
                if bool(page_summary.get("interiorAffairsConfirmCopyVisible", True)):
                    failures.append("interiorAffairsConfirmCopyVisible!=false")
                if bool(page_summary.get("interiorAffairsWorkOrderActionButtonVisible", False)) is not True:
                    failures.append("interiorAffairsWorkOrderActionButtonVisible!=true")
                if page_summary.get("interiorAffairsWorkOrderActionButtonToken") != INTERIOR_WORK_ORDER_ACTION_BUTTON_TOKEN:
                    failures.append(f"interiorAffairsWorkOrderActionButtonToken!={INTERIOR_WORK_ORDER_ACTION_BUTTON_TOKEN}")
                if page_summary.get("interiorAffairsWorkOrderActionLiveTextContract") != INTERIOR_WORK_ORDER_ACTION_LIVE_TEXT_CONTRACT:
                    failures.append(f"interiorAffairsWorkOrderActionLiveTextContract!={INTERIOR_WORK_ORDER_ACTION_LIVE_TEXT_CONTRACT}")
                if _as_int(page_summary.get("interiorAffairsWorkOrderActionButtonCount"), 0) <= 0:
                    failures.append("interiorAffairsWorkOrderActionButtonCount<=0")
                if page_summary.get("interiorAffairsWorkOrderActionLabels") != "查看/定位":
                    failures.append("interiorAffairsWorkOrderActionLabels!=查看/定位")
                if _as_int(page_summary.get("interiorAffairsActionButtonMinHeight")) < 60:
                    failures.append("interiorAffairsActionButtonMinHeight<60")
                if page_summary.get("interiorAffairsWorkOrderActionAdapterMode") != "work_order_primary_action_signal_v1":
                    failures.append("interiorAffairsWorkOrderActionAdapterMode!=work_order_primary_action_signal_v1")
                if bool(page_summary.get("interiorAffairsWorkOrderActionSignalBound", False)) is not True:
                    failures.append("interiorAffairsWorkOrderActionSignalBound!=true")
                if page_summary.get("interiorAffairsWorkOrderActionIds") != "open_work_order/focus_world_target":
                    failures.append("interiorAffairsWorkOrderActionIds!=open_work_order/focus_world_target")
                if action == "world_open_main_city_interior_affairs_press_first_action":
                    if bool(page_summary.get("interiorAffairsWorkOrderActionClickVerified", False)) is not True:
                        failures.append("interiorAffairsWorkOrderActionClickVerified!=true")
                    if page_summary.get("interiorAffairsWorkOrderActionReceiptSource") != "interiorWorkOrderAction":
                        failures.append("interiorAffairsWorkOrderActionReceiptSource!=interiorWorkOrderAction")
                    if page_summary.get("interiorAffairsWorkOrderActionClickedActionId") != "open_work_order":
                        failures.append("interiorAffairsWorkOrderActionClickedActionId!=open_work_order")
                    if page_summary.get("interiorAffairsWorkOrderActionClickedQueueItemId") != "city_tax_office_upgrade":
                        failures.append("interiorAffairsWorkOrderActionClickedQueueItemId!=city_tax_office_upgrade")
                    if str(page_summary.get("interiorAffairsWorkOrderActionClickedLabel", "")).strip() == "":
                        failures.append("interiorAffairsWorkOrderActionClickedLabel empty")
                    if page_summary.get("interiorAffairsWorkOrderActionClickedToken") != INTERIOR_WORK_ORDER_ACTION_BUTTON_TOKEN:
                        failures.append(f"interiorAffairsWorkOrderActionClickedToken!={INTERIOR_WORK_ORDER_ACTION_BUTTON_TOKEN}")
                    if page_summary.get("interiorAffairsWorkOrderActionClickedLiveTextContract") != INTERIOR_WORK_ORDER_ACTION_LIVE_TEXT_CONTRACT:
                        failures.append(f"interiorAffairsWorkOrderActionClickedLiveTextContract!={INTERIOR_WORK_ORDER_ACTION_LIVE_TEXT_CONTRACT}")
                    if str(page_summary.get("interiorAffairsWorkOrderActionClickedButtonName", "")).strip() == "":
                        failures.append("interiorAffairsWorkOrderActionClickedButtonName empty")
                    # After pressing the first work-order action, selection stays on
                    # the touched card; no duplicate standalone detail panel is shown.
                    if bool(page_summary.get("interiorAffairsSelectedWorkOrderDetailVisible", False)) is not True:
                        failures.append("interiorAffairsSelectedWorkOrderDetailVisible!=true")
                    if bool(page_summary.get("interiorAffairsSelectedWorkOrderStandaloneDetailVisible", True)):
                        failures.append("interiorAffairsSelectedWorkOrderStandaloneDetailVisible!=false")
                    if page_summary.get("interiorAffairsSelectedWorkOrderDetailMode") != "selected_card_only_v1":
                        failures.append("interiorAffairsSelectedWorkOrderDetailMode!=selected_card_only_v1")
                    if page_summary.get("interiorAffairsSelectedWorkOrderId") != "city_tax_office_upgrade":
                        failures.append("interiorAffairsSelectedWorkOrderId!=city_tax_office_upgrade")
                    if bool(page_summary.get("interiorAffairsSelectedWorkOrderAssetRefVisible", False)) is not True:
                        failures.append("interiorAffairsSelectedWorkOrderAssetRefVisible!=true")
                    if bool(page_summary.get("interiorAffairsSelectedWorkOrderEngineeringCopyVisible", True)):
                        failures.append("interiorAffairsSelectedWorkOrderEngineeringCopyVisible!=false")
                if action == "world_open_main_city_interior_affairs_press_focus_action":
                    if bool(page_summary.get("interiorAffairsWorkOrderActionClickVerified", False)) is not True:
                        failures.append("interiorAffairsFocusWorkOrderActionClickVerified!=true")
                    if page_summary.get("interiorAffairsWorkOrderActionReceiptSource") != "interiorWorkOrderAction":
                        failures.append("interiorAffairsFocusWorkOrderActionReceiptSource!=interiorWorkOrderAction")
                    if page_summary.get("interiorAffairsWorkOrderActionClickedActionId") != "focus_world_target":
                        failures.append("interiorAffairsWorkOrderActionClickedActionId!=focus_world_target")
                    if page_summary.get("interiorAffairsWorkOrderActionClickedQueueItemId") != "outer_fort_wall":
                        failures.append("interiorAffairsWorkOrderActionClickedQueueItemId!=outer_fort_wall")
                    if str(page_summary.get("interiorAffairsWorkOrderActionClickedLabel", "")).strip() == "":
                        failures.append("interiorAffairsFocusWorkOrderActionClickedLabel empty")
                    if page_summary.get("interiorAffairsWorkOrderActionClickedToken") != INTERIOR_WORK_ORDER_ACTION_BUTTON_TOKEN:
                        failures.append(f"interiorAffairsFocusWorkOrderActionClickedToken!={INTERIOR_WORK_ORDER_ACTION_BUTTON_TOKEN}")
                    if page_summary.get("interiorAffairsWorkOrderActionClickedLiveTextContract") != INTERIOR_WORK_ORDER_ACTION_LIVE_TEXT_CONTRACT:
                        failures.append(f"interiorAffairsFocusWorkOrderActionClickedLiveTextContract!={INTERIOR_WORK_ORDER_ACTION_LIVE_TEXT_CONTRACT}")
                    if bool(page_summary.get("interiorAffairsSelectedWorkOrderDetailVisible", False)) is not True:
                        failures.append("interiorAffairsFocusSelectedWorkOrderDetailVisible!=true")
                    if bool(page_summary.get("interiorAffairsSelectedWorkOrderStandaloneDetailVisible", True)):
                        failures.append("interiorAffairsFocusSelectedWorkOrderStandaloneDetailVisible!=false")
                    if page_summary.get("interiorAffairsSelectedWorkOrderDetailMode") != "selected_card_only_v1":
                        failures.append("interiorAffairsFocusSelectedWorkOrderDetailMode!=selected_card_only_v1")
                    if page_summary.get("interiorAffairsSelectedWorkOrderId") != "outer_fort_wall":
                        failures.append("interiorAffairsSelectedWorkOrderId!=outer_fort_wall")
                    if bool(page_summary.get("interiorAffairsSelectedWorkOrderAssetRefVisible", False)) is not True:
                        failures.append("interiorAffairsFocusSelectedWorkOrderAssetRefVisible!=true")
                    if bool(page_summary.get("interiorAffairsSelectedWorkOrderEngineeringCopyVisible", True)):
                        failures.append("interiorAffairsFocusSelectedWorkOrderEngineeringCopyVisible!=false")
                if bool(page_summary.get("interiorAffairsEngineeringCopyVisible", True)):
                    failures.append("interiorAffairsEngineeringCopyVisible!=false")
                if action == "world_open_main_city_interior_affairs_stress_12":
                    if _as_int(page_summary.get("interiorAffairsStressWorkOrderTarget")) != 12:
                        failures.append("interiorAffairsStressWorkOrderTarget!=12")
                    if _as_int(page_summary.get("interiorAffairsActiveWorkOrderCount")) < 12:
                        failures.append("interiorAffairsActiveWorkOrderCount<12")
                    if bool(page_summary.get("interiorAffairsQueueScrollbarVisible", True)):
                        failures.append("interiorAffairsStressScrollbarVisible!=false")
            if action == "world_open_main_city_interior_trade":
                if page_summary.get("interiorTradeExchangeMode") != "resource_exchange_board_v1":
                    failures.append("interiorTradeExchangeMode!=resource_exchange_board_v1")
                if _as_int(page_summary.get("interiorTradeExchangeSourceResourceCount")) != 4:
                    failures.append("interiorTradeExchangeSourceResourceCount!=4")
                if _as_int(page_summary.get("interiorTradeExchangeTargetResourceCount")) != 4:
                    failures.append("interiorTradeExchangeTargetResourceCount!=4")
                if _as_int(page_summary.get("interiorTradeExchangeRatioPercent")) < 40:
                    failures.append("interiorTradeExchangeRatioPercent<40")
                if bool(page_summary.get("interiorTradeExchangeUsesGenericEntryCards", True)):
                    failures.append("interiorTradeExchangeUsesGenericEntryCards!=false")
            if action == "world_open_main_city_interior_market":
                if page_summary.get("interiorMarketSectionIds") != "overview/economy":
                    failures.append("interiorMarketSectionIds!=overview/economy")
                if bool(page_summary.get("interiorMarketRoutingSectionPresent", True)):
                    failures.append("interiorMarketRoutingSectionPresent!=false")
                if page_summary.get("interiorMarketOverviewToken") != INTERIOR_MARKET_OVERVIEW_TOKEN:
                    failures.append(f"interiorMarketOverviewToken!={INTERIOR_MARKET_OVERVIEW_TOKEN}")
                if page_summary.get("interiorMarketOverviewMode") != "consumer_resource_operation_cards_v1":
                    failures.append("interiorMarketOverviewMode!=consumer_resource_operation_cards_v1")
                if page_summary.get("interiorMarketOverviewLayoutMode") != "compact_treasury_dashboard_v1":
                    failures.append("interiorMarketOverviewLayoutMode!=compact_treasury_dashboard_v1")
                if page_summary.get("interiorMarketOverviewIconMode") != "compact_horizontal_badge_v1":
                    failures.append("interiorMarketOverviewIconMode!=compact_horizontal_badge_v1")
                if bool(page_summary.get("interiorMarketOverviewTallSymbolRailVisible", True)):
                    failures.append("interiorMarketOverviewTallSymbolRailVisible!=false")
                if bool(page_summary.get("interiorMarketOverviewCardsStretchToViewport", True)):
                    failures.append("interiorMarketOverviewCardsStretchToViewport!=false")
                if _as_int(page_summary.get("interiorMarketOverviewCardCount")) < 6:
                    failures.append("interiorMarketOverviewCardCount<6")
                if _as_int(page_summary.get("interiorMarketOverviewResourceCardCount")) != 4:
                    failures.append("interiorMarketOverviewResourceCardCount!=4")
                if _as_int(page_summary.get("interiorMarketOverviewOperationCardCount")) < 2:
                    failures.append("interiorMarketOverviewOperationCardCount<2")
                if _as_int(page_summary.get("interiorMarketOverviewTextBlockCount")) != 0:
                    failures.append("interiorMarketOverviewTextBlockCount!=0")
                if _as_int(page_summary.get("interiorMarketOverviewPrimaryFontSize")) < 24:
                    failures.append("interiorMarketOverviewPrimaryFontSize<24")
        if bool(page_summary.get("usesBuildingGroupView", False)):
            failures.append("interiorUsesBuildingGroupView!=false")
        if bool(page_summary.get("hasBuildingTree", False)):
            failures.append("interiorHasBuildingTree!=false")
        if bool(page_summary.get("upgradeSheetHasPayload", False)):
            failures.append("interiorUpgradeSheetHasPayload!=false")
        if bool(page_summary.get("usesBuildingGroupView", False)):
            if not bool(page_summary.get("hasBuildingTree", False)):
                failures.append("interiorHasBuildingTree!=true")
            if not bool(page_summary.get("hasSelectedBuilding", False)):
                failures.append("interiorHasSelectedBuilding!=true")
            if not bool(page_summary.get("upgradeSheetHasPayload", False)):
                failures.append("interiorUpgradeSheetHasPayload!=true")
            if page_summary.get("interiorBuildingTreeGraphToken") != INTERIOR_BUILDING_TREE_GRAPH_TOKEN:
                failures.append(f"interiorBuildingTreeGraphToken!={INTERIOR_BUILDING_TREE_GRAPH_TOKEN}")
            if page_summary.get("interiorBuildingTreeNodeCardToken") != INTERIOR_BUILDING_TREE_NODE_CARD_TOKEN:
                failures.append(f"interiorBuildingTreeNodeCardToken!={INTERIOR_BUILDING_TREE_NODE_CARD_TOKEN}")
            if page_summary.get("interiorBuildingTreeNodeRenderer") != "label_stack_button_card":
                failures.append("interiorBuildingTreeNodeRenderer!=label_stack_button_card")
            if page_summary.get("interiorBuildingTreeNodeLabelStackToken") != INTERIOR_BUILDING_TREE_NODE_LABEL_STACK_TOKEN:
                failures.append(f"interiorBuildingTreeNodeLabelStackToken!={INTERIOR_BUILDING_TREE_NODE_LABEL_STACK_TOKEN}")
            if _as_int(page_summary.get("interiorBuildingTreeNodeLabelLineCount")) != 4:
                failures.append("interiorBuildingTreeNodeLabelLineCount!=4")
            if bool(page_summary.get("interiorBuildingTreeNodeButtonTextEmpty", False)) is not True:
                failures.append("interiorBuildingTreeNodeButtonTextEmpty!=true")
            if page_summary.get("interiorBuildingTreeNodeStateMode") != "selected_disabled_readable_v1":
                failures.append("interiorBuildingTreeNodeStateMode!=selected_disabled_readable_v1")
            if page_summary.get("interiorBuildingTreeLayoutMode") != "independent_horizontal_tree_page_v1":
                failures.append("interiorBuildingTreeLayoutMode!=independent_horizontal_tree_page_v1")
            if page_summary.get("interiorBuildingTreeConnectorToken") != "interior_building_tree_connector_v1":
                failures.append("interiorBuildingTreeConnectorToken!=interior_building_tree_connector_v1")
            if _as_int(page_summary.get("interiorBuildingTreeNodeCount")) < 3:
                failures.append("interiorBuildingTreeNodeCount<3")
            if _as_int(page_summary.get("interiorBuildingTreeNodeMinWidth")) != 180:
                failures.append("interiorBuildingTreeNodeMinWidth!=180")
            if _as_int(page_summary.get("interiorBuildingTreeNodeMinHeight")) != 108:
                failures.append("interiorBuildingTreeNodeMinHeight!=108")
            if _as_int(page_summary.get("interiorBuildingTreeNodeLineSpacing")) != 4:
                failures.append("interiorBuildingTreeNodeLineSpacing!=4")
            if _as_int(page_summary.get("interiorBuildingTreeNodeSelectedBorderWidth")) != 2:
                failures.append("interiorBuildingTreeNodeSelectedBorderWidth!=2")
            if _as_int(page_summary.get("interiorBuildingTreeNodeDisabledAlphaPercent")) != 62:
                failures.append("interiorBuildingTreeNodeDisabledAlphaPercent!=62")
            if _as_int(page_summary.get("interiorBuildingTreeColumnCount")) != 3:
                failures.append("interiorBuildingTreeColumnCount!=3")
            if _as_int(page_summary.get("interiorBuildingTreeRowSeparation")) != 18:
                failures.append("interiorBuildingTreeRowSeparation!=18")
            if _as_int(page_summary.get("interiorBuildingTreeConnectorWidth")) != 54:
                failures.append("interiorBuildingTreeConnectorWidth!=54")
            if _as_int(page_summary.get("interiorBuildingTreeConnectorThickness")) != 2:
                failures.append("interiorBuildingTreeConnectorThickness!=2")
            if bool(page_summary.get("interiorBuildingTreeDetailPanelVisible", False)) is not True:
                failures.append("interiorBuildingTreeDetailPanelVisible!=true")
            if page_summary.get("interiorUpgradeSheetToken") != INTERIOR_BUILDING_UPGRADE_SHEET_TOKEN:
                failures.append(f"interiorUpgradeSheetToken!={INTERIOR_BUILDING_UPGRADE_SHEET_TOKEN}")
            if page_summary.get("interiorUpgradeSheetMode") != "floating_upgrade_detail_panel_v1":
                failures.append("interiorUpgradeSheetMode!=floating_upgrade_detail_panel_v1")
            if page_summary.get("interiorUpgradeSheetActionStateToken") != INTERIOR_UPGRADE_SHEET_ACTION_STATE_TOKEN:
                failures.append(f"interiorUpgradeSheetActionStateToken!={INTERIOR_UPGRADE_SHEET_ACTION_STATE_TOKEN}")
            if page_summary.get("interiorUpgradeSheetPrimaryPriority") != "primary_hot_enabled_payload_only":
                failures.append("interiorUpgradeSheetPrimaryPriority!=primary_hot_enabled_payload_only")
            if page_summary.get("interiorUpgradeSheetTemplateFeedbackMode") != "template_feedback_inline_v1":
                failures.append("interiorUpgradeSheetTemplateFeedbackMode!=template_feedback_inline_v1")
            if page_summary.get("interiorUpgradeSheetSubmittedStateMode") != "submitted_banner_v1":
                failures.append("interiorUpgradeSheetSubmittedStateMode!=submitted_banner_v1")
            if _as_int(page_summary.get("interiorUpgradeSheetMinWidth")) != 360:
                failures.append("interiorUpgradeSheetMinWidth!=360")
            if _as_int(page_summary.get("interiorUpgradeSheetMinHeight")) != 430:
                failures.append("interiorUpgradeSheetMinHeight!=430")
            if page_summary.get("interiorSummaryCardMode") != "compact_building_context":
                failures.append("interiorSummaryCardMode!=compact_building_context")
            if _as_int(page_summary.get("interiorSummaryCardLineCount")) > 4:
                failures.append("interiorSummaryCardLineCount>4")
            if page_summary.get("interiorFacilityNodeHubToken") != INTERIOR_FACILITY_NODE_HUB_TOKEN:
                failures.append(f"interiorFacilityNodeHubToken!={INTERIOR_FACILITY_NODE_HUB_TOKEN}")
            if page_summary.get("interiorFacilityNodeHubMode") != "interior_scene_nodes":
                failures.append("interiorFacilityNodeHubMode!=interior_scene_nodes")
            if _as_int(page_summary.get("interiorFacilityNodeCount")) < 7:
                failures.append("interiorFacilityNodeCount<7")
            if _as_int(page_summary.get("interiorFacilityNodeMinWidth")) != 116:
                failures.append("interiorFacilityNodeMinWidth!=116")
            if _as_int(page_summary.get("interiorFacilityNodeMinHeight")) != 74:
                failures.append("interiorFacilityNodeMinHeight!=74")
            if _as_int(page_summary.get("interiorFacilityNodeHubRows")) != 2:
                failures.append("interiorFacilityNodeHubRows!=2")
            if bool(page_summary.get("interiorFacilityNodeHubVisible", False)) is not True:
                failures.append("interiorFacilityNodeHubVisible!=true")
            if page_summary.get("interiorBuildingGroupCopyDensityToken") != INTERIOR_BUILDING_GROUP_COPY_DENSITY_TOKEN:
                failures.append(f"interiorBuildingGroupCopyDensityToken!={INTERIOR_BUILDING_GROUP_COPY_DENSITY_TOKEN}")
            if page_summary.get("interiorBuildingGroupCopyMode") != "mobile_short_consumer_terms_v1":
                failures.append("interiorBuildingGroupCopyMode!=mobile_short_consumer_terms_v1")
            if page_summary.get("interiorBuildingGroupOrder") != INTERIOR_BUILDING_GROUP_ORDER:
                failures.append(f"interiorBuildingGroupOrder!={INTERIOR_BUILDING_GROUP_ORDER}")
            if page_summary.get("interiorBuildingGroupNodeLabelOrder") != INTERIOR_BUILDING_GROUP_NODE_LABEL_ORDER:
                failures.append(f"interiorBuildingGroupNodeLabelOrder!={INTERIOR_BUILDING_GROUP_NODE_LABEL_ORDER}")
            if _as_int(page_summary.get("interiorBuildingGroupTotalNodeCount")) != 9:
                failures.append("interiorBuildingGroupTotalNodeCount!=9")
            if _as_int(page_summary.get("interiorBuildingGroupMaxCostTextLength")) > 18:
                failures.append("interiorBuildingGroupMaxCostTextLength>18")
            if _as_int(page_summary.get("interiorBuildingGroupCostSeparatorCount")) != 0:
                failures.append("interiorBuildingGroupCostSeparatorCount!=0")
            if _as_int(page_summary.get("interiorBuildingGroupForbiddenTermCount")) != 0:
                failures.append("interiorBuildingGroupForbiddenTermCount!=0")
            if _as_int(page_summary.get("interiorBuildingGroupMaxStatusTextLength")) > 16:
                failures.append("interiorBuildingGroupMaxStatusTextLength>16")
            if _as_int(page_summary.get("interiorBuildingGroupMaxMetaTextLength")) > 16:
                failures.append("interiorBuildingGroupMaxMetaTextLength>16")
        if action in INTERIOR_SECONDARY_BACK_BUTTON_IDENTITY_ACTIONS:
            expected_start_page_id = INTERIOR_SECONDARY_BACK_BUTTON_IDENTITY_ACTIONS[action]
            if not bool(page_summary.get("ok", False)):
                failures.append("interiorSecondaryBackButtonIdentitySummaryOk!=true")
            if page_summary.get("activePageId") != "home/lobby":
                failures.append("interiorSecondaryBackButtonAfterPageId!=home/lobby")
            if page_summary.get("interiorSecondaryBackButtonBeforePageId") != expected_start_page_id:
                if action == "world_open_main_city_interior_trade_back_button_identity":
                    failures.append("interiorSecondaryBackButtonBeforePageId!=trade/overview")
                elif action == "world_open_main_city_interior_tax_back_button_identity":
                    failures.append("interiorSecondaryBackButtonBeforePageId!=tax/structure")
                elif action == "world_open_main_city_interior_affairs_back_button_identity":
                    failures.append("interiorSecondaryBackButtonBeforePageId!=affairs/queue")
                else:
                    failures.append("interiorSecondaryBackButtonBeforePageId!=market/overview")
            if page_summary.get("interiorSecondaryBackButtonClickedActionId") != "fullscreen_panel_back":
                failures.append("interiorSecondaryBackButtonClickedActionId!=fullscreen_panel_back")
            if page_summary.get("interiorSecondaryBackButtonClickedTargetPageId") != "home/lobby":
                failures.append("interiorSecondaryBackButtonClickedTargetPageId!=home/lobby")
            if page_summary.get("interiorSecondaryBackButtonClickedLabel") != "返回":
                failures.append("interiorSecondaryBackButtonClickedLabel!=返回")
            if page_summary.get("interiorSecondaryBackButtonClickedToken") != FULLSCREEN_PANEL_BACK_BUTTON_TOKEN:
                failures.append(f"interiorSecondaryBackButtonClickedToken!={FULLSCREEN_PANEL_BACK_BUTTON_TOKEN}")
            if page_summary.get("interiorSecondaryBackButtonClickedLiveTextContract") != FULLSCREEN_PANEL_BACK_LIVE_TEXT_CONTRACT:
                failures.append(f"interiorSecondaryBackButtonClickedLiveTextContract!={FULLSCREEN_PANEL_BACK_LIVE_TEXT_CONTRACT}")
            if page_summary.get("interiorSecondaryBackButtonClickedButtonName") != "BackButton":
                failures.append("interiorSecondaryBackButtonClickedButtonName!=BackButton")
            if bool(page_summary.get("interiorSecondaryBackButtonClickVerified", False)) is not True:
                failures.append("interiorSecondaryBackButtonClickVerified!=true")
        if bool(page_summary.get("authorityTriggered", True)):
            failures.append("authorityTriggered!=false")
    if action in TROOP_PANEL_VISUAL_CONTRACT_ACTIONS:
        failures.extend(_validate_troop_panel_touch_scroll_source_contract())
        failures.extend(_validate_troop_motion_contract(page_summary))
        failures.extend(
            _validate_design_system_contract(
                page_summary,
                "troop_shell",
                require_production_baseline=False,
            )
        )
        failures.extend(_validate_module_token_contract(page_summary, "troop"))
        if page_summary.get("troopSummaryVersion") != "troop_summary_v2":
            failures.append("troopSummaryVersion!=troop_summary_v2")
        if page_summary.get("troopPanelTouchScrollMode") != BATTLE_REPORT_DETAIL_SCROLL_MODE:
            failures.append(f"troopPanelTouchScrollMode!={BATTLE_REPORT_DETAIL_SCROLL_MODE}")
        if bool(page_summary.get("troopPanelBrowserScrollbarVisible", True)):
            failures.append("troopPanelBrowserScrollbarVisible!=false")
        if _as_int(page_summary.get("troopPanelBodyScrollHorizontalMode"), -1) != 3:
            failures.append("troopPanelBodyScrollHorizontalMode!=3")
        if _as_int(page_summary.get("troopPanelBodyScrollVerticalMode"), -1) != 3:
            failures.append("troopPanelBodyScrollVerticalMode!=3")
        if not bool(page_summary.get("ok", False)):
            failures.append("troopSummaryOk!=true")
        if _as_int(page_summary.get("troopCount")) <= 0:
            failures.append("troopCount<=0")
        if _as_int(page_summary.get("facilityCount")) <= 0:
            failures.append("facilityCount<=0")
        if _as_int(page_summary.get("visibleTroopButtonCount")) <= 0:
            failures.append("visibleTroopButtonCount<=0")
        if _as_int(page_summary.get("visibleFacilityButtonCount")) <= 0:
            failures.append("visibleFacilityButtonCount<=0")
        if not bool(page_summary.get("hasBuildingTree", False)):
            failures.append("hasBuildingTree!=true")
        if not bool(page_summary.get("hasTreeItems", False)):
            failures.append("hasTreeItems!=true")
        if not bool(page_summary.get("hasSelectedBuilding", False)):
            failures.append("hasSelectedBuilding!=true")
        if not bool(page_summary.get("hasUpgradeSheet", False)):
            failures.append("hasUpgradeSheet!=true")
        if not bool(page_summary.get("upgradeSheetHasPayload", False)):
            failures.append("upgradeSheetHasPayload!=true")
        if bool(page_summary.get("authorityTriggered", True)):
            failures.append("authorityTriggered!=false")
    if action in TROOP_ASSIGN_PREVIEW_CONTRACT_ACTIONS:
        failures.extend(_validate_troop_formation_read_model_portrait_contract())
        failures.extend(_validate_main_city_troop_card_rail_source_contract())
        if page_summary.get("troopSummaryVersion") != "main_city_troop_assign_preview_v1":
            failures.append("troopSummaryVersion!=main_city_troop_assign_preview_v1")
        if not bool(page_summary.get("ok", False)):
            failures.append("troopAssignPreviewOk!=true")
        if not bool(page_summary.get("contextPanelVisible", False)):
            failures.append("contextPanelVisible!=true")
        if page_summary.get("activeContextTab") != "troop":
            failures.append("activeContextTab!=troop")
        if _as_int(page_summary.get("templateAssignmentCount")) < 1:
            failures.append("templateAssignmentCount<1")
        if page_summary.get("templateOnly") is not True:
            failures.append("templateOnly!=true")
        if page_summary.get("troopFormationViewMode") != "team_card_pool_v1":
            failures.append("troopFormationViewMode!=team_card_pool_v1")
        if page_summary.get("troopFormationDataSource") != "read_model":
            failures.append("troopFormationDataSource!=read_model")
        if page_summary.get("troopFormationLayoutToken") != "city_space_team_card_pool_to_detail_v2":
            failures.append("troopFormationLayoutToken!=city_space_team_card_pool_to_detail_v2")
        if page_summary.get("troopFormationTeamListOrientation") != "horizontal":
            failures.append("troopFormationTeamListOrientation!=horizontal")
        if page_summary.get("troopFormationRosterCardPortraitSource") != "leader_slot_asset_ref":
            failures.append("troopFormationRosterCardPortraitSource!=leader_slot_asset_ref")
        if page_summary.get("troopFormationPortraitAssetSource") != PORTRAIT_FRAME_SAFE_ASSET_SOURCE:
            failures.append(f"troopFormationPortraitAssetSource!={PORTRAIT_FRAME_SAFE_ASSET_SOURCE}")
        if bool(page_summary.get("troopFormationExternalExchangeBundleVisible", True)):
            failures.append("troopFormationExternalExchangeBundleVisible!=false")
        if bool(page_summary.get("troopFormationDetailVisible", True)):
            failures.append("troopFormationDetailVisible!=false")
        if _as_int(page_summary.get("troopFormationTeamCount")) < 5:
            failures.append("troopFormationTeamCount<5")
        if _as_int(page_summary.get("troopFormationVisibleTeamCardCount")) < 5:
            failures.append("troopFormationVisibleTeamCardCount<5")
        if _as_int(page_summary.get("troopFormationInitialVisibleCardTarget")) != 3:
            failures.append("troopFormationInitialVisibleCardTarget!=3")
        if page_summary.get("troopFormationCardRailLayoutToken") != CARD_RAIL_LAYOUT_TOKEN:
            failures.append(f"troopFormationCardRailLayoutToken!={CARD_RAIL_LAYOUT_TOKEN}")
        if page_summary.get("troopFormationCardRailScrollMode") != CARD_RAIL_SCROLL_MODE:
            failures.append(f"troopFormationCardRailScrollMode!={CARD_RAIL_SCROLL_MODE}")
        if page_summary.get("troopFormationCardRailScrollbarVisibility") != "hidden":
            failures.append("troopFormationCardRailScrollbarVisibility!=hidden")
        if page_summary.get("troopFormationCardRailInputMode") != "touch_mouse_horizontal_drag":
            failures.append("troopFormationCardRailInputMode!=touch_mouse_horizontal_drag")
        if _as_int(page_summary.get("troopFormationCardRailInitialVisibleCardTarget")) != 3:
            failures.append("troopFormationCardRailInitialVisibleCardTarget!=3")
        if _as_int(page_summary.get("troopFormationCardRailViewportWidth")) != TROOP_FORMATION_TEAM_CARD_VIEWPORT_WIDTH_3:
            failures.append(f"troopFormationCardRailViewportWidth!={TROOP_FORMATION_TEAM_CARD_VIEWPORT_WIDTH_3}")
        if _as_int(page_summary.get("troopFormationCardRailViewportHeight")) != TROOP_FORMATION_TEAM_CARD_MIN_HEIGHT:
            failures.append(f"troopFormationCardRailViewportHeight!={TROOP_FORMATION_TEAM_CARD_MIN_HEIGHT}")
        if _as_int(page_summary.get("troopFormationCardRailContentWidth")) != TROOP_FORMATION_TEAM_CARD_CONTENT_WIDTH_5:
            failures.append(f"troopFormationCardRailContentWidth!={TROOP_FORMATION_TEAM_CARD_CONTENT_WIDTH_5}")
        if _as_int(page_summary.get("troopFormationCardRailCardWidth")) != TROOP_FORMATION_TEAM_CARD_WIDTH:
            failures.append(f"troopFormationCardRailCardWidth!={TROOP_FORMATION_TEAM_CARD_WIDTH}")
        if _as_int(page_summary.get("troopFormationCardRailCardHeight")) != TROOP_FORMATION_TEAM_CARD_HEIGHT:
            failures.append(f"troopFormationCardRailCardHeight!={TROOP_FORMATION_TEAM_CARD_HEIGHT}")
        if _as_int(page_summary.get("troopFormationCardRailGap")) != TROOP_FORMATION_TEAM_CARD_GAP:
            failures.append(f"troopFormationCardRailGap!={TROOP_FORMATION_TEAM_CARD_GAP}")
        if _as_int(page_summary.get("troopFormationCardRailMinHeight")) != TROOP_FORMATION_TEAM_CARD_MIN_HEIGHT:
            failures.append(f"troopFormationCardRailMinHeight!={TROOP_FORMATION_TEAM_CARD_MIN_HEIGHT}")
        if page_summary.get("troopFormationTeamPoolPlacement") != "bottom_strip":
            failures.append("troopFormationTeamPoolPlacement!=bottom_strip")
        if page_summary.get("troopFormationRosterCardTextMode") != "portrait_current_soldiers_only_v1":
            failures.append("troopFormationRosterCardTextMode!=portrait_current_soldiers_only_v1")
        if page_summary.get("troopFormationRosterCardVisualDensity") != "larger_portrait_raised_pool_v3":
            failures.append("troopFormationRosterCardVisualDensity!=larger_portrait_raised_pool_v3")
        if page_summary.get("troopFormationRosterPortraitScaleMode") != PORTRAIT_FRAME_SAFE_FIT_MODE:
            failures.append(f"troopFormationRosterPortraitScaleMode!={PORTRAIT_FRAME_SAFE_FIT_MODE}")
        failures.extend(_validate_portrait_frame_contract(page_summary, "troopFormationRoster", PORTRAIT_FRAME_ROSTER_CARD_VARIANT))
        if page_summary.get("troopFormationRosterPortraitResolveMode") != "registry_first":
            failures.append("troopFormationRosterPortraitResolveMode!=registry_first")
        if page_summary.get("troopFormationRosterPortraitResolvedBy") != PORTRAIT_FRAME_REGISTRY_ID:
            failures.append(f"troopFormationRosterPortraitResolvedBy!={PORTRAIT_FRAME_REGISTRY_ID}")
        if _as_int(page_summary.get("troopFormationRosterPortraitFallbackCount"), -1) != 0:
            failures.append("troopFormationRosterPortraitFallbackCount!=0")
        if bool(page_summary.get("troopFormationPoolTitleVisible", True)):
            failures.append("troopFormationPoolTitleVisible!=false")
        if bool(page_summary.get("troopFormationTeamNameVisible", True)):
            failures.append("troopFormationTeamNameVisible!=false")
        if bool(page_summary.get("troopFormationSoldierMaxVisible", True)):
            failures.append("troopFormationSoldierMaxVisible!=false")
        if bool(page_summary.get("troopFormationCityCompositionTextVisible", True)):
            failures.append("troopFormationCityCompositionTextVisible!=false")
        if not bool(page_summary.get("troopFormationCityModelVisible", False)):
            failures.append("troopFormationCityModelVisible!=true")
        if not bool(page_summary.get("troopFormationFacilityEntryVisible", False)):
            failures.append("troopFormationFacilityEntryVisible!=true")
        if bool(page_summary.get("troopFormationCompositionNodeLabelVisible", True)):
            failures.append("troopFormationCompositionNodeLabelVisible!=false")
        if page_summary.get("troopFormationFacilityEntryMode") != "building_tree_single_tile_v1":
            failures.append("troopFormationFacilityEntryMode!=building_tree_single_tile_v1")
        if not bool(page_summary.get("troopFormationFacilityEntryTileOnly", False)):
            failures.append("troopFormationFacilityEntryTileOnly!=true")
        if bool(page_summary.get("troopFormationFacilityEntryPngVisible", True)):
            failures.append("troopFormationFacilityEntryPngVisible!=false")
        if bool(page_summary.get("troopFormationEngineeringCopyVisible", True)):
            failures.append("troopFormationEngineeringCopyVisible!=false")
        if bool(page_summary.get("troopFormationBrowserScrollbarVisible", True)):
            failures.append("troopFormationBrowserScrollbarVisible!=false")
        if bool(page_summary.get("authorityTriggered", True)):
            failures.append("authorityTriggered!=false")
    if action in TROOP_TEAM_CARD_BUTTON_IDENTITY_ACTIONS:
        expected_team_id, expected_button_name = TROOP_TEAM_CARD_BUTTON_IDENTITY_ACTIONS[action]
        if not bool(page_summary.get("ok", False)):
            failures.append("troopTeamCardIdentitySummaryOk!=true")
        if page_summary.get("troopFormationSelectedTeamId") != expected_team_id:
            failures.append(f"troopFormationSelectedTeamId!={expected_team_id}")
        expected_action_id = f"troop_team_select:{expected_team_id}"
        if page_summary.get("troopFormationTeamCardClickedActionId") != expected_action_id:
            if expected_team_id == "team_02":
                failures.append("troopFormationTeamCardClickedActionId!=troop_team_select:team_02")
            else:
                failures.append("troopFormationTeamCardClickedActionId!=troop_team_select:team_01")
        if page_summary.get("troopFormationTeamCardClickedTeamId") != expected_team_id:
            failures.append(f"troopFormationTeamCardClickedTeamId!={expected_team_id}")
        if str(page_summary.get("troopFormationTeamCardClickedLabel", "")).strip() == "":
            failures.append("troopFormationTeamCardClickedLabel empty")
        if page_summary.get("troopFormationTeamCardClickedToken") != TROOP_TEAM_CARD_BUTTON_TOKEN:
            failures.append(f"troopFormationTeamCardClickedToken!={TROOP_TEAM_CARD_BUTTON_TOKEN}")
        if page_summary.get("troopFormationTeamCardClickedLiveTextContract") != TROOP_TEAM_CARD_LIVE_TEXT_CONTRACT:
            failures.append(f"troopFormationTeamCardClickedLiveTextContract!={TROOP_TEAM_CARD_LIVE_TEXT_CONTRACT}")
        if page_summary.get("troopFormationTeamCardClickedButtonName") != expected_button_name:
            failures.append(f"troopFormationTeamCardClickedButtonName!={expected_button_name}")
        if bool(page_summary.get("troopFormationTeamCardClickVerified", False)) is not True:
            failures.append("troopFormationTeamCardClickVerified!=true")
        if bool(page_summary.get("authorityTriggered", True)):
            failures.append("authorityTriggered!=false")
    if action in TROOP_DETAIL_ACTION_BUTTON_IDENTITY_ACTIONS:
        expected_action_id, expected_mode, expected_label, expected_button_name = TROOP_DETAIL_ACTION_BUTTON_IDENTITY_ACTIONS[action]
        if not bool(page_summary.get("ok", False)):
            failures.append("troopDetailActionIdentitySummaryOk!=true")
        if page_summary.get("troopFormationSelectedTeamId") != "team_01":
            failures.append("troopFormationSelectedTeamId!=team_01")
        if page_summary.get("troopFormationDetailToolMode") != expected_mode:
            failures.append(f"troopFormationDetailToolMode!={expected_mode}")
        if page_summary.get("troopDetailActionClickedActionId") != expected_action_id:
            if expected_mode == "config":
                failures.append("troopDetailActionClickedActionId!=troop_detail_mode:config")
            else:
                failures.append("troopDetailActionClickedActionId!=troop_detail_mode:recruit")
        if page_summary.get("troopDetailActionClickedMode") != expected_mode:
            failures.append(f"troopDetailActionClickedMode!={expected_mode}")
        if page_summary.get("troopDetailActionClickedLabel") != expected_label:
            failures.append(f"troopDetailActionClickedLabel!={expected_label}")
        if page_summary.get("troopDetailActionClickedToken") != TROOP_DETAIL_ACTION_BUTTON_TOKEN:
            failures.append(f"troopDetailActionClickedToken!={TROOP_DETAIL_ACTION_BUTTON_TOKEN}")
        if page_summary.get("troopDetailActionClickedLiveTextContract") != TROOP_DETAIL_ACTION_LIVE_TEXT_CONTRACT:
            failures.append(f"troopDetailActionClickedLiveTextContract!={TROOP_DETAIL_ACTION_LIVE_TEXT_CONTRACT}")
        if page_summary.get("troopDetailActionClickedButtonName") != expected_button_name:
            failures.append(f"troopDetailActionClickedButtonName!={expected_button_name}")
        if bool(page_summary.get("troopDetailActionClickVerified", False)) is not True:
            failures.append("troopDetailActionClickVerified!=true")
        if bool(page_summary.get("authorityTriggered", True)):
            failures.append("authorityTriggered!=false")
    if action in TROOP_DETAIL_BACK_BUTTON_IDENTITY_ACTIONS:
        expected_action_id, expected_target_mode, expected_label, expected_button_name = TROOP_DETAIL_BACK_BUTTON_IDENTITY_ACTIONS[action]
        if not bool(page_summary.get("ok", False)):
            failures.append("troopDetailBackButtonIdentitySummaryOk!=true")
        if page_summary.get("activeContextTab") != "troop":
            failures.append("activeContextTab!=troop")
        if bool(page_summary.get("troopFormationDetailVisible", True)):
            failures.append("troopFormationDetailVisible!=false")
        if str(page_summary.get("troopFormationSelectedTeamId", "")).strip() != "":
            failures.append("troopFormationSelectedTeamId!=empty")
        if _as_int(page_summary.get("troopFormationVisibleTeamCardCount"), 0) < 1:
            failures.append("troopFormationVisibleTeamCardCount<1")
        if page_summary.get("troopDetailBackButtonClickedActionId") != expected_action_id:
            failures.append("troopDetailBackButtonClickedActionId!=troop_detail_back_to_roster")
        if page_summary.get("troopDetailBackButtonClickedTargetMode") != expected_target_mode:
            failures.append(f"troopDetailBackButtonClickedTargetMode!={expected_target_mode}")
        if page_summary.get("troopDetailBackButtonClickedLabel") != expected_label:
            failures.append(f"troopDetailBackButtonClickedLabel!={expected_label}")
        if page_summary.get("troopDetailBackButtonClickedToken") != TROOP_DETAIL_BACK_BUTTON_TOKEN:
            failures.append(f"troopDetailBackButtonClickedToken!={TROOP_DETAIL_BACK_BUTTON_TOKEN}")
        if page_summary.get("troopDetailBackButtonClickedLiveTextContract") != TROOP_DETAIL_BACK_LIVE_TEXT_CONTRACT:
            failures.append(f"troopDetailBackButtonClickedLiveTextContract!={TROOP_DETAIL_BACK_LIVE_TEXT_CONTRACT}")
        if page_summary.get("troopDetailBackButtonClickedButtonName") != expected_button_name:
            failures.append(f"troopDetailBackButtonClickedButtonName!={expected_button_name}")
        if bool(page_summary.get("troopDetailBackButtonClickVerified", False)) is not True:
            failures.append("troopDetailBackButtonClickVerified!=true")
        if bool(page_summary.get("authorityTriggered", True)):
            failures.append("authorityTriggered!=false")
    if action in TROOP_ASSIGN_DETAIL_CONTRACT_ACTIONS:
        failures.extend(_validate_troop_formation_read_model_portrait_contract())
        if page_summary.get("troopSummaryVersion") != "main_city_troop_assign_preview_v1":
            failures.append("troopSummaryVersion!=main_city_troop_assign_preview_v1")
        if not bool(page_summary.get("ok", False)):
            failures.append("troopAssignPreviewOk!=true")
        if page_summary.get("troopFormationViewMode") != "three_general_team_detail_v2":
            failures.append("troopFormationViewMode!=three_general_team_detail_v2")
        if page_summary.get("troopFormationLayoutToken") != "city_space_team_card_pool_to_detail_v2":
            failures.append("troopFormationLayoutToken!=city_space_team_card_pool_to_detail_v2")
        if page_summary.get("troopFormationDetailLayoutToken") != "commercial_drill_ground_layered_slot_anchor_polish_v10":
            failures.append("troopFormationDetailLayoutToken!=commercial_drill_ground_layered_slot_anchor_polish_v10")
        if page_summary.get("troopFormationDetailSlotRoleMode") != "camp_mid_front_layered_hero_cards_grounded_manifest_units_v10":
            failures.append("troopFormationDetailSlotRoleMode!=camp_mid_front_layered_hero_cards_grounded_manifest_units_v10")
        if not bool(page_summary.get("troopFormationDetailVisible", False)):
            failures.append("troopFormationDetailVisible!=true")
        if bool(page_summary.get("troopFormationDetailTeamNameVisible", True)):
            failures.append("troopFormationDetailTeamNameVisible!=false")
        if bool(page_summary.get("troopFormationDetailSoldierMaxVisible", True)):
            failures.append("troopFormationDetailSoldierMaxVisible!=false")
        if not bool(page_summary.get("troopFormationDetailActionRowVisible", False)):
            failures.append("troopFormationDetailActionRowVisible!=true")
        if page_summary.get("troopFormationSelectedTeamId") != "team_01":
            failures.append("troopFormationSelectedTeamId!=team_01")
        if page_summary.get("troopFormationTeamCardClickedActionId") != "troop_team_select:team_01":
            failures.append("troopFormationTeamCardClickedActionId!=troop_team_select:team_01")
        if page_summary.get("troopFormationTeamCardClickedTeamId") != "team_01":
            failures.append("troopFormationTeamCardClickedTeamId!=team_01")
        if str(page_summary.get("troopFormationTeamCardClickedLabel", "")).strip() == "":
            failures.append("troopFormationTeamCardClickedLabel empty")
        if page_summary.get("troopFormationTeamCardClickedToken") != TROOP_TEAM_CARD_BUTTON_TOKEN:
            failures.append(f"troopFormationTeamCardClickedToken!={TROOP_TEAM_CARD_BUTTON_TOKEN}")
        if page_summary.get("troopFormationTeamCardClickedLiveTextContract") != TROOP_TEAM_CARD_LIVE_TEXT_CONTRACT:
            failures.append(f"troopFormationTeamCardClickedLiveTextContract!={TROOP_TEAM_CARD_LIVE_TEXT_CONTRACT}")
        if page_summary.get("troopFormationTeamCardClickedButtonName") != "TroopTeamButton_team_01":
            failures.append("troopFormationTeamCardClickedButtonName!=TroopTeamButton_team_01")
        if bool(page_summary.get("troopFormationTeamCardClickVerified", False)) is not True:
            failures.append("troopFormationTeamCardClickVerified!=true")
        if page_summary.get("troopFormationPortraitAssetSource") != PORTRAIT_FRAME_SAFE_ASSET_SOURCE:
            failures.append(f"troopFormationPortraitAssetSource!={PORTRAIT_FRAME_SAFE_ASSET_SOURCE}")
        failures.extend(_validate_portrait_frame_contract(page_summary, "troopFormationDetail", PORTRAIT_FRAME_DETAIL_LARGE_VARIANT))
        if page_summary.get("troopFormationDetailPortraitResolveMode") != "registry_first":
            failures.append("troopFormationDetailPortraitResolveMode!=registry_first")
        if page_summary.get("troopFormationDetailPortraitResolvedBy") != PORTRAIT_FRAME_REGISTRY_ID:
            failures.append(f"troopFormationDetailPortraitResolvedBy!={PORTRAIT_FRAME_REGISTRY_ID}")
        if _as_int(page_summary.get("troopFormationDetailPortraitFallbackCount"), -1) != 0:
            failures.append("troopFormationDetailPortraitFallbackCount!=0")
        if bool(page_summary.get("troopFormationExternalExchangeBundleVisible", True)):
            failures.append("troopFormationExternalExchangeBundleVisible!=false")
        if _as_int(page_summary.get("troopFormationGeneralSlotCount")) != 3:
            failures.append("troopFormationGeneralSlotCount!=3")
        if page_summary.get("troopFormationTroopTypeChipToken") != "troop_formation_troop_type_chip_v1":
            failures.append("troopFormationTroopTypeChipToken!=troop_formation_troop_type_chip_v1")
        if not bool(page_summary.get("troopFormationTroopTypeChipVisible", False)):
            failures.append("troopFormationTroopTypeChipVisible!=true")
        if _as_int(page_summary.get("troopFormationTroopTypeChipCount")) < 3:
            failures.append("troopFormationTroopTypeChipCount<3")
        troop_type_chip_labels = page_summary.get("troopFormationTroopTypeChipLabels", [])
        if not isinstance(troop_type_chip_labels, list) or len([label for label in troop_type_chip_labels if str(label).strip()]) < 3:
            failures.append("troopFormationTroopTypeChipLabels<3")
        if _as_int(page_summary.get("troopFormationRecruitBarCount")) != 0:
            failures.append("troopFormationRecruitBarCount!=0")
        if bool(page_summary.get("troopFormationBrowserScrollbarVisible", True)):
            failures.append("troopFormationBrowserScrollbarVisible!=false")
        if bool(page_summary.get("authorityTriggered", True)):
            failures.append("authorityTriggered!=false")
    if action in MAIN_CITY_TROOP_FORMATION_TROOP_TYPE_CHIP_ACTIONS:
        if page_summary.get("troopFormationViewMode") != "three_general_team_detail_v2":
            failures.append("troopFormationViewMode!=three_general_team_detail_v2")
        if not bool(page_summary.get("troopFormationDetailVisible", False)):
            failures.append("troopFormationDetailVisible!=true")
        if _as_int(page_summary.get("troopFormationGeneralSlotCount")) != 3:
            failures.append("troopFormationGeneralSlotCount!=3")
        if page_summary.get("troopFormationTroopTypeChipToken") != "troop_formation_troop_type_chip_v1":
            failures.append("troopFormationTroopTypeChipToken!=troop_formation_troop_type_chip_v1")
        if not bool(page_summary.get("troopFormationTroopTypeChipVisible", False)):
            failures.append("troopFormationTroopTypeChipVisible!=true")
        if _as_int(page_summary.get("troopFormationTroopTypeChipCount")) < 3:
            failures.append("troopFormationTroopTypeChipCount<3")
        troop_type_chip_labels = page_summary.get("troopFormationTroopTypeChipLabels", [])
        if not isinstance(troop_type_chip_labels, list) or len([label for label in troop_type_chip_labels if str(label).strip()]) < 3:
            failures.append("troopFormationTroopTypeChipLabels<3")
        troop_type_chip_visual_types = page_summary.get("troopFormationTroopTypeChipVisualTypes", [])
        if not isinstance(troop_type_chip_visual_types, list) or len([label for label in troop_type_chip_visual_types if str(label).strip()]) < 3:
            failures.append("troopFormationTroopTypeChipVisualTypes<3")
    if action in GENERAL_ROSTER_VISUAL_CONTRACT_ACTIONS:
        failures.extend(_validate_design_system_contract(page_summary, "general_formal_pack"))
        failures.extend(_validate_general_motion_contract(page_summary))
        failures.extend(_validate_general_roster_touch_flow_source_contract())
        failures.extend(_validate_hero_card_contract(
            page_summary,
            "owned_roster",
            min_sample_count=6,
            require_portrait_resolution=True,
            min_portrait_checked_count=6,
        ))
        failures.extend(_validate_general_portrait_source_contract())
        if page_summary.get("rosterViewMode") != "formal_pack_owned_roster_responsive_flow":
            failures.append("rosterViewMode!=formal_pack_owned_roster_responsive_flow")
        if page_summary.get("rosterCardMode") != "owned_roster":
            failures.append("rosterCardMode!=owned_roster")
        if page_summary.get("rosterScrollInputMode") != "touch_mouse_drag_v1":
            failures.append("rosterScrollInputMode!=touch_mouse_drag_v1")
        if page_summary.get("rosterScrollBarVisibility") != "hidden":
            failures.append("rosterScrollBarVisibility!=hidden")
        if page_summary.get("rosterResponsiveColumnPolicy") != "available_width_flow_v1":
            failures.append("rosterResponsiveColumnPolicy!=available_width_flow_v1")
        if _as_int(page_summary.get("rosterResponsiveMaxColumns")) < 5:
            failures.append("rosterResponsiveMaxColumns<5")
        if bool(page_summary.get("rosterFixedColumnCount", True)):
            failures.append("rosterFixedColumnCount!=false")
        if page_summary.get("rosterChromeMode") != "card_grid_entry_only":
            failures.append("rosterChromeMode!=card_grid_entry_only")
        if bool(page_summary.get("rosterTabStripVisible", True)):
            failures.append("rosterTabStripVisible!=false")
        if bool(page_summary.get("rosterFilterBarVisible", True)):
            failures.append("rosterFilterBarVisible!=false")
        if bool(page_summary.get("rosterSelectorVisible", True)):
            failures.append("rosterSelectorVisible!=false")
        if not bool(page_summary.get("rosterCloseButtonVisible", False)):
            failures.append("rosterCloseButtonVisible!=true")
        if page_summary.get("rosterCloseButtonToken") != GENERAL_ROSTER_CLOSE_BUTTON_TOKEN:
            failures.append(f"rosterCloseButtonToken!={GENERAL_ROSTER_CLOSE_BUTTON_TOKEN}")
        if _as_int(page_summary.get("rosterCloseButtonWidth")) != 122:
            failures.append("rosterCloseButtonWidth!=122")
        if _as_int(page_summary.get("rosterCloseButtonHeight")) != 56:
            failures.append("rosterCloseButtonHeight!=56")
        if _as_int(page_summary.get("rosterCloseButtonFontSize")) != 24:
            failures.append("rosterCloseButtonFontSize!=24")
        if page_summary.get("rosterDetailButtonToken") != GENERAL_ROSTER_DETAIL_BUTTON_TOKEN:
            failures.append(f"rosterDetailButtonToken!={GENERAL_ROSTER_DETAIL_BUTTON_TOKEN}")
        if page_summary.get("rosterDetailButtonLiveTextContract") != "general_roster_detail_live_text_v1":
            failures.append("rosterDetailButtonLiveTextContract!=general_roster_detail_live_text_v1")
        if page_summary.get("rosterDetailButtonText") != "详情":
            failures.append("rosterDetailButtonText!=详情")
        if _as_int(page_summary.get("rosterDetailButtonWidth")) != 92:
            failures.append("rosterDetailButtonWidth!=92")
        if _as_int(page_summary.get("rosterDetailButtonHeight")) != 42:
            failures.append("rosterDetailButtonHeight!=42")
        if _as_int(page_summary.get("rosterDetailButtonFontSize")) != 18:
            failures.append("rosterDetailButtonFontSize!=18")
        if not bool(page_summary.get("rosterOpensProfileOnCardClick", False)):
            failures.append("rosterOpensProfileOnCardClick!=true")
        if page_summary.get("rosterOwnerSlotFieldSource") != "owner_display_name":
            failures.append("rosterOwnerSlotFieldSource!=owner_display_name")
        if _as_int(page_summary.get("rosterOwnerDisplayNameSampleCount")) < 6:
            failures.append("rosterOwnerDisplayNameSampleCount<6")
        if str(page_summary.get("activeHeroOwnerDisplayName", "")).strip() == "":
            failures.append("activeHeroOwnerDisplayNameEmpty")
        if str(page_summary.get("activeHeroOwnerType", "")).strip() == "":
            failures.append("activeHeroOwnerTypeEmpty")
        if page_summary.get("activeHeroOwnerSource") != "shared_state.active_hero_profile.owner_display_name":
            failures.append("activeHeroOwnerSource!=shared_state.active_hero_profile.owner_display_name")
        if not bool(page_summary.get("activeHeroProfileOwnerSourceMatched", False)):
            failures.append("activeHeroProfileOwnerSourceMatched!=true")
        failures.extend(_validate_portrait_frame_contract(page_summary, "generalRoster", PORTRAIT_FRAME_ROSTER_CARD_VARIANT))
        try:
            column_target = int(page_summary.get("rosterCardColumnTarget", 0))
        except (TypeError, ValueError):
            column_target = -1
        if column_target != 0:
            failures.append("rosterCardColumnTarget!=0")
    if action in GENERAL_SECONDARY_PAGE_CONTRACT_ACTIONS:
        failures.extend(_validate_design_system_contract(page_summary, "general_formal_pack"))
        failures.extend(_validate_general_motion_contract(page_summary))
        expected_page = GENERAL_SECONDARY_PAGE_CONTRACT_ACTIONS[action]
        if page_summary.get("generalDetailViewMode") != "formal_pack_hero_stage_detail":
            failures.append("generalDetailViewMode!=formal_pack_hero_stage_detail")
        if page_summary.get("generalDetailPageMode") != expected_page:
            failures.append(f"generalDetailPageMode!={expected_page}")
        if not bool(page_summary.get("profileStageVisible", False)):
            failures.append("profileStageVisible!=true")
        if page_summary.get("profileBackButtonToken") != GENERAL_PROFILE_BACK_BUTTON_TOKEN:
            failures.append(f"profileBackButtonToken!={GENERAL_PROFILE_BACK_BUTTON_TOKEN}")
        if page_summary.get("profileCloseBackButtonSpecToken") != CLOSE_BACK_BUTTON_SPEC_TOKEN:
            failures.append("profileCloseBackButtonSpecToken!=close_back_button_spec_v1")
        if page_summary.get("profileBackButtonRole") != "back":
            failures.append("profileBackButtonRole!=back")
        if page_summary.get("profileBackButtonVariant") != "neutral":
            failures.append("profileBackButtonVariant!=neutral")
        if page_summary.get("profileBackButtonLiveTextContract") != "general_profile_back_live_text_v1":
            failures.append("profileBackButtonLiveTextContract!=general_profile_back_live_text_v1")
        if page_summary.get("profileBackButtonActionId") != "general_profile_back_close":
            failures.append("profileBackButtonActionId!=general_profile_back_close")
        if page_summary.get("profileActionBgToken") != GENERAL_PROFILE_ACTION_BG_TOKEN:
            failures.append(f"profileActionBgToken!={GENERAL_PROFILE_ACTION_BG_TOKEN}")
        if _as_int(page_summary.get("profileBackButtonWidth")) != 174:
            failures.append("profileBackButtonWidth!=174")
        if _as_int(page_summary.get("profileBackButtonHeight")) != 70:
            failures.append("profileBackButtonHeight!=70")
        if _as_int(page_summary.get("profileBackButtonFontSize")) != 25:
            failures.append("profileBackButtonFontSize!=25")
        if not bool(page_summary.get("profileTabStripVisible", False)):
            failures.append("profileTabStripVisible!=true")
        if page_summary.get("profileTabStripToken") != GENERAL_PROFILE_TAB_STRIP_TOKEN:
            failures.append(f"profileTabStripToken!={GENERAL_PROFILE_TAB_STRIP_TOKEN}")
        if page_summary.get("profileTabButtonToken") != GENERAL_PROFILE_TAB_BUTTON_TOKEN:
            failures.append(f"profileTabButtonToken!={GENERAL_PROFILE_TAB_BUTTON_TOKEN}")
        if _as_int(page_summary.get("profileTabButtonMinHeight")) != 46:
            failures.append("profileTabButtonMinHeight!=46")
        if _as_int(page_summary.get("profileTabButtonFontSize")) != 20:
            failures.append("profileTabButtonFontSize!=20")
        if _as_int(page_summary.get("profileTabStripTabCount")) != 3:
            failures.append("profileTabStripTabCount!=3")
        if action not in {"generals_roster_open_hero_profile", "world_open_main_city_generals_profile_back_close", "world_open_main_city_generals_profile_close"}:
            expected_tab_label = GENERAL_SECONDARY_PAGE_TAB_LABELS.get(expected_page, "")
            if page_summary.get("profileTabButtonClickedPageId") != expected_page:
                failures.append(f"profileTabButtonClickedPageId!={expected_page}")
            if page_summary.get("profileTabButtonClickedLabel") != expected_tab_label:
                failures.append(f"profileTabButtonClickedLabel!={expected_tab_label}")
            if page_summary.get("profileTabButtonClickedToken") != GENERAL_PROFILE_TAB_BUTTON_TOKEN:
                failures.append(f"profileTabButtonClickedToken!={GENERAL_PROFILE_TAB_BUTTON_TOKEN}")
            if page_summary.get("profileTabButtonClickedLiveTextContract") != "general_profile_tab_live_text_v1":
                failures.append("profileTabButtonClickedLiveTextContract!=general_profile_tab_live_text_v1")
            if not bool(page_summary.get("profileTabButtonClickVerified", False)):
                failures.append("profileTabButtonClickVerified!=true")
        if page_summary.get("profileCloseButtonToken") != GENERAL_PROFILE_CLOSE_BUTTON_TOKEN:
            failures.append(f"profileCloseButtonToken!={GENERAL_PROFILE_CLOSE_BUTTON_TOKEN}")
        if page_summary.get("profileCloseButtonRole") != "close":
            failures.append("profileCloseButtonRole!=close")
        if page_summary.get("profileCloseButtonVariant") != "danger":
            failures.append("profileCloseButtonVariant!=danger")
        if page_summary.get("profileCloseButtonLiveTextContract") != "general_profile_close_live_text_v1":
            failures.append("profileCloseButtonLiveTextContract!=general_profile_close_live_text_v1")
        if page_summary.get("profileCloseButtonActionId") != "general_profile_close_panel":
            failures.append("profileCloseButtonActionId!=general_profile_close_panel")
        if _as_int(page_summary.get("profileCloseButtonWidth")) != 122:
            failures.append("profileCloseButtonWidth!=122")
        if _as_int(page_summary.get("profileCloseButtonHeight")) != 56:
            failures.append("profileCloseButtonHeight!=56")
        if _as_int(page_summary.get("profileCloseButtonFontSize")) != 24:
            failures.append("profileCloseButtonFontSize!=24")
        if page_summary.get("profileStageActionButtonToken") != GENERAL_PROFILE_STAGE_ACTION_BUTTON_TOKEN:
            failures.append(f"profileStageActionButtonToken!={GENERAL_PROFILE_STAGE_ACTION_BUTTON_TOKEN}")
        if page_summary.get("profileStageActionButtonLiveTextContract") != "general_profile_stage_action_live_text_v1":
            failures.append("profileStageActionButtonLiveTextContract!=general_profile_stage_action_live_text_v1")
        stage_action_ids = str(page_summary.get("profileStageActionButtonActionIds", ""))
        for stage_action_id in ["general_reset", "general_guide", "general_share", "general_inherit"]:
            if stage_action_id not in stage_action_ids:
                failures.append(f"profileStageActionButtonActionIds missing {stage_action_id}")
        stage_action_labels = str(page_summary.get("profileStageActionButtonLabels", ""))
        for stage_label in ["重置", "攻略", "分享", "传承"]:
            if stage_label not in stage_action_labels:
                failures.append(f"profileStageActionButtonLabels missing {stage_label}")
        if _as_int(page_summary.get("profileStageActionButtonCount")) != 4:
            failures.append("profileStageActionButtonCount!=4")
        if _as_int(page_summary.get("profileStageActionButtonHeight")) != 40:
            failures.append("profileStageActionButtonHeight!=40")
        if _as_int(page_summary.get("profileStageActionButtonFontSize")) != 18:
            failures.append("profileStageActionButtonFontSize!=18")
        if _as_int(page_summary.get("profileStageActionButtonSeparation")) != 10:
            failures.append("profileStageActionButtonSeparation!=10")
        if expected_page == "profile":
            if page_summary.get("profileAttributeChipToken") != GENERAL_PROFILE_ATTRIBUTE_CHIP_TOKEN:
                failures.append(f"profileAttributeChipToken!={GENERAL_PROFILE_ATTRIBUTE_CHIP_TOKEN}")
            if _as_int(page_summary.get("profileAttributeChipCount")) != 5:
                failures.append("profileAttributeChipCount!=5")
            if _as_int(page_summary.get("profileAttributeChipMinHeight")) != 56:
                failures.append("profileAttributeChipMinHeight!=56")
            if _as_int(page_summary.get("profileAttributeChipRowSeparation")) != 10:
                failures.append("profileAttributeChipRowSeparation!=10")
            if _as_int(page_summary.get("profileAttributeChipGrowthWidth")) != 98:
                failures.append("profileAttributeChipGrowthWidth!=98")
            if _as_int(page_summary.get("profileAttributeChipIconSize")) != 34:
                failures.append("profileAttributeChipIconSize!=34")
            if page_summary.get("profileSkillButtonToken") != GENERAL_PROFILE_SKILL_BUTTON_TOKEN:
                failures.append(f"profileSkillButtonToken!={GENERAL_PROFILE_SKILL_BUTTON_TOKEN}")
            if page_summary.get("profileSkillButtonLiveTextContract") != "general_profile_skill_live_text_v1":
                failures.append("profileSkillButtonLiveTextContract!=general_profile_skill_live_text_v1")
            if page_summary.get("profileSkillButtonActionPrefix") != "skill_detail:":
                failures.append("profileSkillButtonActionPrefix!=skill_detail:")
            if _as_int(page_summary.get("profileSkillButtonMinHeight")) != 124:
                failures.append("profileSkillButtonMinHeight!=124")
            if _as_int(page_summary.get("profileSkillButtonFontSize")) != 19:
                failures.append("profileSkillButtonFontSize!=19")
            if _as_int(page_summary.get("profileEmptySkillButtonFontSize")) != 18:
                failures.append("profileEmptySkillButtonFontSize!=18")
            if _as_int(page_summary.get("profileSkillButtonRowSeparation")) != 16:
                failures.append("profileSkillButtonRowSeparation!=16")
            if _as_int(page_summary.get("profileSkillVisibleSlotMin")) != 3:
                failures.append("profileSkillVisibleSlotMin!=3")
            if _as_int(page_summary.get("profileSkillVisibleSlotMax")) != 5:
                failures.append("profileSkillVisibleSlotMax!=5")
            if _as_int(page_summary.get("profileSkillVisibleSlotCount")) < 3:
                failures.append("profileSkillVisibleSlotCount<3")
            profile_skill_runtime_count = _as_int(page_summary.get("profileSkillRuntimeButtonCount"), -1)
            if profile_skill_runtime_count < 1:
                failures.append("profileSkillRuntimeButtonCount<1")
            if _as_int(page_summary.get("profileSkillRuntimeTokenCount"), -1) != profile_skill_runtime_count:
                failures.append("profileSkillRuntimeTokenCount!=profileSkillRuntimeButtonCount")
            if _as_int(page_summary.get("profileSkillRuntimeLiveTextCount"), -1) != profile_skill_runtime_count:
                failures.append("profileSkillRuntimeLiveTextCount!=profileSkillRuntimeButtonCount")
            if "skill_detail:" not in str(page_summary.get("profileSkillRuntimeActionIds", "")):
                failures.append("profileSkillRuntimeActionIds missing skill_detail:")
            if _as_int(page_summary.get("profileSkillEmptyButtonCount")) < 1:
                failures.append("profileSkillEmptyButtonCount<1")
            if not bool(page_summary.get("profileEmptySkillButtonDisabled", False)):
                failures.append("profileEmptySkillButtonDisabled!=true")
            if page_summary.get("profileProgressLineToken") != GENERAL_PROFILE_PROGRESS_LINE_TOKEN:
                failures.append(f"profileProgressLineToken!={GENERAL_PROFILE_PROGRESS_LINE_TOKEN}")
            if _as_int(page_summary.get("profileProgressLineCount")) != 3:
                failures.append("profileProgressLineCount!=3")
            if _as_int(page_summary.get("profileProgressLineSeparation")) != 8:
                failures.append("profileProgressLineSeparation!=8")
            if _as_int(page_summary.get("profileProgressBarHeight")) != 20:
                failures.append("profileProgressBarHeight!=20")
            if _as_int(page_summary.get("profileProgressValueFontSize")) != 19:
                failures.append("profileProgressValueFontSize!=19")
            if _as_int(page_summary.get("profileProgressValueWidth")) != 150:
                failures.append("profileProgressValueWidth!=150")
            if page_summary.get("profileSmallTagToken") != GENERAL_PROFILE_SMALL_TAG_TOKEN:
                failures.append(f"profileSmallTagToken!={GENERAL_PROFILE_SMALL_TAG_TOKEN}")
            if _as_int(page_summary.get("profileSmallTagMinWidth")) != 64:
                failures.append("profileSmallTagMinWidth!=64")
            if _as_int(page_summary.get("profileSmallTagHeight")) != 32:
                failures.append("profileSmallTagHeight!=32")
            if _as_int(page_summary.get("profileSmallTagFontSize")) != 17:
                failures.append("profileSmallTagFontSize!=17")
            if _as_int(page_summary.get("profileSmallTagMarginX")) != 5:
                failures.append("profileSmallTagMarginX!=5")
            if _as_int(page_summary.get("profileSmallTagMarginY")) != 2:
                failures.append("profileSmallTagMarginY!=2")
        if not bool(page_summary.get("profileDetailStackVisible", False)):
            failures.append("profileDetailStackVisible!=true")
        if page_summary.get("profileStageRenderer") != "general_profile_stage_renderer":
            failures.append("profileStageRenderer!=general_profile_stage_renderer")
        failures.extend(_validate_portrait_frame_contract(page_summary, "profileStage", PORTRAIT_FRAME_DETAIL_LARGE_VARIANT))
        if page_summary.get("profileStagePortraitResolveMode") != "registry_first":
            failures.append("profileStagePortraitResolveMode!=registry_first")
        if page_summary.get("profileStagePortraitResolvedBy") != PORTRAIT_FRAME_REGISTRY_ID:
            failures.append(f"profileStagePortraitResolvedBy!={PORTRAIT_FRAME_REGISTRY_ID}")
        if _as_int(page_summary.get("profileStagePortraitFallbackCount"), -1) != 0:
            failures.append("profileStagePortraitFallbackCount!=0")
        failures.extend(_validate_general_portrait_source_contract())
        if page_summary.get("profileDetailStackRenderer") != "general_profile_detail_stack_renderer":
            failures.append("profileDetailStackRenderer!=general_profile_detail_stack_renderer")
        if page_summary.get("profileDetailHeaderRenderer") != "general_profile_content_renderer":
            failures.append("profileDetailHeaderRenderer!=general_profile_content_renderer")
        if not str(page_summary.get("activeHeroId", "")).strip():
            failures.append("activeHeroId empty")
        if bool(page_summary.get("authorityTriggered", True)):
            failures.append("authorityTriggered!=false")
        stage_action_expectations = {
            "world_open_main_city_generals_profile_reset_action": ("general_reset", "重置"),
            "world_open_main_city_generals_profile_guide_action": ("general_guide", "攻略"),
            "world_open_main_city_generals_profile_share_action": ("general_share", "分享"),
            "world_open_main_city_generals_profile_inherit_action": ("general_inherit", "传承"),
        }
        if action in stage_action_expectations:
            expected_stage_action_id, expected_stage_label = stage_action_expectations[action]
            if page_summary.get("profileStageActionButtonClickedActionId") != expected_stage_action_id:
                failures.append(f"profileStageActionButtonClickedActionId!={expected_stage_action_id}")
            if page_summary.get("profileStageActionButtonClickedToken") != GENERAL_PROFILE_STAGE_ACTION_BUTTON_TOKEN:
                failures.append(f"profileStageActionButtonClickedToken!={GENERAL_PROFILE_STAGE_ACTION_BUTTON_TOKEN}")
            if page_summary.get("profileStageActionButtonClickedLiveTextContract") != "general_profile_stage_action_live_text_v1":
                failures.append("profileStageActionButtonClickedLiveTextContract!=general_profile_stage_action_live_text_v1")
            if page_summary.get("profileStageActionButtonClickedLiveTextLabel") != expected_stage_label:
                failures.append(f"profileStageActionButtonClickedLiveTextLabel!={expected_stage_label}")
            if not bool(page_summary.get("profileStageActionButtonClickVerified", False)):
                failures.append("profileStageActionButtonClickVerified!=true")
        if action == "world_open_main_city_generals_profile_back_close":
            if page_summary.get("profileBackButtonClickedActionId") != "general_profile_back_close":
                failures.append("profileBackButtonClickedActionId!=general_profile_back_close")
            if page_summary.get("profileBackButtonClickedToken") != GENERAL_PROFILE_BACK_BUTTON_TOKEN:
                failures.append(f"profileBackButtonClickedToken!={GENERAL_PROFILE_BACK_BUTTON_TOKEN}")
            if page_summary.get("profileBackButtonClickedLiveTextContract") != "general_profile_back_live_text_v1":
                failures.append("profileBackButtonClickedLiveTextContract!=general_profile_back_live_text_v1")
            if page_summary.get("profileBackButtonClickedLiveTextLabel") != "返回":
                failures.append("profileBackButtonClickedLiveTextLabel!=返回")
            if not bool(page_summary.get("profileBackButtonCloseVerified", False)):
                failures.append("profileBackButtonCloseVerified!=true")
        if action == "world_open_main_city_generals_profile_close":
            if page_summary.get("profileCloseButtonClickedActionId") != "general_profile_close_panel":
                failures.append("profileCloseButtonClickedActionId!=general_profile_close_panel")
            if page_summary.get("profileCloseButtonClickedToken") != GENERAL_PROFILE_CLOSE_BUTTON_TOKEN:
                failures.append(f"profileCloseButtonClickedToken!={GENERAL_PROFILE_CLOSE_BUTTON_TOKEN}")
            if page_summary.get("profileCloseButtonClickedLiveTextContract") != "general_profile_close_live_text_v1":
                failures.append("profileCloseButtonClickedLiveTextContract!=general_profile_close_live_text_v1")
            if page_summary.get("profileCloseButtonClickedLiveTextLabel") != "关闭":
                failures.append("profileCloseButtonClickedLiveTextLabel!=关闭")
            if not bool(page_summary.get("profileCloseButtonCloseVerified", False)):
                failures.append("profileCloseButtonCloseVerified!=true")
        if action == "world_open_main_city_generals_profile_skill_detail_close":
            if page_summary.get("profileSkillButtonClickedActionId") != "skill_detail:0":
                failures.append("profileSkillButtonClickedActionId!=skill_detail:0")
            if page_summary.get("profileSkillButtonClickedToken") != GENERAL_PROFILE_SKILL_BUTTON_TOKEN:
                failures.append(f"profileSkillButtonClickedToken!={GENERAL_PROFILE_SKILL_BUTTON_TOKEN}")
            if page_summary.get("profileSkillButtonClickedLiveTextContract") != "general_profile_skill_live_text_v1":
                failures.append("profileSkillButtonClickedLiveTextContract!=general_profile_skill_live_text_v1")
            if not str(page_summary.get("profileSkillButtonClickedLiveTextLabel", "")).strip():
                failures.append("profileSkillButtonClickedLiveTextLabel empty")
            if not bool(page_summary.get("profileSkillButtonClickVerified", False)):
                failures.append("profileSkillButtonClickVerified!=true")
            if not bool(page_summary.get("skillDetailPopupVisibleBeforeClose", False)):
                failures.append("skillDetailPopupVisibleBeforeClose!=true")
            if bool(page_summary.get("skillDetailPopupVisibleAfterClose", True)):
                failures.append("skillDetailPopupVisibleAfterClose!=false")
            if page_summary.get("skillDetailPopupCloseButtonClickedActionId") != "skill_detail_popup_close":
                failures.append("skillDetailPopupCloseButtonClickedActionId!=skill_detail_popup_close")
            if page_summary.get("skillDetailPopupCloseButtonClickedToken") != GENERAL_SKILL_DETAIL_POPUP_CLOSE_BUTTON_TOKEN:
                failures.append(f"skillDetailPopupCloseButtonClickedToken!={GENERAL_SKILL_DETAIL_POPUP_CLOSE_BUTTON_TOKEN}")
            if page_summary.get("skillDetailPopupCloseButtonClickedLiveTextContract") != "skill_detail_popup_close_live_text_v1":
                failures.append("skillDetailPopupCloseButtonClickedLiveTextContract!=skill_detail_popup_close_live_text_v1")
            if page_summary.get("skillDetailPopupCloseButtonClickedLiveTextLabel") != "关闭":
                failures.append("skillDetailPopupCloseButtonClickedLiveTextLabel!=关闭")
            if not bool(page_summary.get("skillDetailPopupCloseButtonClickVerified", False)):
                failures.append("skillDetailPopupCloseButtonClickVerified!=true")
        if action == "generals_roster_open_hero_profile":
            if page_summary.get("rosterDetailButtonClickedToken") != GENERAL_ROSTER_DETAIL_BUTTON_TOKEN:
                failures.append(f"rosterDetailButtonClickedToken!={GENERAL_ROSTER_DETAIL_BUTTON_TOKEN}")
            if page_summary.get("rosterDetailButtonClickedLiveTextContract") != "general_roster_detail_live_text_v1":
                failures.append("rosterDetailButtonClickedLiveTextContract!=general_roster_detail_live_text_v1")
            if page_summary.get("rosterDetailButtonClickedLiveTextLabel") != "详情":
                failures.append("rosterDetailButtonClickedLiveTextLabel!=详情")
            if not str(page_summary.get("rosterDetailButtonClickedActionId", "")).startswith("open_hero_profile:"):
                failures.append("rosterDetailButtonClickedActionIdMissing")
            if not str(page_summary.get("rosterDetailButtonClickedHeroId", "")).strip():
                failures.append("rosterDetailButtonClickedHeroIdEmpty")
        if expected_page == "tactics":
            if page_summary.get("tacticsViewMode") != "point_allocation_preview":
                failures.append("tacticsViewMode!=point_allocation_preview")
            if page_summary.get("tacticsRenderer") != "general_profile_tactics_renderer":
                failures.append("tacticsRenderer!=general_profile_tactics_renderer")
            if page_summary.get("tacticsActionMode") != "authority_buttons_present_not_triggered":
                failures.append("tacticsActionMode!=authority_buttons_present_not_triggered")
            if _as_int(page_summary.get("tacticsSchemeTabCount")) != 3:
                failures.append("tacticsSchemeTabCount!=3")
            if page_summary.get("tacticsSchemeTabToken") != GENERAL_TACTICS_SCHEME_TAB_TOKEN:
                failures.append(f"tacticsSchemeTabToken!={GENERAL_TACTICS_SCHEME_TAB_TOKEN}")
            if _as_int(page_summary.get("tacticsSchemeTabMinHeight")) != 34:
                failures.append("tacticsSchemeTabMinHeight!=34")
            if _as_int(page_summary.get("tacticsSchemeTabLabelFontSize")) != 14:
                failures.append("tacticsSchemeTabLabelFontSize!=14")
            if _as_int(page_summary.get("tacticsSchemeTabMarginX")) != 8:
                failures.append("tacticsSchemeTabMarginX!=8")
            if _as_int(page_summary.get("tacticsSchemeTabMarginY")) != 5:
                failures.append("tacticsSchemeTabMarginY!=5")
            if page_summary.get("tacticsStepButtonToken") != GENERAL_TACTICS_STEP_BUTTON_TOKEN:
                failures.append(f"tacticsStepButtonToken!={GENERAL_TACTICS_STEP_BUTTON_TOKEN}")
            if _as_int(page_summary.get("tacticsStepButtonWidth")) != 46:
                failures.append("tacticsStepButtonWidth!=46")
            if _as_int(page_summary.get("tacticsStepButtonMaxWidth")) != 66:
                failures.append("tacticsStepButtonMaxWidth!=66")
            if _as_int(page_summary.get("tacticsStepButtonHeight")) != 32:
                failures.append("tacticsStepButtonHeight!=32")
            if _as_int(page_summary.get("tacticsStepButtonFontSize")) != 15:
                failures.append("tacticsStepButtonFontSize!=15")
            if _as_int(page_summary.get("tacticsStepButtonMargin")) != 4:
                failures.append("tacticsStepButtonMargin!=4")
            if page_summary.get("tacticsPreviewActionChipToken") != GENERAL_TACTICS_PREVIEW_ACTION_CHIP_TOKEN:
                failures.append(f"tacticsPreviewActionChipToken!={GENERAL_TACTICS_PREVIEW_ACTION_CHIP_TOKEN}")
            if _as_int(page_summary.get("tacticsPreviewActionChipWidth")) != 86:
                failures.append("tacticsPreviewActionChipWidth!=86")
            if _as_int(page_summary.get("tacticsPreviewActionChipHeight")) != 34:
                failures.append("tacticsPreviewActionChipHeight!=34")
            if _as_int(page_summary.get("tacticsPreviewActionChipFontSize")) != 15:
                failures.append("tacticsPreviewActionChipFontSize!=15")
            if _as_int(page_summary.get("tacticsPreviewActionChipMarginX")) != 8:
                failures.append("tacticsPreviewActionChipMarginX!=8")
            if _as_int(page_summary.get("tacticsPreviewActionChipMarginY")) != 5:
                failures.append("tacticsPreviewActionChipMarginY!=5")
            if page_summary.get("tacticsStatTagToken") != GENERAL_TACTICS_STAT_TAG_TOKEN:
                failures.append(f"tacticsStatTagToken!={GENERAL_TACTICS_STAT_TAG_TOKEN}")
            if _as_int(page_summary.get("tacticsStatTagWidth")) != 64:
                failures.append("tacticsStatTagWidth!=64")
            if _as_int(page_summary.get("tacticsStatTagHeight")) != 28:
                failures.append("tacticsStatTagHeight!=28")
            if _as_int(page_summary.get("tacticsStatTagFontSize")) != 12:
                failures.append("tacticsStatTagFontSize!=12")
            if _as_int(page_summary.get("tacticsStatTagMarginX")) != 5:
                failures.append("tacticsStatTagMarginX!=5")
            if _as_int(page_summary.get("tacticsStatTagMarginY")) != 3:
                failures.append("tacticsStatTagMarginY!=3")
            if page_summary.get("tacticsSummaryCardToken") != GENERAL_TACTICS_SUMMARY_CARD_TOKEN:
                failures.append(f"tacticsSummaryCardToken!={GENERAL_TACTICS_SUMMARY_CARD_TOKEN}")
            if _as_int(page_summary.get("tacticsSummaryCardCount")) != 3:
                failures.append("tacticsSummaryCardCount!=3")
            if _as_int(page_summary.get("tacticsSummaryCardMinHeight")) != 66:
                failures.append("tacticsSummaryCardMinHeight!=66")
            if _as_int(page_summary.get("tacticsSummaryCardMarginX")) != 8:
                failures.append("tacticsSummaryCardMarginX!=8")
            if _as_int(page_summary.get("tacticsSummaryCardMarginY")) != 7:
                failures.append("tacticsSummaryCardMarginY!=7")
            if _as_int(page_summary.get("tacticsSummaryCardColumnSpacing")) != 2:
                failures.append("tacticsSummaryCardColumnSpacing!=2")
            if _as_int(page_summary.get("tacticsSummaryCardTitleFontSize")) != 12:
                failures.append("tacticsSummaryCardTitleFontSize!=12")
            if _as_int(page_summary.get("tacticsSummaryCardValueFontSize")) != 15:
                failures.append("tacticsSummaryCardValueFontSize!=15")
            if _as_int(page_summary.get("tacticsSummaryCardMetaFontSize")) != 11:
                failures.append("tacticsSummaryCardMetaFontSize!=11")
            if _as_int(page_summary.get("tacticsAllocationRowTarget")) != 5:
                failures.append("tacticsAllocationRowTarget!=5")
            if _as_int(page_summary.get("tacticsPreviewActionCount")) != 2:
                failures.append("tacticsPreviewActionCount!=2")
        elif expected_page == "library":
            if page_summary.get("skillLibraryViewMode") != "readonly_skill_library_browser":
                failures.append("skillLibraryViewMode!=readonly_skill_library_browser")
            if page_summary.get("skillLibraryPayloadRenderer") != "general_profile_skill_library_renderer":
                failures.append("skillLibraryPayloadRenderer!=general_profile_skill_library_renderer")
            skill_library_count = _as_int(page_summary.get("skillLibraryCount"))
            if skill_library_count <= 0:
                failures.append("skillLibraryCount<=0")
            if _as_int(page_summary.get("skillLibraryFilteredCount")) <= 0:
                failures.append("skillLibraryFilteredCount<=0")
            if page_summary.get("skillLibraryFilterMode") != "local_readonly_filter":
                failures.append("skillLibraryFilterMode!=local_readonly_filter")
            if page_summary.get("skillLibraryActionMode") != "local_filter_card_flip_only":
                failures.append("skillLibraryActionMode!=local_filter_card_flip_only")
            if not bool(page_summary.get("skillLibrarySearchVisible", False)):
                failures.append("skillLibrarySearchVisible!=true")
            if _as_int(page_summary.get("skillLibraryFilterRowCount")) < 6:
                failures.append("skillLibraryFilterRowCount<6")
        elif expected_page == "growth":
            if page_summary.get("growthViewMode") != "troop_preview_shell":
                failures.append("growthViewMode!=troop_preview_shell")
            if page_summary.get("growthVariantRenderer") != "general_profile_growth_renderer":
                failures.append("growthVariantRenderer!=general_profile_growth_renderer")
            variant_count = _as_int(page_summary.get("troopPreviewVariantCount"))
            if variant_count <= 0:
                failures.append("troopPreviewVariantCount<=0")
            variant_index = _as_int(page_summary.get("troopPreviewVariantIndex"), -1)
            if variant_count > 0 and not (0 <= variant_index < variant_count):
                failures.append("troopPreviewVariantIndex out of range")
            if not bool(page_summary.get("troopPreviewIllustrationSlotVisible", False)):
                failures.append("troopPreviewIllustrationSlotVisible!=true")
            if page_summary.get("troopPreviewActionMode") != "local_prev_next_only":
                failures.append("troopPreviewActionMode!=local_prev_next_only")
            if page_summary.get("growthEntryCardToken") != GENERAL_GROWTH_ENTRY_CARD_TOKEN:
                failures.append(f"growthEntryCardToken!={GENERAL_GROWTH_ENTRY_CARD_TOKEN}")
            if _as_int(page_summary.get("growthEntryCardCount")) != 4:
                failures.append("growthEntryCardCount!=4")
            if _as_int(page_summary.get("growthEntryCardMinHeight")) != 66:
                failures.append("growthEntryCardMinHeight!=66")
            if _as_int(page_summary.get("growthEntryCardMarginX")) != 8:
                failures.append("growthEntryCardMarginX!=8")
            if _as_int(page_summary.get("growthEntryCardMarginY")) != 7:
                failures.append("growthEntryCardMarginY!=7")
            if _as_int(page_summary.get("growthEntryCardColumnSpacing")) != 2:
                failures.append("growthEntryCardColumnSpacing!=2")
            if _as_int(page_summary.get("growthEntryCardTitleFontSize")) != 12:
                failures.append("growthEntryCardTitleFontSize!=12")
            if _as_int(page_summary.get("growthEntryCardValueFontSize")) != 15:
                failures.append("growthEntryCardValueFontSize!=15")
            if _as_int(page_summary.get("growthEntryCardMetaFontSize")) != 11:
                failures.append("growthEntryCardMetaFontSize!=11")
            if page_summary.get("troopPreviewArrowButtonToken") != GENERAL_GROWTH_TROOP_ARROW_BUTTON_TOKEN:
                failures.append(f"troopPreviewArrowButtonToken!={GENERAL_GROWTH_TROOP_ARROW_BUTTON_TOKEN}")
            if _as_int(page_summary.get("troopPreviewArrowButtonCount")) != 2:
                failures.append("troopPreviewArrowButtonCount!=2")
            if page_summary.get("troopPreviewArrowButtonLiveTextContract") != "general_growth_troop_arrow_live_text_v1":
                failures.append("troopPreviewArrowButtonLiveTextContract!=general_growth_troop_arrow_live_text_v1")
            if "troop_preview_next" not in str(page_summary.get("troopPreviewArrowButtonActionIds", "")):
                failures.append("troopPreviewArrowButtonActionIds missing troop_preview_next")
            if _as_int(page_summary.get("troopPreviewArrowButtonWidth")) != 52:
                failures.append("troopPreviewArrowButtonWidth!=52")
            if _as_int(page_summary.get("troopPreviewArrowButtonHeight")) != 158:
                failures.append("troopPreviewArrowButtonHeight!=158")
            if _as_int(page_summary.get("troopPreviewArrowButtonFontSize")) != 30:
                failures.append("troopPreviewArrowButtonFontSize!=30")
            if action == "world_open_main_city_generals_growth_next_troop":
                if page_summary.get("troopPreviewArrowClickedActionId") != "troop_preview_next":
                    failures.append("troopPreviewArrowClickedActionId!=troop_preview_next")
                if page_summary.get("troopPreviewArrowClickedToken") != GENERAL_GROWTH_TROOP_ARROW_BUTTON_TOKEN:
                    failures.append(f"troopPreviewArrowClickedToken!={GENERAL_GROWTH_TROOP_ARROW_BUTTON_TOKEN}")
                if page_summary.get("troopPreviewArrowClickedLiveTextContract") != "general_growth_troop_arrow_live_text_v1":
                    failures.append("troopPreviewArrowClickedLiveTextContract!=general_growth_troop_arrow_live_text_v1")
                if page_summary.get("troopPreviewArrowClickedLiveTextLabel") != "下一兵种":
                    failures.append("troopPreviewArrowClickedLiveTextLabel!=下一兵种")
                if not bool(page_summary.get("troopPreviewArrowClickVerified", False)):
                    failures.append("troopPreviewArrowClickVerified!=true")
            if page_summary.get("troopPreviewChipToken") != GENERAL_GROWTH_TROOP_CHIP_TOKEN:
                failures.append(f"troopPreviewChipToken!={GENERAL_GROWTH_TROOP_CHIP_TOKEN}")
            if _as_int(page_summary.get("troopPreviewChipCount")) != 2:
                failures.append("troopPreviewChipCount!=2")
            if _as_int(page_summary.get("troopPreviewChipMinWidth")) != 58:
                failures.append("troopPreviewChipMinWidth!=58")
            if _as_int(page_summary.get("troopPreviewChipHeight")) != 30:
                failures.append("troopPreviewChipHeight!=30")
            if _as_int(page_summary.get("troopPreviewChipTextWidthPerChar")) != 13:
                failures.append("troopPreviewChipTextWidthPerChar!=13")
            if _as_int(page_summary.get("troopPreviewChipHorizontalPadding")) != 18:
                failures.append("troopPreviewChipHorizontalPadding!=18")
            if _as_int(page_summary.get("troopPreviewChipMarginX")) != 8:
                failures.append("troopPreviewChipMarginX!=8")
            if _as_int(page_summary.get("troopPreviewChipMarginY")) != 5:
                failures.append("troopPreviewChipMarginY!=5")
            if _as_int(page_summary.get("troopPreviewChipFontSize")) != 12:
                failures.append("troopPreviewChipFontSize!=12")
    if action in SKILL_LIBRARY_STANDALONE_CONTRACT_ACTIONS:
        failures.extend(_validate_design_system_contract(page_summary, "general_formal_pack"))
        failures.extend(_validate_skill_library_motion_contract(page_summary))
        if page_summary.get("generalDetailViewMode") != "readonly_skill_library_browser":
            failures.append("generalDetailViewMode!=readonly_skill_library_browser")
        if page_summary.get("generalDetailPageMode") != "library":
            failures.append("generalDetailPageMode!=library")
        if page_summary.get("skillLibraryEntryMode") != "main_map_independent":
            failures.append("skillLibraryEntryMode!=main_map_independent")
        if page_summary.get("skillLibraryStandalone") is not True:
            failures.append("skillLibraryStandalone!=true")
        if bool(page_summary.get("profileStageVisible", True)):
            failures.append("profileStageVisible!=false")
        if bool(page_summary.get("profileTabStripVisible", True)):
            failures.append("profileTabStripVisible!=false")
        if bool(page_summary.get("profileDetailStackVisible", True)):
            failures.append("profileDetailStackVisible!=false")
        if page_summary.get("skillLibraryViewMode") != "readonly_skill_library_browser":
            failures.append("skillLibraryViewMode!=readonly_skill_library_browser")
        if page_summary.get("skillLibraryPayloadRenderer") != "general_profile_skill_library_renderer":
            failures.append("skillLibraryPayloadRenderer!=general_profile_skill_library_renderer")
        if _as_int(page_summary.get("skillLibraryCount")) <= 0:
            failures.append("skillLibraryCount<=0")
        if _as_int(page_summary.get("skillLibraryFilteredCount")) <= 0:
            failures.append("skillLibraryFilteredCount<=0")
        min_skill_library_card_count = 1 if action in SKILL_LIBRARY_TYPE_SHOWCASE_CONTRACT_ACTIONS else 3
        failures.extend(_validate_hero_card_contract(page_summary, "draw_result", min_sample_count=min_skill_library_card_count))
        failures.extend(_validate_hero_card_skill_visual_contract(page_summary))
        failures.extend(_validate_skill_library_card_rail_source_contract())
        if page_summary.get("skillLibraryFilterMode") != "local_readonly_filter":
            failures.append("skillLibraryFilterMode!=local_readonly_filter")
        if page_summary.get("skillLibraryActionMode") != "local_filter_card_flip_only":
            failures.append("skillLibraryActionMode!=local_filter_card_flip_only")
        if page_summary.get("skillLibraryVisualMode") != "full_page_card_rail":
            failures.append("skillLibraryVisualMode!=full_page_card_rail")
        if page_summary.get("skillLibraryVisualDensity") != "hero_card_skill_plate_rail":
            failures.append("skillLibraryVisualDensity!=hero_card_skill_plate_rail")
        skill_library_card_count = _as_int(page_summary.get("skillLibraryDeckCardRailVisibleCount"))
        if skill_library_card_count < min_skill_library_card_count:
            failures.append(f"skillLibraryDeckCardRailVisibleCount<{min_skill_library_card_count}")
        if _as_int(page_summary.get("skillLibraryDeckCardRailTotalCount")) != skill_library_card_count:
            failures.append("skillLibraryDeckCardRailTotalCount!=skillLibraryDeckCardRailVisibleCount")
        expected_skill_library_target = max(1, skill_library_card_count)
        expected_skill_library_viewport_width = (
            HERO_CARD_FULL_LAYOUT_WIDTH * expected_skill_library_target
            + HERO_CARD_FULL_LAYOUT_GAP * max(0, expected_skill_library_target - 1)
        )
        expected_skill_library_content_width = (
            HERO_CARD_FULL_LAYOUT_WIDTH * skill_library_card_count
            + HERO_CARD_FULL_LAYOUT_GAP * max(0, skill_library_card_count - 1)
        )
        if _as_int(page_summary.get("skillLibraryDeckCardRailInitialVisibleCardTarget")) != expected_skill_library_target:
            failures.append(f"skillLibraryDeckCardRailInitialVisibleCardTarget!={expected_skill_library_target}")
        if page_summary.get("skillLibraryDeckCardRailLayoutToken") != CARD_RAIL_LAYOUT_TOKEN:
            failures.append(f"skillLibraryDeckCardRailLayoutToken!={CARD_RAIL_LAYOUT_TOKEN}")
        if page_summary.get("skillLibraryDeckCardRailScrollMode") != CARD_RAIL_SCROLL_MODE:
            failures.append(f"skillLibraryDeckCardRailScrollMode!={CARD_RAIL_SCROLL_MODE}")
        if page_summary.get("skillLibraryDeckCardRailScrollbarVisibility") != "hidden":
            failures.append("skillLibraryDeckCardRailScrollbarVisibility!=hidden")
        if page_summary.get("skillLibraryDeckCardRailInputMode") != "touch_mouse_horizontal_drag":
            failures.append("skillLibraryDeckCardRailInputMode!=touch_mouse_horizontal_drag")
        if _as_int(page_summary.get("skillLibraryDeckCardRailViewportWidth")) != expected_skill_library_viewport_width:
            failures.append(f"skillLibraryDeckCardRailViewportWidth!={expected_skill_library_viewport_width}")
        if _as_int(page_summary.get("skillLibraryDeckCardRailViewportHeight")) != CARD_RAIL_FULL_CARD_MIN_HEIGHT:
            failures.append(f"skillLibraryDeckCardRailViewportHeight!={CARD_RAIL_FULL_CARD_MIN_HEIGHT}")
        if _as_int(page_summary.get("skillLibraryDeckCardRailContentWidth")) != expected_skill_library_content_width:
            failures.append(f"skillLibraryDeckCardRailContentWidth!={expected_skill_library_content_width}")
        if _as_int(page_summary.get("skillLibraryDeckCardRailCardWidth")) != HERO_CARD_FULL_LAYOUT_WIDTH:
            failures.append(f"skillLibraryDeckCardRailCardWidth!={HERO_CARD_FULL_LAYOUT_WIDTH}")
        if _as_int(page_summary.get("skillLibraryDeckCardRailCardHeight")) != HERO_CARD_FULL_LAYOUT_HEIGHT:
            failures.append(f"skillLibraryDeckCardRailCardHeight!={HERO_CARD_FULL_LAYOUT_HEIGHT}")
        if _as_int(page_summary.get("skillLibraryDeckCardRailGap")) != HERO_CARD_FULL_LAYOUT_GAP:
            failures.append(f"skillLibraryDeckCardRailGap!={HERO_CARD_FULL_LAYOUT_GAP}")
        if _as_int(page_summary.get("skillLibraryDeckCardRailMinHeight")) != CARD_RAIL_FULL_CARD_MIN_HEIGHT:
            failures.append(f"skillLibraryDeckCardRailMinHeight!={CARD_RAIL_FULL_CARD_MIN_HEIGHT}")
        if page_summary.get("skillLibraryDeckCardMode") != "draw_result":
            failures.append("skillLibraryDeckCardMode!=draw_result")
        if page_summary.get("skillLibraryDeckCardPreviewKind") != "skill":
            failures.append("skillLibraryDeckCardPreviewKind!=skill")
        if page_summary.get("skillLibraryDeckCardVisualMode") != "full_card_skill_plate_v2":
            failures.append("skillLibraryDeckCardVisualMode!=full_card_skill_plate_v2")
        if page_summary.get("skillLibraryDeckCardComponent") != "HeroCardView":
            failures.append("skillLibraryDeckCardComponent!=HeroCardView")
        if page_summary.get("skillLibraryDeckCardFrontTextMode") != "hero_card_skill_front_asset_ref_status_only_v1":
            failures.append("skillLibraryDeckCardFrontTextMode!=hero_card_skill_front_asset_ref_status_only_v1")
        if page_summary.get("skillLibraryDeckCardAssetRefSlotMode") != "skill_detail_asset_ref_png_v1":
            failures.append("skillLibraryDeckCardAssetRefSlotMode!=skill_detail_asset_ref_png_v1")
        if _as_int(page_summary.get("skillLibraryDeckCardAssetRefSlotCount")) < min_skill_library_card_count:
            failures.append(f"skillLibraryDeckCardAssetRefSlotCount<{min_skill_library_card_count}")
        if _as_int(page_summary.get("skillLibraryDeckCardAssetRefTextureCount")) < min_skill_library_card_count:
            failures.append(f"skillLibraryDeckCardAssetRefTextureCount<{min_skill_library_card_count}")
        if page_summary.get("skillLibraryDeckCardAssetFitMode") != SKILL_CARD_ART_FIT_MODE:
            failures.append(f"skillLibraryDeckCardAssetFitMode!={SKILL_CARD_ART_FIT_MODE}")
        if _as_int(page_summary.get("skillLibraryDeckCardNoCropAssetCount")) < min_skill_library_card_count:
            failures.append(f"skillLibraryDeckCardNoCropAssetCount<{min_skill_library_card_count}")
        if page_summary.get("skillLibraryDeckCardAssetSafeMargin") != SKILL_CARD_ART_SAFE_MARGIN:
            failures.append(f"skillLibraryDeckCardAssetSafeMargin!={SKILL_CARD_ART_SAFE_MARGIN}")
        if page_summary.get("skillLibraryDeckCardAssetPreprocess") != SKILL_CARD_ART_PREPROCESS:
            failures.append(f"skillLibraryDeckCardAssetPreprocess!={SKILL_CARD_ART_PREPROCESS}")
        failures.extend(_validate_skill_card_generated_art_contract())
        if _as_int(page_summary.get("skillLibraryDeckCardFrontGradeTextCount")) != 0:
            failures.append("skillLibraryDeckCardFrontGradeTextCount!=0")
        if _as_int(page_summary.get("skillLibraryDeckCardFrontNameTextCount")) != 0:
            failures.append("skillLibraryDeckCardFrontNameTextCount!=0")
        if _as_int(page_summary.get("skillLibraryDeckCardUnequippedLevelTextCount")) != 0:
            failures.append("skillLibraryDeckCardUnequippedLevelTextCount!=0")
        if page_summary.get("skillLibraryDeckCardEquipReadModelSource") != "controller_display_name/equipped_hero_name/skill_level":
            failures.append("skillLibraryDeckCardEquipReadModelSource!=controller_display_name/equipped_hero_name/skill_level")
        if page_summary.get("skillLibraryDeckCardLevelReadModelSource") != "skill_level/skillLevel":
            failures.append("skillLibraryDeckCardLevelReadModelSource!=skill_level/skillLevel")
        if page_summary.get("skillLibraryDeckCardLevelRangeMode") != "skill_level_1_10_v1":
            failures.append("skillLibraryDeckCardLevelRangeMode!=skill_level_1_10_v1")
        if _as_int(page_summary.get("skillLibraryDeckCardLevelRangeInvalidCount")) != 0:
            failures.append("skillLibraryDeckCardLevelRangeInvalidCount!=0")
        if _as_int(page_summary.get("skillLibraryDeckCardDefaultLevelFallbackCount")) != 0:
            failures.append("skillLibraryDeckCardDefaultLevelFallbackCount!=0")
        if _as_int(page_summary.get("skillLibraryDeckCardEquippedMissingLevelCount")) != 0:
            failures.append("skillLibraryDeckCardEquippedMissingLevelCount!=0")
        if page_summary.get("skillLibraryDeckCardAuthorityReadModelSource") != "generalStateByFaction.tacticalSkillSlotsByHeroId/equippedSkillLevelsById":
            failures.append("skillLibraryDeckCardAuthorityReadModelSource!=generalStateByFaction.tacticalSkillSlotsByHeroId/equippedSkillLevelsById")
        if bool(page_summary.get("skillLibraryDeckCardAuthorityStaticLevelFallbackAllowed", True)):
            failures.append("skillLibraryDeckCardAuthorityStaticLevelFallbackAllowed!=false")
        skill_library_flip_action = action == "world_open_main_city_skill_library_flip_card"
        if not skill_library_flip_action and _as_int(page_summary.get("skillLibraryDeckCardAuthorityEquippedSkillLevelCount")) < 1:
            failures.append("skillLibraryDeckCardAuthorityEquippedSkillLevelCount<1")
        if _as_int(page_summary.get("skillLibraryDeckCardAuthorityMissingLevelCount")) != 0:
            failures.append("skillLibraryDeckCardAuthorityMissingLevelCount!=0")
        if _as_int(page_summary.get("skillLibraryDeckCardAuthorityInvalidLevelCount")) != 0:
            failures.append("skillLibraryDeckCardAuthorityInvalidLevelCount!=0")
        skill_library_level_count = _as_int(page_summary.get("skillLibraryDeckCardLevelReadModelCount"))
        if skill_library_level_count > 0:
            if _as_int(page_summary.get("skillLibraryDeckCardLevelMin")) < 1:
                failures.append("skillLibraryDeckCardLevelMin<1")
            if _as_int(page_summary.get("skillLibraryDeckCardLevelMax")) > 10:
                failures.append("skillLibraryDeckCardLevelMax>10")
        if page_summary.get("skillLibraryDeckCardBottomStatusMode") != "skill_type_left_controller_level_right_v1":
            failures.append("skillLibraryDeckCardBottomStatusMode!=skill_type_left_controller_level_right_v1")
        if _as_int(page_summary.get("skillLibraryDeckCardTypeLabelTextCount")) < min_skill_library_card_count:
            failures.append(f"skillLibraryDeckCardTypeLabelTextCount<{min_skill_library_card_count}")
        skill_library_type_values = str(page_summary.get("skillLibraryDeckCardTypeLabelValues", "")).strip()
        if skill_library_type_values == "":
            failures.append("skillLibraryDeckCardTypeLabelValues empty")
        if "战法" in [part.strip() for part in skill_library_type_values.split("/")]:
            failures.append("skillLibraryDeckCardTypeLabelValues contains generic 战法")
        if _as_int(page_summary.get("skillLibraryDeckCardTypeLabelFontSize")) < 17:
            failures.append("skillLibraryDeckCardTypeLabelFontSize<17")
        if not skill_library_flip_action and _as_int(page_summary.get("skillLibraryDeckCardControllerStatusTextCount")) < 1:
            failures.append("skillLibraryDeckCardControllerStatusTextCount<1")
        if not skill_library_flip_action and _as_int(page_summary.get("skillLibraryDeckCardControllerLevelTextCount")) < 1:
            failures.append("skillLibraryDeckCardControllerLevelTextCount<1")
        if not skill_library_flip_action and _as_int(page_summary.get("skillLibraryDeckCardEquippedStatusTextCount")) < 1:
            failures.append("skillLibraryDeckCardEquippedStatusTextCount<1")
        if not skill_library_flip_action and _as_int(page_summary.get("skillLibraryDeckCardEquippedLevelTextCount")) < 1:
            failures.append("skillLibraryDeckCardEquippedLevelTextCount<1")
        if bool(page_summary.get("skillLibraryDeckCardTopStarsVisible", True)):
            failures.append("skillLibraryDeckCardTopStarsVisible!=false")
        if _as_int(page_summary.get("skillLibraryDeckCardDrawOverlayTextCount")) != 0:
            failures.append("skillLibraryDeckCardDrawOverlayTextCount!=0")
        if page_summary.get("skillLibraryDeckCardEquipStatusMode") != "single_bottom_status_read_model_v1":
            failures.append("skillLibraryDeckCardEquipStatusMode!=single_bottom_status_read_model_v1")
        if bool(page_summary.get("skillLibraryDeckCardDetailTextVisible", True)):
            failures.append("skillLibraryDeckCardDetailTextVisible!=false")
        if _as_int(page_summary.get("skillLibraryDeckCardDetailTextCount")) != 0:
            failures.append("skillLibraryDeckCardDetailTextCount!=0")
        if page_summary.get("skillLibrarySearchResultReadModelSource") != "skill_detail/read_model":
            failures.append("skillLibrarySearchResultReadModelSource!=skill_detail/read_model")
        if page_summary.get("skillLibraryDeckCardFlipMode") != "click_front_back":
            failures.append("skillLibraryDeckCardFlipMode!=click_front_back")
        if not bool(page_summary.get("skillLibraryDeckCardBackFaceAvailable", False)):
            failures.append("skillLibraryDeckCardBackFaceAvailable!=true")
        if page_summary.get("skillLibraryDeckCardBackFaceReadModelSource") != "skill_detail/read_model":
            failures.append("skillLibraryDeckCardBackFaceReadModelSource!=skill_detail/read_model")
        if _as_int(page_summary.get("skillLibraryDeckCardBackFaceFieldFontSize")) < 16:
            failures.append("skillLibraryDeckCardBackFaceFieldFontSize<16")
        if _as_int(page_summary.get("skillLibraryDeckCardBackFaceFieldMaxLines")) < 3:
            failures.append("skillLibraryDeckCardBackFaceFieldMaxLines<3")
        for field_name in [
            "Trigger",
            "Target",
            "Effect",
            "Troops",
            "Source",
        ]:
            key = f"skillLibraryDeckCardBackFace{field_name}TextCount"
            if _as_int(page_summary.get(key)) < min_skill_library_card_count:
                failures.append(f"{key}<{min_skill_library_card_count}")
        if action in {
            "world_open_main_city_skill_library_flip_card",
            "world_open_main_city_skill_library_search",
        }:
            if not bool(page_summary.get("skillLibraryDeckCardFlipRuntimeFound", False)):
                failures.append("skillLibraryDeckCardFlipRuntimeFound!=true")
            if page_summary.get("skillLibraryDeckCardFlipRuntimeFace") != "back":
                failures.append("skillLibraryDeckCardFlipRuntimeFace!=back")
            if not bool(page_summary.get("skillLibraryDeckCardBackFaceRuntimeVisible", False)):
                failures.append("skillLibraryDeckCardBackFaceRuntimeVisible!=true")
            if bool(page_summary.get("skillLibraryDeckCardFrontFaceRuntimeVisible", True)):
                failures.append("skillLibraryDeckCardFrontFaceRuntimeVisible!=false")
        if action == "world_open_main_city_skill_library_flip_card":
            if not str(page_summary.get("skillLibraryDeckCardClickedActionId", "")).startswith("skill_library_card_flip:"):
                failures.append("skillLibraryDeckCardClickedActionIdMissing")
            if page_summary.get("skillLibraryDeckCardClickedLiveTextContract") != "skill_library_deck_card_flip_live_text_v1":
                failures.append("skillLibraryDeckCardClickedLiveTextContract!=skill_library_deck_card_flip_live_text_v1")
            if not str(page_summary.get("skillLibraryDeckCardClickedLiveTextLabel", "")).strip():
                failures.append("skillLibraryDeckCardClickedLiveTextLabel empty")
            if page_summary.get("skillLibraryDeckCardClickedFaceBefore") != "front":
                failures.append("skillLibraryDeckCardClickedFaceBefore!=front")
            if page_summary.get("skillLibraryDeckCardClickedFaceAfter") != "back":
                failures.append("skillLibraryDeckCardClickedFaceAfter!=back")
            if not bool(page_summary.get("skillLibraryDeckCardClickVerified", False)):
                failures.append("skillLibraryDeckCardClickVerified!=true")
        if action == "world_open_main_city_skill_library_search":
            if bool(page_summary.get("skillDetailPopupVisible", False)):
                failures.append("skillDetailPopupVisible!=false")
        if page_summary.get("skillLibraryTypeOrderToken") != "general_skill_library_type_order_v1":
            failures.append("skillLibraryTypeOrderToken!=general_skill_library_type_order_v1")
        if page_summary.get("skillLibraryInteractionToken") != "general_skill_library_interaction_v1":
            failures.append("skillLibraryInteractionToken!=general_skill_library_interaction_v1")
        if page_summary.get("skillFilterChipBgToken") != SKILL_FILTER_CHIP_BG_TOKEN:
            failures.append(f"skillFilterChipBgToken!={SKILL_FILTER_CHIP_BG_TOKEN}")
        if page_summary.get("skillLibraryCardChromeToken") != "general_skill_library_card_chrome_v1":
            failures.append("skillLibraryCardChromeToken!=general_skill_library_card_chrome_v1")
        if page_summary.get("skillLibraryBadgePillToken") != "general_skill_library_badge_pill_v1":
            failures.append("skillLibraryBadgePillToken!=general_skill_library_badge_pill_v1")
        if page_summary.get("skillLibraryCardTextToken") != "general_skill_library_card_text_v1":
            failures.append("skillLibraryCardTextToken!=general_skill_library_card_text_v1")
        if page_summary.get("skillLibraryControlBandToken") != "general_skill_library_control_band_v1":
            failures.append("skillLibraryControlBandToken!=general_skill_library_control_band_v1")
        if page_summary.get("skillLibraryDeckHeaderToken") != "general_skill_library_deck_header_v1":
            failures.append("skillLibraryDeckHeaderToken!=general_skill_library_deck_header_v1")
        if page_summary.get("skillLibraryFilterRowToken") != "general_skill_library_filter_row_v1":
            failures.append("skillLibraryFilterRowToken!=general_skill_library_filter_row_v1")
        if page_summary.get("skillLibrarySearchRowToken") != "general_skill_library_search_row_v1":
            failures.append("skillLibrarySearchRowToken!=general_skill_library_search_row_v1")
        if _as_int(page_summary.get("skillLibraryFilterButtonMinHeight")) < 44:
            failures.append("skillLibraryFilterButtonMinHeight<44")
        if _as_int(page_summary.get("skillLibraryDetailButtonMinHeight")) < 44:
            failures.append("skillLibraryDetailButtonMinHeight<44")
        if _as_int(page_summary.get("skillLibrarySearchInputMinHeight")) < 44:
            failures.append("skillLibrarySearchInputMinHeight<44")
        if _as_int(page_summary.get("skillLibraryPrimaryCardMinHeight")) < 200:
            failures.append("skillLibraryPrimaryCardMinHeight<200")
        if _as_int(page_summary.get("skillLibraryBadgeMinHeight")) < 72:
            failures.append("skillLibraryBadgeMinHeight<72")
        if _as_int(page_summary.get("skillLibrarySummaryPillMinHeight")) < 32:
            failures.append("skillLibrarySummaryPillMinHeight<32")
        if _as_int(page_summary.get("skillLibraryBadgeMinWidth")) < 62:
            failures.append("skillLibraryBadgeMinWidth<62")
        if _as_int(page_summary.get("skillLibraryBadgePanelRadius")) != 3:
            failures.append("skillLibraryBadgePanelRadius!=3")
        if _as_int(page_summary.get("skillLibraryBadgeMarginLeft")) != 8:
            failures.append("skillLibraryBadgeMarginLeft!=8")
        if _as_int(page_summary.get("skillLibraryBadgeMarginTop")) != 8:
            failures.append("skillLibraryBadgeMarginTop!=8")
        if _as_int(page_summary.get("skillLibraryBadgeMarginRight")) != 8:
            failures.append("skillLibraryBadgeMarginRight!=8")
        if _as_int(page_summary.get("skillLibraryBadgeMarginBottom")) != 8:
            failures.append("skillLibraryBadgeMarginBottom!=8")
        if _as_int(page_summary.get("skillLibraryBadgeColumnSpacing")) != 4:
            failures.append("skillLibraryBadgeColumnSpacing!=4")
        if _as_int(page_summary.get("skillLibraryBadgeGradeFontSize")) != 23:
            failures.append("skillLibraryBadgeGradeFontSize!=23")
        if _as_int(page_summary.get("skillLibraryBadgeTypeFontSize")) != 13:
            failures.append("skillLibraryBadgeTypeFontSize!=13")
        if page_summary.get("skillLibraryBadgePillTextRoleToken") != "general_skill_library_badge_pill_text_roles_v1":
            failures.append("skillLibraryBadgePillTextRoleToken!=general_skill_library_badge_pill_text_roles_v1")
        if _as_int(page_summary.get("skillLibraryBadgeGradeMaxChars")) != 2:
            failures.append("skillLibraryBadgeGradeMaxChars!=2")
        if _as_int(page_summary.get("skillLibraryBadgeGradeMaxLines")) != 1:
            failures.append("skillLibraryBadgeGradeMaxLines!=1")
        if _as_int(page_summary.get("skillLibraryBadgeTypeMaxChars")) != 4:
            failures.append("skillLibraryBadgeTypeMaxChars!=4")
        if _as_int(page_summary.get("skillLibraryBadgeTypeMaxLines")) != 1:
            failures.append("skillLibraryBadgeTypeMaxLines!=1")
        if _as_int(page_summary.get("skillLibrarySummaryPillMinWidth")) < 78:
            failures.append("skillLibrarySummaryPillMinWidth<78")
        if _as_int(page_summary.get("skillLibrarySummaryPillCharWidth")) != 12:
            failures.append("skillLibrarySummaryPillCharWidth!=12")
        if _as_int(page_summary.get("skillLibrarySummaryPillWidthPadding")) != 20:
            failures.append("skillLibrarySummaryPillWidthPadding!=20")
        if _as_int(page_summary.get("skillLibrarySummaryPillPanelRadius")) != 3:
            failures.append("skillLibrarySummaryPillPanelRadius!=3")
        if _as_int(page_summary.get("skillLibrarySummaryPillMarginLeft")) != 10:
            failures.append("skillLibrarySummaryPillMarginLeft!=10")
        if _as_int(page_summary.get("skillLibrarySummaryPillMarginTop")) != 5:
            failures.append("skillLibrarySummaryPillMarginTop!=5")
        if _as_int(page_summary.get("skillLibrarySummaryPillMarginRight")) != 10:
            failures.append("skillLibrarySummaryPillMarginRight!=10")
        if _as_int(page_summary.get("skillLibrarySummaryPillMarginBottom")) != 5:
            failures.append("skillLibrarySummaryPillMarginBottom!=5")
        if _as_int(page_summary.get("skillLibrarySummaryPillFontSize")) != 12:
            failures.append("skillLibrarySummaryPillFontSize!=12")
        if page_summary.get("skillLibrarySummaryPillTextRoleToken") != "general_skill_library_summary_pill_text_roles_v1":
            failures.append("skillLibrarySummaryPillTextRoleToken!=general_skill_library_summary_pill_text_roles_v1")
        if _as_int(page_summary.get("skillLibrarySummaryPillTextMaxChars")) != 52:
            failures.append("skillLibrarySummaryPillTextMaxChars!=52")
        if _as_int(page_summary.get("skillLibrarySummaryPillTextMaxLines")) != 1:
            failures.append("skillLibrarySummaryPillTextMaxLines!=1")
        if page_summary.get("skillLibraryCardTextRoleToken") != "general_skill_library_card_text_roles_v1":
            failures.append("skillLibraryCardTextRoleToken!=general_skill_library_card_text_roles_v1")
        if page_summary.get("skillLibraryDeckCardTextBuilderToken") != "general_skill_library_deck_card_text_builders_v1":
            failures.append("skillLibraryDeckCardTextBuilderToken!=general_skill_library_deck_card_text_builders_v1")
        if page_summary.get("skillLibraryDeckCardTitleFallback") != "战法":
            failures.append("skillLibraryDeckCardTitleFallback!=战法")
        if page_summary.get("skillLibraryDeckCardSourceFallback") != "":
            failures.append("skillLibraryDeckCardSourceFallback!=")
        if page_summary.get("skillLibraryDeckCardSourceDictKey") != "pool":
            failures.append("skillLibraryDeckCardSourceDictKey!=pool")
        if page_summary.get("skillLibraryDeckCardDescriptionFallback") != "":
            failures.append("skillLibraryDeckCardDescriptionFallback!=")
        if page_summary.get("skillLibraryDeckCardMetaFormat") != "{troops} · {role}":
            failures.append("skillLibraryDeckCardMetaFormat!={troops} · {role}")
        if page_summary.get("skillLibraryDeckCardMetaSeparator") != " / ":
            failures.append("skillLibraryDeckCardMetaSeparator!= / ")
        if page_summary.get("skillLibraryDeckCardMetaSegmentSeparator") != " · ":
            failures.append("skillLibraryDeckCardMetaSegmentSeparator!= · ")
        if page_summary.get("skillLibraryDeckCardTroopFallback") != "通用":
            failures.append("skillLibraryDeckCardTroopFallback!=通用")
        if page_summary.get("skillLibraryDeckCardRoleFallback") != "通用":
            failures.append("skillLibraryDeckCardRoleFallback!=通用")
        if _as_int(page_summary.get("skillLibraryDeckCardMetaTroopLimit")) != 3:
            failures.append("skillLibraryDeckCardMetaTroopLimit!=3")
        if not bool(page_summary.get("skillLibraryDeckCardSearchMatchMetaPreferred", False)):
            failures.append("skillLibraryDeckCardSearchMatchMetaPreferred!=true")
        if _as_int(page_summary.get("skillLibraryPrimaryTitleFontSize")) < 20:
            failures.append("skillLibraryPrimaryTitleFontSize<20")
        if _as_int(page_summary.get("skillLibraryPrimaryTitleMaxChars")) != 12:
            failures.append("skillLibraryPrimaryTitleMaxChars!=12")
        if _as_int(page_summary.get("skillLibraryPrimaryTitleMaxLines")) != 1:
            failures.append("skillLibraryPrimaryTitleMaxLines!=1")
        if _as_int(page_summary.get("skillLibraryPrimarySourceFontSize")) != 13:
            failures.append("skillLibraryPrimarySourceFontSize!=13")
        if _as_int(page_summary.get("skillLibraryPrimarySourceMaxChars")) != 18:
            failures.append("skillLibraryPrimarySourceMaxChars!=18")
        if _as_int(page_summary.get("skillLibraryPrimarySourceMaxLines")) != 1:
            failures.append("skillLibraryPrimarySourceMaxLines!=1")
        if _as_int(page_summary.get("skillLibraryPrimaryDescriptionMaxChars")) != 30:
            failures.append("skillLibraryPrimaryDescriptionMaxChars!=30")
        if _as_int(page_summary.get("skillLibraryPrimaryDescriptionMaxLines")) != 1:
            failures.append("skillLibraryPrimaryDescriptionMaxLines!=1")
        if _as_int(page_summary.get("skillLibraryPrimaryMetaFontSize")) != 12:
            failures.append("skillLibraryPrimaryMetaFontSize!=12")
        if _as_int(page_summary.get("skillLibraryPrimaryMetaMaxChars")) != 30:
            failures.append("skillLibraryPrimaryMetaMaxChars!=30")
        if _as_int(page_summary.get("skillLibraryPrimaryMetaMaxLines")) != 1:
            failures.append("skillLibraryPrimaryMetaMaxLines!=1")
        if _as_int(page_summary.get("skillLibraryFeatureChipMaxChars")) != 12:
            failures.append("skillLibraryFeatureChipMaxChars!=12")
        if _as_int(page_summary.get("skillLibraryGalleryTitleFontSize")) != 20:
            failures.append("skillLibraryGalleryTitleFontSize!=20")
        if _as_int(page_summary.get("skillLibraryGalleryTitleMaxChars")) != 10:
            failures.append("skillLibraryGalleryTitleMaxChars!=10")
        if _as_int(page_summary.get("skillLibraryGalleryTitleMaxLines")) != 1:
            failures.append("skillLibraryGalleryTitleMaxLines!=1")
        if _as_int(page_summary.get("skillLibraryGalleryEffectFontSize")) != 13:
            failures.append("skillLibraryGalleryEffectFontSize!=13")
        if _as_int(page_summary.get("skillLibraryGalleryEffectMaxChars")) != 42:
            failures.append("skillLibraryGalleryEffectMaxChars!=42")
        if _as_int(page_summary.get("skillLibraryGalleryEffectMaxLines")) != 2:
            failures.append("skillLibraryGalleryEffectMaxLines!=2")
        if _as_int(page_summary.get("skillLibraryGalleryMetaFontSize")) != 12:
            failures.append("skillLibraryGalleryMetaFontSize!=12")
        if _as_int(page_summary.get("skillLibraryGalleryMetaMaxChars")) != 28:
            failures.append("skillLibraryGalleryMetaMaxChars!=28")
        if _as_int(page_summary.get("skillLibraryGalleryMetaMaxLines")) != 1:
            failures.append("skillLibraryGalleryMetaMaxLines!=1")
        if _as_int(page_summary.get("skillLibraryControlBandRowSpacing")) != 12:
            failures.append("skillLibraryControlBandRowSpacing!=12")
        if _as_int(page_summary.get("skillLibraryControlBandChipSpacing")) != 7:
            failures.append("skillLibraryControlBandChipSpacing!=7")
        if _as_int(page_summary.get("skillLibraryControlBandSearchBoxSpacing")) != 6:
            failures.append("skillLibraryControlBandSearchBoxSpacing!=6")
        if _as_int(page_summary.get("skillLibraryControlBandSearchInputMinWidth")) < 180:
            failures.append("skillLibraryControlBandSearchInputMinWidth<180")
        if _as_int(page_summary.get("skillLibraryControlBandSearchActionButtonCount")) != 2:
            failures.append("skillLibraryControlBandSearchActionButtonCount!=2")
        if page_summary.get("skillLibraryControlBandSearchInputNodeName") != "SkillLibraryControlBandSearchInput":
            failures.append("skillLibraryControlBandSearchInputNodeName!=SkillLibraryControlBandSearchInput")
        if page_summary.get("skillLibraryControlBandSearchButtonNodeName") != "SkillLibraryControlBandSearchButton":
            failures.append("skillLibraryControlBandSearchButtonNodeName!=SkillLibraryControlBandSearchButton")
        if _as_int(page_summary.get("skillLibraryDeckHeaderSpacing")) != 10:
            failures.append("skillLibraryDeckHeaderSpacing!=10")
        if _as_int(page_summary.get("skillLibraryDeckHeaderTitleFontSize")) != 24:
            failures.append("skillLibraryDeckHeaderTitleFontSize!=24")
        if _as_int(page_summary.get("skillLibraryDeckHeaderSummaryFontSize")) != 14:
            failures.append("skillLibraryDeckHeaderSummaryFontSize!=14")
        if page_summary.get("skillLibraryDeckBodyToken") != "general_skill_library_deck_body_v1":
            failures.append("skillLibraryDeckBodyToken!=general_skill_library_deck_body_v1")
        if _as_int(page_summary.get("skillLibraryDeckBodyMarginLeft")) != 18:
            failures.append("skillLibraryDeckBodyMarginLeft!=18")
        if _as_int(page_summary.get("skillLibraryDeckBodyMarginTop")) != 12:
            failures.append("skillLibraryDeckBodyMarginTop!=12")
        if _as_int(page_summary.get("skillLibraryDeckBodyMarginRight")) != 18:
            failures.append("skillLibraryDeckBodyMarginRight!=18")
        if _as_int(page_summary.get("skillLibraryDeckBodyMarginBottom")) != 12:
            failures.append("skillLibraryDeckBodyMarginBottom!=12")
        if _as_int(page_summary.get("skillLibraryDeckBodyColumnSpacing")) != 8:
            failures.append("skillLibraryDeckBodyColumnSpacing!=8")
        if _as_int(page_summary.get("skillLibraryDeckBodyPanelRadius")) != 4:
            failures.append("skillLibraryDeckBodyPanelRadius!=4")
        if page_summary.get("skillLibraryDeckCardLayoutToken") != "general_skill_library_deck_card_layout_v1":
            failures.append("skillLibraryDeckCardLayoutToken!=general_skill_library_deck_card_layout_v1")
        if _as_int(page_summary.get("skillLibraryDeckCardMarginLeft")) != 12:
            failures.append("skillLibraryDeckCardMarginLeft!=12")
        if _as_int(page_summary.get("skillLibraryDeckCardMarginTop")) != 8:
            failures.append("skillLibraryDeckCardMarginTop!=8")
        if _as_int(page_summary.get("skillLibraryDeckCardMarginRight")) != 12:
            failures.append("skillLibraryDeckCardMarginRight!=12")
        if _as_int(page_summary.get("skillLibraryDeckCardMarginBottom")) != 8:
            failures.append("skillLibraryDeckCardMarginBottom!=8")
        if _as_int(page_summary.get("skillLibraryDeckCardColumnSpacing")) != 6:
            failures.append("skillLibraryDeckCardColumnSpacing!=6")
        if _as_int(page_summary.get("skillLibraryDeckCardTopSpacing")) != 10:
            failures.append("skillLibraryDeckCardTopSpacing!=10")
        if _as_int(page_summary.get("skillLibraryDeckCardTitleStackSpacing")) != 4:
            failures.append("skillLibraryDeckCardTitleStackSpacing!=4")
        if _as_int(page_summary.get("skillLibraryDeckCardChipRowSpacing")) != 6:
            failures.append("skillLibraryDeckCardChipRowSpacing!=6")
        if _as_int(page_summary.get("skillLibraryDeckCardFeatureChipLimit")) != 1:
            failures.append("skillLibraryDeckCardFeatureChipLimit!=1")
        if page_summary.get("skillLibraryDeckCardSectionRuleToken") != "general_skill_library_deck_card_section_rule_v1":
            failures.append("skillLibraryDeckCardSectionRuleToken!=general_skill_library_deck_card_section_rule_v1")
        if page_summary.get("skillLibraryDeckCardSectionRuleNodeName") != "SkillLibraryDeckCardSectionRule":
            failures.append("skillLibraryDeckCardSectionRuleNodeName!=SkillLibraryDeckCardSectionRule")
        if _as_int(page_summary.get("skillLibraryDeckCardSectionRuleHeight")) != 1:
            failures.append("skillLibraryDeckCardSectionRuleHeight!=1")
        if _as_int(page_summary.get("skillLibraryDeckCardSectionRuleAlphaPercent")) != 55:
            failures.append("skillLibraryDeckCardSectionRuleAlphaPercent!=55")
        if page_summary.get("skillLibraryShowcaseHeaderToken") != "general_skill_library_showcase_header_v1":
            failures.append("skillLibraryShowcaseHeaderToken!=general_skill_library_showcase_header_v1")
        if _as_int(page_summary.get("skillLibraryShowcaseHeaderRowSpacing")) != 12:
            failures.append("skillLibraryShowcaseHeaderRowSpacing!=12")
        if _as_int(page_summary.get("skillLibraryShowcaseHeaderTitleStackSpacing")) != 3:
            failures.append("skillLibraryShowcaseHeaderTitleStackSpacing!=3")
        if _as_int(page_summary.get("skillLibraryShowcaseHeaderTitleFontSize")) != 28:
            failures.append("skillLibraryShowcaseHeaderTitleFontSize!=28")
        if _as_int(page_summary.get("skillLibraryShowcaseHeaderSubtitleFontSize")) != 13:
            failures.append("skillLibraryShowcaseHeaderSubtitleFontSize!=13")
        if _as_int(page_summary.get("skillLibraryShowcaseHeaderCountPanelMinWidth")) != 128:
            failures.append("skillLibraryShowcaseHeaderCountPanelMinWidth!=128")
        if _as_int(page_summary.get("skillLibraryShowcaseHeaderCountPanelMinHeight")) != 54:
            failures.append("skillLibraryShowcaseHeaderCountPanelMinHeight!=54")
        if _as_int(page_summary.get("skillLibraryShowcaseHeaderCountValueFontSize")) != 24:
            failures.append("skillLibraryShowcaseHeaderCountValueFontSize!=24")
        if _as_int(page_summary.get("skillLibraryShowcaseHeaderCountCaptionFontSize")) != 11:
            failures.append("skillLibraryShowcaseHeaderCountCaptionFontSize!=11")
        if _as_int(page_summary.get("skillLibraryShowcaseHeaderResetButtonMinWidth")) != 88:
            failures.append("skillLibraryShowcaseHeaderResetButtonMinWidth!=88")
        if _as_int(page_summary.get("skillLibraryShowcaseHeaderResetButtonMinHeight")) != 52:
            failures.append("skillLibraryShowcaseHeaderResetButtonMinHeight!=52")
        if page_summary.get("skillLibraryShowcaseFiltersToken") != "general_skill_library_showcase_filters_v1":
            failures.append("skillLibraryShowcaseFiltersToken!=general_skill_library_showcase_filters_v1")
        if _as_int(page_summary.get("skillLibraryShowcaseFiltersMarginLeft")) != 12:
            failures.append("skillLibraryShowcaseFiltersMarginLeft!=12")
        if _as_int(page_summary.get("skillLibraryShowcaseFiltersMarginTop")) != 10:
            failures.append("skillLibraryShowcaseFiltersMarginTop!=10")
        if _as_int(page_summary.get("skillLibraryShowcaseFiltersMarginRight")) != 12:
            failures.append("skillLibraryShowcaseFiltersMarginRight!=12")
        if _as_int(page_summary.get("skillLibraryShowcaseFiltersMarginBottom")) != 10:
            failures.append("skillLibraryShowcaseFiltersMarginBottom!=10")
        if _as_int(page_summary.get("skillLibraryShowcaseFiltersColumnSpacing")) != 8:
            failures.append("skillLibraryShowcaseFiltersColumnSpacing!=8")
        if _as_int(page_summary.get("skillLibraryShowcaseFiltersHintRowSpacing")) != 10:
            failures.append("skillLibraryShowcaseFiltersHintRowSpacing!=10")
        if _as_int(page_summary.get("skillLibraryShowcaseFiltersPanelRadius")) != 3:
            failures.append("skillLibraryShowcaseFiltersPanelRadius!=3")
        if page_summary.get("skillLibraryShowcaseFeaturePanelToken") != "general_skill_library_showcase_feature_panel_v1":
            failures.append("skillLibraryShowcaseFeaturePanelToken!=general_skill_library_showcase_feature_panel_v1")
        if _as_int(page_summary.get("skillLibraryShowcaseFeaturePanelMinWidth")) != 360:
            failures.append("skillLibraryShowcaseFeaturePanelMinWidth!=360")
        if _as_int(page_summary.get("skillLibraryShowcaseFeaturePanelRadius")) != 4:
            failures.append("skillLibraryShowcaseFeaturePanelRadius!=4")
        if _as_int(page_summary.get("skillLibraryShowcaseFeaturePanelStretchPercent")) != 42:
            failures.append("skillLibraryShowcaseFeaturePanelStretchPercent!=42")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureMarginLeft")) != 18:
            failures.append("skillLibraryShowcaseFeatureMarginLeft!=18")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureMarginTop")) != 18:
            failures.append("skillLibraryShowcaseFeatureMarginTop!=18")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureMarginRight")) != 18:
            failures.append("skillLibraryShowcaseFeatureMarginRight!=18")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureMarginBottom")) != 18:
            failures.append("skillLibraryShowcaseFeatureMarginBottom!=18")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureColumnSpacing")) != 12:
            failures.append("skillLibraryShowcaseFeatureColumnSpacing!=12")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureTopRowSpacing")) != 10:
            failures.append("skillLibraryShowcaseFeatureTopRowSpacing!=10")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureTitleStackSpacing")) != 3:
            failures.append("skillLibraryShowcaseFeatureTitleStackSpacing!=3")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureChipRowSpacing")) != 7:
            failures.append("skillLibraryShowcaseFeatureChipRowSpacing!=7")
        if page_summary.get("skillLibraryShowcaseFeatureChipRowToken") != "general_skill_library_showcase_feature_chip_row_v1":
            failures.append("skillLibraryShowcaseFeatureChipRowToken!=general_skill_library_showcase_feature_chip_row_v1")
        if page_summary.get("skillLibraryShowcaseFeatureChipRowNodeName") != "SkillLibraryShowcaseFeatureChipRow":
            failures.append("skillLibraryShowcaseFeatureChipRowNodeName!=SkillLibraryShowcaseFeatureChipRow")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureChipRowHSpacing")) != 7:
            failures.append("skillLibraryShowcaseFeatureChipRowHSpacing!=7")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureChipRowVSpacing")) != 7:
            failures.append("skillLibraryShowcaseFeatureChipRowVSpacing!=7")
        if page_summary.get("skillLibraryShowcaseFeatureSectionRuleToken") != "general_skill_library_showcase_feature_section_rule_v1":
            failures.append("skillLibraryShowcaseFeatureSectionRuleToken!=general_skill_library_showcase_feature_section_rule_v1")
        if page_summary.get("skillLibraryShowcaseFeatureSectionRuleNodeName") != "SkillLibraryShowcaseFeatureSectionRule":
            failures.append("skillLibraryShowcaseFeatureSectionRuleNodeName!=SkillLibraryShowcaseFeatureSectionRule")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureSectionRuleHeight")) != 1:
            failures.append("skillLibraryShowcaseFeatureSectionRuleHeight!=1")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureSectionRuleAlphaPercent")) != 55:
            failures.append("skillLibraryShowcaseFeatureSectionRuleAlphaPercent!=55")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureTitleFontSize")) != 32:
            failures.append("skillLibraryShowcaseFeatureTitleFontSize!=32")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureSourceFontSize")) != 13:
            failures.append("skillLibraryShowcaseFeatureSourceFontSize!=13")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureSourceMaxChars")) != 28:
            failures.append("skillLibraryShowcaseFeatureSourceMaxChars!=28")
        if page_summary.get("skillLibraryShowcaseFeatureSourceFallback") != "":
            failures.append("skillLibraryShowcaseFeatureSourceFallback!=")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureTitleMaxLines")) != 1:
            failures.append("skillLibraryShowcaseFeatureTitleMaxLines!=1")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureSourceMaxLines")) != 1:
            failures.append("skillLibraryShowcaseFeatureSourceMaxLines!=1")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureDescriptionFontSize")) != 18:
            failures.append("skillLibraryShowcaseFeatureDescriptionFontSize!=18")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureDescriptionMaxChars")) != 72:
            failures.append("skillLibraryShowcaseFeatureDescriptionMaxChars!=72")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureEffectFontSize")) != 14:
            failures.append("skillLibraryShowcaseFeatureEffectFontSize!=14")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureEffectMaxChars")) != 58:
            failures.append("skillLibraryShowcaseFeatureEffectMaxChars!=58")
        if page_summary.get("skillLibraryShowcaseFeatureTextBuilderToken") != "general_skill_library_showcase_feature_text_builders_v1":
            failures.append("skillLibraryShowcaseFeatureTextBuilderToken!=general_skill_library_showcase_feature_text_builders_v1")
        if page_summary.get("skillLibraryShowcaseFeatureTitleFallback") != "战法":
            failures.append("skillLibraryShowcaseFeatureTitleFallback!=战法")
        if page_summary.get("skillLibraryShowcaseFeatureDescriptionFallback") != "":
            failures.append("skillLibraryShowcaseFeatureDescriptionFallback!=")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureDescriptionMaxLines")) != 2:
            failures.append("skillLibraryShowcaseFeatureDescriptionMaxLines!=2")
        if page_summary.get("skillLibraryShowcaseFeatureEffectFallback") != "":
            failures.append("skillLibraryShowcaseFeatureEffectFallback!=")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureEffectMaxLines")) != 2:
            failures.append("skillLibraryShowcaseFeatureEffectMaxLines!=2")
        if page_summary.get("skillLibraryShowcaseFeatureEmptyTextBuilderToken") != "general_skill_library_showcase_feature_empty_text_builders_v1":
            failures.append("skillLibraryShowcaseFeatureEmptyTextBuilderToken!=general_skill_library_showcase_feature_empty_text_builders_v1")
        if page_summary.get("skillLibraryShowcaseFeatureEmptyTitleText") != "暂无符合条件的战法":
            failures.append("skillLibraryShowcaseFeatureEmptyTitleText!=暂无符合条件的战法")
        if page_summary.get("skillLibraryShowcaseFeatureEmptySubtitleText") != "调整筛选后再查看。":
            failures.append("skillLibraryShowcaseFeatureEmptySubtitleText!=调整筛选后再查看。")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureEmptyTitleMaxLines")) != 1:
            failures.append("skillLibraryShowcaseFeatureEmptyTitleMaxLines!=1")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureEmptySubtitleMaxLines")) != 1:
            failures.append("skillLibraryShowcaseFeatureEmptySubtitleMaxLines!=1")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureEmptyTitleFontSize")) != 24:
            failures.append("skillLibraryShowcaseFeatureEmptyTitleFontSize!=24")
        if _as_int(page_summary.get("skillLibraryShowcaseFeatureEmptySubtitleFontSize")) != 15:
            failures.append("skillLibraryShowcaseFeatureEmptySubtitleFontSize!=15")
        if page_summary.get("skillLibraryShowcaseGalleryToken") != "general_skill_library_showcase_gallery_v1":
            failures.append("skillLibraryShowcaseGalleryToken!=general_skill_library_showcase_gallery_v1")
        if _as_int(page_summary.get("skillLibraryShowcaseGalleryPanelRadius")) != 4:
            failures.append("skillLibraryShowcaseGalleryPanelRadius!=4")
        if _as_int(page_summary.get("skillLibraryShowcaseGalleryPanelStretchPercent")) != 58:
            failures.append("skillLibraryShowcaseGalleryPanelStretchPercent!=58")
        if _as_int(page_summary.get("skillLibraryShowcaseGalleryMarginLeft")) != 16:
            failures.append("skillLibraryShowcaseGalleryMarginLeft!=16")
        if _as_int(page_summary.get("skillLibraryShowcaseGalleryMarginTop")) != 16:
            failures.append("skillLibraryShowcaseGalleryMarginTop!=16")
        if _as_int(page_summary.get("skillLibraryShowcaseGalleryMarginRight")) != 16:
            failures.append("skillLibraryShowcaseGalleryMarginRight!=16")
        if _as_int(page_summary.get("skillLibraryShowcaseGalleryMarginBottom")) != 16:
            failures.append("skillLibraryShowcaseGalleryMarginBottom!=16")
        if _as_int(page_summary.get("skillLibraryShowcaseGalleryColumnSpacing")) != 12:
            failures.append("skillLibraryShowcaseGalleryColumnSpacing!=12")
        if _as_int(page_summary.get("skillLibraryShowcaseGalleryHeaderSpacing")) != 10:
            failures.append("skillLibraryShowcaseGalleryHeaderSpacing!=10")
        if _as_int(page_summary.get("skillLibraryShowcaseGalleryTitleFontSize")) != 22:
            failures.append("skillLibraryShowcaseGalleryTitleFontSize!=22")
        if _as_int(page_summary.get("skillLibraryShowcaseGalleryNoteFontSize")) != 13:
            failures.append("skillLibraryShowcaseGalleryNoteFontSize!=13")
        if _as_int(page_summary.get("skillLibraryShowcaseGalleryGridColumns")) != 3:
            failures.append("skillLibraryShowcaseGalleryGridColumns!=3")
        if _as_int(page_summary.get("skillLibraryShowcaseGalleryGridHSpacing")) != 12:
            failures.append("skillLibraryShowcaseGalleryGridHSpacing!=12")
        if _as_int(page_summary.get("skillLibraryShowcaseGalleryGridVSpacing")) != 12:
            failures.append("skillLibraryShowcaseGalleryGridVSpacing!=12")
        if _as_int(page_summary.get("skillLibraryShowcaseGalleryVisibleCardLimit")) != 6:
            failures.append("skillLibraryShowcaseGalleryVisibleCardLimit!=6")
        if _as_int(page_summary.get("skillLibraryShowcaseGalleryEmptyFontSize")) != 17:
            failures.append("skillLibraryShowcaseGalleryEmptyFontSize!=17")
        if page_summary.get("skillLibraryShowcaseCardLayoutToken") != "general_skill_library_showcase_card_layout_v1":
            failures.append("skillLibraryShowcaseCardLayoutToken!=general_skill_library_showcase_card_layout_v1")
        if _as_int(page_summary.get("skillLibraryShowcaseCardMarginLeft")) != 12:
            failures.append("skillLibraryShowcaseCardMarginLeft!=12")
        if _as_int(page_summary.get("skillLibraryShowcaseCardMarginTop")) != 10:
            failures.append("skillLibraryShowcaseCardMarginTop!=10")
        if _as_int(page_summary.get("skillLibraryShowcaseCardMarginRight")) != 12:
            failures.append("skillLibraryShowcaseCardMarginRight!=12")
        if _as_int(page_summary.get("skillLibraryShowcaseCardMarginBottom")) != 10:
            failures.append("skillLibraryShowcaseCardMarginBottom!=10")
        if _as_int(page_summary.get("skillLibraryShowcaseCardRowSpacing")) != 10:
            failures.append("skillLibraryShowcaseCardRowSpacing!=10")
        if _as_int(page_summary.get("skillLibraryShowcaseCardDetailColumnSpacing")) != 5:
            failures.append("skillLibraryShowcaseCardDetailColumnSpacing!=5")
        if page_summary.get("skillLibraryShowcaseCardTextBuilderToken") != "general_skill_library_showcase_card_text_builders_v1":
            failures.append("skillLibraryShowcaseCardTextBuilderToken!=general_skill_library_showcase_card_text_builders_v1")
        if page_summary.get("skillLibraryShowcaseCardTitleFallback") != "战法":
            failures.append("skillLibraryShowcaseCardTitleFallback!=战法")
        if page_summary.get("skillLibraryShowcaseCardEffectFallback") != "":
            failures.append("skillLibraryShowcaseCardEffectFallback!=")
        if page_summary.get("skillLibraryShowcaseCardEffectFieldSeparator") != " / ":
            failures.append("skillLibraryShowcaseCardEffectFieldSeparator!= / ")
        if page_summary.get("skillLibraryShowcaseCardEffectFieldOrder") != "trigger / target / effect / attribute_effects":
            failures.append("skillLibraryShowcaseCardEffectFieldOrder!=trigger / target / effect / attribute_effects")
        if page_summary.get("skillLibraryShowcaseCardMetaFormat") != "{troops} · {role}":
            failures.append("skillLibraryShowcaseCardMetaFormat!={troops} · {role}")
        if page_summary.get("skillLibraryShowcaseCardMetaSeparator") != " / ":
            failures.append("skillLibraryShowcaseCardMetaSeparator!= / ")
        if page_summary.get("skillLibraryShowcaseCardMetaSegmentSeparator") != " · ":
            failures.append("skillLibraryShowcaseCardMetaSegmentSeparator!= · ")
        if page_summary.get("skillLibraryShowcaseCardTroopFallback") != "通用":
            failures.append("skillLibraryShowcaseCardTroopFallback!=通用")
        if page_summary.get("skillLibraryShowcaseCardRoleFallback") != "通用":
            failures.append("skillLibraryShowcaseCardRoleFallback!=通用")
        if _as_int(page_summary.get("skillLibraryShowcaseCardMetaTroopLimit")) != 3:
            failures.append("skillLibraryShowcaseCardMetaTroopLimit!=3")
        if not bool(page_summary.get("skillLibraryShowcaseCardSearchMatchMetaPreferred", False)):
            failures.append("skillLibraryShowcaseCardSearchMatchMetaPreferred!=true")
        if _as_int(page_summary.get("skillLibraryFilterHeaderTitleWidth")) < 42:
            failures.append("skillLibraryFilterHeaderTitleWidth<42")
        if _as_int(page_summary.get("skillLibraryFilterSummaryFontSize")) != 12:
            failures.append("skillLibraryFilterSummaryFontSize!=12")
        if _as_int(page_summary.get("skillLibraryFilterOptionScrollMinHeight")) < 76:
            failures.append("skillLibraryFilterOptionScrollMinHeight<76")
        if _as_int(page_summary.get("skillLibraryFilterOptionSpacing")) != 5:
            failures.append("skillLibraryFilterOptionSpacing!=5")
        if _as_int(page_summary.get("skillLibrarySearchRowSpacing")) != 6:
            failures.append("skillLibrarySearchRowSpacing!=6")
        if _as_int(page_summary.get("skillLibrarySearchInputMinWidth")) < 180:
            failures.append("skillLibrarySearchInputMinWidth<180")
        if _as_int(page_summary.get("skillLibrarySearchActionButtonCount")) != 2:
            failures.append("skillLibrarySearchActionButtonCount!=2")
        if page_summary.get("skillLibrarySearchInputNodeName") != "SkillLibrarySearchInput":
            failures.append("skillLibrarySearchInputNodeName!=SkillLibrarySearchInput")
        if page_summary.get("skillLibrarySearchButtonNodeName") != "SkillLibrarySearchButton":
            failures.append("skillLibrarySearchButtonNodeName!=SkillLibrarySearchButton")
        if _as_int(page_summary.get("skillLibraryTypeOptionCount")) != 4:
            failures.append("skillLibraryTypeOptionCount!=4")
        if not bool(page_summary.get("skillLibraryHasPassiveTypeFilter", False)):
            failures.append("skillLibraryHasPassiveTypeFilter!=true")
        if "被动" not in str(page_summary.get("skillLibraryTypeOptions", "")):
            failures.append("skillLibraryTypeOptions missing 被动")
        if _as_int(page_summary.get("skillLibraryVisibleCardTarget")) <= 0:
            failures.append("skillLibraryVisibleCardTarget<=0")
        if not bool(page_summary.get("skillLibrarySearchVisible", False)):
            failures.append("skillLibrarySearchVisible!=true")
        filter_chip_count = _as_int(page_summary.get("skillLibraryFilterChipCount"))
        if filter_chip_count != 5:
            failures.append("skillLibraryFilterChipCount!=5")
        runtime_filter_button_count = _as_int(page_summary.get("skillLibraryFilterRuntimeButtonCount"))
        if runtime_filter_button_count < filter_chip_count:
            failures.append("skillLibraryFilterRuntimeButtonCount<skillLibraryFilterChipCount")
        if _as_int(page_summary.get("skillLibraryFilterRuntimeTokenCount")) < runtime_filter_button_count:
            failures.append("skillLibraryFilterRuntimeTokenCount<runtime_filter_button_count")
        if _as_int(page_summary.get("skillLibraryFilterRuntimeLiveTextCount")) < runtime_filter_button_count:
            failures.append("skillLibraryFilterRuntimeLiveTextCount<runtime_filter_button_count")
        if page_summary.get("skillLibraryFilterRuntimeLiveTextContract") != "skill_library_filter_live_text_v1":
            failures.append("skillLibraryFilterRuntimeLiveTextContract!=skill_library_filter_live_text_v1")
        runtime_filter_labels = str(page_summary.get("skillLibraryFilterRuntimeButtonLabels", ""))
        for expected_label in ["全部", "指挥", "主动", "被动", "追击", "查找", "清空"]:
            if expected_label not in runtime_filter_labels:
                failures.append(f"skillLibraryFilterRuntimeButtonLabels missing {expected_label}")
        if _as_int(page_summary.get("skillLibraryFilterRuntimeMinHeight")) < 56:
            failures.append("skillLibraryFilterRuntimeMinHeight<56")
        if page_summary.get("skillLibraryDeckCardRailAnchorMode") != "centered_visible_cards_responsive_v1":
            failures.append("skillLibraryDeckCardRailAnchorMode!=centered_visible_cards_responsive_v1")
        if page_summary.get("skillLibraryDeckCardScrollAnchorMode") != "fill_parent_left_content_v1":
            failures.append("skillLibraryDeckCardScrollAnchorMode!=fill_parent_left_content_v1")
        if page_summary.get("skillLibraryDeckCardGridMode") != "responsive_centered_skill_card_grid_v1":
            failures.append("skillLibraryDeckCardGridMode!=responsive_centered_skill_card_grid_v1")
        if page_summary.get("skillLibraryDeckCardGridRuntimeMode") != "responsive_centered_skill_card_grid_v1":
            failures.append("skillLibraryDeckCardGridRuntimeMode!=responsive_centered_skill_card_grid_v1")
        if page_summary.get("skillLibraryDeckCardScrollAxisRuntime") != "vertical_touch_scroll_v1":
            failures.append("skillLibraryDeckCardScrollAxisRuntime!=vertical_touch_scroll_v1")
        if _as_int(page_summary.get("skillLibraryDeckCardGridColumns")) != expected_skill_library_target:
            failures.append(f"skillLibraryDeckCardGridColumns!={expected_skill_library_target}")
        if _as_int(page_summary.get("skillLibraryDeckCardGridRenderedCount")) < _as_int(page_summary.get("skillLibraryDeckCardRailVisibleCount")):
            failures.append("skillLibraryDeckCardGridRenderedCount<skillLibraryDeckCardRailVisibleCount")
        if action in {
            "world_open_main_city_skill_library_flip_card",
            "world_open_main_city_skill_library_search",
        } and _as_int(page_summary.get("skillLibraryDeckCardRailScrollHorizontal")) != 0:
            failures.append("skillLibraryDeckCardRailScrollHorizontal!=0")
        if bool(page_summary.get("skillLibraryOldResultDetailButtonRuntimeVisible", False)):
            failures.append("skillLibraryOldResultDetailButtonRuntimeVisible!=false")
        if bool(page_summary.get("skillLibraryOldPopupChainRuntimeVisible", False)):
            failures.append("skillLibraryOldPopupChainRuntimeVisible!=false")
        if not bool(page_summary.get("skillLibraryFloatingCloseButtonVisible", False)):
            failures.append("skillLibraryFloatingCloseButtonVisible!=true")
        if "关闭" not in str(page_summary.get("skillLibraryFloatingCloseButtonText", "")):
            failures.append("skillLibraryFloatingCloseButtonText missing 关闭")
        if bool(page_summary.get("skillLibraryFilterAllButtonVisible", True)):
            failures.append("skillLibraryFilterAllButtonVisible!=false")
        if bool(page_summary.get("skillLibraryResetButtonVisible", True)):
            failures.append("skillLibraryResetButtonVisible!=false")
        if bool(page_summary.get("skillLibraryStandaloneHeaderVisible", True)):
            failures.append("skillLibraryStandaloneHeaderVisible!=false")
        if page_summary.get("skillLibraryCountCaptionLabel") != "战法":
            failures.append("skillLibraryCountCaptionLabel!=战法")
        if page_summary.get("skillLibraryCountPanelValueMode") != "total":
            failures.append("skillLibraryCountPanelValueMode!=total")
        if page_summary.get("skillLibraryMobileTouchScrollMode") != "hidden_scrollbar_touch_scroll":
            failures.append("skillLibraryMobileTouchScrollMode!=hidden_scrollbar_touch_scroll")
        if _as_int(page_summary.get("skillLibraryFilterButtonMinHeight")) < 56:
            failures.append("skillLibraryFilterButtonMinHeight<56")
        if _as_int(page_summary.get("skillLibraryDescriptionMaxLines")) > 1:
            failures.append("skillLibraryDescriptionMaxLines>1")
        if bool(page_summary.get("authorityTriggered", True)):
            failures.append("authorityTriggered!=false")
    if action in SKILL_LIBRARY_SEARCH_CONTRACT_ACTIONS:
        if not bool(page_summary.get("skillLibrarySearchInputApplied", False)):
            failures.append("skillLibrarySearchInputApplied!=true")
        if not bool(page_summary.get("skillLibrarySearchButtonVisible", False)):
            failures.append("skillLibrarySearchButtonVisible!=true")
        if page_summary.get("skillLibrarySearchButtonClickedActionId") != "skill_library_filter:search_apply:全部":
            failures.append("skillLibrarySearchButtonClickedActionId!=skill_library_filter:search_apply:全部")
        if page_summary.get("skillLibrarySearchButtonClickedToken") != SKILL_FILTER_CHIP_BG_TOKEN:
            failures.append(f"skillLibrarySearchButtonClickedToken!={SKILL_FILTER_CHIP_BG_TOKEN}")
        if page_summary.get("skillLibrarySearchButtonClickedLiveTextContract") != "skill_library_filter_live_text_v1":
            failures.append("skillLibrarySearchButtonClickedLiveTextContract!=skill_library_filter_live_text_v1")
        if page_summary.get("skillLibrarySearchButtonClickedLiveTextLabel") != "查找":
            failures.append("skillLibrarySearchButtonClickedLiveTextLabel!=查找")
        if not bool(page_summary.get("skillLibrarySearchButtonClickVerified", False)):
            failures.append("skillLibrarySearchButtonClickVerified!=true")
        if page_summary.get("skillLibrarySearchSmokeText") != "兵":
            failures.append("skillLibrarySearchSmokeText!=兵")
        if not bool(page_summary.get("skillLibrarySearchResultReadModelVisible", False)):
            failures.append("skillLibrarySearchResultReadModelVisible!=true")
    if action in SKILL_LIBRARY_CLEAR_SEARCH_CONTRACT_ACTIONS:
        if page_summary.get("skillLibraryClearSearchInputSeedText") != "兵":
            failures.append("skillLibraryClearSearchInputSeedText!=兵")
        if not bool(page_summary.get("skillLibraryClearSearchButtonVisible", False)):
            failures.append("skillLibraryClearSearchButtonVisible!=true")
        if page_summary.get("skillLibraryClearSearchButtonClickedActionId") != "skill_library_filter:search_clear:全部":
            failures.append("skillLibraryClearSearchButtonClickedActionId!=skill_library_filter:search_clear:全部")
        if page_summary.get("skillLibraryClearSearchButtonClickedToken") != SKILL_FILTER_CHIP_BG_TOKEN:
            failures.append(f"skillLibraryClearSearchButtonClickedToken!={SKILL_FILTER_CHIP_BG_TOKEN}")
        if page_summary.get("skillLibraryClearSearchButtonClickedLiveTextContract") != "skill_library_filter_live_text_v1":
            failures.append("skillLibraryClearSearchButtonClickedLiveTextContract!=skill_library_filter_live_text_v1")
        if page_summary.get("skillLibraryClearSearchButtonClickedLiveTextLabel") != "清空":
            failures.append("skillLibraryClearSearchButtonClickedLiveTextLabel!=清空")
        if not bool(page_summary.get("skillLibraryClearSearchButtonClickVerified", False)):
            failures.append("skillLibraryClearSearchButtonClickVerified!=true")
        if bool(page_summary.get("skillLibraryClearSearchResultReadModelVisibleAfterClick", True)):
            failures.append("skillLibraryClearSearchResultReadModelVisibleAfterClick!=false")
        if _as_int(page_summary.get("skillLibraryClearSearchResultReadModelCountAfterClick"), -1) != 0:
            failures.append("skillLibraryClearSearchResultReadModelCountAfterClick!=0")
    if action in SKILL_LIBRARY_DETAIL_CONTRACT_ACTIONS:
        if bool(page_summary.get("skillDetailPopupVisible", False)):
            failures.append("skillDetailPopupVisible!=false")
        if page_summary.get("skillLibraryDeckCardBackFaceReadModelSource") != "skill_detail/read_model":
            failures.append("skillLibraryDeckCardBackFaceReadModelSource!=skill_detail/read_model")
        if _as_int(page_summary.get("skillLibraryDeckCardBackFaceFieldFontSize")) < 16:
            failures.append("skillLibraryDeckCardBackFaceFieldFontSize<16")
        if action in SKILL_LIBRARY_TYPE_SHOWCASE_CONTRACT_ACTIONS:
            expected_type = SKILL_LIBRARY_TYPE_SHOWCASE_CONTRACT_ACTIONS[action]
            if page_summary.get("skillLibraryTypeShowcaseSmokeType") != expected_type:
                failures.append(f"skillLibraryTypeShowcaseSmokeType!={expected_type}")
            if page_summary.get("skillLibraryTypeFilterClickedActionId") != f"skill_library_filter:type:{expected_type}":
                failures.append(f"skillLibraryTypeFilterClickedActionId!=skill_library_filter:type:{expected_type}")
            if page_summary.get("skillLibraryTypeFilterClickedToken") != SKILL_FILTER_CHIP_BG_TOKEN:
                failures.append(f"skillLibraryTypeFilterClickedToken!={SKILL_FILTER_CHIP_BG_TOKEN}")
            if page_summary.get("skillLibraryTypeFilterClickedLiveTextContract") != "skill_library_filter_live_text_v1":
                failures.append("skillLibraryTypeFilterClickedLiveTextContract!=skill_library_filter_live_text_v1")
            if page_summary.get("skillLibraryTypeFilterClickedLiveTextLabel") != expected_type:
                failures.append(f"skillLibraryTypeFilterClickedLiveTextLabel!={expected_type}")
            if not bool(page_summary.get("skillLibraryTypeFilterClickVerified", False)):
                failures.append("skillLibraryTypeFilterClickVerified!=true")
            if page_summary.get("skillLibraryActiveTypeFilter") != expected_type:
                failures.append(f"skillLibraryActiveTypeFilter!={expected_type}")
            if _as_int(page_summary.get("skillLibraryTypeShowcaseSmokeVisibleTypeCount")) != 1:
                failures.append("skillLibraryTypeShowcaseSmokeVisibleTypeCount!=1")
            if page_summary.get("skillLibraryTypeShowcaseSmokeVisibleTypes") != expected_type:
                failures.append(f"skillLibraryTypeShowcaseSmokeVisibleTypes!={expected_type}")
            if _as_int(page_summary.get("skillLibraryDeckCardTypeLabelTextCount")) < 1:
                failures.append("skillLibraryDeckCardTypeLabelTextCount<1")
            if page_summary.get("skillLibraryDeckCardTypeLabelValues") != expected_type:
                failures.append(f"skillLibraryDeckCardTypeLabelValues!={expected_type}")
    if action in RECRUIT_VISUAL_CONTRACT_ACTIONS:
        failures.extend(_validate_design_system_contract(page_summary, "recruit_formal_pack"))
        failures.extend(_validate_recruit_formal_pack_component_contract(page_summary))
        failures.extend(_validate_hero_card_contract(page_summary, "pool_preview", min_sample_count=1))
        if page_summary.get("recruitViewMode") != "formal_pack_pack_carousel":
            failures.append("recruitViewMode!=formal_pack_pack_carousel")
        if page_summary.get("recruitActionMode") != "preview_only":
            failures.append("recruitActionMode!=preview_only")
        if not bool(page_summary.get("selectedRecruitPackHasInlineActions", False)):
            failures.append("selectedRecruitPackHasInlineActions!=true")
        if not bool(page_summary.get("recruitSingleActionVisible", False)):
            failures.append("recruitSingleActionVisible!=true")
        if not bool(page_summary.get("recruitFiveActionVisible", False)):
            failures.append("recruitFiveActionVisible!=true")
    if action in RECRUIT_DRAW_RESULT_VISUAL_CONTRACT_ACTIONS:
        failures.extend(_validate_recruit_formal_pack_component_contract(page_summary))
        failures.extend(_validate_hero_card_contract(
            page_summary,
            "draw_result",
            min_sample_count=1,
            require_portrait_resolution=True,
            min_portrait_checked_count=1,
        ))
        failures.extend(_validate_hero_card_skill_visual_contract(page_summary))
        if page_summary.get("drawResultViewMode") != "formal_pack_draw_result_row":
            failures.append("drawResultViewMode!=formal_pack_draw_result_row")
        if page_summary.get("drawResultCardMode") != "draw_result":
            failures.append("drawResultCardMode!=draw_result")
        try:
            draw_result_count = int(page_summary.get("drawResultVisibleCount", 0))
        except (TypeError, ValueError):
            draw_result_count = 0
        if draw_result_count != 5:
            failures.append("drawResultVisibleCount!=5")
        if _as_int(page_summary.get("drawResultInitialVisibleCardTarget")) != 3:
            failures.append("drawResultInitialVisibleCardTarget!=3")
        if page_summary.get("drawResultCardRailLayoutToken") != CARD_RAIL_LAYOUT_TOKEN:
            failures.append(f"drawResultCardRailLayoutToken!={CARD_RAIL_LAYOUT_TOKEN}")
        if page_summary.get("drawResultCardRailScrollMode") != CARD_RAIL_SCROLL_MODE:
            failures.append(f"drawResultCardRailScrollMode!={CARD_RAIL_SCROLL_MODE}")
        if page_summary.get("drawResultCardRailScrollbarVisibility") != "hidden":
            failures.append("drawResultCardRailScrollbarVisibility!=hidden")
        if page_summary.get("drawResultCardRailInputMode") != "touch_mouse_horizontal_drag":
            failures.append("drawResultCardRailInputMode!=touch_mouse_horizontal_drag")
        if _as_int(page_summary.get("drawResultCardRailViewportWidth")) != CARD_RAIL_FULL_CARD_VIEWPORT_WIDTH_3:
            failures.append(f"drawResultCardRailViewportWidth!={CARD_RAIL_FULL_CARD_VIEWPORT_WIDTH_3}")
        if _as_int(page_summary.get("drawResultCardRailViewportHeight")) != CARD_RAIL_FULL_CARD_MIN_HEIGHT:
            failures.append(f"drawResultCardRailViewportHeight!={CARD_RAIL_FULL_CARD_MIN_HEIGHT}")
        if _as_int(page_summary.get("drawResultCardRailContentWidth")) != CARD_RAIL_FULL_CARD_CONTENT_WIDTH_5:
            failures.append(f"drawResultCardRailContentWidth!={CARD_RAIL_FULL_CARD_CONTENT_WIDTH_5}")
        if _as_int(page_summary.get("drawResultCardRailCardWidth")) != HERO_CARD_FULL_LAYOUT_WIDTH:
            failures.append(f"drawResultCardRailCardWidth!={HERO_CARD_FULL_LAYOUT_WIDTH}")
        if _as_int(page_summary.get("drawResultCardRailCardHeight")) != HERO_CARD_FULL_LAYOUT_HEIGHT:
            failures.append(f"drawResultCardRailCardHeight!={HERO_CARD_FULL_LAYOUT_HEIGHT}")
        if _as_int(page_summary.get("drawResultCardRailGap")) != HERO_CARD_FULL_LAYOUT_GAP:
            failures.append(f"drawResultCardRailGap!={HERO_CARD_FULL_LAYOUT_GAP}")
        if _as_int(page_summary.get("drawResultCardRailMinHeight")) != CARD_RAIL_FULL_CARD_MIN_HEIGHT:
            failures.append(f"drawResultCardRailMinHeight!={CARD_RAIL_FULL_CARD_MIN_HEIGHT}")
        if _as_int(page_summary.get("drawResultRepeatActionGap")) != CARD_RAIL_REPEAT_ACTION_GAP:
            failures.append(f"drawResultRepeatActionGap!={CARD_RAIL_REPEAT_ACTION_GAP}")
        if page_summary.get("drawResultRepeatActionSlotMode") != "card_rail_repeat_action_gap_spacer_v1":
            failures.append("drawResultRepeatActionSlotMode!=card_rail_repeat_action_gap_spacer_v1")
        if bool(page_summary.get("authorityTriggered", True)):
            failures.append("authorityTriggered!=false")
    if action in RECRUIT_SINGLE_PREVIEW_VISUAL_CONTRACT_ACTIONS or action in RECRUIT_MULTI_PREVIEW_VISUAL_CONTRACT_ACTIONS:
        failures.extend(_validate_design_system_contract(page_summary, "recruit_formal_pack"))
        failures.extend(_validate_recruit_formal_pack_component_contract(page_summary))
        expected_view_mode = (
            "formal_pack_multi_draw_result_display"
            if action in RECRUIT_MULTI_PREVIEW_VISUAL_CONTRACT_ACTIONS
            else "formal_pack_single_draw_result_display"
        )
        expected_draw_mode = "five" if action in RECRUIT_MULTI_PREVIEW_VISUAL_CONTRACT_ACTIONS else "single"
        expected_count = 5 if action in RECRUIT_MULTI_PREVIEW_VISUAL_CONTRACT_ACTIONS else 1
        expected_action_id = "draw_multi" if action in RECRUIT_MULTI_PREVIEW_VISUAL_CONTRACT_ACTIONS else "draw_single"
        expected_action_label = "招募 5 次" if action in RECRUIT_MULTI_PREVIEW_VISUAL_CONTRACT_ACTIONS else "招募 1 次"
        expected_repeat_label = "再招募 5 次" if action in RECRUIT_MULTI_PREVIEW_VISUAL_CONTRACT_ACTIONS else "再招募 1 次"
        failures.extend(_validate_hero_card_contract(
            page_summary,
            "draw_result",
            min_sample_count=expected_count,
            require_portrait_resolution=True,
            min_portrait_checked_count=1,
        ))
        failures.extend(_validate_hero_card_skill_visual_contract(page_summary))
        if page_summary.get("recruitViewMode") != "formal_pack_draw_result_display":
            failures.append("recruitViewMode!=formal_pack_draw_result_display")
        if page_summary.get("drawPreviewViewMode") != expected_view_mode:
            failures.append(f"drawPreviewViewMode!={expected_view_mode}")
        if page_summary.get("drawPreviewMode") != expected_draw_mode:
            failures.append(f"drawPreviewMode!={expected_draw_mode}")
        if page_summary.get("drawPreviewCardMode") != "draw_result":
            failures.append("drawPreviewCardMode!=draw_result")
        try:
            draw_preview_count = int(page_summary.get("drawPreviewVisibleCount", 0))
        except (TypeError, ValueError):
            draw_preview_count = 0
        if draw_preview_count != expected_count:
            failures.append(f"drawPreviewVisibleCount!={expected_count}")
        if page_summary.get("drawPreviewCardRailLayoutToken") != CARD_RAIL_LAYOUT_TOKEN:
            failures.append(f"drawPreviewCardRailLayoutToken!={CARD_RAIL_LAYOUT_TOKEN}")
        if page_summary.get("drawPreviewCardRailScrollMode") != CARD_RAIL_SCROLL_MODE:
            failures.append(f"drawPreviewCardRailScrollMode!={CARD_RAIL_SCROLL_MODE}")
        if page_summary.get("drawPreviewCardRailScrollbarVisibility") != "hidden":
            failures.append("drawPreviewCardRailScrollbarVisibility!=hidden")
        if page_summary.get("drawPreviewCardRailInputMode") != "touch_mouse_horizontal_drag":
            failures.append("drawPreviewCardRailInputMode!=touch_mouse_horizontal_drag")
        expected_preview_target = 4 if expected_count == 5 else 1
        expected_preview_viewport_width = (
            HERO_CARD_FULL_LAYOUT_WIDTH * expected_preview_target
            + HERO_CARD_FULL_LAYOUT_GAP * max(0, expected_preview_target - 1)
        )
        expected_preview_content_width = (
            HERO_CARD_FULL_LAYOUT_WIDTH * expected_count
            + HERO_CARD_FULL_LAYOUT_GAP * max(0, expected_count - 1)
        )
        if _as_int(page_summary.get("drawPreviewCardRailViewportWidth")) != expected_preview_viewport_width:
            failures.append(f"drawPreviewCardRailViewportWidth!={expected_preview_viewport_width}")
        if _as_int(page_summary.get("drawPreviewCardRailViewportHeight")) != CARD_RAIL_FULL_CARD_MIN_HEIGHT:
            failures.append(f"drawPreviewCardRailViewportHeight!={CARD_RAIL_FULL_CARD_MIN_HEIGHT}")
        if _as_int(page_summary.get("drawPreviewCardRailContentWidth")) != expected_preview_content_width:
            failures.append(f"drawPreviewCardRailContentWidth!={expected_preview_content_width}")
        if _as_int(page_summary.get("drawPreviewCardRailCardWidth")) != HERO_CARD_FULL_LAYOUT_WIDTH:
            failures.append(f"drawPreviewCardRailCardWidth!={HERO_CARD_FULL_LAYOUT_WIDTH}")
        if _as_int(page_summary.get("drawPreviewCardRailCardHeight")) != HERO_CARD_FULL_LAYOUT_HEIGHT:
            failures.append(f"drawPreviewCardRailCardHeight!={HERO_CARD_FULL_LAYOUT_HEIGHT}")
        if _as_int(page_summary.get("drawPreviewCardRailGap")) != HERO_CARD_FULL_LAYOUT_GAP:
            failures.append(f"drawPreviewCardRailGap!={HERO_CARD_FULL_LAYOUT_GAP}")
        if _as_int(page_summary.get("drawPreviewCardRailMinHeight")) != CARD_RAIL_FULL_CARD_MIN_HEIGHT:
            failures.append(f"drawPreviewCardRailMinHeight!={CARD_RAIL_FULL_CARD_MIN_HEIGHT}")
        if _as_int(page_summary.get("drawPreviewRepeatActionGap")) != CARD_RAIL_REPEAT_ACTION_GAP:
            failures.append(f"drawPreviewRepeatActionGap!={CARD_RAIL_REPEAT_ACTION_GAP}")
        if page_summary.get("drawPreviewRepeatActionSlotMode") != "card_rail_repeat_action_gap_spacer_v1":
            failures.append("drawPreviewRepeatActionSlotMode!=card_rail_repeat_action_gap_spacer_v1")
        if expected_count == 5:
            if _as_int(page_summary.get("drawPreviewInitialVisibleCardTarget")) != 4:
                failures.append("drawPreviewInitialVisibleCardTarget!=4")
            if page_summary.get("drawPreviewCommercialStageToken") != "recruit_multi_draw_result_four_card_first_view_v1":
                failures.append("drawPreviewCommercialStageToken!=recruit_multi_draw_result_four_card_first_view_v1")
        if page_summary.get("drawPreviewActionId") != expected_action_id:
            failures.append(f"drawPreviewActionId!={expected_action_id}")
        if page_summary.get("recruitDrawActionClickedActionId") != expected_action_id:
            failures.append(f"recruitDrawActionClickedActionId!={expected_action_id}")
        if page_summary.get("recruitDrawActionClickedLabel") != expected_action_label:
            failures.append(f"recruitDrawActionClickedLabel!={expected_action_label}")
        if page_summary.get("recruitDrawActionClickedButtonToken") != RECRUIT_FORMAL_PACK_ACTION_BUTTON_TOKEN:
            failures.append(f"recruitDrawActionClickedButtonToken!={RECRUIT_FORMAL_PACK_ACTION_BUTTON_TOKEN}")
        if page_summary.get("recruitDrawActionClickedBgToken") != RECRUIT_DRAW_COMMAND_BG_TOKEN:
            failures.append(f"recruitDrawActionClickedBgToken!={RECRUIT_DRAW_COMMAND_BG_TOKEN}")
        if page_summary.get("recruitDrawActionClickedLiveTextContract") != "recruit_draw_live_text_v1":
            failures.append("recruitDrawActionClickedLiveTextContract!=recruit_draw_live_text_v1")
        if not bool(page_summary.get("recruitDrawActionClickVerified", False)):
            failures.append("recruitDrawActionClickVerified!=true")
        if bool(page_summary.get("drawPreviewActionPanelVisible", True)):
            failures.append("drawPreviewActionPanelVisible!=false")
        if page_summary.get("drawPreviewRepeatActionLabel") != expected_repeat_label:
            failures.append(f"drawPreviewRepeatActionLabel!={expected_repeat_label}")
        if bool(page_summary.get("authorityTriggered", True)):
            failures.append("authorityTriggered!=false")
    return failures


def _run_action(args: argparse.Namespace, action: str) -> dict[str, Any]:
    command = [
        sys.executable,
        str(RUNNER),
        "--server-script",
        str(args.server_script),
        "--timeout-sec",
        str(args.timeout_sec),
        "--backend-timeout-sec",
        str(args.backend_timeout_sec),
        "--click-action",
        action,
    ]
    if action in AI_PLAYER_ACTION_ROW_CONTRACT_ACTIONS:
        command.extend(["--panel-id", "ai_hub"])
    if (
        action in AI_PLAYER_ACTION_ROW_CONTRACT_ACTIONS
        or action in RECRUIT_DRAW_RESULT_VISUAL_CONTRACT_ACTIONS
        or action in RECRUIT_SINGLE_PREVIEW_VISUAL_CONTRACT_ACTIONS
        or action in RECRUIT_MULTI_PREVIEW_VISUAL_CONTRACT_ACTIONS
        or action in BATTLE_REPORT_SEEDED_CLOSURE_ACTIONS
        or action in AI_LIVING_ACTIVITY_LAYER_ACTIONS
        or action in AI_ACTIVITY_STATUS_BADGE_ACTIONS
        or action == "world_tile_expedition_minimal_settlement_fixture"
        or action == "world_tile_action_hud_open_fixture"
        or action == "world_tile_action_hud_production_resource_fixture"
        or action == "world_tile_expedition_production_resource_settlement_fixture"
        or action == "world_tile_action_hud_resource_preview_policy_fixture"
        or action == "world_tile_resource_coverage_matrix_fixture"
        or action == "world_tile_action_hud_zero_level_substrate_fixture"
        or action == "world_click_priority_matrix_fixture"
        or action == "world_left_troop_rail_jump_to_unit_fixture"
        or action == "shell_open_chat_default_report_voice_playback"
    ):
        command.append("--isolated-backend-state")
    if str(args.backend_url).strip():
        command.extend(["--backend-url", str(args.backend_url).strip()])
    if action in AI_PLAYER_HOME_CITY_BIND_OPEN_CHAIN_ACTIONS or action in AI_PLAYER_HOME_CITY_SWITCH_OPEN_ACTIONS:
        command.append("--isolated-ai-home-city-binding")
    child_env = os.environ.copy()
    child_env["PYTHONIOENCODING"] = "utf-8"
    child_env["PYTHONUTF8"] = "1"
    if action == "shell_open_chat_default_report_voice_playback":
        child_env.setdefault("AI_PLAYER_VOICE_TTS_PROVIDER", "mock")
        child_env.setdefault("AI_PLAYER_COMBAT_DEFAULT_REPORT_VOICE_ALLOW_MOCK_AUDIO", "true")
    started = time.perf_counter()
    completed = subprocess.run(
        command,
        cwd=REPO_ROOT,
        text=True,
        encoding="utf-8",
        errors="replace",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=child_env,
    )
    duration_ms = round((time.perf_counter() - started) * 1000)
    payload = _json_from_stdout(completed.stdout)
    summary_payload = _load_visual_smoke_summary_payload(payload)
    godot_report = _load_godot_report_payload(payload)
    click_result = godot_report.get("clickActionResult", {}) if isinstance(godot_report.get("clickActionResult", {}), dict) else {}
    before_close_screenshot = (
        godot_report.get("beforeCloseScreenshot", {})
        if isinstance(godot_report.get("beforeCloseScreenshot", {}), dict)
        else {}
    )
    before_close_screenshot_stats = (
        payload.get("beforeCloseScreenshotStats", {})
        if isinstance(payload.get("beforeCloseScreenshotStats", {}), dict)
        else {}
    )
    screenshot_stats = _resolve_visual_smoke_screenshot_stats(payload, summary_payload)
    artifacts = payload.get("artifacts", {}) if isinstance(payload.get("artifacts", {}), dict) else {}
    page_summary, page_content_ok = _find_page_content_summary(click_result)
    visual_contract_failures = _validate_page_summary_contract(action, page_summary)
    visual_contract_failures.extend(_validate_action_result_contract(action, click_result))
    visual_contract_failures.extend(_validate_observability_permanently_disabled_contract(godot_report))
    if action in {"shell_open_chat_channel_keep_open", "shell_open_chat_channel_multi_ai_fixture", "shell_open_chat_ai_activity_continuity_fixture"}:
        visual_contract_failures.extend(_validate_chat_message_style_contract(click_result))
    if action in CHAT_AI_ACTIVITY_CONTINUITY_ACTIONS:
        visual_contract_failures.extend(_validate_chat_ai_activity_continuity_contract(click_result))
    if action in AI_ACTIVITY_SAME_TRACE_CROSS_SURFACE_ACTIONS:
        visual_contract_failures.extend(_validate_ai_activity_same_trace_cross_surface_contract(click_result))
    if action == "shell_open_chat_channel_multi_ai_fixture":
        visual_contract_failures.extend(_validate_chat_multi_ai_fixture_contract(click_result))
    if action == "shell_open_chat_receipt_detail_popup":
        visual_contract_failures.extend(_validate_chat_message_style_contract(click_result))
        visual_contract_failures.extend(_validate_chat_receipt_detail_click_contract(click_result))
    if action in {"shell_open_chat_channel_new_channel", "shell_open_chat_channel_new_channel_contacts"}:
        visual_contract_failures.extend(_validate_chat_channel_new_channel_contract(action, click_result))
    visual_contract_failures.extend(_validate_organization_back_route_contract(action, click_result))
    visual_contract_failures.extend(_validate_shell_nav_contract(action, click_result))
    visual_contract_failures.extend(_validate_visual_screenshot_stats(action, screenshot_stats))
    ok = (
        completed.returncode == 0
        and bool(payload.get("ok", False))
        and bool(godot_report.get("ok", False))
        and not visual_contract_failures
    )
    return {
        "action": action,
        "ok": ok,
        "returnCode": completed.returncode,
        "durationMs": duration_ms,
        "reason": click_result.get("reason", ""),
        "panelId": click_result.get("panelId", ""),
        "activePageIdBeforeClose": click_result.get("activePageIdBeforeClose", ""),
        "afterActivePageId": click_result.get("afterActivePageId", ""),
        "returnedToMap": bool(click_result.get("returnedToMap", False)),
        "pageContentOk": bool(page_content_ok) if page_content_ok is not None else None,
        "pageContentSummary": page_summary,
        "visualContractOk": not visual_contract_failures,
        "visualContractFailures": visual_contract_failures,
        "screenshotStats": screenshot_stats,
        "beforeCloseScreenshot": before_close_screenshot,
        "beforeCloseScreenshotStats": before_close_screenshot_stats,
        "artifacts": artifacts,
        "stderrTail": completed.stderr[-4000:],
        "error": payload if not ok else {},
    }


def _write_reports(report_path: Path, report: dict[str, Any]) -> None:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    stamped_path = report_path.with_name(
        f"{report_path.stem}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{report_path.suffix}"
    )
    stamped_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report["stampedReportPath"] = str(stamped_path)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    args = _parse_args()
    if args.list_profiles:
        print(json.dumps(PROFILES, ensure_ascii=False, indent=2))
        return 0
    actions = [str(action).strip() for action in args.action if str(action).strip()]
    explicit_actions = bool(actions)
    if not actions:
        actions = PROFILES[args.profile]
    effective_profile = args.profile
    if explicit_actions and actions == DEMO_STORY_LIVING_WORLD_MOBILE_LANDSCAPE_ACTIONS:
        effective_profile = DEMO_STORY_LIVING_WORLD_MOBILE_LANDSCAPE_PROFILE
    results: list[dict[str, Any]] = []
    for action in actions:
        result = _run_action(args, action)
        results.append(result)
        if not bool(result.get("ok", False)) and not args.continue_on_failure:
            break
    failed = [result for result in results if not bool(result.get("ok", False))]
    report = {
        "command": "run_mainline_ui_closure_batch",
        "profile": args.profile,
        "effectiveProfile": effective_profile,
        "demoStoryClosureProfile": (
            DEMO_STORY_LIVING_WORLD_MOBILE_LANDSCAPE_PROFILE
            if effective_profile == DEMO_STORY_LIVING_WORLD_MOBILE_LANDSCAPE_PROFILE
            else ""
        ),
        "demoStoryClosureActionCount": (
            len(DEMO_STORY_LIVING_WORLD_MOBILE_LANDSCAPE_ACTIONS)
            if effective_profile == DEMO_STORY_LIVING_WORLD_MOBILE_LANDSCAPE_PROFILE
            else 0
        ),
        "demoStoryClosureRequiredSurfaces": (
            ["shell_ai_entry", "ai_activity_card", "battle_report_detail", "main_city_troop_formation", "organization_policy", "tianxia_yutu"]
            if effective_profile == DEMO_STORY_LIVING_WORLD_MOBILE_LANDSCAPE_PROFILE
            else []
        ),
        "actions": actions,
        "ok": len(failed) == 0 and len(results) == len(actions),
        "resultCount": len(results),
        "failedActions": [str(result.get("action", "")) for result in failed],
        "results": results,
        "reportPath": str(args.report_path),
    }
    _write_reports(args.report_path, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if bool(report["ok"]) else 1


if __name__ == "__main__":
    raise SystemExit(main())
