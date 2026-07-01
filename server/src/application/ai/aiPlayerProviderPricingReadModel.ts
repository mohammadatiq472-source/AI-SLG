import type {
  AiPlayerProviderBillingAccountType,
  AiPlayerProviderBillingLedgerEntry,
  AiPlayerProviderBillingUsage,
  AiPlayerProviderCostReconciliationResponse,
  AiPlayerProviderDeepSeekBillingReadModelResponse,
  AiPlayerProviderDeepSeekBillingWindow,
  AiPlayerProviderDeepSeekBillingWindowLabel,
  AiPlayerProviderPricingEstimateResponse,
  AiPlayerProviderPricingPolicy,
} from '../../../../shared/contracts/aiPlayerProviderAccount'

export type BillingLedgerEstimateFilter = {
  aiPlayerId?: string
  factionId?: string
  governorPlayerId?: string
  billingAccountType?: AiPlayerProviderBillingAccountType
  billingAccountId?: string
  provider?: string
  model?: string
  keyFingerprint?: string
  fromMs?: number
  toMs?: number
}

export type DeepSeekBillingObservationInput = {
  requestCount?: number
  actualCostCny?: number
  actualCostUsd?: number
  estimatedCostUsd?: number
}

type ProviderUsagePricingPolicy = AiPlayerProviderPricingPolicy & {
  modelKeys: readonly string[]
}

const PRICING_UNIT_TOKENS = 1_000_000
const DEEPSEEK_PRICING_SOURCE_URL = 'https://api-docs.deepseek.com/quick_start/pricing'
const DEEPSEEK_CACHE_PRICING_EFFECTIVE_AT = '2026-04-26T12:15:00.000Z'
const DEEPSEEK_PRO_DISCOUNT_UNTIL = '2026-05-31T15:59:00.000Z'

const DEEPSEEK_PRICING_POLICIES: readonly ProviderUsagePricingPolicy[] = [
  {
    provider: 'api.deepseek.com',
    model: 'deepseek-v4-flash',
    aliases: ['deepseek-chat', 'deepseek-reasoner'],
    modelKeys: ['deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner'],
    currency: 'USD',
    unitTokens: PRICING_UNIT_TOKENS,
    inputCacheHitUsdPerUnit: 0.0028,
    inputCacheMissUsdPerUnit: 0.14,
    outputUsdPerUnit: 0.28,
    sourceUrl: DEEPSEEK_PRICING_SOURCE_URL,
    effectiveAt: DEEPSEEK_CACHE_PRICING_EFFECTIVE_AT,
    notes: [
      'deepseek-chat and deepseek-reasoner are compatibility aliases for deepseek-v4-flash.',
      'DeepSeek-named models routed through an internal relay still use this policy even when provider host differs.',
      'When prompt cache hit/miss token fields are missing, promptTokens are estimated as cache miss input.',
    ],
  },
  {
    provider: 'api.deepseek.com',
    model: 'deepseek-v4-pro',
    aliases: [],
    modelKeys: ['deepseek-v4-pro'],
    currency: 'USD',
    unitTokens: PRICING_UNIT_TOKENS,
    inputCacheHitUsdPerUnit: 0.003625,
    inputCacheMissUsdPerUnit: 0.435,
    outputUsdPerUnit: 0.87,
    sourceUrl: DEEPSEEK_PRICING_SOURCE_URL,
    effectiveAt: DEEPSEEK_CACHE_PRICING_EFFECTIVE_AT,
    discountUntil: DEEPSEEK_PRO_DISCOUNT_UNTIL,
    notes: [
      'DeepSeek lists this as the current 75% discounted v4-pro price.',
      'DeepSeek-named models routed through an internal relay still use this policy even when provider host differs.',
      'When prompt cache hit/miss token fields are missing, promptTokens are estimated as cache miss input.',
    ],
  },
]

export function normalizePricingKey(input: string | null | undefined) {
  return (input ?? '').trim().toLowerCase()
}

export function resolveProviderUsagePricingPolicy(
  provider: string | null | undefined,
  model: string | null | undefined,
): ProviderUsagePricingPolicy | null {
  const normalizedProvider = normalizePricingKey(provider)
  const normalizedModel = normalizePricingKey(model)
  return DEEPSEEK_PRICING_POLICIES.find((policy) => {
    const modelMatches = policy.modelKeys.includes(normalizedModel)
    const providerMatches = !normalizedProvider || normalizedProvider === policy.provider
    return modelMatches && (providerMatches || normalizedModel.startsWith('deepseek-'))
  }) ?? null
}

function roundEstimatedCostUsd(value: number) {
  return Math.round(value * 1_000_000_000_000) / 1_000_000_000_000
}

export function roundCostObservation(value: number) {
  return Math.round(value * 1_000_000_000_000) / 1_000_000_000_000
}

function readCostObservationNumber(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return undefined
  }
  return value
}

function readPositiveCostObservationNumber(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined
  }
  return value
}

function divideCostObservation(value: number | undefined, divisor: number) {
  return value === undefined ? null : roundCostObservation(value / divisor)
}

function isoFromMs(value: number) {
  return new Date(value).toISOString()
}

function buildUtcRangeStarts(now = new Date()) {
  const todayStartedAtMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const monthStartedAtMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  return {
    todayStartedAtMs,
    tomorrowStartedAtMs: todayStartedAtMs + 86_400_000,
    monthStartedAtMs,
    nextMonthStartedAtMs: Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  }
}

function resolveReadModelNow(nowIso: string | undefined): Date {
  if (nowIso) {
    const parsed = new Date(nowIso)
    if (Number.isFinite(parsed.getTime())) {
      return parsed
    }
  }
  return new Date()
}

function filterBillingLedgerForEstimate(
  entries: readonly AiPlayerProviderBillingLedgerEntry[],
  options: BillingLedgerEstimateFilter = {},
) {
  return entries.filter((entry) => {
    if (options.aiPlayerId && entry.aiPlayerId !== options.aiPlayerId) return false
    if (options.factionId && entry.factionId !== options.factionId) return false
    if (options.governorPlayerId && entry.governorPlayerId !== options.governorPlayerId) return false
    if (options.billingAccountType && entry.billingAccountType !== options.billingAccountType) return false
    if (options.billingAccountId && entry.billingAccountId !== options.billingAccountId) return false
    if (options.provider && entry.provider !== options.provider) return false
    if (options.model && entry.model !== options.model) return false
    if (options.keyFingerprint && entry.keyFingerprint !== options.keyFingerprint) return false
    if (options.fromMs !== undefined || options.toMs !== undefined) {
      const createdAtMs = Date.parse(entry.createdAt)
      if (!Number.isFinite(createdAtMs)) return false
      if (options.fromMs !== undefined && createdAtMs < options.fromMs) return false
      if (options.toMs !== undefined && createdAtMs >= options.toMs) return false
    }
    return true
  })
}

function estimateUsageCostUsdFromPricingPolicy(
  policy: ProviderUsagePricingPolicy,
  usage: AiPlayerProviderBillingUsage,
) {
  const promptTokens = usage.promptTokens ?? 0
  const completionTokens = usage.completionTokens ?? Math.max(0, (usage.totalTokens ?? 0) - promptTokens)
  const hasCacheBreakdown = usage.promptCacheHitTokens !== undefined || usage.promptCacheMissTokens !== undefined
  const promptCacheHitTokens = usage.promptCacheHitTokens ?? 0
  const promptCacheMissTokens = usage.promptCacheMissTokens
    ?? (hasCacheBreakdown ? Math.max(0, promptTokens - promptCacheHitTokens) : promptTokens)
  const rawCostUsd = (
    (promptCacheHitTokens * policy.inputCacheHitUsdPerUnit)
    + (promptCacheMissTokens * policy.inputCacheMissUsdPerUnit)
    + (completionTokens * policy.outputUsdPerUnit)
  ) / policy.unitTokens
  return roundEstimatedCostUsd(rawCostUsd)
}

export function applyProviderPricingToUsage(
  provider: string | null | undefined,
  model: string | null | undefined,
  usage: AiPlayerProviderBillingUsage,
): AiPlayerProviderBillingUsage {
  if (usage.estimatedCostUsd !== undefined) {
    return usage
  }
  const policy = resolveProviderUsagePricingPolicy(provider, model)
  if (!policy) {
    return usage
  }
  return {
    ...usage,
    estimatedCostUsd: estimateUsageCostUsdFromPricingPolicy(policy, usage),
    estimatedCostSource: 'pricing_policy',
  }
}

function toPublicPricingPolicy(policy: ProviderUsagePricingPolicy): AiPlayerProviderPricingPolicy {
  const { modelKeys: _modelKeys, ...publicPolicy } = policy
  return structuredClone(publicPolicy)
}

export function listAiPlayerProviderPricingPoliciesReadModel(options: {
  provider?: string | null
  model?: string | null
} = {}) {
  const normalizedProvider = normalizePricingKey(options.provider)
  const normalizedModel = normalizePricingKey(options.model)
  const items: AiPlayerProviderPricingPolicy[] = DEEPSEEK_PRICING_POLICIES
    .filter((policy) => !normalizedProvider || policy.provider === normalizedProvider)
    .filter((policy) => !normalizedModel || policy.modelKeys.includes(normalizedModel))
    .map(toPublicPricingPolicy)
  return {
    items,
    count: items.length,
  }
}

export function estimateAiPlayerProviderPricingUsageReadModel(options: {
  provider?: string | null
  model?: string | null
  usage: AiPlayerProviderBillingUsage
}): AiPlayerProviderPricingEstimateResponse {
  const requestedProvider = options.provider ?? null
  const requestedModel = options.model ?? null
  const policy = resolveProviderUsagePricingPolicy(requestedProvider, requestedModel)
  const usage = applyProviderPricingToUsage(requestedProvider, requestedModel, options.usage)
  return {
    ok: true,
    matched: Boolean(policy),
    requestedProvider,
    requestedModel,
    policy: policy ? toPublicPricingPolicy(policy) : null,
    usage,
    warnings: policy ? [] : ['pricing_policy_not_found'],
  }
}

function summarizeBillingLedgerEstimatedCost(
  entries: readonly AiPlayerProviderBillingLedgerEntry[],
  options: BillingLedgerEstimateFilter = {},
) {
  const filtered = filterBillingLedgerForEstimate(entries, options)
  return {
    requestCount: filtered.length,
    estimatedCostUsd: roundCostObservation(filtered.reduce((sum, entry) => sum + (entry.usage.estimatedCostUsd ?? 0), 0)),
  }
}

export function reconcileAiPlayerProviderCostObservationReadModel(
  entries: readonly AiPlayerProviderBillingLedgerEntry[],
  options: {
    requestCount: number
    actualCostCny?: number
    actualCostUsd?: number
    estimatedCostUsd?: number
    cnyPerUsd?: number
    estimateSource?: 'ledger'
    ledgerFilter?: BillingLedgerEstimateFilter
  },
): AiPlayerProviderCostReconciliationResponse {
  const requestCount = Math.max(1, Math.trunc(options.requestCount))
  const cnyPerUsd = readPositiveCostObservationNumber(options.cnyPerUsd)
  const inputActualCostCny = readCostObservationNumber(options.actualCostCny)
  const inputActualCostUsd = readCostObservationNumber(options.actualCostUsd)
  let estimatedCostUsd = readCostObservationNumber(options.estimatedCostUsd)
  let estimatedCostSource: 'manual_input' | 'billing_ledger' | null = estimatedCostUsd === undefined ? null : 'manual_input'
  let estimatedRequestCount: number | null = null
  if (estimatedCostUsd === undefined && options.estimateSource === 'ledger') {
    const ledgerEstimate = summarizeBillingLedgerEstimatedCost(entries, options.ledgerFilter)
    estimatedCostUsd = ledgerEstimate.estimatedCostUsd
    estimatedCostSource = 'billing_ledger'
    estimatedRequestCount = ledgerEstimate.requestCount
  }
  const actualCostCny = inputActualCostCny === undefined ? undefined : roundCostObservation(inputActualCostCny)
  const actualCostUsd = inputActualCostUsd !== undefined
    ? roundCostObservation(inputActualCostUsd)
    : actualCostCny !== undefined && cnyPerUsd !== undefined
      ? roundCostObservation(actualCostCny / cnyPerUsd)
      : undefined
  const estimatedCostCny = estimatedCostUsd !== undefined && cnyPerUsd !== undefined
    ? roundCostObservation(estimatedCostUsd * cnyPerUsd)
    : undefined
  const actualVsEstimateRatio = actualCostCny !== undefined && estimatedCostCny !== undefined && estimatedCostCny > 0
    ? roundCostObservation(actualCostCny / estimatedCostCny)
    : actualCostUsd !== undefined && estimatedCostUsd !== undefined && estimatedCostUsd > 0
      ? roundCostObservation(actualCostUsd / estimatedCostUsd)
      : undefined
  const warnings: string[] = []
  if (actualCostCny === undefined && actualCostUsd === undefined) {
    warnings.push('actual_cost_missing')
  }
  if (estimatedCostUsd === undefined) {
    warnings.push('estimated_cost_missing')
  }
  if (estimatedCostSource === 'billing_ledger' && estimatedRequestCount === 0) {
    warnings.push('billing_ledger_empty')
  }
  if (estimatedRequestCount !== null && estimatedRequestCount !== requestCount) {
    warnings.push('request_count_mismatch')
  }
  if (cnyPerUsd === undefined && (actualCostCny !== undefined || estimatedCostUsd !== undefined)) {
    warnings.push('cny_per_usd_missing')
  }

  return {
    ok: true,
    source: 'dashboard_manual',
    requestCount,
    actualCostCny: actualCostCny ?? null,
    actualCostUsd: actualCostUsd ?? null,
    estimatedCostUsd: estimatedCostUsd === undefined ? null : roundCostObservation(estimatedCostUsd),
    estimatedCostCny: estimatedCostCny ?? null,
    estimatedCostSource,
    estimatedRequestCount,
    cnyPerUsd: cnyPerUsd ?? null,
    actualCostCnyPerRequest: divideCostObservation(actualCostCny, requestCount),
    actualCostUsdPerRequest: divideCostObservation(actualCostUsd, requestCount),
    estimatedCostCnyPerRequest: divideCostObservation(estimatedCostCny, requestCount),
    estimatedCostUsdPerRequest: divideCostObservation(estimatedCostUsd, requestCount),
    actualVsEstimateRatio: actualVsEstimateRatio ?? null,
    varianceCostCny: actualCostCny !== undefined && estimatedCostCny !== undefined
      ? roundCostObservation(actualCostCny - estimatedCostCny)
      : null,
    varianceCostUsd: actualCostUsd !== undefined && estimatedCostUsd !== undefined
      ? roundCostObservation(actualCostUsd - estimatedCostUsd)
      : null,
    warnings,
  }
}

function buildDeepSeekBillingWindow(
  entries: readonly AiPlayerProviderBillingLedgerEntry[],
  input: {
    label: AiPlayerProviderDeepSeekBillingWindowLabel
    fromMs: number
    toMs: number
    observation?: DeepSeekBillingObservationInput
    cnyPerUsd?: number
    estimateSource?: 'ledger'
    ledgerFilter?: BillingLedgerEstimateFilter
  },
): AiPlayerProviderDeepSeekBillingWindow {
  const requestCount = input.observation?.requestCount
  if (requestCount !== undefined) {
    const reconciliation = reconcileAiPlayerProviderCostObservationReadModel(entries, {
      requestCount,
      actualCostCny: input.observation?.actualCostCny,
      actualCostUsd: input.observation?.actualCostUsd,
      estimatedCostUsd: input.observation?.estimatedCostUsd,
      cnyPerUsd: input.cnyPerUsd,
      estimateSource: input.estimateSource,
      ledgerFilter: {
        ...input.ledgerFilter,
        fromMs: input.fromMs,
        toMs: input.toMs,
      },
    })
    return {
      label: input.label,
      from: isoFromMs(input.fromMs),
      to: isoFromMs(input.toMs),
      observationSource: 'dashboard_manual',
      requestCount: reconciliation.requestCount,
      actualCostCny: reconciliation.actualCostCny,
      actualCostUsd: reconciliation.actualCostUsd,
      estimatedCostUsd: reconciliation.estimatedCostUsd,
      estimatedCostCny: reconciliation.estimatedCostCny,
      estimatedCostSource: reconciliation.estimatedCostSource,
      estimatedRequestCount: reconciliation.estimatedRequestCount,
      cnyPerUsd: reconciliation.cnyPerUsd,
      actualCostCnyPerRequest: reconciliation.actualCostCnyPerRequest,
      actualCostUsdPerRequest: reconciliation.actualCostUsdPerRequest,
      estimatedCostCnyPerRequest: reconciliation.estimatedCostCnyPerRequest,
      estimatedCostUsdPerRequest: reconciliation.estimatedCostUsdPerRequest,
      actualVsEstimateRatio: reconciliation.actualVsEstimateRatio,
      varianceCostCny: reconciliation.varianceCostCny,
      varianceCostUsd: reconciliation.varianceCostUsd,
      warnings: reconciliation.warnings,
    }
  }

  const cnyPerUsd = readPositiveCostObservationNumber(input.cnyPerUsd)
  const actualCostCny = readCostObservationNumber(input.observation?.actualCostCny)
  const inputActualCostUsd = readCostObservationNumber(input.observation?.actualCostUsd)
  const actualCostUsd = inputActualCostUsd !== undefined
    ? roundCostObservation(inputActualCostUsd)
    : actualCostCny !== undefined && cnyPerUsd !== undefined
      ? roundCostObservation(actualCostCny / cnyPerUsd)
      : undefined
  let estimatedCostUsd = readCostObservationNumber(input.observation?.estimatedCostUsd)
  let estimatedCostSource: 'manual_input' | 'billing_ledger' | null = estimatedCostUsd === undefined ? null : 'manual_input'
  let estimatedRequestCount: number | null = null
  if (estimatedCostUsd === undefined && input.estimateSource === 'ledger') {
    const ledgerEstimate = summarizeBillingLedgerEstimatedCost(entries, {
      ...input.ledgerFilter,
      fromMs: input.fromMs,
      toMs: input.toMs,
    })
    estimatedCostUsd = ledgerEstimate.estimatedCostUsd
    estimatedCostSource = 'billing_ledger'
    estimatedRequestCount = ledgerEstimate.requestCount
  }
  const ledgerDerivedRequestCount = estimatedCostSource === 'billing_ledger' && estimatedRequestCount && estimatedRequestCount > 0
    ? estimatedRequestCount
    : null
  const estimatedCostCny = estimatedCostUsd !== undefined && cnyPerUsd !== undefined
    ? roundCostObservation(estimatedCostUsd * cnyPerUsd)
    : undefined
  const warnings: string[] = []
  if (ledgerDerivedRequestCount === null && estimatedCostSource !== 'billing_ledger') {
    warnings.push('request_count_missing')
  }
  if (actualCostCny === undefined && actualCostUsd === undefined && estimatedCostSource !== 'billing_ledger') {
    warnings.push('actual_cost_missing')
  }
  if (estimatedCostUsd === undefined) {
    warnings.push('estimated_cost_missing')
  }
  if (estimatedCostSource === 'billing_ledger' && estimatedRequestCount === 0) {
    warnings.push('billing_ledger_empty')
  }
  if (cnyPerUsd === undefined && (actualCostCny !== undefined || estimatedCostUsd !== undefined)) {
    warnings.push('cny_per_usd_missing')
  }

  return {
    label: input.label,
    from: isoFromMs(input.fromMs),
    to: isoFromMs(input.toMs),
    observationSource: estimatedCostSource === 'billing_ledger' ? 'billing_ledger' : 'dashboard_manual',
    requestCount: ledgerDerivedRequestCount,
    actualCostCny: actualCostCny === undefined ? null : roundCostObservation(actualCostCny),
    actualCostUsd: actualCostUsd ?? null,
    estimatedCostUsd: estimatedCostUsd === undefined ? null : roundCostObservation(estimatedCostUsd),
    estimatedCostCny: estimatedCostCny ?? null,
    estimatedCostSource,
    estimatedRequestCount,
    cnyPerUsd: cnyPerUsd ?? null,
    actualCostCnyPerRequest: null,
    actualCostUsdPerRequest: null,
    estimatedCostCnyPerRequest: ledgerDerivedRequestCount === null
      ? null
      : divideCostObservation(estimatedCostCny, ledgerDerivedRequestCount),
    estimatedCostUsdPerRequest: ledgerDerivedRequestCount === null
      ? null
      : divideCostObservation(estimatedCostUsd, ledgerDerivedRequestCount),
    actualVsEstimateRatio: null,
    varianceCostCny: null,
    varianceCostUsd: null,
    warnings,
  }
}

export function getAiPlayerProviderDeepSeekBillingReadModelReadModel(
  entries: readonly AiPlayerProviderBillingLedgerEntry[],
  options: {
    nowIso?: string
    cnyPerUsd?: number
    estimateSource?: 'ledger'
    ledgerFilter?: BillingLedgerEstimateFilter
    today?: DeepSeekBillingObservationInput
    thisMonth?: DeepSeekBillingObservationInput
    range?: {
      fromMs: number
      toMs: number
      observation?: DeepSeekBillingObservationInput
    }
  } = {},
): AiPlayerProviderDeepSeekBillingReadModelResponse {
  const generatedAt = resolveReadModelNow(options.nowIso)
  const {
    todayStartedAtMs,
    tomorrowStartedAtMs,
    monthStartedAtMs,
    nextMonthStartedAtMs,
  } = buildUtcRangeStarts(generatedAt)
  const common = {
    cnyPerUsd: options.cnyPerUsd,
    estimateSource: options.estimateSource,
    ledgerFilter: options.ledgerFilter,
  }
  const today = buildDeepSeekBillingWindow(entries, {
    label: 'today',
    fromMs: todayStartedAtMs,
    toMs: tomorrowStartedAtMs,
    observation: options.today,
    ...common,
  })
  const thisMonth = buildDeepSeekBillingWindow(entries, {
    label: 'thisMonth',
    fromMs: monthStartedAtMs,
    toMs: nextMonthStartedAtMs,
    observation: options.thisMonth,
    ...common,
  })
  const range = options.range
    ? buildDeepSeekBillingWindow(entries, {
      label: 'range',
      fromMs: options.range.fromMs,
      toMs: options.range.toMs,
      observation: options.range.observation,
      ...common,
    })
    : null
  const warnings = [today, thisMonth, range]
    .filter((item): item is AiPlayerProviderDeepSeekBillingWindow => Boolean(item))
    .flatMap((item) => item.warnings.map((warning) => `${item.label}:${warning}`))

  return {
    ok: true,
    source: 'dashboard_manual',
    provider: 'deepseek',
    generatedAt: generatedAt.toISOString(),
    today,
    thisMonth,
    range,
    warnings,
  }
}
