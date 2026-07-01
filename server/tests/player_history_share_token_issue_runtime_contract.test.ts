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

async function postJson(baseUrl: string, path: string, token: string | null, body: Record<string, unknown>) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const response = await fetch(new URL(path, baseUrl), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const raw = await response.text()
  return {
    status: response.status,
    data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
  }
}

async function runPlayerHistoryShareTokenIssueRuntimeContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    PLAYER_HISTORY_SHARE_TOKEN_SECRET: 'player-history-share-token-issue-secret',
    PLAYER_HISTORY_SHARE_STATE_PATH: buildSessionPersistPath('player_history_share_token_issue_shares'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('player_history_share_token_issue_session'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'player_history_share_issuer',
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)
    const token = String(readObject(join.data).token ?? '')
    assert.ok(token.length > 0, 'session join should return token')

    const events = await requestJson(baseUrl, '/api/events?limit=40', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const items = readArray(readObject(events.data).items ?? readObject(events.data).events).map((item) => readObject(item))
    const issueCandidate = items.find((item) => String(item.action ?? '') === 'session_join') ?? items[0]
    assert.ok(issueCandidate, 'share-token issue contract needs at least one current world event')
    const eventId = String(issueCandidate.id ?? '')
    assert.ok(eventId.length > 0, 'event should expose id for exact share token binding')

    const issuePath = `/api/player-history/share-token?eventId=${encodeURIComponent(eventId)}&factionId=player`
    const missingSession = await postJson(baseUrl, issuePath, null, { ttlMs: 5_000 })
    assert.equal(missingSession.status, 401, `missing session should be denied: ${JSON.stringify(missingSession.data)}`)
    assert.equal(readObject(missingSession.data).deniedCopy, '这段纪事暂时不可分享')

    const crossFaction = await postJson(
      baseUrl,
      `/api/player-history/share-token?eventId=${encodeURIComponent(eventId)}&factionId=enemy`,
      token,
      { ttlMs: 5_000 },
    )
    assert.equal(crossFaction.status, 403, `cross faction issue should be denied: ${JSON.stringify(crossFaction.data)}`)
    assert.equal(readObject(crossFaction.data).deniedCopy, '这段纪事暂时不可分享')

    const missingEvent = await postJson(
      baseUrl,
      '/api/player-history/share-token?eventId=missing_player_history_share_event&factionId=player',
      token,
      { ttlMs: 5_000 },
    )
    assert.equal(missingEvent.status, 404, `missing event should be denied: ${JSON.stringify(missingEvent.data)}`)
    assert.equal(readObject(missingEvent.data).deniedCopy, '这段纪事暂时不可分享')

    const issued = await postJson(baseUrl, issuePath, token, { ttlMs: 5_000 })
    assert.equal(issued.status, 200, `share token issue should succeed: ${JSON.stringify(issued.data)}`)
    const issuedPayload = readObject(issued.data)
    assert.equal(issuedPayload.ok, true)
    assert.equal(issuedPayload.sharedScope, 'explicit_spectator')
    assert.equal(issuedPayload.shareStateLabel, '已开放只读纪事')
    assert.match(String(issuedPayload.shareRetentionLabel ?? ''), /^分享约 \d+ 分钟内可查看$/)

    const shareToken = String(issuedPayload.shareToken ?? '')
    assert.match(shareToken, /^player_history_share_v1\.\d+\.[A-Za-z0-9_-]+$/)
    assert.equal(shareToken.includes(eventId), false, 'share token should not expose raw event id')

    const visibleDeniedCopy = [
      readObject(missingSession.data).deniedCopy,
      readObject(crossFaction.data).deniedCopy,
      readObject(missingEvent.data).deniedCopy,
    ].join('\n')
    for (const forbidden of [
      eventId,
      'shareToken',
      '/api/player-history',
      'route',
      'token',
      '401',
      '403',
      '404',
      'HMAC',
      'signature',
      'debug',
      'ops',
      'snake_case',
    ]) {
      assert.equal(visibleDeniedCopy.includes(forbidden), false, `share-token issue denial copy leaked ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runPlayerHistoryShareTokenIssueRuntimeContract().then(() => {
  console.log('[player_history_share_token_issue_runtime_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_share_token_issue_runtime_contract] failed:', error)
  process.exitCode = 1
})
