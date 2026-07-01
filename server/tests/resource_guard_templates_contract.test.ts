import assert from 'node:assert/strict'
import { createInitialWorldState } from '../../shared/domain/scenario'
import { occupyTile } from '../../shared/domain/rules'
import {
  NPC_GUARD_UNIT_TEMPLATES,
  RESOURCE_GUARD_TEMPLATES,
  buildNpcGuardUnitsForResourceTile,
  listResourceGuardTemplates,
  resolveResourceGuardTemplateForTile,
} from '../../shared/domain/resourceGuardTemplates'

const FACTION_ID = 'player'

function seedResourceTile(level: number) {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, 'missing player faction')
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, 'missing player unit')
  const tile = world.map.tiles.find((candidate) => candidate.type === 'resource') ?? world.map.tiles[0]
  assert.ok(tile, 'missing resource tile')
  tile.type = 'resource'
  tile.owner = 'neutral'
  tile.resourceKind = 'food'
  tile.resourceLevel = level
  tile.enemyPressure = 2
  tile.moveCost = 1
  unit.tileId = tile.id
  unit.strength = 120
  unit.supply = 9
  unit.mobility = 5
  unit.status = '待命'
  faction.actionPoints = Math.max(faction.actionPoints, 5)
  faction.food = Math.max(faction.food, 5)
  return { world, faction, unit, tile }
}

function assertGuardLevelMappings() {
  assert.equal(listResourceGuardTemplates().length, 9)
  for (let level = 1; level <= 9; level += 1) {
    const template = RESOURCE_GUARD_TEMPLATES[level as keyof typeof RESOURCE_GUARD_TEMPLATES]
    assert.equal(template.resourceLevel, level)
    assert.ok(template.unitTemplateIds.length >= 1)
    assert.ok(template.unitTemplateIds.length <= 3)
    for (const unitTemplateId of template.unitTemplateIds) {
      const unitTemplate = NPC_GUARD_UNIT_TEMPLATES[unitTemplateId]
      assert.ok(unitTemplate, `missing NPC guard unit template: ${unitTemplateId}`)
      assert.ok(unitTemplate.assetKey.startsWith('npc_guard_'))
      assert.ok(unitTemplate.portraitAssetKey.startsWith('npc_guard.portrait.'))
      assert.ok(unitTemplate.mainSkill.id.startsWith('npc_guard_'))
      assert.ok(unitTemplate.mainSkill.power > 0)
    }
  }
}

function assertLowLevelResourceGuardCanBeOccupied() {
  const { world, faction, unit, tile } = seedResourceTile(1)
  const actionPointsBefore = faction.actionPoints
  const foodBefore = faction.food
  const result = occupyTile(world, {
    factionId: FACTION_ID,
    unitId: unit.id,
    tileId: tile.id,
  })
  assert.ok(result.ok)
  assert.equal(result.occupied, true)
  assert.equal(result.guardTemplateId, 'resource_guard_level_1')
  assert.equal(result.world.map.tiles.find((candidate) => candidate.id === tile.id)?.owner, FACTION_ID)
  assert.equal(result.world.factions[FACTION_ID].actionPoints, actionPointsBefore - 1)
  assert.equal(result.world.factions[FACTION_ID].food, foodBefore - 1)
  assert.equal(result.world.feedback.battleRecords[0]?.id.startsWith('resource_guard_'), true)
}

function assertHighLevelResourceGuardCanBlockWeakAttacker() {
  const { world, faction, unit, tile } = seedResourceTile(9)
  unit.strength = 35
  const actionPointsBefore = faction.actionPoints
  const foodBefore = faction.food
  const result = occupyTile(world, {
    factionId: FACTION_ID,
    unitId: unit.id,
    tileId: tile.id,
  })
  assert.ok(result.ok)
  assert.equal(result.occupied, false)
  assert.equal(result.guardTemplateId, 'resource_guard_level_9')
  assert.equal(result.guardBattle?.outcome, 'loss')
  assert.equal(result.world.map.tiles.find((candidate) => candidate.id === tile.id)?.owner, 'neutral')
  assert.equal(result.world.factions[FACTION_ID].actionPoints, actionPointsBefore - 1)
  assert.equal(result.world.factions[FACTION_ID].food, foodBefore - 1)
}

function assertGuardTemplatesConvertToNpcBattleUnits() {
  const { tile } = seedResourceTile(5)
  const template = resolveResourceGuardTemplateForTile(tile)
  assert.ok(template)
  assert.equal(template.id, 'resource_guard_level_5')
  const units = buildNpcGuardUnitsForResourceTile(tile)
  assert.equal(units.length, 3)
  for (const unit of units) {
    assert.equal(unit.faction, 'system_guard')
    assert.equal(unit.tileId, tile.id)
    assert.equal(unit.hero.traits.includes('系统守军'), true)
    assert.ok(unit.hero.portraitKey.startsWith('npc_guard.portrait.'))
    assert.ok(unit.hero.signatureSkill.name.length > 0)
  }
}

assertGuardLevelMappings()
assertLowLevelResourceGuardCanBeOccupied()
assertHighLevelResourceGuardCanBlockWeakAttacker()
assertGuardTemplatesConvertToNpcBattleUnits()

console.log('[resource_guard_templates_contract] all checks passed')
