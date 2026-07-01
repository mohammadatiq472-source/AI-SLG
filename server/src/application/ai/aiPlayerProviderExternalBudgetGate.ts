import { createHmac, randomUUID } from 'node:crypto'
import type {
  AiPlayerModelBudgetTier,
  AiPlayerModelByokSource,
  AiPlayerModelRoutingSource,
} from '../../../../shared/contracts/aiPlayer'
import type {
  AiPlayerProviderBillingAccountType,
  AiPlayerProviderBillingUsage,
  AiPlayerProviderBudgetLimitMode,
  AiPlayerProviderBudgetWindow,
} from '../../../../shared/contracts/aiPlayerProviderAccount'

export const BUDGET_GATE_URL_ENV = 'AI_PLAYER_PROVIDER_BUDGET_GATE_URL'
const BUDGET_GATE_TIMEOUT_MS_ENV = 'AI_PLAYER_PROVIDER_BUDGET_GATE_TIMEOUT_MS'
const BUDGET_GATE_HMAC_SECRET_ENV = 'AI_PLAYER_PROVIDER_BUDGET_GATE_HMAC_SECRET'
const BUDGET_GATE_FAIL_OPEN_ENV = 'AI_PLAYER_PROVIDER_BUDGET_GATE_FAIL_OPEN'
const BUDGET_RESERVATION_TTL_MS_ENV = 'AI_PLAYER_PROVIDER_BUDGET_RESERVATION_TTL_MS'
const DEFAULT_BUDGET_RESERVATION_TTL_MS = 120_000

export type ReserveProviderBudgetInput = {
  aiPlayerId?: string
  factionId: string
  governorPlayerId: string
  model: string
  provider: string
  source: AiPlayerModelRoutingSource
  byokSource: AiPlayerModelByokSource
  budgetTier?: AiPlayerModelBudgetTier
  queueRunId?: string
  idempotencyKey?: string
}

type ExternalBudgetGateOperation = 'reserve' | 'commit' | 'release'

type ExternalBudgetGatePayload = {
  schemaVersion: 1
  source: 'ai-player-provider-account-store'
  operation: ExternalBudgetGateOperation
  sentAt: string
  reservationId?: string
  reserve?: ReserveProviderBudgetInput & {
    billingAccountType: AiPlayerProviderBillingAccountType
    billingAccountId: string | null
    budgetWindowKey: string
    windowStartedAt: string
    windowEndsAt: string
    localLimitMode: AiPlayerProviderBudgetLimitMode
    maxRuns: number | null
    maxPromptTokens: number | null
    maxCompletionTokens: number | null
    maxTotalTokens: number | null
    maxEstimatedCostUsd: number | null
    expiresAt: string
  }
  commit?: {
    usage?: AiPlayerProviderBillingUsage
    ok?: boolean
    error?: string
  }
}

export type ExternalBudgetGateResponse = {
  ok?: unknown
  error?: unknown
  reservationId?: unknown
  budgetWindowKey?: unknown
  budgetTier?: unknown
  limitMode?: unknown
  remainingRuns?: unknown
  remainingTotalTokens?: unknown
  window?: unknown
}

type ExternalBudgetGateReservation = {
  reservationId: string
  provider: string
  model: string
}

type ExternalBudgetGateClockOptions = {
  nowIso?: () => string
}

export type ExternalBudgetGateReserveResult = {
  desiredReservationId: string
  expiresAt: string
  response: ExternalBudgetGateResponse | null
}

let externalBudgetGateSuccessCount = 0
let externalBudgetGateFailureCount = 0
let externalBudgetGateLastSuccessAt: number | null = null
let externalBudgetGateLastFailureAt: number | null = null
let externalBudgetGateLastError: string | null = null

function nowIso() {
  return new Date().toISOString()
}

function readExternalBudgetGateNowMs(readNowIso: () => string) {
  const injectedNowMs = Date.parse(readNowIso())
  return Number.isFinite(injectedNowMs) ? injectedNowMs : Date.parse(nowIso())
}

function clipString(input: unknown, maxLength: number): string | undefined {
  if (typeof input !== 'string') {
    return undefined
  }
  const trimmed = input.trim()
  if (!trimmed) {
    return undefined
  }
  return trimmed.slice(0, maxLength)
}

function sanitizeOptionalId(input: unknown): string | undefined {
  return clipString(input, 120)
}

function sanitizeExternalBudgetGateError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  return clipString(raw
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, 'sk-<redacted>')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer <redacted>')
    .replace(/:\/\/[^@\s/]+@/g, '://<redacted>@')
    .replace(/[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g, 'jwt-<redacted>'), 240)
    ?? 'external_budget_gate_error'
}

function readEnvUrl(name: string): string | null {
  const raw = process.env[name]?.trim()
  if (!raw) {
    return null
  }
  try {
    const url = new URL(raw)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
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

function readBooleanEnv(name: string) {
  const raw = process.env[name]?.trim().toLowerCase()
  if (!raw) {
    return false
  }
  return ['1', 'true', 'yes', 'on'].includes(raw)
}

function readEnvSecret(name: string): string | null {
  return process.env[name]?.trim() || null
}

function readExternalBudgetGateTimeoutMs() {
  return readIntegerEnv(BUDGET_GATE_TIMEOUT_MS_ENV, { minimum: 1_000, maximum: 30_000 }) ?? 5_000
}

function readBudgetReservationTtlMs() {
  return readIntegerEnv(BUDGET_RESERVATION_TTL_MS_ENV, { minimum: 1_000, maximum: 3_600_000 })
    ?? DEFAULT_BUDGET_RESERVATION_TTL_MS
}

function buildSignedHeaders(input: {
  body: string
  idempotencyKey: string
  signatureSecretEnv: string
}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Idempotency-Key': input.idempotencyKey,
  }
  const secret = readEnvSecret(input.signatureSecretEnv)
  if (secret) {
    headers['X-Signature-Alg'] = 'hmac-sha256'
    headers['X-Signature'] = createHmac('sha256', secret).update(input.body, 'utf8').digest('hex')
  }
  return headers
}

function trackExternalBudgetGateSuccess(nowMs: number) {
  externalBudgetGateSuccessCount += 1
  externalBudgetGateLastSuccessAt = nowMs
  externalBudgetGateLastError = null
}

function trackExternalBudgetGateFailure(error: unknown, nowMs: number) {
  externalBudgetGateFailureCount += 1
  externalBudgetGateLastFailureAt = nowMs
  externalBudgetGateLastError = sanitizeExternalBudgetGateError(error)
}

async function postExternalBudgetGate(
  payload: ExternalBudgetGatePayload,
  idempotencyKey: string,
  readNowIso: () => string,
): Promise<ExternalBudgetGateResponse | null> {
  const url = readEnvUrl(BUDGET_GATE_URL_ENV)
  if (!url) {
    return null
  }
  const body = JSON.stringify(payload)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), readExternalBudgetGateTimeoutMs())
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildSignedHeaders({
        body,
        idempotencyKey,
        signatureSecretEnv: BUDGET_GATE_HMAC_SECRET_ENV,
      }),
      body,
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`external_budget_gate_${response.status}`)
    }
    trackExternalBudgetGateSuccess(readExternalBudgetGateNowMs(readNowIso))
    return await response.json() as ExternalBudgetGateResponse
  } catch (error) {
    trackExternalBudgetGateFailure(error, readExternalBudgetGateNowMs(readNowIso))
    if (readBooleanEnv(BUDGET_GATE_FAIL_OPEN_ENV)) {
      return null
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export function getExternalBudgetGateHealth() {
  return {
    configured: Boolean(readEnvUrl(BUDGET_GATE_URL_ENV)),
    hmacConfigured: Boolean(readEnvSecret(BUDGET_GATE_HMAC_SECRET_ENV)),
    failOpen: readBooleanEnv(BUDGET_GATE_FAIL_OPEN_ENV),
    successCount: externalBudgetGateSuccessCount,
    failureCount: externalBudgetGateFailureCount,
    lastSuccessAt: externalBudgetGateLastSuccessAt,
    lastFailureAt: externalBudgetGateLastFailureAt,
    lastError: externalBudgetGateLastError,
  }
}

export async function reserveExternalProviderBudgetGate(
  input: ReserveProviderBudgetInput,
  window: AiPlayerProviderBudgetWindow,
  options: ExternalBudgetGateClockOptions = {},
): Promise<ExternalBudgetGateReserveResult | null> {
  if (!readEnvUrl(BUDGET_GATE_URL_ENV)) {
    return null
  }
  const readNowIso = options.nowIso ?? nowIso
  const sentAt = readNowIso()
  const nowMs = Number.isFinite(Date.parse(sentAt)) ? Date.parse(sentAt) : readExternalBudgetGateNowMs(readNowIso)
  const desiredReservationId = `budget_res_${randomUUID()}`
  const expiresAt = new Date(nowMs + readBudgetReservationTtlMs()).toISOString()
  const payload: ExternalBudgetGatePayload = {
    schemaVersion: 1,
    source: 'ai-player-provider-account-store',
    operation: 'reserve',
    sentAt,
    reservationId: desiredReservationId,
    reserve: {
      ...input,
      budgetTier: window.budgetTier,
      billingAccountType: window.billingAccountType,
      billingAccountId: window.billingAccountId,
      budgetWindowKey: window.budgetWindowKey,
      windowStartedAt: window.windowStartedAt,
      windowEndsAt: window.windowEndsAt,
      localLimitMode: window.limitMode,
      maxRuns: window.maxRuns,
      maxPromptTokens: window.maxPromptTokens,
      maxCompletionTokens: window.maxCompletionTokens,
      maxTotalTokens: window.maxTotalTokens,
      maxEstimatedCostUsd: window.maxEstimatedCostUsd,
      expiresAt,
      queueRunId: sanitizeOptionalId(input.queueRunId),
      idempotencyKey: sanitizeOptionalId(input.idempotencyKey),
    },
  }
  return {
    desiredReservationId,
    expiresAt,
    response: await postExternalBudgetGate(payload, input.idempotencyKey ?? desiredReservationId, readNowIso),
  }
}

export async function notifyExternalBudgetGate(
  operation: 'commit' | 'release',
  reservation: ExternalBudgetGateReservation,
  input: { usage?: AiPlayerProviderBillingUsage; ok?: boolean; error?: string } = {},
  options: ExternalBudgetGateClockOptions = {},
) {
  if (!readEnvUrl(BUDGET_GATE_URL_ENV)) {
    return
  }
  const readNowIso = options.nowIso ?? nowIso
  const payload: ExternalBudgetGatePayload = {
    schemaVersion: 1,
    source: 'ai-player-provider-account-store',
    operation,
    sentAt: readNowIso(),
    reservationId: reservation.reservationId,
    commit: operation === 'commit'
      ? {
          usage: input.usage,
          ok: input.ok,
          error: input.error,
        }
      : undefined,
  }
  try {
    await postExternalBudgetGate(payload, `${reservation.reservationId}:${operation}`, readNowIso)
  } catch {
    // Local accounting remains authoritative for this process; provider health exposes gate failures.
  }
}
