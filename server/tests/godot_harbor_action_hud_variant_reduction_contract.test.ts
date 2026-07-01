import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainGd = readFileSync('godot-client/scripts/app/main.gd', 'utf8')
const runner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf8')

const ACTION = 'world_naval_harbor_deployment_readiness_fixture'

for (const requiredToken of [
  'HARBOR_ACTION_HUD_SKIN_FAMILY := "BaseActionHudSkin"',
  'HARBOR_ACTION_HUD_VARIANT := "harbor_fleet"',
  'HARBOR_ACTION_HUD_SHARED_STYLE_OWNER := "BaseActionHudSkin + main.gd harbor HUD block"',
  'HARBOR_ACTION_HUD_VISIBLE_ACTIONS := ["出港", "巡逻", "拦截"]',
]) {
  assert.ok(mainGd.includes(requiredToken), `main.gd should expose harbor Action HUD reduction token: ${requiredToken}`)
}

for (const requiredSummaryField of [
  'harborActionHudSkinFamily',
  'harborActionHudVariant',
  'harborActionHudSharedStyleOwner',
  'harborActionHudUnifiedFamilyOk',
  'harborActionHudCompactCopyOk',
  'harborActionHudVisibleActionLabels',
  'harborActionHudHiddenHeavySectionLabels',
  'harborActionHudHeavyFleetCardHidden',
  'harborActionHudUnsupportedButtonsHidden',
  'harborActionHudNoEngineeringCopyLeak',
]) {
  assert.ok(mainGd.includes(requiredSummaryField), `main.gd should report harbor Action HUD reduction field: ${requiredSummaryField}`)
  assert.ok(runner.includes(requiredSummaryField), `visual-smoke runner should require harbor Action HUD field for ${ACTION}: ${requiredSummaryField}`)
}

assert.ok(mainGd.includes('compact_copy_labels.has("港口库存")'), 'main.gd should explicitly reject 港口库存 as compact visible copy.')
assert.ok(mainGd.includes('compact_copy_labels.has("舰队")'), 'main.gd should explicitly reject heavy fleet-card title copy.')
assert.ok(mainGd.includes('not compact_action_labels.has("整补")'), 'main.gd should hide unsupported 整补 from the compact harbor Action HUD.')
assert.ok(mainGd.includes('not compact_action_labels.has("待命")'), 'main.gd should hide unsupported 待命 from the compact harbor Action HUD.')
assert.ok(mainGd.includes('fleet_card.name = "HarborActionHudInfoCard"'), 'harbor HUD should reduce the old fleet-management card into an Action HUD info card.')
assert.ok(!mainGd.includes('fleet_title.text = "舰队"'), 'harbor HUD should not show the old heavy 舰队 section title.')

for (const runnerFailure of [
  'harborActionHudUnifiedFamilyOk!=true',
  'harborActionHudCompactCopyOk!=true',
  'harborActionHudHeavyFleetCardHidden!=true',
  'harborActionHudUnsupportedButtonsHidden!=true',
]) {
  assert.ok(runner.includes(runnerFailure), `visual-smoke runner should fail harbor HUD reduction issue: ${runnerFailure}`)
}

console.log('[godot_harbor_action_hud_variant_reduction_contract] all checks passed')
