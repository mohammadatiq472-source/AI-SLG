import type {
  AiPlayerModelBudgetTier,
  AiPlayerModelByokSource,
  AiPlayerModelRoutingSource,
} from './aiPlayer'

export type AiPlayerProviderBillingAccountType = 'platform' | 'faction_byok' | 'player_byok'

export type AiPlayerProviderBillingUsage = {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  promptCacheHitTokens?: number
  promptCacheMissTokens?: number
  estimatedCostUsd?: number
  estimatedCostSource?: 'provider_reported' | 'pricing_policy'
}

export type AiPlayerProviderTokenTotals = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCostUsd: number
}

export type AiPlayerProviderBudgetLimitMode = 'unlimited' | 'configured' | 'disabled'

export type AiPlayerProviderBudgetWindow = {
  budgetWindowKey: string
  billingAccountType: AiPlayerProviderBillingAccountType
  billingAccountId: string | null
  budgetTier: AiPlayerModelBudgetTier
  windowStartedAt: string
  windowEndsAt: string
  limitMode: AiPlayerProviderBudgetLimitMode
  maxRuns: number | null
  maxPromptTokens: number | null
  maxCompletionTokens: number | null
  maxTotalTokens: number | null
  maxEstimatedCostUsd: number | null
  reservedRuns: number
  consumedRuns: number
  deniedRuns: number
  consumedPromptTokens: number
  consumedCompletionTokens: number
  consumedTotalTokens: number
  consumedEstimatedCostUsd: number
  updatedAt: string
}

export type AiPlayerProviderBillingLedgerEntry = {
  ledgerEntryId: string
  requestId: string
  aiPlayerId: string
  factionId: string
  governorPlayerId: string
  billingAccountType: AiPlayerProviderBillingAccountType
  billingAccountId: string | null
  providerSource: AiPlayerModelRoutingSource
  byokSource: AiPlayerModelByokSource
  model: string
  provider: string
  keyFingerprint?: string | null
  budgetTier: AiPlayerModelBudgetTier
  budgetWindowKey?: string
  budgetReservationId?: string
  usage: AiPlayerProviderBillingUsage
  queueRunId?: string
  idempotencyKey?: string
  createdAt: string
}

export type AiPlayerProviderTokenBudgetStatus = {
  budgetWindowKey: string
  budgetTier: AiPlayerModelBudgetTier
  limitMode: AiPlayerProviderBudgetLimitMode
  windowStartedAt: string
  windowEndsAt: string
  maxRuns: number | null
  consumedRuns: number
  remainingRuns: number | null
  maxTotalTokens: number | null
  consumedTotalTokens: number
  remainingTotalTokens: number | null
  maxEstimatedCostUsd: number | null
  consumedEstimatedCostUsd: number
  remainingEstimatedCostUsd: number | null
}

export type AiPlayerProviderTokenSummaryItem = {
  aiPlayerId: string
  factionId: string
  governorPlayerId: string
  billingAccountType: AiPlayerProviderBillingAccountType
  billingAccountId: string | null
  model: string
  provider: string
  keyFingerprint: string | null
  requestCount: number
  firstRequestAt: string
  lastRequestAt: string
  today: AiPlayerProviderTokenTotals
  thisMonth: AiPlayerProviderTokenTotals
  total: AiPlayerProviderTokenTotals
  budgetStatus: AiPlayerProviderTokenBudgetStatus | null
}

export type AiPlayerProviderTokenBalanceAiPlayerItem = {
  aiPlayerId: string
  factionId: string
  requestCount: number
  consumedTotalTokens: number
  consumedEstimatedCostUsd: number
  lastRequestAt: string | null
}

export type AiPlayerProviderTokenBalanceItem = {
  governorPlayerId: string
  billingAccountType: AiPlayerProviderBillingAccountType
  billingAccountId: string | null
  budgetTier: AiPlayerModelBudgetTier
  limitMode: AiPlayerProviderBudgetLimitMode
  windowStartedAt: string | null
  windowEndsAt: string | null
  totalPurchasedTokens: number | null
  totalConsumedTokens: number
  remainingTokens: number | null
  totalPurchasedEstimatedCostUsd: number | null
  totalConsumedEstimatedCostUsd: number
  remainingEstimatedCostUsd: number | null
  maxRuns: number | null
  consumedRuns: number
  remainingRuns: number | null
  estimatedDailyBurnTokens: number
  daysRemaining: number | null
  byAiPlayer: AiPlayerProviderTokenBalanceAiPlayerItem[]
}

export type AiPlayerProviderRequestQueueStatus = {
  maxConcurrency: number
  queueLimit: number
  activeRequests: number
  queuedRequests: number
  availableConcurrency: number
  remainingQueueCapacity: number
  totalStartedRequests: number
  totalCompletedRequests: number
  totalRejectedRequests: number
  lastStartedAt: string | null
  lastCompletedAt: string | null
  lastRejectedAt: string | null
  lanes: AiPlayerProviderRequestQueueLaneStatus[]
  endpoints: AiPlayerProviderRequestQueueEndpointStatus[]
  leases: AiPlayerProviderRequestQueueLeaseStatus[]
  jobs: AiPlayerProviderRequestQueueJobStatus[]
}

export type AiPlayerProviderRequestQueueLaneStatus = {
  lane: string
  priority: number
  activeRequests: number
  queuedRequests: number
  totalStartedRequests: number
  totalCompletedRequests: number
  totalRejectedRequests: number
  averageWaitMs: number
  p95WaitMs: number
  oldestQueuedAgeMs: number | null
}

export type AiPlayerProviderCircuitState = 'closed' | 'open'

export type AiPlayerProviderRateBucketStatus = {
  limit: number | null
  windowMs: number
  usedRequests: number
  remainingRequests: number | null
  resetAt: string | null
}

export type AiPlayerProviderRequestQueueEndpointStatus = {
  provider: string
  model: string
  keyFingerprint: string | null
  activeRequests: number
  queuedRequests: number
  totalStartedRequests: number
  totalCompletedRequests: number
  totalRejectedRequests: number
  totalFailedRequests: number
  totalRateLimitedRequests: number
  averageLatencyMs: number
  p50LatencyMs: number
  p95LatencyMs: number
  consecutiveFailures: number
  circuitState: AiPlayerProviderCircuitState
  backoffUntil: string | null
  rateBucket: AiPlayerProviderRateBucketStatus
  lastStartedAt: string | null
  lastCompletedAt: string | null
  lastSuccessAt: string | null
  lastFailureAt: string | null
}

export type AiPlayerProviderAccountPoolCandidate = {
  provider: string
  model: string
  keyFingerprint: string | null
  source: AiPlayerModelRoutingSource
  byokSource: AiPlayerModelByokSource
  priority: number
  secretConfigured: boolean
  secretSource: string | null
  lastFailureReason: string | null
}

export type AiPlayerProviderAccountPoolHealthStatus = 'healthy' | 'backoff' | 'unconfigured' | 'degraded' | 'disabled'

export type AiPlayerProviderAccountPoolOpsState = {
  enabled: boolean
  maxConcurrency: number | null
  opsNote: string | null
  enterpriseQuota: boolean
  quotaLabel: string | null
  updatedBy: string | null
  updatedAt: string | null
}

export type AiPlayerProviderAccountPoolOpsConfig = {
  provider: string
  model: string
  keyFingerprint: string | null
  enabled: boolean
  maxConcurrency: number | null
  opsNote: string | null
  enterpriseQuota: boolean
  quotaLabel: string | null
  updatedBy: string | null
  updatedAt: string
}

export type UpsertAiPlayerProviderAccountPoolOpsConfigRequest = {
  provider: string
  model: string
  keyFingerprint?: string | null
  enabled?: boolean
  maxConcurrency?: number | null
  opsNote?: string | null
  enterpriseQuota?: boolean
  quotaLabel?: string | null
  opsActorId?: string
  opsAuthRole?: string
  opsAuthSource?: string
  opsReason?: string
  restoreSourceEventId?: string | null
  confirmation?: 'provider_account_ops_confirmed'
  updatedBy?: string
}

export type AiPlayerProviderAccountPoolBillingStats = {
  requestCount: number
  totalTokens: number
  estimatedCostUsd: number
  lastRequestAt: string | null
}

export type AiPlayerProviderAccountPoolAccount = AiPlayerProviderAccountPoolCandidate & {
  accountId: string
  healthStatus: AiPlayerProviderAccountPoolHealthStatus
  dispatchEligible: boolean
  rejectionReasons: string[]
  ops: AiPlayerProviderAccountPoolOpsState
  health: {
    activeRequests: number
    queuedRequests: number
    totalStartedRequests: number
    totalCompletedRequests: number
    totalRejectedRequests: number
    totalFailedRequests: number
    totalRateLimitedRequests: number
    averageLatencyMs: number
    p50LatencyMs: number
    p95LatencyMs: number
    consecutiveFailures: number
    circuitState: AiPlayerProviderCircuitState
    backoffUntil: string | null
    lastStartedAt: string | null
    lastCompletedAt: string | null
    lastSuccessAt: string | null
    lastFailureAt: string | null
  }
  billing: AiPlayerProviderAccountPoolBillingStats
}

export type AiPlayerProviderAccountPoolReadModelResponse = {
  ok: true
  generatedAt: string
  opsMutationDeployment: AiPlayerProviderAccountOpsMutationDeployment
  accountCount: number
  healthyCount: number
  dispatchEligibleCount: number
  selectedAccount: AiPlayerProviderAccountPoolAccount | null
  accounts: AiPlayerProviderAccountPoolAccount[]
}

export type AiPlayerProviderAccountPoolOpsConfigMutationResponse = {
  ok: boolean
  config?: AiPlayerProviderAccountPoolOpsConfig
  error?: string
}

export type RestoreAiPlayerProviderAccountPoolOpsConfigRequest = {
  provider: string
  model: string
  keyFingerprint?: string | null
  restoreEventId?: string
  opsActorId?: string
  opsAuthRole?: string
  opsAuthSource?: string
  opsReason?: string
  confirmation?: 'provider_account_ops_confirmed'
  restoredBy?: string
}

export type AiPlayerProviderAccountPoolOpsAuditAction = 'enabled' | 'disabled' | 'updated'

export type AiPlayerProviderAccountPoolOpsAuditItem = {
  eventId: string
  eventType: 'provider_account_pool_ops_configured'
  actorId: string | null
  provider: string
  model: string
  keyFingerprint: string | null
  action: AiPlayerProviderAccountPoolOpsAuditAction
  enabled: boolean | null
  reason: string | null
  opsReason: string | null
  authRole: string | null
  authSource: string | null
  restoreSourceEventId: string | null
  maxConcurrency: number | null
  enterpriseQuota: boolean | null
  quotaLabel: string | null
  createdAt: string
}

export type ListAiPlayerProviderAccountPoolOpsAuditResponse = {
  ok: true
  generatedAt: string
  items: AiPlayerProviderAccountPoolOpsAuditItem[]
  count: number
}

export type AiPlayerProviderAccountPoolOpsRestoreResponse = {
  ok: boolean
  config?: AiPlayerProviderAccountPoolOpsConfig
  restoredFrom?: AiPlayerProviderAccountPoolOpsAuditItem
  error?: string
}

export type AiPlayerProviderRequestQueueLeaseStatus = {
  leaseId: string
  aiPlayerId: string
  lane: string
  provider: string
  model: string
  keyFingerprint: string | null
  state: 'queued' | 'active'
  ageMs: number
  expiresAt: string | null
}

export type AiPlayerProviderRequestQueueJobStatus = {
  jobId: string
  leaseId: string
  aiPlayerId: string
  lane: string
  provider: string
  model: string
  keyFingerprint: string | null
  state: 'pending' | 'active' | 'expired'
  priority: number
  ageMs: number
  availableAt: string | null
  expiresAt: string | null
  failureReason?: string
}

export type AiPlayerProviderPricingPolicy = {
  provider: string
  model: string
  aliases: string[]
  currency: 'USD'
  unitTokens: number
  inputCacheHitUsdPerUnit: number
  inputCacheMissUsdPerUnit: number
  outputUsdPerUnit: number
  sourceUrl: string
  effectiveAt: string
  discountUntil?: string
  notes: string[]
}

export type AiPlayerProviderPricingEstimateResponse = {
  ok: true
  matched: boolean
  requestedProvider: string | null
  requestedModel: string | null
  policy: AiPlayerProviderPricingPolicy | null
  usage: AiPlayerProviderBillingUsage
  warnings: string[]
}

export type AiPlayerProviderAiCommandCreditPolicy = {
  unitCode: 'ai_command_credit'
  displayName: string
  basis: 'provider_total_tokens'
  tokensPerCredit: number
  minimumChargeCredits: number
  rounding: 'ceil_per_request'
}

export type AiPlayerProviderAiCommandCreditEstimateResponse = {
  ok: true
  policy: AiPlayerProviderAiCommandCreditPolicy
  usage: AiPlayerProviderBillingUsage
  consumedCredits: number
}

export type AiPlayerProviderAiCommandCreditSummaryItem = {
  aiPlayerId: string
  factionId: string
  requestCount: number
  consumedTotalTokens: number
  consumedCredits: number
}

export type AiPlayerProviderAiCommandCreditSummaryResponse = {
  ok: true
  policy: AiPlayerProviderAiCommandCreditPolicy
  requestCount: number
  consumedTotalTokens: number
  consumedCredits: number
  byAiPlayer: AiPlayerProviderAiCommandCreditSummaryItem[]
}

export type AiPlayerProviderAiCommandCreditLedgerEntry = {
  entryId: string
  accountId: string
  worldId: string
  entryType: 'grant' | 'debit' | 'refund'
  amountCredits: number
  balanceAfterCredits: number
  requestId?: string
  aiPlayerId?: string
  factionId?: string
  reason?: string
  createdAt: string
}

export type AiPlayerProviderAiCommandCreditBalance = {
  accountId: string
  worldId: string
  balanceCredits: number
  reservedCredits: number
  availableCredits: number
  grantedCredits: number
  debitedCredits: number
  refundedCredits: number
  ledgerCount: number
}

export type AiPlayerProviderAiCommandCreditBalanceResponse = AiPlayerProviderAiCommandCreditBalance & {
  ok: true
}

export type AiPlayerProviderAiCommandCreditLedgerMutationResponse =
  | {
    ok: true
    entry: AiPlayerProviderAiCommandCreditLedgerEntry
    balance: AiPlayerProviderAiCommandCreditBalance
  }
  | {
    ok: false
    error: 'invalid_ai_command_credit_request' | 'insufficient_ai_command_credits'
    balance?: AiPlayerProviderAiCommandCreditBalance
  }

export type AiPlayerProviderCostReconciliationResponse = {
  ok: true
  source: 'dashboard_manual'
  requestCount: number
  actualCostCny: number | null
  actualCostUsd: number | null
  estimatedCostUsd: number | null
  estimatedCostCny: number | null
  estimatedCostSource: 'manual_input' | 'billing_ledger' | null
  estimatedRequestCount: number | null
  cnyPerUsd: number | null
  actualCostCnyPerRequest: number | null
  actualCostUsdPerRequest: number | null
  estimatedCostCnyPerRequest: number | null
  estimatedCostUsdPerRequest: number | null
  actualVsEstimateRatio: number | null
  varianceCostCny: number | null
  varianceCostUsd: number | null
  warnings: string[]
}

export type AiPlayerProviderDeepSeekBillingWindowLabel = 'today' | 'thisMonth' | 'range'

export type AiPlayerProviderDeepSeekBillingWindow = {
  label: AiPlayerProviderDeepSeekBillingWindowLabel
  from: string
  to: string
  observationSource: 'dashboard_manual' | 'billing_ledger'
  requestCount: number | null
  actualCostCny: number | null
  actualCostUsd: number | null
  estimatedCostUsd: number | null
  estimatedCostCny: number | null
  estimatedCostSource: 'manual_input' | 'billing_ledger' | null
  estimatedRequestCount: number | null
  cnyPerUsd: number | null
  actualCostCnyPerRequest: number | null
  actualCostUsdPerRequest: number | null
  estimatedCostCnyPerRequest: number | null
  estimatedCostUsdPerRequest: number | null
  actualVsEstimateRatio: number | null
  varianceCostCny: number | null
  varianceCostUsd: number | null
  warnings: string[]
}

export type AiPlayerProviderDeepSeekBillingReadModelResponse = {
  ok: true
  source: 'dashboard_manual'
  provider: 'deepseek'
  generatedAt: string
  today: AiPlayerProviderDeepSeekBillingWindow
  thisMonth: AiPlayerProviderDeepSeekBillingWindow
  range: AiPlayerProviderDeepSeekBillingWindow | null
  warnings: string[]
}

export type AiPlayerProviderAccountHealthResponse = {
  path: string
  loaded: boolean
  opsMutationDeployment: AiPlayerProviderAccountOpsMutationDeployment
  playerKeyCount: number
  billingLedgerCount: number
  auditEventCount: number
  budgetWindowCount: number
  budgetReservationCount: number
  persistDirty: boolean
  persistInFlight: boolean
  persistSuccessCount: number
  persistFailureCount: number
  lastPersistAt: number | null
  lastPersistErrorAt: number | null
  corruptQuarantineCount: number
  lastCorruptQuarantineAt: number | null
  security: {
    secretPersistMode: 'encrypted' | 'plaintext' | 'memory_only'
    encryptionKeyConfigured: boolean
    allowPlaintextPersist: boolean
  }
  externalLedgerAuditDb: {
    configured: boolean
    hmacConfigured: boolean
    durableOutboxCount: number
    pendingBillingLedgerCount: number
    pendingAuditEventCount: number
    inFlight: boolean
    successCount: number
    failureCount: number
    lastSuccessAt: number | null
    lastFailureAt: number | null
    lastError: string | null
  }
  externalBudgetGate: {
    configured: boolean
    hmacConfigured: boolean
    failOpen: boolean
    successCount: number
    failureCount: number
    lastSuccessAt: number | null
    lastFailureAt: number | null
    lastError: string | null
  }
}

export type AiPlayerProviderAccountOpsMutationDeployment = {
  production: boolean
  internalOnly: boolean
  trustedProxy: boolean
  trustedProxySignatureConfigured: boolean
  trustedProxySignatureRequired: boolean
  trusted: boolean
  mutationRoutesEnabled: boolean
  blockedReason: 'provider_account_ops_deployment_not_trusted'
    | 'provider_account_ops_trusted_proxy_signature_not_configured'
    | null
}

export type AiPlayerProviderAccountOpsRuntimeConfigRoute = {
  method: 'GET' | 'POST'
  path: string
  requiresActor: boolean
  requiresReason: boolean
  requiresConfirmation: 'provider_account_ops_confirmed' | null
  productionDeploymentGuard: boolean
}

export type AiPlayerProviderAccountOpsReadOnlyConsumerRoute = {
  id: 'ops_runtime_config' | 'account_pool' | 'ops_audit'
  method: 'GET'
  path: string
  responseContract:
    | 'AiPlayerProviderAccountOpsRuntimeConfigResponse'
    | 'AiPlayerProviderAccountPoolReadModelResponse'
    | 'ListAiPlayerProviderAccountPoolOpsAuditResponse'
  optionalQueryParams: string[]
  safeFields: string[]
  forbiddenFields: string[]
}

export type AiPlayerProviderAccountOpsReadOnlyConsumer = {
  mutationRequired: false
  exposesSecrets: false
  exposesRawProviderPayloads: false
  routes: AiPlayerProviderAccountOpsReadOnlyConsumerRoute[]
}

export type AiPlayerProviderAccountOpsRuntimeConfigResponse = {
  ok: true
  generatedAt: string
  opsMutationDeployment: AiPlayerProviderAccountOpsMutationDeployment
  deploymentGuardEnv: {
    internalOnly: string
    trustedProxy: string
    trustedProxySignatureSecret: string
  }
  trustedProxyVerification: {
    signatureRequired: boolean
    signatureSecretConfigured: boolean
    signatureAlgorithm: 'hmac-sha256'
    signatureHeader: 'X-AI-Provider-Ops-Proxy-Signature'
    timestampHeader: 'X-AI-Provider-Ops-Proxy-Timestamp'
    maxSkewMs: number
  }
  authEnv: {
    allowedRoles: string
    allowedAuthSources: string
  }
  actorBinding: {
    actorHeader: string
    roleHeaders: string[]
    authSourceHeader: string
    defaultAuthSource: 'rbac_middleware'
    allowedRolesConfigured: boolean
    allowedRoleCount: number
    allowedAuthSourcesConfigured: boolean
    allowedAuthSourceCount: number
  }
  mutationRoutes: AiPlayerProviderAccountOpsRuntimeConfigRoute[]
  readRoutes: AiPlayerProviderAccountOpsRuntimeConfigRoute[]
  readOnlyConsumer: AiPlayerProviderAccountOpsReadOnlyConsumer
  warnings: string[]
}

export type AiPlayerProviderAuditEventType =
  | 'byok_key_configured'
  | 'byok_key_revoked'
  | 'provider_account_pool_ops_configured'
  | 'provider_request_succeeded'
  | 'provider_request_failed'
  | 'provider_fallback_failed'

export type AiPlayerProviderAuditEvent = {
  eventId: string
  eventType: AiPlayerProviderAuditEventType
  requestId?: string
  aiPlayerId?: string
  factionId?: string
  governorPlayerId?: string
  ownerPlayerId?: string
  actorId?: string
  providerSource?: AiPlayerModelRoutingSource
  byokSource?: AiPlayerModelByokSource
  model?: string
  provider?: string
  keyFingerprint?: string | null
  reason?: string
  queueRunId?: string
  idempotencyKey?: string
  metadata?: Record<string, string | number | boolean | null>
  createdAt: string
}

export type AiPlayerProviderPlayerKeyStatus = 'active' | 'revoked'

export type AiPlayerProviderPlayerKeyReadModel = {
  ownerPlayerId: string
  model: string
  provider: string
  baseUrl?: string
  status: AiPlayerProviderPlayerKeyStatus
  secretConfigured: boolean
  secretSource: 'player_config:byok' | null
  byokSource: 'player_config'
  keyFingerprint: string | null
  createdAt: string
  updatedAt: string
  revokedAt?: string
}

export type UpsertAiPlayerProviderPlayerKeyRequest = {
  model: string
  provider?: string
  baseUrl?: string
  apiKey?: string
  status?: AiPlayerProviderPlayerKeyStatus
  updatedBy?: string
}

export type AiPlayerProviderPlayerKeyMutationResponse = {
  ok: boolean
  key?: AiPlayerProviderPlayerKeyReadModel
  error?: string
}

export type ListAiPlayerProviderBillingLedgerResponse = {
  items: AiPlayerProviderBillingLedgerEntry[]
  count: number
}

export type ListAiPlayerProviderAuditEventsResponse = {
  items: AiPlayerProviderAuditEvent[]
  count: number
}

export type ListAiPlayerProviderBudgetWindowsResponse = {
  items: AiPlayerProviderBudgetWindow[]
  count: number
}

export type ListAiPlayerProviderTokenSummaryResponse = {
  items: AiPlayerProviderTokenSummaryItem[]
  count: number
}

export type ListAiPlayerProviderTokenBalanceResponse = {
  items: AiPlayerProviderTokenBalanceItem[]
  count: number
}

export type ListAiPlayerProviderPricingPoliciesResponse = {
  items: AiPlayerProviderPricingPolicy[]
  count: number
}

export type AiPlayerProviderRequestQueueStatusResponse = {
  ok: true
  queue: AiPlayerProviderRequestQueueStatus
}
