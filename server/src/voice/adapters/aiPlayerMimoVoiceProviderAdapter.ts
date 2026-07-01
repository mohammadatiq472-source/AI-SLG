import type {
  AiPlayerAsrRequest,
  AiPlayerAsrResult,
  AiPlayerTtsRequest,
  AiPlayerTtsResult,
  AiPlayerVoiceProviderAdapter,
} from '../../../../shared/contracts/aiPlayerVoice'
import { saveAiPlayerVoiceAudioAsset } from '../aiPlayerVoiceAudioAssetStore'

export const MIMO_VOICE_PROVIDER_ID = 'xiaomi.mimo'
const DEFAULT_MIMO_BASE_URL = 'https://api.xiaomimimo.com/v1'
const DEFAULT_MIMO_TOKEN_PLAN_BASE_URL = 'https://token-plan-cn.xiaomimimo.com/v1'
const DEFAULT_MIMO_TTS_MODEL = 'mimo-v2.5-tts'
const DEFAULT_MIMO_TTS_VOICE = 'mimo_default'
const DEFAULT_MIMO_TTS_FORMAT = 'wav'
const DEFAULT_MIMO_TTS_TIMEOUT_MS = 60_000

type MimoTtsFormat = 'wav' | 'mp3' | 'pcm16'

export type MimoVoiceProviderConfig = {
  apiKey: string
  baseUrl: string
  model: string
  voice: string
  format: MimoTtsFormat
  stylePrompt?: string
  timeoutMs: number
}

type ChatCompletionAudioResponse = {
  choices?: Array<{
    message?: {
      audio?: {
        data?: unknown
      }
    }
  }>
  usage?: unknown
}

function readEnv(env: Record<string, string | undefined>, name: string) {
  return env[name]?.trim() || ''
}

function normalizeMimoBaseUrl(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, '')
  if (!normalized) {
    return DEFAULT_MIMO_BASE_URL
  }
  if (normalized.endsWith('/chat/completions')) {
    return normalized.slice(0, -'/chat/completions'.length)
  }
  if (normalized.endsWith('/v1')) {
    return normalized
  }
  return `${normalized}/v1`
}

function normalizeMimoFormat(value: string): MimoTtsFormat {
  return value === 'mp3' || value === 'pcm16' || value === 'wav'
    ? value
    : DEFAULT_MIMO_TTS_FORMAT
}

function readPositiveIntegerEnv(env: Record<string, string | undefined>, name: string, fallback: number) {
  const parsed = Number(readEnv(env, name))
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return Math.floor(parsed)
}

function defaultBaseUrlForApiKey(apiKey: string) {
  return apiKey.startsWith('tp-') ? DEFAULT_MIMO_TOKEN_PLAN_BASE_URL : DEFAULT_MIMO_BASE_URL
}

function contentTypeForFormat(format: MimoTtsFormat) {
  if (format === 'mp3') {
    return 'audio/mpeg'
  }
  if (format === 'pcm16') {
    return 'audio/pcm; codec=pcm_s16le; rate=24000'
  }
  return 'audio/wav'
}

function extractAudioBase64(payload: ChatCompletionAudioResponse) {
  const audioData = payload.choices?.[0]?.message?.audio?.data
  return typeof audioData === 'string' && audioData.trim() ? audioData.trim() : null
}

function buildFailedTtsResult(input: {
  text: string
  voiceProfileId?: string
  contentType: string
  errorCode: string
}): AiPlayerTtsResult {
  return {
    speechContract: {
      contractVersion: 'ai_player_speech_contract_v1',
      provider: MIMO_VOICE_PROVIDER_ID,
      providerKind: 'tts',
      providerMode: 'adapter',
      status: 'failed',
      contentType: input.contentType,
      ...(input.voiceProfileId ? { voiceProfileId: input.voiceProfileId } : {}),
      usage: {
        characters: input.text.length,
        requestCount: 1,
        estimatedCostSource: 'provider_reported',
      },
      errorCode: input.errorCode,
    },
  }
}

export function resolveMimoVoiceProviderConfig(
  env: Record<string, string | undefined> = process.env,
): MimoVoiceProviderConfig | null {
  const apiKey = readEnv(env, 'MIMO_API_KEY')
  if (!apiKey) {
    return null
  }
  const stylePrompt = readEnv(env, 'MIMO_TTS_STYLE_PROMPT')
  const defaultBaseUrl = defaultBaseUrlForApiKey(apiKey)
  return {
    apiKey,
    baseUrl: normalizeMimoBaseUrl(readEnv(env, 'MIMO_BASE_URL') || defaultBaseUrl),
    model: readEnv(env, 'MIMO_TTS_MODEL') || DEFAULT_MIMO_TTS_MODEL,
    voice: readEnv(env, 'MIMO_TTS_VOICE') || DEFAULT_MIMO_TTS_VOICE,
    format: normalizeMimoFormat(readEnv(env, 'MIMO_TTS_FORMAT') || DEFAULT_MIMO_TTS_FORMAT),
    ...(stylePrompt ? { stylePrompt } : {}),
    timeoutMs: readPositiveIntegerEnv(env, 'MIMO_TTS_TIMEOUT_MS', DEFAULT_MIMO_TTS_TIMEOUT_MS),
  }
}

export class MimoAiPlayerVoiceProviderAdapter implements AiPlayerVoiceProviderAdapter {
  readonly provider = MIMO_VOICE_PROVIDER_ID
  readonly providerMode = 'adapter' as const
  private readonly config: MimoVoiceProviderConfig
  private readonly fetchImpl: typeof fetch

  constructor(
    config: MimoVoiceProviderConfig,
    fetchImpl: typeof fetch = fetch,
  ) {
    this.config = config
    this.fetchImpl = fetchImpl
  }

  async synthesizeSpeech(request: AiPlayerTtsRequest): Promise<AiPlayerTtsResult> {
    const text = request.text.trim()
    const contentType = contentTypeForFormat(this.config.format)
    const stylePrompt = request.stylePrompt?.trim() || this.config.stylePrompt
    const providerVoice = request.providerVoice?.trim() || this.config.voice
    const messages = [
      ...(stylePrompt ? [{
        role: 'user',
        content: stylePrompt,
      }] : []),
      {
        role: 'assistant',
        content: text,
      },
    ]
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs)
    try {
      const response = await this.fetchImpl(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'api-key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          audio: {
            format: this.config.format,
            voice: providerVoice,
          },
        }),
        signal: controller.signal,
      })
      if (!response.ok) {
        return buildFailedTtsResult({
          text,
          voiceProfileId: request.voiceProfileId,
          contentType,
          errorCode: `provider_http_${response.status}`,
        })
      }
      const payload = await response.json() as ChatCompletionAudioResponse
      const audioBase64 = extractAudioBase64(payload)
      if (!audioBase64) {
        return buildFailedTtsResult({
          text,
          voiceProfileId: request.voiceProfileId,
          contentType,
          errorCode: 'provider_missing_audio_data',
        })
      }
      const bytes = Buffer.from(audioBase64, 'base64')
      if (bytes.byteLength === 0) {
        return buildFailedTtsResult({
          text,
          voiceProfileId: request.voiceProfileId,
          contentType,
          errorCode: 'provider_empty_audio_data',
        })
      }
      const asset = saveAiPlayerVoiceAudioAsset({
        provider: this.provider,
        contentType,
        bytes,
      })
      return {
        speechContract: {
          contractVersion: 'ai_player_speech_contract_v1',
          provider: this.provider,
          providerKind: 'tts',
          providerMode: this.providerMode,
          status: 'succeeded',
          audioAssetId: asset.audioAssetId,
          contentType,
          ...(request.voiceProfileId ? { voiceProfileId: request.voiceProfileId } : {}),
          usage: {
            characters: text.length,
            requestCount: 1,
            estimatedCostSource: payload.usage ? 'provider_reported' : 'pricing_policy',
          },
        },
      }
    } catch {
      return buildFailedTtsResult({
        text,
        voiceProfileId: request.voiceProfileId,
        contentType,
        errorCode: 'provider_request_failed',
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  async transcribeAudio(request: AiPlayerAsrRequest): Promise<AiPlayerAsrResult> {
    const transcriptText = request.transcriptHint?.trim()
    if (!transcriptText) {
      throw new Error('mimo_asr_not_configured')
    }
    return {
      transcriptText,
      asr: {
        contractVersion: 'ai_player_asr_summary_v1',
        provider: this.provider,
        providerKind: 'asr',
        providerMode: this.providerMode,
        audioAssetId: request.audioAssetId,
        transcriptText,
        usage: {
          audioSeconds: 0,
          requestCount: 0,
          estimatedCostSource: 'provider_reported',
        },
      },
    }
  }
}

export function createConfiguredMimoVoiceProviderAdapter(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
) {
  const config = resolveMimoVoiceProviderConfig(env)
  return config ? new MimoAiPlayerVoiceProviderAdapter(config, fetchImpl) : null
}
