import type { BusMessage, DomainAgenda, DomainCommMetricsSnapshot, NationalAgendaWindow } from '../commBus'
import type { CourtSession } from '../court'
import type { CivilMemoryEntry, CivilMemoryEventType } from '../civilMemory'
import type {
  AllianceStance,
  ExecutionEnqueueMode,
  FactionId,
  GeneralDirective,
  HeroArchetype,
  HeroCardType,
  HeroFaction,
  HeroQuality,
  IntelligenceLevel,
  PlanSource,
  ResourceKind,
  RegionPriority,
  RegionRole,
  TacticalTemplateId,
  TacticalOverrideStatus,
  TileOwner,
  TileTerrain,
  TileType,
  TroopType,
  UnitStatus,
} from './common'
import type { HistoryState, OperationalFeedback, Report } from './history'
import type { MapContinuousOverlays, CityTechTrackId, NationNameHistoryEntry, NationProfileAuditEntry, NationTier } from './meta'
import type { PlanningJobHistoryEntry, StrategicPlan, PlanExecution } from './planning'
import type { NationMidgameLongTermControlState } from '../../domain/cityControlJudgment'

export type CityDurabilityRole = 'center' | 'wall'

export type Tile = {
  id: string
  name: string
  type: TileType
  terrain: TileTerrain
  owner: TileOwner
  x: number
  y: number
  moveCost: number
  enemyPressure: number
  scoutingDifficulty: number
  resourceLevel?: number
  resourceKind?: ResourceKind
  cityLevel?: number
  cityDurability?: number
  cityDurabilityMax?: number
  cityDurabilityRole?: CityDurabilityRole
  district?: string
  landmarkId?: string
  landmarkName?: string
}

export type WorldResourceLevelWeight = {
  level: number
  weight: number
}

export type WorldResourceKindWeight = {
  kind: ResourceKind
  weight: number
}

export type WorldResourceGenerationMetadata = {
  worldSeed: string
  generationVersion: string
  resourceTileDensityPermille: number
  levelWeightTable: WorldResourceLevelWeight[]
  kindWeightTable: WorldResourceKindWeight[]
  generatedResourceTileCount: number
  levelCounts: Record<string, number>
  kindCounts: Record<ResourceKind, number>
}

export type MainMapCellEventType = 'claim' | 'release'

export type MainMapCellOverride = {
  cellId: string
  worldId: string
  coordinateSpace: string
  cellX: number
  cellY: number
  chunkId: string
  owner: string
  cellVersion: number
  lastEventId: string
  lastEventType: MainMapCellEventType
  updatedWorldVersion: number
  updatedAt: string
  updatedByFactionId: FactionId
  requestId: string
  immunityUntil?: string
  immunityActive?: boolean
  immunitySource?: string
}

export type MainMapCellEvent = {
  eventId: string
  requestId: string
  eventType: MainMapCellEventType
  cellId: string
  worldId: string
  coordinateSpace: string
  cellX: number
  cellY: number
  chunkId: string
  factionId: FactionId
  previousOwner: string
  nextOwner: string
  previousCellVersion: number
  nextCellVersion: number
  worldVersion: number
  createdAt: string
  immunityUntil?: string
  immunityActive?: boolean
  immunitySource?: string
}

export type MainMapRuntimeState = {
  schemaVersion: 'main_map_runtime_v0_1'
  worldId: string
  coordinateSpace: string
  ownerIndexVersion: string
  resourceGenerationVersion: string
  overrideVersion: number
  cellOverrides: Record<string, MainMapCellOverride>
  events: MainMapCellEvent[]
}

export type MapRegion = {
  id: string
  name: string
  role: RegionRole
  priority: RegionPriority
  centerTileId: string
  tileIds: string[]
  summary: string
}

export type AlliedCommander = {
  id: string
  name: string
  specialty: RegionRole
  assignedRegionId: string
  readiness: number
}

export type AllianceDirective = {
  regionId: string
  stance: AllianceStance
  assignedCommanderId: string
  supportLevel: number
  summary: string
}

export type AllianceOfficerPermission =
  | 'update_frontline_marker'
  | 'upgrade_empire'
  | 'manage_nation_profile'
  | 'manage_diplomacy'

export type AllianceOfficerRoleId = 'alliance_commander' | 'frontline_officer'

export type AllianceOfficerAuthorityGrant = {
  id: string
  factionId: FactionId
  roleId: AllianceOfficerRoleId
  roleLabel: string
  commanderId: string
  principalPlayerName: string
  permissions: AllianceOfficerPermission[]
  status: 'active' | 'revoked'
  source: 'scenario_seed' | 'governance_assignment'
  createdAt: string
  updatedAt: string
}

export type AllianceOfficerAuthorityTable = {
  schemaVersion: 'alliance_officer_authority_table_v1'
  grants: Record<string, AllianceOfficerAuthorityGrant>
}

export type AllianceFrontlineMarker = {
  id: string
  factionId: FactionId
  label: string
  fromCell: {
    x: number
    y: number
  }
  toCell: {
    x: number
    y: number
  }
  note?: string
  visibility: 'alliance'
  authoritySource: 'alliance_officer_main_world_marker'
  actorCommanderId: string
  actorCommanderName: string
  authorityRole: AllianceOfficerRoleId
  authorityGrantId?: string
  actorSessionId?: string
  actorSessionIdType?: 'player_session'
  actorPlayerName?: string
  actorSeatId?: number
  updatedAt: string
  updatedWorldVersion: number
}

export type AllianceState = {
  level?: number
  exp?: number
  expRequired?: number
  commanders: AlliedCommander[]
  directives: Record<string, AllianceDirective>
  officerAuthority?: AllianceOfficerAuthorityTable
  frontlineMarkers?: Record<string, AllianceFrontlineMarker>
}

export type OverseasGameplayState = 'locked' | 'scoutable' | 'route_open' | 'playable'

export type SeaRouteTravelCost = {
  actionPoints: number
  food: number
}

export type SeaRouteEndpoint =
  | {
      kind: 'dock'
      id: string
      label: string
      tileId: string
    }
  | {
      kind: 'overseas_contact'
      id: string
      label: string
      region: 'japan' | 'india' | 'southeast_asia'
      gameplayState: OverseasGameplayState
    }

export type SeaRouteDefinition = {
  id: string
  label: string
  source: Extract<SeaRouteEndpoint, { kind: 'dock' }>
  destination: Extract<SeaRouteEndpoint, { kind: 'overseas_contact' }>
  gameplayState: OverseasGameplayState
  requiredPermission: 'coastal_dock_access'
  travelCost: SeaRouteTravelCost
  blockedReason: string | null
  relatedOverseasRegions: Array<'japan' | 'india' | 'southeast_asia'>
}

export type SeaRouteStatus = {
  routeId: string
  status: 'locked' | 'blocked' | 'route_open'
  blockedReason: string | null
  travelCost: SeaRouteTravelCost
  lastOpenedTick?: number
  lastOpenedByFactionId?: FactionId
  lastActorAiPlayerId?: string
}

export type SeaRouteAuthorityState = {
  schemaVersion: 'sea_route_authority_v0_1'
  routes: SeaRouteDefinition[]
  routeStatuses: Record<string, SeaRouteStatus>
}

export type NavalVesselType = 'light_patrol_warship' | 'interceptor_warship' | 'transport_warship'

export type NavalFleetRuntimeStatus = 'in_port' | 'sailing' | 'arrived' | 'intercepted' | 'patrolling' | 'intercepting'

export type NavalFleetDamageState = 'none' | 'light_damage'

export type NavalFleetRepairStatus = 'none' | 'needs_repair' | 'returning_to_port'

export type NavalShipyardBuildStatus = 'recorded'

export type NavalShipyardScope = 'minimal_shipyard_inventory_not_full_naval_economy'

export type NavalRouteEncounterMissionType = 'patrol' | 'intercept' | 'escort' | 'hold'

export type NavalRouteEncounterEnemyPresence = 'none' | 'scout' | 'raider' | 'fleet' | 'convoy'

export type NavalRouteEncounterState =
  | 'no_contact'
  | 'sighted'
  | 'skirmish'
  | 'intercept_ready'
  | 'avoid'
  | 'blocked'

export type NavalRouteEncounterDamageRange = {
  min: number
  max: number
}

export type NavalCombatSettlementOutcome =
  | 'interceptor_warship_advantage'
  | 'transport_warship_holds_route'
  | 'balanced_naval_exchange'

export type NavalFleetInstance = {
  fleetId: string
  factionId: FactionId
  routeId: string
  sourceDockId: string
  overseasContactId: string
  vesselType: NavalVesselType
  frameSlotId: string
  carriedUnitIds: string[]
  carriedUnitCapacity: number
  combatBonusPercent: number
  speedTier: 'fast' | 'normal' | 'slow'
  status: NavalFleetRuntimeStatus
  createdTick: number
  lastSailedTick?: number
  progressPercent: number
  runtimeAdapterStatus: 'naval_runtime_adapter_v0_1'
  movementRuntimeStatus: 'dedicated_naval_runtime_not_land_unit_marker'
  doesNotUseUnitMarker: true
  routeLineStatus?: 'route_line_visible'
  damageState?: NavalFleetDamageState
  repairStatus?: NavalFleetRepairStatus
  damageSummary?: string
  lossSummary?: string
  lastDamageTick?: number
  lastRepairTick?: number
  shipyardOrderId?: string
  shipyardBuildStatus?: NavalShipyardBuildStatus
  actorAiPlayerId?: string
}

export type NavalShipyardOrder = {
  shipyardOrderId: string
  factionId: FactionId
  harborId: string
  routeId: string
  sourceDockId: string
  overseasContactId: string
  shipClass: NavalVesselType
  buildStatus: NavalShipyardBuildStatus
  addedShipCount: number
  inventoryDelta: number
  inventoryFleetId: string
  scope: NavalShipyardScope
  createdTick: number
  actorAiPlayerId?: string
}

export type NavalHarborInventoryState = {
  harborId: string
  factionId: FactionId
  totalShipCount: number
  shipCountsByClass: Partial<Record<NavalVesselType, number>>
  lastOrderId?: string
  lastUpdatedTick: number
}

export type NavalRuntimeState = {
  schemaVersion: 'naval_runtime_v0_1'
  fleets: Record<string, NavalFleetInstance>
  shipyardOrders?: Record<string, NavalShipyardOrder>
  harborInventories?: Record<string, NavalHarborInventoryState>
}

export type MovementGeographyFeedbackCode =
  | 'same_state_adjacent_allowed'
  | 'not_adjacent'
  | 'cross_state_blocked_requires_pass'
  | 'state_boundary_pass_allowed'
  | 'mountain_blocked_requires_pass'
  | 'river_blocked_requires_dock'
  | 'river_crossing_dock_allowed'

export type MovementGeographyRequirement = {
  kind: 'pass' | 'dock'
  id?: string
  label: string
}

export type MovementGeographyTileRef = {
  tileId: string
  name: string
  district?: string
  terrain: TileTerrain
  type: TileType
}

export type MovementGeographyFeedback = {
  schemaVersion: 'movement_geography_feedback_v0_1'
  ok: boolean
  outcome: 'allowed' | 'blocked'
  code: MovementGeographyFeedbackCode
  playerSummary: string
  blockedReason: string | null
  requiredPass?: MovementGeographyRequirement
  requiredDock?: MovementGeographyRequirement
  from: MovementGeographyTileRef
  to: MovementGeographyTileRef
  seaRouteAuthorityBoundary: 'land_movement_only_sea_route_authority_is_independent'
}

export type Unit = {
  id: string
  name: string
  faction: FactionId
  corps: {
    name: string
    doctrine: string
    specialty: string
    readiness: number
    roster: string[]
  }
  hero: {
    id: string
    name: string
    title: string
    faction: HeroFaction
    cardType: HeroCardType
    quality: HeroQuality
    archetype: HeroArchetype
    level: number
    troopType: TroopType
    avatarKey: string
    portraitKey: string
    force: number
    command: number
    intelligence: number
    charisma: number
    speed: number
    traits: string[]
    signatureSkill: {
      name: string
      detail: string
    }
    growthFocus: string
    exp?: number
    starLevel?: number
  }
  tileId: string
  strength: number
  mobility: number
  supply: number
  status: UnitStatus
  currentTask?: string
  /** 当前行军权威时间；地图倒计时与路径表现只能消费该字段，不在前端自行推算。 */
  march?: UnitMarchState
  /** 副英雄（支援武将，最多2人，实现3武将编队战力加成） */
  coHeroes?: Array<{
    id: string
    name: string
    title?: string
    faction: HeroFaction
    cardType: HeroCardType
    quality: HeroQuality
    archetype: HeroArchetype
    level: number
    troopType: TroopType
    avatarKey: string
    portraitKey: string
    force: number
    command: number
    intelligence: number
    charisma: number
    speed: number
    signatureSkill: {
      name: string
      detail: string
    }
  }>
  /** 所属 AI 玩家分组 ID（势力内分组管理） */
  aiPlayerId?: string
  /** 所属主城编组队伍 ID；用于区分同一 AI 玩家下的多支正式队伍。 */
  teamId?: string
  /** 所属主城编组队伍序号；用于 UI 显示“第几队”和后端 read model 稳定匹配。 */
  teamIndex?: number
  /** 主世界地图部队表现体读模型；由后端权威状态派生，Godot 只消费不反推。 */
  mapVisual?: UnitMapVisualState
}

export type UnitMapVisualType = 'infantry' | 'cavalry' | 'archer'

export type UnitMapOwnerType = 'human' | 'ai'

export type UnitRoadExitDirection = 'south' | 'southwest' | 'east' | 'southeast' | 'north' | 'northwest' | 'west'

export type UnitMapVisualFormationSlotRole = 'vanguard' | 'center' | 'camp'

export type UnitMapVisualFormationSlot = {
  role: UnitMapVisualFormationSlotRole
  heroId: string
  heroName: string
  troopType: TroopType
  visualType: UnitMapVisualType
}

export type UnitMarchState = {
  originTileId: string
  targetTileId: string
  path: string[]
  /** 权威出城队列锚点；Godot 优先消费该字段，缺失时才允许本地按坐标兜底。 */
  exitAnchorId?: string
  /** 权威道路出口方向；与行军命令绑定，不由前端反推出最终状态。 */
  roadExitDirection?: UnitRoadExitDirection
  startedAt: string
  estimatedArrivalAt: string
  durationSec: number
}

export type UnitMapVisualState = {
  visualType: UnitMapVisualType
  primaryTroopType: TroopType
  /** 三武将地图表现槽：前锋/中军/大营分别驱动地图上三排小部队，不再组合爆炸成整套贴图。 */
  formationSlots: UnitMapVisualFormationSlot[]
  ownerType: UnitMapOwnerType
  bannerColor?: string
  currentTileId: string
  targetTileId?: string
  currentPath?: string[]
  exitAnchorId?: string
  roadExitDirection?: UnitRoadExitDirection
  status: UnitStatus
  label: string
  marchStartedAt?: string
  estimatedArrivalAt?: string
  etaAt?: string
}

export type TacticalTemplate = {
  id: TacticalTemplateId
  label: string
  summary: string
  executionNote: string
  targetScope: 'self' | 'neighbor' | 'frontline' | 'region'
  accent: 'gold' | 'crimson' | 'jade' | 'azure'
  recommendedArchetypes: HeroArchetype[]
}

export type HeroPoolEntry = {
  id: string
  name: string
  faction: HeroFaction
  cardType: HeroCardType
  quality: HeroQuality
  cost: number
  skillName: string
  archetype: HeroArchetype
  troopType: TroopType
  tags: string[]
  avatarKey: string
  portraitKey: string
}

export type TacticalOverride = {
  id: string
  unitId: string
  templateId: TacticalTemplateId
  targetTileId: string
  summary: string
  status: TacticalOverrideStatus
  createdTick: number
  createdWorldVersion: number
  committedRequestId?: string
  completedTick?: number
  lastMessage?: string
}

export type FactionHeroCommand = {
  doctrine: string
  homeTileId: string
  commandLimit: number
  heroLuck: number
  developmentPoints: number
  acquisitionThreshold: number
  rosterHeroIds: string[]
  reserveHeroIds: string[]
  prospectHeroIds: string[]
  recentHeroId?: string
}

export type RewardBundle = {
  food: number
  ap: number
}

export type ResourceTransferBundle = {
  food: number
  wood: number
  stone: number
  iron: number
  copper?: number
}

export type PveNode = {
  id: string
  name: string
  district: string
  tileId: string
  guardStrength: number
  reward: RewardBundle
  cleared: boolean
  clearedByFaction?: string
}

export type ClaimableRewardSource = 'province_pve' | 'daily_welfare' | 'event_reward'

export type ClaimableReward = {
  id: string
  source: ClaimableRewardSource
  label: string
  summary: string
  reward: RewardBundle
  createdTick: number
  ledgerKey?: string
  nodeId?: string
  tileId?: string
}

export type ScenarioNodeStatus = 'locked' | 'active' | 'achieved' | 'claimed'

export type ScenarioNodeClaimState = 'unavailable' | 'claimable' | 'claimed'

export type ScenarioRewardPreviewKind = ResourceKind | 'jade' | 'copper'

export type ScenarioRewardPreview = {
  kind: ScenarioRewardPreviewKind
  label: string
  amount: number
}

export type ScenarioNode = {
  nodeId: string
  title: string
  objectiveText: string
  progressText: string
  rewardPreview: ScenarioRewardPreview[]
  assetSlot: string
}

export type ScenarioScript = {
  scriptId: string
  scenarioId: string
  scenarioVersion: string
  title: string
  subtitle: string
  nodes: ScenarioNode[]
}

export type SeasonScenarioState = {
  activeScenarioId: string
  scenarioVersion: string
  seasonRunId: string
  achievedNodeIds: string[]
  claimedNodeIds: string[]
}

export type TaskRewardPreviewKind = ResourceKind | 'copper'

export type TaskRewardPreview = {
  kind: TaskRewardPreviewKind
  label: string
  amount: number
}

export type TaskStatus = 'locked' | 'active' | 'achieved' | 'claimed'

export type TaskClaimState = 'unavailable' | 'claimable' | 'claimed'

export type TaskSettlementAuthority = 'real_authority' | 'prototype_only' | 'locked'

export type TaskRealAuthoritySignalKind =
  | 'main_city_opened'
  | 'resource_stockpile_ready'
  | 'resource_scouted'
  | 'troop_formation_viewed'
  | 'troop_formation_prepared'
  | 'ai_activity_observed'
  | 'battle_report_opened'

export type TaskRealAuthoritySignalRef = {
  kind: TaskRealAuthoritySignalKind
  id: string
  satisfied: boolean
}

export type WorldTaskEventSource = 'player_ui' | 'ai_trace' | 'battle_report' | 'system'

export type WorldTaskEvent = {
  eventId: string
  factionId: FactionId
  scenarioId: string
  scenarioVersion: string
  seasonRunId: string
  taskId: string
  kind: TaskRealAuthoritySignalKind
  authority: 'real_authority'
  source: WorldTaskEventSource
  sourceId: string
  summary: string
  createdTick: number
  createdWorldVersion: number
}

export type WorldTaskEventLedgerState = {
  schemaVersion: 'world_task_event_ledger_v1'
  events: WorldTaskEvent[]
}

export type ScenarioTaskActionTarget = {
  kind: 'panel' | 'world_tile' | 'none'
  id?: string
}

export type ScenarioTask = {
  taskId: string
  title: string
  objectiveText: string
  progressText: string
  rewardPreview: TaskRewardPreview[]
  actionHint?: string
  actionTarget?: ScenarioTaskActionTarget
  assetSlot?: string
}

export type ScenarioTaskGroup = {
  taskGroupId: string
  tasks: ScenarioTask[]
}

export type ScenarioTaskChapter = {
  chapterId: string
  title: string
  chapterIndex: number
  progressText: string
  rewardPreview: TaskRewardPreview[]
  assetSlot?: string
  nextChapterId?: string | null
  currentTaskGroupId: string
  taskGroups: ScenarioTaskGroup[]
}

export type ScenarioTaskCatalog = {
  scriptId: string
  scenarioId: string
  scenarioVersion: string
  chapters: ScenarioTaskChapter[]
}

export type SeasonTaskState = {
  activeScenarioId: string
  scenarioVersion: string
  seasonRunId: string
  activeChapterId: string
  achievedTaskIds: string[]
  claimedTaskIds: string[]
}

export type WorldTasksReadModelTask = ScenarioTask & {
  status: TaskStatus
  claimState: TaskClaimState
  canClaim: boolean
  settlementAuthority: TaskSettlementAuthority
  realAuthoritySignals: TaskRealAuthoritySignalRef[]
}

export type WorldTasksReadModel = {
  factionId: FactionId
  scenarioId: string
  scenarioVersion: string
  seasonRunId: string
  activeChapterId: string
  activeChapterTitle: string
  chapterIndex: number
  chapterProgressText: string
  chapterRewardPreview: TaskRewardPreview[]
  currentTaskGroupId: string
  tasks: WorldTasksReadModelTask[]
  assetSlot?: string
}

export type WorldAffairsReadModelNode = ScenarioNode & {
  status: ScenarioNodeStatus
  achievedAt: number | null
  claimState: ScenarioNodeClaimState
  canClaim: boolean
}

export type WorldAffairsReadModel = {
  scriptId: string
  scenarioId: string
  scenarioVersion: string
  seasonRunId: string
  title: string
  subtitle: string
  activeNodeId: string | null
  nodes: WorldAffairsReadModelNode[]
}

export type CurrentGoalLayerId = 'firstHour' | 'growth' | 'alliance' | 'kingdom' | 'empire' | 'unification'

export type CurrentGoalAuthority = 'real_authority' | 'read_model_only' | 'prototype_only' | 'locked'

export type CurrentGoalSourceKind =
  | 'worldTasks'
  | 'worldAffairs'
  | 'aiTrace'
  | 'battleReport'
  | 'alliance'
  | 'nation'
  | 'eastHanThirteenStates'

export type CurrentGoalSourceRef = {
  kind: CurrentGoalSourceKind
  id: string
}

export type CurrentGoalItem = {
  goalId: string
  title: string
  description: string
  nextStep: string
  authority: CurrentGoalAuthority
  sourceRefs: CurrentGoalSourceRef[]
  actionTarget?: ScenarioTaskActionTarget
}

export type CurrentGoalLayer = {
  layerId: CurrentGoalLayerId
  title: string
  goals: CurrentGoalItem[]
}

export type CurrentGoalsReadModel = {
  contractId: 'current_goals_guidance_v1'
  factionId: FactionId
  generatedAtWorldVersion: number
  layers: CurrentGoalLayer[]
}

export type DailyWelfareLedgerEntry = {
  ledgerKey: string
  rewardId: string
  status: 'pending' | 'claimed'
  issuedTick: number
  claimedTick?: number
}

export type AiResourceAccount = {
  aiPlayerId: string
  governorPlayerId: string
  factionId: FactionId
  resources: ResourceTransferBundle
  updatedTick: number
}

export type AiResourceGatherClaim = {
  id: string
  aiPlayerId: string
  unitId: string
  tileId: string
  factionId: FactionId
  resourceKind: ResourceKind
  resourceLevel: number
  resources: ResourceTransferBundle
  createdTick: number
}

export type AiResourceTransferQuotaState = {
  aiPlayerId: string
  governorPlayerId: string
  factionId: FactionId
  windowStartedTick: number
  windowEndsTick: number
  dailyQuotaTotal: number
  transferredTotal: number
  transferredResources: ResourceTransferBundle
  lastTransferTick?: number
  cooldownUntilTick?: number
}

export type AiResourceTransferPolicyState = {
  dailyQuotaTotal?: number
  dailyWindowTicks?: number
  cooldownTicks?: number
}

export type GovernorResourceTransfer = {
  id: string
  sourceAiPlayerId: string
  sourceFactionId: FactionId
  governorPlayerId: string
  resources: ResourceTransferBundle
  reason: string
  approvedBy: string
  status: 'pending'
  createdTick: number
}

export type GovernorResourceSettlement = {
  id: string
  sourceAiPlayerId: string
  sourceFactionId: FactionId
  governorPlayerId: string
  resources: ResourceTransferBundle
  reason: string
  approvedBy: string
  status: 'claimed'
  createdTick: number
  claimedTick: number
}

export type GovernorResourceInbox = {
  governorPlayerId: string
  pendingTransfers: GovernorResourceTransfer[]
  totalPendingResources: ResourceTransferBundle
}

/** AI 玩家分组：势力内的指挥官角色，管辖最多 3 支部队（实现同势力飞地协作） */
export type AIPlayer = {
  id: string
  name: string
  factionId: string
  /** 管辖的 Unit ID 列表（最多3支，对应3武将编队） */
  unitIds: string[]
  /** 战术专长 */
  specialty: 'assault' | 'recon' | 'guard' | 'logistics' | 'expansion'
  lore?: string
}

export type FactionAiQuota = {
  initialQuota: number
  currentQuota: number
  maxQuota: number
  growthScore: number
  tugIntensity: number
  nextUnlockScore: number | null
  lastGrowthTick?: number
}

export type SlgTroopFacilityBuildingState = {
  level: number
  statusText: string
  updatedTick: number
  description?: string
}

export type SlgTroopFacilityState = Record<string, Record<string, SlgTroopFacilityBuildingState>>

export type SlgCityBuildingState = {
  level: number
  statusText: string
  updatedTick: number
  description?: string
}

export type SlgCityBuildingGroupState = Record<string, SlgCityBuildingState>

export type SlgRecruitResultState = {
  id: string
  heroId: string
  heroName: string
  poolId: string
  drawMode: 'single' | 'multi'
  updatedTick: number
}

export type SlgRecruitState = {
  selectedPoolId?: string
  drawCount?: number
  lastDrawMode?: 'single' | 'multi' | 'none'
  lastResults?: SlgRecruitResultState[]
  updatedTick?: number
}

export type SlgGeneralDirectivePreviewState = {
  heroId?: string
  tacticId?: string
  source?: string
  sourceActionId?: string
  accepted?: number
  rejected?: number
  status?: string
  executionState?: string
  summary?: string
  warnings?: string[]
  effectLines?: string[]
  nextSteps?: string[]
  templateId?: string
  affectedUnitIds?: string[]
  targetUnitId?: string
  targetTileId?: string
  updatedTick?: number
  updatedWorldVersion?: number
}

export type SlgGeneralTacticalSkillSlotState = {
  innateSkillId: string
  equippedSkillIds: string[]
  /** Per-equipped-skill upgrade level. UI read models must not derive this from static skill.level. */
  equippedSkillLevelsById?: Record<string, number>
  updatedTick?: number
  updatedWorldVersion?: number
}

export type SlgGeneralState = {
  activeHeroId?: string
  deploymentAnchorTileId?: string
  tacticByHeroId?: Record<string, string>
  /** Authoritative runtime skill-slot state consumed by battle formulas. */
  tacticalSkillSlotsByHeroId?: Record<string, SlgGeneralTacticalSkillSlotState>
  // Legacy compatibility mirror. Prefer directivePreviewByHeroId[activeHeroId] when available.
  directivePreviewHeroId?: string
  // Legacy compatibility mirror. Prefer the hero-level map for long-term state.
  directivePreview?: SlgGeneralDirectivePreviewState
  // Authoritative hero-level directive previews.
  directivePreviewByHeroId?: Record<string, SlgGeneralDirectivePreviewState>
  updatedTick?: number
}

export type SlgAiContextMemorySummary = {
  focusId?: string
  relatedId?: string
  teamId?: string
  teamIndex?: number
  teamName?: string
  aiPlayerId?: string
  ownerType?: string
  heroNames?: string[]
  lines?: string[]
  updatedTick?: number
}

export type SlgAiAgendaState = {
  source: string
  summary?: string
  options?: {
    actionId: string
    intent?: string
    label: string
    summary?: string
    priority?: string
    targetTileId?: string
    targetUnitIds?: string[]
    supportingAiPlayerIds?: string[]
    evidenceRefs?: string[]
    supportCount: number
    recommendedFollowups?: string[]
  }[]
  // Legacy mirror arrays kept only for older readers. New readers should consume options[] directly.
  optionActionIds?: string[]
  optionLabels?: string[]
  optionTargetTileIds?: string[]
  optionSupportCounts?: number[]
  targetTileId?: string
  targetUnitIds?: string[]
  executionRequestId?: string
  recommendedFollowups?: string[]
  updatedTick?: number
  updatedWorldVersion?: number
}

export type SlgAiExecutionState = {
  status: 'idle' | 'queued' | 'running'
  activeOrderCount: number
  queuedOrderCount: number
  runningOrderCount: number
  actionPointsRemaining: number
  foodRemaining: number
  requestId?: string
  basedOnWorldVersion?: number
  reviewAtTick?: number
  strategicCommand?: string
  source?: PlanSource
  updatedTick: number
  updatedWorldVersion: number
}

export type SlgAiState = {
  autonomyLevel?: string
  controlMode?: string
  contextFocusId?: string
  contextMemorySummary?: SlgAiContextMemorySummary
  agenda?: SlgAiAgendaState
  execution?: SlgAiExecutionState
  lastAgendaActionId?: string
  updatedTick?: number
  updatedWorldVersion?: number
}

export type SlgAffairQueueEntryState = {
  id: string
  statusText: string
  updatedTick: number
  description?: string
}

export type SlgFactionDomainState = {
  troopFacilitiesByUnit?: Record<string, SlgTroopFacilityState>
  cityBuildingGroupsByCity?: Record<string, Record<string, SlgCityBuildingGroupState>>
  affairsQueueByCity?: Record<string, SlgAffairQueueEntryState[]>
  recruitStateByFaction?: Record<string, SlgRecruitState>
  generalStateByFaction?: Record<string, SlgGeneralState>
  aiStateByFaction?: Record<string, SlgAiState>
  aiStateByPlayerId?: Record<string, SlgAiState>
}

export type FactionState = {
  id: FactionId
  /** 组织/同盟/国家归属 ID（用于组织战报来源过滤） */
  organizationId?: string
  /** 组织/同盟/国家展示名称（用于组织战报标签） */
  organizationName?: string
  /** 组织形态：同盟或国家 */
  organizationKind?: 'alliance' | 'nation'
  /** 玩家立国后的正式国号 */
  nationName?: string
  /** 国家阶段；立国后默认为王国，满足条件后升级为帝国 */
  nationTier?: NationTier
  /** 玩家立国后的正式势力色 */
  colorHex?: string
  /** 兼容读模型字段，等价于 colorHex */
  nationColorHex?: string
  /** 立国都城格子；迁都后由正式迁都链路更新 */
  nationCapitalTileId?: string
  /** 立国都城展示名 */
  nationCapitalName?: string
  /** 正式成立帝国的时间 */
  nationEmpireFoundedAt?: string
  /** 正式成立帝国消耗的玉符 */
  nationEmpireUpgradeCostJade?: number
  /** 国号变更冷却截止时间；权威治理状态随 world snapshot 持久化 */
  nationRenameCooldownUntil?: string
  /** 历史国号记录；用于治理核查与争议追溯 */
  nationNameHistory?: NationNameHistoryEntry[]
  /** 国家档案治理审计日志；记录成功变更的前后值 */
  nationProfileAuditLog?: NationProfileAuditEntry[]
  /** 顶部货币：玉符 */
  jade?: number
  /** 顶部货币：铜钱 */
  copper?: number
  food: number
  actionPoints: number
  /** 木材资源（城池建造/城防加固消耗） */
  wood?: number
  /** 石料资源（城防/攻城器械消耗） */
  stone?: number
  /** 铁矿资源（武装/装备升级消耗） */
  iron?: number
  heroCommand: FactionHeroCommand
  luoyangHoldTicks?: number
  /** 已占领城池 tileId 列表（传送点/征兵出生点，已占领即可用） */
  capturedCities?: string[]
  /** 征兵冷却计数（每 RECRUIT_COOLDOWN_TICKS 回合可征一次） */
  recruitCooldown?: number
  /** 累计征兵次数 */
  recruitedTotal?: number
  /** 待领取奖励（当前先承载开荒 PVE 等明确后端 authority 的奖励来源） */
  claimableRewards?: ClaimableReward[]
  /** 每日福利发放账本；领取后仍保留，防止跨会话重复发放 */
  dailyWelfareLedgerByKey?: Record<string, DailyWelfareLedgerEntry>
  /** AI 玩家独立资源子账户（用于后续资源地/建筑树产出与受治理资源输送） */
  aiResourceAccounts?: Record<string, AiResourceAccount>
  /** AI 资源地一次性采集记录；key = tileId，防止同一资源地重复入账 */
  aiResourceGatherClaims?: Record<string, AiResourceGatherClaim>
  /** AI 玩家资源输送每日额度/冷却状态；key = aiPlayerId */
  aiResourceTransferQuotaByAiPlayer?: Record<string, AiResourceTransferQuotaState>
  /** AI 玩家资源输送规则配置；由后端 authority 消费，UI 不做本地判定 */
  aiResourceTransferPolicy?: AiResourceTransferPolicyState
  /** 总督待领取资源收件箱；只由后端 authority 写入，UI 不直接结算 */
  governorResourceInboxes?: Record<string, GovernorResourceInbox>
  /** 总督已领取 AI 输送资源账本；保留给 AI subject/readback 追溯结算结果 */
  governorResourceSettlements?: Record<string, GovernorResourceSettlement[]>
  /** 势力内 AI 玩家分组（每玩家管辖3支部队，支持飞地协作） */
  aiPlayers?: AIPlayer[]
  /** 势力内 AI 玩家配额（服务端权威计算：初始配额 + 扩容进度 + 上限） */
  aiQuota?: FactionAiQuota
}
export type TileIntel = {
  level: IntelligenceLevel
  lastScoutedTick?: number
  summary?: string
}
export type WorldState = {
  tick: number
  worldVersion: number
  map: {
    width: number
    height: number
    tiles: Tile[]
    connections: Record<string, string[]>
    regions: MapRegion[]
    overlays: MapContinuousOverlays
    resourceGeneration?: WorldResourceGenerationMetadata
  }
  factions: Record<FactionId, FactionState>
  alliance: AllianceState
  feedback: OperationalFeedback
  units: Unit[]
  reports: Report[]
  intel: Record<string, TileIntel>
  tacticalOverrides: TacticalOverride[]
  executions: Record<string, PlanExecution | null>
  history: HistoryState
  pveNodes?: PveNode[]
  luoyangSiegeProgress?: Record<string, number>
  /** 非洛阳城池围城进度。key = `${factionId}:${tileId}`，value = 已完成的持续围攻 tick 数 */
  citySiegeProgress?: Record<string, number>
  /** 赛季剧本运行态：只保存脚本选择与节点状态 ID，完整剧本从后端 catalog 精确版本读取 */
  worldAffairs?: SeasonScenarioState
  /** 赛季任务运行态：只保存当前章节与任务状态 ID，完整任务目录从后端 catalog 精确版本读取 */
  worldTasks?: SeasonTaskState
  worldTaskEvents?: WorldTaskEventLedgerState
  /** 原生 SLG 前端补充域：部队设施、政务队列等最小权威状态 */
  slgDomainState?: SlgFactionDomainState
  /** 东汉 1km 主世界稀疏 cell 覆盖层；只记录玩家/事件改写过的格子 */
  mainMapRuntime?: MainMapRuntimeState
  /** 海路最小权威切片；mask/dock 视觉层不是玩法完成证据。 */
  seaRouteAuthority?: SeaRouteAuthorityState
  /** 海上舰队最小运行态；独立于陆地 UnitMarker / unit_frames_manifest。 */
  navalRuntime?: NavalRuntimeState
  /** 国家中局长期控制前置态；只记录 owner-transfer 之前的长守累计与回执。 */
  nationMidgameControl?: NationMidgameLongTermControlState
}

export type ResourceGuardUnitReadModel = {
  name: string
  assetKey: string
  portraitAssetKey: string
  level: number
  mainSkillName: string
  ordinarySkillNames: string[]
  fixedSkillSummary: string
}

export type ResourceGuardReadModel = {
  templateId: string
  resourceLevel: number
  label: string
  recommendedAttackerStrength: number
  guardNames: string[]
  skillSummary: string
  units: ResourceGuardUnitReadModel[]
}

export type ResourceTileEconomyRangeReadModel = {
  min: number
  max: number
}

export type ResourceTileCaptureRewardReadModel = {
  resourceKind: ResourceKind
  amount: ResourceTileEconomyRangeReadModel
  heroExp: number
  captureRewardUsesResourceLevel: true
}

export type ResourceTileOngoingYieldReadModel = {
  resourceEconomyModelVersion: string
  tileLevel: number
  resourceKind: ResourceKind
  yieldPerHour: ResourceTileEconomyRangeReadModel
  yieldPerTick: number
  occupiedResourceYieldUsesEconomyCurve: true
}

export type ResourceTileEconomyReadModel = {
  resourceEconomyModelVersion: string
  tileLevel: number
  resourceKind: ResourceKind
  l1L9YieldCurveBounded: true
  productionTileUsesGeneratedResourceTable: true
  baseYieldPerHour: ResourceTileEconomyRangeReadModel
  defenderStrength: ResourceTileEconomyRangeReadModel
  defenderTroopCount: ResourceTileEconomyRangeReadModel
  recommendedPower: number
  ongoingYield: ResourceTileOngoingYieldReadModel
  occupiedResourceYieldUsesEconomyCurve: true
  captureReward: ResourceTileCaptureRewardReadModel
}

export type ResourceTileExpeditionPreviewReadModel = {
  status: 'ready' | 'not_resource_tile' | 'unsupported_resource_level' | 'unsupported_resource_kind'
  isResourceTile: boolean
  resourceEconomyModelVersion: string
  resourceKind?: ResourceKind
  resourceLevel?: number
  resourceLabel: string
  baseYieldPerHour: ResourceTileEconomyRangeReadModel
  ongoingYield: {
    yieldPerHour: ResourceTileEconomyRangeReadModel
    yieldPerTick: number
    occupiedResourceYieldUsesEconomyCurve: boolean
  }
  captureReward?: ResourceTileCaptureRewardReadModel
  hasCaptureReward: boolean
  defenderStrength: ResourceTileEconomyRangeReadModel
  defenderTroopCount: ResourceTileEconomyRangeReadModel
  recommendedPower: number
  guardLevel?: number
  hasResourceGuard: boolean
  guardTemplateId?: string
  difficultyLabel: string
  riskLabel: string
  ownerFactionId?: string
  occupierFactionId?: string
  contestedByFactionId?: string
}

export type L0SubstrateEconomyReadModel = {
  resourceEconomyModelVersion: string
  tileLevel: 0
  l0SubstrateYieldPerHour: 0
  hasResourceKind: false
  hasResourceLevel: false
  hasResourceGuard: false
  hasResourceYield: false
}

export type WorldMapLayoutTile = Omit<Tile, 'owner' | 'enemyPressure'> & {
  resourceGuard?: ResourceGuardReadModel
  resourceEconomy?: ResourceTileEconomyReadModel
  footprintId?: string
  footprintCells?: [number, number]
  footprintTileIds?: string[]
  footprintAnchorTileId?: string
  footprintAnchorPolicy?: 'center_tile'
}

export type WorldMapTileState = Pick<Tile, 'id' | 'owner' | 'enemyPressure'>

export type WorldMapLayout = {
  width: number
  height: number
  tiles: WorldMapLayoutTile[]
  connections: Record<string, string[]>
  regions: MapRegion[]
  overlays: MapContinuousOverlays
  allianceFrontlineMarkers?: AllianceFrontlineMarker[]
  resourceGeneration?: WorldResourceGenerationMetadata
}

export type WorldSummary = Omit<WorldState, 'map'> & {
  map: {
    width: number
    height: number
    mapLayoutVersion: number
    tileStateMode: 'full' | 'delta'
    baseWorldVersion?: number
    tileStates: WorldMapTileState[]
    resourceGeneration?: WorldResourceGenerationMetadata
  }
  intelSyncMode?: 'full' | 'delta'
  intelBaseWorldVersion?: number
}

export type WorldSummaryResponse = {
  world: WorldSummary
  observedAiPlayerId?: string
  observedAiPlayer?: MainCityFacilityEntryObservedAiPlayer
}

export type WorldMapLayoutChunkScope = 'full' | 'bootstrap' | 'province' | 'region' | 'viewport'

export type WorldMapLayoutLayerRequest =
  | 'base_map'
  | 'derived_masks'
  | 'maritime_passability'
  | 'resource_overlay'
  | 'city_gate_anchors'
  | 'main_world_cells'
  | 'cell_overrides'
  | 'tianxia_yutu_overview'
  | 'main_world_mountain_boundaries'
  | 'main_world_chokepoints'
  | 'labels'
  | 'state_detail_tiles'
  | 'state_road_network'
  | 'state_strategic_nodes'

export type WorldMapLayoutChunkMeta = {
  scope: WorldMapLayoutChunkScope
  id?: string
  loadedProvinceIds: string[]
  pendingProvinceIds?: string[]
  cameraViewport?: {
    centerCell: {
      x: number
      y: number
    }
    visibleCells: {
      width: number
      height: number
    }
    preloadMarginCells: number
    chunkSizeCells: {
      width: number
      height: number
    }
    visibleBoundsCells: {
      startX: number
      endX: number
      startY: number
      endY: number
    }
    preloadBoundsCells: {
      startX: number
      endX: number
      startY: number
      endY: number
    }
    loadedChunkIds: string[]
  }
}

export type WorldMapStateDetailTileRef = {
  tile_id: string
  lod: number
  x: number
  y: number
  width_px: number
  height_px: number
  asset_path: string
  cache_key: string
}

export type WorldMapStateDetailTileLevel = {
  lod: number
  width_px: number
  height_px: number
  tile_count: number
  nominal_zoom_min: number
  nominal_zoom_max: number
}

export type WorldMapStateDetailFallbackPolicy = {
  fallback_mode: 'state_mask_only' | 'overview_only'
  fallback_reason: string
  cache_policy: 'retain_last_good_tiles' | 'drop_to_overview'
  hit_test_policy: 'state_bounds_only' | 'state_and_nodes'
}

export type WorldMapStateDetailTileBudget = {
  max_visible_tiles: number
  current_visible_tiles: number
  current_loaded_tiles: number
  cache_retained_tiles: number
}

export type WorldMapStateDetailQualitySummary = {
  overview_source_artifact_id: string
  overview_source_image_path: string
  overview_preview_image_path: string
  state_mask_artifact_id: string
  state_mask_path: string
  detail_source_mode: 'overview_8k_plus_state_mask_seed' | 'per_state_high_res_required'
  tile_source_mode: 'single_mask_seed' | 'state_tile_pyramid'
  screen_fill_ratio_source: 'state_bounds_px_vs_2048x1152'
  screen_fill_ratio_at_2k: number
  runtime_visual_status: 'seed_only_not_final_8k_product_visual' | 'state_tile_pyramid_ready'
  per_state_high_res_trigger: string
}

export type WorldMapStateDetailTilesLayer = {
  schema_version: 'east_han_state_detail_tiles_layer_v0_1'
  state_id: string
  state_name_zh: string
  coordinate_space: string
  source_artifact_id: string
  source_contract_status: 'skeleton_only' | 'runtime_ready'
  state_bounds_cells: {
    min_x: number
    min_y: number
    max_x: number
    max_y: number
  }
  state_bounds_px: {
    min_x: number
    min_y: number
    max_x: number
    max_y: number
  }
  state_fit_zoom_for_2k: number
  max_detail_zoom: number
  tile_levels: WorldMapStateDetailTileLevel[]
  visible_tile_ids: string[]
  loaded_tile_ids: string[]
  retained_cache_tile_ids: string[]
  unload_candidate_tile_ids: string[]
  tiles: WorldMapStateDetailTileRef[]
  tile_budget: WorldMapStateDetailTileBudget
  quality_summary: WorldMapStateDetailQualitySummary
  fallback_policy: WorldMapStateDetailFallbackPolicy
}

export type WorldMapStateRoadSegment = {
  road_id: string
  road_class: 'primary' | 'secondary' | 'river_route' | 'unknown'
  source_artifact_id: string
  from_node_id?: string
  to_node_id?: string
  polyline_cells: Array<{
    x: number
    y: number
  }>
  lod_min_zoom: number
  lod_max_zoom: number
  hit_radius_px: number
}

export type WorldMapStateRoadNetworkLayer = {
  schema_version: 'east_han_state_road_network_layer_v0_1'
  state_id: string
  state_name_zh: string
  coordinate_space: string
  source_contract_status: 'skeleton_only' | 'runtime_ready'
  source_artifact_id: string
  density_policy: 'conservative_state_detail_only'
  density_summary: {
    road_count: number
    seeded_from_existing_jump_targets: boolean
    per_state_high_res_required: boolean
  }
  roads: WorldMapStateRoadSegment[]
}

export type WorldMapStateStrategicNode = {
  node_id: string
  node_type: 'city' | 'gate' | 'pass' | 'fort' | 'dock' | 'chokepoint'
  label: string
  administrative_role?: 'state_government' | 'commandery_seat' | 'city'
  cell: {
    x: number
    y: number
  }
  footprint_cells?: [number, number]
  lod_min_zoom: number
  priority: number
  jump_target_id?: string
}

export type WorldMapStateStrategicNodesLayer = {
  schema_version: 'east_han_state_strategic_nodes_layer_v0_1'
  state_id: string
  state_name_zh: string
  coordinate_space: string
  source_contract_status: 'skeleton_only' | 'runtime_ready'
  source_artifact_id: string
  hit_test_policy: 'node_radius_first_then_state_bounds'
  density_summary: {
    node_count: number
    includes_city_markers: boolean
    includes_gate_jump_targets: boolean
    per_state_high_res_required: boolean
  }
  nodes: WorldMapStateStrategicNode[]
}

export type WorldMapLayoutResponse = {
  mapLayoutVersion: number
  map: WorldMapLayout
  chunk?: WorldMapLayoutChunkMeta
  state_detail_tiles?: WorldMapStateDetailTilesLayer
  state_road_network?: WorldMapStateRoadNetworkLayer
  state_strategic_nodes?: WorldMapStateStrategicNodesLayer
}
export type WorldSnapshotResponse = {
  world: WorldState
}

export type WorldAffairsReadModelResponse = {
  worldAffairs: WorldAffairsReadModel
}

export type WorldTasksReadModelResponse = {
  worldTasks: WorldTasksReadModel
}

export type CurrentGoalsReadModelResponse = {
  currentGoals: CurrentGoalsReadModel
}

export type MainCityFacilityTreeCostItem = {
  resource: string
  amount: number
}

export type MainCityFacilityTreeEffectItem = {
  stat: string
  before: string
  after: string
}

export type MainCityFacilityTreeBuilding = {
  id: string
  label: string
  iconText: string
  iconFile: string
  treeTier: number
  treeSlot: number
  treeAnchorX: number
  treeAnchorY: number
  level: string
  status: string
  body: string
  enabled: boolean
  cost_items: MainCityFacilityTreeCostItem[]
  effect_items: MainCityFacilityTreeEffectItem[]
}

export type MainCityFacilityTreeReadModel = {
  schema_version: 'main_city_facility_tree_read_model_v2'
  cost_mode: 'structured_cost_items_v1'
  effect_mode: 'structured_effect_items_v1'
  asset_root: string
  asset_manifest_path: string
  buildings: MainCityFacilityTreeBuilding[]
}

export type MainCityFacilityTreeReadModelResponse = {
  mainCityFacilityTree: MainCityFacilityTreeReadModel
}

export type MainCityFacilityEntryOwnerKind = 'human' | 'ai'

export type MainCityFacilityEntryObservedAiPlayer = {
  aiPlayerId: string
  displayName: string
  governorPlayerId: string
  factionId: string
  mode: 'ai_player_readonly'
  homeCityBindingStatus?: 'unbound' | 'bound'
  homeCityId?: string
  homeCityTileId?: string
  homeCityPlacement?: {
    cityId: string
    centerTileId: string
    centerX: number
    centerY: number
    footprintId: 'ai_city_3x3_initial'
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
}

export type MainCityFacilityEntryItem = {
  facilityId: string
  label: string
  status: string
  enabled: boolean
  readonly: boolean
  entryActionId: string
  buildingIds: string[]
  primaryBuildingId: string
  treeTier: number
  treeSlot: number
  iconFile: string
  disabledReason?: string
}

export type MainCityFacilityEntryReadModel = {
  schema_version: 'main_city_facility_entry_read_model_v1'
  surfaceMode: 'same_surface_human_ai_readonly_v1'
  cityId: string
  centerTileId: string
  cityLabel: string
  factionId: FactionId
  ownerKind: MainCityFacilityEntryOwnerKind
  ownerPlayerId: string
  readonly: boolean
  footprintId: 'player_city_3x3_initial' | 'ai_city_3x3_initial'
  footprintSize: '3x3'
  anchorPolicy: 'center_cell'
  facilityTreePath: string
  interiorPath: string
  facilities: MainCityFacilityEntryItem[]
  selectedFacilityId: string
  observedAiPlayerId?: string
  observedAiPlayer?: MainCityFacilityEntryObservedAiPlayer
}

export type MainCityFacilityEntryReadModelResponse = {
  mainCityFacilityEntry: MainCityFacilityEntryReadModel
}

export type MainCityInteriorAssetKind = 'facility' | 'world_structure' | 'fallback'

export type MainCityInteriorAssetRef = {
  asset_id: string
  asset_kind: MainCityInteriorAssetKind
  variant: string
  level: number
  skin: string
  catalog_version: string
  fallback_path?: string
  remote_url?: string
  version?: string
}

export type MainCityInteriorAssetCatalogItem = MainCityInteriorAssetRef & {
  asset_kind: MainCityInteriorAssetKind
  display_name: string
  res_path?: string
}

export type MainCityInteriorPrimaryAction = {
  action_id: string
  label: string
  enabled: boolean
  disabled_reason?: string
}

export type MainCityInteriorTaxSlotState = 'collected' | 'collectable' | 'locked' | 'upcoming'

export type MainCityInteriorTaxScheduleSlot = {
  slot_id: string
  label: string
  time_label: string
  title: string
  state: MainCityInteriorTaxSlotState
  state_label: string
  collectable_now: boolean
  collected_today: boolean
  remaining_sec: number
  remaining_label: string
  reward_label: string
  asset_ref: MainCityInteriorAssetRef
  emphasized?: boolean
}

export type MainCityInteriorTaxRuntime = {
  mode: 'tax_schedule_runtime_v1'
  title: string
  city_label: string
  collectable_now: boolean
  next_collect_at: string
  next_collect_label: string
  remaining_sec: number
  remaining_label: string
  state_label: string
  hero_asset_ref: MainCityInteriorAssetRef
  primary_action: MainCityInteriorPrimaryAction
  schedule_slots: MainCityInteriorTaxScheduleSlot[]
}

export type MainCityInteriorConstructionDomain = 'city_inner' | 'world_outer'
export type MainCityInteriorConstructionType = 'facility_upgrade' | 'fortress_build' | 'camp_ready' | 'other'
export type MainCityInteriorConstructionState = 'running' | 'blocked' | 'complete' | 'waiting'

export type MainCityInteriorTargetCoord = {
  x: number
  y: number
}

export type MainCityInteriorConstructionWorkOrder = {
  queue_item_id: string
  domain: MainCityInteriorConstructionDomain
  queue_item_type: MainCityInteriorConstructionType
  title: string
  target_name: string
  location_label: string
  target_coord?: MainCityInteriorTargetCoord
  state: MainCityInteriorConstructionState
  state_label: string
  start_at: string
  end_at: string
  remaining_sec: number
  remaining_label: string
  progress_percent: number
  primary_action: MainCityInteriorPrimaryAction
  asset_ref: MainCityInteriorAssetRef
}

export type MainCityInteriorConstructionQueues = {
  mode: 'construction_work_orders_v1'
  city_inner: MainCityInteriorConstructionWorkOrder[]
  world_outer: MainCityInteriorConstructionWorkOrder[]
}

export type MainCityInteriorReadModel = {
  schema_version: 'main_city_interior_read_model_v1'
  player_id: string
  city_state_id: string
  generated_at: string
  asset_catalog_version: string
  asset_ref_mode: 'asset_ref_with_fallback_path_v1'
  tax_runtime: MainCityInteriorTaxRuntime
  construction_queues: MainCityInteriorConstructionQueues
  asset_catalog: MainCityInteriorAssetCatalogItem[]
}

export type MainCityInteriorReadModelResponse = {
  mainCityInterior: MainCityInteriorReadModel
}

export type WorldActionRequest =
  | {
      action: 'appendPlanningJobHistory'
      payload: {
        entry: PlanningJobHistoryEntry
      }
    }
  | {
      action: 'queuePlanExecution'
      payload: {
        plan: StrategicPlan
        source: PlanSource
        strategicCommand: string
        requestId: string
        basedOnWorldVersion: number
        factionId?: FactionId
        plannerNote?: string
        plannerExplanation?: string
        planningRationale?: string[]
        dispatchGenerals?: boolean
        generalConcurrency?: number
        generalSide?: FactionId
        generalDirectives?: GeneralDirective[]
        executionMode?: ExecutionEnqueueMode
        expectedExecutionRequestId?: string
      }
    }
  | {
      action: 'previewGeneralDirectives'
      payload: {
        directives: GeneralDirective[]
        side?: FactionId
        basePlan?: StrategicPlan
      }
    }
  | {
      action: 'previewDomainAgenda'
      payload?: {
        factionId?: FactionId
        domainId?: string
        includeMessages?: boolean
      }
    }
  | {
      action: 'previewNationalAgenda'
      payload?: {
        maxOptions?: number
      }
    }
  | {
      action: 'previewCourtSession'
      payload?: {
        maxProposals?: number
        maxOptions?: number
      }
    }
  | {
      action: 'queryCivilMemory'
      payload?: {
        limit?: number
        type?: CivilMemoryEventType
        tickFrom?: number
        tickTo?: number
        factionId?: FactionId
        relatedId?: string
      }
    }
  | {
      action: 'setGeneralTactic'
      payload: {
        factionId?: FactionId
        heroId: string
        tacticId: 'assault' | 'guard' | 'logistics'
      }
    }
  | {
      action: 'upgradeTacticalSkill'
      payload: {
        factionId?: FactionId
        heroId: string
        skillId: string
      }
    }
  | {
      action: 'setGeneralActiveHero'
      payload: {
        factionId?: FactionId
        heroId: string
      }
    }
    | {
      action: 'queueAiAgendaAction'
      payload: {
        factionId?: FactionId
        agendaActionId: 'agenda_expand' | 'agenda_support' | 'agenda_stabilize' | 'agenda_recover' | 'agenda_redeploy'
      }
    }
  | {
      action: 'setAiContextFocus'
      payload: {
        factionId?: FactionId
        contextFocusId: 'focus_city' | 'focus_troop' | 'focus_alliance' | 'focus_team'
        teamId?: string
        teamIndex?: number
        teamName?: string
        ownerType?: 'human' | 'ai'
        aiPlayerId?: string
        heroNames?: string[]
      }
    }
  | {
      action: 'advanceTick'
    }
  | {
      action: 'clearPlanExecution'
      payload?: {
        factionId?: FactionId
      }
    }
  | {
      action: 'moveUnit'
      payload: {
        factionId?: FactionId
        unitId: string
        targetTileId: string
      }
    }
  | {
      action: 'previewMovementGeography'
      payload: {
        factionId?: FactionId
        unitId?: string
        fromTileId: string
        targetTileId: string
      }
    }
  | {
      action: 'deployReserveHero'
      payload: {
        factionId: FactionId
        heroId: string
        coHeroIds?: string[]
        tileId: string
        aiPlayerId?: string
        teamId?: string
        teamIndex?: number
      }
    }
  | {
      action: 'configureDeployedUnitFormation'
      payload: {
        factionId?: FactionId
        unitId?: string
        teamId?: string
        teamIndex?: number
        heroIds: string[]
      }
    }
  | {
      action: 'upgradeHeroStar'
      payload: {
        factionId?: FactionId
        heroId: string
      }
    }
  | {
      action: 'upgradeCity'
      payload: {
        factionId?: FactionId
        tileId: string
      }
    }
  | {
      action: 'upgradeCityTech'
      payload: {
        factionId?: FactionId
        tileId: string
        techId: CityTechTrackId
      }
    }
  | {
      action: 'promoteCityBuilding'
      payload: {
        factionId?: FactionId
        cityId: string
        groupId: string
        buildingId: string
      }
    }
  | {
      action: 'queueTacticalOverride'
      payload: {
        factionId?: FactionId
        unitId: string
        templateId: TacticalTemplateId
        targetTileId: string
        summary: string
      }
    }
  | {
      action: 'updateAllianceDirective'
      payload: {
        regionId: string
        stance: AllianceStance
      }
    }
  | {
      action: 'updateAllianceFrontlineMarker'
      payload: {
        markerId: string
        factionId?: FactionId
        label: string
        fromCell: {
          x: number
          y: number
        }
        toCell: {
          x: number
          y: number
        }
        actorCommanderId?: string
        note?: string
        visibility?: 'alliance'
      }
    }
  | {
      action: 'allianceHelp'
      payload: {
        factionId?: FactionId
        regionId: string
      }
    }
  | {
      action: 'claimReward'
      payload?: {
        factionId?: FactionId
        rewardId?: string
      }
    }
  | {
      action: 'achieveWorldAffairsNode'
      payload: {
        factionId?: FactionId
        scenarioId: string
        scenarioVersion: string
        seasonRunId?: string
        nodeId: string
      }
    }
  | {
      action: 'claimWorldAffairsNodeReward'
      payload: {
        factionId?: FactionId
        scenarioId: string
        scenarioVersion: string
        seasonRunId?: string
        nodeId: string
      }
    }
  | {
      action: 'achieveTaskPrototype'
      payload: {
        factionId?: FactionId
        scenarioId: string
        scenarioVersion: string
        seasonRunId?: string
        taskId: string
      }
    }
  | {
      action: 'claimTaskReward'
      payload: {
        factionId?: FactionId
        scenarioId: string
        scenarioVersion: string
        seasonRunId?: string
        taskId: string
      }
    }
  | {
      action: 'recordWorldTaskEvent'
      payload: {
        factionId?: FactionId
        scenarioId: string
        scenarioVersion: string
        seasonRunId?: string
        taskId: string
        kind: TaskRealAuthoritySignalKind
        source?: WorldTaskEventSource
        sourceId?: string
        summary?: string
      }
    }
  | {
      action: 'issueClaimableReward'
      payload: {
        factionId?: FactionId
        rewardId?: string
        ledgerKey?: string
        source: 'daily_welfare' | 'event_reward'
        label?: string
        summary?: string
        reward: RewardBundle
      }
    }
  | {
      action: 'transferFactionResourcesToGovernor'
      payload: {
        sourceFactionId: FactionId
        sourceAiPlayerId: string
        governorPlayerId: string
        resources: Partial<ResourceTransferBundle>
        reason: string
        approvedBy: string
      }
    }
  | {
      action: 'openSeaRoute'
      payload: {
        factionId?: FactionId
        sourceDockId: string
        overseasContactId: string
        actorAiPlayerId?: string
        inventoryFleetId?: string
      }
    }
  | {
      action: 'seaPatrolScout'
      payload: {
        factionId?: FactionId
        routeId: string
        sourceDockId: string
        overseasContactId: string
        actorAiPlayerId?: string
      }
    }
  | {
      action: 'seaPatrolIntercept'
      payload: {
        factionId?: FactionId
        routeId: string
        sourceDockId: string
        overseasContactId: string
        attackerVesselType: 'light_patrol_warship' | 'interceptor_warship' | 'transport_warship'
        defenderVesselType: 'light_patrol_warship' | 'interceptor_warship' | 'transport_warship'
        actorAiPlayerId?: string
        inventoryFleetId?: string
      }
    }
  | {
      action: 'createNavalFleet'
      payload: {
        factionId?: FactionId
        routeId: string
        sourceDockId: string
        overseasContactId: string
        vesselType: NavalVesselType
        carriedUnitIds?: string[]
        actorAiPlayerId?: string
      }
    }
  | {
      action: 'sailNavalRoute'
      payload: {
        factionId?: FactionId
        fleetId: string
        routeId: string
        actorAiPlayerId?: string
      }
    }
  | {
      action: 'resolveNavalCombatSettlement'
      payload: {
        factionId?: FactionId
        routeId: string
        attackerFleetId: string
        defenderFleetId: string
        actorAiPlayerId?: string
        inventoryFleetId?: string
      }
    }
  | {
      action: 'repairNavalFleetDamage'
      payload: {
        factionId?: FactionId
        fleetId: string
        routeId: string
        actorAiPlayerId?: string
      }
    }
  | {
      action: 'buildNavalWarshipAtHarbor'
      payload: {
        factionId?: FactionId
        routeId: string
        sourceDockId: string
        overseasContactId: string
        shipClass: NavalVesselType
        actorAiPlayerId?: string
      }
    }
  | {
      action: 'openNavalHarborInventory'
        payload: {
          factionId?: FactionId
          harborId: string
          inventoryFleetId?: string
          actorAiPlayerId?: string
        }
      }
  | {
      action: 'readNavalRouteEncounter'
      payload: {
        factionId?: FactionId
        routeId: string
        harborId: string
        inventoryFleetId?: string
        missionType: NavalRouteEncounterMissionType
        routeRisk?: number
        seaWeatherRisk?: number
        enemyPresence: NavalRouteEncounterEnemyPresence
        enemyStrength?: number
        fleetStrength?: number
        durabilityPercent?: number
        supplyReadiness?: number
        patrolIntensity?: number
        allySupport?: number
        distanceFromHarbor?: number
        actorAiPlayerId?: string
      }
    }
  | {
      action: 'setAiResourceTransferPolicy'
      payload: {
        factionId?: FactionId
        dailyQuotaTotal?: number
        dailyWindowTicks?: number
        cooldownTicks?: number
      }
    }
  | {
      action: 'claimGovernorResourceInbox'
      payload: {
        factionId?: FactionId
        governorPlayerId: string
        transferId?: string
      }
    }
  | {
      action: 'gatherAiResourceTile'
      payload: {
        factionId?: FactionId
        aiPlayerId: string
        unitId: string
        tileId: string
      }
    }
    | {
      action: 'occupyTile'
      payload: {
        factionId?: FactionId
        aiPlayerId?: string
        unitId: string
        tileId: string
      }
    }
  | {
      action: 'seedBattleReportClosure'
      payload?: {
        factionId?: FactionId
        aiPlayerId?: string
        organizationId?: string
        organizationName?: string
        organizationKind?: 'alliance' | 'nation'
        repeatCount?: number
        allowReusableSeedTargets?: boolean
      }
    }
  | {
      action: 'seedRecruitDrawFixture'
      payload?: {
        factionId?: FactionId
        minimumDrawCount?: number
        minimumProspectCount?: number
      }
    }
  | {
      action: 'seedNationEmpireSuccessFixture'
      payload?: {
        factionId?: FactionId
      }
    }
  | {
      action: 'issueNationMidgameLuoyangAuthorityClaim'
      payload: {
        factionId?: FactionId
        sourcePageId: 'nation/midgame'
        targetLabel: '洛阳'
        organizationId?: string
        nationObjectiveId?: string
      }
    }
  | {
      action: 'recordNationMidgameLuoyangBattleReportFeedback'
      payload: {
        factionId?: FactionId
        sourceLuoyangContestId: string
        sourcePageId: 'nation/midgame'
        targetLabel: '洛阳'
        organizationId?: string
        reportStatus?: 'recorded'
      }
    }
  | {
      action: 'recordNationMidgameLuoyangControlAuthority'
      payload: {
        factionId?: FactionId
        sourceLuoyangContestId: string
        sourceOrganizationReportId?: string
        sourcePageId: 'nation/midgame'
        targetLabel: '洛阳'
        organizationId?: string
        controlStatus?: 'recorded'
      }
    }
  | {
      action: 'recordNationMidgameLuoyangPrefectureControlJudgment'
      payload: {
        factionId?: FactionId
        sourceControlAuthorityId: string
        sourceLuoyangControlProgressId: string
        sourcePageId: 'nation/midgame'
        targetLabel: '洛阳'
        organizationId?: string
        nextStepLabel?: string
      }
    }
  | {
      action: 'recordNationMidgameCityControlJudgment'
      payload: {
        factionId?: FactionId
        cityId: string
        cityName: string
        administrativeRole?: 'state_government' | 'commandery_seat' | 'city'
        sourceControlAuthorityId: string
        sourceControlProgressId: string
        sourcePageId: 'nation/midgame'
        organizationId?: string
        nextStepLabel?: string
      }
    }
  | {
      action: 'recordNationMidgameRealmObjectiveBridge'
      payload: {
        factionId?: FactionId
        sourceControlAuthorityId: string
        sourceLuoyangControlProgressId: string
        sourcePageId: 'nation/midgame'
        targetLabel: '王国目标' | '帝国目标' | '洛阳前置'
        organizationId?: string
        nextStepLabel?: string
      }
    }
  | {
      action: 'recordNationMidgameLongTermControlTickPrecondition'
      payload: {
        factionId?: FactionId
        cityId: string
        cityName: string
        administrativeRole?: 'state_government' | 'commandery_seat' | 'city'
        sourceControlAuthorityId: string
        sourceControlProgressId: string
        sourcePageId: 'nation/midgame'
        organizationId?: string
        tickAdvanceCount?: number
        nextStepLabel?: string
      }
    }
  | {
      action: 'seedMapUnitVisualSouthExitFixture'
      payload?: {
        factionId?: FactionId
        originTileId?: string
        targetTileId?: string
      }
    }
  | {
      action: 'seedTileActionHudExpeditionFixture'
      payload?: {
        factionId?: FactionId
        tileId?: string
        unitId?: string
      }
    }
  | {
      action: 'seedProductionResourceTileActionHudFixture'
      payload?: {
        factionId?: FactionId
        tileId?: string
        unitId?: string
      }
    }
  | {
      action: 'seedZeroLevelSubstrateTileActionHudFixture'
      payload?: {
        factionId?: FactionId
        tileId?: string
      }
    }
  | {
      action: 'buildResourceTileCoverageMatrixFixture'
      payload?: {
        factionId?: FactionId
      }
    }
  | {
      action: 'seedMainCityTroopFormationMultiTeamFixture'
      payload?: {
        factionId?: FactionId
        aiPlayerId?: string
        firstTeamId?: string
        secondTeamId?: string
        firstTeamIndex?: number
        secondTeamIndex?: number
        teamCount?: number
        forceInvalidPortraitAssetKey?: boolean
        forceEmptyTeamSlots?: boolean
      }
    }
  | {
      action: 'claimMainMapCell'
      payload: {
        worldId: string
        coordinateSpace?: string
        factionId: FactionId
        requestId: string
        cellX: number
        cellY: number
        expectedOwner?: string
        expectedCellVersion?: number
      }
    }
  | {
      action: 'releaseMainMapCell'
      payload: {
        worldId: string
        coordinateSpace?: string
        factionId: FactionId
        requestId: string
        cellX: number
        cellY: number
        expectedOwner?: string
        expectedCellVersion?: number
      }
    }
  | {
      action: 'healTroop'
      payload: {
        factionId?: FactionId
        aiPlayerId: string
        unitId: string
      }
    }
  | {
      action: 'promoteTroopFacilityBuilding'
      payload: {
        factionId?: FactionId
        unitId: string
        facilityId: string
        buildingId: string
      }
    }
  | {
      action: 'setRecruitSelectedPool'
      payload: {
        factionId?: FactionId
        poolId: string
      }
    }
  | {
      action: 'recruitProspectHero'
      payload: {
        factionId?: FactionId
        count?: number
        poolId?: string
      }
    }
  | {
      action: 'enqueueAffair'
      payload: {
        factionId?: FactionId
        cityId: string
        affairId: string
      }
    }

export type WorldActionHeroReadModel = {
  heroId: string
  name: string
  factionId: FactionId
  unitId?: string
  level: number
  exp: number
  starLevel: number
  starCap: number
}

export type WorldActionReadModelRefreshReceipt = {
  endpoint: string
  method: 'GET'
  strategy: 'refetch_after_success'
}

export type WorldActionReceipt = {
  action: string
  factionId?: FactionId
  aiPlayerId?: string
  governorPlayerId?: string
  heroId?: string
  heroIds?: string[]
  heroNames?: string[]
  poolId?: string
  skillId?: string
  techId?: string
  unitId?: string
  tileId?: string
  cityId?: string
  groupId?: string
  facilityId?: string
  buildingId?: string
  cellId?: string
  worldId?: string
  coordinateSpace?: string
  cellX?: number
  cellY?: number
  chunkId?: string
  previousOwner?: string
  owner?: string
  nextOwner?: string
  abandoned?: boolean
  clearedGatherClaim?: boolean
  previousCellVersion?: number
  nextCellVersion?: number
  immunityUntil?: string
  immunity_until?: string
  immunityActive?: boolean
  immunity_active?: boolean
  immunitySource?: string
  immunity_source?: string
  occupied?: boolean
  guardTemplateId?: string
  previousLevel?: number
  nextLevel?: number
  previousExp?: number
  nextExp?: number
  expGained?: number
  previousStarLevel?: number
  nextStarLevel?: number
  failureCode?: string
  internalOnly?: boolean
  resources?: Partial<{
    food: number
    wood: number
    stone: number
    iron: number
  }>
  resourcesSpent?: Partial<{
    actionPoints: number
    food: number
    wood: number
    stone: number
    iron: number
    copper: number
    developmentPoints: number
  }>
  strengthBefore?: number
  strengthAfter?: number
  supplyBefore?: number
  supplyAfter?: number
  bonusPointsAwarded?: number
  hero?: WorldActionHeroReadModel
  resourceEconomyModelVersion?: string
  resourceEconomyConfigVersion?: string
  resourceEconomyConfigSource?: 'shared/domain/resourceTileEconomyConfig.ts'
  resourceTileSettlementStatus?: 'ready' | 'not_resource_tile' | 'unsupported_resource_level' | 'unsupported_resource_kind'
  tileLevel?: number
  resourceKind?: ResourceKind
  baseYieldPerHour?: ResourceTileEconomyRangeReadModel
  ongoingYieldPerHour?: ResourceTileEconomyRangeReadModel
  defenderStrength?: ResourceTileEconomyRangeReadModel
  defenderStrengthRange?: ResourceTileEconomyRangeReadModel
  defenderTroopCount?: ResourceTileEconomyRangeReadModel
  defenderTroopCountRange?: ResourceTileEconomyRangeReadModel
  recommendedPower?: number
  captureReward?: ResourceTileCaptureRewardReadModel
  captureRewardUsesResourceLevel?: true
  resourceRewardDelta?: Partial<{
    food: number
    wood: number
    stone: number
    iron: number
  }>
  battleReportResourceRewardDelta?: Partial<{
    food: number
    wood: number
    stone: number
    iron: number
  }>
  guardSoldiersLabel?: string
  recommendedPowerLabel?: string
  captureRewardLabel?: string
  battleReportRewardLabel?: string
  taskProgressDelta?: Partial<{
    taskId: string
    eventId: string
    kind: TaskRealAuthoritySignalKind
    source: WorldTaskEventSource
    sourceId: string
    status: 'achieved'
    claimState: 'claimable'
    canClaim: true
    settlementAuthority: 'real_authority'
  }>
  landResourceExpeditionBlocked?: true
  landFirstMvpGlobalProductContractOk?: true
  l10NotRequiredForCurrentMvp?: true
  copperCurrencySuccessPathOpened?: false
  landFirstMvpProductForbiddenHits?: string[]
  l1L9YieldCurveBounded?: true
  l0SubstrateYieldPerHour?: 0
  l0SubstrateExpeditionRewardBlocked?: true
  resourceTileExpeditionPreview?: ResourceTileExpeditionPreviewReadModel
  resourceTileBackendSettlementReadbackScope?: 'resource_tile_backend_settlement_readback_only_not_godot_art'
  readModelRefresh?: WorldActionReadModelRefreshReceipt
  routeId?: string
  routeStatus?: SeaRouteStatus['status']
  blockedReason?: string | null
  travelCost?: SeaRouteTravelCost
  overseasContactId?: string
  sourceDockId?: string
  movementGeographyFeedback?: MovementGeographyFeedback
  patrolReportId?: string
  interceptReportId?: string
  patrolKind?: 'scout'
  patrolStatus?: 'scout_report_ready'
  maritimeActivityChipId?: string
  maritimeReportResultChipId?: string
  navalBattleScope?: 'patrol_scout_only_no_full_naval_combat' | 'patrol_intercept_minimal_battle_report_only' | 'fleet_combat_minimal_settlement_only'
  regionTokenId?: string
  actorAiPlayerId?: string
  battleReportSurface?: 'battle_report_panel/list/detail'
  attackerVesselType?: 'light_patrol_warship' | 'interceptor_warship' | 'transport_warship'
  defenderVesselType?: 'light_patrol_warship' | 'interceptor_warship' | 'transport_warship'
  attackerCarriedUnitCapacity?: number
  defenderCarriedUnitCapacity?: number
  attackerCombatBonusPercent?: number
  defenderCombatBonusPercent?: number
  interceptOutcome?: 'interceptor_advantage' | 'light_patrol_evade' | 'transport_numbers_advantage' | 'balanced_maritime_clash'
  fleetId?: string
  fleetRuntimeStatus?: NavalFleetRuntimeStatus
  fleetFrameSlotId?: string
  fleetCarriedUnitCapacity?: number
  fleetCarriedUnitIds?: string[]
  fleetCombatBonusPercent?: number
  fleetRouteLineStatus?: 'route_line_visible'
  fleetProgressPercent?: number
  navalRuntimeAdapterStatus?: 'naval_runtime_adapter_v0_1'
  fleetMovementRuntimeStatus?: 'dedicated_naval_runtime_not_land_unit_marker'
  fleetDoesNotUseUnitMarker?: true
  navalCombatSettlementId?: string
  battleReportId?: string
  attackerFleetId?: string
  defenderFleetId?: string
  attackerFleetFrameSlotId?: string
  defenderFleetFrameSlotId?: string
  navalCombatOutcome?: NavalCombatSettlementOutcome
  navalCombatWinnerFleetId?: string
  navalCombatLoserFleetId?: string
  navalCombatDamageSummary?: string
  navalCombatLossSummary?: string
  navalCombatUsesExistingBattleReport?: true
  navalCombatDoesNotUseUnitMarker?: true
  damagedFleetId?: string
  damagedFleetDamageState?: NavalFleetDamageState
  damagedFleetRepairStatus?: NavalFleetRepairStatus
  fleetDamageState?: 'damaged'
  damagedFleetDamageSummary?: string
  damagedFleetLossSummary?: string
  damagePersistsAfterSettlement?: true
  repairReportId?: string
  returnHarborRepairId?: string
  repairStatus?: 'queued' | 'recorded'
  repairFeedbackVisibleCopy?: string
  repairScope?: 'minimal_damage_status_not_full_fleet_inventory'
  repairActionStatus?: 'returning_to_port'
  harborId?: string
  harborName?: string
  fleetCardVisible?: true
  fleetStatusLabel?: string
  fleetDurability?: number
  durabilityLabel?: string
  riskLabel?: string
  recommendedActionLabel?: '出港' | '巡逻' | '拦截' | '整补' | '待命' | '避战' | '回港'
  resultLabel?: '海面平静' | '发现敌船' | '可拦截' | '风险过高'
  missionType?: NavalRouteEncounterMissionType
  missionAllowed?: boolean
  readinessScore?: number
  riskScore?: number
  shouldRepair?: boolean
  shouldPatrol?: boolean
  shouldIntercept?: boolean
  shouldHold?: boolean
  deploymentMissionAllowed?: boolean
  deploymentRiskScore?: number
  deploymentShouldIntercept?: boolean
  deploymentReadinessUsesSharedDomainPolicy?: true
  deploymentPolicyScope?: 'naval_deployment_readiness_only_not_full_fleet_management'
  navalRouteEncounterPolicyVersion?: 'naval_route_encounter_policy_v1'
  navalRouteEncounterScope?: 'naval_route_encounter_service_readback_only_not_godot_ui'
  readbackUsesNavalRouteEncounterPolicy?: true
  encounterState?: NavalRouteEncounterState
  combatExpected?: boolean
  interceptAllowed?: boolean
  shouldReturnToHarbor?: boolean
  shouldAvoid?: boolean
  successChance?: number
  expectedDamageRange?: NavalRouteEncounterDamageRange
  harborHudActionButtonStateOk?: true
  feedbackVisible?: true
  worldNavalHarborDeploymentReadinessOk?: true
  worldNavalHarborDeploymentReadinessScope?: 'deployment_readiness_hud_only_not_full_fleet_management'
  harborSurfaceVisible?: true
  harborCopyAllowedOnlyOnHarborSurface?: true
  landSurfaceNavalCopyLeak?: boolean
  playerVisibleEngineeringCopyLeak?: boolean
  visibleCopyForbiddenHits?: string[]
  worldNavalHarborInventoryScope?: 'harbor_inventory_open_only_not_full_fleet_management'
  shipyardOrderId?: string
  shipClass?: NavalVesselType
  buildStatus?: NavalShipyardBuildStatus
  inventoryFleetId?: string
  reusedFleetId?: string
  sourceShipyardOrderId?: string
  reuseStatus?: 'patrol_reuse_ready' | 'route_patrol_intercept_reused'
  worldNavalReuseUsesExistingSeaRuntime?: true
  worldNavalReuseDoesNotUseUnitMarker?: true
  worldNavalReuseScope?: 'shipyard_inventory_reuse_only_not_full_fleet_inventory_ui'
  worldNavalCombatUsesInventoryFleet?: true
  worldNavalCombatUsesExistingSeaRuntime?: true
  worldNavalCombatDoesNotUseUnitMarker?: true
  worldNavalCombatDamageRepairScope?: 'inventory_fleet_combat_damage_repair_only_not_full_fleet_ui'
  addedShipCount?: number
  inventoryDelta?: number
  shipyardScope?: NavalShipyardScope
  shipyardReportId?: string
  shipyardFeedbackVisibleCopy?: string
  sourcePageId?: 'nation/midgame'
  targetLabel?: '洛阳' | '王国目标' | '帝国目标' | '洛阳前置'
  luoyangContestId?: string
  contestStatus?: 'recorded' | 'mobilizing' | 'contested'
  sourceLuoyangContestId?: string
  organizationReportId?: string
  sourceOrganizationReportId?: string
  controlAuthorityId?: string
  prefectureControlProgressId?: string
  controlStatus?: 'recorded'
  prefectureControlJudgmentId?: string
  prefectureControlJudgmentStatus?: 'controlled'
  ownershipTransferApplied?: false
  cityControlJudgmentId?: string
  cityName?: string
  cityControlAdministrativeRole?: 'state_government' | 'commandery_seat' | 'city'
  cityControlJudgmentStatus?: 'controlled'
  cityControlJudgmentKind?: 'prefectureControlJudgment' | 'commanderyControlJudgment' | 'cityControlJudgment'
  cityControlScope?: 'city_control_judgment_only_not_ownership_transfer'
  sourceControlAuthorityId?: string
  sourceControlProgressId?: string
  sourceLuoyangControlProgressId?: string
  realmObjectiveProgressId?: string
  kingdomObjectivePrerequisiteProgress?: string
  empireObjectivePrerequisiteProgress?: string
  kingdomObjectivePrerequisiteVisible?: boolean
  empireObjectivePrerequisiteVisible?: boolean
  nextStepLabel?: string
  usesOrganizationNationSurface?: boolean
  usesCurrentGoalsSurface?: boolean
  reportStatus?: 'recorded'
  usesExistingBattleReportSurface?: boolean
  usesOrganizationReportSurface?: boolean
  organizationId?: string
  nationObjectiveId?: string
  playerOrganizationResult?: string
  nationMidgameAuthorityScope?: 'luoyang_prefecture_authority_only_not_full_unification'
  nationMidgameBattleReportScope?: 'luoyang_feedback_only_not_full_prefecture_control'
  nationMidgameControlScope?: 'luoyang_control_authority_only_not_full_occupation'
  nationMidgamePrefectureControlJudgmentScope?: 'luoyang_prefecture_control_judgment_only_not_ownership_transfer'
  nationMidgameRealmObjectiveBridgeScope?: 'realm_objective_bridge_only_not_full_kingdom_empire_creation'
  longTermControlPreconditionId?: string
  longTermControlHeldTicks?: number
  longTermControlRequiredTicks?: number
  ownerTransferPreconditionReady?: boolean
  nationMidgameLongTermControlScope?: 'long_term_control_tick_precondition_only_not_owner_transfer'
}

export type WorldActionResponse = {
  ok: boolean
  worldVersion: number
  tick: number
  world?: WorldState
  message?: string
  failureCode?: string
  immunityUntil?: string
  immunity_until?: string
  immunityActive?: boolean
  immunity_active?: boolean
  immunitySource?: string
  immunity_source?: string
  requestId?: string
  unitId?: string
  aiPlayerId?: string
  teamId?: string
  teamIndex?: number
  heroId?: string
  heroIds?: string[]
  heroNames?: string[]
  tacticId?: string
  contextFocusId?: string
  relatedId?: string
  execution?: SlgAiExecutionState
  receipt?: WorldActionReceipt
  domainAgenda?: DomainAgenda
  domainCommMetrics?: DomainCommMetricsSnapshot
  domainMessages?: BusMessage[]
  nationalAgenda?: NationalAgendaWindow
  courtSession?: CourtSession
  civilMemoryEntries?: CivilMemoryEntry[]
  seededBattleReportCount?: number
  seededBattleReportPlayerOwnedCount?: number
  seededBattleReportAiOwnedCount?: number
  seededBattleReportOrganizationOwnedCount?: number
  seededBattleReportReplayRequestId?: string
  seededBattleReportRepeatCount?: number
  seededBattleReportReusableTargets?: boolean
  seededBattleReportActions?: Array<{
    role: 'player' | 'ai' | 'organization'
    unitId: string
    tileId: string
    battleRecordId?: string
    replayRequestId?: string
    occupied: boolean
    guardTemplateId?: string
  }>
  seededMapUnitVisualExitFixture?: {
    originTileId: string
    targetTileId: string
    direction: string
    previousTerrain?: string
    nextTerrain: string
    previousOwner?: string
    nextOwner: string
  }
  seededTileActionHudExpeditionFixture?: {
    factionId: FactionId
    tileId: string
    unitId: string
    cellX?: number
    cellY?: number
    tileLevel: number
    resourceKind?: string
    defenderStrength: number
    guardTemplateId?: string
    resourceEconomyModelVersion?: string
    baseYieldPerHour?: ResourceTileEconomyRangeReadModel
    defenderTroopCount?: ResourceTileEconomyRangeReadModel
    recommendedPower?: number
    captureReward?: ResourceTileCaptureRewardReadModel
  }
  seededProductionResourceTileActionHudFixture?: {
    factionId: FactionId
    tileId: string
    unitId: string
    cellX?: number
    cellY?: number
    tileLevel: number
    resourceKind: string
    defenderStrength: number
    guardTemplateId: string
    resourceEconomyModelVersion: string
    productionTileUsesGeneratedResourceTable: true
    l1L9YieldCurveBounded: true
    baseYieldPerHour: ResourceTileEconomyRangeReadModel
    defenderTroopCount: ResourceTileEconomyRangeReadModel
    recommendedPower: number
    captureReward: ResourceTileCaptureRewardReadModel
    resourcePreviewUsesSharedDomainPolicy: true
    resourceTileExpeditionPreview: ResourceTileExpeditionPreviewReadModel
    scope: 'ordinary_l1_l9_resource_tile_not_fixture_seed_only'
  }
  seededZeroLevelSubstrateTileActionHudFixture?: {
    factionId: FactionId
    tileId: string
    cellX?: number
    cellY?: number
    tileLevel: 0
    resourceEconomyModelVersion: string
    l0SubstrateYieldPerHour: 0
    hasResourceYield: false
    hasResourceGuard: false
    expeditionRewardBlocked: true
    scope: 'zero_level_substrate_not_l10_missing_tile'
  }
  resourceTileCoverageMatrixFixture?: {
    worldTileResourceCoverageMatrixOk: true
    resourceCoverageUsesSharedDomainPolicy: true
    coverageTileCount: number
    coveredLevels: number[]
    coveredResourceKinds: string[]
    samples: Array<{
      tileId: string
      tileLevel: number
      resourceKind: string
      resourceLabel: string
      resourceYieldLabel: string
      captureRewardLabel: string
      defenderStrengthLabel: string
      defenderTroopCount: number
      recommendedPower: number
      recommendedPowerLabel: string
      difficultyLabel: string
      riskLabel: string
    }>
    zeroLevelSubstrateProtected: true
    l10NotRequiredForCurrentMvp: true
    playerVisibleEngineeringCopyLeak: false
    visibleCopyForbiddenHits: string[]
  }
  seededMainCityTroopFormationMultiTeamFixture?: {
    factionId: FactionId
    aiPlayerId: string
    teamIds: string[]
    teamIndexes: number[]
    unitIds: string[]
  }
  seededNationEmpireSuccessFixture?: {
    factionId: FactionId
    controlledCommanderyCityCount: number
    controlledStateCapitalCount: number
    allianceLevel: number
    jade: number
    nationTier: 'kingdom'
  }
}
