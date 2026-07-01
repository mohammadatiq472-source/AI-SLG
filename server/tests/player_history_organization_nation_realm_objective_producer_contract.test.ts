import assert from 'node:assert/strict'
import {
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

async function postWorldAction(baseUrl: string, action: string, payload: Record<string, unknown>) {
  const response = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', { action, payload }, 60_000)
  assert.equal(response.status, 200, `${action} route failed: ${JSON.stringify(response.data)}`)
  const body = readObject(response.data)
  assert.equal(body.ok, true, `${action} should succeed: ${JSON.stringify(body)}`)
  return readObject(body.receipt)
}

async function requestJsonWithBearer(baseUrl: string, path: string, token: string) {
  const response = await fetch(new URL(path, baseUrl), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const raw = await response.text()
  return {
    status: response.status,
    data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
  }
}

async function runOrganizationNationRealmObjectiveProducerContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail)

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const authority = await postWorldAction(baseUrl, 'issueNationMidgameLuoyangAuthorityClaim', {
      factionId: 'player',
      sourcePageId: 'nation/midgame',
      targetLabel: '洛阳',
      organizationId: 'player',
      nationObjectiveId: 'luoyang_prefecture_contest',
    })
    const report = await postWorldAction(baseUrl, 'recordNationMidgameLuoyangBattleReportFeedback', {
      factionId: 'player',
      sourceLuoyangContestId: authority.luoyangContestId,
      sourcePageId: 'nation/midgame',
      targetLabel: '洛阳',
      organizationId: 'player',
      reportStatus: 'recorded',
    })
    const control = await postWorldAction(baseUrl, 'recordNationMidgameLuoyangControlAuthority', {
      factionId: 'player',
      sourceLuoyangContestId: authority.luoyangContestId,
      sourceOrganizationReportId: report.organizationReportId,
      sourcePageId: 'nation/midgame',
      targetLabel: '洛阳',
      organizationId: 'player',
      controlStatus: 'recorded',
    })
    const bridge = await postWorldAction(baseUrl, 'recordNationMidgameRealmObjectiveBridge', {
      factionId: 'player',
      sourceControlAuthorityId: control.controlAuthorityId,
      sourceLuoyangControlProgressId: control.prefectureControlProgressId,
      sourcePageId: 'nation/midgame',
      targetLabel: '王国目标',
      organizationId: 'player',
      nextStepLabel: '巩固洛阳',
    })
    assert.equal(bridge.action, 'recordNationMidgameRealmObjectiveBridge')
    assert.equal(bridge.targetLabel, '王国目标')
    assert.equal(bridge.nextStepLabel, '巩固洛阳')
    assert.equal(bridge.usesOrganizationNationSurface, true)

    const events = await requestJson(baseUrl, '/api/events?limit=30', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const eventItems = readArray(readObject(events.data).items ?? readObject(events.data).events).map((item) => readObject(item))
    const bridgeEvent = eventItems.find((item) => item.action === 'record_nation_midgame_realm_objective_bridge' && item.success === true)
    assert.ok(bridgeEvent, 'runtime events should include successful realm objective bridge')
    const metadata = readObject(readObject(bridgeEvent).metadata)
    assert.equal(metadata.playerHistoryCategory, 'organization_nation')
    assert.equal(metadata.playerHistoryTitle, '同盟目标推进')
    assert.equal(metadata.playerHistoryActorName, '青州同盟')
    assert.equal(metadata.playerHistoryLocation, '洛阳')
    assert.equal(metadata.playerHistoryTarget, '王国目标')
    assert.equal(metadata.playerHistoryResultLabel, '已推进')
    assert.equal(metadata.playerHistoryNextAction, '查看同盟目标')
    assert.equal(metadata.playerHistorySeverity, 'medium')
    assert.equal(metadata.playerHistoryScope, 'own_organization')
    assert.equal(metadata.playerHistorySharePolicy, 'not_shareable_private')
    assert.equal(metadata.playerHistoryShareStateLabel, '暂不可分享')
    assert.equal(metadata.organizationId, 'player')
    assert.equal(typeof metadata.playerHistoryDedupeKey, 'string')
    assert.equal(metadata.realmObjectiveProgressId, bridge.realmObjectiveProgressId)

    const session = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'organization_history_reader',
    })
    assert.equal(session.status, 200, `session join failed: ${JSON.stringify(session.data)}`)
    const token = String(readObject(session.data).token ?? '')
    assert.ok(token.length > 0, 'session join should return bearer token for organization-scope player history')

    const history = await requestJsonWithBearer(baseUrl, '/api/player-history?factionId=player&limit=30&eventLimit=30&civilMemoryLimit=5', token)
    assert.equal(history.status, 200, `player-history route failed: ${JSON.stringify(history.data)}`)
    const timeline = readObject(readObject(history.data).timeline)
    const cards = readArray(timeline.cards).map((item) => readObject(item))
    const orgCard = cards.find((card) => card.category === 'organization_nation' && card.title === '同盟目标推进')
    assert.ok(orgCard, 'player history should expose realm objective bridge as an organization/nation card')
    assert.equal(orgCard.actorName, '青州同盟')
    assert.equal(orgCard.targetLabel, '王国目标')
    assert.equal(orgCard.nextActionLabel, '查看同盟目标')
    assert.equal(orgCard.sharePolicy, undefined)
    assert.equal(orgCard.shareStateLabel, '暂不可分享')

    const visiblePayload = visibleCardText(orgCard)
    for (const required of ['同盟目标推进', '青州同盟', '王国目标', '巩固洛阳', '查看同盟目标']) {
      assert.ok(visiblePayload.includes(required), `organization/nation visible copy should include ${required}`)
    }
    for (const forbidden of [
      'recordNationMidgameRealmObjectiveBridge',
      'record_nation_midgame_realm_objective_bridge',
      'realmObjectiveProgressId',
      'sourceControlAuthorityId',
      'sourceLuoyangControlProgressId',
      'nation_midgame_frontend_skeleton_v1',
      'organization_membership_authority_v1',
      'tier',
      '/api/world/action',
      'metadata',
      'backend',
      'route',
      'fixture',
      'snake_case',
      'not_shareable_private',
      'own_organization',
      'shareToken',
    ]) {
      assert.equal(visiblePayload.includes(forbidden), false, `organization/nation visible copy leaked implementation term: ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runOrganizationNationRealmObjectiveProducerContract().then(() => {
  console.log('[player_history_organization_nation_realm_objective_producer_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_organization_nation_realm_objective_producer_contract] failed:', error)
  process.exitCode = 1
})
