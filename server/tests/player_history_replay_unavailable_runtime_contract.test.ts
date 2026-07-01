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

async function runPlayerHistoryReplayUnavailableRuntimeContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail)

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const response = await requestJson(
      baseUrl,
      '/api/player-history?limit=20&replayRequestId=missing_replay_stage_509',
      'GET',
    )
    assert.equal(response.status, 200, `player history replay-unavailable route should return 200: ${JSON.stringify(response.data)}`)

    const payload = readObject(response.data)
    const replay = readObject(payload.replay)
    assert.equal(replay.contractId, 'battle_replay_action_frame_v1')
    assert.equal(replay.replayTitle, '回放已不可用')
    assert.equal(replay.battleReportId, 'unavailable')
    assert.equal(replay.selectedFrameIndex, -1)
    assert.equal(replay.frameCountLabel, '暂无可检查步骤')
    assert.equal(replay.inspectionHintLabel, '这段回放暂时无法查看，可返回战报。')
    assert.equal(replay.timelineScrubLabel, '暂无可拖动内容')
    assert.deepEqual(readArray(replay.frames), [])
    const controls = readObject(replay.controls)
    assert.equal(controls.canPause, false)
    assert.equal(controls.canStepForward, false)
    assert.equal(controls.canStepBackward, false)
    assert.equal(controls.canScrub, false)

    const visiblePayload = [
      replay.replayTitle,
      replay.frameCountLabel,
      replay.inspectionHintLabel,
      replay.timelineScrubLabel,
    ].join('\n')

    for (const forbidden of [
      'missing_replay_stage_509',
      'requestId',
      '/api/replay',
      '/api/player-history',
      'Replay-RAG',
      'RAG cache',
      'archive',
      'route',
      '404',
      '500',
      'token',
      'debug',
      'ops',
      'snake_case',
    ]) {
      assert.equal(visiblePayload.includes(forbidden), false, `replay unavailable visible copy leaked ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runPlayerHistoryReplayUnavailableRuntimeContract().then(() => {
  console.log('[player_history_replay_unavailable_runtime_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_replay_unavailable_runtime_contract] failed:', error)
  process.exitCode = 1
})
