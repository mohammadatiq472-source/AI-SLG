import type { IncomingMessage, ServerResponse } from 'node:http'
import { createHmac } from 'node:crypto'
import type { ExecutionReplay, ReplayArchiveEntry } from '../../../shared/contracts/game/history'
import {
  appendRuntimeWorldEvent,
  getExecutionReplayByRequestId,
  getReplayArchive,
  getReplayArchiveEntry,
} from '../application/world/WorldService'
import { getReplayRagCacheStats } from '../infra/rag/retrieveReplays'
import { getSessionControlContextByToken } from '../multiplayer/SessionManager'
import { readJsonBody, writeJson } from './http'

const DEFAULT_REPLAY_RETENTION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const DEFAULT_REPLAY_SHARE_TOKEN_TTL_MS = 5 * 60 * 1000
const MAX_REPLAY_SHARE_TOKEN_TTL_MS = 30 * 60 * 1000
const DEFAULT_REPLAY_SHARE_TOKEN_SECRET = 'local-replay-share-token-secret'

export function handleReplayArchiveRoute(req: IncomingMessage, res: ServerResponse) {
  if (!authorizeReplaySupportRoute(req, res)) return
  writeJson(res, 200, getReplayArchive())
}

export function handleReplayEntryRoute(req: IncomingMessage, res: ServerResponse, requestId: string) {
  if (!authorizeReplaySupportRoute(req, res, { shareRequestId: requestId })) return
  const archiveEntry = getReplayArchiveEntry(requestId)
  const replay = getExecutionReplayByRequestId(requestId)
  const sharedSpectatorAccess = hasValidReplayShareToken(req, requestId)

  if (!archiveEntry || !replay) {
    writeJson(res, 404, { error: `Replay ${requestId} not found.` })
    return
  }

  if (isReplayArchiveEntryExpired(archiveEntry)) {
    writeJson(res, 410, {
      ok: false,
      replayTitle: '回放已不可用',
      deniedCopy: '这段回放暂时无法查看，可返回战报。',
      retentionLabel: '保留期已过',
    })
    return
  }

  if (sharedSpectatorAccess) {
    writeJson(res, 200, {
      archive: buildSharedSpectatorArchive(archiveEntry),
      replay: buildSharedSpectatorReplay(replay),
    })
    return
  }

  writeJson(res, 200, {
    archive: archiveEntry,
    replay,
  })
}

export function handleReplayRagCacheStatsRoute(req: IncomingMessage, res: ServerResponse) {
  if (!authorizeReplaySupportRoute(req, res)) return
  writeJson(res, 200, getReplayRagCacheStats())
}

export async function handleReplayShareTokenRoute(req: IncomingMessage, res: ServerResponse, requestId: string) {
  if (!authorizeReplaySupportRoute(req, res, { requireSession: true })) return
  const archiveEntry = getReplayArchiveEntry(requestId)
  const replay = getExecutionReplayByRequestId(requestId)
  if (!archiveEntry || !replay) {
    writeJson(res, 404, { error: `Replay ${requestId} not found.` })
    return
  }

  const body = await readJsonBody(req)
  const ttlMs = readRequestedShareTokenTtlMs(body)
  const expiresAtMs = Date.now() + ttlMs
  writeJson(res, 200, {
    ok: true,
    shareToken: buildReplayShareToken(requestId, expiresAtMs),
    expiresAtMs,
    sharedScope: 'public_context',
  })
}

function authorizeReplaySupportRoute(
  req: IncomingMessage,
  res: ServerResponse,
  options: { shareRequestId?: string, requireSession?: boolean } = {},
): boolean {
  const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`)
  const requestedFactionId = requestUrl.searchParams.get('factionId')?.trim() || undefined
  const shareToken = requestUrl.searchParams.get('shareToken')?.trim() || undefined
  if (shareToken) {
    if (options.shareRequestId && verifyReplayShareToken(options.shareRequestId, shareToken)) {
      return true
    }
    recordReplayAccessDeniedEvent({
      requestId: options.shareRequestId,
      requestedFactionId,
      reason: 'invalid_share_token',
      httpStatus: 401,
    })
    writeJson(res, 401, {
      ok: false,
      deniedCopy: '这段回放未开放查看',
    })
    return false
  }

  const bearerToken = readBearerToken(req)
  if (!options.requireSession && !bearerToken && !requestedFactionId) {
    return true
  }

  const sessionContext = bearerToken ? getSessionControlContextByToken(bearerToken) : null
  if (!sessionContext) {
    recordReplayAccessDeniedEvent({
      requestId: options.shareRequestId,
      requestedFactionId,
      reason: 'missing_session',
      httpStatus: 401,
    })
    writeJson(res, 401, {
      ok: false,
      deniedCopy: '这段回放未开放查看',
    })
    return false
  }

  if (requestedFactionId && requestedFactionId !== sessionContext.factionId) {
    recordReplayAccessDeniedEvent({
      requestId: options.shareRequestId,
      requestedFactionId,
      reason: 'foreign_faction',
      httpStatus: 403,
    })
    writeJson(res, 403, {
      ok: false,
      deniedCopy: '这段回放未开放查看',
    })
    return false
  }

  return true
}

function recordReplayAccessDeniedEvent(params: {
  requestId?: string
  requestedFactionId?: string
  reason: 'invalid_share_token' | 'missing_session' | 'foreign_faction'
  httpStatus: 401 | 403
}) {
  if (!params.requestId || !params.requestedFactionId) {
    return
  }
  appendRuntimeWorldEvent({
    action: 'replay_access_denied',
    success: false,
    category: 'system',
    message: 'Replay access was denied for a faction-scoped request.',
    metadata: {
      playerHistoryCategory: 'system',
      playerHistoryTitle: '回放未开放查看',
      playerHistoryActorName: '玩家',
      playerHistorySummary: '这段回放未开放查看，可返回战报或等待授权。',
      playerHistoryTarget: '战斗回放',
      playerHistoryResultLabel: '未开放',
      playerHistoryConsequence: '当前没有获得这段回放的查看权限。',
      playerHistoryNextAction: '返回战报',
      playerHistorySeverity: 'medium',
      playerHistoryScope: 'own_faction',
      playerHistoryFactionId: params.requestedFactionId,
      playerHistoryDedupeKey: `system:replay-access-denied:${params.requestId}:${params.requestedFactionId}:${params.reason}`,
      replayRequestId: params.requestId,
      replayAccessDenied: true,
      replayAccessDeniedReason: params.reason,
      replayAccessDeniedHttpStatus: params.httpStatus,
      replayAccessDeniedSurface: 'replay_support_route_denied',
      replayAccessDeniedPlayerSafeFallback: true,
    },
  })
}

function buildReplayShareToken(requestId: string, expiresAtMs: number): string {
  const signature = signReplayShareToken(requestId, expiresAtMs)
  return `replay_share_v1.${expiresAtMs}.${signature}`
}

function hasValidReplayShareToken(req: IncomingMessage, requestId: string): boolean {
  const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`)
  const shareToken = requestUrl.searchParams.get('shareToken')?.trim() || undefined
  return shareToken ? verifyReplayShareToken(requestId, shareToken) : false
}

function buildSharedSpectatorArchive(entry: ReplayArchiveEntry) {
  return {
    outcome: entry.outcome,
    frameCount: entry.frameCount,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    sharedScope: 'public_context',
  }
}

function buildSharedSpectatorReplay(replay: ExecutionReplay) {
  return {
    source: replay.source,
    outcome: replay.outcome,
    createdTick: replay.createdTick,
    createdWorldVersion: replay.createdWorldVersion,
    completedTick: replay.completedTick,
    completedWorldVersion: replay.completedWorldVersion,
    sharedScope: 'public_context',
    frames: replay.frames.map((frame) => ({
      tick: frame.tick,
      worldVersion: frame.worldVersion,
      label: `第 ${frame.tick} 回合`,
      frontlineSummary: '仅显示已共享的战况。',
      latestReports: [],
      highlights: frame.highlights.map((highlight) => ({
        kind: highlight.kind,
        severity: highlight.severity,
        title: '战况更新',
        detail: '公开战况已更新。',
      })),
      orderStates: frame.orderStates.map((order) => ({
        action: order.action,
        status: order.status,
        message: order.message,
      })),
    })),
  }
}

function isReplayArchiveEntryExpired(entry: ReplayArchiveEntry, nowMs = Date.now()): boolean {
  const retentionMaxAgeMs = readReplayRetentionMaxAgeMs()
  const updatedAtMs = Date.parse(entry.updatedAt || entry.createdAt)
  if (!Number.isFinite(updatedAtMs)) {
    return false
  }

  if (retentionMaxAgeMs <= 0) {
    return nowMs >= updatedAtMs
  }

  return nowMs - updatedAtMs > retentionMaxAgeMs
}

function readReplayRetentionMaxAgeMs(): number {
  const raw = process.env.REPLAY_RETENTION_MAX_AGE_MS?.trim()
  if (!raw) {
    return DEFAULT_REPLAY_RETENTION_MAX_AGE_MS
  }

  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_REPLAY_RETENTION_MAX_AGE_MS
}

function readRequestedShareTokenTtlMs(body: unknown): number {
  const raw = body && typeof body === 'object' && !Array.isArray(body)
    ? Number((body as Record<string, unknown>).ttlMs)
    : Number.NaN
  if (!Number.isFinite(raw)) {
    return DEFAULT_REPLAY_SHARE_TOKEN_TTL_MS
  }
  return Math.max(1, Math.min(Math.trunc(raw), MAX_REPLAY_SHARE_TOKEN_TTL_MS))
}

function verifyReplayShareToken(requestId: string, token: string): boolean {
  const match = token.match(/^replay_share_v1\.(\d+)\.([A-Za-z0-9_-]+)$/)
  if (!match) {
    return false
  }

  const expiresAtMs = Number(match[1])
  if (!Number.isFinite(expiresAtMs) || Date.now() > expiresAtMs) {
    return false
  }

  return match[2] === signReplayShareToken(requestId, expiresAtMs)
}

function signReplayShareToken(requestId: string, expiresAtMs: number): string {
  return createHmac('sha256', readReplayShareTokenSecret())
    .update(`${requestId}.${expiresAtMs}`)
    .digest('base64url')
}

function readReplayShareTokenSecret(): string {
  const raw = process.env.REPLAY_SHARE_TOKEN_SECRET?.trim()
  return raw && raw.length > 0 ? raw : DEFAULT_REPLAY_SHARE_TOKEN_SECRET
}

function readBearerToken(req: IncomingMessage): string | undefined {
  const raw = req.headers.authorization
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) {
    return undefined
  }
  const match = value.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()
  return token && token.length > 0 ? token : undefined
}
