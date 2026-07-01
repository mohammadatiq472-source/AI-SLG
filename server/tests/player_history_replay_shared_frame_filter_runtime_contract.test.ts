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

async function runPlayerHistoryReplaySharedFrameFilterRuntimeContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('player_history_replay_shared_frame_filter_session'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

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

    const queueRequestId = `player_history_replay_shared_filter_${Date.now()}`
    const privateMarker = `private_ai_deliberation_${Date.now()}`
    const queuePlan = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'queuePlanExecution',
      payload: {
        factionId: 'player',
        source: 'mock',
        strategicCommand: privateMarker,
        requestId: queueRequestId,
        basedOnWorldVersion: currentWorldVersion,
        plan: {
          intent: privateMarker,
          priority: 'medium',
          reviewAfterTicks: 1,
          constraints: [privateMarker, 'hidden save/load and AI rationale must stay private'],
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

    const supportEntry = await requestJson(baseUrl, `/api/replay/${queueRequestId}`, 'GET')
    assert.equal(supportEntry.status, 200, `support replay lookup should remain complete: ${JSON.stringify(supportEntry.data)}`)
    const supportText = JSON.stringify(supportEntry.data)
    assert.ok(supportText.includes(queueRequestId), 'support replay lookup should preserve requestId for internal tools')
    assert.ok(supportText.includes(privateMarker), 'support replay lookup should preserve internal plan context')

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'shared_filter_contract',
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

    const sharedEntry = await requestJson(baseUrl, `/api/replay/${queueRequestId}?shareToken=${issuedShareToken}`, 'GET')
    assert.equal(sharedEntry.status, 200, `shared replay lookup should return filtered packet: ${JSON.stringify(sharedEntry.data)}`)
    const sharedPayload = readObject(sharedEntry.data)
    assert.equal(readObject(sharedPayload.archive).sharedScope, 'public_context')
    const sharedReplay = readObject(sharedPayload.replay)
    assert.equal(sharedReplay.sharedScope, 'public_context')
    assert.ok(readArray(sharedReplay.frames).length > 0, 'shared replay should retain public frames')

    const sharedText = JSON.stringify(sharedEntry.data)
    for (const forbidden of [
      queueRequestId,
      privateMarker,
      'strategicCommand',
      'plannerNote',
      'plannerExplanation',
      'planningRationale',
      '"plan"',
      'constraints',
      'unitId',
      'target',
      'tileId',
      'fromTileId',
      'toTileId',
      'factionId',
      'hidden save/load',
      'private_ai_deliberation',
    ]) {
      assert.equal(sharedText.includes(forbidden), false, `shared replay packet leaked ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runPlayerHistoryReplaySharedFrameFilterRuntimeContract().then(() => {
  console.log('[player_history_replay_shared_frame_filter_runtime_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_replay_shared_frame_filter_runtime_contract] failed:', error)
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
