import assert from 'node:assert/strict'
import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
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

function visibleCardText(card: Record<string, unknown>): string {
  return [
    card.actorName,
    card.title,
    card.summary,
    card.locationLabel,
    card.targetLabel,
    card.resultLabel,
    card.consequenceLabel,
    card.nextActionLabel,
  ].filter(Boolean).join('\n')
}

async function requestJsonWithBearer(
  baseUrl: string,
  path: string,
  method: 'GET' | 'POST',
  token: string,
  body?: Record<string, unknown>,
) {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const raw = await response.text()
  return {
    status: response.status,
    data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
  }
}

async function joinPlayer(baseUrl: string, playerName: string) {
  const response = await requestJson(baseUrl, '/api/session/join', 'POST', {
    factionId: 'player',
    playerName,
  })
  assert.equal(response.status, 200, `session join failed: ${JSON.stringify(response.data)}`)
  const token = String(readObject(response.data).token ?? '')
  assert.ok(token.length > 0, 'session join should return bearer token')
  return token
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

  const path = buildSessionPersistPath('player_history_organization_nation_empire_upgrade_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return path
}

async function runOrganizationNationEmpireUpgradeProducerContract() {
  rmSync(join(process.cwd(), 'tmp', 'player-history-organization-nation-empire-upgrade'), { recursive: true, force: true })

  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seedEmpireReadyWorldState(),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('player_history_organization_nation_empire_upgrade_session_state'),
  })

  try {
    const health = await waitForHealth(baseUrl, 90_000)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const officerToken = await joinPlayer(baseUrl, '验收官员')
    const ordinaryToken = await joinPlayer(baseUrl, '普通成员')

    const ordinaryResponse = await requestJsonWithBearer(
      baseUrl,
      '/api/nation/empire/upgrade',
      'POST',
      ordinaryToken,
      {
        factionId: 'player',
        actorCommanderId: 'ally_west',
      },
    )
    assert.equal(ordinaryResponse.status, 403, `ordinary member should not upgrade the nation: ${JSON.stringify(ordinaryResponse.data)}`)
    assert.equal(readObject(ordinaryResponse.data).failureCode, 'nation_empire_forbidden')

    const officerResponse = await requestJsonWithBearer(
      baseUrl,
      '/api/nation/empire/upgrade',
      'POST',
      officerToken,
      {
        factionId: 'player',
        actorCommanderId: 'ally_west',
      },
    )
    assert.equal(officerResponse.status, 200, `officer upgrade route failed: ${JSON.stringify(officerResponse.data)}`)
    assert.equal(readObject(officerResponse.data).ok, true, 'officer empire upgrade should succeed')

    const events = await requestJson(baseUrl, '/api/events?limit=40', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const eventItems = readArray(readObject(events.data).items ?? readObject(events.data).events).map((item) => readObject(item))
    const empireEvent = eventItems.find((item) => item.action === 'upgrade_nation_empire' && item.success === true)
    assert.ok(empireEvent, 'runtime events should include successful empire upgrade receipt')
    const metadata = readObject(readObject(empireEvent).metadata)
    assert.equal(metadata.playerHistoryCategory, 'organization_nation')
    assert.equal(metadata.playerHistoryTitle, '帝国晋升完成')
    assert.equal(metadata.playerHistoryActorName, '国政官员')
    assert.equal(metadata.playerHistoryLocation, '齐国')
    assert.equal(metadata.playerHistoryTarget, '帝国')
    assert.equal(metadata.playerHistoryResultLabel, '已晋升')
    assert.equal(metadata.playerHistoryNextAction, '查看国家目标')
    assert.equal(metadata.playerHistorySeverity, 'high')
    assert.equal(metadata.playerHistoryScope, 'own_organization')
    assert.equal(metadata.playerHistoryOrganizationId, 'player')
    assert.equal(metadata.playerHistoryRequiredOfficerRole, 'alliance_commander')
    assert.equal(metadata.playerHistorySharePolicy, 'not_shareable_private')
    assert.equal(metadata.playerHistoryShareStateLabel, '暂不可分享')
    assert.equal(typeof metadata.playerHistoryDedupeKey, 'string')

    const anonymousHistory = await requestJson(baseUrl, '/api/player-history?limit=40&eventLimit=40', 'GET')
    assert.equal(anonymousHistory.status, 200, `anonymous player-history failed: ${JSON.stringify(anonymousHistory.data)}`)
    const anonymousCards = readArray(readObject(readObject(anonymousHistory.data).timeline).cards).map((item) => readObject(item))
    assert.equal(
      anonymousCards.some((card) => card.category === 'organization_nation' && card.title === '帝国晋升完成'),
      false,
      'anonymous player history must not expose empire-upgrade organization card',
    )

    const ordinaryHistory = await requestJsonWithBearer(
      baseUrl,
      '/api/player-history?factionId=player&limit=40&eventLimit=40',
      'GET',
      ordinaryToken,
    )
    assert.equal(ordinaryHistory.status, 200, `ordinary player-history failed: ${JSON.stringify(ordinaryHistory.data)}`)
    const ordinaryCards = readArray(readObject(readObject(ordinaryHistory.data).timeline).cards).map((item) => readObject(item))
    assert.equal(
      ordinaryCards.some((card) => card.category === 'organization_nation' && card.title === '帝国晋升完成'),
      false,
      'same-organization non-officer reader must not expose empire-upgrade organization card',
    )

    const officerHistory = await requestJsonWithBearer(
      baseUrl,
      '/api/player-history?factionId=player&limit=40&eventLimit=40',
      'GET',
      officerToken,
    )
    assert.equal(officerHistory.status, 200, `officer player-history failed: ${JSON.stringify(officerHistory.data)}`)
    const officerCards = readArray(readObject(readObject(officerHistory.data).timeline).cards).map((item) => readObject(item))
    const officerCard = officerCards.find((card) => card.category === 'organization_nation' && card.title === '帝国晋升完成')
    assert.ok(officerCard, 'officer player history should expose empire-upgrade organization card')
    assert.equal(officerCard.actorName, '国政官员')
    assert.equal(officerCard.locationLabel, '齐国')
    assert.equal(officerCard.targetLabel, '帝国')
    assert.equal(officerCard.resultLabel, '已晋升')
    assert.equal(officerCard.nextActionLabel, '查看国家目标')
    assert.equal(officerCard.sharePolicy, undefined)
    assert.equal(officerCard.shareStateLabel, '暂不可分享')

    const visiblePayload = visibleCardText(officerCard)
    for (const required of ['帝国晋升完成', '国政官员', '齐国', '帝国', '已晋升', '查看国家目标']) {
      assert.ok(visiblePayload.includes(required), `organization/nation empire visible copy should include ${required}`)
    }
    for (const forbidden of [
      'upgradeNationToEmpire',
      'upgrade_nation_empire',
      'nation_empire',
      'nationTier',
      'playerHistoryRequiredOfficerRole',
      'authorityGrantId',
      'actorSessionId',
      'actorCommanderId',
      'playerHistorySharePolicy',
      'not_shareable_private',
      'own_organization',
      'organization_nation',
      'backend',
      'metadata',
      'debug',
      'fixture',
      'snake_case',
      '/api/nation/empire/upgrade',
    ]) {
      assert.equal(visiblePayload.includes(forbidden), false, `organization/nation empire visible copy leaked implementation term: ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runOrganizationNationEmpireUpgradeProducerContract().then(() => {
  console.log('[player_history_organization_nation_empire_upgrade_producer_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_organization_nation_empire_upgrade_producer_contract] failed:', error)
  process.exitCode = 1
})
