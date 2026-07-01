import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainGd = readFileSync('godot-client/scripts/app/main.gd', 'utf8')
const runner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf8')

const ACTION = 'world_naval_harbor_deployment_readiness_fixture'

for (const requiredToken of [
  'HARBOR_HUD_COMPONENT_SKIN_TOKEN',
  'HARBOR_HUD_STYLE_OWNER',
  '_make_harbor_hud_panel_skin_style',
  '_make_harbor_hud_fleet_card_skin_style',
  '_make_harbor_hud_state_chip_style',
  '_apply_harbor_hud_action_button_skin',
  'HarborHudPanelSkin',
  'HarborHudFleetCardSkin',
  'HarborFleetShipIcon',
  'HarborFleetRepairStateIcon',
  'HarborFleetRiskStateBadge',
]) {
  assert.ok(mainGd.includes(requiredToken), `main.gd should expose harbor HUD component skin token: ${requiredToken}`)
}

for (const requiredSummaryField of [
  'harborHudVisualSkinOk',
  'harborHudPanelSkinVisible',
  'harborHudFleetCardSkinVisible',
  'harborHudShipIconVisible',
  'harborHudRepairStateIconVisible',
  'harborHudRiskStateVisualVisible',
  'harborHudActionButtonSkinStateOk',
  'harborHudNoBakedTextInAssets',
  'harborHudNoEngineeringCopyLeak',
  'harborHudStyleOwner',
  'harborHudComponentSkinToken',
  'harborHudRealButtonNodeNames',
  'harborHudVisualSkinScope',
]) {
  assert.ok(mainGd.includes(requiredSummaryField), `main.gd should report harbor HUD skin summary field: ${requiredSummaryField}`)
  assert.ok(runner.includes(requiredSummaryField), `visual-smoke runner should require harbor HUD skin field for ${ACTION}: ${requiredSummaryField}`)
}

assert.ok(mainGd.includes('add_theme_stylebox_override("panel", _make_harbor_hud_panel_skin_style())'), 'harbor popup should use a visible panel skin')
assert.ok(mainGd.includes('add_theme_stylebox_override("panel", _make_harbor_hud_fleet_card_skin_style())'), 'fleet card should use a visible component skin')
assert.ok(mainGd.includes('button.add_theme_stylebox_override("normal"'), 'real Button nodes should receive component skin states')
assert.ok(mainGd.includes('button.add_theme_stylebox_override("pressed"'), 'real Button nodes should expose pressed skin state')
assert.ok(mainGd.includes('button.add_theme_stylebox_override("disabled"'), 'real Button nodes should expose disabled skin state')
assert.ok(!mainGd.includes('HarborHudFullPortEconomyPage'), 'C-W skin slice must not add full harbor economy UI')
assert.ok(!mainGd.includes('HarborHudBakedPageTexture'), 'C-W skin slice must not bake the whole page as an image')

console.log('[godot_harbor_hud_component_skin_contract] all checks passed')
