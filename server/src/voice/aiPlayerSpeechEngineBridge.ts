import type { SendAiPlayerChatMessageRequest } from '../../../shared/contracts/aiPlayerChat'

export type SpeechEngineTranscriptMessage = {
  role: 'user' | 'agent'
  content: string
}

export type AiPlayerSpeechChatResult = {
  ok?: boolean
  userMessage?: { body?: unknown }
  aiMessage?: { body?: unknown }
  proposalMessage?: { body?: unknown }
  proactiveMessage?: { body?: unknown }
  error?: unknown
}

export type SendAiPlayerSpeechChatMessage = (
  aiPlayerId: string,
  body: SendAiPlayerChatMessageRequest,
) => Promise<AiPlayerSpeechChatResult>

export type AiPlayerSpeechEngineServerConfig = {
  apiKey: string
  speechEngineId: string
  aiPlayerId: string
  governorPlayerId: string
  governorDisplayName: string
  backendBaseUrl: string
  port: number
  path: string
  debug: boolean
}

const EMPTY_SPEECH_REPLY = '我没有听清楚，请再说一遍。'
const FALLBACK_REPLY = '我已经收到你的语音命令，会按现有审批规则处理。'
const ERROR_REPLY = '语音命令已收到，但 AI 玩家链路暂时不可用，请稍后重试。'

export function selectLatestUserTranscript(transcript: SpeechEngineTranscriptMessage[]) {
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    const message = transcript[index]
    if (message?.role !== 'user') {
      continue
    }
    const content = message.content.trim()
    if (content) {
      return content
    }
  }
  return undefined
}

export function buildAiPlayerSpeechReply(result: AiPlayerSpeechChatResult) {
  if (result.ok === false || result.error) {
    return ERROR_REPLY
  }

  const candidates = [
    result.aiMessage?.body,
    result.proposalMessage?.body,
    result.proactiveMessage?.body,
  ]

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') {
      continue
    }
    const normalized = candidate.trim()
    if (normalized) {
      return normalized
    }
  }

  return FALLBACK_REPLY
}

export async function handleAiPlayerSpeechTranscript(input: {
  aiPlayerId: string
  governorPlayerId: string
  governorDisplayName: string
  transcript: SpeechEngineTranscriptMessage[]
  sendChatMessage: SendAiPlayerSpeechChatMessage
}) {
  const commandText = selectLatestUserTranscript(input.transcript)
  if (!commandText) {
    return EMPTY_SPEECH_REPLY
  }

  const result = await input.sendChatMessage(input.aiPlayerId, {
    body: commandText,
    senderId: input.governorPlayerId,
    senderName: input.governorDisplayName,
    createProposal: true,
    voice: {
      mode: 'text',
      provider: 'elevenlabs-speech-engine',
      text: commandText,
    },
  })

  return buildAiPlayerSpeechReply(result)
}

export async function postAiPlayerSpeechChatMessage(input: {
  backendBaseUrl: string
  aiPlayerId: string
  request: SendAiPlayerChatMessageRequest
  signal?: AbortSignal
  fetchImpl?: typeof fetch
}) {
  const fetcher = input.fetchImpl ?? fetch
  const baseUrl = input.backendBaseUrl.replace(/\/+$/, '')
  const encodedAiPlayerId = encodeURIComponent(input.aiPlayerId)
  const response = await fetcher(`${baseUrl}/api/ai/players/${encodedAiPlayerId}/chat/voice-command`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(input.request),
    signal: input.signal,
  })

  const payload = await response.json().catch(() => ({
    ok: false,
    error: `AI player chat endpoint returned non-JSON status ${response.status}`,
  }))

  if (!response.ok) {
    return {
      ok: false,
      error: payload,
    }
  }

  return payload as AiPlayerSpeechChatResult
}

function readRequiredEnv(env: Record<string, string | undefined>, name: string) {
  const value = env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

function readPortEnv(env: Record<string, string | undefined>, name: string, fallback: number) {
  const raw = env[name]?.trim()
  if (!raw) {
    return fallback
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(1, Math.min(65_535, Math.trunc(parsed)))
}

function readPathEnv(env: Record<string, string | undefined>, name: string, fallback: string) {
  const raw = env[name]?.trim()
  if (!raw) {
    return fallback
  }
  return raw.startsWith('/') ? raw : `/${raw}`
}

function readBooleanEnv(env: Record<string, string | undefined>, name: string, fallback = false) {
  const raw = env[name]?.trim().toLowerCase()
  if (!raw) {
    return fallback
  }
  return raw === '1' || raw === 'true' || raw === 'yes'
}

export function buildAiPlayerSpeechEngineServerConfig(
  env: Record<string, string | undefined> = process.env,
): AiPlayerSpeechEngineServerConfig {
  return {
    apiKey: readRequiredEnv(env, 'ELEVENLABS_API_KEY'),
    speechEngineId: readRequiredEnv(env, 'ELEVENLABS_SPEECH_ENGINE_ID'),
    aiPlayerId: readRequiredEnv(env, 'AI_PLAYER_SPEECH_AI_PLAYER_ID'),
    governorPlayerId: readRequiredEnv(env, 'AI_PLAYER_SPEECH_GOVERNOR_PLAYER_ID'),
    governorDisplayName: env.AI_PLAYER_SPEECH_GOVERNOR_DISPLAY_NAME?.trim() || '总督',
    backendBaseUrl: (env.AI_PLAYER_SPEECH_BACKEND_BASE_URL?.trim() || 'http://127.0.0.1:8787').replace(/\/+$/, ''),
    port: readPortEnv(env, 'AI_PLAYER_SPEECH_ENGINE_PORT', 3001),
    path: readPathEnv(env, 'AI_PLAYER_SPEECH_ENGINE_PATH', '/ws'),
    debug: readBooleanEnv(env, 'AI_PLAYER_SPEECH_DEBUG'),
  }
}
