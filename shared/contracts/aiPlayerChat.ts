import type {
  AiPlayerActionProposal,
  AiPlayerActionReceipt,
  AiPlayerActionRiskLevel,
  AiPlayerActionType,
  AiPlayerBattleReportSeverity,
  AiPlayerDevelopmentPlanActionReadiness,
  AiPlayerModelBudgetTier,
} from './aiPlayer'
import type {
  AiPlayerAsrSummary,
  AiPlayerSpeechContract,
  AiPlayerVoiceCommandRequest,
  AiPlayerVoiceAvailability,
  AiPlayerVoiceUsageBreakdown,
  AiPlayerVoiceUsageType,
} from './aiPlayerVoice'

export type AiPlayerChatMessageKind = 'message' | 'proposal' | 'receipt' | 'system'

export type AiPlayerChatAuthorType = 'governor' | 'ai' | 'system'

export type AiPlayerChatHistoryFilter = 'all' | 'command' | 'proposal' | 'receipt' | 'failure'

export type AiPlayerChatHistoryCounts = Record<AiPlayerChatHistoryFilter, number>

export type AiPlayerChatPatrolTickTriggerMode = 'manual' | 'scheduler'

export type AiPlayerProactivePatrolMessageReason =
  | 'battle_high_loss'
  | 'battle_victory'
  | 'action_ready_for_approval'
  | 'human_input_needed'
  | 'patrol_heartbeat'

export type AiPlayerProactivePatrolTriggerCondition = {
  policyVersion: 'patrol_proactive_trigger_v1'
  reason: AiPlayerProactivePatrolMessageReason
  source: 'battle_report' | 'development_plan' | 'patrol_heartbeat'
  cooldownMinutes: number
  requiresHumanApproval: true
  noAutonomousExecution: true
}

export type AiPlayerProactivePatrolMessageMetadata = {
  source: 'patrol_proactive_message'
  triggerMode: AiPlayerChatPatrolTickTriggerMode
  proactiveReason: AiPlayerProactivePatrolMessageReason
  severity: 'low' | 'medium' | 'high'
  cooldownMinutes: number
  triggerCondition: AiPlayerProactivePatrolTriggerCondition
  relatedReportId?: string
  suggestedAction?: AiPlayerActionType
  blockers?: string[]
  addressing: {
    value: string
    source: 'identity_context' | 'neutral_fallback'
  }
}

export type AiPlayerReceiptChatNarrative = {
  styleVersion: 'ai_player_emotional_receipt_v1'
  outcome: 'success' | 'failure'
  action: AiPlayerActionType
  worldAction?: string
  failureCode?: string | null
  authorityPreserved: true
}

export type AiPlayerReceiptChatMetadata = {
  messageStyle: 'ai_player_emotional_receipt_v1'
  receiptNarrative: AiPlayerReceiptChatNarrative
  worldAction?: string
  actionRequestId?: string
  addressing: {
    value: string
    source: 'identity_context' | 'neutral_fallback'
  }
  recoveryHint?: unknown
}

export type AiPlayerChatVoiceMetadata = {
  source: 'voice_command_text' | 'voice_command_audio' | 'ai_player_speech_output'
  speechPolicyReason?: 'explicit_voice_context' | 'speech_output_always' | 'speech_output_emotional_context' | 'speech_output_disabled'
  usageType?: AiPlayerVoiceUsageType
  usageBreakdown?: AiPlayerVoiceUsageBreakdown
  asr?: AiPlayerAsrSummary
  speechContract?: AiPlayerSpeechContract
  voiceAvailability?: AiPlayerVoiceAvailability
}

export type AiPlayerChatPatrolAutonomyGuard = {
  mode: 'approval_only'
  autonomousExecutionEnabled: false
  minIntervalMinutes: number
  authorityPreserved: true
  decision: 'disabled'
  reason: 'autonomous_execution_not_enabled'
  pendingApprovalBlocksExecution: true
}

export type AiPlayerChatMessage = {
  messageId: string
  aiPlayerId: string
  channelId: string
  kind: AiPlayerChatMessageKind
  authorType: AiPlayerChatAuthorType
  authorId: string
  authorName: string
  body: string
  createdAt: string
  proposalId?: string
  receiptProposalId?: string
  action?: AiPlayerActionType
  receiptOk?: boolean
  failureCode?: string | null
  metadata?: Record<string, unknown>
}

export type AiPlayerChatChannel = {
  channelId: string
  aiPlayerId: string
  label: string
  avatarId?: string
  avatarImagePath?: string
  governorPlayerId: string
  factionId: string
  messageCount: number
}

export type AiPlayerChatReadCursor = {
  aiPlayerId: string
  channelId: string
  readerId: string
  readMessageCount: number
  messageCount: number
  unreadCount: number
  updatedAt: string
}

export type SendAiPlayerChatMessageRequest = {
  body?: string
  senderId?: string
  senderName?: string
  createProposal?: boolean
  voice?: AiPlayerVoiceCommandRequest
}

export type AiPlayerChatPatrolTickRequest = {
  triggeredBy?: string
  triggerMode?: AiPlayerChatPatrolTickTriggerMode
  goalPower?: number
  targetDevelopmentPoints?: number
  battleReportLimit?: number
  cooldownTicks?: number
  force?: boolean
}

export type AiPlayerChatPatrolSchedulerRunRequest = {
  triggeredBy?: string
  queueRunId?: string
  idempotencyKey?: string
  leaseId?: string
  leaseTtlMs?: number
  retryAfterMs?: number
  backoffMs?: number
  aiPlayerIds?: string[]
  governorPlayerId?: string
  factionId?: string
  shardIndex?: number
  shardCount?: number
  samplingStrategy?: 'registration_order' | 'active_first'
  limit?: number
  goalPower?: number
  targetDevelopmentPoints?: number
  battleReportLimit?: number
  cooldownTicks?: number
  providerBudgetTier?: AiPlayerModelBudgetTier
  providerBudgetMaxRuns?: number
  force?: boolean
}

export type AiPlayerChatPatrolTickProposalSummary = {
  action: AiPlayerActionType
  label: string
  readiness: AiPlayerDevelopmentPlanActionReadiness
  riskLevel: AiPlayerActionRiskLevel
  args?: Record<string, unknown>
  proposalArgs?: Record<string, unknown>
  proposalReason?: string
  priorityScore?: number
  priorityReason?: string
  targetUnitId?: string
  targetTileId?: string
  reason: string
  blockers: string[]
}

export type AiPlayerChatPatrolTickDevelopmentSummary = {
  tick: number
  worldVersion: number
  goalSummary: string
  readyCandidateCount: number
  blockedCandidateCount: number
  riskItemCount: number
}

export type AiPlayerChatPatrolTickBattleReportSummary = {
  count: number
  latestReportId?: string
  latestOutcome?: string
  latestSeverity?: AiPlayerBattleReportSeverity
  latestNextStepSuggestion?: string
}

export type UpdateAiPlayerChatReadCursorRequest = {
  readerId: string
  readMessageCount?: number
  readMessageId?: string
}

export type AiPlayerChatChannelResponse = {
  channel: AiPlayerChatChannel
  messages: AiPlayerChatMessage[]
  count: number
  filter?: AiPlayerChatHistoryFilter
  beforeMessageId?: string
  totalCount?: number
  hasMore?: boolean
  nextBeforeMessageId?: string
  historyCounts?: AiPlayerChatHistoryCounts
  readCursor?: AiPlayerChatReadCursor
  unreadCount?: number
}

export type SendAiPlayerChatMessageResponse = {
  ok: boolean
  channel?: AiPlayerChatChannel
  message?: AiPlayerChatMessage
  aiMessage?: AiPlayerChatMessage
  proposalMessage?: AiPlayerChatMessage
  aggregateMessage?: AiPlayerChatMessage
  proposal?: AiPlayerActionProposal
  receipt?: AiPlayerActionReceipt
  error?: string
}

export type AiPlayerChatPatrolTickResponse = {
  ok: boolean
  channel?: AiPlayerChatChannel
  message?: AiPlayerChatMessage
  proactiveMessage?: AiPlayerChatMessage
  modelProposalMessage?: AiPlayerChatMessage
  modelDowngradeMessage?: AiPlayerChatMessage
  modelProposal?: AiPlayerActionProposal
  modelProposalError?: string
  modelProposalSkippedReason?: string
  triggerMode?: AiPlayerChatPatrolTickTriggerMode
  scheduled?: boolean
  skipped?: boolean
  proposalSummary?: AiPlayerChatPatrolTickProposalSummary
  developmentPlanSummary?: AiPlayerChatPatrolTickDevelopmentSummary
  battleReportSummary?: AiPlayerChatPatrolTickBattleReportSummary
  cooldownTicks?: number
  cooldownUntilTick?: number
  cooldownRemainingTicks?: number
  autonomyGuard?: AiPlayerChatPatrolAutonomyGuard
  tick?: number
  worldVersionBefore?: number
  worldVersionAfter?: number
  error?: string
}

export type AiPlayerChatPatrolSchedulerRunItem = {
  aiPlayerId: string
  ok: boolean
  skipped?: boolean
  error?: string
  messageId?: string
  cooldownUntilTick?: number
  cooldownRemainingTicks?: number
  tick?: number
  providerBudgetTier?: AiPlayerModelBudgetTier
  autonomyGuard?: AiPlayerChatPatrolAutonomyGuard
}

export type AiPlayerChatPatrolSchedulerShardSummary = {
  shardIndex: number
  shardCount: number
  selectedCount: number
}

export type AiPlayerChatPatrolSchedulerProviderBudgetSummary = {
  budgetTier: AiPlayerModelBudgetTier
  maxRuns: number | null
  consumedRuns: number
  remainingRuns: number | null
  skippedCount: number
  limitMode?: 'unlimited' | 'configured' | 'disabled'
  budgetWindowKey?: string
  deniedRuns?: number
  consumedTotalTokens?: number
  remainingTotalTokens?: number | null
}

export type AiPlayerChatPatrolSchedulerQueueSummary = {
  queueRunId: string | null
  idempotencyKey: string | null
  leaseId: string | null
  leaseTtlMs: number | null
  leaseExpiresAt: string | null
  retryAfterMs: number
  backoffMs: number
  deduped: boolean
}

export type AiPlayerChatPatrolSchedulerRunResponse = {
  ok: boolean
  triggerMode: 'scheduler'
  scheduled: true
  attemptedCount: number
  writtenCount: number
  skippedCount: number
  failedCount: number
  shard: AiPlayerChatPatrolSchedulerShardSummary
  providerBudget: AiPlayerChatPatrolSchedulerProviderBudgetSummary
  queue: AiPlayerChatPatrolSchedulerQueueSummary
  items: AiPlayerChatPatrolSchedulerRunItem[]
  autonomyGuard: AiPlayerChatPatrolAutonomyGuard
  tick?: number
  worldVersionBefore?: number
  worldVersionAfter?: number
  error?: string
}

export type AiPlayerChatReadCursorResponse = {
  ok: boolean
  channel?: AiPlayerChatChannel
  readCursor?: AiPlayerChatReadCursor
  error?: string
}
