import { randomUUID } from 'node:crypto'
import type {
  AiPlayerActionProposal,
  AiPlayerActionReceipt,
  AiPlayerActionProposalRequest,
  AiPlayerProposalSource,
  AiPlayerActionType,
  AiPlayerRecoveryHint,
  AiPlayerBattleReportReadItem,
  AiPlayerDevelopmentPlan,
  AiPlayerDevelopmentPlanCandidateAction,
  GovernedAiPlayerRuntimeDetail,
} from '../../../../shared/contracts/aiPlayer'
import type {
  AiPlayerChatChannel,
  AiPlayerChatVoiceMetadata,
  AiPlayerChatHistoryCounts,
  AiPlayerChatHistoryFilter,
  AiPlayerChatMessage,
  AiPlayerChatPatrolAutonomyGuard,
  AiPlayerChatPatrolSchedulerRunItem,
  AiPlayerChatPatrolSchedulerRunRequest,
  AiPlayerChatPatrolSchedulerRunResponse,
  AiPlayerChatPatrolSchedulerQueueSummary,
  AiPlayerChatPatrolTickBattleReportSummary,
  AiPlayerChatPatrolTickDevelopmentSummary,
  AiPlayerChatPatrolTickProposalSummary,
  AiPlayerChatPatrolTickRequest,
  AiPlayerChatPatrolTickResponse,
  AiPlayerChatPatrolTickTriggerMode,
  AiPlayerChatReadCursor,
  AiPlayerChatReadCursorResponse,
  SendAiPlayerChatMessageRequest,
  SendAiPlayerChatMessageResponse,
  UpdateAiPlayerChatReadCursorRequest,
} from '../../../../shared/contracts/aiPlayerChat'
import type {
  AiPlayerAsrResult,
  AiPlayerAsrSummary,
  AiPlayerVoiceCommandRequest,
  AiPlayerVoiceUsageBreakdown,
} from '../../../../shared/contracts/aiPlayerVoice'
import type {
  UnifiedInboxClaimAction,
  UnifiedInboxItem,
} from '../../../../shared/contracts/inbox'
import { getWorldStateReadonly } from '../world/WorldService'
import {
  clearAiPlayerRuntimeModelFallbackReasonForOwner,
  recordAiPlayerRuntimeModelFallbackFailuresForOwner,
  recordAiPlayerRuntimeModelFallbackReasonForOwner,
  resolveAiPlayerRuntimeModelTargetCandidates,
} from './aiPlayerRuntimeModelTarget'
import {
  commitAiPlayerProviderBudgetReservation,
  releaseAiPlayerProviderAiCommandCreditReservation,
  releaseAiPlayerProviderBudgetReservation,
  recordAiPlayerProviderModelRequestAccounting,
  reserveAiPlayerProviderAiCommandCredits,
  reserveAiPlayerProviderBudget,
} from './aiPlayerProviderAccountStore'
import {
  parseAiPlayerRuntimeProposalJson,
  requestAiPlayerRuntimeProposalFromCandidateTargets,
  toAiPlayerActionProposalRequests,
} from './aiPlayerRuntimeProposalModel'
import {
  approveAiPlayerActionProposal,
  createAiPlayerActionProposal,
  executeAiPlayerActionProposal,
  getGovernedAiPlayerRuntime,
  listAiPlayerActionProposals,
  listGovernedAiPlayers,
  rejectAiPlayerActionProposal,
} from './AIPlayerGovernanceService'
import { buildAiPlayerBattleReportReadModel } from './aiPlayerBattleReportReadModel'
import { buildAiPlayerDevelopmentPlan } from './aiPlayerDevelopmentPlanReadModel'
import {
  ensureAiPlayerGovernanceLoaded,
  scheduleAiPlayerGovernancePersist,
} from './aiPlayerGovernancePersist'
import {
  chatMessagesByAiPlayer,
  chatReadCursors,
  cloneValue,
  MAX_PERSISTED_CHAT_MESSAGES_PER_PLAYER,
  nowIso,
} from './aiPlayerGovernanceState'
import { lightweightHeroPool } from '../../../../shared/domain/heroPool'
import { getAiPlayerVoiceProviderAdapter } from '../../voice/aiPlayerVoiceProviderAdapter'
import { ensureAiPlayerConfiguredVoiceProviderAdaptersRegistered } from '../../voice/aiPlayerConfiguredVoiceProviderAdapters'
import { decideAiPlayerSpeechOutputPolicy } from '../../voice/aiPlayerSpeechOutputPolicy'
import {
  buildAiPlayerVoiceAvailability,
  getActiveAiPlayerVoiceProfileSelection,
  resolveAiPlayerVoiceProfileForSynthesis,
} from '../../voice/aiPlayerVoiceProfileStore'

const DEFAULT_TRANSFER_AMOUNT = 11
const DEFAULT_PATROL_COOLDOWN_TICKS = 6
const DEFAULT_PATROL_SCHEDULER_LIMIT = 10
const PATROL_AUTONOMY_MIN_INTERVAL_MINUTES = 15
const PATROL_SCHEDULER_IDEMPOTENCY_CACHE_LIMIT = 128
const AI_SYSTEM_AUTHOR_ID = 'ai_chat_system'
const CHAT_SUMMARY_CHECKPOINT_INTERVAL = 20
const RECENT_CHAT_OBSERVATION_LIMIT = 10
const CHAT_OBSERVATION_BODY_LIMIT = 500
const COMBAT_DEFAULT_REPORT_MOCK_AUDIO_ENV = 'AI_PLAYER_COMBAT_DEFAULT_REPORT_VOICE_ALLOW_MOCK_AUDIO'

function shouldAllowCombatDefaultReportMockAudioFallback() {
  const value = process.env[COMBAT_DEFAULT_REPORT_MOCK_AUDIO_ENV]?.trim().toLowerCase()
  return value === '1' || value === 'true' || value === 'yes'
}

function mergeVoiceUsageBreakdown(input: {
  asr?: AiPlayerAsrSummary
  tts?: NonNullable<AiSpeechMetadataFields['speechContract']>
}): AiPlayerVoiceUsageBreakdown {
  return {
    ...(input.asr?.usage ? { asr: input.asr.usage } : {}),
    ...(input.tts?.usage ? { tts: input.tts.usage } : {}),
  }
}

async function resolveVoiceChatInput(
  input: SendAiPlayerChatMessageRequest,
): Promise<ResolvedVoiceChatInput> {
  const voice = input.voice
  if (voice?.mode === 'audio') {
    ensureAiPlayerConfiguredVoiceProviderAdaptersRegistered()
    const asrRequest = {
      audioAssetId: voice.audioAssetId,
      audioBase64: voice.audioBase64,
      contentType: voice.contentType,
      providerHint: voice.provider,
      transcriptHint: voice.transcriptHint,
    }
    const adapter = getAiPlayerVoiceProviderAdapter(voice.provider, 'asr')
    let asrResult: AiPlayerAsrResult
    try {
      asrResult = await adapter.transcribeAudio(asrRequest)
    } catch {
      asrResult = await getAiPlayerVoiceProviderAdapter('mock', 'asr').transcribeAudio(asrRequest)
    }
    return {
      body: asrResult.transcriptText,
      voice,
      asr: asrResult.asr,
      userMetadata: {
        source: 'voice_command_audio',
        usageType: 'asr',
        usageBreakdown: mergeVoiceUsageBreakdown({ asr: asrResult.asr }),
        asr: asrResult.asr,
      },
    }
  }

  if (voice?.mode === 'text') {
    const body = (voice.text ?? input.body ?? '').trim()
    return {
      body,
      voice,
      userMetadata: {
        source: 'voice_command_text',
      },
    }
  }

  return {
    body: (input.body ?? '').trim(),
  }
}

async function buildAiSpeechMetadataFields(
  runtime: GovernedAiPlayerRuntimeDetail,
  text: string,
  voiceContext: ResolvedVoiceChatInput,
): Promise<AiSpeechMetadataFields | undefined> {
  const activeVoiceSelection = getActiveAiPlayerVoiceProfileSelection(runtime.aiPlayerId).selection
  const decision = decideAiPlayerSpeechOutputPolicy({
    hasExplicitVoiceContext: Boolean(voiceContext.voice),
    playerText: voiceContext.body,
    aiReplyText: text,
    outputMode: activeVoiceSelection.autoSpeechMode,
  })
  if (!decision.shouldSynthesize) {
    return undefined
  }
  try {
    ensureAiPlayerConfiguredVoiceProviderAdaptersRegistered()
    const adapter = getAiPlayerVoiceProviderAdapter(voiceContext.voice?.provider, 'tts')
    const selectedVoiceProfileId = voiceContext.voice?.voiceProfileId
      ?? activeVoiceSelection.voiceProfileId
    const voiceProfile = resolveAiPlayerVoiceProfileForSynthesis(selectedVoiceProfileId)
    const result = await adapter.synthesizeSpeech({
      aiPlayerId: runtime.aiPlayerId,
      text,
      voiceProfileId: voiceProfile.publicProfile.voiceProfileId,
      providerHint: voiceContext.voice?.provider,
      providerVoice: voiceProfile.adapterProfile.providerVoice,
      stylePrompt: voiceProfile.adapterProfile.stylePrompt,
    })
    return {
      speechSource: 'ai_player_speech_output',
      speechPolicyReason: decision.reason,
      usageType: 'tts',
      usageBreakdown: mergeVoiceUsageBreakdown({
        asr: voiceContext.asr,
        tts: result.speechContract,
      }),
      speechContract: result.speechContract,
    }
  } catch {
    return undefined
  }
}

type ResolvedChatProposal = {
  action: AiPlayerActionType
  args: Record<string, unknown>
  reason: string
  summary: string
  source: AiPlayerProposalSource
  metadata?: Record<string, unknown>
}

type ResolvedChatIdleMessage = {
  idle: true
  summary: string
  metadata?: Record<string, unknown>
}

type ResolvedVoiceChatInput = {
  body: string
  voice?: AiPlayerVoiceCommandRequest
  userMetadata?: AiPlayerChatVoiceMetadata
  asr?: AiPlayerAsrSummary
}

type AiSpeechMetadataFields = {
  speechSource: 'ai_player_speech_output'
  speechPolicyReason: ReturnType<typeof decideAiPlayerSpeechOutputPolicy>['reason']
  usageType: 'tts'
  usageBreakdown: AiPlayerVoiceUsageBreakdown
  speechContract: NonNullable<AiPlayerChatVoiceMetadata['speechContract']>
}

type AiPlayerAutonomousCombatDefaultEventChatSource =
  | 'autonomous_combat_daily_summary_report'
  | 'autonomous_combat_siege_report'
  | 'autonomous_combat_incoming_attack_report'
  | 'autonomous_combat_defense_outcome_report'
  | 'autonomous_combat_war_room_report'

type AiPlayerChatSummaryCheckpoint = {
  checkpointId: string
  aiPlayerId: string
  method: 'deterministic_backend_checkpoint_v1'
  sourceMessageCount: number
  sourceFirstMessageId: string
  sourceLastMessageId: string
  sourceOrdinalStart: number
  sourceOrdinalEnd: number
  summary: string
}

type AiPlayerRecentChatObservationItem = {
  messageId: string
  kind: AiPlayerChatMessage['kind']
  authorType: AiPlayerChatMessage['authorType']
  authorName: string
  body: string
  createdAt: string
}

type AiPlayerMessageAddressing = {
  value: string
  source: 'identity_context' | 'neutral_fallback'
}

type ProactivePatrolMessageReason =
  | 'battle_high_loss'
  | 'battle_victory'
  | 'action_ready_for_approval'
  | 'human_input_needed'
  | 'patrol_heartbeat'

type ProactivePatrolMessageIntent = {
  proactiveReason: ProactivePatrolMessageReason
  severity: 'low' | 'medium' | 'high'
  cooldownMinutes: number
  relatedReportId?: string
  suggestedAction?: AiPlayerActionType
  blockers?: string[]
}

type ProactivePatrolTriggerCondition = {
  policyVersion: 'patrol_proactive_trigger_v1'
  reason: ProactivePatrolMessageReason
  source: 'battle_report' | 'development_plan' | 'patrol_heartbeat'
  cooldownMinutes: number
  requiresHumanApproval: true
  noAutonomousExecution: true
}

type PatrolModelProposalOutcome = {
  proposal?: AiPlayerActionProposal
  proposalMessage?: AiPlayerChatMessage
  downgradeMessage?: AiPlayerChatMessage
  error?: string
  skippedReason?: string
}

type ResourceKey = 'food' | 'wood' | 'stone' | 'iron' | 'copper'

type PatrolCooldownSnapshot = {
  cooldownUntilTick: number
  messageId: string
  source: string
}

type AiPlayerChatPatrolSchedulerOptions = AiPlayerChatPatrolSchedulerRunRequest & {
  intervalMs?: number
}

type PatrolSchedulerShard = {
  shardIndex: number
  shardCount: number
}

let patrolSchedulerTimer: ReturnType<typeof setInterval> | null = null
const patrolSchedulerIdempotencyCache = new Map<string, AiPlayerChatPatrolSchedulerRunResponse>()
const patrolSchedulerInFlightRuns = new Map<string, {
  promise: Promise<AiPlayerChatPatrolSchedulerRunResponse>
  leaseExpiresAtMs: number | null
}>()

function formatAiActionForPlayer(action: string | null | undefined): string {
  switch (action) {
    case 'resource_transfer_to_governor':
      return '输送资源给总督'
    case 'resource_gather':
      return '采集资源到 AI 子账户'
    case 'troop_heal':
      return '补兵整备'
    case 'tile_occupy':
      return '占领目标地块'
    case 'march_move':
      return '行军到目标地'
    case 'alliance_defense_assign':
      return '安排同盟驻防'
    case 'alliance_defense_batch_assign':
      return '安排多队同盟驻防'
    case 'city_siege':
      return '攻城压制'
    case 'rally_launch':
      return '发起同盟集结'
    case 'rally_join':
      return '加入同盟集结'
    case 'tactical_skill_upgrade':
      return '升级战法'
    case 'hero_star_upgrade':
      return '武将升星'
    case 'building_upgrade':
      return '升级建筑'
    case 'reward_claim':
      return '领取奖励'
    case 'recruit_pool_select':
      return '切换招募卡池'
    default:
      return action?.trim() || '未标记动作'
  }
}

function formatWorldActionForPlayer(worldAction: string | null | undefined, fallbackAction: string): string {
  switch (worldAction) {
    case 'transferFactionResourcesToGovernor':
      return '资源输送到总督通用收件箱'
    case 'claimGovernorResourceInbox':
      return '领取 AI 输送资源'
    case 'claimReward':
      return '领取通用奖励'
    case 'issueClaimableReward':
      return '发放可领取奖励'
    case 'healTroop':
      return '补兵整备'
    case 'occupyTile':
      return '占领目标地块'
    case 'moveUnit':
      return '行军到目标地'
    case 'gatherAiResourceTile':
      return '采集资源到 AI 子账户'
    case 'queuePlanExecution':
      return formatAiActionForPlayer(fallbackAction)
    default:
      return worldAction?.trim() || formatAiActionForPlayer(fallbackAction)
  }
}

function formatFailureCodeForPlayer(failureCode: string | null | undefined): string {
  switch (failureCode) {
    case 'insufficient_resources':
    case 'insufficient_ai_resources':
      return 'AI 子账户资源不足'
    case 'transfer_cooldown_active':
      return '资源输送冷却中'
    case 'daily_quota_exceeded':
      return '今日输送额度已耗尽'
    case 'approval_required':
    case 'proposal_not_approved':
      return '需要先批准提案'
    case 'proposal_not_found':
      return '提案不存在或已过期'
    case 'ai_player_not_found':
      return 'AI 玩家不存在'
    case 'ai_player_disabled':
      return 'AI 玩家已停用'
    case 'ai_player_paused':
      return 'AI 玩家已暂停'
    case 'proposal_execution_failed':
      return '后端执行失败'
    case 'main_map_cell_immunity_active':
      return '免战保护中，暂不能占领'
    default:
      return failureCode?.trim() || ''
  }
}

function resolveNaturalLanguageProposalDecision(body: string): 'approve' | 'reject' | null {
  const normalized = body.trim()
  if (!normalized) {
    return null
  }
  if (/(驳回|拒绝|否决|不同意|不要执行|别执行|拦下|取消)/.test(normalized)) {
    return 'reject'
  }
  if (/(批准|同意|准了|可以执行|按这个办|照这个办|执行这个方案)/.test(normalized)) {
    return 'approve'
  }
  return null
}

function resolveLatestPendingProposalForChatDecision(runtime: GovernedAiPlayerRuntimeDetail): AiPlayerActionProposal | null {
  return listAiPlayerActionProposals({
    aiPlayerId: runtime.aiPlayerId,
    status: 'pending_approval',
    limit: 1,
  })[0] ?? null
}

function syncProposalChatMessagesAfterDecision(proposal: AiPlayerActionProposal): void {
  const bucket = readMessageBucket(proposal.aiPlayerId)
  const statusLabel = proposal.status === 'approved'
    ? '已批准'
    : proposal.status === 'rejected'
      ? '已驳回'
      : proposal.status === 'pending_approval'
        ? '待批准'
        : proposal.status
  let changed = false
  for (const message of bucket) {
    if (message.kind !== 'proposal' || message.proposalId !== proposal.proposalId) {
      continue
    }
    const decisionSuffix = proposal.status === 'approved'
      ? '我等执行后再回报。'
      : proposal.status === 'rejected'
        ? '我不会执行这件事。'
        : proposal.reason
    message.body = `已生成提案：${formatAiActionForPlayer(proposal.action)}（${statusLabel}）。${decisionSuffix}`
    message.metadata = {
      ...(message.metadata ?? {}),
      status: proposal.status,
      requiresApproval: proposal.requiresApproval,
      source: proposal.source,
      riskLevel: proposal.riskLevel,
      recoveryHint: proposal.recoveryHint,
    }
    changed = true
  }
  if (changed) {
    scheduleAiPlayerGovernancePersist()
  }
}

function isProviderBudgetDowngradeError(error: string | null | undefined): error is 'provider_budget_disabled' | 'provider_budget_exhausted' {
  return error === 'provider_budget_disabled' || error === 'provider_budget_exhausted'
}

function buildProviderBudgetDowngradeMessage(error: 'provider_budget_disabled' | 'provider_budget_exhausted'): string {
  if (error === 'provider_budget_disabled') {
    return '当前 AI 模型额度已关闭，我先进入低活跃模式；这次不调用模型，也不会自动生成或执行提案。'
  }
  return '当前 AI 模型 token 额度不足，我先进入低活跃模式；这次不调用模型，也不会自动生成或执行提案。'
}

function buildModelFailureDowngradeMessage(error: string): string {
  if (error === 'model_response_missing_content') {
    return '模型这次没有返回内容，我已停止创建提案；本次不会执行任何动作，后端审批与 authority 裁决保持生效。'
  }
  if (error === 'model_proposal_empty') {
    return '模型这次没有给出合规提案，我已停止创建提案；本次不会执行任何动作，后端审批与 authority 裁决保持生效。'
  }
  if (error.startsWith('model_response_invalid_json_proposal')) {
    return '模型这次没有返回严格 JSON 合规提案，我已停止创建提案；本次不会执行任何动作，后端审批与 authority 裁决保持生效。'
  }
  return `模型提案失败：${error}。我已停止创建提案；本次不会执行任何动作，后端审批与 authority 裁决保持生效。`
}

function buildModelFailureRecoveryHint(error: string): AiPlayerRecoveryHint {
  if (error.startsWith('model_response_invalid_json_proposal')) {
    return {
      summary: '模型返回不是严格 JSON 合规提案，后端已拒绝创建提案。可以重试，或检查当前模型的 JSON 输出质量。',
      recommendedCommand: '重试这条指令，或检查模型接入是否能稳定输出严格 JSON。',
      focus: 'retry',
    }
  }
  if (error === 'model_response_missing_content') {
    return {
      summary: '模型没有返回内容，后端已停止创建提案。可以稍后重试，或检查模型接口是否稳定。',
      recommendedCommand: '稍后重试，或检查模型接口是否返回 chat message content。',
      focus: 'retry',
    }
  }
  if (error === 'model_proposal_empty') {
    return {
      summary: '模型没有给出合规提案，后端已停止创建提案。可以换更明确的目标后重试。',
      recommendedCommand: '补充目标、资源或动作要求后重试。',
      focus: 'retry',
    }
  }
  return {
    summary: `模型提案失败：${error}。后端已停止创建提案，可以稍后重试或检查模型接入。`,
    recommendedCommand: '稍后重试，或检查当前模型接入配置。',
    focus: 'retry',
  }
}

function appendProviderBudgetDowngradeChatMessage(input: {
  runtime: GovernedAiPlayerRuntimeDetail
  error: 'provider_budget_disabled' | 'provider_budget_exhausted'
  source: 'chat_provider_budget_downgrade' | 'patrol_provider_budget_downgrade'
  trigger?: string
  triggeredBy?: string
}): AiPlayerChatMessage {
  return appendAiPlayerChatMessage({
    aiPlayerId: input.runtime.aiPlayerId,
    channelId: `ai:${input.runtime.aiPlayerId}`,
    kind: 'message',
    authorType: 'ai',
    authorId: input.runtime.aiPlayerId,
    authorName: input.runtime.displayName,
    body: buildProviderBudgetDowngradeMessage(input.error),
    failureCode: input.error,
    metadata: {
      source: input.source,
      trigger: input.trigger,
      triggeredBy: input.triggeredBy?.trim() || undefined,
      budgetError: input.error,
      modelDowngrade: true,
      authorityPreserved: true,
    },
  })
}

function appendModelFailureDowngradeChatMessage(input: {
  runtime: GovernedAiPlayerRuntimeDetail
  error: string
  source: 'chat_model_failure_downgrade' | 'patrol_model_failure_downgrade'
  trigger?: string
  triggeredBy?: string
}): AiPlayerChatMessage {
  return appendAiPlayerChatMessage({
    aiPlayerId: input.runtime.aiPlayerId,
    channelId: `ai:${input.runtime.aiPlayerId}`,
    kind: 'message',
    authorType: 'ai',
    authorId: input.runtime.aiPlayerId,
    authorName: input.runtime.displayName,
    body: buildModelFailureDowngradeMessage(input.error),
    failureCode: input.error,
    metadata: {
      source: input.source,
      trigger: input.trigger,
      triggeredBy: input.triggeredBy?.trim() || undefined,
      modelError: input.error,
      modelDowngrade: true,
      recoveryHint: buildModelFailureRecoveryHint(input.error),
      authorityPreserved: true,
    },
  })
}

function buildChannel(runtime: GovernedAiPlayerRuntimeDetail, messageCount: number): AiPlayerChatChannel {
  return {
    channelId: `ai:${runtime.aiPlayerId}`,
    aiPlayerId: runtime.aiPlayerId,
    label: runtime.displayName,
    avatarId: runtime.avatarId,
    avatarImagePath: runtime.avatarImagePath,
    governorPlayerId: runtime.governorPlayerId,
    factionId: runtime.factionId,
    messageCount,
  }
}

function readMessageBucket(aiPlayerId: string): AiPlayerChatMessage[] {
  ensureAiPlayerGovernanceLoaded()
  return chatMessagesByAiPlayer.get(aiPlayerId) ?? []
}

function buildAiAuthor(runtime: GovernedAiPlayerRuntimeDetail) {
  return {
    authorType: 'ai' as const,
    authorId: runtime.aiPlayerId,
    authorName: runtime.displayName,
  }
}

function messageMatchesHistoryFilter(message: AiPlayerChatMessage, filter: AiPlayerChatHistoryFilter): boolean {
  switch (filter) {
    case 'command':
      return message.kind === 'message' && message.authorType === 'governor'
    case 'proposal':
      return message.kind === 'proposal'
    case 'receipt':
      return message.kind === 'receipt'
    case 'failure':
      return Boolean(message.failureCode)
        || (message.kind === 'receipt' && message.receiptOk === false)
        || (message.kind === 'proposal' && String(message.metadata?.status ?? '') === 'failed')
    case 'all':
    default:
      return true
  }
}

function buildHistoryCounts(bucket: AiPlayerChatMessage[]): AiPlayerChatHistoryCounts {
  return {
    all: bucket.length,
    command: bucket.filter((message) => messageMatchesHistoryFilter(message, 'command')).length,
    proposal: bucket.filter((message) => messageMatchesHistoryFilter(message, 'proposal')).length,
    receipt: bucket.filter((message) => messageMatchesHistoryFilter(message, 'receipt')).length,
    failure: bucket.filter((message) => messageMatchesHistoryFilter(message, 'failure')).length,
  }
}

function clipChatObservationBody(body: string): string {
  if (body.length <= CHAT_OBSERVATION_BODY_LIMIT) {
    return body
  }
  return `${body.slice(0, CHAT_OBSERVATION_BODY_LIMIT)}...`
}

function normalizeAddressingValue(value: string): string {
  return value
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .slice(0, 24)
}

function resolveAiPlayerMessageAddressing(runtime: GovernedAiPlayerRuntimeDetail): AiPlayerMessageAddressing {
  const identityDocuments = runtime.contextDocuments.filter((document) => document.kind === 'identity')
  const patterns = [
    /玩家称呼\s*[:：]\s*([^\n。；;，,]+)/u,
    /称呼玩家\s*[:：]\s*([^\n。；;，,]+)/u,
    /称呼总督\s*[:：]\s*([^\n。；;，,]+)/u,
    /对玩家称呼\s*[:：]\s*([^\n。；;，,]+)/u,
  ]
  for (const document of identityDocuments) {
    for (const pattern of patterns) {
      const match = pattern.exec(document.content)
      const value = match?.[1] ? normalizeAddressingValue(match[1]) : ''
      if (value) {
        return {
          value,
          source: 'identity_context',
        }
      }
    }
  }
  return {
    value: '总督',
    source: 'neutral_fallback',
  }
}

function buildRecentChatObservation(bucket: AiPlayerChatMessage[]): AiPlayerRecentChatObservationItem[] {
  return bucket.slice(-RECENT_CHAT_OBSERVATION_LIMIT).map((message) => ({
    messageId: message.messageId,
    kind: message.kind,
    authorType: message.authorType,
    authorName: message.authorName,
    body: clipChatObservationBody(message.body),
    createdAt: message.createdAt,
  }))
}

function buildLatestChatSummaryCheckpoint(
  aiPlayerId: string,
  bucket: AiPlayerChatMessage[],
): AiPlayerChatSummaryCheckpoint | null {
  const completedMessageCount = Math.floor(bucket.length / CHAT_SUMMARY_CHECKPOINT_INTERVAL)
    * CHAT_SUMMARY_CHECKPOINT_INTERVAL
  if (completedMessageCount < CHAT_SUMMARY_CHECKPOINT_INTERVAL) {
    return null
  }

  const sourceStartIndex = completedMessageCount - CHAT_SUMMARY_CHECKPOINT_INTERVAL
  const sourceMessages = bucket.slice(sourceStartIndex, completedMessageCount)
  const firstMessage = sourceMessages[0]
  const lastMessage = sourceMessages.at(-1)
  if (!firstMessage || !lastMessage) {
    return null
  }

  const commandCount = sourceMessages.filter((message) => messageMatchesHistoryFilter(message, 'command')).length
  const proposalCount = sourceMessages.filter((message) => messageMatchesHistoryFilter(message, 'proposal')).length
  const receiptCount = sourceMessages.filter((message) => messageMatchesHistoryFilter(message, 'receipt')).length
  const failureCount = sourceMessages.filter((message) => messageMatchesHistoryFilter(message, 'failure')).length
  const latestExcerpts = sourceMessages.slice(-3).map((message) => {
    const author = message.authorType === 'governor' ? 'governor' : message.authorType
    return `${author}: ${clipChatObservationBody(message.body)}`
  })

  return {
    checkpointId: `chat_summary_${aiPlayerId}_${completedMessageCount}`,
    aiPlayerId,
    method: 'deterministic_backend_checkpoint_v1',
    sourceMessageCount: sourceMessages.length,
    sourceFirstMessageId: firstMessage.messageId,
    sourceLastMessageId: lastMessage.messageId,
    sourceOrdinalStart: sourceStartIndex + 1,
    sourceOrdinalEnd: completedMessageCount,
    summary: [
      `Chat checkpoint covering messages ${sourceStartIndex + 1}-${completedMessageCount}.`,
      `Counts: command=${commandCount}, proposal=${proposalCount}, receipt=${receiptCount}, failure=${failureCount}.`,
      `Latest raw excerpts: ${latestExcerpts.join(' | ')}`,
    ].join(' '),
  }
}

function buildReadCursorKey(aiPlayerId: string, readerId: string): string {
  return `${aiPlayerId}:${readerId}`
}

function buildReadCursor(
  runtime: GovernedAiPlayerRuntimeDetail,
  readerId: string,
  readMessageCount: number,
  updatedAt?: string,
): AiPlayerChatReadCursor {
  const bucket = readMessageBucket(runtime.aiPlayerId)
  const normalizedReadCount = Math.max(0, Math.min(bucket.length, Math.floor(readMessageCount)))
  return {
    aiPlayerId: runtime.aiPlayerId,
    channelId: `ai:${runtime.aiPlayerId}`,
    readerId,
    readMessageCount: normalizedReadCount,
    messageCount: bucket.length,
    unreadCount: Math.max(0, bucket.length - normalizedReadCount),
    updatedAt: updatedAt ?? nowIso(),
  }
}

function resolveStoredReadCursor(runtime: GovernedAiPlayerRuntimeDetail, readerId?: string): AiPlayerChatReadCursor | undefined {
  const normalizedReaderId = readerId?.trim()
  if (!normalizedReaderId) {
    return undefined
  }
  const stored = chatReadCursors.get(buildReadCursorKey(runtime.aiPlayerId, normalizedReaderId))
  if (!stored) {
    return buildReadCursor(runtime, normalizedReaderId, 0)
  }
  return buildReadCursor(runtime, normalizedReaderId, stored.readMessageCount, stored.updatedAt)
}

function appendAiPlayerChatMessage(input: Omit<AiPlayerChatMessage, 'messageId' | 'createdAt'>): AiPlayerChatMessage {
  ensureAiPlayerGovernanceLoaded()
  const message: AiPlayerChatMessage = {
    ...input,
    messageId: `chat_${randomUUID()}`,
    createdAt: nowIso(),
  }
  const bucket = chatMessagesByAiPlayer.get(input.aiPlayerId) ?? []
  bucket.push(cloneValue(message))
  if (bucket.length > MAX_PERSISTED_CHAT_MESSAGES_PER_PLAYER) {
    bucket.splice(0, bucket.length - MAX_PERSISTED_CHAT_MESSAGES_PER_PLAYER)
  }
  chatMessagesByAiPlayer.set(input.aiPlayerId, bucket)
  scheduleAiPlayerGovernancePersist()
  return cloneValue(message)
}

function hasSuccessfulReceipt(bucket: AiPlayerChatMessage[], action: AiPlayerActionType): boolean {
  return bucket.some((message) => message.kind === 'receipt'
    && message.action === action
    && message.receiptOk === true
    && String(message.metadata?.aggregateKind ?? '') !== 'battle_report_followup'
    && String(message.metadata?.aggregateKind ?? '') !== 'march_move_executed')
}

function recordBattleReportFollowupAggregateIfReady(proposal: AiPlayerActionProposal): AiPlayerChatMessage | null {
  if (proposal.action !== 'march_move' || proposal.status !== 'pending_approval') {
    return null
  }
  const runtime = getGovernedAiPlayerRuntime(proposal.aiPlayerId)
  if (!runtime) {
    return null
  }
  const bucket = readMessageBucket(runtime.aiPlayerId)
  const hasHealReceipt = hasSuccessfulReceipt(bucket, 'troop_heal')
  const hasOccupyReceipt = hasSuccessfulReceipt(bucket, 'tile_occupy')
  if (!hasHealReceipt || !hasOccupyReceipt) {
    return null
  }
  const duplicate = bucket.some((message) => String(message.metadata?.aggregateKind ?? '') === 'battle_report_followup'
    && String(message.metadata?.marchProposalId ?? '') === proposal.proposalId)
  if (duplicate) {
    return null
  }
  return appendAiPlayerChatMessage({
    aiPlayerId: runtime.aiPlayerId,
    channelId: `ai:${runtime.aiPlayerId}`,
    kind: 'receipt',
    ...buildAiAuthor(runtime),
    body: '已补兵、已占地，下一步行军待批准。',
    receiptProposalId: proposal.proposalId,
    action: 'march_move',
    receiptOk: true,
    metadata: {
      aggregateKind: 'battle_report_followup',
      steps: ['battle_report_read', 'troop_heal', 'tile_occupy', 'march_move'],
      marchProposalId: proposal.proposalId,
      proposalStatus: proposal.status,
    },
  })
}

function recordMarchMoveExecutedAggregateIfReady(receipt: AiPlayerActionReceipt): AiPlayerChatMessage | null {
  if (!receipt.ok || receipt.action !== 'march_move') {
    return null
  }
  if (receipt.worldAction && receipt.worldAction !== 'moveUnit') {
    return null
  }
  const runtime = getGovernedAiPlayerRuntime(receipt.aiPlayerId)
  if (!runtime) {
    return null
  }
  const bucket = readMessageBucket(runtime.aiPlayerId)
  const duplicate = bucket.some((message) => String(message.metadata?.aggregateKind ?? '') === 'march_move_executed'
    && String(message.metadata?.marchProposalId ?? '') === receipt.proposalId)
  if (duplicate) {
    return null
  }
  return appendAiPlayerChatMessage({
    aiPlayerId: runtime.aiPlayerId,
    channelId: `ai:${runtime.aiPlayerId}`,
    kind: 'receipt',
    ...buildAiAuthor(runtime),
    body: '已行军到目标地。',
    receiptProposalId: receipt.proposalId,
    action: 'march_move',
    receiptOk: true,
    metadata: {
      aggregateKind: 'march_move_executed',
      steps: ['march_move'],
      marchProposalId: receipt.proposalId,
      worldAction: receipt.worldAction,
    },
  })
}

function formatResources(resources: Record<string, unknown>): string {
  const labels: Record<ResourceKey, string> = {
    food: '粮草',
    wood: '木材',
    stone: '石料',
    iron: '铁矿',
    copper: '铜钱',
  }
  return (Object.keys(labels) as ResourceKey[])
    .map((key) => {
      const amount = Number(resources[key] ?? 0)
      return amount > 0 ? `${labels[key]} ${amount}` : ''
    })
    .filter(Boolean)
    .join('、')
}

function formatReward(reward: Record<string, unknown>): string {
  const food = Number(reward.food ?? 0)
  const actionPoints = Number(reward.ap ?? 0)
  return [
    food > 0 ? `粮草 ${food}` : '',
    actionPoints > 0 ? `行动点 ${actionPoints}` : '',
  ].filter(Boolean).join('、') || '奖励'
}

function formatInboxItemPayloadForPlayer(item: UnifiedInboxItem): string {
  if (item.kind === 'ai_resource_transfer') {
    return `资源已到账：${formatResources((item.resources ?? {}) as Record<string, unknown>)}`
  }
  return `奖励已到账：${formatReward((item.reward ?? {}) as Record<string, unknown>)}`
}

function readFailureCodeFromUnknown(result: unknown, fallback?: string): string {
  if (result && typeof result === 'object' && 'failureCode' in result) {
    const failureCode = String((result as { failureCode?: unknown }).failureCode ?? '').trim()
    if (failureCode) {
      return failureCode
    }
  }
  return fallback?.trim() ?? ''
}

function resolveRequestedResource(body: string): ResourceKey {
  const normalized = body.toLowerCase()
  if (normalized.includes('粮') || normalized.includes('food')) {
    return 'food'
  }
  if (normalized.includes('石') || normalized.includes('stone')) {
    return 'stone'
  }
  if (normalized.includes('铁') || normalized.includes('iron')) {
    return 'iron'
  }
  if (normalized.includes('铜') || normalized.includes('copper')) {
    return 'copper'
  }
  return 'wood'
}

function parseRequestedAmount(body: string): number | null {
  const matched = body.match(/\d+/)
  if (!matched) {
    return null
  }
  const amount = Number(matched[0])
  return Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : null
}

function shouldCreateResourceTransferProposal(body: string): boolean {
  const normalized = body.toLowerCase()
  return [
    '输送',
    '转',
    '交',
    '给我',
    '总督',
    '资源',
    '木材',
    '粮',
    '石',
    '铁',
    '铜',
    'transfer',
    'resource',
    'wood',
    'food',
    'stone',
    'iron',
    'copper',
  ].some((keyword) => normalized.includes(keyword))
}

function normalizeHeroAuthorityIdForChat(heroId: string): string {
  const trimmed = heroId.trim()
  return trimmed.startsWith('hero_') ? trimmed.slice('hero_'.length) : trimmed
}

function commandIncludesAny(body: string, keywords: readonly string[]): boolean {
  const normalized = body.toLowerCase()
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
}

function hasUpgradeIntent(body: string): boolean {
  return commandIncludesAny(body, ['升', '升级', '提升', 'upgrade', 'level'])
}

function resolveAssignedHeroTargetForChat(
  runtime: GovernedAiPlayerRuntimeDetail,
  body: string,
) {
  const world = getWorldStateReadonly()
  const faction = world.factions[runtime.factionId]
  const assignedUnitIds = new Set(
    faction?.aiPlayers?.find((candidate) => candidate.id === runtime.aiPlayerId)?.unitIds ?? [],
  )
  const assignedUnits = world.units.filter((unit) =>
    unit.faction === runtime.factionId && assignedUnitIds.has(unit.id),
  )
  const factionUnits = world.units.filter((unit) => unit.faction === runtime.factionId)
  const mentionedFactionUnit = factionUnits.find((unit) => {
    const heroId = normalizeHeroAuthorityIdForChat(unit.hero.id)
    return body.includes(unit.hero.name) || body.includes(unit.hero.id) || body.includes(heroId)
  })
  if (mentionedFactionUnit) {
    return assignedUnitIds.has(mentionedFactionUnit.id) ? mentionedFactionUnit : null
  }
  return assignedUnits[0] ?? null
}

function resolveRequestedSkillIdForChat(body: string): string | undefined {
  const explicitId = body.match(/lib_[a-z0-9_]+/i)?.[0]
  if (explicitId) {
    return explicitId
  }
  if (commandIncludesAny(body, ['破阵', '追袭', 'rending', 'charge'])) {
    return 'lib_s_chase_rending_charge'
  }
  if (commandIncludesAny(body, ['火', '火攻', 'fire'])) {
    return 'lib_s_active_fire_raid'
  }
  return undefined
}

function resolveBuildingPreferenceArgs(body: string): Record<string, unknown> {
  if (commandIncludesAny(body, ['税', 'tax'])) {
    return { groupId: 'tax', buildingId: 'tax_office' }
  }
  if (commandIncludesAny(body, ['市场', 'market'])) {
    return { groupId: 'market', buildingId: 'market_plaza' }
  }
  if (commandIncludesAny(body, ['招募', '募兵'])) {
    return { groupId: 'policy', buildingId: 'recruit_policy_board' }
  }
  if (commandIncludesAny(body, ['政策', '政厅', 'policy'])) {
    return { groupId: 'policy', buildingId: 'policy_hall' }
  }
  return {}
}

function isExplicitHeroExperienceIntent(body: string): boolean {
  if (commandIncludesAny(body, ['战法', 'skill', '升星', '红星', 'star', '建筑', '设施', '税', '市场', '政厅', '政策'])) {
    return false
  }
  return commandIncludesAny(body, ['刷经验', '练级', '经验', '升等级', '升级武将', '武将升级', 'hero level'])
}

function resolveHeroExperienceProposal(
  runtime: GovernedAiPlayerRuntimeDetail,
  body: string,
): ResolvedChatProposal | null {
  if (!isExplicitHeroExperienceIntent(body)) {
    return null
  }
  const target = resolveAssignedHeroTargetForChat(runtime, body)
  if (!target) {
    return null
  }
  const plan = buildAiPlayerDevelopmentPlan(runtime)
  const targetCandidates = plan.candidateTiles.filter((candidate) =>
    candidate.adjacentToUnitId === target.id && candidate.type === 'resource' && candidate.args,
  )
  const actionPriority: AiPlayerActionType[] = ['tile_occupy', 'march_move', 'resource_gather']
  const candidate = actionPriority
    .flatMap((action) => targetCandidates.filter((item) => item.recommendedAction === action))
    .find((item) => item.args && item.recommendedAction)
    ?? targetCandidates.find((item) => item.args && item.recommendedAction)
  if (!candidate?.recommendedAction || !candidate.args) {
    return null
  }

  const heroId = normalizeHeroAuthorityIdForChat(target.hero.id)
  return {
    action: candidate.recommendedAction,
    args: candidate.args,
    reason: `Governor specified hero experience growth for ${target.hero.name}; route through resource-land candidate ${candidate.tileId}: ${body}`,
    summary: `我已按指定生成提案：让${target.hero.name}走资源地经验路线（${candidate.recommendedAction} -> ${candidate.tileId}），不创建直接武将升级提案。`,
    source: 'human',
    metadata: {
      source: 'chat_explicit_hero_experience_route',
      preferenceKind: 'hero_experience',
      requestedHeroId: heroId,
      requestedHeroName: target.hero.name,
      targetUnitId: target.id,
      targetTileId: candidate.tileId,
      authority: 'resource_land_experience_v1',
    },
  }
}

function resolveExplicitUpgradePreferenceProposal(
  runtime: GovernedAiPlayerRuntimeDetail,
  body: string,
): ResolvedChatProposal | null {
  if (!hasUpgradeIntent(body)) {
    return null
  }

  if (commandIncludesAny(body, ['战法', 'skill'])) {
    const target = resolveAssignedHeroTargetForChat(runtime, body)
    const heroId = target ? normalizeHeroAuthorityIdForChat(target.hero.id) : undefined
    const skillId = resolveRequestedSkillIdForChat(body)
    return {
      action: 'tactical_skill_upgrade',
      args: {
        ...(heroId ? { heroId } : {}),
        ...(skillId ? { skillId } : {}),
      },
      reason: `Governor specified tactical skill upgrade preference: ${body}`,
      summary: `我已按指定生成提案：升级${target?.hero.name ?? '目标武将'}的战法${skillId ? ` ${skillId}` : ''}，等待批准后走战法升级 authority。`,
      source: 'human',
      metadata: {
        source: 'chat_explicit_upgrade_preference',
        preferenceKind: 'tactical_skill',
        requestedHeroId: heroId,
        requestedHeroName: target?.hero.name,
        requestedSkillId: skillId,
      },
    }
  }

  if (commandIncludesAny(body, ['升星', '红星', 'star'])) {
    const target = resolveAssignedHeroTargetForChat(runtime, body)
    const heroId = target ? normalizeHeroAuthorityIdForChat(target.hero.id) : undefined
    return {
      action: 'hero_star_upgrade',
      args: heroId ? { heroId } : {},
      reason: `Governor specified hero star upgrade preference: ${body}`,
      summary: `我已按指定生成提案：给${target?.hero.name ?? '目标武将'}升星，等待批准后走武将升星 authority。`,
      source: 'human',
      metadata: {
        source: 'chat_explicit_upgrade_preference',
        preferenceKind: 'hero_star',
        requestedHeroId: heroId,
        requestedHeroName: target?.hero.name,
      },
    }
  }

  if (commandIncludesAny(body, ['建筑', '设施', '税', '市场', '政厅', '政策', 'building'])) {
    const args = resolveBuildingPreferenceArgs(body)
    return {
      action: 'building_upgrade',
      args,
      reason: `Governor specified building upgrade preference: ${body}`,
      summary: '我已按指定生成建筑升级提案，等待批准后走主城设施树升级 authority 并回写 read model refresh receipt。',
      source: 'human',
      metadata: {
        source: 'chat_explicit_upgrade_preference',
        preferenceKind: 'building',
        requestedBuildingArgs: args,
      },
    }
  }

  return null
}

function hasFormationRosterIntent(body: string): boolean {
  return commandIncludesAny(body, [
    '编组',
    '组队',
    '配队',
    '组一队',
    '第一队',
    '一队',
    '队伍',
    '换成',
    '换上',
    '带上',
    '出征',
    '出动',
    '派出',
    'troop',
    'formation',
  ])
}

function resolveRequestedFormationHeroesForChat(body: string) {
  const matches = lightweightHeroPool
    .map((hero) => {
      const nameIndex = body.indexOf(hero.name)
      const idIndex = body.indexOf(hero.id)
      const authorityIdIndex = body.indexOf(`hero_${hero.id}`)
      const indices = [nameIndex, idIndex, authorityIdIndex].filter((index) => index >= 0)
      if (indices.length === 0) {
        return null
      }
      return {
        hero,
        index: Math.min(...indices),
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => left.index - right.index)

  const seen = new Set<string>()
  return matches
    .filter((match) => {
      if (seen.has(match.hero.id)) {
        return false
      }
      seen.add(match.hero.id)
      return true
    })
    .map((match) => match.hero)
}

function parseChineseTeamOrdinal(value: string): number | null {
  const normalized = value.trim()
  if (/^\d+$/.test(normalized)) {
    const parsed = Number.parseInt(normalized, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }
  const digitByHan: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  }
  if (normalized === '十') {
    return 10
  }
  if (normalized.startsWith('十')) {
    const tail = digitByHan[normalized.slice(1)]
    return tail ? 10 + tail : null
  }
  if (normalized.endsWith('十')) {
    const head = digitByHan[normalized.slice(0, 1)]
    return head ? head * 10 : null
  }
  if (normalized.includes('十')) {
    const [headRaw, tailRaw] = normalized.split('十')
    const head = digitByHan[headRaw] ?? 1
    const tail = digitByHan[tailRaw] ?? 0
    return head * 10 + tail
  }
  return digitByHan[normalized] ?? null
}

function normalizeTeamIdFromIndex(teamIndex: number): string {
  return `team_${String(teamIndex).padStart(2, '0')}`
}

function resolveExplicitFormationTeamTarget(runtime: GovernedAiPlayerRuntimeDetail, body: string): {
  teamId?: string
  teamIndex?: number
  source: 'explicit_message' | 'silent_context' | 'default_ai_team'
} {
  const explicitMatch = body.match(/(?:第\s*)?([一二三四五六七八九十\d]{1,3})\s*(?:队|隊)/)
  if (explicitMatch) {
    const parsed = parseChineseTeamOrdinal(explicitMatch[1] ?? '')
    if (parsed && parsed > 0) {
      return {
        teamId: normalizeTeamIdFromIndex(parsed),
        teamIndex: parsed,
        source: 'explicit_message',
      }
    }
  }

  const world = getWorldStateReadonly()
  const playerContext = world.slgDomainState?.aiStateByPlayerId?.[runtime.aiPlayerId]?.contextMemorySummary
  const factionContext = world.slgDomainState?.aiStateByFaction?.[runtime.factionId]?.contextMemorySummary
  const context = playerContext?.aiPlayerId === runtime.aiPlayerId ? playerContext : factionContext
  const contextTeamId = typeof context?.teamId === 'string' ? context.teamId.trim() : ''
  const contextTeamIndex = typeof context?.teamIndex === 'number' && Number.isFinite(context.teamIndex)
    ? Math.floor(context.teamIndex)
    : Number.parseInt(contextTeamId.match(/(\d+)$/)?.[1] ?? '', 10)
  if (contextTeamId || (Number.isFinite(contextTeamIndex) && contextTeamIndex > 0)) {
    const teamIndex = Number.isFinite(contextTeamIndex) && contextTeamIndex > 0 ? contextTeamIndex : undefined
    return {
      teamId: contextTeamId || (teamIndex ? normalizeTeamIdFromIndex(teamIndex) : undefined),
      teamIndex,
      source: 'silent_context',
    }
  }

  return {
    teamId: 'team_02',
    teamIndex: 2,
    source: 'default_ai_team',
  }
}

function resolveExplicitFormationRosterProposal(
  runtime: GovernedAiPlayerRuntimeDetail,
  body: string,
): ResolvedChatProposal | ResolvedChatIdleMessage | null {
  if (!hasFormationRosterIntent(body)) {
    return null
  }

  const requestedHeroes = resolveRequestedFormationHeroesForChat(body).slice(0, 3)
  if (requestedHeroes.length < 2) {
    return null
  }

  const world = getWorldStateReadonly()
  const faction = world.factions[runtime.factionId]
  const reserveHeroIds = faction?.heroCommand.reserveHeroIds ?? []
  const reserveSet = new Set(reserveHeroIds)
  const missingHeroes = requestedHeroes.filter((hero) => !reserveSet.has(hero.id))
  if (missingHeroes.length > 0) {
    return {
      idle: true,
      summary: `我听懂了你要调整队伍，但${missingHeroes.map((hero) => hero.name).join('、')}现在不在预备队里，先不能替你换上。`,
      metadata: {
        source: 'chat_explicit_formation_roster_unavailable',
        preferenceKind: 'formation_roster',
        requestedHeroIds: requestedHeroes.map((hero) => hero.id),
        missingHeroIds: missingHeroes.map((hero) => hero.id),
        authorityPreserved: true,
      },
    }
  }

  const tileId = faction?.heroCommand.homeTileId?.trim()
  if (!tileId) {
    return {
      idle: true,
      summary: '我听懂了你要调整队伍，但当前主城出动位置还没准备好。',
      metadata: {
        source: 'chat_explicit_formation_roster_missing_home_tile',
        preferenceKind: 'formation_roster',
        requestedHeroIds: requestedHeroes.map((hero) => hero.id),
        authorityPreserved: true,
      },
    }
  }

  const heroNames = requestedHeroes.map((hero) => hero.name)
  const teamTarget = resolveExplicitFormationTeamTarget(runtime, body)
  return {
    action: 'troop_train',
    args: {
      heroId: requestedHeroes[0].id,
      coHeroIds: requestedHeroes.slice(1).map((hero) => hero.id),
      tileId,
      aiPlayerId: runtime.aiPlayerId,
      teamId: teamTarget.teamId,
      teamIndex: teamTarget.teamIndex,
    },
    reason: `Governor specified formation roster by chat: ${heroNames.join(', ')} for ${teamTarget.teamId ?? 'current team'}.`,
    summary: `我已按你说的把${teamTarget.teamIndex ? `第${teamTarget.teamIndex}队` : '当前队伍'}排好：${heroNames.join('、')}。确认后就按这队出动。`,
    source: 'human',
    metadata: {
      source: 'chat_explicit_formation_roster',
      preferenceKind: 'formation_roster',
      requestedHeroIds: requestedHeroes.map((hero) => hero.id),
      requestedHeroNames: heroNames,
      targetTileId: tileId,
      targetAiPlayerId: runtime.aiPlayerId,
      targetTeamId: teamTarget.teamId,
      targetTeamIndex: teamTarget.teamIndex,
      targetTeamSource: teamTarget.source,
      authority: 'deploy_reserve_hero_three_slot_v1',
    },
  }
}

function resolveExplicitPlayerPreferenceProposal(
  runtime: GovernedAiPlayerRuntimeDetail,
  body: string,
): ResolvedChatProposal | ResolvedChatIdleMessage | null {
  return resolveExplicitFormationRosterProposal(runtime, body)
    ?? resolveExplicitUpgradePreferenceProposal(runtime, body)
    ?? resolveHeroExperienceProposal(runtime, body)
}

function resolveResourceTransferProposal(
  runtime: GovernedAiPlayerRuntimeDetail,
  body: string,
): ResolvedChatProposal | { error: string; summary: string } | null {
  if (!shouldCreateResourceTransferProposal(body)) {
    return null
  }
  if (!runtime.resourceTransfer.canTransferNow) {
    return {
      error: runtime.resourceTransfer.blockedBy ?? 'resource_transfer_blocked',
      summary: '当前资源输送被后端策略拦截，暂不生成提案。',
    }
  }

  const world = getWorldStateReadonly()
  const account = world.factions[runtime.factionId]?.aiResourceAccounts?.[runtime.aiPlayerId]
  if (!account) {
    return {
      error: 'missing_ai_resource_account',
      summary: '当前 AI 没有可读取的资源子账户，暂不生成输送提案。',
    }
  }

  const resourceKey = resolveRequestedResource(body)
  const available = Math.max(0, Math.floor(Number(account.resources[resourceKey] ?? 0)))
  if (available <= 0) {
    return {
      error: 'missing_transferable_resource',
      summary: '资源子账户里没有足够资源，暂不生成输送提案。',
    }
  }

  const requestedAmount = parseRequestedAmount(body) ?? Math.min(DEFAULT_TRANSFER_AMOUNT, available)
  const quotaCappedAmount = Math.min(requestedAmount, Math.max(0, runtime.resourceTransfer.remainingQuotaTotal))
  const amount = Math.min(available, quotaCappedAmount)
  if (amount <= 0) {
    return {
      error: 'daily_quota_exceeded',
      summary: '今日输送额度不足，暂不生成输送提案。',
    }
  }

  const resources = { [resourceKey]: amount }
  const summary = `我已根据聊天命令生成提案：输送${formatResources(resources)}到主界面通用收件箱。`
  return {
    action: 'resource_transfer_to_governor',
    args: {
      resources,
    },
    reason: `Governor chat command requested resource transfer: ${body}`,
    summary,
    source: 'human',
  }
}

function buildAiPlayerChatModelObservation(
  runtime: GovernedAiPlayerRuntimeDetail,
  body: string,
  queueLane: 'interactive_chat' | 'background_patrol' | 'default' = 'default',
) {
  const world = getWorldStateReadonly()
  const faction = world.factions[runtime.factionId]
  const developmentPlan = buildAiPlayerDevelopmentPlan(runtime)
  const contextDocuments = runtime.contextDocuments.map((document) => ({
    kind: document.kind,
    title: document.title,
    content: document.content,
  }))
  const chatBucket = readMessageBucket(runtime.aiPlayerId)
  return {
    aiPlayerId: runtime.aiPlayerId,
    runtime,
    contextDocuments,
    chatSummary: buildLatestChatSummaryCheckpoint(runtime.aiPlayerId, chatBucket),
    recentChat: buildRecentChatObservation(chatBucket),
    chatCommand: {
      body,
      senderRole: 'governor',
      safetyRule: 'model may only propose governed JSON actions; backend owns validation and execution',
    },
    requestContext: {
      queueLane,
    },
    world: {
      tick: world.tick,
      worldVersion: world.worldVersion,
      faction: faction
        ? {
            id: faction.id,
            actionPoints: faction.actionPoints,
            food: faction.food,
            wood: faction.wood ?? 0,
            stone: faction.stone ?? 0,
            iron: faction.iron ?? 0,
            aiResourceAccounts: faction.aiResourceAccounts ?? {},
            governorResourceInboxes: faction.governorResourceInboxes ?? {},
            aiResourceTransferQuotaByAiPlayer: faction.aiResourceTransferQuotaByAiPlayer ?? {},
            aiResourceTransferPolicy: faction.aiResourceTransferPolicy ?? null,
          }
        : null,
    },
    developmentPlan,
    receipts: runtime.latestReceipt ? [runtime.latestReceipt] : [],
    failures: runtime.observability.recentFailures?.samples ?? [],
  }
}

function buildPatrolModelProposalBody(input: {
  proposalSummary: AiPlayerChatPatrolTickProposalSummary
  developmentSummary: AiPlayerChatPatrolTickDevelopmentSummary
  battleReportSummary: AiPlayerChatPatrolTickBattleReportSummary
}): string {
  const args = input.proposalSummary.proposalArgs ?? input.proposalSummary.args ?? {}
  return [
    '[autonomous patrol]',
    'Choose one governed model proposal for the current patrol candidate. Do not claim the action already happened.',
    `candidate=${input.proposalSummary.action}`,
    `candidateLabel=${input.proposalSummary.label}`,
    `candidateRisk=${input.proposalSummary.riskLevel}`,
    `candidateReadiness=${input.proposalSummary.readiness}`,
    `candidateArgs=${JSON.stringify(args)}`,
    `candidateReason=${input.proposalSummary.proposalReason ?? input.proposalSummary.reason}`,
    'Hard rule: proposals[0].action must exactly equal candidate.',
    'Do not propose resource_transfer_to_governor, reward_claim, or any action outside the patrol candidate.',
    'If candidateArgs are missing or unsafe, return {"summary":"patrol deferred","proposals":[],"deferReason":"candidate args unavailable","needsHumanReview":true}.',
    `development=${input.developmentSummary.goalSummary}`,
    `battleReport=${input.battleReportSummary.latestNextStepSuggestion ?? 'none'}`,
    'The backend will create a governed proposal and preserve approval/authority execution gates.',
  ].join('\n')
}

function stableJsonStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJsonStringify(item)).join(',')}]`
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJsonStringify(item)}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value)
}

function patrolProposalArgsMatchCandidate(input: {
  proposalSummary: AiPlayerChatPatrolTickProposalSummary
  args: Record<string, unknown>
}): boolean {
  const candidateArgs = input.proposalSummary.proposalArgs ?? input.proposalSummary.args
  return stableJsonStringify(input.args) === stableJsonStringify(candidateArgs)
}

function resolvePatrolModelProposalSkipReason(
  runtime: GovernedAiPlayerRuntimeDetail,
  proposalSummary: AiPlayerChatPatrolTickProposalSummary | undefined,
): string | null {
  if (!runtime.enabled) {
    return 'ai_player_disabled'
  }
  if (runtime.paused) {
    return 'ai_player_paused'
  }
  if (!runtime.runtimePolicy.allowLlmProposals) {
    return 'llm_proposals_disabled'
  }
  if (!proposalSummary) {
    return 'patrol_proposal_summary_missing'
  }
  if (proposalSummary.readiness !== 'ready') {
    return `patrol_candidate_${proposalSummary.readiness}`
  }
  if (!proposalSummary.proposalArgs && !proposalSummary.args) {
    return 'patrol_candidate_args_missing'
  }
  const pending = listAiPlayerActionProposals({
    aiPlayerId: runtime.aiPlayerId,
    status: 'pending_approval',
    limit: 1,
  })
  if (pending.length > 0) {
    return 'pending_proposal_exists'
  }
  return null
}

async function createPatrolModelProposal(input: {
  runtime: GovernedAiPlayerRuntimeDetail
  proposalSummary: AiPlayerChatPatrolTickProposalSummary | undefined
  developmentSummary: AiPlayerChatPatrolTickDevelopmentSummary
  battleReportSummary: AiPlayerChatPatrolTickBattleReportSummary
  triggeredBy?: string
}): Promise<PatrolModelProposalOutcome> {
  const skippedReason = resolvePatrolModelProposalSkipReason(input.runtime, input.proposalSummary)
  if (skippedReason) {
    return { skippedReason }
  }
  const proposalSummary = input.proposalSummary
  if (!proposalSummary) {
    return { skippedReason: 'patrol_proposal_summary_missing' }
  }

  const resolved = await resolveModelProposal(
    input.runtime,
    buildPatrolModelProposalBody({
      proposalSummary,
      developmentSummary: input.developmentSummary,
      battleReportSummary: input.battleReportSummary,
    }),
    { queueLane: 'background_patrol' },
  )
  if (!resolved) {
    return { skippedReason: 'model_target_unavailable' }
  }
  if ('error' in resolved) {
    if (isProviderBudgetDowngradeError(resolved.error)) {
      return {
        error: resolved.error,
        downgradeMessage: appendProviderBudgetDowngradeChatMessage({
          runtime: input.runtime,
          error: resolved.error,
          source: 'patrol_provider_budget_downgrade',
          trigger: 'patrol_tick',
          triggeredBy: input.triggeredBy,
        }),
      }
    }
    return {
      error: resolved.error,
      downgradeMessage: appendModelFailureDowngradeChatMessage({
        runtime: input.runtime,
        error: resolved.error,
        source: 'patrol_model_failure_downgrade',
        trigger: 'patrol_tick',
        triggeredBy: input.triggeredBy,
      }),
    }
  }
  if ('idle' in resolved) {
    return { skippedReason: 'model_proposal_empty' }
  }
  if (resolved.action !== proposalSummary.action) {
    return {
      error: 'model_proposal_action_mismatch',
      downgradeMessage: appendModelFailureDowngradeChatMessage({
        runtime: input.runtime,
        error: 'model_proposal_action_mismatch',
        source: 'patrol_model_failure_downgrade',
        trigger: 'patrol_tick',
        triggeredBy: input.triggeredBy,
      }),
    }
  }
  if (!patrolProposalArgsMatchCandidate({ proposalSummary, args: resolved.args })) {
    return {
      error: 'model_proposal_args_mismatch',
      downgradeMessage: appendModelFailureDowngradeChatMessage({
        runtime: input.runtime,
        error: 'model_proposal_args_mismatch',
        source: 'patrol_model_failure_downgrade',
        trigger: 'patrol_tick',
        triggeredBy: input.triggeredBy,
      }),
    }
  }

  const created = createAiPlayerActionProposal({
    aiPlayerId: input.runtime.aiPlayerId,
    action: resolved.action,
    args: resolved.args,
    reason: resolved.reason,
    source: resolved.source,
  })
  if (created.error || !created.proposal) {
    return {
      error: created.error ?? 'proposal_create_failed',
    }
  }

  const proposal = created.proposal
  const proposalMessage = appendAiPlayerChatMessage({
    aiPlayerId: input.runtime.aiPlayerId,
    channelId: `ai:${input.runtime.aiPlayerId}`,
    kind: 'proposal',
    authorType: 'ai',
    authorId: input.runtime.aiPlayerId,
    authorName: input.runtime.displayName,
    body: resolved.summary,
    proposalId: proposal.proposalId,
    action: proposal.action,
    metadata: {
      status: proposal.status,
      requiresApproval: proposal.requiresApproval,
      source: proposal.source,
      autonomous: true,
      trigger: 'patrol_tick',
      ...resolved.metadata,
      recoveryHint: proposal.recoveryHint,
    },
  })

  return {
    proposal,
    proposalMessage,
  }
}

function normalizePatrolTargetDevelopmentPoints(input: AiPlayerChatPatrolTickRequest): number | undefined {
  const raw = input.targetDevelopmentPoints ?? input.goalPower
  const value = Number(raw ?? Number.NaN)
  if (!Number.isFinite(value)) {
    return undefined
  }
  return Math.max(1, Math.min(100000, Math.trunc(value)))
}

function normalizePatrolBattleReportLimit(input: AiPlayerChatPatrolTickRequest): number {
  const value = Number(input.battleReportLimit ?? 3)
  if (!Number.isFinite(value)) {
    return 3
  }
  return Math.max(1, Math.min(50, Math.trunc(value)))
}

function normalizePatrolTriggerMode(input: AiPlayerChatPatrolTickRequest): AiPlayerChatPatrolTickTriggerMode {
  return input.triggerMode === 'scheduler' ? 'scheduler' : 'manual'
}

function normalizePatrolCooldownTicks(input: AiPlayerChatPatrolTickRequest): number {
  const value = Number(input.cooldownTicks ?? DEFAULT_PATROL_COOLDOWN_TICKS)
  if (!Number.isFinite(value)) {
    return DEFAULT_PATROL_COOLDOWN_TICKS
  }
  return Math.max(0, Math.min(100000, Math.trunc(value)))
}

function buildPatrolAutonomyGuard(): AiPlayerChatPatrolAutonomyGuard {
  return {
    mode: 'approval_only',
    autonomousExecutionEnabled: false,
    minIntervalMinutes: PATROL_AUTONOMY_MIN_INTERVAL_MINUTES,
    authorityPreserved: true,
    decision: 'disabled',
    reason: 'autonomous_execution_not_enabled',
    pendingApprovalBlocksExecution: true,
  }
}

function normalizePatrolSchedulerLimit(input: AiPlayerChatPatrolSchedulerRunRequest): number {
  const value = Number(input.limit ?? DEFAULT_PATROL_SCHEDULER_LIMIT)
  if (!Number.isFinite(value)) {
    return DEFAULT_PATROL_SCHEDULER_LIMIT
  }
  return Math.max(1, Math.min(50, Math.trunc(value)))
}

function normalizePatrolSchedulerShard(input: AiPlayerChatPatrolSchedulerRunRequest): PatrolSchedulerShard {
  const rawCount = Number(input.shardCount ?? 1)
  const shardCount = Number.isFinite(rawCount)
    ? Math.max(1, Math.min(1000, Math.trunc(rawCount)))
    : 1
  const rawIndex = Number(input.shardIndex ?? 0)
  const shardIndex = Number.isFinite(rawIndex)
    ? Math.max(0, Math.min(shardCount - 1, Math.trunc(rawIndex)))
    : 0
  return { shardIndex, shardCount }
}

function normalizeOptionalQueueText(value: string | undefined) {
  const normalized = value?.trim()
  return normalized || null
}

function normalizeQueueMs(value: number | undefined, fallback = 0) {
  const normalized = Number(value ?? fallback)
  if (!Number.isFinite(normalized)) {
    return fallback
  }
  return Math.max(0, Math.min(3_600_000, Math.trunc(normalized)))
}

function resolvePatrolSchedulerLeaseExpiresAtMs(input: AiPlayerChatPatrolSchedulerRunRequest): number | null {
  if (!input.leaseId?.trim() || input.leaseTtlMs === undefined) {
    return null
  }
  return Date.now() + normalizeQueueMs(input.leaseTtlMs)
}

function buildPatrolSchedulerQueueSummary(
  input: AiPlayerChatPatrolSchedulerRunRequest,
  deduped: boolean,
): AiPlayerChatPatrolSchedulerQueueSummary {
  const backoffMs = normalizeQueueMs(input.backoffMs)
  const leaseExpiresAtMs = resolvePatrolSchedulerLeaseExpiresAtMs(input)
  return {
    queueRunId: normalizeOptionalQueueText(input.queueRunId),
    idempotencyKey: normalizeOptionalQueueText(input.idempotencyKey),
    leaseId: normalizeOptionalQueueText(input.leaseId),
    leaseTtlMs: input.leaseTtlMs === undefined ? null : normalizeQueueMs(input.leaseTtlMs),
    leaseExpiresAt: leaseExpiresAtMs === null ? null : new Date(leaseExpiresAtMs).toISOString(),
    retryAfterMs: normalizeQueueMs(input.retryAfterMs, backoffMs),
    backoffMs,
    deduped,
  }
}

function cachePatrolSchedulerIdempotentResponse(
  key: string | null,
  response: AiPlayerChatPatrolSchedulerRunResponse,
) {
  if (!key) {
    return
  }
  patrolSchedulerIdempotencyCache.set(key, cloneValue(response))
  while (patrolSchedulerIdempotencyCache.size > PATROL_SCHEDULER_IDEMPOTENCY_CACHE_LIMIT) {
    const oldestKey = patrolSchedulerIdempotencyCache.keys().next().value
    if (!oldestKey) {
      break
    }
    patrolSchedulerIdempotencyCache.delete(oldestKey)
  }
}

function withPatrolSchedulerQueueOverride(
  response: AiPlayerChatPatrolSchedulerRunResponse,
  queue: AiPlayerChatPatrolSchedulerQueueSummary,
  deduped: boolean,
): AiPlayerChatPatrolSchedulerRunResponse {
  return {
    ...cloneValue(response),
    queue: {
      ...cloneValue(response.queue),
      queueRunId: queue.queueRunId ?? response.queue.queueRunId,
      idempotencyKey: queue.idempotencyKey ?? response.queue.idempotencyKey,
      leaseId: queue.leaseId ?? response.queue.leaseId,
      leaseTtlMs: queue.leaseTtlMs ?? response.queue.leaseTtlMs,
      leaseExpiresAt: queue.leaseExpiresAt ?? response.queue.leaseExpiresAt,
      retryAfterMs: queue.retryAfterMs,
      backoffMs: queue.backoffMs,
      deduped,
    },
  }
}

function readPatrolSchedulerIdempotentResponse(
  queue: AiPlayerChatPatrolSchedulerQueueSummary,
): AiPlayerChatPatrolSchedulerRunResponse | null {
  if (!queue.idempotencyKey) {
    return null
  }
  const cached = patrolSchedulerIdempotencyCache.get(queue.idempotencyKey)
  if (!cached) {
    return null
  }
  return withPatrolSchedulerQueueOverride(cached, queue, true)
}

function readMetadataNumber(metadata: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = Number(metadata?.[key] ?? Number.NaN)
  return Number.isFinite(value) ? value : undefined
}

function readLatestPatrolCooldown(aiPlayerId: string): PatrolCooldownSnapshot | null {
  const bucket = readMessageBucket(aiPlayerId)
  for (let index = bucket.length - 1; index >= 0; index -= 1) {
    const message = bucket[index]
    const source = String(message.metadata?.source ?? '').trim()
    if (source !== 'manual_patrol_tick' && source !== 'scheduler_patrol_tick') {
      continue
    }
    const cooldownUntilTick = readMetadataNumber(message.metadata, 'cooldownUntilTick')
    if (cooldownUntilTick === undefined) {
      continue
    }
    return {
      cooldownUntilTick,
      messageId: message.messageId,
      source,
    }
  }
  return null
}

function clipMessageBody(body: string, maxLength = 900): string {
  if (body.length <= maxLength) {
    return body
  }
  return `${body.slice(0, Math.max(0, maxLength - 3))}...`
}

function toPatrolProposalSummary(
  candidate: AiPlayerDevelopmentPlanCandidateAction,
): AiPlayerChatPatrolTickProposalSummary {
  const proposalArgs = candidate.proposalArgs ?? candidate.args
  const proposalReason = candidate.proposalReason ?? candidate.reason
  return {
    action: candidate.action,
    label: candidate.label,
    readiness: candidate.readiness,
    riskLevel: candidate.riskLevel,
    args: candidate.args,
    proposalArgs,
    proposalReason,
    priorityScore: candidate.priorityScore,
    priorityReason: candidate.priorityReason,
    targetUnitId: candidate.targetUnitId,
    targetTileId: candidate.targetTileId,
    reason: candidate.reason,
    blockers: candidate.blockers,
  }
}

function selectPatrolProposalSummary(
  plan: AiPlayerDevelopmentPlan,
): AiPlayerChatPatrolTickProposalSummary | undefined {
  const readyCandidate = plan.candidateActions.find((candidate) => (
    candidate.executableInV1
      && candidate.readiness === 'ready'
      && Boolean(candidate.proposalArgs ?? candidate.args)
  ))
  const fallbackCandidate = readyCandidate
    ?? plan.candidateActions.find((candidate) => candidate.executableInV1 && candidate.readiness === 'ready')
    ?? plan.candidateActions.find((candidate) => candidate.readiness === 'needs_target')
  return fallbackCandidate ? toPatrolProposalSummary(fallbackCandidate) : undefined
}

function buildPatrolDevelopmentSummary(plan: AiPlayerDevelopmentPlan): AiPlayerChatPatrolTickDevelopmentSummary {
  return {
    tick: plan.tick,
    worldVersion: plan.worldVersion,
    goalSummary: plan.goal.summary,
    readyCandidateCount: plan.candidateActions.filter((candidate) => candidate.readiness === 'ready').length,
    blockedCandidateCount: plan.candidateActions.filter((candidate) => candidate.readiness === 'blocked').length,
    riskItemCount: plan.riskItems.length,
  }
}

function buildPatrolBattleReportSummary(
  latestReport: AiPlayerBattleReportReadItem | undefined,
  count: number,
): AiPlayerChatPatrolTickBattleReportSummary {
  return {
    count,
    latestReportId: latestReport?.reportId,
    latestOutcome: latestReport?.outcome,
    latestSeverity: latestReport?.severity,
    latestNextStepSuggestion: latestReport?.nextStepSuggestion,
  }
}

function buildPatrolMessageBody(input: {
  developmentSummary: AiPlayerChatPatrolTickDevelopmentSummary
  battleReportSummary: AiPlayerChatPatrolTickBattleReportSummary
  proposalSummary?: AiPlayerChatPatrolTickProposalSummary
}): string {
  const battleText = input.battleReportSummary.latestReportId
    ? `最近战报 ${input.battleReportSummary.latestReportId}：${input.battleReportSummary.latestOutcome ?? 'unknown'}，建议：${input.battleReportSummary.latestNextStepSuggestion ?? '继续观察'}。`
    : '最近没有 AI 相关战报。'
  const proposalText = input.proposalSummary
    ? `候选提案：${input.proposalSummary.label}；${input.proposalSummary.proposalReason ?? input.proposalSummary.reason}`
    : '当前没有可直接形成提案的候选动作，我会继续等待目标或资源条件。'
  return clipMessageBody([
    `巡查完成：tick ${input.developmentSummary.tick}，worldVersion ${input.developmentSummary.worldVersion}。`,
    `发育目标：${input.developmentSummary.goalSummary}`,
    battleText,
    proposalText,
  ].join(' '))
}

function readLatestProactivePatrolMessageAtMs(aiPlayerId: string): number {
  const bucket = readMessageBucket(aiPlayerId)
  for (let index = bucket.length - 1; index >= 0; index -= 1) {
    const message = bucket[index]
    if (String(message.metadata?.source ?? '') !== 'patrol_proactive_message') {
      continue
    }
    const parsed = Date.parse(message.createdAt)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return 0
}

function resolveProactivePatrolMessageIntent(input: {
  battleReportSummary: AiPlayerChatPatrolTickBattleReportSummary
  proposalSummary?: AiPlayerChatPatrolTickProposalSummary
}): ProactivePatrolMessageIntent {
  const latestReportId = input.battleReportSummary.latestReportId
  if (latestReportId) {
    if (input.battleReportSummary.latestOutcome === 'loss' || input.battleReportSummary.latestSeverity === 'high') {
      return {
        proactiveReason: 'battle_high_loss',
        severity: input.battleReportSummary.latestSeverity ?? 'high',
        cooldownMinutes: 30,
        relatedReportId: latestReportId,
        suggestedAction: 'troop_heal',
      }
    }
    if (input.battleReportSummary.latestOutcome === 'win') {
      return {
        proactiveReason: 'battle_victory',
        severity: input.battleReportSummary.latestSeverity ?? 'low',
        cooldownMinutes: 30,
        relatedReportId: latestReportId,
        suggestedAction: input.proposalSummary?.action,
      }
    }
  }

  if (
    input.proposalSummary
    && (
      input.proposalSummary.readiness !== 'ready'
      || (!input.proposalSummary.proposalArgs && !input.proposalSummary.args)
    )
  ) {
    return {
      proactiveReason: 'human_input_needed',
      severity: 'medium',
      cooldownMinutes: 60,
      suggestedAction: input.proposalSummary.action,
      blockers: input.proposalSummary.blockers,
    }
  }

  if (input.proposalSummary) {
    return {
      proactiveReason: 'action_ready_for_approval',
      severity: 'medium',
      cooldownMinutes: 60,
      suggestedAction: input.proposalSummary.action,
    }
  }

  return {
    proactiveReason: 'patrol_heartbeat',
    severity: 'low',
    cooldownMinutes: 60,
  }
}

function buildProactivePatrolMessageBody(input: {
  addressing: AiPlayerMessageAddressing
  intent: ProactivePatrolMessageIntent
  battleReportSummary: AiPlayerChatPatrolTickBattleReportSummary
  proposalSummary?: AiPlayerChatPatrolTickProposalSummary
}): string {
  const address = input.addressing.value
  if (input.intent.proactiveReason === 'battle_high_loss') {
    const suggestion = input.battleReportSummary.latestNextStepSuggestion ?? '我会先稳住，等你拍板。'
    return clipMessageBody(`${address}，我刚看完战报：${suggestion} 我先把风险报上来，不会绕过审批执行。`)
  }
  if (input.intent.proactiveReason === 'battle_victory') {
    return clipMessageBody(`${address}，刚才这场打赢了，我会继续观察损耗和下一步机会，后续行动仍然等你批准。`)
  }
  if (input.intent.proactiveReason === 'action_ready_for_approval' && input.proposalSummary) {
    return clipMessageBody(`${address}，我刚巡查完，看到一个可做的方向：${input.proposalSummary.label}。需要你点头我再走后端提案流程。`)
  }
  if (input.intent.proactiveReason === 'human_input_needed' && input.proposalSummary) {
    const blockerText = input.intent.blockers?.length
      ? input.intent.blockers.join('、')
      : input.proposalSummary.readiness
    return clipMessageBody(`${address}，我刚巡查完，但 ${input.proposalSummary.label} 还缺目标或条件，当前卡在：${blockerText}。你给我指定目标或先调整条件，我再走后端提案流程。`)
  }
  return `${address}，我刚巡查完，一切先稳住。有需要随时叫我。`
}

function buildProactivePatrolTriggerCondition(
  intent: ProactivePatrolMessageIntent,
): ProactivePatrolTriggerCondition {
  const source = intent.proactiveReason === 'battle_high_loss' || intent.proactiveReason === 'battle_victory'
    ? 'battle_report'
    : (intent.proactiveReason === 'patrol_heartbeat' ? 'patrol_heartbeat' : 'development_plan')
  return {
    policyVersion: 'patrol_proactive_trigger_v1',
    reason: intent.proactiveReason,
    source,
    cooldownMinutes: intent.cooldownMinutes,
    requiresHumanApproval: true,
    noAutonomousExecution: true,
  }
}

function recordProactivePatrolMessageIfReady(input: {
  runtime: GovernedAiPlayerRuntimeDetail
  triggerMode: AiPlayerChatPatrolTickTriggerMode
  triggeredBy?: string
  developmentSummary: AiPlayerChatPatrolTickDevelopmentSummary
  battleReportSummary: AiPlayerChatPatrolTickBattleReportSummary
  proposalSummary?: AiPlayerChatPatrolTickProposalSummary
  worldVersionBefore: number
  worldVersionAfterRead: number
}): AiPlayerChatMessage | null {
  if (input.triggerMode !== 'scheduler') {
    return null
  }
  const intent = resolveProactivePatrolMessageIntent({
    battleReportSummary: input.battleReportSummary,
    proposalSummary: input.proposalSummary,
  })
  const lastProactiveAtMs = readLatestProactivePatrolMessageAtMs(input.runtime.aiPlayerId)
  if (lastProactiveAtMs > 0 && Date.now() - lastProactiveAtMs < intent.cooldownMinutes * 60 * 1000) {
    return null
  }
  const addressing = resolveAiPlayerMessageAddressing(input.runtime)

  return appendAiPlayerChatMessage({
    aiPlayerId: input.runtime.aiPlayerId,
    channelId: `ai:${input.runtime.aiPlayerId}`,
    kind: 'message',
    ...buildAiAuthor(input.runtime),
    body: buildProactivePatrolMessageBody({
      addressing,
      intent,
      battleReportSummary: input.battleReportSummary,
      proposalSummary: input.proposalSummary,
    }),
    metadata: {
      source: 'patrol_proactive_message',
      proactiveReason: intent.proactiveReason,
      severity: intent.severity,
      relatedReportId: intent.relatedReportId,
      suggestedAction: intent.suggestedAction,
      blockers: intent.blockers,
      triggerCondition: buildProactivePatrolTriggerCondition(intent),
      addressing,
      triggerMode: input.triggerMode,
      triggeredBy: input.triggeredBy?.trim() || undefined,
      cooldownMinutes: intent.cooldownMinutes,
      developmentSummary: input.developmentSummary,
      battleReportSummary: input.battleReportSummary,
      proposalSummary: input.proposalSummary,
      worldVersionBefore: input.worldVersionBefore,
      worldVersionAfterRead: input.worldVersionAfterRead,
      authorityPreserved: true,
    },
  })
}

function pickModelProposalRequest(
  aiPlayerId: string,
  proposalRequests: AiPlayerActionProposalRequest[],
): AiPlayerActionProposalRequest | null {
  return proposalRequests.find((request) => request.aiPlayerId === aiPlayerId) ?? proposalRequests[0] ?? null
}

function normalizeModelProposalRequestForCommand(
  request: AiPlayerActionProposalRequest,
  body: string,
): AiPlayerActionProposalRequest {
  if (request.action !== 'resource_transfer_to_governor') {
    return request
  }
  const requestedAmount = parseRequestedAmount(body)
  if (!requestedAmount) {
    return request
  }
  const resourceKey = resolveRequestedResource(body)
  const args = request.args && typeof request.args === 'object'
    ? { ...(request.args as Record<string, unknown>) }
    : {}
  const resources = {
    [resourceKey]: requestedAmount,
  }
  args.resources = resources
  return {
    ...request,
    args,
    reason: `按聊天命令提案：输送${formatResources(resources)}到总督通用收件箱。`,
  }
}

function buildModelProposalSummary(
  request: AiPlayerActionProposalRequest,
  fallbackSummary: string,
): string {
  if (request.action === 'resource_transfer_to_governor') {
    const args = request.args && typeof request.args === 'object'
      ? request.args as Record<string, unknown>
      : {}
    const resources = args.resources && typeof args.resources === 'object'
      ? args.resources as Record<string, unknown>
      : {}
    const resourceText = formatResources(resources)
    if (resourceText) {
      return `我已按聊天命令生成提案：输送${resourceText}到主界面通用收件箱。`
    }
  }
  return fallbackSummary.trim() || `我已根据聊天命令生成提案：${request.action}`
}

function resolveProposalFromModelRequest(
  request: AiPlayerActionProposalRequest,
  body: string,
  summary: string,
  metadata: Record<string, unknown>,
): ResolvedChatProposal {
  const normalizedRequest = normalizeModelProposalRequestForCommand(request, body)
  return {
    action: normalizedRequest.action,
    args: normalizedRequest.args && typeof normalizedRequest.args === 'object'
      ? normalizedRequest.args as Record<string, unknown>
      : {},
    reason: normalizedRequest.reason,
    summary: buildModelProposalSummary(normalizedRequest, summary),
    source: normalizedRequest.source,
    metadata,
  }
}

function resolveProviderLabel(baseUrl: string) {
  try {
    return new URL(baseUrl).host || 'relay'
  } catch {
    return 'relay'
  }
}

async function resolveModelProposal(
  runtime: GovernedAiPlayerRuntimeDetail,
  body: string,
  options: { queueLane?: 'interactive_chat' | 'background_patrol' | 'default' } = {},
): Promise<ResolvedChatProposal | ResolvedChatIdleMessage | { error: string; summary: string } | null> {
  const observation = buildAiPlayerChatModelObservation(runtime, body, options.queueLane ?? 'default')
  const testMockOutput = process.env.NODE_ENV === 'test'
    ? process.env.AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT?.trim()
    : ''
  if (testMockOutput) {
    try {
      const output = parseAiPlayerRuntimeProposalJson(testMockOutput)
      const proposalRequest = pickModelProposalRequest(
        runtime.aiPlayerId,
        toAiPlayerActionProposalRequests(runtime.aiPlayerId, output),
      )
      if (!proposalRequest) {
        return {
          idle: true,
          summary: output.summary || output.deferReason || 'No governed proposal was created.',
          metadata: {
            source: 'chat_model_idle_summary',
            deferReason: output.deferReason,
            needsHumanReview: output.needsHumanReview,
          },
        }
      }
      return resolveProposalFromModelRequest(proposalRequest, body, output.summary ?? proposalRequest.reason, {
        proposalMode: 'model',
        model: 'mock:test',
        providerFallbackFailures: [],
      })
    } catch {
      return {
        error: 'model_response_invalid_json_proposal',
        summary: '模型返回不是严格 JSON proposal，已拒绝创建提案。',
      }
    }
  }

  const candidates = resolveAiPlayerRuntimeModelTargetCandidates({
    factionId: runtime.factionId,
    ownerPlayerId: runtime.governorPlayerId,
  })
  if (candidates.every((candidate) => candidate.target.apiKeys.length === 0)) {
    recordAiPlayerRuntimeModelFallbackReasonForOwner(
      runtime.factionId,
      'missing_model_api_key',
      runtime.governorPlayerId,
    )
    recordAiPlayerProviderModelRequestAccounting({
      ok: false,
      aiPlayerId: runtime.aiPlayerId,
      factionId: runtime.factionId,
      governorPlayerId: runtime.governorPlayerId,
      error: 'missing_model_api_key',
    })
    return null
  }

  const modelResult = await requestAiPlayerRuntimeProposalFromCandidateTargets({
    candidates,
    observation,
    reserveCandidateAttempt: async (candidate, preflight) => {
      const budgetReservation = await reserveAiPlayerProviderBudget({
        aiPlayerId: runtime.aiPlayerId,
        factionId: runtime.factionId,
        governorPlayerId: runtime.governorPlayerId,
        model: candidate.target.model,
        provider: resolveProviderLabel(candidate.target.baseUrl),
        source: candidate.source,
        byokSource: candidate.byokSource,
      })
      if (!budgetReservation.ok) {
        return budgetReservation
      }
      const creditReservation = reserveAiPlayerProviderAiCommandCredits({
        accountId: runtime.governorPlayerId,
        factionId: runtime.factionId,
        usage: preflight.usage,
        aiPlayerId: runtime.aiPlayerId,
        reason: 'provider_request_preflight',
      })
      if (!creditReservation.ok) {
        await releaseAiPlayerProviderBudgetReservation(budgetReservation.reservationId)
        return {
          ok: false,
          error: creditReservation.error,
          reservationId: budgetReservation.reservationId,
          budgetWindowKey: budgetReservation.budgetWindowKey,
          limitMode: budgetReservation.limitMode,
        }
      }
      return {
        ...budgetReservation,
        aiCommandCreditReservationId: creditReservation.reservationId,
        aiCommandCreditReservedCredits: creditReservation.amountCredits,
      }
    },
    commitCandidateAttempt: async (_candidate, result, reservation) => {
      await commitAiPlayerProviderBudgetReservation(reservation?.reservationId, {
        ok: result.ok,
        usage: result.ok ? result.usage : undefined,
        error: result.ok ? undefined : result.error,
      })
      if (!result.ok) {
        releaseAiPlayerProviderAiCommandCreditReservation(reservation?.aiCommandCreditReservationId)
      }
    },
  })
  if (!modelResult.ok) {
    if (modelResult.providerFallbackFailures?.length) {
      recordAiPlayerRuntimeModelFallbackFailuresForOwner(
        runtime.factionId,
        modelResult.providerFallbackFailures,
        runtime.governorPlayerId,
      )
    } else {
      recordAiPlayerRuntimeModelFallbackReasonForOwner(runtime.factionId, modelResult.error, runtime.governorPlayerId)
    }
    recordAiPlayerProviderModelRequestAccounting({
      ok: false,
      aiPlayerId: runtime.aiPlayerId,
      factionId: runtime.factionId,
      governorPlayerId: runtime.governorPlayerId,
      providerFallbackFailures: modelResult.providerFallbackFailures ?? [],
      error: modelResult.error,
    })
    return {
      error: modelResult.error,
      summary: isProviderBudgetDowngradeError(modelResult.error)
        ? buildProviderBudgetDowngradeMessage(modelResult.error)
        : `模型提案失败：${modelResult.error}`,
    }
  }
  if (modelResult.providerFallbackFailures?.length) {
    recordAiPlayerRuntimeModelFallbackFailuresForOwner(
      runtime.factionId,
      modelResult.providerFallbackFailures,
      runtime.governorPlayerId,
    )
  } else {
    clearAiPlayerRuntimeModelFallbackReasonForOwner(runtime.factionId, runtime.governorPlayerId)
  }
  const providerRequestId = recordAiPlayerProviderModelRequestAccounting({
    ok: true,
    aiPlayerId: runtime.aiPlayerId,
    factionId: runtime.factionId,
    governorPlayerId: runtime.governorPlayerId,
    selectedProvider: modelResult.selectedProvider ?? null,
    providerFallbackFailures: modelResult.providerFallbackFailures ?? [],
    usage: modelResult.usage,
    budgetWindowKey: modelResult.budgetWindowKey,
    budgetReservationId: modelResult.budgetReservationId,
    aiCommandCreditReservationId: modelResult.aiCommandCreditReservationId,
  })

  const proposalRequest = pickModelProposalRequest(runtime.aiPlayerId, modelResult.proposalRequests)
  if (!proposalRequest) {
    return {
      idle: true,
      summary: modelResult.output.summary || modelResult.output.deferReason || 'No governed proposal was created.',
      metadata: {
        source: 'chat_model_idle_summary',
        deferReason: modelResult.output.deferReason,
        needsHumanReview: modelResult.output.needsHumanReview,
      },
    }
  }
  return resolveProposalFromModelRequest(proposalRequest, body, modelResult.output.summary ?? proposalRequest.reason, {
      proposalMode: 'model',
      model: modelResult.model,
      providerRequestId,
      usage: modelResult.usage,
    normalization: modelResult.normalization,
    providerFallback: {
      selectedProvider: modelResult.selectedProvider ?? null,
      failureCount: modelResult.providerFallbackFailures?.length ?? 0,
      failures: modelResult.providerFallbackFailures ?? [],
    },
  })
}

async function resolveChatProposal(
  runtime: GovernedAiPlayerRuntimeDetail,
  body: string,
): Promise<ResolvedChatProposal | ResolvedChatIdleMessage | { error: string; summary: string } | null> {
  const explicitPreference = resolveExplicitPlayerPreferenceProposal(runtime, body)
  if (explicitPreference) {
    return explicitPreference
  }
  const modelResolved = await resolveModelProposal(runtime, body, { queueLane: 'interactive_chat' })
  if (modelResolved) {
    if ('action' in modelResolved && modelResolved.action === 'hero_level_upgrade') {
      return resolveHeroExperienceProposal(runtime, body) ?? {
        idle: true,
        summary: '武将等级不走直接升级提案；请指定要练级的武将或目标资源地，我会改走资源地经验路线。',
        metadata: {
          source: 'chat_hero_level_direct_action_deferred',
          authorityPreserved: true,
        },
      }
    }
    return modelResolved
  }
  return resolveResourceTransferProposal(runtime, body)
}

export function listAiPlayerChatChannel(
  aiPlayerId: string,
  limit = 50,
  readerId?: string,
  filter: AiPlayerChatHistoryFilter = 'all',
  beforeMessageId?: string,
) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    return { error: `ai player not found: ${aiPlayerId}` }
  }

  const bucket = readMessageBucket(aiPlayerId)
  const normalizedLimit = Math.max(1, Math.min(200, Math.floor(limit)))
  const filteredBucket = bucket.filter((message) => messageMatchesHistoryFilter(message, filter))
  const normalizedBeforeMessageId = beforeMessageId?.trim()
  let endIndex = filteredBucket.length
  if (normalizedBeforeMessageId) {
    const matchedIndex = filteredBucket.findIndex((message) => message.messageId === normalizedBeforeMessageId)
    if (matchedIndex < 0) {
      return { error: `chat message not found: ${normalizedBeforeMessageId}` }
    }
    endIndex = matchedIndex
  }
  const startIndex = Math.max(0, endIndex - normalizedLimit)
  const page = filteredBucket.slice(startIndex, endIndex)
  const hasMore = startIndex > 0
  const messages = page.map((message) => cloneValue(message))
  const readCursor = resolveStoredReadCursor(runtime, readerId)
  return {
    channel: buildChannel(runtime, bucket.length),
    messages,
    count: messages.length,
    filter,
    beforeMessageId: normalizedBeforeMessageId || undefined,
    totalCount: filteredBucket.length,
    hasMore,
    nextBeforeMessageId: hasMore && page.length > 0 ? page[0].messageId : undefined,
    historyCounts: buildHistoryCounts(bucket),
    readCursor,
    unreadCount: readCursor?.unreadCount,
  }
}

export function getAiPlayerChatReadCursor(aiPlayerId: string, readerId: string): AiPlayerChatReadCursorResponse {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    return { ok: false, error: `ai player not found: ${aiPlayerId}` }
  }
  const normalizedReaderId = readerId.trim()
  if (!normalizedReaderId) {
    return { ok: false, error: 'readerId required' }
  }
  const readCursor = resolveStoredReadCursor(runtime, normalizedReaderId)
  return {
    ok: true,
    channel: buildChannel(runtime, readMessageBucket(aiPlayerId).length),
    readCursor,
  }
}

export function updateAiPlayerChatReadCursor(
  aiPlayerId: string,
  input: UpdateAiPlayerChatReadCursorRequest,
): AiPlayerChatReadCursorResponse {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    return { ok: false, error: `ai player not found: ${aiPlayerId}` }
  }
  const readerId = input.readerId.trim()
  if (!readerId) {
    return { ok: false, error: 'readerId required' }
  }

  const bucket = readMessageBucket(aiPlayerId)
  let readMessageCount = input.readMessageCount
  if (readMessageCount === undefined && input.readMessageId) {
    const matchedIndex = bucket.findIndex((message) => message.messageId === input.readMessageId)
    if (matchedIndex < 0) {
      return { ok: false, error: `chat message not found: ${input.readMessageId}` }
    }
    readMessageCount = matchedIndex + 1
  }
  if (readMessageCount === undefined) {
    return { ok: false, error: 'readMessageCount or readMessageId required' }
  }

  const readCursor = buildReadCursor(runtime, readerId, readMessageCount)
  chatReadCursors.set(buildReadCursorKey(aiPlayerId, readerId), cloneValue(readCursor))
  scheduleAiPlayerGovernancePersist()
  return {
    ok: true,
    channel: buildChannel(runtime, bucket.length),
    readCursor,
  }
}

export async function triggerAiPlayerChatPatrolTick(
  aiPlayerId: string,
  input: AiPlayerChatPatrolTickRequest = {},
): Promise<AiPlayerChatPatrolTickResponse> {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    return { ok: false, error: `ai player not found: ${aiPlayerId}` }
  }

  const worldBefore = getWorldStateReadonly()
  const triggerMode = normalizePatrolTriggerMode(input)
  const scheduled = triggerMode === 'scheduler'
  const cooldownTicks = normalizePatrolCooldownTicks(input)
  const autonomyGuard = buildPatrolAutonomyGuard()
  const latestCooldown = readLatestPatrolCooldown(runtime.aiPlayerId)
  const cooldownRemainingTicks = Math.max(0, (latestCooldown?.cooldownUntilTick ?? worldBefore.tick) - worldBefore.tick)
  if (!input.force && cooldownRemainingTicks > 0) {
    return {
      ok: false,
      error: 'patrol_cooldown_active',
      channel: buildChannel(runtime, readMessageBucket(aiPlayerId).length),
      triggerMode,
      scheduled,
      skipped: true,
      cooldownTicks,
      cooldownUntilTick: latestCooldown?.cooldownUntilTick,
      cooldownRemainingTicks,
      autonomyGuard,
      tick: worldBefore.tick,
      worldVersionBefore: worldBefore.worldVersion,
      worldVersionAfter: worldBefore.worldVersion,
    }
  }

  const developmentPlan = buildAiPlayerDevelopmentPlan(runtime, {
    targetDevelopmentPoints: normalizePatrolTargetDevelopmentPoints(input),
  })
  const battleReports = buildAiPlayerBattleReportReadModel(runtime, normalizePatrolBattleReportLimit(input))
  const proposalSummary = selectPatrolProposalSummary(developmentPlan)
  const developmentPlanSummary = buildPatrolDevelopmentSummary(developmentPlan)
  const battleReportSummary = buildPatrolBattleReportSummary(battleReports.items[0], battleReports.count)
  const worldAfterRead = getWorldStateReadonly()
  const cooldownUntilTick = worldAfterRead.tick + cooldownTicks
  const message = appendAiPlayerChatMessage({
    aiPlayerId: runtime.aiPlayerId,
    channelId: `ai:${runtime.aiPlayerId}`,
    kind: 'message',
    ...buildAiAuthor(runtime),
    body: buildPatrolMessageBody({
      developmentSummary: developmentPlanSummary,
      battleReportSummary,
      proposalSummary,
    }),
    metadata: {
      source: scheduled ? 'scheduler_patrol_tick' : 'manual_patrol_tick',
      triggeredBy: input.triggeredBy?.trim() || undefined,
      triggerMode,
      scheduled,
      cooldownTicks,
      cooldownUntilTick,
      developmentPlanSummary,
      battleReportSummary,
      proposalSummary,
      worldVersionBefore: worldBefore.worldVersion,
      worldVersionAfterRead: worldAfterRead.worldVersion,
    },
  })
  const modelProposalOutcome: PatrolModelProposalOutcome = await createPatrolModelProposal({
    runtime,
    proposalSummary,
    developmentSummary: developmentPlanSummary,
    battleReportSummary,
    triggeredBy: input.triggeredBy,
  }).catch((error): PatrolModelProposalOutcome => ({
    error: error instanceof Error ? error.message : 'patrol_model_proposal_failed',
  }))
  const proactiveMessage = recordProactivePatrolMessageIfReady({
    runtime,
    triggerMode,
    triggeredBy: input.triggeredBy,
    developmentSummary: developmentPlanSummary,
    battleReportSummary,
    proposalSummary,
    worldVersionBefore: worldBefore.worldVersion,
    worldVersionAfterRead: worldAfterRead.worldVersion,
  })
  const worldAfter = getWorldStateReadonly()

  return {
    ok: true,
    channel: buildChannel(runtime, readMessageBucket(aiPlayerId).length),
    message,
    proactiveMessage: proactiveMessage ?? undefined,
    modelProposalMessage: modelProposalOutcome.proposalMessage,
    modelDowngradeMessage: modelProposalOutcome.downgradeMessage,
    modelProposal: modelProposalOutcome.proposal,
    modelProposalError: modelProposalOutcome.error,
    modelProposalSkippedReason: modelProposalOutcome.skippedReason,
    triggerMode,
    scheduled,
    skipped: false,
    proposalSummary,
    developmentPlanSummary,
    battleReportSummary,
    cooldownTicks,
    cooldownUntilTick,
    cooldownRemainingTicks: 0,
    autonomyGuard,
    tick: worldAfter.tick,
    worldVersionBefore: worldBefore.worldVersion,
    worldVersionAfter: worldAfter.worldVersion,
  }
}

function listPatrolSchedulerTargets(input: AiPlayerChatPatrolSchedulerRunRequest) {
  const requestedIds = new Set((input.aiPlayerIds ?? []).map((id) => id.trim()).filter(Boolean))
  const shard = normalizePatrolSchedulerShard(input)
  const players = listGovernedAiPlayers({
    governorPlayerId: input.governorPlayerId?.trim() || undefined,
    factionId: input.factionId?.trim() || undefined,
    includeDisabled: false,
  })
    .filter((runtime) => requestedIds.size === 0 || requestedIds.has(runtime.aiPlayerId))
    .sort((left, right) => comparePatrolSchedulerTargets(left, right, input.samplingStrategy))
    .filter((_, index) => index % shard.shardCount === shard.shardIndex)
    .slice(0, normalizePatrolSchedulerLimit(input))
  return { players, shard }
}

function comparePatrolSchedulerTargets(
  left: { aiPlayerId: string },
  right: { aiPlayerId: string },
  samplingStrategy: AiPlayerChatPatrolSchedulerRunRequest['samplingStrategy'],
): number {
  if (samplingStrategy !== 'active_first') {
    return 0
  }
  const activityDelta = readAiPlayerChatActivityMs(right.aiPlayerId) - readAiPlayerChatActivityMs(left.aiPlayerId)
  return activityDelta !== 0 ? activityDelta : left.aiPlayerId.localeCompare(right.aiPlayerId)
}

function readAiPlayerChatActivityMs(aiPlayerId: string): number {
  const bucket = chatMessagesByAiPlayer.get(aiPlayerId) ?? []
  for (let index = bucket.length - 1; index >= 0; index -= 1) {
    const message = bucket[index]
    if (message.authorType !== 'governor' && message.authorType !== 'ai') {
      continue
    }
    const parsed = Date.parse(message.createdAt)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return 0
}

function toPatrolSchedulerRunItem(aiPlayerId: string, result: AiPlayerChatPatrolTickResponse): AiPlayerChatPatrolSchedulerRunItem {
  return {
    aiPlayerId,
    ok: result.ok,
    skipped: result.skipped,
    error: result.error,
    messageId: result.message?.messageId,
    cooldownUntilTick: result.cooldownUntilTick,
    cooldownRemainingTicks: result.cooldownRemainingTicks,
    tick: result.tick,
    autonomyGuard: result.autonomyGuard,
  }
}

function toPatrolSchedulerBudgetSkipItem(
  aiPlayerId: string,
  error: 'provider_budget_disabled' | 'provider_budget_exhausted',
  providerBudgetTier: AiPlayerChatPatrolSchedulerRunRequest['providerBudgetTier'],
): AiPlayerChatPatrolSchedulerRunItem {
  return {
    aiPlayerId,
    ok: false,
    skipped: true,
    error,
    providerBudgetTier,
    autonomyGuard: buildPatrolAutonomyGuard(),
  }
}

export async function runAiPlayerChatPatrolScheduler(
  input: AiPlayerChatPatrolSchedulerRunRequest = {},
): Promise<AiPlayerChatPatrolSchedulerRunResponse> {
  const queue = buildPatrolSchedulerQueueSummary(input, false)
  const cachedResponse = readPatrolSchedulerIdempotentResponse(queue)
  if (cachedResponse) {
    return cachedResponse
  }
  if (queue.idempotencyKey) {
    const inFlight = patrolSchedulerInFlightRuns.get(queue.idempotencyKey)
    if (inFlight && (inFlight.leaseExpiresAtMs === null || inFlight.leaseExpiresAtMs > Date.now())) {
      return withPatrolSchedulerQueueOverride(await inFlight.promise, queue, true)
    }
  }

  const runPromise = runAiPlayerChatPatrolSchedulerCore(input, queue)
  if (queue.idempotencyKey) {
    patrolSchedulerInFlightRuns.set(queue.idempotencyKey, {
      promise: runPromise,
      leaseExpiresAtMs: queue.leaseExpiresAt ? Date.parse(queue.leaseExpiresAt) : null,
    })
  }
  try {
    return await runPromise
  } finally {
    if (queue.idempotencyKey && patrolSchedulerInFlightRuns.get(queue.idempotencyKey)?.promise === runPromise) {
      patrolSchedulerInFlightRuns.delete(queue.idempotencyKey)
    }
  }
}

async function runAiPlayerChatPatrolSchedulerCore(
  input: AiPlayerChatPatrolSchedulerRunRequest,
  queue: AiPlayerChatPatrolSchedulerQueueSummary,
): Promise<AiPlayerChatPatrolSchedulerRunResponse> {
  const worldBefore = getWorldStateReadonly()
  const { players: targets, shard } = listPatrolSchedulerTargets(input)
  const items: AiPlayerChatPatrolSchedulerRunItem[] = []
  const autonomyGuard = buildPatrolAutonomyGuard()
  const providerBudgetTier = input.providerBudgetTier ?? 'economy_chat'
  const maxProviderRuns = input.providerBudgetTier === 'disabled'
    ? 0
    : input.providerBudgetMaxRuns === undefined
      ? null
      : Math.max(0, Math.min(50, Math.trunc(Number(input.providerBudgetMaxRuns))))
  let consumedProviderRuns = 0
  for (const target of targets) {
    if (providerBudgetTier === 'disabled') {
      items.push(toPatrolSchedulerBudgetSkipItem(target.aiPlayerId, 'provider_budget_disabled', providerBudgetTier))
      continue
    }
    if (maxProviderRuns !== null && consumedProviderRuns >= maxProviderRuns) {
      items.push(toPatrolSchedulerBudgetSkipItem(target.aiPlayerId, 'provider_budget_exhausted', providerBudgetTier))
      continue
    }
    consumedProviderRuns += 1
    const result = await triggerAiPlayerChatPatrolTick(target.aiPlayerId, {
      triggeredBy: input.triggeredBy?.trim() || 'ai_patrol_scheduler',
      triggerMode: 'scheduler',
      goalPower: input.goalPower,
      targetDevelopmentPoints: input.targetDevelopmentPoints,
      battleReportLimit: input.battleReportLimit,
      cooldownTicks: input.cooldownTicks,
      force: input.force,
    })
    items.push(toPatrolSchedulerRunItem(target.aiPlayerId, result))
  }

  const worldAfter = getWorldStateReadonly()
  const writtenCount = items.filter((item) => item.ok && !item.skipped && item.messageId).length
  const skippedCount = items.filter((item) => item.skipped || item.error === 'patrol_cooldown_active').length
  const budgetSkipCodes = new Set(['provider_budget_disabled', 'provider_budget_exhausted'])
  const failedCount = items.filter((item) => !item.ok
    && item.error !== 'patrol_cooldown_active'
    && !budgetSkipCodes.has(item.error ?? '')).length
  const providerBudgetSkippedCount = items.filter((item) => budgetSkipCodes.has(item.error ?? '')).length
  const response: AiPlayerChatPatrolSchedulerRunResponse = {
    ok: failedCount === 0,
    triggerMode: 'scheduler',
    scheduled: true,
    attemptedCount: items.length,
    writtenCount,
    skippedCount,
    failedCount,
    shard: {
      ...shard,
      selectedCount: targets.length,
    },
    providerBudget: {
      budgetTier: providerBudgetTier,
      maxRuns: maxProviderRuns,
      consumedRuns: consumedProviderRuns,
      remainingRuns: maxProviderRuns === null ? null : Math.max(0, maxProviderRuns - consumedProviderRuns),
      skippedCount: providerBudgetSkippedCount,
    },
    queue,
    items,
    autonomyGuard,
    tick: worldAfter.tick,
    worldVersionBefore: worldBefore.worldVersion,
    worldVersionAfter: worldAfter.worldVersion,
    error: failedCount > 0 ? 'patrol_scheduler_partial_failure' : undefined,
  }
  cachePatrolSchedulerIdempotentResponse(queue.idempotencyKey, response)
  return response
}

export function startAiPlayerChatPatrolScheduler(options: AiPlayerChatPatrolSchedulerOptions = {}): boolean {
  if (patrolSchedulerTimer) {
    return false
  }
  const intervalMs = Math.max(5_000, Math.min(3_600_000, Math.trunc(Number(options.intervalMs ?? 60_000))))
  patrolSchedulerTimer = setInterval(() => {
    runAiPlayerChatPatrolScheduler(options).catch((error) => {
      console.warn('[ai-chat-patrol-scheduler] run failed:', error instanceof Error ? error.message : error)
    })
  }, intervalMs)
  patrolSchedulerTimer.unref?.()
  return true
}

export function stopAiPlayerChatPatrolScheduler(): boolean {
  if (!patrolSchedulerTimer) {
    return false
  }
  clearInterval(patrolSchedulerTimer)
  patrolSchedulerTimer = null
  return true
}

function shouldExecuteExplicitFormationRosterImmediately(resolved: ResolvedChatProposal): boolean {
  const metadata = resolved.metadata ?? {}
  return resolved.action === 'troop_train'
    && resolved.source === 'human'
    && metadata.source === 'chat_explicit_formation_roster'
    && metadata.preferenceKind === 'formation_roster'
}

async function executeExplicitFormationRosterChatCommand(params: {
  runtime: GovernedAiPlayerRuntimeDetail
  channelId: string
  message: AiPlayerChatMessage
  resolved: ResolvedChatProposal
  voiceContext: ResolvedVoiceChatInput
  senderId: string
}): Promise<SendAiPlayerChatMessageResponse> {
  const { runtime, channelId, message, resolved, voiceContext, senderId } = params
  const metadata = resolved.metadata ?? {}
  const created = createAiPlayerActionProposal({
    aiPlayerId: runtime.aiPlayerId,
    action: resolved.action,
    args: resolved.args,
    reason: resolved.reason,
    source: resolved.source,
  })
  if (created.error || !created.proposal) {
    const failureCode = created.error ?? 'proposal_create_failed'
    const aiMessage = appendAiPlayerChatMessage({
      aiPlayerId: runtime.aiPlayerId,
      channelId,
      kind: 'message',
      authorType: 'ai',
      authorId: runtime.aiPlayerId,
      authorName: runtime.displayName,
      body: `我听懂了，但后端还没切成：${failureCode}。`,
      failureCode,
      metadata: {
        ...metadata,
        source: 'chat_explicit_formation_roster_execute_failed',
        failureCode,
        authorityPreserved: true,
      },
    })
    return {
      ok: false,
      channel: buildChannel(runtime, readMessageBucket(runtime.aiPlayerId).length),
      message,
      aiMessage,
      error: failureCode,
    }
  }

  let proposal = created.proposal
  if (proposal.status === 'pending_approval') {
    const approved = approveAiPlayerActionProposal(proposal.proposalId, { approvedBy: senderId })
    if (approved.error || !approved.proposal) {
      const failureCode = approved.error ?? 'proposal_approve_failed'
      const aiMessage = appendAiPlayerChatMessage({
        aiPlayerId: runtime.aiPlayerId,
        channelId,
        kind: 'message',
        authorType: 'ai',
        authorId: runtime.aiPlayerId,
        authorName: runtime.displayName,
        body: `我听懂了，但后端还没切成：${failureCode}。`,
        proposalId: proposal.proposalId,
        action: proposal.action,
        failureCode,
        metadata: {
          ...metadata,
          source: 'chat_explicit_formation_roster_execute_failed',
          proposalId: proposal.proposalId,
          failureCode,
          authorityPreserved: true,
        },
      })
      return {
        ok: false,
        channel: buildChannel(runtime, readMessageBucket(runtime.aiPlayerId).length),
        message,
        aiMessage,
        proposal,
        error: failureCode,
      }
    }
    proposal = approved.proposal
  }

  const executed = await executeAiPlayerActionProposal(proposal.proposalId, {
    executedBy: senderId,
    includeWorld: false,
  })
  if (executed.error || !executed.proposal || !executed.receipt) {
    const failureCode = executed.failureCode ?? executed.error ?? 'proposal_execution_failed'
    const aiMessage = appendAiPlayerChatMessage({
      aiPlayerId: runtime.aiPlayerId,
      channelId,
      kind: 'message',
      authorType: 'ai',
      authorId: runtime.aiPlayerId,
      authorName: runtime.displayName,
      body: `我听懂了，但后端还没切成：${failureCode}。`,
      proposalId: proposal.proposalId,
      action: proposal.action,
      failureCode,
      metadata: {
        ...metadata,
        source: 'chat_explicit_formation_roster_execute_failed',
        proposalId: proposal.proposalId,
        failureCode,
        authorityPreserved: true,
        recoveryHint: executed.recoveryHint,
      },
    })
    return {
      ok: false,
      channel: buildChannel(runtime, readMessageBucket(runtime.aiPlayerId).length),
      message,
      aiMessage,
      proposal: executed.proposal ?? proposal,
      error: failureCode,
    }
  }

  const requestedHeroNames = Array.isArray(metadata.requestedHeroNames)
    ? metadata.requestedHeroNames.map((item) => String(item).trim()).filter(Boolean)
    : []
  const targetTeamIndex = typeof metadata.targetTeamIndex === 'number' && Number.isFinite(metadata.targetTeamIndex)
    ? Math.floor(metadata.targetTeamIndex)
    : undefined
  const teamText = targetTeamIndex && targetTeamIndex > 0 ? `第${targetTeamIndex}队` : '这支队伍'
  const rosterText = requestedHeroNames.length > 0 ? `：${requestedHeroNames.join('、')}` : ''
  const replyBody = `${teamText}已经切换好了${rosterText}。`
  const speechMetadata = await buildAiSpeechMetadataFields(runtime, replyBody, voiceContext)
  const aiMessage = appendAiPlayerChatMessage({
    aiPlayerId: runtime.aiPlayerId,
    channelId,
    kind: 'message',
    authorType: 'ai',
    authorId: runtime.aiPlayerId,
    authorName: runtime.displayName,
    body: replyBody,
    proposalId: executed.proposal.proposalId,
    action: executed.proposal.action,
    receiptProposalId: executed.receipt.proposalId,
    receiptOk: executed.receipt.ok,
    metadata: {
      ...metadata,
      ...(speechMetadata ?? {}),
      source: 'chat_explicit_formation_roster_executed',
      proposalId: executed.proposal.proposalId,
      receiptProposalId: executed.receipt.proposalId,
      receiptOk: executed.receipt.ok,
      worldAction: executed.receipt.worldAction,
      authorityPreserved: true,
    },
  })
  return {
    ok: true,
    channel: buildChannel(runtime, readMessageBucket(runtime.aiPlayerId).length),
    message,
    aiMessage,
    proposal: executed.proposal,
    receipt: executed.receipt,
  }
}

export async function submitAiPlayerChatMessage(
  aiPlayerId: string,
  input: SendAiPlayerChatMessageRequest,
): Promise<SendAiPlayerChatMessageResponse> {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    return { ok: false, error: `ai player not found: ${aiPlayerId}` }
  }

  const channelId = `ai:${runtime.aiPlayerId}`
  const senderId = input.senderId?.trim() || runtime.governorPlayerId
  const senderName = input.senderName?.trim() || '总督'
  const voiceContext = await resolveVoiceChatInput(input)
  if (!voiceContext.body) {
    return { ok: false, error: 'chat message body is required' }
  }
  const message = appendAiPlayerChatMessage({
    aiPlayerId: runtime.aiPlayerId,
    channelId,
    kind: 'message',
    authorType: 'governor',
    authorId: senderId,
    authorName: senderName,
    body: voiceContext.body,
    metadata: voiceContext.userMetadata,
  })

  if (input.createProposal === false) {
    const replyBody = '收到，我会把这条命令记录到当前 AI 频道。'
    const speechMetadata = await buildAiSpeechMetadataFields(runtime, replyBody, voiceContext)
    const aiMessage = appendAiPlayerChatMessage({
      aiPlayerId: runtime.aiPlayerId,
      channelId,
      kind: 'message',
      authorType: 'ai',
      authorId: runtime.aiPlayerId,
      authorName: runtime.displayName,
      body: replyBody,
      metadata: speechMetadata ? {
        source: 'ai_player_speech_output',
        ...speechMetadata,
      } : undefined,
    })
    return {
      ok: true,
      channel: buildChannel(runtime, readMessageBucket(aiPlayerId).length),
      message,
      aiMessage,
    }
  }

  const chatDecision = resolveNaturalLanguageProposalDecision(voiceContext.body)
  if (chatDecision) {
    const pendingProposal = resolveLatestPendingProposalForChatDecision(runtime)
    if (pendingProposal) {
      const decisionResult = chatDecision === 'approve'
        ? approveAiPlayerActionProposal(pendingProposal.proposalId, { approvedBy: senderId })
        : rejectAiPlayerActionProposal(pendingProposal.proposalId, {
            rejectedBy: senderId,
            rejectionReason: 'chat_natural_language_reject',
          })
      if (decisionResult.proposal) {
        syncProposalChatMessagesAfterDecision(decisionResult.proposal)
        const replyBody = chatDecision === 'approve'
          ? '已批准。等我执行后再回报。'
          : '已驳回。我不会执行这件事。'
        const speechMetadata = await buildAiSpeechMetadataFields(runtime, replyBody, voiceContext)
        const aiMessage = appendAiPlayerChatMessage({
          aiPlayerId: runtime.aiPlayerId,
          channelId,
          kind: 'message',
          authorType: 'ai',
          authorId: runtime.aiPlayerId,
          authorName: runtime.displayName,
          body: replyBody,
          proposalId: decisionResult.proposal.proposalId,
          action: decisionResult.proposal.action,
          metadata: {
            source: 'chat_natural_language_proposal_decision',
            decision: chatDecision,
            status: decisionResult.proposal.status,
            ...(speechMetadata ?? {}),
            authorityPreserved: true,
          },
        })
        return {
          ok: true,
          channel: buildChannel(runtime, readMessageBucket(aiPlayerId).length),
          message,
          aiMessage,
          proposal: decisionResult.proposal,
        }
      }
    }
  }

  const resolved = await resolveChatProposal(runtime, voiceContext.body)
  if (!resolved) {
    const replyBody = '收到。我已记录目标，但这句话暂未命中可执行提案模板。'
    const speechMetadata = await buildAiSpeechMetadataFields(runtime, replyBody, voiceContext)
    const aiMessage = appendAiPlayerChatMessage({
      aiPlayerId: runtime.aiPlayerId,
      channelId,
      kind: 'message',
      authorType: 'ai',
      authorId: runtime.aiPlayerId,
      authorName: runtime.displayName,
      body: replyBody,
      metadata: speechMetadata ? {
        source: 'ai_player_speech_output',
        ...speechMetadata,
      } : undefined,
    })
    return {
      ok: true,
      channel: buildChannel(runtime, readMessageBucket(aiPlayerId).length),
      message,
      aiMessage,
    }
  }

  if ('error' in resolved) {
    const aiMessage = isProviderBudgetDowngradeError(resolved.error)
      ? appendProviderBudgetDowngradeChatMessage({
          runtime,
          error: resolved.error,
          source: 'chat_provider_budget_downgrade',
          trigger: 'chat_command',
          triggeredBy: senderId,
        })
      : appendModelFailureDowngradeChatMessage({
          runtime,
          error: resolved.error,
          source: 'chat_model_failure_downgrade',
          trigger: 'chat_command',
          triggeredBy: senderId,
        })
    return {
      ok: true,
      channel: buildChannel(runtime, readMessageBucket(aiPlayerId).length),
      message,
      aiMessage,
    }
  }

  if ('idle' in resolved) {
    const speechMetadata = await buildAiSpeechMetadataFields(runtime, resolved.summary, voiceContext)
    const aiMessage = appendAiPlayerChatMessage({
      aiPlayerId: runtime.aiPlayerId,
      channelId,
      kind: 'message',
      authorType: 'ai',
      authorId: runtime.aiPlayerId,
      authorName: runtime.displayName,
      body: resolved.summary,
      metadata: {
        ...resolved.metadata,
        ...(speechMetadata ?? {}),
        authorityPreserved: true,
      },
    })
    return {
      ok: true,
      channel: buildChannel(runtime, readMessageBucket(aiPlayerId).length),
      message,
      aiMessage,
    }
  }

  if (shouldExecuteExplicitFormationRosterImmediately(resolved)) {
    return executeExplicitFormationRosterChatCommand({
      runtime,
      channelId,
      message,
      resolved,
      voiceContext,
      senderId,
    })
  }

  const created = createAiPlayerActionProposal({
    aiPlayerId: runtime.aiPlayerId,
    action: resolved.action,
    args: resolved.args,
    reason: resolved.reason,
    source: resolved.source,
  })
  if (created.error || !created.proposal) {
    const aiMessage = appendAiPlayerChatMessage({
      aiPlayerId: runtime.aiPlayerId,
      channelId,
      kind: 'system',
      authorType: 'system',
      authorId: AI_SYSTEM_AUTHOR_ID,
      authorName: '系统',
      body: `提案生成失败：${created.error ?? 'proposal_create_failed'}`,
      metadata: {
        failureCode: created.error ?? 'proposal_create_failed',
      },
    })
    return {
      ok: false,
      channel: buildChannel(runtime, readMessageBucket(aiPlayerId).length),
      message,
      aiMessage,
      error: created.error ?? 'proposal_create_failed',
    }
  }

  const proposal: AiPlayerActionProposal = created.proposal
  const speechMetadata = await buildAiSpeechMetadataFields(runtime, resolved.summary, voiceContext)
  const proposalMessage = appendAiPlayerChatMessage({
    aiPlayerId: runtime.aiPlayerId,
    channelId,
    kind: 'proposal',
    authorType: 'ai',
    authorId: runtime.aiPlayerId,
    authorName: runtime.displayName,
    body: resolved.summary,
    proposalId: proposal.proposalId,
    action: proposal.action,
    metadata: {
      status: proposal.status,
      requiresApproval: proposal.requiresApproval,
      resources: proposal.args && typeof proposal.args === 'object' ? (proposal.args as Record<string, unknown>).resources : undefined,
      ...resolved.metadata,
      ...(speechMetadata ?? {}),
      recoveryHint: proposal.recoveryHint,
    },
  })
  const aggregateMessage = recordBattleReportFollowupAggregateIfReady(proposal)

  return {
    ok: true,
    channel: buildChannel(runtime, readMessageBucket(aiPlayerId).length),
    message,
    proposalMessage,
    aggregateMessage: aggregateMessage ?? undefined,
    proposal,
  }
}

export function recordAiPlayerProposalInChat(proposal: AiPlayerActionProposal): {
  proposalMessage: AiPlayerChatMessage | null
  aggregateMessage: AiPlayerChatMessage | null
} {
  const runtime = getGovernedAiPlayerRuntime(proposal.aiPlayerId)
  if (!runtime) {
    return {
      proposalMessage: null,
      aggregateMessage: null,
    }
  }

  const statusLabel = proposal.status === 'pending_approval' ? '待批准' : proposal.status
  const proposalMessage = appendAiPlayerChatMessage({
    aiPlayerId: runtime.aiPlayerId,
    channelId: `ai:${runtime.aiPlayerId}`,
    kind: 'proposal',
    authorType: 'ai',
    authorId: runtime.aiPlayerId,
    authorName: runtime.displayName,
    body: `已生成提案：${formatAiActionForPlayer(proposal.action)}（${statusLabel}）。${proposal.reason}`,
    proposalId: proposal.proposalId,
    action: proposal.action,
    metadata: {
      status: proposal.status,
      requiresApproval: proposal.requiresApproval,
      source: proposal.source,
      riskLevel: proposal.riskLevel,
      recoveryHint: proposal.recoveryHint,
    },
  })

  return {
    proposalMessage,
    aggregateMessage: recordBattleReportFollowupAggregateIfReady(proposal),
  }
}

export function recordAiPlayerReceiptInChat(receipt: AiPlayerActionReceipt): AiPlayerChatMessage | null {
  const runtime = getGovernedAiPlayerRuntime(receipt.aiPlayerId)
  if (!runtime) {
    return null
  }

  const actionLabel = formatWorldActionForPlayer(receipt.worldAction, receipt.action)
  const failure = receipt.failureCode ? formatFailureCodeForPlayer(receipt.failureCode) : ''
  const addressing = resolveAiPlayerMessageAddressing(runtime)
  const body = receipt.ok
    ? `${addressing.value}，${actionLabel}已经办妥了，行动记录也记上了。`
    : `${addressing.value}，${actionLabel}没办成，原因是${failure || '未知失败'}；我先停住，不会绕过审批继续做。`
  const receiptMessage = appendAiPlayerChatMessage({
    aiPlayerId: runtime.aiPlayerId,
    channelId: `ai:${runtime.aiPlayerId}`,
    kind: 'receipt',
    ...buildAiAuthor(runtime),
    body,
    receiptProposalId: receipt.proposalId,
    action: receipt.action,
    receiptOk: receipt.ok,
    failureCode: receipt.failureCode,
    metadata: {
      messageStyle: 'ai_player_emotional_receipt_v1',
      receiptNarrative: {
        styleVersion: 'ai_player_emotional_receipt_v1',
        outcome: receipt.ok ? 'success' : 'failure',
        action: receipt.action,
        worldAction: receipt.worldAction,
        ...(receipt.failureCode ? { failureCode: receipt.failureCode } : {}),
        authorityPreserved: true,
      },
      worldAction: receipt.worldAction,
      actionRequestId: receipt.actionRequestId,
      addressing,
      recoveryHint: receipt.recoveryHint,
    },
  })
  recordMarchMoveExecutedAggregateIfReady(receipt)
  return receiptMessage
}

export function recordAiPlayerAutonomousDevelopmentResultInChat(input: {
  aiPlayerId: string
  body: string
  action: AiPlayerActionType
  receiptProposalId?: string
  receiptOk?: boolean
  metadata?: Record<string, unknown>
}): AiPlayerChatMessage | null {
  const runtime = getGovernedAiPlayerRuntime(input.aiPlayerId)
  if (!runtime) {
    return null
  }

  return appendAiPlayerChatMessage({
    aiPlayerId: runtime.aiPlayerId,
    channelId: `ai:${runtime.aiPlayerId}`,
    kind: 'receipt',
    ...buildAiAuthor(runtime),
    body: input.body,
    receiptProposalId: input.receiptProposalId,
    action: input.action,
    receiptOk: input.receiptOk ?? true,
    metadata: {
      source: 'autonomous_development_executor',
      ...input.metadata,
    },
  })
}

export async function recordAiPlayerAutonomousCombatDefaultEventInChat(input: {
  aiPlayerId: string
  source: AiPlayerAutonomousCombatDefaultEventChatSource
  eventKey: string
  body: string
  rewriteContext?: Record<string, unknown>
  metadata?: Record<string, unknown>
  throttleMs?: number
}): Promise<AiPlayerChatMessage | null> {
  const runtime = getGovernedAiPlayerRuntime(input.aiPlayerId)
  if (!runtime) {
    return null
  }
  const source = input.source
  if (!shouldRecordAutonomousCombatDefaultEvent(runtime, source)) {
    return null
  }
  const eventKey = input.eventKey.trim()
  const body = sanitizeAiPlayerAutonomousCombatChatCopy(input.body).slice(0, 1000)
  if (!eventKey || !body) {
    return null
  }
  const bucket = readMessageBucket(runtime.aiPlayerId)
  const duplicate = bucket.some((message) => (
    String(message.metadata?.source ?? '') === source
    && String(message.metadata?.eventKey ?? '') === eventKey
  ))
  if (duplicate) {
    return null
  }
  const throttleMs = Math.max(0, Math.trunc(Number(input.throttleMs ?? 60_000) || 0))
  if (throttleMs > 0) {
    const now = Date.now()
    const throttled = bucket.some((message) => {
      if (String(message.metadata?.source ?? '') !== source) {
        return false
      }
      const createdAtMs = Date.parse(message.createdAt)
      return Number.isFinite(createdAtMs) && now - createdAtMs < throttleMs
    })
    if (throttled) {
      return null
    }
    const windowMax = Math.max(1, Math.min(20, Math.trunc(Number(process.env.AI_PLAYER_COMBAT_DEFAULT_CHAT_MAX_MESSAGES_PER_WINDOW ?? 5) || 5)))
    const defaultEventMessageCount = bucket.filter((message) => {
      if (message.metadata?.defaultEventReportEnabled !== true) {
        return false
      }
      const createdAtMs = Date.parse(message.createdAt)
      return Number.isFinite(createdAtMs) && now - createdAtMs < throttleMs
    }).length
    if (defaultEventMessageCount >= windowMax) {
      return null
    }
  }

  const rewrittenBody = await rewriteAiPlayerAutonomousCombatDefaultEventBody({
    runtime,
    source,
    body,
    rewriteContext: input.rewriteContext,
  })
  const speakableText = rewrittenBody.replace(/\s+/g, ' ').trim()
  const allowMockAudioFallback = shouldAllowCombatDefaultReportMockAudioFallback()
  const voiceAvailability = buildAutonomousCombatEventVoiceAvailability(source, buildAiPlayerVoiceAvailability({
    runtimePolicy: runtime.runtimePolicy,
    allowMockAudioFallback,
  }))
  const followUpIntent = buildAutonomousCombatFollowUpIntent({
    aiPlayerId: runtime.aiPlayerId,
    source,
    battleDigest: input.rewriteContext?.battleDigest,
  })
  const speechMetadata = runtime.runtimePolicy.allowAutonomousCombatVoiceReports === true
    ? await buildAiPlayerAutonomousCombatDefaultEventSpeechMetadata(runtime, speakableText, allowMockAudioFallback)
    : undefined
  return appendAiPlayerChatMessage({
    aiPlayerId: runtime.aiPlayerId,
    channelId: `ai:${runtime.aiPlayerId}`,
    kind: 'message',
    ...buildAiAuthor(runtime),
    body: rewrittenBody,
    metadata: {
      source,
      eventKey,
      authorityPreserved: true,
      reportDisplayName: runtime.displayName,
      defaultEventReportEnabled: true,
      speakableText,
      voicePlaybackIntent: 'ai_player_chat_report',
      voicePlaybackReady: Boolean(speechMetadata?.speechContract?.audioAssetId),
      voiceAvailability,
      ...(followUpIntent ? { followUpIntent } : {}),
      ...(speechMetadata ?? {}),
      ...(input.metadata ?? {}),
    },
  })
}

function buildAutonomousCombatFollowUpIntent(input: {
  aiPlayerId: string
  source: AiPlayerAutonomousCombatDefaultEventChatSource
  battleDigest?: unknown
}) {
  const digest = input.battleDigest && typeof input.battleDigest === 'object'
    ? input.battleDigest as Record<string, unknown>
    : null
  if (!digest) {
    return null
  }
  const hotspots = Array.isArray(digest.targetHotspots)
    ? digest.targetHotspots.filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    : []
  const primaryHotspot = hotspots[0]
  const center = primaryHotspot?.center && typeof primaryHotspot.center === 'object'
    ? primaryHotspot.center as Record<string, unknown>
    : null
  const x = Number(center?.x)
  const y = Number(center?.y)
  if (!primaryHotspot || !Number.isFinite(x) || !Number.isFinite(y)) {
    return null
  }
  const hotspotId = String(primaryHotspot.hotspotId ?? `coordinate:${Math.trunc(x)}:${Math.trunc(y)}`).trim()
  const observedReportCount = Math.max(0, Math.trunc(Number(digest.relevantBattleReportCount ?? digest.retainedBattleRecordCount ?? 0) || 0))
  const omittedReportCount = Math.max(0, Math.trunc(Number(digest.omittedRelevantReportCount ?? 0) || 0))
  const hotspotReportCount = Math.max(0, Math.trunc(Number(primaryHotspot.reportCount ?? 0) || 0))
  const coordinateText = `坐标(${Math.trunc(x)},${Math.trunc(y)})附近`
  return {
    intentKind: 'coordinate_hotspot_watch',
    status: 'watching',
    source: input.source,
    hotspotId,
    center: {
      x: Math.trunc(x),
      y: Math.trunc(y),
    },
    observedReportCount,
    omittedReportCount,
    hotspotReportCount,
    playerFacingStatus: `我会继续盯${coordinateText}，有新战报、来袭、失败或集结变化再主动告诉你。`,
    triggerCondition: `新战报、敌军来袭、驻防失败、同盟集结结果变化时，重新检查${coordinateText}。`,
  }
}

async function rewriteAiPlayerAutonomousCombatDefaultEventBody(input: {
  runtime: GovernedAiPlayerRuntimeDetail
  source: AiPlayerAutonomousCombatDefaultEventChatSource
  body: string
  rewriteContext?: Record<string, unknown>
}): Promise<string> {
  if (process.env.AI_PLAYER_COMBAT_NARRATIVE_REWRITE_ENABLED?.trim() !== 'true') {
    return input.body
  }
  const candidates = resolveAiPlayerRuntimeModelTargetCandidates({
    factionId: input.runtime.factionId,
    ownerPlayerId: input.runtime.governorPlayerId,
  })
  const candidate = candidates.find((item) => item.target.apiKeys.length > 0)
  const apiKey = candidate?.target.apiKeys[0]?.trim()
  if (!candidate || !apiKey) {
    return input.body
  }
  const eventLabel = buildAutonomousCombatEventVoiceAvailability(input.source, {
    status: 'unconfigured',
    label: '',
    summary: '',
    canPlayVoice: false,
    fallbackMode: 'silent',
  }).label.replace('语音未配置', '').trim() || input.source
  const controller = new AbortController()
  const timeoutMs = Math.max(1_000, Math.min(20_000, Math.trunc(Number(process.env.AI_PLAYER_COMBAT_NARRATIVE_REWRITE_TIMEOUT_MS ?? 5_000) || 5_000)))
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${candidate.target.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: candidate.target.model,
        temperature: 0.7,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content: [
              '你是 SLG 世界里的 AI 玩家，不是旁白、不是军师、不是系统。',
              '把后端战况事实改写成这个 AI 玩家对真人玩家说的一段自然中文，像真人玩家在聊天频道里收到同伴消息。',
              '以 aiPlayerName 代表的身份说话，但不要把自己的名字当标题，也不要反复喊自己的名字。',
              '不要用“战情汇报：”“战况：”这类模板开头，不要写公告、报告、总结标题。',
              '先说发生了什么，再说我接下来会怎么盯；能用第一人称就用第一人称。',
              '如果 battleDigest 里显示 omittedRelevantReportCount 大于 0，要体现“我看的是一批战报，只挑坐标热点说”，不要装成只看见一两条。',
              '地图是大坐标世界；可以说“坐标(x,y)附近”“某个坐标热点”，不要把未知位置硬编成东线、西门、北侧这类固定地名。',
              '不使用“老兄”“哥们”这类过度口语称呼，也不要装成军师训话。',
              '控制在2到4句，短句优先；可以有一点性格，但不要油腻、不要喊口号。',
              '不要说“系统自己推断”“界面自己推断”，改成“我来核对”“我来盯住结果”。',
              '必须保留事实，不编造未发生的胜负、战损或已执行结果。',
              '不得输出 JSON、字段名、英文工程 id、provider/env/key、proposalId、worldAction、stateKind、regionId、push。',
            ].join('\n'),
          },
          {
            role: 'user',
            content: JSON.stringify({
              aiPlayerName: input.runtime.displayName,
              eventType: eventLabel,
              facts: input.body,
              battleDigest: input.rewriteContext?.battleDigest ?? null,
            }),
          },
        ],
      }),
    })
    if (!response.ok) {
      return input.body
    }
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> }
    const sanitized = sanitizeAiPlayerAutonomousCombatChatCopy(String(payload.choices?.[0]?.message?.content ?? ''))
    if (!sanitized || sanitized.length < 12) {
      return input.body
    }
    if (/[{}[\]]/.test(sanitized) || /proposalId|worldAction|queuePlanExecution|stateKind|regionId|battleDigest|provider|env|key|MIMO_API_KEY|east_expansion|west_front|frontline_east|neutral_neighbor|war-room|push/i.test(sanitized)) {
      return input.body
    }
    return sanitized.slice(0, 1000)
  } catch {
    return input.body
  } finally {
    clearTimeout(timeout)
  }
}

function sanitizeAiPlayerAutonomousCombatChatCopy(text: string) {
  return text
    .replace(/\beast_expansion\b/gi, '东线扩张方向')
    .replace(/\bwest_front\b/gi, '西线前沿')
    .replace(/\bfrontline_east\b/gi, '东线前沿')
    .replace(/\bneutral_neighbor\b/gi, '中立邻邦')
    .replace(/\bwar-room\b/gi, '战情室')
    .replace(/\boutcome\b/gi, '结果')
    .replace(/不让系统自己推断结果/g, '我来核对结果')
    .replace(/不让界面自己推断结果/g, '我来核对结果')
    .replace(/别让系统自己推断结果/g, '我来核对结果')
    .replace(/别让界面自己推断结果/g, '我来核对结果')
    .replace(/proposalId|worldAction|queuePlanExecution|alliance_defense_assign|alliance_defense_batch_assign|stateKind|regionId|battleDigest|provider|env|key|MIMO_API_KEY|AI_PLAYER_RUNTIME_MODEL_API_KEY|JSON|push/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildAutonomousCombatEventVoiceAvailability(
  source: AiPlayerAutonomousCombatDefaultEventChatSource,
  baseAvailability: ReturnType<typeof buildAiPlayerVoiceAvailability>,
) {
  const copy = { ...baseAvailability }
  const copyBySource: Record<AiPlayerAutonomousCombatDefaultEventChatSource, { label: string; summary: string }> = {
    autonomous_combat_daily_summary_report: {
      label: '今日总结语音未配置',
      summary: '已保留文字总结，配置语音服务后可播放今日战况。',
    },
    autonomous_combat_siege_report: {
      label: '攻城播报语音未配置',
      summary: '攻城结束已用文字记录，配置语音服务后可播放攻城播报。',
    },
    autonomous_combat_incoming_attack_report: {
      label: '来袭提醒语音未配置',
      summary: '敌军来袭已用文字提醒，配置语音服务后可播放来袭提醒。',
    },
    autonomous_combat_defense_outcome_report: {
      label: '驻防结果语音未配置',
      summary: '驻防结果已用文字复盘，配置语音服务后可播放防守结果。',
    },
    autonomous_combat_war_room_report: {
      label: '战情汇报语音未配置',
      summary: '战情室汇报已用文字保留，配置语音服务后可播放战情汇报。',
    },
  }
  if (copy.status === 'available') {
    return copy
  }
  const eventCopy = copyBySource[source]
  return {
    ...copy,
    label: eventCopy.label,
    summary: eventCopy.summary,
  }
}

async function buildAiPlayerAutonomousCombatDefaultEventSpeechMetadata(
  runtime: GovernedAiPlayerRuntimeDetail,
  speakableText: string,
  allowMockAudioFallback = false,
): Promise<AiSpeechMetadataFields | undefined> {
  const text = speakableText.trim()
  if (!text) {
    return undefined
  }
  try {
    const availability = buildAiPlayerVoiceAvailability({
      runtimePolicy: runtime.runtimePolicy,
      allowMockAudioFallback,
    })
    if (!availability.canPlayVoice) {
      return undefined
    }
    ensureAiPlayerConfiguredVoiceProviderAdaptersRegistered()
    const activeVoiceSelection = getActiveAiPlayerVoiceProfileSelection(runtime.aiPlayerId).selection
    const voiceProfile = resolveAiPlayerVoiceProfileForSynthesis(activeVoiceSelection.voiceProfileId)
    const adapter = getAiPlayerVoiceProviderAdapter(undefined, 'tts')
    const result = await adapter.synthesizeSpeech({
      aiPlayerId: runtime.aiPlayerId,
      text,
      voiceProfileId: voiceProfile.publicProfile.voiceProfileId,
      providerVoice: voiceProfile.adapterProfile.providerVoice,
      stylePrompt: voiceProfile.adapterProfile.stylePrompt,
    })
    return {
      speechSource: 'ai_player_speech_output',
      speechPolicyReason: 'speech_output_always',
      usageType: 'tts',
      usageBreakdown: mergeVoiceUsageBreakdown({
        tts: result.speechContract,
      }),
      speechContract: result.speechContract,
    }
  } catch {
    return undefined
  }
}

function shouldRecordAutonomousCombatDefaultEvent(
  runtime: GovernedAiPlayerRuntimeDetail,
  source: AiPlayerAutonomousCombatDefaultEventChatSource,
): boolean {
  if (source === 'autonomous_combat_daily_summary_report') {
    return runtime.runtimePolicy.allowAutonomousCombatDailySummaryChatReports !== false
  }
  return runtime.runtimePolicy.allowAutonomousCombatWarEventChatReports !== false
}

export async function recordAiPlayerAutonomousCombatWarRoomReportInChat(input: {
  aiPlayerId: string
  refresh: Record<string, unknown>
}): Promise<AiPlayerChatMessage | null> {
  const runtime = getGovernedAiPlayerRuntime(input.aiPlayerId)
  if (!runtime) {
    return null
  }
  const refreshSequence = String(input.refresh.pushSequence ?? input.refresh.latestTick ?? '').trim()
  const accessScope = input.refresh.warRoomAccessScope && typeof input.refresh.warRoomAccessScope === 'object'
    ? input.refresh.warRoomAccessScope as Record<string, unknown>
    : {}
  const outcomeRows = Array.isArray(input.refresh.defenseExecutionOutcomeRows)
    ? input.refresh.defenseExecutionOutcomeRows as Array<Record<string, unknown>>
    : []
  const firstOutcome = outcomeRows.find((row) => row && typeof row === 'object') ?? {}
  const permissionText = String(accessScope.permissionSummary ?? '').trim()
  const outcomeText = String(firstOutcome.playerFacingSummary ?? firstOutcome.lossSummary ?? '').trim()
  const counterText = String(firstOutcome.counterAdviceSummary ?? '').trim()
  const refreshText = String(input.refresh.playerFacingSummary ?? '').trim()
  const battleDigest = input.refresh.battleDigest && typeof input.refresh.battleDigest === 'object'
    ? input.refresh.battleDigest as Record<string, unknown>
    : null
  const digestText = String(battleDigest?.playerFacingSummary ?? '').trim()
  const bodyParts = [
    `${runtime.displayName}战情汇报：战情室已刷新。`,
    permissionText,
    refreshText,
    digestText && !refreshText.includes(digestText) ? digestText : '',
    outcomeText,
    counterText ? `反制建议：${counterText}` : '',
  ].map((part) => part.trim()).filter(Boolean)
  return recordAiPlayerAutonomousCombatDefaultEventInChat({
    aiPlayerId: input.aiPlayerId,
    source: 'autonomous_combat_war_room_report',
    eventKey: `war-room:${refreshSequence || 'latest'}`,
    body: bodyParts.join(' '),
    rewriteContext: {
      battleDigest,
    },
    metadata: {
      refreshSequence: refreshSequence || undefined,
    },
  })
}

export function recordAiPlayerProposalFailureInChat(input: {
  proposal: AiPlayerActionProposal
  failureCode: string
  error: string
  recoveryHint?: AiPlayerRecoveryHint
}): AiPlayerChatMessage | null {
  const runtime = getGovernedAiPlayerRuntime(input.proposal.aiPlayerId)
  if (!runtime) {
    return null
  }

  return appendAiPlayerChatMessage({
    aiPlayerId: runtime.aiPlayerId,
    channelId: `ai:${runtime.aiPlayerId}`,
    kind: 'receipt',
    ...buildAiAuthor(runtime),
    body: `执行失败：${formatAiActionForPlayer(input.proposal.action)}，失败原因：${formatFailureCodeForPlayer(input.failureCode)}`,
    receiptProposalId: input.proposal.proposalId,
    action: input.proposal.action,
    receiptOk: false,
    failureCode: input.failureCode,
    metadata: {
      error: input.error,
      status: input.proposal.status,
      proposalArgs: input.proposal.args,
      recoveryHint: input.recoveryHint,
    },
  })
}

export function recordUnifiedInboxClaimInChat(input: {
  aiPlayerId: string
  item: UnifiedInboxItem
  ok: boolean
  worldAction: UnifiedInboxClaimAction
  result?: unknown
  error?: string
}): AiPlayerChatMessage | null {
  const runtime = getGovernedAiPlayerRuntime(input.aiPlayerId)
  if (!runtime) {
    return null
  }

  const action: AiPlayerActionType = input.item.kind === 'ai_resource_transfer'
    ? 'resource_transfer_to_governor'
    : 'reward_claim'
  const failureCode = input.ok ? '' : readFailureCodeFromUnknown(input.result, input.error)
  const title = input.item.title.trim() || '通用收件箱'
  const body = input.ok
    ? `已领取：${title}，${formatInboxItemPayloadForPlayer(input.item)}。`
    : `领取失败：${title}，失败原因：${formatFailureCodeForPlayer(failureCode)}。`

  return appendAiPlayerChatMessage({
    aiPlayerId: runtime.aiPlayerId,
    channelId: `ai:${runtime.aiPlayerId}`,
    kind: 'receipt',
    ...buildAiAuthor(runtime),
    body,
    action,
    receiptOk: input.ok,
    failureCode: failureCode || null,
    metadata: {
      itemId: input.item.itemId,
      inboxKind: input.item.kind,
      worldAction: input.worldAction,
      resources: input.item.resources,
      reward: input.item.reward,
      result: input.result,
    },
  })
}
