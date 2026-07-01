import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
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

async function requestJsonWithBearer(baseUrl: string, path: string, token?: string) {
  const response = await fetch(new URL(path, baseUrl), {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  const raw = await response.text()
  return {
    status: response.status,
    data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
  }
}

async function runCourtAppliedWorldEffectProducerContract() {
  rmSync(join(process.cwd(), 'tmp', 'player-history-court-applied-world-effect'), { recursive: true, force: true })

  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('player_history_court_applied_world_effect_session_state'),
  })

  try {
    const health = await waitForHealth(baseUrl, 90_000)
    assert.ok(health?.ok, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const advance = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'advanceTick',
    }, 90_000)
    assert.equal(advance.status, 200, `advanceTick failed: ${JSON.stringify(advance.data)}`)
    const advancePayload = readObject(advance.data)
    assert.equal(advancePayload.ok, true)
    const courtSession = readObject(advancePayload.courtSession)
    const passedResolutions = readArray(courtSession.resolutions)
      .map((item) => readObject(item))
      .filter((item) => item.decision === 'passed')
    assert.ok(passedResolutions.length > 0, 'advanceTick should run a Court session with at least one passed resolution')

    const events = await requestJson(baseUrl, '/api/events?limit=80', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const eventItems = readArray(readObject(events.data).items ?? readObject(events.data).events).map((item) => readObject(item))
    const appliedEvent = eventItems.find((item) => item.action === 'court_world_effect_applied' && item.success === true)
    assert.ok(appliedEvent, 'runtime events should include a Court applied world-effect receipt')
    const metadata = readObject(readObject(appliedEvent).metadata)
    assert.equal(metadata.playerHistoryCategory, 'court')
    assert.equal(metadata.playerHistoryTitle, '决议已执行')
    assert.equal(metadata.playerHistoryActorName, '洛阳朝议')
    assert.equal(metadata.playerHistoryResultLabel, '已执行')
    assert.equal(metadata.playerHistoryNextAction, '查看朝议')
    assert.equal(metadata.playerHistorySeverity, 'medium')
    assert.equal(metadata.playerHistoryScope, 'private_court')
    assert.equal(metadata.playerHistoryFactionId, 'player')
    assert.equal(metadata.playerHistorySharePolicy, 'not_shareable_private')
    assert.equal(metadata.playerHistoryShareStateLabel, '暂不可分享')
    assert.equal(metadata.courtWorldEffectState, 'world_effect_applied')
    assert.ok(Number(metadata.courtWorldVersionAfter) > Number(metadata.courtWorldVersionBefore))
    assert.equal(typeof metadata.playerHistoryDedupeKey, 'string')

    const anonymousHistory = await requestJson(baseUrl, '/api/player-history?limit=40&eventLimit=80', 'GET')
    assert.equal(anonymousHistory.status, 200, `anonymous player-history route failed: ${JSON.stringify(anonymousHistory.data)}`)
    const anonymousCards = readArray(readObject(readObject(anonymousHistory.data).timeline).cards).map((item) => readObject(item))
    assert.equal(
      anonymousCards.some((card) => card.category === 'court' && card.title === '决议已执行'),
      false,
      'anonymous player history must not expose private Court applied receipts',
    )

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'court_applied_owner',
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)
    const token = String(readObject(join.data).token)
    assert.ok(token.length > 0, 'session join should return a bearer token')

    const history = await requestJsonWithBearer(baseUrl, '/api/player-history?factionId=player&limit=40&eventLimit=80', token)
    assert.equal(history.status, 200, `owner player-history route failed: ${JSON.stringify(history.data)}`)
    const cards = readArray(readObject(readObject(history.data).timeline).cards).map((item) => readObject(item))
    const courtCard = cards.find((card) => card.category === 'court' && card.title === '决议已执行')
    assert.ok(courtCard, 'owner player history should expose Court applied receipt as a court card')
    assert.equal(courtCard.actorName, '洛阳朝议')
    assert.equal(courtCard.resultLabel, '已执行')
    assert.equal(courtCard.nextActionLabel, '查看朝议')
    assert.equal(courtCard.sharePolicy, undefined, 'private Court applied receipt should not become shareable')
    assert.equal(courtCard.shareStateLabel, '暂不可分享')

    const visiblePayload = visibleCardText(courtCard)
    for (const required of ['决议已执行', '洛阳朝议', '已执行', '查看朝议']) {
      assert.ok(visiblePayload.includes(required), `Court applied visible copy should include ${required}`)
    }
    for (const forbidden of [
      'court_world_effect_applied',
      'advanceTick',
      'court_session_closed',
      'court_resolution',
      'executionDirective',
      'execute:',
      'resolutionId',
      'proposalId',
      'CourtSession',
      'private_court',
      'playerHistory',
      'backend',
      'metadata',
      'debug',
      'fixture',
      'snake_case',
    ]) {
      assert.equal(visiblePayload.includes(forbidden), false, `Court applied visible copy leaked implementation term: ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runCourtAppliedWorldEffectProducerContract().then(() => {
  console.log('[player_history_court_applied_world_effect_producer_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_court_applied_world_effect_producer_contract] failed:', error)
  process.exitCode = 1
})
