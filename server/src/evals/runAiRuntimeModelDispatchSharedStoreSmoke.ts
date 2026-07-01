import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import {
  AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_CLIENT_PACKAGE,
  applyAiPlayerRuntimeModelDispatchPostgresMigration,
  createAiPlayerRuntimeModelDispatchPostgresStore,
  createAiPlayerRuntimeModelDispatchRedisStoreFromUrl,
  type AiPlayerRuntimeModelAsyncDispatchStore,
} from '../application/ai/aiPlayerRuntimeModelDispatchStore'
import {
  commitAiPlayerProviderBudgetReservation,
  flushAiPlayerProviderAccountStorePersist,
  grantAiPlayerProviderAiCommandCredits,
  listAiPlayerProviderAuditEvents,
  listAiPlayerProviderBillingLedger,
  listAiPlayerProviderTokenBalance,
  listAiPlayerProviderTokenSummary,
  releaseAiPlayerProviderAiCommandCreditReservation,
  releaseAiPlayerProviderBudgetReservation,
  recordAiPlayerProviderModelRequestAccounting,
  reserveAiPlayerProviderAiCommandCredits,
  reserveAiPlayerProviderBudget,
} from '../application/ai/aiPlayerProviderAccountStore'
import {
  getAiPlayerRuntimeModelRequestQueueStatusAsync,
  requestAiPlayerRuntimeProposalFromCandidateTargets,
  resetAiPlayerRuntimeModelDispatchStoreForTest,
  type AiPlayerRuntimeProposalObservation,
} from '../application/ai/aiPlayerRuntimeProposalModel'
import {
  DEFAULT_AI_PLAYER_RUNTIME_MODEL,
  type AiPlayerRuntimeModelTargetCandidate,
} from '../application/ai/aiPlayerRuntimeModelTarget'
import type { ResolvedPlannerTarget } from '../config/modelGateway'

type StoreKind = 'postgres' | 'redis'
type EnvPresence = 'present' | 'missing'

type ConnectionUrlDescription = {
  status: 'missing' | 'parseable' | 'unparseable'
  scheme: string | null
  host: string | null
  port: string | null
  path: string | null
  database: string | null
  databaseIndex: string | null
  redacted: string | null
  localHostHint: boolean | null
}

type RuntimeStoreHandle = {
  store: AiPlayerRuntimeModelAsyncDispatchStore
  close: () => Promise<void>
  cleanup: () => Promise<void>
}

type WorkerResult = {
  ok: boolean
  workerId: string
  mode: string
  jobId?: string
  reclaimedExpired?: boolean
  durationMs?: number
  error?: string
}

const POSTGRES_DATABASE_URL_ENV = 'AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_DATABASE_URL'
const REDIS_URL_ENV = 'AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_URL'
const RUNTIME_MODEL_API_KEY_ENV = 'AI_PLAYER_RUNTIME_MODEL_API_KEY'
const RUNTIME_MODEL_BASE_URL_ENV = 'AI_PLAYER_RUNTIME_MODEL_BASE_URL'
const RUNTIME_MODEL_NAME_ENV = 'AI_PLAYER_RUNTIME_MODEL'
const MODEL_DISPATCH_REDIS_KEY_PREFIX_ENV = 'AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_KEY_PREFIX'
const MODEL_MAX_CONCURRENCY_ENV = 'AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY'
const MODEL_QUEUE_LIMIT_ENV = 'AI_PLAYER_RUNTIME_MODEL_QUEUE_LIMIT'
const MODEL_BACKGROUND_PATROL_THROTTLE_MS_ENV = 'AI_PLAYER_RUNTIME_MODEL_BACKGROUND_PATROL_THROTTLE_MS'
const MODEL_RATE_LIMIT_BACKOFF_MS_ENV = 'AI_PLAYER_RUNTIME_MODEL_RATE_LIMIT_BACKOFF_MS'
const MODEL_CIRCUIT_FAILURE_THRESHOLD_ENV = 'AI_PLAYER_RUNTIME_MODEL_CIRCUIT_FAILURE_THRESHOLD'
const MODEL_CIRCUIT_BACKOFF_MS_ENV = 'AI_PLAYER_RUNTIME_MODEL_CIRCUIT_BACKOFF_MS'
const MODEL_DISPATCH_OWNER_ID_ENV = 'AI_PLAYER_RUNTIME_MODEL_DISPATCH_OWNER_ID'
const PROVIDER_ACCOUNT_STORE_PATH_ENV = 'AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH'
const PROVIDER_BUDGET_GATE_URL_ENV = 'AI_PLAYER_PROVIDER_BUDGET_GATE_URL'
const PROVIDER_BUDGET_GATE_HMAC_SECRET_ENV = 'AI_PLAYER_PROVIDER_BUDGET_GATE_HMAC_SECRET'
const PROVIDER_BUDGET_GATE_FAIL_OPEN_ENV = 'AI_PLAYER_PROVIDER_BUDGET_GATE_FAIL_OPEN'
const PROVIDER_ACCOUNT_LEDGER_RETENTION_LIMIT = 1_000
const PROVIDER_ACCOUNT_LIST_READ_MODEL_LIMIT = 500

const LOCAL_ENV_FILE_ARG = '--dispatch-env-file'
const LEGACY_LOCAL_ENV_FILE_ARG = '--env-file'
const LOCAL_ENV_FILE_ENV = 'AI_PLAYER_RUNTIME_MODEL_DISPATCH_ENV_FILE'
const LOCAL_ENV_FILE_ALLOWED_NAMES = new Set([
  POSTGRES_DATABASE_URL_ENV,
  'DATABASE_URL',
  REDIS_URL_ENV,
  'REDIS_URL',
  MODEL_DISPATCH_REDIS_KEY_PREFIX_ENV,
])
const REDIS_ONLY_LOCAL_DEFAULTS_ARG = '--redis-only-local-defaults'
const DEFAULT_REDIS_ONLY_LOCAL_URL = 'redis://127.0.0.1:6379'
const DEFAULT_REDIS_ONLY_LOCAL_KEY_PREFIX = 'ai:runtime:model:dispatch:local'

function readArg(name: string): string | null {
  const prefix = `${name}=`
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : null
}

function hasArg(name: string) {
  return process.argv.includes(name)
}

function readEnvFileArg() {
  const fromArg = readArg(LOCAL_ENV_FILE_ARG) ?? readArg(LEGACY_LOCAL_ENV_FILE_ARG)
  if (fromArg) {
    return fromArg
  }
  return process.env[LOCAL_ENV_FILE_ENV]?.trim() || null
}

function readPostgresDatabaseUrl() {
  const value = process.env[POSTGRES_DATABASE_URL_ENV]?.trim() || process.env.DATABASE_URL?.trim()
  if (!value) {
    throw new Error(`${POSTGRES_DATABASE_URL_ENV} or DATABASE_URL is required`)
  }
  return value
}

function readRedisUrl() {
  const value = process.env[REDIS_URL_ENV]?.trim() || process.env.REDIS_URL?.trim()
  if (!value) {
    throw new Error(`${REDIS_URL_ENV} or REDIS_URL is required`)
  }
  return value
}

function envPresence(name: string) {
  return process.env[name]?.trim() ? 'present' : 'missing'
}

function isLocalHost(host: string | null) {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

function describeConnectionUrl(value: string | null, kind: StoreKind): ConnectionUrlDescription {
  if (!value) {
    return {
      status: 'missing',
      scheme: null,
      host: null,
      port: null,
      path: null,
      database: null,
      databaseIndex: null,
      redacted: null,
      localHostHint: null,
    }
  }

  try {
    const parsed = new URL(value)
    const scheme = parsed.protocol.replace(/:$/, '') || null
    const host = parsed.hostname || null
    const port = parsed.port || null
    const path = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : null
    return {
      status: 'parseable',
      scheme,
      host,
      port,
      path,
      database: kind === 'postgres' && path ? path.replace(/^\/+/, '') : null,
      databaseIndex: kind === 'redis' && path ? path.replace(/^\/+/, '') : null,
      redacted: scheme && host
        ? `${scheme}://<redacted>@${host}${port ? `:${port}` : ''}${path ?? ''}`
        : '<redacted>',
      localHostHint: isLocalHost(host),
    }
  } catch {
    return {
      status: 'unparseable',
      scheme: null,
      host: null,
      port: null,
      path: null,
      database: null,
      databaseIndex: null,
      redacted: '<redacted>',
      localHostHint: null,
    }
  }
}

function toSafeRelativePath(input: string) {
  const resolved = resolve(process.cwd(), input)
  const relativePath = relative(process.cwd(), resolved)
  return relativePath && !relativePath.startsWith('..') && !resolve(relativePath).startsWith('..')
    ? relativePath.replace(/\\/g, '/')
    : '<outside-workspace>'
}

function parseLocalEnvFileValue(raw: string) {
  const trimmed = raw.trim()
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    const inner = trimmed.slice(1, -1)
    return trimmed.startsWith("'")
      ? inner.replace(/''/g, "'")
      : inner.replace(/\\"/g, '"')
  }
  return trimmed
}

function parseLocalEnvFileLine(line: string) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return null
  }
  const powershellMatch = /^\$env:([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(trimmed)
  if (powershellMatch) {
    return {
      name: powershellMatch[1],
      value: parseLocalEnvFileValue(powershellMatch[2] ?? ''),
    }
  }
  const dotenvMatch = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(trimmed)
  if (dotenvMatch) {
    return {
      name: dotenvMatch[1],
      value: parseLocalEnvFileValue(dotenvMatch[2] ?? ''),
    }
  }
  return null
}

function loadLocalEnvFile() {
  const envFilePath = readEnvFileArg()
  if (!envFilePath) {
    return {
      status: 'not_requested',
      path: null,
      loadedEnvNames: [] as string[],
      ignoredEnvNames: [] as string[],
    }
  }
  const safePath = toSafeRelativePath(envFilePath)
  if (!existsSync(envFilePath)) {
    return {
      status: 'missing',
      path: safePath,
      loadedEnvNames: [] as string[],
      ignoredEnvNames: [] as string[],
    }
  }

  const loadedEnvNames: string[] = []
  const ignoredEnvNames: string[] = []
  const lines = readFileSync(envFilePath, 'utf-8').split(/\r?\n/)
  for (const line of lines) {
    const parsed = parseLocalEnvFileLine(line)
    if (!parsed) {
      continue
    }
    if (!LOCAL_ENV_FILE_ALLOWED_NAMES.has(parsed.name)) {
      ignoredEnvNames.push(parsed.name)
      continue
    }
    process.env[parsed.name] = parsed.value
    loadedEnvNames.push(parsed.name)
  }
  return {
    status: 'loaded',
    path: safePath,
    loadedEnvNames: Array.from(new Set(loadedEnvNames)).sort(),
    ignoredEnvNames: Array.from(new Set(ignoredEnvNames)).sort(),
  }
}

type LocalEnvFileLoadResult = ReturnType<typeof loadLocalEnvFile>
type RedisOnlyLocalDefaultsResult = ReturnType<typeof applyRedisOnlyLocalDefaults>

function applyRedisOnlyLocalDefaults() {
  if (!hasArg(REDIS_ONLY_LOCAL_DEFAULTS_ARG)) {
    return {
      status: 'not_requested',
      appliedEnvNames: [] as string[],
      redisUrlEnv: REDIS_URL_ENV,
      redisKeyPrefixEnv: MODEL_DISPATCH_REDIS_KEY_PREFIX_ENV,
      defaultRedisUrl: describeConnectionUrl(DEFAULT_REDIS_ONLY_LOCAL_URL, 'redis'),
      defaultRedisKeyPrefix: DEFAULT_REDIS_ONLY_LOCAL_KEY_PREFIX,
    }
  }

  const appliedEnvNames: string[] = []
  if (!process.env[REDIS_URL_ENV]?.trim() && !process.env.REDIS_URL?.trim()) {
    process.env[REDIS_URL_ENV] = DEFAULT_REDIS_ONLY_LOCAL_URL
    appliedEnvNames.push(REDIS_URL_ENV)
  }
  if (!process.env[MODEL_DISPATCH_REDIS_KEY_PREFIX_ENV]?.trim()) {
    process.env[MODEL_DISPATCH_REDIS_KEY_PREFIX_ENV] = DEFAULT_REDIS_ONLY_LOCAL_KEY_PREFIX
    appliedEnvNames.push(MODEL_DISPATCH_REDIS_KEY_PREFIX_ENV)
  }

  return {
    status: 'applied',
    appliedEnvNames: appliedEnvNames.sort(),
    redisUrlEnv: REDIS_URL_ENV,
    redisKeyPrefixEnv: MODEL_DISPATCH_REDIS_KEY_PREFIX_ENV,
    defaultRedisUrl: describeConnectionUrl(DEFAULT_REDIS_ONLY_LOCAL_URL, 'redis'),
    defaultRedisKeyPrefix: DEFAULT_REDIS_ONLY_LOCAL_KEY_PREFIX,
  }
}

function resolveEnvBinding(store: StoreKind, primaryEnv: string, fallbackEnv: string) {
  const primaryValue = process.env[primaryEnv]?.trim() || ''
  const fallbackValue = process.env[fallbackEnv]?.trim() || ''
  const selectedEnv = primaryValue ? primaryEnv : fallbackValue ? fallbackEnv : null
  const selectedValue = primaryValue || fallbackValue || null
  const status = selectedEnv ? 'ready' : 'missing'
  return {
    store,
    status,
    primaryEnv,
    fallbackEnv,
    selectedEnv,
    presence: {
      [primaryEnv]: envPresence(primaryEnv) as EnvPresence,
      [fallbackEnv]: envPresence(fallbackEnv) as EnvPresence,
    },
    missingEnvNames: selectedEnv ? [] : [primaryEnv, fallbackEnv],
    connection: describeConnectionUrl(selectedValue, store),
  }
}

function readBoundedIntArg(name: string, fallback: number, min: number, max: number) {
  const parsed = Number(readArg(name) ?? fallback)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(min, Math.min(max, Math.trunc(parsed)))
}

function readWorkerCount() {
  return readBoundedIntArg('--workers', 4, 2, 32)
}

function readJobCount() {
  return readBoundedIntArg('--jobs', 2, 1, 128)
}

function readExpiredJobCount() {
  return readBoundedIntArg('--expired-jobs', 1, 1, 64)
}

function readLongRunJobCount() {
  return readBoundedIntArg('--jobs', 128, 1, 50_000)
}

function readLongRunDurationMs() {
  return readBoundedIntArg('--duration-ms', 30_000, 1_000, 28_800_000)
}

function readLongRunWorkMs() {
  return readBoundedIntArg('--work-ms', 2, 0, 5_000)
}

function readLongRunHeartbeatMs() {
  return readBoundedIntArg('--heartbeat-ms', 1_000, 50, 30_000)
}

function readProviderSoakRequestCount() {
  const requests = readArg('--requests')
  if (requests !== null) {
    return readBoundedIntArg('--requests', 16, 1, 50_000)
  }
  return readBoundedIntArg('--jobs', 16, 1, 50_000)
}

function readProviderSoakEnqueueIntervalMs() {
  return readBoundedIntArg('--enqueue-interval-ms', 25, 0, 60_000)
}

function readProviderSoakLiveBaseUrl() {
  return process.env[RUNTIME_MODEL_BASE_URL_ENV]?.trim()
    || process.env.LLM_RELAY_URL?.trim()
    || 'https://api.deepseek.com'
}

function readProviderSoakLiveModel() {
  return process.env[RUNTIME_MODEL_NAME_ENV]?.trim()
    || process.env.LLM_RELAY_MODEL?.trim()
    || DEFAULT_AI_PLAYER_RUNTIME_MODEL
}

function readProviderSoakLiveApiKey() {
  return process.env[RUNTIME_MODEL_API_KEY_ENV]?.trim()
    || process.env.LLM_RELAY_API_KEY?.trim()
    || ''
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function writeJson(value: unknown) {
  console.log(JSON.stringify(value))
}

function smokeId(runId: string, segment: string) {
  return `${runId}:${segment}`
}

function resolveProviderLabel(baseUrl: string) {
  try {
    return new URL(baseUrl).host || 'relay'
  } catch {
    return 'relay'
  }
}

function duplicateValues(values: readonly string[]) {
  const counts = new Map<string, number>()
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort()
}

function percentileDurationMs(values: readonly number[], percentile: number) {
  const durations = values
    .filter((duration): duration is number => Number.isFinite(duration))
    .sort((a, b) => a - b)
  if (durations.length === 0) {
    return 0
  }
  return durations[Math.max(0, Math.ceil(durations.length * percentile) - 1)]
}

function p95DurationMs(results: readonly WorkerResult[]) {
  return percentileDurationMs(results
    .map((result) => result.durationMs)
    .filter((duration): duration is number => typeof duration === 'number' && Number.isFinite(duration)), 0.95)
}

async function createStoreHandle(kind: StoreKind, runId: string): Promise<RuntimeStoreHandle> {
  if (kind === 'postgres') {
    const pool = new pg.Pool({
      connectionString: readPostgresDatabaseUrl(),
      max: 8,
      application_name: 'ai-player-runtime-model-dispatch-smoke',
    })
    await applyAiPlayerRuntimeModelDispatchPostgresMigration(pool)
    return {
      store: createAiPlayerRuntimeModelDispatchPostgresStore(pool),
      close: () => pool.end(),
      cleanup: async () => {
        const pattern = `${runId}:%`
        await pool.query(
          'DELETE FROM ai_runtime_model_dispatch_jobs WHERE job_id LIKE $1 OR lease_id LIKE $1 OR owner_id LIKE $1 OR ai_player_id LIKE $1',
          [pattern],
        )
        await pool.query(
          'DELETE FROM ai_runtime_model_dispatch_leases WHERE lease_id LIKE $1 OR owner_id LIKE $1 OR ai_player_id LIKE $1',
          [pattern],
        )
        await pool.query(
          `DELETE FROM ai_runtime_model_dispatch_rate_buckets
           WHERE provider IN (
             'dispatch-soak-rate-limit.local',
             'dispatch-soak-circuit.local',
             'dispatch-soak-success.local'
           )`,
        )
      },
    }
  }

  const redisStore = createAiPlayerRuntimeModelDispatchRedisStoreFromUrl(readRedisUrl(), {
    keyPrefix: `ai:runtime:model:dispatch:smoke:${runId}`,
  })
  return {
    store: redisStore,
    close: () => redisStore.close(),
    cleanup: async () => {
      // Redis smoke keys are isolated by a run-specific prefix and carry job retention TTL.
    },
  }
}

function parseWorkerJson(stdout: string): WorkerResult {
  const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const last = lines.at(-1)
  if (!last) {
    return { ok: false, workerId: 'unknown', mode: 'unknown', error: 'worker_stdout_empty' }
  }
  return JSON.parse(last) as WorkerResult
}

async function spawnWorker(kind: StoreKind, mode: string, runId: string, workerId: string, extraArgs: string[] = []) {
  const command = process.execPath
  const tsxCliPath = join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs')
  const scriptPath = fileURLToPath(import.meta.url)
  const child = spawn(command, [
    tsxCliPath,
    scriptPath,
    kind === 'postgres' ? '--postgres-worker' : '--redis-worker',
    `--worker-mode=${mode}`,
    `--worker-id=${workerId}`,
    `--run-id=${runId}`,
    ...extraArgs,
  ], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk: Buffer) => {
    stdout += chunk.toString('utf-8')
  })
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf-8')
  })
  const exitCode = await new Promise<number | null>((resolve) => {
    child.on('close', resolve)
  })
  if (exitCode !== 0) {
    return {
      ok: false,
      workerId,
      mode,
      error: stderr.trim() || `worker_exit_${exitCode}`,
    }
  }
  return parseWorkerJson(stdout)
}

async function enqueueSmokeJob(
  store: AiPlayerRuntimeModelAsyncDispatchStore,
  runId: string,
  jobName: string,
  priority: number,
  nowMs = Date.now(),
) {
  return store.enqueueJob({
    jobId: smokeId(runId, `job:${jobName}`),
    leaseId: smokeId(runId, `lease:${jobName}`),
    ownerId: smokeId(runId, 'main'),
    aiPlayerId: smokeId(runId, 'ai-player'),
    lane: 'background_patrol',
    priority,
    provider: 'dispatch-smoke',
    model: 'shared-store-smoke',
    keyFingerprint: null,
    ttlMs: 5_000,
    nowMs,
  })
}

async function runClaimLeaseRace(kind: StoreKind, runId: string, workers: number) {
  const results = await Promise.all(Array.from({ length: workers }, (_, index) => spawnWorker(
    kind,
    'claim-lease-race',
    runId,
    smokeId(runId, `lease-worker-${index}`),
  )))
  const successCount = results.filter((result) => result.ok).length
  if (successCount !== 1) {
    throw new Error(`expected exactly one shared lease winner, got ${successCount}`)
  }
  return { successCount, attemptedWorkers: workers }
}

async function runQueueClaimRace(
  kind: StoreKind,
  runId: string,
  handle: RuntimeStoreHandle,
  workers: number,
  jobCount: number,
) {
  const enqueuedJobIds: string[] = []
  for (let index = 0; index < jobCount; index += 1) {
    const jobName = `priority-${String(index).padStart(3, '0')}`
    await enqueueSmokeJob(handle.store, runId, jobName, 10_000 - index)
    enqueuedJobIds.push(smokeId(runId, `job:${jobName}`))
  }
  const results = await Promise.all(Array.from({ length: workers }, (_, index) => spawnWorker(
    kind,
    'claim-next',
    runId,
    smokeId(runId, `queue-worker-${index}`),
  )))
  const claimedJobIds = results.filter((result) => result.ok && result.jobId).map((result) => result.jobId as string)
  const uniqueClaimedJobIds = new Set(claimedJobIds)
  const duplicateClaimedJobIds = duplicateValues(claimedJobIds)
  const expectedClaimedJobCount = Math.min(jobCount, workers)
  const expectedClaimedJobIds = enqueuedJobIds.slice(0, expectedClaimedJobCount)
  const missingClaimedJobIds = expectedClaimedJobIds.filter((jobId) => !uniqueClaimedJobIds.has(jobId))
  if (duplicateClaimedJobIds.length > 0) {
    throw new Error(`expected unique queue job claims, got duplicates ${duplicateClaimedJobIds.join(',')}`)
  }
  if (uniqueClaimedJobIds.size !== expectedClaimedJobCount) {
    throw new Error(`expected ${expectedClaimedJobCount} unique claimed queue jobs, got ${Array.from(uniqueClaimedJobIds).join(',')}`)
  }
  if (missingClaimedJobIds.length > 0) {
    throw new Error(`expected priority queue jobs to be claimed first, missing ${missingClaimedJobIds.join(',')}`)
  }
  if (!uniqueClaimedJobIds.has(enqueuedJobIds[0])) {
    throw new Error('expected high priority job to be claimed')
  }
  return {
    jobCount,
    expectedClaimedJobCount,
    claimedCount: uniqueClaimedJobIds.size,
    claimedJobIds: Array.from(uniqueClaimedJobIds).sort(),
    duplicateClaimedJobIds,
    missingClaimedJobIds,
    emptyWorkerCount: results.filter((result) => !result.ok && result.error === 'dispatch_queue_empty').length,
    p95ClaimDurationMs: p95DurationMs(results),
  }
}

async function runExpiredRetry(kind: StoreKind, runId: string, handle: RuntimeStoreHandle, expiredJobCount: number) {
  const expiredJobIds: string[] = []
  for (let index = 0; index < expiredJobCount; index += 1) {
    const jobName = `expired-retry-${String(index).padStart(3, '0')}`
    await enqueueSmokeJob(handle.store, runId, jobName, 50)
    const jobId = smokeId(runId, `job:${jobName}`)
    const firstClaim = await handle.store.claimJob({
      jobId,
      ownerId: smokeId(runId, `expired-owner-a-${index}`),
      ttlMs: 50,
    })
    if (!firstClaim.ok) {
      throw new Error(`expected first expired retry claim, got ${firstClaim.error}`)
    }
    expiredJobIds.push(jobId)
  }
  await sleep(100)
  const results = await Promise.all(expiredJobIds.map((_, index) => spawnWorker(
    kind,
    'claim-expired',
    runId,
    smokeId(runId, `expired-owner-b-${index}`),
    [`--job-name=expired-retry-${String(index).padStart(3, '0')}`],
  )))
  const reclaimedJobIds = results
    .filter((result) => result.ok && result.reclaimedExpired === true && result.jobId)
    .map((result) => result.jobId as string)
  const duplicateReclaimedJobIds = duplicateValues(reclaimedJobIds)
  const missingReclaimedJobIds = expiredJobIds.filter((jobId) => !reclaimedJobIds.includes(jobId))
  if (duplicateReclaimedJobIds.length > 0 || missingReclaimedJobIds.length > 0) {
    throw new Error(`expected expired jobs to be reclaimed once, duplicates=${duplicateReclaimedJobIds.join(',')} missing=${missingReclaimedJobIds.join(',')}`)
  }
  return {
    expiredJobCount,
    reclaimedCount: reclaimedJobIds.length,
    reclaimedJobIds: reclaimedJobIds.sort(),
    duplicateReclaimedJobIds,
    missingReclaimedJobIds,
    p95RetryDurationMs: p95DurationMs(results),
  }
}

async function runFixedWorkerPoolLongRun(kind: StoreKind) {
  const runId = `dispatch_long_run_${Date.now()}_${process.pid}`
  const workers = readWorkerCount()
  const jobCount = readLongRunJobCount()
  const durationLimitMs = readLongRunDurationMs()
  const workMs = readLongRunWorkMs()
  const heartbeatTtlMs = readLongRunHeartbeatMs()
  const handle = await createStoreHandle(kind, runId)
  const startedAt = Date.now()
  const deadlineAt = startedAt + durationLimitMs
  const claimDurationMs: number[] = []
  const claimedJobIds: string[] = []
  const workerErrors: string[] = []
  let activeCount = 0
  let observedMaxActive = 0
  let completedCount = 0
  let failedCount = 0
  let emptyPollCount = 0

  const updateObservedActive = (delta: number) => {
    activeCount += delta
    observedMaxActive = Math.max(observedMaxActive, activeCount)
  }

  try {
    for (let index = 0; index < jobCount; index += 1) {
      const jobName = `long-run-${String(index).padStart(6, '0')}`
      const priority = 1_000 - (index % 2_000)
      await enqueueSmokeJob(handle.store, runId, jobName, priority)
    }

    const runWorkerLoop = async (workerIndex: number) => {
      const workerId = smokeId(runId, `long-run-worker-${workerIndex}`)
      while (completedCount + failedCount < jobCount && Date.now() < deadlineAt) {
        const claimStartedAt = Date.now()
        const claim = await handle.store.claimNextJob({
          ownerId: workerId,
          ttlMs: heartbeatTtlMs,
          lanes: ['background_patrol'],
        })
        claimDurationMs.push(Date.now() - claimStartedAt)
        if (!claim.ok) {
          emptyPollCount += 1
          await sleep(10)
          continue
        }
        claimedJobIds.push(claim.job.jobId)
        updateObservedActive(1)
        try {
          const heartbeat = await handle.store.heartbeatJob({
            jobId: claim.job.jobId,
            ownerId: workerId,
            ttlMs: heartbeatTtlMs,
          })
          if (!heartbeat.ok) {
            failedCount += 1
            workerErrors.push(`${claim.job.jobId}:${heartbeat.error}`)
            await handle.store.failJob({
              jobId: claim.job.jobId,
              ownerId: workerId,
              reason: heartbeat.error,
            })
            continue
          }
          if (workMs > 0) {
            await sleep(workMs)
          }
          const completed = await handle.store.completeJob({
            jobId: claim.job.jobId,
            ownerId: workerId,
          })
          if (!completed.ok) {
            failedCount += 1
            workerErrors.push(`${claim.job.jobId}:${completed.error}`)
            continue
          }
          completedCount += 1
        } catch (error: unknown) {
          failedCount += 1
          workerErrors.push(`${claim.job.jobId}:${error instanceof Error ? error.message : String(error)}`)
          await handle.store.failJob({
            jobId: claim.job.jobId,
            ownerId: workerId,
            reason: error instanceof Error ? error.message : String(error),
          })
        } finally {
          updateObservedActive(-1)
        }
      }
    }

    await Promise.all(Array.from({ length: workers }, (_, index) => runWorkerLoop(index)))
    const durationMs = Date.now() - startedAt
    const duplicateClaimedJobIds = duplicateValues(claimedJobIds)
    const snapshot = await handle.store.snapshot()
    const remainingJobs = snapshot.queueJobs
      .filter((job) => job.jobId.startsWith(smokeId(runId, 'job:')) && job.state !== 'completed')
      .length
    await handle.cleanup()

    const result = {
      ok: duplicateClaimedJobIds.length === 0 && completedCount === jobCount && failedCount === 0,
      store: kind,
      command: 'long-run',
      runId,
      workers,
      config: {
        workers,
        jobCount,
        durationLimitMs,
        workMs,
        heartbeatTtlMs,
      },
      jobsEnqueued: jobCount,
      claimedCount: claimedJobIds.length,
      completedCount,
      failedCount,
      duplicateClaimedJobIds,
      remainingJobs,
      workerErrors: workerErrors.slice(0, 20),
      emptyPollCount,
      observedMaxActive,
      durationMs,
      throughputJobsPerSecond: durationMs > 0 ? Number((completedCount / (durationMs / 1_000)).toFixed(2)) : 0,
      p50ClaimDurationMs: percentileDurationMs(claimDurationMs, 0.5),
      p95ClaimDurationMs: percentileDurationMs(claimDurationMs, 0.95),
      p99ClaimDurationMs: percentileDurationMs(claimDurationMs, 0.99),
    }
    if (!result.ok) {
      throw new Error(`long-run dispatch invariant failed: ${JSON.stringify(result)}`)
    }
    writeJson(result)
  } finally {
    await handle.close()
  }
}

type ProviderSoakAttemptResult = {
  ok: boolean
  index: number
  lane: string
  aiPlayerId: string
  requestId: string
  selectedProvider?: string
  selectedModel?: string
  usageTotalTokens?: number | null
  failureReasons: string[]
  proposalCount: number
  error?: string
}

function sanitizeProviderSoakDiagnostic(value: string | undefined) {
  if (!value) {
    return undefined
  }
  return value
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, 'sk-<redacted>')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer <redacted>')
    .replace(/[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g, 'jwt-<redacted>')
    .slice(0, 240)
}

function summarizeProviderSoakAttemptResult(attempt: ProviderSoakAttemptResult) {
  return {
    index: attempt.index,
    lane: attempt.lane,
    ok: attempt.ok,
    selectedProvider: attempt.selectedProvider,
    selectedModel: attempt.selectedModel,
    usageTotalTokens: attempt.usageTotalTokens,
    proposalCount: attempt.proposalCount,
    failureReasons: attempt.failureReasons
      .map((reason) => sanitizeProviderSoakDiagnostic(reason) ?? 'unknown_provider_soak_failure'),
    error: sanitizeProviderSoakDiagnostic(attempt.error),
  }
}

type ProviderSoakCandidateConfig = {
  liveProvider: boolean
  liveApiKey: string
  liveBaseUrl: string
  liveModel: string
}

function buildProviderSoakTarget(label: string, baseUrl: string, model: string, apiKeys: string[]): ResolvedPlannerTarget {
  return {
    source: 'gateway',
    label,
    protocol: 'openai_compat',
    baseUrl,
    apiKeys,
    model,
  }
}

function buildProviderSoakCandidates(config: ProviderSoakCandidateConfig): AiPlayerRuntimeModelTargetCandidate[] {
  const candidates: AiPlayerRuntimeModelTargetCandidate[] = [
    {
      target: buildProviderSoakTarget(
        'dispatch-soak-rate-limit',
        'https://dispatch-soak-rate-limit.local/v1',
        'dispatch-soak-rate-limit',
        ['dispatch_soak_rate_limit_key'],
      ),
      source: 'env',
      byokSource: 'none',
      priority: 100,
      secretSource: 'provider_soak_mock',
      lastFailureReason: null,
    },
    {
      target: buildProviderSoakTarget(
        'dispatch-soak-circuit',
        'https://dispatch-soak-circuit.local/v1',
        'dispatch-soak-circuit',
        ['dispatch_soak_circuit_key'],
      ),
      source: 'env',
      byokSource: 'none',
      priority: 90,
      secretSource: 'provider_soak_mock',
      lastFailureReason: null,
    },
  ]
  if (config.liveProvider) {
    candidates.push({
      target: buildProviderSoakTarget(
        'dispatch-soak-live-provider',
        config.liveBaseUrl.replace(/\/+$/, ''),
        config.liveModel,
        [config.liveApiKey],
      ),
      source: 'env',
      byokSource: 'none',
      priority: 80,
      secretSource: RUNTIME_MODEL_API_KEY_ENV,
      lastFailureReason: null,
    })
    return candidates
  }
  candidates.push({
    target: buildProviderSoakTarget(
      'dispatch-soak-success',
      'https://dispatch-soak-success.local/v1',
      'dispatch-soak-success',
      ['dispatch_soak_success_key'],
    ),
    source: 'env',
    byokSource: 'none',
    priority: 80,
    secretSource: 'provider_soak_mock',
    lastFailureReason: null,
  })
  return candidates
}

function readUsageTotalTokens(usage: unknown): number | null {
  if (!usage || typeof usage !== 'object') {
    return null
  }
  const raw = (usage as { total_tokens?: unknown; totalTokens?: unknown }).total_tokens
    ?? (usage as { totalTokens?: unknown }).totalTokens
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function buildProviderSoakMockPayload(model: string, requestIndex: number) {
  const promptTokens = 24 + (requestIndex % 7)
  const completionTokens = 8 + (requestIndex % 3)
  return {
    id: `dispatch_soak_completion_${requestIndex}`,
    object: 'chat.completion',
    model,
    choices: [{
      index: 0,
      finish_reason: 'stop',
      message: {
        role: 'assistant',
        content: JSON.stringify({
          summary: `dispatch soak sample ${requestIndex}`,
          proposals: [],
          deferReason: 'dispatch soak verification sample',
          needsHumanReview: true,
        }),
      },
    }],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
      estimated_cost_usd: 0.00001,
    },
  }
}

function extractRequestModelAndIndex(init?: RequestInit) {
  let model = 'dispatch-soak-success'
  let requestIndex = 0
  if (typeof init?.body === 'string') {
    try {
      const parsed = JSON.parse(init.body) as {
        model?: unknown
        messages?: Array<{ role?: unknown; content?: unknown }>
      }
      if (typeof parsed.model === 'string' && parsed.model.trim()) {
        model = parsed.model
      }
      const lastContent = parsed.messages?.at(-1)?.content
      if (typeof lastContent === 'string') {
        const observation = JSON.parse(lastContent) as { smokeRequestIndex?: unknown }
        const parsedIndex = Number(observation.smokeRequestIndex)
        if (Number.isFinite(parsedIndex)) {
          requestIndex = Math.max(0, Math.trunc(parsedIndex))
        }
      }
    } catch {
      // Best-effort metadata only; the response path still returns a safe mock payload.
    }
  }
  return { model, requestIndex }
}

function buildProviderSoakFetchImpl(config: ProviderSoakCandidateConfig): typeof fetch {
  return async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Promise<Response> => {
    const url = String(input)
    const { model, requestIndex } = extractRequestModelAndIndex(init)
    if (model === 'dispatch-soak-rate-limit') {
      return new Response(JSON.stringify({ error: { message: 'dispatch soak injected rate limit' } }), {
        status: 429,
        headers: {
          'content-type': 'application/json',
          'retry-after': '60',
        },
      })
    }
    if (model === 'dispatch-soak-circuit') {
      return new Response(JSON.stringify({ error: { message: 'dispatch soak injected provider failure' } }), {
        status: 500,
        headers: {
          'content-type': 'application/json',
        },
      })
    }
    if (config.liveProvider && url.startsWith(config.liveBaseUrl.replace(/\/+$/, ''))) {
      return fetch(input, init)
    }
    return new Response(JSON.stringify(buildProviderSoakMockPayload(model, requestIndex)), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    })
  }
}

function buildProviderSoakObservation(runId: string, index: number): AiPlayerRuntimeProposalObservation {
  const patrol = index % 3 !== 0
  const lane = patrol ? 'background_patrol' : 'interactive_chat'
  const aiPlayerId = smokeId(runId, `ai-player-${index % 8}`)
  return {
    aiPlayerId,
    runtime: {
      aiPlayerId,
      factionId: smokeId(runId, 'faction'),
      governorPlayerId: smokeId(runId, 'governor'),
      modelName: 'dispatch-soak',
      modelSource: 'env',
      online: true,
      governorOnline: true,
      contextDocuments: [{
        documentId: smokeId(runId, `identity-${index % 8}`),
        title: 'dispatch soak identity',
        kind: 'identity',
        content: 'backend dispatch soak verification document',
      }],
      resourceTransfer: {
        canTransferNow: true,
      },
    },
    chatCommand: patrol
      ? undefined
      : {
          message: `dispatch soak chat request ${index}`,
        },
    requestContext: {
      queueLane: lane,
      queuePriority: patrol ? 10 : 100,
    },
    world: {
      tick: index,
    },
    receipts: [],
    failures: [],
    smokeRequestIndex: index,
  } as AiPlayerRuntimeProposalObservation & { smokeRequestIndex: number }
}

async function runProviderSoakAttempt(
  runId: string,
  index: number,
  candidates: AiPlayerRuntimeModelTargetCandidate[],
  fetchImpl: typeof fetch,
): Promise<ProviderSoakAttemptResult> {
  const observation = buildProviderSoakObservation(runId, index)
  const runtime = observation.runtime as { factionId?: string; governorPlayerId?: string }
  const factionId = runtime.factionId ?? smokeId(runId, 'faction')
  const governorPlayerId = runtime.governorPlayerId ?? smokeId(runId, 'governor')
  const idempotencyKey = smokeId(runId, `provider-soak-attempt-${index}`)
  const lane = observation.requestContext?.queueLane ?? 'background_patrol'
  const result = await requestAiPlayerRuntimeProposalFromCandidateTargets({
    candidates,
    observation,
    fetchImpl,
    reserveCandidateAttempt: async (candidate, preflight) => {
      const budgetReservation = await reserveAiPlayerProviderBudget({
        aiPlayerId: observation.aiPlayerId,
        factionId,
        governorPlayerId,
        model: candidate.target.model,
        provider: resolveProviderLabel(candidate.target.baseUrl),
        source: candidate.source,
        byokSource: candidate.byokSource,
        budgetTier: lane === 'interactive_chat' ? 'economy_chat' : 'strict_action',
        queueRunId: runId,
        idempotencyKey: `${idempotencyKey}:${candidate.target.model}`,
      })
      if (!budgetReservation.ok) {
        return budgetReservation
      }
      const creditReservation = reserveAiPlayerProviderAiCommandCredits({
        accountId: governorPlayerId,
        factionId,
        usage: preflight.usage,
        aiPlayerId: observation.aiPlayerId,
        reason: 'provider_request_preflight',
        queueRunId: runId,
        idempotencyKey: `${idempotencyKey}:${candidate.target.model}:ai-command-credit`,
      })
      if (!creditReservation.ok) {
        await releaseAiPlayerProviderBudgetReservation(budgetReservation.reservationId)
        return {
          ok: false,
          error: creditReservation.error,
          reservationId: budgetReservation.reservationId,
          budgetWindowKey: budgetReservation.budgetWindowKey,
          limitMode: budgetReservation.limitMode,
        }
      }
      return {
        ...budgetReservation,
        aiCommandCreditReservationId: creditReservation.reservationId,
        aiCommandCreditReservedCredits: creditReservation.amountCredits,
      }
    },
    commitCandidateAttempt: async (_candidate, candidateResult, reservation) => {
      await commitAiPlayerProviderBudgetReservation(reservation?.reservationId, {
        ok: candidateResult.ok,
        usage: candidateResult.ok ? candidateResult.usage : undefined,
        error: candidateResult.ok ? undefined : candidateResult.error,
      })
      if (!candidateResult.ok) {
        releaseAiPlayerProviderAiCommandCreditReservation(reservation?.aiCommandCreditReservationId)
      }
    },
  })
  const failureReasons = result.providerFallbackFailures?.map((failure) => failure.error) ?? []
  const requestId = recordAiPlayerProviderModelRequestAccounting({
    ok: result.ok,
    requestId: smokeId(runId, `provider-request-${index}`),
    aiPlayerId: observation.aiPlayerId,
    factionId,
    governorPlayerId,
    selectedProvider: result.ok ? result.selectedProvider : undefined,
    providerFallbackFailures: result.providerFallbackFailures,
    usage: result.ok ? result.usage : undefined,
    error: result.ok ? undefined : result.error,
    queueRunId: runId,
    idempotencyKey,
    budgetWindowKey: result.ok ? result.budgetWindowKey : undefined,
    budgetReservationId: result.ok ? result.budgetReservationId : undefined,
    aiCommandCreditReservationId: result.ok ? result.aiCommandCreditReservationId : undefined,
  })
  return {
    ok: result.ok,
    index,
    lane,
    aiPlayerId: observation.aiPlayerId,
    requestId,
    selectedProvider: result.ok ? result.selectedProvider?.provider : undefined,
    selectedModel: result.ok ? result.selectedProvider?.model : undefined,
    usageTotalTokens: result.ok ? readUsageTotalTokens(result.usage) : null,
    failureReasons,
    proposalCount: result.ok ? result.proposalRequests.length : 0,
    error: result.ok ? undefined : result.error,
  }
}

function summarizeProviderSoakQueue(
  queue: Awaited<ReturnType<typeof getAiPlayerRuntimeModelRequestQueueStatusAsync>>,
) {
  return {
    maxConcurrency: queue.maxConcurrency,
    queueLimit: queue.queueLimit,
    activeRequests: queue.activeRequests,
    queuedRequests: queue.queuedRequests,
    totalStartedRequests: queue.totalStartedRequests,
    totalCompletedRequests: queue.totalCompletedRequests,
    totalRejectedRequests: queue.totalRejectedRequests,
    lanes: queue.lanes.map((lane) => ({
      lane: lane.lane,
      priority: lane.priority,
      totalStartedRequests: lane.totalStartedRequests,
      totalCompletedRequests: lane.totalCompletedRequests,
      totalRejectedRequests: lane.totalRejectedRequests,
      p95WaitMs: lane.p95WaitMs,
    })),
    endpoints: queue.endpoints.map((endpoint) => ({
      provider: endpoint.provider,
      model: endpoint.model,
      keyFingerprint: endpoint.keyFingerprint,
      totalStartedRequests: endpoint.totalStartedRequests,
      totalCompletedRequests: endpoint.totalCompletedRequests,
      totalFailedRequests: endpoint.totalFailedRequests,
      totalRateLimitedRequests: endpoint.totalRateLimitedRequests,
      averageLatencyMs: endpoint.averageLatencyMs,
      p50LatencyMs: endpoint.p50LatencyMs,
      p95LatencyMs: endpoint.p95LatencyMs,
      consecutiveFailures: endpoint.consecutiveFailures,
      circuitState: endpoint.circuitState,
      backoffUntil: endpoint.backoffUntil,
      rateBucket: endpoint.rateBucket,
    })),
    jobs: queue.jobs.map((job) => ({
      lane: job.lane,
      model: job.model,
      state: job.state,
      priority: job.priority,
      failureReason: job.failureReason,
    })),
    leases: queue.leases.map((lease) => ({
      lane: lease.lane,
      model: lease.model,
      state: lease.state,
      ageMs: lease.ageMs,
    })),
  }
}

function ensureProviderSoakInvariants(
  result: {
    liveProvider: boolean
    successCount: number
    failureCount: number
    ledgerCount: number
    tokenSummaryRequestCount: number
    tokenBalanceConsumedRuns: number
    failureReasons: string[]
    queue: Awaited<ReturnType<typeof getAiPlayerRuntimeModelRequestQueueStatusAsync>>
  },
) {
  const hasRateLimit = result.failureReasons.includes('model_request_failed_429')
  const hasBackoff = result.failureReasons.includes('model_provider_backoff_active')
  const hasChatLane = result.queue.lanes.some((lane) => lane.lane === 'interactive_chat' && lane.totalStartedRequests > 0)
  const hasPatrolLane = result.queue.lanes.some((lane) => lane.lane === 'background_patrol' && lane.totalStartedRequests > 0)
  const hasRateLimitedEndpoint = result.queue.endpoints.some((endpoint) => endpoint.totalRateLimitedRequests > 0)
  const hasOpenCircuitEndpoint = result.queue.endpoints.some((endpoint) => endpoint.circuitState === 'open' || endpoint.consecutiveFailures > 0)

  if (result.successCount === 0) {
    throw new Error('expected provider soak to produce at least one successful model request')
  }
  if (!hasRateLimit) {
    throw new Error('expected provider soak to include model_request_failed_429 fallback evidence')
  }
  if (!hasBackoff) {
    throw new Error('expected provider soak to include model_provider_backoff_active fallback evidence')
  }
  if (!hasChatLane || !hasPatrolLane) {
    throw new Error('expected provider soak to start both interactive_chat and background_patrol lanes')
  }
  if (!hasRateLimitedEndpoint || !hasOpenCircuitEndpoint) {
    throw new Error('expected request queue read model to expose rate-limited and circuit/backoff endpoints')
  }
  const expectedLedgerReadModelCount = Math.min(
    result.successCount,
    PROVIDER_ACCOUNT_LIST_READ_MODEL_LIMIT,
  )
  if (result.ledgerCount !== expectedLedgerReadModelCount) {
    throw new Error(`expected successful ledger read-model count ${expectedLedgerReadModelCount}, got ${result.ledgerCount}`)
  }
  const expectedRetainedUsageReadModelCount = Math.min(
    result.successCount,
    PROVIDER_ACCOUNT_LEDGER_RETENTION_LIMIT,
  )
  if (result.tokenSummaryRequestCount !== expectedRetainedUsageReadModelCount) {
    throw new Error(`expected token summary request count ${expectedRetainedUsageReadModelCount}, got ${result.tokenSummaryRequestCount}`)
  }
  if (result.tokenBalanceConsumedRuns !== expectedRetainedUsageReadModelCount) {
    throw new Error(`expected token balance consumed runs ${expectedRetainedUsageReadModelCount}, got ${result.tokenBalanceConsumedRuns}`)
  }
}

function withRestoredEnv<T>(updates: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
  const previous = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(updates)) {
    previous.set(key, process.env[key])
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
  return run().finally(() => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })
}

async function runProviderSoak(kind: StoreKind) {
  const runId = `dispatch_provider_soak_${Date.now()}_${process.pid}`
  const workers = readWorkerCount()
  const requestCount = readProviderSoakRequestCount()
  const durationLimitMs = readLongRunDurationMs()
  const enqueueIntervalMs = readProviderSoakEnqueueIntervalMs()
  const liveProvider = hasArg('--live-provider')
  const isolateProviderBudgetGate = !hasArg('--with-provider-budget-gate')
  const liveApiKey = readProviderSoakLiveApiKey()
  const liveBaseUrl = readProviderSoakLiveBaseUrl().replace(/\/+$/, '')
  const liveModel = readProviderSoakLiveModel()
  if (liveProvider && !liveApiKey) {
    throw new Error(`${RUNTIME_MODEL_API_KEY_ENV} or LLM_RELAY_API_KEY is required for --live-provider`)
  }

  await withRestoredEnv({
    [MODEL_MAX_CONCURRENCY_ENV]: String(workers),
    [MODEL_QUEUE_LIMIT_ENV]: String(Math.max(workers * 4, requestCount + workers)),
    [MODEL_BACKGROUND_PATROL_THROTTLE_MS_ENV]: '250',
    [MODEL_RATE_LIMIT_BACKOFF_MS_ENV]: '60000',
    [MODEL_CIRCUIT_FAILURE_THRESHOLD_ENV]: '2',
    [MODEL_CIRCUIT_BACKOFF_MS_ENV]: '60000',
    [MODEL_DISPATCH_OWNER_ID_ENV]: smokeId(runId, 'provider-soak-owner'),
    ...(isolateProviderBudgetGate
      ? {
          [PROVIDER_BUDGET_GATE_URL_ENV]: undefined,
          [PROVIDER_BUDGET_GATE_HMAC_SECRET_ENV]: undefined,
          [PROVIDER_BUDGET_GATE_FAIL_OPEN_ENV]: undefined,
        }
      : {}),
    ...(kind === 'redis' && !process.env[MODEL_DISPATCH_REDIS_KEY_PREFIX_ENV]?.trim()
      ? { [MODEL_DISPATCH_REDIS_KEY_PREFIX_ENV]: `ai:runtime:model:dispatch:provider-soak:${runId}` }
      : {}),
  }, async () => {
    resetAiPlayerRuntimeModelDispatchStoreForTest()
    const handle = await createStoreHandle(kind, runId)
    const candidates = buildProviderSoakCandidates({
      liveProvider,
      liveApiKey,
      liveBaseUrl,
      liveModel,
    })
    const fetchImpl = buildProviderSoakFetchImpl({
      liveProvider,
      liveApiKey,
      liveBaseUrl,
      liveModel,
    })
    grantAiPlayerProviderAiCommandCredits({
      accountId: smokeId(runId, 'governor'),
      worldId: smokeId(runId, 'faction'),
      amountCredits: Math.max(10_000, requestCount * 100),
      reason: 'provider_soak_test_grant',
    })
    const startedAt = Date.now()
    const deadlineAt = startedAt + durationLimitMs
    const attempts: Array<Promise<ProviderSoakAttemptResult>> = []
    try {
      for (let index = 0; index < requestCount && Date.now() < deadlineAt; index += 1) {
        attempts.push(runProviderSoakAttempt(runId, index, candidates, fetchImpl))
        if (enqueueIntervalMs > 0 && index < requestCount - 1) {
          await sleep(enqueueIntervalMs)
        }
      }
      const attemptResults = await Promise.all(attempts)
      await flushAiPlayerProviderAccountStorePersist()
      const queue = await getAiPlayerRuntimeModelRequestQueueStatusAsync()
      const governorPlayerId = smokeId(runId, 'governor')
      const tokenSummary = listAiPlayerProviderTokenSummary({ governorPlayerId, limit: 500 })
      const tokenBalance = listAiPlayerProviderTokenBalance({ governorPlayerId, limit: 500 })
      const billingLedger = listAiPlayerProviderBillingLedger({ governorPlayerId, limit: 500 })
      const auditEvents = listAiPlayerProviderAuditEvents({ governorPlayerId, limit: 500 })
      const successCount = attemptResults.filter((attempt) => attempt.ok).length
      const failureCount = attemptResults.length - successCount
      const failureReasons = Array.from(new Set(attemptResults.flatMap((attempt) => [
        ...attempt.failureReasons,
        ...(attempt.error ? [attempt.error] : []),
      ]).map((reason) => sanitizeProviderSoakDiagnostic(reason) ?? 'unknown_provider_soak_failure'))).sort()
      const tokenSummaryRequestCount = tokenSummary.items.reduce((sum, item) => sum + item.requestCount, 0)
      const tokenBalanceConsumedRuns = tokenBalance.items.reduce((sum, item) => sum + item.consumedRuns, 0)
      const invariantErrors: string[] = []
      try {
        ensureProviderSoakInvariants({
          liveProvider,
          successCount,
          failureCount,
          ledgerCount: billingLedger.count,
          tokenSummaryRequestCount,
          tokenBalanceConsumedRuns,
          failureReasons,
          queue,
        })
      } catch (error) {
        invariantErrors.push(
          sanitizeProviderSoakDiagnostic(error instanceof Error ? error.message : String(error))
            ?? 'provider_soak_invariant_failed',
        )
      }
      await handle.cleanup()
      const durationMs = Date.now() - startedAt
      writeJson({
        ok: invariantErrors.length === 0,
        store: kind,
        command: 'provider-soak',
        runId,
        liveProvider,
        ...(invariantErrors.length > 0 ? { invariantErrors } : {}),
        apiKeyEnvPresence: liveProvider
          ? (liveApiKey ? 'present' : 'missing')
          : 'not_required',
        providerAccountStorePathConfigured: envPresence(PROVIDER_ACCOUNT_STORE_PATH_ENV),
        config: {
          workers,
          requestCount,
          durationLimitMs,
          enqueueIntervalMs,
          liveBaseUrl: liveProvider ? resolveProviderLabel(liveBaseUrl) : null,
          liveModel: liveProvider ? liveModel : null,
          providerBudgetGate: isolateProviderBudgetGate ? 'isolated' : 'external',
        },
        scheduledCount: attempts.length,
        successCount,
        failureCount,
        failureReasons,
        attempts: attemptResults.slice(0, 24).map(summarizeProviderSoakAttemptResult),
        proposalCount: attemptResults.reduce((sum, attempt) => sum + attempt.proposalCount, 0),
        usageTotalTokens: attemptResults.reduce((sum, attempt) => sum + (attempt.usageTotalTokens ?? 0), 0),
        accounting: {
          billingLedgerCount: billingLedger.count,
          auditEventCount: auditEvents.count,
          tokenSummaryRequestCount,
          tokenBalanceConsumedRuns,
          ledgerListReadModelLimit: PROVIDER_ACCOUNT_LIST_READ_MODEL_LIMIT,
          ledgerRetentionLimit: PROVIDER_ACCOUNT_LEDGER_RETENTION_LIMIT,
          retainedUsageReadModelExpectedRuns: Math.min(successCount, PROVIDER_ACCOUNT_LEDGER_RETENTION_LIMIT),
          failedAuditCount: auditEvents.items.filter((event) => event.eventType === 'provider_request_failed').length,
          fallbackAuditCount: auditEvents.items.filter((event) => event.eventType === 'provider_fallback_failed').length,
          successAuditCount: auditEvents.items.filter((event) => event.eventType === 'provider_request_succeeded').length,
        },
        providerRequestQueue: summarizeProviderSoakQueue(queue),
        tokenSummary: tokenSummary.items.map((item) => ({
          aiPlayerId: item.aiPlayerId,
          model: item.model,
          provider: item.provider,
          requestCount: item.requestCount,
          total: item.total,
        })),
        tokenBalance: tokenBalance.items.map((item) => ({
          governorPlayerId: item.governorPlayerId,
          billingAccountType: item.billingAccountType,
          billingAccountId: item.billingAccountId,
          consumedRuns: item.consumedRuns,
          totalConsumedTokens: item.totalConsumedTokens,
          byAiPlayer: item.byAiPlayer,
        })),
        auditEvents: auditEvents.items.slice(0, 12).map((event) => ({
          eventType: event.eventType,
          model: event.model,
          provider: event.provider,
          reason: event.reason,
          queueRunId: event.queueRunId,
        })),
        durationMs,
      })
      if (invariantErrors.length > 0) {
        process.exitCode = 1
      }
    } finally {
      await handle.close()
      resetAiPlayerRuntimeModelDispatchStoreForTest()
    }
  })
}

async function runSmoke(kind: StoreKind) {
  const runId = `dispatch_smoke_${Date.now()}_${process.pid}`
  const workers = readWorkerCount()
  const jobCount = readJobCount()
  const expiredJobCount = readExpiredJobCount()
  const handle = await createStoreHandle(kind, runId)
  try {
    const leaseRace = await runClaimLeaseRace(kind, runId, workers)
    const queueRace = await runQueueClaimRace(kind, runId, handle, workers, jobCount)
    const expiredRetry = await runExpiredRetry(kind, runId, handle, expiredJobCount)
    await handle.cleanup()
    writeJson({
      ok: true,
      store: kind,
      runId,
      workers,
      config: {
        workers,
        jobCount,
        expiredJobCount,
      },
      leaseRace,
      queueRace,
      expiredRetry,
    })
  } finally {
    await handle.close()
  }
}

async function checkRedisClientPackage() {
  const imported = await import(AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_CLIENT_PACKAGE)
  const candidate = imported as { createClient?: unknown }
  if (typeof candidate.createClient !== 'function') {
    throw new Error(`Redis package "${AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_CLIENT_PACKAGE}" does not expose createClient()`)
  }
  return {
    packageName: AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_CLIENT_PACKAGE,
    createClient: true,
  }
}

async function runDryRun(envFile: LocalEnvFileLoadResult, redisOnlyLocalDefaults: RedisOnlyLocalDefaultsResult) {
  const workerCommand = process.execPath
  const tsxCliPath = join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs')
  const redisClient = await checkRedisClientPackage()
  writeJson({
    ok: true,
    command: 'dry-run',
    envFile,
    redisOnlyLocalDefaults,
    env: {
      [POSTGRES_DATABASE_URL_ENV]: envPresence(POSTGRES_DATABASE_URL_ENV),
      DATABASE_URL: envPresence('DATABASE_URL'),
      [REDIS_URL_ENV]: envPresence(REDIS_URL_ENV),
      REDIS_URL: envPresence('REDIS_URL'),
    },
    redisClient,
    smokeContract: {
      claimLeaseRace: true,
      queuePriorityClaim: true,
      heartbeat: true,
      expiredRetry: true,
      configurableWorkers: true,
      maxWorkers: 32,
      configurableJobCount: true,
      configurableExpiredJobCount: true,
      duplicateClaimGuard: true,
      claimDurationP95: true,
      fixedWorkerLongRun: true,
      longRunThroughput: true,
      longRunClaimDurationP99: true,
      workerCommand,
      tsxCliPath,
    },
    commands: {
      postgresMigrate: 'npm run ai:runtime-model-dispatch-postgres:migrate',
      postgresSmoke: 'npm run ai:runtime-model-dispatch-postgres:smoke -- --workers=4',
      redisEnvPreflight: 'npm run ai:runtime-model-dispatch-redis:env-preflight',
      redisSmoke: 'npm run ai:runtime-model-dispatch-redis:smoke',
      redisStrictSmoke: 'npm run ai:runtime-model-dispatch-redis:smoke:strict -- --workers=32 --jobs=32 --expired-jobs=8',
      localEnvPreflight: 'npm run ai:runtime-model-dispatch:env-preflight',
      postgresLongRun: 'npm run ai:runtime-model-dispatch-postgres:smoke -- --long-run --workers=16 --jobs=512 --duration-ms=30000 --work-ms=2',
      redisLongRun: 'npm run ai:runtime-model-dispatch-redis:smoke -- --long-run --workers=8 --jobs=256 --duration-ms=30000 --work-ms=2',
      postgresProviderSoak: 'npm run ai:runtime-model-dispatch-postgres:smoke -- --provider-soak --workers=8 --requests=256 --duration-ms=1800000 --enqueue-interval-ms=250',
      redisProviderSoak: 'npm run ai:runtime-model-dispatch-redis:smoke -- --provider-soak --workers=8 --requests=256 --duration-ms=1800000 --enqueue-interval-ms=250',
      liveProviderSoak: 'npm run ai:runtime-model-dispatch-postgres:smoke -- --provider-soak --live-provider --workers=4 --requests=16 --duration-ms=120000 --enqueue-interval-ms=250',
    },
  })
}

async function runLocalEnvPreflight(envFile: LocalEnvFileLoadResult, redisOnlyLocalDefaults: RedisOnlyLocalDefaultsResult) {
  const redisClient = await checkRedisClientPackage()
  const bindings = {
    postgres: resolveEnvBinding('postgres', POSTGRES_DATABASE_URL_ENV, 'DATABASE_URL'),
    redis: resolveEnvBinding('redis', REDIS_URL_ENV, 'REDIS_URL'),
  }
  const readyStores = (Object.keys(bindings) as StoreKind[])
    .filter((store) => bindings[store].status === 'ready')
  const missingStores = (Object.keys(bindings) as StoreKind[])
    .filter((store) => bindings[store].status !== 'ready')

  writeJson({
    ok: true,
    command: 'local-env-preflight',
    envFile,
    redisOnlyLocalDefaults,
    allStoresReady: missingStores.length === 0,
    readyStores,
    missingStores,
    safety: {
      redactsConnectionValues: true,
      connectsToStores: false,
      requiresRuntimeModelApiKey: false,
    },
    bindings,
    redisClient,
    commands: {
      postgresMigrate: {
        canRun: bindings.postgres.status === 'ready',
        command: 'npm run ai:runtime-model-dispatch-postgres:migrate',
      },
      postgresSmoke: {
        canRun: bindings.postgres.status === 'ready',
        command: 'npm run ai:runtime-model-dispatch-postgres:smoke -- --workers=4',
      },
      redisSmoke: {
        canRun: bindings.redis.status === 'ready',
        command: 'npm run ai:runtime-model-dispatch-redis:smoke',
      },
      redisStrictSmoke: {
        canRun: bindings.redis.status === 'ready',
        command: 'npm run ai:runtime-model-dispatch-redis:smoke:strict -- --workers=32 --jobs=32 --expired-jobs=8',
      },
      dryRun: {
        canRun: true,
        command: 'npm run ai:runtime-model-dispatch:smoke:dry-run',
      },
    },
  })
}

async function runWorker(kind: StoreKind) {
  const runId = readArg('--run-id')
  const workerId = readArg('--worker-id')
  const mode = readArg('--worker-mode')
  if (!runId || !workerId || !mode) {
    throw new Error('--run-id, --worker-id and --worker-mode are required for workers')
  }
  const handle = await createStoreHandle(kind, runId)
  try {
    if (mode === 'claim-lease-race') {
      const claim = await handle.store.claimLease({
        leaseId: smokeId(runId, 'lease:race'),
        ownerId: workerId,
        aiPlayerId: smokeId(runId, 'ai-player'),
        lane: 'background_patrol',
        provider: 'dispatch-smoke',
        model: 'shared-store-smoke',
        keyFingerprint: null,
        ttlMs: 10_000,
      })
      if (!claim.ok) {
        writeJson({ ok: false, workerId, mode, error: claim.error })
        return
      }
      await handle.store.heartbeatLease({
        leaseId: smokeId(runId, 'lease:race'),
        ownerId: workerId,
        ttlMs: 10_000,
        state: 'active',
      })
      await sleep(3_000)
      await handle.store.completeLease({
        leaseId: smokeId(runId, 'lease:race'),
        ownerId: workerId,
      })
      writeJson({ ok: true, workerId, mode })
      return
    }

    if (mode === 'claim-next') {
      const startedAt = Date.now()
      const claim = await handle.store.claimNextJob({
        ownerId: workerId,
        ttlMs: 1_000,
        lanes: ['background_patrol'],
      })
      const durationMs = Date.now() - startedAt
      if (!claim.ok) {
        writeJson({ ok: false, workerId, mode, durationMs, error: claim.error })
        return
      }
      await handle.store.heartbeatJob({
        jobId: claim.job.jobId,
        ownerId: workerId,
        ttlMs: 1_000,
      })
      await handle.store.completeJob({
        jobId: claim.job.jobId,
        ownerId: workerId,
      })
      writeJson({ ok: true, workerId, mode, jobId: claim.job.jobId, reclaimedExpired: claim.reclaimedExpired, durationMs })
      return
    }

    if (mode === 'claim-expired') {
      const jobName = readArg('--job-name') ?? 'expired-retry'
      const startedAt = Date.now()
      const claim = await handle.store.claimJob({
        jobId: smokeId(runId, `job:${jobName}`),
        ownerId: workerId,
        ttlMs: 1_000,
      })
      const durationMs = Date.now() - startedAt
      if (!claim.ok) {
        writeJson({ ok: false, workerId, mode, durationMs, error: claim.error })
        return
      }
      await handle.store.completeJob({
        jobId: claim.job.jobId,
        ownerId: workerId,
      })
      writeJson({ ok: true, workerId, mode, jobId: claim.job.jobId, reclaimedExpired: claim.reclaimedExpired, durationMs })
      return
    }

    throw new Error(`unknown worker mode: ${mode}`)
  } finally {
    await handle.close()
  }
}

async function run() {
  const envFile = loadLocalEnvFile()
  const redisOnlyLocalDefaults = applyRedisOnlyLocalDefaults()
  if (hasArg('--env-preflight')) {
    await runLocalEnvPreflight(envFile, redisOnlyLocalDefaults)
    return
  }
  if (hasArg('--dry-run')) {
    await runDryRun(envFile, redisOnlyLocalDefaults)
    return
  }
  if (hasArg('--postgres-worker')) {
    await runWorker('postgres')
    return
  }
  if (hasArg('--redis-worker')) {
    await runWorker('redis')
    return
  }
  if (hasArg('--postgres')) {
    if (hasArg('--provider-soak')) {
      await runProviderSoak('postgres')
      return
    }
    if (hasArg('--long-run')) {
      await runFixedWorkerPoolLongRun('postgres')
      return
    }
    await runSmoke('postgres')
    return
  }
  if (hasArg('--redis')) {
    if (hasArg('--provider-soak')) {
      await runProviderSoak('redis')
      return
    }
    if (hasArg('--long-run')) {
      await runFixedWorkerPoolLongRun('redis')
      return
    }
    await runSmoke('redis')
    return
  }
  throw new Error('Usage: tsx server/src/evals/runAiRuntimeModelDispatchSharedStoreSmoke.ts --env-preflight|--dry-run|--postgres|--redis [--redis-only-local-defaults] [--workers=4] [--jobs=2] [--expired-jobs=1] [--long-run --duration-ms=30000 --work-ms=2] [--provider-soak --requests=256 --duration-ms=1800000 --enqueue-interval-ms=250 --live-provider]')
}

run().catch((error: unknown) => {
  writeJson({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  })
  process.exit(1)
})
