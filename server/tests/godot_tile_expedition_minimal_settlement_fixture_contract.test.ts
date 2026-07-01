import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const visualSmoke = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')
const closureBatch = readFileSync('godot-client/tools/run_mainline_ui_closure_batch.py', 'utf-8')

function assertIncludes(source: string, needle: string, message: string) {
  assert.ok(source.includes(needle), message)
}

for (const action of ['world_tile_action_hud_open_fixture', 'world_tile_expedition_minimal_settlement_fixture']) {
  assertIncludes(main, `"${action}"`, `main.gd must route ${action}.`)
  assertIncludes(visualSmoke, `"${action}"`, `visual smoke runner must whitelist ${action}.`)
}

assertIncludes(closureBatch, 'world_tile_expedition_minimal_settlement_fixture', 'closure batch must support tile expedition settlement action.')
assertIncludes(main, '_press_mainline_visual_smoke_world_tile_action_hud_open_fixture', 'main.gd must implement tile HUD open fixture.')
assertIncludes(main, '_press_mainline_visual_smoke_world_tile_expedition_minimal_settlement_fixture', 'main.gd must implement tile expedition settlement fixture.')
assertIncludes(main, '_execute_world_tile_expedition_minimal_settlement', 'main.gd must execute backend occupyTile for the expedition fixture.')

for (const field of [
  'worldTileActionHudOpenOk',
  'worldTileExpeditionMinimalSettlementOk',
  'tileId',
  'tileLevel',
  'tileCoordinateLabel',
  'resourceYieldLabel',
  'defenderStrengthLabel',
  'defenderTroopCount',
  'expeditionButtonVisible',
  'settlementReceiptId',
  'battleReportId',
  'resourceDelta',
  'taskProgressDelta',
  'battleRecordReadback',
  'feedbackVisible',
  'playerVisibleEngineeringCopyLeak',
  'visibleCopyForbiddenHits',
  'resourceHudProtectedFootprintVetoOk',
  'tileActionHudFixtureAvoidsLuoyangCoordinate',
  'tileActionHudResourceContextPolicy',
]) {
  assertIncludes(main, field, `tile expedition summary must include ${field}.`)
  assertIncludes(visualSmoke, field, `visual smoke runner must require ${field}.`)
}

console.log('[godot_tile_expedition_minimal_settlement_fixture_contract] all checks passed')
