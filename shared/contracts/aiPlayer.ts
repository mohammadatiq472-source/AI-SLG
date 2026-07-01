import type {
  AiResourceTransferPolicyState,
  AiResourceTransferQuotaState,
  FactionAiQuota,
  ResourceTransferBundle,
  WorldActionReceipt,
} from './game/world'
import type { BattleOutcomeRecord, PlayerWorldTimelineSeverity } from './game/history'
import type {
  AiRuntimeFailureAggregation,
  AiRuntimeFailureRecord,
  AiRuntimeLockConflictAggregation,
  AiRuntimeObservabilityLock,
} from './game/observability'
import type { CityTechTrackId } from './game/meta'
import type { SessionAutonomyLevel, SessionControlMode } from './game/session'

export type AiPlayerActionCategory =
  | 'governance'
  | 'city'
  | 'world'
  | 'alliance'
  | 'economy'
  | 'activity'
  | 'intel'

export type AiPlayerActionRiskLevel = 'low' | 'medium' | 'high'

export type AiPlayerProposalSource =
  | 'llm'
  | 'rule'
  | 'human'
  | 'replay'
  | 'mcp'
  | 'cli'

export type AiPlayerProposalStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'failed'

export type AiPlayerRecoveryHint = {
  summary: string
  recommendedCommand?: string
  focus?: 'approval' | 'resources' | 'cooldown' | 'inbox' | 'retry' | 'none'
}

export type AiPlayerActionType =
  | 'ai_player_pause'
  | 'ai_player_resume'
  | 'ai_player_set_control_mode'
  | 'ai_player_set_action_whitelist'
  | 'ai_player_set_budget'
  | 'ai_player_set_schedule_window'
  | 'ai_player_assign_governor'
  | 'ai_player_transfer_governor'
  | 'ai_player_takeover'
  | 'ai_player_release_takeover'
  | 'city_upgrade'
  | 'building_upgrade'
  | 'tactical_skill_upgrade'
  | 'hero_level_upgrade'
  | 'hero_star_upgrade'
  | 'research_start'
  | 'troop_train'
  | 'troop_facility_upgrade'
  | 'recruit_pool_select'
  | 'troop_heal'
  | 'queue_fill_idle_slot'
  | 'speedup_use'
  | 'resource_item_use'
  | 'boost_item_use'
  | 'recruit_commander'
  | 'world_scout'
  | 'march_move'
  | 'march_recall'
  | 'resource_gather'
  | 'garrison_set'
  | 'tile_occupy'
  | 'tile_abandon'
  | 'city_siege'
  | 'wild_attack'
  | 'teleport_use'
  | 'general_focus_set'
  | 'formation_assign'
  | 'threat_escape'
  | 'alliance_help'
  | 'alliance_defense_assign'
  | 'alliance_defense_batch_assign'
  | 'resource_transfer_to_governor'
  | 'overseas_route_open'
  | 'maritime_patrol_scout'
  | 'maritime_patrol_intercept'
  | 'alliance_donate'
  | 'rally_join'
  | 'rally_launch'
  | 'alliance_relocate'
  | 'alliance_task_execute'
  | 'alliance_mail_ack'
  | 'daily_task_execute'
  | 'reward_claim'
  | 'event_task_execute'
  | 'event_priority_sort'
  | 'stamina_spend'
  | 'activity_window_enter'
  | 'battle_report_read'
  | 'failure_reason_summarize'
  | 'enemy_pressure_estimate'
  | 'threat_alert_emit'
  | 'next_step_propose'
  | 'human_escalation_request'

export type AiPlayerActionCatalogEntry = {
  action: AiPlayerActionType
  category: AiPlayerActionCategory
  label: string
  riskLevel: AiPlayerActionRiskLevel
  requiresApprovalByDefault: boolean
  executableInV1: boolean
  mappedWorldAction?: string
  internalOnly?: boolean
  notes?: string
}

export type AiPlayerExecutableV1ActionType =
  | 'city_upgrade'
  | 'building_upgrade'
  | 'tactical_skill_upgrade'
  | 'hero_star_upgrade'
  | 'queue_fill_idle_slot'
  | 'research_start'
  | 'troop_train'
  | 'troop_heal'
  | 'troop_facility_upgrade'
  | 'recruit_pool_select'
  | 'recruit_commander'
  | 'world_scout'
  | 'march_move'
  | 'garrison_set'
  | 'resource_gather'
  | 'tile_occupy'
  | 'tile_abandon'
  | 'city_siege'
  | 'general_focus_set'
  | 'formation_assign'
  | 'threat_escape'
  | 'alliance_help'
  | 'alliance_defense_assign'
  | 'alliance_defense_batch_assign'
  | 'rally_join'
  | 'rally_launch'
  | 'resource_transfer_to_governor'
  | 'overseas_route_open'
  | 'maritime_patrol_scout'
  | 'maritime_patrol_intercept'
  | 'reward_claim'

export type AiPlayerEmptyArgs = Record<string, never>

export type AiPlayerBuildingGroupId = 'market' | 'tax' | 'policy'

export type AiPlayerBuildingId =
  | 'market_plaza'
  | 'tax_office'
  | 'policy_hall'
  | 'recruit_policy_board'

export type AiPlayerQueueAffairGroupId = AiPlayerBuildingGroupId

export type AiPlayerCityUpgradeArgs = {
  tileId?: string
}

export type AiPlayerBuildingUpgradeArgs = {
  cityId?: string
  groupId?: AiPlayerBuildingGroupId
  buildingId?: AiPlayerBuildingId
}

export type AiPlayerTacticalSkillUpgradeArgs = {
  heroId?: string
  skillId?: string
}

export type AiPlayerHeroGrowthArgs = {
  heroId?: string
}

export type AiPlayerQueueFillIdleSlotArgs = {
  cityId?: string
  groupId?: AiPlayerQueueAffairGroupId
}

export type AiPlayerResearchStartArgs = {
  tileId?: string
  techId?: CityTechTrackId
}

export type AiPlayerTroopTrainArgs = {
  heroId?: string
  coHeroIds?: string[]
  tileId?: string
  aiPlayerId?: string
  teamId?: string
  teamIndex?: number
}

export type AiPlayerTroopFacilityId =
  | 'training_ground'
  | 'recruit_station'
  | 'command_hall'
  | 'support_structures'

export type AiPlayerTroopFacilityBuildingId =
  | 'training_ground_base'
  | 'training_drill'
  | 'recruit_station_base'
  | 'reserve_camp'
  | 'command_hall_base'
  | 'frontline_slot'
  | 'supply_camp'
  | 'signal_tower'

export type AiPlayerRecruitPoolId =
  | 'pool_standard'
  | 'pool_season'
  | 'pool_limited'

export type AiPlayerGeneralTacticId = 'assault' | 'guard' | 'logistics'
export type AiPlayerThreatEscapeMode = 'recover' | 'redeploy'

export type AiPlayerRecruitCommanderArgs = {
  poolId?: AiPlayerRecruitPoolId
  count?: number
}

export type AiPlayerTroopFacilityUpgradeArgs = {
  unitId?: string
  facilityId?: AiPlayerTroopFacilityId
  buildingId?: AiPlayerTroopFacilityBuildingId
}

export type AiPlayerRecruitPoolSelectArgs = {
  poolId?: AiPlayerRecruitPoolId
}

export type AiPlayerWorldScoutArgs = {
  unitId?: string
  targetTileId?: string
  sourceBattleReportId?: string
  sourceReplayRequestId?: string
  recommendedRecoveryCommand?: string
}

export type AiPlayerMarchMoveArgs = {
  unitId?: string
  targetTileId?: string
  sourceBattleReportId?: string
  sourceReplayRequestId?: string
  recommendedRecoveryCommand?: string
}

export type AiPlayerGarrisonSetArgs = {
  unitId?: string
  targetTileId?: string
  summary?: string
  sourceBattleReportId?: string
  sourceReplayRequestId?: string
  recommendedRecoveryCommand?: string
}

export type AiPlayerGeneralFocusSetArgs = {
  heroId?: string
  sourceBattleReportId?: string
  sourceReplayRequestId?: string
  recommendedRecoveryCommand?: string
}

export type AiPlayerFormationAssignArgs = {
  heroId?: string
  tacticId?: AiPlayerGeneralTacticId
  sourceBattleReportId?: string
  sourceReplayRequestId?: string
  recommendedRecoveryCommand?: string
}

export type AiPlayerThreatEscapeArgs = {
  mode?: AiPlayerThreatEscapeMode
  sourceBattleReportId?: string
  sourceReplayRequestId?: string
  recommendedRecoveryCommand?: string
}

export type AiPlayerAllianceHelpArgs = {
  regionId?: string
  sourceBattleReportId?: string
  sourceReplayRequestId?: string
  recommendedRecoveryCommand?: string
}

export type AiPlayerResourceGatherArgs = {
  unitId: string
  tileId: string
}

export type AiPlayerTileOccupyArgs = {
  unitId?: string
  tileId?: string
}

export type AiPlayerTileAbandonArgs = {
  tileId: string
}

export type AiPlayerCitySiegeArgs = {
  unitId?: string
  targetTileId?: string
  sourceBattleReportId?: string
  sourceReplayRequestId?: string
  recommendedRecoveryCommand?: string
}

export type AiPlayerTroopHealArgs = {
  unitId?: string
  sourceBattleReportId?: string
  sourceReplayRequestId?: string
  recommendedRecoveryCommand?: string
}

export type AiPlayerRallyArgs = {
  unitId?: string
  regionId?: string
  targetTileId?: string
  sourceBattleReportId?: string
  sourceReplayRequestId?: string
  recommendedRecoveryCommand?: string
}

export type AiPlayerAllianceDefenseAssignArgs = {
  unitId?: string
  regionId?: string
  targetTileId?: string
  summary?: string
  sourceBattleReportId?: string
  sourceReplayRequestId?: string
  recommendedRecoveryCommand?: string
}

export type AiPlayerAllianceDefenseBatchAssignment = {
  unitId?: string
  regionId?: string
  targetTileId: string
  summary?: string
}

export type AiPlayerAllianceDefenseBatchAssignArgs = {
  assignments: AiPlayerAllianceDefenseBatchAssignment[]
  summary?: string
  sourceBattleReportId?: string
  sourceReplayRequestId?: string
  recommendedRecoveryCommand?: string
}

export type AiPlayerResourceTransferToGovernorArgs = {
  resources: Partial<ResourceTransferBundle>
}

export type AiPlayerRewardClaimArgs = {
  rewardId?: string
}

export type AiPlayerOverseasRouteOpenArgs = {
  sourceDockId?: string
  overseasContactId?: string
}

export type AiPlayerMaritimePatrolScoutArgs = {
  routeId?: string
  sourceDockId?: string
  overseasContactId?: string
}

export type AiPlayerMaritimePatrolInterceptArgs = {
  routeId?: string
  sourceDockId?: string
  overseasContactId?: string
  attackerVesselType?: string
  defenderVesselType?: string
}

type AiPlayerActionArgsByType = {
  city_upgrade: AiPlayerCityUpgradeArgs
  building_upgrade: AiPlayerBuildingUpgradeArgs
  tactical_skill_upgrade: AiPlayerTacticalSkillUpgradeArgs
  hero_star_upgrade: AiPlayerHeroGrowthArgs
  queue_fill_idle_slot: AiPlayerQueueFillIdleSlotArgs
  research_start: AiPlayerResearchStartArgs
  troop_train: AiPlayerTroopTrainArgs
  troop_heal: AiPlayerTroopHealArgs
  troop_facility_upgrade: AiPlayerTroopFacilityUpgradeArgs
  recruit_pool_select: AiPlayerRecruitPoolSelectArgs
  recruit_commander: AiPlayerRecruitCommanderArgs
  world_scout: AiPlayerWorldScoutArgs
  march_move: AiPlayerMarchMoveArgs
  garrison_set: AiPlayerGarrisonSetArgs
  resource_gather: AiPlayerResourceGatherArgs
  tile_occupy: AiPlayerTileOccupyArgs
  tile_abandon: AiPlayerTileAbandonArgs
  city_siege: AiPlayerCitySiegeArgs
  general_focus_set: AiPlayerGeneralFocusSetArgs
  formation_assign: AiPlayerFormationAssignArgs
  threat_escape: AiPlayerThreatEscapeArgs
  alliance_help: AiPlayerAllianceHelpArgs
  alliance_defense_assign: AiPlayerAllianceDefenseAssignArgs
  alliance_defense_batch_assign: AiPlayerAllianceDefenseBatchAssignArgs
  rally_join: AiPlayerRallyArgs
  rally_launch: AiPlayerRallyArgs
  resource_transfer_to_governor: AiPlayerResourceTransferToGovernorArgs
  overseas_route_open: AiPlayerOverseasRouteOpenArgs
  maritime_patrol_scout: AiPlayerMaritimePatrolScoutArgs
  maritime_patrol_intercept: AiPlayerMaritimePatrolInterceptArgs
  reward_claim: AiPlayerRewardClaimArgs
} & {
  [K in Exclude<AiPlayerActionType, AiPlayerExecutableV1ActionType>]: AiPlayerEmptyArgs
}

export type AiPlayerActionArgs<T extends AiPlayerActionType = AiPlayerActionType> = AiPlayerActionArgsByType[T]

export type AiPlayerApprovalPolicy = {
  autoApproveLowRisk: boolean
  autoApproveMediumRisk: boolean
  requireHumanApprovalForHighRisk: boolean
}

export type AiPlayerBudgetPolicy = {
  maxPendingProposals: number
  maxExecutableActionsPerTick: number
  maxExecutableActionsPerHour: number
  allowHighRiskActions: boolean
}

export type AiPlayerRuntimePolicy = {
  allowLlmProposals: boolean
  allowRuleProposals: boolean
  allowMcpExecution: boolean
  allowCliExecution: boolean
  allowAutonomousCombatDailySummaryChatReports: boolean
  allowAutonomousCombatWarEventChatReports: boolean
  allowAutonomousCombatVoiceReports: boolean
}

export type AiPlayerHomeCityBindingStatus = 'unbound' | 'bound'

export type AiPlayerHomeCityFootprintId = 'ai_city_3x3_initial'

export type AiPlayerHomeCityPlacement = {
  cityId: string
  centerTileId: string
  centerX: number
  centerY: number
  footprintId: AiPlayerHomeCityFootprintId
  footprintSize: '3x3'
  footprintTileIds: string[]
  anchorPolicy: 'center_cell'
  source: 'governor_selected'
  governorHomeTileId: string
  radiusLimit: number
  distanceFromGovernorHome: number
  boundAt: string
  boundByGovernorPlayerId: string
}

export type AiPlayerHomeCityCandidate = {
  centerTileId: string
  centerTileName: string
  centerX: number
  centerY: number
  terrain: string
  owner: string
  governorHomeTileId: string
  distanceFromGovernorHome: number
  footprintId: AiPlayerHomeCityFootprintId
  footprintSize: '3x3'
  footprintTileIds: string[]
  eligible: boolean
  blockedReason?: string
}

export type AiPlayerContextDocumentKind = 'identity' | 'memory' | 'skill' | 'instruction'

export type AiPlayerContextDocument = {
  documentId: string
  kind: AiPlayerContextDocumentKind
  title: string
  content: string
  sourceFileName?: string
  contentBytes: number
  createdAt: string
  updatedAt: string
  updatedBy: string
}

export type GovernedAiPlayer = {
  aiPlayerId: string
  displayName: string
  avatarId?: string
  avatarImagePath?: string
  governorPlayerId: string
  factionId: string
  enabled: boolean
  paused: boolean
  homeCityBindingStatus: AiPlayerHomeCityBindingStatus
  homeCityId?: string
  homeCityTileId?: string
  homeCityPlacement?: AiPlayerHomeCityPlacement
  actionWhitelist: AiPlayerActionType[]
  approvalPolicy: AiPlayerApprovalPolicy
  budgetPolicy: AiPlayerBudgetPolicy
  runtimePolicy: AiPlayerRuntimePolicy
  contextDocuments: AiPlayerContextDocument[]
  createdAt: string
  updatedAt: string
}

export type AiPlayerBudgetSnapshot = {
  actionPointsRemaining: number
  foodRemaining: number
  aiQuota: FactionAiQuota | null
}

export type AiPlayerResourceTransferRuntime = {
  configuredPolicy: AiResourceTransferPolicyState | null
  effectivePolicy: Required<AiResourceTransferPolicyState>
  quota: AiResourceTransferQuotaState | null
  remainingQuotaTotal: number
  cooldownRemainingTicks: number
  windowRemainingTicks: number
  canTransferNow: boolean
  blockedBy: 'daily_quota_exceeded' | 'transfer_cooldown_active' | null
}

export type AiPlayerBattleReportPerspective = 'attacker' | 'nearby' | 'faction_history'

export type AiPlayerBattleReportSeverity = 'low' | 'medium' | 'high'

export type AiPlayerBattleReportReadItem = BattleOutcomeRecord & {
  reportId: string
  perspective: AiPlayerBattleReportPerspective
  assignedUnitInvolved: boolean
  ownLoss: number | null
  enemyLoss: number | null
  severity: AiPlayerBattleReportSeverity
  nextStepSuggestion: string
}

export type AiPlayerBattleReportReadModel = {
  aiPlayerId: string
  factionId: string
  unitIds: string[]
  limit: number
  count: number
  items: AiPlayerBattleReportReadItem[]
  generatedAt: string
}

export type AiPlayerDevelopmentPlanGoal = {
  kind: 'development_points'
  targetDevelopmentPoints: number
  currentDevelopmentPoints: number
  remainingDevelopmentPoints: number
  summary: string
}

export type AiPlayerDevelopmentPlanResourceSnapshot = {
  faction: ResourceTransferBundle & {
    actionPoints: number
    copper: number
  }
  aiAccount: ResourceTransferBundle
  aiAccountUpdatedTick?: number
}

export type AiPlayerDevelopmentPlanUnit = {
  unitId: string
  name: string
  tileId: string
  status: string
  strength: number
  mobility: number
  supply: number
  heroId: string
  heroName: string
  heroLevel: number
  heroStarLevel?: number
  heroTroopType: string
  teamId?: string
  teamIndex?: number
  coHeroes: Array<{
    heroId: string
    heroName: string
    heroLevel: number
    heroStarLevel?: number
    heroTroopType: string
  }>
  formation: {
    teamId?: string
    teamIndex?: number
    slots: Array<{
      role: string
      heroId: string
      heroName: string
      troopType: string
      visualType: string
    }>
  }
  aiPlayerOwned: boolean
  currentTask?: string
  neighborTileIds: string[]
}

export type AiPlayerDevelopmentPlanTileRisk =
  | 'owned_resource'
  | 'safe_neighbor'
  | 'enemy_pressure'
  | 'contested'
  | 'unknown'

export type AiPlayerDevelopmentPlanCandidateTile = {
  tileId: string
  name: string
  type: string
  owner: string
  resourceKind?: string
  resourceLevel?: number
  enemyPressure: number
  moveCost: number
  distance: number
  adjacentToUnitId?: string
  risk: AiPlayerDevelopmentPlanTileRisk
  recommendedAction?: AiPlayerExecutableV1ActionType
  args?: Record<string, unknown>
  reason: string
}

export type AiPlayerDevelopmentPlanActionReadiness =
  | 'ready'
  | 'needs_target'
  | 'blocked'
  | 'information_only'

export type AiPlayerDevelopmentPlanCandidateAction = {
  action: AiPlayerActionType
  label: string
  executableInV1: boolean
  readiness: AiPlayerDevelopmentPlanActionReadiness
  riskLevel: AiPlayerActionRiskLevel
  mappedWorldAction?: string
  args?: Record<string, unknown>
  proposalArgs?: Record<string, unknown>
  proposalReason?: string
  priorityScore?: number
  priorityReason?: string
  targetUnitId?: string
  targetTileId?: string
  reason: string
  blockers: string[]
}

export type AiPlayerDevelopmentPlanRiskItem = {
  code: string
  severity: 'info' | 'warning' | 'blocker'
  action?: AiPlayerActionType
  title: string
  detail: string
  nextStep: string
}

export type AiPlayerDevelopmentPlanLoopStep = {
  order: number
  action: AiPlayerActionType
  label: string
  readiness: AiPlayerDevelopmentPlanActionReadiness
  summary: string
  nextWhen: string
  blockers: string[]
}

export type AiPlayerDevelopmentPlan = {
  ok: true
  aiPlayerId: string
  factionId: string
  governorPlayerId: string
  tick: number
  worldVersion: number
  generatedAt: string
  goal: AiPlayerDevelopmentPlanGoal
  resources: AiPlayerDevelopmentPlanResourceSnapshot
  units: AiPlayerDevelopmentPlanUnit[]
  candidateTiles: AiPlayerDevelopmentPlanCandidateTile[]
  candidateActions: AiPlayerDevelopmentPlanCandidateAction[]
  recommendedLoop: AiPlayerDevelopmentPlanLoopStep[]
  riskItems: AiPlayerDevelopmentPlanRiskItem[]
}

export type AiPlayerDevelopmentPlanResponse =
  | AiPlayerDevelopmentPlan
  | {
    ok: false
    error: string
  }

export type AiPlayerAutonomousPersonalReport = {
  reportId: string
  ownerPlayerId: string
  actorType: 'ai_player'
  aiPlayerId: string
  factionId: string
  category: 'development' | 'combat'
  action: AiPlayerActionType
  title: string
  summary: string
  result: string
  relatedProposalId: string
  relatedReceiptProposalId: string
  createdAt: string
}

export type AiPlayerExecutionTraceSourceKind = 'autonomous_development' | 'autonomous_combat' | 'governed_proposal'

export type AiPlayerVisibleActivityJumpTarget = {
  surface: 'world_map'
  targetId: string
  label: string
}

export type AiPlayerVisibleActivitySourceRef = {
  visibility: 'internal_link_only'
  visible: false
  worldEventId?: string
  proposalId?: string
  requestId?: string
}

export type AiPlayerVisibleActivityItem = {
  activityEventId: string
  actorType: 'ai_player'
  actorId: string
  actorName: string
  intentLabel: string
  reasonLabel: string
  priority: number
  sequence: number
  turn?: number
  occurredAt: string
  title: string
  summary: string
  resultLabel: string
  severity: PlayerWorldTimelineSeverity
  createdAt: string
  mapTargetTileId?: string
  jumpTarget?: AiPlayerVisibleActivityJumpTarget
  sourceRef: AiPlayerVisibleActivitySourceRef
}

export type AiPlayerVisibleActivitySortOrder = {
  primary: 'priority_desc'
  secondary: 'turn_desc'
  tertiary: 'sequence_desc'
  fallback: 'occurredAt_desc'
}

export type AiPlayerVisibleActivityAggregateGroup = {
  groupId: string
  actorId: string
  actorName: string
  intentLabel: string
  activityCount: number
  latestTurn?: number
  latestOccurredAt: string
  priority: number
  mapTargetTileIds: string[]
  activityEventIds: string[]
}

export type AiPlayerVisibleActivityMapTargetQueueItem = {
  queueId: string
  activityEventId: string
  actorId: string
  actorName: string
  intentLabel: string
  priority: number
  sequence: number
  occurredAt: string
  mapTargetTileId: string
  jumpTarget: AiPlayerVisibleActivityJumpTarget
  sourceRef: AiPlayerVisibleActivitySourceRef
}

export type AiPlayerVisibleActivityFeedReadModel = {
  contractId: 'ai_player_visible_activity_feed_v1'
  aiPlayerId: string
  factionId: string
  count: number
  sortOrder: AiPlayerVisibleActivitySortOrder
  aggregateGroups: AiPlayerVisibleActivityAggregateGroup[]
  mapTargetQueue: AiPlayerVisibleActivityMapTargetQueueItem[]
  items: AiPlayerVisibleActivityItem[]
}

export type AiPlayerExecutionTracePhase = 'completed' | 'failed' | 'skipped'

export type AiPlayerExecutionTraceMarkerKind = 'active' | 'completed' | 'failed' | 'skipped'

export type AiPlayerExecutionTraceMarker = {
  kind: AiPlayerExecutionTraceMarkerKind
  tileId?: string
  label: string
}

export type AiPlayerExecutionTraceItem = {
  traceId: string
  visibility: 'player'
  aiPlayerId: string
  ownerPlayerId: string
  factionId: string
  sourceKind: AiPlayerExecutionTraceSourceKind
  phase: AiPlayerExecutionTracePhase
  action: AiPlayerActionType
  title: string
  summary: string
  result: string
  currentTaskText: string
  createdAt: string
  reportId: string
  unitId?: string
  targetTileId?: string
  marker?: AiPlayerExecutionTraceMarker
}

export type AiPlayerExecutionTraceResponse =
  | {
    ok: true
    aiPlayerId: string
    ownerPlayerId: string
    items: AiPlayerExecutionTraceItem[]
    count: number
  }
  | {
    ok: false
    error: string
  }

export type AiPlayerProposalStats = {
  pendingApprovalCount: number
  approvedCount: number
  rejectedCount: number
  executedCount: number
  failedCount: number
}

export type AiPlayerListCardStatusDot = 'green' | 'yellow' | 'red' | 'gray'

export type AiPlayerListCardStatusReason =
  | 'active'
  | 'pending_proposals'
  | 'runtime_failure'
  | 'inactive'

export type AiPlayerListCardRuntimeFailureReceipt = {
  proposalId: string
  action: AiPlayerActionType
  failureCode: string
  observedAt: string
  recoveryHint?: AiPlayerRecoveryHint
}

export type AiPlayerListCardReadModel = {
  aiPlayerId: string
  displayName: string
  avatarId?: string
  avatarImagePath?: string
  statusDot: AiPlayerListCardStatusDot
  statusReason: AiPlayerListCardStatusReason
  actionableProposalCount: number
  playerRuntimeLastError: string | null
  runtimeFailureReceipt?: AiPlayerListCardRuntimeFailureReceipt
  viewActionId: string
  observedWorldPath: string
  homeCityBindingStatus: AiPlayerHomeCityBindingStatus
  homeCityId?: string
  homeCityTileId?: string
  homeCityEntryPath: string
  homeCityCandidatePath: string
}

export type AiPlayerListReadModelSummary = {
  count: number
  statusDotCounts: Record<AiPlayerListCardStatusDot, number>
  statusReasonCounts: Record<AiPlayerListCardStatusReason, number>
  actionableProposalCount: number
  pendingApprovalCount: number
  runtimeFailureCount: number
}

export type AiPlayerGovernancePersistHealth = {
  path: string
  enabled: boolean
  loaded: boolean
  playerCount: number
  pausedPlayerCount: number
  disabledPlayerCount: number
  proposalCount: number
  pendingProposalCount: number
  receiptCount: number
  persistDirty: boolean
  persistInFlight: boolean
  persistSuccessCount: number
  persistFailureCount: number
  lastPersistAt: number | null
  lastPersistErrorAt: number | null
  corruptQuarantineCount: number
  lastCorruptQuarantineAt: number | null
  restoredPlayerCount: number
  restoredProposalCount: number
  restoredReceiptCount: number
  lastRestoreAt: number | null
  persistVersion: number
}

export type AiPlayerAdvanceTickPhaseSummary = {
  phase: string
  durationMs: number
}

export type AiPlayerAdvanceTickSubphaseSummary = {
  phase: string
  subphase: string
  durationMs: number
}

export type AiPlayerRuntimeObservabilitySummary = {
  generatedAt: string
  factionId: string
  lock: AiRuntimeObservabilityLock
  lastFailure?: AiRuntimeFailureRecord
  recentFailures: AiRuntimeFailureAggregation
  recentLockConflicts: AiRuntimeLockConflictAggregation
  topAdvanceTickPhasesByLast: AiPlayerAdvanceTickPhaseSummary[]
  topAdvanceTickSubphasesByLast: AiPlayerAdvanceTickSubphaseSummary[]
  recentEventActions: string[]
}

export type AiPlayerModelRoutingSource = 'default' | 'env' | 'faction_config' | 'player_config' | 'fallback'

export type AiPlayerModelBudgetTier = 'strict_action' | 'economy_chat' | 'disabled'

export type AiPlayerModelByokSource = 'none' | 'faction_config' | 'player_config'

export type AiPlayerModelTargetCandidate = {
  model: string
  provider: string
  source: AiPlayerModelRoutingSource
  byokSource: AiPlayerModelByokSource
  priority: number
  isActive: boolean
  fallbackCandidate: boolean
  strictJsonOnlyCapable: boolean
  budgetTier: AiPlayerModelBudgetTier
  lastFailureReason: string | null
  secretConfigured: boolean
  secretSource: string | null
}

export type AiPlayerModelStatus = {
  activeModel: string
  activeProvider: string
  source: AiPlayerModelRoutingSource
  strictJsonOnlyCapable: boolean
  budgetTier: AiPlayerModelBudgetTier
  fallbackEnabled: boolean
  fallbackModel: string | null
  lastFallbackReason: string | null
  secretConfigured: boolean
  secretSource: string | null
  byokSource: AiPlayerModelByokSource
  targetCount: number
  candidateTargets: AiPlayerModelTargetCandidate[]
}

export type GovernedAiPlayerRuntime = GovernedAiPlayer & {
  modelName: string
  modelSource: 'env' | 'default'
  modelStatus: AiPlayerModelStatus
  autonomyLevel: SessionAutonomyLevel
  controlMode: SessionControlMode
  online: boolean
  seatCount: number
  onlineSeatCount: number
  playerNames: string[]
  governorOnline: boolean
  budget: AiPlayerBudgetSnapshot
  resourceTransfer: AiPlayerResourceTransferRuntime
  proposalStats: AiPlayerProposalStats
  listCard: AiPlayerListCardReadModel
  latestProposalId?: string
  latestReceipt?: AiPlayerActionReceipt
}

export type GovernedAiPlayerRuntimeDetail = GovernedAiPlayerRuntime & {
  persistence: AiPlayerGovernancePersistHealth
  observability: AiPlayerRuntimeObservabilitySummary
}

export type AiPlayerActionProposal = {
  proposalId: string
  aiPlayerId: string
  governorPlayerId: string
  factionId: string
  action: AiPlayerActionType
  args: AiPlayerActionArgs
  reason: string
  riskLevel: AiPlayerActionRiskLevel
  source: AiPlayerProposalSource
  status: AiPlayerProposalStatus
  requiresApproval: boolean
  executableInV1: boolean
  createdAt: string
  updatedAt: string
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string
  executedAt?: string
  executedBy?: string
  failureCode?: string | null
  failureDetail?: string | null
  worldAction?: string
  worldActionPayload?: Record<string, unknown>
  recoveryHint?: AiPlayerRecoveryHint
}

export type AiPlayerActionProposalOf<T extends AiPlayerActionType> =
  Omit<AiPlayerActionProposal, 'action' | 'args'> & {
    action: T
    args: AiPlayerActionArgs<T>
  }

export type AiPlayerActionReceipt = {
  proposalId: string
  aiPlayerId: string
  governorPlayerId: string
  factionId: string
  action: AiPlayerActionType
  worldAction: string | null
  worldActionPayload?: Record<string, unknown>
  worldReceipt?: WorldActionReceipt
  actionRequestId: string | null
  approvedBy?: string
  approvedAt?: string
  ok: boolean
  failureCode: string | null
  message?: string
  execution: unknown | null
  observedAt: string
  recoveryHint?: AiPlayerRecoveryHint
}

export type CreateGovernedAiPlayerRequest = {
  aiPlayerId: string
  displayName: string
  avatarId?: string
  avatarImagePath?: string
  governorPlayerId: string
  factionId: string
  enabled?: boolean
  paused?: boolean
  homeCityTileId?: string
  actionWhitelist?: AiPlayerActionType[]
  approvalPolicy?: Partial<AiPlayerApprovalPolicy>
  budgetPolicy?: Partial<AiPlayerBudgetPolicy>
  runtimePolicy?: Partial<AiPlayerRuntimePolicy>
  contextDocuments?: AiPlayerContextDocument[]
}

export type BindAiPlayerHomeCityRequest = {
  governorPlayerId: string
  centerTileId: string
  updatedBy?: string
}

export type AiPlayerHomeCityCandidatesResponse = {
  ok: true
  aiPlayerId: string
  governorPlayerId: string
  factionId: string
  governorHomeTileId: string
  radiusLimit: number
  footprintId: AiPlayerHomeCityFootprintId
  footprintSize: '3x3'
  candidates: AiPlayerHomeCityCandidate[]
  count: number
  currentBinding?: AiPlayerHomeCityPlacement
}

export type UpdateGovernedAiPlayerStatusRequest = {
  updatedBy: string
}

export type UpdateGovernedAiPlayerProfileRequest = {
  displayName?: string
  avatarId?: string
  avatarImagePath?: string
  runtimePolicy?: Partial<AiPlayerRuntimePolicy>
  updatedBy: string
}

export type UploadAiPlayerAvatarImageRequest = {
  contentType: 'image/png' | 'image/jpeg' | 'image/webp'
  imageBase64: string
  fileName?: string
  updatedBy: string
}

export type AiPlayerAvatarImageAsset = {
  assetId: string
  avatarImagePath: string
  contentType: 'image/png' | 'image/jpeg' | 'image/webp'
  byteSize: number
  sha256: string
}

export type UpsertAiPlayerContextDocumentRequest = {
  documentId?: string
  kind: AiPlayerContextDocumentKind
  title: string
  content: string
  sourceFileName?: string
  updatedBy: string
}

export type RefineAiPlayerContextDocumentRequest = {
  sourceContent: string
  sourceFileName?: string
  titleHint?: string
  updatedBy: string
}

export type RefinedAiPlayerContextDocumentPreview = {
  kind: 'identity'
  title: string
  content: string
  sourceFileName?: string
  contentBytes: number
  estimatedTokens: number
  sourceChars: number
  usedSourceChars: number
  truncated: boolean
  maxSourceChars: number
}

export type RefineAiPlayerContextDocumentResponse = {
  ok: boolean
  refined?: RefinedAiPlayerContextDocumentPreview
  suggestedUpsertRequest?: UpsertAiPlayerContextDocumentRequest
  persisted?: false
  error?: string
}

export type AiPlayerActionProposalRequest = {
  aiPlayerId: string
  action: AiPlayerActionType
  args?: AiPlayerActionArgs
  reason: string
  source: AiPlayerProposalSource
}

export type AiPlayerActionProposalRequestOf<T extends AiPlayerActionType> =
  Omit<AiPlayerActionProposalRequest, 'action' | 'args'> & {
    action: T
    args?: AiPlayerActionArgs<T>
  }

export type ApproveAiPlayerProposalRequest = {
  approvedBy: string
}

export type RejectAiPlayerProposalRequest = {
  rejectedBy: string
  rejectionReason?: string
}

export type ExecuteAiPlayerProposalRequest = {
  executedBy: string
  includeWorld?: boolean
}

export type AiPlayerActionCatalogResponse = {
  catalog: AiPlayerActionCatalogEntry[]
}

export type ListGovernedAiPlayersResponse = {
  items: GovernedAiPlayerRuntime[]
  count: number
  listSummary: AiPlayerListReadModelSummary
}

export type ListAiPlayerProposalsResponse = {
  items: AiPlayerActionProposal[]
  count: number
}

export type ListAiPlayerReceiptsResponse = {
  items: AiPlayerActionReceipt[]
  count: number
}

export type GovernedAiPlayerMutationResponse = {
  ok: boolean
  player?: GovernedAiPlayerRuntimeDetail
  error?: string
}

export type BindAiPlayerHomeCityResponse = GovernedAiPlayerMutationResponse & {
  binding?: AiPlayerHomeCityPlacement
  failureCode?: string
}

export type AiPlayerProposalMutationResponse = {
  ok: boolean
  proposal?: AiPlayerActionProposal
  receipt?: AiPlayerActionReceipt
  failureCode?: string | null
  recoveryHint?: AiPlayerRecoveryHint
  error?: string
}
