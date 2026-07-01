import assert from 'node:assert/strict'
import {
  buildAiPlayerSpeechEngineServerConfig,
  buildAiPlayerSpeechReply,
  handleAiPlayerSpeechTranscript,
  selectLatestUserTranscript,
  type SpeechEngineTranscriptMessage,
} from '../src/voice/aiPlayerSpeechEngineBridge'

async function testSelectLatestUserTranscript() {
  const transcript: SpeechEngineTranscriptMessage[] = [
    { role: 'user', content: '第一句，先侦查附近。' },
    { role: 'agent', content: '收到。' },
    { role: 'user', content: '改成优先保护主城。' },
  ]

  assert.equal(selectLatestUserTranscript(transcript), '改成优先保护主城。')
}

async function testBuildReplyPrefersAiMessage() {
  const reply = buildAiPlayerSpeechReply({
    ok: true,
    userMessage: { body: '保护主城。' },
    aiMessage: { body: '总督，我会先稳住主城防线。' },
    proposalMessage: { body: '已生成提案。' },
  })

  assert.equal(reply, '总督，我会先稳住主城防线。')
}

async function testHandleTranscriptPostsChatCommand() {
  const calls: Array<{ aiPlayerId: string; body: unknown }> = []
  const reply = await handleAiPlayerSpeechTranscript({
    aiPlayerId: 'ai_shu_guard_001',
    governorPlayerId: 'governor_001',
    governorDisplayName: '主公',
    transcript: [
      { role: 'user', content: '请你先巡查主城周边，有危险就提醒我。' },
    ],
    sendChatMessage: async (aiPlayerId, body) => {
      calls.push({ aiPlayerId, body })
      return {
        ok: true,
        userMessage: { body: String((body as { body: string }).body) },
        aiMessage: { body: '主公，我会巡查主城周边，只生成建议，不会越权执行。' },
      }
    },
  })

  assert.equal(reply, '主公，我会巡查主城周边，只生成建议，不会越权执行。')
  assert.deepEqual(calls, [
    {
      aiPlayerId: 'ai_shu_guard_001',
      body: {
        body: '请你先巡查主城周边，有危险就提醒我。',
        senderId: 'governor_001',
        senderName: '主公',
        createProposal: true,
        voice: {
          mode: 'text',
          provider: 'elevenlabs-speech-engine',
          text: '请你先巡查主城周边，有危险就提醒我。',
        },
      },
    },
  ])
}

async function testHandleTranscriptRejectsEmptySpeech() {
  const reply = await handleAiPlayerSpeechTranscript({
    aiPlayerId: 'ai_shu_guard_001',
    governorPlayerId: 'governor_001',
    governorDisplayName: '主公',
    transcript: [{ role: 'agent', content: '上一轮回复。' }],
    sendChatMessage: async () => {
      throw new Error('sendChatMessage should not be called for empty user speech')
    },
  })

  assert.equal(reply, '我没有听清楚，请再说一遍。')
}

async function testBuildServerConfigRequiresSecretsAndTargets() {
  assert.deepEqual(buildAiPlayerSpeechEngineServerConfig({
    ELEVENLABS_API_KEY: '  eleven-key  ',
    ELEVENLABS_SPEECH_ENGINE_ID: '  seng_123  ',
    AI_PLAYER_SPEECH_AI_PLAYER_ID: '  ai_shu_guard_001  ',
    AI_PLAYER_SPEECH_GOVERNOR_PLAYER_ID: '  governor_001  ',
    AI_PLAYER_SPEECH_GOVERNOR_DISPLAY_NAME: '  主公  ',
    AI_PLAYER_SPEECH_BACKEND_BASE_URL: '  http://127.0.0.1:8787/  ',
    AI_PLAYER_SPEECH_ENGINE_PORT: '3001',
    AI_PLAYER_SPEECH_ENGINE_PATH: '/speech-ws',
    AI_PLAYER_SPEECH_DEBUG: '1',
  }), {
    apiKey: 'eleven-key',
    speechEngineId: 'seng_123',
    aiPlayerId: 'ai_shu_guard_001',
    governorPlayerId: 'governor_001',
    governorDisplayName: '主公',
    backendBaseUrl: 'http://127.0.0.1:8787',
    port: 3001,
    path: '/speech-ws',
    debug: true,
  })

  assert.throws(
    () => buildAiPlayerSpeechEngineServerConfig({}),
    /ELEVENLABS_API_KEY is required/,
  )
}

async function run() {
  await testSelectLatestUserTranscript()
  await testBuildReplyPrefersAiMessage()
  await testHandleTranscriptPostsChatCommand()
  await testHandleTranscriptRejectsEmptySpeech()
  await testBuildServerConfigRequiresSecretsAndTargets()
  console.log('[ai_player_speech_engine_bridge_contract] all checks passed')
}

run().catch((error) => {
  console.error('[ai_player_speech_engine_bridge_contract] failed:', error)
  process.exitCode = 1
})
