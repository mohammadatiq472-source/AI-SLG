import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

async function runPlayerHistoryCivilMemoryDetailShareTokenRuntimeContract() {
  const tail: TailState = { stdout: [], stderr: [] }
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const civilMemoryPath = buildSessionPersistPath('player_history_civil_memory_detail_share_token_ledger')

  mkdirSync(dirname(civilMemoryPath), { recursive: true })
  writeFileSync(
    civilMemoryPath,
    JSON.stringify([
      {
        id: 'civil-detail-share-1',
        tick: 18,
        type: 'court_resolution',
        title: '洛阳供给议题已归档',
        summary: '廷议确认先补足洛阳粮秣，再推进前线调度。',
        relatedIds: ['luoyang-supply-1'],
        factionIds: ['player'],
        sessionId: 'court-session-share-1',
        proposalId: 'proposal-share-1',
        resolutionId: 'resolution-share-1',
        outcome: 'success',
        responsibilities: [{ seatId: 'seat-player', role: 'executor', weight: 1 }],
        metadata: {
          internalPlannerTrace: 'do_not_expose_share',
        },
        createdAt: '2026-06-13T00:00:00.000Z',
      },
    ]),
    'utf8',
  )

  const child = spawnBackend(port, tail, {
    CIVIL_MEMORY_PATH: civilMemoryPath,
    CIVIL_MEMORY_SHARE_TOKEN_SECRET: 'player-history-civil-memory-detail-share-token-secret',
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('player_history_civil_memory_detail_share_token_session'),
    WORLD_SAVE_SLOTS_PATH: buildSessionPersistPath('player_history_civil_memory_detail_share_token_save_slots'),
    WORLD_SAVE_SLOTS_ARCHIVE_DIR: `${buildSessionPersistPath('player_history_civil_memory_detail_share_token_save_slots_archive')}.archive`,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const issuePath = '/api/player-history/civil-memory-detail/share-token?civilMemoryId=civil-detail-share-1&factionId=player'
    const missingSessionIssue = await postJson(baseUrl, issuePath, null, { ttlMs: 5_000 })
    assert.equal(missingSessionIssue.status, 401, `missing session should not issue token: ${JSON.stringify(missingSessionIssue.data)}`)
    assert.equal(readObject(missingSessionIssue.data).deniedCopy, '这段传闻暂时不可分享')

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'civil_memory_share',
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)
    const sessionToken = String(readObject(join.data).token ?? '')
    assert.ok(sessionToken.length > 0, 'session join should return token')

    const crossFactionIssue = await postJson(
      baseUrl,
      '/api/player-history/civil-memory-detail/share-token?civilMemoryId=civil-detail-share-1&factionId=opponent',
      sessionToken,
      { ttlMs: 5_000 },
    )
    assert.equal(crossFactionIssue.status, 403, `cross-faction issue should be denied: ${JSON.stringify(crossFactionIssue.data)}`)
    assert.equal(readObject(crossFactionIssue.data).deniedCopy, '这段传闻暂时不可分享')

    const tokenIssue = await postJson(baseUrl, issuePath, sessionToken, { ttlMs: 5_000 })
    assert.equal(tokenIssue.status, 200, `share token issue should succeed: ${JSON.stringify(tokenIssue.data)}`)
    const issuePayload = readObject(tokenIssue.data)
    assert.equal(issuePayload.ok, true)
    assert.equal(issuePayload.sharedScope, 'public_context')
    assert.equal(issuePayload.shareStateLabel, '已开放只读传闻')
    assert.match(String(issuePayload.shareRetentionLabel ?? ''), /^分享约 \d+ 分钟内可查看$/)
    const issuedShareToken = String(issuePayload.shareToken ?? '')
    assert.ok(
      /^civil_memory_share_v1\.\d+\.[A-Za-z0-9_-]+$/.test(issuedShareToken),
      'share token should use signed v1 format',
    )
    assert.equal(issuedShareToken.includes('civil-detail-share-1'), false, 'share token should not expose raw Civil Memory id')

    const sharedDetail = await requestJson(
      baseUrl,
      `/api/player-history/civil-memory-detail?civilMemoryId=civil-detail-share-1&shareToken=${issuedShareToken}`,
      'GET',
    )
    assert.equal(sharedDetail.status, 200, `issued share token should open shared detail: ${JSON.stringify(sharedDetail.data)}`)
    const detail = readObject(readObject(sharedDetail.data).civilMemoryDetail)
    assert.equal(detail.contractId, 'civil_memory_detail_read_model_v1')
    assert.equal(detail.title, '洛阳供给议题已归档')
    assert.equal(detail.summary, '廷议确认先补足洛阳粮秣，再推进前线调度。')
    assert.equal(detail.sharedScope, 'public_context')
    assert.equal(detail.shareStateLabel, '已开放只读传闻')
    assert.match(String(detail.shareRetentionLabel ?? ''), /^分享约 \d+ 分钟内可查看$/)

    const legacyGuessableToken = 'civil_memory_share_civil-detail-share-1'
    const legacyGuessDenied = await requestJson(
      baseUrl,
      `/api/player-history/civil-memory-detail?civilMemoryId=civil-detail-share-1&shareToken=${legacyGuessableToken}`,
      'GET',
    )
    assert.equal(legacyGuessDenied.status, 401, `legacy guessable token should be denied: ${JSON.stringify(legacyGuessDenied.data)}`)
    assert.equal(readObject(legacyGuessDenied.data).deniedCopy, '这段传闻暂时不可查看')

    const expiringIssue = await postJson(baseUrl, issuePath, sessionToken, { ttlMs: 1 })
    assert.equal(expiringIssue.status, 200, `short share token issue should succeed: ${JSON.stringify(expiringIssue.data)}`)
    const expiringShareToken = String(readObject(expiringIssue.data).shareToken ?? '')
    await sleep(20)
    const expiredShare = await requestJson(
      baseUrl,
      `/api/player-history/civil-memory-detail?civilMemoryId=civil-detail-share-1&shareToken=${expiringShareToken}`,
      'GET',
    )
    assert.equal(expiredShare.status, 401, `expired share token should be denied: ${JSON.stringify(expiredShare.data)}`)
    assert.equal(readObject(expiredShare.data).deniedCopy, '这段传闻暂时不可查看')

    const visibleDetailPayload = JSON.stringify(detail)
    for (const forbidden of [
      'civil-detail-share-1',
      'sourceRefs',
      'metadata',
      'integrity',
      'internalPlannerTrace',
      'sessionId',
      'proposalId',
      'resolutionId',
    ]) {
      assert.equal(visibleDetailPayload.includes(forbidden), false, `shared detail read model leaked ${forbidden}`)
    }

    const visibleDeniedCopy = [
      readObject(missingSessionIssue.data).deniedCopy,
      readObject(crossFactionIssue.data).deniedCopy,
      readObject(legacyGuessDenied.data).deniedCopy,
      readObject(expiredShare.data).deniedCopy,
    ].join('\n')
    for (const forbidden of [
      'civil-detail-share-1',
      issuedShareToken,
      expiringShareToken,
      'shareToken',
      '/api/player-history',
      'route',
      'token',
      '401',
      '403',
      'expired',
      'HMAC',
      'signature',
      'debug',
      'ops',
      'snake_case',
    ]) {
      assert.equal(visibleDeniedCopy.includes(forbidden), false, `share denial copy leaked ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

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

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

runPlayerHistoryCivilMemoryDetailShareTokenRuntimeContract().then(() => {
  console.log('[player_history_civil_memory_detail_share_token_runtime_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_civil_memory_detail_share_token_runtime_contract] failed:', error)
  process.exitCode = 1
})
