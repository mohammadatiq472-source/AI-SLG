import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  MOCK_AI_PLAYER_ASR_TRANSCRIPT,
  getAiPlayerVoiceProviderAdapter,
  MockAiPlayerVoiceProviderAdapter,
  registerAiPlayerVoiceProviderAdapter,
  resetAiPlayerVoiceProviderAdaptersForTest,
} from '../src/voice/aiPlayerVoiceProviderAdapter'
import type {
  AiPlayerAsrRequest,
  AiPlayerAsrResult,
  AiPlayerTtsRequest,
  AiPlayerTtsResult,
  AiPlayerVoiceProviderAdapter,
} from '../../shared/contracts/aiPlayerVoice'
import {
  aiPlayerAsrResultSchema,
  aiPlayerSpeechContractSchema,
  aiPlayerTtsResultSchema,
} from '../../shared/schemas/aiPlayerVoice'

class AcmeVoiceProviderAdapter implements AiPlayerVoiceProviderAdapter {
  readonly provider = 'acme.voice.local'
  readonly providerMode = 'adapter' as const

  async synthesizeSpeech(request: AiPlayerTtsRequest): Promise<AiPlayerTtsResult> {
    return {
      speechContract: {
        contractVersion: 'ai_player_speech_contract_v1',
        provider: this.provider,
        providerKind: 'tts',
        providerMode: this.providerMode,
        status: 'succeeded',
        audioAssetId: `acme-audio-${request.aiPlayerId}`,
        usage: {
          characters: request.text.length,
          requestCount: 1,
        },
      },
    }
  }

  async transcribeAudio(_request: AiPlayerAsrRequest): Promise<AiPlayerAsrResult> {
    return {
      transcriptText: '通用供应商转写文本。',
      asr: {
        contractVersion: 'ai_player_asr_summary_v1',
        provider: this.provider,
        providerKind: 'asr',
        providerMode: this.providerMode,
        transcriptText: '通用供应商转写文本。',
      },
    }
  }
}

async function testMockTtsProducesProviderAgnosticSpeechContract() {
  const adapter = new MockAiPlayerVoiceProviderAdapter()
  const result = await adapter.synthesizeSpeech({
    aiPlayerId: 'ai_shu_guard_001',
    text: '主公，我会先巡查主城周边。',
    voiceProfileId: 'voice_shu_guard_default',
  })

  aiPlayerTtsResultSchema.parse(result)
  aiPlayerSpeechContractSchema.parse(result.speechContract)
  assert.equal(result.speechContract.provider, 'mock.voice.local')
  assert.equal(result.speechContract.providerKind, 'tts')
  assert.equal(result.speechContract.providerMode, 'mock')
  assert.equal(result.speechContract.status, 'succeeded')
  assert.match(String(result.speechContract.audioAssetId), /^mock-audio-/)
  assert.equal(result.speechContract.voiceProfileId, 'voice_shu_guard_default')
  assert.equal(result.speechContract.usage?.characters, '主公，我会先巡查主城周边。'.length)
  assert.equal(result.speechContract.usage?.estimatedCostSource, 'mock')
}

async function testMockAsrProducesSafeTranscriptSummary() {
  const adapter = new MockAiPlayerVoiceProviderAdapter()
  const result = await adapter.transcribeAudio({
    audioAssetId: 'upload_voice_001',
    contentType: 'audio/wav',
  })

  aiPlayerAsrResultSchema.parse(result)
  assert.equal(result.transcriptText, MOCK_AI_PLAYER_ASR_TRANSCRIPT)
  assert.equal(result.asr.provider, 'mock.voice.local')
  assert.equal(result.asr.providerKind, 'asr')
  assert.equal(result.asr.providerMode, 'mock')
  assert.equal(result.asr.audioAssetId, 'upload_voice_001')
  assert.equal(result.asr.usage?.audioSeconds, 1)
}

async function testSpeechContractRejectsRawProviderPayload() {
  assert.throws(
    () => aiPlayerSpeechContractSchema.parse({
      contractVersion: 'ai_player_speech_contract_v1',
      provider: 'mock.voice.local',
      providerKind: 'tts',
      providerMode: 'mock',
      status: 'succeeded',
      audioAssetId: 'mock-audio-safe',
      providerRawResponse: { secret: 'must-not-leak' },
    }),
    /Unrecognized key/,
  )
}

async function testVoiceProviderRegistrySelectsArbitraryAdapterWithoutCoreVendorCoupling() {
  resetAiPlayerVoiceProviderAdaptersForTest()
  registerAiPlayerVoiceProviderAdapter(new AcmeVoiceProviderAdapter())

  const selected = getAiPlayerVoiceProviderAdapter('acme.voice.local')
  const result = await selected.synthesizeSpeech({
    aiPlayerId: 'ai_shu_guard_001',
    text: '这条语音由可替换供应商合成。',
  })

  assert.equal(result.speechContract.provider, 'acme.voice.local')
  assert.equal(result.speechContract.providerMode, 'adapter')
  assert.equal(result.speechContract.providerKind, 'tts')
  assert.match(String(result.speechContract.audioAssetId), /^acme-audio-/)

  const fallback = getAiPlayerVoiceProviderAdapter('unknown.expensive.vendor')
  assert.equal(fallback.provider, 'mock.voice.local')
  resetAiPlayerVoiceProviderAdaptersForTest()
}

function testCoreVoiceFilesDoNotContainXiaomiOrMimoTerms() {
  const coreFiles = [
    'shared/contracts/aiPlayerVoice.ts',
    'shared/schemas/aiPlayerVoice.ts',
    'shared/contracts/aiPlayerChat.ts',
    'shared/schemas/aiPlayerChat.ts',
    'server/src/routes/aiPlayerChatRoutes.ts',
    'server/src/application/ai/aiPlayerChatCommandService.ts',
    'server/src/application/ai/aiPlayerProviderAccountStore.ts',
    'server/src/voice/aiPlayerVoiceProviderAdapter.ts',
  ]
  const vendorPattern = /xiaomi|mimo|MIMO_API_KEY|MIMO_BASE_URL|mimo-v/i
  for (const relative of coreFiles) {
    const text = readFileSync(join(process.cwd(), relative), 'utf-8')
    assert.equal(vendorPattern.test(text), false, `${relative} must stay provider-agnostic`)
  }
}

async function run() {
  await testMockTtsProducesProviderAgnosticSpeechContract()
  await testMockAsrProducesSafeTranscriptSummary()
  await testSpeechContractRejectsRawProviderPayload()
  await testVoiceProviderRegistrySelectsArbitraryAdapterWithoutCoreVendorCoupling()
  testCoreVoiceFilesDoNotContainXiaomiOrMimoTerms()
  console.log('[ai_player_voice_provider_adapter_contract] all checks passed')
}

run().catch((error) => {
  console.error('[ai_player_voice_provider_adapter_contract] failed:', error)
  process.exitCode = 1
})
