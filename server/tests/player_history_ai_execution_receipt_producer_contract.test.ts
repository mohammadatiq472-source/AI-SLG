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

async function runPlayerHistoryAiExecutionReceiptProducerContract() {
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
      aiPlayerId: 'ai_execution_receipt_actor',
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
      aiPlayerId: 'ai_execution_receipt_actor',
      action: 'recruit_pool_select',
      args: {
        poolId: 'pool_season',
      },
      reason: '执行招募方向切换。',
      source: 'human',
    })
    assert.equal(createProposal.status, 200, `create proposal failed: ${JSON.stringify(createProposal.data)}`)
    const proposal = readObject(readObject(createProposal.data).proposal)
    const proposalId = String(proposal.proposalId ?? '')
    assert.ok(proposalId.length > 0, 'create proposal should return proposalId')
    assert.equal(proposal.status, 'pending_approval')

    const approved = await requestJson(baseUrl, `/api/ai/players/proposals/${proposalId}/approve`, 'POST', {
      approvedBy: 'player',
    })
    assert.equal(approved.status, 200, `approve proposal failed: ${JSON.stringify(approved.data)}`)

    const subjectAfterApprove = await requestJson(
      baseUrl,
      '/api/ai/players/ai_execution_receipt_actor/subject?governorPlayerId=player',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(subjectAfterApprove.status, 200, `subject after approve failed: ${JSON.stringify(subjectAfterApprove.data)}`)
    const approvedSubject = readObject(readObject(subjectAfterApprove.data).subject)
    const approvedRecentBodyChanges = readObject(approvedSubject.recentBodyChanges)
    assert.equal(approvedRecentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
    const approvedBodyChangeItems = readArray(approvedRecentBodyChanges.items).map((item) => readObject(item))
    const approvedGovernanceBodyChange = approvedBodyChangeItems.find((item) => (
      item.action === 'recruit_pool_select' &&
      item.status === 'approved' &&
      item.proposalId === proposalId
    ))
    assert.ok(approvedGovernanceBodyChange, 'approved proposal must become a subject governance body change before execution')
    assert.equal(approvedGovernanceBodyChange.bodyNode, 'human_command_and_obedience')
    assert.equal(approvedGovernanceBodyChange.approvedBy, 'player')
    assert.equal(approvedGovernanceBodyChange.nextSubjectFocus, 'governance')
    assert.equal(approvedGovernanceBodyChange.governanceRecoveryFocus, 'retry')
    assert.equal(approvedGovernanceBodyChange.governanceRecoveryRecommendedCommand, '执行这个已经批准的提案。')
    assert.match(String(approvedGovernanceBodyChange.governanceRecoverySummary), /已批准/)
    assert.equal(approvedGovernanceBodyChange.executionReceiptAvailable, false)
    assert.equal(approvedGovernanceBodyChange.executionWorldReceiptAvailable, false)
    assert.equal(approvedGovernanceBodyChange.visibleToAi, true)

    const approvedRecentHistoryAnchors = readObject(approvedSubject.recentHistoryAnchors)
    assert.equal(approvedRecentHistoryAnchors.contractId, 'ai_player_subject_history_anchors_v1')
    const approvedHistoryAnchorItems = readArray(approvedRecentHistoryAnchors.items).map((item) => readObject(item))
    const approvedHistoryAnchor = approvedHistoryAnchorItems.find((item) => (
      item.action === 'recruit_pool_select' &&
      item.status === 'approved' &&
      item.bodyNode === 'human_command_and_obedience' &&
      item.proposalId === proposalId
    ))
    assert.ok(approvedHistoryAnchor, 'approved proposal governance body change must be linked to subject history')
    assert.equal(approvedHistoryAnchor.nextSubjectFocus, 'governance')
    assert.equal(approvedHistoryAnchor.executionReceiptAvailable, false)
    assert.equal(approvedHistoryAnchor.executionWorldReceiptAvailable, false)
    const approvedHistorySourceRefs = readObject(approvedHistoryAnchor.sourceRefs)
    assert.equal(approvedHistorySourceRefs.visible, false)
    assert.equal(approvedHistorySourceRefs.visibility, 'internal_link_only')
    assert.equal(approvedHistorySourceRefs.proposalId, proposalId)

    const executed = await requestJson(baseUrl, `/api/ai/players/proposals/${proposalId}/execute`, 'POST', {
      executedBy: 'player',
      includeWorld: false,
    }, 60_000)
    assert.equal(executed.status, 200, `execute proposal failed: ${JSON.stringify(executed.data)}`)
    const executedPayload = readObject(executed.data)
    assert.equal(executedPayload.ok, true)
    const receipt = readObject(executedPayload.receipt)
    assert.equal(receipt.ok, true)
    assert.equal(receipt.worldAction, 'setRecruitSelectedPool')

    const subjectAfterExecute = await requestJson(
      baseUrl,
      '/api/ai/players/ai_execution_receipt_actor/subject?governorPlayerId=player',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(subjectAfterExecute.status, 200, `subject after execution failed: ${JSON.stringify(subjectAfterExecute.data)}`)
    const executedSubject = readObject(readObject(subjectAfterExecute.data).subject)
    const executedRecentBodyChanges = readObject(executedSubject.recentBodyChanges)
    assert.equal(executedRecentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
    const executedBodyChangeItems = readArray(executedRecentBodyChanges.items).map((item) => readObject(item))
    const executedRecruitPoolBodyChange = executedBodyChangeItems.find((item) => (
      item.action === 'recruit_pool_select' &&
      item.status === 'completed' &&
      item.proposalId === proposalId
    ))
    assert.ok(executedRecruitPoolBodyChange, 'executed recruit_pool_select receipt must become a subject body change')
    assert.equal(executedRecruitPoolBodyChange.bodyNode, 'generals_and_troops')
    assert.equal(executedRecruitPoolBodyChange.poolId, 'pool_season')
    assert.equal(executedRecruitPoolBodyChange.governanceApprovedBeforeExecution, true)
    assert.equal(executedRecruitPoolBodyChange.governanceApprovedBy, 'player')
    assert.equal(typeof executedRecruitPoolBodyChange.governanceApprovedAt, 'string')
    assert.equal(executedRecruitPoolBodyChange.nextSubjectFocus, 'troops')
    assert.equal(executedRecruitPoolBodyChange.visibleToAi, true)

    const executedRecentHistoryAnchors = readObject(executedSubject.recentHistoryAnchors)
    assert.equal(executedRecentHistoryAnchors.contractId, 'ai_player_subject_history_anchors_v1')
    const executedHistoryAnchorItems = readArray(executedRecentHistoryAnchors.items).map((item) => readObject(item))
    const executedRecruitPoolHistoryAnchor = executedHistoryAnchorItems.find((item) => (
      item.action === 'recruit_pool_select' &&
      item.status === 'completed' &&
      item.bodyNode === 'generals_and_troops' &&
      item.proposalId === proposalId
    ))
    assert.ok(executedRecruitPoolHistoryAnchor, 'executed recruit_pool_select body change must be linked to subject history')
    assert.equal(executedRecruitPoolHistoryAnchor.nextSubjectFocus, 'troops')
    assert.equal(executedRecruitPoolHistoryAnchor.executionReceiptAvailable, true)
    assert.equal(executedRecruitPoolHistoryAnchor.executionWorldAction, 'setRecruitSelectedPool')
    assert.equal(typeof executedRecruitPoolHistoryAnchor.executionActionRequestId, 'string')
    assert.equal(executedRecruitPoolHistoryAnchor.executionWorldReceiptAvailable, false)

    const events = await requestJson(baseUrl, '/api/events?limit=40', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const eventItems = readArray(readObject(events.data).items ?? readObject(events.data).events).map((item) => readObject(item))
    const executionEvent = eventItems.find((item) => item.action === 'ai_player_execute_proposal' && item.success === true)
    assert.ok(executionEvent, 'runtime events should include successful ai_player_execute_proposal')
    const metadata = readObject(readObject(executionEvent).metadata)
    assert.equal(metadata.playerHistoryCategory, 'ai_activity')
    assert.equal(metadata.playerHistoryTitle, 'AI 行动已完成')
    assert.equal(metadata.playerHistoryActorName, '军师 AI')
    assert.equal(metadata.playerHistoryLocation, 'AI 活动')
    assert.equal(metadata.playerHistoryTarget, '切换招募卡池')
    assert.equal(metadata.playerHistoryResultLabel, '已执行')
    assert.equal(metadata.playerHistoryNextAction, '查看 AI 活动')
    assert.equal(metadata.playerHistorySeverity, 'medium')
    assert.equal(metadata.playerHistoryScope, 'private_ai')
    assert.equal(metadata.playerHistoryFactionId, 'player')
    assert.equal(metadata.playerHistorySharePolicy, 'not_shareable_private')
    assert.equal(metadata.playerHistoryShareStateLabel, '暂不可分享')
    assert.equal(metadata.playerHistoryReceiptState, 'success')
    assert.equal(typeof metadata.playerHistoryDedupeKey, 'string')
    assert.match(String(metadata.playerHistoryDedupeKey), /^ai-activity:proposal-executed:/)

    const history = await requestJsonWithBearer(baseUrl, '/api/player-history?limit=20&eventLimit=40&civilMemoryLimit=5', sessionToken)
    assert.equal(history.status, 200, `player-history route failed: ${JSON.stringify(history.data)}`)
    const timeline = readObject(readObject(history.data).timeline)
    const cards = readArray(timeline.cards).map((item) => readObject(item))
    const aiCard = cards.find((card) => card.category === 'ai_activity' && card.title === 'AI 行动已完成')
    assert.ok(aiCard, 'player history should expose executed proposal receipt as a private AI activity card')
    assert.equal(aiCard.actorName, '军师 AI')
    assert.equal(aiCard.locationLabel, 'AI 活动')
    assert.equal(aiCard.targetLabel, '切换招募卡池')
    assert.equal(aiCard.resultLabel, '已执行')
    assert.equal(aiCard.nextActionLabel, '查看 AI 活动')
    assert.equal(aiCard.sharePolicy, undefined, 'private AI execution cards should not become shareable')
    assert.equal(aiCard.shareStateLabel, '暂不可分享')

    const visiblePayload = visibleCardText(aiCard)
    for (const required of ['AI 行动已完成', '军师 AI', 'AI 活动', '切换招募卡池', '查看 AI 活动']) {
      assert.ok(visiblePayload.includes(required), `AI execution visible copy should include ${required}`)
    }
    for (const forbidden of [
      'ai_player_execute_proposal',
      '/api/ai/players',
      'metadata',
      'proposalId',
      'worldAction',
      'worldActionPayload',
      'setRecruitSelectedPool',
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
      'receipt',
    ]) {
      assert.equal(visiblePayload.includes(forbidden), false, `AI execution visible copy leaked implementation term: ${forbidden}`)
    }

    const spectatorHistory = await requestJsonWithBearer(baseUrl, '/api/player-history?limit=20&eventLimit=40&civilMemoryLimit=5', spectatorToken)
    assert.equal(spectatorHistory.status, 200, `spectator player-history route failed: ${JSON.stringify(spectatorHistory.data)}`)
    const spectatorTimeline = readObject(readObject(spectatorHistory.data).timeline)
    const spectatorCards = readArray(spectatorTimeline.cards).map((item) => readObject(item))
    assert.equal(
      spectatorCards.some((card) => card.category === 'ai_activity' && card.title === 'AI 行动已完成'),
      false,
      'private executed proposal history should not be visible to another faction',
    )
    const spectatorAnchors = readArray(spectatorTimeline.historyNotificationAnchors).map((item) => readObject(item))
    assert.equal(
      spectatorAnchors.some((anchor) => anchor.accessState === 'private' && anchor.title === '有记录暂未开放'),
      true,
      'cross-faction viewer should receive private denied notification anchor',
    )
  } finally {
    await shutdownChild(child)
  }
}

runPlayerHistoryAiExecutionReceiptProducerContract().then(() => {
  console.log('[player_history_ai_execution_receipt_producer_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_ai_execution_receipt_producer_contract] failed:', error)
  process.exitCode = 1
})
