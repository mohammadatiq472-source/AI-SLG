import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import type { WorldState } from '../../shared/contracts/game'
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

function seedFoundingReadyWorldState(): { path: string; capitalTileId: string } {
  const world = createInitialWorldState()
  world.alliance.level = 20

  const cluster = world.map.overlays.cityClusters[0]
  assert.ok(cluster, 'seed world should expose a commandery city cluster')
  cluster.owner = 'player'
  cluster.camp = 'human_controlled'
  for (const tileId of cluster.tileIds) {
    const tile = world.map.tiles.find((candidate) => candidate.id === tileId)
    if (tile) {
      tile.owner = 'player'
    }
  }
  const capitalTile = world.map.tiles.find((candidate) => candidate.id === cluster.cityHallTileId)
  assert.ok(capitalTile, 'seed world should expose a commandery hall tile')
  capitalTile.owner = 'player'
  capitalTile.type = 'city'
  capitalTile.name = capitalTile.name || '青石城'

  const faction = world.factions.player
  faction.organizationId = 'player'
  faction.organizationKind = 'alliance'
  faction.organizationName = '青州同盟'
  faction.nationName = undefined
  faction.nationTier = undefined
  faction.nationColorHex = undefined
  faction.nationCapitalTileId = undefined
  faction.nationCapitalName = undefined
  faction.jade = 240

  const path = buildSessionPersistPath('nation_empire_upgrade_contract_founding_ready_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { path, capitalTileId: capitalTile.id }
}

function seedEmpireReadyWorldState(): string {
  const world = createInitialWorldState()
  world.alliance.level = 90

  const faction = world.factions.player
  faction.organizationId = 'player'
  faction.organizationKind = 'nation'
  faction.organizationName = '齐国'
  faction.nationName = '齐国'
  faction.colorHex = '#c95f32'
  faction.nationColorHex = '#c95f32'
  faction.nationCapitalTileId = 'tile_08'
  faction.nationCapitalName = '青石城'
  faction.jade = 240

  const cityClusters = world.map.overlays.cityClusters.slice(0, 10)
  assert.ok(cityClusters.length >= 10, 'seed world should expose at least 10 city clusters')
  for (const [index, cluster] of cityClusters.entries()) {
    cluster.owner = 'player'
    cluster.camp = 'human_controlled'
    for (const tileId of cluster.tileIds) {
      const tile = world.map.tiles.find((candidate) => candidate.id === tileId)
      if (tile) {
        tile.owner = 'player'
      }
    }
    const hallTile = world.map.tiles.find((candidate) => candidate.id === cluster.cityHallTileId)
    if (hallTile) {
      hallTile.owner = 'player'
      hallTile.type = 'city'
      hallTile.cityLevel = Math.max(hallTile.cityLevel ?? 7, 7)
      if (index === 0) {
        hallTile.landmarkId = 'state_government_empire_test_qingzhou'
        hallTile.landmarkName = '青州州治'
        cluster.name = '青州州治'
      }
    }
  }

  const path = buildSessionPersistPath('nation_empire_upgrade_contract_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return path
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

async function runFailureContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const foundingSeed = seedFoundingReadyWorldState()
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: foundingSeed.path,
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('nation_empire_upgrade_contract_session_state'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const officerToken = await joinPlayer(baseUrl, '验收官员')
    const ordinaryToken = await joinPlayer(baseUrl, '普通成员')

    const foundResponse = await requestJsonWithHeaders(
      baseUrl,
      '/api/nation/found',
      'POST',
      { Authorization: `Bearer ${officerToken}` },
      {
        factionId: 'player',
        actorCommanderId: 'ally_west',
        nationName: '青州试立国',
        color: '#3f7fbf',
        capitalTileId: foundingSeed.capitalTileId,
      },
    )
    assert.equal(foundResponse.status, 200, `nation founding failed: ${JSON.stringify(foundResponse.data)}`)

    const noSessionResponse = await requestJson(baseUrl, '/api/nation/empire/upgrade', 'POST', {
      factionId: 'player',
      actorCommanderId: 'ally_west',
    })
    assert.equal(noSessionResponse.status, 401, 'empire upgrade should require a player session token')
    assert.equal(readObject(noSessionResponse.data).failureCode, 'nation_empire_session_required')

    const ordinaryResponse = await requestJsonWithHeaders(
      baseUrl,
      '/api/nation/empire/upgrade',
      'POST',
      { Authorization: `Bearer ${ordinaryToken}` },
      {
        factionId: 'player',
        actorCommanderId: 'ally_west',
      },
    )
    assert.equal(ordinaryResponse.status, 403, 'ordinary member should not upgrade kingdom to empire')
    assert.equal(readObject(ordinaryResponse.data).failureCode, 'nation_empire_forbidden')

    const requirementResponse = await requestJsonWithHeaders(
      baseUrl,
      '/api/nation/empire/upgrade',
      'POST',
      { Authorization: `Bearer ${officerToken}` },
      {
        factionId: 'player',
        actorCommanderId: 'ally_west',
      },
    )
    assert.equal(requirementResponse.status, 409, 'officer should still fail when empire requirements are missing')
    const requirementPayload = readObject(requirementResponse.data)
    assert.equal(requirementPayload.failureCode, 'nation_empire_level_required')
    const requirement = readObject(requirementPayload.requirement)
    assert.equal(requirement.requiredAllianceLevel, 90)
    assert.equal(requirement.costJade, 200)
    assert.equal(requirement.met, false)
    assert.equal(requirement.requiredMemberCount, undefined, 'empire requirement should not expose member gate')
    assert.equal(requirement.memberCount, undefined, 'empire requirement should not count members')
  } finally {
    await shutdownChild(child)
  }
}

async function runSuccessContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seedEmpireReadyWorldState(),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('nation_empire_upgrade_contract_success_session_state'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const officerToken = await joinPlayer(baseUrl, '验收官员')
    const response = await requestJsonWithHeaders(
      baseUrl,
      '/api/nation/empire/upgrade',
      'POST',
      { Authorization: `Bearer ${officerToken}` },
      {
        factionId: 'player',
        actorCommanderId: 'ally_west',
      },
    )
    assert.equal(response.status, 200, `empire upgrade should succeed: ${JSON.stringify(response.data)}`)
    const payload = readObject(response.data)
    assert.equal(payload.ok, true)
    assert.equal(readObject(payload.cost).jade, 200)
    assert.equal(readObject(payload.cost).before, 240)
    assert.equal(readObject(payload.cost).after, 40)
    const nation = readObject(payload.nation)
    assert.equal(nation.tier, 'empire')
    const requirement = readObject(payload.requirement)
    assert.equal(requirement.requiredMemberCount, undefined, 'empire success requirement should not expose member gate')
    assert.equal(requirement.memberCount, undefined, 'empire success requirement should not count members')
    assert.ok(
      (nation.auditLog as unknown[]).some((entry) => readObject(entry).action === 'upgradeEmpire'),
      'nation profile should record upgradeEmpire audit entry',
    )

    const worldResponse = await requestJson(baseUrl, '/api/world?intelMode=full', 'GET')
    assert.equal(worldResponse.status, 200, `world route failed after empire upgrade: ${JSON.stringify(worldResponse.data)}`)
    const world = readWorldStatePayload(worldResponse.data)
    assert.equal(world.factions.player.nationTier, 'empire')
    assert.equal(world.factions.player.jade, 40)
    assert.ok(
      world.factions.player.nationProfileAuditLog?.some((entry) => entry.action === 'upgradeEmpire'),
      'world state should persist upgradeEmpire audit entry',
    )
  } finally {
    await shutdownChild(child)
  }
}

async function run() {
  await runFailureContract()
  await runSuccessContract()
  console.log(JSON.stringify({ ok: true, contract: 'nation_empire_upgrade' }, null, 2))
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
