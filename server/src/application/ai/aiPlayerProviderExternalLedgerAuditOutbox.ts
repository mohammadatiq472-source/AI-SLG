import { createHmac, randomUUID } from 'node:crypto'
import type {
  AiPlayerProviderAuditEvent,
  AiPlayerProviderBillingLedgerEntry,
} from '../../../../shared/contracts/aiPlayerProviderAccount'

const LEDGER_AUDIT_DB_URL_ENV = 'AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL'
const LEDGER_AUDIT_DB_TIMEOUT_MS_ENV = 'AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_TIMEOUT_MS'
const LEDGER_AUDIT_DB_HMAC_SECRET_ENV = 'AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_HMAC_SECRET'
export const MAX_EXTERNAL_LEDGER_AUDIT_OUTBOX_ITEMS = 2_000
const MAX_EXTERNAL_LEDGER_AUDIT_RETRY_ERROR_LENGTH = 500

export type ExternalLedgerAuditPayload = {
  schemaVersion: 1
  source: 'ai-player-provider-account-store'
  sentAt: string
  billingLedgerEntries: AiPlayerProviderBillingLedgerEntry[]
  auditEvents: AiPlayerProviderAuditEvent[]
}

export type ExternalLedgerAuditOutboxItem = ExternalLedgerAuditPayload & {
  outboxId: string
  idempotencyKey: string
  createdAt: string
  nextAttemptAt: string
  attemptCount: number
  lastError?: string
}

type ExternalLedgerAuditOutboxControllerOptions = {
  outbox: ExternalLedgerAuditOutboxItem[]
  schedulePersist: () => void
  sanitizeError: (error: unknown) => string
  nowIso?: () => string
  maxItems?: number
}

type ExternalLedgerAuditOutboxSanitizerOptions = {
  sanitizeOptionalId: (input: unknown) => string | undefined
  sanitizeBillingEntry: (input: unknown) => AiPlayerProviderBillingLedgerEntry | null
  sanitizeAuditEvent: (input: unknown) => AiPlayerProviderAuditEvent | null
  clipString: (input: unknown, maxLength: number) => string | undefined
  sanitizeNonnegativeInteger: (input: unknown) => number
  sanitizeReason: (input: unknown) => string | undefined
  nowIso?: () => string
}

type ExternalLedgerAuditOutboxLoadOptions = ExternalLedgerAuditOutboxSanitizerOptions & {
  outbox: ExternalLedgerAuditOutboxItem[]
  maxItems?: number
}

function nowIso() {
  return new Date().toISOString()
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

function readExternalLedgerAuditDbTimeoutMs() {
  return readIntegerEnv(LEDGER_AUDIT_DB_TIMEOUT_MS_ENV, { minimum: 1_000, maximum: 30_000 }) ?? 5_000
}

function normalizeExternalLedgerAuditOutboxMaxItems(maxItems: number | undefined) {
  const candidate = maxItems ?? MAX_EXTERNAL_LEDGER_AUDIT_OUTBOX_ITEMS
  return Number.isFinite(candidate) ? Math.max(0, Math.trunc(candidate)) : MAX_EXTERNAL_LEDGER_AUDIT_OUTBOX_ITEMS
}

function sanitizeExternalLedgerAuditTimestamp(
  input: unknown,
  options: ExternalLedgerAuditOutboxSanitizerOptions,
  fallback: string,
) {
  const clipped = options.clipString(input, 80)
  return clipped && Number.isFinite(Date.parse(clipped)) ? clipped : fallback
}

export function sanitizeExternalLedgerAuditOutboxItem(
  input: unknown,
  options: ExternalLedgerAuditOutboxSanitizerOptions,
): ExternalLedgerAuditOutboxItem | null {
  if (!input || typeof input !== 'object') {
    return null
  }
  const source = input as Partial<ExternalLedgerAuditOutboxItem>
  const outboxId = options.sanitizeOptionalId(source.outboxId)
  const idempotencyKey = options.sanitizeOptionalId(source.idempotencyKey)
  if (!outboxId || !idempotencyKey) {
    return null
  }
  const billingLedgerEntries = Array.isArray(source.billingLedgerEntries)
    ? source.billingLedgerEntries.flatMap((entry) => {
        const sanitized = options.sanitizeBillingEntry(entry)
        return sanitized ? [sanitized] : []
      })
    : []
  const sanitizedAuditEvents = Array.isArray(source.auditEvents)
    ? source.auditEvents.flatMap((event) => {
        const sanitized = options.sanitizeAuditEvent(event)
        return sanitized ? [sanitized] : []
      })
    : []
  if (billingLedgerEntries.length === 0 && sanitizedAuditEvents.length === 0) {
    return null
  }
  const readNowIso = options.nowIso ?? nowIso
  const fallbackTimestamp = readNowIso()
  return {
    schemaVersion: 1,
    source: 'ai-player-provider-account-store',
    sentAt: sanitizeExternalLedgerAuditTimestamp(source.sentAt, options, fallbackTimestamp),
    billingLedgerEntries,
    auditEvents: sanitizedAuditEvents,
    outboxId,
    idempotencyKey,
    createdAt: sanitizeExternalLedgerAuditTimestamp(source.createdAt, options, fallbackTimestamp),
    nextAttemptAt: sanitizeExternalLedgerAuditTimestamp(source.nextAttemptAt, options, fallbackTimestamp),
    attemptCount: options.sanitizeNonnegativeInteger(source.attemptCount),
    lastError: options.sanitizeReason(source.lastError),
  }
}

export function loadExternalLedgerAuditOutboxItems(input: unknown, options: ExternalLedgerAuditOutboxLoadOptions) {
  if (!Array.isArray(input)) {
    return 0
  }
  const maxItems = normalizeExternalLedgerAuditOutboxMaxItems(options.maxItems)
  if (maxItems === 0) {
    return 0
  }
  let loadedCount = 0
  for (const item of input) {
    if (options.outbox.length >= maxItems) {
      break
    }
    const next = sanitizeExternalLedgerAuditOutboxItem(item, options)
    if (next) {
      options.outbox.push(next)
      loadedCount += 1
    }
  }
  return loadedCount
}

export function toPersistedExternalLedgerAuditOutboxItems(
  outbox: ExternalLedgerAuditOutboxItem[],
  maxItems = MAX_EXTERNAL_LEDGER_AUDIT_OUTBOX_ITEMS,
) {
  const normalizedMaxItems = normalizeExternalLedgerAuditOutboxMaxItems(maxItems)
  if (normalizedMaxItems === 0) {
    return []
  }
  return outbox.slice(-normalizedMaxItems).map((item) => structuredClone(item))
}

function readEnvSecret(name: string): string | null {
  return process.env[name]?.trim() || null
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

async function postExternalLedgerAuditPayload(item: ExternalLedgerAuditOutboxItem, readNowIso: () => string) {
  const url = readEnvUrl(LEDGER_AUDIT_DB_URL_ENV)
  if (!url) {
    return
  }
  const payload: ExternalLedgerAuditPayload = {
    schemaVersion: 1,
    source: 'ai-player-provider-account-store',
    sentAt: readNowIso(),
    billingLedgerEntries: item.billingLedgerEntries,
    auditEvents: item.auditEvents,
  }
  const body = JSON.stringify(payload)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), readExternalLedgerAuditDbTimeoutMs())
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildSignedHeaders({
        body,
        idempotencyKey: item.idempotencyKey,
        signatureSecretEnv: LEDGER_AUDIT_DB_HMAC_SECRET_ENV,
      }),
      body,
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`external_ledger_audit_db_${response.status}`)
    }
  } finally {
    clearTimeout(timer)
  }
}

function isExternalLedgerAuditOutboxItemReady(item: ExternalLedgerAuditOutboxItem, nowMs: number) {
  const nextAttemptMs = Date.parse(item.nextAttemptAt)
  return !Number.isFinite(nextAttemptMs) || nextAttemptMs <= nowMs
}

function readExternalLedgerAuditNowMs(readNowIso: () => string) {
  const injectedNowMs = Date.parse(readNowIso())
  return Number.isFinite(injectedNowMs) ? injectedNowMs : Date.parse(nowIso())
}

export function createExternalLedgerAuditOutboxController(options: ExternalLedgerAuditOutboxControllerOptions) {
  const outbox = options.outbox
  const maxItems = normalizeExternalLedgerAuditOutboxMaxItems(options.maxItems)
  const readNowIso = options.nowIso ?? nowIso
  let externalLedgerAuditTimer: ReturnType<typeof setTimeout> | null = null
  let externalLedgerAuditInFlight: Promise<void> | null = null
  let externalLedgerAuditSuccessCount = 0
  let externalLedgerAuditFailureCount = 0
  let externalLedgerAuditLastSuccessAt: number | null = null
  let externalLedgerAuditLastFailureAt: number | null = null
  let externalLedgerAuditLastError: string | null = null

  function scheduleExternalLedgerAuditDrain(delayMs: number) {
    if (externalLedgerAuditTimer || externalLedgerAuditInFlight) {
      return
    }
    externalLedgerAuditTimer = setTimeout(() => {
      externalLedgerAuditTimer = null
      void drainExternalLedgerAuditSync()
    }, delayMs)
  }

  function scheduleFailedExternalLedgerAuditRetry(item: ExternalLedgerAuditOutboxItem, error: unknown) {
    const sanitizedError = options.sanitizeError(error).slice(0, MAX_EXTERNAL_LEDGER_AUDIT_RETRY_ERROR_LENGTH)
    const nowMs = readExternalLedgerAuditNowMs(readNowIso)
    item.attemptCount += 1
    item.lastError = sanitizedError
    const retryDelayMs = Math.min(60_000, 1_000 * (2 ** Math.min(6, item.attemptCount)))
    item.nextAttemptAt = new Date(nowMs + retryDelayMs).toISOString()
    externalLedgerAuditFailureCount += 1
    externalLedgerAuditLastFailureAt = nowMs
    externalLedgerAuditLastError = sanitizedError
    options.schedulePersist()
    scheduleExternalLedgerAuditDrain(1_000)
  }

  async function drainExternalLedgerAuditSync(): Promise<void> {
    if (externalLedgerAuditInFlight) {
      await externalLedgerAuditInFlight
      return
    }
    if (outbox.length === 0) {
      return
    }
    if (!readEnvUrl(LEDGER_AUDIT_DB_URL_ENV)) {
      return
    }

    externalLedgerAuditInFlight = (async () => {
      try {
        const now = readExternalLedgerAuditNowMs(readNowIso)
        const readyItems = outbox
          .filter((item) => isExternalLedgerAuditOutboxItemReady(item, now))
          .slice(0, 25)
        for (const item of readyItems) {
          try {
            await postExternalLedgerAuditPayload(item, readNowIso)
            const index = outbox.findIndex((candidate) => candidate.outboxId === item.outboxId)
            if (index >= 0) {
              outbox.splice(index, 1)
            }
            externalLedgerAuditSuccessCount += 1
            externalLedgerAuditLastSuccessAt = now
            externalLedgerAuditLastError = null
            options.schedulePersist()
          } catch (error) {
            scheduleFailedExternalLedgerAuditRetry(item, error)
          }
        }
      } finally {
        externalLedgerAuditInFlight = null
        if (outbox.length > 0) {
          scheduleExternalLedgerAuditDrain(1_000)
        }
      }
    })()
    await externalLedgerAuditInFlight
  }

  return {
    enqueue(input: {
      billingLedgerEntry?: AiPlayerProviderBillingLedgerEntry
      auditEvent?: AiPlayerProviderAuditEvent
    }) {
      if (!input.billingLedgerEntry && !input.auditEvent) {
        return
      }
      if (maxItems === 0) {
        return
      }
      if (!readEnvUrl(LEDGER_AUDIT_DB_URL_ENV)) {
        return
      }
      const outboxId = `provider_outbox_${randomUUID()}`
      const timestamp = readNowIso()
      outbox.push({
        schemaVersion: 1,
        source: 'ai-player-provider-account-store',
        sentAt: timestamp,
        billingLedgerEntries: input.billingLedgerEntry ? [structuredClone(input.billingLedgerEntry)] : [],
        auditEvents: input.auditEvent ? [structuredClone(input.auditEvent)] : [],
        outboxId,
        idempotencyKey: outboxId,
        createdAt: timestamp,
        nextAttemptAt: timestamp,
        attemptCount: 0,
      })
      while (outbox.length > maxItems) {
        outbox.shift()
      }
      options.schedulePersist()
      scheduleExternalLedgerAuditDrain(100)
    },
    clearTimer() {
      if (externalLedgerAuditTimer) {
        clearTimeout(externalLedgerAuditTimer)
        externalLedgerAuditTimer = null
      }
    },
    drain: drainExternalLedgerAuditSync,
    getHealth() {
      return {
        configured: Boolean(readEnvUrl(LEDGER_AUDIT_DB_URL_ENV)),
        hmacConfigured: Boolean(readEnvSecret(LEDGER_AUDIT_DB_HMAC_SECRET_ENV)),
        durableOutboxCount: outbox.length,
        pendingBillingLedgerCount: outbox.reduce((count, item) => count + item.billingLedgerEntries.length, 0),
        pendingAuditEventCount: outbox.reduce((count, item) => count + item.auditEvents.length, 0),
        inFlight: Boolean(externalLedgerAuditInFlight),
        successCount: externalLedgerAuditSuccessCount,
        failureCount: externalLedgerAuditFailureCount,
        lastSuccessAt: externalLedgerAuditLastSuccessAt,
        lastFailureAt: externalLedgerAuditLastFailureAt,
        lastError: externalLedgerAuditLastError,
      }
    },
  }
}
