import assert from 'node:assert/strict'
import {
  resetWorldServiceForTests,
  seedProductionResourceTileActionHudFixtureAction,
  seedZeroLevelSubstrateTileActionHudFixtureAction,
} from '../src/application/world/WorldService'

resetWorldServiceForTests()

const production = seedProductionResourceTileActionHudFixtureAction({ factionId: 'player' }, true)
assert.equal(production.ok, true, 'production resource seed should succeed')
assert.ok(production.seededProductionResourceTileActionHudFixture, 'production resource seed should return fixture readback')

const productionFixture = production.seededProductionResourceTileActionHudFixture
assert.equal(
  productionFixture.scope,
  'ordinary_l1_l9_resource_tile_not_fixture_seed_only',
  'production resource proof should not be the single hard-coded Stage 135 seed only',
)
assert.ok(productionFixture.tileId.length > 0)
assert.notEqual(productionFixture.tileId, 'grid_8_8', 'production proof should not depend on the Stage 135 hard-coded grid_8_8 target')
assert.ok(productionFixture.tileLevel >= 1 && productionFixture.tileLevel <= 9)
assert.ok(productionFixture.resourceKind.length > 0)
assert.ok(productionFixture.defenderStrength > 0)
assert.ok(productionFixture.guardTemplateId.length > 0)

const productionWorldTile = production.world?.map.tiles.find((tile) => tile.id === productionFixture.tileId)
assert.ok(productionWorldTile, 'production fixture tile should exist in returned world')
assert.equal(productionWorldTile?.type, 'resource')
assert.equal(productionWorldTile?.resourceLevel, productionFixture.tileLevel)
assert.equal(productionWorldTile?.resourceKind, productionFixture.resourceKind)
assert.ok(
  (productionWorldTile as { resourceGuard?: unknown } | undefined)?.resourceGuard,
  'production resource tile should expose resourceGuard',
)

const zero = seedZeroLevelSubstrateTileActionHudFixtureAction({ factionId: 'player' }, true)
assert.equal(zero.ok, true, 'zero-level substrate seed should succeed')
assert.ok(zero.seededZeroLevelSubstrateTileActionHudFixture, 'zero-level seed should return fixture readback')

const zeroFixture = zero.seededZeroLevelSubstrateTileActionHudFixture
assert.equal(zeroFixture.scope, 'zero_level_substrate_not_l10_missing_tile')
assert.equal(zeroFixture.tileLevel, 0)
assert.equal(zeroFixture.hasResourceYield, false)
assert.equal(zeroFixture.hasResourceGuard, false)
assert.equal(zeroFixture.expeditionRewardBlocked, true)

const zeroWorldTile = zero.world?.map.tiles.find((tile) => tile.id === zeroFixture.tileId)
assert.ok(zeroWorldTile, 'zero-level fixture tile should exist in returned world')
assert.notEqual(zeroWorldTile?.type, 'resource')
assert.equal(zeroWorldTile?.resourceKind, undefined)
assert.equal(zeroWorldTile?.resourceLevel, undefined)
assert.equal((zeroWorldTile as { resourceGuard?: unknown } | undefined)?.resourceGuard, undefined)

console.log('[world_tile_production_resource_generalization_contract] all checks passed')
