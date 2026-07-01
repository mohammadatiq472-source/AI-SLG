import assert from 'node:assert/strict'
import type { WorldState } from '../../shared/contracts/game'
import { parseWorldActionRequest } from '../../shared/schemas/worldAction'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  upgradeTacticalSkill,
} from '../../shared/domain/rules'
import {
  resetWorldServiceForTests,
  upgradeTacticalSkillAction,
} from '../src/application/world/WorldService'

const ZHANG_LIAO_HERO_ID = '100027'
const ZHANG_LIAO_EQUIPPED_SKILL_ID = 'lib_s_chase_rending_charge'
const ZHANG_LIAO_OTHER_EQUIPPED_SKILL_ID = 'lib_s_active_fire_raid'
const UNEQUIPPED_SKILL_ID = 'lib_s_command_battle_banner'

function playerSkillSlots(world: WorldState) {
  const slots = world.slgDomainState?.generalStateByFaction?.player?.tacticalSkillSlotsByHeroId
  assert.ok(slots, 'player tactical skill slots should exist')
  return slots
}

function zhangLiaoSlot(world: WorldState) {
  const slot = playerSkillSlots(world)[ZHANG_LIAO_HERO_ID]
  assert.ok(slot, 'Zhang Liao tactical skill slot should exist')
  return slot
}

function cloneInitialWorld() {
  return structuredClone(createInitialWorldState())
}

function fundTacticalSkillUpgrade(world: WorldState, copper = 600) {
  world.factions.player.copper = copper
}

function testWorldActionSchemaAcceptsUpgradeTacticalSkill() {
  const parsed = parseWorldActionRequest({
    action: 'upgradeTacticalSkill',
    payload: {
      factionId: 'player',
      heroId: ZHANG_LIAO_HERO_ID,
      skillId: ZHANG_LIAO_EQUIPPED_SKILL_ID,
    },
  })

  assert.equal(parsed.action, 'upgradeTacticalSkill')
}

function testUpgradeTacticalSkillSuccessOnlyUpdatesEquippedLevelAuthority() {
  const world = cloneInitialWorld()
  fundTacticalSkillUpgrade(world)
  const beforeSlot = zhangLiaoSlot(world)
  assert.equal(beforeSlot.equippedSkillLevelsById?.[ZHANG_LIAO_EQUIPPED_SKILL_ID], 5)
  assert.equal(beforeSlot.equippedSkillLevelsById?.[ZHANG_LIAO_OTHER_EQUIPPED_SKILL_ID], 7)

  const result = upgradeTacticalSkill(world, ZHANG_LIAO_HERO_ID, ZHANG_LIAO_EQUIPPED_SKILL_ID, 'player')

  assert.equal(result.ok, true, result.message)
  if (!result.ok) return

  const afterSlot = zhangLiaoSlot(result.world)
  assert.equal(afterSlot.equippedSkillLevelsById?.[ZHANG_LIAO_EQUIPPED_SKILL_ID], 6)
  assert.equal(
    afterSlot.equippedSkillLevelsById?.[ZHANG_LIAO_OTHER_EQUIPPED_SKILL_ID],
    7,
    'upgrading one equipped skill must not rewrite sibling equipped skill levels',
  )
  assert.equal(result.heroId, ZHANG_LIAO_HERO_ID)
  assert.equal(result.skillId, ZHANG_LIAO_EQUIPPED_SKILL_ID)
  assert.equal(result.previousLevel, 5)
  assert.equal(result.nextLevel, 6)
  assert.deepEqual(result.resourcesSpent, { copper: 600 })
  assert.equal(result.world.factions.player.copper, 0, 'tactical skill upgrade should spend copper money')
}

function testUpgradeTacticalSkillRejectsInsufficientCopper() {
  const world = cloneInitialWorld()
  fundTacticalSkillUpgrade(world, 599)

  const result = upgradeTacticalSkill(world, ZHANG_LIAO_HERO_ID, ZHANG_LIAO_EQUIPPED_SKILL_ID, 'player')

  assert.equal(result.ok, false)
  assert.equal(result.failureCode, 'insufficient_resources')
  assert.equal(result.previousLevel, 5)
  assert.deepEqual(result.resourcesSpent, { copper: 600 })
}

function testUpgradeTacticalSkillRejectsUnequippedSkill() {
  const result = upgradeTacticalSkill(cloneInitialWorld(), ZHANG_LIAO_HERO_ID, UNEQUIPPED_SKILL_ID, 'player')

  assert.equal(result.ok, false)
  assert.equal(result.failureCode, 'skill_not_equipped')
  assert.equal(result.heroId, ZHANG_LIAO_HERO_ID)
  assert.equal(result.skillId, UNEQUIPPED_SKILL_ID)
}

function testUpgradeTacticalSkillRejectsMissingEquippedLevel() {
  const world = cloneInitialWorld()
  const slot = zhangLiaoSlot(world)
  delete slot.equippedSkillLevelsById?.[ZHANG_LIAO_EQUIPPED_SKILL_ID]

  const result = upgradeTacticalSkill(world, ZHANG_LIAO_HERO_ID, ZHANG_LIAO_EQUIPPED_SKILL_ID, 'player')

  assert.equal(result.ok, false)
  assert.equal(result.failureCode, 'missing_skill_level')
}

function testUpgradeTacticalSkillRejectsMaxLevel() {
  const world = cloneInitialWorld()
  const slot = zhangLiaoSlot(world)
  slot.equippedSkillLevelsById ??= {}
  slot.equippedSkillLevelsById[ZHANG_LIAO_EQUIPPED_SKILL_ID] = 10

  const result = upgradeTacticalSkill(world, ZHANG_LIAO_HERO_ID, ZHANG_LIAO_EQUIPPED_SKILL_ID, 'player')

  assert.equal(result.ok, false)
  assert.equal(result.failureCode, 'skill_level_at_max')
  assert.equal(result.previousLevel, 10)
}

function testUpgradeTacticalSkillRejectsOutOfRangeLevel() {
  const world = cloneInitialWorld()
  const slot = zhangLiaoSlot(world)
  slot.equippedSkillLevelsById ??= {}
  slot.equippedSkillLevelsById[ZHANG_LIAO_EQUIPPED_SKILL_ID] = 11

  const result = upgradeTacticalSkill(world, ZHANG_LIAO_HERO_ID, ZHANG_LIAO_EQUIPPED_SKILL_ID, 'player')

  assert.equal(result.ok, false)
  assert.equal(result.failureCode, 'skill_level_out_of_range')
}

function testUpgradeTacticalSkillRejectsWrongFaction() {
  const result = upgradeTacticalSkill(
    cloneInitialWorld(),
    ZHANG_LIAO_HERO_ID,
    ZHANG_LIAO_EQUIPPED_SKILL_ID,
    'enemy',
  )

  assert.equal(result.ok, false)
  assert.equal(result.failureCode, 'hero_faction_mismatch')
}

function testUpgradeTacticalSkillServiceReceipt() {
  resetWorldServiceForTests()
  const response = upgradeTacticalSkillAction(ZHANG_LIAO_HERO_ID, ZHANG_LIAO_EQUIPPED_SKILL_ID, false, 'player')

  assert.equal(response.ok, true, response.message)
  assert.equal(response.world, undefined, 'includeWorld=false should keep the service receipt compact')
  assert.equal(response.heroId, ZHANG_LIAO_HERO_ID)
  assert.equal(response.receipt?.action, 'upgradeTacticalSkill')
  assert.equal(response.receipt?.heroId, ZHANG_LIAO_HERO_ID)
  assert.equal(response.receipt?.skillId, ZHANG_LIAO_EQUIPPED_SKILL_ID)
  assert.equal(response.receipt?.previousLevel, 5)
  assert.equal(response.receipt?.nextLevel, 6)
  assert.deepEqual(response.receipt?.resourcesSpent, { copper: 600 })
  assert.equal(response.receipt?.failureCode, undefined)
}

function run() {
  testWorldActionSchemaAcceptsUpgradeTacticalSkill()
  testUpgradeTacticalSkillSuccessOnlyUpdatesEquippedLevelAuthority()
  testUpgradeTacticalSkillRejectsInsufficientCopper()
  testUpgradeTacticalSkillRejectsUnequippedSkill()
  testUpgradeTacticalSkillRejectsMissingEquippedLevel()
  testUpgradeTacticalSkillRejectsMaxLevel()
  testUpgradeTacticalSkillRejectsOutOfRangeLevel()
  testUpgradeTacticalSkillRejectsWrongFaction()
  testUpgradeTacticalSkillServiceReceipt()

  console.log('[world_tactical_skill_upgrade_contract] all checks passed')
}

run()
