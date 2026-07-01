import assert from 'node:assert/strict'
import WebSocket from 'ws'
import {
  claimMainMapCellAction,
  getWorldStateReadonly,
  occupyTileAction,
  releaseMainMapCellAction,
  resetWorldServiceForTests,
} from '../src/application/world/WorldService'
import {
  __registerTestClient,
  __resetWebSocketStateForTests,
} from '../src/ws/GameWebSocket'

const WORLD_ID = 'unified_aoi_v0_6_formal_real_map_data_1km'
const COORDINATE_SPACE = 'real_map_data_1km.cell_1km'
const FACTION_ID = 'player'
const TARGET_CELL = { x: 4396, y: 2489 }
const TARGET_CHUNK_ID = 'chunk_y038_x068'
const ENEMY_FACTION_ID = 'enemy'

function cellId() {
  return `${WORLD_ID}:${TARGET_CELL.x}:${TARGET_CELL.y}`
}

function parseMessages(rawMessages: string[]) {
  return rawMessages.map((raw) => JSON.parse(raw) as Record<string, unknown>)
}

function assertClaimImmunityFields(payload: Record<string, unknown>, context: string) {
  assert.equal(payload.immunityActive, true, `${context} should mark claim immunity active`)
  assert.equal(payload.immunitySource, 'main_map_cell_claim', `${context} should include backend immunity source`)
  assert.equal(payload.immunity_source, 'main_map_cell_claim', `${context} should include snake_case backend immunity source`)
  assert.equal(typeof payload.immunityUntil, 'string', `${context} should include immunityUntil`)
  assert.equal(typeof payload.immunity_until, 'string', `${context} should include immunity_until`)
  assert.equal(payload.immunityUntil, payload.immunity_until, `${context} camel/snake immunity expiry should match`)
  const expiryMs = Date.parse(String(payload.immunityUntil))
  assert.ok(Number.isFinite(expiryMs), `${context} immunityUntil should be ISO datetime`)
  const deltaMs = expiryMs - Date.now()
  assert.ok(deltaMs > 50 * 60 * 1000, `${context} immunity should be roughly one hour in the future`)
  assert.ok(deltaMs < 70 * 60 * 1000, `${context} immunity should not exceed the one-hour rule window`)
}

function assertReleaseClearsImmunity(payload: Record<string, unknown>, context: string) {
  assert.equal(payload.immunityActive, false, `${context} should clear claim immunity`)
  assert.equal(payload.immunity_active, false, `${context} should clear claim immunity in snake_case`)
  assert.equal(payload.immunitySource, 'main_map_cell_release', `${context} should include release immunity source`)
  assert.equal(payload.immunity_source, 'main_map_cell_release', `${context} should include release immunity source in snake_case`)
  assert.equal(payload.immunityUntil, undefined, `${context} should not keep a stale immunityUntil`)
  assert.equal(payload.immunity_until, undefined, `${context} should not keep a stale immunity_until`)
}

function seedOccupyTileImmunityAttemptTarget() {
  const world = getWorldStateReadonly() as unknown as {
    map: {
      tiles: Array<{
        id: string
        x: number
        y: number
        type: string
        terrain: string
        owner: string
        enemyPressure: number
        moveCost: number
      }>
    }
    units: Array<{
      id: string
      faction: string
      tileId: string
      status: string
      currentTask?: string
      strength: number
      supply: number
      mobility: number
      corps: { readiness: number }
    }>
    factions: Record<string, { actionPoints: number; food: number }>
    feedback: { diplomacyAgreements?: unknown[] }
  }
  const tile = world.map.tiles.find((candidate) => candidate.type !== 'city' && candidate.type !== 'fog')
  assert.ok(tile, 'occupy immunity contract should find a target tile')
  const enemyUnit = world.units.find((candidate) => candidate.faction === ENEMY_FACTION_ID)
  assert.ok(enemyUnit, 'occupy immunity contract should find an enemy unit')
  const enemyFaction = world.factions[ENEMY_FACTION_ID]
  assert.ok(enemyFaction, 'occupy immunity contract should find enemy faction')

  tile.type = 'plain'
  tile.terrain = 'grassland'
  tile.owner = FACTION_ID
  tile.enemyPressure = 1
  tile.moveCost = 1
  enemyUnit.tileId = tile.id
  enemyUnit.status = '待命'
  enemyUnit.currentTask = undefined
  enemyUnit.strength = Math.max(enemyUnit.strength, 320)
  enemyUnit.supply = Math.max(enemyUnit.supply, 8)
  enemyUnit.mobility = Math.max(enemyUnit.mobility, 16)
  enemyUnit.corps.readiness = Math.max(enemyUnit.corps.readiness, 90)
  enemyFaction.actionPoints = Math.max(enemyFaction.actionPoints, 6)
  enemyFaction.food = Math.max(enemyFaction.food, 6)
  world.feedback.diplomacyAgreements = []
  return { tile, enemyUnit }
}

async function run() {
  resetWorldServiceForTests()
  __resetWebSocketStateForTests()
  const rawMessages: string[] = []
  const fakeWs = {
    readyState: WebSocket.OPEN,
    send(raw: string) {
      rawMessages.push(String(raw))
    },
    close() {
      // test cleanup no-op
    },
  } as unknown as WebSocket
  const session = __registerTestClient(fakeWs)
  assert.ok(session, 'test websocket client should register')
  ;(session as unknown as { factionId: string }).factionId = FACTION_ID

  const claim = claimMainMapCellAction({
    worldId: WORLD_ID,
    coordinateSpace: COORDINATE_SPACE,
    factionId: FACTION_ID,
    requestId: 'world_main_map_owner_delta_ws_claim_1',
    cellX: TARGET_CELL.x,
    cellY: TARGET_CELL.y,
  }, false)
  assert.equal(claim.ok, true, `claim should succeed: ${JSON.stringify(claim)}`)
  assertClaimImmunityFields((claim.receipt ?? {}) as Record<string, unknown>, 'claim receipt')

  const protectedClaim = claimMainMapCellAction({
    worldId: WORLD_ID,
    coordinateSpace: COORDINATE_SPACE,
    factionId: 'enemy',
    requestId: 'world_main_map_owner_delta_ws_claim_blocked_by_immunity_1',
    cellX: TARGET_CELL.x,
    cellY: TARGET_CELL.y,
    expectedOwner: FACTION_ID,
    expectedCellVersion: Number((claim.receipt as Record<string, unknown> | undefined)?.nextCellVersion ?? 1),
  }, false)
  assert.equal(protectedClaim.ok, false, `claim against immune cell should fail: ${JSON.stringify(protectedClaim)}`)
  assert.equal(protectedClaim.failureCode, 'main_map_cell_immunity_active')
  assert.equal(protectedClaim.relatedId, cellId())
  assert.match(String(protectedClaim.message ?? ''), /immunity|protected/i)
  assert.equal(protectedClaim.immunityActive, true)
  assert.equal(protectedClaim.immunitySource, 'main_map_cell_claim')
  assert.equal(typeof protectedClaim.immunityUntil, 'string')

  const release = releaseMainMapCellAction({
    worldId: WORLD_ID,
    coordinateSpace: COORDINATE_SPACE,
    factionId: FACTION_ID,
    requestId: 'world_main_map_owner_delta_ws_release_1',
    cellX: TARGET_CELL.x,
    cellY: TARGET_CELL.y,
  }, false)
  assert.equal(release.ok, true, `release should succeed: ${JSON.stringify(release)}`)
  assertReleaseClearsImmunity((release.receipt ?? {}) as Record<string, unknown>, 'release receipt')

  const messages = parseMessages(rawMessages).filter((message) => message.type === 'main_map_owner_delta')
  assert.equal(messages.length, 2, `expected claim and release owner-delta messages: ${JSON.stringify(rawMessages)}`)

  const claimDelta = messages[0]
  assert.equal(claimDelta.worldId, WORLD_ID)
  assert.equal(claimDelta.coordinateSpace, COORDINATE_SPACE)
  assert.equal(claimDelta.eventType, 'claim')
  assert.equal(claimDelta.cellId, cellId())
  assert.equal(claimDelta.chunkId, TARGET_CHUNK_ID)
  assert.equal(claimDelta.cellX, TARGET_CELL.x)
  assert.equal(claimDelta.cellY, TARGET_CELL.y)
  assert.equal(claimDelta.owner, FACTION_ID)
  assert.ok(Number(claimDelta.cellVersion) > Number(claimDelta.previousCellVersion), 'claim should advance cell version')
  assert.equal(claimDelta.requestId, 'world_main_map_owner_delta_ws_claim_1')
  assert.ok(Number(claimDelta.overrideVersion) >= 1, 'claim should include override version')
  assert.ok(Number(claimDelta.worldVersion) >= 1, 'claim should include world version')
  assertClaimImmunityFields(claimDelta, 'claim owner delta')

  const releaseDelta = messages[1]
  assert.equal(releaseDelta.eventType, 'release')
  assert.equal(releaseDelta.cellId, cellId())
  assert.equal(releaseDelta.previousOwner, FACTION_ID)
  assert.equal(releaseDelta.owner, 'neutral')
  assert.equal(releaseDelta.previousCellVersion, claimDelta.cellVersion)
  assert.equal(Number(releaseDelta.cellVersion), Number(claimDelta.cellVersion) + 1)
  assert.equal(releaseDelta.requestId, 'world_main_map_owner_delta_ws_release_1')
  assert.ok(Number(releaseDelta.overrideVersion) > Number(claimDelta.overrideVersion), 'release should advance override version')
  assertReleaseClearsImmunity(releaseDelta, 'release owner delta')

  const occupyAttempt = seedOccupyTileImmunityAttemptTarget()
  const occupyProtection = claimMainMapCellAction({
    worldId: WORLD_ID,
    coordinateSpace: COORDINATE_SPACE,
    factionId: FACTION_ID,
    requestId: 'world_main_map_owner_delta_occupy_immunity_seed_1',
    cellX: occupyAttempt.tile.x,
    cellY: occupyAttempt.tile.y,
  }, false)
  assert.equal(occupyProtection.ok, true, `occupy immunity seed claim should succeed: ${JSON.stringify(occupyProtection)}`)
  const blockedOccupy = occupyTileAction({
    factionId: ENEMY_FACTION_ID,
    unitId: occupyAttempt.enemyUnit.id,
    tileId: occupyAttempt.tile.id,
  }, false)
  assert.equal(blockedOccupy.ok, false, `occupyTile should respect main-map cell immunity: ${JSON.stringify(blockedOccupy)}`)
  assert.equal(blockedOccupy.failureCode, 'main_map_cell_immunity_active')
  assert.equal(blockedOccupy.relatedId, occupyAttempt.tile.id)
  assert.equal(blockedOccupy.immunityActive, true)
  assert.equal(blockedOccupy.immunitySource, 'main_map_cell_claim')
  assert.equal(typeof blockedOccupy.immunityUntil, 'string')

  console.log(JSON.stringify({
    ok: true,
    deliveredOwnerDeltaMessages: messages.length,
    lastOverrideVersion: releaseDelta.overrideVersion,
  }, null, 2))
}

run().catch((error) => {
  console.error('[world_main_map_owner_delta_websocket_contract] failed:', error)
  process.exitCode = 1
})
