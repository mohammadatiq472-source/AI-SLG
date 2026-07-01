import { z } from 'zod'
import type {
  AiPlayerProviderAuditEvent,
  AiPlayerProviderAccountHealthResponse,
  AiPlayerProviderAccountPoolOpsConfigMutationResponse,
  AiPlayerProviderAccountPoolOpsRestoreResponse,
  AiPlayerProviderAccountPoolReadModelResponse,
  AiPlayerProviderAccountOpsRuntimeConfigResponse,
  AiPlayerProviderAiCommandCreditEstimateResponse,
  AiPlayerProviderAiCommandCreditBalanceResponse,
  AiPlayerProviderAiCommandCreditLedgerMutationResponse,
  AiPlayerProviderAiCommandCreditSummaryResponse,
  AiPlayerProviderBillingLedgerEntry,
  AiPlayerProviderCostReconciliationResponse,
  AiPlayerProviderDeepSeekBillingReadModelResponse,
  AiPlayerProviderPricingEstimateResponse,
  AiPlayerProviderPricingPolicy,
  AiPlayerProviderRequestQueueStatus,
  AiPlayerProviderRequestQueueStatusResponse,
  AiPlayerProviderTokenBalanceItem,
  AiPlayerProviderTokenSummaryItem,
  ListAiPlayerProviderPricingPoliciesResponse,
  ListAiPlayerProviderBudgetWindowsResponse,
  ListAiPlayerProviderAccountPoolOpsAuditResponse,
  RestoreAiPlayerProviderAccountPoolOpsConfigRequest,
  AiPlayerProviderPlayerKeyMutationResponse,
  ListAiPlayerProviderAuditEventsResponse,
  ListAiPlayerProviderBillingLedgerResponse,
  ListAiPlayerProviderTokenBalanceResponse,
  ListAiPlayerProviderTokenSummaryResponse,
  UpsertAiPlayerProviderAccountPoolOpsConfigRequest,
  UpsertAiPlayerProviderPlayerKeyRequest,
} from '../contracts/aiPlayerProviderAccount'

export const aiPlayerProviderBillingAccountTypeSchema = z.enum(['platform', 'faction_byok', 'player_byok'])
export const aiPlayerProviderPlayerKeyStatusSchema = z.enum(['active', 'revoked'])
export const aiPlayerProviderAuditEventTypeSchema = z.enum([
  'byok_key_configured',
  'byok_key_revoked',
  'provider_account_pool_ops_configured',
  'provider_request_succeeded',
  'provider_request_failed',
  'provider_fallback_failed',
])

export const aiPlayerProviderBillingUsageSchema = z.object({
  promptTokens: z.number().finite().nonnegative().optional(),
  completionTokens: z.number().finite().nonnegative().optional(),
  totalTokens: z.number().finite().nonnegative().optional(),
  promptCacheHitTokens: z.number().finite().nonnegative().optional(),
  promptCacheMissTokens: z.number().finite().nonnegative().optional(),
  estimatedCostUsd: z.number().finite().nonnegative().optional(),
  estimatedCostSource: z.enum(['provider_reported', 'pricing_policy']).optional(),
})

export const aiPlayerProviderTokenTotalsSchema = z.object({
  promptTokens: z.number().finite().nonnegative(),
  completionTokens: z.number().finite().nonnegative(),
  totalTokens: z.number().finite().nonnegative(),
  estimatedCostUsd: z.number().finite().nonnegative(),
})

export const aiPlayerProviderBudgetLimitModeSchema = z.enum(['unlimited', 'configured', 'disabled'])

export const aiPlayerProviderBudgetWindowSchema = z.object({
  budgetWindowKey: z.string().trim().min(1).max(240),
  billingAccountType: aiPlayerProviderBillingAccountTypeSchema,
  billingAccountId: z.string().trim().min(1).max(120).nullable(),
  budgetTier: z.enum(['strict_action', 'economy_chat', 'disabled']),
  windowStartedAt: z.string().trim().min(1).max(80),
  windowEndsAt: z.string().trim().min(1).max(80),
  limitMode: aiPlayerProviderBudgetLimitModeSchema,
  maxRuns: z.number().int().nonnegative().nullable(),
  maxPromptTokens: z.number().int().nonnegative().nullable(),
  maxCompletionTokens: z.number().int().nonnegative().nullable(),
  maxTotalTokens: z.number().int().nonnegative().nullable(),
  maxEstimatedCostUsd: z.number().finite().nonnegative().nullable(),
  reservedRuns: z.number().int().nonnegative(),
  consumedRuns: z.number().int().nonnegative(),
  deniedRuns: z.number().int().nonnegative(),
  consumedPromptTokens: z.number().nonnegative(),
  consumedCompletionTokens: z.number().nonnegative(),
  consumedTotalTokens: z.number().nonnegative(),
  consumedEstimatedCostUsd: z.number().nonnegative(),
  updatedAt: z.string().trim().min(1).max(80),
})

export const aiPlayerProviderBillingLedgerEntrySchema = z.object({
  ledgerEntryId: z.string().trim().min(1).max(120),
  requestId: z.string().trim().min(1).max(120),
  aiPlayerId: z.string().trim().min(1).max(80),
  factionId: z.string().trim().min(1).max(64),
  governorPlayerId: z.string().trim().min(1).max(80),
  billingAccountType: aiPlayerProviderBillingAccountTypeSchema,
  billingAccountId: z.string().trim().min(1).max(120).nullable(),
  providerSource: z.enum(['default', 'env', 'faction_config', 'player_config', 'fallback']),
  byokSource: z.enum(['none', 'faction_config', 'player_config']),
  model: z.string().trim().min(1).max(160),
  provider: z.string().trim().min(1).max(120),
  keyFingerprint: z.string().trim().min(1).max(80).nullable().optional(),
  budgetTier: z.enum(['strict_action', 'economy_chat', 'disabled']),
  budgetWindowKey: z.string().trim().min(1).max(240).optional(),
  budgetReservationId: z.string().trim().min(1).max(120).optional(),
  usage: aiPlayerProviderBillingUsageSchema,
  queueRunId: z.string().trim().min(1).max(120).optional(),
  idempotencyKey: z.string().trim().min(1).max(160).optional(),
  createdAt: z.string().trim().min(1).max(80),
})

export const aiPlayerProviderTokenBudgetStatusSchema = z.object({
  budgetWindowKey: z.string().trim().min(1).max(240),
  budgetTier: z.enum(['strict_action', 'economy_chat', 'disabled']),
  limitMode: aiPlayerProviderBudgetLimitModeSchema,
  windowStartedAt: z.string().trim().min(1).max(80),
  windowEndsAt: z.string().trim().min(1).max(80),
  maxRuns: z.number().int().nonnegative().nullable(),
  consumedRuns: z.number().int().nonnegative(),
  remainingRuns: z.number().int().nonnegative().nullable(),
  maxTotalTokens: z.number().finite().nonnegative().nullable(),
  consumedTotalTokens: z.number().finite().nonnegative(),
  remainingTotalTokens: z.number().finite().nonnegative().nullable(),
  maxEstimatedCostUsd: z.number().finite().nonnegative().nullable(),
  consumedEstimatedCostUsd: z.number().finite().nonnegative(),
  remainingEstimatedCostUsd: z.number().finite().nonnegative().nullable(),
})

export const aiPlayerProviderTokenSummaryItemSchema = z.object({
  aiPlayerId: z.string().trim().min(1).max(80),
  factionId: z.string().trim().min(1).max(64),
  governorPlayerId: z.string().trim().min(1).max(80),
  billingAccountType: aiPlayerProviderBillingAccountTypeSchema,
  billingAccountId: z.string().trim().min(1).max(120).nullable(),
  model: z.string().trim().min(1).max(160),
  provider: z.string().trim().min(1).max(120),
  keyFingerprint: z.string().trim().min(1).max(80).nullable(),
  requestCount: z.number().int().nonnegative(),
  firstRequestAt: z.string().trim().min(1).max(80),
  lastRequestAt: z.string().trim().min(1).max(80),
  today: aiPlayerProviderTokenTotalsSchema,
  thisMonth: aiPlayerProviderTokenTotalsSchema,
  total: aiPlayerProviderTokenTotalsSchema,
  budgetStatus: aiPlayerProviderTokenBudgetStatusSchema.nullable(),
})

export const aiPlayerProviderTokenBalanceAiPlayerItemSchema = z.object({
  aiPlayerId: z.string().trim().min(1).max(80),
  factionId: z.string().trim().min(1).max(64),
  requestCount: z.number().int().nonnegative(),
  consumedTotalTokens: z.number().finite().nonnegative(),
  consumedEstimatedCostUsd: z.number().finite().nonnegative(),
  lastRequestAt: z.string().trim().min(1).max(80).nullable(),
})

export const aiPlayerProviderTokenBalanceItemSchema = z.object({
  governorPlayerId: z.string().trim().min(1).max(80),
  billingAccountType: aiPlayerProviderBillingAccountTypeSchema,
  billingAccountId: z.string().trim().min(1).max(120).nullable(),
  budgetTier: z.enum(['strict_action', 'economy_chat', 'disabled']),
  limitMode: aiPlayerProviderBudgetLimitModeSchema,
  windowStartedAt: z.string().trim().min(1).max(80).nullable(),
  windowEndsAt: z.string().trim().min(1).max(80).nullable(),
  totalPurchasedTokens: z.number().finite().nonnegative().nullable(),
  totalConsumedTokens: z.number().finite().nonnegative(),
  remainingTokens: z.number().finite().nonnegative().nullable(),
  totalPurchasedEstimatedCostUsd: z.number().finite().nonnegative().nullable(),
  totalConsumedEstimatedCostUsd: z.number().finite().nonnegative(),
  remainingEstimatedCostUsd: z.number().finite().nonnegative().nullable(),
  maxRuns: z.number().int().nonnegative().nullable(),
  consumedRuns: z.number().int().nonnegative(),
  remainingRuns: z.number().int().nonnegative().nullable(),
  estimatedDailyBurnTokens: z.number().finite().nonnegative(),
  daysRemaining: z.number().int().nonnegative().nullable(),
  byAiPlayer: z.array(aiPlayerProviderTokenBalanceAiPlayerItemSchema),
})

export const aiPlayerProviderRequestQueueStatusSchema = z.object({
  maxConcurrency: z.number().int().positive(),
  queueLimit: z.number().int().nonnegative(),
  activeRequests: z.number().int().nonnegative(),
  queuedRequests: z.number().int().nonnegative(),
  availableConcurrency: z.number().int().nonnegative(),
  remainingQueueCapacity: z.number().int().nonnegative(),
  totalStartedRequests: z.number().int().nonnegative(),
  totalCompletedRequests: z.number().int().nonnegative(),
  totalRejectedRequests: z.number().int().nonnegative(),
  lastStartedAt: z.string().trim().min(1).max(80).nullable(),
  lastCompletedAt: z.string().trim().min(1).max(80).nullable(),
  lastRejectedAt: z.string().trim().min(1).max(80).nullable(),
  lanes: z.array(z.object({
    lane: z.string().trim().min(1).max(80),
    priority: z.number().int(),
    activeRequests: z.number().int().nonnegative(),
    queuedRequests: z.number().int().nonnegative(),
    totalStartedRequests: z.number().int().nonnegative(),
    totalCompletedRequests: z.number().int().nonnegative(),
    totalRejectedRequests: z.number().int().nonnegative(),
    averageWaitMs: z.number().finite().nonnegative(),
    p95WaitMs: z.number().finite().nonnegative(),
    oldestQueuedAgeMs: z.number().int().nonnegative().nullable(),
  })),
  endpoints: z.array(z.object({
    provider: z.string().trim().min(1).max(120),
    model: z.string().trim().min(1).max(160),
    keyFingerprint: z.string().trim().min(1).max(80).nullable(),
    activeRequests: z.number().int().nonnegative(),
    queuedRequests: z.number().int().nonnegative(),
    totalStartedRequests: z.number().int().nonnegative(),
    totalCompletedRequests: z.number().int().nonnegative(),
    totalRejectedRequests: z.number().int().nonnegative(),
    totalFailedRequests: z.number().int().nonnegative(),
    totalRateLimitedRequests: z.number().int().nonnegative(),
    averageLatencyMs: z.number().finite().nonnegative(),
    p50LatencyMs: z.number().finite().nonnegative(),
    p95LatencyMs: z.number().finite().nonnegative(),
    consecutiveFailures: z.number().int().nonnegative(),
    circuitState: z.enum(['closed', 'open']),
    backoffUntil: z.string().trim().min(1).max(80).nullable(),
    rateBucket: z.object({
      limit: z.number().int().positive().nullable(),
      windowMs: z.number().int().positive(),
      usedRequests: z.number().int().nonnegative(),
      remainingRequests: z.number().int().nonnegative().nullable(),
      resetAt: z.string().trim().min(1).max(80).nullable(),
    }),
    lastStartedAt: z.string().trim().min(1).max(80).nullable(),
    lastCompletedAt: z.string().trim().min(1).max(80).nullable(),
    lastSuccessAt: z.string().trim().min(1).max(80).nullable(),
    lastFailureAt: z.string().trim().min(1).max(80).nullable(),
  })),
  leases: z.array(z.object({
    leaseId: z.string().trim().min(1).max(160),
    aiPlayerId: z.string().trim().min(1).max(80),
    lane: z.string().trim().min(1).max(80),
    provider: z.string().trim().min(1).max(120),
    model: z.string().trim().min(1).max(160),
    keyFingerprint: z.string().trim().min(1).max(80).nullable(),
    state: z.enum(['queued', 'active']),
    ageMs: z.number().int().nonnegative(),
    expiresAt: z.string().trim().min(1).max(80).nullable(),
  })),
  jobs: z.array(z.object({
    jobId: z.string().trim().min(1).max(160),
    leaseId: z.string().trim().min(1).max(160),
    aiPlayerId: z.string().trim().min(1).max(80),
    lane: z.string().trim().min(1).max(80),
    provider: z.string().trim().min(1).max(120),
    model: z.string().trim().min(1).max(160),
    keyFingerprint: z.string().trim().min(1).max(80).nullable(),
    state: z.enum(['pending', 'active', 'expired']),
    priority: z.number().int(),
    ageMs: z.number().int().nonnegative(),
    availableAt: z.string().trim().min(1).max(80).nullable(),
    expiresAt: z.string().trim().min(1).max(80).nullable(),
    failureReason: z.string().trim().min(1).max(240).optional(),
  })),
})

export const aiPlayerProviderAccountPoolHealthStatusSchema = z.enum(['healthy', 'backoff', 'unconfigured', 'degraded', 'disabled'])

export const aiPlayerProviderAccountPoolOpsStateSchema = z.object({
  enabled: z.boolean(),
  maxConcurrency: z.number().int().min(0).max(256).nullable(),
  opsNote: z.string().trim().min(1).max(240).nullable(),
  enterpriseQuota: z.boolean(),
  quotaLabel: z.string().trim().min(1).max(120).nullable(),
  updatedBy: z.string().trim().min(1).max(80).nullable(),
  updatedAt: z.string().trim().min(1).max(80).nullable(),
})

export const aiPlayerProviderAccountPoolOpsConfigSchema = z.object({
  provider: z.string().trim().min(1).max(120),
  model: z.string().trim().min(1).max(160),
  keyFingerprint: z.string().trim().min(1).max(80).nullable(),
  enabled: z.boolean(),
  maxConcurrency: z.number().int().min(0).max(256).nullable(),
  opsNote: z.string().trim().min(1).max(240).nullable(),
  enterpriseQuota: z.boolean(),
  quotaLabel: z.string().trim().min(1).max(120).nullable(),
  updatedBy: z.string().trim().min(1).max(80).nullable(),
  updatedAt: z.string().trim().min(1).max(80),
})

export const upsertAiPlayerProviderAccountPoolOpsConfigRequestSchema = z.object({
  provider: z.string().trim().min(1).max(120),
  model: z.string().trim().min(1).max(160),
  keyFingerprint: z.string().trim().min(1).max(80).nullable().optional(),
  enabled: z.boolean().optional(),
  maxConcurrency: z.number().int().min(0).max(256).nullable().optional(),
  opsNote: z.string().trim().min(1).max(240).nullable().optional(),
  enterpriseQuota: z.boolean().optional(),
  quotaLabel: z.string().trim().min(1).max(120).nullable().optional(),
  opsActorId: z.string().trim().min(1).max(80).optional(),
  opsReason: z.string().trim().min(1).max(240).optional(),
  confirmation: z.literal('provider_account_ops_confirmed').optional(),
  updatedBy: z.string().trim().min(1).max(80).optional(),
})

export const restoreAiPlayerProviderAccountPoolOpsConfigRequestSchema = z.object({
  provider: z.string().trim().min(1).max(120),
  model: z.string().trim().min(1).max(160),
  keyFingerprint: z.string().trim().min(1).max(80).nullable().optional(),
  restoreEventId: z.string().trim().min(1).max(120).optional(),
  opsActorId: z.string().trim().min(1).max(80).optional(),
  opsReason: z.string().trim().min(1).max(240).optional(),
  confirmation: z.literal('provider_account_ops_confirmed').optional(),
  restoredBy: z.string().trim().min(1).max(80).optional(),
})

export const aiPlayerProviderAccountPoolBillingStatsSchema = z.object({
  requestCount: z.number().int().nonnegative(),
  totalTokens: z.number().finite().nonnegative(),
  estimatedCostUsd: z.number().finite().nonnegative(),
  lastRequestAt: z.string().trim().min(1).max(80).nullable(),
})

export const aiPlayerProviderAccountPoolAccountSchema = z.object({
  accountId: z.string().trim().min(1).max(360),
  provider: z.string().trim().min(1).max(120),
  model: z.string().trim().min(1).max(160),
  keyFingerprint: z.string().trim().min(1).max(80).nullable(),
  source: z.enum(['default', 'env', 'faction_config', 'player_config', 'fallback']),
  byokSource: z.enum(['none', 'faction_config', 'player_config']),
  priority: z.number().int(),
  secretConfigured: z.boolean(),
  secretSource: z.string().trim().min(1).max(120).nullable(),
  lastFailureReason: z.string().trim().min(1).max(240).nullable(),
  healthStatus: aiPlayerProviderAccountPoolHealthStatusSchema,
  dispatchEligible: z.boolean(),
  rejectionReasons: z.array(z.string().trim().min(1).max(160)),
  ops: aiPlayerProviderAccountPoolOpsStateSchema,
  health: z.object({
    activeRequests: z.number().int().nonnegative(),
    queuedRequests: z.number().int().nonnegative(),
    totalStartedRequests: z.number().int().nonnegative(),
    totalCompletedRequests: z.number().int().nonnegative(),
    totalRejectedRequests: z.number().int().nonnegative(),
    totalFailedRequests: z.number().int().nonnegative(),
    totalRateLimitedRequests: z.number().int().nonnegative(),
    averageLatencyMs: z.number().finite().nonnegative(),
    p50LatencyMs: z.number().finite().nonnegative(),
    p95LatencyMs: z.number().finite().nonnegative(),
    consecutiveFailures: z.number().int().nonnegative(),
    circuitState: z.enum(['closed', 'open']),
    backoffUntil: z.string().trim().min(1).max(80).nullable(),
    lastStartedAt: z.string().trim().min(1).max(80).nullable(),
    lastCompletedAt: z.string().trim().min(1).max(80).nullable(),
    lastSuccessAt: z.string().trim().min(1).max(80).nullable(),
    lastFailureAt: z.string().trim().min(1).max(80).nullable(),
  }),
  billing: aiPlayerProviderAccountPoolBillingStatsSchema,
})

export const aiPlayerProviderPricingPolicySchema = z.object({
  provider: z.string().trim().min(1).max(120),
  model: z.string().trim().min(1).max(160),
  aliases: z.array(z.string().trim().min(1).max(160)),
  currency: z.literal('USD'),
  unitTokens: z.number().int().positive(),
  inputCacheHitUsdPerUnit: z.number().finite().nonnegative(),
  inputCacheMissUsdPerUnit: z.number().finite().nonnegative(),
  outputUsdPerUnit: z.number().finite().nonnegative(),
  sourceUrl: z.string().trim().min(1).max(240),
  effectiveAt: z.string().trim().min(1).max(80),
  discountUntil: z.string().trim().min(1).max(80).optional(),
  notes: z.array(z.string().trim().min(1).max(240)),
})

export const aiPlayerProviderPricingEstimateResponseSchema = z.object({
  ok: z.literal(true),
  matched: z.boolean(),
  requestedProvider: z.string().trim().min(1).max(120).nullable(),
  requestedModel: z.string().trim().min(1).max(160).nullable(),
  policy: aiPlayerProviderPricingPolicySchema.nullable(),
  usage: aiPlayerProviderBillingUsageSchema,
  warnings: z.array(z.string().trim().min(1).max(240)),
})

export const aiPlayerProviderAiCommandCreditPolicySchema = z.object({
  unitCode: z.literal('ai_command_credit'),
  displayName: z.string().trim().min(1).max(40),
  basis: z.literal('provider_total_tokens'),
  tokensPerCredit: z.number().int().positive(),
  minimumChargeCredits: z.number().int().nonnegative(),
  rounding: z.literal('ceil_per_request'),
})

export const aiPlayerProviderAiCommandCreditEstimateResponseSchema = z.object({
  ok: z.literal(true),
  policy: aiPlayerProviderAiCommandCreditPolicySchema,
  usage: aiPlayerProviderBillingUsageSchema,
  consumedCredits: z.number().int().nonnegative(),
})

export const aiPlayerProviderAiCommandCreditSummaryItemSchema = z.object({
  aiPlayerId: z.string().trim().min(1).max(80),
  factionId: z.string().trim().min(1).max(64),
  requestCount: z.number().int().nonnegative(),
  consumedTotalTokens: z.number().int().nonnegative(),
  consumedCredits: z.number().int().nonnegative(),
})

export const aiPlayerProviderAiCommandCreditSummaryResponseSchema = z.object({
  ok: z.literal(true),
  policy: aiPlayerProviderAiCommandCreditPolicySchema,
  requestCount: z.number().int().nonnegative(),
  consumedTotalTokens: z.number().int().nonnegative(),
  consumedCredits: z.number().int().nonnegative(),
  byAiPlayer: z.array(aiPlayerProviderAiCommandCreditSummaryItemSchema),
})

export const aiPlayerProviderAiCommandCreditLedgerEntrySchema = z.object({
  entryId: z.string().trim().min(1).max(120),
  accountId: z.string().trim().min(1).max(120),
  worldId: z.string().trim().min(1).max(120),
  entryType: z.enum(['grant', 'debit', 'refund']),
  amountCredits: z.number().int(),
  balanceAfterCredits: z.number().int().nonnegative(),
  requestId: z.string().trim().min(1).max(120).optional(),
  aiPlayerId: z.string().trim().min(1).max(80).optional(),
  factionId: z.string().trim().min(1).max(64).optional(),
  reason: z.string().trim().min(1).max(240).optional(),
  createdAt: z.string().trim().min(1).max(80),
})

export const aiPlayerProviderAiCommandCreditBalanceSchema = z.object({
  accountId: z.string().trim().min(1).max(120),
  worldId: z.string().trim().min(1).max(120),
  balanceCredits: z.number().int().nonnegative(),
  reservedCredits: z.number().int().nonnegative(),
  availableCredits: z.number().int().nonnegative(),
  grantedCredits: z.number().int().nonnegative(),
  debitedCredits: z.number().int().nonnegative(),
  refundedCredits: z.number().int().nonnegative(),
  ledgerCount: z.number().int().nonnegative(),
})

export const aiPlayerProviderAiCommandCreditBalanceResponseSchema = aiPlayerProviderAiCommandCreditBalanceSchema.extend({
  ok: z.literal(true),
})

export const aiPlayerProviderAiCommandCreditLedgerMutationResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    entry: aiPlayerProviderAiCommandCreditLedgerEntrySchema,
    balance: aiPlayerProviderAiCommandCreditBalanceSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.enum(['invalid_ai_command_credit_request', 'insufficient_ai_command_credits']),
    balance: aiPlayerProviderAiCommandCreditBalanceSchema.optional(),
  }),
])

export const aiPlayerProviderCostReconciliationResponseSchema = z.object({
  ok: z.literal(true),
  source: z.literal('dashboard_manual'),
  requestCount: z.number().int().positive(),
  actualCostCny: z.number().finite().nonnegative().nullable(),
  actualCostUsd: z.number().finite().nonnegative().nullable(),
  estimatedCostUsd: z.number().finite().nonnegative().nullable(),
  estimatedCostCny: z.number().finite().nonnegative().nullable(),
  estimatedCostSource: z.enum(['manual_input', 'billing_ledger']).nullable(),
  estimatedRequestCount: z.number().int().nonnegative().nullable(),
  cnyPerUsd: z.number().finite().positive().nullable(),
  actualCostCnyPerRequest: z.number().finite().nonnegative().nullable(),
  actualCostUsdPerRequest: z.number().finite().nonnegative().nullable(),
  estimatedCostCnyPerRequest: z.number().finite().nonnegative().nullable(),
  estimatedCostUsdPerRequest: z.number().finite().nonnegative().nullable(),
  actualVsEstimateRatio: z.number().finite().nonnegative().nullable(),
  varianceCostCny: z.number().finite().nullable(),
  varianceCostUsd: z.number().finite().nullable(),
  warnings: z.array(z.string().trim().min(1).max(240)),
})

export const aiPlayerProviderDeepSeekBillingWindowSchema = z.object({
  label: z.enum(['today', 'thisMonth', 'range']),
  from: z.string().trim().min(1).max(80),
  to: z.string().trim().min(1).max(80),
  observationSource: z.enum(['dashboard_manual', 'billing_ledger']),
  requestCount: z.number().int().positive().nullable(),
  actualCostCny: z.number().finite().nonnegative().nullable(),
  actualCostUsd: z.number().finite().nonnegative().nullable(),
  estimatedCostUsd: z.number().finite().nonnegative().nullable(),
  estimatedCostCny: z.number().finite().nonnegative().nullable(),
  estimatedCostSource: z.enum(['manual_input', 'billing_ledger']).nullable(),
  estimatedRequestCount: z.number().int().nonnegative().nullable(),
  cnyPerUsd: z.number().finite().positive().nullable(),
  actualCostCnyPerRequest: z.number().finite().nonnegative().nullable(),
  actualCostUsdPerRequest: z.number().finite().nonnegative().nullable(),
  estimatedCostCnyPerRequest: z.number().finite().nonnegative().nullable(),
  estimatedCostUsdPerRequest: z.number().finite().nonnegative().nullable(),
  actualVsEstimateRatio: z.number().finite().nonnegative().nullable(),
  varianceCostCny: z.number().finite().nullable(),
  varianceCostUsd: z.number().finite().nullable(),
  warnings: z.array(z.string().trim().min(1).max(240)),
})

export const aiPlayerProviderDeepSeekBillingReadModelResponseSchema = z.object({
  ok: z.literal(true),
  source: z.literal('dashboard_manual'),
  provider: z.literal('deepseek'),
  generatedAt: z.string().trim().min(1).max(80),
  today: aiPlayerProviderDeepSeekBillingWindowSchema,
  thisMonth: aiPlayerProviderDeepSeekBillingWindowSchema,
  range: aiPlayerProviderDeepSeekBillingWindowSchema.nullable(),
  warnings: z.array(z.string().trim().min(1).max(240)),
})

export const aiPlayerProviderAccountOpsMutationDeploymentSchema = z.object({
  production: z.boolean(),
  internalOnly: z.boolean(),
  trustedProxy: z.boolean(),
  trustedProxySignatureConfigured: z.boolean(),
  trustedProxySignatureRequired: z.boolean(),
  trusted: z.boolean(),
  mutationRoutesEnabled: z.boolean(),
  blockedReason: z.enum([
    'provider_account_ops_deployment_not_trusted',
    'provider_account_ops_trusted_proxy_signature_not_configured',
  ]).nullable(),
})

export const aiPlayerProviderAccountHealthResponseSchema = z.object({
  path: z.string().trim().min(1).max(512),
  loaded: z.boolean(),
  opsMutationDeployment: aiPlayerProviderAccountOpsMutationDeploymentSchema,
  playerKeyCount: z.number().int().nonnegative(),
  billingLedgerCount: z.number().int().nonnegative(),
  auditEventCount: z.number().int().nonnegative(),
  budgetWindowCount: z.number().int().nonnegative(),
  budgetReservationCount: z.number().int().nonnegative(),
  persistDirty: z.boolean(),
  persistInFlight: z.boolean(),
  persistSuccessCount: z.number().int().nonnegative(),
  persistFailureCount: z.number().int().nonnegative(),
  lastPersistAt: z.number().int().nonnegative().nullable(),
  lastPersistErrorAt: z.number().int().nonnegative().nullable(),
  corruptQuarantineCount: z.number().int().nonnegative(),
  lastCorruptQuarantineAt: z.number().int().nonnegative().nullable(),
  security: z.object({
    secretPersistMode: z.enum(['encrypted', 'plaintext', 'memory_only']),
    encryptionKeyConfigured: z.boolean(),
    allowPlaintextPersist: z.boolean(),
  }),
  externalLedgerAuditDb: z.object({
    configured: z.boolean(),
    hmacConfigured: z.boolean(),
    durableOutboxCount: z.number().int().nonnegative(),
    pendingBillingLedgerCount: z.number().int().nonnegative(),
    pendingAuditEventCount: z.number().int().nonnegative(),
    inFlight: z.boolean(),
    successCount: z.number().int().nonnegative(),
    failureCount: z.number().int().nonnegative(),
    lastSuccessAt: z.number().int().nonnegative().nullable(),
    lastFailureAt: z.number().int().nonnegative().nullable(),
    lastError: z.string().trim().min(1).max(240).nullable(),
  }),
  externalBudgetGate: z.object({
    configured: z.boolean(),
    hmacConfigured: z.boolean(),
    failOpen: z.boolean(),
    successCount: z.number().int().nonnegative(),
    failureCount: z.number().int().nonnegative(),
    lastSuccessAt: z.number().int().nonnegative().nullable(),
    lastFailureAt: z.number().int().nonnegative().nullable(),
    lastError: z.string().trim().min(1).max(240).nullable(),
  }),
})

export const aiPlayerProviderAuditEventSchema = z.object({
  eventId: z.string().trim().min(1).max(120),
  eventType: aiPlayerProviderAuditEventTypeSchema,
  requestId: z.string().trim().min(1).max(120).optional(),
  aiPlayerId: z.string().trim().min(1).max(80).optional(),
  factionId: z.string().trim().min(1).max(64).optional(),
  governorPlayerId: z.string().trim().min(1).max(80).optional(),
  ownerPlayerId: z.string().trim().min(1).max(80).optional(),
  actorId: z.string().trim().min(1).max(80).optional(),
  providerSource: z.enum(['default', 'env', 'faction_config', 'player_config', 'fallback']).optional(),
  byokSource: z.enum(['none', 'faction_config', 'player_config']).optional(),
  model: z.string().trim().min(1).max(160).optional(),
  provider: z.string().trim().min(1).max(120).optional(),
  keyFingerprint: z.string().trim().min(1).max(80).nullable().optional(),
  reason: z.string().trim().min(1).max(240).optional(),
  queueRunId: z.string().trim().min(1).max(120).optional(),
  idempotencyKey: z.string().trim().min(1).max(160).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  createdAt: z.string().trim().min(1).max(80),
})

export const aiPlayerProviderPlayerKeyReadModelSchema = z.object({
  ownerPlayerId: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(160),
  provider: z.string().trim().min(1).max(120),
  baseUrl: z.string().trim().min(1).max(240).optional(),
  status: aiPlayerProviderPlayerKeyStatusSchema,
  secretConfigured: z.boolean(),
  secretSource: z.literal('player_config:byok').nullable(),
  byokSource: z.literal('player_config'),
  keyFingerprint: z.string().trim().min(1).max(80).nullable(),
  createdAt: z.string().trim().min(1).max(80),
  updatedAt: z.string().trim().min(1).max(80),
  revokedAt: z.string().trim().min(1).max(80).optional(),
})

export const upsertAiPlayerProviderPlayerKeyRequestSchema = z.object({
  model: z.string().trim().min(1).max(160),
  provider: z.string().trim().min(1).max(120).optional(),
  baseUrl: z.string().trim().min(1).max(240).optional(),
  apiKey: z.string().trim().min(1).max(1024).optional(),
  status: aiPlayerProviderPlayerKeyStatusSchema.optional(),
  updatedBy: z.string().trim().min(1).max(80).optional(),
})

export const aiPlayerProviderPlayerKeyMutationResponseSchema = z.object({
  ok: z.boolean(),
  key: aiPlayerProviderPlayerKeyReadModelSchema.optional(),
  error: z.string().trim().min(1).optional(),
})

export const listAiPlayerProviderBillingLedgerResponseSchema = z.object({
  items: z.array(aiPlayerProviderBillingLedgerEntrySchema),
  count: z.number().int().nonnegative(),
})

export const listAiPlayerProviderAuditEventsResponseSchema = z.object({
  items: z.array(aiPlayerProviderAuditEventSchema),
  count: z.number().int().nonnegative(),
})

export const listAiPlayerProviderBudgetWindowsResponseSchema = z.object({
  items: z.array(aiPlayerProviderBudgetWindowSchema),
  count: z.number().int().nonnegative(),
})

export const listAiPlayerProviderTokenSummaryResponseSchema = z.object({
  items: z.array(aiPlayerProviderTokenSummaryItemSchema),
  count: z.number().int().nonnegative(),
})

export const listAiPlayerProviderTokenBalanceResponseSchema = z.object({
  items: z.array(aiPlayerProviderTokenBalanceItemSchema),
  count: z.number().int().nonnegative(),
})

export const listAiPlayerProviderPricingPoliciesResponseSchema = z.object({
  items: z.array(aiPlayerProviderPricingPolicySchema),
  count: z.number().int().nonnegative(),
})

export const aiPlayerProviderRequestQueueStatusResponseSchema = z.object({
  ok: z.literal(true),
  queue: aiPlayerProviderRequestQueueStatusSchema,
})

export const aiPlayerProviderAccountPoolReadModelResponseSchema = z.object({
  ok: z.literal(true),
  generatedAt: z.string().trim().min(1).max(80),
  opsMutationDeployment: aiPlayerProviderAccountOpsMutationDeploymentSchema,
  accountCount: z.number().int().nonnegative(),
  healthyCount: z.number().int().nonnegative(),
  dispatchEligibleCount: z.number().int().nonnegative(),
  selectedAccount: aiPlayerProviderAccountPoolAccountSchema.nullable(),
  accounts: z.array(aiPlayerProviderAccountPoolAccountSchema),
})

export const aiPlayerProviderAccountPoolOpsConfigMutationResponseSchema = z.object({
  ok: z.boolean(),
  config: aiPlayerProviderAccountPoolOpsConfigSchema.optional(),
  error: z.string().trim().min(1).optional(),
})

export const aiPlayerProviderAccountPoolOpsAuditActionSchema = z.enum(['enabled', 'disabled', 'updated'])

export const aiPlayerProviderAccountPoolOpsAuditItemSchema = z.object({
  eventId: z.string().trim().min(1).max(120),
  eventType: z.literal('provider_account_pool_ops_configured'),
  actorId: z.string().trim().min(1).max(80).nullable(),
  provider: z.string().trim().min(1).max(120),
  model: z.string().trim().min(1).max(160),
  keyFingerprint: z.string().trim().min(1).max(80).nullable(),
  action: aiPlayerProviderAccountPoolOpsAuditActionSchema,
  enabled: z.boolean().nullable(),
  reason: z.string().trim().min(1).max(240).nullable(),
  opsReason: z.string().trim().min(1).max(240).nullable(),
  authRole: z.string().trim().min(1).max(80).nullable(),
  authSource: z.string().trim().min(1).max(80).nullable(),
  restoreSourceEventId: z.string().trim().min(1).max(120).nullable(),
  maxConcurrency: z.number().int().min(0).max(256).nullable(),
  enterpriseQuota: z.boolean().nullable(),
  quotaLabel: z.string().trim().min(1).max(120).nullable(),
  createdAt: z.string().trim().min(1).max(80),
})

export const listAiPlayerProviderAccountPoolOpsAuditResponseSchema = z.object({
  ok: z.literal(true),
  generatedAt: z.string().trim().min(1).max(80),
  items: z.array(aiPlayerProviderAccountPoolOpsAuditItemSchema),
  count: z.number().int().nonnegative(),
})

export const aiPlayerProviderAccountPoolOpsRestoreResponseSchema = z.object({
  ok: z.boolean(),
  config: aiPlayerProviderAccountPoolOpsConfigSchema.optional(),
  restoredFrom: aiPlayerProviderAccountPoolOpsAuditItemSchema.optional(),
  error: z.string().trim().min(1).optional(),
})

export const aiPlayerProviderAccountOpsRuntimeConfigRouteSchema = z.object({
  method: z.enum(['GET', 'POST']),
  path: z.string().trim().min(1).max(160),
  requiresActor: z.boolean(),
  requiresReason: z.boolean(),
  requiresConfirmation: z.literal('provider_account_ops_confirmed').nullable(),
  productionDeploymentGuard: z.boolean(),
})

export const aiPlayerProviderAccountOpsReadOnlyConsumerRouteSchema = z.object({
  id: z.enum(['ops_runtime_config', 'account_pool', 'ops_audit']),
  method: z.literal('GET'),
  path: z.string().trim().min(1).max(160),
  responseContract: z.enum([
    'AiPlayerProviderAccountOpsRuntimeConfigResponse',
    'AiPlayerProviderAccountPoolReadModelResponse',
    'ListAiPlayerProviderAccountPoolOpsAuditResponse',
  ]),
  optionalQueryParams: z.array(z.string().trim().min(1).max(80)),
  safeFields: z.array(z.string().trim().min(1).max(120)),
  forbiddenFields: z.array(z.string().trim().min(1).max(120)),
})

export const aiPlayerProviderAccountOpsReadOnlyConsumerSchema = z.object({
  mutationRequired: z.literal(false),
  exposesSecrets: z.literal(false),
  exposesRawProviderPayloads: z.literal(false),
  routes: z.array(aiPlayerProviderAccountOpsReadOnlyConsumerRouteSchema).min(1),
})

export const aiPlayerProviderAccountOpsRuntimeConfigResponseSchema = z.object({
  ok: z.literal(true),
  generatedAt: z.string().trim().min(1).max(80),
  opsMutationDeployment: aiPlayerProviderAccountOpsMutationDeploymentSchema,
  deploymentGuardEnv: z.object({
    internalOnly: z.literal('AI_PLAYER_PROVIDER_ACCOUNT_OPS_INTERNAL_ONLY'),
    trustedProxy: z.literal('AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY'),
    trustedProxySignatureSecret: z.literal('AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_SIGNATURE_SECRET'),
  }),
  trustedProxyVerification: z.object({
    signatureRequired: z.boolean(),
    signatureSecretConfigured: z.boolean(),
    signatureAlgorithm: z.literal('hmac-sha256'),
    signatureHeader: z.literal('X-AI-Provider-Ops-Proxy-Signature'),
    timestampHeader: z.literal('X-AI-Provider-Ops-Proxy-Timestamp'),
    maxSkewMs: z.number().int().positive(),
  }),
  authEnv: z.object({
    allowedRoles: z.literal('AI_PLAYER_PROVIDER_ACCOUNT_OPS_ALLOWED_ROLES'),
    allowedAuthSources: z.literal('AI_PLAYER_PROVIDER_ACCOUNT_OPS_ALLOWED_AUTH_SOURCES'),
  }),
  actorBinding: z.object({
    actorHeader: z.literal('X-AI-Provider-Ops-Actor-Id'),
    roleHeaders: z.array(z.enum(['X-AI-Provider-Ops-Role', 'X-AI-Provider-Ops-Roles'])).min(1),
    authSourceHeader: z.literal('X-AI-Provider-Ops-Auth-Source'),
    defaultAuthSource: z.literal('rbac_middleware'),
    allowedRolesConfigured: z.boolean(),
    allowedRoleCount: z.number().int().nonnegative(),
    allowedAuthSourcesConfigured: z.boolean(),
    allowedAuthSourceCount: z.number().int().nonnegative(),
  }),
  mutationRoutes: z.array(aiPlayerProviderAccountOpsRuntimeConfigRouteSchema),
  readRoutes: z.array(aiPlayerProviderAccountOpsRuntimeConfigRouteSchema),
  readOnlyConsumer: aiPlayerProviderAccountOpsReadOnlyConsumerSchema,
  warnings: z.array(z.string().trim().min(1).max(160)),
})

export function parseUpsertAiPlayerProviderAccountPoolOpsConfigRequest(input: unknown): UpsertAiPlayerProviderAccountPoolOpsConfigRequest {
  return upsertAiPlayerProviderAccountPoolOpsConfigRequestSchema.parse(input) as UpsertAiPlayerProviderAccountPoolOpsConfigRequest
}

export function parseRestoreAiPlayerProviderAccountPoolOpsConfigRequest(input: unknown): RestoreAiPlayerProviderAccountPoolOpsConfigRequest {
  return restoreAiPlayerProviderAccountPoolOpsConfigRequestSchema.parse(input) as RestoreAiPlayerProviderAccountPoolOpsConfigRequest
}

export function parseAiPlayerProviderAccountPoolOpsConfigMutationResponse(input: unknown): AiPlayerProviderAccountPoolOpsConfigMutationResponse {
  return aiPlayerProviderAccountPoolOpsConfigMutationResponseSchema.parse(input) as AiPlayerProviderAccountPoolOpsConfigMutationResponse
}

export function parseAiPlayerProviderAccountPoolOpsRestoreResponse(input: unknown): AiPlayerProviderAccountPoolOpsRestoreResponse {
  return aiPlayerProviderAccountPoolOpsRestoreResponseSchema.parse(input) as AiPlayerProviderAccountPoolOpsRestoreResponse
}

export function parseAiPlayerProviderAccountOpsRuntimeConfigResponse(input: unknown): AiPlayerProviderAccountOpsRuntimeConfigResponse {
  return aiPlayerProviderAccountOpsRuntimeConfigResponseSchema.parse(input) as AiPlayerProviderAccountOpsRuntimeConfigResponse
}

export function parseListAiPlayerProviderAccountPoolOpsAuditResponse(input: unknown): ListAiPlayerProviderAccountPoolOpsAuditResponse {
  return listAiPlayerProviderAccountPoolOpsAuditResponseSchema.parse(input) as ListAiPlayerProviderAccountPoolOpsAuditResponse
}

export function parseUpsertAiPlayerProviderPlayerKeyRequest(input: unknown): UpsertAiPlayerProviderPlayerKeyRequest {
  return upsertAiPlayerProviderPlayerKeyRequestSchema.parse(input) as UpsertAiPlayerProviderPlayerKeyRequest
}

export function parseAiPlayerProviderPlayerKeyMutationResponse(input: unknown): AiPlayerProviderPlayerKeyMutationResponse {
  return aiPlayerProviderPlayerKeyMutationResponseSchema.parse(input) as AiPlayerProviderPlayerKeyMutationResponse
}

export function parseListAiPlayerProviderBillingLedgerResponse(input: unknown): ListAiPlayerProviderBillingLedgerResponse {
  return listAiPlayerProviderBillingLedgerResponseSchema.parse(input) as ListAiPlayerProviderBillingLedgerResponse
}

export function parseListAiPlayerProviderAuditEventsResponse(input: unknown): ListAiPlayerProviderAuditEventsResponse {
  return listAiPlayerProviderAuditEventsResponseSchema.parse(input) as ListAiPlayerProviderAuditEventsResponse
}

export function parseListAiPlayerProviderBudgetWindowsResponse(input: unknown): ListAiPlayerProviderBudgetWindowsResponse {
  return listAiPlayerProviderBudgetWindowsResponseSchema.parse(input) as ListAiPlayerProviderBudgetWindowsResponse
}

export function parseListAiPlayerProviderTokenSummaryResponse(input: unknown): ListAiPlayerProviderTokenSummaryResponse {
  return listAiPlayerProviderTokenSummaryResponseSchema.parse(input) as ListAiPlayerProviderTokenSummaryResponse
}

export function parseListAiPlayerProviderTokenBalanceResponse(input: unknown): ListAiPlayerProviderTokenBalanceResponse {
  return listAiPlayerProviderTokenBalanceResponseSchema.parse(input) as ListAiPlayerProviderTokenBalanceResponse
}

export function parseListAiPlayerProviderPricingPoliciesResponse(input: unknown): ListAiPlayerProviderPricingPoliciesResponse {
  return listAiPlayerProviderPricingPoliciesResponseSchema.parse(input) as ListAiPlayerProviderPricingPoliciesResponse
}

export function parseAiPlayerProviderPricingEstimateResponse(input: unknown): AiPlayerProviderPricingEstimateResponse {
  return aiPlayerProviderPricingEstimateResponseSchema.parse(input) as AiPlayerProviderPricingEstimateResponse
}

export function parseAiPlayerProviderAiCommandCreditEstimateResponse(input: unknown): AiPlayerProviderAiCommandCreditEstimateResponse {
  return aiPlayerProviderAiCommandCreditEstimateResponseSchema.parse(input) as AiPlayerProviderAiCommandCreditEstimateResponse
}

export function parseAiPlayerProviderAiCommandCreditSummaryResponse(input: unknown): AiPlayerProviderAiCommandCreditSummaryResponse {
  return aiPlayerProviderAiCommandCreditSummaryResponseSchema.parse(input) as AiPlayerProviderAiCommandCreditSummaryResponse
}

export function parseAiPlayerProviderAiCommandCreditBalanceResponse(input: unknown): AiPlayerProviderAiCommandCreditBalanceResponse {
  return aiPlayerProviderAiCommandCreditBalanceResponseSchema.parse(input) as AiPlayerProviderAiCommandCreditBalanceResponse
}

export function parseAiPlayerProviderAiCommandCreditLedgerMutationResponse(input: unknown): AiPlayerProviderAiCommandCreditLedgerMutationResponse {
  return aiPlayerProviderAiCommandCreditLedgerMutationResponseSchema.parse(input) as AiPlayerProviderAiCommandCreditLedgerMutationResponse
}

export function parseAiPlayerProviderCostReconciliationResponse(input: unknown): AiPlayerProviderCostReconciliationResponse {
  return aiPlayerProviderCostReconciliationResponseSchema.parse(input) as AiPlayerProviderCostReconciliationResponse
}

export function parseAiPlayerProviderDeepSeekBillingReadModelResponse(input: unknown): AiPlayerProviderDeepSeekBillingReadModelResponse {
  return aiPlayerProviderDeepSeekBillingReadModelResponseSchema.parse(input) as AiPlayerProviderDeepSeekBillingReadModelResponse
}

export function parseAiPlayerProviderAccountHealthResponse(input: unknown): AiPlayerProviderAccountHealthResponse {
  return aiPlayerProviderAccountHealthResponseSchema.parse(input) as AiPlayerProviderAccountHealthResponse
}

export function parseAiPlayerProviderRequestQueueStatusResponse(input: unknown): AiPlayerProviderRequestQueueStatusResponse {
  return aiPlayerProviderRequestQueueStatusResponseSchema.parse(input) as AiPlayerProviderRequestQueueStatusResponse
}

export function parseAiPlayerProviderAccountPoolReadModelResponse(input: unknown): AiPlayerProviderAccountPoolReadModelResponse {
  return aiPlayerProviderAccountPoolReadModelResponseSchema.parse(input) as AiPlayerProviderAccountPoolReadModelResponse
}

export function parseAiPlayerProviderBillingLedgerEntry(input: unknown): AiPlayerProviderBillingLedgerEntry {
  return aiPlayerProviderBillingLedgerEntrySchema.parse(input) as AiPlayerProviderBillingLedgerEntry
}

export function parseAiPlayerProviderAuditEvent(input: unknown): AiPlayerProviderAuditEvent {
  return aiPlayerProviderAuditEventSchema.parse(input) as AiPlayerProviderAuditEvent
}

export function parseAiPlayerProviderTokenSummaryItem(input: unknown): AiPlayerProviderTokenSummaryItem {
  return aiPlayerProviderTokenSummaryItemSchema.parse(input) as AiPlayerProviderTokenSummaryItem
}

export function parseAiPlayerProviderTokenBalanceItem(input: unknown): AiPlayerProviderTokenBalanceItem {
  return aiPlayerProviderTokenBalanceItemSchema.parse(input) as AiPlayerProviderTokenBalanceItem
}

export function parseAiPlayerProviderPricingPolicy(input: unknown): AiPlayerProviderPricingPolicy {
  return aiPlayerProviderPricingPolicySchema.parse(input) as AiPlayerProviderPricingPolicy
}

export function parseAiPlayerProviderRequestQueueStatus(input: unknown): AiPlayerProviderRequestQueueStatus {
  return aiPlayerProviderRequestQueueStatusSchema.parse(input) as AiPlayerProviderRequestQueueStatus
}
