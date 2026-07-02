#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import urllib.parse
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_BACKEND_URL = os.getenv("SLG_BACKEND_URL", "http://127.0.0.1:8787").rstrip("/")
DEFAULT_PROJECT_PATH = REPO_ROOT / "godot-client"
DEFAULT_SCENE = "res://scenes/app/main.tscn"
DEFAULT_PANEL_ID = "world_event"
DEFAULT_DISPLAY_MODE = "world"
SCREENSHOT_VISIBILITY_GATE_CONTRACT = "screenshot_visibility_gate_v1"
DEMO_STORY_MOBILE_LANDSCAPE_ACTION = "ai_activity_same_trace_cross_surface_fixture"
DEMO_STORY_MOBILE_LANDSCAPE_WIDTH = 960
DEMO_STORY_MOBILE_LANDSCAPE_HEIGHT = 540
WORLD_MAP_VIDEO_STYLE_TRANSITION_EXPECTED_FRAME_MANIFEST = (
    {
        "stage": "target_list",
        "fileName": "01_target_list.png",
        "expectedContent": "target list or selected target trigger is visible before the map jump begins",
        "requiredSummaryFields": ["worldMapFocusMotionToken", "worldMapFocusTransitionMode"],
        "rejectIf": ["target trigger missing", "engineering copy visible", "map context already lost"],
        "manualReviewFocus": "The player can see what target/state is being entered before the camera moves.",
    },
    {
        "stage": "pre_jump_pulse",
        "fileName": "02_pre_jump_pulse.png",
        "expectedContent": "target attention pulse or equivalent pre-jump cue appears at the chosen state/city",
        "requiredSummaryFields": ["worldMapFocusTargetPulse"],
        "rejectIf": ["target pulse missing", "pulse hides a real button or Chinese copy"],
        "manualReviewFocus": "The jump has a visible target cue instead of a bare teleport.",
    },
    {
        "stage": "jump_or_fast_zoom",
        "fileName": "03_jump_or_fast_zoom.png",
        "expectedContent": "camera performs explicit jump or fast zoom toward the target region",
        "requiredSummaryFields": ["worldMapFocusTransitionMode", "worldMapFocusJumpDeltaCells"],
        "rejectIf": ["transition mode missing", "jump delta missing", "player cannot infer destination"],
        "manualReviewFocus": "The jump may be discontinuous, but direction and destination remain understandable.",
    },
    {
        "stage": "arrival_settle",
        "fileName": "04_arrival_settle.png",
        "expectedContent": "camera settles on the destination after the jump or fast zoom",
        "requiredSummaryFields": ["worldMapFocusCameraSettle"],
        "rejectIf": ["camera settle false", "destination still sliding without readable context"],
        "manualReviewFocus": "The destination holds long enough for the player to read the new map area.",
    },
    {
        "stage": "state_detail_zoom",
        "fileName": "05_state_detail_zoom.png",
        "expectedContent": "state/detail zoom level is visible after arrival",
        "requiredSummaryFields": ["worldMapFocusCameraSettle", "focusContextPreserved"],
        "rejectIf": ["state/detail layer missing", "focus context not preserved"],
        "manualReviewFocus": "The view changes from broad target to a readable local/state detail level.",
    },
    {
        "stage": "road_reveal",
        "fileName": "06_road_reveal.png",
        "expectedContent": "city roads, gates, or road nodes are revealed in the focused area",
        "requiredSummaryFields": ["cityRoadRevealVisible", "roadRevealLevel", "visibleRoadNodeCount"],
        "rejectIf": ["cityRoadRevealVisible false", "visibleRoadNodeCount invalid", "roads pop in as clutter"],
        "manualReviewFocus": "Road/city/node reveal is legible and does not bury controls or short Chinese copy.",
    },
    {
        "stage": "march_preview",
        "fileName": "07_march_preview.png",
        "expectedContent": "march path or unit movement preview is visible without breaking focus context",
        "requiredSummaryFields": ["focusContextPreserved", "lowEndMotionBudgetOk"],
        "rejectIf": ["march preview absent", "path effects cover actionable map controls"],
        "manualReviewFocus": "The player can follow the intended march route from the focused map state.",
    },
    {
        "stage": "combat_outbreak",
        "fileName": "08_combat_outbreak.png",
        "expectedContent": "combat outbreak/intercept motion appears from a real runtime motion source",
        "requiredSummaryFields": ["combatOutbreakMotion", "combatOutbreakMotionSource", "combatOutbreakMotionPending", "combatOutbreakMotionPendingReason"],
        "rejectIf": ["combatOutbreakMotion false", "combatOutbreakMotionPending true", "source-plan-only evidence"],
        "manualReviewFocus": "Look for the contact/outbreak feedback, not just a static unit or report field.",
    },
    {
        "stage": "report_focus",
        "fileName": "09_report_focus.png",
        "expectedContent": "battle/report focus is visible after combat without losing the map chain",
        "requiredSummaryFields": ["combatOutbreakMotionSource", "focusContextPreserved"],
        "rejectIf": ["report focus absent", "report panel obscures required return path", "map context lost"],
        "manualReviewFocus": "Confirm the report focus is a readable continuation of combat, not a detached debug panel.",
    },
    {
        "stage": "reward_settle",
        "fileName": "10_reward_settle.png",
        "expectedContent": "reward settle feedback is visible from a real reward claim/settlement source",
        "requiredSummaryFields": ["rewardSettleMotion", "rewardSettleMotionSource", "rewardSettleMotionPending", "rewardSettleMotionPendingReason"],
        "rejectIf": ["rewardSettleMotion false", "rewardSettleMotionPending true", "source-plan-only evidence"],
        "manualReviewFocus": "Confirm the reward feedback settles without hiding the next real action or return affordance.",
    },
    {
        "stage": "return_mainline",
        "fileName": "11_return_mainline.png",
        "expectedContent": "return to mainline map is visible and camera settles from a real return/focus source",
        "requiredSummaryFields": ["returnMainlineCameraSettle", "returnMainlineCameraSettleSource", "returnMainlineCameraSettlePending", "returnMainlineCameraSettlePendingReason"],
        "rejectIf": ["returnMainlineCameraSettle false", "returnMainlineCameraSettlePending true", "source-plan-only evidence"],
        "manualReviewFocus": "Confirm the chain returns to playable map context with camera stable and controls intact.",
    },
)
WORLD_MAP_VIDEO_STYLE_TRANSITION_STAGE_FRAMES = tuple(
    (str(entry["stage"]), str(entry["fileName"])) for entry in WORLD_MAP_VIDEO_STYLE_TRANSITION_EXPECTED_FRAME_MANIFEST
)
WORLD_MAP_VIDEO_STYLE_TRANSITION_MIN_SEQUENCE_CAPTURE_COUNT = len(WORLD_MAP_VIDEO_STYLE_TRANSITION_STAGE_FRAMES)
MOUNTAIN_BOUNDARY_RUNTIME_CONTRACT_V0_47_PATH = (
    REPO_ROOT
    / "experiments"
    / "east_asia_map_pipeline"
    / "generated"
    / "mountain_barrier_main_world_runtime_contract_v0_47"
    / "mountain_barrier_main_world_runtime_contract_v0_47.json"
)
EAST_HAN_ACCEPTED_AUTHORING_SEED_V0_1_PATH = (
    REPO_ROOT
    / "experiments"
    / "east_asia_map_pipeline"
    / "generated"
    / "east_han_accepted_authoring_seed_v0_1"
    / "east_han_accepted_authoring_seed_v0_1.json"
)
PANEL_ID_ALIASES = {
    "ai": "ai_hub",
    "world": "world_event",
    "world-event": "world_event",
    "world-affairs": "world_affairs",
    "battle-report": "battle_report",
    "battle_report": "battle_report",
    "task": "tasks",
    "faction": "faction_status",
    "status": "faction_status",
}


def _configure_stdio_utf8() -> None:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8", errors="replace")


TIANXIA_RECOMMENDED_SIX_STATE_IDS = (
    "bingzhou",
    "jiaozhou",
    "jingzhou",
    "南洋港",
    "东羌高原",
    "倭人诸国·九州",
)
STATE_CASE_SETS = {
    "tianxia_recommended_six": TIANXIA_RECOMMENDED_SIX_STATE_IDS,
}
STATE_CASE_SET_METADATA = {
    "tianxia_recommended_six": {
        "stateCaseSetScope": "six_state_recommended_screenshot",
        "recommendedStateCaseCount": len(TIANXIA_RECOMMENDED_SIX_STATE_IDS),
        "notAllStateCoverage": True,
        "allStateVisualProof": False,
        "requiresSeparate57StateVisualProof": True,
    },
}
STATE_CASE_SET_CHOICES = ("", *tuple(sorted(STATE_CASE_SETS.keys())))


def _resolve_tianxia_state_ids_arg(state_ids_arg: str, state_case_set: str) -> str:
    explicit_state_ids = state_ids_arg.strip()
    if explicit_state_ids:
        return explicit_state_ids
    case_set = state_case_set.strip()
    if not case_set:
        return ""
    return ",".join(STATE_CASE_SETS.get(case_set, ()))


def _tianxia_state_case_set_summary(state_ids_arg: str, state_case_set: str) -> dict[str, Any]:
    explicit_state_ids = state_ids_arg.strip()
    case_set = state_case_set.strip()
    resolved_state_ids = _resolve_tianxia_state_ids_arg(state_ids_arg, state_case_set)
    resolved_state_id_count = len([part for part in resolved_state_ids.split(",") if part.strip()])
    if explicit_state_ids:
        return {
            "stateCaseSet": "",
            "stateCaseSetSource": "explicit_state_ids",
            "stateCaseSetScope": "explicit_state_ids",
            "recommendedStateCaseCount": 0,
            "resolvedStateIdCount": resolved_state_id_count,
            "notAllStateCoverage": resolved_state_id_count != 57,
            "allStateVisualProof": False,
            "requiresSeparate57StateVisualProof": resolved_state_id_count != 57,
        }
    metadata = dict(STATE_CASE_SET_METADATA.get(case_set, {}))
    if metadata:
        metadata["stateCaseSet"] = case_set
        metadata["stateCaseSetSource"] = "state_case_set"
        metadata["resolvedStateIdCount"] = resolved_state_id_count
        return metadata
    return {
        "stateCaseSet": case_set,
        "stateCaseSetSource": "none",
        "stateCaseSetScope": "",
        "recommendedStateCaseCount": 0,
        "resolvedStateIdCount": resolved_state_id_count,
        "notAllStateCoverage": False,
        "allStateVisualProof": False,
        "requiresSeparate57StateVisualProof": False,
    }


CLICK_ACTION_CHOICES = (
    "none",
    "ai_panel_open_chat_channel",
    "ai_panel_chat_metadata_contract",
    "ai_panel_autonomy_guard_contract",
    "ai_panel_list_card_contract",
    "ai_panel_secondary_pages_copy_contract",
    "ai_panel_receipt_detail_visual_contract",
    "ai_panel_receipt_failure_detail_contract",
    "ai_panel_receipt_history_pagination_contract",
    "ai_panel_context_document_open",
    "ai_panel_context_document_cancel_action",
    "ai_panel_context_document_save_action",
    "ai_panel_display_name_cancel_action",
    "ai_panel_display_name_save_action",
    "ai_panel_avatar_select_close_action",
    "ai_panel_avatar_select_option_action",
    "ai_panel_pending_proposals_review_guard",
    "ai_panel_home_city_bind_open_chain",
    "ai_panel_home_city_bind_open_chain_isolated",
    "ai_panel_home_city_coordinate_jump",
    "ai_panel_voice_settings_contract",
    "ai_panel_voice_settings_save_selected",
    "ai_panel_voice_settings_refresh_action",
    "ai_panel_voice_settings_save_action",
    "ai_panel_execution_trace_fixture",
    "ai_hub_proposal_approve_result_smoke",
    "ai_hub_proposal_reject_result_smoke",
    "player_history_ai_proposal_denied_panel_open",
    "player_history_ai_proposal_denied_visible_receipt",
    "player_history_ai_proposal_apply_panel_open",
    "ai_hub_proposal_approve_result_smoke",
    "ai_hub_proposal_reject_result_smoke",
    "player_history_ai_execution_receipt_panel_open",
    "player_history_ai_tile_abandon_receipt_visible",
    "shell_open_chat_channel",
    "shell_open_chat_channel_keep_open",
    "shell_open_chat_voice_playback",
    "shell_open_chat_default_report_voice_playback",
    "shell_open_chat_default_report_voice_unavailable",
    "shell_open_chat_war_room_report_fixture",
    "shell_open_chat_ai_activity_continuity_fixture",
    "shell_chat_natural_language_proposal_approve",
    "shell_chat_natural_language_proposal_reject",
    "shell_chat_unified_inbox_claim_reward_settlement",
    "ai_activity_same_trace_cross_surface_fixture",
    "shell_open_chat_channel_multi_ai_fixture",
    "shell_open_chat_channel_new_channel",
    "shell_open_chat_channel_new_channel_contacts",
    "shell_open_chat_receipt_detail_popup",
    "shell_open_ai_panel_keep_open",
    "world_open_main_city_hub",
    "world_open_main_city_hub_jump_coordinate",
    "world_open_alliance_member_coordinate_jump",
    "world_ai_switch_open_home_city",
    "world_ai_living_activity_layer_fixture",
    "world_shell_ai_activity_badge_fixture",
    "world_movement_geography_feedback_fixture",
    "world_sea_route_status_fixture",
    "world_sea_patrol_report_fixture",
    "world_sea_patrol_intercept_report_fixture",
    "world_naval_runtime_minimal_chain_fixture",
    "world_naval_combat_minimal_settlement_fixture",
    "world_naval_combat_battle_report_detail_fixture",
    "world_naval_fleet_damage_repair_fixture",
    "world_naval_shipyard_build_warship_fixture",
    "world_naval_harbor_inventory_open_fixture",
    "world_naval_harbor_deployment_readiness_fixture",
    "world_naval_inventory_fleet_patrol_reuse_fixture",
    "world_naval_inventory_fleet_combat_damage_repair_fixture",
    "world_tile_action_hud_open_fixture",
    "world_tile_expedition_minimal_settlement_fixture",
    "world_tile_action_hud_production_resource_fixture",
    "world_tile_expedition_production_resource_settlement_fixture",
    "first_hour_land_loop_integrated_click_to_task_readback_gate",
    "first_hour_land_loop_task_claim_prompt_gate",
    "world_mainworld_camera_pan_resource_roundtrip_fixture",
    "world_tile_action_hud_resource_preview_policy_fixture",
    "world_tile_resource_coverage_matrix_fixture",
    "world_tile_action_hud_zero_level_substrate_fixture",
    "world_click_priority_matrix_fixture",
    "world_sea_overseas_naval_frame_preview",
    "world_ai_activity_card_from_badge_fixture",
    "world_ai_activity_card_from_marker_fixture",
    "world_bottom_nav_component_contract",
    "world_left_troop_rail_component_contract",
    "world_left_troop_rail_jump_to_unit_fixture",
    "world_shell_visual_unified_contract",
    "world_toggle_main_nav_collapse_expand",
    "world_toggle_tianxia_yutu_roundtrip",
    "world_tianxia_yutu_explicit_jump_luoyang",
    "world_tianxia_yutu_explicit_jump_gate",
    "world_tianxia_yutu_mode_isolation",
    "world_tianxia_yutu_select_coordinate",
    "world_tianxia_yutu_overlay_interaction",
    "world_tianxia_yutu_state_region_drilldown_jump",
    "world_tianxia_yutu_all_state_drilldown_coverage",
    "world_tianxia_yutu_panel_highlight_visual_qa",
    "world_tianxia_yutu_dense_label_priority_qa",
    "world_tianxia_yutu_label_art_polish_qa",
    "world_tianxia_yutu_product_readability_qa",
    "world_tianxia_yutu_product_acceptance_qa",
    "world_tianxia_yutu_state_detail_zoom_qa",
    "world_tianxia_yutu_all_state_detail_zoom_coverage",
    "world_map_video_style_transition_chain_fixture",
    "world_tianxia_yutu_compact_target_panel_qa",
    "world_tianxia_yutu_admin_focus_mask_hard_gate_fault",
    "world_tianxia_yutu_panel_collapse",
    "world_tianxia_yutu_navigation_matrix_qa",
    "world_tianxia_yutu_nation_profile_entry",
    "world_click_main_city_node",
    "world_click_main_city_asset_enter_hub",
    "world_click_main_city_asset_enter_hub_troop_entry",
    "world_click_main_city_asset_enter_hub_building_tree_entry",
    "world_click_main_city_asset_enter_hub_return_map",
    "world_main_map_claim_release_cell",
    "world_main_map_immunity_reject_cell",
    "world_main_map_frontline_marker_tool",
    "world_click_main_city_node_city_context",
    "world_click_main_city_node_context_return_map_button_identity",
    "world_click_main_city_node_troop_assign_preview",
    "world_click_main_city_node_troop_assign_preview_open_first_team",
    "world_click_main_city_node_troop_assign_preview_open_first_team_button_identity",
    "world_click_main_city_node_troop_assign_preview_open_second_team_button_identity",
    "world_click_main_city_node_troop_assign_preview_open_ai_fallback_team",
    "world_click_main_city_node_troop_assign_preview_open_ai_fallback_team_context_focus",
    "world_click_main_city_node_troop_assign_preview_open_ai_fallback_team_locked_config",
    "world_click_main_city_node_troop_assign_preview_open_ai_named_team",
    "world_click_main_city_node_troop_assign_preview_open_ai_multi_team_second",
    "world_click_main_city_node_troop_assign_preview_open_ai_multi_team_second_context_chat",
    "world_click_main_city_node_troop_assign_preview_multi_team_rail_stress",
    "world_click_main_city_node_troop_assign_preview_invalid_portrait_fallback",
    "world_click_main_city_node_troop_assign_preview_empty_slots",
    "world_click_main_city_node_troop_assign_preview_open_first_team_recruit_mode",
    "world_click_main_city_node_troop_assign_preview_open_first_team_recruit_mode_button_identity",
    "world_click_main_city_node_troop_assign_preview_open_first_team_config_mode_button_identity",
    "world_click_main_city_node_troop_assign_preview_open_first_team_back_button_identity",
    "world_click_main_city_node_troop_submit_player_formation",
    "world_click_main_city_node_troop_configure_then_clear_slot",
    "world_click_main_city_node_troop_submit_march_map_unit",
    "world_click_main_city_node_troop_blocked_screenshot_fixture",
    "world_click_main_city_node_troop_intercepted_screenshot_fixture",
    "world_click_main_city_node_troop_retreating_screenshot_fixture",
    "world_click_main_city_node_facility_building_tree",
    "world_click_main_city_node_facility_building_tree_select_node",
    "world_click_main_city_node_facility_building_tree_submit_upgrade",
    "world_click_main_city_node_facility_building_tree_scroll_lower",
    "world_click_main_city_node_interior",
    "world_click_main_city_node_interior_close",
    "world_click_main_city_node_building_upgrade",
    "world_click_main_city_node_troop",
    "world_click_main_city_node_troop_close",
    "world_open_main_city_recruit",
    "world_open_main_city_recruit_close",
    "world_open_main_city_recruit_single",
    "world_open_main_city_recruit_single_close",
    "world_open_main_city_recruit_multi",
    "world_open_main_city_recruit_multi_close",
    "world_open_main_city_recruit_result",
    "world_open_main_city_recruit_result_close",
    "world_open_main_city_generals_close",
    "world_open_main_city_generals_profile_close",
    "world_open_main_city_alliance_close",
    "world_open_main_city_organization_alliance_fixture_close",
    "world_open_main_city_organization_eligible_fixture_close",
    "world_open_main_city_organization_nation_fixture_close",
    "world_open_main_city_organization_alliance_home",
    "world_open_main_city_organization_nation_home",
    "world_open_main_city_organization_home_entry_nation_midgame",
    "world_open_main_city_organization_home_entry_members",
    "world_open_main_city_organization_home_entry_corps",
    "world_open_main_city_organization_members",
    "world_open_main_city_organization_corps",
    "world_open_main_city_organization_officers",
    "world_open_main_city_organization_nation_officers",
    "world_open_main_city_organization_policy",
    "world_open_main_city_organization_founding_prekingdom",
    "world_open_main_city_organization_founding_submit_failure",
    "world_open_main_city_organization_nation_governance_hints",
    "world_open_main_city_organization_nation_empire_submit",
    "world_open_main_city_organization_nation_empire_submit_success",
    "world_open_main_city_organization_nation_midgame_frontend",
    "world_open_main_city_organization_nation_midgame_route_luoyang",
    "world_open_main_city_organization_nation_midgame_luoyang_route",
    "world_open_main_city_organization_nation_midgame_luoyang_feedback",
    "world_open_main_city_organization_nation_midgame_luoyang_authority_claim",
    "world_open_main_city_organization_nation_midgame_luoyang_battle_report_feedback",
    "world_open_main_city_organization_nation_midgame_luoyang_control_authority",
    "world_open_main_city_organization_nation_midgame_luoyang_prefecture_control_judgment",
    "world_open_main_city_organization_nation_midgame_realm_objective_bridge",
    "world_open_main_world_current_goals_nation_midgame_entry",
    "world_open_main_city_organization_nation_capital_migrate_submit",
    "world_open_main_city_organization_diplomacy",
    "world_open_main_city_organization_market",
    "world_open_main_city_organization_buildings",
    "world_open_main_city_organization_logs",
    "world_open_main_city_organization_reports",
    "world_open_main_city_organization_report_detail",
    "world_open_main_city_organization_report_detail_jump_coordinate",
    "world_open_main_city_organization_nation_reports",
    "world_open_main_city_organization_nation_report_detail",
    "world_open_main_city_organization_reports_back",
    "world_open_main_city_organization_report_detail_back",
    "world_open_main_city_activity_close",
    "world_open_main_city_world_affairs_close",
    "world_open_main_city_tasks_close",
    "world_open_main_city_tasks_nation_midgame_entry",
    "world_open_main_city_faction_status_close",
    "world_open_main_city_mail_close",
    "world_open_main_city_mail_close_button_identity",
    "world_open_main_city_mail_select_reward",
    "world_open_main_city_mail_live_inbox_proof",
    "world_open_main_city_mail_select_reward_button_identity",
    "world_open_main_city_mail_select_event_reward_button_identity",
    "world_open_main_city_mail_select_system_notice_button_identity",
    "world_open_main_city_mail_organization_tab_button_identity",
    "world_open_main_city_mail_system_tab_button_identity",
    "world_open_main_city_mail_select_org_order_button_identity",
    "world_open_main_city_mail_select_org_policy_button_identity",
    "world_open_main_city_battle_report_close",
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
    "world_open_main_city_building_upgrade",
    "world_open_main_city_troop",
    "generals_roster_open_hero_profile",
    "world_open_main_city_skill_library",
    "world_open_main_city_skill_library_search",
    "world_open_main_city_skill_library_clear_search",
    "world_open_main_city_skill_library_flip_card",
    "world_open_main_city_skill_library_type_chase",
    "world_open_main_city_skill_library_type_active",
    "world_open_main_city_skill_library_type_passive",
    "world_open_main_city_skill_library_type_command",
    "world_open_main_city_skill_library_close",
    "world_open_main_city_generals_tactics",
    "world_open_main_city_generals_tactics_close",
    "world_open_main_city_generals_library",
    "world_open_main_city_generals_library_close",
    "world_open_main_city_generals_growth",
    "world_open_main_city_generals_growth_close",
    "world_open_main_city_generals_growth_next_troop",
    "world_open_main_city_generals_profile_reset_action",
    "world_open_main_city_generals_profile_guide_action",
    "world_open_main_city_generals_profile_share_action",
    "world_open_main_city_generals_profile_inherit_action",
    "world_open_main_city_generals_profile_back_close",
    "world_open_main_city_generals_profile_skill_detail_close",
    "generals_roster_hero_next",
    "generals_roster_hero_prev",
    "battle_report_seeded_open_list",
    "battle_report_seeded_open_detail",
    "battle_report_open_detail",
    "battle_report_open_stats",
    "battle_report_open_stats_scroll",
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
    "battle_report_detail_replay_screen_open",
    "battle_report_list_density",
    "battle_report_backend_natural_language_fixture",
    "battle_report_backend_daily_summary_fixture",
    "ai_panel_backend_daily_summary_fixture",
    "alliance_backend_campaign_summary_fixture",
    "alliance_backend_enemy_dossier_battle_reports_fixture",
    "alliance_backend_enemy_dossier_detail_fixture",
    "world_affairs_backend_campaign_summary_fixture",
    "player_history_panel_open",
    "player_history_shared_motion_packet_open",
    "player_history_ai_proposal_denied_visible_receipt",
    "player_history_ai_proposal_apply_panel_open",
    "player_history_ai_execution_receipt_panel_open",
    "player_history_ai_tile_abandon_receipt_visible",
    "player_history_court_recovery_civil_memory",
    "player_history_seeded_replay_panel_open",
    "player_history_seeded_save_restore_panel_open",
    "world_affairs_claim_reward",
)

MAIN_CITY_TROOP_FORMATION_TROOP_TYPE_CHIP_ACTIONS = {
    "world_click_main_city_node_troop_assign_preview_open_first_team",
    "world_click_main_city_node_troop_assign_preview_open_first_team_button_identity",
    "world_click_main_city_node_troop_assign_preview_open_second_team_button_identity",
    "world_click_main_city_node_troop_assign_preview_open_ai_fallback_team",
    "world_click_main_city_node_troop_assign_preview_open_ai_named_team",
    "world_click_main_city_node_troop_assign_preview_open_ai_multi_team_second",
}

RECRUIT_DRAW_CLICK_ACTIONS = {
    "world_open_main_city_recruit_single",
    "world_open_main_city_recruit_single_close",
    "world_open_main_city_recruit_multi",
    "world_open_main_city_recruit_multi_close",
}

BATTLE_REPORT_SEEDED_CLOSURE_ACTIONS = {
    "world_open_main_city_battle_report_close",
    "battle_report_seeded_open_list",
    "battle_report_seeded_open_detail",
    "battle_report_list_density",
    "battle_report_detail_share_button_identity",
    "battle_report_detail_favorite_button_identity",
    "battle_report_detail_replay_button_identity",
    "battle_report_detail_replay_screen_open",
}

PLAYER_HISTORY_REPLAY_SEEDED_ACTIONS = {
    "player_history_seeded_replay_panel_open",
}

PLAYER_HISTORY_SAVE_RESTORE_SEEDED_ACTIONS = {
    "player_history_seeded_save_restore_panel_open",
}

PLAYER_HISTORY_AI_PROPOSAL_DENIED_SEEDED_ACTIONS = {
    "player_history_ai_proposal_denied_panel_open",
    "player_history_ai_proposal_denied_visible_receipt",
}

PLAYER_HISTORY_AI_PROPOSAL_APPLY_SEEDED_ACTIONS = {
    "player_history_ai_proposal_apply_panel_open",
    "ai_hub_proposal_approve_result_smoke",
    "ai_hub_proposal_reject_result_smoke",
    "shell_chat_natural_language_proposal_approve",
    "shell_chat_natural_language_proposal_reject",
}

PLAYER_HISTORY_AI_EXECUTION_RECEIPT_SEEDED_ACTIONS = {
    "player_history_ai_execution_receipt_panel_open",
    "player_history_ai_tile_abandon_receipt_visible",
}

# Main-city map-node actions are fixed regression IDs.
# Required report fields:
# - world_click_main_city_node:
#   clickActionResult.mapNodeClickContext and
#   clickActionResult.mainCityHub.lastMapNodeClick must be present.
# - world_click_main_city_node_troop_assign_preview:
#   templateOnly must be true and authorityTriggered must be false.
# - world_click_main_city_node_facility_building_tree:
#   pageContentSummary.facilityTreeMode must be standalone, with no legacy
#   facility composition panel in the rendered page.
MAIN_CITY_CLICK_ACTION_DEFAULTS = {
    "ai_panel_chat_metadata_contract": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_autonomy_guard_contract": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_list_card_contract": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_secondary_pages_copy_contract": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_receipt_detail_visual_contract": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_receipt_failure_detail_contract": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_receipt_history_pagination_contract": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_context_document_open": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_context_document_cancel_action": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_context_document_save_action": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_display_name_cancel_action": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_display_name_save_action": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_avatar_select_close_action": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_avatar_select_option_action": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_pending_proposals_review_guard": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_home_city_bind_open_chain": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_home_city_bind_open_chain_isolated": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_home_city_coordinate_jump": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_voice_settings_contract": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_voice_settings_save_selected": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_voice_settings_refresh_action": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_panel_voice_settings_save_action": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "shell_open_chat_channel_keep_open": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "world_event",
        "panel_required": False,
        "expected_summary_values": {
            "worldTileProductionResourceScope": "ordinary_l1_l9_resource_tile_not_fixture_seed_only",
        },
        "required_summary_fields": [
            "chatPlayerUiGovernanceContractId",
            "chatPlayerUiGovernanceVerified",
            "chatForbiddenVisibleCopyClear",
            "chatVisibleDensityOk",
        ],
    },
    "shell_open_chat_voice_playback": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "world_event",
        "panel_required": False,
    },
    "shell_open_chat_default_report_voice_playback": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "world_event",
        "panel_required": False,
    },
    "shell_open_chat_default_report_voice_unavailable": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "world_event",
        "panel_required": False,
    },
    "shell_open_chat_war_room_report_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "world_event",
        "panel_required": False,
    },
    "shell_open_chat_ai_activity_continuity_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "world_event",
        "panel_required": False,
        "expected_summary_values": {
            "worldTileProductionResourceScope": "ordinary_l1_l9_resource_tile_not_fixture_seed_only",
        },
        "required_summary_fields": [
            "chatAiActivityContinuityToken",
            "chatAiActivityContinuityVisible",
            "chatAiActivityUsesExecutionTrace",
            "chatAiActivityFallbackUsed",
            "chatAiActivityTraceCount",
            "chatAiActivityGovernedProposalVisible",
            "chatAiActivityStripCount",
            "chatAiActivityStatusDotCount",
            "chatAiActivityTaskLabelCount",
            "chatAiActivityCurrentTaskText",
            "chatAiActivitySource",
            "chatAiActivityForbiddenCopyOk",
        ],
    },
    "shell_chat_natural_language_proposal_approve": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "world_event",
        "panel_required": False,
        "required_summary_fields": [
            "chatNaturalLanguageProposalDecisionContract",
            "chatNaturalLanguageProposalDecisionAccepted",
            "chatNaturalLanguageProposalDecisionKind",
            "chatNaturalLanguageProposalDecisionStatus",
            "chatNaturalLanguageProposalDecisionRemoteStatus",
            "chatNaturalLanguageProposalDecisionSource",
            "chatNaturalLanguageProposalDecisionForbiddenCopyClear",
        ],
    },
    "shell_chat_natural_language_proposal_reject": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "world_event",
        "panel_required": False,
        "required_summary_fields": [
            "chatNaturalLanguageProposalDecisionContract",
            "chatNaturalLanguageProposalDecisionAccepted",
            "chatNaturalLanguageProposalDecisionKind",
            "chatNaturalLanguageProposalDecisionStatus",
            "chatNaturalLanguageProposalDecisionRemoteStatus",
            "chatNaturalLanguageProposalDecisionSource",
            "chatNaturalLanguageProposalDecisionForbiddenCopyClear",
        ],
    },
    "shell_chat_unified_inbox_claim_reward_settlement": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "world_event",
        "panel_required": False,
        "required_summary_fields": [
            "inboxClaimButtonPressed",
            "inboxClaimButtonName",
            "inboxClaimButtonToken",
            "inboxClaimRoute",
            "inboxClaimKind",
            "inboxClaimWorldAction",
            "inboxClaimReceiptOk",
            "inboxClaimPostReadbackOk",
            "inboxClaimTargetRemoved",
            "visibleCopyForbiddenHits",
            "playerVisibleEngineeringCopyLeak",
            "styleOwner",
        ],
    },
    "ai_activity_same_trace_cross_surface_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "world_event",
        "panel_required": False,
        "expected_summary_values": {
            "worldTileZeroLevelSubstrateScope": "zero_level_substrate_not_l10_missing_tile",
        },
        "required_summary_fields": [
            "aiActivitySameTraceCrossSurfaceToken",
            "aiActivitySameTraceCrossSurfaceOk",
            "aiActivitySameTraceId",
            "aiActivitySameTraceAiPanelTraceId",
            "aiActivitySameTraceMainWorldTraceId",
            "aiActivitySameTraceBattleReportTraceId",
            "aiActivitySameTraceTianxiaTraceId",
            "aiActivitySameTraceChatTraceId",
            "aiActivitySameTraceGovernedProposalVisible",
            "currentGoalsTraceSummary",
            "aiActivityIdentityChipToken",
            "aiActivityIdentityChipCrossSurfaceOk",
            "aiActivityIdentityChipSurfaceCount",
            "aiActivityIdentityChipAiPanelVisibleCount",
            "aiActivityIdentityChipBattleReportVisibleCount",
            "aiActivityIdentityChipChatVisibleCount",
            "aiActivityMarkerFamilyContract",
            "aiActivityMarkerFamilyCrossSurfaceOk",
            "aiActivityMarkerFamilyMainWorldFrameAssetDrawCount",
            "aiActivityMarkerFamilyTianxiaHotspotAssetDrawCount",
        ],
    },
    "shell_open_chat_channel_multi_ai_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "world_event",
        "panel_required": False,
    },
    "shell_open_chat_channel_new_channel": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "world_event",
        "panel_required": False,
    },
    "shell_open_chat_receipt_detail_popup": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "world_event",
        "panel_required": False,
    },
    "shell_open_ai_panel_keep_open": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "world_event",
        "panel_required": False,
    },
    "world_open_main_city_hub": {
        "display_mode": "world",
        "world_action": "open_hub",
        "required_summary_fields": [
            "mainCityHubCardChromeToken",
            "mainCityHubCardChromeMode",
            "mainCityHubCardChromeSharedFactory",
            "mainCityHubCardChromeNodeCount",
            "mainCityHubCardChromeRadius",
            "mainCityHubPlayerUiGovernanceContractId",
            "mainCityHubPlayerUiGovernanceVerified",
            "mainCityHubForbiddenVisibleCopyClear",
            "mainCityHubVisibleDensityOk",
            "mainCityHubMobileViewport",
            "mainCityHubMobileOverlapFree",
            "mainCityHubMobileOverlapHitCount",
            "mainCityHubMobileOverlapPairs",
            "mainCityHubMobileOverlapCheckCount",
            "mainCitySpatialEntryMotionContractId",
            "mainCitySpatialEntryMotionProofLevel",
            "mainCitySpatialEntryMotionStates",
            "mainCitySpatialEntryNoDirectPopup",
            "mainCitySpatialEntryRealButtonActionIds",
            "mainCitySpatialEntryPlayerLabels",
            "mainCityReducedMotionSkipContractId",
            "mainCityReducedMotionSkipButtonToken",
            "mainCityReducedMotionSkipActionId",
            "mainCityReducedMotionSkipPlayerLabel",
            "mainCityReducedMotionSkipButtonVisible",
            "mainCityReducedMotionSkipButtonNodeName",
            "mainCityReducedMotionEnabled",
            "mainCityReducedMotionSkipsTransitionMask",
            "mainCityReducedMotionSkipsStageTween",
            "mainCitySlgCameraTrueClosureContractId",
            "mainCitySlgCameraRailToken",
            "mainCitySlgCameraDepthLayerToken",
            "mainCitySlgCameraStates",
            "mainCitySlgCameraProofLevel",
            "mainCitySlgCameraMovementFrameTargetCount",
            "mainCitySlgCameraRailVisible",
            "mainCitySlgCameraForegroundLayerVisible",
            "mainCitySlgCameraMidgroundLayerVisible",
            "mainCitySlgCameraBackgroundLayerVisible",
            "mainCitySlgCameraDepthLayerCount",
            "mainCitySlgCameraPreservesReducedMotionSkip",
            "mainCitySlgCameraPushMotionStage600ContractId",
            "mainCitySlgCameraPushMarkerToken",
            "mainCitySlgCameraPushTrailToken",
            "mainCitySlgCameraPushMotionStates",
            "mainCitySlgCameraPushMotionDurationSec",
            "mainCitySlgCameraPushMotionFrameTargetCount",
            "mainCitySlgCameraPushMarkerVisible",
            "mainCitySlgCameraPushTrailVisible",
            "mainCitySlgCameraPushSettleHaloVisible",
            "mainCitySlgCameraPushMotionPreservesReducedMotionSkip",
            "mainCityLivingSpaceStage605ContractId",
            "mainCityLivingSpaceMarketToken",
            "mainCityLivingSpaceCrowdToken",
            "mainCityLivingSpaceEconomyToken",
            "mainCityLivingSpaceMarketVisible",
            "mainCityLivingSpaceCrowdVisible",
            "mainCityLivingSpaceWorkerVisible",
            "mainCityLivingSpaceEconomyCueVisible",
            "mainCityLivingSpacePlayerCopy",
            "mainCityLivingSpaceLayerCount",
            "mainCityLivingSpacePreservesRealButtons",
            "mainCityLivingSpaceBuildingForegroundBlocked",
            "mainCityLivingSpaceBuildingLayerZIndex",
            "mainCityLivingSpaceBuildingRowZIndex",
            "mainCityPlayerBoundPrimaryAssetToken",
            "mainCityPlayerBoundPrimaryAssetFile",
            "mainCityPlayerBoundPrimaryAssetNode",
            "mainCityPlayerBoundPrimaryAssetVisible",
            "mainCityPlayerBoundEntryDockAnchoredToPrimaryAsset",
            "mainCityPlayerBoundEntryDockPlacementMode",
            "mainCityPlayerBoundEntryDockNearPrimaryAsset",
            "hubSceneReturnButtonLessIntrusive",
            "hubSceneReturnButtonCornerChrome",
            "mainCitySceneGatehouseLayerVisible",
            "mainCitySceneMansionHighlightVisible",
            "mainCitySceneSpatialEntryDockVisible",
        ],
    },
    "world_open_main_city_hub_jump_coordinate": {
        "display_mode": "world",
        "world_action": "open_hub",
    },
    "world_open_alliance_member_coordinate_jump": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
        "panel_required": False,
    },
    "world_ai_switch_open_home_city": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "aiSwitchHomeCityVisualAcceptanceToken",
            "aiSwitchHomeCityVisualAcceptanceProofLevel",
            "aiSwitchHomeCityScreenshotAcceptanceReady",
            "aiSwitchHomeCityVisibleCopyForbiddenHits",
            "aiSwitchHomeCityVisibleCopyClean",
            "aiSwitchHomeCityStyleOwner",
            "aiSwitchOneClickFacilityOpenOk",
            "aiSwitchOneClickButtonVisible",
            "aiSwitchOneClickShellContractOk",
        ],
    },
    "world_ai_living_activity_layer_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "aiLivingActivityMarkerFamilyContract",
            "aiLivingActivityMarkerFrameAssetDrawCount",
            "aiLivingActivityMarkerRouteArrowAssetDrawCount",
            "aiLivingActivityMarkerClusterBadgeAssetDrawCount",
            "aiLivingActivityMarkerVisualAssetContract",
            "aiLivingActivityMarkerQueueClusterContract",
            "aiLivingActivityMarkerAvatarVisibleCount",
            "aiLivingActivityMarkerTargetLineVisibleCount",
            "aiLivingActivityMarkerQueueCountVisibleCount",
            "aiLivingActivityMarkerAggregationDotVisibleCount",
            "aiLivingActivityMarkerCarryingTroopsStripContract",
            "aiLivingActivityMarkerCarryingTroopsGeneratedAssetSource",
            "aiLivingActivityMarkerCarryingTroopsStripVisibleCount",
            "aiLivingActivityMarkerCarryingTroopsSlotCount",
            "aiLivingActivityMarkerCarryingTroopsTextureDrawCount",
            "aiLivingActivityMarkerCarryingTroopsLabels",
            "aiLivingActivityLongTracePositionContract",
            "aiLivingActivityRouteTraceStepCount",
            "aiLivingActivityDistinctTargetTileCount",
            "aiLivingActivitySeparatedMarkerPositionCount",
            "aiLivingActivitySeparatedMarkerPositionOk",
            "aiActivityPlayerUiGovernanceContractId",
            "aiActivityPlayerUiGovernanceVerified",
            "aiActivityForbiddenVisibleCopyClear",
            "aiActivityVisibleDensityOk",
        ],
    },
    "world_shell_ai_activity_badge_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
    },
    "world_movement_geography_feedback_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "movementGeographyFeedbackFixtureOk",
            "movementGeographyBlockedReason",
            "movementGeographyRequiredPass",
            "movementGeographyRequiredDock",
            "movementGeographyRouteStatus",
            "movementGeographySeaRouteAuthorityBoundary",
        ],
    },
    "world_sea_route_status_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
    },
    "world_sea_patrol_report_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldSeaPatrolReportFixtureOk",
            "worldSeaPatrolMaritimeActivityChipId",
            "worldSeaPatrolMaritimeReportResultChipId",
            "aiPanelMaritimeActivityChipId",
            "battleReportDetailMaritimeResultChipId",
        ],
    },
    "world_sea_patrol_intercept_report_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldSeaPatrolInterceptReportFixtureOk",
            "worldSeaPatrolInterceptReportId",
            "worldSeaPatrolInterceptListMaritimeChipVisibleCount",
            "worldSeaPatrolInterceptDetailMaritimeChipId",
            "worldSeaPatrolInterceptBattleReportSurface",
            "worldSeaPatrolInterceptNavalBattleScope",
            "worldSeaPatrolInterceptAttackerVesselType",
            "worldSeaPatrolInterceptDefenderVesselType",
            "worldSeaPatrolInterceptShipImageBatchStatus",
            "worldSeaPatrolInterceptNavalFrameRouteFeedbackContract",
            "worldSeaPatrolInterceptNavalFrameRouteFeedbackOk",
            "worldSeaPatrolInterceptNavalFrameRouteFeedbackStatus",
            "worldSeaPatrolInterceptNavalFrameRouteFeedbackVisibleCount",
            "worldSeaPatrolInterceptAttackerFrameSlotId",
            "worldSeaPatrolInterceptDefenderFrameSlotId",
            "worldSeaPatrolInterceptNavalFrameRouteTextureLoadedBySlot",
            "worldSeaPatrolInterceptNavalFrameRouteDoesNotUseUnitMarker",
            "worldSeaPatrolInterceptNavalFrameRouteMovementRuntimeStatus",
        ],
    },
    "world_sea_overseas_naval_frame_preview": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldSeaOverseasNavalFramePreviewOk",
            "worldSeaOverseasNavalFramePreviewVisibleSlotCount",
            "worldSeaOverseasNavalFramePreviewSlots",
            "worldSeaOverseasNavalFramePreviewManifestStatus",
            "worldSeaOverseasNavalFramePreviewConnectionStatus",
            "worldSeaOverseasNavalFramePreviewLandManifestUntouched",
            "worldSeaOverseasNavalFramePreviewDoesNotUseUnitMarker",
        ],
    },
    "world_naval_runtime_minimal_chain_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldNavalRuntimeMinimalChainOk",
            "worldNavalRuntimeMinimalChainFleetId",
            "worldNavalRuntimeMinimalChainFleetRuntimeStatus",
            "worldNavalRuntimeMinimalChainFrameSlotId",
            "worldNavalRuntimeMinimalChainRouteLineStatus",
            "worldNavalRuntimeMinimalChainMovementRuntimeStatus",
            "worldNavalRuntimeMinimalChainDoesNotUseUnitMarker",
            "worldNavalRuntimeMinimalChainBattleReportSurface",
            "worldNavalRuntimeMinimalChainInterceptReportId",
        ],
    },
    "world_naval_combat_minimal_settlement_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldNavalCombatMinimalSettlementOk",
            "worldNavalCombatMinimalSettlementUsesExistingBattleReport",
            "worldNavalCombatMinimalSettlementBattleReportSurface",
            "worldNavalCombatMinimalSettlementDoesNotUseUnitMarker",
            "worldNavalCombatMinimalSettlementAttackerVesselType",
            "worldNavalCombatMinimalSettlementDefenderVesselType",
            "worldNavalCombatMinimalSettlementId",
            "worldNavalCombatMinimalSettlementBattleReportId",
            "worldNavalCombatMinimalSettlementFleetFrameSlotId",
        ],
    },
    "world_naval_combat_battle_report_detail_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldNavalCombatBattleReportDetailOk",
            "worldNavalCombatBattleReportDetailUsesExistingBattleReport",
            "worldNavalCombatBattleReportDetailSurface",
            "worldNavalCombatBattleReportDetailBattleReportId",
            "worldNavalCombatBattleReportDetailSelectedReportId",
            "worldNavalCombatBattleReportDetailDamageSummaryVisible",
            "worldNavalCombatBattleReportDetailLossSummaryVisible",
            "worldNavalCombatBattleReportDetailAftermathCopyVisible",
        ],
    },
    "world_naval_fleet_damage_repair_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldNavalFleetDamageRepairOk",
            "worldNavalFleetDamageRepairUsesExistingSeaRuntime",
            "worldNavalFleetDamageRepairUsesExistingBattleReport",
            "worldNavalFleetDamageRepairDamagedFleetId",
            "worldNavalFleetDamageRepairDamagePersistsAfterSettlement",
            "worldNavalFleetDamageRepairRepairFeedbackVisible",
            "worldNavalFleetDamageRepairVisibleCopyForbiddenHits",
            "worldNavalFleetDamageRepairUsesSharedCombatFeedback",
            "worldNavalFleetDamageRepairLandSurfaceNavalCopyLeak",
            "fleetDamageRepairLandSurfaceForbiddenHits",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
            "worldNavalFleetDamageRepairUiScope",
            "worldNavalFleetDamageRepairDoesNotUseUnitMarker",
            "worldNavalFleetDamageRepairScope",
        ],
    },
    "world_naval_shipyard_build_warship_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldNavalShipyardBuildWarshipOk",
            "worldNavalShipyardUsesExistingSeaRuntime",
            "worldNavalShipyardDoesNotUseUnitMarker",
            "worldNavalShipyardHarborId",
            "worldNavalShipyardShipyardOrderId",
            "worldNavalShipyardShipClass",
            "worldNavalShipyardInventoryFleetId",
            "worldNavalShipyardBuildStatus",
            "worldNavalShipyardInventoryDelta",
            "worldNavalShipyardFeedbackVisible",
            "worldNavalShipyardVisibleCopyForbiddenHits",
            "worldNavalShipyardScope",
        ],
    },
    "world_naval_harbor_inventory_open_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldNavalHarborInventoryOpenOk",
            "sourceShipyardOrderId",
            "inventoryFleetId",
            "harborId",
            "harborName",
            "fleetCardVisible",
            "fleetStatusLabel",
            "durabilityLabel",
            "harborSurfaceVisible",
            "harborCopyAllowedOnlyOnHarborSurface",
            "landSurfaceNavalCopyLeak",
            "visibleCopyForbiddenHits",
            "playerVisibleEngineeringCopyLeak",
            "worldNavalHarborInventoryScope",
            "harborHudVisualSkinOk",
            "harborActionHudUnifiedFamilyOk",
            "harborActionHudCompactCopyOk",
        ],
    },
    "world_naval_harbor_deployment_readiness_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldNavalHarborDeploymentReadinessOk",
            "harborSurfaceVisible",
            "fleetCardVisible",
            "fleetId",
            "inventoryFleetId",
            "harborId",
            "deploymentReadinessUsesSharedDomainPolicy",
            "deploymentPolicyScope",
            "recommendedActionLabel",
            "missionAllowed",
            "readinessScore",
            "riskScore",
            "durabilityLabel",
            "riskLabel",
            "shouldRepair",
            "shouldPatrol",
            "shouldIntercept",
            "shouldHold",
            "harborHudActionButtonStateOk",
            "harborHudVisualSkinOk",
            "harborHudPanelSkinVisible",
            "harborHudFleetCardSkinVisible",
            "harborHudShipIconVisible",
            "harborHudRepairStateIconVisible",
            "harborHudRiskStateVisualVisible",
            "harborHudActionButtonSkinStateOk",
            "harborHudNoBakedTextInAssets",
            "harborHudNoEngineeringCopyLeak",
            "harborHudStyleOwner",
            "harborHudComponentSkinToken",
            "harborHudRealButtonNodeNames",
            "harborHudVisualSkinScope",
            "harborActionHudSkinFamily",
            "harborActionHudVariant",
            "harborActionHudSharedStyleOwner",
            "harborActionHudUnifiedFamilyOk",
            "harborActionHudCompactCopyOk",
            "harborActionHudVisibleActionLabels",
            "harborActionHudHiddenHeavySectionLabels",
            "harborActionHudHeavyFleetCardHidden",
            "harborActionHudUnsupportedButtonsHidden",
            "harborActionHudNoEngineeringCopyLeak",
            "feedbackVisible",
            "landSurfaceNavalCopyLeak",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
            "worldNavalHarborDeploymentReadinessScope",
        ],
    },
    "world_naval_inventory_fleet_patrol_reuse_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldNavalInventoryFleetPatrolReuseOk",
            "sourceShipyardOrderId",
            "inventoryFleetId",
            "reusedFleetId",
            "harborId",
            "seaRouteId",
            "patrolId",
            "interceptReportId",
            "reuseStatus",
            "worldNavalReuseUsesExistingSeaRuntime",
            "worldNavalReuseDoesNotUseUnitMarker",
            "feedbackVisible",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
            "worldNavalReuseScope",
            "fleetReadbackOk",
        ],
    },
    "world_naval_inventory_fleet_combat_damage_repair_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldNavalInventoryFleetCombatDamageRepairOk",
            "sourceShipyardOrderId",
            "inventoryFleetId",
            "reusedFleetId",
            "harborId",
            "seaRouteId",
            "patrolId",
            "interceptId",
            "navalCombatId",
            "damageReportId",
            "fleetDamageState",
            "returnHarborRepairId",
            "repairStatus",
            "worldNavalCombatUsesInventoryFleet",
            "worldNavalCombatUsesExistingSeaRuntime",
            "worldNavalCombatDoesNotUseUnitMarker",
            "worldNavalCombatDamageRepairUsesSharedCombatFeedback",
            "worldNavalCombatDamageRepairLandSurfaceNavalCopyLeak",
            "landSurfaceForbiddenNavalCopyHits",
            "feedbackVisible",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
            "worldNavalCombatDamageRepairScope",
            "worldNavalCombatDamageRepairUiScope",
        ],
    },
    "world_tile_action_hud_open_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldTileActionHudOpenOk",
            "tileId",
            "tileLevel",
            "tileCoordinateLabel",
            "resourceYieldLabel",
            "defenderStrengthLabel",
            "defenderTroopCount",
            "expeditionButtonVisible",
            "feedbackVisible",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
            "tileHudVisualPolishOk",
            "tileHudCardVisible",
            "tileHudArtOwner",
            "tileHudSharedStyleOwner",
            "tileHudBackplateToken",
            "expeditionButtonNodeName",
            "visiblePrimaryLabels",
            "engineeringCopyForbiddenHits",
            "rawTileIdVisible",
            "tileHudNoNestedCards",
            "tileHudTextDensityOk",
            "worldTileActionHudScope",
            "resourceHudProtectedFootprintVetoOk",
            "tileActionHudFixtureAvoidsLuoyangCoordinate",
            "tileActionHudResourceContextPolicy",
        ],
    },
    "world_tile_expedition_minimal_settlement_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldTileActionHudOpenOk",
            "worldTileExpeditionMinimalSettlementOk",
            "tileId",
            "tileLevel",
            "tileCoordinateLabel",
            "resourceYieldLabel",
            "defenderStrengthLabel",
            "defenderTroopCount",
            "expeditionButtonVisible",
            "settlementReceiptId",
            "battleReportId",
            "resourceDelta",
            "taskProgressDelta",
            "battleRecordReadback",
            "feedbackVisible",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
            "tileHudVisualPolishOk",
            "tileHudCardVisible",
            "tileHudArtOwner",
            "tileHudSharedStyleOwner",
            "tileHudBackplateToken",
            "expeditionButtonNodeName",
            "visiblePrimaryLabels",
            "engineeringCopyForbiddenHits",
            "rawTileIdVisible",
            "tileHudNoNestedCards",
            "tileHudTextDensityOk",
            "worldTileActionHudScope",
            "resourceHudProtectedFootprintVetoOk",
            "tileActionHudFixtureAvoidsLuoyangCoordinate",
            "tileActionHudResourceContextPolicy",
        ],
    },
    "world_tile_action_hud_production_resource_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldTileProductionResourceHudOk",
            "worldTileProductionResourceScope",
            "selectedTileId",
            "tileId",
            "tileLevel",
            "resourceKind",
            "tileCoordinateLabel",
            "resourceYieldLabel",
            "captureRewardLabel",
            "defenderStrengthLabel",
            "defenderTroopCount",
            "recommendedPowerLabel",
            "recommendedPower",
            "resourcePreviewUsesSharedDomainPolicy",
            "expeditionButtonVisible",
            "feedbackVisible",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
            "tileHudVisualPolishOk",
            "tileHudCardVisible",
            "tileHudArtOwner",
            "tileHudSharedStyleOwner",
            "tileHudBackplateToken",
            "expeditionButtonNodeName",
            "visiblePrimaryLabels",
            "engineeringCopyForbiddenHits",
            "rawTileIdVisible",
            "l1L9ResourceLevelCoverageOk",
            "tileHudNoNestedCards",
            "tileHudTextDensityOk",
            "resourceHudProtectedFootprintVetoOk",
            "tileActionHudFixtureAvoidsLuoyangCoordinate",
            "tileActionHudResourceContextPolicy",
        ],
    },
    "world_tile_expedition_production_resource_settlement_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldTileProductionResourceHudOk",
            "worldTileProductionResourceScope",
            "selectedTileId",
            "tileId",
            "tileLevel",
            "resourceKind",
            "tileCoordinateLabel",
            "resourceYieldLabel",
            "defenderStrengthLabel",
            "defenderTroopCount",
            "expeditionButtonVisible",
            "settlementReceiptId",
            "battleReportId",
            "resourceDelta",
            "feedbackVisible",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
            "tileHudVisualPolishOk",
            "tileHudCardVisible",
            "tileHudArtOwner",
            "tileHudSharedStyleOwner",
            "tileHudBackplateToken",
            "expeditionButtonNodeName",
            "visiblePrimaryLabels",
            "engineeringCopyForbiddenHits",
            "rawTileIdVisible",
            "l1L9ResourceLevelCoverageOk",
            "tileHudNoNestedCards",
            "tileHudTextDensityOk",
            "resourceHudProtectedFootprintVetoOk",
            "tileActionHudFixtureAvoidsLuoyangCoordinate",
            "tileActionHudResourceContextPolicy",
        ],
    },
    "first_hour_land_loop_integrated_click_to_task_readback_gate": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "firstHourLandLoopIntegratedClickToTaskReadbackOk",
            "firstHourLandLoopIntegratedScope",
            "godotResourceHudExpeditionActionOk",
            "backendReceiptReadbackOk",
            "resourceReadbackOk",
            "battleRecordReadbackOk",
            "taskReadbackStatus",
            "taskReadbackOk",
            "taskProgressAutoAdvanced",
            "taskProgressAutoAdvanceBlocked",
            "currentGoalsReadbackOk",
            "currentGoalsReadModelOnly",
            "stage195BackendPersistenceGateReferenced",
            "netResourceDelta",
            "expectedNetResourceDelta",
            "settlementReceiptId",
            "battleReportId",
            "resourceDelta",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
        ],
    },
    "first_hour_land_loop_task_claim_prompt_gate": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "firstHourTaskClaimPromptOk",
            "firstHourTaskClaimPromptVisible",
            "taskId",
            "claimState",
            "taskClaimButtonVisible",
            "taskClaimButtonPressed",
            "taskClaimAfterState",
            "taskClaimFeedbackVisible",
            "currentGoalsReadModelOnly",
            "taskClaimVisibleCopyForbiddenHits",
            "taskClaimRewardPreviewResources",
            "taskClaimResourceBefore",
            "taskClaimResourceAfter",
            "taskClaimResourceDelta",
            "taskClaimRewardResourcesAppliedOk",
            "nextTaskAfterClaim",
            "nextTaskAfterClaimVisible",
            "nextTaskAfterClaimVisibleHits",
            "nextTaskAfterClaimGuidanceOk",
            "nextTaskAfterClaimId",
            "nextTaskAfterClaimTitle",
            "nextTaskAfterClaimActionHint",
            "nextTaskAfterClaimActionTarget",
            "resourceOccupationTaskProgressStillOk",
            "firstHourLandLoopIntegratedClickToTaskReadbackOk",
            "taskProgressAutoAdvanced",
        ],
    },
    "world_mainworld_camera_pan_resource_roundtrip_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "mainWorldCameraPanResourceRoundtripOk",
            "planOnly",
            "mainWorldMapVisibleBefore",
            "mainWorldMapVisibleAfterPan",
            "cameraStartCell",
            "cameraEndCell",
            "cameraPanDeltaCells",
            "viewportLoadedChunkIdsBefore",
            "viewportLoadedChunkIdsAfter",
            "resourceHudAfterPanOk",
            "resourceTileSelectedAfterPan",
            "resourceOccupationAfterPanReadbackOk",
            "firstHourLandLoopIntegratedClickToTaskReadbackOk",
            "taskProgressAutoAdvanced",
            "stateFillRatio2k",
            "cameraZoomFocusRuntimeSummary",
            "wheelPivotDriftPx",
            "pinchPivotDriftPx",
            "pivotCellDrift",
            "focusSettleTimeMs",
            "hitRadiusPx",
            "labelOverlapCount",
            "loadedChunkCount",
            "unloadCandidateChunkCount",
            "viewportCacheHitCount",
            "viewportStaleResponseCount",
            "memoryPeakMb",
            "memoryAfterUnloadMb",
            "memoryRecoveredMb",
            "cacheUnloadOk",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
        ],
    },
    "world_tile_action_hud_resource_preview_policy_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldTileActionHudResourcePreviewPolicyOk",
            "resourcePreviewPolicyVersion",
            "resourceEconomyModelVersion",
            "resourcePreviewUsesSharedDomainPolicy",
            "selectedTileId",
            "tileId",
            "tileLevel",
            "resourceKind",
            "resourceLabel",
            "tileCoordinateLabel",
            "resourceYieldLabel",
            "captureRewardLabel",
            "defenderStrengthLabel",
            "defenderTroopCount",
            "recommendedPowerLabel",
            "recommendedPower",
            "guardLevel",
            "riskLabel",
            "difficultyLabel",
            "expeditionButtonVisible",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
            "tileHudVisualPolishOk",
            "tileHudCardVisible",
            "tileHudArtOwner",
            "tileHudSharedStyleOwner",
            "tileHudBackplateToken",
            "expeditionButtonNodeName",
            "visiblePrimaryLabels",
            "engineeringCopyForbiddenHits",
            "rawTileIdVisible",
            "l1L9ResourceLevelCoverageOk",
            "tileHudNoNestedCards",
            "tileHudTextDensityOk",
        ],
    },
    "world_tile_resource_coverage_matrix_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldTileResourceCoverageMatrixOk",
            "resourceCoverageUsesSharedDomainPolicy",
            "coverageTileCount",
            "coveredLevels",
            "coveredResourceKinds",
            "coverageSamples",
            "zeroLevelSubstrateProtected",
            "l10NotRequiredForCurrentMvp",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
            "worldTileActionHudResourcePreviewPolicyOk",
            "resourcePreviewUsesSharedDomainPolicy",
            "selectedTileId",
            "tileId",
            "tileLevel",
            "resourceKind",
            "resourceLabel",
            "tileCoordinateLabel",
            "resourceYieldLabel",
            "captureRewardLabel",
            "defenderStrengthLabel",
            "guardSoldierLabel",
            "troopStrengthLabel",
            "guardSoldierCount",
            "defenderTroopCount",
            "recommendedPowerLabel",
            "recommendedPower",
            "guardSoldierUsesDefenderStrengthRange",
            "recommendedPowerUsesPreviewRecommendedPower",
            "guardSoldierAndRecommendedPowerSeparatedOk",
            "guardSoldierAuthorityExpected",
            "recommendedPowerAuthorityExpected",
            "resourceTileHudAuthorityNumbersOk",
            "expeditionButtonVisible",
            "tileHudAnchorMode",
            "selectedTileScreenPosition",
            "tileHudRect",
            "tileHudBoundToSelectedTile",
            "tileHudSafeViewportClampOk",
            "tileHudAvoidsLeftRailAndBottomNav",
            "selectedTileSingleSelectionOk",
            "selectedTileActiveFrameCount",
            "tileHudActiveCount",
            "tileHudVisualPolishOk",
            "tileHudCardVisible",
            "tileHudArtOwner",
            "tileHudSharedStyleOwner",
            "tileHudBackplateToken",
            "expeditionButtonNodeName",
            "visiblePrimaryLabels",
            "engineeringCopyForbiddenHits",
            "rawTileIdVisible",
            "tileHudNoNestedCards",
            "tileHudTextDensityOk",
            "tileHudForbiddenGuardStrengthCopyAbsent",
            "landActionHudVisualPolishSliceOk",
            "landActionHudSkinFamily",
            "landActionHudVariant",
            "landActionHudBackplateVisible",
            "landActionHudPrimaryButtonSkinOk",
            "landActionHudLevelBadgeVisible",
            "landActionHudResourceChipVisible",
            "landActionHudGuardChipVisible",
            "landActionHudRewardLineVisible",
            "landActionHudNoEngineeringCopyLeak",
        ],
    },
    "world_tile_action_hud_zero_level_substrate_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldTileZeroLevelSubstrateHudOk",
            "worldTileZeroLevelSubstrateScope",
            "zeroLevelSubstrateHasResourceYield",
            "zeroLevelSubstrateHasResourceGuard",
            "zeroLevelSubstrateExpeditionRewardBlocked",
            "selectedTileId",
            "tileId",
            "tileLevel",
            "resourceYieldLabel",
            "defenderStrengthLabel",
            "expeditionButtonVisible",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
            "tileHudVisualPolishOk",
            "tileHudCardVisible",
            "tileHudArtOwner",
            "tileHudSharedStyleOwner",
            "tileHudBackplateToken",
            "visiblePrimaryLabels",
            "engineeringCopyForbiddenHits",
            "rawTileIdVisible",
            "l0TileLabelOk",
            "tileHudNoNestedCards",
            "tileHudTextDensityOk",
        ],
    },
    "world_click_priority_matrix_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "worldClickPriorityMatrixOk",
            "clickPriorityFullProtectedSamplesOk",
            "clickPriorityMatrixScope",
            "clickPriorityProtectedObjectCount",
            "clickPriorityResourceHudOpenOk",
            "clickPriorityL0SubstrateOk",
            "clickPriorityProtectedFootprintVetoOk",
            "clickPrioritySamples",
            "clickPriorityUnavailableSamples",
            "clickPriorityRequiredProtectedSamples",
            "clickPriorityPresentProtectedSampleIds",
            "clickPriorityMissingProtectedSampleIds",
            "resourceHudProtectedFootprintVetoOk",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
        ],
    },
    "world_ai_activity_card_from_badge_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "aiActivityCardAvatarStatusContract",
            "aiActivityCardAvatarVisible",
            "aiActivityCardAvatarStatusFrameFamilyContract",
            "aiActivityCardAvatarStatusFrameVisible",
            "aiActivityCardAvatarIntentBadgeVisible",
            "aiActivityCardStatusDotVisible",
            "aiActivityCardCarryingTroopsChipContract",
            "aiActivityCardCarryingTroopsGeneratedAssetSource",
            "aiActivityCardCarryingTroopsChipVisible",
            "aiActivityCardCarryingTroopsSlotCount",
            "aiActivityCardCarryingTroopsTextureCount",
            "aiActivityCardCarryingTroopsLabels",
        ],
    },
    "world_ai_activity_card_from_marker_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "aiActivityCardAvatarStatusContract",
            "aiActivityCardAvatarVisible",
            "aiActivityCardAvatarStatusFrameFamilyContract",
            "aiActivityCardAvatarStatusFrameVisible",
            "aiActivityCardAvatarIntentBadgeVisible",
            "aiActivityCardStatusDotVisible",
            "aiActivityCardCarryingTroopsChipContract",
            "aiActivityCardCarryingTroopsGeneratedAssetSource",
            "aiActivityCardCarryingTroopsChipVisible",
            "aiActivityCardCarryingTroopsSlotCount",
            "aiActivityCardCarryingTroopsTextureCount",
            "aiActivityCardCarryingTroopsLabels",
        ],
    },
    "world_bottom_nav_component_contract": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
    },
    "world_left_troop_rail_component_contract": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "leftRailPlayerDensityContractId",
            "leftRailTaskBodyHidden",
            "leftRailCityStateTitleHidden",
            "leftRailCityStateSummaryHidden",
            "leftRailCityTechSummaryHidden",
            "leftRailTroopSectionTitleHidden",
            "leftRailTroopSummaryHidden",
            "leftRailTroopStrengthTagsHidden",
            "leftRailPlayerDensityContractOk",
            "leftTroopRailVisibleCountMode",
            "leftTroopRailTargetVisibleSlotCount",
            "leftTroopRailNoPhantomEmptyFrameOk",
            "leftTroopRailNoStandbyCopy",
            "leftTroopRailFixed5AlignmentToken",
            "leftTroopRailFixed5AlignmentOk",
            "leftTroopRailSlotGridAlignedOk",
            "leftTroopRailAvatarColumnAlignedOk",
            "leftTroopRailStatusColumnAlignedOk",
            "leftTroopRailStrengthColumnAlignedOk",
            "leftTroopRailBarColumnAlignedOk",
            "leftTroopRailJumpButtonColumnAlignedOk",
            "leftTroopRailNoVisibleEmptySlotFrame",
            "leftTroopRailJumpActionId",
            "leftTroopRailJumpActionNodeName",
            "leftTroopRailJumpActionAvailable",
        ],
    },
    "world_left_troop_rail_jump_to_unit_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "leftTroopRailJumpActionId",
            "leftTroopRailNoStandbyCopy",
            "leftTroopRailJumpActionNodeName",
            "leftTroopRailJumpActionAvailable",
            "leftTroopRailJumpTroopId",
            "leftTroopRailJumpTileId",
            "leftTroopRailJumpVisibleCopyClean",
            "leftTroopRailJumpVisibleCopyForbiddenHits",
            "selectedTileId",
        ],
    },
    "world_shell_visual_unified_contract": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
    },
    "world_toggle_main_nav_collapse_expand": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_toggle_tianxia_yutu_roundtrip": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_tianxia_yutu_explicit_jump_luoyang": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_tianxia_yutu_explicit_jump_gate": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_tianxia_yutu_mode_isolation": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_tianxia_yutu_select_coordinate": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_tianxia_yutu_overlay_interaction": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_tianxia_yutu_nation_profile_entry": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_tianxia_yutu_product_acceptance_qa": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "tianxiaYutuPlayerUiGovernanceContractId",
            "tianxiaYutuPlayerUiGovernanceVerified",
            "tianxiaYutuForbiddenVisibleCopyClear",
            "tianxiaYutuVisibleDensityOk",
        ],
    },
    "world_map_video_style_transition_chain_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
        "required_summary_fields": [
            "cameraZoomFocusRuntimeSummary",
            "worldMapVideoStyleTransitionChain",
            "worldMapVideoStyleTransitionChainFixtureAction",
            "worldMapVideoStyleTransitionChainSummaryPath",
            "worldMapFocusMotionToken",
            "worldMapFocusTransitionMode",
            "worldMapFocusJumpDeltaCells",
            "worldMapFocusCameraSettle",
            "worldMapFocusTargetPulse",
            "preJumpArrivalMotionToken",
            "preJumpPulseMotion",
            "preJumpPulseMotionSource",
            "preJumpPulseMotionPending",
            "preJumpPulseMotionPendingReason",
            "arrivalSettleMotion",
            "arrivalSettleMotionSource",
            "arrivalSettleMotionPending",
            "arrivalSettleMotionPendingReason",
            "preJumpArrivalRejectIf",
            "cityRoadRevealVisible",
            "roadRevealLevel",
            "visibleRoadNodeCount",
            "focusContextPreserved",
            "combatOutbreakMotion",
            "combatOutbreakMotionSource",
            "combatOutbreakMotionPending",
            "combatOutbreakMotionPendingReason",
            "rewardSettleMotion",
            "rewardSettleMotionSource",
            "rewardSettleMotionPending",
            "rewardSettleMotionPendingReason",
            "rewardSettleSourceCandidate",
            "rewardSettleRequiredClickAction",
            "rewardSettleRequiredSummaryField",
            "rewardSettleNextFrameName",
            "rewardSettleUnwiredReason",
            "returnMainlineCameraSettle",
            "returnMainlineCameraSettleSource",
            "returnMainlineCameraSettlePending",
            "returnMainlineCameraSettlePendingReason",
            "returnMainlineSourceCandidate",
            "returnMainlineRequiredClickAction",
            "returnMainlineRequiredSummaryField",
            "returnMainlineNextFrameName",
            "returnMainlineUnwiredReason",
            "reducedMotionPathOk",
            "lowEndMotionBudgetOk",
        ],
    },
    "world_click_main_city_node": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_asset_enter_hub": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_asset_enter_hub_troop_entry": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_asset_enter_hub_building_tree_entry": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_asset_enter_hub_return_map": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_main_map_claim_release_cell": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
    },
    "world_main_map_immunity_reject_cell": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
    },
    "world_click_main_city_node_city_context": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_context_return_map_button_identity": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_assign_preview": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_assign_preview_open_first_team": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_assign_preview_open_first_team_button_identity": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_assign_preview_open_second_team_button_identity": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_assign_preview_open_ai_fallback_team": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_assign_preview_open_ai_fallback_team_context_focus": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_assign_preview_open_ai_fallback_team_locked_config": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_assign_preview_open_ai_named_team": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_assign_preview_open_ai_multi_team_second": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_assign_preview_open_ai_multi_team_second_context_chat": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_assign_preview_multi_team_rail_stress": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_assign_preview_invalid_portrait_fallback": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_assign_preview_empty_slots": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_assign_preview_open_first_team_recruit_mode": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_assign_preview_open_first_team_recruit_mode_button_identity": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_assign_preview_open_first_team_config_mode_button_identity": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_assign_preview_open_first_team_back_button_identity": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_submit_player_formation": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_configure_then_clear_slot": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_troop_submit_march_map_unit": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
    },
    "world_click_main_city_node_troop_blocked_screenshot_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
    },
    "world_click_main_city_node_troop_intercepted_screenshot_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
    },
    "world_click_main_city_node_troop_retreating_screenshot_fixture": {
        "display_mode": "world",
        "world_action": "none",
        "panel_required": False,
    },
    "world_click_main_city_node_facility_building_tree": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_facility_building_tree_select_node": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_facility_building_tree_submit_upgrade": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_facility_building_tree_scroll_lower": {
        "display_mode": "world",
        "world_action": "none",
    },
    "world_click_main_city_node_interior": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "interior",
    },
    "world_click_main_city_node_interior_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "interior",
    },
    "world_click_main_city_node_building_upgrade": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "interior",
    },
    "world_click_main_city_node_troop": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "troop",
    },
    "world_click_main_city_node_troop_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "troop",
    },
    "world_open_main_city_recruit": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "recruit",
    },
    "world_open_main_city_recruit_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "recruit",
    },
    "world_open_main_city_recruit_single": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "recruit",
    },
    "world_open_main_city_recruit_single_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "recruit",
    },
    "world_open_main_city_recruit_multi": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "recruit",
    },
    "world_open_main_city_recruit_multi_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "recruit",
    },
    "world_open_main_city_recruit_result": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "recruit",
    },
    "world_open_main_city_recruit_result_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "recruit",
    },
    "world_open_main_city_generals_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "generals",
    },
    "world_open_main_city_generals_profile_close": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "generals",
    },
    "world_open_main_city_alliance_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_alliance_fixture_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_eligible_fixture_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_nation_fixture_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_alliance_home": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_nation_home": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_home_entry_members": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_home_entry_corps": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_members": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_corps": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_officers": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_nation_officers": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_policy": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_founding_prekingdom": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_founding_submit_failure": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_nation_governance_hints": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_nation_empire_submit": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_nation_empire_submit_success": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
        "seed_ai_governor_player_id": "验收官员",
    },
    "world_open_main_city_organization_nation_midgame_frontend": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
        "seed_ai_governor_player_id": "验收官员",
    },
    "world_open_main_city_organization_nation_midgame_route_luoyang": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
        "seed_ai_governor_player_id": "验收官员",
        "required_summary_fields": [
            "nationMidgameObjectiveRouteOk",
            "sourcePageId",
            "clickedButtonLabel",
            "buttonNodeName",
            "targetLabel",
            "routeTarget",
            "realButtonPressed",
            "targetFocusOk",
            "targetPanelVisibleCopy",
            "visibleCopyForbiddenHits",
            "playerVisibleEngineeringCopyLeak",
            "nationMidgameObjectiveRouteHeadline",
            "nationMidgameObjectiveRouteTargetSubtitle",
            "nationMidgameObjectiveRouteStyleOwnerPanel",
            "nationMidgameObjectiveRouteStyleOwnerPresenter",
            "nationMidgameObjectiveRouteScope",
        ],
    },
    "world_open_main_city_organization_nation_midgame_luoyang_route": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
        "seed_ai_governor_player_id": "验收官员",
        "required_summary_fields": [
            "nationMidgameLuoyangRouteOk",
            "sourcePageId",
            "clickedButtonLabel",
            "targetLabel",
            "targetFocusOk",
            "targetPanelVisibleCopy",
            "targetPanelEngineeringCopyLeak",
            "nationMidgameLuoyangRouteActionHudSkinFamily",
            "nationMidgameLuoyangRouteActionHudVariant",
            "nationMidgameLuoyangRouteActionHudUnifiedFamilyOk",
            "nationMidgameLuoyangRouteLegacyActionPanelHidden",
            "nationMidgameLuoyangRouteVisibleCopyLabels",
            "nationMidgameLuoyangRouteVisibleActionLabels",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
            "nationMidgameRouteScope",
        ],
    },
    "world_open_main_city_organization_nation_midgame_luoyang_feedback": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
        "seed_ai_governor_player_id": "验收官员",
        "required_summary_fields": [
            "nationMidgameLuoyangFeedbackOk",
            "sourcePageId",
            "clickedButtonLabel",
            "buttonNodeName",
            "targetLabel",
            "targetFocusOk",
            "feedbackVisibleCopy",
            "feedbackOrganizationResultCopy",
            "feedbackVisibleCopyForbiddenHits",
            "playerVisibleEngineeringCopyLeak",
            "nationMidgameFeedbackScope",
        ],
    },
    "world_open_main_city_organization_nation_midgame_luoyang_authority_claim": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
        "seed_ai_governor_player_id": "验收官员",
        "required_summary_fields": [
            "nationMidgameLuoyangAuthorityClaimOk",
            "sourcePageId",
            "clickedButtonLabel",
            "targetLabel",
            "targetFocusOk",
            "luoyangContestId",
            "contestStatus",
            "organizationId",
            "nationObjectiveId",
            "backendReceiptVisible",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
            "nationMidgameAuthorityScope",
        ],
    },
    "world_open_main_city_organization_nation_midgame_luoyang_battle_report_feedback": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
        "seed_ai_governor_player_id": "验收官员",
        "required_summary_fields": [
            "nationMidgameLuoyangBattleReportFeedbackOk",
            "sourcePageId",
            "clickedButtonLabel",
            "targetLabel",
            "targetFocusOk",
            "sourceLuoyangContestId",
            "battleReportId",
            "organizationReportId",
            "reportStatus",
            "usesOrganizationReportSurface",
            "feedbackVisible",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
            "nationMidgameBattleReportScope",
        ],
    },
    "world_open_main_city_organization_nation_midgame_luoyang_control_authority": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
        "seed_ai_governor_player_id": "验收官员",
        "required_summary_fields": [
            "nationMidgameLuoyangControlAuthorityOk",
            "sourcePageId",
            "clickedButtonLabel",
            "targetLabel",
            "targetFocusOk",
            "sourceLuoyangContestId",
            "sourceBattleReportId",
            "sourceOrganizationReportId",
            "controlAuthorityId",
            "prefectureControlProgressId",
            "controlStatus",
            "usesOrganizationReportSurface",
            "feedbackVisible",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
            "nationMidgameControlScope",
        ],
    },
    "world_open_main_city_organization_nation_midgame_luoyang_prefecture_control_judgment": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
        "seed_ai_governor_player_id": "验收官员",
        "required_summary_fields": [
            "nationMidgameLuoyangPrefectureControlJudgmentOk",
            "sourcePageId",
            "clickedButtonLabel",
            "targetLabel",
            "targetFocusOk",
            "sourceControlAuthorityId",
            "sourceLuoyangControlProgressId",
            "prefectureControlJudgmentId",
            "prefectureControlJudgmentStatus",
            "nextStepLabel",
            "usesOrganizationNationSurface",
            "ownershipTransferApplied",
            "feedbackVisible",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
            "nationMidgamePrefectureControlJudgmentScope",
        ],
    },
    "world_open_main_city_organization_nation_midgame_realm_objective_bridge": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
        "seed_ai_governor_player_id": "验收官员",
        "required_summary_fields": [
            "nationMidgameRealmObjectiveBridgeOk",
            "sourcePageId",
            "sourceControlAuthorityId",
            "sourceLuoyangControlProgressId",
            "targetLabel",
            "realmObjectiveProgressId",
            "kingdomObjectivePrerequisiteVisible",
            "empireObjectivePrerequisiteVisible",
            "nextStepLabel",
            "usesOrganizationNationSurface",
            "feedbackVisible",
            "playerVisibleEngineeringCopyLeak",
            "visibleCopyForbiddenHits",
            "nationMidgameRealmObjectiveBridgeScope",
            "nationMidgameHudVisualSkinOk",
            "nationMidgameHudPanelSkinVisible",
            "nationMidgameHudTargetCardVisible",
            "nationMidgameHudStateChipCount",
            "nationMidgameHudActionButtonSkinStateOk",
            "nationMidgameHudNoEngineeringCopyLeak",
            "nationMidgameHudStyleOwner",
            "nationMidgameHudComponentSkinToken",
            "nationMidgameHudRealButtonNodeNames",
            "nationMidgameHudSurfaceNodeName",
            "nationMidgameHudVisualSkinScope",
            "nationMidgameActionHudSkinFamily",
            "nationMidgameActionHudVariant",
            "nationMidgameActionHudSharedStyleOwner",
            "nationMidgameActionHudBackplateToken",
            "nationMidgameActionHudPrimaryButtonToken",
            "nationMidgameActionHudUnifiedFamilyOk",
            "nationMidgameLegacyActionPanelHidden",
            "nationMidgameLegacyActionPanelNodePath",
            "nationMidgameLegacyActionPanelButtonNodeNames",
        ],
    },
    "world_open_main_city_organization_home_entry_nation_midgame": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
        "seed_ai_governor_player_id": "验收官员",
    },
    "world_open_main_world_current_goals_nation_midgame_entry": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "",
        "seed_ai_governor_player_id": "验收官员",
        "required_summary_fields": [
            "currentGoalsContractId",
            "currentGoalsGovernedProposalTraceVisible",
            "currentGoalsTraceSummary",
        ],
    },
    "world_open_main_city_organization_nation_capital_migrate_submit": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_diplomacy": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_market": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_buildings": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_logs": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_reports": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
        "required_summary_fields": [
            "battleReportListActionResultCardVisibleCount",
            "battleReportListOrganizationActionResultCardVisibleCount",
        ],
    },
    "world_open_main_city_organization_report_detail": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_report_detail_jump_coordinate": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_nation_reports": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
        "required_summary_fields": [
            "battleReportListActionResultCardVisibleCount",
            "battleReportListOrganizationActionResultCardVisibleCount",
        ],
    },
    "world_open_main_city_organization_nation_report_detail": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_reports_back": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_organization_report_detail_back": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "alliance",
    },
    "world_open_main_city_activity_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "activity",
    },
    "world_open_main_city_world_affairs_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "world_affairs",
    },
    "world_affairs_claim_reward": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "world_affairs",
    },
    "world_open_main_city_tasks_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "tasks",
    },
    "world_open_main_city_tasks_nation_midgame_entry": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "tasks",
    },
    "world_open_main_city_faction_status_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "faction_status",
    },
    "world_open_main_city_mail_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "mail",
    },
    "world_open_main_city_mail_close_button_identity": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "mail",
    },
    "world_open_main_city_mail_select_reward": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "mail",
    },
    "world_open_main_city_mail_live_inbox_proof": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "mail",
        "required_summary_fields": [
            "newScreenshotGenerated",
            "staticGovernanceGreen",
            "visualAcceptanceClaimedSurfaces",
            "visualAcceptanceNotClaimedSurfaces",
            "liveInboxSource",
            "liveInboxRoute",
            "liveInboxReadbackOk",
            "mailPanelLiveInboxWired",
            "mailPanelLiveInboxItemCount",
            "mailPanelLiveInboxVisibleItemCount",
            "mailPanelLiveInboxRowButtonVisible",
            "mailPanelLiveInboxRowButtonNodeName",
            "mailPanelLiveInboxRowButtonActionId",
            "mailPanelLiveInboxRowButtonClicked",
            "visibleCopyForbiddenHits",
            "playerVisibleEngineeringCopyLeak",
            "styleOwner",
        ],
    },
    "world_open_main_city_mail_select_reward_button_identity": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "mail",
    },
    "world_open_main_city_mail_select_event_reward_button_identity": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "mail",
    },
    "world_open_main_city_mail_select_system_notice_button_identity": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "mail",
    },
    "world_open_main_city_mail_organization_tab_button_identity": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "mail",
    },
    "world_open_main_city_mail_system_tab_button_identity": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "mail",
    },
    "world_open_main_city_mail_select_org_order_button_identity": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "mail",
    },
    "world_open_main_city_mail_select_org_policy_button_identity": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "mail",
    },
    "world_open_main_city_battle_report_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "battle_report",
    },
    "world_open_main_city_settings_close": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_settings_display_tab_button_identity": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_settings_audio_tab_button_identity": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_settings_notification_tab_button_identity": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_settings_account_tab_button_identity": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_settings_display_font_plus": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_settings_audio_quiet": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_settings_notice_all": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_settings_notice_focus": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_settings_notice_quiet": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_settings_notice_reset": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_settings_account_open": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_settings_account_copy_id": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_settings_account_copy_id_button_identity": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_settings_account_privacy": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_settings_account_privacy_button_identity": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_settings_account_clear_cache": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_settings_account_clear_cache_button_identity": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "settings",
    },
    "world_open_main_city_interior": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "interior",
        "required_summary_fields": [
            "interiorHomeEntryChromeConvergenceToken",
            "interiorHomeEntryChromeMode",
            "interiorHomeEntryBadgeHitAreaMode",
            "interiorHomePlayerUiGovernanceContractId",
            "interiorHomePlayerUiGovernanceVerified",
            "interiorHomeForbiddenVisibleCopyClear",
            "interiorHomeVisibleDensityOk",
        ],
    },
    "world_open_main_city_interior_market": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "interior",
        "required_summary_fields": [
            "interiorSecondaryCardChromeConvergenceToken",
            "interiorSecondaryCardChromeMode",
            "interiorSecondaryCardChromeSharedFactory",
            "interiorTaxTreasuryScheduleCadence",
            "interiorTaxTreasuryTimelineCompactMode",
            "interiorTaxTreasuryLayoutPriorityToken",
            "interiorTaxTreasuryTimelineVerticalMode",
            "interiorTaxTreasuryPrimaryNodeRole",
            "interiorTaxTreasuryTopVoidGuard",
        ],
    },
    "world_open_main_city_interior_market_entry_button_identity": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "interior",
    },
    "world_open_main_city_interior_market_back_button_identity": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "interior",
    },
    "world_open_main_city_interior_trade": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "interior",
        "required_summary_fields": [
            "interiorSecondaryCardChromeConvergenceToken",
            "interiorSecondaryCardChromeMode",
            "interiorSecondaryCardChromeSharedFactory",
        ],
    },
    "world_open_main_city_interior_trade_entry_button_identity": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "interior",
    },
    "world_open_main_city_interior_trade_back_button_identity": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "interior",
    },
    "world_open_main_city_interior_tax": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "interior",
        "required_summary_fields": [
            "interiorSecondaryCardChromeConvergenceToken",
            "interiorSecondaryCardChromeMode",
            "interiorSecondaryCardChromeSharedFactory",
        ],
    },
    "world_open_main_city_interior_tax_entry_button_identity": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "interior",
    },
    "world_open_main_city_interior_tax_back_button_identity": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "interior",
    },
    "world_open_main_city_interior_affairs": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "interior",
        "required_summary_fields": [
            "interiorAffairsCardChromeConvergenceToken",
            "interiorAffairsCardChromeMode",
            "interiorAffairsCardChromeSelectedStateMode",
            "interiorAffairsWorkOrderServerAuthorityOk",
            "interiorAffairsWorkOrderServerReceiptSource",
            "interiorAffairsWorkOrderServerReadbackSchema",
            "interiorAffairsWorkOrderServerReadbackReceiptId",
        ],
    },
    "world_open_main_city_interior_affairs_entry_button_identity": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "interior",
    },
    "world_open_main_city_interior_affairs_back_button_identity": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "interior",
    },
    "world_open_main_city_interior_affairs_stress_12": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "interior",
        "required_summary_fields": [
            "interiorAffairsCardChromeConvergenceToken",
            "interiorAffairsCardChromeMode",
            "interiorAffairsCardChromeSelectedStateMode",
        ],
    },
    "world_open_main_city_interior_affairs_press_first_action": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "interior",
        "required_summary_fields": [
            "interiorAffairsCardChromeConvergenceToken",
            "interiorAffairsCardChromeMode",
            "interiorAffairsCardChromeSelectedStateMode",
        ],
    },
    "world_open_main_city_interior_affairs_press_focus_action": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "interior",
        "required_summary_fields": [
            "interiorAffairsCardChromeConvergenceToken",
            "interiorAffairsCardChromeMode",
            "interiorAffairsCardChromeSelectedStateMode",
        ],
    },
    "world_open_main_city_building_upgrade": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "interior",
    },
    "world_open_main_city_troop": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "troop",
    },
    "generals_roster_open_hero_profile": {
        "display_mode": "world",
        "world_action": "none",
        "panel_id": "generals",
    },
    "world_open_main_city_skill_library": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "skill_library",
    },
    "world_open_main_city_skill_library_search": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "skill_library",
    },
    "world_open_main_city_skill_library_clear_search": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "skill_library",
    },
    "world_open_main_city_skill_library_flip_card": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "skill_library",
    },
    "world_open_main_city_skill_library_type_chase": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "skill_library",
    },
    "world_open_main_city_skill_library_type_active": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "skill_library",
    },
    "world_open_main_city_skill_library_type_passive": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "skill_library",
    },
    "world_open_main_city_skill_library_type_command": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "skill_library",
    },
    "world_open_main_city_skill_library_close": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "skill_library",
    },
    "world_open_main_city_generals_tactics": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "generals",
    },
    "world_open_main_city_generals_tactics_close": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "generals",
    },
    "world_open_main_city_generals_library": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "generals",
    },
    "world_open_main_city_generals_library_close": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "generals",
    },
    "world_open_main_city_generals_growth": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "generals",
    },
    "world_open_main_city_generals_growth_close": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "generals",
    },
    "world_open_main_city_generals_growth_next_troop": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "generals",
    },
    "world_open_main_city_generals_profile_reset_action": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "generals",
    },
    "world_open_main_city_generals_profile_guide_action": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "generals",
    },
    "world_open_main_city_generals_profile_share_action": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "generals",
    },
    "world_open_main_city_generals_profile_inherit_action": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "generals",
    },
    "world_open_main_city_generals_profile_back_close": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "generals",
    },
    "world_open_main_city_generals_profile_skill_detail_close": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "generals",
    },
    "generals_roster_hero_next": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "generals",
    },
    "generals_roster_hero_prev": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "generals",
    },
    "battle_report_open_detail": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_seeded_open_list": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_seeded_open_detail": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
        "required_summary_fields": [
            "battleReportDetailAiLivingFeedbackToken",
            "battleReportDetailAiLivingFeedbackVisible",
            "battleReportDetailAiLivingFeedbackActorVisible",
            "battleReportDetailAiLivingFeedbackActionVisible",
            "battleReportDetailAiLivingFeedbackReasonVisible",
            "battleReportDetailAiLivingFeedbackResultVisible",
            "battleReportDetailAiActivityContinuityToken",
            "battleReportDetailAiActivityContinuityVisible",
            "battleReportDetailAiActivityAvatarVisible",
            "battleReportDetailAiActivityAvatarStatusFrameFamilyContract",
            "battleReportDetailAiActivityAvatarStatusFrameVisible",
            "battleReportDetailAiActivityAvatarIntentBadgeVisible",
            "battleReportDetailAiActivityStatusDotVisible",
            "battleReportDetailAiActivityTraceCount",
            "battleReportDetailAiActivityCarryingTroopsChipContract",
            "battleReportDetailAiActivityCarryingTroopsGeneratedAssetSource",
            "battleReportDetailAiActivityCarryingTroopsChipVisible",
            "battleReportDetailAiActivityCarryingTroopsSlotCount",
            "battleReportDetailAiActivityCarryingTroopsTextureCount",
            "battleReportDetailAiActivityCarryingTroopsLabels",
            "battleReportDetailPlayerCopyOk",
            "visibleCopyForbiddenHits",
            "playerVisibleEngineeringCopyLeak",
            "sourceLabelVisible",
            "styleOwner",
            "battleReportFirstOpenStampMotionToken",
            "battleReportFirstOpenStampVisible",
            "battleReportFirstOpenStampNodeCount",
            "battleReportFirstOpenStampMotionBound",
            "battleReportFirstOpenStampMotionScope",
        ],
    },
    "battle_report_open_stats": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_open_stats_scroll": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_detail_three_tabs": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_detail_battlefield_tab_action": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_detail_battlefield_tab_button_identity": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_detail_stats_tab_action": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_detail_stats_tab_button_identity": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_detail_formation_tab_action": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_detail_formation_tab_button_identity": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_detail_back_action": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_detail_back_button_identity": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_detail_share_button_identity": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_detail_favorite_button_identity": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_detail_replay_button_identity": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_detail_replay_screen_open": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_list_density": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
        "required_summary_fields": [
            "battleReportListAiActionResultCardVisible",
            "battleReportListAiActionResultCardVisibleCount",
            "battleReportListActionResultCardVisibleCount",
            "battleReportListPlayerUiGovernanceContractId",
            "battleReportListPlayerUiGovernanceVerified",
            "battleReportListForbiddenVisibleCopyClear",
            "battleReportListVisibleDensityOk",
            "battleReportListHeroCardReadabilityToken",
            "battleReportListHeroInfoPlateVisibleCount",
            "battleReportListHeroInfoPlateMinHeight",
        ],
    },
    "battle_report_backend_natural_language_fixture": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "battle_report_backend_daily_summary_fixture": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "battle_report",
    },
    "ai_panel_backend_daily_summary_fixture": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "ai_hub",
    },
    "ai_panel_execution_trace_fixture": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "ai_hub",
    },
    "player_history_ai_proposal_denied_panel_open": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "player_history",
    },
    "player_history_ai_proposal_denied_visible_receipt": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "player_history",
    },
    "player_history_ai_proposal_apply_panel_open": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "player_history",
    },
    "ai_hub_proposal_approve_result_smoke": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "ai_hub_proposal_reject_result_smoke": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "ai_hub",
    },
    "player_history_ai_execution_receipt_panel_open": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "player_history",
    },
    "player_history_ai_tile_abandon_receipt_visible": {
        "display_mode": "city",
        "world_action": "none",
        "panel_id": "player_history",
    },
    "alliance_backend_campaign_summary_fixture": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "alliance",
    },
    "alliance_backend_enemy_dossier_battle_reports_fixture": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "alliance",
    },
    "alliance_backend_enemy_dossier_detail_fixture": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "alliance",
    },
    "world_affairs_backend_campaign_summary_fixture": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "world_affairs",
    },
    "player_history_court_recovery_civil_memory": {
        "display_mode": "world",
        "world_action": "open_hub_panel",
        "panel_id": "player_history",
    },
}


def _resolve_npm_exe() -> str:
    return "npm.cmd" if os.name == "nt" else "npm"


def _run_service_process_prestart_guard(log_path: Path) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [_resolve_npm_exe(), "run", "ops:service-process-prestart"],
        cwd=REPO_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if result.stdout:
        with log_path.open("a", encoding="utf-8", errors="replace") as guard_log:
            guard_log.write("[service-process-prestart]\n")
            guard_log.write(result.stdout)
            if not result.stdout.endswith("\n"):
                guard_log.write("\n")
    if result.returncode != 0:
        raise RuntimeError("service_process_prestart_failed")


def _load_godot_launcher_module():
    launcher_path = REPO_ROOT / "scripts" / "launch_godot.py"
    spec = importlib.util.spec_from_file_location("launch_godot", launcher_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"unable to load {launcher_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _allocate_local_backend_url() -> str:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        port = int(sock.getsockname()[1])
    return f"http://127.0.0.1:{port}"


def _is_isolated_ai_home_city_binding(args: argparse.Namespace) -> bool:
    return bool(getattr(args, "isolated_ai_home_city_binding", False)) or args.click_action == "ai_panel_home_city_bind_open_chain_isolated"


def _is_ai_switch_home_city_visual_acceptance(args: argparse.Namespace) -> bool:
    return args.click_action == "world_ai_switch_open_home_city"


def _apply_voice_playback_backend_env(args: argparse.Namespace, env: dict[str, str]) -> None:
    if args.click_action != "shell_open_chat_default_report_voice_playback":
        return
    env.setdefault("AI_PLAYER_VOICE_TTS_PROVIDER", "mock")
    env.setdefault("AI_PLAYER_COMBAT_DEFAULT_REPORT_VOICE_ALLOW_MOCK_AUDIO", "true")


def _build_isolated_backend_state_env(evidence_dir: Path, dirname: str = "isolated_backend_state") -> dict[str, str]:
    state_dir = evidence_dir / dirname
    return {
        "AI_PLAYER_GOVERNANCE_STATE_PATH": str(state_dir / "ai_player_governance_state.json"),
        "SESSION_STATE_PERSIST_PATH": str(state_dir / "session_state.json"),
        "WORLD_STATE_PERSIST_PATH": str(state_dir / "world_snapshot.json"),
        "WORLD_SAVE_SLOTS_PATH": str(state_dir / "world_save_slots.json"),
        "WORLD_SAVE_SLOTS_ARCHIVE_DIR": str(state_dir / "world_save_slots_archive"),
        "V2_GAME_STATE_PATH": str(state_dir / "v2_game_state.json"),
    }


def _build_isolated_ai_home_city_backend_env(evidence_dir: Path) -> dict[str, str]:
    return _build_isolated_backend_state_env(evidence_dir, "isolated_backend_state")


def _resolve_visual_smoke_panel_id(panel_id: str) -> str:
    normalized = str(panel_id or "").strip()
    return PANEL_ID_ALIASES.get(normalized, normalized)


def _apply_main_city_click_action_defaults(args: argparse.Namespace) -> None:
    defaults = MAIN_CITY_CLICK_ACTION_DEFAULTS.get(args.click_action)
    if not defaults:
        return
    args.display_mode = str(defaults.get("display_mode", args.display_mode))
    args.world_action = str(defaults.get("world_action", args.world_action))
    if "panel_id" in defaults:
        args.panel_id = str(defaults["panel_id"])
    if "seed_ai_governor_player_id" in defaults:
        args.seed_ai_governor_player_id = str(defaults["seed_ai_governor_player_id"])


def _health_url(backend_url: str) -> str:
    return backend_url.rstrip("/") + "/api/health"


def _read_health(backend_url: str, timeout_sec: float = 3.0) -> dict[str, Any]:
    started = time.perf_counter()
    url = _health_url(backend_url)
    try:
        with urllib.request.urlopen(url, timeout=timeout_sec) as response:
            raw = response.read().decode("utf-8", errors="replace")
            data: Any = json.loads(raw) if raw.strip() else {}
            status = int(getattr(response, "status", 0))
            return {
                "ok": 200 <= status < 300,
                "status": status,
                "durationMs": round((time.perf_counter() - started) * 1000),
                "url": url,
                "data": data,
            }
    except urllib.error.HTTPError as exc:
        return {
            "ok": False,
            "status": int(exc.code),
            "durationMs": round((time.perf_counter() - started) * 1000),
            "url": url,
            "error": "http_error",
            "message": str(exc),
        }
    except Exception as exc:
        return {
            "ok": False,
            "status": -1,
            "durationMs": round((time.perf_counter() - started) * 1000),
            "url": url,
            "error": "url_error",
            "message": str(exc),
        }


def _wait_for_health(backend_url: str, timeout_sec: float) -> dict[str, Any]:
    deadline = time.perf_counter() + timeout_sec
    last_result: dict[str, Any] = {}
    while time.perf_counter() <= deadline:
        last_result = _read_health(backend_url)
        if bool(last_result.get("ok", False)):
            return last_result
        time.sleep(1.0)
    return last_result


def _tail_text(path: Path, max_chars: int = 4000) -> str:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return ""
    if len(text) <= max_chars:
        return text
    return text[-max_chars:]


def _classify_godot_log_failure(log_text: str) -> str:
    if re.search(r"Parse Error|Failed to load script", log_text, flags=re.IGNORECASE):
        return "godot_parse_error"
    if re.search(r"CrashHandlerException|signal 11|Parameter \"mem\" is null", log_text, flags=re.IGNORECASE):
        return "godot_native_crash"
    return "godot_preflight_failed"


def _run_godot_script_preflight(args: argparse.Namespace, evidence_dir: Path) -> dict[str, Any]:
    launcher = _load_godot_launcher_module()
    godot_exe = launcher.resolve_godot_exe("runtime", args.godot_exe)
    if not godot_exe:
        return {"ok": False, "reason": "godot_executable_not_resolved"}
    report_path = evidence_dir / "godot_script_preflight_report.json"
    log_path = evidence_dir / "godot_script_preflight.log"
    command = [
        godot_exe,
        "--path",
        str(Path(args.project_path).resolve()),
        "--scene",
        args.scene,
    ]
    env = os.environ.copy()
    env["SLG_MAINLINE_VISUAL_SMOKE_PREFLIGHT_ONLY"] = "1"
    env["SLG_MAINLINE_VISUAL_SMOKE_REPORT"] = str(report_path)
    started = time.perf_counter()
    with log_path.open("w", encoding="utf-8") as log_file:
        try:
            completed = subprocess.run(
                command,
                cwd=REPO_ROOT,
                stdout=log_file,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                text=True,
                encoding="utf-8",
                env=env,
                timeout=max(15.0, min(float(args.timeout_sec), 45.0)),
            )
        except subprocess.TimeoutExpired:
            log_text = _tail_text(log_path)
            return {
                "ok": False,
                "reason": "godot_script_preflight_timeout",
                "durationMs": round((time.perf_counter() - started) * 1000),
                "logPath": str(log_path),
                "logTail": log_text,
                "failureKind": _classify_godot_log_failure(log_text),
            }
    preflight_report = _read_json(report_path) if report_path.exists() else {}
    log_text = _tail_text(log_path)
    ok = completed.returncode == 0 and bool(preflight_report.get("ok", False))
    return {
        "ok": ok,
        "reason": "godot_script_preflight_ok" if ok else "godot_script_preflight_failed",
        "durationMs": round((time.perf_counter() - started) * 1000),
        "returnCode": completed.returncode,
        "command": command,
        "reportPath": str(report_path),
        "logPath": str(log_path),
        "report": preflight_report,
        "failureKind": "" if ok else _classify_godot_log_failure(log_text),
        "logTail": "" if ok else log_text,
    }


def _request_json(
    backend_url: str,
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
    timeout_sec: float = 6.0,
    headers: dict[str, str] | None = None,
) -> dict[str, Any]:
    url = backend_url.rstrip("/") + path
    data = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request_headers = dict(headers or {})
    if payload is not None:
        request_headers["Content-Type"] = "application/json"
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers=request_headers,
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout_sec) as response:
            raw = response.read().decode("utf-8", errors="replace")
            return {
                "ok": 200 <= int(getattr(response, "status", 0)) < 300,
                "status": int(getattr(response, "status", 0)),
                "data": json.loads(raw) if raw.strip() else {},
            }
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        return {
            "ok": False,
            "status": int(exc.code),
            "data": json.loads(raw) if raw.strip() else {},
            "error": "http_error",
            "message": str(exc),
        }
    except Exception as exc:
        return {
            "ok": False,
            "status": -1,
            "data": {},
            "error": "url_error",
            "message": str(exc),
        }


def _read_recruit_draw_fixture_state(backend_url: str, faction_id: str) -> dict[str, Any]:
    result = _request_json(backend_url, "GET", "/api/world?intelMode=full", timeout_sec=30.0)
    if not bool(result.get("ok", False)):
        return {"ok": False, "reason": "world_read_failed", "http": result}
    data = result.get("data", {}) if isinstance(result.get("data", {}), dict) else {}
    world = data.get("world", {}) if isinstance(data.get("world", {}), dict) else {}
    factions = world.get("factions", {}) if isinstance(world.get("factions", {}), dict) else {}
    faction = factions.get(faction_id, {}) if isinstance(factions.get(faction_id, {}), dict) else {}
    hero_command = faction.get("heroCommand", {}) if isinstance(faction.get("heroCommand", {}), dict) else {}
    development_points = int(hero_command.get("developmentPoints", 0) or 0)
    acquisition_threshold = max(1, int(hero_command.get("acquisitionThreshold", 0) or 0))
    prospects = hero_command.get("prospectHeroIds", [])
    prospect_count = len(prospects) if isinstance(prospects, list) else 0
    remaining_points = max(0, development_points)
    remaining_prospects = max(0, prospect_count)
    next_threshold = acquisition_threshold
    available_draw_count = 0
    while remaining_prospects > 0 and remaining_points >= next_threshold:
        remaining_points -= next_threshold
        next_threshold = min(36, next_threshold + 2)
        remaining_prospects -= 1
        available_draw_count += 1
    return {
        "ok": True,
        "availableDrawCount": available_draw_count,
        "developmentPoints": development_points,
        "acquisitionThreshold": acquisition_threshold,
        "prospectCount": prospect_count,
    }


def _seed_recruit_draw_fixture(args: argparse.Namespace) -> dict[str, Any]:
    if args.click_action not in RECRUIT_DRAW_CLICK_ACTIONS:
        return {"ok": True, "skipped": True, "reason": "recruit_draw_seed_not_requested"}

    faction_id = str(args.seed_ai_faction_id).strip() or "player"
    before = _read_recruit_draw_fixture_state(args.backend_url, faction_id)
    if not bool(before.get("ok", False)):
        return before
    if int(before.get("availableDrawCount", 0) or 0) >= 1:
        return {
            "ok": True,
            "factionId": faction_id,
            "advancedTickCount": 0,
            "before": before,
            "after": before,
        }

    seed = _request_json(
        args.backend_url,
        "POST",
        "/api/world/action?includeWorld=false",
        {
            "action": "seedRecruitDrawFixture",
            "payload": {
                "factionId": faction_id,
                "minimumDrawCount": 5,
                "minimumProspectCount": 5,
            },
        },
        timeout_sec=30.0,
    )
    seed_data = seed.get("data", {}) if isinstance(seed.get("data", {}), dict) else {}
    if not bool(seed.get("ok", False)) or not bool(seed_data.get("ok", False)):
        return {
            "ok": False,
            "reason": "seed_recruit_draw_fixture_action_failed",
            "factionId": faction_id,
            "before": before,
            "http": seed,
        }
    after = _read_recruit_draw_fixture_state(args.backend_url, faction_id)
    return {
        "ok": bool(after.get("ok", False)) and int(after.get("availableDrawCount", 0) or 0) >= 1,
        "reason": "seeded_recruit_draw_fixture" if int(after.get("availableDrawCount", 0) or 0) >= 1 else "available_draw_count_not_reached",
        "factionId": faction_id,
        "before": before,
        "after": after,
        "seed": seed,
    }


def _seed_nation_empire_success_fixture(args: argparse.Namespace) -> dict[str, Any]:
    if args.click_action not in {
        "world_open_main_city_organization_nation_empire_submit_success",
        "world_open_main_city_organization_nation_midgame_frontend",
        "world_open_main_city_organization_nation_midgame_route_luoyang",
        "world_open_main_city_organization_nation_midgame_luoyang_route",
        "world_open_main_city_organization_nation_midgame_luoyang_feedback",
        "world_open_main_city_organization_nation_midgame_luoyang_authority_claim",
        "world_open_main_city_organization_nation_midgame_luoyang_battle_report_feedback",
        "world_open_main_city_organization_nation_midgame_luoyang_control_authority",
        "world_open_main_city_organization_nation_midgame_luoyang_prefecture_control_judgment",
        "world_open_main_city_organization_nation_midgame_realm_objective_bridge",
        "world_open_main_city_organization_home_entry_nation_midgame",
        "world_open_main_city_tasks_nation_midgame_entry",
        "world_open_main_world_current_goals_nation_midgame_entry",
    }:
        return {"ok": True, "skipped": True, "reason": "nation_empire_success_fixture_not_requested"}

    faction_id = str(args.seed_ai_faction_id).strip() or "player"
    seed_action = (
        "seedNationMidgameFrontendFixture"
        if args.click_action in {
            "world_open_main_city_organization_nation_midgame_frontend",
            "world_open_main_city_organization_nation_midgame_route_luoyang",
            "world_open_main_city_organization_nation_midgame_luoyang_route",
            "world_open_main_city_organization_nation_midgame_luoyang_feedback",
            "world_open_main_city_organization_nation_midgame_luoyang_authority_claim",
            "world_open_main_city_organization_nation_midgame_luoyang_battle_report_feedback",
            "world_open_main_city_organization_nation_midgame_luoyang_control_authority",
            "world_open_main_city_organization_nation_midgame_luoyang_prefecture_control_judgment",
            "world_open_main_city_organization_nation_midgame_realm_objective_bridge",
            "world_open_main_city_organization_home_entry_nation_midgame",
            "world_open_main_city_tasks_nation_midgame_entry",
            "world_open_main_world_current_goals_nation_midgame_entry",
        }
        else "seedNationEmpireSuccessFixture"
    )
    seed = _request_json(
        args.backend_url,
        "POST",
        "/api/world/action?includeWorld=false",
        {
            "action": "seedNationEmpireSuccessFixture",
            "payload": {
                "factionId": faction_id,
            },
        },
        timeout_sec=30.0,
    )
    seed_data = seed.get("data", {}) if isinstance(seed.get("data", {}), dict) else {}
    fixture = seed_data.get("seededNationEmpireSuccessFixture", {}) if isinstance(seed_data, dict) else {}
    if not isinstance(fixture, dict):
        fixture = {}
    ok = (
        bool(seed.get("ok", False))
        and bool(seed_data.get("ok", False))
        and str(fixture.get("factionId", "")).strip() == faction_id
        and int(fixture.get("controlledCommanderyCityCount", 0) or 0) >= 10
        and int(fixture.get("controlledStateCapitalCount", 0) or 0) >= 1
        and int(fixture.get("allianceLevel", 0) or 0) >= 90
        and int(fixture.get("jade", 0) or 0) >= 200
        and str(fixture.get("nationTier", "")).strip() == "kingdom"
    )
    return {
        "ok": ok,
        "reason": "seeded_nation_empire_success_fixture" if ok else "nation_empire_success_fixture_not_ready",
        "factionId": faction_id,
        "action": seed_action,
        "fixture": fixture,
        "seed": seed,
    }


def _seed_world_tasks_chapter_fixture(args: argparse.Namespace) -> dict[str, Any]:
    target_chapter_id = str(getattr(args, "seed_world_tasks_chapter_id", "")).strip()
    if target_chapter_id == "":
        return {"ok": True, "skipped": True, "reason": "world_tasks_chapter_seed_not_requested"}
    target_task_ids_by_chapter = {
        "huangtian_chapter_02": [
            "huangtian_task_01_confirm_city",
            "huangtian_task_02_prepare_supplies",
            "huangtian_task_03_survey_mines",
        ],
        "huangtian_chapter_03": [
            "huangtian_task_01_confirm_city",
            "huangtian_task_02_prepare_supplies",
            "huangtian_task_03_survey_mines",
            "huangtian_task_04_register_militia",
            "huangtian_task_05_drill_ground",
            "huangtian_task_06_assign_patrol",
        ],
    }
    task_ids = target_task_ids_by_chapter.get(target_chapter_id)
    if task_ids is None:
        return {
            "ok": False,
            "reason": "unsupported_world_tasks_chapter_seed",
            "targetChapterId": target_chapter_id,
        }
    action_results: list[dict[str, Any]] = []
    for task_id in task_ids:
        payload = {
            "factionId": "player",
            "scenarioId": "huangtian_dangli",
            "scenarioVersion": "huangtian_dangli_v1",
            "seasonRunId": "season_run_proto_2026_04",
            "taskId": task_id,
        }
        achieve = _request_json(
            args.backend_url,
            "POST",
            "/api/world/action?includeWorld=false",
            {"action": "achieveTaskPrototype", "payload": payload},
            timeout_sec=30.0,
        )
        achieve_data = achieve.get("data", {}) if isinstance(achieve.get("data", {}), dict) else {}
        action_results.append({"taskId": task_id, "action": "achieveTaskPrototype", "http": achieve})
        if not bool(achieve.get("ok", False)) or not bool(achieve_data.get("ok", False)):
            return {
                "ok": False,
                "reason": "world_tasks_chapter_seed_achieve_failed",
                "targetChapterId": target_chapter_id,
                "taskId": task_id,
                "actions": action_results,
            }
        claim = _request_json(
            args.backend_url,
            "POST",
            "/api/world/action?includeWorld=false",
            {"action": "claimTaskReward", "payload": payload},
            timeout_sec=30.0,
        )
        claim_data = claim.get("data", {}) if isinstance(claim.get("data", {}), dict) else {}
        action_results.append({"taskId": task_id, "action": "claimTaskReward", "http": claim})
        if not bool(claim.get("ok", False)) or not bool(claim_data.get("ok", False)):
            return {
                "ok": False,
                "reason": "world_tasks_chapter_seed_claim_failed",
                "targetChapterId": target_chapter_id,
                "taskId": task_id,
                "actions": action_results,
            }
    world = _request_json(args.backend_url, "GET", "/api/world?intelMode=sparse", timeout_sec=30.0)
    world_data = world.get("data", {}) if isinstance(world.get("data", {}), dict) else {}
    world_state = world_data.get("world", {}) if isinstance(world_data.get("world", {}), dict) else {}
    world_tasks = world_state.get("worldTasks", {}) if isinstance(world_state.get("worldTasks", {}), dict) else {}
    active_chapter_id = str(world_tasks.get("activeChapterId", "")).strip()
    return {
        "ok": active_chapter_id == target_chapter_id,
        "reason": "seeded_world_tasks_chapter" if active_chapter_id == target_chapter_id else "world_tasks_chapter_seed_not_reached",
        "targetChapterId": target_chapter_id,
        "activeChapterId": active_chapter_id,
        "actions": action_results,
    }


def _seed_first_hour_task_claim_prompt_fixture(args: argparse.Namespace) -> dict[str, Any]:
    if not bool(getattr(args, "seed_first_hour_task_claim_prompt_fixture", False)):
        return {"ok": True, "skipped": True, "reason": "first_hour_task_claim_prompt_seed_not_requested"}
    payload = {
        "factionId": "player",
        "scenarioId": "huangtian_dangli",
        "scenarioVersion": "huangtian_dangli_v1",
        "seasonRunId": "season_run_proto_2026_04",
        "taskId": "huangtian_task_01_confirm_city",
    }
    action_results: list[dict[str, Any]] = []
    achieve = _request_json(
        args.backend_url,
        "POST",
        "/api/world/action?includeWorld=false",
        {"action": "achieveTaskPrototype", "payload": payload},
        timeout_sec=30.0,
    )
    action_results.append({"taskId": payload["taskId"], "action": "achieveTaskPrototype", "http": achieve})
    achieve_data = achieve.get("data", {}) if isinstance(achieve.get("data", {}), dict) else {}
    if not bool(achieve.get("ok", False)) or (
        not bool(achieve_data.get("ok", False))
        and str(achieve_data.get("failureCode", "")).strip() != "task_already_achieved"
    ):
        return {
            "ok": False,
            "reason": "first_hour_task_claim_prompt_seed_achieve_task01_failed",
            "actions": action_results,
        }
    claim = _request_json(
        args.backend_url,
        "POST",
        "/api/world/action?includeWorld=false",
        {"action": "claimTaskReward", "payload": payload},
        timeout_sec=30.0,
    )
    action_results.append({"taskId": payload["taskId"], "action": "claimTaskReward", "http": claim})
    claim_data = claim.get("data", {}) if isinstance(claim.get("data", {}), dict) else {}
    if not bool(claim.get("ok", False)) or (
        not bool(claim_data.get("ok", False))
        and str(claim_data.get("failureCode", "")).strip() != "task_already_claimed"
    ):
        return {
            "ok": False,
            "reason": "first_hour_task_claim_prompt_seed_claim_task01_failed",
            "actions": action_results,
        }
    target_payload = {
        **payload,
        "taskId": "huangtian_task_02_prepare_supplies",
    }
    achieve_target = _request_json(
        args.backend_url,
        "POST",
        "/api/world/action?includeWorld=false",
        {"action": "achieveTaskPrototype", "payload": target_payload},
        timeout_sec=30.0,
    )
    action_results.append({"taskId": target_payload["taskId"], "action": "achieveTaskPrototype", "http": achieve_target})
    achieve_target_data = achieve_target.get("data", {}) if isinstance(achieve_target.get("data", {}), dict) else {}
    if not bool(achieve_target.get("ok", False)) or (
        not bool(achieve_target_data.get("ok", False))
        and str(achieve_target_data.get("failureCode", "")).strip() != "task_already_achieved"
    ):
        return {
            "ok": False,
            "reason": "first_hour_task_claim_prompt_seed_achieve_task02_failed",
            "actions": action_results,
        }
    return {
        "ok": True,
        "reason": "seeded_first_hour_task_claim_prompt_fixture",
        "claimedTaskId": payload["taskId"],
        "targetTaskId": "huangtian_task_02_prepare_supplies",
        "actions": action_results,
    }


def _extract_world_affairs_read_model(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return {}
    world_affairs = payload.get("worldAffairs", {})
    if isinstance(world_affairs, dict):
        return world_affairs
    return payload


def _find_world_affairs_node(read_model: dict[str, Any], node_id: str) -> dict[str, Any]:
    nodes = read_model.get("nodes", [])
    if not isinstance(nodes, list):
        return {}
    for node in nodes:
        if isinstance(node, dict) and str(node.get("nodeId", "")).strip() == node_id:
            return node
    return {}


def _seed_world_affairs_claimable_node_fixture(args: argparse.Namespace) -> dict[str, Any]:
    if not bool(getattr(args, "seed_world_affairs_claimable_node", False)):
        return {"ok": True, "skipped": True, "reason": "world_affairs_claimable_node_seed_not_requested"}

    initial = _request_json(args.backend_url, "GET", "/api/world/world-affairs", timeout_sec=30.0)
    if not bool(initial.get("ok", False)):
        return {"ok": False, "reason": "world_affairs_read_model_initial_failed", "http": initial}
    read_model = _extract_world_affairs_read_model(initial.get("data", {}))
    active_node_id = str(read_model.get("activeNodeId", "")).strip()
    nodes = read_model.get("nodes", [])
    if not isinstance(nodes, list):
        nodes = []
    target_node: dict[str, Any] = _find_world_affairs_node(read_model, active_node_id) if active_node_id else {}
    if not target_node:
        for node in nodes:
            if isinstance(node, dict) and str(node.get("status", "")).strip() == "active":
                target_node = node
                active_node_id = str(node.get("nodeId", "")).strip()
                break
    if not target_node or not active_node_id:
        return {"ok": False, "reason": "world_affairs_active_node_missing", "readModel": read_model}

    scenario_id = str(read_model.get("scenarioId", "")).strip()
    scenario_version = str(read_model.get("scenarioVersion", "")).strip()
    season_run_id = str(read_model.get("seasonRunId", "")).strip()
    if not scenario_id or not scenario_version or not season_run_id:
        return {
            "ok": False,
            "reason": "world_affairs_seed_identity_missing",
            "scenarioId": scenario_id,
            "scenarioVersion": scenario_version,
            "seasonRunId": season_run_id,
            "nodeId": active_node_id,
        }

    action_results: list[dict[str, Any]] = []
    if bool(target_node.get("canClaim", False)) and str(target_node.get("claimState", "")).strip() == "claimable":
        return {
            "ok": True,
            "reason": "world_affairs_node_already_claimable",
            "claimableNodeId": active_node_id,
            "actions": action_results,
        }

    payload = {
        "factionId": "player",
        "scenarioId": scenario_id,
        "scenarioVersion": scenario_version,
        "seasonRunId": season_run_id,
        "nodeId": active_node_id,
    }
    achieve = _request_json(
        args.backend_url,
        "POST",
        "/api/world/action?includeWorld=false",
        {"action": "achieveWorldAffairsNode", "payload": payload},
        timeout_sec=30.0,
    )
    action_results.append({"nodeId": active_node_id, "action": "achieveWorldAffairsNode", "http": achieve})
    achieve_data = achieve.get("data", {}) if isinstance(achieve.get("data", {}), dict) else {}
    if not bool(achieve.get("ok", False)) or (
        not bool(achieve_data.get("ok", False))
        and str(achieve_data.get("failureCode", "")).strip() != "world_affairs_node_already_achieved"
    ):
        return {
            "ok": False,
            "reason": "world_affairs_claimable_node_seed_achieve_failed",
            "claimableNodeId": active_node_id,
            "actions": action_results,
        }

    after = _request_json(args.backend_url, "GET", "/api/world/world-affairs", timeout_sec=30.0)
    if not bool(after.get("ok", False)):
        return {"ok": False, "reason": "world_affairs_read_model_after_seed_failed", "actions": action_results, "http": after}
    after_model = _extract_world_affairs_read_model(after.get("data", {}))
    after_node = _find_world_affairs_node(after_model, active_node_id)
    claimable = bool(after_node.get("canClaim", False)) and str(after_node.get("claimState", "")).strip() == "claimable"
    return {
        "ok": claimable,
        "reason": "seeded_world_affairs_claimable_node_fixture" if claimable else "world_affairs_seeded_node_not_claimable",
        "claimableNodeId": active_node_id,
        "claimState": str(after_node.get("claimState", "")).strip(),
        "canClaim": bool(after_node.get("canClaim", False)),
        "actions": action_results,
    }


def _seed_ai_avatar_profile(args: argparse.Namespace) -> dict[str, Any]:
    avatar_id = str(args.seed_ai_avatar_id).strip()
    avatar_image = str(args.seed_ai_avatar_image).strip()
    if not avatar_id or not avatar_image:
        return {"ok": True, "skipped": True, "reason": "seed_ai_avatar_not_requested"}

    ai_player_id = str(args.seed_ai_player_id).strip() or "player_operator_alpha"
    display_name = str(args.seed_ai_display_name).strip() or "青州后勤官"
    governor_player_id = str(args.seed_ai_governor_player_id).strip() or "human_alpha"
    faction_id = str(args.seed_ai_faction_id).strip() or "player"
    register_payload = {
        "aiPlayerId": ai_player_id,
        "displayName": display_name,
        "governorPlayerId": governor_player_id,
        "factionId": faction_id,
        "avatarId": avatar_id,
        "avatarImagePath": avatar_image,
        "actionWhitelist": ["resource_transfer_to_governor", "resource_gather", "reward_claim"],
    }
    register_result = _request_json(args.backend_url, "POST", "/api/ai/players", register_payload)
    register_ok = bool(register_result.get("ok", False)) or int(register_result.get("status", -1)) == 409
    profile_path = "/api/ai/players/%s/profile" % urllib.parse.quote(ai_player_id, safe="")
    profile_result = _request_json(args.backend_url, "POST", profile_path, {
        "displayName": display_name,
        "avatarId": avatar_id,
        "avatarImagePath": avatar_image,
        "updatedBy": "visual_smoke_seed",
    })
    return {
        "ok": register_ok and bool(profile_result.get("ok", False)),
        "aiPlayerId": ai_player_id,
        "displayName": display_name,
        "avatarId": avatar_id,
        "avatarImagePath": avatar_image,
        "register": register_result,
        "profile": profile_result,
    }


def _seed_ai_player_for_voice_playback(args: argparse.Namespace) -> dict[str, Any]:
    if args.click_action not in {"shell_open_chat_voice_playback", "shell_open_chat_default_report_voice_playback", "shell_open_chat_default_report_voice_unavailable", "shell_open_chat_war_room_report_fixture", "shell_open_chat_ai_activity_continuity_fixture", "ai_activity_same_trace_cross_surface_fixture", "ai_panel_voice_settings_save_selected", "ai_panel_voice_settings_refresh_action", "ai_panel_voice_settings_save_action", "ai_panel_open_chat_channel"}:
        return {"ok": True, "skipped": True, "reason": "voice_playback_seed_not_requested"}

    ai_player_id = str(args.seed_ai_player_id).strip() or "player_operator_alpha"
    display_name = str(args.seed_ai_display_name).strip() or "青州后勤官"
    governor_player_id = str(args.seed_ai_governor_player_id).strip() or "human_alpha"
    faction_id = str(args.seed_ai_faction_id).strip() or "player"
    join_result = _request_json(args.backend_url, "POST", "/api/session/join", {
        "factionId": faction_id,
        "playerName": governor_player_id,
    })
    register_result = _request_json(args.backend_url, "POST", "/api/ai/players", {
        "aiPlayerId": ai_player_id,
        "displayName": display_name,
        "governorPlayerId": governor_player_id,
        "factionId": faction_id,
        "actionWhitelist": [
            "city_upgrade",
            "building_upgrade",
            "queue_fill_idle_slot",
            "research_start",
            "troop_train",
            "troop_heal",
            "recruit_pool_select",
            "recruit_commander",
            "world_scout",
            "march_move",
            "garrison_set",
            "resource_gather",
            "tile_occupy",
            "troop_facility_upgrade",
            "general_focus_set",
            "formation_assign",
            "threat_escape",
            "alliance_help",
            "alliance_defense_assign",
            "alliance_defense_batch_assign",
            "city_siege",
            "rally_launch",
            "rally_join",
            "reward_claim",
            "battle_report_read",
        ],
    })
    profile_path = "/api/ai/players/%s/profile" % urllib.parse.quote(ai_player_id, safe="")
    allow_combat_voice_reports = args.click_action != "shell_open_chat_war_room_report_fixture"
    profile_result = _request_json(args.backend_url, "POST", profile_path, {
        "displayName": display_name,
        "updatedBy": governor_player_id,
        "runtimePolicy": {
            "allowAutonomousCombatDailySummaryChatReports": True,
            "allowAutonomousCombatWarEventChatReports": True,
            "allowAutonomousCombatVoiceReports": allow_combat_voice_reports,
        },
    })
    join_ok = bool(join_result.get("ok", False)) or int(join_result.get("status", -1)) == 409
    register_ok = bool(register_result.get("ok", False)) or int(register_result.get("status", -1)) == 409
    profile_ok = bool(profile_result.get("ok", False))
    combat_report_seed = {"ok": True, "skipped": True, "reason": "default_combat_report_seed_not_requested"}
    if args.click_action in {"shell_open_chat_default_report_voice_playback", "shell_open_chat_default_report_voice_unavailable"}:
        combat_report_seed = _seed_ai_player_default_combat_report_for_voice_playback(args, ai_player_id)
    if args.click_action == "shell_open_chat_war_room_report_fixture":
        combat_report_seed = _seed_ai_player_war_room_default_events(
            args,
            ai_player_id,
            governor_player_id,
            faction_id,
        )
    combat_report_seed_ok = bool(combat_report_seed.get("ok", False))
    return {
        "ok": join_ok and register_ok and profile_ok and combat_report_seed_ok,
        "aiPlayerId": ai_player_id,
        "displayName": display_name,
        "governorPlayerId": governor_player_id,
        "factionId": faction_id,
        "join": join_result,
        "register": register_result,
        "profile": profile_result,
        "defaultCombatReportSeed": combat_report_seed,
    }


def _seed_ai_player_default_combat_report_for_voice_playback(args: argparse.Namespace, ai_player_id: str) -> dict[str, Any]:
    battle_digest_seed = _seed_ai_player_coordinate_battle_digest_fixture(args, ai_player_id)
    if not bool(battle_digest_seed.get("ok", False)):
        return {
            "ok": False,
            "reason": "default_combat_report_coordinate_digest_seed_failed",
            "aiPlayerId": ai_player_id,
            "battleDigestSeed": battle_digest_seed,
        }

    summary_path = "/api/ai/players/%s/autonomous-combat/daily-summary?limit=20" % urllib.parse.quote(ai_player_id, safe="")
    summary_result = _request_json(args.backend_url, "GET", summary_path, timeout_sec=30.0)
    summary_payload = summary_result.get("data", {}) if isinstance(summary_result.get("data", {}), dict) else {}
    summary_body = summary_payload.get("summary", {}) if isinstance(summary_payload.get("summary", {}), dict) else {}
    battle_digest = summary_body.get("battleDigest", {}) if isinstance(summary_body.get("battleDigest", {}), dict) else {}
    visible_report_count = int(battle_digest.get("visibleBattleReportCount", battle_digest.get("visibleRelevantReportCount", 0)) or 0)
    omitted_report_count = int(battle_digest.get("omittedRelevantReportCount", 0) or 0)
    ok = bool(summary_result.get("ok", False)) and visible_report_count > 0 and omitted_report_count > 0
    return {
        "ok": ok,
        "reason": "default_combat_report_seeded" if ok else "default_combat_report_daily_summary_seed_failed",
        "aiPlayerId": ai_player_id,
        "battleDigestSeed": battle_digest_seed,
        "visibleRelevantReportCount": visible_report_count,
        "omittedRelevantReportCount": omitted_report_count,
        "dailySummary": summary_result,
    }


def _seed_ai_player_coordinate_battle_digest_fixture(args: argparse.Namespace, ai_player_id: str) -> dict[str, Any]:
    faction_id = str(args.seed_ai_faction_id).strip() or "player"
    organization_id = faction_id
    organization_name = "青州同盟"
    result = _request_json(
        args.backend_url,
        "POST",
        "/api/world/action?includeWorld=false",
        {
            "action": "seedBattleReportClosure",
            "payload": {
                "factionId": faction_id,
                "aiPlayerId": ai_player_id,
                "organizationId": organization_id,
                "organizationName": organization_name,
                "organizationKind": "alliance",
                "repeatCount": 8,
                "allowReusableSeedTargets": True,
            },
        },
        timeout_sec=30.0,
    )
    data = result.get("data", {}) if isinstance(result.get("data", {}), dict) else {}
    total_count = int(data.get("seededBattleReportCount", 0) or 0)
    ai_owned_count = int(data.get("seededBattleReportAiOwnedCount", 0) or 0)
    organization_owned_count = int(data.get("seededBattleReportOrganizationOwnedCount", 0) or 0)
    player_owned_count = int(data.get("seededBattleReportPlayerOwnedCount", 0) or 0)
    ok = (
        bool(result.get("ok", False))
        and bool(data.get("ok", False))
        and total_count >= 32
        and ai_owned_count >= 16
        and organization_owned_count >= 8
        and player_owned_count >= 8
    )
    return {
        "ok": ok,
        "reason": "coordinate_battle_digest_fixture_seeded" if ok else "coordinate_battle_digest_fixture_incomplete",
        "aiPlayerId": ai_player_id,
        "seededBattleReportCount": total_count,
        "seededBattleReportAiOwnedCount": ai_owned_count,
        "seededBattleReportOrganizationOwnedCount": organization_owned_count,
        "seededBattleReportPlayerOwnedCount": player_owned_count,
        "repeatCount": int(data.get("seededBattleReportRepeatCount", 0) or 0),
        "reusableTargets": bool(data.get("seededBattleReportReusableTargets", False)),
        "status": int(result.get("status", -1) or -1),
        "failureCode": data.get("failureCode"),
        "message": data.get("message"),
        "seed": result,
    }


def _extract_war_room_target_tile_id(archive_result: dict[str, Any]) -> str:
    data = archive_result.get("data", {}) if isinstance(archive_result.get("data", {}), dict) else {}
    stack: list[Any] = [data]
    while stack:
        current = stack.pop()
        if isinstance(current, dict):
            target_tile_id = str(current.get("targetTileId", "") or current.get("tileId", "")).strip()
            if target_tile_id:
                return target_tile_id
            stack.extend(current.values())
            continue
        if isinstance(current, list):
            stack.extend(current)
    return ""


def _create_approve_execute_ai_player_proposal(
    args: argparse.Namespace,
    ai_player_id: str,
    governor_player_id: str,
    action: str,
    proposal_args: dict[str, Any],
    reason: str,
) -> dict[str, Any]:
    create_result = _request_json(args.backend_url, "POST", "/api/ai/players/proposals", {
        "aiPlayerId": ai_player_id,
        "action": action,
        "source": "rule",
        "reason": reason,
        "args": proposal_args,
    })
    proposal_data = create_result.get("data", {}) if isinstance(create_result.get("data", {}), dict) else {}
    proposal = proposal_data.get("proposal", {}) if isinstance(proposal_data.get("proposal", {}), dict) else {}
    proposal_id = str(proposal.get("proposalId", "")).strip()
    approve_result: dict[str, Any] = {"ok": True, "skipped": True, "reason": "proposal_already_approved"}
    if proposal_id and str(proposal.get("status", "")).strip() == "pending_approval":
        approve_path = "/api/ai/players/proposals/%s/approve" % urllib.parse.quote(proposal_id, safe="")
        approve_result = _request_json(args.backend_url, "POST", approve_path, {
            "approvedBy": governor_player_id,
        })
    execute_result: dict[str, Any] = {"ok": False, "skipped": True, "reason": "proposal_id_missing"}
    if proposal_id:
        execute_path = "/api/ai/players/proposals/%s/execute" % urllib.parse.quote(proposal_id, safe="")
        execute_result = _request_json(args.backend_url, "POST", execute_path, {
            "executedBy": governor_player_id,
            "includeWorld": False,
        })
    return {
        "ok": bool(create_result.get("ok", False)) and bool(approve_result.get("ok", False)) and bool(execute_result.get("ok", False)),
        "proposalId": proposal_id,
        "create": create_result,
        "approve": approve_result,
        "execute": execute_result,
    }


def _read_ai_player_chat_event_sources(args: argparse.Namespace, ai_player_id: str) -> dict[str, Any]:
    chat_path = "/api/ai/players/%s/chat?limit=30" % urllib.parse.quote(ai_player_id, safe="")
    chat_result = _request_json(args.backend_url, "GET", chat_path)
    data = chat_result.get("data", {}) if isinstance(chat_result.get("data", {}), dict) else {}
    messages = data.get("messages", []) if isinstance(data.get("messages", []), list) else []
    sources: list[str] = []
    for message in messages:
        if not isinstance(message, dict):
            continue
        metadata = message.get("metadata", {})
        if not isinstance(metadata, dict):
            continue
        source = str(metadata.get("source", "")).strip()
        if source and source not in sources:
            sources.append(source)
    required_sources = [
        "autonomous_combat_daily_summary_report",
        "autonomous_combat_siege_report",
        "autonomous_combat_incoming_attack_report",
        "autonomous_combat_defense_outcome_report",
        "autonomous_combat_war_room_report",
    ]
    missing_sources = [source for source in required_sources if source not in sources]
    return {
        "ok": bool(chat_result.get("ok", False)) and not missing_sources,
        "sources": sources,
        "requiredSources": required_sources,
        "missingSources": missing_sources,
        "messageCount": len(messages),
        "chat": chat_result,
    }


def _seed_ai_player_war_room_default_events(
    args: argparse.Namespace,
    ai_player_id: str,
    governor_player_id: str,
    faction_id: str,
) -> dict[str, Any]:
    combat_run = _seed_ai_player_default_combat_report_for_voice_playback(args, ai_player_id)
    daily_summary_path = "/api/ai/players/%s/autonomous-combat/daily-summary?limit=20" % urllib.parse.quote(ai_player_id, safe="")
    daily_summary = _request_json(args.backend_url, "GET", daily_summary_path, timeout_sec=10.0)
    archive_path = "/api/ai/players/%s/autonomous-combat/campaign-archive?limit=20" % urllib.parse.quote(ai_player_id, safe="")
    archive_before_defense = _request_json(args.backend_url, "GET", archive_path, timeout_sec=10.0)
    target_tile_id = _extract_war_room_target_tile_id(archive_before_defense)
    defense_proposal_args: dict[str, Any] = {
        "summary": "同盟战情默认事件需要补上真实驻防结果。",
    }
    if target_tile_id:
        defense_proposal_args["targetTileId"] = target_tile_id
    defense_proposal = _create_approve_execute_ai_player_proposal(
        args,
        ai_player_id,
        governor_player_id,
        "alliance_defense_assign",
        defense_proposal_args,
        "同盟战情默认事件需要真实驻防结果。",
    )
    archive_after_defense = _request_json(args.backend_url, "GET", archive_path, timeout_sec=10.0)
    war_room_path = "/api/ai/players/%s/autonomous-combat/war-room-live-refresh?limit=20&sinceTick=0&viewerFactionId=%s" % (
        urllib.parse.quote(ai_player_id, safe=""),
        urllib.parse.quote(faction_id, safe=""),
    )
    war_room_refresh = _request_json(args.backend_url, "GET", war_room_path, timeout_sec=10.0)
    chat_sources = _read_ai_player_chat_event_sources(args, ai_player_id)
    return {
        "ok": bool(combat_run.get("ok", False))
        and bool(daily_summary.get("ok", False))
        and bool(archive_before_defense.get("ok", False))
        and bool(defense_proposal.get("ok", False))
        and bool(archive_after_defense.get("ok", False))
        and bool(war_room_refresh.get("ok", False))
        and bool(chat_sources.get("ok", False)),
        "reason": "war_room_default_events_seeded" if bool(chat_sources.get("ok", False)) else "war_room_default_events_seed_failed",
        "aiPlayerId": ai_player_id,
        "targetTileId": target_tile_id,
        "combatRun": combat_run,
        "dailySummary": daily_summary,
        "archiveBeforeDefense": archive_before_defense,
        "defenseProposal": defense_proposal,
        "archiveAfterDefense": archive_after_defense,
        "warRoomRefresh": war_room_refresh,
        "chatSources": chat_sources,
    }


def _seed_main_city_troop_formation_multi_team_fixture(args: argparse.Namespace) -> dict[str, Any]:
    if args.click_action not in {
        "world_click_main_city_node_troop_assign_preview_open_ai_multi_team_second",
        "world_click_main_city_node_troop_assign_preview_open_ai_multi_team_second_context_chat",
        "world_click_main_city_node_troop_assign_preview_multi_team_rail_stress",
        "world_click_main_city_node_troop_assign_preview_invalid_portrait_fallback",
        "world_click_main_city_node_troop_assign_preview_empty_slots",
    }:
        return {"ok": True, "skipped": True, "reason": "main_city_troop_formation_multi_team_fixture_not_requested"}

    ai_player_id = str(args.seed_ai_player_id).strip() or "player_operator_alpha"
    display_name = str(args.seed_ai_display_name).strip() or "Player Operator Alpha"
    governor_player_id = str(args.seed_ai_governor_player_id).strip() or "human_alpha"
    faction_id = str(args.seed_ai_faction_id).strip() or "player"
    join_result = _request_json(args.backend_url, "POST", "/api/session/join", {
        "factionId": faction_id,
        "playerName": governor_player_id,
    })
    register_result = _request_json(args.backend_url, "POST", "/api/ai/players", {
        "aiPlayerId": ai_player_id,
        "displayName": display_name,
        "governorPlayerId": governor_player_id,
        "factionId": faction_id,
        "actionWhitelist": [
            "troop_train",
            "formation_assign",
            "march_move",
            "tile_occupy",
        ],
    })
    seed_result = _request_json(args.backend_url, "POST", "/api/world/action?includeWorld=false", {
        "action": "seedMainCityTroopFormationMultiTeamFixture",
        "payload": {
            "factionId": faction_id,
            "aiPlayerId": ai_player_id,
            "firstTeamId": "team_02",
            "secondTeamId": "team_03",
            "firstTeamIndex": 2,
            "secondTeamIndex": 3,
            "teamCount": 4 if args.click_action == "world_click_main_city_node_troop_assign_preview_multi_team_rail_stress" else 2,
            "forceInvalidPortraitAssetKey": args.click_action == "world_click_main_city_node_troop_assign_preview_invalid_portrait_fallback",
            "forceEmptyTeamSlots": args.click_action == "world_click_main_city_node_troop_assign_preview_empty_slots",
        },
    })
    join_ok = bool(join_result.get("ok", False)) or int(join_result.get("status", -1)) == 409
    register_ok = bool(register_result.get("ok", False)) or int(register_result.get("status", -1)) == 409
    seed_ok = bool(seed_result.get("ok", False)) and bool(seed_result.get("data", {}).get("ok", False))
    return {
        "ok": join_ok and register_ok and seed_ok,
        "aiPlayerId": ai_player_id,
        "displayName": display_name,
        "governorPlayerId": governor_player_id,
        "factionId": faction_id,
        "join": join_result,
        "register": register_result,
        "seed": seed_result,
    }


def _seed_battle_report_closure(args: argparse.Namespace) -> dict[str, Any]:
    if args.click_action not in BATTLE_REPORT_SEEDED_CLOSURE_ACTIONS:
        return {"ok": True, "skipped": True, "reason": "battle_report_seed_not_requested"}

    faction_id = str(args.seed_ai_faction_id).strip() or "player"
    ai_player_id = str(args.seed_ai_player_id).strip() or "player_operator_alpha"
    result = _request_json(
        args.backend_url,
        "POST",
        "/api/world/action?includeWorld=true",
        {
            "action": "seedBattleReportClosure",
            "payload": {
                "factionId": faction_id,
                "aiPlayerId": ai_player_id,
                "organizationId": faction_id,
                "organizationName": "青州同盟",
                "organizationKind": "alliance",
            },
        },
        timeout_sec=20.0,
    )
    data = result.get("data", {}) if isinstance(result.get("data", {}), dict) else {}
    ok = bool(result.get("ok", False)) and bool(data.get("ok", False))
    counts_ok = (
        int(data.get("seededBattleReportCount", 0) or 0) >= 3
        and int(data.get("seededBattleReportPlayerOwnedCount", 0) or 0) >= 1
        and int(data.get("seededBattleReportAiOwnedCount", 0) or 0) >= 1
        and int(data.get("seededBattleReportOrganizationOwnedCount", 0) or 0) >= 1
    )
    return {
        "ok": ok and counts_ok,
        "http": result,
        "seededBattleReportCount": int(data.get("seededBattleReportCount", 0) or 0),
        "seededBattleReportPlayerOwnedCount": int(data.get("seededBattleReportPlayerOwnedCount", 0) or 0),
        "seededBattleReportAiOwnedCount": int(data.get("seededBattleReportAiOwnedCount", 0) or 0),
        "seededBattleReportOrganizationOwnedCount": int(data.get("seededBattleReportOrganizationOwnedCount", 0) or 0),
    }


def _seed_player_history_replay(args: argparse.Namespace) -> dict[str, Any]:
    if args.click_action not in PLAYER_HISTORY_REPLAY_SEEDED_ACTIONS:
        return {"ok": True, "skipped": True, "reason": "player_history_replay_seed_not_requested"}

    faction_id = str(args.seed_ai_faction_id).strip() or "player"
    world_result = _request_json(
        args.backend_url,
        "GET",
        "/api/world?intelMode=sparse&planningHistoryLimit=1&replayLimit=1&replayFrameLimit=1",
        timeout_sec=20.0,
    )
    world_payload = world_result.get("data", {}) if isinstance(world_result.get("data", {}), dict) else {}
    world = world_payload.get("world", {}) if isinstance(world_payload.get("world", {}), dict) else {}
    units = world.get("units", []) if isinstance(world.get("units", []), list) else []
    unit = next(
        (
            item for item in units
            if isinstance(item, dict)
            and str(item.get("faction", "")).strip() == faction_id
            and str(item.get("id", "")).strip()
            and str(item.get("tileId", "")).strip()
        ),
        None,
    )
    if not bool(world_result.get("ok", False)) or not isinstance(unit, dict):
        return {
            "ok": False,
            "reason": "player_history_replay_world_seed_source_missing",
            "world": world_result,
        }

    request_id = f"player_history_replay_smoke_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
    unit_id = str(unit.get("id", "")).strip()
    target_tile_id = str(unit.get("tileId", "")).strip()
    world_version = int(world.get("worldVersion", 1) or 1)
    queue_result = _request_json(
        args.backend_url,
        "POST",
        "/api/world/action?includeWorld=false",
        {
            "action": "queuePlanExecution",
            "payload": {
                "factionId": faction_id,
                "source": "mock",
                "strategicCommand": "复盘洛阳前线行动",
                "requestId": request_id,
                "basedOnWorldVersion": world_version,
                "plannerExplanation": "部队完成侦察后生成可检查复盘。",
                "plan": {
                    "intent": "生成天下纪事复盘",
                    "priority": "medium",
                    "reviewAfterTicks": 1,
                    "constraints": ["player_history_replay_visual_smoke"],
                    "orders": [
                        {
                            "unitId": unit_id,
                            "action": "recon",
                            "target": target_tile_id,
                        },
                    ],
                },
            },
        },
        timeout_sec=20.0,
    )
    queue_data = queue_result.get("data", {}) if isinstance(queue_result.get("data", {}), dict) else {}
    if not bool(queue_result.get("ok", False)) or not bool(queue_data.get("ok", False)):
        return {
            "ok": False,
            "reason": "player_history_replay_queue_failed",
            "requestId": request_id,
            "queue": queue_result,
        }

    advance_result = _request_json(
        args.backend_url,
        "POST",
        "/api/world/action?includeWorld=false",
        {"action": "advanceTick"},
        timeout_sec=60.0,
    )
    advance_data = advance_result.get("data", {}) if isinstance(advance_result.get("data", {}), dict) else {}
    history_result = _request_json(
        args.backend_url,
        "GET",
        f"/api/player-history?limit=20&eventLimit=20&civilMemoryLimit=20&replayLimit=5&replayRequestId={urllib.parse.quote(request_id)}",
        timeout_sec=20.0,
    )
    history_data = history_result.get("data", {}) if isinstance(history_result.get("data", {}), dict) else {}
    replay = history_data.get("replay", {}) if isinstance(history_data.get("replay", {}), dict) else {}
    frames = replay.get("frames", []) if isinstance(replay.get("frames", []), list) else []

    return {
        "ok": bool(advance_result.get("ok", False))
        and bool(advance_data.get("ok", False))
        and bool(history_result.get("ok", False))
        and str(replay.get("battleReportId", "")).strip() == request_id
        and len(frames) > 0,
        "reason": "player_history_replay_seeded",
        "requestId": request_id,
        "unitId": unit_id,
        "targetTileId": target_tile_id,
        "queue": queue_result,
        "advance": advance_result,
        "historyReplayFrameCount": len(frames),
        "historyReplayFrameCountLabel": replay.get("frameCountLabel", ""),
        "historyReplayInspectionHintLabel": replay.get("inspectionHintLabel", ""),
    }


def _seed_player_history_save_restore(args: argparse.Namespace) -> dict[str, Any]:
    if args.click_action not in PLAYER_HISTORY_SAVE_RESTORE_SEEDED_ACTIONS:
        return {"ok": True, "skipped": True, "reason": "player_history_save_restore_seed_not_requested"}

    faction_id = str(args.seed_ai_faction_id).strip() or "player"
    player_name = str(args.seed_ai_governor_player_id).strip() or "human_alpha"
    join_result = _request_json(args.backend_url, "POST", "/api/session/join", {
        "factionId": faction_id,
        "playerName": player_name,
    }, timeout_sec=20.0)
    join_data = join_result.get("data", {}) if isinstance(join_result.get("data", {}), dict) else {}
    session_token = str(join_data.get("token", "")).strip()
    auth_headers = {"Authorization": f"Bearer {session_token}"} if session_token else None
    slot_id = f"ph_restore_{uuid.uuid4().hex[:10]}"
    label = "恢复演示存档"
    save_result = _request_json(
        args.backend_url,
        "POST",
        "/api/save-slots/save",
        {
            "slotId": slot_id,
            "label": label,
        },
        timeout_sec=20.0,
        headers=auth_headers,
    )
    save_data = save_result.get("data", {}) if isinstance(save_result.get("data", {}), dict) else {}
    slot = save_data.get("slot", {}) if isinstance(save_data.get("slot", {}), dict) else {}
    history_result = _request_json(
        args.backend_url,
        "GET",
        f"/api/player-history?factionId={urllib.parse.quote(faction_id)}&limit=20&eventLimit=20&civilMemoryLimit=20&replayLimit=1",
        timeout_sec=20.0,
        headers=auth_headers,
    )
    history_data = history_result.get("data", {}) if isinstance(history_result.get("data", {}), dict) else {}
    save_load = history_data.get("saveLoad", {}) if isinstance(history_data.get("saveLoad", {}), dict) else {}
    slots = save_load.get("slots", []) if isinstance(save_load.get("slots", []), list) else []
    matching_slot = next(
        (
            item for item in slots
            if isinstance(item, dict) and str(item.get("slotId", "")).strip() == slot_id
        ),
        None,
    )
    return {
        "ok": bool(save_result.get("ok", False))
        and bool(session_token)
        and str(slot.get("slotId", "")).strip() == slot_id
        and bool(history_result.get("ok", False))
        and isinstance(matching_slot, dict),
        "reason": "player_history_save_restore_seeded",
        "slotId": slot_id,
        "label": label,
        "join": join_result,
        "sessionTokenPresent": bool(session_token),
        "save": save_result,
        "historySaveSlotCount": len(slots),
        "historyRestoreRiskLabel": save_load.get("restoreRiskLabel", ""),
        "historyRestoreFeedbackLabel": save_load.get("restoreFeedbackLabel", ""),
        "matchingSlot": matching_slot if isinstance(matching_slot, dict) else {},
    }


def _seed_player_history_ai_proposal_denied(args: argparse.Namespace) -> dict[str, Any]:
    if args.click_action not in PLAYER_HISTORY_AI_PROPOSAL_DENIED_SEEDED_ACTIONS:
        return {"ok": True, "skipped": True, "reason": "player_history_ai_proposal_denied_seed_not_requested"}

    faction_id = str(args.seed_ai_faction_id).strip() or "player"
    player_name = str(args.seed_ai_governor_player_id).strip() or "human_alpha"
    join_result = _request_json(args.backend_url, "POST", "/api/session/join", {
        "factionId": faction_id,
        "playerName": player_name,
    }, timeout_sec=20.0)
    join_data = join_result.get("data", {}) if isinstance(join_result.get("data", {}), dict) else {}
    session_token = str(join_data.get("token", "")).strip()
    entry_id = f"player_history_ai_proposal_denied_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
    append_result = _request_json(
        args.backend_url,
        "POST",
        "/api/world/action?includeWorld=false",
        {
            "action": "appendPlanningJobHistory",
            "payload": {
                "entry": {
                    "id": entry_id,
                    "status": "failed",
                    "sourceMode": "local",
                    "strategicCommand": "AI 提案复核",
                    "requestedTick": 1,
                    "requestedWorldVersion": 1,
                    "message": "AI 提案被拒绝，已生成受阻收据。",
                    "plannerNote": "AI 活动",
                    "completedTick": 2,
                    "completedWorldVersion": 2,
                },
            },
        },
        timeout_sec=20.0,
    )
    append_data = append_result.get("data", {}) if isinstance(append_result.get("data", {}), dict) else {}
    history_result = _request_json(
        args.backend_url,
        "GET",
        "/api/player-history?limit=20&eventLimit=20&civilMemoryLimit=20&replayLimit=5",
        timeout_sec=20.0,
        headers={"Authorization": f"Bearer {session_token}"} if session_token else None,
    )
    history_data = history_result.get("data", {}) if isinstance(history_result.get("data", {}), dict) else {}
    timeline = history_data.get("timeline", {}) if isinstance(history_data.get("timeline", {}), dict) else {}
    cards = timeline.get("cards", []) if isinstance(timeline.get("cards", []), list) else []
    denied_card = next(
        (
            card for card in cards
            if isinstance(card, dict)
            and str(card.get("category", "")).strip() == "ai_activity"
            and str(card.get("title", "")).strip() == "AI 行动受阻"
            and str(card.get("summary", "")).strip() == "AI 提案被拒绝，已生成受阻收据。"
            and str(card.get("targetLabel", "")).strip() == "AI 提案复核"
            and str(card.get("resultLabel", "")).strip() == "需要复核"
            and str(card.get("nextActionLabel", "")).strip() == "查看 AI 活动"
        ),
        None,
    )
    ai_denied_card_count = len([card for card in cards if isinstance(card, dict) and str(card.get("category", "")).strip() == "ai_activity"])
    return {
        "ok": bool(join_result.get("ok", False))
        and bool(append_result.get("ok", False))
        and bool(append_data.get("ok", False))
        and bool(history_result.get("ok", False))
        and ai_denied_card_count > 0,
        "reason": "player_history_ai_proposal_denied_seeded",
        "entryId": entry_id,
        "join": {"ok": bool(join_result.get("ok", False)), "status": int(join_result.get("status", -1)), "tokenPresent": bool(session_token)},
        "append": {"ok": bool(append_result.get("ok", False)), "status": int(append_result.get("status", -1)), "dataOk": bool(append_data.get("ok", False))},
        "historyAiDeniedCardCount": ai_denied_card_count,
        "historyAiDeniedCard": denied_card if isinstance(denied_card, dict) else {},
    }


def _seed_player_history_ai_execution_receipt(args: argparse.Namespace) -> dict[str, Any]:
    if args.click_action not in PLAYER_HISTORY_AI_EXECUTION_RECEIPT_SEEDED_ACTIONS:
        return {"ok": True, "skipped": True, "reason": "player_history_ai_execution_receipt_seed_not_requested"}

    faction_id = str(args.seed_ai_faction_id).strip() or "player"
    player_name = str(args.seed_ai_governor_player_id).strip() or "human_alpha"
    join_result = _request_json(args.backend_url, "POST", "/api/session/join", {
        "factionId": faction_id,
        "playerName": player_name,
    }, timeout_sec=20.0)
    join_data = join_result.get("data", {}) if isinstance(join_result.get("data", {}), dict) else {}
    session_token = str(join_data.get("token", "")).strip()
    entry_id = f"player_history_ai_execution_receipt_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
    append_result = _request_json(
        args.backend_url,
        "POST",
        "/api/world/action?includeWorld=false",
        {
            "action": "appendPlanningJobHistory",
            "payload": {
                "entry": {
                    "id": entry_id,
                    "status": "succeeded",
                    "sourceMode": "local",
                    "strategicCommand": "AI 执行回执",
                    "requestedTick": 1,
                    "requestedWorldVersion": 1,
                    "message": "军师 AI 已完成一次受治理行动。",
                    "plannerNote": "AI 活动",
                    "completedTick": 2,
                    "completedWorldVersion": 2,
                },
            },
        },
        timeout_sec=20.0,
    )
    append_data = append_result.get("data", {}) if isinstance(append_result.get("data", {}), dict) else {}
    history_result = _request_json(
        args.backend_url,
        "GET",
        "/api/player-history?limit=20&eventLimit=20&civilMemoryLimit=20&replayLimit=5",
        timeout_sec=20.0,
        headers={"Authorization": f"Bearer {session_token}"} if session_token else None,
    )
    history_data = history_result.get("data", {}) if isinstance(history_result.get("data", {}), dict) else {}
    timeline = history_data.get("timeline", {}) if isinstance(history_data.get("timeline", {}), dict) else {}
    cards = timeline.get("cards", []) if isinstance(timeline.get("cards", []), list) else []
    receipt_card = next(
        (
            card for card in cards
            if isinstance(card, dict)
            and str(card.get("category", "")).strip() == "ai_activity"
            and str(card.get("title", "")).strip() == "AI 行动已完成"
            and str(card.get("summary", "")).strip() == "军师 AI 已完成一次受治理行动。"
            and str(card.get("targetLabel", "")).strip() == "AI 执行回执"
            and str(card.get("resultLabel", "")).strip() == "已推进"
            and str(card.get("nextActionLabel", "")).strip() == "查看 AI 活动"
        ),
        None,
    )
    ai_receipt_cards = [card for card in cards if isinstance(card, dict) and str(card.get("category", "")).strip() == "ai_activity"]
    ai_receipt_card_count = len(ai_receipt_cards)
    return {
        "ok": bool(join_result.get("ok", False))
        and bool(append_result.get("ok", False))
        and bool(append_data.get("ok", False))
        and bool(history_result.get("ok", False))
        and ai_receipt_card_count > 0
        and isinstance(receipt_card, dict),
        "reason": "player_history_ai_execution_receipt_seeded",
        "entryId": entry_id,
        "join": {"ok": bool(join_result.get("ok", False)), "status": int(join_result.get("status", -1)), "tokenPresent": bool(session_token)},
        "append": {"ok": bool(append_result.get("ok", False)), "status": int(append_result.get("status", -1)), "dataOk": bool(append_data.get("ok", False))},
        "historyAiExecutionReceiptCardCount": ai_receipt_card_count,
        "historyAiExecutionReceiptCard": receipt_card if isinstance(receipt_card, dict) else {},
        "historyAiExecutionReceiptCandidates": ai_receipt_cards[:5],
    }


def _seed_player_history_ai_proposal_apply(args: argparse.Namespace) -> dict[str, Any]:
    if args.click_action not in PLAYER_HISTORY_AI_PROPOSAL_APPLY_SEEDED_ACTIONS:
        return {"ok": True, "skipped": True, "reason": "player_history_ai_proposal_apply_seed_not_requested"}

    ai_player_id = str(args.seed_ai_player_id).strip() or "player_operator_alpha"
    display_name = str(args.seed_ai_display_name).strip() or "青州军师"
    governor_player_id = str(args.seed_ai_governor_player_id).strip() or "human_alpha"
    faction_id = str(args.seed_ai_faction_id).strip() or "player"
    join_result = _request_json(args.backend_url, "POST", "/api/session/join", {
        "factionId": faction_id,
        "playerName": governor_player_id,
    }, timeout_sec=20.0)
    register_result = _request_json(args.backend_url, "POST", "/api/ai/players", {
        "aiPlayerId": ai_player_id,
        "displayName": display_name,
        "governorPlayerId": governor_player_id,
        "factionId": faction_id,
        "actionWhitelist": ["recruit_pool_select", "world_scout", "march_move", "tile_occupy"],
    }, timeout_sec=20.0)
    create_result = _request_json(args.backend_url, "POST", "/api/ai/players/proposals", {
        "aiPlayerId": ai_player_id,
        "action": "recruit_pool_select",
        "source": "rule",
        "reason": "前线方案等待确认。",
        "args": {
            "poolId": "pool_season",
        },
    }, timeout_sec=20.0)
    create_data = create_result.get("data", {}) if isinstance(create_result.get("data", {}), dict) else {}
    proposal = create_data.get("proposal", {}) if isinstance(create_data.get("proposal", {}), dict) else {}
    proposal_id = str(proposal.get("proposalId", "")).strip()
    proposal_status = str(proposal.get("status", "")).strip()
    proposals_path = "/api/ai/players/proposals?aiPlayerId=%s&status=pending_approval&limit=10" % urllib.parse.quote(ai_player_id, safe="")
    list_result = _request_json(args.backend_url, "GET", proposals_path, timeout_sec=20.0)
    list_data = list_result.get("data", {}) if isinstance(list_result.get("data", {}), dict) else {}
    proposal_items = list_data.get("items", []) if isinstance(list_data.get("items", []), list) else []
    matching_proposal = next(
        (
            item for item in proposal_items
            if isinstance(item, dict)
            and str(item.get("proposalId", "")).strip() == proposal_id
            and str(item.get("status", "")).strip() == "pending_approval"
        ),
        None,
    )
    join_ok = bool(join_result.get("ok", False)) or int(join_result.get("status", -1)) == 409
    register_ok = bool(register_result.get("ok", False)) or int(register_result.get("status", -1)) == 409
    return {
        "ok": join_ok
        and register_ok
        and bool(create_result.get("ok", False))
        and proposal_id != ""
        and proposal_status == "pending_approval"
        and bool(list_result.get("ok", False))
        and isinstance(matching_proposal, dict),
        "reason": "player_history_ai_proposal_apply_seeded",
        "aiPlayerId": ai_player_id,
        "displayName": display_name,
        "governorPlayerId": governor_player_id,
        "factionId": faction_id,
        "proposalId": proposal_id,
        "proposalStatus": proposal_status,
        "join": {"ok": bool(join_result.get("ok", False)), "status": int(join_result.get("status", -1))},
        "register": {"ok": bool(register_result.get("ok", False)), "status": int(register_result.get("status", -1))},
        "create": {"ok": bool(create_result.get("ok", False)), "status": int(create_result.get("status", -1))},
        "pendingProposalCount": len(proposal_items),
        "matchingProposal": matching_proposal if isinstance(matching_proposal, dict) else {},
    }


def _seed_player_session_for_owner_delta(args: argparse.Namespace) -> dict[str, Any]:
    if args.click_action != "world_main_map_claim_release_cell":
        return {"ok": True, "skipped": True, "reason": "owner_delta_session_seed_not_requested"}

    faction_id = str(args.seed_ai_faction_id).strip() or "player"
    player_name = str(args.seed_ai_governor_player_id).strip() or "human_alpha"
    join_result = _request_json(args.backend_url, "POST", "/api/session/join", {
        "factionId": faction_id,
        "playerName": player_name,
    }, timeout_sec=20.0)
    join_ok = bool(join_result.get("ok", False)) or int(join_result.get("status", -1)) == 409
    return {
        "ok": join_ok,
        "factionId": faction_id,
        "playerName": player_name,
        "join": {"ok": join_ok, "status": int(join_result.get("status", -1))},
    }


def _seed_map_unit_visual_exit_fixture(args: argparse.Namespace) -> dict[str, Any]:
    target_tile_id = str(args.map_unit_march_target_tile_id).strip()
    if (
        args.click_action != "world_click_main_city_node_troop_submit_march_map_unit"
        or target_tile_id != "tile_13"
    ):
        return {"ok": True, "skipped": True, "reason": "map_unit_visual_exit_fixture_not_requested"}

    faction_id = str(args.seed_ai_faction_id).strip() or "player"
    result = _request_json(
        args.backend_url,
        "POST",
        "/api/world/action?includeWorld=false",
        {
            "action": "seedMapUnitVisualSouthExitFixture",
            "payload": {
                "factionId": faction_id,
                "originTileId": "tile_08",
                "targetTileId": target_tile_id,
            },
        },
        timeout_sec=20.0,
    )
    data = result.get("data", {}) if isinstance(result.get("data", {}), dict) else {}
    fixture = data.get("seededMapUnitVisualExitFixture", {}) if isinstance(data, dict) else {}
    if not isinstance(fixture, dict):
        fixture = {}
    ok = (
        bool(result.get("ok", False))
        and bool(data.get("ok", False))
        and str(fixture.get("originTileId", "")) == "tile_08"
        and str(fixture.get("targetTileId", "")) == target_tile_id
        and str(fixture.get("direction", "")) == "south"
    )
    return {
        "ok": ok,
        "factionId": faction_id,
        "originTileId": "tile_08",
        "targetTileId": target_tile_id,
        "direction": "south",
        "http": {
            "ok": bool(result.get("ok", False)),
            "status": int(result.get("status", -1)),
            "dataOk": bool(data.get("ok", False)),
            "failureCode": data.get("failureCode", ""),
        },
        "fixture": fixture,
    }


def _seed_ai_home_city_unbound_fixture(args: argparse.Namespace, isolated_home_city_binding: bool) -> dict[str, Any]:
    if not isolated_home_city_binding:
        return {"ok": True, "skipped": True, "reason": "ai_home_city_isolated_seed_not_requested"}

    ai_player_id = str(args.seed_ai_player_id).strip() or "player_operator_alpha"
    display_name = str(args.seed_ai_display_name).strip() or "青州后勤官"
    governor_player_id = str(args.seed_ai_governor_player_id).strip() or "human_alpha"
    faction_id = str(args.seed_ai_faction_id).strip() or "player"
    join_result = _request_json(args.backend_url, "POST", "/api/session/join", {
        "factionId": faction_id,
        "playerName": governor_player_id,
    })
    register_result = _request_json(args.backend_url, "POST", "/api/ai/players", {
        "aiPlayerId": ai_player_id,
        "displayName": display_name,
        "governorPlayerId": governor_player_id,
        "factionId": faction_id,
        "actionWhitelist": [
            "battle_report_read",
            "building_upgrade",
            "city_upgrade",
            "resource_gather",
            "resource_transfer_to_governor",
            "reward_claim",
        ],
    })
    list_query = urllib.parse.urlencode({
        "governorPlayerId": governor_player_id,
        "factionId": faction_id,
    })
    list_result = _request_json(args.backend_url, "GET", f"/api/ai/players?{list_query}", timeout_sec=20.0)
    list_data = list_result.get("data", {}) if isinstance(list_result.get("data", {}), dict) else {}
    list_items = list_data.get("items", []) if isinstance(list_data.get("items", []), list) else []
    seeded_player: dict[str, Any] = {}
    for item in list_items:
        if isinstance(item, dict) and str(item.get("aiPlayerId", "")).strip() == ai_player_id:
            seeded_player = item
            break
    binding_status = str(seeded_player.get("homeCityBindingStatus", "")).strip()
    candidates_query = urllib.parse.urlencode({"governorPlayerId": governor_player_id})
    candidates_result = _request_json(
        args.backend_url,
        "GET",
        f"/api/ai/players/{urllib.parse.quote(ai_player_id, safe='')}/home-city/candidates?{candidates_query}",
        timeout_sec=20.0,
    )
    candidates_data = candidates_result.get("data", {}) if isinstance(candidates_result.get("data", {}), dict) else {}
    candidate_count = int(candidates_data.get("count", 0) or 0) if isinstance(candidates_data, dict) else 0
    join_ok = bool(join_result.get("ok", False)) or int(join_result.get("status", -1)) == 409
    register_ok = bool(register_result.get("ok", False))
    list_ok = bool(list_result.get("ok", False)) and bool(seeded_player)
    candidates_ok = bool(candidates_result.get("ok", False)) and candidate_count > 0
    return {
        "ok": join_ok and register_ok and list_ok and candidates_ok and binding_status == "unbound",
        "aiPlayerId": ai_player_id,
        "displayName": display_name,
        "governorPlayerId": governor_player_id,
        "factionId": faction_id,
        "bindingStatus": binding_status,
        "candidateCount": candidate_count,
        "join": {"ok": join_ok, "status": int(join_result.get("status", -1))},
        "register": {"ok": register_ok, "status": int(register_result.get("status", -1))},
        "list": {"ok": list_ok, "status": int(list_result.get("status", -1)), "itemCount": len(list_items)},
        "candidates": {"ok": candidates_ok, "status": int(candidates_result.get("status", -1)), "count": candidate_count},
    }


def _seed_ai_home_city_bound_fixture(args: argparse.Namespace, ai_switch_home_city_visual_acceptance: bool) -> dict[str, Any]:
    if not ai_switch_home_city_visual_acceptance:
        return {"ok": True, "skipped": True, "reason": "ai_home_city_bound_seed_not_requested"}

    ai_player_id = str(args.seed_ai_player_id).strip() or "player_operator_alpha"
    display_name = str(args.seed_ai_display_name).strip() or "青州后勤官"
    governor_player_id = str(args.seed_ai_governor_player_id).strip() or "human_alpha"
    faction_id = str(args.seed_ai_faction_id).strip() or "player"
    join_result = _request_json(args.backend_url, "POST", "/api/session/join", {
        "factionId": faction_id,
        "playerName": governor_player_id,
    })
    register_result = _request_json(args.backend_url, "POST", "/api/ai/players", {
        "aiPlayerId": ai_player_id,
        "displayName": display_name,
        "governorPlayerId": governor_player_id,
        "factionId": faction_id,
        "actionWhitelist": [
            "battle_report_read",
            "building_upgrade",
            "city_upgrade",
            "resource_gather",
            "resource_transfer_to_governor",
            "reward_claim",
        ],
    })
    candidates_query = urllib.parse.urlencode({"governorPlayerId": governor_player_id})
    candidates_result = _request_json(
        args.backend_url,
        "GET",
        f"/api/ai/players/{urllib.parse.quote(ai_player_id, safe='')}/home-city/candidates?{candidates_query}",
        timeout_sec=20.0,
    )
    candidates_data = candidates_result.get("data", {}) if isinstance(candidates_result.get("data", {}), dict) else {}
    candidates = candidates_data.get("candidates", []) if isinstance(candidates_data.get("candidates", []), list) else []
    selected_center_tile_id = ""
    for candidate in candidates:
        if isinstance(candidate, dict) and bool(candidate.get("eligible", False)):
            selected_center_tile_id = str(candidate.get("centerTileId", "")).strip()
            if selected_center_tile_id:
                break
    bind_result: dict[str, Any] = {"ok": False, "status": -1, "data": {}}
    if selected_center_tile_id:
        bind_result = _request_json(
            args.backend_url,
            "POST",
            f"/api/ai/players/{urllib.parse.quote(ai_player_id, safe='')}/home-city",
            {
                "governorPlayerId": governor_player_id,
                "centerTileId": selected_center_tile_id,
            },
            timeout_sec=20.0,
        )
    facility_query = urllib.parse.urlencode({
        "asAiPlayerId": ai_player_id,
        "governorPlayerId": governor_player_id,
    })
    facility_result = _request_json(
        args.backend_url,
        "GET",
        f"/api/world/main-city/facility-entry?{facility_query}",
        timeout_sec=20.0,
    )
    facility_data = facility_result.get("data", {}) if isinstance(facility_result.get("data", {}), dict) else {}
    facility_entry = facility_data.get("mainCityFacilityEntry", {}) if isinstance(facility_data.get("mainCityFacilityEntry", {}), dict) else {}
    join_ok = bool(join_result.get("ok", False)) or int(join_result.get("status", -1)) == 409
    register_ok = bool(register_result.get("ok", False)) or int(register_result.get("status", -1)) == 409
    candidates_ok = bool(candidates_result.get("ok", False)) and bool(selected_center_tile_id)
    bind_ok = bool(bind_result.get("ok", False))
    facility_ok = (
        bool(facility_result.get("ok", False))
        and str(facility_entry.get("ownerKind", "")).strip() == "ai"
        and bool(facility_entry.get("readonly", False))
    )
    return {
        "ok": join_ok and register_ok and candidates_ok and bind_ok and facility_ok,
        "aiPlayerId": ai_player_id,
        "displayName": display_name,
        "governorPlayerId": governor_player_id,
        "factionId": faction_id,
        "selectedCenterTileId": selected_center_tile_id,
        "join": {"ok": join_ok, "status": int(join_result.get("status", -1))},
        "register": {"ok": register_ok, "status": int(register_result.get("status", -1))},
        "candidates": {"ok": candidates_ok, "status": int(candidates_result.get("status", -1)), "count": len(candidates)},
        "bind": {"ok": bind_ok, "status": int(bind_result.get("status", -1))},
        "facilityEntry": {
            "ok": facility_ok,
            "status": int(facility_result.get("status", -1)),
            "ownerKind": str(facility_entry.get("ownerKind", "")).strip(),
            "readonly": bool(facility_entry.get("readonly", False)),
        },
    }


def _spawn_backend(
    log_path: Path,
    server_script: str,
    backend_url: str,
    extra_env: dict[str, str] | None = None,
) -> subprocess.Popen[str]:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    _run_service_process_prestart_guard(log_path)
    log_file = log_path.open("a", encoding="utf-8")
    creationflags = 0
    if os.name == "nt":
        creationflags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0) | getattr(subprocess, "CREATE_NO_WINDOW", 0)
    env = os.environ.copy()
    parsed_url = urllib.parse.urlparse(backend_url)
    if parsed_url.hostname:
        env["HOST"] = parsed_url.hostname
    if parsed_url.port:
        env["PORT"] = str(parsed_url.port)
    if extra_env:
        env.update(extra_env)
    process = subprocess.Popen(
        [_resolve_npm_exe(), "run", server_script],
        cwd=REPO_ROOT,
        env=env,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
        text=True,
        encoding="utf-8",
        creationflags=creationflags,
    )
    setattr(process, "_log_file", log_file)
    return process


def _terminate(process: subprocess.Popen[str] | None) -> None:
    if process is None:
        return
    try:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=8)
    finally:
        log_file = getattr(process, "_log_file", None)
        if log_file is not None:
            try:
                log_file.close()
            except Exception:
                pass


def _parse_json_object_from_command_output(output: str) -> dict[str, Any]:
    start = output.find("{")
    end = output.rfind("}")
    if start < 0 or end <= start:
        return {}
    try:
        parsed = json.loads(output[start : end + 1])
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _run_service_process_cleanup_all(log_path: Path) -> dict[str, Any]:
    started = time.perf_counter()
    command = [_resolve_npm_exe(), "run", "ops:service-process-cleanup-all"]
    try:
        result = subprocess.run(
            command,
            cwd=REPO_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=45,
        )
        output = result.stdout or ""
    except subprocess.TimeoutExpired as exc:
        output = (exc.stdout or "") if isinstance(exc.stdout, str) else ""
        if isinstance(exc.stderr, str):
            output += exc.stderr
        with log_path.open("a", encoding="utf-8", errors="replace") as cleanup_log:
            cleanup_log.write("[service-process-cleanup-all]\n")
            cleanup_log.write(output)
            if output and not output.endswith("\n"):
                cleanup_log.write("\n")
        return {
            "ok": False,
            "serviceProcessCleanup": "ops:service-process-cleanup-all",
            "error": "service_process_cleanup_timeout",
            "durationMs": round((time.perf_counter() - started) * 1000),
        }

    if output:
        with log_path.open("a", encoding="utf-8", errors="replace") as cleanup_log:
            cleanup_log.write("[service-process-cleanup-all]\n")
            cleanup_log.write(output)
            if not output.endswith("\n"):
                cleanup_log.write("\n")

    parsed = _parse_json_object_from_command_output(output)
    process_count_after = parsed.get("processCountAfter")
    process_count_before = parsed.get("processCountBefore")
    cleaned_process_ids = parsed.get("cleanedProcessIds")
    ok = result.returncode == 0 and bool(parsed.get("ok", False))
    if isinstance(process_count_after, int):
        ok = ok and process_count_after == 0
    return {
        "ok": ok,
        "serviceProcessCleanup": "ops:service-process-cleanup-all",
        "returnCode": result.returncode,
        "durationMs": round((time.perf_counter() - started) * 1000),
        "processCountBefore": process_count_before,
        "processCountAfter": process_count_after,
        "cleanedProcessIds": cleaned_process_ids if isinstance(cleaned_process_ids, list) else [],
    }


def _cleanup_started_backend_process_tree(
    process: subprocess.Popen[str] | None,
    log_path: Path,
) -> dict[str, Any]:
    terminate_error = ""
    try:
        _terminate(process)
    except Exception as exc:
        terminate_error = f"{type(exc).__name__}: {exc}"
    cleanup_result = _run_service_process_cleanup_all(log_path)
    return {
        "ok": not terminate_error and bool(cleanup_result.get("ok", False)),
        "cleanupKind": "backend_process_tree_cleanup",
        "parentProcessTerminated": not terminate_error,
        "terminateError": terminate_error,
        "serviceProcessCleanup": cleanup_result,
        "processCountBefore": cleanup_result.get("processCountBefore"),
        "processCountAfter": cleanup_result.get("processCountAfter"),
        "cleanedProcessIds": cleanup_result.get("cleanedProcessIds", []),
    }


def _image_stats(path: Path) -> dict[str, Any]:
    try:
        from PIL import Image, ImageStat
    except Exception as exc:
        return {"ok": path.exists(), "path": str(path), "warning": f"PIL unavailable: {exc}"}
    if not path.exists():
        return {"ok": False, "path": str(path), "error": "missing"}
    with Image.open(path) as image:
        rgb_image = image.convert("RGB")
        stat = ImageStat.Stat(rgb_image)
        extrema = rgb_image.getextrema()
        non_flat = any(channel[0] != channel[1] for channel in extrema)
        luminance_values: list[int] = []
        step_x = max(1, image.width // 160)
        step_y = max(1, image.height // 90)
        for y in range(0, image.height, step_y):
            for x in range(0, image.width, step_x):
                red, green, blue = rgb_image.getpixel((x, y))
                luminance_values.append(int((red * 299 + green * 587 + blue * 114) / 1000))
        luminance_mean = round(sum(luminance_values) / max(1, len(luminance_values)), 2)
        luminance_min = min(luminance_values) if luminance_values else 0
        luminance_max = max(luminance_values) if luminance_values else 0
        visible_pixel_ratio = round(
            sum(1 for value in luminance_values if value >= 24) / max(1, len(luminance_values)),
            4,
        )
        return {
            "ok": image.width >= 320 and image.height >= 180 and non_flat,
            "path": str(path),
            "width": image.width,
            "height": image.height,
            "extrema": extrema,
            "mean": [round(value, 2) for value in stat.mean],
            "nonFlat": non_flat,
            "luminanceMean": luminance_mean,
            "luminanceMin": luminance_min,
            "luminanceMax": luminance_max,
            "luminanceSpan": luminance_max - luminance_min,
            "visiblePixelRatio": visible_pixel_ratio,
        }


def _screenshot_visibility_gate(stats: dict[str, Any]) -> dict[str, Any]:
    width = int(stats.get("width", 0) or 0)
    height = int(stats.get("height", 0) or 0)
    luminance_mean = float(stats.get("luminanceMean", 0.0) or 0.0)
    luminance_span = int(stats.get("luminanceSpan", 0) or 0)
    visible_pixel_ratio = float(stats.get("visiblePixelRatio", 0.0) or 0.0)
    size_ok = width >= 320 and height >= 180
    non_flat_ok = bool(stats.get("nonFlat", False))
    brightness_ok = luminance_mean >= 8.0
    contrast_ok = luminance_span >= 24
    visible_pixel_ok = visible_pixel_ratio >= 0.015
    ok = bool(stats.get("ok", False)) and size_ok and non_flat_ok and brightness_ok and contrast_ok and visible_pixel_ok
    failures: list[str] = []
    if not size_ok:
        failures.append("size_too_small")
    if not non_flat_ok:
        failures.append("flat_image")
    if not brightness_ok:
        failures.append("luminance_mean_too_low")
    if not contrast_ok:
        failures.append("luminance_span_too_low")
    if not visible_pixel_ok:
        failures.append("visible_pixel_ratio_too_low")
    return {
        "contractId": SCREENSHOT_VISIBILITY_GATE_CONTRACT,
        "ok": ok,
        "reason": "screenshot_visibility_ok" if ok else "screenshot_visibility_failed",
        "failures": failures,
        "width": width,
        "height": height,
        "luminanceMean": luminance_mean,
        "luminanceSpan": luminance_span,
        "visiblePixelRatio": visible_pixel_ratio,
    }


def _sequence_frame_screenshot_path(frame: dict[str, Any]) -> Path | None:
    frame_screenshot = frame.get("screenshot", {})
    if not isinstance(frame_screenshot, dict):
        return None
    raw_path = str(frame_screenshot.get("path", "")).strip()
    if not raw_path:
        return None
    return Path(raw_path)


def _world_map_video_style_transition_expected_frame_manifest() -> list[dict[str, Any]]:
    manifest: list[dict[str, Any]] = []
    for index, entry in enumerate(WORLD_MAP_VIDEO_STYLE_TRANSITION_EXPECTED_FRAME_MANIFEST, start=1):
        manifest.append(
            {
                "index": index,
                "stage": str(entry["stage"]),
                "fileName": str(entry["fileName"]),
                "expectedContent": str(entry["expectedContent"]),
                "requiredSummaryFields": list(entry["requiredSummaryFields"]),
                "rejectIf": list(entry["rejectIf"]),
                "manualReviewFocus": str(entry["manualReviewFocus"]),
                "semanticReviewRequired": True,
            }
        )
    return manifest


def _materialize_world_map_video_style_transition_chain_frame_evidence(
    sequence_frames: list[dict[str, Any]],
    sequence_dir: Path,
) -> dict[str, Any]:
    evidence: dict[str, Any] = {}
    missing: list[str] = []
    expected_manifest = _world_map_video_style_transition_expected_frame_manifest()
    sequence_dir.mkdir(parents=True, exist_ok=True)
    for index, (stage, file_name) in enumerate(WORLD_MAP_VIDEO_STYLE_TRANSITION_STAGE_FRAMES):
        expected_entry = expected_manifest[index]
        if index >= len(sequence_frames):
            evidence[stage] = {
                "ok": False,
                "stage": stage,
                "path": "",
                "reason": "sequence_frame_missing",
                "expected": expected_entry,
            }
            missing.append(stage)
            continue
        source_path = _sequence_frame_screenshot_path(sequence_frames[index])
        target_path = sequence_dir / file_name
        if source_path is None or not source_path.exists():
            evidence[stage] = {
                "ok": False,
                "stage": stage,
                "path": str(target_path),
                "sourcePath": str(source_path or ""),
                "reason": "sequence_frame_screenshot_missing",
                "expected": expected_entry,
            }
            missing.append(stage)
            continue
        try:
            if source_path.resolve() != target_path.resolve():
                shutil.copyfile(source_path, target_path)
        except OSError as exc:
            evidence[stage] = {
                "ok": False,
                "stage": stage,
                "path": str(target_path),
                "sourcePath": str(source_path),
                "reason": f"copy_failed:{exc}",
                "expected": expected_entry,
            }
            missing.append(stage)
            continue
        ok = target_path.exists()
        evidence[stage] = {
            "ok": ok,
            "stage": stage,
            "path": str(target_path),
            "sourcePath": str(source_path),
            "fileName": file_name,
            "expected": expected_entry,
        }
        if not ok:
            missing.append(stage)
    return {
        "ok": not missing,
        "expectedFrameCount": len(WORLD_MAP_VIDEO_STYLE_TRANSITION_STAGE_FRAMES),
        "actualFrameCount": len(sequence_frames),
        "expectedFrameManifest": expected_manifest,
        "frames": evidence,
        "missing": missing,
    }


def _world_map_video_style_transition_chain_compact_summary(godot_report: dict[str, Any]) -> dict[str, Any]:
    chain_summary = godot_report.get("worldMapVideoStyleTransitionChain", {})
    if not isinstance(chain_summary, dict) or not chain_summary:
        chain_summary = _find_report_summary_with_key(godot_report, "worldMapFocusMotionToken")
    if not isinstance(chain_summary, dict):
        chain_summary = {}
    frame_evidence = godot_report.get("worldMapVideoStyleTransitionChainFrameEvidence", {})
    if not isinstance(frame_evidence, dict):
        frame_evidence = {}

    def frame_entry(stage: str) -> dict[str, Any]:
        entry = frame_evidence.get(stage, {})
        if not isinstance(entry, dict):
            return {"stage": stage, "ok": False, "path": "", "reason": "frame_evidence_missing"}
        return {
            "stage": stage,
            "ok": bool(entry.get("ok", False)),
            "path": str(entry.get("path", "")).strip(),
            "reason": str(entry.get("reason", "")).strip(),
        }

    pre_jump_reject_if: list[str] = []
    if not bool(chain_summary.get("worldMapFocusTargetPulse", False)):
        pre_jump_reject_if.append("worldMapFocusTargetPulse=false")
    if not bool(chain_summary.get("preJumpPulseMotion", False)):
        pre_jump_reject_if.append("preJumpPulseMotion=false")
    if bool(chain_summary.get("preJumpPulseMotionPending", False)):
        pre_jump_reject_if.append("preJumpPulseMotionPending=true")
    if not bool(chain_summary.get("worldMapFocusCameraSettle", False)):
        pre_jump_reject_if.append("worldMapFocusCameraSettle=false")
    if not bool(chain_summary.get("arrivalSettleMotion", False)):
        pre_jump_reject_if.append("arrivalSettleMotion=false")
    if bool(chain_summary.get("arrivalSettleMotionPending", False)):
        pre_jump_reject_if.append("arrivalSettleMotionPending=true")
    if not bool(chain_summary.get("focusContextPreserved", False)):
        pre_jump_reject_if.append("focusContextPreserved=false")
    for source_key in ("preJumpPulseMotionSource", "arrivalSettleMotionSource"):
        if str(chain_summary.get(source_key, "")).strip() == "missing_runtime_source":
            pre_jump_reject_if.append(f"{source_key}=missing_runtime_source")

    reward_return_reject_if: list[str] = []
    if not bool(chain_summary.get("rewardSettleMotion", False)):
        reward_return_reject_if.append("rewardSettleMotion=false")
    if bool(chain_summary.get("rewardSettleMotionPending", False)):
        reward_return_reject_if.append("rewardSettleMotionPending=true")
    if not bool(chain_summary.get("returnMainlineCameraSettle", False)):
        reward_return_reject_if.append("returnMainlineCameraSettle=false")
    if bool(chain_summary.get("returnMainlineCameraSettlePending", False)):
        reward_return_reject_if.append("returnMainlineCameraSettlePending=true")
    for source_key in ("rewardSettleMotionSource", "returnMainlineCameraSettleSource"):
        if str(chain_summary.get(source_key, "")).strip() == "missing_runtime_source":
            reward_return_reject_if.append(f"{source_key}=missing_runtime_source")

    return {
        "summaryPath": "worldMapVideoStyleTransitionChain",
        "fixtureAction": str(godot_report.get("worldMapVideoStyleTransitionChainFixtureAction", "")).strip(),
        "fixtureOk": bool(godot_report.get("worldMapVideoStyleTransitionChainFixtureOk", False)),
        "contractOk": bool(godot_report.get("worldMapVideoStyleTransitionChainContractOk", False)),
        "contractFailures": godot_report.get("worldMapVideoStyleTransitionChainContractFailures", []),
        "frameEvidenceOk": bool(godot_report.get("worldMapVideoStyleTransitionChainFrameEvidenceOk", False)),
        "frameEvidenceMissing": godot_report.get("worldMapVideoStyleTransitionChainFrameEvidenceMissing", []),
        "expectedFrameManifestOk": bool(godot_report.get("worldMapVideoStyleTransitionExpectedFrameManifestOk", False)),
        "preJumpPulseToArrivalSettle": {
            "runtimeFields": {
                "worldMapFocusTargetPulse": bool(chain_summary.get("worldMapFocusTargetPulse", False)),
                "worldMapFocusTransitionMode": str(chain_summary.get("worldMapFocusTransitionMode", "")).strip(),
                "worldMapFocusJumpDeltaCells": chain_summary.get("worldMapFocusJumpDeltaCells", {}),
                "worldMapFocusCameraSettle": bool(chain_summary.get("worldMapFocusCameraSettle", False)),
                "focusContextPreserved": bool(chain_summary.get("focusContextPreserved", False)),
                "preJumpArrivalMotionToken": str(chain_summary.get("preJumpArrivalMotionToken", "")).strip(),
                "preJumpPulseMotion": bool(chain_summary.get("preJumpPulseMotion", False)),
                "preJumpPulseMotionSource": str(chain_summary.get("preJumpPulseMotionSource", "")).strip(),
                "preJumpPulseMotionPending": bool(chain_summary.get("preJumpPulseMotionPending", False)),
                "preJumpPulseMotionPendingReason": str(chain_summary.get("preJumpPulseMotionPendingReason", "")).strip(),
                "arrivalSettleMotion": bool(chain_summary.get("arrivalSettleMotion", False)),
                "arrivalSettleMotionSource": str(chain_summary.get("arrivalSettleMotionSource", "")).strip(),
                "arrivalSettleMotionPending": bool(chain_summary.get("arrivalSettleMotionPending", False)),
                "arrivalSettleMotionPendingReason": str(chain_summary.get("arrivalSettleMotionPendingReason", "")).strip(),
            },
            "rejectIf": chain_summary.get("preJumpArrivalRejectIf", pre_jump_reject_if)
            if isinstance(chain_summary.get("preJumpArrivalRejectIf", []), list)
            else pre_jump_reject_if,
            "frameEvidence": [
                frame_entry("02_pre_jump_pulse"),
                frame_entry("03_jump_or_fast_zoom"),
                frame_entry("04_arrival_settle"),
            ],
        },
        "rewardSettleToReturnMainline": {
            "runtimeFields": {
                "rewardSettleMotion": bool(chain_summary.get("rewardSettleMotion", False)),
                "rewardSettleMotionSource": str(chain_summary.get("rewardSettleMotionSource", "")).strip(),
                "rewardSettleMotionPending": bool(chain_summary.get("rewardSettleMotionPending", False)),
                "rewardSettleMotionPendingReason": str(chain_summary.get("rewardSettleMotionPendingReason", "")).strip(),
                "rewardSettleSourceCandidate": str(chain_summary.get("rewardSettleSourceCandidate", "")).strip(),
                "rewardSettleRequiredClickAction": str(chain_summary.get("rewardSettleRequiredClickAction", "")).strip(),
                "rewardSettleRequiredSummaryField": str(chain_summary.get("rewardSettleRequiredSummaryField", "")).strip(),
                "rewardSettleNextFrameName": str(chain_summary.get("rewardSettleNextFrameName", "")).strip(),
                "returnMainlineCameraSettle": bool(chain_summary.get("returnMainlineCameraSettle", False)),
                "returnMainlineCameraSettleSource": str(chain_summary.get("returnMainlineCameraSettleSource", "")).strip(),
                "returnMainlineCameraSettlePending": bool(chain_summary.get("returnMainlineCameraSettlePending", False)),
                "returnMainlineCameraSettlePendingReason": str(
                    chain_summary.get("returnMainlineCameraSettlePendingReason", "")
                ).strip(),
                "returnMainlineSourceCandidate": str(chain_summary.get("returnMainlineSourceCandidate", "")).strip(),
                "returnMainlineRequiredClickAction": str(chain_summary.get("returnMainlineRequiredClickAction", "")).strip(),
                "returnMainlineRequiredSummaryField": str(chain_summary.get("returnMainlineRequiredSummaryField", "")).strip(),
                "returnMainlineNextFrameName": str(chain_summary.get("returnMainlineNextFrameName", "")).strip(),
            },
            "rejectIf": reward_return_reject_if,
            "frameEvidence": [
                frame_entry("10_reward_settle"),
                frame_entry("11_return_mainline"),
            ],
        },
    }


def _selected_marker_position(frame: dict[str, Any]) -> dict[str, float] | None:
    map_visual = frame.get("mapUnitVisual", {})
    if not isinstance(map_visual, dict):
        return None
    selected_unit_id = str(map_visual.get("selectedUnitId", "")).strip()
    raw_markers = map_visual.get("markers", [])
    markers = raw_markers if isinstance(raw_markers, list) else []
    selected_marker: dict[str, Any] | None = None
    for marker in markers:
        if not isinstance(marker, dict):
            continue
        if selected_unit_id and str(marker.get("unitId", "")).strip() == selected_unit_id:
            selected_marker = marker
            break
    if selected_marker is None:
        for marker in markers:
            if isinstance(marker, dict) and bool(marker.get("selected", False)):
                selected_marker = marker
                break
    if selected_marker is None:
        return None
    position = selected_marker.get("screenPosition", {})
    if not isinstance(position, dict) or not position:
        position = selected_marker.get("position", {})
    if not isinstance(position, dict):
        return None
    try:
        return {"x": float(position.get("x", 0.0)), "y": float(position.get("y", 0.0))}
    except (TypeError, ValueError):
        return None


def _crop_around_position(image: Any, position: dict[str, float], width: int, height: int) -> Any:
    from PIL import Image

    center_x = int(round(position["x"]))
    center_y = int(round(position["y"]))
    left = center_x - width // 2
    top = center_y - height // 2
    right = left + width
    bottom = top + height
    crop = Image.new("RGB", (width, height), (18, 22, 28))
    src_left = max(0, left)
    src_top = max(0, top)
    src_right = min(image.width, right)
    src_bottom = min(image.height, bottom)
    if src_right <= src_left or src_bottom <= src_top:
        return crop
    dst_left = src_left - left
    dst_top = src_top - top
    crop.paste(image.crop((src_left, src_top, src_right, src_bottom)), (dst_left, dst_top))
    return crop


def _write_sequence_contact_sheet(images: list[Any], output_path: Path, thumb_width: int, label_prefix: str) -> dict[str, Any]:
    from PIL import Image, ImageDraw

    if not images:
        return {"ok": False, "reason": "no_images", "path": str(output_path)}
    thumb_height = max(1, int(images[0].height * thumb_width / max(1, images[0].width)))
    label_height = 30
    sheet = Image.new("RGB", (thumb_width * len(images), thumb_height + label_height), (28, 24, 18))
    draw = ImageDraw.Draw(sheet)
    for index, image in enumerate(images):
        thumb = image.resize((thumb_width, thumb_height), Image.Resampling.LANCZOS)
        x = index * thumb_width
        sheet.paste(thumb, (x, label_height))
        draw.text((x + 10, 8), f"{label_prefix} {index}", fill=(245, 232, 190))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, quality=92)
    return {"ok": output_path.exists(), "path": str(output_path), "frameCount": len(images)}


def _write_sequence_gif(images: list[Any], output_path: Path, width: int, duration_ms: int) -> dict[str, Any]:
    from PIL import Image

    if not images:
        return {"ok": False, "reason": "no_images", "path": str(output_path)}
    resized = [
        image.resize((width, max(1, int(image.height * width / max(1, image.width)))), Image.Resampling.LANCZOS)
        for image in images
    ]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    resized[0].save(output_path, save_all=True, append_images=resized[1:], duration=duration_ms, loop=0)
    return {"ok": output_path.exists(), "path": str(output_path), "frameCount": len(images)}


def _generate_movement_sequence_artifacts(sequence_frames: list[dict[str, Any]], sequence_dir: Path) -> dict[str, Any]:
    try:
        from PIL import Image
    except Exception as exc:
        return {"ok": False, "reason": f"PIL unavailable: {exc}"}
    full_images: list[Any] = []
    closeup_images: list[Any] = []
    for frame in sequence_frames:
        image_path = _sequence_frame_screenshot_path(frame)
        position = _selected_marker_position(frame)
        if image_path is None or not image_path.exists() or position is None:
            continue
        with Image.open(image_path) as image:
            rgb = image.convert("RGB")
            full_images.append(rgb.copy())
            closeup_images.append(_crop_around_position(rgb, position, 420, 300))
    if not full_images:
        return {"ok": False, "reason": "no_valid_sequence_images"}
    full_sheet = _write_sequence_contact_sheet(
        full_images,
        sequence_dir / "movement_sequence_contact_sheet.jpg",
        360,
        "frame",
    )
    closeup_sheet = _write_sequence_contact_sheet(
        closeup_images,
        sequence_dir / "movement_unit_closeup_contact_sheet.jpg",
        300,
        "unit",
    )
    full_gif = _write_sequence_gif(full_images, sequence_dir / "movement_sequence_preview.gif", 800, 180)
    closeup_gif = _write_sequence_gif(closeup_images, sequence_dir / "movement_unit_closeup_preview.gif", 420, 180)
    mid_index = min(len(closeup_images) - 1, max(0, len(closeup_images) // 2))
    closeup_crop_path = sequence_dir / "movement_unit_closeup_mid.jpg"
    closeup_images[mid_index].save(closeup_crop_path, quality=94)
    return {
        "ok": bool(full_sheet.get("ok")) and bool(closeup_sheet.get("ok")) and bool(full_gif.get("ok")) and bool(closeup_gif.get("ok")),
        "frameCount": len(full_images),
        "fullContactSheet": full_sheet,
        "closeupContactSheet": closeup_sheet,
        "fullGif": full_gif,
        "closeupGif": closeup_gif,
        "midCloseup": {"ok": closeup_crop_path.exists(), "path": str(closeup_crop_path)},
    }


def _default_evidence_dir() -> Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    base_dir = REPO_ROOT / "tmp" / "screenshots" / f"mainline_visual_smoke_{stamp}_{os.getpid()}_{uuid.uuid4().hex[:8]}"
    if not base_dir.exists():
        return base_dir
    for index in range(1, 100):
        candidate = base_dir.with_name(f"{base_dir.name}_{index}")
        if not candidate.exists():
            return candidate
    return base_dir.with_name(f"{base_dir.name}_{time.time_ns()}")


def _summary_for_stdout(summary: dict[str, Any]) -> dict[str, Any]:
    artifacts = summary.get("artifacts", {})
    if not isinstance(artifacts, dict):
        artifacts = {}
    movement_stats = summary.get("movementSequenceStats", {})
    if not isinstance(movement_stats, dict):
        movement_stats = {}
    steps = summary.get("steps", [])
    compact_steps: list[dict[str, Any]] = []
    if isinstance(steps, list):
        for step in steps:
            if not isinstance(step, dict):
                continue
            compact_steps.append({
                "name": step.get("name", ""),
                "ok": step.get("ok", False),
                "returnCode": step.get("returnCode", None),
                "pid": step.get("pid", None),
                "reason": step.get("reason", ""),
                "error": step.get("error", ""),
            })
    keys = [
        "godotReport",
        "summaryReport",
        "screenshot",
        "beforeCloseScreenshot",
        "movementSequenceDir",
        "movementContactSheet",
        "movementPreviewGif",
        "movementUnitCloseupContactSheet",
        "movementUnitCloseupGif",
        "movementUnitCloseupMid",
        "godotLog",
    ]
    return {
        "command": summary.get("command", "run_mainline_visual_smoke"),
        "mode": summary.get("mode", ""),
        "ok": summary.get("ok", False),
        "error": summary.get("error", ""),
        "message": summary.get("message", ""),
        "backendUrl": summary.get("backendUrl", ""),
        "clickAction": summary.get("clickAction", ""),
        "stateCaseSetSummary": summary.get("stateCaseSetSummary", {}),
        "worldMapVideoStyleTransitionChainCompactSummary": summary.get(
            "worldMapVideoStyleTransitionChainCompactSummary",
            {},
        ),
        "evidenceDir": summary.get("evidenceDir", ""),
        "runtimePlacementPreset": summary.get("runtimePlacementPreset", ""),
        "candidateLineRole": summary.get("candidateLineRole", ""),
        "candidatePlacementCount": summary.get("candidatePlacementCount", None),
        "placementCount": summary.get("placementCount", None),
        "passedCount": summary.get("passedCount", None),
        "failedCount": summary.get("failedCount", None),
        "retryCount": summary.get("retryCount", None),
        "retriedPlacementCount": summary.get("retriedPlacementCount", None),
        "batchContactSheet": summary.get("batchContactSheet", {}),
        "steps": compact_steps,
        "artifacts": {key: artifacts.get(key, "") for key in keys if artifacts.get(key, "")},
        "movementSequenceStats": {
            "requested": movement_stats.get("requested", False),
            "ok": movement_stats.get("ok", False),
            "frameCount": movement_stats.get("frameCount", 0),
            "dir": movement_stats.get("dir", ""),
        },
    }


def _print_summary(summary: dict[str, Any]) -> None:
    print(json.dumps(_summary_for_stdout(summary), ensure_ascii=False, indent=2))


def _split_mountain_boundary_runtime_placement_ids(raw: str) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for part in raw.replace("\n", ",").replace(";", ",").split(","):
        placement_id = part.strip()
        if not placement_id or placement_id in seen:
            continue
        seen.add(placement_id)
        result.append(placement_id)
    return result


def _spread_sample(values: list[str], sample_count: int) -> list[str]:
    if sample_count <= 0 or sample_count >= len(values):
        return list(values)
    if sample_count == 1:
        return [values[0]]
    selected_indexes: list[int] = []
    seen: set[int] = set()
    span = len(values) - 1
    for index in range(sample_count):
        candidate = int(round(index * span / (sample_count - 1)))
        while candidate in seen and candidate + 1 < len(values):
            candidate += 1
        while candidate in seen and candidate > 0:
            candidate -= 1
        seen.add(candidate)
        selected_indexes.append(candidate)
    selected_indexes.sort()
    return [values[index] for index in selected_indexes]


MOUNTAIN_BOUNDARY_RUNTIME_PLACEMENT_PRESET_LINE_ROLES = {
    "outer-contact": "stable_direct_outer_contact_boundary_blockade_candidate",
    "cross-state": "cross_state_commandery_boundary_blockade_candidate",
    "chokepoint": "special_internal_commandery_boundary_blockade_candidate",
}


def _load_runtime_placement_ids_for_line_role(line_role: str) -> list[str]:
    contract = _read_json(MOUNTAIN_BOUNDARY_RUNTIME_CONTRACT_V0_47_PATH)
    asset_layer = contract.get("mainWorldMountainBoundaryAssetLayer", {})
    placements = asset_layer.get("placements", []) if isinstance(asset_layer, dict) else []
    if not isinstance(placements, list):
        return []
    result: list[str] = []
    for placement in placements:
        if not isinstance(placement, dict):
            continue
        if placement.get("lineRole") != line_role:
            continue
        runtime_placement_id = str(placement.get("runtimePlacementId", "")).strip()
        if runtime_placement_id:
            result.append(runtime_placement_id)
    return result


def _resolve_mountain_boundary_runtime_placement_batch(args: argparse.Namespace) -> dict[str, Any]:
    explicit_ids = _split_mountain_boundary_runtime_placement_ids(args.mountain_boundary_runtime_placement_ids)
    preset = str(getattr(args, "mountain_boundary_runtime_placement_preset", "none") or "none").strip()
    if explicit_ids:
        return {
            "runtimePlacementPreset": "explicit",
            "candidatePlacementCount": len(explicit_ids),
            "selectedRuntimePlacementIds": explicit_ids,
            "selectionPolicy": "Explicit runtimePlacementId list supplied by caller.",
        }
    if preset == "none":
        return {
            "runtimePlacementPreset": "none",
            "candidatePlacementCount": 0,
            "selectedRuntimePlacementIds": [],
            "selectionPolicy": "",
        }
    preset_parts = preset.rsplit("-", 1)
    preset_family = preset_parts[0] if len(preset_parts) == 2 else ""
    preset_mode = preset_parts[1] if len(preset_parts) == 2 else ""
    if preset_family not in MOUNTAIN_BOUNDARY_RUNTIME_PLACEMENT_PRESET_LINE_ROLES or preset_mode not in {"sample", "all"}:
        return {
            "runtimePlacementPreset": preset,
            "candidatePlacementCount": 0,
            "selectedRuntimePlacementIds": [],
            "selectionPolicy": "",
            "error": "unknown_mountain_boundary_runtime_placement_preset",
        }

    line_role = MOUNTAIN_BOUNDARY_RUNTIME_PLACEMENT_PRESET_LINE_ROLES[preset_family]
    candidate_ids = _load_runtime_placement_ids_for_line_role(line_role)
    selected_ids = candidate_ids if preset_mode == "all" else _spread_sample(candidate_ids, args.mountain_boundary_runtime_placement_sample_count)
    family_policy = {
        "outer-contact": (
            "Select only v0.47 stable direct outer-contact promotion placements. "
            "Same-state commandery/internal boundaries stay non-mountain; legacy aggregate or adjacent "
            "outer-contact pieces are not selected again when the stable direct placement exists."
        ),
        "cross-state": (
            "Select only v0.47 stable polygon / accepted ownership cross-state commandery mountain placements. "
            "Same-state commandery boundaries stay non-mountain; old aggregate state-boundary pieces remain metadata-only."
        ),
        "chokepoint": (
            "Select only the special accepted pass-side connector/chokepoint-adjacent runtime placement. "
            "This does not generate a second pass-wall node or duplicate gate/chokepoint model."
        ),
    }
    return {
        "runtimePlacementPreset": preset,
        "contractPath": str(MOUNTAIN_BOUNDARY_RUNTIME_CONTRACT_V0_47_PATH),
        "candidateLineRole": line_role,
        "candidatePlacementCount": len(candidate_ids),
        "selectedRuntimePlacementIds": selected_ids,
        "selectionPolicy": family_policy[preset_family],
    }


def _normalize_east_han_state_label(raw_label: Any, fallback_region_label: str = "", fallback_state_id: str = "") -> str:
    label = str(raw_label or "").strip()
    if label and "未定区" not in label and "未定" not in label:
        return label
    region_label = str(fallback_region_label or "").strip()
    if region_label and "未定区" not in region_label and "未定" not in region_label:
        return region_label
    return str(fallback_state_id or "").strip()


def _east_han_chokepoint_state_pair_key(gate: dict[str, Any]) -> str:
    from_state = str(gate.get("from_state_group_id") or gate.get("from_state_group_label") or "").strip()
    to_state = str(gate.get("to_state_group_id") or gate.get("to_state_group_label") or "").strip()
    if not from_state or not to_state:
        return ""
    return "__".join(sorted([from_state, to_state]))


def _load_accepted_pass_wall_chokepoint_specs() -> list[dict[str, Any]]:
    seed = _read_json(EAST_HAN_ACCEPTED_AUTHORING_SEED_V0_1_PATH)
    accepted_layers = seed.get("accepted_authoring_layers", {}) if isinstance(seed, dict) else {}
    gate_points = accepted_layers.get("gate_points", []) if isinstance(accepted_layers, dict) else []
    regions = accepted_layers.get("regions", []) if isinstance(accepted_layers, dict) else []
    if not isinstance(gate_points, list):
        return []
    region_by_id: dict[str, dict[str, Any]] = {}
    if isinstance(regions, list):
        for raw_region in regions:
            if not isinstance(raw_region, dict):
                continue
            region_id = str(raw_region.get("id", "")).strip()
            if region_id:
                region_by_id[region_id] = raw_region

    result: list[dict[str, Any]] = []
    seen_pairs: set[str] = set()
    for gate in gate_points:
        if not isinstance(gate, dict):
            continue
        gate_name = str(gate.get("name", "")).strip()
        if gate_name == "镇南关":
            continue
        position = gate.get("position_base_8k", {})
        if not isinstance(position, dict):
            continue
        try:
            x = round(float(position.get("x")))
            y = round(float(position.get("y")))
        except (TypeError, ValueError):
            continue
        from_region_id = str(gate.get("from_region_id", "")).strip()
        to_region_id = str(gate.get("to_region_id", "")).strip()
        from_region = region_by_id.get(from_region_id, {})
        to_region = region_by_id.get(to_region_id, {})
        from_state_group_id = str(gate.get("from_state_group_id", "")).strip() or str(from_region.get("state_id", "")).strip()
        to_state_group_id = str(gate.get("to_state_group_id", "")).strip() or str(to_region.get("state_id", "")).strip()
        from_state_label = str(gate.get("from_state_group_label", "")).strip() or str(from_region.get("state_label", "")).strip()
        to_state_label = str(gate.get("to_state_group_label", "")).strip() or str(to_region.get("state_label", "")).strip()
        from_region_label = str(gate.get("from_region_label", "")).strip()
        to_region_label = str(gate.get("to_region_label", "")).strip()
        from_state_label = _normalize_east_han_state_label(from_state_label, from_region_label, from_state_group_id)
        to_state_label = _normalize_east_han_state_label(to_state_label, to_region_label, to_state_group_id)
        cross_state_group = bool(gate.get("cross_state_group")) or (
            bool(from_state_group_id) and bool(to_state_group_id) and from_state_group_id != to_state_group_id
        )
        if not cross_state_group:
            continue
        pair_key = _east_han_chokepoint_state_pair_key(
            {
                "from_state_group_id": from_state_group_id,
                "to_state_group_id": to_state_group_id,
                "from_state_group_label": from_state_label,
                "to_state_group_label": to_state_label,
            }
        )
        if not pair_key or pair_key in seen_pairs:
            continue
        seen_pairs.add(pair_key)
        gate_id = str(gate.get("id", "")).strip()
        fallback_gate_id = f"gate_{x}_{y}"
        result.append(
            {
                "runtimePlacementId": f"accepted_pass_wall_{gate_id or fallback_gate_id}",
                "runtimeChokepointId": f"accepted_pass_wall_{gate_id or fallback_gate_id}",
                "sourceGateId": gate_id,
                "x": x,
                "y": y,
                "boundaryPairKey": pair_key,
                "label": gate_name or f"{from_region_label} / {to_region_label}".strip(" /") or "关口",
                "fromStateGroupId": from_state_group_id,
                "toStateGroupId": to_state_group_id,
                "fromStateGroupLabel": from_state_label,
                "toStateGroupLabel": to_state_label,
            }
        )
    return result


def _load_accepted_pass_wall_chokepoint_ids() -> list[str]:
    return [str(spec.get("runtimePlacementId", "")).strip() for spec in _load_accepted_pass_wall_chokepoint_specs() if str(spec.get("runtimePlacementId", "")).strip()]


def _split_chokepoint_runtime_placement_ids(raw: str) -> list[str]:
    return _split_mountain_boundary_runtime_placement_ids(raw)


def _resolve_chokepoint_runtime_placement_batch(args: argparse.Namespace) -> dict[str, Any]:
    explicit_ids = _split_chokepoint_runtime_placement_ids(args.chokepoint_runtime_placement_ids)
    if explicit_ids:
        return {
            "runtimePlacementPreset": "chokepoint-explicit",
            "candidatePlacementCount": len(explicit_ids),
            "selectedRuntimePlacementIds": explicit_ids,
            "selectedRuntimePlacementSpecs": [{"runtimePlacementId": placement_id} for placement_id in explicit_ids],
            "selectionPolicy": "Explicit pass-wall runtime chokepoint id list supplied by caller.",
        }

    preset = str(getattr(args, "chokepoint_runtime_placement_preset", "none") or "none").strip()
    if preset == "none":
        return {
            "runtimePlacementPreset": "none",
            "candidatePlacementCount": 0,
            "selectedRuntimePlacementIds": [],
            "selectionPolicy": "",
        }
    if preset not in {"accepted-pass-wall-sample", "accepted-pass-wall-all"}:
        return {
            "runtimePlacementPreset": preset,
            "candidatePlacementCount": 0,
            "selectedRuntimePlacementIds": [],
            "selectionPolicy": "",
            "error": "unknown_chokepoint_runtime_placement_preset",
        }
    candidate_specs = _load_accepted_pass_wall_chokepoint_specs()
    candidate_ids = [str(spec.get("runtimePlacementId", "")).strip() for spec in candidate_specs if str(spec.get("runtimePlacementId", "")).strip()]
    selected_ids = candidate_ids if preset.endswith("-all") else _spread_sample(candidate_ids, args.chokepoint_runtime_placement_sample_count)
    spec_by_id = {str(spec.get("runtimePlacementId", "")).strip(): spec for spec in candidate_specs}
    return {
        "runtimePlacementPreset": preset,
        "contractPath": str(EAST_HAN_ACCEPTED_AUTHORING_SEED_V0_1_PATH),
        "candidateLineRole": "accepted_cross_state_pass_wall_chokepoint",
        "candidatePlacementCount": len(candidate_ids),
        "selectedRuntimePlacementIds": selected_ids,
        "selectedRuntimePlacementSpecs": [spec_by_id.get(placement_id, {"runtimePlacementId": placement_id}) for placement_id in selected_ids],
        "selectionPolicy": (
            "Select accepted cross-state gate jump targets after the same unordered state-pair "
            "dedupe used by main_world_chokepoint_layer. These are pass-wall nodes, not generic mountain placements."
        ),
    }


def _safe_evidence_slug(value: str) -> str:
    safe = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in value.strip())
    return safe[:120] or "placement"


def _write_mountain_boundary_runtime_placement_batch_contact_sheet(children: list[dict[str, Any]], output_path: Path) -> dict[str, Any]:
    try:
        from PIL import Image, ImageDraw
    except Exception as exc:
        return {"ok": False, "reason": f"PIL unavailable: {exc}", "path": str(output_path)}

    screenshots: list[tuple[dict[str, Any], Any]] = []
    for child in children:
        screenshot_path = Path(str(child.get("screenshot", "")))
        if not screenshot_path.exists():
            continue
        with Image.open(screenshot_path) as image:
            screenshots.append((child, image.convert("RGB").copy()))
    if not screenshots:
        return {"ok": False, "reason": "no_screenshots", "path": str(output_path)}

    columns = min(4, max(1, len(screenshots)))
    thumb_width = 360
    label_height = 44
    thumb_height = max(1, int(screenshots[0][1].height * thumb_width / max(1, screenshots[0][1].width)))
    rows = (len(screenshots) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * thumb_width, rows * (thumb_height + label_height)), (34, 38, 30))
    draw = ImageDraw.Draw(sheet)
    for index, (child, image) in enumerate(screenshots):
        row = index // columns
        column = index % columns
        x = column * thumb_width
        y = row * (thumb_height + label_height)
        thumb = image.resize((thumb_width, thumb_height), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x, y + label_height))
        placement_id = str(child.get("runtimePlacementId", ""))
        suffix = placement_id.rsplit("_", 1)[-1]
        label = f"{index + 1:02d} {suffix} ok={int(bool(child.get('ok', False)))} on={child.get('spriteOnScreenCount', 0)} fail={child.get('spriteFailedCount', 0)}"
        draw.text((x + 8, y + 8), label, fill=(245, 232, 190))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, quality=92)
    return {"ok": output_path.exists(), "path": str(output_path), "frameCount": len(screenshots)}


def _run_single_mountain_boundary_runtime_placement_focus(
    args: argparse.Namespace,
    placement_id: str,
    child_dir: Path,
    index: int,
    attempt: int,
) -> dict[str, Any]:
    command = [
        sys.executable,
        str(Path(__file__).resolve()),
        "--backend-url",
        args.backend_url,
        "--backend-timeout-sec",
        str(args.backend_timeout_sec),
        "--server-script",
        args.server_script,
        "--project-path",
        args.project_path,
        "--scene",
        args.scene,
        "--display-mode",
        "world",
        "--world-action",
        "focus_mountain_boundary",
        "--mountain-boundary-runtime-placement-id",
        placement_id,
        "--panel-id",
        args.panel_id,
        "--evidence-dir",
        str(child_dir),
        "--timeout-sec",
        str(args.timeout_sec),
    ]
    if args.no_start_backend:
        command.append("--no-start-backend")
    if args.godot_exe.strip():
        command.extend(["--godot-exe", args.godot_exe])
    if args.window_width > 0:
        command.extend(["--window-width", str(args.window_width)])
    if args.window_height > 0:
        command.extend(["--window-height", str(args.window_height)])
    if args.show_observability:
        command.append("--show-observability")

    child_result = subprocess.run(command, cwd=REPO_ROOT, text=True, encoding="utf-8", errors="replace")
    child_summary_path = child_dir / "mainline_visual_smoke_summary.json"
    child_report_path = child_dir / "godot_visual_smoke_report.json"
    child_summary = _read_json(child_summary_path) if child_summary_path.exists() else {}
    child_report = _read_json(child_report_path) if child_report_path.exists() else {}
    world_action_result = child_report.get("worldActionResult", {}) if isinstance(child_report, dict) else {}
    main_map_streaming = child_report.get("mainMapStreaming", {}) if isinstance(child_report, dict) else {}
    child_ok = child_result.returncode == 0 and bool(child_summary.get("ok", False))
    return {
        "index": index,
        "attempt": attempt,
        "runtimePlacementId": placement_id,
        "ok": child_ok,
        "returnCode": child_result.returncode,
        "evidenceDir": str(child_dir),
        "summaryReport": str(child_summary_path),
        "godotReport": str(child_report_path),
        "screenshot": str(child_dir / "01_ready_world_map.png"),
        "targetCell": world_action_result.get("targetCell", {}),
        "worldActionOk": bool(world_action_result.get("ok", False)) if isinstance(world_action_result, dict) else False,
        "worldActionReason": str(world_action_result.get("reason", "")) if isinstance(world_action_result, dict) else "",
        "spriteDrawCount": int(main_map_streaming.get("mainWorldMountainBoundarySpriteDrawCount", 0) or 0),
        "spriteFailedCount": int(main_map_streaming.get("mainWorldMountainBoundarySpriteFailedCount", 0) or 0),
        "spriteOnScreenCount": int(main_map_streaming.get("mainWorldMountainBoundarySpriteOnScreenCount", 0) or 0),
        "runtimeAssetLoadedCount": int(main_map_streaming.get("mainWorldMountainBoundaryRuntimeAssetLoadedCount", 0) or 0),
    }


def _run_mountain_boundary_runtime_placement_batch(args: argparse.Namespace, evidence_dir: Path, batch_selection: dict[str, Any]) -> int:
    placement_ids = list(batch_selection.get("selectedRuntimePlacementIds", []))
    batch_summary_path = evidence_dir / "mountain_boundary_runtime_placement_batch_summary.json"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    if not placement_ids:
        summary = {
            "command": "run_mainline_visual_smoke",
            "mode": "mountain_boundary_runtime_placement_batch",
            "ok": False,
            "error": batch_selection.get("error", "mountain_boundary_runtime_placement_ids_empty"),
            "evidenceDir": str(evidence_dir),
            "summaryReport": str(batch_summary_path),
            "runtimePlacementPreset": batch_selection.get("runtimePlacementPreset", "none"),
            "selectionPolicy": batch_selection.get("selectionPolicy", ""),
        }
        _write_json(batch_summary_path, summary)
        _print_summary(summary)
        return 1

    children: list[dict[str, Any]] = []
    for index, placement_id in enumerate(placement_ids, 1):
        base_child_dir = evidence_dir / f"{index:02d}_{_safe_evidence_slug(placement_id)}"
        attempts: list[dict[str, Any]] = []
        max_attempts = max(1, int(args.mountain_boundary_runtime_placement_retry_count) + 1)
        selected_child: dict[str, Any] | None = None
        for attempt in range(1, max_attempts + 1):
            child_dir = base_child_dir if attempt == 1 else evidence_dir / f"{index:02d}_{_safe_evidence_slug(placement_id)}_retry{attempt - 1:02d}"
            attempt_child = _run_single_mountain_boundary_runtime_placement_focus(args, placement_id, child_dir, index, attempt)
            attempts.append(attempt_child)
            selected_child = attempt_child
            if bool(attempt_child.get("ok", False)):
                break
            if attempt < max_attempts:
                time.sleep(0.75)
        child = dict(selected_child or attempts[-1])
        child["attemptCount"] = len(attempts)
        child["retried"] = len(attempts) > 1
        child["attempts"] = attempts
        children.append(child)

    contact_sheet = _write_mountain_boundary_runtime_placement_batch_contact_sheet(
        children,
        evidence_dir / "mountain_boundary_runtime_placement_batch_contact_sheet.jpg",
    )
    ok = all(bool(child.get("ok", False)) for child in children)
    summary = {
        "command": "run_mainline_visual_smoke",
        "mode": "mountain_boundary_runtime_placement_batch",
        "ok": ok,
        "evidenceDir": str(evidence_dir),
        "summaryReport": str(batch_summary_path),
        "runtimePlacementPreset": batch_selection.get("runtimePlacementPreset", "explicit"),
        "contractPath": batch_selection.get("contractPath", ""),
        "candidateLineRole": batch_selection.get("candidateLineRole", ""),
        "selectionPolicy": batch_selection.get("selectionPolicy", ""),
        "candidatePlacementCount": batch_selection.get("candidatePlacementCount", len(placement_ids)),
        "placementCount": len(placement_ids),
        "passedCount": sum(1 for child in children if bool(child.get("ok", False))),
        "failedCount": sum(1 for child in children if not bool(child.get("ok", False))),
        "retryCount": max(0, int(args.mountain_boundary_runtime_placement_retry_count)),
        "retriedPlacementCount": sum(1 for child in children if bool(child.get("retried", False))),
        "selectedRuntimePlacementIds": placement_ids,
        "batchContactSheet": contact_sheet,
        "placements": children,
    }
    _write_json(batch_summary_path, summary)
    _print_summary(summary)
    return 0 if ok else 1


def _run_single_chokepoint_runtime_placement_focus(
    args: argparse.Namespace,
    placement_spec: dict[str, Any],
    child_dir: Path,
    index: int,
    attempt: int,
) -> dict[str, Any]:
    placement_id = str(placement_spec.get("runtimePlacementId", placement_spec.get("runtimeChokepointId", ""))).strip()
    center_x = str(placement_spec.get("x", "")).strip()
    center_y = str(placement_spec.get("y", "")).strip()
    command = [
        sys.executable,
        str(Path(__file__).resolve()),
        "--backend-url",
        args.backend_url,
        "--backend-timeout-sec",
        str(args.backend_timeout_sec),
        "--server-script",
        args.server_script,
        "--project-path",
        args.project_path,
        "--scene",
        args.scene,
        "--display-mode",
        "world",
        "--world-action",
        "focus_chokepoint",
        "--chokepoint-runtime-placement-id",
        placement_id,
        "--panel-id",
        args.panel_id,
        "--evidence-dir",
        str(child_dir),
        "--timeout-sec",
        str(args.timeout_sec),
    ]
    if center_x and center_y:
        command.extend(["--map-center-x", center_x, "--map-center-y", center_y])
    if args.no_start_backend:
        command.append("--no-start-backend")
    if args.godot_exe.strip():
        command.extend(["--godot-exe", args.godot_exe])
    if args.window_width > 0:
        command.extend(["--window-width", str(args.window_width)])
    if args.window_height > 0:
        command.extend(["--window-height", str(args.window_height)])
    if args.show_observability:
        command.append("--show-observability")

    child_result = subprocess.run(command, cwd=REPO_ROOT, text=True, encoding="utf-8", errors="replace")
    child_summary_path = child_dir / "mainline_visual_smoke_summary.json"
    child_report_path = child_dir / "godot_visual_smoke_report.json"
    child_summary = _read_json(child_summary_path) if child_summary_path.exists() else {}
    child_report = _read_json(child_report_path) if child_report_path.exists() else {}
    world_action_result = child_report.get("worldActionResult", {}) if isinstance(child_report, dict) else {}
    streaming_summary = {}
    if isinstance(world_action_result, dict):
        streaming_summary = world_action_result.get("streamingSummary", {})
    if not isinstance(streaming_summary, dict):
        streaming_summary = child_report.get("mainMapStreaming", {}) if isinstance(child_report, dict) else {}
    child_ok = child_result.returncode == 0 and bool(child_summary.get("ok", False))
    return {
        "index": index,
        "attempt": attempt,
        "runtimePlacementId": placement_id,
        "runtimeChokepointId": placement_id,
        "ok": child_ok,
        "returnCode": child_result.returncode,
        "evidenceDir": str(child_dir),
        "summaryReport": str(child_summary_path),
        "godotReport": str(child_report_path),
        "screenshot": str(child_dir / "01_ready_world_map.png"),
        "targetCell": world_action_result.get("targetCell", {}) if isinstance(world_action_result, dict) else {},
        "requestedCenter": {"x": center_x, "y": center_y} if center_x and center_y else {},
        "placementSpec": placement_spec,
        "worldActionOk": bool(world_action_result.get("ok", False)) if isinstance(world_action_result, dict) else False,
        "worldActionReason": str(world_action_result.get("reason", "")) if isinstance(world_action_result, dict) else "",
        "spriteDrawCount": int(streaming_summary.get("mainWorldChokepointSpriteDrawCount", 0) or 0),
        "spriteFailedCount": int(streaming_summary.get("mainWorldChokepointSpriteFailedCount", 0) or 0),
        "spriteOnScreenCount": int(streaming_summary.get("mainWorldChokepointSpriteOnScreenCount", 0) or 0),
        "suppressedCityGateAnchorCount": int(streaming_summary.get("mainWorldChokepointSuppressedCityGateAnchorCount", 0) or 0),
        "worldCellNodeDrawCount": int(streaming_summary.get("worldCellNodeDrawCount", 0) or 0),
        "worldCellNodeDrawFailedCount": int(streaming_summary.get("worldCellNodeDrawFailedCount", 0) or 0),
        "acceptedNodeCount": int(streaming_summary.get("mainWorldChokepointAcceptedNodeCount", 0) or 0),
        "renderPieceInstanceCount": int(streaming_summary.get("mainWorldChokepointRenderPieceInstanceCount", 0) or 0),
    }


def _run_chokepoint_runtime_placement_batch(args: argparse.Namespace, evidence_dir: Path, batch_selection: dict[str, Any]) -> int:
    placement_ids = list(batch_selection.get("selectedRuntimePlacementIds", []))
    raw_specs = batch_selection.get("selectedRuntimePlacementSpecs", [])
    specs_by_id = {
        str(spec.get("runtimePlacementId", spec.get("runtimeChokepointId", ""))).strip(): spec
        for spec in raw_specs
        if isinstance(spec, dict)
    } if isinstance(raw_specs, list) else {}
    batch_summary_path = evidence_dir / "chokepoint_runtime_placement_batch_summary.json"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    if not placement_ids:
        summary = {
            "command": "run_mainline_visual_smoke",
            "mode": "chokepoint_runtime_placement_batch",
            "ok": False,
            "error": batch_selection.get("error", "chokepoint_runtime_placement_ids_empty"),
            "evidenceDir": str(evidence_dir),
            "summaryReport": str(batch_summary_path),
            "runtimePlacementPreset": batch_selection.get("runtimePlacementPreset", "none"),
            "selectionPolicy": batch_selection.get("selectionPolicy", ""),
        }
        _write_json(batch_summary_path, summary)
        _print_summary(summary)
        return 1

    children: list[dict[str, Any]] = []
    for index, placement_id in enumerate(placement_ids, 1):
        base_child_dir = evidence_dir / f"{index:02d}_{_safe_evidence_slug(placement_id)}"
        attempts: list[dict[str, Any]] = []
        max_attempts = max(1, int(args.chokepoint_runtime_placement_retry_count) + 1)
        selected_child: dict[str, Any] | None = None
        for attempt in range(1, max_attempts + 1):
            child_dir = base_child_dir if attempt == 1 else evidence_dir / f"{index:02d}_{_safe_evidence_slug(placement_id)}_retry{attempt - 1:02d}"
            placement_spec = specs_by_id.get(placement_id, {"runtimePlacementId": placement_id})
            attempt_child = _run_single_chokepoint_runtime_placement_focus(args, placement_spec, child_dir, index, attempt)
            attempts.append(attempt_child)
            selected_child = attempt_child
            if bool(attempt_child.get("ok", False)):
                break
            if attempt < max_attempts:
                time.sleep(0.75)
        child = dict(selected_child or attempts[-1])
        child["attemptCount"] = len(attempts)
        child["retried"] = len(attempts) > 1
        child["attempts"] = attempts
        children.append(child)

    contact_sheet = _write_mountain_boundary_runtime_placement_batch_contact_sheet(
        children,
        evidence_dir / "chokepoint_runtime_placement_batch_contact_sheet.jpg",
    )
    ok = all(bool(child.get("ok", False)) for child in children)
    placeholder_free = all(
        int(child.get("worldCellNodeDrawCount", 0) or 0) == 0
        and int(child.get("worldCellNodeDrawFailedCount", 0) or 0) == 0
        for child in children
    )
    summary = {
        "command": "run_mainline_visual_smoke",
        "mode": "chokepoint_runtime_placement_batch",
        "ok": ok and placeholder_free,
        "placeholderFree": placeholder_free,
        "evidenceDir": str(evidence_dir),
        "summaryReport": str(batch_summary_path),
        "runtimePlacementPreset": batch_selection.get("runtimePlacementPreset", "chokepoint-explicit"),
        "contractPath": batch_selection.get("contractPath", ""),
        "candidateLineRole": batch_selection.get("candidateLineRole", ""),
        "selectionPolicy": batch_selection.get("selectionPolicy", ""),
        "candidatePlacementCount": batch_selection.get("candidatePlacementCount", len(placement_ids)),
        "placementCount": len(placement_ids),
        "passedCount": sum(1 for child in children if bool(child.get("ok", False))),
        "failedCount": sum(1 for child in children if not bool(child.get("ok", False))),
        "retryCount": max(0, int(args.chokepoint_runtime_placement_retry_count)),
        "retriedPlacementCount": sum(1 for child in children if bool(child.get("retried", False))),
        "selectedRuntimePlacementIds": placement_ids,
        "batchContactSheet": contact_sheet,
        "placements": children,
    }
    _write_json(batch_summary_path, summary)
    _print_summary(summary)
    return 0 if bool(summary.get("ok", False)) else 1


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a Godot mainline visual smoke for the formal main scene.")
    parser.add_argument("--backend-url", default=DEFAULT_BACKEND_URL)
    parser.add_argument("--backend-timeout-sec", type=float, default=45.0)
    parser.add_argument("--server-script", default="server:dev")
    parser.add_argument("--no-start-backend", action="store_true")
    parser.add_argument("--godot-exe", default="")
    parser.add_argument("--project-path", default=str(DEFAULT_PROJECT_PATH))
    parser.add_argument("--scene", default=DEFAULT_SCENE)
    parser.add_argument("--display-mode", choices=("city", "world"), default=DEFAULT_DISPLAY_MODE)
    parser.add_argument(
        "--world-action",
        choices=(
            "none",
            "open_hub",
            "open_hub_panel",
            "focus_mountain_boundary",
            "focus_outer_mountain_boundary",
            "focus_compact_mountain_boundary",
            "focus_cross_state_commandery_mountain_boundary",
            "focus_large_world_mountain_boundary_sweep",
            "focus_chokepoint",
        ),
        default="none",
    )
    parser.add_argument("--panel-id", default=DEFAULT_PANEL_ID)
    parser.add_argument("--map-center-x", default="", help="Override SLG_MAP_CENTER_X for this smoke run.")
    parser.add_argument("--map-center-y", default="", help="Override SLG_MAP_CENTER_Y for this smoke run.")
    parser.add_argument(
        "--mountain-boundary-runtime-placement-id",
        default="",
        help="For mountain-boundary focus actions, focus this exact runtime placement id.",
    )
    parser.add_argument(
        "--mountain-boundary-runtime-placement-ids",
        default="",
        help="Comma-separated runtime placement ids to focus one by one and aggregate into a batch report.",
    )
    parser.add_argument(
        "--mountain-boundary-runtime-placement-preset",
        choices=(
            "none",
            "outer-contact-sample",
            "outer-contact-all",
            "cross-state-sample",
            "cross-state-all",
            "chokepoint-sample",
            "chokepoint-all",
        ),
        default="none",
        help="Resolve a curated runtime placement batch from the v0.47 mountain boundary contract.",
    )
    parser.add_argument(
        "--mountain-boundary-runtime-placement-sample-count",
        type=int,
        default=10,
        help="For sample presets, deterministically spread this many placements across the candidate set.",
    )
    parser.add_argument(
        "--mountain-boundary-runtime-placement-retry-count",
        type=int,
        default=1,
        help="Retry failed runtime placement focus children this many times before marking the batch child failed.",
    )
    parser.add_argument(
        "--chokepoint-runtime-placement-id",
        default="",
        help="For pass-wall chokepoint focus actions, focus this exact runtime_chokepoint_id.",
    )
    parser.add_argument(
        "--chokepoint-runtime-placement-ids",
        default="",
        help="Comma-separated pass-wall runtime_chokepoint_id values to focus one by one and aggregate into a batch report.",
    )
    parser.add_argument(
        "--chokepoint-runtime-placement-preset",
        choices=(
            "none",
            "accepted-pass-wall-sample",
            "accepted-pass-wall-all",
        ),
        default="none",
        help="Resolve a curated pass-wall chokepoint batch from accepted cross-state gate jump targets.",
    )
    parser.add_argument(
        "--chokepoint-runtime-placement-sample-count",
        type=int,
        default=6,
        help="For pass-wall sample presets, deterministically spread this many accepted pass-wall nodes across the candidate set.",
    )
    parser.add_argument(
        "--chokepoint-runtime-placement-retry-count",
        type=int,
        default=1,
        help="Retry failed pass-wall chokepoint focus children this many times before marking the batch child failed.",
    )
    parser.add_argument("--seed-ai-player-id", default="player_operator_alpha")
    parser.add_argument("--seed-ai-display-name", default="青州后勤官")
    parser.add_argument("--seed-ai-governor-player-id", default="human_alpha")
    parser.add_argument("--seed-ai-faction-id", default="player")
    parser.add_argument("--seed-ai-avatar-id", default="")
    parser.add_argument("--seed-ai-avatar-image", default="")
    parser.add_argument("--evidence-dir", default="")
    parser.add_argument("--window-width", type=int, default=0)
    parser.add_argument("--window-height", type=int, default=0)
    parser.add_argument("--show-observability", action="store_true", help="Keep the in-game observability panel visible in screenshots.")
    parser.add_argument("--close-after-open", action="store_true", help="After opening the requested panel, press its close button before the final screenshot.")
    parser.add_argument("--click-action", choices=CLICK_ACTION_CHOICES, default="none", help="Whitelist-only UI click after the requested panel is opened.")
    parser.add_argument("--state-ids", default="", help="Comma-separated Tianxia Yutu state ids for state-detail screenshot actions.")
    parser.add_argument(
        "--state-case-set",
        choices=STATE_CASE_SET_CHOICES,
        default="",
        help="ASCII-safe Tianxia Yutu state-detail screenshot preset. --state-ids takes precedence when both are provided.",
    )
    parser.add_argument("--isolated-backend-state", action="store_true", help="Start the backend with an isolated state directory for this smoke run.")
    parser.add_argument(
        "--seed-world-tasks-chapter-id",
        choices=("", "huangtian_chapter_02", "huangtian_chapter_03"),
        default="",
        help="Advance the formal world task season to a chapter before Godot UI smoke by using achieveTaskPrototype + claimTaskReward.",
    )
    parser.add_argument(
        "--seed-first-hour-task-claim-prompt-fixture",
        action="store_true",
        help="Seed task01 as claimed so the Godot first-hour claim prompt smoke can make task02 claimable through the land loop before pressing the real claim button.",
    )
    parser.add_argument(
        "--seed-world-affairs-claimable-node",
        action="store_true",
        help="Seed the current world-affairs node through achieveWorldAffairsNode so the Godot claim reward smoke can press the real claim button.",
    )
    parser.add_argument("--isolated-ai-home-city-binding", action="store_true", help="Start an isolated backend and seed one unbound AI player before the home-city bind smoke.")
    parser.add_argument("--godot-script-preflight", action="store_true", help="Load the Godot main scene once and quit before backend seeding/provider work; catches script parse errors early.")
    parser.add_argument("--godot-script-preflight-only", action="store_true", help="Run only the Godot main scene script preflight and exit without backend/UI smoke work.")
    parser.add_argument("--sequence-capture-count", type=int, default=0, help="Capture N additional in-game frames before the final screenshot.")
    parser.add_argument("--sequence-capture-interval-sec", type=float, default=0.20, help="Delay between additional in-game frame captures.")
    parser.add_argument(
        "--map-unit-march-target-tile-id",
        default="",
        help="Optional target tile for the map unit submit/march smoke. Empty keeps the default target resolver.",
    )
    parser.add_argument("--timeout-sec", type=float, default=90.0)
    return parser.parse_args()


def _iter_report_dicts(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from _iter_report_dicts(child)
    elif isinstance(value, list):
        for child in value:
            yield from _iter_report_dicts(child)


def _find_main_city_troop_formation_page_summary(godot_report: dict[str, Any]) -> dict[str, Any]:
    for candidate in _iter_report_dicts(godot_report):
        if candidate.get("troopFormationViewMode") == "three_general_team_detail_v2":
            return candidate
    return {}


def _validate_main_city_troop_type_chip_contract(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action not in MAIN_CITY_TROOP_FORMATION_TROOP_TYPE_CHIP_ACTIONS:
        return []
    page_summary = _find_main_city_troop_formation_page_summary(godot_report)
    failures: list[str] = []
    if not page_summary:
        return ["troopFormationPageSummary missing"]
    if page_summary.get("troopFormationTroopTypeChipToken") != "troop_formation_troop_type_chip_v1":
        failures.append("troopFormationTroopTypeChipToken!=troop_formation_troop_type_chip_v1")
    if not bool(page_summary.get("troopFormationTroopTypeChipVisible", False)):
        failures.append("troopFormationTroopTypeChipVisible!=true")
    if int(page_summary.get("troopFormationTroopTypeChipCount", 0)) < 3:
        failures.append("troopFormationTroopTypeChipCount<3")
    labels = page_summary.get("troopFormationTroopTypeChipLabels", [])
    if not isinstance(labels, list) or len([label for label in labels if str(label).strip()]) < 3:
        failures.append("troopFormationTroopTypeChipLabels<3")
    visual_types = page_summary.get("troopFormationTroopTypeChipVisualTypes", [])
    if not isinstance(visual_types, list) or len([label for label in visual_types if str(label).strip()]) < 3:
        failures.append("troopFormationTroopTypeChipVisualTypes<3")
    return failures


def _find_report_summary_with_key(godot_report: dict[str, Any], key: str) -> dict[str, Any]:
    for candidate in _iter_report_dicts(godot_report):
        if key in candidate:
            return candidate
    return {}


def _validate_tianxia_yutu_state_detail_zoom_contract(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action not in {
        "world_tianxia_yutu_state_detail_zoom_qa",
        "world_tianxia_yutu_all_state_detail_zoom_coverage",
    }:
        return []
    click_result = godot_report.get("clickActionResult", {})
    if not isinstance(click_result, dict):
        return ["clickActionResult missing"]
    failures: list[str] = []
    cases = click_result.get("stateDetailZoomCases", [])
    if not isinstance(cases, list) or not cases:
        failures.append("stateDetailZoomCases missing")
    for index, case in enumerate(cases if isinstance(cases, list) else []):
        if not isinstance(case, dict):
            failures.append(f"stateDetailZoomCases[{index}] invalid")
            continue
        for key in (
            "stateId",
            "stateBoundsCells",
            "stateBoundsPx",
            "recommendedPivotCell",
            "recommendedPivotPx",
            "recommendedZoom",
            "stateFillRatio2k",
            "maskOnly",
            "highResAssetRequired",
            "counts",
            "fallbackReason",
            "rejectionBoundary",
            "failureReasons",
            "screenshot",
        ):
            if key not in case:
                failures.append(f"stateDetailZoomCases[{index}].{key} missing")
        screenshot = case.get("screenshot", {})
        if not isinstance(screenshot, dict) or not str(screenshot.get("path", "")).strip():
            failures.append(f"stateDetailZoomCases[{index}].screenshot.path missing")
    if click_result.get("stateDetailZoomAction") != click_action:
        failures.append("stateDetailZoomAction mismatch")
    if not isinstance(click_result.get("requestedStateIds", []), list) or not click_result.get("requestedStateIds", []):
        failures.append("requestedStateIds missing")
    if not bool(click_result.get("stateDetailZoomRegisteredButNotHeavyValidated", False)):
        failures.append("stateDetailZoomRegisteredButNotHeavyValidated false")
    godot_report["tianxiaYutuStateDetailZoomContractOk"] = not failures
    godot_report["tianxiaYutuStateDetailZoomContractFailures"] = failures
    return failures


def _validate_world_map_video_style_transition_chain_contract(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action != "world_map_video_style_transition_chain_fixture":
        return []
    chain_summary = godot_report.get("worldMapVideoStyleTransitionChain", {})
    if not isinstance(chain_summary, dict) or not chain_summary:
        # Fallback to any inlined report summary to keep compatibility with older payloads.
        chain_summary = _find_report_summary_with_key(godot_report, "worldMapFocusMotionToken")
        if not chain_summary:
            return ["worldMapVideoStyleTransitionChainSummary missing"]
    failures: list[str] = []
    runtime_summary = godot_report.get("cameraZoomFocusRuntimeSummary", {})
    if not isinstance(runtime_summary, dict):
        runtime_summary = {}
    required_fields = (
        "worldMapFocusMotionToken",
        "worldMapFocusTransitionMode",
        "worldMapFocusJumpDeltaCells",
        "worldMapFocusCameraSettle",
        "worldMapFocusTargetPulse",
        "preJumpArrivalMotionToken",
        "preJumpPulseMotion",
        "preJumpPulseMotionSource",
        "preJumpPulseMotionPending",
        "preJumpPulseMotionPendingReason",
        "arrivalSettleMotion",
        "arrivalSettleMotionSource",
        "arrivalSettleMotionPending",
        "arrivalSettleMotionPendingReason",
        "preJumpArrivalRejectIf",
        "cityRoadRevealVisible",
        "roadRevealLevel",
        "visibleRoadNodeCount",
        "focusContextPreserved",
        "combatOutbreakMotion",
        "combatOutbreakMotionSource",
        "combatOutbreakMotionPending",
        "combatOutbreakMotionPendingReason",
        "rewardSettleMotion",
        "rewardSettleMotionSource",
        "rewardSettleMotionPending",
        "rewardSettleMotionPendingReason",
        "rewardSettleSourceCandidate",
        "rewardSettleRequiredClickAction",
        "rewardSettleRequiredSummaryField",
        "rewardSettleNextFrameName",
        "rewardSettleUnwiredReason",
        "returnMainlineCameraSettle",
        "returnMainlineCameraSettleSource",
        "returnMainlineCameraSettlePending",
        "returnMainlineCameraSettlePendingReason",
        "returnMainlineSourceCandidate",
        "returnMainlineRequiredClickAction",
        "returnMainlineRequiredSummaryField",
        "returnMainlineNextFrameName",
        "returnMainlineUnwiredReason",
        "reducedMotionPathOk",
        "lowEndMotionBudgetOk",
    )
    required_runtime_fields = (
        "stateFillRatio2k",
        "runtimeProducerOk",
        "runtimeProducerInvalidFields",
        "runtimeProducerFieldSources",
        "wheelPivotDriftPx",
        "pinchPivotDriftPx",
        "pivotCellDrift",
        "focusSettleTimeMs",
        "hitRadiusPx",
        "labelOverlapCount",
        "loadedChunkCount",
        "loadedChunkIds",
        "unloadCandidateChunkIds",
        "viewportCacheHitCount",
        "viewportStaleResponseCount",
        "memoryPeakMb",
        "memoryAfterUnloadMb",
        "memoryRecoveredMb",
        "cacheUnloadOk",
    )
    for key in required_fields:
        if key not in chain_summary:
            failures.append(f"{key} missing")
    for key in required_runtime_fields:
        if key not in runtime_summary:
            failures.append(f"cameraZoomFocusRuntimeSummary.{key} missing")
    if runtime_summary.get("runtimeProducerOk") is not True:
        failures.append("cameraZoomFocusRuntimeSummary.runtimeProducerOk!=true")
    if runtime_summary.get("runtimeProducerInvalidFields") not in ([], None):
        failures.append("cameraZoomFocusRuntimeSummary.runtimeProducerInvalidFields not empty")
    if not isinstance(runtime_summary.get("runtimeProducerFieldSources", {}), dict):
        failures.append("cameraZoomFocusRuntimeSummary.runtimeProducerFieldSources invalid")
    if str(godot_report.get("worldMapVideoStyleTransitionChainFixtureAction", "")).strip() != "world_map_video_style_transition_chain_fixture":
        failures.append("worldMapVideoStyleTransitionChainFixtureAction mismatch")
    if str(godot_report.get("worldMapVideoStyleTransitionChainSummaryPath", "")).strip() != "worldMapVideoStyleTransitionChain":
        failures.append("worldMapVideoStyleTransitionChainSummaryPath mismatch")
    if not bool(godot_report.get("worldMapVideoStyleTransitionChainFixtureOk", False)):
        failures.append("worldMapVideoStyleTransitionChainFixtureOk false")
    stages = godot_report.get("worldMapVideoStyleTransitionChainStages", [])
    expected_stages = [
        "target_list",
        "pre_jump_pulse",
        "jump_or_fast_zoom",
        "arrival_settle",
        "state_detail_zoom",
        "road_reveal",
        "march_preview",
        "combat_outbreak",
        "report_focus",
        "reward_settle",
        "return_mainline",
    ]
    if not isinstance(stages, list) or stages != expected_stages:
        failures.append("worldMapVideoStyleTransitionChainStages mismatch")
    expected_frame_manifest = godot_report.get("worldMapVideoStyleTransitionExpectedFrameManifest", [])
    if not isinstance(expected_frame_manifest, list):
        expected_frame_manifest = []
    if not bool(godot_report.get("worldMapVideoStyleTransitionExpectedFrameManifestOk", False)):
        failures.append("worldMapVideoStyleTransitionExpectedFrameManifestOk false")
    manifest_stages = [
        str(entry.get("stage", "")).strip()
        for entry in expected_frame_manifest
        if isinstance(entry, dict)
    ]
    if manifest_stages != expected_stages:
        failures.append("worldMapVideoStyleTransitionExpectedFrameManifest stages mismatch")
    for index, (stage_name, file_name) in enumerate(WORLD_MAP_VIDEO_STYLE_TRANSITION_STAGE_FRAMES):
        entry = expected_frame_manifest[index] if index < len(expected_frame_manifest) else {}
        if not isinstance(entry, dict):
            failures.append(f"worldMapVideoStyleTransitionExpectedFrameManifest.{stage_name} missing")
            continue
        if str(entry.get("fileName", "")).strip() != file_name:
            failures.append(f"worldMapVideoStyleTransitionExpectedFrameManifest.{stage_name}.fileName mismatch")
        if not str(entry.get("expectedContent", "")).strip():
            failures.append(f"worldMapVideoStyleTransitionExpectedFrameManifest.{stage_name}.expectedContent missing")
        if not str(entry.get("manualReviewFocus", "")).strip():
            failures.append(f"worldMapVideoStyleTransitionExpectedFrameManifest.{stage_name}.manualReviewFocus missing")
        if not bool(entry.get("semanticReviewRequired", False)):
            failures.append(f"worldMapVideoStyleTransitionExpectedFrameManifest.{stage_name}.semanticReviewRequired false")
        required_summary_fields = entry.get("requiredSummaryFields", [])
        if not isinstance(required_summary_fields, list) or not required_summary_fields:
            failures.append(f"worldMapVideoStyleTransitionExpectedFrameManifest.{stage_name}.requiredSummaryFields missing")
            required_summary_fields = []
        for summary_key in required_summary_fields:
            if str(summary_key) not in chain_summary:
                failures.append(f"worldMapVideoStyleTransitionExpectedFrameManifest.{stage_name}.requiredSummaryFields.{summary_key} missing")
        reject_if = entry.get("rejectIf", [])
        if not isinstance(reject_if, list) or not reject_if:
            failures.append(f"worldMapVideoStyleTransitionExpectedFrameManifest.{stage_name}.rejectIf missing")
    if not isinstance(chain_summary.get("worldMapFocusJumpDeltaCells", {}), dict):
        failures.append("worldMapFocusJumpDeltaCells invalid")
    if int(chain_summary.get("visibleRoadNodeCount", 0) or 0) < 0:
        failures.append("visibleRoadNodeCount invalid")
    frame_evidence = godot_report.get("worldMapVideoStyleTransitionChainFrameEvidence", {})
    if not isinstance(frame_evidence, dict):
        frame_evidence = {}
    frame_evidence_missing = godot_report.get("worldMapVideoStyleTransitionChainFrameEvidenceMissing", [])
    if not isinstance(frame_evidence_missing, list):
        frame_evidence_missing = ["invalid_missing_list"]
    if not bool(godot_report.get("worldMapVideoStyleTransitionChainFrameEvidenceOk", False)):
        failures.append("worldMapVideoStyleTransitionChainFrameEvidenceOk false")
    if frame_evidence_missing:
        failures.append("worldMapVideoStyleTransitionChainFrameEvidenceMissing not empty")
    for stage_name, _file_name in WORLD_MAP_VIDEO_STYLE_TRANSITION_STAGE_FRAMES:
        frame_entry = frame_evidence.get(stage_name, {})
        if not isinstance(frame_entry, dict):
            failures.append(f"worldMapVideoStyleTransitionChainFrameEvidence.{stage_name} missing")
            continue
        frame_path = Path(str(frame_entry.get("path", "")).strip())
        if not bool(frame_entry.get("ok", False)):
            failures.append(f"worldMapVideoStyleTransitionChainFrameEvidence.{stage_name}.ok false")
        if not str(frame_entry.get("path", "")).strip() or not frame_path.exists():
            failures.append(f"worldMapVideoStyleTransitionChainFrameEvidence.{stage_name}.path missing")
        expected_entry = frame_entry.get("expected", {})
        if not isinstance(expected_entry, dict) or str(expected_entry.get("stage", "")).strip() != stage_name:
            failures.append(f"worldMapVideoStyleTransitionChainFrameEvidence.{stage_name}.expected mismatch")
    motion_source_checks = (
        ("preJumpPulseMotion", "preJumpPulseMotionSource", "preJumpPulseMotionPending", "preJumpPulseMotionPendingReason"),
        ("arrivalSettleMotion", "arrivalSettleMotionSource", "arrivalSettleMotionPending", "arrivalSettleMotionPendingReason"),
        ("combatOutbreakMotion", "combatOutbreakMotionSource", "combatOutbreakMotionPending", "combatOutbreakMotionPendingReason"),
        ("rewardSettleMotion", "rewardSettleMotionSource", "rewardSettleMotionPending", "rewardSettleMotionPendingReason"),
        (
            "returnMainlineCameraSettle",
            "returnMainlineCameraSettleSource",
            "returnMainlineCameraSettlePending",
            "returnMainlineCameraSettlePendingReason",
        ),
    )
    fixture_ok = bool(godot_report.get("worldMapVideoStyleTransitionChainFixtureOk", False))
    for motion_key, source_key, pending_key, reason_key in motion_source_checks:
        source = str(chain_summary.get(source_key, "")).strip()
        pending = bool(chain_summary.get(pending_key, False))
        if pending and source != "missing_runtime_source":
            failures.append(f"{source_key} must be missing_runtime_source when {pending_key}=true")
        if pending and str(chain_summary.get(reason_key, "")).strip() == "":
            failures.append(f"{reason_key} missing")
        if not pending and source == "missing_runtime_source":
            failures.append(f"{source_key} missing_runtime_source without {pending_key}")
        if fixture_ok and pending:
            failures.append(f"{pending_key} true while fixture ok")
        if fixture_ok and not bool(chain_summary.get(motion_key, False)):
            failures.append(f"{motion_key} false while fixture ok")
    godot_report["worldMapVideoStyleTransitionChainContractOk"] = not failures
    godot_report["worldMapVideoStyleTransitionChainContractFailures"] = failures
    return failures


def _validate_tile_resource_hud_contract(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action != "world_tile_resource_coverage_matrix_fixture":
        return []
    summary = _find_report_summary_with_key(godot_report, "worldTileResourceCoverageMatrixOk")
    if not summary:
        return ["worldTileResourceCoverageMatrixSummary missing"]
    failures: list[str] = []
    forbidden_hits = summary.get("visibleCopyForbiddenHits", [])
    if isinstance(forbidden_hits, list) and "守军强度" in [str(hit) for hit in forbidden_hits]:
        failures.append("visibleCopyForbiddenHits contains 守军强度")
    visible_labels = summary.get("visiblePrimaryLabels", [])
    if isinstance(visible_labels, list) and any("守军强度" in str(label) for label in visible_labels):
        failures.append("visiblePrimaryLabels contains 守军强度")
    guard_label = str(summary.get("guardSoldierLabel", "")).strip()
    recommended_label = str(summary.get("recommendedPowerLabel", "")).strip()
    if not guard_label.startswith("守军兵力 "):
        failures.append("guardSoldierLabel prefix invalid")
    if not recommended_label.startswith("推荐战力 "):
        failures.append("recommendedPowerLabel prefix invalid")
    if not bool(summary.get("guardSoldierAndRecommendedPowerSeparatedOk", False)):
        failures.append("guardSoldierAndRecommendedPowerSeparatedOk!=true")
    if int(summary.get("guardSoldierCount", -1) or -1) == int(summary.get("recommendedPower", -1) or -1):
        failures.append("guardSoldierCount==recommendedPower")
    if int(summary.get("guardSoldierAuthorityExpected", 0) or 0) == 900:
        if int(summary.get("guardSoldierCount", 0) or 0) != 900:
            failures.append("guardSoldierCount!=900 for Lv3")
        if int(summary.get("recommendedPower", 0) or 0) != 300:
            failures.append("recommendedPower!=300 for Lv3")
    if not bool(summary.get("resourceTileHudAuthorityNumbersOk", False)):
        failures.append("resourceTileHudAuthorityNumbersOk!=true")
    if str(summary.get("tileHudSharedStyleOwner", "")).strip() != "SlgUiComponentFactory + MainMapCellActionPanel":
        failures.append("tileHudSharedStyleOwner!=SlgUiComponentFactory + MainMapCellActionPanel")
    if str(summary.get("tileHudBackplateToken", "")).strip() != "tile_action_hud_landscape_slg_min_visual_polish_v1":
        failures.append("tileHudBackplateToken!=tile_action_hud_landscape_slg_min_visual_polish_v1")
    if str(summary.get("tileHudAnchorMode", "")).strip() != "selected_tile_bound":
        failures.append("tileHudAnchorMode!=selected_tile_bound")
    if not bool(summary.get("tileHudBoundToSelectedTile", False)):
        failures.append("tileHudBoundToSelectedTile!=true")
    if not isinstance(summary.get("selectedTileScreenPosition", {}), dict) or not summary.get("selectedTileScreenPosition"):
        failures.append("selectedTileScreenPosition missing")
    if not isinstance(summary.get("tileHudRect", {}), dict) or not summary.get("tileHudRect"):
        failures.append("tileHudRect missing")
    if not bool(summary.get("tileHudAvoidsLeftRailAndBottomNav", False)):
        failures.append("tileHudAvoidsLeftRailAndBottomNav!=true")
    return failures


def _validate_first_hour_land_loop_integrated_contract(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action != "first_hour_land_loop_integrated_click_to_task_readback_gate":
        return []
    summary = _find_report_summary_with_key(godot_report, "firstHourLandLoopIntegratedClickToTaskReadbackOk")
    if not summary:
        return ["firstHourLandLoopIntegratedSummary missing"]
    failures: list[str] = []
    bool_requirements = (
        "firstHourLandLoopIntegratedClickToTaskReadbackOk",
        "godotResourceHudExpeditionActionOk",
        "backendReceiptReadbackOk",
        "resourceReadbackOk",
        "battleRecordReadbackOk",
        "taskReadbackOk",
        "taskProgressAutoAdvanced",
        "currentGoalsReadbackOk",
        "currentGoalsReadModelOnly",
        "stage195BackendPersistenceGateReferenced",
    )
    for key in bool_requirements:
        if not bool(summary.get(key, False)):
            failures.append(f"{key}!=true")
    if not bool(summary.get("firstHourLandLoopIntegratedClickToTaskReadbackOk", False)):
        failures.append("firstHourLandLoopIntegratedClickToTaskReadbackOk!=true")
    if not bool(summary.get("taskProgressAutoAdvanced", False)):
        failures.append("taskProgressAutoAdvanced!=true")
    if bool(summary.get("taskProgressAutoAdvanceBlocked", False)):
        failures.append("taskProgressAutoAdvanceBlocked!=false")
    if str(summary.get("settlementReceiptId", "")).strip() == "":
        failures.append("settlementReceiptId missing")
    if str(summary.get("battleReportId", "")).strip() == "":
        failures.append("battleReportId missing")
    resource_delta = summary.get("resourceDelta", {})
    if not isinstance(resource_delta, dict) or not resource_delta:
        failures.append("resourceDelta missing")
    if int(summary.get("netResourceDelta", 0) or 0) == 0:
        failures.append("netResourceDelta==0")
    if int(summary.get("expectedNetResourceDelta", 0) or 0) == 0:
        failures.append("expectedNetResourceDelta==0")
    if bool(summary.get("playerVisibleEngineeringCopyLeak", False)):
        failures.append("playerVisibleEngineeringCopyLeak!=false")
    if summary.get("visibleCopyForbiddenHits") not in ([], None):
        failures.append("visibleCopyForbiddenHits not empty")
    return failures


def _validate_first_hour_task_claim_prompt_contract(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action != "first_hour_land_loop_task_claim_prompt_gate":
        return []
    summary = _find_report_summary_with_key(godot_report, "firstHourTaskClaimPromptOk")
    if not summary:
        return ["firstHourTaskClaimPromptSummary missing"]
    failures: list[str] = []
    bool_requirements = (
        "firstHourTaskClaimPromptOk",
        "firstHourTaskClaimPromptVisible",
        "taskClaimButtonVisible",
        "taskClaimButtonPressed",
        "taskClaimFeedbackVisible",
        "taskClaimRewardResourcesAppliedOk",
        "nextTaskAfterClaimVisible",
        "nextTaskAfterClaimGuidanceOk",
        "currentGoalsReadModelOnly",
        "resourceOccupationTaskProgressStillOk",
    )
    for key in bool_requirements:
        if not bool(summary.get(key, False)):
            failures.append(f"{key}!=true")
    if str(summary.get("taskId", "")).strip() != "huangtian_task_02_prepare_supplies":
        failures.append("taskId!=huangtian_task_02_prepare_supplies")
    if str(summary.get("claimState", "")).strip() != "claimable":
        failures.append("claimState!=claimable")
    if str(summary.get("taskClaimAfterState", "")).strip() != "claimed":
        failures.append("taskClaimAfterState!=claimed")
    if summary.get("taskClaimVisibleCopyForbiddenHits") not in ([], None):
        failures.append("taskClaimVisibleCopyForbiddenHits not empty")
    expected_rewards = summary.get("taskClaimRewardPreviewResources")
    actual_delta = summary.get("taskClaimResourceDelta")
    if not isinstance(expected_rewards, dict) or not expected_rewards:
        failures.append("taskClaimRewardPreviewResources missing")
    if not isinstance(actual_delta, dict) or not actual_delta:
        failures.append("taskClaimResourceDelta missing")
    if isinstance(expected_rewards, dict) and isinstance(actual_delta, dict):
        for key, expected_value in expected_rewards.items():
            try:
                if int(actual_delta.get(key, 0)) < int(expected_value):
                    failures.append(f"taskClaimResourceDelta[{key}] below expected reward")
            except (TypeError, ValueError):
                failures.append(f"taskClaimResourceDelta[{key}] invalid")
    if not str(summary.get("nextTaskAfterClaimId", "")).strip():
        failures.append("nextTaskAfterClaimId missing")
    if not str(summary.get("nextTaskAfterClaimTitle", "")).strip():
        failures.append("nextTaskAfterClaimTitle missing")
    if not str(summary.get("nextTaskAfterClaimActionHint", "")).strip():
        failures.append("nextTaskAfterClaimActionHint missing")
    action_target = summary.get("nextTaskAfterClaimActionTarget")
    if not isinstance(action_target, dict) or not str(action_target.get("kind", "")).strip() or not str(action_target.get("id", "")).strip():
        failures.append("nextTaskAfterClaimActionTarget missing")
    return failures


def _camera_runtime_producer_metadata_for_validation(summary: dict[str, Any]) -> dict[str, Any]:
    cameraZoomFocusRuntimeSummary = summary.get("cameraZoomFocusRuntimeSummary", {})
    if not isinstance(cameraZoomFocusRuntimeSummary, dict):
        cameraZoomFocusRuntimeSummary = {}
    metadata_source = cameraZoomFocusRuntimeSummary
    if not any(key in metadata_source for key in ("runtimeProducerOk", "runtimeProducerInvalidFields", "runtimeProducerFieldSources")):
        metadata_source = summary
    return {
        "runtimeProducerOk": metadata_source.get("runtimeProducerOk"),
        "runtimeProducerInvalidFields": metadata_source.get("runtimeProducerInvalidFields"),
        "runtimeProducerFieldSources": metadata_source.get("runtimeProducerFieldSources"),
    }


def _validate_mainworld_camera_pan_resource_roundtrip_contract(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action != "world_mainworld_camera_pan_resource_roundtrip_fixture":
        return []
    summary = _find_report_summary_with_key(godot_report, "mainWorldCameraPanResourceRoundtripOk")
    if not summary:
        return ["mainWorldCameraPanResourceRoundtripSummary missing"]
    failures: list[str] = []
    bool_requirements = (
        "mainWorldCameraPanResourceRoundtripOk",
        "mainWorldMapVisibleBefore",
        "mainWorldMapVisibleAfterPan",
        "resourceHudAfterPanOk",
        "resourceTileSelectedAfterPan",
        "resourceOccupationAfterPanReadbackOk",
        "firstHourLandLoopIntegratedClickToTaskReadbackOk",
        "taskProgressAutoAdvanced",
    )
    for key in bool_requirements:
        if not bool(summary.get(key, False)):
            failures.append(f"{key}!=true")
    start_cell = summary.get("cameraStartCell", {})
    end_cell = summary.get("cameraEndCell", {})
    if not isinstance(start_cell, dict) or not start_cell:
        failures.append("cameraStartCell missing")
    if not isinstance(end_cell, dict) or not end_cell:
        failures.append("cameraEndCell missing")
    if isinstance(start_cell, dict) and isinstance(end_cell, dict) and start_cell == end_cell:
        failures.append("cameraStartCell==cameraEndCell")
    delta = summary.get("cameraPanDeltaCells", {})
    if not isinstance(delta, dict) or (int(delta.get("x", 0) or 0) == 0 and int(delta.get("y", 0) or 0) == 0):
        failures.append("cameraPanDeltaCells zero_or_missing")
    chunks_before = summary.get("viewportLoadedChunkIdsBefore", [])
    chunks_after = summary.get("viewportLoadedChunkIdsAfter", [])
    if not isinstance(chunks_before, list) or not chunks_before:
        failures.append("viewportLoadedChunkIdsBefore missing")
    if not isinstance(chunks_after, list) or not chunks_after:
        failures.append("viewportLoadedChunkIdsAfter missing")
    if bool(summary.get("playerVisibleEngineeringCopyLeak", False)):
        failures.append("playerVisibleEngineeringCopyLeak!=false")
    if summary.get("visibleCopyForbiddenHits") not in ([], None):
        failures.append("visibleCopyForbiddenHits not empty")
    if bool(summary.get("planOnly", True)):
        failures.append("planOnly!=false")
    for numeric_key in (
        "stateFillRatio2k",
        "wheelPivotDriftPx",
        "pinchPivotDriftPx",
        "pivotCellDrift",
        "focusSettleTimeMs",
        "hitRadiusPx",
        "labelOverlapCount",
        "loadedChunkCount",
        "unloadCandidateChunkCount",
        "viewportCacheHitCount",
        "viewportStaleResponseCount",
    ):
        if not isinstance(summary.get(numeric_key), (int, float)):
            failures.append(f"{numeric_key} missing_or_non_numeric")
    for optional_numeric_key in ("memoryPeakMb", "memoryAfterUnloadMb", "memoryRecoveredMb"):
        optional_value = summary.get(optional_numeric_key)
        if optional_value is not None and not isinstance(optional_value, (int, float)):
            failures.append(f"{optional_numeric_key} non_numeric")
    if not isinstance(summary.get("cacheUnloadOk"), bool):
        failures.append("cacheUnloadOk missing_or_non_bool")
    producer_metadata = _camera_runtime_producer_metadata_for_validation(summary)
    if producer_metadata.get("runtimeProducerOk") is not True:
        failures.append("runtimeProducerOk!=true")
    if producer_metadata.get("runtimeProducerInvalidFields") not in ([], None):
        failures.append("runtimeProducerInvalidFields not empty")
    if not isinstance(producer_metadata.get("runtimeProducerFieldSources"), dict):
        failures.append("runtimeProducerFieldSources missing_or_invalid")
    return failures


def _validate_click_priority_matrix_contract(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action != "world_click_priority_matrix_fixture":
        return []
    summary = _find_report_summary_with_key(godot_report, "worldClickPriorityMatrixOk")
    if not summary:
        return ["worldClickPriorityMatrixSummary missing"]
    failures: list[str] = []
    if not bool(summary.get("clickPriorityFullProtectedSamplesOk", False)):
        failures.append("clickPriorityFullProtectedSamplesOk!=true")
    if summary.get("clickPriorityUnavailableSamples") not in ([], None):
        failures.append("clickPriorityUnavailableSamples not empty")
    if summary.get("clickPriorityMissingProtectedSampleIds") not in ([], None):
        failures.append("clickPriorityMissingProtectedSampleIds not empty")
    if not bool(summary.get("clickPriorityProtectedFootprintVetoOk", False)):
        failures.append("clickPriorityProtectedFootprintVetoOk!=true")
    if not bool(summary.get("clickPriorityResourceHudOpenOk", False)):
        failures.append("clickPriorityResourceHudOpenOk!=true")
    if not bool(summary.get("clickPriorityL0SubstrateOk", False)):
        failures.append("clickPriorityL0SubstrateOk!=true")
    if summary.get("visibleCopyForbiddenHits") not in ([], None):
        failures.append("visibleCopyForbiddenHits not empty")
    required = {str(item).strip() for item in summary.get("clickPriorityRequiredProtectedSamples", []) if str(item).strip()}
    present = {str(item).strip() for item in summary.get("clickPriorityPresentProtectedSampleIds", []) if str(item).strip()}
    missing_required = sorted(required - present)
    if missing_required:
        failures.append(f"required protected samples missing: {','.join(missing_required)}")
    forbidden_source_terms = ("fake", "temporary", "hardcoded", "test_only")
    for sample in summary.get("clickPrioritySamples", []):
        if not isinstance(sample, dict) or sample.get("expectedKind") != "protected_footprint":
            continue
        sample_id = str(sample.get("sampleId", "")).strip()
        if not sample_id:
            failures.append("protected sampleId missing")
        if not str(sample.get("footprintId", "")).strip():
            failures.append(f"{sample_id}.footprintId missing")
        if not str(sample.get("formalObjectId", "")).strip():
            failures.append(f"{sample_id}.formalObjectId missing")
        sample_source = str(sample.get("sampleSource", "")).strip()
        if not sample_source:
            failures.append(f"{sample_id}.sampleSource missing")
        if any(term in sample_source.lower() for term in forbidden_source_terms):
            failures.append(f"{sample_id}.sampleSource forbidden:{sample_source}")
        if not str(sample.get("tileId", "")).strip():
            failures.append(f"{sample_id}.tileId missing")
        if int(sample.get("cellX", -1) or -1) < 0 or int(sample.get("cellY", -1) or -1) < 0:
            failures.append(f"{sample_id}.cell coordinate missing")
    return failures


def _validate_left_troop_rail_contract(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action not in {"world_left_troop_rail_component_contract", "world_left_troop_rail_jump_to_unit_fixture"}:
        return []
    click_result = godot_report.get("clickActionResult", {})
    if click_action == "world_left_troop_rail_jump_to_unit_fixture" and isinstance(click_result, dict):
        nested_summary = click_result.get("leftTroopRail", {})
        summary = dict(nested_summary) if isinstance(nested_summary, dict) else {}
        summary.update(click_result)
    else:
        summary = _find_report_summary_with_key(godot_report, "leftTroopRailVisibleCountMode")
    if not summary:
        return ["leftTroopRailSummary missing"]
    failures: list[str] = []
    if str(summary.get("leftTroopRailVisibleCountMode", "")).strip() != "fixed_5":
        failures.append("leftTroopRailVisibleCountMode!=fixed_5")
    if int(summary.get("leftTroopRailTargetVisibleSlotCount", 0) or 0) != 5:
        failures.append("leftTroopRailTargetVisibleSlotCount!=5")
    if not bool(summary.get("leftTroopRailNoPhantomEmptyFrameOk", False)):
        failures.append("leftTroopRailNoPhantomEmptyFrameOk!=true")
    if not bool(summary.get("leftTroopRailNoStandbyCopy", False)):
        failures.append("leftTroopRailNoStandbyCopy!=true")
    if not bool(summary.get("leftTroopRailFixed5AlignmentOk", False)):
        failures.append("leftTroopRailFixed5AlignmentOk!=true")
    if not bool(summary.get("leftTroopRailSlotGridAlignedOk", False)):
        failures.append("leftTroopRailSlotGridAlignedOk!=true")
    if not bool(summary.get("leftTroopRailAvatarColumnAlignedOk", False)):
        failures.append("leftTroopRailAvatarColumnAlignedOk!=true")
    if not bool(summary.get("leftTroopRailStatusColumnAlignedOk", False)):
        failures.append("leftTroopRailStatusColumnAlignedOk!=true")
    if not bool(summary.get("leftTroopRailStrengthColumnAlignedOk", False)):
        failures.append("leftTroopRailStrengthColumnAlignedOk!=true")
    if not bool(summary.get("leftTroopRailBarColumnAlignedOk", False)):
        failures.append("leftTroopRailBarColumnAlignedOk!=true")
    if not bool(summary.get("leftTroopRailJumpButtonColumnAlignedOk", False)):
        failures.append("leftTroopRailJumpButtonColumnAlignedOk!=true")
    if not bool(summary.get("leftTroopRailNoVisibleEmptySlotFrame", False)):
        failures.append("leftTroopRailNoVisibleEmptySlotFrame!=true")
    if str(summary.get("leftTroopRailJumpActionId", "")).strip() != "world_left_troop_rail_jump_to_unit_fixture":
        failures.append("leftTroopRailJumpActionId!=world_left_troop_rail_jump_to_unit_fixture")
    if click_action == "world_left_troop_rail_jump_to_unit_fixture":
        forbidden_hits = summary.get("leftTroopRailJumpVisibleCopyForbiddenHits", [])
        if forbidden_hits:
            failures.append("leftTroopRailJumpVisibleCopyForbiddenHits not empty")
        if not bool(summary.get("leftTroopRailJumpVisibleCopyClean", False)):
            failures.append("leftTroopRailJumpVisibleCopyClean!=true")
    slots = summary.get("leftTroopRailSlots", [])
    if not isinstance(slots, list):
        failures.append("leftTroopRailSlots missing")
        return failures
    jump_slots = [
        slot for slot in slots
        if isinstance(slot, dict)
        and bool(slot.get("visible", False))
        and bool(slot.get("jumpActionAvailable", False))
        and str(slot.get("troopId", "")).strip()
        and str(slot.get("tileId", "")).strip()
        and str(slot.get("name", "")).strip()
    ]
    if not jump_slots:
        failures.append("leftTroopRailJumpVisibleSlot missing")
    for slot in slots:
        if isinstance(slot, dict) and str(slot.get("statusLabel", "")).find("待命") >= 0:
            failures.append("leftTroopRailVisibleStatusLabel contains 待命")
            break
    return failures


def _validate_harbor_action_hud_contract(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action != "world_naval_harbor_deployment_readiness_fixture":
        return []
    summary = _find_report_summary_with_key(godot_report, "harborActionHudSkinFamily")
    if not summary:
        return ["harborActionHudSummary missing"]
    failures: list[str] = []
    if str(summary.get("harborActionHudSkinFamily", "")).strip() != "BaseActionHudSkin":
        failures.append("harborActionHudSkinFamily!=BaseActionHudSkin")
    if str(summary.get("harborActionHudVariant", "")).strip() != "harbor_fleet":
        failures.append("harborActionHudVariant!=harbor_fleet")
    if not bool(summary.get("harborActionHudUnifiedFamilyOk", False)):
        failures.append("harborActionHudUnifiedFamilyOk!=true")
    if not bool(summary.get("harborActionHudCompactCopyOk", False)):
        failures.append("harborActionHudCompactCopyOk!=true")
    if not bool(summary.get("harborActionHudHeavyFleetCardHidden", False)):
        failures.append("harborActionHudHeavyFleetCardHidden!=true")
    if not bool(summary.get("harborActionHudUnsupportedButtonsHidden", False)):
        failures.append("harborActionHudUnsupportedButtonsHidden!=true")
    if not bool(summary.get("harborActionHudNoEngineeringCopyLeak", False)):
        failures.append("harborActionHudNoEngineeringCopyLeak!=true")
    visible_actions = summary.get("harborActionHudVisibleActionLabels", [])
    if not isinstance(visible_actions, list) or visible_actions != ["出港", "巡逻", "拦截"]:
        failures.append("harborActionHudVisibleActionLabels!=出港/巡逻/拦截")
    hidden_labels = summary.get("harborActionHudHiddenHeavySectionLabels", [])
    if not isinstance(hidden_labels, list) or "港口库存" not in hidden_labels or "舰队" not in hidden_labels:
        failures.append("harborActionHudHiddenHeavySectionLabels missing")
    return failures


def _validate_nation_midgame_luoyang_route_action_hud_contract(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action != "world_open_main_city_organization_nation_midgame_luoyang_route":
        return []
    summary = _find_report_summary_with_key(godot_report, "nationMidgameLuoyangRouteActionHudSkinFamily")
    if not summary:
        return ["nationMidgameLuoyangRouteActionHudSummary missing"]
    failures: list[str] = []
    if str(summary.get("nationMidgameLuoyangRouteActionHudSkinFamily", "")).strip() != "BaseActionHudSkin":
        failures.append("nationMidgameLuoyangRouteActionHudSkinFamily!=BaseActionHudSkin")
    if str(summary.get("nationMidgameLuoyangRouteActionHudVariant", "")).strip() != "luoyang_route_target":
        failures.append("nationMidgameLuoyangRouteActionHudVariant!=luoyang_route_target")
    if not bool(summary.get("nationMidgameLuoyangRouteActionHudUnifiedFamilyOk", False)):
        failures.append("nationMidgameLuoyangRouteActionHudUnifiedFamilyOk!=true")
    if not bool(summary.get("nationMidgameLuoyangRouteLegacyActionPanelHidden", False)):
        failures.append("nationMidgameLuoyangRouteLegacyActionPanelHidden!=true")
    copy_labels = summary.get("nationMidgameLuoyangRouteVisibleCopyLabels", [])
    if not isinstance(copy_labels, list) or not {"国家中局", "洛阳目标", "东都要冲", "争夺目标"}.issubset({str(item) for item in copy_labels}):
        failures.append("nationMidgameLuoyangRouteVisibleCopyLabels missing expected Chinese labels")
    action_labels = summary.get("nationMidgameLuoyangRouteVisibleActionLabels", [])
    if not isinstance(action_labels, list) or action_labels != ["进军洛阳", "查看目标", "争夺目标"]:
        failures.append("nationMidgameLuoyangRouteVisibleActionLabels!=进军洛阳/查看目标/争夺目标")
    if summary.get("visibleCopyForbiddenHits") not in ([], None):
        failures.append("visibleCopyForbiddenHits not empty")
    if bool(summary.get("playerVisibleEngineeringCopyLeak", True)):
        failures.append("playerVisibleEngineeringCopyLeak!=false")
    return failures


def _validate_nation_midgame_objective_route_luoyang_contract(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action != "world_open_main_city_organization_nation_midgame_route_luoyang":
        return []
    summary = _find_report_summary_with_key(godot_report, "nationMidgameObjectiveRouteOk")
    if not summary:
        return ["nationMidgameObjectiveRouteSummary missing"]
    failures: list[str] = []
    if not bool(summary.get("nationMidgameObjectiveRouteOk", False)):
        failures.append("nationMidgameObjectiveRouteOk!=true")
    if str(summary.get("sourcePageId", "")).strip() != "nation/midgame":
        failures.append("sourcePageId!=nation/midgame")
    if str(summary.get("clickedButtonLabel", "")).strip() != "进军洛阳":
        failures.append("clickedButtonLabel!=进军洛阳")
    if str(summary.get("buttonNodeName", "")).strip() != "NationMidgameLuoyangRouteButton":
        failures.append("buttonNodeName!=NationMidgameLuoyangRouteButton")
    if str(summary.get("targetLabel", "")).strip() != "洛阳":
        failures.append("targetLabel!=洛阳")
    if str(summary.get("routeTarget", "")).strip() != "天下舆图":
        failures.append("routeTarget!=天下舆图")
    if not bool(summary.get("realButtonPressed", False)):
        failures.append("realButtonPressed!=true")
    if not bool(summary.get("targetFocusOk", False)):
        failures.append("targetFocusOk!=true")
    if summary.get("visibleCopyForbiddenHits") not in ([], None):
        failures.append("visibleCopyForbiddenHits not empty")
    if bool(summary.get("playerVisibleEngineeringCopyLeak", True)):
        failures.append("playerVisibleEngineeringCopyLeak!=false")
    if str(summary.get("nationMidgameObjectiveRouteHeadline", "")).strip() != "洛阳目标":
        failures.append("nationMidgameObjectiveRouteHeadline!=洛阳目标")
    if str(summary.get("nationMidgameObjectiveRouteStyleOwnerPanel", "")).strip() != "AlliancePanel":
        failures.append("nationMidgameObjectiveRouteStyleOwnerPanel!=AlliancePanel")
    if str(summary.get("nationMidgameObjectiveRouteStyleOwnerPresenter", "")).strip() != "AlliancePresenter":
        failures.append("nationMidgameObjectiveRouteStyleOwnerPresenter!=AlliancePresenter")
    return failures


def _validate_inbox_mail_live_screenshot_contract(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action != "world_open_main_city_mail_live_inbox_proof":
        return []
    summary = _find_report_summary_with_key(godot_report, "inboxMailLiveScreenshotProofOk")
    if not summary:
        return ["inboxMailLiveScreenshotProofSummary missing"]
    failures: list[str] = []
    for key in [
        "newScreenshotGenerated",
        "staticGovernanceGreen",
        "liveInboxReadbackOk",
        "mailPanelLiveInboxWired",
        "mailPanelLiveInboxRowButtonVisible",
        "mailPanelLiveInboxRowButtonClicked",
        "inboxMailLiveScreenshotProofOk",
    ]:
        if not bool(summary.get(key, False)):
            failures.append(f"{key}!=true")
    if summary.get("visibleCopyForbiddenHits") not in ([], None):
        failures.append("visibleCopyForbiddenHits not empty")
    if bool(summary.get("playerVisibleEngineeringCopyLeak", True)):
        failures.append("playerVisibleEngineeringCopyLeak!=false")
    if str(summary.get("liveInboxRoute", "")).strip() != "/api/inbox":
        failures.append("liveInboxRoute!=/api/inbox")
    claimed = summary.get("visualAcceptanceClaimedSurfaces", [])
    if not isinstance(claimed, list) or "inbox_mail" not in [str(item) for item in claimed]:
        failures.append("visualAcceptanceClaimedSurfaces missing inbox_mail")
    if int(summary.get("mailPanelLiveInboxItemCount", 0) or 0) <= 0:
        failures.append("mailPanelLiveInboxItemCount<=0")
    if int(summary.get("mailPanelLiveInboxVisibleItemCount", 0) or 0) <= 0:
        failures.append("mailPanelLiveInboxVisibleItemCount<=0")
    if str(summary.get("mailPanelLiveInboxRowButtonNodeName", "")).strip() == "":
        failures.append("mailPanelLiveInboxRowButtonNodeName missing")
    if not str(summary.get("mailPanelLiveInboxRowButtonActionId", "")).strip().startswith("mail_select:"):
        failures.append("mailPanelLiveInboxRowButtonActionId not mail_select")
    if str(summary.get("styleOwner", "")).strip() != "MailPresenter + MailPanel + SlgSnapshotSectionPage mail row Button":
        failures.append("styleOwner mismatch")
    return failures


def _validate_unified_inbox_claim_reward_settlement_contract(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action != "shell_chat_unified_inbox_claim_reward_settlement":
        return []
    click_result = godot_report.get("clickActionResult", {})
    summary = click_result if isinstance(click_result, dict) else {}
    if not summary:
        return ["unifiedInboxClaimRewardSummary missing"]
    failures: list[str] = []
    for key in [
        "inboxClaimButtonPressed",
        "inboxClaimReceiptOk",
        "inboxClaimPostReadbackOk",
        "inboxClaimTargetRemoved",
    ]:
        if not bool(summary.get(key, False)):
            failures.append(f"{key}!=true")
    if str(summary.get("reason", "")).strip() != "unified_inbox_claim_reward_settlement_verified":
        failures.append("reason!=unified_inbox_claim_reward_settlement_verified")
    if str(summary.get("inboxClaimRoute", "")).strip() != "/api/inbox/claim":
        failures.append("inboxClaimRoute!=/api/inbox/claim")
    if str(summary.get("inboxClaimWorldAction", "")).strip() != "claimReward":
        failures.append("inboxClaimWorldAction!=claimReward")
    if str(summary.get("inboxClaimKind", "")).strip() != "event_reward":
        failures.append("inboxClaimKind!=event_reward")
    if str(summary.get("inboxClaimButtonToken", "")).strip() != "unified_inbox_claim_button_v1":
        failures.append("inboxClaimButtonToken!=unified_inbox_claim_button_v1")
    if summary.get("visibleCopyForbiddenHits") not in ([], None):
        failures.append("visibleCopyForbiddenHits not empty")
    if bool(summary.get("playerVisibleEngineeringCopyLeak", True)):
        failures.append("playerVisibleEngineeringCopyLeak!=false")
    if int(summary.get("inboxClaimBeforeCount", 0) or 0) <= int(summary.get("inboxClaimAfterCount", 0) or 0):
        failures.append("inboxClaimBeforeCount<=inboxClaimAfterCount")
    if str(summary.get("styleOwner", "")).strip() != "MainChatOverlay unified inbox Button + BackendApiClient /api/inbox/claim":
        failures.append("styleOwner mismatch")
    return failures


def _validate_world_tile_expedition_minimal_settlement_gameplay_anchor(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action != "world_tile_expedition_minimal_settlement_fixture":
        return []
    click_result = godot_report.get("clickActionResult", {})
    summary = click_result if isinstance(click_result, dict) else {}
    page_summary = summary.get("pageContentSummary", {}) if isinstance(summary.get("pageContentSummary", {}), dict) else {}
    if not summary or not page_summary:
        return ["worldTileExpeditionMinimalSettlementSummary missing"]
    failures: list[str] = []
    if str(summary.get("reason", "")).strip() != "world_tile_expedition_minimal_settlement_done":
        failures.append("reason!=world_tile_expedition_minimal_settlement_done")
    if not bool(summary.get("clicked", False)):
        failures.append("clicked!=true")
    for key in [
        "worldTileActionHudOpenOk",
        "worldTileExpeditionMinimalSettlementOk",
        "expeditionButtonVisible",
        "expeditionButtonClicked",
        "battleRecordReadbackOk",
        "resourceHudProtectedFootprintVetoOk",
        "tileActionHudFixtureAvoidsLuoyangCoordinate",
        "tileHudVisualPolishOk",
        "tileHudNoNestedCards",
        "tileHudTextDensityOk",
    ]:
        if not bool(page_summary.get(key, False)):
            failures.append(f"{key}!=true")
    for key in ["settlementReceiptId", "battleReportId", "tileId", "resourceYieldLabel", "defenderStrengthLabel"]:
        if str(page_summary.get(key, "")).strip() == "":
            failures.append(f"{key} missing")
    if page_summary.get("visibleCopyForbiddenHits") not in ([], None):
        failures.append("visibleCopyForbiddenHits not empty")
    if page_summary.get("engineeringCopyForbiddenHits") not in ([], None):
        failures.append("engineeringCopyForbiddenHits not empty")
    if bool(page_summary.get("playerVisibleEngineeringCopyLeak", True)):
        failures.append("playerVisibleEngineeringCopyLeak!=false")
    if bool(page_summary.get("rawTileIdVisible", True)):
        failures.append("rawTileIdVisible!=false")
    if str(page_summary.get("worldTileActionHudScope", "")).strip() != "tile_action_hud_expedition_minimal_only_not_full_map_redesign":
        failures.append("worldTileActionHudScope mismatch")
    if str(page_summary.get("tileActionHudResourceContextPolicy", "")).strip() != "resource_only_after_protected_object_veto_v1":
        failures.append("tileActionHudResourceContextPolicy mismatch")
    if str(page_summary.get("tileHudSharedStyleOwner", "")).strip() != "SlgUiComponentFactory + MainMapCellActionPanel":
        failures.append("tileHudSharedStyleOwner mismatch")
    if str(page_summary.get("expeditionButtonActionId", "")).strip() != "world_tile_expedition_minimal_settlement":
        failures.append("expeditionButtonActionId mismatch")
    return failures


def _validate_world_naval_harbor_inventory_open_gameplay_anchor(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action != "world_naval_harbor_inventory_open_fixture":
        return []
    click_result = godot_report.get("clickActionResult", {})
    summary = click_result if isinstance(click_result, dict) else {}
    if not summary:
        return ["worldNavalHarborInventoryOpenSummary missing"]
    failures: list[str] = []
    if not bool(summary.get("ok", False)):
        failures.append("ok!=true")
    if str(summary.get("reason", "")).strip() != "ok":
        failures.append("reason!=ok")
    for key in [
        "worldNavalHarborInventoryOpenOk",
        "fleetCardVisible",
        "harborSurfaceVisible",
        "harborCopyAllowedOnlyOnHarborSurface",
        "harborHudVisualSkinOk",
        "harborHudPanelSkinVisible",
        "harborHudFleetCardSkinVisible",
        "harborHudShipIconVisible",
        "harborHudRepairStateIconVisible",
        "harborHudRiskStateVisualVisible",
        "harborHudActionButtonSkinStateOk",
        "harborHudNoBakedTextInAssets",
        "harborHudNoEngineeringCopyLeak",
        "harborActionHudUnifiedFamilyOk",
        "harborActionHudCompactCopyOk",
        "harborActionHudHeavyFleetCardHidden",
        "harborActionHudUnsupportedButtonsHidden",
        "harborActionHudNoEngineeringCopyLeak",
    ]:
        if not bool(summary.get(key, False)):
            failures.append(f"{key}!=true")
    for key in [
        "sourceShipyardOrderId",
        "inventoryFleetId",
        "harborName",
        "fleetStatusLabel",
        "durabilityLabel",
        "summaryText",
    ]:
        if str(summary.get(key, "")).strip() == "":
            failures.append(f"{key} missing")
    if str(summary.get("harborId", "")).strip() != "east_han_coastal_dock_quanzhou":
        failures.append("harborId mismatch")
    if str(summary.get("worldNavalHarborInventoryScope", "")).strip() != "harbor_inventory_open_only_not_full_fleet_management":
        failures.append("worldNavalHarborInventoryScope mismatch")
    if str(summary.get("harborHudVisualSkinScope", "")).strip() != "harbor_hud_component_skin_only_not_full_port_management":
        failures.append("harborHudVisualSkinScope mismatch")
    if str(summary.get("harborActionHudSkinFamily", "")).strip() != "BaseActionHudSkin":
        failures.append("harborActionHudSkinFamily mismatch")
    if str(summary.get("harborActionHudVariant", "")).strip() != "harbor_fleet":
        failures.append("harborActionHudVariant mismatch")
    if summary.get("visibleCopyForbiddenHits") not in ([], None):
        failures.append("visibleCopyForbiddenHits not empty")
    if bool(summary.get("landSurfaceNavalCopyLeak", True)):
        failures.append("landSurfaceNavalCopyLeak!=false")
    if bool(summary.get("playerVisibleEngineeringCopyLeak", True)):
        failures.append("playerVisibleEngineeringCopyLeak!=false")
    visible_actions = summary.get("harborActionHudVisibleActionLabels", [])
    if not isinstance(visible_actions, list) or visible_actions != ["出港", "巡逻", "拦截"]:
        failures.append("harborActionHudVisibleActionLabels mismatch")
    return failures


def _validate_world_naval_harbor_deployment_readiness_gameplay_anchor(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action != "world_naval_harbor_deployment_readiness_fixture":
        return []
    click_result = godot_report.get("clickActionResult", {})
    summary = click_result if isinstance(click_result, dict) else {}
    if not summary:
        return ["worldNavalHarborDeploymentReadinessSummary missing"]
    failures: list[str] = []
    if not bool(summary.get("ok", False)):
        failures.append("ok!=true")
    if str(summary.get("reason", "")).strip() != "ok":
        failures.append("reason!=ok")
    for key in [
        "worldNavalHarborDeploymentReadinessOk",
        "harborSurfaceVisible",
        "fleetCardVisible",
        "deploymentReadinessUsesSharedDomainPolicy",
        "harborHudActionButtonStateOk",
        "harborHudVisualSkinOk",
        "harborHudPanelSkinVisible",
        "harborHudFleetCardSkinVisible",
        "harborHudShipIconVisible",
        "harborHudRepairStateIconVisible",
        "harborHudRiskStateVisualVisible",
        "harborHudActionButtonSkinStateOk",
        "harborHudNoBakedTextInAssets",
        "harborHudNoEngineeringCopyLeak",
        "harborActionHudUnifiedFamilyOk",
        "harborActionHudCompactCopyOk",
        "harborActionHudHeavyFleetCardHidden",
        "harborActionHudUnsupportedButtonsHidden",
        "harborActionHudNoEngineeringCopyLeak",
        "feedbackVisible",
    ]:
        if not bool(summary.get(key, False)):
            failures.append(f"{key}!=true")
    for key in [
        "fleetId",
        "inventoryFleetId",
        "harborName",
        "recommendedActionLabel",
        "durabilityLabel",
        "riskLabel",
        "summaryText",
    ]:
        if str(summary.get(key, "")).strip() == "":
            failures.append(f"{key} missing")
    if str(summary.get("harborId", "")).strip() != "east_han_coastal_dock_quanzhou":
        failures.append("harborId mismatch")
    if str(summary.get("deploymentPolicyScope", "")).strip() != "naval_deployment_readiness_only_not_full_fleet_management":
        failures.append("deploymentPolicyScope mismatch")
    if str(summary.get("worldNavalHarborDeploymentReadinessScope", "")).strip() != "deployment_readiness_hud_only_not_full_fleet_management":
        failures.append("worldNavalHarborDeploymentReadinessScope mismatch")
    if str(summary.get("harborHudVisualSkinScope", "")).strip() != "harbor_hud_component_skin_only_not_full_port_management":
        failures.append("harborHudVisualSkinScope mismatch")
    if str(summary.get("harborActionHudSkinFamily", "")).strip() != "BaseActionHudSkin":
        failures.append("harborActionHudSkinFamily mismatch")
    if str(summary.get("harborActionHudVariant", "")).strip() != "harbor_fleet":
        failures.append("harborActionHudVariant mismatch")
    if str(summary.get("recommendedActionLabel", "")).strip() not in ["出港", "巡逻", "拦截", "整补", "待命"]:
        failures.append("recommendedActionLabel mismatch")
    for key in ["missionAllowed", "shouldRepair", "shouldPatrol", "shouldIntercept", "shouldHold"]:
        if not isinstance(summary.get(key), bool):
            failures.append(f"{key} not boolean")
    for key in ["readinessScore", "riskScore"]:
        if not isinstance(summary.get(key), (int, float)):
            failures.append(f"{key} not number")
    if not bool(summary.get("shouldRepair", False) or summary.get("shouldPatrol", False) or summary.get("shouldIntercept", False) or summary.get("shouldHold", False)):
        failures.append("deployment readiness has no recommended state")
    if summary.get("visibleCopyForbiddenHits") not in ([], None):
        failures.append("visibleCopyForbiddenHits not empty")
    if bool(summary.get("landSurfaceNavalCopyLeak", True)):
        failures.append("landSurfaceNavalCopyLeak!=false")
    if bool(summary.get("playerVisibleEngineeringCopyLeak", True)):
        failures.append("playerVisibleEngineeringCopyLeak!=false")
    visible_actions = summary.get("harborActionHudVisibleActionLabels", [])
    if not isinstance(visible_actions, list) or visible_actions != ["出港", "巡逻", "拦截"]:
        failures.append("harborActionHudVisibleActionLabels mismatch")
    return failures


def _validate_world_naval_inventory_fleet_patrol_reuse_gameplay_anchor(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action != "world_naval_inventory_fleet_patrol_reuse_fixture":
        return []
    click_result = godot_report.get("clickActionResult", {})
    summary = click_result if isinstance(click_result, dict) else {}
    if not summary:
        return ["worldNavalInventoryFleetPatrolReuseSummary missing"]
    failures: list[str] = []
    if not bool(summary.get("ok", False)):
        failures.append("ok!=true")
    if str(summary.get("reason", "")).strip() != "ok":
        failures.append("reason!=ok")
    for key in [
        "worldNavalInventoryFleetPatrolReuseOk",
        "worldNavalReuseUsesExistingSeaRuntime",
        "worldNavalReuseDoesNotUseUnitMarker",
        "feedbackVisible",
        "fleetReadbackOk",
    ]:
        if not bool(summary.get(key, False)):
            failures.append(f"{key}!=true")
    for key in [
        "sourceShipyardOrderId",
        "inventoryFleetId",
        "reusedFleetId",
        "harborId",
        "seaRouteId",
        "patrolId",
        "interceptReportId",
        "summaryText",
    ]:
        if str(summary.get(key, "")).strip() == "":
            failures.append(f"{key} missing")
    if str(summary.get("reusedFleetId", "")).strip() != str(summary.get("inventoryFleetId", "")).strip():
        failures.append("reusedFleetId!=inventoryFleetId")
    if str(summary.get("harborId", "")).strip() != "east_han_coastal_dock_quanzhou":
        failures.append("harborId mismatch")
    if str(summary.get("seaRouteId", "")).strip() != "east_han_coastal_dock_to_wa_contact":
        failures.append("seaRouteId mismatch")
    if str(summary.get("reuseStatus", "")).strip() != "route_patrol_intercept_reused":
        failures.append("reuseStatus mismatch")
    if str(summary.get("worldNavalReuseScope", "")).strip() != "shipyard_inventory_reuse_only_not_full_fleet_inventory_ui":
        failures.append("worldNavalReuseScope mismatch")
    if summary.get("visibleCopyForbiddenHits") not in ([], None):
        failures.append("visibleCopyForbiddenHits not empty")
    if bool(summary.get("playerVisibleEngineeringCopyLeak", True)):
        failures.append("playerVisibleEngineeringCopyLeak!=false")
    return failures


def _validate_battle_report_detail_player_copy_governance(click_action: str, godot_report: dict[str, Any]) -> list[str]:
    if click_action != "battle_report_seeded_open_detail":
        return []
    summary = _find_report_summary_with_key(godot_report, "battleReportDetailPlayerCopyOk")
    if not summary:
        return ["battleReportDetailPlayerCopySummary missing"]
    failures: list[str] = []
    if not bool(summary.get("battleReportDetailPlayerCopyOk", False)):
        failures.append("battleReportDetailPlayerCopyOk!=true")
    if summary.get("visibleCopyForbiddenHits") not in ([], None):
        failures.append("visibleCopyForbiddenHits not empty")
    if bool(summary.get("playerVisibleEngineeringCopyLeak", True)):
        failures.append("playerVisibleEngineeringCopyLeak!=false")
    source_label = str(summary.get("sourceLabelVisible", "")).strip()
    if not source_label:
        failures.append("sourceLabelVisible missing")
    forbidden_source_terms = (
        "battle_report",
        "battleRecords",
        "feedback.battleRecords",
        "read model",
        "backend",
        "contract id",
        "authority",
        "tier",
        "snake_case",
        "/api/",
    )
    if any(term.lower() in source_label.lower() for term in forbidden_source_terms):
        failures.append(f"sourceLabelVisible forbidden:{source_label}")
    style_owner = str(summary.get("styleOwner", "")).strip()
    if "BattleReportDetailPage" not in style_owner or "SlgUiComponentFactory" not in style_owner:
        failures.append("styleOwner missing BattleReportDetailPage/SlgUiComponentFactory")
    return failures


def _validate_player_history_seeded_replay_recovery_identity_visual_smoke(
    click_action: str,
    godot_report: dict[str, Any],
    screenshot_visibility_gate: dict[str, Any],
) -> list[str]:
    if click_action != "player_history_seeded_replay_panel_open":
        return []
    failures: list[str] = []
    click_result = godot_report.get("clickActionResult", {})
    if not isinstance(click_result, dict):
        return ["playerHistorySeededReplayClickActionResultMissing"]
    page_summary = click_result.get("pageContentSummary", {})
    if not isinstance(page_summary, dict):
        failures.append("playerHistorySeededReplayPageSummaryMissing")
        page_summary = {}
    if click_result.get("seededReplayRecoveryVisualSmokeContract") != "player_history_seeded_replay_recovery_identity_visual_smoke_v1":
        failures.append("playerHistorySeededReplayVisualSmokeContractMissing")
    if not bool(click_result.get("seededReplayRecoveryIdentityResolved", False)):
        failures.append("playerHistorySeededReplayIdentityNotResolved")
    if not bool(click_result.get("seededReplayRecoveryFrameLoaded", False)):
        failures.append("playerHistorySeededReplayFrameNotLoaded")
    if int(click_result.get("seededReplayRecoveryFrameCount", 0) or 0) <= 0:
        failures.append("playerHistorySeededReplayFrameCountMissing")
    if str(click_result.get("seededReplayRecoverySurfaceOpenReason", "")).strip() != "dedicated_replay_identity_opened":
        failures.append("playerHistorySeededReplaySurfaceOpenReasonMismatch")
    if not bool(page_summary.get("dedicatedReplayScreenOpen", False)):
        failures.append("playerHistorySeededReplayDedicatedModeMissing")
    if bool(page_summary.get("replayUnavailableCopyVisible", False)):
        failures.append("playerHistorySeededReplayUnexpectedUnavailableCopy")
    if not bool(screenshot_visibility_gate.get("ok", False)):
        failures.append("playerHistorySeededReplayScreenshotVisibilityFailed")
    if not str(click_result.get("seededReplayRecoveryScreenshotPath", "")).strip():
        failures.append("playerHistorySeededReplayScreenshotPathMissing")
    return failures


def _validate_player_history_ai_proposal_denied_recovery_visual_smoke(
    click_action: str,
    godot_report: dict[str, Any],
    screenshot_visibility_gate: dict[str, Any],
) -> list[str]:
    if click_action != "player_history_ai_proposal_denied_panel_open":
        return []
    failures: list[str] = []
    click_result = godot_report.get("clickActionResult", {})
    if not isinstance(click_result, dict):
        return ["playerHistoryAiProposalDeniedClickActionResultMissing"]
    summary = click_result.get("playerHistorySummary", {})
    if not isinstance(summary, dict):
        failures.append("playerHistoryAiProposalDeniedPlayerHistorySummaryMissing")
        summary = {}
    if click_result.get("aiProposalDeniedRecoveryVisualSmokeContract") != "player_history_ai_proposal_denied_recovery_visual_smoke_v1":
        failures.append("playerHistoryAiProposalDeniedVisualSmokeContractMissing")
    if click_result.get("timelineRecoveryHostNavigationKind") != "ai_proposal_denied":
        failures.append("playerHistoryAiProposalDeniedHostNavigationKindMismatch")
    if click_result.get("timelineRecoveryHostNavigationSurface") != "ai_hub":
        failures.append("playerHistoryAiProposalDeniedHostNavigationSurfaceMismatch")
    if click_result.get("timelineRecoverySurfaceOpenReason") != "ai_activity_opened_via_ai_hub":
        failures.append("playerHistoryAiProposalDeniedSurfaceOpenReasonMismatch")
    if click_result.get("timelineRecoveryHostNavigationFeedback") != "已记录 AI 提案驳回":
        failures.append("playerHistoryAiProposalDeniedHostFeedbackMismatch")
    if click_result.get("activePanelId") != "ai_hub":
        failures.append("playerHistoryAiProposalDeniedActivePanelMismatch")
    if click_result.get("expectedPanelId") != "ai_hub":
        failures.append("playerHistoryAiProposalDeniedExpectedPanelMismatch")
    if click_result.get("timelineRecoveryHostNavigationDelta", 0) is not None and int(click_result.get("timelineRecoveryHostNavigationDelta", 0) or 0) <= 0:
        failures.append("playerHistoryAiProposalDeniedHostNavigationDeltaMissing")
    if not bool(summary.get("ok", False)):
        failures.append("playerHistoryAiProposalDeniedPlayerHistorySummaryNotOk")
    if str(summary.get("timelineRecoveryHostNavigationKind", "")).strip() != "ai_proposal_denied":
        failures.append("playerHistoryAiProposalDeniedSummaryHostNavigationKindMismatch")
    if str(summary.get("timelineRecoveryHostNavigationSurface", "")).strip() != "ai_hub":
        failures.append("playerHistoryAiProposalDeniedSummaryHostNavigationSurfaceMismatch")
    if int(summary.get("timelineCardCount", 0)) <= 0:
        failures.append("playerHistoryAiProposalDeniedTimelineCardCountMissing")
    if not bool(screenshot_visibility_gate.get("ok", False)):
        failures.append("playerHistoryAiProposalDeniedScreenshotVisibilityFailed")
    if not str(click_result.get("aiProposalDeniedRecoveryScreenshotPath", "")).strip():
        failures.append("playerHistoryAiProposalDeniedScreenshotPathMissing")
    return failures


def _validate_player_history_ai_proposal_denied_focused_receipt_visual_smoke(
    click_action: str,
    godot_report: dict[str, Any],
    screenshot_visibility_gate: dict[str, Any],
) -> list[str]:
    if click_action != "player_history_ai_proposal_denied_visible_receipt":
        return []
    failures: list[str] = []
    click_result = godot_report.get("clickActionResult", {})
    if not isinstance(click_result, dict):
        return ["playerHistoryAiProposalDeniedFocusedReceiptClickActionResultMissing"]
    summary = click_result.get("playerHistorySummary", {})
    if not isinstance(summary, dict):
        failures.append("playerHistoryAiProposalDeniedFocusedReceiptSummaryMissing")
        summary = {}
    if click_result.get("aiProposalDeniedFocusedReceiptVisualSmokeContract") != "player_history_ai_proposal_denied_focused_receipt_visual_smoke_v1":
        failures.append("playerHistoryAiProposalDeniedFocusedReceiptContractMissing")
    if click_result.get("activePanelId") != "player_history":
        failures.append("playerHistoryAiProposalDeniedFocusedReceiptActivePanelMismatch")
    if click_result.get("expectedPanelId") != "player_history":
        failures.append("playerHistoryAiProposalDeniedFocusedReceiptExpectedPanelMismatch")
    if not bool(summary.get("timelineRecoveryFocusedReceiptVisible", False)):
        failures.append("playerHistoryAiProposalDeniedFocusedReceiptNotVisible")
    if str(summary.get("timelineRecoveryFocusedReceiptKind", "")).strip() != "ai_proposal_denied":
        failures.append("playerHistoryAiProposalDeniedFocusedReceiptKindMismatch")
    if str(summary.get("timelineRecoveryFocusedReceiptFeedback", "")).strip() != "已记录 AI 提案驳回":
        failures.append("playerHistoryAiProposalDeniedFocusedReceiptFeedbackMismatch")
    if str(summary.get("timelineRecoveryFocusedReceiptToken", "")).strip() != "player_history_ai_proposal_denied_focused_receipt_v1":
        failures.append("playerHistoryAiProposalDeniedFocusedReceiptTokenMismatch")
    if not bool(screenshot_visibility_gate.get("ok", False)):
        failures.append("playerHistoryAiProposalDeniedFocusedReceiptScreenshotVisibilityFailed")
    if not str(click_result.get("aiProposalDeniedFocusedReceiptScreenshotPath", "")).strip():
        failures.append("playerHistoryAiProposalDeniedFocusedReceiptScreenshotPathMissing")
    return failures


def _validate_player_history_ai_execution_receipt_recovery_visual_smoke(
    click_action: str,
    godot_report: dict[str, Any],
    screenshot_visibility_gate: dict[str, Any],
) -> list[str]:
    if click_action != "player_history_ai_execution_receipt_panel_open":
        return []
    failures: list[str] = []
    click_result = godot_report.get("clickActionResult", {})
    if not isinstance(click_result, dict):
        return ["playerHistoryAiExecutionReceiptClickActionResultMissing"]
    summary = click_result.get("playerHistorySummary", {})
    if not isinstance(summary, dict):
        failures.append("playerHistoryAiExecutionReceiptPlayerHistorySummaryMissing")
        summary = {}
    if click_result.get("aiExecutionReceiptRecoveryVisualSmokeContract") != "player_history_ai_execution_receipt_recovery_visual_smoke_v1":
        failures.append("playerHistoryAiExecutionReceiptVisualSmokeContractMissing")
    if click_result.get("timelineRecoveryHostNavigationKind") != "ai_execution_receipt":
        failures.append("playerHistoryAiExecutionReceiptHostNavigationKindMismatch")
    if click_result.get("timelineRecoveryHostNavigationSurface") != "ai_hub":
        failures.append("playerHistoryAiExecutionReceiptHostNavigationSurfaceMismatch")
    if click_result.get("timelineRecoverySurfaceOpenReason") != "ai_activity_opened_via_ai_hub":
        failures.append("playerHistoryAiExecutionReceiptSurfaceOpenReasonMismatch")
    if click_result.get("timelineRecoveryHostNavigationFeedback") != "已准备查看 AI 执行回执":
        failures.append("playerHistoryAiExecutionReceiptHostFeedbackMismatch")
    if click_result.get("activePanelId") != "ai_hub":
        failures.append("playerHistoryAiExecutionReceiptActivePanelMismatch")
    if click_result.get("expectedPanelId") != "ai_hub":
        failures.append("playerHistoryAiExecutionReceiptExpectedPanelMismatch")
    if click_result.get("timelineRecoveryHostNavigationDelta", 0) is not None and int(click_result.get("timelineRecoveryHostNavigationDelta", 0) or 0) <= 0:
        failures.append("playerHistoryAiExecutionReceiptHostNavigationDeltaMissing")
    if not bool(summary.get("ok", False)):
        failures.append("playerHistoryAiExecutionReceiptPlayerHistorySummaryNotOk")
    if int(summary.get("timelineCardCount", 0)) <= 0:
        failures.append("playerHistoryAiExecutionReceiptTimelineCardCountMissing")
    if not bool(screenshot_visibility_gate.get("ok", False)):
        failures.append("playerHistoryAiExecutionReceiptScreenshotVisibilityFailed")
    if not str(click_result.get("aiExecutionReceiptRecoveryScreenshotPath", "")).strip():
        failures.append("playerHistoryAiExecutionReceiptScreenshotPathMissing")
    return failures


def _validate_player_history_ai_tile_abandon_receipt_visual_smoke(
    click_action: str,
    godot_report: dict[str, Any],
    screenshot_visibility_gate: dict[str, Any],
) -> list[str]:
    if click_action != "player_history_ai_tile_abandon_receipt_visible":
        return []
    failures: list[str] = []
    click_result = godot_report.get("clickActionResult", {})
    if not isinstance(click_result, dict):
        return ["playerHistoryAiTileAbandonReceiptClickActionResultMissing"]
    summary = click_result.get("playerHistorySummary", {})
    if not isinstance(summary, dict):
        failures.append("playerHistoryAiTileAbandonReceiptSummaryMissing")
        summary = {}
    if click_result.get("aiTileAbandonReceiptVisualSmokeContract") != "player_history_ai_tile_abandon_receipt_visual_smoke_v1":
        failures.append("playerHistoryAiTileAbandonReceiptContractMissing")
    if click_result.get("activePanelId") != "player_history":
        failures.append("playerHistoryAiTileAbandonReceiptActivePanelMismatch")
    if click_result.get("expectedPanelId") != "player_history":
        failures.append("playerHistoryAiTileAbandonReceiptExpectedPanelMismatch")
    if not bool(summary.get("timelineRecoveryFocusedReceiptVisible", False)):
        failures.append("playerHistoryAiTileAbandonReceiptNotVisible")
    if str(summary.get("timelineRecoveryFocusedReceiptKind", "")).strip() != "ai_execution_receipt":
        failures.append("playerHistoryAiTileAbandonReceiptKindMismatch")
    if str(summary.get("timelineRecoveryFocusedReceiptFeedback", "")).strip() != "已记录地块放弃结果":
        failures.append("playerHistoryAiTileAbandonReceiptFeedbackMismatch")
    if str(summary.get("timelineRecoveryFocusedReceiptToken", "")).strip() != "player_history_ai_execution_receipt_focused_v1":
        failures.append("playerHistoryAiTileAbandonReceiptTokenMismatch")
    if not bool(screenshot_visibility_gate.get("ok", False)):
        failures.append("playerHistoryAiTileAbandonReceiptScreenshotVisibilityFailed")
    if not str(click_result.get("playerHistoryAiTileAbandonReceiptScreenshotPath", "")).strip():
        failures.append("playerHistoryAiTileAbandonReceiptScreenshotPathMissing")
    return failures


def _validate_player_history_ai_proposal_apply_recovery_visual_smoke(
    click_action: str,
    godot_report: dict[str, Any],
    screenshot_visibility_gate: dict[str, Any],
) -> list[str]:
    if click_action != "player_history_ai_proposal_apply_panel_open":
        return []
    failures: list[str] = []
    click_result = godot_report.get("clickActionResult", {})
    if not isinstance(click_result, dict):
        return ["playerHistoryAiProposalApplyClickActionResultMissing"]
    summary = click_result.get("playerHistorySummary", {})
    if not isinstance(summary, dict):
        failures.append("playerHistoryAiProposalApplyPlayerHistorySummaryMissing")
        summary = {}
    if click_result.get("aiProposalApplyRecoveryVisualSmokeContract") != "player_history_ai_proposal_apply_recovery_visual_smoke_v1":
        failures.append("playerHistoryAiProposalApplyVisualSmokeContractMissing")
    if click_result.get("timelineRecoveryHostNavigationKind") != "ai_proposal_apply":
        failures.append("playerHistoryAiProposalApplyHostNavigationKindMismatch")
    if click_result.get("timelineRecoveryHostNavigationSurface") != "ai_hub":
        failures.append("playerHistoryAiProposalApplyHostNavigationSurfaceMismatch")
    if click_result.get("timelineRecoverySurfaceOpenReason") != "ai_activity_opened_via_ai_hub":
        failures.append("playerHistoryAiProposalApplySurfaceOpenReasonMismatch")
    if click_result.get("timelineRecoveryHostNavigationFeedback") != "已准备处理 AI 提案":
        failures.append("playerHistoryAiProposalApplyHostFeedbackMismatch")
    if click_result.get("activePanelId") != "ai_hub":
        failures.append("playerHistoryAiProposalApplyActivePanelMismatch")
    if click_result.get("expectedPanelId") != "ai_hub":
        failures.append("playerHistoryAiProposalApplyExpectedPanelMismatch")
    decision_summary = click_result.get("aiProposalDecisionSurfaceSummary", {})
    if not isinstance(decision_summary, dict):
        failures.append("playerHistoryAiProposalDecisionSurfaceSummaryMissing")
        decision_summary = {}
    ai_hub_proposal_decision_surface_accepted = bool(decision_summary.get("aiPanelProposalDecisionSurfacePlayerUiAccepted", False))
    if not ai_hub_proposal_decision_surface_accepted:
        failures.append("playerHistoryAiProposalDecisionSurfaceNotAccepted")
    if decision_summary.get("aiPanelProposalDecisionSurfaceContract") != "ai_proposal_decision_surface_v1":
        failures.append("playerHistoryAiProposalDecisionSurfaceContractMissing")
    if not bool(decision_summary.get("aiPanelProposalDecisionApproveActionVisible", False)):
        failures.append("playerHistoryAiProposalDecisionApproveMissing")
    if not bool(decision_summary.get("aiPanelProposalDecisionRejectActionVisible", False)):
        failures.append("playerHistoryAiProposalDecisionRejectMissing")
    if not bool(decision_summary.get("aiPanelProposalDecisionForbiddenCopyClear", False)):
        failures.append("playerHistoryAiProposalDecisionForbiddenCopyLeak")
    click_result["aiHubProposalDecisionSurfaceAccepted"] = ai_hub_proposal_decision_surface_accepted
    if click_result.get("timelineRecoveryHostNavigationDelta", 0) is not None and int(click_result.get("timelineRecoveryHostNavigationDelta", 0) or 0) <= 0:
        failures.append("playerHistoryAiProposalApplyHostNavigationDeltaMissing")
    if not bool(summary.get("ok", False)):
        failures.append("playerHistoryAiProposalApplyPlayerHistorySummaryNotOk")
    if int(summary.get("timelineCardCount", 0)) <= 0:
        failures.append("playerHistoryAiProposalApplyTimelineCardCountMissing")
    if not bool(screenshot_visibility_gate.get("ok", False)):
        failures.append("playerHistoryAiProposalApplyScreenshotVisibilityFailed")
    if not str(click_result.get("aiProposalApplyRecoveryScreenshotPath", "")).strip():
        failures.append("playerHistoryAiProposalApplyScreenshotPathMissing")
    return failures


def _validate_ai_hub_proposal_mutation_result_visual_smoke(
    click_action: str,
    godot_report: dict[str, Any],
    screenshot_visibility_gate: dict[str, Any],
) -> list[str]:
    expected_kind_by_action = {
        "ai_hub_proposal_approve_result_smoke": "approve",
        "ai_hub_proposal_reject_result_smoke": "reject",
    }
    expected_kind = expected_kind_by_action.get(click_action)
    if expected_kind is None:
        return []
    failures: list[str] = []
    click_result = godot_report.get("clickActionResult", {})
    if not isinstance(click_result, dict):
        return ["aiHubProposalMutationResultClickActionResultMissing"]
    if click_result.get("aiProposalMutationResultVisualSmokeContract") != "ai_proposal_mutation_result_visual_smoke_v1":
        failures.append("aiHubProposalMutationResultContractMissing")
    if not bool(click_result.get("aiProposalMutationResultAccepted", False)):
        failures.append("aiProposalMutationResultAcceptedMissing")
    if click_result.get("aiProposalMutationResultKind") != expected_kind:
        failures.append("aiProposalMutationResultKindMismatch")
    expected_status = "approved" if expected_kind == "approve" else "rejected"
    if click_result.get("aiProposalMutationResultStatus") != expected_status:
        failures.append("aiProposalMutationResultStatusMismatch")
    if not bool(click_result.get("aiProposalMutationResultRemoteOk", False)):
        failures.append("aiProposalMutationResultRemoteOkMissing")
    result_summary = click_result.get("aiProposalMutationResultSummary", {})
    if not isinstance(result_summary, dict):
        failures.append("aiProposalMutationResultSummaryMissing")
        result_summary = {}
    if not bool(result_summary.get("aiPanelProposalMutationResultAccepted", False)):
        failures.append("aiPanelProposalMutationResultSummaryNotAccepted")
    if not bool(result_summary.get("aiPanelProposalMutationResultShellAccepted", False)):
        failures.append("aiPanelProposalMutationResultShellNotAccepted")
    if not bool(result_summary.get("aiPanelProposalMutationResultForbiddenCopyClear", False)):
        failures.append("aiPanelProposalMutationResultForbiddenCopyLeak")
    if not bool(screenshot_visibility_gate.get("ok", False)):
        failures.append("aiProposalMutationResultScreenshotVisibilityFailed")
    if not str(click_result.get("aiProposalMutationResultScreenshotPath", "")).strip():
        failures.append("aiProposalMutationResultScreenshotPathMissing")
    return failures


def _validate_chat_natural_language_proposal_decision_visual_smoke(
    click_action: str,
    godot_report: dict[str, Any],
    screenshot_visibility_gate: dict[str, Any],
) -> list[str]:
    expected_kind_by_action = {
        "shell_chat_natural_language_proposal_approve": "approve",
        "shell_chat_natural_language_proposal_reject": "reject",
    }
    expected_kind = expected_kind_by_action.get(click_action)
    if expected_kind is None:
        return []
    failures: list[str] = []
    click_result = godot_report.get("clickActionResult", {})
    if not isinstance(click_result, dict):
        return ["chatNaturalLanguageProposalDecisionClickActionResultMissing"]
    expected_status = "approved" if expected_kind == "approve" else "rejected"
    expected_text = "已批准" if expected_kind == "approve" else "已驳回"
    if click_result.get("chatNaturalLanguageProposalDecisionContract") != "chat_natural_language_proposal_decision_visual_smoke_v1":
        failures.append("chatNaturalLanguageProposalDecisionContractMissing")
    if not bool(click_result.get("chatNaturalLanguageProposalDecisionAccepted", False)):
        failures.append("chatNaturalLanguageProposalDecisionAcceptedMissing")
    if click_result.get("chatNaturalLanguageProposalDecisionKind") != expected_kind:
        failures.append("chatNaturalLanguageProposalDecisionKindMismatch")
    if click_result.get("chatNaturalLanguageProposalDecisionStatus") != expected_status:
        failures.append("chatNaturalLanguageProposalDecisionStatusMismatch")
    if click_result.get("chatNaturalLanguageProposalDecisionRemoteStatus") != expected_status:
        failures.append("chatNaturalLanguageProposalDecisionRemoteStatusMismatch")
    if click_result.get("chatNaturalLanguageProposalDecisionSource") != "chat_natural_language_proposal_decision":
        failures.append("chatNaturalLanguageProposalDecisionSourceMismatch")
    if expected_text not in str(click_result.get("chatNaturalLanguageProposalDecisionLatestAiBody", "")):
        failures.append("chatNaturalLanguageProposalDecisionVisibleCopyMissing")
    if not bool(click_result.get("chatNaturalLanguageProposalDecisionForbiddenCopyClear", False)):
        failures.append("chatNaturalLanguageProposalDecisionForbiddenCopyLeak")
    if not bool(screenshot_visibility_gate.get("ok", False)):
        failures.append("chatNaturalLanguageProposalDecisionScreenshotVisibilityFailed")
    if not str(click_result.get("chatNaturalLanguageProposalDecisionScreenshotPath", "")).strip():
        failures.append("chatNaturalLanguageProposalDecisionScreenshotPathMissing")
    return failures


def _validate_ai_switch_home_city_visual_acceptance_contract(
    click_action: str,
    godot_report: dict[str, Any],
    screenshot_visibility_gate: dict[str, Any],
) -> list[str]:
    if click_action != "world_ai_switch_open_home_city":
        return []
    failures: list[str] = []
    click_result = godot_report.get("clickActionResult", {})
    if not isinstance(click_result, dict):
        return ["aiSwitchHomeCityClickActionResultMissing"]
    page_summary = click_result.get("pageContentSummary", {})
    if not isinstance(page_summary, dict):
        failures.append("aiSwitchHomeCityPageSummaryMissing")
        page_summary = {}
    if page_summary.get("aiSwitchHomeCityVisualAcceptanceToken") != "ai_switch_home_city_visual_acceptance_v1":
        failures.append("aiSwitchHomeCityVisualAcceptanceTokenMissing")
    if not bool(page_summary.get("aiSwitchHomeCityScreenshotAcceptanceReady", False)):
        failures.append("aiSwitchHomeCityScreenshotAcceptanceNotReady")
    if not bool(page_summary.get("aiSwitchHomeCityVisibleCopyClean", False)):
        failures.append("aiSwitchHomeCityVisibleCopyNotClean")
    if not bool(page_summary.get("aiSwitchOneClickFacilityOpenOk", False)):
        failures.append("aiSwitchHomeCityFacilityNotOpen")
    if not bool(page_summary.get("aiSwitchOneClickButtonVisible", False)):
        failures.append("aiSwitchHomeCityButtonNotVisible")
    if not bool(screenshot_visibility_gate.get("ok", False)):
        failures.append("aiSwitchHomeCityScreenshotVisibilityFailed")
    if str(page_summary.get("aiSwitchHomeCityStyleOwner", "")).strip() == "":
        failures.append("aiSwitchHomeCityStyleOwnerMissing")
    return failures


def _validate_main_city_facility_upgrade_gameplay_anchor(
    click_action: str,
    godot_report: dict[str, Any],
    screenshot_visibility_gate: dict[str, Any],
) -> list[str]:
    if click_action != "world_click_main_city_node_facility_building_tree_submit_upgrade":
        return []
    failures: list[str] = []
    click_result = godot_report.get("clickActionResult", {})
    if not isinstance(click_result, dict):
        godot_report["mainCityFacilityUpgradeGameplayAnchorOk"] = False
        return ["mainCityFacilityUpgradeClickActionResultMissing"]
    page_summary = click_result.get("pageContentSummary", {})
    if not isinstance(page_summary, dict):
        failures.append("mainCityFacilityUpgradePageSummaryMissing")
        page_summary = {}
    if not bool(click_result.get("ok", False)):
        failures.append("mainCityFacilityUpgradeClickActionNotOk")
    if str(click_result.get("reason", "")).strip() != "main_city_facility_tree_upgrade_submitted":
        failures.append("mainCityFacilityUpgradeReasonMismatch")
    if not bool(click_result.get("pageContentOk", False)):
        failures.append("mainCityFacilityUpgradePageContentNotOk")
    if str(page_summary.get("facilityTreeMode", "")).strip() != "standalone":
        failures.append("mainCityFacilityUpgradeTreeModeNotStandalone")
    if str(page_summary.get("mainCityFacilitySource", "")).strip() != "map_node_click":
        failures.append("mainCityFacilityUpgradeSourceMismatch")
    if bool(page_summary.get("facilityTreeReadonly", True)):
        failures.append("mainCityFacilityUpgradeReadonly")
    if int(page_summary.get("facilityTreeUpgradableNodeCount", 0) or 0) < 1:
        failures.append("mainCityFacilityUpgradeNoUpgradableNode")
    if not bool(page_summary.get("hasUpgradeSheet", False)):
        failures.append("mainCityFacilityUpgradeSheetMissing")
    if str(page_summary.get("selectedBuildingId", "")).strip() != "market_plaza":
        failures.append("mainCityFacilityUpgradeSelectedBuildingMismatch")
    if not bool(page_summary.get("submittedStateVisible", False)):
        failures.append("mainCityFacilityUpgradeSubmittedStateMissing")
    if not bool(page_summary.get("primaryButtonDisabled", False)):
        failures.append("mainCityFacilityUpgradePrimaryStillEnabled")
    if not bool(page_summary.get("upgradeSheetSubmittedBadgeVisible", False)):
        failures.append("mainCityFacilityUpgradeSubmittedBadgeMissing")
    if str(page_summary.get("upgradeSheetActionStateText", "")).strip() != "升级中":
        failures.append("mainCityFacilityUpgradeActionStateTextMismatch")
    if bool(page_summary.get("upgradeSheetEngineeringCopyVisible", True)):
        failures.append("mainCityFacilityUpgradeEngineeringCopyVisible")
    if not bool(screenshot_visibility_gate.get("ok", False)):
        failures.append("mainCityFacilityUpgradeScreenshotVisibilityFailed")
    godot_report["mainCityFacilityUpgradeGameplayAnchorOk"] = not failures
    godot_report["mainCityFacilityUpgradeGameplayAnchorFailures"] = failures
    return failures


def _validate_world_affairs_claim_reward_gameplay_anchor(
    click_action: str,
    godot_report: dict[str, Any],
    screenshot_visibility_gate: dict[str, Any],
) -> list[str]:
    if click_action != "world_affairs_claim_reward":
        return []
    failures: list[str] = []
    click_result = godot_report.get("clickActionResult", {})
    if not isinstance(click_result, dict):
        godot_report["worldAffairsClaimRewardGameplayAnchorOk"] = False
        return ["worldAffairsClaimRewardClickActionResultMissing"]
    if not bool(click_result.get("ok", False)):
        failures.append("worldAffairsClaimRewardClickActionNotOk")
    if str(click_result.get("reason", "")).strip() != "claimed":
        failures.append("worldAffairsClaimRewardReasonMismatch")
    for key in (
        "worldAffairsClaimRewardGameplayAnchorOk",
        "worldAffairsClaimRewardRemoteApplied",
        "worldAffairsClaimRewardReadModelRefreshed",
        "worldAffairsClaimRewardForbiddenCopyClear",
    ):
        if not bool(click_result.get(key, False)):
            failures.append(f"{key}!=true")
    if str(click_result.get("worldAffairsClaimRewardClaimedNodeId", "")).strip() == "":
        failures.append("worldAffairsClaimRewardClaimedNodeIdMissing")
    if str(click_result.get("worldAffairsClaimRewardTriggerMode", "")).strip() == "":
        failures.append("worldAffairsClaimRewardTriggerModeMissing")
    if str(click_result.get("worldAffairsClaimRewardAfterClaimState", "")).strip() != "claimed":
        failures.append("worldAffairsClaimRewardAfterClaimStateMismatch")
    if bool(click_result.get("worldAffairsClaimRewardCanClaimAfter", True)):
        failures.append("worldAffairsClaimRewardCanClaimAfterStillTrue")
    if click_result.get("worldAffairsClaimRewardForbiddenCopyHits") not in ([], None):
        failures.append("worldAffairsClaimRewardForbiddenCopyHitsNotEmpty")
    if not bool(screenshot_visibility_gate.get("ok", False)):
        failures.append("worldAffairsClaimRewardScreenshotVisibilityFailed")
    godot_report["worldAffairsClaimRewardGameplayAnchorOk"] = not failures
    godot_report["worldAffairsClaimRewardGameplayAnchorFailures"] = failures
    return failures


def _validate_interior_affairs_work_order_server_authority_anchor(
    click_action: str,
    godot_report: dict[str, Any],
    screenshot_visibility_gate: dict[str, Any],
) -> list[str]:
    if click_action != "world_open_main_city_interior_affairs_press_first_action":
        return []
    failures: list[str] = []
    click_result = godot_report.get("clickActionResult", {})
    if not isinstance(click_result, dict):
        godot_report["interiorAffairsWorkOrderServerAuthorityAnchorOk"] = False
        return ["interiorAffairsWorkOrderClickActionResultMissing"]
    page_summary = click_result.get("pageContentSummary", {})
    if not isinstance(page_summary, dict):
        failures.append("interiorAffairsWorkOrderPageSummaryMissing")
        page_summary = {}
    if not bool(click_result.get("ok", False)):
        failures.append("interiorAffairsWorkOrderClickActionNotOk")
    if str(click_result.get("reason", "")).strip() != "interior_work_order_action_adapter_verified":
        failures.append("interiorAffairsWorkOrderReasonMismatch")
    if not bool(page_summary.get("interiorAffairsWorkOrderServerAuthorityOk", False)):
        failures.append("interiorAffairsWorkOrderServerAuthorityOk!=true")
    if str(page_summary.get("interiorAffairsWorkOrderServerReceiptSource", "")).strip() != "server_interior_work_order_action":
        failures.append("interiorAffairsWorkOrderServerReceiptSourceMismatch")
    if str(page_summary.get("interiorAffairsWorkOrderServerReadbackSchema", "")).strip() != "main_city_interior_work_order_action_readback_v1":
        failures.append("interiorAffairsWorkOrderServerReadbackSchemaMismatch")
    if str(page_summary.get("interiorAffairsWorkOrderServerReadbackReceiptId", "")).strip() == "":
        failures.append("interiorAffairsWorkOrderServerReadbackReceiptIdMissing")
    if not bool(screenshot_visibility_gate.get("ok", False)):
        failures.append("interiorAffairsWorkOrderScreenshotVisibilityFailed")
    godot_report["interiorAffairsWorkOrderServerAuthorityAnchorOk"] = not failures
    godot_report["interiorAffairsWorkOrderServerAuthorityAnchorFailures"] = failures
    return failures


def main() -> int:
    _configure_stdio_utf8()
    args = _parse_args()
    _apply_main_city_click_action_defaults(args)
    isolated_home_city_binding = _is_isolated_ai_home_city_binding(args)
    ai_switch_home_city_visual_acceptance = _is_ai_switch_home_city_visual_acceptance(args)
    isolated_backend_state = bool(getattr(args, "isolated_backend_state", False)) or isolated_home_city_binding or ai_switch_home_city_visual_acceptance
    if isolated_backend_state:
        args.backend_url = _allocate_local_backend_url()
    panel_id = _resolve_visual_smoke_panel_id(args.panel_id)
    panel_required = args.display_mode == "city" or args.world_action == "open_hub_panel"
    evidence_dir = Path(args.evidence_dir).resolve() if args.evidence_dir.strip() else _default_evidence_dir()
    chokepoint_batch_selection = _resolve_chokepoint_runtime_placement_batch(args)
    if chokepoint_batch_selection.get("selectedRuntimePlacementIds") or chokepoint_batch_selection.get("error"):
        return _run_chokepoint_runtime_placement_batch(args, evidence_dir, chokepoint_batch_selection)
    batch_selection = _resolve_mountain_boundary_runtime_placement_batch(args)
    if batch_selection.get("selectedRuntimePlacementIds") or batch_selection.get("error"):
        return _run_mountain_boundary_runtime_placement_batch(args, evidence_dir, batch_selection)
    report_path = evidence_dir / "godot_visual_smoke_report.json"
    summary_path = evidence_dir / "mainline_visual_smoke_summary.json"
    if args.click_action != "none":
        screenshot_name = f"01_after_{args.click_action}.png"
    elif args.display_mode == "world" and args.world_action == "open_hub_panel":
        screenshot_name = "01_ready_world_hub_panel.png"
    elif args.display_mode == "world":
        screenshot_name = "01_ready_world_map.png"
    else:
        screenshot_name = "01_ready_secondary_panel.png"
    screenshot_path = evidence_dir / screenshot_name
    sequence_dir = evidence_dir / "movement_sequence"
    pre_close_screenshot_path: Path | None = None
    if args.close_after_open or args.click_action.endswith("_close"):
        pre_close_screenshot_path = evidence_dir / f"00_before_close_{args.click_action}.png"
    backend_log_path = evidence_dir / "backend.log"
    godot_log_path = evidence_dir / "godot.log"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    state_case_set_summary = _tianxia_state_case_set_summary(args.state_ids, args.state_case_set)

    summary: dict[str, Any] = {
        "command": "run_mainline_visual_smoke",
        "backendUrl": args.backend_url,
        "isolatedBackendStateEnabled": isolated_backend_state,
        "isolatedAiHomeCityBinding": isolated_home_city_binding,
        "scene": args.scene,
        "displayMode": args.display_mode,
        "worldAction": args.world_action,
        "mountainBoundaryRuntimePlacementId": args.mountain_boundary_runtime_placement_id,
        "chokepointRuntimePlacementId": args.chokepoint_runtime_placement_id,
        "panelId": panel_id,
        "requestedPanelId": args.panel_id,
        "panelRequired": panel_required,
        "aiSwitchHomeCityVisualAcceptance": ai_switch_home_city_visual_acceptance,
        "closeAfterOpen": args.close_after_open,
        "godotScriptPreflight": bool(args.godot_script_preflight),
        "godotScriptPreflightOnly": bool(args.godot_script_preflight_only),
        "clickAction": args.click_action,
        "stateCaseSet": state_case_set_summary.get("stateCaseSet", ""),
        "stateCaseSetSource": state_case_set_summary.get("stateCaseSetSource", ""),
        "stateCaseSetScope": state_case_set_summary.get("stateCaseSetScope", ""),
        "recommendedStateCaseCount": state_case_set_summary.get("recommendedStateCaseCount", 0),
        "resolvedStateIdCount": state_case_set_summary.get("resolvedStateIdCount", 0),
        "notAllStateCoverage": bool(state_case_set_summary.get("notAllStateCoverage", False)),
        "allStateVisualProof": bool(state_case_set_summary.get("allStateVisualProof", False)),
        "requiresSeparate57StateVisualProof": bool(state_case_set_summary.get("requiresSeparate57StateVisualProof", False)),
        "stateCaseSetSummary": state_case_set_summary,
        "hideObservability": not args.show_observability,
        "windowSize": {
            "width": args.window_width,
            "height": args.window_height,
        },
        "demoStoryMobileLandscapeProfile": (
            "demo_story_living_world_mobile_landscape"
            if args.click_action == DEMO_STORY_MOBILE_LANDSCAPE_ACTION
            else ""
        ),
        "demoStoryMobileLandscapeViewport": (
            f"{DEMO_STORY_MOBILE_LANDSCAPE_WIDTH}x{DEMO_STORY_MOBILE_LANDSCAPE_HEIGHT}"
            if args.click_action == DEMO_STORY_MOBILE_LANDSCAPE_ACTION
            else ""
        ),
        "evidenceDir": str(evidence_dir),
        "steps": [],
        "artifacts": {
            "godotReport": str(report_path),
            "summaryReport": str(summary_path),
            "screenshot": str(screenshot_path),
            "movementSequenceDir": str(sequence_dir),
            "godotLog": str(godot_log_path),
        },
    }
    if pre_close_screenshot_path is not None:
        summary["artifacts"]["beforeCloseScreenshot"] = str(pre_close_screenshot_path)
    isolated_backend_env = _build_isolated_backend_state_env(evidence_dir) if isolated_backend_state else {}
    _apply_voice_playback_backend_env(args, isolated_backend_env)
    if isolated_backend_env:
        summary["isolatedBackendState"] = isolated_backend_env
    if isolated_backend_state and args.no_start_backend:
        summary["ok"] = False
        summary["error"] = "isolated_backend_state_requires_backend_start"
        _write_json(summary_path, summary)
        _print_summary(summary)
        return 1

    if bool(args.godot_script_preflight_only):
        preflight_result = _run_godot_script_preflight(args, evidence_dir)
        summary["steps"].append({"name": "godot_script_preflight", **preflight_result})
        summary["ok"] = bool(preflight_result.get("ok", False))
        if not summary["ok"]:
            summary["error"] = str(preflight_result.get("failureKind") or preflight_result.get("reason") or "godot_script_preflight_failed")
        _write_json(summary_path, summary)
        _print_summary(summary)
        return 0 if summary["ok"] else 1

    backend_process: subprocess.Popen[str] | None = None
    godot_process: subprocess.Popen[str] | None = None
    started_backend = False

    try:
        if bool(args.godot_script_preflight):
            preflight_result = _run_godot_script_preflight(args, evidence_dir)
            summary["steps"].append({"name": "godot_script_preflight", **preflight_result})
            if not bool(preflight_result.get("ok", False)):
                summary["ok"] = False
                summary["error"] = str(preflight_result.get("failureKind") or preflight_result.get("reason") or "godot_script_preflight_failed")
                _write_json(summary_path, summary)
                _print_summary(summary)
                return 1

        initial_health = _read_health(args.backend_url)
        summary["steps"].append({"name": "initial_health", **initial_health})
        if not bool(initial_health.get("ok", False)):
            if args.no_start_backend:
                summary["ok"] = False
                summary["error"] = "backend_unhealthy_no_start"
                _write_json(summary_path, summary)
                _print_summary(summary)
                return 1
            backend_process = _spawn_backend(backend_log_path, args.server_script, args.backend_url, isolated_backend_env)
            started_backend = True
            summary["steps"].append({"name": "backend_start", "ok": True, "pid": backend_process.pid, "logPath": str(backend_log_path)})
            ready_health = _wait_for_health(args.backend_url, args.backend_timeout_sec)
            summary["steps"].append({"name": "wait_for_health", **ready_health})
            if not bool(ready_health.get("ok", False)):
                summary["ok"] = False
                summary["error"] = "backend_health_timeout"
                _write_json(summary_path, summary)
                _print_summary(summary)
                return 1
        else:
            summary["steps"].append({"name": "backend_start", "ok": True, "detail": "backend already healthy"})

        world_tasks_chapter_seed_result = _seed_world_tasks_chapter_fixture(args)
        summary["steps"].append({"name": "seed_world_tasks_chapter_fixture", **world_tasks_chapter_seed_result})
        if not bool(world_tasks_chapter_seed_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_world_tasks_chapter_fixture_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        first_hour_task_claim_prompt_seed_result = _seed_first_hour_task_claim_prompt_fixture(args)
        summary["steps"].append({"name": "seed_first_hour_task_claim_prompt_fixture", **first_hour_task_claim_prompt_seed_result})
        if not bool(first_hour_task_claim_prompt_seed_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_first_hour_task_claim_prompt_fixture_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        world_affairs_claimable_node_seed_result = _seed_world_affairs_claimable_node_fixture(args)
        summary["steps"].append({"name": "seed_world_affairs_claimable_node_fixture", **world_affairs_claimable_node_seed_result})
        if not bool(world_affairs_claimable_node_seed_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_world_affairs_claimable_node_fixture_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        isolated_seed_result = _seed_ai_home_city_unbound_fixture(args, isolated_home_city_binding)
        summary["steps"].append({"name": "seed_ai_home_city_unbound_fixture", **isolated_seed_result})
        if not bool(isolated_seed_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_ai_home_city_unbound_fixture_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        bound_seed_result = _seed_ai_home_city_bound_fixture(args, ai_switch_home_city_visual_acceptance)
        summary["steps"].append({"name": "seed_ai_home_city_bound_fixture", **bound_seed_result})
        if not bool(bound_seed_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_ai_home_city_bound_fixture_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        seed_result = _seed_ai_avatar_profile(args)
        summary["steps"].append({"name": "seed_ai_avatar_profile", **seed_result})
        if not bool(seed_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_ai_avatar_profile_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        voice_playback_seed_result = _seed_ai_player_for_voice_playback(args)
        summary["steps"].append({"name": "seed_ai_player_for_voice_playback", **voice_playback_seed_result})
        if not bool(voice_playback_seed_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_ai_player_for_voice_playback_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        multi_team_fixture_seed_result = _seed_main_city_troop_formation_multi_team_fixture(args)
        summary["steps"].append({"name": "seed_main_city_troop_formation_multi_team_fixture", **multi_team_fixture_seed_result})
        if not bool(multi_team_fixture_seed_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_main_city_troop_formation_multi_team_fixture_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        battle_report_seed_result = _seed_battle_report_closure(args)
        summary["steps"].append({"name": "seed_battle_report_closure", **battle_report_seed_result})
        if not bool(battle_report_seed_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_battle_report_closure_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        player_history_replay_seed_result = _seed_player_history_replay(args)
        summary["steps"].append({"name": "seed_player_history_replay", **player_history_replay_seed_result})
        if not bool(player_history_replay_seed_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_player_history_replay_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        player_history_save_restore_seed_result = _seed_player_history_save_restore(args)
        summary["steps"].append({"name": "seed_player_history_save_restore", **player_history_save_restore_seed_result})
        if not bool(player_history_save_restore_seed_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_player_history_save_restore_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        player_history_ai_proposal_denied_seed_result = _seed_player_history_ai_proposal_denied(args)
        summary["steps"].append({"name": "seed_player_history_ai_proposal_denied", **player_history_ai_proposal_denied_seed_result})
        if not bool(player_history_ai_proposal_denied_seed_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_player_history_ai_proposal_denied_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        player_history_ai_execution_receipt_seed_result = _seed_player_history_ai_execution_receipt(args)
        summary["steps"].append({"name": "seed_player_history_ai_execution_receipt", **player_history_ai_execution_receipt_seed_result})
        if not bool(player_history_ai_execution_receipt_seed_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_player_history_ai_execution_receipt_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        player_history_ai_proposal_apply_seed_result = _seed_player_history_ai_proposal_apply(args)
        summary["steps"].append({"name": "seed_player_history_ai_proposal_apply", **player_history_ai_proposal_apply_seed_result})
        if not bool(player_history_ai_proposal_apply_seed_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_player_history_ai_proposal_apply_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        owner_delta_session_seed_result = _seed_player_session_for_owner_delta(args)
        summary["steps"].append({"name": "seed_player_session_for_owner_delta", **owner_delta_session_seed_result})
        if not bool(owner_delta_session_seed_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_player_session_for_owner_delta_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        map_unit_exit_fixture_result = _seed_map_unit_visual_exit_fixture(args)
        summary["steps"].append({"name": "seed_map_unit_visual_exit_fixture", **map_unit_exit_fixture_result})
        if not bool(map_unit_exit_fixture_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_map_unit_visual_exit_fixture_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        recruit_draw_seed_result = _seed_recruit_draw_fixture(args)
        summary["steps"].append({"name": "seed_recruit_draw_fixture", **recruit_draw_seed_result})
        if not bool(recruit_draw_seed_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_recruit_draw_fixture_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        nation_empire_success_seed_result = _seed_nation_empire_success_fixture(args)
        summary["steps"].append({"name": "seed_nation_empire_success_fixture", **nation_empire_success_seed_result})
        if not bool(nation_empire_success_seed_result.get("ok", False)):
            summary["ok"] = False
            summary["error"] = "seed_nation_empire_success_fixture_failed"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        launcher = _load_godot_launcher_module()
        godot_exe = launcher.resolve_godot_exe("runtime", args.godot_exe)
        if not godot_exe:
            raise RuntimeError("Godot executable not resolved")

        command = [
            godot_exe,
            "--path",
            str(Path(args.project_path).resolve()),
            "--scene",
            args.scene,
        ]
        if args.window_width > 0 and args.window_height > 0:
            command.extend(["--resolution", f"{args.window_width}x{args.window_height}"])
        env = os.environ.copy()
        effective_sequence_capture_count = max(0, int(args.sequence_capture_count))
        if args.click_action == "world_map_video_style_transition_chain_fixture":
            effective_sequence_capture_count = max(
                effective_sequence_capture_count,
                WORLD_MAP_VIDEO_STYLE_TRANSITION_MIN_SEQUENCE_CAPTURE_COUNT,
            )
        env["SLG_BACKEND_URL"] = args.backend_url
        env["SLG_PLAYER_NAME"] = str(args.seed_ai_governor_player_id).strip() or "human_alpha"
        env["SLG_BOOT_DISPLAY_MODE"] = args.display_mode
        env["SLG_MAINLINE_VISUAL_SMOKE"] = "1"
        env["SLG_MAINLINE_VISUAL_SMOKE_DISPLAY_MODE"] = args.display_mode
        env["SLG_MAINLINE_VISUAL_SMOKE_WORLD_ACTION"] = args.world_action
        env["SLG_MAINLINE_VISUAL_SMOKE_MOUNTAIN_BOUNDARY_RUNTIME_PLACEMENT_ID"] = args.mountain_boundary_runtime_placement_id.strip()
        env["SLG_MAINLINE_VISUAL_SMOKE_CHOKEPOINT_RUNTIME_PLACEMENT_ID"] = args.chokepoint_runtime_placement_id.strip()
        if args.map_center_x.strip():
            env["SLG_MAP_CENTER_X"] = args.map_center_x.strip()
        if args.map_center_y.strip():
            env["SLG_MAP_CENTER_Y"] = args.map_center_y.strip()
        env["SLG_MAINLINE_VISUAL_SMOKE_REQUIRE_PANEL"] = "1" if panel_required else "0"
        env["SLG_MAINLINE_VISUAL_SMOKE_PANEL"] = panel_id
        env["SLG_MAINLINE_VISUAL_SMOKE_REPORT"] = str(report_path)
        env["SLG_MAINLINE_VISUAL_SMOKE_SCREENSHOT"] = str(screenshot_path)
        env["SLG_MAINLINE_VISUAL_SMOKE_PRE_CLOSE_SCREENSHOT"] = str(pre_close_screenshot_path or "")
        env["SLG_MAINLINE_VISUAL_SMOKE_SEQUENCE_DIR"] = str(sequence_dir)
        env["SLG_MAINLINE_VISUAL_SMOKE_SEQUENCE_COUNT"] = str(effective_sequence_capture_count)
        env["SLG_MAINLINE_VISUAL_SMOKE_SEQUENCE_INTERVAL_SEC"] = str(max(0.0, float(args.sequence_capture_interval_sec)))
        env["SLG_MAINLINE_VISUAL_SMOKE_HIDE_OBSERVABILITY"] = "0" if args.show_observability else "1"
        env["SLG_MAINLINE_VISUAL_SMOKE_CLOSE_AFTER_OPEN"] = "1" if args.close_after_open else "0"
        env["SLG_MAINLINE_VISUAL_SMOKE_CLICK_ACTION"] = args.click_action
        env["SLG_MAINLINE_VISUAL_SMOKE_STATE_IDS"] = _resolve_tianxia_state_ids_arg(args.state_ids, args.state_case_set)
        env["SLG_MAINLINE_VISUAL_SMOKE_MAP_UNIT_MARCH_TARGET_TILE_ID"] = args.map_unit_march_target_tile_id.strip()
        env["SLG_MAINLINE_VISUAL_SMOKE_REQUIRE_AI_HOME_CITY_UNBOUND"] = "1" if isolated_home_city_binding else "0"
        if isinstance(player_history_ai_proposal_apply_seed_result, dict):
            proposal_id = str(player_history_ai_proposal_apply_seed_result.get("proposalId", "")).strip()
            ai_player_id = str(player_history_ai_proposal_apply_seed_result.get("aiPlayerId", "")).strip()
            governor_player_id = str(player_history_ai_proposal_apply_seed_result.get("governorPlayerId", "")).strip()
            if proposal_id:
                env["SLG_MAINLINE_VISUAL_SMOKE_AI_PROPOSAL_ID"] = proposal_id
            if ai_player_id:
                env["SLG_MAINLINE_VISUAL_SMOKE_AI_PLAYER_ID"] = ai_player_id
            if governor_player_id:
                env["SLG_MAINLINE_VISUAL_SMOKE_AI_GOVERNOR_PLAYER_ID"] = governor_player_id
        if args.click_action == "world_open_main_city_interior_affairs_stress_12":
            env["SLG_MAIN_CITY_INTERIOR_WORK_ORDER_STRESS_COUNT"] = "12"

        godot_log = godot_log_path.open("w", encoding="utf-8")
        godot_process = subprocess.Popen(
            command,
            cwd=REPO_ROOT,
            stdout=godot_log,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            text=True,
            encoding="utf-8",
            env=env,
        )
        setattr(godot_process, "_log_file", godot_log)
        summary["steps"].append({"name": "godot_start", "ok": True, "pid": godot_process.pid, "command": command})

        try:
            return_code = godot_process.wait(timeout=args.timeout_sec)
        except subprocess.TimeoutExpired:
            summary["ok"] = False
            summary["error"] = "godot_timeout"
            _write_json(summary_path, summary)
            _print_summary(summary)
            return 1

        summary["steps"].append({"name": "godot_exit", "ok": return_code == 0, "returnCode": return_code})
        godot_report = _read_json(report_path) if report_path.exists() else {}
        screenshot_stats = _image_stats(screenshot_path)
        pre_close_screenshot_stats = _image_stats(pre_close_screenshot_path) if pre_close_screenshot_path is not None else {"ok": True, "requested": False}
        screenshot_visibility_gate = _screenshot_visibility_gate(screenshot_stats)
        pre_close_screenshot_visibility_gate = (
            _screenshot_visibility_gate(pre_close_screenshot_stats)
            if pre_close_screenshot_path is not None
            else {
                "contractId": SCREENSHOT_VISIBILITY_GATE_CONTRACT,
                "ok": True,
                "requested": False,
                "reason": "not_requested",
            }
        )
        sequence_capture = godot_report.get("sequenceCapture", {})
        if not isinstance(sequence_capture, dict):
            sequence_capture = {}
        raw_sequence_frames = sequence_capture.get("frames", [])
        sequence_frames = raw_sequence_frames if isinstance(raw_sequence_frames, list) else []
        sequence_frame_stats: list[dict[str, Any]] = []
        for frame in sequence_frames:
            if not isinstance(frame, dict):
                continue
            frame_screenshot = frame.get("screenshot", {})
            if not isinstance(frame_screenshot, dict):
                continue
            sequence_frame_stats.append(_image_stats(Path(str(frame_screenshot.get("path", "")))))
        sequence_requested = effective_sequence_capture_count > 0
        sequence_requires_map_unit_artifacts = args.click_action in {
            "world_click_main_city_node_troop_submit_march_map_unit",
            "world_click_main_city_node_troop_blocked_screenshot_fixture",
            "world_click_main_city_node_troop_intercepted_screenshot_fixture",
            "world_click_main_city_node_troop_retreating_screenshot_fixture",
        }
        if sequence_frames and sequence_requires_map_unit_artifacts:
            sequence_artifacts = _generate_movement_sequence_artifacts(sequence_frames, sequence_dir)
        elif sequence_frames:
            sequence_artifacts = {
                "ok": True,
                "reason": "raw_sequence_frames_only",
                "frameCount": len(sequence_frames),
            }
        else:
            sequence_artifacts = {"ok": not sequence_requested, "reason": "not_requested"}
        movement_sequence_ok = True
        if sequence_requested:
            movement_sequence_ok = (
                bool(sequence_capture.get("ok", False))
                and len(sequence_frame_stats) >= effective_sequence_capture_count
                and all(bool(stat.get("ok", False)) for stat in sequence_frame_stats)
                and bool(sequence_artifacts.get("ok", False))
            )
        if args.click_action == "world_map_video_style_transition_chain_fixture":
            frame_evidence = _materialize_world_map_video_style_transition_chain_frame_evidence(
                sequence_frames,
                sequence_dir,
            )
            godot_report["worldMapVideoStyleTransitionExpectedFrameManifest"] = frame_evidence.get("expectedFrameManifest", [])
            godot_report["worldMapVideoStyleTransitionExpectedFrameManifestOk"] = (
                len(frame_evidence.get("expectedFrameManifest", [])) == WORLD_MAP_VIDEO_STYLE_TRANSITION_MIN_SEQUENCE_CAPTURE_COUNT
            )
            godot_report["worldMapVideoStyleTransitionChainFrameEvidence"] = frame_evidence.get("frames", {})
            godot_report["worldMapVideoStyleTransitionChainFrameEvidenceOk"] = bool(frame_evidence.get("ok", False))
            godot_report["worldMapVideoStyleTransitionChainFrameEvidenceMissing"] = frame_evidence.get("missing", [])
            godot_report["worldMapVideoStyleTransitionChainFrameEvidenceSummary"] = frame_evidence
        summary["godotReport"] = godot_report
        summary["screenshotStats"] = screenshot_stats
        summary["beforeCloseScreenshotStats"] = pre_close_screenshot_stats
        summary["screenshotVisibilityGate"] = screenshot_visibility_gate
        summary["beforeCloseScreenshotVisibilityGate"] = pre_close_screenshot_visibility_gate
        contract_failures = _validate_world_map_video_style_transition_chain_contract(args.click_action, godot_report)
        contract_failures.extend(_validate_tianxia_yutu_state_detail_zoom_contract(args.click_action, godot_report))
        contract_failures.extend(_validate_main_city_troop_type_chip_contract(args.click_action, godot_report))
        contract_failures.extend(_validate_tile_resource_hud_contract(args.click_action, godot_report))
        contract_failures.extend(_validate_first_hour_land_loop_integrated_contract(args.click_action, godot_report))
        contract_failures.extend(_validate_first_hour_task_claim_prompt_contract(args.click_action, godot_report))
        contract_failures.extend(_validate_mainworld_camera_pan_resource_roundtrip_contract(args.click_action, godot_report))
        contract_failures.extend(_validate_click_priority_matrix_contract(args.click_action, godot_report))
        contract_failures.extend(_validate_left_troop_rail_contract(args.click_action, godot_report))
        contract_failures.extend(_validate_harbor_action_hud_contract(args.click_action, godot_report))
        contract_failures.extend(_validate_nation_midgame_objective_route_luoyang_contract(args.click_action, godot_report))
        contract_failures.extend(_validate_nation_midgame_luoyang_route_action_hud_contract(args.click_action, godot_report))
        contract_failures.extend(_validate_inbox_mail_live_screenshot_contract(args.click_action, godot_report))
        contract_failures.extend(_validate_unified_inbox_claim_reward_settlement_contract(args.click_action, godot_report))
        contract_failures.extend(_validate_world_tile_expedition_minimal_settlement_gameplay_anchor(args.click_action, godot_report))
        contract_failures.extend(_validate_world_naval_harbor_inventory_open_gameplay_anchor(args.click_action, godot_report))
        contract_failures.extend(_validate_world_naval_harbor_deployment_readiness_gameplay_anchor(args.click_action, godot_report))
        contract_failures.extend(_validate_world_naval_inventory_fleet_patrol_reuse_gameplay_anchor(args.click_action, godot_report))
        contract_failures.extend(_validate_battle_report_detail_player_copy_governance(args.click_action, godot_report))
        contract_failures.extend(_validate_player_history_seeded_replay_recovery_identity_visual_smoke(args.click_action, godot_report, screenshot_visibility_gate))
        contract_failures.extend(_validate_player_history_ai_proposal_denied_recovery_visual_smoke(args.click_action, godot_report, screenshot_visibility_gate))
        contract_failures.extend(_validate_player_history_ai_proposal_denied_focused_receipt_visual_smoke(args.click_action, godot_report, screenshot_visibility_gate))
        contract_failures.extend(_validate_player_history_ai_execution_receipt_recovery_visual_smoke(args.click_action, godot_report, screenshot_visibility_gate))
        contract_failures.extend(_validate_player_history_ai_tile_abandon_receipt_visual_smoke(args.click_action, godot_report, screenshot_visibility_gate))
        contract_failures.extend(_validate_player_history_ai_proposal_apply_recovery_visual_smoke(args.click_action, godot_report, screenshot_visibility_gate))
        contract_failures.extend(_validate_ai_hub_proposal_mutation_result_visual_smoke(args.click_action, godot_report, screenshot_visibility_gate))
        contract_failures.extend(_validate_chat_natural_language_proposal_decision_visual_smoke(args.click_action, godot_report, screenshot_visibility_gate))
        contract_failures.extend(_validate_ai_switch_home_city_visual_acceptance_contract(args.click_action, godot_report, screenshot_visibility_gate))
        contract_failures.extend(_validate_main_city_facility_upgrade_gameplay_anchor(args.click_action, godot_report, screenshot_visibility_gate))
        contract_failures.extend(_validate_world_affairs_claim_reward_gameplay_anchor(args.click_action, godot_report, screenshot_visibility_gate))
        contract_failures.extend(_validate_interior_affairs_work_order_server_authority_anchor(args.click_action, godot_report, screenshot_visibility_gate))
        demo_story_mobile_landscape_smoke_ok = True
        if args.click_action == DEMO_STORY_MOBILE_LANDSCAPE_ACTION:
            demo_story_mobile_landscape_smoke_ok = (
                args.window_width == DEMO_STORY_MOBILE_LANDSCAPE_WIDTH
                and args.window_height == DEMO_STORY_MOBILE_LANDSCAPE_HEIGHT
            )
            summary["demoStoryMobileLandscapeSmokeOk"] = demo_story_mobile_landscape_smoke_ok
            summary["demoStoryMobileLandscapeRequiredSurfaces"] = [
                "main_world_ai_activity",
                "ai_panel_execution_trace",
                "battle_report_detail",
                "tianxia_yutu",
                "chat_trace_continuity",
            ]
            if not demo_story_mobile_landscape_smoke_ok:
                contract_failures.append("demoStoryMobileLandscapeViewport!=960x540")
        summary["formalContractFailures"] = contract_failures
        if args.click_action == "world_map_video_style_transition_chain_fixture":
            compact_transition_summary = _world_map_video_style_transition_chain_compact_summary(godot_report)
            godot_report["worldMapVideoStyleTransitionChainCompactSummary"] = compact_transition_summary
            summary["worldMapVideoStyleTransitionChainCompactSummary"] = compact_transition_summary
        summary["movementSequenceStats"] = {
            "requested": sequence_requested,
            "requestedCount": max(0, int(args.sequence_capture_count)),
            "effectiveCount": effective_sequence_capture_count,
            "ok": movement_sequence_ok,
            "dir": str(sequence_capture.get("dir", sequence_dir)),
            "frameCount": len(sequence_frame_stats),
            "frameStats": sequence_frame_stats,
            "artifacts": sequence_artifacts,
        }
        if isinstance(sequence_artifacts, dict) and sequence_artifacts.get("ok", False):
            full_sheet = sequence_artifacts.get("fullContactSheet", {})
            closeup_sheet = sequence_artifacts.get("closeupContactSheet", {})
            full_gif = sequence_artifacts.get("fullGif", {})
            closeup_gif = sequence_artifacts.get("closeupGif", {})
            mid_closeup = sequence_artifacts.get("midCloseup", {})
            if isinstance(full_sheet, dict) and full_sheet.get("path"):
                summary["artifacts"]["movementContactSheet"] = str(full_sheet.get("path"))
            if isinstance(closeup_sheet, dict) and closeup_sheet.get("path"):
                summary["artifacts"]["movementUnitCloseupContactSheet"] = str(closeup_sheet.get("path"))
            if isinstance(full_gif, dict) and full_gif.get("path"):
                summary["artifacts"]["movementPreviewGif"] = str(full_gif.get("path"))
            if isinstance(closeup_gif, dict) and closeup_gif.get("path"):
                summary["artifacts"]["movementUnitCloseupGif"] = str(closeup_gif.get("path"))
            if isinstance(mid_closeup, dict) and mid_closeup.get("path"):
                summary["artifacts"]["movementUnitCloseupMid"] = str(mid_closeup.get("path"))
        backend_process_tree_cleanup_ok = True
        backend_was_started_by_runner = started_backend
        if started_backend:
            cleanup_result = _cleanup_started_backend_process_tree(backend_process, backend_log_path)
            started_backend = False
            summary["backendProcessCleanup"] = cleanup_result
            summary["steps"].append({"name": "backend_process_tree_cleanup", **cleanup_result})
            backend_process_tree_cleanup_ok = bool(cleanup_result.get("ok", False))

        summary["ok"] = (
            return_code == 0
            and bool(godot_report.get("ok", False))
            and bool(screenshot_stats.get("ok", False))
            and bool(pre_close_screenshot_stats.get("ok", False))
            and bool(screenshot_visibility_gate.get("ok", False))
            and bool(pre_close_screenshot_visibility_gate.get("ok", False))
            and movement_sequence_ok
            and demo_story_mobile_landscape_smoke_ok
            and backend_process_tree_cleanup_ok
            and not contract_failures
        )
        if backend_was_started_by_runner:
            summary["notes"] = ["backend was started by this visual smoke command"]
        _write_json(summary_path, summary)
        _print_summary(summary)
        return 0 if bool(summary.get("ok", False)) else 1
    except Exception as exc:
        summary["ok"] = False
        summary["error"] = type(exc).__name__
        summary["message"] = str(exc)
        _write_json(summary_path, summary)
        _print_summary(summary)
        return 1
    finally:
        _terminate(godot_process)
        if started_backend:
            cleanup_result = _cleanup_started_backend_process_tree(backend_process, backend_log_path)
            summary["backendProcessCleanup"] = cleanup_result
            summary["steps"].append({"name": "backend_process_tree_cleanup", **cleanup_result})
            _write_json(summary_path, summary)


if __name__ == "__main__":
    raise SystemExit(main())
