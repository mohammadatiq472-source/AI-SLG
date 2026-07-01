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

async function runPlayerHistoryReplayCardRedactionRuntimeContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('player_history_replay_card_redaction_session'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const replayRequestId = await createReplay(baseUrl)
    const history = await requestJson(baseUrl, '/api/player-history?limit=20&replayLimit=5&eventLimit=5&civilMemoryLimit=5', 'GET')
    assert.equal(history.status, 200, `player-history route failed: ${JSON.stringify(history.data)}`)
    const timeline = readObject(readObject(history.data).timeline)
    const cards = readArray(timeline.cards).map((item) => readObject(item))
    const replayCard = cards.find((card) =>
      String(card.id).startsWith('replay-card-') && readObject(card.sourceRefs).replayRequestId === replayRequestId
    )
    assert.ok(replayCard, `timeline should include redacted replay card for generated replay: ${JSON.stringify(cards)}`)

    assert.equal(replayCard.title, '战斗回放已生成')
    assert.equal(replayCard.summary, '可以查看行动过程')
    assert.equal(String(replayCard.id).includes(replayRequestId), false, 'replay timeline card id must not expose request id')
    assert.equal(readObject(replayCard.sourceRefs).replayRequestId, replayRequestId, 'internal source ref should preserve recovery link')

    const visibleCardCopy = [
      replayCard.id,
      replayCard.actorName,
      replayCard.title,
      replayCard.summary,
      replayCard.locationLabel,
      replayCard.targetLabel,
      replayCard.resultLabel,
      replayCard.consequenceLabel,
      replayCard.nextActionLabel,
    ].filter((value) => typeof value === 'string').join('\n')

    for (const forbidden of [
      replayRequestId,
      'private_ai_plan_marker',
      'strategicCommand',
      'plannerNote',
      'plannerExplanation',
      'planningRationale',
      'constraints',
      'unitId',
      'target',
      '/api/replay',
      'shareToken',
      'token',
      'debug',
      'ops',
      'snake_case',
    ]) {
      assert.equal(visibleCardCopy.includes(forbidden), false, `replay timeline card visible copy leaked ${forbidden}`)
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

  const replayRequestId = `player_history_replay_card_redaction_${Date.now()}`
  const privateMarker = `private_ai_plan_marker_${Date.now()}`
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
        constraints: [privateMarker, 'plannerNote plannerExplanation planningRationale should stay private'],
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

runPlayerHistoryReplayCardRedactionRuntimeContract().then(() => {
  console.log('[player_history_replay_card_redaction_runtime_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_replay_card_redaction_runtime_contract] failed:', error)
  process.exitCode = 1
})
