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

function visibleCardText(card: Record<string, unknown>): string {
  return [
    card.actorName,
    card.title,
    card.summary,
    card.locationLabel,
    card.targetLabel,
    card.resultLabel,
    card.consequenceLabel,
    card.nextActionLabel,
  ].filter(Boolean).join('\n')
}

async function requestJsonWithBearer(
  baseUrl: string,
  path: string,
  bearerToken: string,
  timeoutMs = 15_000,
) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(new URL(path, baseUrl), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      signal: controller.signal,
    })
    const raw = await response.text()
    return {
      status: response.status,
      data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
    }
  } finally {
    clearTimeout(timer)
  }
}

async function runAiActivityPlanningProducerContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail)

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)
    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'player',
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)
    const sessionToken = String(readObject(join.data).token ?? '')
    assert.ok(sessionToken.length > 0, 'session join should return bearer token')

    const planning = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'appendPlanningJobHistory',
      payload: {
        entry: {
          id: 'ai_activity_planning_stage_505',
          status: 'succeeded',
          sourceMode: 'local',
          strategicCommand: '安排前线补给巡查',
          requestedTick: 1,
          requestedWorldVersion: 1,
          message: '前线补给巡查已经进入 AI 活动记录。',
          plannerNote: '虎牢前线',
          completedTick: 2,
          completedWorldVersion: 2,
        },
      },
    }, 60_000)
    assert.equal(planning.status, 200, `appendPlanningJobHistory route failed: ${JSON.stringify(planning.data)}`)
    const planningPayload = readObject(planning.data)
    assert.equal(planningPayload.ok, true, `appendPlanningJobHistory should succeed: ${JSON.stringify(planningPayload)}`)

    const events = await requestJson(baseUrl, '/api/events?limit=20', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const eventItems = readArray(readObject(events.data).items ?? readObject(events.data).events).map((item) => readObject(item))
    const planningEvent = eventItems.find((item) => item.action === 'append_planning_history' && item.success === true)
    assert.ok(planningEvent, 'runtime events should include successful append_planning_history')
    const metadata = readObject(readObject(planningEvent).metadata)
    assert.equal(metadata.playerHistoryCategory, 'ai_activity')
    assert.equal(metadata.playerHistoryTitle, 'AI 行动已完成')
    assert.equal(metadata.playerHistoryActorName, '军师 AI')
    assert.equal(metadata.playerHistoryLocation, '虎牢前线')
    assert.equal(metadata.playerHistoryTarget, '安排前线补给巡查')
    assert.equal(metadata.playerHistoryResultLabel, '已推进')
    assert.equal(metadata.playerHistoryNextAction, '查看 AI 活动')
    assert.equal(metadata.playerHistorySeverity, 'low')
    assert.equal(metadata.playerHistoryScope, 'private_ai')
    assert.equal(metadata.playerHistoryFactionId, 'player')
    assert.equal(metadata.playerHistorySharePolicy, 'not_shareable_private')
    assert.equal(metadata.playerHistoryShareStateLabel, '暂不可分享')
    assert.equal(typeof metadata.playerHistoryDedupeKey, 'string')

    const history = await requestJsonWithBearer(baseUrl, '/api/player-history?limit=20&eventLimit=20&civilMemoryLimit=5', sessionToken)
    assert.equal(history.status, 200, `player-history route failed: ${JSON.stringify(history.data)}`)
    const timeline = readObject(readObject(history.data).timeline)
    const cards = readArray(timeline.cards).map((item) => readObject(item))
    const aiCard = cards.find((card) => card.category === 'ai_activity' && card.title === 'AI 行动已完成')
    assert.ok(aiCard, 'player history should expose planning history as an AI activity card')
    assert.equal(aiCard.actorName, '军师 AI')
    assert.equal(aiCard.locationLabel, '虎牢前线')
    assert.equal(aiCard.targetLabel, '安排前线补给巡查')
    assert.equal(aiCard.resultLabel, '已推进')
    assert.equal(aiCard.nextActionLabel, '查看 AI 活动')
    assert.equal(aiCard.sharePolicy, undefined, 'private AI activity cards should not become shareable')
    assert.equal(aiCard.shareStateLabel, '暂不可分享')

    const visiblePayload = visibleCardText(aiCard)
    for (const required of ['AI 行动已完成', '军师 AI', '虎牢前线', '安排前线补给巡查', '查看 AI 活动']) {
      assert.ok(visiblePayload.includes(required), `AI activity visible copy should include ${required}`)
    }
    for (const forbidden of [
      'appendPlanningJobHistory',
      'append_planning_history',
      'ai_activity_planning_stage_505',
      '/api/world/action',
      'metadata',
      'sourceMode',
      'resolvedSource',
      'proposalId',
      'worldAction',
      'worldActionPayload',
      'plannerDecision',
      'provider',
      'model',
      'backend',
      'route',
      'fixture',
      'gate',
      'debug',
      'snake_case',
    ]) {
      assert.equal(visiblePayload.includes(forbidden), false, `AI activity visible copy leaked implementation term: ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runAiActivityPlanningProducerContract().then(() => {
  console.log('[player_history_ai_activity_planning_producer_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_ai_activity_planning_producer_contract] failed:', error)
  process.exitCode = 1
})
