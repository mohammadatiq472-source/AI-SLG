import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const mapGrid = readFileSync('godot-client/scripts/map/map_grid.gd', 'utf-8')
const visualSmoke = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')
const closureBatch = readFileSync('godot-client/tools/run_mainline_ui_closure_batch.py', 'utf-8')
const worldService = readFileSync('server/src/application/world/WorldService.ts', 'utf-8')
const worldRoutes = readFileSync('server/src/routes/world.ts', 'utf-8')
const worldContract = readFileSync('shared/contracts/game/world.ts', 'utf-8')
const worldSchema = readFileSync('shared/schemas/worldAction.ts', 'utf-8')

function assertIncludes(source: string, needle: string, message: string) {
  assert.ok(source.includes(needle), message)
}

for (const action of [
  'world_tile_action_hud_production_resource_fixture',
  'world_tile_expedition_production_resource_settlement_fixture',
  'world_tile_action_hud_zero_level_substrate_fixture',
]) {
  assertIncludes(main, `"${action}"`, `main.gd must route ${action}.`)
  assertIncludes(visualSmoke, `"${action}"`, `visual smoke runner must whitelist ${action}.`)
}

assertIncludes(
  closureBatch,
  'world_tile_expedition_production_resource_settlement_fixture',
  'closure batch must support production resource expedition action.',
)

for (const token of [
  'seedProductionResourceTileActionHudFixture',
  'seedZeroLevelSubstrateTileActionHudFixture',
  'seedProductionResourceTileActionHudFixtureAction',
  'seedZeroLevelSubstrateTileActionHudFixtureAction',
]) {
  assertIncludes(worldContract + worldSchema + worldService + worldRoutes, token, `backend contract must expose ${token}.`)
}

for (const field of [
  'worldTileProductionResourceHudOk',
  'worldTileProductionResourceScope',
  'ordinary_l1_l9_resource_tile_not_fixture_seed_only',
  'selectedTileId',
  'tileLevel',
  'resourceKind',
  'tileCoordinateLabel',
  'resourceYieldLabel',
  'captureRewardLabel',
  'defenderStrengthLabel',
  'defenderTroopCount',
  'recommendedPowerLabel',
  'recommendedPower',
  'resourcePreviewUsesSharedDomainPolicy',
  'expeditionButtonVisible',
  'settlementReceiptId',
  'battleReportId',
  'resourceDelta',
  'feedbackVisible',
  'playerVisibleEngineeringCopyLeak',
  'visibleCopyForbiddenHits',
]) {
  assertIncludes(main, field, `production resource summary must include ${field}.`)
  assertIncludes(visualSmoke, field, `visual smoke runner must require ${field}.`)
}

assertIncludes(main, '每小时', 'production HUD presenter should render hourly yield copy from preview policy.')
assertIncludes(main, '占领奖励', 'production HUD presenter should render capture reward copy from preview policy.')
assertIncludes(main, '推荐战力', 'production HUD presenter should render recommended power copy from preview policy.')

for (const field of [
  'worldTileZeroLevelSubstrateHudOk',
  'worldTileZeroLevelSubstrateScope',
  'zero_level_substrate_not_l10_missing_tile',
  'zeroLevelSubstrateHasResourceYield',
  'zeroLevelSubstrateHasResourceGuard',
  'zeroLevelSubstrateExpeditionRewardBlocked',
]) {
  assertIncludes(main + mapGrid + visualSmoke, field, `L0 substrate proof must include ${field}.`)
}

for (const protectedField of [
  'world_naval_fleet_damage_repair_fixture',
  'world_naval_inventory_fleet_combat_damage_repair_fixture',
  'worldNavalFleetDamageRepairUsesSharedCombatFeedback',
  'worldNavalFleetDamageRepairUiScope',
  'worldNavalCombatDamageRepairUsesSharedCombatFeedback',
  'worldNavalCombatDamageRepairUiScope',
]) {
  assertIncludes(main + visualSmoke, protectedField, `B-W18/B-W21/B-W22 protected field/action missing: ${protectedField}.`)
}

console.log('[godot_tile_production_resource_generalization_contract] all checks passed')
