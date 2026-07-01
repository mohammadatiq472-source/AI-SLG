import type {
  AiPlayerAutoSpeechMode,
  AiPlayerVoiceAvailability,
  AiPlayerVoiceProfile,
  AiPlayerVoiceProfileCatalogResponse,
  AiPlayerVoiceProfileSelection,
  AiPlayerVoiceProfileSelectionResponse,
  UpdateAiPlayerVoiceProfileSelectionRequest,
} from '../../../shared/contracts/aiPlayerVoice'
import type { AiPlayerRuntimePolicy } from '../../../shared/contracts/aiPlayer'
import { ensureAiPlayerConfiguredVoiceProviderAdaptersRegistered } from './aiPlayerConfiguredVoiceProviderAdapters'
import { getAiPlayerVoiceProviderAdapter } from './aiPlayerVoiceProviderAdapter'

export const DEFAULT_AI_PLAYER_VOICE_PROFILE_ID = 'male_strategist'

type AdapterVoiceProfile = {
  providerVoice: string
  stylePrompt: string
}

type InternalVoiceProfile = {
  publicProfile: AiPlayerVoiceProfile
  adapterProfile: AdapterVoiceProfile
}

const VOICE_PROFILES: InternalVoiceProfile[] = [
  {
    publicProfile: {
      voiceProfileId: 'male_strategist',
      displayName: '男声·沉稳军师',
      provider: 'adapter',
      providerMode: 'adapter',
      gender: 'male',
      stylePreset: 'male_strategist',
      source: 'preset',
      locale: 'zh-CN',
      description: '克制、稳定、像同盟军师在低声提醒。',
    },
    adapterProfile: {
      providerVoice: '苏打',
      stylePrompt: '中文男声，沉稳、克制、低AI感，像同盟军师在近距离提醒主公。句子短，不夸张表演。',
    },
  },
  {
    publicProfile: {
      voiceProfileId: 'male_grit',
      displayName: '男声·战场克制',
      provider: 'adapter',
      providerMode: 'adapter',
      gender: 'male',
      stylePreset: 'male_grit',
      source: 'preset',
      locale: 'zh-CN',
      description: '更低、更稳，适合战况、承压和防守提醒。',
    },
    adapterProfile: {
      providerVoice: '白桦',
      stylePrompt: '中文男声，低沉、克制、有战场压力但不喊叫。像老练指挥官，停顿自然，避免播音腔。',
    },
  },
  {
    publicProfile: {
      voiceProfileId: 'female_soft',
      displayName: '女声·温柔安抚',
      provider: 'adapter',
      providerMode: 'adapter',
      gender: 'female',
      stylePreset: 'female_soft',
      source: 'preset',
      locale: 'zh-CN',
      description: '温和、关切，适合玩家难过、疲惫或需要鼓励时。',
    },
    adapterProfile: {
      providerVoice: '冰糖',
      stylePrompt: '中文女声，温和、真诚、轻声安抚，像可靠同盟成员在陪玩家说话。不要机械，不要甜腻。',
    },
  },
  {
    publicProfile: {
      voiceProfileId: 'female_clear',
      displayName: '女声·清亮提醒',
      provider: 'adapter',
      providerMode: 'adapter',
      gender: 'female',
      stylePreset: 'female_clear',
      source: 'preset',
      locale: 'zh-CN',
      description: '清楚、利落，适合资源、建造和行动提醒。',
    },
    adapterProfile: {
      providerVoice: '茉莉',
      stylePrompt: '中文女声，清楚、利落、自然口语，像同盟参谋同步状态。语速中等，不要营销感。',
    },
  },
  {
    publicProfile: {
      voiceProfileId: 'neutral_low_ai',
      displayName: '中性·自然低AI感',
      provider: 'adapter',
      providerMode: 'adapter',
      gender: 'neutral',
      stylePreset: 'neutral_low_ai',
      source: 'preset',
      locale: 'zh-CN',
      description: '减少戏剧化和AI播报感，适合普通聊天。',
    },
    adapterProfile: {
      providerVoice: '苏打',
      stylePrompt: '中文自然口语，低AI感，像真实玩家简短回复。不要朗诵，不要口号，不要过度情绪。',
    },
  },
]

const profilesById = new Map(VOICE_PROFILES.map((profile) => [
  profile.publicProfile.voiceProfileId,
  profile,
]))
const selectionsByAiPlayerId = new Map<string, AiPlayerVoiceProfileSelection>()

function nowIso() {
  return new Date().toISOString()
}

function clonePublicProfile(profile: AiPlayerVoiceProfile): AiPlayerVoiceProfile {
  return JSON.parse(JSON.stringify(profile)) as AiPlayerVoiceProfile
}

function cloneSelection(selection: AiPlayerVoiceProfileSelection): AiPlayerVoiceProfileSelection {
  return { ...selection }
}

function defaultAutoSpeechMode(): AiPlayerAutoSpeechMode {
  const mode = process.env.AI_PLAYER_SPEECH_OUTPUT_MODE?.trim()
  return mode === 'always' || mode === 'auto' ? mode : 'off'
}

type VoiceProfileCatalogOptions = {
  runtimePolicy?: Partial<AiPlayerRuntimePolicy>
  allowMockAudioFallback?: boolean
}

function buildDefaultSelection(aiPlayerId: string): AiPlayerVoiceProfileSelection {
  return {
    aiPlayerId,
    voiceProfileId: DEFAULT_AI_PLAYER_VOICE_PROFILE_ID,
    autoSpeechMode: defaultAutoSpeechMode(),
    updatedAt: nowIso(),
  }
}

export function buildAiPlayerVoiceAvailability(options: VoiceProfileCatalogOptions = {}): AiPlayerVoiceAvailability {
  if (options.runtimePolicy?.allowAutonomousCombatVoiceReports !== true) {
    return {
      status: 'muted',
      label: '语音已关闭',
      summary: '该 AI 玩家当前不会自动播报战况。',
      canPlayVoice: false,
      fallbackMode: 'silent',
    }
  }
  ensureAiPlayerConfiguredVoiceProviderAdaptersRegistered()
  const adapter = getAiPlayerVoiceProviderAdapter(undefined, 'tts')
  if (adapter.providerMode === 'mock') {
    if (options.allowMockAudioFallback === true) {
      return {
        status: 'available',
        label: '语音可用',
        summary: '当前使用本地回放音频，适合验证语音播放链路。',
        canPlayVoice: true,
        fallbackMode: 'mock_audio',
      }
    }
    return {
      status: 'unconfigured',
      label: '语音未配置',
      summary: '已保留文字汇报；配置语音服务后可播放声音。',
      canPlayVoice: false,
      fallbackMode: 'silent',
    }
  }
  return {
    status: 'available',
    label: '语音可用',
    summary: '该 AI 玩家可以播放语音汇报。',
    canPlayVoice: true,
    fallbackMode: 'configured_voice',
  }
}

export function getAiPlayerVoiceProfileCatalog(
  aiPlayerId: string,
  options: VoiceProfileCatalogOptions = {},
): AiPlayerVoiceProfileCatalogResponse {
  return {
    ok: true,
    aiPlayerId,
    defaultVoiceProfileId: DEFAULT_AI_PLAYER_VOICE_PROFILE_ID,
    activeSelection: getActiveAiPlayerVoiceProfileSelection(aiPlayerId).selection,
    voiceAvailability: buildAiPlayerVoiceAvailability(options),
    profiles: VOICE_PROFILES.map((profile) => clonePublicProfile(profile.publicProfile)),
  }
}

export function getActiveAiPlayerVoiceProfileSelection(aiPlayerId: string): Extract<
  AiPlayerVoiceProfileSelectionResponse,
  { ok: true }
> {
  const existing = selectionsByAiPlayerId.get(aiPlayerId)
  const selection = existing ?? buildDefaultSelection(aiPlayerId)
  if (!existing) {
    selectionsByAiPlayerId.set(aiPlayerId, selection)
  }
  return {
    ok: true,
    selection: cloneSelection(selection),
  }
}

export function updateAiPlayerVoiceProfileSelection(
  aiPlayerId: string,
  request: UpdateAiPlayerVoiceProfileSelectionRequest,
): AiPlayerVoiceProfileSelectionResponse {
  if (!profilesById.has(request.voiceProfileId)) {
    return {
      ok: false,
      error: 'voice_profile_not_found',
    }
  }
  const current = getActiveAiPlayerVoiceProfileSelection(aiPlayerId).selection
  const selection: AiPlayerVoiceProfileSelection = {
    aiPlayerId,
    voiceProfileId: request.voiceProfileId,
    autoSpeechMode: request.autoSpeechMode ?? current.autoSpeechMode,
    updatedAt: nowIso(),
  }
  selectionsByAiPlayerId.set(aiPlayerId, selection)
  return {
    ok: true,
    selection: cloneSelection(selection),
  }
}

export function resolveAiPlayerVoiceProfileForSynthesis(voiceProfileId?: string): InternalVoiceProfile {
  const resolved = profilesById.get(voiceProfileId ?? '') ?? profilesById.get(DEFAULT_AI_PLAYER_VOICE_PROFILE_ID)
  if (!resolved) {
    throw new Error('default voice profile missing')
  }
  return {
    publicProfile: clonePublicProfile(resolved.publicProfile),
    adapterProfile: { ...resolved.adapterProfile },
  }
}

export function resetAiPlayerVoiceProfileSelectionsForTest() {
  selectionsByAiPlayerId.clear()
}
