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

async function runPlayerHistoryNotificationPersistenceDedupeRuntimeContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('player_history_notification_persistence_session'),
    WORLD_SAVE_SLOTS_PATH: buildSessionPersistPath('player_history_notification_persistence_save_slots'),
    WORLD_SAVE_SLOTS_ARCHIVE_DIR: `${buildSessionPersistPath('player_history_notification_persistence_save_slots_archive')}.archive`,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const first = await requestJson(baseUrl, '/api/player-history?limit=12&eventLimit=12&civilMemoryLimit=12&replayLimit=3', 'GET')
    assert.equal(first.status, 200, `first player-history request failed: ${JSON.stringify(first.data)}`)
    const second = await requestJson(baseUrl, '/api/player-history?limit=12&eventLimit=12&civilMemoryLimit=12&replayLimit=3', 'GET')
    assert.equal(second.status, 200, `second player-history request failed: ${JSON.stringify(second.data)}`)

    const firstTimeline = readObject(readObject(first.data).timeline)
    const secondTimeline = readObject(readObject(second.data).timeline)
    assert.equal(firstTimeline.historyNotificationBudget, 3)
    assert.equal(firstTimeline.historyCooldownApplied, true)

    const firstAnchors = readArray(firstTimeline.historyNotificationAnchors)
    const secondAnchors = readArray(secondTimeline.historyNotificationAnchors)
    assert.ok(firstAnchors.length > 0, 'timeline should expose at least one durable notification anchor')
    assert.equal(firstAnchors.length <= 3, true, 'notification anchors should respect per-surface budget')
    assert.deepEqual(
      firstAnchors.map((item) => stableAnchorIdentity(readObject(item))),
      secondAnchors.map((item) => stableAnchorIdentity(readObject(item))),
      'notification anchors should be stable across repeated reads of the same timeline page',
    )
    assert.equal(firstTimeline.historyNotificationSuppressionApplied, false)
    assert.equal(firstTimeline.historyNotificationSuppressedCount, 0)

    const dedupeKeys = new Set<string>()
    for (const anchorVariant of firstAnchors) {
      const anchor = readObject(anchorVariant)
      assert.equal(anchor.contractId, 'player_history_notification_anchor_v1')
      assert.ok(String(anchor.id).startsWith('notification-'))
      assert.ok(String(anchor.durableCardAnchor).startsWith('timeline-card:'))
      assert.ok(String(anchor.dedupeKey).length > 0)
      assert.equal(dedupeKeys.has(String(anchor.dedupeKey)), false, `duplicate notification dedupe key ${anchor.dedupeKey}`)
      dedupeKeys.add(String(anchor.dedupeKey))
      assert.equal(Number(anchor.budgetSlot) >= 1 && Number(anchor.budgetSlot) <= 3, true)
      assert.equal(anchor.accessState, 'open')
      assert.equal(anchor.accessFeedbackLabel, '已定位提醒')
      assert.equal(typeof anchor.title, 'string')
      assert.equal(typeof anchor.body, 'string')
      assert.equal(anchor.actionLabel, '前往大事查看')
      assert.equal(anchor.cooldownLabel, '已合并相近提醒')
      assert.equal(anchor.dismissed, false)
    }

    const visibleCopy = JSON.stringify(firstAnchors.map((anchorVariant) => {
      const anchor = readObject(anchorVariant)
      return {
        title: anchor.title,
        body: anchor.body,
        actionLabel: anchor.actionLabel,
        cooldownLabel: anchor.cooldownLabel,
      }
    }))
    for (const forbidden of [
      '/api/events',
      '/api/player-history',
      'historyNotificationAnchors',
      'historyDedupeKey',
      'historyNotificationBudget',
      'historyCooldownApplied',
      'historyDurableCardAnchor',
      'durableCardAnchor',
      'dedupeKey',
      'sourceRefs',
      'contractId',
      'route',
      'token',
      'debug',
      'ops',
      'snake_case',
    ]) {
      assert.equal(visibleCopy.includes(forbidden), false, `notification visible copy leaked ${forbidden}`)
    }

    const dismissedAnchor = readObject(firstAnchors[0])
    const dismissedDedupeKey = encodeURIComponent(String(dismissedAnchor.dedupeKey))
    const suppressed = await requestJson(
      baseUrl,
      `/api/player-history?limit=12&eventLimit=12&civilMemoryLimit=12&replayLimit=3&dismissedNotificationDedupeKey=${dismissedDedupeKey}`,
      'GET',
    )
    assert.equal(suppressed.status, 200, `suppressed player-history request failed: ${JSON.stringify(suppressed.data)}`)
    const suppressedTimeline = readObject(readObject(suppressed.data).timeline)
    const suppressedAnchors = readArray(suppressedTimeline.historyNotificationAnchors)
    assert.equal(suppressedTimeline.historyNotificationSuppressionApplied, true)
    assert.equal(Number(suppressedTimeline.historyNotificationSuppressedCount) >= 1, true)
    assert.equal(
      suppressedAnchors.some((anchorVariant) => String(readObject(anchorVariant).dedupeKey) === String(dismissedAnchor.dedupeKey)),
      false,
      'dismissed notification dedupe key should suppress repeated toast anchor',
    )
  } finally {
    await shutdownChild(child)
  }
}

function stableAnchorIdentity(anchor: Record<string, unknown>) {
  return {
    id: anchor.id,
    durableCardAnchor: anchor.durableCardAnchor,
    dedupeKey: anchor.dedupeKey,
    budgetSlot: anchor.budgetSlot,
    title: anchor.title,
    body: anchor.body,
    actionLabel: anchor.actionLabel,
    cooldownLabel: anchor.cooldownLabel,
    dismissed: anchor.dismissed,
  }
}

runPlayerHistoryNotificationPersistenceDedupeRuntimeContract().then(() => {
  console.log('[player_history_notification_persistence_dedupe_runtime_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_notification_persistence_dedupe_runtime_contract] failed:', error)
  process.exitCode = 1
})
