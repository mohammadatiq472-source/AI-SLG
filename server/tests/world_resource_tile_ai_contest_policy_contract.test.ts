import assert from 'node:assert/strict'
import type { ResourceKind } from '../../shared/contracts/game'
import {
  buildResourceTileContestPolicyReadModel,
  rankResourceTileExpansionCandidate,
} from '../../shared/domain/resourceTileContestPolicy'

const ENGINEERING_COPY_PATTERN = /(snake_case|read model|authority|tier|v0|backend|contract id|resourceEconomy|guardTemplateId)/i
const RESOURCE_KINDS: Array<Extract<ResourceKind, 'food' | 'wood' | 'stone' | 'iron'>> = ['food', 'wood', 'stone', 'iron']

const l0 = buildResourceTileContestPolicyReadModel({
  tileType: 'plain',
  resourceKind: 'wood',
  resourceLevel: 0,
  requestingFactionId: 'player',
  distanceToBase: 2,
  factionPower: 200,
  resourceNeed: { wood: 5 },
})
assert.equal(l0.status, 'l0_substrate')
assert.equal(l0.attackAllowed, false)
assert.equal(l0.shouldContest, false)
assert.equal(l0.shouldAvoid, false)
assert.equal(l0.expectedYieldPerHour.min, 0)
assert.equal(l0.captureReward, undefined)
assert.equal(l0.hasResourceGuard, false)
assert.equal(l0.priorityScore, 0)

const l10 = buildResourceTileContestPolicyReadModel({
  tileType: 'resource',
  resourceKind: 'wood',
  resourceLevel: 10,
  requestingFactionId: 'player',
  distanceToBase: 2,
  factionPower: 999,
  resourceNeed: { wood: 5 },
})
assert.equal(l10.status, 'unsupported_resource_level')
assert.equal(l10.attackAllowed, false)
assert.equal(l10.priorityScore, 0)

for (let resourceLevel = 1; resourceLevel <= 9; resourceLevel += 1) {
  for (const resourceKind of RESOURCE_KINDS) {
    const policy = buildResourceTileContestPolicyReadModel({
      tileType: 'resource',
      resourceKind,
      resourceLevel,
      ownerFactionId: 'neutral',
      requestingFactionId: 'player',
      distanceToBase: 3,
      factionPower: 500,
      resourceNeed: { [resourceKind]: 5 },
      nearbyEnemyPressure: 1,
      allySupport: 1,
    })
    assert.equal(policy.status, 'ready')
    assert.equal(policy.resourceLevel, resourceLevel)
    assert.equal(policy.resourceKind, resourceKind)
    assert.ok(policy.resourceLabel.length > 0)
    assert.ok(policy.expectedYieldPerHour.min > 0)
    assert.ok(policy.captureReward)
    assert.equal(policy.captureReward?.resourceKind, resourceKind)
    assert.ok(policy.defenderStrength.min > 0)
    assert.ok(policy.defenderTroopCount.min >= 1)
    assert.ok(policy.recommendedPower > 0)
    assert.equal(policy.contestState, 'neutral')
    assert.equal(policy.attackAllowed, true)
    assert.equal(policy.shouldContest, true)
    assert.equal(policy.shouldAvoid, false)
    assert.ok(policy.priorityScore > 0)
    assert.ok(policy.riskLabel.length > 0)
    assert.ok(policy.decisionLabel.length > 0)
    assert.equal(ENGINEERING_COPY_PATTERN.test(policy.resourceLabel), false)
    assert.equal(ENGINEERING_COPY_PATTERN.test(policy.riskLabel), false)
    assert.equal(ENGINEERING_COPY_PATTERN.test(policy.decisionLabel), false)
  }
}

const lowNeed = rankResourceTileExpansionCandidate({
  tileType: 'resource',
  resourceKind: 'wood',
  resourceLevel: 6,
  ownerFactionId: 'neutral',
  requestingFactionId: 'player',
  distanceToBase: 3,
  factionPower: 500,
  resourceNeed: { wood: 1 },
  nearbyEnemyPressure: 1,
})
const highNeed = rankResourceTileExpansionCandidate({
  tileType: 'resource',
  resourceKind: 'wood',
  resourceLevel: 6,
  ownerFactionId: 'neutral',
  requestingFactionId: 'player',
  distanceToBase: 3,
  factionPower: 500,
  resourceNeed: { wood: 9 },
  nearbyEnemyPressure: 1,
})
assert.ok(highNeed.priorityScore > lowNeed.priorityScore, 'resource shortage should raise contest priority')

const near = rankResourceTileExpansionCandidate({
  tileType: 'resource',
  resourceKind: 'stone',
  resourceLevel: 6,
  ownerFactionId: 'neutral',
  requestingFactionId: 'player',
  distanceToBase: 2,
  factionPower: 500,
  resourceNeed: { stone: 5 },
})
const far = rankResourceTileExpansionCandidate({
  tileType: 'resource',
  resourceKind: 'stone',
  resourceLevel: 6,
  ownerFactionId: 'neutral',
  requestingFactionId: 'player',
  distanceToBase: 16,
  factionPower: 500,
  resourceNeed: { stone: 5 },
})
assert.ok(near.priorityScore > far.priorityScore, 'longer march distance should lower priority')

const neutral = rankResourceTileExpansionCandidate({
  tileType: 'resource',
  resourceKind: 'iron',
  resourceLevel: 7,
  ownerFactionId: 'neutral',
  requestingFactionId: 'player',
  distanceToBase: 4,
  factionPower: 700,
  resourceNeed: { iron: 7 },
  nearbyEnemyPressure: 1,
})
const enemyRisk = rankResourceTileExpansionCandidate({
  tileType: 'resource',
  resourceKind: 'iron',
  resourceLevel: 7,
  ownerFactionId: 'enemy',
  requestingFactionId: 'player',
  distanceToBase: 4,
  factionPower: 500,
  resourceNeed: { iron: 7 },
  nearbyEnemyPressure: 8,
})
assert.equal(enemyRisk.contestState, 'enemy')
assert.ok(enemyRisk.priorityScore < neutral.priorityScore, 'enemy owned high-risk tile should reduce priority')
assert.equal(enemyRisk.shouldScout, true)
assert.equal(enemyRisk.shouldAvoid, true)

const selfOwned = buildResourceTileContestPolicyReadModel({
  tileType: 'resource',
  resourceKind: 'food',
  resourceLevel: 4,
  ownerFactionId: 'player',
  requestingFactionId: 'player',
  distanceToBase: 1,
  factionPower: 300,
  resourceNeed: { food: 8 },
})
assert.equal(selfOwned.contestState, 'self')
assert.equal(selfOwned.attackAllowed, false)
assert.equal(selfOwned.shouldContest, false)
assert.equal(selfOwned.decisionLabel, '已占')

console.log('[world_resource_tile_ai_contest_policy_contract] all checks passed')
