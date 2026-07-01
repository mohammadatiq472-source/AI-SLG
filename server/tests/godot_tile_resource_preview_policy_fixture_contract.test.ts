import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const visualSmoke = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')
const worldService = readFileSync('server/src/application/world/WorldService.ts', 'utf-8')

function assertIncludes(source: string, needle: string, message: string) {
  assert.ok(source.includes(needle), message)
}

assertIncludes(worldService, 'buildResourceTileExpeditionPreview', 'WorldService must consume F-W6 preview policy helper.')
assertIncludes(worldService, 'resourceTileExpeditionPreview', 'WorldService must attach preview readback for Godot HUD.')

assertIncludes(main, '"world_tile_action_hud_resource_preview_policy_fixture"', 'main.gd must route resource preview policy HUD action.')
assertIncludes(visualSmoke, '"world_tile_action_hud_resource_preview_policy_fixture"', 'visual smoke must whitelist resource preview policy HUD action.')

for (const field of [
  'worldTileActionHudResourcePreviewPolicyOk',
  'resourcePreviewUsesSharedDomainPolicy',
  'resourceEconomyModelVersion',
  'resourcePreviewPolicyVersion',
  'resourceLabel',
  'resourceYieldLabel',
  'captureRewardLabel',
  'recommendedPowerLabel',
  'recommendedPower',
  'guardLevel',
  'riskLabel',
  'difficultyLabel',
  'selectedTileId',
  'expeditionButtonVisible',
  'playerVisibleEngineeringCopyLeak',
  'visibleCopyForbiddenHits',
]) {
  assertIncludes(main, field, `Godot HUD summary must include ${field}.`)
  assertIncludes(visualSmoke, field, `visual smoke runner must require ${field}.`)
}

console.log('[godot_tile_resource_preview_policy_fixture_contract] all checks passed')
