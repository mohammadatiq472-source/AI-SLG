import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
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

async function requestAuthJson(
  baseUrl: string,
  path: string,
  method: 'GET' | 'POST' | 'DELETE',
  token: string | null,
  body?: Record<string, unknown>,
) {
  const headers: Record<string, string> = {}
  if (body) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const raw = await response.text()
  return {
    status: response.status,
    data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
  }
}

async function startBackend(port: number, tail: TailState, sessionPersistPath: string, sharePersistPath: string) {
  const child = spawnBackend(port, tail, {
    PLAYER_HISTORY_SHARE_TOKEN_SECRET: 'player-history-share-management-persistence-secret',
    PLAYER_HISTORY_SHARE_STATE_PATH: sharePersistPath,
    SESSION_STATE_PERSIST_PATH: sessionPersistPath,
  })
  const health = await waitForHealth(`http://127.0.0.1:${port}`)
  assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)
  return child
}

async function runPlayerHistoryShareManagementPersistenceRuntimeContract() {
  const sessionPersistPath = buildSessionPersistPath('player_history_share_management_persistence_session')
  const sharePersistPath = buildSessionPersistPath('player_history_share_management_persistence_shares')
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  let child = await startBackend(port, tail, sessionPersistPath, sharePersistPath)
  const managerPlayerName = 'share_persist_manager'

  try {
    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: managerPlayerName,
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)
    const token = String(readObject(join.data).token ?? '')
    assert.ok(token.length > 0, 'session join should return token')

    const events = await requestJson(baseUrl, '/api/events?limit=40', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const items = readArray(readObject(events.data).items ?? readObject(events.data).events).map((item) => readObject(item))
    const issueCandidate = items.find((item) => String(item.action ?? '') === 'session_join') ?? items[0]
    assert.ok(issueCandidate, 'share persistence contract needs at least one current world event')
    const eventId = String(issueCandidate.id ?? '')
    assert.ok(eventId.length > 0, 'event should expose id for exact share token binding')

    const issued = await requestAuthJson(
      baseUrl,
      `/api/player-history/share-token?eventId=${encodeURIComponent(eventId)}&factionId=player`,
      'POST',
      token,
      { ttlMs: 30_000 },
    )
    assert.equal(issued.status, 200, `share token issue should succeed: ${JSON.stringify(issued.data)}`)
    const shareId = String(readObject(issued.data).shareId ?? '')
    assert.ok(shareId.length > 0, 'issued share should return shareId')
    assert.ok(existsSync(sharePersistPath), 'share persistence file should be created after issue')

    const persistedAfterIssue = JSON.parse(readFileSync(sharePersistPath, 'utf8')) as { shares?: unknown[] }
    assert.ok(Array.isArray(persistedAfterIssue.shares), 'persisted share payload should contain shares array')
    assert.equal(persistedAfterIssue.shares.some((item) => readObject(item).shareId === shareId), true, 'persisted shares should contain issued share id')

    await shutdownChild(child)
    child = await startBackend(port, tail, sessionPersistPath, sharePersistPath)

    let managementToken = token
    let restoredList = await requestAuthJson(baseUrl, '/api/player-history/share-token?factionId=player', 'GET', managementToken)
    if (restoredList.status === 401) {
      const rejoin = await requestJson(baseUrl, '/api/session/join', 'POST', {
        factionId: 'player',
        playerName: managerPlayerName,
      })
      assert.equal(rejoin.status, 200, `rejoin after restart failed: ${JSON.stringify(rejoin.data)}`)
      managementToken = String(readObject(rejoin.data).token ?? '')
      assert.ok(managementToken.length > 0, 'rejoin should return token')
      restoredList = await requestAuthJson(baseUrl, '/api/player-history/share-token?factionId=player', 'GET', managementToken)
    }
    assert.equal(restoredList.status, 200, `restored list should succeed: ${JSON.stringify(restoredList.data)}`)
    const restoredShares = readArray(readObject(restoredList.data).shares)
    assert.equal(restoredShares.length, 1, `restored list should include one share: ${JSON.stringify(restoredList.data)}`)
    const restoredSummary = readObject(restoredShares[0])
    assert.equal(restoredSummary.shareId, shareId)
    assert.equal(restoredSummary.status, 'active')
    assert.equal(restoredSummary.shareStateLabel, '已开放只读纪事')

    const revoked = await requestAuthJson(
      baseUrl,
      `/api/player-history/share-token?shareId=${encodeURIComponent(shareId)}&factionId=player`,
      'DELETE',
      managementToken,
    )
    assert.equal(revoked.status, 200, `restored share revoke should succeed: ${JSON.stringify(revoked.data)}`)
    assert.equal(readObject(revoked.data).shareStateLabel, '已撤回只读纪事')

    await shutdownChild(child)
    child = await startBackend(port, tail, sessionPersistPath, sharePersistPath)

    let restoredRevokedList = await requestAuthJson(baseUrl, '/api/player-history/share-token?factionId=player', 'GET', managementToken)
    if (restoredRevokedList.status === 401) {
      const rejoin = await requestJson(baseUrl, '/api/session/join', 'POST', {
        factionId: 'player',
        playerName: managerPlayerName,
      })
      assert.equal(rejoin.status, 200, `second rejoin after restart failed: ${JSON.stringify(rejoin.data)}`)
      managementToken = String(readObject(rejoin.data).token ?? '')
      assert.ok(managementToken.length > 0, 'second rejoin should return token')
      restoredRevokedList = await requestAuthJson(baseUrl, '/api/player-history/share-token?factionId=player', 'GET', managementToken)
    }
    assert.equal(restoredRevokedList.status, 200, `restored revoked list should succeed: ${JSON.stringify(restoredRevokedList.data)}`)
    const restoredRevokedShares = readArray(readObject(restoredRevokedList.data).shares)
    assert.equal(restoredRevokedShares.length, 1)
    const restoredRevokedSummary = readObject(restoredRevokedShares[0])
    assert.equal(restoredRevokedSummary.shareId, shareId)
    assert.equal(restoredRevokedSummary.status, 'revoked')
    assert.equal(restoredRevokedSummary.shareStateLabel, '已撤回只读纪事')
    assert.equal(restoredRevokedSummary.shareRetentionLabel, '分享已撤回')

    const visiblePayload = JSON.stringify({
      restoredList: readObject(restoredList.data),
      revoked: readObject(revoked.data),
      restoredRevokedList: readObject(restoredRevokedList.data),
    })
    for (const forbidden of [
      String(readObject(issued.data).shareToken ?? ''),
      eventId,
      '/api/player-history',
      'Authorization',
      'Bearer',
      'HMAC',
      'signature',
      'debug',
      'ops',
      'snake_case',
    ]) {
      assert.equal(visiblePayload.includes(forbidden), false, `share persistence visible payload leaked ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runPlayerHistoryShareManagementPersistenceRuntimeContract().then(() => {
  console.log('[player_history_share_management_persistence_runtime_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_share_management_persistence_runtime_contract] failed:', error)
  process.exitCode = 1
})
