import type { AiPlayerActionProposalRequest } from '../../../../shared/contracts/aiPlayer'
import { createHash } from 'node:crypto'
import pg from 'pg'
import type {
  AiPlayerProviderAccountPoolCandidate,
  AiPlayerProviderRequestQueueStatus,
} from '../../../../shared/contracts/aiPlayerProviderAccount'
import {
  renderAiPlayerRuntimeSystemPrompt,
  type AiPlayerRuntimePromptContextDocument,
} from '../../../../shared/contracts/aiPlayerRuntimePrompt'
import {
  aiPlayerActionProposalRequestSchema,
} from '../../../../shared/schemas/aiPlayer'
import {
  parseAiPlayerRuntimeModelOutput,
  type AiPlayerRuntimeModelOutput,
} from '../../../../shared/schemas/aiPlayerRuntimePrompt'
import type { ResolvedPlannerTarget } from '../../config/modelGateway'
import {
  createAiPlayerRuntimeModelDispatchPostgresStore,
  createAiPlayerRuntimeModelDispatchRedisStoreFromUrl,
  createAiPlayerRuntimeModelDispatchStore,
  type AiPlayerRuntimeModelAsyncDispatchStore,
  type AiPlayerRuntimeModelDispatchLease,
  type AiPlayerRuntimeModelDispatchRateBucket,
  type AiPlayerRuntimeModelDispatchStore,
} from './aiPlayerRuntimeModelDispatchStore'
import type {
  AiPlayerRuntimeModelTargetCandidate,
  AiPlayerRuntimeModelTargetFailure,
} from './aiPlayerRuntimeModelTarget'
import { getAiPlayerProviderAccountPoolDispatchGate } from './aiPlayerProviderAccountStore'
import {
  estimateAiPlayerRuntimeProposalTokensByProviderModelProfile,
  normalizeAiPlayerRuntimeProposalTokenEstimate,
  type AiPlayerRuntimeProposalPreflightTokenEstimate,
  type AiPlayerRuntimeProposalPreflightTokenEstimator,
} from './aiPlayerRuntimeProposalTokenEstimator'

export type AiPlayerRuntimeProposalObservation = {
  aiPlayerId: string
  runtime: unknown
  chatCommand?: unknown
  requestContext?: {
    queueLane?: string
    queuePriority?: number
  }
  world?: unknown
  chatSummary?: unknown
  recentChat?: unknown[]
  receipts?: unknown[]
  failures?: unknown[]
}

export type AiPlayerRuntimeProposalModelMessage = {
  role: 'system' | 'user'
  content: string
}

export type AiPlayerRuntimeProposalModelRequest = {
  target: ResolvedPlannerTarget
  observation: AiPlayerRuntimeProposalObservation
  fetchImpl?: typeof fetch
}

export type AiPlayerRuntimeProposalCandidateRequest = {
  candidates: AiPlayerRuntimeModelTargetCandidate[]
  observation: AiPlayerRuntimeProposalObservation
  fetchImpl?: typeof fetch
  reserveCandidateAttempt?: (
    candidate: AiPlayerRuntimeModelTargetCandidate,
    preflight: AiPlayerRuntimeProposalPreflight,
  ) => Promise<AiPlayerRuntimeProposalBudgetReservationResult> | AiPlayerRuntimeProposalBudgetReservationResult
  commitCandidateAttempt?: (
    candidate: AiPlayerRuntimeModelTargetCandidate,
    result: ModelProposalResult,
    reservation: AiPlayerRuntimeProposalBudgetReservation | null,
  ) => Promise<void> | void
  preflightTokenEstimator?: AiPlayerRuntimeProposalPreflightTokenEstimator
}

export type AiPlayerRuntimeProposalSelectedProvider = {
  model: string
  provider: string
  keyFingerprint?: string | null
  source: AiPlayerRuntimeModelTargetCandidate['source']
  byokSource: AiPlayerRuntimeModelTargetCandidate['byokSource']
  priority: number
}

export type AiPlayerRuntimeProposalBudgetReservation = {
  reservationId?: string
  budgetWindowKey?: string
  limitMode?: 'unlimited' | 'configured' | 'disabled'
  aiCommandCreditReservationId?: string
  aiCommandCreditReservedCredits?: number
}

export type AiPlayerRuntimeProposalBudgetReservationResult =
  | ({ ok: true } & AiPlayerRuntimeProposalBudgetReservation)
  | ({ ok: false; error: string } & AiPlayerRuntimeProposalBudgetReservation)

export type AiPlayerRuntimeProposalPreflight = AiPlayerRuntimeProposalPreflightTokenEstimate

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown
    }
  }>
  usage?: unknown
  model?: unknown
}

const AUTH_RETRY_STATUSES = new Set([401, 403])
const DEFAULT_MODEL_REQUEST_MAX_CONCURRENCY = 4
const DEFAULT_MODEL_REQUEST_QUEUE_LIMIT = 64
const MODEL_REQUEST_MAX_COMPLETION_TOKENS = 800
const MODEL_REQUEST_MAX_CONCURRENCY_ENV = 'AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY'
const MODEL_REQUEST_QUEUE_LIMIT_ENV = 'AI_PLAYER_RUNTIME_MODEL_QUEUE_LIMIT'
const MODEL_REQUEST_TIMEOUT_MS_ENV = 'AI_PLAYER_RUNTIME_MODEL_REQUEST_TIMEOUT_MS'
const MODEL_DISPATCH_STORE_PATH_ENV = 'AI_PLAYER_RUNTIME_MODEL_DISPATCH_STORE_PATH'
const MODEL_DISPATCH_POSTGRES_DATABASE_URL_ENV = 'AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_DATABASE_URL'
const MODEL_DISPATCH_REDIS_URL_ENV = 'AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_URL'
const MODEL_DISPATCH_REDIS_KEY_PREFIX_ENV = 'AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_KEY_PREFIX'
const MODEL_DISPATCH_OWNER_ID_ENV = 'AI_PLAYER_RUNTIME_MODEL_DISPATCH_OWNER_ID'
const MODEL_BACKGROUND_PATROL_THROTTLE_MS_ENV = 'AI_PLAYER_RUNTIME_MODEL_BACKGROUND_PATROL_THROTTLE_MS'

type ModelRequestQueueTask<T> = {
  run: () => Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
  metadata: ModelRequestQueueMetadata
}

type ModelRequestQueueMetadata = {
  aiPlayerId: string
  jobId: string
  leaseId: string
  lane: string
  priority: number
  provider: string
  model: string
  keyFingerprint: string | null
  enqueuedAtMs: number
  leaseExpiresAtMs: number | null
  sequence: number
}

type ModelRequestLaneStats = {
  lane: string
  priority: number
  activeRequests: number
  totalStartedRequests: number
  totalCompletedRequests: number
  totalRejectedRequests: number
  totalWaitMs: number
  waitSampleCount: number
  waitSamplesMs: number[]
}

type ModelRequestEndpointStats = {
  provider: string
  model: string
  keyFingerprint: string | null
  activeRequests: number
  totalStartedRequests: number
  totalCompletedRequests: number
  totalRejectedRequests: number
  totalFailedRequests: number
  totalRateLimitedRequests: number
  totalLatencyMs: number
  latencySampleCount: number
  latencySamplesMs: number[]
  consecutiveFailures: number
  backoffUntilMs: number | null
  requestStartedAtMs: number[]
  lastStartedAt: string | null
  lastCompletedAt: string | null
  lastSuccessAt: string | null
  lastFailureAt: string | null
}

const modelRequestQueue: ModelRequestQueueTask<unknown>[] = []
let activeModelRequestCount = 0
let modelRequestQueueSequence = 0
const activeModelRequestLeases = new Map<number, ModelRequestQueueMetadata>()
const modelRequestQueueStats = {
  totalStartedRequests: 0,
  totalCompletedRequests: 0,
  totalRejectedRequests: 0,
  lastStartedAt: null as string | null,
  lastCompletedAt: null as string | null,
  lastRejectedAt: null as string | null,
}
const modelRequestLaneStats = new Map<string, ModelRequestLaneStats>()
const modelRequestEndpointStats = new Map<string, ModelRequestEndpointStats>()
type ModelDispatchStoreLike = AiPlayerRuntimeModelDispatchStore | AiPlayerRuntimeModelAsyncDispatchStore

let modelDispatchStore: ModelDispatchStoreLike | null = null
let modelDispatchStorePath: string | null = null
let modelDispatchPostgresUrl: string | null = null
let modelDispatchRedisUrl: string | null = null
let modelDispatchRedisKeyPrefix: string | null = null
let modelDispatchPostgresPool: pg.Pool | null = null

function readModelDispatchStorePath(): string | null {
  const normalized = process.env[MODEL_DISPATCH_STORE_PATH_ENV]?.trim()
  return normalized || null
}

function readModelDispatchPostgresUrl(): string | null {
  const normalized = process.env[MODEL_DISPATCH_POSTGRES_DATABASE_URL_ENV]?.trim()
  return normalized || null
}

function readModelDispatchRedisUrl(): string | null {
  const normalized = process.env[MODEL_DISPATCH_REDIS_URL_ENV]?.trim() || process.env.REDIS_URL?.trim()
  return normalized || null
}

function readModelDispatchRedisKeyPrefix(): string | null {
  const normalized = process.env[MODEL_DISPATCH_REDIS_KEY_PREFIX_ENV]?.trim()
  return normalized || null
}

function readModelDispatchOwnerId() {
  return process.env[MODEL_DISPATCH_OWNER_ID_ENV]?.trim() || `process:${process.pid}`
}

function getModelDispatchStore() {
  const postgresUrl = readModelDispatchPostgresUrl()
  if (postgresUrl) {
    if (!modelDispatchStore || postgresUrl !== modelDispatchPostgresUrl) {
      modelDispatchPostgresPool = new pg.Pool({
        connectionString: postgresUrl,
        application_name: 'ai-player-runtime-model-dispatch',
      })
      modelDispatchStore = createAiPlayerRuntimeModelDispatchPostgresStore(modelDispatchPostgresPool)
      modelDispatchPostgresUrl = postgresUrl
      modelDispatchRedisUrl = null
      modelDispatchStorePath = null
    }
    return modelDispatchStore
  }
  const redisUrl = readModelDispatchRedisUrl()
  if (redisUrl) {
    const redisKeyPrefix = readModelDispatchRedisKeyPrefix()
    if (!modelDispatchStore || redisUrl !== modelDispatchRedisUrl || redisKeyPrefix !== modelDispatchRedisKeyPrefix) {
      modelDispatchStore = createAiPlayerRuntimeModelDispatchRedisStoreFromUrl(redisUrl, {
        keyPrefix: redisKeyPrefix ?? undefined,
      })
      modelDispatchRedisUrl = redisUrl
      modelDispatchRedisKeyPrefix = redisKeyPrefix
      modelDispatchPostgresUrl = null
      modelDispatchStorePath = null
    }
    return modelDispatchStore
  }
  const storePath = readModelDispatchStorePath()
  if (!modelDispatchStore || storePath !== modelDispatchStorePath) {
    modelDispatchStore = createAiPlayerRuntimeModelDispatchStore({ storePath })
    modelDispatchStorePath = storePath
    modelDispatchPostgresUrl = null
    modelDispatchRedisUrl = null
  }
  return modelDispatchStore
}

export function resetAiPlayerRuntimeModelDispatchStoreForTest() {
  const closeableStore = modelDispatchStore as ({ close?: () => Promise<void> } | null)
  void closeableStore?.close?.()
  void modelDispatchPostgresPool?.end()
  modelDispatchPostgresPool = null
  modelDispatchStore = null
  modelDispatchStorePath = null
  modelDispatchPostgresUrl = null
  modelDispatchRedisUrl = null
  modelDispatchRedisKeyPrefix = null
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return Boolean(value && typeof value === 'object' && 'then' in value && typeof (value as { then?: unknown }).then === 'function')
}

function readModelRequestMaxConcurrency(): number {
  const parsed = Number(process.env[MODEL_REQUEST_MAX_CONCURRENCY_ENV] ?? DEFAULT_MODEL_REQUEST_MAX_CONCURRENCY)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_MODEL_REQUEST_MAX_CONCURRENCY
  }
  return Math.max(1, Math.min(32, Math.trunc(parsed)))
}

function readModelRequestQueueLimit(): number {
  const parsed = Number(process.env[MODEL_REQUEST_QUEUE_LIMIT_ENV] ?? DEFAULT_MODEL_REQUEST_QUEUE_LIMIT)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_MODEL_REQUEST_QUEUE_LIMIT
  }
  return Math.max(0, Math.min(10_000, Math.trunc(parsed)))
}

function readModelRequestTimeoutMs(): number {
  const parsed = Number(process.env[MODEL_REQUEST_TIMEOUT_MS_ENV] ?? 60_000)
  if (!Number.isFinite(parsed)) {
    return 60_000
  }
  return Math.max(1_000, Math.min(600_000, Math.trunc(parsed)))
}

function readModelRateLimitBackoffMs(): number {
  const parsed = Number(process.env.AI_PLAYER_RUNTIME_MODEL_RATE_LIMIT_BACKOFF_MS ?? 30_000)
  if (!Number.isFinite(parsed)) {
    return 30_000
  }
  return Math.max(1_000, Math.min(3_600_000, Math.trunc(parsed)))
}

function readModelCircuitFailureThreshold(): number {
  const parsed = Number(process.env.AI_PLAYER_RUNTIME_MODEL_CIRCUIT_FAILURE_THRESHOLD ?? 3)
  if (!Number.isFinite(parsed)) {
    return 3
  }
  return Math.max(1, Math.min(100, Math.trunc(parsed)))
}

function readModelCircuitBackoffMs(): number {
  const parsed = Number(process.env.AI_PLAYER_RUNTIME_MODEL_CIRCUIT_BACKOFF_MS ?? 60_000)
  if (!Number.isFinite(parsed)) {
    return 60_000
  }
  return Math.max(1_000, Math.min(3_600_000, Math.trunc(parsed)))
}

function readModelRequestLeaseTtlMs(): number {
  const parsed = Number(process.env.AI_PLAYER_RUNTIME_MODEL_REQUEST_LEASE_TTL_MS ?? 300_000)
  if (!Number.isFinite(parsed)) {
    return 300_000
  }
  return Math.max(1_000, Math.min(3_600_000, Math.trunc(parsed)))
}

function readModelRateBucketLimit(): number | null {
  const raw = process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_REQUESTS
  if (raw === undefined || raw.trim() === '') {
    return null
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }
  return Math.max(1, Math.min(100_000, Math.trunc(parsed)))
}

function readModelRateBucketWindowMs(): number {
  const parsed = Number(process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_WINDOW_MS ?? 60_000)
  if (!Number.isFinite(parsed)) {
    return 60_000
  }
  return Math.max(1_000, Math.min(3_600_000, Math.trunc(parsed)))
}

function readModelBackgroundPatrolThrottleMs(): number {
  const parsed = Number(process.env[MODEL_BACKGROUND_PATROL_THROTTLE_MS_ENV] ?? 0)
  if (!Number.isFinite(parsed)) {
    return 0
  }
  return Math.max(0, Math.min(3_600_000, Math.trunc(parsed)))
}

export function getAiPlayerRuntimeModelRequestQueueStatus(): AiPlayerProviderRequestQueueStatus {
  const nowMs = Date.now()
  const dispatchSnapshotResult = getModelDispatchStore().snapshot(nowMs)
  const dispatchSnapshot = isPromiseLike(dispatchSnapshotResult)
    ? { leases: [], rateBuckets: [], queueJobs: [] }
    : dispatchSnapshotResult
  return buildAiPlayerRuntimeModelRequestQueueStatus(nowMs, dispatchSnapshot)
}

export async function getAiPlayerRuntimeModelRequestQueueStatusAsync(): Promise<AiPlayerProviderRequestQueueStatus> {
  const nowMs = Date.now()
  const dispatchSnapshot = await getModelDispatchStore().snapshot(nowMs)
  return buildAiPlayerRuntimeModelRequestQueueStatus(nowMs, dispatchSnapshot)
}

function buildAiPlayerRuntimeModelRequestQueueStatus(
  nowMs: number,
  dispatchSnapshot: {
    leases: AiPlayerRuntimeModelDispatchLease[]
    rateBuckets: AiPlayerRuntimeModelDispatchRateBucket[]
    queueJobs: Array<{
      jobId: string
      leaseId: string
      aiPlayerId: string
      lane: string
      priority: number
      provider: string
      model: string
      keyFingerprint: string | null
      state: string
      enqueuedAt: string
      availableAt: string
      expiresAt: string
      failureReason?: string
    }>
  },
): AiPlayerProviderRequestQueueStatus {
  const maxConcurrency = readModelRequestMaxConcurrency()
  const queueLimit = readModelRequestQueueLimit()
  const rateBucketLimit = readModelRateBucketLimit()
  const rateBucketWindowMs = readModelRateBucketWindowMs()
  const dispatchRateBuckets = new Map(dispatchSnapshot.rateBuckets.map((bucket) => [bucket.bucketKey, bucket]))
  const queuedByLane = new Map<string, { count: number; oldestQueuedAtMs: number | null }>()
  const queuedByEndpoint = new Map<string, number>()
  for (const task of modelRequestQueue) {
    const lane = queuedByLane.get(task.metadata.lane) ?? { count: 0, oldestQueuedAtMs: null }
    lane.count += 1
    lane.oldestQueuedAtMs = lane.oldestQueuedAtMs === null
      ? task.metadata.enqueuedAtMs
      : Math.min(lane.oldestQueuedAtMs, task.metadata.enqueuedAtMs)
    queuedByLane.set(task.metadata.lane, lane)
    const endpointKey = buildEndpointStatsKey(task.metadata)
    queuedByEndpoint.set(endpointKey, (queuedByEndpoint.get(endpointKey) ?? 0) + 1)
  }
  const dispatchJobs = buildModelRequestJobStatuses(nowMs, dispatchSnapshot.queueJobs)
  const lanes = Array.from(modelRequestLaneStats.values())
    .map((lane) => {
      const queued = queuedByLane.get(lane.lane) ?? { count: 0, oldestQueuedAtMs: null }
      return {
        lane: lane.lane,
        priority: lane.priority,
        activeRequests: lane.activeRequests,
        queuedRequests: queued.count,
        totalStartedRequests: lane.totalStartedRequests,
        totalCompletedRequests: lane.totalCompletedRequests,
        totalRejectedRequests: lane.totalRejectedRequests,
        averageWaitMs: lane.waitSampleCount > 0 ? Math.round(lane.totalWaitMs / lane.waitSampleCount) : 0,
        p95WaitMs: percentileMs(lane.waitSamplesMs, 0.95),
        oldestQueuedAgeMs: queued.oldestQueuedAtMs === null ? null : Math.max(0, nowMs - queued.oldestQueuedAtMs),
      }
    })
    .sort((left, right) => right.priority - left.priority || left.lane.localeCompare(right.lane))
  const endpoints = Array.from(modelRequestEndpointStats.entries())
    .map(([key, endpoint]) => ({
      provider: endpoint.provider,
      model: endpoint.model,
      keyFingerprint: endpoint.keyFingerprint,
      activeRequests: endpoint.activeRequests,
      queuedRequests: queuedByEndpoint.get(key) ?? 0,
      totalStartedRequests: endpoint.totalStartedRequests,
      totalCompletedRequests: endpoint.totalCompletedRequests,
      totalRejectedRequests: endpoint.totalRejectedRequests,
      totalFailedRequests: endpoint.totalFailedRequests,
      totalRateLimitedRequests: endpoint.totalRateLimitedRequests,
      averageLatencyMs: endpoint.latencySampleCount > 0 ? Math.round(endpoint.totalLatencyMs / endpoint.latencySampleCount) : 0,
      p50LatencyMs: percentileMs(endpoint.latencySamplesMs, 0.5),
      p95LatencyMs: percentileMs(endpoint.latencySamplesMs, 0.95),
      consecutiveFailures: endpoint.consecutiveFailures,
      circuitState: endpoint.backoffUntilMs !== null && endpoint.backoffUntilMs > nowMs ? 'open' as const : 'closed' as const,
      backoffUntil: endpoint.backoffUntilMs !== null && endpoint.backoffUntilMs > nowMs
        ? new Date(endpoint.backoffUntilMs).toISOString()
        : null,
      rateBucket: buildEndpointRateBucketStatus(endpoint, rateBucketLimit, rateBucketWindowMs, nowMs, dispatchRateBuckets.get(key)),
      lastStartedAt: endpoint.lastStartedAt,
      lastCompletedAt: endpoint.lastCompletedAt,
      lastSuccessAt: endpoint.lastSuccessAt,
      lastFailureAt: endpoint.lastFailureAt,
    }))
    .sort((left, right) => left.provider.localeCompare(right.provider)
      || left.model.localeCompare(right.model)
      || String(left.keyFingerprint ?? '').localeCompare(String(right.keyFingerprint ?? '')))
  return {
    maxConcurrency,
    queueLimit,
    activeRequests: activeModelRequestCount,
    queuedRequests: modelRequestQueue.length,
    availableConcurrency: Math.max(0, maxConcurrency - activeModelRequestCount),
    remainingQueueCapacity: Math.max(0, queueLimit - modelRequestQueue.length),
    totalStartedRequests: modelRequestQueueStats.totalStartedRequests,
    totalCompletedRequests: modelRequestQueueStats.totalCompletedRequests,
    totalRejectedRequests: modelRequestQueueStats.totalRejectedRequests,
    lastStartedAt: modelRequestQueueStats.lastStartedAt,
    lastCompletedAt: modelRequestQueueStats.lastCompletedAt,
    lastRejectedAt: modelRequestQueueStats.lastRejectedAt,
    lanes,
    endpoints,
    leases: buildModelRequestLeaseStatuses(nowMs, dispatchSnapshot.leases),
    jobs: dispatchJobs,
  }
}

function percentileMs(samples: number[], percentile: number): number {
  if (samples.length === 0) {
    return 0
  }
  const sorted = [...samples].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentile) - 1))
  return Math.round(sorted[index])
}

function buildEndpointRateBucketStatus(
  endpoint: ModelRequestEndpointStats,
  limit: number | null,
  windowMs: number,
  nowMs: number,
  dispatchBucket?: AiPlayerRuntimeModelDispatchRateBucket,
) {
  if (dispatchBucket) {
    const resetAtMs = Date.parse(dispatchBucket.resetAt)
    const expired = Number.isFinite(resetAtMs) && resetAtMs <= nowMs
    const usedRequests = expired ? 0 : dispatchBucket.usedRequests
    return {
      limit: dispatchBucket.limit,
      windowMs: dispatchBucket.windowMs,
      usedRequests,
      remainingRequests: Math.max(0, dispatchBucket.limit - usedRequests),
      resetAt: expired ? null : dispatchBucket.resetAt,
    }
  }
  pruneEndpointRateBucket(endpoint, windowMs, nowMs)
  const usedRequests = endpoint.requestStartedAtMs.length
  const resetAtMs = endpoint.requestStartedAtMs.length > 0 ? endpoint.requestStartedAtMs[0] + windowMs : null
  return {
    limit,
    windowMs,
    usedRequests,
    remainingRequests: limit === null ? null : Math.max(0, limit - usedRequests),
    resetAt: resetAtMs === null ? null : new Date(resetAtMs).toISOString(),
  }
}

function buildModelRequestLeaseStatuses(
  nowMs: number,
  dispatchLeases: AiPlayerRuntimeModelDispatchLease[] = [],
) {
  const dispatchActive = dispatchLeases
    .filter((lease) => lease.state === 'queued' || lease.state === 'active')
    .map((lease) => {
      const claimedAtMs = Date.parse(lease.claimedAt)
      const state = lease.state === 'active' ? 'active' as const : 'queued' as const
      return {
        leaseId: lease.leaseId,
        aiPlayerId: lease.aiPlayerId,
        lane: lease.lane,
        provider: lease.provider,
        model: lease.model,
        keyFingerprint: lease.keyFingerprint,
        state,
        ageMs: Number.isFinite(claimedAtMs) ? Math.max(0, nowMs - claimedAtMs) : 0,
        expiresAt: lease.expiresAt,
      }
    })
  const dispatchLeaseIds = new Set(dispatchActive.map((lease) => lease.leaseId))
  const active = Array.from(activeModelRequestLeases.values())
    .filter((metadata) => !dispatchLeaseIds.has(metadata.leaseId))
    .map((metadata) => toModelRequestLeaseStatus(metadata, 'active' as const, nowMs))
  const queued = modelRequestQueue
    .filter((task) => !dispatchLeaseIds.has(task.metadata.leaseId))
    .map((task) => toModelRequestLeaseStatus(task.metadata, 'queued' as const, nowMs))
  return [...dispatchActive, ...active, ...queued].sort((left, right) => left.ageMs - right.ageMs)
}

function buildModelRequestJobStatuses(
  nowMs: number,
  dispatchJobs: Array<{
    jobId: string
    leaseId: string
    aiPlayerId: string
    lane: string
    priority: number
    provider: string
    model: string
    keyFingerprint: string | null
    state: string
    enqueuedAt: string
    availableAt: string
    expiresAt: string
    failureReason?: string
  }> = [],
) {
  return dispatchJobs
    .filter((job) => job.state === 'pending' || job.state === 'active' || job.state === 'expired')
    .map((job) => {
      const enqueuedAtMs = Date.parse(job.enqueuedAt)
      return {
        jobId: job.jobId,
        leaseId: job.leaseId,
        aiPlayerId: job.aiPlayerId,
        lane: job.lane,
        provider: job.provider,
        model: job.model,
        keyFingerprint: job.keyFingerprint,
        state: job.state as 'pending' | 'active' | 'expired',
        priority: job.priority,
        ageMs: Number.isFinite(enqueuedAtMs) ? Math.max(0, nowMs - enqueuedAtMs) : 0,
        availableAt: job.availableAt,
        expiresAt: job.expiresAt,
        ...(job.failureReason ? { failureReason: job.failureReason } : {}),
      }
    })
    .sort((left, right) => right.priority - left.priority || right.ageMs - left.ageMs)
}

function toModelRequestLeaseStatus(
  metadata: ModelRequestQueueMetadata,
  state: 'queued' | 'active',
  nowMs: number,
) {
  return {
    leaseId: metadata.leaseId,
    aiPlayerId: metadata.aiPlayerId,
    lane: metadata.lane,
    provider: metadata.provider,
    model: metadata.model,
    keyFingerprint: metadata.keyFingerprint,
    state,
    ageMs: Math.max(0, nowMs - metadata.enqueuedAtMs),
    expiresAt: metadata.leaseExpiresAtMs === null ? null : new Date(metadata.leaseExpiresAtMs).toISOString(),
  }
}

function resolveRequestContextRecord(observation: AiPlayerRuntimeProposalObservation): Record<string, unknown> {
  return observation.requestContext && typeof observation.requestContext === 'object'
    ? observation.requestContext as Record<string, unknown>
    : {}
}

function resolveModelRequestLane(observation: AiPlayerRuntimeProposalObservation): string {
  const requestContext = resolveRequestContextRecord(observation)
  const explicitLane = typeof requestContext.queueLane === 'string' ? requestContext.queueLane.trim() : ''
  if (explicitLane) {
    return explicitLane
  }
  const chatCommand = observation.chatCommand && typeof observation.chatCommand === 'object'
    ? observation.chatCommand as Record<string, unknown>
    : {}
  const body = typeof chatCommand.body === 'string' ? chatCommand.body : ''
  return body.startsWith('[autonomous patrol]') ? 'background_patrol' : 'default'
}

function resolveModelRequestPriority(observation: AiPlayerRuntimeProposalObservation, lane: string): number {
  const requestContext = resolveRequestContextRecord(observation)
  const explicitPriority = Number(requestContext.queuePriority)
  if (Number.isFinite(explicitPriority)) {
    return Math.max(-1_000, Math.min(1_000, Math.trunc(explicitPriority)))
  }
  if (lane === 'interactive_chat') {
    return 100
  }
  if (lane === 'background_patrol') {
    return 10
  }
  return 50
}

function fingerprintModelApiKey(apiKey: string): string | null {
  const normalized = apiKey.trim()
  if (!normalized) {
    return null
  }
  return `sha256:${createHash('sha256').update(normalized).digest('hex').slice(0, 16)}`
}

export function listAiPlayerRuntimeModelProviderAccountCandidates(
  candidates: AiPlayerRuntimeModelTargetCandidate[],
): AiPlayerProviderAccountPoolCandidate[] {
  return candidates.flatMap((candidate) => {
    const provider = resolveProviderLabel(candidate.target.baseUrl)
    const apiKeys = Array.from(new Set(candidate.target.apiKeys.map((apiKey) => apiKey.trim()).filter(Boolean)))
    if (apiKeys.length === 0) {
      return []
    }
    return apiKeys.map((apiKey) => ({
      provider,
      model: candidate.target.model,
      keyFingerprint: fingerprintModelApiKey(apiKey),
      source: candidate.source,
      byokSource: candidate.byokSource,
      priority: candidate.priority,
      secretConfigured: true,
      secretSource: candidate.secretSource,
      lastFailureReason: candidate.lastFailureReason,
    }))
  })
}

function getEndpointStatsForTargetApiKey(target: ResolvedPlannerTarget, apiKey: string) {
  return modelRequestEndpointStats.get(buildEndpointStatsKey({
    provider: resolveProviderLabel(target.baseUrl),
    model: target.model,
    keyFingerprint: fingerprintModelApiKey(apiKey),
  })) ?? null
}

function countQueuedRequestsForEndpoint(provider: string, model: string, keyFingerprint: string | null) {
  return modelRequestQueue.filter((task) => task.metadata.provider === provider
    && task.metadata.model === model
    && task.metadata.keyFingerprint === keyFingerprint).length
}

function orderModelApiKeysForDispatch(target: ResolvedPlannerTarget, apiKeys: string[]) {
  const nowMs = Date.now()
  const ordered = apiKeys
    .map((apiKey, index) => {
      const endpoint = getEndpointStatsForTargetApiKey(target, apiKey)
      const provider = resolveProviderLabel(target.baseUrl)
      const keyFingerprint = fingerprintModelApiKey(apiKey)
      const backoffActive = endpoint?.backoffUntilMs !== null
        && endpoint?.backoffUntilMs !== undefined
        && endpoint.backoffUntilMs > nowMs
      const queuedRequests = countQueuedRequestsForEndpoint(provider, target.model, keyFingerprint)
      return {
        apiKey,
        index,
        backoffActive,
        activeRequests: endpoint?.activeRequests ?? 0,
        queuedRequests,
        dispatchGate: getAiPlayerProviderAccountPoolDispatchGate({
          provider,
          model: target.model,
          keyFingerprint,
          activeRequests: endpoint?.activeRequests ?? 0,
          queuedRequests,
        }),
        totalRateLimitedRequests: endpoint?.totalRateLimitedRequests ?? 0,
        consecutiveFailures: endpoint?.consecutiveFailures ?? 0,
        p95LatencyMs: percentileMs(endpoint?.latencySamplesMs ?? [], 0.95),
      }
    })
  const blockedReason = ordered.find((item) => !item.dispatchGate.allowed)?.dispatchGate.reason ?? null
  return {
    blockedReason,
    apiKeys: ordered
      .filter((item) => item.dispatchGate.allowed)
      .sort((left, right) => Number(left.backoffActive) - Number(right.backoffActive)
        || (left.activeRequests + left.queuedRequests) - (right.activeRequests + right.queuedRequests)
        || left.totalRateLimitedRequests - right.totalRateLimitedRequests
        || left.consecutiveFailures - right.consecutiveFailures
        || left.p95LatencyMs - right.p95LatencyMs
        || left.index - right.index)
      .map((item) => item.apiKey),
  }
}

function buildModelRequestQueueMetadata(
  target: ResolvedPlannerTarget,
  observation: AiPlayerRuntimeProposalObservation,
  apiKey: string,
): ModelRequestQueueMetadata {
  const lane = resolveModelRequestLane(observation)
  const sequence = modelRequestQueueSequence += 1
  const enqueuedAtMs = Date.now()
  const leaseTtlMs = readModelRequestLeaseTtlMs()
  return {
    aiPlayerId: observation.aiPlayerId,
    jobId: `model_req_job_${process.pid}_${enqueuedAtMs}_${sequence}`,
    leaseId: `model_req_lease_${process.pid}_${enqueuedAtMs}_${sequence}`,
    lane,
    priority: resolveModelRequestPriority(observation, lane),
    provider: resolveProviderLabel(target.baseUrl),
    model: target.model,
    keyFingerprint: fingerprintModelApiKey(apiKey),
    enqueuedAtMs,
    leaseExpiresAtMs: enqueuedAtMs + leaseTtlMs,
    sequence,
  }
}

function recordModelRequestRejected(metadata: ModelRequestQueueMetadata) {
  const rejectedAt = new Date().toISOString()
  const laneStats = getLaneStats(metadata)
  const endpointStats = getEndpointStats(metadata)
  modelRequestQueueStats.totalRejectedRequests += 1
  modelRequestQueueStats.lastRejectedAt = rejectedAt
  laneStats.totalRejectedRequests += 1
  endpointStats.totalRejectedRequests += 1
}

async function claimModelDispatchLease(metadata: ModelRequestQueueMetadata) {
  return getModelDispatchStore().claimLease({
    leaseId: metadata.leaseId,
    ownerId: readModelDispatchOwnerId(),
    aiPlayerId: metadata.aiPlayerId,
    lane: metadata.lane,
    provider: metadata.provider,
    model: metadata.model,
    keyFingerprint: metadata.keyFingerprint,
    ttlMs: readModelRequestLeaseTtlMs(),
  })
}

async function heartbeatModelDispatchLease(metadata: ModelRequestQueueMetadata, state: 'queued' | 'active') {
  return getModelDispatchStore().heartbeatLease({
    leaseId: metadata.leaseId,
    ownerId: readModelDispatchOwnerId(),
    ttlMs: readModelRequestLeaseTtlMs(),
    state,
  })
}

async function completeModelDispatchLease(metadata: ModelRequestQueueMetadata) {
  await getModelDispatchStore().completeLease({
    leaseId: metadata.leaseId,
    ownerId: readModelDispatchOwnerId(),
  })
}

async function failModelDispatchLease(metadata: ModelRequestQueueMetadata, reason: string) {
  await getModelDispatchStore().failLease({
    leaseId: metadata.leaseId,
    ownerId: readModelDispatchOwnerId(),
    reason,
  })
}

async function reserveModelDispatchRateBucket(metadata: ModelRequestQueueMetadata) {
  return getModelDispatchStore().reserveRateBucket({
    provider: metadata.provider,
    model: metadata.model,
    keyFingerprint: metadata.keyFingerprint,
    limit: readModelRateBucketLimit(),
    windowMs: readModelRateBucketWindowMs(),
  })
}

function buildModelDispatchQueueMergeKey(metadata: ModelRequestQueueMetadata) {
  if (metadata.lane !== 'background_patrol') {
    return null
  }
  if (readModelBackgroundPatrolThrottleMs() <= 0) {
    return null
  }
  return [
    'background_patrol',
    metadata.aiPlayerId,
    metadata.provider,
    metadata.model,
    metadata.keyFingerprint ?? 'none',
  ].join(':')
}

async function enqueueModelDispatchQueueJob(metadata: ModelRequestQueueMetadata) {
  return getModelDispatchStore().enqueueJob({
    jobId: metadata.jobId,
    leaseId: metadata.leaseId,
    ownerId: readModelDispatchOwnerId(),
    aiPlayerId: metadata.aiPlayerId,
    lane: metadata.lane,
    priority: metadata.priority,
    provider: metadata.provider,
    model: metadata.model,
    keyFingerprint: metadata.keyFingerprint,
    ttlMs: readModelRequestLeaseTtlMs(),
    mergeKey: buildModelDispatchQueueMergeKey(metadata),
    throttleMs: metadata.lane === 'background_patrol' ? readModelBackgroundPatrolThrottleMs() : 0,
  })
}

async function claimModelDispatchQueueJob(metadata: ModelRequestQueueMetadata) {
  return getModelDispatchStore().claimJob({
    jobId: metadata.jobId,
    ownerId: readModelDispatchOwnerId(),
    ttlMs: readModelRequestLeaseTtlMs(),
  })
}

async function completeModelDispatchQueueJob(metadata: ModelRequestQueueMetadata) {
  await getModelDispatchStore().completeJob({
    jobId: metadata.jobId,
    ownerId: readModelDispatchOwnerId(),
  })
}

async function failModelDispatchQueueJob(metadata: ModelRequestQueueMetadata, reason: string) {
  await getModelDispatchStore().failJob({
    jobId: metadata.jobId,
    ownerId: readModelDispatchOwnerId(),
    reason,
  })
}

function buildEndpointStatsKey(metadata: Pick<ModelRequestQueueMetadata, 'provider' | 'model' | 'keyFingerprint'>) {
  return `${metadata.provider}\u0000${metadata.model}\u0000${metadata.keyFingerprint ?? 'none'}`
}

function getLaneStats(metadata: ModelRequestQueueMetadata): ModelRequestLaneStats {
  const existing = modelRequestLaneStats.get(metadata.lane)
  if (existing) {
    existing.priority = Math.max(existing.priority, metadata.priority)
    return existing
  }
  const created: ModelRequestLaneStats = {
    lane: metadata.lane,
    priority: metadata.priority,
    activeRequests: 0,
    totalStartedRequests: 0,
    totalCompletedRequests: 0,
    totalRejectedRequests: 0,
    totalWaitMs: 0,
    waitSampleCount: 0,
    waitSamplesMs: [],
  }
  modelRequestLaneStats.set(metadata.lane, created)
  return created
}

function getEndpointStats(metadata: ModelRequestQueueMetadata): ModelRequestEndpointStats {
  const key = buildEndpointStatsKey(metadata)
  const existing = modelRequestEndpointStats.get(key)
  if (existing) {
    return existing
  }
  const created: ModelRequestEndpointStats = {
    provider: metadata.provider,
    model: metadata.model,
    keyFingerprint: metadata.keyFingerprint,
    activeRequests: 0,
    totalStartedRequests: 0,
    totalCompletedRequests: 0,
    totalRejectedRequests: 0,
    totalFailedRequests: 0,
    totalRateLimitedRequests: 0,
    totalLatencyMs: 0,
    latencySampleCount: 0,
    latencySamplesMs: [],
    consecutiveFailures: 0,
    backoffUntilMs: null,
    requestStartedAtMs: [],
    lastStartedAt: null,
    lastCompletedAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
  }
  modelRequestEndpointStats.set(key, created)
  return created
}

function drainModelRequestQueue() {
  const maxConcurrency = readModelRequestMaxConcurrency()
  while (activeModelRequestCount < maxConcurrency) {
    const task = modelRequestQueue.shift()
    if (!task) {
      return
    }
    activeModelRequestCount += 1
    modelRequestQueueStats.totalStartedRequests += 1
    modelRequestQueueStats.lastStartedAt = new Date().toISOString()
    const laneStats = getLaneStats(task.metadata)
    const endpointStats = getEndpointStats(task.metadata)
    const startedAt = modelRequestQueueStats.lastStartedAt
    const waitMs = Math.max(0, Date.now() - task.metadata.enqueuedAtMs)
    laneStats.activeRequests += 1
    laneStats.totalStartedRequests += 1
    laneStats.totalWaitMs += waitMs
    laneStats.waitSampleCount += 1
    laneStats.waitSamplesMs.push(waitMs)
    if (laneStats.waitSamplesMs.length > 512) {
      laneStats.waitSamplesMs.splice(0, laneStats.waitSamplesMs.length - 512)
    }
    endpointStats.activeRequests += 1
    endpointStats.totalStartedRequests += 1
    endpointStats.requestStartedAtMs.push(Date.now())
    endpointStats.lastStartedAt = startedAt
    activeModelRequestLeases.set(task.metadata.sequence, task.metadata)
    task.run()
      .then(task.resolve, task.reject)
      .finally(() => {
        modelRequestQueueStats.totalCompletedRequests += 1
        modelRequestQueueStats.lastCompletedAt = new Date().toISOString()
        laneStats.activeRequests = Math.max(0, laneStats.activeRequests - 1)
        laneStats.totalCompletedRequests += 1
        endpointStats.activeRequests = Math.max(0, endpointStats.activeRequests - 1)
        endpointStats.totalCompletedRequests += 1
        endpointStats.lastCompletedAt = modelRequestQueueStats.lastCompletedAt
        activeModelRequestLeases.delete(task.metadata.sequence)
        activeModelRequestCount = Math.max(0, activeModelRequestCount - 1)
        drainModelRequestQueue()
      })
  }
}

function runWithModelRequestQueue<T>(run: () => Promise<T>, metadata: ModelRequestQueueMetadata): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const maxConcurrency = readModelRequestMaxConcurrency()
    const queueLimit = readModelRequestQueueLimit()
    const laneStats = getLaneStats(metadata)
    const endpointStats = getEndpointStats(metadata)
    if (activeModelRequestCount >= maxConcurrency && modelRequestQueue.length >= queueLimit) {
      modelRequestQueueStats.totalRejectedRequests += 1
      modelRequestQueueStats.lastRejectedAt = new Date().toISOString()
      laneStats.totalRejectedRequests += 1
      endpointStats.totalRejectedRequests += 1
      reject(new Error('model_request_queue_full'))
      return
    }
    modelRequestQueue.push({
      run: run as () => Promise<unknown>,
      resolve: resolve as (value: unknown) => void,
      reject,
      metadata,
    })
    modelRequestQueue.sort((left, right) => right.metadata.priority - left.metadata.priority
      || left.metadata.sequence - right.metadata.sequence)
    drainModelRequestQueue()
  })
}

function isRuntimeObject(value: unknown): value is { contextDocuments?: unknown } {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function extractRuntimeContextDocuments(
  observation: AiPlayerRuntimeProposalObservation,
): AiPlayerRuntimePromptContextDocument[] {
  if (!isRuntimeObject(observation.runtime) || !Array.isArray(observation.runtime.contextDocuments)) {
    return []
  }

  return observation.runtime.contextDocuments.flatMap((document) => {
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      return []
    }
    const record = document as Record<string, unknown>
    const kind = record.kind
    const title = typeof record.title === 'string' ? record.title.trim() : ''
    const content = typeof record.content === 'string' ? record.content.trim() : ''
    if (
      (kind !== 'identity' && kind !== 'memory' && kind !== 'skill' && kind !== 'instruction')
      || !title
      || !content
    ) {
      return []
    }
    return [{
      kind,
      title,
      content,
    }]
  })
}

export type ModelProposalResult =
  | {
    ok: true
    output: AiPlayerRuntimeModelOutput
    proposalRequests: AiPlayerActionProposalRequest[]
    model: string
    usage?: unknown
    normalization?: 'markdown_fence_after_retry'
    selectedProvider?: AiPlayerRuntimeProposalSelectedProvider
    providerKeyFingerprint?: string | null
    providerFallbackFailures?: AiPlayerRuntimeModelTargetFailure[]
    budgetReservationId?: string
    budgetWindowKey?: string
    aiCommandCreditReservationId?: string
    aiCommandCreditReservedCredits?: number
  }
  | {
    ok: false
    error: string
    providerFallbackFailures?: AiPlayerRuntimeModelTargetFailure[]
  }

function resolveProviderLabel(baseUrl: string) {
  try {
    return new URL(baseUrl).host || 'relay'
  } catch {
    return 'relay'
  }
}

function parseRetryAfterMs(headers: Headers): number | null {
  const retryAfter = headers.get('retry-after')?.trim()
  if (!retryAfter) {
    return null
  }
  const retryAfterSeconds = Number(retryAfter)
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return Math.max(1_000, Math.min(3_600_000, Math.ceil(retryAfterSeconds * 1000)))
  }
  const retryAfterDate = Date.parse(retryAfter)
  if (Number.isFinite(retryAfterDate)) {
    return Math.max(1_000, Math.min(3_600_000, retryAfterDate - Date.now()))
  }
  return null
}

function readEndpointBackoffRemainingMs(metadata: ModelRequestQueueMetadata): number {
  const endpointStats = getEndpointStats(metadata)
  if (endpointStats.backoffUntilMs === null) {
    return 0
  }
  const remainingMs = endpointStats.backoffUntilMs - Date.now()
  if (remainingMs <= 0) {
    endpointStats.backoffUntilMs = null
    return 0
  }
  return remainingMs
}

function pruneEndpointRateBucket(endpointStats: ModelRequestEndpointStats, windowMs: number, nowMs = Date.now()) {
  const minStartedAtMs = nowMs - windowMs
  while (endpointStats.requestStartedAtMs.length > 0 && endpointStats.requestStartedAtMs[0] <= minStartedAtMs) {
    endpointStats.requestStartedAtMs.shift()
  }
}

function recordModelEndpointLatency(metadata: ModelRequestQueueMetadata, latencyMs: number) {
  const endpointStats = getEndpointStats(metadata)
  const sampleMs = Math.max(0, Math.round(latencyMs))
  endpointStats.totalLatencyMs += sampleMs
  endpointStats.latencySampleCount += 1
  endpointStats.latencySamplesMs.push(sampleMs)
  if (endpointStats.latencySamplesMs.length > 512) {
    endpointStats.latencySamplesMs.splice(0, endpointStats.latencySamplesMs.length - 512)
  }
}

function recordModelEndpointHttpResult(
  metadata: ModelRequestQueueMetadata,
  status: number,
  headers: Headers,
) {
  const endpointStats = getEndpointStats(metadata)
  const now = new Date()
  const nowIso = now.toISOString()
  if (status >= 200 && status < 300) {
    endpointStats.consecutiveFailures = 0
    endpointStats.backoffUntilMs = null
    endpointStats.lastSuccessAt = nowIso
    return
  }

  endpointStats.totalFailedRequests += 1
  endpointStats.consecutiveFailures += 1
  endpointStats.lastFailureAt = nowIso
  if (status === 429) {
    endpointStats.totalRateLimitedRequests += 1
    endpointStats.backoffUntilMs = now.getTime() + (parseRetryAfterMs(headers) ?? readModelRateLimitBackoffMs())
    return
  }
  if (status >= 500 && endpointStats.consecutiveFailures >= readModelCircuitFailureThreshold()) {
    endpointStats.backoffUntilMs = now.getTime() + readModelCircuitBackoffMs()
  }
}

function shouldDisableThinkingModeForJsonProposal(target: ResolvedPlannerTarget) {
  const model = target.model.trim().toLowerCase()
  return resolveProviderLabel(target.baseUrl) === 'api.deepseek.com'
    && (model === 'deepseek-v4-flash' || model === 'deepseek-v4-pro')
}

function toSelectedProvider(
  candidate: AiPlayerRuntimeModelTargetCandidate,
  keyFingerprint?: string | null,
): AiPlayerRuntimeProposalSelectedProvider {
  return {
    model: candidate.target.model,
    provider: resolveProviderLabel(candidate.target.baseUrl),
    keyFingerprint: keyFingerprint ?? null,
    source: candidate.source,
    byokSource: candidate.byokSource,
    priority: candidate.priority,
  }
}

function toTargetFailure(
  candidate: AiPlayerRuntimeModelTargetCandidate,
  error: string,
): AiPlayerRuntimeModelTargetFailure {
  return {
    model: candidate.target.model,
    source: candidate.source,
    byokSource: candidate.byokSource,
    priority: candidate.priority,
    error,
  }
}

function formatRawJsonShape(rawContent: string) {
  const trimmed = rawContent.trim()
  if (trimmed.startsWith('```')) {
    return 'markdown_fence'
  }
  if (!trimmed.startsWith('{')) {
    return 'missing_object_prefix'
  }
  if (!trimmed.endsWith('}')) {
    return 'missing_object_suffix'
  }
  return 'object_syntax_error'
}

function unwrapMarkdownJsonFence(rawContent: string) {
  const trimmed = rawContent.trim()
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed)
  if (!match) {
    return null
  }
  const inner = match[1]?.trim()
  if (!inner?.startsWith('{') || !inner.endsWith('}')) {
    return null
  }
  return inner
}

function formatModelOutputParseError(error: unknown, rawContent?: string) {
  const issueSource = error && typeof error === 'object'
    ? error as { issues?: Array<{ path?: Array<string | number>; message?: string; code?: string }> }
    : {}
  const issues = Array.isArray(issueSource.issues)
    ? issueSource.issues.slice(0, 3).map((issue) => {
      const path = issue.path?.join('.') || 'output'
      const message = issue.code || issue.message || 'invalid'
      return `${path}:${message}`
    })
    : []
  if (issues.length > 0) {
    return `model_response_invalid_json_proposal:${issues.join('|')}`
  }
  if (error instanceof SyntaxError) {
    return `model_response_invalid_json_proposal:json_parse_error:${formatRawJsonShape(rawContent ?? '')}`
  }
  return 'model_response_invalid_json_proposal'
}

export function buildAiPlayerRuntimeProposalMessages(
  observation: AiPlayerRuntimeProposalObservation,
): AiPlayerRuntimeProposalModelMessage[] {
  const contextDocuments = extractRuntimeContextDocuments(observation)
  return [
    {
      role: 'system',
      content: renderAiPlayerRuntimeSystemPrompt(undefined, { contextDocuments }),
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Choose governed AI player action proposals from the supplied observation.',
        strictJsonOnly: 'Return exactly one JSON object. The whole assistant message must be JSON.parse-able as-is. Do not wrap it in markdown fences or explanatory text.',
        hardFailureIfNotRawJson: 'If the first character is not { or the last character is not }, the proposal gate fails.',
        outputTransport: 'Return compact JSON text directly, preferably on one line. Never start with ```json, ```, Here is, or any natural-language prefix.',
        numericCommandRule: 'When the player command names a resource amount, use that exact amount in args.resources. Never replace a requested amount with all available resources.',
        outputShape: {
          summary: 'short optional string',
          proposals: [
            {
              action: 'one action from the runtime actionWhitelist and AI_PLAYER_RUNTIME_ALLOWED_ACTIONS',
              args: 'object with action-specific arguments; use {} when no args are needed',
              reason: 'four short player-readable clauses in the exact order: 资源：...；目标：...；风险：...；批准后结果：...',
            },
          ],
          deferReason: 'string; use empty string when proposing actions',
          needsHumanReview: true,
        },
        validExample: {
          summary: 'transfer available AI resources to the governor inbox',
          proposals: [
            {
              action: 'resource_transfer_to_governor',
              args: {
                resources: {
                  wood: 11,
                },
              },
              reason: '资源：AI 子账户木材 11 可输送；目标：转入总督通用收件箱；风险：需要人工批准且受额度/冷却约束；批准后结果：后端执行资源输送并生成 receipt。',
            },
          ],
          deferReason: '',
          needsHumanReview: true,
        },
        aiPlayerId: observation.aiPlayerId,
        chatCommand: observation.chatCommand ?? null,
        runtime: observation.runtime,
        contextDocuments,
        chatSummary: observation.chatSummary ?? null,
        recentChat: observation.recentChat ?? [],
        world: observation.world ?? null,
        receipts: observation.receipts ?? [],
        failures: observation.failures ?? [],
      }),
    },
  ]
}

export function parseAiPlayerRuntimeProposalJson(rawContent: string): AiPlayerRuntimeModelOutput {
  return parseAiPlayerRuntimeModelOutput(JSON.parse(rawContent))
}

export function toAiPlayerActionProposalRequests(
  aiPlayerId: string,
  output: AiPlayerRuntimeModelOutput,
): AiPlayerActionProposalRequest[] {
  return output.proposals.map((proposal) => {
    const request = {
      aiPlayerId,
      action: proposal.action,
      args: proposal.args,
      reason: proposal.reason,
      source: 'llm',
    } satisfies AiPlayerActionProposalRequest
    return aiPlayerActionProposalRequestSchema.parse(request)
  })
}

function buildAiPlayerRuntimeProposalRequestBodyRoot(
  target: ResolvedPlannerTarget,
  messages: AiPlayerRuntimeProposalModelMessage[],
): Record<string, unknown> {
  const requestBodyRoot: Record<string, unknown> = {
    model: target.model,
    messages,
    temperature: 0,
    max_tokens: MODEL_REQUEST_MAX_COMPLETION_TOKENS,
    response_format: { type: 'json_object' },
  }
  if (shouldDisableThinkingModeForJsonProposal(target)) {
    requestBodyRoot.thinking = { type: 'disabled' }
  }
  return requestBodyRoot
}

function estimateAiPlayerRuntimeProposalPreflight(
  target: ResolvedPlannerTarget,
  observation: AiPlayerRuntimeProposalObservation,
  tokenEstimator: AiPlayerRuntimeProposalPreflightTokenEstimator = estimateAiPlayerRuntimeProposalTokensByProviderModelProfile,
): AiPlayerRuntimeProposalPreflight {
  const messages = buildAiPlayerRuntimeProposalMessages(observation)
  const requestBody = JSON.stringify(buildAiPlayerRuntimeProposalRequestBodyRoot(target, messages))
  return normalizeAiPlayerRuntimeProposalTokenEstimate(tokenEstimator({
    target,
    observation,
    messages,
    requestBody,
    maxCompletionTokens: MODEL_REQUEST_MAX_COMPLETION_TOKENS,
  }), MODEL_REQUEST_MAX_COMPLETION_TOKENS)
}

export async function requestAiPlayerRuntimeProposalFromModel({
  target,
  observation,
  fetchImpl = fetch,
}: AiPlayerRuntimeProposalModelRequest): Promise<ModelProposalResult> {
  const rawApiKeys = Array.from(new Set(target.apiKeys.map((apiKey) => apiKey.trim()).filter(Boolean)))
  const orderedApiKeys = orderModelApiKeysForDispatch(target, rawApiKeys)
  const apiKeys = orderedApiKeys.apiKeys
  if (apiKeys.length === 0) {
    return {
      ok: false,
      error: rawApiKeys.length === 0
        ? 'missing_model_api_key'
        : (orderedApiKeys.blockedReason ?? 'model_provider_account_not_dispatchable'),
    }
  }

  const requestPayload = async (
    messages: AiPlayerRuntimeProposalModelMessage[],
  ): Promise<{ ok: true; payload: ChatCompletionResponse; keyFingerprint: string | null } | { ok: false; error: string }> => {
    const requestBody = JSON.stringify(buildAiPlayerRuntimeProposalRequestBodyRoot(target, messages))

    let response: Response | null = null
    let responseKeyFingerprint: string | null = null
    let skippedForBackoff = false
    for (let index = 0; index < apiKeys.length; index += 1) {
      const apiKey = apiKeys[index]
      const queueMetadata = buildModelRequestQueueMetadata(target, observation, apiKey)
      if (readEndpointBackoffRemainingMs(queueMetadata) > 0) {
        skippedForBackoff = true
        continue
      }
      const dispatchClaim = await claimModelDispatchLease(queueMetadata)
      if (!dispatchClaim.ok) {
        recordModelRequestRejected(queueMetadata)
        return {
          ok: false,
          error: 'model_dispatch_lease_held',
        }
      }
      const dispatchJob = await enqueueModelDispatchQueueJob(queueMetadata)
      if (dispatchJob.mergedExisting) {
        await failModelDispatchLease(queueMetadata, 'model_dispatch_job_merged')
        return {
          ok: false,
          error: 'model_dispatch_job_merged',
        }
      }
      try {
        response = await runWithModelRequestQueue(async () => {
          const jobClaim = await claimModelDispatchQueueJob(queueMetadata)
          if (!jobClaim.ok) {
            throw new Error(jobClaim.error)
          }
          const heartbeat = await heartbeatModelDispatchLease(queueMetadata, 'active')
          if (!heartbeat.ok) {
            throw new Error(heartbeat.error)
          }
          const rateReservation = await reserveModelDispatchRateBucket(queueMetadata)
          if (!rateReservation.ok) {
            recordModelRequestRejected(queueMetadata)
            await failModelDispatchLease(queueMetadata, rateReservation.error)
            await failModelDispatchQueueJob(queueMetadata, rateReservation.error)
            throw new Error(rateReservation.error)
          }
          const endpointStartedAtMs = Date.now()
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), readModelRequestTimeoutMs())
          try {
            return await fetchImpl(`${target.baseUrl}/chat/completions`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: requestBody,
              signal: controller.signal,
            })
          } catch (error) {
            if (controller.signal.aborted) {
              throw new Error('model_request_timeout')
            }
            throw error
          } finally {
            clearTimeout(timeout)
            recordModelEndpointLatency(queueMetadata, Date.now() - endpointStartedAtMs)
          }
        }, queueMetadata)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : ''
        const publicError = errorMessage === 'model_request_queue_full'
          || errorMessage === 'model_provider_rate_bucket_exhausted'
          || errorMessage === 'dispatch_queue_not_found'
          || errorMessage === 'dispatch_queue_not_available'
          || errorMessage === 'dispatch_queue_held'
          || errorMessage === 'dispatch_lease_expired'
          || errorMessage === 'dispatch_lease_not_found'
          || errorMessage === 'dispatch_lease_not_owned'
          || errorMessage === 'model_request_timeout'
          ? errorMessage
          : 'model_request_failed_exception'
        if (
          publicError === 'dispatch_lease_expired'
          || publicError === 'dispatch_lease_not_found'
          || publicError === 'dispatch_lease_not_owned'
        ) {
          recordModelRequestRejected(queueMetadata)
        }
        if (publicError !== 'model_provider_rate_bucket_exhausted') {
          await failModelDispatchLease(queueMetadata, publicError)
          await failModelDispatchQueueJob(queueMetadata, publicError)
        }
        return {
          ok: false,
          error: publicError,
        }
      }
      recordModelEndpointHttpResult(queueMetadata, response.status, response.headers)
      if (response.ok) {
        responseKeyFingerprint = queueMetadata.keyFingerprint
        await completeModelDispatchLease(queueMetadata)
        await completeModelDispatchQueueJob(queueMetadata)
        break
      }
      await failModelDispatchLease(queueMetadata, `model_request_failed_${response.status}`)
      await failModelDispatchQueueJob(queueMetadata, `model_request_failed_${response.status}`)
      if (response.status === 429 && index < apiKeys.length - 1) {
        continue
      }
      if (!AUTH_RETRY_STATUSES.has(response.status) || index === apiKeys.length - 1) {
        return {
          ok: false,
          error: `model_request_failed_${response.status}`,
        }
      }
    }

    if (!response?.ok) {
      return {
        ok: false,
        error: skippedForBackoff ? 'model_provider_backoff_active' : 'model_request_failed_no_response',
      }
    }
    return {
      ok: true,
      payload: await response.json() as ChatCompletionResponse,
      keyFingerprint: responseKeyFingerprint,
    }
  }

  const parsePayload = (
    payload: ChatCompletionResponse,
    options: { allowMarkdownFenceNormalization?: boolean } = {},
  ): ModelProposalResult => {
    const rawContent = payload.choices?.[0]?.message?.content
    if (typeof rawContent !== 'string' || rawContent.trim() === '') {
      return {
        ok: false,
        error: 'model_response_missing_content',
      }
    }

    try {
      const output = parseAiPlayerRuntimeProposalJson(rawContent)
      return {
        ok: true,
        output,
        proposalRequests: toAiPlayerActionProposalRequests(observation.aiPlayerId, output),
        model: typeof payload.model === 'string' ? payload.model : target.model,
        usage: payload.usage,
      }
    } catch (error) {
      if (options.allowMarkdownFenceNormalization) {
        const unwrapped = unwrapMarkdownJsonFence(rawContent)
        if (unwrapped) {
          try {
            const output = parseAiPlayerRuntimeProposalJson(unwrapped)
            return {
              ok: true,
              output,
              proposalRequests: toAiPlayerActionProposalRequests(observation.aiPlayerId, output),
              model: typeof payload.model === 'string' ? payload.model : target.model,
              usage: payload.usage,
              normalization: 'markdown_fence_after_retry',
            }
          } catch {
            // Preserve the original raw-content parse error below.
          }
        }
      }
      return {
        ok: false,
        error: formatModelOutputParseError(error, rawContent),
      }
    }
  }

  const attachProviderKeyFingerprint = (
    result: ModelProposalResult,
    keyFingerprint: string | null,
  ): ModelProposalResult => (result.ok ? { ...result, providerKeyFingerprint: keyFingerprint } : result)

  const baseMessages = buildAiPlayerRuntimeProposalMessages(observation)
  const firstPayload = await requestPayload(baseMessages)
  if (!firstPayload.ok) {
    return firstPayload
  }
  const firstResult = attachProviderKeyFingerprint(parsePayload(firstPayload.payload), firstPayload.keyFingerprint)
  if (!firstResult.ok && firstResult.error === 'model_response_missing_content') {
    const retryPayload = await requestPayload([
      ...baseMessages,
      {
        role: 'user',
        content: JSON.stringify({
          correction: 'The previous response had empty content, so no proposal could be created.',
          required: 'Return exactly one non-empty JSON object that JSON.parse can read directly. No markdown fences. No prose.',
          emptyContentIsFailure: 'An empty assistant message is invalid and must not happen again.',
          firstCharacterMustBe: '{',
          lastCharacterMustBe: '}',
        }),
      },
    ])
    if (!retryPayload.ok) {
      return retryPayload
    }
    const retryResult = attachProviderKeyFingerprint(parsePayload(retryPayload.payload), retryPayload.keyFingerprint)
    if (retryResult.ok || retryResult.error !== 'model_response_missing_content') {
      return retryResult
    }
    return retryResult
  }
  if (firstResult.ok || !firstResult.error.includes('json_parse_error')) {
    return firstResult
  }

  const retryPayload = await requestPayload([
    ...baseMessages,
    {
      role: 'user',
      content: JSON.stringify({
        correction: 'The previous response was rejected before proposal creation because it was not raw JSON.',
        required: 'Return exactly one JSON object that JSON.parse can read directly. No markdown fences. No prose. No code block language label.',
        hardFailureIfWrapped: 'A response starting with ```json or ``` is invalid even if the JSON inside is valid.',
        compactJsonOnly: 'The next assistant message must be compact raw JSON text only.',
        firstCharacterMustBe: '{',
        lastCharacterMustBe: '}',
      }),
    },
  ])
  if (!retryPayload.ok) {
    return retryPayload
  }
  const retryResult = attachProviderKeyFingerprint(parsePayload(retryPayload.payload), retryPayload.keyFingerprint)
  if (retryResult.ok || !retryResult.error.includes('json_parse_error')) {
    return retryResult
  }

  const finalRetryPayload = await requestPayload([
    ...baseMessages,
    {
      role: 'user',
      content: JSON.stringify({
        correction: 'The previous correction still failed because the assistant response was not raw JSON.',
        hardRequirement: 'Return only the JSON object text. Do not include markdown, backticks, code fences, labels, prose, or comments.',
        failureExampleDoNotDoThis: '```json\\n{...}\\n```',
        validStart: '{"summary"',
        validEnd: '}',
        responseMustBeOnlyThisShape: {
          summary: 'short optional string',
          proposals: [
            {
              action: 'resource_transfer_to_governor',
              args: {
                resources: {
                  wood: 11,
                },
              },
              reason: '资源：...；目标：...；风险：...；批准后结果：...',
            },
          ],
          deferReason: '',
          needsHumanReview: true,
        },
      }),
    },
  ])
  if (!finalRetryPayload.ok) {
    return finalRetryPayload
  }
  const finalRetryResult = attachProviderKeyFingerprint(parsePayload(finalRetryPayload.payload), finalRetryPayload.keyFingerprint)
  if (finalRetryResult.ok) {
    return finalRetryResult
  }
  return attachProviderKeyFingerprint(
    parsePayload(finalRetryPayload.payload, { allowMarkdownFenceNormalization: true }),
    finalRetryPayload.keyFingerprint,
  )
}

export async function requestAiPlayerRuntimeProposalFromCandidateTargets({
  candidates,
  observation,
  fetchImpl = fetch,
  reserveCandidateAttempt,
  commitCandidateAttempt,
  preflightTokenEstimator,
}: AiPlayerRuntimeProposalCandidateRequest): Promise<ModelProposalResult> {
  const failures: AiPlayerRuntimeModelTargetFailure[] = []
  for (const candidate of candidates) {
    const candidateApiKeys = Array.from(new Set(candidate.target.apiKeys.map((apiKey) => apiKey.trim()).filter(Boolean)))
    if (candidateApiKeys.length === 0) {
      failures.push(toTargetFailure(candidate, 'missing_model_api_key'))
      continue
    }
    const dispatchableCandidate = orderModelApiKeysForDispatch(candidate.target, candidateApiKeys)
    if (dispatchableCandidate.apiKeys.length === 0) {
      failures.push(toTargetFailure(
        candidate,
        dispatchableCandidate.blockedReason ?? 'model_provider_account_not_dispatchable',
      ))
      continue
    }
    const preflight = estimateAiPlayerRuntimeProposalPreflight(candidate.target, observation, preflightTokenEstimator)
    const reservationResult = await reserveCandidateAttempt?.(candidate, preflight)
    if (reservationResult && !reservationResult.ok) {
      failures.push(toTargetFailure(candidate, reservationResult.error))
      continue
    }
    const reservation: AiPlayerRuntimeProposalBudgetReservation | null = reservationResult?.ok
      ? {
          reservationId: reservationResult.reservationId,
          budgetWindowKey: reservationResult.budgetWindowKey,
          limitMode: reservationResult.limitMode,
          aiCommandCreditReservationId: reservationResult.aiCommandCreditReservationId,
          aiCommandCreditReservedCredits: reservationResult.aiCommandCreditReservedCredits,
        }
      : null
    let result: ModelProposalResult
    try {
      result = await requestAiPlayerRuntimeProposalFromModel({
        target: candidate.target,
        observation,
        fetchImpl,
      })
    } catch {
      result = {
        ok: false,
        error: 'model_request_failed_exception',
      }
    }
    await commitCandidateAttempt?.(candidate, result, reservation)
    if (result.ok) {
      return {
        ...result,
        selectedProvider: toSelectedProvider(candidate, result.providerKeyFingerprint),
        providerFallbackFailures: failures,
        budgetReservationId: reservation?.reservationId,
        budgetWindowKey: reservation?.budgetWindowKey,
        aiCommandCreditReservationId: reservation?.aiCommandCreditReservationId,
        aiCommandCreditReservedCredits: reservation?.aiCommandCreditReservedCredits,
      }
    }
    failures.push(toTargetFailure(candidate, result.error))
  }

  return {
    ok: false,
    error: failures.find((failure) => failure.error.startsWith('provider_budget_'))?.error
      ?? [...failures].reverse().find((failure) => failure.error !== 'missing_model_api_key')?.error
      ?? failures[failures.length - 1]?.error
      ?? 'missing_model_target',
    providerFallbackFailures: failures,
  }
}
