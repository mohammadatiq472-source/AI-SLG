import assert from 'node:assert/strict'
import {
  buildResourceTileCoverageMatrixFixtureAction,
  resetWorldServiceForTests,
} from '../src/application/world/WorldService'

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

function extractNumbers(label: string): number[] {
  return Array.from(label.matchAll(/\d+/g)).map((match) => Number(match[0]))
}

resetWorldServiceForTests()

const response = buildResourceTileCoverageMatrixFixtureAction({ factionId: 'player' }, true)
assert.equal(response.ok, true, 'coverage matrix action should succeed')
assert.ok(response.resourceTileCoverageMatrixFixture, 'coverage matrix readback should exist')

const matrix = response.resourceTileCoverageMatrixFixture
assert.equal(matrix.worldTileResourceCoverageMatrixOk, true)
assert.equal(matrix.resourceCoverageUsesSharedDomainPolicy, true)
assert.ok(matrix.coverageTileCount >= 5, 'coverage should include at least five resource tile samples')
for (const level of [1, 3, 5, 7, 9]) {
  assert.ok(matrix.coveredLevels.includes(level), `coverage should include L${level}`)
}
assert.ok(matrix.coveredResourceKinds.length >= 3, 'coverage should include at least three resource kinds')
assert.equal(matrix.zeroLevelSubstrateProtected, true)
assert.equal(matrix.l10NotRequiredForCurrentMvp, true)
assert.equal(matrix.playerVisibleEngineeringCopyLeak, false)
assert.deepEqual(matrix.visibleCopyForbiddenHits, [])

for (const sample of matrix.samples) {
  assert.ok(sample.tileId.length > 0)
  assert.notEqual(sample.tileId, 'field_5', 'coverage matrix must not prove only the Stage 160 field_5 sample')
  assert.ok(sample.tileLevel >= 1 && sample.tileLevel <= 9)
  assert.ok(sample.resourceKind.length > 0)
  assert.ok(sample.resourceLabel.length > 0)
  assert.ok(sample.resourceYieldLabel.includes('每小时'), 'sample yield label should be player-facing hourly yield')
  assert.ok(sample.captureRewardLabel.length > 0)
  assert.ok(sample.defenderStrengthLabel.length > 0)
  assert.ok(sample.defenderTroopCount > 0)
  assert.ok(sample.recommendedPower > 0)
  assert.ok(sample.recommendedPowerLabel.length > 0)
  assert.ok(extractNumbers(sample.resourceYieldLabel).includes(exactMainResourceYield(sample.tileLevel)))
  assert.ok(extractNumbers(sample.captureRewardLabel).includes(exactMainResourceYield(sample.tileLevel)))
  assert.ok(extractNumbers(sample.captureRewardLabel).includes(exactHeroExp(sample.tileLevel)))
  assert.ok(extractNumbers(sample.defenderStrengthLabel).includes(exactGuardSoldiers(sample.tileLevel)))
  assert.equal(sample.recommendedPower, exactRecommendedPower(sample.tileLevel))
  assert.ok(extractNumbers(sample.recommendedPowerLabel).includes(exactRecommendedPower(sample.tileLevel)))
}

console.log('[world_resource_tile_coverage_matrix_contract] all checks passed')
