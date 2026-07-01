import assert from 'node:assert/strict'
import { createInitialWorldState } from '../../shared/domain/scenario'
import { occupyTile } from '../../shared/domain/rules'

const world = createInitialWorldState()
const factionId = Object.keys(world.factions)[0]
assert.ok(factionId, 'initial world should expose a controllable faction')
const faction = world.factions[factionId]
assert.ok(faction, `missing faction ${factionId}`)
const unit = world.units.find((candidate) => candidate.faction === factionId)
assert.ok(unit, `missing unit for faction ${factionId}`)
const resourceTile = world.map.tiles.find((tile) => tile.type === 'resource')
assert.ok(resourceTile, 'initial world should expose a resource tile')

function expectedBattleReportStarCount(quality: string) {
  if (quality === '4-SR') {
    return 5
  }
  return Number(String(quality).split('-', 1)[0])
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  assert.ok(value && typeof value === 'object', `${label} should be an object`)
  return value as Record<string, unknown>
}

function asNumber(value: unknown, label: string): number {
  assert.equal(typeof value, 'number', `${label} should be a number`)
  return value as number
}

function expectHeroSlotTroops(slot: unknown, label: string) {
  const heroSlot = asRecord(slot, label)
  assert.ok(asNumber(heroSlot.currentTroops, `${label}.currentTroops`) >= 0)
  assert.ok(asNumber(heroSlot.maxTroops, `${label}.maxTroops`) >= asNumber(heroSlot.currentTroops, `${label}.currentTroops`))
  assert.equal(
    asNumber(heroSlot.lossTroops, `${label}.lossTroops`),
    asNumber(heroSlot.maxTroops, `${label}.maxTroops`) - asNumber(heroSlot.currentTroops, `${label}.currentTroops`),
    `${label} loss should match max-current`,
  )
}

function expectUnitTroops(unitModel: unknown, expectedCurrent: number, expectedMax: number, expectedLoss: number, label: string) {
  const model = asRecord(unitModel, label)
  assert.equal(asNumber(model.currentTroops, `${label}.currentTroops`), expectedCurrent)
  assert.equal(asNumber(model.maxTroops, `${label}.maxTroops`), expectedMax)
  assert.equal(asNumber(model.lossTroops, `${label}.lossTroops`), expectedLoss)
  const slots = [model.hero, ...((model.coHeroes as unknown[] | undefined) ?? [])]
  assert.ok(slots.length >= 1, `${label} should expose at least one hero troop slot`)
  for (const [index, slot] of slots.entries()) {
    expectHeroSlotTroops(slot, `${label}.slot${index}`)
  }
  assert.equal(slots.reduce<number>((sum, slot) => sum + asNumber(asRecord(slot, `${label}.slot`).currentTroops, `${label}.slot.currentTroops`), 0), expectedCurrent)
  assert.equal(slots.reduce<number>((sum, slot) => sum + asNumber(asRecord(slot, `${label}.slot`).maxTroops, `${label}.slot.maxTroops`), 0), expectedMax)
  assert.equal(slots.reduce<number>((sum, slot) => sum + asNumber(asRecord(slot, `${label}.slot`).lossTroops, `${label}.slot.lossTroops`), 0), expectedLoss)
}

world.tick = 46
world.feedback.battleRecords = []
world.executions = {}
faction.actionPoints = Math.max(faction.actionPoints, 8)
faction.food = Math.max(faction.food, 8)
resourceTile.owner = 'neutral'
resourceTile.resourceLevel = 1
resourceTile.enemyPressure = 1
unit.tileId = resourceTile.id
unit.strength = 520
unit.supply = 6
unit.mobility = Math.max(unit.mobility, 18)
unit.status = '待命'
unit.currentTask = undefined
unit.coHeroes = [
  {
    id: 'co_hero_alpha',
    name: '副将甲',
    faction: '蜀',
    cardType: '弓',
    quality: '4-SR',
    archetype: 'recon',
    level: 28,
    troopType: 'infantry',
    avatarKey: 'hero-avatar-co-alpha',
    portraitKey: 'hero-portrait-co-alpha',
    force: 74,
    command: 71,
    intelligence: 79,
    charisma: 66,
    speed: 82,
    signatureSkill: {
      name: '奇袭破阵',
      detail: '副将甲触发奇袭压制敌军前锋。',
    },
  },
  {
    id: 'co_hero_beta',
    name: '副将乙',
    faction: '吴',
    cardType: '骑',
    quality: '3-R',
    archetype: 'mobile',
    level: 25,
    troopType: 'cavalry',
    avatarKey: 'hero-avatar-co-beta',
    portraitKey: 'hero-portrait-co-beta',
    force: 71,
    command: 68,
    intelligence: 70,
    charisma: 64,
    speed: 86,
    signatureSkill: {
      name: '疾风突进',
      detail: '副将乙发动冲锋牵制。',
    },
  },
]

const result = occupyTile(world, {
  factionId,
  unitId: unit.id,
  tileId: resourceTile.id,
})

assert.equal(result.ok, true, `occupyTile should resolve the resource guard battle: ${'message' in result ? result.message : ''}`)
assert.equal(result.occupied, true, 'seeded attacker should defeat the level 1 resource guard')

const record = result.world.feedback.battleRecords[0] as Record<string, unknown>
assert.ok(record, 'resource guard battle should prepend a battle record')
assert.equal(record.id, `resource_guard_${world.tick}_${unit.id}_${resourceTile.id}`)
assert.equal(record.reportKind, 'resource_guard')
assert.equal(record.tick, world.tick)
assert.equal(record.tileId, resourceTile.id)
assert.equal(record.tileX, resourceTile.x)
assert.equal(record.tileY, resourceTile.y)
assert.equal(record.attacker, unit.name)
assert.equal(record.outcome, 'win')
assert.equal(record.result, '胜')
assert.equal(typeof record.time, 'string')
assert.match(String(record.time), /46/)
assert.match(String(record.location), new RegExp(resourceTile.name))
assert.ok(String(record.defender).length > 0, 'battle report should expose a defender display name')
assert.equal(record.attackerTroops, record.attackerStrengthAfter)
assert.equal(record.attackerMaxTroops, record.attackerStrengthBefore)
assert.equal(record.defenderTroops, record.defenderStrengthAfter)
assert.equal(record.defenderMaxTroops, record.defenderStrengthBefore)
assert.equal(record.attackerLoss, Number(record.attackerStrengthBefore) - Number(record.attackerStrengthAfter))
assert.equal(record.defenderLoss, Number(record.defenderStrengthBefore) - Number(record.defenderStrengthAfter))

const attackerHeroSlot = record.attackerHeroSlot as Record<string, unknown>
assert.ok(attackerHeroSlot, 'battle report should expose attackerHeroSlot')
assert.equal(attackerHeroSlot.heroId, unit.hero.id)
assert.equal(attackerHeroSlot.name, unit.hero.name)
assert.equal(attackerHeroSlot.level, unit.hero.level)
assert.equal(attackerHeroSlot.quality, unit.hero.quality)
assert.equal(attackerHeroSlot.starCount, expectedBattleReportStarCount(unit.hero.quality))
assert.equal(attackerHeroSlot.faction, unit.hero.faction)
assert.equal(attackerHeroSlot.factionLabel, unit.hero.faction)
assert.equal(attackerHeroSlot.cardType, unit.hero.cardType)
assert.equal(attackerHeroSlot.avatarKey, unit.hero.avatarKey)
assert.equal(attackerHeroSlot.portraitKey, unit.hero.portraitKey)
assert.equal(attackerHeroSlot.portraitAssetKey, unit.hero.portraitKey)
assert.equal(attackerHeroSlot.signatureSkillName, unit.hero.signatureSkill.name)
assert.equal(attackerHeroSlot.mainSkillName, unit.hero.signatureSkill.name)

const attackerUnit = record.attackerUnit as Record<string, unknown>
assert.ok(attackerUnit, 'battle report should expose attackerUnit')
assert.equal(attackerUnit.unitId, unit.id)
assert.equal(attackerUnit.name, unit.name)
expectUnitTroops(
  attackerUnit,
  Number(record.attackerTroops),
  Number(record.attackerMaxTroops),
  Number(record.attackerLoss),
  'attackerUnit',
)
const attackerCoHeroes = attackerUnit.coHeroes as unknown[]
assert.ok(Array.isArray(attackerCoHeroes), 'battle report attacker unit should expose coHeroes list')
assert.equal(attackerCoHeroes.length, 2)
const firstAttackerCoHero = attackerCoHeroes[0] as Record<string, unknown>
assert.equal(firstAttackerCoHero.heroId, unit.coHeroes?.[0]?.id)
assert.equal(firstAttackerCoHero.name, unit.coHeroes?.[0]?.name)
assert.equal(firstAttackerCoHero.quality, unit.coHeroes?.[0]?.quality)
assert.equal(firstAttackerCoHero.starCount, 5, 'legacy 4-SR co-hero should map to 5 stars in battle report read model')
assert.equal(firstAttackerCoHero.faction, unit.coHeroes?.[0]?.faction)
assert.equal(firstAttackerCoHero.factionLabel, unit.coHeroes?.[0]?.faction)
assert.equal(firstAttackerCoHero.cardType, unit.coHeroes?.[0]?.cardType)
assert.equal(firstAttackerCoHero.avatarKey, unit.coHeroes?.[0]?.avatarKey)
assert.equal(firstAttackerCoHero.portraitKey, unit.coHeroes?.[0]?.portraitKey)
assert.equal(firstAttackerCoHero.portraitAssetKey, unit.coHeroes?.[0]?.portraitKey)
assert.equal(firstAttackerCoHero.signatureSkillName, unit.coHeroes?.[0]?.signatureSkill.name)
assert.equal(firstAttackerCoHero.mainSkillName, unit.coHeroes?.[0]?.signatureSkill.name)

const defenderUnits = record.defenderUnits as unknown[]
assert.ok(Array.isArray(defenderUnits), 'battle report should expose defenderUnits list')
assert.ok(defenderUnits.length >= 1, 'resource guard battle should expose at least one defender unit snapshot')
assert.equal(
  defenderUnits.reduce<number>((sum, defenderUnit) => sum + asNumber(asRecord(defenderUnit, 'defenderUnit').currentTroops, 'defenderUnit.currentTroops'), 0),
  Number(record.defenderTroops),
)
assert.equal(
  defenderUnits.reduce<number>((sum, defenderUnit) => sum + asNumber(asRecord(defenderUnit, 'defenderUnit').maxTroops, 'defenderUnit.maxTroops'), 0),
  Number(record.defenderMaxTroops),
)
assert.equal(
  defenderUnits.reduce<number>((sum, defenderUnit) => sum + asNumber(asRecord(defenderUnit, 'defenderUnit').lossTroops, 'defenderUnit.lossTroops'), 0),
  Number(record.defenderLoss),
)
const firstDefender = defenderUnits[0] as Record<string, unknown>
expectHeroSlotTroops(firstDefender.hero, 'firstDefender.hero')
const firstDefenderHero = firstDefender.hero as Record<string, unknown>
assert.ok(String(firstDefenderHero.heroId ?? '').startsWith('npc_'))
assert.ok(String(firstDefenderHero.name ?? '').length > 0)
assert.ok(Number(firstDefenderHero.level) >= 1)
assert.equal(firstDefenderHero.faction, '群')
assert.equal(firstDefenderHero.factionLabel, '群')
assert.ok(String(firstDefenderHero.cardType ?? '').length > 0)
assert.ok(String(firstDefenderHero.portraitKey ?? '').length > 0)
assert.ok(String(firstDefenderHero.avatarKey ?? '').length > 0)
assert.ok(String(firstDefenderHero.portraitAssetKey ?? '').length > 0)
assert.ok(String(firstDefenderHero.mainSkillName ?? '').length > 0)
assert.equal(Array.isArray(firstDefender.coHeroes), true)
assert.equal((firstDefender.coHeroes as unknown[]).length, 0, 'resource guard defender unit should keep coHeroes empty')

const rounds = record.rounds
assert.ok(Array.isArray(rounds), 'battle report should expose tactical round details')
assert.ok(rounds.length >= 1, 'battle report should include at least one round detail')
const firstRound = rounds[0] as Record<string, unknown>
assert.equal(firstRound.round, 1)
assert.match(String(firstRound.title), /回合|守军/)
assert.match(String(firstRound.summary), /守军|战法|击破|受阻/)
const events = firstRound.events
assert.ok(Array.isArray(events), 'round details should expose event rows')
assert.ok(events.length >= 1, 'round details should include at least one event')
assert.ok(
  events.some((event) => {
    const view = event as Record<string, unknown>
    return String(view.skillName ?? '').length > 0 || String(view.summary ?? '').includes('战法')
  }),
  'round details should include at least one skill or tactic event',
)

console.log('[battle_report_read_model_contract] all checks passed')
