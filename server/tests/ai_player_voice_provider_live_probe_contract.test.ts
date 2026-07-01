import assert from 'node:assert/strict'
import {
  probeAiPlayerDeepSeekApi,
  probeAiPlayerMimoTts,
  resolveAiPlayerDeepSeekProbeConfig,
} from '../src/voice/aiPlayerVoiceProviderLiveProbe'
import { ensureAiPlayerConfiguredVoiceProviderAdaptersRegistered, resetAiPlayerConfiguredVoiceProviderAdaptersForTest } from '../src/voice/aiPlayerConfiguredVoiceProviderAdapters'
import { resetAiPlayerVoiceProviderAdaptersForTest } from '../src/voice/aiPlayerVoiceProviderAdapter'
import { buildAiPlayerVoiceAvailability } from '../src/voice/aiPlayerVoiceProfileStore'

function testDeepSeekProbeConfigUsesBackendCompatibleKeyPriority() {
  const config = resolveAiPlayerDeepSeekProbeConfig({
    DEEPSEEK_API_KEY: 'official-only-key',
    LLM_RELAY_API_KEY: 'relay-key',
    AI_PLAYER_RUNTIME_MODEL_API_KEY: 'runtime-key',
  })

  assert.ok(config)
  assert.equal(config.keySource, 'AI_PLAYER_RUNTIME_MODEL_API_KEY')
  assert.equal(config.publicConfig.baseUrl, 'https://api.deepseek.com')
  assert.equal(config.publicConfig.model, 'deepseek-v4-flash')
  assert.equal(JSON.stringify(config.publicConfig).includes('runtime-key'), false)
}

async function testDeepSeekProbeSkipsWhenKeyMissing() {
  const result = await probeAiPlayerDeepSeekApi({ env: {} })

  assert.equal(result.ok, false)
  assert.equal(result.skipped, true)
  assert.equal(result.reason, 'missing_deepseek_api_key')
  assert.equal(JSON.stringify(result).includes('apiKey'), false)
}

async function testDeepSeekProbeCallsOfficialChatCompletionsWithoutLeakingKey() {
  let capturedUrl = ''
  let capturedInit: RequestInit | undefined
  const result = await probeAiPlayerDeepSeekApi({
    env: {
      DEEPSEEK_API_KEY: 'official-only-key',
      AI_PLAYER_RUNTIME_MODEL_BASE_URL: 'https://api.deepseek.com/v1',
      AI_PLAYER_RUNTIME_MODEL: 'deepseek-v4-flash',
    },
    fetchImpl: async (input, init) => {
      capturedUrl = String(input)
      capturedInit = init
      return new Response(JSON.stringify({
        choices: [
          {
            message: {
              content: 'ok',
            },
          },
        ],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    },
  })

  assert.equal(result.ok, true)
  assert.equal(result.skipped, false)
  assert.equal(capturedUrl, 'https://api.deepseek.com/v1/chat/completions')
  assert.equal((capturedInit?.headers as Record<string, string>).Authorization, 'Bearer official-only-key')
  assert.equal(JSON.stringify(result).includes('official-only-key'), false)
}

async function testMimoProbeSkipsWithoutKeyAndStoresAudioWhenReady() {
  const skipped = await probeAiPlayerMimoTts({ env: {} })
  assert.equal(skipped.ok, false)
  assert.equal(skipped.skipped, true)
  assert.equal(skipped.reason, 'missing_mimo_api_key')

  const ready = await probeAiPlayerMimoTts({
    env: {
      MIMO_API_KEY: 'secret-fixture',
    },
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            audio: {
              data: Buffer.from('RIFFprobe-audio', 'utf-8').toString('base64'),
            },
          },
        },
      ],
      usage: {
        total_tokens: 3,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  })

  assert.equal(ready.ok, true)
  assert.equal(ready.skipped, false)
  assert.match(String(ready.audioAssetId), /^voice-audio-/)
  assert.equal(ready.contentType, 'audio/wav')
  assert.equal(ready.byteLength, Buffer.from('RIFFprobe-audio', 'utf-8').byteLength)
  assert.equal(JSON.stringify(ready).includes('secret-fixture'), false)
}

function testVoiceAvailabilityUsesPublicPlayerFacingStateOnly() {
  resetAiPlayerConfiguredVoiceProviderAdaptersForTest()
  resetAiPlayerVoiceProviderAdaptersForTest()
  const muted = buildAiPlayerVoiceAvailability({
    runtimePolicy: {
      allowAutonomousCombatVoiceReports: false,
    },
  })
  assert.equal(muted.status, 'muted')
  assert.equal(muted.label, '语音已关闭')
  assert.equal(muted.canPlayVoice, false)
  assert.equal(JSON.stringify(muted).includes('provider'), false)

  resetAiPlayerConfiguredVoiceProviderAdaptersForTest()
  resetAiPlayerVoiceProviderAdaptersForTest()
  const unconfigured = buildAiPlayerVoiceAvailability({
    runtimePolicy: {
      allowAutonomousCombatVoiceReports: true,
    },
  })
  assert.equal(unconfigured.status, 'unconfigured')
  assert.equal(unconfigured.label, '语音未配置')
  assert.equal(unconfigured.canPlayVoice, false)
  assert.equal(JSON.stringify(unconfigured).includes('MIMO_API_KEY'), false)

  resetAiPlayerConfiguredVoiceProviderAdaptersForTest()
  resetAiPlayerVoiceProviderAdaptersForTest()
  ensureAiPlayerConfiguredVoiceProviderAdaptersRegistered({
    MIMO_API_KEY: 'secret-fixture',
  })
  const available = buildAiPlayerVoiceAvailability({
    runtimePolicy: {
      allowAutonomousCombatVoiceReports: true,
    },
  })
  assert.equal(available.status, 'available')
  assert.equal(available.label, '语音可用')
  assert.equal(available.canPlayVoice, true)
  assert.equal(JSON.stringify(available).includes('secret-fixture'), false)

  resetAiPlayerConfiguredVoiceProviderAdaptersForTest()
  resetAiPlayerVoiceProviderAdaptersForTest()
}

async function run() {
  testDeepSeekProbeConfigUsesBackendCompatibleKeyPriority()
  await testDeepSeekProbeSkipsWhenKeyMissing()
  await testDeepSeekProbeCallsOfficialChatCompletionsWithoutLeakingKey()
  await testMimoProbeSkipsWithoutKeyAndStoresAudioWhenReady()
  testVoiceAvailabilityUsesPublicPlayerFacingStateOnly()
  console.log('[ai_player_voice_provider_live_probe_contract] all checks passed')
}

run().catch((error) => {
  console.error('[ai_player_voice_provider_live_probe_contract] failed:', error)
  process.exitCode = 1
})
