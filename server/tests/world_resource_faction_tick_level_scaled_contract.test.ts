import assert from 'node:assert/strict'
import { advanceTick } from '../../shared/domain/rules'
import { createInitialWorldState } from '../../shared/domain/scenario'
import { computeResourceTileOngoingYield } from '../../shared/domain/resourceTileEconomy'

const world = createInitialWorldState()
const faction = world.factions.player
assert.ok(faction, 'fixture world must include player faction')

for (const tile of world.map.tiles) {
  tile.owner = 'neutral'
  tile.resourceKind = undefined
  tile.resourceLevel = undefined
}
world.units = []

const [woodLevelOneTile, woodLevelNineTile, l0PlainTile] = world.map.tiles
assert.ok(woodLevelOneTile)
assert.ok(woodLevelNineTile)
assert.ok(l0PlainTile)

Object.assign(woodLevelOneTile, {
  owner: 'player',
  type: 'resource',
  resourceKind: 'wood',
  resourceLevel: 1,
})
Object.assign(woodLevelNineTile, {
  owner: 'player',
  type: 'resource',
  resourceKind: 'wood',
  resourceLevel: 9,
})
Object.assign(l0PlainTile, {
  owner: 'player',
  type: 'plain',
  resourceKind: undefined,
  resourceLevel: undefined,
})

const before = {
  food: Number(faction.food ?? 0),
  wood: Number(faction.wood ?? 0),
  stone: Number(faction.stone ?? 0),
  iron: Number(faction.iron ?? 0),
}

const levelOneYield = computeResourceTileOngoingYield({ resourceKind: 'wood', resourceLevel: 1 }).yieldPerTick
const levelNineYield = computeResourceTileOngoingYield({ resourceKind: 'wood', resourceLevel: 9 }).yieldPerTick
assert.ok(levelNineYield > levelOneYield, 'fixture must prove L9 yield is greater than L1 yield')

const nextWorld = advanceTick(world)
const after = nextWorld.factions.player
assert.ok(after, 'advanced world must keep player faction')

assert.equal(
  Number(after.wood ?? 0) - before.wood,
  levelOneYield + levelNineYield,
  'advanceTick faction wood income must use L1 + L9 resourceEconomy yields, not default L1 or fixed output',
)
assert.equal(Number(after.stone ?? 0) - before.stone, 0, 'L0/plain substrate must not create stone income')
assert.equal(Number(after.iron ?? 0) - before.iron, 0, 'L0/plain substrate must not create iron income')
const foodDelta = Number(after.food ?? 0) - before.food
assert.ok(foodDelta >= 0, 'current food income path should remain non-negative for occupied resource tiles')
assert.notEqual(
  foodDelta,
  levelOneYield + levelNineYield,
  'food balance must not be replaced by the resourceEconomy wood curve; advanceTick still only applies extraIncome wood/stone/iron',
)

console.log('[world_resource_faction_tick_level_scaled_contract] all checks passed')
