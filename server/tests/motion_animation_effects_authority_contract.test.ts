import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

const motionAuthority = read('docs/PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md')
const productIndex = read('docs/PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md')
const frontendAuthority = read('docs/PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md')
const oldAnimationBacklog = read('docs/动画需求完整清单_2026_05_12.md')
const componentFactory = read('godot-client/scripts/ui/slg_ui_component_factory.gd')
const battleReportDetail = read('godot-client/scripts/ui/battle_report_detail_page.gd')
const unitMarker = read('godot-client/scripts/map/unit_marker.gd')

assert.ok(
  productIndex.includes('PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md'),
  'product index should include motion / animation / effects authority in read order and required subdocs',
)
assert.ok(
  productIndex.includes('Modeling Status Dashboard') &&
    productIndex.includes('| Motion/animation/effects | modeled with inventory and packets | partial |') &&
    productIndex.includes('| Frontend/UI/art | modeled | partial by accepted smoke |') &&
    productIndex.includes('| Player history/replay/save UI | modeled with executable packets | partial |'),
  'product index should summarize motion, frontend, and player-history modeling status without claiming completion',
)
assert.ok(
  frontendAuthority.includes('PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md'),
  'frontend authority should route motion work to motion authority',
)

for (const family of [
  'Global boot / return',
  'Navigation / panel transitions',
  'Main city / domestic economy',
  'World map / territory',
  'Combat / battle report / replay',
  'AI-player activity',
  'Organization / diplomacy / Court',
  'History / timeline / save-load',
  'Notifications / urgency',
  'Commercial polish / celebration',
]) {
  assert.ok(motionAuthority.includes(`| ${family} |`), `motion authority should define ${family}`)
}

for (const priority of ['P0', 'P1', 'P2', 'P3']) {
  assert.ok(motionAuthority.includes(`| ${priority} |`), `motion authority should define ${priority} priority tier`)
}

for (const matrixTerm of [
  'Landscape 2D SLG Motion Matrix',
  'Actionable Motion Backlog',
  'Production Slice Order',
  'Animation Grammar Rules',
  'Full Landscape 2D SLG Animation / Effects Inventory',
  'Animation State Packet Template',
  'Executable Motion Acceptance Queue',
  'P0 Motion Acceptance Matrix',
  'Legacy Godot / Module Evidence Handling',
  '`world_map_focus_motion_contract` Minimum Matrix',
  '`world_territory_resource_motion_contract` Minimum Matrix',
  '`combat_action_effects_motion_contract` Minimum Matrix',
  '`main_city_economy_feedback_motion_contract` Minimum Matrix',
  '`organization_diplomacy_motion_contract` Minimum Matrix',
  '`court_decision_world_effect_motion_contract` Minimum Matrix',
  'first world reveal',
  'reconnect pulse',
  'Map-to-city',
  'troop march',
  'Path preview',
  'occupation color sweep',
  'tax/resource intake',
  'Tax intake stream',
  'action-frame inspection',
  'Timeline scrub',
  'AI alliance action marker',
  'decision seal',
  'restore risk',
  'rate-limited',
  'unification',
  'Commercial ceremony',
]) {
  assert.ok(motionAuthority.includes(matrixTerm), `motion authority should model ${matrixTerm}`)
}
for (const inventoryFamily of [
  'boot_return_sequence',
  'shell_navigation_system',
  'map_camera_and_focus',
  'world_unit_motion',
  'route_and_mobility_fx',
  'territory_resource_fx',
  'main_city_economy_fx',
  'combat_action_fx',
  'replay_inspection_motion',
  'ai_activity_fx',
  'organization_diplomacy_fx',
  'court_governance_fx',
  'history_timeline_fx',
  'save_load_restore_fx',
  'notification_attention_fx',
  'ambient_world_life',
  'rare_ceremony_sequence',
]) {
  assert.ok(motionAuthority.includes(`| \`${inventoryFamily}\` |`), `motion inventory should define ${inventoryFamily}`)
}
for (const templateField of [
  'packetId',
  'owner',
  'trigger',
  'beforeState',
  'afterState',
  'motionGrammar',
  'durationBudget',
  'controlsPreserved',
  'performanceGuard',
  'proofToken',
  'visualProof',
  'historyAnchor',
  'forbiddenVisibleTextCheck',
]) {
  assert.ok(motionAuthority.includes(`| \`${templateField}\` |`), `motion packet template should require ${templateField}`)
}
for (const executablePacket of [
  'godot_boot_return_motion_contract',
  'mainline_shell_navigation_motion_contract',
  'world_map_focus_motion_contract',
  'world_troop_march_result_motion_contract',
  'world_territory_resource_motion_contract',
  'main_city_economy_feedback_motion_contract',
  'combat_action_effects_motion_contract',
  'organization_diplomacy_motion_contract',
  'court_decision_world_effect_motion_contract',
  'ai_activity_motion_feedback_contract',
  'player_history_save_restore_motion_contract',
  'player_notification_motion_rate_limit_contract',
  'rare_ceremony_motion_contract',
]) {
  assert.ok(motionAuthority.includes(`| \`${executablePacket}\` |`), `motion executable queue should define ${executablePacket}`)
}

for (const nextContract of [
  'godot_boot_return_motion_contract',
  'mainline_shell_navigation_motion_contract',
  'world_map_focus_motion_contract',
  'world_troop_march_motion_contract',
  'world_territory_resource_motion_contract',
  'main_city_economy_feedback_motion_contract',
  'combat_action_effects_motion_contract',
  'organization_diplomacy_motion_contract',
  'court_decision_world_effect_motion_contract',
  'ai_activity_motion_feedback_contract',
  'player_history_save_restore_motion_contract',
  'player_notification_motion_rate_limit_contract',
  'rare_ceremony_motion_contract',
  'world_troop_march_result_motion_contract',
]) {
  assert.ok(motionAuthority.includes(nextContract), `motion authority should name next contract ${nextContract}`)
}
for (const productionSlice of [
  'godot_boot_return_motion_contract',
  'mainline_shell_navigation_motion_contract',
  'world_map_focus_motion_contract',
  'world_troop_march_result_motion_contract',
  'player_history_save_restore_motion_contract',
  'rare_ceremony_motion_contract',
]) {
  assert.ok(motionAuthority.includes(`| \`${productionSlice}\` |`), `motion authority should order production slice ${productionSlice}`)
}
for (const grammarRule of [
  'state-change motion',
  'attention motion',
  'spatial motion',
  'ceremony motion',
  'ambient motion',
  'single generic tween',
]) {
  assert.ok(motionAuthority.includes(grammarRule), `motion authority should define grammar rule ${grammarRule}`)
}
for (const p0Slice of [
  'godot_boot_return_motion_contract',
  'mainline_shell_navigation_motion_contract',
  'world_map_focus_motion_contract',
  'world_troop_march_result_motion_contract',
  'world_territory_resource_motion_contract',
  'combat_action_effects_motion_contract',
  'ai_activity_motion_feedback_contract',
  'player_history_save_restore_motion_contract',
]) {
  assert.ok(motionAuthority.includes(`| \`${p0Slice}\` |`), `motion authority should define P0 slice ${p0Slice}`)
}
for (const p0StateOrProof of [
  'preparing, reconnecting, ready, blocked, retrying',
  'open, back, selected, disabled, pending',
  'selected, focused, nearby, out of range',
  'marching, arriving, intercepted, retreating, blocked',
  'gained, lost, producing, full, contested',
  'attacking, damaged, triggered, won, lost',
  'thinking, proposed, executing, recovered, reported',
  'saved, risky, restored, failed, remembered',
  'static loading label only',
  'fake baked button art',
  'debug grid or coordinate text as the only proof',
  'local prepare feedback only',
  '`godot_boot_return_motion_contract` Minimum Matrix',
  'bootReturnPreparingVisible=true',
  'bootReturnMotionToken=godot_boot_return_motion_v1',
  'bootReturnReconnectPulse=true',
  'bootReturnReadySettle=true',
  'bootReturnBlockedCopyVisible=true',
  'bootReturnRetryingFeedback=true',
  'retry button node/action id',
  'ops health panel',
  'single label in a debug overlay',
  '`mainline_shell_navigation_motion_contract` Minimum Matrix',
  '`mainline_shell_navigation_motion_contract` Formal Proof Matrix',
  'shellNavOpenMotionToken=mainline_shell_navigation_motion_v1',
  'shellNavBackMotion=true',
  'shellNavSelectedIndicator=true',
  'shellNavDisabledStateVisible=true',
  'shellNavPendingFeedback=true',
  'shellNavModalConfirmMotion=true',
  'shellChromeOwner=SlgUiComponentFactory',
  'shellNavSharedOwner=true',
  'Global shell',
  'Panel open/back',
  'Tab/rail selected',
  'Disabled/pending',
  'Modal confirm',
  'Player-copy safety',
  'map-to-panel',
  'panel-to-back',
  'worldMapFocusSelected=true',
  'worldMapFocusCameraSettle=true',
  'worldMapFocusJumpTargetSettle=true',
  'territoryGainedMotion=true',
  'resourceProducingMotion=true',
  'territoryContestedPulse=true',
  'combatOutbreakCue=true',
  'combatActionStepMotion=true',
  'combatReplaySafeMotion=true',
  'mainCityTaxCollectMotion=true',
  'mainCityBuildingUpgradeMotion=true',
  'mainCityPolicySwitchMotion=true',
  'orgDiplomacyProposalMotion=true',
  'orgDiplomacyVoteMotion=true',
  'orgDiplomacyDeclarationMotion=true',
  'courtSessionOpenMotion=true',
  'courtResolutionSealMotion=true',
  'courtAppliedWorldEffectMotion=true',
  'modal_confirm',
  'SlgUiComponentFactory',
  'page-local forked chrome',
  'real Godot Button',
  'duplicate action spam',
  'docs/modules_v2/M15.md',
  'docs/modules_v2/M12.md',
  'docs/GODOT_AI_PANEL_MOBILE_LANDSCAPE_ACCEPTANCE_2026_04_28.md',
  'docs/GODOT_BATTLE_REPORT_PANEL_SKELETON_2026_04_18.md',
  'docs/GODOT_PLAYABLE_STATE_AUDIT_2026_04_26.md',
  'docs/GODOT_PLAYABLE_INTEGRATION_READINESS_2026_04_28.md',
  'docs/GODOT_MAIN_CITY_CONTEXT_SMOKE_ACCEPTANCE_2026_04_29.md',
  'docs/GODOT_VISUAL_REPLACEMENT_EXECUTION_2026_04_10.md',
  'docs/GODOT_NATIVE_SHELL_LAYOUT_ALIGNMENT_2026_04_18.md',
  'docs/GODOT_MOBILE_LANDSCAPE_UI_TOUCH_TARGETS_2026_04_28.md',
  'docs/GODOT_ANDROID_DEBUG_EXPORT_INSTALL_GATE_2026_05_26.md',
  'docs/GODOT_VISUAL_CONTEXT_ANCHOR_2026_04_11.md',
  'docs/GODOT_SLG_UI_PHASE1_VALIDATION_2026_04_12.md',
  'docs/GODOT_UI_STRUCTURE_PROGRESS_SUMMARY_2026_04_19.md',
  'docs/GODOT_MAP_MACRO_COMPONENTS_2026_04_13.md',
  'docs/GODOT_MAP_SURFACE_SOURCE_AUDIT_2026_04_13.md',
  'docs/GODOT_MAP_SURFACE_GENERALPIC_PACK_2026_04_13.md',
  'docs/TASK_2026_04_05_GODOT_WEEK1_EXEC_CARDS.md',
  'A `PASS` in old Godot/module docs proves only that old smoke or ops route',
]) {
  assert.ok(motionAuthority.includes(p0StateOrProof), `motion authority should define P0 state/proof ${p0StateOrProof}`)
}
assert.ok(
  motionAuthority.includes('player_history_replay_interaction_motion_v1') &&
    motionAuthority.includes('narrow accepted panel slice'),
  'motion authority should record player-history replay interaction as an accepted narrow slice rather than a remaining next contract.',
)

for (const acceptanceRule of [
  'style owner',
  'does not mutate authoritative gameplay state',
  'token or summary field',
  'formal command or visual-smoke path',
  'does not block repeated play',
  'do not create opaque video overlays for interactive UI',
  'Performance is part of acceptance',
]) {
  assert.ok(motionAuthority.includes(acceptanceRule), `motion authority should require ${acceptanceRule}`)
}

assert.ok(
  oldAnimationBacklog.includes('2026-06-11 status: reference-only animation backlog') &&
    oldAnimationBacklog.includes('PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md'),
  'old animation checklist should be demoted to reference-only and route to current motion authority',
)

assert.ok(componentFactory.includes('MAINLINE_UI_MOTION_SYSTEM_TOKEN := "mainline_ui_motion_system_v1"'))
assert.ok(componentFactory.includes('static func apply_motion_page_enter('))
assert.ok(componentFactory.includes('static func apply_motion_battle_report_enter('))
assert.ok(componentFactory.includes('static func apply_motion_reward_glow('))
assert.ok(battleReportDetail.includes('apply_motion_battle_report_first_open_stamp'))
assert.ok(unitMarker.includes('AnimatedSprite2D') || unitMarker.includes('create_tween'), 'unit marker should have current motion evidence')

console.log('[motion_animation_effects_authority_contract] all checks passed')
