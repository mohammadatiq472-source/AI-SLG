import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  getAiPlayerChatReadCursor,
  listAiPlayerChatChannel,
  runAiPlayerChatPatrolScheduler,
  submitAiPlayerChatMessage,
  triggerAiPlayerChatPatrolTick,
  updateAiPlayerChatReadCursor,
} from '../application/ai/aiPlayerChatCommandService'
import { getGovernedAiPlayerRuntime } from '../application/ai/AIPlayerGovernanceService'
import {
  aiPlayerChatPatrolTickRequestSchema,
  aiPlayerChatPatrolSchedulerRunRequestSchema,
  aiPlayerChatHistoryFilterSchema,
  sendAiPlayerChatMessageRequestSchema,
  updateAiPlayerChatReadCursorRequestSchema,
} from '../../../shared/schemas/aiPlayerChat'
import { updateAiPlayerVoiceProfileSelectionRequestSchema } from '../../../shared/schemas/aiPlayerVoice'
import {
  getAiPlayerVoiceProfileCatalog,
  updateAiPlayerVoiceProfileSelection,
} from '../voice/aiPlayerVoiceProfileStore'
import { readAiPlayerVoiceAudioAsset } from '../voice/aiPlayerVoiceAudioAssetStore'
import { writeJson } from './http'
import { parseBody, parseOptionalLimit } from './aiPlayerRouteShared'

async function handleSendChatMessageRoute(
  req: IncomingMessage,
  res: ServerResponse,
  aiPlayerId: string,
  source: 'messages' | 'voice-command',
) {
  const parsed = await parseBody(req, sendAiPlayerChatMessageRequestSchema)
  if (!parsed.ok) {
    writeJson(res, 422, { ok: false, error: parsed.error })
    return
  }

  const request = source === 'voice-command' && !parsed.data.voice
    ? {
        ...parsed.data,
        voice: {
          mode: 'text' as const,
          text: parsed.data.body,
        },
      }
    : parsed.data
  const result = await submitAiPlayerChatMessage(aiPlayerId, request)
  if (!result.ok) {
    writeJson(res, result.error?.includes('not found') ? 404 : 409, result)
    return
  }

  writeJson(res, 200, result)
}

async function handlePatrolTickRoute(req: IncomingMessage, res: ServerResponse, aiPlayerId: string) {
  const parsed = await parseBody(req, aiPlayerChatPatrolTickRequestSchema)
  if (!parsed.ok) {
    writeJson(res, 422, { ok: false, error: parsed.error })
    return
  }

  const result = await triggerAiPlayerChatPatrolTick(aiPlayerId, parsed.data)
  if (!result.ok) {
    const status = result.error?.includes('not found')
      ? 404
      : result.error === 'patrol_cooldown_active'
        ? 429
        : 400
    writeJson(res, status, result)
    return
  }

  writeJson(res, 200, result)
}

async function handlePatrolSchedulerRunRoute(req: IncomingMessage, res: ServerResponse) {
  const parsed = await parseBody(req, aiPlayerChatPatrolSchedulerRunRequestSchema)
  if (!parsed.ok) {
    writeJson(res, 422, { ok: false, error: parsed.error })
    return
  }

  const result = await runAiPlayerChatPatrolScheduler(parsed.data)
  writeJson(res, result.ok ? 200 : 409, result)
}

function handleGetChatRoute(_req: IncomingMessage, res: ServerResponse, aiPlayerId: string, url: URL) {
  const limit = parseOptionalLimit(url.searchParams.get('limit'), 50)
  const readerId = url.searchParams.get('readerId')?.trim() || undefined
  const filterResult = aiPlayerChatHistoryFilterSchema.safeParse(url.searchParams.get('filter')?.trim() || 'all')
  if (!filterResult.success) {
    writeJson(res, 422, { ok: false, error: 'invalid_chat_history_filter' })
    return
  }
  const beforeMessageId = url.searchParams.get('beforeMessageId')?.trim() || undefined
  const result = listAiPlayerChatChannel(aiPlayerId, limit, readerId, filterResult.data, beforeMessageId)
  if ('error' in result) {
    const error = result.error ?? 'chat_channel_failed'
    const status = error.includes('chat message not found')
      ? 409
      : error.includes('not found')
        ? 404
        : 400
    writeJson(res, status, {
      ok: false,
      error,
    })
    return
  }

  writeJson(res, 200, result)
}

function handleGetReadCursorRoute(_req: IncomingMessage, res: ServerResponse, aiPlayerId: string, url: URL) {
  const readerId = url.searchParams.get('readerId')?.trim()
  if (!readerId) {
    writeJson(res, 422, { ok: false, error: 'readerId required' })
    return
  }
  const result = getAiPlayerChatReadCursor(aiPlayerId, readerId)
  if (!result.ok) {
    writeJson(res, result.error?.includes('not found') ? 404 : 400, result)
    return
  }
  writeJson(res, 200, result)
}

async function handleUpdateReadCursorRoute(req: IncomingMessage, res: ServerResponse, aiPlayerId: string) {
  const parsed = await parseBody(req, updateAiPlayerChatReadCursorRequestSchema)
  if (!parsed.ok) {
    writeJson(res, 422, { ok: false, error: parsed.error })
    return
  }

  const result = updateAiPlayerChatReadCursor(aiPlayerId, parsed.data)
  if (!result.ok) {
    const status = result.error?.includes('not found')
      ? 404
      : result.error?.includes('chat message not found')
        ? 409
        : 400
    writeJson(res, status, result)
    return
  }
  writeJson(res, 200, result)
}

function handleGetVoiceProfileRoute(_req: IncomingMessage, res: ServerResponse, aiPlayerId: string) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  writeJson(res, 200, getAiPlayerVoiceProfileCatalog(aiPlayerId, {
    runtimePolicy: runtime?.runtimePolicy,
  }))
}

async function handleUpdateVoiceProfileRoute(req: IncomingMessage, res: ServerResponse, aiPlayerId: string) {
  const parsed = await parseBody(req, updateAiPlayerVoiceProfileSelectionRequestSchema)
  if (!parsed.ok) {
    writeJson(res, 422, { ok: false, error: parsed.error })
    return
  }

  const result = updateAiPlayerVoiceProfileSelection(aiPlayerId, parsed.data)
  writeJson(res, result.ok ? 200 : 404, result)
}

function handleGetVoiceAudioAssetRoute(_req: IncomingMessage, res: ServerResponse, audioAssetId: string) {
  const normalizedAudioAssetId = audioAssetId.trim()
  if (!normalizedAudioAssetId) {
    writeJson(res, 422, { ok: false, error: 'audioAssetId required' })
    return
  }
  const asset = readAiPlayerVoiceAudioAsset(normalizedAudioAssetId)
  if (!asset) {
    writeJson(res, 404, { ok: false, error: 'voice_audio_asset_not_found' })
    return
  }
  writeJson(res, 200, {
    ok: true,
    audioAssetId: asset.audioAssetId,
    contentType: asset.contentType,
    byteLength: asset.bytes.byteLength,
    createdAt: asset.createdAt,
    audioBase64: asset.bytes.toString('base64'),
  })
}

function decodeRouteSegment(segment: string | undefined) {
  try {
    return decodeURIComponent(segment ?? '')
  } catch {
    return ''
  }
}

export async function dispatchAiPlayerChatRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  url: URL,
): Promise<boolean> {
  if (pathname === '/api/ai/chat/patrol-scheduler/run') {
    if (req.method !== 'POST') {
      writeJson(res, 405, { ok: false, error: 'method_not_allowed' })
      return true
    }
    await handlePatrolSchedulerRunRoute(req, res)
    return true
  }

  if (!pathname.startsWith('/api/ai/players/')) {
    return false
  }

  const suffix = pathname.slice('/api/ai/players/'.length)
  const [aiPlayerId, operation, childOperation, childId] = suffix.split('/')
  if (!aiPlayerId || operation !== 'chat') {
    return false
  }

  if (req.method === 'GET' && (!childOperation || childOperation === 'messages')) {
    handleGetChatRoute(req, res, aiPlayerId, url)
    return true
  }

  if (req.method === 'GET' && childOperation === 'read-cursor') {
    handleGetReadCursorRoute(req, res, aiPlayerId, url)
    return true
  }

  if (req.method === 'POST' && childOperation === 'read-cursor') {
    await handleUpdateReadCursorRoute(req, res, aiPlayerId)
    return true
  }

  if (req.method === 'GET' && childOperation === 'voice-profile') {
    handleGetVoiceProfileRoute(req, res, aiPlayerId)
    return true
  }

  if (req.method === 'POST' && childOperation === 'voice-profile') {
    await handleUpdateVoiceProfileRoute(req, res, aiPlayerId)
    return true
  }

  if (req.method === 'GET' && childOperation === 'voice-audio') {
    handleGetVoiceAudioAssetRoute(req, res, decodeRouteSegment(childId))
    return true
  }

  if (req.method === 'POST' && (childOperation === 'messages' || childOperation === 'voice-command')) {
    await handleSendChatMessageRoute(req, res, aiPlayerId, childOperation)
    return true
  }

  if (req.method === 'POST' && childOperation === 'patrol-tick') {
    await handlePatrolTickRoute(req, res, aiPlayerId)
    return true
  }

  return false
}
