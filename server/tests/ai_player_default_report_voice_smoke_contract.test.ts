import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import {
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  joinGovernor,
  registerDefaultAiPlayer,
  startAiPlayerHttpBackend,
} from './helpers/aiPlayerHttpContractHarness'
import { readArray, readObject, requestJson } from './helpers/backendHarness'

async function runDefaultReportVoiceSmokeContract() {
  const backend = await startAiPlayerHttpBackend('ai_player_default_report_voice_smoke_contract', undefined, {
    AI_PLAYER_VOICE_TTS_PROVIDER: 'mock',
    AI_PLAYER_COMBAT_DEFAULT_REPORT_VOICE_ALLOW_MOCK_AUDIO: 'true',
  })
  try {
    await joinGovernor(backend.baseUrl)
    await registerDefaultAiPlayer(backend.baseUrl)

    const profileUpdate = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/profile`, 'POST', {
      displayName: '青州后勤官',
      updatedBy: GOVERNOR_PLAYER_ID,
      runtimePolicy: {
        allowAutonomousCombatDailySummaryChatReports: true,
        allowAutonomousCombatWarEventChatReports: true,
        allowAutonomousCombatVoiceReports: true,
      },
    })
    assert.equal(profileUpdate.status, 200, `profile voice policy update failed: ${JSON.stringify(profileUpdate.data)}`)

    const seed = await requestJson(backend.baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'seedBattleReportClosure',
      payload: {
        factionId: FACTION_ID,
        aiPlayerId: AI_PLAYER_ID,
        organizationId: FACTION_ID,
        organizationName: '青州同盟',
        organizationKind: 'alliance',
        repeatCount: 8,
        allowReusableSeedTargets: true,
      },
    }, 30_000)
    assert.equal(seed.status, 200, `battle report closure seed failed: ${JSON.stringify(seed.data)}`)
    assert.equal(readObject(seed.data).ok, true)

    const summary = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/daily-summary?limit=20`,
      'GET',
      undefined,
      30_000,
    )
    assert.equal(summary.status, 200, `daily summary route failed: ${JSON.stringify(summary.data)}`)

    const chat = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat?limit=20`, 'GET')
    assert.equal(chat.status, 200, `chat read failed: ${JSON.stringify(chat.data)}`)
    const messages = readArray(readObject(chat.data).messages).map((item) => readObject(item))
    const dailyMessage = messages.find((message) => (
      String(readObject(message.metadata).source) === 'autonomous_combat_daily_summary_report'
    ))
    assert.ok(dailyMessage, 'daily summary must write one chat report for voice playback smoke')

    const metadata = readObject(dailyMessage.metadata)
    assert.equal(metadata.voicePlaybackReady, true, 'visual smoke default report must expose a playable voice asset')
    const availability = readObject(metadata.voiceAvailability)
    assert.equal(availability.canPlayVoice, true)
    assert.equal(availability.fallbackMode, 'mock_audio')
    assert.equal(JSON.stringify(availability).includes('provider'), false)
    assert.equal(JSON.stringify(availability).includes('env'), false)
    assert.equal(JSON.stringify(availability).includes('key'), false)

    const speechContract = readObject(metadata.speechContract)
    assert.equal(speechContract.status, 'succeeded')
    assert.equal(speechContract.providerKind, 'tts')
    const audioAssetId = String(speechContract.audioAssetId)
    assert.match(audioAssetId, /^mock-audio-/)

    const audio = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/voice-audio/${encodeURIComponent(audioAssetId)}`,
      'GET',
    )
    assert.equal(audio.status, 200, `voice audio download failed: ${JSON.stringify(audio.data)}`)
    const audioPayload = readObject(audio.data)
    assert.equal(audioPayload.audioAssetId, audioAssetId)
    assert.equal(audioPayload.contentType, 'audio/wav')
    const audioBytes = Buffer.from(String(audioPayload.audioBase64), 'base64')
    assert.equal(audioBytes.subarray(0, 4).toString('ascii'), 'RIFF')
    assert.equal(audioBytes.subarray(8, 12).toString('ascii'), 'WAVE')
  } finally {
    await backend.stop()
  }
}

runDefaultReportVoiceSmokeContract().then(() => {
  console.log('[ai_player_default_report_voice_smoke_contract] all checks passed')
}).catch((error) => {
  console.error('[ai_player_default_report_voice_smoke_contract] failed:', error)
  process.exitCode = 1
})
