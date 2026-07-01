import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export type AiPlayerRuntimeModelDispatchLeaseState = 'queued' | 'active' | 'completed' | 'failed' | 'expired'

export type AiPlayerRuntimeModelDispatchLease = {
  leaseId: string
  ownerId: string
  aiPlayerId: string
  lane: string
  provider: string
  model: string
  keyFingerprint: string | null
  state: AiPlayerRuntimeModelDispatchLeaseState
  claimedAt: string
  heartbeatAt: string
  expiresAt: string
  completedAt?: string
  failedAt?: string
  failureReason?: string
}

export type AiPlayerRuntimeModelDispatchRateBucket = {
  bucketKey: string
  provider: string
  model: string
  keyFingerprint: string | null
  limit: number
  windowMs: number
  windowStartedAt: string
  resetAt: string
  usedRequests: number
}

export type AiPlayerRuntimeModelDispatchQueueJobState = 'pending' | 'active' | 'completed' | 'failed' | 'expired'

export type AiPlayerRuntimeModelDispatchQueueJob = {
  jobId: string
  leaseId: string
  ownerId: string
  aiPlayerId: string
  lane: string
  priority: number
  provider: string
  model: string
  keyFingerprint: string | null
  state: AiPlayerRuntimeModelDispatchQueueJobState
  enqueuedAt: string
  availableAt: string
  heartbeatAt: string
  expiresAt: string
  claimedAt?: string
  completedAt?: string
  failedAt?: string
  failureReason?: string
  mergeKey?: string | null
}

export type ClaimDispatchLeaseInput = {
  leaseId: string
  ownerId: string
  aiPlayerId: string
  lane: string
  provider: string
  model: string
  keyFingerprint: string | null
  ttlMs: number
  nowMs?: number
}

export type HeartbeatDispatchLeaseInput = {
  leaseId: string
  ownerId: string
  ttlMs: number
  state?: 'queued' | 'active'
  nowMs?: number
}

export type CompleteDispatchLeaseInput = {
  leaseId: string
  ownerId: string
  nowMs?: number
}

export type FailDispatchLeaseInput = CompleteDispatchLeaseInput & {
  reason: string
}

export type ReserveDispatchRateBucketInput = {
  provider: string
  model: string
  keyFingerprint: string | null
  limit: number | null
  windowMs: number
  nowMs?: number
}

export type EnqueueDispatchQueueJobInput = {
  jobId: string
  leaseId: string
  ownerId: string
  aiPlayerId: string
  lane: string
  priority: number
  provider: string
  model: string
  keyFingerprint: string | null
  ttlMs: number
  nowMs?: number
  availableAtMs?: number
  mergeKey?: string | null
  throttleMs?: number | null
}

export type ClaimNextDispatchQueueJobInput = {
  ownerId: string
  ttlMs: number
  nowMs?: number
  lanes?: string[]
}

export type ClaimDispatchQueueJobInput = ClaimNextDispatchQueueJobInput & {
  jobId: string
}

export type HeartbeatDispatchQueueJobInput = {
  jobId: string
  ownerId: string
  ttlMs: number
  nowMs?: number
}

export type CompleteDispatchQueueJobInput = {
  jobId: string
  ownerId: string
  nowMs?: number
}

export type FailDispatchQueueJobInput = CompleteDispatchQueueJobInput & {
  reason: string
}

type PersistedDispatchStore = {
  version: 1
  savedAt: string
  leases: Record<string, AiPlayerRuntimeModelDispatchLease>
  rateBuckets: Record<string, AiPlayerRuntimeModelDispatchRateBucket>
  queueJobs: Record<string, AiPlayerRuntimeModelDispatchQueueJob>
}

export type AiPlayerRuntimeModelDispatchSnapshot = {
  leases: AiPlayerRuntimeModelDispatchLease[]
  rateBuckets: AiPlayerRuntimeModelDispatchRateBucket[]
  queueJobs: AiPlayerRuntimeModelDispatchQueueJob[]
}

const STORE_VERSION = 1
const FILE_LOCK_TIMEOUT_MS = 5_000
const FILE_LOCK_STALE_MS = 30_000

function nowIso(nowMs = Date.now()) {
  return new Date(nowMs).toISOString()
}

function sanitizeTtlMs(ttlMs: number) {
  if (!Number.isFinite(ttlMs)) {
    return 60_000
  }
  return Math.max(1, Math.min(3_600_000, Math.trunc(ttlMs)))
}

function sanitizeWindowMs(windowMs: number) {
  if (!Number.isFinite(windowMs)) {
    return 60_000
  }
  return Math.max(1_000, Math.min(3_600_000, Math.trunc(windowMs)))
}

function buildEmptyStore(): PersistedDispatchStore {
  return {
    version: STORE_VERSION,
      savedAt: nowIso(),
      leases: {},
      rateBuckets: {},
      queueJobs: {},
    }
}

function isActiveLease(lease: AiPlayerRuntimeModelDispatchLease, nowMs: number) {
  if (lease.state !== 'queued' && lease.state !== 'active') {
    return false
  }
  return Date.parse(lease.expiresAt) > nowMs
}

function expireLeases(data: PersistedDispatchStore, nowMs: number) {
  for (const lease of Object.values(data.leases)) {
    if ((lease.state === 'queued' || lease.state === 'active') && Date.parse(lease.expiresAt) <= nowMs) {
      lease.state = 'expired'
      lease.failureReason = lease.failureReason ?? 'lease_expired'
    }
  }
}

function isClaimableQueueJob(job: AiPlayerRuntimeModelDispatchQueueJob, nowMs: number) {
  if (job.state === 'pending' || job.state === 'expired') {
    return Date.parse(job.availableAt) <= nowMs
  }
  if (job.state === 'active') {
    return Date.parse(job.expiresAt) <= nowMs
  }
  return false
}

function expireQueueJobs(data: PersistedDispatchStore, nowMs: number) {
  for (const job of Object.values(data.queueJobs)) {
    if (job.state === 'active' && Date.parse(job.expiresAt) <= nowMs) {
      job.state = 'expired'
      job.failureReason = job.failureReason ?? 'queue_job_expired'
    }
  }
}

function terminalJobTimeMs(job: AiPlayerRuntimeModelDispatchQueueJob) {
  if (job.completedAt) return Date.parse(job.completedAt)
  if (job.failedAt) return Date.parse(job.failedAt)
  return Date.parse(job.heartbeatAt || job.enqueuedAt)
}

function buildRateBucketKey(input: Pick<ReserveDispatchRateBucketInput, 'provider' | 'model' | 'keyFingerprint'>) {
  return `${input.provider}\u0000${input.model}\u0000${input.keyFingerprint ?? 'none'}`
}

function loadPersisted(path: string): PersistedDispatchStore {
  if (!existsSync(path)) {
    return buildEmptyStore()
  }
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as Partial<PersistedDispatchStore>
    return {
      version: STORE_VERSION,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : nowIso(),
      leases: parsed.leases && typeof parsed.leases === 'object' ? parsed.leases as Record<string, AiPlayerRuntimeModelDispatchLease> : {},
      rateBuckets: parsed.rateBuckets && typeof parsed.rateBuckets === 'object'
        ? parsed.rateBuckets as Record<string, AiPlayerRuntimeModelDispatchRateBucket>
        : {},
      queueJobs: parsed.queueJobs && typeof parsed.queueJobs === 'object'
        ? parsed.queueJobs as Record<string, AiPlayerRuntimeModelDispatchQueueJob>
        : {},
    }
  } catch {
    return buildEmptyStore()
  }
}

function savePersisted(path: string, data: PersistedDispatchStore) {
  const dir = dirname(path)
  const tmp = join(dir, `.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`)
  mkdirSync(dir, { recursive: true })
  data.savedAt = nowIso()
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
  try {
    renameSync(tmp, path)
  } catch (error) {
    const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : null
    if (code !== 'EPERM' && code !== 'EEXIST') {
      throw error
    }
    if (existsSync(path)) {
      unlinkSync(path)
    }
    renameSync(tmp, path)
  }
}

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function withFileLock<T>(path: string, run: () => T): T {
  const lockPath = `${path}.lock`
  mkdirSync(dirname(path), { recursive: true })
  const deadline = Date.now() + FILE_LOCK_TIMEOUT_MS
  let lockFd: number | null = null
  while (lockFd === null) {
    try {
      lockFd = openSync(lockPath, 'wx')
    } catch (error) {
      const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : null
      if (code !== 'EEXIST') {
        throw error
      }
      try {
        const raw = readFileSync(lockPath, 'utf-8')
        const lockedAt = Number(raw)
        if (Number.isFinite(lockedAt) && Date.now() - lockedAt > FILE_LOCK_STALE_MS) {
          unlinkSync(lockPath)
          continue
        }
      } catch {
        // If the lock file cannot be read, fall through to the bounded wait.
      }
      if (Date.now() >= deadline) {
        throw new Error('dispatch_store_lock_timeout')
      }
      sleepSync(10)
    }
  }
  try {
    writeFileSync(lockFd, String(Date.now()), 'utf-8')
    return run()
  } finally {
    closeSync(lockFd)
    try {
      unlinkSync(lockPath)
    } catch {
      // Another process may have cleaned up a stale lock; the mutation already finished.
    }
  }
}

export type AiPlayerRuntimeModelDispatchStore = {
  claimLease: (input: ClaimDispatchLeaseInput) => { ok: true; lease: AiPlayerRuntimeModelDispatchLease; reclaimedExpired: boolean } | { ok: false; error: 'dispatch_lease_held'; lease: AiPlayerRuntimeModelDispatchLease }
  heartbeatLease: (input: HeartbeatDispatchLeaseInput) => { ok: true; lease: AiPlayerRuntimeModelDispatchLease } | { ok: false; error: 'dispatch_lease_not_found' | 'dispatch_lease_not_owned' | 'dispatch_lease_expired' }
  completeLease: (input: CompleteDispatchLeaseInput) => { ok: true; lease: AiPlayerRuntimeModelDispatchLease } | { ok: false; error: string }
  failLease: (input: FailDispatchLeaseInput) => { ok: true; lease: AiPlayerRuntimeModelDispatchLease } | { ok: false; error: string }
  reserveRateBucket: (input: ReserveDispatchRateBucketInput) => { ok: true; bucket: AiPlayerRuntimeModelDispatchRateBucket | null } | { ok: false; error: 'model_provider_rate_bucket_exhausted'; bucket: AiPlayerRuntimeModelDispatchRateBucket }
  enqueueJob: (input: EnqueueDispatchQueueJobInput) => { ok: true; job: AiPlayerRuntimeModelDispatchQueueJob; mergedExisting: boolean; throttledUntil?: string }
  claimNextJob: (input: ClaimNextDispatchQueueJobInput) => { ok: true; job: AiPlayerRuntimeModelDispatchQueueJob; reclaimedExpired: boolean } | { ok: false; error: 'dispatch_queue_empty' }
  claimJob: (input: ClaimDispatchQueueJobInput) => { ok: true; job: AiPlayerRuntimeModelDispatchQueueJob; reclaimedExpired: boolean } | { ok: false; error: 'dispatch_queue_not_found' | 'dispatch_queue_not_available' | 'dispatch_queue_held' }
  heartbeatJob: (input: HeartbeatDispatchQueueJobInput) => { ok: true; job: AiPlayerRuntimeModelDispatchQueueJob } | { ok: false; error: 'dispatch_queue_not_found' | 'dispatch_queue_not_owned' | 'dispatch_queue_not_active' | 'dispatch_queue_expired' }
  completeJob: (input: CompleteDispatchQueueJobInput) => { ok: true; job: AiPlayerRuntimeModelDispatchQueueJob } | { ok: false; error: string }
  failJob: (input: FailDispatchQueueJobInput) => { ok: true; job: AiPlayerRuntimeModelDispatchQueueJob } | { ok: false; error: string }
  snapshot: (nowMs?: number) => AiPlayerRuntimeModelDispatchSnapshot
}

function sortQueueJobsForClaim(
  left: AiPlayerRuntimeModelDispatchQueueJob,
  right: AiPlayerRuntimeModelDispatchQueueJob,
) {
  if (right.priority !== left.priority) {
    return right.priority - left.priority
  }
  return Date.parse(left.enqueuedAt) - Date.parse(right.enqueuedAt)
}

function claimQueueJobForOwner(
  job: AiPlayerRuntimeModelDispatchQueueJob,
  ownerId: string,
  ttlMs: number,
  nowMs: number,
) {
  const reclaimedExpired = job.state === 'expired' || (job.state === 'active' && Date.parse(job.expiresAt) <= nowMs)
  job.ownerId = ownerId
  job.state = 'active'
  job.claimedAt = nowIso(nowMs)
  job.heartbeatAt = nowIso(nowMs)
  job.expiresAt = nowIso(nowMs + sanitizeTtlMs(ttlMs))
  return {
    ok: true as const,
    job: structuredClone(job),
    reclaimedExpired,
  }
}

export function createAiPlayerRuntimeModelDispatchStore(options: {
  storePath?: string | null
} = {}): AiPlayerRuntimeModelDispatchStore {
  let memoryData = buildEmptyStore()
  const storePath = options.storePath?.trim() || null

  const transact = <T>(mutate: (data: PersistedDispatchStore) => T): T => {
    if (storePath) {
      return withFileLock(storePath, () => {
        const data = loadPersisted(storePath)
        const result = mutate(data)
        savePersisted(storePath, data)
        return result
      })
    }
    const data = memoryData
    const result = mutate(data)
    memoryData = data
    return result
  }

  return {
    claimLease(input) {
      const nowMs = input.nowMs ?? Date.now()
      return transact((data) => {
        expireLeases(data, nowMs)
        const existing = data.leases[input.leaseId]
        if (existing && (existing.state === 'completed' || existing.state === 'failed')) {
          return { ok: false as const, error: 'dispatch_lease_held' as const, lease: structuredClone(existing) }
        }
        if (existing && isActiveLease(existing, nowMs)) {
          return { ok: false as const, error: 'dispatch_lease_held' as const, lease: structuredClone(existing) }
        }
        const ttlMs = sanitizeTtlMs(input.ttlMs)
        const lease: AiPlayerRuntimeModelDispatchLease = {
          leaseId: input.leaseId,
          ownerId: input.ownerId,
          aiPlayerId: input.aiPlayerId,
          lane: input.lane,
          provider: input.provider,
          model: input.model,
          keyFingerprint: input.keyFingerprint,
          state: 'queued',
          claimedAt: nowIso(nowMs),
          heartbeatAt: nowIso(nowMs),
          expiresAt: nowIso(nowMs + ttlMs),
        }
        data.leases[input.leaseId] = lease
        return { ok: true as const, lease: structuredClone(lease), reclaimedExpired: Boolean(existing && existing.state === 'expired') }
      })
    },
    heartbeatLease(input) {
      const nowMs = input.nowMs ?? Date.now()
      return transact((data) => {
        expireLeases(data, nowMs)
        const lease = data.leases[input.leaseId]
        if (!lease) {
          return { ok: false as const, error: 'dispatch_lease_not_found' as const }
        }
        if (lease.ownerId !== input.ownerId) {
          return { ok: false as const, error: 'dispatch_lease_not_owned' as const }
        }
        if (!isActiveLease(lease, nowMs)) {
          return { ok: false as const, error: 'dispatch_lease_expired' as const }
        }
        lease.state = input.state ?? lease.state
        lease.heartbeatAt = nowIso(nowMs)
        lease.expiresAt = nowIso(nowMs + sanitizeTtlMs(input.ttlMs))
        return { ok: true as const, lease: structuredClone(lease) }
      })
    },
    completeLease(input) {
      const nowMs = input.nowMs ?? Date.now()
      return transact((data) => {
        const lease = data.leases[input.leaseId]
        if (!lease) return { ok: false as const, error: 'dispatch_lease_not_found' }
        if (lease.ownerId !== input.ownerId) return { ok: false as const, error: 'dispatch_lease_not_owned' }
        lease.state = 'completed'
        lease.completedAt = nowIso(nowMs)
        return { ok: true as const, lease: structuredClone(lease) }
      })
    },
    failLease(input) {
      const nowMs = input.nowMs ?? Date.now()
      return transact((data) => {
        const lease = data.leases[input.leaseId]
        if (!lease) return { ok: false as const, error: 'dispatch_lease_not_found' }
        if (lease.ownerId !== input.ownerId) return { ok: false as const, error: 'dispatch_lease_not_owned' }
        lease.state = 'failed'
        lease.failedAt = nowIso(nowMs)
        lease.failureReason = input.reason
        return { ok: true as const, lease: structuredClone(lease) }
      })
    },
    reserveRateBucket(input) {
      if (input.limit === null) {
        return { ok: true, bucket: null }
      }
      const nowMs = input.nowMs ?? Date.now()
      const windowMs = sanitizeWindowMs(input.windowMs)
      const bucketKey = buildRateBucketKey(input)
      return transact((data) => {
        const existing = data.rateBuckets[bucketKey]
        const resetExisting = !existing || Date.parse(existing.resetAt) <= nowMs || existing.limit !== input.limit || existing.windowMs !== windowMs
        const bucket = resetExisting
          ? {
              bucketKey,
              provider: input.provider,
              model: input.model,
              keyFingerprint: input.keyFingerprint,
              limit: input.limit ?? 0,
              windowMs,
              windowStartedAt: nowIso(nowMs),
              resetAt: nowIso(nowMs + windowMs),
              usedRequests: 0,
            }
          : existing
        if (bucket.usedRequests >= bucket.limit) {
          data.rateBuckets[bucketKey] = bucket
          return { ok: false as const, error: 'model_provider_rate_bucket_exhausted' as const, bucket: structuredClone(bucket) }
        }
        bucket.usedRequests += 1
        data.rateBuckets[bucketKey] = bucket
        return { ok: true as const, bucket: structuredClone(bucket) }
      })
    },
    enqueueJob(input) {
      const nowMs = input.nowMs ?? Date.now()
      return transact((data) => {
        expireQueueJobs(data, nowMs)
        const mergeKey = input.mergeKey?.trim() || null
        if (mergeKey) {
          const existing = Object.values(data.queueJobs)
            .filter((job) => job.mergeKey === mergeKey && (job.state === 'pending' || job.state === 'active'))
            .sort(sortQueueJobsForClaim)[0]
          if (existing) {
            return {
              ok: true as const,
              job: structuredClone(existing),
              mergedExisting: true,
            }
          }
        }
        const ttlMs = sanitizeTtlMs(input.ttlMs)
        const throttleMs = input.throttleMs && Number.isFinite(input.throttleMs)
          ? Math.max(0, Math.min(3_600_000, Math.trunc(input.throttleMs)))
          : 0
        const lastTerminal = mergeKey
          ? Object.values(data.queueJobs)
            .filter((job) => job.mergeKey === mergeKey && (job.state === 'completed' || job.state === 'failed' || job.state === 'expired'))
            .sort((left, right) => terminalJobTimeMs(right) - terminalJobTimeMs(left))[0]
          : null
        const throttledAvailableAtMs = lastTerminal && throttleMs > 0
          ? terminalJobTimeMs(lastTerminal) + throttleMs
          : null
        const availableAtMs = Math.max(input.availableAtMs ?? nowMs, throttledAvailableAtMs ?? nowMs)
        const job: AiPlayerRuntimeModelDispatchQueueJob = {
          jobId: input.jobId,
          leaseId: input.leaseId,
          ownerId: input.ownerId,
          aiPlayerId: input.aiPlayerId,
          lane: input.lane,
          priority: Math.max(-1_000, Math.min(1_000, Math.trunc(input.priority))),
          provider: input.provider,
          model: input.model,
          keyFingerprint: input.keyFingerprint,
          state: 'pending',
          enqueuedAt: nowIso(nowMs),
          availableAt: nowIso(availableAtMs),
          heartbeatAt: nowIso(nowMs),
          expiresAt: nowIso(nowMs + ttlMs),
          mergeKey,
        }
        data.queueJobs[input.jobId] = job
        const throttledUntil = availableAtMs > nowMs ? nowIso(availableAtMs) : undefined
        return {
          ok: true as const,
          job: structuredClone(job),
          mergedExisting: false,
          ...(throttledUntil ? { throttledUntil } : {}),
        }
      })
    },
    claimNextJob(input) {
      const nowMs = input.nowMs ?? Date.now()
      return transact((data) => {
        expireQueueJobs(data, nowMs)
        const laneSet = input.lanes && input.lanes.length > 0 ? new Set(input.lanes) : null
        const job = Object.values(data.queueJobs)
          .filter((candidate) => (!laneSet || laneSet.has(candidate.lane)) && isClaimableQueueJob(candidate, nowMs))
          .sort(sortQueueJobsForClaim)[0]
        if (!job) {
          return { ok: false as const, error: 'dispatch_queue_empty' as const }
        }
        return claimQueueJobForOwner(job, input.ownerId, input.ttlMs, nowMs)
      })
    },
    claimJob(input) {
      const nowMs = input.nowMs ?? Date.now()
      return transact((data) => {
        expireQueueJobs(data, nowMs)
        const job = data.queueJobs[input.jobId]
        if (!job) {
          return { ok: false as const, error: 'dispatch_queue_not_found' as const }
        }
        if (job.state === 'active' && Date.parse(job.expiresAt) > nowMs) {
          return { ok: false as const, error: 'dispatch_queue_held' as const }
        }
        if (!isClaimableQueueJob(job, nowMs)) {
          return { ok: false as const, error: 'dispatch_queue_not_available' as const }
        }
        return claimQueueJobForOwner(job, input.ownerId, input.ttlMs, nowMs)
      })
    },
    heartbeatJob(input) {
      const nowMs = input.nowMs ?? Date.now()
      return transact((data) => {
        expireQueueJobs(data, nowMs)
        const job = data.queueJobs[input.jobId]
        if (!job) return { ok: false as const, error: 'dispatch_queue_not_found' as const }
        if (job.ownerId !== input.ownerId) return { ok: false as const, error: 'dispatch_queue_not_owned' as const }
        if (job.state !== 'active') return { ok: false as const, error: 'dispatch_queue_not_active' as const }
        if (Date.parse(job.expiresAt) <= nowMs) return { ok: false as const, error: 'dispatch_queue_expired' as const }
        job.heartbeatAt = nowIso(nowMs)
        job.expiresAt = nowIso(nowMs + sanitizeTtlMs(input.ttlMs))
        return { ok: true as const, job: structuredClone(job) }
      })
    },
    completeJob(input) {
      const nowMs = input.nowMs ?? Date.now()
      return transact((data) => {
        const job = data.queueJobs[input.jobId]
        if (!job) return { ok: false as const, error: 'dispatch_queue_not_found' }
        if (job.ownerId !== input.ownerId) return { ok: false as const, error: 'dispatch_queue_not_owned' }
        job.state = 'completed'
        job.completedAt = nowIso(nowMs)
        job.heartbeatAt = nowIso(nowMs)
        return { ok: true as const, job: structuredClone(job) }
      })
    },
    failJob(input) {
      const nowMs = input.nowMs ?? Date.now()
      return transact((data) => {
        const job = data.queueJobs[input.jobId]
        if (!job) return { ok: false as const, error: 'dispatch_queue_not_found' }
        if (job.ownerId !== input.ownerId) return { ok: false as const, error: 'dispatch_queue_not_owned' }
        job.state = 'failed'
        job.failedAt = nowIso(nowMs)
        job.heartbeatAt = nowIso(nowMs)
        job.failureReason = input.reason
        return { ok: true as const, job: structuredClone(job) }
      })
    },
    snapshot(nowMs = Date.now()) {
      return transact((data) => {
        expireLeases(data, nowMs)
        expireQueueJobs(data, nowMs)
        return {
          leases: Object.values(data.leases).map((lease) => structuredClone(lease)),
          rateBuckets: Object.values(data.rateBuckets).map((bucket) => structuredClone(bucket)),
          queueJobs: Object.values(data.queueJobs).map((job) => structuredClone(job)),
        }
      })
    },
  }
}

type AwaitedStoreResult<K extends keyof AiPlayerRuntimeModelDispatchStore> =
  Awaited<ReturnType<AiPlayerRuntimeModelDispatchStore[K]>>

export type AiPlayerRuntimeModelAsyncDispatchStore = {
  [K in keyof AiPlayerRuntimeModelDispatchStore]: (
    ...args: Parameters<AiPlayerRuntimeModelDispatchStore[K]>
  ) => Promise<AwaitedStoreResult<K>>
}

export type AiPlayerRuntimeModelDispatchRedisClient = {
  eval: (script: string, options: { keys: string[]; arguments: string[] }) => Promise<unknown>
}

export const AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_CLIENT_PACKAGE = 'redis'

export type AiPlayerRuntimeModelDispatchPostgresClient = {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ) => Promise<{ rows: T[] }>
}

type AiPlayerRuntimeModelDispatchRedisRuntimeClient = AiPlayerRuntimeModelDispatchRedisClient & {
  connect: () => Promise<void>
  quit: () => Promise<void>
  on?: (event: 'error', listener: (error: Error) => void) => unknown
}

type AiPlayerRuntimeModelDispatchRedisModule = {
  createClient: (options: { url: string }) => AiPlayerRuntimeModelDispatchRedisRuntimeClient
}

function parseRedisOperationResult<T>(result: unknown): T {
  if (typeof result === 'string') {
    return JSON.parse(result) as T
  }
  return result as T
}

function normalizeDispatchSnapshot(input: unknown): AiPlayerRuntimeModelDispatchSnapshot {
  const record = input && typeof input === 'object' ? input as Partial<AiPlayerRuntimeModelDispatchSnapshot> : {}
  return {
    leases: Array.isArray(record.leases) ? record.leases as AiPlayerRuntimeModelDispatchLease[] : [],
    rateBuckets: Array.isArray(record.rateBuckets) ? record.rateBuckets as AiPlayerRuntimeModelDispatchRateBucket[] : [],
    queueJobs: Array.isArray(record.queueJobs) ? record.queueJobs as AiPlayerRuntimeModelDispatchQueueJob[] : [],
  }
}

function redisDispatchScript(operation: string) {
  return `
local operation = ARGV[1]
local fallback = ARGV[#ARGV]
local function decode_json(raw)
  if not raw then return nil end
  local ok, decoded = pcall(cjson.decode, raw)
  if ok then return decoded end
  return nil
end
local function encode_json(value)
  return cjson.encode(value)
end
local function is_active_lease_state(state)
  return state == 'queued' or state == 'active'
end
local function error_result(error, value_name, value)
  local result = { ok = false, error = error }
  if value_name and value then result[value_name] = value end
  return encode_json(result)
end
if operation == 'snapshot' then
  local prefix = ARGV[2]
  local now_ms = tonumber(ARGV[3])
  local leases = {}
  local rate_buckets = {}
  local queue_jobs = {}
  local lease_keys = redis.call('SMEMBERS', KEYS[1])
  for _, key in ipairs(lease_keys) do
    local lease = decode_json(redis.call('GET', key))
    if lease then
      table.insert(leases, lease)
    else
      redis.call('SREM', KEYS[1], key)
    end
  end
  local rate_keys = redis.call('SMEMBERS', KEYS[2])
  for _, key in ipairs(rate_keys) do
    local bucket = decode_json(redis.call('GET', key))
    if bucket then
      table.insert(rate_buckets, bucket)
    else
      redis.call('SREM', KEYS[2], key)
    end
  end
  local job_keys = redis.call('SMEMBERS', KEYS[3])
  for _, key in ipairs(job_keys) do
    local job = decode_json(redis.call('GET', key))
    if job then
      if job.state == 'active' and tonumber(job.expiresAtEpochMs or 0) <= now_ms then
        job.state = 'expired'
        job.failureReason = job.failureReason or 'queue_job_expired'
      end
      table.insert(queue_jobs, job)
    else
      redis.call('SREM', KEYS[3], key)
    end
  end
  return encode_json({ leases = leases, rateBuckets = rate_buckets, queueJobs = queue_jobs })
end
if operation == 'claimLease' then
  redis.call('SADD', KEYS[2], KEYS[1])
  local claimed = redis.call('SET', KEYS[1], ARGV[2], 'NX', 'PX', ARGV[3])
  if claimed then return ARGV[5] end
  local existing = redis.call('GET', KEYS[1])
  if not existing then
    redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
    return ARGV[5]
  end
  local lease = decode_json(existing)
  if lease and lease.state == 'expired' then
    redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
    return ARGV[5]
  end
  return error_result('dispatch_lease_held', 'lease', lease)
end
if operation == 'heartbeatLease' then
  local input = decode_json(ARGV[2])
  local lease = decode_json(redis.call('GET', KEYS[1]))
  if not lease then return fallback end
  if lease.ownerId ~= input.ownerId then return error_result('dispatch_lease_not_owned') end
  if not is_active_lease_state(lease.state) then return error_result('dispatch_lease_expired') end
  lease.state = input.state or lease.state
  lease.heartbeatAt = ARGV[3]
  lease.expiresAt = ARGV[4]
  redis.call('SET', KEYS[1], encode_json(lease), 'PX', ARGV[5])
  return encode_json({ ok = true, lease = lease })
end
if operation == 'completeLease' then
  local input = decode_json(ARGV[2])
  local lease = decode_json(redis.call('GET', KEYS[1]))
  if not lease then return fallback end
  if lease.ownerId ~= input.ownerId then return error_result('dispatch_lease_not_owned') end
  lease.state = 'completed'
  lease.completedAt = ARGV[3]
  redis.call('SET', KEYS[1], encode_json(lease), 'PX', ARGV[4])
  return encode_json({ ok = true, lease = lease })
end
if operation == 'failLease' then
  local input = decode_json(ARGV[2])
  local lease = decode_json(redis.call('GET', KEYS[1]))
  if not lease then return fallback end
  if lease.ownerId ~= input.ownerId then return error_result('dispatch_lease_not_owned') end
  lease.state = 'failed'
  lease.failedAt = ARGV[3]
  lease.failureReason = input.reason
  redis.call('SET', KEYS[1], encode_json(lease), 'PX', ARGV[4])
  return encode_json({ ok = true, lease = lease })
end
if operation == 'reserveRateBucket' then
  local input = decode_json(ARGV[2])
  if input.limit == nil or input.limit == cjson.null then
    return encode_json({ ok = true, bucket = cjson.null })
  end
  local now_ms = tonumber(ARGV[3])
  local window_ms = tonumber(ARGV[4])
  local existing = decode_json(redis.call('GET', KEYS[1]))
  local reset = false
  if not existing then
    reset = true
  elseif tonumber(existing.resetAtEpochMs or 0) <= now_ms then
    reset = true
  elseif tonumber(existing.limit or 0) ~= tonumber(input.limit) then
    reset = true
  elseif tonumber(existing.windowMs or 0) ~= window_ms then
    reset = true
  end
  local bucket = existing
  if reset then
    bucket = {
      bucketKey = ARGV[5],
      provider = input.provider,
      model = input.model,
      keyFingerprint = input.keyFingerprint,
      limit = input.limit,
      windowMs = window_ms,
      windowStartedAt = ARGV[6],
      resetAt = ARGV[7],
      resetAtEpochMs = now_ms + window_ms,
      usedRequests = 0
    }
  end
  if tonumber(bucket.usedRequests or 0) >= tonumber(bucket.limit or 0) then
    redis.call('SADD', KEYS[2], KEYS[1])
    redis.call('SET', KEYS[1], encode_json(bucket), 'PX', window_ms)
    return encode_json({ ok = false, error = 'model_provider_rate_bucket_exhausted', bucket = bucket })
  end
  bucket.usedRequests = tonumber(bucket.usedRequests or 0) + 1
  redis.call('SADD', KEYS[2], KEYS[1])
  redis.call('SET', KEYS[1], encode_json(bucket), 'PX', window_ms)
  return encode_json({ ok = true, bucket = bucket })
end
if operation == 'enqueueJob' then
  redis.call('SADD', KEYS[3], KEYS[1])
  redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
  redis.call('ZADD', KEYS[2], ARGV[4], ARGV[5])
  return ARGV[6]
end
if operation == 'claimNextJob' then
  local input = decode_json(ARGV[2])
  local now_ms = tonumber(ARGV[3])
  local expires_at_ms = tonumber(ARGV[4])
  local job_key_prefix = ARGV[5]
  local retention_ms = ARGV[6]
  local expired_active = redis.call('ZRANGEBYSCORE', KEYS[2], '-inf', now_ms)
  for _, job_id in ipairs(expired_active) do
    local job_key = job_key_prefix .. job_id
    local job = decode_json(redis.call('GET', job_key))
    redis.call('ZREM', KEYS[2], job_id)
    if job then
      job.state = 'expired'
      job.failureReason = job.failureReason or 'queue_job_expired'
      redis.call('SET', job_key, encode_json(job), 'PX', retention_ms)
      redis.call('ZADD', KEYS[1], tostring(job.pendingQueueScore or 0), job_id)
    end
  end
  local ids = redis.call('ZRANGE', KEYS[1], 0, 49)
  for _, job_id in ipairs(ids) do
    local job_key = job_key_prefix .. job_id
    local job = decode_json(redis.call('GET', job_key))
    if not job then
      redis.call('ZREM', KEYS[1], job_id)
    else
      local available_at = tonumber(job.availableAtEpochMs or 0)
      local lane_ok = true
      if input.lanes and #input.lanes > 0 then
        lane_ok = false
        for _, lane in ipairs(input.lanes) do
          if lane == job.lane then lane_ok = true end
        end
      end
      if lane_ok and available_at <= now_ms and (job.state == 'pending' or job.state == 'expired') then
        local reclaimed = job.state == 'expired'
        job.ownerId = input.ownerId
        job.state = 'active'
        job.claimedAt = ARGV[7]
        job.heartbeatAt = ARGV[7]
        job.expiresAt = ARGV[8]
        job.expiresAtEpochMs = expires_at_ms
        redis.call('ZREM', KEYS[1], job_id)
        redis.call('ZADD', KEYS[2], expires_at_ms, job_id)
        redis.call('SET', job_key, encode_json(job), 'PX', retention_ms)
        return encode_json({ ok = true, job = job, reclaimedExpired = reclaimed })
      end
    end
  end
  return fallback
end
if operation == 'claimJob' then
  local input = decode_json(ARGV[2])
  local now_ms = tonumber(ARGV[3])
  local expires_at_ms = tonumber(ARGV[4])
  local retention_ms = ARGV[5]
  local job = decode_json(redis.call('GET', KEYS[1]))
  if not job then return fallback end
  local available_at = tonumber(job.availableAtEpochMs or 0)
  local expired_active = job.state == 'active' and tonumber(job.expiresAtEpochMs or 0) <= now_ms
  if available_at > now_ms or not (job.state == 'pending' or job.state == 'expired' or expired_active) then
    return error_result('dispatch_queue_held')
  end
  local reclaimed = job.state == 'expired' or expired_active
  job.ownerId = input.ownerId
  job.state = 'active'
  job.claimedAt = ARGV[6]
  job.heartbeatAt = ARGV[6]
  job.expiresAt = ARGV[7]
  job.expiresAtEpochMs = expires_at_ms
  redis.call('ZREM', KEYS[2], input.jobId)
  redis.call('ZADD', KEYS[3], expires_at_ms, input.jobId)
  redis.call('SET', KEYS[1], encode_json(job), 'PX', retention_ms)
  return encode_json({ ok = true, job = job, reclaimedExpired = reclaimed })
end
if operation == 'heartbeatJob' then
  local input = decode_json(ARGV[2])
  local now_ms = tonumber(ARGV[3])
  local expires_at_ms = tonumber(ARGV[4])
  local retention_ms = ARGV[5]
  local job = decode_json(redis.call('GET', KEYS[1]))
  if not job then return fallback end
  if job.ownerId ~= input.ownerId then return error_result('dispatch_queue_not_owned') end
  if job.state ~= 'active' then return error_result('dispatch_queue_not_active') end
  if tonumber(job.expiresAtEpochMs or 0) <= now_ms then return error_result('dispatch_queue_expired') end
  job.heartbeatAt = ARGV[6]
  job.expiresAt = ARGV[7]
  job.expiresAtEpochMs = expires_at_ms
  redis.call('ZADD', KEYS[2], expires_at_ms, input.jobId)
  redis.call('SET', KEYS[1], encode_json(job), 'PX', retention_ms)
  return encode_json({ ok = true, job = job })
end
if operation == 'completeJob' then
  local input = decode_json(ARGV[2])
  local job = decode_json(redis.call('GET', KEYS[1]))
  if not job then return fallback end
  if job.ownerId ~= input.ownerId then return error_result('dispatch_queue_not_owned') end
  job.state = 'completed'
  job.completedAt = ARGV[3]
  job.heartbeatAt = ARGV[3]
  redis.call('ZREM', KEYS[2], input.jobId)
  redis.call('ZREM', KEYS[3], input.jobId)
  redis.call('SET', KEYS[1], encode_json(job), 'PX', ARGV[4])
  return encode_json({ ok = true, job = job })
end
if operation == 'failJob' then
  local input = decode_json(ARGV[2])
  local job = decode_json(redis.call('GET', KEYS[1]))
  if not job then return fallback end
  if job.ownerId ~= input.ownerId then return error_result('dispatch_queue_not_owned') end
  job.state = 'failed'
  job.failedAt = ARGV[3]
  job.heartbeatAt = ARGV[3]
  job.failureReason = input.reason
  redis.call('ZREM', KEYS[2], input.jobId)
  redis.call('ZREM', KEYS[3], input.jobId)
  redis.call('SET', KEYS[1], encode_json(job), 'PX', ARGV[4])
  return encode_json({ ok = true, job = job })
end
return ARGV[#ARGV]
-- operation: ${operation}
`
}

function redisLeaseKey(prefix: string, leaseId: string) {
  return `${prefix}:lease:${leaseId}`
}

function redisLeaseIndexKey(prefix: string) {
  return `${prefix}:index:leases`
}

function redisJobKey(prefix: string, jobId: string) {
  return `${redisJobKeyPrefix(prefix)}${jobId}`
}

function redisJobKeyPrefix(prefix: string) {
  return `${prefix}:job:`
}

function redisQueueKey(prefix: string) {
  return `${prefix}:queue:pending`
}

function redisActiveQueueKey(prefix: string) {
  return `${prefix}:queue:active`
}

function redisJobIndexKey(prefix: string) {
  return `${prefix}:index:jobs`
}

function redisRateIndexKey(prefix: string) {
  return `${prefix}:index:rates`
}

function redisJobRetentionMs() {
  return 86_400_000
}

function redisPendingQueueScore(priority: number, enqueuedAtMs: number) {
  const normalizedPriority = Math.max(-1_000, Math.min(1_000, Math.trunc(priority)))
  return String((1_000 - normalizedPriority) * 1_000_000_000_000 + (enqueuedAtMs % 1_000_000_000_000))
}

export function createAiPlayerRuntimeModelDispatchRedisStore(
  client: AiPlayerRuntimeModelDispatchRedisClient,
  options: { keyPrefix?: string } = {},
): AiPlayerRuntimeModelAsyncDispatchStore {
  const keyPrefix = options.keyPrefix?.trim() || 'ai:runtime:model:dispatch'
  const evalJson = async <T>(operation: string, keys: string[], args: unknown[], fallback: T): Promise<T> => {
    const result = await client.eval(redisDispatchScript(operation), {
      keys,
      arguments: [operation, ...args.map((arg) => typeof arg === 'string' ? arg : JSON.stringify(arg)), JSON.stringify(fallback)],
    })
    return parseRedisOperationResult<T>(result)
  }

  return {
    claimLease(input) {
      const nowMs = input.nowMs ?? Date.now()
      const ttlMs = sanitizeTtlMs(input.ttlMs)
      const lease: AiPlayerRuntimeModelDispatchLease = {
        leaseId: input.leaseId,
        ownerId: input.ownerId,
        aiPlayerId: input.aiPlayerId,
        lane: input.lane,
        provider: input.provider,
        model: input.model,
        keyFingerprint: input.keyFingerprint,
        state: 'queued',
        claimedAt: nowIso(nowMs),
        heartbeatAt: nowIso(nowMs),
        expiresAt: nowIso(nowMs + ttlMs),
      }
      return evalJson('claimLease', [redisLeaseKey(keyPrefix, input.leaseId), redisLeaseIndexKey(keyPrefix)], [lease, ttlMs, nowMs], {
        ok: true as const,
        lease,
        reclaimedExpired: false,
      })
    },
    heartbeatLease(input) {
      const nowMs = input.nowMs ?? Date.now()
      const ttlMs = sanitizeTtlMs(input.ttlMs)
      return evalJson('heartbeatLease', [redisLeaseKey(keyPrefix, input.leaseId)], [
        { ...input, nowMs },
        nowIso(nowMs),
        nowIso(nowMs + ttlMs),
        ttlMs,
      ], { ok: false as const, error: 'dispatch_lease_not_found' as const })
    },
    completeLease(input) {
      const nowMs = input.nowMs ?? Date.now()
      return evalJson('completeLease', [redisLeaseKey(keyPrefix, input.leaseId)], [
        { ...input, nowMs },
        nowIso(nowMs),
        redisJobRetentionMs(),
      ], { ok: false as const, error: 'dispatch_lease_not_found' })
    },
    failLease(input) {
      const nowMs = input.nowMs ?? Date.now()
      return evalJson('failLease', [redisLeaseKey(keyPrefix, input.leaseId)], [
        { ...input, nowMs },
        nowIso(nowMs),
        redisJobRetentionMs(),
      ], { ok: false as const, error: 'dispatch_lease_not_found' })
    },
    reserveRateBucket(input) {
      if (input.limit === null) {
        return Promise.resolve({ ok: true as const, bucket: null })
      }
      const nowMs = input.nowMs ?? Date.now()
      const windowMs = sanitizeWindowMs(input.windowMs)
      const bucketKey = buildRateBucketKey(input)
      return evalJson('reserveRateBucket', [`${keyPrefix}:rate:${bucketKey}`, redisRateIndexKey(keyPrefix)], [
        { ...input, nowMs, windowMs },
        nowMs,
        windowMs,
        bucketKey,
        nowIso(nowMs),
        nowIso(nowMs + windowMs),
      ], {
        ok: true as const,
        bucket: null,
      })
    },
    enqueueJob(input) {
      const nowMs = input.nowMs ?? Date.now()
      const ttlMs = sanitizeTtlMs(input.ttlMs)
      const availableAtMs = input.availableAtMs ?? nowMs
      const priority = Math.max(-1_000, Math.min(1_000, Math.trunc(input.priority)))
      const job: AiPlayerRuntimeModelDispatchQueueJob = {
        jobId: input.jobId,
        leaseId: input.leaseId,
        ownerId: input.ownerId,
        aiPlayerId: input.aiPlayerId,
        lane: input.lane,
        priority,
        provider: input.provider,
        model: input.model,
        keyFingerprint: input.keyFingerprint,
        state: 'pending',
        enqueuedAt: nowIso(nowMs),
        availableAt: nowIso(availableAtMs),
        heartbeatAt: nowIso(nowMs),
        expiresAt: nowIso(nowMs + ttlMs),
        mergeKey: input.mergeKey ?? null,
      }
      const redisJob = {
        ...job,
        enqueuedAtEpochMs: nowMs,
        availableAtEpochMs: availableAtMs,
        expiresAtEpochMs: nowMs + ttlMs,
        pendingQueueScore: redisPendingQueueScore(priority, nowMs),
      }
      return evalJson('enqueueJob', [redisJobKey(keyPrefix, input.jobId), redisQueueKey(keyPrefix), redisJobIndexKey(keyPrefix)], [redisJob, redisJobRetentionMs(), redisJob.pendingQueueScore, input.jobId], {
        ok: true as const,
        job,
        mergedExisting: false,
        ...(availableAtMs > nowMs ? { throttledUntil: nowIso(availableAtMs) } : {}),
      })
    },
    claimNextJob(input) {
      const nowMs = input.nowMs ?? Date.now()
      const ttlMs = sanitizeTtlMs(input.ttlMs)
      return evalJson('claimNextJob', [redisQueueKey(keyPrefix), redisActiveQueueKey(keyPrefix)], [
        { ...input, nowMs },
        nowMs,
        nowMs + ttlMs,
        redisJobKeyPrefix(keyPrefix),
        redisJobRetentionMs(),
        nowIso(nowMs),
        nowIso(nowMs + ttlMs),
      ], { ok: false as const, error: 'dispatch_queue_empty' as const })
    },
    claimJob(input) {
      const nowMs = input.nowMs ?? Date.now()
      const ttlMs = sanitizeTtlMs(input.ttlMs)
      return evalJson('claimJob', [redisJobKey(keyPrefix, input.jobId), redisQueueKey(keyPrefix), redisActiveQueueKey(keyPrefix)], [
        { ...input, nowMs },
        nowMs,
        nowMs + ttlMs,
        redisJobRetentionMs(),
        nowIso(nowMs),
        nowIso(nowMs + ttlMs),
      ], { ok: false as const, error: 'dispatch_queue_not_found' as const })
    },
    heartbeatJob(input) {
      const nowMs = input.nowMs ?? Date.now()
      const ttlMs = sanitizeTtlMs(input.ttlMs)
      return evalJson('heartbeatJob', [redisJobKey(keyPrefix, input.jobId), redisActiveQueueKey(keyPrefix)], [
        { ...input, nowMs },
        nowMs,
        nowMs + ttlMs,
        redisJobRetentionMs(),
        nowIso(nowMs),
        nowIso(nowMs + ttlMs),
      ], { ok: false as const, error: 'dispatch_queue_not_found' as const })
    },
    completeJob(input) {
      const nowMs = input.nowMs ?? Date.now()
      return evalJson('completeJob', [redisJobKey(keyPrefix, input.jobId), redisQueueKey(keyPrefix), redisActiveQueueKey(keyPrefix)], [
        { ...input, nowMs },
        nowIso(nowMs),
        redisJobRetentionMs(),
      ], { ok: false as const, error: 'dispatch_queue_not_found' })
    },
    failJob(input) {
      const nowMs = input.nowMs ?? Date.now()
      return evalJson('failJob', [redisJobKey(keyPrefix, input.jobId), redisQueueKey(keyPrefix), redisActiveQueueKey(keyPrefix)], [
        { ...input, nowMs },
        nowIso(nowMs),
        redisJobRetentionMs(),
      ], { ok: false as const, error: 'dispatch_queue_not_found' })
    },
    async snapshot(nowMs = Date.now()) {
      const snapshot = await evalJson<AiPlayerRuntimeModelDispatchSnapshot>('snapshot', [
        redisLeaseIndexKey(keyPrefix),
        redisRateIndexKey(keyPrefix),
        redisJobIndexKey(keyPrefix),
      ], [keyPrefix, nowMs], {
        leases: [],
        rateBuckets: [],
        queueJobs: [],
      })
      return normalizeDispatchSnapshot(snapshot)
    },
  }
}

async function importRedisRuntimeModule(): Promise<AiPlayerRuntimeModelDispatchRedisModule> {
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<unknown>
  let imported: unknown
  try {
    imported = await dynamicImport(AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_CLIENT_PACKAGE)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`Redis dispatch store requires npm package "${AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_CLIENT_PACKAGE}": ${detail}`)
  }
  const candidate = imported as Partial<AiPlayerRuntimeModelDispatchRedisModule>
  if (typeof candidate.createClient !== 'function') {
    throw new Error(`Redis dispatch store package "${AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_CLIENT_PACKAGE}" does not expose createClient()`)
  }
  return {
    createClient: candidate.createClient,
  }
}

export function createAiPlayerRuntimeModelDispatchRedisStoreFromUrl(
  redisUrl: string,
  options: { keyPrefix?: string } = {},
): AiPlayerRuntimeModelAsyncDispatchStore & { close: () => Promise<void> } {
  let client: AiPlayerRuntimeModelDispatchRedisRuntimeClient | null = null
  const clientPromise = importRedisRuntimeModule().then(async (redisModule) => {
    client = redisModule.createClient({ url: redisUrl })
    client.on?.('error', () => {
      // Runtime calls surface Redis command failures through their awaited operation.
    })
    await client.connect()
    return client
  })
  const store = createAiPlayerRuntimeModelDispatchRedisStore({
    eval: async (script, evalOptions) => {
      const connected = await clientPromise
      return connected.eval(script, evalOptions)
    },
  }, options)
  return {
    ...store,
    async close() {
      const connected = await clientPromise
      await connected.quit()
      client = null
    },
  }
}

function toPostgresDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString()
  }
  return typeof value === 'string' ? new Date(value).toISOString() : nowIso()
}

function mapPostgresLease(row: Record<string, unknown>): AiPlayerRuntimeModelDispatchLease {
  return {
    leaseId: String(row.lease_id),
    ownerId: String(row.owner_id),
    aiPlayerId: String(row.ai_player_id),
    lane: String(row.lane),
    provider: String(row.provider),
    model: String(row.model),
    keyFingerprint: typeof row.key_fingerprint === 'string' ? row.key_fingerprint : null,
    state: String(row.state) as AiPlayerRuntimeModelDispatchLeaseState,
    claimedAt: toPostgresDate(row.claimed_at),
    heartbeatAt: toPostgresDate(row.heartbeat_at),
    expiresAt: toPostgresDate(row.expires_at),
    completedAt: row.completed_at ? toPostgresDate(row.completed_at) : undefined,
    failedAt: row.failed_at ? toPostgresDate(row.failed_at) : undefined,
    failureReason: typeof row.failure_reason === 'string' ? row.failure_reason : undefined,
  }
}

function mapPostgresQueueJob(row: Record<string, unknown>): AiPlayerRuntimeModelDispatchQueueJob {
  return {
    jobId: String(row.job_id),
    leaseId: String(row.lease_id),
    ownerId: String(row.owner_id),
    aiPlayerId: String(row.ai_player_id),
    lane: String(row.lane),
    priority: Number(row.priority),
    provider: String(row.provider),
    model: String(row.model),
    keyFingerprint: typeof row.key_fingerprint === 'string' ? row.key_fingerprint : null,
    state: String(row.state) as AiPlayerRuntimeModelDispatchQueueJobState,
    enqueuedAt: toPostgresDate(row.enqueued_at),
    availableAt: toPostgresDate(row.available_at),
    heartbeatAt: toPostgresDate(row.heartbeat_at),
    expiresAt: toPostgresDate(row.expires_at),
    claimedAt: row.claimed_at ? toPostgresDate(row.claimed_at) : undefined,
    completedAt: row.completed_at ? toPostgresDate(row.completed_at) : undefined,
    failedAt: row.failed_at ? toPostgresDate(row.failed_at) : undefined,
    failureReason: typeof row.failure_reason === 'string' ? row.failure_reason : undefined,
    mergeKey: typeof row.merge_key === 'string' ? row.merge_key : null,
  }
}

function mapPostgresRateBucket(row: Record<string, unknown>): AiPlayerRuntimeModelDispatchRateBucket {
  return {
    bucketKey: String(row.bucket_key),
    provider: String(row.provider),
    model: String(row.model),
    keyFingerprint: typeof row.key_fingerprint === 'string' ? row.key_fingerprint : null,
    limit: Number(row.limit_count),
    windowMs: Number(row.window_ms),
    windowStartedAt: toPostgresDate(row.window_started_at),
    resetAt: toPostgresDate(row.reset_at),
    usedRequests: Number(row.used_requests),
  }
}

export const AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS ai_runtime_model_dispatch_leases (
  lease_id text PRIMARY KEY,
  owner_id text NOT NULL,
  ai_player_id text NOT NULL,
  lane text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  key_fingerprint text,
  state text NOT NULL,
  claimed_at timestamptz NOT NULL,
  heartbeat_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  completed_at timestamptz,
  failed_at timestamptz,
  failure_reason text
);

CREATE TABLE IF NOT EXISTS ai_runtime_model_dispatch_rate_buckets (
  bucket_key text PRIMARY KEY,
  provider text NOT NULL,
  model text NOT NULL,
  key_fingerprint text,
  limit_count integer NOT NULL,
  window_ms integer NOT NULL,
  window_started_at timestamptz NOT NULL,
  reset_at timestamptz NOT NULL,
  used_requests integer NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_runtime_model_dispatch_jobs (
  job_id text PRIMARY KEY,
  lease_id text NOT NULL,
  owner_id text NOT NULL,
  ai_player_id text NOT NULL,
  lane text NOT NULL,
  priority integer NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  key_fingerprint text,
  state text NOT NULL,
  enqueued_at timestamptz NOT NULL,
  available_at timestamptz NOT NULL,
  heartbeat_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  claimed_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  merge_key text
);

CREATE INDEX IF NOT EXISTS ai_runtime_model_dispatch_jobs_pending_idx
  ON ai_runtime_model_dispatch_jobs (priority DESC, enqueued_at ASC)
  WHERE state IN ('pending', 'expired');
`

export async function applyAiPlayerRuntimeModelDispatchPostgresMigration(
  client: AiPlayerRuntimeModelDispatchPostgresClient,
) {
  await client.query(AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_MIGRATION_SQL)
}

const POSTGRES_CLAIM_LEASE_SQL = `
WITH claimed AS (
  INSERT INTO ai_runtime_model_dispatch_leases (
    lease_id, owner_id, ai_player_id, lane, provider, model, key_fingerprint,
    state, claimed_at, heartbeat_at, expires_at
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, 'queued', to_timestamp($8 / 1000.0), to_timestamp($8 / 1000.0), to_timestamp($9 / 1000.0))
  ON CONFLICT (lease_id) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    ai_player_id = EXCLUDED.ai_player_id,
    lane = EXCLUDED.lane,
    provider = EXCLUDED.provider,
    model = EXCLUDED.model,
    key_fingerprint = EXCLUDED.key_fingerprint,
    state = 'queued',
    claimed_at = EXCLUDED.claimed_at,
    heartbeat_at = EXCLUDED.heartbeat_at,
    expires_at = EXCLUDED.expires_at,
    completed_at = NULL,
    failed_at = NULL,
    failure_reason = NULL
  WHERE ai_runtime_model_dispatch_leases.state IN ('queued', 'active', 'expired')
    AND ai_runtime_model_dispatch_leases.expires_at <= to_timestamp($8 / 1000.0)
  RETURNING *
)
SELECT * FROM claimed
`

export function createAiPlayerRuntimeModelDispatchPostgresStore(
  client: AiPlayerRuntimeModelDispatchPostgresClient,
): AiPlayerRuntimeModelAsyncDispatchStore {
  return {
    async claimLease(input) {
      const nowMs = input.nowMs ?? Date.now()
      const expiresAtMs = nowMs + sanitizeTtlMs(input.ttlMs)
      const result = await client.query(POSTGRES_CLAIM_LEASE_SQL, [
        input.leaseId,
        input.ownerId,
        input.aiPlayerId,
        input.lane,
        input.provider,
        input.model,
        input.keyFingerprint,
        nowMs,
        expiresAtMs,
      ])
      const row = result.rows[0]
      if (row) {
        return { ok: true as const, lease: mapPostgresLease(row), reclaimedExpired: false }
      }
      const existing = await client.query('SELECT * FROM ai_runtime_model_dispatch_leases WHERE lease_id = $1', [input.leaseId])
      return { ok: false as const, error: 'dispatch_lease_held' as const, lease: mapPostgresLease(existing.rows[0] ?? {}) }
    },
    async heartbeatLease(input) {
      const nowMs = input.nowMs ?? Date.now()
      const result = await client.query(`
UPDATE ai_runtime_model_dispatch_leases
SET state = COALESCE($4, state), heartbeat_at = to_timestamp($2 / 1000.0), expires_at = to_timestamp($3 / 1000.0)
WHERE lease_id = $1 AND owner_id = $5 AND expires_at > to_timestamp($2 / 1000.0)
RETURNING *
`, [input.leaseId, nowMs, nowMs + sanitizeTtlMs(input.ttlMs), input.state ?? null, input.ownerId])
      const row = result.rows[0]
      return row ? { ok: true as const, lease: mapPostgresLease(row) } : { ok: false as const, error: 'dispatch_lease_not_found' as const }
    },
    async completeLease(input) {
      const result = await client.query(`
UPDATE ai_runtime_model_dispatch_leases
SET state = 'completed', completed_at = to_timestamp($3 / 1000.0)
WHERE lease_id = $1 AND owner_id = $2
RETURNING *
`, [input.leaseId, input.ownerId, input.nowMs ?? Date.now()])
      const row = result.rows[0]
      return row ? { ok: true as const, lease: mapPostgresLease(row) } : { ok: false as const, error: 'dispatch_lease_not_found' }
    },
    async failLease(input) {
      const result = await client.query(`
UPDATE ai_runtime_model_dispatch_leases
SET state = 'failed', failed_at = to_timestamp($3 / 1000.0), failure_reason = $4
WHERE lease_id = $1 AND owner_id = $2
RETURNING *
`, [input.leaseId, input.ownerId, input.nowMs ?? Date.now(), input.reason])
      const row = result.rows[0]
      return row ? { ok: true as const, lease: mapPostgresLease(row) } : { ok: false as const, error: 'dispatch_lease_not_found' }
    },
    async reserveRateBucket(input) {
      if (input.limit === null) {
        return { ok: true as const, bucket: null }
      }
      const nowMs = input.nowMs ?? Date.now()
      const windowMs = sanitizeWindowMs(input.windowMs)
      const bucketKey = buildRateBucketKey(input)
      const result = await client.query(`
WITH upserted AS (
  INSERT INTO ai_runtime_model_dispatch_rate_buckets (
    bucket_key, provider, model, key_fingerprint, limit_count, window_ms,
    window_started_at, reset_at, used_requests
  )
  VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0), to_timestamp($8 / 1000.0), 1)
  ON CONFLICT (bucket_key) DO UPDATE SET
    provider = EXCLUDED.provider,
    model = EXCLUDED.model,
    key_fingerprint = EXCLUDED.key_fingerprint,
    limit_count = EXCLUDED.limit_count,
    window_ms = EXCLUDED.window_ms,
    window_started_at = CASE
      WHEN ai_runtime_model_dispatch_rate_buckets.reset_at <= to_timestamp($7 / 1000.0)
        OR ai_runtime_model_dispatch_rate_buckets.limit_count <> EXCLUDED.limit_count
        OR ai_runtime_model_dispatch_rate_buckets.window_ms <> EXCLUDED.window_ms
      THEN EXCLUDED.window_started_at
      ELSE ai_runtime_model_dispatch_rate_buckets.window_started_at
    END,
    reset_at = CASE
      WHEN ai_runtime_model_dispatch_rate_buckets.reset_at <= to_timestamp($7 / 1000.0)
        OR ai_runtime_model_dispatch_rate_buckets.limit_count <> EXCLUDED.limit_count
        OR ai_runtime_model_dispatch_rate_buckets.window_ms <> EXCLUDED.window_ms
      THEN EXCLUDED.reset_at
      ELSE ai_runtime_model_dispatch_rate_buckets.reset_at
    END,
    used_requests = CASE
      WHEN ai_runtime_model_dispatch_rate_buckets.reset_at <= to_timestamp($7 / 1000.0)
        OR ai_runtime_model_dispatch_rate_buckets.limit_count <> EXCLUDED.limit_count
        OR ai_runtime_model_dispatch_rate_buckets.window_ms <> EXCLUDED.window_ms
      THEN 1
      ELSE ai_runtime_model_dispatch_rate_buckets.used_requests + 1
    END
  WHERE ai_runtime_model_dispatch_rate_buckets.reset_at <= to_timestamp($7 / 1000.0)
    OR ai_runtime_model_dispatch_rate_buckets.used_requests < ai_runtime_model_dispatch_rate_buckets.limit_count
    OR ai_runtime_model_dispatch_rate_buckets.limit_count <> EXCLUDED.limit_count
    OR ai_runtime_model_dispatch_rate_buckets.window_ms <> EXCLUDED.window_ms
  RETURNING *
)
SELECT * FROM upserted
`, [bucketKey, input.provider, input.model, input.keyFingerprint, input.limit, windowMs, nowMs, nowMs + windowMs])
      const row = result.rows[0]
      if (row) {
        return { ok: true as const, bucket: mapPostgresRateBucket(row) }
      }
      return {
        ok: false as const,
        error: 'model_provider_rate_bucket_exhausted' as const,
        bucket: {
          bucketKey,
          provider: input.provider,
          model: input.model,
          keyFingerprint: input.keyFingerprint,
          limit: input.limit,
          windowMs,
          windowStartedAt: nowIso(nowMs),
          resetAt: nowIso(nowMs + windowMs),
          usedRequests: input.limit,
        },
      }
    },
    async enqueueJob(input) {
      const nowMs = input.nowMs ?? Date.now()
      const ttlMs = sanitizeTtlMs(input.ttlMs)
      const availableAtMs = input.availableAtMs ?? nowMs
      const result = await client.query(`
INSERT INTO ai_runtime_model_dispatch_jobs (
  job_id, lease_id, owner_id, ai_player_id, lane, priority, provider, model, key_fingerprint,
  state, enqueued_at, available_at, heartbeat_at, expires_at, merge_key
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', to_timestamp($10 / 1000.0), to_timestamp($11 / 1000.0), to_timestamp($10 / 1000.0), to_timestamp($12 / 1000.0), $13)
ON CONFLICT (job_id) DO UPDATE SET
  owner_id = EXCLUDED.owner_id,
  state = 'pending',
  available_at = EXCLUDED.available_at,
  heartbeat_at = EXCLUDED.heartbeat_at,
  expires_at = EXCLUDED.expires_at,
  failure_reason = NULL
RETURNING *
`, [
        input.jobId,
        input.leaseId,
        input.ownerId,
        input.aiPlayerId,
        input.lane,
        input.priority,
        input.provider,
        input.model,
        input.keyFingerprint,
        nowMs,
        availableAtMs,
        nowMs + ttlMs,
        input.mergeKey ?? null,
      ])
      const job = mapPostgresQueueJob(result.rows[0] ?? {})
      return {
        ok: true as const,
        job,
        mergedExisting: false,
        ...(availableAtMs > nowMs ? { throttledUntil: nowIso(availableAtMs) } : {}),
      }
    },
    async claimNextJob(input) {
      const nowMs = input.nowMs ?? Date.now()
      const result = await client.query(`
WITH candidate AS (
  SELECT job_id,
    (state = 'expired' OR (state = 'active' AND expires_at <= to_timestamp($1 / 1000.0))) AS reclaimed_expired
  FROM ai_runtime_model_dispatch_jobs
  WHERE available_at <= to_timestamp($1 / 1000.0)
    AND (
      state IN ('pending', 'expired')
      OR (state = 'active' AND expires_at <= to_timestamp($1 / 1000.0))
    )
  ORDER BY priority DESC, enqueued_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE ai_runtime_model_dispatch_jobs
SET state = 'active', owner_id = $2, heartbeat_at = to_timestamp($1 / 1000.0), expires_at = to_timestamp($3 / 1000.0)
FROM candidate
WHERE ai_runtime_model_dispatch_jobs.job_id = candidate.job_id
RETURNING ai_runtime_model_dispatch_jobs.*, candidate.reclaimed_expired
`, [nowMs, input.ownerId, nowMs + sanitizeTtlMs(input.ttlMs)])
      const row = result.rows[0]
      return row
        ? { ok: true as const, job: mapPostgresQueueJob(row), reclaimedExpired: Boolean(row.reclaimed_expired) }
        : { ok: false as const, error: 'dispatch_queue_empty' as const }
    },
    async claimJob(input) {
      const nowMs = input.nowMs ?? Date.now()
      const result = await client.query(`
WITH candidate AS (
  SELECT job_id,
    (state = 'expired' OR (state = 'active' AND expires_at <= to_timestamp($3 / 1000.0))) AS reclaimed_expired
  FROM ai_runtime_model_dispatch_jobs
  WHERE job_id = $1
    AND available_at <= to_timestamp($3 / 1000.0)
    AND (state IN ('pending', 'expired') OR expires_at <= to_timestamp($3 / 1000.0))
  FOR UPDATE
)
UPDATE ai_runtime_model_dispatch_jobs
SET state = 'active', owner_id = $2, heartbeat_at = to_timestamp($3 / 1000.0), expires_at = to_timestamp($4 / 1000.0)
FROM candidate
WHERE ai_runtime_model_dispatch_jobs.job_id = candidate.job_id
RETURNING ai_runtime_model_dispatch_jobs.*, candidate.reclaimed_expired
`, [input.jobId, input.ownerId, nowMs, nowMs + sanitizeTtlMs(input.ttlMs)])
      const row = result.rows[0]
      return row
        ? { ok: true as const, job: mapPostgresQueueJob(row), reclaimedExpired: Boolean(row.reclaimed_expired) }
        : { ok: false as const, error: 'dispatch_queue_not_found' as const }
    },
    async heartbeatJob(input) {
      const nowMs = input.nowMs ?? Date.now()
      const result = await client.query(`
UPDATE ai_runtime_model_dispatch_jobs
SET heartbeat_at = to_timestamp($3 / 1000.0), expires_at = to_timestamp($4 / 1000.0)
WHERE job_id = $1 AND owner_id = $2 AND state = 'active' AND expires_at > to_timestamp($3 / 1000.0)
RETURNING *
`, [input.jobId, input.ownerId, nowMs, nowMs + sanitizeTtlMs(input.ttlMs)])
      const row = result.rows[0]
      return row ? { ok: true as const, job: mapPostgresQueueJob(row) } : { ok: false as const, error: 'dispatch_queue_not_found' as const }
    },
    async completeJob(input) {
      const result = await client.query(`
UPDATE ai_runtime_model_dispatch_jobs
SET state = 'completed', completed_at = to_timestamp($3 / 1000.0), heartbeat_at = to_timestamp($3 / 1000.0)
WHERE job_id = $1 AND owner_id = $2
RETURNING *
`, [input.jobId, input.ownerId, input.nowMs ?? Date.now()])
      const row = result.rows[0]
      return row ? { ok: true as const, job: mapPostgresQueueJob(row) } : { ok: false as const, error: 'dispatch_queue_not_found' }
    },
    async failJob(input) {
      const result = await client.query(`
UPDATE ai_runtime_model_dispatch_jobs
SET state = 'failed', failed_at = to_timestamp($3 / 1000.0), heartbeat_at = to_timestamp($3 / 1000.0), failure_reason = $4
WHERE job_id = $1 AND owner_id = $2
RETURNING *
`, [input.jobId, input.ownerId, input.nowMs ?? Date.now(), input.reason])
      const row = result.rows[0]
      return row ? { ok: true as const, job: mapPostgresQueueJob(row) } : { ok: false as const, error: 'dispatch_queue_not_found' }
    },
    async snapshot(nowMs = Date.now()) {
      await client.query(`
UPDATE ai_runtime_model_dispatch_leases
SET state = 'expired', failure_reason = COALESCE(failure_reason, 'lease_expired')
WHERE state IN ('queued', 'active') AND expires_at <= to_timestamp($1 / 1000.0)
`, [nowMs])
      await client.query(`
UPDATE ai_runtime_model_dispatch_jobs
SET state = 'expired', failure_reason = COALESCE(failure_reason, 'queue_job_expired')
WHERE state = 'active' AND expires_at <= to_timestamp($1 / 1000.0)
`, [nowMs])
      const leases = await client.query('SELECT * FROM ai_runtime_model_dispatch_leases ORDER BY claimed_at DESC LIMIT 500')
      const rateBuckets = await client.query('SELECT * FROM ai_runtime_model_dispatch_rate_buckets ORDER BY reset_at DESC LIMIT 500')
      const queueJobs = await client.query('SELECT * FROM ai_runtime_model_dispatch_jobs ORDER BY priority DESC, enqueued_at ASC LIMIT 500')
      return {
        leases: leases.rows.map(mapPostgresLease),
        rateBuckets: rateBuckets.rows.map(mapPostgresRateBucket),
        queueJobs: queueJobs.rows.map(mapPostgresQueueJob),
      }
    },
  }
}
