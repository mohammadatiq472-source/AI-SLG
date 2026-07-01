export type AiPlayerSpeechOutputPolicyDecision = {
  shouldSynthesize: boolean
  reason: 'explicit_voice_context' | 'speech_output_always' | 'speech_output_emotional_context' | 'speech_output_disabled'
}

const EMOTIONAL_CONTEXT_PATTERN = /难过|不开心|伤心|担心|焦虑|害怕|辛苦|撑住|坚强|鼓励|安慰|在吗|陪我|sad|unhappy|worried|strong|encourage/i

function readSpeechOutputMode() {
  const raw = process.env.AI_PLAYER_SPEECH_OUTPUT_MODE?.trim().toLowerCase()
  if (raw === 'always' || raw === 'auto') {
    return raw
  }
  return 'off'
}

export function decideAiPlayerSpeechOutputPolicy(input: {
  hasExplicitVoiceContext: boolean
  playerText: string
  aiReplyText: string
  outputMode?: 'off' | 'auto' | 'always'
}): AiPlayerSpeechOutputPolicyDecision {
  if (input.hasExplicitVoiceContext) {
    return {
      shouldSynthesize: true,
      reason: 'explicit_voice_context',
    }
  }
  const mode = input.outputMode ?? readSpeechOutputMode()
  if (mode === 'always') {
    return {
      shouldSynthesize: true,
      reason: 'speech_output_always',
    }
  }
  if (mode === 'auto') {
    const text = `${input.playerText}\n${input.aiReplyText}`
    if (EMOTIONAL_CONTEXT_PATTERN.test(text)) {
      return {
        shouldSynthesize: true,
        reason: 'speech_output_emotional_context',
      }
    }
  }
  return {
    shouldSynthesize: false,
    reason: 'speech_output_disabled',
  }
}
