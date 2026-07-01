import type { IncomingMessage, ServerResponse } from 'node:http'
import { createHmac } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type {
  ExecutionReplay,
  PlayerHistoryContracts,
  PlayerHistoryNotificationAnchor,
  WorldEventRecord,
} from '../../../shared/contracts/game'
import type {
  AiPlayerVisibleActivityAggregateGroup,
  AiPlayerVisibleActivityItem,
  AiPlayerVisibleActivityMapTargetQueueItem,
  AiPlayerVisibleActivitySortOrder,
} from '../../../shared/contracts/aiPlayer'
import {
  buildBattleReplayScreenReadModel,
  buildCivilMemoryDetailReadModel,
  buildCivilMemoryHistoryCards,
  buildPlayerVisibleActivityFeed,
  buildPlayerHistoryLivePreviewReadModel,
  buildUnavailableBattleReplayScreenReadModel,
  buildPlayerSaveLoadReadModel,
  buildPlayerWorldTimelineReadModel,
  AI_VISIBLE_ACTIVITY_SORT_ORDER,
  buildVisibleActivityAggregateGroups,
  buildVisibleActivityMapTargetQueue,
  compareVisibleActivityItems,
} from '../../../shared/domain/playerHistory'
import {
  getCivilMemoryDetailById,
  getCivilMemorySnapshot,
  getExecutionReplayByRequestId,
  getReplayArchive,
  getSaveSlots,
  getWorldStateReadonly,
  getWorldEvents,
  type SaveSlotOwnerContext,
} from '../application/world/WorldService'
import {
  getPlayerHistoryDismissedNotificationDedupeKeysByToken,
  getSessionControlContextByToken,
  recordPlayerHistoryDismissedNotificationDedupeKeysByToken,
} from '../multiplayer/SessionManager'
import { readJsonBody, writeJson } from './http'

const DEFAULT_PLAYER_HISTORY_LIMIT = 80
const MAX_PLAYER_HISTORY_LIMIT = 80
const DEFAULT_CIVIL_MEMORY_SHARE_TOKEN_TTL_MS = 5 * 60 * 1000
const MAX_CIVIL_MEMORY_SHARE_TOKEN_TTL_MS = 30 * 60 * 1000

type PlayerHistoryAiActivityFeed = {
  contractId: 'player_history_ai_activity_feed_v1'
  count: number
  actorCount: number
  actorIds: string[]
  sortOrder: AiPlayerVisibleActivitySortOrder
  aggregateGroups: AiPlayerVisibleActivityAggregateGroup[]
  mapTargetQueue: AiPlayerVisibleActivityMapTargetQueueItem[]
  items: AiPlayerVisibleActivityItem[]
}
const DEFAULT_CIVIL_MEMORY_SHARE_TOKEN_SECRET = 'local-civil-memory-share-token-secret'
const DEFAULT_PLAYER_HISTORY_SHARE_TOKEN_TTL_MS = 5 * 60 * 1000
const MAX_PLAYER_HISTORY_SHARE_TOKEN_TTL_MS = 30 * 60 * 1000
const DEFAULT_PLAYER_HISTORY_SHARE_TOKEN_SECRET = 'local-player-history-share-token-secret'
const PLAYER_HISTORY_SHARE_PERSIST_VERSION = 1
const PLAYER_HISTORY_SHARE_STATE_PATH =
  process.env.PLAYER_HISTORY_SHARE_STATE_PATH?.trim() || join(process.cwd(), 'tmp', 'player_history_share_grants.json')
const MAX_PERSISTED_PLAYER_HISTORY_SHARES = 5_000

type PlayerHistoryShareGrantRecord = {
  shareId: string
  shareToken: string
  eventId: string
  issuerToken: string
  issuerFactionId: string
  issuerSessionId: string
  issuerPlayerName: string
  issuedAtMs: number
  expiresAtMs: number
  status: 'active' | 'revoked'
  eventTitle: string
}

const playerHistoryShareGrantRecordsByToken = new Map<string, PlayerHistoryShareGrantRecord>()
const playerHistoryShareGrantRecordsById = new Map<string, PlayerHistoryShareGrantRecord>()
let playerHistoryShareGrantPersistenceLoaded = false

export function handlePlayerHistoryRoute(req: IncomingMessage, res: ServerResponse) {
  const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`)
  const requestedFactionId = requestUrl.searchParams.get('factionId')?.trim() || undefined
  const bearerToken = readBearerToken(req)
  let saveSlotOwner: SaveSlotOwnerContext | undefined
  let sessionContext: ReturnType<typeof getSessionControlContextByToken> = null
  if (bearerToken || requestedFactionId) {
    sessionContext = bearerToken ? getSessionControlContextByToken(bearerToken) : null
    if (!sessionContext) {
      writeJson(res, 401, {
        ok: false,
        deniedCopy: '暂无权限查看这段记录',
      })
      return
    }
    if (requestedFactionId && requestedFactionId !== sessionContext.factionId) {
      writeJson(res, 403, {
        ok: false,
        deniedCopy: '暂无权限查看这段记录',
      })
      return
    }
    saveSlotOwner = {
      factionId: sessionContext.factionId,
      sessionId: sessionContext.sessionId,
    }
  }

  const limit = clampLimit(Number(requestUrl.searchParams.get('limit') ?? DEFAULT_PLAYER_HISTORY_LIMIT))
  const eventLimit = clampLimit(Number(requestUrl.searchParams.get('eventLimit') ?? limit))
  const civilMemoryLimit = clampLimit(Number(requestUrl.searchParams.get('civilMemoryLimit') ?? Math.min(40, limit)))
  const replayLimit = clampLimit(Number(requestUrl.searchParams.get('replayLimit') ?? Math.min(10, limit)))
  const replayRequestId = requestUrl.searchParams.get('replayRequestId')?.trim() || undefined
  const livePreviewEnabled = requestUrl.searchParams.get('livePreview') === '1'
  const explicitSpectatorShareToken = requestUrl.searchParams.get('shareToken')?.trim() || undefined
  const requestedDismissedNotificationDedupeKeys = readDismissedNotificationDedupeKeys(requestUrl)
  const dismissedNotificationDedupeKeys = bearerToken
    ? resolveSessionDismissedNotificationDedupeKeys(bearerToken, requestedDismissedNotificationDedupeKeys)
    : requestedDismissedNotificationDedupeKeys

  const replays = collectReplays(replayLimit)
  const selectedReplay = replayRequestId
    ? getExecutionReplayByRequestId(replayRequestId)
    : replays[0]

  const scopedWorldEvents = filterPlayerHistoryEventsForViewer(getWorldEvents(eventLimit).items, {
    factionId: saveSlotOwner?.factionId,
    organizationIds: saveSlotOwner?.factionId ? resolveViewerOrganizationIds(saveSlotOwner.factionId) : [],
    organizationOfficerRoleIds: resolveViewerOrganizationOfficerRoleIds(sessionContext),
    explicitSpectatorShareToken,
  })
  const saveSlots = getSaveSlots({
    owner: saveSlotOwner,
    includeOwnerless: false,
  }).slots
  const civilMemoryEntries = getCivilMemorySnapshot({ limit: civilMemoryLimit }).items
  const generatedAt = new Date().toISOString()

  const payload: PlayerHistoryContracts = {
    timeline: buildPlayerWorldTimelineReadModel({
      generatedAt,
      events: scopedWorldEvents.events,
      civilMemoryEntries,
      saveSlots,
      replays,
      notificationAnchors: scopedWorldEvents.notificationAnchors,
      dismissedNotificationDedupeKeys,
      limit,
    }),
    saveLoad: buildPlayerSaveLoadReadModel(saveSlots),
    civilMemoryCards: buildCivilMemoryHistoryCards(civilMemoryEntries),
  }
  if (livePreviewEnabled) {
    payload.livePreview = buildPlayerHistoryLivePreviewReadModel(scopedWorldEvents.events, {
      enabled: true,
      maxPreviewItems: 3,
    })
  }

  if (selectedReplay) {
    payload.replay = buildBattleReplayScreenReadModel(selectedReplay)
  } else if (replayRequestId) {
    payload.replay = buildUnavailableBattleReplayScreenReadModel()
  }

  writeJson(res, 200, {
    ...payload,
    activityFeed: buildPlayerHistoryAiActivityFeed(scopedWorldEvents.events),
  })
}

export function handlePlayerHistoryCivilMemoryDetailRoute(req: IncomingMessage, res: ServerResponse) {
  const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`)
  const civilMemoryId = requestUrl.searchParams.get('civilMemoryId')?.trim() || ''
  if (civilMemoryId.length === 0) {
    writeJson(res, 400, {
      ok: false,
      deniedCopy: '暂无可查看的传闻详情',
    })
    return
  }

  const shareToken = requestUrl.searchParams.get('shareToken')?.trim() || undefined
  const shareAccess = shareToken ? readCivilMemoryShareAccess(civilMemoryId, shareToken, res) : undefined
  if (shareToken && !shareAccess) {
    return
  }

  const entry = getCivilMemoryDetailById(civilMemoryId)
  if (!entry) {
    writeJson(res, 404, {
      ok: false,
      deniedCopy: '这段传闻暂时不可查看',
    })
    return
  }

  const payload: PlayerHistoryContracts = {
    timeline: buildPlayerWorldTimelineReadModel({
      generatedAt: new Date().toISOString(),
      civilMemoryEntries: [entry],
      limit: 1,
    }),
    civilMemoryCards: buildCivilMemoryHistoryCards([entry]),
    civilMemoryDetail: buildCivilMemoryDetailReadModel(entry, shareAccess),
  }

  writeJson(res, 200, payload)
}

export type PlayerHistoryViewerScope = {
  factionId?: string
  organizationIds?: string[]
  organizationOfficerRoleIds?: string[]
  explicitSpectatorShareToken?: string
}

export type ScopedPlayerHistoryEvents = {
  events: WorldEventRecord[]
  notificationAnchors: PlayerHistoryNotificationAnchor[]
  deniedPrivateEventCount: number
}

export function buildPlayerHistoryAiActivityFeed(events: WorldEventRecord[]): PlayerHistoryAiActivityFeed {
  const perActorFeeds: ReturnType<typeof buildPlayerVisibleActivityFeed>[] = []
  const groups = new Map<string, { aiPlayerId: string; factionId: string; events: WorldEventRecord[] }>()
  for (const event of events) {
    const aiPlayerId = readEventMetadataString(event, 'aiPlayerId')
    const factionId = readEventMetadataString(event, 'playerHistoryFactionId')
    if (!aiPlayerId || !factionId) {
      continue
    }
    const key = `${aiPlayerId}:${factionId}`
    const current = groups.get(key)
    if (current) {
      current.events.push(event)
      continue
    }
    groups.set(key, {
      aiPlayerId,
      factionId,
      events: [event],
    })
  }

  for (const group of groups.values()) {
    perActorFeeds.push(buildPlayerVisibleActivityFeed({
      aiPlayerId: group.aiPlayerId,
      factionId: group.factionId,
      events: group.events.sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      contextEvents: events,
      limit: 6,
    }))
  }

  const combinedItems = perActorFeeds
    .flatMap((feed) => feed.items)
    .sort(compareVisibleActivityItems)
    .slice(0, 12)

  const actorIdSet = new Set<string>()
  for (const item of combinedItems) {
    actorIdSet.add(item.actorId)
  }
  const actorIds = Array.from(actorIdSet).sort()

  return {
    contractId: 'player_history_ai_activity_feed_v1',
    count: combinedItems.length,
    actorCount: actorIds.length,
    actorIds,
    sortOrder: AI_VISIBLE_ACTIVITY_SORT_ORDER,
    aggregateGroups: buildVisibleActivityAggregateGroups(combinedItems),
    mapTargetQueue: buildVisibleActivityMapTargetQueue(combinedItems),
    items: combinedItems,
  }
}

export function filterPlayerHistoryEventsForViewer(
  events: WorldEventRecord[],
  viewer: PlayerHistoryViewerScope = {},
): ScopedPlayerHistoryEvents {
  const allowedEvents: WorldEventRecord[] = []
  const notificationAnchors: PlayerHistoryNotificationAnchor[] = []
  let deniedPrivateEventCount = 0

  for (const event of events) {
    if (canViewerReadPlayerHistoryEvent(event, viewer)) {
      allowedEvents.push(event)
      continue
    }
    deniedPrivateEventCount += 1
    if (notificationAnchors.length < 3) {
      notificationAnchors.push(buildDeniedPlayerHistoryNotificationAnchor(event, notificationAnchors.length + 1))
    }
  }

  return {
    events: allowedEvents,
    notificationAnchors,
    deniedPrivateEventCount,
  }
}

function canViewerReadPlayerHistoryEvent(event: WorldEventRecord, viewer: PlayerHistoryViewerScope): boolean {
  if (
    readEventMetadataString(event, 'playerHistorySharePolicy') === 'explicit_spectator' &&
    verifyPlayerHistoryExplicitSpectatorShareToken(event.id, viewer.explicitSpectatorShareToken)
  ) {
    return true
  }

  const scope = readEventMetadataString(event, 'playerHistoryScope')
  if (!scope || scope === 'public_world') {
    return true
  }

  if (
    scope === 'own_faction'
    || scope === 'faction_private'
    || scope === 'private_ai'
    || scope === 'private_court'
    || scope === 'private_diplomacy'
    || scope === 'private_map'
  ) {
    const eventFactionId = readEventMetadataString(event, 'playerHistoryFactionId') ?? readEventMetadataString(event, 'factionId')
    return Boolean(viewer.factionId && eventFactionId && viewer.factionId === eventFactionId)
  }

  if (scope === 'own_save_slot') {
    const eventOwnerFactionId =
      readEventMetadataString(event, 'playerHistoryFactionId')
      ?? readEventMetadataString(event, 'ownerFactionId')
      ?? readEventMetadataString(event, 'factionId')
    return eventOwnerFactionId ? viewer.factionId === eventOwnerFactionId : true
  }

  if (scope === 'own_organization') {
    const eventOrganizationId = readEventMetadataString(event, 'playerHistoryOrganizationId') ?? readEventMetadataString(event, 'organizationId')
    if (!eventOrganizationId || !normalizeViewerOrganizationIds(viewer.organizationIds).includes(eventOrganizationId)) {
      return false
    }
    const requiredRole = readEventMetadataString(event, 'playerHistoryRequiredOfficerRole')
    if (!requiredRole) {
      return true
    }
    return normalizeViewerOrganizationIds(viewer.organizationOfficerRoleIds).includes(requiredRole)
  }

  if (scope === 'organization_scope') {
    const eventOrganizationId =
      readEventMetadataString(event, 'playerHistoryOrganizationId')
      ?? readEventMetadataString(event, 'organizationId')
      ?? readEventMetadataString(event, 'proposerFactionId')
      ?? readEventMetadataString(event, 'targetFactionId')
      ?? readEventMetadataString(event, 'factionId')
    if (!eventOrganizationId) {
      return false
    }
    const organizationIds = normalizeViewerOrganizationIds(viewer.organizationIds)
    return organizationIds.includes(eventOrganizationId) || Boolean(viewer.factionId && viewer.factionId === eventOrganizationId)
  }

  if (scope === 'explicit_spectator') {
    return verifyPlayerHistoryExplicitSpectatorShareToken(event.id, viewer.explicitSpectatorShareToken)
  }

  return false
}

function buildDeniedPlayerHistoryNotificationAnchor(event: WorldEventRecord, budgetSlot: number): PlayerHistoryNotificationAnchor {
  return {
    contractId: 'player_history_notification_anchor_v1',
    id: `notification-private-${event.id}`,
    durableCardAnchor: `timeline-card:private-${event.id}`,
    dedupeKey: `private-event:${event.id}`,
    budgetSlot,
    accessState: 'private',
    accessFeedbackLabel: '这条提醒暂时不可查看',
    title: '有记录暂未开放',
    body: '相关成员可查看详情',
    actionLabel: '查看权限',
    cooldownLabel: '已隐藏私密记录',
    dismissed: false,
  }
}

function readEventMetadataString(event: WorldEventRecord, key: string): string | undefined {
  const value = event.metadata?.[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function resolveViewerOrganizationIds(factionId: string): string[] {
  const normalizedFactionId = factionId.trim()
  if (!normalizedFactionId) {
    return []
  }

  const faction = getWorldStateReadonly().factions[normalizedFactionId]
  return normalizeViewerOrganizationIds([
    normalizedFactionId,
    typeof faction?.organizationId === 'string' ? faction.organizationId : '',
  ])
}

function normalizeViewerOrganizationIds(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return []
  }
  const normalized: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    if (typeof value !== 'string') {
      continue
    }
    const item = value.trim()
    if (!item || seen.has(item)) {
      continue
    }
    seen.add(item)
    normalized.push(item)
  }
  return normalized
}

function resolveViewerOrganizationOfficerRoleIds(
  sessionContext: ReturnType<typeof getSessionControlContextByToken>,
): string[] {
  if (!sessionContext) {
    return []
  }

  const world = getWorldStateReadonly()
  const grants = Object.values(world.alliance.officerAuthority?.grants ?? {})
  return normalizeViewerOrganizationIds(
    grants
      .filter((grant) =>
        grant.status === 'active' &&
        grant.factionId === sessionContext.factionId &&
        grant.principalPlayerName.trim() === sessionContext.playerName.trim(),
      )
      .map((grant) => grant.roleId),
  )
}

function readDismissedNotificationDedupeKeys(requestUrl: URL): string[] {
  return requestUrl.searchParams
    .getAll('dismissedNotificationDedupeKey')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .slice(0, 40)
}

function resolveSessionDismissedNotificationDedupeKeys(token: string, requestedKeys: string[]): string[] {
  if (requestedKeys.length > 0) {
    return recordPlayerHistoryDismissedNotificationDedupeKeysByToken(token, requestedKeys)
  }
  return getPlayerHistoryDismissedNotificationDedupeKeysByToken(token)
}

export async function handlePlayerHistoryCivilMemoryDetailShareTokenRoute(req: IncomingMessage, res: ServerResponse) {
  const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`)
  if (!authorizeCivilMemoryShareTokenIssue(req, res, requestUrl)) {
    return
  }

  const civilMemoryId = requestUrl.searchParams.get('civilMemoryId')?.trim() || ''
  if (civilMemoryId.length === 0) {
    writeJson(res, 400, {
      ok: false,
      deniedCopy: '暂无可分享的传闻详情',
    })
    return
  }

  const entry = getCivilMemoryDetailById(civilMemoryId)
  if (!entry) {
    writeJson(res, 404, {
      ok: false,
      deniedCopy: '这段传闻暂时不可分享',
    })
    return
  }

  const body = await readJsonBody(req)
  const ttlMs = readRequestedCivilMemoryShareTokenTtlMs(body)
  const expiresAtMs = Date.now() + ttlMs
  writeJson(res, 200, {
    ok: true,
    shareToken: buildCivilMemoryShareToken(civilMemoryId, expiresAtMs),
    expiresAtMs,
    sharedScope: 'public_context',
    shareStateLabel: '已开放只读传闻',
    shareRetentionLabel: buildCivilMemoryShareRetentionLabel(expiresAtMs),
  })
}

export async function handlePlayerHistoryShareTokenRoute(req: IncomingMessage, res: ServerResponse) {
  const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`)
  const eventId = requestUrl.searchParams.get('eventId')?.trim() || ''
  if (eventId.length === 0) {
    writeJson(res, 400, {
      ok: false,
      deniedCopy: '暂无可分享的记录',
    })
    return
  }

  const shareIssue = authorizePlayerHistoryShareTokenIssue(req, res, requestUrl, eventId)
  if (!shareIssue) {
    return
  }

  const body = await readJsonBody(req)
  const ttlMs = readRequestedPlayerHistoryShareTokenTtlMs(body)
  const expiresAtMs = Date.now() + ttlMs
  const shareToken = buildPlayerHistoryExplicitSpectatorShareToken(eventId, expiresAtMs)
  ensurePlayerHistoryShareGrantPersistenceLoaded()
  const shareRecord = registerPlayerHistoryShareGrant({
    shareToken,
    event: shareIssue.event,
    issuerToken: shareIssue.bearerToken,
    issuerFactionId: shareIssue.sessionContext.factionId,
    issuerSessionId: shareIssue.sessionContext.sessionId,
    issuerPlayerName: shareIssue.sessionContext.playerName,
    expiresAtMs,
  })
  writeJson(res, 200, {
    ok: true,
    shareToken,
    shareId: shareRecord.shareId,
    expiresAtMs,
    sharedScope: 'explicit_spectator',
    shareStateLabel: '已开放只读纪事',
    shareRetentionLabel: buildPlayerHistoryShareRetentionLabel(expiresAtMs),
  })
}

export function handlePlayerHistoryShareTokenListRoute(req: IncomingMessage, res: ServerResponse) {
  const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`)
  const managementContext = authorizePlayerHistoryShareManagement(req, res, requestUrl)
  if (!managementContext) {
    return
  }

  ensurePlayerHistoryShareGrantPersistenceLoaded()
  const shares = [...playerHistoryShareGrantRecordsById.values()]
    .filter((record) => canManagePlayerHistoryShareGrant(record, managementContext))
    .map((record) => summarizePlayerHistoryShareGrant(record))
  writeJson(res, 200, {
    ok: true,
    shares,
    shareManagementLabel: '已开放的只读纪事',
  })
}

export function handlePlayerHistoryShareTokenRevokeRoute(req: IncomingMessage, res: ServerResponse) {
  const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`)
  const managementContext = authorizePlayerHistoryShareManagement(req, res, requestUrl)
  if (!managementContext) {
    return
  }

  ensurePlayerHistoryShareGrantPersistenceLoaded()
  const shareId = requestUrl.searchParams.get('shareId')?.trim() || ''
  if (!shareId) {
    writeJson(res, 400, {
      ok: false,
      deniedCopy: '暂无可撤回的分享',
    })
    return
  }

  const record = playerHistoryShareGrantRecordsById.get(shareId)
  if (!record || !canManagePlayerHistoryShareGrant(record, managementContext)) {
    writeJson(res, 404, {
      ok: false,
      deniedCopy: '暂无可撤回的分享',
    })
    return
  }

  record.status = 'revoked'
  persistPlayerHistoryShareGrantRecords()
  writeJson(res, 200, {
    ok: true,
    shareId: record.shareId,
    shareStateLabel: '已撤回只读纪事',
    shareRetentionLabel: '分享已撤回',
  })
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

function collectReplays(limit: number): ExecutionReplay[] {
  return getReplayArchive()
    .items.slice(0, limit)
    .map((entry) => getExecutionReplayByRequestId(entry.requestId))
    .filter((item): item is ExecutionReplay => Boolean(item))
}

function clampLimit(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_PLAYER_HISTORY_LIMIT
  }

  return Math.max(1, Math.min(MAX_PLAYER_HISTORY_LIMIT, Math.floor(value)))
}

function authorizeCivilMemoryShareTokenIssue(
  req: IncomingMessage,
  res: ServerResponse,
  requestUrl: URL,
): boolean {
  const requestedFactionId = requestUrl.searchParams.get('factionId')?.trim() || undefined
  const bearerToken = readBearerToken(req)
  const sessionContext = bearerToken ? getSessionControlContextByToken(bearerToken) : null
  if (!sessionContext) {
    writeJson(res, 401, {
      ok: false,
      deniedCopy: '这段传闻暂时不可分享',
    })
    return false
  }

  if (requestedFactionId && requestedFactionId !== sessionContext.factionId) {
    writeJson(res, 403, {
      ok: false,
      deniedCopy: '这段传闻暂时不可分享',
    })
    return false
  }

  return true
}

function authorizePlayerHistoryShareTokenIssue(
  req: IncomingMessage,
  res: ServerResponse,
  requestUrl: URL,
  eventId: string,
): {
  event: WorldEventRecord
  bearerToken: string
  sessionContext: NonNullable<ReturnType<typeof getSessionControlContextByToken>>
} | undefined {
  const requestedFactionId = requestUrl.searchParams.get('factionId')?.trim() || undefined
  const bearerToken = readBearerToken(req)
  const sessionContext = bearerToken ? getSessionControlContextByToken(bearerToken) : null
  if (!sessionContext) {
    writeJson(res, 401, {
      ok: false,
      deniedCopy: '这段纪事暂时不可分享',
    })
    return undefined
  }

  if (requestedFactionId && requestedFactionId !== sessionContext.factionId) {
    writeJson(res, 403, {
      ok: false,
      deniedCopy: '这段纪事暂时不可分享',
    })
    return undefined
  }

  const event = getWorldEvents(200).items.find((candidate) => candidate.id === eventId)
  if (!event) {
    writeJson(res, 404, {
      ok: false,
      deniedCopy: '这段纪事暂时不可分享',
    })
    return undefined
  }

  if (readEventMetadataString(event, 'playerHistorySharePolicy') !== 'explicit_spectator') {
    writeJson(res, 403, {
      ok: false,
      deniedCopy: '这段纪事暂时不可分享',
    })
    return undefined
  }

  const viewer = {
    factionId: sessionContext.factionId,
    organizationIds: resolveViewerOrganizationIds(sessionContext.factionId),
    organizationOfficerRoleIds: resolveViewerOrganizationOfficerRoleIds(sessionContext),
  }
  const scoped = filterPlayerHistoryEventsForViewer([event], viewer)
  if (scoped.events.length !== 1) {
    writeJson(res, 403, {
      ok: false,
      deniedCopy: '这段纪事暂时不可分享',
    })
    return undefined
  }

  if (!bearerToken) {
    writeJson(res, 401, {
      ok: false,
      deniedCopy: '这段纪事暂时不可分享',
    })
    return undefined
  }

  return { event, bearerToken, sessionContext }
}

function authorizePlayerHistoryShareManagement(
  req: IncomingMessage,
  res: ServerResponse,
  requestUrl: URL,
): {
  bearerToken: string
  sessionContext: NonNullable<ReturnType<typeof getSessionControlContextByToken>>
} | undefined {
  const requestedFactionId = requestUrl.searchParams.get('factionId')?.trim() || undefined
  const bearerToken = readBearerToken(req)
  const sessionContext = bearerToken ? getSessionControlContextByToken(bearerToken) : null
  if (!sessionContext) {
    writeJson(res, 401, {
      ok: false,
      deniedCopy: '暂无可管理的分享',
    })
    return undefined
  }

  if (requestedFactionId && requestedFactionId !== sessionContext.factionId) {
    writeJson(res, 403, {
      ok: false,
      deniedCopy: '暂无可管理的分享',
    })
    return undefined
  }

  if (!bearerToken) {
    writeJson(res, 401, {
      ok: false,
      deniedCopy: '暂无可管理的分享',
    })
    return undefined
  }

  return { bearerToken, sessionContext }
}

function readCivilMemoryShareAccess(
  civilMemoryId: string,
  shareToken: string,
  res: ServerResponse,
): { sharedScope: 'public_context', shareRetentionLabel: string } | undefined {
  const expiresAtMs = verifyCivilMemoryShareToken(civilMemoryId, shareToken)
  if (expiresAtMs !== undefined) {
    return {
      sharedScope: 'public_context',
      shareRetentionLabel: buildCivilMemoryShareRetentionLabel(expiresAtMs),
    }
  }

  writeJson(res, 401, {
    ok: false,
    deniedCopy: '这段传闻暂时不可查看',
  })
  return undefined
}

function buildCivilMemoryShareToken(civilMemoryId: string, expiresAtMs: number): string {
  const signature = signCivilMemoryShareToken(civilMemoryId, expiresAtMs)
  return `civil_memory_share_v1.${expiresAtMs}.${signature}`
}

function verifyCivilMemoryShareToken(civilMemoryId: string, token: string): number | undefined {
  const match = token.match(/^civil_memory_share_v1\.(\d+)\.([A-Za-z0-9_-]+)$/)
  if (!match) {
    return undefined
  }

  const expiresAtMs = Number(match[1])
  if (!Number.isFinite(expiresAtMs) || Date.now() > expiresAtMs) {
    return undefined
  }

  return match[2] === signCivilMemoryShareToken(civilMemoryId, expiresAtMs) ? expiresAtMs : undefined
}

function signCivilMemoryShareToken(civilMemoryId: string, expiresAtMs: number): string {
  return createHmac('sha256', readCivilMemoryShareTokenSecret())
    .update(`${civilMemoryId}.${expiresAtMs}`)
    .digest('base64url')
}

function verifyPlayerHistoryExplicitSpectatorShareToken(eventId: string, token: string | undefined): boolean {
  if (!token) {
    return false
  }

  const match = token.match(/^player_history_share_v1\.(\d+)\.([A-Za-z0-9_-]+)$/)
  if (!match) {
    return false
  }

  const expiresAtMs = Number(match[1])
  if (!Number.isFinite(expiresAtMs) || Date.now() > expiresAtMs) {
    return false
  }

  if (match[2] !== signPlayerHistoryExplicitSpectatorShareToken(eventId, expiresAtMs)) {
    return false
  }

  ensurePlayerHistoryShareGrantPersistenceLoaded()
  const record = playerHistoryShareGrantRecordsByToken.get(token)
  if (record) {
    return record.eventId === eventId && record.status === 'active' && Date.now() <= record.expiresAtMs
  }

  return true
}

function signPlayerHistoryExplicitSpectatorShareToken(eventId: string, expiresAtMs: number): string {
  return createHmac('sha256', readPlayerHistoryShareTokenSecret())
    .update(`${eventId}.${expiresAtMs}`)
    .digest('base64url')
}

function buildPlayerHistoryExplicitSpectatorShareToken(eventId: string, expiresAtMs: number): string {
  const signature = signPlayerHistoryExplicitSpectatorShareToken(eventId, expiresAtMs)
  return `player_history_share_v1.${expiresAtMs}.${signature}`
}

function registerPlayerHistoryShareGrant(input: {
  shareToken: string
  event: WorldEventRecord
  issuerToken: string
  issuerFactionId: string
  issuerSessionId: string
  issuerPlayerName: string
  expiresAtMs: number
}): PlayerHistoryShareGrantRecord {
  const signatureFragment = input.shareToken.split('.').at(-1)?.slice(0, 12) || 'share'
  const shareId = `player_history_share_${input.expiresAtMs}_${signatureFragment}`
  const record: PlayerHistoryShareGrantRecord = {
    shareId,
    shareToken: input.shareToken,
    eventId: input.event.id,
    issuerToken: input.issuerToken,
    issuerFactionId: input.issuerFactionId,
    issuerSessionId: input.issuerSessionId,
    issuerPlayerName: input.issuerPlayerName,
    issuedAtMs: Date.now(),
    expiresAtMs: input.expiresAtMs,
    status: 'active',
    eventTitle: readEventMetadataString(input.event, 'playerHistoryTitle') ?? '只读纪事',
  }
  playerHistoryShareGrantRecordsByToken.set(record.shareToken, record)
  playerHistoryShareGrantRecordsById.set(record.shareId, record)
  persistPlayerHistoryShareGrantRecords()
  return record
}

function canManagePlayerHistoryShareGrant(
  record: PlayerHistoryShareGrantRecord,
  managementContext: {
    bearerToken: string
    sessionContext: NonNullable<ReturnType<typeof getSessionControlContextByToken>>
  },
): boolean {
  if (record.issuerToken === managementContext.bearerToken) {
    return true
  }
  return record.issuerFactionId === managementContext.sessionContext.factionId &&
    record.issuerPlayerName.trim() === managementContext.sessionContext.playerName.trim()
}

function summarizePlayerHistoryShareGrant(record: PlayerHistoryShareGrantRecord) {
  const expired = Date.now() > record.expiresAtMs
  const status = record.status === 'revoked' ? 'revoked' : expired ? 'expired' : 'active'
  return {
    shareId: record.shareId,
    status,
    sharedScope: 'explicit_spectator',
    shareStateLabel: status === 'active'
      ? '已开放只读纪事'
      : status === 'revoked'
        ? '已撤回只读纪事'
        : '分享已过期',
    shareRetentionLabel: status === 'active' ? buildPlayerHistoryShareRetentionLabel(record.expiresAtMs) : status === 'revoked' ? '分享已撤回' : '分享已过期',
    eventTitle: record.eventTitle,
    issuedAtMs: record.issuedAtMs,
    expiresAtMs: record.expiresAtMs,
  }
}

function ensurePlayerHistoryShareGrantPersistenceLoaded() {
  if (playerHistoryShareGrantPersistenceLoaded) {
    return
  }
  playerHistoryShareGrantPersistenceLoaded = true

  if (!existsSync(PLAYER_HISTORY_SHARE_STATE_PATH)) {
    return
  }

  try {
    const raw = readFileSync(PLAYER_HISTORY_SHARE_STATE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    const records = normalizePersistedPlayerHistoryShareGrantRecords(parsed)
    playerHistoryShareGrantRecordsByToken.clear()
    playerHistoryShareGrantRecordsById.clear()
    for (const record of records) {
      playerHistoryShareGrantRecordsByToken.set(record.shareToken, record)
      playerHistoryShareGrantRecordsById.set(record.shareId, record)
    }
    if (records.length > 0) {
      console.log(`[PlayerHistoryShareGrantStore] restored ${records.length} share grants from disk`)
    }
  } catch {
    playerHistoryShareGrantRecordsByToken.clear()
    playerHistoryShareGrantRecordsById.clear()
    try {
      renameSync(PLAYER_HISTORY_SHARE_STATE_PATH, `${PLAYER_HISTORY_SHARE_STATE_PATH}.corrupt.${Date.now()}`)
    } catch {
      // Best-effort quarantine; the runtime can continue with an empty registry.
    }
    console.warn('[PlayerHistoryShareGrantStore] failed to restore share grants, using in-memory fallback')
  }
}

function persistPlayerHistoryShareGrantRecords() {
  try {
    const records = [...playerHistoryShareGrantRecordsById.values()]
      .sort((left, right) => right.issuedAtMs - left.issuedAtMs)
      .slice(0, MAX_PERSISTED_PLAYER_HISTORY_SHARES)
    const payload = `${JSON.stringify({
      version: PLAYER_HISTORY_SHARE_PERSIST_VERSION,
      shares: records,
    }, null, 2)}\n`
    mkdirSync(dirname(PLAYER_HISTORY_SHARE_STATE_PATH), { recursive: true })
    const tmpPath = `${PLAYER_HISTORY_SHARE_STATE_PATH}.tmp-${process.pid}-${Date.now()}`
    writeFileSync(tmpPath, payload, 'utf8')
    renameSync(tmpPath, PLAYER_HISTORY_SHARE_STATE_PATH)
  } catch {
    console.warn('[PlayerHistoryShareGrantStore] failed to persist share grants')
  }
}

function normalizePersistedPlayerHistoryShareGrantRecords(raw: unknown): PlayerHistoryShareGrantRecord[] {
  const items = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as { shares?: unknown }).shares
    : undefined
  if (!Array.isArray(items)) {
    return []
  }

  const records: PlayerHistoryShareGrantRecord[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const record = normalizePersistedPlayerHistoryShareGrantRecord(item)
    if (!record || seen.has(record.shareId)) {
      continue
    }
    seen.add(record.shareId)
    records.push(record)
    if (records.length >= MAX_PERSISTED_PLAYER_HISTORY_SHARES) {
      break
    }
  }
  return records
}

function normalizePersistedPlayerHistoryShareGrantRecord(raw: unknown): PlayerHistoryShareGrantRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }

  const item = raw as Partial<PlayerHistoryShareGrantRecord>
  const shareId = typeof item.shareId === 'string' ? item.shareId.trim() : ''
  const shareToken = typeof item.shareToken === 'string' ? item.shareToken.trim() : ''
  const eventId = typeof item.eventId === 'string' ? item.eventId.trim() : ''
  const issuerToken = typeof item.issuerToken === 'string' ? item.issuerToken.trim() : ''
  const issuerFactionId = typeof item.issuerFactionId === 'string' ? item.issuerFactionId.trim() : ''
  const issuerSessionId = typeof item.issuerSessionId === 'string' ? item.issuerSessionId.trim() : ''
  const issuerPlayerName = typeof item.issuerPlayerName === 'string' ? item.issuerPlayerName.trim() : ''
  const issuedAtMs = Math.max(0, Math.floor(Number(item.issuedAtMs)))
  const expiresAtMs = Math.max(issuedAtMs + 1, Math.floor(Number(item.expiresAtMs)))
  const status = item.status === 'revoked' ? 'revoked' : 'active'
  const eventTitle = typeof item.eventTitle === 'string' && item.eventTitle.trim()
    ? item.eventTitle.trim().slice(0, 120)
    : '只读纪事'

  if (!shareId || !shareToken || !eventId || !issuerToken || !issuerFactionId || !issuerSessionId || !issuerPlayerName) {
    return null
  }
  if (!Number.isFinite(issuedAtMs) || !Number.isFinite(expiresAtMs)) {
    return null
  }
  if (!/^player_history_share_v1\.\d+\.[A-Za-z0-9_-]+$/.test(shareToken)) {
    return null
  }

  return {
    shareId,
    shareToken,
    eventId,
    issuerToken,
    issuerFactionId,
    issuerSessionId,
    issuerPlayerName,
    issuedAtMs,
    expiresAtMs,
    status,
    eventTitle,
  }
}

function readPlayerHistoryShareTokenSecret(): string {
  const raw = process.env.PLAYER_HISTORY_SHARE_TOKEN_SECRET?.trim()
  return raw && raw.length > 0 ? raw : DEFAULT_PLAYER_HISTORY_SHARE_TOKEN_SECRET
}

function readRequestedPlayerHistoryShareTokenTtlMs(body: unknown): number {
  const raw = body && typeof body === 'object' && !Array.isArray(body)
    ? Number((body as Record<string, unknown>).ttlMs)
    : Number.NaN
  if (!Number.isFinite(raw)) {
    return DEFAULT_PLAYER_HISTORY_SHARE_TOKEN_TTL_MS
  }
  return Math.max(1, Math.min(Math.trunc(raw), MAX_PLAYER_HISTORY_SHARE_TOKEN_TTL_MS))
}

function buildPlayerHistoryShareRetentionLabel(expiresAtMs: number): string {
  const remainingMs = Math.max(0, expiresAtMs - Date.now())
  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60_000))
  return `分享约 ${remainingMinutes} 分钟内可查看`
}

function readCivilMemoryShareTokenSecret(): string {
  const raw = process.env.CIVIL_MEMORY_SHARE_TOKEN_SECRET?.trim()
  return raw && raw.length > 0 ? raw : DEFAULT_CIVIL_MEMORY_SHARE_TOKEN_SECRET
}

function readRequestedCivilMemoryShareTokenTtlMs(body: unknown): number {
  const raw = body && typeof body === 'object' && !Array.isArray(body)
    ? Number((body as Record<string, unknown>).ttlMs)
    : Number.NaN
  if (!Number.isFinite(raw)) {
    return DEFAULT_CIVIL_MEMORY_SHARE_TOKEN_TTL_MS
  }
  return Math.max(1, Math.min(Math.trunc(raw), MAX_CIVIL_MEMORY_SHARE_TOKEN_TTL_MS))
}

function buildCivilMemoryShareRetentionLabel(expiresAtMs: number): string {
  const remainingMs = Math.max(0, expiresAtMs - Date.now())
  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60_000))
  return `分享约 ${remainingMinutes} 分钟内可查看`
}
