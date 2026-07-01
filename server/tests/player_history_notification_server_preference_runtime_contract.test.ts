import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readArray,
  readObject,
  requestJson,
  shutdownChild,
  sleep,
  spawnBackend,
  type HttpJsonResult,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

async function requestJsonWithBearer(
  baseUrl: string,
  path: string,
  token: string,
  timeoutMs = 15_000,
): Promise<HttpJsonResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(new URL(path, baseUrl), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    })
    const raw = await response.text()
    return {
      ok: response.ok,
      status: response.status,
      data: raw.trim().length > 0 ? JSON.parse(raw) : null,
    }
  } finally {
    clearTimeout(timer)
  }
}

async function bootBackend(port: number, tail: TailState, sessionPersistPath: string) {
  const child = spawnBackend(port, tail, {
    SESSION_STATE_PERSIST_PATH: sessionPersistPath,
    WORLD_SAVE_SLOTS_PATH: buildSessionPersistPath('player_history_notification_server_preference_save_slots'),
    WORLD_SAVE_SLOTS_ARCHIVE_DIR: `${buildSessionPersistPath('player_history_notification_server_preference_save_slots_archive')}.archive`,
  })
  const baseUrl = `http://127.0.0.1:${port}`
  const health = await waitForHealth(baseUrl)
  assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)
  return { child, baseUrl }
}

function readTimeline(payload: unknown) {
  return readObject(readObject(payload).timeline)
}

function readNotificationAnchors(payload: unknown) {
  return readArray(readTimeline(payload).historyNotificationAnchors).map((item) => readObject(item))
}

async function waitForPersistedSessionPreference(
  sessionPersistPath: string,
  sessionToken: string,
  dismissedDedupeKey: string,
  timeoutMs = 8_000,
) {
  const startedAt = Date.now()
  let lastError = ''
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (existsSync(sessionPersistPath)) {
        const persisted = readObject(JSON.parse(readFileSync(sessionPersistPath, 'utf8')))
        const persistedSessions = readArray(persisted.sessions).map((item) => readObject(item))
        const persistedSession = persistedSessions.find((item) => item.token === sessionToken)
        if (persistedSession) {
          const keys = readArray(persistedSession.playerHistoryDismissedNotificationDedupeKeys)
          if (keys.includes(dismissedDedupeKey)) {
            return persistedSession
          }
          lastError = `persisted session did not include key; keys=${JSON.stringify(keys)}`
        } else {
          lastError = 'persisted session missing original bearer token'
        }
      } else {
        lastError = 'session state file missing'
      }
    } catch (error) {
      lastError = String(error)
    }
    await sleep(250)
  }
  throw new Error(`timed out waiting for persisted session preference: ${lastError}`)
}

async function runPlayerHistoryNotificationServerPreferenceRuntimeContract() {
  const sessionPersistPath = buildSessionPersistPath('player_history_notification_server_preference_session')
  const firstPort = await getAvailablePort()
  const firstTail: TailState = { stdout: [], stderr: [] }
  const firstBackend = await bootBackend(firstPort, firstTail, sessionPersistPath)
  let sessionToken = ''
  let dismissedDedupeKey = ''

  try {
    const joined = await requestJson(
      firstBackend.baseUrl,
      '/api/session/join',
      'POST',
      {
        factionId: 'player',
        playerName: 'history_preference_player',
      },
    )
    assert.equal(joined.status, 200, `session join failed: ${JSON.stringify(joined.data)}`)
    sessionToken = String(readObject(joined.data).token ?? '')
    assert.ok(sessionToken.length > 0, 'session join should return bearer token')

    const firstHistory = await requestJsonWithBearer(
      firstBackend.baseUrl,
      '/api/player-history?limit=12&eventLimit=12&civilMemoryLimit=12&replayLimit=3',
      sessionToken,
    )
    assert.equal(firstHistory.status, 200, `first bearer player-history failed: ${JSON.stringify(firstHistory.data)}`)
    const firstTimeline = readTimeline(firstHistory.data)
    assert.equal(firstTimeline.historyNotificationSuppressionApplied, false)
    assert.equal(firstTimeline.historyNotificationSuppressedCount, 0)

    const firstAnchors = readNotificationAnchors(firstHistory.data)
    assert.ok(firstAnchors.length > 0, 'bearer timeline should expose at least one notification anchor')
    dismissedDedupeKey = String(firstAnchors[0].dedupeKey ?? '')
    assert.ok(dismissedDedupeKey.length > 0, 'notification anchor should expose internal dedupe key')

    const recordPreference = await requestJsonWithBearer(
      firstBackend.baseUrl,
      `/api/player-history?limit=12&eventLimit=12&civilMemoryLimit=12&replayLimit=3&dismissedNotificationDedupeKey=${encodeURIComponent(dismissedDedupeKey)}`,
      sessionToken,
    )
    assert.equal(recordPreference.status, 200, `record preference request failed: ${JSON.stringify(recordPreference.data)}`)
    const recordedTimeline = readTimeline(recordPreference.data)
    assert.equal(recordedTimeline.historyNotificationSuppressionApplied, true)
    assert.equal(Number(recordedTimeline.historyNotificationSuppressedCount) >= 1, true)

    const withoutQuery = await requestJsonWithBearer(
      firstBackend.baseUrl,
      '/api/player-history?limit=12&eventLimit=12&civilMemoryLimit=12&replayLimit=3',
      sessionToken,
    )
    assert.equal(withoutQuery.status, 200, `stored preference request failed: ${JSON.stringify(withoutQuery.data)}`)
    const withoutQueryTimeline = readTimeline(withoutQuery.data)
    const withoutQueryAnchors = readNotificationAnchors(withoutQuery.data)
    assert.equal(withoutQueryTimeline.historyNotificationSuppressionApplied, true)
    assert.equal(
      withoutQueryAnchors.some((anchor) => String(anchor.dedupeKey) === dismissedDedupeKey),
      false,
      'same bearer token should suppress dismissed notification without resending query key',
    )
    await waitForPersistedSessionPreference(sessionPersistPath, sessionToken, dismissedDedupeKey)
  } finally {
    await shutdownChild(firstBackend.child)
  }

  const persistedSession = await waitForPersistedSessionPreference(sessionPersistPath, sessionToken, dismissedDedupeKey)
  assert.deepEqual(
    readArray(persistedSession.playerHistoryDismissedNotificationDedupeKeys),
    [dismissedDedupeKey],
    'session state should persist dismissed notification preference',
  )

  const secondPort = await getAvailablePort()
  const secondTail: TailState = { stdout: [], stderr: [] }
  const secondBackend = await bootBackend(secondPort, secondTail, sessionPersistPath)
  try {
    const restoredHistory = await requestJsonWithBearer(
      secondBackend.baseUrl,
      '/api/player-history?limit=12&eventLimit=12&civilMemoryLimit=12&replayLimit=3',
      sessionToken,
    )
    assert.equal(restoredHistory.status, 200, `restored preference request failed: ${JSON.stringify(restoredHistory.data)}`)
    const restoredTimeline = readTimeline(restoredHistory.data)
    const restoredAnchors = readNotificationAnchors(restoredHistory.data)
    assert.equal(restoredTimeline.historyNotificationSuppressionApplied, true)
    assert.equal(
      restoredAnchors.some((anchor) => String(anchor.dedupeKey) === dismissedDedupeKey),
      false,
      'restored backend should suppress dismissed notification from persisted session preference',
    )
  } finally {
    await shutdownChild(secondBackend.child)
  }
}

runPlayerHistoryNotificationServerPreferenceRuntimeContract().then(() => {
  console.log('[player_history_notification_server_preference_runtime_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_notification_server_preference_runtime_contract] failed:', error)
  process.exitCode = 1
})
