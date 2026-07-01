import assert from 'node:assert/strict'
import {
  aiPlayerChatMessageSchema,
  aiPlayerChatVoiceMetadataSchema,
} from '../../shared/schemas/aiPlayerChat'

function buildSafeVoiceMetadata() {
  return {
    source: 'voice_command_audio',
    usageType: 'asr',
    usageBreakdown: {
      asr: {
        audioSeconds: 1,
        requestCount: 1,
        estimatedCostUsd: 0,
        estimatedCostSource: 'mock',
      },
      tts: {
        characters: 18,
        requestCount: 1,
        estimatedCostUsd: 0,
        estimatedCostSource: 'mock',
      },
    },
    asr: {
      contractVersion: 'ai_player_asr_summary_v1',
      provider: 'mock.voice.local',
      providerKind: 'asr',
      providerMode: 'mock',
      audioAssetId: 'upload_voice_001',
      transcriptText: '青州后勤官，升级税务建筑。',
      usage: {
        audioSeconds: 1,
        requestCount: 1,
        estimatedCostUsd: 0,
        estimatedCostSource: 'mock',
      },
    },
    speechContract: {
      contractVersion: 'ai_player_speech_contract_v1',
      provider: 'mock.voice.local',
      providerKind: 'tts',
      providerMode: 'mock',
      status: 'succeeded',
      audioAssetId: 'mock-audio-safe',
      contentType: 'audio/mock',
      usage: {
        characters: 18,
        requestCount: 1,
        estimatedCostUsd: 0,
        estimatedCostSource: 'mock',
      },
    },
  }
}

function testVoiceMetadataAcceptsOnlySafeSpeechAndAsrSummaries() {
  const parsed = aiPlayerChatVoiceMetadataSchema.parse(buildSafeVoiceMetadata())
  assert.equal(parsed.source, 'voice_command_audio')
  assert.equal(parsed.usageType, 'asr')
  assert.equal(parsed.asr?.transcriptText, '青州后勤官，升级税务建筑。')
  assert.equal(parsed.speechContract?.audioAssetId, 'mock-audio-safe')
}

function testVoiceMetadataRejectsRawProviderAndWorldPayloads() {
  assert.throws(
    () => aiPlayerChatVoiceMetadataSchema.parse({
      ...buildSafeVoiceMetadata(),
      providerRawResponse: { token: 'not allowed' },
    }),
    /providerRawResponse/,
  )
  assert.throws(
    () => aiPlayerChatVoiceMetadataSchema.parse({
      ...buildSafeVoiceMetadata(),
      worldActionPayload: { action: 'upgradeHeroLevel' },
    }),
    /worldActionPayload/,
  )
}

function testChatMessageSchemaRejectsUnsafeMetadataKeys() {
  const safeMessage = {
    messageId: 'msg_voice_safe',
    aiPlayerId: 'ai_shu_guard_001',
    channelId: 'ai:ai_shu_guard_001',
    kind: 'message',
    authorType: 'ai',
    authorId: 'ai_shu_guard_001',
    authorName: '青州后勤官',
    body: '收到，我会按审批链路处理。',
    createdAt: '2026-05-29T00:00:00.000Z',
    metadata: buildSafeVoiceMetadata(),
  }

  aiPlayerChatMessageSchema.parse(safeMessage)
  assert.throws(
    () => aiPlayerChatMessageSchema.parse({
      ...safeMessage,
      metadata: {
        ...buildSafeVoiceMetadata(),
        rawProviderResponse: { id: 'provider-secret' },
      },
    }),
    /rawProviderResponse/,
  )
}

function run() {
  testVoiceMetadataAcceptsOnlySafeSpeechAndAsrSummaries()
  testVoiceMetadataRejectsRawProviderAndWorldPayloads()
  testChatMessageSchemaRejectsUnsafeMetadataKeys()
  console.log('[ai_player_speech_contract_metadata] all checks passed')
}

run()

