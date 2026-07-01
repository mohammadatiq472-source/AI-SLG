import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInitialWorldState } from '../../shared/domain/scenario'
import type {
  AiPlayerProviderBillingLedgerEntry,
} from '../../shared/contracts/aiPlayerProviderAccount'
import {
  aiPlayerProviderAccountHealthResponseSchema,
  aiPlayerProviderAiCommandCreditEstimateResponseSchema,
  aiPlayerProviderAiCommandCreditLedgerMutationResponseSchema,
  aiPlayerProviderAiCommandCreditSummaryResponseSchema,
  aiPlayerProviderAiCommandCreditBalanceResponseSchema,
  aiPlayerProviderAccountPoolOpsConfigMutationResponseSchema,
  aiPlayerProviderAccountPoolOpsRestoreResponseSchema,
  aiPlayerProviderAccountOpsRuntimeConfigResponseSchema,
  listAiPlayerProviderAccountPoolOpsAuditResponseSchema,
  aiPlayerProviderAccountPoolReadModelResponseSchema,
  aiPlayerProviderCostReconciliationResponseSchema,
  aiPlayerProviderDeepSeekBillingReadModelResponseSchema,
  aiPlayerProviderPlayerKeyMutationResponseSchema,
  aiPlayerProviderPricingEstimateResponseSchema,
  aiPlayerProviderRequestQueueStatusResponseSchema,
  listAiPlayerProviderPricingPoliciesResponseSchema,
  listAiPlayerProviderTokenBalanceResponseSchema,
  listAiPlayerProviderAuditEventsResponseSchema,
  listAiPlayerProviderBillingLedgerResponseSchema,
  listAiPlayerProviderTokenSummaryResponseSchema,
} from '../../shared/schemas/aiPlayerProviderAccount'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readArray,
  readObject,
  requestJson,
  shutdownChild,
  sleep,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'
import {
  createExternalLedgerAuditOutboxController,
  loadExternalLedgerAuditOutboxItems,
  toPersistedExternalLedgerAuditOutboxItems,
  type ExternalLedgerAuditOutboxItem,
} from '../src/application/ai/aiPlayerProviderExternalLedgerAuditOutbox'
import {
  getExternalBudgetGateHealth,
  notifyExternalBudgetGate,
  reserveExternalProviderBudgetGate,
} from '../src/application/ai/aiPlayerProviderExternalBudgetGate'
import {
  buildProviderAccountOpsRuntimeConfig,
  rejectUntrustedProviderAccountOpsMutation,
} from '../src/routes/aiPlayerProviderAccountOpsRouteSupport'
import {
  getAiPlayerProviderDeepSeekBillingReadModelReadModel,
} from '../src/application/ai/aiPlayerProviderPricingReadModel'

const AI_PLAYER_ID = 'provider_accounting_ai'
const FACTION_ID = 'player'
const GOVERNOR_PLAYER_ID = 'human_alpha'
const PLAYER_MODEL = 'deepseek-v4-flash'
const PROVIDER_ACCOUNT_STORE_SOURCE_PATH = join(process.cwd(), 'server/src/application/ai/aiPlayerProviderAccountStore.ts')
const PROVIDER_EXTERNAL_BUDGET_GATE_SOURCE_PATH = join(process.cwd(), 'server/src/application/ai/aiPlayerProviderExternalBudgetGate.ts')
const PROVIDER_EXTERNAL_LEDGER_AUDIT_OUTBOX_SOURCE_PATH = join(process.cwd(), 'server/src/application/ai/aiPlayerProviderExternalLedgerAuditOutbox.ts')
const PLAYER_SECRET = 'provider-accounting-player-key-fixture'
const ENCRYPTION_KEY = 'provider-accounting-encryption-key-fixture'
const BUDGET_GATE_SECRET = 'provider-accounting-budget-gate-secret'
const LEDGER_AUDIT_SECRET = 'provider-accounting-ledger-audit-secret'
const OPS_PROXY_SECRET = 'provider-accounting-ops-proxy-secret'
const OPS_ROLE = 'provider_ops_admin'
const OPS_AUTH_SOURCE = 'rbac_middleware'
const OPS_AUTH_HEADERS = {
  'X-AI-Provider-Ops-Actor-Id': GOVERNOR_PLAYER_ID,
  'X-AI-Provider-Ops-Role': OPS_ROLE,
  'X-AI-Provider-Ops-Auth-Source': OPS_AUTH_SOURCE,
}
const EXPECTED_DEEPSEEK_COST_USD = 0.0000014028
const MODEL_OUTPUT = {
  summary: 'claim the available reward through player-level BYOK',
  proposals: [
    {
      action: 'reward_claim',
      args: {},
      reason: '资源：当前存在待领取奖励；目标：领取奖励入账；风险：需要人工批准；批准后结果：后端执行奖励领取并生成 receipt。',
    },
  ],
  deferReason: '',
  needsHumanReview: false,
}

type RelayProbe = {
  authorization: string
  model: string
  path: string
}

function seedWorldState(name = 'ai_player_provider_accounting_world_state') {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding provider accounting shard`)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Provider Accounting AI',
      factionId: FACTION_ID,
      unitIds: [],
      specialty: 'logistics',
    },
  ]

  const path = buildSessionPersistPath(name)
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return path
}

function testDeepSeekBillingReadModelUsesInjectedClockForWindows() {
  const billing = getAiPlayerProviderDeepSeekBillingReadModelReadModel([], {
    nowIso: '2026-05-22T10:11:12.000Z',
    cnyPerUsd: 7.2,
  })

  assert.equal(billing.generatedAt, '2026-05-22T10:11:12.000Z')
  assert.equal(readObject(billing.today).from, '2026-05-22T00:00:00.000Z')
  assert.equal(readObject(billing.today).to, '2026-05-23T00:00:00.000Z')
  assert.equal(readObject(billing.thisMonth).from, '2026-05-01T00:00:00.000Z')
  assert.equal(readObject(billing.thisMonth).to, '2026-06-01T00:00:00.000Z')
}

function buildDeepSeekBillingLedgerEntry(
  suffix: string,
  createdAt: string,
  estimatedCostUsd: number,
): AiPlayerProviderBillingLedgerEntry {
  return {
    ledgerEntryId: `ledger_${suffix}`,
    requestId: `request_${suffix}`,
    aiPlayerId: AI_PLAYER_ID,
    factionId: FACTION_ID,
    governorPlayerId: GOVERNOR_PLAYER_ID,
    billingAccountType: 'player_byok',
    billingAccountId: GOVERNOR_PLAYER_ID,
    providerSource: 'player_config',
    byokSource: 'player_config',
    model: PLAYER_MODEL,
    provider: 'api.deepseek.com',
    keyFingerprint: `sha256:${suffix}`,
    budgetTier: 'strict_action',
    usage: {
      promptTokens: 3,
      completionTokens: 4,
      totalTokens: 7,
      estimatedCostUsd,
      estimatedCostSource: 'pricing_policy',
    },
    createdAt,
  }
}

function testDeepSeekBillingLedgerOnlyWindowsUseLedgerRequestCounts() {
  const billing = getAiPlayerProviderDeepSeekBillingReadModelReadModel([
    buildDeepSeekBillingLedgerEntry('today', '2026-05-22T03:00:00.000Z', 0.000001),
    buildDeepSeekBillingLedgerEntry('month', '2026-05-10T03:00:00.000Z', 0.000002),
  ], {
    nowIso: '2026-05-22T10:11:12.000Z',
    cnyPerUsd: 7.2,
    estimateSource: 'ledger',
  })

  const today = readObject(billing.today)
  const thisMonth = readObject(billing.thisMonth)
  assert.equal(today.observationSource, 'billing_ledger')
  assert.equal(today.requestCount, 1)
  assert.equal(today.estimatedRequestCount, 1)
  assert.equal(today.estimatedCostUsd, 0.000001)
  assert.deepEqual(readArray(today.warnings), [])
  assert.equal(thisMonth.observationSource, 'billing_ledger')
  assert.equal(thisMonth.requestCount, 2)
  assert.equal(thisMonth.estimatedRequestCount, 2)
  assert.equal(thisMonth.estimatedCostUsd, 0.000003)
  assert.deepEqual(readArray(thisMonth.warnings), [])
}

function testDeepSeekBillingEmptyLedgerWarningIsDistinctFromMissingManualRequestCount() {
  const ledgerOnlyBilling = getAiPlayerProviderDeepSeekBillingReadModelReadModel([], {
    nowIso: '2026-05-22T10:11:12.000Z',
    cnyPerUsd: 7.2,
    estimateSource: 'ledger',
  })
  const manualBilling = getAiPlayerProviderDeepSeekBillingReadModelReadModel([], {
    nowIso: '2026-05-22T10:11:12.000Z',
    cnyPerUsd: 7.2,
  })

  const ledgerOnlyTodayWarnings = readArray(readObject(ledgerOnlyBilling.today).warnings)
  const manualTodayWarnings = readArray(readObject(manualBilling.today).warnings)
  assert.deepEqual(ledgerOnlyTodayWarnings, ['billing_ledger_empty'])
  assert.equal(ledgerOnlyTodayWarnings.includes('request_count_missing'), false)
  assert.equal(manualTodayWarnings.includes('request_count_missing'), true)
  assert.equal(manualTodayWarnings.includes('billing_ledger_empty'), false)
}

function buildOpsProxySignatureHeaders(method: string, path: string, secret: string, timestamp = new Date().toISOString()) {
  const signature = createHmac('sha256', secret)
    .update(`${method.toUpperCase()}\n${path}\n${timestamp}`)
    .digest('hex')
  return {
    'X-AI-Provider-Ops-Proxy-Timestamp': timestamp,
    'X-AI-Provider-Ops-Proxy-Signature': `sha256=${signature}`,
  }
}

async function readRequestBody(req: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf-8')
}

async function startRelayProbe() {
  const port = await getAvailablePort()
  const probes: RelayProbe[] = []
  let nextStatus: number | null = null
  const server = createServer((req, res) => {
    void (async () => {
      const body = JSON.parse(await readRequestBody(req)) as Record<string, unknown>
      probes.push({
        authorization: String(req.headers.authorization ?? ''),
        model: String(body.model ?? ''),
        path: String(req.url ?? ''),
      })
      const status = nextStatus ?? 200
      nextStatus = null
      if (status !== 200) {
        res.writeHead(status, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: `relay_${status}` }))
        return
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({
        model: PLAYER_MODEL,
        choices: [
          {
            message: {
              content: JSON.stringify(MODEL_OUTPUT),
            },
          },
        ],
        usage: {
          prompt_tokens: 3,
          completion_tokens: 4,
          total_tokens: 7,
          prompt_cache_hit_tokens: 1,
          prompt_cache_miss_tokens: 2,
        },
      }))
    })().catch((error: unknown) => {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve())
  })

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    probes,
    setNextStatus: (status: number) => {
      nextStatus = status
    },
    stop: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  }
}

async function startBudgetGateProbe() {
  const port = await getAvailablePort()
  const server = createServer((req, res) => {
    void (async () => {
      await readRequestBody(req)
      res.writeHead(503, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'budget_gate_fixture_unavailable' }))
    })().catch((error: unknown) => {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve())
  })

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    stop: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  }
}

async function waitForPersistedFile(
  path: string,
  predicate: (raw: string) => boolean,
  timeoutMs = 10_000,
): Promise<string> {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (existsSync(path)) {
      const raw = readFileSync(path, 'utf8')
      if (predicate(raw)) {
        return raw
      }
    }
    await sleep(250)
  }

  throw new Error(`persisted provider account store did not match within ${timeoutMs}ms: ${path}`)
}

function assertNoSecretLeak(value: unknown) {
  const serialized = JSON.stringify(value)
  assert.equal(serialized.includes(PLAYER_SECRET), false, `player key leaked through payload: ${serialized}`)
  assert.equal(serialized.includes(`Bearer ${PLAYER_SECRET}`), false, 'authorization header leaked through payload')
  assert.equal(serialized.includes(ENCRYPTION_KEY), false, 'encryption key leaked through payload')
  assert.equal(serialized.includes(BUDGET_GATE_SECRET), false, 'budget gate secret leaked through payload')
  assert.equal(serialized.includes(LEDGER_AUDIT_SECRET), false, 'ledger audit secret leaked through payload')
  assert.equal(serialized.includes(OPS_PROXY_SECRET), false, 'ops proxy secret leaked through payload')
}

async function requestJsonWithHeaders(
  baseUrl: string,
  path: string,
  method: 'GET' | 'POST' | 'DELETE',
  body: Record<string, unknown> | undefined,
  headers: Record<string, string>,
  timeoutMs = 15_000,
) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(new URL(path, baseUrl), {
      method,
      headers: body ? { 'Content-Type': 'application/json', ...headers } : headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    const raw = await response.text()
    let data: unknown = null
    if (raw.trim().length > 0) {
      try {
        data = JSON.parse(raw)
      } catch {
        data = { raw }
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    }
  } finally {
    clearTimeout(timer)
  }
}

async function testProductionProviderOpsMutationRequiresDeploymentGuard() {
  const body = {
    provider: 'api.deepseek.com',
    model: PLAYER_MODEL,
    enabled: false,
    maxConcurrency: 0,
    opsReason: 'production deployment guard fixture',
    confirmation: 'provider_account_ops_confirmed',
  }
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    NODE_ENV: 'production',
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: buildSessionPersistPath('ai_player_provider_ops_deployment_guard_store'),
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_provider_ops_deployment_guard_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_provider_ops_deployment_guard_session_state'),
    WORLD_STATE_PERSIST_PATH: seedWorldState('ai_player_provider_ops_deployment_guard_world_state'),
    FACTION_CONFIG_STORE_PATH: buildSessionPersistPath('ai_player_provider_ops_deployment_guard_faction_config'),
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: '',
    AI_PLAYER_RUNTIME_MODEL_API_KEY: '',
    LLM_RELAY_URL: '',
    LLM_RELAY_MODEL: '',
    LLM_RELAY_API_KEY: '',
    LLM_RELAY_API_KEYS: '',
    OPENAI_API_KEY: '',
    AI_PLAYER_PROVIDER_ACCOUNT_OPS_ALLOWED_ROLES: OPS_ROLE,
    AI_PLAYER_PROVIDER_ACCOUNT_OPS_ALLOWED_AUTH_SOURCES: OPS_AUTH_SOURCE,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `production guard backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const providerHealth = await requestJson(baseUrl, '/api/ai/provider/health', 'GET')
    assert.equal(providerHealth.status, 200, `production guard provider health read failed: ${JSON.stringify(providerHealth.data)}`)
    const healthDeployment = readObject(readObject(providerHealth.data).opsMutationDeployment)
    assert.equal(healthDeployment.production, true)
    assert.equal(healthDeployment.internalOnly, false)
    assert.equal(healthDeployment.trustedProxy, false)
    assert.equal(healthDeployment.trusted, false)
    assert.equal(healthDeployment.mutationRoutesEnabled, false)
    assert.equal(healthDeployment.blockedReason, 'provider_account_ops_deployment_not_trusted')
    assertNoSecretLeak(providerHealth.data)

    const startupHealth = await requestJson(baseUrl, '/api/health', 'GET')
    assert.equal(startupHealth.status, 200, `startup health read failed: ${JSON.stringify(startupHealth.data)}`)
    const persistence = readObject(readObject(startupHealth.data).persistence)
    const startupProviderAccounts = readObject(persistence.aiPlayerProviderAccounts)
    const startupDeployment = readObject(startupProviderAccounts.opsMutationDeployment)
    assert.deepEqual(startupDeployment, healthDeployment)
    const startupAlerts = readArray(persistence.alerts).map(readObject)
    const deploymentAlert = startupAlerts.find((alert) => alert.code === 'provider_account_ops_deployment_not_trusted')
    assert.ok(deploymentAlert, `expected provider ops deployment startup alert in ${JSON.stringify(startupAlerts)}`)
    assert.equal(deploymentAlert.source, 'aiPlayerProviderAccounts')
    assert.equal(deploymentAlert.severity, 'high')
    assertNoSecretLeak(startupHealth.data)

    const opsRuntimeConfig = await requestJson(baseUrl, '/api/ai/provider/account-pool/ops-runtime-config', 'GET')
    assert.equal(opsRuntimeConfig.status, 200, `ops runtime config read failed: ${JSON.stringify(opsRuntimeConfig.data)}`)
    aiPlayerProviderAccountOpsRuntimeConfigResponseSchema.parse(opsRuntimeConfig.data)
    const opsRuntimeConfigPayload = readObject(opsRuntimeConfig.data)
    assert.equal(opsRuntimeConfigPayload.ok, true)
    assert.deepEqual(readObject(opsRuntimeConfigPayload.opsMutationDeployment), healthDeployment)
    assert.equal(readObject(opsRuntimeConfigPayload.actorBinding).actorHeader, 'X-AI-Provider-Ops-Actor-Id')
    assert.equal(readObject(opsRuntimeConfigPayload.actorBinding).allowedRolesConfigured, true)
    assert.equal(readObject(opsRuntimeConfigPayload.actorBinding).allowedAuthSourcesConfigured, true)
    assert.ok(readArray(opsRuntimeConfigPayload.mutationRoutes).some((route) => readObject(route).path === '/api/ai/provider/account-pool/ops-config'))
    assert.ok(
      readArray(opsRuntimeConfigPayload.readRoutes).some((route) => readObject(route).path === '/api/ai/provider/account-pool/ops-runtime-config'),
      'ops runtime config should describe its own read endpoint',
    )
    assert.ok(readArray(opsRuntimeConfigPayload.warnings).includes('provider_account_ops_deployment_not_trusted'))
    assertNoSecretLeak(opsRuntimeConfig.data)

    const accountPool = await requestJson(baseUrl, '/api/ai/provider/account-pool', 'GET')
    assert.equal(accountPool.status, 200, `production guard account pool read failed: ${JSON.stringify(accountPool.data)}`)
    const accountPoolDeployment = readObject(readObject(accountPool.data).opsMutationDeployment)
    assert.deepEqual(accountPoolDeployment, healthDeployment)
    assertNoSecretLeak(accountPool.data)

    const rejected = await requestJsonWithHeaders(
      baseUrl,
      '/api/ai/provider/account-pool/ops-config',
      'POST',
      body,
      OPS_AUTH_HEADERS,
    )
    assert.equal(rejected.status, 503)
    assert.equal(readObject(rejected.data).error, 'provider_account_ops_deployment_not_trusted')
    assertNoSecretLeak(rejected.data)
  } finally {
    await shutdownChild(child)
  }

  const trustedPort = await getAvailablePort()
  const trustedBaseUrl = `http://127.0.0.1:${trustedPort}`
  const trustedTail: TailState = { stdout: [], stderr: [] }
  const trustedChild = spawnBackend(trustedPort, trustedTail, {
    NODE_ENV: 'production',
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: buildSessionPersistPath('ai_player_provider_ops_deployment_guard_trusted_store'),
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_provider_ops_deployment_guard_trusted_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_provider_ops_deployment_guard_trusted_session_state'),
    WORLD_STATE_PERSIST_PATH: seedWorldState('ai_player_provider_ops_deployment_guard_trusted_world_state'),
    FACTION_CONFIG_STORE_PATH: buildSessionPersistPath('ai_player_provider_ops_deployment_guard_trusted_faction_config'),
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: '',
    AI_PLAYER_RUNTIME_MODEL_API_KEY: '',
    LLM_RELAY_URL: '',
    LLM_RELAY_MODEL: '',
    LLM_RELAY_API_KEY: '',
    LLM_RELAY_API_KEYS: '',
    OPENAI_API_KEY: '',
    AI_PLAYER_PROVIDER_ACCOUNT_OPS_ALLOWED_ROLES: OPS_ROLE,
    AI_PLAYER_PROVIDER_ACCOUNT_OPS_ALLOWED_AUTH_SOURCES: OPS_AUTH_SOURCE,
    AI_PLAYER_PROVIDER_ACCOUNT_OPS_INTERNAL_ONLY: 'true',
  })

  try {
    const health = await waitForHealth(trustedBaseUrl)
    assert.ok(health, `trusted production guard backend did not become healthy\nstdout=${trustedTail.stdout.join('\n')}\nstderr=${trustedTail.stderr.join('\n')}`)

    const trustedProviderHealth = await requestJson(trustedBaseUrl, '/api/ai/provider/health', 'GET')
    assert.equal(trustedProviderHealth.status, 200, `trusted production provider health read failed: ${JSON.stringify(trustedProviderHealth.data)}`)
    const trustedHealthDeployment = readObject(readObject(trustedProviderHealth.data).opsMutationDeployment)
    assert.equal(trustedHealthDeployment.production, true)
    assert.equal(trustedHealthDeployment.internalOnly, true)
    assert.equal(trustedHealthDeployment.trustedProxy, false)
    assert.equal(trustedHealthDeployment.trusted, true)
    assert.equal(trustedHealthDeployment.mutationRoutesEnabled, true)
    assert.equal(trustedHealthDeployment.blockedReason, null)
    assertNoSecretLeak(trustedProviderHealth.data)

    const trustedStartupHealth = await requestJson(trustedBaseUrl, '/api/health', 'GET')
    assert.equal(trustedStartupHealth.status, 200, `trusted startup health read failed: ${JSON.stringify(trustedStartupHealth.data)}`)
    const trustedPersistence = readObject(readObject(trustedStartupHealth.data).persistence)
    const trustedStartupProviderAccounts = readObject(trustedPersistence.aiPlayerProviderAccounts)
    const trustedStartupDeployment = readObject(trustedStartupProviderAccounts.opsMutationDeployment)
    assert.deepEqual(trustedStartupDeployment, trustedHealthDeployment)
    const trustedStartupAlerts = readArray(trustedPersistence.alerts).map(readObject)
    assert.equal(
      trustedStartupAlerts.some((alert) => alert.code === 'provider_account_ops_deployment_not_trusted'),
      false,
    )
    assertNoSecretLeak(trustedStartupHealth.data)

    const trustedOpsRuntimeConfig = await requestJson(trustedBaseUrl, '/api/ai/provider/account-pool/ops-runtime-config', 'GET')
    assert.equal(trustedOpsRuntimeConfig.status, 200, `trusted ops runtime config read failed: ${JSON.stringify(trustedOpsRuntimeConfig.data)}`)
    aiPlayerProviderAccountOpsRuntimeConfigResponseSchema.parse(trustedOpsRuntimeConfig.data)
    const trustedOpsRuntimeConfigPayload = readObject(trustedOpsRuntimeConfig.data)
    assert.equal(trustedOpsRuntimeConfigPayload.ok, true)
    assert.deepEqual(readObject(trustedOpsRuntimeConfigPayload.opsMutationDeployment), trustedHealthDeployment)
    assert.ok(
      readArray(trustedOpsRuntimeConfigPayload.readRoutes).some((route) => readObject(route).path === '/api/ai/provider/account-pool/ops-runtime-config'),
      'trusted ops runtime config should describe its own read endpoint',
    )
    assert.deepEqual(readArray(trustedOpsRuntimeConfigPayload.warnings), [])
    assertNoSecretLeak(trustedOpsRuntimeConfig.data)

    const trustedAccountPool = await requestJson(trustedBaseUrl, '/api/ai/provider/account-pool', 'GET')
    assert.equal(trustedAccountPool.status, 200, `trusted production account pool read failed: ${JSON.stringify(trustedAccountPool.data)}`)
    const trustedAccountPoolDeployment = readObject(readObject(trustedAccountPool.data).opsMutationDeployment)
    assert.deepEqual(trustedAccountPoolDeployment, trustedHealthDeployment)
    assertNoSecretLeak(trustedAccountPool.data)

    const accepted = await requestJsonWithHeaders(
      trustedBaseUrl,
      '/api/ai/provider/account-pool/ops-config',
      'POST',
      body,
      OPS_AUTH_HEADERS,
    )
    assert.equal(accepted.status, 200)
    assert.equal(readObject(accepted.data).ok, true)
    assertNoSecretLeak(accepted.data)
  } finally {
    await shutdownChild(trustedChild)
  }

  const unsignedProxyPort = await getAvailablePort()
  const unsignedProxyBaseUrl = `http://127.0.0.1:${unsignedProxyPort}`
  const unsignedProxyTail: TailState = { stdout: [], stderr: [] }
  const unsignedProxyChild = spawnBackend(unsignedProxyPort, unsignedProxyTail, {
    NODE_ENV: 'production',
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: buildSessionPersistPath('ai_player_provider_ops_deployment_guard_unsigned_proxy_store'),
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_provider_ops_deployment_guard_unsigned_proxy_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_provider_ops_deployment_guard_unsigned_proxy_session_state'),
    WORLD_STATE_PERSIST_PATH: seedWorldState('ai_player_provider_ops_deployment_guard_unsigned_proxy_world_state'),
    FACTION_CONFIG_STORE_PATH: buildSessionPersistPath('ai_player_provider_ops_deployment_guard_unsigned_proxy_faction_config'),
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: '',
    AI_PLAYER_RUNTIME_MODEL_API_KEY: '',
    LLM_RELAY_URL: '',
    LLM_RELAY_MODEL: '',
    LLM_RELAY_API_KEY: '',
    LLM_RELAY_API_KEYS: '',
    OPENAI_API_KEY: '',
    AI_PLAYER_PROVIDER_ACCOUNT_OPS_ALLOWED_ROLES: OPS_ROLE,
    AI_PLAYER_PROVIDER_ACCOUNT_OPS_ALLOWED_AUTH_SOURCES: OPS_AUTH_SOURCE,
    AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY: 'true',
    AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_SIGNATURE_SECRET: '',
  })

  try {
    const health = await waitForHealth(unsignedProxyBaseUrl)
    assert.ok(health, `unsigned proxy production guard backend did not become healthy\nstdout=${unsignedProxyTail.stdout.join('\n')}\nstderr=${unsignedProxyTail.stderr.join('\n')}`)

    const unsignedProxyProviderHealth = await requestJson(unsignedProxyBaseUrl, '/api/ai/provider/health', 'GET')
    assert.equal(unsignedProxyProviderHealth.status, 200, `unsigned proxy provider health read failed: ${JSON.stringify(unsignedProxyProviderHealth.data)}`)
    const unsignedProxyDeployment = readObject(readObject(unsignedProxyProviderHealth.data).opsMutationDeployment)
    assert.equal(unsignedProxyDeployment.production, true)
    assert.equal(unsignedProxyDeployment.internalOnly, false)
    assert.equal(unsignedProxyDeployment.trustedProxy, true)
    assert.equal(unsignedProxyDeployment.trustedProxySignatureConfigured, false)
    assert.equal(unsignedProxyDeployment.trustedProxySignatureRequired, true)
    assert.equal(unsignedProxyDeployment.trusted, false)
    assert.equal(unsignedProxyDeployment.mutationRoutesEnabled, false)
    assert.equal(unsignedProxyDeployment.blockedReason, 'provider_account_ops_trusted_proxy_signature_not_configured')
    assertNoSecretLeak(unsignedProxyProviderHealth.data)

    const unsignedProxyStartupHealth = await requestJson(unsignedProxyBaseUrl, '/api/health', 'GET')
    assert.equal(unsignedProxyStartupHealth.status, 200, `unsigned proxy startup health read failed: ${JSON.stringify(unsignedProxyStartupHealth.data)}`)
    const unsignedProxyPersistence = readObject(readObject(unsignedProxyStartupHealth.data).persistence)
    const unsignedProxyStartupProviderAccounts = readObject(unsignedProxyPersistence.aiPlayerProviderAccounts)
    assert.deepEqual(readObject(unsignedProxyStartupProviderAccounts.opsMutationDeployment), unsignedProxyDeployment)
    const unsignedProxyAlerts = readArray(unsignedProxyPersistence.alerts).map(readObject)
    const unsignedProxyAlert = unsignedProxyAlerts.find((alert) => alert.code === 'provider_account_ops_trusted_proxy_signature_not_configured')
    assert.ok(unsignedProxyAlert, `expected trusted proxy signature startup alert in ${JSON.stringify(unsignedProxyAlerts)}`)
    assert.equal(unsignedProxyAlert.source, 'aiPlayerProviderAccounts')
    assert.equal(unsignedProxyAlert.severity, 'high')
    assertNoSecretLeak(unsignedProxyStartupHealth.data)

    const unsignedProxyRuntimeConfig = await requestJson(unsignedProxyBaseUrl, '/api/ai/provider/account-pool/ops-runtime-config', 'GET')
    assert.equal(unsignedProxyRuntimeConfig.status, 200, `unsigned proxy runtime config read failed: ${JSON.stringify(unsignedProxyRuntimeConfig.data)}`)
    aiPlayerProviderAccountOpsRuntimeConfigResponseSchema.parse(unsignedProxyRuntimeConfig.data)
    const unsignedProxyRuntimeConfigPayload = readObject(unsignedProxyRuntimeConfig.data)
    assert.deepEqual(readObject(unsignedProxyRuntimeConfigPayload.opsMutationDeployment), unsignedProxyDeployment)
    assert.equal(readObject(unsignedProxyRuntimeConfigPayload.trustedProxyVerification).signatureRequired, true)
    assert.equal(readObject(unsignedProxyRuntimeConfigPayload.trustedProxyVerification).signatureSecretConfigured, false)
    assert.ok(readArray(unsignedProxyRuntimeConfigPayload.warnings).includes('provider_account_ops_trusted_proxy_signature_not_configured'))
    assertNoSecretLeak(unsignedProxyRuntimeConfig.data)

    const unsignedProxyRejected = await requestJsonWithHeaders(
      unsignedProxyBaseUrl,
      '/api/ai/provider/account-pool/ops-config',
      'POST',
      body,
      OPS_AUTH_HEADERS,
    )
    assert.equal(unsignedProxyRejected.status, 503)
    assert.equal(readObject(unsignedProxyRejected.data).error, 'provider_account_ops_trusted_proxy_signature_not_configured')
    assertNoSecretLeak(unsignedProxyRejected.data)
  } finally {
    await shutdownChild(unsignedProxyChild)
  }

  const proxyTrustedPort = await getAvailablePort()
  const proxyTrustedBaseUrl = `http://127.0.0.1:${proxyTrustedPort}`
  const proxyTrustedTail: TailState = { stdout: [], stderr: [] }
  const proxyTrustedChild = spawnBackend(proxyTrustedPort, proxyTrustedTail, {
    NODE_ENV: 'production',
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: buildSessionPersistPath('ai_player_provider_ops_deployment_guard_proxy_trusted_store'),
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_provider_ops_deployment_guard_proxy_trusted_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_provider_ops_deployment_guard_proxy_trusted_session_state'),
    WORLD_STATE_PERSIST_PATH: seedWorldState('ai_player_provider_ops_deployment_guard_proxy_trusted_world_state'),
    FACTION_CONFIG_STORE_PATH: buildSessionPersistPath('ai_player_provider_ops_deployment_guard_proxy_trusted_faction_config'),
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: '',
    AI_PLAYER_RUNTIME_MODEL_API_KEY: '',
    LLM_RELAY_URL: '',
    LLM_RELAY_MODEL: '',
    LLM_RELAY_API_KEY: '',
    LLM_RELAY_API_KEYS: '',
    OPENAI_API_KEY: '',
    AI_PLAYER_PROVIDER_ACCOUNT_OPS_ALLOWED_ROLES: OPS_ROLE,
    AI_PLAYER_PROVIDER_ACCOUNT_OPS_ALLOWED_AUTH_SOURCES: OPS_AUTH_SOURCE,
    AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY: 'true',
    AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_SIGNATURE_SECRET: OPS_PROXY_SECRET,
  })

  try {
    const health = await waitForHealth(proxyTrustedBaseUrl)
    assert.ok(health, `trusted proxy production guard backend did not become healthy\nstdout=${proxyTrustedTail.stdout.join('\n')}\nstderr=${proxyTrustedTail.stderr.join('\n')}`)

    const proxyTrustedProviderHealth = await requestJson(proxyTrustedBaseUrl, '/api/ai/provider/health', 'GET')
    assert.equal(proxyTrustedProviderHealth.status, 200, `trusted proxy provider health read failed: ${JSON.stringify(proxyTrustedProviderHealth.data)}`)
    const proxyTrustedDeployment = readObject(readObject(proxyTrustedProviderHealth.data).opsMutationDeployment)
    assert.equal(proxyTrustedDeployment.production, true)
    assert.equal(proxyTrustedDeployment.internalOnly, false)
    assert.equal(proxyTrustedDeployment.trustedProxy, true)
    assert.equal(proxyTrustedDeployment.trustedProxySignatureConfigured, true)
    assert.equal(proxyTrustedDeployment.trustedProxySignatureRequired, true)
    assert.equal(proxyTrustedDeployment.trusted, true)
    assert.equal(proxyTrustedDeployment.mutationRoutesEnabled, true)
    assert.equal(proxyTrustedDeployment.blockedReason, null)
    assertNoSecretLeak(proxyTrustedProviderHealth.data)

    const forged = await requestJsonWithHeaders(
      proxyTrustedBaseUrl,
      '/api/ai/provider/account-pool/ops-config',
      'POST',
      body,
      OPS_AUTH_HEADERS,
    )
    assert.equal(forged.status, 403)
    assert.equal(readObject(forged.data).error, 'provider_account_ops_proxy_not_trusted')
    assertNoSecretLeak(forged.data)

    const signed = await requestJsonWithHeaders(
      proxyTrustedBaseUrl,
      '/api/ai/provider/account-pool/ops-config',
      'POST',
      body,
      {
        ...OPS_AUTH_HEADERS,
        ...buildOpsProxySignatureHeaders('POST', '/api/ai/provider/account-pool/ops-config', OPS_PROXY_SECRET),
      },
    )
    assert.equal(signed.status, 200)
    assert.equal(readObject(signed.data).ok, true)
    assertNoSecretLeak(signed.data)
  } finally {
    await shutdownChild(proxyTrustedChild)
  }
}

function testTokenSummaryGroupingIncludesProviderAndModelDimensions() {
  const source = readFileSync(PROVIDER_ACCOUNT_STORE_SOURCE_PATH, 'utf-8')
  const start = source.indexOf('function buildTokenSummaryKey')
  const end = source.indexOf('function buildTokenBalanceKey')
  assert.ok(start >= 0 && end > start, 'expected buildTokenSummaryKey source section')
  const section = source.slice(start, end)
  assert.match(section, /entry\.aiPlayerId/)
  assert.match(section, /entry\.factionId/)
  assert.match(section, /entry\.governorPlayerId/)
  assert.match(section, /entry\.billingAccountType/)
  assert.match(section, /entry\.billingAccountId/)
  assert.match(section, /entry\.model/)
  assert.match(section, /entry\.provider/)
  assert.match(section, /entry\.keyFingerprint/)
}

function testProviderHealthErrorsAreSanitizedAtSource() {
  const source = readFileSync(PROVIDER_ACCOUNT_STORE_SOURCE_PATH, 'utf-8')
  const gateSource = existsSync(PROVIDER_EXTERNAL_BUDGET_GATE_SOURCE_PATH)
    ? readFileSync(PROVIDER_EXTERNAL_BUDGET_GATE_SOURCE_PATH, 'utf-8')
    : ''
  const outboxSource = existsSync(PROVIDER_EXTERNAL_LEDGER_AUDIT_OUTBOX_SOURCE_PATH)
    ? readFileSync(PROVIDER_EXTERNAL_LEDGER_AUDIT_OUTBOX_SOURCE_PATH, 'utf-8')
    : ''
  assert.match(source, /function sanitizeProviderHealthError\(/)
  assert.match(source, /sk-<redacted>/)
  assert.match(source, /Bearer <redacted>/)
  assert.match(source, /:\/\/<redacted>@/)
  assert.match(outboxSource, /externalLedgerAuditLastError = sanitizedError/)
  assert.match(gateSource, /externalBudgetGateLastError = sanitizeExternalBudgetGateError/)
  assert.doesNotMatch(gateSource, /Date\.now\(/)
}

function testAiCommandCreditsDebitOnlyOnSuccessfulProviderRequests() {
  const source = readFileSync(PROVIDER_ACCOUNT_STORE_SOURCE_PATH, 'utf-8')
  const start = source.indexOf('export function recordAiPlayerProviderModelRequestAccounting')
  const end = source.length
  assert.ok(start >= 0, 'expected recordAiPlayerProviderModelRequestAccounting source section')
  const section = source.slice(start, end)
  const failureReturn = section.indexOf('if (!input.ok || !input.selectedProvider)')
  const debitCall = section.indexOf('debitAiPlayerProviderAiCommandCredits')
  const successAudit = section.indexOf("eventType: 'provider_request_succeeded'")
  assert.ok(failureReturn >= 0, 'expected explicit failed provider accounting branch')
  assert.ok(debitCall > failureReturn, 'AI command credit debit must stay after failed provider accounting return branch')
  assert.ok(successAudit > debitCall, 'AI command credit debit should be tied to successful provider accounting before success audit')
  assert.match(section, /reason: 'provider_request_succeeded'/)
}

function testProviderAccountStoreUsesFocusedReadModelModules() {
  const source = readFileSync(PROVIDER_ACCOUNT_STORE_SOURCE_PATH, 'utf-8')
  assert.match(source, /from '\.\/aiPlayerProviderAccountOpsAudit'/)
  assert.match(source, /from '\.\/aiPlayerProviderAiCommandCredits'/)
  assert.match(source, /from '\.\/aiPlayerProviderPricingReadModel'/)
}

function testProviderAccountOpsRuntimeConfigDeclaresReadOnlyConsumerContract() {
  const injectedNow = '2026-05-22T08:30:00.000Z'
  const runtimeConfig = buildProviderAccountOpsRuntimeConfig('/api/ai/provider', { nowIso: () => injectedNow })
  aiPlayerProviderAccountOpsRuntimeConfigResponseSchema.parse(runtimeConfig)
  assert.equal(runtimeConfig.generatedAt, injectedNow)
  const readOnlyConsumer = readObject((runtimeConfig as Record<string, unknown>).readOnlyConsumer)
  assert.equal(readOnlyConsumer.mutationRequired, false)
  assert.equal(readOnlyConsumer.exposesSecrets, false)
  assert.equal(readOnlyConsumer.exposesRawProviderPayloads, false)
  const routes = readArray(readOnlyConsumer.routes).map((route) => readObject(route))
  assert.deepEqual(
    routes.map((route) => route.path),
    [
      '/api/ai/provider/account-pool/ops-runtime-config',
      '/api/ai/provider/account-pool',
      '/api/ai/provider/account-pool/ops-audit',
    ],
  )
  assert.equal(routes.every((route) => route.method === 'GET'), true)
  for (const route of routes) {
    const safeFields = readArray(route.safeFields).map(String)
    for (const unsafeFragment of ['apiKey', 'authorization', 'rawProviderPayload', 'prompt', 'completion', 'rawResponse']) {
      assert.equal(
        safeFields.some((field) => field.toLowerCase().includes(unsafeFragment.toLowerCase())),
        false,
        `${route.id} safeFields must not expose ${unsafeFragment}`,
      )
    }
  }
  const runtimeConfigRoute = routes.find((route) => route.id === 'ops_runtime_config')
  assert.ok(runtimeConfigRoute, 'expected ops runtime config read-only consumer route')
  assert.equal(runtimeConfigRoute.responseContract, 'AiPlayerProviderAccountOpsRuntimeConfigResponse')
  assert.deepEqual(readArray(runtimeConfigRoute.optionalQueryParams), [])
  assert.ok(readArray(runtimeConfigRoute.safeFields).includes('opsMutationDeployment'))
  assert.ok(readArray(runtimeConfigRoute.safeFields).includes('trustedProxyVerification'))
  assert.ok(readArray(runtimeConfigRoute.forbiddenFields).includes('apiKey'))
  assert.ok(readArray(runtimeConfigRoute.forbiddenFields).includes('authorization'))
  assert.ok(readArray(runtimeConfigRoute.forbiddenFields).includes('trustedProxySignatureSecretValue'))
  const accountPoolRoute = routes.find((route) => route.id === 'account_pool')
  assert.ok(accountPoolRoute, 'expected account pool read-only consumer route')
  assert.equal(accountPoolRoute.responseContract, 'AiPlayerProviderAccountPoolReadModelResponse')
  assert.deepEqual(
    readArray(accountPoolRoute.optionalQueryParams),
    ['factionId', 'ownerPlayerId', 'governorPlayerId'],
  )
  assert.ok(readArray(accountPoolRoute.safeFields).includes('accounts[].keyFingerprint'))
  assert.ok(readArray(accountPoolRoute.safeFields).includes('accounts[].ops.enabled'))
  assert.ok(readArray(accountPoolRoute.safeFields).includes('accounts[].healthStatus'))
  assert.ok(readArray(accountPoolRoute.forbiddenFields).includes('accounts[].apiKey'))
  assert.ok(readArray(accountPoolRoute.forbiddenFields).includes('accounts[].rawProviderPayload'))
  assert.ok(readArray(accountPoolRoute.forbiddenFields).includes('accounts[].prompt'))
  assert.ok(readArray(accountPoolRoute.forbiddenFields).includes('accounts[].completion'))
  const opsAuditRoute = routes.find((route) => route.id === 'ops_audit')
  assert.ok(opsAuditRoute, 'expected ops audit read-only consumer route')
  assert.equal(opsAuditRoute.responseContract, 'ListAiPlayerProviderAccountPoolOpsAuditResponse')
  assert.deepEqual(
    readArray(opsAuditRoute.optionalQueryParams),
    ['provider', 'model', 'keyFingerprint', 'actorId', 'enabled', 'limit'],
  )
  assert.ok(readArray(opsAuditRoute.safeFields).includes('items[].keyFingerprint'))
  assert.ok(readArray(opsAuditRoute.safeFields).includes('items[].opsReason'))
  assert.ok(readArray(opsAuditRoute.forbiddenFields).includes('items[].apiKey'))
  assert.ok(readArray(opsAuditRoute.forbiddenFields).includes('items[].authorization'))
  assert.ok(readArray(opsAuditRoute.forbiddenFields).includes('items[].rawProviderPayload'))
}

function testProviderAccountOpsTrustedProxySignatureFreshnessUsesInjectedClock() {
  const previousEnv = {
    NODE_ENV: process.env.NODE_ENV,
    internalOnly: process.env.AI_PLAYER_PROVIDER_ACCOUNT_OPS_INTERNAL_ONLY,
    trustedProxy: process.env.AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY,
    trustedProxySignatureSecret: process.env.AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_SIGNATURE_SECRET,
  }
  const path = '/api/ai/provider/account-pool/ops-config'
  const timestamp = '2099-01-01T00:00:00.000Z'
  const signedHeaders = buildOpsProxySignatureHeaders('POST', path, OPS_PROXY_SECRET, timestamp)
  const req = {
    method: 'POST',
    headers: Object.fromEntries(Object.entries(signedHeaders).map(([key, value]) => [key.toLowerCase(), value])),
  } as unknown as IncomingMessage
  const res = {
    statusCode: 200,
    setHeader: () => undefined,
    end: () => undefined,
  } as unknown as ServerResponse

  try {
    process.env.NODE_ENV = 'production'
    delete process.env.AI_PLAYER_PROVIDER_ACCOUNT_OPS_INTERNAL_ONLY
    process.env.AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY = 'true'
    process.env.AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_SIGNATURE_SECRET = OPS_PROXY_SECRET

    const rejected = rejectUntrustedProviderAccountOpsMutation(req, res, path, { nowIso: () => timestamp })
    assert.equal(rejected, false, 'trusted proxy freshness must use injected clock when provided')
  } finally {
    if (previousEnv.NODE_ENV === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousEnv.NODE_ENV
    if (previousEnv.internalOnly === undefined) delete process.env.AI_PLAYER_PROVIDER_ACCOUNT_OPS_INTERNAL_ONLY
    else process.env.AI_PLAYER_PROVIDER_ACCOUNT_OPS_INTERNAL_ONLY = previousEnv.internalOnly
    if (previousEnv.trustedProxy === undefined) delete process.env.AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY
    else process.env.AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY = previousEnv.trustedProxy
    if (previousEnv.trustedProxySignatureSecret === undefined) {
      delete process.env.AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_SIGNATURE_SECRET
    } else {
      process.env.AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_SIGNATURE_SECRET = previousEnv.trustedProxySignatureSecret
    }
  }
}

function testExternalBudgetGateIsFocusedModuleAndFailureSafe() {
  assert.equal(existsSync(PROVIDER_EXTERNAL_BUDGET_GATE_SOURCE_PATH), true, 'expected external budget gate focused module')
  const storeSource = readFileSync(PROVIDER_ACCOUNT_STORE_SOURCE_PATH, 'utf-8')
  const gateSource = readFileSync(PROVIDER_EXTERNAL_BUDGET_GATE_SOURCE_PATH, 'utf-8')
  assert.match(storeSource, /from '\.\/aiPlayerProviderExternalBudgetGate'/)
  assert.doesNotMatch(storeSource, /async function postExternalBudgetGate\(/)
  assert.doesNotMatch(storeSource, /async function reserveExternalProviderBudget\(/)
  assert.doesNotMatch(storeSource, /async function notifyExternalBudgetGate\(/)
  assert.match(gateSource, /async function postExternalBudgetGate\(/)
  assert.match(gateSource, /export async function reserveExternalProviderBudgetGate\(/)
  assert.match(gateSource, /export async function notifyExternalBudgetGate\(/)
  assert.match(gateSource, /externalBudgetGateLastError = sanitizeExternalBudgetGateError/)

  const accountingStart = storeSource.indexOf('export function recordAiPlayerProviderModelRequestAccounting')
  assert.ok(accountingStart >= 0, 'expected recordAiPlayerProviderModelRequestAccounting source section')
  const accountingSection = storeSource.slice(accountingStart)
  const failureBranch = accountingSection.indexOf('if (!input.ok || !input.selectedProvider)')
  const reservationRelease = accountingSection.indexOf('releaseAiPlayerProviderAiCommandCreditReservation')
  const reservationCommit = accountingSection.indexOf('commitAiPlayerProviderAiCommandCreditReservation')
  assert.ok(failureBranch >= 0, 'expected failed provider branch')
  assert.ok(reservationRelease > failureBranch, 'failed/429/backoff provider accounting must release AI command credit reservation')
  assert.ok(reservationCommit > reservationRelease, 'AI command credit reservation commit must stay after failure release branch')
}

async function testExternalBudgetGateUsesInjectedClockForHealthAndTtl() {
  const previousUrl = process.env.AI_PLAYER_PROVIDER_BUDGET_GATE_URL
  const previousTtl = process.env.AI_PLAYER_PROVIDER_BUDGET_RESERVATION_TTL_MS
  const port = await getAvailablePort()
  const receivedBodies: any[] = []
  const server = createServer((request: IncomingMessage, response) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
    })
    request.on('end', () => {
      receivedBodies.push(JSON.parse(body))
      if (receivedBodies.length === 1) {
        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ ok: true }))
        return
      }
      response.writeHead(500, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ ok: false }))
    })
  })
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))

  try {
    process.env.AI_PLAYER_PROVIDER_BUDGET_GATE_URL = `http://127.0.0.1:${port}/provider-budget-gate`
    process.env.AI_PLAYER_PROVIDER_BUDGET_RESERVATION_TTL_MS = '5000'
    const successNowIso = '2000-01-01T00:00:10.000Z'
    const failureNowIso = '2000-01-01T00:00:20.000Z'
    const result = await reserveExternalProviderBudgetGate(
      {
        factionId: FACTION_ID,
        governorPlayerId: GOVERNOR_PLAYER_ID,
        model: PLAYER_MODEL,
        provider: 'deepseek',
        source: 'default',
        byokSource: 'none',
        idempotencyKey: 'budget_gate_injected_clock_reserve',
      },
      {
        budgetWindowKey: 'budget_window_injected_clock',
        factionId: FACTION_ID,
        governorPlayerId: GOVERNOR_PLAYER_ID,
        provider: 'deepseek',
        model: PLAYER_MODEL,
        billingAccountType: 'platform',
        billingAccountId: null,
        budgetTier: 'standard',
        limitMode: 'local_soft',
        maxRuns: 10,
        maxPromptTokens: null,
        maxCompletionTokens: null,
        maxTotalTokens: null,
        maxEstimatedCostUsd: null,
        reservedRuns: 0,
        consumedRuns: 0,
        consumedPromptTokens: 0,
        consumedCompletionTokens: 0,
        consumedTotalTokens: 0,
        consumedEstimatedCostUsd: 0,
        windowStartedAt: '2000-01-01T00:00:00.000Z',
        windowEndsAt: '2000-01-02T00:00:00.000Z',
        updatedAt: '2000-01-01T00:00:00.000Z',
      } as any,
      { nowIso: () => successNowIso },
    )
    assert.equal(result?.expiresAt, '2000-01-01T00:00:15.000Z')
    assert.equal(receivedBodies[0].sentAt, successNowIso)
    assert.equal(receivedBodies[0].reserve.expiresAt, '2000-01-01T00:00:15.000Z')
    assert.equal(getExternalBudgetGateHealth().lastSuccessAt, Date.parse(successNowIso))

    await notifyExternalBudgetGate(
      'release',
      {
        reservationId: result?.desiredReservationId ?? 'budget_res_injected_clock',
        provider: 'deepseek',
        model: PLAYER_MODEL,
      },
      {},
      { nowIso: () => failureNowIso },
    )
    const health = getExternalBudgetGateHealth()
    assert.equal(receivedBodies[1].sentAt, failureNowIso)
    assert.equal(health.lastFailureAt, Date.parse(failureNowIso))
    assert.match(String(health.lastError), /external_budget_gate_500/)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    if (previousUrl === undefined) {
      delete process.env.AI_PLAYER_PROVIDER_BUDGET_GATE_URL
    } else {
      process.env.AI_PLAYER_PROVIDER_BUDGET_GATE_URL = previousUrl
    }
    if (previousTtl === undefined) {
      delete process.env.AI_PLAYER_PROVIDER_BUDGET_RESERVATION_TTL_MS
    } else {
      process.env.AI_PLAYER_PROVIDER_BUDGET_RESERVATION_TTL_MS = previousTtl
    }
  }
}

function testExternalLedgerAuditOutboxIsFocusedModule() {
  assert.equal(existsSync(PROVIDER_EXTERNAL_LEDGER_AUDIT_OUTBOX_SOURCE_PATH), true, 'expected external ledger audit outbox focused module')
  const storeSource = readFileSync(PROVIDER_ACCOUNT_STORE_SOURCE_PATH, 'utf-8')
  const outboxSource = readFileSync(PROVIDER_EXTERNAL_LEDGER_AUDIT_OUTBOX_SOURCE_PATH, 'utf-8')
  assert.match(storeSource, /from '\.\/aiPlayerProviderExternalLedgerAuditOutbox'/)
  assert.doesNotMatch(storeSource, /async function postExternalLedgerAuditPayload\(/)
  assert.doesNotMatch(storeSource, /function scheduleFailedExternalLedgerAuditRetry\(/)
  assert.doesNotMatch(storeSource, /async function drainExternalLedgerAuditSync\(/)
  assert.doesNotMatch(storeSource, /let externalLedgerAuditTimer/)
  assert.doesNotMatch(storeSource, /AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL/)
  assert.doesNotMatch(storeSource, /AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_HMAC_SECRET/)
  assert.doesNotMatch(storeSource, /buildSignedHeaders/)
  assert.doesNotMatch(storeSource, /createHmac/)
  assert.doesNotMatch(storeSource, /fetch\(/)
  assert.doesNotMatch(storeSource, /function sanitizeExternalLedgerAuditOutboxItem\(/)
  assert.doesNotMatch(storeSource, /const MAX_EXTERNAL_LEDGER_AUDIT_OUTBOX_ITEMS =/)
  assert.doesNotMatch(storeSource, /const persistedExternalOutbox =/)
  assert.doesNotMatch(storeSource, /externalLedgerAuditOutbox\.push\(/)
  assert.doesNotMatch(storeSource, /externalLedgerAuditOutbox\.length >= MAX_EXTERNAL_LEDGER_AUDIT_OUTBOX_ITEMS/)
  assert.doesNotMatch(storeSource, /externalLedgerAuditOutbox\.slice/)
  assert.doesNotMatch(storeSource, /MAX_EXTERNAL_LEDGER_AUDIT_OUTBOX_ITEMS/)
  assert.match(outboxSource, /export function createExternalLedgerAuditOutboxController\(/)
  assert.match(outboxSource, /export function sanitizeExternalLedgerAuditOutboxItem\(/)
  assert.match(outboxSource, /export function loadExternalLedgerAuditOutboxItems\(/)
  assert.match(outboxSource, /export function toPersistedExternalLedgerAuditOutboxItems\(/)
  assert.match(outboxSource, /export const MAX_EXTERNAL_LEDGER_AUDIT_OUTBOX_ITEMS =/)
  assert.match(outboxSource, /async function postExternalLedgerAuditPayload\(/)
  assert.match(outboxSource, /function scheduleFailedExternalLedgerAuditRetry\(/)
  assert.match(outboxSource, /async function drainExternalLedgerAuditSync\(/)
  assert.match(outboxSource, /AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL/)
  assert.match(outboxSource, /AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_HMAC_SECRET/)
  assert.match(outboxSource, /buildSignedHeaders/)
  assert.match(outboxSource, /createHmac/)
  assert.match(outboxSource, /fetch\(/)
  assert.doesNotMatch(outboxSource, /Date\.now\(/)
}

function testExternalLedgerAuditOutboxPersistedItemsAreCloned() {
  const outbox: ExternalLedgerAuditOutboxItem[] = [
    {
      schemaVersion: 1,
      source: 'ai-player-provider-account-store',
      sentAt: '2026-05-21T00:00:00.000Z',
      billingLedgerEntries: [],
      auditEvents: [],
      outboxId: 'provider_outbox_old',
      idempotencyKey: 'provider_outbox_old',
      createdAt: '2026-05-21T00:00:00.000Z',
      nextAttemptAt: '2026-05-21T00:00:00.000Z',
      attemptCount: 0,
      lastError: 'old',
    },
    {
      schemaVersion: 1,
      source: 'ai-player-provider-account-store',
      sentAt: '2026-05-21T00:01:00.000Z',
      billingLedgerEntries: [],
      auditEvents: [],
      outboxId: 'provider_outbox_new',
      idempotencyKey: 'provider_outbox_new',
      createdAt: '2026-05-21T00:01:00.000Z',
      nextAttemptAt: '2026-05-21T00:01:00.000Z',
      attemptCount: 1,
      lastError: 'original',
    },
  ]

  const persisted = toPersistedExternalLedgerAuditOutboxItems(outbox, 1)
  assert.equal(persisted.length, 1)
  assert.equal(persisted[0].outboxId, 'provider_outbox_new')
  persisted[0].lastError = 'mutated'
  assert.equal(outbox[1].lastError, 'original')
  assert.deepEqual(toPersistedExternalLedgerAuditOutboxItems(outbox, 0), [])
}

function testExternalLedgerAuditOutboxLoadMaxItemsIsNormalized() {
  const outbox: ExternalLedgerAuditOutboxItem[] = []
  const now = '2026-05-21T00:00:00.000Z'
  const items = ['provider_outbox_load_1', 'provider_outbox_load_2'].map((outboxId) => ({
    schemaVersion: 1,
    source: 'ai-player-provider-account-store',
    sentAt: now,
    billingLedgerEntries: [],
    auditEvents: [{ eventId: `${outboxId}_audit`, createdAt: now }],
    outboxId,
    idempotencyKey: outboxId,
    createdAt: now,
    nextAttemptAt: now,
    attemptCount: 0,
  }))

  const loaded = loadExternalLedgerAuditOutboxItems(items, {
    outbox,
    maxItems: 1.5,
    sanitizeOptionalId: (input: unknown) => (typeof input === 'string' ? input : undefined),
    sanitizeBillingEntry: () => null,
    sanitizeAuditEvent: (input: unknown) => (input && typeof input === 'object' ? (input as any) : null),
    clipString: (input: unknown, maxLength: number) => (typeof input === 'string' ? input.slice(0, maxLength) : undefined),
    sanitizeNonnegativeInteger: (input: unknown) => {
      const value = Number(input)
      return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0
    },
    sanitizeReason: (input: unknown) => (typeof input === 'string' ? input : undefined),
    nowIso: () => now,
  })

  assert.equal(loaded, 1)
  assert.equal(outbox.length, 1)
  assert.equal(outbox[0].outboxId, 'provider_outbox_load_1')
}

function testExternalLedgerAuditOutboxLoadNormalizesInvalidTimestamps() {
  const outbox: ExternalLedgerAuditOutboxItem[] = []
  const now = '2026-05-21T00:00:00.000Z'
  const loaded = loadExternalLedgerAuditOutboxItems([
    {
      schemaVersion: 1,
      source: 'ai-player-provider-account-store',
      sentAt: 'not-a-date',
      billingLedgerEntries: [],
      auditEvents: [{ eventId: 'provider_outbox_invalid_timestamp_audit', createdAt: now }],
      outboxId: 'provider_outbox_invalid_timestamp',
      idempotencyKey: 'provider_outbox_invalid_timestamp',
      createdAt: 'also-not-a-date',
      nextAttemptAt: 'never-ready',
      attemptCount: 0,
    },
  ], {
    outbox,
    sanitizeOptionalId: (input: unknown) => (typeof input === 'string' ? input : undefined),
    sanitizeBillingEntry: () => null,
    sanitizeAuditEvent: (input: unknown) => (input && typeof input === 'object' ? (input as any) : null),
    clipString: (input: unknown, maxLength: number) => (typeof input === 'string' ? input.slice(0, maxLength) : undefined),
    sanitizeNonnegativeInteger: (input: unknown) => {
      const value = Number(input)
      return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0
    },
    sanitizeReason: (input: unknown) => (typeof input === 'string' ? input : undefined),
    nowIso: () => now,
  })

  assert.equal(loaded, 1)
  assert.equal(outbox.length, 1)
  assert.equal(outbox[0].sentAt, now)
  assert.equal(outbox[0].createdAt, now)
  assert.equal(outbox[0].nextAttemptAt, now)
}

function testExternalLedgerAuditOutboxControllerSkipsEmptyPayloads() {
  const previousUrl = process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL
  const outbox: ExternalLedgerAuditOutboxItem[] = []
  let persistCount = 0
  const controller = createExternalLedgerAuditOutboxController({
    outbox,
    schedulePersist: () => {
      persistCount += 1
    },
    sanitizeError: (error: unknown) => (error instanceof Error ? error.message : String(error)),
    nowIso: () => '2026-05-21T00:00:00.000Z',
  })

  try {
    process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL = 'http://127.0.0.1:1/provider-ledger-audit'
    controller.enqueue({})
    assert.equal(outbox.length, 0)
    assert.equal(persistCount, 0)
  } finally {
    controller.clearTimer()
    if (previousUrl === undefined) {
      delete process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL
    } else {
      process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL = previousUrl
    }
  }
}

function testExternalLedgerAuditOutboxControllerRespectsZeroMaxItems() {
  const previousUrl = process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL
  const outbox: ExternalLedgerAuditOutboxItem[] = []
  let persistCount = 0
  const controller = createExternalLedgerAuditOutboxController({
    outbox,
    maxItems: 0,
    schedulePersist: () => {
      persistCount += 1
    },
    sanitizeError: (error: unknown) => (error instanceof Error ? error.message : String(error)),
    nowIso: () => '2026-05-21T00:00:00.000Z',
  })

  try {
    process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL = 'http://127.0.0.1:1/provider-ledger-audit'
    controller.enqueue({
      auditEvent: {
        eventId: 'provider_outbox_zero_max_audit',
        createdAt: '2026-05-21T00:00:00.000Z',
      } as any,
    })
    assert.equal(outbox.length, 0)
    assert.equal(persistCount, 0)
  } finally {
    controller.clearTimer()
    if (previousUrl === undefined) {
      delete process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL
    } else {
      process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL = previousUrl
    }
  }
}

async function testExternalLedgerAuditOutboxDrainKeepsItemsWhenUnconfigured() {
  const previousUrl = process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL
  const outbox: ExternalLedgerAuditOutboxItem[] = [
    {
      schemaVersion: 1,
      source: 'ai-player-provider-account-store',
      sentAt: '2026-05-21T00:00:00.000Z',
      billingLedgerEntries: [],
      auditEvents: [{ eventId: 'provider_outbox_unconfigured_audit', createdAt: '2026-05-21T00:00:00.000Z' } as any],
      outboxId: 'provider_outbox_unconfigured',
      idempotencyKey: 'provider_outbox_unconfigured',
      createdAt: '2026-05-21T00:00:00.000Z',
      nextAttemptAt: '2026-05-21T00:00:00.000Z',
      attemptCount: 0,
    },
  ]
  let persistCount = 0
  const controller = createExternalLedgerAuditOutboxController({
    outbox,
    schedulePersist: () => {
      persistCount += 1
    },
    sanitizeError: (error: unknown) => (error instanceof Error ? error.message : String(error)),
    nowIso: () => '2026-05-21T00:00:00.000Z',
  })

  try {
    delete process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL
    await controller.drain()
    const health = controller.getHealth()
    assert.equal(outbox.length, 1)
    assert.equal(health.successCount, 0)
    assert.equal(health.failureCount, 0)
    assert.equal(persistCount, 0)
  } finally {
    controller.clearTimer()
    if (previousUrl === undefined) {
      delete process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL
    } else {
      process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL = previousUrl
    }
  }
}

async function testExternalLedgerAuditOutboxRetryErrorIsClipped() {
  const previousUrl = process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL
  const port = await getAvailablePort()
  const server = createServer((_request, response) => {
    response.writeHead(503, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ ok: false }))
  })
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))

  const outbox: ExternalLedgerAuditOutboxItem[] = [
    {
      schemaVersion: 1,
      source: 'ai-player-provider-account-store',
      sentAt: '2026-05-21T00:00:00.000Z',
      billingLedgerEntries: [],
      auditEvents: [{ eventId: 'provider_outbox_retry_error_audit', createdAt: '2026-05-21T00:00:00.000Z' } as any],
      outboxId: 'provider_outbox_retry_error',
      idempotencyKey: 'provider_outbox_retry_error',
      createdAt: '2026-05-21T00:00:00.000Z',
      nextAttemptAt: '2026-05-21T00:00:00.000Z',
      attemptCount: 0,
    },
  ]
  let persistCount = 0
  const longError = 'external-ledger-audit-db-failure-'.repeat(40)
  const controller = createExternalLedgerAuditOutboxController({
    outbox,
    schedulePersist: () => {
      persistCount += 1
    },
    sanitizeError: () => longError,
    nowIso: () => '2026-05-21T00:00:00.000Z',
  })

  try {
    process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL = `http://127.0.0.1:${port}/provider-ledger-audit`
    await controller.drain()
    const health = controller.getHealth()
    assert.equal(outbox.length, 1)
    assert.equal(outbox[0].attemptCount, 1)
    assert.equal(outbox[0].lastError?.length, 500)
    assert.equal(outbox[0].nextAttemptAt, '2026-05-21T00:00:02.000Z')
    assert.equal(health.lastError?.length, 500)
    assert.equal(health.failureCount, 1)
    assert.equal(health.lastFailureAt, Date.parse('2026-05-21T00:00:00.000Z'))
    assert.equal(persistCount, 1)
  } finally {
    controller.clearTimer()
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    if (previousUrl === undefined) {
      delete process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL
    } else {
      process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL = previousUrl
    }
  }
}

async function testExternalLedgerAuditOutboxDrainTreatsInvalidNextAttemptAsReady() {
  const previousUrl = process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL
  const port = await getAvailablePort()
  let requestCount = 0
  let postedPayload: any = null
  const server = createServer((request, response) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      body += chunk
    })
    request.on('end', () => {
      postedPayload = JSON.parse(body)
      requestCount += 1
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ ok: true }))
    })
  })
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))

  const outbox: ExternalLedgerAuditOutboxItem[] = [
    {
      schemaVersion: 1,
      source: 'ai-player-provider-account-store',
      sentAt: '2026-05-21T00:00:00.000Z',
      billingLedgerEntries: [],
      auditEvents: [{ eventId: 'provider_outbox_invalid_next_attempt_audit', createdAt: '2026-05-21T00:00:00.000Z' } as any],
      outboxId: 'provider_outbox_invalid_next_attempt',
      idempotencyKey: 'provider_outbox_invalid_next_attempt',
      createdAt: '2026-05-21T00:00:00.000Z',
      nextAttemptAt: 'not-a-date',
      attemptCount: 0,
    },
  ]
  let persistCount = 0
  const controller = createExternalLedgerAuditOutboxController({
    outbox,
    schedulePersist: () => {
      persistCount += 1
    },
    sanitizeError: (error: unknown) => (error instanceof Error ? error.message : String(error)),
    nowIso: () => '2026-05-21T00:00:00.000Z',
  })

  try {
    process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL = `http://127.0.0.1:${port}/provider-ledger-audit`
    await controller.drain()
    const health = controller.getHealth()
    assert.equal(requestCount, 1)
    assert.equal(outbox.length, 0)
    assert.equal(health.successCount, 1)
    assert.equal(health.lastSuccessAt, Date.parse('2026-05-21T00:00:00.000Z'))
    assert.equal(health.failureCount, 0)
    assert.equal(persistCount, 1)
    assert.equal(postedPayload?.sentAt, '2026-05-21T00:00:00.000Z')
  } finally {
    controller.clearTimer()
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    if (previousUrl === undefined) {
      delete process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL
    } else {
      process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL = previousUrl
    }
  }
}

async function testExternalLedgerAuditOutboxDrainUsesInjectedClockForReadiness() {
  const previousUrl = process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL
  const port = await getAvailablePort()
  let requestCount = 0
  const server = createServer((_request, response) => {
    requestCount += 1
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ ok: true }))
  })
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))

  const outbox: ExternalLedgerAuditOutboxItem[] = [
    {
      schemaVersion: 1,
      source: 'ai-player-provider-account-store',
      sentAt: '2000-01-01T00:00:00.000Z',
      billingLedgerEntries: [],
      auditEvents: [{ eventId: 'provider_outbox_injected_clock_audit', createdAt: '2000-01-01T00:00:00.000Z' } as any],
      outboxId: 'provider_outbox_injected_clock',
      idempotencyKey: 'provider_outbox_injected_clock',
      createdAt: '2000-01-01T00:00:00.000Z',
      nextAttemptAt: '2000-01-01T00:00:01.000Z',
      attemptCount: 0,
    },
  ]
  let persistCount = 0
  const controller = createExternalLedgerAuditOutboxController({
    outbox,
    schedulePersist: () => {
      persistCount += 1
    },
    sanitizeError: (error: unknown) => (error instanceof Error ? error.message : String(error)),
    nowIso: () => '2000-01-01T00:00:00.000Z',
  })

  try {
    process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL = `http://127.0.0.1:${port}/provider-ledger-audit`
    await controller.drain()
    const health = controller.getHealth()
    assert.equal(requestCount, 0)
    assert.equal(outbox.length, 1)
    assert.equal(health.successCount, 0)
    assert.equal(health.failureCount, 0)
    assert.equal(persistCount, 0)
  } finally {
    controller.clearTimer()
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    if (previousUrl === undefined) {
      delete process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL
    } else {
      process.env.AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL = previousUrl
    }
  }
}

async function run() {
  testTokenSummaryGroupingIncludesProviderAndModelDimensions()
  testProviderHealthErrorsAreSanitizedAtSource()
  testAiCommandCreditsDebitOnlyOnSuccessfulProviderRequests()
  testDeepSeekBillingReadModelUsesInjectedClockForWindows()
  testDeepSeekBillingLedgerOnlyWindowsUseLedgerRequestCounts()
  testDeepSeekBillingEmptyLedgerWarningIsDistinctFromMissingManualRequestCount()
  testProviderAccountStoreUsesFocusedReadModelModules()
  testProviderAccountOpsRuntimeConfigDeclaresReadOnlyConsumerContract()
  testProviderAccountOpsTrustedProxySignatureFreshnessUsesInjectedClock()
  testExternalBudgetGateIsFocusedModuleAndFailureSafe()
  await testExternalBudgetGateUsesInjectedClockForHealthAndTtl()
  testExternalLedgerAuditOutboxIsFocusedModule()
  testExternalLedgerAuditOutboxPersistedItemsAreCloned()
  testExternalLedgerAuditOutboxLoadMaxItemsIsNormalized()
  testExternalLedgerAuditOutboxLoadNormalizesInvalidTimestamps()
  testExternalLedgerAuditOutboxControllerSkipsEmptyPayloads()
  testExternalLedgerAuditOutboxControllerRespectsZeroMaxItems()
  await testExternalLedgerAuditOutboxDrainKeepsItemsWhenUnconfigured()
  await testExternalLedgerAuditOutboxRetryErrorIsClipped()
  await testExternalLedgerAuditOutboxDrainTreatsInvalidNextAttemptAsReady()
  await testExternalLedgerAuditOutboxDrainUsesInjectedClockForReadiness()
  await testProductionProviderOpsMutationRequiresDeploymentGuard()

  const relay = await startRelayProbe()
  const budgetGate = await startBudgetGateProbe()
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const providerAccountStorePath = buildSessionPersistPath('ai_player_provider_accounting_store')
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: providerAccountStorePath,
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_provider_accounting_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_provider_accounting_session_state'),
    WORLD_STATE_PERSIST_PATH: seedWorldState(),
    FACTION_CONFIG_STORE_PATH: buildSessionPersistPath('ai_player_provider_accounting_faction_config'),
    FACTION_APIKEY_ENCRYPTION_KEY: ENCRYPTION_KEY,
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: '',
    AI_PLAYER_RUNTIME_MODEL_API_KEY: '',
    LLM_RELAY_URL: '',
    LLM_RELAY_MODEL: '',
    LLM_RELAY_API_KEY: '',
    LLM_RELAY_API_KEYS: '',
    OPENAI_API_KEY: '',
    AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY: '1',
    AI_PLAYER_RUNTIME_MODEL_QUEUE_LIMIT: '2',
    AI_PLAYER_AI_COMMAND_CREDIT_WORLD_ID: 'season_alpha',
    AI_PLAYER_PROVIDER_BUDGET_MAX_TOTAL_TOKENS_PER_WINDOW: '100000',
    AI_PLAYER_PROVIDER_BUDGET_GATE_URL: `${budgetGate.baseUrl}/budget-gate`,
    AI_PLAYER_PROVIDER_BUDGET_GATE_HMAC_SECRET: BUDGET_GATE_SECRET,
    AI_PLAYER_PROVIDER_BUDGET_GATE_TIMEOUT_MS: '1000',
    AI_PLAYER_PROVIDER_BUDGET_GATE_FAIL_OPEN: 'true',
    AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_URL: `http://audit-user:${LEDGER_AUDIT_SECRET}@127.0.0.1:9/provider-audit`,
    AI_PLAYER_PROVIDER_LEDGER_AUDIT_DB_HMAC_SECRET: LEDGER_AUDIT_SECRET,
    AI_PLAYER_PROVIDER_ACCOUNT_OPS_ALLOWED_ROLES: OPS_ROLE,
    AI_PLAYER_PROVIDER_ACCOUNT_OPS_ALLOWED_AUTH_SOURCES: OPS_AUTH_SOURCE,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const providerHealth = await requestJson(baseUrl, '/api/ai/provider/health', 'GET')
    assert.equal(providerHealth.status, 200, `provider health read failed: ${JSON.stringify(providerHealth.data)}`)
    aiPlayerProviderAccountHealthResponseSchema.parse(providerHealth.data)
    const providerHealthPayload = readObject(providerHealth.data)
    assert.equal(readObject(providerHealthPayload.security).encryptionKeyConfigured, true)
    assert.equal(readObject(providerHealthPayload.externalBudgetGate).configured, true)
    assert.equal(readObject(providerHealthPayload.externalBudgetGate).hmacConfigured, true)
    assert.equal(readObject(providerHealthPayload.externalBudgetGate).failOpen, true)
    assert.equal(readObject(providerHealthPayload.externalLedgerAuditDb).configured, true)
    assert.equal(readObject(providerHealthPayload.externalLedgerAuditDb).hmacConfigured, true)
    assertNoSecretLeak(providerHealth.data)

    const savePlayerKey = await requestJson(baseUrl, `/api/ai/provider/player-keys/${GOVERNOR_PLAYER_ID}`, 'POST', {
      model: PLAYER_MODEL,
      baseUrl: relay.baseUrl,
      apiKey: PLAYER_SECRET,
      updatedBy: GOVERNOR_PLAYER_ID,
    })
    assert.equal(savePlayerKey.status, 200, `player key save failed: ${JSON.stringify(savePlayerKey.data)}`)
    aiPlayerProviderPlayerKeyMutationResponseSchema.parse(savePlayerKey.data)
    const savedKey = readObject(readObject(savePlayerKey.data).key)
    assert.equal(savedKey.ownerPlayerId, GOVERNOR_PLAYER_ID)
    assert.equal(savedKey.model, PLAYER_MODEL)
    assert.equal(savedKey.status, 'active')
    assert.equal(savedKey.secretConfigured, true)
    assert.equal(savedKey.secretSource, 'player_config:byok')
    assert.equal(savedKey.byokSource, 'player_config')
    assert.match(String(savedKey.keyFingerprint), /^sha256:/)
    assertNoSecretLeak(savePlayerKey.data)

    const persisted = await waitForPersistedFile(
      providerAccountStorePath,
      (raw) => raw.includes('enc:v1:') && raw.includes(PLAYER_MODEL),
    )
    assert.equal(persisted.includes(PLAYER_SECRET), false, 'persisted provider account store must not contain plaintext player apiKey')
    assert.equal(persisted.includes(ENCRYPTION_KEY), false, 'persisted provider account store must not contain encryption key')

    const register = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      displayName: 'Provider Accounting AI',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['reward_claim'],
    })
    assert.equal(register.status, 200, `register failed: ${JSON.stringify(register.data)}`)

    const runtimeBefore = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}`, 'GET')
    assert.equal(runtimeBefore.status, 200, `runtime read failed: ${JSON.stringify(runtimeBefore.data)}`)
    const modelStatusBefore = readObject(readObject(runtimeBefore.data).modelStatus)
    assert.equal(modelStatusBefore.source, 'player_config')
    assert.equal(modelStatusBefore.byokSource, 'player_config')
    assert.equal(modelStatusBefore.secretSource, 'player_config:byok')
    const playerCandidate = readObject(readArray(modelStatusBefore.candidateTargets)[0])
    assert.equal(playerCandidate.source, 'player_config')
    assert.equal(playerCandidate.byokSource, 'player_config')
    assert.equal(playerCandidate.priority, 0)
    assert.equal(playerCandidate.secretConfigured, true)
    assertNoSecretLeak(runtimeBefore.data)

    const requestQueueBefore = await requestJson(baseUrl, '/api/ai/provider/request-queue', 'GET')
    assert.equal(requestQueueBefore.status, 200, `request queue read failed: ${JSON.stringify(requestQueueBefore.data)}`)
    aiPlayerProviderRequestQueueStatusResponseSchema.parse(requestQueueBefore.data)
    const queueBefore = readObject(readObject(requestQueueBefore.data).queue)
    assert.equal(queueBefore.maxConcurrency, 1)
    assert.equal(queueBefore.queueLimit, 2)
    assert.equal(queueBefore.activeRequests, 0)
    assert.equal(queueBefore.queuedRequests, 0)
    assert.equal(queueBefore.totalStartedRequests, 0)
    assert.equal(queueBefore.totalCompletedRequests, 0)
    assert.equal(queueBefore.totalRejectedRequests, 0)
    assertNoSecretLeak(requestQueueBefore.data)

    const pricingPolicies = await requestJson(baseUrl, '/api/ai/provider/pricing-policies?model=deepseek-chat', 'GET')
    assert.equal(pricingPolicies.status, 200, `pricing policies read failed: ${JSON.stringify(pricingPolicies.data)}`)
    listAiPlayerProviderPricingPoliciesResponseSchema.parse(pricingPolicies.data)
    const pricingPolicyItems = readArray(readObject(pricingPolicies.data).items)
    assert.equal(pricingPolicyItems.length, 1)
    const deepSeekFlashPolicy = readObject(pricingPolicyItems[0])
    assert.equal(deepSeekFlashPolicy.provider, 'api.deepseek.com')
    assert.equal(deepSeekFlashPolicy.model, 'deepseek-v4-flash')
    assert.deepEqual(readArray(deepSeekFlashPolicy.aliases), ['deepseek-chat', 'deepseek-reasoner'])
    assert.equal(readArray(deepSeekFlashPolicy.notes).some((note) => String(note).includes('internal relay')), true)
    assert.equal(deepSeekFlashPolicy.unitTokens, 1000000)
    assert.equal(deepSeekFlashPolicy.inputCacheHitUsdPerUnit, 0.0028)
    assert.equal(deepSeekFlashPolicy.inputCacheMissUsdPerUnit, 0.14)
    assert.equal(deepSeekFlashPolicy.outputUsdPerUnit, 0.28)
    assert.equal(deepSeekFlashPolicy.sourceUrl, 'https://api-docs.deepseek.com/quick_start/pricing')
    assertNoSecretLeak(pricingPolicies.data)

    const pricingEstimate = await requestJson(baseUrl, '/api/ai/provider/pricing-estimate?provider=internal.relay.local&model=deepseek-chat&promptTokens=3&completionTokens=4&promptCacheHitTokens=1&promptCacheMissTokens=2', 'GET')
    assert.equal(pricingEstimate.status, 200, `pricing estimate read failed: ${JSON.stringify(pricingEstimate.data)}`)
    aiPlayerProviderPricingEstimateResponseSchema.parse(pricingEstimate.data)
    const pricingEstimatePayload = readObject(pricingEstimate.data)
    assert.equal(pricingEstimatePayload.ok, true)
    assert.equal(pricingEstimatePayload.matched, true)
    assert.equal(pricingEstimatePayload.requestedProvider, 'internal.relay.local')
    assert.equal(pricingEstimatePayload.requestedModel, 'deepseek-chat')
    assert.equal(readObject(pricingEstimatePayload.policy).model, 'deepseek-v4-flash')
    assert.equal(readObject(pricingEstimatePayload.usage).estimatedCostUsd, EXPECTED_DEEPSEEK_COST_USD)
    assert.equal(readObject(pricingEstimatePayload.usage).estimatedCostSource, 'pricing_policy')
    assert.deepEqual(readArray(pricingEstimatePayload.warnings), [])
    assertNoSecretLeak(pricingEstimate.data)

    const unknownPricingEstimate = await requestJson(baseUrl, '/api/ai/provider/pricing-estimate?model=unknown-runtime-model&promptTokens=3&completionTokens=4', 'GET')
    assert.equal(unknownPricingEstimate.status, 200, `unknown pricing estimate read failed: ${JSON.stringify(unknownPricingEstimate.data)}`)
    aiPlayerProviderPricingEstimateResponseSchema.parse(unknownPricingEstimate.data)
    const unknownPricingEstimatePayload = readObject(unknownPricingEstimate.data)
    assert.equal(unknownPricingEstimatePayload.ok, true)
    assert.equal(unknownPricingEstimatePayload.matched, false)
    assert.equal(unknownPricingEstimatePayload.policy, null)
    assert.equal(readObject(unknownPricingEstimatePayload.usage).estimatedCostUsd, undefined)
    assert.deepEqual(readArray(unknownPricingEstimatePayload.warnings), ['pricing_policy_not_found'])
    assertNoSecretLeak(unknownPricingEstimate.data)

    const costReconciliation = await requestJson(baseUrl, '/api/ai/provider/cost-reconciliation?requestCount=2000&actualCostCny=0.7&estimatedCostUsd=0.14&cnyPerUsd=7.2', 'GET')
    assert.equal(costReconciliation.status, 200, `cost reconciliation read failed: ${JSON.stringify(costReconciliation.data)}`)
    aiPlayerProviderCostReconciliationResponseSchema.parse(costReconciliation.data)
    const costReconciliationPayload = readObject(costReconciliation.data)
    assert.equal(costReconciliationPayload.ok, true)
    assert.equal(costReconciliationPayload.source, 'dashboard_manual')
    assert.equal(costReconciliationPayload.requestCount, 2000)
    assert.equal(costReconciliationPayload.actualCostCny, 0.7)
    assert.equal(costReconciliationPayload.actualCostCnyPerRequest, 0.00035)
    assert.equal(costReconciliationPayload.actualCostUsd, 0.097222222222)
    assert.equal(costReconciliationPayload.estimatedCostUsd, 0.14)
    assert.equal(costReconciliationPayload.estimatedCostSource, 'manual_input')
    assert.equal(costReconciliationPayload.estimatedRequestCount, null)
    assert.equal(costReconciliationPayload.estimatedCostCny, 1.008)
    assert.equal(costReconciliationPayload.estimatedCostCnyPerRequest, 0.000504)
    assert.equal(costReconciliationPayload.actualVsEstimateRatio, 0.694444444444)
    assert.equal(costReconciliationPayload.varianceCostCny, -0.308)
    assert.deepEqual(readArray(costReconciliationPayload.warnings), [])
    assertNoSecretLeak(costReconciliation.data)

    const now = new Date()
    const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
    const nextDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
      .toISOString()
      .slice(0, 10)
    const deepSeekBilling = await requestJson(
      baseUrl,
      `/api/ai/provider/deepseek-billing?cnyPerUsd=7.2&todayRequestCount=2000&todayActualCostCny=0.7&thisMonthRequestCount=2000&thisMonthActualCostCny=0.7&from=${currentMonth}&to=${nextDay}&rangeRequestCount=2000&rangeActualCostCny=0.7`,
      'GET',
    )
    assert.equal(deepSeekBilling.status, 200, `DeepSeek billing read model failed: ${JSON.stringify(deepSeekBilling.data)}`)
    aiPlayerProviderDeepSeekBillingReadModelResponseSchema.parse(deepSeekBilling.data)
    const deepSeekBillingPayload = readObject(deepSeekBilling.data)
    assert.equal(deepSeekBillingPayload.ok, true)
    assert.equal(deepSeekBillingPayload.source, 'dashboard_manual')
    assert.equal(deepSeekBillingPayload.provider, 'deepseek')
    const deepSeekBillingToday = readObject(deepSeekBillingPayload.today)
    assert.equal(deepSeekBillingToday.label, 'today')
    assert.equal(deepSeekBillingToday.observationSource, 'dashboard_manual')
    assert.equal(deepSeekBillingToday.requestCount, 2000)
    assert.equal(deepSeekBillingToday.actualCostCny, 0.7)
    assert.equal(deepSeekBillingToday.actualCostUsd, 0.097222222222)
    assert.equal(deepSeekBillingToday.actualCostCnyPerRequest, 0.00035)
    const deepSeekBillingThisMonth = readObject(deepSeekBillingPayload.thisMonth)
    assert.equal(deepSeekBillingThisMonth.label, 'thisMonth')
    assert.equal(deepSeekBillingThisMonth.from, `${currentMonth}T00:00:00.000Z`)
    assert.equal(deepSeekBillingThisMonth.requestCount, 2000)
    const deepSeekBillingRange = readObject(deepSeekBillingPayload.range)
    assert.equal(deepSeekBillingRange.label, 'range')
    assert.equal(deepSeekBillingRange.from, `${currentMonth}T00:00:00.000Z`)
    assert.equal(deepSeekBillingRange.to, `${nextDay}T00:00:00.000Z`)
    assert.equal(deepSeekBillingRange.requestCount, 2000)
    assert.deepEqual(readArray(deepSeekBillingRange.warnings), ['estimated_cost_missing'])
    assertNoSecretLeak(deepSeekBilling.data)

    const aiCommandCreditEstimate = await requestJson(baseUrl, '/api/ai/provider/ai-command-credit-estimate?totalTokens=2501', 'GET')
    assert.equal(aiCommandCreditEstimate.status, 200, `AI command credit estimate read failed: ${JSON.stringify(aiCommandCreditEstimate.data)}`)
    aiPlayerProviderAiCommandCreditEstimateResponseSchema.parse(aiCommandCreditEstimate.data)
    const aiCommandCreditEstimatePayload = readObject(aiCommandCreditEstimate.data)
    assert.equal(aiCommandCreditEstimatePayload.ok, true)
    assert.equal(readObject(aiCommandCreditEstimatePayload.policy).displayName, 'AI军令')
    assert.equal(readObject(aiCommandCreditEstimatePayload.policy).tokensPerCredit, 1000)
    assert.equal(readObject(aiCommandCreditEstimatePayload.usage).totalTokens, 2501)
    assert.equal(aiCommandCreditEstimatePayload.consumedCredits, 3)
    assertNoSecretLeak(aiCommandCreditEstimate.data)

    const blockedModelProposals = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/model-proposals`, 'POST')
    assert.equal(blockedModelProposals.status, 402, `model proposal without AI command credits must be blocked before provider call: ${JSON.stringify(blockedModelProposals.data)}`)
    const blockedModelProposalPayload = readObject(blockedModelProposals.data)
    assert.equal(blockedModelProposalPayload.ok, false)
    assert.equal(blockedModelProposalPayload.error, 'insufficient_ai_command_credits')
    assert.equal(relay.probes.length, 0, 'insufficient AI command credits must not call the provider relay')
    assertNoSecretLeak(blockedModelProposals.data)

    const aiCommandCreditBalanceBeforeGrant = await requestJson(baseUrl, `/api/ai/provider/ai-command-credits/balance?accountId=${GOVERNOR_PLAYER_ID}&worldId=season_alpha`, 'GET')
    assert.equal(aiCommandCreditBalanceBeforeGrant.status, 200, `AI command credit balance before grant read failed: ${JSON.stringify(aiCommandCreditBalanceBeforeGrant.data)}`)
    aiPlayerProviderAiCommandCreditBalanceResponseSchema.parse(aiCommandCreditBalanceBeforeGrant.data)
    const aiCommandCreditBalanceBeforeGrantPayload = readObject(aiCommandCreditBalanceBeforeGrant.data)
    assert.equal(aiCommandCreditBalanceBeforeGrantPayload.balanceCredits, 0)
    assert.equal(aiCommandCreditBalanceBeforeGrantPayload.reservedCredits, 0)
    assert.equal(aiCommandCreditBalanceBeforeGrantPayload.availableCredits, 0)
    assert.equal(aiCommandCreditBalanceBeforeGrantPayload.debitedCredits, 0)
    assertNoSecretLeak(aiCommandCreditBalanceBeforeGrant.data)

    const requestQueueAfterBlocked = await requestJson(baseUrl, '/api/ai/provider/request-queue', 'GET')
    assert.equal(requestQueueAfterBlocked.status, 200, `request queue read after blocked proposal failed: ${JSON.stringify(requestQueueAfterBlocked.data)}`)
    aiPlayerProviderRequestQueueStatusResponseSchema.parse(requestQueueAfterBlocked.data)
    const queueAfterBlocked = readObject(readObject(requestQueueAfterBlocked.data).queue)
    assert.equal(queueAfterBlocked.totalStartedRequests, 0)
    assert.equal(queueAfterBlocked.totalCompletedRequests, 0)
    assertNoSecretLeak(requestQueueAfterBlocked.data)

    const aiCommandCreditGrant = await requestJson(baseUrl, '/api/ai/provider/ai-command-credits/grants', 'POST', {
      accountId: GOVERNOR_PLAYER_ID,
      worldId: 'season_alpha',
      amountCredits: 300,
      reason: 'season_initial_grant',
    })
    assert.equal(aiCommandCreditGrant.status, 200, `AI command credit grant failed: ${JSON.stringify(aiCommandCreditGrant.data)}`)
    aiPlayerProviderAiCommandCreditLedgerMutationResponseSchema.parse(aiCommandCreditGrant.data)
    const aiCommandCreditGrantPayload = readObject(aiCommandCreditGrant.data)
    assert.equal(aiCommandCreditGrantPayload.ok, true)
    assert.equal(readObject(aiCommandCreditGrantPayload.entry).entryType, 'grant')
    assert.equal(readObject(aiCommandCreditGrantPayload.entry).amountCredits, 300)
    assert.equal(readObject(aiCommandCreditGrantPayload.balance).balanceCredits, 300)
    assertNoSecretLeak(aiCommandCreditGrant.data)

    const modelProposals = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/model-proposals`, 'POST')
    assert.equal(modelProposals.status, 200, `model proposal route failed: ${JSON.stringify(modelProposals.data)}`)
    const modelProposalPayload = readObject(modelProposals.data)
    assert.equal(modelProposalPayload.ok, true)
    assert.equal(modelProposalPayload.model, PLAYER_MODEL)
    assert.equal(relay.probes.length, 1)
    assert.equal(relay.probes[0].path, '/v1/chat/completions')
    assert.equal(relay.probes[0].model, PLAYER_MODEL)
    assert.equal(relay.probes[0].authorization, `Bearer ${PLAYER_SECRET}`)
    const providerFallback = readObject(modelProposalPayload.providerFallback)
    assert.match(String(providerFallback.requestId), /^provider_req_/)
    assert.equal(readObject(providerFallback.selectedProvider).source, 'player_config')
    assert.equal(readObject(providerFallback.selectedProvider).byokSource, 'player_config')
    assert.match(String(readObject(providerFallback.selectedProvider).keyFingerprint), /^sha256:/)
    assert.equal(providerFallback.failureCount, 0)
    assertNoSecretLeak(modelProposals.data)

    const aiCommandCreditBalanceAfterSuccess = await requestJson(baseUrl, `/api/ai/provider/ai-command-credits/balance?accountId=${GOVERNOR_PLAYER_ID}&worldId=season_alpha`, 'GET')
    assert.equal(aiCommandCreditBalanceAfterSuccess.status, 200, `AI command credit balance after success read failed: ${JSON.stringify(aiCommandCreditBalanceAfterSuccess.data)}`)
    aiPlayerProviderAiCommandCreditBalanceResponseSchema.parse(aiCommandCreditBalanceAfterSuccess.data)
    const aiCommandCreditBalanceAfterSuccessPayload = readObject(aiCommandCreditBalanceAfterSuccess.data)
    assert.equal(aiCommandCreditBalanceAfterSuccessPayload.balanceCredits, 299)
    assert.equal(aiCommandCreditBalanceAfterSuccessPayload.reservedCredits, 0)
    assert.equal(aiCommandCreditBalanceAfterSuccessPayload.availableCredits, 299)
    assert.equal(aiCommandCreditBalanceAfterSuccessPayload.grantedCredits, 300)
    assert.equal(aiCommandCreditBalanceAfterSuccessPayload.debitedCredits, 1)
    assert.equal(aiCommandCreditBalanceAfterSuccessPayload.ledgerCount, 2)
    assertNoSecretLeak(aiCommandCreditBalanceAfterSuccess.data)

    const providerHealthAfterProposal = await requestJson(baseUrl, '/api/ai/provider/health', 'GET')
    assert.equal(providerHealthAfterProposal.status, 200, `provider health after proposal read failed: ${JSON.stringify(providerHealthAfterProposal.data)}`)
    aiPlayerProviderAccountHealthResponseSchema.parse(providerHealthAfterProposal.data)
    const providerHealthAfterProposalPayload = readObject(providerHealthAfterProposal.data)
    assert.ok(Number(readObject(providerHealthAfterProposalPayload.externalBudgetGate).failureCount) >= 1)
    assertNoSecretLeak(providerHealthAfterProposal.data)

    const requestQueueAfter = await requestJson(baseUrl, '/api/ai/provider/request-queue', 'GET')
    assert.equal(requestQueueAfter.status, 200, `request queue read after proposal failed: ${JSON.stringify(requestQueueAfter.data)}`)
    aiPlayerProviderRequestQueueStatusResponseSchema.parse(requestQueueAfter.data)
    const queueAfter = readObject(readObject(requestQueueAfter.data).queue)
    assert.equal(queueAfter.maxConcurrency, 1)
    assert.equal(queueAfter.queueLimit, 2)
    assert.equal(queueAfter.activeRequests, 0)
    assert.equal(queueAfter.queuedRequests, 0)
    assert.equal(queueAfter.totalStartedRequests, 1)
    assert.equal(queueAfter.totalCompletedRequests, 1)
    assert.equal(queueAfter.totalRejectedRequests, 0)
    assert.match(String(queueAfter.lastStartedAt), /^\d{4}-\d{2}-\d{2}T/)
    assert.match(String(queueAfter.lastCompletedAt), /^\d{4}-\d{2}-\d{2}T/)
    const queueLanes = readArray(queueAfter.lanes)
    assert.equal(queueLanes.some((item) => readObject(item).lane === 'default'), true)
    const defaultLane = readObject(queueLanes.find((item) => readObject(item).lane === 'default'))
    assert.equal(typeof defaultLane.p95WaitMs, 'number')
    const queueEndpoints = readArray(queueAfter.endpoints)
    const playerEndpoint = queueEndpoints.map((item) => readObject(item)).find((item) => item.model === PLAYER_MODEL)
    assert.ok(playerEndpoint, 'request queue must expose provider/model/key-level read model')
    assert.equal(playerEndpoint.provider, new URL(relay.baseUrl).host)
    assert.match(String(playerEndpoint.keyFingerprint), /^sha256:/)
    assert.equal(playerEndpoint.activeRequests, 0)
    assert.equal(playerEndpoint.queuedRequests, 0)
    assert.equal(playerEndpoint.totalStartedRequests, 1)
    assert.equal(playerEndpoint.totalCompletedRequests, 1)
    assert.equal(playerEndpoint.totalFailedRequests, 0)
    assert.equal(playerEndpoint.totalRateLimitedRequests, 0)
    assert.equal(playerEndpoint.circuitState, 'closed')
    assert.equal(playerEndpoint.backoffUntil, null)
    assert.equal(readObject(playerEndpoint.rateBucket).limit, null)
    assert.equal(readObject(playerEndpoint.rateBucket).remainingRequests, null)
    const endpointAverageLatencyMs = Number(playerEndpoint.averageLatencyMs)
    const endpointP50LatencyMs = Number(playerEndpoint.p50LatencyMs)
    const endpointP95LatencyMs = Number(playerEndpoint.p95LatencyMs)
    assert.equal(Number.isFinite(endpointAverageLatencyMs), true, 'endpoint read model must expose averageLatencyMs')
    assert.equal(Number.isFinite(endpointP50LatencyMs), true, 'endpoint read model must expose p50LatencyMs')
    assert.equal(Number.isFinite(endpointP95LatencyMs), true, 'endpoint read model must expose p95LatencyMs')
    assert.ok(endpointAverageLatencyMs >= 0)
    assert.ok(endpointP50LatencyMs >= 0)
    assert.ok(endpointP95LatencyMs >= endpointP50LatencyMs)
    assert.equal(readArray(queueAfter.leases).length, 0)
    assertNoSecretLeak(requestQueueAfter.data)

    const accountPool = await requestJson(
      baseUrl,
      `/api/ai/provider/account-pool?factionId=${FACTION_ID}&ownerPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
    )
    assert.equal(accountPool.status, 200, `provider account pool read failed: ${JSON.stringify(accountPool.data)}`)
    aiPlayerProviderAccountPoolReadModelResponseSchema.parse(accountPool.data)
    const accountPoolPayload = readObject(accountPool.data)
    assert.equal(accountPoolPayload.ok, true)
    assert.equal(accountPoolPayload.accountCount, 1)
    assert.equal(accountPoolPayload.dispatchEligibleCount, 1)
    const selectedAccount = readObject(accountPoolPayload.selectedAccount)
    assert.equal(selectedAccount.provider, new URL(relay.baseUrl).host)
    assert.equal(selectedAccount.model, PLAYER_MODEL)
    assert.match(String(selectedAccount.keyFingerprint), /^sha256:/)
    assert.equal(selectedAccount.secretConfigured, true)
    assert.equal(selectedAccount.dispatchEligible, true)
    assert.equal(selectedAccount.healthStatus, 'healthy')
    assert.deepEqual(readArray(selectedAccount.rejectionReasons), [])
    assert.equal(readObject(selectedAccount.health).totalStartedRequests, 1)
    assert.equal(readObject(selectedAccount.health).totalCompletedRequests, 1)
    assert.equal(readObject(selectedAccount.health).totalRateLimitedRequests, 0)
    assert.equal(readObject(selectedAccount.health).circuitState, 'closed')
    assert.equal(readObject(selectedAccount.billing).requestCount, 1)
    assert.equal(readObject(selectedAccount.billing).totalTokens, 7)
    assert.equal(readObject(selectedAccount.billing).estimatedCostUsd, EXPECTED_DEEPSEEK_COST_USD)
    assert.equal(readArray(accountPoolPayload.accounts).length, 1)
    assertNoSecretLeak(accountPool.data)

    const selectedAccountFingerprint = String(selectedAccount.keyFingerprint)
    const bodyOnlyOpsAuthorization = await requestJson(baseUrl, '/api/ai/provider/account-pool/ops-config', 'POST', {
      provider: selectedAccount.provider,
      model: PLAYER_MODEL,
      keyFingerprint: selectedAccountFingerprint,
      enabled: false,
      maxConcurrency: 0,
      opsNote: 'body actor must not authorize ops',
      opsActorId: GOVERNOR_PLAYER_ID,
      opsReason: 'body actor must not authorize ops',
      confirmation: 'provider_account_ops_confirmed',
    })
    assert.equal(bodyOnlyOpsAuthorization.status, 403)
    assert.equal(readObject(bodyOnlyOpsAuthorization.data).error, 'provider_account_ops_actor_not_authorized')
    assertNoSecretLeak(bodyOnlyOpsAuthorization.data)

    const unauthorizedOpsRole = await requestJsonWithHeaders(
      baseUrl,
      '/api/ai/provider/account-pool/ops-config',
      'POST',
      {
        provider: selectedAccount.provider,
        model: PLAYER_MODEL,
        keyFingerprint: selectedAccountFingerprint,
        enabled: false,
        maxConcurrency: 0,
        opsNote: 'viewer role must not authorize ops',
        opsReason: 'viewer role must not authorize ops',
        confirmation: 'provider_account_ops_confirmed',
      },
      {
        'X-AI-Provider-Ops-Actor-Id': GOVERNOR_PLAYER_ID,
        'X-AI-Provider-Ops-Role': 'viewer',
      },
    )
    assert.equal(unauthorizedOpsRole.status, 403)
    assert.equal(readObject(unauthorizedOpsRole.data).error, 'provider_account_ops_actor_not_authorized')
    assertNoSecretLeak(unauthorizedOpsRole.data)

    const missingAuthSource = await requestJsonWithHeaders(
      baseUrl,
      '/api/ai/provider/account-pool/ops-config',
      'POST',
      {
        provider: selectedAccount.provider,
        model: PLAYER_MODEL,
        keyFingerprint: selectedAccountFingerprint,
        enabled: false,
        maxConcurrency: 0,
        opsNote: 'missing RBAC source fixture',
        opsReason: 'missing RBAC source fixture',
        confirmation: 'provider_account_ops_confirmed',
      },
      {
        'X-AI-Provider-Ops-Actor-Id': GOVERNOR_PLAYER_ID,
        'X-AI-Provider-Ops-Role': OPS_ROLE,
      },
    )
    assert.equal(missingAuthSource.status, 403)
    assert.equal(readObject(missingAuthSource.data).error, 'provider_account_ops_actor_not_authorized')
    assertNoSecretLeak(missingAuthSource.data)

    const mismatchedBodyActor = await requestJsonWithHeaders(
      baseUrl,
      '/api/ai/provider/account-pool/ops-config',
      'POST',
      {
        provider: selectedAccount.provider,
        model: PLAYER_MODEL,
        keyFingerprint: selectedAccountFingerprint,
        enabled: false,
        maxConcurrency: 0,
        opsNote: 'body actor spoof fixture',
        opsActorId: 'spoofed_operator',
        opsReason: 'body actor spoof fixture',
        confirmation: 'provider_account_ops_confirmed',
      },
      OPS_AUTH_HEADERS,
    )
    assert.equal(mismatchedBodyActor.status, 403)
    assert.equal(readObject(mismatchedBodyActor.data).error, 'provider_account_ops_actor_not_authorized')
    assertNoSecretLeak(mismatchedBodyActor.data)

    const missingOpsAuthorization = await requestJson(baseUrl, '/api/ai/provider/account-pool/ops-config', 'POST', {
      provider: selectedAccount.provider,
      model: PLAYER_MODEL,
      keyFingerprint: selectedAccountFingerprint,
      enabled: false,
      maxConcurrency: 0,
      opsNote: 'missing authorization fixture',
    })
    assert.equal(missingOpsAuthorization.status, 403)
    assert.equal(readObject(missingOpsAuthorization.data).error, 'provider_account_ops_actor_not_authorized')
    assertNoSecretLeak(missingOpsAuthorization.data)

    const missingOpsAuthorizationPool = await requestJson(
      baseUrl,
      `/api/ai/provider/account-pool?factionId=${FACTION_ID}&ownerPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
    )
    assert.equal(missingOpsAuthorizationPool.status, 200, `missing auth account pool read failed: ${JSON.stringify(missingOpsAuthorizationPool.data)}`)
    assert.equal(readObject(missingOpsAuthorizationPool.data).dispatchEligibleCount, 1)
    assertNoSecretLeak(missingOpsAuthorizationPool.data)

    const missingCapConfirmation = await requestJsonWithHeaders(
      baseUrl,
      '/api/ai/provider/account-pool/ops-config',
      'POST',
      {
        provider: selectedAccount.provider,
        model: PLAYER_MODEL,
        keyFingerprint: selectedAccountFingerprint,
        enabled: true,
        maxConcurrency: 0,
        opsReason: 'cap smoke must be explicitly confirmed',
      },
      OPS_AUTH_HEADERS,
    )
    assert.equal(missingCapConfirmation.status, 422)
    assert.equal(readObject(missingCapConfirmation.data).error, 'invalid_provider_account_pool_ops_authorization')
    assertNoSecretLeak(missingCapConfirmation.data)

    const disableAccount = await requestJsonWithHeaders(baseUrl, '/api/ai/provider/account-pool/ops-config', 'POST', {
      provider: selectedAccount.provider,
      model: PLAYER_MODEL,
      keyFingerprint: selectedAccountFingerprint,
      enabled: false,
      maxConcurrency: 0,
      opsNote: 'maintenance window',
      enterpriseQuota: true,
      quotaLabel: 'enterprise-soft-quota',
      opsReason: 'maintenance window',
      confirmation: 'provider_account_ops_confirmed',
    }, OPS_AUTH_HEADERS)
    assert.equal(disableAccount.status, 200, `provider account ops disable failed: ${JSON.stringify(disableAccount.data)}`)
    aiPlayerProviderAccountPoolOpsConfigMutationResponseSchema.parse(disableAccount.data)
    const disabledConfig = readObject(readObject(disableAccount.data).config)
    assert.equal(disabledConfig.provider, selectedAccount.provider)
    assert.equal(disabledConfig.model, PLAYER_MODEL)
    assert.equal(disabledConfig.keyFingerprint, selectedAccountFingerprint)
    assert.equal(disabledConfig.enabled, false)
    assert.equal(disabledConfig.maxConcurrency, 0)
    assert.equal(disabledConfig.opsNote, 'maintenance window')
    assert.equal(disabledConfig.enterpriseQuota, true)
    assert.equal(disabledConfig.quotaLabel, 'enterprise-soft-quota')
    assertNoSecretLeak(disableAccount.data)

    const persistedOpsConfig = await waitForPersistedFile(
      providerAccountStorePath,
      (raw) => raw.includes('accountPoolOpsConfigs') && raw.includes('enterprise-soft-quota'),
    )
    assert.equal(persistedOpsConfig.includes(PLAYER_SECRET), false, 'persisted ops config must not contain plaintext player apiKey')
    assert.equal(persistedOpsConfig.includes(ENCRYPTION_KEY), false, 'persisted ops config must not contain encryption key')

    const disabledAccountPool = await requestJson(
      baseUrl,
      `/api/ai/provider/account-pool?factionId=${FACTION_ID}&ownerPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
    )
    assert.equal(disabledAccountPool.status, 200, `disabled account pool read failed: ${JSON.stringify(disabledAccountPool.data)}`)
    aiPlayerProviderAccountPoolReadModelResponseSchema.parse(disabledAccountPool.data)
    const disabledAccountPoolPayload = readObject(disabledAccountPool.data)
    assert.equal(disabledAccountPoolPayload.dispatchEligibleCount, 0)
    assert.equal(disabledAccountPoolPayload.selectedAccount, null)
    const disabledAccount = readObject(readArray(disabledAccountPoolPayload.accounts)[0])
    assert.equal(disabledAccount.healthStatus, 'disabled')
    assert.equal(disabledAccount.dispatchEligible, false)
    assert.equal(readArray(disabledAccount.rejectionReasons).includes('ops_disabled'), true)
    assert.equal(readObject(disabledAccount.ops).enabled, false)
    assert.equal(readObject(disabledAccount.ops).maxConcurrency, 0)
    assert.equal(readObject(disabledAccount.ops).enterpriseQuota, true)
    assertNoSecretLeak(disabledAccountPool.data)

    const relayProbeCountBeforeOpsDisabled = relay.probes.length
    const disabledModelProposals = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/model-proposals`, 'POST')
    assert.equal(disabledModelProposals.status, 500, `disabled account model proposal failed with unexpected status: ${JSON.stringify(disabledModelProposals.data)}`)
    const disabledModelProposalPayload = readObject(disabledModelProposals.data)
    assert.equal(disabledModelProposalPayload.ok, false)
    assert.equal(disabledModelProposalPayload.error, 'model_provider_account_disabled')
    assert.equal(relay.probes.length, relayProbeCountBeforeOpsDisabled, 'disabled provider account must not call relay')
    assertNoSecretLeak(disabledModelProposals.data)

    const aiCommandCreditBalanceAfterOpsDisabled = await requestJson(baseUrl, `/api/ai/provider/ai-command-credits/balance?accountId=${GOVERNOR_PLAYER_ID}&worldId=season_alpha`, 'GET')
    assert.equal(aiCommandCreditBalanceAfterOpsDisabled.status, 200, `AI command credit balance after ops-disabled read failed: ${JSON.stringify(aiCommandCreditBalanceAfterOpsDisabled.data)}`)
    const aiCommandCreditBalanceAfterOpsDisabledPayload = readObject(aiCommandCreditBalanceAfterOpsDisabled.data)
    assert.equal(aiCommandCreditBalanceAfterOpsDisabledPayload.balanceCredits, 299)
    assert.equal(aiCommandCreditBalanceAfterOpsDisabledPayload.reservedCredits, 0)
    assert.equal(aiCommandCreditBalanceAfterOpsDisabledPayload.availableCredits, 299)
    assert.equal(aiCommandCreditBalanceAfterOpsDisabledPayload.debitedCredits, 1)
    assertNoSecretLeak(aiCommandCreditBalanceAfterOpsDisabled.data)

    const capAccountAtZero = await requestJsonWithHeaders(baseUrl, '/api/ai/provider/account-pool/ops-config', 'POST', {
      provider: selectedAccount.provider,
      model: PLAYER_MODEL,
      keyFingerprint: selectedAccountFingerprint,
      enabled: true,
      maxConcurrency: 0,
      opsNote: 'cap reached fixture',
      enterpriseQuota: true,
      quotaLabel: 'enterprise-soft-quota',
      opsReason: 'cap reached fixture',
      confirmation: 'provider_account_ops_confirmed',
    }, OPS_AUTH_HEADERS)
    assert.equal(capAccountAtZero.status, 200, `provider account ops cap failed: ${JSON.stringify(capAccountAtZero.data)}`)
    aiPlayerProviderAccountPoolOpsConfigMutationResponseSchema.parse(capAccountAtZero.data)
    const cappedAccountPool = await requestJson(
      baseUrl,
      `/api/ai/provider/account-pool?factionId=${FACTION_ID}&ownerPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
    )
    assert.equal(cappedAccountPool.status, 200, `capped account pool read failed: ${JSON.stringify(cappedAccountPool.data)}`)
    aiPlayerProviderAccountPoolReadModelResponseSchema.parse(cappedAccountPool.data)
    const cappedAccount = readObject(readArray(readObject(cappedAccountPool.data).accounts)[0])
    assert.equal(readObject(cappedAccount.ops).enabled, true)
    assert.equal(readObject(cappedAccount.ops).maxConcurrency, 0)
    assert.equal(cappedAccount.dispatchEligible, false)
    assert.equal(readArray(cappedAccount.rejectionReasons).includes('ops_concurrency_cap_reached'), true)
    assertNoSecretLeak(cappedAccountPool.data)

    const enableAccount = await requestJsonWithHeaders(baseUrl, '/api/ai/provider/account-pool/ops-config', 'POST', {
      provider: selectedAccount.provider,
      model: PLAYER_MODEL,
      keyFingerprint: selectedAccountFingerprint,
      enabled: true,
      maxConcurrency: 1,
      opsNote: 'ready for dispatch',
      enterpriseQuota: true,
      quotaLabel: 'enterprise-soft-quota',
      opsReason: 'ready for dispatch',
      confirmation: 'provider_account_ops_confirmed',
    }, OPS_AUTH_HEADERS)
    assert.equal(enableAccount.status, 200, `provider account ops enable failed: ${JSON.stringify(enableAccount.data)}`)
    aiPlayerProviderAccountPoolOpsConfigMutationResponseSchema.parse(enableAccount.data)
    const enabledAccountPool = await requestJson(
      baseUrl,
      `/api/ai/provider/account-pool?factionId=${FACTION_ID}&ownerPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
    )
    assert.equal(enabledAccountPool.status, 200, `enabled account pool read failed: ${JSON.stringify(enabledAccountPool.data)}`)
    const enabledAccountPoolPayload = readObject(enabledAccountPool.data)
    assert.equal(enabledAccountPoolPayload.dispatchEligibleCount, 1)
    const enabledAccount = readObject(enabledAccountPoolPayload.selectedAccount)
    assert.equal(readObject(enabledAccount.ops).enabled, true)
    assert.equal(readObject(enabledAccount.ops).maxConcurrency, 1)
    assert.equal(readObject(enabledAccount.ops).opsNote, 'ready for dispatch')
    assert.equal(readObject(enabledAccount.ops).enterpriseQuota, true)
    assertNoSecretLeak(enabledAccountPool.data)

    const disabledOpsAudit = await requestJson(
      baseUrl,
      `/api/ai/provider/account-pool/ops-audit?provider=${encodeURIComponent(String(selectedAccount.provider))}&model=${PLAYER_MODEL}&keyFingerprint=${encodeURIComponent(selectedAccountFingerprint)}&actorId=${GOVERNOR_PLAYER_ID}&enabled=false`,
      'GET',
    )
    assert.equal(disabledOpsAudit.status, 200, `provider account ops audit read failed: ${JSON.stringify(disabledOpsAudit.data)}`)
    listAiPlayerProviderAccountPoolOpsAuditResponseSchema.parse(disabledOpsAudit.data)
    const disabledOpsAuditPayload = readObject(disabledOpsAudit.data)
    assert.equal(disabledOpsAuditPayload.ok, true)
    assert.equal(disabledOpsAuditPayload.count, 1)
    const disabledOpsAuditItem = readObject(readArray(disabledOpsAuditPayload.items)[0])
    assert.equal(disabledOpsAuditItem.eventType, 'provider_account_pool_ops_configured')
    assert.equal(disabledOpsAuditItem.actorId, GOVERNOR_PLAYER_ID)
    assert.equal(disabledOpsAuditItem.provider, selectedAccount.provider)
    assert.equal(disabledOpsAuditItem.model, PLAYER_MODEL)
    assert.equal(disabledOpsAuditItem.keyFingerprint, selectedAccountFingerprint)
    assert.equal(disabledOpsAuditItem.enabled, false)
    assert.equal(disabledOpsAuditItem.action, 'disabled')
    assert.equal(disabledOpsAuditItem.maxConcurrency, 0)
    assert.equal(disabledOpsAuditItem.opsReason, 'maintenance window')
    assert.equal(disabledOpsAuditItem.authRole, OPS_ROLE)
    assert.equal(disabledOpsAuditItem.authSource, OPS_AUTH_SOURCE)
    assert.equal(disabledOpsAuditItem.restoreSourceEventId, null)
    assert.equal(disabledOpsAuditItem.enterpriseQuota, true)
    assert.equal(disabledOpsAuditItem.quotaLabel, 'enterprise-soft-quota')
    assert.match(String(disabledOpsAuditItem.createdAt), /^\d{4}-\d{2}-\d{2}T/)
    assertNoSecretLeak(disabledOpsAudit.data)

    const allOpsAudit = await requestJson(baseUrl, `/api/ai/provider/account-pool/ops-audit?keyFingerprint=${encodeURIComponent(selectedAccountFingerprint)}`, 'GET')
    assert.equal(allOpsAudit.status, 200, `provider account ops audit all read failed: ${JSON.stringify(allOpsAudit.data)}`)
    listAiPlayerProviderAccountPoolOpsAuditResponseSchema.parse(allOpsAudit.data)
    const allOpsAuditPayload = readObject(allOpsAudit.data)
    assert.equal(allOpsAuditPayload.count, 3)
    const allOpsAuditItems = readArray(allOpsAuditPayload.items).map((item) => readObject(item))
    assert.equal(allOpsAuditItems.some((item) => item.action === 'enabled'), true)
    assert.equal(allOpsAuditItems.some((item) => item.action === 'disabled'), true)
    assertNoSecretLeak(allOpsAudit.data)

    const enabledAuditItem = allOpsAuditItems.find((item) => item.action === 'enabled' && item.maxConcurrency === 1)
    const disabledAuditItem = allOpsAuditItems.find((item) => item.action === 'disabled')
    assert.ok(enabledAuditItem, 'expected enabled ops audit event for restore fixture')
    assert.ok(disabledAuditItem, 'expected disabled ops audit event for restore fixture')

    const restoreWithoutConfirmation = await requestJsonWithHeaders(
      baseUrl,
      '/api/ai/provider/account-pool/ops-restore',
      'POST',
      {
        provider: selectedAccount.provider,
        model: PLAYER_MODEL,
        keyFingerprint: selectedAccountFingerprint,
        restoreEventId: disabledAuditItem.eventId,
        opsReason: 'restore must require explicit confirmation',
      },
      OPS_AUTH_HEADERS,
    )
    assert.equal(restoreWithoutConfirmation.status, 422)
    assert.equal(readObject(restoreWithoutConfirmation.data).error, 'invalid_provider_account_pool_ops_authorization')
    assertNoSecretLeak(restoreWithoutConfirmation.data)

    const restoreWithoutConfirmationPool = await requestJson(
      baseUrl,
      `/api/ai/provider/account-pool?factionId=${FACTION_ID}&ownerPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
    )
    assert.equal(restoreWithoutConfirmationPool.status, 200, `restore without confirmation pool read failed: ${JSON.stringify(restoreWithoutConfirmationPool.data)}`)
    assert.equal(readObject(restoreWithoutConfirmationPool.data).dispatchEligibleCount, 1)
    assertNoSecretLeak(restoreWithoutConfirmationPool.data)

    const restoreDisabled = await requestJsonWithHeaders(baseUrl, '/api/ai/provider/account-pool/ops-restore', 'POST', {
      provider: selectedAccount.provider,
      model: PLAYER_MODEL,
      keyFingerprint: selectedAccountFingerprint,
      restoreEventId: disabledAuditItem.eventId,
      opsReason: 'restore disabled audit state for smoke',
      confirmation: 'provider_account_ops_confirmed',
    }, OPS_AUTH_HEADERS)
    assert.equal(restoreDisabled.status, 200, `provider account ops restore disabled failed: ${JSON.stringify(restoreDisabled.data)}`)
    aiPlayerProviderAccountPoolOpsRestoreResponseSchema.parse(restoreDisabled.data)
    const restoreDisabledPayload = readObject(restoreDisabled.data)
    assert.equal(restoreDisabledPayload.ok, true)
    assert.equal(readObject(restoreDisabledPayload.restoredFrom).eventId, disabledAuditItem.eventId)
    assert.equal(readObject(restoreDisabledPayload.restoredFrom).action, 'disabled')
    const restoredDisabledConfig = readObject(restoreDisabledPayload.config)
    assert.equal(restoredDisabledConfig.enabled, false)
    assert.equal(restoredDisabledConfig.maxConcurrency, 0)
    assert.equal(restoredDisabledConfig.keyFingerprint, selectedAccountFingerprint)
    assertNoSecretLeak(restoreDisabled.data)

    const restoredDisabledOpsAudit = await requestJson(
      baseUrl,
      `/api/ai/provider/account-pool/ops-audit?provider=${encodeURIComponent(String(selectedAccount.provider))}&model=${PLAYER_MODEL}&keyFingerprint=${encodeURIComponent(selectedAccountFingerprint)}&actorId=${GOVERNOR_PLAYER_ID}&enabled=false&limit=1`,
      'GET',
    )
    assert.equal(restoredDisabledOpsAudit.status, 200, `restored disabled ops audit read failed: ${JSON.stringify(restoredDisabledOpsAudit.data)}`)
    listAiPlayerProviderAccountPoolOpsAuditResponseSchema.parse(restoredDisabledOpsAudit.data)
    const restoredDisabledOpsAuditItem = readObject(readArray(readObject(restoredDisabledOpsAudit.data).items)[0])
    assert.equal(restoredDisabledOpsAuditItem.restoreSourceEventId, disabledAuditItem.eventId)
    assert.equal(restoredDisabledOpsAuditItem.authRole, OPS_ROLE)
    assert.equal(restoredDisabledOpsAuditItem.authSource, OPS_AUTH_SOURCE)
    assert.equal(restoredDisabledOpsAuditItem.opsReason, 'restore disabled audit state for smoke')
    assertNoSecretLeak(restoredDisabledOpsAudit.data)

    const restoredDisabledPool = await requestJson(
      baseUrl,
      `/api/ai/provider/account-pool?factionId=${FACTION_ID}&ownerPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
    )
    assert.equal(restoredDisabledPool.status, 200, `restored disabled account pool read failed: ${JSON.stringify(restoredDisabledPool.data)}`)
    const restoredDisabledPoolPayload = readObject(restoredDisabledPool.data)
    assert.equal(restoredDisabledPoolPayload.dispatchEligibleCount, 0)
    assert.equal(readObject(readArray(restoredDisabledPoolPayload.accounts)[0]).healthStatus, 'disabled')
    assertNoSecretLeak(restoredDisabledPool.data)

    const restoreEnabled = await requestJsonWithHeaders(baseUrl, '/api/ai/provider/account-pool/ops-restore', 'POST', {
      provider: selectedAccount.provider,
      model: PLAYER_MODEL,
      keyFingerprint: selectedAccountFingerprint,
      restoreEventId: enabledAuditItem.eventId,
      opsReason: 'restore enabled audit state for smoke',
      confirmation: 'provider_account_ops_confirmed',
    }, OPS_AUTH_HEADERS)
    assert.equal(restoreEnabled.status, 200, `provider account ops restore enabled failed: ${JSON.stringify(restoreEnabled.data)}`)
    aiPlayerProviderAccountPoolOpsRestoreResponseSchema.parse(restoreEnabled.data)
    const restoredEnabledConfig = readObject(readObject(restoreEnabled.data).config)
    assert.equal(restoredEnabledConfig.enabled, true)
    assert.equal(restoredEnabledConfig.maxConcurrency, 1)
    assert.equal(restoredEnabledConfig.keyFingerprint, selectedAccountFingerprint)
    assertNoSecretLeak(restoreEnabled.data)

    const restoredEnabledPool = await requestJson(
      baseUrl,
      `/api/ai/provider/account-pool?factionId=${FACTION_ID}&ownerPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
    )
    assert.equal(restoredEnabledPool.status, 200, `restored enabled account pool read failed: ${JSON.stringify(restoredEnabledPool.data)}`)
    assert.equal(readObject(restoredEnabledPool.data).dispatchEligibleCount, 1)
    assertNoSecretLeak(restoredEnabledPool.data)

    const restoreLatest = await requestJsonWithHeaders(baseUrl, '/api/ai/provider/account-pool/ops-restore', 'POST', {
      provider: selectedAccount.provider,
      model: PLAYER_MODEL,
      keyFingerprint: selectedAccountFingerprint,
      opsReason: 'restore latest audit state for smoke',
      confirmation: 'provider_account_ops_confirmed',
    }, OPS_AUTH_HEADERS)
    assert.equal(restoreLatest.status, 200, `provider account ops restore latest failed: ${JSON.stringify(restoreLatest.data)}`)
    aiPlayerProviderAccountPoolOpsRestoreResponseSchema.parse(restoreLatest.data)
    const restoreLatestPayload = readObject(restoreLatest.data)
    assert.equal(restoreLatestPayload.ok, true)
    const restoredLatestConfig = readObject(restoreLatestPayload.config)
    assert.equal(restoredLatestConfig.enabled, true)
    assert.equal(restoredLatestConfig.maxConcurrency, 1)
    assert.equal(restoredLatestConfig.keyFingerprint, selectedAccountFingerprint)
    assertNoSecretLeak(restoreLatest.data)

    const ledger = await requestJson(baseUrl, '/api/ai/provider/billing-ledger?limit=10', 'GET')
    assert.equal(ledger.status, 200, `billing ledger read failed: ${JSON.stringify(ledger.data)}`)
    listAiPlayerProviderBillingLedgerResponseSchema.parse(ledger.data)
    const ledgerItems = readArray(readObject(ledger.data).items)
    assert.equal(ledgerItems.length, 1)
    const ledgerEntry = readObject(ledgerItems[0])
    assert.equal(ledgerEntry.aiPlayerId, AI_PLAYER_ID)
    assert.equal(ledgerEntry.factionId, FACTION_ID)
    assert.equal(ledgerEntry.governorPlayerId, GOVERNOR_PLAYER_ID)
    assert.equal(ledgerEntry.billingAccountType, 'player_byok')
    assert.equal(ledgerEntry.billingAccountId, GOVERNOR_PLAYER_ID)
    assert.equal(ledgerEntry.providerSource, 'player_config')
    assert.equal(ledgerEntry.byokSource, 'player_config')
    assert.equal(ledgerEntry.model, PLAYER_MODEL)
    assert.equal(ledgerEntry.provider, new URL(relay.baseUrl).host)
    assert.notEqual(ledgerEntry.provider, 'api.deepseek.com')
    assert.equal(readObject(ledgerEntry.usage).promptTokens, 3)
    assert.equal(readObject(ledgerEntry.usage).completionTokens, 4)
    assert.equal(readObject(ledgerEntry.usage).totalTokens, 7)
    assert.equal(readObject(ledgerEntry.usage).promptCacheHitTokens, 1)
    assert.equal(readObject(ledgerEntry.usage).promptCacheMissTokens, 2)
    assert.equal(readObject(ledgerEntry.usage).estimatedCostUsd, EXPECTED_DEEPSEEK_COST_USD)
    assert.equal(readObject(ledgerEntry.usage).estimatedCostSource, 'pricing_policy')
    assertNoSecretLeak(ledger.data)

    const ledgerCostReconciliation = await requestJson(baseUrl, `/api/ai/provider/cost-reconciliation?requestCount=1&actualCostCny=0.00001010016&estimateSource=ledger&aiPlayerId=${AI_PLAYER_ID}&cnyPerUsd=7.2`, 'GET')
    assert.equal(ledgerCostReconciliation.status, 200, `ledger cost reconciliation read failed: ${JSON.stringify(ledgerCostReconciliation.data)}`)
    aiPlayerProviderCostReconciliationResponseSchema.parse(ledgerCostReconciliation.data)
    const ledgerCostReconciliationPayload = readObject(ledgerCostReconciliation.data)
    assert.equal(ledgerCostReconciliationPayload.ok, true)
    assert.equal(ledgerCostReconciliationPayload.estimatedCostSource, 'billing_ledger')
    assert.equal(ledgerCostReconciliationPayload.estimatedRequestCount, 1)
    assert.equal(ledgerCostReconciliationPayload.estimatedCostUsd, EXPECTED_DEEPSEEK_COST_USD)
    assert.equal(ledgerCostReconciliationPayload.estimatedCostCny, 0.00001010016)
    assert.equal(ledgerCostReconciliationPayload.actualVsEstimateRatio, 1)
    assert.equal(ledgerCostReconciliationPayload.varianceCostCny, 0)
    assert.deepEqual(readArray(ledgerCostReconciliationPayload.warnings), [])
    assertNoSecretLeak(ledgerCostReconciliation.data)

    const ledgerEntryProvider = String(ledgerEntry.provider)
    const ledgerEntryKeyFingerprint = String(ledgerEntry.keyFingerprint)
    const filteredLedgerCostReconciliation = await requestJson(
      baseUrl,
      `/api/ai/provider/cost-reconciliation?requestCount=1&actualCostCny=0.00001010016&estimateSource=ledger&aiPlayerId=${AI_PLAYER_ID}&provider=${encodeURIComponent(ledgerEntryProvider)}&model=${encodeURIComponent(PLAYER_MODEL)}&keyFingerprint=${encodeURIComponent(ledgerEntryKeyFingerprint)}&cnyPerUsd=7.2`,
      'GET',
    )
    assert.equal(filteredLedgerCostReconciliation.status, 200, `filtered ledger cost reconciliation read failed: ${JSON.stringify(filteredLedgerCostReconciliation.data)}`)
    aiPlayerProviderCostReconciliationResponseSchema.parse(filteredLedgerCostReconciliation.data)
    const filteredLedgerCostReconciliationPayload = readObject(filteredLedgerCostReconciliation.data)
    assert.equal(filteredLedgerCostReconciliationPayload.estimatedCostSource, 'billing_ledger')
    assert.equal(filteredLedgerCostReconciliationPayload.estimatedRequestCount, 1)
    assert.equal(filteredLedgerCostReconciliationPayload.estimatedCostUsd, EXPECTED_DEEPSEEK_COST_USD)
    assert.deepEqual(readArray(filteredLedgerCostReconciliationPayload.warnings), [])
    assertNoSecretLeak(filteredLedgerCostReconciliation.data)

    const wrongKeyLedgerCostReconciliation = await requestJson(
      baseUrl,
      `/api/ai/provider/cost-reconciliation?requestCount=1&actualCostCny=0.00001010016&estimateSource=ledger&aiPlayerId=${AI_PLAYER_ID}&provider=${encodeURIComponent(ledgerEntryProvider)}&model=${encodeURIComponent(PLAYER_MODEL)}&keyFingerprint=${encodeURIComponent('sha256:missing-ledger-key')}&cnyPerUsd=7.2`,
      'GET',
    )
    assert.equal(wrongKeyLedgerCostReconciliation.status, 200, `wrong-key ledger cost reconciliation read failed: ${JSON.stringify(wrongKeyLedgerCostReconciliation.data)}`)
    aiPlayerProviderCostReconciliationResponseSchema.parse(wrongKeyLedgerCostReconciliation.data)
    const wrongKeyLedgerCostReconciliationPayload = readObject(wrongKeyLedgerCostReconciliation.data)
    assert.equal(wrongKeyLedgerCostReconciliationPayload.estimatedCostSource, 'billing_ledger')
    assert.equal(wrongKeyLedgerCostReconciliationPayload.estimatedRequestCount, 0)
    assert.equal(wrongKeyLedgerCostReconciliationPayload.estimatedCostUsd, 0)
    assert.equal(readArray(wrongKeyLedgerCostReconciliationPayload.warnings).includes('billing_ledger_empty'), true)
    assert.equal(readArray(wrongKeyLedgerCostReconciliationPayload.warnings).includes('request_count_mismatch'), true)
    assertNoSecretLeak(wrongKeyLedgerCostReconciliation.data)

    const ledgerEntryCreatedAtMs = Date.parse(String(ledgerEntry.createdAt))
    assert.ok(Number.isFinite(ledgerEntryCreatedAtMs), `ledger entry createdAt should be parseable: ${ledgerEntry.createdAt}`)
    const ledgerRangeFromMs = Date.UTC(
      new Date(ledgerEntryCreatedAtMs).getUTCFullYear(),
      new Date(ledgerEntryCreatedAtMs).getUTCMonth(),
      new Date(ledgerEntryCreatedAtMs).getUTCDate(),
    )
    const ledgerRangeFrom = new Date(ledgerRangeFromMs).toISOString().slice(0, 10)
    const ledgerRangeTo = new Date(ledgerRangeFromMs + 86_400_000).toISOString().slice(0, 10)
    const ledgerOnlyDeepSeekBilling = await requestJson(
      baseUrl,
      `/api/ai/provider/deepseek-billing?estimateSource=ledger&aiPlayerId=${AI_PLAYER_ID}&from=${ledgerRangeFrom}&to=${ledgerRangeTo}&cnyPerUsd=7.2`,
      'GET',
    )
    assert.equal(ledgerOnlyDeepSeekBilling.status, 200, `ledger-only DeepSeek billing range read failed: ${JSON.stringify(ledgerOnlyDeepSeekBilling.data)}`)
    aiPlayerProviderDeepSeekBillingReadModelResponseSchema.parse(ledgerOnlyDeepSeekBilling.data)
    const ledgerOnlyDeepSeekBillingPayload = readObject(ledgerOnlyDeepSeekBilling.data)
    const ledgerOnlyRange = readObject(ledgerOnlyDeepSeekBillingPayload.range)
    assert.equal(ledgerOnlyRange.label, 'range')
    assert.equal(ledgerOnlyRange.observationSource, 'billing_ledger')
    assert.equal(ledgerOnlyRange.requestCount, 1)
    assert.equal(ledgerOnlyRange.estimatedRequestCount, 1)
    assert.equal(ledgerOnlyRange.estimatedCostUsd, EXPECTED_DEEPSEEK_COST_USD)
    assert.equal(ledgerOnlyRange.estimatedCostCny, 0.00001010016)
    assert.equal(ledgerOnlyRange.estimatedCostUsdPerRequest, EXPECTED_DEEPSEEK_COST_USD)
    assert.equal(ledgerOnlyRange.estimatedCostCnyPerRequest, 0.00001010016)
    assert.equal(readArray(ledgerOnlyRange.warnings).includes('request_count_missing'), false)
    assertNoSecretLeak(ledgerOnlyDeepSeekBilling.data)

    const filteredLedgerOnlyDeepSeekBilling = await requestJson(
      baseUrl,
      `/api/ai/provider/deepseek-billing?estimateSource=ledger&aiPlayerId=${AI_PLAYER_ID}&provider=${encodeURIComponent(ledgerEntryProvider)}&model=${encodeURIComponent(PLAYER_MODEL)}&keyFingerprint=${encodeURIComponent(ledgerEntryKeyFingerprint)}&from=${ledgerRangeFrom}&to=${ledgerRangeTo}&cnyPerUsd=7.2`,
      'GET',
    )
    assert.equal(filteredLedgerOnlyDeepSeekBilling.status, 200, `filtered ledger-only DeepSeek billing range read failed: ${JSON.stringify(filteredLedgerOnlyDeepSeekBilling.data)}`)
    aiPlayerProviderDeepSeekBillingReadModelResponseSchema.parse(filteredLedgerOnlyDeepSeekBilling.data)
    const filteredLedgerOnlyRange = readObject(readObject(filteredLedgerOnlyDeepSeekBilling.data).range)
    assert.equal(filteredLedgerOnlyRange.observationSource, 'billing_ledger')
    assert.equal(filteredLedgerOnlyRange.requestCount, 1)
    assert.equal(filteredLedgerOnlyRange.estimatedRequestCount, 1)
    assert.equal(filteredLedgerOnlyRange.estimatedCostUsd, EXPECTED_DEEPSEEK_COST_USD)
    assert.deepEqual(readArray(filteredLedgerOnlyRange.warnings), [])
    assertNoSecretLeak(filteredLedgerOnlyDeepSeekBilling.data)

    const wrongKeyLedgerOnlyDeepSeekBilling = await requestJson(
      baseUrl,
      `/api/ai/provider/deepseek-billing?estimateSource=ledger&aiPlayerId=${AI_PLAYER_ID}&provider=${encodeURIComponent(ledgerEntryProvider)}&model=${encodeURIComponent(PLAYER_MODEL)}&keyFingerprint=${encodeURIComponent('sha256:missing-ledger-key')}&from=${ledgerRangeFrom}&to=${ledgerRangeTo}&cnyPerUsd=7.2`,
      'GET',
    )
    assert.equal(wrongKeyLedgerOnlyDeepSeekBilling.status, 200, `wrong-key ledger-only DeepSeek billing range read failed: ${JSON.stringify(wrongKeyLedgerOnlyDeepSeekBilling.data)}`)
    aiPlayerProviderDeepSeekBillingReadModelResponseSchema.parse(wrongKeyLedgerOnlyDeepSeekBilling.data)
    const wrongKeyLedgerOnlyRange = readObject(readObject(wrongKeyLedgerOnlyDeepSeekBilling.data).range)
    assert.equal(wrongKeyLedgerOnlyRange.observationSource, 'billing_ledger')
    assert.equal(wrongKeyLedgerOnlyRange.requestCount, null)
    assert.equal(wrongKeyLedgerOnlyRange.estimatedRequestCount, 0)
    assert.equal(wrongKeyLedgerOnlyRange.estimatedCostUsd, 0)
    assert.deepEqual(readArray(wrongKeyLedgerOnlyRange.warnings), ['billing_ledger_empty'])
    assertNoSecretLeak(wrongKeyLedgerOnlyDeepSeekBilling.data)

    const aiCommandCreditSummary = await requestJson(baseUrl, `/api/ai/provider/ai-command-credit-summary?aiPlayerId=${AI_PLAYER_ID}`, 'GET')
    assert.equal(aiCommandCreditSummary.status, 200, `AI command credit summary read failed: ${JSON.stringify(aiCommandCreditSummary.data)}`)
    aiPlayerProviderAiCommandCreditSummaryResponseSchema.parse(aiCommandCreditSummary.data)
    const aiCommandCreditSummaryPayload = readObject(aiCommandCreditSummary.data)
    assert.equal(aiCommandCreditSummaryPayload.ok, true)
    assert.equal(readObject(aiCommandCreditSummaryPayload.policy).displayName, 'AI军令')
    assert.equal(aiCommandCreditSummaryPayload.requestCount, 1)
    assert.equal(aiCommandCreditSummaryPayload.consumedTotalTokens, 7)
    assert.equal(aiCommandCreditSummaryPayload.consumedCredits, 1)
    const aiCommandCreditSummaryPlayers = readArray(aiCommandCreditSummaryPayload.byAiPlayer)
    assert.equal(aiCommandCreditSummaryPlayers.length, 1)
    assert.equal(readObject(aiCommandCreditSummaryPlayers[0]).aiPlayerId, AI_PLAYER_ID)
    assert.equal(readObject(aiCommandCreditSummaryPlayers[0]).consumedCredits, 1)
    assertNoSecretLeak(aiCommandCreditSummary.data)

    const tokenSummary = await requestJson(baseUrl, '/api/ai/provider/token-summary', 'GET')
    assert.equal(tokenSummary.status, 200, `token summary read failed: ${JSON.stringify(tokenSummary.data)}`)
    listAiPlayerProviderTokenSummaryResponseSchema.parse(tokenSummary.data)
    const tokenSummaryItems = readArray(readObject(tokenSummary.data).items)
    assert.equal(tokenSummaryItems.length, 1)
    const tokenSummaryItem = readObject(tokenSummaryItems[0])
    assert.equal(tokenSummaryItem.aiPlayerId, AI_PLAYER_ID)
    assert.equal(tokenSummaryItem.factionId, FACTION_ID)
    assert.equal(tokenSummaryItem.governorPlayerId, GOVERNOR_PLAYER_ID)
    assert.equal(tokenSummaryItem.billingAccountType, 'player_byok')
    assert.equal(tokenSummaryItem.billingAccountId, GOVERNOR_PLAYER_ID)
    assert.equal(tokenSummaryItem.provider, ledgerEntryProvider)
    assert.equal(tokenSummaryItem.model, PLAYER_MODEL)
    assert.equal(tokenSummaryItem.keyFingerprint, ledgerEntryKeyFingerprint)
    assert.equal(readObject(tokenSummaryItem.today).promptTokens, 3)
    assert.equal(readObject(tokenSummaryItem.today).completionTokens, 4)
    assert.equal(readObject(tokenSummaryItem.today).totalTokens, 7)
    assert.equal(readObject(tokenSummaryItem.today).estimatedCostUsd, EXPECTED_DEEPSEEK_COST_USD)
    assert.equal(readObject(tokenSummaryItem.thisMonth).totalTokens, 7)
    assert.equal(readObject(tokenSummaryItem.total).totalTokens, 7)
    assert.equal(readObject(tokenSummaryItem.total).estimatedCostUsd, EXPECTED_DEEPSEEK_COST_USD)
    const budgetStatus = readObject(tokenSummaryItem.budgetStatus)
    assert.equal(budgetStatus.budgetTier, 'strict_action')
    assert.equal(budgetStatus.consumedRuns, 1)
    assert.equal(budgetStatus.consumedTotalTokens, 7)
    assert.equal(budgetStatus.consumedEstimatedCostUsd, EXPECTED_DEEPSEEK_COST_USD)
    assertNoSecretLeak(tokenSummary.data)

    const tokenSummaryDetail = await requestJson(baseUrl, `/api/ai/provider/token-summary/${AI_PLAYER_ID}`, 'GET')
    assert.equal(tokenSummaryDetail.status, 200, `token summary detail read failed: ${JSON.stringify(tokenSummaryDetail.data)}`)
    listAiPlayerProviderTokenSummaryResponseSchema.parse(tokenSummaryDetail.data)
    const tokenSummaryDetailItems = readArray(readObject(tokenSummaryDetail.data).items)
    assert.equal(tokenSummaryDetailItems.length, 1)
    assert.equal(readObject(tokenSummaryDetailItems[0]).aiPlayerId, AI_PLAYER_ID)
    assertNoSecretLeak(tokenSummaryDetail.data)

    const filteredTokenSummary = await requestJson(
      baseUrl,
      `/api/ai/provider/token-summary?aiPlayerId=${AI_PLAYER_ID}&provider=${encodeURIComponent(ledgerEntryProvider)}&model=${encodeURIComponent(PLAYER_MODEL)}&keyFingerprint=${encodeURIComponent(ledgerEntryKeyFingerprint)}`,
      'GET',
    )
    assert.equal(filteredTokenSummary.status, 200, `filtered token summary read failed: ${JSON.stringify(filteredTokenSummary.data)}`)
    listAiPlayerProviderTokenSummaryResponseSchema.parse(filteredTokenSummary.data)
    const filteredTokenSummaryItems = readArray(readObject(filteredTokenSummary.data).items)
    assert.equal(filteredTokenSummaryItems.length, 1)
    assert.equal(readObject(filteredTokenSummaryItems[0]).keyFingerprint, ledgerEntryKeyFingerprint)
    assert.equal(readObject(readObject(filteredTokenSummaryItems[0]).total).totalTokens, 7)
    assertNoSecretLeak(filteredTokenSummary.data)

    const wrongKeyTokenSummary = await requestJson(
      baseUrl,
      `/api/ai/provider/token-summary?aiPlayerId=${AI_PLAYER_ID}&provider=${encodeURIComponent(ledgerEntryProvider)}&model=${encodeURIComponent(PLAYER_MODEL)}&keyFingerprint=${encodeURIComponent('sha256:missing-ledger-key')}`,
      'GET',
    )
    assert.equal(wrongKeyTokenSummary.status, 200, `wrong-key token summary read failed: ${JSON.stringify(wrongKeyTokenSummary.data)}`)
    listAiPlayerProviderTokenSummaryResponseSchema.parse(wrongKeyTokenSummary.data)
    assert.equal(readObject(wrongKeyTokenSummary.data).count, 0)
    assert.equal(readArray(readObject(wrongKeyTokenSummary.data).items).length, 0)
    assertNoSecretLeak(wrongKeyTokenSummary.data)

    const tokenBalance = await requestJson(baseUrl, `/api/ai/provider/token-balance/${GOVERNOR_PLAYER_ID}`, 'GET')
    assert.equal(tokenBalance.status, 200, `token balance read failed: ${JSON.stringify(tokenBalance.data)}`)
    listAiPlayerProviderTokenBalanceResponseSchema.parse(tokenBalance.data)
    const tokenBalanceItems = readArray(readObject(tokenBalance.data).items)
    assert.equal(tokenBalanceItems.length, 1)
    const tokenBalanceItem = readObject(tokenBalanceItems[0])
    assert.equal(tokenBalanceItem.governorPlayerId, GOVERNOR_PLAYER_ID)
    assert.equal(tokenBalanceItem.billingAccountType, 'player_byok')
    assert.equal(tokenBalanceItem.billingAccountId, GOVERNOR_PLAYER_ID)
    assert.equal(tokenBalanceItem.budgetTier, 'strict_action')
    assert.equal(tokenBalanceItem.limitMode, 'configured')
    assert.equal(tokenBalanceItem.totalPurchasedTokens, 100000)
    assert.equal(tokenBalanceItem.totalConsumedTokens, 7)
    assert.equal(tokenBalanceItem.remainingTokens, 99993)
    assert.equal(tokenBalanceItem.totalConsumedEstimatedCostUsd, EXPECTED_DEEPSEEK_COST_USD)
    assert.equal(tokenBalanceItem.estimatedDailyBurnTokens, 7)
    assert.equal(tokenBalanceItem.daysRemaining, 14284)
    const tokenBalanceAiPlayers = readArray(tokenBalanceItem.byAiPlayer)
    assert.equal(tokenBalanceAiPlayers.length, 1)
    assert.equal(readObject(tokenBalanceAiPlayers[0]).aiPlayerId, AI_PLAYER_ID)
    assert.equal(readObject(tokenBalanceAiPlayers[0]).consumedTotalTokens, 7)
    assert.equal(readObject(tokenBalanceAiPlayers[0]).consumedEstimatedCostUsd, EXPECTED_DEEPSEEK_COST_USD)
    assertNoSecretLeak(tokenBalance.data)

    const aiCommandCreditDebit = await requestJson(baseUrl, '/api/ai/provider/ai-command-credits/debits', 'POST', {
      accountId: GOVERNOR_PLAYER_ID,
      worldId: 'season_alpha',
      amountCredits: 3,
      requestId: 'provider_req_successful_debit',
      aiPlayerId: AI_PLAYER_ID,
      factionId: FACTION_ID,
      reason: 'provider_request_succeeded',
    })
    assert.equal(aiCommandCreditDebit.status, 200, `AI command credit debit failed: ${JSON.stringify(aiCommandCreditDebit.data)}`)
    aiPlayerProviderAiCommandCreditLedgerMutationResponseSchema.parse(aiCommandCreditDebit.data)
    const aiCommandCreditDebitPayload = readObject(aiCommandCreditDebit.data)
    assert.equal(aiCommandCreditDebitPayload.ok, true)
    assert.equal(readObject(aiCommandCreditDebitPayload.entry).entryType, 'debit')
    assert.equal(readObject(aiCommandCreditDebitPayload.entry).amountCredits, -3)
    assert.equal(readObject(aiCommandCreditDebitPayload.balance).balanceCredits, 296)
    assert.equal(readObject(aiCommandCreditDebitPayload.balance).reservedCredits, 0)
    assert.equal(readObject(aiCommandCreditDebitPayload.balance).availableCredits, 296)
    assertNoSecretLeak(aiCommandCreditDebit.data)

    const aiCommandCreditRejectedDebit = await requestJson(baseUrl, '/api/ai/provider/ai-command-credits/debits', 'POST', {
      accountId: GOVERNOR_PLAYER_ID,
      worldId: 'season_alpha',
      amountCredits: 500,
      requestId: 'provider_req_failed_not_charged',
      aiPlayerId: AI_PLAYER_ID,
      factionId: FACTION_ID,
      reason: 'provider_request_failed',
    })
    assert.equal(aiCommandCreditRejectedDebit.status, 200, `AI command credit rejected debit read failed: ${JSON.stringify(aiCommandCreditRejectedDebit.data)}`)
    const aiCommandCreditRejectedDebitPayload = readObject(aiCommandCreditRejectedDebit.data)
    assert.equal(aiCommandCreditRejectedDebitPayload.ok, false)
    assert.equal(aiCommandCreditRejectedDebitPayload.error, 'insufficient_ai_command_credits')
    assertNoSecretLeak(aiCommandCreditRejectedDebit.data)

    const aiCommandCreditBalance = await requestJson(baseUrl, `/api/ai/provider/ai-command-credits/balance?accountId=${GOVERNOR_PLAYER_ID}&worldId=season_alpha`, 'GET')
    assert.equal(aiCommandCreditBalance.status, 200, `AI command credit balance read failed: ${JSON.stringify(aiCommandCreditBalance.data)}`)
    aiPlayerProviderAiCommandCreditBalanceResponseSchema.parse(aiCommandCreditBalance.data)
    const aiCommandCreditBalancePayload = readObject(aiCommandCreditBalance.data)
    assert.equal(aiCommandCreditBalancePayload.ok, true)
    assert.equal(aiCommandCreditBalancePayload.accountId, GOVERNOR_PLAYER_ID)
    assert.equal(aiCommandCreditBalancePayload.worldId, 'season_alpha')
    assert.equal(aiCommandCreditBalancePayload.balanceCredits, 296)
    assert.equal(aiCommandCreditBalancePayload.reservedCredits, 0)
    assert.equal(aiCommandCreditBalancePayload.availableCredits, 296)
    assert.equal(aiCommandCreditBalancePayload.grantedCredits, 300)
    assert.equal(aiCommandCreditBalancePayload.debitedCredits, 4)
    assert.equal(aiCommandCreditBalancePayload.ledgerCount, 3)
    assertNoSecretLeak(aiCommandCreditBalance.data)

    const relayProbeCountBeforeRateLimit = relay.probes.length
    relay.setNextStatus(429)
    const rateLimitedModelProposals = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/model-proposals`, 'POST')
    assert.equal(rateLimitedModelProposals.status, 429, `rate-limited model proposal failed with unexpected status: ${JSON.stringify(rateLimitedModelProposals.data)}`)
    const rateLimitedModelProposalPayload = readObject(rateLimitedModelProposals.data)
    assert.equal(rateLimitedModelProposalPayload.ok, false)
    assert.equal(rateLimitedModelProposalPayload.error, 'model_request_failed_429')
    assert.equal(relay.probes.length, relayProbeCountBeforeRateLimit + 1)
    assertNoSecretLeak(rateLimitedModelProposals.data)

    const aiCommandCreditBalanceAfterRateLimit = await requestJson(baseUrl, `/api/ai/provider/ai-command-credits/balance?accountId=${GOVERNOR_PLAYER_ID}&worldId=season_alpha`, 'GET')
    assert.equal(aiCommandCreditBalanceAfterRateLimit.status, 200, `AI command credit balance after 429 read failed: ${JSON.stringify(aiCommandCreditBalanceAfterRateLimit.data)}`)
    aiPlayerProviderAiCommandCreditBalanceResponseSchema.parse(aiCommandCreditBalanceAfterRateLimit.data)
    const aiCommandCreditBalanceAfterRateLimitPayload = readObject(aiCommandCreditBalanceAfterRateLimit.data)
    assert.equal(aiCommandCreditBalanceAfterRateLimitPayload.balanceCredits, 296)
    assert.equal(aiCommandCreditBalanceAfterRateLimitPayload.reservedCredits, 0)
    assert.equal(aiCommandCreditBalanceAfterRateLimitPayload.availableCredits, 296)
    assert.equal(aiCommandCreditBalanceAfterRateLimitPayload.debitedCredits, 4)
    assert.equal(aiCommandCreditBalanceAfterRateLimitPayload.ledgerCount, 3)
    assertNoSecretLeak(aiCommandCreditBalanceAfterRateLimit.data)

    const relayProbeCountBeforeBackoff = relay.probes.length
    const backoffModelProposals = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/model-proposals`, 'POST')
    assert.equal(backoffModelProposals.status, 429, `backoff model proposal failed with unexpected status: ${JSON.stringify(backoffModelProposals.data)}`)
    const backoffModelProposalPayload = readObject(backoffModelProposals.data)
    assert.equal(backoffModelProposalPayload.ok, false)
    assert.equal(backoffModelProposalPayload.error, 'model_provider_backoff_active')
    assert.equal(relay.probes.length, relayProbeCountBeforeBackoff, 'active provider backoff must not call relay again')
    assertNoSecretLeak(backoffModelProposals.data)

    const aiCommandCreditBalanceAfterBackoff = await requestJson(baseUrl, `/api/ai/provider/ai-command-credits/balance?accountId=${GOVERNOR_PLAYER_ID}&worldId=season_alpha`, 'GET')
    assert.equal(aiCommandCreditBalanceAfterBackoff.status, 200, `AI command credit balance after backoff read failed: ${JSON.stringify(aiCommandCreditBalanceAfterBackoff.data)}`)
    aiPlayerProviderAiCommandCreditBalanceResponseSchema.parse(aiCommandCreditBalanceAfterBackoff.data)
    const aiCommandCreditBalanceAfterBackoffPayload = readObject(aiCommandCreditBalanceAfterBackoff.data)
    assert.equal(aiCommandCreditBalanceAfterBackoffPayload.balanceCredits, 296)
    assert.equal(aiCommandCreditBalanceAfterBackoffPayload.reservedCredits, 0)
    assert.equal(aiCommandCreditBalanceAfterBackoffPayload.availableCredits, 296)
    assert.equal(aiCommandCreditBalanceAfterBackoffPayload.debitedCredits, 4)
    assert.equal(aiCommandCreditBalanceAfterBackoffPayload.ledgerCount, 3)
    assertNoSecretLeak(aiCommandCreditBalanceAfterBackoff.data)

    const auditBeforeDelete = await requestJson(baseUrl, '/api/ai/provider/audit-events?limit=20', 'GET')
    assert.equal(auditBeforeDelete.status, 200, `audit event read failed: ${JSON.stringify(auditBeforeDelete.data)}`)
    listAiPlayerProviderAuditEventsResponseSchema.parse(auditBeforeDelete.data)
    const auditEvents = readArray(readObject(auditBeforeDelete.data).items)
    assert.equal(auditEvents.some((item) => readObject(item).eventType === 'byok_key_configured'), true)
    assert.equal(auditEvents.some((item) => readObject(item).eventType === 'provider_request_succeeded'), true)
    assertNoSecretLeak(auditBeforeDelete.data)

    const revoke = await requestJson(
      baseUrl,
      `/api/ai/provider/player-keys/${GOVERNOR_PLAYER_ID}?actorId=${GOVERNOR_PLAYER_ID}`,
      'DELETE',
    )
    assert.equal(revoke.status, 200, `player key revoke failed: ${JSON.stringify(revoke.data)}`)
    aiPlayerProviderPlayerKeyMutationResponseSchema.parse(revoke.data)
    const revokedKey = readObject(readObject(revoke.data).key)
    assert.equal(revokedKey.status, 'revoked')
    assert.equal(revokedKey.secretConfigured, false)
    assert.equal(revokedKey.secretSource, null)
    assertNoSecretLeak(revoke.data)

    const runtimeAfterRevoke = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}`, 'GET')
    assert.equal(runtimeAfterRevoke.status, 200, `runtime read after revoke failed: ${JSON.stringify(runtimeAfterRevoke.data)}`)
    const modelStatusAfter = readObject(readObject(runtimeAfterRevoke.data).modelStatus)
    assert.notEqual(modelStatusAfter.source, 'player_config')
    assert.equal(readArray(modelStatusAfter.candidateTargets).some((item) => readObject(item).source === 'player_config'), false)

    const aiCommandCreditBalanceAfterFailure = await requestJson(baseUrl, `/api/ai/provider/ai-command-credits/balance?accountId=${GOVERNOR_PLAYER_ID}&worldId=season_alpha`, 'GET')
    assert.equal(aiCommandCreditBalanceAfterFailure.status, 200, `AI command credit balance after failure read failed: ${JSON.stringify(aiCommandCreditBalanceAfterFailure.data)}`)
    aiPlayerProviderAiCommandCreditBalanceResponseSchema.parse(aiCommandCreditBalanceAfterFailure.data)
    const aiCommandCreditBalanceAfterFailurePayload = readObject(aiCommandCreditBalanceAfterFailure.data)
    assert.equal(aiCommandCreditBalanceAfterFailurePayload.balanceCredits, 296)
    assert.equal(aiCommandCreditBalanceAfterFailurePayload.reservedCredits, 0)
    assert.equal(aiCommandCreditBalanceAfterFailurePayload.availableCredits, 296)
    assert.equal(aiCommandCreditBalanceAfterFailurePayload.debitedCredits, 4)
    assert.equal(aiCommandCreditBalanceAfterFailurePayload.ledgerCount, 3)
    assertNoSecretLeak(aiCommandCreditBalanceAfterFailure.data)

    const auditAfterDelete = await requestJson(baseUrl, '/api/ai/provider/audit-events?limit=20', 'GET')
    assert.equal(auditAfterDelete.status, 200, `audit event read after delete failed: ${JSON.stringify(auditAfterDelete.data)}`)
    const auditAfterDeleteItems = readArray(readObject(auditAfterDelete.data).items)
    assert.equal(auditAfterDeleteItems.some((item) => readObject(item).eventType === 'byok_key_revoked'), true)
    assertNoSecretLeak(auditAfterDelete.data)

    console.log('[ai_player_provider_accounting_contract] all checks passed')
  } finally {
    await shutdownChild(child)
    await relay.stop()
    await budgetGate.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_provider_accounting_contract] failed:', error)
  process.exitCode = 1
})
