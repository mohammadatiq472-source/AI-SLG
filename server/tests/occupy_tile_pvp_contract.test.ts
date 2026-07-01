import assert from 'node:assert/strict'
import type { Unit } from '../../shared/contracts/game'
import { createInitialWorldState } from '../../shared/domain/scenario'
import { occupyTile } from '../../shared/domain/rules'

const PLAYER_FACTION_ID = 'player'
const ENEMY_FACTION_ID = 'enemy'

function seedPlainTarget() {
  const world = createInitialWorldState()
  const faction = world.factions[PLAYER_FACTION_ID]
  assert.ok(faction, 'missing player faction')
  const attacker = world.units.find((candidate) => candidate.faction === PLAYER_FACTION_ID)
  assert.ok(attacker, 'missing player unit')
  const tile = world.map.tiles.find((candidate) => candidate.type === 'plain')
    ?? world.map.tiles.find((candidate) => candidate.type !== 'city' && candidate.type !== 'fog')
  assert.ok(tile, 'missing occupiable tile')

  tile.type = 'plain'
  tile.terrain = 'grassland'
  tile.owner = 'neutral'
  tile.enemyPressure = 2
  tile.moveCost = 1
  attacker.tileId = tile.id
  attacker.status = '待命'
  attacker.currentTask = undefined
  attacker.strength = 480
  attacker.supply = 8
  attacker.mobility = Math.max(attacker.mobility, 20)
  attacker.corps.readiness = 100
  faction.actionPoints = Math.max(faction.actionPoints, 6)
  faction.food = Math.max(faction.food, 6)
  world.feedback.battleRecords = []
  return { world, faction, attacker, tile }
}

function cloneDefenderFrom(attacker: Unit, tileId: string): Unit {
  const defender: Unit = structuredClone(attacker)
  defender.id = 'occupy_tile_pvp_defender'
  defender.name = 'Enemy Guard Unit'
  defender.faction = ENEMY_FACTION_ID
  defender.tileId = tileId
  defender.status = '驻防中'
  defender.currentTask = 'Hold occupied tile'
  defender.strength = 35
  defender.supply = 4
  defender.mobility = 8
  defender.corps = {
    ...defender.corps,
    name: 'Enemy Guard Corps',
    readiness: 80,
    roster: ['front guard'],
  }
  defender.hero = {
    ...defender.hero,
    id: 'hero_occupy_tile_pvp_defender',
    name: 'Enemy Guard',
    force: 45,
    command: 42,
    intelligence: 40,
    charisma: 40,
    speed: 38,
    signatureSkill: {
      name: 'Guard Counter',
      detail: 'Basic occupied tile defense.',
    },
  }
  return defender
}

function testNeutralTileOccupyRemainsUnchanged() {
  const { world, faction, attacker, tile } = seedPlainTarget()
  const actionPointsBefore = faction.actionPoints
  const foodBefore = faction.food

  const result = occupyTile(world, {
    factionId: PLAYER_FACTION_ID,
    unitId: attacker.id,
    tileId: tile.id,
  })

  assert.equal(result.ok, true, `neutral occupy should still succeed: ${result.message}`)
  if (!result.ok) return
  assert.equal(result.occupied, true)
  assert.equal(result.previousOwner, 'neutral')
  assert.equal(result.world.map.tiles.find((candidate) => candidate.id === tile.id)?.owner, PLAYER_FACTION_ID)
  assert.equal(result.world.factions[PLAYER_FACTION_ID].actionPoints, actionPointsBefore - 1)
  assert.equal(result.world.factions[PLAYER_FACTION_ID].food, foodBefore - 1)
  assert.equal(result.world.feedback.battleRecords.length, 0, 'plain neutral occupy should not fabricate a battle report')
}

function testAllianceOwnedTileDoesNotEnterPvpBattle() {
  const { world, attacker, tile } = seedPlainTarget()
  tile.owner = ENEMY_FACTION_ID
  world.feedback.diplomacyAgreements = [
    {
      id: 'occupy_tile_pvp_alliance',
      tick: world.tick,
      type: 'alliance',
      parties: [PLAYER_FACTION_ID, ENEMY_FACTION_ID],
      duration: 5,
      terms: 'contract test alliance blocks hostile occupy',
    },
  ]
  world.units.push(cloneDefenderFrom(attacker, tile.id))

  const result = occupyTile(world, {
    factionId: PLAYER_FACTION_ID,
    unitId: attacker.id,
    tileId: tile.id,
  })

  assert.equal(result.ok, false, 'allied occupied tile should be rejected before battle resolution')
  if (result.ok) return
  assert.equal(result.failureCode, 'tile_not_neutral')
  assert.match(result.message, /alliance|ceasefire|停战|同盟/i)
  assert.equal(world.feedback.battleRecords.length, 0, 'allied rejection must not write battle authority output')
}

function testOwnTileDoesNotEnterPvpBattle() {
  const { world, attacker, tile } = seedPlainTarget()
  tile.owner = PLAYER_FACTION_ID

  const result = occupyTile(world, {
    factionId: PLAYER_FACTION_ID,
    unitId: attacker.id,
    tileId: tile.id,
  })

  assert.equal(result.ok, false, 'own tile should remain an illegal occupy target')
  if (result.ok) return
  assert.equal(result.failureCode, 'tile_already_controlled')
  assert.equal(world.feedback.battleRecords.length, 0, 'own-tile rejection must not write battle authority output')
}

function testHostileOccupiedTileEntersPvpBattleAuthority() {
  const { world, faction, attacker, tile } = seedPlainTarget()
  tile.owner = ENEMY_FACTION_ID
  tile.enemyPressure = 4
  attacker.strength = 900
  attacker.supply = 9
  attacker.hero.force = 95
  attacker.hero.command = 92
  attacker.hero.intelligence = 88
  attacker.hero.speed = 80
  faction.actionPoints = 6
  faction.food = 6
  world.units = world.units.filter((unit) => unit.id === attacker.id || unit.tileId !== tile.id)
  world.units.push(cloneDefenderFrom(attacker, tile.id))

  const result = occupyTile(world, {
    factionId: PLAYER_FACTION_ID,
    unitId: attacker.id,
    tileId: tile.id,
  })

  assert.equal(result.ok, true, `hostile occupied tile should resolve PvP battle: ${result.message}`)
  if (!result.ok) return
  assert.equal(result.previousOwner, ENEMY_FACTION_ID)
  assert.equal(result.occupied, true, 'strong attacker should take the occupied hostile tile')
  assert.equal(result.world.map.tiles.find((candidate) => candidate.id === tile.id)?.owner, PLAYER_FACTION_ID)
  assert.equal(result.world.feedback.battleRecords.length, 1, 'PvP occupy should write one battle authority record')
  const record = result.world.feedback.battleRecords[0]
  assert.equal(record.reportKind, 'field_battle')
  assert.equal(record.tileId, tile.id)
  assert.equal(record.tileX, tile.x)
  assert.equal(record.tileY, tile.y)
  assert.match(String(record.location), new RegExp(tile.name))
  const recordRegion = record.region
  assert.ok(typeof recordRegion === 'string', 'PvP battle report should expose a region string')
  assert.ok(recordRegion.length > 0, 'PvP battle report should expose a player-facing region label')
  assert.equal(record.attackerFaction, PLAYER_FACTION_ID)
  assert.equal(record.attackerUnitId, attacker.id)
  assert.equal(record.outcome, 'win')
  assert.ok(record.summary.includes(tile.name), 'battle summary should name the contested tile')
  assert.ok(record.rounds?.length, 'battle report should expose round details')
  assert.equal(result.pvpBattle?.outcome, 'win')
  assert.equal(result.pvpBattle?.reportKind, 'field_battle')
}

testNeutralTileOccupyRemainsUnchanged()
testAllianceOwnedTileDoesNotEnterPvpBattle()
testOwnTileDoesNotEnterPvpBattle()
testHostileOccupiedTileEntersPvpBattleAuthority()

console.log('[occupy_tile_pvp_contract] all checks passed')
