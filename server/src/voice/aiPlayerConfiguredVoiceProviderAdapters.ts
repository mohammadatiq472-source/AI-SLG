import {
  DEFAULT_TTS_VOICE_PROVIDER_ALIAS,
  registerAiPlayerVoiceProviderAdapter,
} from './aiPlayerVoiceProviderAdapter'
import {
  createConfiguredMimoVoiceProviderAdapter,
  MIMO_VOICE_PROVIDER_ID,
} from './adapters/aiPlayerMimoVoiceProviderAdapter'

let configuredAdaptersRegistered = false

export function ensureAiPlayerConfiguredVoiceProviderAdaptersRegistered(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
) {
  if (configuredAdaptersRegistered) {
    return
  }
  configuredAdaptersRegistered = true
  const mimoAdapter = createConfiguredMimoVoiceProviderAdapter(env, fetchImpl)
  if (mimoAdapter) {
    registerAiPlayerVoiceProviderAdapter(mimoAdapter, [
      'mimo',
      MIMO_VOICE_PROVIDER_ID,
      DEFAULT_TTS_VOICE_PROVIDER_ALIAS,
    ])
  }
}

export function resetAiPlayerConfiguredVoiceProviderAdaptersForTest() {
  configuredAdaptersRegistered = false
}
