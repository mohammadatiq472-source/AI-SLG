import type {
  AiPlayerBattleReportReadModel,
  AiPlayerDevelopmentPlanCandidateAction,
  AiPlayerDevelopmentPlanCandidateTile,
  AiPlayerDevelopmentPlanResourceSnapshot,
  AiPlayerDevelopmentPlanUnit,
  AiPlayerVisibleActivityAggregateGroup,
  AiPlayerVisibleActivityFeedReadModel,
  AiPlayerVisibleActivityItem,
  AiPlayerVisibleActivityMapTargetQueueItem,
  AiPlayerVisibleActivitySortOrder,
  GovernedAiPlayerRuntimeDetail,
} from '../../../../shared/contracts/aiPlayer'
import type {
  PlayerWorldTimelineCategory,
  PlayerWorldTimelineSeverity,
  WorldEventRecord,
} from '../../../../shared/contracts/game/history'
import type { ResourceKind } from '../../../../shared/contracts/game/common'
import type {
  ResourceTileCaptureRewardReadModel,
  ResourceTileOngoingYieldReadModel,
  ResourceTransferBundle,
  Tile,
  WorldState,
} from '../../../../shared/contracts/game/world'
import type { AiPlayerActionProposal, AiPlayerActionReceipt } from '../../../../shared/contracts/aiPlayer'
import { buildResourceTileEconomyReadModel } from '../../../../shared/domain/resourceTileEconomy'
import { getExecutionReplayByRequestId, getReplayArchiveEntry, getWorldEvents, getWorldStateReadonly } from '../world/WorldService'
import { listAiPlayerActionProposals, listAiPlayerActionReceipts } from './AIPlayerGovernanceService'
import { buildAiPlayerBattleReportReadModel } from './aiPlayerBattleReportReadModel'
import { buildAiPlayerDevelopmentPlan } from './aiPlayerDevelopmentPlanReadModel'
import { buildAiPlayerWarBattleFollowUp } from './aiPlayerWarFollowUpReadModel'

const AI_SUBJECT_RESOURCE_GATHER_AMOUNT_PER_LEVEL = 10
const SUPPORTED_RESOURCE_KINDS = new Set<ResourceKind>(['food', 'wood', 'stone', 'iron'])
const DEFAULT_REPLAY_RETENTION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
type AiPlayerSubjectSaveRecoveryStatus = 'saved' | 'restored' | 'restore_failed'

type AiPlayerSubjectResourceTileEconomy = {
  tileId: string
  name: string
  resourceKind: ResourceKind
  resourceLevel: number
  owner: string
  occupiedByFaction: true
  relationToAiPlayer: 'unit_present' | 'gathered_by_ai' | 'candidate_owned_resource'
  ongoingYield: ResourceTileOngoingYieldReadModel
  captureReward: ResourceTileCaptureRewardReadModel
  recommendedPower: number
  oneTimeGather: {
    available: boolean
    gathered: boolean
    claimId: string | null
    resources: ResourceTransferBundle
  }
}

type AiPlayerSubjectEconomyReadModel = {
  resourceEconomyModelVersion: string | null
  account: AiPlayerDevelopmentPlanResourceSnapshot['aiAccount']
  accountUpdatedTick?: number
  ownedResourceYieldPerTick: ResourceTransferBundle
  ownedResourceTiles: AiPlayerSubjectResourceTileEconomy[]
  pendingGovernorTransfers: {
    governorPlayerId: string
    count: number
    totalPendingResources: ResourceTransferBundle
    items: Array<{
      transferId: string
      sourceAiPlayerId: string
      sourceFactionId: string
      governorPlayerId: string
      resources: ResourceTransferBundle
      reason: string
      approvedBy: string
      status: 'pending'
      createdTick: number
    }>
  }
  settledGovernorTransfers: {
    governorPlayerId: string
    count: number
    totalSettledResources: ResourceTransferBundle
    items: Array<{
      transferId: string
      sourceAiPlayerId: string
      sourceFactionId: string
      governorPlayerId: string
      resources: ResourceTransferBundle
      reason: string
      approvedBy: string
      status: 'claimed'
      createdTick: number
      claimedTick: number
    }>
  }
  limits: {
    ownedResourceTileLimit: number
    worldScope: 'ai_relevant_owned_resource_tiles_only'
    autoTickYieldToAiAccount: false
    autoTickYieldPolicyReason: 'occupied_resource_yield_settles_to_faction_resources'
    aiSubaccountEarningAction: 'resource_gather'
    aiSubaccountEarningScope: 'one_time_gather_claim_not_automatic_tick_yield'
  }
}

type AiPlayerSubjectHistoryAnchor = {
  cardId: string
  createdAt: string
  category: PlayerWorldTimelineCategory
  title: string
  summary: string
  resultLabel: string
  nextActionLabel?: string
  severity: PlayerWorldTimelineSeverity
  bodyNode?: AiPlayerSubjectRecentBodyChange['bodyNode']
  action?: string
  status?: AiPlayerSubjectRecentBodyChange['status']
  proposalId?: string
  failureCode?: string | null
  approvedBy?: string
  rejectedBy?: string
  governanceApprovedBeforeExecution?: boolean
  governanceApprovedBy?: string
  governanceApprovedAt?: string
  governanceRecoveryFocus?: string
  governanceRecoverySummary?: string
  governanceRecoveryRecommendedCommand?: string
  governanceFailureDetail?: string
  governanceAttemptedWorldAction?: string
  regionId?: string
  targetTileId?: string
  targetTileType?: string
  targetTileTerrain?: string
  targetTileOwner?: string
  targetTileResourceKind?: string
  targetTileResourceLevel?: number
  targetTileScoutingDifficulty?: number
  targetTileEnemyPressure?: number
  unitId?: string
  claimId?: string
  governorPlayerId?: string
  strength?: number
  supply?: number
  strengthBefore?: number
  strengthAfter?: number
  supplyBefore?: number
  supplyAfter?: number
  previousOwner?: string
  owner?: string
  abandoned?: boolean
  clearedGatherClaim?: boolean
  facilityId?: string
  buildingId?: string
  affairId?: string
  techId?: string
  cityFootprintTiles?: number
  cityFootprintTier?: string
  previousLevel?: number
  nextLevel?: number
  heroId?: string
  skillId?: string
  tacticId?: string
  previousExp?: number
  nextExp?: number
  expGained?: number
  previousStarLevel?: number
  nextStarLevel?: number
  heroIds?: string[]
  rosterHeroIds?: string[]
  reserveHeroIds?: string[]
  poolId?: string
  teamId?: string
  teamIndex?: number
  resourceDelta?: ResourceTransferBundle
  accountBefore?: ResourceTransferBundle
  accountAfter?: ResourceTransferBundle
  resourcesSpent?: Record<string, number>
  executionReceiptAvailable?: boolean
  executionWorldAction?: string | null
  executionActionRequestId?: string | null
  executionFailureCode?: string | null
  executionRecoveryFocus?: string
  executionRecoverySummary?: string
  executionRecoveryRecommendedCommand?: string
  executionWorldReceiptAvailable?: boolean
  executionWorldReceiptAction?: string
  executionWorldReceiptTargetTileId?: string
  executionWorldReceiptOccupied?: boolean
  executionWorldReceiptPreviousOwner?: string
  executionWorldReceiptOwner?: string
  executionWorldReceiptAbandoned?: boolean
  executionWorldReceiptClearedGatherClaim?: boolean
  executionWorldReceiptUnitId?: string
  executionWorldReceiptHeroId?: string
  executionWorldReceiptExpGained?: number
  executionWorldReceiptPreviousExp?: number
  executionWorldReceiptNextExp?: number
  executionWorldReceiptStrengthBefore?: number
  executionWorldReceiptStrengthAfter?: number
  executionWorldReceiptSupplyBefore?: number
  executionWorldReceiptSupplyAfter?: number
  executionWorldReceiptFacilityId?: string
  executionWorldReceiptBuildingId?: string
  executionWorldReceiptTechId?: string
  executionWorldReceiptPreviousLevel?: number
  executionWorldReceiptNextLevel?: number
  executionWorldReceiptResourcesSpentAvailable?: boolean
  assignmentUnitIds?: string[]
  assignmentTargetTileIds?: string[]
  assignmentCount?: number
  battleReportId?: string
  battleOutcome?: string
  battleSeverity?: string
  battlePerspective?: string
  battleAssignedUnitInvolved?: boolean
  battleOwnLoss?: number | null
  battleEnemyLoss?: number | null
    battleNextStepSuggestion?: string
    replayRequestId?: string
    sourceBattleReportId?: string
    sourceReplayRequestId?: string
    recommendedRecoveryCommand?: string
    reportKind?: string
    executionActionPointsRemaining?: number
  cityDurabilityAfter?: number
  cityDurabilityMax?: number
  cityOwnerAfter?: string
  cityCaptured?: boolean
  warFollowUpAction?: string
  warFollowUpArgs?: Record<string, unknown>
  warFollowUpReadiness?: 'ready' | 'needs_target' | 'blocked' | 'information_only'
  warFollowUpReason?: string
  agendaActionId?: string
  mode?: string
  allianceCommanderId?: string
  allianceSupportLevel?: number
  allianceCommanderReadiness?: number
  allianceCommanderMissing?: boolean
  allianceActionId?: string
  allianceActionSeverity?: string
  allianceActionTileId?: string
  allianceActionTitle?: string
  allianceActionDetail?: string
  nextSubjectFocus?: AiPlayerSubjectRecentBodyChange['nextSubjectFocus']
  sourceRefs: {
    visibility: 'internal_link_only'
    visible: false
    worldEventId: string
    proposalId?: string
    requestId?: string
    replayRequestId?: string
    sourceBattleReportId?: string
    sourceReplayRequestId?: string
    recommendedRecoveryCommand?: string
    saveSlotId?: string
  }
}

type AiPlayerSubjectHistoryAnchorsReadModel = {
  contractId: 'ai_player_subject_history_anchors_v1'
  aiPlayerId: string
  factionId: string
  count: number
  items: AiPlayerSubjectHistoryAnchor[]
}

type AiPlayerSubjectRecoveryAnchor = {
  kind: 'replay' | 'save'
  title: string
  summary: string
  sourceRefs: {
    visibility: 'internal_link_only'
    visible: false
    replayRequestId?: string
    replayAvailable?: boolean
    replayArchiveEntryAvailable?: boolean
    replayRetentionExpired?: boolean
    replayRecoveryStatus?: 'available' | 'unavailable'
    replayRecoveryReason?: 'missing_replay_record' | 'retention_expired'
    replayRecoverySurface?: 'replay_support_route' | 'player_history_unavailable_replay' | 'replay_support_route_retention_unavailable'
    replaySupportHttpStatus?: 200 | 404 | 410
    replayPlayerSafeFallback?: boolean
    recommendedRecoveryCommand?: string
    regionId?: string
    battleReportId?: string
    reportKind?: string
    saveSlotId?: string
    saveRecoveryStatus?: AiPlayerSubjectSaveRecoveryStatus
    saveRecoveryTarget?: string
    saveRecoveryScope?: string
    saveRecoveryAction?: string
    saveRecoverySuccess?: boolean
    saveRecoveryResultLabel?: string
    worldEventId?: string
  }
}

type AiPlayerSubjectSaveRecoveryFacts = {
  title: string
  summary: string
  worldEventId: string
  observedAt: string
  saveSlotId: string
  saveRecoveryStatus: AiPlayerSubjectSaveRecoveryStatus
  saveRecoveryTarget: string
  saveRecoveryScope: string
  saveRecoveryAction: string
  saveRecoverySuccess: boolean
  saveRecoveryResultLabel?: string
  recommendedRecoveryCommand?: string
}

type AiPlayerSubjectRecoveryAnchorsReadModel = {
  contractId: 'ai_player_subject_recovery_anchors_v1'
  aiPlayerId: string
  factionId: string
  count: number
  items: AiPlayerSubjectRecoveryAnchor[]
}

const AI_VISIBLE_ACTIVITY_WORLD_MAP_LABEL = '前线地块'
const AI_VISIBLE_ACTIVITY_SORT_ORDER: AiPlayerVisibleActivitySortOrder = {
  primary: 'priority_desc',
  secondary: 'turn_desc',
  tertiary: 'sequence_desc',
  fallback: 'occurredAt_desc',
}

type AiPlayerSubjectRecentBodyChange = {
  bodyNode: 'resources_and_buildings' | 'generals_and_troops' | 'land_level_and_expansion' | 'human_command_and_obedience' | 'war_and_relations' | 'chat_report_history'
  action: string
  status: 'approved' | 'completed' | 'failed'
  proposalId?: string
  observedAt: string
  failureCode?: string | null
  approvedBy?: string
  rejectedBy?: string
  governanceApprovedBeforeExecution?: boolean
  governanceApprovedBy?: string
  governanceApprovedAt?: string
  governanceRecoveryFocus?: string
  governanceRecoverySummary?: string
  governanceRecoveryRecommendedCommand?: string
  governanceFailureDetail?: string
  governanceAttemptedWorldAction?: string
  regionId?: string
  targetTileId?: string
  targetTileType?: string
  targetTileTerrain?: string
  targetTileOwner?: string
  targetTileResourceKind?: string
  targetTileResourceLevel?: number
  targetTileScoutingDifficulty?: number
  targetTileEnemyPressure?: number
  unitId?: string
  claimId?: string
  governorPlayerId?: string
  facilityId?: string
  buildingId?: string
  affairId?: string
  techId?: string
  cityFootprintTiles?: number
  cityFootprintTier?: string
  previousOwner?: string
  owner?: string
  abandoned?: boolean
  clearedGatherClaim?: boolean
  strength?: number
  supply?: number
  strengthBefore?: number
  strengthAfter?: number
  supplyBefore?: number
  supplyAfter?: number
  heroId?: string
  heroIds?: string[]
  skillId?: string
  tacticId?: string
  previousLevel?: number
  nextLevel?: number
  previousExp?: number
  nextExp?: number
  expGained?: number
  previousStarLevel?: number
  nextStarLevel?: number
  rosterHeroIds?: string[]
  reserveHeroIds?: string[]
  poolId?: string
  teamId?: string
  teamIndex?: number
  resourceDelta?: ResourceTransferBundle
  accountBefore?: ResourceTransferBundle
  accountAfter?: ResourceTransferBundle
  resourcesSpent?: Record<string, number>
  executionReceiptAvailable?: boolean
  executionWorldAction?: string | null
  executionActionRequestId?: string | null
  executionFailureCode?: string | null
  executionActionPointsRemaining?: number
  executionRecoveryFocus?: string
  executionRecoverySummary?: string
  executionRecoveryRecommendedCommand?: string
  executionWorldReceiptAvailable?: boolean
  executionWorldReceiptAction?: string
  executionWorldReceiptTargetTileId?: string
  executionWorldReceiptOccupied?: boolean
  executionWorldReceiptPreviousOwner?: string
  executionWorldReceiptOwner?: string
  executionWorldReceiptAbandoned?: boolean
  executionWorldReceiptClearedGatherClaim?: boolean
  executionWorldReceiptUnitId?: string
  executionWorldReceiptHeroId?: string
  executionWorldReceiptExpGained?: number
  executionWorldReceiptPreviousExp?: number
  executionWorldReceiptNextExp?: number
  executionWorldReceiptStrengthBefore?: number
  executionWorldReceiptStrengthAfter?: number
  executionWorldReceiptSupplyBefore?: number
  executionWorldReceiptSupplyAfter?: number
  executionWorldReceiptFacilityId?: string
  executionWorldReceiptBuildingId?: string
  executionWorldReceiptTechId?: string
  executionWorldReceiptPreviousLevel?: number
  executionWorldReceiptNextLevel?: number
  executionWorldReceiptResourcesSpentAvailable?: boolean
  assignmentUnitIds?: string[]
  assignmentTargetTileIds?: string[]
  assignmentCount?: number
  battleReportId?: string
  battleOutcome?: string
  battleSeverity?: string
  battlePerspective?: string
  battleAssignedUnitInvolved?: boolean
  battleOwnLoss?: number | null
  battleEnemyLoss?: number | null
  battleNextStepSuggestion?: string
  replayRequestId?: string
  replayAccessDenied?: boolean
  replayAccessDeniedReason?: 'invalid_share_token' | 'missing_session' | 'foreign_faction'
  replayAccessDeniedHttpStatus?: 401 | 403
  replayAccessDeniedSurface?: 'replay_support_route_denied'
  replayAccessDeniedPlayerSafeFallback?: boolean
  sourceBattleReportId?: string
  sourceReplayRequestId?: string
  recommendedRecoveryCommand?: string
  recoveryAnchorAvailable?: boolean
  recoveryAnchorKind?: string
  recoveryAnchorReplayRequestId?: string
  recoveryAnchorReplayAvailable?: boolean
  recoveryAnchorReplayArchiveEntryAvailable?: boolean
  recoveryAnchorReplayRetentionExpired?: boolean
  recoveryAnchorReplayStatus?: 'available' | 'unavailable'
  recoveryAnchorReplayReason?: 'missing_replay_record' | 'retention_expired'
  recoveryAnchorReplayRecoverySurface?: 'replay_support_route' | 'player_history_unavailable_replay' | 'replay_support_route_retention_unavailable'
  recoveryAnchorReplaySupportHttpStatus?: 200 | 404 | 410
  recoveryAnchorReplayPlayerSafeFallback?: boolean
  recoveryAnchorRecommendedRecoveryCommand?: string
  recoveryAnchorBattleReportId?: string
  recoveryAnchorReportKind?: string
  recoveryAnchorSaveStatus?: AiPlayerSubjectSaveRecoveryStatus
  recoveryAnchorSourceVisibility?: 'internal_link_only'
  reportKind?: string
  saveSlotId?: string
  saveRecoveryStatus?: AiPlayerSubjectSaveRecoveryStatus
  saveRecoveryTarget?: string
  saveRecoveryScope?: string
  saveRecoveryAction?: string
  saveRecoverySuccess?: boolean
  saveRecoveryResultLabel?: string
  saveRecoveryWorldEventId?: string
  cityDurabilityAfter?: number
  cityDurabilityMax?: number
  cityOwnerAfter?: string
  cityCaptured?: boolean
  warFollowUpAction?: string
  warFollowUpArgs?: Record<string, unknown>
  warFollowUpReadiness?: 'ready' | 'needs_target' | 'blocked' | 'information_only'
  warFollowUpReason?: string
  agendaActionId?: string
  mode?: string
  allianceCommanderId?: string
  allianceSupportLevel?: number
  allianceCommanderReadiness?: number
  allianceCommanderMissing?: boolean
  allianceActionId?: string
  allianceActionSeverity?: string
  allianceActionTileId?: string
  allianceActionTitle?: string
  allianceActionDetail?: string
  historyAnchorAvailable?: boolean
  historyAnchorWorldEventId?: string
  historyAnchorSourceVisibility?: 'internal_link_only'
  nextSubjectFocus: 'economy' | 'troops' | 'land' | 'war' | 'governance' | 'history'
  visibleToAi: true
}

type AiPlayerSubjectRecentBodyChangesReadModel = {
  contractId: 'ai_player_subject_recent_body_changes_v1'
  aiPlayerId: string
  factionId: string
  count: number
  items: AiPlayerSubjectRecentBodyChange[]
}

type AiPlayerSubjectAuthorityBoundaryReadModel = {
  contractId: 'client_server_ai_authority_boundary_v1'
  ownerLabels: ['server-owned', 'AI-read']
  serverTruthOwner: 'server'
  aiReadEntrypoint: 'GET /api/ai/players/:id/subject'
  clientCachePolicy: 'read_through_cache_only'
  clientMutationAllowed: false
  sourceRefsVisibility: 'internal_link_only'
  playerVisibleCopyPolicy: 'translate_before_player_ui'
  supportSurfacesAreAuthority: false
}

export type AiPlayerSubjectReadModel = {
  schemaVersion: 'ai_player_subject_read_model_v1'
  readOnly: true
  authorityBoundary: AiPlayerSubjectAuthorityBoundaryReadModel
  identity: {
    aiPlayerId: string
    displayName: string
    governorPlayerId: string
    factionId: string
    enabled: boolean
    paused: boolean
  }
  homeCity: {
    bindingStatus: GovernedAiPlayerRuntimeDetail['homeCityBindingStatus']
    cityId: string | null
    centerTileId: string | null
    footprintId: 'ai_city_3x3_initial'
    footprintSize: '3x3'
    footprintTileIds: string[]
    entryPath: string
    candidatePath: string
  }
  resources: AiPlayerDevelopmentPlanResourceSnapshot
  economy: AiPlayerSubjectEconomyReadModel
  units: AiPlayerDevelopmentPlanUnit[]
  landCandidates: AiPlayerDevelopmentPlanCandidateTile[]
  nextLand: {
    status: 'ready' | 'unavailable'
    candidate: AiPlayerDevelopmentPlanCandidateTile | null
    unavailableReason: string | null
  }
  recommendedActions: AiPlayerDevelopmentPlanCandidateAction[]
  recentBodyChanges: AiPlayerSubjectRecentBodyChangesReadModel
  recentBattleResults: AiPlayerBattleReportReadModel
  recentHistoryAnchors: AiPlayerSubjectHistoryAnchorsReadModel
  recentRecoveryAnchors: AiPlayerSubjectRecoveryAnchorsReadModel
  recentVisibleActivities: AiPlayerVisibleActivityFeedReadModel
  recentReceipts: ReturnType<typeof listAiPlayerActionReceipts>
  source: {
    developmentPlanIncluded: true
    mutationAllowed: false
    supportOnlySurfaces: string[]
  }
}

function buildAiPlayerSubjectAuthorityBoundaryReadModel(): AiPlayerSubjectAuthorityBoundaryReadModel {
  return {
    contractId: 'client_server_ai_authority_boundary_v1',
    ownerLabels: ['server-owned', 'AI-read'],
    serverTruthOwner: 'server',
    aiReadEntrypoint: 'GET /api/ai/players/:id/subject',
    clientCachePolicy: 'read_through_cache_only',
    clientMutationAllowed: false,
    sourceRefsVisibility: 'internal_link_only',
    playerVisibleCopyPolicy: 'translate_before_player_ui',
    supportSurfacesAreAuthority: false,
  }
}

function readMetadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function readReplayRetentionMaxAgeMs(): number {
  const raw = process.env.REPLAY_RETENTION_MAX_AGE_MS?.trim()
  if (!raw) {
    return DEFAULT_REPLAY_RETENTION_MAX_AGE_MS
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_REPLAY_RETENTION_MAX_AGE_MS
}

function isSubjectReplayArchiveEntryExpired(updatedAt: string, createdAt: string, nowMs = Date.now()): boolean {
  const updatedAtMs = Date.parse(updatedAt || createdAt)
  if (!Number.isFinite(updatedAtMs)) {
    return false
  }
  const retentionMaxAgeMs = readReplayRetentionMaxAgeMs()
  if (retentionMaxAgeMs <= 0) {
    return nowMs >= updatedAtMs
  }
  return nowMs - updatedAtMs > retentionMaxAgeMs
}

function buildSubjectReplayRecoverySurfaceFacts(params: {
  replayAvailable: boolean
  replayRetentionExpired: boolean
}): {
  replayRecoverySurface: 'replay_support_route' | 'player_history_unavailable_replay' | 'replay_support_route_retention_unavailable'
  replaySupportHttpStatus: 200 | 404 | 410
  replayPlayerSafeFallback: boolean
  recommendedRecoveryCommand: string
} {
  if (params.replayAvailable) {
    return {
      replayRecoverySurface: 'replay_support_route',
      replaySupportHttpStatus: 200,
      replayPlayerSafeFallback: false,
      recommendedRecoveryCommand: 'open_replay_support_route',
    }
  }
  if (params.replayRetentionExpired) {
    return {
      replayRecoverySurface: 'replay_support_route_retention_unavailable',
      replaySupportHttpStatus: 410,
      replayPlayerSafeFallback: true,
      recommendedRecoveryCommand: 'return_to_battle_report_after_retention_expired',
    }
  }
  return {
    replayRecoverySurface: 'player_history_unavailable_replay',
    replaySupportHttpStatus: 404,
    replayPlayerSafeFallback: true,
    recommendedRecoveryCommand: 'open_player_history_replay_fallback',
  }
}

function readTimelineCategory(value: string | undefined): PlayerWorldTimelineCategory {
  if (
    value === 'battle' ||
    value === 'court' ||
    value === 'diplomacy' ||
    value === 'economy_city' ||
    value === 'ai_activity' ||
    value === 'organization_nation' ||
    value === 'map_change' ||
    value === 'system'
  ) {
    return value
  }
  return 'ai_activity'
}

function readTimelineSeverity(value: string | undefined, fallback: PlayerWorldTimelineSeverity): PlayerWorldTimelineSeverity {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'critical') {
    return value
  }
  return fallback
}

function readSubjectSaveRecoveryFacts(
  runtime: GovernedAiPlayerRuntimeDetail,
  event: WorldEventRecord,
): AiPlayerSubjectSaveRecoveryFacts | null {
  const metadata = event.metadata
  if (readMetadataString(metadata, 'playerHistoryCategory') !== 'system') {
    return null
  }
  if (readMetadataString(metadata, 'playerHistoryFactionId') !== runtime.factionId) {
    return null
  }
  const saveSlotId = readMetadataString(metadata, 'slotId') ?? readMetadataString(metadata, 'saveSlotId')
  if (!saveSlotId) {
    return null
  }
  const title = readMetadataString(metadata, 'playerHistoryTitle') ?? ''
  if (title !== '存档已保存' && title !== '存档已恢复' && title !== '存档恢复失败') {
    return null
  }
  const saveRecoveryStatus: AiPlayerSubjectSaveRecoveryStatus = title === '存档已保存'
    ? 'saved'
    : title === '存档已恢复'
      ? 'restored'
      : 'restore_failed'
  return {
    title,
    summary: readMetadataString(metadata, 'playerHistorySummary') ?? event.message ?? '恢复锚点已记录',
    worldEventId: event.id,
    observedAt: event.createdAt,
    saveSlotId,
    saveRecoveryStatus,
    saveRecoveryTarget: readMetadataString(metadata, 'playerHistoryTarget') ?? saveSlotId,
    saveRecoveryScope: readMetadataString(metadata, 'playerHistoryScope') ?? 'own_save_slot',
    saveRecoveryAction: event.action,
    saveRecoverySuccess: event.success,
    saveRecoveryResultLabel: readMetadataString(metadata, 'playerHistoryResultLabel'),
    recommendedRecoveryCommand: saveRecoveryStatus === 'restore_failed'
      ? 'open_save_slot_list'
      : saveRecoveryStatus === 'restored'
        ? 'continue_after_save_restore'
        : 'inspect_save_slot',
  }
}

function buildSubjectHistoryAnchorsReadModel(
  runtime: GovernedAiPlayerRuntimeDetail,
  bodyChanges: AiPlayerSubjectRecentBodyChangesReadModel,
  limit = 5,
): AiPlayerSubjectHistoryAnchorsReadModel {
  const normalizedLimit = Math.max(1, Math.min(20, Math.trunc(Number(limit) || 5)))
  const items: AiPlayerSubjectHistoryAnchor[] = []
  const bodyChangeByProposalId = new Map<string, AiPlayerSubjectRecentBodyChange>()
  for (const bodyChange of bodyChanges.items) {
    if (bodyChange.proposalId) {
      bodyChangeByProposalId.set(bodyChange.proposalId, bodyChange)
    }
  }
  for (const event of getWorldEvents(Math.max(40, normalizedLimit * 8)).items) {
    const metadata = event.metadata
    if (readMetadataString(metadata, 'playerHistoryCategory') !== 'ai_activity') {
      continue
    }
    if (readMetadataString(metadata, 'aiPlayerId') !== runtime.aiPlayerId) {
      continue
    }
    if (readMetadataString(metadata, 'playerHistoryFactionId') !== runtime.factionId) {
      continue
    }
    const proposalId = readMetadataString(metadata, 'proposalId')
    const bodyChange = proposalId ? bodyChangeByProposalId.get(proposalId) : undefined
    items.push({
      cardId: `world-${event.id}`,
      createdAt: event.createdAt,
      category: readTimelineCategory(readMetadataString(metadata, 'playerHistoryCategory')),
      title: readMetadataString(metadata, 'playerHistoryTitle') ?? (event.success ? 'AI 行动已完成' : 'AI 行动受阻'),
      summary: readMetadataString(metadata, 'playerHistorySummary') ?? event.message ?? 'AI 活动已记录',
      resultLabel: readMetadataString(metadata, 'playerHistoryResultLabel') ?? (event.success ? '已完成' : '需要处理'),
      nextActionLabel: readMetadataString(metadata, 'playerHistoryNextAction'),
      severity: readTimelineSeverity(readMetadataString(metadata, 'playerHistorySeverity'), event.success ? 'low' : 'high'),
      bodyNode: bodyChange?.bodyNode,
      action: bodyChange?.action,
      status: bodyChange?.status,
      proposalId: bodyChange?.proposalId,
      failureCode: bodyChange?.failureCode,
      approvedBy: bodyChange?.approvedBy,
      rejectedBy: bodyChange?.rejectedBy,
      governanceApprovedBeforeExecution: bodyChange?.governanceApprovedBeforeExecution,
      governanceApprovedBy: bodyChange?.governanceApprovedBy,
      governanceApprovedAt: bodyChange?.governanceApprovedAt,
      governanceRecoveryFocus: bodyChange?.governanceRecoveryFocus,
      governanceRecoverySummary: bodyChange?.governanceRecoverySummary,
      governanceRecoveryRecommendedCommand: bodyChange?.governanceRecoveryRecommendedCommand,
      governanceFailureDetail: bodyChange?.governanceFailureDetail,
      governanceAttemptedWorldAction: bodyChange?.governanceAttemptedWorldAction,
      regionId: bodyChange?.regionId,
      targetTileId: bodyChange?.targetTileId,
      targetTileType: bodyChange?.targetTileType,
      targetTileTerrain: bodyChange?.targetTileTerrain,
      targetTileOwner: bodyChange?.targetTileOwner,
      targetTileResourceKind: bodyChange?.targetTileResourceKind,
      targetTileResourceLevel: bodyChange?.targetTileResourceLevel,
      targetTileScoutingDifficulty: bodyChange?.targetTileScoutingDifficulty,
      targetTileEnemyPressure: bodyChange?.targetTileEnemyPressure,
      unitId: bodyChange?.unitId,
      claimId: bodyChange?.claimId,
      governorPlayerId: bodyChange?.governorPlayerId,
      strength: bodyChange?.strength,
      supply: bodyChange?.supply,
      strengthBefore: bodyChange?.strengthBefore,
      strengthAfter: bodyChange?.strengthAfter,
      supplyBefore: bodyChange?.supplyBefore,
      supplyAfter: bodyChange?.supplyAfter,
      previousOwner: bodyChange?.previousOwner,
      owner: bodyChange?.owner,
      abandoned: bodyChange?.abandoned,
      clearedGatherClaim: bodyChange?.clearedGatherClaim,
      facilityId: bodyChange?.facilityId,
      buildingId: bodyChange?.buildingId,
      affairId: bodyChange?.affairId,
      techId: bodyChange?.techId,
      cityFootprintTiles: bodyChange?.cityFootprintTiles,
      cityFootprintTier: bodyChange?.cityFootprintTier,
      previousLevel: bodyChange?.previousLevel,
      nextLevel: bodyChange?.nextLevel,
      heroId: bodyChange?.heroId,
      skillId: bodyChange?.skillId,
      tacticId: bodyChange?.tacticId,
      previousExp: bodyChange?.previousExp,
      nextExp: bodyChange?.nextExp,
      expGained: bodyChange?.expGained,
      previousStarLevel: bodyChange?.previousStarLevel,
      nextStarLevel: bodyChange?.nextStarLevel,
      heroIds: bodyChange?.heroIds,
      rosterHeroIds: bodyChange?.rosterHeroIds,
      reserveHeroIds: bodyChange?.reserveHeroIds,
      poolId: bodyChange?.poolId,
      teamId: bodyChange?.teamId,
      teamIndex: bodyChange?.teamIndex,
      resourceDelta: bodyChange?.resourceDelta,
      accountBefore: bodyChange?.accountBefore,
      accountAfter: bodyChange?.accountAfter,
      resourcesSpent: bodyChange?.resourcesSpent,
      executionReceiptAvailable: bodyChange?.executionReceiptAvailable,
      executionWorldAction: bodyChange?.executionWorldAction,
      executionActionRequestId: bodyChange?.executionActionRequestId,
      executionFailureCode: bodyChange?.executionFailureCode,
      executionActionPointsRemaining: bodyChange?.executionActionPointsRemaining,
      executionRecoveryFocus: bodyChange?.executionRecoveryFocus,
      executionRecoverySummary: bodyChange?.executionRecoverySummary,
      executionRecoveryRecommendedCommand: bodyChange?.executionRecoveryRecommendedCommand,
      executionWorldReceiptAvailable: bodyChange?.executionWorldReceiptAvailable,
      executionWorldReceiptAction: bodyChange?.executionWorldReceiptAction,
      executionWorldReceiptTargetTileId: bodyChange?.executionWorldReceiptTargetTileId,
      executionWorldReceiptOccupied: bodyChange?.executionWorldReceiptOccupied,
      executionWorldReceiptPreviousOwner: bodyChange?.executionWorldReceiptPreviousOwner,
      executionWorldReceiptOwner: bodyChange?.executionWorldReceiptOwner,
      executionWorldReceiptAbandoned: bodyChange?.executionWorldReceiptAbandoned,
      executionWorldReceiptClearedGatherClaim: bodyChange?.executionWorldReceiptClearedGatherClaim,
      executionWorldReceiptUnitId: bodyChange?.executionWorldReceiptUnitId,
      executionWorldReceiptHeroId: bodyChange?.executionWorldReceiptHeroId,
      executionWorldReceiptExpGained: bodyChange?.executionWorldReceiptExpGained,
      executionWorldReceiptPreviousExp: bodyChange?.executionWorldReceiptPreviousExp,
      executionWorldReceiptNextExp: bodyChange?.executionWorldReceiptNextExp,
      executionWorldReceiptStrengthBefore: bodyChange?.executionWorldReceiptStrengthBefore,
      executionWorldReceiptStrengthAfter: bodyChange?.executionWorldReceiptStrengthAfter,
      executionWorldReceiptSupplyBefore: bodyChange?.executionWorldReceiptSupplyBefore,
      executionWorldReceiptSupplyAfter: bodyChange?.executionWorldReceiptSupplyAfter,
      executionWorldReceiptFacilityId: bodyChange?.executionWorldReceiptFacilityId,
      executionWorldReceiptBuildingId: bodyChange?.executionWorldReceiptBuildingId,
      executionWorldReceiptTechId: bodyChange?.executionWorldReceiptTechId,
      executionWorldReceiptPreviousLevel: bodyChange?.executionWorldReceiptPreviousLevel,
      executionWorldReceiptNextLevel: bodyChange?.executionWorldReceiptNextLevel,
      executionWorldReceiptResourcesSpentAvailable: bodyChange?.executionWorldReceiptResourcesSpentAvailable,
      assignmentUnitIds: bodyChange?.assignmentUnitIds,
      assignmentTargetTileIds: bodyChange?.assignmentTargetTileIds,
      assignmentCount: bodyChange?.assignmentCount,
      battleReportId: bodyChange?.battleReportId,
      battleOutcome: bodyChange?.battleOutcome,
      battleSeverity: bodyChange?.battleSeverity,
      battlePerspective: bodyChange?.battlePerspective,
      battleAssignedUnitInvolved: bodyChange?.battleAssignedUnitInvolved,
      battleOwnLoss: bodyChange?.battleOwnLoss,
      battleEnemyLoss: bodyChange?.battleEnemyLoss,
      battleNextStepSuggestion: bodyChange?.battleNextStepSuggestion,
      replayRequestId: bodyChange?.replayRequestId,
      sourceBattleReportId: bodyChange?.sourceBattleReportId,
      sourceReplayRequestId: bodyChange?.sourceReplayRequestId,
      recommendedRecoveryCommand: bodyChange?.recommendedRecoveryCommand,
      reportKind: bodyChange?.reportKind,
      cityDurabilityAfter: bodyChange?.cityDurabilityAfter,
      cityDurabilityMax: bodyChange?.cityDurabilityMax,
      cityOwnerAfter: bodyChange?.cityOwnerAfter,
      cityCaptured: bodyChange?.cityCaptured,
      warFollowUpAction: bodyChange?.warFollowUpAction,
      warFollowUpArgs: bodyChange?.warFollowUpArgs,
      warFollowUpReadiness: bodyChange?.warFollowUpReadiness,
      warFollowUpReason: bodyChange?.warFollowUpReason,
      agendaActionId: bodyChange?.agendaActionId,
      mode: bodyChange?.mode,
      allianceCommanderId: bodyChange?.allianceCommanderId,
      allianceSupportLevel: bodyChange?.allianceSupportLevel,
      allianceCommanderReadiness: bodyChange?.allianceCommanderReadiness,
      allianceCommanderMissing: bodyChange?.allianceCommanderMissing,
      allianceActionId: bodyChange?.allianceActionId,
      allianceActionSeverity: bodyChange?.allianceActionSeverity,
      allianceActionTileId: bodyChange?.allianceActionTileId,
      allianceActionTitle: bodyChange?.allianceActionTitle,
      allianceActionDetail: bodyChange?.allianceActionDetail,
      nextSubjectFocus: bodyChange?.nextSubjectFocus,
      sourceRefs: {
        visibility: 'internal_link_only',
        visible: false,
        worldEventId: event.id,
        proposalId: bodyChange?.proposalId,
        requestId: event.requestId,
        replayRequestId: event.requestId,
        sourceBattleReportId: bodyChange?.sourceBattleReportId,
        sourceReplayRequestId: bodyChange?.sourceReplayRequestId,
        recommendedRecoveryCommand: bodyChange?.recommendedRecoveryCommand,
        saveSlotId: readMetadataString(metadata, 'saveSlotId'),
      },
    })
    if (items.length >= normalizedLimit) {
      break
    }
  }
  return {
    contractId: 'ai_player_subject_history_anchors_v1',
    aiPlayerId: runtime.aiPlayerId,
    factionId: runtime.factionId,
    count: items.length,
    items,
  }
}

function buildVisibleActivityJumpTarget(mapTargetTileId?: string): AiPlayerVisibleActivityItem['jumpTarget'] | undefined {
  if (!mapTargetTileId) {
    return undefined
  }
  return {
    surface: 'world_map',
    targetId: mapTargetTileId,
    label: AI_VISIBLE_ACTIVITY_WORLD_MAP_LABEL,
  }
}

function buildTileOccupyVisibleActivityCopy(
  actorName: string,
  status: AiPlayerSubjectHistoryAnchor['status'],
): Pick<AiPlayerVisibleActivityItem, 'title' | 'summary' | 'resultLabel'> {
  if (status === 'failed') {
    return {
      title: '前线推进受阻',
      summary: `${actorName}向目标地块推进时受阻，前线暂未改写。`,
      resultLabel: '推进受阻',
    }
  }
  return {
    title: '前线已推进',
    summary: `${actorName}已进驻目标地块，前线归属已经刷新。`,
    resultLabel: '已占住',
  }
}

function buildVisibleActivityIntentLabel(action?: string): string {
  if (action === 'tile_occupy') {
    return '占据前线地块'
  }
  if (action === 'resource_gather') {
    return '采集前线资源'
  }
  if (action === 'march_move') {
    return '推进部队路线'
  }
  if (action === 'garrison_set') {
    return '布防前线据点'
  }
  if (action === 'city_siege') {
    return '压迫城池目标'
  }
  return '推进当前行动'
}

function buildVisibleActivityReasonLabel(
  action: string | undefined,
  status: AiPlayerSubjectHistoryAnchor['status'],
): string {
  const completed = status !== 'failed'
  if (action === 'tile_occupy') {
    return completed ? '扩大前线控制' : '前线推进受阻'
  }
  if (action === 'resource_gather') {
    return '补足行军补给'
  }
  if (action === 'march_move') {
    return '接近地图目标'
  }
  if (action === 'garrison_set') {
    return '稳固前线防线'
  }
  if (action === 'city_siege') {
    return '打开攻城战线'
  }
  return completed ? '行动结果已写入世界' : '行动需要重新评估'
}

function readVisibleActivityPriority(severity: PlayerWorldTimelineSeverity): number {
  if (severity === 'critical') {
    return 100
  }
  if (severity === 'high') {
    return 80
  }
  if (severity === 'medium') {
    return 60
  }
  return 30
}

function compareVisibleActivityItems(a: AiPlayerVisibleActivityItem, b: AiPlayerVisibleActivityItem): number {
  const priorityDelta = b.priority - a.priority
  if (priorityDelta !== 0) {
    return priorityDelta
  }
  const turnDelta = (b.turn ?? -1) - (a.turn ?? -1)
  if (turnDelta !== 0) {
    return turnDelta
  }
  const sequenceDelta = b.sequence - a.sequence
  if (sequenceDelta !== 0) {
    return sequenceDelta
  }
  const timeDelta = Date.parse(b.occurredAt) - Date.parse(a.occurredAt)
  if (timeDelta !== 0) {
    return timeDelta
  }
  return a.activityEventId.localeCompare(b.activityEventId)
}

function buildVisibleActivityAggregateGroups(
  items: AiPlayerVisibleActivityItem[],
): AiPlayerVisibleActivityAggregateGroup[] {
  const groups = new Map<string, AiPlayerVisibleActivityAggregateGroup>()
  for (const item of items) {
    const groupId = `ai_activity_group:${item.actorId}:${item.intentLabel}`
    const existing = groups.get(groupId)
    if (!existing) {
      groups.set(groupId, {
        groupId,
        actorId: item.actorId,
        actorName: item.actorName,
        intentLabel: item.intentLabel,
        activityCount: 1,
        latestTurn: item.turn,
        latestOccurredAt: item.occurredAt,
        priority: item.priority,
        mapTargetTileIds: item.mapTargetTileId ? [item.mapTargetTileId] : [],
        activityEventIds: [item.activityEventId],
      })
      continue
    }
    existing.activityCount += 1
    existing.priority = Math.max(existing.priority, item.priority)
    existing.activityEventIds.push(item.activityEventId)
    if (item.turn !== undefined) {
      existing.latestTurn = Math.max(existing.latestTurn ?? item.turn, item.turn)
    }
    if (Date.parse(item.occurredAt) > Date.parse(existing.latestOccurredAt)) {
      existing.latestOccurredAt = item.occurredAt
    }
    if (item.mapTargetTileId && !existing.mapTargetTileIds.includes(item.mapTargetTileId)) {
      existing.mapTargetTileIds.push(item.mapTargetTileId)
    }
  }
  return Array.from(groups.values()).sort((a, b) => {
    const priorityDelta = b.priority - a.priority
    if (priorityDelta !== 0) {
      return priorityDelta
    }
    const turnDelta = (b.latestTurn ?? -1) - (a.latestTurn ?? -1)
    if (turnDelta !== 0) {
      return turnDelta
    }
    return Date.parse(b.latestOccurredAt) - Date.parse(a.latestOccurredAt)
  })
}

function buildVisibleActivityMapTargetQueue(
  items: AiPlayerVisibleActivityItem[],
): AiPlayerVisibleActivityMapTargetQueueItem[] {
  return items.flatMap((item) => {
    if (!item.mapTargetTileId || !item.jumpTarget) {
      return []
    }
    return [{
      queueId: `ai_activity_target:${item.activityEventId}:${item.mapTargetTileId}`,
      activityEventId: item.activityEventId,
      actorId: item.actorId,
      actorName: item.actorName,
      intentLabel: item.intentLabel,
      priority: item.priority,
      sequence: item.sequence,
      occurredAt: item.occurredAt,
      mapTargetTileId: item.mapTargetTileId,
      jumpTarget: item.jumpTarget,
      sourceRef: item.sourceRef,
    }]
  })
}

export function buildAiPlayerVisibleActivityFeedFromHistoryAnchors(input: {
  aiPlayerId: string
  factionId: string
  actorName: string
  anchors: Array<Pick<AiPlayerSubjectHistoryAnchor, 'cardId' | 'createdAt' | 'action' | 'status' | 'title' | 'summary' | 'resultLabel' | 'severity' | 'proposalId' | 'targetTileId' | 'sourceRefs'>>
  limit?: number
}): AiPlayerVisibleActivityFeedReadModel {
  const normalizedLimit = Math.max(1, Math.min(12, Math.trunc(Number(input.limit ?? 6) || 6)))
  const items: AiPlayerVisibleActivityItem[] = []
  const seenActivityEventIds = new Set<string>()
  for (const anchor of input.anchors) {
    const worldEventId = anchor.sourceRefs.worldEventId?.trim()
    const activityEventId = worldEventId || anchor.cardId
    if (!activityEventId || seenActivityEventIds.has(activityEventId)) {
      continue
    }
    seenActivityEventIds.add(activityEventId)
    const mapTargetTileId = anchor.targetTileId?.trim() || undefined
    const requestId = anchor.sourceRefs.requestId?.trim() || anchor.sourceRefs.replayRequestId?.trim()
    const isTileOccupy = anchor.action === 'tile_occupy'
    const visibleCopy = isTileOccupy
      ? buildTileOccupyVisibleActivityCopy(input.actorName, anchor.status)
      : {
        title: anchor.title,
        summary: anchor.summary,
        resultLabel: anchor.resultLabel,
      }
    items.push({
      activityEventId,
      actorType: 'ai_player',
      actorId: input.aiPlayerId,
      actorName: input.actorName,
      intentLabel: buildVisibleActivityIntentLabel(anchor.action),
      reasonLabel: buildVisibleActivityReasonLabel(anchor.action, anchor.status),
      priority: readVisibleActivityPriority(anchor.severity),
      sequence: items.length + 1,
      occurredAt: anchor.createdAt,
      title: visibleCopy.title,
      summary: visibleCopy.summary,
      resultLabel: visibleCopy.resultLabel,
      severity: anchor.severity,
      createdAt: anchor.createdAt,
      mapTargetTileId,
      jumpTarget: buildVisibleActivityJumpTarget(mapTargetTileId),
      sourceRef: {
        visibility: 'internal_link_only',
        visible: false,
        worldEventId,
        proposalId: anchor.proposalId,
        requestId,
      },
    })
  }
  const sortedItems = items
    .sort(compareVisibleActivityItems)
    .slice(0, normalizedLimit)
  return {
    contractId: 'ai_player_visible_activity_feed_v1',
    aiPlayerId: input.aiPlayerId,
    factionId: input.factionId,
    count: sortedItems.length,
    sortOrder: AI_VISIBLE_ACTIVITY_SORT_ORDER,
    aggregateGroups: buildVisibleActivityAggregateGroups(sortedItems),
    mapTargetQueue: buildVisibleActivityMapTargetQueue(sortedItems),
    items: sortedItems,
  }
}

function attachHistoryAnchorsToSubjectBodyChanges(
  bodyChanges: AiPlayerSubjectRecentBodyChangesReadModel,
  historyAnchors: AiPlayerSubjectHistoryAnchorsReadModel,
): AiPlayerSubjectRecentBodyChangesReadModel {
  const historyByProposalId = new Map<string, AiPlayerSubjectHistoryAnchor>()
  for (const anchor of historyAnchors.items) {
    if (anchor.proposalId && !historyByProposalId.has(anchor.proposalId)) {
      historyByProposalId.set(anchor.proposalId, anchor)
    }
  }
  return {
    ...bodyChanges,
    items: bodyChanges.items.map((bodyChange) => {
      const anchor = bodyChange.proposalId ? historyByProposalId.get(bodyChange.proposalId) : undefined
      if (!anchor) {
        return bodyChange
      }
      return {
        ...bodyChange,
        historyAnchorAvailable: true,
        historyAnchorWorldEventId: anchor.sourceRefs.worldEventId,
        historyAnchorSourceVisibility: anchor.sourceRefs.visibility,
      }
    }),
  }
}

function attachRecoveryAnchorsToSubjectBodyChanges(
  bodyChanges: AiPlayerSubjectRecentBodyChangesReadModel,
  recoveryAnchors: AiPlayerSubjectRecoveryAnchorsReadModel,
): AiPlayerSubjectRecentBodyChangesReadModel {
  const replayRecoveryByRequestId = new Map<string, AiPlayerSubjectRecoveryAnchor>()
  const saveRecoveryBySlotAndStatus = new Map<string, AiPlayerSubjectRecoveryAnchor>()
  for (const anchor of recoveryAnchors.items) {
    const replayRequestId = anchor.sourceRefs.replayRequestId
    if (anchor.kind === 'replay' && replayRequestId && !replayRecoveryByRequestId.has(replayRequestId)) {
      replayRecoveryByRequestId.set(replayRequestId, anchor)
    }
    const saveSlotId = anchor.sourceRefs.saveSlotId
    const saveRecoveryStatus = anchor.sourceRefs.saveRecoveryStatus
    const saveKey = saveSlotId && saveRecoveryStatus ? `${saveSlotId}:${saveRecoveryStatus}` : undefined
    if (anchor.kind === 'save' && saveKey && !saveRecoveryBySlotAndStatus.has(saveKey)) {
      saveRecoveryBySlotAndStatus.set(saveKey, anchor)
    }
  }
  return {
    ...bodyChanges,
    items: bodyChanges.items.map((bodyChange) => {
      const replayRequestId = bodyChange.replayRequestId
      const anchor = replayRequestId ? replayRecoveryByRequestId.get(replayRequestId) : undefined
      if (anchor) {
        return {
          ...bodyChange,
          recoveryAnchorAvailable: true,
          recoveryAnchorKind: anchor.kind,
          recoveryAnchorReplayRequestId: replayRequestId,
          recoveryAnchorReplayAvailable: anchor.sourceRefs.replayAvailable,
          recoveryAnchorReplayArchiveEntryAvailable: anchor.sourceRefs.replayArchiveEntryAvailable,
          recoveryAnchorReplayRetentionExpired: anchor.sourceRefs.replayRetentionExpired,
        recoveryAnchorReplayStatus: anchor.sourceRefs.replayRecoveryStatus,
        recoveryAnchorReplayReason: anchor.sourceRefs.replayRecoveryReason,
        recoveryAnchorReplayRecoverySurface: anchor.sourceRefs.replayRecoverySurface,
        recoveryAnchorReplaySupportHttpStatus: anchor.sourceRefs.replaySupportHttpStatus,
        recoveryAnchorReplayPlayerSafeFallback: anchor.sourceRefs.replayPlayerSafeFallback,
        recoveryAnchorRecommendedRecoveryCommand: anchor.sourceRefs.recommendedRecoveryCommand,
        recoveryAnchorBattleReportId: anchor.sourceRefs.battleReportId,
        recoveryAnchorReportKind: anchor.sourceRefs.reportKind,
        recoveryAnchorSourceVisibility: anchor.sourceRefs.visibility,
      }
      }
      const saveKey = bodyChange.saveSlotId && bodyChange.saveRecoveryStatus
        ? `${bodyChange.saveSlotId}:${bodyChange.saveRecoveryStatus}`
        : undefined
      const saveAnchor = saveKey ? saveRecoveryBySlotAndStatus.get(saveKey) : undefined
      if (!saveAnchor) {
        return bodyChange
      }
      return {
        ...bodyChange,
        recoveryAnchorAvailable: true,
        recoveryAnchorKind: saveAnchor.kind,
        recoveryAnchorSaveStatus: saveAnchor.sourceRefs.saveRecoveryStatus,
        recoveryAnchorSourceVisibility: saveAnchor.sourceRefs.visibility,
      }
    }),
  }
}

function attachExecutionReceiptToSubjectBodyChange(
  bodyChange: AiPlayerSubjectRecentBodyChange,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange {
  const worldReceipt = readRecord(receipt.worldReceipt)
  const recoveryHint = readRecord(receipt.recoveryHint)
  const execution = readRecord(receipt.execution)
  const worldReceiptAction = readString(worldReceipt.action)
  const worldReceiptTargetTileId =
    readString(worldReceipt.tileId) ??
    readString(worldReceipt.cityHallTileId) ??
    readString(worldReceipt.cityId)
  const worldReceiptOccupied = readBoolean(worldReceipt.occupied)
  const worldReceiptPreviousOwner = readString(worldReceipt.previousOwner)
  const worldReceiptOwner = readString(worldReceipt.owner)
  const worldReceiptAbandoned = readBoolean(worldReceipt.abandoned)
  const worldReceiptClearedGatherClaim = readBoolean(worldReceipt.clearedGatherClaim)
  const worldReceiptUnitId = readString(worldReceipt.unitId)
  const worldReceiptHeroId = readString(worldReceipt.heroId)
  const worldReceiptExpGained = readNumber(worldReceipt.expGained)
  const worldReceiptPreviousExp = readNumber(worldReceipt.previousExp)
  const worldReceiptNextExp = readNumber(worldReceipt.nextExp)
  const worldReceiptStrengthBefore = readNumber(worldReceipt.strengthBefore)
  const worldReceiptStrengthAfter = readNumber(worldReceipt.strengthAfter)
  const worldReceiptSupplyBefore = readNumber(worldReceipt.supplyBefore)
  const worldReceiptSupplyAfter = readNumber(worldReceipt.supplyAfter)
  const worldReceiptFacilityId = readString(worldReceipt.groupId) ?? readString(worldReceipt.facilityId)
  const worldReceiptBuildingId = readString(worldReceipt.buildingId)
  const worldReceiptTechId = readString(worldReceipt.techId)
  const worldReceiptPreviousLevel = readNumber(worldReceipt.previousLevel)
  const worldReceiptNextLevel = readNumber(worldReceipt.nextLevel)
  const worldReceiptResourcesSpent = readNumberRecord(worldReceipt.resourcesSpent)
  const governanceApprovedBy = readString(receipt.approvedBy)
  const governanceApprovedAt = readString(receipt.approvedAt)
  return {
    ...bodyChange,
    governanceApprovedBeforeExecution: Boolean(governanceApprovedBy || governanceApprovedAt),
    governanceApprovedBy,
    governanceApprovedAt,
    executionReceiptAvailable: true,
    executionWorldAction: receipt.worldAction,
    executionActionRequestId: receipt.actionRequestId,
    executionFailureCode: receipt.failureCode,
    executionActionPointsRemaining: readNumber(execution.actionPointsRemaining),
    executionRecoveryFocus: readString(recoveryHint.focus),
    executionRecoverySummary: readString(recoveryHint.summary),
    executionRecoveryRecommendedCommand: readString(recoveryHint.recommendedCommand),
    executionWorldReceiptAvailable: Boolean(worldReceiptAction),
    executionWorldReceiptAction: worldReceiptAction,
    executionWorldReceiptTargetTileId: worldReceiptTargetTileId,
    executionWorldReceiptOccupied: worldReceiptOccupied,
    executionWorldReceiptPreviousOwner: worldReceiptPreviousOwner,
    executionWorldReceiptOwner: worldReceiptOwner,
    executionWorldReceiptAbandoned: worldReceiptAbandoned,
    executionWorldReceiptClearedGatherClaim: worldReceiptClearedGatherClaim,
    executionWorldReceiptUnitId: worldReceiptUnitId,
    executionWorldReceiptHeroId: worldReceiptHeroId,
    executionWorldReceiptExpGained: worldReceiptExpGained,
    executionWorldReceiptPreviousExp: worldReceiptPreviousExp,
    executionWorldReceiptNextExp: worldReceiptNextExp,
    executionWorldReceiptStrengthBefore: worldReceiptStrengthBefore,
    executionWorldReceiptStrengthAfter: worldReceiptStrengthAfter,
    executionWorldReceiptSupplyBefore: worldReceiptSupplyBefore,
    executionWorldReceiptSupplyAfter: worldReceiptSupplyAfter,
    executionWorldReceiptFacilityId: worldReceiptFacilityId,
    executionWorldReceiptBuildingId: worldReceiptBuildingId,
    executionWorldReceiptTechId: worldReceiptTechId,
    executionWorldReceiptPreviousLevel: worldReceiptPreviousLevel,
    executionWorldReceiptNextLevel: worldReceiptNextLevel,
    executionWorldReceiptResourcesSpentAvailable: Object.keys(worldReceiptResourcesSpent).length > 0,
  }
}

function buildSubjectRecoveryAnchorsReadModel(
  runtime: GovernedAiPlayerRuntimeDetail,
  battleResults: AiPlayerBattleReportReadModel,
  limit = 5,
): AiPlayerSubjectRecoveryAnchorsReadModel {
  const normalizedLimit = Math.max(1, Math.min(20, Math.trunc(Number(limit) || 5)))
  const items: AiPlayerSubjectRecoveryAnchor[] = []
  const seen = new Set<string>()

  for (const battle of battleResults.items) {
    const replayRequestId = battle.replayRequestId?.trim()
    if (!replayRequestId || seen.has(`replay:${replayRequestId}`)) {
      continue
    }
    seen.add(`replay:${replayRequestId}`)
    const replayRecordAvailable = Boolean(getExecutionReplayByRequestId(replayRequestId))
    const replayArchiveEntry = getReplayArchiveEntry(replayRequestId)
    const replayArchiveEntryAvailable = Boolean(replayArchiveEntry)
    const replayRetentionExpired = Boolean(
      replayArchiveEntry && isSubjectReplayArchiveEntryExpired(replayArchiveEntry.updatedAt, replayArchiveEntry.createdAt),
    )
    const replayAvailable = replayRecordAvailable && !replayRetentionExpired
    const replayRecoveryStatus = replayAvailable ? 'available' : 'unavailable'
    const replayRecoveryReason = replayAvailable
      ? undefined
      : replayRecordAvailable && replayRetentionExpired
        ? 'retention_expired'
        : 'missing_replay_record'
    const replayRecoverySurfaceFacts = buildSubjectReplayRecoverySurfaceFacts({
      replayAvailable,
      replayRetentionExpired,
    })
    const reportKind = battle.reportKind ?? 'battle_report'
    items.push({
      kind: 'replay',
      title: '战斗回放',
      summary: battle.summary,
      sourceRefs: {
        visibility: 'internal_link_only',
        visible: false,
        replayRequestId,
        replayAvailable,
        replayArchiveEntryAvailable,
        replayRetentionExpired,
        replayRecoveryStatus,
        replayRecoveryReason,
        ...replayRecoverySurfaceFacts,
        regionId: battle.regionId,
        battleReportId: battle.reportId,
        reportKind,
      },
    })
    if (items.length >= normalizedLimit) {
      break
    }
  }

  if (items.length < normalizedLimit) {
    for (const event of getWorldEvents(Math.max(40, normalizedLimit * 8)).items) {
      const saveRecovery = readSubjectSaveRecoveryFacts(runtime, event)
      if (!saveRecovery) {
        continue
      }
      if (seen.has(`save:${saveRecovery.saveSlotId}:${saveRecovery.saveRecoveryStatus}`)) {
        continue
      }
      seen.add(`save:${saveRecovery.saveSlotId}:${saveRecovery.saveRecoveryStatus}`)
      items.push({
        kind: 'save',
        title: saveRecovery.title,
        summary: saveRecovery.summary,
        sourceRefs: {
          visibility: 'internal_link_only',
          visible: false,
          saveSlotId: saveRecovery.saveSlotId,
          saveRecoveryStatus: saveRecovery.saveRecoveryStatus,
          saveRecoveryTarget: saveRecovery.saveRecoveryTarget,
          saveRecoveryScope: saveRecovery.saveRecoveryScope,
          saveRecoveryAction: saveRecovery.saveRecoveryAction,
          saveRecoverySuccess: saveRecovery.saveRecoverySuccess,
          saveRecoveryResultLabel: saveRecovery.saveRecoveryResultLabel,
          worldEventId: saveRecovery.worldEventId,
        },
      })
      if (items.length >= normalizedLimit) {
        break
      }
    }
  }

  return {
    contractId: 'ai_player_subject_recovery_anchors_v1',
    aiPlayerId: runtime.aiPlayerId,
    factionId: runtime.factionId,
    count: items.length,
    items,
  }
}

function resourceBundleForAiGather(resourceKind: ResourceKind, amount: number): ResourceTransferBundle {
  return {
    food: resourceKind === 'food' ? amount : 0,
    wood: resourceKind === 'wood' ? amount : 0,
    stone: resourceKind === 'stone' ? amount : 0,
    iron: resourceKind === 'iron' ? amount : 0,
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function readReplayAccessDeniedReason(value: unknown): 'invalid_share_token' | 'missing_session' | 'foreign_faction' | undefined {
  return value === 'invalid_share_token' || value === 'missing_session' || value === 'foreign_faction'
    ? value
    : undefined
}

function readReplayAccessDeniedHttpStatus(value: unknown): 401 | 403 | undefined {
  return value === 401 || value === 403 ? value : undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readNumberRecord(value: unknown): Record<string, number> {
  const record = readRecord(value)
  const result: Record<string, number> = {}
  for (const [key, rawValue] of Object.entries(record)) {
    const numberValue = readNumber(rawValue)
    if (numberValue !== undefined) {
      result[key] = numberValue
    }
  }
  return result
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => readString(item)).filter((item): item is string => Boolean(item))
    : []
}

function readRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.map((item) => readRecord(item)).filter((item) => Object.keys(item).length > 0)
    : []
}

function isAiManagedUnit(
  world: Readonly<WorldState>,
  runtime: GovernedAiPlayerRuntimeDetail,
  unit: WorldState['units'][number],
): boolean {
  const assignedUnitIds = new Set(
    world.factions[runtime.factionId]?.aiPlayers
      ?.find((player) => player.id === runtime.aiPlayerId)
      ?.unitIds ?? [],
  )
  return unit.aiPlayerId === runtime.aiPlayerId || assignedUnitIds.has(unit.id)
}

function normalizeResourceBundle(value: unknown): ResourceTransferBundle {
  const record = readRecord(value)
  return {
    food: Math.max(0, Math.trunc(Number(record.food ?? 0) || 0)),
    wood: Math.max(0, Math.trunc(Number(record.wood ?? 0) || 0)),
    stone: Math.max(0, Math.trunc(Number(record.stone ?? 0) || 0)),
    iron: Math.max(0, Math.trunc(Number(record.iron ?? 0) || 0)),
  }
}

function buildResourceGatherSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  world: Readonly<WorldState>,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const targetTileId = readString(payload.tileId)
  if (!targetTileId) {
    return null
  }
  const faction = world.factions[runtime.factionId]
  const claim = faction?.aiResourceGatherClaims?.[targetTileId]
  if (!claim || claim.aiPlayerId !== runtime.aiPlayerId) {
    return null
  }
  const resourceDelta = normalizeResourceBundle(claim.resources)
  const accountAfter = normalizeResourceBundle(
    faction?.aiResourceAccounts?.[runtime.aiPlayerId]?.resources,
  )
  const accountBefore = receipt.ok
    ? {
      food: Math.max(0, accountAfter.food - resourceDelta.food),
      wood: Math.max(0, accountAfter.wood - resourceDelta.wood),
      stone: Math.max(0, accountAfter.stone - resourceDelta.stone),
      iron: Math.max(0, accountAfter.iron - resourceDelta.iron),
    }
    : accountAfter
  return {
    bodyNode: 'resources_and_buildings',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    targetTileId,
    unitId: readString(payload.unitId) ?? claim.unitId,
    claimId: claim.id,
    resourceDelta,
    accountBefore,
    accountAfter,
    nextSubjectFocus: 'economy',
    visibleToAi: true,
  }
}

function buildResourceTransferSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  world: Readonly<WorldState>,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const worldReceipt = readRecord(receipt.worldReceipt)
  const execution = readRecord(receipt.execution)
  const factionId = readString(worldReceipt.factionId) ?? readString(payload.factionId) ?? receipt.factionId
  const aiPlayerId = readString(worldReceipt.aiPlayerId) ?? readString(payload.aiPlayerId) ?? receipt.aiPlayerId
  if (factionId !== runtime.factionId || aiPlayerId !== runtime.aiPlayerId) {
    return null
  }
  const resources = normalizeResourceBundle(
    Object.keys(readRecord(worldReceipt.resources)).length > 0
      ? worldReceipt.resources
      : Object.keys(readRecord(payload.resources)).length > 0
        ? payload.resources
        : execution.resources,
  )
  const transferredTotal = resources.food + resources.wood + resources.stone + resources.iron
  if (transferredTotal <= 0) {
    return null
  }
  const accountAfter = normalizeResourceBundle(
    world.factions[runtime.factionId]?.aiResourceAccounts?.[runtime.aiPlayerId]?.resources,
  )
  const accountBefore = receipt.ok
    ? {
      food: accountAfter.food + resources.food,
      wood: accountAfter.wood + resources.wood,
      stone: accountAfter.stone + resources.stone,
      iron: accountAfter.iron + resources.iron,
    }
    : accountAfter
  return {
    bodyNode: 'resources_and_buildings',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.ok ? null : receipt.failureCode,
    governorPlayerId: readString(worldReceipt.governorPlayerId) ?? readString(payload.governorPlayerId) ?? receipt.governorPlayerId,
    resourceDelta: resources,
    accountBefore,
    accountAfter,
    nextSubjectFocus: 'economy',
    visibleToAi: true,
  }
}

function buildTileAbandonSubjectBodyChange(
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const worldReceipt = readRecord(receipt.worldReceipt)
  const targetTileId = readString(worldReceipt.tileId) ?? readString(payload.tileId)
  if (!targetTileId) {
    return null
  }
  const abandoned = readBoolean(worldReceipt.abandoned)
  if (receipt.ok && abandoned !== true) {
    return null
  }
  return {
    bodyNode: 'land_level_and_expansion',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    targetTileId,
    previousOwner: readString(worldReceipt.previousOwner),
    owner: readString(worldReceipt.owner),
    abandoned,
    clearedGatherClaim: readBoolean(worldReceipt.clearedGatherClaim),
    nextSubjectFocus: 'land',
    visibleToAi: true,
  }
}

function buildCityUpgradeSubjectBodyChange(
  world: Readonly<WorldState>,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const worldReceipt = readRecord(receipt.worldReceipt)
  const targetTileId =
    readString(worldReceipt.cityHallTileId) ??
    readString(worldReceipt.tileId) ??
    readString(payload.tileId)
  if (!targetTileId) {
    return null
  }
  const cityCluster = world.map.overlays.cityClusters.find((candidate) => (
    candidate.cityHallTileId === targetTileId ||
    candidate.tileIds.includes(targetTileId)
  ))
  return {
    bodyNode: 'resources_and_buildings',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.ok ? null : receipt.failureCode,
    targetTileId,
    cityFootprintTiles: cityCluster?.footprintTiles,
    cityFootprintTier: cityCluster?.footprintTier,
    nextSubjectFocus: 'economy',
    visibleToAi: true,
  }
}

function buildBuildingUpgradeSubjectBodyChange(
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const worldReceipt = readRecord(receipt.worldReceipt)
  const targetTileId = readString(worldReceipt.cityId) ?? readString(payload.cityId)
  const facilityId = readString(worldReceipt.groupId) ?? readString(payload.groupId)
  const buildingId = readString(worldReceipt.buildingId) ?? readString(payload.buildingId)
  if (!targetTileId || !facilityId || !buildingId) {
    return null
  }
  return {
    bodyNode: 'resources_and_buildings',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.ok ? null : receipt.failureCode,
    targetTileId,
    facilityId,
    buildingId,
    previousLevel: readNumber(worldReceipt.previousLevel),
    nextLevel: readNumber(worldReceipt.nextLevel),
    resourcesSpent: readNumberRecord(worldReceipt.resourcesSpent),
    nextSubjectFocus: 'economy',
    visibleToAi: true,
  }
}

function buildQueueFillIdleSlotSubjectBodyChange(
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const worldReceipt = readRecord(receipt.worldReceipt)
  const targetTileId = readString(worldReceipt.cityId) ?? readString(payload.cityId)
  const facilityId = readString(worldReceipt.groupId) ?? readString(payload.groupId)
  const affairId = readString(worldReceipt.affairId) ?? readString(payload.affairId)
  if (!targetTileId || !affairId) {
    return null
  }
  return {
    bodyNode: 'resources_and_buildings',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.ok ? null : receipt.failureCode,
    targetTileId,
    facilityId,
    affairId,
    nextSubjectFocus: 'economy',
    visibleToAi: true,
  }
}

function buildResearchStartSubjectBodyChange(
  world: Readonly<WorldState>,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const worldReceipt = readRecord(receipt.worldReceipt)
  const targetTileId =
    readString(worldReceipt.cityHallTileId) ??
    readString(worldReceipt.tileId) ??
    readString(payload.tileId)
  const techId = readString(worldReceipt.techId) ?? readString(payload.techId)
  if (!targetTileId || !techId) {
    return null
  }
  const cityCluster = world.map.overlays.cityClusters.find((candidate) => (
    candidate.cityHallTileId === targetTileId ||
    candidate.tileIds.includes(targetTileId)
  ))
  const currentTechLevel = cityCluster?.techLevels
    ? readNumber((cityCluster.techLevels as Record<string, unknown>)[techId])
    : undefined
  return {
    bodyNode: 'resources_and_buildings',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.ok ? null : receipt.failureCode,
    targetTileId,
    techId,
    previousLevel: readNumber(worldReceipt.previousLevel),
    nextLevel: readNumber(worldReceipt.nextLevel) ?? currentTechLevel,
    resourcesSpent: readNumberRecord(worldReceipt.resourcesSpent),
    nextSubjectFocus: 'economy',
    visibleToAi: true,
  }
}

function buildTroopHealSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  world: Readonly<WorldState>,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const unitId = readString(payload.unitId)
  if (!unitId) {
    return null
  }
  const unit = world.units.find((candidate) => (
    candidate.id === unitId &&
    candidate.faction === runtime.factionId &&
    isAiManagedUnit(world, runtime, candidate)
  ))
  if (!unit) {
    return null
  }
  return {
    bodyNode: 'generals_and_troops',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.ok ? null : receipt.failureCode,
    unitId: unit.id,
    strength: unit.strength,
    supply: unit.supply,
    sourceBattleReportId: readString(payload.sourceBattleReportId),
    sourceReplayRequestId: readString(payload.sourceReplayRequestId),
    recommendedRecoveryCommand: readString(payload.recommendedRecoveryCommand),
    nextSubjectFocus: 'troops',
    visibleToAi: true,
  }
}

function buildWorldScoutSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  world: Readonly<WorldState>,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const plan = readRecord(payload.plan)
  const orders = readRecordArray(plan.orders)
  const scoutOrder = orders.find((order) => readString(order.action) === 'recon') ?? orders[0]
  const unitId = readString(scoutOrder?.unitId)
  const targetTileId = readString(scoutOrder?.target)
  if (!unitId || !targetTileId) {
    return null
  }
  const unit = world.units.find((candidate) => candidate.id === unitId && candidate.faction === runtime.factionId)
  if (!unit || !isAiManagedUnit(world, runtime, unit)) {
    return null
  }
  const targetTile = world.map.tiles.find((tile) => tile.id === targetTileId)
  return {
    bodyNode: 'war_and_relations',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.ok ? null : receipt.failureCode,
    unitId,
    targetTileId,
    targetTileType: readString(targetTile?.type),
    targetTileTerrain: readString(targetTile?.terrain),
    targetTileOwner: readString(targetTile?.owner),
    targetTileResourceKind: readString(targetTile?.resourceKind),
    targetTileResourceLevel: readNumber(targetTile?.resourceLevel),
    targetTileScoutingDifficulty: readNumber(targetTile?.scoutingDifficulty),
    targetTileEnemyPressure: readNumber(targetTile?.enemyPressure),
    sourceBattleReportId: readString(payload.sourceBattleReportId),
    sourceReplayRequestId: readString(payload.sourceReplayRequestId),
    recommendedRecoveryCommand: readString(payload.recommendedRecoveryCommand),
    nextSubjectFocus: 'war',
    visibleToAi: true,
  }
}

function buildMarchMoveSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  world: Readonly<WorldState>,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const worldReceipt = readRecord(receipt.worldReceipt)
  const factionId = readString(worldReceipt.factionId) ?? readString(payload.factionId) ?? runtime.factionId
  if (factionId !== runtime.factionId) {
    return null
  }
  const unitId = readString(worldReceipt.unitId) ?? readString(payload.unitId)
  const targetTileId = readString(worldReceipt.tileId) ?? readString(payload.targetTileId)
  if (!unitId || !targetTileId) {
    return null
  }
  const unit = world.units.find((candidate) => (
    candidate.id === unitId &&
    candidate.faction === runtime.factionId &&
    isAiManagedUnit(world, runtime, candidate)
  ))
  if (!unit) {
    return null
  }
  return {
    bodyNode: 'generals_and_troops',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.failureCode,
    unitId,
    targetTileId,
    strength: unit.strength,
    supply: unit.supply,
    sourceBattleReportId: readString(payload.sourceBattleReportId),
    sourceReplayRequestId: readString(payload.sourceReplayRequestId),
    recommendedRecoveryCommand: readString(payload.recommendedRecoveryCommand),
    nextSubjectFocus: 'troops',
    visibleToAi: true,
  }
}

function buildAllianceDefenseSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  world: Readonly<WorldState>,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const plan = readRecord(payload.plan)
  const orders = readRecordArray(plan.orders)
  const garrisonOrders = orders.filter((order) => readString(order.action) === 'garrison')
  const assignmentUnitIds = garrisonOrders
    .map((order) => readString(order.unitId))
    .filter((unitId): unitId is string => Boolean(unitId))
  const assignmentTargetTileIds = garrisonOrders
    .map((order) => readString(order.target))
    .filter((targetTileId): targetTileId is string => Boolean(targetTileId))
  if (assignmentUnitIds.length === 0 || assignmentTargetTileIds.length === 0) {
    return null
  }
  const allUnitsManaged = assignmentUnitIds.every((unitId) => {
    const unit = world.units.find((candidate) => candidate.id === unitId && candidate.faction === runtime.factionId)
    return unit ? isAiManagedUnit(world, runtime, unit) : false
  })
  if (!allUnitsManaged) {
    return null
  }
  return {
    bodyNode: 'war_and_relations',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.ok ? null : receipt.failureCode,
    unitId: assignmentUnitIds[0],
    targetTileId: assignmentTargetTileIds[0],
    assignmentUnitIds,
    assignmentTargetTileIds,
    assignmentCount: garrisonOrders.length,
    sourceBattleReportId: readString(payload.sourceBattleReportId),
    sourceReplayRequestId: readString(payload.sourceReplayRequestId),
    recommendedRecoveryCommand: readString(payload.recommendedRecoveryCommand),
    nextSubjectFocus: 'war',
    visibleToAi: true,
  }
}

function buildCitySiegeSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  world: Readonly<WorldState>,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const plan = readRecord(payload.plan)
  const orders = readRecordArray(plan.orders)
  const captureOrder = orders.find((order) => readString(order.action) === 'capture') ?? orders[0]
  const unitId = readString(captureOrder?.unitId)
  const targetTileId = readString(captureOrder?.target)
  if (!unitId || !targetTileId) {
    return null
  }
  const unit = world.units.find((candidate) => candidate.id === unitId && candidate.faction === runtime.factionId)
  if (!unit || !isAiManagedUnit(world, runtime, unit)) {
    return null
  }
  const targetTile = world.map.tiles.find((tile) => tile.id === targetTileId)
  return {
    bodyNode: 'war_and_relations',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.ok ? null : receipt.failureCode,
    unitId,
    targetTileId,
    cityDurabilityAfter: readNumber(targetTile?.cityDurability),
    cityDurabilityMax: readNumber(targetTile?.cityDurabilityMax),
    cityOwnerAfter: readString(targetTile?.owner),
    cityCaptured: targetTile ? readString(targetTile.owner) === runtime.factionId : undefined,
    sourceBattleReportId: readString(payload.sourceBattleReportId),
    sourceReplayRequestId: readString(payload.sourceReplayRequestId),
    recommendedRecoveryCommand: readString(payload.recommendedRecoveryCommand),
    nextSubjectFocus: 'war',
    visibleToAi: true,
  }
}

function buildRallySubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  world: Readonly<WorldState>,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const plan = readRecord(payload.plan)
  const orders = readRecordArray(plan.orders)
  const rallyOrder = orders.find((order) => (
    readString(order.action) === 'support' ||
    readString(order.action) === 'march'
  )) ?? orders[0]
  const unitId = readString(rallyOrder?.unitId)
  const targetTileId = readString(rallyOrder?.target)
  if (!unitId || !targetTileId) {
    return null
  }
  const unit = world.units.find((candidate) => candidate.id === unitId && candidate.faction === runtime.factionId)
  if (!unit || !isAiManagedUnit(world, runtime, unit)) {
    return null
  }
  return {
    bodyNode: 'war_and_relations',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.ok ? null : receipt.failureCode,
    unitId,
    targetTileId,
    sourceBattleReportId: readString(payload.sourceBattleReportId),
    sourceReplayRequestId: readString(payload.sourceReplayRequestId),
    recommendedRecoveryCommand: readString(payload.recommendedRecoveryCommand),
    nextSubjectFocus: 'war',
    visibleToAi: true,
  }
}

function buildThreatEscapeSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const worldReceipt = readRecord(receipt.worldReceipt)
  const factionId = readString(worldReceipt.factionId) ?? readString(payload.factionId)
  if (factionId !== runtime.factionId) {
    return null
  }
  const agendaActionId = readString(payload.agendaActionId)
  if (!agendaActionId) {
    return null
  }
  return {
    bodyNode: 'war_and_relations',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.ok ? null : receipt.failureCode,
    agendaActionId,
    mode: readString(payload.mode),
    sourceBattleReportId: readString(payload.sourceBattleReportId),
    sourceReplayRequestId: readString(payload.sourceReplayRequestId),
    recommendedRecoveryCommand: readString(payload.recommendedRecoveryCommand),
    nextSubjectFocus: 'war',
    visibleToAi: true,
  }
}

function buildAllianceHelpSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  world: Readonly<WorldState>,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const worldReceipt = readRecord(receipt.worldReceipt)
  const factionId = readString(worldReceipt.factionId) ?? readString(payload.factionId)
  if (factionId !== runtime.factionId) {
    return null
  }
  const regionId = readString(payload.regionId)
  if (!regionId) {
    return null
  }
  const directive = world.alliance.directives[regionId]
  const commander = directive
    ? world.alliance.commanders.find((candidate) => candidate.id === directive.assignedCommanderId)
    : undefined
  const allianceAction = world.feedback.allianceActions.find((candidate) => (
    candidate.regionId === regionId &&
    candidate.factionId === factionId &&
    candidate.id.endsWith('-alliance-help')
  ))
  return {
    bodyNode: 'war_and_relations',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.ok ? null : receipt.failureCode,
    regionId,
    allianceCommanderId: readString(directive?.assignedCommanderId),
    allianceSupportLevel: readNumber(directive?.supportLevel),
    allianceCommanderReadiness: readNumber(commander?.readiness),
    allianceActionId: readString(allianceAction?.id),
    allianceActionSeverity: readString(allianceAction?.severity),
    allianceActionTileId: readString(allianceAction?.tileId),
    allianceActionTitle: readString(allianceAction?.title),
    allianceActionDetail: readString(allianceAction?.detail),
    sourceBattleReportId: readString(payload.sourceBattleReportId),
    sourceReplayRequestId: readString(payload.sourceReplayRequestId),
    recommendedRecoveryCommand: readString(payload.recommendedRecoveryCommand),
    nextSubjectFocus: 'war',
    visibleToAi: true,
  }
}

function buildGarrisonSetSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  world: Readonly<WorldState>,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const unitId = readString(payload.unitId)
  const targetTileId = readString(payload.targetTileId)
  if (!unitId || !targetTileId) {
    return null
  }
  const unit = world.units.find((candidate) => candidate.id === unitId && candidate.faction === runtime.factionId)
  if (!unit || !isAiManagedUnit(world, runtime, unit)) {
    return null
  }
  return {
    bodyNode: 'war_and_relations',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.ok ? null : receipt.failureCode,
    unitId,
    targetTileId,
    sourceBattleReportId: readString(payload.sourceBattleReportId),
    sourceReplayRequestId: readString(payload.sourceReplayRequestId),
    recommendedRecoveryCommand: readString(payload.recommendedRecoveryCommand),
    nextSubjectFocus: 'war',
    visibleToAi: true,
  }
}

function buildBattleReportSubjectBodyChanges(
  runtime: GovernedAiPlayerRuntimeDetail,
  world: Readonly<WorldState>,
  battleResults: AiPlayerBattleReportReadModel,
  limit: number,
): AiPlayerSubjectRecentBodyChange[] {
  const items: AiPlayerSubjectRecentBodyChange[] = []
  const normalizedLimit = Math.max(0, Math.min(20, Math.trunc(Number(limit) || 0)))
  for (const battle of battleResults.items) {
    if (items.length >= normalizedLimit) {
      break
    }
    if (!battle.assignedUnitInvolved && battle.perspective !== 'attacker') {
      continue
    }
    const ownLoss = battle.ownLoss
    const enemyLoss = battle.enemyLoss
    const targetTile = world.map.tiles.find((tile) => tile.id === battle.tileId)
    const cityDurabilityAfter = readNumber(targetTile?.cityDurability)
    const cityDurabilityMax = readNumber(targetTile?.cityDurabilityMax)
    const cityOwnerAfter = readString(targetTile?.owner)
    const cityCaptured = battle.reportKind === 'city_siege' ? cityOwnerAfter === runtime.factionId : undefined
    const reportKind = battle.reportKind ?? 'battle_report'
    const warFollowUp = buildAiPlayerWarBattleFollowUp({
      battle,
      unitId: battle.attackerUnitId,
      targetTileId: battle.tileId,
      cityCaptured,
    })
    items.push({
      bodyNode: 'war_and_relations',
      action: 'battle_report_read',
      status: battle.outcome === 'win' ? 'completed' : 'failed',
      observedAt: battleResults.generatedAt,
      failureCode: battle.outcome === 'win' ? null : `battle_${battle.outcome}`,
      unitId: battle.attackerUnitId,
      regionId: battle.regionId,
      targetTileId: battle.tileId,
      battleReportId: battle.reportId,
      battleOutcome: battle.outcome,
      battleSeverity: battle.severity,
      battlePerspective: battle.perspective,
      battleAssignedUnitInvolved: battle.assignedUnitInvolved,
      battleOwnLoss: ownLoss,
      battleEnemyLoss: enemyLoss,
      battleNextStepSuggestion: battle.nextStepSuggestion,
      replayRequestId: battle.replayRequestId,
      reportKind,
      cityDurabilityAfter,
      cityDurabilityMax,
      cityOwnerAfter,
      cityCaptured,
      warFollowUpAction: warFollowUp.action,
      warFollowUpArgs: {
        ...warFollowUp.args,
        sourceBattleReportId: battle.reportId,
        sourceReplayRequestId: battle.replayRequestId,
        recommendedRecoveryCommand: warFollowUp.readiness === 'ready'
          ? 'continue_war_follow_up_action'
          : undefined,
      },
      warFollowUpReadiness: warFollowUp.readiness,
      warFollowUpReason: warFollowUp.reason,
      recommendedRecoveryCommand: warFollowUp.readiness === 'ready'
        ? 'continue_war_follow_up_action'
        : undefined,
      nextSubjectFocus: 'war',
      visibleToAi: true,
    })
  }
  return items
}

function buildTroopTrainSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  world: Readonly<WorldState>,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const execution = readRecord(receipt.execution)
  const payloadHeroId = readString(payload.heroId)
  const payloadCoHeroIds = readStringArray(payload.coHeroIds)
  const expectedHeroIds = [payloadHeroId, ...payloadCoHeroIds]
    .filter((item): item is string => Boolean(item))
    .map((item) => item.startsWith('hero_') ? item : `hero_${item}`)
  const receiptUnitId = readString(execution.unitId) ?? readString(receipt.worldReceipt?.unitId) ?? readString(payload.unitId)
  const unit = world.units.find((candidate) => {
    if (candidate.faction !== runtime.factionId || candidate.aiPlayerId !== runtime.aiPlayerId) {
      return false
    }
    if (receiptUnitId) {
      return candidate.id === receiptUnitId
    }
    if (expectedHeroIds.length === 0) {
      return false
    }
    const candidateHeroIds = [candidate.hero.id, ...(candidate.coHeroes ?? []).map((hero) => hero.id)]
    return expectedHeroIds.every((heroId) => candidateHeroIds.includes(heroId))
  })
  if (!unit) {
    return null
  }
  const executionHeroIds = readStringArray(execution.heroIds)
  const unitHeroIds = [unit.hero.id, ...(unit.coHeroes ?? []).map((hero) => hero.id)]
  return {
    bodyNode: 'generals_and_troops',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    unitId: unit.id,
    heroIds: executionHeroIds.length > 0 ? executionHeroIds : unitHeroIds,
    teamId: unit.teamId ?? '',
    teamIndex: unit.teamIndex ?? 0,
    strength: unit.strength,
    supply: unit.supply,
    nextSubjectFocus: 'troops',
    visibleToAi: true,
  }
}

function buildRecruitCommanderSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  world: Readonly<WorldState>,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const worldReceipt = readRecord(receipt.worldReceipt)
  const factionId = readString(worldReceipt.factionId) ?? readString(payload.factionId)
  if (factionId !== runtime.factionId) {
    return null
  }
  const recruitedHeroIds = readStringArray(worldReceipt.heroIds)
  if (recruitedHeroIds.length === 0) {
    return null
  }
  const faction = world.factions[runtime.factionId]
  if (!faction) {
    return null
  }
  const rosterHeroIds = recruitedHeroIds.filter((heroId) => faction.heroCommand.rosterHeroIds.includes(heroId))
  const reserveHeroIds = recruitedHeroIds.filter((heroId) => faction.heroCommand.reserveHeroIds.includes(heroId))
  if (rosterHeroIds.length === 0 || reserveHeroIds.length === 0) {
    return null
  }
  return {
    bodyNode: 'generals_and_troops',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    heroIds: recruitedHeroIds,
    rosterHeroIds,
    reserveHeroIds,
    poolId: readString(worldReceipt.poolId) ?? readString(payload.poolId),
    nextSubjectFocus: 'troops',
    visibleToAi: true,
  }
}

function buildRecruitPoolSelectSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const worldReceipt = readRecord(receipt.worldReceipt)
  const execution = readRecord(receipt.execution)
  const factionId = readString(worldReceipt.factionId) ?? readString(payload.factionId) ?? receipt.factionId
  if (factionId !== runtime.factionId) {
    return null
  }
  const poolId = readString(worldReceipt.poolId) ?? readString(payload.poolId) ?? readString(execution.poolId)
  if (!poolId) {
    return null
  }
  return {
    bodyNode: 'generals_and_troops',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.ok ? null : receipt.failureCode,
    poolId,
    nextSubjectFocus: 'troops',
    visibleToAi: true,
  }
}

function buildTacticalSkillUpgradeSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const worldReceipt = readRecord(receipt.worldReceipt)
  const factionId = readString(worldReceipt.factionId) ?? readString(payload.factionId)
  if (factionId !== runtime.factionId) {
    return null
  }
  const heroId = readString(worldReceipt.heroId) ?? readString(payload.heroId)
  const skillId = readString(worldReceipt.skillId) ?? readString(payload.skillId)
  if (!heroId || !skillId) {
    return null
  }
  return {
    bodyNode: 'generals_and_troops',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    heroId,
    skillId,
    previousLevel: readNumber(worldReceipt.previousLevel),
    nextLevel: readNumber(worldReceipt.nextLevel),
    nextSubjectFocus: 'troops',
    visibleToAi: true,
  }
}

function buildFormationAssignSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const worldReceipt = readRecord(receipt.worldReceipt)
  const factionId = readString(worldReceipt.factionId) ?? readString(payload.factionId)
  if (factionId !== runtime.factionId) {
    return null
  }
  const heroId = readString(worldReceipt.heroId) ?? readString(payload.heroId)
  const tacticId = readString(worldReceipt.tacticId) ?? readString(payload.tacticId)
  if (!heroId || !tacticId) {
    return null
  }
  return {
    bodyNode: 'generals_and_troops',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.ok ? null : receipt.failureCode,
    heroId,
    tacticId,
    unitId: readString(worldReceipt.unitId),
    sourceBattleReportId: readString(payload.sourceBattleReportId),
    sourceReplayRequestId: readString(payload.sourceReplayRequestId),
    recommendedRecoveryCommand: readString(payload.recommendedRecoveryCommand),
    nextSubjectFocus: 'troops',
    visibleToAi: true,
  }
}

function buildGeneralFocusSetSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const worldReceipt = readRecord(receipt.worldReceipt)
  const factionId = readString(worldReceipt.factionId) ?? readString(payload.factionId)
  if (factionId !== runtime.factionId) {
    return null
  }
  const heroId = readString(worldReceipt.heroId) ?? readString(payload.heroId)
  if (!heroId) {
    return null
  }
  return {
    bodyNode: 'generals_and_troops',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.ok ? null : receipt.failureCode,
    heroId,
    sourceBattleReportId: readString(payload.sourceBattleReportId),
    sourceReplayRequestId: readString(payload.sourceReplayRequestId),
    recommendedRecoveryCommand: readString(payload.recommendedRecoveryCommand),
    nextSubjectFocus: 'troops',
    visibleToAi: true,
  }
}

function buildHeroStarUpgradeSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const worldReceipt = readRecord(receipt.worldReceipt)
  const factionId = readString(worldReceipt.factionId) ?? readString(payload.factionId)
  if (factionId !== runtime.factionId) {
    return null
  }
  const heroId = readString(worldReceipt.heroId) ?? readString(payload.heroId)
  if (!heroId) {
    return null
  }
  return {
    bodyNode: 'generals_and_troops',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    heroId,
    previousStarLevel: readNumber(worldReceipt.previousStarLevel),
    nextStarLevel: readNumber(worldReceipt.nextStarLevel),
    nextSubjectFocus: 'troops',
    visibleToAi: true,
  }
}

function buildTroopFacilityUpgradeSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const worldReceipt = readRecord(receipt.worldReceipt)
  const factionId = readString(worldReceipt.factionId) ?? readString(payload.factionId)
  if (factionId !== runtime.factionId) {
    return null
  }
  const unitId = readString(worldReceipt.unitId) ?? readString(payload.unitId)
  const facilityId = readString(worldReceipt.facilityId) ?? readString(payload.facilityId)
  const buildingId = readString(worldReceipt.buildingId) ?? readString(payload.buildingId)
  if (!unitId || !facilityId || !buildingId) {
    return null
  }
  return {
    bodyNode: 'generals_and_troops',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    unitId,
    facilityId,
    buildingId,
    previousLevel: readNumber(worldReceipt.previousLevel),
    nextLevel: readNumber(worldReceipt.nextLevel),
    nextSubjectFocus: 'troops',
    visibleToAi: true,
  }
}

function buildTileOccupyHeroGrowthSubjectBodyChange(
  runtime: GovernedAiPlayerRuntimeDetail,
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  const payload = readRecord(receipt.worldActionPayload)
  const worldReceipt = readRecord(receipt.worldReceipt)
  const factionId = readString(worldReceipt.factionId) ?? readString(payload.factionId)
  if (factionId !== runtime.factionId) {
    return null
  }
  const unitId = readString(worldReceipt.unitId) ?? readString(payload.unitId)
  const targetTileId = readString(worldReceipt.tileId) ?? readString(payload.tileId)
  if (!unitId || !targetTileId) {
    return null
  }
  const occupied = readBoolean(worldReceipt.occupied)
  if (!receipt.ok || occupied === false) {
    return {
      bodyNode: 'land_level_and_expansion',
      action: receipt.action,
      status: 'failed',
      proposalId: receipt.proposalId,
      observedAt: receipt.observedAt,
      failureCode: receipt.failureCode ?? (occupied === false ? 'tile_occupy_not_occupied' : null),
      unitId,
      targetTileId,
      recommendedRecoveryCommand: 'retry_or_select_alternate_land_target',
      nextSubjectFocus: 'land',
      visibleToAi: true,
    }
  }
  const heroId = readString(worldReceipt.heroId)
  const expGained = readNumber(worldReceipt.expGained)
  const strengthBefore = readNumber(worldReceipt.strengthBefore)
  const strengthAfter = readNumber(worldReceipt.strengthAfter)
  const supplyBefore = readNumber(worldReceipt.supplyBefore)
  const supplyAfter = readNumber(worldReceipt.supplyAfter)
  const hasHeroGrowth = Boolean(heroId) && expGained !== undefined && expGained > 0
  const hasTroopDelta = (
    strengthBefore !== undefined &&
    strengthAfter !== undefined &&
    strengthBefore !== strengthAfter
  ) || (
    supplyBefore !== undefined &&
    supplyAfter !== undefined &&
    supplyBefore !== supplyAfter
  )
  if (!hasHeroGrowth && !hasTroopDelta) {
    return null
  }
  return {
    bodyNode: 'generals_and_troops',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    unitId,
    targetTileId,
    heroId,
    previousLevel: readNumber(worldReceipt.previousLevel),
    nextLevel: readNumber(worldReceipt.nextLevel),
    previousExp: readNumber(worldReceipt.previousExp),
    nextExp: readNumber(worldReceipt.nextExp),
    expGained,
    strengthBefore,
    strengthAfter,
    supplyBefore,
    supplyAfter,
    nextSubjectFocus: 'troops',
    visibleToAi: true,
  }
}

function buildSaveRecoverySubjectBodyChanges(
  runtime: GovernedAiPlayerRuntimeDetail,
  limit: number,
): AiPlayerSubjectRecentBodyChange[] {
  const items: AiPlayerSubjectRecentBodyChange[] = []
  const seen = new Set<string>()
  for (const event of getWorldEvents(Math.max(40, limit * 8)).items) {
    if (items.length >= limit) {
      break
    }
    const saveRecovery = readSubjectSaveRecoveryFacts(runtime, event)
    if (!saveRecovery) {
      continue
    }
    const key = `${saveRecovery.saveSlotId}:${saveRecovery.saveRecoveryStatus}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    const failed = saveRecovery.saveRecoveryStatus === 'restore_failed'
    items.push({
      bodyNode: 'chat_report_history',
      action: saveRecovery.saveRecoveryAction,
      status: failed ? 'failed' : 'completed',
      observedAt: saveRecovery.observedAt,
      failureCode: failed ? 'restore_failed' : null,
      saveSlotId: saveRecovery.saveSlotId,
      saveRecoveryStatus: saveRecovery.saveRecoveryStatus,
      saveRecoveryTarget: saveRecovery.saveRecoveryTarget,
      saveRecoveryScope: saveRecovery.saveRecoveryScope,
      saveRecoveryAction: saveRecovery.saveRecoveryAction,
      saveRecoverySuccess: saveRecovery.saveRecoverySuccess,
      saveRecoveryResultLabel: saveRecovery.saveRecoveryResultLabel,
      recommendedRecoveryCommand: saveRecovery.recommendedRecoveryCommand,
      saveRecoveryWorldEventId: saveRecovery.worldEventId,
      nextSubjectFocus: 'history',
      visibleToAi: true,
    })
  }
  return items
}

function buildReplayDeniedSubjectBodyChanges(
  runtime: GovernedAiPlayerRuntimeDetail,
  knownReplayRequestIds: Set<string>,
  limit: number,
): AiPlayerSubjectRecentBodyChange[] {
  const items: AiPlayerSubjectRecentBodyChange[] = []
  const seen = new Set<string>()
  for (const event of getWorldEvents(Math.max(40, limit * 8)).items) {
    if (items.length >= limit) {
      break
    }
    const metadata = event.metadata
    if (event.action !== 'replay_access_denied') {
      continue
    }
    if (readMetadataString(metadata, 'playerHistoryCategory') !== 'system') {
      continue
    }
    if (readMetadataString(metadata, 'playerHistoryFactionId') !== runtime.factionId) {
      continue
    }
    if (readBoolean(metadata?.replayAccessDenied) !== true) {
      continue
    }
    const replayRequestId = readMetadataString(metadata, 'replayRequestId')
    if (!replayRequestId || !knownReplayRequestIds.has(replayRequestId)) {
      continue
    }
    const replayAccessDeniedReason = readReplayAccessDeniedReason(metadata?.replayAccessDeniedReason)
    const replayAccessDeniedHttpStatus = readReplayAccessDeniedHttpStatus(metadata?.replayAccessDeniedHttpStatus)
    const key = `${replayRequestId}:${replayAccessDeniedReason ?? 'unknown'}:${replayAccessDeniedHttpStatus ?? 'unknown'}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    items.push({
      bodyNode: 'chat_report_history',
      action: event.action,
      status: 'failed',
      observedAt: event.createdAt,
      failureCode: 'replay_access_denied',
      replayRequestId,
      replayAccessDenied: true,
      replayAccessDeniedReason,
      replayAccessDeniedHttpStatus,
      replayAccessDeniedSurface: 'replay_support_route_denied',
      replayAccessDeniedPlayerSafeFallback: readBoolean(metadata?.replayAccessDeniedPlayerSafeFallback) ?? true,
      recommendedRecoveryCommand: 'request_replay_access_or_return_battle_report',
      nextSubjectFocus: 'history',
      visibleToAi: true,
    })
  }
  return items
}

export function buildAiPlayerAutonomousReadOnlyRecoverySubjectBodyChange(
  receipt: AiPlayerActionReceipt,
): AiPlayerSubjectRecentBodyChange | null {
  if (receipt.action !== 'battle_report_read' && receipt.action !== 'activity_window_enter') {
    return null
  }
  const execution = readRecord(receipt.execution)
  if (readString(execution.kind) !== 'autonomous_read_only_recovery') {
    return null
  }
  const replayReason = readString(execution.recoveryAnchorReplayReason)
  const replaySurface = readString(execution.recoveryAnchorReplayRecoverySurface)
  const saveRecoveryStatus = readString(execution.saveRecoveryStatus)
  const executionNextSubjectFocus = readString(execution.nextSubjectFocus)
  const nextSubjectFocus = executionNextSubjectFocus === 'governance' ? 'governance' : 'history'
  return {
    bodyNode: 'chat_report_history',
    action: receipt.action,
    status: receipt.ok ? 'completed' : 'failed',
    proposalId: receipt.proposalId,
    observedAt: receipt.observedAt,
    failureCode: receipt.ok ? null : receipt.failureCode,
    recommendedRecoveryCommand: readString(execution.recommendedRecoveryCommand),
    replayRequestId: readString(execution.replayRequestId),
    saveSlotId: readString(execution.saveSlotId),
    saveRecoveryStatus: (
      saveRecoveryStatus === 'saved' ||
      saveRecoveryStatus === 'restored' ||
      saveRecoveryStatus === 'restore_failed'
    )
      ? saveRecoveryStatus
      : undefined,
    recoveryAnchorKind: readString(execution.recoveryAnchorKind),
    recoveryAnchorReplayRequestId: readString(execution.replayRequestId),
    recoveryAnchorReplayReason: replayReason === 'missing_replay_record' || replayReason === 'retention_expired'
      ? replayReason
      : undefined,
    recoveryAnchorReplayRecoverySurface: (
      replaySurface === 'replay_support_route' ||
      replaySurface === 'player_history_unavailable_replay' ||
      replaySurface === 'replay_support_route_retention_unavailable'
    )
      ? replaySurface
      : undefined,
    recoveryAnchorRecommendedRecoveryCommand: readString(execution.recommendedRecoveryCommand),
    executionReceiptAvailable: true,
    executionWorldAction: receipt.worldAction,
    executionActionRequestId: receipt.actionRequestId,
    executionFailureCode: receipt.failureCode,
    executionRecoveryRecommendedCommand: readString(execution.recommendedRecoveryCommand),
    executionWorldReceiptAvailable: false,
    governanceAttemptedWorldAction: readString(execution.governanceAttemptedWorldAction),
    governanceFailureDetail: readString(execution.governanceFailureDetail),
    regionId: readString(execution.regionId),
    allianceCommanderId: readString(execution.allianceCommanderId),
    allianceCommanderMissing: readBoolean(execution.allianceCommanderMissing),
    nextSubjectFocus,
    visibleToAi: true,
  }
}

function buildSubjectRecentBodyChangesReadModel(
  runtime: GovernedAiPlayerRuntimeDetail,
  world: Readonly<WorldState>,
  receipts: AiPlayerActionReceipt[],
  battleResults: AiPlayerBattleReportReadModel,
  proposals: AiPlayerActionProposal[] = [],
  limit = 8,
): AiPlayerSubjectRecentBodyChangesReadModel {
  const normalizedLimit = Math.max(1, Math.min(20, Math.trunc(Number(limit) || 8)))
  const items: AiPlayerSubjectRecentBodyChange[] = []
  const receiptProposalIds = new Set(receipts.map((receipt) => receipt.proposalId).filter(Boolean))
  for (const receipt of receipts) {
    if (items.length >= normalizedLimit) {
      break
    }
    let bodyChange: AiPlayerSubjectRecentBodyChange | null = null
    if (receipt.action === 'resource_gather') {
      bodyChange = buildResourceGatherSubjectBodyChange(runtime, world, receipt)
    } else if (receipt.action === 'resource_transfer_to_governor') {
      bodyChange = buildResourceTransferSubjectBodyChange(runtime, world, receipt)
    } else if (receipt.action === 'tile_abandon') {
      bodyChange = buildTileAbandonSubjectBodyChange(receipt)
    } else if (receipt.action === 'city_upgrade') {
      bodyChange = buildCityUpgradeSubjectBodyChange(world, receipt)
    } else if (receipt.action === 'building_upgrade') {
      bodyChange = buildBuildingUpgradeSubjectBodyChange(receipt)
    } else if (receipt.action === 'queue_fill_idle_slot') {
      bodyChange = buildQueueFillIdleSlotSubjectBodyChange(receipt)
    } else if (receipt.action === 'research_start') {
      bodyChange = buildResearchStartSubjectBodyChange(world, receipt)
    } else if (receipt.action === 'troop_heal') {
      bodyChange = buildTroopHealSubjectBodyChange(runtime, world, receipt)
    } else if (receipt.action === 'world_scout') {
      bodyChange = buildWorldScoutSubjectBodyChange(runtime, world, receipt)
    } else if (receipt.action === 'march_move') {
      bodyChange = buildMarchMoveSubjectBodyChange(runtime, world, receipt)
    } else if (receipt.action === 'garrison_set') {
      bodyChange = buildGarrisonSetSubjectBodyChange(runtime, world, receipt)
    } else if (receipt.action === 'city_siege') {
      bodyChange = buildCitySiegeSubjectBodyChange(runtime, world, receipt)
    } else if (receipt.action === 'rally_launch' || receipt.action === 'rally_join') {
      bodyChange = buildRallySubjectBodyChange(runtime, world, receipt)
    } else if (receipt.action === 'threat_escape') {
      bodyChange = buildThreatEscapeSubjectBodyChange(runtime, receipt)
    } else if (receipt.action === 'alliance_help') {
      bodyChange = buildAllianceHelpSubjectBodyChange(runtime, world, receipt)
    } else if (receipt.action === 'alliance_defense_assign' || receipt.action === 'alliance_defense_batch_assign') {
      bodyChange = buildAllianceDefenseSubjectBodyChange(runtime, world, receipt)
    } else if (receipt.action === 'troop_train') {
      bodyChange = buildTroopTrainSubjectBodyChange(runtime, world, receipt)
    } else if (receipt.action === 'recruit_commander') {
      bodyChange = buildRecruitCommanderSubjectBodyChange(runtime, world, receipt)
    } else if (receipt.action === 'recruit_pool_select') {
      bodyChange = buildRecruitPoolSelectSubjectBodyChange(runtime, receipt)
    } else if (receipt.action === 'formation_assign') {
      bodyChange = buildFormationAssignSubjectBodyChange(runtime, receipt)
    } else if (receipt.action === 'general_focus_set') {
      bodyChange = buildGeneralFocusSetSubjectBodyChange(runtime, receipt)
    } else if (receipt.action === 'tactical_skill_upgrade') {
      bodyChange = buildTacticalSkillUpgradeSubjectBodyChange(runtime, receipt)
    } else if (receipt.action === 'hero_star_upgrade') {
      bodyChange = buildHeroStarUpgradeSubjectBodyChange(runtime, receipt)
    } else if (receipt.action === 'troop_facility_upgrade') {
      bodyChange = buildTroopFacilityUpgradeSubjectBodyChange(runtime, receipt)
    } else if (receipt.action === 'tile_occupy') {
      bodyChange = buildTileOccupyHeroGrowthSubjectBodyChange(runtime, receipt)
    } else if (receipt.action === 'battle_report_read') {
      bodyChange = buildAiPlayerAutonomousReadOnlyRecoverySubjectBodyChange(receipt)
    } else if (receipt.action === 'activity_window_enter') {
      bodyChange = buildAiPlayerAutonomousReadOnlyRecoverySubjectBodyChange(receipt)
    }
    if (!bodyChange) {
      continue
    }
    items.push(attachExecutionReceiptToSubjectBodyChange(bodyChange, receipt))
  }
  for (const bodyChange of buildBattleReportSubjectBodyChanges(runtime, world, battleResults, normalizedLimit - items.length)) {
    if (items.length >= normalizedLimit) {
      break
    }
    items.push(bodyChange)
  }
  for (const bodyChange of buildSaveRecoverySubjectBodyChanges(runtime, normalizedLimit - items.length)) {
    if (items.length >= normalizedLimit) {
      break
    }
    items.push(bodyChange)
  }
  const knownReplayRequestIds = new Set(
    battleResults.items.map((battle) => battle.replayRequestId?.trim()).filter((item): item is string => Boolean(item)),
  )
  for (const bodyChange of buildReplayDeniedSubjectBodyChanges(runtime, knownReplayRequestIds, normalizedLimit - items.length)) {
    if (items.length >= normalizedLimit) {
      break
    }
    items.push(bodyChange)
  }
  const sortedProposals = proposals.slice().sort((left, right) => {
    const leftKey = left.updatedAt ?? left.createdAt
    const rightKey = right.updatedAt ?? right.createdAt
    return rightKey.localeCompare(leftKey)
  })
  for (const proposal of sortedProposals) {
    if (proposal.status !== 'approved' && proposal.status !== 'rejected' && proposal.status !== 'failed') {
      continue
    }
    if (receiptProposalIds.has(proposal.proposalId)) {
      continue
    }
    const approved = proposal.status === 'approved'
    const failed = proposal.status === 'failed'
    const recoveryHint = readRecord(proposal.recoveryHint)
    const proposalArgs = readRecord(proposal.args)
    const proposalAssignments = readRecordArray(proposalArgs.assignments)
    const proposalAssignmentUnitIds = proposalAssignments.length > 0
      ? proposalAssignments.map((assignment) => readString(assignment.unitId)).filter((unitId): unitId is string => Boolean(unitId))
      : readString(proposalArgs.unitId)
        ? [readString(proposalArgs.unitId) as string]
        : undefined
    const proposalAssignmentTargetTileIds = proposalAssignments.length > 0
      ? proposalAssignments.map((assignment) => readString(assignment.targetTileId) ?? readString(assignment.tileId)).filter((targetTileId): targetTileId is string => Boolean(targetTileId))
      : (readString(proposalArgs.targetTileId) ?? readString(proposalArgs.tileId))
        ? [readString(proposalArgs.targetTileId) ?? readString(proposalArgs.tileId) as string]
        : undefined
    const proposalTargetTileId =
      readString(proposalArgs.targetTileId) ??
      readString(proposalArgs.tileId) ??
      readString(proposalArgs.cityId)
    const proposalRegionId = readString(proposalArgs.regionId)
    const proposalAllianceDirective = proposal.action === 'alliance_help' && proposalRegionId
      ? world.alliance.directives[proposalRegionId]
      : undefined
    const proposalAllianceCommander = proposalAllianceDirective
      ? world.alliance.commanders.find((candidate) => candidate.id === proposalAllianceDirective.assignedCommanderId)
      : undefined
    items.push({
      bodyNode: 'human_command_and_obedience',
      action: proposal.action,
      status: approved ? 'approved' : 'failed',
      proposalId: proposal.proposalId,
      observedAt: approved
        ? (proposal.approvedAt ?? proposal.updatedAt)
        : failed
          ? (proposal.executedAt ?? proposal.updatedAt)
          : (proposal.rejectedAt ?? proposal.updatedAt),
      failureCode: approved ? null : (proposal.failureCode ?? proposal.rejectionReason ?? null),
      approvedBy: proposal.approvedBy,
      rejectedBy: proposal.rejectedBy,
      regionId: proposalRegionId,
      unitId: readString(proposalArgs.unitId),
      targetTileId: proposalTargetTileId,
      facilityId: readString(proposalArgs.groupId) ?? readString(proposalArgs.facilityId),
      buildingId: readString(proposalArgs.buildingId),
      affairId: readString(proposalArgs.affairId),
      techId: readString(proposalArgs.techId),
      assignmentUnitIds: proposalAssignmentUnitIds,
      assignmentTargetTileIds: proposalAssignmentTargetTileIds,
      governanceRecoveryFocus: readString(recoveryHint.focus),
      governanceRecoverySummary: readString(recoveryHint.summary),
      governanceRecoveryRecommendedCommand: readString(recoveryHint.recommendedCommand),
      governanceFailureDetail: readString(proposal.failureDetail),
      governanceAttemptedWorldAction: proposal.action === 'alliance_help' ? 'allianceHelp' : undefined,
      allianceCommanderId: readString(proposalAllianceDirective?.assignedCommanderId),
      allianceSupportLevel: readNumber(proposalAllianceDirective?.supportLevel),
      allianceCommanderReadiness: readNumber(proposalAllianceCommander?.readiness),
      allianceCommanderMissing: proposal.action === 'alliance_help' && Boolean(proposalAllianceDirective) && !proposalAllianceCommander,
      sourceBattleReportId: readString(proposalArgs.sourceBattleReportId),
      sourceReplayRequestId: readString(proposalArgs.sourceReplayRequestId),
      recommendedRecoveryCommand: readString(proposalArgs.recommendedRecoveryCommand),
      executionReceiptAvailable: false,
      executionWorldReceiptAvailable: false,
      nextSubjectFocus: 'governance',
      visibleToAi: true,
    })
    if (items.length >= normalizedLimit) {
      break
    }
  }
  return {
    contractId: 'ai_player_subject_recent_body_changes_v1',
    aiPlayerId: runtime.aiPlayerId,
    factionId: runtime.factionId,
    count: items.length,
    items,
  }
}

function normalizeResourceLevel(tile: Tile): number | null {
  const level = Math.round(Number(tile.resourceLevel ?? 0))
  if (!Number.isFinite(level) || level < 1 || level > 9) {
    return null
  }
  return level
}

function isSupportedResourceKind(resourceKind: Tile['resourceKind']): resourceKind is ResourceKind {
  return Boolean(resourceKind && SUPPORTED_RESOURCE_KINDS.has(resourceKind))
}

function addResourceBundles(left: ResourceTransferBundle, right: ResourceTransferBundle): ResourceTransferBundle {
  return {
    food: left.food + right.food,
    wood: left.wood + right.wood,
    stone: left.stone + right.stone,
    iron: left.iron + right.iron,
  }
}

function buildSubjectPendingGovernorTransfersReadModel(params: {
  world: Readonly<WorldState>
  runtime: GovernedAiPlayerRuntimeDetail
}): AiPlayerSubjectEconomyReadModel['pendingGovernorTransfers'] {
  const inbox = params.world.factions[params.runtime.factionId]?.governorResourceInboxes?.[params.runtime.governorPlayerId]
  const items = (inbox?.pendingTransfers ?? [])
    .filter((transfer) => transfer.sourceAiPlayerId === params.runtime.aiPlayerId)
    .map((transfer) => ({
      transferId: transfer.id,
      sourceAiPlayerId: transfer.sourceAiPlayerId,
      sourceFactionId: transfer.sourceFactionId,
      governorPlayerId: transfer.governorPlayerId,
      resources: normalizeResourceBundle(transfer.resources),
      reason: transfer.reason,
      approvedBy: transfer.approvedBy,
      status: transfer.status,
      createdTick: transfer.createdTick,
    }))
  const totalPendingResources = items.reduce<ResourceTransferBundle>(
    (total, item) => addResourceBundles(total, item.resources),
    { food: 0, wood: 0, stone: 0, iron: 0 },
  )
  return {
    governorPlayerId: params.runtime.governorPlayerId,
    count: items.length,
    totalPendingResources,
    items,
  }
}

function buildSubjectSettledGovernorTransfersReadModel(params: {
  world: Readonly<WorldState>
  runtime: GovernedAiPlayerRuntimeDetail
}): AiPlayerSubjectEconomyReadModel['settledGovernorTransfers'] {
  const settlements = params.world.factions[params.runtime.factionId]?.governorResourceSettlements?.[params.runtime.governorPlayerId] ?? []
  const items = settlements
    .filter((settlement) => settlement.sourceAiPlayerId === params.runtime.aiPlayerId)
    .slice(-8)
    .map((settlement) => ({
      transferId: settlement.id,
      sourceAiPlayerId: settlement.sourceAiPlayerId,
      sourceFactionId: settlement.sourceFactionId,
      governorPlayerId: settlement.governorPlayerId,
      resources: normalizeResourceBundle(settlement.resources),
      reason: settlement.reason,
      approvedBy: settlement.approvedBy,
      status: settlement.status,
      createdTick: settlement.createdTick,
      claimedTick: settlement.claimedTick,
    }))
  const totalSettledResources = items.reduce<ResourceTransferBundle>(
    (total, item) => addResourceBundles(total, item.resources),
    { food: 0, wood: 0, stone: 0, iron: 0 },
  )
  return {
    governorPlayerId: params.runtime.governorPlayerId,
    count: items.length,
    totalSettledResources,
    items,
  }
}

function buildSubjectEconomyReadModel(params: {
  world: Readonly<WorldState>
  runtime: GovernedAiPlayerRuntimeDetail
  resources: AiPlayerDevelopmentPlanResourceSnapshot
  units: AiPlayerDevelopmentPlanUnit[]
  candidateTiles: AiPlayerDevelopmentPlanCandidateTile[]
}): AiPlayerSubjectEconomyReadModel {
  const faction = params.world.factions[params.runtime.factionId]
  const gatherClaims = faction?.aiResourceGatherClaims ?? {}
  const relationByTileId = new Map<string, AiPlayerSubjectResourceTileEconomy['relationToAiPlayer']>()

  for (const unit of params.units) {
    relationByTileId.set(unit.tileId, 'unit_present')
  }
  for (const claim of Object.values(gatherClaims)) {
    if (claim.aiPlayerId === params.runtime.aiPlayerId) {
      relationByTileId.set(claim.tileId, 'gathered_by_ai')
    }
  }
  for (const tile of params.candidateTiles) {
    if (tile.risk === 'owned_resource') {
      relationByTileId.set(tile.tileId, relationByTileId.get(tile.tileId) ?? 'candidate_owned_resource')
    }
  }

  const ownedResourceTiles: AiPlayerSubjectResourceTileEconomy[] = []
  let ownedResourceYieldPerTick: ResourceTransferBundle = { food: 0, wood: 0, stone: 0, iron: 0 }
  let resourceEconomyModelVersion: string | null = null
  for (const tile of params.world.map.tiles) {
    if (ownedResourceTiles.length >= 12) {
      break
    }
    if (tile.type !== 'resource' || tile.owner !== params.runtime.factionId || !relationByTileId.has(tile.id)) {
      continue
    }
    if (!isSupportedResourceKind(tile.resourceKind)) {
      continue
    }
    const resourceLevel = normalizeResourceLevel(tile)
    if (!resourceLevel) {
      continue
    }
    const economy = buildResourceTileEconomyReadModel({
      resourceKind: tile.resourceKind,
      resourceLevel,
    })
    resourceEconomyModelVersion = resourceEconomyModelVersion ?? economy.resourceEconomyModelVersion
    ownedResourceYieldPerTick = addResourceBundles(
      ownedResourceYieldPerTick,
      resourceBundleForAiGather(tile.resourceKind, economy.ongoingYield.yieldPerTick),
    )
    const claim = gatherClaims[tile.id]
    const gatheredByThisAi = claim?.aiPlayerId === params.runtime.aiPlayerId
    ownedResourceTiles.push({
      tileId: tile.id,
      name: tile.name,
      resourceKind: tile.resourceKind,
      resourceLevel,
      owner: tile.owner,
      occupiedByFaction: true,
      relationToAiPlayer: relationByTileId.get(tile.id) ?? 'candidate_owned_resource',
      ongoingYield: economy.ongoingYield,
      captureReward: economy.captureReward,
      recommendedPower: economy.recommendedPower,
      oneTimeGather: {
        available: !gatheredByThisAi,
        gathered: gatheredByThisAi,
        claimId: gatheredByThisAi ? claim.id : null,
        resources: resourceBundleForAiGather(
          tile.resourceKind,
          resourceLevel * AI_SUBJECT_RESOURCE_GATHER_AMOUNT_PER_LEVEL,
        ),
      },
    })
  }

  return {
    resourceEconomyModelVersion,
    account: params.resources.aiAccount,
    accountUpdatedTick: params.resources.aiAccountUpdatedTick,
    ownedResourceYieldPerTick,
    ownedResourceTiles,
    pendingGovernorTransfers: buildSubjectPendingGovernorTransfersReadModel({
      world: params.world,
      runtime: params.runtime,
    }),
    settledGovernorTransfers: buildSubjectSettledGovernorTransfersReadModel({
      world: params.world,
      runtime: params.runtime,
    }),
    limits: {
      ownedResourceTileLimit: 12,
      worldScope: 'ai_relevant_owned_resource_tiles_only',
      autoTickYieldToAiAccount: false,
      autoTickYieldPolicyReason: 'occupied_resource_yield_settles_to_faction_resources',
      aiSubaccountEarningAction: 'resource_gather',
      aiSubaccountEarningScope: 'one_time_gather_claim_not_automatic_tick_yield',
    },
  }
}

export function buildAiPlayerSubjectReadModel(
  runtime: GovernedAiPlayerRuntimeDetail,
  options: { targetDevelopmentPoints?: number; receiptLimit?: number; battleResultLimit?: number } = {},
): AiPlayerSubjectReadModel {
  const developmentPlan = buildAiPlayerDevelopmentPlan(runtime, {
    targetDevelopmentPoints: options.targetDevelopmentPoints,
  })
  const world = getWorldStateReadonly()
  const placement = runtime.homeCityPlacement
  const receiptLimit = Math.max(1, Math.min(50, Math.trunc(Number(options.receiptLimit ?? 12) || 12)))
  const battleResultLimit = Math.max(1, Math.min(20, Math.trunc(Number(options.battleResultLimit ?? 5) || 5)))
  const nextLandCandidate = developmentPlan.candidateTiles[0] ?? null
  const recentBattleResults = buildAiPlayerBattleReportReadModel(runtime, battleResultLimit)
  const recentReceipts = listAiPlayerActionReceipts(runtime.aiPlayerId, receiptLimit)
  const recentProposals = [
    ...listAiPlayerActionProposals({
      aiPlayerId: runtime.aiPlayerId,
      status: 'approved',
      limit: receiptLimit,
    }),
    ...listAiPlayerActionProposals({
      aiPlayerId: runtime.aiPlayerId,
      status: 'rejected',
      limit: receiptLimit,
    }),
    ...listAiPlayerActionProposals({
      aiPlayerId: runtime.aiPlayerId,
      status: 'failed',
      limit: receiptLimit,
    }),
  ]
  const economy = buildSubjectEconomyReadModel({
    world,
    runtime,
    resources: developmentPlan.resources,
    units: developmentPlan.units,
    candidateTiles: developmentPlan.candidateTiles,
  })
  const baseRecentBodyChanges = buildSubjectRecentBodyChangesReadModel(
    runtime,
    world,
    recentReceipts,
    recentBattleResults,
    recentProposals,
    receiptLimit,
  )
  const recentHistoryAnchors = buildSubjectHistoryAnchorsReadModel(runtime, baseRecentBodyChanges, receiptLimit)
  const recentRecoveryAnchors = buildSubjectRecoveryAnchorsReadModel(runtime, recentBattleResults)
  const recentBodyChanges = attachRecoveryAnchorsToSubjectBodyChanges(
    attachHistoryAnchorsToSubjectBodyChanges(baseRecentBodyChanges, recentHistoryAnchors),
    recentRecoveryAnchors,
  )
  const recentVisibleActivities = buildAiPlayerVisibleActivityFeedFromHistoryAnchors({
    aiPlayerId: runtime.aiPlayerId,
    factionId: runtime.factionId,
    actorName: runtime.displayName,
    anchors: recentHistoryAnchors.items,
    limit: 6,
  })

  return {
    schemaVersion: 'ai_player_subject_read_model_v1',
    readOnly: true,
    authorityBoundary: buildAiPlayerSubjectAuthorityBoundaryReadModel(),
    identity: {
      aiPlayerId: runtime.aiPlayerId,
      displayName: runtime.displayName,
      governorPlayerId: runtime.governorPlayerId,
      factionId: runtime.factionId,
      enabled: runtime.enabled,
      paused: runtime.paused,
    },
    homeCity: {
      bindingStatus: runtime.homeCityBindingStatus,
      cityId: runtime.homeCityId ?? placement?.cityId ?? null,
      centerTileId: runtime.homeCityTileId ?? placement?.centerTileId ?? null,
      footprintId: 'ai_city_3x3_initial',
      footprintSize: '3x3',
      footprintTileIds: placement?.footprintTileIds.slice() ?? [],
      entryPath: runtime.listCard.homeCityEntryPath,
      candidatePath: runtime.listCard.homeCityCandidatePath,
    },
    resources: developmentPlan.resources,
    economy,
    units: developmentPlan.units,
    landCandidates: developmentPlan.candidateTiles,
    nextLand: {
      status: nextLandCandidate ? 'ready' : 'unavailable',
      candidate: nextLandCandidate,
      unavailableReason: nextLandCandidate ? null : 'no_current_land_candidate',
    },
    recommendedActions: developmentPlan.candidateActions,
    recentBodyChanges,
    recentBattleResults,
    recentHistoryAnchors,
    recentRecoveryAnchors,
    recentVisibleActivities,
    recentReceipts,
    source: {
      developmentPlanIncluded: true,
      mutationAllowed: false,
      supportOnlySurfaces: [
        'ai_hub',
        'chat',
        'voice',
        'proposal',
        'receipt',
        'history',
        'world_summary',
      ],
    },
  }
}
