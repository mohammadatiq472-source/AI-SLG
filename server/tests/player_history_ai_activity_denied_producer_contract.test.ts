import assert from 'node:assert/strict'
import { getAvailablePort, readArray, readObject, requestJson, shutdownChild, spawnBackend, type TailState, waitForHealth } from './helpers/backendHarness'

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

async function runPlayerHistoryAiActivityDeniedProducerContract() {
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

    const spectatorJoin = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'enemy',
      playerName: 'spectator',
    })
    assert.equal(spectatorJoin.status, 200, `spectator session join failed: ${JSON.stringify(spectatorJoin.data)}`)
    const spectatorToken = String(readObject(spectatorJoin.data).token ?? '')
    assert.ok(spectatorToken.length > 0, 'spectator session join should return bearer token')

    const register = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: 'ai_activity_denied_actor',
      displayName: '军师 AI',
      governorPlayerId: 'player',
      factionId: 'player',
      actionWhitelist: ['recruit_pool_select'],
      budgetPolicy: {
        allowHighRiskActions: true,
      },
    })
    assert.equal(register.status, 200, `AI player register failed: ${JSON.stringify(register.data)}`)

    const createProposal = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: 'ai_activity_denied_actor',
      action: 'recruit_pool_select',
      args: {
        poolId: 'pool_season',
      },
      reason: '玩家要求确认招募方向，AI 等待批准。',
      source: 'human',
    })
    assert.equal(createProposal.status, 200, `create proposal failed: ${JSON.stringify(createProposal.data)}`)
    const proposal = readObject(readObject(createProposal.data).proposal)
    const proposalId = String(proposal.proposalId ?? '')
    assert.ok(proposalId.length > 0, 'create proposal should return proposalId')
    assert.equal(proposal.status, 'pending_approval')

    const rejected = await requestJson(baseUrl, `/api/ai/players/proposals/${proposalId}/reject`, 'POST', {
      rejectedBy: 'player',
      rejectionReason: 'player_declined_recruit_pool_change',
    }, 60_000)
    assert.equal(rejected.status, 200, `reject proposal route failed: ${JSON.stringify(rejected.data)}`)
    const rejectedPayload = readObject(rejected.data)
    assert.equal(rejectedPayload.ok, true, `reject proposal should succeed: ${JSON.stringify(rejectedPayload)}`)
    assert.equal(readObject(rejectedPayload.proposal).status, 'rejected')

    const chatRejectedProposal = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: 'ai_activity_denied_actor',
      action: 'recruit_pool_select',
      args: {
        poolId: 'pool_standard',
      },
      reason: '聊天自然语言拒绝场景。',
      source: 'human',
    })
    assert.equal(chatRejectedProposal.status, 200, `create chat rejected proposal failed: ${JSON.stringify(chatRejectedProposal.data)}`)

    const chatReject = await requestJson(baseUrl, '/api/ai/players/ai_activity_denied_actor/chat/messages', 'POST', {
      body: '驳回刚才那个方案。',
      senderId: 'player',
      senderName: '总督',
      createProposal: true,
    }, 60_000)
    assert.equal(chatReject.status, 200, `chat reject proposal route failed: ${JSON.stringify(chatReject.data)}`)
    const chatRejected = readObject(readObject(chatReject.data).proposal)
    assert.equal(chatRejected.status, 'rejected')

    const events = await requestJson(baseUrl, '/api/events?limit=40', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const eventItems = readArray(readObject(events.data).items ?? readObject(events.data).events).map((item) => readObject(item))
    const rejectEvents = eventItems.filter((item) => item.action === 'ai_player_reject_proposal' && item.success === true)
    assert.equal(rejectEvents.length >= 2, true, 'runtime events should include proposal route reject and chat natural-language reject')
    for (const rejectEvent of rejectEvents) {
      const metadata = readObject(readObject(rejectEvent).metadata)
      assert.equal(metadata.playerHistoryCategory, 'ai_activity')
      assert.equal(metadata.playerHistoryTitle, 'AI 行动受阻')
      assert.equal(metadata.playerHistoryActorName, '军师 AI')
      assert.equal(metadata.playerHistoryLocation, 'AI 活动')
      assert.equal(metadata.playerHistoryTarget, '切换招募卡池')
      assert.equal(metadata.playerHistoryResultLabel, '已驳回')
      assert.equal(metadata.playerHistoryNextAction, '重新下令')
      assert.equal(metadata.playerHistorySeverity, 'high')
      assert.equal(metadata.playerHistoryScope, 'private_ai')
      assert.equal(metadata.playerHistoryFactionId, 'player')
      assert.equal(metadata.playerHistorySharePolicy, 'not_shareable_private')
      assert.equal(metadata.playerHistoryShareStateLabel, '暂不可分享')
      assert.equal(typeof metadata.playerHistoryDedupeKey, 'string')
      assert.match(String(metadata.playerHistoryDedupeKey), /^ai-activity:proposal-rejected:/)
      const sourceRefs = readObject(metadata.sourceRefs)
      assert.equal(sourceRefs.visible, false)
      assert.equal(sourceRefs.visibility, 'internal_link_only')
      assert.equal(typeof sourceRefs.proposalId, 'string')
    }

    const history = await requestJsonWithBearer(baseUrl, '/api/player-history?limit=20&eventLimit=40&civilMemoryLimit=5', sessionToken)
    assert.equal(history.status, 200, `player-history route failed: ${JSON.stringify(history.data)}`)
    const timeline = readObject(readObject(history.data).timeline)
    const cards = readArray(timeline.cards).map((item) => readObject(item))
    const aiCards = cards.filter((card) => card.category === 'ai_activity' && card.title === 'AI 行动受阻')
    assert.equal(aiCards.length >= 2, true, 'player history should expose rejected proposals as private AI activity cards')
    for (const aiCard of aiCards) {
      assert.equal(aiCard.actorName, '军师 AI')
      assert.equal(aiCard.locationLabel, 'AI 活动')
      assert.equal(aiCard.targetLabel, '切换招募卡池')
      assert.equal(aiCard.resultLabel, '已驳回')
      assert.equal(aiCard.nextActionLabel, '重新下令')
      assert.equal(aiCard.sharePolicy, undefined, 'private AI activity cards should not become shareable')
      assert.equal(aiCard.shareStateLabel, '暂不可分享')

      const visiblePayload = visibleCardText(aiCard)
      for (const required of ['AI 行动受阻', '军师 AI', 'AI 活动', '切换招募卡池', '重新下令']) {
        assert.ok(visiblePayload.includes(required), `AI activity visible copy should include ${required}`)
      }
      for (const forbidden of [
        'appendPlanningJobHistory',
        'append_planning_history',
        'ai_player_reject_proposal',
        '/api/ai/players',
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
        'recruit_pool_select',
      ]) {
        assert.equal(visiblePayload.includes(forbidden), false, `AI activity visible copy leaked implementation term: ${forbidden}`)
      }
    }

    const spectatorHistory = await requestJsonWithBearer(baseUrl, '/api/player-history?limit=20&eventLimit=40&civilMemoryLimit=5', spectatorToken)
    assert.equal(spectatorHistory.status, 200, `spectator player-history route failed: ${JSON.stringify(spectatorHistory.data)}`)
    const spectatorTimeline = readObject(readObject(spectatorHistory.data).timeline)
    const spectatorCards = readArray(spectatorTimeline.cards).map((item) => readObject(item))
    assert.equal(
      spectatorCards.some((card) => card.category === 'ai_activity' && card.title === 'AI 行动受阻'),
      false,
      'private rejected proposal history should not be visible to another faction',
    )
    const spectatorAnchors = readArray(spectatorTimeline.historyNotificationAnchors).map((item) => readObject(item))
    assert.equal(
      spectatorAnchors.some((anchor) => anchor.accessState === 'private' && anchor.title === '有记录暂未开放'),
      true,
      'cross-faction viewer should receive private denied notification anchor',
    )

    const subjectResponse = await requestJson(
      baseUrl,
      '/api/ai/players/ai_activity_denied_actor/subject?governorPlayerId=player',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(subjectResponse.status, 200, `subject after rejected proposal failed: ${JSON.stringify(subjectResponse.data)}`)
    const subject = readObject(readObject(subjectResponse.data).subject)
    const recentBodyChanges = readObject(subject.recentBodyChanges)
    assert.equal(recentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
    const bodyChangeItems = readArray(recentBodyChanges.items).map((item) => readObject(item))
    const rejectedGovernanceBodyChange = bodyChangeItems.find((item) => (
      item.action === 'recruit_pool_select' &&
      item.status === 'failed' &&
      item.proposalId === proposalId
    ))
    assert.ok(rejectedGovernanceBodyChange, 'rejected proposal must become a subject governance body change')
    assert.equal(rejectedGovernanceBodyChange.bodyNode, 'human_command_and_obedience')
    assert.equal(rejectedGovernanceBodyChange.nextSubjectFocus, 'governance')
    assert.equal(rejectedGovernanceBodyChange.failureCode, 'player_declined_recruit_pool_change')
    assert.equal(rejectedGovernanceBodyChange.governanceRecoveryFocus, 'retry')
    assert.equal(rejectedGovernanceBodyChange.governanceRecoveryRecommendedCommand, '重新生成一个更明确的提案。')
    assert.match(String(rejectedGovernanceBodyChange.governanceRecoverySummary), /提案已拒绝/)
    assert.equal(rejectedGovernanceBodyChange.visibleToAi, true)

    const recentHistoryAnchors = readObject(subject.recentHistoryAnchors)
    assert.equal(recentHistoryAnchors.contractId, 'ai_player_subject_history_anchors_v1')
    const historyAnchorItems = readArray(recentHistoryAnchors.items).map((item) => readObject(item))
    const rejectedHistoryAnchor = historyAnchorItems.find((item) => (
      item.action === 'recruit_pool_select' &&
      item.bodyNode === 'human_command_and_obedience' &&
      item.proposalId === proposalId
    ))
    assert.ok(rejectedHistoryAnchor, 'rejected proposal governance body change must be linked to subject history')
    assert.equal(rejectedHistoryAnchor.status, 'failed')
    assert.equal(rejectedHistoryAnchor.governanceRecoveryFocus, rejectedGovernanceBodyChange.governanceRecoveryFocus)
    assert.equal(rejectedHistoryAnchor.governanceRecoverySummary, rejectedGovernanceBodyChange.governanceRecoverySummary)
    assert.equal(rejectedHistoryAnchor.governanceRecoveryRecommendedCommand, rejectedGovernanceBodyChange.governanceRecoveryRecommendedCommand)
    assert.equal(rejectedHistoryAnchor.nextSubjectFocus, 'governance')
    const rejectedHistorySourceRefs = readObject(rejectedHistoryAnchor.sourceRefs)
    assert.equal(rejectedHistorySourceRefs.visible, false)
    assert.equal(rejectedHistorySourceRefs.visibility, 'internal_link_only')
    assert.equal(rejectedHistorySourceRefs.proposalId, proposalId)
  } finally {
    await shutdownChild(child)
  }
}

runPlayerHistoryAiActivityDeniedProducerContract().then(() => {
  console.log('[player_history_ai_activity_denied_producer_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_ai_activity_denied_producer_contract] failed:', error)
  process.exitCode = 1
})
