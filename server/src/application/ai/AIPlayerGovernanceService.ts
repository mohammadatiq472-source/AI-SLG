import { randomUUID } from 'node:crypto'
import type {
  AiPlayerActionCatalogEntry,
  AiPlayerActionType,
  AiPlayerApprovalPolicy,
  AiPlayerBudgetPolicy,
  AiPlayerContextDocument,
  AiPlayerHomeCityCandidate,
  AiPlayerHomeCityCandidatesResponse,
  AiPlayerHomeCityFootprintId,
  AiPlayerHomeCityPlacement,
  AiPlayerRuntimePolicy,
  BindAiPlayerHomeCityRequest,
  CreateGovernedAiPlayerRequest,
  GovernedAiPlayer,
  GovernedAiPlayerRuntime,
  GovernedAiPlayerRuntimeDetail,
  UpsertAiPlayerContextDocumentRequest,
  UpdateGovernedAiPlayerProfileRequest,
} from '../../../../shared/contracts/aiPlayer'
import type { Tile, WorldState } from '../../../../shared/contracts/game'
import { getWorldStateReadonly } from '../world/WorldService'
import { AI_PLAYER_ACTION_CATALOG, listStaticAiPlayerActionCatalog } from './aiPlayerActionCatalog'
import { recordAiPlayerGovernanceEvent } from './aiPlayerGovernanceEvents'
import {
  ensureAiPlayerGovernanceLoaded,
  flushAiPlayerGovernancePersist,
  getAiPlayerGovernancePersistHealth,
  loadPersistedGovernanceState,
  resetAiPlayerGovernancePersistForTests,
  scheduleAiPlayerGovernancePersist,
} from './aiPlayerGovernancePersist'
import { buildAiPlayerRuntime, buildAiPlayerRuntimeDetail } from './aiPlayerGovernanceRuntimeView'
import {
  chatMessagesByAiPlayer,
  governedAiPlayers,
  nowIso,
} from './aiPlayerGovernanceState'

export {
  approveAiPlayerActionProposal,
  createAiPlayerActionProposal,
  executeAiPlayerActionProposal,
  getAiPlayerActionProposal,
  listAiPlayerActionProposals,
  listAiPlayerActionReceipts,
  rejectAiPlayerActionProposal,
} from './aiPlayerProposalLifecycle'
export {
  flushAiPlayerGovernancePersist,
  getAiPlayerGovernancePersistHealth,
}

const DEFAULT_APPROVAL_POLICY: AiPlayerApprovalPolicy = {
  autoApproveLowRisk: false,
  autoApproveMediumRisk: false,
  requireHumanApprovalForHighRisk: true,
}

const DEFAULT_BUDGET_POLICY: AiPlayerBudgetPolicy = {
  maxPendingProposals: 16,
  maxExecutableActionsPerTick: 4,
  maxExecutableActionsPerHour: 120,
  allowHighRiskActions: false,
}

const DEFAULT_RUNTIME_POLICY: AiPlayerRuntimePolicy = {
  allowLlmProposals: true,
  allowRuleProposals: true,
  allowMcpExecution: true,
  allowCliExecution: true,
  allowAutonomousCombatDailySummaryChatReports: true,
  allowAutonomousCombatWarEventChatReports: true,
  allowAutonomousCombatVoiceReports: false,
}

const AI_HOME_CITY_FOOTPRINT_ID: AiPlayerHomeCityFootprintId = 'ai_city_3x3_initial'
const AI_HOME_CITY_FOOTPRINT_SIZE = '3x3'
const AI_HOME_CITY_RADIUS_LIMIT = 10
const AI_HOME_CITY_HALF_WIDTH = 1
const AI_HOME_CITY_MAX_CANDIDATES = 80
const MAX_CONTEXT_DOCUMENTS_PER_AI = 16
const IDENTITY_CHANGE_CHAT_HISTORY_RETAIN_COUNT = 3

type AiPlayerHomeCityServiceFailure = {
  error: string
  failureCode: string
  statusCode: number
}

type AiPlayerHomeCityCandidateResult =
  | {
    ok: true
    candidate: AiPlayerHomeCityCandidate
  }
  | AiPlayerHomeCityServiceFailure

function listAllActionTypes(): AiPlayerActionType[] {
  return AI_PLAYER_ACTION_CATALOG.map((entry) => entry.action)
}

function mergeApprovalPolicy(partial?: Partial<AiPlayerApprovalPolicy>): AiPlayerApprovalPolicy {
  return {
    ...DEFAULT_APPROVAL_POLICY,
    ...partial,
  }
}

function mergeBudgetPolicy(partial?: Partial<AiPlayerBudgetPolicy>): AiPlayerBudgetPolicy {
  return {
    ...DEFAULT_BUDGET_POLICY,
    ...partial,
  }
}

function mergeRuntimePolicy(partial?: Partial<AiPlayerRuntimePolicy>): AiPlayerRuntimePolicy {
  return {
    ...DEFAULT_RUNTIME_POLICY,
    ...partial,
  }
}

function uniqueActions(actions: AiPlayerActionType[]): AiPlayerActionType[] {
  return Array.from(new Set(actions))
}

function measureUtf8Bytes(text: string): number {
  return Buffer.byteLength(text, 'utf8')
}

function isIdentityContextChanged(
  previous: AiPlayerContextDocument | null,
  document: AiPlayerContextDocument,
): boolean {
  if (document.kind !== 'identity') {
    return false
  }
  if (!previous) {
    return true
  }
  return previous.kind !== document.kind
    || previous.title !== document.title
    || previous.content !== document.content
    || previous.sourceFileName !== document.sourceFileName
}

function trimChatHistoryAfterIdentityChange(aiPlayerId: string): number {
  const bucket = chatMessagesByAiPlayer.get(aiPlayerId)
  if (!bucket || bucket.length <= IDENTITY_CHANGE_CHAT_HISTORY_RETAIN_COUNT) {
    return 0
  }
  const removedCount = bucket.length - IDENTITY_CHANGE_CHAT_HISTORY_RETAIN_COUNT
  chatMessagesByAiPlayer.set(aiPlayerId, bucket.slice(-IDENTITY_CHANGE_CHAT_HISTORY_RETAIN_COUNT))
  return removedCount
}

function ensureFactionExists(factionId: string): boolean {
  const world = getWorldStateReadonly()
  return Boolean(world.factions[factionId])
}

function coordKey(x: number, y: number) {
  return `${x}:${y}`
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeRadiusLimit(value: unknown) {
  const parsed = Number(value ?? AI_HOME_CITY_RADIUS_LIMIT)
  if (!Number.isFinite(parsed)) {
    return AI_HOME_CITY_RADIUS_LIMIT
  }
  return Math.max(1, Math.min(100, Math.trunc(parsed)))
}

function stableAiHomeCityId(aiPlayerId: string) {
  const stableId = aiPlayerId.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'ai_player'
  return `ai_home_city_${stableId}`
}

function manhattanDistance(left: Pick<Tile, 'x' | 'y'>, right: Pick<Tile, 'x' | 'y'>) {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y)
}

function findGovernorHomeTile(world: WorldState, factionId: string): {
  homeTile?: Tile
  error?: AiPlayerHomeCityServiceFailure
} {
  const faction = world.factions[factionId]
  const homeTileId = normalizeText(faction?.heroCommand?.homeTileId)
  if (!faction || !homeTileId) {
    return {
      error: {
        statusCode: 400,
        failureCode: 'ai_home_city_governor_home_missing',
        error: `governor home city is not configured for faction: ${factionId}`,
      },
    }
  }

  const homeTile = world.map.tiles.find((tile) => tile.id === homeTileId)
  if (!homeTile) {
    return {
      error: {
        statusCode: 400,
        failureCode: 'ai_home_city_governor_home_missing',
        error: `governor home tile not found: ${homeTileId}`,
      },
    }
  }

  return { homeTile }
}

function getFootprintTiles(
  center: Tile,
  tilesByCoord: ReadonlyMap<string, Tile>,
): Tile[] | null {
  const tiles: Tile[] = []
  for (let y = center.y - AI_HOME_CITY_HALF_WIDTH; y <= center.y + AI_HOME_CITY_HALF_WIDTH; y += 1) {
    for (let x = center.x - AI_HOME_CITY_HALF_WIDTH; x <= center.x + AI_HOME_CITY_HALF_WIDTH; x += 1) {
      const tile = tilesByCoord.get(coordKey(x, y))
      if (!tile) {
        return null
      }
      tiles.push(tile)
    }
  }
  return tiles
}

function listOtherAiHomeCityFootprintTileIds(aiPlayerId: string) {
  const reserved = new Set<string>()
  for (const player of governedAiPlayers.values()) {
    if (player.aiPlayerId === aiPlayerId) {
      continue
    }
    for (const tileId of player.homeCityPlacement?.footprintTileIds ?? []) {
      reserved.add(tileId)
    }
  }
  return reserved
}

function resolveFootprintBlockReason(
  footprintTiles: readonly Tile[] | null,
  factionId: string,
  reservedTileIds: ReadonlySet<string>,
) {
  if (!footprintTiles || footprintTiles.length !== 9) {
    return '3x3 footprint leaves the known world map.'
  }

  for (const tile of footprintTiles) {
    if (reservedTileIds.has(tile.id)) {
      return `footprint overlaps another AI home city at ${tile.id}.`
    }
    if (tile.type !== 'plain') {
      return `footprint tile ${tile.id} is ${tile.type}.`
    }
    if (tile.resourceKind !== undefined || tile.resourceLevel !== undefined) {
      return `footprint tile ${tile.id} is reserved for a resource.`
    }
    if (tile.cityLevel !== undefined) {
      return `footprint tile ${tile.id} is already a city tile.`
    }
    if (tile.owner !== 'neutral' && tile.owner !== factionId) {
      return `footprint tile ${tile.id} is owned by ${tile.owner}.`
    }
  }

  return null
}

function buildHomeCityCandidate(params: {
  center: Tile
  governorHomeTile: Tile
  factionId: string
  reservedTileIds: ReadonlySet<string>
  tilesByCoord: ReadonlyMap<string, Tile>
}): AiPlayerHomeCityCandidate {
  const footprintTiles = getFootprintTiles(params.center, params.tilesByCoord)
  const blockedReason = resolveFootprintBlockReason(footprintTiles, params.factionId, params.reservedTileIds)
  return {
    centerTileId: params.center.id,
    centerTileName: params.center.landmarkName ?? params.center.name,
    centerX: params.center.x,
    centerY: params.center.y,
    terrain: params.center.terrain,
    owner: params.center.owner,
    governorHomeTileId: params.governorHomeTile.id,
    distanceFromGovernorHome: manhattanDistance(params.center, params.governorHomeTile),
    footprintId: AI_HOME_CITY_FOOTPRINT_ID,
    footprintSize: AI_HOME_CITY_FOOTPRINT_SIZE,
    footprintTileIds: footprintTiles?.map((tile) => tile.id) ?? [],
    eligible: !blockedReason,
    ...(blockedReason ? { blockedReason } : {}),
  }
}

function authorizeAiHomeCityAccess(
  aiPlayerId: string,
  governorPlayerId: string,
): { player?: GovernedAiPlayer } | AiPlayerHomeCityServiceFailure {
  ensureAiPlayerGovernanceLoaded()
  const player = governedAiPlayers.get(aiPlayerId)
  if (!player) {
    return {
      statusCode: 404,
      failureCode: 'ai_player_not_found',
      error: `ai player not found: ${aiPlayerId}`,
    }
  }
  if (player.governorPlayerId !== governorPlayerId) {
    return {
      statusCode: 403,
      failureCode: 'ai_home_city_wrong_governor',
      error: 'AI player home-city binding is limited to the owning governor.',
    }
  }
  if (!player.enabled) {
    return {
      statusCode: 400,
      failureCode: 'ai_player_disabled',
      error: `ai player is disabled: ${aiPlayerId}`,
    }
  }
  return { player }
}

function resolveAiHomeCityCandidate(
  player: GovernedAiPlayer,
  centerTileId: string,
  radiusLimit = AI_HOME_CITY_RADIUS_LIMIT,
): AiPlayerHomeCityCandidateResult {
  const world = getWorldStateReadonly()
  const { homeTile, error } = findGovernorHomeTile(world, player.factionId)
  if (error || !homeTile) {
    return error ?? {
      statusCode: 400,
      failureCode: 'ai_home_city_governor_home_missing',
      error: `governor home tile not found for faction: ${player.factionId}`,
    }
  }
  const governorHomeTile = homeTile
  const center = world.map.tiles.find((tile) => tile.id === centerTileId)
  if (!center) {
    return {
      statusCode: 404,
      failureCode: 'ai_home_city_tile_not_found',
      error: `AI home-city center tile not found: ${centerTileId}`,
    }
  }

  const distance = manhattanDistance(center, governorHomeTile)
  if (distance > radiusLimit) {
    return {
      statusCode: 400,
      failureCode: 'ai_home_city_out_of_range',
      error: `AI home-city center must be within ${radiusLimit} tiles of governor home city ${governorHomeTile.id}.`,
    }
  }

  const tilesByCoord = new Map(world.map.tiles.map((tile) => [coordKey(tile.x, tile.y), tile] as const))
  const candidate = buildHomeCityCandidate({
    center,
    governorHomeTile,
    factionId: player.factionId,
    reservedTileIds: listOtherAiHomeCityFootprintTileIds(player.aiPlayerId),
    tilesByCoord,
  })
  if (!candidate.eligible) {
    return {
      statusCode: 400,
      failureCode: 'ai_home_city_footprint_blocked',
      error: candidate.blockedReason ?? 'AI home-city footprint is blocked.',
    }
  }

  return {
    ok: true,
    candidate,
  }
}

function cloneHomeCityPlacement(placement: AiPlayerHomeCityPlacement): AiPlayerHomeCityPlacement {
  return {
    ...placement,
    footprintTileIds: placement.footprintTileIds.slice(),
  }
}

export function listAiPlayerActionCatalog(): AiPlayerActionCatalogEntry[] {
  return listStaticAiPlayerActionCatalog()
}

export function registerGovernedAiPlayer(input: CreateGovernedAiPlayerRequest): {
  player?: GovernedAiPlayerRuntimeDetail
  error?: string
} {
  ensureAiPlayerGovernanceLoaded()
  if (governedAiPlayers.has(input.aiPlayerId)) {
    return { error: `ai player already exists: ${input.aiPlayerId}` }
  }
  if (!ensureFactionExists(input.factionId)) {
    return { error: `unknown faction: ${input.factionId}` }
  }

  const createdAt = nowIso()
  const player: GovernedAiPlayer = {
    aiPlayerId: input.aiPlayerId,
    displayName: input.displayName,
    avatarId: input.avatarId?.trim() || undefined,
    avatarImagePath: input.avatarImagePath?.trim() || undefined,
    governorPlayerId: input.governorPlayerId,
    factionId: input.factionId,
    enabled: input.enabled ?? true,
    paused: input.paused ?? false,
    homeCityBindingStatus: 'unbound',
    actionWhitelist: uniqueActions(input.actionWhitelist?.slice() ?? listAllActionTypes()),
    approvalPolicy: mergeApprovalPolicy(input.approvalPolicy),
    budgetPolicy: mergeBudgetPolicy(input.budgetPolicy),
    runtimePolicy: mergeRuntimePolicy(input.runtimePolicy),
    contextDocuments: input.contextDocuments?.slice(0, MAX_CONTEXT_DOCUMENTS_PER_AI) ?? [],
    createdAt,
    updatedAt: createdAt,
  }

  governedAiPlayers.set(player.aiPlayerId, player)
  const requestedHomeCityTileId = normalizeText(input.homeCityTileId)
  if (requestedHomeCityTileId) {
    const bindResult = bindAiPlayerHomeCity(player.aiPlayerId, {
      governorPlayerId: player.governorPlayerId,
      centerTileId: requestedHomeCityTileId,
      updatedBy: player.governorPlayerId,
    })
    if (bindResult.error) {
      governedAiPlayers.delete(player.aiPlayerId)
      return { error: bindResult.error }
    }
    return { player: bindResult.player }
  }

  scheduleAiPlayerGovernancePersist()
  recordAiPlayerGovernanceEvent({
    action: 'ai_player_register',
    success: true,
    message: `registered governed ai player ${player.aiPlayerId}`,
    metadata: {
      aiPlayerId: player.aiPlayerId,
      governorPlayerId: player.governorPlayerId,
      factionId: player.factionId,
    },
  })
  return { player: buildAiPlayerRuntimeDetail(player) }
}

export function listAiPlayerHomeCityCandidates(params: {
  aiPlayerId: string
  governorPlayerId: string
  radiusLimit?: number
}): AiPlayerHomeCityCandidatesResponse | AiPlayerHomeCityServiceFailure {
  const governorPlayerId = normalizeText(params.governorPlayerId)
  if (!governorPlayerId) {
    return {
      statusCode: 403,
      failureCode: 'ai_home_city_governor_required',
      error: 'governorPlayerId required.',
    }
  }

  const authorized = authorizeAiHomeCityAccess(params.aiPlayerId, governorPlayerId)
  if ('error' in authorized) {
    return authorized
  }
  const player = authorized.player
  if (!player) {
    return {
      statusCode: 404,
      failureCode: 'ai_player_not_found',
      error: `ai player not found: ${params.aiPlayerId}`,
    }
  }

  const radiusLimit = normalizeRadiusLimit(params.radiusLimit)
  const world = getWorldStateReadonly()
  const { homeTile, error } = findGovernorHomeTile(world, player.factionId)
  if (error || !homeTile) {
    return error ?? {
      statusCode: 400,
      failureCode: 'ai_home_city_governor_home_missing',
      error: `governor home tile not found for faction: ${player.factionId}`,
    }
  }
  const governorHomeTile = homeTile

  const tilesByCoord = new Map(world.map.tiles.map((tile) => [coordKey(tile.x, tile.y), tile] as const))
  const reservedTileIds = listOtherAiHomeCityFootprintTileIds(player.aiPlayerId)
  const candidates = world.map.tiles
    .filter((tile) => tile.id !== governorHomeTile.id)
    .filter((tile) => manhattanDistance(tile, governorHomeTile) <= radiusLimit)
    .map((tile) => buildHomeCityCandidate({
      center: tile,
      governorHomeTile,
      factionId: player.factionId,
      reservedTileIds,
      tilesByCoord,
    }))
    .filter((candidate) => candidate.eligible)
    .sort((left, right) =>
      left.distanceFromGovernorHome - right.distanceFromGovernorHome ||
      left.centerY - right.centerY ||
      left.centerX - right.centerX ||
      left.centerTileId.localeCompare(right.centerTileId),
    )
    .slice(0, AI_HOME_CITY_MAX_CANDIDATES)

  return {
    ok: true,
    aiPlayerId: player.aiPlayerId,
    governorPlayerId: player.governorPlayerId,
    factionId: player.factionId,
    governorHomeTileId: governorHomeTile.id,
    radiusLimit,
    footprintId: AI_HOME_CITY_FOOTPRINT_ID,
    footprintSize: AI_HOME_CITY_FOOTPRINT_SIZE,
    candidates,
    count: candidates.length,
    ...(player.homeCityPlacement ? { currentBinding: cloneHomeCityPlacement(player.homeCityPlacement) } : {}),
  }
}

export function bindAiPlayerHomeCity(
  aiPlayerId: string,
  input: BindAiPlayerHomeCityRequest,
): {
  player?: GovernedAiPlayerRuntimeDetail
  binding?: AiPlayerHomeCityPlacement
  error?: string
  failureCode?: string
  statusCode?: number
} {
  const governorPlayerId = normalizeText(input.governorPlayerId)
  if (!governorPlayerId) {
    return {
      statusCode: 403,
      failureCode: 'ai_home_city_governor_required',
      error: 'governorPlayerId required.',
    }
  }

  const authorized = authorizeAiHomeCityAccess(aiPlayerId, governorPlayerId)
  if ('error' in authorized) {
    return authorized
  }
  const player = authorized.player
  if (!player) {
    return {
      statusCode: 404,
      failureCode: 'ai_player_not_found',
      error: `ai player not found: ${aiPlayerId}`,
    }
  }

  const centerTileId = normalizeText(input.centerTileId)
  if (!centerTileId) {
    return {
      statusCode: 400,
      failureCode: 'ai_home_city_center_tile_required',
      error: 'centerTileId required.',
    }
  }

  const candidateResult = resolveAiHomeCityCandidate(player, centerTileId, AI_HOME_CITY_RADIUS_LIMIT)
  if ('error' in candidateResult) {
    return candidateResult
  }

  const candidate = candidateResult.candidate
  const now = nowIso()
  const placement: AiPlayerHomeCityPlacement = {
    cityId: stableAiHomeCityId(player.aiPlayerId),
    centerTileId: candidate.centerTileId,
    centerX: candidate.centerX,
    centerY: candidate.centerY,
    footprintId: AI_HOME_CITY_FOOTPRINT_ID,
    footprintSize: AI_HOME_CITY_FOOTPRINT_SIZE,
    footprintTileIds: candidate.footprintTileIds.slice(),
    anchorPolicy: 'center_cell',
    source: 'governor_selected',
    governorHomeTileId: candidate.governorHomeTileId,
    radiusLimit: AI_HOME_CITY_RADIUS_LIMIT,
    distanceFromGovernorHome: candidate.distanceFromGovernorHome,
    boundAt: now,
    boundByGovernorPlayerId: input.updatedBy?.trim() || governorPlayerId,
  }

  player.homeCityBindingStatus = 'bound'
  player.homeCityId = placement.cityId
  player.homeCityTileId = placement.centerTileId
  player.homeCityPlacement = cloneHomeCityPlacement(placement)
  player.updatedAt = now
  governedAiPlayers.set(aiPlayerId, player)
  scheduleAiPlayerGovernancePersist()
  recordAiPlayerGovernanceEvent({
    action: 'ai_player_home_city_bind',
    success: true,
    message: `bound AI player home city ${aiPlayerId} to ${placement.centerTileId}`,
    metadata: {
      aiPlayerId,
      governorPlayerId: player.governorPlayerId,
      factionId: player.factionId,
      cityId: placement.cityId,
      centerTileId: placement.centerTileId,
      footprintTileIds: placement.footprintTileIds,
    },
  })

  return {
    player: buildAiPlayerRuntimeDetail(player),
    binding: cloneHomeCityPlacement(placement),
  }
}

export function upsertGovernedAiPlayerContextDocument(
  aiPlayerId: string,
  input: UpsertAiPlayerContextDocumentRequest,
): {
  player?: GovernedAiPlayerRuntimeDetail
  document?: AiPlayerContextDocument
  error?: string
} {
  ensureAiPlayerGovernanceLoaded()
  const player = governedAiPlayers.get(aiPlayerId)
  if (!player) {
    return { error: `ai player not found: ${aiPlayerId}` }
  }

  const title = input.title.trim()
  const content = input.content.trim()
  if (!title) {
    return { error: 'context document title required' }
  }
  if (!content) {
    return { error: 'context document content required' }
  }

  if (!Array.isArray(player.contextDocuments)) {
    player.contextDocuments = []
  }
  const now = nowIso()
  const documentId = input.documentId?.trim() || `ctx_${randomUUID()}`
  const existingIndex = player.contextDocuments.findIndex((item) => item.documentId === documentId)
  if (existingIndex < 0 && player.contextDocuments.length >= MAX_CONTEXT_DOCUMENTS_PER_AI) {
    return { error: 'context document limit reached' }
  }

  const previous = existingIndex >= 0 ? player.contextDocuments[existingIndex] : null
  const document: AiPlayerContextDocument = {
    documentId,
    kind: input.kind,
    title,
    content,
    sourceFileName: input.sourceFileName?.trim() || undefined,
    contentBytes: measureUtf8Bytes(content),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    updatedBy: input.updatedBy.trim(),
  }
  const identityChanged = isIdentityContextChanged(previous, document)

  if (existingIndex >= 0) {
    player.contextDocuments[existingIndex] = document
  } else {
    player.contextDocuments.push(document)
  }
  const trimmedChatMessageCount = identityChanged
    ? trimChatHistoryAfterIdentityChange(aiPlayerId)
    : 0
  player.updatedAt = now
  governedAiPlayers.set(aiPlayerId, player)
  scheduleAiPlayerGovernancePersist()
  recordAiPlayerGovernanceEvent({
    action: 'ai_player_context_document_upsert',
    success: true,
    message: `upserted governed ai player context document ${aiPlayerId}`,
    metadata: {
      aiPlayerId,
      documentId,
      kind: document.kind,
      title: document.title,
      contentBytes: document.contentBytes,
      identityChanged,
      trimmedChatMessageCount,
      updatedBy: document.updatedBy,
      governorPlayerId: player.governorPlayerId,
      factionId: player.factionId,
    },
  })
  return { player: buildAiPlayerRuntimeDetail(player), document }
}

export function listGovernedAiPlayers(params: {
  governorPlayerId?: string
  factionId?: string
  includeDisabled?: boolean
} = {}): GovernedAiPlayerRuntime[] {
  ensureAiPlayerGovernanceLoaded()
  const items = Array.from(governedAiPlayers.values()).filter((player) => {
    if (!params.includeDisabled && !player.enabled) {
      return false
    }
    if (params.governorPlayerId && player.governorPlayerId !== params.governorPlayerId) {
      return false
    }
    if (params.factionId && player.factionId !== params.factionId) {
      return false
    }
    return true
  })

  return items
    .map((player) => buildAiPlayerRuntime(player))
    .sort((left, right) => left.factionId.localeCompare(right.factionId) || left.aiPlayerId.localeCompare(right.aiPlayerId))
}

export function getGovernedAiPlayerRuntime(aiPlayerId: string): GovernedAiPlayerRuntimeDetail | null {
  ensureAiPlayerGovernanceLoaded()
  const player = governedAiPlayers.get(aiPlayerId)
  return player ? buildAiPlayerRuntimeDetail(player) : null
}

export function updateGovernedAiPlayerProfile(
  aiPlayerId: string,
  input: UpdateGovernedAiPlayerProfileRequest,
): {
  player?: GovernedAiPlayerRuntimeDetail
  error?: string
} {
  ensureAiPlayerGovernanceLoaded()
  const player = governedAiPlayers.get(aiPlayerId)
  if (!player) {
    return { error: `ai player not found: ${aiPlayerId}` }
  }

  const nextDisplayName = input.displayName?.trim()
  const nextAvatarId = input.avatarId?.trim()
  const nextAvatarImagePath = input.avatarImagePath?.trim()
  if (!nextDisplayName && nextAvatarId === undefined && nextAvatarImagePath === undefined && input.runtimePolicy === undefined) {
    return { error: 'profile update field required' }
  }

  const changedFields: Record<string, unknown> = {}
  if (nextDisplayName) {
    player.displayName = nextDisplayName
    changedFields.displayName = nextDisplayName
  }
  if (input.avatarId !== undefined) {
    player.avatarId = nextAvatarId || undefined
    changedFields.avatarId = player.avatarId ?? null
  }
  if (input.avatarImagePath !== undefined) {
    player.avatarImagePath = nextAvatarImagePath || undefined
    changedFields.avatarImagePath = player.avatarImagePath ?? null
  }
  if (input.runtimePolicy !== undefined) {
    player.runtimePolicy = mergeRuntimePolicy({
      ...player.runtimePolicy,
      ...input.runtimePolicy,
    })
    changedFields.runtimePolicy = player.runtimePolicy
  }
  player.updatedAt = nowIso()
  governedAiPlayers.set(aiPlayerId, player)
  scheduleAiPlayerGovernancePersist()
  recordAiPlayerGovernanceEvent({
    action: 'ai_player_profile_update',
    success: true,
    message: `updated governed ai player profile ${aiPlayerId}`,
    metadata: {
      aiPlayerId,
      ...changedFields,
      updatedBy: input.updatedBy,
      governorPlayerId: player.governorPlayerId,
      factionId: player.factionId,
    },
  })
  return { player: buildAiPlayerRuntimeDetail(player) }
}

export function pauseGovernedAiPlayer(aiPlayerId: string, updatedBy: string): {
  player?: GovernedAiPlayerRuntimeDetail
  error?: string
} {
  ensureAiPlayerGovernanceLoaded()
  const player = governedAiPlayers.get(aiPlayerId)
  if (!player) {
    return { error: `ai player not found: ${aiPlayerId}` }
  }

  player.paused = true
  player.updatedAt = nowIso()
  governedAiPlayers.set(aiPlayerId, player)
  scheduleAiPlayerGovernancePersist()
  recordAiPlayerGovernanceEvent({
    action: 'ai_player_pause',
    success: true,
    message: `paused governed ai player ${aiPlayerId}`,
    metadata: {
      aiPlayerId,
      updatedBy,
      governorPlayerId: player.governorPlayerId,
      factionId: player.factionId,
    },
  })
  return { player: buildAiPlayerRuntimeDetail(player) }
}

export function resumeGovernedAiPlayer(aiPlayerId: string, updatedBy: string): {
  player?: GovernedAiPlayerRuntimeDetail
  error?: string
} {
  ensureAiPlayerGovernanceLoaded()
  const player = governedAiPlayers.get(aiPlayerId)
  if (!player) {
    return { error: `ai player not found: ${aiPlayerId}` }
  }

  player.paused = false
  player.updatedAt = nowIso()
  governedAiPlayers.set(aiPlayerId, player)
  scheduleAiPlayerGovernancePersist()
  recordAiPlayerGovernanceEvent({
    action: 'ai_player_resume',
    success: true,
    message: `resumed governed ai player ${aiPlayerId}`,
    metadata: {
      aiPlayerId,
      updatedBy,
      governorPlayerId: player.governorPlayerId,
      factionId: player.factionId,
    },
  })
  return { player: buildAiPlayerRuntimeDetail(player) }
}

export function resetAiPlayerGovernanceServiceForTests() {
  resetAiPlayerGovernancePersistForTests()
}

loadPersistedGovernanceState()
