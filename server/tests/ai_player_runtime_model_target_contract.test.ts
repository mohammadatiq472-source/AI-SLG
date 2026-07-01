import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  clearAiPlayerRuntimeModelFallbackReason,
  DEFAULT_AI_PLAYER_PROPOSAL_MODEL,
  DEFAULT_AI_PLAYER_RUNTIME_MODEL,
  readAiPlayerRuntimeModelSecretSources,
  recordAiPlayerRuntimeModelFallbackReason,
  resolveAiPlayerRuntimeModelStatus,
  resolveAiPlayerRuntimeModelTarget,
  resolveAiPlayerRuntimeModelTargetCandidates,
} from '../src/application/ai/aiPlayerRuntimeModelTarget'
import {
  getAiPlayerRuntimeModelRequestQueueStatusAsync,
  requestAiPlayerRuntimeProposalFromCandidateTargets,
  requestAiPlayerRuntimeProposalFromModel,
  resetAiPlayerRuntimeModelDispatchStoreForTest,
} from '../src/application/ai/aiPlayerRuntimeProposalModel'
import {
  estimateAiPlayerRuntimeProposalTokensByProviderModelProfile,
  estimateAiPlayerRuntimeProposalTokensByMessageHeuristic,
  estimateAiPlayerRuntimeTextTokensForPreflight,
  estimateDeepSeekRuntimeTextTokensForPreflight,
  resolveAiPlayerRuntimeProposalTokenizerProfile,
} from '../src/application/ai/aiPlayerRuntimeProposalTokenEstimator'
import { clearFactionConfig, setFactionModelConfig } from '../src/application/faction/FactionConfigStore'

const MANAGED_ENV = [
  'AI_PLAYER_RUNTIME_MODEL_API_KEY',
  'AI_PLAYER_RUNTIME_MODEL_BASE_URL',
  'AI_PLAYER_RUNTIME_MODEL',
  'LLM_RELAY_API_KEY',
  'LLM_RELAY_API_KEYS',
  'LLM_RELAY_URL',
  'LLM_RELAY_MODEL',
  'OPENAI_API_KEY',
] as const

function snapshotEnv() {
  const snapshot = new Map<string, string | undefined>()
  for (const name of MANAGED_ENV) {
    snapshot.set(name, process.env[name])
    delete process.env[name]
  }
  return snapshot
}

function restoreEnv(snapshot: Map<string, string | undefined>) {
  for (const [name, value] of snapshot.entries()) {
    if (value === undefined) {
      delete process.env[name]
    } else {
      process.env[name] = value
    }
  }
}

function clearManagedEnv() {
  for (const name of MANAGED_ENV) {
    delete process.env[name]
  }
}

function testStrictJsonModelIsDefault() {
  clearManagedEnv()
  const target = resolveAiPlayerRuntimeModelTarget()
  const status = resolveAiPlayerRuntimeModelStatus()
  assert.equal(target.baseUrl, 'https://api.deepseek.com/v1')
  assert.equal(target.model, DEFAULT_AI_PLAYER_RUNTIME_MODEL)
  assert.equal(DEFAULT_AI_PLAYER_RUNTIME_MODEL, 'deepseek-v4-flash')
  assert.deepEqual(target.apiKeys, [])
  assert.deepEqual(readAiPlayerRuntimeModelSecretSources(), [])
  assert.equal(status.activeModel, DEFAULT_AI_PLAYER_RUNTIME_MODEL)
  assert.equal(status.activeProvider, 'api.deepseek.com')
  assert.equal(status.source, 'default')
  assert.equal(status.strictJsonOnlyCapable, true)
  assert.equal(status.budgetTier, 'strict_action')
  assert.equal(status.fallbackEnabled, false)
  assert.equal(status.fallbackModel, null)
  assert.equal(status.lastFallbackReason, null)
  assert.equal(status.secretConfigured, false)
  assert.equal(status.secretSource, null)
  assert.equal(status.byokSource, 'none')
  assert.equal(status.targetCount, 1)
  assert.equal(status.candidateTargets.length, 1)
  assert.deepEqual(status.candidateTargets[0], {
    model: DEFAULT_AI_PLAYER_RUNTIME_MODEL,
    provider: 'api.deepseek.com',
    source: 'default',
    byokSource: 'none',
    priority: 0,
    isActive: true,
    fallbackCandidate: false,
    strictJsonOnlyCapable: true,
    budgetTier: 'strict_action',
    lastFailureReason: null,
    secretConfigured: false,
    secretSource: null,
  })
}

function testLiveAutonomousPlannerGateUsesCentralRuntimeModelDefault() {
  const source = readFileSync('server/src/evals/runAiPlayerLiveAutonomousDevelopmentPlannerGate.ts', 'utf-8')
  assert.match(
    source,
    /import\s*\{\s*DEFAULT_AI_PLAYER_RUNTIME_MODEL\s*\}\s*from\s*'\.\.\/application\/ai\/aiPlayerRuntimeModelTarget'/,
    'live autonomous planner gate should import the central runtime model default',
  )
  assert.match(
    source,
    /process\.env\.AI_PLAYER_RUNTIME_MODEL\?\.trim\(\)\s*\|\|\s*DEFAULT_AI_PLAYER_RUNTIME_MODEL/,
    'live autonomous planner gate should fall back to DEFAULT_AI_PLAYER_RUNTIME_MODEL',
  )
  assert.equal(source.includes("|| 'deepseek-chat'"), false, 'live autonomous planner gate must not hard-code deepseek-chat as fallback')
}

function testRuntimeModelDispatchSharedStoreSmokeUsesCentralRuntimeModelDefault() {
  const source = readFileSync('server/src/evals/runAiRuntimeModelDispatchSharedStoreSmoke.ts', 'utf-8')
  assert.match(
    source,
    /DEFAULT_AI_PLAYER_RUNTIME_MODEL/,
    'runtime model dispatch shared-store smoke should reference the central runtime model default',
  )
  assert.match(
    source,
    /process\.env\[RUNTIME_MODEL_NAME_ENV\]\?\.trim\(\)\s*\|\|\s*process\.env\.LLM_RELAY_MODEL\?\.trim\(\)\s*\|\|\s*DEFAULT_AI_PLAYER_RUNTIME_MODEL/,
    'runtime model dispatch shared-store smoke should fall back to DEFAULT_AI_PLAYER_RUNTIME_MODEL',
  )
  assert.equal(source.includes("|| 'deepseek-chat'"), false, 'runtime model dispatch shared-store smoke must not hard-code deepseek-chat as fallback')
}

function testEnvOverrideKeepsMultiProviderEscapeHatch() {
  clearManagedEnv()
  process.env.AI_PLAYER_RUNTIME_MODEL_BASE_URL = 'https://provider-a.example'
  process.env.AI_PLAYER_RUNTIME_MODEL = 'provider-a/strict-json-model'
  process.env.LLM_RELAY_URL = 'https://provider-b.example'
  process.env.LLM_RELAY_MODEL = 'provider-b/economy-model'
  process.env.LLM_RELAY_API_KEYS = 'test-key-a test-key-b'

  const target = resolveAiPlayerRuntimeModelTarget()
  const status = resolveAiPlayerRuntimeModelStatus()
  assert.equal(target.baseUrl, 'https://provider-a.example/v1')
  assert.equal(target.model, 'provider-a/strict-json-model')
  assert.deepEqual(target.apiKeys, ['test-key-a', 'test-key-b'])
  assert.deepEqual(readAiPlayerRuntimeModelSecretSources(), ['LLM_RELAY_API_KEYS'])
  assert.equal(status.activeModel, 'provider-a/strict-json-model')
  assert.equal(status.activeProvider, 'provider-a.example')
  assert.equal(status.source, 'env')
  assert.equal(status.strictJsonOnlyCapable, true)
  assert.equal(status.budgetTier, 'strict_action')
  assert.equal(status.fallbackEnabled, true)
  assert.equal(status.fallbackModel, 'provider-b/economy-model')
  assert.equal(status.secretConfigured, true)
  assert.equal(status.secretSource, 'LLM_RELAY_API_KEYS')
  assert.equal(status.byokSource, 'none')
  assert.equal(status.targetCount, 3)
  assert.equal(status.candidateTargets[0].model, 'provider-a/strict-json-model')
  assert.equal(status.candidateTargets[0].provider, 'provider-a.example')
  assert.equal(status.candidateTargets[0].isActive, true)
  assert.equal(status.candidateTargets[1].model, 'provider-b/economy-model')
  assert.equal(status.candidateTargets[1].provider, 'provider-b.example')
  assert.equal(status.candidateTargets[1].fallbackCandidate, true)
  assert.equal(status.candidateTargets[2].model, DEFAULT_AI_PLAYER_RUNTIME_MODEL)
}

function testDeepSeekFlashEnvAddsProProposalFallbackWithSameSecret() {
  clearManagedEnv()
  process.env.AI_PLAYER_RUNTIME_MODEL_API_KEY = 'deepseek-env-key-fixture'
  process.env.AI_PLAYER_RUNTIME_MODEL = DEFAULT_AI_PLAYER_RUNTIME_MODEL

  const candidates = resolveAiPlayerRuntimeModelTargetCandidates()
  const status = resolveAiPlayerRuntimeModelStatus()

  assert.equal(DEFAULT_AI_PLAYER_PROPOSAL_MODEL, 'deepseek-v4-pro')
  assert.equal(candidates.length, 2)
  assert.equal(candidates[0].target.model, DEFAULT_AI_PLAYER_RUNTIME_MODEL)
  assert.equal(candidates[0].target.baseUrl, 'https://api.deepseek.com/v1')
  assert.deepEqual(candidates[0].target.apiKeys, ['deepseek-env-key-fixture'])
  assert.equal(candidates[1].target.model, DEFAULT_AI_PLAYER_PROPOSAL_MODEL)
  assert.equal(candidates[1].target.baseUrl, 'https://api.deepseek.com/v1')
  assert.deepEqual(candidates[1].target.apiKeys, ['deepseek-env-key-fixture'])
  assert.equal(candidates[1].secretSource, 'AI_PLAYER_RUNTIME_MODEL_API_KEY')
  assert.equal(status.fallbackEnabled, true)
  assert.equal(status.fallbackModel, DEFAULT_AI_PLAYER_PROPOSAL_MODEL)
  assert.equal(status.targetCount, 2)
  assert.equal(status.candidateTargets[1].fallbackCandidate, true)
  assert.equal(status.candidateTargets[1].strictJsonOnlyCapable, true)
  assert.equal(status.candidateTargets[1].secretConfigured, true)
  assert.equal(JSON.stringify(status).includes('deepseek-env-key-fixture'), false)
}

function testEconomyModelAndDisabledBudget() {
  clearManagedEnv()
  process.env.LLM_RELAY_MODEL = 'claude-haiku-4-5-20251001'

  const economyStatus = resolveAiPlayerRuntimeModelStatus()
  assert.equal(economyStatus.activeModel, 'claude-haiku-4-5-20251001')
  assert.equal(economyStatus.source, 'env')
  assert.equal(economyStatus.strictJsonOnlyCapable, false)
  assert.equal(economyStatus.budgetTier, 'economy_chat')
  assert.equal(economyStatus.fallbackModel, DEFAULT_AI_PLAYER_RUNTIME_MODEL)
  assert.equal(economyStatus.targetCount, 2)

  const disabledStatus = resolveAiPlayerRuntimeModelStatus({ allowLlmProposals: false })
  assert.equal(disabledStatus.budgetTier, 'disabled')
  assert.equal(disabledStatus.fallbackEnabled, false)
}

function testFactionByokOverridesEnvWithoutLeakingSecret() {
  clearManagedEnv()
  const factionId = 'runtime_model_target_byok_contract'
  const byokFixture = 'faction-byok-runtime-model-target-fixture'
  const envFixture = 'env-runtime-model-target-fixture'
  process.env.AI_PLAYER_RUNTIME_MODEL = 'env/strict-json-model'
  process.env.AI_PLAYER_RUNTIME_MODEL_BASE_URL = 'https://env-provider.example'
  process.env['AI_PLAYER_RUNTIME_MODEL_' + 'API_KEY'] = envFixture
  setFactionModelConfig(factionId, {
    model: 'faction/base-model',
    commanderModel: 'faction/strict-json-model',
    baseUrl: 'https://faction-provider.example',
    apiKey: byokFixture,
  })

  try {
    const target = resolveAiPlayerRuntimeModelTarget({ factionId })
    const status = resolveAiPlayerRuntimeModelStatus({ factionId })
    assert.equal(target.baseUrl, 'https://faction-provider.example/v1')
    assert.equal(target.model, 'faction/strict-json-model')
    assert.deepEqual(target.apiKeys, [byokFixture])
    assert.equal(status.activeModel, 'faction/strict-json-model')
    assert.equal(status.activeProvider, 'faction-provider.example')
    assert.equal(status.source, 'faction_config')
    assert.equal(status.secretConfigured, true)
    assert.equal(status.secretSource, 'faction_config:byok')
    assert.equal(status.byokSource, 'faction_config')
    assert.equal(status.targetCount, 3)
    assert.equal(status.candidateTargets[0].source, 'faction_config')
    assert.equal(status.candidateTargets[0].byokSource, 'faction_config')
    assert.equal(status.candidateTargets[1].source, 'env')
    assert.equal(status.candidateTargets[1].byokSource, 'none')
    assert.equal(status.candidateTargets[2].source, 'default')
    assert.equal(status.fallbackEnabled, true)
    assert.equal(status.fallbackModel, 'env/strict-json-model')
    assert.equal(JSON.stringify(status).includes(byokFixture), false)
  } finally {
    clearFactionConfig(factionId)
  }
}

function testFallbackReasonIsStoredOnRuntimeStatus() {
  clearManagedEnv()
  const factionId = 'runtime_model_target_fallback_reason_contract'
  try {
    recordAiPlayerRuntimeModelFallbackReason(factionId, 'model_request_failed_401')
    const status = resolveAiPlayerRuntimeModelStatus({ factionId })
    const candidates = resolveAiPlayerRuntimeModelTargetCandidates({ factionId })
    assert.equal(status.lastFallbackReason, 'model_request_failed_401')
    assert.equal(status.candidateTargets[0].lastFailureReason, 'model_request_failed_401')
    assert.equal(candidates[0].lastFailureReason, 'model_request_failed_401')

    const explicit = resolveAiPlayerRuntimeModelStatus({
      factionId,
      lastFallbackReason: 'model_response_missing_content',
    })
    assert.equal(explicit.lastFallbackReason, 'model_response_missing_content')
    assert.equal(explicit.candidateTargets[0].lastFailureReason, 'model_response_missing_content')
  } finally {
    clearAiPlayerRuntimeModelFallbackReason(factionId)
  }
}

async function testRuntimeProposalDispatchFallsBackAcrossIndependentProviderKeys() {
  resetAiPlayerRuntimeModelDispatchStoreForTest()
  const calls: string[] = []
  const target = {
    source: 'gateway' as const,
    label: 'provider account pool contract',
    protocol: 'openai_compat' as const,
    baseUrl: 'https://provider-account-pool.example/v1',
    apiKeys: ['provider-account-pool-fixture-a', 'provider-account-pool-fixture-b'],
    model: 'provider-account-pool-model',
  }
  const fetchImpl = async (_url: string | URL | Request, init?: RequestInit) => {
    const authorization = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '')
    calls.push(authorization)
    if (calls.length === 1) {
      return new Response(JSON.stringify({ error: 'rate limited fixture' }), { status: 429 })
    }
    return new Response(JSON.stringify({
      model: target.model,
      choices: [{
        message: {
          content: JSON.stringify({
            summary: 'fallback key succeeded',
            proposals: [{
              action: 'reward_claim',
              args: {},
              reason: '资源：存在可领取奖励；目标：领取奖励；风险：需要人工批准；批准后结果：后端执行领取。',
            }],
            deferReason: '',
            needsHumanReview: false,
          }),
        },
      }],
      usage: {
        prompt_tokens: 5,
        completion_tokens: 7,
        total_tokens: 12,
      },
    }), { status: 200 })
  }

  const result = await requestAiPlayerRuntimeProposalFromModel({
    target,
    observation: {
      aiPlayerId: 'provider_account_pool_ai',
      runtime: {},
      requestContext: {
        queueLane: 'interactive_chat',
        queuePriority: 100,
      },
    },
    fetchImpl: fetchImpl as typeof fetch,
  })

  assert.equal(result.ok, true)
  if (!result.ok) throw new Error('expected provider account pool fallback to succeed')
  assert.equal(calls.length, 2)
  assert.notEqual(calls[0], calls[1])
  assert.match(String(result.providerKeyFingerprint), /^sha256:/)
  assert.equal(JSON.stringify(result).includes('provider-account-pool-fixture-a'), false)
  assert.equal(JSON.stringify(result).includes('provider-account-pool-fixture-b'), false)

  const queue = await getAiPlayerRuntimeModelRequestQueueStatusAsync()
  const endpoints = queue.endpoints.filter((endpoint) => endpoint.model === target.model)
  assert.equal(endpoints.length, 2)
  assert.equal(endpoints.some((endpoint) => endpoint.totalRateLimitedRequests === 1 && endpoint.circuitState === 'open'), true)
  assert.equal(endpoints.some((endpoint) => endpoint.totalCompletedRequests === 1 && endpoint.circuitState === 'closed'), true)
  assert.equal(JSON.stringify(queue).includes('provider-account-pool-fixture-a'), false)
  assert.equal(JSON.stringify(queue).includes('provider-account-pool-fixture-b'), false)
}

async function testRuntimeProposalPreflightUsesInjectedTokenEstimator() {
  resetAiPlayerRuntimeModelDispatchStoreForTest()
  const target = {
    source: 'gateway' as const,
    label: 'preflight token estimator contract',
    protocol: 'openai_compat' as const,
    baseUrl: 'https://provider-account-pool.example/v1',
    apiKeys: ['preflight-token-estimator-fixture'],
    model: 'preflight-token-estimator-model',
  }
  let reservedUsage: unknown = null
  let reservedStrategy: unknown = null
  const result = await requestAiPlayerRuntimeProposalFromCandidateTargets({
    candidates: [{
      target,
      source: 'env',
      byokSource: 'none',
      priority: 10,
      secretSource: 'AI_PLAYER_RUNTIME_MODEL_API_KEY',
      lastFailureReason: null,
    }],
    observation: {
      aiPlayerId: 'preflight_token_estimator_ai',
      runtime: {
        resources: {
          wood: 88,
        },
      },
      chatCommand: {
        text: '把木材转给总督',
      },
    },
    fetchImpl: (async () => new Response(JSON.stringify({
      model: target.model,
      choices: [{
        message: {
          content: JSON.stringify({
            summary: 'custom estimator succeeded',
            proposals: [{
              action: 'resource_transfer_to_governor',
              args: {
                resources: {
                  wood: 88,
                },
              },
              reason: '资源：AI 子账户木材 88 可输送；目标：转入总督收件箱；风险：需要人工批准；批准后结果：后端执行资源输送。',
            }],
            deferReason: '',
            needsHumanReview: false,
          }),
        },
      }],
      usage: {
        prompt_tokens: 11,
        completion_tokens: 13,
        total_tokens: 24,
      },
    }), { status: 200 })) as typeof fetch,
    preflightTokenEstimator: ({ maxCompletionTokens, messages, requestBody }) => {
      assert.equal(maxCompletionTokens, 800)
      assert.equal(messages.length, 2)
      assert.match(requestBody, /preflight-token-estimator-model/)
      return {
        tokenEstimateStrategy: 'contract-fixed-token-estimator',
        usage: {
          promptTokens: 123,
          completionTokens: 45,
          totalTokens: 168,
        },
      }
    },
    reserveCandidateAttempt: (_candidate, preflight) => {
      reservedUsage = preflight.usage
      reservedStrategy = preflight.tokenEstimateStrategy
      return { ok: true }
    },
  })

  assert.equal(result.ok, true)
  assert.deepEqual(reservedUsage, {
    promptTokens: 123,
    completionTokens: 45,
    totalTokens: 168,
  })
  assert.equal(reservedStrategy, 'contract-fixed-token-estimator')
}

function testRuntimeProposalDefaultPreflightEstimatorKeepsLegacyFloorAndCountsCjk() {
  const target = {
    source: 'gateway' as const,
    label: 'default preflight token estimator contract',
    protocol: 'openai_compat' as const,
    baseUrl: 'https://provider-account-pool.example/v1',
    apiKeys: ['default-preflight-token-estimator-fixture'],
    model: 'default-preflight-token-estimator-model',
  }
  const messages = [
    {
      role: 'system' as const,
      content: 'Return strict JSON only.',
    },
    {
      role: 'user' as const,
      content: '木材粮食铁矿',
    },
  ]
  const requestBody = JSON.stringify({
    model: target.model,
    messages,
    temperature: 0,
    max_tokens: 321,
    response_format: { type: 'json_object' },
  })
  const estimate = estimateAiPlayerRuntimeProposalTokensByMessageHeuristic({
    target,
    observation: {
      aiPlayerId: 'default_preflight_token_estimator_ai',
      runtime: {},
    },
    messages,
    requestBody,
    maxCompletionTokens: 321,
  })

  assert.equal(estimateAiPlayerRuntimeTextTokensForPreflight('木材粮食铁矿'), 6)
  assert.equal(estimate.tokenEstimateStrategy, 'runtime-proposal-message-token-heuristic-v1')
  assert.equal(estimate.usage.completionTokens, 321)
  assert.ok((estimate.usage.promptTokens ?? 0) >= Math.ceil(requestBody.length / 2))
  assert.ok((estimate.usage.totalTokens ?? 0) >= (estimate.usage.promptTokens ?? 0) + 321)
}

function testRuntimeProposalTokenizerProfileMatchesDeepSeekProviderAndModelAliases() {
  const directProfile = resolveAiPlayerRuntimeProposalTokenizerProfile({
    source: 'gateway',
    label: 'DeepSeek direct',
    protocol: 'openai_compat',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeys: ['deepseek-direct-fixture'],
    model: 'deepseek-v4-flash',
  })
  const relayProfile = resolveAiPlayerRuntimeProposalTokenizerProfile({
    source: 'gateway',
    label: 'DeepSeek relay',
    protocol: 'openai_compat',
    baseUrl: 'https://relay.example/v1',
    apiKeys: ['deepseek-relay-fixture'],
    model: 'deepseek-reasoner',
  })
  const unknownProfile = resolveAiPlayerRuntimeProposalTokenizerProfile({
    source: 'gateway',
    label: 'Unknown model',
    protocol: 'openai_compat',
    baseUrl: 'https://relay.example/v1',
    apiKeys: ['unknown-fixture'],
    model: 'unknown-json-model',
  })

  assert.equal(directProfile?.id, 'deepseek-official-tokenizer-json-runtime-v1')
  assert.equal(relayProfile?.id, 'deepseek-official-tokenizer-json-runtime-v1')
  assert.equal(directProfile?.precision, 'official_runtime')
  assert.equal(relayProfile?.precision, 'official_runtime')
  assert.equal(unknownProfile, null)
}

function testRuntimeProposalTokenizerProfileMatchesOpenAiAndAnthropicModelAliases() {
  const openAiDirectProfile = resolveAiPlayerRuntimeProposalTokenizerProfile({
    source: 'gateway',
    label: 'OpenAI direct',
    protocol: 'openai_compat',
    baseUrl: 'https://api.openai.com/v1',
    apiKeys: ['openai-direct-fixture'],
    model: 'gpt-4o-mini',
  })
  const openAiRelayProfile = resolveAiPlayerRuntimeProposalTokenizerProfile({
    source: 'gateway',
    label: 'OpenAI relay',
    protocol: 'openai_compat',
    baseUrl: 'https://relay.example/v1',
    apiKeys: ['openai-relay-fixture'],
    model: 'o4-mini',
  })
  const anthropicDirectProfile = resolveAiPlayerRuntimeProposalTokenizerProfile({
    source: 'gateway',
    label: 'Anthropic direct',
    protocol: 'openai_compat',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeys: ['anthropic-direct-fixture'],
    model: 'claude-3-5-sonnet-latest',
  })
  const anthropicRelayProfile = resolveAiPlayerRuntimeProposalTokenizerProfile({
    source: 'gateway',
    label: 'Anthropic relay',
    protocol: 'openai_compat',
    baseUrl: 'https://relay.example/v1',
    apiKeys: ['anthropic-relay-fixture'],
    model: 'claude-sonnet-4-5',
  })

  assert.equal(openAiDirectProfile?.id, 'openai-chat-tokenizer-profile-heuristic-v1')
  assert.equal(openAiRelayProfile?.id, 'openai-chat-tokenizer-profile-heuristic-v1')
  assert.equal(anthropicDirectProfile?.id, 'anthropic-chat-tokenizer-profile-heuristic-v1')
  assert.equal(anthropicRelayProfile?.id, 'anthropic-chat-tokenizer-profile-heuristic-v1')
  assert.equal(openAiDirectProfile?.precision, 'heuristic')
  assert.equal(openAiRelayProfile?.precision, 'heuristic')
  assert.equal(anthropicDirectProfile?.precision, 'heuristic')
  assert.equal(anthropicRelayProfile?.precision, 'heuristic')
}

function testRuntimeProposalProviderModelProfileUsesDeepSeekTextCounterWithLegacyFloor() {
  const target = {
    source: 'gateway' as const,
    label: 'DeepSeek profile contract',
    protocol: 'openai_compat' as const,
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeys: ['deepseek-profile-fixture'],
    model: 'deepseek-v4-pro',
  }
  const messages = [
    {
      role: 'system' as const,
      content: 'Return strict JSON only.',
    },
    {
      role: 'user' as const,
      content: '木材粮食铁矿',
    },
  ]
  const requestBody = JSON.stringify({
    model: target.model,
    messages,
    temperature: 0,
    max_tokens: 321,
    response_format: { type: 'json_object' },
  })
  const estimate = estimateAiPlayerRuntimeProposalTokensByProviderModelProfile({
    target,
    observation: {
      aiPlayerId: 'deepseek_profile_contract_ai',
      runtime: {},
    },
    messages,
    requestBody,
    maxCompletionTokens: 321,
  })

  assert.equal(estimateDeepSeekRuntimeTextTokensForPreflight('Hello!'), 2)
  assert.equal(estimateDeepSeekRuntimeTextTokensForPreflight('abcdefghij'), 3)
  assert.equal(estimateDeepSeekRuntimeTextTokensForPreflight('木材粮食铁矿'), 3)
  assert.equal(estimate.tokenEstimateStrategy, 'deepseek-official-tokenizer-json-runtime-v1')
  assert.equal(estimate.usage.completionTokens, 321)
  assert.ok((estimate.usage.promptTokens ?? 0) >= Math.ceil(requestBody.length / 2))
  assert.ok((estimate.usage.totalTokens ?? 0) >= (estimate.usage.promptTokens ?? 0) + 321)
}

function testRuntimeProposalProviderModelProfileUsesOpenAiAndAnthropicStrategies() {
  const messages = [
    {
      role: 'system' as const,
      content: 'Return strict JSON only.',
    },
    {
      role: 'user' as const,
      content: 'Plan next wood and grain allocation.',
    },
  ]
  const openAiTarget = {
    source: 'gateway' as const,
    label: 'OpenAI profile contract',
    protocol: 'openai_compat' as const,
    baseUrl: 'https://api.openai.com/v1',
    apiKeys: ['openai-profile-fixture'],
    model: 'gpt-4.1-mini',
  }
  const anthropicTarget = {
    source: 'gateway' as const,
    label: 'Anthropic profile contract',
    protocol: 'openai_compat' as const,
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeys: ['anthropic-profile-fixture'],
    model: 'claude-3-5-haiku-latest',
  }
  const openAiRequestBody = JSON.stringify({
    model: openAiTarget.model,
    messages,
    max_tokens: 123,
  })
  const anthropicRequestBody = JSON.stringify({
    model: anthropicTarget.model,
    messages,
    max_tokens: 123,
  })

  const openAiEstimate = estimateAiPlayerRuntimeProposalTokensByProviderModelProfile({
    target: openAiTarget,
    observation: { aiPlayerId: 'openai_profile_contract_ai', runtime: {} },
    messages,
    requestBody: openAiRequestBody,
    maxCompletionTokens: 123,
  })
  const anthropicEstimate = estimateAiPlayerRuntimeProposalTokensByProviderModelProfile({
    target: anthropicTarget,
    observation: { aiPlayerId: 'anthropic_profile_contract_ai', runtime: {} },
    messages,
    requestBody: anthropicRequestBody,
    maxCompletionTokens: 123,
  })

  assert.equal(openAiEstimate.tokenEstimateStrategy, 'openai-chat-tokenizer-profile-heuristic-v1')
  assert.equal(anthropicEstimate.tokenEstimateStrategy, 'anthropic-chat-tokenizer-profile-heuristic-v1')
  assert.equal(openAiEstimate.usage.completionTokens, 123)
  assert.equal(anthropicEstimate.usage.completionTokens, 123)
  assert.ok((openAiEstimate.usage.promptTokens ?? 0) >= Math.ceil(openAiRequestBody.length / 2))
  assert.ok((anthropicEstimate.usage.promptTokens ?? 0) >= Math.ceil(anthropicRequestBody.length / 2))
}

async function run() {
  const snapshot = snapshotEnv()
  try {
    testStrictJsonModelIsDefault()
    testLiveAutonomousPlannerGateUsesCentralRuntimeModelDefault()
    testRuntimeModelDispatchSharedStoreSmokeUsesCentralRuntimeModelDefault()
    testEnvOverrideKeepsMultiProviderEscapeHatch()
    testDeepSeekFlashEnvAddsProProposalFallbackWithSameSecret()
    testEconomyModelAndDisabledBudget()
    testFactionByokOverridesEnvWithoutLeakingSecret()
    testFallbackReasonIsStoredOnRuntimeStatus()
    await testRuntimeProposalDispatchFallsBackAcrossIndependentProviderKeys()
    await testRuntimeProposalPreflightUsesInjectedTokenEstimator()
    testRuntimeProposalDefaultPreflightEstimatorKeepsLegacyFloorAndCountsCjk()
    testRuntimeProposalTokenizerProfileMatchesDeepSeekProviderAndModelAliases()
    testRuntimeProposalTokenizerProfileMatchesOpenAiAndAnthropicModelAliases()
    testRuntimeProposalProviderModelProfileUsesDeepSeekTextCounterWithLegacyFloor()
    testRuntimeProposalProviderModelProfileUsesOpenAiAndAnthropicStrategies()
  } finally {
    restoreEnv(snapshot)
    resetAiPlayerRuntimeModelDispatchStoreForTest()
  }
  console.log('[ai_player_runtime_model_target_contract] all checks passed')
}

try {
  await run()
} catch (error) {
  console.error('[ai_player_runtime_model_target_contract] failed:', error)
  process.exitCode = 1
}
