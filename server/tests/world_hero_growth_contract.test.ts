import assert from 'node:assert/strict'
import type { Unit, WorldState } from '../../shared/contracts/game'
import { parseWorldActionRequest, worldActionRequestSchema } from '../../shared/schemas/worldAction'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  HERO_LEVEL_MAX,
  upgradeHeroLevel,
  upgradeHeroStar,
} from '../../shared/domain/rules'
import {
  resetWorldServiceForTests,
  upgradeHeroLevelAction,
  upgradeHeroStarAction,
} from '../src/application/world/WorldService'

const PLAYER_HERO_ID = '100027'
const ENEMY_HERO_ID = '100476'

function cloneInitialWorld() {
  return structuredClone(createInitialWorldState())
}

function normalizeHeroId(heroId: string) {
  return heroId.startsWith('hero_') ? heroId.slice('hero_'.length) : heroId
}

function findHeroUnit(world: WorldState, heroId: string): Unit {
  const unit = world.units.find((candidate) => normalizeHeroId(candidate.hero.id) === normalizeHeroId(heroId))
  assert.ok(unit, `hero unit should exist: ${heroId}`)
  return unit
}

function testWorldActionSchemaMarksHeroLevelAsInternalOnly() {
  const levelParsed = worldActionRequestSchema.safeParse({
    action: 'upgradeHeroLevel',
    payload: { factionId: 'player', heroId: PLAYER_HERO_ID },
  })
  assert.equal(
    levelParsed.success,
    false,
    'upgradeHeroLevel must not be accepted by the public /api/world/action schema',
  )

  const starParsed = parseWorldActionRequest({
    action: 'upgradeHeroStar',
    payload: { factionId: 'player', heroId: PLAYER_HERO_ID },
  })
  assert.equal(starParsed.action, 'upgradeHeroStar')
}

function testUpgradeHeroLevelSuccessReturnsHeroReadModel() {
  const world = cloneInitialWorld()
  const before = findHeroUnit(world, PLAYER_HERO_ID)
  assert.equal(before.hero.level, 24)

  const result = upgradeHeroLevel(world, PLAYER_HERO_ID, 'player')

  assert.equal(result.ok, true, result.message)
  if (!result.ok) return

  const after = findHeroUnit(result.world, PLAYER_HERO_ID)
  assert.equal(after.hero.level, 25)
  assert.equal(result.hero.level, 25)
  assert.equal(result.previousLevel, 24)
  assert.equal(result.nextLevel, 25)
  assert.deepEqual(result.resourcesSpent, { actionPoints: 1, food: 2 })
}

function testUpgradeHeroLevelRejectsInsufficientResources() {
  const world = cloneInitialWorld()
  world.factions.player.actionPoints = 0

  const result = upgradeHeroLevel(world, PLAYER_HERO_ID, 'player')

  assert.equal(result.ok, false)
  assert.equal(result.failureCode, 'insufficient_resources')
}

function testUpgradeHeroLevelRejectsWrongFaction() {
  const result = upgradeHeroLevel(cloneInitialWorld(), ENEMY_HERO_ID, 'player')

  assert.equal(result.ok, false)
  assert.equal(result.failureCode, 'hero_faction_mismatch')
}

function testUpgradeHeroLevelRejectsMaxLevel() {
  const world = cloneInitialWorld()
  findHeroUnit(world, PLAYER_HERO_ID).hero.level = HERO_LEVEL_MAX

  const result = upgradeHeroLevel(world, PLAYER_HERO_ID, 'player')

  assert.equal(result.ok, false)
  assert.equal(result.failureCode, 'hero_level_at_max')
  assert.equal(result.previousLevel, HERO_LEVEL_MAX)
}

function testUpgradeHeroStarSuccessReturnsHeroReadModel() {
  const world = cloneInitialWorld()
  const result = upgradeHeroStar(world, PLAYER_HERO_ID, 'player')

  assert.equal(result.ok, true, result.message)
  if (!result.ok) return

  const after = findHeroUnit(result.world, PLAYER_HERO_ID)
  assert.equal(after.hero.starLevel, 1)
  assert.equal(result.hero.starLevel, 1)
  assert.equal(result.previousStarLevel, 0)
  assert.equal(result.nextStarLevel, 1)
  assert.equal(result.bonusPointsAwarded, 10)
  assert.deepEqual(result.resourcesSpent, { developmentPoints: 5 })
}

function testUpgradeHeroStarRejectsInsufficientMaterials() {
  const world = cloneInitialWorld()
  world.factions.player.heroCommand.developmentPoints = 0

  const result = upgradeHeroStar(world, PLAYER_HERO_ID, 'player')

  assert.equal(result.ok, false)
  assert.equal(result.failureCode, 'insufficient_materials')
}

function testUpgradeHeroStarRejectsMaxStar() {
  const world = cloneInitialWorld()
  const unit = findHeroUnit(world, PLAYER_HERO_ID)
  unit.hero.starLevel = 4

  const result = upgradeHeroStar(world, PLAYER_HERO_ID, 'player')

  assert.equal(result.ok, false)
  assert.equal(result.failureCode, 'hero_star_at_max')
  assert.equal(result.previousStarLevel, 4)
}

function testHeroGrowthServiceReceipts() {
  resetWorldServiceForTests()
  const levelResponse = upgradeHeroLevelAction(PLAYER_HERO_ID, false, 'player')
  assert.equal(levelResponse.ok, true, levelResponse.message)
  assert.equal(levelResponse.receipt?.action, 'upgradeHeroLevel')
  assert.equal(levelResponse.receipt?.internalOnly, true)
  assert.equal(levelResponse.receipt?.heroId, PLAYER_HERO_ID)
  assert.equal(levelResponse.receipt?.previousLevel, 24)
  assert.equal(levelResponse.receipt?.nextLevel, 25)
  assert.equal(levelResponse.receipt?.hero?.level, 25)

  const starResponse = upgradeHeroStarAction(PLAYER_HERO_ID, false, 'player')
  assert.equal(starResponse.ok, true, starResponse.message)
  assert.equal(starResponse.receipt?.action, 'upgradeHeroStar')
  assert.equal(starResponse.receipt?.heroId, PLAYER_HERO_ID)
  assert.equal(starResponse.receipt?.previousStarLevel, 0)
  assert.equal(starResponse.receipt?.nextStarLevel, 1)
  assert.equal(starResponse.receipt?.hero?.starLevel, 1)
}

function run() {
  testWorldActionSchemaMarksHeroLevelAsInternalOnly()
  testUpgradeHeroLevelSuccessReturnsHeroReadModel()
  testUpgradeHeroLevelRejectsInsufficientResources()
  testUpgradeHeroLevelRejectsWrongFaction()
  testUpgradeHeroLevelRejectsMaxLevel()
  testUpgradeHeroStarSuccessReturnsHeroReadModel()
  testUpgradeHeroStarRejectsInsufficientMaterials()
  testUpgradeHeroStarRejectsMaxStar()
  testHeroGrowthServiceReceipts()

  console.log('[world_hero_growth_contract] all checks passed')
}

run()
