import assert from 'node:assert/strict'
import { createInitialWorldState } from '../../shared/domain/scenario'
import { occupyTile } from '../../shared/domain/rules'
import type { Unit } from '../../shared/contracts/game/world'
import type { BattleOutcomeRecord } from '../../shared/contracts/game/history'

function mustFindResourceTileIds(count: number, allTileIds: string[]): string[] {
  assert.ok(allTileIds.length >= count, `expected at least ${count} resource tiles, got ${allTileIds.length}`)
  return allTileIds.slice(0, count)
}

function setupAttackerForBattle(unit: Unit, tileId: string) {
  unit.tileId = tileId
  unit.strength = Math.max(unit.strength, 820)
  unit.supply = Math.max(unit.supply, 8)
  unit.mobility = Math.max(unit.mobility, 20)
  unit.status = '待命'
  unit.currentTask = undefined
  unit.corps.readiness = Math.max(unit.corps.readiness, 90)
}

function runResourceGuardBattle(world: ReturnType<typeof createInitialWorldState>, params: {
  factionId: 'player' | 'enemy'
  unitId: string
  tileId: string
}) {
  const unit = world.units.find((candidate) => candidate.id === params.unitId)
  const tile = world.map.tiles.find((candidate) => candidate.id === params.tileId)
  assert.ok(unit, `missing unit ${params.unitId}`)
  assert.ok(tile, `missing tile ${params.tileId}`)
  tile.owner = 'neutral'
  tile.enemyPressure = 1
  tile.resourceLevel = 1
  setupAttackerForBattle(unit, tile.id)
  return occupyTile(world, {
    factionId: params.factionId,
    unitId: unit.id,
    tileId: tile.id,
  })
}

function expectCommonBattleReportFields(record: BattleOutcomeRecord) {
  assert.ok(record.id.length > 0, 'battle record should include id')
  assert.ok(record.summary.length > 0, 'battle record should include summary')
  assert.ok(record.result === '胜' || record.result === '败' || record.result === '平', 'battle record should include result text')
  assert.ok(typeof record.time === 'string' && record.time.length > 0, 'battle record should include time')
  assert.ok(typeof record.attacker === 'string' && record.attacker.length > 0, 'battle record should include attacker')
  assert.ok(typeof record.defender === 'string' && record.defender.length > 0, 'battle record should include defender')
  assert.ok(typeof record.region === 'string' && record.region.length > 0, 'battle record should include region label')
  assert.ok(Number(record.attackerTroops) >= 0, 'battle record should include attacker troops')
  assert.ok(Number(record.attackerMaxTroops) >= Number(record.attackerTroops), 'battle record should include attacker max troops')
  assert.ok(Number(record.defenderTroops) >= 0, 'battle record should include defender troops')
  assert.ok(Number(record.defenderMaxTroops) >= Number(record.defenderTroops), 'battle record should include defender max troops')
}

function readNumber(value: unknown, label: string): number {
  assert.equal(typeof value, 'number', `${label} should be a number`)
  return value as number
}

function expectUnitSlotTroopFields(unitModel: unknown, label: string) {
  assert.ok(unitModel && typeof unitModel === 'object', `${label} should be an object`)
  const model = unitModel as Record<string, unknown>
  assert.ok(readNumber(model.currentTroops, `${label}.currentTroops`) >= 0)
  assert.ok(readNumber(model.maxTroops, `${label}.maxTroops`) >= readNumber(model.currentTroops, `${label}.currentTroops`))
  assert.equal(
    readNumber(model.lossTroops, `${label}.lossTroops`),
    readNumber(model.maxTroops, `${label}.maxTroops`) - readNumber(model.currentTroops, `${label}.currentTroops`),
  )
  const slots = [model.hero, ...((model.coHeroes as unknown[] | undefined) ?? [])]
  assert.ok(slots.length >= 1, `${label} should expose hero troop slots`)
  assert.equal(
    slots.reduce<number>((sum, slot) => sum + readNumber((slot as Record<string, unknown>).currentTroops, `${label}.slot.currentTroops`), 0),
    readNumber(model.currentTroops, `${label}.currentTroops`),
  )
  assert.equal(
    slots.reduce<number>((sum, slot) => sum + readNumber((slot as Record<string, unknown>).maxTroops, `${label}.slot.maxTroops`), 0),
    readNumber(model.maxTroops, `${label}.maxTroops`),
  )
  assert.equal(
    slots.reduce<number>((sum, slot) => sum + readNumber((slot as Record<string, unknown>).lossTroops, `${label}.slot.lossTroops`), 0),
    readNumber(model.lossTroops, `${label}.lossTroops`),
  )
}

let world = createInitialWorldState()
world.feedback.battleRecords = []
world.tick = 120

const resourceTileIds = mustFindResourceTileIds(
  3,
  world.map.tiles.filter((tile) => tile.type === 'resource').map((tile) => tile.id),
)

const playerFaction = world.factions.player
const enemyFaction = world.factions.enemy
assert.ok(playerFaction, 'player faction should exist')
assert.ok(enemyFaction, 'enemy faction should exist')

const playerUnits = world.units.filter((unit) => unit.faction === 'player')
const enemyUnits = world.units.filter((unit) => unit.faction === 'enemy')
assert.ok(playerUnits.length >= 2, 'player faction should expose at least two units')
assert.ok(enemyUnits.length >= 1, 'enemy faction should expose at least one unit')

const humanUnit = playerUnits[0]
const aiUnit = playerUnits[1]
const organizationUnit = enemyUnits[0]
assert.ok(humanUnit && aiUnit && organizationUnit, 'test units must exist')

aiUnit.aiPlayerId = 'ai_player_backend_report_alpha'
playerFaction.aiPlayers = [
  {
    id: 'ai_player_backend_report_alpha',
    name: '后勤甲组',
    factionId: 'player',
    unitIds: [aiUnit.id],
    specialty: 'logistics',
  },
]

enemyFaction.organizationId = 'org_enemy_nation_01'
enemyFaction.organizationName = '赤垒国'
enemyFaction.organizationKind = 'nation'

playerFaction.actionPoints = Math.max(playerFaction.actionPoints, 20)
playerFaction.food = Math.max(playerFaction.food, 20)
enemyFaction.actionPoints = Math.max(enemyFaction.actionPoints, 20)
enemyFaction.food = Math.max(enemyFaction.food, 20)

const humanResult = runResourceGuardBattle(world, {
  factionId: 'player',
  unitId: humanUnit.id,
  tileId: resourceTileIds[0],
})
assert.equal(humanResult.ok, true, `human battle should resolve: ${'message' in humanResult ? humanResult.message : ''}`)
assert.equal(humanResult.occupied, true, 'human battle should occupy resource tile')
world = humanResult.world
world.tick += 1

const aiResult = runResourceGuardBattle(world, {
  factionId: 'player',
  unitId: aiUnit.id,
  tileId: resourceTileIds[1],
})
assert.equal(aiResult.ok, true, `ai battle should resolve: ${'message' in aiResult ? aiResult.message : ''}`)
assert.equal(aiResult.occupied, true, 'ai battle should occupy resource tile')
world = aiResult.world
world.tick += 1

const organizationResult = runResourceGuardBattle(world, {
  factionId: 'enemy',
  unitId: organizationUnit.id,
  tileId: resourceTileIds[2],
})
assert.equal(organizationResult.ok, true, `organization battle should resolve: ${'message' in organizationResult ? organizationResult.message : ''}`)
assert.equal(organizationResult.occupied, true, 'organization battle should occupy resource tile')
world = organizationResult.world

const records = world.feedback.battleRecords
assert.ok(records.length >= 3, `expected at least 3 battle records, got ${records.length}`)

const humanRecord = records.find((record) => record.attackerUnitId === humanUnit.id)
const aiRecord = records.find((record) => record.attackerUnitId === aiUnit.id)
const organizationRecord = records.find((record) => record.attackerUnitId === organizationUnit.id)
assert.ok(humanRecord, 'missing human player battle record')
assert.ok(aiRecord, 'missing ai player battle record')
assert.ok(organizationRecord, 'missing organization battle record')

expectCommonBattleReportFields(humanRecord)
expectCommonBattleReportFields(aiRecord)
expectCommonBattleReportFields(organizationRecord)
expectUnitSlotTroopFields(humanRecord.attackerUnit, 'humanRecord.attackerUnit')
expectUnitSlotTroopFields(aiRecord.attackerUnit, 'aiRecord.attackerUnit')
expectUnitSlotTroopFields(organizationRecord.attackerUnit, 'organizationRecord.attackerUnit')

assert.equal(humanRecord.ownerFactionId, 'player', 'human battle should expose ownerFactionId for personal filtering')
assert.equal(humanRecord.attackerFaction, 'player')
assert.equal(humanRecord.aiPlayerId ?? '', '', 'human battle should not expose ai player ownership')

assert.equal(aiRecord.ownerFactionId, 'player', 'ai battle should still belong to player faction')
assert.equal(aiRecord.attackerFaction, 'player')
assert.equal(aiRecord.aiPlayerId, 'ai_player_backend_report_alpha', 'ai battle should expose aiPlayerId')
assert.equal(aiRecord.attackerAiPlayerId, 'ai_player_backend_report_alpha', 'ai battle should expose attackerAiPlayerId')

assert.equal(organizationRecord.ownerFactionId, 'enemy', 'organization battle should expose ownerFactionId')
assert.equal(organizationRecord.attackerFaction, 'enemy')
assert.equal(organizationRecord.organizationId, 'org_enemy_nation_01', 'organization battle should expose organizationId')
assert.equal(organizationRecord.organizationName, '赤垒国', 'organization battle should expose organizationName')
assert.equal(organizationRecord.organizationKind, 'nation', 'organization battle should expose organizationKind')

console.log('[battle_report_real_data_owner_filter_contract] all checks passed')
