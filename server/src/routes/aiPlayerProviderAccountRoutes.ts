import type { IncomingMessage, ServerResponse } from 'node:http'
import { getAiPlayerProviderAccountOpsMutationDeployment } from '../application/ai/aiPlayerProviderAccountOpsDeployment'
import {
  restoreAiPlayerProviderAccountPoolOpsConfigRequestSchema,
  upsertAiPlayerProviderAccountPoolOpsConfigRequestSchema,
  upsertAiPlayerProviderPlayerKeyRequestSchema,
} from '../../../shared/schemas/aiPlayerProviderAccount'
import {
  debitAiPlayerProviderAiCommandCredits,
  estimateAiPlayerProviderAiCommandCreditUsage,
  estimateAiPlayerProviderPricingUsage,
  getAiPlayerProviderAccountPoolReadModel,
  getAiPlayerProviderDeepSeekBillingReadModel,
  getAiPlayerProviderAiCommandCreditBalance,
  getAiPlayerProviderAccountStoreHealth,
  getAiPlayerProviderPlayerKey,
  grantAiPlayerProviderAiCommandCredits,
  listAiPlayerProviderAiCommandCreditSummary,
  listAiPlayerProviderAccountPoolOpsAudit,
  listAiPlayerProviderAuditEvents,
  listAiPlayerProviderBillingLedger,
  listAiPlayerProviderBudgetWindows,
  listAiPlayerProviderPricingPolicies,
  listAiPlayerProviderTokenBalance,
  listAiPlayerProviderTokenSummary,
  reconcileAiPlayerProviderCostObservation,
  restoreAiPlayerProviderAccountPoolOpsConfig,
  revokeAiPlayerProviderPlayerKey,
  upsertAiPlayerProviderAccountPoolOpsConfig,
  upsertAiPlayerProviderPlayerKey,
} from '../application/ai/aiPlayerProviderAccountStore'
import {
  getAiPlayerRuntimeModelRequestQueueStatusAsync,
  listAiPlayerRuntimeModelProviderAccountCandidates,
} from '../application/ai/aiPlayerRuntimeProposalModel'
import { resolveAiPlayerRuntimeModelTargetCandidates } from '../application/ai/aiPlayerRuntimeModelTarget'
import { readJsonBody, writeJson } from './http'
import {
  bindProviderAccountOpsActor,
  buildProviderAccountOpsRuntimeConfig,
  rejectUntrustedProviderAccountOpsMutation,
} from './aiPlayerProviderAccountOpsRouteSupport'
import {
  decodePathSegment,
  parseBooleanFilterParam,
  parseLimit,
  parsePositiveIntegerParam,
  parseUsageNumberParam,
  parseUtcBoundary,
  readCreditBodyNumber,
  readCreditBodyString,
  readDeepSeekBillingObservation,
  readPricingEstimateUsage,
} from './aiPlayerProviderAccountRouteParams'

const PREFIX = '/api/ai/provider'

export async function dispatchAiPlayerProviderAccountRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  url: URL,
): Promise<boolean> {
  if (!pathname.startsWith(PREFIX)) {
    return false
  }

  if (req.method === 'GET' && pathname === `${PREFIX}/health`) {
    writeJson(res, 200, {
      ...getAiPlayerProviderAccountStoreHealth(),
      opsMutationDeployment: getAiPlayerProviderAccountOpsMutationDeployment(),
    })
    return true
  }

  if (req.method === 'GET' && pathname === `${PREFIX}/billing-ledger`) {
    writeJson(res, 200, listAiPlayerProviderBillingLedger({
      limit: parseLimit(url),
      aiPlayerId: url.searchParams.get('aiPlayerId')?.trim() || undefined,
      factionId: url.searchParams.get('factionId')?.trim() || undefined,
      governorPlayerId: url.searchParams.get('governorPlayerId')?.trim() || undefined,
      billingAccountType: url.searchParams.get('billingAccountType') === 'faction_byok'
        || url.searchParams.get('billingAccountType') === 'player_byok'
        || url.searchParams.get('billingAccountType') === 'platform'
        ? url.searchParams.get('billingAccountType') as 'faction_byok' | 'player_byok' | 'platform'
        : undefined,
    }))
    return true
  }

  if (req.method === 'GET' && pathname === `${PREFIX}/audit-events`) {
    const eventType = url.searchParams.get('eventType')?.trim()
    writeJson(res, 200, listAiPlayerProviderAuditEvents({
      limit: parseLimit(url),
      aiPlayerId: url.searchParams.get('aiPlayerId')?.trim() || undefined,
      factionId: url.searchParams.get('factionId')?.trim() || undefined,
      governorPlayerId: url.searchParams.get('governorPlayerId')?.trim() || undefined,
      ownerPlayerId: url.searchParams.get('ownerPlayerId')?.trim() || undefined,
      eventType: eventType === 'byok_key_configured'
        || eventType === 'byok_key_revoked'
        || eventType === 'provider_account_pool_ops_configured'
        || eventType === 'provider_request_succeeded'
        || eventType === 'provider_request_failed'
        || eventType === 'provider_fallback_failed'
        ? eventType
        : undefined,
    }))
    return true
  }

  if (req.method === 'GET' && pathname === `${PREFIX}/account-pool/ops-audit`) {
    writeJson(res, 200, listAiPlayerProviderAccountPoolOpsAudit({
      limit: parseLimit(url),
      provider: url.searchParams.get('provider')?.trim() || undefined,
      model: url.searchParams.get('model')?.trim() || undefined,
      keyFingerprint: url.searchParams.has('keyFingerprint')
        ? url.searchParams.get('keyFingerprint')
        : undefined,
      actorId: url.searchParams.get('actorId')?.trim() || undefined,
      enabled: parseBooleanFilterParam(url, 'enabled'),
    }))
    return true
  }

  if (req.method === 'GET' && pathname === `${PREFIX}/account-pool/ops-runtime-config`) {
    writeJson(res, 200, buildProviderAccountOpsRuntimeConfig(PREFIX))
    return true
  }

  if (req.method === 'GET' && pathname === `${PREFIX}/budget-windows`) {
    const billingAccountType = url.searchParams.get('billingAccountType')
    const budgetTier = url.searchParams.get('budgetTier')
    writeJson(res, 200, listAiPlayerProviderBudgetWindows({
      limit: parseLimit(url),
      billingAccountType: billingAccountType === 'faction_byok'
        || billingAccountType === 'player_byok'
        || billingAccountType === 'platform'
        ? billingAccountType
        : undefined,
      billingAccountId: url.searchParams.get('billingAccountId')?.trim() || undefined,
      budgetTier: budgetTier === 'strict_action'
        || budgetTier === 'economy_chat'
        || budgetTier === 'disabled'
        ? budgetTier
        : undefined,
    }))
    return true
  }

  if (req.method === 'GET' && pathname === `${PREFIX}/request-queue`) {
    writeJson(res, 200, {
      ok: true,
      queue: await getAiPlayerRuntimeModelRequestQueueStatusAsync(),
    })
    return true
  }

  if (req.method === 'GET' && pathname === `${PREFIX}/account-pool`) {
    const candidates = resolveAiPlayerRuntimeModelTargetCandidates({
      factionId: url.searchParams.get('factionId')?.trim() || undefined,
      ownerPlayerId: url.searchParams.get('ownerPlayerId')?.trim()
        || url.searchParams.get('governorPlayerId')?.trim()
        || undefined,
    })
    writeJson(res, 200, {
      ...getAiPlayerProviderAccountPoolReadModel({
        candidates: listAiPlayerRuntimeModelProviderAccountCandidates(candidates),
        queue: await getAiPlayerRuntimeModelRequestQueueStatusAsync(),
      }),
      opsMutationDeployment: getAiPlayerProviderAccountOpsMutationDeployment(),
    })
    return true
  }

  if (req.method === 'POST' && pathname === `${PREFIX}/account-pool/ops-config`) {
    if (rejectUntrustedProviderAccountOpsMutation(req, res, `${url.pathname}${url.search}`)) {
      return true
    }
    const parsed = upsertAiPlayerProviderAccountPoolOpsConfigRequestSchema.safeParse(await readJsonBody(req))
    if (!parsed.success) {
      writeJson(res, 422, { ok: false, error: parsed.error.message })
      return true
    }
    const bound = bindProviderAccountOpsActor(req, parsed.data)
    if (!bound.ok) {
      writeJson(res, 403, { ok: false, error: bound.error })
      return true
    }
    const result = upsertAiPlayerProviderAccountPoolOpsConfig(bound.value)
    writeJson(res, result.ok ? 200 : 422, result)
    return true
  }

  if (req.method === 'POST' && pathname === `${PREFIX}/account-pool/ops-restore`) {
    if (rejectUntrustedProviderAccountOpsMutation(req, res, `${url.pathname}${url.search}`)) {
      return true
    }
    const parsed = restoreAiPlayerProviderAccountPoolOpsConfigRequestSchema.safeParse(await readJsonBody(req))
    if (!parsed.success) {
      writeJson(res, 422, { ok: false, error: parsed.error.message })
      return true
    }
    const bound = bindProviderAccountOpsActor(req, parsed.data)
    if (!bound.ok) {
      writeJson(res, 403, { ok: false, error: bound.error })
      return true
    }
    const result = restoreAiPlayerProviderAccountPoolOpsConfig(bound.value)
    writeJson(res, result.ok ? 200 : (result.error?.startsWith('invalid_') ? 422 : 404), result)
    return true
  }

  if (req.method === 'GET' && pathname === `${PREFIX}/pricing-policies`) {
    writeJson(res, 200, listAiPlayerProviderPricingPolicies({
      provider: url.searchParams.get('provider')?.trim() || undefined,
      model: url.searchParams.get('model')?.trim() || undefined,
    }))
    return true
  }

  if (req.method === 'GET' && pathname === `${PREFIX}/pricing-estimate`) {
    writeJson(res, 200, estimateAiPlayerProviderPricingUsage({
      provider: url.searchParams.get('provider')?.trim() || undefined,
      model: url.searchParams.get('model')?.trim() || undefined,
      usage: readPricingEstimateUsage(url),
    }))
    return true
  }

  if (req.method === 'GET' && pathname === `${PREFIX}/ai-command-credit-estimate`) {
    writeJson(res, 200, estimateAiPlayerProviderAiCommandCreditUsage({
      usage: readPricingEstimateUsage(url),
    }))
    return true
  }

  if (req.method === 'GET' && pathname === `${PREFIX}/ai-command-credit-summary`) {
    const billingAccountType = url.searchParams.get('billingAccountType')
    writeJson(res, 200, listAiPlayerProviderAiCommandCreditSummary({
      aiPlayerId: url.searchParams.get('aiPlayerId')?.trim() || undefined,
      factionId: url.searchParams.get('factionId')?.trim() || undefined,
      governorPlayerId: url.searchParams.get('governorPlayerId')?.trim() || undefined,
      billingAccountType: billingAccountType === 'faction_byok'
        || billingAccountType === 'player_byok'
        || billingAccountType === 'platform'
        ? billingAccountType
        : undefined,
      billingAccountId: url.searchParams.get('billingAccountId')?.trim() || undefined,
      provider: url.searchParams.get('provider')?.trim() || undefined,
      model: url.searchParams.get('model')?.trim() || undefined,
    }))
    return true
  }

  if (req.method === 'GET' && pathname === `${PREFIX}/cost-reconciliation`) {
    const requestCount = parsePositiveIntegerParam(url, 'requestCount')
    if (requestCount === undefined) {
      writeJson(res, 422, { ok: false, error: 'invalid_request_count' })
      return true
    }
    const billingAccountType = url.searchParams.get('billingAccountType')
    writeJson(res, 200, reconcileAiPlayerProviderCostObservation({
      requestCount,
      actualCostCny: parseUsageNumberParam(url, 'actualCostCny'),
      actualCostUsd: parseUsageNumberParam(url, 'actualCostUsd'),
      estimatedCostUsd: parseUsageNumberParam(url, 'estimatedCostUsd'),
      cnyPerUsd: parseUsageNumberParam(url, 'cnyPerUsd'),
      estimateSource: url.searchParams.get('estimateSource') === 'ledger' ? 'ledger' : undefined,
      ledgerFilter: {
        aiPlayerId: url.searchParams.get('aiPlayerId')?.trim() || undefined,
        factionId: url.searchParams.get('factionId')?.trim() || undefined,
        governorPlayerId: url.searchParams.get('governorPlayerId')?.trim() || undefined,
        billingAccountType: billingAccountType === 'faction_byok'
          || billingAccountType === 'player_byok'
          || billingAccountType === 'platform'
          ? billingAccountType
          : undefined,
        billingAccountId: url.searchParams.get('billingAccountId')?.trim() || undefined,
        provider: url.searchParams.get('provider')?.trim() || undefined,
        model: url.searchParams.get('model')?.trim() || undefined,
        keyFingerprint: url.searchParams.get('keyFingerprint')?.trim() || undefined,
      },
    }))
    return true
  }

  if (req.method === 'GET' && pathname === `${PREFIX}/deepseek-billing`) {
    const fromMs = parseUtcBoundary(url.searchParams.get('from'))
    const toMs = parseUtcBoundary(url.searchParams.get('to'))
    if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
      writeJson(res, 422, { ok: false, error: 'invalid_billing_range' })
      return true
    }
    if ((fromMs === undefined) !== (toMs === undefined)) {
      writeJson(res, 422, { ok: false, error: 'invalid_billing_range' })
      return true
    }
    if (fromMs !== undefined && toMs !== undefined && fromMs >= toMs) {
      writeJson(res, 422, { ok: false, error: 'invalid_billing_range' })
      return true
    }
    const billingAccountType = url.searchParams.get('billingAccountType')
    writeJson(res, 200, getAiPlayerProviderDeepSeekBillingReadModel({
      cnyPerUsd: parseUsageNumberParam(url, 'cnyPerUsd'),
      estimateSource: url.searchParams.get('estimateSource') === 'ledger' ? 'ledger' : undefined,
      ledgerFilter: {
        aiPlayerId: url.searchParams.get('aiPlayerId')?.trim() || undefined,
        factionId: url.searchParams.get('factionId')?.trim() || undefined,
        governorPlayerId: url.searchParams.get('governorPlayerId')?.trim() || undefined,
        billingAccountType: billingAccountType === 'faction_byok'
          || billingAccountType === 'player_byok'
          || billingAccountType === 'platform'
          ? billingAccountType
          : undefined,
        billingAccountId: url.searchParams.get('billingAccountId')?.trim() || undefined,
        provider: url.searchParams.get('provider')?.trim() || undefined,
        model: url.searchParams.get('model')?.trim() || undefined,
        keyFingerprint: url.searchParams.get('keyFingerprint')?.trim() || undefined,
      },
      today: readDeepSeekBillingObservation(url, 'today'),
      thisMonth: readDeepSeekBillingObservation(url, 'thisMonth'),
      range: fromMs !== undefined && toMs !== undefined
        ? {
          fromMs,
          toMs,
          observation: readDeepSeekBillingObservation(url, 'range'),
        }
        : undefined,
    }))
    return true
  }

  if (req.method === 'GET' && pathname === `${PREFIX}/ai-command-credits/balance`) {
    const result = getAiPlayerProviderAiCommandCreditBalance({
      accountId: url.searchParams.get('accountId')?.trim() || undefined,
      worldId: url.searchParams.get('worldId')?.trim() || undefined,
    })
    writeJson(res, result.ok ? 200 : 422, result)
    return true
  }

  if (req.method === 'POST' && pathname === `${PREFIX}/ai-command-credits/grants`) {
    const body = await readJsonBody(req)
    const result = grantAiPlayerProviderAiCommandCredits({
      accountId: readCreditBodyString(body, 'accountId'),
      worldId: readCreditBodyString(body, 'worldId'),
      amountCredits: readCreditBodyNumber(body, 'amountCredits'),
      reason: readCreditBodyString(body, 'reason'),
    })
    writeJson(res, result.ok ? 200 : 422, result)
    return true
  }

  if (req.method === 'POST' && pathname === `${PREFIX}/ai-command-credits/debits`) {
    const body = await readJsonBody(req)
    const result = debitAiPlayerProviderAiCommandCredits({
      accountId: readCreditBodyString(body, 'accountId'),
      worldId: readCreditBodyString(body, 'worldId'),
      amountCredits: readCreditBodyNumber(body, 'amountCredits'),
      requestId: readCreditBodyString(body, 'requestId'),
      aiPlayerId: readCreditBodyString(body, 'aiPlayerId'),
      factionId: readCreditBodyString(body, 'factionId'),
      reason: readCreditBodyString(body, 'reason'),
    })
    writeJson(res, 200, result)
    return true
  }

  if (req.method === 'GET' && (pathname === `${PREFIX}/token-balance` || pathname.startsWith(`${PREFIX}/token-balance/`))) {
    const suffix = pathname.slice(`${PREFIX}/token-balance/`.length)
    const governorPlayerIdFromPath = pathname === `${PREFIX}/token-balance`
      ? undefined
      : decodePathSegment(suffix)
    if (pathname !== `${PREFIX}/token-balance` && !governorPlayerIdFromPath) {
      writeJson(res, 422, { ok: false, error: 'invalid_governor_player_id' })
      return true
    }
    const billingAccountType = url.searchParams.get('billingAccountType')
    writeJson(res, 200, listAiPlayerProviderTokenBalance({
      limit: parseLimit(url),
      governorPlayerId: (governorPlayerIdFromPath ?? url.searchParams.get('governorPlayerId')?.trim()) || undefined,
      billingAccountType: billingAccountType === 'faction_byok'
        || billingAccountType === 'player_byok'
        || billingAccountType === 'platform'
        ? billingAccountType
        : undefined,
    }))
    return true
  }

  if (req.method === 'GET' && (pathname === `${PREFIX}/token-summary` || pathname.startsWith(`${PREFIX}/token-summary/`))) {
    const suffix = pathname.slice(`${PREFIX}/token-summary/`.length)
    const aiPlayerIdFromPath = pathname === `${PREFIX}/token-summary`
      ? undefined
      : decodePathSegment(suffix)
    if (pathname !== `${PREFIX}/token-summary` && !aiPlayerIdFromPath) {
      writeJson(res, 422, { ok: false, error: 'invalid_ai_player_id' })
      return true
    }
    const billingAccountType = url.searchParams.get('billingAccountType')
    writeJson(res, 200, listAiPlayerProviderTokenSummary({
      limit: parseLimit(url),
      aiPlayerId: (aiPlayerIdFromPath ?? url.searchParams.get('aiPlayerId')?.trim()) || undefined,
      factionId: url.searchParams.get('factionId')?.trim() || undefined,
      governorPlayerId: url.searchParams.get('governorPlayerId')?.trim() || undefined,
      provider: url.searchParams.get('provider')?.trim() || undefined,
      model: url.searchParams.get('model')?.trim() || undefined,
      keyFingerprint: url.searchParams.has('keyFingerprint')
        ? url.searchParams.get('keyFingerprint')?.trim() || null
        : undefined,
      billingAccountType: billingAccountType === 'faction_byok'
        || billingAccountType === 'player_byok'
        || billingAccountType === 'platform'
        ? billingAccountType
        : undefined,
    }))
    return true
  }

  const suffix = pathname.slice(`${PREFIX}/player-keys/`.length)
  if (!pathname.startsWith(`${PREFIX}/player-keys/`)) {
    return false
  }
  const [ownerSegment] = suffix.split('/')
  const ownerPlayerId = decodePathSegment(ownerSegment)
  if (!ownerPlayerId) {
    writeJson(res, 400, { ok: false, error: 'ownerPlayerId is required.' })
    return true
  }

  if (req.method === 'GET') {
    writeJson(res, 200, {
      ok: true,
      key: getAiPlayerProviderPlayerKey(ownerPlayerId),
    })
    return true
  }

  if (req.method === 'POST') {
    const parsed = upsertAiPlayerProviderPlayerKeyRequestSchema.safeParse(await readJsonBody(req))
    if (!parsed.success) {
      writeJson(res, 422, { ok: false, error: parsed.error.message })
      return true
    }
    const result = upsertAiPlayerProviderPlayerKey(ownerPlayerId, parsed.data)
    writeJson(res, result.ok ? 200 : 400, result)
    return true
  }

  if (req.method === 'DELETE') {
    const actorId = url.searchParams.get('actorId')?.trim() || undefined
    const result = revokeAiPlayerProviderPlayerKey(ownerPlayerId, actorId)
    writeJson(res, result.ok ? 200 : 404, result)
    return true
  }

  return false
}
