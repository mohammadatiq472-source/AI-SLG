import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto'
import { existsSync, readFileSync, renameSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type {
  AiPlayerModelBudgetTier,
  AiPlayerModelByokSource,
  AiPlayerModelRoutingSource,
} from '../../../../shared/contracts/aiPlayer'
import type {
  AiPlayerProviderAiCommandCreditEstimateResponse,
  AiPlayerProviderAccountPoolAccount,
  AiPlayerProviderAccountPoolCandidate,
  AiPlayerProviderAccountPoolOpsConfig,
  AiPlayerProviderAccountPoolOpsConfigMutationResponse,
  AiPlayerProviderAccountPoolOpsRestoreResponse,
  AiPlayerProviderAccountPoolReadModelResponse,
  AiPlayerProviderAiCommandCreditBalance,
  AiPlayerProviderAiCommandCreditBalanceResponse,
  AiPlayerProviderAiCommandCreditLedgerEntry,
  AiPlayerProviderAiCommandCreditLedgerMutationResponse,
  AiPlayerProviderAiCommandCreditSummaryResponse,
  AiPlayerProviderAuditEvent,
  AiPlayerProviderAuditEventType,
  AiPlayerProviderBillingAccountType,
  AiPlayerProviderBillingLedgerEntry,
  AiPlayerProviderBillingUsage,
  AiPlayerProviderBudgetLimitMode,
  AiPlayerProviderBudgetWindow,
  AiPlayerProviderCostReconciliationResponse,
  AiPlayerProviderDeepSeekBillingReadModelResponse,
  AiPlayerProviderPricingEstimateResponse,
  AiPlayerProviderRequestQueueEndpointStatus,
  AiPlayerProviderRequestQueueStatus,
  AiPlayerProviderTokenBalanceItem,
  AiPlayerProviderTokenBudgetStatus,
  AiPlayerProviderTokenSummaryItem,
  AiPlayerProviderTokenTotals,
  AiPlayerProviderPlayerKeyReadModel,
  AiPlayerProviderPlayerKeyStatus,
  ListAiPlayerProviderAccountPoolOpsAuditResponse,
  RestoreAiPlayerProviderAccountPoolOpsConfigRequest,
  UpsertAiPlayerProviderAccountPoolOpsConfigRequest,
  UpsertAiPlayerProviderPlayerKeyRequest,
} from '../../../../shared/contracts/aiPlayerProviderAccount'
import {
  findProviderAccountPoolOpsAuditItemForRestore,
  listProviderAccountPoolOpsAuditReadModel,
} from './aiPlayerProviderAccountOpsAudit'
import {
  AI_COMMAND_CREDIT_POLICY,
  buildAiCommandCreditBalanceReadModel,
  estimateAiCommandCreditsForUsage,
  listAiPlayerProviderAiCommandCreditSummaryReadModel,
  resolveAiCommandCreditWorldId,
} from './aiPlayerProviderAiCommandCredits'
import {
  applyProviderPricingToUsage,
  type BillingLedgerEstimateFilter,
  type DeepSeekBillingObservationInput,
  estimateAiPlayerProviderPricingUsageReadModel,
  getAiPlayerProviderDeepSeekBillingReadModelReadModel,
  listAiPlayerProviderPricingPoliciesReadModel,
  reconcileAiPlayerProviderCostObservationReadModel,
  roundCostObservation,
} from './aiPlayerProviderPricingReadModel'
import {
  getExternalBudgetGateHealth,
  notifyExternalBudgetGate,
  reserveExternalProviderBudgetGate,
  type ReserveProviderBudgetInput,
} from './aiPlayerProviderExternalBudgetGate'
import {
  createExternalLedgerAuditOutboxController,
  loadExternalLedgerAuditOutboxItems,
  toPersistedExternalLedgerAuditOutboxItems,
  type ExternalLedgerAuditOutboxItem,
} from './aiPlayerProviderExternalLedgerAuditOutbox'

type StoredPlayerKeyConfig = {
  ownerPlayerId: string
  model: string
  provider?: string
  baseUrl?: string
  apiKey?: string
  keyFingerprint: string | null
  status: AiPlayerProviderPlayerKeyStatus
  createdAt: string
  updatedAt: string
  revokedAt?: string
}

type PersistedPlayerKeyConfig = Omit<StoredPlayerKeyConfig, 'apiKey'> & {
  apiKey?: string
}

type PersistedProviderAccountStore = {
  version?: number
  savedAt?: string
  playerKeys?: unknown
  billingLedger?: unknown
  aiCommandCreditLedger?: unknown
  aiCommandCreditReservations?: unknown
  accountPoolOpsConfigs?: unknown
  auditEvents?: unknown
  budgetWindows?: unknown
  budgetReservations?: unknown
  externalLedgerAuditOutbox?: unknown
}

type ActivePlayerModelConfig = {
  ownerPlayerId: string
  model: string
  provider?: string
  baseUrl?: string
  apiKey: string
  keyFingerprint: string | null
}

type ProviderAccountingSelectedProvider = {
  model: string
  provider: string
  keyFingerprint?: string | null
  source: AiPlayerModelRoutingSource
  byokSource: AiPlayerModelByokSource
  priority: number
}

type ProviderAccountingFailure = {
  model: string
  source: AiPlayerModelRoutingSource
  byokSource: AiPlayerModelByokSource
  priority: number
  error: string
}

type RecordProviderAccountingInput = {
  ok: boolean
  requestId?: string
  aiPlayerId: string
  factionId: string
  governorPlayerId: string
  selectedProvider?: ProviderAccountingSelectedProvider | null
  providerFallbackFailures?: ProviderAccountingFailure[]
  usage?: unknown
  usageType?: unknown
  usageBreakdown?: unknown
  error?: string
  queueRunId?: string
  idempotencyKey?: string
  budgetWindowKey?: string
  budgetReservationId?: string
  aiCommandCreditReservationId?: string
}

type ProviderAccountingUsageType = 'model' | 'tts' | 'asr'

type ProviderAccountingUsageBreakdownItem = {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  characters?: number
  audioSeconds?: number
  requestCount?: number
  estimatedCostUsd?: number
  estimatedCostSource?: 'mock' | 'provider_reported' | 'pricing_policy'
}

type ProviderAccountingUsageBreakdown = Partial<Record<ProviderAccountingUsageType, ProviderAccountingUsageBreakdownItem>>

type AiPlayerProviderBillingLedgerEntryWithUsageSplit = AiPlayerProviderBillingLedgerEntry & {
  usageType: ProviderAccountingUsageType
  usageBreakdown: ProviderAccountingUsageBreakdown
}

type ProviderBudgetAccountInput = {
  byokSource: AiPlayerModelByokSource
  factionId: string
  governorPlayerId: string
}

type ProviderBudgetReservation = {
  reservationId: string
  budgetWindowKey: string
  reservedAt: string
  expiresAt: string
  aiPlayerId?: string
  factionId: string
  governorPlayerId: string
  model: string
  provider: string
  source: AiPlayerModelRoutingSource
  byokSource: AiPlayerModelByokSource
  budgetTier: AiPlayerModelBudgetTier
  queueRunId?: string
  idempotencyKey?: string
}

type AiCommandCreditReservation = {
  reservationId: string
  accountId: string
  worldId: string
  amountCredits: number
  reservedAt: string
  expiresAt: string
  requestId?: string
  aiPlayerId?: string
  factionId?: string
  reason?: string
  queueRunId?: string
  idempotencyKey?: string
}

export type AiCommandCreditReservationResult =
  | {
    ok: true
    reservationId: string
    accountId: string
    worldId: string
    amountCredits: number
    balance: AiPlayerProviderAiCommandCreditBalance
  }
  | {
    ok: false
    error: 'invalid_ai_command_credit_request' | 'insufficient_ai_command_credits'
    balance?: AiPlayerProviderAiCommandCreditBalance
  }

type ProviderBudgetReservationOk = {
  ok: true
  reservationId: string
  budgetWindowKey: string
  budgetTier: AiPlayerModelBudgetTier
  limitMode: AiPlayerProviderBudgetLimitMode
  remainingRuns: number | null
  remainingTotalTokens: number | null
  window: AiPlayerProviderBudgetWindow
}

type ProviderBudgetReservationDenied = {
  ok: false
  error: 'provider_budget_disabled' | 'provider_budget_exhausted' | 'provider_budget_gate_unavailable'
  budgetWindowKey: string
  budgetTier: AiPlayerModelBudgetTier
  limitMode: AiPlayerProviderBudgetLimitMode
  remainingRuns: number | null
  remainingTotalTokens: number | null
  window: AiPlayerProviderBudgetWindow
}

export type ProviderBudgetReservationResult = ProviderBudgetReservationOk | ProviderBudgetReservationDenied

type ProviderBudgetLimits = {
  limitMode: AiPlayerProviderBudgetLimitMode
  maxRuns: number | null
  maxPromptTokens: number | null
  maxCompletionTokens: number | null
  maxTotalTokens: number | null
  maxEstimatedCostUsd: number | null
}

type TokenSummaryAccumulator = {
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
}

type TokenBalanceAiPlayerAccumulator = {
  aiPlayerId: string
  factionId: string
  requestCount: number
  consumedTotalTokens: number
  consumedEstimatedCostUsd: number
  lastRequestAt: string | null
}

type TokenBalanceAccumulator = Omit<AiPlayerProviderTokenBalanceItem, 'byAiPlayer'> & {
  byAiPlayer: Map<string, TokenBalanceAiPlayerAccumulator>
}

const STORE_PATH =
  process.env.AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH?.trim()
    || join(process.cwd(), 'tmp', 'ai_player_provider_accounts.json')
const STORE_PERSIST_VERSION = 1
const STORE_PERSIST_DEBOUNCE_MS = 1_500
const MAX_PLAYER_KEYS = 512
const MAX_BILLING_LEDGER_ENTRIES = 1_000
const MAX_AI_COMMAND_CREDIT_LEDGER_ENTRIES = 5_000
const MAX_AI_COMMAND_CREDIT_RESERVATIONS = 1_000
const MAX_AUDIT_EVENTS = 2_000
const MAX_BUDGET_WINDOWS = 1_000
const MAX_BUDGET_RESERVATIONS = 1_000
const MAX_ACCOUNT_POOL_OPS_CONFIGS = 1_024
const MS_PER_DAY = 86_400_000
const MAX_ID_LENGTH = 120
const MAX_MODEL_LENGTH = 160
const MAX_PROVIDER_LENGTH = 120
const PROVIDER_ACCOUNT_OPS_CONFIRMATION = 'provider_account_ops_confirmed'
const MAX_BASE_URL_LENGTH = 240
const MAX_SECRET_FIELD_LENGTH = 1024
const APIKEY_ENCRYPTED_PREFIX = 'enc:v1:'
const APIKEY_ENCRYPTION_IV_BYTES = 12
const APIKEY_ENCRYPTION_TAG_BYTES = 16
const APIKEY_ENCRYPTION_KEY_ENV = 'FACTION_APIKEY_ENCRYPTION_KEY'
const APIKEY_ALLOW_PLAINTEXT_ENV = 'FACTION_APIKEY_ALLOW_PLAINTEXT_PERSIST'
const BUDGET_WINDOW_MS_ENV = 'AI_PLAYER_PROVIDER_BUDGET_WINDOW_MS'
const BUDGET_RESERVATION_TTL_MS_ENV = 'AI_PLAYER_PROVIDER_BUDGET_RESERVATION_TTL_MS'
const BUDGET_MAX_RUNS_ENV = 'AI_PLAYER_PROVIDER_BUDGET_MAX_RUNS_PER_WINDOW'
const BUDGET_MAX_PROMPT_TOKENS_ENV = 'AI_PLAYER_PROVIDER_BUDGET_MAX_PROMPT_TOKENS_PER_WINDOW'
const BUDGET_MAX_COMPLETION_TOKENS_ENV = 'AI_PLAYER_PROVIDER_BUDGET_MAX_COMPLETION_TOKENS_PER_WINDOW'
const BUDGET_MAX_TOTAL_TOKENS_ENV = 'AI_PLAYER_PROVIDER_BUDGET_MAX_TOTAL_TOKENS_PER_WINDOW'
const BUDGET_MAX_COST_USD_ENV = 'AI_PLAYER_PROVIDER_BUDGET_MAX_COST_USD_PER_WINDOW'
const DEFAULT_BUDGET_WINDOW_MS = 86_400_000
const DEFAULT_BUDGET_RESERVATION_TTL_MS = 120_000
const MIN_BUDGET_WINDOW_MS = 60_000
const MAX_BUDGET_WINDOW_MS = 31 * 86_400_000

const playerKeys = new Map<string, StoredPlayerKeyConfig>()
const billingLedger: AiPlayerProviderBillingLedgerEntryWithUsageSplit[] = []
const aiCommandCreditLedger: AiPlayerProviderAiCommandCreditLedgerEntry[] = []
const aiCommandCreditReservations = new Map<string, AiCommandCreditReservation>()
const auditEvents: AiPlayerProviderAuditEvent[] = []
const providerBudgetWindows = new Map<string, AiPlayerProviderBudgetWindow>()
const providerBudgetReservations = new Map<string, ProviderBudgetReservation>()
const providerAccountPoolOpsConfigs = new Map<string, AiPlayerProviderAccountPoolOpsConfig>()
const externalLedgerAuditOutbox: ExternalLedgerAuditOutboxItem[] = []
const externalLedgerAuditOutboxController = createExternalLedgerAuditOutboxController({
  outbox: externalLedgerAuditOutbox,
  schedulePersist,
  sanitizeError: sanitizeProviderHealthError,
})

let loaded = false
let persistDirty = false
let persistTimer: ReturnType<typeof setTimeout> | null = null
let persistInFlight: Promise<void> | null = null
let encryptionKeyCache: Buffer | null | undefined
let warnedMissingEncryptionKeyPersist = false
let warnedMissingEncryptionKeyDecrypt = false
let warnedDecryptFailure = false
let warnedPlaintextApiKeyDropped = false
let persistSuccessCount = 0
let persistFailureCount = 0
let lastPersistAt: number | null = null
let lastPersistErrorAt: number | null = null
let corruptQuarantineCount = 0
let lastCorruptQuarantineAt: number | null = null

function nowIso() {
  return new Date().toISOString()
}

function clipString(input: unknown, maxLength: number): string | undefined {
  if (typeof input !== 'string') {
    return undefined
  }
  const normalized = input.trim()
  return normalized ? normalized.slice(0, maxLength) : undefined
}

function sanitizeOwnerPlayerId(input: unknown): string | null {
  return clipString(input, 80) ?? null
}

function sanitizeModel(input: unknown): string | null {
  return clipString(input, MAX_MODEL_LENGTH) ?? null
}

function sanitizeProvider(input: unknown): string | undefined {
  return clipString(input, MAX_PROVIDER_LENGTH)
}

function sanitizeBaseUrl(input: unknown): string | undefined {
  return clipString(input, MAX_BASE_URL_LENGTH)
}

function sanitizeOptionalId(input: unknown): string | undefined {
  return clipString(input, MAX_ID_LENGTH)
}

function sanitizeKeyFingerprint(input: unknown): string | null {
  const normalized = clipString(input, 80)
  return normalized && /^sha256:[a-f0-9]{16,64}$/i.test(normalized) ? normalized : null
}

function sanitizeAccountPoolMaxConcurrency(input: unknown): number | null {
  if (input === null || input === undefined) {
    return null
  }
  if (typeof input !== 'number' || !Number.isFinite(input) || input < 0) {
    return null
  }
  return Math.max(0, Math.min(256, Math.trunc(input)))
}

function authorizeProviderAccountOps(input: {
  actorId?: unknown
  fallbackActorId?: unknown
  authRole?: unknown
  authSource?: unknown
  reason?: unknown
  confirmation?: unknown
}): { ok: true; actorId: string; authRole: string; authSource: string; reason: string } | { ok: false; error: 'invalid_provider_account_pool_ops_authorization' } {
  const actorId = sanitizeOwnerPlayerId(input.actorId) ?? sanitizeOwnerPlayerId(input.fallbackActorId)
  const authRole = sanitizeOptionalId(input.authRole)
  const authSource = sanitizeOptionalId(input.authSource)
  const reason = sanitizeReason(input.reason)
  if (!actorId || !authRole || !authSource || !reason || input.confirmation !== PROVIDER_ACCOUNT_OPS_CONFIRMATION) {
    return {
      ok: false,
      error: 'invalid_provider_account_pool_ops_authorization',
    }
  }
  return {
    ok: true,
    actorId,
    authRole,
    authSource,
    reason,
  }
}

function sanitizeBudgetWindowKey(input: unknown): string | undefined {
  return clipString(input, 240)
}

function sanitizeReason(input: unknown): string | undefined {
  return clipString(input, 240)
}

function sanitizeProviderHealthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  return clipString(raw
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, 'sk-<redacted>')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer <redacted>')
    .replace(/:\/\/[^@\s/]+@/g, '://<redacted>@')
    .replace(/[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g, 'jwt-<redacted>'), 240)
    ?? 'external_provider_error'
}

function readIntegerEnv(name: string, options: { minimum?: number; maximum?: number } = {}): number | null {
  const raw = process.env[name]?.trim()
  if (!raw) {
    return null
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    return null
  }
  const minimum = options.minimum ?? 0
  const maximum = options.maximum ?? Number.MAX_SAFE_INTEGER
  return Math.max(minimum, Math.min(maximum, Math.trunc(parsed)))
}

function readNumberEnv(name: string, options: { minimum?: number; maximum?: number } = {}): number | null {
  const raw = process.env[name]?.trim()
  if (!raw) {
    return null
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    return null
  }
  const minimum = options.minimum ?? 0
  const maximum = options.maximum ?? Number.MAX_SAFE_INTEGER
  return Math.max(minimum, Math.min(maximum, parsed))
}

function readBudgetWindowMs() {
  return readIntegerEnv(BUDGET_WINDOW_MS_ENV, {
    minimum: MIN_BUDGET_WINDOW_MS,
    maximum: MAX_BUDGET_WINDOW_MS,
  }) ?? DEFAULT_BUDGET_WINDOW_MS
}

function readBudgetReservationTtlMs() {
  return readIntegerEnv(BUDGET_RESERVATION_TTL_MS_ENV, { minimum: 1_000, maximum: 3_600_000 })
    ?? DEFAULT_BUDGET_RESERVATION_TTL_MS
}

function hashApiKey(apiKey: string): string {
  return `sha256:${createHash('sha256').update(apiKey, 'utf8').digest('hex').slice(0, 24)}`
}

function allowPlaintextApiKeyPersist() {
  const raw = process.env[APIKEY_ALLOW_PLAINTEXT_ENV]?.trim().toLowerCase()
  if (!raw) {
    return false
  }
  return ['1', 'true', 'yes', 'on'].includes(raw)
}

function getApiKeyEncryptionKey(): Buffer | null {
  if (encryptionKeyCache !== undefined) {
    return encryptionKeyCache
  }
  const raw = process.env[APIKEY_ENCRYPTION_KEY_ENV]?.trim()
  if (!raw) {
    encryptionKeyCache = null
    return encryptionKeyCache
  }
  encryptionKeyCache = createHash('sha256').update(raw, 'utf8').digest()
  return encryptionKeyCache
}

function encryptApiKey(apiKey: string): string | undefined {
  const key = getApiKeyEncryptionKey()
  if (!key) {
    if (!warnedMissingEncryptionKeyPersist) {
      warnedMissingEncryptionKeyPersist = true
      console.warn(
        `[AiPlayerProviderAccountStore] ${APIKEY_ENCRYPTION_KEY_ENV} not set; player BYOK apiKey will not be persisted unless ${APIKEY_ALLOW_PLAINTEXT_ENV}=1`,
      )
    }
    return undefined
  }

  try {
    const iv = randomBytes(APIKEY_ENCRYPTION_IV_BYTES)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return `${APIKEY_ENCRYPTED_PREFIX}${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`
  } catch {
    return undefined
  }
}

function decryptApiKey(raw: string): string | undefined {
  if (!raw.startsWith(APIKEY_ENCRYPTED_PREFIX)) {
    if (allowPlaintextApiKeyPersist()) {
      return raw
    }
    if (!warnedPlaintextApiKeyDropped) {
      warnedPlaintextApiKeyDropped = true
      console.warn(
        `[AiPlayerProviderAccountStore] plaintext player BYOK apiKey found in persisted store; set ${APIKEY_ALLOW_PLAINTEXT_ENV}=1 only for one-time legacy migration`,
      )
    }
    return undefined
  }

  const key = getApiKeyEncryptionKey()
  if (!key) {
    if (!warnedMissingEncryptionKeyDecrypt) {
      warnedMissingEncryptionKeyDecrypt = true
      console.warn(
        `[AiPlayerProviderAccountStore] encrypted player BYOK apiKey found but ${APIKEY_ENCRYPTION_KEY_ENV} is missing; apiKey will be dropped`,
      )
    }
    return undefined
  }

  try {
    const encoded = raw.slice(APIKEY_ENCRYPTED_PREFIX.length)
    const [ivRaw, tagRaw, encryptedRaw] = encoded.split('.')
    if (!ivRaw || !tagRaw || !encryptedRaw) {
      return undefined
    }
    const iv = Buffer.from(ivRaw, 'base64')
    const tag = Buffer.from(tagRaw, 'base64')
    const encrypted = Buffer.from(encryptedRaw, 'base64')
    if (iv.length !== APIKEY_ENCRYPTION_IV_BYTES || tag.length !== APIKEY_ENCRYPTION_TAG_BYTES) {
      return undefined
    }
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  } catch {
    if (!warnedDecryptFailure) {
      warnedDecryptFailure = true
      console.warn('[AiPlayerProviderAccountStore] failed to decrypt persisted player BYOK apiKey; value dropped')
    }
    return undefined
  }
}

function quarantineCorruptStoreFile() {
  try {
    if (!existsSync(STORE_PATH)) {
      return
    }
    const quarantinedPath = `${STORE_PATH}.corrupt.${Date.now()}`
    renameSync(STORE_PATH, quarantinedPath)
    corruptQuarantineCount += 1
    lastCorruptQuarantineAt = Date.now()
    console.warn(`[AiPlayerProviderAccountStore] quarantined corrupt store file: ${quarantinedPath}`)
  } catch {
    // Keep the app usable in memory if quarantine itself fails.
  }
}

function sanitizePersistedPlayerKey(input: unknown): StoredPlayerKeyConfig | null {
  if (!input || typeof input !== 'object') {
    return null
  }
  const source = input as Partial<PersistedPlayerKeyConfig>
  const ownerPlayerId = sanitizeOwnerPlayerId(source.ownerPlayerId)
  const model = sanitizeModel(source.model)
  if (!ownerPlayerId || !model) {
    return null
  }
  const rawApiKey = clipString(source.apiKey, MAX_SECRET_FIELD_LENGTH)
  const apiKey = rawApiKey ? decryptApiKey(rawApiKey) : undefined
  const status = source.status === 'revoked' ? 'revoked' : 'active'
  return {
    ownerPlayerId,
    model,
    provider: sanitizeProvider(source.provider),
    baseUrl: sanitizeBaseUrl(source.baseUrl),
    apiKey: apiKey ? apiKey.slice(0, MAX_SECRET_FIELD_LENGTH) : undefined,
    keyFingerprint: clipString(source.keyFingerprint, 80) ?? (apiKey ? hashApiKey(apiKey) : null),
    status,
    createdAt: clipString(source.createdAt, 80) ?? nowIso(),
    updatedAt: clipString(source.updatedAt, 80) ?? nowIso(),
    revokedAt: clipString(source.revokedAt, 80),
  }
}

function sanitizePersistedAccountPoolOpsConfig(input: unknown): AiPlayerProviderAccountPoolOpsConfig | null {
  if (!input || typeof input !== 'object') {
    return null
  }
  const source = input as Partial<AiPlayerProviderAccountPoolOpsConfig>
  const provider = sanitizeProvider(source.provider)
  const model = sanitizeModel(source.model)
  if (!provider || !model) {
    return null
  }
  return {
    provider,
    model,
    keyFingerprint: source.keyFingerprint === null ? null : sanitizeKeyFingerprint(source.keyFingerprint),
    enabled: source.enabled !== false,
    maxConcurrency: sanitizeAccountPoolMaxConcurrency(source.maxConcurrency),
    opsNote: source.opsNote === null ? null : (clipString(source.opsNote, 240) ?? null),
    enterpriseQuota: source.enterpriseQuota === true,
    quotaLabel: source.quotaLabel === null ? null : (clipString(source.quotaLabel, 120) ?? null),
    updatedBy: source.updatedBy === null ? null : (sanitizeOwnerPlayerId(source.updatedBy) ?? null),
    updatedAt: clipString(source.updatedAt, 80) ?? nowIso(),
  }
}

function sanitizeBillingEntry(input: unknown): AiPlayerProviderBillingLedgerEntryWithUsageSplit | null {
  if (!input || typeof input !== 'object') {
    return null
  }
  const source = input as Partial<AiPlayerProviderBillingLedgerEntryWithUsageSplit>
  const ledgerEntryId = sanitizeOptionalId(source.ledgerEntryId)
  const requestId = sanitizeOptionalId(source.requestId)
  const aiPlayerId = sanitizeOwnerPlayerId(source.aiPlayerId)
  const factionId = clipString(source.factionId, 64)
  const governorPlayerId = sanitizeOwnerPlayerId(source.governorPlayerId)
  const model = sanitizeModel(source.model)
  const provider = sanitizeProvider(source.provider)
  if (!ledgerEntryId || !requestId || !aiPlayerId || !factionId || !governorPlayerId || !model || !provider) {
    return null
  }
  const usage = sanitizeUsage(source.usage)
  const usageType = sanitizeProviderAccountingUsageType(source.usageType)
  return {
    ledgerEntryId,
    requestId,
    aiPlayerId,
    factionId,
    governorPlayerId,
    billingAccountType: sanitizeBillingAccountType(source.billingAccountType),
    billingAccountId: sanitizeOptionalId(source.billingAccountId) ?? null,
    providerSource: sanitizeProviderSource(source.providerSource),
    byokSource: sanitizeByokSource(source.byokSource),
    model,
    provider,
    keyFingerprint: sanitizeKeyFingerprint(source.keyFingerprint),
    budgetTier: sanitizeBudgetTier(source.budgetTier),
    budgetWindowKey: sanitizeBudgetWindowKey(source.budgetWindowKey),
    budgetReservationId: sanitizeOptionalId(source.budgetReservationId),
    usage,
    usageType,
    usageBreakdown: sanitizeUsageBreakdown(source.usageBreakdown, usage, usageType),
    queueRunId: sanitizeOptionalId(source.queueRunId),
    idempotencyKey: sanitizeOptionalId(source.idempotencyKey),
    createdAt: clipString(source.createdAt, 80) ?? nowIso(),
  }
}

function sanitizeAiCommandCreditLedgerEntry(input: unknown): AiPlayerProviderAiCommandCreditLedgerEntry | null {
  if (!input || typeof input !== 'object') {
    return null
  }
  const source = input as Partial<AiPlayerProviderAiCommandCreditLedgerEntry>
  const entryId = sanitizeOptionalId(source.entryId)
  const accountId = sanitizeOptionalId(source.accountId)
  const worldId = sanitizeOptionalId(source.worldId)
  const createdAt = clipString(source.createdAt, 80)
  const amountCredits = Number(source.amountCredits)
  const balanceAfterCredits = Number(source.balanceAfterCredits)
  if (!entryId || !accountId || !worldId || !createdAt || !Number.isFinite(amountCredits) || !Number.isFinite(balanceAfterCredits)) {
    return null
  }
  const entryType = source.entryType === 'debit' || source.entryType === 'refund' ? source.entryType : 'grant'
  return {
    entryId,
    accountId,
    worldId,
    entryType,
    amountCredits: Math.trunc(amountCredits),
    balanceAfterCredits: Math.max(0, Math.trunc(balanceAfterCredits)),
    requestId: sanitizeOptionalId(source.requestId),
    aiPlayerId: sanitizeOwnerPlayerId(source.aiPlayerId) ?? undefined,
    factionId: clipString(source.factionId, 64),
    reason: sanitizeReason(source.reason),
    createdAt,
  }
}

function sanitizeAiCommandCreditReservation(input: unknown): AiCommandCreditReservation | null {
  if (!input || typeof input !== 'object') {
    return null
  }
  const source = input as Partial<AiCommandCreditReservation>
  const reservationId = sanitizeOptionalId(source.reservationId)
  const accountId = sanitizeOptionalId(source.accountId)
  const worldId = sanitizeOptionalId(source.worldId)
  const amountCredits = Number(source.amountCredits)
  const reservedAt = clipString(source.reservedAt, 80)
  const expiresAt = clipString(source.expiresAt, 80)
  if (
    !reservationId
    || !accountId
    || !worldId
    || !Number.isFinite(amountCredits)
    || amountCredits <= 0
    || !reservedAt
    || !expiresAt
  ) {
    return null
  }
  return {
    reservationId,
    accountId,
    worldId,
    amountCredits: Math.trunc(amountCredits),
    reservedAt,
    expiresAt,
    requestId: sanitizeOptionalId(source.requestId),
    aiPlayerId: sanitizeOwnerPlayerId(source.aiPlayerId) ?? undefined,
    factionId: clipString(source.factionId, 64),
    reason: sanitizeReason(source.reason),
    queueRunId: sanitizeOptionalId(source.queueRunId),
    idempotencyKey: sanitizeOptionalId(source.idempotencyKey),
  }
}

function sanitizeBudgetLimitMode(input: unknown): AiPlayerProviderBudgetLimitMode {
  switch (input) {
    case 'configured':
    case 'disabled':
      return input
    case 'unlimited':
    default:
      return 'unlimited'
  }
}

function sanitizeNullableInteger(input: unknown): number | null {
  if (input === null) {
    return null
  }
  const parsed = Number(input)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }
  return Math.trunc(parsed)
}

function sanitizeNullableNumber(input: unknown): number | null {
  if (input === null) {
    return null
  }
  const parsed = Number(input)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }
  return parsed
}

function sanitizeNonnegativeInteger(input: unknown): number {
  const parsed = Number(input)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }
  return Math.trunc(parsed)
}

function sanitizeNonnegativeNumber(input: unknown): number {
  const parsed = Number(input)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }
  return parsed
}

function sanitizeBudgetWindow(input: unknown): AiPlayerProviderBudgetWindow | null {
  if (!input || typeof input !== 'object') {
    return null
  }
  const source = input as Partial<AiPlayerProviderBudgetWindow>
  const budgetWindowKey = sanitizeBudgetWindowKey(source.budgetWindowKey)
  if (!budgetWindowKey) {
    return null
  }
  return {
    budgetWindowKey,
    billingAccountType: sanitizeBillingAccountType(source.billingAccountType),
    billingAccountId: sanitizeOptionalId(source.billingAccountId) ?? null,
    budgetTier: sanitizeBudgetTier(source.budgetTier),
    windowStartedAt: clipString(source.windowStartedAt, 80) ?? nowIso(),
    windowEndsAt: clipString(source.windowEndsAt, 80) ?? nowIso(),
    limitMode: sanitizeBudgetLimitMode(source.limitMode),
    maxRuns: sanitizeNullableInteger(source.maxRuns),
    maxPromptTokens: sanitizeNullableInteger(source.maxPromptTokens),
    maxCompletionTokens: sanitizeNullableInteger(source.maxCompletionTokens),
    maxTotalTokens: sanitizeNullableInteger(source.maxTotalTokens),
    maxEstimatedCostUsd: sanitizeNullableNumber(source.maxEstimatedCostUsd),
    reservedRuns: sanitizeNonnegativeInteger(source.reservedRuns),
    consumedRuns: sanitizeNonnegativeInteger(source.consumedRuns),
    deniedRuns: sanitizeNonnegativeInteger(source.deniedRuns),
    consumedPromptTokens: sanitizeNonnegativeNumber(source.consumedPromptTokens),
    consumedCompletionTokens: sanitizeNonnegativeNumber(source.consumedCompletionTokens),
    consumedTotalTokens: sanitizeNonnegativeNumber(source.consumedTotalTokens),
    consumedEstimatedCostUsd: sanitizeNonnegativeNumber(source.consumedEstimatedCostUsd),
    updatedAt: clipString(source.updatedAt, 80) ?? nowIso(),
  }
}

function sanitizeBudgetReservation(input: unknown): ProviderBudgetReservation | null {
  if (!input || typeof input !== 'object') {
    return null
  }
  const source = input as Partial<ProviderBudgetReservation>
  const reservationId = sanitizeOptionalId(source.reservationId)
  const budgetWindowKey = sanitizeBudgetWindowKey(source.budgetWindowKey)
  const factionId = clipString(source.factionId, 64)
  const governorPlayerId = sanitizeOwnerPlayerId(source.governorPlayerId)
  const model = sanitizeModel(source.model)
  const provider = sanitizeProvider(source.provider)
  const reservedAt = clipString(source.reservedAt, 80)
  const expiresAt = clipString(source.expiresAt, 80)
  if (!reservationId || !budgetWindowKey || !factionId || !governorPlayerId || !model || !provider || !reservedAt || !expiresAt) {
    return null
  }
  return {
    reservationId,
    budgetWindowKey,
    reservedAt,
    expiresAt,
    aiPlayerId: sanitizeOwnerPlayerId(source.aiPlayerId) ?? undefined,
    factionId,
    governorPlayerId,
    model,
    provider,
    source: sanitizeProviderSource(source.source),
    byokSource: sanitizeByokSource(source.byokSource),
    budgetTier: sanitizeBudgetTier(source.budgetTier),
    queueRunId: sanitizeOptionalId(source.queueRunId),
    idempotencyKey: sanitizeOptionalId(source.idempotencyKey),
  }
}

function sanitizeAuditEvent(input: unknown): AiPlayerProviderAuditEvent | null {
  if (!input || typeof input !== 'object') {
    return null
  }
  const source = input as Partial<AiPlayerProviderAuditEvent>
  const eventId = sanitizeOptionalId(source.eventId)
  const eventType = sanitizeAuditEventType(source.eventType)
  if (!eventId || !eventType) {
    return null
  }
  return {
    eventId,
    eventType,
    requestId: sanitizeOptionalId(source.requestId),
    aiPlayerId: sanitizeOwnerPlayerId(source.aiPlayerId) ?? undefined,
    factionId: clipString(source.factionId, 64),
    governorPlayerId: sanitizeOwnerPlayerId(source.governorPlayerId) ?? undefined,
    ownerPlayerId: sanitizeOwnerPlayerId(source.ownerPlayerId) ?? undefined,
    actorId: sanitizeOwnerPlayerId(source.actorId) ?? undefined,
    providerSource: source.providerSource ? sanitizeProviderSource(source.providerSource) : undefined,
    byokSource: source.byokSource ? sanitizeByokSource(source.byokSource) : undefined,
    model: sanitizeModel(source.model) ?? undefined,
    provider: sanitizeProvider(source.provider),
    keyFingerprint: source.keyFingerprint === null ? null : (clipString(source.keyFingerprint, 80) ?? undefined),
    reason: sanitizeReason(source.reason),
    queueRunId: sanitizeOptionalId(source.queueRunId),
    idempotencyKey: sanitizeOptionalId(source.idempotencyKey),
    metadata: sanitizeAuditMetadata(source.metadata),
    createdAt: clipString(source.createdAt, 80) ?? nowIso(),
  }
}

function ensureLoaded() {
  if (loaded) {
    return
  }
  loaded = true
  playerKeys.clear()
  billingLedger.splice(0, billingLedger.length)
  aiCommandCreditLedger.splice(0, aiCommandCreditLedger.length)
  aiCommandCreditReservations.clear()
  auditEvents.splice(0, auditEvents.length)
  providerBudgetWindows.clear()
  providerBudgetReservations.clear()
  providerAccountPoolOpsConfigs.clear()
  externalLedgerAuditOutbox.splice(0, externalLedgerAuditOutbox.length)

  try {
    if (!existsSync(STORE_PATH)) {
      return
    }
    const parsed = JSON.parse(readFileSync(STORE_PATH, 'utf8')) as PersistedProviderAccountStore
    const persistedPlayerKeys = Array.isArray(parsed.playerKeys) ? parsed.playerKeys : []
    for (const item of persistedPlayerKeys) {
      const next = sanitizePersistedPlayerKey(item)
      if (!next) {
        continue
      }
      playerKeys.set(next.ownerPlayerId, next)
      if (playerKeys.size >= MAX_PLAYER_KEYS) {
        break
      }
    }
    const persistedLedger = Array.isArray(parsed.billingLedger) ? parsed.billingLedger : []
    for (const item of persistedLedger) {
      const next = sanitizeBillingEntry(item)
      if (next) {
        billingLedger.push(next)
      }
      if (billingLedger.length >= MAX_BILLING_LEDGER_ENTRIES) {
        break
      }
    }
    const persistedAiCommandCreditLedger = Array.isArray(parsed.aiCommandCreditLedger) ? parsed.aiCommandCreditLedger : []
    for (const item of persistedAiCommandCreditLedger) {
      const next = sanitizeAiCommandCreditLedgerEntry(item)
      if (next) {
        aiCommandCreditLedger.push(next)
      }
      if (aiCommandCreditLedger.length >= MAX_AI_COMMAND_CREDIT_LEDGER_ENTRIES) {
        break
      }
    }
    const persistedAiCommandCreditReservations = Array.isArray(parsed.aiCommandCreditReservations) ? parsed.aiCommandCreditReservations : []
    for (const item of persistedAiCommandCreditReservations) {
      const next = sanitizeAiCommandCreditReservation(item)
      if (next) {
        aiCommandCreditReservations.set(next.reservationId, next)
      }
      if (aiCommandCreditReservations.size >= MAX_AI_COMMAND_CREDIT_RESERVATIONS) {
        break
      }
    }
    const persistedAccountPoolOpsConfigs = Array.isArray(parsed.accountPoolOpsConfigs) ? parsed.accountPoolOpsConfigs : []
    for (const item of persistedAccountPoolOpsConfigs) {
      const next = sanitizePersistedAccountPoolOpsConfig(item)
      if (next) {
        providerAccountPoolOpsConfigs.set(buildProviderAccountPoolKey(next.provider, next.model, next.keyFingerprint), next)
      }
      if (providerAccountPoolOpsConfigs.size >= MAX_ACCOUNT_POOL_OPS_CONFIGS) {
        break
      }
    }
    const persistedAuditEvents = Array.isArray(parsed.auditEvents) ? parsed.auditEvents : []
    for (const item of persistedAuditEvents) {
      const next = sanitizeAuditEvent(item)
      if (next) {
        auditEvents.push(next)
      }
      if (auditEvents.length >= MAX_AUDIT_EVENTS) {
        break
      }
    }
    const persistedBudgetWindows = Array.isArray(parsed.budgetWindows) ? parsed.budgetWindows : []
    for (const item of persistedBudgetWindows) {
      const next = sanitizeBudgetWindow(item)
      if (next) {
        providerBudgetWindows.set(next.budgetWindowKey, next)
      }
      if (providerBudgetWindows.size >= MAX_BUDGET_WINDOWS) {
        break
      }
    }
    const persistedBudgetReservations = Array.isArray(parsed.budgetReservations) ? parsed.budgetReservations : []
    for (const item of persistedBudgetReservations) {
      const next = sanitizeBudgetReservation(item)
      if (next) {
        providerBudgetReservations.set(next.reservationId, next)
      }
      if (providerBudgetReservations.size >= MAX_BUDGET_RESERVATIONS) {
        break
      }
    }
    loadExternalLedgerAuditOutboxItems(parsed.externalLedgerAuditOutbox, {
      outbox: externalLedgerAuditOutbox,
      sanitizeOptionalId,
      sanitizeBillingEntry,
      sanitizeAuditEvent,
      clipString,
      sanitizeNonnegativeInteger,
      sanitizeReason,
      nowIso,
    })
    expireAiCommandCreditReservations()
    expireProviderBudgetReservations()
  } catch {
    playerKeys.clear()
    billingLedger.splice(0, billingLedger.length)
    aiCommandCreditLedger.splice(0, aiCommandCreditLedger.length)
    aiCommandCreditReservations.clear()
    auditEvents.splice(0, auditEvents.length)
    providerBudgetWindows.clear()
    providerBudgetReservations.clear()
    providerAccountPoolOpsConfigs.clear()
    externalLedgerAuditOutbox.splice(0, externalLedgerAuditOutbox.length)
    quarantineCorruptStoreFile()
  }
}

function toPersistedPlayerKey(input: StoredPlayerKeyConfig): PersistedPlayerKeyConfig {
  let persistedApiKey: string | undefined
  if (input.apiKey && input.status === 'active') {
    persistedApiKey = encryptApiKey(input.apiKey)
    if (!persistedApiKey && allowPlaintextApiKeyPersist()) {
      persistedApiKey = input.apiKey.slice(0, MAX_SECRET_FIELD_LENGTH)
    }
  }
  return {
    ownerPlayerId: input.ownerPlayerId,
    model: input.model,
    provider: input.provider,
    baseUrl: input.baseUrl,
    apiKey: persistedApiKey,
    keyFingerprint: input.keyFingerprint,
    status: input.status,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    revokedAt: input.revokedAt,
  }
}

function buildPersistedPayload(): PersistedProviderAccountStore {
  return {
    version: STORE_PERSIST_VERSION,
    savedAt: nowIso(),
    playerKeys: Array.from(playerKeys.values(), (item) => toPersistedPlayerKey(item)),
    billingLedger: billingLedger.slice(-MAX_BILLING_LEDGER_ENTRIES),
    aiCommandCreditLedger: aiCommandCreditLedger.slice(-MAX_AI_COMMAND_CREDIT_LEDGER_ENTRIES),
    aiCommandCreditReservations: Array.from(aiCommandCreditReservations.values()).slice(-MAX_AI_COMMAND_CREDIT_RESERVATIONS),
    accountPoolOpsConfigs: Array.from(providerAccountPoolOpsConfigs.values()).slice(-MAX_ACCOUNT_POOL_OPS_CONFIGS),
    auditEvents: auditEvents.slice(-MAX_AUDIT_EVENTS),
    budgetWindows: Array.from(providerBudgetWindows.values()).slice(-MAX_BUDGET_WINDOWS),
    budgetReservations: Array.from(providerBudgetReservations.values()).slice(-MAX_BUDGET_RESERVATIONS),
    externalLedgerAuditOutbox: toPersistedExternalLedgerAuditOutboxItems(externalLedgerAuditOutbox),
  }
}

function schedulePersist() {
  persistDirty = true
  if (persistTimer) {
    return
  }
  persistTimer = setTimeout(() => {
    persistTimer = null
    void drainPersistQueue()
  }, STORE_PERSIST_DEBOUNCE_MS)
}

async function drainPersistQueue(): Promise<void> {
  if (persistInFlight) {
    await persistInFlight
    return
  }
  if (!persistDirty) {
    return
  }
  persistInFlight = (async () => {
    try {
      while (persistDirty) {
        persistDirty = false
        const payload = JSON.stringify(buildPersistedPayload(), null, 2)
        const tmpPath = `${STORE_PATH}.tmp`
        await mkdir(dirname(STORE_PATH), { recursive: true })
        await writeFile(tmpPath, payload, 'utf8')
        await rename(tmpPath, STORE_PATH)
        persistSuccessCount += 1
        lastPersistAt = Date.now()
      }
    } catch {
      persistDirty = true
      persistFailureCount += 1
      lastPersistErrorAt = Date.now()
    } finally {
      persistInFlight = null
      if (persistDirty) {
        schedulePersist()
      }
    }
  })()
  await persistInFlight
}

export async function flushAiPlayerProviderAccountStorePersist(): Promise<void> {
  ensureLoaded()
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  if (!persistDirty) {
    if (persistInFlight) {
      await persistInFlight
    }
    await externalLedgerAuditOutboxController.drain()
    return
  }
  await drainPersistQueue()
  externalLedgerAuditOutboxController.clearTimer()
  await externalLedgerAuditOutboxController.drain()
}

function sanitizeBillingAccountType(input: unknown): AiPlayerProviderBillingAccountType {
  return input === 'faction_byok' || input === 'player_byok' ? input : 'platform'
}

function sanitizeProviderSource(input: unknown): AiPlayerModelRoutingSource {
  switch (input) {
    case 'env':
    case 'faction_config':
    case 'player_config':
    case 'fallback':
      return input
    case 'default':
    default:
      return 'default'
  }
}

function sanitizeByokSource(input: unknown): AiPlayerModelByokSource {
  switch (input) {
    case 'faction_config':
    case 'player_config':
      return input
    case 'none':
    default:
      return 'none'
  }
}

function sanitizeBudgetTier(input: unknown): AiPlayerModelBudgetTier {
  switch (input) {
    case 'economy_chat':
    case 'disabled':
      return input
    case 'strict_action':
    default:
      return 'strict_action'
  }
}

function sanitizeAuditEventType(input: unknown): AiPlayerProviderAuditEventType | null {
  switch (input) {
    case 'byok_key_configured':
    case 'byok_key_revoked':
    case 'provider_request_succeeded':
    case 'provider_request_failed':
    case 'provider_fallback_failed':
      return input
    default:
      return null
  }
}

function sanitizeUsage(input: unknown): AiPlayerProviderBillingUsage {
  if (!input || typeof input !== 'object') {
    return {}
  }
  const source = input as Record<string, unknown>
  const promptTokens = readUsageNumber(source.prompt_tokens ?? source.promptTokens)
  const completionTokens = readUsageNumber(source.completion_tokens ?? source.completionTokens)
  const totalTokens = readUsageNumber(source.total_tokens ?? source.totalTokens)
  const promptCacheHitTokens = readUsageNumber(source.prompt_cache_hit_tokens ?? source.promptCacheHitTokens)
  const promptCacheMissTokens = readUsageNumber(source.prompt_cache_miss_tokens ?? source.promptCacheMissTokens)
  const estimatedCostUsd = readUsageNumber(source.estimated_cost_usd ?? source.estimatedCostUsd)
  return {
    ...(promptTokens !== undefined ? { promptTokens } : {}),
    ...(completionTokens !== undefined ? { completionTokens } : {}),
    ...(totalTokens !== undefined ? { totalTokens } : {}),
    ...(promptCacheHitTokens !== undefined ? { promptCacheHitTokens } : {}),
    ...(promptCacheMissTokens !== undefined ? { promptCacheMissTokens } : {}),
    ...(estimatedCostUsd !== undefined ? { estimatedCostUsd } : {}),
    ...(estimatedCostUsd !== undefined ? { estimatedCostSource: 'provider_reported' as const } : {}),
  }
}

function sanitizeProviderAccountingUsageType(input: unknown): ProviderAccountingUsageType {
  return input === 'tts' || input === 'asr' ? input : 'model'
}

function sanitizeUsageBreakdownItem(input: unknown): ProviderAccountingUsageBreakdownItem {
  if (!input || typeof input !== 'object') {
    return {}
  }
  const source = input as Record<string, unknown>
  const estimatedCostSource = source.estimatedCostSource === 'mock'
    || source.estimatedCostSource === 'provider_reported'
    || source.estimatedCostSource === 'pricing_policy'
    ? source.estimatedCostSource
    : undefined
  return {
    ...(readUsageNumber(source.promptTokens ?? source.prompt_tokens) !== undefined
      ? { promptTokens: readUsageNumber(source.promptTokens ?? source.prompt_tokens) }
      : {}),
    ...(readUsageNumber(source.completionTokens ?? source.completion_tokens) !== undefined
      ? { completionTokens: readUsageNumber(source.completionTokens ?? source.completion_tokens) }
      : {}),
    ...(readUsageNumber(source.totalTokens ?? source.total_tokens) !== undefined
      ? { totalTokens: readUsageNumber(source.totalTokens ?? source.total_tokens) }
      : {}),
    ...(readUsageNumber(source.characters) !== undefined ? { characters: readUsageNumber(source.characters) } : {}),
    ...(readUsageNumber(source.audioSeconds ?? source.audio_seconds) !== undefined
      ? { audioSeconds: readUsageNumber(source.audioSeconds ?? source.audio_seconds) }
      : {}),
    ...(readUsageNumber(source.requestCount ?? source.request_count) !== undefined
      ? { requestCount: readUsageNumber(source.requestCount ?? source.request_count) }
      : {}),
    ...(readUsageNumber(source.estimatedCostUsd ?? source.estimated_cost_usd) !== undefined
      ? { estimatedCostUsd: readUsageNumber(source.estimatedCostUsd ?? source.estimated_cost_usd) }
      : {}),
    ...(estimatedCostSource ? { estimatedCostSource } : {}),
  }
}

function usageToBreakdownItem(usage: AiPlayerProviderBillingUsage): ProviderAccountingUsageBreakdownItem {
  return {
    ...(usage.promptTokens !== undefined ? { promptTokens: usage.promptTokens } : {}),
    ...(usage.completionTokens !== undefined ? { completionTokens: usage.completionTokens } : {}),
    totalTokens: readUsageTotalTokens(usage),
    ...(usage.estimatedCostUsd !== undefined ? { estimatedCostUsd: usage.estimatedCostUsd } : {}),
    ...(usage.estimatedCostSource ? { estimatedCostSource: usage.estimatedCostSource } : {}),
  }
}

function sanitizeUsageBreakdown(
  input: unknown,
  usage: AiPlayerProviderBillingUsage,
  usageType: ProviderAccountingUsageType,
): ProviderAccountingUsageBreakdown {
  const output: ProviderAccountingUsageBreakdown = {}
  if (input && typeof input === 'object') {
    const source = input as Record<string, unknown>
    for (const key of ['model', 'tts', 'asr'] as const) {
      const item = sanitizeUsageBreakdownItem(source[key])
      if (Object.keys(item).length > 0) {
        output[key] = item
      }
    }
  }

  if (Object.keys(output).length === 0) {
    output[usageType] = usageToBreakdownItem(usage)
  }

  return output
}

function readUsageNumber(input: unknown): number | undefined {
  const parsed = Number(input)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined
  }
  return parsed
}

function zeroTokenTotals(): AiPlayerProviderTokenTotals {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
  }
}

function readUsageTotalTokens(usage: AiPlayerProviderBillingUsage): number {
  if (usage.totalTokens !== undefined) {
    return usage.totalTokens
  }
  return (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0)
}

function addUsageToTokenTotals(
  totals: AiPlayerProviderTokenTotals,
  usage: AiPlayerProviderBillingUsage,
) {
  totals.promptTokens += usage.promptTokens ?? 0
  totals.completionTokens += usage.completionTokens ?? 0
  totals.totalTokens += readUsageTotalTokens(usage)
  totals.estimatedCostUsd += usage.estimatedCostUsd ?? 0
}

function buildUtcRangeStarts(now = new Date()) {
  const todayStartedAtMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const monthStartedAtMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  return {
    todayStartedAtMs,
    tomorrowStartedAtMs: todayStartedAtMs + MS_PER_DAY,
    monthStartedAtMs,
    nextMonthStartedAtMs: Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  }
}

function remainingNumberBudget(max: number | null, consumed: number): number | null {
  return max === null ? null : Math.max(0, max - consumed)
}

function toTokenBudgetStatus(window: AiPlayerProviderBudgetWindow): AiPlayerProviderTokenBudgetStatus {
  return {
    budgetWindowKey: window.budgetWindowKey,
    budgetTier: window.budgetTier,
    limitMode: window.limitMode,
    windowStartedAt: window.windowStartedAt,
    windowEndsAt: window.windowEndsAt,
    maxRuns: window.maxRuns,
    consumedRuns: window.consumedRuns,
    remainingRuns: remainingBudget(window.maxRuns, window.consumedRuns, window.reservedRuns),
    maxTotalTokens: window.maxTotalTokens,
    consumedTotalTokens: window.consumedTotalTokens,
    remainingTotalTokens: remainingBudget(window.maxTotalTokens, window.consumedTotalTokens),
    maxEstimatedCostUsd: window.maxEstimatedCostUsd,
    consumedEstimatedCostUsd: window.consumedEstimatedCostUsd,
    remainingEstimatedCostUsd: remainingNumberBudget(window.maxEstimatedCostUsd, window.consumedEstimatedCostUsd),
  }
}

function findLatestBudgetStatusForSummary(input: {
  billingAccountType: AiPlayerProviderBillingAccountType
  billingAccountId: string | null
}): AiPlayerProviderTokenBudgetStatus | null {
  const latest = Array.from(providerBudgetWindows.values())
    .filter((window) => window.billingAccountType === input.billingAccountType
      && window.billingAccountId === input.billingAccountId)
    .sort((left, right) => right.windowStartedAt.localeCompare(left.windowStartedAt))[0]
  return latest ? toTokenBudgetStatus(latest) : null
}

function findLatestBudgetWindowForBalance(input: {
  billingAccountType: AiPlayerProviderBillingAccountType
  billingAccountId: string | null
  budgetTier: AiPlayerModelBudgetTier
}): AiPlayerProviderBudgetWindow | null {
  return Array.from(providerBudgetWindows.values())
    .filter((window) => window.billingAccountType === input.billingAccountType
      && window.billingAccountId === input.billingAccountId
      && window.budgetTier === input.budgetTier)
    .sort((left, right) => right.windowStartedAt.localeCompare(left.windowStartedAt))[0] ?? null
}

function buildTokenSummaryKey(entry: AiPlayerProviderBillingLedgerEntry): string {
  return [
    entry.aiPlayerId,
    entry.factionId,
    entry.governorPlayerId,
    entry.billingAccountType,
    entry.billingAccountId ?? 'platform',
    entry.model,
    entry.provider,
    entry.keyFingerprint ?? 'none',
  ].join('\n')
}

function buildTokenBalanceKey(entry: AiPlayerProviderBillingLedgerEntry): string {
  return [
    entry.governorPlayerId,
    entry.billingAccountType,
    entry.billingAccountId ?? 'platform',
    entry.budgetTier,
  ].join('\n')
}

function computeEstimatedDailyBurnTokens(totalConsumedTokens: number, windowStartedAt: string | null): number {
  if (totalConsumedTokens <= 0) {
    return 0
  }
  const startedAtMs = windowStartedAt ? Date.parse(windowStartedAt) : Number.NaN
  if (!Number.isFinite(startedAtMs)) {
    return totalConsumedTokens
  }
  const elapsedDays = Math.max(1, Math.ceil((Date.now() - startedAtMs) / 86_400_000))
  return Math.ceil(totalConsumedTokens / elapsedDays)
}

function computeDaysRemaining(remainingTokens: number | null, estimatedDailyBurnTokens: number): number | null {
  if (remainingTokens === null || estimatedDailyBurnTokens <= 0) {
    return null
  }
  return Math.floor(remainingTokens / estimatedDailyBurnTokens)
}

function createTokenSummaryAccumulator(entry: AiPlayerProviderBillingLedgerEntry): TokenSummaryAccumulator {
  return {
    aiPlayerId: entry.aiPlayerId,
    factionId: entry.factionId,
    governorPlayerId: entry.governorPlayerId,
    billingAccountType: entry.billingAccountType,
    billingAccountId: entry.billingAccountId,
    model: entry.model,
    provider: entry.provider,
    keyFingerprint: entry.keyFingerprint ?? null,
    requestCount: 0,
    firstRequestAt: entry.createdAt,
    lastRequestAt: entry.createdAt,
    today: zeroTokenTotals(),
    thisMonth: zeroTokenTotals(),
    total: zeroTokenTotals(),
  }
}

function createTokenBalanceAccumulator(entry: AiPlayerProviderBillingLedgerEntry): TokenBalanceAccumulator {
  const window = findLatestBudgetWindowForBalance({
    billingAccountType: entry.billingAccountType,
    billingAccountId: entry.billingAccountId,
    budgetTier: entry.budgetTier,
  })
  const totalPurchasedTokens = window?.maxTotalTokens ?? null
  const totalPurchasedEstimatedCostUsd = window?.maxEstimatedCostUsd ?? null
  const maxRuns = window?.maxRuns ?? null
  return {
    governorPlayerId: entry.governorPlayerId,
    billingAccountType: entry.billingAccountType,
    billingAccountId: entry.billingAccountId,
    budgetTier: entry.budgetTier,
    limitMode: window?.limitMode ?? 'unlimited',
    windowStartedAt: window?.windowStartedAt ?? null,
    windowEndsAt: window?.windowEndsAt ?? null,
    totalPurchasedTokens,
    totalConsumedTokens: 0,
    remainingTokens: totalPurchasedTokens,
    totalPurchasedEstimatedCostUsd,
    totalConsumedEstimatedCostUsd: 0,
    remainingEstimatedCostUsd: totalPurchasedEstimatedCostUsd,
    maxRuns,
    consumedRuns: 0,
    remainingRuns: maxRuns,
    estimatedDailyBurnTokens: 0,
    daysRemaining: null,
    byAiPlayer: new Map(),
  }
}

function sanitizeAuditMetadata(input: unknown): Record<string, string | number | boolean | null> | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return undefined
  }
  const result: Record<string, string | number | boolean | null> = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>).slice(0, 24)) {
    const safeKey = key.trim().slice(0, 80)
    if (!safeKey) {
      continue
    }
    if (typeof value === 'string') {
      result[safeKey] = value.trim().slice(0, 240)
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      result[safeKey] = value
    } else if (typeof value === 'boolean' || value === null) {
      result[safeKey] = value
    }
  }
  return Object.keys(result).length > 0 ? result : undefined
}

function deriveProviderLabel(baseUrl: string | undefined, fallback = 'relay') {
  if (!baseUrl) {
    return fallback
  }
  try {
    return new URL(baseUrl).host || fallback
  } catch {
    return fallback
  }
}

function toReadModel(input: StoredPlayerKeyConfig): AiPlayerProviderPlayerKeyReadModel {
  const secretConfigured = Boolean(input.apiKey && input.status === 'active')
  return {
    ownerPlayerId: input.ownerPlayerId,
    model: input.model,
    provider: input.provider ?? deriveProviderLabel(input.baseUrl, 'player_config'),
    baseUrl: input.baseUrl,
    status: input.status,
    secretConfigured,
    secretSource: secretConfigured ? 'player_config:byok' : null,
    byokSource: 'player_config',
    keyFingerprint: input.keyFingerprint,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    revokedAt: input.revokedAt,
  }
}

function appendAuditEvent(input: Omit<AiPlayerProviderAuditEvent, 'eventId' | 'createdAt'> & { createdAt?: string }) {
  ensureLoaded()
  const event: AiPlayerProviderAuditEvent = {
    eventId: `audit_${randomUUID()}`,
    eventType: input.eventType,
    requestId: sanitizeOptionalId(input.requestId),
    aiPlayerId: sanitizeOwnerPlayerId(input.aiPlayerId) ?? undefined,
    factionId: clipString(input.factionId, 64),
    governorPlayerId: sanitizeOwnerPlayerId(input.governorPlayerId) ?? undefined,
    ownerPlayerId: sanitizeOwnerPlayerId(input.ownerPlayerId) ?? undefined,
    actorId: sanitizeOwnerPlayerId(input.actorId) ?? undefined,
    providerSource: input.providerSource ? sanitizeProviderSource(input.providerSource) : undefined,
    byokSource: input.byokSource ? sanitizeByokSource(input.byokSource) : undefined,
    model: sanitizeModel(input.model) ?? undefined,
    provider: sanitizeProvider(input.provider),
    keyFingerprint: input.keyFingerprint === null ? null : (clipString(input.keyFingerprint, 80) ?? undefined),
    reason: sanitizeReason(input.reason),
    queueRunId: sanitizeOptionalId(input.queueRunId),
    idempotencyKey: sanitizeOptionalId(input.idempotencyKey),
    metadata: sanitizeAuditMetadata(input.metadata),
    createdAt: input.createdAt ?? nowIso(),
  }
  auditEvents.push(event)
  while (auditEvents.length > MAX_AUDIT_EVENTS) {
    auditEvents.shift()
  }
  externalLedgerAuditOutboxController.enqueue({ auditEvent: event })
  schedulePersist()
  return structuredClone(event)
}

function appendBillingEntry(input: Omit<AiPlayerProviderBillingLedgerEntryWithUsageSplit, 'ledgerEntryId' | 'createdAt'>) {
  ensureLoaded()
  const entry: AiPlayerProviderBillingLedgerEntryWithUsageSplit = {
    ...input,
    ledgerEntryId: `bill_${randomUUID()}`,
    createdAt: nowIso(),
  }
  billingLedger.push(entry)
  while (billingLedger.length > MAX_BILLING_LEDGER_ENTRIES) {
    billingLedger.shift()
  }
  externalLedgerAuditOutboxController.enqueue({ billingLedgerEntry: entry })
  schedulePersist()
  return structuredClone(entry)
}

function resolveBillingAccount(input: {
  byokSource: AiPlayerModelByokSource
  factionId: string
  governorPlayerId: string
}): { billingAccountType: AiPlayerProviderBillingAccountType; billingAccountId: string | null } {
  if (input.byokSource === 'player_config') {
    return {
      billingAccountType: 'player_byok',
      billingAccountId: input.governorPlayerId,
    }
  }
  if (input.byokSource === 'faction_config') {
    return {
      billingAccountType: 'faction_byok',
      billingAccountId: input.factionId,
    }
  }
  return {
    billingAccountType: 'platform',
    billingAccountId: null,
  }
}

function resolveProviderBudgetAccount(input: ProviderBudgetAccountInput) {
  return resolveBillingAccount(input)
}

function resolveBudgetTierForModel(model: string): AiPlayerModelBudgetTier {
  const normalized = model.trim().toLowerCase()
  return normalized === 'claude-sonnet-4-6'
    || normalized === 'deepseek-v4-flash'
    || normalized === 'deepseek-v4-pro'
    || normalized === 'deepseek-chat'
    || normalized === 'deepseek-reasoner'
    || normalized.includes('strict-json')
    ? 'strict_action'
    : 'economy_chat'
}

function resolveProviderBudgetLimits(budgetTier: AiPlayerModelBudgetTier): ProviderBudgetLimits {
  if (budgetTier === 'disabled') {
    return {
      limitMode: 'disabled',
      maxRuns: 0,
      maxPromptTokens: 0,
      maxCompletionTokens: 0,
      maxTotalTokens: 0,
      maxEstimatedCostUsd: 0,
    }
  }
  const maxRuns = readIntegerEnv(BUDGET_MAX_RUNS_ENV, { minimum: 0 })
  const maxPromptTokens = readIntegerEnv(BUDGET_MAX_PROMPT_TOKENS_ENV, { minimum: 0 })
  const maxCompletionTokens = readIntegerEnv(BUDGET_MAX_COMPLETION_TOKENS_ENV, { minimum: 0 })
  const maxTotalTokens = readIntegerEnv(BUDGET_MAX_TOTAL_TOKENS_ENV, { minimum: 0 })
  const maxEstimatedCostUsd = readNumberEnv(BUDGET_MAX_COST_USD_ENV, { minimum: 0 })
  const configured = maxRuns !== null
    || maxPromptTokens !== null
    || maxCompletionTokens !== null
    || maxTotalTokens !== null
    || maxEstimatedCostUsd !== null
  return {
    limitMode: configured ? 'configured' : 'unlimited',
    maxRuns,
    maxPromptTokens,
    maxCompletionTokens,
    maxTotalTokens,
    maxEstimatedCostUsd,
  }
}

function buildBudgetWindowKey(input: {
  billingAccountType: AiPlayerProviderBillingAccountType
  billingAccountId: string | null
  budgetTier: AiPlayerModelBudgetTier
  windowStartedAtMs: number
}) {
  const accountId = input.billingAccountId ?? 'platform'
  return [
    'provider_budget',
    input.billingAccountType,
    accountId,
    input.budgetTier,
    String(input.windowStartedAtMs),
  ].join(':')
}

function ensureProviderBudgetWindow(input: ReserveProviderBudgetInput): AiPlayerProviderBudgetWindow {
  ensureLoaded()
  const budgetTier = input.budgetTier ?? resolveBudgetTierForModel(input.model)
  const account = resolveProviderBudgetAccount({
    byokSource: input.byokSource,
    factionId: input.factionId,
    governorPlayerId: input.governorPlayerId,
  })
  const windowMs = readBudgetWindowMs()
  const now = Date.now()
  const windowStartedAtMs = Math.floor(now / windowMs) * windowMs
  const windowEndsAtMs = windowStartedAtMs + windowMs
  const budgetWindowKey = buildBudgetWindowKey({
    billingAccountType: account.billingAccountType,
    billingAccountId: account.billingAccountId,
    budgetTier,
    windowStartedAtMs,
  })
  const limits = resolveProviderBudgetLimits(budgetTier)
  const existing = providerBudgetWindows.get(budgetWindowKey)
  const timestamp = nowIso()
  if (existing) {
    const next = {
      ...existing,
      limitMode: limits.limitMode,
      maxRuns: limits.maxRuns,
      maxPromptTokens: limits.maxPromptTokens,
      maxCompletionTokens: limits.maxCompletionTokens,
      maxTotalTokens: limits.maxTotalTokens,
      maxEstimatedCostUsd: limits.maxEstimatedCostUsd,
      updatedAt: timestamp,
    }
    providerBudgetWindows.set(budgetWindowKey, next)
    return next
  }

  const window: AiPlayerProviderBudgetWindow = {
    budgetWindowKey,
    billingAccountType: account.billingAccountType,
    billingAccountId: account.billingAccountId,
    budgetTier,
    windowStartedAt: new Date(windowStartedAtMs).toISOString(),
    windowEndsAt: new Date(windowEndsAtMs).toISOString(),
    limitMode: limits.limitMode,
    maxRuns: limits.maxRuns,
    maxPromptTokens: limits.maxPromptTokens,
    maxCompletionTokens: limits.maxCompletionTokens,
    maxTotalTokens: limits.maxTotalTokens,
    maxEstimatedCostUsd: limits.maxEstimatedCostUsd,
    reservedRuns: 0,
    consumedRuns: 0,
    deniedRuns: 0,
    consumedPromptTokens: 0,
    consumedCompletionTokens: 0,
    consumedTotalTokens: 0,
    consumedEstimatedCostUsd: 0,
    updatedAt: timestamp,
  }
  providerBudgetWindows.set(budgetWindowKey, window)
  while (providerBudgetWindows.size > MAX_BUDGET_WINDOWS) {
    const oldestKey = providerBudgetWindows.keys().next().value as string | undefined
    if (!oldestKey) {
      break
    }
    providerBudgetWindows.delete(oldestKey)
  }
  return window
}

function remainingBudget(max: number | null, consumed: number, reserved = 0): number | null {
  return max === null ? null : Math.max(0, max - consumed - reserved)
}

function isProviderBudgetExhausted(window: AiPlayerProviderBudgetWindow) {
  if (window.limitMode === 'disabled') {
    return true
  }
  return (
    (window.maxRuns !== null && window.consumedRuns + window.reservedRuns >= window.maxRuns)
    || (window.maxPromptTokens !== null && window.consumedPromptTokens >= window.maxPromptTokens)
    || (window.maxCompletionTokens !== null && window.consumedCompletionTokens >= window.maxCompletionTokens)
    || (window.maxTotalTokens !== null && window.consumedTotalTokens >= window.maxTotalTokens)
    || (window.maxEstimatedCostUsd !== null && window.consumedEstimatedCostUsd >= window.maxEstimatedCostUsd)
  )
}

function toBudgetReservationOk(
  reservationId: string,
  window: AiPlayerProviderBudgetWindow,
): ProviderBudgetReservationOk {
  return {
    ok: true,
    reservationId,
    budgetWindowKey: window.budgetWindowKey,
    budgetTier: window.budgetTier,
    limitMode: window.limitMode,
    remainingRuns: remainingBudget(window.maxRuns, window.consumedRuns, window.reservedRuns),
    remainingTotalTokens: remainingBudget(window.maxTotalTokens, window.consumedTotalTokens),
    window: structuredClone(window),
  }
}

function toBudgetReservationDenied(
  error: ProviderBudgetReservationDenied['error'],
  window: AiPlayerProviderBudgetWindow,
): ProviderBudgetReservationDenied {
  return {
    ok: false,
    error,
    budgetWindowKey: window.budgetWindowKey,
    budgetTier: window.budgetTier,
    limitMode: window.limitMode,
    remainingRuns: remainingBudget(window.maxRuns, window.consumedRuns, window.reservedRuns),
    remainingTotalTokens: remainingBudget(window.maxTotalTokens, window.consumedTotalTokens),
    window: structuredClone(window),
  }
}

function buildBudgetReservation(input: {
  reservationId: string
  window: AiPlayerProviderBudgetWindow
  budgetTier: AiPlayerModelBudgetTier
  request: ReserveProviderBudgetInput
  expiresAt?: string
}): ProviderBudgetReservation {
  const timestamp = nowIso()
  return {
    reservationId: input.reservationId,
    budgetWindowKey: input.window.budgetWindowKey,
    reservedAt: timestamp,
    expiresAt: input.expiresAt ?? new Date(Date.now() + readBudgetReservationTtlMs()).toISOString(),
    aiPlayerId: sanitizeOwnerPlayerId(input.request.aiPlayerId) ?? undefined,
    factionId: clipString(input.request.factionId, 64) ?? input.request.factionId,
    governorPlayerId: sanitizeOwnerPlayerId(input.request.governorPlayerId) ?? input.request.governorPlayerId,
    model: sanitizeModel(input.request.model) ?? input.request.model,
    provider: sanitizeProvider(input.request.provider) ?? input.request.provider,
    source: sanitizeProviderSource(input.request.source),
    byokSource: sanitizeByokSource(input.request.byokSource),
    budgetTier: input.budgetTier,
    queueRunId: sanitizeOptionalId(input.request.queueRunId),
    idempotencyKey: sanitizeOptionalId(input.request.idempotencyKey),
  }
}

async function reserveExternalProviderBudgetThroughGate(
  input: ReserveProviderBudgetInput,
  window: AiPlayerProviderBudgetWindow,
): Promise<ProviderBudgetReservationResult | null> {
  let externalGateResult: Awaited<ReturnType<typeof reserveExternalProviderBudgetGate>>
  try {
    externalGateResult = await reserveExternalProviderBudgetGate(input, window)
  } catch {
    window.deniedRuns += 1
    window.updatedAt = nowIso()
    schedulePersist()
    return toBudgetReservationDenied('provider_budget_gate_unavailable', window)
  }
  if (!externalGateResult) {
    return null
  }
  const { desiredReservationId, expiresAt, response } = externalGateResult
  if (!response) {
    return null
  }
  const responseWindow = sanitizeBudgetWindow(response.window)
  if (responseWindow) {
    providerBudgetWindows.set(responseWindow.budgetWindowKey, responseWindow)
    window = responseWindow
  }
  if (response.ok !== true) {
    const error = response.error === 'provider_budget_disabled'
      ? 'provider_budget_disabled'
      : 'provider_budget_exhausted'
    window.deniedRuns += 1
    window.updatedAt = nowIso()
    schedulePersist()
    return toBudgetReservationDenied(error, window)
  }
  const reservationId = sanitizeOptionalId(response.reservationId) ?? desiredReservationId
  const budgetWindowKey = sanitizeBudgetWindowKey(response.budgetWindowKey) ?? window.budgetWindowKey
  if (!responseWindow) {
    window.reservedRuns += 1
    window.updatedAt = nowIso()
  }
  const reservation = buildBudgetReservation({
    reservationId,
    window: {
      ...window,
      budgetWindowKey,
    },
    budgetTier: sanitizeBudgetTier(response.budgetTier ?? window.budgetTier),
    request: input,
    expiresAt,
  })
  providerBudgetReservations.set(reservationId, reservation)
  schedulePersist()
  return toBudgetReservationOk(reservationId, window)
}

function expireProviderBudgetReservations(nowMs = Date.now()) {
  let expiredCount = 0
  for (const reservation of Array.from(providerBudgetReservations.values())) {
    const expiresAtMs = Date.parse(reservation.expiresAt)
    if (!Number.isFinite(expiresAtMs) || expiresAtMs > nowMs) {
      continue
    }
    providerBudgetReservations.delete(reservation.reservationId)
    const window = providerBudgetWindows.get(reservation.budgetWindowKey)
    if (window) {
      window.reservedRuns = Math.max(0, window.reservedRuns - 1)
      window.updatedAt = nowIso()
    }
    expiredCount += 1
  }
  if (expiredCount > 0) {
    schedulePersist()
  }
}

function expireAiCommandCreditReservations(nowMs = Date.now()) {
  let expiredCount = 0
  for (const reservation of Array.from(aiCommandCreditReservations.values())) {
    const expiresAtMs = Date.parse(reservation.expiresAt)
    if (!Number.isFinite(expiresAtMs) || expiresAtMs > nowMs) {
      continue
    }
    aiCommandCreditReservations.delete(reservation.reservationId)
    expiredCount += 1
  }
  if (expiredCount > 0) {
    schedulePersist()
  }
}

export function getAiPlayerProviderAccountStoreHealth() {
  ensureLoaded()
  const keyConfigured = Boolean(getApiKeyEncryptionKey())
  const allowPlaintext = allowPlaintextApiKeyPersist()
  const secretPersistMode = keyConfigured ? 'encrypted' : (allowPlaintext ? 'plaintext' : 'memory_only')
  return {
    path: STORE_PATH,
    loaded,
    playerKeyCount: playerKeys.size,
    billingLedgerCount: billingLedger.length,
    auditEventCount: auditEvents.length,
    budgetWindowCount: providerBudgetWindows.size,
    budgetReservationCount: providerBudgetReservations.size,
    persistDirty,
    persistInFlight: Boolean(persistInFlight),
    persistSuccessCount,
    persistFailureCount,
    lastPersistAt,
    lastPersistErrorAt,
    corruptQuarantineCount,
    lastCorruptQuarantineAt,
    security: {
      secretPersistMode,
      encryptionKeyConfigured: keyConfigured,
      allowPlaintextPersist: allowPlaintext,
    },
    externalLedgerAuditDb: externalLedgerAuditOutboxController.getHealth(),
    externalBudgetGate: getExternalBudgetGateHealth(),
  }
}

export function getAiPlayerProviderPlayerKey(ownerPlayerId: string): AiPlayerProviderPlayerKeyReadModel | null {
  ensureLoaded()
  const normalizedOwner = sanitizeOwnerPlayerId(ownerPlayerId)
  if (!normalizedOwner) {
    return null
  }
  const key = playerKeys.get(normalizedOwner)
  return key ? toReadModel(key) : null
}

export function getActiveAiPlayerProviderPlayerKeyModelConfig(
  ownerPlayerId: string | undefined,
): ActivePlayerModelConfig | null {
  ensureLoaded()
  const normalizedOwner = sanitizeOwnerPlayerId(ownerPlayerId)
  if (!normalizedOwner) {
    return null
  }
  const key = playerKeys.get(normalizedOwner)
  if (!key || key.status !== 'active' || !key.apiKey) {
    return null
  }
  return {
    ownerPlayerId: key.ownerPlayerId,
    model: key.model,
    provider: key.provider,
    baseUrl: key.baseUrl,
    apiKey: key.apiKey,
    keyFingerprint: key.keyFingerprint,
  }
}

export function upsertAiPlayerProviderPlayerKey(
  ownerPlayerId: string,
  input: UpsertAiPlayerProviderPlayerKeyRequest,
): { ok: true; key: AiPlayerProviderPlayerKeyReadModel } | { ok: false; error: string } {
  ensureLoaded()
  const normalizedOwner = sanitizeOwnerPlayerId(ownerPlayerId)
  const model = sanitizeModel(input.model)
  if (!normalizedOwner) {
    return { ok: false, error: 'ownerPlayerId is required' }
  }
  if (!model) {
    return { ok: false, error: 'model is required' }
  }
  const existing = playerKeys.get(normalizedOwner)
  const apiKey = clipString(input.apiKey, MAX_SECRET_FIELD_LENGTH)
  const status = input.status === 'revoked' ? 'revoked' : 'active'
  if (status === 'active' && !apiKey && !existing?.apiKey) {
    return { ok: false, error: 'apiKey is required for active player-level BYOK config' }
  }
  const timestamp = nowIso()
  const next: StoredPlayerKeyConfig = {
    ownerPlayerId: normalizedOwner,
    model,
    provider: sanitizeProvider(input.provider),
    baseUrl: sanitizeBaseUrl(input.baseUrl),
    apiKey: status === 'active' ? (apiKey ?? existing?.apiKey) : undefined,
    keyFingerprint: status === 'active'
      ? (apiKey ? hashApiKey(apiKey) : (existing?.keyFingerprint ?? null))
      : (existing?.keyFingerprint ?? (apiKey ? hashApiKey(apiKey) : null)),
    status,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    revokedAt: status === 'revoked' ? timestamp : undefined,
  }
  playerKeys.set(normalizedOwner, next)
  appendAuditEvent({
    eventType: status === 'active' ? 'byok_key_configured' : 'byok_key_revoked',
    ownerPlayerId: normalizedOwner,
    actorId: input.updatedBy ?? normalizedOwner,
    providerSource: 'player_config',
    byokSource: 'player_config',
    model: next.model,
    provider: next.provider ?? deriveProviderLabel(next.baseUrl, 'player_config'),
    keyFingerprint: next.keyFingerprint,
    metadata: {
      secretConfigured: Boolean(next.apiKey),
      status: next.status,
    },
  })
  schedulePersist()
  return { ok: true, key: toReadModel(next) }
}

export function revokeAiPlayerProviderPlayerKey(
  ownerPlayerId: string,
  actorId?: string,
): { ok: true; key: AiPlayerProviderPlayerKeyReadModel } | { ok: false; error: string } {
  ensureLoaded()
  const normalizedOwner = sanitizeOwnerPlayerId(ownerPlayerId)
  if (!normalizedOwner) {
    return { ok: false, error: 'ownerPlayerId is required' }
  }
  const existing = playerKeys.get(normalizedOwner)
  if (!existing) {
    return { ok: false, error: `player key not found: ${normalizedOwner}` }
  }
  const timestamp = nowIso()
  const next: StoredPlayerKeyConfig = {
    ...existing,
    apiKey: undefined,
    status: 'revoked',
    updatedAt: timestamp,
    revokedAt: timestamp,
  }
  playerKeys.set(normalizedOwner, next)
  appendAuditEvent({
    eventType: 'byok_key_revoked',
    ownerPlayerId: normalizedOwner,
    actorId: actorId ?? normalizedOwner,
    providerSource: 'player_config',
    byokSource: 'player_config',
    model: next.model,
    provider: next.provider ?? deriveProviderLabel(next.baseUrl, 'player_config'),
    keyFingerprint: next.keyFingerprint,
    metadata: {
      secretConfigured: false,
      status: next.status,
    },
  })
  schedulePersist()
  return { ok: true, key: toReadModel(next) }
}

export function listAiPlayerProviderBillingLedger(options: {
  limit?: number
  aiPlayerId?: string
  factionId?: string
  governorPlayerId?: string
  billingAccountType?: AiPlayerProviderBillingAccountType
} = {}) {
  ensureLoaded()
  const limit = Math.max(1, Math.min(500, Math.trunc(Number(options.limit ?? 50))))
  const filtered = billingLedger.filter((entry) => {
    if (options.aiPlayerId && entry.aiPlayerId !== options.aiPlayerId) return false
    if (options.factionId && entry.factionId !== options.factionId) return false
    if (options.governorPlayerId && entry.governorPlayerId !== options.governorPlayerId) return false
    if (options.billingAccountType && entry.billingAccountType !== options.billingAccountType) return false
    return true
  })
  const items = filtered.slice(-limit).reverse().map((item) => structuredClone(item))
  return {
    items,
    count: items.length,
  }
}

export function listAiPlayerProviderAuditEvents(options: {
  limit?: number
  aiPlayerId?: string
  factionId?: string
  governorPlayerId?: string
  ownerPlayerId?: string
  eventType?: AiPlayerProviderAuditEventType
} = {}) {
  ensureLoaded()
  const limit = Math.max(1, Math.min(500, Math.trunc(Number(options.limit ?? 50))))
  const filtered = auditEvents.filter((entry) => {
    if (options.aiPlayerId && entry.aiPlayerId !== options.aiPlayerId) return false
    if (options.factionId && entry.factionId !== options.factionId) return false
    if (options.governorPlayerId && entry.governorPlayerId !== options.governorPlayerId) return false
    if (options.ownerPlayerId && entry.ownerPlayerId !== options.ownerPlayerId) return false
    if (options.eventType && entry.eventType !== options.eventType) return false
    return true
  })
  const items = filtered.slice(-limit).reverse().map((item) => structuredClone(item))
  return {
    items,
    count: items.length,
  }
}

export function listAiPlayerProviderAccountPoolOpsAudit(options: {
  limit?: number
  provider?: string
  model?: string
  keyFingerprint?: string | null
  actorId?: string
  enabled?: boolean
} = {}): ListAiPlayerProviderAccountPoolOpsAuditResponse {
  ensureLoaded()
  const limit = Math.max(1, Math.min(500, Math.trunc(Number(options.limit ?? 50))))
  const provider = sanitizeProvider(options.provider)
  const model = sanitizeModel(options.model)
  const actorId = sanitizeOwnerPlayerId(options.actorId)
  const keyFingerprint = options.keyFingerprint === undefined
    ? undefined
    : (options.keyFingerprint === null ? null : sanitizeKeyFingerprint(options.keyFingerprint))
  const invalidKeyFingerprintFilter = options.keyFingerprint !== undefined
    && options.keyFingerprint !== null
    && !keyFingerprint
  return listProviderAccountPoolOpsAuditReadModel({
    events: auditEvents,
    limit,
    generatedAt: nowIso(),
    provider: provider ?? undefined,
    model: model ?? undefined,
    keyFingerprint,
    actorId: actorId ?? undefined,
    enabled: options.enabled,
    invalidKeyFingerprintFilter,
  })
}

export function restoreAiPlayerProviderAccountPoolOpsConfig(
  input: RestoreAiPlayerProviderAccountPoolOpsConfigRequest,
): AiPlayerProviderAccountPoolOpsRestoreResponse {
  ensureLoaded()
  const provider = sanitizeProvider(input.provider)
  const model = sanitizeModel(input.model)
  const keyFingerprint = input.keyFingerprint === null || input.keyFingerprint === undefined
    ? null
    : sanitizeKeyFingerprint(input.keyFingerprint)
  const restoreEventId = sanitizeOptionalId(input.restoreEventId)
  if (!provider || !model || (input.keyFingerprint !== null && input.keyFingerprint !== undefined && !keyFingerprint)) {
    return {
      ok: false,
      error: 'invalid_provider_account_pool_ops_restore',
    }
  }
  const authorization = authorizeProviderAccountOps({
    actorId: input.opsActorId,
    fallbackActorId: input.restoredBy,
    authRole: input.opsAuthRole,
    authSource: input.opsAuthSource,
    reason: input.opsReason,
    confirmation: input.confirmation,
  })
  if (!authorization.ok) {
    return authorization
  }

  const restoredFrom = findProviderAccountPoolOpsAuditItemForRestore(auditEvents, {
    provider,
    model,
    keyFingerprint,
    restoreEventId,
  })
  if (!restoredFrom || restoredFrom.enabled === null) {
    return {
      ok: false,
      error: 'provider_account_pool_ops_audit_not_found',
    }
  }

  const restored = upsertAiPlayerProviderAccountPoolOpsConfig({
    provider,
    model,
    keyFingerprint,
    enabled: restoredFrom.enabled,
    maxConcurrency: restoredFrom.maxConcurrency,
    opsActorId: authorization.actorId,
    opsAuthRole: authorization.authRole,
    opsAuthSource: authorization.authSource,
    opsReason: authorization.reason,
    restoreSourceEventId: restoredFrom.eventId,
    confirmation: PROVIDER_ACCOUNT_OPS_CONFIRMATION,
  })
  return {
    ok: restored.ok,
    config: restored.config,
    restoredFrom,
    error: restored.error,
  }
}

export function listAiPlayerProviderBudgetWindows(options: {
  limit?: number
  billingAccountType?: AiPlayerProviderBillingAccountType
  billingAccountId?: string
  budgetTier?: AiPlayerModelBudgetTier
} = {}) {
  ensureLoaded()
  const limit = Math.max(1, Math.min(500, Math.trunc(Number(options.limit ?? 50))))
  const filtered = Array.from(providerBudgetWindows.values()).filter((window) => {
    if (options.billingAccountType && window.billingAccountType !== options.billingAccountType) return false
    if (options.billingAccountId && window.billingAccountId !== options.billingAccountId) return false
    if (options.budgetTier && window.budgetTier !== options.budgetTier) return false
    return true
  })
  const items = filtered
    .sort((left, right) => left.windowStartedAt.localeCompare(right.windowStartedAt))
    .slice(-limit)
    .reverse()
    .map((item) => structuredClone(item))
  return {
    items,
    count: items.length,
  }
}

export function listAiPlayerProviderTokenSummary(options: {
  limit?: number
  aiPlayerId?: string
  factionId?: string
  governorPlayerId?: string
  billingAccountType?: AiPlayerProviderBillingAccountType
  provider?: string
  model?: string
  keyFingerprint?: string | null
} = {}) {
  ensureLoaded()
  const limit = Math.max(1, Math.min(500, Math.trunc(Number(options.limit ?? 50))))
  const provider = sanitizeProvider(options.provider)
  const model = sanitizeModel(options.model)
  const keyFingerprint = options.keyFingerprint === undefined
    ? undefined
    : (options.keyFingerprint === null ? null : sanitizeKeyFingerprint(options.keyFingerprint))
  const invalidKeyFingerprintFilter = options.keyFingerprint !== undefined
    && options.keyFingerprint !== null
    && !keyFingerprint
  const { todayStartedAtMs, monthStartedAtMs } = buildUtcRangeStarts()
  const summaries = new Map<string, TokenSummaryAccumulator>()

  if (invalidKeyFingerprintFilter) {
    return {
      items: [],
      count: 0,
    }
  }

  for (const entry of billingLedger) {
    if (options.aiPlayerId && entry.aiPlayerId !== options.aiPlayerId) continue
    if (options.factionId && entry.factionId !== options.factionId) continue
    if (options.governorPlayerId && entry.governorPlayerId !== options.governorPlayerId) continue
    if (options.billingAccountType && entry.billingAccountType !== options.billingAccountType) continue
    if (provider && entry.provider !== provider) continue
    if (model && entry.model !== model) continue
    if (keyFingerprint !== undefined && (entry.keyFingerprint ?? null) !== keyFingerprint) continue

    const key = buildTokenSummaryKey(entry)
    const summary = summaries.get(key) ?? createTokenSummaryAccumulator(entry)
    summary.requestCount += 1
    if (entry.createdAt < summary.firstRequestAt) {
      summary.firstRequestAt = entry.createdAt
    }
    if (entry.createdAt >= summary.lastRequestAt) {
      summary.lastRequestAt = entry.createdAt
      summary.billingAccountType = entry.billingAccountType
      summary.billingAccountId = entry.billingAccountId
      summary.model = entry.model
      summary.provider = entry.provider
    }

    addUsageToTokenTotals(summary.total, entry.usage)
    const createdAtMs = Date.parse(entry.createdAt)
    if (Number.isFinite(createdAtMs)) {
      if (createdAtMs >= monthStartedAtMs) {
        addUsageToTokenTotals(summary.thisMonth, entry.usage)
      }
      if (createdAtMs >= todayStartedAtMs) {
        addUsageToTokenTotals(summary.today, entry.usage)
      }
    }
    summaries.set(key, summary)
  }

  const items: AiPlayerProviderTokenSummaryItem[] = Array.from(summaries.values())
    .map((summary) => ({
      ...summary,
      budgetStatus: findLatestBudgetStatusForSummary({
        billingAccountType: summary.billingAccountType,
        billingAccountId: summary.billingAccountId,
      }),
    }))
    .sort((left, right) => {
      const tokenDelta = right.total.totalTokens - left.total.totalTokens
      return tokenDelta !== 0 ? tokenDelta : right.lastRequestAt.localeCompare(left.lastRequestAt)
    })
    .slice(0, limit)
    .map((item) => structuredClone(item))

  return {
    items,
    count: items.length,
  }
}

export function listAiPlayerProviderTokenBalance(options: {
  limit?: number
  governorPlayerId?: string
  billingAccountType?: AiPlayerProviderBillingAccountType
} = {}) {
  ensureLoaded()
  const limit = Math.max(1, Math.min(500, Math.trunc(Number(options.limit ?? 50))))
  const balances = new Map<string, TokenBalanceAccumulator>()

  for (const entry of billingLedger) {
    if (options.governorPlayerId && entry.governorPlayerId !== options.governorPlayerId) continue
    if (options.billingAccountType && entry.billingAccountType !== options.billingAccountType) continue

    const key = buildTokenBalanceKey(entry)
    const balance = balances.get(key) ?? createTokenBalanceAccumulator(entry)
    const totalTokens = readUsageTotalTokens(entry.usage)
    const estimatedCostUsd = entry.usage.estimatedCostUsd ?? 0
    balance.totalConsumedTokens += totalTokens
    balance.totalConsumedEstimatedCostUsd += estimatedCostUsd
    balance.consumedRuns += 1

    const aiPlayer = balance.byAiPlayer.get(entry.aiPlayerId) ?? {
      aiPlayerId: entry.aiPlayerId,
      factionId: entry.factionId,
      requestCount: 0,
      consumedTotalTokens: 0,
      consumedEstimatedCostUsd: 0,
      lastRequestAt: null,
    }
    aiPlayer.requestCount += 1
    aiPlayer.consumedTotalTokens += totalTokens
    aiPlayer.consumedEstimatedCostUsd += estimatedCostUsd
    if (!aiPlayer.lastRequestAt || entry.createdAt >= aiPlayer.lastRequestAt) {
      aiPlayer.lastRequestAt = entry.createdAt
      aiPlayer.factionId = entry.factionId
    }
    balance.byAiPlayer.set(entry.aiPlayerId, aiPlayer)
    balances.set(key, balance)
  }

  const items: AiPlayerProviderTokenBalanceItem[] = Array.from(balances.values())
    .map((balance) => {
      const remainingTokens = remainingNumberBudget(balance.totalPurchasedTokens, balance.totalConsumedTokens)
      const remainingEstimatedCostUsd = remainingNumberBudget(
        balance.totalPurchasedEstimatedCostUsd,
        balance.totalConsumedEstimatedCostUsd,
      )
      const estimatedDailyBurnTokens = computeEstimatedDailyBurnTokens(
        balance.totalConsumedTokens,
        balance.windowStartedAt,
      )
      return {
        ...balance,
        remainingTokens,
        remainingEstimatedCostUsd,
        remainingRuns: remainingBudget(balance.maxRuns, balance.consumedRuns),
        estimatedDailyBurnTokens,
        daysRemaining: computeDaysRemaining(remainingTokens, estimatedDailyBurnTokens),
        byAiPlayer: Array.from(balance.byAiPlayer.values())
          .sort((left, right) => {
            const tokenDelta = right.consumedTotalTokens - left.consumedTotalTokens
            if (tokenDelta !== 0) {
              return tokenDelta
            }
            return (right.lastRequestAt ?? '').localeCompare(left.lastRequestAt ?? '')
          }),
      }
    })
    .sort((left, right) => {
      const tokenDelta = right.totalConsumedTokens - left.totalConsumedTokens
      if (tokenDelta !== 0) {
        return tokenDelta
      }
      return left.governorPlayerId.localeCompare(right.governorPlayerId)
    })
    .slice(0, limit)
    .map((item) => structuredClone(item))

  return {
    items,
    count: items.length,
  }
}

function buildProviderAccountPoolKey(provider: string, model: string, keyFingerprint: string | null) {
  return `${provider}\u0000${model}\u0000${keyFingerprint ?? 'none'}`
}

function buildProviderAccountPoolAccountId(candidate: AiPlayerProviderAccountPoolCandidate) {
  return [
    candidate.source,
    candidate.byokSource,
    candidate.provider,
    candidate.model,
    candidate.keyFingerprint ?? 'none',
  ].join(':')
}

function buildDefaultProviderAccountPoolOpsState(): AiPlayerProviderAccountPoolAccount['ops'] {
  return {
    enabled: true,
    maxConcurrency: null,
    opsNote: null,
    enterpriseQuota: false,
    quotaLabel: null,
    updatedBy: null,
    updatedAt: null,
  }
}

function toProviderAccountPoolOpsState(
  config: AiPlayerProviderAccountPoolOpsConfig | undefined,
): AiPlayerProviderAccountPoolAccount['ops'] {
  if (!config) {
    return buildDefaultProviderAccountPoolOpsState()
  }
  return {
    enabled: config.enabled,
    maxConcurrency: config.maxConcurrency,
    opsNote: config.opsNote,
    enterpriseQuota: config.enterpriseQuota,
    quotaLabel: config.quotaLabel,
    updatedBy: config.updatedBy,
    updatedAt: config.updatedAt,
  }
}

function getProviderAccountPoolOpsConfig(
  provider: string,
  model: string,
  keyFingerprint: string | null,
) {
  return providerAccountPoolOpsConfigs.get(buildProviderAccountPoolKey(provider, model, keyFingerprint))
}

function getProviderAccountPoolOpsState(
  provider: string,
  model: string,
  keyFingerprint: string | null,
) {
  return toProviderAccountPoolOpsState(getProviderAccountPoolOpsConfig(provider, model, keyFingerprint))
}

function createEmptyProviderAccountPoolEndpoint(candidate: AiPlayerProviderAccountPoolCandidate): AiPlayerProviderRequestQueueEndpointStatus {
  return {
    provider: candidate.provider,
    model: candidate.model,
    keyFingerprint: candidate.keyFingerprint,
    activeRequests: 0,
    queuedRequests: 0,
    totalStartedRequests: 0,
    totalCompletedRequests: 0,
    totalRejectedRequests: 0,
    totalFailedRequests: 0,
    totalRateLimitedRequests: 0,
    averageLatencyMs: 0,
    p50LatencyMs: 0,
    p95LatencyMs: 0,
    consecutiveFailures: 0,
    circuitState: 'closed',
    backoffUntil: null,
    rateBucket: {
      limit: null,
      windowMs: 60_000,
      usedRequests: 0,
      remainingRequests: null,
      resetAt: null,
    },
    lastStartedAt: null,
    lastCompletedAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
  }
}

function buildProviderAccountPoolBillingStats() {
  const billingByAccount = new Map<string, AiPlayerProviderAccountPoolAccount['billing']>()
  for (const entry of billingLedger) {
    const key = buildProviderAccountPoolKey(entry.provider, entry.model, entry.keyFingerprint ?? null)
    const item = billingByAccount.get(key) ?? {
      requestCount: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      lastRequestAt: null,
    }
    item.requestCount += 1
    item.totalTokens += readUsageTotalTokens(entry.usage)
    item.estimatedCostUsd += entry.usage.estimatedCostUsd ?? 0
    if (!item.lastRequestAt || entry.createdAt >= item.lastRequestAt) {
      item.lastRequestAt = entry.createdAt
    }
    billingByAccount.set(key, item)
  }
  for (const item of billingByAccount.values()) {
    item.estimatedCostUsd = roundCostObservation(item.estimatedCostUsd)
  }
  return billingByAccount
}

function classifyProviderAccountPoolHealth(
  candidate: AiPlayerProviderAccountPoolCandidate,
  endpoint: AiPlayerProviderRequestQueueEndpointStatus,
  ops: AiPlayerProviderAccountPoolAccount['ops'],
) {
  const rejectionReasons: string[] = []
  if (!candidate.secretConfigured) {
    rejectionReasons.push('missing_model_api_key')
  }
  if (!ops.enabled) {
    rejectionReasons.push('ops_disabled')
  }
  if (ops.maxConcurrency !== null && endpoint.activeRequests + endpoint.queuedRequests >= ops.maxConcurrency) {
    rejectionReasons.push('ops_concurrency_cap_reached')
  }
  if (endpoint.circuitState !== 'closed') {
    rejectionReasons.push('circuit_open')
  }
  if (endpoint.backoffUntil) {
    rejectionReasons.push('backoff_active')
  }
  if (endpoint.rateBucket.remainingRequests === 0) {
    rejectionReasons.push('rate_bucket_exhausted')
  }

  const dispatchEligible = rejectionReasons.length === 0
  const healthStatus: AiPlayerProviderAccountPoolAccount['healthStatus'] = !candidate.secretConfigured
    ? 'unconfigured'
    : !ops.enabled
      ? 'disabled'
    : endpoint.circuitState !== 'closed' || Boolean(endpoint.backoffUntil)
      ? 'backoff'
      : endpoint.consecutiveFailures > 0 || endpoint.totalFailedRequests > 0 || endpoint.totalRateLimitedRequests > 0
        ? 'degraded'
        : 'healthy'

  return {
    dispatchEligible,
    healthStatus,
    rejectionReasons,
  }
}

function sortProviderAccountPoolAccounts(
  left: AiPlayerProviderAccountPoolAccount,
  right: AiPlayerProviderAccountPoolAccount,
) {
  return Number(right.dispatchEligible) - Number(left.dispatchEligible)
    || left.priority - right.priority
    || Number(left.healthStatus !== 'healthy') - Number(right.healthStatus !== 'healthy')
    || (left.health.activeRequests + left.health.queuedRequests) - (right.health.activeRequests + right.health.queuedRequests)
    || left.health.totalRateLimitedRequests - right.health.totalRateLimitedRequests
    || left.health.consecutiveFailures - right.health.consecutiveFailures
    || left.health.p95LatencyMs - right.health.p95LatencyMs
    || left.accountId.localeCompare(right.accountId)
}

export function upsertAiPlayerProviderAccountPoolOpsConfig(
  input: UpsertAiPlayerProviderAccountPoolOpsConfigRequest,
): AiPlayerProviderAccountPoolOpsConfigMutationResponse {
  ensureLoaded()
  const provider = sanitizeProvider(input.provider)
  const model = sanitizeModel(input.model)
  const keyFingerprint = input.keyFingerprint === null || input.keyFingerprint === undefined
    ? null
    : sanitizeKeyFingerprint(input.keyFingerprint)
  if (!provider || !model || (input.keyFingerprint !== null && input.keyFingerprint !== undefined && !keyFingerprint)) {
    return {
      ok: false,
      error: 'invalid_provider_account_pool_ops_config',
    }
  }
  const authorization = authorizeProviderAccountOps({
    actorId: input.opsActorId,
    fallbackActorId: input.updatedBy,
    authRole: input.opsAuthRole,
    authSource: input.opsAuthSource,
    reason: input.opsReason,
    confirmation: input.confirmation,
  })
  if (!authorization.ok) {
    return authorization
  }

  const existing = getProviderAccountPoolOpsConfig(provider, model, keyFingerprint)
  const config: AiPlayerProviderAccountPoolOpsConfig = {
    provider,
    model,
    keyFingerprint,
    enabled: input.enabled ?? existing?.enabled ?? true,
    maxConcurrency: input.maxConcurrency === undefined
      ? (existing?.maxConcurrency ?? null)
      : sanitizeAccountPoolMaxConcurrency(input.maxConcurrency),
    opsNote: input.opsNote === undefined
      ? (existing?.opsNote ?? null)
      : (input.opsNote === null ? null : (clipString(input.opsNote, 240) ?? existing?.opsNote ?? null)),
    enterpriseQuota: input.enterpriseQuota ?? existing?.enterpriseQuota ?? false,
    quotaLabel: input.quotaLabel === undefined
      ? (existing?.quotaLabel ?? null)
      : (input.quotaLabel === null ? null : (clipString(input.quotaLabel, 120) ?? existing?.quotaLabel ?? null)),
    updatedBy: authorization.actorId,
    updatedAt: nowIso(),
  }

  providerAccountPoolOpsConfigs.set(buildProviderAccountPoolKey(provider, model, keyFingerprint), config)
  while (providerAccountPoolOpsConfigs.size > MAX_ACCOUNT_POOL_OPS_CONFIGS) {
    const oldestKey = providerAccountPoolOpsConfigs.keys().next().value as string | undefined
    if (!oldestKey) {
      break
    }
    providerAccountPoolOpsConfigs.delete(oldestKey)
  }
  appendAuditEvent({
    eventType: 'provider_account_pool_ops_configured',
    actorId: config.updatedBy ?? undefined,
    provider,
    model,
    keyFingerprint,
    reason: config.enabled ? 'provider_account_enabled' : 'provider_account_disabled',
    metadata: {
      maxConcurrency: config.maxConcurrency,
      enterpriseQuota: config.enterpriseQuota,
      quotaLabel: config.quotaLabel,
      opsReason: authorization.reason,
      authRole: authorization.authRole,
      authSource: authorization.authSource,
      restoreSourceEventId: sanitizeOptionalId(input.restoreSourceEventId) ?? null,
      opsConfirmation: true,
    },
  })
  schedulePersist()
  return {
    ok: true,
    config: structuredClone(config),
  }
}

export function getAiPlayerProviderAccountPoolDispatchGate(input: {
  provider: string
  model: string
  keyFingerprint: string | null
  activeRequests?: number
  queuedRequests?: number
}) {
  ensureLoaded()
  const ops = getProviderAccountPoolOpsState(input.provider, input.model, input.keyFingerprint)
  if (!ops.enabled) {
    return {
      allowed: false as const,
      reason: 'model_provider_account_disabled',
      ops,
    }
  }
  const accountConcurrency = (input.activeRequests ?? 0) + (input.queuedRequests ?? 0)
  if (ops.maxConcurrency !== null && accountConcurrency >= ops.maxConcurrency) {
    return {
      allowed: false as const,
      reason: 'model_provider_account_concurrency_cap_reached',
      ops,
    }
  }
  return {
    allowed: true as const,
    ops,
  }
}

export function getAiPlayerProviderAccountPoolReadModel(options: {
  candidates: AiPlayerProviderAccountPoolCandidate[]
  queue: AiPlayerProviderRequestQueueStatus
}): Omit<AiPlayerProviderAccountPoolReadModelResponse, 'opsMutationDeployment'> {
  ensureLoaded()
  const endpointByAccount = new Map(options.queue.endpoints.map((endpoint) => [
    buildProviderAccountPoolKey(endpoint.provider, endpoint.model, endpoint.keyFingerprint),
    endpoint,
  ]))
  const billingByAccount = buildProviderAccountPoolBillingStats()
  const accounts = options.candidates
    .map((candidate): AiPlayerProviderAccountPoolAccount => {
      const key = buildProviderAccountPoolKey(candidate.provider, candidate.model, candidate.keyFingerprint)
      const endpoint = endpointByAccount.get(key) ?? createEmptyProviderAccountPoolEndpoint(candidate)
      const ops = getProviderAccountPoolOpsState(candidate.provider, candidate.model, candidate.keyFingerprint)
      const classification = classifyProviderAccountPoolHealth(candidate, endpoint, ops)
      return {
        ...candidate,
        accountId: buildProviderAccountPoolAccountId(candidate),
        ...classification,
        ops: structuredClone(ops),
        health: {
          activeRequests: endpoint.activeRequests,
          queuedRequests: endpoint.queuedRequests,
          totalStartedRequests: endpoint.totalStartedRequests,
          totalCompletedRequests: endpoint.totalCompletedRequests,
          totalRejectedRequests: endpoint.totalRejectedRequests,
          totalFailedRequests: endpoint.totalFailedRequests,
          totalRateLimitedRequests: endpoint.totalRateLimitedRequests,
          averageLatencyMs: endpoint.averageLatencyMs,
          p50LatencyMs: endpoint.p50LatencyMs,
          p95LatencyMs: endpoint.p95LatencyMs,
          consecutiveFailures: endpoint.consecutiveFailures,
          circuitState: endpoint.circuitState,
          backoffUntil: endpoint.backoffUntil,
          lastStartedAt: endpoint.lastStartedAt,
          lastCompletedAt: endpoint.lastCompletedAt,
          lastSuccessAt: endpoint.lastSuccessAt,
          lastFailureAt: endpoint.lastFailureAt,
        },
        billing: structuredClone(billingByAccount.get(key) ?? {
          requestCount: 0,
          totalTokens: 0,
          estimatedCostUsd: 0,
          lastRequestAt: null,
        }),
      }
    })
    .sort(sortProviderAccountPoolAccounts)

  return {
    ok: true,
    generatedAt: nowIso(),
    accountCount: accounts.length,
    healthyCount: accounts.filter((account) => account.healthStatus === 'healthy').length,
    dispatchEligibleCount: accounts.filter((account) => account.dispatchEligible).length,
    selectedAccount: structuredClone(accounts.find((account) => account.dispatchEligible) ?? null),
    accounts: structuredClone(accounts),
  }
}

export function listAiPlayerProviderPricingPolicies(options: {
  provider?: string
  model?: string
} = {}) {
  ensureLoaded()
  return listAiPlayerProviderPricingPoliciesReadModel(options)
}

export function estimateAiPlayerProviderPricingUsage(options: {
  provider?: string
  model?: string
  usage?: unknown
}): AiPlayerProviderPricingEstimateResponse {
  ensureLoaded()
  const requestedProvider = clipString(options.provider, MAX_PROVIDER_LENGTH) ?? null
  const requestedModel = clipString(options.model, MAX_MODEL_LENGTH) ?? null
  return estimateAiPlayerProviderPricingUsageReadModel({
    provider: requestedProvider,
    model: requestedModel,
    usage: sanitizeUsage(options.usage),
  })
}

export function estimateAiPlayerProviderAiCommandCreditUsage(options: {
  usage?: unknown
} = {}): AiPlayerProviderAiCommandCreditEstimateResponse {
  ensureLoaded()
  const usage = sanitizeUsage(options.usage)
  return {
    ok: true,
    policy: structuredClone(AI_COMMAND_CREDIT_POLICY),
    usage,
    consumedCredits: estimateAiCommandCreditsForUsage(usage),
  }
}

export function listAiPlayerProviderAiCommandCreditSummary(options: {
  aiPlayerId?: string
  factionId?: string
  governorPlayerId?: string
  billingAccountType?: AiPlayerProviderBillingAccountType
  billingAccountId?: string
  provider?: string
  model?: string
} = {}): AiPlayerProviderAiCommandCreditSummaryResponse {
  ensureLoaded()
  return listAiPlayerProviderAiCommandCreditSummaryReadModel(billingLedger, options)
}

function buildAiCommandCreditBalance(accountId: string, worldId: string): AiPlayerProviderAiCommandCreditBalance {
  return buildAiCommandCreditBalanceReadModel(
    aiCommandCreditLedger,
    aiCommandCreditReservations.values(),
    accountId,
    worldId,
  )
}

export function getAiPlayerProviderAiCommandCreditBalance(options: {
  accountId?: string
  worldId?: string
}): AiPlayerProviderAiCommandCreditBalanceResponse | { ok: false; error: 'invalid_ai_command_credit_request' } {
  ensureLoaded()
  expireAiCommandCreditReservations()
  const accountId = sanitizeOptionalId(options.accountId)
  const worldId = sanitizeOptionalId(options.worldId)
  if (!accountId || !worldId) {
    return { ok: false, error: 'invalid_ai_command_credit_request' }
  }
  return {
    ok: true,
    ...buildAiCommandCreditBalance(accountId, worldId),
  }
}

function recordAiCommandCreditEntry(input: {
  accountId?: string
  worldId?: string
  entryType: 'grant' | 'debit' | 'refund'
  amountCredits?: number
  requestId?: string
  aiPlayerId?: string
  factionId?: string
  reason?: string
}): AiPlayerProviderAiCommandCreditLedgerMutationResponse {
  ensureLoaded()
  const accountId = sanitizeOptionalId(input.accountId)
  const worldId = sanitizeOptionalId(input.worldId)
  const rawAmount = Number(input.amountCredits)
  const amountCredits = Number.isFinite(rawAmount) ? Math.trunc(rawAmount) : 0
  if (!accountId || !worldId || amountCredits <= 0) {
    return { ok: false, error: 'invalid_ai_command_credit_request' }
  }
  expireAiCommandCreditReservations()
  const currentBalance = buildAiCommandCreditBalance(accountId, worldId)
  const signedAmount = input.entryType === 'debit' ? -amountCredits : amountCredits
  if (input.entryType === 'debit' && currentBalance.availableCredits < amountCredits) {
    return {
      ok: false,
      error: 'insufficient_ai_command_credits',
      balance: currentBalance,
    }
  }
  const entry: AiPlayerProviderAiCommandCreditLedgerEntry = {
    entryId: `ai_cmd_credit_${randomUUID()}`,
    accountId,
    worldId,
    entryType: input.entryType,
    amountCredits: signedAmount,
    balanceAfterCredits: currentBalance.balanceCredits + signedAmount,
    requestId: sanitizeOptionalId(input.requestId),
    aiPlayerId: sanitizeOwnerPlayerId(input.aiPlayerId) ?? undefined,
    factionId: clipString(input.factionId, 64),
    reason: sanitizeReason(input.reason),
    createdAt: nowIso(),
  }
  aiCommandCreditLedger.push(entry)
  while (aiCommandCreditLedger.length > MAX_AI_COMMAND_CREDIT_LEDGER_ENTRIES) {
    aiCommandCreditLedger.shift()
  }
  schedulePersist()
  return {
    ok: true,
    entry: structuredClone(entry),
    balance: buildAiCommandCreditBalance(accountId, worldId),
  }
}

export function grantAiPlayerProviderAiCommandCredits(input: {
  accountId?: string
  worldId?: string
  amountCredits?: number
  reason?: string
}): AiPlayerProviderAiCommandCreditLedgerMutationResponse {
  return recordAiCommandCreditEntry({
    ...input,
    entryType: 'grant',
  })
}

export function debitAiPlayerProviderAiCommandCredits(input: {
  accountId?: string
  worldId?: string
  amountCredits?: number
  requestId?: string
  aiPlayerId?: string
  factionId?: string
  reason?: string
}): AiPlayerProviderAiCommandCreditLedgerMutationResponse {
  return recordAiCommandCreditEntry({
    ...input,
    entryType: 'debit',
  })
}

export function reserveAiPlayerProviderAiCommandCredits(input: {
  accountId?: string
  worldId?: string
  amountCredits?: number
  usage?: unknown
  requestId?: string
  aiPlayerId?: string
  factionId?: string
  reason?: string
  queueRunId?: string
  idempotencyKey?: string
}): AiCommandCreditReservationResult {
  ensureLoaded()
  expireAiCommandCreditReservations()
  const accountId = sanitizeOptionalId(input.accountId)
  const worldId = sanitizeOptionalId(input.worldId)
    ?? (input.factionId ? resolveAiCommandCreditWorldId(input.factionId) : undefined)
  const usageCredits = input.usage === undefined
    ? 0
    : estimateAiCommandCreditsForUsage(sanitizeUsage(input.usage))
  const rawAmount = input.amountCredits === undefined ? usageCredits : Number(input.amountCredits)
  const amountCredits = Number.isFinite(rawAmount) ? Math.trunc(rawAmount) : 0
  if (!accountId || !worldId || amountCredits <= 0) {
    return { ok: false, error: 'invalid_ai_command_credit_request' }
  }
  const currentBalance = buildAiCommandCreditBalance(accountId, worldId)
  if (currentBalance.availableCredits < amountCredits) {
    return {
      ok: false,
      error: 'insufficient_ai_command_credits',
      balance: currentBalance,
    }
  }
  const reservationId = `ai_cmd_credit_res_${randomUUID()}`
  const reservation: AiCommandCreditReservation = {
    reservationId,
    accountId,
    worldId,
    amountCredits,
    reservedAt: nowIso(),
    expiresAt: new Date(Date.now() + readBudgetReservationTtlMs()).toISOString(),
    requestId: sanitizeOptionalId(input.requestId),
    aiPlayerId: sanitizeOwnerPlayerId(input.aiPlayerId) ?? undefined,
    factionId: clipString(input.factionId, 64),
    reason: sanitizeReason(input.reason),
    queueRunId: sanitizeOptionalId(input.queueRunId),
    idempotencyKey: sanitizeOptionalId(input.idempotencyKey),
  }
  aiCommandCreditReservations.set(reservationId, reservation)
  while (aiCommandCreditReservations.size > MAX_AI_COMMAND_CREDIT_RESERVATIONS) {
    const oldestKey = aiCommandCreditReservations.keys().next().value as string | undefined
    if (!oldestKey) {
      break
    }
    aiCommandCreditReservations.delete(oldestKey)
  }
  schedulePersist()
  return {
    ok: true,
    reservationId,
    accountId,
    worldId,
    amountCredits,
    balance: buildAiCommandCreditBalance(accountId, worldId),
  }
}

export function releaseAiPlayerProviderAiCommandCreditReservation(
  reservationId: string | undefined,
): AiPlayerProviderAiCommandCreditBalance | null {
  ensureLoaded()
  expireAiCommandCreditReservations()
  const normalizedReservationId = sanitizeOptionalId(reservationId)
  if (!normalizedReservationId) {
    return null
  }
  const reservation = aiCommandCreditReservations.get(normalizedReservationId)
  if (!reservation) {
    return null
  }
  aiCommandCreditReservations.delete(normalizedReservationId)
  schedulePersist()
  return buildAiCommandCreditBalance(reservation.accountId, reservation.worldId)
}

export function commitAiPlayerProviderAiCommandCreditReservation(
  reservationId: string | undefined,
  input: {
    usage?: unknown
    requestId?: string
    aiPlayerId?: string
    factionId?: string
    reason?: string
  } = {},
): AiPlayerProviderAiCommandCreditLedgerMutationResponse | null {
  ensureLoaded()
  expireAiCommandCreditReservations()
  const normalizedReservationId = sanitizeOptionalId(reservationId)
  if (!normalizedReservationId) {
    return null
  }
  const reservation = aiCommandCreditReservations.get(normalizedReservationId)
  if (!reservation) {
    return null
  }
  aiCommandCreditReservations.delete(normalizedReservationId)
  const usage = sanitizeUsage(input.usage)
  const amountCredits = estimateAiCommandCreditsForUsage(usage)
  if (amountCredits <= 0) {
    schedulePersist()
    return {
      ok: false,
      error: 'invalid_ai_command_credit_request',
      balance: buildAiCommandCreditBalance(reservation.accountId, reservation.worldId),
    }
  }
  const result = recordAiCommandCreditEntry({
    accountId: reservation.accountId,
    worldId: reservation.worldId,
    entryType: 'debit',
    amountCredits,
    requestId: input.requestId ?? reservation.requestId,
    aiPlayerId: input.aiPlayerId ?? reservation.aiPlayerId,
    factionId: input.factionId ?? reservation.factionId,
    reason: input.reason ?? reservation.reason ?? 'provider_request_succeeded',
  })
  schedulePersist()
  return result
}

export function reconcileAiPlayerProviderCostObservation(options: {
  requestCount: number
  actualCostCny?: number
  actualCostUsd?: number
  estimatedCostUsd?: number
  cnyPerUsd?: number
  estimateSource?: 'ledger'
  ledgerFilter?: BillingLedgerEstimateFilter
}): AiPlayerProviderCostReconciliationResponse {
  ensureLoaded()
  return reconcileAiPlayerProviderCostObservationReadModel(billingLedger, options)
}

export function getAiPlayerProviderDeepSeekBillingReadModel(options: {
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
} = {}): AiPlayerProviderDeepSeekBillingReadModelResponse {
  ensureLoaded()
  return getAiPlayerProviderDeepSeekBillingReadModelReadModel(billingLedger, options)
}

export async function reserveAiPlayerProviderBudget(input: ReserveProviderBudgetInput): Promise<ProviderBudgetReservationResult> {
  ensureLoaded()
  expireProviderBudgetReservations()
  const window = ensureProviderBudgetWindow(input)
  const externalResult = await reserveExternalProviderBudgetThroughGate(input, window)
  if (externalResult) {
    return externalResult
  }
  if (window.limitMode === 'disabled') {
    window.deniedRuns += 1
    window.updatedAt = nowIso()
    schedulePersist()
    return toBudgetReservationDenied('provider_budget_disabled', window)
  }
  if (isProviderBudgetExhausted(window)) {
    window.deniedRuns += 1
    window.updatedAt = nowIso()
    schedulePersist()
    return toBudgetReservationDenied('provider_budget_exhausted', window)
  }

  const reservationId = `budget_res_${randomUUID()}`
  window.reservedRuns += 1
  window.updatedAt = nowIso()
  providerBudgetReservations.set(reservationId, buildBudgetReservation({
    reservationId,
    window,
    budgetTier: window.budgetTier,
    request: input,
  }))
  schedulePersist()
  return toBudgetReservationOk(reservationId, window)
}

export async function releaseAiPlayerProviderBudgetReservation(reservationId: string): Promise<AiPlayerProviderBudgetWindow | null> {
  ensureLoaded()
  expireProviderBudgetReservations()
  const normalizedReservationId = sanitizeOptionalId(reservationId)
  if (!normalizedReservationId) {
    return null
  }
  const reservation = providerBudgetReservations.get(normalizedReservationId)
  if (!reservation) {
    return null
  }
  providerBudgetReservations.delete(normalizedReservationId)
  await notifyExternalBudgetGate('release', reservation)
  const window = providerBudgetWindows.get(reservation.budgetWindowKey)
  if (!window) {
    return null
  }
  window.reservedRuns = Math.max(0, window.reservedRuns - 1)
  window.updatedAt = nowIso()
  schedulePersist()
  return structuredClone(window)
}

export async function commitAiPlayerProviderBudgetReservation(
  reservationId: string | undefined,
  input: { usage?: unknown; ok?: boolean; error?: string } = {},
): Promise<AiPlayerProviderBudgetWindow | null> {
  ensureLoaded()
  expireProviderBudgetReservations()
  const normalizedReservationId = sanitizeOptionalId(reservationId)
  if (!normalizedReservationId) {
    return null
  }
  const reservation = providerBudgetReservations.get(normalizedReservationId)
  if (!reservation) {
    return null
  }
  providerBudgetReservations.delete(normalizedReservationId)
  const usage = applyProviderPricingToUsage(reservation.provider, reservation.model, sanitizeUsage(input.usage))
  await notifyExternalBudgetGate('commit', reservation, {
    ...input,
    usage,
  })
  const window = providerBudgetWindows.get(reservation.budgetWindowKey)
  if (!window) {
    return null
  }
  const promptTokens = usage.promptTokens ?? 0
  const completionTokens = usage.completionTokens ?? 0
  const totalTokens = usage.totalTokens ?? (promptTokens + completionTokens)
  window.reservedRuns = Math.max(0, window.reservedRuns - 1)
  window.consumedRuns += 1
  window.consumedPromptTokens += promptTokens
  window.consumedCompletionTokens += completionTokens
  window.consumedTotalTokens += totalTokens
  window.consumedEstimatedCostUsd += usage.estimatedCostUsd ?? 0
  window.updatedAt = nowIso()
  schedulePersist()
  if (input.ok === false && input.error) {
    appendAuditEvent({
      eventType: 'provider_request_failed',
      requestId: normalizedReservationId,
      aiPlayerId: reservation.aiPlayerId,
      factionId: reservation.factionId,
      governorPlayerId: reservation.governorPlayerId,
      providerSource: reservation.source,
      byokSource: reservation.byokSource,
      model: reservation.model,
      provider: reservation.provider,
      reason: input.error,
      queueRunId: reservation.queueRunId,
      idempotencyKey: reservation.idempotencyKey,
      metadata: {
        budgetWindowKey: reservation.budgetWindowKey,
      },
    })
  }
  return structuredClone(window)
}

export function recordAiPlayerProviderModelRequestAccounting(input: RecordProviderAccountingInput): string {
  ensureLoaded()
  const requestId = sanitizeOptionalId(input.requestId) ?? `provider_req_${randomUUID()}`
  const failures = input.providerFallbackFailures ?? []
  for (const failure of failures) {
    appendAuditEvent({
      eventType: input.ok ? 'provider_fallback_failed' : 'provider_request_failed',
      requestId,
      aiPlayerId: input.aiPlayerId,
      factionId: input.factionId,
      governorPlayerId: input.governorPlayerId,
      providerSource: failure.source,
      byokSource: failure.byokSource,
      model: failure.model,
      reason: failure.error,
      queueRunId: input.queueRunId,
      idempotencyKey: input.idempotencyKey,
      metadata: {
        priority: failure.priority,
      },
    })
  }

  if (!input.ok || !input.selectedProvider) {
    releaseAiPlayerProviderAiCommandCreditReservation(input.aiCommandCreditReservationId)
    if (failures.length === 0) {
      appendAuditEvent({
        eventType: 'provider_request_failed',
        requestId,
        aiPlayerId: input.aiPlayerId,
        factionId: input.factionId,
        governorPlayerId: input.governorPlayerId,
        reason: input.error ?? 'provider_request_failed',
        queueRunId: input.queueRunId,
        idempotencyKey: input.idempotencyKey,
      })
    }
    return requestId
  }

  const selected = input.selectedProvider
  const billingAccount = resolveBillingAccount({
    byokSource: selected.byokSource,
    factionId: input.factionId,
    governorPlayerId: input.governorPlayerId,
  })
  const usage = applyProviderPricingToUsage(selected.provider, selected.model, sanitizeUsage(input.usage))
  const usageType = sanitizeProviderAccountingUsageType(input.usageType)
  const usageBreakdown = sanitizeUsageBreakdown(input.usageBreakdown, usage, usageType)
  appendBillingEntry({
    requestId,
    aiPlayerId: input.aiPlayerId,
    factionId: input.factionId,
    governorPlayerId: input.governorPlayerId,
    billingAccountType: billingAccount.billingAccountType,
    billingAccountId: billingAccount.billingAccountId,
    providerSource: selected.source,
    byokSource: selected.byokSource,
    model: selected.model,
    provider: selected.provider,
    keyFingerprint: sanitizeKeyFingerprint(selected.keyFingerprint),
    budgetTier: resolveBudgetTierForModel(selected.model),
    budgetWindowKey: sanitizeBudgetWindowKey(input.budgetWindowKey),
    budgetReservationId: sanitizeOptionalId(input.budgetReservationId),
    usage,
    usageType,
    usageBreakdown,
    queueRunId: sanitizeOptionalId(input.queueRunId),
    idempotencyKey: sanitizeOptionalId(input.idempotencyKey),
  })
  const consumedCredits = estimateAiCommandCreditsForUsage(usage)
  if (input.aiCommandCreditReservationId) {
    if (consumedCredits > 0) {
      commitAiPlayerProviderAiCommandCreditReservation(input.aiCommandCreditReservationId, {
        usage,
        requestId,
        aiPlayerId: input.aiPlayerId,
        factionId: input.factionId,
        reason: 'provider_request_succeeded',
      })
    } else {
      releaseAiPlayerProviderAiCommandCreditReservation(input.aiCommandCreditReservationId)
    }
  } else if (consumedCredits > 0) {
    debitAiPlayerProviderAiCommandCredits({
      accountId: input.governorPlayerId,
      worldId: resolveAiCommandCreditWorldId(input.factionId),
      amountCredits: consumedCredits,
      requestId,
      aiPlayerId: input.aiPlayerId,
      factionId: input.factionId,
      reason: 'provider_request_succeeded',
    })
  }
  appendAuditEvent({
    eventType: 'provider_request_succeeded',
    requestId,
    aiPlayerId: input.aiPlayerId,
    factionId: input.factionId,
    governorPlayerId: input.governorPlayerId,
    providerSource: selected.source,
    byokSource: selected.byokSource,
    model: selected.model,
    provider: selected.provider,
    queueRunId: input.queueRunId,
    idempotencyKey: input.idempotencyKey,
    metadata: {
      priority: selected.priority,
      fallbackFailureCount: failures.length,
      budgetWindowKey: sanitizeBudgetWindowKey(input.budgetWindowKey) ?? null,
      budgetReservationId: sanitizeOptionalId(input.budgetReservationId) ?? null,
    },
  })
  return requestId
}
