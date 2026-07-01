extends RefCounted
class_name SlgUiComponentFactory

const DESIGN_SYSTEM_ID := "slg_gold_black_v1"
const DESIGN_TOKEN_SOURCE := "slg_ui_component_factory"
const DESIGN_TOKEN_VERSION := "tokens:v1"
const VISUAL_COLOR_RAMP := "gold_black"
const VISUAL_FONT_SCALE := "xs11_s13_m15_l18_xl24_xxl32"
const VISUAL_BUTTON_SCALE := "sm44_md56_lg72"
const VISUAL_PANEL_CHROME := "full_screen_panel_host_snapshot"
const VISUAL_SURFACE_TONE := "warm_lift_reading_v3"
const VISUAL_SURFACE_DENSITY := "soft_gold_borders_v1"
const VISUAL_CARD_DEPTH_TOKEN := "soft_gold_card_depth_v1"
const HERO_CARD_TOKEN_MODE := "hero_card_tokens:v1"
const HERO_CARD_COLOR_TOKEN_SET := "hero_card_gold_black_v1"
const HERO_CARD_LAYOUT_TOKEN_SET := "hero_card_full_preset_340x510_v1"
const HERO_CARD_PANEL_STYLE_TOKEN := "formal_pack_hero_card_panel"
const HERO_CARD_BUTTON_STYLE_TOKEN := "formal_pack_hero_card_button"
const HERO_CARD_FONT_BUCKET := "hero_card_compact_scale_v1"
const RECRUIT_FORMAL_PACK_ACTION_BUTTON_TOKEN := "recruit_formal_pack_action_button_v1"
const RECRUIT_FORMAL_PACK_RESOURCE_CHIP_TOKEN := "recruit_formal_pack_resource_chip_v1"
const RECRUIT_FORMAL_PACK_CORNER_BADGE_TOKEN := "recruit_formal_pack_corner_badge_v1"
const RECRUIT_FORMAL_PACK_EMPTY_PANEL_TOKEN := "recruit_formal_pack_empty_panel_v1"
const RECRUIT_FORMAL_PACK_PRICE_PLATE_TOKEN := "recruit_formal_pack_price_plate_v1"
const RECRUIT_FORMAL_PACK_HEADER_TOKEN := "recruit_formal_pack_header_v1"
const RECRUIT_FORMAL_PACK_SMALL_BADGE_TOKEN := "recruit_formal_pack_small_badge_v1"
const RECRUIT_FORMAL_PACK_STATE_LINE_TOKEN := "recruit_formal_pack_state_line_v1"
const CARD_RAIL_LAYOUT_TOKEN := "card_rail_touch_horizontal_v1"
const CARD_RAIL_SCROLL_MODE := "hidden_scrollbar_touch_horizontal_v1"
const CARD_RAIL_INPUT_MODE := "touch_mouse_horizontal_drag"
const CARD_RAIL_SCROLLBAR_VISIBILITY := "hidden"
const CARD_RAIL_REPEAT_ACTION_GAP := 34
const TOUCH_SCROLL_INPUT_MODE := "touch_mouse_drag_v1"
const TOUCH_SCROLLBAR_VISIBILITY := "hidden"
const GENERAL_ROSTER_RESPONSIVE_FLOW_TOKEN := "general_roster_responsive_flow_v1"
const GENERAL_ROSTER_RESPONSIVE_COLUMN_POLICY := "available_width_flow_v1"
const GENERAL_ROSTER_RESPONSIVE_MAX_COLUMNS := 5
const WORLD_EVENT_ACTIVITY_SHELL_TOKEN := "world_event_activity_shell_v1"
const SNAPSHOT_SECTION_ACTION_BUTTON_TOKEN := "snapshot_section_action_button_v1"
const SNAPSHOT_FEATURE_CARD_GRID_TOKEN := "snapshot_feature_card_showcase_grid_v1"
const SNAPSHOT_FEATURE_CARD_SHOWCASE_COMPOSITION_TOKEN := "snapshot_feature_card_showcase_composition_v1"
const SNAPSHOT_FEATURE_CARD_CHROME_TOKEN := "snapshot_feature_card_chrome_v1"
const SNAPSHOT_FEATURE_CARD_TITLE_BAR_TOKEN := "snapshot_feature_card_title_bar_v1"
const SNAPSHOT_FEATURE_CARD_PLACEHOLDER_TOKEN := "snapshot_feature_card_placeholder_v1"
const SNAPSHOT_FEATURE_CARD_RENDER_STATE_TOKEN := "snapshot_feature_card_render_state_v1"
const SNAPSHOT_FEATURE_CARD_CAPTION_ROW_TOKEN := "snapshot_feature_card_caption_row_v1"
const SNAPSHOT_FEATURE_CARD_IMAGE_SLOT_TOKEN := "snapshot_feature_card_image_slot_v1"
const SNAPSHOT_FEATURE_CARD_PLACEHOLDER_ART_TOKEN := "snapshot_feature_card_placeholder_art_v1"
const SNAPSHOT_FEATURE_CARD_ASSET_ROOT_TOKEN := "snapshot_feature_card_asset_roots_v1"
const SNAPSHOT_FEATURE_STATUS_CHIP_TOKEN := "snapshot_feature_status_chip_v1"
const MAINLINE_UI_MOTION_SYSTEM_TOKEN := "mainline_ui_motion_system_v1"
const STAGE_A_SHARED_MOTION_FEEDBACK_CHAIN_TOKEN := "stage_a_shared_motion_feedback_chain_v1"
const STAGE_A_SHARED_MOTION_PACKET_SCHEMA := "game_event|presentation_event|timeline|visual_step|audio_step|haptic_step|ui_step|controls_preserved|proof_level"
const MOTION_PAGE_ENTER_FADE_TOKEN := "page_enter_fade_v1"
const MOTION_PAGE_ENTER_LIFT_TOKEN := "page_enter_lift_v1"
const MOTION_CARD_STAGGER_ENTER_TOKEN := "card_stagger_enter_v1"
const MOTION_FOCUS_CTA_PULSE_TOKEN := "focus_cta_pulse_v1"
const MOTION_REWARD_GLOW_TOKEN := "reward_glow_v1"
const MOTION_MODAL_POP_TOKEN := "modal_pop_v1"
const MOTION_DISABLED_SOFT_STATE_TOKEN := "disabled_soft_state_v1"
const MOTION_ACTIVITY_UNFURL_TOKEN := "activity_unfurl_enter_v1"
const MOTION_ACTIVITY_SCROLL_UNFURL_TOKEN := "activity_scroll_unfurl_v2"
const MOTION_ACTIVITY_EMPTY_DROP_UNFURL_TOKEN := "activity_empty_drop_unfurl_v3"
const MOTION_RECRUIT_PACK_ENTER_TOKEN := "recruit_pack_enter_v1"
const MOTION_RECRUIT_HERO_CARD_ENTER_TOKEN := "recruit_hero_card_enter_v1"
const MOTION_RECRUIT_DRAW_FEEDBACK_CHAIN_TOKEN := "recruit_draw_feedback_chain_v1"
const MOTION_RECRUIT_DRAW_CLICK_FEEDBACK_TOKEN := "recruit_draw_click_feedback_v1"
const MOTION_RECRUIT_DRAW_RESOURCE_PROMPT_TOKEN := "recruit_draw_resource_prompt_v1"
const MOTION_RECRUIT_DRAW_PACK_FRAME_TOKEN := "recruit_draw_pack_frame_v1"
const MOTION_RECRUIT_DRAW_REVEAL_TOKEN := "recruit_draw_reveal_v1"
const MOTION_RECRUIT_DRAW_QUALITY_SWEEP_TOKEN := "recruit_draw_quality_sweep_v1"
const MOTION_RECRUIT_DRAW_CONTINUE_CONFIRM_CONTROL_TOKEN := "recruit_draw_continue_confirm_control_v1"
const MOTION_RECRUIT_DRAW_PSEUDO_LIVE_STYLE_TOKEN := "whole_image_breathing_frame_sweep_glow_no_face_deform"
const MOTION_BATTLE_REPORT_ENTER_TOKEN := "battle_report_list_enter_v1"
const BATTLE_REPORT_FIRST_OPEN_STAMP_MOTION_TOKEN := "battle_report_first_open_stamp_motion_v1"
const MOTION_INTERIOR_SECTION_ENTER_TOKEN := "interior_section_enter_v1"
const MOTION_AI_CHAT_PANEL_ENTER_TOKEN := "ai_chat_panel_enter_v1"
const MOTION_GENERAL_PANEL_ENTER_TOKEN := "general_panel_enter_v1"
const MOTION_SKILL_LIBRARY_BROWSER_ENTER_TOKEN := "skill_library_browser_enter_v1"
const MOTION_TROOP_PANEL_ENTER_TOKEN := "troop_panel_enter_v1"
const MOTION_SNAPSHOT_EDGE_PAGE_ENTER_TOKEN := "snapshot_edge_page_enter_v1"
const ACTIVITY_MOTION_SAMPLE_TOKEN := "activity_motion_showcase_sample_v1"
const BATTLE_REPORT_SHELL_TOKEN := "battle_report_shell_v1"
const BATTLE_REPORT_SHELL_ICON_BUTTON_TOKEN := "battle_report_shell_icon_button_v1"
const BATTLE_REPORT_LIST_MODE_TAB_TOKEN := "battle_report_list_mode_tab_v1"
const BATTLE_REPORT_LIST_SUMMARY_TOKEN := "battle_report_list_summary_v1"
const BATTLE_REPORT_DETAIL_TAB_BUTTON_TOKEN := "battle_report_detail_tab_button_v1"
const BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN := "battle_report_detail_footer_button_v1"
const BATTLE_REPORT_DETAIL_EMPTY_BLOCK_TOKEN := "battle_report_detail_empty_block_v1"
const BATTLE_REPORT_DETAIL_VISUAL_STAGE_TOKEN := "battle_report_detail_game_stage_v2"
const BATTLE_REPORT_DETAIL_RESULT_FOCUS_TOKEN := "battle_report_detail_center_result_focus_v1"
const BATTLE_REPORT_DETAIL_TEAM_CARD_TOKEN := "battle_report_detail_opposed_army_card_v2"
const BATTLE_REPORT_DETAIL_REWARD_PANEL_TOKEN := "battle_report_detail_reward_replay_panel_v2"
const BATTLE_REPORT_DETAIL_TITLE_HIERARCHY_TOKEN := "battle_report_detail_title_hierarchy_v1"
const BATTLE_REPORT_DETAIL_TIME_MARKER_TOKEN := "battle_report_detail_time_marker_v1"
const BATTLE_REPORT_DETAIL_CARD_DENSITY_TOKEN := "battle_report_detail_card_density_v1"
const BATTLE_REPORT_DETAIL_CARD_COMPOSITION_TOKEN := "battle_report_detail_card_composition_v1"
const BATTLE_REPORT_DETAIL_AI_LIVING_FEEDBACK_TOKEN := "battle_report_detail_ai_living_feedback_v1"
const BATTLE_REPORT_DETAIL_AI_ACTIVITY_CONTINUITY_TOKEN := "battle_report_detail_ai_activity_continuity_v1"
const BATTLE_REPORT_DETAIL_META_ROWS_TOKEN := "battle_report_detail_meta_rows_v1"
const BATTLE_REPORT_COORDINATE_JUMP_BUTTON_TOKEN := "battle_report_coordinate_jump_button_v1"
const BATTLE_REPORT_COORDINATE_JUMP_PAYLOAD_CONTRACT := "battle_report_coordinate_jump_payload_coordinate_value_source_v1"
const BATTLE_REPORT_DETAIL_REWARD_COPY_MODE := "reward_only_no_summary_or_replay_v1"
const BATTLE_REPORT_DETAIL_HERO_INFO_MODE := "troop_and_level_only_no_skill_line_v1"
const BATTLE_REPORT_DETAIL_SEARCH_VISIBILITY_MODE := "detail_page_hides_header_search_v1"
const BATTLE_REPORT_LIST_UTILITY_TOKEN := "battle_report_list_utility_rail_v1"
const BATTLE_REPORT_EMPTY_STATE_TOKEN := "battle_report_empty_state_v1"
const MAIL_PANEL_LAYOUT_TOKEN := "mail_inbox_split_no_hero_v3"
const MAIL_PANEL_PRIMARY_BLOCK_KIND := "mail_inbox_split"
const MAIL_PANEL_VISUAL_QUALITY_GATE := "standalone_inbox_polished_snapshot_v1"
const MAIL_PANEL_DETAIL_PANE_MODE := "letter_detail_preview_v1"
const MAIL_PANEL_REWARD_STATUS_MODE := "status_only_no_claim_authority_v1"
const MAIL_PANEL_CATEGORY_FILTER_MODE := "system_rewards_and_current_organization_tabs_v2"
const MAIL_PANEL_HERO_STAT_COUNT := 0
const MAIL_PANEL_HEADER_COPY_MODE := "compact_split_inbox_no_hero_v3"
const MAIL_PANEL_TAB_UNREAD_BADGE_MODE := "panel_tab_badge_count_v1"
const MAIL_PANEL_ROW_SELECTION_MODE := "local_mail_row_select_detail_v1"
const MAIL_PANEL_ROW_SELECT_BUTTON_TOKEN := "mail_panel_row_select_button_v1"
const MAIL_PANEL_ROW_SELECT_LIVE_TEXT_CONTRACT := "mail_panel_row_select_live_text_v1"
const SETTINGS_ACTION_ROW_BUTTON_TOKEN := "settings_action_row_button_v1"
const SETTINGS_ACTION_ROW_LIVE_TEXT_CONTRACT := "settings_action_row_live_text_v1"
const MAIL_PANEL_TAB_TEXT_SIZE := 22
const MAIL_PANEL_SCROLL_MODE := "hidden_scrollbar_touch_mouse_drag_v1"
const MAIL_PANEL_DETAIL_WIDTH_BIAS_MODE := "detail_dominant_split_v1"
const MAIL_PANEL_LIST_PREVIEW_MODE := "fixed_height_clamped_preview_v1"
const MAIL_PANEL_REWARD_STRIP_PLACEMENT_MODE := "detail_lower_reward_band_v1"
const MAIL_PANEL_REWARD_CHIP_FONT_SIZE := 22
const MAIL_PANEL_REWARD_CHIP_MIN_HEIGHT := 50
const MAIL_PANEL_REWARD_CHIP_MIN_WIDTH := 168
const MAIL_PANEL_REWARD_STRIP_TOP_OFFSET := 24

static var _ui_texture_cache: Dictionary = {}
const BATTLE_REPORT_EMPTY_STATE_PREVIEW_TOKEN := "battle_report_empty_state_preview_v1"
const BATTLE_REPORT_LIST_CARD_TOKEN := "battle_report_list_card_v1"
const BATTLE_REPORT_LIST_CARD_HIERARCHY_TOKEN := "battle_report_list_card_result_first_hierarchy_v1"
const BATTLE_REPORT_LIST_CARD_SELECTED_STATE_TOKEN := "battle_report_list_card_selected_state_v1"
const BATTLE_REPORT_LIST_CARD_HEADER_TOKEN := "battle_report_list_card_header_v1"
const BATTLE_REPORT_LIST_CARD_BADGE_TOKEN := "battle_report_list_card_badge_v2"
const BATTLE_REPORT_LIST_HERO_CARD_READABILITY_TOKEN := "battle_report_list_hero_card_readability_v1"
const BATTLE_REPORT_LIST_STRUCTURE_BOX_TOKEN := "battle_report_list_structure_box_v1"
const BATTLE_REPORT_LIST_CARD_BODY_TOKEN := "battle_report_list_card_body_v1"
const BATTLE_REPORT_LIST_DETAIL_ENTRY_TOKEN := "battle_report_list_detail_entry_v1"
const BATTLE_REPORT_LIST_CARD_DOSSIER_DENSITY_TOKEN := "battle_report_list_card_dossier_density_v1"
const BATTLE_REPORT_AI_ACTION_RESULT_CARD_TOKEN := "battle_report_ai_action_result_card_v1"
const PORTRAIT_FRAME_FIT_CONTAINED_SAFE := "contained_safe"
const PORTRAIT_FRAME_FIT_COVER_CROP_NO_DEFORM := "cover_crop_no_deform"
const PORTRAIT_FRAME_ASSET_LOCKED_OR_DISPLAY_PREVIEW := "locked_preview_or_display_preview"
const PORTRAIT_FRAME_STAGE_ASPECT_CARD := "4:5"
const PORTRAIT_FRAME_SAFE_MARGIN_MEDIUM := "portrait_safe_margin_medium"
const PORTRAIT_FRAME_REGISTRY_ID := "portrait_asset_registry_v1"
const PORTRAIT_FRAME_LIST_THUMB_VARIANT := "list_thumb"
const PORTRAIT_FRAME_DETAIL_LARGE_VARIANT := "detail_large"
const PORTRAIT_FRAME_ROSTER_CARD_VARIANT := "roster_card"
const PORTRAIT_FRAME_HERO_CARD_VARIANT := "hero_card"
const PORTRAIT_FRAME_AVATAR_VARIANT := "avatar"
const GENERAL_SKILL_LIBRARY_TYPE_ORDER_TOKEN := "general_skill_library_type_order_v1"
const GENERAL_SKILL_LIBRARY_TYPE_ORDER := ["指挥", "主动", "被动", "追击"]
const GENERAL_SKILL_LIBRARY_INTERACTION_TOKEN := "general_skill_library_interaction_v1"
const GENERAL_SKILL_LIBRARY_SHOWCASE_HEADER_TOKEN := "general_skill_library_showcase_header_v1"
const GENERAL_SKILL_LIBRARY_SHOWCASE_FILTERS_TOKEN := "general_skill_library_showcase_filters_v1"
const GENERAL_SKILL_LIBRARY_SHOWCASE_FEATURE_PANEL_TOKEN := "general_skill_library_showcase_feature_panel_v1"
const GENERAL_SKILL_LIBRARY_SHOWCASE_FEATURE_TEXT_BUILDER_TOKEN := "general_skill_library_showcase_feature_text_builders_v1"
const GENERAL_SKILL_LIBRARY_SHOWCASE_FEATURE_EMPTY_TEXT_BUILDER_TOKEN := "general_skill_library_showcase_feature_empty_text_builders_v1"
const GENERAL_SKILL_LIBRARY_SHOWCASE_FEATURE_SECTION_RULE_TOKEN := "general_skill_library_showcase_feature_section_rule_v1"
const GENERAL_SKILL_LIBRARY_SHOWCASE_FEATURE_CHIP_ROW_TOKEN := "general_skill_library_showcase_feature_chip_row_v1"
const GENERAL_SKILL_LIBRARY_SHOWCASE_GALLERY_TOKEN := "general_skill_library_showcase_gallery_v1"
const GENERAL_SKILL_LIBRARY_SHOWCASE_CARD_LAYOUT_TOKEN := "general_skill_library_showcase_card_layout_v1"
const GENERAL_SKILL_LIBRARY_SHOWCASE_CARD_TEXT_BUILDER_TOKEN := "general_skill_library_showcase_card_text_builders_v1"
const GENERAL_SKILL_LIBRARY_CONTROL_BAND_TOKEN := "general_skill_library_control_band_v1"
const GENERAL_SKILL_LIBRARY_FILTER_ROW_TOKEN := "general_skill_library_filter_row_v1"
const GENERAL_SKILL_LIBRARY_SEARCH_ROW_TOKEN := "general_skill_library_search_row_v1"
const GENERAL_SKILL_LIBRARY_CARD_CHROME_TOKEN := "general_skill_library_card_chrome_v1"
const GENERAL_SKILL_LIBRARY_BADGE_PILL_TOKEN := "general_skill_library_badge_pill_v1"
const GENERAL_SKILL_LIBRARY_BADGE_PILL_TEXT_ROLE_TOKEN := "general_skill_library_badge_pill_text_roles_v1"
const GENERAL_SKILL_LIBRARY_SUMMARY_PILL_TEXT_ROLE_TOKEN := "general_skill_library_summary_pill_text_roles_v1"
const GENERAL_SKILL_LIBRARY_CARD_TEXT_TOKEN := "general_skill_library_card_text_v1"
const GENERAL_SKILL_LIBRARY_CARD_TEXT_ROLE_TOKEN := "general_skill_library_card_text_roles_v1"
const GENERAL_SKILL_LIBRARY_DECK_HEADER_TOKEN := "general_skill_library_deck_header_v1"
const GENERAL_SKILL_LIBRARY_DECK_BODY_TOKEN := "general_skill_library_deck_body_v1"
const GENERAL_SKILL_LIBRARY_DECK_CARD_LAYOUT_TOKEN := "general_skill_library_deck_card_layout_v1"
const GENERAL_SKILL_LIBRARY_DECK_CARD_SECTION_RULE_TOKEN := "general_skill_library_deck_card_section_rule_v1"
const GENERAL_SKILL_LIBRARY_DECK_CARD_TEXT_BUILDER_TOKEN := "general_skill_library_deck_card_text_builders_v1"
const GENERAL_SKILL_LIBRARY_RESULT_ROW_TOKEN := "general_skill_library_result_row_v1"
const GENERAL_SKILL_LIBRARY_RESULT_ROW_TEXT_ROLE_TOKEN := "general_skill_library_result_row_text_roles_v1"
const GENERAL_SKILL_LIBRARY_RESULT_ROW_TEXT_BUILDER_TOKEN := "general_skill_library_result_row_text_builders_v1"
const GENERAL_SKILL_LIBRARY_RESULT_SUMMARY_TOKEN := "general_skill_library_result_summary_v1"
const GENERAL_SKILL_LIBRARY_RESULT_SUMMARY_TEXT_ROLE_TOKEN := "general_skill_library_result_summary_text_roles_v1"
const GENERAL_SKILL_LIBRARY_RESULT_LIST_TOKEN := "general_skill_library_result_list_v1"
const GENERAL_SKILL_DETAIL_POPUP_LAYOUT_TOKEN := "general_skill_detail_popup_layout_v1"
const GENERAL_SKILL_DETAIL_POPUP_CLOSE_BUTTON_TOKEN := "general_skill_detail_popup_close_button_v1"
const GENERAL_SKILL_DETAIL_POPUP_FIELD_SUMMARY_TOKEN := "general_skill_detail_popup_field_summary_v1"
const GENERAL_PROFILE_TAB_STRIP_TOKEN := "general_profile_tab_strip_v1"
const GENERAL_PROFILE_TAB_BUTTON_TOKEN := "general_profile_tab_button_v1"
const GENERAL_PROFILE_BACK_BUTTON_TOKEN := "general_profile_back_button_v1"
const GENERAL_PROFILE_CLOSE_BUTTON_TOKEN := "general_profile_close_button_v1"
const CLOSE_BACK_BUTTON_SPEC_TOKEN := "close_back_button_spec_v1"
const GENERAL_PROFILE_STAGE_ACTION_BUTTON_TOKEN := "general_profile_stage_action_button_v1"
const GENERAL_PROFILE_ACTION_BG_TOKEN := "general_profile_action_bg_v1"
const SKILL_FILTER_CHIP_BG_TOKEN := "skill_filter_chip_bg_v1"
const RECRUIT_DRAW_COMMAND_BG_TOKEN := "recruit_draw_command_bg_v1"
const AI_PANEL_ACTION_COMMAND_BG_TOKEN := "ai_panel_action_command_bg_v1"
const CHAT_PAPER_ACTION_COMMAND_BG_TOKEN := "chat_paper_action_command_bg_v1"
const CHAT_AI_ACTIVITY_CONTINUITY_TOKEN := "chat_ai_activity_continuity_v1"
const AI_ACTIVITY_SAME_TRACE_CROSS_SURFACE_TOKEN := "ai_activity_same_trace_cross_surface_v1"
const AI_ACTIVITY_CARD_TRACE_CONTINUITY_RIBBON_TOKEN := "ai_activity_card_trace_continuity_ribbon_v1"
const AI_ACTIVITY_IDENTITY_CHIP_TOKEN := "ai_activity_identity_chip_v1"
const AI_ACTIVITY_CARRYING_TROOPS_CHIP_CONTRACT := "ai_activity_carrying_troops_chip_v1"
const GENERATED_TROOPS_ILLUSTRATION_SOURCE := "generated_troops_illustration_v1"
const GENERATED_TROOPS_INFANTRY_ILLUSTRATION_PATH := "res://assets/themes/slgclient/current/units/generated_troops/illustrations/foreground/infantry_unit_fg.png"
const GENERATED_TROOPS_ARCHER_ILLUSTRATION_PATH := "res://assets/themes/slgclient/current/units/generated_troops/illustrations/foreground/archer_unit_fg.png"
const GENERATED_TROOPS_CAVALRY_ILLUSTRATION_PATH := "res://assets/themes/slgclient/current/units/generated_troops/illustrations/foreground/cavalry_unit_fg.png"
const GENERATED_TROOPS_TRAP_CAMP_ILLUSTRATION_PATH := "res://assets/themes/slgclient/current/units/generated_troops/illustrations/foreground/xianzhenying_unit_fg.png"
const AI_AVATAR_STATUS_FRAME_FAMILY_CONTRACT := "ai_avatar_status_frame_family_v1"
const AI_AVATAR_STATUS_FRAME_ACTIVE_ASSET_PATH := "res://assets/themes/slgclient/current/ui/avatars/ai_avatar_status_frame_active_v1.png"
const AI_AVATAR_STATUS_FRAME_QUEUED_ASSET_PATH := "res://assets/themes/slgclient/current/ui/avatars/ai_avatar_status_frame_queued_v1.png"
const AI_AVATAR_STATUS_FRAME_FAILED_ASSET_PATH := "res://assets/themes/slgclient/current/ui/avatars/ai_avatar_status_frame_failed_v1.png"
const AI_AVATAR_INTENT_BADGE_COMBAT_ASSET_PATH := "res://assets/themes/slgclient/current/ui/avatars/ai_avatar_intent_badge_combat_v1.png"
const GENERAL_PROFILE_ATTRIBUTE_CHIP_TOKEN := "general_profile_attribute_chip_v1"
const GENERAL_PROFILE_SKILL_BUTTON_TOKEN := "general_profile_skill_button_v1"
const GENERAL_PROFILE_PROGRESS_LINE_TOKEN := "general_profile_progress_line_v1"
const GENERAL_PROFILE_SMALL_TAG_TOKEN := "general_profile_small_tag_v1"
const GENERAL_ROSTER_CLOSE_BUTTON_TOKEN := "general_roster_close_button_v1"
const GENERAL_ROSTER_DETAIL_BUTTON_TOKEN := "general_roster_detail_button_v1"
const GENERAL_TACTICS_SCHEME_TAB_TOKEN := "general_tactics_scheme_tab_v1"
const GENERAL_TACTICS_STEP_BUTTON_TOKEN := "general_tactics_step_button_v1"
const GENERAL_TACTICS_PREVIEW_ACTION_CHIP_TOKEN := "general_tactics_preview_action_chip_v1"
const GENERAL_TACTICS_STAT_TAG_TOKEN := "general_tactics_stat_tag_v1"
const GENERAL_TACTICS_SUMMARY_CARD_TOKEN := "general_tactics_summary_card_v1"
const GENERAL_GROWTH_ENTRY_CARD_TOKEN := "general_growth_entry_card_v1"
const GENERAL_GROWTH_TROOP_ARROW_BUTTON_TOKEN := "general_growth_troop_arrow_button_v1"
const GENERAL_GROWTH_TROOP_CHIP_TOKEN := "general_growth_troop_chip_v1"
const INTERIOR_BUILDING_TREE_GRAPH_TOKEN := "interior_building_tree_graph_v1"
const INTERIOR_BUILDING_TREE_NODE_CARD_TOKEN := "interior_building_tree_node_card_v2"
const INTERIOR_BUILDING_TREE_NODE_LABEL_STACK_TOKEN := "interior_building_tree_node_label_stack_v1"
const INTERIOR_BUILDING_TREE_CONNECTOR_TOKEN := "interior_building_tree_connector_v1"
const INTERIOR_BUILDING_UPGRADE_SHEET_TOKEN := "interior_building_upgrade_sheet_v1"
const INTERIOR_UPGRADE_SHEET_ACTION_STATE_TOKEN := "interior_upgrade_sheet_action_state_v1"
const MAIN_CITY_FACILITY_TREE_NODE_ICON_TOKEN := "main_city_facility_tree_node_icon_v1"
const MAIN_CITY_FACILITY_TREE_NODE_ASSET_TOKEN := "main_city_facility_tree_node_asset_v1"
const MAIN_CITY_FACILITY_TREE_CONNECTOR_LAYER_TOKEN := "main_city_facility_tree_connector_layer_v1"
const MAIN_CITY_FACILITY_TREE_CHROME_BUTTON_TOKEN := "main_city_facility_tree_chrome_button_v1"
const MAIN_CITY_FACILITY_TREE_ATMOSPHERE_TOKEN := "main_city_facility_tree_atmosphere_background_v2"
const MAIN_CITY_FACILITY_TREE_LINE_GRAPH_BACKDROP_TOKEN := "main_city_facility_tree_line_graph_backdrop_v1"
const MAIN_CITY_FACILITY_TREE_GRAPH_TONE_TOKEN := "main_city_facility_tree_soft_ink_graph_v1"
const MAIN_CITY_FACILITY_TREE_VISUAL_MODE_TOKEN := "line_graph_asset_nodes_v1"
const MAIN_CITY_FACILITY_TREE_VERTICAL_LAYOUT_TOKEN := "main_city_facility_tree_vertical_north_south_scroll_v1"
const MAIN_CITY_FACILITY_TREE_ASSET_SET_TOKEN := "main_city_facility_tree_asset_set_v4"
const MAIN_CITY_FACILITY_TREE_NODE_LABEL_MODE_TOKEN := "name_level_only_v1"
const MAIN_CITY_FACILITY_TREE_NODE_STATE_TOKEN := "main_city_facility_tree_node_state_v1"
const MAIN_CITY_FACILITY_TREE_LOCKED_NODE_TONE_TOKEN := "main_city_facility_tree_locked_node_tone_v1"
const MAIN_CITY_FACILITY_TREE_SCROLL_RHYTHM_TOKEN := "main_city_facility_tree_scroll_rhythm_v1"
const MAIN_CITY_FACILITY_TREE_BACKDROP_DECOR_TOKEN := "han_map_mist_backdrop_v1"
const MAIN_CITY_FACILITY_TREE_UPGRADE_DRAWER_TOKEN := "main_city_facility_tree_upgrade_drawer_v2"
const INTERIOR_FACILITY_NODE_HUB_TOKEN := "interior_facility_node_hub_v1"
const INTERIOR_BUILDING_GROUP_COPY_DENSITY_TOKEN := "interior_building_group_copy_density_v1"
const INTERIOR_HOME_LOBBY_TOKEN := "interior_home_lobby_v1"
const INTERIOR_HOME_ENTRY_BUTTON_TOKEN := "interior_home_entry_button_v1"
const INTERIOR_HOME_ENTRY_CHROME_CONVERGENCE_TOKEN := "interior_home_entry_chrome_convergence_v1"
const INTERIOR_HOME_BACKGROUND_TOKEN := "interior_home_lobby_background_v1"
const INTERIOR_HOME_RESOURCE_STRIP_TOKEN := "interior_home_resource_strip_v1"
const INTERIOR_SECONDARY_PAGE_TOKEN := "interior_secondary_page_v1"
const INTERIOR_SECONDARY_ATMOSPHERE_TOKEN := "interior_secondary_atmosphere_background_v1"
const INTERIOR_SECONDARY_CONSUMER_CARDS_TOKEN := "interior_secondary_consumer_cards_v1"
const INTERIOR_SECONDARY_CARD_CHROME_CONVERGENCE_TOKEN := "interior_secondary_card_chrome_convergence_v1"
const INTERIOR_MARKET_OVERVIEW_TOKEN := "interior_market_overview_cards_v1"
const INTERIOR_AFFAIRS_CARD_CHROME_CONVERGENCE_TOKEN := "interior_affairs_card_chrome_convergence_v1"
const MAIN_CITY_HUB_CARD_CHROME_TOKEN := "main_city_hub_card_chrome_v1"
const LAND_TILE_ACTION_HUD_SKIN_FAMILY := "BaseActionHudSkin"
const LAND_TILE_ACTION_HUD_VARIANT_RESOURCE := "land_resource"
const LAND_TILE_ACTION_HUD_ART_OWNER := "SlgUiComponentFactory + MainMapCellActionPanel"
const LAND_TILE_ACTION_HUD_BACKPLATE_TOKEN := "tile_action_hud_landscape_slg_min_visual_polish_v1"
const LAND_TILE_ACTION_HUD_PRIMARY_BUTTON_TOKEN := "tile_action_hud_expedition_primary_button_v1"
const FULLSCREEN_SHELL_CHROME_TOKEN := "fullscreen_shell_chrome_v2"
const FULLSCREEN_BACKDROP_COLOR := Color(0.125, 0.088, 0.048, 1.0)
const FULLSCREEN_PANEL_BG := Color(0.182, 0.124, 0.064, 0.960)
const FULLSCREEN_PANEL_BORDER := Color(0.86, 0.62, 0.30, 0.66)


static func make_panel(bg: Color, border: Color, radius: int = 4, border_width: int = 1) -> PanelContainer:
	var panel := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = border
	style.set_border_width_all(border_width)
	style.set_corner_radius_all(radius)
	panel.add_theme_stylebox_override("panel", style)
	return panel


static func make_margin(left: int, top: int, right: int, bottom: int) -> MarginContainer:
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", left)
	margin.add_theme_constant_override("margin_top", top)
	margin.add_theme_constant_override("margin_right", right)
	margin.add_theme_constant_override("margin_bottom", bottom)
	return margin


static func make_flat_panel_style(
	bg_color: Color,
	border_color: Color,
	border_width: int = 1,
	depth: int = 0,
	shadow_alpha: float = 0.0
) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg_color
	style.border_color = border_color
	style.set_border_width_all(border_width)
	style.set_corner_radius_all(6)
	if depth > 0:
		style.shadow_color = Color(0.45, 0.26, 0.08, shadow_alpha)
		style.shadow_size = depth
	style.content_margin_left = 14
	style.content_margin_top = 10
	style.content_margin_right = 14
	style.content_margin_bottom = 10
	return style


static func make_surface_panel_style(
	bg_color: Color,
	border_color: Color,
	border_width: int,
	corner_radius: int,
	depth: int = 0,
	shadow_alpha: float = 0.0
) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg_color
	style.border_color = border_color
	style.set_border_width_all(border_width)
	style.set_corner_radius_all(corner_radius)
	if depth > 0:
		style.shadow_color = Color(0.45, 0.26, 0.08, shadow_alpha)
		style.shadow_size = depth
	return style


static func land_tile_action_hud_skin_family() -> String:
	return LAND_TILE_ACTION_HUD_SKIN_FAMILY


static func land_tile_action_hud_variant_resource() -> String:
	return LAND_TILE_ACTION_HUD_VARIANT_RESOURCE


static func land_tile_action_hud_art_owner() -> String:
	return LAND_TILE_ACTION_HUD_ART_OWNER


static func land_tile_action_hud_backplate_token() -> String:
	return LAND_TILE_ACTION_HUD_BACKPLATE_TOKEN


static func land_tile_action_hud_primary_button_token() -> String:
	return LAND_TILE_ACTION_HUD_PRIMARY_BUTTON_TOKEN


static func make_land_tile_action_hud_panel_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.14, 0.105, 0.060, 0.90)
	style.border_color = Color(0.98, 0.72, 0.28, 0.96)
	style.set_border_width_all(2)
	style.set_corner_radius_all(8)
	style.content_margin_left = 10
	style.content_margin_top = 7
	style.content_margin_right = 10
	style.content_margin_bottom = 7
	style.shadow_color = Color(0.0, 0.0, 0.0, 0.36)
	style.shadow_size = 5
	return style


static func make_land_tile_action_hud_button_style(fill: Color, border: Color, pressed_offset: float = 0.0) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(2)
	style.set_corner_radius_all(7)
	style.content_margin_left = 20
	style.content_margin_top = 9 + pressed_offset
	style.content_margin_right = 20
	style.content_margin_bottom = maxf(4.0, 9.0 - pressed_offset)
	return style


static func apply_land_tile_action_hud_primary_button_style(button: Button) -> void:
	if button == null:
		return
	button.custom_minimum_size = Vector2(maxf(button.custom_minimum_size.x, 152.0), maxf(button.custom_minimum_size.y, 54.0))
	button.add_theme_font_size_override("font_size", 21)
	button.add_theme_stylebox_override("normal", make_land_tile_action_hud_button_style(Color(0.72, 0.39, 0.12, 0.96), Color(1.0, 0.78, 0.36, 0.96)))
	button.add_theme_stylebox_override("hover", make_land_tile_action_hud_button_style(Color(0.86, 0.49, 0.16, 0.98), Color(1.0, 0.86, 0.46, 1.0)))
	button.add_theme_stylebox_override("pressed", make_land_tile_action_hud_button_style(Color(0.56, 0.28, 0.08, 0.98), Color(0.95, 0.62, 0.24, 1.0), 2.0))
	button.add_theme_stylebox_override("focus", make_land_tile_action_hud_button_style(Color(0.84, 0.48, 0.15, 0.98), Color(1.0, 0.88, 0.52, 1.0)))
	button.add_theme_stylebox_override("disabled", make_land_tile_action_hud_button_style(Color(0.34, 0.27, 0.18, 0.88), Color(0.62, 0.50, 0.34, 0.82)))
	button.add_theme_color_override("font_color", Color(1.0, 0.93, 0.72, 1.0))
	button.add_theme_color_override("font_hover_color", Color(1.0, 0.96, 0.78, 1.0))
	button.add_theme_color_override("font_pressed_color", Color(1.0, 0.82, 0.48, 1.0))
	button.add_theme_color_override("font_disabled_color", Color(0.70, 0.64, 0.52, 1.0))
	button.set_meta("tile_action_hud_primary_button_token", land_tile_action_hud_primary_button_token())
	button.set_meta("tile_action_hud_style_owner", land_tile_action_hud_art_owner())


static func mail_panel_layout_token() -> String:
	return MAIL_PANEL_LAYOUT_TOKEN


static func mail_panel_primary_block_kind() -> String:
	return MAIL_PANEL_PRIMARY_BLOCK_KIND


static func mail_panel_visual_quality_gate() -> String:
	return MAIL_PANEL_VISUAL_QUALITY_GATE


static func mail_panel_detail_pane_mode() -> String:
	return MAIL_PANEL_DETAIL_PANE_MODE


static func mail_panel_reward_status_mode() -> String:
	return MAIL_PANEL_REWARD_STATUS_MODE


static func mail_panel_category_filter_mode() -> String:
	return MAIL_PANEL_CATEGORY_FILTER_MODE


static func mail_panel_header_copy_mode() -> String:
	return MAIL_PANEL_HEADER_COPY_MODE


static func mail_panel_tab_unread_badge_mode() -> String:
	return MAIL_PANEL_TAB_UNREAD_BADGE_MODE


static func mail_panel_row_selection_mode() -> String:
	return MAIL_PANEL_ROW_SELECTION_MODE


static func mail_panel_row_select_button_token() -> String:
	return MAIL_PANEL_ROW_SELECT_BUTTON_TOKEN


static func mail_panel_row_select_live_text_contract() -> String:
	return MAIL_PANEL_ROW_SELECT_LIVE_TEXT_CONTRACT


static func settings_action_row_button_token() -> String:
	return SETTINGS_ACTION_ROW_BUTTON_TOKEN


static func settings_action_row_live_text_contract() -> String:
	return SETTINGS_ACTION_ROW_LIVE_TEXT_CONTRACT


static func is_settings_panel_action_id(action_id: String) -> bool:
	var normalized := action_id.strip_edges()
	return (
		normalized.begins_with("display_")
		or normalized.begins_with("audio_")
		or normalized.begins_with("notice_")
		or normalized.begins_with("account_")
	)


static func mail_panel_tab_text_size() -> int:
	return MAIL_PANEL_TAB_TEXT_SIZE


static func mail_panel_scroll_mode() -> String:
	return MAIL_PANEL_SCROLL_MODE


static func mail_panel_detail_width_bias_mode() -> String:
	return MAIL_PANEL_DETAIL_WIDTH_BIAS_MODE


static func mail_panel_list_preview_mode() -> String:
	return MAIL_PANEL_LIST_PREVIEW_MODE


static func mail_panel_reward_strip_placement_mode() -> String:
	return MAIL_PANEL_REWARD_STRIP_PLACEMENT_MODE


static func mail_panel_reward_chip_font_size() -> int:
	return MAIL_PANEL_REWARD_CHIP_FONT_SIZE


static func mail_panel_reward_chip_min_height() -> int:
	return MAIL_PANEL_REWARD_CHIP_MIN_HEIGHT


static func mail_panel_reward_chip_min_width() -> int:
	return MAIL_PANEL_REWARD_CHIP_MIN_WIDTH


static func mail_panel_reward_strip_top_offset() -> int:
	return MAIL_PANEL_REWARD_STRIP_TOP_OFFSET


static func mail_panel_hero_stat_count() -> int:
	return MAIL_PANEL_HERO_STAT_COUNT


static func mail_panel_shell_min_height() -> float:
	return 632.0


static func mail_panel_list_min_width() -> float:
	return 420.0


static func mail_panel_detail_min_width() -> float:
	return 720.0


static func make_mail_panel_surface_style(role: String) -> StyleBoxFlat:
	match role:
		"hero":
			return make_surface_panel_style(Color(0.192, 0.116, 0.046, 0.96), Color(0.95, 0.66, 0.26, 0.72), 1, 6, 12, 0.20)
		"list":
			return make_surface_panel_style(Color(0.112, 0.078, 0.042, 0.92), Color(0.70, 0.48, 0.22, 0.44), 1, 5, 6, 0.12)
		"detail":
			return make_surface_panel_style(Color(0.232, 0.154, 0.070, 0.96), Color(0.94, 0.66, 0.30, 0.64), 1, 6, 10, 0.18)
		"row_selected":
			return make_surface_panel_style(Color(0.260, 0.174, 0.076, 0.98), Color(0.96, 0.72, 0.34, 0.82), 1, 4, 5, 0.14)
		"row":
			return make_surface_panel_style(Color(0.146, 0.098, 0.052, 0.86), Color(0.58, 0.40, 0.20, 0.48), 1, 4)
		"stat":
			return make_surface_panel_style(Color(0.096, 0.070, 0.040, 0.74), Color(0.80, 0.58, 0.28, 0.46), 1, 4)
		"chip_claimable":
			return make_surface_panel_style(Color(0.78, 0.58, 0.18, 0.92), Color(1.00, 0.86, 0.42, 0.82), 1, 4)
		"chip_unread":
			return make_surface_panel_style(Color(0.36, 0.20, 0.12, 0.90), Color(0.94, 0.50, 0.30, 0.74), 1, 4)
		"chip_quiet":
			return make_surface_panel_style(Color(0.16, 0.14, 0.12, 0.72), Color(0.58, 0.52, 0.42, 0.42), 1, 4)
		"letter":
			return make_surface_panel_style(Color(0.302, 0.208, 0.102, 0.94), Color(0.94, 0.70, 0.38, 0.50), 1, 5)
		_:
			return make_surface_panel_style(Color(0.150, 0.100, 0.052, 0.88), Color(0.68, 0.48, 0.24, 0.46), 1, 5)


static func make_sidebar_button_style(bg_color: Color, rail_color: Color, rail_width: int) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg_color
	style.border_color = rail_color
	style.set_border_width_all(0)
	style.border_width_left = rail_width
	style.set_corner_radius_all(6)
	style.content_margin_left = 14
	style.content_margin_top = 12
	style.content_margin_right = 12
	style.content_margin_bottom = 12
	return style


static func apply_portrait_frame_stage(stage: Control) -> void:
	if stage == null:
		return
	stage.clip_contents = false


static func apply_portrait_frame_texture(texture_rect: TextureRect) -> void:
	if texture_rect == null:
		return
	texture_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	texture_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	texture_rect.set_anchors_preset(Control.PRESET_FULL_RECT)


static func apply_battle_report_detail_portrait_frame_stage(stage: Control) -> void:
	if stage == null:
		return
	stage.clip_contents = true


static func apply_battle_report_detail_portrait_frame_texture(texture_rect: TextureRect) -> void:
	if texture_rect == null:
		return
	texture_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	texture_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	texture_rect.set_anchors_preset(Control.PRESET_FULL_RECT)


static func portrait_frame_display_strategy() -> Dictionary:
	return {
		"fit": PORTRAIT_FRAME_FIT_CONTAINED_SAFE,
		"stageAspect": PORTRAIT_FRAME_STAGE_ASPECT_CARD,
		"safeMargin": PORTRAIT_FRAME_SAFE_MARGIN_MEDIUM,
		"assetSource": PORTRAIT_FRAME_ASSET_LOCKED_OR_DISPLAY_PREVIEW,
	}


static func hero_portrait_asset_ref(hero_id: String, portrait_asset_key: String = "") -> Dictionary:
	var payload := {
		"assetKind": "hero_portrait",
		"heroId": hero_id.strip_edges(),
		"displayStrategy": portrait_frame_display_strategy(),
	}
	var normalized_key := portrait_asset_key.strip_edges()
	if normalized_key != "":
		payload["portraitAssetKey"] = normalized_key
	return payload


static func battle_report_portrait_asset_ref(
	asset_kind: String,
	hero_id: String = "",
	portrait_asset_key: String = "",
	portrait_key: String = "",
	avatar_key: String = "",
	asset_key: String = ""
) -> Dictionary:
	var normalized_kind := asset_kind.strip_edges()
	if normalized_kind == "":
		normalized_kind = "hero"
	var payload := {
		"assetKind": normalized_kind,
		"displayStrategy": portrait_frame_display_strategy(),
	}
	var normalized_hero_id := hero_id.strip_edges()
	if normalized_hero_id != "":
		payload["heroId"] = normalized_hero_id
	var normalized_portrait_asset_key := portrait_asset_key.strip_edges()
	if normalized_portrait_asset_key != "":
		payload["portraitAssetKey"] = normalized_portrait_asset_key
	var normalized_portrait_key := portrait_key.strip_edges()
	if normalized_portrait_key != "":
		payload["portraitKey"] = normalized_portrait_key
	var normalized_avatar_key := avatar_key.strip_edges()
	if normalized_avatar_key != "":
		payload["avatarKey"] = normalized_avatar_key
	var normalized_asset_key := asset_key.strip_edges()
	if normalized_asset_key != "":
		payload["assetKey"] = normalized_asset_key
	return payload


static func hero_portrait_payload_from_entry(entry: Dictionary) -> Dictionary:
	var payload: Dictionary = {}
	var raw_asset_ref: Variant = entry.get("asset_ref", entry.get("assetRef", {}))
	if raw_asset_ref is Dictionary and not (raw_asset_ref as Dictionary).is_empty():
		payload = (raw_asset_ref as Dictionary).duplicate(true)
	var hero_id := _first_portrait_hero_id(entry)
	var portrait_asset_key := _first_non_empty_text(entry, ["portraitAssetKey", "portrait_asset_key", "asset_key", "assetKey"])
	if payload.size() == 0 and (hero_id != "" or portrait_asset_key != ""):
		payload = hero_portrait_asset_ref(hero_id, portrait_asset_key)
	else:
		if hero_id != "" and not _payload_has_non_empty_text(payload, ["heroId", "hero_id"]):
			payload["heroId"] = hero_id
		if portrait_asset_key != "" and not _payload_has_non_empty_text(payload, ["portraitAssetKey", "portrait_asset_key"]):
			payload["portraitAssetKey"] = portrait_asset_key
		if payload.size() > 0:
			if not payload.has("assetKind"):
				payload["assetKind"] = "hero_portrait"
			if not payload.has("displayStrategy"):
				payload["displayStrategy"] = portrait_frame_display_strategy()
	var portrait_key := _first_non_empty_text(entry, ["portraitKey", "portrait_key"])
	if portrait_key != "" and not _payload_has_non_empty_text(payload, ["portraitKey", "portrait_key"]):
		payload["portraitKey"] = portrait_key
	var avatar_key := _first_non_empty_text(entry, ["avatarKey", "avatar_key"])
	if avatar_key != "" and not _payload_has_non_empty_text(payload, ["avatarKey", "avatar_key"]):
		payload["avatarKey"] = avatar_key
	return payload


static func with_preview_hero_asset_ref(entry: Dictionary) -> Dictionary:
	var normalized := entry.duplicate(true)
	var payload := hero_portrait_payload_from_entry(normalized)
	if payload.is_empty():
		return normalized
	normalized["asset_ref"] = payload
	return normalized


static func _first_portrait_hero_id(entry: Dictionary) -> String:
	var explicit_hero_id := _first_non_empty_text(entry, ["heroId", "hero_id"])
	if _looks_like_portrait_hero_id(explicit_hero_id):
		return explicit_hero_id
	for field_variant in ["id", "heroTemplateId", "templateId", "template_id"]:
		var value := str(entry.get(str(field_variant), "")).strip_edges()
		if _looks_like_portrait_hero_id(value):
			return value
	return ""


static func _looks_like_portrait_hero_id(raw_value: String) -> bool:
	var value := raw_value.strip_edges()
	if value == "":
		return false
	if value == "hero_card":
		return false
	if value.begins_with("recruit_draw_result_"):
		return false
	var has_digit := false
	for index in range(value.length()):
		var code := value.unicode_at(index)
		if code >= 48 and code <= 57:
			has_digit = true
			break
	return has_digit


static func _first_non_empty_text(source: Dictionary, field_names: Array) -> String:
	for field_variant in field_names:
		var value := str(source.get(str(field_variant), "")).strip_edges()
		if value != "":
			return value
	return ""


static func _payload_has_non_empty_text(payload: Dictionary, field_names: Array) -> bool:
	for field_variant in field_names:
		if str(payload.get(str(field_variant), "")).strip_edges() != "":
			return true
	return false


static func apply_portrait_frame_summary(summary: Dictionary, key_prefix: String, variant: String) -> void:
	summary["%sPortraitFrameVariant" % key_prefix] = variant
	summary["%sPortraitFitMode" % key_prefix] = PORTRAIT_FRAME_FIT_CONTAINED_SAFE
	summary["%sPortraitAssetSource" % key_prefix] = PORTRAIT_FRAME_ASSET_LOCKED_OR_DISPLAY_PREVIEW
	summary["%sPortraitStageAspect" % key_prefix] = PORTRAIT_FRAME_STAGE_ASPECT_CARD
	summary["%sPortraitClipEnabled" % key_prefix] = false
	summary["%sPortraitSafeMargin" % key_prefix] = PORTRAIT_FRAME_SAFE_MARGIN_MEDIUM
	summary["%sPortraitRegistryId" % key_prefix] = PORTRAIT_FRAME_REGISTRY_ID


static func apply_battle_report_list_portrait_frame_summary(summary: Dictionary) -> void:
	apply_portrait_frame_summary(summary, "battleReportList", PORTRAIT_FRAME_LIST_THUMB_VARIANT)


static func apply_battle_report_detail_portrait_frame_summary(summary: Dictionary) -> void:
	apply_portrait_frame_summary(summary, "battleReportDetail", PORTRAIT_FRAME_DETAIL_LARGE_VARIANT)
	summary["battleReportDetailPortraitFitMode"] = PORTRAIT_FRAME_FIT_COVER_CROP_NO_DEFORM
	summary["battleReportDetailPortraitClipEnabled"] = true


static func apply_recruit_formal_pack_cover_stage(stage: Control) -> void:
	if stage == null:
		return
	stage.clip_contents = true


static func apply_recruit_formal_pack_cover_texture(texture_rect: TextureRect) -> void:
	if texture_rect == null:
		return
	texture_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	texture_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	texture_rect.set_anchors_preset(Control.PRESET_FULL_RECT)


static func make_snapshot_text_label(text: String, font_size: int) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", font_size)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return label


static func snapshot_section_action_button_min_height(player_reading_mode: bool = false) -> float:
	return 58.0 if player_reading_mode else 44.0


static func snapshot_section_action_button_min_width(player_reading_mode: bool = false) -> float:
	return 142.0 if player_reading_mode else 0.0


static func snapshot_section_action_button_font_size(player_reading_mode: bool = false, body_stacked: bool = false) -> int:
	if player_reading_mode:
		return 18
	return 15 if body_stacked else 14


static func recruit_formal_pack_action_button_size(size: Vector2 = Vector2(0, 62)) -> Vector2:
	var width := size.x
	var height := size.y
	if height <= 0:
		height = recruit_formal_pack_action_button_min_height()
	return Vector2(width, height)


static func recruit_formal_pack_action_button_min_height() -> float:
	return 62.0


static func recruit_formal_pack_action_button_font_size() -> int:
	return 20


static func recruit_formal_pack_repeat_button_size() -> Vector2:
	return Vector2(188, 50)


static func apply_recruit_formal_pack_action_button_style(button: Button, disabled: bool, size: Vector2 = Vector2(0, 62)) -> void:
	if button == null:
		return
	var prefix := internal_command_prefix_for_label(button.text)
	if prefix != "":
		button.text = ensure_internal_command_prefix(button.text, prefix)
	button.custom_minimum_size = recruit_formal_pack_action_button_size(size)
	button.add_theme_font_size_override("font_size", recruit_formal_pack_action_button_font_size())
	button.clip_text = true
	button.alignment = HORIZONTAL_ALIGNMENT_CENTER
	button.set_meta("recruit_draw_command_bg_token", RECRUIT_DRAW_COMMAND_BG_TOKEN)
	apply_internal_command_button_style(
		button,
		Color(0.44, 0.100, 0.055, 0.96) if not disabled else Color(0.150, 0.135, 0.112, 0.90),
		Color(0.98, 0.74, 0.36, 0.96) if not disabled else Color(0.36, 0.32, 0.24, 0.72),
		Color(1.00, 0.88, 0.55, 1.0) if not disabled else Color(0.56, 0.54, 0.48, 0.86),
		Color(0.56, 0.54, 0.48, 0.86),
		5,
		2,
		12,
		6,
		0.04,
		0.08
	)


static func recruit_formal_pack_resource_chip_size() -> Vector2:
	return Vector2(128, 42)


static func recruit_formal_pack_resource_chip_title_font_size() -> int:
	return 14


static func recruit_formal_pack_resource_chip_value_font_size() -> int:
	return 18


static func recruit_formal_pack_corner_badge_size() -> Vector2:
	return Vector2(36, 32)


static func recruit_formal_pack_corner_badge_font_size() -> int:
	return 14


static func recruit_formal_pack_empty_panel_size() -> Vector2:
	return Vector2(420, 220)


static func recruit_formal_pack_empty_panel_title_font_size() -> int:
	return 24


static func recruit_formal_pack_empty_panel_body_font_size() -> int:
	return 14


static func recruit_formal_pack_price_plate_height() -> float:
	return 46.0


static func recruit_formal_pack_price_plate_margin_x() -> int:
	return 8


static func recruit_formal_pack_price_plate_margin_y() -> int:
	return 5


static func recruit_formal_pack_price_plate_footer_separation() -> int:
	return 7


static func recruit_formal_pack_price_plate_cost_font_size() -> int:
	return 21


static func recruit_formal_pack_price_plate_status_font_size() -> int:
	return 13


static func apply_recruit_formal_pack_price_plate_style(price_plate: PanelContainer) -> void:
	if price_plate == null:
		return
	price_plate.custom_minimum_size = Vector2(
		price_plate.custom_minimum_size.x,
		maxf(price_plate.custom_minimum_size.y, recruit_formal_pack_price_plate_height())
	)


static func make_recruit_formal_pack_price_plate_margin() -> MarginContainer:
	var margin_x := recruit_formal_pack_price_plate_margin_x()
	var margin_y := recruit_formal_pack_price_plate_margin_y()
	return make_margin(margin_x, margin_y, margin_x, margin_y)


static func recruit_formal_pack_header_min_height() -> float:
	return 54.0


static func recruit_formal_pack_header_separation() -> int:
	return 12


static func recruit_formal_pack_header_title_font_size() -> int:
	return 32


static func recruit_formal_pack_header_status_font_size() -> int:
	return 16


static func apply_recruit_formal_pack_header_style(header: HBoxContainer) -> void:
	if header == null:
		return
	header.custom_minimum_size = Vector2(
		header.custom_minimum_size.x,
		maxf(header.custom_minimum_size.y, recruit_formal_pack_header_min_height())
	)
	header.add_theme_constant_override("separation", recruit_formal_pack_header_separation())


static func recruit_formal_pack_small_badge_margin_x() -> int:
	return 7


static func recruit_formal_pack_small_badge_margin_y() -> int:
	return 3


static func recruit_formal_pack_small_badge_font_size() -> int:
	return 13


static func make_recruit_formal_pack_small_badge_margin() -> MarginContainer:
	var margin_x := recruit_formal_pack_small_badge_margin_x()
	var margin_y := recruit_formal_pack_small_badge_margin_y()
	return make_margin(margin_x, margin_y, margin_x, margin_y)


static func recruit_formal_pack_state_line_separation() -> int:
	return 8


static func recruit_formal_pack_state_line_title_font_size() -> int:
	return 14


static func recruit_formal_pack_state_line_value_font_size() -> int:
	return 14


static func apply_recruit_formal_pack_state_line_style(row: HBoxContainer) -> void:
	if row == null:
		return
	row.add_theme_constant_override("separation", recruit_formal_pack_state_line_separation())


static func apply_snapshot_section_action_button_reading_style(button: Button) -> void:
	if button == null:
		return
	button.add_theme_color_override("font_color", Color(0.96, 0.93, 0.84, 1.0))
	button.add_theme_color_override("font_hover_color", Color(1.0, 0.96, 0.84, 1.0))
	button.add_theme_color_override("font_disabled_color", Color(0.52, 0.52, 0.55, 0.92))
	button.add_theme_stylebox_override("normal", make_flat_panel_style(Color(0.300, 0.205, 0.095, 0.96), Color(0.86, 0.62, 0.28, 0.94), 1, 6, 0.18))
	button.add_theme_stylebox_override("hover", make_flat_panel_style(Color(0.350, 0.250, 0.130, 0.98), Color(0.98, 0.74, 0.36, 1.0), 1, 8, 0.22))
	button.add_theme_stylebox_override("pressed", make_flat_panel_style(Color(0.240, 0.170, 0.082, 0.98), Color(1.00, 0.78, 0.38, 1.0), 2, 3, 0.14))
	button.add_theme_stylebox_override("disabled", make_flat_panel_style(Color(0.14, 0.12, 0.10, 0.70), Color(0.34, 0.28, 0.22, 0.74), 1))
	button.add_theme_stylebox_override("focus", StyleBoxEmpty.new())


static func is_ai_panel_action_id(action_id: String) -> bool:
	var normalized := action_id.strip_edges()
	return normalized.begins_with("ai_") or normalized.begins_with("autonomy_")


static func ai_panel_command_prefix_for_action(action_id: String, text: String) -> String:
	var normalized_id := action_id.strip_edges()
	var label := text.split("\n")[0].strip_edges()
	if normalized_id == "ai_players_refresh" or label == "刷新" or label == "看看近况":
		return "↺"
	if normalized_id == "ai_player_open_chat_channel":
		return "信"
	if normalized_id.begins_with("ai_sidebar_open:"):
		return ""
	if normalized_id.find("home_city") >= 0 or label.find("主城") >= 0:
		return "令"
	if normalized_id.begins_with("autonomy_"):
		return "策"
	if normalized_id.find("avatar") >= 0 or normalized_id.find("context_document") >= 0 or normalized_id.find("display_name") >= 0:
		return "档"
	if normalized_id.begins_with("ai_player_proposal_approve:") or normalized_id.begins_with("ai_player_proposal_reject:"):
		return ""
	if normalized_id.find("proposal") >= 0 or label.find("处理") >= 0:
		return "!"
	return "令"


static func apply_ai_panel_action_button_style(button: Button, action_id: String, is_disabled: bool = false) -> void:
	if button == null:
		return
	button.set_meta("ai_panel_action_command_bg_token", AI_PANEL_ACTION_COMMAND_BG_TOKEN)
	button.set_meta("ai_panel_action_id", action_id.strip_edges())
	button.custom_minimum_size = Vector2(
		maxf(button.custom_minimum_size.x, 148.0),
		maxf(button.custom_minimum_size.y, 58.0)
	)
	button.add_theme_font_size_override("font_size", 18)
	apply_internal_command_button_style(
		button,
		Color(0.118, 0.088, 0.052, 0.96),
		Color(0.88, 0.64, 0.26, 0.96),
		Color(1.0, 0.93, 0.74, 1.0),
		Color(0.58, 0.52, 0.42, 0.84),
		4,
		1,
		14,
		9,
		0.05,
		0.09
	)
	button.add_theme_color_override("font_outline_color", Color(0.02, 0.015, 0.010, 0.82))
	button.add_theme_constant_override("outline_size", 1)
	button.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	var prefix := ai_panel_command_prefix_for_action(action_id, button.text)
	button.text = ensure_internal_command_prefix(button.text, prefix)
	if is_disabled:
		button.disabled = true


static func snapshot_feature_status_chip_margin_x() -> int:
	return 4


static func snapshot_feature_status_chip_margin_y() -> int:
	return 1


static func snapshot_feature_status_chip_font_size() -> int:
	return 8


static func snapshot_feature_status_chip_font_color(is_empty: bool) -> Color:
	return Color(0.52, 0.52, 0.54, 0.82) if is_empty else Color(0.88, 0.82, 0.66, 0.86)


static func apply_snapshot_task_action_button_style(button: Button) -> void:
	if button == null:
		return
	button.add_theme_color_override("font_color", Color(0.18, 0.16, 0.13, 0.98))
	button.add_theme_color_override("font_hover_color", Color(0.12, 0.10, 0.08, 0.98))
	button.add_theme_color_override("font_pressed_color", Color(0.12, 0.10, 0.08, 0.98))
	button.add_theme_color_override("font_disabled_color", Color(0.54, 0.54, 0.56, 0.78))
	button.add_theme_stylebox_override("normal", make_flat_panel_style(Color(0.82, 0.80, 0.73, 0.84), Color(0.56, 0.51, 0.42, 0.24), 1))
	button.add_theme_stylebox_override("hover", make_flat_panel_style(Color(0.88, 0.86, 0.79, 0.90), Color(0.70, 0.62, 0.44, 0.36), 1))
	button.add_theme_stylebox_override("pressed", make_flat_panel_style(Color(0.74, 0.71, 0.64, 0.88), Color(0.64, 0.56, 0.38, 0.42), 1))
	button.add_theme_stylebox_override("disabled", make_flat_panel_style(Color(0.14, 0.14, 0.15, 0.70), Color(0.22, 0.22, 0.24, 0.70), 1))
	button.add_theme_stylebox_override("focus", StyleBoxEmpty.new())


static func apply_snapshot_faction_table_button_style(button: Button) -> void:
	if button == null:
		return
	button.add_theme_color_override("font_color", Color(0.94, 0.92, 0.84, 1.0))
	button.add_theme_color_override("font_hover_color", Color(1.0, 0.95, 0.80, 1.0))
	button.add_theme_stylebox_override("normal", make_flat_panel_style(Color(0.075, 0.075, 0.080, 0.92), Color(0.16, 0.16, 0.18, 0.82), 1))
	button.add_theme_stylebox_override("hover", make_flat_panel_style(Color(0.12, 0.10, 0.08, 0.96), Color(0.58, 0.46, 0.24, 0.92), 1))
	button.add_theme_stylebox_override("pressed", make_flat_panel_style(Color(0.16, 0.12, 0.08, 0.96), Color(0.74, 0.56, 0.28, 1.0), 1))
	button.add_theme_stylebox_override("focus", StyleBoxEmpty.new())


static func apply_snapshot_faction_abandon_button_style(button: Button) -> void:
	if button == null:
		return
	button.add_theme_color_override("font_disabled_color", Color(0.96, 0.46, 0.48, 0.84))
	button.add_theme_stylebox_override("disabled", make_flat_panel_style(Color(0.030, 0.030, 0.034, 0.94), Color(0.34, 0.12, 0.12, 0.88), 1))
	button.add_theme_stylebox_override("focus", StyleBoxEmpty.new())


static func apply_snapshot_faction_map_control_style(button: Button) -> void:
	if button == null:
		return
	button.add_theme_color_override("font_disabled_color", Color(0.90, 0.84, 0.62, 0.92))
	button.add_theme_stylebox_override("disabled", make_flat_panel_style(Color(0.035, 0.038, 0.038, 0.94), Color(0.38, 0.34, 0.24, 0.86), 1))
	button.add_theme_stylebox_override("focus", StyleBoxEmpty.new())


static func make_snapshot_feature_card_style(tone_color: Color, is_empty: bool, featured: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	if is_empty:
		style.bg_color = snapshot_feature_disabled_soft_panel_bg()
		style.border_color = snapshot_feature_disabled_soft_panel_border()
	else:
		style.bg_color = Color(0.075, 0.070, 0.065, 0.96) if featured else Color(0.068, 0.066, 0.070, 0.94)
		var border_color := tone_color
		border_color.a = 0.54
		style.border_color = border_color
	style.set_border_width_all(1)
	style.set_corner_radius_all(5)
	return style


static func snapshot_feature_card_uniform_min_height() -> int:
	return 244


static func snapshot_feature_card_showcase_featured_min_height() -> int:
	return 302


static func snapshot_feature_card_showcase_compact_min_height() -> int:
	return 244


static func snapshot_feature_card_showcase_side_columns() -> int:
	return 3


static func snapshot_feature_card_showcase_consumed_count() -> int:
	return 4


static func snapshot_feature_card_showcase_top_row_separation() -> int:
	return 12


static func snapshot_feature_card_showcase_featured_stretch_ratio() -> float:
	return 1.98


static func snapshot_feature_card_showcase_side_stretch_ratio() -> float:
	return 2.54


static func snapshot_feature_card_min_height(featured: bool, uniform_reusable_grid: bool) -> int:
	if uniform_reusable_grid:
		return snapshot_feature_card_uniform_min_height()
	return snapshot_feature_card_showcase_featured_min_height() if featured else snapshot_feature_card_showcase_compact_min_height()


static func snapshot_feature_card_uniform_width() -> int:
	return 336


static func snapshot_feature_card_uniform_gap() -> int:
	return 22


static func snapshot_feature_card_margin() -> int:
	return 8


static func snapshot_feature_card_uniform_image_height() -> int:
	return 176


static func snapshot_feature_card_uniform_title_bar_height() -> int:
	return 42


static func snapshot_feature_card_image_height(featured: bool, cover_mode: String = "", uniform_reusable_grid: bool = false) -> int:
	if uniform_reusable_grid:
		return snapshot_feature_card_uniform_image_height()
	if cover_mode == "asset_drop_cover":
		return 176 if featured else 164
	if cover_mode == "reserved_quiet_slot":
		return 286 if featured else 228
	return 190 if featured else 156


static func snapshot_feature_card_caption_bar_height(featured: bool) -> int:
	return 24 if featured else 20


static func snapshot_feature_card_caption_font_size(featured: bool) -> int:
	return 12 if featured else 11


static func snapshot_feature_card_title_bar_height(featured: bool, cover_mode: String = "", uniform_reusable_grid: bool = false) -> int:
	if uniform_reusable_grid:
		return snapshot_feature_card_uniform_title_bar_height()
	if cover_mode == "asset_drop_cover":
		return 44 if featured else 36
	if cover_mode == "reserved_quiet_slot":
		return 46 if featured else 44
	return 52 if featured else 42


static func snapshot_feature_card_title_font_size(featured: bool, cover_mode: String = "", uniform_reusable_grid: bool = false) -> int:
	if uniform_reusable_grid:
		return 18
	if cover_mode == "asset_drop_cover":
		return 19 if featured else 16
	return 22 if featured else 18


static func snapshot_feature_card_allowed_asset_roots() -> Array:
	return ["res://data/ui/world_event_activity_asset_drop/"]


static func snapshot_feature_card_recommended_asset_size() -> Vector2i:
	return Vector2i(1280, 720)


static func snapshot_feature_card_minimum_asset_size() -> Vector2i:
	return Vector2i(640, 360)


static func snapshot_feature_card_asset_aspect_ratio() -> String:
	return "16:9"


static func snapshot_feature_disabled_soft_panel_bg() -> Color:
	return Color(0.102, 0.088, 0.066, 0.40)


static func snapshot_feature_disabled_soft_panel_border() -> Color:
	return Color(0.58, 0.48, 0.30, 0.24)


static func snapshot_feature_disabled_soft_slot_bg() -> Color:
	return Color(0.118, 0.100, 0.070, 0.24)


static func snapshot_feature_disabled_soft_slot_border() -> Color:
	return Color(0.58, 0.48, 0.30, 0.12)


static func activity_feature_primary_cta_label() -> String:
	return "今日可领"


static func activity_feature_primary_cta_size() -> Vector2:
	return Vector2(108, 30)


static func activity_feature_primary_cta_font_size() -> int:
	return 14


static func activity_disabled_soft_title_text() -> String:
	return "即将开启"


static func activity_disabled_soft_subtitle_text() -> String:
	return "活动筹备中"


static func activity_disabled_soft_title_font_size(featured: bool) -> int:
	return 18 if featured else 15


static func activity_disabled_soft_subtitle_font_size(featured: bool) -> int:
	return 12 if featured else 10


static func mainline_ui_motion_tokens() -> Array:
	return [
		MOTION_PAGE_ENTER_FADE_TOKEN,
		MOTION_PAGE_ENTER_LIFT_TOKEN,
		MOTION_CARD_STAGGER_ENTER_TOKEN,
		MOTION_FOCUS_CTA_PULSE_TOKEN,
		MOTION_REWARD_GLOW_TOKEN,
		MOTION_MODAL_POP_TOKEN,
		MOTION_DISABLED_SOFT_STATE_TOKEN,
		MOTION_ACTIVITY_UNFURL_TOKEN,
		MOTION_ACTIVITY_SCROLL_UNFURL_TOKEN,
		MOTION_ACTIVITY_EMPTY_DROP_UNFURL_TOKEN,
		MOTION_RECRUIT_PACK_ENTER_TOKEN,
		MOTION_RECRUIT_HERO_CARD_ENTER_TOKEN,
		MOTION_BATTLE_REPORT_ENTER_TOKEN,
		BATTLE_REPORT_FIRST_OPEN_STAMP_MOTION_TOKEN,
		MOTION_INTERIOR_SECTION_ENTER_TOKEN,
		MOTION_AI_CHAT_PANEL_ENTER_TOKEN,
		MOTION_GENERAL_PANEL_ENTER_TOKEN,
		MOTION_SKILL_LIBRARY_BROWSER_ENTER_TOKEN,
		MOTION_TROOP_PANEL_ENTER_TOKEN,
		MOTION_SNAPSHOT_EDGE_PAGE_ENTER_TOKEN,
	]


static func motion_page_enter_duration() -> float:
	return 0.22


static func motion_page_lift_duration() -> float:
	return 0.26


static func motion_page_lift_offset() -> float:
	return 14.0


static func motion_card_enter_duration() -> float:
	return 0.20


static func motion_card_lift_offset() -> float:
	return 10.0


static func motion_card_stagger_delay(index: int) -> float:
	return minf(0.24, float(maxi(index, 0)) * 0.035)


static func motion_activity_unfurl_duration() -> float:
	return 0.96


static func motion_activity_unfurl_initial_scale_x() -> float:
	return 0.04


static func motion_activity_unfurl_lift_x() -> float:
	return -190.0


static func motion_activity_unfurl_drop_y() -> float:
	return -96.0


static func motion_activity_unfurl_initial_alpha() -> float:
	return 0.0


static func motion_activity_unfurl_base_delay() -> float:
	return 0.32


static func battle_report_first_open_stamp_motion_token() -> String:
	return BATTLE_REPORT_FIRST_OPEN_STAMP_MOTION_TOKEN


static func motion_activity_unfurl_stagger_delay(index: int) -> float:
	return motion_activity_unfurl_base_delay() + minf(0.66, float(maxi(index, 0)) * 0.11)


static func motion_recruit_enter_duration() -> float:
	return 0.48


static func motion_recruit_pack_enter_lift_y() -> float:
	return -72.0


static func motion_recruit_hero_card_enter_lift_y() -> float:
	return -92.0


static func motion_recruit_enter_stagger_delay(index: int) -> float:
	return minf(0.36, float(maxi(index, 0)) * 0.065)


static func motion_module_enter_duration() -> float:
	return 0.42


static func motion_module_enter_lift_y() -> float:
	return -38.0


static func motion_module_enter_stagger_delay(index: int) -> float:
	return minf(0.30, float(maxi(index, 0)) * 0.055)


static func motion_focus_pulse_duration() -> float:
	return 0.82


static func motion_focus_pulse_alpha() -> float:
	return 0.74


static func motion_focus_pulse_scale() -> Vector2:
	return Vector2(1.018, 1.018)


static func motion_reward_glow_alpha() -> float:
	return 0.18


static func motion_disabled_soft_alpha() -> float:
	return 0.88


static func apply_motion_page_enter(target: Control) -> void:
	if target == null or not target.is_inside_tree():
		return
	var base_position := target.position
	var color := target.modulate
	color.a = 0.0
	target.modulate = color
	target.position = base_position + Vector2(0.0, motion_page_lift_offset())
	var tween := target.create_tween()
	tween.set_parallel(true)
	tween.tween_property(target, "modulate:a", 1.0, motion_page_enter_duration()).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(target, "position", base_position, motion_page_lift_duration()).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)


static func apply_motion_card_stagger_enter(target: Control, index: int) -> void:
	if target == null or not target.is_inside_tree():
		return
	var base_position := target.position
	var delay := motion_card_stagger_delay(index)
	var color := target.modulate
	color.a = 0.0
	target.modulate = color
	target.position = base_position + Vector2(0.0, motion_card_lift_offset())
	var tween := target.create_tween()
	tween.set_parallel(true)
	tween.tween_property(target, "modulate:a", 1.0, motion_card_enter_duration()).set_delay(delay).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(target, "position", base_position, motion_card_enter_duration()).set_delay(delay).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)


static func apply_motion_activity_unfurl_enter(target: Control, index: int) -> void:
	if target == null or not target.is_inside_tree():
		return
	var base_position := target.position
	var base_scale := target.scale
	var delay := motion_activity_unfurl_stagger_delay(index)
	var color := target.modulate
	color.a = motion_activity_unfurl_initial_alpha()
	target.modulate = color
	target.pivot_offset = Vector2(0.0, target.size.y * 0.5)
	target.position = base_position + Vector2(motion_activity_unfurl_lift_x(), motion_activity_unfurl_drop_y())
	target.scale = Vector2(maxf(0.05, base_scale.x * motion_activity_unfurl_initial_scale_x()), base_scale.y)
	var tween := target.create_tween()
	tween.set_parallel(true)
	tween.tween_property(target, "modulate:a", 1.0, motion_activity_unfurl_duration()).set_delay(delay).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(target, "position", base_position, motion_activity_unfurl_duration()).set_delay(delay).set_trans(Tween.TRANS_QUINT).set_ease(Tween.EASE_OUT)
	tween.tween_property(target, "scale", base_scale, motion_activity_unfurl_duration()).set_delay(delay).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


static func apply_motion_activity_scroll_unfurl_enter(target: Control, index: int) -> void:
	apply_motion_activity_unfurl_enter(target, index)


static func apply_motion_activity_empty_drop_unfurl_enter(target: Control, index: int) -> void:
	apply_motion_activity_unfurl_enter(target, index)


static func apply_motion_recruit_pack_enter(target: Control, index: int) -> void:
	_apply_motion_recruit_enter_when_ready(target, index, motion_recruit_pack_enter_lift_y(), Vector2(0.96, 0.96), "recruit_pack_enter_bound")


static func apply_motion_recruit_hero_card_enter(target: Control, index: int) -> void:
	_apply_motion_recruit_enter_when_ready(target, index, motion_recruit_hero_card_enter_lift_y(), Vector2(0.92, 0.92), "recruit_hero_card_enter_bound")


static func apply_motion_recruit_draw_click_feedback(target: Control) -> void:
	if target == null:
		return
	target.set_meta("recruit_draw_click_feedback_token", MOTION_RECRUIT_DRAW_CLICK_FEEDBACK_TOKEN)
	target.set_meta("recruit_draw_click_feedback_scope", "recruit_draw_feedback_chain")
	target.set_meta("recruit_draw_click_feedback_bound", true)
	if not target.is_inside_tree():
		if not bool(target.get_meta("recruit_draw_click_feedback_tree_enter_bound", false)):
			target.set_meta("recruit_draw_click_feedback_tree_enter_bound", true)
			var enter_callable := func() -> void:
				apply_motion_recruit_draw_click_feedback(target)
			target.tree_entered.connect(enter_callable, CONNECT_ONE_SHOT)
		return
	if bool(target.get_meta("recruit_draw_click_feedback_started", false)):
		return
	target.set_meta("recruit_draw_click_feedback_started", true)
	var base_position := target.position
	var base_scale := target.scale
	var target_size := target.size
	if target_size == Vector2.ZERO:
		target_size = target.custom_minimum_size
	target.pivot_offset = target_size * 0.5
	var tween := target.create_tween()
	tween.set_parallel(true)
	tween.tween_property(target, "modulate:a", 0.92, 0.08).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tween.tween_property(target, "position", base_position + Vector2(0.0, 1.5), 0.08).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tween.tween_property(target, "scale", Vector2(base_scale.x * 0.985, base_scale.y * 0.985), 0.08).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	var settle := target.create_tween()
	settle.set_parallel(true)
	settle.set_delay(0.08)
	settle.tween_property(target, "modulate:a", 1.0, 0.12).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	settle.tween_property(target, "position", base_position, 0.12).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	settle.tween_property(target, "scale", base_scale, 0.12).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)


static func apply_motion_recruit_hero_card_reveal_pseudo_live(target: Control, index: int = 0) -> void:
	if target == null:
		return
	target.set_meta("recruit_draw_reveal_token", MOTION_RECRUIT_DRAW_REVEAL_TOKEN)
	target.set_meta("recruit_draw_quality_sweep_token", MOTION_RECRUIT_DRAW_QUALITY_SWEEP_TOKEN)
	target.set_meta("recruit_draw_pseudo_live_style_token", MOTION_RECRUIT_DRAW_PSEUDO_LIVE_STYLE_TOKEN)
	target.set_meta("recruit_draw_reveal_scope", "recruit_draw_result_preview")
	target.set_meta("recruit_draw_reveal_bound", true)
	if not target.is_inside_tree():
		if not bool(target.get_meta("recruit_draw_reveal_tree_enter_bound", false)):
			target.set_meta("recruit_draw_reveal_tree_enter_bound", true)
			var enter_callable := func() -> void:
				apply_motion_recruit_hero_card_reveal_pseudo_live(target, index)
			target.tree_entered.connect(enter_callable, CONNECT_ONE_SHOT)
		return
	if bool(target.get_meta("recruit_draw_reveal_started", false)):
		return
	target.set_meta("recruit_draw_reveal_started", true)
	var base_position := target.position
	var base_scale := target.scale
	var target_size := target.size
	if target_size == Vector2.ZERO:
		target_size = target.custom_minimum_size
	target.pivot_offset = target_size * 0.5
	if target is Control:
		(target as Control).clip_contents = true
	var color := target.modulate
	color.a = maxf(color.a, 0.94)
	target.modulate = color
	var sweep := target.get_node_or_null("RecruitRevealSweep")
	if sweep == null:
		sweep = ColorRect.new()
		sweep.name = "RecruitRevealSweep"
		sweep.mouse_filter = Control.MOUSE_FILTER_IGNORE
		(sweep as ColorRect).color = Color(0.980, 0.860, 0.330, 0.0)
		(sweep as Control).custom_minimum_size = Vector2(maxf(18.0, target_size.x * 0.12), target_size.y)
		(sweep as Control).position = Vector2(-(sweep as Control).custom_minimum_size.x, 0.0)
		(sweep as Control).z_index = 4
		target.add_child(sweep)
	var sweep_control := sweep as Control
	var sweep_width := maxf(18.0, sweep_control.custom_minimum_size.x)
	sweep_control.position = Vector2(-sweep_width, 0.0)
	var reveal_tween := target.create_tween()
	reveal_tween.set_parallel(true)
	var delay := motion_recruit_enter_stagger_delay(index)
	reveal_tween.tween_property(target, "modulate:a", 1.0, 0.20).set_delay(delay).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	reveal_tween.tween_property(target, "position", base_position, 0.20).set_delay(delay).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	reveal_tween.tween_property(target, "scale", Vector2(base_scale.x * 1.01, base_scale.y * 1.01), 0.20).set_delay(delay).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	reveal_tween.parallel().tween_property(sweep_control, "position:x", target_size.x + sweep_width, 0.32).set_delay(delay + 0.04).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	reveal_tween.parallel().tween_property(sweep_control, "modulate:a", 0.0, 0.32).set_delay(delay + 0.04).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	var settle_tween := target.create_tween()
	settle_tween.set_delay(delay + 0.20)
	settle_tween.tween_property(target, "scale", base_scale, 0.16).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
static func apply_motion_battle_report_enter(target: Control, index: int = 0) -> void:
	_apply_motion_module_enter_when_ready(target, index, "battle_report_motion_enter_bound")


static func apply_motion_battle_report_first_open_stamp(target: Control) -> void:
	if target == null:
		return
	target.set_meta("battle_report_first_open_stamp_motion_token", battle_report_first_open_stamp_motion_token())
	target.set_meta("battle_report_first_open_stamp_motion_scope", "battle_report_detail_first_open_stamp")
	target.set_meta("battle_report_first_open_stamp_motion_bound", true)
	if not target.is_inside_tree():
		if not bool(target.get_meta("battle_report_first_open_stamp_motion_tree_enter_bound", false)):
			target.set_meta("battle_report_first_open_stamp_motion_tree_enter_bound", true)
			var enter_callable := func() -> void:
				apply_motion_battle_report_first_open_stamp(target)
			target.tree_entered.connect(enter_callable, CONNECT_ONE_SHOT)
		return
	if bool(target.get_meta("battle_report_first_open_stamp_motion_started", false)):
		return
	target.set_meta("battle_report_first_open_stamp_motion_started", true)
	var base_position := target.position
	var base_scale := target.scale
	var target_size := target.size
	if target_size == Vector2.ZERO:
		target_size = target.custom_minimum_size
	target.pivot_offset = target_size * 0.5
	var color := target.modulate
	color.a = 0.0
	target.modulate = color
	target.position = base_position + Vector2(18.0, -18.0)
	target.scale = Vector2(base_scale.x * 1.08, base_scale.y * 1.08)
	var tween := target.create_tween()
	tween.set_parallel(true)
	tween.tween_property(target, "modulate:a", 1.0, 0.34).set_delay(0.10).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(target, "position", base_position, 0.34).set_delay(0.10).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(target, "scale", base_scale, 0.34).set_delay(0.10).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


static func apply_motion_interior_section_enter(target: Control, index: int = 0) -> void:
	_apply_motion_module_enter_when_ready(target, index, "interior_section_motion_enter_bound")


static func apply_motion_ai_chat_panel_enter(target: Control, index: int = 0) -> void:
	_apply_motion_module_enter_when_ready(target, index, "ai_chat_panel_motion_enter_bound")


static func apply_motion_general_panel_enter(target: Control, index: int = 0) -> void:
	_apply_motion_module_enter_when_ready(target, index, "general_panel_motion_enter_bound")


static func apply_motion_skill_library_browser_enter(target: Control, index: int = 0) -> void:
	_apply_motion_module_enter_when_ready(target, index, "skill_library_motion_enter_bound")


static func apply_motion_troop_panel_enter(target: Control, index: int = 0) -> void:
	_apply_motion_module_enter_when_ready(target, index, "troop_panel_motion_enter_bound")


static func apply_motion_snapshot_edge_page_enter(target: Control, index: int = 0) -> void:
	_apply_motion_module_enter_when_ready(target, index, "snapshot_edge_motion_enter_bound")


static func _apply_motion_recruit_enter_when_ready(target: Control, index: int, lift_y: float, initial_scale: Vector2, bound_meta_key: String) -> void:
	if target == null:
		return
	if not target.is_inside_tree():
		if not bool(target.get_meta(bound_meta_key, false)):
			target.set_meta(bound_meta_key, true)
			var enter_callable := func() -> void:
				_apply_motion_recruit_enter_when_ready(target, index, lift_y, initial_scale, bound_meta_key)
			target.tree_entered.connect(enter_callable, CONNECT_ONE_SHOT)
		return
	var base_position := target.position
	var base_scale := target.scale
	var target_size := target.size
	if target_size == Vector2.ZERO:
		target_size = target.custom_minimum_size
	target.pivot_offset = target_size * 0.5
	var color := target.modulate
	color.a = 0.0
	target.modulate = color
	target.position = base_position + Vector2(0.0, lift_y)
	target.scale = Vector2(base_scale.x * initial_scale.x, base_scale.y * initial_scale.y)
	var tween := target.create_tween()
	tween.set_parallel(true)
	var delay := motion_recruit_enter_stagger_delay(index)
	tween.tween_property(target, "modulate:a", 1.0, motion_recruit_enter_duration()).set_delay(delay).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(target, "position", base_position, motion_recruit_enter_duration()).set_delay(delay).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(target, "scale", base_scale, motion_recruit_enter_duration()).set_delay(delay).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


static func _apply_motion_module_enter_when_ready(target: Control, index: int, bound_meta_key: String) -> void:
	if target == null:
		return
	if not target.is_inside_tree():
		if not bool(target.get_meta(bound_meta_key, false)):
			target.set_meta(bound_meta_key, true)
			var enter_callable := func() -> void:
				_apply_motion_module_enter_when_ready(target, index, bound_meta_key)
			target.tree_entered.connect(enter_callable, CONNECT_ONE_SHOT)
		return
	var started_meta_key := "%s_started" % bound_meta_key
	if bool(target.get_meta(started_meta_key, false)):
		return
	target.set_meta(started_meta_key, true)
	var base_position := target.position
	var base_scale := target.scale
	var target_size := target.size
	if target_size == Vector2.ZERO:
		target_size = target.custom_minimum_size
	target.pivot_offset = target_size * 0.5
	var color := target.modulate
	color.a = 0.0
	target.modulate = color
	target.position = base_position + Vector2(0.0, motion_module_enter_lift_y())
	target.scale = Vector2(base_scale.x * 0.98, base_scale.y * 0.98)
	var tween := target.create_tween()
	tween.set_parallel(true)
	var delay := motion_module_enter_stagger_delay(index)
	tween.tween_property(target, "modulate:a", 1.0, motion_module_enter_duration()).set_delay(delay).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(target, "position", base_position, motion_module_enter_duration()).set_delay(delay).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(target, "scale", base_scale, motion_module_enter_duration()).set_delay(delay).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


static func apply_motion_focus_cta_pulse(target: Control) -> void:
	if target == null or not target.is_inside_tree():
		return
	target.pivot_offset = activity_feature_primary_cta_size() * 0.5
	var tween := target.create_tween()
	tween.set_loops()
	tween.tween_property(target, "modulate:a", motion_focus_pulse_alpha(), motion_focus_pulse_duration()).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.parallel().tween_property(target, "scale", motion_focus_pulse_scale(), motion_focus_pulse_duration()).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(target, "modulate:a", 1.0, motion_focus_pulse_duration()).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.parallel().tween_property(target, "scale", Vector2.ONE, motion_focus_pulse_duration()).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)


static func apply_motion_reward_glow(target: CanvasItem) -> void:
	if target == null or not target.is_inside_tree():
		return
	var tween := target.create_tween()
	tween.set_loops()
	tween.tween_property(target, "modulate:a", motion_reward_glow_alpha(), motion_focus_pulse_duration()).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(target, "modulate:a", 0.06, motion_focus_pulse_duration()).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)


static func apply_motion_disabled_soft_state(target: CanvasItem) -> void:
	if target == null:
		return
	var color := target.modulate
	color.a = minf(color.a, motion_disabled_soft_alpha())
	target.modulate = color


static func cached_ui_texture(path: String) -> Texture2D:
	var normalized_path := path.strip_edges()
	if normalized_path == "":
		return null
	if _ui_texture_cache.has(normalized_path):
		var cached_variant: Variant = _ui_texture_cache.get(normalized_path)
		if cached_variant is Texture2D:
			return cached_variant as Texture2D
	if normalized_path.begins_with("res://") and ResourceLoader.exists(normalized_path) and _can_load_texture_resource_without_import_cache_error(normalized_path):
		var resource := ResourceLoader.load(normalized_path)
		if resource is Texture2D:
			_ui_texture_cache[normalized_path] = resource
			return resource as Texture2D
	var image_path := normalized_path
	if normalized_path.begins_with("res://"):
		image_path = ProjectSettings.globalize_path(normalized_path)
	if FileAccess.file_exists(image_path):
		var image := Image.new()
		if image.load(image_path) == OK:
			var texture := ImageTexture.create_from_image(image)
			_ui_texture_cache[normalized_path] = texture
			return texture
	return null


static func _can_load_texture_resource_without_import_cache_error(texture_path: String) -> bool:
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


static func prewarm_activity_feature_card_textures_from_snapshot(snapshot: Dictionary) -> Dictionary:
	var paths: Array[String] = []
	var sections_variant: Variant = snapshot.get("sections", {})
	if sections_variant is Dictionary:
		var sections := sections_variant as Dictionary
		var activity_section_variant: Variant = sections.get("activities", {})
		if activity_section_variant is Dictionary:
			_collect_activity_feature_card_texture_paths(activity_section_variant as Dictionary, paths)
	var attempted := 0
	var prewarmed := 0
	var failed := 0
	for path in paths:
		attempted += 1
		if cached_ui_texture(path) != null:
			prewarmed += 1
		else:
			failed += 1
	return {
		"activityMotionPrewarmMode": "snapshot_asset_texture_prewarm_before_render_v1",
		"activityMotionPrewarmBeforeContentBuild": true,
		"activityMotionPrewarmScope": "activity_feature_card_image_path_textures",
		"activityMotionPrewarmAttemptedAssetCount": attempted,
		"activityMotionPrewarmedAssetCount": prewarmed,
		"activityMotionPrewarmFailedCount": failed,
	}


static func _collect_activity_feature_card_texture_paths(section: Dictionary, paths: Array[String]) -> void:
	var content_blocks_variant: Variant = section.get("content_blocks", [])
	if not (content_blocks_variant is Array):
		return
	for block_variant in content_blocks_variant as Array:
		if not (block_variant is Dictionary):
			continue
		var block := block_variant as Dictionary
		var cards_variant: Variant = block.get("cards", [])
		if not (cards_variant is Array):
			continue
		for card_variant in cards_variant as Array:
			if not (card_variant is Dictionary):
				continue
			var card := card_variant as Dictionary
			var image_path := str(card.get("image_path", "")).strip_edges()
			if image_path != "" and not paths.has(image_path):
				paths.append(image_path)


static func apply_activity_feature_primary_cta_style(button: Button) -> void:
	if button == null:
		return
	button.custom_minimum_size = activity_feature_primary_cta_size()
	button.add_theme_font_size_override("font_size", activity_feature_primary_cta_font_size())
	button.add_theme_color_override("font_color", Color(0.16, 0.11, 0.05, 1.0))
	button.add_theme_color_override("font_hover_color", Color(0.12, 0.08, 0.04, 1.0))
	button.add_theme_stylebox_override("normal", make_flat_panel_style(Color(0.92, 0.78, 0.42, 0.94), Color(1.0, 0.88, 0.48, 0.98), 1, 5, 0.12))
	button.add_theme_stylebox_override("hover", make_flat_panel_style(Color(1.0, 0.86, 0.48, 0.98), Color(1.0, 0.94, 0.58, 1.0), 1, 6, 0.16))
	button.add_theme_stylebox_override("pressed", make_flat_panel_style(Color(0.78, 0.62, 0.32, 0.98), Color(1.0, 0.88, 0.48, 1.0), 1, 3, 0.10))
	button.add_theme_stylebox_override("focus", StyleBoxEmpty.new())



static func make_snapshot_feature_status_chip_style(tone_color: Color, is_empty: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.075, 0.058, 0.045, 0.70) if not is_empty else Color(0.106, 0.094, 0.072, 0.54)
	style.border_color = Color(tone_color.r, tone_color.g, tone_color.b, 0.58) if not is_empty else Color(0.56, 0.48, 0.32, 0.30)
	style.set_border_width_all(1)
	style.set_corner_radius_all(3)
	return style


static func make_snapshot_feature_caption_bar_style(is_empty: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.02, 0.018, 0.016, 0.24) if not is_empty else Color(0.115, 0.098, 0.070, 0.20)
	style.border_color = Color(0.88, 0.74, 0.40, 0.06) if not is_empty else Color(0.48, 0.40, 0.26, 0.10)
	style.set_border_width(SIDE_TOP, 0)
	style.set_border_width(SIDE_BOTTOM, 0)
	return style


static func make_snapshot_feature_title_bar_style(tone_color: Color, is_empty: bool, asset_cover: bool = false) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	if is_empty:
		style.bg_color = Color(0.118, 0.100, 0.070, 0.30)
		style.border_color = Color(0.50, 0.42, 0.28, 0.0)
	elif asset_cover:
		style.bg_color = Color(0.090 + tone_color.r * 0.028, 0.028 + tone_color.g * 0.014, 0.024 + tone_color.b * 0.012, 0.80)
		style.border_color = Color(0.86, 0.68, 0.34, 0.0)
	else:
		style.bg_color = Color(0.105 + tone_color.r * 0.035, 0.034 + tone_color.g * 0.018, 0.028 + tone_color.b * 0.014, 0.88)
		style.border_color = Color(0.86, 0.68, 0.34, 0.045)
	style.set_border_width(SIDE_TOP, 0)
	style.set_border_width(SIDE_BOTTOM, 0)
	return style


static func make_snapshot_feature_red_dot_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.86, 0.12, 0.10, 1.0)
	style.border_color = Color(1.0, 0.54, 0.42, 0.92)
	style.set_border_width_all(1)
	style.set_corner_radius_all(6)
	return style


static func make_snapshot_feature_image_placeholder_style(tone_color: Color, is_empty: bool, cover_mode: String = "") -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = snapshot_feature_disabled_soft_slot_bg() if is_empty else Color(0.06 + tone_color.r * 0.08, 0.055 + tone_color.g * 0.06, 0.050 + tone_color.b * 0.05, 0.92)
	style.border_color = snapshot_feature_disabled_soft_slot_border() if is_empty else Color(tone_color.r, tone_color.g, tone_color.b, 0.58)
	if cover_mode == "reserved_quiet_slot":
		style.bg_color = snapshot_feature_disabled_soft_slot_bg()
		style.border_color = snapshot_feature_disabled_soft_slot_border()
	if cover_mode == "asset_drop_cover" and not is_empty:
		style.border_color = Color(tone_color.r, tone_color.g, tone_color.b, 0.10)
		style.set_border_width_all(0)
	elif cover_mode == "reserved_quiet_slot":
		style.set_border_width_all(0)
	else:
		style.set_border_width_all(1)
	style.set_corner_radius_all(4)
	return style


static func make_snapshot_feature_cover_line_style(tone_color: Color, is_empty: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.22, 0.22, 0.24, 0.48) if is_empty else Color(tone_color.r, tone_color.g, tone_color.b, 0.78)
	style.border_color = Color(0.0, 0.0, 0.0, 0.0)
	style.set_border_width_all(0)
	style.set_corner_radius_all(1)
	return style


static func make_snapshot_reward_chip_style(tone_color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.10, 0.104, 0.112, 0.11)
	style.border_color = tone_color.darkened(0.12)
	style.border_color.a = 0.035
	style.set_border_width_all(1)
	style.set_corner_radius_all(5)
	return style


static func make_snapshot_reward_chip_icon_style(label_text: String) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.56, 0.44, 0.22, 0.42)
	if label_text.find("木") >= 0:
		style.bg_color = Color(0.30, 0.54, 0.28, 0.43)
	elif label_text.find("石") >= 0:
		style.bg_color = Color(0.56, 0.56, 0.58, 0.42)
	elif label_text.find("铁") >= 0:
		style.bg_color = Color(0.34, 0.50, 0.82, 0.42)
	elif label_text.find("粮") >= 0:
		style.bg_color = Color(0.76, 0.62, 0.28, 0.43)
	style.border_color = Color(0.96, 0.90, 0.72, 0.08)
	style.set_border_width_all(1)
	style.set_corner_radius_all(6)
	return style


static func make_snapshot_shared_state_chip_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.12, 0.12, 0.14, 0.94)
	style.border_color = Color(0.32, 0.32, 0.35, 0.92)
	style.set_border_width_all(1)
	style.set_corner_radius_all(4)
	return style


static func make_snapshot_block_panel_style(kind: String, content_first_mode: bool, player_reading_mode: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	if content_first_mode and kind != "text_block":
		style.bg_color = Color(0.182, 0.122, 0.060, 0.78)
		style.border_color = Color(0.76, 0.54, 0.26, 0.36)
	elif player_reading_mode and kind == "status_hero":
		style.bg_color = Color(0.210, 0.142, 0.070, 0.94)
		style.border_color = Color(0.94, 0.70, 0.32, 0.52)
	else:
		style.bg_color = Color(0.190, 0.126, 0.064, 0.88) if player_reading_mode else Color(0.196, 0.130, 0.066, 0.90)
		style.border_color = Color(0.78, 0.56, 0.26, 0.44) if player_reading_mode else Color(0.74, 0.52, 0.25, 0.60)
	style.set_border_width_all(1)
	style.set_corner_radius_all(6 if player_reading_mode else 4)
	if content_first_mode or player_reading_mode:
		style.shadow_color = Color(0.45, 0.26, 0.08, 0.18)
		style.shadow_size = 8
	return style


static func make_snapshot_state_card_style(tone_color: Color, player_reading_mode: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.214, 0.146, 0.074, 0.90) if player_reading_mode else Color(0.202, 0.134, 0.068, 0.90)
	var border_alpha := 0.50 if player_reading_mode else 0.62
	style.border_color = Color(tone_color.r, tone_color.g, tone_color.b, border_alpha)
	style.set_border_width_all(1)
	if player_reading_mode:
		style.shadow_color = Color(0.45, 0.26, 0.08, 0.17)
		style.shadow_size = 7
	return style


static func make_snapshot_task_strip_row_style(tone_color: Color, uses_tone: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.150, 0.104, 0.058, 0.34)
	style.border_color = Color(0.48, 0.36, 0.22, 0.070)
	if uses_tone:
		style.border_color = style.border_color.lerp(tone_color, 0.026)
	style.set_border_width_all(1)
	style.set_border_width(SIDE_LEFT, 1)
	style.set_corner_radius_all(7)
	style.shadow_color = Color(0.0, 0.0, 0.0, 0.0)
	style.shadow_size = 0
	return style


static func make_snapshot_task_strip_icon_style(tone_color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.170, 0.120, 0.068, 0.70)
	style.border_color = Color(tone_color.r, tone_color.g, tone_color.b, 0.36)
	style.set_border_width_all(1)
	style.set_corner_radius_all(4)
	return style


static func make_snapshot_reading_list_style(tone_color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.192, 0.126, 0.064, 0.78)
	style.border_color = Color(tone_color.r, tone_color.g, tone_color.b, 0.58)
	style.border_width_left = 4
	style.border_width_top = 0
	style.border_width_right = 0
	style.border_width_bottom = 0
	style.set_corner_radius_all(6)
	style.shadow_color = Color(0.45, 0.26, 0.08, 0.14)
	style.shadow_size = 6
	return style


static func make_snapshot_reading_badge_style(tone_color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = tone_color
	style.border_color = Color(0.0, 0.0, 0.0, 0.0)
	style.set_border_width_all(0)
	style.set_corner_radius_all(6)
	return style


static func make_snapshot_status_fact_style(tone_color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.196, 0.130, 0.066, 0.74)
	style.border_color = Color(tone_color.r, tone_color.g, tone_color.b, 0.54)
	style.border_width_left = 3
	style.border_width_top = 0
	style.border_width_right = 0
	style.border_width_bottom = 0
	style.set_corner_radius_all(6)
	return style


static func make_snapshot_status_pill_style(tone_color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.226, 0.154, 0.078, 0.82)
	style.border_color = Color(tone_color.r, tone_color.g, tone_color.b, 0.58)
	style.set_border_width_all(1)
	style.set_corner_radius_all(6)
	return style


static func make_snapshot_chat_bubble_style(tone: String, is_player: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	match tone:
		"blue":
			style.bg_color = Color(0.07, 0.10, 0.15, 0.96)
			style.border_color = Color(0.28, 0.52, 0.88, 0.74)
		"green":
			style.bg_color = Color(0.07, 0.13, 0.10, 0.96)
			style.border_color = Color(0.38, 0.62, 0.42, 0.74)
		"gold":
			style.bg_color = Color(0.17, 0.13, 0.08, 0.96)
			style.border_color = Color(0.72, 0.58, 0.28, 0.78)
		_:
			style.bg_color = Color(0.10, 0.10, 0.12, 0.96)
			style.border_color = Color(0.38, 0.38, 0.42, 0.68)
	if is_player and tone != "gold":
		style.bg_color = Color(0.17, 0.13, 0.08, 0.96)
		style.border_color = Color(0.72, 0.58, 0.28, 0.78)
	style.border_width_left = 4
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.set_corner_radius_all(8)
	return style


static func make_snapshot_world_affairs_scene_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.10, 0.095, 0.090, 0.78)
	style.border_color = Color(0.48, 0.42, 0.30, 0.22)
	style.set_border_width_all(1)
	style.set_corner_radius_all(4)
	return style


static func make_snapshot_world_affairs_stamp_style(compact: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.38, 0.065, 0.045, 0.94)
	style.border_color = Color(0.86, 0.44, 0.22, 0.76)
	style.set_border_width_all(1)
	style.set_corner_radius_all(2 if compact else 3)
	return style


static func make_snapshot_timeline_node_style(tone_color: Color, completed: bool, current: bool = false) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	if current:
		style.bg_color = Color(0.07, 0.10, 0.14, 0.96)
	elif completed:
		style.bg_color = Color(0.12, 0.09, 0.06, 0.92)
	else:
		style.bg_color = Color(0.07, 0.07, 0.08, 0.90)
	style.border_color = tone_color
	style.set_border_width_all(2 if current else 1)
	style.set_corner_radius_all(6)
	return style


static func make_snapshot_territory_coord_icon_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.12, 0.24, 0.14, 0.92)
	style.border_color = Color(0.56, 0.98, 0.66, 0.82)
	style.set_border_width_all(1)
	style.set_corner_radius_all(9)
	return style


static func make_snapshot_territory_resource_badge_style(text: String, tone_color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = tone_color
	if text.find("石") >= 0:
		style.bg_color = Color(0.54, 0.54, 0.56, 0.96)
	elif text.find("木") >= 0:
		style.bg_color = Color(0.38, 0.62, 0.42, 0.96)
	elif text.find("粮") >= 0:
		style.bg_color = Color(0.78, 0.64, 0.28, 0.96)
	elif text.find("铁") >= 0:
		style.bg_color = Color(0.30, 0.50, 0.88, 0.96)
	style.border_color = Color(0.08, 0.08, 0.09, 0.60)
	style.set_border_width_all(1)
	style.set_corner_radius_all(6)
	return style


static func make_snapshot_faction_map_land_style(bg_color: Color, border_color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg_color
	style.border_color = border_color
	style.set_border_width_all(1)
	style.set_corner_radius_all(2)
	return style


static func make_snapshot_faction_map_city_marker_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.12, 0.30, 0.18, 0.94)
	style.border_color = Color(0.42, 0.96, 0.58, 0.90)
	style.set_border_width_all(1)
	style.set_corner_radius_all(3)
	return style


static func make_snapshot_faction_map_province_tile_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.12, 0.18, 0.12, 0.72)
	style.border_color = Color(0.35, 0.58, 0.32, 0.72)
	style.set_border_width_all(1)
	style.set_corner_radius_all(3)
	return style


static func make_snapshot_faction_map_marker_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.05, 0.07, 0.05, 0.86)
	style.border_color = Color(0.34, 0.86, 0.46, 0.80)
	style.set_border_width_all(1)
	style.set_corner_radius_all(4)
	return style


static func make_snapshot_faction_map_canvas_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.07, 0.09, 0.075, 0.94)
	style.border_color = Color(0.30, 0.34, 0.28, 0.88)
	style.set_border_width_all(1)
	style.set_corner_radius_all(5)
	return style


static func make_snapshot_task_chapter_chip_style(tone_color: Color, is_empty: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.045, 0.045, 0.052, 0.50) if is_empty else Color(0.055 + tone_color.r * 0.020, 0.052 + tone_color.g * 0.014, 0.050 + tone_color.b * 0.010, 0.66)
	style.border_color = Color(0.22, 0.22, 0.24, 0.46) if is_empty else Color(tone_color.r, tone_color.g, tone_color.b, 0.42)
	style.set_border_width_all(1)
	style.set_corner_radius_all(3)
	return style


static func make_snapshot_task_chapter_plate_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.14, 0.10, 0.09, 0.96)
	style.border_color = Color(0.46, 0.18, 0.14, 0.94)
	style.set_border_width_all(1)
	style.set_corner_radius_all(3)
	return style


static func apply_fullscreen_backdrop(backdrop: ColorRect) -> void:
	if backdrop == null:
		return
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.color = FULLSCREEN_BACKDROP_COLOR


static func apply_fullscreen_panel_chrome(panel: PanelContainer, margin: MarginContainer = null) -> void:
	if panel != null:
		panel.set_anchors_preset(Control.PRESET_FULL_RECT)
		panel.offset_left = 30.0
		panel.offset_top = 24.0
		panel.offset_right = -30.0
		panel.offset_bottom = 0.0
		var frame_style := StyleBoxFlat.new()
		frame_style.bg_color = FULLSCREEN_PANEL_BG
		frame_style.border_color = FULLSCREEN_PANEL_BORDER
		frame_style.set_border_width_all(1)
		panel.add_theme_stylebox_override("panel", frame_style)
	if margin != null:
		apply_margin(margin, 22, 16, 22, 16)


static func apply_margin(margin: MarginContainer, left: int, top: int, right: int, bottom: int) -> void:
	if margin == null:
		return
	margin.add_theme_constant_override("margin_left", left)
	margin.add_theme_constant_override("margin_top", top)
	margin.add_theme_constant_override("margin_right", right)
	margin.add_theme_constant_override("margin_bottom", bottom)


static func battle_report_shell_icon_button_min_height() -> float:
	return 52.0


static func battle_report_shell_icon_button_font_size() -> int:
	return 18


static func battle_report_shell_icon_button_min_width(role: String) -> float:
	match role:
		"close":
			return 124.0
		"search":
			return 136.0
		"detail_back":
			return 136.0
		_:
			return 0.0


static func apply_battle_report_shell_icon_button(button: Button, icon_texture: Texture2D, role: String = "") -> void:
	if button == null:
		return
	apply_shell_icon_button(button, icon_texture, battle_report_shell_icon_button_min_width(role))
	button.custom_minimum_size = Vector2(
		maxf(button.custom_minimum_size.x, battle_report_shell_icon_button_min_width(role)),
		maxf(button.custom_minimum_size.y, battle_report_shell_icon_button_min_height())
	)
	button.add_theme_font_size_override("font_size", battle_report_shell_icon_button_font_size())
	button.focus_mode = Control.FOCUS_NONE


static func battle_report_list_mode_tab_min_width() -> float:
	return 132.0


static func battle_report_list_mode_tab_min_height() -> float:
	return 52.0


static func battle_report_list_mode_tab_font_size() -> int:
	return 20


static func apply_battle_report_list_mode_tab_state(button: Button, is_active: bool) -> void:
	if button == null:
		return
	button.custom_minimum_size = Vector2(
		maxf(button.custom_minimum_size.x, battle_report_list_mode_tab_min_width()),
		maxf(button.custom_minimum_size.y, battle_report_list_mode_tab_min_height())
	)
	button.add_theme_font_size_override("font_size", battle_report_list_mode_tab_font_size())
	apply_shell_tab_state(button, is_active)


static func battle_report_detail_tab_button_min_width() -> float:
	return 132.0


static func battle_report_detail_tab_button_min_height() -> float:
	return 42.0


static func battle_report_detail_tab_button_font_size() -> int:
	return 15


static func apply_battle_report_detail_tab_button_state(button: Button, is_active: bool) -> void:
	if button == null:
		return
	button.custom_minimum_size = Vector2(
		maxf(button.custom_minimum_size.x, battle_report_detail_tab_button_min_width()),
		maxf(button.custom_minimum_size.y, battle_report_detail_tab_button_min_height())
	)
	button.add_theme_font_size_override("font_size", battle_report_detail_tab_button_font_size())
	apply_shell_tab_state(button, is_active)


static func general_profile_tab_button_min_height() -> float:
	return 46.0


static func general_profile_tab_button_font_size() -> int:
	return 20


static func general_profile_tab_count() -> int:
	return 3


static func general_tactics_scheme_tab_min_height() -> float:
	return 34.0


static func general_tactics_scheme_tab_label_font_size() -> int:
	return 14


static func general_tactics_scheme_tab_margin_x() -> int:
	return 8


static func general_tactics_scheme_tab_margin_y() -> int:
	return 5


static func general_tactics_step_button_width() -> float:
	return 46.0


static func general_tactics_step_button_max_width() -> float:
	return 66.0


static func general_tactics_step_button_height() -> float:
	return 32.0


static func general_tactics_step_button_font_size() -> int:
	return 15


static func general_tactics_step_button_margin() -> int:
	return 4


static func general_tactics_preview_action_chip_size() -> Vector2:
	return Vector2(86, 34)


static func general_tactics_preview_action_chip_font_size() -> int:
	return 15


static func general_tactics_preview_action_chip_margin_x() -> int:
	return 8


static func general_tactics_preview_action_chip_margin_y() -> int:
	return 5


static func general_tactics_stat_tag_size() -> Vector2:
	return Vector2(64, 28)


static func general_tactics_stat_tag_font_size() -> int:
	return 12


static func general_tactics_stat_tag_margin_x() -> int:
	return 5


static func general_tactics_stat_tag_margin_y() -> int:
	return 3


static func general_tactics_summary_card_count() -> int:
	return 3


static func general_tactics_summary_card_min_height() -> float:
	return 66.0


static func general_tactics_summary_card_margin_x() -> int:
	return 8


static func general_tactics_summary_card_margin_y() -> int:
	return 7


static func general_tactics_summary_card_column_spacing() -> int:
	return 2


static func general_tactics_summary_card_title_font_size() -> int:
	return 12


static func general_tactics_summary_card_value_font_size() -> int:
	return 15


static func general_tactics_summary_card_meta_font_size() -> int:
	return 11


static func general_growth_entry_card_count() -> int:
	return 4


static func general_growth_entry_card_min_height() -> float:
	return 66.0


static func general_growth_entry_card_margin_x() -> int:
	return 8


static func general_growth_entry_card_margin_y() -> int:
	return 7


static func general_growth_entry_card_column_spacing() -> int:
	return 2


static func general_growth_entry_card_title_font_size() -> int:
	return 12


static func general_growth_entry_card_value_font_size() -> int:
	return 15


static func general_growth_entry_card_meta_font_size() -> int:
	return 11


static func general_growth_troop_arrow_button_count() -> int:
	return 2


static func general_growth_troop_arrow_button_size() -> Vector2:
	return Vector2(52, 158)


static func general_growth_troop_arrow_button_font_size() -> int:
	return 30


static func general_growth_troop_chip_count() -> int:
	return 2


static func general_growth_troop_chip_min_width() -> int:
	return 58


static func general_growth_troop_chip_height() -> int:
	return 30


static func general_growth_troop_chip_text_width_per_char() -> int:
	return 13


static func general_growth_troop_chip_horizontal_padding() -> int:
	return 18


static func general_growth_troop_chip_margin_x() -> int:
	return 8


static func general_growth_troop_chip_margin_y() -> int:
	return 5


static func general_growth_troop_chip_font_size() -> int:
	return 12


static func general_growth_troop_chip_size(text: String) -> Vector2:
	return Vector2(
		maxi(
			general_growth_troop_chip_min_width(),
			text.length() * general_growth_troop_chip_text_width_per_char() + general_growth_troop_chip_horizontal_padding()
		),
		general_growth_troop_chip_height()
	)


static func general_profile_close_button_size() -> Vector2:
	return Vector2(122, 56)


static func general_profile_close_button_font_size() -> int:
	return 24


static func general_profile_back_button_size() -> Vector2:
	return Vector2(174, 70)


static func general_profile_back_button_font_size() -> int:
	return 25


static func general_profile_stage_action_button_count() -> int:
	return 4


static func general_profile_stage_action_button_height() -> float:
	return 40.0


static func general_profile_stage_action_button_font_size() -> int:
	return 18


static func general_profile_stage_action_button_separation() -> int:
	return 10


static func general_profile_attribute_chip_count() -> int:
	return 5


static func general_profile_attribute_chip_min_height() -> float:
	return 56.0


static func general_profile_attribute_chip_row_separation() -> int:
	return 10


static func general_profile_attribute_chip_growth_width() -> float:
	return 98.0


static func general_profile_attribute_chip_icon_size() -> Vector2:
	return Vector2(34, 34)


static func apply_general_profile_attribute_chip_panel_style(panel: Control) -> void:
	if panel == null:
		return
	panel.custom_minimum_size = Vector2(
		panel.custom_minimum_size.x,
		maxf(panel.custom_minimum_size.y, general_profile_attribute_chip_min_height())
	)


static func apply_general_profile_attribute_chip_row_style(row: HBoxContainer) -> void:
	if row == null:
		return
	row.add_theme_constant_override("separation", general_profile_attribute_chip_row_separation())


static func apply_general_profile_attribute_chip_growth_style(label: Control) -> void:
	if label == null:
		return
	label.custom_minimum_size = Vector2(general_profile_attribute_chip_growth_width(), label.custom_minimum_size.y)


static func apply_general_profile_attribute_chip_icon_style(frame: Control) -> void:
	if frame == null:
		return
	frame.custom_minimum_size = general_profile_attribute_chip_icon_size()


static func general_profile_skill_button_min_height() -> float:
	return 124.0


static func general_profile_skill_button_font_size() -> int:
	return 19


static func general_profile_empty_skill_button_font_size() -> int:
	return 18


static func general_profile_skill_button_row_separation() -> int:
	return 16


static func general_profile_skill_visible_slot_min() -> int:
	return 3


static func general_profile_skill_visible_slot_max() -> int:
	return 5


static func general_profile_skill_visible_slot_count(skill_count: int, learnable_slots: int) -> int:
	return clampi(
		maxi(skill_count + maxi(0, learnable_slots), general_profile_skill_visible_slot_min()),
		1,
		general_profile_skill_visible_slot_max()
	)


static func general_profile_skill_empty_button_count(skill_count: int, learnable_slots: int) -> int:
	return maxi(0, general_profile_skill_visible_slot_count(skill_count, learnable_slots) - skill_count)


static func apply_general_profile_skill_button_row_style(row: HBoxContainer) -> void:
	if row == null:
		return
	row.add_theme_constant_override("separation", general_profile_skill_button_row_separation())


static func apply_general_profile_empty_skill_button_style(button: Button, muted_color: Color) -> void:
	if button == null:
		return
	button.custom_minimum_size = Vector2(
		button.custom_minimum_size.x,
		maxf(button.custom_minimum_size.y, general_profile_skill_button_min_height())
	)
	button.disabled = true
	button.add_theme_font_size_override("font_size", general_profile_empty_skill_button_font_size())
	apply_button_style(
		button,
		Color(0.035, 0.033, 0.030, 0.54),
		Color(muted_color.r, muted_color.g, muted_color.b, 0.30),
		muted_color,
		muted_color,
		4,
		0.06,
		0.06
	)


static func apply_general_profile_skill_button_style(button: Button, grade_color: Color, font_color: Color) -> void:
	if button == null:
		return
	button.custom_minimum_size = Vector2(
		button.custom_minimum_size.x,
		maxf(button.custom_minimum_size.y, general_profile_skill_button_min_height())
	)
	button.add_theme_font_size_override("font_size", general_profile_skill_button_font_size())
	apply_button_style(
		button,
		Color(grade_color.r * 0.08, grade_color.g * 0.08, grade_color.b * 0.08, 0.56),
		Color(grade_color.r, grade_color.g, grade_color.b, 0.50),
		font_color,
		font_color,
		4,
		0.06,
		0.06
	)


static func general_profile_progress_line_count() -> int:
	return 3


static func general_profile_progress_line_separation() -> int:
	return 8


static func general_profile_progress_bar_height() -> float:
	return 20.0


static func general_profile_progress_value_font_size() -> int:
	return 19


static func general_profile_progress_value_width() -> float:
	return 150.0


static func general_profile_small_tag_min_width() -> float:
	return 64.0


static func general_profile_small_tag_height() -> float:
	return 32.0


static func general_profile_small_tag_font_size() -> int:
	return 17


static func general_profile_small_tag_margin_x() -> int:
	return 5


static func general_profile_small_tag_margin_y() -> int:
	return 2


static func apply_general_profile_progress_line_row_style(row: HBoxContainer) -> void:
	if row == null:
		return
	row.add_theme_constant_override("separation", general_profile_progress_line_separation())


static func apply_general_profile_progress_bar_style(bar: ProgressBar) -> void:
	if bar == null:
		return
	bar.custom_minimum_size = Vector2(
		bar.custom_minimum_size.x,
		maxf(bar.custom_minimum_size.y, general_profile_progress_bar_height())
	)


static func apply_general_profile_progress_value_style(label: Control) -> void:
	if label == null:
		return
	label.custom_minimum_size = Vector2(general_profile_progress_value_width(), label.custom_minimum_size.y)


static func apply_general_profile_small_tag_panel_style(panel: Control, min_width: float = -1.0) -> void:
	if panel == null:
		return
	var resolved_width := general_profile_small_tag_min_width() if min_width < 0.0 else maxf(min_width, general_profile_small_tag_min_width())
	panel.custom_minimum_size = Vector2(resolved_width, general_profile_small_tag_height())


static func make_general_profile_small_tag_margin() -> MarginContainer:
	return make_margin(
		general_profile_small_tag_margin_x(),
		general_profile_small_tag_margin_y(),
		general_profile_small_tag_margin_x(),
		general_profile_small_tag_margin_y()
	)


static func apply_general_profile_stage_action_row_style(row: HBoxContainer) -> void:
	if row == null:
		return
	row.add_theme_constant_override("separation", general_profile_stage_action_button_separation())


static func apply_general_profile_stage_action_button_style(button: Button) -> void:
	if button == null:
		return
	var prefix := internal_command_prefix_for_label(button.text)
	if prefix != "":
		button.text = ensure_internal_command_prefix(button.text, prefix)
	button.custom_minimum_size = Vector2(
		maxf(button.custom_minimum_size.x, 86.0),
		maxf(button.custom_minimum_size.y, general_profile_stage_action_button_height())
	)
	button.alignment = HORIZONTAL_ALIGNMENT_CENTER
	button.clip_text = true
	button.add_theme_font_size_override("font_size", general_profile_stage_action_button_font_size())
	button.set_meta("general_profile_action_bg_token", GENERAL_PROFILE_ACTION_BG_TOKEN)
	apply_internal_command_button_style(
		button,
		Color(0.112, 0.060, 0.032, 0.86),
		Color(0.92, 0.67, 0.24, 0.72),
		Color(0.94, 0.91, 0.84, 1.0),
		Color(0.94, 0.91, 0.84, 1.0),
		5,
		1,
		10,
		5,
		0.06,
		0.08
	)


static func apply_general_profile_tab_button_style(button: Button, active: bool) -> void:
	if button == null:
		return
	if active:
		var prefix := internal_command_prefix_for_label(button.text)
		if prefix != "":
			button.text = ensure_internal_command_prefix(button.text, prefix)
	button.custom_minimum_size = Vector2(
		button.custom_minimum_size.x,
		maxf(button.custom_minimum_size.y, general_profile_tab_button_min_height())
	)
	button.alignment = HORIZONTAL_ALIGNMENT_CENTER
	button.clip_text = true
	button.add_theme_font_size_override("font_size", general_profile_tab_button_font_size())
	apply_internal_command_button_style(
		button,
		Color(0.18, 0.100, 0.044, 0.90) if active else Color(0.052, 0.044, 0.036, 0.68),
		Color(0.96, 0.70, 0.30, 0.96) if active else Color(0.42, 0.34, 0.18, 0.58),
		Color(0.95, 0.72, 0.32, 1.0) if active else Color(0.70, 0.67, 0.58, 1.0),
		Color(0.95, 0.72, 0.32, 1.0) if active else Color(0.70, 0.67, 0.58, 1.0),
		5,
		1,
		12,
		6,
		0.06,
		0.08
	)


static func apply_general_tactics_scheme_tab_style(chip: PanelContainer) -> void:
	if chip == null:
		return
	chip.custom_minimum_size = Vector2(
		chip.custom_minimum_size.x,
		maxf(chip.custom_minimum_size.y, general_tactics_scheme_tab_min_height())
	)


static func make_general_tactics_scheme_tab_margin() -> MarginContainer:
	var margin_x := general_tactics_scheme_tab_margin_x()
	var margin_y := general_tactics_scheme_tab_margin_y()
	return make_margin(margin_x, margin_y, margin_x, margin_y)


static func general_tactics_step_button_size(is_max_button: bool = false) -> Vector2:
	return Vector2(
		general_tactics_step_button_max_width() if is_max_button else general_tactics_step_button_width(),
		general_tactics_step_button_height()
	)


static func apply_general_tactics_step_button_style(button: PanelContainer, is_max_button: bool = false) -> void:
	if button == null:
		return
	button.custom_minimum_size = general_tactics_step_button_size(is_max_button)


static func make_general_tactics_step_button_margin() -> MarginContainer:
	var margin := general_tactics_step_button_margin()
	return make_margin(margin, margin, margin, margin)


static func apply_general_tactics_preview_action_chip_style(chip: PanelContainer) -> void:
	if chip == null:
		return
	chip.custom_minimum_size = general_tactics_preview_action_chip_size()


static func make_general_tactics_preview_action_chip_margin() -> MarginContainer:
	var margin_x := general_tactics_preview_action_chip_margin_x()
	var margin_y := general_tactics_preview_action_chip_margin_y()
	return make_margin(margin_x, margin_y, margin_x, margin_y)


static func apply_general_tactics_stat_tag_style(tag: PanelContainer) -> void:
	if tag == null:
		return
	tag.custom_minimum_size = general_tactics_stat_tag_size()


static func make_general_tactics_stat_tag_margin() -> MarginContainer:
	var margin_x := general_tactics_stat_tag_margin_x()
	var margin_y := general_tactics_stat_tag_margin_y()
	return make_margin(margin_x, margin_y, margin_x, margin_y)


static func apply_general_tactics_summary_card_style(card: PanelContainer) -> void:
	if card == null:
		return
	card.custom_minimum_size = Vector2(
		card.custom_minimum_size.x,
		maxf(card.custom_minimum_size.y, general_tactics_summary_card_min_height())
	)


static func make_general_tactics_summary_card_margin() -> MarginContainer:
	var margin_x := general_tactics_summary_card_margin_x()
	var margin_y := general_tactics_summary_card_margin_y()
	return make_margin(margin_x, margin_y, margin_x, margin_y)


static func apply_general_growth_entry_card_style(card: PanelContainer) -> void:
	if card == null:
		return
	card.custom_minimum_size = Vector2(
		card.custom_minimum_size.x,
		maxf(card.custom_minimum_size.y, general_growth_entry_card_min_height())
	)


static func make_general_growth_entry_card_margin() -> MarginContainer:
	var margin_x := general_growth_entry_card_margin_x()
	var margin_y := general_growth_entry_card_margin_y()
	return make_margin(margin_x, margin_y, margin_x, margin_y)


static func apply_general_growth_troop_arrow_button_style(button: Button) -> void:
	if button == null:
		return
	button.custom_minimum_size = general_growth_troop_arrow_button_size()
	button.add_theme_font_size_override("font_size", general_growth_troop_arrow_button_font_size())
	apply_button_style(
		button,
		Color(0.020, 0.018, 0.015, 0.68),
		Color(0.92, 0.67, 0.24, 0.42),
		Color(0.95, 0.72, 0.32, 1.0),
		Color(0.95, 0.72, 0.32, 1.0),
		4,
		0.06,
		0.06
	)


static func apply_general_growth_troop_chip_style(chip: PanelContainer, text: String) -> void:
	if chip == null:
		return
	chip.custom_minimum_size = general_growth_troop_chip_size(text)


static func apply_general_growth_troop_illustration_frame(frame: Control) -> void:
	if frame == null:
		return
	frame.clip_contents = true


static func make_general_growth_troop_chip_margin() -> MarginContainer:
	var margin_x := general_growth_troop_chip_margin_x()
	var margin_y := general_growth_troop_chip_margin_y()
	return make_margin(margin_x, margin_y, margin_x, margin_y)


static func apply_general_profile_back_button_style(button: Button) -> void:
	if button == null:
		return
	var prefix := internal_command_prefix_for_label(button.text)
	if prefix != "":
		button.text = ensure_internal_command_prefix(button.text, prefix)
	button.custom_minimum_size = general_profile_back_button_size()
	button.alignment = HORIZONTAL_ALIGNMENT_CENTER
	button.clip_text = true
	button.add_theme_font_size_override("font_size", general_profile_back_button_font_size())
	button.set_meta("general_profile_back_button_token", GENERAL_PROFILE_BACK_BUTTON_TOKEN)
	button.set_meta("close_back_button_spec_token", CLOSE_BACK_BUTTON_SPEC_TOKEN)
	button.set_meta("close_back_button_role", "back")
	button.set_meta("close_back_button_variant", "neutral")
	button.set_meta("general_profile_action_bg_token", GENERAL_PROFILE_ACTION_BG_TOKEN)
	apply_internal_command_button_style(
		button,
		Color(0.102, 0.056, 0.032, 0.90),
		Color(0.95, 0.72, 0.32, 0.78),
		Color(0.94, 0.91, 0.84, 1.0),
		Color(0.94, 0.91, 0.84, 1.0),
		6,
		1,
		14,
		8,
		0.06,
		0.08
	)


static func apply_general_profile_close_button_style(button: Button, variant: String = "danger") -> void:
	if button == null:
		return
	var prefix := internal_command_prefix_for_label(button.text)
	if prefix != "":
		button.text = ensure_internal_command_prefix(button.text, prefix)
	button.custom_minimum_size = general_profile_close_button_size()
	button.alignment = HORIZONTAL_ALIGNMENT_CENTER
	button.clip_text = true
	button.add_theme_font_size_override("font_size", general_profile_close_button_font_size())
	var danger := variant == "danger"
	button.set_meta("close_back_button_spec_token", CLOSE_BACK_BUTTON_SPEC_TOKEN)
	button.set_meta("close_back_button_role", "close")
	if danger:
		button.set_meta("close_back_button_variant", "danger")
	else:
		button.set_meta("close_back_button_variant", "neutral")
	button.set_meta("general_profile_action_bg_token", GENERAL_PROFILE_ACTION_BG_TOKEN)
	apply_internal_command_button_style(
		button,
		Color(0.25, 0.060, 0.044, 0.92) if danger else Color(0.080, 0.074, 0.062, 0.82),
		Color(0.86, 0.28, 0.18, 0.90) if danger else Color(0.92, 0.67, 0.24, 0.92),
		Color(1.00, 0.70, 0.52, 1.0) if danger else Color(0.94, 0.91, 0.84, 1.0),
		Color(0.72, 0.48, 0.38, 1.0) if danger else Color(0.94, 0.91, 0.84, 1.0),
		6,
		1,
		14,
		8,
		0.06,
		0.08
	)


static func apply_general_roster_close_button_style(button: Button) -> void:
	apply_general_profile_close_button_style(button, "danger")


static func apply_general_roster_detail_button_style(button: Button) -> void:
	if button == null:
		return
	var prefix := internal_command_prefix_for_label(button.text)
	if prefix != "":
		button.text = ensure_internal_command_prefix(button.text, prefix)
	button.custom_minimum_size = Vector2(92, 42)
	button.alignment = HORIZONTAL_ALIGNMENT_CENTER
	button.clip_text = true
	button.add_theme_font_size_override("font_size", 18)
	button.set_meta("general_roster_detail_button_token", GENERAL_ROSTER_DETAIL_BUTTON_TOKEN)
	apply_internal_command_button_style(
		button,
		Color(0.112, 0.060, 0.032, 0.86),
		Color(0.92, 0.67, 0.24, 0.72),
		Color(0.94, 0.91, 0.84, 1.0),
		Color(0.94, 0.91, 0.84, 1.0),
		5,
		1,
		10,
		5,
		0.06,
		0.08
	)


static func apply_general_profile_back_button_summary(summary: Dictionary) -> void:
	summary["profileCloseBackButtonSpecToken"] = CLOSE_BACK_BUTTON_SPEC_TOKEN
	summary["profileBackButtonRole"] = "back"
	summary["profileBackButtonVariant"] = "neutral"
	summary["profileBackButtonToken"] = GENERAL_PROFILE_BACK_BUTTON_TOKEN
	summary["profileBackButtonLiveTextContract"] = "general_profile_back_live_text_v1"
	summary["profileBackButtonActionId"] = "general_profile_back_close"
	summary["profileActionBgToken"] = GENERAL_PROFILE_ACTION_BG_TOKEN
	var back_size := general_profile_back_button_size()
	summary["profileBackButtonWidth"] = int(back_size.x)
	summary["profileBackButtonHeight"] = int(back_size.y)
	summary["profileBackButtonFontSize"] = general_profile_back_button_font_size()


static func apply_general_profile_tab_strip_summary(summary: Dictionary) -> void:
	summary["profileCloseBackButtonSpecToken"] = CLOSE_BACK_BUTTON_SPEC_TOKEN
	summary["profileTabStripToken"] = GENERAL_PROFILE_TAB_STRIP_TOKEN
	summary["profileTabButtonToken"] = GENERAL_PROFILE_TAB_BUTTON_TOKEN
	summary["profileActionBgToken"] = GENERAL_PROFILE_ACTION_BG_TOKEN
	summary["profileTabButtonMinHeight"] = int(general_profile_tab_button_min_height())
	summary["profileTabButtonFontSize"] = general_profile_tab_button_font_size()
	summary["profileTabStripTabCount"] = general_profile_tab_count()
	summary["profileCloseButtonToken"] = GENERAL_PROFILE_CLOSE_BUTTON_TOKEN
	summary["profileCloseButtonLiveTextContract"] = "general_profile_close_live_text_v1"
	summary["profileCloseButtonActionId"] = "general_profile_close_panel"
	summary["profileCloseButtonRole"] = "close"
	summary["profileCloseButtonVariant"] = "danger"
	var close_size := general_profile_close_button_size()
	summary["profileCloseButtonWidth"] = int(close_size.x)
	summary["profileCloseButtonHeight"] = int(close_size.y)
	summary["profileCloseButtonFontSize"] = general_profile_close_button_font_size()


static func apply_general_profile_stage_action_button_summary(summary: Dictionary) -> void:
	summary["profileStageActionButtonToken"] = GENERAL_PROFILE_STAGE_ACTION_BUTTON_TOKEN
	summary["profileStageActionButtonLiveTextContract"] = "general_profile_stage_action_live_text_v1"
	summary["profileStageActionButtonActionIds"] = "general_reset / general_guide / general_share / general_inherit"
	summary["profileStageActionButtonLabels"] = "重置 / 攻略 / 分享 / 传承"
	summary["profileActionBgToken"] = GENERAL_PROFILE_ACTION_BG_TOKEN
	summary["profileStageActionButtonCount"] = general_profile_stage_action_button_count()
	summary["profileStageActionButtonHeight"] = int(general_profile_stage_action_button_height())
	summary["profileStageActionButtonFontSize"] = general_profile_stage_action_button_font_size()
	summary["profileStageActionButtonSeparation"] = general_profile_stage_action_button_separation()


static func apply_general_profile_attribute_chip_summary(summary: Dictionary) -> void:
	summary["profileAttributeChipToken"] = GENERAL_PROFILE_ATTRIBUTE_CHIP_TOKEN
	summary["profileAttributeChipCount"] = general_profile_attribute_chip_count()
	summary["profileAttributeChipMinHeight"] = int(general_profile_attribute_chip_min_height())
	summary["profileAttributeChipRowSeparation"] = general_profile_attribute_chip_row_separation()
	summary["profileAttributeChipGrowthWidth"] = int(general_profile_attribute_chip_growth_width())
	var icon_size := general_profile_attribute_chip_icon_size()
	summary["profileAttributeChipIconSize"] = int(icon_size.x)


static func apply_general_profile_skill_button_summary(summary: Dictionary, skill_count: int, learnable_slots: int) -> void:
	summary["profileSkillButtonToken"] = GENERAL_PROFILE_SKILL_BUTTON_TOKEN
	summary["profileSkillButtonLiveTextContract"] = "general_profile_skill_live_text_v1"
	summary["profileSkillButtonActionPrefix"] = "skill_detail:"
	summary["profileSkillButtonMinHeight"] = int(general_profile_skill_button_min_height())
	summary["profileSkillButtonFontSize"] = general_profile_skill_button_font_size()
	summary["profileEmptySkillButtonFontSize"] = general_profile_empty_skill_button_font_size()
	summary["profileSkillButtonRowSeparation"] = general_profile_skill_button_row_separation()
	summary["profileSkillVisibleSlotMin"] = general_profile_skill_visible_slot_min()
	summary["profileSkillVisibleSlotMax"] = general_profile_skill_visible_slot_max()
	summary["profileSkillVisibleSlotCount"] = general_profile_skill_visible_slot_count(skill_count, learnable_slots)
	summary["profileSkillEmptyButtonCount"] = general_profile_skill_empty_button_count(skill_count, learnable_slots)
	summary["profileEmptySkillButtonDisabled"] = true


static func apply_general_profile_progress_line_summary(summary: Dictionary) -> void:
	summary["profileProgressLineToken"] = GENERAL_PROFILE_PROGRESS_LINE_TOKEN
	summary["profileProgressLineCount"] = general_profile_progress_line_count()
	summary["profileProgressLineSeparation"] = general_profile_progress_line_separation()
	summary["profileProgressBarHeight"] = int(general_profile_progress_bar_height())
	summary["profileProgressValueFontSize"] = general_profile_progress_value_font_size()
	summary["profileProgressValueWidth"] = int(general_profile_progress_value_width())
	summary["profileSmallTagToken"] = GENERAL_PROFILE_SMALL_TAG_TOKEN
	summary["profileSmallTagMinWidth"] = int(general_profile_small_tag_min_width())
	summary["profileSmallTagHeight"] = int(general_profile_small_tag_height())
	summary["profileSmallTagFontSize"] = general_profile_small_tag_font_size()
	summary["profileSmallTagMarginX"] = general_profile_small_tag_margin_x()
	summary["profileSmallTagMarginY"] = general_profile_small_tag_margin_y()


static func apply_general_tactics_scheme_tab_summary(summary: Dictionary) -> void:
	summary["tacticsSchemeTabToken"] = GENERAL_TACTICS_SCHEME_TAB_TOKEN
	summary["tacticsSchemeTabMinHeight"] = int(general_tactics_scheme_tab_min_height())
	summary["tacticsSchemeTabLabelFontSize"] = general_tactics_scheme_tab_label_font_size()
	summary["tacticsSchemeTabMarginX"] = general_tactics_scheme_tab_margin_x()
	summary["tacticsSchemeTabMarginY"] = general_tactics_scheme_tab_margin_y()


static func apply_general_tactics_step_button_summary(summary: Dictionary) -> void:
	summary["tacticsStepButtonToken"] = GENERAL_TACTICS_STEP_BUTTON_TOKEN
	summary["tacticsStepButtonWidth"] = int(general_tactics_step_button_width())
	summary["tacticsStepButtonMaxWidth"] = int(general_tactics_step_button_max_width())
	summary["tacticsStepButtonHeight"] = int(general_tactics_step_button_height())
	summary["tacticsStepButtonFontSize"] = general_tactics_step_button_font_size()
	summary["tacticsStepButtonMargin"] = general_tactics_step_button_margin()


static func apply_general_tactics_preview_action_chip_summary(summary: Dictionary) -> void:
	summary["tacticsPreviewActionChipToken"] = GENERAL_TACTICS_PREVIEW_ACTION_CHIP_TOKEN
	var chip_size := general_tactics_preview_action_chip_size()
	summary["tacticsPreviewActionChipWidth"] = int(chip_size.x)
	summary["tacticsPreviewActionChipHeight"] = int(chip_size.y)
	summary["tacticsPreviewActionChipFontSize"] = general_tactics_preview_action_chip_font_size()
	summary["tacticsPreviewActionChipMarginX"] = general_tactics_preview_action_chip_margin_x()
	summary["tacticsPreviewActionChipMarginY"] = general_tactics_preview_action_chip_margin_y()


static func apply_general_tactics_stat_tag_summary(summary: Dictionary) -> void:
	summary["tacticsStatTagToken"] = GENERAL_TACTICS_STAT_TAG_TOKEN
	var tag_size := general_tactics_stat_tag_size()
	summary["tacticsStatTagWidth"] = int(tag_size.x)
	summary["tacticsStatTagHeight"] = int(tag_size.y)
	summary["tacticsStatTagFontSize"] = general_tactics_stat_tag_font_size()
	summary["tacticsStatTagMarginX"] = general_tactics_stat_tag_margin_x()
	summary["tacticsStatTagMarginY"] = general_tactics_stat_tag_margin_y()


static func apply_general_tactics_summary_card_summary(summary: Dictionary) -> void:
	summary["tacticsSummaryCardToken"] = GENERAL_TACTICS_SUMMARY_CARD_TOKEN
	summary["tacticsSummaryCardCount"] = general_tactics_summary_card_count()
	summary["tacticsSummaryCardMinHeight"] = int(general_tactics_summary_card_min_height())
	summary["tacticsSummaryCardMarginX"] = general_tactics_summary_card_margin_x()
	summary["tacticsSummaryCardMarginY"] = general_tactics_summary_card_margin_y()
	summary["tacticsSummaryCardColumnSpacing"] = general_tactics_summary_card_column_spacing()
	summary["tacticsSummaryCardTitleFontSize"] = general_tactics_summary_card_title_font_size()
	summary["tacticsSummaryCardValueFontSize"] = general_tactics_summary_card_value_font_size()
	summary["tacticsSummaryCardMetaFontSize"] = general_tactics_summary_card_meta_font_size()


static func apply_general_growth_entry_card_summary(summary: Dictionary) -> void:
	summary["growthEntryCardToken"] = GENERAL_GROWTH_ENTRY_CARD_TOKEN
	summary["growthEntryCardCount"] = general_growth_entry_card_count()
	summary["growthEntryCardMinHeight"] = int(general_growth_entry_card_min_height())
	summary["growthEntryCardMarginX"] = general_growth_entry_card_margin_x()
	summary["growthEntryCardMarginY"] = general_growth_entry_card_margin_y()
	summary["growthEntryCardColumnSpacing"] = general_growth_entry_card_column_spacing()
	summary["growthEntryCardTitleFontSize"] = general_growth_entry_card_title_font_size()
	summary["growthEntryCardValueFontSize"] = general_growth_entry_card_value_font_size()
	summary["growthEntryCardMetaFontSize"] = general_growth_entry_card_meta_font_size()


static func apply_general_growth_troop_arrow_button_summary(summary: Dictionary) -> void:
	summary["troopPreviewArrowButtonToken"] = GENERAL_GROWTH_TROOP_ARROW_BUTTON_TOKEN
	summary["troopPreviewArrowButtonCount"] = general_growth_troop_arrow_button_count()
	summary["troopPreviewArrowButtonLiveTextContract"] = "general_growth_troop_arrow_live_text_v1"
	summary["troopPreviewArrowButtonActionIds"] = "troop_preview_prev / troop_preview_next"
	var arrow_size := general_growth_troop_arrow_button_size()
	summary["troopPreviewArrowButtonWidth"] = int(arrow_size.x)
	summary["troopPreviewArrowButtonHeight"] = int(arrow_size.y)
	summary["troopPreviewArrowButtonFontSize"] = general_growth_troop_arrow_button_font_size()


static func apply_general_growth_troop_chip_summary(summary: Dictionary) -> void:
	summary["troopPreviewChipToken"] = GENERAL_GROWTH_TROOP_CHIP_TOKEN
	summary["troopPreviewChipCount"] = general_growth_troop_chip_count()
	summary["troopPreviewChipMinWidth"] = general_growth_troop_chip_min_width()
	summary["troopPreviewChipHeight"] = general_growth_troop_chip_height()
	summary["troopPreviewChipTextWidthPerChar"] = general_growth_troop_chip_text_width_per_char()
	summary["troopPreviewChipHorizontalPadding"] = general_growth_troop_chip_horizontal_padding()
	summary["troopPreviewChipMarginX"] = general_growth_troop_chip_margin_x()
	summary["troopPreviewChipMarginY"] = general_growth_troop_chip_margin_y()
	summary["troopPreviewChipFontSize"] = general_growth_troop_chip_font_size()


static func apply_general_roster_close_button_summary(summary: Dictionary) -> void:
	summary["rosterCloseButtonToken"] = GENERAL_ROSTER_CLOSE_BUTTON_TOKEN
	var close_size := general_profile_close_button_size()
	summary["rosterCloseButtonWidth"] = int(close_size.x)
	summary["rosterCloseButtonHeight"] = int(close_size.y)
	summary["rosterCloseButtonFontSize"] = general_profile_close_button_font_size()


static func apply_general_roster_detail_button_summary(summary: Dictionary) -> void:
	summary["rosterDetailButtonToken"] = GENERAL_ROSTER_DETAIL_BUTTON_TOKEN
	summary["rosterDetailButtonLiveTextContract"] = "general_roster_detail_live_text_v1"
	summary["rosterDetailButtonText"] = "详情"
	summary["rosterDetailButtonWidth"] = 92
	summary["rosterDetailButtonHeight"] = 42
	summary["rosterDetailButtonFontSize"] = 18


static func battle_report_detail_scroll_mode() -> String:
	return general_skill_library_mobile_touch_scroll_mode()


static func battle_report_detail_scroll_vertical_mode_value() -> int:
	return ScrollContainer.SCROLL_MODE_SHOW_NEVER


static func battle_report_detail_star_fallback_policy() -> String:
	return "data_star_or_blank_v1"


static func battle_report_detail_visual_stage_token() -> String:
	return BATTLE_REPORT_DETAIL_VISUAL_STAGE_TOKEN


static func battle_report_detail_result_focus_token() -> String:
	return BATTLE_REPORT_DETAIL_RESULT_FOCUS_TOKEN


static func battle_report_detail_team_card_token() -> String:
	return BATTLE_REPORT_DETAIL_TEAM_CARD_TOKEN


static func battle_report_detail_reward_panel_token() -> String:
	return BATTLE_REPORT_DETAIL_REWARD_PANEL_TOKEN


static func battle_report_detail_title_hierarchy_token() -> String:
	return BATTLE_REPORT_DETAIL_TITLE_HIERARCHY_TOKEN


static func battle_report_detail_time_marker_token() -> String:
	return BATTLE_REPORT_DETAIL_TIME_MARKER_TOKEN


static func battle_report_detail_card_density_token() -> String:
	return BATTLE_REPORT_DETAIL_CARD_DENSITY_TOKEN


static func battle_report_detail_card_composition_token() -> String:
	return BATTLE_REPORT_DETAIL_CARD_COMPOSITION_TOKEN


static func battle_report_detail_ai_living_feedback_token() -> String:
	return BATTLE_REPORT_DETAIL_AI_LIVING_FEEDBACK_TOKEN


static func battle_report_detail_ai_activity_continuity_token() -> String:
	return BATTLE_REPORT_DETAIL_AI_ACTIVITY_CONTINUITY_TOKEN


static func battle_report_ai_action_result_card_token() -> String:
	return BATTLE_REPORT_AI_ACTION_RESULT_CARD_TOKEN


static func chat_ai_activity_continuity_token() -> String:
	return CHAT_AI_ACTIVITY_CONTINUITY_TOKEN


static func ai_activity_same_trace_cross_surface_token() -> String:
	return AI_ACTIVITY_SAME_TRACE_CROSS_SURFACE_TOKEN


static func ai_activity_card_trace_continuity_ribbon_token() -> String:
	return AI_ACTIVITY_CARD_TRACE_CONTINUITY_RIBBON_TOKEN


static func ai_activity_identity_chip_token() -> String:
	return AI_ACTIVITY_IDENTITY_CHIP_TOKEN


static func ai_activity_carrying_troops_chip_contract() -> String:
	return AI_ACTIVITY_CARRYING_TROOPS_CHIP_CONTRACT


static func generated_troops_illustration_source() -> String:
	return GENERATED_TROOPS_ILLUSTRATION_SOURCE


static func generated_troop_illustration_for_label(troop_label: String) -> String:
	var normalized_label := troop_label.strip_edges()
	match normalized_label:
		"骑兵", "虎豹骑", "白马义从":
			return GENERATED_TROOPS_CAVALRY_ILLUSTRATION_PATH
		"弓兵", "弩兵", "诸葛连弩兵":
			return GENERATED_TROOPS_ARCHER_ILLUSTRATION_PATH
		"陷阵营":
			return GENERATED_TROOPS_TRAP_CAMP_ILLUSTRATION_PATH
		_:
			return GENERATED_TROOPS_INFANTRY_ILLUSTRATION_PATH


static func ai_avatar_status_frame_family_contract() -> String:
	return AI_AVATAR_STATUS_FRAME_FAMILY_CONTRACT


static func resolve_ai_avatar_status_frame_asset_path(status_dot: String) -> String:
	match status_dot.strip_edges().to_lower():
		"red", "failed", "failure", "error":
			return AI_AVATAR_STATUS_FRAME_FAILED_ASSET_PATH
		"yellow", "gold", "queued", "pending", "skipped":
			return AI_AVATAR_STATUS_FRAME_QUEUED_ASSET_PATH
		_:
			return AI_AVATAR_STATUS_FRAME_ACTIVE_ASSET_PATH


static func ai_avatar_intent_badge_combat_asset_path() -> String:
	return AI_AVATAR_INTENT_BADGE_COMBAT_ASSET_PATH


static func apply_ai_avatar_status_frame_family_summary(summary: Dictionary, prefix: String, status_frame_visible_count: int, intent_badge_visible_count: int, status_frame_asset_path: String = "") -> void:
	var resolved_prefix := prefix.strip_edges()
	if resolved_prefix == "":
		resolved_prefix = "aiActivity"
	summary["%sAvatarStatusFrameFamilyContract" % resolved_prefix] = ai_avatar_status_frame_family_contract()
	summary["%sAvatarStatusFrameVisibleCount" % resolved_prefix] = status_frame_visible_count
	summary["%sAvatarStatusFrameVisible" % resolved_prefix] = status_frame_visible_count > 0
	summary["%sAvatarStatusFrameAssetPath" % resolved_prefix] = status_frame_asset_path.strip_edges()
	summary["%sAvatarIntentBadgeVisibleCount" % resolved_prefix] = intent_badge_visible_count
	summary["%sAvatarIntentBadgeVisible" % resolved_prefix] = intent_badge_visible_count > 0


static func apply_ai_activity_carrying_troops_chip_summary(summary: Dictionary, prefix: String, chip_visible: bool, slot_count: int, texture_count: int, labels: Array, asset_paths: Array) -> void:
	var resolved_prefix := prefix.strip_edges()
	if resolved_prefix == "":
		resolved_prefix = "aiActivityCard"
	summary["%sCarryingTroopsChipContract" % resolved_prefix] = ai_activity_carrying_troops_chip_contract()
	summary["%sCarryingTroopsGeneratedAssetSource" % resolved_prefix] = generated_troops_illustration_source()
	summary["%sCarryingTroopsChipVisible" % resolved_prefix] = chip_visible
	summary["%sCarryingTroopsSlotCount" % resolved_prefix] = slot_count
	summary["%sCarryingTroopsTextureCount" % resolved_prefix] = texture_count
	summary["%sCarryingTroopsLabels" % resolved_prefix] = labels.duplicate()
	summary["%sCarryingTroopsAssetPaths" % resolved_prefix] = asset_paths.duplicate()


static func build_ai_activity_identity_chip(activity: Dictionary) -> Control:
	var node_prefix := str(activity.get("node_prefix", "AiActivityIdentity")).strip_edges()
	if node_prefix == "":
		node_prefix = "AiActivityIdentity"
	var surface := str(activity.get("surface", "unknown")).strip_edges()
	var status_dot := str(activity.get("status_dot", activity.get("status", "green"))).strip_edges()
	var phase_label := str(activity.get("phase_label", activity.get("status_label", "正在做"))).strip_edges()
	if phase_label == "":
		phase_label = "正在做"
	var task_text := str(activity.get("task_text", activity.get("current_task_text", ""))).strip_edges()
	if task_text == "":
		task_text = "等待 AI 行动回报"
	var trace_id := str(activity.get("trace_id", activity.get("first_trace_id", ""))).strip_edges()
	var trace_count := maxi(1, int(activity.get("trace_count", 1)))
	var trace_ids: Array = []
	var trace_ids_variant: Variant = activity.get("trace_ids", [])
	if trace_ids_variant is Array:
		trace_ids = (trace_ids_variant as Array).duplicate(true)
	var panel := PanelContainer.new()
	panel.name = "%sChip" % node_prefix
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, maxf(30.0, float(activity.get("min_height", 34))))
	panel.set_meta("ai_activity_identity_chip_token", ai_activity_identity_chip_token())
	panel.set_meta("ai_activity_identity_chip_surface", surface)
	panel.set_meta("ai_activity_identity_chip_trace_id", trace_id)
	panel.set_meta("ai_activity_identity_chip_trace_count", trace_count)
	panel.set_meta("ai_activity_identity_chip_task_text", task_text)
	panel.add_theme_stylebox_override("panel", _make_ai_activity_identity_chip_style(status_dot))

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", int(activity.get("margin_left", 8)))
	margin.add_theme_constant_override("margin_right", int(activity.get("margin_right", 8)))
	margin.add_theme_constant_override("margin_top", int(activity.get("margin_top", 4)))
	margin.add_theme_constant_override("margin_bottom", int(activity.get("margin_bottom", 4)))
	panel.add_child(margin)

	var row := HBoxContainer.new()
	row.name = str(activity.get("row_name", "%sRow" % node_prefix)).strip_edges()
	if row.name == "":
		row.name = "%sRow" % node_prefix
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", int(activity.get("separation", 6)))
	margin.add_child(row)

	var dot := Panel.new()
	dot.name = str(activity.get("status_dot_name", "%sStatusDot" % node_prefix)).strip_edges()
	if dot.name == "":
		dot.name = "%sStatusDot" % node_prefix
	dot.custom_minimum_size = Vector2(10, 10)
	dot.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	dot.add_theme_stylebox_override("panel", _make_ai_activity_identity_chip_dot_style(status_dot))
	row.add_child(dot)

	var status_label := Label.new()
	status_label.name = str(activity.get("status_label_name", "%sStatusLabel" % node_prefix)).strip_edges()
	if status_label.name == "":
		status_label.name = "%sStatusLabel" % node_prefix
	status_label.text = phase_label
	status_label.add_theme_font_size_override("font_size", int(activity.get("status_font_size", 13)))
	status_label.add_theme_color_override("font_color", Color(0.72, 0.90, 0.58, 0.98))
	row.add_child(status_label)

	var task_label := Label.new()
	task_label.name = str(activity.get("task_label_name", "%sTaskLabel" % node_prefix)).strip_edges()
	if task_label.name == "":
		task_label.name = "%sTaskLabel" % node_prefix
	task_label.text = task_text
	task_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	task_label.clip_text = true
	task_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	task_label.add_theme_font_size_override("font_size", int(activity.get("task_font_size", 14)))
	task_label.add_theme_color_override("font_color", Color(0.98, 0.93, 0.76, 1.0))
	row.add_child(task_label)

	var trace_label_suffix := str(activity.get("trace_label_suffix", "TraceLabel")).strip_edges()
	if trace_label_suffix == "":
		trace_label_suffix = "TraceLabel"
	var trace_label := Label.new()
	trace_label.name = str(activity.get("trace_label_name", "%s%s" % [node_prefix, trace_label_suffix])).strip_edges()
	if trace_label.name == "":
		trace_label.name = "%s%s" % [node_prefix, trace_label_suffix]
	trace_label.text = str(activity.get("trace_label", "行动 %d" % trace_count)).strip_edges()
	trace_label.set_meta("ai_activity_identity_chip_trace_id", trace_id)
	trace_label.set_meta("ai_activity_identity_chip_trace_count", trace_count)
	var legacy_trace_meta_prefix := str(activity.get("legacy_trace_meta_prefix", "")).strip_edges()
	if legacy_trace_meta_prefix != "":
		trace_label.set_meta("%s_trace_count" % legacy_trace_meta_prefix, trace_count)
		trace_label.set_meta("%s_trace_id" % legacy_trace_meta_prefix, trace_id)
		trace_label.set_meta("%s_trace_ids" % legacy_trace_meta_prefix, trace_ids.duplicate(true))
	trace_label.add_theme_font_size_override("font_size", int(activity.get("trace_font_size", 12)))
	trace_label.add_theme_color_override("font_color", Color(0.76, 0.70, 0.56, 0.94))
	row.add_child(trace_label)
	return panel


static func apply_ai_activity_identity_chip_summary(summary: Dictionary, prefix: String, visible_count: int) -> void:
	var resolved_prefix := prefix.strip_edges()
	if resolved_prefix == "":
		resolved_prefix = "aiActivity"
	summary["%sIdentityChipToken" % resolved_prefix] = ai_activity_identity_chip_token()
	summary["%sIdentityChipVisibleCount" % resolved_prefix] = visible_count
	summary["%sIdentityChipVisible" % resolved_prefix] = visible_count > 0


static func _make_ai_activity_identity_chip_style(status_dot: String) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	var accent := _ai_activity_identity_chip_accent(status_dot)
	style.bg_color = Color(0.13, 0.17, 0.12, 0.90)
	style.border_color = accent.darkened(0.18)
	style.set_border_width_all(1)
	style.set_corner_radius_all(6)
	style.content_margin_left = 4
	style.content_margin_right = 4
	style.content_margin_top = 2
	style.content_margin_bottom = 2
	return style


static func _make_ai_activity_identity_chip_dot_style(status_dot: String) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	var accent := _ai_activity_identity_chip_accent(status_dot)
	style.bg_color = accent
	style.border_color = accent.lightened(0.20)
	style.set_border_width_all(1)
	style.set_corner_radius_all(8)
	return style


static func _ai_activity_identity_chip_accent(status_dot: String) -> Color:
	match status_dot.strip_edges():
		"red", "failed":
			return Color(0.86, 0.33, 0.25, 0.96)
		"gold", "queued", "skipped":
			return Color(0.92, 0.70, 0.34, 0.96)
		"blue", "active":
			return Color(0.34, 0.62, 0.92, 0.96)
		_:
			return Color(0.42, 0.82, 0.48, 0.96)


static func battle_report_detail_meta_rows_token() -> String:
	return BATTLE_REPORT_DETAIL_META_ROWS_TOKEN


static func battle_report_coordinate_jump_button_token() -> String:
	return BATTLE_REPORT_COORDINATE_JUMP_BUTTON_TOKEN


static func battle_report_coordinate_jump_payload_contract() -> String:
	return BATTLE_REPORT_COORDINATE_JUMP_PAYLOAD_CONTRACT


static func battle_report_detail_reward_copy_mode() -> String:
	return BATTLE_REPORT_DETAIL_REWARD_COPY_MODE


static func battle_report_detail_hero_info_mode() -> String:
	return BATTLE_REPORT_DETAIL_HERO_INFO_MODE


static func battle_report_detail_search_visibility_mode() -> String:
	return BATTLE_REPORT_DETAIL_SEARCH_VISIBILITY_MODE


static func battle_report_detail_result_card_min_width() -> float:
	return 188.0


static func battle_report_detail_outcome_card_min_width() -> float:
	return 196.0


static func battle_report_detail_result_font_size() -> int:
	return 42


static func battle_report_detail_outcome_note_font_size() -> int:
	return 14


static func battle_report_detail_team_power_font_size() -> int:
	return 18


static func battle_report_detail_team_name_font_size() -> int:
	return 16


static func battle_report_detail_reward_title_font_size() -> int:
	return 20


static func battle_report_detail_reward_body_font_size() -> int:
	return 17


static func apply_battle_report_detail_scroll_container(scroll: ScrollContainer) -> void:
	apply_mobile_touch_scroll_container(scroll)


static func battle_report_detail_footer_button_min_width(role: String) -> float:
	match role:
		"share":
			return 104.0
		"favorite":
			return 104.0
		"replay":
			return 104.0
		"collapse":
			return 124.0
		_:
			return 104.0


static func battle_report_detail_footer_button_min_height() -> float:
	return 42.0


static func battle_report_detail_footer_button_font_size() -> int:
	return 15


static func apply_battle_report_detail_footer_button_style(button: Button, role: String) -> void:
	if button == null:
		return
	button.custom_minimum_size = Vector2(
		maxf(button.custom_minimum_size.x, battle_report_detail_footer_button_min_width(role)),
		maxf(button.custom_minimum_size.y, battle_report_detail_footer_button_min_height())
	)
	button.clip_text = false
	button.add_theme_font_size_override("font_size", battle_report_detail_footer_button_font_size())


static func battle_report_detail_empty_block_min_height() -> float:
	return 156.0


static func battle_report_detail_empty_block_title_font_size() -> int:
	return 16


static func battle_report_detail_empty_block_line_font_size() -> int:
	return 13


static func apply_battle_report_detail_empty_block_style(panel: PanelContainer, title_label: Label, line_label: Label = null) -> void:
	if panel != null:
		panel.custom_minimum_size = Vector2(0, battle_report_detail_empty_block_min_height())
	if title_label != null:
		title_label.add_theme_font_size_override("font_size", battle_report_detail_empty_block_title_font_size())
	if line_label != null:
		line_label.add_theme_font_size_override("font_size", battle_report_detail_empty_block_line_font_size())


static func apply_battle_report_detail_info_title_style(label: Label, accent_color: Color) -> void:
	if label == null:
		return
	label.autowrap_mode = TextServer.AUTOWRAP_OFF
	label.clip_text = true
	label.add_theme_font_size_override("font_size", battle_report_detail_below_fold_title_font_size())
	label.add_theme_color_override("font_color", accent_color)


static func apply_battle_report_detail_info_body_style(label: Label) -> void:
	if label == null:
		return
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.add_theme_font_size_override("font_size", battle_report_detail_info_label_font_size())
	label.add_theme_color_override("font_color", Color(0.86, 0.82, 0.72, 0.98))


static func apply_battle_report_detail_time_marker_label_style(label: Label) -> void:
	if label == null:
		return
	apply_battle_report_detail_info_body_style(label)
	label.add_theme_color_override("font_color", Color(0.92, 0.84, 0.64, 0.98))


static func apply_battle_report_detail_meta_label_style(label: Label) -> void:
	if label == null:
		return
	label.autowrap_mode = TextServer.AUTOWRAP_OFF
	label.clip_text = true
	label.add_theme_font_size_override("font_size", battle_report_detail_empty_block_line_font_size())
	label.add_theme_color_override("font_color", Color(0.70, 0.66, 0.56, 0.92))


static func apply_battle_report_detail_meta_value_style(label: Label) -> void:
	if label == null:
		return
	apply_battle_report_detail_info_body_style(label)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_color_override("font_color", Color(0.92, 0.88, 0.78, 0.98))


static func battle_report_coordinate_jump_button_min_size() -> Vector2:
	return Vector2(116, 44)


static func battle_report_coordinate_jump_button_font_size() -> int:
	return 16


static func apply_battle_report_detail_coordinate_jump_button_style(button: Button) -> void:
	if button == null:
		return
	button.custom_minimum_size = battle_report_coordinate_jump_button_min_size()
	button.clip_text = false
	button.focus_mode = Control.FOCUS_NONE
	button.add_theme_font_size_override("font_size", battle_report_coordinate_jump_button_font_size())
	apply_button_style(
		button,
		Color(0.28, 0.22, 0.10, 0.96),
		Color(0.76, 0.58, 0.26, 0.92),
		Color(0.98, 0.88, 0.58, 0.98),
		Color(0.54, 0.48, 0.34, 0.78),
		1,
		0.07,
		0.10
	)


static func battle_report_detail_structure_box_font_size() -> int:
	return 13


static func apply_battle_report_detail_structure_label_style(label: Label) -> void:
	if label == null:
		return
	label.add_theme_font_size_override("font_size", battle_report_detail_structure_box_font_size())


static func battle_report_detail_hero_card_min_height() -> float:
	return 404.0


static func battle_report_detail_hero_portrait_min_height() -> float:
	return 282.0


static func battle_report_detail_hero_role_font_size() -> int:
	return 15


static func battle_report_detail_info_label_font_size() -> int:
	return 14


static func battle_report_detail_hero_star_font_size() -> int:
	return 17


static func battle_report_detail_below_fold_spacer_min_height() -> float:
	return 96.0


static func battle_report_detail_below_fold_title_font_size() -> int:
	return 17


static func battle_report_detail_replay_button_font_size() -> int:
	return 15


static func battle_report_detail_round_timeline_title_font_size() -> int:
	return 16


static func battle_report_detail_round_item_title_font_size() -> int:
	return 14


static func battle_report_detail_round_summary_font_size() -> int:
	return 12


static func battle_report_detail_round_event_font_size() -> int:
	return 12


static func battle_report_detail_round_marker_size() -> Vector2:
	return Vector2(42, 28)


static func battle_report_detail_round_timeline_margin() -> Vector2:
	return Vector2(10, 8)


static func battle_report_detail_round_timeline_separation() -> int:
	return 8


static func apply_battle_report_detail_round_timeline_style(panel: PanelContainer, title_label: Label) -> void:
	if panel != null:
		panel.custom_minimum_size = Vector2(0, battle_report_detail_empty_block_min_height())
		panel.clip_contents = false
	if title_label != null:
		title_label.add_theme_font_size_override("font_size", battle_report_detail_round_timeline_title_font_size())
		title_label.add_theme_color_override("font_color", Color(0.96, 0.80, 0.48, 0.98))


static func apply_battle_report_detail_round_marker_style(label: Label) -> void:
	if label == null:
		return
	label.custom_minimum_size = battle_report_detail_round_marker_size()
	label.autowrap_mode = TextServer.AUTOWRAP_OFF
	label.clip_text = true
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 15)
	label.add_theme_color_override("font_color", Color(0.98, 0.84, 0.46, 1.0))


static func apply_battle_report_detail_round_item_title_style(label: Label) -> void:
	if label == null:
		return
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", battle_report_detail_round_item_title_font_size())
	label.add_theme_color_override("font_color", Color(0.92, 0.86, 0.74, 1.0))


static func apply_battle_report_detail_round_body_style(label: Label) -> void:
	if label == null:
		return
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.add_theme_font_size_override("font_size", battle_report_detail_round_summary_font_size())
	label.add_theme_color_override("font_color", Color(0.80, 0.80, 0.78, 0.96))


static func apply_battle_report_detail_round_event_actor_style(label: Label) -> void:
	if label == null:
		return
	label.custom_minimum_size = Vector2(46, 0)
	label.autowrap_mode = TextServer.AUTOWRAP_OFF
	label.clip_text = true
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", battle_report_detail_round_event_font_size())


static func battle_report_list_summary_min_height() -> float:
	return 46.0


static func battle_report_list_summary_font_size() -> int:
	return 11


static func apply_battle_report_list_summary_style(panel: PanelContainer, label: Label) -> void:
	if panel != null:
		panel.add_theme_stylebox_override("panel", make_surface_panel_style(Color(0.10, 0.10, 0.12, 0.90), Color(0.27, 0.27, 0.29, 0.92), 1, 0))
		panel.custom_minimum_size = Vector2(0, battle_report_list_summary_min_height())
	if label != null:
		label.add_theme_font_size_override("font_size", battle_report_list_summary_font_size())
		label.add_theme_color_override("font_color", Color(0.72, 0.72, 0.74, 0.94))


static func battle_report_empty_state_min_display_count() -> int:
	return 1


static func battle_report_empty_state_detail_contract_required() -> bool:
	return true


static func battle_report_empty_state_preview_report_id() -> String:
	return "preview_empty_state"


static func battle_report_list_utility_rail_width() -> float:
	return 48.0


static func battle_report_list_utility_separation() -> int:
	return 4


static func battle_report_filter_button_min_height() -> float:
	return 84.0


static func battle_report_filter_button_font_size() -> int:
	return 14


static func apply_battle_report_filter_button_style(button: Button) -> void:
	if button == null:
		return
	button.custom_minimum_size = Vector2(button.custom_minimum_size.x, battle_report_filter_button_min_height())
	button.alignment = HORIZONTAL_ALIGNMENT_CENTER
	button.add_theme_font_size_override("font_size", battle_report_filter_button_font_size())
	apply_button_style(
		button,
		Color(0.17, 0.17, 0.19, 0.95),
		Color(0.52, 0.52, 0.54, 0.94),
		Color(0.92, 0.92, 0.94, 0.98),
		Color(0.62, 0.62, 0.64, 0.88),
		0,
		0.06,
		0.06
	)


static func apply_battle_report_list_utility_rail_style(rail: VBoxContainer) -> void:
	if rail == null:
		return
	rail.custom_minimum_size = Vector2(battle_report_list_utility_rail_width(), 0)
	rail.add_theme_constant_override("separation", battle_report_list_utility_separation())


static func battle_report_scroll_hint_font_size() -> int:
	return 18


static func apply_battle_report_scroll_hint_shell_style(panel: PanelContainer) -> void:
	if panel == null:
		return
	panel.add_theme_stylebox_override("panel", make_surface_panel_style(Color(0.15, 0.15, 0.17, 0.94), Color(0.44, 0.44, 0.46, 0.92), 1, 0))


static func apply_battle_report_scroll_hint_label_style(label: Label) -> void:
	if label == null:
		return
	label.add_theme_color_override("font_color", Color(0.90, 0.90, 0.92, 0.96))
	label.add_theme_font_size_override("font_size", battle_report_scroll_hint_font_size())
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER


static func battle_report_list_card_min_height() -> float:
	return 318.0


static func battle_report_list_card_margin_x() -> int:
	return 10


static func battle_report_list_card_margin_y() -> int:
	return 8


static func battle_report_list_card_column_spacing() -> int:
	return 8


static func battle_report_list_card_body_spacing() -> int:
	return 8


static func battle_report_list_card_header_spacing() -> int:
	return 5


static func battle_report_list_card_badge_size() -> Vector2:
	return Vector2(58, 30)


static func battle_report_list_card_badge_font_size() -> int:
	return 16


static func battle_report_list_card_title_font_size() -> int:
	return 18


static func battle_report_list_card_location_font_size() -> int:
	return 15


static func battle_report_list_structure_box_font_size() -> int:
	return 15


static func battle_report_list_structure_box_margin_x() -> int:
	return 8


static func battle_report_list_structure_box_margin_y() -> int:
	return 8


static func battle_report_list_team_cluster_min_height() -> float:
	return 252.0


static func apply_battle_report_list_team_cluster_frame(panel: Control) -> void:
	if panel == null:
		return
	panel.clip_contents = false


static func battle_report_list_team_title_font_size() -> int:
	return 18


static func battle_report_list_team_power_font_size() -> int:
	return 16


static func battle_report_list_hero_slot_size() -> Vector2:
	return Vector2(150, 208)


static func battle_report_list_hero_portrait_stage_height() -> float:
	return 202.0


static func battle_report_list_hero_fallback_font_size() -> int:
	return 15


static func battle_report_list_hero_star_font_size() -> int:
	return 13


static func battle_report_list_hero_name_font_size() -> int:
	return 16


static func battle_report_list_hero_level_font_size() -> int:
	return 14


static func battle_report_list_hero_info_plate_min_height() -> float:
	return 42.0


static func battle_report_list_result_cluster_size() -> Vector2:
	return Vector2(164, 238)


static func battle_report_list_result_note_font_size() -> int:
	return 13


static func battle_report_list_result_text_font_size() -> int:
	return 34


static func battle_report_list_result_meta_font_size() -> int:
	return 13


static func battle_report_list_detail_entry_font_size() -> int:
	return 15


static func battle_report_list_detail_entry_target_page() -> String:
	return "detail"


static func battle_report_list_selected_expand_label() -> String:
	return "已选"


static func battle_report_list_default_expand_label() -> String:
	return "展开"


static func battle_report_list_utility_cluster_size() -> Vector2:
	return Vector2(46, 212)


static func battle_report_list_utility_index_size() -> Vector2:
	return Vector2(0, 34)


static func battle_report_list_utility_expand_size() -> Vector2:
	return Vector2(0, 56)


static func apply_battle_report_list_card_button_style(button: Button, is_selected: bool) -> void:
	if button == null:
		return
	button.custom_minimum_size = Vector2(0, battle_report_list_card_min_height())
	button.alignment = HORIZONTAL_ALIGNMENT_LEFT
	button.clip_text = false
	button.clip_contents = false
	var bg := Color(0.14, 0.14, 0.16, 0.97) if is_selected else Color(0.11, 0.11, 0.12, 0.95)
	var border := Color(0.68, 0.58, 0.28, 0.98) if is_selected else Color(0.30, 0.30, 0.32, 0.92)
	var font_color := Color(0.96, 0.94, 0.90, 1.0) if is_selected else Color(0.94, 0.94, 0.95, 1.0)
	var normal_style := make_surface_panel_style(bg, border, 1, 0)
	button.add_theme_stylebox_override("normal", normal_style)
	var hover_style: StyleBoxFlat = normal_style.duplicate()
	hover_style.bg_color = bg.lightened(0.06)
	button.add_theme_stylebox_override("hover", hover_style)
	var pressed_style: StyleBoxFlat = normal_style.duplicate()
	pressed_style.bg_color = bg.darkened(0.06)
	button.add_theme_stylebox_override("pressed", pressed_style)
	button.add_theme_stylebox_override("focus", pressed_style)
	button.add_theme_stylebox_override("disabled", normal_style)
	button.add_theme_color_override("font_color", font_color)
	button.add_theme_color_override("font_hover_color", font_color)
	button.add_theme_color_override("font_pressed_color", font_color)


static func apply_battle_report_list_structure_box_style(panel: PanelContainer) -> void:
	if panel == null:
		return
	panel.add_theme_stylebox_override("panel", make_surface_panel_style(Color(0.13, 0.13, 0.15, 0.94), Color(0.36, 0.36, 0.38, 0.92), 1, 0))


static func apply_battle_report_list_structure_label_style(label: Label) -> void:
	if label == null:
		return
	label.add_theme_font_size_override("font_size", battle_report_list_structure_box_font_size())
	label.add_theme_color_override("font_color", Color(0.86, 0.86, 0.88, 0.96))


static func apply_battle_report_list_source_badge_style(panel: PanelContainer, label: Label) -> void:
	if panel == null:
		return
	panel.custom_minimum_size = battle_report_list_card_badge_size()
	panel.size_flags_horizontal = 0
	panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	panel.clip_contents = true
	panel.add_theme_stylebox_override("panel", make_surface_panel_style(Color(0.16, 0.16, 0.18, 0.96), Color(0.52, 0.52, 0.58, 0.96), 1, 0))
	if label == null:
		return
	label.autowrap_mode = TextServer.AUTOWRAP_OFF
	label.clip_text = true
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", battle_report_list_card_badge_font_size())
	label.add_theme_color_override("font_color", Color(0.98, 0.98, 1.0, 0.98))


static func apply_battle_report_list_hero_info_plate_style(panel: PanelContainer) -> void:
	if panel == null:
		return
	panel.custom_minimum_size = Vector2(0, battle_report_list_hero_info_plate_min_height())
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = 0
	panel.add_theme_stylebox_override("panel", make_surface_panel_style(Color(0.04, 0.035, 0.03, 0.74), Color(0.86, 0.64, 0.28, 0.58), 1, 0))


static func apply_battle_report_list_detail_entry_label_style(label: Label) -> void:
	if label == null:
		return
	label.add_theme_font_size_override("font_size", battle_report_list_detail_entry_font_size())
	label.add_theme_color_override("font_color", Color(0.92, 0.82, 0.58, 0.96))
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER


static func apply_shell_icon_button(button: Button, icon_texture: Texture2D, min_width: float = 0.0) -> void:
	if button == null:
		return
	if min_width > 0.0:
		button.custom_minimum_size = Vector2(min_width, 0.0)
	button.icon = icon_texture
	button.expand_icon = true
	button.icon_alignment = HORIZONTAL_ALIGNMENT_LEFT
	button.add_theme_constant_override("h_separation", 8)


static func apply_shell_tab_state(button: Button, is_active: bool) -> void:
	if button == null:
		return
	var font_color := Color(0.95, 0.90, 0.78, 1.0) if is_active else Color(0.76, 0.74, 0.70, 0.96)
	button.add_theme_color_override("font_color", font_color)
	button.add_theme_color_override("font_hover_color", font_color)
	button.add_theme_color_override("font_pressed_color", font_color)
	button.modulate = Color(1, 1, 1, 1.0) if is_active else Color(0.88, 0.88, 0.88, 0.94)


static func make_label(
	text: String,
	size: int,
	color: Color,
	align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT,
	wrap: bool = true
) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	label.horizontal_alignment = align
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if wrap else TextServer.AUTOWRAP_OFF
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return label


static func apply_button_style(
	button: Button,
	bg: Color,
	border: Color,
	font_color: Color,
	disabled_font_color: Color,
	radius: int = 4,
	hover_lighten: float = 0.0,
	pressed_darken: float = 0.0
) -> void:
	var normal := StyleBoxFlat.new()
	normal.bg_color = bg
	normal.border_color = border
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(radius)
	button.add_theme_stylebox_override("normal", normal)
	var hover: StyleBoxFlat = normal.duplicate()
	if hover_lighten > 0.0:
		hover.bg_color = bg.lightened(hover_lighten)
	button.add_theme_stylebox_override("hover", hover)
	var pressed: StyleBoxFlat = normal.duplicate()
	if pressed_darken > 0.0:
		pressed.bg_color = bg.darkened(pressed_darken)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("disabled", normal.duplicate())
	button.add_theme_color_override("font_color", font_color)
	button.add_theme_color_override("font_hover_color", font_color)
	button.add_theme_color_override("font_pressed_color", font_color)
	button.add_theme_color_override("font_disabled_color", disabled_font_color)


static func apply_internal_command_button_style(
	button: Button,
	bg: Color,
	border: Color,
	font_color: Color,
	disabled_font_color: Color,
	radius: int = 5,
	border_width: int = 1,
	margin_x: int = 10,
	margin_y: int = 6,
	hover_lighten: float = 0.04,
	pressed_darken: float = 0.08
) -> void:
	if button == null:
		return
	var normal := StyleBoxFlat.new()
	normal.bg_color = bg
	normal.border_color = border
	normal.set_border_width_all(border_width)
	normal.set_corner_radius_all(radius)
	normal.content_margin_left = margin_x
	normal.content_margin_right = margin_x
	normal.content_margin_top = margin_y
	normal.content_margin_bottom = margin_y
	normal.shadow_color = Color(0.0, 0.0, 0.0, 0.30)
	normal.shadow_size = 4
	normal.shadow_offset = Vector2(0, 2)
	button.add_theme_stylebox_override("normal", normal)
	var hover: StyleBoxFlat = normal.duplicate()
	if hover_lighten > 0.0:
		hover.bg_color = bg.lightened(hover_lighten)
	button.add_theme_stylebox_override("hover", hover)
	var pressed: StyleBoxFlat = normal.duplicate()
	if pressed_darken > 0.0:
		pressed.bg_color = bg.darkened(pressed_darken)
	pressed.shadow_offset = Vector2(0, 1)
	button.add_theme_stylebox_override("pressed", pressed)
	var disabled_style: StyleBoxFlat = normal.duplicate()
	disabled_style.bg_color = bg.darkened(0.22)
	disabled_style.border_color = border.darkened(0.22)
	button.add_theme_stylebox_override("disabled", disabled_style)
	button.add_theme_color_override("font_color", font_color)
	button.add_theme_color_override("font_hover_color", font_color.lightened(0.08))
	button.add_theme_color_override("font_pressed_color", font_color.darkened(0.04))
	button.add_theme_color_override("font_disabled_color", disabled_font_color)


static func ensure_internal_command_prefix(text: String, prefix: String) -> String:
	var trimmed := text.strip_edges()
	if trimmed == "" or prefix == "":
		return text
	if trimmed.begins_with(prefix.strip_edges()):
		return text
	var line_break := text.find("\n")
	if line_break >= 0:
		var first_line := text.substr(0, line_break).strip_edges()
		var rest := text.substr(line_break)
		if first_line.begins_with(prefix.strip_edges()):
			return text
		return "%s %s%s" % [prefix, first_line, rest]
	return "%s %s" % [prefix, trimmed]


static func internal_command_prefix_for_label(text: String) -> String:
	var label := text.split("\n")[0].strip_edges()
	match label:
		"返回":
			return "‹"
		"关闭":
			return "×"
		"重置":
			return "↺"
		"攻略":
			return "?"
		"分享":
			return "⇄"
		"传承":
			return "令"
		"详情":
			return "◆"
		"查找", "搜索":
			return "⌕"
		"清空":
			return "×"
		"展开":
			return "+"
		"收起":
			return "-"
		_:
			return "令" if label.find("招募") >= 0 or label.find("单招") >= 0 or label.find("五连") >= 0 else ""


static func interior_building_tree_node_min_width() -> float:
	return 180.0


static func interior_home_entry_button_min_width() -> float:
	return 210.0


static func interior_home_entry_button_min_height() -> float:
	return 96.0


static func interior_home_entry_button_font_size() -> int:
	return 21


static func interior_home_entry_button_grid_separation() -> int:
	return 16


static func interior_home_resource_chip_min_width() -> float:
	return 150.0


static func interior_home_resource_chip_min_height() -> float:
	return 44.0


static func interior_home_resource_chip_font_size() -> int:
	return 16


static func interior_secondary_page_card_min_height() -> float:
	return 132.0


static func interior_secondary_page_card_min_width() -> float:
	return 320.0


static func interior_secondary_page_title_font_size() -> int:
	return 24


static func interior_secondary_page_card_title_font_size() -> int:
	return 18


static func interior_secondary_page_body_font_size() -> int:
	return 15


static func interior_secondary_page_grid_separation() -> int:
	return 14


static func interior_market_overview_primary_font_size() -> int:
	return 26


static func interior_market_overview_value_font_size() -> int:
	return 28


static func interior_market_overview_symbol_font_size() -> int:
	return 30


static func interior_market_overview_card_min_height() -> float:
	return 148.0


static func interior_market_overview_card_min_width() -> float:
	return 278.0


static func interior_building_tree_node_min_height() -> float:
	return 108.0


static func interior_building_tree_node_line_spacing() -> int:
	return 4


static func interior_building_tree_node_content_margin_x() -> int:
	return 12


static func interior_building_tree_node_content_margin_y() -> int:
	return 9


static func interior_building_tree_node_default_border_width() -> int:
	return 1


static func interior_building_tree_node_selected_border_width() -> int:
	return 2


static func interior_building_tree_node_disabled_alpha_percent() -> int:
	return 62


static func interior_building_tree_column_count() -> int:
	return 3


static func interior_building_tree_row_separation() -> int:
	return 18


static func interior_building_tree_column_separation() -> int:
	return 22


static func interior_building_tree_connector_width() -> float:
	return 54.0


static func interior_building_tree_connector_thickness() -> float:
	return 2.0


static func main_city_facility_tree_icon_font_size() -> int:
	return 24


static func main_city_facility_tree_asset_node_min_width() -> float:
	return 214.0


static func main_city_facility_tree_asset_node_min_height() -> float:
	return 178.0


static func main_city_facility_tree_node_texture_width() -> float:
	return 178.0


static func main_city_facility_tree_node_texture_height() -> float:
	return 112.0


static func main_city_facility_tree_node_baseline_ratio() -> float:
	return 0.53


static func main_city_facility_tree_scroll_stage_width() -> float:
	return 1500.0


static func main_city_facility_tree_scroll_stage_height() -> float:
	return 1320.0


static func main_city_facility_tree_scroll_initial_visible_tiers() -> int:
	return 3


static func main_city_facility_tree_row_rhythm_px() -> int:
	return 230


static func main_city_facility_tree_locked_alpha_percent() -> int:
	return 36


static func main_city_facility_tree_upgradable_glow_alpha_percent() -> int:
	return 46


static func main_city_facility_tree_vertical_tier_separation() -> int:
	return 0


static func main_city_facility_tree_vertical_row_separation() -> int:
	return 52


static func main_city_facility_tree_vertical_connector_height() -> float:
	return 62.0


static func main_city_facility_tree_background_opacity_percent() -> int:
	return 100


static func main_city_facility_tree_chrome_button_min_width() -> float:
	return 112.0


static func main_city_facility_tree_chrome_button_min_height() -> float:
	return 52.0


static func main_city_facility_tree_chrome_button_font_size() -> int:
	return 20


static func interior_building_tree_panel_min_width() -> float:
	return 1180.0


static func interior_building_tree_panel_min_height() -> float:
	return 560.0


static func interior_building_tree_title_font_size() -> int:
	return 20


static func interior_building_tree_badge_font_size() -> int:
	return 13


static func interior_building_tree_node_font_size() -> int:
	return 16


static func interior_building_tree_node_label_line_count() -> int:
	return 4


static func interior_building_tree_node_title_font_size() -> int:
	return 17


static func interior_building_tree_node_level_font_size() -> int:
	return 15


static func interior_building_tree_node_status_font_size() -> int:
	return 14


static func interior_building_tree_node_meta_font_size() -> int:
	return 13


static func interior_upgrade_sheet_min_width() -> float:
	return 360.0


static func interior_upgrade_sheet_min_height() -> float:
	return 390.0


static func interior_upgrade_sheet_title_font_size() -> int:
	return 26


static func interior_upgrade_sheet_body_font_size() -> int:
	return 17


static func interior_upgrade_sheet_action_button_min_height() -> float:
	return 52.0


static func interior_upgrade_sheet_state_label_min_height() -> float:
	return 34.0


static func interior_upgrade_sheet_state_label_font_size() -> int:
	return 14


static func interior_upgrade_sheet_action_row_separation() -> int:
	return 10


static func main_city_facility_upgrade_drawer_token() -> String:
	return MAIN_CITY_FACILITY_TREE_UPGRADE_DRAWER_TOKEN


static func main_city_facility_upgrade_drawer_card_min_height() -> int:
	return 72


static func main_city_facility_upgrade_drawer_card_spacing() -> int:
	return 7


static func main_city_facility_upgrade_drawer_pill_min_height() -> int:
	return 46


static func main_city_facility_upgrade_drawer_pill_min_width() -> int:
	return 118


static func main_city_facility_upgrade_drawer_caption_font_size() -> int:
	return 15


static func main_city_facility_upgrade_drawer_value_font_size() -> int:
	return 22


static func interior_compact_summary_line_count() -> int:
	return 4


static func interior_facility_node_min_width() -> float:
	return 116.0


static func interior_facility_node_min_height() -> float:
	return 74.0


static func interior_facility_node_hub_rows() -> int:
	return 2


static func interior_facility_node_hub_title_font_size() -> int:
	return 18


static func interior_facility_node_button_font_size() -> int:
	return 15


static func interior_facility_node_hub_spacing() -> int:
	return 10


static func apply_interior_facility_node_hub_panel_style(panel: Control) -> void:
	if panel == null:
		return
	panel.custom_minimum_size = Vector2(0, 184)
	if panel is PanelContainer:
		(panel as PanelContainer).add_theme_stylebox_override(
			"panel",
			make_surface_panel_style(Color(0.050, 0.047, 0.042, 0.95), Color(0.58, 0.45, 0.22, 0.52), 1, 4)
		)


static func apply_interior_facility_node_hub_title_style(label: Label) -> void:
	if label == null:
		return
	label.add_theme_font_size_override("font_size", interior_facility_node_hub_title_font_size())
	label.add_theme_color_override("font_color", Color(0.94, 0.84, 0.58, 1.0))


static func apply_interior_facility_node_button_style(button: Button, active: bool) -> void:
	if button == null:
		return
	button.custom_minimum_size = Vector2(interior_facility_node_min_width(), interior_facility_node_min_height())
	button.add_theme_font_size_override("font_size", interior_facility_node_button_font_size())
	var bg := Color(0.090, 0.074, 0.058, 0.96)
	var border := Color(0.52, 0.40, 0.20, 0.58)
	if active:
		bg = Color(0.205, 0.125, 0.060, 0.98)
		border = Color(0.96, 0.72, 0.26, 0.88)
	apply_button_style(
		button,
		bg,
		border,
		Color(0.94, 0.90, 0.80, 1.0),
		Color(0.58, 0.55, 0.49, 1.0),
		4,
		0.05,
		0.08
	)


static func apply_interior_building_tree_panel_style(panel: Control) -> void:
	if panel == null:
		return
	panel.custom_minimum_size = Vector2(interior_building_tree_panel_min_width(), interior_building_tree_panel_min_height())
	if panel is PanelContainer:
		(panel as PanelContainer).add_theme_stylebox_override(
			"panel",
			make_surface_panel_style(Color(0.130, 0.088, 0.044, 0.92), Color(0.78, 0.54, 0.24, 0.66), 1, 4)
		)


static func apply_main_city_facility_tree_atmosphere_panel_style(panel: Control) -> void:
	if panel == null:
		return
	panel.custom_minimum_size = Vector2(interior_building_tree_panel_min_width(), interior_building_tree_panel_min_height())
	if panel is PanelContainer:
		(panel as PanelContainer).add_theme_stylebox_override(
			"panel",
			make_surface_panel_style(Color(0.110, 0.074, 0.036, 0.10), Color(0.86, 0.60, 0.26, 0.66), 1, 4)
		)


static func apply_interior_building_tree_scroll_style(scroll: ScrollContainer) -> void:
	if scroll == null:
		return
	scroll.custom_minimum_size = Vector2(0, 0)
	scroll.horizontal_scroll_mode = 3
	scroll.vertical_scroll_mode = 3


static func apply_interior_building_tree_list_style(list_container: VBoxContainer) -> void:
	if list_container == null:
		return
	list_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list_container.add_theme_constant_override("separation", interior_building_tree_row_separation())


static func apply_interior_building_tree_detail_panel_style(detail_panel: Control) -> void:
	if detail_panel == null:
		return
	detail_panel.visible = true
	detail_panel.custom_minimum_size = Vector2(interior_upgrade_sheet_min_width(), interior_upgrade_sheet_min_height())
	if detail_panel is PanelContainer:
		(detail_panel as PanelContainer).add_theme_stylebox_override(
			"panel",
			make_surface_panel_style(Color(0.060, 0.052, 0.040, 0.94), Color(0.72, 0.50, 0.22, 0.70), 1, 6)
		)


static func apply_interior_building_tree_connector_style(line: ColorRect) -> void:
	if line == null:
		return
	line.custom_minimum_size = Vector2(interior_building_tree_connector_width(), interior_building_tree_connector_thickness())
	line.color = Color(0.75, 0.56, 0.24, 0.64)


static func apply_interior_building_tree_connector_layer_style(line: ColorRect, role: String) -> void:
	if line == null:
		return
	var normalized_role := str(role).strip_edges().to_lower()
	match normalized_role:
		"vertical":
			line.custom_minimum_size = Vector2(interior_building_tree_connector_thickness(), interior_building_tree_node_min_height() * 2 + interior_building_tree_row_separation())
			line.color = Color(0.62, 0.49, 0.28, 0.42)
		_:
			line.custom_minimum_size = Vector2(interior_building_tree_connector_width(), interior_building_tree_connector_thickness())
			line.color = Color(0.86, 0.62, 0.24, 0.74)


static func apply_main_city_facility_tree_background_style(texture_rect: TextureRect, opacity_percent: int) -> void:
	if texture_rect == null:
		return
	texture_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	texture_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	texture_rect.modulate = Color(1, 1, 1, clampi(opacity_percent, 0, 100) / 100.0)


static func apply_main_city_facility_tree_scroll_background_style(texture_rect: TextureRect, opacity_percent: int) -> void:
	if texture_rect == null:
		return
	texture_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	texture_rect.stretch_mode = TextureRect.STRETCH_SCALE
	texture_rect.modulate = Color(1, 1, 1, clampi(opacity_percent, 0, 100) / 100.0)


static func apply_main_city_facility_tree_line_graph_backdrop_style(rect: ColorRect) -> void:
	if rect == null:
		return
	rect.color = Color(0.166, 0.122, 0.072, 0.82)
	rect.custom_minimum_size = Vector2(main_city_facility_tree_scroll_stage_width(), main_city_facility_tree_scroll_stage_height())


static func apply_main_city_facility_tree_scroll_stage_style(stage: Control) -> void:
	if stage == null:
		return
	stage.custom_minimum_size = Vector2(main_city_facility_tree_scroll_stage_width(), main_city_facility_tree_scroll_stage_height())
	stage.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	stage.size_flags_vertical = Control.SIZE_SHRINK_BEGIN


static func apply_main_city_facility_tree_line_graph_connector_style(line: ColorRect, role: String, length: float = 0.0) -> void:
	if line == null:
		return
	var normalized_role := str(role).strip_edges().to_lower()
	var thickness := 2.0
	if normalized_role == "axis":
		thickness = 2.0
		line.color = Color(0.58, 0.60, 0.58, 0.34)
	elif normalized_role == "major":
		thickness = 2.0
		line.color = Color(0.47, 0.50, 0.49, 0.30)
	else:
		thickness = 1.0
		line.color = Color(0.66, 0.66, 0.62, 0.18)
	if normalized_role == "vertical" or normalized_role == "axis":
		line.custom_minimum_size = Vector2(thickness, maxf(length, 1.0))
	else:
		line.custom_minimum_size = Vector2(maxf(length, 1.0), thickness)


static func apply_main_city_facility_tree_vertical_connector_layer_style(line: ColorRect, role: String, branch_width: float = 0.0) -> void:
	if line == null:
		return
	var normalized_role := str(role).strip_edges().to_lower()
	if normalized_role == "horizontal":
		line.custom_minimum_size = Vector2(maxf(branch_width, main_city_facility_tree_asset_node_min_width()), interior_building_tree_connector_thickness())
		line.color = Color(0.92, 0.68, 0.28, 0.24)
	else:
		line.custom_minimum_size = Vector2(interior_building_tree_connector_thickness(), main_city_facility_tree_vertical_connector_height())
		line.color = Color(0.92, 0.68, 0.28, 0.28)


static func apply_main_city_facility_tree_chrome_button_style(button: Button, role: String = "") -> void:
	if button == null:
		return
	button.custom_minimum_size = Vector2(main_city_facility_tree_chrome_button_min_width(), main_city_facility_tree_chrome_button_min_height())
	button.add_theme_font_size_override("font_size", main_city_facility_tree_chrome_button_font_size())
	button.add_theme_color_override("font_color", Color(0.97, 0.90, 0.74, 1.0))
	button.add_theme_color_override("font_hover_color", Color(1.00, 0.94, 0.78, 1.0))
	button.add_theme_color_override("font_pressed_color", Color(1.00, 0.82, 0.48, 1.0))
	var border := Color(0.74, 0.55, 0.24, 0.86)
	if str(role).strip_edges().to_lower() == "close":
		border = Color(0.90, 0.24, 0.18, 0.86)
	var normal := make_surface_panel_style(Color(0.138, 0.090, 0.042, 0.94), border, 1, 6)
	var hover: StyleBoxFlat = normal.duplicate()
	hover.bg_color = normal.bg_color.lightened(0.05)
	var pressed: StyleBoxFlat = normal.duplicate()
	pressed.bg_color = normal.bg_color.darkened(0.08)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("focus", pressed)


static func apply_main_city_facility_tree_asset_node_button_style(button: Button, selected: bool, enabled: bool) -> void:
	if button == null:
		return
	button.custom_minimum_size = Vector2(main_city_facility_tree_asset_node_min_width(), main_city_facility_tree_asset_node_min_height())
	button.add_theme_font_size_override("font_size", interior_building_tree_node_font_size())
	button.alignment = HORIZONTAL_ALIGNMENT_CENTER
	button.clip_text = false
	button.modulate = Color(1, 1, 1, 1.0) if enabled else Color(0.62, 0.62, 0.60, float(main_city_facility_tree_locked_alpha_percent()) / 100.0)
	var bg := Color(0.120, 0.076, 0.036, 0.0)
	var border := Color(0.0, 0.0, 0.0, 0.0)
	var border_width := 0
	if not enabled:
		bg = Color(0.120, 0.076, 0.036, 0.0)
		border = Color(0.0, 0.0, 0.0, 0.0)
	elif selected:
		bg = Color(0.210, 0.126, 0.050, 0.94)
		border = Color(1.00, 0.76, 0.30, 0.94)
		border_width = 2
	var normal := make_surface_panel_style(bg, border, border_width, 8)
	normal.content_margin_left = 10
	normal.content_margin_top = 10
	normal.content_margin_right = 10
	normal.content_margin_bottom = 10
	var hover: StyleBoxFlat = normal.duplicate()
	if enabled and not selected:
		hover.bg_color = Color(0.160, 0.102, 0.046, 0.42)
		hover.border_color = Color(0.88, 0.62, 0.24, 0.36)
		hover.border_width_left = 1
		hover.border_width_top = 1
		hover.border_width_right = 1
		hover.border_width_bottom = 1
	else:
		hover.bg_color = bg.lightened(0.05)
	var pressed: StyleBoxFlat = normal.duplicate()
	pressed.bg_color = bg.darkened(0.08)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("focus", pressed)
	button.add_theme_stylebox_override("disabled", normal.duplicate())
	button.add_theme_color_override("font_color", Color(0.94, 0.90, 0.80, 1.0))
	button.add_theme_color_override("font_disabled_color", Color(0.58, 0.55, 0.49, 1.0))


static func apply_main_city_facility_tree_node_state_overlay_style(rect: ColorRect, state: String, selected: bool, enabled: bool) -> void:
	if rect == null:
		return
	var normalized_state := str(state).strip_edges().to_lower()
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	rect.offset_left = 16.0
	rect.offset_top = 12.0
	rect.offset_right = -16.0
	rect.offset_bottom = -12.0
	rect.color = Color(0, 0, 0, 0)
	rect.visible = false
	if not enabled or normalized_state == "locked":
		rect.color = Color(0.035, 0.038, 0.040, 0.06)
		rect.visible = selected
	elif normalized_state == "upgradable":
		var alpha := float(main_city_facility_tree_upgradable_glow_alpha_percent()) / 100.0
		rect.color = Color(0.92, 0.58, 0.17, alpha if selected else alpha * 0.14)
		rect.visible = true


static func apply_main_city_facility_tree_node_texture_style(texture_rect: TextureRect, enabled: bool, state: String = "") -> void:
	if texture_rect == null:
		return
	var normalized_state := str(state).strip_edges().to_lower()
	texture_rect.custom_minimum_size = Vector2(main_city_facility_tree_node_texture_width(), main_city_facility_tree_node_texture_height())
	texture_rect.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	texture_rect.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	texture_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	texture_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	if not enabled or normalized_state == "locked":
		texture_rect.modulate = Color(0.62, 0.62, 0.60, 0.34)
	else:
		texture_rect.modulate = Color(1, 1, 1, 1.0)


static func apply_interior_building_tree_title_style(label: Label) -> void:
	if label == null:
		return
	label.add_theme_font_size_override("font_size", interior_building_tree_title_font_size())
	label.add_theme_color_override("font_color", Color(0.94, 0.84, 0.58, 1.0))


static func apply_interior_building_tree_badge_style(label: Label) -> void:
	if label == null:
		return
	label.add_theme_font_size_override("font_size", interior_building_tree_badge_font_size())
	label.add_theme_color_override("font_color", Color(0.74, 0.68, 0.54, 1.0))


static func apply_interior_building_tree_node_button_style(button: Button, selected: bool, enabled: bool) -> void:
	if button == null:
		return
	button.custom_minimum_size = Vector2(interior_building_tree_node_min_width(), interior_building_tree_node_min_height())
	button.add_theme_font_size_override("font_size", interior_building_tree_node_font_size())
	button.add_theme_constant_override("line_spacing", interior_building_tree_node_line_spacing())
	button.alignment = HORIZONTAL_ALIGNMENT_CENTER
	button.clip_text = false
	button.modulate = Color(1, 1, 1, 1.0 if enabled else float(interior_building_tree_node_disabled_alpha_percent()) / 100.0)
	var bg := Color(0.085, 0.080, 0.069, 0.96)
	var border := Color(0.50, 0.40, 0.20, 0.52)
	var border_width := interior_building_tree_node_default_border_width()
	if not enabled:
		bg = Color(0.048, 0.046, 0.042, 0.90)
		border = Color(0.26, 0.24, 0.20, 0.72)
	elif selected:
		bg = Color(0.170, 0.120, 0.060, 0.98)
		border = Color(0.95, 0.72, 0.28, 0.88)
		border_width = interior_building_tree_node_selected_border_width()
	var normal := make_surface_panel_style(bg, border, border_width, 4)
	normal.content_margin_left = interior_building_tree_node_content_margin_x()
	normal.content_margin_top = interior_building_tree_node_content_margin_y()
	normal.content_margin_right = interior_building_tree_node_content_margin_x()
	normal.content_margin_bottom = interior_building_tree_node_content_margin_y()
	button.add_theme_stylebox_override("normal", normal)
	var hover: StyleBoxFlat = normal.duplicate()
	hover.bg_color = bg.lightened(0.06)
	button.add_theme_stylebox_override("hover", hover)
	var pressed: StyleBoxFlat = normal.duplicate()
	pressed.bg_color = bg.darkened(0.08)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("focus", pressed)
	var disabled_style := make_surface_panel_style(Color(0.048, 0.046, 0.042, 0.90), Color(0.26, 0.24, 0.20, 0.72), interior_building_tree_node_default_border_width(), 4)
	disabled_style.content_margin_left = interior_building_tree_node_content_margin_x()
	disabled_style.content_margin_top = interior_building_tree_node_content_margin_y()
	disabled_style.content_margin_right = interior_building_tree_node_content_margin_x()
	disabled_style.content_margin_bottom = interior_building_tree_node_content_margin_y()
	button.add_theme_stylebox_override("disabled", disabled_style)
	button.add_theme_color_override("font_color", Color(0.94, 0.90, 0.80, 1.0))
	button.add_theme_color_override("font_hover_color", Color(0.96, 0.92, 0.82, 1.0))
	button.add_theme_color_override("font_pressed_color", Color(1.00, 0.89, 0.62, 1.0))
	button.add_theme_color_override("font_disabled_color", Color(0.58, 0.55, 0.49, 1.0))


static func apply_interior_building_tree_node_label_style(label: Label, role: String, selected: bool, enabled: bool) -> void:
	if label == null:
		return
	var normalized_role := str(role).strip_edges().to_lower()
	var font_size := interior_building_tree_node_meta_font_size()
	var font_color := Color(0.78, 0.74, 0.64, 1.0)
	match normalized_role:
		"icon":
			font_size = main_city_facility_tree_icon_font_size()
			font_color = Color(1.00, 0.82, 0.32, 1.0) if selected else Color(0.88, 0.74, 0.46, 1.0)
			label.custom_minimum_size = Vector2(48.0, 36.0)
			label.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
			var icon_bg := Color(0.105, 0.080, 0.040, 0.98) if selected else Color(0.060, 0.054, 0.044, 0.94)
			var icon_border := Color(0.95, 0.70, 0.26, 0.82) if selected else Color(0.58, 0.44, 0.22, 0.62)
			label.add_theme_stylebox_override("normal", make_surface_panel_style(icon_bg, icon_border, 1, 4))
		"title":
			font_size = interior_building_tree_node_title_font_size()
			font_color = Color(1.00, 0.88, 0.58, 1.0) if selected else Color(0.94, 0.90, 0.80, 1.0)
		"level":
			font_size = interior_building_tree_node_level_font_size()
			font_color = Color(0.92, 0.84, 0.66, 1.0) if selected else Color(0.86, 0.82, 0.74, 1.0)
		"status":
			font_size = interior_building_tree_node_status_font_size()
			font_color = Color(0.98, 0.78, 0.40, 1.0) if selected else Color(0.86, 0.76, 0.56, 1.0)
		"meta":
			font_size = interior_building_tree_node_meta_font_size()
			font_color = Color(0.84, 0.78, 0.66, 1.0)
	if not enabled:
		font_color = Color(0.56, 0.54, 0.49, 1.0)
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", font_color)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.autowrap_mode = TextServer.AUTOWRAP_OFF
	if normalized_role != "icon":
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL


static func apply_interior_upgrade_sheet_panel_style(panel: Control) -> void:
	if panel == null:
		return
	panel.custom_minimum_size = Vector2(interior_upgrade_sheet_min_width(), interior_upgrade_sheet_min_height())
	if panel is PanelContainer:
		(panel as PanelContainer).add_theme_stylebox_override(
			"panel",
			make_surface_panel_style(Color(0.128, 0.082, 0.038, 0.94), Color(0.96, 0.66, 0.24, 0.86), 1, 6)
		)


static func apply_interior_upgrade_sheet_title_style(label: Label) -> void:
	if label == null:
		return
	label.add_theme_font_size_override("font_size", interior_upgrade_sheet_title_font_size())
	label.add_theme_color_override("font_color", Color(0.95, 0.84, 0.60, 1.0))


static func apply_interior_upgrade_sheet_body_style(label: Label) -> void:
	if label == null:
		return
	label.add_theme_font_size_override("font_size", interior_upgrade_sheet_body_font_size())
	label.add_theme_color_override("font_color", Color(0.90, 0.87, 0.78, 1.0))


static func apply_interior_upgrade_sheet_state_label_style(label: Label, submitted: bool) -> void:
	if label == null:
		return
	label.custom_minimum_size = Vector2(0, interior_upgrade_sheet_state_label_min_height())
	label.add_theme_font_size_override("font_size", interior_upgrade_sheet_state_label_font_size())
	label.add_theme_color_override("font_color", Color(0.95, 0.78, 0.40, 1.0) if submitted else Color(0.82, 0.76, 0.62, 1.0))
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART


static func apply_interior_upgrade_sheet_action_button_style(button: Button, hot: bool = false) -> void:
	if button == null:
		return
	button.custom_minimum_size = Vector2(0, interior_upgrade_sheet_action_button_min_height())
	button.add_theme_font_size_override("font_size", 16)
	var bg := Color(0.170, 0.108, 0.048, 0.98)
	var border := Color(0.78, 0.54, 0.24, 0.70)
	if hot:
		bg = Color(0.236, 0.138, 0.050, 0.98)
		border = Color(1.00, 0.74, 0.28, 0.90)
	apply_button_style(
		button,
		bg,
		border,
		Color(0.95, 0.91, 0.82, 1.0),
		Color(0.58, 0.55, 0.49, 1.0),
		4,
		0.05,
		0.08
	)


static func apply_main_city_facility_upgrade_drawer_card_style(panel: Control, emphasized: bool = false) -> void:
	if panel == null:
		return
	panel.custom_minimum_size = Vector2(0, main_city_facility_upgrade_drawer_card_min_height())
	if panel is PanelContainer:
		var bg := Color(0.136, 0.088, 0.040, 0.78)
		var border := Color(0.84, 0.58, 0.24, 0.64)
		if emphasized:
			bg = Color(0.208, 0.118, 0.042, 0.86)
			border = Color(1.00, 0.74, 0.28, 0.90)
		(panel as PanelContainer).add_theme_stylebox_override(
			"panel",
			make_surface_panel_style(bg, border, 1, 5)
		)


static func apply_main_city_facility_upgrade_drawer_pill_style(panel: Control) -> void:
	if panel == null:
		return
	panel.custom_minimum_size = Vector2(
		main_city_facility_upgrade_drawer_pill_min_width(),
		main_city_facility_upgrade_drawer_pill_min_height()
	)
	if panel is PanelContainer:
		(panel as PanelContainer).add_theme_stylebox_override(
			"panel",
			make_surface_panel_style(Color(0.128, 0.078, 0.034, 0.82), Color(0.92, 0.64, 0.24, 0.68), 1, 4)
		)


static func apply_main_city_facility_upgrade_drawer_label_style(label: Label, role: String = "body") -> void:
	if label == null:
		return
	var normalized_role := str(role).strip_edges().to_lower()
	var font_size := main_city_facility_upgrade_drawer_caption_font_size()
	var font_color := Color(0.86, 0.80, 0.68, 1.0)
	match normalized_role:
		"title":
			font_size = interior_upgrade_sheet_title_font_size()
			font_color = Color(1.00, 0.88, 0.62, 1.0)
		"value":
			font_size = main_city_facility_upgrade_drawer_value_font_size()
			font_color = Color(1.00, 0.70, 0.28, 1.0)
		"icon_level":
			font_size = 28
			font_color = Color(1.00, 0.88, 0.62, 1.0)
		"caption":
			font_size = main_city_facility_upgrade_drawer_caption_font_size()
			font_color = Color(0.88, 0.82, 0.70, 1.0)
		"muted":
			font_size = 14
			font_color = Color(0.70, 0.66, 0.58, 1.0)
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", font_color)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART


static func apply_interior_building_contract_summary(summary: Dictionary, node_count: int) -> void:
	summary["interiorBuildingTreeGraphToken"] = INTERIOR_BUILDING_TREE_GRAPH_TOKEN
	summary["interiorBuildingTreeNodeCardToken"] = INTERIOR_BUILDING_TREE_NODE_CARD_TOKEN
	summary["interiorBuildingTreeNodeRenderer"] = "label_stack_button_card"
	summary["interiorBuildingTreeNodeLabelStackToken"] = INTERIOR_BUILDING_TREE_NODE_LABEL_STACK_TOKEN
	summary["interiorBuildingTreeConnectorToken"] = INTERIOR_BUILDING_TREE_CONNECTOR_TOKEN
	summary["interiorBuildingTreeNodeLabelLineCount"] = interior_building_tree_node_label_line_count()
	summary["interiorBuildingTreeNodeButtonTextEmpty"] = true
	summary["interiorBuildingTreeNodeStateMode"] = "selected_disabled_readable_v1"
	summary["interiorBuildingTreeLayoutMode"] = "independent_horizontal_tree_page_v1"
	summary["interiorBuildingTreeNodeCount"] = node_count
	summary["interiorBuildingTreeNodeMinWidth"] = int(interior_building_tree_node_min_width())
	summary["interiorBuildingTreeNodeMinHeight"] = int(interior_building_tree_node_min_height())
	summary["interiorBuildingTreeNodeLineSpacing"] = interior_building_tree_node_line_spacing()
	summary["interiorBuildingTreeNodeSelectedBorderWidth"] = interior_building_tree_node_selected_border_width()
	summary["interiorBuildingTreeNodeDisabledAlphaPercent"] = interior_building_tree_node_disabled_alpha_percent()
	summary["interiorBuildingTreeColumnCount"] = interior_building_tree_column_count()
	summary["interiorBuildingTreeRowSeparation"] = interior_building_tree_row_separation()
	summary["interiorBuildingTreeConnectorWidth"] = int(interior_building_tree_connector_width())
	summary["interiorBuildingTreeConnectorThickness"] = int(interior_building_tree_connector_thickness())
	summary["interiorBuildingTreeDetailPanelVisible"] = true
	summary["interiorUpgradeSheetToken"] = INTERIOR_BUILDING_UPGRADE_SHEET_TOKEN
	summary["interiorUpgradeSheetMode"] = "floating_upgrade_detail_panel_v1"
	summary["interiorUpgradeSheetActionStateToken"] = INTERIOR_UPGRADE_SHEET_ACTION_STATE_TOKEN
	summary["interiorUpgradeSheetPrimaryPriority"] = "primary_hot_enabled_payload_only"
	summary["interiorUpgradeSheetTemplateFeedbackMode"] = "template_feedback_inline_v1"
	summary["interiorUpgradeSheetSubmittedStateMode"] = "submitted_banner_v1"
	summary["interiorUpgradeSheetMinWidth"] = int(interior_upgrade_sheet_min_width())
	summary["interiorUpgradeSheetMinHeight"] = int(interior_upgrade_sheet_min_height())
	summary["interiorSummaryCardMode"] = "compact_building_context"
	summary["interiorSummaryCardLineCount"] = interior_compact_summary_line_count()


static func apply_interior_facility_node_hub_summary(summary: Dictionary, node_count: int) -> void:
	summary["interiorFacilityNodeHubToken"] = INTERIOR_FACILITY_NODE_HUB_TOKEN
	summary["interiorFacilityNodeHubMode"] = "interior_scene_nodes"
	summary["interiorFacilityNodeCount"] = node_count
	summary["interiorFacilityNodeMinWidth"] = int(interior_facility_node_min_width())
	summary["interiorFacilityNodeMinHeight"] = int(interior_facility_node_min_height())
	summary["interiorFacilityNodeHubRows"] = interior_facility_node_hub_rows()
	summary["interiorFacilityNodeHubVisible"] = node_count > 0


static func apply_interior_home_lobby_summary(
	summary: Dictionary,
	entry_count: int,
	entry_ids: String,
	forbidden_entry_count: int,
	background_path: String,
	background_loaded: bool,
	resource_chip_count: int,
	entry_badge_count: int,
	entry_badges_loaded: bool
) -> void:
	summary["interiorHomeLobbyToken"] = INTERIOR_HOME_LOBBY_TOKEN
	summary["interiorHomeMode"] = "four_entry_mobile_lobby"
	summary["interiorHomeEntryButtonToken"] = INTERIOR_HOME_ENTRY_BUTTON_TOKEN
	summary["interiorHomeEntryPresentationMode"] = "standing_badge_scroll_plaque_v1"
	summary["interiorHomeEntryBadgeCount"] = entry_badge_count
	summary["interiorHomeEntryBadgesLoaded"] = entry_badges_loaded
	summary["interiorHomeEntryClickMode"] = "badge_and_scroll_shared_target"
	summary["interiorHomeBackgroundToken"] = INTERIOR_HOME_BACKGROUND_TOKEN
	summary["interiorHomeBackgroundAssetPath"] = background_path
	summary["interiorHomeBackgroundLoaded"] = background_loaded
	summary["interiorHomeBackgroundStretchMode"] = "keep_aspect_covered"
	summary["interiorHomeResourceStripToken"] = INTERIOR_HOME_RESOURCE_STRIP_TOKEN
	summary["interiorHomeResourceChipCount"] = resource_chip_count
	summary["interiorHomeResourceChipMinWidth"] = int(interior_home_resource_chip_min_width())
	summary["interiorHomeResourceChipMinHeight"] = int(interior_home_resource_chip_min_height())
	summary["interiorHomeResourceChipFontSize"] = interior_home_resource_chip_font_size()
	summary["interiorHomeEntryCount"] = entry_count
	summary["interiorHomeEntryIds"] = entry_ids
	summary["interiorHomeForbiddenEntryCount"] = forbidden_entry_count
	summary["interiorHomeEntryButtonMinWidth"] = int(interior_home_entry_button_min_width())
	summary["interiorHomeEntryButtonMinHeight"] = int(interior_home_entry_button_min_height())
	summary["interiorHomeEntryButtonFontSize"] = interior_home_entry_button_font_size()
	summary["interiorHomeHasBuildingTree"] = false
	summary["interiorHomeHasUpgradeSheet"] = false
	summary["interiorHomeHasFacilityNodeHub"] = false


static func interior_home_entry_chrome_convergence_token() -> String:
	return INTERIOR_HOME_ENTRY_CHROME_CONVERGENCE_TOKEN


static func apply_interior_home_entry_chrome_summary(summary: Dictionary) -> void:
	summary["interiorHomeEntryChromeConvergenceToken"] = INTERIOR_HOME_ENTRY_CHROME_CONVERGENCE_TOKEN
	summary["interiorHomeEntryChromeMode"] = "badge_scroll_plaque_shared_chrome_v1"
	summary["interiorHomeEntryChromeSharedFactory"] = true
	summary["interiorHomeEntryBadgeHitAreaMode"] = "transparent_badge_button_shared_entry_v1"
	summary["interiorHomeEntryButtonLineMode"] = "label_meta_two_line_v1"


static func apply_interior_secondary_page_summary(summary: Dictionary, page_id: String, entry_ids: String) -> void:
	summary["interiorSecondaryPageToken"] = INTERIOR_SECONDARY_PAGE_TOKEN
	summary["interiorSecondaryPageMode"] = "home_entry_to_second_level_v1"
	summary["interiorSecondaryPage"] = page_id != "" and page_id != "home/lobby"
	summary["interiorSecondaryEntryIds"] = entry_ids
	summary["interiorSecondaryBackTargetPageId"] = "home/lobby"
	summary["interiorSecondaryHasBuildingTree"] = false
	summary["interiorSecondaryHasUpgradeSheet"] = false
	summary["interiorSecondaryHasFacilityNodeHub"] = false


static func interior_secondary_atmosphere_scrim_alpha() -> float:
	return 0.08


static func interior_secondary_atmosphere_surface_alpha() -> float:
	return 0.62


static func apply_interior_secondary_atmosphere_summary(
	summary: Dictionary,
	background_loaded: bool,
	background_path: String
) -> void:
	summary["interiorSecondaryAtmosphereToken"] = INTERIOR_SECONDARY_ATMOSPHERE_TOKEN
	summary["interiorSecondaryAtmosphereMode"] = "page_level_darkened_scene_background_v1"
	summary["interiorSecondaryAtmosphereBackgroundLoaded"] = background_loaded
	summary["interiorSecondaryAtmosphereBackgroundPath"] = background_path
	summary["interiorSecondaryAtmosphereStretchMode"] = "keep_aspect_covered"
	summary["interiorSecondaryAtmosphereTextReadabilityMode"] = "dark_scrim_plus_translucent_surface"
	summary["interiorSecondaryAtmosphereScrimAlpha"] = "%.2f" % interior_secondary_atmosphere_scrim_alpha()
	summary["interiorSecondaryAtmosphereSurfaceAlpha"] = "%.2f" % interior_secondary_atmosphere_surface_alpha()


static func apply_interior_market_overview_summary(
	summary: Dictionary,
	card_count: int,
	resource_card_count: int,
	operation_card_count: int,
	text_block_count: int,
	section_ids: String,
	routing_section_present: bool
) -> void:
	summary["interiorMarketOverviewToken"] = INTERIOR_MARKET_OVERVIEW_TOKEN
	summary["interiorMarketOverviewMode"] = "consumer_resource_operation_cards_v1"
	summary["interiorMarketOverviewLayoutMode"] = "compact_treasury_dashboard_v1"
	summary["interiorMarketOverviewIconMode"] = "compact_horizontal_badge_v1"
	summary["interiorMarketOverviewTallSymbolRailVisible"] = false
	summary["interiorMarketOverviewCardsStretchToViewport"] = false
	summary["interiorMarketOverviewCardCount"] = card_count
	summary["interiorMarketOverviewResourceCardCount"] = resource_card_count
	summary["interiorMarketOverviewOperationCardCount"] = operation_card_count
	summary["interiorMarketOverviewTextBlockCount"] = text_block_count
	summary["interiorMarketOverviewPrimaryFontSize"] = interior_market_overview_primary_font_size()
	summary["interiorMarketOverviewValueFontSize"] = interior_market_overview_value_font_size()
	summary["interiorMarketOverviewCardMinWidth"] = int(interior_market_overview_card_min_width())
	summary["interiorMarketOverviewCardMinHeight"] = int(interior_market_overview_card_min_height())
	summary["interiorMarketSectionIds"] = section_ids
	summary["interiorMarketRoutingSectionPresent"] = routing_section_present


static func apply_interior_secondary_consumer_cards_summary(
	summary: Dictionary,
	card_count: int,
	text_block_count: int
) -> void:
	summary["interiorSecondaryConsumerCardsToken"] = INTERIOR_SECONDARY_CONSUMER_CARDS_TOKEN
	summary["interiorSecondaryConsumerCardsMode"] = "large_symbol_status_cards_v1"
	summary["interiorSecondaryConsumerCardCount"] = card_count
	summary["interiorSecondaryConsumerTextBlockCount"] = text_block_count
	summary["interiorSecondaryConsumerPrimaryFontSize"] = interior_market_overview_primary_font_size()
	summary["interiorSecondaryConsumerValueFontSize"] = interior_market_overview_value_font_size()


static func interior_secondary_card_chrome_convergence_token() -> String:
	return INTERIOR_SECONDARY_CARD_CHROME_CONVERGENCE_TOKEN


static func apply_interior_secondary_card_chrome_summary(summary: Dictionary) -> void:
	summary["interiorSecondaryCardChromeConvergenceToken"] = INTERIOR_SECONDARY_CARD_CHROME_CONVERGENCE_TOKEN
	summary["interiorSecondaryCardChromeMode"] = "shared_market_trade_tax_cards_v1"
	summary["interiorSecondaryCardChromeSharedFactory"] = true
	summary["interiorSecondaryCardChromeRadius"] = 6
	summary["interiorSecondaryCardChromeMaxBorderWidth"] = 1


static func interior_affairs_card_chrome_convergence_token() -> String:
	return INTERIOR_AFFAIRS_CARD_CHROME_CONVERGENCE_TOKEN


static func apply_interior_affairs_card_chrome_summary(summary: Dictionary) -> void:
	summary["interiorAffairsCardChromeConvergenceToken"] = INTERIOR_AFFAIRS_CARD_CHROME_CONVERGENCE_TOKEN
	summary["interiorAffairsCardChromeMode"] = "shared_mobile_work_order_cards_v1"
	summary["interiorAffairsCardChromeSharedFactory"] = true
	summary["interiorAffairsCardChromeSelectedStateMode"] = "single_selected_card_border_v1"
	summary["interiorAffairsCardChromeMaxBorderWidth"] = 2
	summary["interiorAffairsCardChromeRadius"] = 4


static func main_city_hub_card_chrome_token() -> String:
	return MAIN_CITY_HUB_CARD_CHROME_TOKEN


static func apply_main_city_hub_card_chrome(target: Control, role: String = "") -> void:
	if target == null:
		return
	target.set_meta("main_city_hub_card_chrome_token", MAIN_CITY_HUB_CARD_CHROME_TOKEN)
	target.set_meta("main_city_hub_card_chrome_role", role)
	target.set_meta("main_city_hub_card_chrome_shared_factory", true)
	var bg := Color(0.078, 0.055, 0.034, 0.940)
	var border := Color(0.88, 0.64, 0.30, 0.72)
	var radius := 6
	var border_width := 1
	match role:
		"world_entry_popover":
			bg = Color(0.13, 0.085, 0.040, 0.92)
			border = Color(0.95, 0.70, 0.32, 0.86)
			radius = 4
		"city_space_stage":
			bg = Color(0.055, 0.034, 0.020, 0.58)
			border = Color(0.0, 0.0, 0.0, 0.0)
			radius = 0
			border_width = 0
		_:
			pass
	target.set_meta("main_city_hub_card_chrome_radius", radius)
	target.set_meta("main_city_hub_card_chrome_border_width", border_width)
	target.add_theme_stylebox_override("panel", make_surface_panel_style(bg, border, border_width, radius, 0, 0.0))


static func apply_main_city_hub_card_chrome_summary(summary: Dictionary, node_count: int) -> void:
	summary["mainCityHubCardChromeToken"] = MAIN_CITY_HUB_CARD_CHROME_TOKEN
	summary["mainCityHubCardChromeMode"] = "shared_gateway_entry_context_stage_v1"
	summary["mainCityHubCardChromeSharedFactory"] = true
	summary["mainCityHubCardChromeNodeCount"] = node_count
	summary["mainCityHubCardChromeRadius"] = 6


static func apply_interior_building_group_copy_density_summary(
	summary: Dictionary,
	group_order: String,
	node_label_order: String,
	total_node_count: int,
	max_cost_text_length: int,
	cost_separator_count: int,
	forbidden_term_count: int,
	max_status_text_length: int,
	max_meta_text_length: int
) -> void:
	summary["interiorBuildingGroupCopyDensityToken"] = INTERIOR_BUILDING_GROUP_COPY_DENSITY_TOKEN
	summary["interiorBuildingGroupCopyMode"] = "mobile_short_consumer_terms_v1"
	summary["interiorBuildingGroupOrder"] = group_order
	summary["interiorBuildingGroupNodeLabelOrder"] = node_label_order
	summary["interiorBuildingGroupTotalNodeCount"] = total_node_count
	summary["interiorBuildingGroupMaxCostTextLength"] = max_cost_text_length
	summary["interiorBuildingGroupCostSeparatorCount"] = cost_separator_count
	summary["interiorBuildingGroupForbiddenTermCount"] = forbidden_term_count
	summary["interiorBuildingGroupMaxStatusTextLength"] = max_status_text_length
	summary["interiorBuildingGroupMaxMetaTextLength"] = max_meta_text_length


static func apply_interior_home_lobby_panel_style(panel: Control) -> void:
	if panel == null:
		return
	if panel is PanelContainer:
		(panel as PanelContainer).add_theme_stylebox_override(
			"panel",
			make_surface_panel_style(Color(0.112, 0.082, 0.048, 0.92), Color(0.78, 0.56, 0.24, 0.58), 1, 4)
		)


static func apply_interior_home_command_rail_style(panel: Control) -> void:
	if panel == null:
		return
	if panel is PanelContainer:
		(panel as PanelContainer).add_theme_stylebox_override(
			"panel",
			make_surface_panel_style(Color(0.120, 0.076, 0.034, 0.24), Color(0.92, 0.64, 0.22, 0.26), 1, 6)
		)


static func apply_interior_home_resource_chip_style(panel: Control) -> void:
	if panel == null:
		return
	panel.custom_minimum_size = Vector2(interior_home_resource_chip_min_width(), interior_home_resource_chip_min_height())
	if panel is PanelContainer:
		(panel as PanelContainer).add_theme_stylebox_override(
			"panel",
			make_surface_panel_style(Color(0.126, 0.082, 0.038, 0.64), Color(0.92, 0.64, 0.24, 0.42), 1, 4)
		)


static func apply_interior_home_resource_rail_style(panel: Control) -> void:
	if panel == null:
		return
	if panel is PanelContainer:
		(panel as PanelContainer).add_theme_stylebox_override(
			"panel",
			make_surface_panel_style(Color(0.112, 0.074, 0.034, 0.66), Color(0.94, 0.66, 0.28, 0.52), 1, 6)
		)


static func apply_interior_home_entry_button_style(button: Button) -> void:
	if button == null:
		return
	button.custom_minimum_size = Vector2(interior_home_entry_button_min_width(), interior_home_entry_button_min_height())
	button.add_theme_font_size_override("font_size", interior_home_entry_button_font_size())
	button.add_theme_constant_override("line_spacing", 8)
	apply_button_style(
		button,
		Color(0.220, 0.138, 0.052, 0.90),
		Color(1.00, 0.78, 0.34, 0.96),
		Color(0.98, 0.90, 0.72, 1.0),
		Color(0.55, 0.52, 0.46, 1.0),
		6,
		0.10,
		0.08
	)


static func apply_interior_home_entry_badge_hit_area_style(button: Button) -> void:
	if button == null:
		return
	button.flat = true
	button.add_theme_font_size_override("font_size", 1)
	apply_button_style(
		button,
		Color(0.0, 0.0, 0.0, 0.0),
		Color(1.00, 0.74, 0.30, 0.12),
		Color(1.0, 1.0, 1.0, 0.0),
		Color(1.0, 1.0, 1.0, 0.0),
		6,
		0.0,
		0.0
	)


static func apply_interior_secondary_page_panel_style(panel: Control) -> void:
	if panel == null:
		return
	if panel is PanelContainer:
		(panel as PanelContainer).add_theme_stylebox_override(
			"panel",
			make_surface_panel_style(Color(0.176, 0.116, 0.058, 0.92), Color(0.92, 0.66, 0.30, 0.70), 1, 4, 8, 0.16)
		)


static func apply_interior_secondary_atmosphere_surface_style(panel: Control) -> void:
	if panel == null:
		return
	if panel is PanelContainer:
		(panel as PanelContainer).add_theme_stylebox_override(
			"panel",
			make_surface_panel_style(
				Color(0.190, 0.126, 0.062, interior_secondary_atmosphere_surface_alpha()),
				Color(1.00, 0.72, 0.34, 0.62),
				1,
				4,
				6,
				0.12
			)
		)


static func apply_interior_secondary_feature_card_style(panel: Control) -> void:
	if panel == null:
		return
	panel.custom_minimum_size = Vector2(interior_secondary_page_card_min_width(), interior_secondary_page_card_min_height())
	if panel is PanelContainer:
		(panel as PanelContainer).add_theme_stylebox_override(
			"panel",
			make_surface_panel_style(Color(0.204, 0.132, 0.064, 0.94), Color(1.00, 0.72, 0.32, 0.80), 1, 4, 10, 0.20)
		)


static func apply_interior_secondary_card_style(panel: Control, emphasized: bool = false) -> void:
	if panel == null:
		return
	panel.custom_minimum_size = Vector2(interior_market_overview_card_min_width(), interior_market_overview_card_min_height())
	if panel is PanelContainer:
		var bg := Color(0.184, 0.118, 0.056, 0.90)
		var border := Color(0.96, 0.68, 0.30, 0.78)
		if emphasized:
			bg = Color(0.198, 0.118, 0.044, 0.92)
			border = Color(1.00, 0.74, 0.28, 0.94)
		(panel as PanelContainer).add_theme_stylebox_override(
			"panel",
			make_surface_panel_style(bg, border, 1, 6, 8, 0.18)
		)


static func apply_interior_market_overview_card_style(panel: Control, emphasized: bool = false) -> void:
	apply_interior_secondary_card_style(panel, emphasized)


static func apply_interior_affairs_work_order_card_style(panel: Control, selected: bool = false) -> void:
	if panel == null:
		return
	panel.custom_minimum_size = Vector2(0, 170)
	if panel is PanelContainer:
		var bg := Color(0.160, 0.110, 0.060, 0.92)
		var border := Color(0.70, 0.54, 0.30, 0.78)
		var border_width := 1
		var depth := 6
		var shadow_alpha := 0.14
		if selected:
			bg = Color(0.204, 0.132, 0.064, 0.96)
			border = Color(1.00, 0.72, 0.30, 0.96)
			border_width = 2
			depth = 8
			shadow_alpha = 0.22
		(panel as PanelContainer).add_theme_stylebox_override(
			"panel",
			make_surface_panel_style(bg, border, border_width, 4, depth, shadow_alpha)
		)


static func apply_interior_market_overview_symbol_badge_style(panel: Control) -> void:
	if panel == null:
		return
	panel.custom_minimum_size = Vector2(62.0, 62.0)
	if panel is PanelContainer:
		(panel as PanelContainer).add_theme_stylebox_override(
			"panel",
			make_surface_panel_style(Color(0.126, 0.080, 0.034, 0.86), Color(0.96, 0.66, 0.24, 0.82), 1, 6, 5, 0.14)
		)


static func make_hero_card_style(bg: Color, border: Color, radius: int = 2, border_width: int = 1) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = border
	style.set_border_width_all(border_width)
	style.set_corner_radius_all(radius)
	return style


static func make_hero_card_panel(bg: Color, border: Color, radius: int = 2, border_width: int = 1) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", make_hero_card_style(bg, border, radius, border_width))
	return panel


static func hero_card_color(token_name: String, alpha: float = -1.0) -> Color:
	var color := Color(0.780, 0.520, 0.220, 1.0)
	match str(token_name):
		"text_main":
			color = Color(0.930, 0.900, 0.820, 1.0)
		"text_muted":
			color = Color(0.690, 0.670, 0.600, 1.0)
		"text_gold":
			color = Color(0.960, 0.730, 0.330, 1.0)
		"text_green":
			color = Color(0.420, 0.760, 0.470, 1.0)
		"button_normal_bg":
			color = Color(0.095, 0.087, 0.074, 0.94)
		"button_hot_bg":
			color = Color(0.170, 0.120, 0.067, 0.96)
		"button_hot_border":
			color = Color(0.950, 0.710, 0.290, 0.90)
		"portrait_bg":
			color = Color(0.110, 0.120, 0.135, 0.92)
		"portrait_border":
			color = Color(0.700, 0.560, 0.240, 0.34)
		"stage_border":
			color = Color(0.350, 0.270, 0.120, 0.28)
		"top_bg":
			color = Color(0.020, 0.020, 0.020, 1.0)
		"top_border":
			color = Color(0.200, 0.170, 0.110, 0.12)
		"overlay_bg":
			color = Color(0.025, 0.024, 0.023, 1.0)
		"overlay_border":
			color = Color(0.360, 0.290, 0.150, 0.18)
		"bottom_bg":
			color = Color(0.020, 0.018, 0.020, 1.0)
		"bottom_border":
			color = Color(0.460, 0.340, 0.160, 0.20)
		"portrait_shade":
			color = Color(0.020, 0.018, 0.014, 1.0)
		"skill_plate_bg":
			color = Color(0.120, 0.078, 0.035, 0.82)
		"skill_seal_bg":
			color = Color(0.030, 0.026, 0.020, 0.72)
	if alpha >= 0.0:
		color.a = alpha
	return color


static func hero_card_font_size(token_name: String, compact: bool = false) -> int:
	match str(token_name):
		"identity_faction":
			return 7 if compact else 12
		"identity_name":
			return 8 if compact else 14
		"top":
			return 9 if compact else 11
		"team":
			return 14 if compact else 18
		"owner":
			return 11 if compact else 14
		"draw_label":
			return 13 if compact else 18
		"bottom":
			return 9 if compact else 13
		"status":
			return 9 if compact else 12
		"skill_seal":
			return 18 if compact else 28
		"skill_grade":
			return 10 if compact else 13
		"skill_name":
			return 15 if compact else 22
		"skill_meta":
			return 10 if compact else 14
		_:
			return 10 if compact else 13


static func hero_card_metric(token_name: String, compact: bool = false) -> float:
	match str(token_name):
		"width":
			return 224.0
		"height":
			return 336.0
		"outer_margin":
			return 4.0
		"inner_margin":
			return 3.0 if compact else 5.0
		"stage_margin":
			return 3.0 if compact else 6.0
		"left_strip_width":
			return 22.0 if compact else 42.0
		"left_strip_alpha_owned":
			return 0.22
		"left_strip_alpha_other":
			return 0.18
		"identity_min_height":
			return 46.0 if compact else 118.0
		"top_height":
			return 14.0 if compact else 18.0
		"top_alpha_owned":
			return 0.18
		"top_alpha_other":
			return 0.14
		"top_margin_offset":
			return 6.0 if compact else 16.0
		"top_left_width":
			return 38.0 if compact else 72.0
		"top_stars_width":
			return 36.0 if compact else 56.0
		"roster_overlay_height":
			return 42.0 if compact else 56.0
		"draw_overlay_height":
			return 40.0 if compact else 54.0
		"overlay_alpha":
			return 0.26
		"bottom_height":
			return 20.0 if compact else 30.0
		"bottom_alpha_owned":
			return 0.42
		"bottom_alpha_other":
			return 0.30
		"portrait_shade_alpha":
			return 0.08
		"portrait_stage_fill_ratio":
			return 0.82
		"skill_plate_margin":
			return 8.0 if compact else 14.0
		"skill_plate_min_height":
			return 128.0 if compact else 214.0
		"skill_plate_separation":
			return 4.0 if compact else 7.0
		"skill_seal_size":
			return 50.0 if compact else 78.0
		_:
			return 0.0


static func hero_card_tone_border(tone: String, alpha: float = 0.84) -> Color:
	match str(tone):
		"cao_wei":
			return Color(0.360, 0.620, 0.960, alpha)
		"ji_han":
			return Color(0.340, 0.760, 0.430, alpha)
		"dong_wu":
			return Color(0.860, 0.280, 0.220, alpha)
		"qun_xiong":
			return Color(0.930, 0.720, 0.240, alpha)
		"dong_han":
			return Color(0.720, 0.460, 0.520, alpha)
		"jin":
			return Color(0.450, 0.680, 0.700, alpha)
		"blue":
			return Color(0.370, 0.520, 0.720, alpha)
		"green":
			return Color(0.360, 0.650, 0.330, alpha)
		"red":
			return Color(0.780, 0.290, 0.300, alpha)
		_:
			return Color(0.780, 0.520, 0.220, alpha)


static func hero_card_identity_strip_bg(tone: String, alpha: float) -> Color:
	match str(tone):
		"cao_wei":
			return Color(0.030, 0.060, 0.110, alpha)
		"ji_han":
			return Color(0.030, 0.100, 0.055, alpha)
		"dong_wu":
			return Color(0.120, 0.035, 0.030, alpha)
		"qun_xiong":
			return Color(0.120, 0.075, 0.025, alpha)
		"dong_han":
			return Color(0.120, 0.060, 0.075, alpha)
		"jin":
			return Color(0.030, 0.085, 0.095, alpha)
		_:
			return Color(0.018, 0.017, 0.017, alpha)


static func hero_card_portrait_tone(tone: String) -> Color:
	match str(tone):
		"cao_wei":
			return Color(0.035, 0.070, 0.125, 0.98)
		"ji_han":
			return Color(0.040, 0.120, 0.065, 0.98)
		"dong_wu":
			return Color(0.125, 0.045, 0.038, 0.98)
		"qun_xiong":
			return Color(0.130, 0.085, 0.030, 0.98)
		"dong_han":
			return Color(0.125, 0.065, 0.080, 0.98)
		"jin":
			return Color(0.035, 0.090, 0.100, 0.98)
		"blue":
			return Color(0.160, 0.220, 0.300, 0.98)
		"green":
			return Color(0.150, 0.270, 0.155, 0.98)
		"red":
			return Color(0.300, 0.120, 0.130, 0.98)
		_:
			return Color(0.300, 0.190, 0.085, 0.98)


static func hero_card_token_summary() -> Dictionary:
	return {
		"heroCardTokenMode": HERO_CARD_TOKEN_MODE,
		"heroCardColorTokenSet": HERO_CARD_COLOR_TOKEN_SET,
		"heroCardLayoutTokenSet": HERO_CARD_LAYOUT_TOKEN_SET,
		"heroCardPanelStyleToken": HERO_CARD_PANEL_STYLE_TOKEN,
		"heroCardButtonStyleToken": HERO_CARD_BUTTON_STYLE_TOKEN,
		"heroCardFontBucket": HERO_CARD_FONT_BUCKET,
		"heroCardAspectLockMode": "fixed_preset_no_parent_stretch_v2",
		"heroCardVerticalExpandAllowed": false,
	}


static func apply_hero_card_summary(
	summary: Dictionary,
	render_mode: String,
	compact: bool = false,
	sample_count: int = 0,
	identity_strip_visible: bool = true
) -> void:
	var token_summary := hero_card_token_summary()
	for key in token_summary.keys():
		summary[key] = token_summary[key]
	summary["heroCardViewMode"] = "hero_card_view"
	summary["heroCardRenderMode"] = render_mode
	summary["heroCardCompactMode"] = compact
	summary["heroCardSampleCount"] = sample_count
	summary["heroCardIdentityStripVisible"] = identity_strip_visible
	apply_portrait_frame_summary(summary, "heroCard", PORTRAIT_FRAME_HERO_CARD_VARIANT)


static func design_system_summary() -> Dictionary:
	return {
		"visualDesignSystemId": DESIGN_SYSTEM_ID,
		"visualDesignTokenSource": DESIGN_TOKEN_SOURCE,
		"visualDesignTokenVersion": DESIGN_TOKEN_VERSION,
		"visualColorRamp": VISUAL_COLOR_RAMP,
		"visualFontScale": VISUAL_FONT_SCALE,
		"visualButtonScale": VISUAL_BUTTON_SCALE,
		"visualPanelChrome": VISUAL_PANEL_CHROME,
		"visualShellChromeToken": FULLSCREEN_SHELL_CHROME_TOKEN,
		"visualSurfaceTone": VISUAL_SURFACE_TONE,
		"visualSurfaceDensity": VISUAL_SURFACE_DENSITY,
		"visualCardDepthToken": VISUAL_CARD_DEPTH_TOKEN,
	}


static func apply_design_system_summary(
	summary: Dictionary,
	component_family: String,
	data_mode: String = "preview_read_model_shell",
	production_baseline: bool = false
) -> void:
	var base := design_system_summary()
	for key in base.keys():
		summary[key] = base[key]
	summary["visualComponentFamily"] = component_family
	summary["visualDataMode"] = data_mode
	summary["visualProductionBaseline"] = production_baseline
	summary["visualBaselineState"] = "production" if production_baseline else "candidate"


static func apply_recruit_formal_pack_summary(summary: Dictionary) -> void:
	summary["recruitFormalPackActionButtonToken"] = RECRUIT_FORMAL_PACK_ACTION_BUTTON_TOKEN
	summary["recruitDrawCommandBgToken"] = RECRUIT_DRAW_COMMAND_BG_TOKEN
	summary["recruitFormalPackActionButtonMinHeight"] = recruit_formal_pack_action_button_min_height()
	summary["recruitFormalPackActionButtonFontSize"] = recruit_formal_pack_action_button_font_size()
	summary["recruitFormalPackRepeatButtonMinWidth"] = recruit_formal_pack_repeat_button_size().x
	summary["recruitFormalPackRepeatButtonMinHeight"] = recruit_formal_pack_repeat_button_size().y
	summary["recruitFormalPackResourceChipToken"] = RECRUIT_FORMAL_PACK_RESOURCE_CHIP_TOKEN
	summary["recruitFormalPackResourceChipWidth"] = recruit_formal_pack_resource_chip_size().x
	summary["recruitFormalPackResourceChipHeight"] = recruit_formal_pack_resource_chip_size().y
	summary["recruitFormalPackResourceChipTitleFontSize"] = recruit_formal_pack_resource_chip_title_font_size()
	summary["recruitFormalPackResourceChipValueFontSize"] = recruit_formal_pack_resource_chip_value_font_size()
	summary["recruitFormalPackCornerBadgeToken"] = RECRUIT_FORMAL_PACK_CORNER_BADGE_TOKEN
	summary["recruitFormalPackCornerBadgeWidth"] = recruit_formal_pack_corner_badge_size().x
	summary["recruitFormalPackCornerBadgeHeight"] = recruit_formal_pack_corner_badge_size().y
	summary["recruitFormalPackCornerBadgeFontSize"] = recruit_formal_pack_corner_badge_font_size()
	summary["recruitFormalPackEmptyPanelToken"] = RECRUIT_FORMAL_PACK_EMPTY_PANEL_TOKEN
	summary["recruitFormalPackEmptyPanelWidth"] = recruit_formal_pack_empty_panel_size().x
	summary["recruitFormalPackEmptyPanelHeight"] = recruit_formal_pack_empty_panel_size().y
	summary["recruitFormalPackEmptyPanelTitleFontSize"] = recruit_formal_pack_empty_panel_title_font_size()
	summary["recruitFormalPackEmptyPanelBodyFontSize"] = recruit_formal_pack_empty_panel_body_font_size()
	summary["recruitFormalPackPricePlateToken"] = RECRUIT_FORMAL_PACK_PRICE_PLATE_TOKEN
	summary["recruitFormalPackPricePlateHeight"] = recruit_formal_pack_price_plate_height()
	summary["recruitFormalPackPricePlateMarginX"] = recruit_formal_pack_price_plate_margin_x()
	summary["recruitFormalPackPricePlateMarginY"] = recruit_formal_pack_price_plate_margin_y()
	summary["recruitFormalPackPricePlateFooterSeparation"] = recruit_formal_pack_price_plate_footer_separation()
	summary["recruitFormalPackPricePlateCostFontSize"] = recruit_formal_pack_price_plate_cost_font_size()
	summary["recruitFormalPackPricePlateStatusFontSize"] = recruit_formal_pack_price_plate_status_font_size()
	summary["recruitFormalPackHeaderToken"] = RECRUIT_FORMAL_PACK_HEADER_TOKEN
	summary["recruitFormalPackHeaderMinHeight"] = recruit_formal_pack_header_min_height()
	summary["recruitFormalPackHeaderSeparation"] = recruit_formal_pack_header_separation()
	summary["recruitFormalPackHeaderTitleFontSize"] = recruit_formal_pack_header_title_font_size()
	summary["recruitFormalPackHeaderStatusFontSize"] = recruit_formal_pack_header_status_font_size()
	summary["recruitFormalPackSmallBadgeToken"] = RECRUIT_FORMAL_PACK_SMALL_BADGE_TOKEN
	summary["recruitFormalPackSmallBadgeMarginX"] = recruit_formal_pack_small_badge_margin_x()
	summary["recruitFormalPackSmallBadgeMarginY"] = recruit_formal_pack_small_badge_margin_y()
	summary["recruitFormalPackSmallBadgeFontSize"] = recruit_formal_pack_small_badge_font_size()
	summary["recruitFormalPackStateLineToken"] = RECRUIT_FORMAL_PACK_STATE_LINE_TOKEN
	summary["recruitFormalPackStateLineSeparation"] = recruit_formal_pack_state_line_separation()
	summary["recruitFormalPackStateLineTitleFontSize"] = recruit_formal_pack_state_line_title_font_size()
	summary["recruitFormalPackStateLineValueFontSize"] = recruit_formal_pack_state_line_value_font_size()
	apply_card_rail_summary(summary)
	apply_recruit_motion_summary(summary)


static func apply_recruit_motion_summary(summary: Dictionary) -> void:
	summary["recruitMotionSystemToken"] = MAINLINE_UI_MOTION_SYSTEM_TOKEN
	summary["recruitMotionScope"] = "ui_layer_only"
	summary["recruitMotionPackToken"] = MOTION_RECRUIT_PACK_ENTER_TOKEN
	summary["recruitMotionHeroCardToken"] = MOTION_RECRUIT_HERO_CARD_ENTER_TOKEN
	summary["recruitMotionFeedbackChainToken"] = MOTION_RECRUIT_DRAW_FEEDBACK_CHAIN_TOKEN
	summary["recruitMotionFeedbackChainStages"] = "click_feedback|resource_prompt|pack_back_frame|reveal|quality_sweep|continue_confirm"
	summary["recruitMotionFeedbackChainSummary"] = "点击反馈 -> 资源/招募令提示 -> 卡背/卡框 -> reveal -> whole-image breathing/frame sweep/glow -> 继续/确认"
	summary["recruitMotionClickFeedbackToken"] = MOTION_RECRUIT_DRAW_CLICK_FEEDBACK_TOKEN
	summary["recruitMotionResourcePromptToken"] = MOTION_RECRUIT_DRAW_RESOURCE_PROMPT_TOKEN
	summary["recruitMotionPackFrameToken"] = MOTION_RECRUIT_DRAW_PACK_FRAME_TOKEN
	summary["recruitMotionRevealToken"] = MOTION_RECRUIT_DRAW_REVEAL_TOKEN
	summary["recruitMotionQualitySweepToken"] = MOTION_RECRUIT_DRAW_QUALITY_SWEEP_TOKEN
	summary["recruitMotionContinueControlToken"] = MOTION_RECRUIT_DRAW_CONTINUE_CONFIRM_CONTROL_TOKEN
	summary["recruitMotionPseudoLiveStyle"] = MOTION_RECRUIT_DRAW_PSEUDO_LIVE_STYLE_TOKEN
	summary["recruitMotionMethod"] = "staggered_alpha_drop_lift_scale"
	summary["recruitMotionPackEnterDurationMs"] = int(round(motion_recruit_enter_duration() * 1000.0))
	summary["recruitMotionPackLiftY"] = motion_recruit_pack_enter_lift_y()
	summary["recruitMotionHeroCardLiftY"] = motion_recruit_hero_card_enter_lift_y()
	summary["recruitMotionFutureImpact"] = "ui_visual_only_no_authority_or_draw_result_change"


static func apply_stage_a_shared_motion_feedback_chain_summary(summary: Dictionary, owner: String, trigger: String, proof_level: String = "code_chain") -> void:
	var normalized_owner := owner.strip_edges()
	if normalized_owner == "":
		normalized_owner = "unknown_owner"
	var normalized_trigger := trigger.strip_edges()
	if normalized_trigger == "":
		normalized_trigger = "unknown_trigger"
	summary["stageASharedMotionFeedbackChainToken"] = STAGE_A_SHARED_MOTION_FEEDBACK_CHAIN_TOKEN
	summary["stageASharedMotionPacketSchema"] = STAGE_A_SHARED_MOTION_PACKET_SCHEMA
	summary["stageASharedMotionOwner"] = normalized_owner
	summary["stageASharedMotionTrigger"] = normalized_trigger
	summary["stageASharedMotionGameEvent"] = normalized_trigger
	summary["stageASharedMotionPresentationEvent"] = "%s.presentation" % normalized_trigger
	summary["stageASharedMotionTimeline"] = "trigger|prepare|enter|settle"
	summary["stageASharedMotionVisualStep"] = "shared_factory_bounded_tween"
	summary["stageASharedMotionAudioStep"] = "none_reserved"
	summary["stageASharedMotionHapticStep"] = "none_reserved_mobile"
	summary["stageASharedMotionUiStep"] = "real_buttons_preserved"
	summary["stageASharedMotionControlsPreserved"] = true
	summary["stageASharedMotionProofLevel"] = proof_level
	summary["stageASharedMotionGameplayAuthorityChanged"] = false


static func apply_battle_report_motion_summary(summary: Dictionary) -> void:
	summary["battleReportMotionSystemToken"] = MAINLINE_UI_MOTION_SYSTEM_TOKEN
	summary["battleReportMotionScope"] = "ui_layer_only"
	summary["battleReportMotionEnterToken"] = MOTION_BATTLE_REPORT_ENTER_TOKEN
	summary["battleReportMotionCardStaggerToken"] = MOTION_CARD_STAGGER_ENTER_TOKEN
	summary["battleReportMotionMethod"] = "page_fade_lift_card_stagger_v1"
	summary["battleReportMotionEnterDurationMs"] = int(round(motion_module_enter_duration() * 1000.0))
	summary["battleReportMotionLiftY"] = motion_module_enter_lift_y()
	summary["battleReportMotionFutureImpact"] = "ui_visual_only_no_report_data_or_battle_rule_change"


static func apply_interior_motion_summary(summary: Dictionary) -> void:
	summary["interiorMotionSystemToken"] = MAINLINE_UI_MOTION_SYSTEM_TOKEN
	summary["interiorMotionScope"] = "ui_layer_only"
	summary["interiorMotionSectionEnterToken"] = MOTION_INTERIOR_SECTION_ENTER_TOKEN
	summary["interiorMotionCardStaggerToken"] = MOTION_CARD_STAGGER_ENTER_TOKEN
	summary["interiorMotionMethod"] = "section_fade_lift_stagger_v1"
	summary["interiorMotionEnterDurationMs"] = int(round(motion_module_enter_duration() * 1000.0))
	summary["interiorMotionLiftY"] = motion_module_enter_lift_y()
	summary["interiorMotionFutureImpact"] = "ui_visual_only_no_interior_authority_or_backend_change"


static func apply_ai_chat_motion_summary(summary: Dictionary) -> void:
	summary["aiChatMotionSystemToken"] = MAINLINE_UI_MOTION_SYSTEM_TOKEN
	summary["aiChatMotionScope"] = "ui_layer_only"
	summary["aiChatMotionPanelEnterToken"] = MOTION_AI_CHAT_PANEL_ENTER_TOKEN
	summary["aiChatMotionMethod"] = "panel_fade_lift_section_stagger_v1"
	summary["aiChatMotionEnterDurationMs"] = int(round(motion_module_enter_duration() * 1000.0))
	summary["aiChatMotionLiftY"] = motion_module_enter_lift_y()
	summary["aiChatMotionFutureImpact"] = "ui_visual_only_no_ai_provider_voice_or_backend_change"


static func apply_general_motion_summary(summary: Dictionary) -> void:
	summary["generalMotionSystemToken"] = MAINLINE_UI_MOTION_SYSTEM_TOKEN
	summary["generalMotionScope"] = "ui_layer_only"
	summary["generalMotionPanelEnterToken"] = MOTION_GENERAL_PANEL_ENTER_TOKEN
	summary["generalMotionMethod"] = "panel_fade_lift_section_stagger_v1"
	summary["generalMotionEnterDurationMs"] = int(round(motion_module_enter_duration() * 1000.0))
	summary["generalMotionLiftY"] = motion_module_enter_lift_y()
	summary["generalMotionFutureImpact"] = "ui_visual_only_no_general_authority_or_backend_change"


static func apply_skill_library_motion_summary(summary: Dictionary) -> void:
	summary["skillLibraryMotionSystemToken"] = MAINLINE_UI_MOTION_SYSTEM_TOKEN
	summary["skillLibraryMotionScope"] = "ui_layer_only"
	summary["skillLibraryMotionBrowserEnterToken"] = MOTION_SKILL_LIBRARY_BROWSER_ENTER_TOKEN
	summary["skillLibraryMotionCardStaggerToken"] = MOTION_CARD_STAGGER_ENTER_TOKEN
	summary["skillLibraryMotionMethod"] = "browser_fade_lift_card_stagger_v1"
	summary["skillLibraryMotionEnterDurationMs"] = int(round(motion_module_enter_duration() * 1000.0))
	summary["skillLibraryMotionLiftY"] = motion_module_enter_lift_y()
	summary["skillLibraryMotionFutureImpact"] = "ui_visual_only_no_skill_authority_or_backend_change"


static func apply_troop_motion_summary(summary: Dictionary) -> void:
	summary["troopMotionSystemToken"] = MAINLINE_UI_MOTION_SYSTEM_TOKEN
	summary["troopMotionScope"] = "ui_layer_only"
	summary["troopMotionPanelEnterToken"] = MOTION_TROOP_PANEL_ENTER_TOKEN
	summary["troopMotionCardStaggerToken"] = MOTION_CARD_STAGGER_ENTER_TOKEN
	summary["troopMotionMethod"] = "panel_fade_lift_button_stagger_v1"
	summary["troopMotionEnterDurationMs"] = int(round(motion_module_enter_duration() * 1000.0))
	summary["troopMotionLiftY"] = motion_module_enter_lift_y()
	summary["troopMotionFutureImpact"] = "ui_visual_only_no_troop_authority_or_backend_change"


static func apply_snapshot_edge_motion_summary(summary: Dictionary) -> void:
	summary["snapshotEdgeMotionSystemToken"] = MAINLINE_UI_MOTION_SYSTEM_TOKEN
	summary["snapshotEdgeMotionScope"] = "ui_layer_only"
	summary["snapshotEdgeMotionPageEnterToken"] = MOTION_SNAPSHOT_EDGE_PAGE_ENTER_TOKEN
	summary["snapshotEdgeMotionCardStaggerToken"] = MOTION_CARD_STAGGER_ENTER_TOKEN
	summary["snapshotEdgeMotionMethod"] = "snapshot_page_fade_lift_stagger_v1"
	summary["snapshotEdgeMotionEnterDurationMs"] = int(round(motion_module_enter_duration() * 1000.0))
	summary["snapshotEdgeMotionLiftY"] = motion_module_enter_lift_y()
	summary["snapshotEdgeMotionFutureImpact"] = "ui_visual_only_no_snapshot_read_model_backend_map_voice_change"


static func apply_world_event_activity_shell_summary(summary: Dictionary) -> void:
	summary["worldEventShellToken"] = WORLD_EVENT_ACTIVITY_SHELL_TOKEN
	summary["worldEventActionButtonToken"] = SNAPSHOT_SECTION_ACTION_BUTTON_TOKEN
	summary["worldEventActionButtonMinHeight"] = snapshot_section_action_button_min_height(false)
	summary["worldEventActionButtonReadingMinHeight"] = snapshot_section_action_button_min_height(true)
	summary["worldEventActionButtonBaseFontSize"] = snapshot_section_action_button_font_size(false, false)
	summary["worldEventActionButtonStackedFontSize"] = snapshot_section_action_button_font_size(false, true)
	summary["worldEventActionButtonReadingFontSize"] = snapshot_section_action_button_font_size(true, false)
	summary["worldEventFeatureStatusChipToken"] = SNAPSHOT_FEATURE_STATUS_CHIP_TOKEN
	summary["worldEventFeatureStatusChipFontSize"] = snapshot_feature_status_chip_font_size()
	summary["worldEventFeatureStatusChipMarginX"] = snapshot_feature_status_chip_margin_x()
	summary["worldEventFeatureStatusChipMarginY"] = snapshot_feature_status_chip_margin_y()
	summary["worldEventFeatureCardGridToken"] = SNAPSHOT_FEATURE_CARD_GRID_TOKEN
	summary["worldEventFeatureCardShowcaseCompositionToken"] = SNAPSHOT_FEATURE_CARD_SHOWCASE_COMPOSITION_TOKEN
	summary["worldEventFeatureCardChromeToken"] = SNAPSHOT_FEATURE_CARD_CHROME_TOKEN
	summary["worldEventFeatureCardTitleBarToken"] = SNAPSHOT_FEATURE_CARD_TITLE_BAR_TOKEN
	summary["worldEventFeatureCardPlaceholderToken"] = SNAPSHOT_FEATURE_CARD_PLACEHOLDER_TOKEN
	summary["worldEventFeatureCardRenderStateToken"] = SNAPSHOT_FEATURE_CARD_RENDER_STATE_TOKEN
	summary["worldEventFeatureCardCaptionRowToken"] = SNAPSHOT_FEATURE_CARD_CAPTION_ROW_TOKEN
	summary["worldEventFeatureCardImageSlotToken"] = SNAPSHOT_FEATURE_CARD_IMAGE_SLOT_TOKEN
	summary["worldEventFeatureCardPlaceholderArtToken"] = SNAPSHOT_FEATURE_CARD_PLACEHOLDER_ART_TOKEN
	summary["worldEventFeatureCardShowcaseFeaturedMinHeight"] = snapshot_feature_card_showcase_featured_min_height()
	summary["worldEventFeatureCardShowcaseCompactMinHeight"] = snapshot_feature_card_showcase_compact_min_height()
	summary["worldEventFeatureCardShowcaseSideColumns"] = snapshot_feature_card_showcase_side_columns()
	summary["worldEventFeatureCardShowcaseConsumedCount"] = snapshot_feature_card_showcase_consumed_count()
	summary["worldEventFeatureCardUniformMinHeight"] = snapshot_feature_card_uniform_min_height()
	summary["worldEventFeatureCardUniformImageHeight"] = snapshot_feature_card_uniform_image_height()
	summary["worldEventFeatureCardUniformTitleBarHeight"] = snapshot_feature_card_uniform_title_bar_height()
	summary["worldEventFeatureCardAssetRootToken"] = SNAPSHOT_FEATURE_CARD_ASSET_ROOT_TOKEN
	summary["worldEventFeatureCardAllowedAssetRoots"] = snapshot_feature_card_allowed_asset_roots()
	var recommended_size := snapshot_feature_card_recommended_asset_size()
	var minimum_size := snapshot_feature_card_minimum_asset_size()
	summary["worldEventFeatureCardRecommendedAssetWidth"] = recommended_size.x
	summary["worldEventFeatureCardRecommendedAssetHeight"] = recommended_size.y
	summary["worldEventFeatureCardMinimumAssetWidth"] = minimum_size.x
	summary["worldEventFeatureCardMinimumAssetHeight"] = minimum_size.y
	summary["worldEventFeatureCardAssetAspectRatio"] = snapshot_feature_card_asset_aspect_ratio()


static func apply_mainline_motion_summary(summary: Dictionary) -> void:
	summary["worldEventMotionSystemToken"] = MAINLINE_UI_MOTION_SYSTEM_TOKEN
	summary["worldEventMotionScope"] = "ui_layer_only"
	summary["worldEventMotionTokens"] = mainline_ui_motion_tokens()
	summary["worldEventMotionBackendTouched"] = false
	summary["worldEventMotionMapTouched"] = false
	summary["worldEventMotionBattleRulesTouched"] = false
	summary["worldEventMotionVoiceTouched"] = false


static func apply_activity_motion_sample_summary(summary: Dictionary, layout: String) -> void:
	summary["activityMotionSampleToken"] = ACTIVITY_MOTION_SAMPLE_TOKEN
	summary["activityMotionSamplePage"] = "activities"
	summary["activityMotionSampleLayout"] = layout
	summary["activityMotionPrimaryCtaPlacement"] = "below_image_footer_v1"
	summary["activityMotionCopyPlacement"] = "below_image_caption_title_v1"
	summary["activityMotionAssetCoverFooterVisible"] = true
	summary["activityMotionReservedSoftState"] = "single_soft_disabled_art_v1"
	summary["activityMotionReservedTextDuplicate"] = false
	summary["activityMotionPageEnterFadeToken"] = MOTION_PAGE_ENTER_FADE_TOKEN
	summary["activityMotionPageEnterLiftToken"] = MOTION_PAGE_ENTER_LIFT_TOKEN
	summary["activityMotionOpeningPattern"] = "left_to_right_empty_drop_unfurl_v3"
	summary["activityMotionUnfurlToken"] = MOTION_ACTIVITY_EMPTY_DROP_UNFURL_TOKEN
	summary["activityMotionUnfurlMethod"] = "pivot_scale_x_alpha_translate_drop_y"
	summary["activityMotionEarlyFrameTarget"] = "near_empty_stage_before_cards_v1"
	summary["activityMotionUnfurlDurationMs"] = int(round(motion_activity_unfurl_duration() * 1000.0))
	summary["activityMotionUnfurlBaseDelayMs"] = int(round(motion_activity_unfurl_base_delay() * 1000.0))
	summary["activityMotionUnfurlInitialAlpha"] = motion_activity_unfurl_initial_alpha()
	summary["activityMotionUnfurlInitialScaleX"] = motion_activity_unfurl_initial_scale_x()
	summary["activityMotionUnfurlLiftX"] = motion_activity_unfurl_lift_x()
	summary["activityMotionUnfurlDropY"] = motion_activity_unfurl_drop_y()
	summary["activityMotionEvidenceMode"] = "multi_frame_or_token_summary_v1"
	summary["activityMotionFutureImpact"] = "ui_visual_only_no_layout_or_backend_contract_change"
	summary["activityMotionStaggerAxis"] = "left_to_right"
	summary["activityMotionCardStaggerToken"] = MOTION_CARD_STAGGER_ENTER_TOKEN
	summary["activityMotionPrimaryCtaToken"] = MOTION_FOCUS_CTA_PULSE_TOKEN
	summary["activityMotionRewardGlowToken"] = MOTION_REWARD_GLOW_TOKEN
	summary["activityMotionDisabledSoftStateToken"] = MOTION_DISABLED_SOFT_STATE_TOKEN


static func apply_battle_report_shell_summary(summary: Dictionary) -> void:
	summary["battleReportShellToken"] = BATTLE_REPORT_SHELL_TOKEN
	summary["battleReportShellIconButtonToken"] = BATTLE_REPORT_SHELL_ICON_BUTTON_TOKEN
	summary["battleReportShellIconButtonMinHeight"] = battle_report_shell_icon_button_min_height()
	summary["battleReportShellIconButtonFontSize"] = battle_report_shell_icon_button_font_size()
	summary["battleReportCloseButtonMinWidth"] = battle_report_shell_icon_button_min_width("close")
	summary["battleReportSearchButtonMinWidth"] = battle_report_shell_icon_button_min_width("search")
	summary["battleReportDetailBackButtonMinWidth"] = battle_report_shell_icon_button_min_width("detail_back")
	summary["battleReportListModeTabToken"] = BATTLE_REPORT_LIST_MODE_TAB_TOKEN
	summary["battleReportListModeTabMinWidth"] = battle_report_list_mode_tab_min_width()
	summary["battleReportListModeTabMinHeight"] = battle_report_list_mode_tab_min_height()
	summary["battleReportListModeTabFontSize"] = battle_report_list_mode_tab_font_size()
	summary["battleReportListSummaryToken"] = BATTLE_REPORT_LIST_SUMMARY_TOKEN
	summary["battleReportListSummaryMinHeight"] = battle_report_list_summary_min_height()
	summary["battleReportListSummaryFontSize"] = battle_report_list_summary_font_size()
	summary["battleReportListUtilityToken"] = BATTLE_REPORT_LIST_UTILITY_TOKEN
	summary["battleReportListUtilityRailWidth"] = battle_report_list_utility_rail_width()
	summary["battleReportListUtilitySeparation"] = battle_report_list_utility_separation()
	summary["battleReportFilterButtonMinHeight"] = battle_report_filter_button_min_height()
	summary["battleReportFilterButtonFontSize"] = battle_report_filter_button_font_size()
	summary["battleReportEmptyStateToken"] = BATTLE_REPORT_EMPTY_STATE_TOKEN
	summary["battleReportEmptyStatePreviewToken"] = BATTLE_REPORT_EMPTY_STATE_PREVIEW_TOKEN
	summary["battleReportEmptyStateMinDisplayCount"] = battle_report_empty_state_min_display_count()
	summary["battleReportEmptyStateDetailContractRequired"] = battle_report_empty_state_detail_contract_required()
	summary["battleReportEmptyStatePreviewReportId"] = battle_report_empty_state_preview_report_id()
	summary["battleReportDetailTabButtonToken"] = BATTLE_REPORT_DETAIL_TAB_BUTTON_TOKEN
	summary["battleReportDetailTabButtonMinWidth"] = battle_report_detail_tab_button_min_width()
	summary["battleReportDetailTabButtonMinHeight"] = battle_report_detail_tab_button_min_height()
	summary["battleReportDetailTabButtonFontSize"] = battle_report_detail_tab_button_font_size()
	summary["battleReportDetailFooterButtonToken"] = BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN
	summary["battleReportDetailShareButtonMinWidth"] = battle_report_detail_footer_button_min_width("share")
	summary["battleReportDetailFavoriteButtonMinWidth"] = battle_report_detail_footer_button_min_width("favorite")
	summary["battleReportDetailReplayButtonMinWidth"] = battle_report_detail_footer_button_min_width("replay")
	summary["battleReportDetailCollapseButtonMinWidth"] = battle_report_detail_footer_button_min_width("collapse")
	summary["battleReportDetailFooterButtonMinHeight"] = battle_report_detail_footer_button_min_height()
	summary["battleReportDetailFooterButtonFontSize"] = battle_report_detail_footer_button_font_size()
	summary["battleReportDetailInfoBlockToken"] = BATTLE_REPORT_DETAIL_EMPTY_BLOCK_TOKEN
	summary["battleReportDetailInfoBlockMinHeight"] = battle_report_detail_empty_block_min_height()
	summary["battleReportDetailInfoBlockTitleFontSize"] = battle_report_detail_empty_block_title_font_size()
	summary["battleReportDetailInfoBlockLineFontSize"] = battle_report_detail_empty_block_line_font_size()
	summary["battleReportDetailStructureBoxFontSize"] = battle_report_detail_structure_box_font_size()
	summary["battleReportDetailVisualStageToken"] = battle_report_detail_visual_stage_token()
	summary["battleReportDetailResultFocusToken"] = battle_report_detail_result_focus_token()
	summary["battleReportDetailTeamCardToken"] = battle_report_detail_team_card_token()
	summary["battleReportDetailRewardPanelToken"] = battle_report_detail_reward_panel_token()
	summary["battleReportDetailTitleHierarchyToken"] = battle_report_detail_title_hierarchy_token()
	summary["battleReportDetailTimeMarkerToken"] = battle_report_detail_time_marker_token()
	summary["battleReportDetailCardDensityToken"] = battle_report_detail_card_density_token()
	summary["battleReportDetailCardCompositionToken"] = battle_report_detail_card_composition_token()
	summary["battleReportDetailCardCompositionMode"] = "opposed_army_result_focus_footer_tabs_v1"
	summary["battleReportDetailCardCompositionOrder"] = "attacker_result_defender"
	summary["battleReportDetailCardCompositionFocus"] = "result_reward_replay_center"
	summary["battleReportDetailAiLivingFeedbackToken"] = battle_report_detail_ai_living_feedback_token()
	summary["battleReportDetailAiActivityContinuityToken"] = battle_report_detail_ai_activity_continuity_token()
	summary["battleReportDetailMetaRowsToken"] = battle_report_detail_meta_rows_token()
	summary["battleReportCoordinateJumpButtonToken"] = battle_report_coordinate_jump_button_token()
	summary["battleReportCoordinateJumpPayloadContract"] = battle_report_coordinate_jump_payload_contract()
	summary["battleReportCoordinateJumpButtonMinWidth"] = battle_report_coordinate_jump_button_min_size().x
	summary["battleReportCoordinateJumpButtonMinHeight"] = battle_report_coordinate_jump_button_min_size().y
	summary["battleReportCoordinateJumpButtonFontSize"] = battle_report_coordinate_jump_button_font_size()
	summary["battleReportDetailRewardCopyMode"] = battle_report_detail_reward_copy_mode()
	summary["battleReportDetailHeroInfoMode"] = battle_report_detail_hero_info_mode()
	summary["battleReportDetailSearchVisibilityMode"] = battle_report_detail_search_visibility_mode()
	summary["battleReportDetailResultCardMinWidth"] = battle_report_detail_result_card_min_width()
	summary["battleReportDetailOutcomeCardMinWidth"] = battle_report_detail_outcome_card_min_width()
	summary["battleReportDetailResultFontSize"] = battle_report_detail_result_font_size()
	summary["battleReportDetailOutcomeNoteFontSize"] = battle_report_detail_outcome_note_font_size()
	summary["battleReportDetailTeamPowerFontSize"] = battle_report_detail_team_power_font_size()
	summary["battleReportDetailTeamNameFontSize"] = battle_report_detail_team_name_font_size()
	summary["battleReportDetailRewardTitleFontSize"] = battle_report_detail_reward_title_font_size()
	summary["battleReportDetailRewardBodyFontSize"] = battle_report_detail_reward_body_font_size()
	summary["battleReportDetailHeroCardMinHeight"] = battle_report_detail_hero_card_min_height()
	summary["battleReportDetailHeroPortraitMinHeight"] = battle_report_detail_hero_portrait_min_height()
	summary["battleReportDetailHeroRoleFontSize"] = battle_report_detail_hero_role_font_size()
	summary["battleReportDetailHeroNameFontSize"] = battle_report_detail_info_label_font_size()
	summary["battleReportDetailHeroStarFontSize"] = battle_report_detail_hero_star_font_size()
	summary["battleReportDetailScrollMode"] = battle_report_detail_scroll_mode()
	summary["battleReportDetailScrollVerticalMode"] = battle_report_detail_scroll_vertical_mode_value()
	summary["battleReportDetailStarFallbackPolicy"] = battle_report_detail_star_fallback_policy()
	summary["battleReportDetailBelowFoldSpacerMinHeight"] = battle_report_detail_below_fold_spacer_min_height()
	summary["battleReportDetailBelowFoldTitleFontSize"] = battle_report_detail_below_fold_title_font_size()
	summary["battleReportDetailReplayButtonFontSize"] = battle_report_detail_replay_button_font_size()
	summary["battleReportDetailRoundTimelineTitleFontSize"] = battle_report_detail_round_timeline_title_font_size()
	summary["battleReportDetailRoundItemTitleFontSize"] = battle_report_detail_round_item_title_font_size()
	summary["battleReportDetailRoundSummaryFontSize"] = battle_report_detail_round_summary_font_size()
	summary["battleReportDetailRoundEventFontSize"] = battle_report_detail_round_event_font_size()
	summary["battleReportDetailRoundMarkerWidth"] = battle_report_detail_round_marker_size().x
	summary["battleReportDetailRoundMarkerHeight"] = battle_report_detail_round_marker_size().y
	summary["battleReportDetailRoundTimelineMarginX"] = battle_report_detail_round_timeline_margin().x
	summary["battleReportDetailRoundTimelineMarginY"] = battle_report_detail_round_timeline_margin().y
	summary["battleReportDetailRoundTimelineSeparation"] = battle_report_detail_round_timeline_separation()
	apply_battle_report_list_card_summary(summary)


static func apply_battle_report_list_card_summary(summary: Dictionary) -> void:
	summary["battleReportListCardToken"] = BATTLE_REPORT_LIST_CARD_TOKEN
	summary["battleReportListCardHierarchyToken"] = BATTLE_REPORT_LIST_CARD_HIERARCHY_TOKEN
	summary["battleReportListCardHierarchyMode"] = "header_attack_result_defense_v1"
	summary["battleReportListCardBodyOrder"] = "attacker_result_defender"
	summary["battleReportListResultClusterVisualRole"] = "primary_outcome_focus"
	summary["battleReportListCardSelectedStateToken"] = BATTLE_REPORT_LIST_CARD_SELECTED_STATE_TOKEN
	summary["battleReportListCardDossierDensityToken"] = BATTLE_REPORT_LIST_CARD_DOSSIER_DENSITY_TOKEN
	summary["battleReportListHeroCardReadabilityToken"] = BATTLE_REPORT_LIST_HERO_CARD_READABILITY_TOKEN
	summary["battleReportListAiActionResultCardToken"] = battle_report_ai_action_result_card_token()
	summary["battleReportListCardMinHeight"] = battle_report_list_card_min_height()
	summary["battleReportListCardMarginX"] = battle_report_list_card_margin_x()
	summary["battleReportListCardMarginY"] = battle_report_list_card_margin_y()
	summary["battleReportListCardColumnSpacing"] = battle_report_list_card_column_spacing()
	summary["battleReportListCardBodySpacing"] = battle_report_list_card_body_spacing()
	summary["battleReportListCardHeaderToken"] = BATTLE_REPORT_LIST_CARD_HEADER_TOKEN
	summary["battleReportListCardHeaderSpacing"] = battle_report_list_card_header_spacing()
	summary["battleReportListCardBadgeToken"] = BATTLE_REPORT_LIST_CARD_BADGE_TOKEN
	summary["battleReportListCardBadgeWidth"] = battle_report_list_card_badge_size().x
	summary["battleReportListCardBadgeHeight"] = battle_report_list_card_badge_size().y
	summary["battleReportListCardBadgeFontSize"] = battle_report_list_card_badge_font_size()
	summary["battleReportListCardTitleFontSize"] = battle_report_list_card_title_font_size()
	summary["battleReportListCardLocationFontSize"] = battle_report_list_card_location_font_size()
	summary["battleReportListStructureBoxToken"] = BATTLE_REPORT_LIST_STRUCTURE_BOX_TOKEN
	summary["battleReportListStructureBoxFontSize"] = battle_report_list_structure_box_font_size()
	summary["battleReportListCardBodyToken"] = BATTLE_REPORT_LIST_CARD_BODY_TOKEN
	summary["battleReportListDetailEntryToken"] = BATTLE_REPORT_LIST_DETAIL_ENTRY_TOKEN
	summary["battleReportListDetailEntryTargetPage"] = battle_report_list_detail_entry_target_page()
	summary["battleReportListDetailEntryFontSize"] = battle_report_list_detail_entry_font_size()
	summary["battleReportListSelectedExpandLabel"] = battle_report_list_selected_expand_label()
	summary["battleReportListDefaultExpandLabel"] = battle_report_list_default_expand_label()
	summary["battleReportListTeamClusterMinHeight"] = battle_report_list_team_cluster_min_height()
	summary["battleReportListTeamTitleFontSize"] = battle_report_list_team_title_font_size()
	summary["battleReportListTeamPowerFontSize"] = battle_report_list_team_power_font_size()
	summary["battleReportListHeroSlotWidth"] = battle_report_list_hero_slot_size().x
	summary["battleReportListHeroSlotHeight"] = battle_report_list_hero_slot_size().y
	summary["battleReportListHeroFallbackFontSize"] = battle_report_list_hero_fallback_font_size()
	summary["battleReportListHeroStarFontSize"] = battle_report_list_hero_star_font_size()
	summary["battleReportListHeroNameFontSize"] = battle_report_list_hero_name_font_size()
	summary["battleReportListHeroLevelFontSize"] = battle_report_list_hero_level_font_size()
	summary["battleReportListHeroInfoPlateMinHeight"] = battle_report_list_hero_info_plate_min_height()
	summary["battleReportListResultClusterWidth"] = battle_report_list_result_cluster_size().x
	summary["battleReportListResultClusterHeight"] = battle_report_list_result_cluster_size().y
	summary["battleReportListResultNoteFontSize"] = battle_report_list_result_note_font_size()
	summary["battleReportListResultTextFontSize"] = battle_report_list_result_text_font_size()
	summary["battleReportListResultMetaFontSize"] = battle_report_list_result_meta_font_size()
	summary["battleReportListUtilityClusterWidth"] = battle_report_list_utility_cluster_size().x
	summary["battleReportListUtilityClusterHeight"] = battle_report_list_utility_cluster_size().y
	summary["battleReportListUtilityIndexHeight"] = battle_report_list_utility_index_size().y
	summary["battleReportListUtilityExpandHeight"] = battle_report_list_utility_expand_size().y


static func general_skill_library_type_order() -> Array[String]:
	var result: Array[String] = []
	for label in GENERAL_SKILL_LIBRARY_TYPE_ORDER:
		result.append(str(label))
	return result


static func general_skill_library_type_rank(type_label: String) -> int:
	var order := general_skill_library_type_order()
	var index := order.find(type_label)
	return index if index >= 0 else order.size()


static func apply_general_skill_library_summary(summary: Dictionary, type_labels: Array) -> void:
	var labels: Array[String] = []
	for raw_label in type_labels:
		var label := str(raw_label).strip_edges()
		if label != "":
			labels.append(label)
	summary["skillLibraryTypeOrderToken"] = GENERAL_SKILL_LIBRARY_TYPE_ORDER_TOKEN
	summary["skillLibraryTypeOptionCount"] = labels.size()
	summary["skillLibraryTypeOptions"] = " / ".join(labels)
	summary["skillLibraryHasPassiveTypeFilter"] = labels.has("被动")
	apply_general_skill_library_interaction_summary(summary)
	apply_general_skill_library_showcase_header_summary(summary)
	apply_general_skill_library_showcase_filters_summary(summary)
	apply_general_skill_library_showcase_feature_panel_summary(summary)
	apply_general_skill_library_showcase_gallery_summary(summary)
	apply_general_skill_library_showcase_card_layout_summary(summary)
	apply_general_skill_library_control_band_summary(summary)
	apply_general_skill_library_filter_row_summary(summary)
	apply_general_skill_library_search_row_summary(summary)
	apply_general_skill_library_card_summary(summary)
	apply_general_skill_library_card_text_summary(summary)
	apply_general_skill_library_deck_header_summary(summary)
	apply_general_skill_library_deck_body_summary(summary)
	apply_general_skill_library_deck_card_layout_summary(summary)


static func general_skill_library_filter_button_min_height() -> int:
	return 56


static func general_skill_library_detail_button_min_height() -> int:
	return 48


static func general_skill_library_search_input_min_height() -> int:
	return 48


static func general_skill_library_interaction_font_size() -> int:
	return 18


static func general_skill_library_filter_button_min_size(text: String) -> Vector2:
	return Vector2(maxf(96.0, float(text.length() * 15 + 42)), float(general_skill_library_filter_button_min_height()))


static func general_skill_library_mobile_touch_scroll_mode() -> String:
	return "hidden_scrollbar_touch_scroll"


static func card_rail_initial_visible_card_target(total_count: int) -> int:
	return clampi(total_count, 1, 3)


static func general_skill_library_deck_visible_card_target(total_count: int) -> int:
	var window_width := int(DisplayServer.window_get_size().x)
	var max_visible := 4 if window_width >= 1500 else 3
	return clampi(total_count, 1, max_visible)


static func card_rail_viewport_width(card_width: float, gap: int, visible_card_target: int) -> float:
	var target := maxi(1, visible_card_target)
	return float(target) * card_width + float(maxi(0, target - 1)) * float(gap)


static func card_rail_content_width(card_width: float, gap: int, total_count: int) -> float:
	var count := maxi(1, total_count)
	return float(count) * card_width + float(maxi(0, count - 1)) * float(gap)


static func card_rail_min_height(card_height: float) -> float:
	return card_height + 18.0


static func card_rail_metrics(
	card_width: float,
	card_height: float,
	gap: int,
	total_count: int,
	visible_card_target: int = 0
) -> Dictionary:
	var target := visible_card_target
	if target <= 0:
		target = card_rail_initial_visible_card_target(total_count)
	return {
		"visible_target": target,
		"viewport_width": card_rail_viewport_width(card_width, gap, target),
		"viewport_height": card_rail_min_height(card_height),
		"min_height": card_rail_min_height(card_height),
		"content_width": card_rail_content_width(card_width, gap, total_count),
		"card_width": card_width,
		"card_height": card_height,
		"gap": gap,
		"total_count": maxi(1, total_count),
	}


static func card_rail_repeat_action_gap() -> int:
	return CARD_RAIL_REPEAT_ACTION_GAP


static func make_card_rail_repeat_action_gap_spacer() -> Control:
	var spacer := Control.new()
	spacer.name = "CardRailRepeatActionGap"
	spacer.custom_minimum_size = Vector2(0, float(CARD_RAIL_REPEAT_ACTION_GAP))
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return spacer


static func apply_card_rail_scroll_container(
	scroll: ScrollContainer,
	card_width: float,
	card_height: float,
	gap: int,
	total_count: int,
	visible_card_target: int = 0
) -> void:
	if scroll == null:
		return
	var metrics := card_rail_metrics(card_width, card_height, gap, total_count, visible_card_target)
	apply_mobile_touch_scroll_container(scroll)
	scroll.custom_minimum_size = Vector2(float(metrics.get("viewport_width", card_width)), float(metrics.get("min_height", card_height)))
	scroll.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	scroll.size_flags_vertical = Control.SIZE_SHRINK_CENTER


static func apply_card_rail_summary(summary: Dictionary, prefix: String = "cardRail", visible_card_target: int = 3) -> void:
	if summary == null:
		return
	summary["%sLayoutToken" % prefix] = CARD_RAIL_LAYOUT_TOKEN
	summary["%sScrollMode" % prefix] = CARD_RAIL_SCROLL_MODE
	summary["%sScrollbarVisibility" % prefix] = CARD_RAIL_SCROLLBAR_VISIBILITY
	summary["%sInputMode" % prefix] = CARD_RAIL_INPUT_MODE
	summary["%sInitialVisibleCardTarget" % prefix] = visible_card_target


static func apply_card_rail_geometry_summary(
	summary: Dictionary,
	prefix: String,
	card_width: float,
	card_height: float,
	gap: int,
	total_count: int,
	visible_card_target: int = 0
) -> void:
	if summary == null:
		return
	var metrics := card_rail_metrics(card_width, card_height, gap, total_count, visible_card_target)
	summary["%sCardRailViewportWidth" % prefix] = float(metrics.get("viewport_width", 0.0))
	summary["%sCardRailViewportHeight" % prefix] = float(metrics.get("viewport_height", 0.0))
	summary["%sCardRailMinHeight" % prefix] = float(metrics.get("min_height", 0.0))
	summary["%sCardRailContentWidth" % prefix] = float(metrics.get("content_width", 0.0))
	summary["%sCardRailCardWidth" % prefix] = float(metrics.get("card_width", 0.0))
	summary["%sCardRailCardHeight" % prefix] = float(metrics.get("card_height", 0.0))
	summary["%sCardRailGap" % prefix] = int(metrics.get("gap", 0))
	summary["%sCardRailTotalCount" % prefix] = int(metrics.get("total_count", 0))


static func apply_mobile_touch_scroll_container(scroll: ScrollContainer) -> void:
	if scroll == null:
		return
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	scroll.mouse_filter = Control.MOUSE_FILTER_PASS
	scroll.set_meta("touch_scroll_input_mode", TOUCH_SCROLL_INPUT_MODE)
	scroll.set_meta("touch_scrollbar_visibility", TOUCH_SCROLLBAR_VISIBILITY)
	if not bool(scroll.get_meta("touch_drag_handler_bound", false)):
		scroll.set_meta("touch_drag_handler_bound", true)
		scroll.gui_input.connect(func(event: InputEvent) -> void:
			_handle_mobile_touch_scroll_input(scroll, event)
		)


static func _handle_mobile_touch_scroll_input(scroll: ScrollContainer, event: InputEvent) -> void:
	if scroll == null:
		return
	if event is InputEventMouseButton:
		var mouse_button := event as InputEventMouseButton
		if mouse_button.button_index != MOUSE_BUTTON_LEFT:
			return
		if mouse_button.pressed:
			scroll.set_meta("touch_drag_active", true)
			scroll.set_meta("touch_drag_moved", false)
			scroll.set_meta("touch_drag_start_position", mouse_button.position)
			scroll.set_meta("touch_drag_start_scroll", Vector2(float(scroll.scroll_horizontal), float(scroll.scroll_vertical)))
		else:
			if bool(scroll.get_meta("touch_drag_moved", false)):
				scroll.accept_event()
			scroll.set_meta("touch_drag_active", false)
		return
	if event is InputEventMouseMotion and bool(scroll.get_meta("touch_drag_active", false)):
		var mouse_motion := event as InputEventMouseMotion
		var start_position := mouse_motion.position
		var start_position_variant: Variant = scroll.get_meta("touch_drag_start_position", mouse_motion.position)
		if start_position_variant is Vector2:
			start_position = start_position_variant as Vector2
		var start_scroll := Vector2(float(scroll.scroll_horizontal), float(scroll.scroll_vertical))
		var start_scroll_variant: Variant = scroll.get_meta("touch_drag_start_scroll", start_scroll)
		if start_scroll_variant is Vector2:
			start_scroll = start_scroll_variant as Vector2
		var delta := mouse_motion.position - start_position
		if delta.length() < 3.0:
			return
		scroll.set_meta("touch_drag_moved", true)
		scroll.scroll_horizontal = int(maxf(0.0, start_scroll.x - delta.x))
		scroll.scroll_vertical = int(maxf(0.0, start_scroll.y - delta.y))
		scroll.accept_event()
		return
	if event is InputEventScreenTouch:
		var touch := event as InputEventScreenTouch
		if touch.pressed:
			scroll.set_meta("touch_drag_active", true)
			scroll.set_meta("touch_drag_moved", false)
			scroll.set_meta("touch_drag_start_position", touch.position)
			scroll.set_meta("touch_drag_start_scroll", Vector2(float(scroll.scroll_horizontal), float(scroll.scroll_vertical)))
		else:
			if bool(scroll.get_meta("touch_drag_moved", false)):
				scroll.accept_event()
			scroll.set_meta("touch_drag_active", false)
		return
	if event is InputEventScreenDrag:
		var drag := event as InputEventScreenDrag
		scroll.set_meta("touch_drag_moved", true)
		scroll.scroll_horizontal = int(maxf(0.0, float(scroll.scroll_horizontal) - drag.relative.x))
		scroll.scroll_vertical = int(maxf(0.0, float(scroll.scroll_vertical) - drag.relative.y))
		scroll.accept_event()


static func apply_general_roster_responsive_flow_layout(flow: HFlowContainer) -> void:
	if flow == null:
		return
	flow.name = "GeneralRosterOwnedCardFlow"
	flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	flow.size_flags_vertical = Control.SIZE_EXPAND_FILL
	flow.add_theme_constant_override("h_separation", general_roster_responsive_card_gap())
	flow.add_theme_constant_override("v_separation", general_roster_responsive_card_gap())
	flow.set_meta("general_roster_responsive_flow_token", GENERAL_ROSTER_RESPONSIVE_FLOW_TOKEN)
	flow.set_meta("general_roster_responsive_column_policy", GENERAL_ROSTER_RESPONSIVE_COLUMN_POLICY)


static func apply_general_roster_responsive_flow_summary(summary: Dictionary) -> void:
	if summary == null:
		return
	summary["rosterViewMode"] = "formal_pack_owned_roster_responsive_flow"
	summary["rosterScrollInputMode"] = TOUCH_SCROLL_INPUT_MODE
	summary["rosterScrollBarVisibility"] = TOUCH_SCROLLBAR_VISIBILITY
	summary["rosterResponsiveFlowToken"] = GENERAL_ROSTER_RESPONSIVE_FLOW_TOKEN
	summary["rosterResponsiveColumnPolicy"] = GENERAL_ROSTER_RESPONSIVE_COLUMN_POLICY
	summary["rosterResponsiveMaxColumns"] = GENERAL_ROSTER_RESPONSIVE_MAX_COLUMNS
	summary["rosterFixedColumnCount"] = false
	summary["rosterCardColumnTarget"] = 0


static func general_roster_responsive_card_gap() -> int:
	return 28


static func apply_general_skill_library_filter_button_style(button: Button, text: String, active: bool) -> void:
	if button == null:
		return
	var prefix := internal_command_prefix_for_label(text)
	if prefix != "":
		button.text = ensure_internal_command_prefix(button.text, prefix)
	button.custom_minimum_size = general_skill_library_filter_button_min_size(text)
	button.clip_text = true
	button.alignment = HORIZONTAL_ALIGNMENT_CENTER
	button.add_theme_font_size_override("font_size", general_skill_library_interaction_font_size())
	button.set_meta("skill_filter_chip_bg_token", SKILL_FILTER_CHIP_BG_TOKEN)
	apply_internal_command_button_style(
		button,
		Color(0.18, 0.105, 0.046, 0.90) if active else Color(0.050, 0.044, 0.036, 0.74),
		Color(0.96, 0.68, 0.28, 0.98) if active else Color(0.44, 0.34, 0.16, 0.62),
		Color(1.00, 0.78, 0.36, 1.0) if active else Color(0.78, 0.72, 0.62, 1.0),
		Color(0.95, 0.72, 0.32, 1.0) if active else Color(0.70, 0.67, 0.58, 1.0),
		5,
		1,
		12,
		6,
		0.06,
		0.08
	)


static func apply_general_skill_library_detail_button_style(button: Button, min_width: float = 86.0) -> void:
	if button == null:
		return
	button.custom_minimum_size = Vector2(maxf(min_width, 72.0), float(general_skill_library_detail_button_min_height()))
	button.add_theme_font_size_override("font_size", general_skill_library_interaction_font_size())
	apply_internal_command_button_style(
		button,
		Color(0.070, 0.052, 0.036, 0.78),
		Color(0.62, 0.43, 0.20, 0.70),
		Color(0.94, 0.91, 0.84, 1.0),
		Color(0.94, 0.91, 0.84, 1.0),
		5,
		1,
		10,
		6,
		0.06,
		0.08
	)


static func apply_general_skill_library_search_input_style(input: LineEdit, min_width: float = 180.0) -> void:
	if input == null:
		return
	input.custom_minimum_size = Vector2(min_width, float(general_skill_library_search_input_min_height()))
	input.add_theme_font_size_override("font_size", general_skill_library_interaction_font_size())


static func general_skill_library_showcase_header_row_spacing() -> int:
	return 12


static func general_skill_library_showcase_header_title_stack_spacing() -> int:
	return 3


static func general_skill_library_showcase_header_title_font_size() -> int:
	return 28


static func general_skill_library_showcase_header_subtitle_font_size() -> int:
	return 13


static func general_skill_library_showcase_header_count_panel_min_size() -> Vector2:
	return Vector2(128, 54)


static func general_skill_library_showcase_header_count_panel_radius() -> int:
	return 4


static func general_skill_library_showcase_header_count_panel_bg_color() -> Color:
	return Color(0.10, 0.075, 0.035, 0.72)


static func general_skill_library_showcase_header_count_margin_left() -> int:
	return 12


static func general_skill_library_showcase_header_count_margin_top() -> int:
	return 6


static func general_skill_library_showcase_header_count_margin_right() -> int:
	return 12


static func general_skill_library_showcase_header_count_margin_bottom() -> int:
	return 6


static func general_skill_library_showcase_header_count_column_spacing() -> int:
	return 0


static func general_skill_library_showcase_header_count_value_font_size() -> int:
	return 24


static func general_skill_library_showcase_header_count_caption_font_size() -> int:
	return 11


static func general_skill_library_showcase_header_reset_button_min_size() -> Vector2:
	return Vector2(88, 52)


static func make_general_skill_library_showcase_header_row() -> HBoxContainer:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", general_skill_library_showcase_header_row_spacing())
	return row


static func make_general_skill_library_showcase_header_title_stack() -> VBoxContainer:
	var title_stack := VBoxContainer.new()
	title_stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_stack.add_theme_constant_override("separation", general_skill_library_showcase_header_title_stack_spacing())
	return title_stack


static func make_general_skill_library_showcase_header_count_panel(border_color: Color) -> PanelContainer:
	var panel := make_panel(
		general_skill_library_showcase_header_count_panel_bg_color(),
		border_color,
		general_skill_library_showcase_header_count_panel_radius()
	)
	panel.custom_minimum_size = general_skill_library_showcase_header_count_panel_min_size()
	return panel


static func make_general_skill_library_showcase_header_count_margin() -> MarginContainer:
	return make_margin(
		general_skill_library_showcase_header_count_margin_left(),
		general_skill_library_showcase_header_count_margin_top(),
		general_skill_library_showcase_header_count_margin_right(),
		general_skill_library_showcase_header_count_margin_bottom()
	)


static func make_general_skill_library_showcase_header_count_column() -> VBoxContainer:
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", general_skill_library_showcase_header_count_column_spacing())
	return column


static func apply_general_skill_library_showcase_header_reset_button_style(button: Button) -> void:
	if button == null:
		return
	button.custom_minimum_size = general_skill_library_showcase_header_reset_button_min_size()


static func general_skill_library_showcase_filters_margin_left() -> int:
	return 12


static func general_skill_library_showcase_filters_margin_top() -> int:
	return 10


static func general_skill_library_showcase_filters_margin_right() -> int:
	return 12


static func general_skill_library_showcase_filters_margin_bottom() -> int:
	return 10


static func general_skill_library_showcase_filters_column_spacing() -> int:
	return 8


static func general_skill_library_showcase_filters_hint_row_spacing() -> int:
	return 10


static func general_skill_library_showcase_filters_panel_radius() -> int:
	return 3


static func general_skill_library_showcase_filters_panel_bg_color() -> Color:
	return Color(0.0, 0.0, 0.0, 0.14)


static func general_skill_library_showcase_filters_panel_border_color(base_color: Color) -> Color:
	return Color(base_color.r, base_color.g, base_color.b, 0.24)


static func make_general_skill_library_showcase_filters_panel(border_color: Color) -> PanelContainer:
	var panel := make_panel(
		general_skill_library_showcase_filters_panel_bg_color(),
		general_skill_library_showcase_filters_panel_border_color(border_color),
		general_skill_library_showcase_filters_panel_radius()
	)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return panel


static func make_general_skill_library_showcase_filters_margin() -> MarginContainer:
	return make_margin(
		general_skill_library_showcase_filters_margin_left(),
		general_skill_library_showcase_filters_margin_top(),
		general_skill_library_showcase_filters_margin_right(),
		general_skill_library_showcase_filters_margin_bottom()
	)


static func make_general_skill_library_showcase_filters_column() -> VBoxContainer:
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", general_skill_library_showcase_filters_column_spacing())
	return column


static func make_general_skill_library_showcase_filters_hint_row() -> HBoxContainer:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", general_skill_library_showcase_filters_hint_row_spacing())
	return row


static func general_skill_library_showcase_feature_panel_min_width() -> float:
	return 360.0


static func general_skill_library_showcase_feature_panel_radius() -> int:
	return 4


static func general_skill_library_showcase_feature_panel_stretch_ratio() -> float:
	return 0.42


static func general_skill_library_showcase_feature_margin_left() -> int:
	return 18


static func general_skill_library_showcase_feature_margin_top() -> int:
	return 18


static func general_skill_library_showcase_feature_margin_right() -> int:
	return 18


static func general_skill_library_showcase_feature_margin_bottom() -> int:
	return 18


static func general_skill_library_showcase_feature_column_spacing() -> int:
	return 12


static func general_skill_library_showcase_feature_top_row_spacing() -> int:
	return 10


static func general_skill_library_showcase_feature_title_stack_spacing() -> int:
	return 3


static func general_skill_library_showcase_feature_chip_row_spacing() -> int:
	return 7


static func general_skill_library_showcase_feature_chip_row_token() -> String:
	return GENERAL_SKILL_LIBRARY_SHOWCASE_FEATURE_CHIP_ROW_TOKEN


static func general_skill_library_showcase_feature_chip_row_node_name() -> String:
	return "SkillLibraryShowcaseFeatureChipRow"


static func general_skill_library_showcase_feature_chip_row_h_spacing() -> int:
	return general_skill_library_showcase_feature_chip_row_spacing()


static func general_skill_library_showcase_feature_chip_row_v_spacing() -> int:
	return general_skill_library_showcase_feature_chip_row_spacing()


static func general_skill_library_showcase_feature_section_rule_token() -> String:
	return GENERAL_SKILL_LIBRARY_SHOWCASE_FEATURE_SECTION_RULE_TOKEN


static func general_skill_library_showcase_feature_section_rule_node_name() -> String:
	return "SkillLibraryShowcaseFeatureSectionRule"


static func general_skill_library_showcase_feature_section_rule_height() -> int:
	return 1


static func general_skill_library_showcase_feature_section_rule_alpha_percent() -> int:
	return 55


static func general_skill_library_showcase_feature_section_rule_alpha() -> float:
	return float(general_skill_library_showcase_feature_section_rule_alpha_percent()) / 100.0


static func general_skill_library_showcase_feature_empty_title_font_size() -> int:
	return 24


static func general_skill_library_showcase_feature_empty_subtitle_font_size() -> int:
	return 15


static func general_skill_library_showcase_feature_title_font_size() -> int:
	return 32


static func general_skill_library_showcase_feature_source_font_size() -> int:
	return 13


static func general_skill_library_showcase_feature_source_max_chars() -> int:
	return 28


static func general_skill_library_showcase_feature_description_font_size() -> int:
	return 18


static func general_skill_library_showcase_feature_description_max_chars() -> int:
	return 72


static func general_skill_library_showcase_feature_effect_font_size() -> int:
	return 14


static func general_skill_library_showcase_feature_effect_max_chars() -> int:
	return 58


static func general_skill_library_showcase_feature_text_builder_token() -> String:
	return GENERAL_SKILL_LIBRARY_SHOWCASE_FEATURE_TEXT_BUILDER_TOKEN


static func general_skill_library_showcase_feature_empty_text_builder_token() -> String:
	return GENERAL_SKILL_LIBRARY_SHOWCASE_FEATURE_EMPTY_TEXT_BUILDER_TOKEN


static func general_skill_library_showcase_feature_title_fallback() -> String:
	return "战法"


static func general_skill_library_showcase_feature_empty_title_text() -> String:
	return "暂无符合条件的战法"


static func general_skill_library_showcase_feature_empty_subtitle_text() -> String:
	return "调整筛选后再查看。"


static func general_skill_library_showcase_feature_empty_title_max_lines() -> int:
	return 1


static func general_skill_library_showcase_feature_empty_subtitle_max_lines() -> int:
	return 1


static func general_skill_library_showcase_feature_source_fallback() -> String:
	return ""


static func general_skill_library_showcase_feature_description_fallback() -> String:
	return ""


static func general_skill_library_showcase_feature_effect_fallback() -> String:
	return ""


static func general_skill_library_showcase_feature_title_max_lines() -> int:
	return 1


static func general_skill_library_showcase_feature_source_max_lines() -> int:
	return 1


static func general_skill_library_showcase_feature_description_max_lines() -> int:
	return 2


static func general_skill_library_showcase_feature_effect_max_lines() -> int:
	return 2


static func general_skill_library_showcase_feature_panel_bg_color(grade_color: Color) -> Color:
	return Color(grade_color.r * 0.065, grade_color.g * 0.052, grade_color.b * 0.032, 0.82)


static func general_skill_library_showcase_feature_panel_border_color(grade_color: Color) -> Color:
	return Color(grade_color.r, grade_color.g, grade_color.b, 0.62)


static func make_general_skill_library_showcase_feature_panel(grade_color: Color) -> PanelContainer:
	var panel := make_panel(
		general_skill_library_showcase_feature_panel_bg_color(grade_color),
		general_skill_library_showcase_feature_panel_border_color(grade_color),
		general_skill_library_showcase_feature_panel_radius()
	)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.size_flags_stretch_ratio = general_skill_library_showcase_feature_panel_stretch_ratio()
	panel.custom_minimum_size = Vector2(general_skill_library_showcase_feature_panel_min_width(), 0)
	return panel


static func make_general_skill_library_showcase_feature_margin() -> MarginContainer:
	return make_margin(
		general_skill_library_showcase_feature_margin_left(),
		general_skill_library_showcase_feature_margin_top(),
		general_skill_library_showcase_feature_margin_right(),
		general_skill_library_showcase_feature_margin_bottom()
	)


static func make_general_skill_library_showcase_feature_column() -> VBoxContainer:
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", general_skill_library_showcase_feature_column_spacing())
	return column


static func make_general_skill_library_showcase_feature_top_row() -> HBoxContainer:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", general_skill_library_showcase_feature_top_row_spacing())
	return row


static func make_general_skill_library_showcase_feature_title_stack() -> VBoxContainer:
	var stack := VBoxContainer.new()
	stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stack.add_theme_constant_override("separation", general_skill_library_showcase_feature_title_stack_spacing())
	return stack


static func make_general_skill_library_showcase_feature_empty_title_label(color: Color) -> Label:
	return make_general_skill_library_text_role_label(
		general_skill_library_showcase_feature_empty_title_text(),
		general_skill_library_showcase_feature_empty_title_font_size(),
		color,
		0,
		general_skill_library_showcase_feature_empty_title_max_lines(),
		false,
		HORIZONTAL_ALIGNMENT_CENTER
	)


static func make_general_skill_library_showcase_feature_empty_subtitle_label(color: Color) -> Label:
	return make_general_skill_library_text_role_label(
		general_skill_library_showcase_feature_empty_subtitle_text(),
		general_skill_library_showcase_feature_empty_subtitle_font_size(),
		color,
		0,
		general_skill_library_showcase_feature_empty_subtitle_max_lines(),
		false,
		HORIZONTAL_ALIGNMENT_CENTER
	)


static func general_skill_library_showcase_feature_title_text(skill: Dictionary) -> String:
	return general_skill_library_text_or_fallback(skill.get("name", ""), general_skill_library_showcase_feature_title_fallback())


static func general_skill_library_showcase_feature_source_text(source_label: String) -> String:
	return general_skill_library_text_or_fallback(source_label, general_skill_library_showcase_feature_source_fallback())


static func general_skill_library_showcase_feature_description_text(skill: Dictionary) -> String:
	return general_skill_library_text_or_fallback(skill.get("description", ""), general_skill_library_showcase_feature_description_fallback())


static func general_skill_library_showcase_feature_effect_text(effect_line: String) -> String:
	return general_skill_library_text_or_fallback(effect_line, general_skill_library_showcase_feature_effect_fallback())


static func make_general_skill_library_showcase_feature_title_label(text: String, color: Color) -> Label:
	return make_general_skill_library_text_role_label(
		general_skill_library_text_or_fallback(text, general_skill_library_showcase_feature_title_fallback()),
		general_skill_library_showcase_feature_title_font_size(),
		color,
		0,
		general_skill_library_showcase_feature_title_max_lines(),
		false
	)


static func make_general_skill_library_showcase_feature_source_label(text: String, color: Color) -> Label:
	return make_general_skill_library_text_role_label(
		general_skill_library_showcase_feature_source_text(text),
		general_skill_library_showcase_feature_source_font_size(),
		color,
		general_skill_library_showcase_feature_source_max_chars(),
		general_skill_library_showcase_feature_source_max_lines(),
		false
	)


static func make_general_skill_library_showcase_feature_description_label(text: String, color: Color) -> Label:
	return make_general_skill_library_text_role_label(
		general_skill_library_text_or_fallback(text, general_skill_library_showcase_feature_description_fallback()),
		general_skill_library_showcase_feature_description_font_size(),
		color,
		general_skill_library_showcase_feature_description_max_chars(),
		general_skill_library_showcase_feature_description_max_lines(),
		true
	)


static func make_general_skill_library_showcase_feature_effect_label(text: String, color: Color) -> Label:
	return make_general_skill_library_text_role_label(
		general_skill_library_showcase_feature_effect_text(text),
		general_skill_library_showcase_feature_effect_font_size(),
		color,
		general_skill_library_showcase_feature_effect_max_chars(),
		general_skill_library_showcase_feature_effect_max_lines(),
		true
	)


static func make_general_skill_library_showcase_feature_section_rule(color: Color) -> ColorRect:
	var line := ColorRect.new()
	line.name = general_skill_library_showcase_feature_section_rule_node_name()
	line.color = Color(color.r, color.g, color.b, general_skill_library_showcase_feature_section_rule_alpha())
	line.custom_minimum_size = Vector2(0, general_skill_library_showcase_feature_section_rule_height())
	line.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return line


static func make_general_skill_library_showcase_feature_chip_row() -> HFlowContainer:
	var row := HFlowContainer.new()
	row.name = general_skill_library_showcase_feature_chip_row_node_name()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("h_separation", general_skill_library_showcase_feature_chip_row_h_spacing())
	row.add_theme_constant_override("v_separation", general_skill_library_showcase_feature_chip_row_v_spacing())
	return row


static func general_skill_library_showcase_gallery_panel_radius() -> int:
	return 4


static func general_skill_library_showcase_gallery_panel_stretch_ratio() -> float:
	return 0.58


static func general_skill_library_showcase_gallery_margin_left() -> int:
	return 16


static func general_skill_library_showcase_gallery_margin_top() -> int:
	return 16


static func general_skill_library_showcase_gallery_margin_right() -> int:
	return 16


static func general_skill_library_showcase_gallery_margin_bottom() -> int:
	return 16


static func general_skill_library_showcase_gallery_column_spacing() -> int:
	return 12


static func general_skill_library_showcase_gallery_header_spacing() -> int:
	return 10


static func general_skill_library_showcase_gallery_title_font_size() -> int:
	return 22


static func general_skill_library_showcase_gallery_note_font_size() -> int:
	return 13


static func general_skill_library_showcase_gallery_grid_columns() -> int:
	return 3


static func general_skill_library_showcase_gallery_grid_h_spacing() -> int:
	return 12


static func general_skill_library_showcase_gallery_grid_v_spacing() -> int:
	return 12


static func general_skill_library_showcase_gallery_visible_card_limit() -> int:
	return 6


static func general_skill_library_showcase_gallery_empty_font_size() -> int:
	return 17


static func general_skill_library_showcase_gallery_panel_bg_color() -> Color:
	return Color(0.055, 0.052, 0.047, 0.62)


static func general_skill_library_showcase_gallery_panel_border_color() -> Color:
	return Color(0.42, 0.34, 0.18, 0.52)


static func make_general_skill_library_showcase_gallery_panel() -> PanelContainer:
	var panel := make_panel(
		general_skill_library_showcase_gallery_panel_bg_color(),
		general_skill_library_showcase_gallery_panel_border_color(),
		general_skill_library_showcase_gallery_panel_radius()
	)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.size_flags_stretch_ratio = general_skill_library_showcase_gallery_panel_stretch_ratio()
	return panel


static func make_general_skill_library_showcase_gallery_margin() -> MarginContainer:
	return make_margin(
		general_skill_library_showcase_gallery_margin_left(),
		general_skill_library_showcase_gallery_margin_top(),
		general_skill_library_showcase_gallery_margin_right(),
		general_skill_library_showcase_gallery_margin_bottom()
	)


static func make_general_skill_library_showcase_gallery_column() -> VBoxContainer:
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", general_skill_library_showcase_gallery_column_spacing())
	return column


static func make_general_skill_library_showcase_gallery_header() -> HBoxContainer:
	var header := HBoxContainer.new()
	header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_theme_constant_override("separation", general_skill_library_showcase_gallery_header_spacing())
	return header


static func make_general_skill_library_showcase_gallery_scroll() -> ScrollContainer:
	var grid_scroll := ScrollContainer.new()
	grid_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	apply_mobile_touch_scroll_container(grid_scroll)
	return grid_scroll


static func make_general_skill_library_showcase_gallery_grid() -> GridContainer:
	var grid := GridContainer.new()
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.columns = general_skill_library_showcase_gallery_grid_columns()
	grid.add_theme_constant_override("h_separation", general_skill_library_showcase_gallery_grid_h_spacing())
	grid.add_theme_constant_override("v_separation", general_skill_library_showcase_gallery_grid_v_spacing())
	return grid


static func general_skill_library_showcase_card_margin_left() -> int:
	return 12


static func general_skill_library_showcase_card_margin_top() -> int:
	return 10


static func general_skill_library_showcase_card_margin_right() -> int:
	return 12


static func general_skill_library_showcase_card_margin_bottom() -> int:
	return 10


static func general_skill_library_showcase_card_row_spacing() -> int:
	return 10


static func general_skill_library_showcase_card_detail_column_spacing() -> int:
	return 5


static func general_skill_library_showcase_card_text_builder_token() -> String:
	return GENERAL_SKILL_LIBRARY_SHOWCASE_CARD_TEXT_BUILDER_TOKEN


static func general_skill_library_showcase_card_title_fallback() -> String:
	return "战法"


static func general_skill_library_showcase_card_effect_fallback() -> String:
	return ""


static func general_skill_library_showcase_card_effect_field_separator() -> String:
	return " / "


static func general_skill_library_showcase_card_effect_field_order() -> String:
	return "trigger / target / effect / attribute_effects"


static func general_skill_library_showcase_card_meta_format() -> String:
	return "{troops} · {role}"


static func general_skill_library_showcase_card_meta_separator() -> String:
	return " / "


static func general_skill_library_showcase_card_meta_segment_separator() -> String:
	return " · "


static func general_skill_library_showcase_card_troop_fallback() -> String:
	return "通用"


static func general_skill_library_showcase_card_role_fallback() -> String:
	return "通用"


static func general_skill_library_showcase_card_meta_troop_limit() -> int:
	return 3


static func general_skill_library_showcase_card_search_match_meta_preferred() -> bool:
	return true


static func general_skill_library_showcase_card_title_text(skill: Dictionary) -> String:
	return general_skill_library_text_or_fallback(skill.get("name", ""), general_skill_library_showcase_card_title_fallback())


static func general_skill_library_showcase_card_effect_text(skill: Dictionary) -> String:
	var parts: Array[String] = []
	for key in ["trigger", "target", "effect"]:
		var value := str(skill.get(key, "")).strip_edges()
		if value != "":
			parts.append(value)
	var attribute_effects := _general_skill_library_attribute_effects_text(skill.get("attribute_effects", {}), general_skill_library_showcase_card_effect_field_separator())
	if attribute_effects != "":
		parts.append(attribute_effects)
	var text := general_skill_library_showcase_card_effect_field_separator().join(parts)
	return general_skill_library_text_or_fallback(text, general_skill_library_showcase_card_effect_fallback())


static func general_skill_library_showcase_card_meta_text(skill: Dictionary, search_match_line: String = "") -> String:
	var match_line := search_match_line.strip_edges()
	if general_skill_library_showcase_card_search_match_meta_preferred() and match_line != "":
		return match_line
	var troops := general_skill_library_join_limited(
		skill.get("compatible_troops", []),
		general_skill_library_showcase_card_troop_fallback(),
		general_skill_library_showcase_card_meta_separator(),
		general_skill_library_showcase_card_meta_troop_limit()
	)
	var role := general_skill_library_text_or_fallback(skill.get("combat_role", ""), general_skill_library_showcase_card_role_fallback())
	return "%s%s%s" % [
		troops,
		general_skill_library_showcase_card_meta_segment_separator(),
		role,
	]


static func make_general_skill_library_showcase_card_margin() -> MarginContainer:
	return make_margin(
		general_skill_library_showcase_card_margin_left(),
		general_skill_library_showcase_card_margin_top(),
		general_skill_library_showcase_card_margin_right(),
		general_skill_library_showcase_card_margin_bottom()
	)


static func make_general_skill_library_showcase_card_row() -> HBoxContainer:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", general_skill_library_showcase_card_row_spacing())
	return row


static func make_general_skill_library_showcase_card_detail_column() -> VBoxContainer:
	var detail := VBoxContainer.new()
	detail.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	detail.size_flags_vertical = Control.SIZE_EXPAND_FILL
	detail.add_theme_constant_override("separation", general_skill_library_showcase_card_detail_column_spacing())
	return detail


static func general_skill_library_control_band_row_spacing() -> int:
	return 12


static func general_skill_library_control_band_chip_spacing() -> int:
	return 7


static func general_skill_library_control_band_search_box_spacing() -> int:
	return 6


static func general_skill_library_control_band_search_input_min_width() -> float:
	return 180.0


static func general_skill_library_control_band_search_action_button_count() -> int:
	return 2


static func general_skill_library_control_band_search_input_node_name() -> String:
	return "SkillLibraryControlBandSearchInput"


static func general_skill_library_control_band_search_button_node_name() -> String:
	return "SkillLibraryControlBandSearchButton"


static func general_skill_library_control_band_clear_button_node_name() -> String:
	return "SkillLibraryControlBandClearButton"


static func make_general_skill_library_control_band_panel(border_color: Color) -> PanelContainer:
	var panel := make_panel(
		Color(0.0, 0.0, 0.0, 0.16),
		Color(border_color.r, border_color.g, border_color.b, 0.24),
		3
	)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return panel


static func make_general_skill_library_control_band_row() -> HBoxContainer:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", general_skill_library_control_band_row_spacing())
	return row


static func make_general_skill_library_control_band_chip_flow() -> HFlowContainer:
	var flow := HFlowContainer.new()
	var spacing := general_skill_library_control_band_chip_spacing()
	flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	flow.add_theme_constant_override("h_separation", spacing)
	flow.add_theme_constant_override("v_separation", spacing)
	return flow


static func make_general_skill_library_control_band_search_box() -> HBoxContainer:
	var box := HBoxContainer.new()
	box.size_flags_horizontal = Control.SIZE_SHRINK_END
	box.add_theme_constant_override("separation", general_skill_library_control_band_search_box_spacing())
	return box


static func apply_general_skill_library_control_band_search_input_style(input: LineEdit) -> void:
	apply_general_skill_library_search_input_style(input, general_skill_library_control_band_search_input_min_width())


static func make_general_skill_library_control_band_search_input(text: String) -> LineEdit:
	var input := LineEdit.new()
	input.name = general_skill_library_control_band_search_input_node_name()
	input.text = text
	input.placeholder_text = "搜索"
	input.clear_button_enabled = true
	apply_general_skill_library_control_band_search_input_style(input)
	return input


static func apply_general_skill_library_control_band_summary(summary: Dictionary) -> void:
	summary["skillLibraryControlBandToken"] = GENERAL_SKILL_LIBRARY_CONTROL_BAND_TOKEN
	summary["skillFilterChipBgToken"] = SKILL_FILTER_CHIP_BG_TOKEN
	summary["skillLibraryControlBandRowSpacing"] = general_skill_library_control_band_row_spacing()
	summary["skillLibraryControlBandChipSpacing"] = general_skill_library_control_band_chip_spacing()
	summary["skillLibraryControlBandSearchBoxSpacing"] = general_skill_library_control_band_search_box_spacing()
	summary["skillLibraryControlBandSearchInputMinWidth"] = int(general_skill_library_control_band_search_input_min_width())
	summary["skillLibraryControlBandSearchActionButtonCount"] = general_skill_library_control_band_search_action_button_count()
	summary["skillLibraryControlBandSearchInputNodeName"] = general_skill_library_control_band_search_input_node_name()
	summary["skillLibraryControlBandSearchButtonNodeName"] = general_skill_library_control_band_search_button_node_name()
	summary["skillLibraryControlBandClearButtonNodeName"] = general_skill_library_control_band_clear_button_node_name()


static func apply_general_skill_library_interaction_summary(summary: Dictionary) -> void:
	summary["skillLibraryInteractionToken"] = GENERAL_SKILL_LIBRARY_INTERACTION_TOKEN
	summary["skillFilterChipBgToken"] = SKILL_FILTER_CHIP_BG_TOKEN
	summary["skillLibraryFilterButtonMinHeight"] = general_skill_library_filter_button_min_height()
	summary["skillLibraryDetailButtonMinHeight"] = general_skill_library_detail_button_min_height()
	summary["skillLibrarySearchInputMinHeight"] = general_skill_library_search_input_min_height()
	summary["skillLibraryInteractionFontSize"] = general_skill_library_interaction_font_size()


static func apply_general_skill_library_showcase_header_summary(summary: Dictionary) -> void:
	summary["skillLibraryShowcaseHeaderToken"] = GENERAL_SKILL_LIBRARY_SHOWCASE_HEADER_TOKEN
	summary["skillLibraryShowcaseHeaderRowSpacing"] = general_skill_library_showcase_header_row_spacing()
	summary["skillLibraryShowcaseHeaderTitleStackSpacing"] = general_skill_library_showcase_header_title_stack_spacing()
	summary["skillLibraryShowcaseHeaderTitleFontSize"] = general_skill_library_showcase_header_title_font_size()
	summary["skillLibraryShowcaseHeaderSubtitleFontSize"] = general_skill_library_showcase_header_subtitle_font_size()
	summary["skillLibraryShowcaseHeaderCountPanelMinWidth"] = int(general_skill_library_showcase_header_count_panel_min_size().x)
	summary["skillLibraryShowcaseHeaderCountPanelMinHeight"] = int(general_skill_library_showcase_header_count_panel_min_size().y)
	summary["skillLibraryShowcaseHeaderCountValueFontSize"] = general_skill_library_showcase_header_count_value_font_size()
	summary["skillLibraryShowcaseHeaderCountCaptionFontSize"] = general_skill_library_showcase_header_count_caption_font_size()
	summary["skillLibraryShowcaseHeaderResetButtonMinWidth"] = int(general_skill_library_showcase_header_reset_button_min_size().x)
	summary["skillLibraryShowcaseHeaderResetButtonMinHeight"] = int(general_skill_library_showcase_header_reset_button_min_size().y)


static func apply_general_skill_library_showcase_filters_summary(summary: Dictionary) -> void:
	summary["skillLibraryShowcaseFiltersToken"] = GENERAL_SKILL_LIBRARY_SHOWCASE_FILTERS_TOKEN
	summary["skillLibraryShowcaseFiltersMarginLeft"] = general_skill_library_showcase_filters_margin_left()
	summary["skillLibraryShowcaseFiltersMarginTop"] = general_skill_library_showcase_filters_margin_top()
	summary["skillLibraryShowcaseFiltersMarginRight"] = general_skill_library_showcase_filters_margin_right()
	summary["skillLibraryShowcaseFiltersMarginBottom"] = general_skill_library_showcase_filters_margin_bottom()
	summary["skillLibraryShowcaseFiltersColumnSpacing"] = general_skill_library_showcase_filters_column_spacing()
	summary["skillLibraryShowcaseFiltersHintRowSpacing"] = general_skill_library_showcase_filters_hint_row_spacing()
	summary["skillLibraryShowcaseFiltersPanelRadius"] = general_skill_library_showcase_filters_panel_radius()


static func apply_general_skill_library_showcase_feature_panel_summary(summary: Dictionary) -> void:
	summary["skillLibraryShowcaseFeaturePanelToken"] = GENERAL_SKILL_LIBRARY_SHOWCASE_FEATURE_PANEL_TOKEN
	summary["skillLibraryShowcaseFeaturePanelMinWidth"] = int(general_skill_library_showcase_feature_panel_min_width())
	summary["skillLibraryShowcaseFeaturePanelRadius"] = general_skill_library_showcase_feature_panel_radius()
	summary["skillLibraryShowcaseFeaturePanelStretchPercent"] = int(general_skill_library_showcase_feature_panel_stretch_ratio() * 100.0)
	summary["skillLibraryShowcaseFeatureMarginLeft"] = general_skill_library_showcase_feature_margin_left()
	summary["skillLibraryShowcaseFeatureMarginTop"] = general_skill_library_showcase_feature_margin_top()
	summary["skillLibraryShowcaseFeatureMarginRight"] = general_skill_library_showcase_feature_margin_right()
	summary["skillLibraryShowcaseFeatureMarginBottom"] = general_skill_library_showcase_feature_margin_bottom()
	summary["skillLibraryShowcaseFeatureColumnSpacing"] = general_skill_library_showcase_feature_column_spacing()
	summary["skillLibraryShowcaseFeatureTopRowSpacing"] = general_skill_library_showcase_feature_top_row_spacing()
	summary["skillLibraryShowcaseFeatureTitleStackSpacing"] = general_skill_library_showcase_feature_title_stack_spacing()
	summary["skillLibraryShowcaseFeatureChipRowSpacing"] = general_skill_library_showcase_feature_chip_row_spacing()
	summary["skillLibraryShowcaseFeatureChipRowToken"] = general_skill_library_showcase_feature_chip_row_token()
	summary["skillLibraryShowcaseFeatureChipRowNodeName"] = general_skill_library_showcase_feature_chip_row_node_name()
	summary["skillLibraryShowcaseFeatureChipRowHSpacing"] = general_skill_library_showcase_feature_chip_row_h_spacing()
	summary["skillLibraryShowcaseFeatureChipRowVSpacing"] = general_skill_library_showcase_feature_chip_row_v_spacing()
	summary["skillLibraryShowcaseFeatureSectionRuleToken"] = general_skill_library_showcase_feature_section_rule_token()
	summary["skillLibraryShowcaseFeatureSectionRuleNodeName"] = general_skill_library_showcase_feature_section_rule_node_name()
	summary["skillLibraryShowcaseFeatureSectionRuleHeight"] = general_skill_library_showcase_feature_section_rule_height()
	summary["skillLibraryShowcaseFeatureSectionRuleAlphaPercent"] = general_skill_library_showcase_feature_section_rule_alpha_percent()
	summary["skillLibraryShowcaseFeatureTitleFontSize"] = general_skill_library_showcase_feature_title_font_size()
	summary["skillLibraryShowcaseFeatureSourceFontSize"] = general_skill_library_showcase_feature_source_font_size()
	summary["skillLibraryShowcaseFeatureSourceMaxChars"] = general_skill_library_showcase_feature_source_max_chars()
	summary["skillLibraryShowcaseFeatureSourceFallback"] = general_skill_library_showcase_feature_source_fallback()
	summary["skillLibraryShowcaseFeatureTitleMaxLines"] = general_skill_library_showcase_feature_title_max_lines()
	summary["skillLibraryShowcaseFeatureSourceMaxLines"] = general_skill_library_showcase_feature_source_max_lines()
	summary["skillLibraryShowcaseFeatureDescriptionFontSize"] = general_skill_library_showcase_feature_description_font_size()
	summary["skillLibraryShowcaseFeatureDescriptionMaxChars"] = general_skill_library_showcase_feature_description_max_chars()
	summary["skillLibraryShowcaseFeatureEffectFontSize"] = general_skill_library_showcase_feature_effect_font_size()
	summary["skillLibraryShowcaseFeatureEffectMaxChars"] = general_skill_library_showcase_feature_effect_max_chars()
	summary["skillLibraryShowcaseFeatureTextBuilderToken"] = general_skill_library_showcase_feature_text_builder_token()
	summary["skillLibraryShowcaseFeatureTitleFallback"] = general_skill_library_showcase_feature_title_fallback()
	summary["skillLibraryShowcaseFeatureDescriptionFallback"] = general_skill_library_showcase_feature_description_fallback()
	summary["skillLibraryShowcaseFeatureDescriptionMaxLines"] = general_skill_library_showcase_feature_description_max_lines()
	summary["skillLibraryShowcaseFeatureEffectFallback"] = general_skill_library_showcase_feature_effect_fallback()
	summary["skillLibraryShowcaseFeatureEffectMaxLines"] = general_skill_library_showcase_feature_effect_max_lines()
	summary["skillLibraryShowcaseFeatureEmptyTextBuilderToken"] = general_skill_library_showcase_feature_empty_text_builder_token()
	summary["skillLibraryShowcaseFeatureEmptyTitleText"] = general_skill_library_showcase_feature_empty_title_text()
	summary["skillLibraryShowcaseFeatureEmptySubtitleText"] = general_skill_library_showcase_feature_empty_subtitle_text()
	summary["skillLibraryShowcaseFeatureEmptyTitleMaxLines"] = general_skill_library_showcase_feature_empty_title_max_lines()
	summary["skillLibraryShowcaseFeatureEmptySubtitleMaxLines"] = general_skill_library_showcase_feature_empty_subtitle_max_lines()
	summary["skillLibraryShowcaseFeatureEmptyTitleFontSize"] = general_skill_library_showcase_feature_empty_title_font_size()
	summary["skillLibraryShowcaseFeatureEmptySubtitleFontSize"] = general_skill_library_showcase_feature_empty_subtitle_font_size()


static func apply_general_skill_library_showcase_gallery_summary(summary: Dictionary) -> void:
	summary["skillLibraryShowcaseGalleryToken"] = GENERAL_SKILL_LIBRARY_SHOWCASE_GALLERY_TOKEN
	summary["skillLibraryShowcaseGalleryPanelRadius"] = general_skill_library_showcase_gallery_panel_radius()
	summary["skillLibraryShowcaseGalleryPanelStretchPercent"] = int(general_skill_library_showcase_gallery_panel_stretch_ratio() * 100.0 + 0.5)
	summary["skillLibraryShowcaseGalleryMarginLeft"] = general_skill_library_showcase_gallery_margin_left()
	summary["skillLibraryShowcaseGalleryMarginTop"] = general_skill_library_showcase_gallery_margin_top()
	summary["skillLibraryShowcaseGalleryMarginRight"] = general_skill_library_showcase_gallery_margin_right()
	summary["skillLibraryShowcaseGalleryMarginBottom"] = general_skill_library_showcase_gallery_margin_bottom()
	summary["skillLibraryShowcaseGalleryColumnSpacing"] = general_skill_library_showcase_gallery_column_spacing()
	summary["skillLibraryShowcaseGalleryHeaderSpacing"] = general_skill_library_showcase_gallery_header_spacing()
	summary["skillLibraryShowcaseGalleryTitleFontSize"] = general_skill_library_showcase_gallery_title_font_size()
	summary["skillLibraryShowcaseGalleryNoteFontSize"] = general_skill_library_showcase_gallery_note_font_size()
	summary["skillLibraryShowcaseGalleryGridColumns"] = general_skill_library_showcase_gallery_grid_columns()
	summary["skillLibraryShowcaseGalleryGridHSpacing"] = general_skill_library_showcase_gallery_grid_h_spacing()
	summary["skillLibraryShowcaseGalleryGridVSpacing"] = general_skill_library_showcase_gallery_grid_v_spacing()
	summary["skillLibraryShowcaseGalleryVisibleCardLimit"] = general_skill_library_showcase_gallery_visible_card_limit()
	summary["skillLibraryShowcaseGalleryEmptyFontSize"] = general_skill_library_showcase_gallery_empty_font_size()


static func apply_general_skill_library_showcase_card_layout_summary(summary: Dictionary) -> void:
	summary["skillLibraryShowcaseCardLayoutToken"] = GENERAL_SKILL_LIBRARY_SHOWCASE_CARD_LAYOUT_TOKEN
	summary["skillLibraryShowcaseCardMarginLeft"] = general_skill_library_showcase_card_margin_left()
	summary["skillLibraryShowcaseCardMarginTop"] = general_skill_library_showcase_card_margin_top()
	summary["skillLibraryShowcaseCardMarginRight"] = general_skill_library_showcase_card_margin_right()
	summary["skillLibraryShowcaseCardMarginBottom"] = general_skill_library_showcase_card_margin_bottom()
	summary["skillLibraryShowcaseCardRowSpacing"] = general_skill_library_showcase_card_row_spacing()
	summary["skillLibraryShowcaseCardDetailColumnSpacing"] = general_skill_library_showcase_card_detail_column_spacing()
	summary["skillLibraryShowcaseCardTextBuilderToken"] = general_skill_library_showcase_card_text_builder_token()
	summary["skillLibraryShowcaseCardTitleFallback"] = general_skill_library_showcase_card_title_fallback()
	summary["skillLibraryShowcaseCardEffectFallback"] = general_skill_library_showcase_card_effect_fallback()
	summary["skillLibraryShowcaseCardEffectFieldSeparator"] = general_skill_library_showcase_card_effect_field_separator()
	summary["skillLibraryShowcaseCardEffectFieldOrder"] = general_skill_library_showcase_card_effect_field_order()
	summary["skillLibraryShowcaseCardMetaFormat"] = general_skill_library_showcase_card_meta_format()
	summary["skillLibraryShowcaseCardMetaSeparator"] = general_skill_library_showcase_card_meta_separator()
	summary["skillLibraryShowcaseCardMetaSegmentSeparator"] = general_skill_library_showcase_card_meta_segment_separator()
	summary["skillLibraryShowcaseCardTroopFallback"] = general_skill_library_showcase_card_troop_fallback()
	summary["skillLibraryShowcaseCardRoleFallback"] = general_skill_library_showcase_card_role_fallback()
	summary["skillLibraryShowcaseCardMetaTroopLimit"] = general_skill_library_showcase_card_meta_troop_limit()
	summary["skillLibraryShowcaseCardSearchMatchMetaPreferred"] = general_skill_library_showcase_card_search_match_meta_preferred()


static func general_skill_library_filter_header_title_width() -> int:
	return 42


static func general_skill_library_filter_summary_font_size() -> int:
	return 12


static func general_skill_library_filter_option_scroll_min_height() -> int:
	return 76


static func general_skill_library_filter_option_spacing() -> int:
	return 5


static func make_general_skill_library_filter_row_panel() -> PanelContainer:
	var panel := make_panel(Color(0.0, 0.0, 0.0, 0.16), Color(0.0, 0.0, 0.0, 0.0), 0)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return panel


static func apply_general_skill_library_filter_option_flow_style(flow: HFlowContainer) -> void:
	if flow == null:
		return
	var spacing := general_skill_library_filter_option_spacing()
	flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	flow.add_theme_constant_override("h_separation", spacing)
	flow.add_theme_constant_override("v_separation", spacing)


static func apply_general_skill_library_filter_row_summary(summary: Dictionary) -> void:
	summary["skillLibraryFilterRowToken"] = GENERAL_SKILL_LIBRARY_FILTER_ROW_TOKEN
	summary["skillLibraryFilterHeaderTitleWidth"] = general_skill_library_filter_header_title_width()
	summary["skillLibraryFilterSummaryFontSize"] = general_skill_library_filter_summary_font_size()
	summary["skillLibraryFilterOptionScrollMinHeight"] = general_skill_library_filter_option_scroll_min_height()
	summary["skillLibraryFilterOptionSpacing"] = general_skill_library_filter_option_spacing()


static func general_skill_library_search_row_spacing() -> int:
	return 6


static func general_skill_library_search_input_min_width() -> float:
	return 180.0


static func general_skill_library_search_action_button_count() -> int:
	return 2


static func general_skill_library_search_input_node_name() -> String:
	return "SkillLibrarySearchInput"


static func general_skill_library_search_button_node_name() -> String:
	return "SkillLibrarySearchButton"


static func general_skill_library_clear_button_node_name() -> String:
	return "SkillLibraryClearButton"


static func make_general_skill_library_search_row() -> HBoxContainer:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", general_skill_library_search_row_spacing())
	return row


static func make_general_skill_library_search_input(text: String) -> LineEdit:
	var input := LineEdit.new()
	input.name = general_skill_library_search_input_node_name()
	input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	input.text = text
	input.placeholder_text = "名称 / 描述 / 效果 / 来源 / 标签"
	input.clear_button_enabled = true
	apply_general_skill_library_search_input_style(input, general_skill_library_search_input_min_width())
	return input


static func apply_general_skill_library_search_row_summary(summary: Dictionary) -> void:
	summary["skillLibrarySearchRowToken"] = GENERAL_SKILL_LIBRARY_SEARCH_ROW_TOKEN
	summary["skillLibrarySearchRowSpacing"] = general_skill_library_search_row_spacing()
	summary["skillLibrarySearchInputMinWidth"] = int(general_skill_library_search_input_min_width())
	summary["skillLibrarySearchActionButtonCount"] = general_skill_library_search_action_button_count()
	summary["skillLibrarySearchInputNodeName"] = general_skill_library_search_input_node_name()
	summary["skillLibrarySearchButtonNodeName"] = general_skill_library_search_button_node_name()
	summary["skillLibraryClearButtonNodeName"] = general_skill_library_clear_button_node_name()


static func general_skill_library_primary_card_min_height() -> int:
	return 214


static func general_skill_library_gallery_card_min_height() -> int:
	return 172


static func general_skill_library_deck_header_spacing() -> int:
	return 10


static func general_skill_library_deck_header_title_font_size() -> int:
	return 24


static func general_skill_library_deck_header_summary_font_size() -> int:
	return 14


static func make_general_skill_library_deck_header_row() -> HBoxContainer:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", general_skill_library_deck_header_spacing())
	return row


static func general_skill_library_deck_body_panel_radius() -> int:
	return 4


static func general_skill_library_deck_body_column_spacing() -> int:
	return 8


static func general_skill_library_deck_body_margin_left() -> int:
	return 18


static func general_skill_library_deck_body_margin_top() -> int:
	return 12


static func general_skill_library_deck_body_margin_right() -> int:
	return 18


static func general_skill_library_deck_body_margin_bottom() -> int:
	return 12


static func general_skill_library_deck_body_bg_color() -> Color:
	return Color(0.0, 0.0, 0.0, 0.18)


static func make_general_skill_library_deck_body_panel(border_color: Color) -> PanelContainer:
	var panel := make_panel(general_skill_library_deck_body_bg_color(), border_color, general_skill_library_deck_body_panel_radius())
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	return panel


static func make_general_skill_library_deck_body_margin() -> MarginContainer:
	return make_margin(
		general_skill_library_deck_body_margin_left(),
		general_skill_library_deck_body_margin_top(),
		general_skill_library_deck_body_margin_right(),
		general_skill_library_deck_body_margin_bottom()
	)


static func make_general_skill_library_deck_body_column() -> VBoxContainer:
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", general_skill_library_deck_body_column_spacing())
	return column


static func general_skill_library_deck_card_margin_left() -> int:
	return 12


static func general_skill_library_deck_card_margin_top() -> int:
	return 8


static func general_skill_library_deck_card_margin_right() -> int:
	return 12


static func general_skill_library_deck_card_margin_bottom() -> int:
	return 8


static func general_skill_library_deck_card_column_spacing() -> int:
	return 6


static func general_skill_library_deck_card_top_spacing() -> int:
	return 10


static func general_skill_library_deck_card_title_stack_spacing() -> int:
	return 4


static func general_skill_library_deck_card_chip_row_spacing() -> int:
	return 6


static func general_skill_library_deck_card_feature_chip_limit() -> int:
	return 1


static func general_skill_library_deck_card_section_rule_token() -> String:
	return GENERAL_SKILL_LIBRARY_DECK_CARD_SECTION_RULE_TOKEN


static func general_skill_library_deck_card_section_rule_node_name() -> String:
	return "SkillLibraryDeckCardSectionRule"


static func general_skill_library_deck_card_section_rule_height() -> int:
	return 1


static func general_skill_library_deck_card_section_rule_alpha_percent() -> int:
	return 55


static func general_skill_library_deck_card_section_rule_alpha() -> float:
	return float(general_skill_library_deck_card_section_rule_alpha_percent()) / 100.0


static func make_general_skill_library_deck_card_section_rule(color: Color) -> ColorRect:
	var line := ColorRect.new()
	line.name = general_skill_library_deck_card_section_rule_node_name()
	line.color = Color(color.r, color.g, color.b, general_skill_library_deck_card_section_rule_alpha())
	line.custom_minimum_size = Vector2(0, general_skill_library_deck_card_section_rule_height())
	line.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return line


static func make_general_skill_library_deck_card_margin() -> MarginContainer:
	return make_margin(
		general_skill_library_deck_card_margin_left(),
		general_skill_library_deck_card_margin_top(),
		general_skill_library_deck_card_margin_right(),
		general_skill_library_deck_card_margin_bottom()
	)


static func make_general_skill_library_deck_card_column() -> VBoxContainer:
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", general_skill_library_deck_card_column_spacing())
	return column


static func make_general_skill_library_deck_card_top_row() -> HBoxContainer:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", general_skill_library_deck_card_top_spacing())
	return row


static func make_general_skill_library_deck_card_title_stack() -> VBoxContainer:
	var title_stack := VBoxContainer.new()
	title_stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_stack.add_theme_constant_override("separation", general_skill_library_deck_card_title_stack_spacing())
	return title_stack


static func make_general_skill_library_deck_card_chip_row() -> HFlowContainer:
	var chip_row := HFlowContainer.new()
	chip_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var spacing := general_skill_library_deck_card_chip_row_spacing()
	chip_row.add_theme_constant_override("h_separation", spacing)
	chip_row.add_theme_constant_override("v_separation", spacing)
	return chip_row


static func general_skill_library_result_list_columns() -> int:
	return 4


static func general_skill_library_result_list_visible_card_target() -> int:
	return 8


static func general_skill_library_result_list_h_spacing() -> int:
	return 14


static func general_skill_library_result_list_v_spacing() -> int:
	return 12


static func general_skill_library_result_empty_font_size() -> int:
	return 18


static func general_skill_library_badge_min_size() -> Vector2:
	return Vector2(general_skill_library_badge_min_width(), general_skill_library_badge_min_height())


static func general_skill_library_badge_min_width() -> int:
	return 62


static func general_skill_library_badge_min_height() -> int:
	return 78


static func general_skill_library_badge_panel_radius() -> int:
	return 3


static func general_skill_library_badge_margin_left() -> int:
	return 8


static func general_skill_library_badge_margin_top() -> int:
	return 8


static func general_skill_library_badge_margin_right() -> int:
	return 8


static func general_skill_library_badge_margin_bottom() -> int:
	return 8


static func general_skill_library_badge_column_spacing() -> int:
	return 4


static func general_skill_library_badge_grade_font_size() -> int:
	return 23


static func general_skill_library_badge_grade_max_chars() -> int:
	return 2


static func general_skill_library_badge_grade_max_lines() -> int:
	return 1


static func general_skill_library_badge_type_font_size() -> int:
	return 13


static func general_skill_library_badge_type_max_chars() -> int:
	return 4


static func general_skill_library_badge_type_max_lines() -> int:
	return 1


static func general_skill_library_summary_pill_min_height() -> int:
	return 32


static func general_skill_library_summary_pill_min_width() -> int:
	return 78


static func general_skill_library_summary_pill_char_width() -> int:
	return 12


static func general_skill_library_summary_pill_width_padding() -> int:
	return 20


static func general_skill_library_summary_pill_panel_radius() -> int:
	return 3


static func general_skill_library_summary_pill_margin_left() -> int:
	return 10


static func general_skill_library_summary_pill_margin_top() -> int:
	return 5


static func general_skill_library_summary_pill_margin_right() -> int:
	return 10


static func general_skill_library_summary_pill_margin_bottom() -> int:
	return 5


static func general_skill_library_summary_pill_font_size() -> int:
	return 12


static func general_skill_library_summary_pill_text_max_chars() -> int:
	return 52


static func general_skill_library_summary_pill_text_max_lines() -> int:
	return 1


static func make_general_skill_library_deck_card_panel(grade_color: Color, highlighted: bool) -> PanelContainer:
	var bg_alpha := 0.90 if highlighted else 0.78
	var border_alpha := 0.82 if highlighted else 0.48
	var panel := make_panel(
		Color(grade_color.r * 0.055, grade_color.g * 0.045, grade_color.b * 0.033, bg_alpha),
		Color(grade_color.r, grade_color.g, grade_color.b, border_alpha),
		4
	)
	panel.custom_minimum_size = Vector2(0, general_skill_library_primary_card_min_height())
	return panel


static func make_general_skill_library_gallery_card_panel(grade_color: Color) -> PanelContainer:
	var panel := make_panel(
		Color(grade_color.r * 0.045, grade_color.g * 0.038, grade_color.b * 0.030, 0.82),
		Color(grade_color.r, grade_color.g, grade_color.b, 0.42),
		3
	)
	panel.custom_minimum_size = Vector2(0, general_skill_library_gallery_card_min_height())
	return panel


static func general_skill_library_result_row_base_min_height() -> int:
	return 88


static func general_skill_library_result_row_search_min_height() -> int:
	return 104


static func general_skill_library_result_badge_width() -> int:
	return 52


static func general_skill_library_result_badge_font_size() -> int:
	return 14


static func general_skill_library_result_badge_layout_mode() -> String:
	return "grade_type_multiline"


static func general_skill_library_result_row_margin_left() -> int:
	return 9


static func general_skill_library_result_row_margin_top() -> int:
	return 7


static func general_skill_library_result_row_margin_right() -> int:
	return 9


static func general_skill_library_result_row_margin_bottom() -> int:
	return 7


static func general_skill_library_result_row_spacing() -> int:
	return 9


static func general_skill_library_result_detail_column_spacing() -> int:
	return 3


static func general_skill_library_result_title_font_size() -> int:
	return 17


static func general_skill_library_result_title_max_chars() -> int:
	return 16


static func general_skill_library_result_title_max_lines() -> int:
	return 1


static func general_skill_library_result_description_font_size() -> int:
	return 13


static func general_skill_library_result_description_max_chars() -> int:
	return 54


static func general_skill_library_result_description_max_lines() -> int:
	return 1


static func general_skill_library_result_meta_font_size() -> int:
	return 12


static func general_skill_library_result_meta_max_lines() -> int:
	return 1


static func general_skill_library_result_match_line_font_size() -> int:
	return 12


static func general_skill_library_result_match_line_max_chars() -> int:
	return 32


static func general_skill_library_result_match_line_max_lines() -> int:
	return 1


static func general_skill_library_result_meta_max_chars() -> int:
	return 46


static func general_skill_library_result_detail_button_min_width() -> float:
	return 72.0


static func general_skill_library_result_row_text_builder_token() -> String:
	return GENERAL_SKILL_LIBRARY_RESULT_ROW_TEXT_BUILDER_TOKEN


static func general_skill_library_result_title_fallback() -> String:
	return "战法"


static func general_skill_library_result_description_fallback() -> String:
	return ""


static func general_skill_library_result_meta_format() -> String:
	return "兵种 {troops} · 定位 {role} · 标签 {tags}"


static func general_skill_library_result_meta_separator() -> String:
	return " / "


static func general_skill_library_result_meta_segment_separator() -> String:
	return " · "


static func general_skill_library_result_troop_fallback() -> String:
	return "通用"


static func general_skill_library_result_role_fallback() -> String:
	return "通用"


static func general_skill_library_result_tag_fallback() -> String:
	return "无"


static func general_skill_library_deck_card_text_builder_token() -> String:
	return GENERAL_SKILL_LIBRARY_DECK_CARD_TEXT_BUILDER_TOKEN


static func general_skill_library_deck_card_title_fallback() -> String:
	return "战法"


static func general_skill_library_deck_card_source_fallback() -> String:
	return ""


static func general_skill_library_deck_card_source_dict_key() -> String:
	return "pool"


static func general_skill_library_deck_card_description_fallback() -> String:
	return ""


static func general_skill_library_deck_card_meta_format() -> String:
	return "{troops} · {role}"


static func general_skill_library_deck_card_meta_separator() -> String:
	return " / "


static func general_skill_library_deck_card_meta_segment_separator() -> String:
	return " · "


static func general_skill_library_deck_card_troop_fallback() -> String:
	return "通用"


static func general_skill_library_deck_card_role_fallback() -> String:
	return "通用"


static func general_skill_library_deck_card_meta_troop_limit() -> int:
	return 3


static func general_skill_library_deck_card_search_match_meta_preferred() -> bool:
	return true


static func general_skill_library_deck_card_title_text(skill: Dictionary) -> String:
	return general_skill_library_text_or_fallback(skill.get("name", ""), general_skill_library_deck_card_title_fallback())


static func general_skill_library_deck_card_source_text(skill: Dictionary) -> String:
	var raw_source: Variant = skill.get("source", {})
	if raw_source is Dictionary:
		return general_skill_library_text_or_fallback((raw_source as Dictionary).get(general_skill_library_deck_card_source_dict_key(), ""), general_skill_library_deck_card_source_fallback())
	return general_skill_library_text_or_fallback(raw_source, general_skill_library_deck_card_source_fallback())


static func general_skill_library_deck_card_description_text(skill: Dictionary) -> String:
	return general_skill_library_text_or_fallback(skill.get("description", ""), general_skill_library_deck_card_description_fallback())


static func general_skill_library_deck_card_meta_text(skill: Dictionary, search_match_line: String = "") -> String:
	var match_line := search_match_line.strip_edges()
	if general_skill_library_deck_card_search_match_meta_preferred() and match_line != "":
		return match_line
	var troops := general_skill_library_join_limited(
		skill.get("compatible_troops", []),
		general_skill_library_deck_card_troop_fallback(),
		general_skill_library_deck_card_meta_separator(),
		general_skill_library_deck_card_meta_troop_limit()
	)
	var role := general_skill_library_text_or_fallback(skill.get("combat_role", ""), general_skill_library_deck_card_role_fallback())
	return "%s%s%s" % [
		troops,
		general_skill_library_deck_card_meta_segment_separator(),
		role,
	]


static func general_skill_library_result_title_text(skill: Dictionary) -> String:
	return _general_skill_library_result_text(skill.get("name", ""), general_skill_library_result_title_fallback())


static func general_skill_library_result_description_text(skill: Dictionary) -> String:
	return _general_skill_library_result_text(skill.get("description", ""), general_skill_library_result_description_fallback())


static func general_skill_library_result_meta_text(skill: Dictionary) -> String:
	var troops := _general_skill_library_result_join_list(skill.get("compatible_troops", []), general_skill_library_result_troop_fallback())
	var role := _general_skill_library_result_text(skill.get("combat_role", ""), general_skill_library_result_role_fallback())
	var tags := _general_skill_library_result_join_list(skill.get("tags", []), general_skill_library_result_tag_fallback())
	return "兵种 %s%s定位 %s%s标签 %s" % [
		troops,
		general_skill_library_result_meta_segment_separator(),
		role,
		general_skill_library_result_meta_segment_separator(),
		tags,
	]


static func general_skill_library_text_or_fallback(raw_value: Variant, fallback: String) -> String:
	var text := str(raw_value).strip_edges()
	return text if text != "" else fallback


static func general_skill_library_join_limited(raw_value: Variant, fallback: String, separator: String, limit: int = 0) -> String:
	if not (raw_value is Array):
		return fallback
	var parts: Array[String] = []
	for item in raw_value as Array:
		var text := str(item).strip_edges()
		if text == "":
			continue
		parts.append(text)
		if limit > 0 and parts.size() >= limit:
			break
	return separator.join(parts) if not parts.is_empty() else fallback


static func _general_skill_library_result_text(raw_value: Variant, fallback: String) -> String:
	return general_skill_library_text_or_fallback(raw_value, fallback)


static func _general_skill_library_result_join_list(raw_value: Variant, fallback: String) -> String:
	return general_skill_library_join_limited(raw_value, fallback, general_skill_library_result_meta_separator())


static func _general_skill_library_attribute_effects_text(raw_value: Variant, separator: String) -> String:
	if not (raw_value is Dictionary):
		return ""
	var effects := raw_value as Dictionary
	var labels := {
		"attack": "攻击",
		"force": "攻击",
		"defense": "防御",
		"command": "防御",
		"strategy": "谋略",
		"intelligence": "谋略",
		"siege": "攻城",
		"charisma": "攻城",
		"speed": "速度",
	}
	var parts: Array[String] = []
	for key in effects.keys():
		var value := str(effects.get(key, "")).strip_edges()
		if value == "":
			continue
		var label := str(labels.get(str(key), str(key)))
		parts.append("%s%s" % [label, value])
	return separator.join(parts)


static func general_skill_library_result_summary_base_min_height() -> int:
	return 72


static func general_skill_library_result_summary_search_min_height() -> int:
	return 92


static func general_skill_library_result_summary_font_size() -> int:
	return 12


static func general_skill_library_result_summary_text_max_chars() -> int:
	return 52


static func general_skill_library_result_summary_text_max_lines() -> int:
	return 1


static func general_skill_library_result_summary_panel_radius() -> int:
	return 3


static func general_skill_library_result_summary_margin_left() -> int:
	return 9


static func general_skill_library_result_summary_margin_top() -> int:
	return 6


static func general_skill_library_result_summary_margin_right() -> int:
	return 9


static func general_skill_library_result_summary_margin_bottom() -> int:
	return 6


static func general_skill_library_result_summary_column_spacing() -> int:
	return 3


static func make_general_skill_library_badge_margin() -> MarginContainer:
	return make_margin(
		general_skill_library_badge_margin_left(),
		general_skill_library_badge_margin_top(),
		general_skill_library_badge_margin_right(),
		general_skill_library_badge_margin_bottom()
	)


static func make_general_skill_library_badge_column() -> VBoxContainer:
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", general_skill_library_badge_column_spacing())
	return column


static func make_general_skill_library_badge_grade_label(text: String, color: Color) -> Label:
	return make_general_skill_library_text_role_label(text, general_skill_library_badge_grade_font_size(), color, general_skill_library_badge_grade_max_chars(), general_skill_library_badge_grade_max_lines(), false, HORIZONTAL_ALIGNMENT_CENTER)


static func make_general_skill_library_badge_type_label(text: String, color: Color) -> Label:
	return make_general_skill_library_text_role_label(text, general_skill_library_badge_type_font_size(), color, general_skill_library_badge_type_max_chars(), general_skill_library_badge_type_max_lines(), false, HORIZONTAL_ALIGNMENT_CENTER)


static func make_general_skill_library_badge(grade: String, type_label: String, color: Color) -> Control:
	var panel := make_panel(
		Color(color.r * 0.11, color.g * 0.09, color.b * 0.06, 0.78),
		Color(color.r, color.g, color.b, 0.70),
		general_skill_library_badge_panel_radius()
	)
	panel.custom_minimum_size = general_skill_library_badge_min_size()
	var margin := make_general_skill_library_badge_margin()
	panel.add_child(margin)
	var column := make_general_skill_library_badge_column()
	margin.add_child(column)
	column.add_child(make_general_skill_library_badge_grade_label(grade, color))
	column.add_child(make_general_skill_library_badge_type_label(type_label, Color(0.94, 0.91, 0.84, 1.0)))
	return panel


static func general_skill_library_summary_pill_width_for_text(text: String) -> float:
	var display_text := general_skill_library_trim_text(text, general_skill_library_summary_pill_text_max_chars())
	return maxf(
		float(general_skill_library_summary_pill_min_width()),
		float(display_text.length() * general_skill_library_summary_pill_char_width() + general_skill_library_summary_pill_width_padding())
	)


static func make_general_skill_library_summary_pill_margin() -> MarginContainer:
	return make_margin(
		general_skill_library_summary_pill_margin_left(),
		general_skill_library_summary_pill_margin_top(),
		general_skill_library_summary_pill_margin_right(),
		general_skill_library_summary_pill_margin_bottom()
	)


static func make_general_skill_library_summary_pill(text: String, active: bool) -> Control:
	var color := Color(0.95, 0.72, 0.32, 1.0) if active else Color(0.70, 0.67, 0.58, 1.0)
	var panel := make_panel(
		Color(color.r * 0.055, color.g * 0.050, color.b * 0.040, 0.72),
		Color(color.r, color.g, color.b, 0.34),
		general_skill_library_summary_pill_panel_radius()
	)
	panel.custom_minimum_size = Vector2(general_skill_library_summary_pill_width_for_text(text), general_skill_library_summary_pill_min_height())
	var margin := make_general_skill_library_summary_pill_margin()
	panel.add_child(margin)
	margin.add_child(make_general_skill_library_summary_pill_label(text, color))
	return panel


static func apply_general_skill_library_card_summary(summary: Dictionary) -> void:
	summary["skillLibraryCardChromeToken"] = GENERAL_SKILL_LIBRARY_CARD_CHROME_TOKEN
	summary["skillLibraryBadgePillToken"] = GENERAL_SKILL_LIBRARY_BADGE_PILL_TOKEN
	summary["skillLibraryPrimaryCardMinHeight"] = general_skill_library_primary_card_min_height()
	summary["skillLibraryGalleryCardMinHeight"] = general_skill_library_gallery_card_min_height()
	summary["skillLibraryBadgeMinHeight"] = int(general_skill_library_badge_min_size().y)
	summary["skillLibrarySummaryPillMinHeight"] = general_skill_library_summary_pill_min_height()
	summary["skillLibraryBadgeMinWidth"] = general_skill_library_badge_min_width()
	summary["skillLibraryBadgePanelRadius"] = general_skill_library_badge_panel_radius()
	summary["skillLibraryBadgeMarginLeft"] = general_skill_library_badge_margin_left()
	summary["skillLibraryBadgeMarginTop"] = general_skill_library_badge_margin_top()
	summary["skillLibraryBadgeMarginRight"] = general_skill_library_badge_margin_right()
	summary["skillLibraryBadgeMarginBottom"] = general_skill_library_badge_margin_bottom()
	summary["skillLibraryBadgeColumnSpacing"] = general_skill_library_badge_column_spacing()
	summary["skillLibraryBadgeGradeFontSize"] = general_skill_library_badge_grade_font_size()
	summary["skillLibraryBadgeTypeFontSize"] = general_skill_library_badge_type_font_size()
	summary["skillLibraryBadgePillTextRoleToken"] = GENERAL_SKILL_LIBRARY_BADGE_PILL_TEXT_ROLE_TOKEN
	summary["skillLibraryBadgeGradeMaxChars"] = general_skill_library_badge_grade_max_chars()
	summary["skillLibraryBadgeGradeMaxLines"] = general_skill_library_badge_grade_max_lines()
	summary["skillLibraryBadgeTypeMaxChars"] = general_skill_library_badge_type_max_chars()
	summary["skillLibraryBadgeTypeMaxLines"] = general_skill_library_badge_type_max_lines()
	summary["skillLibrarySummaryPillMinWidth"] = general_skill_library_summary_pill_min_width()
	summary["skillLibrarySummaryPillCharWidth"] = general_skill_library_summary_pill_char_width()
	summary["skillLibrarySummaryPillWidthPadding"] = general_skill_library_summary_pill_width_padding()
	summary["skillLibrarySummaryPillPanelRadius"] = general_skill_library_summary_pill_panel_radius()
	summary["skillLibrarySummaryPillMarginLeft"] = general_skill_library_summary_pill_margin_left()
	summary["skillLibrarySummaryPillMarginTop"] = general_skill_library_summary_pill_margin_top()
	summary["skillLibrarySummaryPillMarginRight"] = general_skill_library_summary_pill_margin_right()
	summary["skillLibrarySummaryPillMarginBottom"] = general_skill_library_summary_pill_margin_bottom()
	summary["skillLibrarySummaryPillFontSize"] = general_skill_library_summary_pill_font_size()
	summary["skillLibrarySummaryPillTextRoleToken"] = GENERAL_SKILL_LIBRARY_SUMMARY_PILL_TEXT_ROLE_TOKEN
	summary["skillLibrarySummaryPillTextMaxChars"] = general_skill_library_summary_pill_text_max_chars()
	summary["skillLibrarySummaryPillTextMaxLines"] = general_skill_library_summary_pill_text_max_lines()


static func general_skill_library_primary_title_font_size(highlighted: bool = false) -> int:
	return 22 if highlighted else 20


static func general_skill_library_primary_title_max_chars() -> int:
	return 12


static func general_skill_library_primary_title_max_lines() -> int:
	return 1


static func general_skill_library_primary_source_font_size() -> int:
	return 13


static func general_skill_library_primary_source_max_chars() -> int:
	return 18


static func general_skill_library_primary_source_max_lines() -> int:
	return 1


static func general_skill_library_primary_description_font_size() -> int:
	return 15


static func general_skill_library_primary_description_max_chars() -> int:
	return 30


static func general_skill_library_primary_description_max_lines() -> int:
	return 1


static func general_skill_library_primary_meta_font_size() -> int:
	return 12


static func general_skill_library_primary_meta_max_chars() -> int:
	return 30


static func general_skill_library_primary_meta_max_lines() -> int:
	return 1


static func general_skill_library_feature_chip_max_chars() -> int:
	return 12


static func general_skill_library_gallery_title_font_size() -> int:
	return 20


static func general_skill_library_gallery_title_max_chars() -> int:
	return 10


static func general_skill_library_gallery_title_max_lines() -> int:
	return 1


static func general_skill_library_gallery_effect_font_size() -> int:
	return 13


static func general_skill_library_gallery_effect_max_chars() -> int:
	return 42


static func general_skill_library_gallery_effect_max_lines() -> int:
	return 2


static func general_skill_library_gallery_meta_font_size() -> int:
	return 12


static func general_skill_library_gallery_meta_max_chars() -> int:
	return 28


static func general_skill_library_gallery_meta_max_lines() -> int:
	return 1


static func general_skill_library_trim_text(text: String, limit: int) -> String:
	var value := text.strip_edges()
	if limit <= 0 or value.length() <= limit:
		return value
	if limit <= 1:
		return value.left(limit)
	return value.left(limit - 1) + "…"


static func make_general_skill_library_text_role_label(text: String, font_size: int, color: Color, max_chars: int, max_lines: int, wrap: bool, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	var label := make_label(general_skill_library_trim_text(text, max_chars), font_size, color, align, wrap)
	label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	if max_lines > 0:
		label.max_lines_visible = max_lines
	return label


static func make_general_skill_library_card_text_label(text: String, font_size: int, color: Color, max_chars: int, max_lines: int, wrap: bool) -> Label:
	return make_general_skill_library_text_role_label(text, font_size, color, max_chars, max_lines, wrap)


static func make_general_skill_library_summary_pill_label(text: String, color: Color) -> Label:
	return make_general_skill_library_text_role_label(text, general_skill_library_summary_pill_font_size(), color, general_skill_library_summary_pill_text_max_chars(), general_skill_library_summary_pill_text_max_lines(), false, HORIZONTAL_ALIGNMENT_CENTER)


static func make_general_skill_library_primary_title_label(text: String, highlighted: bool, color: Color) -> Label:
	return make_general_skill_library_card_text_label(text, general_skill_library_primary_title_font_size(highlighted), color, general_skill_library_primary_title_max_chars(), general_skill_library_primary_title_max_lines(), false)


static func make_general_skill_library_primary_source_label(text: String, color: Color) -> Label:
	return make_general_skill_library_card_text_label(text, general_skill_library_primary_source_font_size(), color, general_skill_library_primary_source_max_chars(), general_skill_library_primary_source_max_lines(), false)


static func make_general_skill_library_primary_description_label(text: String, color: Color) -> Label:
	return make_general_skill_library_card_text_label(text, general_skill_library_primary_description_font_size(), color, general_skill_library_primary_description_max_chars(), general_skill_library_primary_description_max_lines(), true)


static func make_general_skill_library_primary_meta_label(text: String, color: Color) -> Label:
	return make_general_skill_library_card_text_label(text, general_skill_library_primary_meta_font_size(), color, general_skill_library_primary_meta_max_chars(), general_skill_library_primary_meta_max_lines(), false)


static func make_general_skill_library_gallery_title_label(text: String, color: Color) -> Label:
	return make_general_skill_library_card_text_label(text, general_skill_library_gallery_title_font_size(), color, general_skill_library_gallery_title_max_chars(), general_skill_library_gallery_title_max_lines(), false)


static func make_general_skill_library_gallery_effect_label(text: String, color: Color) -> Label:
	return make_general_skill_library_card_text_label(text, general_skill_library_gallery_effect_font_size(), color, general_skill_library_gallery_effect_max_chars(), general_skill_library_gallery_effect_max_lines(), true)


static func make_general_skill_library_gallery_meta_label(text: String, color: Color) -> Label:
	return make_general_skill_library_card_text_label(text, general_skill_library_gallery_meta_font_size(), color, general_skill_library_gallery_meta_max_chars(), general_skill_library_gallery_meta_max_lines(), false)


static func apply_general_skill_library_card_text_summary(summary: Dictionary) -> void:
	summary["skillLibraryCardTextToken"] = GENERAL_SKILL_LIBRARY_CARD_TEXT_TOKEN
	summary["skillLibraryCardTextRoleToken"] = GENERAL_SKILL_LIBRARY_CARD_TEXT_ROLE_TOKEN
	summary["skillLibraryDeckCardTextBuilderToken"] = general_skill_library_deck_card_text_builder_token()
	summary["skillLibraryDeckCardTitleFallback"] = general_skill_library_deck_card_title_fallback()
	summary["skillLibraryDeckCardSourceFallback"] = general_skill_library_deck_card_source_fallback()
	summary["skillLibraryDeckCardSourceDictKey"] = general_skill_library_deck_card_source_dict_key()
	summary["skillLibraryDeckCardDescriptionFallback"] = general_skill_library_deck_card_description_fallback()
	summary["skillLibraryDeckCardMetaFormat"] = general_skill_library_deck_card_meta_format()
	summary["skillLibraryDeckCardMetaSeparator"] = general_skill_library_deck_card_meta_separator()
	summary["skillLibraryDeckCardMetaSegmentSeparator"] = general_skill_library_deck_card_meta_segment_separator()
	summary["skillLibraryDeckCardTroopFallback"] = general_skill_library_deck_card_troop_fallback()
	summary["skillLibraryDeckCardRoleFallback"] = general_skill_library_deck_card_role_fallback()
	summary["skillLibraryDeckCardMetaTroopLimit"] = general_skill_library_deck_card_meta_troop_limit()
	summary["skillLibraryDeckCardSearchMatchMetaPreferred"] = general_skill_library_deck_card_search_match_meta_preferred()
	summary["skillLibraryPrimaryTitleFontSize"] = general_skill_library_primary_title_font_size(false)
	summary["skillLibraryPrimaryTitleMaxChars"] = general_skill_library_primary_title_max_chars()
	summary["skillLibraryPrimaryTitleMaxLines"] = general_skill_library_primary_title_max_lines()
	summary["skillLibraryHighlightedTitleFontSize"] = general_skill_library_primary_title_font_size(true)
	summary["skillLibraryPrimarySourceFontSize"] = general_skill_library_primary_source_font_size()
	summary["skillLibraryPrimarySourceMaxChars"] = general_skill_library_primary_source_max_chars()
	summary["skillLibraryPrimarySourceMaxLines"] = general_skill_library_primary_source_max_lines()
	summary["skillLibraryPrimaryDescriptionFontSize"] = general_skill_library_primary_description_font_size()
	summary["skillLibraryPrimaryDescriptionMaxChars"] = general_skill_library_primary_description_max_chars()
	summary["skillLibraryPrimaryDescriptionMaxLines"] = general_skill_library_primary_description_max_lines()
	summary["skillLibraryPrimaryMetaFontSize"] = general_skill_library_primary_meta_font_size()
	summary["skillLibraryPrimaryMetaMaxChars"] = general_skill_library_primary_meta_max_chars()
	summary["skillLibraryPrimaryMetaMaxLines"] = general_skill_library_primary_meta_max_lines()
	summary["skillLibraryFeatureChipMaxChars"] = general_skill_library_feature_chip_max_chars()
	summary["skillLibraryGalleryTitleFontSize"] = general_skill_library_gallery_title_font_size()
	summary["skillLibraryGalleryTitleMaxChars"] = general_skill_library_gallery_title_max_chars()
	summary["skillLibraryGalleryTitleMaxLines"] = general_skill_library_gallery_title_max_lines()
	summary["skillLibraryGalleryEffectFontSize"] = general_skill_library_gallery_effect_font_size()
	summary["skillLibraryGalleryEffectMaxChars"] = general_skill_library_gallery_effect_max_chars()
	summary["skillLibraryGalleryEffectMaxLines"] = general_skill_library_gallery_effect_max_lines()
	summary["skillLibraryGalleryMetaFontSize"] = general_skill_library_gallery_meta_font_size()
	summary["skillLibraryGalleryMetaMaxChars"] = general_skill_library_gallery_meta_max_chars()
	summary["skillLibraryGalleryMetaMaxLines"] = general_skill_library_gallery_meta_max_lines()


static func apply_general_skill_library_deck_header_summary(summary: Dictionary) -> void:
	summary["skillLibraryDeckHeaderToken"] = GENERAL_SKILL_LIBRARY_DECK_HEADER_TOKEN
	summary["skillLibraryDeckHeaderSpacing"] = general_skill_library_deck_header_spacing()
	summary["skillLibraryDeckHeaderTitleFontSize"] = general_skill_library_deck_header_title_font_size()
	summary["skillLibraryDeckHeaderSummaryFontSize"] = general_skill_library_deck_header_summary_font_size()


static func apply_general_skill_library_deck_body_summary(summary: Dictionary) -> void:
	summary["skillLibraryDeckBodyToken"] = GENERAL_SKILL_LIBRARY_DECK_BODY_TOKEN
	summary["skillLibraryDeckBodyMarginLeft"] = general_skill_library_deck_body_margin_left()
	summary["skillLibraryDeckBodyMarginTop"] = general_skill_library_deck_body_margin_top()
	summary["skillLibraryDeckBodyMarginRight"] = general_skill_library_deck_body_margin_right()
	summary["skillLibraryDeckBodyMarginBottom"] = general_skill_library_deck_body_margin_bottom()
	summary["skillLibraryDeckBodyColumnSpacing"] = general_skill_library_deck_body_column_spacing()
	summary["skillLibraryDeckBodyPanelRadius"] = general_skill_library_deck_body_panel_radius()


static func apply_general_skill_library_deck_card_layout_summary(summary: Dictionary) -> void:
	summary["skillLibraryDeckCardLayoutToken"] = GENERAL_SKILL_LIBRARY_DECK_CARD_LAYOUT_TOKEN
	summary["skillLibraryDeckCardMarginLeft"] = general_skill_library_deck_card_margin_left()
	summary["skillLibraryDeckCardMarginTop"] = general_skill_library_deck_card_margin_top()
	summary["skillLibraryDeckCardMarginRight"] = general_skill_library_deck_card_margin_right()
	summary["skillLibraryDeckCardMarginBottom"] = general_skill_library_deck_card_margin_bottom()
	summary["skillLibraryDeckCardColumnSpacing"] = general_skill_library_deck_card_column_spacing()
	summary["skillLibraryDeckCardTopSpacing"] = general_skill_library_deck_card_top_spacing()
	summary["skillLibraryDeckCardTitleStackSpacing"] = general_skill_library_deck_card_title_stack_spacing()
	summary["skillLibraryDeckCardChipRowSpacing"] = general_skill_library_deck_card_chip_row_spacing()
	summary["skillLibraryDeckCardFeatureChipLimit"] = general_skill_library_deck_card_feature_chip_limit()
	summary["skillLibraryDeckCardSectionRuleToken"] = general_skill_library_deck_card_section_rule_token()
	summary["skillLibraryDeckCardSectionRuleNodeName"] = general_skill_library_deck_card_section_rule_node_name()
	summary["skillLibraryDeckCardSectionRuleHeight"] = general_skill_library_deck_card_section_rule_height()
	summary["skillLibraryDeckCardSectionRuleAlphaPercent"] = general_skill_library_deck_card_section_rule_alpha_percent()


static func general_skill_detail_popup_field_label_font_size() -> int:
	return 21


static func general_skill_detail_popup_field_value_font_size() -> int:
	return 20


static func general_skill_detail_popup_layout(viewport_size: Vector2) -> Dictionary:
	var popup_size := Vector2i(
		mini(760, maxi(300, int(viewport_size.x) - 48)),
		mini(620, maxi(380, int(viewport_size.y) - 72))
	)
	return {
		"token": GENERAL_SKILL_DETAIL_POPUP_LAYOUT_TOKEN,
		"size": popup_size,
		"position": Vector2(
			maxf(16.0, (viewport_size.x - float(popup_size.x)) * 0.5),
			maxf(30.0, (viewport_size.y - float(popup_size.y)) * 0.5)
		),
		"scroll_min_height": general_skill_detail_popup_scroll_min_height(float(popup_size.y)),
		"field_label_width": general_skill_detail_popup_field_label_width(),
	}


static func general_skill_detail_popup_scroll_min_height(popup_height: float) -> float:
	return maxf(220.0, popup_height - 260.0)


static func general_skill_detail_popup_field_label_width() -> int:
	return 92


static func general_skill_detail_popup_field_specs() -> Array:
	return [
		{"id": "trigger", "label": "触发"},
		{"id": "target", "label": "目标"},
		{"id": "effect", "label": "效果"},
		{"id": "troops", "label": "适用兵种"},
		{"id": "source", "label": "来源"},
	]


static func apply_general_skill_detail_popup_close_button_style(button: Button) -> void:
	if button == null:
		return
	button.custom_minimum_size = Vector2(52, 46)
	button.add_theme_font_size_override("font_size", 22)
	apply_button_style(
		button,
		Color(0.18, 0.07, 0.055, 0.86),
		Color(0.83, 0.30, 0.22, 0.70),
		Color(0.94, 0.91, 0.84, 1.0),
		Color(0.94, 0.91, 0.84, 1.0),
		4,
		0.06,
		0.06
	)


static func apply_general_skill_detail_popup_summary(summary: Dictionary, visible: bool, popup_size: Vector2, field_count: int, has_scroll: bool) -> void:
	summary["skillDetailPopupLayoutToken"] = GENERAL_SKILL_DETAIL_POPUP_LAYOUT_TOKEN
	summary["skillDetailPopupCloseButtonToken"] = GENERAL_SKILL_DETAIL_POPUP_CLOSE_BUTTON_TOKEN
	summary["skillDetailPopupCloseButtonLiveTextContract"] = "skill_detail_popup_close_live_text_v1"
	summary["skillDetailPopupCloseButtonActionId"] = "skill_detail_popup_close"
	summary["skillDetailPopupFieldSummaryToken"] = GENERAL_SKILL_DETAIL_POPUP_FIELD_SUMMARY_TOKEN
	summary["skillDetailPopupVisible"] = visible
	summary["skillDetailPopupMode"] = "full_skill_explanation" if visible else ""
	summary["skillDetailPopupFieldCount"] = field_count if visible else 0
	summary["skillDetailPopupHasScroll"] = has_scroll if visible else false
	summary["skillDetailPopupScrollBarVisible"] = false
	summary["skillDetailPopupFieldLabelFontSize"] = general_skill_detail_popup_field_label_font_size()
	summary["skillDetailPopupFieldValueFontSize"] = general_skill_detail_popup_field_value_font_size()
	summary["skillDetailPopupWidth"] = int(popup_size.x) if visible else 0
	summary["skillDetailPopupHeight"] = int(popup_size.y) if visible else 0
