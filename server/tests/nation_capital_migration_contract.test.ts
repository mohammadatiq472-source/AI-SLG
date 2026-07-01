import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import type { Tile, WorldState } from '../../shared/contracts/game'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

async function requestJsonWithHeaders(
  baseUrl: string,
  path: string,
  method: 'GET' | 'POST',
  headers: Record<string, string>,
  body?: Record<string, unknown>,
) {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const raw = await response.text()
  return {
    ok: response.ok,
    status: response.status,
    data: raw.trim() ? JSON.parse(raw) as unknown : null,
  }
}

function readWorldStatePayload(value: unknown): WorldState {
  const root = readObject(value)
  const world = readObject(root.world)
  return world as unknown as WorldState
}

function requireCityTile(world: WorldState, predicate: (tile: Tile) => boolean): Tile {
  const tile = world.map.tiles.find((candidate) => candidate.type === 'city' && predicate(candidate))
  assert.ok(tile, 'seed world should expose the required city tile')
  return tile
}

function seedNationMigrationWorldState() {
  const world = createInitialWorldState()
  const currentCapital = requireCityTile(world, (tile) => tile.owner === 'player')
  const nextCapital = requireCityTile(world, (tile) => tile.id !== currentCapital.id)
  nextCapital.owner = 'player'
  nextCapital.name = nextCapital.name || '迁都候选城'

  const faction = world.factions.player
  faction.organizationId = 'player'
  faction.organizationKind = 'nation'
  faction.organizationName = '齐国'
  faction.nationName = '齐国'
  faction.nationTier = 'kingdom'
  faction.colorHex = '#c95f32'
  faction.nationColorHex = '#c95f32'
  faction.nationCapitalTileId = currentCapital.id
  faction.nationCapitalName = currentCapital.name
  faction.jade = 260

  const enemy = world.factions.enemy
  enemy.organizationId = 'enemy'
  enemy.organizationKind = 'nation'
  enemy.organizationName = '兖国'
  enemy.nationName = '兖国'
  enemy.nationTier = 'kingdom'
  enemy.colorHex = '#6b9f45'
  enemy.nationColorHex = '#6b9f45'

  const path = buildSessionPersistPath('nation_capital_migration_contract_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    currentCapital,
    nextCapital,
  }
}

async function joinPlayer(baseUrl: string, playerName: string) {
  const response = await requestJson(baseUrl, '/api/session/join', 'POST', {
    factionId: 'player',
    playerName,
  })
  assert.equal(response.status, 200, `session join failed: ${JSON.stringify(response.data)}`)
  const token = String(readObject(response.data).token ?? '')
  assert.ok(token.length >= 32, 'session join should return bearer token')
  return token
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const seeded = seedNationMigrationWorldState()
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seeded.path,
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('nation_capital_migration_contract_session_state'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const officerToken = await joinPlayer(baseUrl, '验收官员')
    const ordinaryToken = await joinPlayer(baseUrl, '普通成员')

    const directProfileUpdate = await requestJson(baseUrl, '/api/nation/profile/update', 'POST', {
      factionId: 'player',
      nationName: '新齐',
      color: '#5db9b2',
    })
    assert.equal(directProfileUpdate.status, 409, 'direct nation profile edit should stay locked')
    assert.equal(readObject(directProfileUpdate.data).failureCode, 'nation_profile_locked_until_capital_migration')

    const noSessionResponse = await requestJson(baseUrl, '/api/nation/capital/migrate', 'POST', {
      factionId: 'player',
      actorCommanderId: 'ally_west',
      capitalTileId: seeded.nextCapital.id,
      nationName: '新齐',
      color: '#5db9b2',
    })
    assert.equal(noSessionResponse.status, 401, 'capital migration should require a player session token')
    assert.equal(readObject(noSessionResponse.data).failureCode, 'nation_capital_migration_session_required')

    const ordinaryResponse = await requestJsonWithHeaders(
      baseUrl,
      '/api/nation/capital/migrate',
      'POST',
      { Authorization: `Bearer ${ordinaryToken}` },
      {
        factionId: 'player',
        actorCommanderId: 'ally_west',
        capitalTileId: seeded.nextCapital.id,
        nationName: '新齐',
        color: '#5db9b2',
      },
    )
    assert.equal(ordinaryResponse.status, 403, 'ordinary member should not migrate nation capital')
    assert.equal(readObject(ordinaryResponse.data).failureCode, 'nation_capital_migration_forbidden')

    const colorConflictResponse = await requestJsonWithHeaders(
      baseUrl,
      '/api/nation/capital/migrate',
      'POST',
      { Authorization: `Bearer ${officerToken}` },
      {
        factionId: 'player',
        actorCommanderId: 'ally_west',
        capitalTileId: seeded.nextCapital.id,
        nationName: '新齐',
        color: '#6b9f45',
      },
    )
    assert.equal(colorConflictResponse.status, 409, 'capital migration should reject occupied nation color')
    assert.equal(readObject(colorConflictResponse.data).failureCode, 'nation_capital_migration_color_conflict')

    const successResponse = await requestJsonWithHeaders(
      baseUrl,
      '/api/nation/capital/migrate',
      'POST',
      { Authorization: `Bearer ${officerToken}` },
      {
        factionId: 'player',
        actorCommanderId: 'ally_west',
        capitalTileId: seeded.nextCapital.id,
        nationName: '新齐',
        color: '#5db9b2',
      },
    )
    assert.equal(successResponse.status, 200, `capital migration should succeed: ${JSON.stringify(successResponse.data)}`)
    const successPayload = readObject(successResponse.data)
    assert.equal(successPayload.ok, true)
    assert.equal(readObject(successPayload.cost).jade, 200)
    assert.equal(readObject(successPayload.cost).before, 260)
    assert.equal(readObject(successPayload.cost).after, 60)
    const nation = readObject(successPayload.nation)
    assert.equal(nation.nationName, '新齐')
    assert.equal(nation.color, '#5db9b2')
    assert.equal(nation.capitalTileId, seeded.nextCapital.id)
    assert.equal(nation.capitalName, seeded.nextCapital.name)
    assert.ok(String(nation.renameCooldownUntil ?? '').length > 0, 'migration should start rename cooldown')
    assert.ok(
      (nation.historicalNames as unknown[]).some((entry) => readObject(entry).nationName === '齐国'),
      'migration should keep historical nation name',
    )
    const auditLog = nation.auditLog as unknown[]
    assert.ok(auditLog.some((entry) => readObject(entry).action === 'migrateCapital'), 'migration should write audit entry')
    const migrationAudit = readObject(auditLog.find((entry) => readObject(entry).action === 'migrateCapital'))
    assert.ok((migrationAudit.changedFields as unknown[]).includes('capital'), 'audit should mark capital change')
    assert.ok((migrationAudit.changedFields as unknown[]).includes('nationName'), 'audit should mark name change')
    assert.ok((migrationAudit.changedFields as unknown[]).includes('color'), 'audit should mark color change')
    assert.ok((migrationAudit.changedFields as unknown[]).includes('jade'), 'audit should mark jade cost')
    assert.equal(migrationAudit.previousCapitalTileId, seeded.currentCapital.id)
    assert.equal(migrationAudit.nextCapitalTileId, seeded.nextCapital.id)

    const cooldownResponse = await requestJsonWithHeaders(
      baseUrl,
      '/api/nation/capital/migrate',
      'POST',
      { Authorization: `Bearer ${officerToken}` },
      {
        factionId: 'player',
        actorCommanderId: 'ally_west',
        capitalTileId: seeded.nextCapital.id,
        nationName: '再齐',
        color: '#5db9b2',
      },
    )
    assert.equal(cooldownResponse.status, 409, 'capital migration should enforce rename cooldown')
    assert.equal(readObject(cooldownResponse.data).failureCode, 'nation_capital_migration_rename_cooldown')

    const worldResponse = await requestJson(baseUrl, '/api/world?intelMode=full', 'GET')
    assert.equal(worldResponse.status, 200, `world route failed after capital migration: ${JSON.stringify(worldResponse.data)}`)
    const world = readWorldStatePayload(worldResponse.data)
    assert.equal(world.factions.player.nationName, '新齐')
    assert.equal(world.factions.player.nationCapitalTileId, seeded.nextCapital.id)
    assert.equal(world.factions.player.colorHex, '#5db9b2')
    assert.equal(world.factions.player.jade, 60)
    assert.ok(
      world.factions.player.nationProfileAuditLog?.some((entry) => entry.action === 'migrateCapital'),
      'world state should persist capital migration audit entry',
    )
    assert.ok(
      world.factions.player.nationNameHistory?.some((entry) => entry.nationName === '齐国'),
      'world state should persist historical nation name',
    )

    console.log(JSON.stringify({ ok: true, contract: 'nation_capital_migration' }, null, 2))
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
