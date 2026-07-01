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

function worldSignature(world: Record<string, unknown>): string {
  return JSON.stringify({
    worldVersion: world.worldVersion,
    tick: world.tick,
    factions: world.factions,
    cells: world.cells,
    resources: world.resources,
  })
}

async function requestJsonWithBearer(
  baseUrl: string,
  path: string,
  bearerToken: string,
  timeoutMs = 15_000,
) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(new URL(path, baseUrl), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      signal: controller.signal,
    })
    const raw = await response.text()
    return {
      status: response.status,
      data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
    }
  } finally {
    clearTimeout(timer)
  }
}

async function runCourtDecisionWorldEffectReceiptContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('court_decision_world_effect_receipt_session_state'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)
    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'player',
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)
    const sessionToken = String(readObject(join.data).token ?? '')
    assert.ok(sessionToken.length > 0, 'session join should return bearer token')

    const beforeResponse = await requestJson(baseUrl, '/api/world?intelMode=full', 'GET', undefined, 30_000)
    assert.equal(beforeResponse.status, 200, `world route failed before preview: ${JSON.stringify(beforeResponse.data)}`)
    const beforeWorld = readObject(readObject(beforeResponse.data).world)

    const preview = await requestJson(
      baseUrl,
      '/api/world/action',
      'POST',
      {
        action: 'previewCourtSession',
        payload: {
          maxOptions: 6,
          maxProposals: 6,
        },
      },
      60_000,
    )
    assert.equal(preview.status, 200, `court preview failed: ${JSON.stringify(preview.data)}`)
    const previewPayload = readObject(preview.data)
    assert.equal(previewPayload.ok, true)
    const courtSession = readObject(previewPayload.courtSession)
    const proposals = readArray(courtSession.proposals).map((item) => readObject(item))
    const resolutions = readArray(courtSession.resolutions).map((item) => readObject(item))
    assert.ok(proposals.length > 0, 'court preview should expose proposals')
    assert.ok(resolutions.length > 0, 'court preview should expose resolutions')

    const afterResponse = await requestJson(baseUrl, '/api/world?intelMode=full', 'GET', undefined, 30_000)
    assert.equal(afterResponse.status, 200, `world route failed after preview: ${JSON.stringify(afterResponse.data)}`)
    const afterWorld = readObject(readObject(afterResponse.data).world)
    assert.equal(
      worldSignature(afterWorld),
      worldSignature(beforeWorld),
      'Court preview receipt must remain pending/deferred and must not mutate world state',
    )

    const events = await requestJson(baseUrl, '/api/events?limit=20', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const eventItems = readArray(readObject(events.data).items ?? readObject(events.data).events).map((item) => readObject(item))
    const previewEvent = eventItems.find((item) => item.action === 'preview_court_session' && item.success === true)
    assert.ok(previewEvent, 'runtime events should include successful preview_court_session')
    const metadata = readObject(readObject(previewEvent).metadata)
    assert.equal(metadata.playerHistoryCategory, 'court')
    assert.equal(metadata.playerHistoryActorName, '洛阳朝议')
    assert.ok(['决议待执行', '朝议暂缓'].includes(String(metadata.playerHistoryTitle)))
    assert.ok(['待执行', '暂缓'].includes(String(metadata.playerHistoryResultLabel)))
    assert.equal(metadata.playerHistoryNextAction, '查看朝议')
    assert.equal(metadata.playerHistorySeverity, 'medium')
    assert.equal(metadata.playerHistoryScope, 'private_court')
    assert.equal(metadata.playerHistoryFactionId, 'player')
    assert.equal(metadata.playerHistorySharePolicy, 'not_shareable_private')
    assert.equal(metadata.playerHistoryShareStateLabel, '暂不可分享')
    assert.equal(typeof metadata.playerHistoryDedupeKey, 'string')
    assert.equal(metadata.courtWorldEffectState === 'decision_passed_pending' || metadata.courtWorldEffectState === 'decision_deferred_or_held', true)

    const history = await requestJsonWithBearer(baseUrl, '/api/player-history?limit=20&eventLimit=20&civilMemoryLimit=5', sessionToken)
    assert.equal(history.status, 200, `player-history route failed: ${JSON.stringify(history.data)}`)
    const timeline = readObject(readObject(history.data).timeline)
    const cards = readArray(timeline.cards).map((item) => readObject(item))
    const courtCard = cards.find((card) => card.category === 'court' && ['决议待执行', '朝议暂缓'].includes(String(card.title)))
    assert.ok(courtCard, 'player history should expose Court pending/deferred receipt as a court card')
    assert.equal(courtCard.actorName, '洛阳朝议')
    assert.equal(courtCard.nextActionLabel, '查看朝议')
    assert.equal(courtCard.sharePolicy, undefined, 'private Court receipt should not become shareable')
    assert.equal(courtCard.shareStateLabel, '暂不可分享')

    const visiblePayload = visibleCardText(courtCard)
    for (const required of ['洛阳朝议', '查看朝议']) {
      assert.ok(visiblePayload.includes(required), `Court receipt visible copy should include ${required}`)
    }
    for (const forbidden of [
      'preview_court_session',
      'previewCourtSession',
      'court_session_closed',
      'court_resolution',
      'execute:',
      'hold:',
      'proposalId',
      'resolutionId',
      'seatId',
      'CourtSession',
      '/api/world/action',
      'metadata',
      'debug',
      'route',
      'fixture',
      'snake_case',
    ]) {
      assert.equal(visiblePayload.includes(forbidden), false, `Court receipt visible copy leaked implementation term: ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runCourtDecisionWorldEffectReceiptContract().then(() => {
  console.log('[court_decision_world_effect_receipt_contract] all checks passed')
}).catch((error) => {
  console.error('[court_decision_world_effect_receipt_contract] failed:', error)
  process.exitCode = 1
})
