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

async function runPlayerHistorySourceRefVisibilityRuntimeContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('player_history_source_ref_visibility_session'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const replayRequestId = await createReplay(baseUrl)
    const history = await requestJson(baseUrl, '/api/player-history?limit=30&replayLimit=5&eventLimit=10&civilMemoryLimit=5', 'GET')
    assert.equal(history.status, 200, `player-history route failed: ${JSON.stringify(history.data)}`)
    const timeline = readObject(readObject(history.data).timeline)
    const cards = readArray(timeline.cards).map((item) => readObject(item))
    assert.ok(cards.length > 0, 'timeline should expose cards')

    const cardsWithRefs = cards.filter((card) => card.sourceRefs)
    assert.ok(cardsWithRefs.length > 0, 'timeline should preserve internal source refs for recovery links')
    assert.ok(
      cardsWithRefs.some((card) => readObject(card.sourceRefs).replayRequestId === replayRequestId),
      'timeline should preserve replay source ref internally',
    )

    for (const card of cardsWithRefs) {
      const refs = readObject(card.sourceRefs)
      assert.equal(refs.visibility, 'internal_link_only', `sourceRefs should be internal-only: ${JSON.stringify(refs)}`)
      assert.equal(refs.visible, false, `sourceRefs should not be player-visible: ${JSON.stringify(refs)}`)
    }

    const visibleTimelineCopy = cards.map((card) => ({
      id: card.id,
      category: card.category,
      actorName: card.actorName,
      title: card.title,
      summary: card.summary,
      locationLabel: card.locationLabel,
      targetLabel: card.targetLabel,
      resultLabel: card.resultLabel,
      consequenceLabel: card.consequenceLabel,
      nextActionLabel: card.nextActionLabel,
      severity: card.severity,
      timestampBucket: card.timestampBucket,
    }))
    const visibleText = JSON.stringify(visibleTimelineCopy)
    for (const forbidden of [
      replayRequestId,
      'worldEventId',
      'replayRequestId',
      'saveSlotId',
      'civilMemoryId',
      'sourceRefs',
      'internal_link_only',
      'visibility',
      '/api/',
      'shareToken',
      'token',
      'debug',
      'ops',
      'snake_case',
    ]) {
      assert.equal(visibleText.includes(forbidden), false, `timeline visible copy leaked source ref detail ${forbidden}`)
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

  const replayRequestId = `player_history_source_ref_visibility_${Date.now()}`
  const queuePlan = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
    action: 'queuePlanExecution',
    payload: {
      factionId: 'player',
      source: 'mock',
      strategicCommand: 'player history source ref visibility runtime contract',
      requestId: replayRequestId,
      basedOnWorldVersion: currentWorldVersion,
      plan: {
        intent: 'Player history source ref visibility runtime contract',
        priority: 'medium',
        reviewAfterTicks: 1,
        constraints: ['player_history_source_ref_visibility_runtime_contract'],
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

runPlayerHistorySourceRefVisibilityRuntimeContract().then(() => {
  console.log('[player_history_source_ref_visibility_runtime_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_source_ref_visibility_runtime_contract] failed:', error)
  process.exitCode = 1
})
