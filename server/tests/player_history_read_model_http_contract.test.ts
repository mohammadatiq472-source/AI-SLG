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

async function joinFaction(baseUrl: string, factionId: string, playerName: string) {
  const response = await requestJson(baseUrl, '/api/session/join', 'POST', {
    factionId,
    playerName,
  })
  assert.equal(response.status, 200, `session join failed for ${factionId}: ${JSON.stringify(response.data)}`)
  const payload = readObject(response.data)
  const token = String(payload.token ?? '')
  assert.ok(token.length > 0, `${factionId} session join should return token`)
  return token
}

const tail: TailState = { stdout: [], stderr: [] }
const port = await getAvailablePort()
const baseUrl = `http://127.0.0.1:${port}`
const child = spawnBackend(port, tail, {
  WORLD_SAVE_SLOTS_PATH: buildSessionPersistPath('player_history_read_model_http_save_slots'),
  WORLD_SAVE_SLOTS_ARCHIVE_DIR: `${buildSessionPersistPath('player_history_read_model_http_save_slots_archive')}.archive`,
})

try {
  const health = await waitForHealth(baseUrl)
  assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

  const playerToken = await joinFaction(baseUrl, 'player', 'player_history_http_reader')
  const saveResponse = await requestJsonWithBearer(baseUrl, '/api/save-slots/save', 'POST', playerToken, {
    slotId: 'player_history_http_slot',
    label: '洛阳战前',
  })
  assert.equal(saveResponse.status, 200, `player save-slot setup should pass: ${JSON.stringify(saveResponse.data)}`)
  assert.equal(readObject(readObject(saveResponse.data).slot).ownerFactionId, 'player')

  const response = await requestJsonWithBearer(
    baseUrl,
    '/api/player-history?factionId=player&limit=20&eventLimit=20&civilMemoryLimit=20',
    'GET',
    playerToken,
  )
  assert.equal(response.status, 200, `player history route should return 200: ${JSON.stringify(response.data)}`)

  const payload = readObject(response.data)
  const timeline = readObject(payload.timeline)
  assert.equal(timeline.contractId, 'player_world_timeline_read_model_v1')
  const cards = readArray(timeline.cards)
  assert.ok(cards.length > 0, 'player history timeline should expose at least one player-safe card')

  const saveLoad = readObject(payload.saveLoad)
  assert.equal(saveLoad.contractId, 'player_save_load_slots_v1')
  assert.equal(typeof saveLoad.selectedSlotId, 'string')
  assert.equal(typeof saveLoad.restoreRiskLabel, 'string')
  assert.equal(typeof saveLoad.restoreFeedbackLabel, 'string')
  assert.equal(saveLoad.emptyStateLabel, '暂无可恢复存档')
  const slots = readArray(saveLoad.slots)
  assert.ok(slots.length >= 1, 'player history should expose save/load slots')
  const firstSlot = readObject(slots[0])
  assert.equal(firstSlot.contractId, 'player_save_load_slots_v1')
  assert.equal(firstSlot.slotLabel, '洛阳战前')
  assert.equal(typeof firstSlot.worldSummary, 'string')
  assert.equal(typeof firstSlot.restorePreviewLabel, 'string')

  const civilMemoryCards = readArray(payload.civilMemoryCards)
  for (const card of civilMemoryCards) {
    assert.equal(readObject(card).contractId, 'civil_memory_history_card_v1')
  }

  const visiblePayload = JSON.stringify({
    timeline: cards.map((card) => {
      const item = readObject(card)
      return {
        category: item.category,
        actorName: item.actorName,
        title: item.title,
        summary: item.summary,
        resultLabel: item.resultLabel,
        consequenceLabel: item.consequenceLabel,
        nextActionLabel: item.nextActionLabel,
        timestampBucket: item.timestampBucket,
      }
    }),
    saveLoad: slots.map((slot) => {
      const item = readObject(slot)
      return {
        selectedSlotId: saveLoad.selectedSlotId,
        restoreRiskLabel: saveLoad.restoreRiskLabel,
        restoreFeedbackLabel: saveLoad.restoreFeedbackLabel,
        emptyStateLabel: saveLoad.emptyStateLabel,
        slotLabel: item.slotLabel,
        savedAtLabel: item.savedAtLabel,
        worldSummary: item.worldSummary,
        riskHint: item.riskHint,
        restorePreviewLabel: item.restorePreviewLabel,
      }
    }),
    civilMemoryCards: civilMemoryCards.map((card) => {
      const item = readObject(card)
      return {
        title: item.title,
        causeLabel: item.causeLabel,
        affectedPartyLabel: item.affectedPartyLabel,
        currentImpactLabel: item.currentImpactLabel,
        suggestedFollowUpLabel: item.suggestedFollowUpLabel,
      }
    }),
  })

  for (const forbidden of [
    '/api/',
    'memoryProvider',
    'rawEventType',
    'routeName',
    'metadata',
    'world_action',
    'persistence',
    'save-slots',
    'smoke-setup',
    'archive',
  ]) {
    assert.ok(!visiblePayload.includes(forbidden), `player-visible history HTTP payload should not leak ${forbidden}`)
  }
} finally {
  await shutdownChild(child)
}

console.log('[player_history_read_model_http_contract] all checks passed')
