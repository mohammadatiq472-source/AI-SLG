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

async function runPlayerHistoryReplayShareTokenIssueExpiryRuntimeContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    REPLAY_SHARE_TOKEN_SECRET: 'player-history-replay-share-token-issue-expiry-runtime-secret',
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('player_history_replay_share_token_issue_expiry_session'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const replayRequestId = await createReplay(baseUrl)

    const missingTokenIssue = await postJson(baseUrl, `/api/replay/${replayRequestId}/share-token?factionId=player`, null, {
      ttlMs: 5_000,
    })
    assert.equal(missingTokenIssue.status, 401, `missing session should not issue share token: ${JSON.stringify(missingTokenIssue.data)}`)
    assert.equal(readObject(missingTokenIssue.data).deniedCopy, '这段回放未开放查看')

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'share_token_contract',
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)
    const sessionToken = String(readObject(join.data).token ?? '')
    assert.ok(sessionToken.length > 0, 'session join should return token')

    const crossFactionIssue = await postJson(baseUrl, `/api/replay/${replayRequestId}/share-token?factionId=opponent`, sessionToken, {
      ttlMs: 5_000,
    })
    assert.equal(crossFactionIssue.status, 403, `cross-faction issue should be denied: ${JSON.stringify(crossFactionIssue.data)}`)
    assert.equal(readObject(crossFactionIssue.data).deniedCopy, '这段回放未开放查看')

    const tokenIssue = await postJson(baseUrl, `/api/replay/${replayRequestId}/share-token?factionId=player`, sessionToken, {
      ttlMs: 5_000,
    })
    assert.equal(tokenIssue.status, 200, `share token issue should succeed: ${JSON.stringify(tokenIssue.data)}`)
    const issuePayload = readObject(tokenIssue.data)
    assert.equal(issuePayload.ok, true)
    assert.equal(issuePayload.sharedScope, 'public_context')
    const issuedShareToken = String(issuePayload.shareToken ?? '')
    assert.ok(/^replay_share_v1\.\d+\.[A-Za-z0-9_-]+$/.test(issuedShareToken), 'share token should be signed v1 format')
    assert.equal(issuedShareToken.includes(replayRequestId), false, 'share token should not expose raw request id')

    const sharedEntry = await requestJson(baseUrl, `/api/replay/${replayRequestId}?shareToken=${issuedShareToken}`, 'GET')
    assert.equal(sharedEntry.status, 200, `issued share token should open shared replay: ${JSON.stringify(sharedEntry.data)}`)
    assert.equal(readObject(readObject(sharedEntry.data).replay).sharedScope, 'public_context')

    const legacyGuessableToken = `replay_share_${replayRequestId}`
    const legacyGuessDenied = await requestJson(baseUrl, `/api/replay/${replayRequestId}?shareToken=${legacyGuessableToken}`, 'GET')
    assert.equal(legacyGuessDenied.status, 401, `legacy guessable token should be denied: ${JSON.stringify(legacyGuessDenied.data)}`)
    assert.equal(readObject(legacyGuessDenied.data).deniedCopy, '这段回放未开放查看')

    const expiringIssue = await postJson(baseUrl, `/api/replay/${replayRequestId}/share-token?factionId=player`, sessionToken, {
      ttlMs: 1,
    })
    assert.equal(expiringIssue.status, 200, `short share token issue should succeed: ${JSON.stringify(expiringIssue.data)}`)
    const expiringShareToken = String(readObject(expiringIssue.data).shareToken ?? '')
    await sleep(20)
    const expiredShare = await requestJson(baseUrl, `/api/replay/${replayRequestId}?shareToken=${expiringShareToken}`, 'GET')
    assert.equal(expiredShare.status, 401, `expired share token should be denied: ${JSON.stringify(expiredShare.data)}`)
    assert.equal(readObject(expiredShare.data).deniedCopy, '这段回放未开放查看')

    const visibleDeniedCopy = [
      readObject(missingTokenIssue.data).deniedCopy,
      readObject(crossFactionIssue.data).deniedCopy,
      readObject(legacyGuessDenied.data).deniedCopy,
      readObject(expiredShare.data).deniedCopy,
    ].join('\n')
    for (const forbidden of [
      replayRequestId,
      issuedShareToken,
      expiringShareToken,
      'shareToken',
      '/api/replay',
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
      assert.equal(visibleDeniedCopy.includes(forbidden), false, `share token denial copy leaked ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

async function createReplay(baseUrl: string): Promise<string> {
  const runtimeSummary = await requestJson(baseUrl, '/api/observability/ai-runtime?factionId=player&eventLimit=1', 'GET')
  assert.equal(runtimeSummary.status, 200, `ai-runtime route failed: ${JSON.stringify(runtimeSummary.data)}`)
  const currentWorldVersion = Number(readObject(runtimeSummary.data).worldVersion)
  assert.ok(Number.isFinite(currentWorldVersion), 'ai-runtime route should expose current worldVersion')

  const worldSummary = await requestJson(
    baseUrl,
    '/api/world?intelMode=sparse&planningHistoryLimit=1&replayLimit=1&replayFrameLimit=1',
    'GET',
    undefined,
    30_000,
  )
  assert.equal(worldSummary.status, 200, `world summary route failed: ${JSON.stringify(worldSummary.data)}`)
  const world = readObject(readObject(worldSummary.data).world)
  const playerUnit = readArray(world.units)
    .map((item) => readObject(item))
    .find((item) => item.faction === 'player' && typeof item.id === 'string' && typeof item.tileId === 'string')
  assert.ok(playerUnit, 'world summary should expose at least one player unit')

  const replayRequestId = `player_history_replay_share_token_${Date.now()}`
  const queuePlan = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
    action: 'queuePlanExecution',
    payload: {
      factionId: 'player',
      source: 'mock',
      strategicCommand: 'player history replay share token issue expiry runtime contract',
      requestId: replayRequestId,
      basedOnWorldVersion: currentWorldVersion,
      plan: {
        intent: 'Player history replay share token issue expiry runtime contract',
        priority: 'medium',
        reviewAfterTicks: 1,
        constraints: ['player_history_replay_share_token_issue_expiry_runtime_contract'],
        orders: [
          {
            unitId: String(playerUnit.id),
            action: 'recon',
            target: String(playerUnit.tileId),
          },
        ],
      },
    },
  })
  assert.equal(queuePlan.status, 200, `queuePlanExecution route failed: ${JSON.stringify(queuePlan.data)}`)
  assert.equal(readObject(queuePlan.data).ok, true, `queuePlanExecution should succeed: ${JSON.stringify(queuePlan.data)}`)

  const advance = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', { action: 'advanceTick' }, 300_000)
  assert.equal(advance.status, 200, `advanceTick route failed: ${JSON.stringify(advance.data)}`)
  assert.equal(readObject(advance.data).ok, true, `advanceTick should succeed: ${JSON.stringify(advance.data)}`)

  return replayRequestId
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

runPlayerHistoryReplayShareTokenIssueExpiryRuntimeContract().then(() => {
  console.log('[player_history_replay_share_token_issue_expiry_runtime_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_replay_share_token_issue_expiry_runtime_contract] failed:', error)
  process.exitCode = 1
})
