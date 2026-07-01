import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainGd = readFileSync('godot-client/scripts/app/main.gd', 'utf8')
const runner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf8')

const ACTION = 'world_naval_runtime_minimal_chain_fixture'

assert.ok(mainGd.includes(`"${ACTION}"`), 'main.gd should expose the W15 naval runtime click action')
assert.ok(
  mainGd.includes('func _press_mainline_visual_smoke_world_naval_runtime_minimal_chain_fixture()'),
  'main.gd should implement the W15 naval runtime fixture',
)
assert.ok(mainGd.includes('createNavalFleet'), 'fixture should call createNavalFleet through the world action API')
assert.ok(mainGd.includes('sailNavalRoute'), 'fixture should call sailNavalRoute through the world action API')
assert.ok(
  mainGd.includes('worldNavalRuntimeMinimalChainMovementRuntimeStatus'),
  'fixture should summarize the dedicated naval runtime movement status',
)
assert.ok(
  mainGd.includes('worldNavalRuntimeMinimalChainDoesNotUseUnitMarker'),
  'fixture should prove naval runtime does not use the land UnitMarker path',
)
assert.ok(
  mainGd.includes('worldNavalRuntimeMinimalChainBattleReportSurface'),
  'fixture should keep the intercept result on the existing battle report surface',
)

assert.ok(runner.includes(`"${ACTION}"`), 'visual-smoke runner should accept the W15 naval runtime click action')
assert.ok(
  runner.includes('worldNavalRuntimeMinimalChainOk'),
  'visual-smoke runner should require the W15 naval runtime success field',
)
assert.ok(
  runner.includes('worldNavalRuntimeMinimalChainMovementRuntimeStatus'),
  'visual-smoke runner should capture the movement runtime status field',
)

console.log('[godot_naval_runtime_minimal_chain_fixture_contract] all checks passed')
