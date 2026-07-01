import type {
  AiPlayerProviderAiCommandCreditBalance,
  AiPlayerProviderAiCommandCreditLedgerEntry,
  AiPlayerProviderAiCommandCreditPolicy,
  AiPlayerProviderAiCommandCreditSummaryResponse,
  AiPlayerProviderBillingAccountType,
  AiPlayerProviderBillingLedgerEntry,
  AiPlayerProviderBillingUsage,
} from '../../../../shared/contracts/aiPlayerProviderAccount'

type AiCommandCreditReservationSnapshot = {
  accountId: string
  worldId: string
  amountCredits: number
}

export const AI_COMMAND_CREDIT_WORLD_ID_ENV = 'AI_PLAYER_AI_COMMAND_CREDIT_WORLD_ID'
const AI_COMMAND_CREDIT_TOKENS_PER_CREDIT = 1_000

export const AI_COMMAND_CREDIT_POLICY: AiPlayerProviderAiCommandCreditPolicy = {
  unitCode: 'ai_command_credit',
  displayName: 'AI军令',
  basis: 'provider_total_tokens',
  tokensPerCredit: AI_COMMAND_CREDIT_TOKENS_PER_CREDIT,
  minimumChargeCredits: 1,
  rounding: 'ceil_per_request',
}

function readUsageTotalTokens(usage: AiPlayerProviderBillingUsage): number {
  if (usage.totalTokens !== undefined) {
    return usage.totalTokens
  }
  return (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0)
}

export function estimateAiCommandCreditsForUsage(usage: AiPlayerProviderBillingUsage): number {
  const totalTokens = readUsageTotalTokens(usage)
  if (totalTokens <= 0) {
    return 0
  }
  return Math.max(
    AI_COMMAND_CREDIT_POLICY.minimumChargeCredits,
    Math.ceil(totalTokens / AI_COMMAND_CREDIT_POLICY.tokensPerCredit),
  )
}

export function resolveAiCommandCreditWorldId(
  factionId: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const configuredWorldId = env[AI_COMMAND_CREDIT_WORLD_ID_ENV]?.trim()
  return configuredWorldId ? configuredWorldId.slice(0, 120) : factionId
}

export function listAiPlayerProviderAiCommandCreditSummaryReadModel(
  entries: readonly AiPlayerProviderBillingLedgerEntry[],
  options: {
    aiPlayerId?: string
    factionId?: string
    governorPlayerId?: string
    billingAccountType?: AiPlayerProviderBillingAccountType
    billingAccountId?: string
    provider?: string
    model?: string
  } = {},
): AiPlayerProviderAiCommandCreditSummaryResponse {
  const filtered = entries.filter((entry) => {
    if (options.aiPlayerId && entry.aiPlayerId !== options.aiPlayerId) return false
    if (options.factionId && entry.factionId !== options.factionId) return false
    if (options.governorPlayerId && entry.governorPlayerId !== options.governorPlayerId) return false
    if (options.billingAccountType && entry.billingAccountType !== options.billingAccountType) return false
    if (options.billingAccountId && entry.billingAccountId !== options.billingAccountId) return false
    if (options.provider && entry.provider !== options.provider) return false
    if (options.model && entry.model !== options.model) return false
    return true
  })
  const byAiPlayer = new Map<string, {
    aiPlayerId: string
    factionId: string
    requestCount: number
    consumedTotalTokens: number
    consumedCredits: number
  }>()
  let consumedTotalTokens = 0
  let consumedCredits = 0
  for (const entry of filtered) {
    const totalTokens = readUsageTotalTokens(entry.usage)
    const credits = estimateAiCommandCreditsForUsage(entry.usage)
    consumedTotalTokens += totalTokens
    consumedCredits += credits
    const key = `${entry.aiPlayerId}\u0000${entry.factionId}`
    const item = byAiPlayer.get(key) ?? {
      aiPlayerId: entry.aiPlayerId,
      factionId: entry.factionId,
      requestCount: 0,
      consumedTotalTokens: 0,
      consumedCredits: 0,
    }
    item.requestCount += 1
    item.consumedTotalTokens += totalTokens
    item.consumedCredits += credits
    byAiPlayer.set(key, item)
  }
  return {
    ok: true,
    policy: structuredClone(AI_COMMAND_CREDIT_POLICY),
    requestCount: filtered.length,
    consumedTotalTokens,
    consumedCredits,
    byAiPlayer: Array.from(byAiPlayer.values())
      .sort((left, right) => {
        const creditDelta = right.consumedCredits - left.consumedCredits
        if (creditDelta !== 0) return creditDelta
        return left.aiPlayerId.localeCompare(right.aiPlayerId)
      }),
  }
}

export function buildAiCommandCreditBalanceReadModel(
  ledger: readonly AiPlayerProviderAiCommandCreditLedgerEntry[],
  reservations: Iterable<AiCommandCreditReservationSnapshot>,
  accountId: string,
  worldId: string,
): AiPlayerProviderAiCommandCreditBalance {
  let balanceCredits = 0
  let grantedCredits = 0
  let debitedCredits = 0
  let refundedCredits = 0
  let reservedCredits = 0
  let ledgerCount = 0
  for (const entry of ledger) {
    if (entry.accountId !== accountId || entry.worldId !== worldId) {
      continue
    }
    ledgerCount += 1
    balanceCredits += entry.amountCredits
    if (entry.entryType === 'grant') {
      grantedCredits += Math.max(0, entry.amountCredits)
    } else if (entry.entryType === 'debit') {
      debitedCredits += Math.max(0, -entry.amountCredits)
    } else if (entry.entryType === 'refund') {
      refundedCredits += Math.max(0, entry.amountCredits)
    }
  }
  for (const reservation of reservations) {
    if (reservation.accountId === accountId && reservation.worldId === worldId) {
      reservedCredits += reservation.amountCredits
    }
  }
  const normalizedBalanceCredits = Math.max(0, balanceCredits)
  return {
    accountId,
    worldId,
    balanceCredits: normalizedBalanceCredits,
    reservedCredits,
    availableCredits: Math.max(0, normalizedBalanceCredits - reservedCredits),
    grantedCredits,
    debitedCredits,
    refundedCredits,
    ledgerCount,
  }
}
