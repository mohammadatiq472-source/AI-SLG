import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Tokenizer } from '@huggingface/tokenizers'
import type { AiPlayerProviderBillingUsage } from '../../../../shared/contracts/aiPlayerProviderAccount'
import type { ResolvedPlannerTarget } from '../../config/modelGateway'

export type AiPlayerRuntimeProposalTokenEstimatorMessage = {
  role: 'system' | 'user'
  content: string
}

export type AiPlayerRuntimeProposalPreflightTokenEstimatorInput = {
  target: ResolvedPlannerTarget
  observation: unknown
  messages: readonly AiPlayerRuntimeProposalTokenEstimatorMessage[]
  requestBody: string
  maxCompletionTokens: number
}

export type AiPlayerRuntimeProposalPreflightTokenEstimate = {
  tokenEstimateStrategy: string
  usage: AiPlayerProviderBillingUsage
}

export type AiPlayerRuntimeProposalPreflightTokenEstimator = (
  input: AiPlayerRuntimeProposalPreflightTokenEstimatorInput,
) => AiPlayerRuntimeProposalPreflightTokenEstimate

export type AiPlayerRuntimeProposalTokenizerProfile = {
  id: string
  provider: string
  modelKeys: readonly string[]
  modelPrefixes: readonly string[]
  precision: 'official_runtime' | 'heuristic'
  sourceUrl: string
  countTextTokens: (text: string) => number
  chatMessageTokenOverhead: number
  chatRequestTokenOverhead: number
}

const DEFAULT_PREFLIGHT_TOKEN_ESTIMATE_STRATEGY = 'runtime-proposal-message-token-heuristic-v1'
const FALLBACK_TOKEN_ESTIMATE_STRATEGY = 'runtime-proposal-custom-token-estimator'
const LEGACY_REQUEST_BODY_CHARS_PER_TOKEN = 2
const ASCII_CHARS_PER_TOKEN = 4
const CHAT_MESSAGE_TOKEN_OVERHEAD = 4
const CHAT_REQUEST_TOKEN_OVERHEAD = 8
const DEEPSEEK_TOKEN_USAGE_SOURCE_URL = 'https://api-docs.deepseek.com/zh-cn/quick_start/token_usage/'
const OPENAI_TOKENIZER_SOURCE_URL = 'https://platform.openai.com/tokenizer'
const ANTHROPIC_TOKEN_COUNTING_SOURCE_URL = 'https://docs.anthropic.com/en/docs/build-with-claude/token-counting'
const DEEPSEEK_TOKENIZER_ASSET_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  'tokenizers',
  'deepseek_v3',
)
const DEEPSEEK_OFFICIAL_TOKENIZER_RUNTIME_STRATEGY = 'deepseek-official-tokenizer-json-runtime-v1'
const OPENAI_CHAT_TOKENIZER_PROFILE_HEURISTIC_STRATEGY = 'openai-chat-tokenizer-profile-heuristic-v1'
const ANTHROPIC_CHAT_TOKENIZER_PROFILE_HEURISTIC_STRATEGY = 'anthropic-chat-tokenizer-profile-heuristic-v1'

function sanitizeTokenCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }
  return Math.max(0, Math.ceil(value))
}

function isAsciiAlphaNumeric(codePoint: number): boolean {
  return (
    (codePoint >= 48 && codePoint <= 57)
    || (codePoint >= 65 && codePoint <= 90)
    || (codePoint >= 97 && codePoint <= 122)
  )
}

function isAsciiLetter(codePoint: number): boolean {
  return (codePoint >= 65 && codePoint <= 90) || (codePoint >= 97 && codePoint <= 122)
}

function isAsciiDigit(codePoint: number): boolean {
  return codePoint >= 48 && codePoint <= 57
}

function isWhitespace(codePoint: number): boolean {
  return codePoint === 9
    || codePoint === 10
    || codePoint === 11
    || codePoint === 12
    || codePoint === 13
    || codePoint === 32
}

function normalizeTokenizerProfileKey(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function resolveProviderHost(baseUrl: string): string {
  try {
    return new URL(baseUrl).host.toLowerCase()
  } catch {
    return 'relay'
  }
}

function isCjkCodePoint(codePoint: number): boolean {
  return (
    (codePoint >= 0x3400 && codePoint <= 0x4dbf)
    || (codePoint >= 0x4e00 && codePoint <= 0x9fff)
    || (codePoint >= 0xf900 && codePoint <= 0xfaff)
    || (codePoint >= 0x20000 && codePoint <= 0x2a6df)
    || (codePoint >= 0x2a700 && codePoint <= 0x2b73f)
    || (codePoint >= 0x2b740 && codePoint <= 0x2b81f)
    || (codePoint >= 0x2b820 && codePoint <= 0x2ceaf)
    || (codePoint >= 0x2ceb0 && codePoint <= 0x2ebef)
  )
}

export function estimateDeepSeekRuntimeTextTokensForPreflight(text: string): number {
  const officialTokenizer = getDeepSeekOfficialTokenizer()
  if (officialTokenizer) {
    return Math.max(1, officialTokenizer.encode(text).ids.length)
  }
  return estimateDeepSeekRuntimeTextTokensByUsageRatioForPreflight(text)
}

export function estimateOpenAiRuntimeTextTokensForPreflight(text: string): number {
  return estimateAiPlayerRuntimeTextTokensForPreflight(text)
}

export function estimateAnthropicRuntimeTextTokensForPreflight(text: string): number {
  return estimateAiPlayerRuntimeTextTokensForPreflight(text)
}

function estimateDeepSeekRuntimeTextTokensByUsageRatioForPreflight(text: string): number {
  let weightedTokens = 0
  for (const char of text) {
    const codePoint = char.codePointAt(0)
    if (codePoint === undefined || isWhitespace(codePoint)) {
      continue
    }
    if (isCjkCodePoint(codePoint)) {
      weightedTokens += 0.6
      continue
    }
    if (isAsciiLetter(codePoint)) {
      weightedTokens += 0.3
      continue
    }
    if (isAsciiDigit(codePoint)) {
      weightedTokens += 1
      continue
    }
    weightedTokens += 1
  }
  return Math.max(1, Math.ceil(weightedTokens))
}

type DeepSeekOfficialTokenizer = Pick<Tokenizer, 'encode'>

let deepSeekOfficialTokenizer: DeepSeekOfficialTokenizer | null | undefined

function getDeepSeekOfficialTokenizer(): DeepSeekOfficialTokenizer | null {
  if (deepSeekOfficialTokenizer !== undefined) {
    return deepSeekOfficialTokenizer
  }
  try {
    deepSeekOfficialTokenizer = new Tokenizer(
      JSON.parse(readFileSync(join(DEEPSEEK_TOKENIZER_ASSET_DIR, 'tokenizer.json'), 'utf8')),
      JSON.parse(readFileSync(join(DEEPSEEK_TOKENIZER_ASSET_DIR, 'tokenizer_config.json'), 'utf8')),
    )
  } catch {
    deepSeekOfficialTokenizer = null
  }
  return deepSeekOfficialTokenizer
}

const DEEPSEEK_TOKENIZER_PROFILE: AiPlayerRuntimeProposalTokenizerProfile = {
  id: DEEPSEEK_OFFICIAL_TOKENIZER_RUNTIME_STRATEGY,
  provider: 'api.deepseek.com',
  modelKeys: [
    'deepseek-v4-flash',
    'deepseek-v4-pro',
    'deepseek-chat',
    'deepseek-reasoner',
  ],
  modelPrefixes: [
    'deepseek-',
  ],
  precision: 'official_runtime',
  sourceUrl: DEEPSEEK_TOKEN_USAGE_SOURCE_URL,
  countTextTokens: estimateDeepSeekRuntimeTextTokensForPreflight,
  chatMessageTokenOverhead: CHAT_MESSAGE_TOKEN_OVERHEAD,
  chatRequestTokenOverhead: CHAT_REQUEST_TOKEN_OVERHEAD,
}

// These non-DeepSeek profiles only select provider/model-specific conservative preflight heuristics.
// Successful billing still trusts provider-reported usage, and exact runtimes can replace these counters later.
const OPENAI_TOKENIZER_PROFILE: AiPlayerRuntimeProposalTokenizerProfile = {
  id: OPENAI_CHAT_TOKENIZER_PROFILE_HEURISTIC_STRATEGY,
  provider: 'api.openai.com',
  modelKeys: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
    'o1',
    'o3',
    'o3-mini',
    'o4-mini',
  ],
  modelPrefixes: [
    'gpt-',
    'o1',
    'o3',
    'o4',
  ],
  precision: 'heuristic',
  sourceUrl: OPENAI_TOKENIZER_SOURCE_URL,
  countTextTokens: estimateOpenAiRuntimeTextTokensForPreflight,
  chatMessageTokenOverhead: 3,
  chatRequestTokenOverhead: 3,
}

const ANTHROPIC_TOKENIZER_PROFILE: AiPlayerRuntimeProposalTokenizerProfile = {
  id: ANTHROPIC_CHAT_TOKENIZER_PROFILE_HEURISTIC_STRATEGY,
  provider: 'api.anthropic.com',
  modelKeys: [
    'claude-3-5-haiku-latest',
    'claude-3-5-sonnet-latest',
    'claude-sonnet-4-5',
    'claude-opus-4-1',
  ],
  modelPrefixes: [
    'claude-',
  ],
  precision: 'heuristic',
  sourceUrl: ANTHROPIC_TOKEN_COUNTING_SOURCE_URL,
  countTextTokens: estimateAnthropicRuntimeTextTokensForPreflight,
  chatMessageTokenOverhead: CHAT_MESSAGE_TOKEN_OVERHEAD,
  chatRequestTokenOverhead: CHAT_REQUEST_TOKEN_OVERHEAD,
}

const PROVIDER_MODEL_TOKENIZER_PROFILES: readonly AiPlayerRuntimeProposalTokenizerProfile[] = [
  DEEPSEEK_TOKENIZER_PROFILE,
  OPENAI_TOKENIZER_PROFILE,
  ANTHROPIC_TOKENIZER_PROFILE,
]

function tokenizerProfileMatchesModel(
  profile: AiPlayerRuntimeProposalTokenizerProfile,
  model: string,
): boolean {
  return profile.modelKeys.includes(model)
    || profile.modelPrefixes.some((prefix) => model.startsWith(prefix))
}

export function resolveAiPlayerRuntimeProposalTokenizerProfile(
  target: ResolvedPlannerTarget,
): AiPlayerRuntimeProposalTokenizerProfile | null {
  const providerHost = resolveProviderHost(target.baseUrl)
  const model = normalizeTokenizerProfileKey(target.model)
  return PROVIDER_MODEL_TOKENIZER_PROFILES.find((profile) => {
    const providerMatches = providerHost === profile.provider || providerHost.endsWith(`.${profile.provider}`)
    const modelMatches = tokenizerProfileMatchesModel(profile, model)
    return modelMatches && (providerMatches || profile.modelPrefixes.some((prefix) => model.startsWith(prefix)))
  }) ?? null
}

export function estimateAiPlayerRuntimeTextTokensForPreflight(text: string): number {
  let tokens = 0
  let asciiRunLength = 0
  const flushAsciiRun = () => {
    if (asciiRunLength <= 0) {
      return
    }
    tokens += Math.ceil(asciiRunLength / ASCII_CHARS_PER_TOKEN)
    asciiRunLength = 0
  }

  for (const char of text) {
    const codePoint = char.codePointAt(0)
    if (codePoint === undefined) {
      continue
    }
    if (isWhitespace(codePoint)) {
      flushAsciiRun()
      continue
    }
    if (isCjkCodePoint(codePoint)) {
      flushAsciiRun()
      tokens += 1
      continue
    }
    if (isAsciiAlphaNumeric(codePoint)) {
      asciiRunLength += 1
      continue
    }
    flushAsciiRun()
    tokens += 1
  }
  flushAsciiRun()
  return Math.max(1, tokens)
}

export function normalizeAiPlayerRuntimeProposalTokenEstimate(
  estimate: AiPlayerRuntimeProposalPreflightTokenEstimate,
  fallbackCompletionTokens: number,
): AiPlayerRuntimeProposalPreflightTokenEstimate {
  const promptTokens = sanitizeTokenCount(estimate.usage.promptTokens) ?? 0
  const completionTokens = sanitizeTokenCount(estimate.usage.completionTokens)
    ?? Math.max(0, Math.ceil(fallbackCompletionTokens))
  const summedTotalTokens = promptTokens + completionTokens
  const totalTokens = Math.max(
    sanitizeTokenCount(estimate.usage.totalTokens) ?? 0,
    summedTotalTokens,
    1,
  )
  return {
    tokenEstimateStrategy: estimate.tokenEstimateStrategy.trim() || FALLBACK_TOKEN_ESTIMATE_STRATEGY,
    usage: {
      ...estimate.usage,
      promptTokens,
      completionTokens,
      totalTokens,
    },
  }
}

function estimateRequestEnvelopeTokens(
  input: AiPlayerRuntimeProposalPreflightTokenEstimatorInput,
  countTextTokens: (text: string) => number = estimateAiPlayerRuntimeTextTokensForPreflight,
): number {
  return countTextTokens(JSON.stringify({
    model: input.target.model,
    temperature: 0,
    max_tokens: input.maxCompletionTokens,
    response_format: { type: 'json_object' },
  }))
}

function estimateAiPlayerRuntimeProposalTokensWithCounter(
  input: AiPlayerRuntimeProposalPreflightTokenEstimatorInput,
  options: {
    strategyId: string
    countTextTokens: (text: string) => number
    chatMessageTokenOverhead: number
    chatRequestTokenOverhead: number
  },
): AiPlayerRuntimeProposalPreflightTokenEstimate {
  const completionTokens = Math.max(0, Math.ceil(input.maxCompletionTokens))
  const messageTokens = input.messages.reduce((total, message) => {
    return total
      + options.chatMessageTokenOverhead
      + options.countTextTokens(message.role)
      + options.countTextTokens(message.content)
  }, options.chatRequestTokenOverhead + estimateRequestEnvelopeTokens(input, options.countTextTokens))
  const legacyPromptTokens = Math.max(1, Math.ceil(input.requestBody.length / LEGACY_REQUEST_BODY_CHARS_PER_TOKEN))
  const promptTokens = Math.max(messageTokens, legacyPromptTokens)

  return normalizeAiPlayerRuntimeProposalTokenEstimate({
    tokenEstimateStrategy: options.strategyId,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    },
  }, completionTokens)
}

export function estimateAiPlayerRuntimeProposalTokensByMessageHeuristic(
  input: AiPlayerRuntimeProposalPreflightTokenEstimatorInput,
): AiPlayerRuntimeProposalPreflightTokenEstimate {
  return estimateAiPlayerRuntimeProposalTokensWithCounter(input, {
    strategyId: DEFAULT_PREFLIGHT_TOKEN_ESTIMATE_STRATEGY,
    countTextTokens: estimateAiPlayerRuntimeTextTokensForPreflight,
    chatMessageTokenOverhead: CHAT_MESSAGE_TOKEN_OVERHEAD,
    chatRequestTokenOverhead: CHAT_REQUEST_TOKEN_OVERHEAD,
  })
}

export function estimateAiPlayerRuntimeProposalTokensByProviderModelProfile(
  input: AiPlayerRuntimeProposalPreflightTokenEstimatorInput,
): AiPlayerRuntimeProposalPreflightTokenEstimate {
  const profile = resolveAiPlayerRuntimeProposalTokenizerProfile(input.target)
  if (!profile) {
    return estimateAiPlayerRuntimeProposalTokensByMessageHeuristic(input)
  }
  return estimateAiPlayerRuntimeProposalTokensWithCounter(input, {
    strategyId: profile.id,
    countTextTokens: profile.countTextTokens,
    chatMessageTokenOverhead: profile.chatMessageTokenOverhead,
    chatRequestTokenOverhead: profile.chatRequestTokenOverhead,
  })
}
