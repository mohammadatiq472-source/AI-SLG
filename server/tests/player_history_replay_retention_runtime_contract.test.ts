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

async function runPlayerHistoryReplayRetentionRuntimeContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    REPLAY_RETENTION_MAX_AGE_MS: '0',
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('player_history_replay_retention_session'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const runtimeSummary = await requestJson(baseUrl, '/api/observability/ai-runtime?factionId=player&eventLimit=1', 'GET')
    assert.equal(runtimeSummary.status, 200, `ai-runtime route failed: ${JSON.stringify(runtimeSummary.data)}`)
    const runtimePayload = readObject(runtimeSummary.data)
    const currentWorldVersion = Number(runtimePayload.worldVersion)
    assert.ok(Number.isFinite(currentWorldVersion), 'ai-runtime route should expose current worldVersion')

    const worldSummary = await requestJson(
      baseUrl,
      '/api/world?intelMode=sparse&planningHistoryLimit=1&replayLimit=1&replayFrameLimit=1',
      'GET',
      undefined,
      30_000,
    )
    assert.equal(worldSummary.status, 200, `world summary route failed: ${JSON.stringify(worldSummary.data)}`)
    const worldPayload = readObject(worldSummary.data)
    const world = readObject(worldPayload.world)
    const units = readArray(world.units)
    const playerUnit = units
      .map((item) => readObject(item))
      .find((item) => item.faction === 'player' && typeof item.id === 'string' && typeof item.tileId === 'string')
    assert.ok(playerUnit, 'world summary should expose at least one player unit')

    const queueRequestId = `player_history_replay_retention_${Date.now()}`
    const queuePlan = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'queuePlanExecution',
      payload: {
        factionId: 'player',
        source: 'mock',
        strategicCommand: 'player history replay retention runtime contract',
        requestId: queueRequestId,
        basedOnWorldVersion: currentWorldVersion,
        plan: {
          intent: 'Player history replay retention runtime contract',
          priority: 'medium',
          reviewAfterTicks: 1,
          constraints: ['player_history_replay_retention_runtime_contract'],
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

    const archive = await requestJson(baseUrl, '/api/replay/archive', 'GET', undefined, 30_000)
    assert.equal(archive.status, 200, `replay archive should stay reachable as support evidence: ${JSON.stringify(archive.data)}`)
    const archiveItems = readArray(readObject(archive.data).items)
    assert.ok(
      archiveItems.some((item) => readObject(item).requestId === queueRequestId),
      `archive should contain generated replay ${queueRequestId}: ${JSON.stringify(archive.data)}`,
    )

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'retention_contract',
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)
    const sessionToken = String(readObject(join.data).token ?? '')
    assert.ok(sessionToken.length > 0, 'session join should return token')

    const shareTokenIssue = await requestJsonWithAuth(
      baseUrl,
      `/api/replay/${queueRequestId}/share-token?factionId=player`,
      sessionToken,
      { ttlMs: 5_000 },
    )
    assert.equal(shareTokenIssue.status, 200, `share token issue failed: ${JSON.stringify(shareTokenIssue.data)}`)
    const issuedShareToken = String(readObject(shareTokenIssue.data).shareToken ?? '')
    assert.ok(issuedShareToken.startsWith('replay_share_v1.'), 'share token issue should return signed v1 token')

    const expiredEntry = await requestJson(baseUrl, `/api/replay/${queueRequestId}`, 'GET')
    assert.equal(expiredEntry.status, 410, `expired replay should return retention unavailable state: ${JSON.stringify(expiredEntry.data)}`)
    const expiredPayload = readObject(expiredEntry.data)
    assert.equal(expiredPayload.ok, false)
    assert.equal(expiredPayload.replayTitle, '回放已不可用')
    assert.equal(expiredPayload.deniedCopy, '这段回放暂时无法查看，可返回战报。')
    assert.equal(expiredPayload.retentionLabel, '保留期已过')

    const shareExpired = await requestJson(baseUrl, `/api/replay/${queueRequestId}?shareToken=${issuedShareToken}`, 'GET')
    assert.equal(shareExpired.status, 410, `share grant must not bypass retention expiry: ${JSON.stringify(shareExpired.data)}`)
    assert.equal(readObject(shareExpired.data).retentionLabel, '保留期已过')

    const visibleCopy = [
      expiredPayload.replayTitle,
      expiredPayload.deniedCopy,
      expiredPayload.retentionLabel,
      readObject(shareExpired.data).deniedCopy,
    ].join('\n')

    for (const forbidden of [
      queueRequestId,
      '/api/replay',
      'Replay-RAG',
      'RAG cache',
      'archive',
      'requestId',
      'route',
      'token',
      'debug',
      'ops',
      '410',
      '404',
      'stack',
      'snake_case',
    ]) {
      assert.equal(visibleCopy.includes(forbidden), false, `expired replay visible copy leaked ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runPlayerHistoryReplayRetentionRuntimeContract().then(() => {
  console.log('[player_history_replay_retention_runtime_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_replay_retention_runtime_contract] failed:', error)
  process.exitCode = 1
})

async function requestJsonWithAuth(baseUrl: string, path: string, token: string, body: Record<string, unknown>) {
  const response = await fetch(new URL(path, baseUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const raw = await response.text()
  return {
    status: response.status,
    data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
  }
}
