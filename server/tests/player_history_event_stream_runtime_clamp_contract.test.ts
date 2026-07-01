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
import type { WorldEventRecord } from '../../shared/contracts/game'
import { buildPlayerHistoryLivePreviewReadModel } from '../../shared/domain/playerHistory'

async function runPlayerHistoryEventStreamRuntimeClampContract() {
  const backpressureFixture = buildPlayerHistoryLivePreviewReadModel(
    Array.from({ length: 5 }, (_, index) => buildLivePreviewFixtureEvent(index)),
    { enabled: true, maxPreviewItems: 3 },
  )
  assert.equal(backpressureFixture.contractId, 'player_history_live_preview_v1')
  assert.equal(backpressureFixture.previewCardCount, 3)
  assert.equal(backpressureFixture.backpressureApplied, true)
  assert.equal(backpressureFixture.collapsedFeedbackLabel, '更多新动态')
  assert.equal(backpressureFixture.droppedCountLabel, '已合并 2 条新动态')

  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    WORLD_SAVE_SLOTS_PATH: buildSessionPersistPath('player_history_runtime_clamp_save_slots'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const saveResponse = await requestJson(baseUrl, '/api/save-slots/smoke-setup/prime', 'POST', {
      slotId: 'history_clamp_slot',
      label: '前线分页验证',
      source: 'current_world',
    })
    assert.equal(saveResponse.status, 200, `save-slot smoke setup should pass: ${JSON.stringify(saveResponse.data)}`)

    const response = await requestJson(
      baseUrl,
      '/api/player-history?limit=999&eventLimit=999&civilMemoryLimit=999&replayLimit=999',
      'GET',
    )
    assert.equal(response.status, 200, `player history route should return 200: ${JSON.stringify(response.data)}`)

    const payload = readObject(response.data)
    assert.equal(payload.livePreview, undefined, 'live preview must not be returned without explicit opt-in')
    const timeline = readObject(payload.timeline)
    assert.equal(timeline.contractId, 'player_world_timeline_read_model_v1')
    assert.equal(timeline.historyPageLimit, 80)
    assert.equal(timeline.historyCursorStable, true)
    assert.equal(typeof timeline.historyDedupeKey, 'string')
    assert.equal(timeline.historyNotificationBudget, 3)
    assert.equal(timeline.historyCooldownApplied, true)
    assert.ok(String(timeline.historyDedupeKey).startsWith('timeline-page:'))
    if (timeline.historyDurableCardAnchor !== undefined) {
      assert.ok(String(timeline.historyDurableCardAnchor).startsWith('timeline-card:'))
    }
    if (timeline.historyNextCursor !== undefined) {
      assert.equal(typeof timeline.historyNextCursor, 'string')
      assert.ok(String(timeline.historyNextCursor).length > 0)
    }

    const cards = readArray(timeline.cards)
    assert.ok(cards.length > 0, 'player history timeline should expose at least one player-safe card')
    assert.equal(cards.length <= 80, true, 'player history cards must be clamped to 80')

    const visiblePayload = JSON.stringify(cards.map((card) => {
      const item = readObject(card)
      return {
        actorName: item.actorName,
        title: item.title,
        summary: item.summary,
        locationLabel: item.locationLabel,
        targetLabel: item.targetLabel,
        resultLabel: item.resultLabel,
        consequenceLabel: item.consequenceLabel,
        nextActionLabel: item.nextActionLabel,
      }
    }))

    for (const forbidden of [
      '/api/events',
      '/api/events/stream',
      'SSE',
      'raw event',
      'backend timing',
      'replayLimit',
      'historyPageLimit',
      'historyCursorStable',
      'historyNextCursor',
      'historyDedupeKey',
      'historyNotificationBudget',
      'historyCooldownApplied',
      'historyDurableCardAnchor',
      'ops',
      'debug',
      'route',
      'snake_case',
    ]) {
      assert.equal(visiblePayload.includes(forbidden), false, `player visible history leaked stream/rate term: ${forbidden}`)
    }

    const livePreviewResponse = await requestJson(
      baseUrl,
      '/api/player-history?limit=999&eventLimit=999&civilMemoryLimit=999&replayLimit=999&livePreview=1',
      'GET',
    )
    assert.equal(livePreviewResponse.status, 200, `player history live preview should return 200: ${JSON.stringify(livePreviewResponse.data)}`)
    const livePreviewPayload = readObject(livePreviewResponse.data)
    const livePreview = readObject(livePreviewPayload.livePreview)
    assert.equal(livePreview.contractId, 'player_history_live_preview_v1')
    assert.equal(livePreview.optInRequired, true)
    assert.equal(livePreview.enabled, true)
    assert.equal(livePreview.rawStreamDefaultDenied, true)
    assert.equal(Number(livePreview.previewCardCount) <= 3, true)
    assert.equal(typeof livePreview.backpressureApplied, 'boolean')
    if (livePreview.backpressureApplied) {
      assert.equal(livePreview.collapsedFeedbackLabel, '更多新动态')
      assert.ok(String(livePreview.droppedCountLabel).startsWith('已合并 '))
    } else {
      assert.equal(livePreview.collapsedFeedbackLabel, '暂无更多新动态')
      assert.equal(livePreview.droppedCountLabel, '暂无折叠动态')
    }
    if (livePreview.durableCardAnchor !== undefined) {
      assert.ok(String(livePreview.durableCardAnchor).startsWith('timeline-card:'))
    }

    const livePreviewVisibleCopy = JSON.stringify({
      visibleStateLabel: livePreview.visibleStateLabel,
      collapsedFeedbackLabel: livePreview.collapsedFeedbackLabel,
      droppedCountLabel: livePreview.droppedCountLabel,
    })
    for (const forbidden of [
      '/api/events',
      '/api/events/stream',
      'SSE',
      'raw event',
      'backend timing',
      'route',
      'debug',
      'ops',
      'historyPageLimit',
      'historyDedupeKey',
      'historyNotificationBudget',
      'historyCooldownApplied',
      'historyDurableCardAnchor',
    ]) {
      assert.equal(livePreviewVisibleCopy.includes(forbidden), false, `live preview visible copy leaked stream term: ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

function buildLivePreviewFixtureEvent(index: number): WorldEventRecord {
  return {
    id: `live-preview-fixture-${index + 1}`,
    category: 'system',
    action: 'live_preview_fixture',
    success: true,
    tick: index + 1,
    worldVersion: 1,
    createdAt: '2026-06-13T00:00:00.000Z',
    metadata: {
      playerHistoryScope: 'public_world',
      playerHistoryTitle: `新动态 ${index + 1}`,
    },
  }
}

runPlayerHistoryEventStreamRuntimeClampContract().then(() => {
  console.log('[player_history_event_stream_runtime_clamp_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_event_stream_runtime_clamp_contract] failed:', error)
  process.exitCode = 1
})
