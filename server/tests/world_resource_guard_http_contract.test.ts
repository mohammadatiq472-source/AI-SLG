import assert from 'node:assert/strict'
import { rmSync, writeFileSync } from 'node:fs'
import type { Unit, WorldState } from '../../shared/contracts/game'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readArray,
  readObject,
  requestJson,
  shutdownChild,
  sleep,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

const FACTION_ID = 'player'

function readWorldStatePayload(value: unknown): WorldState {
  const root = readObject(value)
  const world = readObject(root.world)
  return world as unknown as WorldState
}

function findBattleEvent(events: unknown[], tileId: string) {
  return events.find((item) => {
    const event = readObject(item)
    if (event.action !== 'occupy_tile' || event.success !== true) {
      return false
    }
    const metadata = readObject(event.metadata)
    return metadata.tileId === tileId
  })
}

async function requestGetJsonWithOneRetry(baseUrl: string, path: string) {
  try {
    return await requestJson(baseUrl, path, 'GET')
  } catch (error) {
    await sleep(100)
    return await requestJson(baseUrl, path, 'GET')
  }
}

function cloneWeakAttackerFrom(unit: Unit, tileId: string): Unit {
  const weakUnit: Unit = structuredClone(unit)
  weakUnit.id = 'world_resource_guard_http_weak_attacker'
  weakUnit.name = 'HTTP Resource Guard Weak Attacker'
  weakUnit.tileId = tileId
  weakUnit.strength = 35
  weakUnit.supply = 1
  weakUnit.mobility = 2
  weakUnit.status = '待命'
  weakUnit.currentTask = undefined
  weakUnit.corps = {
    ...weakUnit.corps,
    name: 'HTTP Weak Guard Probe',
    readiness: 25,
    roster: ['weak probe'],
  }
  weakUnit.hero = {
    ...weakUnit.hero,
    force: 35,
    command: 35,
    intelligence: 35,
    charisma: 35,
    speed: 35,
  }
  return weakUnit
}

function seedWorldStateWithResourceGuardTargets(): {
  path: string
  strongUnitId: string
  weakUnitId: string
  lowTileId: string
  highTileId: string
} {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding resource guard HTTP contract`)
  const strongUnit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(strongUnit, `missing unit for faction ${FACTION_ID} while seeding resource guard HTTP contract`)

  const lowTile = world.map.tiles.find((tile) => tile.type === 'resource')
    ?? world.map.tiles.find((tile) => tile.type !== 'city' && tile.type !== 'fog')
    ?? world.map.tiles[0]
  assert.ok(lowTile, 'missing low resource guard tile')
  const highTile = world.map.tiles.find((tile) => tile.id !== lowTile.id && tile.type === 'resource')
    ?? world.map.tiles.find((tile) => tile.id !== lowTile.id && tile.type !== 'city' && tile.type !== 'fog')
    ?? world.map.tiles.find((tile) => tile.id !== lowTile.id)
  assert.ok(highTile, 'missing high resource guard tile')

  lowTile.type = 'resource'
  lowTile.terrain = 'grassland'
  lowTile.owner = 'neutral'
  lowTile.resourceKind = 'food'
  lowTile.resourceLevel = 1
  lowTile.enemyPressure = 2
  lowTile.moveCost = 1

  highTile.type = 'resource'
  highTile.terrain = 'highland'
  highTile.owner = 'neutral'
  highTile.resourceKind = 'iron'
  highTile.resourceLevel = 9
  highTile.enemyPressure = 2
  highTile.moveCost = 1

  strongUnit.tileId = lowTile.id
  strongUnit.status = '待命'
  strongUnit.currentTask = undefined
  strongUnit.strength = 180
  strongUnit.supply = 9
  strongUnit.mobility = 12
  strongUnit.corps.readiness = 100
  strongUnit.hero.level = 24
  strongUnit.hero.exp = 90

  const weakUnit = cloneWeakAttackerFrom(strongUnit, highTile.id)
  world.units = world.units.filter((unit) =>
    unit.id === strongUnit.id ||
    (unit.tileId !== lowTile.id && unit.tileId !== highTile.id),
  )
  world.units.push(weakUnit)
  world.feedback.battleRecords = []
  world.reports = []
  world.executions[FACTION_ID] = null
  faction.actionPoints = 10
  faction.food = 10

  const path = buildSessionPersistPath('world_resource_guard_http_contract_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    strongUnitId: strongUnit.id,
    weakUnitId: weakUnit.id,
    lowTileId: lowTile.id,
    highTileId: highTile.id,
  }
}

async function run() {
  const seeded = seedWorldStateWithResourceGuardTargets()
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seeded.path,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const lowResult = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'occupyTile',
      payload: {
        factionId: FACTION_ID,
        unitId: seeded.strongUnitId,
        tileId: seeded.lowTileId,
      },
    })
    assert.equal(lowResult.status, 200, `low resource guard route failed: ${JSON.stringify(lowResult.data)}`)
    const lowPayload = readObject(lowResult.data)
    assert.equal(lowPayload.ok, true, `low resource guard occupy should succeed: ${JSON.stringify(lowResult.data)}`)
    assert.equal(lowPayload.relatedId, seeded.lowTileId)
    assert.equal(lowPayload.unitId, seeded.strongUnitId)
    const lowReceipt = readObject(lowPayload.receipt)
    assert.equal(lowReceipt.action, 'occupyTile')
    assert.equal(lowReceipt.unitId, seeded.strongUnitId)
    assert.equal(lowReceipt.expGained, 20)
    assert.equal(lowReceipt.previousExp, 90)
    assert.equal(lowReceipt.nextExp, 10)
    assert.equal(lowReceipt.previousLevel, 24)
    assert.equal(lowReceipt.nextLevel, 25)
    assert.equal(readObject(lowReceipt.hero).level, 25)
    const lowWorld = readWorldStatePayload(lowResult.data)
    const lowTileAfter = lowWorld.map.tiles.find((tile) => tile.id === seeded.lowTileId)
    assert.ok(lowTileAfter, 'low resource tile should remain in world payload')
    assert.equal(lowTileAfter.owner, FACTION_ID, 'defeated low-level resource guard should transfer tile ownership')
    const lowUnitAfter = lowWorld.units.find((unit) => unit.id === seeded.strongUnitId)
    assert.equal(lowUnitAfter?.hero.level, 25, 'resource guard battle should level the attacker through exp')
    assert.equal(lowUnitAfter?.hero.exp, 10, 'resource guard battle should carry overflow exp')
    const lowRecord = lowWorld.feedback.battleRecords[0]
    assert.ok(lowRecord, 'low resource guard battle should prepend a battle record')
    assert.equal(lowRecord.reportKind, 'resource_guard')
    assert.equal(lowRecord.outcome, 'win')
    assert.equal(lowRecord.tileId, seeded.lowTileId)
    assert.equal(lowRecord.attackerUnitId, seeded.strongUnitId)
    assert.ok(lowRecord.rounds?.length, 'low resource guard battle record should include round details')

    const highResult = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'occupyTile',
      payload: {
        factionId: FACTION_ID,
        unitId: seeded.weakUnitId,
        tileId: seeded.highTileId,
      },
    })
    assert.equal(highResult.status, 200, `high resource guard route failed: ${JSON.stringify(highResult.data)}`)
    const highPayload = readObject(highResult.data)
    assert.equal(highPayload.ok, true, `high resource guard battle should resolve through occupyTile: ${JSON.stringify(highResult.data)}`)
    assert.equal(highPayload.relatedId, seeded.highTileId)
    assert.equal(highPayload.unitId, seeded.weakUnitId)
    const highWorld = readWorldStatePayload(highResult.data)
    const highTileAfter = highWorld.map.tiles.find((tile) => tile.id === seeded.highTileId)
    assert.ok(highTileAfter, 'high resource tile should remain in world payload')
    assert.equal(highTileAfter.owner, 'neutral', 'high-level resource guard should block weak attacker and keep tile neutral')
    const highRecord = highWorld.feedback.battleRecords[0]
    assert.ok(highRecord, 'high resource guard battle should prepend a battle record')
    assert.equal(highRecord.reportKind, 'resource_guard')
    assert.equal(highRecord.outcome, 'loss')
    assert.equal(highRecord.tileId, seeded.highTileId)
    assert.equal(highRecord.attackerUnitId, seeded.weakUnitId)
    assert.ok(highRecord.rounds?.length, 'high resource guard battle record should include round details')

    const postBattleHealth = await requestGetJsonWithOneRetry(baseUrl, '/api/health')
    assert.equal(postBattleHealth.status, 200, `backend should remain healthy after resource guard battles: ${JSON.stringify(postBattleHealth.data)}`)

    const events = await requestGetJsonWithOneRetry(baseUrl, '/api/events?limit=20')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const eventPayload = readObject(events.data)
    const eventItems = readArray(eventPayload.items)

    const lowEvent = readObject(findBattleEvent(eventItems, seeded.lowTileId))
    const lowMetadata = readObject(lowEvent.metadata)
    assert.equal(lowMetadata.previousOwner, 'neutral')
    assert.equal(lowMetadata.occupied, true)
    assert.equal(lowMetadata.guardTemplateId, 'resource_guard_level_1')
    const lowHeroGrowth = readObject(lowMetadata.heroGrowth)
    assert.equal(lowHeroGrowth.expGained, 20)
    assert.equal(lowHeroGrowth.previousLevel, 24)
    assert.equal(lowHeroGrowth.nextLevel, 25)
    const lowGuardBattle = readObject(lowMetadata.guardBattle)
    assert.equal(lowGuardBattle.outcome, 'win')
    assert.equal(lowGuardBattle.summary, lowRecord.summary)

    const highEvent = readObject(findBattleEvent(eventItems, seeded.highTileId))
    const highMetadata = readObject(highEvent.metadata)
    assert.equal(highMetadata.previousOwner, 'neutral')
    assert.equal(highMetadata.occupied, false)
    assert.equal(highMetadata.guardTemplateId, 'resource_guard_level_9')
    const highGuardBattle = readObject(highMetadata.guardBattle)
    assert.equal(highGuardBattle.outcome, 'loss')
    assert.equal(highGuardBattle.summary, highRecord.summary)

    console.log('[world_resource_guard_http_contract] all checks passed')
  } catch (error) {
    console.error('[world_resource_guard_http_contract] backend exit state:', {
      exitCode: child.exitCode,
      signalCode: child.signalCode,
      killed: child.killed,
    })
    console.error('[world_resource_guard_http_contract] backend stdout tail:', tail.stdout.join('\n'))
    console.error('[world_resource_guard_http_contract] backend stderr tail:', tail.stderr.join('\n'))
    throw error
  } finally {
    await shutdownChild(child)
    rmSync(seeded.path, { force: true })
  }
}

run().catch((error) => {
  console.error('[world_resource_guard_http_contract] failed:', error)
  process.exitCode = 1
})
