import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import {
  bootRegisteredAiPlayer,
  AI_PLAYER_ID,
  GOVERNOR_PLAYER_ID,
  startAiPlayerHttpBackend,
  joinGovernor,
  registerDefaultAiPlayer,
} from './helpers/aiPlayerHttpContractHarness'
import { readArray, readObject, requestJson } from './helpers/backendHarness'

async function testVoiceCommandUsesChatMessageContract() {
  const backend = await bootRegisteredAiPlayer('ai_player_http_chat_voice_command_contract')
  try {
    const sent = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/voice-command`, 'POST', {
      body: '请先记录这条语音命令，暂时不要生成提案。',
      senderId: GOVERNOR_PLAYER_ID,
      senderName: '语音总督',
      createProposal: false,
    })

    assert.equal(sent.status, 200, `voice command failed: ${JSON.stringify(sent.data)}`)
    const sentPayload = readObject(sent.data)
    assert.equal(sentPayload.ok, true)
    assert.equal(sentPayload.proposal, undefined)
    assert.equal(sentPayload.proposalMessage, undefined)

    const userMessage = readObject(sentPayload.message)
    assert.equal(userMessage.kind, 'message')
    assert.equal(userMessage.authorType, 'governor')
    assert.equal(userMessage.authorId, GOVERNOR_PLAYER_ID)
    assert.equal(userMessage.authorName, '语音总督')
    assert.equal(userMessage.body, '请先记录这条语音命令，暂时不要生成提案。')

    const aiMessage = readObject(sentPayload.aiMessage)
    assert.equal(aiMessage.kind, 'message')
    assert.equal(aiMessage.authorType, 'ai')
    assert.equal(aiMessage.body, '收到，我会把这条命令记录到当前 AI 频道。')

    const history = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20&readerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
    )
    assert.equal(history.status, 200, `voice command history failed: ${JSON.stringify(history.data)}`)
    const historyPayload = readObject(history.data)
    const messages = readArray(historyPayload.messages).map((item) => readObject(item))
    assert.equal(messages.length, 2)
    assert.deepEqual(messages.map((message) => message.body), [
      '请先记录这条语音命令，暂时不要生成提案。',
      '收到，我会把这条命令记录到当前 AI 频道。',
    ])
    assert.equal(readObject(historyPayload.historyCounts).command, 1)
  } finally {
    await backend.stop()
  }
}

async function testVoiceCommandRejectsInvalidPayload() {
  const backend = await bootRegisteredAiPlayer('ai_player_http_chat_voice_command_invalid_contract')
  try {
    const sent = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/voice-command`, 'POST', {
      body: '',
      senderId: GOVERNOR_PLAYER_ID,
    })

    assert.equal(sent.status, 422, `invalid voice command should fail schema validation: ${JSON.stringify(sent.data)}`)
    assert.equal(readObject(sent.data).ok, false)
  } finally {
    await backend.stop()
  }
}

function assertNoRawVoicePayload(value: unknown) {
  const serialized = JSON.stringify(value)
  assert.equal(serialized.includes('providerRawResponse'), false)
  assert.equal(serialized.includes('rawProviderResponse'), false)
  assert.equal(serialized.includes('worldActionPayload'), false)
  assert.equal(serialized.includes('rawWorldActionPayload'), false)
  assert.equal(serialized.includes('apiKey'), false)
  assert.equal(serialized.includes('authorization'), false)
}

async function assertVoiceAudioAssetDownload(baseUrl: string, audioAssetId: string) {
  const downloaded = await requestJson(
    baseUrl,
    `/api/ai/players/${AI_PLAYER_ID}/chat/voice-audio/${encodeURIComponent(audioAssetId)}`,
    'GET',
  )
  assert.equal(downloaded.status, 200, `voice audio asset download failed: ${JSON.stringify(downloaded.data)}`)
  const payload = readObject(downloaded.data)
  assert.equal(payload.ok, true)
  assert.equal(payload.audioAssetId, audioAssetId)
  assert.equal(payload.contentType, 'audio/wav')
  assert.ok(Number(payload.byteLength) > 44, 'voice audio asset should include a WAV header and data')
  const audioBytes = Buffer.from(String(payload.audioBase64), 'base64')
  assert.equal(audioBytes.subarray(0, 4).toString('ascii'), 'RIFF')
  assert.equal(audioBytes.subarray(8, 12).toString('ascii'), 'WAVE')
  assertNoRawVoicePayload(downloaded.data)
}

async function testAudioVoiceCommandRunsMockAsrAndUsesGovernedProposalChain() {
  const backend = await bootRegisteredAiPlayer('ai_player_http_chat_voice_command_audio_contract')
  try {
    const sent = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/voice-command`, 'POST', {
      senderId: GOVERNOR_PLAYER_ID,
      senderName: '语音总督',
      createProposal: true,
      voice: {
        mode: 'audio',
        provider: 'mock',
        audioAssetId: 'upload_voice_tax_building_001',
      },
    })

    assert.equal(sent.status, 200, `audio voice command failed: ${JSON.stringify(sent.data)}`)
    const sentPayload = readObject(sent.data)
    assert.equal(sentPayload.ok, true)

    const userMessage = readObject(sentPayload.message)
    assert.equal(userMessage.body, '青州后勤官，升级税务建筑。')
    const userMetadata = readObject(userMessage.metadata)
    assert.equal(userMetadata.source, 'voice_command_audio')
    assert.equal(userMetadata.usageType, 'asr')
    assert.equal(readObject(userMetadata.asr).provider, 'mock.voice.local')
    assert.equal(readObject(userMetadata.asr).transcriptText, '青州后勤官，升级税务建筑。')

    const proposal = readObject(sentPayload.proposal)
    assert.equal(proposal.action, 'building_upgrade')
    assert.equal(proposal.status, 'pending_approval')
    assert.notEqual(proposal.action, 'hero_level_upgrade')
    const proposalMessage = readObject(sentPayload.proposalMessage)
    const proposalMetadata = readObject(proposalMessage.metadata)
    const proposalSpeechContract = readObject(proposalMetadata.speechContract)
    assert.equal(proposalSpeechContract.providerKind, 'tts')
    const proposalAudioAssetId = String(proposalSpeechContract.audioAssetId)
    assert.match(proposalAudioAssetId, /^mock-audio-/)
    await assertVoiceAudioAssetDownload(backend.baseUrl, proposalAudioAssetId)
    assert.equal(readObject(readObject(proposalMetadata.usageBreakdown).asr).audioSeconds, 1)
    assert.equal(readObject(readObject(proposalMetadata.usageBreakdown).tts).estimatedCostSource, 'mock')
    assertNoRawVoicePayload(sent.data)

    const proposalId = String(proposal.proposalId)
    const approve = await requestJson(backend.baseUrl, `/api/ai/players/proposals/${proposalId}/approve`, 'POST', {
      approvedBy: GOVERNOR_PLAYER_ID,
    })
    assert.equal(approve.status, 200, `audio voice proposal approve failed: ${JSON.stringify(approve.data)}`)

    const execute = await requestJson(backend.baseUrl, `/api/ai/players/proposals/${proposalId}/execute`, 'POST', {
      executedBy: GOVERNOR_PLAYER_ID,
      includeWorld: false,
    }, 60_000)
    assert.equal(execute.status, 200, `audio voice proposal execute failed: ${JSON.stringify(execute.data)}`)
    const receipt = readObject(readObject(execute.data).receipt)
    assert.equal(receipt.action, 'building_upgrade')

    const receiptHistory = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20&filter=receipt`,
      'GET',
    )
    assert.equal(receiptHistory.status, 200, `audio voice receipt history failed: ${JSON.stringify(receiptHistory.data)}`)
    const receiptMessages = readArray(readObject(receiptHistory.data).messages).map((item) => readObject(item))
    assert.equal(receiptMessages.some((item) => item.receiptProposalId === proposalId), true)
    const receiptChatMessage = receiptMessages.find((item) => item.receiptProposalId === proposalId)
    assertNoRawVoicePayload(readObject(receiptChatMessage?.metadata))
  } finally {
    await backend.stop()
  }
}

async function testTextChatAutoSpeechPolicyCanSynthesizeWithoutExplicitVoiceRequest() {
  const backend = await startAiPlayerHttpBackend('ai_player_http_chat_auto_speech_contract', undefined, {
    AI_PLAYER_SPEECH_OUTPUT_MODE: 'auto',
    AI_PLAYER_VOICE_TTS_PROVIDER: 'mock',
  })
  try {
    await joinGovernor(backend.baseUrl)
    await registerDefaultAiPlayer(backend.baseUrl)
    const sent = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages`, 'POST', {
      body: '我有点难过，但我现在很坚强。',
      senderId: GOVERNOR_PLAYER_ID,
      senderName: '语音总督',
      createProposal: false,
    })

    assert.equal(sent.status, 200, `auto speech text chat failed: ${JSON.stringify(sent.data)}`)
    const aiMessage = readObject(readObject(sent.data).aiMessage)
    const metadata = readObject(aiMessage.metadata)
    assert.equal(metadata.source, 'ai_player_speech_output')
    assert.equal(metadata.speechPolicyReason, 'speech_output_emotional_context')
    assert.equal(readObject(metadata.speechContract).provider, 'mock.voice.local')
    assert.equal(readObject(metadata.speechContract).providerKind, 'tts')
    assert.match(String(readObject(metadata.speechContract).audioAssetId), /^mock-audio-/)
    assertNoRawVoicePayload(sent.data)
  } finally {
    await backend.stop()
  }
}

async function testVoiceProfileCatalogAndSelectionRoute() {
  const backend = await bootRegisteredAiPlayer('ai_player_http_chat_voice_profile_contract')
  try {
    const catalog = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/voice-profile`,
      'GET',
    )
    assert.equal(catalog.status, 200, `voice profile catalog failed: ${JSON.stringify(catalog.data)}`)
    const catalogPayload = readObject(catalog.data)
    assert.equal(catalogPayload.ok, true)
    assert.equal(catalogPayload.defaultVoiceProfileId, 'male_strategist')
    const defaultVoiceAvailability = readObject(catalogPayload.voiceAvailability)
    assert.equal(defaultVoiceAvailability.status, 'muted')
    assert.equal(defaultVoiceAvailability.label, '语音已关闭')
    assert.equal(defaultVoiceAvailability.canPlayVoice, false)
    assert.equal(JSON.stringify(defaultVoiceAvailability).includes('provider'), false)
    assert.equal(JSON.stringify(defaultVoiceAvailability).includes('MIMO_API_KEY'), false)
    const profiles = readArray(catalogPayload.profiles).map((item) => readObject(item))
    assert.equal(profiles.some((profile) => profile.voiceProfileId === 'male_grit' && profile.gender === 'male'), true)
    assert.equal(profiles.some((profile) => profile.voiceProfileId === 'female_soft' && profile.gender === 'female'), true)
    assertNoRawVoicePayload(catalog.data)
    assert.equal(JSON.stringify(catalog.data).includes('白桦'), false)

    const updated = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/voice-profile`,
      'POST',
      {
        voiceProfileId: 'male_grit',
        autoSpeechMode: 'auto',
      },
    )
    assert.equal(updated.status, 200, `voice profile update failed: ${JSON.stringify(updated.data)}`)
    const selection = readObject(readObject(updated.data).selection)
    assert.equal(selection.voiceProfileId, 'male_grit')
    assert.equal(selection.autoSpeechMode, 'auto')

    const enabledVoicePolicy = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/profile`,
      'POST',
      {
        updatedBy: GOVERNOR_PLAYER_ID,
        runtimePolicy: {
          allowAutonomousCombatVoiceReports: true,
        },
      },
    )
    assert.equal(enabledVoicePolicy.status, 200, `voice runtime policy update failed: ${JSON.stringify(enabledVoicePolicy.data)}`)
    const unconfiguredCatalog = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/voice-profile`,
      'GET',
    )
    assert.equal(unconfiguredCatalog.status, 200)
    const unconfiguredAvailability = readObject(readObject(unconfiguredCatalog.data).voiceAvailability)
    assert.equal(unconfiguredAvailability.status, 'unconfigured')
    assert.equal(unconfiguredAvailability.label, '语音未配置')
    assert.equal(unconfiguredAvailability.canPlayVoice, false)
    assert.equal(unconfiguredAvailability.fallbackMode, 'silent')
    assert.equal(JSON.stringify(unconfiguredAvailability).includes('provider'), false)
    assert.equal(JSON.stringify(unconfiguredAvailability).includes('env'), false)
    assert.equal(JSON.stringify(unconfiguredAvailability).includes('key'), false)

    const sent = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages`, 'POST', {
      body: '我有点担心粮草，但我还撑得住。',
      senderId: GOVERNOR_PLAYER_ID,
      senderName: '语音总督',
      createProposal: false,
    })
    assert.equal(sent.status, 200, `voice profile auto speech failed: ${JSON.stringify(sent.data)}`)
    const aiMessage = readObject(readObject(sent.data).aiMessage)
    const metadata = readObject(aiMessage.metadata)
    assert.equal(metadata.source, 'ai_player_speech_output')
    assert.equal(readObject(metadata.speechContract).voiceProfileId, 'male_grit')
  } finally {
    await backend.stop()
  }
}

async function run() {
  await testVoiceCommandUsesChatMessageContract()
  await testVoiceCommandRejectsInvalidPayload()
  await testAudioVoiceCommandRunsMockAsrAndUsesGovernedProposalChain()
  await testTextChatAutoSpeechPolicyCanSynthesizeWithoutExplicitVoiceRequest()
  await testVoiceProfileCatalogAndSelectionRoute()
  console.log('[ai_player_http_chat_voice_command_contract] all checks passed')
}

run().catch((error) => {
  console.error('[ai_player_http_chat_voice_command_contract] failed:', error)
  process.exitCode = 1
})
