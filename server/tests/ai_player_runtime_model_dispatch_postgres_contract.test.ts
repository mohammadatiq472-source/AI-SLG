import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_MIGRATION_SQL,
  AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_CLIENT_PACKAGE,
  createAiPlayerRuntimeModelDispatchStore,
  createAiPlayerRuntimeModelDispatchPostgresStore,
  createAiPlayerRuntimeModelDispatchRedisStore,
} from '../src/application/ai/aiPlayerRuntimeModelDispatchStore'

const PACKAGE_JSON_PATH = join(process.cwd(), 'package.json')
const DISPATCH_STORE_PATH = join(process.cwd(), 'server/src/application/ai/aiPlayerRuntimeModelDispatchStore.ts')
const PROVIDER_ROUTES_PATH = join(process.cwd(), 'server/src/routes/aiPlayerProviderAccountRoutes.ts')
const SHARED_STORE_SMOKE_PATH = join(process.cwd(), 'server/src/evals/runAiRuntimeModelDispatchSharedStoreSmoke.ts')
const RUNTIME_PROPOSAL_MODEL_PATH = join(process.cwd(), 'server/src/application/ai/aiPlayerRuntimeProposalModel.ts')
const TSX_CLI_PATH = join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs')

function readPackageScripts() {
  const parsed = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8')) as {
    scripts?: Record<string, string>
  }
  return parsed.scripts ?? {}
}

function readPackageDependencies() {
  const parsed = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8')) as {
    dependencies?: Record<string, string>
  }
  return parsed.dependencies ?? {}
}

function testPostgresDispatchMigrationHasFormalEntrypoints() {
  const scripts = readPackageScripts()
  assert.equal(
    scripts['ai:runtime-model-dispatch-postgres:print-migration'],
    'tsx server/src/evals/runAiRuntimeModelDispatchPostgres.ts --print-migration',
  )
  assert.equal(
    scripts['ai:runtime-model-dispatch-postgres:migrate'],
    'tsx server/src/evals/runAiRuntimeModelDispatchPostgres.ts --migrate',
  )
  assert.equal(
    scripts['ai:runtime-model-dispatch-postgres:smoke'],
    'tsx server/src/evals/runAiRuntimeModelDispatchSharedStoreSmoke.ts --postgres',
  )
  assert.equal(
    scripts['ai:runtime-model-dispatch-redis:env-preflight'],
    'tsx server/src/evals/runAiRuntimeModelDispatchSharedStoreSmoke.ts --env-preflight --redis-only-local-defaults',
  )
  assert.equal(
    scripts['ai:runtime-model-dispatch-redis:smoke'],
    'tsx server/src/evals/runAiRuntimeModelDispatchSharedStoreSmoke.ts --redis --redis-only-local-defaults',
  )
  assert.equal(
    scripts['ai:runtime-model-dispatch-redis:smoke:strict'],
    'tsx server/src/evals/runAiRuntimeModelDispatchSharedStoreSmoke.ts --redis',
  )
  assert.equal(
    scripts['ai:runtime-model-dispatch:smoke:dry-run'],
    'tsx server/src/evals/runAiRuntimeModelDispatchSharedStoreSmoke.ts --dry-run',
  )
  assert.equal(
    scripts['ai:runtime-model-dispatch:env-preflight'],
    'tsx server/src/evals/runAiRuntimeModelDispatchSharedStoreSmoke.ts --env-preflight',
  )
  assert.equal(
    scripts['ai:runtime-model-dispatch:env-preflight:local'],
    'tsx server/src/evals/runAiRuntimeModelDispatchSharedStoreSmoke.ts --env-preflight --dispatch-env-file=tmp/ai_runtime_model_dispatch.env.ps1',
  )
}

function testMigrationSqlCoversDispatchTables() {
  assert.match(AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_MIGRATION_SQL, /CREATE TABLE IF NOT EXISTS ai_runtime_model_dispatch_leases/)
  assert.match(AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_MIGRATION_SQL, /CREATE TABLE IF NOT EXISTS ai_runtime_model_dispatch_jobs/)
  assert.match(AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_MIGRATION_SQL, /CREATE TABLE IF NOT EXISTS ai_runtime_model_dispatch_rate_buckets/)
  assert.match(AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_MIGRATION_SQL, /ai_runtime_model_dispatch_jobs_pending_idx/)
}

async function testPostgresClaimNextSqlReclaimsExpiredActiveJobs() {
  const queries: Array<{ text: string; values: readonly unknown[] | undefined }> = []
  const store = createAiPlayerRuntimeModelDispatchPostgresStore({
    query: async <T extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: readonly unknown[]) => {
      queries.push({ text, values })
      return {
        rows: [{
          job_id: 'expired_active_job',
          lease_id: 'expired_active_lease',
          owner_id: 'worker_b',
          ai_player_id: 'ai_player_dispatch_smoke',
          lane: 'background_patrol',
          priority: 10,
          provider: 'postgres.example',
          model: 'dispatch-smoke-model',
          key_fingerprint: null,
          state: 'active',
          enqueued_at: new Date(1_000),
          available_at: new Date(1_000),
          heartbeat_at: new Date(1_000),
          expires_at: new Date(1_050),
          merge_key: null,
          reclaimed_expired: true,
        } as unknown as T],
      }
    },
  })

  const claimed = await store.claimNextJob({ ownerId: 'worker_b', ttlMs: 1_000, nowMs: 2_000 })
  assert.equal(claimed.ok, true)
  if (!claimed.ok) throw new Error('expected expired active job to be reclaimed')
  assert.equal(claimed.reclaimedExpired, true)
  assert.match(queries[0].text, /state IN \('pending', 'expired'\)\s+OR \(state = 'active' AND expires_at <=/i)
  assert.match(queries[0].text, /FOR UPDATE SKIP LOCKED/i)
}

function testRedisRuntimeBindingChoosesOfficialClientPackage() {
  assert.equal(AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_CLIENT_PACKAGE, 'redis')
  assert.match(readPackageDependencies().redis ?? '', /^\^?4\./)
}

function testCompletedDispatchLeaseIsTerminal() {
  const source = readFileSync(DISPATCH_STORE_PATH, 'utf-8')
  assert.doesNotMatch(source, /state NOT IN \('queued', 'active'\)/)
  assert.match(source, /state IN \('queued', 'active', 'expired'\)/)
  const store = createAiPlayerRuntimeModelDispatchStore()
  const first = store.claimLease({
    leaseId: 'terminal_lease',
    ownerId: 'owner_a',
    aiPlayerId: 'ai_player_dispatch_contract',
    lane: 'background_patrol',
    provider: 'contract',
    model: 'dispatch-store',
    keyFingerprint: null,
    ttlMs: 1_000,
    nowMs: 1_000,
  })
  assert.equal(first.ok, true)
  const completed = store.completeLease({
    leaseId: 'terminal_lease',
    ownerId: 'owner_a',
    nowMs: 1_100,
  })
  assert.equal(completed.ok, true)
  const second = store.claimLease({
    leaseId: 'terminal_lease',
    ownerId: 'owner_b',
    aiPlayerId: 'ai_player_dispatch_contract',
    lane: 'background_patrol',
    provider: 'contract',
    model: 'dispatch-store',
    keyFingerprint: null,
    ttlMs: 1_000,
    nowMs: 2_200,
  })
  assert.equal(second.ok, false)
  if (second.ok) throw new Error('expected completed lease to remain terminal')
  assert.equal(second.error, 'dispatch_lease_held')
}

function testSharedStoreSmokeSupportsConfigurablePressure() {
  const source = readFileSync(SHARED_STORE_SMOKE_PATH, 'utf-8')
  assert.match(source, /function readJobCount\(/)
  assert.match(source, /function readExpiredJobCount\(/)
  assert.match(source, /readBoundedIntArg\('--workers', 4, 2, 32\)/)
  assert.match(source, /duplicateClaimedJobIds/)
  assert.match(source, /expectedClaimedJobCount/)
  assert.match(source, /p95ClaimDurationMs/)
  assert.match(source, /--workers=32 --jobs=32 --expired-jobs=8/)
}

function testSharedStoreSmokeSupportsFixedWorkerLongRun() {
  const source = readFileSync(SHARED_STORE_SMOKE_PATH, 'utf-8')
  assert.match(source, /function readLongRunDurationMs\(/)
  assert.match(source, /function readLongRunWorkMs\(/)
  assert.match(source, /function percentileDurationMs\(/)
  assert.match(source, /async function runFixedWorkerPoolLongRun\(/)
  assert.match(source, /--long-run/)
  assert.match(source, /--duration-ms/)
  assert.match(source, /throughputJobsPerSecond/)
  assert.match(source, /p99ClaimDurationMs/)
  assert.match(source, /observedMaxActive/)
}

function testSharedStoreSmokeSupportsProviderSoak() {
  const source = readFileSync(SHARED_STORE_SMOKE_PATH, 'utf-8')
  assert.match(source, /function readProviderSoakEnqueueIntervalMs\(/)
  assert.match(source, /async function runProviderSoak\(/)
  assert.match(source, /buildProviderSoakCandidates/)
  assert.match(source, /--provider-soak/)
  assert.match(source, /--live-provider/)
  assert.match(source, /requestAiPlayerRuntimeProposalFromCandidateTargets/)
  assert.match(source, /recordAiPlayerProviderModelRequestAccounting/)
  assert.match(source, /model_request_failed_429/)
  assert.match(source, /model_provider_backoff_active/)
  assert.match(source, /providerRequestQueue/)
  assert.match(source, /tokenSummary/)
  assert.match(source, /tokenBalance/)
  assert.match(source, /auditEvents/)
  assert.match(source, /sanitizeProviderSoakDiagnostic/)
  assert.match(source, /invariantErrors/)
  assert.match(source, /summarizeProviderSoakAttemptResult/)
  assert.match(source, /--with-provider-budget-gate/)
  assert.match(source, /PROVIDER_BUDGET_GATE_URL_ENV/)
  assert.match(source, /providerBudgetGate/)
}

function testSharedStoreSmokeSupportsLocalEnvPreflight() {
  const source = readFileSync(SHARED_STORE_SMOKE_PATH, 'utf-8')
  assert.match(source, /async function runLocalEnvPreflight\(/)
  assert.match(source, /function resolveEnvBinding\(/)
  assert.match(source, /function describeConnectionUrl\(/)
  assert.match(source, /--dispatch-env-file/)
  assert.match(source, /--env-preflight/)
  assert.match(source, /--redis-only-local-defaults/)
  assert.match(source, /DEFAULT_REDIS_ONLY_LOCAL_URL/)
  assert.match(source, /DEFAULT_REDIS_ONLY_LOCAL_KEY_PREFIX/)
  assert.match(source, /allStoresReady/)
  assert.match(source, /readyStores/)
  assert.match(source, /missingStores/)
}

function testRedisOnlyLocalDefaultsPreflightDoesNotNeedTempEnvFile() {
  const env = { ...process.env }
  delete env.AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_DATABASE_URL
  delete env.DATABASE_URL
  delete env.AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_URL
  delete env.REDIS_URL
  delete env.AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_KEY_PREFIX
  delete env.AI_PLAYER_RUNTIME_MODEL_DISPATCH_ENV_FILE

  const result = spawnSync(process.execPath, [
    TSX_CLI_PATH,
    SHARED_STORE_SMOKE_PATH,
    '--env-preflight',
    '--redis-only-local-defaults',
  ], {
    cwd: process.cwd(),
    env,
    encoding: 'utf-8',
  })
  assert.equal(result.status, 0)
  assert.equal(result.stderr.trim(), '')
  const payload = JSON.parse(result.stdout.trim()) as {
    ok: boolean
    command: string
    allStoresReady: boolean
    readyStores: string[]
    missingStores: string[]
    envFile: { status: string }
    redisOnlyLocalDefaults: { status: string; appliedEnvNames: string[] }
    bindings: {
      redis: {
        status: string
        selectedEnv: string | null
        connection: { redacted: string | null; host: string | null; port: string | null }
      }
    }
    commands: {
      redisSmoke: { canRun: boolean; command: string }
    }
  }
  assert.equal(payload.ok, true)
  assert.equal(payload.command, 'local-env-preflight')
  assert.equal(payload.envFile.status, 'not_requested')
  assert.equal(payload.allStoresReady, false)
  assert.deepEqual(payload.readyStores, ['redis'])
  assert.deepEqual(payload.missingStores, ['postgres'])
  assert.equal(payload.redisOnlyLocalDefaults.status, 'applied')
  assert.deepEqual(payload.redisOnlyLocalDefaults.appliedEnvNames.sort(), [
    'AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_KEY_PREFIX',
    'AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_URL',
  ])
  assert.equal(payload.bindings.redis.status, 'ready')
  assert.equal(payload.bindings.redis.selectedEnv, 'AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_URL')
  assert.equal(payload.bindings.redis.connection.host, '127.0.0.1')
  assert.equal(payload.bindings.redis.connection.port, '6379')
  assert.equal(payload.bindings.redis.connection.redacted, 'redis://<redacted>@127.0.0.1:6379')
  assert.equal(payload.commands.redisSmoke.canRun, true)
  assert.equal(payload.commands.redisSmoke.command, 'npm run ai:runtime-model-dispatch-redis:smoke')
}

function testLocalEnvPreflightRedactsBoundConnections() {
  const env = { ...process.env }
  delete env.AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_URL
  delete env.REDIS_URL
  env.AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_DATABASE_URL = 'postgresql://tester:secret_pg_password@localhost:5432/dispatch_contract?sslmode=disable'
  env.REDIS_URL = 'redis://:secret_redis_password@127.0.0.1:6379/2'

  const result = spawnSync(process.execPath, [
    TSX_CLI_PATH,
    SHARED_STORE_SMOKE_PATH,
    '--env-preflight',
  ], {
    cwd: process.cwd(),
    env,
    encoding: 'utf-8',
  })
  assert.equal(result.status, 0)
  assert.equal(result.stderr.trim(), '')
  assert.equal(result.stdout.includes('secret_pg_password'), false)
  assert.equal(result.stdout.includes('secret_redis_password'), false)
  assert.equal(result.stdout.includes('tester:'), false)
  const payload = JSON.parse(result.stdout.trim()) as {
    ok: boolean
    command: string
    allStoresReady: boolean
    readyStores: string[]
    missingStores: string[]
    bindings: {
      postgres: {
        status: string
        selectedEnv: string | null
        connection: { scheme: string | null, host: string | null, port: string | null, redacted: string | null }
      }
      redis: {
        status: string
        selectedEnv: string | null
        connection: { scheme: string | null, host: string | null, port: string | null, redacted: string | null }
      }
    }
  }
  assert.equal(payload.ok, true)
  assert.equal(payload.command, 'local-env-preflight')
  assert.equal(payload.allStoresReady, true)
  assert.deepEqual(payload.readyStores.sort(), ['postgres', 'redis'])
  assert.deepEqual(payload.missingStores, [])
  assert.equal(payload.bindings.postgres.status, 'ready')
  assert.equal(payload.bindings.postgres.selectedEnv, 'AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_DATABASE_URL')
  assert.equal(payload.bindings.postgres.connection.scheme, 'postgresql')
  assert.equal(payload.bindings.postgres.connection.host, 'localhost')
  assert.equal(payload.bindings.postgres.connection.port, '5432')
  assert.equal(payload.bindings.postgres.connection.redacted, 'postgresql://<redacted>@localhost:5432/dispatch_contract')
  assert.equal(payload.bindings.redis.status, 'ready')
  assert.equal(payload.bindings.redis.selectedEnv, 'REDIS_URL')
  assert.equal(payload.bindings.redis.connection.scheme, 'redis')
  assert.equal(payload.bindings.redis.connection.host, '127.0.0.1')
  assert.equal(payload.bindings.redis.connection.port, '6379')
  assert.equal(payload.bindings.redis.connection.redacted, 'redis://<redacted>@127.0.0.1:6379/2')
}

function testLocalEnvPreflightLoadsPowerShellEnvFileWithoutLeakingSecrets() {
  const envFilePath = join(process.cwd(), 'tmp', 'ai_runtime_model_dispatch_contract.env.ps1')
  mkdirSync(join(process.cwd(), 'tmp'), { recursive: true })
  writeFileSync(envFilePath, [
    "$env:AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_DATABASE_URL = 'postgresql://dispatch_user:secret_pg_file_password@localhost:5432/dispatch_contract_file?sslmode=disable'",
    "$env:AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_URL = 'redis://:secret_redis_file_password@127.0.0.1:6379/3'",
    '',
  ].join('\n'), 'utf-8')

  try {
    const env = { ...process.env }
    delete env.AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_DATABASE_URL
    delete env.DATABASE_URL
    delete env.AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_URL
    delete env.REDIS_URL

    const result = spawnSync(process.execPath, [
      TSX_CLI_PATH,
      SHARED_STORE_SMOKE_PATH,
      '--env-preflight',
      `--dispatch-env-file=${envFilePath}`,
    ], {
      cwd: process.cwd(),
      env,
      encoding: 'utf-8',
    })
    assert.equal(result.status, 0)
    assert.equal(result.stderr.trim(), '')
    assert.equal(result.stdout.includes('secret_pg_file_password'), false)
    assert.equal(result.stdout.includes('secret_redis_file_password'), false)
    assert.equal(result.stdout.includes('dispatch_user:'), false)
    const payload = JSON.parse(result.stdout.trim()) as {
      ok: boolean
      envFile: { status: string; path: string; loadedEnvNames: string[] }
      bindings: {
        postgres: { selectedEnv: string | null; connection: { redacted: string | null } }
        redis: { selectedEnv: string | null; connection: { redacted: string | null } }
      }
    }
    assert.equal(payload.ok, true)
    assert.equal(payload.envFile.status, 'loaded')
    assert.equal(payload.envFile.path, 'tmp/ai_runtime_model_dispatch_contract.env.ps1')
    assert.deepEqual(payload.envFile.loadedEnvNames.sort(), [
      'AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_DATABASE_URL',
      'AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_URL',
    ])
    assert.equal(payload.bindings.postgres.selectedEnv, 'AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_DATABASE_URL')
    assert.equal(payload.bindings.postgres.connection.redacted, 'postgresql://<redacted>@localhost:5432/dispatch_contract_file')
    assert.equal(payload.bindings.redis.selectedEnv, 'AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_URL')
    assert.equal(payload.bindings.redis.connection.redacted, 'redis://<redacted>@127.0.0.1:6379/3')
  } finally {
    rmSync(envFilePath, { force: true })
  }
}

function testRuntimeProposalRedisDispatchCanUseSmokeKeyPrefix() {
  const source = readFileSync(RUNTIME_PROPOSAL_MODEL_PATH, 'utf-8')
  assert.match(source, /AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_KEY_PREFIX/)
  assert.match(source, /readModelDispatchRedisKeyPrefix/)
  assert.match(source, /createAiPlayerRuntimeModelDispatchRedisStoreFromUrl\(redisUrl,\s*\{\s*keyPrefix/)
}

async function testPostgresSnapshotMapsDispatchReadModelRows() {
  const store = createAiPlayerRuntimeModelDispatchPostgresStore({
    query: async <T extends Record<string, unknown> = Record<string, unknown>>(text: string) => {
      if (text.includes('ai_runtime_model_dispatch_leases')) {
        return {
          rows: [{
            lease_id: 'pg_snapshot_lease',
            owner_id: 'worker_pg',
            ai_player_id: 'ai_player_pg_snapshot',
            lane: 'background_patrol',
            provider: 'postgres.example',
            model: 'dispatch-model',
            key_fingerprint: 'sha256:pg-snapshot',
            state: 'active',
            claimed_at: new Date(1_000),
            heartbeat_at: new Date(1_100),
            expires_at: new Date(2_000),
          } as unknown as T],
        }
      }
      if (text.includes('ai_runtime_model_dispatch_rate_buckets')) {
        return {
          rows: [{
            bucket_key: 'postgres.example\u0000dispatch-model\u0000sha256:pg-snapshot',
            provider: 'postgres.example',
            model: 'dispatch-model',
            key_fingerprint: 'sha256:pg-snapshot',
            limit_count: 5,
            window_ms: 60_000,
            window_started_at: new Date(1_000),
            reset_at: new Date(61_000),
            used_requests: 2,
          } as unknown as T],
        }
      }
      return {
        rows: [{
          job_id: 'pg_snapshot_job',
          lease_id: 'pg_snapshot_lease',
          owner_id: 'worker_pg',
          ai_player_id: 'ai_player_pg_snapshot',
          lane: 'background_patrol',
          priority: 10,
          provider: 'postgres.example',
          model: 'dispatch-model',
          key_fingerprint: 'sha256:pg-snapshot',
          state: 'pending',
          enqueued_at: new Date(1_000),
          available_at: new Date(1_000),
          heartbeat_at: new Date(1_000),
          expires_at: new Date(2_000),
          merge_key: 'patrol:ai_player_pg_snapshot',
        } as unknown as T],
      }
    },
  })

  const snapshot = await store.snapshot(1_500)
  assert.equal(snapshot.leases[0]?.leaseId, 'pg_snapshot_lease')
  assert.equal(snapshot.rateBuckets[0]?.usedRequests, 2)
  assert.equal(snapshot.queueJobs[0]?.jobId, 'pg_snapshot_job')
}

async function testRedisSnapshotUsesSharedPrefixForDispatchReadModel() {
  const calls: Array<{ script: string; keys: string[]; arguments: string[] }> = []
  const store = createAiPlayerRuntimeModelDispatchRedisStore({
    eval: async (script, options) => {
      calls.push({ script, keys: options.keys, arguments: options.arguments })
      return JSON.stringify({
        leases: [{
          leaseId: 'redis_snapshot_lease',
          ownerId: 'worker_redis',
          aiPlayerId: 'ai_player_redis_snapshot',
          lane: 'background_patrol',
          provider: 'redis.example',
          model: 'dispatch-model',
          keyFingerprint: 'sha256:redis-snapshot',
          state: 'active',
          claimedAt: new Date(1_000).toISOString(),
          heartbeatAt: new Date(1_100).toISOString(),
          expiresAt: new Date(2_000).toISOString(),
        }],
        rateBuckets: [{
          bucketKey: 'redis.example\u0000dispatch-model\u0000sha256:redis-snapshot',
          provider: 'redis.example',
          model: 'dispatch-model',
          keyFingerprint: 'sha256:redis-snapshot',
          limit: 5,
          windowMs: 60_000,
          windowStartedAt: new Date(1_000).toISOString(),
          resetAt: new Date(61_000).toISOString(),
          usedRequests: 2,
        }],
        queueJobs: [{
          jobId: 'redis_snapshot_job',
          leaseId: 'redis_snapshot_lease',
          ownerId: 'worker_redis',
          aiPlayerId: 'ai_player_redis_snapshot',
          lane: 'background_patrol',
          priority: 10,
          provider: 'redis.example',
          model: 'dispatch-model',
          keyFingerprint: 'sha256:redis-snapshot',
          state: 'pending',
          enqueuedAt: new Date(1_000).toISOString(),
          availableAt: new Date(1_000).toISOString(),
          heartbeatAt: new Date(1_000).toISOString(),
          expiresAt: new Date(2_000).toISOString(),
          mergeKey: 'patrol:ai_player_redis_snapshot',
        }],
      })
    },
  }, { keyPrefix: 'ai:test:dispatch' })

  const snapshot = await store.snapshot(1_500)
  assert.equal(calls[0]?.arguments[0], 'snapshot')
  assert.equal(calls[0]?.arguments[1], 'ai:test:dispatch')
  assert.deepEqual(calls[0]?.keys, [
    'ai:test:dispatch:index:leases',
    'ai:test:dispatch:index:rates',
    'ai:test:dispatch:index:jobs',
  ])
  assert.doesNotMatch(calls[0]?.script ?? '', /redis\.call\('KEYS'/)
  assert.match(calls[0]?.script ?? '', /SMEMBERS/)
  assert.equal(snapshot.leases[0]?.leaseId, 'redis_snapshot_lease')
  assert.equal(snapshot.rateBuckets[0]?.usedRequests, 2)
  assert.equal(snapshot.queueJobs[0]?.jobId, 'redis_snapshot_job')
}

function testProviderRequestQueueRouteAwaitsDispatchReadModel() {
  const source = readFileSync(PROVIDER_ROUTES_PATH, 'utf-8')
  assert.match(source, /getAiPlayerRuntimeModelRequestQueueStatusAsync/)
  assert.match(source, /await getAiPlayerRuntimeModelRequestQueueStatusAsync\(\)/)
  assert.doesNotMatch(source, /queue:\s*getAiPlayerRuntimeModelRequestQueueStatus\(\)/)
}

async function run() {
  testPostgresDispatchMigrationHasFormalEntrypoints()
  testMigrationSqlCoversDispatchTables()
  await testPostgresClaimNextSqlReclaimsExpiredActiveJobs()
  testRedisRuntimeBindingChoosesOfficialClientPackage()
  testCompletedDispatchLeaseIsTerminal()
  testSharedStoreSmokeSupportsConfigurablePressure()
  testSharedStoreSmokeSupportsFixedWorkerLongRun()
  testSharedStoreSmokeSupportsProviderSoak()
  testSharedStoreSmokeSupportsLocalEnvPreflight()
  testRedisOnlyLocalDefaultsPreflightDoesNotNeedTempEnvFile()
  testLocalEnvPreflightRedactsBoundConnections()
  testLocalEnvPreflightLoadsPowerShellEnvFileWithoutLeakingSecrets()
  testRuntimeProposalRedisDispatchCanUseSmokeKeyPrefix()
  await testPostgresSnapshotMapsDispatchReadModelRows()
  await testRedisSnapshotUsesSharedPrefixForDispatchReadModel()
  testProviderRequestQueueRouteAwaitsDispatchReadModel()
  console.log('[ai_player_runtime_model_dispatch_postgres_contract] all checks passed')
}

run().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
