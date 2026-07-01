import { createHash } from 'node:crypto'
import type {
  AiPlayerAsrRequest,
  AiPlayerAsrResult,
  AiPlayerTtsRequest,
  AiPlayerTtsResult,
  AiPlayerVoiceProviderKind,
  AiPlayerVoiceProviderAdapter,
} from '../../../shared/contracts/aiPlayerVoice'
import { saveAiPlayerVoiceAudioAsset } from './aiPlayerVoiceAudioAssetStore'

const MOCK_PROVIDER = 'mock.voice.local'
const MOCK_TTS_CONTENT_TYPE = 'audio/wav'
const MOCK_TTS_SAMPLE_RATE = 16_000
const MOCK_ASR_TRANSCRIPT = '青州后勤官，升级税务建筑。'

function hashText(input: string) {
  return createHash('sha256').update(input).digest('hex').slice(0, 16)
}

function normalizeTranscriptHint(input: unknown) {
  return typeof input === 'string' && input.trim() ? input.trim().slice(0, 500) : undefined
}

function writeAscii(buffer: Buffer, offset: number, value: string) {
  buffer.write(value, offset, value.length, 'ascii')
}

function createMockWavAudio(text: string) {
  const sampleCount = Math.max(6_400, Math.min(24_000, text.length * 360))
  const dataByteLength = sampleCount * 2
  const wav = Buffer.alloc(44 + dataByteLength)
  writeAscii(wav, 0, 'RIFF')
  wav.writeUInt32LE(36 + dataByteLength, 4)
  writeAscii(wav, 8, 'WAVE')
  writeAscii(wav, 12, 'fmt ')
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(MOCK_TTS_SAMPLE_RATE, 24)
  wav.writeUInt32LE(MOCK_TTS_SAMPLE_RATE * 2, 28)
  wav.writeUInt16LE(2, 32)
  wav.writeUInt16LE(16, 34)
  writeAscii(wav, 36, 'data')
  wav.writeUInt32LE(dataByteLength, 40)

  const seed = Number.parseInt(hashText(text || 'voice').slice(0, 4), 16)
  const frequency = 220 + (seed % 180)
  for (let index = 0; index < sampleCount; index += 1) {
    const fadeIn = Math.min(1, index / 800)
    const fadeOut = Math.min(1, (sampleCount - index) / 800)
    const envelope = Math.max(0, Math.min(fadeIn, fadeOut))
    const value = Math.round(Math.sin((index / MOCK_TTS_SAMPLE_RATE) * Math.PI * 2 * frequency) * 10_000 * envelope)
    wav.writeInt16LE(value, 44 + index * 2)
  }
  return wav
}

export class MockAiPlayerVoiceProviderAdapter implements AiPlayerVoiceProviderAdapter {
  readonly provider = MOCK_PROVIDER
  readonly providerMode = 'mock' as const

  async synthesizeSpeech(request: AiPlayerTtsRequest): Promise<AiPlayerTtsResult> {
    const normalizedText = request.text.trim()
    const audioAssetId = `mock-audio-${hashText(`${request.aiPlayerId}:${normalizedText}`)}`
    const audioBytes = createMockWavAudio(normalizedText)
    const savedAudioAsset = saveAiPlayerVoiceAudioAsset({
      provider: this.provider,
      contentType: MOCK_TTS_CONTENT_TYPE,
      bytes: audioBytes,
      audioAssetId,
    })
    return {
      speechContract: {
        contractVersion: 'ai_player_speech_contract_v1',
        provider: this.provider,
        providerKind: 'tts',
        providerMode: this.providerMode,
        status: 'succeeded',
        audioAssetId: savedAudioAsset.audioAssetId,
        contentType: MOCK_TTS_CONTENT_TYPE,
        durationMs: Math.round(((audioBytes.byteLength - 44) / 2 / MOCK_TTS_SAMPLE_RATE) * 1000),
        ...(request.voiceProfileId ? { voiceProfileId: request.voiceProfileId } : {}),
        usage: {
          characters: normalizedText.length,
          requestCount: 1,
          estimatedCostUsd: 0,
          estimatedCostSource: 'mock',
        },
      },
    }
  }

  async transcribeAudio(request: AiPlayerAsrRequest): Promise<AiPlayerAsrResult> {
    const transcriptText = normalizeTranscriptHint(request.transcriptHint) ?? MOCK_ASR_TRANSCRIPT
    const audioAssetId = request.audioAssetId ?? `mock-upload-${hashText(request.audioBase64 ?? 'audio')}`
    const usage = {
      audioSeconds: 1,
      requestCount: 1,
      estimatedCostUsd: 0,
      estimatedCostSource: 'mock' as const,
    }
    return {
      transcriptText,
      asr: {
        contractVersion: 'ai_player_asr_summary_v1',
        provider: this.provider,
        providerKind: 'asr',
        providerMode: this.providerMode,
        audioAssetId,
        transcriptText,
        usage,
      },
    }
  }
}

const mockVoiceProviderAdapter = new MockAiPlayerVoiceProviderAdapter()
const voiceProviderAdapters = new Map<string, AiPlayerVoiceProviderAdapter>()
const DEFAULT_TTS_PROVIDER_ENV = ['AI_PLAYER_VOICE_TTS_PROVIDER', 'AI_PLAYER_VOICE_PROVIDER'] as const
const DEFAULT_ASR_PROVIDER_ENV = ['AI_PLAYER_VOICE_ASR_PROVIDER', 'AI_PLAYER_VOICE_PROVIDER'] as const
export const DEFAULT_TTS_VOICE_PROVIDER_ALIAS = 'default:tts'
export const DEFAULT_ASR_VOICE_PROVIDER_ALIAS = 'default:asr'

function normalizeProviderId(provider: string) {
  return provider.trim().toLowerCase()
}

function readFirstDefaultProviderId(providerKind?: AiPlayerVoiceProviderKind) {
  const names = providerKind === 'asr' ? DEFAULT_ASR_PROVIDER_ENV : DEFAULT_TTS_PROVIDER_ENV
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) {
      return value
    }
  }
  if (providerKind === 'asr') {
    return DEFAULT_ASR_VOICE_PROVIDER_ALIAS
  }
  if (providerKind === 'tts') {
    return DEFAULT_TTS_VOICE_PROVIDER_ALIAS
  }
  return ''
}

function seedDefaultVoiceProviderAdapters() {
  voiceProviderAdapters.clear()
  voiceProviderAdapters.set(normalizeProviderId(mockVoiceProviderAdapter.provider), mockVoiceProviderAdapter)
  voiceProviderAdapters.set('mock', mockVoiceProviderAdapter)
}

seedDefaultVoiceProviderAdapters()

export function registerAiPlayerVoiceProviderAdapter(
  adapter: AiPlayerVoiceProviderAdapter,
  aliases: string[] = [],
) {
  const providerId = normalizeProviderId(adapter.provider)
  if (!providerId) {
    throw new Error('voice provider adapter provider id is required')
  }
  voiceProviderAdapters.set(providerId, adapter)
  for (const alias of aliases) {
    const normalizedAlias = normalizeProviderId(alias)
    if (normalizedAlias) {
      voiceProviderAdapters.set(normalizedAlias, adapter)
    }
  }
}

export function listAiPlayerVoiceProviderAdapterIds() {
  return Array.from(new Set(
    Array.from(voiceProviderAdapters.values()).map((adapter) => adapter.provider),
  )).sort()
}

export function resetAiPlayerVoiceProviderAdaptersForTest() {
  seedDefaultVoiceProviderAdapters()
}

export function getAiPlayerVoiceProviderAdapter(
  provider?: string,
  providerKind?: AiPlayerVoiceProviderKind,
): AiPlayerVoiceProviderAdapter {
  const resolvedProvider = provider?.trim() || readFirstDefaultProviderId(providerKind)
  const normalized = resolvedProvider ? normalizeProviderId(resolvedProvider) : ''
  if (!normalized) {
    return mockVoiceProviderAdapter
  }
  return voiceProviderAdapters.get(normalized) ?? mockVoiceProviderAdapter
}

export const MOCK_AI_PLAYER_VOICE_PROVIDER = MOCK_PROVIDER
export const MOCK_AI_PLAYER_ASR_TRANSCRIPT = MOCK_ASR_TRANSCRIPT
