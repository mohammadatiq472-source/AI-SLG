import assert from 'node:assert/strict'
import { existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import type { ResolvedPlannerTarget } from '../src/config/modelGateway'
import {
  buildAiPlayerRuntimeProposalMessages,
  getAiPlayerRuntimeModelRequestQueueStatus,
  parseAiPlayerRuntimeProposalJson,
  requestAiPlayerRuntimeProposalFromCandidateTargets,
  requestAiPlayerRuntimeProposalFromModel,
  resetAiPlayerRuntimeModelDispatchStoreForTest,
  toAiPlayerActionProposalRequests,
} from '../src/application/ai/aiPlayerRuntimeProposalModel'
import {
  createAiPlayerRuntimeModelDispatchPostgresStore,
  createAiPlayerRuntimeModelDispatchRedisStore,
  createAiPlayerRuntimeModelDispatchStore,
} from '../src/application/ai/aiPlayerRuntimeModelDispatchStore'
import type { AiPlayerRuntimeModelTargetCandidate } from '../src/application/ai/aiPlayerRuntimeModelTarget'
import { AI_PLAYER_RUNTIME_SYSTEM_CONTEXT } from '../../shared/contracts/aiPlayerRuntimePrompt'
import { aiPlayerActionProposalRequestSchema } from '../../shared/schemas/aiPlayer'

const TARGET: ResolvedPlannerTarget = {
  source: 'gateway',
  label: 'contract relay',
  protocol: 'openai_compat',
  baseUrl: 'https://relay.example/v1',
  apiKeys: ['secret-token-for-test'],
  model: 'cheap-json-model',
}

const VALID_MODEL_OUTPUT = {
  summary: 'transfer excess wood to the governor inbox',
  proposals: [
    {
      action: 'resource_transfer_to_governor',
      args: { resources: { wood: 11 } },
      reason: '资源：AI 子账户木材 11 可输送；目标：转入总督通用收件箱；风险：需要人工批准且受额度/冷却约束；批准后结果：后端执行资源输送并生成 receipt。',
    },
  ],
  deferReason: '',
  needsHumanReview: true,
}

function testStrictJsonParserAndRequestConversion() {
  const parsed = parseAiPlayerRuntimeProposalJson(JSON.stringify(VALID_MODEL_OUTPUT))
  assert.equal(parsed.proposals.length, 1)
  assert.equal(parsed.proposals[0].action, 'resource_transfer_to_governor')

  const requests = toAiPlayerActionProposalRequests('ai_player_alpha', parsed)
  assert.equal(requests.length, 1)
  assert.deepEqual(requests[0], {
    aiPlayerId: 'ai_player_alpha',
    action: 'resource_transfer_to_governor',
    args: { resources: { wood: 11 } },
    reason: '资源：AI 子账户木材 11 可输送；目标：转入总督通用收件箱；风险：需要人工批准且受额度/冷却约束；批准后结果：后端执行资源输送并生成 receipt。',
    source: 'llm',
  })
  assert.ok(aiPlayerActionProposalRequestSchema.safeParse(requests[0]).success)
}

function testParserRejectsNonContractOutput() {
  assert.throws(
    () => parseAiPlayerRuntimeProposalJson('```json\n{"proposals":[]}\n```'),
    /Unexpected token/,
    'model output must be strict JSON without markdown fences',
  )
  assert.throws(
    () => parseAiPlayerRuntimeProposalJson(JSON.stringify({
      summary: 'invalid action',
      proposals: [{ action: 'battle_report_read', args: {}, reason: 'not executable in the runtime prompt' }],
      needsHumanReview: false,
    })),
    /AI_PLAYER_RUNTIME_ALLOWED_ACTIONS/,
    'model output must stay inside the executable v1 player action list',
  )
  assert.throws(
    () => parseAiPlayerRuntimeProposalJson(JSON.stringify({
      summary: 'too many',
      proposals: Array.from({ length: AI_PLAYER_RUNTIME_SYSTEM_CONTEXT.outputContract.maxProposals + 1 }, () => ({
        action: 'reward_claim',
        args: {},
        reason: 'claim pending reward',
      })),
      needsHumanReview: false,
    })),
    /Too big/,
    'model output must respect maxProposals',
  )
}

function testContextDocumentsAreInjectedIntoSystemPrompt() {
  const messages = buildAiPlayerRuntimeProposalMessages({
    aiPlayerId: 'ai_player_alpha',
    runtime: {
      contextDocuments: [
        {
          kind: 'identity',
          title: 'Old Wang Identity',
          content: 'Always call the governor big brother and explain plans in Old Wang voice.',
        },
        {
          kind: 'instruction',
          title: 'Battlefield Style',
          content: 'Prefer cautious resource fights and name the proposed target clearly.',
        },
      ],
    },
  })

  assert.ok(messages[0].content.includes('Injected Runtime Context Documents'))
  assert.ok(messages[0].content.includes('[identity] Old Wang Identity'))
  assert.ok(messages[0].content.includes('big brother'))
  assert.ok(messages[0].content.includes('[instruction] Battlefield Style'))
  assert.ok(messages[0].content.includes('Prefer cautious resource fights'))
}

async function testOpenAiCompatRequestUsesJsonOnlyBoundary() {
  let observedAuthorization = ''
  let observedBody: Record<string, unknown> = {}
  const fetchImpl: typeof fetch = async (_url, init) => {
    observedAuthorization = String((init?.headers as Record<string, string>).Authorization)
    observedBody = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
    return new Response(JSON.stringify({
      model: TARGET.model,
      choices: [
        {
          message: {
            content: JSON.stringify(VALID_MODEL_OUTPUT),
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  const result = await requestAiPlayerRuntimeProposalFromModel({
    target: TARGET,
    observation: {
      aiPlayerId: 'ai_player_alpha',
      runtime: { aiPlayerId: 'ai_player_alpha', resourceTransfer: { canTransferNow: true } },
      world: { factions: { player: { aiResourceAccounts: { ai_player_alpha: { resources: { wood: 30 } } } } } },
      receipts: [],
      failures: [],
    },
    fetchImpl,
  })

  if (!result.ok) {
    throw new Error(result.error)
  }
  assert.equal(result.ok, true)
  assert.equal(observedAuthorization, `Bearer ${TARGET.apiKeys[0]}`)
  assert.equal(observedBody.model, TARGET.model)
  assert.deepEqual(observedBody.response_format, { type: 'json_object' })
  assert.equal(result.proposalRequests[0].source, 'llm')
  assert.equal(result.proposalRequests[0].action, 'resource_transfer_to_governor')

  const messages = buildAiPlayerRuntimeProposalMessages({
    aiPlayerId: 'ai_player_alpha',
    runtime: {},
  })
  assert.ok(messages[0].content.includes('JSON only'))
  assert.ok(messages[0].content.includes('WorldService'))
  assert.ok(messages[0].content.includes('commitWorldState'))
}

async function testDeepSeekV4JsonProposalDisablesThinkingMode() {
  let observedBody: Record<string, unknown> = {}
  const deepSeekTarget: ResolvedPlannerTarget = {
    ...TARGET,
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-v4-flash',
  }
  const result = await requestAiPlayerRuntimeProposalFromModel({
    target: deepSeekTarget,
    observation: {
      aiPlayerId: 'ai_player_alpha',
      runtime: { aiPlayerId: 'ai_player_alpha', resourceTransfer: { canTransferNow: true } },
      receipts: [],
      failures: [],
    },
    fetchImpl: async (_url, init) => {
      observedBody = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
      return new Response(JSON.stringify({
        model: deepSeekTarget.model,
        choices: [
          {
            message: {
              content: JSON.stringify(VALID_MODEL_OUTPUT),
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    },
  })

  if (!result.ok) {
    throw new Error(result.error)
  }
  assert.deepEqual(observedBody.response_format, { type: 'json_object' })
  assert.deepEqual(observedBody.thinking, { type: 'disabled' })
  assert.equal(result.proposalRequests[0].action, 'resource_transfer_to_governor')
}

async function testModelErrorsDoNotExposeSecrets() {
  const failed = await requestAiPlayerRuntimeProposalFromModel({
    target: TARGET,
    observation: { aiPlayerId: 'ai_player_alpha', runtime: {} },
    fetchImpl: async () => new Response('{}', { status: 401 }),
  })
  assert.equal(failed.ok, false)
  assert.equal(failed.error, 'model_request_failed_401')
  assert.ok(!failed.error.includes(TARGET.apiKeys[0]))

  const missingKey = await requestAiPlayerRuntimeProposalFromModel({
    target: { ...TARGET, apiKeys: [] },
    observation: { aiPlayerId: 'ai_player_alpha', runtime: {} },
    fetchImpl: async () => new Response('{}', { status: 200 }),
  })
  assert.equal(missingKey.ok, false)
  assert.equal(missingKey.error, 'missing_model_api_key')
}

async function testAuthFailuresTryNextKeyWithoutSecretLeak() {
  const attemptedAuthorizations: string[] = []
  const retryTarget: ResolvedPlannerTarget = {
    ...TARGET,
    apiKeys: ['expired-key-for-test', 'valid-key-for-test'],
  }
  const result = await requestAiPlayerRuntimeProposalFromModel({
    target: retryTarget,
    observation: { aiPlayerId: 'ai_player_alpha', runtime: {} },
    fetchImpl: async (_url, init) => {
      const authorization = String((init?.headers as Record<string, string>).Authorization)
      attemptedAuthorizations.push(authorization)
      if (authorization === 'Bearer expired-key-for-test') {
        return new Response('{}', { status: 401 })
      }
      return new Response(JSON.stringify({
        model: retryTarget.model,
        choices: [
          {
            message: {
              content: JSON.stringify(VALID_MODEL_OUTPUT),
            },
          },
        ],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    },
  })

  if (!result.ok) {
    throw new Error(result.error)
  }
  assert.deepEqual(attemptedAuthorizations, [
    'Bearer expired-key-for-test',
    'Bearer valid-key-for-test',
  ])
  assert.equal(result.proposalRequests.length, 1)
  assert.equal(result.proposalRequests[0].source, 'llm')
}

async function testCandidateFallbackUsesProAfterFlashMissingContent() {
  const candidates: AiPlayerRuntimeModelTargetCandidate[] = [
    {
      target: { ...TARGET, model: 'deepseek-v4-flash' },
      source: 'env',
      byokSource: 'none',
      priority: 0,
      secretSource: 'AI_PLAYER_RUNTIME_MODEL_API_KEY',
      lastFailureReason: null,
    },
    {
      target: { ...TARGET, model: 'deepseek-v4-pro' },
      source: 'env',
      byokSource: 'none',
      priority: 1,
      secretSource: 'AI_PLAYER_RUNTIME_MODEL_API_KEY',
      lastFailureReason: null,
    },
  ]
  const attemptedModels: string[] = []
  const result = await requestAiPlayerRuntimeProposalFromCandidateTargets({
    candidates,
    observation: { aiPlayerId: 'ai_player_alpha', runtime: {} },
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
      const model = String(body.model)
      attemptedModels.push(model)
      return new Response(JSON.stringify({
        model,
        choices: [
          {
            message: {
              content: model === 'deepseek-v4-flash'
                ? ''
                : JSON.stringify(VALID_MODEL_OUTPUT),
            },
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 6, total_tokens: 11 },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    },
  })

  if (!result.ok) {
    throw new Error(result.error)
  }
  assert.deepEqual(attemptedModels, ['deepseek-v4-flash', 'deepseek-v4-flash', 'deepseek-v4-pro'])
  assert.equal(result.selectedProvider?.model, 'deepseek-v4-pro')
  assert.equal(result.providerFallbackFailures?.length, 1)
  assert.equal(result.providerFallbackFailures?.[0]?.model, 'deepseek-v4-flash')
  assert.equal(result.providerFallbackFailures?.[0]?.error, 'model_response_missing_content')
  assert.equal(result.proposalRequests[0].action, 'resource_transfer_to_governor')
}

async function testModelRequestsRespectConcurrencyQueue() {
  const previousMaxConcurrency = process.env.AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY
  process.env.AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY = '1'
  let inFlight = 0
  let maxInFlight = 0
  let callCount = 0
  const fetchImpl: typeof fetch = async () => {
    callCount += 1
    inFlight += 1
    maxInFlight = Math.max(maxInFlight, inFlight)
    await new Promise((resolve) => setTimeout(resolve, 15))
    inFlight -= 1
    return new Response(JSON.stringify({
      model: TARGET.model,
      choices: [
        {
          message: {
            content: JSON.stringify(VALID_MODEL_OUTPUT),
          },
        },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  try {
    const results = await Promise.all(Array.from({ length: 3 }, (_, index) => requestAiPlayerRuntimeProposalFromModel({
      target: TARGET,
      observation: { aiPlayerId: `ai_player_queue_${index}`, runtime: {} },
      fetchImpl,
    })))

    assert.equal(callCount, 3)
    assert.equal(maxInFlight, 1, 'model request queue must serialize provider fetches when max concurrency is 1')
    for (const result of results) {
      if (!result.ok) {
        throw new Error(result.error)
      }
      assert.equal(result.proposalRequests[0].source, 'llm')
    }
  } finally {
    if (previousMaxConcurrency === undefined) {
      delete process.env.AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY
    } else {
      process.env.AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY = previousMaxConcurrency
    }
  }
}

async function testModelRequestTimeoutAbortsProviderFetch() {
  const previousTimeout = process.env.AI_PLAYER_RUNTIME_MODEL_REQUEST_TIMEOUT_MS
  process.env.AI_PLAYER_RUNTIME_MODEL_REQUEST_TIMEOUT_MS = '20'
  let signalWasProvided = false
  let signalWasAborted = false
  const target: ResolvedPlannerTarget = {
    ...TARGET,
    baseUrl: 'https://timeout-contract.example/v1',
    apiKeys: ['timeout-contract-key'],
    model: 'timeout-contract-model',
  }
  const fetchImpl: typeof fetch = async (_url, init) => {
    const signal = init?.signal
    signalWasProvided = Boolean(signal)
    if (!signal) {
      throw new Error('model_fetch_missing_abort_signal')
    }
    return await new Promise<Response>((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        signalWasAborted = true
        reject(new Error('provider request aborted by timeout'))
      }, { once: true })
    })
  }

  try {
    const result = await requestAiPlayerRuntimeProposalFromModel({
      target,
      observation: { aiPlayerId: 'timeout_contract_ai', runtime: {} },
      fetchImpl,
    })

    assert.equal(result.ok ? '' : result.error, 'model_request_timeout')
    assert.equal(signalWasProvided, true, 'provider fetch must receive an abort signal')
    assert.equal(signalWasAborted, true, 'provider fetch abort signal must fire when timeout elapses')
  } finally {
    if (previousTimeout === undefined) {
      delete process.env.AI_PLAYER_RUNTIME_MODEL_REQUEST_TIMEOUT_MS
    } else {
      process.env.AI_PLAYER_RUNTIME_MODEL_REQUEST_TIMEOUT_MS = previousTimeout
    }
  }
}

async function testModelRequestQueueRejectsOverflow() {
  const previousMaxConcurrency = process.env.AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY
  const previousQueueLimit = process.env.AI_PLAYER_RUNTIME_MODEL_QUEUE_LIMIT
  process.env.AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY = '1'
  process.env.AI_PLAYER_RUNTIME_MODEL_QUEUE_LIMIT = '1'
  const releaseFirstFetch: { current?: () => void } = {}
  let firstFetchStartedResolve: (() => void) | null = null
  const firstFetchStarted = new Promise<void>((resolve) => {
    firstFetchStartedResolve = resolve
  })
  let callCount = 0
  const fetchImpl: typeof fetch = async () => {
    callCount += 1
    if (callCount === 1) {
      firstFetchStartedResolve?.()
      await new Promise<void>((resolve) => {
        releaseFirstFetch.current = resolve
      })
    }
    return new Response(JSON.stringify({
      model: TARGET.model,
      choices: [
        {
          message: {
            content: JSON.stringify(VALID_MODEL_OUTPUT),
          },
        },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  try {
    const first = requestAiPlayerRuntimeProposalFromModel({
      target: TARGET,
      observation: { aiPlayerId: 'ai_player_queue_limit_1', runtime: {} },
      fetchImpl,
    })
    await firstFetchStarted
    const second = requestAiPlayerRuntimeProposalFromModel({
      target: TARGET,
      observation: { aiPlayerId: 'ai_player_queue_limit_2', runtime: {} },
      fetchImpl,
    })
    const third = requestAiPlayerRuntimeProposalFromModel({
      target: TARGET,
      observation: { aiPlayerId: 'ai_player_queue_limit_3', runtime: {} },
      fetchImpl,
    })
    const release = releaseFirstFetch.current
    if (!release) {
      throw new Error('first queued fetch did not expose release handle')
    }
    release()

    const results = await Promise.all([first, second, third])
    const rejected = results.filter((result) => !result.ok)
    assert.equal(rejected.length, 1)
    assert.equal(rejected[0]?.ok, false)
    assert.equal(rejected[0]?.error, 'model_request_queue_full')
    assert.ok(!rejected[0]?.error.includes(TARGET.apiKeys[0]))
  } finally {
    if (previousMaxConcurrency === undefined) {
      delete process.env.AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY
    } else {
      process.env.AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY = previousMaxConcurrency
    }
    if (previousQueueLimit === undefined) {
      delete process.env.AI_PLAYER_RUNTIME_MODEL_QUEUE_LIMIT
    } else {
      process.env.AI_PLAYER_RUNTIME_MODEL_QUEUE_LIMIT = previousQueueLimit
    }
  }
}

async function testInteractiveRequestsJumpBackgroundQueue() {
  const previousMaxConcurrency = process.env.AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY
  const previousQueueLimit = process.env.AI_PLAYER_RUNTIME_MODEL_QUEUE_LIMIT
  process.env.AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY = '1'
  process.env.AI_PLAYER_RUNTIME_MODEL_QUEUE_LIMIT = '8'
  const releaseFirstFetch: { current?: () => void } = {}
  let firstFetchStartedResolve: (() => void) | null = null
  const firstFetchStarted = new Promise<void>((resolve) => {
    firstFetchStartedResolve = resolve
  })
  const startedAiPlayers: string[] = []
  const fetchImpl: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
    const messages = Array.isArray(body.messages) ? body.messages as Array<Record<string, unknown>> : []
    const userMessage = messages.find((message) => message.role === 'user')
    const content = JSON.parse(String(userMessage?.content ?? '{}')) as Record<string, unknown>
    const aiPlayerId = String(content.aiPlayerId ?? 'unknown')
    startedAiPlayers.push(aiPlayerId)
    if (aiPlayerId === 'queue_active') {
      firstFetchStartedResolve?.()
      await new Promise<void>((resolve) => {
        releaseFirstFetch.current = resolve
      })
    }
    return new Response(JSON.stringify({
      model: TARGET.model,
      choices: [
        {
          message: {
            content: JSON.stringify(VALID_MODEL_OUTPUT),
          },
        },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  try {
    const active = requestAiPlayerRuntimeProposalFromModel({
      target: TARGET,
      observation: { aiPlayerId: 'queue_active', runtime: {} },
      fetchImpl,
    })
    await firstFetchStarted
    const background = requestAiPlayerRuntimeProposalFromModel({
      target: TARGET,
      observation: {
        aiPlayerId: 'queue_background',
        runtime: {},
        requestContext: { queueLane: 'background_patrol' },
      },
      fetchImpl,
    })
    const interactive = requestAiPlayerRuntimeProposalFromModel({
      target: TARGET,
      observation: {
        aiPlayerId: 'queue_interactive',
        runtime: {},
        requestContext: { queueLane: 'interactive_chat' },
      },
      fetchImpl,
    })
    const release = releaseFirstFetch.current
    if (!release) {
      throw new Error('first queued fetch did not expose release handle')
    }
    release()
    const results = await Promise.all([active, background, interactive])
    for (const result of results) {
      if (!result.ok) {
        throw new Error(result.error)
      }
    }
    assert.deepEqual(
      startedAiPlayers,
      ['queue_active', 'queue_interactive', 'queue_background'],
      'interactive chat requests must jump queued background patrol work',
    )
    const status = getAiPlayerRuntimeModelRequestQueueStatus()
    const lanes = (status as { lanes?: Array<Record<string, unknown>> }).lanes ?? []
    const interactiveLane = lanes.find((lane) => lane.lane === 'interactive_chat')
    const backgroundLane = lanes.find((lane) => lane.lane === 'background_patrol')
    assert.ok(interactiveLane, 'queue read model must expose interactive lane stats')
    assert.ok(backgroundLane, 'queue read model must expose background patrol lane stats')
    assert.equal(typeof interactiveLane.p95WaitMs, 'number')
    assert.equal(typeof backgroundLane.p95WaitMs, 'number')
  } finally {
    if (previousMaxConcurrency === undefined) {
      delete process.env.AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY
    } else {
      process.env.AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY = previousMaxConcurrency
    }
    if (previousQueueLimit === undefined) {
      delete process.env.AI_PLAYER_RUNTIME_MODEL_QUEUE_LIMIT
    } else {
      process.env.AI_PLAYER_RUNTIME_MODEL_QUEUE_LIMIT = previousQueueLimit
    }
  }
}

async function testProviderKeyRateBucketSkipsExhaustedEndpoint() {
  const previousLimit = process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_REQUESTS
  const previousWindow = process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_WINDOW_MS
  process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_REQUESTS = '1'
  process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_WINDOW_MS = '60000'
  const target: ResolvedPlannerTarget = {
    ...TARGET,
    baseUrl: 'https://rate-bucket.example/v1',
    model: 'rate-bucket-contract-model',
    apiKeys: ['rate-bucket-contract-key'],
  }
  let callCount = 0
  try {
    const first = await requestAiPlayerRuntimeProposalFromModel({
      target,
      observation: { aiPlayerId: 'rate_bucket_ai', runtime: {} },
      fetchImpl: async () => {
        callCount += 1
        return new Response(JSON.stringify({
          model: target.model,
          choices: [{ message: { content: JSON.stringify(VALID_MODEL_OUTPUT) } }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      },
    })
    const second = await requestAiPlayerRuntimeProposalFromModel({
      target,
      observation: { aiPlayerId: 'rate_bucket_ai', runtime: {} },
      fetchImpl: async () => {
        callCount += 1
        return new Response(JSON.stringify({
          model: target.model,
          choices: [{ message: { content: JSON.stringify(VALID_MODEL_OUTPUT) } }],
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      },
    })
    if (!first.ok) {
      throw new Error(first.error)
    }
    assert.equal(second.ok, false)
    assert.equal(second.ok ? '' : second.error, 'model_provider_rate_bucket_exhausted')
    assert.equal(callCount, 1, 'rate bucket exhaustion must skip provider fetches')
    const status = getAiPlayerRuntimeModelRequestQueueStatus()
    const endpoints = (status as { endpoints?: Array<Record<string, unknown>> }).endpoints ?? []
    const endpoint = endpoints.find((item) => item.model === target.model && item.provider === 'rate-bucket.example')
    assert.ok(endpoint, 'request queue read model must expose provider/key rate bucket')
    const rateBucket = endpoint.rateBucket as Record<string, unknown>
    assert.equal(rateBucket.limit, 1)
    assert.equal(rateBucket.windowMs, 60000)
    assert.equal(rateBucket.usedRequests, 1)
    assert.equal(rateBucket.remainingRequests, 0)
    assert.match(String(rateBucket.resetAt), /^\d{4}-\d{2}-\d{2}T/)
    const p50LatencyMs = Number(endpoint.p50LatencyMs)
    const p95LatencyMs = Number(endpoint.p95LatencyMs)
    assert.equal(Number.isFinite(Number(endpoint.averageLatencyMs)), true, 'endpoint read model must expose average latency')
    assert.equal(Number.isFinite(p50LatencyMs), true, 'endpoint read model must expose p50 latency')
    assert.equal(Number.isFinite(p95LatencyMs), true, 'endpoint read model must expose p95 latency')
    assert.ok(p95LatencyMs >= p50LatencyMs)
    assert.ok(!JSON.stringify(status).includes(target.apiKeys[0]), 'rate bucket read model must not expose raw api keys')
  } finally {
    if (previousLimit === undefined) delete process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_REQUESTS
    else process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_REQUESTS = previousLimit
    if (previousWindow === undefined) delete process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_WINDOW_MS
    else process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_WINDOW_MS = previousWindow
  }
}

function testGlobalDispatchStoreLeaseLifecycle() {
  const storePath = join(process.cwd(), 'tmp', `ai_runtime_dispatch_store_contract_${process.pid}_${Date.now()}.json`)
  const storeA = createAiPlayerRuntimeModelDispatchStore({ storePath })
  const storeB = createAiPlayerRuntimeModelDispatchStore({ storePath })
  try {
    const claim = storeA.claimLease({
      leaseId: 'lease_lifecycle_contract',
      ownerId: 'worker_a',
      aiPlayerId: 'dispatch_ai',
      lane: 'interactive_chat',
      provider: 'dispatch.example',
      model: 'dispatch-model',
      keyFingerprint: 'sha256:dispatch-key',
      ttlMs: 50,
      nowMs: 1_000,
    })
    assert.equal(claim.ok, true)
    const held = storeB.claimLease({
      leaseId: 'lease_lifecycle_contract',
      ownerId: 'worker_b',
      aiPlayerId: 'dispatch_ai',
      lane: 'interactive_chat',
      provider: 'dispatch.example',
      model: 'dispatch-model',
      keyFingerprint: 'sha256:dispatch-key',
      ttlMs: 50,
      nowMs: 1_020,
    })
    assert.equal(held.ok, false)
    assert.equal(held.ok ? '' : held.error, 'dispatch_lease_held')
    const heartbeat = storeA.heartbeatLease({
      leaseId: 'lease_lifecycle_contract',
      ownerId: 'worker_a',
      ttlMs: 100,
      state: 'active',
      nowMs: 1_030,
    })
    if (!heartbeat.ok) throw new Error('heartbeat failed')
    assert.equal(heartbeat.ok, true)
    assert.equal(heartbeat.lease.state, 'active')
    assert.equal(heartbeat.lease.expiresAt, new Date(1_130).toISOString())
    const complete = storeA.completeLease({ leaseId: 'lease_lifecycle_contract', ownerId: 'worker_a', nowMs: 1_040 })
    assert.equal(complete.ok, true)
    const expired = storeA.claimLease({
      leaseId: 'lease_expired_retry_contract',
      ownerId: 'worker_a',
      aiPlayerId: 'dispatch_ai',
      lane: 'background_patrol',
      provider: 'dispatch.example',
      model: 'dispatch-model',
      keyFingerprint: 'sha256:dispatch-key',
      ttlMs: 10,
      nowMs: 2_000,
    })
    assert.equal(expired.ok, true)
    const retry = storeB.claimLease({
      leaseId: 'lease_expired_retry_contract',
      ownerId: 'worker_b',
      aiPlayerId: 'dispatch_ai',
      lane: 'background_patrol',
      provider: 'dispatch.example',
      model: 'dispatch-model',
      keyFingerprint: 'sha256:dispatch-key',
      ttlMs: 10,
      nowMs: 2_020,
    })
    if (!retry.ok) throw new Error('expired retry claim failed')
    assert.equal(retry.ok, true)
    assert.equal(retry.reclaimedExpired, true)
  } finally {
    if (existsSync(storePath)) unlinkSync(storePath)
    if (existsSync(`${storePath}.lock`)) unlinkSync(`${storePath}.lock`)
  }
}

function testGlobalDispatchStorePendingQueuePriorityMergeAndExpiredRetry() {
  const storePath = join(process.cwd(), 'tmp', `ai_runtime_dispatch_queue_contract_${process.pid}_${Date.now()}.json`)
  const storeA = createAiPlayerRuntimeModelDispatchStore({ storePath })
  const storeB = createAiPlayerRuntimeModelDispatchStore({ storePath })
  try {
    const low = storeA.enqueueJob({
      jobId: 'job_low_priority',
      leaseId: 'lease_low_priority',
      ownerId: 'worker_a',
      aiPlayerId: 'dispatch_ai_low',
      lane: 'background_patrol',
      priority: 10,
      provider: 'dispatch.example',
      model: 'dispatch-model',
      keyFingerprint: 'sha256:dispatch-key',
      ttlMs: 1_000,
      nowMs: 1_000,
      mergeKey: 'patrol:dispatch_ai_low',
    })
    assert.equal(low.ok, true)
    const high = storeA.enqueueJob({
      jobId: 'job_high_priority',
      leaseId: 'lease_high_priority',
      ownerId: 'worker_a',
      aiPlayerId: 'dispatch_ai_high',
      lane: 'interactive_chat',
      priority: 100,
      provider: 'dispatch.example',
      model: 'dispatch-model',
      keyFingerprint: 'sha256:dispatch-key',
      ttlMs: 1_000,
      nowMs: 1_010,
    })
    assert.equal(high.ok, true)
    const claimedHigh = storeB.claimNextJob({ ownerId: 'worker_b', ttlMs: 500, nowMs: 1_020 })
    if (!claimedHigh.ok) throw new Error('expected high priority job claim')
    assert.equal(claimedHigh.job.jobId, 'job_high_priority')
    assert.equal(claimedHigh.job.state, 'active')
    const completedHigh = storeB.completeJob({ jobId: 'job_high_priority', ownerId: 'worker_b', nowMs: 1_025 })
    assert.equal(completedHigh.ok, true)
    const mergedPatrol = storeB.enqueueJob({
      jobId: 'job_low_priority_duplicate',
      leaseId: 'lease_low_priority_duplicate',
      ownerId: 'worker_b',
      aiPlayerId: 'dispatch_ai_low',
      lane: 'background_patrol',
      priority: 10,
      provider: 'dispatch.example',
      model: 'dispatch-model',
      keyFingerprint: 'sha256:dispatch-key',
      ttlMs: 1_000,
      nowMs: 1_030,
      mergeKey: 'patrol:dispatch_ai_low',
    })
    assert.equal(mergedPatrol.ok, true)
    assert.equal(mergedPatrol.mergedExisting, true)
    assert.equal(mergedPatrol.job.jobId, 'job_low_priority')
    const claimedLow = storeA.claimNextJob({ ownerId: 'worker_a', ttlMs: 20, nowMs: 1_040 })
    if (!claimedLow.ok) throw new Error('expected low priority job claim')
    assert.equal(claimedLow.job.jobId, 'job_low_priority')
    const reclaimedExpired = storeB.claimNextJob({ ownerId: 'worker_b', ttlMs: 50, nowMs: 1_080 })
    if (!reclaimedExpired.ok) throw new Error('expected expired job retry')
    assert.equal(reclaimedExpired.job.jobId, 'job_low_priority')
    assert.equal(reclaimedExpired.reclaimedExpired, true)
    const completed = storeB.completeJob({ jobId: 'job_low_priority', ownerId: 'worker_b', nowMs: 1_090 })
    assert.equal(completed.ok, true)
    const throttled = storeA.enqueueJob({
      jobId: 'job_low_priority_after_complete',
      leaseId: 'lease_low_priority_after_complete',
      ownerId: 'worker_a',
      aiPlayerId: 'dispatch_ai_low',
      lane: 'background_patrol',
      priority: 10,
      provider: 'dispatch.example',
      model: 'dispatch-model',
      keyFingerprint: 'sha256:dispatch-key',
      ttlMs: 1_000,
      nowMs: 1_100,
      mergeKey: 'patrol:dispatch_ai_low',
      throttleMs: 500,
    })
    assert.equal(throttled.ok, true)
    assert.equal(throttled.throttledUntil, new Date(1_590).toISOString())
    const blockedByThrottle = storeB.claimNextJob({ ownerId: 'worker_b', ttlMs: 50, nowMs: 1_200 })
    assert.equal(blockedByThrottle.ok, false)
    assert.equal(blockedByThrottle.ok ? '' : blockedByThrottle.error, 'dispatch_queue_empty')
    const afterThrottle = storeB.claimNextJob({ ownerId: 'worker_b', ttlMs: 50, nowMs: 1_600 })
    if (!afterThrottle.ok) throw new Error('expected throttled patrol job after availableAt')
    assert.equal(afterThrottle.job.jobId, 'job_low_priority_after_complete')
  } finally {
    if (existsSync(storePath)) unlinkSync(storePath)
    if (existsSync(`${storePath}.lock`)) unlinkSync(`${storePath}.lock`)
  }
}

async function testRedisAndPostgresDispatchAdaptersExposeAtomicContracts() {
  const redisCalls: Array<{ script: string; keys: string[]; arguments: string[] }> = []
  const redisStore = createAiPlayerRuntimeModelDispatchRedisStore({
    eval: async (script, options) => {
      redisCalls.push({ script, keys: options.keys, arguments: options.arguments })
      if (options.arguments[0] === 'enqueueJob') {
        return JSON.stringify({
          ok: true,
          job: {
            jobId: 'redis_job',
            leaseId: 'redis_lease',
            ownerId: 'worker_redis',
            aiPlayerId: 'redis_ai',
            lane: 'interactive_chat',
            priority: 100,
            provider: 'redis.example',
            model: 'redis-model',
            keyFingerprint: 'sha256:redis-key',
            state: 'pending',
            enqueuedAt: new Date(1_000).toISOString(),
            availableAt: new Date(1_000).toISOString(),
            heartbeatAt: new Date(1_000).toISOString(),
            expiresAt: new Date(2_000).toISOString(),
          },
          mergedExisting: false,
        })
      }
      return JSON.stringify({
        ok: true,
        lease: {
          leaseId: 'redis_lease',
          ownerId: 'worker_redis',
          aiPlayerId: 'redis_ai',
          lane: 'interactive_chat',
          provider: 'redis.example',
          model: 'redis-model',
          keyFingerprint: 'sha256:redis-key',
          state: 'queued',
          claimedAt: new Date(1_000).toISOString(),
          heartbeatAt: new Date(1_000).toISOString(),
          expiresAt: new Date(2_000).toISOString(),
        },
        reclaimedExpired: false,
      })
    },
  }, { keyPrefix: 'ai:test' })
  const redisClaim = await redisStore.claimLease({
    leaseId: 'redis_lease',
    ownerId: 'worker_redis',
    aiPlayerId: 'redis_ai',
    lane: 'interactive_chat',
    provider: 'redis.example',
    model: 'redis-model',
    keyFingerprint: 'sha256:redis-key',
    ttlMs: 1_000,
    nowMs: 1_000,
  })
  assert.equal(redisClaim.ok, true)
  assert.ok(redisCalls[0].script.includes("'SET'"))
  assert.ok(redisCalls[0].script.includes("'NX'"))
  assert.ok(redisCalls[0].script.includes("'PX'"))
  const redisJob = await redisStore.enqueueJob({
    jobId: 'redis_job',
    leaseId: 'redis_lease',
    ownerId: 'worker_redis',
    aiPlayerId: 'redis_ai',
    lane: 'interactive_chat',
    priority: 100,
    provider: 'redis.example',
    model: 'redis-model',
    keyFingerprint: 'sha256:redis-key',
    ttlMs: 1_000,
    nowMs: 1_000,
  })
  assert.equal(redisJob.ok, true)
  assert.ok(redisCalls[1].script.includes("'ZADD'"))

  const postgresQueries: Array<{ text: string; values: readonly unknown[] | undefined }> = []
  const postgresStore = createAiPlayerRuntimeModelDispatchPostgresStore({
    query: async <T extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: readonly unknown[]) => {
      postgresQueries.push({ text, values })
      if (text.includes('ai_runtime_model_dispatch_jobs')) {
        return {
          rows: [{
            job_id: 'pg_job',
            lease_id: 'pg_lease',
            owner_id: 'worker_pg',
            ai_player_id: 'pg_ai',
            lane: 'interactive_chat',
            priority: 100,
            provider: 'pg.example',
            model: 'pg-model',
            key_fingerprint: 'sha256:pg-key',
            state: 'active',
            enqueued_at: new Date(1_000),
            available_at: new Date(1_000),
            heartbeat_at: new Date(1_000),
            expires_at: new Date(2_000),
            merge_key: null,
          } as unknown as T],
        }
      }
      return {
        rows: [{
          lease_id: 'pg_lease',
          owner_id: 'worker_pg',
          ai_player_id: 'pg_ai',
          lane: 'interactive_chat',
          provider: 'pg.example',
          model: 'pg-model',
          key_fingerprint: 'sha256:pg-key',
          state: 'queued',
          claimed_at: new Date(1_000),
          heartbeat_at: new Date(1_000),
          expires_at: new Date(2_000),
        } as unknown as T],
      }
    },
  })
  const pgClaim = await postgresStore.claimLease({
    leaseId: 'pg_lease',
    ownerId: 'worker_pg',
    aiPlayerId: 'pg_ai',
    lane: 'interactive_chat',
    provider: 'pg.example',
    model: 'pg-model',
    keyFingerprint: 'sha256:pg-key',
    ttlMs: 1_000,
    nowMs: 1_000,
  })
  assert.equal(pgClaim.ok, true)
  assert.match(postgresQueries[0].text, /ON CONFLICT/i)
  assert.match(postgresQueries[0].text, /WHERE\s+ai_runtime_model_dispatch_leases\.state IN \('queued', 'active', 'expired'\)/i)
  assert.match(postgresQueries[0].text, /AND\s+ai_runtime_model_dispatch_leases\.expires_at <=/i)
  assert.doesNotMatch(postgresQueries[0].text, /state NOT IN \('queued', 'active'\)/i)
  const pgJob = await postgresStore.claimNextJob({ ownerId: 'worker_pg', ttlMs: 1_000, nowMs: 1_000 })
  assert.equal(pgJob.ok, true)
  if (!pgJob.ok) throw new Error('expected postgres queue job claim')
  assert.equal(pgJob.job.jobId, 'pg_job')
  assert.match(postgresQueries[1].text, /FOR UPDATE SKIP LOCKED/i)
}

async function testRuntimeRequestsUseSharedDispatchRateBucketStore() {
  const previousPath = process.env.AI_PLAYER_RUNTIME_MODEL_DISPATCH_STORE_PATH
  const previousLimit = process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_REQUESTS
  const previousWindow = process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_WINDOW_MS
  const storePath = join(process.cwd(), 'tmp', `ai_runtime_dispatch_rate_bucket_${process.pid}_${Date.now()}.json`)
  process.env.AI_PLAYER_RUNTIME_MODEL_DISPATCH_STORE_PATH = storePath
  process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_REQUESTS = '1'
  process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_WINDOW_MS = '60000'
  resetAiPlayerRuntimeModelDispatchStoreForTest()
  const target: ResolvedPlannerTarget = {
    ...TARGET,
    baseUrl: 'https://shared-rate-bucket.example/v1',
    model: 'shared-rate-bucket-contract-model',
    apiKeys: ['shared-rate-bucket-contract-key'],
  }
  let callCount = 0
  try {
    const first = await requestAiPlayerRuntimeProposalFromModel({
      target,
      observation: { aiPlayerId: 'shared_rate_bucket_ai', runtime: {} },
      fetchImpl: async () => {
        callCount += 1
        return new Response(JSON.stringify({
          model: target.model,
          choices: [{ message: { content: JSON.stringify(VALID_MODEL_OUTPUT) } }],
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      },
    })
    const second = await requestAiPlayerRuntimeProposalFromModel({
      target,
      observation: { aiPlayerId: 'shared_rate_bucket_ai', runtime: {} },
      fetchImpl: async () => {
        callCount += 1
        return new Response(JSON.stringify({
          model: target.model,
          choices: [{ message: { content: JSON.stringify(VALID_MODEL_OUTPUT) } }],
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      },
    })
    if (!first.ok) throw new Error(first.error)
    assert.equal(second.ok, false)
    assert.equal(second.ok ? '' : second.error, 'model_provider_rate_bucket_exhausted')
    assert.equal(callCount, 1)
    const status = getAiPlayerRuntimeModelRequestQueueStatus()
    const endpoint = ((status as { endpoints?: Array<Record<string, unknown>> }).endpoints ?? [])
      .find((item) => item.model === target.model && item.provider === 'shared-rate-bucket.example')
    assert.ok(endpoint)
    assert.equal((endpoint.rateBucket as Record<string, unknown>).usedRequests, 1)
    assert.ok(!JSON.stringify(status).includes(target.apiKeys[0]))
  } finally {
    if (previousPath === undefined) delete process.env.AI_PLAYER_RUNTIME_MODEL_DISPATCH_STORE_PATH
    else process.env.AI_PLAYER_RUNTIME_MODEL_DISPATCH_STORE_PATH = previousPath
    if (previousLimit === undefined) delete process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_REQUESTS
    else process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_REQUESTS = previousLimit
    if (previousWindow === undefined) delete process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_WINDOW_MS
    else process.env.AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_WINDOW_MS = previousWindow
    resetAiPlayerRuntimeModelDispatchStoreForTest()
    if (existsSync(storePath)) unlinkSync(storePath)
    if (existsSync(`${storePath}.lock`)) unlinkSync(`${storePath}.lock`)
  }
}

async function testRuntimeRequestsPersistDispatchQueueJobLifecycle() {
  const previousPath = process.env.AI_PLAYER_RUNTIME_MODEL_DISPATCH_STORE_PATH
  const storePath = join(process.cwd(), 'tmp', `ai_runtime_dispatch_job_lifecycle_${process.pid}_${Date.now()}.json`)
  process.env.AI_PLAYER_RUNTIME_MODEL_DISPATCH_STORE_PATH = storePath
  resetAiPlayerRuntimeModelDispatchStoreForTest()
  const target: ResolvedPlannerTarget = {
    ...TARGET,
    baseUrl: 'https://shared-dispatch-job.example/v1',
    model: 'shared-dispatch-job-contract-model',
    apiKeys: ['shared-dispatch-job-contract-key'],
  }
  try {
    const result = await requestAiPlayerRuntimeProposalFromModel({
      target,
      observation: {
        aiPlayerId: 'shared_dispatch_job_ai',
        runtime: {},
        requestContext: { queueLane: 'interactive_chat', queuePriority: 100 },
      },
      fetchImpl: async () => new Response(JSON.stringify({
        model: target.model,
        choices: [{ message: { content: JSON.stringify(VALID_MODEL_OUTPUT) } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } }),
    })
    if (!result.ok) throw new Error(result.error)
    const snapshot = createAiPlayerRuntimeModelDispatchStore({ storePath }).snapshot()
    const job = snapshot.queueJobs.find((item) => (
      item.aiPlayerId === 'shared_dispatch_job_ai'
      && item.model === target.model
      && item.provider === 'shared-dispatch-job.example'
    ))
    assert.ok(job, 'runtime request must persist a dispatch queue job')
    assert.equal(job.state, 'completed')
    assert.equal(job.lane, 'interactive_chat')
    assert.equal(job.priority, 100)
  } finally {
    if (previousPath === undefined) delete process.env.AI_PLAYER_RUNTIME_MODEL_DISPATCH_STORE_PATH
    else process.env.AI_PLAYER_RUNTIME_MODEL_DISPATCH_STORE_PATH = previousPath
    resetAiPlayerRuntimeModelDispatchStoreForTest()
    if (existsSync(storePath)) unlinkSync(storePath)
    if (existsSync(`${storePath}.lock`)) unlinkSync(`${storePath}.lock`)
  }
}

async function testRateLimitBackoffSkipsHotKeyAndReadModel() {
  const target: ResolvedPlannerTarget = {
    ...TARGET,
    baseUrl: 'https://rate-limit.example/v1',
    model: 'rate-limit-contract-model',
    apiKeys: ['rate-limit-contract-key'],
  }
  let callCount = 0
  const first = await requestAiPlayerRuntimeProposalFromModel({
    target,
    observation: { aiPlayerId: 'rate_limit_ai', runtime: {} },
    fetchImpl: async () => {
      callCount += 1
      return new Response(JSON.stringify({ error: 'rate limited' }), {
        status: 429,
        headers: {
          'content-type': 'application/json',
          'retry-after': '60',
        },
      })
    },
  })
  assert.equal(first.ok, false)
  assert.equal(first.ok ? '' : first.error, 'model_request_failed_429')

  const second = await requestAiPlayerRuntimeProposalFromModel({
    target,
    observation: { aiPlayerId: 'rate_limit_ai', runtime: {} },
    fetchImpl: async () => {
      callCount += 1
      return new Response(JSON.stringify({
        model: target.model,
        choices: [{ message: { content: JSON.stringify(VALID_MODEL_OUTPUT) } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    },
  })
  assert.equal(second.ok, false)
  assert.equal(second.ok ? '' : second.error, 'model_provider_backoff_active')
  assert.equal(callCount, 1, 'backoff must skip the hot provider key without calling fetch again')

  const status = getAiPlayerRuntimeModelRequestQueueStatus()
  const endpoints = Array.isArray((status as { endpoints?: unknown[] }).endpoints)
    ? (status as { endpoints: Array<Record<string, unknown>> }).endpoints
    : []
  const endpoint = endpoints.find((item) => item.model === target.model && item.provider === 'rate-limit.example')
  assert.ok(endpoint, 'request queue read model must expose provider/model/key backoff state')
  assert.equal(endpoint.circuitState, 'open')
  assert.equal(endpoint.totalRateLimitedRequests, 1)
  assert.match(String(endpoint.keyFingerprint), /^sha256:/)
  assert.ok(!JSON.stringify(status).includes(target.apiKeys[0]), 'request queue read model must not expose raw api keys')
}

async function testRepeatedServerErrorsOpenCircuitBreaker() {
  const previousThreshold = process.env.AI_PLAYER_RUNTIME_MODEL_CIRCUIT_FAILURE_THRESHOLD
  const previousBackoff = process.env.AI_PLAYER_RUNTIME_MODEL_CIRCUIT_BACKOFF_MS
  process.env.AI_PLAYER_RUNTIME_MODEL_CIRCUIT_FAILURE_THRESHOLD = '2'
  process.env.AI_PLAYER_RUNTIME_MODEL_CIRCUIT_BACKOFF_MS = '60000'
  const target: ResolvedPlannerTarget = {
    ...TARGET,
    baseUrl: 'https://circuit-breaker.example/v1',
    model: 'circuit-breaker-contract-model',
    apiKeys: ['circuit-breaker-contract-key'],
  }
  let callCount = 0
  const failingFetch: typeof fetch = async () => {
    callCount += 1
    return new Response(JSON.stringify({ error: 'provider unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    })
  }
  try {
    const first = await requestAiPlayerRuntimeProposalFromModel({
      target,
      observation: { aiPlayerId: 'circuit_breaker_ai', runtime: {} },
      fetchImpl: failingFetch,
    })
    const second = await requestAiPlayerRuntimeProposalFromModel({
      target,
      observation: { aiPlayerId: 'circuit_breaker_ai', runtime: {} },
      fetchImpl: failingFetch,
    })
    const third = await requestAiPlayerRuntimeProposalFromModel({
      target,
      observation: { aiPlayerId: 'circuit_breaker_ai', runtime: {} },
      fetchImpl: async () => {
        callCount += 1
        return new Response(JSON.stringify({
          model: target.model,
          choices: [{ message: { content: JSON.stringify(VALID_MODEL_OUTPUT) } }],
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      },
    })
    assert.equal(first.ok ? '' : first.error, 'model_request_failed_503')
    assert.equal(second.ok ? '' : second.error, 'model_request_failed_503')
    assert.equal(third.ok ? '' : third.error, 'model_provider_backoff_active')
    assert.equal(callCount, 2, 'open circuit must skip provider fetches until backoff expires')
    const status = getAiPlayerRuntimeModelRequestQueueStatus()
    const endpoints = (status as { endpoints?: Array<Record<string, unknown>> }).endpoints ?? []
    const endpoint = endpoints.find((item) => item.model === target.model && item.provider === 'circuit-breaker.example')
    assert.ok(endpoint, 'request queue read model must expose circuit breaker state')
    assert.equal(endpoint.circuitState, 'open')
    assert.equal(endpoint.totalFailedRequests, 2)
    assert.equal(endpoint.consecutiveFailures, 2)
    assert.ok(!JSON.stringify(status).includes(target.apiKeys[0]), 'circuit breaker read model must not expose raw api keys')
  } finally {
    if (previousThreshold === undefined) delete process.env.AI_PLAYER_RUNTIME_MODEL_CIRCUIT_FAILURE_THRESHOLD
    else process.env.AI_PLAYER_RUNTIME_MODEL_CIRCUIT_FAILURE_THRESHOLD = previousThreshold
    if (previousBackoff === undefined) delete process.env.AI_PLAYER_RUNTIME_MODEL_CIRCUIT_BACKOFF_MS
    else process.env.AI_PLAYER_RUNTIME_MODEL_CIRCUIT_BACKOFF_MS = previousBackoff
  }
}

async function testJsonParseFailureRetriesWithRawJsonCorrection() {
  let callCount = 0
  let retryBody: Record<string, unknown> = {}
  const result = await requestAiPlayerRuntimeProposalFromModel({
    target: TARGET,
    observation: { aiPlayerId: 'ai_player_alpha', runtime: {} },
    fetchImpl: async (_url, init) => {
      callCount += 1
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
      if (callCount === 2) {
        retryBody = body
      }
      const content = callCount === 1
        ? `\`\`\`json\n${JSON.stringify(VALID_MODEL_OUTPUT)}\n\`\`\``
        : JSON.stringify(VALID_MODEL_OUTPUT)
      return new Response(JSON.stringify({
        model: TARGET.model,
        choices: [
          {
            message: {
              content,
            },
          },
        ],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    },
  })

  if (!result.ok) {
    throw new Error(result.error)
  }
  assert.equal(callCount, 2, 'markdown-fenced model output should trigger one raw JSON correction retry')
  assert.ok(JSON.stringify(retryBody).includes('not raw JSON'))
  assert.equal(result.proposalRequests[0].action, 'resource_transfer_to_governor')
}

async function testRetryCanNormalizeCompleteMarkdownFenceAfterCorrection() {
  let callCount = 0
  const result = await requestAiPlayerRuntimeProposalFromModel({
    target: TARGET,
    observation: { aiPlayerId: 'ai_player_alpha', runtime: {} },
    fetchImpl: async () => {
      callCount += 1
      return new Response(JSON.stringify({
        model: TARGET.model,
        choices: [
          {
            message: {
              content: `\`\`\`json\n${JSON.stringify(VALID_MODEL_OUTPUT)}\n\`\`\``,
            },
          },
        ],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    },
  })

  if (!result.ok) {
    throw new Error(result.error)
  }
  assert.equal(callCount, 3)
  assert.equal(result.normalization, 'markdown_fence_after_retry')
  assert.equal(result.proposalRequests[0].action, 'resource_transfer_to_governor')
}

async function testFinalCorrectionCanRecoverStrictRawJson() {
  let callCount = 0
  const result = await requestAiPlayerRuntimeProposalFromModel({
    target: TARGET,
    observation: { aiPlayerId: 'ai_player_alpha', runtime: {} },
    fetchImpl: async () => {
      callCount += 1
      const content = callCount < 3
        ? `\`\`\`json\n${JSON.stringify(VALID_MODEL_OUTPUT)}\n\`\`\``
        : JSON.stringify(VALID_MODEL_OUTPUT)
      return new Response(JSON.stringify({
        model: TARGET.model,
        choices: [
          {
            message: {
              content,
            },
          },
        ],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    },
  })

  if (!result.ok) {
    throw new Error(result.error)
  }
  assert.equal(callCount, 3)
  assert.equal(result.normalization, undefined)
  assert.equal(result.proposalRequests[0].action, 'resource_transfer_to_governor')
}

async function testMissingContentRetriesWithExplicitCorrection() {
  let callCount = 0
  let retryBody: Record<string, unknown> = {}
  const result = await requestAiPlayerRuntimeProposalFromModel({
    target: TARGET,
    observation: { aiPlayerId: 'ai_player_alpha', runtime: {} },
    fetchImpl: async (_url, init) => {
      callCount += 1
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
      if (callCount === 2) {
        retryBody = body
      }
      const content = callCount === 1 ? '' : JSON.stringify(VALID_MODEL_OUTPUT)
      return new Response(JSON.stringify({
        model: TARGET.model,
        choices: [
          {
            message: {
              content,
            },
          },
        ],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    },
  })

  if (!result.ok) {
    throw new Error(result.error)
  }
  assert.equal(callCount, 2, 'empty provider content should trigger one strict JSON correction retry')
  assert.ok(JSON.stringify(retryBody).includes('empty content'))
  assert.equal(result.proposalRequests[0].action, 'resource_transfer_to_governor')
}

async function run() {
  testStrictJsonParserAndRequestConversion()
  testParserRejectsNonContractOutput()
  testContextDocumentsAreInjectedIntoSystemPrompt()
  await testOpenAiCompatRequestUsesJsonOnlyBoundary()
  await testDeepSeekV4JsonProposalDisablesThinkingMode()
  await testModelErrorsDoNotExposeSecrets()
  await testAuthFailuresTryNextKeyWithoutSecretLeak()
  await testCandidateFallbackUsesProAfterFlashMissingContent()
  await testModelRequestsRespectConcurrencyQueue()
  await testModelRequestTimeoutAbortsProviderFetch()
  await testModelRequestQueueRejectsOverflow()
  await testInteractiveRequestsJumpBackgroundQueue()
  await testProviderKeyRateBucketSkipsExhaustedEndpoint()
  testGlobalDispatchStoreLeaseLifecycle()
  testGlobalDispatchStorePendingQueuePriorityMergeAndExpiredRetry()
  await testRedisAndPostgresDispatchAdaptersExposeAtomicContracts()
  await testRuntimeRequestsUseSharedDispatchRateBucketStore()
  await testRuntimeRequestsPersistDispatchQueueJobLifecycle()
  await testRateLimitBackoffSkipsHotKeyAndReadModel()
  await testRepeatedServerErrorsOpenCircuitBreaker()
  await testJsonParseFailureRetriesWithRawJsonCorrection()
  await testRetryCanNormalizeCompleteMarkdownFenceAfterCorrection()
  await testFinalCorrectionCanRecoverStrictRawJson()
  await testMissingContentRetriesWithExplicitCorrection()
  console.log('[ai_player_runtime_model_proposal_contract] all checks passed')
}

run().catch((error) => {
  console.error('[ai_player_runtime_model_proposal_contract] failed:', error)
  process.exitCode = 1
})
