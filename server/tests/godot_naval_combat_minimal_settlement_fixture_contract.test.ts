import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainGd = readFileSync('godot-client/scripts/app/main.gd', 'utf8')
const runner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf8')

const ACTION = 'world_naval_combat_minimal_settlement_fixture'

assert.ok(mainGd.includes(`"${ACTION}"`), 'main.gd should expose the W16 naval combat click action')
assert.ok(
  mainGd.includes('func _press_mainline_visual_smoke_world_naval_combat_minimal_settlement_fixture()'),
  'main.gd should implement the W16 naval combat settlement fixture',
)
assert.ok(mainGd.includes('resolveNavalCombatSettlement'), 'fixture should call resolveNavalCombatSettlement through the world action API')
assert.ok(mainGd.includes('createNavalFleet'), 'fixture should create two naval fleets through the world action API')
assert.ok(mainGd.includes('sailNavalRoute'), 'fixture should sail at least one naval fleet through the world action API')
assert.ok(
  mainGd.includes('worldNavalCombatMinimalSettlementUsesExistingBattleReport'),
  'fixture should prove the settlement reuses the existing battle report surface',
)
assert.ok(
  mainGd.includes('worldNavalCombatMinimalSettlementDoesNotUseUnitMarker'),
  'fixture should prove settlement does not use the land UnitMarker path',
)
assert.ok(mainGd.includes('海上遭遇'), 'fixture should show short Chinese visible copy')
assert.ok(!mainGd.includes('NavalCombatBattleReportPanel'), 'fixture must not add a dedicated naval battle report page')

assert.ok(runner.includes(`"${ACTION}"`), 'visual-smoke runner should accept the W16 naval combat click action')
assert.ok(runner.includes('worldNavalCombatMinimalSettlementOk'), 'runner should require the W16 success field')
assert.ok(
  runner.includes('worldNavalCombatMinimalSettlementBattleReportSurface'),
  'runner should capture existing battle report surface proof',
)
assert.ok(
  runner.includes('worldNavalCombatMinimalSettlementDoesNotUseUnitMarker'),
  'runner should capture the no-UnitMarker proof',
)

console.log('[godot_naval_combat_minimal_settlement_fixture_contract] all checks passed')
