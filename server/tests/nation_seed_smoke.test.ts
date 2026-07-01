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

const OFFICER_COMMANDER_ID = 'ally_west'

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

function configurePlayerAsAlliance(world: WorldState) {
  const faction = world.factions.player
  faction.organizationId = 'player'
  faction.organizationKind = 'alliance'
  faction.organizationName = '青州同盟'
  faction.nationName = undefined
  faction.nationTier = undefined
  faction.nationColorHex = undefined
  faction.nationCapitalTileId = undefined
  faction.nationCapitalName = undefined
  faction.jade = 260
}

function clearPlayerCommanderyOwnership(world: WorldState) {
  for (const cluster of world.map.overlays.cityClusters) {
    cluster.owner = 'enemy'
    cluster.camp = 'autonomous'
    for (const tileId of cluster.tileIds) {
      const tile = world.map.tiles.find((candidate) => candidate.id === tileId)
      if (tile) {
        tile.owner = 'enemy'
      }
    }
  }
  for (const tile of world.map.tiles) {
    if (tile.type === 'city' && tile.owner === 'player') {
      tile.owner = 'enemy'
    }
  }
}

function assignCommanderyToPlayer(world: WorldState, index: number): Tile {
  const cluster = world.map.overlays.cityClusters[index]
  assert.ok(cluster, `seed world should expose city cluster ${index}`)
  cluster.owner = 'player'
  cluster.camp = 'human_controlled'
  for (const tileId of cluster.tileIds) {
    const tile = world.map.tiles.find((candidate) => candidate.id === tileId)
    if (tile) {
      tile.owner = 'player'
    }
  }
  const hallTile = requireCityTile(world, (tile) => tile.id === cluster.cityHallTileId)
  hallTile.owner = 'player'
  hallTile.type = 'city'
  hallTile.name = hallTile.name || cluster.name || '青石城'
  return hallTile
}

function seedNationLifecycleWorldState() {
  const world = createInitialWorldState()
  world.alliance.level = Math.max(20, Number(world.alliance.level ?? 1))
  clearPlayerCommanderyOwnership(world)

  const foundingCapital = assignCommanderyToPlayer(world, 0)
  foundingCapital.name = foundingCapital.name || '青石城'

  const migrationCapital = assignCommanderyToPlayer(world, 1)
  migrationCapital.name = migrationCapital.name || '迁都候选城'

  configurePlayerAsAlliance(world)

  const path = buildSessionPersistPath('nation_seed_smoke_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    foundingCapital,
    migrationCapital,
  }
}

function seedNationFoundFailureWorldState(
  prefix: string,
  options: {
    allianceLevel: number
    controlledCommanderyCount: number
    selectedCapitalOwner?: 'player' | 'enemy'
  },
) {
  const world = createInitialWorldState()
  world.alliance.level = options.allianceLevel
  clearPlayerCommanderyOwnership(world)

  let selectedCapital = requireCityTile(world, (tile) => tile.type === 'city')
  for (let index = 0; index < options.controlledCommanderyCount; index += 1) {
    const ownedCapital = assignCommanderyToPlayer(world, index)
    if (index === 0) {
      selectedCapital = ownedCapital
    }
  }

  if (options.selectedCapitalOwner === 'enemy') {
    const enemyCluster = world.map.overlays.cityClusters[options.controlledCommanderyCount]
    assert.ok(enemyCluster, 'seed world should expose an enemy capital candidate')
    enemyCluster.owner = 'enemy'
    enemyCluster.camp = 'autonomous'
    selectedCapital = requireCityTile(world, (tile) => tile.id === enemyCluster.cityHallTileId)
    selectedCapital.owner = 'enemy'
  }

  selectedCapital.name = selectedCapital.name || '青石城'
  configurePlayerAsAlliance(world)

  const path = buildSessionPersistPath(prefix)
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    selectedCapital,
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

async function runFoundingRequirementFailure(
  scenario: string,
  options: {
    allianceLevel: number
    controlledCommanderyCount: number
    selectedCapitalOwner?: 'player' | 'enemy'
  },
  expectedFailureCode: string,
) {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const seeded = seedNationFoundFailureWorldState(`nation_seed_smoke_${scenario}_world_state`, options)
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seeded.path,
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath(`nation_seed_smoke_${scenario}_session_state`),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)
    const officerToken = await joinPlayer(baseUrl, '验收官员')

    const response = await requestJsonWithHeaders(
      baseUrl,
      '/api/nation/found',
      'POST',
      { Authorization: `Bearer ${officerToken}` },
      {
        factionId: 'player',
        actorCommanderId: OFFICER_COMMANDER_ID,
        nationName: '青州试立国',
        color: '#3f7fbf',
        capitalTileId: seeded.selectedCapital.id,
      },
    )
    assert.equal(response.status, 409, `${scenario} should fail formal founding requirements: ${JSON.stringify(response.data)}`)
    const payload = readObject(response.data)
    assert.equal(payload.ok, false)
    assert.equal(payload.failureCode, expectedFailureCode)
    if (expectedFailureCode === 'nation_found_level_required' || expectedFailureCode === 'nation_found_commandery_required') {
      const requirement = readObject(payload.requirement)
      assert.equal(requirement.requiredAllianceLevel, 20)
      assert.equal(requirement.requiredCommanderyCityCount, 1)
      assert.equal(requirement.met, false)
      assert.equal(requirement.requiredMemberCount, undefined, 'kingdom founding should not expose member gate')
      assert.equal(requirement.memberCount, undefined, 'kingdom founding should not count members')
    }
  } finally {
    await shutdownChild(child)
  }
}

async function runSuccessLifecycleContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const seeded = seedNationLifecycleWorldState()
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seeded.path,
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('nation_seed_smoke_session_state'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const officerToken = await joinPlayer(baseUrl, '验收官员')
    const ordinaryToken = await joinPlayer(baseUrl, '普通成员')

    const foundingPayload = {
      factionId: 'player',
      actorCommanderId: OFFICER_COMMANDER_ID,
      nationName: '青州试立国',
      color: '#3f7fbf',
      capitalTileId: seeded.foundingCapital.id,
    }

    const noSessionFoundResponse = await requestJson(baseUrl, '/api/nation/found', 'POST', foundingPayload)
    assert.equal(noSessionFoundResponse.status, 401, 'nation founding should require a player session token')
    assert.equal(readObject(noSessionFoundResponse.data).failureCode, 'nation_found_session_required')

    const ordinaryFoundResponse = await requestJsonWithHeaders(
      baseUrl,
      '/api/nation/found',
      'POST',
      { Authorization: `Bearer ${ordinaryToken}` },
      foundingPayload,
    )
    assert.equal(ordinaryFoundResponse.status, 403, 'ordinary member should not found a kingdom')
    assert.equal(readObject(ordinaryFoundResponse.data).failureCode, 'nation_found_forbidden')

    const foundResponse = await requestJsonWithHeaders(
      baseUrl,
      '/api/nation/found',
      'POST',
      { Authorization: `Bearer ${officerToken}` },
      foundingPayload,
    )
    assert.equal(foundResponse.status, 200, `nation founding should succeed: ${JSON.stringify(foundResponse.data)}`)
    const foundPayload = readObject(foundResponse.data)
    assert.equal(foundPayload.ok, true)
    assert.equal(foundPayload.authorityGrantId, 'grant_player_frontline_commander')
    assert.equal(foundPayload.actorCommanderId, OFFICER_COMMANDER_ID)
    assert.equal(foundPayload.actorPlayerName, '验收官员')
    const foundNation = readObject(foundPayload.nation)
    assert.equal(foundNation.nationName, '青州试立国')
    assert.equal(foundNation.tier, 'kingdom')
    assert.equal(foundNation.color, '#3f7fbf')
    assert.equal(foundNation.capitalTileId, seeded.foundingCapital.id)
    assert.equal(foundNation.capitalName, seeded.foundingCapital.name)

    const worldAfterFoundResponse = await requestJson(baseUrl, '/api/world?intelMode=full', 'GET')
    assert.equal(worldAfterFoundResponse.status, 200, `world route failed after nation founding: ${JSON.stringify(worldAfterFoundResponse.data)}`)
    const worldAfterFound = readWorldStatePayload(worldAfterFoundResponse.data)
    assert.equal(worldAfterFound.factions.player.organizationKind, 'nation')
    assert.equal(worldAfterFound.factions.player.nationName, '青州试立国')
    assert.equal(worldAfterFound.factions.player.nationTier, 'kingdom')
    assert.equal(worldAfterFound.factions.player.colorHex, '#3f7fbf')
    assert.equal(worldAfterFound.factions.player.nationCapitalTileId, seeded.foundingCapital.id)
    assert.ok(
      worldAfterFound.factions.player.nationProfileAuditLog?.some((entry) => entry.action === 'foundNation'),
      'world state should persist foundNation audit entry',
    )

    const migrationResponse = await requestJsonWithHeaders(
      baseUrl,
      '/api/nation/capital/migrate',
      'POST',
      { Authorization: `Bearer ${officerToken}` },
      {
        factionId: 'player',
        actorCommanderId: OFFICER_COMMANDER_ID,
        capitalTileId: seeded.migrationCapital.id,
        nationName: '青州新都国',
        color: '#5db9b2',
      },
    )
    assert.equal(migrationResponse.status, 200, `capital migration should succeed: ${JSON.stringify(migrationResponse.data)}`)
    const migrationPayload = readObject(migrationResponse.data)
    assert.equal(migrationPayload.ok, true)
    assert.equal(readObject(migrationPayload.cost).jade, 200)
    assert.equal(readObject(migrationPayload.cost).before, 260)
    assert.equal(readObject(migrationPayload.cost).after, 60)
    const migratedNation = readObject(migrationPayload.nation)
    assert.equal(migratedNation.nationName, '青州新都国')
    assert.equal(migratedNation.color, '#5db9b2')
    assert.equal(migratedNation.capitalTileId, seeded.migrationCapital.id)
    assert.equal(migratedNation.capitalName, seeded.migrationCapital.name)
    assert.ok(String(migratedNation.renameCooldownUntil ?? '').length > 0, 'migration should start rename cooldown')
    assert.ok(
      (migratedNation.historicalNames as unknown[]).some((entry) => readObject(entry).nationName === '青州试立国'),
      'migration should keep historical nation name',
    )
    const migratedAuditLog = migratedNation.auditLog as unknown[]
    assert.ok(migratedAuditLog.some((entry) => readObject(entry).action === 'migrateCapital'), 'migration should write audit entry')

    const worldAfterMigrationResponse = await requestJson(baseUrl, '/api/world?intelMode=full', 'GET')
    assert.equal(worldAfterMigrationResponse.status, 200, `world route failed after capital migration: ${JSON.stringify(worldAfterMigrationResponse.data)}`)
    const worldAfterMigration = readWorldStatePayload(worldAfterMigrationResponse.data)
    assert.equal(worldAfterMigration.factions.player.nationName, '青州新都国')
    assert.equal(worldAfterMigration.factions.player.nationCapitalTileId, seeded.migrationCapital.id)
    assert.equal(worldAfterMigration.factions.player.colorHex, '#5db9b2')
    assert.equal(worldAfterMigration.factions.player.jade, 60)
    assert.ok(
      worldAfterMigration.factions.player.nationProfileAuditLog?.some((entry) => entry.action === 'migrateCapital'),
      'world state should persist migrateCapital audit entry',
    )
    assert.ok(
      worldAfterMigration.factions.player.nationNameHistory?.some((entry) => entry.nationName === '青州试立国'),
      'world state should persist historical nation name',
    )

    console.log(JSON.stringify({
      ok: true,
      smoke: 'nation_seed_success',
      foundNation: {
        nationName: foundNation.nationName,
        capitalTileId: foundNation.capitalTileId,
      },
      migratedCapital: {
        nationName: migratedNation.nationName,
        capitalTileId: migratedNation.capitalTileId,
        jadeAfter: readObject(migrationPayload.cost).after,
      },
    }, null, 2))
  } finally {
    await shutdownChild(child)
  }
}

async function run() {
  await runFoundingRequirementFailure(
    'level_required',
    { allianceLevel: 19, controlledCommanderyCount: 1 },
    'nation_found_level_required',
  )
  await runFoundingRequirementFailure(
    'commandery_required',
    { allianceLevel: 20, controlledCommanderyCount: 0 },
    'nation_found_commandery_required',
  )
  await runFoundingRequirementFailure(
    'capital_not_controlled',
    { allianceLevel: 20, controlledCommanderyCount: 1, selectedCapitalOwner: 'enemy' },
    'nation_found_capital_not_controlled',
  )
  await runSuccessLifecycleContract()
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
