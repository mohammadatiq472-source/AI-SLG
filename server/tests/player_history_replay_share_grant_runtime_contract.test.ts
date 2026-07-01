import assert from 'node:assert/strict'
import {
  getAvailablePort,
  readObject,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

async function requestJson(baseUrl: string, path: string) {
  const response = await fetch(new URL(path, baseUrl), { method: 'GET' })
  const raw = await response.text()
  return {
    status: response.status,
    data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
  }
}

async function runPlayerHistoryReplayShareGrantRuntimeContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail)

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const sharedRequestId = 'shared_replay_stage_511'
    const legacyGuessableToken = `replay_share_${sharedRequestId}`
    const deniedLegacyShare = await requestJson(baseUrl, `/api/replay/${sharedRequestId}?shareToken=${legacyGuessableToken}`)
    assert.equal(deniedLegacyShare.status, 401, `legacy guessable share token should be denied: ${JSON.stringify(deniedLegacyShare.data)}`)
    assert.equal(readObject(deniedLegacyShare.data).deniedCopy, '这段回放未开放查看')

    const deniedWrongShare = await requestJson(baseUrl, `/api/replay/${sharedRequestId}?shareToken=replay_share_other`)
    assert.equal(deniedWrongShare.status, 401, `wrong share token should be denied: ${JSON.stringify(deniedWrongShare.data)}`)
    assert.equal(readObject(deniedWrongShare.data).deniedCopy, '这段回放未开放查看')

    const deniedArchiveShare = await requestJson(baseUrl, `/api/replay/archive?shareToken=${legacyGuessableToken}`)
    assert.equal(deniedArchiveShare.status, 401, `share token must not expose replay archive: ${JSON.stringify(deniedArchiveShare.data)}`)
    assert.equal(readObject(deniedArchiveShare.data).deniedCopy, '这段回放未开放查看')

    const deniedRagShare = await requestJson(baseUrl, `/api/replay/rag-cache?shareToken=${legacyGuessableToken}`)
    assert.equal(deniedRagShare.status, 401, `share token must not expose replay RAG cache: ${JSON.stringify(deniedRagShare.data)}`)
    assert.equal(readObject(deniedRagShare.data).deniedCopy, '这段回放未开放查看')

    const deniedVisibleCopy = [
      readObject(deniedLegacyShare.data).deniedCopy,
      readObject(deniedWrongShare.data).deniedCopy,
      readObject(deniedArchiveShare.data).deniedCopy,
      readObject(deniedRagShare.data).deniedCopy,
    ].join('\n')

    for (const forbidden of [
      'shareToken',
      legacyGuessableToken,
      sharedRequestId,
      '/api/',
      'Replay-RAG',
      'RAG cache',
      'archive',
      'route',
      'token',
      'debug',
      'ops',
      '401',
      'snake_case',
    ]) {
      assert.equal(deniedVisibleCopy.includes(forbidden), false, `share denied visible copy leaked ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runPlayerHistoryReplayShareGrantRuntimeContract().then(() => {
  console.log('[player_history_replay_share_grant_runtime_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_replay_share_grant_runtime_contract] failed:', error)
  process.exitCode = 1
})
