import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainGd = readFileSync('godot-client/scripts/app/main.gd', 'utf8')
const runner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf8')

const ACTION = 'world_naval_harbor_inventory_open_fixture'

assert.ok(mainGd.includes(`"${ACTION}"`), 'main.gd should expose the B-W23 harbor inventory open action')
assert.ok(
  mainGd.includes('func _press_mainline_visual_smoke_world_naval_harbor_inventory_open_fixture()'),
  'main.gd should implement the B-W23 harbor inventory fixture',
)
assert.ok(mainGd.includes('buildNavalWarshipAtHarbor'), 'fixture should build an inventory fleet before opening harbor')
assert.ok(mainGd.includes('openNavalHarborInventory'), 'fixture should call openNavalHarborInventory through the world action API')
assert.ok(
  mainGd.includes('"inventoryFleetId": str(build_receipt.get("inventoryFleetId", "")).strip_edges()'),
  'fixture should open the same inventory fleet produced by the shipyard build',
)
assert.ok(mainGd.includes('worldNavalHarborInventoryOpenOk'), 'fixture should report B-W23 success')
assert.ok(mainGd.includes('sourceShipyardOrderId'), 'fixture should expose source shipyard order id')
assert.ok(mainGd.includes('inventoryFleetId'), 'fixture should expose inventory fleet id')
assert.ok(mainGd.includes('harborName'), 'fixture should expose player-facing harbor name')
assert.ok(mainGd.includes('fleetCardVisible'), 'fixture should prove fleet card is visible')
assert.ok(mainGd.includes('fleetStatusLabel'), 'fixture should expose player-facing fleet status')
assert.ok(mainGd.includes('durabilityLabel'), 'fixture should expose player-facing durability')
assert.ok(mainGd.includes('harborSurfaceVisible'), 'fixture should prove a harbor surface is visible')
assert.ok(mainGd.includes('harborCopyAllowedOnlyOnHarborSurface'), 'fixture should prove naval copy is scoped to harbor surface')
assert.ok(mainGd.includes('landSurfaceNavalCopyLeak'), 'fixture should guard land-surface naval copy leaks')
assert.ok(mainGd.includes('worldNavalHarborInventoryScope'), 'fixture should report narrow B-W23 scope')
assert.ok(mainGd.includes('泉州港'), 'fixture should show a short Chinese harbor name')
assert.ok(mainGd.includes('港口库存'), 'fixture should show harbor inventory surface copy')
assert.ok(mainGd.includes('舰队'), 'fixture should show fleet copy only inside harbor surface')
assert.ok(mainGd.includes('可出港'), 'fixture should show sail-ready fleet status')
assert.ok(mainGd.includes('整补'), 'fixture should expose harbor repair/replenishment action copy')
assert.ok(mainGd.includes('出港'), 'fixture should expose harbor primary action copy')
assert.ok(!mainGd.includes('FullNavalFleetManagementPanel'), 'B-W23 must not add full fleet management UI')
assert.ok(!mainGd.includes('PortEconomyPanel'), 'B-W23 must not add full port economy UI')

for (const protectedField of [
  'world_tile_action_hud_open_fixture',
  'world_tile_expedition_minimal_settlement_fixture',
  'worldTileActionHudOpenOk',
  'worldTileExpeditionMinimalSettlementOk',
  'grid_8_8',
]) {
  assert.ok(mainGd.includes(protectedField) || runner.includes(protectedField), `C Tile HUD protected field/action missing: ${protectedField}`)
}

assert.ok(runner.includes(`"${ACTION}"`), 'visual-smoke runner should accept the B-W23 action')
for (const requiredField of [
  'worldNavalHarborInventoryOpenOk',
  'sourceShipyardOrderId',
  'inventoryFleetId',
  'harborId',
  'harborName',
  'fleetCardVisible',
  'fleetStatusLabel',
  'durabilityLabel',
  'harborSurfaceVisible',
  'harborCopyAllowedOnlyOnHarborSurface',
  'landSurfaceNavalCopyLeak',
  'visibleCopyForbiddenHits',
  'playerVisibleEngineeringCopyLeak',
  'worldNavalHarborInventoryScope',
]) {
  assert.ok(runner.includes(requiredField), `runner should require B-W23 summary field: ${requiredField}`)
}

console.log('[godot_naval_harbor_inventory_open_fixture_contract] all checks passed')
