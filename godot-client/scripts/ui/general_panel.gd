extends "res://scripts/ui/slg_snapshot_panel.gd"
class_name GeneralPanel

const BG_PANEL := Color(0.055, 0.052, 0.047, 0.62)
const BG_PANEL_ALT := Color(0.080, 0.072, 0.060, 0.58)
const BG_DATA := Color(0.025, 0.024, 0.021, 0.56)
const BG_ROW := Color(0.090, 0.083, 0.072, 0.58)
const BG_ROW_ACTIVE := Color(0.16, 0.115, 0.065, 0.72)
const BORDER := Color(0.42, 0.34, 0.18, 0.52)
const BORDER_ACTIVE := Color(0.92, 0.67, 0.24, 0.92)
const BORDER_DATA := Color(0.36, 0.29, 0.15, 0.28)
const TEXT_MAIN := Color(0.94, 0.91, 0.84, 1.0)
const TEXT_MUTED := Color(0.70, 0.67, 0.58, 1.0)
const TEXT_GOLD := Color(0.95, 0.72, 0.32, 1.0)
const TEXT_RED := Color(0.83, 0.30, 0.22, 1.0)
const TEXT_GREEN := Color(0.42, 0.72, 0.42, 1.0)
const TEXT_BLUE := Color(0.42, 0.58, 0.78, 1.0)
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")
const HERO_CARD_VIEW := preload("res://scripts/ui/formal_pack/components/hero_card_view.gd")
const PORTRAIT_ASSET_REGISTRY := preload("res://scripts/ui/portrait_asset_registry.gd")
const GENERAL_ROSTER_RENDERER := preload("res://scripts/ui/general_components/general_roster_list_renderer.gd")
const GENERAL_ROSTER_PREVIEW_RENDERER := preload("res://scripts/ui/general_components/general_roster_preview_renderer.gd")
const GENERAL_PROFILE_TAB_STRIP_RENDERER := preload("res://scripts/ui/general_components/general_profile_tab_strip_renderer.gd")
const GENERAL_PROFILE_STAGE_RENDERER := preload("res://scripts/ui/general_components/general_profile_stage_renderer.gd")
const GENERAL_PROFILE_DETAIL_STACK_RENDERER := preload("res://scripts/ui/general_components/general_profile_detail_stack_renderer.gd")
const GENERAL_PROFILE_CONTENT_RENDERER := preload("res://scripts/ui/general_components/general_profile_content_renderer.gd")
const GENERAL_PROFILE_TACTICS_RENDERER := preload("res://scripts/ui/general_components/general_profile_tactics_renderer.gd")
const GENERAL_PROFILE_GROWTH_RENDERER := preload("res://scripts/ui/general_components/general_profile_growth_renderer.gd")
const GENERAL_PROFILE_SKILL_LIBRARY_RENDERER := preload("res://scripts/ui/general_components/general_profile_skill_library_renderer.gd")

var _skill_detail_dialog: PanelContainer = null
var _skill_detail_popup_skill: Dictionary = {}
var _skill_library_grade_filter := "S"
var _skill_library_type_filter := "全部"
var _skill_library_troop_filter := "全部"
var _skill_library_tag_filter := "全部"
var _skill_library_source_filter := "全部"
var _skill_library_search_text := ""
var _skill_library_sort_mode := "品质"
var _skill_library_source_filter_expanded := false
var _skill_library_tag_filter_expanded := false
var _troop_preview_variant_index := 0
var _troop_preview_slide_direction := 0

func _init() -> void:
	panel_title = "武将"
	panel_subtitle = "武将卡组"
	panel_empty_state_text = "等待武将域数据。"

func set_general_snapshot(snapshot: Dictionary) -> void:
	_snapshot = snapshot.duplicate(true)
	_load_skill_library_ui_state()
	if _snapshot_requests_main_map_library() and _snapshot_has_page("library"):
		_active_page_id = "library"
	elif _active_page_id == "" or not _snapshot_has_page(_active_page_id):
		_active_page_id = _resolve_default_page_id()
	_refresh_panel()

func _refresh_panel() -> void:
	if _panel_host == null or not is_instance_valid(_panel_host):
		return
	if _active_page_id == "":
		_active_page_id = _resolve_default_page_id()
	_panel_host.call("set_panel_title", str(_snapshot.get("title", panel_title)))
	_panel_host.call("set_back_button_label", "返回地图")
	_panel_host.call("set_close_button_label", "关闭")
	_panel_host.call("set_empty_state_text", str(_snapshot.get("empty_state_text", panel_empty_state_text)))
	_panel_host.call("set_tabs", [])
	if _panel_host.has_method("set_title_font_size"):
		_panel_host.call("set_title_font_size", 32 if _active_page_id == "library" and _is_main_map_independent_library_page() else 24)
	if _panel_host.has_method("set_header_visible"):
		_panel_host.call("set_header_visible", false)
	if _panel_host.has_method("set_body_margins"):
		_panel_host.call("set_body_margins", 0, 0, 0, 0)
	if _panel_host.has_method("set_content_margins"):
		_panel_host.call("set_content_margins", 0, 0, 0, 0)
	if _panel_host.has_method("set_content_frame_transparent"):
		_panel_host.call("set_content_frame_transparent", true)
	if _active_page_id != "":
		_panel_host.call("set_active_tab", _active_page_id)
	if _active_page_id == "roster":
		var content_node := _build_roster_page()
		UI_COMPONENT_FACTORY.apply_motion_general_panel_enter(content_node, 0)
		_panel_host.call("set_content_node", content_node)
		return
	if _active_page_id == "library" and _is_main_map_independent_library_page():
		var library_node := _build_library_standalone_page()
		UI_COMPONENT_FACTORY.apply_motion_skill_library_browser_enter(library_node, 0)
		_panel_host.call("set_content_node", library_node)
		return
	if _active_page_id == "profile" or _active_page_id == "tactics" or _active_page_id == "library" or _active_page_id == "growth":
		var profile_node := _build_profile_page(_active_page_id)
		UI_COMPONENT_FACTORY.apply_motion_general_panel_enter(profile_node, 0)
		_panel_host.call("set_content_node", profile_node)
		return
	super._refresh_panel()

func get_mainline_visual_smoke_summary(page_id: String = "") -> Dictionary:
	var summary := super.get_mainline_visual_smoke_summary(page_id)
	var active_entry := _active_entry()
	summary["activeHeroId"] = str(active_entry.get("id", ""))
	summary["activeHeroName"] = str(active_entry.get("display_name", ""))
	_apply_active_hero_owner_summary(summary, active_entry)
	var resolved_page_id := str(summary.get("requestedPageId", page_id)).strip_edges()
	if resolved_page_id == "":
		resolved_page_id = str(summary.get("activePageId", _active_page_id)).strip_edges()
	var is_player_flow_page := ["roster", "profile", "tactics", "library", "growth"].has(resolved_page_id)
	UI_COMPONENT_FACTORY.apply_design_system_summary(summary, "general_formal_pack", "preview_read_model_shell", is_player_flow_page)
	UI_COMPONENT_FACTORY.apply_general_motion_summary(summary)
	if resolved_page_id == "library" and _is_main_map_independent_library_page():
		UI_COMPONENT_FACTORY.apply_skill_library_motion_summary(summary)
	summary["generalThemeTokenSet"] = UI_COMPONENT_FACTORY.DESIGN_SYSTEM_ID
	summary["generalPageTokenState"] = resolved_page_id
	summary["generalFontScaleMode"] = UI_COMPONENT_FACTORY.DESIGN_TOKEN_VERSION
	summary["generalButtonScaleMode"] = UI_COMPONENT_FACTORY.DESIGN_TOKEN_VERSION
	if resolved_page_id == "roster":
		HERO_CARD_VIEW.append_smoke_summary(summary, HERO_CARD_VIEW.MODE_OWNED_ROSTER, false, _roster_entries().size(), true, _roster_entries(), HERO_CARD_VIEW.full_card_config(HERO_CARD_VIEW.MODE_OWNED_ROSTER))
		UI_COMPONENT_FACTORY.apply_portrait_frame_summary(summary, "generalRoster", UI_COMPONENT_FACTORY.PORTRAIT_FRAME_ROSTER_CARD_VARIANT)
		summary["rosterCardMode"] = "owned_roster"
		UI_COMPONENT_FACTORY.apply_general_roster_responsive_flow_summary(summary)
		summary["rosterOwnerSlotFieldSource"] = "owner_display_name"
		summary["rosterOwnerDisplayNameSampleCount"] = _roster_owner_display_name_count(_roster_entries())
		summary["rosterChromeMode"] = "card_grid_entry_only"
		summary["rosterTabStripVisible"] = false
		summary["rosterFilterBarVisible"] = false
		summary["rosterSelectorVisible"] = false
		summary["rosterCloseButtonVisible"] = true
		UI_COMPONENT_FACTORY.apply_general_roster_close_button_summary(summary)
		UI_COMPONENT_FACTORY.apply_general_roster_detail_button_summary(summary)
		summary["rosterOpensProfileOnCardClick"] = true
	elif ["profile", "tactics", "library", "growth"].has(resolved_page_id):
		_apply_detail_visual_smoke_summary(summary, resolved_page_id, active_entry)
	if resolved_page_id == "library":
		_apply_skill_library_button_visual_smoke_summary(summary)
	_apply_skill_detail_popup_visual_smoke_summary(summary)
	_apply_skill_card_flip_visual_smoke_summary(summary)
	return summary

func _apply_detail_visual_smoke_summary(summary: Dictionary, page_id: String, active_entry: Dictionary) -> void:
	summary["ok"] = not active_entry.is_empty()
	summary["generalDetailViewMode"] = "formal_pack_hero_stage_detail"
	summary["generalDetailPageMode"] = page_id
	summary["profileStageVisible"] = true
	summary["profileTabStripVisible"] = true
	summary["profileDetailStackVisible"] = true
	summary["profileStageRenderer"] = "general_profile_stage_renderer"
	summary["profileDetailStackRenderer"] = "general_profile_detail_stack_renderer"
	summary["profileDetailHeaderRenderer"] = "general_profile_content_renderer"
	var profile_stage_resolution := _portrait_resolution_summary(active_entry)
	summary["activeHeroPortraitAssetRefMode"] = str(profile_stage_resolution.get("resolve_mode", ""))
	summary["activeHeroPortraitAssetKey"] = str(_portrait_payload(active_entry).get("portraitAssetKey", ""))
	UI_COMPONENT_FACTORY.apply_portrait_frame_summary(summary, "profileStage", UI_COMPONENT_FACTORY.PORTRAIT_FRAME_DETAIL_LARGE_VARIANT)
	summary["profileStagePortraitResolveMode"] = str(profile_stage_resolution.get("resolve_mode", ""))
	summary["profileStagePortraitResolvedBy"] = str(profile_stage_resolution.get("resolved_by", ""))
	summary["profileStagePortraitFallbackCount"] = int(profile_stage_resolution.get("fallback_count", 0))
	summary["authorityTriggered"] = false
	if page_id != "library" or not _is_main_map_independent_library_page():
		UI_COMPONENT_FACTORY.apply_general_profile_back_button_summary(summary)
		UI_COMPONENT_FACTORY.apply_general_profile_tab_strip_summary(summary)
		UI_COMPONENT_FACTORY.apply_general_profile_stage_action_button_summary(summary)
	if page_id == "library" and _is_main_map_independent_library_page():
		summary["generalDetailViewMode"] = "readonly_skill_library_browser"
		summary["profileStageVisible"] = false
		summary["profileTabStripVisible"] = false
		summary["profileDetailStackVisible"] = false
		summary["profileStageRenderer"] = ""
		summary["profileDetailStackRenderer"] = ""
		summary["profileDetailHeaderRenderer"] = ""
		summary["skillLibraryEntryMode"] = "main_map_independent"
		summary["skillLibraryStandalone"] = true
	match page_id:
		"profile":
			summary["profileContentMode"] = "attribute_skill_detail"
			UI_COMPONENT_FACTORY.apply_general_profile_attribute_chip_summary(summary)
			var profile_skills := _dictionary_array(active_entry.get("skills", []))
			UI_COMPONENT_FACTORY.apply_general_profile_skill_button_summary(summary, profile_skills.size(), int(active_entry.get("learnable_skill_slots", 2)))
			_apply_profile_skill_button_runtime_summary(summary)
			UI_COMPONENT_FACTORY.apply_general_profile_progress_line_summary(summary)
		"tactics":
			summary["tacticsViewMode"] = "point_allocation_preview"
			summary["tacticsRenderer"] = "general_profile_tactics_renderer"
			summary["tacticsActionMode"] = "authority_buttons_present_not_triggered"
			summary["tacticsSchemeTabCount"] = 3
			UI_COMPONENT_FACTORY.apply_general_tactics_scheme_tab_summary(summary)
			UI_COMPONENT_FACTORY.apply_general_tactics_step_button_summary(summary)
			UI_COMPONENT_FACTORY.apply_general_tactics_preview_action_chip_summary(summary)
			UI_COMPONENT_FACTORY.apply_general_tactics_stat_tag_summary(summary)
			UI_COMPONENT_FACTORY.apply_general_tactics_summary_card_summary(summary)
			summary["tacticsAllocationRowTarget"] = 5
			summary["tacticsPreviewActionCount"] = 2
		"library":
			var library_payload := _skill_library_filter_payload()
			var filtered_library := _dictionary_array(library_payload.get("filtered_entries", []))
			var type_options := _dictionary_array(library_payload.get("type_options", []))
			var type_labels: Array[String] = []
			for option_variant in type_options:
				var option := option_variant as Dictionary
				var type_label := str(option.get("type", "")).strip_edges()
				if type_label != "":
					type_labels.append(type_label)
			summary["skillLibraryViewMode"] = "readonly_skill_library_browser"
			summary["skillLibraryPayloadRenderer"] = "general_profile_skill_library_renderer"
			summary["skillLibraryCount"] = int(library_payload.get("total_count", _skill_library_entries().size()))
			summary["skillLibraryFilteredCount"] = filtered_library.size()
			summary["skillLibraryActiveTypeFilter"] = _skill_library_type_filter
			if ["追击", "主动", "被动", "指挥"].has(_skill_library_type_filter):
				var type_smoke_summary := _skill_library_type_showcase_smoke_summary(_skill_library_type_filter)
				for key_variant in type_smoke_summary.keys():
					summary[key_variant] = type_smoke_summary.get(key_variant)
			summary["skillLibraryFilterMode"] = "local_readonly_filter"
			summary["skillLibraryActionMode"] = "local_filter_card_flip_only"
			summary["skillLibrarySearchVisible"] = true
			summary["skillLibraryFilterRowCount"] = 6
			summary["skillLibraryVisualMode"] = "full_page_card_rail"
			summary["skillLibraryVisualDensity"] = "hero_card_skill_plate_rail"
			var skill_library_card_count := UI_COMPONENT_FACTORY.general_skill_library_deck_visible_card_target(filtered_library.size())
			var skill_library_card_config := HERO_CARD_VIEW.full_card_config(HERO_CARD_VIEW.MODE_DRAW_RESULT)
			var skill_library_card_width := float(skill_library_card_config.get("width", HERO_CARD_VIEW.FULL_CARD_WIDTH))
			var skill_library_card_height := float(skill_library_card_config.get("height", HERO_CARD_VIEW.FULL_CARD_HEIGHT))
			var skill_library_card_gap := int(HERO_CARD_VIEW.FULL_CARD_GAP)
			var skill_library_initial_visible_target := UI_COMPONENT_FACTORY.general_skill_library_deck_visible_card_target(skill_library_card_count)
			var skill_library_sample_entries := GENERAL_PROFILE_SKILL_LIBRARY_RENDERER.hero_card_entries_for_payload(filtered_library, "", skill_library_card_count)
			HERO_CARD_VIEW.append_smoke_summary(summary, HERO_CARD_VIEW.MODE_DRAW_RESULT, false, skill_library_card_count, true, skill_library_sample_entries, skill_library_card_config)
			UI_COMPONENT_FACTORY.apply_card_rail_summary(summary, "skillLibraryDeckCardRail", skill_library_initial_visible_target)
			UI_COMPONENT_FACTORY.apply_card_rail_geometry_summary(summary, "skillLibraryDeck", skill_library_card_width, skill_library_card_height, skill_library_card_gap, skill_library_card_count, skill_library_initial_visible_target)
			summary["skillLibraryDeckCardRailVisibleCount"] = skill_library_card_count
			summary["skillLibraryDeckCardGridRenderedCount"] = filtered_library.size()
			summary["skillLibraryDeckCardGridColumns"] = skill_library_card_count
			summary["skillLibraryDeckCardGridMode"] = "responsive_centered_skill_card_grid_v1"
			summary["skillLibraryDeckCardScrollAxis"] = "vertical_touch_scroll_v1"
			summary["skillLibraryDeckCardMode"] = "draw_result"
			summary["skillLibraryDeckCardPreviewKind"] = "skill"
			summary["skillLibraryDeckCardVisualMode"] = HERO_CARD_VIEW.HERO_CARD_SKILL_PLATE_VISUAL_MODE
			summary["skillLibraryDeckCardFrontTextMode"] = str(summary.get("heroCardSkillCardFrontTextMode", ""))
			summary["skillLibraryDeckCardAssetRefSlotMode"] = str(summary.get("heroCardSkillCardAssetRefSlotMode", ""))
			summary["skillLibraryDeckCardAssetRefSlotCount"] = int(summary.get("heroCardSkillCardAssetRefSlotCount", 0))
			summary["skillLibraryDeckCardAssetRefTextureCount"] = int(summary.get("heroCardSkillCardAssetRefTextureCount", 0))
			summary["skillLibraryDeckCardAssetFitMode"] = str(summary.get("heroCardSkillCardAssetFitMode", ""))
			summary["skillLibraryDeckCardNoCropAssetCount"] = int(summary.get("heroCardSkillCardNoCropAssetCount", 0))
			summary["skillLibraryDeckCardAssetSafeMargin"] = str(summary.get("heroCardSkillCardAssetSafeMargin", ""))
			summary["skillLibraryDeckCardAssetPreprocess"] = str(summary.get("heroCardSkillCardAssetPreprocess", ""))
			summary["skillLibraryDeckCardTopStarsVisible"] = bool(summary.get("heroCardSkillCardTopStarsVisible", false))
			summary["skillLibraryDeckCardDrawOverlayTextCount"] = int(summary.get("heroCardSkillCardDrawOverlayTextCount", 0))
			summary["skillLibraryDeckCardBottomStatusTextCount"] = int(summary.get("heroCardSkillCardBottomStatusTextCount", 0))
			summary["skillLibraryDeckCardBottomStatusMode"] = str(summary.get("heroCardSkillCardBottomStatusMode", ""))
			summary["skillLibraryDeckCardTypeLabelTextCount"] = int(summary.get("heroCardSkillCardTypeLabelTextCount", 0))
			summary["skillLibraryDeckCardTypeLabelValues"] = str(summary.get("heroCardSkillCardTypeLabelValues", ""))
			summary["skillLibraryDeckCardTypeLabelFontSize"] = int(summary.get("heroCardSkillCardTypeLabelFontSize", 0))
			summary["skillLibraryDeckCardEquipStatusMode"] = str(summary.get("heroCardSkillCardEquipStatusMode", ""))
			summary["skillLibraryDeckCardFrontGradeTextCount"] = int(summary.get("heroCardSkillCardFrontGradeTextCount", 0))
			summary["skillLibraryDeckCardFrontNameTextCount"] = int(summary.get("heroCardSkillCardFrontNameTextCount", 0))
			summary["skillLibraryDeckCardFrontLevelTextCount"] = int(summary.get("heroCardSkillCardFrontLevelTextCount", 0))
			summary["skillLibraryDeckCardEquipReadModelSource"] = str(summary.get("heroCardSkillCardEquipReadModelSource", ""))
			summary["skillLibraryDeckCardLevelReadModelSource"] = str(summary.get("heroCardSkillCardLevelReadModelSource", ""))
			summary["skillLibraryDeckCardLevelRangeMode"] = str(summary.get("heroCardSkillCardLevelRangeMode", ""))
			summary["skillLibraryDeckCardLevelReadModelCount"] = int(summary.get("heroCardSkillCardLevelReadModelCount", 0))
			summary["skillLibraryDeckCardLevelRangeInvalidCount"] = int(summary.get("heroCardSkillCardLevelRangeInvalidCount", 0))
			summary["skillLibraryDeckCardLevelMin"] = int(summary.get("heroCardSkillCardLevelMin", 0))
			summary["skillLibraryDeckCardLevelMax"] = int(summary.get("heroCardSkillCardLevelMax", 0))
			summary["skillLibraryDeckCardDefaultLevelFallbackCount"] = int(summary.get("heroCardSkillCardDefaultLevelFallbackCount", 0))
			summary["skillLibraryDeckCardEquippedMissingLevelCount"] = int(summary.get("heroCardSkillCardEquippedMissingLevelCount", 0))
			var skill_library_summary: Dictionary = _shared_state().get("equipable_skill_library_summary", {}) as Dictionary
			summary["skillLibraryDeckCardAuthorityReadModelSource"] = str(skill_library_summary.get("skill_level_authority_source", ""))
			summary["skillLibraryDeckCardAuthorityStaticLevelFallbackAllowed"] = bool(skill_library_summary.get("skill_level_static_fallback_allowed", true))
			summary["skillLibraryDeckCardAuthorityEquippedSkillLevelCount"] = int(skill_library_summary.get("equipped_skill_level_count", 0))
			summary["skillLibraryDeckCardAuthorityMissingLevelCount"] = int(skill_library_summary.get("equipped_skill_missing_level_count", 0))
			summary["skillLibraryDeckCardAuthorityInvalidLevelCount"] = int(skill_library_summary.get("equipped_skill_invalid_level_count", 0))
			summary["skillLibraryDeckCardControllerStatusTextCount"] = int(summary.get("heroCardSkillCardControllerStatusTextCount", 0))
			summary["skillLibraryDeckCardControllerLevelTextCount"] = int(summary.get("heroCardSkillCardControllerLevelTextCount", 0))
			summary["skillLibraryDeckCardEquippedStatusTextCount"] = int(summary.get("heroCardSkillCardEquippedStatusTextCount", 0))
			summary["skillLibraryDeckCardEquippedLevelTextCount"] = int(summary.get("heroCardSkillCardEquippedLevelTextCount", 0))
			summary["skillLibraryDeckCardUnequippedLevelTextCount"] = int(summary.get("heroCardSkillCardUnequippedLevelTextCount", 0))
			summary["skillLibraryDeckCardDetailTextVisible"] = bool(summary.get("heroCardSkillCardDetailTextVisible", false))
			summary["skillLibraryDeckCardDetailTextCount"] = int(summary.get("heroCardSkillCardDetailTextCount", 0))
			summary["skillLibraryDeckCardFlipMode"] = str(summary.get("heroCardSkillCardFlipMode", ""))
			summary["skillLibraryDeckCardBackFaceAvailable"] = bool(summary.get("heroCardSkillBackFaceAvailable", false))
			summary["skillLibraryDeckCardBackFaceReadModelSource"] = str(summary.get("heroCardSkillBackFaceReadModelSource", ""))
			summary["skillLibraryDeckCardBackFaceFieldFontSize"] = int(summary.get("heroCardSkillBackFaceFieldFontSize", 0))
			summary["skillLibraryDeckCardBackFaceFieldMaxLines"] = int(summary.get("heroCardSkillBackFaceFieldMaxLines", 0))
			summary["skillLibraryDeckCardBackFaceTriggerTextCount"] = int(summary.get("heroCardSkillBackFaceTriggerTextCount", 0))
			summary["skillLibraryDeckCardBackFaceTargetTextCount"] = int(summary.get("heroCardSkillBackFaceTargetTextCount", 0))
			summary["skillLibraryDeckCardBackFaceEffectTextCount"] = int(summary.get("heroCardSkillBackFaceEffectTextCount", 0))
			summary["skillLibraryDeckCardBackFaceTroopsTextCount"] = int(summary.get("heroCardSkillBackFaceTroopsTextCount", 0))
			summary["skillLibraryDeckCardBackFaceSourceTextCount"] = int(summary.get("heroCardSkillBackFaceSourceTextCount", 0))
			summary["skillLibraryDeckCardComponent"] = "HeroCardView"
			summary["skillLibrarySearchResultReadModelSource"] = "skill_detail/read_model"
			summary["skillLibrarySearchResultReadModelVisible"] = _skill_library_search_text.strip_edges() != ""
			summary["skillLibrarySearchResultReadModelCount"] = filtered_library.size() if _skill_library_search_text.strip_edges() != "" else 0
			summary["skillLibraryVisibleCardTarget"] = skill_library_card_count
			summary["skillLibraryFilterRowCount"] = 5
			summary["skillLibraryFilterChipCount"] = 5
			summary["skillLibraryFilterAllButtonVisible"] = false
			summary["skillLibraryResetButtonVisible"] = false
			summary["skillLibraryStandaloneHeaderVisible"] = false
			summary["skillLibraryCountCaptionLabel"] = "战法"
			summary["skillLibraryCountPanelValueMode"] = "total"
			summary["skillLibraryMobileTouchScrollMode"] = "hidden_scrollbar_touch_scroll"
			summary["skillLibraryHostTitleFontSize"] = 32
			UI_COMPONENT_FACTORY.apply_general_skill_library_summary(summary, type_labels)
			summary["skillLibraryDescriptionMaxLines"] = 1
		"growth":
			var troop_variants := _troop_variant_specs(active_entry)
			summary["growthViewMode"] = "troop_preview_shell"
			summary["growthVariantRenderer"] = "general_profile_growth_renderer"
			summary["troopPreviewVariantIndex"] = _troop_preview_variant_index
			summary["troopPreviewVariantCount"] = troop_variants.size()
			summary["troopPreviewIllustrationSlotVisible"] = true
			summary["troopPreviewActionMode"] = "local_prev_next_only"
			UI_COMPONENT_FACTORY.apply_general_growth_entry_card_summary(summary)
			UI_COMPONENT_FACTORY.apply_general_growth_troop_arrow_button_summary(summary)
			UI_COMPONENT_FACTORY.apply_general_growth_troop_chip_summary(summary)

func _build_roster_page() -> Control:
	var scroll := ScrollContainer.new()
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	UI_COMPONENT_FACTORY.apply_mobile_touch_scroll_container(scroll)
	var root := MarginContainer.new()
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_theme_constant_override("margin_left", 24)
	root.add_theme_constant_override("margin_top", 18)
	root.add_theme_constant_override("margin_right", 24)
	root.add_theme_constant_override("margin_bottom", 18)
	scroll.add_child(root)

	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	root.add_child(column)

	column.add_child(_build_roster_close_bar())
	column.add_child(_build_roster_list_panel())
	return scroll

func _build_profile_page(page_id: String = "profile") -> Control:
	var entry := _active_entry()
	return GENERAL_PROFILE_STAGE_RENDERER.build_profile_page(
		entry,
		page_id,
		Callable(self, "_build_profile_detail_stack"),
		Callable(self, "_on_general_profile_back_requested"),
		Callable(self, "_on_general_action_pressed")
	)

func _build_filter_bar() -> Control:
	return GENERAL_ROSTER_RENDERER.build_filter_bar(_shared_state())

func _build_roster_selector(active_entry: Dictionary) -> Control:
	return GENERAL_ROSTER_RENDERER.build_roster_selector(active_entry, _roster_entries(), Callable(self, "_on_general_action_pressed"))

func _build_roster_list_panel() -> Control:
	return GENERAL_ROSTER_RENDERER.build_roster_list_panel(_roster_entries(), Callable(self, "_build_portrait_frame"), Callable(self, "_on_general_action_pressed"))

func _build_roster_close_bar() -> Control:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_spacer(false)
	var close_button := Button.new()
	close_button.name = "CloseButton"
	close_button.text = "关闭"
	UI_COMPONENT_FACTORY.apply_general_roster_close_button_style(close_button)
	close_button.pressed.connect(Callable(self, "_on_general_profile_close_requested"))
	row.add_child(close_button)
	return row

func _is_main_map_independent_library_page() -> bool:
	if _active_page_id != "library":
		return false
	return _snapshot_requests_main_map_library()

func _snapshot_requests_main_map_library() -> bool:
	var mode := str(_snapshot.get("library_entry_mode", _snapshot.get("libraryEntryMode", ""))).strip_edges()
	if mode == "":
		var shared := _shared_state()
		mode = str(shared.get("library_entry_mode", shared.get("libraryEntryMode", ""))).strip_edges()
	return mode == "main_map_independent"

func _build_library_standalone_page() -> Control:
	var root := Control.new()
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var root_margin := _margin(24, 16, 24, 18)
	root_margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	root_margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_margin.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 14)
	root_margin.add_child(column)
	column.add_child(_build_library_standalone_close_bar())
	var browser := _build_skill_library_browser()
	browser.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(browser)
	root.add_child(root_margin)
	root.add_child(_build_library_standalone_floating_close_button())
	return root

func _build_library_standalone_close_bar() -> Control:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var title := _label("战法库", 24, TEXT_GOLD)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(title)
	return row

func _build_library_standalone_floating_close_button() -> Button:
	var close_button := Button.new()
	close_button.name = "CloseButton"
	close_button.text = "× 关闭"
	close_button.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	close_button.offset_left = -128
	close_button.offset_right = -8
	close_button.offset_top = 8
	close_button.offset_bottom = 64
	close_button.size_flags_horizontal = Control.SIZE_SHRINK_END
	close_button.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	UI_COMPONENT_FACTORY.apply_general_profile_close_button_style(close_button, "neutral")
	close_button.pressed.connect(Callable(self, "_on_general_profile_close_requested"))
	return close_button

func _build_roster_preview_panel() -> Control:
	var entry := _active_entry()
	return GENERAL_ROSTER_PREVIEW_RENDERER.build_roster_preview_panel(entry, {
		"build_detail_header": Callable(self, "_build_detail_header"),
		"build_compact_stat_grid": Callable(self, "_build_compact_stat_grid"),
		"build_skill_block": Callable(self, "_build_skill_block"),
		"build_troop_block": Callable(self, "_build_troop_block"),
		"build_action_row": Callable(self, "_build_action_row"),
	})

func _build_profile_detail_stack(entry: Dictionary, page_id: String) -> Control:
	return GENERAL_PROFILE_DETAIL_STACK_RENDERER.build_profile_detail_stack(entry, page_id, {
		"build_profile_tab_strip": Callable(self, "_build_profile_tab_strip"),
		"build_detail_header": Callable(self, "_build_detail_header"),
		"build_point_panel": Callable(self, "_build_point_panel"),
		"build_skill_library_browser": Callable(self, "_build_skill_library_browser"),
		"build_troop_block": Callable(self, "_build_troop_block"),
		"build_attribute_overview_panel": Callable(self, "_build_attribute_overview_panel"),
		"build_skill_block": Callable(self, "_build_skill_block"),
	})

func _faction_label(entry: Dictionary) -> String:
	var raw := str(entry.get("faction", "未知")).strip_edges()
	match raw:
		"魏", "曹魏":
			return "曹魏"
		"蜀", "汉", "季汉", "纪汉":
			return "季汉"
		"吴", "东吴", "孙吴":
			return "东吴"
		"群", "群雄":
			return "群雄"
		_:
			return raw if raw != "" else "未知"

func _entry_star_text(entry: Dictionary) -> String:
	var existing := str(entry.get("star_text", "")).strip_edges()
	if existing != "":
		return existing
	var red_stars: int = maxi(0, int(entry.get("red_stars", 0)))
	var stars: int = maxi(1, int(entry.get("stars", 5)))
	var gold_stars: int = maxi(0, stars - red_stars)
	return "%s%s" % ["★".repeat(red_stars), "★".repeat(gold_stars)]

func _build_profile_tab_strip(active_page_id: String) -> Control:
	return GENERAL_PROFILE_TAB_STRIP_RENDERER.build_profile_tab_strip(
		active_page_id,
		Callable(self, "_on_profile_page_button_pressed"),
		Callable(self, "_on_general_profile_close_requested")
	)

func _build_detail_header(entry: Dictionary, expanded: bool) -> Control:
	return GENERAL_PROFILE_CONTENT_RENDERER.build_detail_header(entry)

func _build_status_bar_panel(entry: Dictionary) -> Control:
	var panel := _panel(BG_DATA, BORDER_DATA, 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(12, 10, 12, 10)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 7)
	margin.add_child(column)
	column.add_child(_label("状态", 17, TEXT_GOLD))
	column.add_child(_progress_line("Lv.%s" % _compact_number_label(entry.get("level", 1)), int(entry.get("exp_current", 0)), int(entry.get("exp_max", 1)), TEXT_GOLD))
	column.add_child(_progress_line("兵力", int(entry.get("soldier_current", 0)), int(entry.get("soldier_max", 1)), TEXT_BLUE))
	column.add_child(_progress_line("体力", int(entry.get("stamina_current", 0)), int(entry.get("stamina_max", 1)), TEXT_GREEN))
	return panel

func _build_attribute_overview_panel(entry: Dictionary) -> Control:
	return GENERAL_PROFILE_CONTENT_RENDERER.build_attribute_overview_panel(entry)

func _build_point_panel(entry: Dictionary) -> Control:
	return GENERAL_PROFILE_TACTICS_RENDERER.build_point_panel(entry)

func _build_compact_stat_grid(entry: Dictionary) -> Control:
	var grid := GridContainer.new()
	grid.columns = 5
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	for spec in [["武力", "force"], ["统率", "command"], ["智谋", "intelligence"], ["魅力", "charisma"], ["速度", "speed"]]:
		grid.add_child(_stat_badge(str(spec[0]), str(entry.get(str(spec[1]), 0))))
	return grid

func _build_attribute_panel(entry: Dictionary) -> Control:
	var panel := _panel(BG_DATA, BORDER_DATA, 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(14, 12, 14, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 7)
	margin.add_child(column)
	column.add_child(_label("属性", 17, TEXT_GOLD))
	for spec in [["攻击", "force", TEXT_RED], ["防御", "command", TEXT_GOLD], ["谋略", "intelligence", TEXT_BLUE], ["攻城", "charisma", TEXT_GOLD], ["速度", "speed", TEXT_GREEN]]:
		column.add_child(_stat_bar(str(spec[0]), int(entry.get(str(spec[1]), 0)), spec[2]))
	return panel

func _build_skill_block(entry: Dictionary) -> Control:
	return GENERAL_PROFILE_CONTENT_RENDERER.build_skill_block(
		entry,
		_shared_state().get("equipable_skill_library_summary", {}),
		Callable(self, "_on_general_action_pressed")
	)

func _build_skill_library_browser() -> Control:
	return GENERAL_PROFILE_SKILL_LIBRARY_RENDERER.build_skill_library_browser({
		"action_callback": Callable(self, "_on_general_action_pressed"),
		"search_changed_callback": Callable(self, "_on_skill_library_search_changed"),
		"search_submitted_callback": Callable(self, "_on_skill_library_search_submitted"),
		"filter_state": _skill_library_filter_state(),
		"raw_library": _shared_state().get("equipable_skill_library", {}),
	})

func _skill_library_filter_state() -> Dictionary:
	return {
		"grade": _skill_library_grade_filter,
		"type": _skill_library_type_filter,
		"troop": _skill_library_troop_filter,
		"tag": _skill_library_tag_filter,
		"source": _skill_library_source_filter,
		"search": _skill_library_search_text,
		"sort": _skill_library_sort_mode,
		"source_expanded": _skill_library_source_filter_expanded,
		"tag_expanded": _skill_library_tag_filter_expanded,
	}

func _skill_library_filter_payload() -> Dictionary:
	return GENERAL_PROFILE_SKILL_LIBRARY_RENDERER.build_filter_payload(
		_shared_state().get("equipable_skill_library", {}),
		_skill_library_filter_state()
	)

func _skill_library_entries() -> Array:
	var raw_library: Variant = _shared_state().get("equipable_skill_library", {})
	if not (raw_library is Dictionary):
		return []
	var raw_skills: Variant = (raw_library as Dictionary).get("skills", [])
	return _dictionary_array(raw_skills)

func _format_skill_attribute_effects(raw_value: Variant) -> String:
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
	return " / ".join(parts)

func _build_troop_block(entry: Dictionary) -> Control:
	var variants := _troop_variant_specs(entry)
	var slide_direction := _troop_preview_slide_direction
	_troop_preview_slide_direction = 0
	return GENERAL_PROFILE_GROWTH_RENDERER.build_troop_block(
		entry,
		variants,
		_active_troop_variant_index(variants.size()),
		slide_direction,
		Callable(self, "_on_general_action_pressed")
	)

func _troop_variant_specs(entry: Dictionary) -> Array[Dictionary]:
	return GENERAL_PROFILE_GROWTH_RENDERER.build_troop_variant_specs(entry)

func _active_troop_variant_index(variant_count: int) -> int:
	_troop_preview_variant_index = GENERAL_PROFILE_GROWTH_RENDERER.active_troop_variant_index(_troop_preview_variant_index, variant_count)
	return _troop_preview_variant_index

func _build_growth_panel(entry: Dictionary) -> Control:
	var panel := _panel(BG_DATA, BORDER_DATA, 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(12, 12, 12, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)
	column.add_child(_label("养成入口", 17, TEXT_GOLD))
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 8)
	column.add_child(row)
	row.add_child(_growth_entry_card("等级", "Lv.%s" % str(entry.get("level", 1)), "%s / %s" % [str(entry.get("exp_current", 0)), str(entry.get("exp_max", 0))], TEXT_GOLD))
	row.add_child(_growth_entry_card("星级", _entry_star_text(entry), "红星 %s" % str(entry.get("red_stars", 0)), TEXT_GOLD))
	row.add_child(_growth_entry_card("兵力", "%s / %s" % [str(entry.get("soldier_current", 0)), str(entry.get("soldier_max", 10000))], "单将上限 10000", TEXT_BLUE))
	row.add_child(_growth_entry_card("体力", "%s / %s" % [str(entry.get("stamina_current", 0)), str(entry.get("stamina_max", 150))], "预览上限 150", TEXT_GREEN))
	column.add_child(_label("当前先收束展示结构，养成消耗、升星和战法升级动作保留为后续正式链。", 13, TEXT_MUTED))
	return panel

func _troop_summary_card(title: String, value: String, color: Color) -> Control:
	var panel := _panel(Color(color.r * 0.13, color.g * 0.13, color.b * 0.13, 0.78), Color(color.r, color.g, color.b, 0.70), 4)
	panel.custom_minimum_size = Vector2(0, 58)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(10, 7, 10, 7)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 2)
	margin.add_child(column)
	column.add_child(_label(title, 12, TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	column.add_child(_nowrap_label(value, 18, color, HORIZONTAL_ALIGNMENT_CENTER))
	return panel

func _growth_entry_card(title: String, value: String, meta: String, color: Color) -> Control:
	var panel := _panel(Color(color.r * 0.10, color.g * 0.10, color.b * 0.10, 0.70), Color(color.r, color.g, color.b, 0.62), 4)
	UI_COMPONENT_FACTORY.apply_general_growth_entry_card_style(panel)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := UI_COMPONENT_FACTORY.make_general_growth_entry_card_margin()
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", UI_COMPONENT_FACTORY.general_growth_entry_card_column_spacing())
	margin.add_child(column)
	column.add_child(_label(title, UI_COMPONENT_FACTORY.general_growth_entry_card_title_font_size(), TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	column.add_child(_nowrap_label(value, UI_COMPONENT_FACTORY.general_growth_entry_card_value_font_size(), color, HORIZONTAL_ALIGNMENT_CENTER))
	column.add_child(_nowrap_label(meta, UI_COMPONENT_FACTORY.general_growth_entry_card_meta_font_size(), TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	return panel

func _build_action_row(entry: Dictionary) -> Control:
	var panel := _panel(BG_ROW, BORDER, 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(10, 8, 10, 8)
	panel.add_child(margin)
	var row := HFlowContainer.new()
	row.add_theme_constant_override("h_separation", 8)
	row.add_theme_constant_override("v_separation", 8)
	margin.add_child(row)
	row.add_child(_action_button("进入详情", "open_hero_profile:%s" % str(entry.get("id", ""))))
	row.add_child(_action_button("上一位", "hero_prev"))
	row.add_child(_action_button("下一位", "hero_next"))
	row.add_child(GENERAL_PROFILE_CONTENT_RENDERER.build_preview_action_chip("重置"))
	row.add_child(GENERAL_PROFILE_CONTENT_RENDERER.build_preview_action_chip("攻略"))
	row.add_child(GENERAL_PROFILE_CONTENT_RENDERER.build_preview_action_chip("分享"))
	row.add_child(GENERAL_PROFILE_CONTENT_RENDERER.build_preview_action_chip("传承"))
	return panel

func _build_portrait_frame(entry: Dictionary, size: Vector2) -> Control:
	var panel := _panel(Color(0.055, 0.052, 0.047, 1.0), BORDER_ACTIVE if bool(entry.get("is_active", false)) else BORDER, 4)
	panel.custom_minimum_size = size
	UI_COMPONENT_FACTORY.apply_portrait_frame_stage(panel)
	var texture := _load_portrait_texture(entry)
	if texture != null:
		var image := TextureRect.new()
		image.texture = texture
		image.custom_minimum_size = size
		UI_COMPONENT_FACTORY.apply_portrait_frame_texture(image)
		panel.add_child(image)
		return panel
	var fallback := _label("%s\n画像未接入" % str(entry.get("display_name", "将")).left(2), 18, TEXT_GOLD, HORIZONTAL_ALIGNMENT_CENTER)
	fallback.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	fallback.custom_minimum_size = size
	panel.add_child(fallback)
	return panel

func _load_portrait_texture(entry: Dictionary) -> Texture2D:
	return PORTRAIT_ASSET_REGISTRY.portrait_texture(_portrait_payload(entry))

func _portrait_payload(entry: Dictionary) -> Dictionary:
	return UI_COMPONENT_FACTORY.hero_portrait_payload_from_entry(entry)

func _portrait_resolution_summary(entry: Dictionary) -> Dictionary:
	var payload := _portrait_payload(entry)
	if PORTRAIT_ASSET_REGISTRY.portrait_res_path(payload) != "":
		return {
			"resolve_mode": "registry_first",
			"resolved_by": UI_COMPONENT_FACTORY.PORTRAIT_FRAME_REGISTRY_ID,
			"fallback_count": 0,
		}
	return {
		"resolve_mode": "registry_first",
		"resolved_by": "",
		"fallback_count": 1,
	}

func _action_button(text: String, action_id: String, disabled: bool = false) -> Button:
	var button := Button.new()
	button.text = text
	button.disabled = disabled
	button.custom_minimum_size = Vector2(82, 34)
	_apply_button_style(button, BG_PANEL, BORDER, TEXT_MAIN)
	button.pressed.connect(Callable(self, "_on_general_action_pressed").bind(action_id))
	return button

func _on_profile_page_button_pressed(page_id: String) -> void:
	var resolved := page_id.strip_edges()
	if resolved == "":
		return
	_active_page_id = resolved
	page_changed.emit(resolved)
	_refresh_panel()

func _on_general_profile_back_requested() -> void:
	back_requested.emit()

func _on_general_profile_close_requested() -> void:
	close_requested.emit()

func _on_general_action_pressed(action_id: String) -> void:
	var resolved := action_id.strip_edges()
	if resolved == "":
		return
	if resolved == "hero_prev":
		_switch_active_hero(-1)
		page_action_requested.emit(_active_page_id, resolved)
		return
	if resolved == "hero_next":
		_switch_active_hero(1)
		page_action_requested.emit(_active_page_id, resolved)
		return
	if resolved == "troop_preview_prev":
		_switch_troop_preview_variant(-1)
		page_action_requested.emit(_active_page_id, resolved)
		return
	if resolved == "troop_preview_next":
		_switch_troop_preview_variant(1)
		page_action_requested.emit(_active_page_id, resolved)
		return
	if resolved.begins_with("focus_hero:"):
		_focus_hero_by_id(resolved.trim_prefix("focus_hero:"))
		page_action_requested.emit(_active_page_id, resolved)
		return
	if resolved.begins_with("open_hero_profile:"):
		_focus_hero_by_id(resolved.trim_prefix("open_hero_profile:"))
		_active_page_id = "profile"
		page_changed.emit(_active_page_id)
		_refresh_panel()
		page_action_requested.emit(_active_page_id, resolved)
		return
	if resolved.begins_with("skill_detail:"):
		_show_skill_detail_popup(int(resolved.trim_prefix("skill_detail:")))
		page_action_requested.emit(_active_page_id, resolved)
		return
	if resolved.begins_with("skill_library_filter:"):
		_apply_skill_library_filter(resolved.trim_prefix("skill_library_filter:"))
		page_action_requested.emit(_active_page_id, resolved)
		return
	page_action_requested.emit(_active_page_id, resolved)

func _switch_troop_preview_variant(delta: int) -> void:
	var variants := _troop_variant_specs(_active_entry())
	var count := variants.size()
	if count <= 1:
		return
	var next_index := _troop_preview_variant_index + delta
	if next_index < 0:
		next_index = count - 1
	elif next_index >= count:
		next_index = 0
	_troop_preview_variant_index = next_index
	_troop_preview_slide_direction = 1 if delta > 0 else -1
	_refresh_panel()

func _apply_skill_library_filter(payload: String) -> void:
	var parts := payload.split(":", false, 1)
	if parts.size() < 2:
		return
	var field := str(parts[0])
	var value := str(parts[1])
	if field == "reset":
		_skill_library_grade_filter = "S"
		_skill_library_type_filter = "全部"
		_skill_library_troop_filter = "全部"
		_skill_library_tag_filter = "全部"
		_skill_library_source_filter = "全部"
		_skill_library_search_text = ""
		_skill_library_sort_mode = "品质"
	elif field == "grade":
		_skill_library_grade_filter = value
		if value == "S":
			_skill_library_type_filter = "全部"
			_skill_library_troop_filter = "全部"
			_skill_library_tag_filter = "全部"
			_skill_library_source_filter = "全部"
	elif field == "type":
		_skill_library_type_filter = value
	elif field == "troop":
		_skill_library_troop_filter = value
	elif field == "tag":
		_skill_library_tag_filter = value
	elif field == "source":
		_skill_library_source_filter = value
	elif field == "sort":
		_skill_library_sort_mode = value
	elif field == "toggle_tag":
		_skill_library_tag_filter_expanded = not _skill_library_tag_filter_expanded
	elif field == "toggle_source":
		_skill_library_source_filter_expanded = not _skill_library_source_filter_expanded
	elif field == "search_apply":
		_skill_library_search_text = _skill_library_search_text.strip_edges()
	elif field == "search_clear":
		_skill_library_search_text = ""
	_save_skill_library_ui_state()
	_refresh_panel()

func _on_skill_library_search_changed(value: String) -> void:
	_skill_library_search_text = value.strip_edges()
	_save_skill_library_ui_state()

func _on_skill_library_search_submitted(value: String) -> void:
	_skill_library_search_text = value.strip_edges()
	_save_skill_library_ui_state()
	_refresh_panel()

func _show_skill_detail_popup(skill_index: int) -> void:
	var skills := _dictionary_array(_active_entry().get("skills", []))
	if skill_index < 0 or skill_index >= skills.size() or not (skills[skill_index] is Dictionary):
		return
	var skill := skills[skill_index] as Dictionary
	_show_skill_detail_popup_for_skill(skill)

func _show_skill_detail_popup_for_skill(skill: Dictionary) -> void:
	if _skill_detail_dialog != null and is_instance_valid(_skill_detail_dialog):
		_skill_detail_dialog.queue_free()
	var popup_skill := GENERAL_PROFILE_CONTENT_RENDERER.skill_popup_read_model_entry(skill)
	var viewport_size := get_viewport_rect().size
	var popup_layout := UI_COMPONENT_FACTORY.general_skill_detail_popup_layout(viewport_size)
	var popup_size_variant: Variant = popup_layout.get("size", Vector2i(620, 430))
	var popup_size := Vector2i(620, 430)
	if popup_size_variant is Vector2i:
		popup_size = popup_size_variant as Vector2i
	var popup_position_variant: Variant = popup_layout.get("position", Vector2(38, 78))
	var popup_position := Vector2(38, 78)
	if popup_position_variant is Vector2:
		popup_position = popup_position_variant as Vector2
	var dialog := GENERAL_PROFILE_CONTENT_RENDERER.build_skill_popup(popup_skill, popup_size, Callable(self, "_close_skill_detail_popup"))
	if dialog == null:
		return
	_skill_detail_dialog = dialog
	_skill_detail_popup_skill = popup_skill.duplicate(true)
	dialog.size = Vector2(float(popup_size.x), float(popup_size.y))
	dialog.position = popup_position
	dialog.z_index = 80
	dialog.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(dialog)

func _close_skill_detail_popup() -> void:
	if _skill_detail_dialog != null and is_instance_valid(_skill_detail_dialog):
		_skill_detail_dialog.queue_free()
	_skill_detail_dialog = null
	_skill_detail_popup_skill = {}

func request_library_skill_type_showcase_for_smoke(skill_type: String) -> Dictionary:
	var normalized_type := skill_type.strip_edges()
	if not ["追击", "主动", "被动", "指挥"].has(normalized_type):
		return {
			"ok": false,
			"reason": "skill_library_type_showcase_type_unsupported",
			"skillLibraryTypeShowcaseSmokeType": normalized_type,
		}
	_skill_library_grade_filter = "S"
	_skill_library_type_filter = normalized_type
	_skill_library_troop_filter = "全部"
	_skill_library_tag_filter = "全部"
	_skill_library_source_filter = "全部"
	_skill_library_search_text = ""
	_skill_library_sort_mode = "品质"
	_save_skill_library_ui_state()
	_refresh_panel()
	return _skill_library_type_showcase_smoke_summary(normalized_type)

func _skill_library_type_showcase_smoke_summary(skill_type: String) -> Dictionary:
	var summary := {}
	var library_payload := _skill_library_filter_payload()
	var filtered_entries := _dictionary_array(library_payload.get("filtered_entries", []))
	var visible_limit := mini(UI_COMPONENT_FACTORY.general_skill_library_result_list_visible_card_target(), filtered_entries.size())
	var visible_types := {}
	for index in range(visible_limit):
		if not (filtered_entries[index] is Dictionary):
			continue
		var entry := filtered_entries[index] as Dictionary
		var entry_type := str(entry.get("type", "")).strip_edges()
		if entry_type != "":
			visible_types[entry_type] = true
	var visible_type_labels: Array[String] = []
	for key_variant in visible_types.keys():
		visible_type_labels.append(str(key_variant))
	visible_type_labels.sort()
	summary["skillLibraryTypeShowcaseSmokeType"] = skill_type
	summary["skillLibraryTypeShowcaseSmokeVisibleTypes"] = " / ".join(visible_type_labels)
	summary["skillLibraryTypeShowcaseSmokeVisibleTypeCount"] = visible_type_labels.size()
	summary["skillLibraryTypeShowcaseSmokeVisibleCardCount"] = visible_limit
	summary["skillLibraryTypeShowcaseSmokeFilteredCount"] = filtered_entries.size()
	return summary

func _apply_skill_detail_popup_visual_smoke_summary(summary: Dictionary) -> void:
	var visible := _skill_detail_dialog != null and is_instance_valid(_skill_detail_dialog) and _skill_detail_dialog.visible and _skill_detail_dialog.is_visible_in_tree()
	if not visible:
		UI_COMPONENT_FACTORY.apply_general_skill_detail_popup_summary(summary, false, Vector2.ZERO, 0, false)
		return
	var popup_size := _skill_detail_dialog.size
	var scroll_node := _skill_detail_dialog.find_child("SkillDetailPopupScroll", true, false)
	UI_COMPONENT_FACTORY.apply_general_skill_detail_popup_summary(
		summary,
		true,
		popup_size,
		GENERAL_PROFILE_CONTENT_RENDERER.skill_popup_field_count(_skill_detail_popup_skill),
		scroll_node != null
	)
	summary["skillDetailPopupSkillId"] = str(_skill_detail_popup_skill.get("id", ""))
	summary["skillDetailPopupSkillName"] = str(_skill_detail_popup_skill.get("name", ""))
	summary["skillDetailPopupSkillType"] = str(_skill_detail_popup_skill.get("type", ""))
	summary["skillDetailPopupReadModelSource"] = GENERAL_PROFILE_CONTENT_RENDERER.skill_popup_read_model_source(_skill_detail_popup_skill)
	var close_button := _skill_detail_dialog.find_child("SkillDetailPopupCloseButton", true, false) as Button
	summary["skillDetailPopupCloseButtonRuntimeVisible"] = close_button != null and close_button.visible and close_button.is_visible_in_tree()
	summary["skillDetailPopupCloseButtonRuntimeText"] = str(close_button.text).strip_edges() if close_button != null else ""
	summary["skillDetailPopupCloseButtonRuntimeToken"] = str(close_button.get_meta("skill_detail_popup_close_button_token", "")) if close_button != null else ""
	summary["skillDetailPopupCloseButtonRuntimeActionId"] = str(close_button.get_meta("skill_detail_popup_close_action_id", "")) if close_button != null else ""
	summary["skillDetailPopupCloseButtonRuntimeLiveTextContract"] = str(close_button.get_meta("skill_detail_popup_close_live_text_contract", "")) if close_button != null else ""
	summary["skillDetailPopupCloseButtonRuntimeLiveTextLabel"] = str(close_button.get_meta("skill_detail_popup_close_live_text_label", "")) if close_button != null else ""

func _apply_profile_skill_button_runtime_summary(summary: Dictionary) -> void:
	var buttons: Array[Button] = []
	_collect_profile_skill_buttons(self, buttons)
	var labels: Array[String] = []
	var action_ids: Array[String] = []
	var token_count := 0
	var live_text_count := 0
	for button in buttons:
		labels.append(str(button.get_meta("general_profile_skill_live_text_label", button.text)).strip_edges())
		action_ids.append(str(button.get_meta("general_profile_skill_action_id", "")).strip_edges())
		if str(button.get_meta("general_profile_skill_button_token", "")).strip_edges() != "":
			token_count += 1
		if str(button.get_meta("general_profile_skill_live_text_contract", "")).strip_edges() != "":
			live_text_count += 1
	summary["profileSkillRuntimeButtonCount"] = buttons.size()
	summary["profileSkillRuntimeButtonLabels"] = " / ".join(labels)
	summary["profileSkillRuntimeActionIds"] = " / ".join(action_ids)
	summary["profileSkillRuntimeTokenCount"] = token_count
	summary["profileSkillRuntimeLiveTextCount"] = live_text_count

func _collect_profile_skill_buttons(root: Node, output: Array[Button]) -> void:
	if root == null:
		return
	var button := root as Button
	if button != null and button.has_meta("general_profile_skill_action_id"):
		output.append(button)
	for child in root.get_children():
		_collect_profile_skill_buttons(child, output)

func _apply_skill_card_flip_visual_smoke_summary(summary: Dictionary) -> void:
	var front := find_child("HeroCardSkillFrontFace", true, false)
	var back := find_child("HeroCardSkillBackFace", true, false)
	var front_visible: bool = front != null and bool(front.visible)
	var back_visible: bool = back != null and bool(back.visible)
	summary["skillLibraryDeckCardFlipRuntimeFound"] = front != null and back != null
	summary["skillLibraryDeckCardFrontFaceRuntimeVisible"] = front_visible
	summary["skillLibraryDeckCardBackFaceRuntimeVisible"] = back_visible
	summary["skillLibraryDeckCardFlipRuntimeFace"] = "back" if back_visible else "front" if front_visible else ""

func _apply_skill_library_button_visual_smoke_summary(summary: Dictionary) -> void:
	var buttons: Array[Button] = []
	_collect_skill_library_filter_buttons(self, buttons)
	var labels: Array[String] = []
	var action_ids: Array[String] = []
	var token_count := 0
	var live_text_count := 0
	var min_height := 999999
	for button in buttons:
		if button == null or not is_instance_valid(button) or not button.visible or not button.is_visible_in_tree():
			continue
		labels.append(button.text.strip_edges())
		action_ids.append(str(button.get_meta("skill_library_filter_action_id", "")).strip_edges())
		if str(button.get_meta("skill_filter_chip_bg_token", "")) == UI_COMPONENT_FACTORY.SKILL_FILTER_CHIP_BG_TOKEN:
			token_count += 1
		if str(button.get_meta("skill_library_filter_live_text_contract", "")) == "skill_library_filter_live_text_v1":
			live_text_count += 1
		min_height = mini(min_height, int(button.custom_minimum_size.y))
	summary["skillLibraryFilterRuntimeButtonCount"] = labels.size()
	summary["skillLibraryFilterRuntimeButtonLabels"] = " / ".join(labels)
	summary["skillLibraryFilterRuntimeActionIds"] = " / ".join(action_ids)
	summary["skillLibraryFilterRuntimeTokenCount"] = token_count
	summary["skillLibraryFilterRuntimeLiveTextCount"] = live_text_count
	summary["skillLibraryFilterRuntimeMinHeight"] = 0 if labels.is_empty() else min_height
	summary["skillLibraryFilterRuntimeLiveTextContract"] = "skill_library_filter_live_text_v1"
	var grid := find_child("SkillLibraryDeckCardGrid", true, false)
	summary["skillLibraryDeckCardRailAnchorMode"] = str(grid.get_meta("skill_library_deck_card_rail_anchor_mode", "")) if grid != null else ""
	summary["skillLibraryDeckCardGridRuntimeMode"] = str(grid.get_meta("skill_library_deck_card_grid_mode", "")) if grid != null else ""
	var rail_scroll := find_child("SkillLibraryDeckCardRailScroll", true, false) as ScrollContainer
	summary["skillLibraryDeckCardRailScrollHorizontal"] = int(rail_scroll.scroll_horizontal) if rail_scroll != null else -1
	summary["skillLibraryDeckCardScrollAnchorMode"] = str(rail_scroll.get_meta("skill_library_deck_card_scroll_anchor_mode", "")) if rail_scroll != null else ""
	summary["skillLibraryDeckCardScrollAxisRuntime"] = str(rail_scroll.get_meta("skill_library_deck_card_scroll_axis", "")) if rail_scroll != null else ""
	summary["skillLibraryOldResultDetailButtonRuntimeVisible"] = _has_visible_node_name_prefix(self, "SkillLibraryResultDetailButton_")
	summary["skillLibraryOldPopupChainRuntimeVisible"] = _has_visible_node_name_prefix(self, "SkillDetailPopup")
	var close_button := _find_visible_button_by_name(self, "CloseButton")
	summary["skillLibraryFloatingCloseButtonVisible"] = close_button != null
	summary["skillLibraryFloatingCloseButtonText"] = close_button.text.strip_edges() if close_button != null else ""

func _collect_skill_library_filter_buttons(root: Node, output: Array[Button]) -> void:
	if root == null:
		return
	var button := root as Button
	if button != null and button.has_meta("skill_library_filter_action_id"):
		output.append(button)
	for child in root.get_children():
		_collect_skill_library_filter_buttons(child, output)

func _has_visible_node_name_prefix(root: Node, name_prefix: String) -> bool:
	if root == null:
		return false
	var control := root as Control
	if str(root.name).begins_with(name_prefix) and control != null and control.visible and control.is_visible_in_tree():
		return true
	for child in root.get_children():
		if _has_visible_node_name_prefix(child, name_prefix):
			return true
	return false

func _find_visible_button_by_name(root: Node, button_name: String) -> Button:
	if root == null:
		return null
	var button := root as Button
	if button != null and str(button.name) == button_name and button.visible and button.is_visible_in_tree():
		return button
	for child in root.get_children():
		var found := _find_visible_button_by_name(child, button_name)
		if found != null:
			return found
	return null

func _switch_active_hero(delta: int) -> bool:
	var entries := _roster_entries()
	if entries.is_empty():
		return false
	var active_id := str(_shared_state().get("active_hero_id", _active_entry().get("id", ""))).strip_edges()
	var active_index := 0
	for index in range(entries.size()):
		if entries[index] is Dictionary and str((entries[index] as Dictionary).get("id", "")).strip_edges() == active_id:
			active_index = index
			break
	var next_index := (active_index + delta + entries.size()) % entries.size()
	return _apply_active_roster_index(next_index)

func _focus_hero_by_id(hero_id: String) -> bool:
	var resolved := hero_id.strip_edges()
	if resolved == "":
		return false
	var entries := _roster_entries()
	for index in range(entries.size()):
		if entries[index] is Dictionary and str((entries[index] as Dictionary).get("id", "")).strip_edges() == resolved:
			return _apply_active_roster_index(index)
	return false

func _apply_active_roster_index(active_index: int) -> bool:
	var shared: Dictionary = _shared_state().duplicate(true)
	var entries := _roster_entries()
	if entries.is_empty() or active_index < 0 or active_index >= entries.size():
		return false
	var updated_entries: Array = []
	var active_entry: Dictionary = {}
	for index in range(entries.size()):
		if not (entries[index] is Dictionary):
			continue
		var entry := (entries[index] as Dictionary).duplicate(true)
		entry["is_active"] = index == active_index
		if index == active_index:
			active_entry = entry.duplicate(true)
		updated_entries.append(entry)
	if active_entry.is_empty():
		return false
	shared["roster_entries"] = updated_entries
	shared["active_hero_profile"] = active_entry
	shared["active_hero_id"] = str(active_entry.get("id", ""))
	_snapshot["shared_state"] = shared
	_refresh_panel()
	return true

func _entry_location_line(entry: Dictionary) -> String:
	var unit_id := str(entry.get("unit_id", "")).strip_edges()
	var corps_name := str(entry.get("corps_name", "")).strip_edges()
	if unit_id == "":
		return "当前未编入部队"
	var parts: Array[String] = []
	var readiness := int(entry.get("readiness", 0))
	if readiness > 0:
		parts.append("战备 %s" % str(readiness))
	var role_label := str(entry.get("role_label", "")).strip_edges()
	if role_label != "" and role_label != "reserve":
		parts.append(role_label)
	if corps_name != "":
		parts.append(corps_name)
	var current_task := str(entry.get("current_task", "")).strip_edges()
	if current_task != "" and corps_name == "":
		parts.append(current_task)
	if parts.is_empty():
		parts.append("已编入部队")
	return " · ".join(parts)

func _entry_name_variant_line(entry: Dictionary) -> String:
	var name := str(entry.get("display_name", "待补位")).strip_edges()
	var variant_tag := str(entry.get("variant_tag", "")).strip_edges()
	if variant_tag == "":
		var quality := str(entry.get("quality", "")).strip_edges()
		if quality.contains("-"):
			variant_tag = quality.get_slice("-", 1).strip_edges()
	var faction := _faction_label(entry)
	if variant_tag != "":
		return "%s  %s · %s" % [name, variant_tag, faction]
	return "%s · %s" % [name, faction]

func _stat_badge(title: String, value: String) -> Control:
	var panel := _panel(BG_ROW, BORDER, 4)
	panel.custom_minimum_size = Vector2(72, 62)
	var margin := _margin(8, 6, 8, 6)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 2)
	margin.add_child(column)
	column.add_child(_label(title, 11, TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	column.add_child(_label(value, 19, TEXT_GOLD, HORIZONTAL_ALIGNMENT_CENTER))
	return panel

func _stat_bar(title: String, value: int, color: Color) -> Control:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 8)
	row.add_child(_small_tag(title, 48, TEXT_MAIN))
	var bar := ProgressBar.new()
	bar.min_value = 0
	bar.max_value = 260
	bar.value = clamp(value, 0, 260)
	bar.show_percentage = false
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var background_style := StyleBoxFlat.new()
	background_style.bg_color = Color(0.06, 0.06, 0.055, 0.86)
	bar.add_theme_stylebox_override("background", background_style)
	var fill_style := StyleBoxFlat.new()
	fill_style.bg_color = color
	bar.add_theme_stylebox_override("fill", fill_style)
	row.add_child(bar)
	var value_label := _label(str(value), 13, color, HORIZONTAL_ALIGNMENT_RIGHT)
	value_label.custom_minimum_size = Vector2(36, 0)
	row.add_child(value_label)
	return row

func _progress_line(title: String, current_value: int, max_value: int, color: Color) -> Control:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 8)
	row.add_child(_small_tag(title, 64, TEXT_MAIN))
	var bar := ProgressBar.new()
	bar.custom_minimum_size = Vector2(0, 20)
	bar.min_value = 0
	bar.max_value = float(maxi(max_value, 1))
	bar.value = float(clampi(current_value, 0, int(bar.max_value)))
	bar.show_percentage = false
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var background_style := StyleBoxFlat.new()
	background_style.bg_color = Color(0.06, 0.06, 0.055, 0.92)
	bar.add_theme_stylebox_override("background", background_style)
	var fill_style := StyleBoxFlat.new()
	fill_style.bg_color = color
	bar.add_theme_stylebox_override("fill", fill_style)
	row.add_child(bar)
	var value_label := _label("%s / %s" % [str(current_value), str(max_value)], 19, TEXT_MUTED, HORIZONTAL_ALIGNMENT_RIGHT)
	value_label.custom_minimum_size = Vector2(150, 0)
	row.add_child(value_label)
	return row

func _small_tag(text: String, min_width: int, color: Color) -> Control:
	var panel := _panel(Color(0.0, 0.0, 0.0, 0.82), Color(0.0, 0.0, 0.0, 0.0), 1)
	panel.custom_minimum_size = Vector2(min_width, 32)
	var margin := _margin(5, 2, 5, 2)
	panel.add_child(margin)
	var label := _nowrap_label(text, 17, color, HORIZONTAL_ALIGNMENT_CENTER)
	margin.add_child(label)
	return panel

func _build_skill_orb(title: String, grade: String, level_text: String, type_text: String, color: Color) -> Control:
	var panel := _panel(Color(color.r * 0.08, color.g * 0.08, color.b * 0.08, 0.72), Color(color.r, color.g, color.b, 0.52), 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.custom_minimum_size = Vector2(0, 124)
	var margin := _margin(8, 8, 8, 8)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 5)
	margin.add_child(column)
	var icon_row := HBoxContainer.new()
	icon_row.alignment = BoxContainer.ALIGNMENT_CENTER
	column.add_child(icon_row)
	icon_row.add_child(_skill_circle(grade, level_text, color))
	column.add_child(_nowrap_label(title, 14, TEXT_MAIN, HORIZONTAL_ALIGNMENT_CENTER))
	column.add_child(_nowrap_label(type_text, 11, TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	return panel

func _skill_circle(grade: String, level_text: String, color: Color) -> Control:
	var frame := _panel(Color(0.03, 0.03, 0.03, 0.90), Color(color.r, color.g, color.b, 0.92), 36)
	frame.custom_minimum_size = Vector2(72, 72)
	var margin := _margin(6, 6, 6, 6)
	frame.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 0)
	margin.add_child(column)
	column.add_child(_nowrap_label(grade, 21, color, HORIZONTAL_ALIGNMENT_CENTER))
	column.add_child(_nowrap_label(level_text, 11, TEXT_MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	return frame

func _skill_description_panel(details: Array[String], fallback: String) -> Control:
	var panel := _panel(Color(0.0, 0.0, 0.0, 0.30), Color(0.0, 0.0, 0.0, 0.0), 0)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(8, 6, 8, 6)
	panel.add_child(margin)
	var text := "\n".join(details) if not details.is_empty() else fallback
	margin.add_child(_label(text, 13, TEXT_MUTED))
	return panel

func _panel(bg: Color, border: Color, radius: int = 4) -> PanelContainer:
	return UI_COMPONENT_FACTORY.make_panel(bg, border, radius)

func _apply_button_style(button: Button, bg: Color, border: Color, font_color: Color) -> void:
	UI_COMPONENT_FACTORY.apply_button_style(button, bg, border, font_color, font_color, 4, 0.06, 0.06)

func _margin(left: int, top: int, right: int, bottom: int) -> MarginContainer:
	return UI_COMPONENT_FACTORY.make_margin(left, top, right, bottom)

func _label(text: String, size: int, color: Color, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	return UI_COMPONENT_FACTORY.make_label(text, size, color, align)

func _nowrap_label(text: String, size: int, color: Color, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	var label := _label(text, size, color, align)
	label.autowrap_mode = TextServer.AUTOWRAP_OFF
	label.clip_text = true
	return label

func _meta_label(text: String, color: Color, min_width: int) -> Label:
	var label := _nowrap_label(text, 17, color, HORIZONTAL_ALIGNMENT_CENTER)
	label.custom_minimum_size = Vector2(min_width, 0)
	label.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	return label

func _compact_number_label(raw_value: Variant) -> String:
	var text := str(raw_value).strip_edges()
	if text == "":
		return "-"
	if text.ends_with(".0"):
		return text.left(text.length() - 2)
	return text

func _vertical_rule() -> ColorRect:
	var rule := ColorRect.new()
	rule.color = Color(BORDER_ACTIVE.r, BORDER_ACTIVE.g, BORDER_ACTIVE.b, 0.42)
	rule.custom_minimum_size = Vector2(1, 24)
	rule.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return rule

func _chip(text: String, color: Color) -> Control:
	var panel := _panel(Color(color.r * 0.25, color.g * 0.25, color.b * 0.25, 0.88), Color(color.r, color.g, color.b, 0.88), 4)
	panel.custom_minimum_size = Vector2(maxi(58, text.length() * 13 + 18), 30)
	var margin := _margin(8, 5, 8, 5)
	panel.add_child(margin)
	var label := _nowrap_label(text, 12, color)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	margin.add_child(label)
	return panel

func _mini_chip(text: String) -> Control:
	return _chip(text, TEXT_MUTED)

func _empty_panel(title: String, body: String) -> Control:
	var panel := _panel(BG_ROW, BORDER, 4)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := _margin(12, 12, 12, 12)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 6)
	margin.add_child(column)
	column.add_child(_label(title, 16, TEXT_GOLD))
	column.add_child(_label(body, 13, TEXT_MUTED))
	return panel

func _shared_state() -> Dictionary:
	return _snapshot.get("shared_state", {}) as Dictionary

func _load_skill_library_ui_state() -> void:
	var raw_state: Variant = _shared_state().get("skill_library_ui_state", {})
	if not (raw_state is Dictionary):
		return
	var state := raw_state as Dictionary
	_skill_library_grade_filter = "S"
	_skill_library_type_filter = str(state.get("type", _skill_library_type_filter))
	_skill_library_troop_filter = str(state.get("troop", _skill_library_troop_filter))
	_skill_library_tag_filter = str(state.get("tag", _skill_library_tag_filter))
	_skill_library_source_filter = str(state.get("source", _skill_library_source_filter))
	_skill_library_search_text = str(state.get("search", _skill_library_search_text)).strip_edges()
	_skill_library_sort_mode = str(state.get("sort", _skill_library_sort_mode))
	_skill_library_source_filter_expanded = bool(state.get("source_expanded", _skill_library_source_filter_expanded))
	_skill_library_tag_filter_expanded = bool(state.get("tag_expanded", _skill_library_tag_filter_expanded))

func _save_skill_library_ui_state() -> void:
	var shared := _shared_state().duplicate(true)
	shared["skill_library_ui_state"] = {
		"grade": _skill_library_grade_filter,
		"type": _skill_library_type_filter,
		"troop": _skill_library_troop_filter,
		"tag": _skill_library_tag_filter,
		"source": _skill_library_source_filter,
		"search": _skill_library_search_text,
		"sort": _skill_library_sort_mode,
		"source_expanded": _skill_library_source_filter_expanded,
		"tag_expanded": _skill_library_tag_filter_expanded,
	}
	_snapshot["shared_state"] = shared

func _roster_entries() -> Array:
	var entries: Variant = _shared_state().get("roster_entries", [])
	return entries as Array if entries is Array else []

func _roster_owner_display_name_count(entries: Array) -> int:
	var count := 0
	for entry_variant in entries:
		if not (entry_variant is Dictionary):
			continue
		var entry := entry_variant as Dictionary
		var owner_text := str(entry.get("owner_display_name", entry.get("ownerDisplayName", ""))).strip_edges()
		if owner_text != "":
			count += 1
	return count

func _apply_active_hero_owner_summary(summary: Dictionary, active_entry: Dictionary) -> void:
	var owner_display_name := _entry_first_text(active_entry, [
		"owner_display_name",
		"ownerDisplayName",
		"owner_label",
		"ownerLabel",
		"owner",
	])
	summary["activeHeroOwnerDisplayName"] = owner_display_name
	summary["activeHeroOwnerType"] = _entry_first_text(active_entry, ["owner_type", "ownerType", "controller_type", "controllerType"])
	summary["activeHeroPlayerDisplayName"] = _entry_first_text(active_entry, ["player_display_name", "playerDisplayName", "player_name", "playerName"])
	summary["activeHeroAiPlayerName"] = _entry_first_text(active_entry, ["ai_player_name", "aiPlayerName"])
	summary["activeHeroOwnerSource"] = "shared_state.active_hero_profile.owner_display_name"
	summary["activeHeroProfileOwnerSourceMatched"] = owner_display_name != "" and owner_display_name == str(active_entry.get("owner_display_name", "")).strip_edges()

func _entry_first_text(entry: Dictionary, keys: Array) -> String:
	for key_variant in keys:
		var text := str(entry.get(str(key_variant), "")).strip_edges()
		if text != "":
			return text
	return ""

func _active_entry() -> Dictionary:
	var active: Variant = _shared_state().get("active_hero_profile", {})
	if active is Dictionary and not (active as Dictionary).is_empty():
		return active as Dictionary
	var entries := _roster_entries()
	if not entries.is_empty() and entries[0] is Dictionary:
		return entries[0] as Dictionary
	return {}

func _string_array(raw_value: Variant) -> Array:
	var result: Array = []
	if not (raw_value is Array):
		return result
	for item in raw_value as Array:
		var text := str(item).strip_edges()
		if text != "":
			result.append(text)
	return result

func _dictionary_array(raw_value: Variant) -> Array:
	var result: Array = []
	if not (raw_value is Array):
		return result
	for item in raw_value as Array:
		if item is Dictionary:
			result.append(item as Dictionary)
	return result
