import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const smokeRunner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

const actionId = 'world_open_main_city_organization_nation_midgame_realm_objective_bridge'

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"`),
  'Visual smoke runner must whitelist the D-W6 realm objective bridge action.',
)

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"[\\s\\S]*"required_summary_fields"[\\s\\S]*"nationMidgameRealmObjectiveBridgeOk"[\\s\\S]*"realmObjectiveProgressId"[\\s\\S]*"kingdomObjectivePrerequisiteVisible"[\\s\\S]*"empireObjectivePrerequisiteVisible"[\\s\\S]*"nationMidgameRealmObjectiveBridgeScope"`),
  'D-W6 runner defaults must require realm-objective bridge fields.',
)

for (const requiredToken of [
  'NATION_MIDGAME_HUD_COMPONENT_SKIN_TOKEN',
  'NATION_MIDGAME_HUD_STYLE_OWNER',
  'NationMidgameRealmObjectiveSurface',
  'NationMidgameRealmObjectiveCardSkin',
  'NationMidgameRealmObjectiveKingdomChip',
  'NationMidgameRealmObjectiveEmpireChip',
  'NationMidgameRealmObjectiveButtonFortifyLuoyang',
  'NationMidgameRealmObjectiveButtonPrepareKingdom',
  'NATION_MIDGAME_ACTION_HUD_SKIN_FAMILY',
  'NATION_MIDGAME_ACTION_HUD_VARIANT',
  '_show_nation_midgame_realm_objective_hud',
  '_make_nation_midgame_hud_panel_skin_style',
  '_make_nation_midgame_hud_card_skin_style',
  '_make_nation_midgame_hud_state_chip',
  '_apply_nation_midgame_hud_action_button_skin',
]) {
  assert.ok(main.includes(requiredToken), `D-W6 HUD parity must expose ${requiredToken}.`)
}

for (const requiredSummaryField of [
  'nationMidgameHudVisualSkinOk',
  'nationMidgameHudPanelSkinVisible',
  'nationMidgameHudTargetCardVisible',
  'nationMidgameHudStateChipCount',
  'nationMidgameHudActionButtonSkinStateOk',
  'nationMidgameHudNoEngineeringCopyLeak',
  'nationMidgameHudStyleOwner',
  'nationMidgameHudComponentSkinToken',
  'nationMidgameHudRealButtonNodeNames',
  'nationMidgameHudSurfaceNodeName',
  'nationMidgameHudVisualSkinScope',
  'nationMidgameActionHudSkinFamily',
  'nationMidgameActionHudVariant',
  'nationMidgameActionHudSharedStyleOwner',
  'nationMidgameActionHudBackplateToken',
  'nationMidgameActionHudPrimaryButtonToken',
  'nationMidgameActionHudUnifiedFamilyOk',
  'nationMidgameLegacyActionPanelHidden',
  'nationMidgameLegacyActionPanelNodePath',
  'nationMidgameLegacyActionPanelButtonNodeNames',
]) {
  assert.ok(main.includes(requiredSummaryField), `main.gd must report D-W6 HUD parity summary field: ${requiredSummaryField}`)
  assert.ok(smokeRunner.includes(requiredSummaryField), `visual-smoke runner must require D-W6 HUD parity field: ${requiredSummaryField}`)
}

for (const sharedActionHudToken of [
  'SlgUiComponentFactoryScript.make_land_tile_action_hud_panel_style()',
  'SlgUiComponentFactoryScript.apply_land_tile_action_hud_primary_button_style(button)',
  'SlgUiComponentFactoryScript.land_tile_action_hud_art_owner()',
  'SlgUiComponentFactoryScript.land_tile_action_hud_backplate_token()',
  'SlgUiComponentFactoryScript.land_tile_action_hud_primary_button_token()',
  'nation_midgame_realm_objective',
  'BaseActionHudSkin',
]) {
  assert.ok(main.includes(sharedActionHudToken), `D-W6 HUD must be a unified Action HUD nation variant via ${sharedActionHudToken}.`)
}

for (const legacyNodeToken of [
  'UiLayer/MainMapCellActionRoot/MainMapCellActionPanel',
  'ClaimCellButton',
  'ReleaseCellButton',
  'MarkFrontlineButton',
  'routeTargetSource", "")).strip_edges() == "nation_midgame_realm_objective_bridge"',
]) {
  assert.ok(main.includes(legacyNodeToken), `D-W6 must identify and hide the legacy map action HUD node: ${legacyNodeToken}.`)
}

assert.match(
  main,
  new RegExp(`"${actionId}"[\\s\\S]*_press_mainline_visual_smoke_nation_midgame_realm_objective_bridge\\(`),
  'Mainline visual smoke must dispatch D-W6 to a dedicated realm-objective bridge helper.',
)

assert.match(
  main,
  /func _press_mainline_visual_smoke_nation_midgame_realm_objective_bridge\(\) -> Dictionary:[\s\S]*_press_mainline_visual_smoke_nation_midgame_luoyang_control_authority\(\)[\s\S]*recordNationMidgameRealmObjectiveBridge[\s\S]*sourceControlAuthorityId[\s\S]*sourceLuoyangControlProgressId[\s\S]*realmObjectiveProgressId/,
  'D-W6 must reuse D-W5 control progress and issue the backend realm-objective bridge action.',
)

assert.match(
  main,
  /王国目标[\s\S]*帝国目标[\s\S]*巩固洛阳[\s\S]*准备称王/,
  'D-W6 must render short Chinese player-visible realm objective bridge copy.',
)

assert.match(
  main,
  /kingdomObjectivePrerequisiteVisible[\s\S]*empireObjectivePrerequisiteVisible[\s\S]*usesOrganizationNationSurface[\s\S]*feedbackVisible[\s\S]*visibleCopyForbiddenHits[\s\S]*playerVisibleEngineeringCopyLeak[\s\S]*realm_objective_bridge_only_not_full_kingdom_empire_creation/,
  'D-W6 summary must prove realm prerequisite visibility, surface reuse, visible-copy guard, and narrow scope.',
)

assert.match(
  main,
  /"tier"[\s\S]*"contract"[\s\S]*"read model"[\s\S]*"authority"[\s\S]*"neutral"[\s\S]*"v0"/,
  'D-W6 visible-copy guard must still reject known engineering words.',
)

console.log('[godot_nation_midgame_realm_objective_bridge_fixture_contract] all checks passed')
