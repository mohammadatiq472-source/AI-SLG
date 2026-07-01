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

function readSourceRefs(card: Record<string, unknown>): Record<string, unknown> {
  return readObject(card.sourceRefs)
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

async function runCourtCivilMemoryDedupeContract() {
  rmSync(join(process.cwd(), 'tmp', 'player-history-court-civil-memory-dedupe'), { recursive: true, force: true })
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('player_history_court_civil_memory_dedupe_session_state'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const advance = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', { action: 'advanceTick' }, 60_000)
    assert.equal(advance.status, 200, `advanceTick route failed: ${JSON.stringify(advance.data)}`)
    assert.equal(readObject(advance.data).ok, true, 'advanceTick should succeed')

    const events = await requestJson(baseUrl, '/api/events?limit=80', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const eventItems = readArray(readObject(events.data).items ?? readObject(events.data).events).map((item) => readObject(item))
    const courtReceiptEvents = eventItems.filter((item) =>
      (item.action === 'court_world_effect_applied' || item.action === 'court_world_effect_blocked') &&
      readObject(item.metadata).playerHistoryCategory === 'court'
    )
    assert.ok(courtReceiptEvents.length > 0, 'runtime events should include Court world-effect receipts')
    const receiptCivilMemoryIds = new Set<string>()
    for (const event of courtReceiptEvents) {
      const metadata = readObject(event.metadata)
      const civilMemoryId = String(metadata.playerHistoryCivilMemoryId ?? '').trim()
      assert.ok(civilMemoryId.length > 0, 'Court receipt metadata should anchor the matching Civil Memory entry')
      receiptCivilMemoryIds.add(civilMemoryId)
      assert.equal(metadata.playerHistoryScope, 'private_court')
      assert.equal(metadata.playerHistorySharePolicy, 'not_shareable_private')
    }

    const session = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'court_dedupe_owner',
    })
    assert.equal(session.status, 200, `session join failed: ${JSON.stringify(session.data)}`)
    const token = String(readObject(session.data).token ?? '')
    assert.ok(token.length > 0, 'session join should return bearer token')

    const history = await requestJsonWithBearer(
      baseUrl,
      '/api/player-history?factionId=player&limit=80&eventLimit=80&civilMemoryLimit=80',
      token,
    )
    assert.equal(history.status, 200, `player-history route failed: ${JSON.stringify(history.data)}`)
    const cards = readArray(readObject(readObject(history.data).timeline).cards).map((item) => readObject(item))
    const receiptCards = cards.filter((card) => {
      if (card.category !== 'court') return false
      const refs = readSourceRefs(card)
      return typeof refs.worldEventId === 'string' && receiptCivilMemoryIds.has(String(refs.civilMemoryId ?? ''))
    })
    assert.ok(receiptCards.length > 0, 'owner player history should expose Court receipt card with Civil Memory anchor')

    for (const card of receiptCards) {
      const refs = readSourceRefs(card)
      assert.equal(refs.visibility, 'internal_link_only')
      assert.equal(refs.visible, false)
      assert.ok(String(refs.worldEventId ?? '').length > 0, 'receipt card should retain world event recovery anchor')
      assert.ok(receiptCivilMemoryIds.has(String(refs.civilMemoryId ?? '')), 'receipt card should retain Civil Memory recovery anchor')
    }

    const duplicateCivilCards = cards.filter((card) => {
      if (card.category !== 'court') return false
      const refs = readSourceRefs(card)
      return typeof refs.worldEventId !== 'string' && receiptCivilMemoryIds.has(String(refs.civilMemoryId ?? ''))
    })
    assert.equal(
      duplicateCivilCards.length,
      0,
      'timeline should not duplicate Civil Memory Court cards when a player-safe Court receipt already references them',
    )

    const visiblePayload = JSON.stringify(receiptCards.map((card) => ({
      actorName: card.actorName,
      title: card.title,
      summary: card.summary,
      resultLabel: card.resultLabel,
      consequenceLabel: card.consequenceLabel,
      nextActionLabel: card.nextActionLabel,
    })))
    for (const forbidden of [
      'playerHistoryCivilMemoryId',
      'civilMemoryId',
      'worldEventId',
      'court_world_effect_applied',
      'court_world_effect_blocked',
      'court_session_closed',
      'court_resolution',
      'private_court',
      'not_shareable_private',
      'metadata',
      'backend',
      'debug',
      'fixture',
      'snake_case',
    ]) {
      assert.equal(visiblePayload.includes(forbidden), false, `Court dedupe visible copy leaked implementation term: ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runCourtCivilMemoryDedupeContract().then(() => {
  console.log('[player_history_court_civil_memory_dedupe_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_court_civil_memory_dedupe_contract] failed:', error)
  process.exitCode = 1
})
