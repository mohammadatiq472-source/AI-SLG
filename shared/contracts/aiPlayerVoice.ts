export type AiPlayerVoiceProviderKind = 'tts' | 'asr'

export type AiPlayerVoiceProviderMode = 'mock' | 'adapter'

export type AiPlayerVoiceUsageType = 'model' | 'tts' | 'asr'

export type AiPlayerVoiceGender = 'female' | 'male' | 'neutral'

export type AiPlayerVoiceProfileSource = 'preset' | 'voice_design' | 'voice_clone'

export type AiPlayerVoiceStylePreset =
  | 'female_soft'
  | 'female_clear'
  | 'male_strategist'
  | 'male_grit'
  | 'neutral_low_ai'
  | 'voice_clone'

export type AiPlayerAutoSpeechMode = 'off' | 'auto' | 'always'

export type AiPlayerVoiceAvailabilityStatus = 'available' | 'unconfigured' | 'muted'

export type AiPlayerVoiceFallbackMode = 'configured_voice' | 'mock_audio' | 'silent'

export type AiPlayerVoiceUsage = {
  characters?: number
  audioSeconds?: number
  requestCount?: number
  estimatedCostUsd?: number
  estimatedCostSource?: 'mock' | 'provider_reported' | 'pricing_policy'
}

export type AiPlayerVoiceUsageBreakdown = Partial<Record<AiPlayerVoiceUsageType, AiPlayerVoiceUsage>>

export type AiPlayerSpeechContract = {
  contractVersion: 'ai_player_speech_contract_v1'
  provider: string
  providerKind: AiPlayerVoiceProviderKind
  providerMode: AiPlayerVoiceProviderMode
  status: 'succeeded' | 'failed' | 'skipped'
  audioAssetId?: string
  contentType?: string
  durationMs?: number
  voiceProfileId?: string
  transcriptText?: string
  usage?: AiPlayerVoiceUsage
  errorCode?: string
}

export type AiPlayerAsrSummary = {
  contractVersion: 'ai_player_asr_summary_v1'
  provider: string
  providerKind: 'asr'
  providerMode: AiPlayerVoiceProviderMode
  audioAssetId?: string
  transcriptText: string
  usage?: AiPlayerVoiceUsage
}

export type AiPlayerVoiceProfile = {
  voiceProfileId: string
  displayName: string
  provider: string
  providerMode: AiPlayerVoiceProviderMode
  gender: AiPlayerVoiceGender
  stylePreset: AiPlayerVoiceStylePreset
  source: AiPlayerVoiceProfileSource
  locale?: string
  description?: string
  clone?: {
    status: 'unavailable' | 'pending' | 'ready'
    consentRequired: true
    sampleAudioAssetId?: string
  }
  providerMetadata?: Record<string, unknown>
}

export type AiPlayerVoiceProfileSelection = {
  aiPlayerId: string
  voiceProfileId: string
  autoSpeechMode: AiPlayerAutoSpeechMode
  updatedAt: string
}

export type AiPlayerVoiceAvailability = {
  status: AiPlayerVoiceAvailabilityStatus
  label: string
  summary: string
  canPlayVoice: boolean
  fallbackMode: AiPlayerVoiceFallbackMode
}

export type UpdateAiPlayerVoiceProfileSelectionRequest = {
  voiceProfileId: string
  autoSpeechMode?: AiPlayerAutoSpeechMode
}

export type AiPlayerVoiceProfileCatalogResponse = {
  ok: true
  aiPlayerId: string
  defaultVoiceProfileId: string
  activeSelection: AiPlayerVoiceProfileSelection
  voiceAvailability: AiPlayerVoiceAvailability
  profiles: AiPlayerVoiceProfile[]
}

export type AiPlayerVoiceProfileSelectionResponse =
  | {
      ok: true
      selection: AiPlayerVoiceProfileSelection
    }
  | {
      ok: false
      error: string
    }

export type AiPlayerTtsRequest = {
  text: string
  aiPlayerId: string
  voiceProfileId?: string
  providerHint?: string
  providerVoice?: string
  stylePrompt?: string
}

export type AiPlayerTtsResult = {
  speechContract: AiPlayerSpeechContract
}

export type AiPlayerAsrRequest = {
  audioAssetId?: string
  audioBase64?: string
  contentType?: string
  providerHint?: string
  transcriptHint?: string
}

export type AiPlayerAsrResult = {
  transcriptText: string
  asr: AiPlayerAsrSummary
}

export type AiPlayerVoiceProviderAdapter = {
  provider: string
  providerMode: AiPlayerVoiceProviderMode
  synthesizeSpeech(request: AiPlayerTtsRequest): Promise<AiPlayerTtsResult>
  transcribeAudio(request: AiPlayerAsrRequest): Promise<AiPlayerAsrResult>
}

export type AiPlayerVoiceCommandRequest = {
  mode: 'text' | 'audio'
  provider?: string
  voiceProfileId?: string
  text?: string
  audioAssetId?: string
  audioBase64?: string
  contentType?: string
  transcriptHint?: string
}
