import assert from 'node:assert/strict'
import type { ResourceKind } from '../../shared/contracts/game'
import {
  RESOURCE_TILE_ECONOMY_MODEL_VERSION,
  buildResourceTileCaptureReward,
  buildResourceTileExpeditionPreview,
  listResourceTileEconomySpecs,
} from '../../shared/domain/resourceTileEconomy'

const ENGINEERING_COPY_PATTERN = /(read model|contract|backend|authority|tier|snake_case|v0|resourceEconomy|guardTemplateId)/i
const RESOURCE_KINDS: Array<Extract<ResourceKind, 'food' | 'wood' | 'stone' | 'iron'>> = ['food', 'wood', 'stone', 'iron']

function exactMainResourceYield(level: number): number {
  return level * 2 * 100
}

function exactGuardSoldiers(level: number): number {
  return level * 300
}

function exactRecommendedPower(level: number): number {
  return level * 100
}

function exactHeroExp(level: number): number {
  return level * 20
}

const l0Preview = buildResourceTileExpeditionPreview({
  tileType: 'plain',
  resourceKind: 'wood',
  resourceLevel: 0,
})
assert.equal(l0Preview.status, 'not_resource_tile')
assert.equal(l0Preview.isResourceTile, false)
assert.equal(l0Preview.hasResourceGuard, false)
assert.equal(l0Preview.hasCaptureReward, false)
assert.equal(l0Preview.baseYieldPerHour.min, 0)
assert.equal(l0Preview.baseYieldPerHour.max, 0)
assert.equal(l0Preview.ongoingYield.yieldPerTick, 0)
assert.equal(l0Preview.guardLevel, undefined)
assert.equal(l0Preview.resourceLabel, '普通土地')
assert.equal(ENGINEERING_COPY_PATTERN.test(l0Preview.resourceLabel), false)
assert.equal(ENGINEERING_COPY_PATTERN.test(l0Preview.difficultyLabel), false)
assert.equal(ENGINEERING_COPY_PATTERN.test(l0Preview.riskLabel), false)

for (const spec of listResourceTileEconomySpecs()) {
  for (const resourceKind of RESOURCE_KINDS) {
    const preview = buildResourceTileExpeditionPreview({
      tileType: 'resource',
      resourceKind,
      resourceLevel: spec.tileLevel,
      ownerFactionId: 'neutral',
      occupierFactionId: undefined,
      contestedByFactionId: 'player',
    })
    assert.equal(preview.status, 'ready')
    assert.equal(preview.isResourceTile, true)
    assert.equal(preview.resourceEconomyModelVersion, RESOURCE_TILE_ECONOMY_MODEL_VERSION)
    assert.equal(preview.resourceKind, resourceKind)
    assert.equal(preview.resourceLevel, spec.tileLevel)
    assert.equal(preview.guardLevel, spec.tileLevel)
    assert.equal(preview.hasResourceGuard, true)
    assert.equal(preview.hasCaptureReward, true)
    assert.deepEqual(preview.baseYieldPerHour, { min: exactMainResourceYield(spec.tileLevel), max: exactMainResourceYield(spec.tileLevel) })
    assert.deepEqual(preview.ongoingYield.yieldPerHour, preview.baseYieldPerHour)
    assert.equal(preview.ongoingYield.yieldPerTick, Math.round(exactMainResourceYield(spec.tileLevel) / 12))
    assert.equal(preview.captureReward?.resourceKind, resourceKind)
    assert.equal(preview.captureReward?.captureRewardUsesResourceLevel, true)
    assert.deepEqual(preview.captureReward?.amount, { min: exactMainResourceYield(spec.tileLevel), max: exactMainResourceYield(spec.tileLevel) })
    assert.equal(preview.captureReward?.heroExp, exactHeroExp(spec.tileLevel))
    assert.deepEqual(preview.defenderStrength, { min: exactGuardSoldiers(spec.tileLevel), max: exactGuardSoldiers(spec.tileLevel) })
    assert.deepEqual(preview.defenderTroopCount, { min: spec.tileLevel, max: spec.tileLevel })
    assert.equal(preview.recommendedPower, exactRecommendedPower(spec.tileLevel))
    assert.ok(preview.resourceLabel.length > 0)
    assert.ok(preview.difficultyLabel.length > 0)
    assert.ok(preview.riskLabel.length > 0)
    assert.equal(ENGINEERING_COPY_PATTERN.test(preview.resourceLabel), false)
    assert.equal(ENGINEERING_COPY_PATTERN.test(preview.difficultyLabel), false)
    assert.equal(ENGINEERING_COPY_PATTERN.test(preview.riskLabel), false)

  }
}

for (const resourceKind of RESOURCE_KINDS) {
  const lowReward = buildResourceTileCaptureReward({ resourceKind, resourceLevel: 1 })
  const highReward = buildResourceTileCaptureReward({ resourceKind, resourceLevel: 9 })
  assert.equal(lowReward.resourceKind, resourceKind)
  assert.equal(highReward.resourceKind, resourceKind)
  assert.deepEqual(lowReward.amount, { min: 200, max: 200 })
  assert.deepEqual(highReward.amount, { min: 1800, max: 1800 })
  assert.equal(lowReward.heroExp, 20)
  assert.equal(highReward.heroExp, 180)
}

const l10Preview = buildResourceTileExpeditionPreview({
  tileType: 'resource',
  resourceKind: 'wood',
  resourceLevel: 10,
})
assert.equal(l10Preview.status, 'unsupported_resource_level')
assert.equal(l10Preview.isResourceTile, false)
assert.equal(l10Preview.hasResourceGuard, false)
assert.equal(l10Preview.hasCaptureReward, false)

for (const unsupportedResourceKind of ['copper', 'currency'] as const) {
  const unsupportedKindPreview = buildResourceTileExpeditionPreview({
    tileType: 'resource',
    resourceKind: unsupportedResourceKind as ResourceKind,
    resourceLevel: 3,
  })
  assert.equal(unsupportedKindPreview.status, 'unsupported_resource_kind')
  assert.equal(unsupportedKindPreview.isResourceTile, false)
  assert.equal(unsupportedKindPreview.hasResourceGuard, false)
  assert.equal(unsupportedKindPreview.hasCaptureReward, false)
  assert.deepEqual(unsupportedKindPreview.baseYieldPerHour, { min: 0, max: 0 })
}

console.log('[world_resource_expedition_preview_policy_contract] all checks passed')
