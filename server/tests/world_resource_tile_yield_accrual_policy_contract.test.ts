import assert from 'node:assert/strict'
import type { ResourceKind } from '../../shared/contracts/game'
import {
  buildResourceTileYieldAccrualPolicy,
  RESOURCE_TILE_YIELD_ACCRUAL_POLICY_SCOPE,
} from '../../shared/domain/resourceTileYieldAccrualPolicy'
import { computeResourceTileOngoingYield } from '../../shared/domain/resourceTileEconomy'

const ENGINEERING_COPY_PATTERN = /(snake_case|read model|authority|tier|v0|backend|contract id|resourceEconomy|guardTemplateId|policyScope)/i
const RESOURCE_KINDS: Array<Extract<ResourceKind, 'food' | 'wood' | 'stone' | 'iron'>> = ['food', 'wood', 'stone', 'iron']
const HOUR_MS = 60 * 60 * 1000

function exactMainResourceYield(level: number): number {
  return level * 2 * 100
}

const l0 = buildResourceTileYieldAccrualPolicy({
  tileType: 'plain',
  resourceKind: 'wood',
  resourceLevel: 0,
  occupierFactionId: 'player',
  requestingFactionId: 'player',
  occupiedSinceMs: 0,
  lastClaimedAtMs: 0,
  nowMs: 6 * HOUR_MS,
  storageCapacity: 1000,
  currentStoredAmount: 100,
})
assert.equal(l0.status, 'l0_substrate')
assert.equal(l0.resourceLabel, '普通土地')
assert.equal(l0.yieldPerHour, 0)
assert.equal(l0.elapsedMs, 0)
assert.equal(l0.claimableAmount, 0)
assert.equal(l0.overflowAmount, 0)
assert.equal(l0.shouldClaimNow, false)

const unoccupied = buildResourceTileYieldAccrualPolicy({
  tileType: 'resource',
  resourceKind: 'food',
  resourceLevel: 3,
  ownerFactionId: 'neutral',
  requestingFactionId: 'player',
  occupiedSinceMs: 0,
  lastClaimedAtMs: 0,
  nowMs: 3 * HOUR_MS,
  storageCapacity: 1000,
  currentStoredAmount: 0,
})
assert.equal(unoccupied.status, 'unoccupied')
assert.equal(unoccupied.claimableAmount, 0)
assert.equal(unoccupied.shouldClaimNow, false)

for (let resourceLevel = 1; resourceLevel <= 9; resourceLevel += 1) {
  for (const resourceKind of RESOURCE_KINDS) {
    const oneHour = buildResourceTileYieldAccrualPolicy({
      tileType: 'resource',
      resourceKind,
      resourceLevel,
      occupierFactionId: 'player',
      requestingFactionId: 'player',
      occupiedSinceMs: 0,
      lastClaimedAtMs: 0,
      nowMs: HOUR_MS,
      storageCapacity: 100000,
      currentStoredAmount: 0,
    })
    const sixHours = buildResourceTileYieldAccrualPolicy({
      tileType: 'resource',
      resourceKind,
      resourceLevel,
      occupierFactionId: 'player',
      requestingFactionId: 'player',
      occupiedSinceMs: 0,
      lastClaimedAtMs: 0,
      nowMs: 6 * HOUR_MS,
      storageCapacity: 100000,
      currentStoredAmount: 0,
    })

    const ongoingYield = computeResourceTileOngoingYield({ resourceKind, resourceLevel })
    const expectedYieldPerHour = exactMainResourceYield(resourceLevel)
    assert.deepEqual(ongoingYield.yieldPerHour, { min: expectedYieldPerHour, max: expectedYieldPerHour })
    assert.equal(oneHour.status, 'ready')
    assert.equal(oneHour.policyScope, RESOURCE_TILE_YIELD_ACCRUAL_POLICY_SCOPE)
    assert.equal(oneHour.resourceKind, resourceKind)
    assert.equal(oneHour.resourceLevel, resourceLevel)
    assert.equal(oneHour.yieldPerHour, expectedYieldPerHour)
    assert.ok(oneHour.claimableAmount > 0)
    assert.ok(sixHours.claimableAmount > oneHour.claimableAmount, `${resourceKind} L${resourceLevel} claimable amount must increase with elapsed time`)
    assert.equal(oneHour.overflowAmount, 0)
    assert.equal(oneHour.shouldClaimNow, true)
    assert.equal(ENGINEERING_COPY_PATTERN.test(oneHour.resourceLabel), false)
    assert.equal(ENGINEERING_COPY_PATTERN.test(oneHour.nextClaimHintLabel), false)
    assert.equal(ENGINEERING_COPY_PATTERN.test(oneHour.yieldLabel), false)
    assert.equal(ENGINEERING_COPY_PATTERN.test(oneHour.claimLabel), false)
    assert.deepEqual(oneHour.visibleCopyForbiddenHits, [])
  }
}

const base = buildResourceTileYieldAccrualPolicy({
  tileType: 'resource',
  resourceKind: 'wood',
  resourceLevel: 6,
  occupierFactionId: 'player',
  requestingFactionId: 'player',
  occupiedSinceMs: 0,
  lastClaimedAtMs: 0,
  nowMs: 4 * HOUR_MS,
  storageCapacity: 100000,
  currentStoredAmount: 0,
})
const disrupted = buildResourceTileYieldAccrualPolicy({
  tileType: 'resource',
  resourceKind: 'wood',
  resourceLevel: 6,
  occupierFactionId: 'player',
  requestingFactionId: 'player',
  occupiedSinceMs: 0,
  lastClaimedAtMs: 0,
  nowMs: 4 * HOUR_MS,
  storageCapacity: 100000,
  currentStoredAmount: 0,
  warDisruptionFactor: 0.5,
})
const governed = buildResourceTileYieldAccrualPolicy({
  tileType: 'resource',
  resourceKind: 'wood',
  resourceLevel: 6,
  occupierFactionId: 'player',
  requestingFactionId: 'player',
  occupiedSinceMs: 0,
  lastClaimedAtMs: 0,
  nowMs: 4 * HOUR_MS,
  storageCapacity: 100000,
  currentStoredAmount: 0,
  governanceBonusFactor: 1.25,
})
assert.ok(disrupted.claimableAmount < base.claimableAmount, 'war disruption must reduce accrual')
assert.ok(governed.claimableAmount > base.claimableAmount, 'governance bonus must increase accrual')

const nearFull = buildResourceTileYieldAccrualPolicy({
  tileType: 'resource',
  resourceKind: 'iron',
  resourceLevel: 9,
  occupierFactionId: 'player',
  requestingFactionId: 'player',
  occupiedSinceMs: 0,
  lastClaimedAtMs: 0,
  nowMs: 12 * HOUR_MS,
  storageCapacity: 500,
  currentStoredAmount: 450,
})
assert.equal(nearFull.storageRemaining, 50)
assert.ok(nearFull.claimableAmount <= nearFull.storageRemaining)
assert.ok(nearFull.overflowAmount > 0)
assert.equal(nearFull.overflowRisk, 'high')
assert.equal(nearFull.shouldClaimNow, true)

const l10 = buildResourceTileYieldAccrualPolicy({
  tileType: 'resource',
  resourceKind: 'wood',
  resourceLevel: 10,
  occupierFactionId: 'player',
  requestingFactionId: 'player',
  occupiedSinceMs: 0,
  lastClaimedAtMs: 0,
  nowMs: 4 * HOUR_MS,
  storageCapacity: 1000,
  currentStoredAmount: 0,
})
assert.equal(l10.status, 'unsupported_resource_level')
assert.equal(l10.claimableAmount, 0)
assert.equal(l10.shouldClaimNow, false)

console.log('[world_resource_tile_yield_accrual_policy_contract] all checks passed')
