import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readUtf8 = (path: string) => readFileSync(path, 'utf-8')

const authority = readUtf8('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const aiGovernanceAuthority = readUtf8('docs/PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md')
const aiSocialAuthority = readUtf8('docs/PRODUCT_AUTHORITY_AI_SOCIAL_GOVERNANCE_CURRENT_2026_06_11.md')
const playerHistoryDomain = readUtf8('shared/domain/playerHistory.ts')
const assemblerContract = readUtf8('server/tests/player_history_read_model_assembler_contract.test.ts')
const executionTraceContract = readUtf8('server/tests/ai_player_execution_trace_contract.test.ts')
const planningProducerContract = readUtf8('server/tests/player_history_ai_activity_planning_producer_contract.test.ts')
const aiActivityUiContract = readUtf8('server/tests/godot_ai_activity_player_ui_governance_adapter_contract.test.ts')
const shellBadgeContract = readUtf8('server/tests/godot_shell_ai_activity_badge_contract.test.ts')
const voiceCommandContract = readUtf8('server/tests/ai_player_http_chat_voice_command_contract.test.ts')
const packageJson = readUtf8('package.json')

const contractId = 'player_history_ai_activity_producer_packet_contract'

for (const required of [
  contractId,
  'ai_activity_history_producer_packet',
  'AI Activity History Producer Packet Contract',
  'proposal_created',
  'approval_required_or_denied',
  'execution_started',
  'execution_succeeded',
  'execution_failed_or_recovered',
  'chat_reported',
  'voice_available_or_unavailable',
  'war_room_or_organization_ai',
  'dedupe',
  'scope_denied',
  'recovery',
  'playerHistoryCategory',
  'Planning history overlay producer exists as first real AI activity lane proof',
  '`npm.cmd run test:world:player-history-ai-activity-planning-producer-contract`',
]) {
  assert.ok(authority.includes(required), `missing AI activity producer authority proof: ${required}`)
}

assert.ok(
  packageJson.includes('"test:world:player-history-ai-activity-producer-packet-contract"'),
  'package.json must expose the AI activity producer packet contract command',
)
assert.ok(
  packageJson.includes('"test:world:player-history-ai-activity-planning-producer-contract"'),
  'package.json must expose the AI activity planning producer contract command',
)

for (const governanceToken of [
  'observation -> planner -> proposal or governed action -> policy and permission checks -> backend executor -> receipt/report -> Godot displays readable results',
  'The model/provider is never allowed to mutate world state directly',
  'Voice is input/output presentation',
  'Voice command transcripts must re-enter the existing chat/proposal/approval/receipt chain',
  'Do not show proposal ids, JSON, tool names, MCP, internal action ids, provider budget internals, or approve/execute/debug words to normal players.',
]) {
  assert.ok(aiGovernanceAuthority.includes(governanceToken), `AI governance authority should include ${governanceToken}`)
}

for (const socialToken of [
  'proposal lifecycle -> approval/policy/whitelist -> execution -> receipt/report -> chat/activity/war-room/player UI',
  'Proposal and receipt can be recorded into chat-visible history.',
  'execution trace',
  'voice output',
  'Forbidden player-visible leakage',
  'Old AI voice, UI backend, prompt, and handoff docs are evidence routes only.',
]) {
  assert.ok(aiSocialAuthority.includes(socialToken), `AI social authority should include ${socialToken}`)
}

for (const domainToken of [
  "|| value === 'ai_activity'",
  "if (entry.type === 'execution_outcome') return 'ai_activity'",
]) {
  assert.ok(playerHistoryDomain.includes(domainToken), `player history domain should expose AI activity mapping: ${domainToken}`)
}

for (const assemblerToken of [
  "playerHistoryCategory: 'ai_activity'",
  "action: 'ai_governed_action_receipt_internal'",
  "playerHistoryActorName: '军师 AI'",
  "playerHistoryTitle: 'AI 提案需要确认'",
  "card.category === 'ai_activity' && card.title === 'AI 提案需要确认' && card.severity === 'high'",
]) {
  assert.ok(assemblerContract.includes(assemblerToken), `assembler contract should prove ${assemblerToken}`)
}

for (const traceToken of [
  'FORBIDDEN_PLAYER_TRACE_KEYS',
  "'proposalId'",
  "'worldAction'",
  "'worldActionPayload'",
  "'plannerDecision'",
  `/api/ai/players/\${AI_PLAYER_ID}/execution-trace?limit=5`,
  "sourceKind, 'autonomous_development'",
  "phase, 'completed'",
  "visibility, 'player'",
]) {
  assert.ok(executionTraceContract.includes(traceToken), `execution trace contract should prove ${traceToken}`)
}

for (const planningToken of [
  "action: 'appendPlanningJobHistory'",
  "metadata.playerHistoryCategory, 'ai_activity'",
  "metadata.playerHistoryTitle, 'AI 行动已完成'",
  "metadata.playerHistoryActorName, '军师 AI'",
  "metadata.playerHistoryNextAction, '查看 AI 活动'",
  "card.category === 'ai_activity'",
  "'appendPlanningJobHistory'",
  "'worldActionPayload'",
  "'snake_case'",
]) {
  assert.ok(planningProducerContract.includes(planningToken), `AI activity planning producer contract should prove ${planningToken}`)
}

for (const uiToken of [
  'aiActivityPlayerUiGovernanceContractId',
  'aiActivityForbiddenVisibleCopyClear',
  'proposalId',
  'worldAction',
  'queuePlanExecution',
]) {
  assert.ok(aiActivityUiContract.includes(uiToken), `AI activity UI contract should prove ${uiToken}`)
}

for (const badgeToken of [
  'AI_ACTIVITY_STATUS_BADGE_CONTRACT := "ai_activity_status_badge_v1"',
  'playerRuntimeExecutionTraceItems',
  'AI_ACTIVITY_STATUS_BADGE_SOURCE_EXECUTION_TRACE',
  'world_shell_ai_activity_badge_fixture',
]) {
  assert.ok(shellBadgeContract.includes(badgeToken), `AI activity shell badge contract should prove ${badgeToken}`)
}

for (const voiceToken of [
  '/chat/voice-command',
  'createProposal: true',
  "proposal.status, 'pending_approval'",
  'assertNoRawVoicePayload',
  'worldActionPayload',
  'apiKey',
]) {
  assert.ok(voiceCommandContract.includes(voiceToken), `voice command contract should prove ${voiceToken}`)
}

const aiActivityProducerStates = [
  'proposal_created',
  'approval_required_or_denied',
  'execution_started',
  'execution_succeeded',
  'execution_failed_or_recovered',
  'chat_reported',
  'voice_available_or_unavailable',
  'war_room_or_organization_ai',
  'dedupe',
  'scope_denied',
  'recovery',
]
assert.equal(aiActivityProducerStates.length, 11)

const aiActivityProducerFixture = {
  contractId,
  category: 'ai_activity',
  playerHistoryTitle: 'AI 提案需要确认',
  playerHistoryActorName: '军师 AI',
  playerHistorySummary: '前线补给方案等待批准，暂不改变世界状态。',
  playerHistoryLocation: '虎牢前线',
  playerHistoryTarget: '补给线',
  playerHistoryResultLabel: '待确认',
  playerHistoryConsequence: '批准前不会执行，拒绝后会保留回报记录。',
  playerHistoryNextAction: '处理提案',
  playerHistorySeverity: 'high',
  outcomeState: 'approval_required_or_denied',
  sourceRefs: {
    aiActivityId: 'summary-only-ai-activity',
    chatThreadId: 'summary-only-chat-thread',
  },
  dedupeKey: 'ai-activity:advisor:frontline-supply:approval',
}

assert.equal(aiActivityProducerFixture.category, 'ai_activity')
assert.equal(aiActivityProducerFixture.outcomeState, 'approval_required_or_denied')
assert.ok(aiActivityProducerFixture.dedupeKey.startsWith('ai-activity:'))
assert.ok(aiActivityProducerFixture.sourceRefs.aiActivityId.length > 0)
assert.ok(aiActivityProducerFixture.sourceRefs.chatThreadId.length > 0)

const playerVisibleCopy = [
  aiActivityProducerFixture.playerHistoryTitle,
  aiActivityProducerFixture.playerHistoryActorName,
  aiActivityProducerFixture.playerHistorySummary,
  aiActivityProducerFixture.playerHistoryLocation,
  aiActivityProducerFixture.playerHistoryTarget,
  aiActivityProducerFixture.playerHistoryResultLabel,
  aiActivityProducerFixture.playerHistoryConsequence,
  aiActivityProducerFixture.playerHistoryNextAction,
  '语音暂未配置，可先查看文字回报。',
  '这条 AI 记录暂无权限查看。',
].join('\n')

for (const forbidden of [
  'provider',
  'planner',
  'trace',
  'proposalId',
  'worldAction',
  'worldActionPayload',
  'queuePlanExecution',
  'JSON',
  'MCP',
  'tool',
  'env',
  'key',
  'API-key',
  'MIMO_API_KEY',
  'stateKind',
  'regionId',
  'battleDigest',
  'voice backend',
  'ASR',
  'TTS',
  'route',
  'debug',
  'fixture',
  'gate',
  'contract',
  'read model',
  'snake_case',
]) {
  assert.equal(
    playerVisibleCopy.includes(forbidden),
    false,
    `AI activity producer visible copy leaked implementation term: ${forbidden}`,
  )
}

console.log('[player_history_ai_activity_producer_packet_contract] all checks passed')
