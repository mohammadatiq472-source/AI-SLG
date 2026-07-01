import type { PlanningJobHistoryEntry, StrategicPlan } from './planning'
import type {
  ActionType,
  ExecutionReplayOutcome,
  FactionId,
  OrderStatus,
  PlanSource,
  ReplayHighlightKind,
  ReplayHighlightSeverity,
} from './common'
import type { CivilMemoryEntry } from '../civilMemory'

export type AllianceActionSummary = {
  id: string
  tick: number
  regionId: string
  title: string
  detail: string
  severity: ReplayHighlightSeverity
  unitId?: string
  tileId?: string
  fromTileId?: string
  toTileId?: string
  factionId?: FactionId
}

export type BattleOutcomeRecord = {
  id: string
  tick: number
  regionId: string
  /** 区域展示名（供战报列表直接消费） */
  region?: string
  tileId: string
  ownerFactionId?: FactionId
  attackerFaction: FactionId
  attackerFactionId?: FactionId
  defenderFactionId?: FactionId
  attackerUnitId: string
  aiPlayerId?: string
  attackerAiPlayerId?: string
  defenderAiPlayerId?: string
  organizationId?: string
  organizationName?: string
  organizationKind?: 'alliance' | 'nation'
  outcome: 'win' | 'loss' | 'draw'
  attackerLoss: number
  defenderLoss: number
  alliedSupport: number
  summary: string
  reportKind?: 'resource_guard' | 'field_battle' | 'city_siege'
  result?: '胜' | '败' | '平'
  time?: string
  location?: string
  tileX?: number
  tileY?: number
  attacker?: string
  defender?: string
  attackerTroops?: number
  attackerMaxTroops?: number
  defenderTroops?: number
  defenderMaxTroops?: number
  attackerStrengthBefore?: number
  attackerStrengthAfter?: number
  defenderStrengthBefore?: number
  defenderStrengthAfter?: number
  rounds?: BattleReportRoundDetail[]
  attackerHeroSlot?: BattleReportHeroSlotReadModel
  defenderHeroSlot?: BattleReportHeroSlotReadModel
  attackerUnit?: BattleReportUnitReadModel
  defenderUnit?: BattleReportUnitReadModel
  attackerUnits?: BattleReportUnitReadModel[]
  defenderUnits?: BattleReportUnitReadModel[]
  replayRequestId?: string
}

export type BattleReportRoundDetail = {
  round: number
  title: string
  summary: string
  events: BattleReportRoundEvent[]
}

export type BattleReportRoundEvent = {
  actor: 'attacker' | 'defender' | 'system'
  summary: string
  skillName?: string
  activated?: boolean
  damage?: number
  healing?: number
  preventedDamage?: number
  notes?: string[]
}

export type BattleReportHeroSlotReadModel = {
  heroId: string
  name: string
  level: number
  quality: string
  starCount: number
  faction: string
  factionLabel: string
  cardType: string
  portraitKey: string
  avatarKey: string
  portraitAssetKey: string
  mainSkillName?: string
  signatureSkillName?: string
  currentTroops?: number
  maxTroops?: number
  lossTroops?: number
}

export type BattleReportUnitReadModel = {
  unitId: string
  name: string
  currentTroops?: number
  maxTroops?: number
  lossTroops?: number
  hero: BattleReportHeroSlotReadModel
  coHeroes?: BattleReportHeroSlotReadModel[]
}

export type DiplomacyAgreementType = 'ceasefire' | 'alliance' | 'trade'

export type DiplomacyAgreement = {
  id: string
  tick: number
  type: DiplomacyAgreementType
  parties: [string, string]
  duration: number
  terms: string
}

export type OperationalFeedback = {
  allianceActions: AllianceActionSummary[]
  battleRecords: BattleOutcomeRecord[]
  diplomacyAgreements: DiplomacyAgreement[]
  /** 游戏是否已结束（advanceTick 调用 checkVictoryConditions 后写入） */
  gameEnded?: {
    winner: string
    condition: string | null
    reason: string
  }
}
export type Report = {
  id: string
  tick: number
  title: string
  detail: string
}

export type NarrativeEvent = {
  id: string
  tick: number
  type: 'battle' | 'diplomacy' | 'betrayal' | 'achievement' | 'failure'
  actors: string[]
  summary: string
  causalChain: string[]
  consequences: string[]
  significance: 'minor' | 'major' | 'epic'
}

export type NarrativeEventsResponse = {
  items: NarrativeEvent[]
}

export type ReplayOrderSnapshot = {
  orderId: string
  unitId: string
  action: ActionType
  target: string
  status: OrderStatus
  message?: string
}

export type ReplayHighlight = {
  id: string
  kind: ReplayHighlightKind
  severity: ReplayHighlightSeverity
  title: string
  detail: string
  unitId?: string
  tileId?: string
  fromTileId?: string
  toTileId?: string
  factionId?: FactionId
}

export type ExecutionReplayFrame = {
  tick: number
  worldVersion: number
  label: string
  frontlineSummary: string
  latestReports: string[]
  highlights: ReplayHighlight[]
  orderStates: ReplayOrderSnapshot[]
}

export type ExecutionReplay = {
  requestId: string
  source: PlanSource
  strategicCommand: string
  basedOnWorldVersion: number
  createdTick: number
  createdWorldVersion: number
  reviewAtTick: number
  plannerNote?: string
  plannerExplanation?: string
  planningRationale?: string[]
  plan: StrategicPlan
  outcome: ExecutionReplayOutcome
  completedTick?: number
  completedWorldVersion?: number
  frames: ExecutionReplayFrame[]
}

export type HistoryState = {
  planningJobs: PlanningJobHistoryEntry[]
  executionReplays: ExecutionReplay[]
}
export type WorldEventCategory =
  | 'world_action'
  | 'planning'
  | 'replay'
  | 'persistence'
  | 'system'

export type WorldEventRecord = {
  id: string
  category: WorldEventCategory
  action: string
  success: boolean
  tick: number
  worldVersion: number
  createdAt: string
  requestId?: string
  message?: string
  metadata?: Record<string, unknown>
}

export type ReplayArchiveEntry = {
  requestId: string
  source: PlanSource
  strategicCommand: string
  basedOnWorldVersion: number
  outcome: ExecutionReplayOutcome
  frameCount: number
  createdAt: string
  updatedAt: string
}

export type ReplayArchiveResponse = {
  items: ReplayArchiveEntry[]
}

export type WebSocketObservabilityError = {
  at: string
  stage: string
  factionId: string | null
  message: string
}

export type WebSocketObservabilityStats = {
  totalConnections: number
  subscribedConnections: number
  factionDistribution: Record<string, number>
  recentErrors: WebSocketObservabilityError[]
  maxConnections: number
  maxSubscriptionsPerFaction: number
  maxVisibleEventsPerTick: number
  maxVisibleUnitChangesPerTick: number
  maxVisibleTileChangesPerTick: number
  rejectedConnections: number
  rejectedSubscriptions: number
  truncatedTickDeltaMessages: number
}

export type WorldEventsResponse = {
  items: WorldEventRecord[]
  wsStats?: WebSocketObservabilityStats
}

export type MemoryProviderRequested = 'mem0' | 'in_memory'
export type MemoryProviderActive = MemoryProviderRequested | 'unknown'
export type MemoryProviderLifecycle = 'uninitialized' | 'ready' | 'degraded'

export type MemoryProviderObservability = {
  requestedProvider: MemoryProviderRequested
  activeProvider: MemoryProviderActive
  lifecycle: MemoryProviderLifecycle
  downgraded: boolean
  reason?: string
  updatedAt: string
}

export type CivilMemoryObservabilityResponse = {
  items: CivilMemoryEntry[]
  memoryProvider: MemoryProviderObservability
}

export type SaveSlotRecord = {
  slotId: string
  label: string
  tick: number
  worldVersion: number
  savedAt: string
  ownerFactionId?: string
  ownerSessionId?: string
}

export type SaveSlotsResponse = {
  slots: SaveSlotRecord[]
}

export type SaveWorldSlotRequest = {
  slotId: string
  label?: string
}

export type LoadWorldSlotRequest = {
  slotId: string
}

export type PlayerWorldTimelineCategory =
  | 'battle'
  | 'court'
  | 'diplomacy'
  | 'economy_city'
  | 'ai_activity'
  | 'organization_nation'
  | 'map_change'
  | 'system'

export type PlayerWorldTimelineSeverity = 'low' | 'medium' | 'high' | 'critical'

export type PlayerWorldTimelineCard = {
  contractId: 'player_world_timeline_read_model_v1'
  id: string
  category: PlayerWorldTimelineCategory
  actorName: string
  title: string
  summary: string
  locationLabel?: string
  targetLabel?: string
  resultLabel: string
  consequenceLabel?: string
  nextActionLabel?: string
  sharePolicy?: 'explicit_spectator'
  shareStateLabel?: string
  shareRetentionLabel?: string
  severity: PlayerWorldTimelineSeverity
  timestampBucket: string
  sourceRefs?: {
    visibility: 'internal_link_only'
    visible: false
    battleReportId?: string
    replayRequestId?: string
    saveSlotId?: string
    worldEventId?: string
    civilMemoryId?: string
  }
}

export type PlayerHistoryNotificationAnchor = {
  contractId: 'player_history_notification_anchor_v1'
  id: string
  durableCardAnchor: string
  dedupeKey: string
  budgetSlot: number
  accessState: 'open' | 'private' | 'denied'
  accessFeedbackLabel: string
  title: string
  body: string
  actionLabel: string
  cooldownLabel: string
  dismissed: boolean
}

export type PlayerWorldTimelineReadModel = {
  contractId: 'player_world_timeline_read_model_v1'
  generatedAt: string
  historyPageLimit?: number
  historyCursorStable?: boolean
  historyNextCursor?: string
  historyDedupeKey?: string
  historyNotificationBudget?: number
  historyCooldownApplied?: boolean
  historyNotificationSuppressionApplied?: boolean
  historyNotificationSuppressedCount?: number
  historyDurableCardAnchor?: string
  historyNotificationAnchors?: PlayerHistoryNotificationAnchor[]
  cards: PlayerWorldTimelineCard[]
}

export type PlayerHistoryLivePreviewReadModel = {
  contractId: 'player_history_live_preview_v1'
  optInRequired: true
  enabled: boolean
  visibleStateLabel: string
  collapsedFeedbackLabel: string
  droppedCountLabel: string
  previewCardCount: number
  backpressureApplied: boolean
  rawStreamDefaultDenied: true
  durableCardAnchor?: string
}

export type BattleReplayActionFrame = {
  contractId: 'battle_replay_action_frame_v1'
  id: string
  frameIndex: number
  title: string
  sideLabel: string
  actorName: string
  actionLabel: string
  effectLabel: string
  damageLabel?: string
  lossLabel?: string
  mapContextLabel?: string
  roundContextLabel?: string
  inspectable: boolean
}

export type BattleReplayScreenReadModel = {
  contractId: 'battle_replay_action_frame_v1'
  replayTitle: string
  battleReportId: string
  selectedFrameIndex: number
  frameCountLabel: string
  inspectionHintLabel: string
  timelineScrubLabel: string
  frames: BattleReplayActionFrame[]
  controls: {
    canPause: boolean
    canStepForward: boolean
    canStepBackward: boolean
    canScrub: boolean
  }
}

export type PlayerSaveLoadSlot = {
  contractId: 'player_save_load_slots_v1'
  slotId: string
  slotLabel: string
  savedAtLabel: string
  worldSummary: string
  riskHint?: string
  restorePreviewLabel?: string
  lastResultLabel?: string
}

export type PlayerSaveLoadReadModel = {
  contractId: 'player_save_load_slots_v1'
  selectedSlotId?: string
  restoreRiskLabel: string
  restoreFeedbackLabel?: string
  emptyStateLabel: string
  slots: PlayerSaveLoadSlot[]
}

export type CivilMemoryHistoryCard = {
  contractId: 'civil_memory_history_card_v1'
  id: string
  title: string
  causeLabel: string
  affectedPartyLabel: string
  currentImpactLabel: string
  suggestedFollowUpLabel?: string
  severity: PlayerWorldTimelineSeverity
  sourceRefs?: {
    visibility: 'internal_link_only'
    visible: false
    civilMemoryId: string
  }
}

export type CivilMemoryDetailReadModel = {
  contractId: 'civil_memory_detail_read_model_v1'
  title: string
  summary: string
  affectedPartyLabel: string
  resultLabel: string
  consequenceLabel: string
  followUpLabel?: string
  timestampLabel: string
  relatedCountLabel: string
  responsibilityCountLabel: string
  archiveStateLabel: string
  sharedScope?: 'public_context'
  shareStateLabel?: string
  shareRetentionLabel?: string
}

export type PlayerHistoryContracts = {
  timeline: PlayerWorldTimelineReadModel
  livePreview?: PlayerHistoryLivePreviewReadModel
  replay?: BattleReplayScreenReadModel
  saveLoad?: PlayerSaveLoadReadModel
  civilMemoryCards?: CivilMemoryHistoryCard[]
  civilMemoryDetail?: CivilMemoryDetailReadModel
}
