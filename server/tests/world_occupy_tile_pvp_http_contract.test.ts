import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import type { Unit, WorldState } from '../../shared/contracts/game'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readArray,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

const FACTION_ID = 'player'
const ENEMY_FACTION_ID = 'enemy'

function readWorldStatePayload(value: unknown): WorldState {
  const root = readObject(value)
  const world = readObject(root.world)
  return world as unknown as WorldState
}

function clonePvpDefenderFrom(attacker: Unit, tileId: string): Unit {
  const defender: Unit = structuredClone(attacker)
  defender.id = 'world_occupy_tile_pvp_http_defender'
  defender.name = 'HTTP PvP Defender'
  defender.faction = ENEMY_FACTION_ID
  defender.tileId = tileId
  defender.status = '驻防中'
  defender.currentTask = 'Hold HTTP PvP contract tile'
  defender.strength = 35
  defender.supply = 4
  defender.mobility = 8
  defender.corps = {
    ...defender.corps,
    name: 'HTTP PvP Guard',
    readiness: 80,
    roster: ['front guard'],
  }
  defender.hero = {
    ...defender.hero,
    id: 'hero_world_occupy_tile_pvp_http_defender',
    name: 'HTTP PvP Defender',
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

function seedWorldStateWithPvpOccupyTarget(): { path: string; unitId: string; tileId: string } {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding PvP occupy HTTP contract`)
  const attacker = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(attacker, `missing unit for faction ${FACTION_ID} while seeding PvP occupy HTTP contract`)
  const targetTile = world.map.tiles.find((tile) => tile.type === 'plain')
    ?? world.map.tiles.find((tile) => tile.type !== 'city' && tile.type !== 'fog')
    ?? world.map.tiles[0]
  assert.ok(targetTile, 'missing map tile while seeding PvP occupy HTTP contract')

  targetTile.type = 'plain'
  targetTile.terrain = 'grassland'
  targetTile.owner = ENEMY_FACTION_ID
  targetTile.enemyPressure = 4
  targetTile.moveCost = 1

  attacker.tileId = targetTile.id
  attacker.status = '待命'
  attacker.currentTask = undefined
  attacker.strength = 900
  attacker.supply = 9
  attacker.mobility = Math.max(attacker.mobility, 20)
  attacker.hero.force = 95
  attacker.hero.command = 92
  attacker.hero.intelligence = 88
  attacker.hero.speed = 80
  attacker.corps.readiness = 100

  faction.actionPoints = Math.max(faction.actionPoints, 6)
  faction.food = Math.max(faction.food, 6)
  world.feedback.battleRecords = []
  world.units = world.units.filter((unit) => unit.id === attacker.id || unit.tileId !== targetTile.id)
  world.units.push(clonePvpDefenderFrom(attacker, targetTile.id))

  const path = buildSessionPersistPath('world_occupy_tile_pvp_http_contract_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { path, unitId: attacker.id, tileId: targetTile.id }
}

async function run() {
  const seeded = seedWorldStateWithPvpOccupyTarget()
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seeded.path,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const result = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'occupyTile',
      payload: {
        factionId: FACTION_ID,
        unitId: seeded.unitId,
        tileId: seeded.tileId,
      },
    }, 60_000)

    assert.equal(result.status, 200, `PvP occupy route failed: ${JSON.stringify(result.data)}`)
    const payload = readObject(result.data)
    assert.equal(payload.ok, true, `PvP occupy should succeed: ${JSON.stringify(payload)}`)
    assert.equal(payload.relatedId, seeded.tileId, 'PvP occupy response should point at the contested tile')
    assert.equal(payload.unitId, seeded.unitId, 'PvP occupy response should preserve attacker unit id')

    const worldAfter = readWorldStatePayload(result.data)
    const tileAfter = worldAfter.map.tiles.find((tile) => tile.id === seeded.tileId)
    assert.ok(tileAfter, 'contested tile should remain in world payload')
    assert.equal(tileAfter.owner, FACTION_ID, 'HTTP PvP occupy should transfer hostile tile owner')

    const record = worldAfter.feedback.battleRecords[0]
    assert.ok(record, 'HTTP PvP occupy should prepend a battle record')
    assert.equal(record.reportKind, 'field_battle')
    assert.equal(record.tileId, seeded.tileId)
    assert.equal(record.attackerFaction, FACTION_ID)
    assert.equal(record.attackerUnitId, seeded.unitId)
    assert.equal(record.outcome, 'win')
    assert.ok(record.rounds?.length, 'HTTP PvP occupy battle record should include round details')

    const events = await requestJson(baseUrl, '/api/events?limit=12', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const occupyEvent = readArray(readObject(events.data).items)
      .map((item) => readObject(item))
      .find((item) => item.action === 'occupy_tile' && item.success === true)
    assert.ok(occupyEvent, 'HTTP PvP occupy should append a successful occupy_tile world event')
    const metadata = readObject(occupyEvent.metadata)
    assert.equal(metadata.tileId, seeded.tileId)
    assert.equal(metadata.unitId, seeded.unitId)
    assert.equal(metadata.previousOwner, ENEMY_FACTION_ID)
    assert.equal(metadata.occupied, true)
    const pvpBattle = readObject(metadata.pvpBattle)
    assert.equal(pvpBattle.outcome, 'win')
    assert.equal(pvpBattle.reportKind, 'field_battle')
    assert.equal(pvpBattle.summary, record.summary)

    console.log('[world_occupy_tile_pvp_http_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[world_occupy_tile_pvp_http_contract] failed:', error)
  process.exitCode = 1
})
