import assert from 'node:assert/strict'
import {
  getAiPlayerVoiceProfileCatalog,
  getActiveAiPlayerVoiceProfileSelection,
  resolveAiPlayerVoiceProfileForSynthesis,
  updateAiPlayerVoiceProfileSelection,
} from '../src/voice/aiPlayerVoiceProfileStore'
import {
  aiPlayerVoiceProfileCatalogResponseSchema,
  aiPlayerVoiceProfileSelectionResponseSchema,
  aiPlayerVoiceProfileSchema,
} from '../../shared/schemas/aiPlayerVoice'

function testCatalogExposesProviderAgnosticMaleFemaleProfiles() {
  const catalog = getAiPlayerVoiceProfileCatalog('player_operator_alpha')

  aiPlayerVoiceProfileCatalogResponseSchema.parse(catalog)
  assert.equal(catalog.ok, true)
  assert.equal(catalog.defaultVoiceProfileId, 'male_strategist')
  assert.equal(catalog.profiles.some((profile) => profile.gender === 'male'), true)
  assert.equal(catalog.profiles.some((profile) => profile.gender === 'female'), true)
  assert.equal(catalog.profiles.some((profile) => profile.voiceProfileId === 'male_grit'), true)
  assert.equal(catalog.profiles.some((profile) => profile.voiceProfileId === 'female_soft'), true)
  assert.equal(JSON.stringify(catalog).includes('MIMO_API_KEY'), false)
  assert.equal(JSON.stringify(catalog).includes('apiKey'), false)
  assert.equal(JSON.stringify(catalog).includes('base64'), false)
}

function testProfileSchemaRejectsRawClonePayload() {
  assert.throws(
    () => aiPlayerVoiceProfileSchema.parse({
      voiceProfileId: 'unsafe_clone',
      displayName: 'Unsafe clone',
      provider: 'adapter',
      providerMode: 'adapter',
      gender: 'male',
      stylePreset: 'voice_clone',
      source: 'voice_clone',
      clone: {
        status: 'ready',
        consentRequired: true,
        sampleAudioAssetId: 'voice-sample-001',
      },
      audioBase64: 'must-not-leak',
    }),
    /Unrecognized key/,
  )
}

function testSelectionStoresActiveProfileAndAutoSpeechMode() {
  const updated = updateAiPlayerVoiceProfileSelection('player_operator_alpha', {
    voiceProfileId: 'female_soft',
    autoSpeechMode: 'auto',
  })

  aiPlayerVoiceProfileSelectionResponseSchema.parse(updated)
  assert.equal(updated.ok, true)
  assert.equal(updated.selection.voiceProfileId, 'female_soft')
  assert.equal(updated.selection.autoSpeechMode, 'auto')

  const active = getActiveAiPlayerVoiceProfileSelection('player_operator_alpha')
  assert.equal(active.selection.voiceProfileId, 'female_soft')
  assert.equal(active.selection.autoSpeechMode, 'auto')
}

function testSynthesisMappingKeepsVendorDetailsOutOfSharedProfile() {
  const profile = resolveAiPlayerVoiceProfileForSynthesis('male_grit')

  assert.equal(profile.publicProfile.voiceProfileId, 'male_grit')
  assert.equal(profile.publicProfile.gender, 'male')
  assert.equal(profile.publicProfile.source, 'preset')
  assert.equal(profile.adapterProfile.providerVoice, '白桦')
  assert.match(profile.adapterProfile.stylePrompt, /克制/)
  assert.equal(JSON.stringify(profile.publicProfile).includes('白桦'), false)
}

function run() {
  testCatalogExposesProviderAgnosticMaleFemaleProfiles()
  testProfileSchemaRejectsRawClonePayload()
  testSelectionStoresActiveProfileAndAutoSpeechMode()
  testSynthesisMappingKeepsVendorDetailsOutOfSharedProfile()
  console.log('[ai_player_voice_profile_contract] all checks passed')
}

run()
