import assert from 'node:assert/strict'
import { computeResourceIncome } from '../../shared/domain/resources'
import {
  RESOURCE_TILE_ECONOMY_MODEL_VERSION,
  buildResourceTileContestPriority,
  buildResourceTileRefreshRecoveryPolicy,
  computeResourceTileOngoingYield,
  listResourceTileEconomySpecs,
} from '../../shared/domain/resourceTileEconomy'
import {
  advanceTickAction,
  getWorldStateReadonly,
  occupyTileAction,
  resetWorldServiceForTests,
  seedProductionResourceTileActionHudFixtureAction,
} from '../src/application/world/WorldService'

const RESOURCE_KINDS = ['food', 'wood', 'stone', 'iron'] as const

for (const resourceKind of RESOURCE_KINDS) {
  let previous = 0
  for (const spec of listResourceTileEconomySpecs()) {
    const ongoing = computeResourceTileOngoingYield({
      resourceKind,
      resourceLevel: spec.tileLevel,
    })
    assert.equal(ongoing.resourceEconomyModelVersion, RESOURCE_TILE_ECONOMY_MODEL_VERSION)
    assert.equal(ongoing.occupiedResourceYieldUsesEconomyCurve, true)
    assert.equal(ongoing.resourceKind, resourceKind)
    assert.equal(ongoing.tileLevel, spec.tileLevel)
    assert.ok(ongoing.yieldPerTick > 0)
    assert.ok(
      ongoing.yieldPerTick >= previous,
      `${resourceKind} L${spec.tileLevel} ongoing yield should be monotonic`,
    )
    previous = ongoing.yieldPerTick
  }
}

const l0Income = computeResourceIncome([{ type: 'plain' }])
assert.equal(l0Income.food, 0, 'L0/plain substrate must not enter resource income')
assert.equal(l0Income.wood, 0)
assert.equal(l0Income.stone, 0)
assert.equal(l0Income.iron, 0)

const l1WoodIncome = computeResourceIncome([{ type: 'resource', resourceKind: 'wood', resourceLevel: 1 }])
const l9WoodIncome = computeResourceIncome([{ type: 'resource', resourceKind: 'wood', resourceLevel: 9 }])
assert.equal(l1WoodIncome.wood, computeResourceTileOngoingYield({ resourceKind: 'wood', resourceLevel: 1 }).yieldPerTick)
assert.equal(l9WoodIncome.wood, computeResourceTileOngoingYield({ resourceKind: 'wood', resourceLevel: 9 }).yieldPerTick)
assert.ok(l9WoodIncome.wood > l1WoodIncome.wood, 'occupied resource yield must scale by resource level')

const refreshPolicy = buildResourceTileRefreshRecoveryPolicy()
assert.equal(refreshPolicy.resourceEconomyModelVersion, RESOURCE_TILE_ECONOMY_MODEL_VERSION)
assert.equal(refreshPolicy.l0RefreshEligible, false)
assert.equal(refreshPolicy.l1L9RefreshEligible, true)
assert.deepEqual(refreshPolicy.resourceTileLevels, [1, 2, 3, 4, 5, 6, 7, 8, 9])
assert.equal(refreshPolicy.exhaustedTileRecoveryPerIntervalPercent > 0, true)

const lowContest = buildResourceTileContestPriority({
  resourceKind: 'wood',
  resourceLevel: 1,
  distanceFromAiHome: 5,
})
const highContest = buildResourceTileContestPriority({
  resourceKind: 'wood',
  resourceLevel: 9,
  distanceFromAiHome: 5,
})
assert.equal(lowContest.resourceEconomyModelVersion, RESOURCE_TILE_ECONOMY_MODEL_VERSION)
assert.equal(lowContest.aiContestHookAvailable, true)
assert.ok(highContest.contestPriority > lowContest.contestPriority)
assert.ok(highContest.candidateWeight > lowContest.candidateWeight)

resetWorldServiceForTests()
const initialWorld = getWorldStateReadonly()
const woodTile = initialWorld.map.tiles
  .filter((tile) =>
    tile.type === 'resource' &&
    tile.resourceKind === 'wood' &&
    Number(tile.resourceLevel ?? 0) >= 1 &&
    Number(tile.resourceLevel ?? 0) <= 9
  )
  .sort((left, right) => Number(right.resourceLevel ?? 0) - Number(left.resourceLevel ?? 0))[0]
assert.ok(woodTile, 'generated world must contain at least one L1-L9 wood resource tile')

const seeded = seedProductionResourceTileActionHudFixtureAction({
  factionId: 'player',
  tileId: woodTile.id,
}, true)
assert.equal(seeded.ok, true)
assert.ok(seeded.seededProductionResourceTileActionHudFixture)
const fixture = seeded.seededProductionResourceTileActionHudFixture
assert.equal(fixture.resourceKind, 'wood')

const settlement = occupyTileAction({
  factionId: 'player',
  unitId: fixture.unitId,
  tileId: fixture.tileId,
}, true)
assert.equal(settlement.ok, true)
assert.equal(settlement.receipt?.resourceEconomyModelVersion, RESOURCE_TILE_ECONOMY_MODEL_VERSION)

const beforeAdvance = getWorldStateReadonly().factions.player
const expectedYield = computeResourceTileOngoingYield({
  resourceKind: 'wood',
  resourceLevel: fixture.tileLevel,
})
const advanced = await advanceTickAction(false)
assert.equal(advanced.ok, true)
const afterAdvance = getWorldStateReadonly().factions.player
const woodBeforeAdvance = Number(beforeAdvance.wood ?? 0)
const woodAfterAdvance = Number(afterAdvance.wood ?? 0)
assert.ok(
  woodAfterAdvance >= woodBeforeAdvance + expectedYield.yieldPerTick,
  `advanceTickAction should settle level-scaled wood yield: before=${woodBeforeAdvance} after=${woodAfterAdvance} expected>=${expectedYield.yieldPerTick}`,
)

console.log('[world_resource_occupied_yield_economy_contract] all checks passed')
