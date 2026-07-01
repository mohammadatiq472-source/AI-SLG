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

async function runPlayerHistoryShareManagementRuntimeContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    PLAYER_HISTORY_SHARE_TOKEN_SECRET: 'player-history-share-management-secret',
    PLAYER_HISTORY_SHARE_STATE_PATH: buildSessionPersistPath('player_history_share_management_shares'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('player_history_share_management_session'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'player_history_share_manager',
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)
    const token = String(readObject(join.data).token ?? '')
    assert.ok(token.length > 0, 'session join should return token')

    const otherJoin = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'share_other_manager',
    })
    assert.equal(otherJoin.status, 200, `second session join failed: ${JSON.stringify(otherJoin.data)}`)
    const otherToken = String(readObject(otherJoin.data).token ?? '')
    assert.ok(otherToken.length > 0, 'second session join should return token')

    const events = await requestJson(baseUrl, '/api/events?limit=40', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const items = readArray(readObject(events.data).items ?? readObject(events.data).events).map((item) => readObject(item))
    const issueCandidate = items.find((item) => String(item.action ?? '') === 'session_join') ?? items[0]
    assert.ok(issueCandidate, 'share management contract needs at least one current world event')
    const eventId = String(issueCandidate.id ?? '')
    assert.ok(eventId.length > 0, 'event should expose id for exact share token binding')

    const issuePath = `/api/player-history/share-token?eventId=${encodeURIComponent(eventId)}&factionId=player`
    const issued = await requestAuthJson(baseUrl, issuePath, 'POST', token, { ttlMs: 5_000 })
    assert.equal(issued.status, 200, `share token issue should succeed: ${JSON.stringify(issued.data)}`)
    const issuedPayload = readObject(issued.data)
    const shareId = String(issuedPayload.shareId ?? '')
    assert.match(shareId, /^player_history_share_\d+_[A-Za-z0-9_-]+$/, 'share id should be stable and not raw event id')
    assert.equal(shareId.includes(eventId), false, 'share id should not expose raw event id')
    assert.match(String(issuedPayload.shareToken ?? ''), /^player_history_share_v1\.\d+\.[A-Za-z0-9_-]+$/)

    const missingSessionList = await requestAuthJson(baseUrl, '/api/player-history/share-token?factionId=player', 'GET', null)
    assert.equal(missingSessionList.status, 401, `missing session list should be denied: ${JSON.stringify(missingSessionList.data)}`)
    assert.equal(readObject(missingSessionList.data).deniedCopy, '暂无可管理的分享')

    const list = await requestAuthJson(baseUrl, '/api/player-history/share-token?factionId=player', 'GET', token)
    assert.equal(list.status, 200, `share list should succeed: ${JSON.stringify(list.data)}`)
    const listPayload = readObject(list.data)
    assert.equal(listPayload.ok, true)
    assert.equal(listPayload.shareManagementLabel, '已开放的只读纪事')
    const shares = readArray(listPayload.shares)
    assert.equal(shares.length, 1, `manager should see one issued share: ${JSON.stringify(listPayload)}`)
    const shareSummary = readObject(shares[0])
    assert.equal(shareSummary.shareId, shareId)
    assert.equal(shareSummary.status, 'active')
    assert.equal(shareSummary.shareStateLabel, '已开放只读纪事')
    assert.match(String(shareSummary.shareRetentionLabel ?? ''), /^分享约 \d+ 分钟内可查看$/)

    const otherList = await requestAuthJson(baseUrl, '/api/player-history/share-token?factionId=player', 'GET', otherToken)
    assert.equal(otherList.status, 200, `other manager list should succeed: ${JSON.stringify(otherList.data)}`)
    assert.equal(readArray(readObject(otherList.data).shares).length, 0, 'other session should not see issuer shares')

    const missingShareRevoke = await requestAuthJson(baseUrl, '/api/player-history/share-token?shareId=missing_share&factionId=player', 'DELETE', token)
    assert.equal(missingShareRevoke.status, 404, `missing share revoke should be denied: ${JSON.stringify(missingShareRevoke.data)}`)
    assert.equal(readObject(missingShareRevoke.data).deniedCopy, '暂无可撤回的分享')

    const crossRevoke = await requestAuthJson(baseUrl, `/api/player-history/share-token?shareId=${encodeURIComponent(shareId)}&factionId=player`, 'DELETE', otherToken)
    assert.equal(crossRevoke.status, 404, `cross session revoke should be denied: ${JSON.stringify(crossRevoke.data)}`)
    assert.equal(readObject(crossRevoke.data).deniedCopy, '暂无可撤回的分享')

    const revoked = await requestAuthJson(baseUrl, `/api/player-history/share-token?shareId=${encodeURIComponent(shareId)}&factionId=player`, 'DELETE', token)
    assert.equal(revoked.status, 200, `share revoke should succeed: ${JSON.stringify(revoked.data)}`)
    assert.equal(readObject(revoked.data).shareStateLabel, '已撤回只读纪事')
    assert.equal(readObject(revoked.data).shareRetentionLabel, '分享已撤回')

    const revokedList = await requestAuthJson(baseUrl, '/api/player-history/share-token?factionId=player', 'GET', token)
    assert.equal(revokedList.status, 200, `revoked list should succeed: ${JSON.stringify(revokedList.data)}`)
    const revokedShares = readArray(readObject(revokedList.data).shares)
    assert.equal(revokedShares.length, 1)
    const revokedSummary = readObject(revokedShares[0])
    assert.equal(revokedSummary.shareId, shareId)
    assert.equal(revokedSummary.status, 'revoked')
    assert.equal(revokedSummary.shareStateLabel, '已撤回只读纪事')
    assert.equal(revokedSummary.shareRetentionLabel, '分享已撤回')

    const visibleManagementPayload = JSON.stringify({
      list: listPayload,
      revoked: readObject(revoked.data),
      revokedList: readObject(revokedList.data),
      missingSessionList: readObject(missingSessionList.data),
      missingShareRevoke: readObject(missingShareRevoke.data),
      crossRevoke: readObject(crossRevoke.data),
    })
    for (const forbidden of [
      String(issuedPayload.shareToken ?? ''),
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
      assert.equal(visibleManagementPayload.includes(forbidden), false, `share management visible payload leaked ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runPlayerHistoryShareManagementRuntimeContract().then(() => {
  console.log('[player_history_share_management_runtime_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_share_management_runtime_contract] failed:', error)
  process.exitCode = 1
})
