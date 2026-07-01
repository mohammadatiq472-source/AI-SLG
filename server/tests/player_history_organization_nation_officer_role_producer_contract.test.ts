import assert from 'node:assert/strict'
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

async function runOrganizationNationOfficerRoleProducerContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('player_history_organization_nation_officer_role_session_state'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const officerToken = await joinPlayer(baseUrl, '验收官员')
    const ordinaryToken = await joinPlayer(baseUrl, '普通成员')

    const markerPayload = {
      markerId: 'stage597_officer_frontline_marker',
      factionId: 'player',
      label: '河东战线',
      fromCell: { x: 4380, y: 2480 },
      toCell: { x: 4392, y: 2496 },
      actorCommanderId: 'ally_west',
      note: '稳住渡口',
      visibility: 'alliance',
    }

    const ordinaryUpdate = await requestJsonWithBearer(
      baseUrl,
      '/api/world/action?includeWorld=false',
      'POST',
      ordinaryToken,
      { action: 'updateAllianceFrontlineMarker', payload: markerPayload },
    )
    assert.equal(ordinaryUpdate.status, 200, `ordinary update route failed: ${JSON.stringify(ordinaryUpdate.data)}`)
    assert.equal(readObject(ordinaryUpdate.data).ok, false, 'ordinary organization member should not update officer marker')
    assert.equal(readObject(ordinaryUpdate.data).failureCode, 'alliance_frontline_marker_forbidden')

    const officerUpdate = await requestJsonWithBearer(
      baseUrl,
      '/api/world/action?includeWorld=false',
      'POST',
      officerToken,
      { action: 'updateAllianceFrontlineMarker', payload: markerPayload },
    )
    assert.equal(officerUpdate.status, 200, `officer update route failed: ${JSON.stringify(officerUpdate.data)}`)
    assert.equal(readObject(officerUpdate.data).ok, true, `officer update should succeed: ${JSON.stringify(officerUpdate.data)}`)

    const events = await requestJson(baseUrl, '/api/events?limit=40', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const eventItems = readArray(readObject(events.data).items ?? readObject(events.data).events).map((item) => readObject(item))
    const officerEvent = eventItems.find(
      (item) =>
        item.action === 'update_alliance_frontline_marker' &&
        item.success === true &&
        readObject(item.metadata).markerId === markerPayload.markerId,
    )
    assert.ok(officerEvent, 'runtime events should include successful officer frontline marker receipt')
    const metadata = readObject(readObject(officerEvent).metadata)
    assert.equal(metadata.playerHistoryCategory, 'organization_nation')
    assert.equal(metadata.playerHistoryTitle, '官员战线更新')
    assert.equal(metadata.playerHistoryActorName, '战线指挥官')
    assert.equal(metadata.playerHistoryTarget, '河东战线')
    assert.equal(metadata.playerHistoryResultLabel, '已更新')
    assert.equal(metadata.playerHistoryNextAction, '查看战线')
    assert.equal(metadata.playerHistorySeverity, 'medium')
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
      anonymousCards.some((card) => card.category === 'organization_nation' && card.title === '官员战线更新'),
      false,
      'anonymous player history must not expose officer-role organization card',
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
      ordinaryCards.some((card) => card.category === 'organization_nation' && card.title === '官员战线更新'),
      false,
      'same-organization non-officer reader must not expose officer-role organization card',
    )

    const officerHistory = await requestJsonWithBearer(
      baseUrl,
      '/api/player-history?factionId=player&limit=40&eventLimit=40',
      'GET',
      officerToken,
    )
    assert.equal(officerHistory.status, 200, `officer player-history failed: ${JSON.stringify(officerHistory.data)}`)
    const officerCards = readArray(readObject(readObject(officerHistory.data).timeline).cards).map((item) => readObject(item))
    const officerCard = officerCards.find((card) => card.category === 'organization_nation' && card.title === '官员战线更新')
    assert.ok(officerCard, 'officer player history should expose officer-role organization card')
    assert.equal(officerCard.actorName, '战线指挥官')
    assert.equal(officerCard.targetLabel, '河东战线')
    assert.equal(officerCard.resultLabel, '已更新')
    assert.equal(officerCard.nextActionLabel, '查看战线')
    assert.equal(officerCard.sharePolicy, undefined)
    assert.equal(officerCard.shareStateLabel, '暂不可分享')

    const visiblePayload = visibleCardText(officerCard)
    for (const required of ['官员战线更新', '战线指挥官', '河东战线', '稳住渡口', '查看战线']) {
      assert.ok(visiblePayload.includes(required), `organization/nation officer visible copy should include ${required}`)
    }
    for (const forbidden of [
      'updateAllianceFrontlineMarker',
      'update_alliance_frontline_marker',
      'alliance_officer',
      'alliance_commander',
      'officerAuthority',
      'authorityGrantId',
      'actorSessionId',
      'markerId',
      'playerHistoryRequiredOfficerRole',
      'not_shareable_private',
      'own_organization',
      'organization_nation',
      'backend',
      'metadata',
      'debug',
      'fixture',
      'snake_case',
      '/api/world/action',
    ]) {
      assert.equal(visiblePayload.includes(forbidden), false, `organization/nation officer visible copy leaked implementation term: ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runOrganizationNationOfficerRoleProducerContract().then(() => {
  console.log('[player_history_organization_nation_officer_role_producer_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_organization_nation_officer_role_producer_contract] failed:', error)
  process.exitCode = 1
})
