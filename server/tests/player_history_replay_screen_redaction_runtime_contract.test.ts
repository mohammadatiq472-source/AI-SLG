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

async function runPlayerHistoryReplayScreenRedactionRuntimeContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('player_history_replay_screen_redaction_session'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const { replayRequestId, privateMarker, unitId, targetTileId } = await createReplay(baseUrl)
    const history = await requestJson(baseUrl, `/api/player-history?replayRequestId=${replayRequestId}&replayLimit=5`, 'GET')
    assert.equal(history.status, 200, `player-history route failed: ${JSON.stringify(history.data)}`)
    const replay = readObject(readObject(history.data).replay)
    assert.equal(replay.contractId, 'battle_replay_action_frame_v1')
    assert.equal(replay.replayTitle, '战斗回放')
    assert.equal(String(replay.battleReportId).includes(replayRequestId), false, 'battleReportId must not expose raw replay request id')
    const frames = readArray(replay.frames).map((item) => readObject(item))
    assert.ok(frames.length > 0, 'replay screen should expose redacted action frames')

    const visibleReplayCopy = [
      replay.replayTitle,
      replay.battleReportId,
      replay.frameCountLabel,
      replay.inspectionHintLabel,
      replay.timelineScrubLabel,
      ...frames.flatMap((frame) => [
        frame.id,
        frame.title,
        frame.sideLabel,
        frame.actorName,
        frame.actionLabel,
        frame.effectLabel,
        frame.mapContextLabel,
        frame.roundContextLabel,
      ]),
    ].filter((value) => typeof value === 'string').join('\n')

    for (const forbidden of [
      replayRequestId,
      privateMarker,
      unitId,
      targetTileId,
      'private_ai_replay_screen_marker',
      'strategicCommand',
      'plannerNote',
      'plannerExplanation',
      'planningRationale',
      'constraints',
      'unitId',
      'target',
      'tileId',
      '/api/replay',
      'shareToken',
      'token',
      'debug',
      'ops',
      'snake_case',
    ]) {
      assert.equal(visibleReplayCopy.includes(forbidden), false, `replay screen visible copy leaked ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

async function createReplay(baseUrl: string) {
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

  const replayRequestId = `player_history_replay_screen_redaction_${Date.now()}`
  const privateMarker = `private_ai_replay_screen_marker_${Date.now()}`
  const unitId = String(playerUnit.id)
  const targetTileId = String(playerUnit.tileId)
  const queuePlan = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
    action: 'queuePlanExecution',
    payload: {
      factionId: 'player',
      source: 'mock',
      strategicCommand: privateMarker,
      requestId: replayRequestId,
      basedOnWorldVersion: currentWorldVersion,
      plan: {
        intent: privateMarker,
        priority: 'medium',
        reviewAfterTicks: 1,
        constraints: [privateMarker, 'replay screen should redact raw actor target ids'],
        orders: [
          {
            unitId,
            action: 'recon',
            target: targetTileId,
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
  return { replayRequestId, privateMarker, unitId, targetTileId }
}

runPlayerHistoryReplayScreenRedactionRuntimeContract().then(() => {
  console.log('[player_history_replay_screen_redaction_runtime_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_replay_screen_redaction_runtime_contract] failed:', error)
  process.exitCode = 1
})
