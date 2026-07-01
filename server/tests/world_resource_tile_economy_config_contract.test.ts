import assert from 'node:assert/strict'
import type { ResourceKind } from '../../shared/contracts/game'
import {
  RESOURCE_TILE_ECONOMY_CONFIG_VERSION,
  RESOURCE_TILE_ECONOMY_LEVELS,
  RESOURCE_TILE_ECONOMY_RESOURCE_KINDS,
  getResourceTileEconomyConfig,
  listResourceTileEconomyConfigs,
  resolveResourceTileEconomyConfigForTile,
} from '../../shared/domain/resourceTileEconomyConfig'
import {
  RESOURCE_TILE_ECONOMY_MODEL_VERSION,
  buildL0SubstrateEconomyReadModel,
  buildResourceTileEconomyReadModel,
  buildResourceTileExpeditionPreview,
  computeResourceTileOngoingYield,
  listResourceTileEconomySpecs,
  resolveResourceTileEconomySpec,
} from '../../shared/domain/resourceTileEconomy'
import { buildResourceTileContestPolicyReadModel } from '../../shared/domain/resourceTileContestPolicy'
import { buildResourceTileYieldAccrualPolicy } from '../../shared/domain/resourceTileYieldAccrualPolicy'
import { listResourceGuardTemplates } from '../../shared/domain/resourceGuardTemplates'

const ENGINEERING_COPY_PATTERN = /(snake_case|read model|authority|tier|v0|backend|contract id|resourceEconomy|guardTemplateId)/i
const RESOURCE_KINDS: Array<Extract<ResourceKind, 'food' | 'wood' | 'stone' | 'iron'>> = ['food', 'wood', 'stone', 'iron']
const FORBIDDEN_VISIBLE_COPY_PATTERN = /守军强度/

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

function assertExactRange(actual: { min: number; max: number }, expected: number, label: string) {
  assert.deepEqual(actual, { min: expected, max: expected }, label)
}

assert.equal(RESOURCE_TILE_ECONOMY_CONFIG_VERSION, RESOURCE_TILE_ECONOMY_MODEL_VERSION)
assert.deepEqual(RESOURCE_TILE_ECONOMY_LEVELS, [1, 2, 3, 4, 5, 6, 7, 8, 9])
assert.deepEqual(RESOURCE_TILE_ECONOMY_RESOURCE_KINDS, RESOURCE_KINDS)

const l0 = buildL0SubstrateEconomyReadModel()
assert.equal(l0.resourceEconomyModelVersion, RESOURCE_TILE_ECONOMY_CONFIG_VERSION)
assert.equal(l0.tileLevel, 0)
assert.equal(l0.l0SubstrateYieldPerHour, 0)
assert.equal(l0.hasResourceKind, false)
assert.equal(l0.hasResourceLevel, false)
assert.equal(l0.hasResourceGuard, false)
assert.equal(l0.hasResourceYield, false)

const l0Resolved = resolveResourceTileEconomyConfigForTile({
  tileType: 'plain',
  resourceKind: 'wood',
  resourceLevel: 0,
})
assert.equal(l0Resolved.status, 'l0_substrate')
assert.equal(l0Resolved.configVersion, RESOURCE_TILE_ECONOMY_CONFIG_VERSION)
assert.equal(l0Resolved.yieldPerHour.min, 0)
assert.equal(l0Resolved.yieldPerHour.max, 0)
assert.equal(l0Resolved.hasResourceGuard, false)
assert.equal(l0Resolved.hasCaptureReward, false)

const l10Resolved = resolveResourceTileEconomyConfigForTile({
  tileType: 'resource',
  resourceKind: 'wood',
  resourceLevel: 10,
})
assert.equal(l10Resolved.status, 'unsupported_resource_level')
assert.equal(l10Resolved.hasResourceGuard, false)
assert.equal(l10Resolved.hasCaptureReward, false)
assert.throws(
  () => resolveResourceTileEconomySpec(10),
  /unsupported_resource_level/,
  'legacy spec resolver must not clamp L10 into a success path',
)

for (const unsupportedResourceKind of ['copper', 'currency'] as const) {
  const unsupportedKindResolved = resolveResourceTileEconomyConfigForTile({
    tileType: 'resource',
    resourceKind: unsupportedResourceKind as ResourceKind,
    resourceLevel: 3,
  })
  assert.equal(unsupportedKindResolved.status, 'unsupported_resource_kind')
  assert.deepEqual(unsupportedKindResolved.yieldPerHour, { min: 0, max: 0 })
  assert.equal(unsupportedKindResolved.recommendedPower, 0)
  assert.equal(unsupportedKindResolved.hasResourceGuard, false)
  assert.equal(unsupportedKindResolved.hasCaptureReward, false)
  assert.throws(
    () => getResourceTileEconomyConfig({ resourceKind: unsupportedResourceKind as ResourceKind, resourceLevel: 3 }),
    /unsupported_resource_kind/,
  )
}

const configs = listResourceTileEconomyConfigs()
assert.equal(configs.length, 9, 'config source must cover L1-L9 only')
assert.deepEqual(configs.map((entry) => entry.resourceLevel), RESOURCE_TILE_ECONOMY_LEVELS)
assert.equal(configs.some((entry) => Number(entry.resourceLevel) === 10), false, 'L10 must stay future-only')

for (const config of configs) {
  assert.equal(config.configVersion, RESOURCE_TILE_ECONOMY_CONFIG_VERSION)
  assert.equal(config.captureReward.captureRewardUsesResourceLevel, true)
  assertExactRange(config.captureReward.amount, exactMainResourceYield(config.resourceLevel), `L${config.resourceLevel} capture reward must match exact authority`)
  assert.equal(config.captureReward.heroExp, exactHeroExp(config.resourceLevel))
  assert.equal(config.recommendedPower, exactRecommendedPower(config.resourceLevel))
  assertExactRange(config.defenderStrength, exactGuardSoldiers(config.resourceLevel), `L${config.resourceLevel} guard soldiers must match exact authority`)
  assert.deepEqual(config.defenderTroopCount, { min: config.resourceLevel, max: config.resourceLevel })

  for (const resourceKind of RESOURCE_KINDS) {
    const byConfig = getResourceTileEconomyConfig({ resourceKind, resourceLevel: config.resourceLevel })
    assert.equal(byConfig.configVersion, RESOURCE_TILE_ECONOMY_CONFIG_VERSION)
    assert.equal(byConfig.resourceKind, resourceKind)
    assert.equal(byConfig.resourceLevel, config.resourceLevel)
    assertExactRange(byConfig.yieldPerHour, exactMainResourceYield(config.resourceLevel), `${resourceKind} L${config.resourceLevel} yield must match exact authority`)
    assertExactRange(byConfig.defenderStrength, exactGuardSoldiers(config.resourceLevel), `${resourceKind} L${config.resourceLevel} guard soldiers must match exact authority`)
    assert.deepEqual(byConfig.defenderTroopCount, { min: config.resourceLevel, max: config.resourceLevel })
    assert.equal(byConfig.recommendedPower, exactRecommendedPower(config.resourceLevel))
    assert.equal(byConfig.captureReward.resourceKind, resourceKind)
    assertExactRange(byConfig.captureReward.amount, exactMainResourceYield(config.resourceLevel), `${resourceKind} L${config.resourceLevel} capture reward must match exact authority`)
    assert.equal(byConfig.captureReward.heroExp, exactHeroExp(config.resourceLevel))

    const readModel = buildResourceTileEconomyReadModel({ resourceKind, resourceLevel: config.resourceLevel })
    assert.equal(readModel.resourceEconomyModelVersion, RESOURCE_TILE_ECONOMY_CONFIG_VERSION)
    assert.deepEqual(readModel.baseYieldPerHour, byConfig.yieldPerHour)
    assert.deepEqual(readModel.defenderStrength, byConfig.defenderStrength)
    assert.deepEqual(readModel.defenderTroopCount, byConfig.defenderTroopCount)
    assert.equal(readModel.recommendedPower, byConfig.recommendedPower)
    assert.equal(readModel.captureReward.resourceKind, resourceKind)

    const preview = buildResourceTileExpeditionPreview({ tileType: 'resource', resourceKind, resourceLevel: config.resourceLevel })
    assert.equal(preview.resourceEconomyModelVersion, RESOURCE_TILE_ECONOMY_CONFIG_VERSION)
    assert.equal(preview.status, 'ready')
    assert.deepEqual(preview.baseYieldPerHour, byConfig.yieldPerHour)
    assert.deepEqual(preview.defenderStrength, byConfig.defenderStrength)
    assert.deepEqual(preview.defenderTroopCount, byConfig.defenderTroopCount)
    assert.equal(preview.recommendedPower, byConfig.recommendedPower)
    assert.deepEqual(preview.captureReward?.amount, byConfig.captureReward.amount)
    assert.equal(preview.captureReward?.heroExp, exactHeroExp(config.resourceLevel))
    assert.equal(ENGINEERING_COPY_PATTERN.test(preview.resourceLabel), false)
    assert.equal(ENGINEERING_COPY_PATTERN.test(preview.difficultyLabel), false)
    assert.equal(ENGINEERING_COPY_PATTERN.test(preview.riskLabel), false)
    assert.equal(FORBIDDEN_VISIBLE_COPY_PATTERN.test(preview.resourceLabel), false)
    assert.equal(FORBIDDEN_VISIBLE_COPY_PATTERN.test(preview.difficultyLabel), false)
    assert.equal(FORBIDDEN_VISIBLE_COPY_PATTERN.test(preview.riskLabel), false)

    const contest = buildResourceTileContestPolicyReadModel({
      tileType: 'resource',
      resourceKind,
      resourceLevel: config.resourceLevel,
      ownerFactionId: 'neutral',
      requestingFactionId: 'player',
      factionPower: 999,
      resourceNeed: { [resourceKind]: 5 },
    })
    assert.equal(contest.resourceEconomyModelVersion, RESOURCE_TILE_ECONOMY_CONFIG_VERSION)
    assert.equal(contest.status, 'ready')
    assert.deepEqual(contest.expectedYieldPerHour, byConfig.yieldPerHour)
    assert.equal(ENGINEERING_COPY_PATTERN.test(contest.resourceLabel), false)
    assert.equal(ENGINEERING_COPY_PATTERN.test(contest.riskLabel), false)
    assert.equal(ENGINEERING_COPY_PATTERN.test(contest.decisionLabel), false)

    const accrual = buildResourceTileYieldAccrualPolicy({
      tileType: 'resource',
      resourceKind,
      resourceLevel: config.resourceLevel,
      occupierFactionId: 'player',
      requestingFactionId: 'player',
      occupiedSinceMs: 0,
      lastClaimedAtMs: 0,
      nowMs: 60 * 60 * 1000,
      storageCapacity: 100000,
      currentStoredAmount: 0,
    })
    const ongoing = computeResourceTileOngoingYield({ resourceKind, resourceLevel: config.resourceLevel })
    assert.equal(accrual.resourceEconomyModelVersion, RESOURCE_TILE_ECONOMY_CONFIG_VERSION)
    assert.equal(accrual.status, 'ready')
    assert.equal(accrual.yieldPerHour, exactMainResourceYield(config.resourceLevel))
    assert.equal(accrual.yieldPerHour, Math.round((byConfig.yieldPerHour.min + byConfig.yieldPerHour.max) / 2))
    assert.equal(accrual.yieldPerHour, Math.round((ongoing.yieldPerHour.min + ongoing.yieldPerHour.max) / 2))
    assert.deepEqual(accrual.visibleCopyForbiddenHits, [])
  }
}

assert.equal(
  listResourceGuardTemplates().map((template) => template.resourceLevel).join(','),
  RESOURCE_TILE_ECONOMY_LEVELS.join(','),
  'resource guard coverage must match economy config levels',
)
assert.equal(listResourceTileEconomySpecs().length, configs.length)

console.log('[world_resource_tile_economy_config_contract] all checks passed')
