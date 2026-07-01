import './bootstrap/loadEnv'
import type { Server as HttpServer, ServerResponse } from 'node:http'
import { createServer } from 'node:http'
import { handlePlanningRoute } from './routes/planning'
import { handleMapOverviewRoute } from './routes/map'
import { handleAiConfigGetRoute, handleAiConfigSaveRoute, handleAiLogsRoute, handleAiModelsRoute } from './routes/ai'
import {
  handleAiRuntimeObservabilityRoute,
  handleNarrativeEventsRoute,
  handleNationalAgendaRoute,
  handleCourtSessionRoute,
  handleCivilMemoryRoute,
  handleSaveSlotLoadRoute,
  handleSaveSlotArchiveRestoreApplyRoute,
  handleSaveSlotArchiveRestoreDrillRoute,
  handleSaveSlotArchiveRestoreRollbackDrillRoute,
  handleSaveSlotSmokeSetupPrimeRoute,
  handleSaveSlotSaveRoute,
  handleSaveSlotsArchiveRoute,
  handleSaveSlotsRoute,
  handleWorldEventsRoute,
  handleWorldEventsStreamRoute,
} from './routes/observability'
import {
  handleReplayArchiveRoute,
  handleReplayEntryRoute,
  handleReplayRagCacheStatsRoute,
  handleReplayShareTokenRoute,
} from './routes/replay'
import {
  handlePlayerHistoryCivilMemoryDetailRoute,
  handlePlayerHistoryCivilMemoryDetailShareTokenRoute,
  handlePlayerHistoryRoute,
  handlePlayerHistoryShareTokenListRoute,
  handlePlayerHistoryShareTokenRevokeRoute,
  handlePlayerHistoryShareTokenRoute,
} from './routes/playerHistory'
import {
  handleNationCapitalMigrationRoute,
  handleNationEmpireUpgradeRoute,
  handleNationFoundRoute,
  handleNationWarObjectivesRoute,
  handleOrganizationDiplomacyAuthorityRoute,
  handleOrganizationMembershipRoute,
  handleNationProfileUpdateRoute,
  handleNationProfilesRoute,
} from './routes/nation'
import { dispatchGeneralChatRoutes } from './routes/generalChat'
import { dispatchDiplomacyRoutes } from './routes/diplomacy'
import { dispatchAiPlayerRoutes } from './routes/aiPlayer'
import { dispatchInboxRoutes } from './routes/inbox'
import { dispatchSessionRoutes } from './routes/session'
import { dispatchV2Routes } from './routes/v2game'
import { isHttpBodyError, writeJson } from './routes/http'
import { dispatchFactionConfigRoutes } from './routes/factionConfigRoutes'
import {
  handleMainCityFacilityTreeReadModelRoute,
  handleMainCityFacilityEntryReadModelRoute,
  handleMainCityInteriorReadModelRoute,
  handleMainCityInteriorWorkOrderActionRoute,
  handleMainCityTroopFormationReadModelRoute,
  handleWorldActionRoute,
  handleWorldAffairsRoute,
  handleWorldMapLayoutRoute,
  handleWorldSummaryRoute,
  handleWorldTasksRoute,
} from './routes/world'
import { flushAiHubConfigPersist, getAiHubConfigPersistHealth } from './application/ai/AiConfigService'
import { flushAiPlayerGovernancePersist, getAiPlayerGovernancePersistHealth } from './application/ai/AIPlayerGovernanceService'
import { startAiPlayerChatPatrolScheduler, stopAiPlayerChatPatrolScheduler } from './application/ai/aiPlayerChatCommandService'
import { getAiPlayerProviderAccountOpsMutationDeployment } from './application/ai/aiPlayerProviderAccountOpsDeployment'
import { flushAiPlayerProviderAccountStorePersist, getAiPlayerProviderAccountStoreHealth } from './application/ai/aiPlayerProviderAccountStore'
import { flushFactionConfigPersist, getFactionConfigPersistHealth } from './application/faction/FactionConfigStore'
import { hasUnresolvedPersistFailure } from './application/persistence/persistFailureStatus'
import { flushV2GamePersist, getV2GamePersistHealth } from './application/v2/V2GameService'
import {
  flushWorldPersist,
  flushNarrativePersist,
  flushGovernancePersist,
  flushSaveSlotsPersist,
  createWorldDeltaSnapshot,
  getSaveSlotsPersistHealth,
  getWorldStateReadonly,
  getWorldStatePersistHealth,
} from './application/world/WorldService'
import { attachWebSocket, broadcastTickDelta } from './ws/GameWebSocket'
import { createWorldStore } from './infra/store/RedisWorldStore'
import { gameClock } from './application/clock/GameClock'
import type { WorldMapLayoutLayerRequest } from '../../shared/contracts/game'
import { runtimeConfig } from './runtime/runtimeConfig'
import { flushNegotiationInboxPersist } from './agents/general/GeneralNegotiationChannel'
import { flushSessionPersist, getSessionPersistHealth } from './multiplayer/SessionManager'

const { host, port, allowFullMapLayout, gameClockEnabled } = runtimeConfig
const aiPlayerChatPatrolSchedulerEnabled = readBooleanEnv('AI_PLAYER_CHAT_PATROL_SCHEDULER_ENABLED', false)

const MAX_WORLD_SUMMARY_HISTORY_LIMIT = 500
const MAX_WORLD_REPLAY_LIMIT = 500
const MAX_WORLD_REPLAY_FRAME_LIMIT = 1000
const MAX_AI_LOGS_LIMIT = 200

function parsePositiveInt(value: string | null) {
  if (!value) {
    return undefined
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return undefined
  }

  const normalized = Math.floor(parsed)
  return normalized > 0 ? normalized : undefined
}

function parseCellSize(value: string | null) {
  if (!value) {
    return undefined
  }

  const match = value.trim().match(/^(\d+)x(\d+)$/i)
  if (!match) {
    const size = parsePositiveInt(value)
    return size ? { width: size, height: size } : undefined
  }

  const width = parsePositiveInt(match[1])
  const height = parsePositiveInt(match[2])
  return width && height ? { width, height } : undefined
}

function parseCommaSeparatedList(value: string | null) {
  if (!value) {
    return undefined
  }

  const parsed = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  return parsed.length > 0 ? parsed : undefined
}

const WORLD_MAP_LAYOUT_LAYER_REQUEST_WHITELIST: WorldMapLayoutLayerRequest[] = [
  'base_map',
  'derived_masks',
  'maritime_passability',
  'resource_overlay',
  'city_gate_anchors',
  'main_world_cells',
  'cell_overrides',
  'tianxia_yutu_overview',
  'main_world_mountain_boundaries',
  'main_world_chokepoints',
  'labels',
  'state_detail_tiles',
  'state_road_network',
  'state_strategic_nodes',
]
const WORLD_MAP_LAYOUT_LAYER_REQUEST_SET = new Set<string>(WORLD_MAP_LAYOUT_LAYER_REQUEST_WHITELIST)

function parseWorldMapLayoutLayers(raw: string | null): WorldMapLayoutLayerRequest[] | undefined {
  const rawLayers = parseCommaSeparatedList(raw)
  if (!rawLayers) {
    return undefined
  }

  const filtered = rawLayers.filter((layer): layer is WorldMapLayoutLayerRequest =>
    WORLD_MAP_LAYOUT_LAYER_REQUEST_SET.has(layer),
  )

  return filtered.length > 0 ? filtered : undefined
}

type PersistenceSeverity = 'high' | 'medium' | 'low'

type PersistenceAlert = {
  severity: PersistenceSeverity
  source: 'factionConfig' | 'aiConfig' | 'aiPlayerGovernance' | 'aiPlayerProviderAccounts' | 'v2Game' | 'session' | 'saveSlots'
  code: string
  message: string
}

function buildPersistenceSnapshot() {
  const worldState = getWorldStatePersistHealth()
  const factionConfig = getFactionConfigPersistHealth()
  const aiConfig = getAiHubConfigPersistHealth()
  const aiPlayerGovernance = getAiPlayerGovernancePersistHealth()
  const aiPlayerProviderAccounts = buildAiPlayerProviderAccountsReadinessHealth()
  const v2Game = getV2GamePersistHealth()
  const session = getSessionPersistHealth()
  const saveSlots = getSaveSlotsPersistHealth()
  const alerts = buildPersistenceAlerts({
    factionConfig,
    aiConfig,
    aiPlayerGovernance,
    aiPlayerProviderAccounts,
    v2Game,
    session,
    saveSlots,
  })

  return {
    worldState,
    factionConfig,
    aiConfig,
    aiPlayerGovernance,
    aiPlayerProviderAccounts,
    v2Game,
    session,
    saveSlots,
    alerts,
  }
}

function buildAiPlayerProviderAccountsReadinessHealth() {
  return {
    ...getAiPlayerProviderAccountStoreHealth(),
    opsMutationDeployment: getAiPlayerProviderAccountOpsMutationDeployment(),
  }
}

function buildPersistenceAlerts(input: {
  factionConfig: ReturnType<typeof getFactionConfigPersistHealth>
  aiConfig: ReturnType<typeof getAiHubConfigPersistHealth>
  aiPlayerGovernance: ReturnType<typeof getAiPlayerGovernancePersistHealth>
  aiPlayerProviderAccounts: ReturnType<typeof buildAiPlayerProviderAccountsReadinessHealth>
  v2Game: ReturnType<typeof getV2GamePersistHealth>
  session: ReturnType<typeof getSessionPersistHealth>
  saveSlots: ReturnType<typeof getSaveSlotsPersistHealth>
}): PersistenceAlert[] {
  const alerts: PersistenceAlert[] = []

  if (input.factionConfig.security.secretPersistMode === 'memory_only') {
    alerts.push({
      severity: 'high',
      source: 'factionConfig',
      code: 'missing_encryption_key',
      message:
        'BYOK apiKey persistence is disabled because FACTION_APIKEY_ENCRYPTION_KEY is missing and plaintext persist is off.',
    })
  }

  if (input.factionConfig.security.allowPlaintextPersist) {
    alerts.push({
      severity: 'medium',
      source: 'factionConfig',
      code: 'plaintext_persist_enabled',
      message: 'FACTION_APIKEY_ALLOW_PLAINTEXT_PERSIST is enabled; BYOK apiKey may be persisted in plaintext.',
    })
  }

  if (input.aiPlayerProviderAccounts.security.secretPersistMode === 'memory_only') {
    alerts.push({
      severity: 'high',
      source: 'aiPlayerProviderAccounts',
      code: 'missing_encryption_key',
      message:
        'Player-level BYOK apiKey persistence is disabled because FACTION_APIKEY_ENCRYPTION_KEY is missing and plaintext persist is off.',
    })
  }

  if (input.aiPlayerProviderAccounts.security.allowPlaintextPersist) {
    alerts.push({
      severity: 'medium',
      source: 'aiPlayerProviderAccounts',
      code: 'plaintext_persist_enabled',
      message: 'FACTION_APIKEY_ALLOW_PLAINTEXT_PERSIST is enabled; player-level BYOK apiKey may be persisted in plaintext.',
    })
  }

  if (!input.aiPlayerProviderAccounts.opsMutationDeployment.mutationRoutesEnabled) {
    const blockedReason = input.aiPlayerProviderAccounts.opsMutationDeployment.blockedReason
      ?? 'provider_account_ops_deployment_not_trusted'
    alerts.push({
      severity: 'high',
      source: 'aiPlayerProviderAccounts',
      code: blockedReason,
      message: blockedReason === 'provider_account_ops_trusted_proxy_signature_not_configured'
        ? 'Provider account ops trusted proxy mode is blocked in production because AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_SIGNATURE_SECRET is not configured.'
        : 'Provider account ops mutation routes are blocked in production because AI_PLAYER_PROVIDER_ACCOUNT_OPS_INTERNAL_ONLY or AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY is not explicitly enabled.',
    })
  }

  const persistFailureRules: Array<{
    source: PersistenceAlert['source']
    failureCount: number
    lastPersistAt: number | null
    lastPersistErrorAt: number | null
  }> = [
    {
      source: 'factionConfig',
      failureCount: input.factionConfig.persistFailureCount,
      lastPersistAt: input.factionConfig.lastPersistAt,
      lastPersistErrorAt: input.factionConfig.lastPersistErrorAt,
    },
    {
      source: 'aiConfig',
      failureCount: input.aiConfig.persistFailureCount,
      lastPersistAt: input.aiConfig.lastPersistAt,
      lastPersistErrorAt: input.aiConfig.lastPersistErrorAt,
    },
    {
      source: 'aiPlayerGovernance',
      failureCount: input.aiPlayerGovernance.persistFailureCount,
      lastPersistAt: input.aiPlayerGovernance.lastPersistAt,
      lastPersistErrorAt: input.aiPlayerGovernance.lastPersistErrorAt,
    },
    {
      source: 'aiPlayerProviderAccounts',
      failureCount: input.aiPlayerProviderAccounts.persistFailureCount,
      lastPersistAt: input.aiPlayerProviderAccounts.lastPersistAt,
      lastPersistErrorAt: input.aiPlayerProviderAccounts.lastPersistErrorAt,
    },
    {
      source: 'v2Game',
      failureCount: input.v2Game.persistFailureCount,
      lastPersistAt: input.v2Game.lastPersistAt,
      lastPersistErrorAt: input.v2Game.lastPersistErrorAt,
    },
    {
      source: 'session',
      failureCount: input.session.persistFailureCount,
      lastPersistAt: input.session.lastPersistAt,
      lastPersistErrorAt: input.session.lastPersistErrorAt,
    },
    {
      source: 'saveSlots',
      failureCount: input.saveSlots.persistFailureCount,
      lastPersistAt: input.saveSlots.lastPersistAt,
      lastPersistErrorAt: input.saveSlots.lastPersistErrorAt,
    },
  ]

  for (const rule of persistFailureRules) {
    if (!hasUnresolvedPersistFailure(rule)) {
      continue
    }

    alerts.push({
      severity: rule.failureCount >= 5 ? 'high' : 'medium',
      source: rule.source,
      code: 'persist_failures',
      message:
        `Detected ${rule.failureCount} persistence write failures for ${rule.source}; ` +
        'latest failure has not been followed by a successful write.',
    })
  }

  const quarantineRules: Array<{
    source: PersistenceAlert['source']
    quarantineCount: number
  }> = [
    { source: 'factionConfig', quarantineCount: input.factionConfig.corruptQuarantineCount },
    { source: 'aiConfig', quarantineCount: input.aiConfig.corruptQuarantineCount },
    { source: 'aiPlayerGovernance', quarantineCount: input.aiPlayerGovernance.corruptQuarantineCount },
    { source: 'aiPlayerProviderAccounts', quarantineCount: input.aiPlayerProviderAccounts.corruptQuarantineCount },
    { source: 'v2Game', quarantineCount: input.v2Game.corruptQuarantineCount },
    { source: 'session', quarantineCount: input.session.corruptQuarantineCount },
    { source: 'saveSlots', quarantineCount: input.saveSlots.corruptQuarantineCount },
  ]

  for (const rule of quarantineRules) {
    if (rule.quarantineCount <= 0) {
      continue
    }

    alerts.push({
      severity: rule.quarantineCount >= 3 ? 'high' : 'medium',
      source: rule.source,
      code: rule.quarantineCount >= 3 ? 'quarantine_surge' : 'quarantine_detected',
      message: `Detected ${rule.quarantineCount} corrupt-store quarantine events for ${rule.source}.`,
    })
  }

  const saveSlotsFileSizeBytes = input.saveSlots.fileSizeBytes
  if (input.saveSlots.fileSizeLevel === 'hard' && typeof saveSlotsFileSizeBytes === 'number') {
    alerts.push({
      severity: 'high',
      source: 'saveSlots',
      code: 'save_slots_oversize_hard',
      message: `Save-slot store size ${saveSlotsFileSizeBytes} bytes reached hard limit ${input.saveSlots.hardLimitBytes} bytes.`,
    })
  } else if (input.saveSlots.fileSizeLevel === 'soft' && typeof saveSlotsFileSizeBytes === 'number') {
    alerts.push({
      severity: 'medium',
      source: 'saveSlots',
      code: 'save_slots_oversize_soft',
      message: `Save-slot store size ${saveSlotsFileSizeBytes} bytes reached soft limit ${input.saveSlots.softLimitBytes} bytes.`,
    })
  }

  if (input.saveSlots.archiveFailureCount > 0) {
    alerts.push({
      severity: input.saveSlots.archiveFailureCount >= 3 ? 'high' : 'medium',
      source: 'saveSlots',
      code: 'save_slots_archive_failures',
      message: `Save-slot archive pipeline has ${input.saveSlots.archiveFailureCount} failures.`,
    })
  }

  if (input.saveSlots.lockContentionCount > 0) {
    alerts.push({
      severity: input.saveSlots.lockContentionCount >= 3 ? 'high' : 'medium',
      source: 'saveSlots',
      code: 'save_slots_lock_contention',
      message: `Save-slot persist lock contention observed ${input.saveSlots.lockContentionCount} times.`,
    })
  }

  if (input.saveSlots.lockFailureCount > 0) {
    alerts.push({
      severity: 'high',
      source: 'saveSlots',
      code: 'save_slots_lock_failures',
      message: `Save-slot persist lock operations failed ${input.saveSlots.lockFailureCount} times.`,
    })
  }

  if (input.saveSlots.restoreDrillFailureCount > 0) {
    alerts.push({
      severity: input.saveSlots.restoreDrillFailureCount >= 3 ? 'high' : 'medium',
      source: 'saveSlots',
      code: 'save_slots_restore_drill_failures',
      message: `Save-slot archive restore drills failed ${input.saveSlots.restoreDrillFailureCount} times.`,
    })
  }

  if (input.saveSlots.restoreApplyFailureCount > 0) {
    alerts.push({
      severity: input.saveSlots.restoreApplyFailureCount >= 3 ? 'high' : 'medium',
      source: 'saveSlots',
      code: 'save_slots_restore_apply_failures',
      message: `Save-slot archive restore apply failed ${input.saveSlots.restoreApplyFailureCount} times.`,
    })
  }

  if (input.saveSlots.restoreRollbackDrillFailureCount > 0) {
    alerts.push({
      severity: input.saveSlots.restoreRollbackDrillFailureCount >= 3 ? 'high' : 'medium',
      source: 'saveSlots',
      code: 'save_slots_restore_rollback_drill_failures',
      message: `Save-slot restore rollback drills failed ${input.saveSlots.restoreRollbackDrillFailureCount} times.`,
    })
  }

  return alerts
}

function logPersistenceStartupAlerts(snapshot: ReturnType<typeof buildPersistenceSnapshot>) {
  if (snapshot.alerts.length === 0) {
    console.log('[startup-check] persistence health: ok')
    return
  }

  for (const alert of snapshot.alerts) {
    const line = `[startup-check][persistence][${alert.severity.toUpperCase()}][${alert.source}][${alert.code}] ${alert.message}`
    if (alert.severity === 'high') {
      console.error(line)
      continue
    }
    console.warn(line)
  }
}

const server = createServer(async (req, res) => {
  try {
  applyCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`)

  if (req.method === 'GET' && requestUrl.pathname === '/api/health') {
    const world = getWorldStateReadonly()
    const persistence = buildPersistenceSnapshot()
    writeJson(res, 200, {
      ok: true,
      service: 'slg-backend',
      now: new Date().toISOString(),
      uptimeSec: Math.floor(process.uptime()),
      runtime: {
        host,
        port,
        gameClockEnabled,
      },
      world: {
        tick: world.tick,
        worldVersion: world.worldVersion,
        factionCount: Object.keys(world.factions).length,
        unitCount: world.units.length,
        reportCount: world.reports.length,
      },
      persistence,
    })
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/world') {
    const sinceWorldVersionRaw = requestUrl.searchParams.get('sinceWorldVersion')
    const parsedSinceWorldVersion = sinceWorldVersionRaw ? Number(sinceWorldVersionRaw) : Number.NaN
    const sinceWorldVersion = Number.isFinite(parsedSinceWorldVersion)
      ? Math.max(0, Math.floor(parsedSinceWorldVersion))
      : undefined

    const planningHistoryLimitRaw = requestUrl.searchParams.get('planningHistoryLimit')
    const parsedPlanningHistoryLimit = planningHistoryLimitRaw ? Number(planningHistoryLimitRaw) : Number.NaN
    const planningHistoryLimit = Number.isFinite(parsedPlanningHistoryLimit)
      ? Math.max(1, Math.min(MAX_WORLD_SUMMARY_HISTORY_LIMIT, Math.floor(parsedPlanningHistoryLimit)))
      : undefined

    const replayLimitRaw = requestUrl.searchParams.get('replayLimit')
    const parsedReplayLimit = replayLimitRaw ? Number(replayLimitRaw) : Number.NaN
    const replayLimit = Number.isFinite(parsedReplayLimit)
      ? Math.max(1, Math.min(MAX_WORLD_REPLAY_LIMIT, Math.floor(parsedReplayLimit)))
      : undefined

    const replayFrameLimitRaw = requestUrl.searchParams.get('replayFrameLimit')
    const parsedReplayFrameLimit = replayFrameLimitRaw ? Number(replayFrameLimitRaw) : Number.NaN
    const replayFrameLimit = Number.isFinite(parsedReplayFrameLimit)
      ? Math.max(1, Math.min(MAX_WORLD_REPLAY_FRAME_LIMIT, Math.floor(parsedReplayFrameLimit)))
      : undefined

    const intelMode = requestUrl.searchParams.get('intelMode') === 'full' ? 'full' : 'sparse'

    handleWorldSummaryRoute(req, res, {
      sinceWorldVersion,
      planningHistoryLimit,
      replayLimit,
      replayFrameLimit,
      intelMode,
      asAiPlayerId: requestUrl.searchParams.get('asAiPlayerId') ?? undefined,
      governorPlayerId: requestUrl.searchParams.get('governorPlayerId') ?? undefined,
    })
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/world/world-affairs') {
    handleWorldAffairsRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/world/tasks') {
    handleWorldTasksRoute(req, res, {
      factionId: requestUrl.searchParams.get('factionId') ?? undefined,
    })
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/world/main-city/facility-tree') {
    handleMainCityFacilityTreeReadModelRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/world/main-city/facility-entry') {
    handleMainCityFacilityEntryReadModelRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/world/main-city/interior') {
    handleMainCityInteriorReadModelRoute(req, res)
    return
  }

  const interiorWorkOrderActionRoutePrefix = '/api/world/main-city/interior/work-orders'
  const interiorWorkOrderActionMatch = /^\/api\/world\/main-city\/interior\/work-orders\/([^/]+)\/actions\/([^/]+)$/.exec(requestUrl.pathname)
  if (req.method === 'POST' && requestUrl.pathname.startsWith(interiorWorkOrderActionRoutePrefix) && interiorWorkOrderActionMatch) {
    await handleMainCityInteriorWorkOrderActionRoute(req, res, {
      queueItemId: decodeURIComponent(interiorWorkOrderActionMatch[1] ?? ''),
      actionId: decodeURIComponent(interiorWorkOrderActionMatch[2] ?? ''),
    })
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/world/main-city/troop-formation') {
    handleMainCityTroopFormationReadModelRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/world/map-layout') {
    const scopeRaw = requestUrl.searchParams.get('scope')
    if (scopeRaw === 'full' && !allowFullMapLayout) {
      writeJson(res, 403, {
        error: 'scope=full is disabled on this server. Set ENABLE_FULL_MAP_LAYOUT=1 to enable debug export.',
      })
      return
    }

    const scope =
      scopeRaw === 'bootstrap' ||
      scopeRaw === 'province' ||
      scopeRaw === 'region' ||
      scopeRaw === 'full' ||
      scopeRaw === 'viewport'
        ? scopeRaw
        : 'bootstrap'

    const provinceId = requestUrl.searchParams.get('provinceId')?.trim() || undefined
    const regionId = requestUrl.searchParams.get('regionId')?.trim() || undefined

    const centerXRaw = requestUrl.searchParams.get('centerX')
    const parsedCenterX = centerXRaw ? Number(centerXRaw) : Number.NaN
    const centerX = Number.isFinite(parsedCenterX) ? Math.floor(parsedCenterX) : undefined

    const centerYRaw = requestUrl.searchParams.get('centerY')
    const parsedCenterY = centerYRaw ? Number(centerYRaw) : Number.NaN
    const centerY = Number.isFinite(parsedCenterY) ? Math.floor(parsedCenterY) : undefined

    const visibleSizeCells = parseCellSize(requestUrl.searchParams.get('visibleSizeCells'))
    const visibleCells = parseCellSize(requestUrl.searchParams.get('visibleCells')) ?? visibleSizeCells
    const preloadMarginCells =
      parsePositiveInt(requestUrl.searchParams.get('preloadMargin')) ??
      parsePositiveInt(requestUrl.searchParams.get('preloadMarginCells'))
    const chunkSizeCells = parseCellSize(requestUrl.searchParams.get('chunkSize'))

    const layerRaw = requestUrl.searchParams.get('layer')
    const layer =
      layerRaw === 'nation' ||
      layerRaw === 'province' ||
      layerRaw === 'region' ||
      layerRaw === 'tile' ||
      layerRaw === 'layered'
        ? layerRaw
        : undefined
    const includeLayers = parseWorldMapLayoutLayers(requestUrl.searchParams.get('includeLayers'))
    const loadedChunkIds =
      parseCommaSeparatedList(requestUrl.searchParams.get('loadedChunkIds')) ??
      parseCommaSeparatedList(requestUrl.searchParams.get('clientLoadedChunkIds'))
    const stateDetailStateId = requestUrl.searchParams.get('stateDetailStateId')?.trim() || undefined

    handleWorldMapLayoutRoute(req, res, {
      scope,
      provinceId,
      regionId,
      centerX,
      centerY,
      visibleCells,
      visibleSizeCells,
      preloadMarginCells,
      chunkSizeCells,
      layer,
      worldId: requestUrl.searchParams.get('worldId')?.trim() || undefined,
      coordinateSpace: requestUrl.searchParams.get('coordinateSpace')?.trim() || undefined,
      includeLayers,
      loadedChunkIds,
      tianxiaYutuScalePreset: requestUrl.searchParams.get('tianxiaYutuScalePreset')?.trim() || undefined,
      stateDetailStateId,
    })
    return
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/world/action') {
    const includeWorldRaw = requestUrl.searchParams.get('includeWorld')?.toLowerCase()
    const includeWorld =
      includeWorldRaw === '1' ||
      includeWorldRaw === 'true' ||
      includeWorldRaw === 'yes'

    await handleWorldActionRoute(req, res, {
      includeWorld,
      asAiPlayerId: requestUrl.searchParams.get('asAiPlayerId') ?? undefined,
      governorPlayerId: requestUrl.searchParams.get('governorPlayerId') ?? undefined,
    })
    return
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/planning/create') {
    await handlePlanningRoute(req, res)
    return
  }


  if (req.method === 'GET' && requestUrl.pathname === '/api/ai/models') {
    await handleAiModelsRoute(req, res)
    return
  }

  if (
    requestUrl.pathname === '/api/ai/player-actions/catalog' ||
    requestUrl.pathname === '/api/ai/knowledge-graph' ||
    requestUrl.pathname === '/api/ai/chat/patrol-scheduler/run' ||
    requestUrl.pathname.startsWith('/api/ai/provider') ||
    requestUrl.pathname === '/api/ai/players' ||
    requestUrl.pathname.startsWith('/api/ai/players/')
  ) {
    await dispatchAiPlayerRoutes(req, res, requestUrl.pathname, requestUrl)
    return
  }

  if (await dispatchInboxRoutes(req, res, requestUrl.pathname, requestUrl)) {
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/ai/logs') {
    const parsedLimit = Number(requestUrl.searchParams.get('limit') ?? '20')
    const limit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(MAX_AI_LOGS_LIMIT, Math.floor(parsedLimit)))
      : 20
    handleAiLogsRoute(req, res, limit)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/ai/config') {
    handleAiConfigGetRoute(req, res)
    return
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/ai/config') {
    await handleAiConfigSaveRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/replay/archive') {
    handleReplayArchiveRoute(req, res)
    return
  }


  if (req.method === 'GET' && requestUrl.pathname === '/api/replay/rag-cache') {
    handleReplayRagCacheStatsRoute(req, res)
    return
  }

  if (req.method === 'POST' && requestUrl.pathname.startsWith('/api/replay/') && requestUrl.pathname.endsWith('/share-token')) {
    const requestId = requestUrl.pathname.slice('/api/replay/'.length, -'/share-token'.length)
    if (!requestId) {
      writeJson(res, 400, { error: 'requestId is required.' })
      return
    }

    await handleReplayShareTokenRoute(req, res, requestId)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname.startsWith('/api/replay/')) {
    const requestId = requestUrl.pathname.slice('/api/replay/'.length)
    if (!requestId) {
      writeJson(res, 400, { error: 'requestId is required.' })
      return
    }

    handleReplayEntryRoute(req, res, requestId)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/map/overview') {
    handleMapOverviewRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/nation/profiles') {
    handleNationProfilesRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/nation/organization/membership') {
    handleOrganizationMembershipRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/nation/organization/diplomacy-authority') {
    handleOrganizationDiplomacyAuthorityRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/nation/war-objectives') {
    handleNationWarObjectivesRoute(req, res)
    return
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/nation/found') {
    await handleNationFoundRoute(req, res)
    return
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/nation/empire/upgrade') {
    await handleNationEmpireUpgradeRoute(req, res)
    return
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/nation/capital/migrate') {
    await handleNationCapitalMigrationRoute(req, res)
    return
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/nation/profile/update') {
    await handleNationProfileUpdateRoute(req, res)
    return
  }


  if (req.method === 'GET' && requestUrl.pathname === '/api/events/stream') {
    handleWorldEventsStreamRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/player-history') {
    handlePlayerHistoryRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/player-history/civil-memory-detail') {
    handlePlayerHistoryCivilMemoryDetailRoute(req, res)
    return
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/player-history/civil-memory-detail/share-token') {
    await handlePlayerHistoryCivilMemoryDetailShareTokenRoute(req, res)
    return
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/player-history/share-token') {
    await handlePlayerHistoryShareTokenRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/player-history/share-token') {
    handlePlayerHistoryShareTokenListRoute(req, res)
    return
  }

  if (req.method === 'DELETE' && requestUrl.pathname === '/api/player-history/share-token') {
    handlePlayerHistoryShareTokenRevokeRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/events') {
    handleWorldEventsRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/observability/ai-runtime') {
    handleAiRuntimeObservabilityRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/narratives') {
    handleNarrativeEventsRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/comm-bus/national-agenda') {
    handleNationalAgendaRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/court/session/latest') {
    handleCourtSessionRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/civil-memory') {
    handleCivilMemoryRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/save-slots') {
    handleSaveSlotsRoute(req, res)
    return
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/save-slots/archive') {
    handleSaveSlotsArchiveRoute(req, res)
    return
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/save-slots/save') {
    await handleSaveSlotSaveRoute(req, res)
    return
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/save-slots/load') {
    await handleSaveSlotLoadRoute(req, res)
    return
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/save-slots/smoke-setup/prime') {
    await handleSaveSlotSmokeSetupPrimeRoute(req, res)
    return
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/save-slots/archive/restore-drill') {
    await handleSaveSlotArchiveRestoreDrillRoute(req, res)
    return
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/save-slots/archive/restore') {
    await handleSaveSlotArchiveRestoreApplyRoute(req, res)
    return
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/save-slots/archive/restore-rollback-drill') {
    await handleSaveSlotArchiveRestoreRollbackDrillRoute(req, res)
    return
  }

  if (requestUrl.pathname.startsWith('/api/generals')) {
    await dispatchGeneralChatRoutes(req, res, requestUrl.pathname)
    return
  }

  if (requestUrl.pathname.startsWith('/api/diplomacy')) {
    await dispatchDiplomacyRoutes(req, res, requestUrl.pathname)
    return
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/world/diagnostic/emit-ai-quota-delta') {
    const factionId = requestUrl.searchParams.get('factionId')?.trim() || 'player'
    const world = getWorldStateReadonly()
    const previous = createWorldDeltaSnapshot(world)
    const syntheticCurrent = createWorldDeltaSnapshot(world)
    const targetFaction = previous.factions[factionId]
    const quota = targetFaction?.aiQuota
    if (!targetFaction || !quota) {
      writeJson(res, 404, { error: `unknown faction or aiQuota missing: ${factionId}` })
      return
    }

    const worldQuota = world.factions[factionId]?.aiQuota
    const baselineCurrent = worldQuota?.currentQuota ?? quota.currentQuota
    const maxQuota = worldQuota?.maxQuota ?? quota.maxQuota
    const minQuota = worldQuota?.initialQuota ?? quota.initialQuota

    let nextQuota = baselineCurrent
    if (baselineCurrent < maxQuota) {
      nextQuota = baselineCurrent + 1
    } else if (baselineCurrent > minQuota) {
      nextQuota = baselineCurrent - 1
    }

    quota.currentQuota = baselineCurrent
    const currentFaction = syntheticCurrent.factions[factionId]
    if (currentFaction?.aiQuota) {
      currentFaction.aiQuota.currentQuota = nextQuota
    }

    broadcastTickDelta(previous, syntheticCurrent, [])

    writeJson(res, 200, {
      ok: true,
      factionId,
      tick: world.tick,
      previousQuota: baselineCurrent,
      currentQuota: nextQuota,
      maxQuota,
      baselineCurrentQuota: baselineCurrent,
      direction: nextQuota > baselineCurrent ? 'expansion' : nextQuota < baselineCurrent ? 'shrink' : 'flat',
      note: 'diagnostic tick_delta emitted (world state unchanged)',
    })
    return
  }

  if (requestUrl.pathname.startsWith('/api/session')) {
    await dispatchSessionRoutes(req, res, requestUrl.pathname)
    return
  }

  if (requestUrl.pathname.startsWith('/api/v2')) {
    await dispatchV2Routes(req, res, requestUrl.pathname)
    return
  }

  if (requestUrl.pathname.startsWith('/api/faction')) {
    const handled = await dispatchFactionConfigRoutes(req, res, requestUrl.pathname)
    if (handled) return
  }

  writeJson(res, 404, { error: 'Route not found.' })
  } catch (err) {
    console.error('[app] unhandled route error:', err)
    if (!res.writableEnded) {
      if (isHttpBodyError(err)) {
        writeJson(res, err.statusCode, { error: err.message })
        return
      }

      writeJson(res, 500, { error: err instanceof Error ? err.message : 'Internal server error' })
    }
  }
})

applyHttpServerGuards(server)

server.listen(port, host, () => {
  console.log(`planning server listening on http://${host}:${port}`)
  // P1-7: 初始化 WorldStore（Redis 或 InMemory）
  createWorldStore().catch(err => {
    console.warn('[app] WorldStore init warning:', err instanceof Error ? err.message : err)
  })
  // 启动游戏时钟（当 GAME_CLOCK_ENABLED=1 时自动推进 tick + L2 自主规划）
  if (gameClockEnabled) {
    gameClock.start()
  }
  if (aiPlayerChatPatrolSchedulerEnabled) {
    startAiPlayerChatPatrolScheduler({
      intervalMs: readIntEnv('AI_PLAYER_CHAT_PATROL_SCHEDULER_INTERVAL_MS', 60_000, 5_000, 3_600_000),
      cooldownTicks: readIntEnv('AI_PLAYER_CHAT_PATROL_SCHEDULER_COOLDOWN_TICKS', 6, 0, 100000),
      limit: readIntEnv('AI_PLAYER_CHAT_PATROL_SCHEDULER_LIMIT', 10, 1, 50),
    })
  }

  const persistence = buildPersistenceSnapshot()
  logPersistenceStartupAlerts(persistence)
})

// WebSocket Delta 协议挂载（ws://host:port/ws）
attachWebSocket(server)

let shuttingDown = false

async function gracefulShutdown(signal: string) {
  if (shuttingDown) {
    return
  }
  shuttingDown = true

  console.log(`[app] received ${signal}, flushing state to disk...`)
  gameClock.stop()
  stopAiPlayerChatPatrolScheduler()

  try {
    await Promise.all([
      flushWorldPersist(),
      flushNarrativePersist(),
      flushGovernancePersist(),
      flushNegotiationInboxPersist(),
      flushFactionConfigPersist(),
      flushAiHubConfigPersist(),
      flushAiPlayerGovernancePersist(),
      flushAiPlayerProviderAccountStorePersist(),
      flushV2GamePersist(),
      flushSessionPersist(),
      flushSaveSlotsPersist(),
    ])
  } finally {
    process.exit(0)
  }
}

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT')
})
process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM')
})

function applyHttpServerGuards(server: HttpServer) {
  const requestTimeoutMs = readIntEnv('HTTP_REQUEST_TIMEOUT_MS', 60_000, 5_000, 300_000)
  const headersTimeoutMs = readIntEnv(
    'HTTP_HEADERS_TIMEOUT_MS',
    Math.min(120_000, requestTimeoutMs + 5_000),
    5_000,
    300_000,
  )
  const keepAliveTimeoutMs = readIntEnv('HTTP_KEEP_ALIVE_TIMEOUT_MS', 5_000, 1_000, 120_000)
  const maxRequestsPerSocket = readIntEnv('HTTP_MAX_REQUESTS_PER_SOCKET', 100, 1, 10_000)

  server.requestTimeout = requestTimeoutMs
  server.headersTimeout = headersTimeoutMs
  server.keepAliveTimeout = keepAliveTimeoutMs
  server.maxRequestsPerSocket = maxRequestsPerSocket
}

function readIntEnv(name: string, fallback: number, min: number, max: number) {
  const raw = Number(process.env[name] ?? fallback)
  if (!Number.isFinite(raw)) {
    return fallback
  }

  return Math.max(min, Math.min(max, Math.round(raw)))
}

function readBooleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name]?.trim().toLowerCase()
  if (!raw) {
    return fallback
  }
  if (['1', 'true', 'yes', 'on'].includes(raw)) {
    return true
  }
  if (['0', 'false', 'no', 'off'].includes(raw)) {
    return false
  }
  return fallback
}

function applyCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}
