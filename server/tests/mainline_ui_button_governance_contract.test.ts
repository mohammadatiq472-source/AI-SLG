import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const factorySource = readFileSync('godot-client/scripts/ui/slg_ui_component_factory.gd', 'utf-8')
const stageRendererSource = readFileSync(
  'godot-client/scripts/ui/general_components/general_profile_stage_renderer.gd',
  'utf-8',
)
const tabStripRendererSource = readFileSync(
  'godot-client/scripts/ui/general_components/general_profile_tab_strip_renderer.gd',
  'utf-8',
)
const skillLibraryRendererSource = readFileSync(
  'godot-client/scripts/ui/general_components/general_profile_skill_library_renderer.gd',
  'utf-8',
)
const rosterListRendererSource = readFileSync(
  'godot-client/scripts/ui/general_components/general_roster_list_renderer.gd',
  'utf-8',
)
const generalGrowthRendererSource = readFileSync(
  'godot-client/scripts/ui/general_components/general_profile_growth_renderer.gd',
  'utf-8',
)
const generalProfileContentRendererSource = readFileSync(
  'godot-client/scripts/ui/general_components/general_profile_content_renderer.gd',
  'utf-8',
)
const recruitRendererSource = readFileSync(
  'godot-client/scripts/ui/recruit_components/recruit_formal_pack_renderer.gd',
  'utf-8',
)
const recruitPanelSource = readFileSync('godot-client/scripts/ui/recruit_panel.gd', 'utf-8')
const fullScreenPanelHostSource = readFileSync('godot-client/scripts/ui/full_screen_panel_host.gd', 'utf-8')
const panelTabStripSource = readFileSync('godot-client/scripts/ui/panel_tab_strip.gd', 'utf-8')
const snapshotSectionPageSource = readFileSync('godot-client/scripts/ui/slg_snapshot_section_page.gd', 'utf-8')
const aiPanelSource = readFileSync('godot-client/scripts/ui/ai_panel.gd', 'utf-8')
const aiPanelPresenterSource = readFileSync('godot-client/scripts/ui/presenters/ai_panel_presenter.gd', 'utf-8')
const nativeShellSource = readFileSync('godot-client/scripts/ui/native_slg_shell.gd', 'utf-8')
const mainSource = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const alliancePanelSource = readFileSync('godot-client/scripts/ui/alliance_panel.gd', 'utf-8')
const battleReportDetailPageSource = readFileSync('godot-client/scripts/ui/battle_report_detail_page.gd', 'utf-8')
const battleReportListPageSource = readFileSync('godot-client/scripts/ui/battle_report_list_page.gd', 'utf-8')
const mainChatOverlaySource = readFileSync('godot-client/scripts/ui/main_chat_overlay.gd', 'utf-8')
const mainCityHubOverlaySource = readFileSync('godot-client/scripts/ui/main_city_hub_overlay.gd', 'utf-8')
const interiorPanelSource = readFileSync('godot-client/scripts/ui/interior_panel.gd', 'utf-8')
const mailPanelSource = readFileSync('godot-client/scripts/ui/mail_panel.gd', 'utf-8')
const slgDomainAdapterSource = readFileSync('godot-client/scripts/app/adapters/slg_domain_action_adapter.gd', 'utf-8')
const domainActionAdapterSource = readFileSync('godot-client/scripts/app/adapters/slg_domain_action_adapter.gd', 'utf-8')
const visualSmokeSource = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')
const settingsPanelSource = readFileSync('godot-client/scripts/ui/settings_panel.gd', 'utf-8')
const mapGridSource = readFileSync('godot-client/scripts/map/map_grid.gd', 'utf-8')
const tianxiaMarkerVisualPolicySource = readFileSync('godot-client/scripts/map/tianxia_yutu_marker_visual_policy.gd', 'utf-8')
const tianxiaProductAcceptanceContractSource = readFileSync(
  'godot-client/scripts/app/helpers/tianxia_yutu_product_acceptance_contract.gd',
  'utf-8',
)
const closureBatchSource = readFileSync('godot-client/tools/run_mainline_ui_closure_batch.py', 'utf-8')

for (const token of [
  'general_profile_action_bg_v1',
  'skill_filter_chip_bg_v1',
  'recruit_draw_command_bg_v1',
  'ai_panel_action_command_bg_v1',
  'ai_switch_command_bg_v1',
  'chat_paper_action_command_bg_v1',
  'general_roster_detail_button_v1',
]) {
  assert.ok(factorySource.includes(token) || nativeShellSource.includes(token), `runtime must expose ${token}`)
  assert.ok(closureBatchSource.includes(token), `closure batch must validate ${token}`)
}

for (const label of ['返回', '关闭', '详情', '重置', '攻略', '分享', '传承']) {
  const source = label === '关闭' || label === '详情' ? tabStripRendererSource : stageRendererSource
  assert.ok(source.includes(`"${label}"`), `existing general button label must stay live: ${label}`)
}

assert.ok(stageRendererSource.includes('BackButton'), 'general profile must keep BackButton node')
assert.ok(
    stageRendererSource.includes('back_button.set_meta("general_profile_back_action_id", "general_profile_back_close")') &&
    stageRendererSource.includes('back_button.set_meta("general_profile_back_live_text_contract", "general_profile_back_live_text_v1")') &&
    stageRendererSource.includes('back_button.set_meta("general_profile_back_live_text_label", "返回")') &&
    factorySource.includes('button.set_meta("general_profile_back_button_token", GENERAL_PROFILE_BACK_BUTTON_TOKEN)') &&
    factorySource.includes('CLOSE_BACK_BUTTON_SPEC_TOKEN := "close_back_button_spec_v1"') &&
    factorySource.includes('button.set_meta("close_back_button_spec_token", CLOSE_BACK_BUTTON_SPEC_TOKEN)') &&
    factorySource.includes('button.set_meta("close_back_button_role", "back")') &&
    factorySource.includes('button.set_meta("close_back_button_variant", "neutral")') &&
    factorySource.includes('summary["profileCloseBackButtonSpecToken"] = CLOSE_BACK_BUTTON_SPEC_TOKEN') &&
    factorySource.includes('summary["profileBackButtonLiveTextContract"] = "general_profile_back_live_text_v1"') &&
    factorySource.includes('summary["profileBackButtonActionId"] = "general_profile_back_close"') &&
    mainSource.includes('world_open_main_city_generals_profile_back_close') &&
    closureBatchSource.includes('CLOSE_BACK_BUTTON_SPEC_TOKEN = "close_back_button_spec_v1"') &&
    closureBatchSource.includes('profileCloseBackButtonSpecToken!=close_back_button_spec_v1') &&
    closureBatchSource.includes('profileBackButtonCloseVerified!=true'),
  'general profile back button must stay a real live-text Button with shared close/back neutral spec metadata and close closure evidence',
)
assert.ok(tabStripRendererSource.includes('CloseButton'), 'general profile must keep CloseButton node')
assert.ok(
  tabStripRendererSource.includes('close_button.set_meta("general_profile_close_button_token", UI_COMPONENT_FACTORY.GENERAL_PROFILE_CLOSE_BUTTON_TOKEN)') &&
    tabStripRendererSource.includes('close_button.set_meta("general_profile_close_action_id", "general_profile_close_panel")') &&
    tabStripRendererSource.includes('close_button.set_meta("general_profile_close_live_text_contract", "general_profile_close_live_text_v1")') &&
    tabStripRendererSource.includes('close_button.set_meta("general_profile_close_live_text_label", "关闭")') &&
    factorySource.includes('button.set_meta("close_back_button_role", "close")') &&
    factorySource.includes('button.set_meta("close_back_button_variant", "danger")') &&
    factorySource.includes('summary["profileCloseButtonLiveTextContract"] = "general_profile_close_live_text_v1"') &&
    factorySource.includes('summary["profileCloseButtonActionId"] = "general_profile_close_panel"') &&
    mainSource.includes('world_open_main_city_generals_profile_close') &&
    closureBatchSource.includes('profileCloseButtonCloseVerified!=true'),
  'general profile close button must stay a real live-text Button with shared close/back danger spec metadata and close closure evidence',
)
assert.ok(
  tabStripRendererSource.includes('button.name = "GeneralProfileTabButton_%s" % page_id') &&
    tabStripRendererSource.includes('button.set_meta("general_profile_tab_page_id", page_id)') &&
    tabStripRendererSource.includes('button.set_meta("general_profile_tab_button_token", UI_COMPONENT_FACTORY.GENERAL_PROFILE_TAB_BUTTON_TOKEN)') &&
    tabStripRendererSource.includes('button.set_meta("general_profile_tab_live_text_contract", "general_profile_tab_live_text_v1")') &&
    tabStripRendererSource.includes('button.set_meta("general_profile_tab_live_text_label", text)'),
  'general profile tab buttons must stay real live-text Buttons with token metadata',
)
assert.ok(
  factorySource.includes('summary["profileActionBgToken"] = GENERAL_PROFILE_ACTION_BG_TOKEN'),
  'general profile summary must expose action bg token',
)
assert.ok(
  rosterListRendererSource.includes('button.name = "OpenHeroProfileButton_%s" % str(entry.get("id", ""))') &&
    rosterListRendererSource.includes('button.text = "详情"') &&
    rosterListRendererSource.includes('UI_COMPONENT_FACTORY.apply_general_roster_detail_button_style(button)') &&
    rosterListRendererSource.includes('button.set_meta("general_roster_detail_action_id", action_id)') &&
    rosterListRendererSource.includes('button.set_meta("general_roster_detail_live_text_contract", "general_roster_detail_live_text_v1")') &&
    rosterListRendererSource.includes('button.pressed.connect(action_callback.bind(action_id))'),
  'general roster detail entry must stay a real live-text Button with action id metadata',
)
assert.ok(
  factorySource.includes('summary["rosterDetailButtonToken"] = GENERAL_ROSTER_DETAIL_BUTTON_TOKEN') &&
    factorySource.includes('summary["rosterDetailButtonLiveTextContract"] = "general_roster_detail_live_text_v1"') &&
    closureBatchSource.includes('rosterDetailButtonClickedToken'),
  'general roster detail button governance must expose summary and click closure evidence',
)
assert.ok(
  stageRendererSource.includes('button.name = "GeneralProfileStageActionButton_%s" % action_id') &&
    stageRendererSource.includes('button.set_meta("general_profile_stage_action_button_token", UI_COMPONENT_FACTORY.GENERAL_PROFILE_STAGE_ACTION_BUTTON_TOKEN)') &&
    stageRendererSource.includes('button.set_meta("general_profile_stage_action_id", action_id)') &&
    stageRendererSource.includes('button.set_meta("general_profile_stage_action_live_text_contract", "general_profile_stage_action_live_text_v1")') &&
    factorySource.includes('summary["profileStageActionButtonLiveTextContract"] = "general_profile_stage_action_live_text_v1"') &&
    factorySource.includes('summary["profileStageActionButtonActionIds"] = "general_reset / general_guide / general_share / general_inherit"') &&
    mainSource.includes('world_open_main_city_generals_profile_reset_action') &&
    mainSource.includes('world_open_main_city_generals_profile_guide_action') &&
    mainSource.includes('world_open_main_city_generals_profile_share_action') &&
    mainSource.includes('world_open_main_city_generals_profile_inherit_action') &&
    closureBatchSource.includes('"world_open_main_city_generals_profile_reset_action": ("general_reset", "重置")') &&
    closureBatchSource.includes('"world_open_main_city_generals_profile_guide_action": ("general_guide", "攻略")') &&
    closureBatchSource.includes('"world_open_main_city_generals_profile_share_action": ("general_share", "分享")') &&
    closureBatchSource.includes('"world_open_main_city_generals_profile_inherit_action": ("general_inherit", "传承")') &&
    closureBatchSource.includes('profileStageActionButtonClickVerified!=true'),
  'general profile stage actions must stay real live-text Buttons with action ids and click closure evidence',
)
assert.ok(
  generalGrowthRendererSource.includes('button.name = "GeneralGrowthTroopArrowButton_%s" % action_id') &&
    generalGrowthRendererSource.includes('button.set_meta("general_growth_troop_arrow_button_token", UI_COMPONENT_FACTORY.GENERAL_GROWTH_TROOP_ARROW_BUTTON_TOKEN)') &&
    generalGrowthRendererSource.includes('button.set_meta("general_growth_troop_arrow_action_id", action_id)') &&
    generalGrowthRendererSource.includes('button.set_meta("general_growth_troop_arrow_live_text_contract", "general_growth_troop_arrow_live_text_v1")') &&
    mainSource.includes('world_open_main_city_generals_growth_next_troop') &&
    closureBatchSource.includes('troopPreviewArrowClickVerified!=true'),
  'general growth troop arrows must stay real live-text Buttons with click closure evidence',
)
assert.ok(
  generalProfileContentRendererSource.includes('button.name = "GeneralProfileSkillButton_%s" % str(index)') &&
    generalProfileContentRendererSource.includes('button.set_meta("general_profile_skill_button_token", UI_COMPONENT_FACTORY.GENERAL_PROFILE_SKILL_BUTTON_TOKEN)') &&
    generalProfileContentRendererSource.includes('button.set_meta("general_profile_skill_action_id", "skill_detail:%s" % str(index))') &&
    generalProfileContentRendererSource.includes('button.set_meta("general_profile_skill_live_text_contract", "general_profile_skill_live_text_v1")') &&
    generalProfileContentRendererSource.includes('button.pressed.connect(action_callback.bind("skill_detail:%s" % str(index)))') &&
    generalProfileContentRendererSource.includes('close_button.set_meta("skill_detail_popup_close_button_token", UI_COMPONENT_FACTORY.GENERAL_SKILL_DETAIL_POPUP_CLOSE_BUTTON_TOKEN)') &&
    generalProfileContentRendererSource.includes('close_button.set_meta("skill_detail_popup_close_action_id", "skill_detail_popup_close")') &&
    factorySource.includes('summary["profileSkillButtonLiveTextContract"] = "general_profile_skill_live_text_v1"') &&
    factorySource.includes('summary["skillDetailPopupCloseButtonLiveTextContract"] = "skill_detail_popup_close_live_text_v1"') &&
    mainSource.includes('world_open_main_city_generals_profile_skill_detail_close') &&
    closureBatchSource.includes('profileSkillButtonClickVerified!=true') &&
    closureBatchSource.includes('skillDetailPopupCloseButtonClickVerified!=true'),
  'general profile skill detail must keep real skill-slot Buttons and popup close Button with open/close closure evidence',
)

for (const label of ['全部', '指挥', '主动', '被动', '追击', '查找', '清空']) {
  assert.ok(skillLibraryRendererSource.includes(`"${label}"`), `skill library must keep real filter/search label: ${label}`)
}

assert.ok(
  factorySource.includes('summary["skillFilterChipBgToken"] = SKILL_FILTER_CHIP_BG_TOKEN'),
  'skill library summary must expose filter chip bg token',
)
assert.ok(
  !factorySource.includes('SkillLibraryResultDetailButton_') && !skillLibraryRendererSource.includes('SkillLibraryResultDetailButton_'),
  'skill library old result-row detail button must not return',
)
assert.ok(
  skillLibraryRendererSource.includes('HeroCardViewScript.build_card('),
  'skill library must keep formal card flip deck path',
)
assert.ok(
    skillLibraryRendererSource.includes('button.set_meta("skill_library_filter_action_id", action_id)') &&
    skillLibraryRendererSource.includes('button.set_meta("skill_library_filter_live_text_contract", "skill_library_filter_live_text_v1")') &&
    skillLibraryRendererSource.includes('button.set_meta("skill_library_filter_live_text_label", text)') &&
    mainSource.includes('skillLibraryTypeFilterClickedActionId') &&
    mainSource.includes('skillLibrarySearchButtonClickedActionId') &&
    mainSource.includes('skillLibrarySearchButtonClickVerified') &&
    mainSource.includes('skillLibraryClearSearchButtonClickedActionId') &&
    mainSource.includes('skillLibraryClearSearchButtonClickVerified') &&
    visualSmokeSource.includes('"world_open_main_city_skill_library_clear_search"') &&
    closureBatchSource.includes('skillLibraryTypeFilterClickVerified!=true') &&
    closureBatchSource.includes('skillLibrarySearchButtonClickVerified!=true') &&
    closureBatchSource.includes('skillLibraryClearSearchButtonClickVerified!=true'),
  'skill library filter/search controls must stay real Button nodes with action id and live-text metadata',
)
assert.ok(
  skillLibraryRendererSource.includes('hero_card.set_meta("skill_library_deck_card_action_id", "skill_library_card_flip:%s" % skill_id)') &&
    skillLibraryRendererSource.includes('hero_card.set_meta("skill_library_deck_card_live_text_contract", "skill_library_deck_card_flip_live_text_v1")') &&
    skillLibraryRendererSource.includes('hero_card.set_meta("skill_library_deck_card_live_text_label", skill_name)') &&
    mainSource.includes('skillLibraryDeckCardClickedActionId') &&
    closureBatchSource.includes('skillLibraryDeckCardClickVerified!=true'),
  'skill library card flip must expose clicked card metadata and closure evidence',
)
assert.ok(
  skillLibraryRendererSource.includes('row.name = "SkillLibraryControlBandSingleRow"') &&
    !skillLibraryRendererSource.includes('var search_row := HBoxContainer.new()') &&
    factorySource.includes('static func general_skill_library_control_band_search_input_min_width() -> float:') &&
    factorySource.includes('return 180.0') &&
    closureBatchSource.includes('skillLibraryControlBandSearchInputMinWidth<180'),
  'skill library filter/search controls must stay in one horizontal control row with a compact search input',
)
assert.ok(
  skillLibraryRendererSource.includes('grid.name = "SkillLibraryDeckCardGrid"') &&
    skillLibraryRendererSource.includes('grid.columns = UI_COMPONENT_FACTORY.general_skill_library_deck_visible_card_target(filtered_entries.size())') &&
    skillLibraryRendererSource.includes('scroll.set_meta("skill_library_deck_card_scroll_anchor_mode", "fill_parent_left_content_v1")') &&
    skillLibraryRendererSource.includes('grid.set_meta("skill_library_deck_card_grid_mode", "responsive_centered_skill_card_grid_v1")') &&
    skillLibraryRendererSource.includes('scroll.set_meta("skill_library_deck_card_scroll_axis", "vertical_touch_scroll_v1")') &&
    skillLibraryRendererSource.includes('skill_library_deck_card_rail_anchor_mode", "centered_visible_cards_responsive_v1"') &&
    closureBatchSource.includes('skillLibraryDeckCardRailAnchorMode!=centered_visible_cards_responsive_v1') &&
    closureBatchSource.includes('skillLibraryDeckCardScrollAnchorMode!=fill_parent_left_content_v1') &&
    closureBatchSource.includes('skillLibraryDeckCardGridMode!=responsive_centered_skill_card_grid_v1') &&
    closureBatchSource.includes('skillLibraryDeckCardRailScrollHorizontal!=0') &&
    mainSource.includes('_reset_mainline_visual_smoke_skill_library_card_rail_scroll()'),
  'skill library card deck must keep a componentized responsive centered grid instead of drifting to a clipped horizontal rail',
)
assert.ok(
  closureBatchSource.includes('skillLibraryFilterRuntimeButtonLabels missing') &&
    closureBatchSource.includes('skillLibraryOldResultDetailButtonRuntimeVisible!=false') &&
    closureBatchSource.includes('skillLibraryOldPopupChainRuntimeVisible!=false') &&
    closureBatchSource.includes('skillLibraryFloatingCloseButtonVisible!=true') &&
    closureBatchSource.includes('skillLibraryFloatingCloseButtonText missing 关闭'),
  'skill library closure must prove formal filter buttons are live, close is visible, and the old popup/result-detail chain is not visible',
)

for (const actionId of ['draw_single', 'draw_multi']) {
  assert.ok(recruitRendererSource.includes(`"${actionId}"`), `recruit renderer must keep ${actionId}`)
}
assert.ok(
  recruitRendererSource.includes('button.name = "RecruitAction_%s" % action_id'),
  'recruit draw buttons must keep real RecruitAction node names',
)
assert.ok(
  recruitRendererSource.includes('button.set_meta("recruit_draw_action_id", action_id)'),
  'recruit draw buttons must expose action id metadata',
)
assert.ok(
  recruitRendererSource.includes('button.set_meta("recruit_draw_button_token", UI_COMPONENT_FACTORY.RECRUIT_FORMAL_PACK_ACTION_BUTTON_TOKEN)') &&
  recruitRendererSource.includes('button.set_meta("recruit_draw_command_bg_token", UI_COMPONENT_FACTORY.RECRUIT_DRAW_COMMAND_BG_TOKEN)') &&
  recruitRendererSource.includes('button.set_meta("recruit_draw_live_text_contract", "recruit_draw_live_text_v1")') &&
  recruitRendererSource.includes('button.set_meta("recruit_draw_live_text_label", title)') &&
  closureBatchSource.includes('recruitDrawActionClickedLiveTextContract!=recruit_draw_live_text_v1'),
  'recruit draw buttons must expose token and live-text click closure evidence',
)
assert.ok(
  mainSource.includes('await _on_snapshot_overlay_page_action_requested(_read_mainline_visual_smoke_active_overlay_page_id(), clicked_action_id)') &&
  domainActionAdapterSource.includes('"post_open_page_id": "multi" if action_id == "draw_multi" else "single"') &&
  visualSmokeSource.includes('"action": "seedRecruitDrawFixture"') &&
  closureBatchSource.includes('or action in RECRUIT_MULTI_PREVIEW_VISUAL_CONTRACT_ACTIONS'),
  'recruit draw closure must route real draw actions to formal single/multi pages with isolated seed coverage',
)
assert.ok(
  factorySource.includes('summary["recruitDrawCommandBgToken"] = RECRUIT_DRAW_COMMAND_BG_TOKEN'),
  'recruit summary must expose draw command bg token',
)
assert.ok(
  fullScreenPanelHostSource.includes('FULLSCREEN_PANEL_CLOSE_BUTTON_TOKEN := "fullscreen_panel_close_button_v1"') &&
    fullScreenPanelHostSource.includes('FULLSCREEN_PANEL_CLOSE_LIVE_TEXT_CONTRACT := "fullscreen_panel_close_live_text_v1"') &&
    fullScreenPanelHostSource.includes('_close_button.set_meta("fullscreen_panel_close_action_id", "fullscreen_panel_close")') &&
    fullScreenPanelHostSource.includes('_close_button.set_meta("fullscreen_panel_close_live_text_label", close_button_label)') &&
    mainSource.includes('"closeButtonClickedActionId": clicked_action_id') &&
    mainSource.includes('"closeButtonClickedLiveTextContract": clicked_contract') &&
    closureBatchSource.includes('MAIN_CITY_OVERLAY_CLOSE_BUTTON_CONTRACT_ACTIONS = {') &&
    closureBatchSource.includes('"world_open_main_city_settings_close"') &&
    closureBatchSource.includes('mainCityOverlayCloseButtonClickedToken!=fullscreen_panel_close_button_v1') &&
    closureBatchSource.includes('mainCityOverlayCloseButtonClickVerified!=true'),
  'full-screen panel close button must stay a real live-text Button with token metadata and main-city overlay close closure evidence',
)
assert.ok(
  visualSmokeSource.includes('"world_open_main_city_mail_close_button_identity"') &&
    mainSource.includes('"world_open_main_city_mail_close_button_identity"') &&
    mainSource.includes('return await _press_mainline_visual_smoke_main_city_overlay_panel_close_button_identity("mail")') &&
    closureBatchSource.includes('MAIN_CITY_OVERLAY_CLOSE_BUTTON_IDENTITY_ACTIONS = {') &&
    closureBatchSource.includes('"world_open_main_city_mail_close_button_identity": "mail"') &&
    closureBatchSource.includes('mainCityOverlayCloseButtonIdentityPanelId!=') &&
    closureBatchSource.includes('mainCityOverlayCloseButtonClickedActionId!=fullscreen_panel_close') &&
    closureBatchSource.includes('mainCityOverlayCloseButtonClickVerified!=true'),
  'mail close identity action must use an identity-only real CloseButton closure without page layout gates',
)
assert.ok(
  recruitRendererSource.includes('MULTI_DRAW_RESULT_STAGE_TOKEN := "recruit_multi_draw_result_four_card_first_view_v1"') &&
    recruitRendererSource.includes('return 4') &&
    recruitPanelSource.includes('summary["drawPreviewCommercialStageToken"] = "recruit_multi_draw_result_four_card_first_view_v1"') &&
    closureBatchSource.includes('drawPreviewCommercialStageToken!=recruit_multi_draw_result_four_card_first_view_v1') &&
    closureBatchSource.includes('drawPreviewInitialVisibleCardTarget!=4'),
  'recruit five-draw result cards must keep the commercial four-card first-view layout token and closure check',
)

for (const nonexistentButton of ['上一位', '下一位', '进入详情']) {
  assert.ok(
    !stageRendererSource.includes(`"${nonexistentButton}"`) && !tabStripRendererSource.includes(`"${nonexistentButton}"`),
    `general button governance must not add nonexistent ${nonexistentButton}`,
  )
}

assert.ok(
  snapshotSectionPageSource.includes('Button.new()') &&
    snapshotSectionPageSource.includes('button.text = str(action_payload.get("label", action_id))') &&
    snapshotSectionPageSource.includes('UI_COMPONENT_FACTORY.apply_ai_panel_action_button_style(button, action_id, button.disabled)'),
  'AI system action rows must keep real Button nodes with live action labels and shared styling',
)
assert.ok(
  snapshotSectionPageSource.includes('button.set_meta("snapshot_action_id", action_id)'),
  'snapshot action buttons must expose their real action id metadata',
)
assert.ok(
  snapshotSectionPageSource.includes('button.set_meta("snapshot_action_live_text_contract", "snapshot_button_row_live_text_v1")') &&
    snapshotSectionPageSource.includes('button.set_meta("snapshot_action_live_text_label", button.text)'),
  'snapshot action buttons must expose live text metadata for closure',
)
for (const actionId of [
  'ai_players_refresh',
  'ai_player_home_city_candidates_open',
  'ai_player_open_chat_channel',
  'ai_player_display_name_edit',
  'ai_player_context_document_open',
  'autonomy_L1_assigned',
  'autonomy_L2_delegated',
  'autonomy_L3_negotiated',
]) {
  assert.ok(aiPanelPresenterSource.includes(`"id": "${actionId}"`), `AI presenter must keep real action id ${actionId}`)
}
assert.ok(
  aiPanelSource.includes('summary["aiPanelActionCommandBgToken"] = UI_COMPONENT_FACTORY.AI_PANEL_ACTION_COMMAND_BG_TOKEN'),
  'AI panel visual smoke summary must expose action command token',
)
assert.ok(
  aiPanelSource.includes('summary["aiPanelActionLiveTextContract"] = "snapshot_button_row_live_text_v1"'),
  'AI panel summary must expose live text contract',
)
assert.ok(
  aiPanelSource.includes('summary["aiPanelActionRowButtonToken"] = UI_COMPONENT_FACTORY.AI_PANEL_ACTION_COMMAND_BG_TOKEN') &&
    aiPanelSource.includes('summary["aiPanelActionRowActionIds"] = _ai_visual_smoke_action_row_meta_join("ai_panel_action_id")') &&
    aiPanelSource.includes('summary["aiPanelActionRowLabels"] = _ai_visual_smoke_action_row_meta_join("snapshot_action_live_text_label")'),
  'AI panel summary must expose real action row button ids and live labels',
)
assert.ok(
  mainSource.includes('_find_mainline_visual_smoke_visible_button_by_meta(_active_overlay_panel, "ai_panel_action_id", "ai_player_open_chat_channel")') &&
    mainSource.includes('_on_snapshot_overlay_page_action_requested("players", "ai_players_refresh")') &&
    mainSource.includes('"aiPanelActionRowClickedActionId"') &&
    mainSource.includes('"aiPanelActionRowClickedLiveTextContract"') &&
    mainSource.includes('click_action == "ai_panel_open_chat_channel"'),
  'AI panel open-chat closure must refresh runtime state, click the real action row button by action id metadata, and avoid legacy hub gating',
)
assert.ok(
  aiPanelSource.includes('UI_COMPONENT_FACTORY.apply_ai_panel_action_button_style(_voice_refresh_button, "ai_voice_profile_refresh")') &&
    aiPanelSource.includes('UI_COMPONENT_FACTORY.apply_ai_panel_action_button_style(_voice_save_button, "ai_voice_profile_save")') &&
    aiPanelSource.includes('button.set_meta("snapshot_action_live_text_contract", "snapshot_button_row_live_text_v1")') &&
    aiPanelSource.includes('summary["aiVoiceProfileStatusText"]') &&
    mainSource.includes('"ai_panel_voice_settings_refresh_action"') &&
    mainSource.includes('_press_mainline_visual_smoke_ai_panel_voice_settings_button_action(panel_id, "ai_voice_profile_refresh", "↺ 刷新")') &&
    mainSource.includes('_press_mainline_visual_smoke_ai_panel_voice_settings_button_action(panel_id, "ai_voice_profile_save", "令 保存")') &&
    visualSmokeSource.includes('"ai_panel_voice_settings_refresh_action"') &&
    visualSmokeSource.includes('"ai_panel_voice_settings_save_action"') &&
    closureBatchSource.includes('"ai_panel_voice_settings_refresh_action": ("ai_voice_profile_refresh", "↺ 刷新")') &&
    closureBatchSource.includes('"ai_panel_voice_settings_save_action": ("ai_voice_profile_save", "令 保存")') &&
    closureBatchSource.includes('aiVoiceActionButtonClickVerified!=true'),
  'AI voice settings refresh/save buttons must stay real live-text Buttons with governance token and click closure evidence',
)
assert.ok(
  aiPanelSource.includes('_apply_context_file_popup_action_button_style(cancel, "ai_context_file_cancel")') &&
    aiPanelSource.includes('button.set_meta("snapshot_action_live_text_contract", "snapshot_button_row_live_text_v1")') &&
    mainSource.includes('"ai_panel_context_document_cancel_action"') &&
    mainSource.includes('_find_mainline_visual_smoke_visible_button_by_meta(_active_overlay_panel, "ai_panel_action_id", "ai_context_file_cancel")') &&
    mainSource.includes('"aiContextDocumentCancelClickVerified"') &&
    visualSmokeSource.includes('"ai_panel_context_document_cancel_action"') &&
    closureBatchSource.includes('"ai_panel_context_document_cancel_action": ("ai_context_file_cancel", "令 取消")') &&
    closureBatchSource.includes('aiContextDocumentCancelClickVerified!=true'),
  'AI context document cancel must stay a real live-text popup Button with governance token and click-to-close closure evidence',
)
assert.ok(
  aiPanelSource.includes('_apply_context_file_popup_action_button_style(save, "ai_context_file_save")') &&
    aiPanelSource.includes('summary["aiContextDocumentCount"]') &&
    aiPanelSource.includes('summary["aiContextDocumentSummary"]') &&
    mainSource.includes('"ai_panel_context_document_save_action"') &&
    mainSource.includes('_find_mainline_visual_smoke_visible_button_by_meta(_active_overlay_panel, "ai_panel_action_id", "ai_context_file_save")') &&
    mainSource.includes('"aiContextDocumentSaveClickVerified"') &&
    slgDomainAdapterSource.includes('payload.split(":", true, 3)') &&
    visualSmokeSource.includes('"ai_panel_context_document_save_action"') &&
    closureBatchSource.includes('"ai_panel_context_document_save_action": ("ai_context_file_save", "令 保存到AI玩家档案")') &&
    closureBatchSource.includes('aiContextDocumentSaveClickVerified!=true'),
  'AI context document save must stay a real live-text popup Button with governance token, backend refresh evidence, and click closure',
)
assert.ok(
  aiPanelSource.includes('_apply_name_edit_popup_action_button_style(save, "ai_display_name_save")') &&
    aiPanelSource.includes('_apply_name_edit_popup_action_button_style(cancel, "ai_display_name_cancel")') &&
    aiPanelSource.includes('input.name = "AINameEditInput"') &&
    aiPanelSource.includes('summary["aiPanelPrimaryDisplayName"]') &&
    mainSource.includes('"ai_panel_display_name_cancel_action"') &&
    mainSource.includes('"ai_panel_display_name_save_action"') &&
    mainSource.includes('_find_mainline_visual_smoke_visible_button_by_meta(_active_overlay_panel, "ai_panel_action_id", "ai_display_name_save")') &&
    mainSource.includes('"aiDisplayNameSaveClickVerified"') &&
    visualSmokeSource.includes('"ai_panel_display_name_cancel_action"') &&
    visualSmokeSource.includes('"ai_panel_display_name_save_action"') &&
    closureBatchSource.includes('"ai_panel_display_name_cancel_action": ("ai_display_name_cancel", "档 取消")') &&
    closureBatchSource.includes('"ai_panel_display_name_save_action": ("ai_display_name_save", "档 保存")') &&
    closureBatchSource.includes('aiDisplayNameSaveClickVerified!=true'),
  'AI display-name popup save/cancel must stay real live-text Buttons with governance token and closure evidence',
)
assert.ok(
  aiPanelSource.includes('_apply_avatar_select_popup_action_button_style(upload, "ai_avatar_upload_open")') &&
    aiPanelSource.includes('_apply_avatar_select_popup_action_button_style(close, "ai_avatar_select_close")') &&
    aiPanelSource.includes('button.set_meta("ai_panel_action_id", "ai_avatar_select_option:%s" % avatar_id)') &&
    aiPanelSource.includes('summary["aiPanelPrimaryAvatarId"]') &&
    aiPanelPresenterSource.includes('"ai_player_primary_avatar_id"') &&
    mainSource.includes('"ai_panel_avatar_select_close_action"') &&
    mainSource.includes('"ai_panel_avatar_select_option_action"') &&
    mainSource.includes('_find_mainline_visual_smoke_visible_button_by_meta(_active_overlay_panel, "ai_panel_action_id", "ai_avatar_select_close")') &&
    mainSource.includes('_find_mainline_visual_smoke_visible_button_by_meta_prefix(_active_overlay_panel, "ai_panel_action_id", "ai_avatar_select_option:")') &&
    mainSource.includes('"aiAvatarSelectCloseClickVerified"') &&
    mainSource.includes('"aiAvatarSelectOptionClickVerified"') &&
    visualSmokeSource.includes('"ai_panel_avatar_select_close_action"') &&
    visualSmokeSource.includes('"ai_panel_avatar_select_option_action"') &&
    closureBatchSource.includes('"ai_panel_avatar_select_close_action": ("ai_avatar_select_close", "档 关闭")') &&
    closureBatchSource.includes('"ai_panel_avatar_select_option_action": ("ai_avatar_select_option:", "")') &&
    closureBatchSource.includes('aiAvatarSelectCloseClickVerified!=true'),
  'AI avatar select popup close/options must stay real live-text Buttons with governance token and closure evidence',
)

assert.ok(nativeShellSource.includes('existing_button.name = "AiSwitchButton"'), 'AI switch must keep real AiSwitchButton node')
assert.ok(nativeShellSource.includes('_bind_action_button(existing_button, "ai_switch_home_city")'), 'AI switch must keep real action binding')
assert.ok(nativeShellSource.includes('_ai_switch_button.text = "AI切换"'), 'AI switch must keep live text')
assert.ok(nativeShellSource.includes('_apply_mainline_command_button_skin(_ai_switch_button, "ai_switch")'), 'AI switch must keep formal scroll component skin')
assert.ok(mainSource.includes('"shellNavAiSwitchCommandBgToken": ai_switch_command_bg_token'), 'main visual summary must expose AI switch token')
assert.ok(
  mainSource.includes('facility_summary["aiSwitchOneClickCommandBgToken"]') &&
    mainSource.includes('facility_summary["aiSwitchOneClickButtonText"]') &&
    mainSource.includes('facility_summary["aiSwitchOneClickRecruitAdjacentOk"]') &&
    mainSource.includes('click_action == "world_ai_switch_open_home_city"') &&
    mainSource.includes('hub_requirement_ok = true'),
  'AI switch one-click closure must expose button token, live text, placement, downstream facility proof, and avoid legacy hub gating',
)

assert.ok(
  alliancePanelSource.includes('_apply_organization_paper_command_button_style') &&
    alliancePanelSource.includes('Button.new()') &&
    alliancePanelSource.includes('button.text = label'),
  'alliance/organization governance must stay on real live-text Buttons',
)
assert.ok(
  alliancePanelSource.includes('ORGANIZATION_HOME_ENTRY_BUTTON_TOKEN := "organization_home_entry_button_v1"') &&
    alliancePanelSource.includes('ORGANIZATION_HOME_ENTRY_LIVE_TEXT_CONTRACT := "organization_home_entry_live_text_v1"') &&
    alliancePanelSource.includes('button.name = "OrganizationHomeEntryButton_%s" % target_page_id.replace("/", "_")') &&
    alliancePanelSource.includes('button.set_meta("organization_home_entry_button_token", ORGANIZATION_HOME_ENTRY_BUTTON_TOKEN)') &&
    alliancePanelSource.includes('button.set_meta("organization_home_entry_live_text_contract", ORGANIZATION_HOME_ENTRY_LIVE_TEXT_CONTRACT)') &&
    alliancePanelSource.includes('button.set_meta("organization_home_entry_target_page_id", target_page_id)') &&
    alliancePanelSource.includes('set_active_page_id(target_page_id)'),
  'alliance home entry actions must stay real live-text Buttons with governance token and existing page route chain',
)
assert.ok(
  closureBatchSource.includes('ORGANIZATION_HOME_ENTRY_BUTTON_TOKEN = "organization_home_entry_button_v1"') &&
    closureBatchSource.includes('organizationHomeEntryLiveTextContract') &&
    closureBatchSource.includes('organizationHomeEntryTargetPageIds'),
  'closure batch must validate alliance home entry button governance',
)
assert.ok(
  mainSource.includes('"world_open_main_city_organization_home_entry_members"') &&
    mainSource.includes('_press_mainline_visual_smoke_organization_home_entry("eligible_alliance", "members/overview", "成员")') &&
    mainSource.includes('_press_mainline_visual_smoke_organization_home_entry("eligible_alliance", "members/groups", "军团")') &&
    mainSource.includes('organizationHomeEntryClickedButtonToken') &&
    visualSmokeSource.includes('"world_open_main_city_organization_home_entry_members"') &&
    visualSmokeSource.includes('"world_open_main_city_organization_home_entry_corps"') &&
    closureBatchSource.includes('"world_open_main_city_organization_home_entry_members": ("members/overview", "成员")') &&
    closureBatchSource.includes('"world_open_main_city_organization_home_entry_corps": ("members/groups", "军团")') &&
    closureBatchSource.includes('organizationHomeEntryClickVerified!=true'),
  'alliance home entry buttons must expose formal click closure from real home buttons into target pages',
)
assert.ok(
  battleReportDetailPageSource.includes('DETAIL_BUTTON_LIVE_TEXT_CONTRACT := "battle_report_detail_button_live_text_v1"') &&
    battleReportDetailPageSource.includes('button.set_meta("battle_report_detail_button_action_id", action_id)') &&
    battleReportDetailPageSource.includes('button.set_meta("battle_report_detail_button_token", token)') &&
    battleReportDetailPageSource.includes('button.set_meta("battle_report_detail_button_live_text_contract", DETAIL_BUTTON_LIVE_TEXT_CONTRACT)') &&
    battleReportDetailPageSource.includes('button.set_meta("battle_report_detail_button_live_text_label", button.text.strip_edges())') &&
    battleReportDetailPageSource.includes('"battleReportDetailGovernedButtonActionIds"') &&
    battleReportDetailPageSource.includes('"battleReportDetailGovernedButtonLabels"'),
  'battle report detail buttons must stay real live-text Buttons with governance metadata',
)
assert.ok(
  factorySource.includes('BATTLE_REPORT_DETAIL_CARD_COMPOSITION_TOKEN := "battle_report_detail_card_composition_v1"') &&
    factorySource.includes('static func battle_report_detail_card_composition_token() -> String:') &&
    factorySource.includes('summary["battleReportDetailCardCompositionToken"] = battle_report_detail_card_composition_token()') &&
    factorySource.includes('summary["battleReportDetailCardCompositionMode"] = "opposed_army_result_focus_footer_tabs_v1"') &&
    battleReportDetailPageSource.includes('_detail_column.set_meta("battle_report_detail_card_composition_token", BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_card_composition_token())') &&
    battleReportDetailPageSource.includes('_battle_row.set_meta("battle_report_detail_card_composition_order", "attacker_result_defender")') &&
    battleReportDetailPageSource.includes('_outcome_center_card.set_meta("battle_report_detail_card_composition_role", "primary_reward_replay_focus")') &&
    battleReportDetailPageSource.includes('"battleReportDetailRuntimeCardCompositionToken": BATTLE_REPORT_UI_COMPONENT_FACTORY.battle_report_detail_card_composition_token()') &&
    battleReportDetailPageSource.includes('"battleReportDetailRuntimeCardCompositionMode": "opposed_army_result_focus_footer_tabs_v1"') &&
    closureBatchSource.includes('BATTLE_REPORT_DETAIL_CARD_COMPOSITION_TOKEN = "battle_report_detail_card_composition_v1"') &&
    closureBatchSource.includes('battleReportDetailCardCompositionToken!=battle_report_detail_card_composition_v1') &&
    closureBatchSource.includes('battleReportDetailRuntimeCardCompositionMode!=opposed_army_result_focus_footer_tabs_v1'),
  'battle report detail page must expose a unified card composition contract for opposed armies, result focus, and footer tabs',
)
assert.ok(
  factorySource.includes('BATTLE_REPORT_LIST_CARD_HIERARCHY_TOKEN := "battle_report_list_card_result_first_hierarchy_v1"') &&
    factorySource.includes('summary["battleReportListCardHierarchyToken"] = BATTLE_REPORT_LIST_CARD_HIERARCHY_TOKEN') &&
    factorySource.includes('summary["battleReportListCardHierarchyMode"] = "header_attack_result_defense_v1"') &&
    battleReportListPageSource.includes('button.set_meta("battle_report_list_card_hierarchy_token", BATTLE_REPORT_UI_COMPONENT_FACTORY.BATTLE_REPORT_LIST_CARD_HIERARCHY_TOKEN)') &&
    battleReportListPageSource.includes('body_row.set_meta("battle_report_list_card_body_order", "attacker_result_defender")') &&
    battleReportListPageSource.includes('panel.set_meta("battle_report_result_cluster_visual_role", "primary_outcome_focus")') &&
    closureBatchSource.includes('BATTLE_REPORT_LIST_CARD_HIERARCHY_TOKEN = "battle_report_list_card_result_first_hierarchy_v1"') &&
    closureBatchSource.includes('battleReportListCardHierarchyToken!=battle_report_list_card_result_first_hierarchy_v1') &&
    closureBatchSource.includes('battleReportListCardHierarchyMode!=header_attack_result_defense_v1'),
  'battle report list cards must expose a result-first hierarchy token and keep header/attacker/result/defender visual order',
)
assert.ok(
  factorySource.includes('BATTLE_REPORT_LIST_CARD_BADGE_TOKEN := "battle_report_list_card_badge_v2"') &&
    closureBatchSource.includes('BATTLE_REPORT_LIST_CARD_BADGE_TOKEN = "battle_report_list_card_badge_v2"') &&
    closureBatchSource.includes('battleReportListCardBadgeFontSize!=16') &&
    !closureBatchSource.includes('battleReportSeededOrganizationOwnedCount<1'),
  'battle report closure batch must follow the current v2 badge contract and must not block detail screenshots on stale organization-owned seeded evidence',
)
assert.ok(
  closureBatchSource.includes('BATTLE_REPORT_DETAIL_BUTTON_LIVE_TEXT_CONTRACT = "battle_report_detail_button_live_text_v1"') &&
    closureBatchSource.includes('battleReportDetailGovernedButtonVisibleCount<6') &&
    closureBatchSource.includes('battleReportDetailGovernedButtonLabelMissing') &&
    closureBatchSource.includes('battleReportDetailGovernedButtonActionIdMissing'),
  'closure batch must validate battle report detail button governance',
)
assert.ok(
  mainSource.includes('"battle_report_detail_battlefield_tab_action"') &&
    mainSource.includes('_press_mainline_visual_smoke_battle_report_detail_button_action(panel_id, "battle_report_detail_tab:battlefield", "战斗地点", "battlefield", "battle_report_detail_tab_button_v1")') &&
    mainSource.includes('"battle_report_detail_stats_tab_action"') &&
    mainSource.includes('_press_mainline_visual_smoke_battle_report_detail_button_action(panel_id, "battle_report_detail_tab:stats", "统计 / 战法", "stats", "battle_report_detail_tab_button_v1")') &&
    mainSource.includes('_press_mainline_visual_smoke_battle_report_detail_button_action(panel_id, "battle_report_detail_tab:formation", "阵容详情", "formation", "battle_report_detail_tab_button_v1")') &&
    mainSource.includes('_press_mainline_visual_smoke_battle_report_detail_button_action(panel_id, "battle_report_detail_back", "返回列表", "personal", "battle_report_detail_footer_button_v1")') &&
    mainSource.includes('battleReportDetailButtonClickedActionId') &&
    visualSmokeSource.includes('"battle_report_detail_battlefield_tab_action"') &&
    visualSmokeSource.includes('"battle_report_detail_stats_tab_action"') &&
    visualSmokeSource.includes('"battle_report_detail_formation_tab_action"') &&
    visualSmokeSource.includes('"battle_report_detail_back_action"') &&
    closureBatchSource.includes('"battle_report_detail_battlefield_tab_action": ("battle_report_detail_tab:battlefield", "战斗地点", "battlefield", BATTLE_REPORT_DETAIL_TAB_BUTTON_TOKEN)') &&
    closureBatchSource.includes('"battle_report_detail_stats_tab_action": ("battle_report_detail_tab:stats", "统计 / 战法", "stats", BATTLE_REPORT_DETAIL_TAB_BUTTON_TOKEN)') &&
    closureBatchSource.includes('"battle_report_detail_formation_tab_action": ("battle_report_detail_tab:formation", "阵容详情", "formation", BATTLE_REPORT_DETAIL_TAB_BUTTON_TOKEN)') &&
    closureBatchSource.includes('"battle_report_detail_back_action": ("battle_report_detail_back", "返回列表", "personal", BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN)') &&
    closureBatchSource.includes('battleReportDetailButtonClickVerified!=true'),
  'battle report detail buttons must expose formal click closure for real battlefield/stats/formation/back buttons',
)
assert.ok(
  visualSmokeSource.includes('"battle_report_detail_back_button_identity"') &&
    mainSource.includes('"battle_report_detail_back_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_battle_report_detail_back_button_identity(panel_id)') &&
    mainSource.includes('"battleReportDetailBackButtonClickedButtonName": clicked_button_name') &&
    closureBatchSource.includes('BATTLE_REPORT_DETAIL_BACK_BUTTON_IDENTITY_ACTIONS = {') &&
    closureBatchSource.includes('"battle_report_detail_back_button_identity": ("battle_report_detail_back"') &&
    closureBatchSource.includes('"SOM_D10_CollapseButton")') &&
    closureBatchSource.includes('battleReportDetailBackButtonClickedActionId!=') &&
    closureBatchSource.includes('battleReportDetailBackButtonClickedButtonName!=') &&
    closureBatchSource.includes('battleReportDetailBackButtonClickVerified!=true'),
  'battle report detail back identity action must validate the real footer BackButton without detail page layout gates',
)
assert.ok(
  visualSmokeSource.includes('"battle_report_detail_stats_tab_button_identity"') &&
    mainSource.includes('"battle_report_detail_stats_tab_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_battle_report_detail_tab_button_identity(panel_id, "battle_report_detail_tab:stats", "统计 / 战法", "stats", "battle_report_detail_tab_button_v1", "StatsTabButton")') &&
    mainSource.includes('"battleReportDetailTabButtonClickedButtonName": clicked_button_name') &&
    closureBatchSource.includes('BATTLE_REPORT_DETAIL_TAB_BUTTON_IDENTITY_ACTIONS = {') &&
    closureBatchSource.includes('"battle_report_detail_stats_tab_button_identity": ("battle_report_detail_tab:stats"') &&
    closureBatchSource.includes('"StatsTabButton")') &&
    closureBatchSource.includes('battleReportDetailTabButtonClickedActionId!=') &&
    closureBatchSource.includes('battleReportDetailTabButtonClickedButtonName!=') &&
    closureBatchSource.includes('battleReportDetailTabButtonClickVerified!=true'),
  'battle report detail stats tab identity action must validate the real tab Button without detail page layout gates',
)
assert.ok(
  visualSmokeSource.includes('"battle_report_detail_formation_tab_button_identity"') &&
    mainSource.includes('"battle_report_detail_formation_tab_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_battle_report_detail_tab_button_identity(panel_id, "battle_report_detail_tab:formation", "阵容详情", "formation", "battle_report_detail_tab_button_v1", "FormationTabButton")') &&
    closureBatchSource.includes('"battle_report_detail_formation_tab_button_identity": ("battle_report_detail_tab:formation"') &&
    closureBatchSource.includes('"FormationTabButton")'),
  'battle report detail formation tab identity action must reuse the real tab Button identity closure',
)
assert.ok(
  visualSmokeSource.includes('"battle_report_detail_battlefield_tab_button_identity"') &&
    mainSource.includes('"battle_report_detail_battlefield_tab_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_battle_report_detail_tab_button_identity(panel_id, "battle_report_detail_tab:battlefield", "战斗地点", "battlefield", "battle_report_detail_tab_button_v1", "BattlefieldTabButton")') &&
    closureBatchSource.includes('"battle_report_detail_battlefield_tab_button_identity": ("battle_report_detail_tab:battlefield"') &&
    closureBatchSource.includes('"BattlefieldTabButton")'),
  'battle report detail battlefield tab identity action must reuse the real tab Button identity closure',
)
assert.ok(
  visualSmokeSource.includes('"battle_report_detail_share_button_identity"') &&
    visualSmokeSource.includes('"battle_report_detail_favorite_button_identity"') &&
    mainSource.includes('"battle_report_detail_share_button_identity"') &&
    mainSource.includes('"battle_report_detail_favorite_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_battle_report_detail_footer_button_identity(panel_id, "battle_report_detail_share", "分享", BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN, "SOM_D08_ShareButton")') &&
    mainSource.includes('_press_mainline_visual_smoke_battle_report_detail_footer_button_identity(panel_id, "battle_report_detail_favorite", "收藏", BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN, "SOM_D08_FavoriteButton")') &&
    mainSource.includes('"battleReportDetailFooterButtonClickedButtonName": clicked_button_name') &&
    closureBatchSource.includes('BATTLE_REPORT_DETAIL_FOOTER_BUTTON_IDENTITY_ACTIONS = {') &&
    closureBatchSource.includes('"battle_report_detail_share_button_identity": ("battle_report_detail_share"') &&
    closureBatchSource.includes('"SOM_D08_ShareButton")') &&
    closureBatchSource.includes('"battle_report_detail_favorite_button_identity": ("battle_report_detail_favorite"') &&
    closureBatchSource.includes('"SOM_D08_FavoriteButton")') &&
    visualSmokeSource.includes('BATTLE_REPORT_SEEDED_CLOSURE_ACTIONS = {') &&
    visualSmokeSource.includes('"battle_report_detail_share_button_identity"') &&
    visualSmokeSource.includes('"battle_report_detail_favorite_button_identity"') &&
    closureBatchSource.includes('battleReportDetailFooterButtonClickVerified!=true'),
  'battle report detail share/favorite footer identity actions must validate real footer Buttons without detail page layout gates',
)
assert.ok(
  visualSmokeSource.includes('"battle_report_detail_replay_button_identity"') &&
    mainSource.includes('"battle_report_detail_replay_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_battle_report_detail_footer_button_identity(panel_id, "battle_report_detail_replay", "战况回放", BATTLE_REPORT_DETAIL_FOOTER_BUTTON_TOKEN, "ReplayButton")') &&
    closureBatchSource.includes('"battle_report_detail_replay_button_identity": ("battle_report_detail_replay"') &&
    closureBatchSource.includes('"ReplayButton")') &&
    visualSmokeSource.includes('BATTLE_REPORT_SEEDED_CLOSURE_ACTIONS = {') &&
    visualSmokeSource.includes('"battle_report_detail_replay_button_identity"') &&
    closureBatchSource.includes('battleReportDetailFooterButtonClickVerified!=true'),
  'battle report detail replay footer identity action must validate the real footer Button without detail page layout gates',
)
assert.ok(
  interiorPanelSource.includes('INTERIOR_WORK_ORDER_ACTION_BUTTON_TOKEN := "interior_work_order_action_button_v1"') &&
    interiorPanelSource.includes('INTERIOR_WORK_ORDER_ACTION_LIVE_TEXT_CONTRACT := "interior_work_order_action_live_text_v1"') &&
    interiorPanelSource.includes('action := Button.new()') &&
    interiorPanelSource.includes('action.text = _primary_action_label(work_order, "primary_action_label", "查看")') &&
    interiorPanelSource.includes('action.set_meta("interior_work_order_action_button_token", INTERIOR_WORK_ORDER_ACTION_BUTTON_TOKEN)') &&
    interiorPanelSource.includes('work_order_action_requested.emit(action_id, queue_item_id)'),
  'interior work-order actions must stay real live-text Buttons with governance token and existing signal chain',
)
assert.ok(
  closureBatchSource.includes('INTERIOR_WORK_ORDER_ACTION_BUTTON_TOKEN = "interior_work_order_action_button_v1"') &&
    closureBatchSource.includes('interiorAffairsWorkOrderActionLiveTextContract') &&
    closureBatchSource.includes('interiorAffairsWorkOrderActionLabels'),
  'closure batch must validate interior work-order action button governance',
)
assert.ok(
  fullScreenPanelHostSource.includes('FULLSCREEN_PANEL_BACK_BUTTON_TOKEN := "fullscreen_panel_back_button_v1"') &&
    fullScreenPanelHostSource.includes('FULLSCREEN_PANEL_BACK_LIVE_TEXT_CONTRACT := "fullscreen_panel_back_live_text_v1"') &&
    fullScreenPanelHostSource.includes('_back_button.set_meta("fullscreen_panel_back_button_token", FULLSCREEN_PANEL_BACK_BUTTON_TOKEN)') &&
    fullScreenPanelHostSource.includes('_back_button.set_meta("fullscreen_panel_back_action_id", "fullscreen_panel_back")') &&
    fullScreenPanelHostSource.includes('_back_button.set_meta("fullscreen_panel_back_target_page_id", back_button_target_page_id)') &&
    fullScreenPanelHostSource.includes('_back_button.set_meta("fullscreen_panel_back_live_text_contract", FULLSCREEN_PANEL_BACK_LIVE_TEXT_CONTRACT)') &&
    fullScreenPanelHostSource.includes('_back_button.set_meta("fullscreen_panel_back_live_text_label", back_button_label)') &&
    interiorPanelSource.includes('host.set_back_button_target_page_id("home/lobby")'),
  'fullscreen panel BackButton must expose real Button governance metadata for interior secondary-page back closure',
)
assert.ok(
  mainSource.includes('"world_open_main_city_interior_market_back_button_identity"') &&
    mainSource.includes('"interiorSecondaryBackButtonClickedActionId"') &&
    mainSource.includes('"interiorSecondaryBackButtonClickedToken"') &&
    mainSource.includes('"interiorSecondaryBackButtonClickVerified"') &&
    visualSmokeSource.includes('"world_open_main_city_interior_market_back_button_identity"') &&
    closureBatchSource.includes('"world_open_main_city_interior_market_back_button_identity"') &&
    closureBatchSource.includes('FULLSCREEN_PANEL_BACK_BUTTON_TOKEN = "fullscreen_panel_back_button_v1"') &&
    closureBatchSource.includes('interiorSecondaryBackButtonClickedActionId!=fullscreen_panel_back') &&
    closureBatchSource.includes('interiorSecondaryBackButtonClickVerified!=true'),
  'closure batch must validate interior secondary BackButton real Button identity and home-lobby return',
)
assert.ok(
  mainSource.includes('"world_open_main_city_interior_trade_back_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_main_city_interior_secondary_back_button_identity("trade/overview", "home/lobby")') &&
    visualSmokeSource.includes('"world_open_main_city_interior_trade_back_button_identity"') &&
    closureBatchSource.includes('"world_open_main_city_interior_trade_back_button_identity": "trade/overview"') &&
    closureBatchSource.includes('interiorSecondaryBackButtonBeforePageId!=trade/overview'),
  'closure batch must validate interior trade secondary BackButton real Button identity and home-lobby return',
)
assert.ok(
  mainSource.includes('"world_open_main_city_interior_tax_back_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_main_city_interior_secondary_back_button_identity("tax/structure", "home/lobby")') &&
    visualSmokeSource.includes('"world_open_main_city_interior_tax_back_button_identity"') &&
    closureBatchSource.includes('"world_open_main_city_interior_tax_back_button_identity": "tax/structure"') &&
    closureBatchSource.includes('interiorSecondaryBackButtonBeforePageId!=tax/structure'),
  'closure batch must validate interior tax secondary BackButton real Button identity and home-lobby return',
)
assert.ok(
  mainSource.includes('"world_open_main_city_interior_affairs_back_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_main_city_interior_secondary_back_button_identity("affairs/queue", "home/lobby")') &&
    visualSmokeSource.includes('"world_open_main_city_interior_affairs_back_button_identity"') &&
    closureBatchSource.includes('"world_open_main_city_interior_affairs_back_button_identity": "affairs/queue"') &&
    closureBatchSource.includes('interiorSecondaryBackButtonBeforePageId!=affairs/queue'),
  'closure batch must validate interior affairs secondary BackButton real Button identity and home-lobby return',
)
assert.ok(
  interiorPanelSource.includes('INTERIOR_HOME_ENTRY_BUTTON_TOKEN := "interior_home_entry_button_v1"') &&
    interiorPanelSource.includes('INTERIOR_HOME_ENTRY_LIVE_TEXT_CONTRACT := "interior_home_entry_live_text_v1"') &&
    interiorPanelSource.includes('button.name = "InteriorHomeEntryButton_%s" % entry_id') &&
    interiorPanelSource.includes('button.set_meta("interior_home_entry_button_token", INTERIOR_HOME_ENTRY_BUTTON_TOKEN)') &&
    interiorPanelSource.includes('button.set_meta("interior_home_entry_action_id", "interior_home_entry:%s" % entry_id)') &&
    interiorPanelSource.includes('button.set_meta("interior_home_entry_target_page_id", page_id)') &&
    interiorPanelSource.includes('button.set_meta("interior_home_entry_live_text_contract", INTERIOR_HOME_ENTRY_LIVE_TEXT_CONTRACT)') &&
    interiorPanelSource.includes('button.set_meta("interior_home_entry_live_text_label", label)') &&
    interiorPanelSource.includes('button.pressed.connect(Callable(self, "_on_home_entry_pressed").bind(page_id))'),
  'interior home entry buttons must stay real live-text Buttons with governance metadata and existing page navigation chain',
)
assert.ok(
  mainSource.includes('"world_open_main_city_interior_market_entry_button_identity"') &&
    mainSource.includes('"interiorHomeEntryClickedActionId"') &&
    mainSource.includes('"interiorHomeEntryClickedTargetPageId"') &&
    mainSource.includes('"interiorHomeEntryClickVerified"') &&
    visualSmokeSource.includes('"world_open_main_city_interior_market_entry_button_identity"') &&
    closureBatchSource.includes('"world_open_main_city_interior_market_entry_button_identity"') &&
    closureBatchSource.includes('INTERIOR_HOME_ENTRY_LIVE_TEXT_CONTRACT = "interior_home_entry_live_text_v1"') &&
    closureBatchSource.includes('interiorHomeEntryClickedActionId!=interior_home_entry:market') &&
    closureBatchSource.includes('interiorHomeEntryClickVerified!=true'),
  'closure batch must validate interior market home-entry real Button identity and secondary-page navigation',
)
assert.ok(
  mainSource.includes('"world_open_main_city_interior_trade_entry_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_main_city_interior_home_entry_button_identity("trade/overview", "交易", "interior_home_entry:trade", "InteriorHomeEntryButton_trade")') &&
    visualSmokeSource.includes('"world_open_main_city_interior_trade_entry_button_identity"') &&
    closureBatchSource.includes('"world_open_main_city_interior_trade_entry_button_identity": ("trade/overview", "交易", "interior_home_entry:trade", "InteriorHomeEntryButton_trade")') &&
    closureBatchSource.includes('interiorHomeEntryClickedTargetPageId!=trade/overview'),
  'closure batch must validate interior trade home-entry real Button identity and secondary-page navigation',
)
assert.ok(
  mainSource.includes('"world_open_main_city_interior_tax_entry_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_main_city_interior_home_entry_button_identity("tax/structure", "税收", "interior_home_entry:tax", "InteriorHomeEntryButton_tax")') &&
    visualSmokeSource.includes('"world_open_main_city_interior_tax_entry_button_identity"') &&
    closureBatchSource.includes('"world_open_main_city_interior_tax_entry_button_identity": ("tax/structure", "税收", "interior_home_entry:tax", "InteriorHomeEntryButton_tax")') &&
    closureBatchSource.includes('interiorHomeEntryClickedTargetPageId!=tax/structure'),
  'closure batch must validate interior tax home-entry real Button identity and secondary-page navigation',
)
assert.ok(
  mainSource.includes('"world_open_main_city_interior_affairs_entry_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_main_city_interior_home_entry_button_identity("affairs/queue", "政务", "interior_home_entry:affairs", "InteriorHomeEntryButton_affairs")') &&
    visualSmokeSource.includes('"world_open_main_city_interior_affairs_entry_button_identity"') &&
    closureBatchSource.includes('"world_open_main_city_interior_affairs_entry_button_identity": ("affairs/queue", "政务", "interior_home_entry:affairs", "InteriorHomeEntryButton_affairs")') &&
    closureBatchSource.includes('interiorHomeEntryClickedTargetPageId!=affairs/queue'),
  'closure batch must validate interior affairs home-entry real Button identity and secondary-page navigation',
)
assert.ok(
  factorySource.includes('MAIL_PANEL_ROW_SELECT_BUTTON_TOKEN := "mail_panel_row_select_button_v1"') &&
    factorySource.includes('MAIL_PANEL_ROW_SELECT_LIVE_TEXT_CONTRACT := "mail_panel_row_select_live_text_v1"') &&
    snapshotSectionPageSource.includes('var shell := Button.new()') &&
    snapshotSectionPageSource.includes('shell.set_meta("mail_panel_row_select_button_token", UI_COMPONENT_FACTORY.mail_panel_row_select_button_token())') &&
    snapshotSectionPageSource.includes('shell.set_meta("mail_panel_row_select_action_id", action_id)') &&
    snapshotSectionPageSource.includes('shell.set_meta("mail_panel_row_select_live_text_label", live_text_label)') &&
    snapshotSectionPageSource.includes('shell.pressed.connect(Callable(self, "_on_action_button_pressed").bind(action_id))'),
  'mail row selection must stay on real Button rows with governance metadata and existing mail_select action chain',
)
assert.ok(
  mailPanelSource.includes('"mailPanelRowSelectButtonToken"') &&
    mailPanelSource.includes('"mailPanelRowSelectLiveTextContract"') &&
    mailPanelSource.includes('"mailPanelRowSelectActionIds"') &&
    mailPanelSource.includes('"mailPanelRowSelectLabels"') &&
    closureBatchSource.includes('MAIL_PANEL_ROW_SELECT_BUTTON_TOKEN = "mail_panel_row_select_button_v1"') &&
    closureBatchSource.includes('mailPanelRowSelectButtonVisibleCount<3') &&
    closureBatchSource.includes('mailPanelRowSelectActionIds missing mail_select:mail_daily_welfare') &&
    mainSource.includes('"mailPanelRowSelectClickedActionId"') &&
    mainSource.includes('"mailPanelRowSelectClickedToken"') &&
    mainSource.includes('"mailPanelRowSelectClickedLiveTextContract"') &&
    closureBatchSource.includes('mailPanelRowSelectClickedActionId!=mail_select:mail_daily_welfare') &&
    closureBatchSource.includes('mailPanelRowSelectClickVerified!=true'),
  'closure batch must validate mail row select button governance and target selection closure',
)
assert.ok(
  visualSmokeSource.includes('"world_open_main_city_mail_select_reward_button_identity"') &&
    mainSource.includes('"world_open_main_city_mail_select_reward_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_mail_row_select_button_identity(panel_id, "mail_daily_welfare")') &&
    mainSource.includes('"mailPanelRowSelectClickedButtonName": clicked_button_name') &&
    closureBatchSource.includes('MAIL_PANEL_ROW_SELECT_BUTTON_IDENTITY_ACTIONS = {') &&
    closureBatchSource.includes('"world_open_main_city_mail_select_reward_button_identity": ("mail_select:mail_daily_welfare"') &&
    closureBatchSource.includes('"MailInboxItemButton_mail_daily_welfare"') &&
    closureBatchSource.includes('mailPanelRowSelectIdentityOnly!=true') &&
    closureBatchSource.includes('mailPanelRowSelectClickedButtonName!=') &&
    closureBatchSource.includes('mailPanelRowSelectClickVerified!=true'),
  'mail reward row select identity action must validate the real row Button without reward/detail data gates',
)
assert.ok(
  visualSmokeSource.includes('"world_open_main_city_mail_select_event_reward_button_identity"') &&
    mainSource.includes('"world_open_main_city_mail_select_event_reward_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_mail_row_select_button_identity(panel_id, "mail_event_reward")') &&
    closureBatchSource.includes('"world_open_main_city_mail_select_event_reward_button_identity": ("mail_select:mail_event_reward"') &&
    closureBatchSource.includes('"MailInboxItemButton_mail_event_reward"') &&
    closureBatchSource.includes('mailPanelRowSelectIdentityOnly!=true') &&
    closureBatchSource.includes('mailPanelRowSelectClickedButtonName!=') &&
    closureBatchSource.includes('mailPanelRowSelectClickVerified!=true'),
  'mail event reward row select identity action must reuse the real row Button identity closure without reward/detail data gates',
)
assert.ok(
  visualSmokeSource.includes('"world_open_main_city_mail_select_system_notice_button_identity"') &&
    mainSource.includes('"world_open_main_city_mail_select_system_notice_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_mail_row_select_button_identity(panel_id, "mail_system_notice")') &&
    closureBatchSource.includes('"world_open_main_city_mail_select_system_notice_button_identity": ("mail_select:mail_system_notice"') &&
    closureBatchSource.includes('"MailInboxItemButton_mail_system_notice"') &&
    closureBatchSource.includes('mailPanelRowSelectIdentityOnly!=true') &&
    closureBatchSource.includes('mailPanelRowSelectClickedButtonName!=') &&
    closureBatchSource.includes('mailPanelRowSelectClickVerified!=true'),
  'mail system notice row select identity action must reuse the real row Button identity closure without content/detail data gates',
)
assert.ok(
  panelTabStripSource.includes('PANEL_TAB_BUTTON_TOKEN := "panel_tab_button_v1"') &&
    panelTabStripSource.includes('PANEL_TAB_LIVE_TEXT_CONTRACT := "panel_tab_live_text_v1"') &&
    panelTabStripSource.includes('button.set_meta("panel_tab_button_token", PANEL_TAB_BUTTON_TOKEN)') &&
    panelTabStripSource.includes('button.set_meta("panel_tab_action_id", "panel_tab_select:%s" % tab_id)') &&
    panelTabStripSource.includes('button.set_meta("panel_tab_target_page_id", tab_id)') &&
    panelTabStripSource.includes('button.set_meta("panel_tab_live_text_contract", PANEL_TAB_LIVE_TEXT_CONTRACT)') &&
    panelTabStripSource.includes('button.set_meta("panel_tab_live_text_label", tab_label)'),
  'panel tab strip tabs must stay real Buttons with governance metadata for identity-only tab closure',
)
assert.ok(
  visualSmokeSource.includes('"world_open_main_city_mail_organization_tab_button_identity"') &&
    mainSource.includes('"world_open_main_city_mail_organization_tab_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_mail_panel_tab_button_identity(panel_id, "organization", "panel_tab_select:organization", "Tab_organization")') &&
    mainSource.includes('"mailPanelTabButtonClickedButtonName": clicked_button_name') &&
    closureBatchSource.includes('MAIL_PANEL_TAB_BUTTON_IDENTITY_ACTIONS = {') &&
    closureBatchSource.includes('"world_open_main_city_mail_organization_tab_button_identity": ("organization", "panel_tab_select:organization", PANEL_TAB_BUTTON_TOKEN, "Tab_organization")') &&
    closureBatchSource.includes('mailPanelTabButtonIdentityOnly!=true') &&
    closureBatchSource.includes('mailPanelTabButtonClickedButtonName!=') &&
    closureBatchSource.includes('mailPanelTabButtonClickVerified!=true'),
  'mail organization tab identity action must validate the real tab Button without row/content layout gates',
)
assert.ok(
  visualSmokeSource.includes('"world_open_main_city_mail_system_tab_button_identity"') &&
    mainSource.includes('"world_open_main_city_mail_system_tab_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_mail_panel_tab_button_identity(panel_id, "system", "panel_tab_select:system", "Tab_system")') &&
    closureBatchSource.includes('"world_open_main_city_mail_system_tab_button_identity": ("system", "panel_tab_select:system", PANEL_TAB_BUTTON_TOKEN, "Tab_system")') &&
    closureBatchSource.includes('mailPanelTabButtonIdentityOnly!=true') &&
    closureBatchSource.includes('mailPanelTabButtonClickedButtonName!=') &&
    closureBatchSource.includes('mailPanelTabButtonClickVerified!=true'),
  'mail system tab identity action must validate the real tab Button without row/content layout gates',
)
assert.ok(
  visualSmokeSource.includes('"world_open_main_city_settings_account_tab_button_identity"') &&
    mainSource.includes('"world_open_main_city_settings_account_tab_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_panel_tab_button_identity("settings", "account", "panel_tab_select:account", "Tab_account")') &&
    closureBatchSource.includes('"world_open_main_city_settings_account_tab_button_identity": ("settings", "account", "panel_tab_select:account", PANEL_TAB_BUTTON_TOKEN, "Tab_account")') &&
    closureBatchSource.includes('panelTabButtonIdentityOnly!=true') &&
    closureBatchSource.includes('panelTabButtonClickedButtonName!=') &&
    closureBatchSource.includes('panelTabButtonClickVerified!=true'),
  'settings account tab identity action must validate the real tab Button without settings layout/data gates',
)
assert.ok(
  visualSmokeSource.includes('"world_open_main_city_settings_display_tab_button_identity"') &&
    mainSource.includes('"world_open_main_city_settings_display_tab_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_panel_tab_button_identity("settings", "display", "panel_tab_select:display", "Tab_display")') &&
    closureBatchSource.includes('"world_open_main_city_settings_display_tab_button_identity": ("settings", "display", "panel_tab_select:display", PANEL_TAB_BUTTON_TOKEN, "Tab_display")') &&
    closureBatchSource.includes('panelTabButtonIdentityOnly!=true') &&
    closureBatchSource.includes('panelTabButtonClickedButtonName!=') &&
    closureBatchSource.includes('panelTabButtonClickVerified!=true'),
  'settings display tab identity action must validate the real tab Button without settings layout/data gates',
)
assert.ok(
  visualSmokeSource.includes('"world_open_main_city_settings_audio_tab_button_identity"') &&
    mainSource.includes('"world_open_main_city_settings_audio_tab_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_panel_tab_button_identity("settings", "audio", "panel_tab_select:audio", "Tab_audio")') &&
    closureBatchSource.includes('"world_open_main_city_settings_audio_tab_button_identity": ("settings", "audio", "panel_tab_select:audio", PANEL_TAB_BUTTON_TOKEN, "Tab_audio")') &&
    closureBatchSource.includes('panelTabButtonIdentityOnly!=true') &&
    closureBatchSource.includes('panelTabButtonClickedButtonName!=') &&
    closureBatchSource.includes('panelTabButtonClickVerified!=true'),
  'settings audio tab identity action must validate the real tab Button without settings layout/data gates',
)
assert.ok(
  visualSmokeSource.includes('"world_open_main_city_settings_notification_tab_button_identity"') &&
    mainSource.includes('"world_open_main_city_settings_notification_tab_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_panel_tab_button_identity("settings", "notification", "panel_tab_select:notification", "Tab_notification")') &&
    closureBatchSource.includes('"world_open_main_city_settings_notification_tab_button_identity": ("settings", "notification", "panel_tab_select:notification", PANEL_TAB_BUTTON_TOKEN, "Tab_notification")') &&
    closureBatchSource.includes('panelTabButtonIdentityOnly!=true') &&
    closureBatchSource.includes('panelTabButtonClickedButtonName!=') &&
    closureBatchSource.includes('panelTabButtonClickVerified!=true'),
  'settings notification tab identity action must validate the real tab Button without settings layout/data gates',
)
assert.ok(
  visualSmokeSource.includes('"world_open_main_city_mail_select_org_order_button_identity"') &&
    mainSource.includes('"world_open_main_city_mail_select_org_order_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_mail_row_select_button_identity(panel_id, "mail_org_order", "organization")') &&
    closureBatchSource.includes('"world_open_main_city_mail_select_org_order_button_identity": ("mail_select:mail_org_order"') &&
    closureBatchSource.includes('"MailInboxItemButton_mail_org_order"') &&
    closureBatchSource.includes('mailPanelRowSelectIdentityOnly!=true') &&
    closureBatchSource.includes('mailPanelRowSelectClickedButtonName!=') &&
    closureBatchSource.includes('mailPanelRowSelectClickVerified!=true'),
  'mail organization order row select identity action must reuse the real row Button identity closure after stable organization tab precondition',
)
assert.ok(
  visualSmokeSource.includes('"world_open_main_city_mail_select_org_policy_button_identity"') &&
    mainSource.includes('"world_open_main_city_mail_select_org_policy_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_mail_row_select_button_identity(panel_id, "mail_org_policy", "organization")') &&
    closureBatchSource.includes('"world_open_main_city_mail_select_org_policy_button_identity": ("mail_select:mail_org_policy"') &&
    closureBatchSource.includes('"MailInboxItemButton_mail_org_policy"') &&
    closureBatchSource.includes('mailPanelRowSelectIdentityOnly!=true') &&
    closureBatchSource.includes('mailPanelRowSelectClickedButtonName!=') &&
    closureBatchSource.includes('mailPanelRowSelectClickVerified!=true'),
  'mail organization policy row select identity action must reuse the real row Button identity closure after stable organization tab precondition',
)
assert.ok(
  mainCityHubOverlaySource.includes('TROOP_TEAM_CARD_BUTTON_TOKEN := "troop_team_card_button_v1"') &&
    mainCityHubOverlaySource.includes('TROOP_TEAM_CARD_LIVE_TEXT_CONTRACT := "troop_team_card_live_text_v1"') &&
    mainCityHubOverlaySource.includes('button.set_meta("troop_team_card_button_token", TROOP_TEAM_CARD_BUTTON_TOKEN)') &&
    mainCityHubOverlaySource.includes('button.set_meta("troop_team_card_action_id", "troop_team_select:%s" % team_id)') &&
    mainCityHubOverlaySource.includes('button.set_meta("troop_team_card_team_id", team_id)') &&
    mainCityHubOverlaySource.includes('button.set_meta("troop_team_card_live_text_contract", TROOP_TEAM_CARD_LIVE_TEXT_CONTRACT)') &&
    mainCityHubOverlaySource.includes('button.pressed.connect(Callable(self, "_select_troop_team").bind(team_id))'),
  'main-city troop team cards must stay real live-text Buttons with governance metadata and existing selection chain',
)
assert.ok(
  mainSource.includes('"troopFormationTeamCardClickedActionId"') &&
    mainSource.includes('"troopFormationTeamCardClickedTeamId"') &&
    mainSource.includes('"troopFormationTeamCardClickedToken"') &&
    mainSource.includes('"troopFormationTeamCardClickedLiveTextContract"') &&
    mainSource.includes('"troopFormationTeamCardClickVerified"') &&
    visualSmokeSource.includes('"world_click_main_city_node_troop_assign_preview_open_first_team_button_identity"') &&
    closureBatchSource.includes('"world_click_main_city_node_troop_assign_preview_open_first_team_button_identity"') &&
    closureBatchSource.includes('TROOP_TEAM_CARD_BUTTON_TOKEN = "troop_team_card_button_v1"') &&
    closureBatchSource.includes('troopFormationTeamCardClickedActionId!=troop_team_select:team_01') &&
    closureBatchSource.includes('troopFormationTeamCardClickVerified!=true'),
  'closure batch must validate main-city troop team-card real Button identity for open-first-team',
)
assert.ok(
  mainSource.includes('"world_click_main_city_node_troop_assign_preview_open_second_team_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_main_city_troop_assign_preview_open_team("team_02", "second_team_identity", "")') &&
    visualSmokeSource.includes('"world_click_main_city_node_troop_assign_preview_open_second_team_button_identity"') &&
    closureBatchSource.includes('"world_click_main_city_node_troop_assign_preview_open_second_team_button_identity": ("team_02", "TroopTeamButton_team_02")') &&
    closureBatchSource.includes('troopFormationTeamCardClickedActionId!=troop_team_select:team_02'),
  'closure batch must validate main-city troop team-card real Button identity for open-second-team',
)
assert.ok(
  mainCityHubOverlaySource.includes('TROOP_DETAIL_ACTION_BUTTON_TOKEN := "troop_detail_action_button_v1"') &&
    mainCityHubOverlaySource.includes('TROOP_DETAIL_ACTION_LIVE_TEXT_CONTRACT := "troop_detail_action_live_text_v1"') &&
    mainCityHubOverlaySource.includes('button.set_meta("troop_detail_action_button_token", TROOP_DETAIL_ACTION_BUTTON_TOKEN)') &&
    mainCityHubOverlaySource.includes('button.set_meta("troop_detail_action_id", "troop_detail_mode:%s" % action_id)') &&
    mainCityHubOverlaySource.includes('button.set_meta("troop_detail_action_mode", action_id)') &&
    mainCityHubOverlaySource.includes('button.set_meta("troop_detail_action_live_text_contract", TROOP_DETAIL_ACTION_LIVE_TEXT_CONTRACT)') &&
    mainCityHubOverlaySource.includes('button.set_meta("troop_detail_action_live_text_label", str(action.get("label", "")))') &&
    mainSource.includes('"world_click_main_city_node_troop_assign_preview_open_first_team_recruit_mode_button_identity"') &&
    mainSource.includes('"troopDetailActionClickedActionId"') &&
    mainSource.includes('"troopDetailActionClickedToken"') &&
    mainSource.includes('"troopDetailActionClickedLiveTextContract"') &&
    mainSource.includes('"troopDetailActionClickVerified"') &&
    visualSmokeSource.includes('"world_click_main_city_node_troop_assign_preview_open_first_team_recruit_mode_button_identity"') &&
    closureBatchSource.includes('TROOP_DETAIL_ACTION_BUTTON_TOKEN = "troop_detail_action_button_v1"') &&
    closureBatchSource.includes('TROOP_DETAIL_ACTION_LIVE_TEXT_CONTRACT = "troop_detail_action_live_text_v1"') &&
    closureBatchSource.includes('"world_click_main_city_node_troop_assign_preview_open_first_team_recruit_mode_button_identity": ("troop_detail_mode:recruit", "recruit", "征兵", "TroopFormationRecruitModeButton")') &&
    closureBatchSource.includes('troopDetailActionClickedActionId!=troop_detail_mode:recruit') &&
    closureBatchSource.includes('troopDetailActionClickVerified!=true'),
  'closure batch must validate main-city troop detail recruit-mode real Button identity',
)
assert.ok(
  mainSource.includes('"world_click_main_city_node_troop_assign_preview_open_first_team_config_mode_button_identity"') &&
    mainSource.includes('"_press_mainline_visual_smoke_main_city_troop_assign_preview_open_first_team_config_mode_button_identity"') &&
    mainSource.includes('"troopDetailActionClickedActionId"') &&
    mainSource.includes('"troopDetailActionClickedToken"') &&
    mainSource.includes('"troopDetailActionClickedLiveTextContract"') &&
    mainSource.includes('"troopDetailActionClickVerified"') &&
    visualSmokeSource.includes('"world_click_main_city_node_troop_assign_preview_open_first_team_config_mode_button_identity"') &&
    closureBatchSource.includes('"world_click_main_city_node_troop_assign_preview_open_first_team_config_mode_button_identity": ("troop_detail_mode:config", "config", "配置", "TroopFormationConfigModeButton")') &&
    closureBatchSource.includes('troopDetailActionClickedActionId!=troop_detail_mode:config'),
  'closure batch must validate main-city troop detail config-mode real Button identity',
)
assert.ok(
  mainCityHubOverlaySource.includes('TROOP_DETAIL_BACK_BUTTON_TOKEN := "troop_detail_back_button_v1"') &&
    mainCityHubOverlaySource.includes('TROOP_DETAIL_BACK_LIVE_TEXT_CONTRACT := "troop_detail_back_live_text_v1"') &&
    mainCityHubOverlaySource.includes('back_button.name = "TroopFormationDetailBackButton"') &&
    mainCityHubOverlaySource.includes('back_button.set_meta("troop_detail_back_button_token", TROOP_DETAIL_BACK_BUTTON_TOKEN)') &&
    mainCityHubOverlaySource.includes('back_button.set_meta("troop_detail_back_action_id", "troop_detail_back_to_roster")') &&
    mainCityHubOverlaySource.includes('back_button.set_meta("troop_detail_back_target_mode", "team_roster")') &&
    mainCityHubOverlaySource.includes('back_button.set_meta("troop_detail_back_live_text_contract", TROOP_DETAIL_BACK_LIVE_TEXT_CONTRACT)') &&
    mainCityHubOverlaySource.includes('back_button.set_meta("troop_detail_back_live_text_label", "返回")') &&
    mainSource.includes('"world_click_main_city_node_troop_assign_preview_open_first_team_back_button_identity"') &&
    mainSource.includes('"troopDetailBackButtonClickedActionId"') &&
    mainSource.includes('"troopDetailBackButtonClickedToken"') &&
    mainSource.includes('"troopDetailBackButtonClickedLiveTextContract"') &&
    mainSource.includes('"troopDetailBackButtonClickVerified"') &&
    visualSmokeSource.includes('"world_click_main_city_node_troop_assign_preview_open_first_team_back_button_identity"') &&
    closureBatchSource.includes('TROOP_DETAIL_BACK_BUTTON_TOKEN = "troop_detail_back_button_v1"') &&
    closureBatchSource.includes('TROOP_DETAIL_BACK_LIVE_TEXT_CONTRACT = "troop_detail_back_live_text_v1"') &&
    closureBatchSource.includes('TROOP_DETAIL_BACK_BUTTON_IDENTITY_ACTIONS = {') &&
    closureBatchSource.includes('"world_click_main_city_node_troop_assign_preview_open_first_team_back_button_identity": ("troop_detail_back_to_roster", "team_roster", "返回", "TroopFormationDetailBackButton")') &&
    closureBatchSource.includes('troopDetailBackButtonClickedActionId!=troop_detail_back_to_roster') &&
    closureBatchSource.includes('troopDetailBackButtonClickVerified!=true'),
  'closure batch must validate main-city troop detail real Back Button identity',
)
assert.ok(
  factorySource.includes('SETTINGS_ACTION_ROW_BUTTON_TOKEN := "settings_action_row_button_v1"') &&
    factorySource.includes('SETTINGS_ACTION_ROW_LIVE_TEXT_CONTRACT := "settings_action_row_live_text_v1"') &&
    factorySource.includes('static func is_settings_panel_action_id(action_id: String) -> bool:') &&
    snapshotSectionPageSource.includes('button.set_meta("settings_action_row_button_token", UI_COMPONENT_FACTORY.settings_action_row_button_token())') &&
    snapshotSectionPageSource.includes('button.set_meta("settings_action_row_action_id", action_id)') &&
    snapshotSectionPageSource.includes('button.set_meta("settings_action_row_live_text_label", button.text)') &&
    snapshotSectionPageSource.includes('button.pressed.connect(Callable(self, "_on_action_button_pressed").bind(action_id))'),
  'settings action rows must stay real live-text Buttons with governance metadata and existing snapshot action chain',
)
assert.ok(
  settingsPanelSource.includes('"settingsActionRowButtonToken"') &&
    settingsPanelSource.includes('"settingsActionRowLiveTextContract"') &&
    settingsPanelSource.includes('"settingsActionRowActionIds"') &&
    settingsPanelSource.includes('"settingsActionRowLabels"') &&
    closureBatchSource.includes('SETTINGS_ACTION_ROW_BUTTON_TOKEN = "settings_action_row_button_v1"') &&
    closureBatchSource.includes('settingsActionRowButtonVisibleCount<4') &&
    closureBatchSource.includes('settingsActionRowClickedActionId!=display_font_plus') &&
    closureBatchSource.includes('world_open_main_city_settings_audio_quiet') &&
    closureBatchSource.includes('settingsActionRowClickedActionId!=audio_preset_quiet') &&
    closureBatchSource.includes('world_open_main_city_settings_notice_all') &&
    closureBatchSource.includes('world_open_main_city_settings_notice_focus') &&
    closureBatchSource.includes('world_open_main_city_settings_notice_quiet') &&
    closureBatchSource.includes('world_open_main_city_settings_notice_reset') &&
    closureBatchSource.includes('world_open_main_city_settings_account_open') &&
    closureBatchSource.includes('world_open_main_city_settings_account_copy_id') &&
    closureBatchSource.includes('world_open_main_city_settings_account_privacy') &&
    closureBatchSource.includes('world_open_main_city_settings_account_clear_cache') &&
    closureBatchSource.includes('"world_open_main_city_settings_notice_reset": ("notice_level_reset", "恢复默认")'),
  'closure batch must validate settings action row governance and display/audio/notice click closures',
)
assert.ok(
  snapshotSectionPageSource.includes('button.name = "SettingsActionRowButton_%s" % action_id') &&
    visualSmokeSource.includes('"world_open_main_city_settings_account_copy_id_button_identity"') &&
    mainSource.includes('"world_open_main_city_settings_account_copy_id_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_settings_action_row_button_identity("account", "account_copy_id", "SettingsActionRowButton_account_copy_id")') &&
    mainSource.includes('"settingsActionRowClickedButtonName": clicked_button_name') &&
    closureBatchSource.includes('SETTINGS_ACTION_ROW_BUTTON_IDENTITY_ACTIONS = {') &&
    closureBatchSource.includes('"world_open_main_city_settings_account_copy_id_button_identity": ("account", "account_copy_id", SETTINGS_ACTION_ROW_BUTTON_TOKEN, "SettingsActionRowButton_account_copy_id")') &&
    closureBatchSource.includes('settingsActionRowIdentityOnly!=true') &&
    closureBatchSource.includes('settingsActionRowClickedButtonName!=') &&
    closureBatchSource.includes('settingsActionRowClickVerified!=true'),
  'settings account copy action must expose and validate the real action-row Button identity without settings layout/data gates',
)
assert.ok(
  visualSmokeSource.includes('"world_open_main_city_settings_account_privacy_button_identity"') &&
    mainSource.includes('"world_open_main_city_settings_account_privacy_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_settings_action_row_button_identity("account", "account_privacy", "SettingsActionRowButton_account_privacy")') &&
    closureBatchSource.includes('"world_open_main_city_settings_account_privacy_button_identity": ("account", "account_privacy", SETTINGS_ACTION_ROW_BUTTON_TOKEN, "SettingsActionRowButton_account_privacy")') &&
    closureBatchSource.includes('settingsActionRowIdentityOnly!=true') &&
    closureBatchSource.includes('settingsActionRowClickedButtonName!=') &&
    closureBatchSource.includes('settingsActionRowClickVerified!=true'),
  'settings account privacy action must reuse the real action-row Button identity closure without settings layout/data gates',
)
assert.ok(
  visualSmokeSource.includes('"world_open_main_city_settings_account_clear_cache_button_identity"') &&
    mainSource.includes('"world_open_main_city_settings_account_clear_cache_button_identity"') &&
    mainSource.includes('_press_mainline_visual_smoke_settings_action_row_button_identity("account", "account_clear_cache", "SettingsActionRowButton_account_clear_cache")') &&
    closureBatchSource.includes('"world_open_main_city_settings_account_clear_cache_button_identity": ("account", "account_clear_cache", SETTINGS_ACTION_ROW_BUTTON_TOKEN, "SettingsActionRowButton_account_clear_cache")') &&
    closureBatchSource.includes('settingsActionRowIdentityOnly!=true') &&
    closureBatchSource.includes('settingsActionRowClickedButtonName!=') &&
    closureBatchSource.includes('settingsActionRowClickVerified!=true'),
  'settings account clear-cache action must reuse the real action-row Button identity closure without settings layout/data gates',
)
assert.ok(
  mainSource.includes('"world_open_main_city_settings_account_copy_id"') &&
    mainSource.includes('_press_mainline_visual_smoke_settings_action("account", "account_copy_id")') &&
    mainSource.includes('_press_mainline_visual_smoke_settings_action("account", "account_privacy")') &&
    mainSource.includes('_press_mainline_visual_smoke_settings_action("account", "account_clear_cache")') &&
    visualSmokeSource.includes('"world_open_main_city_settings_account_copy_id"') &&
    visualSmokeSource.includes('"world_open_main_city_settings_account_privacy"') &&
    visualSmokeSource.includes('"world_open_main_city_settings_account_clear_cache"') &&
    closureBatchSource.includes('"world_open_main_city_settings_account_copy_id": ("account_copy_id", "复制编号")') &&
    closureBatchSource.includes('"world_open_main_city_settings_account_privacy": ("account_privacy", "隐私说明")') &&
    closureBatchSource.includes('"world_open_main_city_settings_account_clear_cache": ("account_clear_cache", "清理缓存")'),
  'settings account action row buttons must expose formal click closure for real enabled account actions',
)

for (const label of ['视频', '说话', '发送', '更早']) {
  assert.ok(mainChatOverlaySource.includes(`"${label}"`), `chat overlay must keep live button text ${label}`)
}
for (const nodeName of ['ChatVideoCommandButton', 'ChatVoiceTextCommandButton', 'ChatSendCommandButton', 'ChatLoadEarlierButton']) {
  assert.ok(mainChatOverlaySource.includes(nodeName), `chat overlay must keep real ${nodeName}`)
}
assert.ok(
  mainChatOverlaySource.includes('button.set_meta("chat_paper_action_command_bg_token", UI_COMPONENT_FACTORY.CHAT_PAPER_ACTION_COMMAND_BG_TOKEN)'),
  'chat paper action buttons must expose governance token metadata',
)
assert.ok(
  mainChatOverlaySource.includes('const CHAT_COMMAND_CHROME_TOKEN := "chat_command_chrome_v1"') &&
    mainChatOverlaySource.includes('chat_panel.set_meta("chat_chrome_unification_token", CHAT_COMMAND_CHROME_TOKEN)') &&
    mainChatOverlaySource.includes('rail.set_meta("chat_chrome_unification_token", CHAT_COMMAND_CHROME_TOKEN)') &&
    mainChatOverlaySource.includes('scroll.set_meta("chat_chrome_unification_token", CHAT_COMMAND_CHROME_TOKEN)') &&
    mainChatOverlaySource.includes('composer.set_meta("chat_chrome_unification_token", CHAT_COMMAND_CHROME_TOKEN)') &&
    mainChatOverlaySource.includes('"chatChromeUnificationToken": CHAT_COMMAND_CHROME_TOKEN') &&
    mainChatOverlaySource.includes('"chatChromeUnificationOk"'),
  'chat overlay must expose a unified command chrome token across panel, rail, message history, and composer',
)
assert.ok(
  mainChatOverlaySource.includes('summary[str(key_variant)] = history_filter_summary[key_variant]') &&
    mainChatOverlaySource.includes('"chatHistoryFilterCommandTokenOk"'),
  'chat overlay visual smoke summary must expose history filter command token status',
)
assert.ok(
  closureBatchSource.includes('chatComposerCommandTokenOk') &&
    closureBatchSource.includes('chatHistoryFilterCommandTokenOk') &&
    closureBatchSource.includes('chatChromeUnificationOk'),
  'closure batch must validate chat composer/history filter button and unified chrome governance',
)
assert.ok(
  nativeShellSource.includes('const SHELL_COMMAND_CHROME_TOKEN := "shell_command_chrome_v1"') &&
    nativeShellSource.includes('_bottom_nav_panel.set_meta("shell_command_chrome_token", SHELL_COMMAND_CHROME_TOKEN)') &&
    nativeShellSource.includes('button.set_meta("shell_command_chrome_token", SHELL_COMMAND_CHROME_TOKEN)') &&
    nativeShellSource.includes('"shellCommandChromeToken": SHELL_COMMAND_CHROME_TOKEN') &&
    nativeShellSource.includes('"shellCommandChromeOk"') &&
    mainSource.includes('"shellCommandChromeOk": bool(nav_summary.get("shellCommandChromeOk", false))') &&
    closureBatchSource.includes('shellCommandChromeOk!=true'),
  'shell bottom nav must expose unified command chrome token through runtime summary and closure batch validation',
)

for (const token of [
  'main_city_world_anchor_entry_popover_v1',
  'main_city_world_asset_entry_button_v1',
  'main_city_world_asset_enter_camera_push_v1',
  'main_city_world_asset_camera_ease_v2',
  'main_city_enter_transition_mask_v1',
  'main_city_entered_space_stage_layout_v2',
  'main_city_gatehouse_axis_mansion_transition_v1',
  'main_city_mansion_highlight_focus_v1',
  'main_city_scene_entry_button_v1',
  'main_city_scene_entry_live_text_v1',
  'main_city_scene_return_button_v1',
  'main_city_scene_return_live_text_v1',
]) {
  assert.ok(mainCityHubOverlaySource.includes(token), `main city world entry must expose ${token}`)
  assert.ok(
    closureBatchSource.includes(token) ||
      (token === 'main_city_world_asset_camera_ease_v2' && mapGridSource.includes(token)),
    `closure batch must validate ${token}`,
  )
}
assert.ok(
  mapGridSource.includes('create_tween()') &&
    mapGridSource.includes('TRANS_SINE') &&
    mapGridSource.includes('EASE_IN_OUT') &&
    mapGridSource.includes('main_city_world_asset_camera_ease_v2'),
  'main city asset enter must use a real camera easing path instead of an immediate zoom jump',
)
assert.ok(
  mainCityHubOverlaySource.includes('MainCityEnterTransitionMask') &&
    mainCityHubOverlaySource.includes('_play_main_city_enter_transition_mask') &&
    mainCityHubOverlaySource.includes('main_city_enter_transition_mask_v1'),
  'entering main city must play a transition mask before showing the city space',
)
assert.ok(
  mainCityHubOverlaySource.includes('MainCityEnteredSpaceStage') &&
    mainCityHubOverlaySource.includes('main_city_entered_space_stage_layout_v2') &&
    mainCityHubOverlaySource.includes('MainCitySceneSpatialEntryDock') &&
    mainCityHubOverlaySource.includes('MainCitySceneGatehouseTransitionLayer') &&
    mainCityHubOverlaySource.includes('MainCitySceneCentralAxisLine') &&
    mainCityHubOverlaySource.includes('MainCitySceneMansionHighlight'),
  'entered main-city hub must present a staged city space, not a generic modal grid',
)
assert.ok(
  mainCityHubOverlaySource.includes('button.set_meta("main_city_scene_entry_button_token", MAIN_CITY_SCENE_ENTRY_BUTTON_TOKEN)') &&
    mainCityHubOverlaySource.includes('button.set_meta("main_city_scene_entry_action_id", "main_city_scene_entry:%s" % tab_id)') &&
    mainCityHubOverlaySource.includes('button.set_meta("main_city_scene_entry_live_text_contract", MAIN_CITY_SCENE_ENTRY_LIVE_TEXT_CONTRACT)') &&
    mainSource.includes('"world_click_main_city_asset_enter_hub_troop_entry"') &&
    mainSource.includes('"world_click_main_city_asset_enter_hub_building_tree_entry"') &&
    mainSource.includes('mainCitySceneEntryButtonClickedActionId') &&
    visualSmokeSource.includes('"world_click_main_city_asset_enter_hub_troop_entry"') &&
    visualSmokeSource.includes('"world_click_main_city_asset_enter_hub_building_tree_entry"') &&
    closureBatchSource.includes('MAIN_CITY_SCENE_ENTRY_BUTTON_CLICK_CONTRACT_ACTIONS') &&
    closureBatchSource.includes('mainCitySceneEntryButtonClickVerified!=true'),
  'entered main-city troop/building-tree buttons must be real live-text Buttons with tokenized closure evidence',
)
assert.ok(
  mainCityHubOverlaySource.includes('stage_return_button.set_meta("main_city_scene_return_button_token", MAIN_CITY_SCENE_RETURN_BUTTON_TOKEN)') &&
    mainCityHubOverlaySource.includes('stage_return_button.set_meta("main_city_scene_return_action_id", "main_city_scene_return_map")') &&
    mainCityHubOverlaySource.includes('stage_return_button.set_meta("main_city_scene_return_live_text_contract", MAIN_CITY_SCENE_RETURN_LIVE_TEXT_CONTRACT)') &&
    mainCityHubOverlaySource.includes('const CLOSE_BACK_BUTTON_SPEC_TOKEN := "close_back_button_spec_v1"') &&
    mainCityHubOverlaySource.includes('stage_return_button.set_meta("close_back_button_spec_token", CLOSE_BACK_BUTTON_SPEC_TOKEN)') &&
    mainCityHubOverlaySource.includes('stage_return_button.set_meta("close_back_button_role", "return_map")') &&
    mainCityHubOverlaySource.includes('stage_return_button.set_meta("close_back_button_variant", "neutral")') &&
    mainCityHubOverlaySource.includes('"hubSceneReturnCloseBackSpecToken": CLOSE_BACK_BUTTON_SPEC_TOKEN') &&
    mainSource.includes('"world_click_main_city_asset_enter_hub_return_map"') &&
    mainSource.includes('mainCitySceneReturnButtonClickedActionId') &&
    visualSmokeSource.includes('"world_click_main_city_asset_enter_hub_return_map"') &&
    closureBatchSource.includes('MAIN_CITY_SCENE_RETURN_BUTTON_CLICK_CONTRACT_ACTIONS') &&
    closureBatchSource.includes('hubSceneReturnCloseBackSpecToken!=close_back_button_spec_v1') &&
    closureBatchSource.includes('mainCitySceneReturnButtonClickVerified!=true'),
  'entered main-city return-map button must be a real live-text Button with shared close/back neutral return-map spec metadata',
)
assert.ok(
  mainCityHubOverlaySource.includes('MAIN_CITY_CONTEXT_RETURN_BUTTON_TOKEN := "main_city_context_return_button_v1"') &&
    mainCityHubOverlaySource.includes('MAIN_CITY_CONTEXT_RETURN_LIVE_TEXT_CONTRACT := "main_city_context_return_live_text_v1"') &&
    mainCityHubOverlaySource.includes('close_button.name = "MainCityContextReturnMapButton"') &&
    mainCityHubOverlaySource.includes('close_button.set_meta("main_city_context_return_button_token", MAIN_CITY_CONTEXT_RETURN_BUTTON_TOKEN)') &&
    mainCityHubOverlaySource.includes('close_button.set_meta("main_city_context_return_action_id", "main_city_context_return_map")') &&
    mainCityHubOverlaySource.includes('close_button.set_meta("main_city_context_return_live_text_contract", MAIN_CITY_CONTEXT_RETURN_LIVE_TEXT_CONTRACT)') &&
    mainCityHubOverlaySource.includes('close_button.set_meta("main_city_context_return_live_text_label", "返回地图")') &&
    mainSource.includes('"world_click_main_city_node_context_return_map_button_identity"') &&
    mainSource.includes('mainCityContextReturnButtonClickedActionId') &&
    mainSource.includes('mainCityContextReturnButtonClickedToken') &&
    mainSource.includes('mainCityContextReturnButtonClickedLiveTextContract') &&
    mainSource.includes('mainCityContextReturnButtonClickVerified') &&
    visualSmokeSource.includes('"world_click_main_city_node_context_return_map_button_identity"') &&
    closureBatchSource.includes('MAIN_CITY_CONTEXT_RETURN_BUTTON_TOKEN = "main_city_context_return_button_v1"') &&
    closureBatchSource.includes('MAIN_CITY_CONTEXT_RETURN_LIVE_TEXT_CONTRACT = "main_city_context_return_live_text_v1"') &&
    closureBatchSource.includes('MAIN_CITY_CONTEXT_RETURN_BUTTON_CLICK_CONTRACT_ACTIONS') &&
    closureBatchSource.includes('mainCityContextReturnButtonClickedActionId!=main_city_context_return_map') &&
    closureBatchSource.includes('mainCityContextReturnButtonClickVerified!=true'),
  'main-city context header return-map button must be a real live-text Button with tokenized closure evidence',
)
assert.ok(
  mainCityHubOverlaySource.includes('_play_city_space_stage_transition') &&
    mainCityHubOverlaySource.includes('tween_property(city_model, "scale"') &&
    mainCityHubOverlaySource.includes('Tween.EASE_OUT'),
  'entered main-city stage must include a staged mansion transition instead of a static asset drop',
)
assert.ok(
  mainCityHubOverlaySource.includes('MainCityWorldEnterButton') &&
    mainCityHubOverlaySource.includes('button.text = "进入主城"'),
  'main city asset popover must use a real live-text enter button',
)
assert.ok(
  tianxiaMarkerVisualPolicySource.includes('MARKER_LABEL_POLISH_SPEC_TOKEN: String = "tianxia_yutu_marker_label_polish_v2"') &&
    mapGridSource.includes('"tianxiaYutuMarkerLabelPolishSpecToken": TianxiaYutuMarkerVisualPolicyScript.MARKER_LABEL_POLISH_SPEC_TOKEN') &&
    mapGridSource.includes('"tianxiaYutuMarkerLabelPolishMode": "gate_hover_selected_compact_label_v2"') &&
    mainSource.includes('var marker_label_polish_spec_token: String = str(map_summary.get("tianxiaYutuMarkerLabelPolishSpecToken", "")).strip_edges()') &&
    mainSource.includes('result["markerLabelPolishSpecToken"] = marker_label_polish_spec_token') &&
    tianxiaProductAcceptanceContractSource.includes('result["productAcceptanceMarkerLabelPolishSpecToken"] = str(compact_summary.get("tianxiaYutuMarkerLabelPolishSpecToken", "")).strip_edges()') &&
    closureBatchSource.includes('TIANXIA_YUTU_MARKER_LABEL_POLISH_SPEC_TOKEN = "tianxia_yutu_marker_label_polish_v2"') &&
    closureBatchSource.includes('markerLabelPolishSpecToken!=tianxia_yutu_marker_label_polish_v2') &&
    closureBatchSource.includes('productAcceptanceMarkerLabelPolishSpecToken!=tianxia_yutu_marker_label_polish_v2'),
  'Tianxia Yutu marker/label polish must expose v2 token through map summary, product acceptance, label-art action, and closure batch',
)
assert.ok(
  mainCityHubOverlaySource.includes('worldAnchorEntryButtonLabels') &&
    mainCityHubOverlaySource.includes('return "|".join(labels)') &&
    !mainCityHubOverlaySource.includes('MainCityWorldCoordinateJumpButton'),
  'main city asset popover must only expose the real enter button, without the old jump shortcut',
)
assert.ok(
  !mainCityHubOverlaySource.includes('stage.add_child(_build_coordinate_jump_info_card(compact))'),
  'entered main-city overview must not show the old coordinate jump card',
)
assert.ok(
  mainCityHubOverlaySource.includes('open_world_anchor_entry') &&
    mainSource.includes('open_world_anchor_entry'),
  'map asset click must open anchored world-entry popover instead of directly opening the full hub panel',
)
assert.ok(
  mainCityHubOverlaySource.includes('hubCompactEntryRole') &&
    mainCityHubOverlaySource.includes('weak_fallback_not_primary'),
  'fixed MainCityHubButton must be marked as a weak fallback, not the primary entry',
)

console.log('[mainline_ui_button_governance_contract] all checks passed')
