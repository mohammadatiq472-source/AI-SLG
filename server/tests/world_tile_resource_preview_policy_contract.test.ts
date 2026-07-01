import assert from 'node:assert/strict'
import {
  resetWorldServiceForTests,
  seedProductionResourceTileActionHudFixtureAction,
} from '../src/application/world/WorldService'
import { RESOURCE_TILE_ECONOMY_MODEL_VERSION } from '../../shared/domain/resourceTileEconomy'

resetWorldServiceForTests()

const response = seedProductionResourceTileActionHudFixtureAction({ factionId: 'player' }, true)
assert.equal(response.ok, true, 'production resource seed should succeed')
assert.ok(response.seededProductionResourceTileActionHudFixture, 'fixture readback should exist')

const fixture = response.seededProductionResourceTileActionHudFixture
assert.equal(fixture.resourcePreviewUsesSharedDomainPolicy, true)
assert.equal(fixture.resourceEconomyModelVersion, RESOURCE_TILE_ECONOMY_MODEL_VERSION)
assert.ok(fixture.resourceTileExpeditionPreview, 'fixture must include shared-domain expedition preview readback')

const preview = fixture.resourceTileExpeditionPreview
assert.equal(preview.status, 'ready')
assert.equal(preview.isResourceTile, true)
assert.equal(preview.resourceEconomyModelVersion, RESOURCE_TILE_ECONOMY_MODEL_VERSION)
assert.equal(preview.resourceKind, fixture.resourceKind)
assert.equal(preview.resourceLevel, fixture.tileLevel)
assert.ok(preview.resourceLabel.length > 0)
assert.ok(preview.baseYieldPerHour.min > 0)
assert.ok(preview.captureReward?.amount.min ?? 0 > 0)
assert.ok(preview.captureReward?.heroExp ?? 0 > 0)
assert.ok(preview.defenderStrength.min > 0)
assert.ok(preview.defenderTroopCount.min > 0)
assert.ok(preview.recommendedPower > 0)
assert.equal(preview.guardLevel, fixture.tileLevel)
assert.ok(preview.riskLabel.length > 0)
assert.ok(preview.difficultyLabel.length > 0)

const returnedTile = response.world?.map.tiles.find((tile) => tile.id === fixture.tileId)
assert.ok(returnedTile, 'returned world should include selected resource tile')
assert.ok(
  (returnedTile as { resourceTileExpeditionPreview?: unknown }).resourceTileExpeditionPreview,
  'selected world tile should include resourceTileExpeditionPreview for Godot HUD binding',
)

console.log('[world_tile_resource_preview_policy_contract] all checks passed')
