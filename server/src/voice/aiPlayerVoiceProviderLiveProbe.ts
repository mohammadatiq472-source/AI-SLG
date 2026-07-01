import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readAiPlayerVoiceAudioAsset } from './aiPlayerVoiceAudioAssetStore'
import {
  MimoAiPlayerVoiceProviderAdapter,
  MIMO_VOICE_PROVIDER_ID,
  resolveMimoVoiceProviderConfig,
} from './adapters/aiPlayerMimoVoiceProviderAdapter'

const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash'
const DEFAULT_PROBE_TIMEOUT_MS = 30_000

type ProbeEnv = Record<string, string | undefined>

export type AiPlayerDeepSeekProbeConfig = {
  apiKey: string
  keySource: 'AI_PLAYER_RUNTIME_MODEL_API_KEY' | 'LLM_RELAY_API_KEY' | 'DEEPSEEK_API_KEY'
  publicConfig: {
    provider: 'deepseek'
    baseUrl: string
    model: string
    keySource: AiPlayerDeepSeekProbeConfig['keySource']
    backendRuntimeCompatible: boolean
  }
}

export type AiPlayerProviderProbeResult = {
  ok: boolean
  skipped: boolean
  provider: 'deepseek' | typeof MIMO_VOICE_PROVIDER_ID
  reason?: string
  status?: number
  publicConfig?: Record<string, unknown>
  audioAssetId?: string
  contentType?: string
  byteLength?: number
  outputPath?: string
}

function readEnv(env: ProbeEnv, name: string) {
  return env[name]?.trim() || ''
}

function readFirstKey(env: ProbeEnv) {
  const keyPriority = [
    'AI_PLAYER_RUNTIME_MODEL_API_KEY',
    'LLM_RELAY_API_KEY',
    'DEEPSEEK_API_KEY',
  ] as const
  for (const keySource of keyPriority) {
    const apiKey = readEnv(env, keySource)
    if (apiKey) {
      return { apiKey, keySource }
    }
  }
  return null
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '')
}

function chatCompletionsUrl(baseUrl: string) {
  const normalized = normalizeBaseUrl(baseUrl)
  if (normalized.endsWith('/chat/completions')) {
    return normalized
  }
  return `${normalized}/chat/completions`
}

function readPositiveIntegerEnv(env: ProbeEnv, name: string, fallback: number) {
  const parsed = Number(readEnv(env, name))
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return Math.floor(parsed)
}

export function resolveAiPlayerDeepSeekProbeConfig(
  env: ProbeEnv = process.env,
): AiPlayerDeepSeekProbeConfig | null {
  const key = readFirstKey(env)
  if (!key) {
    return null
  }
  const baseUrl = normalizeBaseUrl(
    readEnv(env, 'AI_PLAYER_RUNTIME_MODEL_BASE_URL')
      || readEnv(env, 'LLM_RELAY_URL')
      || DEFAULT_DEEPSEEK_BASE_URL,
  )
  const model = readEnv(env, 'AI_PLAYER_RUNTIME_MODEL')
    || readEnv(env, 'LLM_RELAY_MODEL')
    || DEFAULT_DEEPSEEK_MODEL
  const backendRuntimeCompatible = key.keySource !== 'DEEPSEEK_API_KEY'
  return {
    apiKey: key.apiKey,
    keySource: key.keySource,
    publicConfig: {
      provider: 'deepseek',
      baseUrl,
      model,
      keySource: key.keySource,
      backendRuntimeCompatible,
    },
  }
}

export async function probeAiPlayerDeepSeekApi({
  env = process.env,
  fetchImpl = fetch,
}: {
  env?: ProbeEnv
  fetchImpl?: typeof fetch
} = {}): Promise<AiPlayerProviderProbeResult> {
  const config = resolveAiPlayerDeepSeekProbeConfig(env)
  if (!config) {
    return {
      ok: false,
      skipped: true,
      provider: 'deepseek',
      reason: 'missing_deepseek_api_key',
      publicConfig: {
        requiredEnv: [
          'AI_PLAYER_RUNTIME_MODEL_API_KEY',
          'LLM_RELAY_API_KEY',
          'DEEPSEEK_API_KEY',
        ],
      },
    }
  }

  const controller = new AbortController()
  const timeoutMs = readPositiveIntegerEnv(env, 'AI_PLAYER_VOICE_PROBE_TIMEOUT_MS', DEFAULT_PROBE_TIMEOUT_MS)
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(chatCompletionsUrl(config.publicConfig.baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.publicConfig.model,
        messages: [
          {
            role: 'system',
            content: 'Return the short string ok.',
          },
          {
            role: 'user',
            content: 'ping',
          },
        ],
        max_tokens: 8,
        stream: false,
        thinking: { type: 'disabled' },
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      return {
        ok: false,
        skipped: false,
        provider: 'deepseek',
        status: response.status,
        reason: `provider_http_${response.status}`,
        publicConfig: config.publicConfig,
      }
    }
    return {
      ok: true,
      skipped: false,
      provider: 'deepseek',
      status: response.status,
      publicConfig: config.publicConfig,
    }
  } catch {
    return {
      ok: false,
      skipped: false,
      provider: 'deepseek',
      reason: 'provider_request_failed',
      publicConfig: config.publicConfig,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function probeAiPlayerMimoTts({
  env = process.env,
  fetchImpl = fetch,
}: {
  env?: ProbeEnv
  fetchImpl?: typeof fetch
} = {}): Promise<AiPlayerProviderProbeResult> {
  const config = resolveMimoVoiceProviderConfig(env)
  if (!config) {
    return {
      ok: false,
      skipped: true,
      provider: MIMO_VOICE_PROVIDER_ID,
      reason: 'missing_mimo_api_key',
      publicConfig: {
        requiredEnv: ['MIMO_API_KEY'],
      },
    }
  }
  const adapter = new MimoAiPlayerVoiceProviderAdapter(config, fetchImpl)
  const result = await adapter.synthesizeSpeech({
    aiPlayerId: 'ai_player_voice_probe',
    text: readEnv(env, 'AI_PLAYER_VOICE_PROBE_TEXT') || '主公，我在，语音通道已经准备好了。',
  })
  if (result.speechContract.status !== 'succeeded' || !result.speechContract.audioAssetId) {
    return {
      ok: false,
      skipped: false,
      provider: MIMO_VOICE_PROVIDER_ID,
      reason: result.speechContract.errorCode ?? 'mimo_tts_failed',
      publicConfig: {
        provider: MIMO_VOICE_PROVIDER_ID,
        baseUrl: config.baseUrl,
        model: config.model,
        voice: config.voice,
        format: config.format,
      },
    }
  }
  const asset = readAiPlayerVoiceAudioAsset(result.speechContract.audioAssetId)
  if (!asset) {
    return {
      ok: false,
      skipped: false,
      provider: MIMO_VOICE_PROVIDER_ID,
      reason: 'audio_asset_missing',
    }
  }
  return {
    ok: true,
    skipped: false,
    provider: MIMO_VOICE_PROVIDER_ID,
    audioAssetId: result.speechContract.audioAssetId,
    contentType: asset.contentType,
    byteLength: asset.bytes.byteLength,
    publicConfig: {
      provider: MIMO_VOICE_PROVIDER_ID,
      baseUrl: config.baseUrl,
      model: config.model,
      voice: config.voice,
      format: config.format,
    },
  }
}

export function writeAiPlayerVoiceProbeAudioFile(input: {
  audioAssetId: string
  outputDir?: string
}) {
  const asset = readAiPlayerVoiceAudioAsset(input.audioAssetId)
  if (!asset) {
    return null
  }
  const outputDir = input.outputDir ?? join(process.cwd(), 'tmp', 'ai_player_voice_probe')
  mkdirSync(outputDir, { recursive: true })
  const extension = asset.contentType.includes('mpeg')
    ? 'mp3'
    : asset.contentType.includes('pcm')
      ? 'pcm'
      : 'wav'
  const safeTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outputPath = join(outputDir, `mimo_probe_${safeTimestamp}.${extension}`)
  writeFileSync(outputPath, asset.bytes)
  return outputPath
}
