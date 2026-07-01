import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const mapGrid = readFileSync('godot-client/scripts/map/map_grid.gd', 'utf-8')
const visualSmoke = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')
const closureBatch = readFileSync('godot-client/tools/run_mainline_ui_closure_batch.py', 'utf-8')
const worldService = readFileSync('server/src/application/world/WorldService.ts', 'utf-8')

function assertIncludes(source: string, needle: string, message: string) {
  assert.ok(source.includes(needle), message)
}

function assertNotIncludes(source: string, needle: string, message: string) {
  assert.ok(!source.includes(needle), message)
}

function functionBody(source: string, name: string) {
  const marker = `func ${name}`
  const start = source.indexOf(marker)
  assert.ok(start >= 0, `missing ${name}`)
  const next = source.indexOf('\nfunc ', start + marker.length)
  return source.slice(start, next >= 0 ? next : source.length)
}

const resourceContextBody = functionBody(main, '_is_world_tile_action_hud_resource_context')
assertIncludes(
  resourceContextBody,
  'not _is_main_map_context_protected_from_resource_tile_context(context)',
  'resource HUD context must veto protected city/pass/dock/fort/mountain footprints.',
)

for (const protectedType of [
  '"city"',
  '"player_city"',
  '"ai_city"',
  '"system_city"',
  '"pass"',
  '"fort"',
  '"dock"',
  '"mountain_barrier"',
  '"river_corridor"',
]) {
  assertIncludes(main, protectedType, `protected type ${protectedType} must be listed in the resource HUD veto.`)
}

assertIncludes(
  mapGrid,
  'var reserved_hit_tile: Dictionary = _build_reserved_world_cell_hit_tile(tmx_x, tmx_y, {})',
  'fixture focus selection must check reserved footprint before backend resource tile lookup.',
)
assertIncludes(
  mapGrid,
  'var protected_hit_tile: Dictionary = _build_reserved_world_cell_hit_tile(int(selected.get("tmxX", -1)), int(selected.get("tmxY", -1)), selected)',
  'backend tile fixture fallback must be converted to the protected footprint hit when a building owns the cell.',
)

assertNotIncludes(worldService, 'targetTile.x = 4387', 'tile action fixture must not relocate a resource tile to Luoyang X.')
assertNotIncludes(worldService, 'targetTile.y = 2482', 'tile action fixture must not relocate a resource tile to Luoyang Y.')
assertIncludes(worldService, 'left.x === 4387 && left.y === 2482', 'fixture selection should deprioritize the Luoyang coordinate if it ever appears as a candidate.')

for (const field of [
  'resourceHudProtectedFootprintVetoOk',
  'tileActionHudFixtureAvoidsLuoyangCoordinate',
  'tileActionHudResourceContextPolicy',
]) {
  assertIncludes(main, field, `Godot summary must expose ${field}.`)
  assertIncludes(visualSmoke, field, `visual smoke runner must require ${field}.`)
}

for (const source of [main, visualSmoke, closureBatch]) {
  assertIncludes(source, 'world_click_priority_matrix_fixture', 'formal click-priority matrix action must be registered in Godot, visual smoke, and closure.')
}

for (const field of [
  'worldClickPriorityMatrixOk',
  'clickPriorityFullProtectedSamplesOk',
  'clickPriorityMatrixScope',
  'clickPriorityProtectedObjectCount',
  'clickPriorityResourceHudOpenOk',
  'clickPriorityL0SubstrateOk',
  'clickPriorityProtectedFootprintVetoOk',
  'clickPrioritySamples',
  'clickPriorityUnavailableSamples',
  'clickPriorityRequiredProtectedSamples',
  'clickPriorityPresentProtectedSampleIds',
  'clickPriorityMissingProtectedSampleIds',
  'formalObjectId',
  'sampleSource',
  'resourceHudProtectedFootprintVetoOk',
  'playerVisibleEngineeringCopyLeak',
  'visibleCopyForbiddenHits',
]) {
  assertIncludes(main, field, `Godot click-priority matrix summary must expose ${field}.`)
  assertIncludes(visualSmoke, field, `visual smoke runner must require ${field}.`)
}

for (const expectedSample of [
  'player_city_3x3_initial',
  'ai_city_3x3_initial',
  'system_city_l05_l06_5x5',
  'pass_1x1',
  'dock_1x1',
  'fort_1x1',
  'mountain_barrier_1x1',
  'resource_1x1',
  'l0_substrate',
]) {
  assertIncludes(`${main}\n${mapGrid}`, expectedSample, `Godot click-priority matrix must cover ${expectedSample}.`)
}

assertIncludes(
  main,
  'clickPriorityMissingProtectedSampleIds.is_empty()',
  'Godot click-priority matrix must fail GREEN when any required protected sample remains unavailable.',
)
assertIncludes(
  visualSmoke,
  'clickPriorityFullProtectedSamplesOk',
  'visual smoke runner must require full protected sample coverage.',
)
assertIncludes(
  visualSmoke,
  '_validate_click_priority_matrix_contract',
  'visual smoke runner must validate click-priority protected samples at runtime.',
)
for (const forbiddenSourceTerm of ['fake', 'temporary', 'hardcoded', 'test_only']) {
  assertIncludes(
    visualSmoke,
    forbiddenSourceTerm,
    `visual smoke runner must reject ${forbiddenSourceTerm} protected sample sources.`,
  )
}

for (const screenshotName of [
  '00_click_priority_resource.png',
  '01_click_priority_protected.png',
  '02_click_priority_l0.png',
]) {
  assertIncludes(main, screenshotName, `formal smoke must save ${screenshotName}.`)
}

const cacheBody = functionBody(main, '_cache_viewport_map_layout')
assertIncludes(cacheBody, 'duplicate(false)', 'viewport map cache must use shallow cache copies for large immutable map payloads.')
assertNotIncludes(cacheBody, 'duplicate(true)', 'viewport map cache must not deep duplicate large layered map payloads.')

console.log('[world_click_priority_matrix_contract] all checks passed')
