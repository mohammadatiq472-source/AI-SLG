import assert from 'node:assert/strict'
import {
  getAiPlayerVoiceProviderAdapter,
  listAiPlayerVoiceProviderAdapterIds,
  resetAiPlayerVoiceProviderAdaptersForTest,
} from '../src/voice/aiPlayerVoiceProviderAdapter'
import {
  ensureAiPlayerConfiguredVoiceProviderAdaptersRegistered,
  resetAiPlayerConfiguredVoiceProviderAdaptersForTest,
} from '../src/voice/aiPlayerConfiguredVoiceProviderAdapters'
import { readAiPlayerVoiceAudioAsset } from '../src/voice/aiPlayerVoiceAudioAssetStore'
import {
  MimoAiPlayerVoiceProviderAdapter,
  resolveMimoVoiceProviderConfig,
} from '../src/voice/adapters/aiPlayerMimoVoiceProviderAdapter'
import { aiPlayerTtsResultSchema } from '../../shared/schemas/aiPlayerVoice'

function readHeader(headers: RequestInit['headers'] | undefined, name: string) {
  if (!headers) {
    return ''
  }
  if (headers instanceof Headers) {
    return headers.get(name) ?? ''
  }
  if (Array.isArray(headers)) {
    const matched = headers.find(([key]) => key.toLowerCase() === name.toLowerCase())
    return matched?.[1] ?? ''
  }
  const matchedKey = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase())
  return matchedKey ? String((headers as Record<string, string>)[matchedKey]) : ''
}

function parseJsonBody(init: RequestInit | undefined) {
  assert.ok(init)
  const body = init.body
  if (typeof body !== 'string') {
    throw new Error('expected JSON string body')
  }
  return JSON.parse(body) as Record<string, unknown>
}

function assertNoSecretOrRawProviderPayload(value: unknown) {
  const serialized = JSON.stringify(value)
  assert.equal(serialized.includes('secret-fixture'), false)
  assert.equal(serialized.includes('providerRawResponse'), false)
  assert.equal(serialized.includes('rawProviderResponse'), false)
  assert.equal(serialized.includes('authorization'), false)
  assert.equal(serialized.includes('apiKey'), false)
}

function testMimoConfigUsesOfficialDefaultsWithOnlyApiKey() {
  const config = resolveMimoVoiceProviderConfig({
    MIMO_API_KEY: ' secret-fixture ',
  })

  assert.ok(config)
  assert.equal(config.apiKey, 'secret-fixture')
  assert.equal(config.baseUrl, 'https://api.xiaomimimo.com/v1')
  assert.equal(config.model, 'mimo-v2.5-tts')
  assert.equal(config.voice, 'mimo_default')
  assert.equal(config.format, 'wav')
}

function testMimoTokenPlanKeyDefaultsToTokenPlanBaseUrl() {
  const config = resolveMimoVoiceProviderConfig({
    MIMO_API_KEY: ' tp-token-plan-fixture ',
  })

  assert.ok(config)
  assert.equal(config.baseUrl, 'https://token-plan-cn.xiaomimimo.com/v1')
}

async function testMimoTtsPostsOfficialChatCompletionShapeAndStoresAudioAsset() {
  let capturedUrl = ''
  let capturedInit: RequestInit | undefined
  const wavBytes = Buffer.from('RIFFmimo-audio-fixture', 'utf-8')
  const fetchImpl: typeof fetch = async (input, init) => {
    capturedUrl = String(input)
    capturedInit = init
    return new Response(JSON.stringify({
      choices: [
        {
          message: {
            audio: {
              data: wavBytes.toString('base64'),
            },
          },
        },
      ],
      usage: {
        total_tokens: 9,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const adapter = new MimoAiPlayerVoiceProviderAdapter({
    apiKey: 'secret-fixture',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    model: 'mimo-v2.5-tts',
    voice: '冰糖',
    format: 'wav',
    stylePrompt: '沉稳、关切，像军师在提醒主公。',
    timeoutMs: 60_000,
  }, fetchImpl)

  const result = await adapter.synthesizeSpeech({
    aiPlayerId: 'ai_qingzhou_logistics',
    text: '主公，青州粮仓已经安排巡查。',
    voiceProfileId: 'qingzhou-default',
  })

  aiPlayerTtsResultSchema.parse(result)
  assert.equal(capturedUrl, 'https://api.xiaomimimo.com/v1/chat/completions')
  assert.equal(capturedInit?.method, 'POST')
  assert.equal(readHeader(capturedInit?.headers, 'api-key'), 'secret-fixture')
  assert.equal(readHeader(capturedInit?.headers, 'Content-Type'), 'application/json')
  const body = parseJsonBody(capturedInit)
  assert.equal(body.model, 'mimo-v2.5-tts')
  assert.deepEqual(body.audio, { format: 'wav', voice: '冰糖' })
  assert.deepEqual(body.messages, [
    {
      role: 'user',
      content: '沉稳、关切，像军师在提醒主公。',
    },
    {
      role: 'assistant',
      content: '主公，青州粮仓已经安排巡查。',
    },
  ])
  assert.equal(result.speechContract.provider, 'xiaomi.mimo')
  assert.equal(result.speechContract.providerMode, 'adapter')
  assert.equal(result.speechContract.providerKind, 'tts')
  assert.equal(result.speechContract.status, 'succeeded')
  assert.equal(result.speechContract.contentType, 'audio/wav')
  assert.equal(result.speechContract.voiceProfileId, 'qingzhou-default')
  assert.equal(result.speechContract.usage?.characters, '主公，青州粮仓已经安排巡查。'.length)
  assert.equal(result.speechContract.usage?.requestCount, 1)
  assert.equal(result.speechContract.usage?.estimatedCostSource, 'provider_reported')
  const asset = readAiPlayerVoiceAudioAsset(String(result.speechContract.audioAssetId))
  assert.ok(asset)
  assert.equal(Buffer.compare(asset.bytes, wavBytes), 0)
  assert.equal(asset.contentType, 'audio/wav')
  assertNoSecretOrRawProviderPayload(result)
}

async function testMimoTts401ReturnsFailedContractWithoutLeakingRawPayload() {
  const adapter = new MimoAiPlayerVoiceProviderAdapter({
    apiKey: 'secret-fixture',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    model: 'mimo-v2.5-tts',
    voice: 'mimo_default',
    format: 'wav',
    timeoutMs: 60_000,
  }, async () => new Response(JSON.stringify({
    error: {
      message: 'unauthorized raw provider body must not leak',
    },
  }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  }))

  const result = await adapter.synthesizeSpeech({
    aiPlayerId: 'ai_qingzhou_logistics',
    text: '这次鉴权应该失败。',
  })

  aiPlayerTtsResultSchema.parse(result)
  assert.equal(result.speechContract.provider, 'xiaomi.mimo')
  assert.equal(result.speechContract.providerMode, 'adapter')
  assert.equal(result.speechContract.status, 'failed')
  assert.equal(result.speechContract.errorCode, 'provider_http_401')
  assert.equal(result.speechContract.audioAssetId, undefined)
  assertNoSecretOrRawProviderPayload(result)
}

function testConfiguredAdaptersRegisterMimoOnlyWhenApiKeyExists() {
  resetAiPlayerVoiceProviderAdaptersForTest()
  resetAiPlayerConfiguredVoiceProviderAdaptersForTest()
  ensureAiPlayerConfiguredVoiceProviderAdaptersRegistered({})
  assert.equal(listAiPlayerVoiceProviderAdapterIds().includes('xiaomi.mimo'), false)

  resetAiPlayerConfiguredVoiceProviderAdaptersForTest()
  ensureAiPlayerConfiguredVoiceProviderAdaptersRegistered({
    MIMO_API_KEY: 'secret-fixture',
  })

  assert.equal(listAiPlayerVoiceProviderAdapterIds().includes('xiaomi.mimo'), true)
  assert.equal(getAiPlayerVoiceProviderAdapter('mimo', 'tts').provider, 'xiaomi.mimo')
  assert.equal(getAiPlayerVoiceProviderAdapter('xiaomi.mimo', 'tts').provider, 'xiaomi.mimo')
  assert.equal(getAiPlayerVoiceProviderAdapter(undefined, 'tts').provider, 'xiaomi.mimo')
  assert.equal(getAiPlayerVoiceProviderAdapter(undefined, 'asr').provider, 'mock.voice.local')
  resetAiPlayerVoiceProviderAdaptersForTest()
  resetAiPlayerConfiguredVoiceProviderAdaptersForTest()
}

async function run() {
  testMimoConfigUsesOfficialDefaultsWithOnlyApiKey()
  testMimoTokenPlanKeyDefaultsToTokenPlanBaseUrl()
  await testMimoTtsPostsOfficialChatCompletionShapeAndStoresAudioAsset()
  await testMimoTts401ReturnsFailedContractWithoutLeakingRawPayload()
  testConfiguredAdaptersRegisterMimoOnlyWhenApiKeyExists()
  console.log('[ai_player_mimo_voice_provider_adapter_contract] all checks passed')
}

run().catch((error) => {
  console.error('[ai_player_mimo_voice_provider_adapter_contract] failed:', error)
  process.exitCode = 1
})
