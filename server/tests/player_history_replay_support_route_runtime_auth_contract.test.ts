import assert from 'node:assert/strict'
import {
  getAvailablePort,
  readArray,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

async function requestJsonWithBearer(baseUrl: string, path: string, token?: string) {
  const response = await fetch(new URL(path, baseUrl), {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  const raw = await response.text()
  return {
    status: response.status,
    data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
  }
}

async function runPlayerHistoryReplaySupportRouteRuntimeAuthContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail)

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'replay_support_scope_player',
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)
    const token = String(readObject(join.data).token)
    assert.ok(token.length > 0, 'session join should return a bearer token')

    const allowedArchive = await requestJsonWithBearer(baseUrl, '/api/replay/archive?factionId=player', token)
    assert.equal(allowedArchive.status, 200, `own faction replay archive should pass: ${JSON.stringify(allowedArchive.data)}`)
    assert.ok(Array.isArray(readObject(allowedArchive.data).items), 'authorized archive should return replay archive items')

    const allowedMissingEntry = await requestJsonWithBearer(baseUrl, '/api/replay/missing_replay_stage_510?factionId=player', token)
    assert.equal(
      allowedMissingEntry.status,
      404,
      `authorized missing replay lookup should reach support lookup boundary: ${JSON.stringify(allowedMissingEntry.data)}`,
    )

    const deniedMissingToken = await requestJsonWithBearer(baseUrl, '/api/replay/archive?factionId=player')
    assert.equal(deniedMissingToken.status, 401, `declared faction without token should be denied: ${JSON.stringify(deniedMissingToken.data)}`)
    assert.equal(readObject(deniedMissingToken.data).deniedCopy, '这段回放未开放查看')

    const deniedForeign = await requestJsonWithBearer(baseUrl, '/api/replay/missing_replay_stage_510?factionId=foreign_faction', token)
    assert.equal(deniedForeign.status, 403, `foreign faction replay lookup should be denied: ${JSON.stringify(deniedForeign.data)}`)
    assert.equal(readObject(deniedForeign.data).deniedCopy, '这段回放未开放查看')

    const deniedVisibleCopy = [
      readObject(deniedMissingToken.data).deniedCopy,
      readObject(deniedForeign.data).deniedCopy,
    ].join('\n')
    for (const forbidden of [
      'token',
      'Authorization',
      'Bearer',
      '/api/',
      'route',
      'Replay-RAG',
      'archive',
      'debug',
      'ops',
      'foreign_faction',
      'session',
      'factionId',
      '401',
      '403',
      'snake_case',
    ]) {
      assert.equal(deniedVisibleCopy.includes(forbidden), false, `replay denied visible copy leaked ${forbidden}`)
    }

    assert.equal(readArray(readObject(allowedArchive.data).items).length >= 0, true)
  } finally {
    await shutdownChild(child)
  }
}

runPlayerHistoryReplaySupportRouteRuntimeAuthContract().then(() => {
  console.log('[player_history_replay_support_route_runtime_auth_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_replay_support_route_runtime_auth_contract] failed:', error)
  process.exitCode = 1
})
