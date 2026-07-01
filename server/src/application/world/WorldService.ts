import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
  createReadStream,
  createWriteStream,
  closeSync,
} from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve as resolvePath } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createGzip, gunzipSync } from 'node:zlib'
import {
  flushNarrativePersist as flushNarrativePersistFromPersistence,
  flushWorldPersist as flushWorldPersistFromPersistence,
  getNarrativeEvents as getNarrativeEventsFromPersistence,
  loadPersistedNarrativeEvents,
  loadPersistedWorldState,
  recordSimulationNarrativeEvents as recordSimulationNarrativeEventsFromPersistence,
  scheduleWorldPersist,
} from './persistence/worldPersistence'
import { WORLD_STATE_PERSIST_PATH, buildWorldPersistencePath } from './persistence/worldPersistencePaths'
import {
  buildLayoutChunkByTileIds,
  listProvinceIds,
  resolveBootstrapProvinceIds,
} from './layout/worldMapLayoutChunkBuilder'
import {
  buildStateDetailTilesRuntime,
  buildStateRoadNetworkRuntime,
  buildStateStrategicNodesRuntime,
  EAST_HAN_STATE_DETAIL_TILES_LAYER,
  EAST_HAN_STATE_ROAD_NETWORK_LAYER,
  EAST_HAN_STATE_STRATEGIC_NODES_LAYER,
} from './layout/stateDetailLayerBuilder'
import { getActiveWorldMutationHolder, tryAcquireWorldMutationLock } from './runtime/worldMutationLock'
import { runGeneralDispatch } from '../../agents/general/GeneralAgent'
import { previewDomainAgendaForFaction, runDomainCommWindow } from '../../agents/commBus/DomainCommBus'
import { compileNationalAgendaWindow } from '../../agents/commBus/AgendaCompiler'
import { runCourtSession, simulateCourtSession, getLatestCourtSession } from '../../agents/court/CourtService'
import { flushCourtSessionPersist } from '../../agents/court/CourtStore'
import { flushTacticalSkillPersist } from '../../agents/tools/TacticalSkillLibrary'
import {
  getCivilMemoryEntries as listCivilMemoryEntries,
  recordAgendaWindowMemory,
  recordCourtSessionMemory,
  recordExecutionOutcomeMemory,
} from '../../agents/memory/CivilMemoryService'
import { flushCivilMemoryPersist } from '../../agents/memory/CivilMemoryStore'
import { getGeneralProfilesForFaction } from '../../agents/general/GeneralProfileStore'
import { reflectWorldTick } from '../../agents/reflect/ReflectService'
import {
  broadcastTickDelta,
  broadcastBattleReport,
  broadcastMainMapOwnerDeltaInvalidation,
  getWebSocketStats,
} from '../../ws/GameWebSocket'
import {
  getFactionAutonomyLevel,
  getFactionSessionSnapshot,
  getSessionMetrics,
  resolveSessionControlMode,
} from '../../multiplayer/SessionManager'
import {
  createInitialWorldState,
  normalizeWorldGeneralTacticalSkillSlotsForWorld,
  normalizeWorldStrategicNodesForWorld,
} from '../../../../shared/domain/scenario'
import { syncAllFactionAiQuota } from '../../../../shared/domain/aiQuota'
import {
  DEFAULT_WORLD_RESOURCE_GENERATION_POLICY,
  normalizeGeneratedWorldResourceTiles,
  normalizeWorldResourceGenerationMetadata,
  type WorldResourceGenerationPolicy,
  type WorldResourceKindWeight,
  type WorldResourceLevelWeight,
} from '../../../../shared/domain/worldResourceGeneration'
import {
  buildCityControlLongTermPreconditionReadback,
  buildCityControlJudgmentReadback,
  normalizeCityControlAdministrativeRole,
  requiredLongTermControlTicksForRole,
} from '../../../../shared/domain/cityControlJudgment'
import {
  buildL0SubstrateEconomyReadModel,
  buildResourceTileExpeditionPreview,
  buildResourceTileEconomyReadModel,
} from '../../../../shared/domain/resourceTileEconomy'
import { buildWorldAffairsReadModel, normalizeWorldAffairsStateForWorld } from '../../../../shared/domain/worldAffairs'
import {
  DEFAULT_WORLD_TASKS_SCENARIO_ID,
  DEFAULT_WORLD_TASKS_SCENARIO_VERSION,
  DEFAULT_WORLD_TASKS_SEASON_RUN_ID,
  buildWorldTasksReadModel,
  normalizeWorldTasksStateForWorld,
} from '../../../../shared/domain/worldTasks'
import { buildResourceGuardReadModelForTile } from '../../../../shared/domain/resourceGuardTemplates'
import { buildHeroProfileFromPoolId } from '../../../../shared/domain/heroPool'
import { evaluateNavalFleetDeploymentReadiness } from '../../../../shared/domain/navalFleetDeploymentPolicy'
import {
  evaluateNavalRouteEncounterPolicy,
  type NavalRouteEncounterEnemyPresence,
  type NavalRouteEncounterMissionType,
} from '../../../../shared/domain/navalRouteEncounterPolicy'
import { settleResourcesForAllPlayers, syncV2StateWithWorld, syncWorldFactionResourcesFromV2 } from '../v2/V2GameService'
import {
  advanceTick,
  allianceHelp,
  appendPlanningJobHistory,
  achieveTaskPrototype,
  achieveWorldAffairsNode,
  claimTaskReward,
  claimReward,
  claimWorldAffairsNodeReward,
  claimGovernorResourceInbox,
  clearPlanExecution,
  buildNavalWarshipAtHarbor,
  createNavalFleet,
  deployReserveHero,
  gatherAiResourceTile,
  healTroop,
  issueClaimableReward,
  moveUnit,
  occupyTile,
  openSeaRoute,
  promoteCityBuilding,
  recordWorldTaskEvent,
  promoteTroopFacilityBuilding,
  queueAiAgendaAction,
  recruitProspectHero,
  repairNavalFleetDamage,
  resolveNavalCombatSettlement,
  setAiResourceTransferPolicy,
  setRecruitSelectedPool,
  cloneGeneralDirectivePreviewMirror,
  setAiContextFocus,
  setGeneralActiveHero,
  setGeneralTactic,
  seaPatrolIntercept,
  seaPatrolScout,
  sailNavalRoute,
  upgradeHeroLevel,
  upgradeHeroStar,
  upgradeTacticalSkill,
  upgradeCity,
  upgradeCityTech,
  queuePlanExecution,
  queueTacticalOverride,
  enqueueAffair,
  resolveMovementGeographyFeedback,
  transferFactionResourcesToGovernor,
  updateAllianceDirective,
} from '../../../../shared/domain/rules'
import type {
  AdvanceTickDiagnostics,
  AllianceHelpFailureCode,
  AiResourceGatherFailureCode,
  AiResourceTransferPolicyFailureCode,
  CityBuildingUpgradeFailureCode,
  GovernorResourceInboxClaimFailureCode,
  HeroGrowthFailureCode,
  IssueClaimableRewardFailureCode,
  QueuePlanFailureCode,
  ResourceTransferFailureCode,
  NavalFleetRuntimeFailureCode,
  NavalCombatSettlementFailureCode,
  NavalFleetDamageRepairFailureCode,
  NavalShipyardBuildFailureCode,
  RewardClaimFailureCode,
  SeaRouteFailureCode,
  SeaPatrolInterceptFailureCode,
  SeaPatrolScoutFailureCode,
  TaskPrototypeAchieveFailureCode,
  TaskRewardClaimFailureCode,
  TacticalSkillUpgradeFailureCode,
  WorldAffairsNodeAchieveFailureCode,
  WorldAffairsNodeRewardClaimFailureCode,
  TileOccupyFailureCode,
  TroopHealFailureCode,
} from '../../../../shared/domain/rules'
import type {
  ActionType,
  AiRuntimeAdvanceTickPerformance,
  AiRuntimeAdvanceTickPhaseStats,
  AiRuntimeAdvanceTickPhaseTiming,
  AiRuntimeAdvanceTickRun,
  AiRuntimeAdvanceTickSubphaseStats,
  AiRuntimeAdvanceTickSubphaseTiming,
  AiRuntimeBudgetSnapshot,
  AiRuntimeCategoryStats,
  AiRuntimeFailureAggregation,
  AiRuntimeFailureRecord,
  AiRuntimeLockConflictAggregation,
  AiRuntimeObservabilityResponse,
  AllianceOfficerAuthorityGrant,
  AllianceOfficerPermission,
  AllianceFrontlineMarker,
  CityTechTrackId,
  ExecutionEnqueueMode,
  ExecutionReplay,
  FactionState,
  FactionId,
  GeneralDirective,
  GeneralDirectivePreviewConfidence,
  GeneralDirectivePreviewItem,
  GeneralDirectivePreviewMatchMode,
  GeneralDirectivePreviewResponse,
  MainMapCellEvent,
  MainMapCellEventType,
  MainMapCellOverride,
  MainMapRuntimeState,
  MovementGeographyFeedbackCode,
  NarrativeEvent,
  NationProfile,
  NationProfileAuditEntry,
  NationProfileChangedField,
  NationTier,
  PlanSource,
  PlanningJobHistoryEntry,
  ReplayArchiveEntry,
  ReplayArchiveResponse,
  SaveSlotRecord,
  SaveSlotsResponse,
  SlgAiExecutionState,
  StrategicPlan,
  TaskRealAuthoritySignalKind,
  Tile,
  ResourceKind,
  Unit,
  UnitMarchState,
  UnitMapVisualFormationSlot,
  UnitMapVisualState,
  UnitMapVisualType,
  UnitRoadExitDirection,
  WorldActionReceipt,
  WorldActionResponse,
  WorldAffairsReadModel,
  WorldAffairsReadModelResponse,
  WorldEventRecord,
  WorldEventsResponse,
  WorldMapLayoutResponse,
  WorldMapStateStrategicNode,
  WorldMapLayoutTile,
  WorldMapLayoutLayerRequest,
  WorldMapTileState,
  WorldSnapshotResponse,
  WorldState,
  WorldSummary,
  WorldSummaryResponse,
  WorldTaskEventSource,
  WorldTasksReadModel,
  WorldTasksReadModelResponse,
} from '../../../../shared/contracts/game'
import type { NationalAgendaWindow } from '../../../../shared/contracts/commBus'
import type { DomainAgendaOption } from '../../../../shared/contracts/commBus'
import type { CivilMemoryEntry, CivilMemoryEventType } from '../../../../shared/contracts/civilMemory'
import type { CourtSession } from '../../../../shared/contracts/court'
import type { BattleOutcomeRecord } from '../../../../shared/contracts/game/history'

const MAX_WORLD_EVENTS = 1_000
const MAX_REPLAY_ARCHIVE = 160
const MAX_SAVE_SLOTS = 12
const MAX_AI_RUNTIME_EVENTS = 80
const MAX_ADVANCE_TICK_SAMPLES = 8
const SAVE_SLOTS_PERSIST_VERSION = 1
const SAVE_SLOTS_PERSIST_DEBOUNCE_MS = 1_200
const SAVE_SLOTS_PERSIST_PATH = process.env.WORLD_SAVE_SLOTS_PATH?.trim() || buildWorldPersistencePath('world_save_slots.json')
const DEFAULT_SAVE_SLOTS_SOFT_LIMIT_BYTES = 128 * 1024 * 1024
const DEFAULT_SAVE_SLOTS_HARD_LIMIT_BYTES = 512 * 1024 * 1024
const DEFAULT_SAVE_SLOTS_LOCK_STALE_MS = 15_000
const DEFAULT_SAVE_SLOTS_ARCHIVE_MAX_FILES = 12
const SAVE_SLOTS_SOFT_LIMIT_BYTES = readSaveSlotsLimitBytesEnv(
  'WORLD_SAVE_SLOTS_SOFT_LIMIT_BYTES',
  DEFAULT_SAVE_SLOTS_SOFT_LIMIT_BYTES,
)
const SAVE_SLOTS_HARD_LIMIT_BYTES = Math.max(
  SAVE_SLOTS_SOFT_LIMIT_BYTES,
  readSaveSlotsLimitBytesEnv('WORLD_SAVE_SLOTS_HARD_LIMIT_BYTES', DEFAULT_SAVE_SLOTS_HARD_LIMIT_BYTES),
)
const SAVE_SLOTS_LOCK_PATH = `${SAVE_SLOTS_PERSIST_PATH}.lock`
const SAVE_SLOTS_LOCK_STALE_MS = readSaveSlotsIntegerEnv(
  'WORLD_SAVE_SLOTS_LOCK_STALE_MS',
  DEFAULT_SAVE_SLOTS_LOCK_STALE_MS,
  1_000,
)
const SAVE_SLOTS_ARCHIVE_ON_SOFT_LIMIT = readSaveSlotsBooleanEnv('WORLD_SAVE_SLOTS_ARCHIVE_ON_SOFT_LIMIT', true)
const SAVE_SLOTS_ARCHIVE_DIR =
  process.env.WORLD_SAVE_SLOTS_ARCHIVE_DIR?.trim() || buildWorldPersistencePath('world_save_slots_archive')
const SAVE_SLOTS_ARCHIVE_MAX_FILES = readSaveSlotsIntegerEnv(
  'WORLD_SAVE_SLOTS_ARCHIVE_MAX_FILES',
  DEFAULT_SAVE_SLOTS_ARCHIVE_MAX_FILES,
  1,
)
const SAVE_SLOTS_ARCHIVE_BASENAME = basename(SAVE_SLOTS_PERSIST_PATH).replace(/\.json$/i, '')

const WORLD_MUTATION_BUSY_MESSAGE = 'world mutation busy'
const RESOURCE_TILE_ECONOMY_CONFIG_SOURCE = 'shared/domain/resourceTileEconomyConfig.ts' as const
const RESOURCE_TILE_BACKEND_SETTLEMENT_READBACK_SCOPE =
  'resource_tile_backend_settlement_readback_only_not_godot_art' as const
const RESOURCE_TILE_VISIBLE_COPY_FORBIDDEN_PATTERN =
  /(read model|contract|backend|authority|tier|snake_case|resourceEconomy|guardTemplateId|policyScope)/i
const AI_RUNTIME_OBSERVABILITY_ACTIONS = new Set([
  'queue_plan_execution',
  'queue_ai_agenda_action',
  'set_ai_context_focus',
  'clear_plan_execution',
  'advance_tick',
])

type QueuePlanFailureCategory = QueuePlanFailureCode | 'mutation_lock_busy' | 'unknown'
type QueuePlanConflictCategory =
  | 'mutation_lock_busy'
  | 'stale_world_version'
  | 'execution_chain_guard_missing'
  | 'execution_chain_guard_mismatch'
  | 'execution_chain_active_rejected'
  | 'none'
type AdvanceTickFailureCategory = 'mutation_lock_busy' | 'runtime_error'
type SaveSlotsFileSizeLevel = 'none' | 'ok' | 'soft' | 'hard'
type WorldActionFailureCode =
  | QueuePlanFailureCode
  | MovementGeographyFeedbackCode
  | AllianceHelpFailureCode
  | RewardClaimFailureCode
  | WorldAffairsNodeAchieveFailureCode
  | WorldAffairsNodeRewardClaimFailureCode
  | TaskPrototypeAchieveFailureCode
  | TaskRewardClaimFailureCode
  | IssueClaimableRewardFailureCode
  | ResourceTransferFailureCode
  | SeaRouteFailureCode
  | SeaPatrolScoutFailureCode
  | SeaPatrolInterceptFailureCode
  | NavalFleetRuntimeFailureCode
  | NavalCombatSettlementFailureCode
  | NavalFleetDamageRepairFailureCode
  | NavalShipyardBuildFailureCode
  | AiResourceTransferPolicyFailureCode
  | GovernorResourceInboxClaimFailureCode
  | AiResourceGatherFailureCode
  | TileOccupyFailureCode
  | TroopHealFailureCode
  | TacticalSkillUpgradeFailureCode
  | HeroGrowthFailureCode
  | CityBuildingUpgradeFailureCode
  | 'invalid_ai_agenda_action'
  | 'unknown_faction'
  | 'no_primary_unit'
  | 'missing_target_tile'
  | 'invalid_main_map_cell'
  | 'main_map_cell_conflict'
  | 'main_map_cell_immunity_active'
  | 'alliance_frontline_marker_forbidden'
  | 'alliance_frontline_marker_session_required'
  | 'alliance_frontline_marker_session_faction_mismatch'
  | 'world_mutation_busy'

export type WorldActionSessionAuthorityContext = {
  sessionId: string
  factionId: FactionId
  seatId: number
  playerName: string
}

export type AllianceOfficerAuthorityResolution = {
  grant: AllianceOfficerAuthorityGrant
  commander: {
    id: string
    name: string
  }
}

const ALLIANCE_OFFICER_AUTHORITY_SCHEMA_VERSION = 'alliance_officer_authority_table_v1'
const ALLIANCE_FRONTLINE_PERMISSION: AllianceOfficerPermission = 'update_frontline_marker'
const ALLIANCE_EMPIRE_UPGRADE_PERMISSION: AllianceOfficerPermission = 'upgrade_empire'
const ALLIANCE_NATION_PROFILE_PERMISSION: AllianceOfficerPermission = 'manage_nation_profile'
const ALLIANCE_DIPLOMACY_PERMISSION: AllianceOfficerPermission = 'manage_diplomacy'
const DEFAULT_ALLIANCE_OFFICER_AUTHORITY_GRANTS: Record<string, AllianceOfficerAuthorityGrant> = {
  grant_player_frontline_commander: {
    id: 'grant_player_frontline_commander',
    factionId: 'player',
    roleId: 'alliance_commander',
    roleLabel: '战线指挥官',
    commanderId: 'ally_west',
    principalPlayerName: '验收官员',
    permissions: [
      ALLIANCE_FRONTLINE_PERMISSION,
      ALLIANCE_EMPIRE_UPGRADE_PERMISSION,
      ALLIANCE_NATION_PROFILE_PERMISSION,
      ALLIANCE_DIPLOMACY_PERMISSION,
    ],
    status: 'active',
    source: 'scenario_seed',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  grant_godot_mvp_frontline_commander: {
    id: 'grant_godot_mvp_frontline_commander',
    factionId: 'player',
    roleId: 'alliance_commander',
    roleLabel: '战线指挥官',
    commanderId: 'ally_west',
    principalPlayerName: 'godot_mvp',
    permissions: [
      ALLIANCE_FRONTLINE_PERMISSION,
      ALLIANCE_EMPIRE_UPGRADE_PERMISSION,
      ALLIANCE_NATION_PROFILE_PERMISSION,
      ALLIANCE_DIPLOMACY_PERMISSION,
    ],
    status: 'active',
    source: 'scenario_seed',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
}

type CategoryStats<T extends string> = {
  total: number
  byCategory: Record<T, number>
}

type AdvanceTickPhaseName =
  | 'compile_advisory'
  | 'record_pre_tick_memory'
  | 'append_pre_tick_events'
  | 'advance_world_state'
  | 'sync_v2_resources'
  | 'reflect_world_tick'
  | 'record_post_tick_memory'
  | 'broadcast_runtime'
  | 'finalize_response'

const queuePlanFailureStats: CategoryStats<QueuePlanFailureCategory> = {
  total: 0,
  byCategory: {
    mutation_lock_busy: 0,
    stale_world_version: 0,
    unknown_faction: 0,
    invalid_order_units: 0,
    execution_chain_guard_missing: 0,
    execution_chain_guard_mismatch: 0,
    execution_chain_active_rejected: 0,
    unknown: 0,
  },
}

const queuePlanConflictStats: CategoryStats<QueuePlanConflictCategory> = {
  total: 0,
  byCategory: {
    mutation_lock_busy: 0,
    stale_world_version: 0,
    execution_chain_guard_missing: 0,
    execution_chain_guard_mismatch: 0,
    execution_chain_active_rejected: 0,
    none: 0,
  },
}

const advanceTickFailureStats: CategoryStats<AdvanceTickFailureCategory> = {
  total: 0,
  byCategory: {
    mutation_lock_busy: 0,
    runtime_error: 0,
  },
}

const advanceTickRuns: AiRuntimeAdvanceTickRun[] = []

function bumpCategoryStats<T extends string>(stats: CategoryStats<T>, category: T) {
  stats.total += 1
  stats.byCategory[category] = (stats.byCategory[category] ?? 0) + 1
}

function snapshotCategoryStats<T extends string>(stats: CategoryStats<T>): CategoryStats<T> {
  return {
    total: stats.total,
    byCategory: { ...stats.byCategory },
  }
}

function resetCategoryStats<T extends string>(stats: CategoryStats<T>) {
  stats.total = 0
  for (const category of Object.keys(stats.byCategory) as T[]) {
    stats.byCategory[category] = 0
  }
}

function roundDurationMs(value: number): number {
  return Number(value.toFixed(2))
}

function recordAdvanceTickSubphaseSync<T>(
  subphases: AiRuntimeAdvanceTickSubphaseTiming[] | undefined,
  subphase: string,
  work: () => T,
): T {
  const startedAtMs = performance.now()
  try {
    return work()
  } finally {
    subphases?.push({
      subphase,
      durationMs: roundDurationMs(performance.now() - startedAtMs),
    })
  }
}

function cloneAdvanceTickSubphases(
  subphases: AiRuntimeAdvanceTickSubphaseTiming[] | undefined,
): AiRuntimeAdvanceTickSubphaseTiming[] | undefined {
  if (!subphases || subphases.length === 0) {
    return undefined
  }
  return subphases.map((subphase) => ({ ...subphase }))
}

function buildAdvanceTickPhaseTimingsRecord(phases: AiRuntimeAdvanceTickPhaseTiming[]): Record<string, number> {
  const record: Record<string, number> = {}
  for (const phase of phases) {
    record[phase.phase] = phase.durationMs
  }
  return record
}

function buildAdvanceTickSubphaseTimingsRecord(
  phases: AiRuntimeAdvanceTickPhaseTiming[],
): Record<string, Record<string, number>> {
  const record: Record<string, Record<string, number>> = {}
  for (const phase of phases) {
    if (!phase.subphases || phase.subphases.length === 0) {
      continue
    }
    record[phase.phase] = Object.fromEntries(
      phase.subphases.map((subphase) => [subphase.subphase, subphase.durationMs]),
    )
  }
  return record
}

function cloneTileForDeltaSnapshot(tile: Tile): Tile {
  return {
    id: tile.id,
    name: tile.name,
    type: tile.type,
    terrain: tile.terrain,
    owner: tile.owner,
    x: tile.x,
    y: tile.y,
    moveCost: tile.moveCost,
    enemyPressure: tile.enemyPressure,
    scoutingDifficulty: tile.scoutingDifficulty,
    resourceLevel: tile.resourceLevel,
    resourceKind: tile.resourceKind,
    cityLevel: tile.cityLevel,
    district: tile.district,
    landmarkId: tile.landmarkId,
    landmarkName: tile.landmarkName,
  }
}

export function createWorldDeltaSnapshot(
  world: Readonly<WorldState>,
  subphases?: AiRuntimeAdvanceTickSubphaseTiming[],
): WorldState {
  const factions = recordAdvanceTickSubphaseSync(
    subphases,
    'advance_world_state.snapshot_previous_world.clone_factions',
    () => Object.fromEntries(
      Object.entries(world.factions).map(([factionId, faction]) => [factionId, structuredClone(faction)]),
    ),
  )
  const tiles = recordAdvanceTickSubphaseSync(
    subphases,
    'advance_world_state.snapshot_previous_world.clone_map_tiles',
    () => world.map.tiles.map((tile) => cloneTileForDeltaSnapshot(tile)),
  )
  const units = recordAdvanceTickSubphaseSync(
    subphases,
    'advance_world_state.snapshot_previous_world.clone_units',
    () => world.units.map((unit) => structuredClone(unit)),
  )
  const reports = recordAdvanceTickSubphaseSync(
    subphases,
    'advance_world_state.snapshot_previous_world.clone_reports',
    () => world.reports.map((report) => ({ ...report })),
  )
  const feedback = recordAdvanceTickSubphaseSync(
    subphases,
    'advance_world_state.snapshot_previous_world.clone_feedback',
    () => ({
      ...world.feedback,
      battleRecords: world.feedback.battleRecords.map((record) => ({ ...record })),
      allianceActions: world.feedback.allianceActions.map((item) => ({ ...item })),
    }),
  )
  return {
    ...world,
    factions,
    map: {
      ...world.map,
      tiles,
    },
    units,
    reports,
    feedback,
  }
}

function finalizeAdvanceTickRun(params: {
  startedAt: string
  startedAtMs: number
  phases: AiRuntimeAdvanceTickPhaseTiming[]
  outcome: AiRuntimeAdvanceTickRun['outcome']
  tickBefore: number
  tickAfter: number
  worldVersionBefore: number
  worldVersionAfter: number
  narrativeEvents?: number
  memoryWrites?: number
  memoryWriteFailures?: number
  battleReportsBroadcast?: number
  errorName?: string
  errorMessage?: string
}): AiRuntimeAdvanceTickRun {
  const completedAt = new Date().toISOString()
  const totalDurationMs = roundDurationMs(performance.now() - params.startedAtMs)
  const slowestPhase = params.phases.reduce<AiRuntimeAdvanceTickPhaseTiming | null>(
    (current, phase) => {
      if (!current || phase.durationMs > current.durationMs) {
        return phase
      }
      return current
    },
    null,
  )
  return {
    outcome: params.outcome,
    startedAt: params.startedAt,
    completedAt,
    tickBefore: params.tickBefore,
    tickAfter: params.tickAfter,
    worldVersionBefore: params.worldVersionBefore,
    worldVersionAfter: params.worldVersionAfter,
    totalDurationMs,
    slowestPhase: slowestPhase?.phase ?? null,
    slowestPhaseDurationMs: slowestPhase?.durationMs ?? null,
    phases: params.phases.map((phase) => ({
      ...phase,
      subphases: cloneAdvanceTickSubphases(phase.subphases),
    })),
    narrativeEvents: params.narrativeEvents ?? 0,
    memoryWrites: params.memoryWrites ?? 0,
    memoryWriteFailures: params.memoryWriteFailures ?? 0,
    battleReportsBroadcast: params.battleReportsBroadcast ?? 0,
    errorName: params.errorName,
    errorMessage: params.errorMessage,
  }
}

function recordAdvanceTickRun(run: AiRuntimeAdvanceTickRun) {
  advanceTickRuns.unshift(run)
  if (advanceTickRuns.length > MAX_ADVANCE_TICK_SAMPLES) {
    advanceTickRuns.splice(MAX_ADVANCE_TICK_SAMPLES)
  }
}

function buildAdvanceTickPerformanceSnapshot(): AiRuntimeAdvanceTickPerformance {
  const phaseStats: Record<string, AiRuntimeAdvanceTickPhaseStats> = {}
  let totalDurationMs = 0
  let maxTotalDurationMs = 0
  let successfulRuns = 0
  let failedRuns = 0

  for (const run of advanceTickRuns) {
    totalDurationMs += run.totalDurationMs
    maxTotalDurationMs = Math.max(maxTotalDurationMs, run.totalDurationMs)
    if (run.outcome === 'success') {
      successfulRuns += 1
    } else {
      failedRuns += 1
    }

    for (const phase of run.phases) {
      const existing = phaseStats[phase.phase]
      if (!existing) {
        phaseStats[phase.phase] = {
          runs: 1,
          lastDurationMs: phase.durationMs,
          avgDurationMs: phase.durationMs,
          maxDurationMs: phase.durationMs,
          subphaseStats: phase.subphases
            ? Object.fromEntries(
                phase.subphases.map((subphase) => [
                  subphase.subphase,
                  {
                    runs: 1,
                    lastDurationMs: subphase.durationMs,
                    avgDurationMs: subphase.durationMs,
                    maxDurationMs: subphase.durationMs,
                  } satisfies AiRuntimeAdvanceTickSubphaseStats,
                ]),
              )
            : undefined,
        }
        continue
      }
      const runs = existing.runs + 1
      const subphaseStats = { ...(existing.subphaseStats ?? {}) }
      for (const subphase of phase.subphases ?? []) {
        const existingSubphase = subphaseStats[subphase.subphase]
        if (!existingSubphase) {
          subphaseStats[subphase.subphase] = {
            runs: 1,
            lastDurationMs: subphase.durationMs,
            avgDurationMs: subphase.durationMs,
            maxDurationMs: subphase.durationMs,
          }
          continue
        }
        const subphaseRuns = existingSubphase.runs + 1
        subphaseStats[subphase.subphase] = {
          runs: subphaseRuns,
          lastDurationMs: existingSubphase.lastDurationMs,
          avgDurationMs: roundDurationMs(
            ((existingSubphase.avgDurationMs * existingSubphase.runs) + subphase.durationMs) / subphaseRuns,
          ),
          maxDurationMs: Math.max(existingSubphase.maxDurationMs, subphase.durationMs),
        }
      }
      phaseStats[phase.phase] = {
        runs,
        lastDurationMs: existing.lastDurationMs,
        avgDurationMs: roundDurationMs(((existing.avgDurationMs * existing.runs) + phase.durationMs) / runs),
        maxDurationMs: Math.max(existing.maxDurationMs, phase.durationMs),
        subphaseStats: Object.keys(subphaseStats).length > 0 ? subphaseStats : undefined,
      }
    }
  }

  return {
    totalRuns: advanceTickRuns.length,
    successfulRuns,
    failedRuns,
    lastOutcome: advanceTickRuns[0]?.outcome ?? null,
    lastCompletedAt: advanceTickRuns[0]?.completedAt,
    lastTotalDurationMs: advanceTickRuns[0]?.totalDurationMs,
    avgTotalDurationMs:
      advanceTickRuns.length > 0 ? roundDurationMs(totalDurationMs / advanceTickRuns.length) : undefined,
    maxTotalDurationMs: advanceTickRuns.length > 0 ? roundDurationMs(maxTotalDurationMs) : undefined,
    phaseStats,
    recentRuns: advanceTickRuns.map((run) => structuredClone(run)),
  }
}

async function measureAdvanceTickPhase<T>(
  phases: AiRuntimeAdvanceTickPhaseTiming[],
  phase: AdvanceTickPhaseName,
  work: () => Promise<T> | T,
  options: {
    subphases?: AiRuntimeAdvanceTickSubphaseTiming[]
  } = {},
): Promise<T> {
  const startedAtMs = performance.now()
  try {
    return await work()
  } finally {
    phases.push({
      phase,
      durationMs: roundDurationMs(performance.now() - startedAtMs),
      subphases: cloneAdvanceTickSubphases(options.subphases),
    })
  }
}

async function measureAdvanceTickSubphase<T>(
  subphases: AiRuntimeAdvanceTickSubphaseTiming[],
  subphase: string,
  work: () => Promise<T> | T,
): Promise<T> {
  const startedAtMs = performance.now()
  try {
    return await work()
  } finally {
    subphases.push({
      subphase,
      durationMs: roundDurationMs(performance.now() - startedAtMs),
    })
  }
}

function readSaveSlotsLimitBytesEnv(name: string, fallback: number): number {
  const raw = Number(process.env[name] ?? fallback)
  if (!Number.isFinite(raw)) {
    return fallback
  }

  return Math.max(1_024, Math.floor(raw))
}

function readSaveSlotsIntegerEnv(name: string, fallback: number, minimum: number): number {
  const raw = Number(process.env[name] ?? fallback)
  if (!Number.isFinite(raw)) {
    return fallback
  }

  return Math.max(minimum, Math.floor(raw))
}

function readSaveSlotsBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase()
  if (!raw) {
    return fallback
  }
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}

function resolveWorldResourceGenerationPolicyFromEnv(): WorldResourceGenerationPolicy {
  return {
    worldSeed: readWorldResourceStringEnv(
      'WORLD_RESOURCE_SEED',
      DEFAULT_WORLD_RESOURCE_GENERATION_POLICY.worldSeed,
    ),
    generationVersion: readWorldResourceStringEnv(
      'WORLD_RESOURCE_GENERATION_VERSION',
      DEFAULT_WORLD_RESOURCE_GENERATION_POLICY.generationVersion,
    ),
    resourceTileDensityPermille: readWorldResourceIntegerEnv(
      'WORLD_RESOURCE_TILE_DENSITY_PERMILLE',
      DEFAULT_WORLD_RESOURCE_GENERATION_POLICY.resourceTileDensityPermille,
      1,
      1000,
    ),
    levelWeightTable: readWorldResourceLevelWeightTableEnv(
      'WORLD_RESOURCE_LEVEL_WEIGHT_TABLE',
      DEFAULT_WORLD_RESOURCE_GENERATION_POLICY.levelWeightTable,
    ),
    kindWeightTable: readWorldResourceKindWeightTableEnv(
      'WORLD_RESOURCE_KIND_WEIGHT_TABLE',
      DEFAULT_WORLD_RESOURCE_GENERATION_POLICY.kindWeightTable,
    ),
  }
}

function readWorldResourceStringEnv(name: string, fallback: string) {
  const value = process.env[name]?.trim()
  return value ? value : fallback
}

function readWorldResourceIntegerEnv(name: string, fallback: number, minimum: number, maximum: number) {
  const value = Number(process.env[name] ?? fallback)
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.max(minimum, Math.min(maximum, Math.floor(value)))
}

function readWorldResourceLevelWeightTableEnv(name: string, fallback: WorldResourceLevelWeight[]) {
  const parsed = parseWorldResourceLevelWeightTable(process.env[name])
  return parsed.length > 0 ? parsed : fallback
}

function readWorldResourceKindWeightTableEnv(name: string, fallback: WorldResourceKindWeight[]) {
  const parsed = parseWorldResourceKindWeightTable(process.env[name])
  return parsed.length > 0 ? parsed : fallback
}

function parseWorldResourceLevelWeightTable(raw: string | undefined): WorldResourceLevelWeight[] {
  const entries = parseWorldResourceWeightEntries(raw)
  return entries
    .map((entry) => ({
      level: Number(entry.key),
      weight: entry.weight,
    }))
    .filter((entry) => Number.isInteger(entry.level) && entry.level >= 1 && entry.level <= 9 && entry.weight > 0)
}

function parseWorldResourceKindWeightTable(raw: string | undefined): WorldResourceKindWeight[] {
  const entries = parseWorldResourceWeightEntries(raw)
  return entries
    .map((entry) => ({
      kind: entry.key,
      weight: entry.weight,
    }))
    .filter((entry): entry is WorldResourceKindWeight =>
      (entry.kind === 'food' || entry.kind === 'wood' || entry.kind === 'stone' || entry.kind === 'iron' || entry.kind === 'copper')
      && entry.weight > 0,
    )
}

function parseWorldResourceWeightEntries(raw: string | undefined): Array<{ key: string; weight: number }> {
  const value = raw?.trim()
  if (!value) {
    return []
  }

  const parsedJson = tryParseWorldResourceWeightJson(value)
  if (parsedJson.length > 0) {
    return parsedJson
  }

  return value
    .split(',')
    .map((entry) => {
      const [key, weight] = entry.split(':')
      return {
        key: key?.trim() ?? '',
        weight: Number(weight),
      }
    })
    .filter((entry) => entry.key.length > 0 && Number.isFinite(entry.weight))
}

function tryParseWorldResourceWeightJson(value: string): Array<{ key: string; weight: number }> {
  if (!value.startsWith('[') && !value.startsWith('{')) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => readWorldResourceWeightEntry(entry))
        .filter((entry): entry is { key: string; weight: number } => !!entry)
    }

    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed)
        .map(([key, weight]) => ({
          key,
          weight: Number(weight),
        }))
        .filter((entry) => entry.key.length > 0 && Number.isFinite(entry.weight))
    }
  } catch {
    return []
  }

  return []
}

function readWorldResourceWeightEntry(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const entry = value as { level?: unknown; kind?: unknown; weight?: unknown }
  const key = entry.level !== undefined ? String(entry.level) : String(entry.kind ?? '')
  const weight = Number(entry.weight)
  if (!key || !Number.isFinite(weight)) {
    return null
  }

  return { key, weight }
}

const MAX_TILE_STATE_DIFF_HISTORY = 180
const MAX_INTEL_DIFF_HISTORY = 180
const DEFAULT_MAP_LAYOUT_VERSION = 1
const MAX_GENERAL_DIRECTIVES = 16
const GENERAL_NAME_FUZZY_MIN_SCORE = 0.72
const GENERAL_NAME_FUZZY_GAP = 0.08
const WORLD_RESOURCE_GENERATION_POLICY = resolveWorldResourceGenerationPolicyFromEnv()

const TARGET_TILE_ALIAS_TABLE: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: '\u6d1b\u9633', aliases: ['\u6d1b\u9633', '\u6d1b\u9633\u57ce', '\u6d1b\u9633\u4e3b\u57ce', 'luoyang', 'capital'] },
  { canonical: '\u957f\u5b89', aliases: ['\u957f\u5b89', '\u957f\u5b89\u57ce', 'changan'] },
  { canonical: '\u90ba\u57ce', aliases: ['\u90ba\u57ce', '\u90ba\u90fd', 'yecheng'] },
  { canonical: '\u8bb8\u660c', aliases: ['\u8bb8\u660c', '\u8bb8\u90fd', 'xuchang'] },
  { canonical: '\u6210\u90fd', aliases: ['\u6210\u90fd', 'chengdu'] },
  { canonical: '\u5efa\u4e1a', aliases: ['\u5efa\u4e1a', 'jianye', '\u5efa\u5eb7'] },
  { canonical: '\u8d64\u5792\u8981\u585e', aliases: ['\u8d64\u5792', '\u8d64\u5792\u8981\u585e', 'redfort'] },
  { canonical: '\u897f\u4fa7\u5173\u53e3', aliases: ['\u897f\u4fa7\u5173\u53e3', '\u897f\u5173', '\u897f\u7ebf\u5173\u53e3', 'west gate'] },
  { canonical: '\u4e1c\u4fa7\u5ce1\u53e3', aliases: ['\u4e1c\u4fa7\u5ce1\u53e3', '\u4e1c\u5ce1\u53e3', 'east pass'] },
  { canonical: '\u540e\u52e4\u8425\u5730', aliases: ['\u540e\u52e4\u8425\u5730', '\u540e\u52e4\u70b9', 'logistics camp'] },
  { canonical: '\u5317\u7ebf\u5c94\u8def', aliases: ['\u5317\u7ebf\u5c94\u8def', '\u5317\u7ebf\u8282\u70b9', 'north fork'] },
  { canonical: '\u4e2d\u519b\u5927\u9053', aliases: ['\u4e2d\u519b\u5927\u9053', '\u4e2d\u7ebf\u5927\u9053', 'center avenue'] },
  { canonical: '\u897f\u5357\u7cae\u4ed3', aliases: ['\u897f\u5357\u7cae\u4ed3', '\u7cae\u4ed3', 'granary'] },
  { canonical: '\u70fd\u70df\u53f0', aliases: ['\u70fd\u70df\u53f0', '\u70fd\u706b\u53f0', 'beacon'] },
]

const DEFAULT_SUMMARY_PLANNING_HISTORY_LIMIT = 60
const MAX_SUMMARY_PLANNING_HISTORY_LIMIT = 240
const DEFAULT_SUMMARY_REPLAY_LIMIT = 12
const MAX_SUMMARY_REPLAY_LIMIT = 120
const DEFAULT_SUMMARY_REPLAY_FRAME_LIMIT = 8
const MAX_SUMMARY_REPLAY_FRAME_LIMIT = 60

type SaveSlotState = {
  record: SaveSlotRecord
  world: WorldState
}

type SaveSlotsArchiveFile = {
  path: string
  mtimeMs: number
  sizeBytes: number
}

type SaveSlotsArchiveRestoreDrillStatus = 'passed' | 'failed' | 'skipped'
type SaveSlotsArchiveRestoreApplyStatus = 'restored' | 'skipped' | 'failed'
type SaveSlotsArchiveRestoreRollbackDrillStatus = 'passed' | 'failed' | 'skipped'
export type SaveSlotRestoreScopeToken = 'own_save_slot'
export type SaveSlotOwnerContext = {
  factionId?: string
  sessionId?: string
}
export type SaveSlotVisibilityOptions = {
  owner?: SaveSlotOwnerContext
  includeOwnerless?: boolean
}

type ReplayFixtureSource = 'initial_world_v1' | 'current_world'

export const SAVE_SLOT_RESTORE_SCOPE_TOKEN: SaveSlotRestoreScopeToken = 'own_save_slot'

function normalizeSaveSlotOwnerContext(owner?: SaveSlotOwnerContext): Required<SaveSlotOwnerContext> | undefined {
  const factionId = owner?.factionId?.trim()
  if (!factionId) {
    return undefined
  }
  const sessionId = owner?.sessionId?.trim() || 'session-unbound'

  return {
    factionId,
    sessionId,
  }
}

type PersistedSaveSlotsPayload = {
  version: number
  savedAt: number
  slots: SaveSlotState[]
}

type WorldSummaryOptions = {
  sinceWorldVersion?: number
  planningHistoryLimit?: number
  replayLimit?: number
  replayFrameLimit?: number
  intelMode?: 'sparse' | 'full'
}

type ResolvedWorldSummaryOptions = {
  sinceWorldVersion?: number
  planningHistoryLimit: number
  replayLimit: number
  replayFrameLimit: number
  intelMode: 'sparse' | 'full'
}

type MapHierarchyLayer = 'nation' | 'province' | 'region' | 'tile'
type MapLayoutLayer = MapHierarchyLayer | 'layered'

type WorldMapLayoutOptions = {
  scope?: 'full' | 'bootstrap' | 'province' | 'region' | 'viewport'
  provinceId?: string
  regionId?: string
  centerX?: number
  centerY?: number
  visibleCells?: {
    width: number
    height: number
  }
  preloadMarginCells?: number
  chunkSizeCells?: {
    width: number
    height: number
  }
  layer?: MapLayoutLayer
  worldId?: string
  coordinateSpace?: string
  visibleSizeCells?: {
    width: number
    height: number
  }
  includeLayers?: WorldMapLayoutLayerRequest[]
  loadedChunkIds?: string[]
  tianxiaYutuScalePreset?: string
  stateDetailStateId?: string
}

type ResolvedWorldMapLayoutOptions =
  | {
      scope: 'full' | 'bootstrap'
    }
  | {
      scope: 'province'
      provinceId: string
    }
  | {
      scope: 'region'
      regionId: string
    }
  | {
      scope: 'viewport'
      centerX: number
      centerY: number
      layer: MapLayoutLayer
      visibleCells?: {
        width: number
        height: number
      }
      visibleSizeCells?: {
        width: number
        height: number
      }
      preloadMarginCells?: number
      chunkSizeCells?: {
        width: number
        height: number
      }
      worldId?: string
      coordinateSpace?: string
      includeLayers?: WorldMapLayoutLayerRequest[]
      loadedChunkIds?: string[]
      tianxiaYutuScalePreset?: string
      stateDetailStateId?: string
    }

type UnitHeroVisualSource = Pick<Unit['hero'], 'id' | 'name' | 'troopType' | 'cardType'>

const UNIT_MAP_FORMATION_ROLES = ['vanguard', 'center', 'camp'] as const

function resolveUnitMapVisualTypeForHero(hero: Pick<Unit['hero'], 'troopType' | 'cardType'>): UnitMapVisualType {
  if (hero.troopType === 'cavalry' || hero.cardType === '骑') {
    return 'cavalry'
  }
  if (hero.troopType === 'archer' || hero.cardType === '弓') {
    return 'archer'
  }
  return 'infantry'
}

function resolveUnitMapVisualType(unit: Unit): UnitMapVisualType {
  return resolveUnitMapVisualTypeForHero(unit.hero)
}

function buildUnitMapFormationSlots(unit: Unit): UnitMapVisualFormationSlot[] {
  const heroSlots: UnitHeroVisualSource[] = [unit.hero, ...(unit.coHeroes ?? [])].slice(0, 3)
  return heroSlots.map((heroSlot, index) => ({
    role: UNIT_MAP_FORMATION_ROLES[index] ?? 'camp',
    heroId: heroSlot.id,
    heroName: heroSlot.name,
    troopType: heroSlot.troopType,
    visualType: resolveUnitMapVisualTypeForHero(heroSlot),
  }))
}

const UNIT_MARCH_MIN_DURATION_SEC = 45
const UNIT_MARCH_MAX_DURATION_SEC = 600
const UNIT_MARCH_BASE_DURATION_SEC = 120

function clampMarchDurationSec(value: number): number {
  if (!Number.isFinite(value)) {
    return UNIT_MARCH_BASE_DURATION_SEC
  }
  return Math.max(UNIT_MARCH_MIN_DURATION_SEC, Math.min(UNIT_MARCH_MAX_DURATION_SEC, Math.round(value)))
}

function resolveUnitMarchDurationSec(unit: Unit, targetTile?: Tile): number {
  const moveCost = Math.max(1, Number(targetTile?.moveCost ?? 1))
  const speed = Math.max(30, Number(unit.hero.speed || unit.mobility || 60))
  return clampMarchDurationSec(UNIT_MARCH_BASE_DURATION_SEC * moveCost * (80 / speed))
}

function resolveUnitRoadExitDirection(world: WorldState, originTileId: string, targetTileId: string): UnitRoadExitDirection {
  const originTile = world.map.tiles.find((tile) => tile.id === originTileId)
  const targetTile = world.map.tiles.find((tile) => tile.id === targetTileId)
  if (!originTile || !targetTile || originTile.id === targetTile.id) {
    return 'south'
  }
  const dx = targetTile.x - originTile.x
  const dy = targetTile.y - originTile.y
  if (dy < 0) {
    return dx > 0 ? 'north' : 'northwest'
  }
  if (dx > 0) {
    return dy > 0 ? 'southeast' : 'east'
  }
  if (dx < 0) {
    return dy > 0 ? 'southwest' : 'west'
  }
  return 'south'
}

function resolveUnitExitAnchorId(direction: UnitRoadExitDirection): string {
  switch (direction) {
    case 'east':
    case 'southeast':
      return 'east_gate_queue'
    case 'north':
    case 'northwest':
    case 'west':
      return 'northwest_gate_queue'
    case 'south':
    case 'southwest':
    default:
      return 'south_gate_queue'
  }
}

function buildUnitMarchState(params: {
  unit: Unit
  world: WorldState
  originTileId: string
  targetTileId: string
  startedAtMs: number
}): UnitMarchState {
  const targetTile = params.world.map.tiles.find((tile) => tile.id === params.targetTileId)
  const durationSec = resolveUnitMarchDurationSec(params.unit, targetTile)
  const startedAt = new Date(params.startedAtMs).toISOString()
  const estimatedArrivalAt = new Date(params.startedAtMs + durationSec * 1000).toISOString()
  const roadExitDirection = resolveUnitRoadExitDirection(params.world, params.originTileId, params.targetTileId)
  return {
    originTileId: params.originTileId,
    targetTileId: params.targetTileId,
    path: [params.originTileId, params.targetTileId],
    exitAnchorId: resolveUnitExitAnchorId(roadExitDirection),
    roadExitDirection,
    startedAt,
    estimatedArrivalAt,
    durationSec,
  }
}

function applyUnitMarchTiming(params: {
  world: WorldState
  unitId: string
  originTileId: string
  targetTileId: string
  startedAtMs: number
}): WorldState {
  const unit = params.world.units.find((candidate) => candidate.id === params.unitId)
  if (!unit) {
    return params.world
  }

  const march = buildUnitMarchState({
    unit,
    world: params.world,
    originTileId: params.originTileId,
    targetTileId: params.targetTileId,
    startedAtMs: params.startedAtMs,
  })

  return {
    ...params.world,
    units: params.world.units.map((candidate) =>
      candidate.id === params.unitId
        ? {
            ...candidate,
            march,
          }
        : candidate,
    ),
  }
}

function buildUnitMapVisual(unit: Unit, world: WorldState): UnitMapVisualState {
  const previousMapVisual = unit.mapVisual
  const previousVisualTileId = previousMapVisual?.currentTileId?.trim()
  const isMarching = unit.status === '行军中'
  const march = isMarching ? unit.march : undefined
  const inheritedPath = Array.isArray(previousMapVisual?.currentPath)
    ? previousMapVisual.currentPath.filter((tileId) => typeof tileId === 'string' && tileId.trim().length > 0)
    : []
  const currentPath =
    march?.path && march.path.length >= 2
      ? march.path
      : isMarching && previousVisualTileId && previousVisualTileId !== unit.tileId
      ? [previousVisualTileId, unit.tileId]
      : isMarching && inheritedPath.length >= 2 && inheritedPath[inheritedPath.length - 1] === unit.tileId
        ? inheritedPath
        : undefined
  const targetTileId = march?.targetTileId ?? (currentPath ? currentPath[currentPath.length - 1] : undefined)
  const estimatedArrivalAt = march?.estimatedArrivalAt

  return {
    visualType: resolveUnitMapVisualType(unit),
    primaryTroopType: unit.hero.troopType,
    formationSlots: buildUnitMapFormationSlots(unit),
    ownerType: unit.aiPlayerId ? 'ai' : 'human',
    bannerColor: world.factions[unit.faction]?.colorHex ?? world.factions[unit.faction]?.nationColorHex,
    currentTileId: unit.tileId,
    targetTileId,
    currentPath,
    exitAnchorId: march?.exitAnchorId,
    roadExitDirection: march?.roadExitDirection,
    status: unit.status,
    label: unit.name,
    marchStartedAt: march?.startedAt,
    estimatedArrivalAt,
    etaAt: estimatedArrivalAt,
  }
}

function normalizeUnitMapVisualsForWorld(world: WorldState): { world: WorldState; changed: boolean } {
  let changed = false
  const units = world.units.map((unit) => {
    const nextMapVisual = buildUnitMapVisual(unit, world)
    if (JSON.stringify(unit.mapVisual ?? null) === JSON.stringify(nextMapVisual)) {
      return unit
    }
    changed = true
    return {
      ...unit,
      mapVisual: nextMapVisual,
    }
  })

  if (!changed) {
    return { world, changed: false }
  }

  return {
    world: {
      ...world,
      units,
    },
    changed: true,
  }
}

let worldState: WorldState = normalizeUnitMapVisualsForWorld(normalizeAllianceOfficerAuthorityForWorld(normalizeWorldGeneralTacticalSkillSlotsForWorld(createInitialWorldState({
  resourceGenerationPolicy: WORLD_RESOURCE_GENERATION_POLICY,
})).world).world).world
syncAllFactionAiQuota(worldState)
let mapLayoutVersion = DEFAULT_MAP_LAYOUT_VERSION
let worldMapLayout = buildWorldMapLayout(worldState, mapLayoutVersion)
const EAST_HAN_LAYERED_SCHEMA_VERSION = 'east_han_godot_main_map_layered_response_v0_1'
const EAST_HAN_LAYERED_WORLD_ID = 'unified_aoi_v0_6_formal_real_map_data_1km'
const EAST_HAN_LAYERED_COORDINATE_SPACE = 'real_map_data_1km.cell_1km'
const EAST_HAN_MAIN_MAP_RUNTIME_SCHEMA_VERSION = 'main_map_runtime_v0_1'
const EAST_HAN_MAIN_MAP_OWNER_INDEX_VERSION = 'east_han_owner_index_raster_v0_1'
const EAST_HAN_MAIN_MAP_MAX_EVENT_LOG = 5000
const EAST_HAN_MAIN_MAP_CLAIM_IMMUNITY_MS = 60 * 60 * 1000
const EAST_HAN_MAIN_MAP_CLAIM_IMMUNITY_SOURCE = 'main_map_cell_claim'
const EAST_HAN_MAIN_MAP_RELEASE_IMMUNITY_SOURCE = 'main_map_cell_release'
const EAST_HAN_LAYERED_ADAPTER_ARTIFACT_PATH = resolvePath(
  process.cwd(),
  'experiments',
  'east_asia_map_pipeline',
  'generated',
  'east_han_godot_main_map_layered_adapter_v0_1',
  'east_han_godot_main_map_layered_adapter_v0_1.json',
)
const EAST_HAN_TIANXIA_YUTU_OVERVIEW_LAYER = 'tianxia_yutu_overview'
const EAST_HAN_TIANXIA_YUTU_RUNTIME_TILE_MANIFEST_ARTIFACT_ID =
  'east_han_tianxia_yutu_runtime_tile_manifest_v0_1'
const EAST_HAN_TIANXIA_YUTU_RUNTIME_TILE_MANIFEST_PATH = resolvePath(
  process.cwd(),
  'experiments',
  'east_asia_map_pipeline',
  'generated',
  EAST_HAN_TIANXIA_YUTU_RUNTIME_TILE_MANIFEST_ARTIFACT_ID,
  `${EAST_HAN_TIANXIA_YUTU_RUNTIME_TILE_MANIFEST_ARTIFACT_ID}.json`,
)
const EAST_HAN_TIANXIA_YUTU_ADMIN_FOCUS_MASK_ARTIFACT_ID =
  'east_han_tianxia_yutu_admin_focus_masks_v0_1'
const EAST_HAN_TIANXIA_YUTU_ADMIN_FOCUS_MASK_MANIFEST_PATH = resolvePath(
  process.cwd(),
  'experiments',
  'east_asia_map_pipeline',
  'generated',
  EAST_HAN_TIANXIA_YUTU_ADMIN_FOCUS_MASK_ARTIFACT_ID,
  `${EAST_HAN_TIANXIA_YUTU_ADMIN_FOCUS_MASK_ARTIFACT_ID}.json`,
)
const EAST_HAN_ACCEPTED_AUTHORING_SEED_ARTIFACT_ID = 'east_han_accepted_authoring_seed_v0_1'
const EAST_HAN_ACCEPTED_AUTHORING_SEED_PATH = resolvePath(
  process.cwd(),
  'experiments',
  'east_asia_map_pipeline',
  'generated',
  EAST_HAN_ACCEPTED_AUTHORING_SEED_ARTIFACT_ID,
  `${EAST_HAN_ACCEPTED_AUTHORING_SEED_ARTIFACT_ID}.json`,
)
const EAST_HAN_STATE_BOUNDARY_SEGMENTS_ARTIFACT_ID = 'state_boundary_segments_v0_2'
const EAST_HAN_STATE_BOUNDARY_SEGMENTS_PATH = resolvePath(
  process.cwd(),
  'experiments',
  'east_asia_map_pipeline',
  'generated',
  'east_han_autofix_authoring_seed_v0_2',
  `${EAST_HAN_STATE_BOUNDARY_SEGMENTS_ARTIFACT_ID}.json`,
)
const EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_LAYER = 'main_world_mountain_boundaries'
const EAST_HAN_MAIN_WORLD_CHOKEPOINT_LAYER = 'main_world_chokepoints'
const EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_CONTRACT_ARTIFACT_ID =
  'mountain_barrier_main_world_runtime_contract_v0_47'
const EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_CONTRACT_PATH = resolvePath(
  process.cwd(),
  'experiments',
  'east_asia_map_pipeline',
  'generated',
  EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_CONTRACT_ARTIFACT_ID,
  `${EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_CONTRACT_ARTIFACT_ID}.json`,
)
const EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_ASSET_ROOT =
  'res://assets/themes/slgclient/current/world/mountains'
const EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_ASSET_MANIFEST_RES_PATH =
  `${EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_ASSET_ROOT}/main_world_mountain_boundary_assets_manifest_v0_47.json`
const EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_ASSET_MANIFEST_PATH = resolvePath(
  process.cwd(),
  'godot-client',
  'assets',
  'themes',
  'slgclient',
  'current',
  'world',
  'mountains',
  'main_world_mountain_boundary_assets_manifest_v0_47.json',
)
const EAST_HAN_CONTESTED_CHOKEPOINT_CONTRACT_ARTIFACT_ID = 'mountain_barrier_contested_chokepoint_contract_v0_31'
const EAST_HAN_CONTESTED_CHOKEPOINT_CONTRACT_REPO_PATH =
  'experiments/east_asia_map_pipeline/generated/mountain_barrier_contested_chokepoint_contract_v0_31/mountain_barrier_contested_chokepoint_contract_v0_31.json'
const EAST_HAN_CONTESTED_CHOKEPOINT_CONTRACT_MARKDOWN_REPO_PATH =
  'experiments/east_asia_map_pipeline/generated/mountain_barrier_contested_chokepoint_contract_v0_31/mountain_barrier_contested_chokepoint_contract_v0_31.md'
const EAST_HAN_CONTESTED_CHOKEPOINT_EARLIER_ACCEPTANCE_REVIEW_REPO_PATH =
  'experiments/east_asia_map_pipeline/generated/mountain_barrier_contested_chokepoint_contract_v0_18/reviews/real_ridge_stitch_acceptance_review_v0_18.md'
const EAST_HAN_CONTESTED_CHOKEPOINT_MASTER_SOURCE_REPO_PATH =
  'experiments/east_asia_map_pipeline/generated/mountain_barrier_contested_chokepoint_contract_v0_31/master/mountain_barrier_east_west_no_basepad_master_source.png'
const EAST_HAN_CONTESTED_CHOKEPOINT_MASTER_NORMAL_REPO_PATH =
  'experiments/east_asia_map_pipeline/generated/mountain_barrier_contested_chokepoint_contract_v0_31/master/mountain_barrier_east_west_no_basepad_master_normal.png'
const EAST_HAN_CONTESTED_CHOKEPOINT_MASTER_ASSET_RES_PATH =
  'res://assets/themes/slgclient/current/world/chokepoints/main_world_chokepoint_pass_wall_east_west_no_basepad_master_v0_31.png'
const EAST_HAN_LAYERED_DEFAULT_LAYER_ORDER = [
  'base_map',
  'derived_masks',
  'maritime_passability',
  'resource_overlay',
  'city_gate_anchors',
  EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_LAYER,
  EAST_HAN_MAIN_WORLD_CHOKEPOINT_LAYER,
  'labels',
] satisfies readonly WorldMapLayoutLayerRequest[]
const EAST_HAN_LAYERED_LAYER_REQUEST_WHITELIST: readonly WorldMapLayoutLayerRequest[] = [
  ...EAST_HAN_LAYERED_DEFAULT_LAYER_ORDER,
  'main_world_cells',
  'cell_overrides',
  EAST_HAN_TIANXIA_YUTU_OVERVIEW_LAYER,
  EAST_HAN_STATE_DETAIL_TILES_LAYER,
  EAST_HAN_STATE_ROAD_NETWORK_LAYER,
  EAST_HAN_STATE_STRATEGIC_NODES_LAYER,
] as const
const EAST_HAN_LAYERED_LAYER_REQUEST_SET = new Set<WorldMapLayoutLayerRequest>(EAST_HAN_LAYERED_LAYER_REQUEST_WHITELIST)
const EAST_HAN_LAYERED_DEFAULT_VISIBLE_SIZE_CELLS: CellSize = { width: 512, height: 320 }
const EAST_HAN_LAYERED_DEFAULT_CHUNK_SIZE_CELLS: CellSize = { width: 64, height: 64 }
const EAST_HAN_LAYERED_DEFAULT_PRELOAD_MARGIN_CELLS = 64

type JsonRecord = Record<string, unknown>
type ExclusiveCellBounds = {
  startX: number
  startY: number
  endXExclusive: number
  endYExclusive: number
}

let eastHanLayeredAdapterCache: JsonRecord | null | undefined
let eastHanTianxiaYutuRuntimeTileManifestCache: JsonRecord | null | undefined
let eastHanTianxiaYutuAdminFocusMaskManifestCache: JsonRecord | null | undefined
let eastHanAcceptedAuthoringSeedCache: JsonRecord | null | undefined
let eastHanStateBoundarySegmentsCache: JsonRecord | null | undefined
let eastHanMainWorldMountainBoundaryContractCache: JsonRecord | null | undefined
let eastHanMainWorldMountainBoundaryAssetManifestCache: JsonRecord | null | undefined
let mapLayoutTileByCoord = new Map<string, WorldMapLayoutTile>()
let mapLayoutRegionIdByTileId = new Map<string, string>()
const tileStateDiffByVersion = new Map<number, WorldMapTileState[]>()
const intelDiffByVersion = new Map<number, WorldState['intel']>()
const worldEvents: WorldEventRecord[] = []
const replayArchive = new Map<string, ReplayArchiveEntry>()
const saveSlots = new Map<string, SaveSlotState>()
let saveSlotsPersistDirty = false
let saveSlotsPersistInFlight = false
let saveSlotsPersistTimer: ReturnType<typeof setTimeout> | null = null
let saveSlotsLoaded = false
let saveSlotsPersistSuccessCount = 0
let saveSlotsPersistFailureCount = 0
let saveSlotsLastPersistAt: number | null = null
let saveSlotsLastPersistErrorAt: number | null = null
let saveSlotsCorruptQuarantineCount = 0
let saveSlotsLastCorruptQuarantineAt: number | null = null
let saveSlotsRestoredSlotCount = 0
let saveSlotsLastRestoreAt: number | null = null
let saveSlotsPersistLockContentionCount = 0
let saveSlotsPersistLockStealCount = 0
let saveSlotsPersistLockFailureCount = 0
let saveSlotsArchiveFileCount = 0
let saveSlotsArchiveSuccessCount = 0
let saveSlotsArchiveFailureCount = 0
let saveSlotsLastArchiveAt: number | null = null
let saveSlotsLastArchiveErrorAt: number | null = null
let saveSlotsLastArchivePath: string | null = null
let saveSlotsRestoreDrillSuccessCount = 0
let saveSlotsRestoreDrillFailureCount = 0
let saveSlotsLastRestoreDrillAt: number | null = null
let saveSlotsLastRestoreDrillErrorAt: number | null = null
let saveSlotsLastRestoreDrillArchivePath: string | null = null
let saveSlotsLastRestoreDrillSlotCount: number | null = null
let saveSlotsLastRestoreDrillStatus: SaveSlotsArchiveRestoreDrillStatus | null = null
let saveSlotsLastRestoreDrillMessage: string | null = null
let saveSlotsRestoreApplySuccessCount = 0
let saveSlotsRestoreApplyFailureCount = 0
let saveSlotsLastRestoreApplyAt: number | null = null
let saveSlotsLastRestoreApplyErrorAt: number | null = null
let saveSlotsLastRestoreApplyArchivePath: string | null = null
let saveSlotsLastRestoreApplyBackupPath: string | null = null
let saveSlotsLastRestoreApplySlotCount: number | null = null
let saveSlotsLastRestoreApplyStatus: SaveSlotsArchiveRestoreApplyStatus | null = null
let saveSlotsLastRestoreApplyMessage: string | null = null
let saveSlotsRestoreRollbackDrillSuccessCount = 0
let saveSlotsRestoreRollbackDrillFailureCount = 0
let saveSlotsLastRestoreRollbackDrillAt: number | null = null
let saveSlotsLastRestoreRollbackDrillErrorAt: number | null = null
let saveSlotsLastRestoreRollbackDrillArchivePath: string | null = null
let saveSlotsLastRestoreRollbackDrillBackupPath: string | null = null
let saveSlotsLastRestoreRollbackDrillStorePath: string | null = null
let saveSlotsLastRestoreRollbackDrillSlotCount: number | null = null
let saveSlotsLastRestoreRollbackDrillStatus: SaveSlotsArchiveRestoreRollbackDrillStatus | null = null
let saveSlotsLastRestoreRollbackDrillMessage: string | null = null
let saveSlotsLastRestoreRollbackDrillVerified: boolean | null = null
let lastNationalAgenda: NationalAgendaWindow | null = null
let shouldPersistRestoredWorldState = false
loadPersistedWorldState((savedWorldState) => {
  const strategicNodesNormalized = normalizeWorldStrategicNodesForWorld(savedWorldState)
  const normalized = normalizeWorldResourceGenerationForWorld(strategicNodesNormalized.world)
  const worldAffairsNormalized = normalizeWorldAffairsStateForWorld(normalized.world)
  const worldTasksNormalized = normalizeWorldTasksStateForWorld(worldAffairsNormalized.world)
  const tacticalSkillSlotsNormalized = normalizeWorldGeneralTacticalSkillSlotsForWorld(worldTasksNormalized.world)
  const officerAuthorityNormalized = normalizeAllianceOfficerAuthorityForWorld(tacticalSkillSlotsNormalized.world)
  const unitMapVisualsNormalized = normalizeUnitMapVisualsForWorld(officerAuthorityNormalized.world)
  worldState = unitMapVisualsNormalized.world
  shouldPersistRestoredWorldState =
    shouldPersistRestoredWorldState ||
    strategicNodesNormalized.changed ||
    normalized.changed ||
    worldAffairsNormalized.changed ||
    worldTasksNormalized.changed ||
    tacticalSkillSlotsNormalized.changed ||
    officerAuthorityNormalized.changed ||
    unitMapVisualsNormalized.changed
  syncAllFactionAiQuota(worldState)
}) // P0: restore world state first
worldMapLayout = buildWorldMapLayout(worldState, mapLayoutVersion)
loadPersistedNarrativeEvents()
loadPersistedSaveSlots()
refreshSaveSlotsArchiveFileCount()
syncV2StateWithWorld(worldState)
if (shouldPersistRestoredWorldState) {
  scheduleWorldPersist(() => worldState)
}

appendWorldEvent({
  category: 'system',
  action: 'world_bootstrapped',
  success: true,
  tick: worldState.tick,
  worldVersion: worldState.worldVersion,
  message: 'world service initialized',
})
refreshReplayArchive()
rebuildMapLayoutIndexes()

type ReadModelWorldTileTarget = {
  kind: 'world_tile'
  id: string
}

type WorldAffairsReadModelNodeWithTarget = WorldAffairsReadModel['nodes'][number] & {
  targetTileId?: string
  actionTarget?: ReadModelWorldTileTarget
}

function resolvePrimaryReadModelAnchorTileIds(world: WorldState, factionId: FactionId): string[] {
  const faction = world.factions[factionId]
  const anchors: string[] = []
  if (faction?.nationCapitalTileId) {
    anchors.push(faction.nationCapitalTileId)
  }

  const ownedCities = world.map.tiles
    .filter((tile) => tile.owner === factionId && tile.type === 'city')
    .sort((left, right) => {
      const landmarkRank = Number(right.landmarkId === 'qingshi') - Number(left.landmarkId === 'qingshi')
      if (landmarkRank !== 0) {
        return landmarkRank
      }
      const levelRank = Number(right.cityLevel ?? 0) - Number(left.cityLevel ?? 0)
      if (levelRank !== 0) {
        return levelRank
      }
      return left.id.localeCompare(right.id)
    })
  anchors.push(...ownedCities.map((tile) => tile.id))
  anchors.push(...world.units.filter((unit) => unit.faction === factionId).map((unit) => unit.tileId))

  return Array.from(new Set(anchors.filter((tileId) => world.map.tiles.some((tile) => tile.id === tileId))))
}

function resolveNearestReadModelTileId(params: {
  world: WorldState
  factionId: FactionId
  preferResource: boolean
}): string | undefined {
  const tileById = new Map(params.world.map.tiles.map((tile) => [tile.id, tile]))
  const anchorTileIds = resolvePrimaryReadModelAnchorTileIds(params.world, params.factionId)
  const visited = new Set<string>()
  const queue = anchorTileIds.map((tileId) => ({ tileId, distance: 0 }))
  let fallbackTileId: string | undefined

  for (const anchorTileId of anchorTileIds) {
    visited.add(anchorTileId)
  }

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) {
      break
    }

    const tile = tileById.get(current.tileId)
    if (tile && current.distance > 0) {
      fallbackTileId ??= tile.id
      if (!params.preferResource || tile.type === 'resource') {
        return tile.id
      }
    }

    if (current.distance >= 4) {
      continue
    }

    for (const nextTileId of params.world.map.connections[current.tileId] ?? []) {
      if (visited.has(nextTileId) || !tileById.has(nextTileId)) {
        continue
      }
      visited.add(nextTileId)
      queue.push({ tileId: nextTileId, distance: current.distance + 1 })
    }
  }

  return fallbackTileId ?? anchorTileIds[0]
}

function enrichWorldTasksReadModelTargets(model: WorldTasksReadModel, world: WorldState, factionId: FactionId): WorldTasksReadModel {
  return {
    ...model,
    tasks: model.tasks.map((task) => {
      if (task.actionTarget?.kind !== 'world_tile') {
        return task
      }

      const existingTargetId = task.actionTarget.id
      if (existingTargetId && world.map.tiles.some((tile) => tile.id === existingTargetId)) {
        return task
      }

      const targetTileId = resolveNearestReadModelTileId({
        world,
        factionId,
        preferResource: existingTargetId === 'resource_nearby',
      })
      if (!targetTileId) {
        return task
      }

      return {
        ...task,
        actionTarget: {
          ...task.actionTarget,
          id: targetTileId,
        },
      }
    }),
  }
}

function enrichWorldAffairsReadModelTargets(
  model: WorldAffairsReadModel,
  world: WorldState,
  factionId: FactionId,
): WorldAffairsReadModel {
  const targetTileId = resolveNearestReadModelTileId({ world, factionId, preferResource: true })
  if (!targetTileId) {
    return model
  }

  return {
    ...model,
    nodes: model.nodes.map((node) => {
      if (node.nodeId !== model.activeNodeId) {
        return node
      }

      const enrichedNode: WorldAffairsReadModelNodeWithTarget = {
        ...node,
        targetTileId,
        actionTarget: {
          kind: 'world_tile',
          id: targetTileId,
        },
      }
      return enrichedNode
    }),
  }
}

export function getWorldSnapshot(): WorldSnapshotResponse {
  return {
    world: structuredClone(worldState),
  }
}

export function getWorldSummary(options?: WorldSummaryOptions): WorldSummaryResponse {
  const resolvedOptions = resolveWorldSummaryOptions(options)
  const tileStatePayload = resolveTileStatePayload(resolvedOptions.sinceWorldVersion)
  const intelPayload = resolveIntelPayload(resolvedOptions)

  return {
    world: buildWorldSummary(
      worldState,
      tileStatePayload.tileStates,
      tileStatePayload.mode,
      intelPayload,
      resolvedOptions,
      tileStatePayload.baseWorldVersion,
    ),
  }
}

export function getWorldAffairsReadModel(): WorldAffairsReadModelResponse {
  return {
    worldAffairs: enrichWorldAffairsReadModelTargets(
      buildWorldAffairsReadModel(worldState),
      worldState,
      resolveDefaultFactionId(),
    ),
  }
}

export function getWorldTasksReadModel(factionId?: FactionId): WorldTasksReadModelResponse {
  const targetFactionId = factionId ?? resolveDefaultFactionId()
  return {
    worldTasks: enrichWorldTasksReadModelTargets(buildWorldTasksReadModel(worldState, targetFactionId), worldState, targetFactionId),
  }
}

export function getWorldMapLayout(options?: WorldMapLayoutOptions): WorldMapLayoutResponse {
  const resolvedOptions = resolveWorldMapLayoutOptions(options)

  if (resolvedOptions.scope === 'full') {
    return {
      ...worldMapLayout,
      chunk: {
        scope: 'full',
        loadedProvinceIds: listProvinceIds(worldMapLayout.map.tiles),
      },
    }
  }

  if (resolvedOptions.scope === 'province') {
    return buildProvinceLayoutChunk(resolvedOptions.provinceId)
  }

  if (resolvedOptions.scope === 'region') {
    return buildRegionLayoutChunk(resolvedOptions.regionId)
  }

  if (resolvedOptions.scope === 'viewport') {
    if (isEastHanLayeredViewportRequested(resolvedOptions)) {
      return buildEastHanLayeredViewportResponse(resolvedOptions)
    }

    return buildViewportLayoutChunk(
      resolvedOptions.centerX,
      resolvedOptions.centerY,
      resolvedOptions.layer === 'layered' ? 'tile' : resolvedOptions.layer,
      resolvedOptions.visibleCells,
      resolvedOptions.preloadMarginCells,
      resolvedOptions.chunkSizeCells,
    )
  }

  return buildBootstrapLayoutChunk()
}

export function getWorldStateReadonly(): Readonly<WorldState> {
  return worldState
}

export function applyFoundedNationProfileToWorld(
  profile: NationProfile,
  options: {
    sourceAction?: 'foundNation' | 'updateNationProfile'
    previousNationName?: string
    previousColor?: string
    previousCapitalTileId?: string
    previousCapitalName?: string
    changedFields?: NationProfileChangedField[]
    renameCooldownUntil?: string
    authorityGrantId?: string
    actorCommanderId?: string
    actorCommanderName?: string
    actorSessionId?: string
    actorPlayerName?: string
  } = {},
) {
  const mutationLock = tryAcquireWorldMutationLock('apply_founded_nation_profile')
  if (!mutationLock) {
    throw new Error('world mutation busy while applying founded nation profile')
  }

  try {
    const faction = worldState.factions[profile.factionId]
    if (!faction) {
      throw new Error(`Unsupported factionId: ${profile.factionId}`)
    }

    const nextWorld = structuredClone(worldState)
    const nextFaction = nextWorld.factions[profile.factionId]
    const sourceAction = options.sourceAction ?? 'foundNation'
    const changedAt = new Date().toISOString()
    const changedFields = options.changedFields ?? ['nationName', 'color']
    const previousNationName = options.previousNationName ?? nextFaction.nationName
    const previousColor = options.previousColor ?? nextFaction.colorHex
    const previousHistory = Array.isArray(nextFaction.nationNameHistory)
      ? nextFaction.nationNameHistory
      : []
    const nextHistory =
      previousNationName && previousNationName !== profile.nationName
        ? [
            ...previousHistory,
            {
              nationName: previousNationName,
              changedAt,
              changedTo: profile.nationName,
              sourceAction,
            },
          ].slice(-24)
        : previousHistory
    const previousAuditLog = Array.isArray(nextFaction.nationProfileAuditLog)
      ? nextFaction.nationProfileAuditLog
      : []
    const nextAuditEntry: NationProfileAuditEntry = {
      id: randomUUID(),
      action: sourceAction,
      changedAt,
      factionId: profile.factionId,
      changedFields,
      previousNationName,
      nextNationName: profile.nationName,
      previousColor,
      nextColor: profile.color,
      previousCapitalTileId: options.previousCapitalTileId,
      previousCapitalName: options.previousCapitalName,
      nextCapitalTileId: profile.capitalTileId,
      nextCapitalName: profile.capitalName,
      authorityGrantId: options.authorityGrantId,
      actorCommanderId: options.actorCommanderId,
      actorCommanderName: options.actorCommanderName,
      actorSessionId: options.actorSessionId,
      actorPlayerName: options.actorPlayerName,
    }
    nextWorld.worldVersion += 1
    nextWorld.factions[profile.factionId] = {
      ...nextFaction,
      organizationKind: 'nation',
      organizationName: profile.nationName,
      nationName: profile.nationName,
      nationTier: profile.tier ?? nextFaction.nationTier ?? 'kingdom',
      colorHex: profile.color,
      nationColorHex: profile.color,
      nationCapitalTileId: profile.capitalTileId,
      nationCapitalName: profile.capitalName,
      nationEmpireFoundedAt: profile.empireFoundedAt ?? nextFaction.nationEmpireFoundedAt,
      nationEmpireUpgradeCostJade: profile.empireUpgradeCostJade ?? nextFaction.nationEmpireUpgradeCostJade,
      nationRenameCooldownUntil: options.renameCooldownUntil ?? nextFaction.nationRenameCooldownUntil,
      nationNameHistory: nextHistory,
      nationProfileAuditLog: [...previousAuditLog, nextAuditEntry].slice(-50),
    }
    commitWorldState(nextWorld)
    appendWorldEvent({
      category: 'world_action',
      action: 'apply_founded_nation_profile',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      metadata: {
        factionId: profile.factionId,
        nationName: profile.nationName,
        color: profile.color,
        sourceAction,
        changedFields,
        previousNationName,
        previousColor,
        previousCapitalTileId: options.previousCapitalTileId,
        previousCapitalName: options.previousCapitalName,
        nextCapitalTileId: profile.capitalTileId,
        nextCapitalName: profile.capitalName,
        renameCooldownUntil: options.renameCooldownUntil,
        authorityGrantId: options.authorityGrantId,
        actorCommanderId: options.actorCommanderId,
        actorCommanderName: options.actorCommanderName,
        actorSessionId: options.actorSessionId,
        actorPlayerName: options.actorPlayerName,
      },
    })
  } finally {
    mutationLock.release()
  }
}

export function applyNationCapitalMigrationToWorld(
  profile: NationProfile,
  options: {
    previousNationName?: string
    previousColor?: string
    previousCapitalTileId?: string
    previousCapitalName?: string
    changedFields: NationProfileChangedField[]
    renameCooldownUntil: string
    jadeCost: number
    previousJade: number
    nextJade: number
    authorityGrantId?: string
    actorCommanderId?: string
    actorCommanderName?: string
    actorSessionId?: string
    actorPlayerName?: string
  },
) {
  const mutationLock = tryAcquireWorldMutationLock('apply_nation_capital_migration')
  if (!mutationLock) {
    throw new Error('world mutation busy while applying nation capital migration')
  }

  try {
    const faction = worldState.factions[profile.factionId]
    if (!faction) {
      throw new Error(`Unsupported factionId: ${profile.factionId}`)
    }

    const nextWorld = structuredClone(worldState)
    const nextFaction = nextWorld.factions[profile.factionId]
    const changedAt = new Date().toISOString()
    const previousNationName = options.previousNationName ?? nextFaction.nationName
    const previousColor = options.previousColor ?? nextFaction.colorHex
    const previousCapitalTileId = options.previousCapitalTileId ?? nextFaction.nationCapitalTileId
    const previousCapitalName = options.previousCapitalName ?? nextFaction.nationCapitalName
    const previousHistory = Array.isArray(nextFaction.nationNameHistory)
      ? nextFaction.nationNameHistory
      : []
    const nextHistory =
      previousNationName && previousNationName !== profile.nationName
        ? [
            ...previousHistory,
            {
              nationName: previousNationName,
              changedAt,
              changedTo: profile.nationName,
              sourceAction: 'migrateCapital' as const,
            },
          ].slice(-24)
        : previousHistory
    const previousAuditLog = Array.isArray(nextFaction.nationProfileAuditLog)
      ? nextFaction.nationProfileAuditLog
      : []
    const nextAuditEntry: NationProfileAuditEntry = {
      id: randomUUID(),
      action: 'migrateCapital',
      changedAt,
      factionId: profile.factionId,
      changedFields: options.changedFields,
      previousNationName,
      nextNationName: profile.nationName,
      previousColor,
      nextColor: profile.color,
      previousCapitalTileId,
      previousCapitalName,
      nextCapitalTileId: profile.capitalTileId,
      nextCapitalName: profile.capitalName,
      jadeCost: options.jadeCost,
      previousJade: options.previousJade,
      nextJade: options.nextJade,
      actorCommanderId: options.actorCommanderId,
      actorCommanderName: options.actorCommanderName,
      authorityGrantId: options.authorityGrantId,
      actorSessionId: options.actorSessionId,
      actorPlayerName: options.actorPlayerName,
    }

    nextWorld.worldVersion += 1
    nextWorld.factions[profile.factionId] = {
      ...nextFaction,
      organizationKind: 'nation',
      organizationName: profile.nationName,
      nationName: profile.nationName,
      nationTier: profile.tier ?? nextFaction.nationTier ?? 'kingdom',
      colorHex: profile.color,
      nationColorHex: profile.color,
      nationCapitalTileId: profile.capitalTileId,
      nationCapitalName: profile.capitalName,
      nationRenameCooldownUntil: options.renameCooldownUntil,
      nationNameHistory: nextHistory,
      nationProfileAuditLog: [...previousAuditLog, nextAuditEntry].slice(-50),
      jade: options.nextJade,
    }

    commitWorldState(nextWorld)
    appendWorldEvent({
      category: 'world_action',
      action: 'migrate_nation_capital',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      metadata: {
        factionId: profile.factionId,
        nationName: profile.nationName,
        color: profile.color,
        previousNationName,
        previousColor,
        previousCapitalTileId,
        nextCapitalTileId: profile.capitalTileId,
        jadeCost: options.jadeCost,
        previousJade: options.previousJade,
        nextJade: options.nextJade,
        authorityGrantId: options.authorityGrantId,
        actorCommanderId: options.actorCommanderId,
        actorCommanderName: options.actorCommanderName,
        actorSessionId: options.actorSessionId,
        actorPlayerName: options.actorPlayerName,
      },
    })
  } finally {
    mutationLock.release()
  }
}

export function applyNationEmpireUpgradeToWorld(params: {
  factionId: FactionId
  costJade: number
  previousTier?: NationTier
  nextTier: 'empire'
  authorityGrantId?: string
  actorCommanderId: string
  actorCommanderName: string
  actorSessionId?: string
  actorPlayerName?: string
}) {
  const mutationLock = tryAcquireWorldMutationLock('upgrade_nation_empire')
  if (!mutationLock) {
    throw new Error('world mutation busy while upgrading nation to empire')
  }

  try {
    const faction = worldState.factions[params.factionId]
    if (!faction) {
      throw new Error(`Unsupported factionId: ${params.factionId}`)
    }

    const nextWorld = structuredClone(worldState)
    const nextFaction = nextWorld.factions[params.factionId]
    const changedAt = new Date().toISOString()
    const previousTier = params.previousTier ?? nextFaction.nationTier ?? 'kingdom'
    const previousJade = Math.max(0, Math.floor(Number(nextFaction.jade ?? 0)))
    const nextJade = Math.max(0, previousJade - params.costJade)
    const previousAuditLog = Array.isArray(nextFaction.nationProfileAuditLog)
      ? nextFaction.nationProfileAuditLog
      : []
    const nextAuditEntry: NationProfileAuditEntry = {
      id: randomUUID(),
      action: 'upgradeEmpire',
      changedAt,
      factionId: params.factionId,
      changedFields: ['tier', 'jade'],
      previousNationName: nextFaction.nationName ?? nextFaction.organizationName,
      nextNationName: nextFaction.nationName ?? nextFaction.organizationName,
      previousColor: nextFaction.colorHex ?? nextFaction.nationColorHex,
      nextColor: nextFaction.colorHex ?? nextFaction.nationColorHex,
      previousTier,
      nextTier: params.nextTier,
      jadeCost: params.costJade,
      previousJade,
      nextJade,
      actorCommanderId: params.actorCommanderId,
      actorCommanderName: params.actorCommanderName,
      authorityGrantId: params.authorityGrantId,
      actorSessionId: params.actorSessionId,
      actorPlayerName: params.actorPlayerName,
    }

    nextWorld.worldVersion += 1
    nextWorld.factions[params.factionId] = {
      ...nextFaction,
      organizationKind: 'nation',
      nationTier: params.nextTier,
      nationEmpireFoundedAt: changedAt,
      nationEmpireUpgradeCostJade: params.costJade,
      jade: nextJade,
      nationProfileAuditLog: [...previousAuditLog, nextAuditEntry].slice(-50),
    }

    commitWorldState(nextWorld)
    appendWorldEvent({
      category: 'world_action',
      action: 'upgrade_nation_empire',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      metadata: {
        factionId: params.factionId,
        previousTier,
        nextTier: params.nextTier,
        costJade: params.costJade,
        previousJade,
        nextJade,
        actorCommanderId: params.actorCommanderId,
        actorCommanderName: params.actorCommanderName,
        authorityGrantId: params.authorityGrantId,
        actorPlayerName: params.actorPlayerName,
        ...buildOrganizationNationEmpireUpgradeHistoryOverlay({
          organizationId: params.factionId,
          organizationName: resolveOrganizationDisplayName(params.factionId, params.factionId),
          actorCommanderName: params.actorCommanderName,
          requiredOfficerRole: 'alliance_commander',
        }),
      },
    })

    return {
      changedAt,
      previousTier,
      nextTier: params.nextTier,
      previousJade,
      nextJade,
      auditEntry: nextAuditEntry,
    }
  } finally {
    mutationLock.release()
  }
}

export function resetWorldServiceForTests(mutator?: (world: WorldState) => void) {
  worldState = normalizeUnitMapVisualsForWorld(normalizeAllianceOfficerAuthorityForWorld(normalizeWorldGeneralTacticalSkillSlotsForWorld(createInitialWorldState({
    resourceGenerationPolicy: WORLD_RESOURCE_GENERATION_POLICY,
  })).world).world).world
  syncAllFactionAiQuota(worldState)
  mapLayoutVersion = DEFAULT_MAP_LAYOUT_VERSION
  worldMapLayout = buildWorldMapLayout(worldState, mapLayoutVersion)
  tileStateDiffByVersion.clear()
  intelDiffByVersion.clear()
  worldEvents.length = 0
  replayArchive.clear()
  advanceTickRuns.splice(0)
  resetCategoryStats(queuePlanFailureStats)
  resetCategoryStats(queuePlanConflictStats)
  resetCategoryStats(advanceTickFailureStats)
  refreshReplayArchive()
  rebuildMapLayoutIndexes()
  if (mutator) {
    mutator(worldState)
    syncAllFactionAiQuota(worldState)
  }
}

function buildWorldActionResponse(params: {
  ok: boolean
  includeWorld?: boolean
  message?: string
  failureCode?: WorldActionFailureCode
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
  seededNationEmpireSuccessFixture?: WorldActionResponse['seededNationEmpireSuccessFixture']
}): WorldActionResponse {
  const includeWorld = params.includeWorld !== false

  return {
    ok: params.ok,
    tick: worldState.tick,
    worldVersion: worldState.worldVersion,
    world: includeWorld ? structuredClone(worldState) : undefined,
    message: params.message,
    failureCode: params.failureCode,
    immunityUntil: params.immunityUntil,
    immunity_until: params.immunity_until,
    immunityActive: params.immunityActive,
    immunity_active: params.immunity_active,
    immunitySource: params.immunitySource,
    immunity_source: params.immunity_source,
    requestId: params.requestId,
    unitId: params.unitId,
    aiPlayerId: params.aiPlayerId,
    teamId: params.teamId,
    teamIndex: params.teamIndex,
    heroId: params.heroId,
    heroIds: params.heroIds,
    heroNames: params.heroNames,
    tacticId: params.tacticId,
    contextFocusId: params.contextFocusId,
    relatedId: params.relatedId,
    execution: params.execution,
    receipt: params.receipt,
    seededNationEmpireSuccessFixture: params.seededNationEmpireSuccessFixture,
  }
}

function buildResourceTileVisibleCopyForbiddenHits(values: string[]): string[] {
  const hits = new Set<string>()
  for (const value of values) {
    const normalized = String(value ?? '').trim()
    if (normalized && RESOURCE_TILE_VISIBLE_COPY_FORBIDDEN_PATTERN.test(normalized)) {
      hits.add(normalized)
    }
  }
  return Array.from(hits)
}

function buildLandFirstMvpProductForbiddenHits(values: string[]): string[] {
  const hits = new Set<string>()
  const forbiddenPatterns = [
    /海上接战/,
    /舰队/,
    /回港/,
    /巡逻/,
    /拦截/,
    /港口/,
    /snake_case/i,
    /read model/i,
    /authority/i,
    /tier/i,
    /backend/i,
    /contract id/i,
    /守军强度/,
  ]
  for (const value of values) {
    const normalized = String(value ?? '').trim()
    if (!normalized) continue
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(normalized)) {
        hits.add(normalized)
      }
    }
  }
  return Array.from(hits)
}

function buildLandResourceRewardDelta(receiptReadback: Partial<WorldActionReceipt>): Partial<Record<ResourceKind, number>> | undefined {
  const captureReward = receiptReadback.captureReward
  const resourceKind = captureReward?.resourceKind
  const amount = Number(captureReward?.amount?.min ?? 0)
  if (!resourceKind || amount <= 0 || captureReward?.amount?.max !== amount) {
    return undefined
  }
  if (resourceKind !== 'food' && resourceKind !== 'wood' && resourceKind !== 'stone' && resourceKind !== 'iron') {
    return undefined
  }
  return { [resourceKind]: amount } as Partial<Record<ResourceKind, number>>
}

function applyLandResourceRewardDelta(faction: FactionState | undefined, delta: Partial<Record<ResourceKind, number>> | undefined) {
  if (!faction || !delta) return
  if (typeof delta.food === 'number') faction.food += delta.food
  if (typeof delta.wood === 'number') faction.wood = (faction.wood ?? 0) + delta.wood
  if (typeof delta.stone === 'number') faction.stone = (faction.stone ?? 0) + delta.stone
  if (typeof delta.iron === 'number') faction.iron = (faction.iron ?? 0) + delta.iron
}

function buildLandResourceSettlementProductReadback(receiptReadback: Partial<WorldActionReceipt>): Partial<WorldActionReceipt> {
  const preview = receiptReadback.resourceTileExpeditionPreview
  const resourceLabel = preview?.resourceLabel ?? ''
  const captureReward = receiptReadback.captureReward
  const rewardAmount = Number(captureReward?.amount?.min ?? 0)
  const heroExp = Number(captureReward?.heroExp ?? 0)
  const guardSoldiers = Math.round(Number(receiptReadback.defenderStrengthRange?.max ?? 0))
  const recommendedPower = Math.round(Number(receiptReadback.recommendedPower ?? 0))
  const resourceRewardDelta = buildLandResourceRewardDelta(receiptReadback)
  const guardSoldiersLabel = guardSoldiers > 0 ? `守军兵力 ${guardSoldiers}` : ''
  const recommendedPowerLabel = recommendedPower > 0 ? `推荐战力 ${recommendedPower}` : ''
  const captureRewardLabel = rewardAmount > 0 && resourceLabel
    ? `占领奖励 +${rewardAmount} ${resourceLabel} / 武将经验 +${heroExp}`
    : ''
  const battleReportRewardLabel = rewardAmount > 0 && resourceLabel
    ? `战报已记 · 占领奖励 +${rewardAmount} ${resourceLabel}`
    : ''
  const visibleCopy = [
    guardSoldiersLabel,
    recommendedPowerLabel,
    captureRewardLabel,
    battleReportRewardLabel,
    resourceLabel,
  ]
  const forbiddenHits = buildLandFirstMvpProductForbiddenHits(visibleCopy)
  return {
    resourceRewardDelta,
    battleReportResourceRewardDelta: resourceRewardDelta ? { ...resourceRewardDelta } : undefined,
    guardSoldiersLabel: guardSoldiersLabel || undefined,
    recommendedPowerLabel: recommendedPowerLabel || undefined,
    captureRewardLabel: captureRewardLabel || undefined,
    battleReportRewardLabel: battleReportRewardLabel || undefined,
    landFirstMvpGlobalProductContractOk: forbiddenHits.length === 0 ? true : undefined,
    l10NotRequiredForCurrentMvp: true,
    copperCurrencySuccessPathOpened: false,
    landFirstMvpProductForbiddenHits: forbiddenHits,
  }
}

function enrichLandResourceBattleRecord(
  world: WorldState,
  params: {
    tileId: string
    unitId: string
    receipt: WorldActionReceipt
  },
) {
  const record = world.feedback.battleRecords.find((candidate) =>
    candidate.tileId === params.tileId &&
    candidate.attackerUnitId === params.unitId &&
    candidate.reportKind === 'resource_guard'
  )
  if (!record) return
  const extended = record as typeof record & {
    resourceRewardDelta?: Partial<Record<ResourceKind, number>>
    captureReward?: WorldActionReceipt['captureReward']
    recommendedPower?: number
    guardSoldiers?: number
    battleReportRewardLabel?: string
    landFirstMvpGlobalProductContractOk?: true
    landFirstMvpProductForbiddenHits?: string[]
  }
  extended.resourceRewardDelta = params.receipt.battleReportResourceRewardDelta
  extended.captureReward = params.receipt.captureReward
  extended.recommendedPower = params.receipt.recommendedPower
  extended.guardSoldiers = Math.round(Number(params.receipt.defenderStrengthRange?.max ?? 0))
  extended.battleReportRewardLabel = params.receipt.battleReportRewardLabel
  extended.landFirstMvpGlobalProductContractOk = params.receipt.landFirstMvpGlobalProductContractOk
  extended.landFirstMvpProductForbiddenHits = params.receipt.landFirstMvpProductForbiddenHits
}

function buildResourceTileBackendSettlementReadback(
  tile: Tile | undefined,
  contestedByFactionId: FactionId,
): Partial<WorldActionReceipt> {
  const l0Economy = buildL0SubstrateEconomyReadModel()
  const base: Partial<WorldActionReceipt> = {
    resourceEconomyConfigVersion: l0Economy.resourceEconomyModelVersion,
    resourceEconomyConfigSource: RESOURCE_TILE_ECONOMY_CONFIG_SOURCE,
    l0SubstrateYieldPerHour: 0,
    l0SubstrateExpeditionRewardBlocked: true,
    resourceTileBackendSettlementReadbackScope: RESOURCE_TILE_BACKEND_SETTLEMENT_READBACK_SCOPE,
    landFirstMvpGlobalProductContractOk: true,
    l10NotRequiredForCurrentMvp: true,
    copperCurrencySuccessPathOpened: false,
    landFirstMvpProductForbiddenHits: [],
  }

  if (!tile || tile.type !== 'resource') {
    const preview = buildResourceTileExpeditionPreview({
      tileType: tile?.type,
      contestedByFactionId,
    })
    return {
      ...base,
      resourceEconomyModelVersion: preview.resourceEconomyModelVersion,
      resourceTileSettlementStatus: preview.status,
      tileLevel: 0,
      baseYieldPerHour: { ...preview.baseYieldPerHour },
      ongoingYieldPerHour: { ...preview.ongoingYield.yieldPerHour },
      defenderStrength: { ...preview.defenderStrength },
      defenderStrengthRange: { ...preview.defenderStrength },
      defenderTroopCount: { ...preview.defenderTroopCount },
      defenderTroopCountRange: { ...preview.defenderTroopCount },
      recommendedPower: preview.recommendedPower,
      landResourceExpeditionBlocked: true,
      resourceTileExpeditionPreview: preview,
      visibleCopyForbiddenHits: buildResourceTileVisibleCopyForbiddenHits([
        preview.resourceLabel,
        preview.difficultyLabel,
        preview.riskLabel,
      ]),
    }
  }

  const preview = buildResourceTileExpeditionPreview({
    tileType: tile.type,
    resourceKind: tile.resourceKind,
    resourceLevel: tile.resourceLevel,
    ownerFactionId: tile.owner,
    occupierFactionId: tile.owner === 'neutral' ? undefined : tile.owner,
    contestedByFactionId,
  })
  const tileLevel = Number.isFinite(Number(tile.resourceLevel))
    ? Math.trunc(Number(tile.resourceLevel))
    : undefined
  const resourceKind = tile.resourceKind as ResourceKind | undefined

  if (preview.status !== 'ready') {
    return {
      ...base,
      resourceEconomyModelVersion: preview.resourceEconomyModelVersion,
      resourceTileSettlementStatus: preview.status,
      tileLevel,
      resourceKind,
      baseYieldPerHour: { ...preview.baseYieldPerHour },
      ongoingYieldPerHour: { ...preview.ongoingYield.yieldPerHour },
      defenderStrength: { ...preview.defenderStrength },
      defenderStrengthRange: { ...preview.defenderStrength },
      defenderTroopCount: { ...preview.defenderTroopCount },
      defenderTroopCountRange: { ...preview.defenderTroopCount },
      recommendedPower: preview.recommendedPower,
      landResourceExpeditionBlocked: true,
      resourceTileExpeditionPreview: preview,
      visibleCopyForbiddenHits: buildResourceTileVisibleCopyForbiddenHits([
        preview.resourceLabel,
        preview.difficultyLabel,
        preview.riskLabel,
      ]),
    }
  }

  const readyReadback: Partial<WorldActionReceipt> = {
    ...base,
    resourceEconomyModelVersion: preview.resourceEconomyModelVersion,
    resourceTileSettlementStatus: preview.status,
    tileLevel: preview.resourceLevel,
    resourceKind: preview.resourceKind,
    baseYieldPerHour: { ...preview.baseYieldPerHour },
    ongoingYieldPerHour: { ...preview.ongoingYield.yieldPerHour },
    defenderStrength: { ...preview.defenderStrength },
    defenderStrengthRange: { ...preview.defenderStrength },
    defenderTroopCount: { ...preview.defenderTroopCount },
    defenderTroopCountRange: { ...preview.defenderTroopCount },
    recommendedPower: preview.recommendedPower,
    captureReward: preview.captureReward
      ? {
          ...preview.captureReward,
          amount: { ...preview.captureReward.amount },
        }
      : undefined,
    captureRewardUsesResourceLevel: preview.captureReward?.captureRewardUsesResourceLevel,
    l1L9YieldCurveBounded: true,
    resourceTileExpeditionPreview: {
      ...preview,
      baseYieldPerHour: { ...preview.baseYieldPerHour },
      ongoingYield: {
        ...preview.ongoingYield,
        yieldPerHour: { ...preview.ongoingYield.yieldPerHour },
      },
      defenderStrength: { ...preview.defenderStrength },
      defenderTroopCount: { ...preview.defenderTroopCount },
      captureReward: preview.captureReward
        ? {
            ...preview.captureReward,
            amount: { ...preview.captureReward.amount },
          }
        : undefined,
    },
    visibleCopyForbiddenHits: buildResourceTileVisibleCopyForbiddenHits([
      preview.resourceLabel,
      preview.difficultyLabel,
      preview.riskLabel,
    ]),
  }
  return {
    ...readyReadback,
    ...buildLandResourceSettlementProductReadback(readyReadback),
  }
}

function buildWorldMutationBusyResponse(
  includeWorld = true,
  factionId?: FactionId,
  requestId?: string,
): WorldActionResponse {
  const holder = getActiveWorldMutationHolder()
  const message = holder ? `${WORLD_MUTATION_BUSY_MESSAGE}: ${holder}` : WORLD_MUTATION_BUSY_MESSAGE
  return buildWorldActionResponse({
    ok: false,
    includeWorld,
    message,
    failureCode: 'world_mutation_busy',
    requestId,
    execution: buildAiExecutionStateSnapshot(worldState, factionId),
  })
}

function buildAiExecutionStateSnapshot(
  world: Readonly<WorldState>,
  factionId?: string,
): SlgAiExecutionState | undefined {
  const normalizedFactionId = factionId?.trim()
  if (!normalizedFactionId) {
    return undefined
  }

  const faction = world.factions[normalizedFactionId]
  if (!faction) {
    return undefined
  }

  const execution = world.executions[normalizedFactionId]
  const orders = execution?.orders ?? []
  let queuedOrderCount = 0
  let runningOrderCount = 0

  for (const order of orders) {
    if (order.status === 'queued') {
      queuedOrderCount += 1
    } else if (order.status === 'running') {
      runningOrderCount += 1
    }
  }

  const activeOrderCount = queuedOrderCount + runningOrderCount
  const status: SlgAiExecutionState['status'] =
    runningOrderCount > 0 ? 'running' : queuedOrderCount > 0 ? 'queued' : 'idle'

  return {
    status,
    activeOrderCount,
    queuedOrderCount,
    runningOrderCount,
    actionPointsRemaining: faction.actionPoints,
    foodRemaining: faction.food,
    requestId: execution?.requestId,
    basedOnWorldVersion: execution?.basedOnWorldVersion,
    reviewAtTick: execution?.reviewAtTick,
    strategicCommand: execution?.strategicCommand,
    source: execution?.source,
    updatedTick: world.tick,
    updatedWorldVersion: world.worldVersion,
  }
}

function buildAiRuntimeCategoryStats<T extends string>(stats: CategoryStats<T>): AiRuntimeCategoryStats {
  return {
    total: stats.total,
    byCategory: { ...stats.byCategory },
  }
}

function buildAiRuntimeBudgetSnapshot(
  world: Readonly<WorldState>,
  factionId: string,
  execution?: SlgAiExecutionState,
): AiRuntimeBudgetSnapshot {
  const faction = world.factions[factionId]
  return {
    actionPointsRemaining: execution?.actionPointsRemaining ?? faction?.actionPoints ?? 0,
    foodRemaining: execution?.foodRemaining ?? faction?.food ?? 0,
    aiQuota: faction?.aiQuota ? structuredClone(faction.aiQuota) : null,
  }
}

function extractWorldEventFactionId(event: WorldEventRecord): string | undefined {
  const factionId = event.metadata?.factionId
  return typeof factionId === 'string' && factionId.trim().length > 0 ? factionId.trim() : undefined
}

function extractWorldEventFailureCode(event: WorldEventRecord): string | undefined {
  const failureCode = event.metadata?.failureCode
  return typeof failureCode === 'string' && failureCode.trim().length > 0 ? failureCode.trim() : undefined
}

function extractWorldEventConflictCategory(event: WorldEventRecord): string | undefined {
  const conflictCategory = event.metadata?.conflictCategory
  return typeof conflictCategory === 'string' && conflictCategory.trim().length > 0 ? conflictCategory.trim() : undefined
}

function extractWorldEventHolder(event: WorldEventRecord): string | undefined {
  const mutationHolder = event.metadata?.mutationHolder
  if (typeof mutationHolder === 'string' && mutationHolder.trim().length > 0) {
    return mutationHolder.trim()
  }

  const match = event.message?.match(/^world mutation busy:\s*(.+)$/i)
  return match?.[1]?.trim() || undefined
}

function bumpStringCounter(counter: Record<string, number>, key?: string) {
  if (!key) {
    return
  }
  counter[key] = (counter[key] ?? 0) + 1
}

function buildAiRuntimeFailureRecord(event: WorldEventRecord): AiRuntimeFailureRecord {
  return {
    category: event.category,
    action: event.action,
    tick: event.tick,
    worldVersion: event.worldVersion,
    createdAt: event.createdAt,
    factionId: extractWorldEventFactionId(event),
    requestId: event.requestId,
    message: event.message,
    failureCode: extractWorldEventFailureCode(event),
    conflictCategory: extractWorldEventConflictCategory(event),
    holder: extractWorldEventHolder(event),
  }
}

function buildAiRuntimeFailureAggregation(
  events: WorldEventRecord[],
  sampleLimit: number,
): AiRuntimeFailureAggregation {
  const failures = events.filter((event) => !event.success).map(buildAiRuntimeFailureRecord)
  const byAction: Record<string, number> = {}
  const byFailureCode: Record<string, number> = {}
  const byFaction: Record<string, number> = {}

  for (const failure of failures) {
    bumpStringCounter(byAction, failure.action)
    bumpStringCounter(byFailureCode, failure.failureCode ?? 'unknown')
    bumpStringCounter(byFaction, failure.factionId ?? 'global')
  }

  return {
    totalRecentFailures: failures.length,
    byAction,
    byFailureCode,
    byFaction,
    samples: failures.slice(0, sampleLimit),
  }
}

function buildAiRuntimeLockConflictAggregation(
  events: WorldEventRecord[],
  sampleLimit: number,
): AiRuntimeLockConflictAggregation {
  const conflicts = events
    .filter((event) => {
      if (event.success) {
        return false
      }

      const failureCode = extractWorldEventFailureCode(event)
      const conflictCategory = extractWorldEventConflictCategory(event)
      return failureCode === 'world_mutation_busy' || conflictCategory === 'mutation_lock_busy'
    })
    .map(buildAiRuntimeFailureRecord)
  const byAction: Record<string, number> = {}
  const byHolder: Record<string, number> = {}

  for (const conflict of conflicts) {
    bumpStringCounter(byAction, conflict.action)
    bumpStringCounter(byHolder, conflict.holder ?? 'unknown')
  }

  return {
    totalRecentConflicts: conflicts.length,
    byAction,
    byHolder,
    samples: conflicts.slice(0, sampleLimit),
  }
}

function syncAuthoritativeAiState(nextWorld: WorldState) {
  nextWorld.slgDomainState ??= {}
  const nextAiStateByFaction = { ...(nextWorld.slgDomainState.aiStateByFaction ?? {}) }

  for (const factionId of Object.keys(nextWorld.factions)) {
    const currentState = nextAiStateByFaction[factionId] ?? {}
    const nextAgenda = currentState.agenda
      ? {
          ...currentState.agenda,
          updatedTick: currentState.agenda.updatedTick ?? nextWorld.tick,
          updatedWorldVersion: currentState.agenda.updatedWorldVersion ?? nextWorld.worldVersion,
        }
      : undefined

    nextAiStateByFaction[factionId] = {
      ...currentState,
      agenda: nextAgenda,
      execution: buildAiExecutionStateSnapshot(nextWorld, factionId),
      updatedWorldVersion: currentState.updatedWorldVersion ?? nextWorld.worldVersion,
    }
  }

  nextWorld.slgDomainState.aiStateByFaction = nextAiStateByFaction
}

function resolveQueuePlanFailureCategory(failureCode?: QueuePlanFailureCode): QueuePlanFailureCategory {
  if (!failureCode) {
    return 'unknown'
  }

  return failureCode
}

function resolveQueuePlanConflictCategory(failureCategory: QueuePlanFailureCategory): QueuePlanConflictCategory {
  if (
    failureCategory === 'mutation_lock_busy' ||
    failureCategory === 'stale_world_version' ||
    failureCategory === 'execution_chain_guard_missing' ||
    failureCategory === 'execution_chain_guard_mismatch' ||
    failureCategory === 'execution_chain_active_rejected'
  ) {
    return failureCategory
  }

  return 'none'
}

export function getWorldEvents(limit = 200): WorldEventsResponse {
  const normalizedLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(MAX_WORLD_EVENTS, Math.floor(limit)))
    : 200
  return {
    items: worldEvents.slice(0, normalizedLimit),
  }
}

export function getAiRuntimeObservabilitySnapshot(params: {
  factionId?: string
  eventLimit?: number
} = {}): AiRuntimeObservabilityResponse {
  const normalizedFactionId = params.factionId?.trim()
  const eventLimit = Number.isFinite(params.eventLimit)
    ? Math.max(1, Math.min(MAX_AI_RUNTIME_EVENTS, Math.floor(params.eventLimit ?? 24)))
    : 24
  const factionIds = normalizedFactionId
    ? Object.prototype.hasOwnProperty.call(worldState.factions, normalizedFactionId)
      ? [normalizedFactionId]
      : []
    : Object.keys(worldState.factions)
  const runtimeEvents = getWorldEvents(Math.max(eventLimit * 12, 120)).items
    .filter((event) => {
      if (!AI_RUNTIME_OBSERVABILITY_ACTIONS.has(event.action)) {
        return false
      }
      if (!normalizedFactionId) {
        return true
      }
      const eventFactionId = extractWorldEventFactionId(event)
      return eventFactionId === normalizedFactionId || (eventFactionId == null && event.action === 'advance_tick')
    })
  const recentEvents = runtimeEvents.slice(0, eventLimit)
  const lockHolder = getActiveWorldMutationHolder()
  const recentFailures = buildAiRuntimeFailureAggregation(runtimeEvents, eventLimit)
  const lockConflicts = buildAiRuntimeLockConflictAggregation(runtimeEvents, eventLimit)

  return {
    tick: worldState.tick,
    worldVersion: worldState.worldVersion,
    generatedAt: new Date().toISOString(),
    factionFilter: normalizedFactionId,
    runtime: {
      lock: {
        busy: Boolean(lockHolder),
        holder: lockHolder,
      },
      queuePlanFailureStats: buildAiRuntimeCategoryStats(queuePlanFailureStats),
      queuePlanConflictStats: buildAiRuntimeCategoryStats(queuePlanConflictStats),
      advanceTickFailureStats: buildAiRuntimeCategoryStats(advanceTickFailureStats),
      advanceTickPerformance: buildAdvanceTickPerformanceSnapshot(),
      recentFailures,
      lockConflicts,
      sessionMetrics: getSessionMetrics(),
      wsStats: getWebSocketStats(),
    },
    factions: factionIds.map((factionId) => {
      const session = getFactionSessionSnapshot(factionId)
      const aiState = worldState.slgDomainState?.aiStateByFaction?.[factionId] ?? {}
      const execution = buildAiExecutionStateSnapshot(worldState, factionId)
      const lastFailureEvent = recentEvents.find((event) => {
        if (event.success) {
          return false
        }
        const eventFactionId = extractWorldEventFactionId(event)
        return eventFactionId === factionId || (eventFactionId == null && event.action === 'advance_tick')
      })

      return {
        factionId,
        autonomyLevel: session.autonomyLevel,
        controlMode: resolveSessionControlMode(session.autonomyLevel),
        playerNames: session.playerNames ?? [],
        online: session.online,
        seatCount: session.seatCount ?? 0,
        onlineSeatCount: session.onlineSeatCount ?? 0,
        contextFocusId: aiState.contextFocusId,
        contextMemorySummary: aiState.contextMemorySummary ? structuredClone(aiState.contextMemorySummary) : undefined,
        agenda: aiState.agenda ? structuredClone(aiState.agenda) : undefined,
        execution,
        budget: buildAiRuntimeBudgetSnapshot(worldState, factionId, execution),
        lastAgendaActionId: aiState.lastAgendaActionId,
        updatedTick: aiState.updatedTick ?? execution?.updatedTick,
        updatedWorldVersion: aiState.updatedWorldVersion ?? execution?.updatedWorldVersion,
        lastFailure: lastFailureEvent ? buildAiRuntimeFailureRecord(lastFailureEvent) : undefined,
      }
    }),
    recentEvents,
  }
}

export function appendRuntimeWorldEvent(params: {
  action: string
  success: boolean
  category?: WorldEventRecord['category']
  message?: string
  metadata?: Record<string, unknown>
}): void {
  const world = getWorldStateReadonly()
  appendWorldEvent({
    category: params.category ?? 'system',
    action: params.action,
    success: params.success,
    tick: world.tick,
    worldVersion: world.worldVersion,
    message: params.message,
    metadata: params.metadata,
  })
}

export function getNarrativeEvents(limit = 200) {
  return getNarrativeEventsFromPersistence(limit)
}

export function getNationalAgendaSnapshot() {
  return {
    item: lastNationalAgenda ? structuredClone(lastNationalAgenda) : null,
  }
}

export function getCourtSessionSnapshot() {
  return {
    item: getLatestCourtSession(),
  }
}

export function getCivilMemorySnapshot(params: {
  limit?: number
  type?: CivilMemoryEventType
  tickFrom?: number
  tickTo?: number
  factionId?: string
  relatedId?: string
} = {}) {
  return {
    items: listCivilMemoryEntries(params),
  }
}

export function getCivilMemoryDetailById(civilMemoryId: string): CivilMemoryEntry | undefined {
  const resolvedId = civilMemoryId.trim()
  if (resolvedId.length === 0) {
    return undefined
  }
  return listCivilMemoryEntries({ limit: 500 }).find((entry) => entry.id === resolvedId)
}

export function getReplayArchive(): ReplayArchiveResponse {
  return {
    items: Array.from(replayArchive.values()).sort((a, b) =>
      a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0,
    ),
  }
}

export function getReplayArchiveEntry(requestId: string): ReplayArchiveEntry | undefined {
  return replayArchive.get(requestId)
}

export function getExecutionReplayByRequestId(requestId: string) {
  const replay = worldState.history.executionReplays.find((item) => item.requestId === requestId)
  return replay ? structuredClone(replay) : undefined
}

function isSaveSlotVisibleToOwner(slot: SaveSlotRecord, options: SaveSlotVisibilityOptions = {}): boolean {
  const { owner, includeOwnerless = true } = options
  const normalizedOwner = normalizeSaveSlotOwnerContext(owner)
  if (!normalizedOwner) {
    return includeOwnerless
  }

  if (!slot.ownerFactionId) {
    return includeOwnerless
  }

  return slot.ownerFactionId === normalizedOwner.factionId
}

export function getSaveSlots(options: SaveSlotVisibilityOptions = {}): SaveSlotsResponse {
  return {
    slots: Array.from(saveSlots.values())
      .map((item) => item.record)
      .filter((record) => isSaveSlotVisibleToOwner(record, options))
      .sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0)),
  }
}

function resolveSaveSlotsFileSizeSnapshot(): { fileSizeBytes: number | null; fileSizeLevel: SaveSlotsFileSizeLevel } {
  let fileSizeBytes: number | null = null
  let fileSizeLevel: SaveSlotsFileSizeLevel = 'none'

  if (existsSync(SAVE_SLOTS_PERSIST_PATH)) {
    try {
      const stats = statSync(SAVE_SLOTS_PERSIST_PATH)
      fileSizeBytes = Number.isFinite(stats.size) ? stats.size : null
      if (typeof fileSizeBytes === 'number') {
        if (fileSizeBytes >= SAVE_SLOTS_HARD_LIMIT_BYTES) {
          fileSizeLevel = 'hard'
        } else if (fileSizeBytes >= SAVE_SLOTS_SOFT_LIMIT_BYTES) {
          fileSizeLevel = 'soft'
        } else {
          fileSizeLevel = 'ok'
        }
      }
    } catch {
      fileSizeLevel = 'none'
    }
  }

  return {
    fileSizeBytes,
    fileSizeLevel,
  }
}

export function getSaveSlotsArchiveCatalog() {
  const archives = listSaveSlotsArchiveFiles().map((item) => ({
    path: item.path,
    sizeBytes: item.sizeBytes,
    modifiedAt: new Date(item.mtimeMs).toISOString(),
  }))

  return {
    archives,
  }
}

function resolveSaveSlotsArchiveSelection(options: { archivePath?: string } = {}) {
  const archiveFiles = listSaveSlotsArchiveFiles()
  const archiveCount = archiveFiles.length
  const requestedArchivePath = options.archivePath?.trim()
  let selectedArchive: SaveSlotsArchiveFile | null = null

  if (requestedArchivePath) {
    const normalizedRequestedPath = resolvePath(requestedArchivePath)
    selectedArchive =
      archiveFiles.find((item) => resolvePath(item.path) === normalizedRequestedPath) ??
      (() => {
        if (!existsSync(normalizedRequestedPath)) {
          return null
        }
        try {
          const stats = statSync(normalizedRequestedPath)
          return {
            path: normalizedRequestedPath,
            mtimeMs: stats.mtimeMs,
            sizeBytes: stats.size,
          } satisfies SaveSlotsArchiveFile
        } catch {
          return null
        }
      })()
  } else {
    selectedArchive = archiveFiles[0] ?? null
  }

  return {
    archiveCount,
    selectedArchive,
  }
}

function parseSaveSlotsArchivePayload(archivePath: string): {
  slots: SaveSlotState[]
  persistVersion: number | null
} {
  const compressed = readFileSync(archivePath)
  const restoredJson = gunzipSync(compressed).toString('utf8')
  const parsed = JSON.parse(restoredJson) as unknown
  const slots = extractPersistedSaveSlots(parsed)
  const persistVersion =
    typeof parsed === 'object' && parsed !== null && typeof (parsed as { version?: unknown }).version === 'number'
      ? ((parsed as { version: number }).version ?? null)
      : null

  return {
    slots,
    persistVersion,
  }
}

function buildNormalizedSaveSlotStates(slots: SaveSlotState[]): SaveSlotState[] {
  const normalized: SaveSlotState[] = []
  for (const slot of slots) {
    const normalizedSlotId = normalizeSlotId(slot.record.slotId)
    normalized.push({
      record: {
        ...slot.record,
        slotId: normalizedSlotId,
      },
      world: slot.world,
    })
  }

  normalized.sort((a, b) => (a.record.savedAt < b.record.savedAt ? 1 : a.record.savedAt > b.record.savedAt ? -1 : 0))
  return normalized.slice(0, MAX_SAVE_SLOTS)
}

function buildSaveSlotsRecordSignature(slots: SaveSlotState[]): string {
  const normalizedRecords: Array<{
    slotId: string
    label: string
    tick: number
    worldVersion: number
    savedAt: string
  }> = []

  for (const slot of slots) {
    try {
      const slotId = normalizeSlotId(slot.record.slotId)
      normalizedRecords.push({
        slotId,
        label: slot.record.label,
        tick: slot.record.tick,
        worldVersion: slot.record.worldVersion,
        savedAt: slot.record.savedAt,
      })
    } catch {
      // ignore malformed records in signature comparison
    }
  }

  normalizedRecords.sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0))
  return JSON.stringify(normalizedRecords)
}

export function runSaveSlotsArchiveRestoreDrill(options: { archivePath?: string } = {}) {
  const executedAt = new Date().toISOString()
  const { archiveCount, selectedArchive } = resolveSaveSlotsArchiveSelection(options)

  const finish = (
    status: SaveSlotsArchiveRestoreDrillStatus,
    message: string,
    params: {
      archivePath?: string | null
      slotCount?: number | null
      persistVersion?: number | null
    } = {},
  ) => {
    const archivePath = params.archivePath ?? null
    const slotCount = params.slotCount ?? null
    const persistVersion = params.persistVersion ?? null
    saveSlotsLastRestoreDrillStatus = status
    saveSlotsLastRestoreDrillMessage = message
    saveSlotsLastRestoreDrillArchivePath = archivePath
    saveSlotsLastRestoreDrillSlotCount = slotCount

    if (status === 'passed') {
      saveSlotsRestoreDrillSuccessCount += 1
      saveSlotsLastRestoreDrillAt = Date.now()
    } else if (status === 'failed') {
      saveSlotsRestoreDrillFailureCount += 1
      saveSlotsLastRestoreDrillErrorAt = Date.now()
    }

    return {
      status,
      executedAt,
      archivePath,
      archiveCount,
      slotCount,
      persistVersion,
      message,
    }
  }

  if (!selectedArchive) {
    const { fileSizeLevel } = resolveSaveSlotsFileSizeSnapshot()
    const shouldRequireArchive = SAVE_SLOTS_ARCHIVE_ON_SOFT_LIMIT && (fileSizeLevel === 'soft' || fileSizeLevel === 'hard')
    if (shouldRequireArchive) {
      return finish(
        'failed',
        'No save-slot archive available while store is oversize; restore drill cannot be performed.',
      )
    }
    return finish('skipped', 'No save-slot archive available; restore drill skipped.')
  }

  try {
    const parsed = parseSaveSlotsArchivePayload(selectedArchive.path)
    const slots = parsed.slots
    if (slots.length <= 0) {
      return finish('failed', 'Archive payload contains no valid save slots.', {
        archivePath: selectedArchive.path,
      })
    }

    return finish('passed', 'Archive restore drill passed (dry-run parse).', {
      archivePath: selectedArchive.path,
      slotCount: slots.length,
      persistVersion: parsed.persistVersion,
    })
  } catch (error) {
    return finish('failed', `Archive restore drill failed: ${error instanceof Error ? error.message : String(error)}`, {
      archivePath: selectedArchive.path,
    })
  }
}

export async function runSaveSlotsArchiveRestoreApply(options: { archivePath?: string; force?: boolean } = {}) {
  const executedAt = new Date().toISOString()
  const { archiveCount, selectedArchive } = resolveSaveSlotsArchiveSelection(options)
  const forceApply = options.force === true

  const finish = (
    status: SaveSlotsArchiveRestoreApplyStatus,
    message: string,
    params: {
      archivePath?: string | null
      backupPath?: string | null
      slotCount?: number | null
      persistVersion?: number | null
    } = {},
  ) => {
    const archivePath = params.archivePath ?? null
    const backupPath = params.backupPath ?? null
    const slotCount = params.slotCount ?? null
    const persistVersion = params.persistVersion ?? null
    saveSlotsLastRestoreApplyStatus = status
    saveSlotsLastRestoreApplyMessage = message
    saveSlotsLastRestoreApplyArchivePath = archivePath
    saveSlotsLastRestoreApplyBackupPath = backupPath
    saveSlotsLastRestoreApplySlotCount = slotCount

    if (status === 'restored') {
      saveSlotsRestoreApplySuccessCount += 1
      saveSlotsLastRestoreApplyAt = Date.now()
    } else if (status === 'failed') {
      saveSlotsRestoreApplyFailureCount += 1
      saveSlotsLastRestoreApplyErrorAt = Date.now()
    }

    return {
      status,
      executedAt,
      archivePath,
      backupPath,
      archiveCount,
      slotCount,
      persistVersion,
      message,
      forced: forceApply,
    }
  }

  if (!selectedArchive) {
    return finish('failed', 'No save-slot archive available; restore apply cannot be performed.')
  }

  let parsedArchive: ReturnType<typeof parseSaveSlotsArchivePayload>
  let normalizedSlots: SaveSlotState[]
  try {
    parsedArchive = parseSaveSlotsArchivePayload(selectedArchive.path)
    if (parsedArchive.slots.length <= 0) {
      return finish('failed', 'Archive payload contains no valid save slots.', {
        archivePath: selectedArchive.path,
        persistVersion: parsedArchive.persistVersion,
      })
    }
    normalizedSlots = buildNormalizedSaveSlotStates(parsedArchive.slots)
  } catch (error) {
    return finish('failed', `Archive restore apply parse failed: ${error instanceof Error ? error.message : String(error)}`, {
      archivePath: selectedArchive.path,
    })
  }

  await flushSaveSlotsPersist()
  const lockToken = tryAcquireSaveSlotsPersistLock()
  if (!lockToken) {
    return finish('failed', 'Save-slot restore apply lock contention: unable to acquire lock.', {
      archivePath: selectedArchive.path,
      slotCount: normalizedSlots.length,
      persistVersion: parsedArchive.persistVersion,
    })
  }

  const restorePayload: PersistedSaveSlotsPayload = {
    version: SAVE_SLOTS_PERSIST_VERSION,
    savedAt: Date.now(),
    slots: normalizedSlots,
  }
  const restoreSerializedPayload = JSON.stringify(restorePayload, null, 2)
  const restoreTempPath = `${SAVE_SLOTS_PERSIST_PATH}.restore.tmp`
  const restoreBackupPath = `${SAVE_SLOTS_PERSIST_PATH}.restore.bak.${Date.now()}`
  let existingPayload: string | null = null
  let backupWritten = false
  const targetSignature = buildSaveSlotsRecordSignature(normalizedSlots)

  try {
    if (existsSync(SAVE_SLOTS_PERSIST_PATH)) {
      existingPayload = readFileSync(SAVE_SLOTS_PERSIST_PATH, 'utf8')
    }

    if (!forceApply && typeof existingPayload === 'string') {
      try {
        const existingParsed = JSON.parse(existingPayload) as unknown
        const existingSlots = extractPersistedSaveSlots(existingParsed)
        const existingSignature = buildSaveSlotsRecordSignature(existingSlots)
        if (existingSignature === targetSignature) {
          return finish('skipped', 'Restore skipped: archive slot-state already matches active save-slot store.', {
            archivePath: selectedArchive.path,
            slotCount: normalizedSlots.length,
            persistVersion: parsedArchive.persistVersion,
          })
        }
      } catch {
        // ignore existing payload parse errors; restore can still proceed and overwrite with valid payload
      }
    }

    mkdirSync(dirname(SAVE_SLOTS_PERSIST_PATH), { recursive: true })

    if (typeof existingPayload === 'string') {
      await writeFile(restoreBackupPath, existingPayload, 'utf8')
      backupWritten = true
    }

    await writeFile(restoreTempPath, restoreSerializedPayload, 'utf8')
    renameSync(restoreTempPath, SAVE_SLOTS_PERSIST_PATH)

    saveSlots.clear()
    for (const slot of normalizedSlots) {
      saveSlots.set(slot.record.slotId, {
        record: { ...slot.record },
        world: slot.world,
      })
    }
    trimSaveSlots()
    saveSlotsLoaded = true
    saveSlotsRestoredSlotCount = saveSlots.size
    saveSlotsLastRestoreAt = Date.now()
    saveSlotsPersistDirty = false
    saveSlotsPersistInFlight = false

    return finish('restored', 'Archive restore applied to active save-slot store.', {
      archivePath: selectedArchive.path,
      backupPath: backupWritten ? restoreBackupPath : null,
      slotCount: saveSlots.size,
      persistVersion: parsedArchive.persistVersion,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    let rollbackMessage = ''

    if (typeof existingPayload === 'string') {
      try {
        await writeFile(SAVE_SLOTS_PERSIST_PATH, existingPayload, 'utf8')
        rollbackMessage = ' Rollback succeeded using pre-restore payload.'
      } catch (rollbackError) {
        rollbackMessage = ` Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`
      }
    }

    try {
      if (existsSync(restoreTempPath)) {
        renameSync(restoreTempPath, `${restoreTempPath}.failed.${Date.now()}`)
      }
    } catch {
      // ignore temp cleanup failures
    }

    return finish('failed', `Archive restore apply failed: ${errorMessage}.${rollbackMessage}`.trim(), {
      archivePath: selectedArchive.path,
      backupPath: backupWritten ? restoreBackupPath : null,
      slotCount: normalizedSlots.length,
      persistVersion: parsedArchive.persistVersion,
    })
  } finally {
    releaseSaveSlotsPersistLock(lockToken)
  }
}

export function runSaveSlotsArchiveRestoreRollbackDrill(options: { archivePath?: string; drillDir?: string } = {}) {
  const executedAt = new Date().toISOString()
  const { archiveCount, selectedArchive } = resolveSaveSlotsArchiveSelection(options)
  const requestedDrillDir = options.drillDir?.trim()
  const drillDir = requestedDrillDir
    ? resolvePath(requestedDrillDir)
    : join(SAVE_SLOTS_ARCHIVE_DIR, '__restore_rollback_drill__')

  const finish = (
    status: SaveSlotsArchiveRestoreRollbackDrillStatus,
    message: string,
    params: {
      archivePath?: string | null
      backupPath?: string | null
      drillStorePath?: string | null
      slotCount?: number | null
      persistVersion?: number | null
      rollbackVerified?: boolean | null
    } = {},
  ) => {
    const archivePath = params.archivePath ?? null
    const backupPath = params.backupPath ?? null
    const drillStorePath = params.drillStorePath ?? null
    const slotCount = params.slotCount ?? null
    const persistVersion = params.persistVersion ?? null
    const rollbackVerified = params.rollbackVerified ?? null

    saveSlotsLastRestoreRollbackDrillStatus = status
    saveSlotsLastRestoreRollbackDrillMessage = message
    saveSlotsLastRestoreRollbackDrillArchivePath = archivePath
    saveSlotsLastRestoreRollbackDrillBackupPath = backupPath
    saveSlotsLastRestoreRollbackDrillStorePath = drillStorePath
    saveSlotsLastRestoreRollbackDrillSlotCount = slotCount
    saveSlotsLastRestoreRollbackDrillVerified = rollbackVerified

    if (status === 'passed') {
      saveSlotsRestoreRollbackDrillSuccessCount += 1
      saveSlotsLastRestoreRollbackDrillAt = Date.now()
    } else if (status === 'failed') {
      saveSlotsRestoreRollbackDrillFailureCount += 1
      saveSlotsLastRestoreRollbackDrillErrorAt = Date.now()
    }

    return {
      status,
      executedAt,
      archivePath,
      backupPath,
      drillStorePath,
      archiveCount,
      slotCount,
      persistVersion,
      rollbackVerified,
      message,
    }
  }

  if (!selectedArchive) {
    const { fileSizeLevel } = resolveSaveSlotsFileSizeSnapshot()
    const shouldRequireArchive = SAVE_SLOTS_ARCHIVE_ON_SOFT_LIMIT && (fileSizeLevel === 'soft' || fileSizeLevel === 'hard')
    if (shouldRequireArchive) {
      return finish(
        'failed',
        'No save-slot archive available while store is oversize; restore rollback drill cannot be performed.',
      )
    }
    return finish('skipped', 'No save-slot archive available; restore rollback drill skipped.')
  }

  let parsedArchive: ReturnType<typeof parseSaveSlotsArchivePayload>
  let normalizedSlots: SaveSlotState[]
  try {
    parsedArchive = parseSaveSlotsArchivePayload(selectedArchive.path)
    if (parsedArchive.slots.length <= 0) {
      return finish('failed', 'Archive payload contains no valid save slots.', {
        archivePath: selectedArchive.path,
        persistVersion: parsedArchive.persistVersion,
      })
    }
    normalizedSlots = buildNormalizedSaveSlotStates(parsedArchive.slots)
  } catch (error) {
    return finish('failed', `Archive restore rollback drill parse failed: ${error instanceof Error ? error.message : String(error)}`, {
      archivePath: selectedArchive.path,
    })
  }

  const restorePayload: PersistedSaveSlotsPayload = {
    version: SAVE_SLOTS_PERSIST_VERSION,
    savedAt: Date.now(),
    slots: normalizedSlots,
  }
  const restoreSerializedPayload = JSON.stringify(restorePayload, null, 2)
  let baselinePayload: string

  try {
    baselinePayload = existsSync(SAVE_SLOTS_PERSIST_PATH)
      ? readFileSync(SAVE_SLOTS_PERSIST_PATH, 'utf8')
      : JSON.stringify(buildSaveSlotsPersistPayload(), null, 2)
  } catch (error) {
    return finish('failed', `Restore rollback drill baseline snapshot failed: ${error instanceof Error ? error.message : String(error)}`, {
      archivePath: selectedArchive.path,
      slotCount: normalizedSlots.length,
      persistVersion: parsedArchive.persistVersion,
    })
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const drillStorePath = join(drillDir, `${SAVE_SLOTS_ARCHIVE_BASENAME}.rollback-drill.${stamp}.json`)
  const restoreTempPath = `${drillStorePath}.restore.tmp`
  const restoreBackupPath = `${drillStorePath}.restore.bak.${Date.now()}`

  try {
    mkdirSync(drillDir, { recursive: true })
    writeFileSync(drillStorePath, baselinePayload, 'utf8')
    writeFileSync(restoreBackupPath, baselinePayload, 'utf8')
    writeFileSync(restoreTempPath, restoreSerializedPayload, 'utf8')
    throw new Error('Simulated restore apply failure after backup write.')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    let rollbackSucceeded = false
    let rollbackErrorMessage = ''

    try {
      writeFileSync(drillStorePath, baselinePayload, 'utf8')
      rollbackSucceeded = true
    } catch (rollbackError) {
      rollbackErrorMessage = rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
    }

    try {
      if (existsSync(restoreTempPath)) {
        renameSync(restoreTempPath, `${restoreTempPath}.failed.${Date.now()}`)
      }
    } catch {
      // ignore temp cleanup failures in drill mode
    }

    let rollbackVerified = false
    try {
      rollbackVerified = readFileSync(drillStorePath, 'utf8') === baselinePayload
    } catch {
      rollbackVerified = false
    }

    if (rollbackSucceeded && rollbackVerified) {
      return finish(
        'passed',
        `Restore rollback drill passed: simulated failure recovered via baseline rollback (${errorMessage}).`,
        {
          archivePath: selectedArchive.path,
          backupPath: restoreBackupPath,
          drillStorePath,
          slotCount: normalizedSlots.length,
          persistVersion: parsedArchive.persistVersion,
          rollbackVerified: true,
        },
      )
    }

    const rollbackReason = rollbackErrorMessage
      ? `Rollback write failed: ${rollbackErrorMessage}.`
      : 'Rollback write or verification failed.'
    return finish('failed', `Restore rollback drill failed: ${rollbackReason} Simulated failure: ${errorMessage}`, {
      archivePath: selectedArchive.path,
      backupPath: restoreBackupPath,
      drillStorePath,
      slotCount: normalizedSlots.length,
      persistVersion: parsedArchive.persistVersion,
      rollbackVerified,
    })
  }
}

export function getWorldStatePersistHealth() {
  let exists = false
  let fileSizeBytes: number | null = null

  try {
    const stats = statSync(WORLD_STATE_PERSIST_PATH)
    exists = stats.isFile()
    fileSizeBytes = exists ? stats.size : null
  } catch {
    exists = false
    fileSizeBytes = null
  }

  return {
    path: WORLD_STATE_PERSIST_PATH,
    exists,
    fileSizeBytes,
    tick: worldState.tick,
    worldVersion: worldState.worldVersion,
    resourceGeneration: worldState.map.resourceGeneration
      ? structuredClone(worldState.map.resourceGeneration)
      : undefined,
  }
}

export function getSaveSlotsPersistHealth() {
  refreshSaveSlotsArchiveFileCount()
  const { fileSizeBytes, fileSizeLevel } = resolveSaveSlotsFileSizeSnapshot()

  return {
    path: SAVE_SLOTS_PERSIST_PATH,
    loaded: saveSlotsLoaded,
    slotCount: saveSlots.size,
    persistDirty: saveSlotsPersistDirty,
    persistInFlight: saveSlotsPersistInFlight,
    persistSuccessCount: saveSlotsPersistSuccessCount,
    persistFailureCount: saveSlotsPersistFailureCount,
    lastPersistAt: saveSlotsLastPersistAt,
    lastPersistErrorAt: saveSlotsLastPersistErrorAt,
    corruptQuarantineCount: saveSlotsCorruptQuarantineCount,
    lastCorruptQuarantineAt: saveSlotsLastCorruptQuarantineAt,
    restoredSlotCount: saveSlotsRestoredSlotCount,
    lastRestoreAt: saveSlotsLastRestoreAt,
    persistVersion: SAVE_SLOTS_PERSIST_VERSION,
    lockPath: SAVE_SLOTS_LOCK_PATH,
    lockStaleMs: SAVE_SLOTS_LOCK_STALE_MS,
    lockContentionCount: saveSlotsPersistLockContentionCount,
    lockStealCount: saveSlotsPersistLockStealCount,
    lockFailureCount: saveSlotsPersistLockFailureCount,
    archiveOnSoftLimit: SAVE_SLOTS_ARCHIVE_ON_SOFT_LIMIT,
    archiveDir: SAVE_SLOTS_ARCHIVE_DIR,
    archiveMaxFiles: SAVE_SLOTS_ARCHIVE_MAX_FILES,
    archiveFileCount: saveSlotsArchiveFileCount,
    archiveSuccessCount: saveSlotsArchiveSuccessCount,
    archiveFailureCount: saveSlotsArchiveFailureCount,
    lastArchiveAt: saveSlotsLastArchiveAt,
    lastArchiveErrorAt: saveSlotsLastArchiveErrorAt,
    lastArchivePath: saveSlotsLastArchivePath,
    restoreDrillSuccessCount: saveSlotsRestoreDrillSuccessCount,
    restoreDrillFailureCount: saveSlotsRestoreDrillFailureCount,
    lastRestoreDrillAt: saveSlotsLastRestoreDrillAt,
    lastRestoreDrillErrorAt: saveSlotsLastRestoreDrillErrorAt,
    lastRestoreDrillArchivePath: saveSlotsLastRestoreDrillArchivePath,
    lastRestoreDrillSlotCount: saveSlotsLastRestoreDrillSlotCount,
    lastRestoreDrillStatus: saveSlotsLastRestoreDrillStatus,
    lastRestoreDrillMessage: saveSlotsLastRestoreDrillMessage,
    restoreApplySuccessCount: saveSlotsRestoreApplySuccessCount,
    restoreApplyFailureCount: saveSlotsRestoreApplyFailureCount,
    lastRestoreApplyAt: saveSlotsLastRestoreApplyAt,
    lastRestoreApplyErrorAt: saveSlotsLastRestoreApplyErrorAt,
    lastRestoreApplyArchivePath: saveSlotsLastRestoreApplyArchivePath,
    lastRestoreApplyBackupPath: saveSlotsLastRestoreApplyBackupPath,
    lastRestoreApplySlotCount: saveSlotsLastRestoreApplySlotCount,
    lastRestoreApplyStatus: saveSlotsLastRestoreApplyStatus,
    lastRestoreApplyMessage: saveSlotsLastRestoreApplyMessage,
    restoreRollbackDrillSuccessCount: saveSlotsRestoreRollbackDrillSuccessCount,
    restoreRollbackDrillFailureCount: saveSlotsRestoreRollbackDrillFailureCount,
    lastRestoreRollbackDrillAt: saveSlotsLastRestoreRollbackDrillAt,
    lastRestoreRollbackDrillErrorAt: saveSlotsLastRestoreRollbackDrillErrorAt,
    lastRestoreRollbackDrillArchivePath: saveSlotsLastRestoreRollbackDrillArchivePath,
    lastRestoreRollbackDrillBackupPath: saveSlotsLastRestoreRollbackDrillBackupPath,
    lastRestoreRollbackDrillStorePath: saveSlotsLastRestoreRollbackDrillStorePath,
    lastRestoreRollbackDrillSlotCount: saveSlotsLastRestoreRollbackDrillSlotCount,
    lastRestoreRollbackDrillStatus: saveSlotsLastRestoreRollbackDrillStatus,
    lastRestoreRollbackDrillMessage: saveSlotsLastRestoreRollbackDrillMessage,
    lastRestoreRollbackDrillVerified: saveSlotsLastRestoreRollbackDrillVerified,
    fileSizeBytes,
    fileSizeLevel,
    softLimitBytes: SAVE_SLOTS_SOFT_LIMIT_BYTES,
    hardLimitBytes: SAVE_SLOTS_HARD_LIMIT_BYTES,
  }
}

export function saveWorldSlot(
  slotId: string,
  label?: string,
  options: { owner?: SaveSlotOwnerContext } = {},
): SaveSlotRecord {
  const normalizedSlotId = normalizeSlotId(slotId)
  const now = new Date().toISOString()
  const owner = normalizeSaveSlotOwnerContext(options.owner)
  const ownerFactionId = owner?.factionId
  const record: SaveSlotRecord = {
    slotId: normalizedSlotId,
    label: label?.trim() || `Save ${normalizedSlotId}`,
    tick: worldState.tick,
    worldVersion: worldState.worldVersion,
    savedAt: now,
    ownerFactionId,
    ownerSessionId: owner?.sessionId,
  }

  saveSlots.set(normalizedSlotId, {
    record,
    world: structuredClone(worldState),
  })

  trimSaveSlots()
  scheduleSaveSlotsPersist()

  appendWorldEvent({
    category: 'persistence',
    action: 'save_slot',
    success: true,
    tick: worldState.tick,
    worldVersion: worldState.worldVersion,
    message: `save slot ${normalizedSlotId} updated`,
    metadata: {
      ...(ownerFactionId
        ? buildSaveWrittenHistoryOverlay({
            slotId: normalizedSlotId,
            label: record.label,
            worldVersion: worldState.worldVersion,
            scopeToken: 'own_save_slot',
            factionId: ownerFactionId,
          })
        : {}),
      slotId: normalizedSlotId,
      label: record.label,
      ownerFactionId,
    },
  })

  return record
}

export function primeReplayFixtureSlot(
  slotId: string,
  options: {
    label?: string
    source?: ReplayFixtureSource
  } = {},
): SaveSlotRecord {
  const normalizedSlotId = normalizeSlotId(slotId)
  const owner = normalizeSaveSlotOwnerContext()
  const source: ReplayFixtureSource = options.source === 'current_world' ? 'current_world' : 'initial_world_v1'
  const fixtureWorld = source === 'current_world'
    ? structuredClone(worldState)
    : normalizeUnitMapVisualsForWorld(createInitialWorldState({ resourceGenerationPolicy: WORLD_RESOURCE_GENERATION_POLICY })).world
  syncAllFactionAiQuota(fixtureWorld)

  const now = new Date().toISOString()
  const record: SaveSlotRecord = {
    slotId: normalizedSlotId,
    label: options.label?.trim() || `Replay Fixture ${normalizedSlotId}`,
    tick: fixtureWorld.tick,
    worldVersion: fixtureWorld.worldVersion,
    savedAt: now,
    ownerFactionId: owner?.factionId,
    ownerSessionId: owner?.sessionId,
  }

  saveSlots.set(normalizedSlotId, {
    record,
    world: fixtureWorld,
  })

  trimSaveSlots()
  scheduleSaveSlotsPersist()

  appendWorldEvent({
    category: 'persistence',
    action: 'save_slot_fixture',
    success: true,
    tick: worldState.tick,
    worldVersion: worldState.worldVersion,
    message: `save slot fixture ${normalizedSlotId} primed`,
    metadata: {
      slotId: normalizedSlotId,
      label: record.label,
      source,
      fixtureTick: fixtureWorld.tick,
      fixtureWorldVersion: fixtureWorld.worldVersion,
    },
  })

  return record
}

function buildSaveLoadRestoreHistoryOverlay(params: {
  slotId: string
  label?: string
  outcome: 'success' | 'failure'
  worldVersion?: number
  scopeToken: SaveSlotRestoreScopeToken
  factionId?: string
}): Record<string, unknown> {
  if (params.outcome === 'failure') {
    return {
      playerHistoryCategory: 'system',
      playerHistoryTitle: '存档恢复失败',
      playerHistoryActorName: '玩家',
      playerHistorySummary: '没有找到可恢复的存档，当前进度保持不变。',
      playerHistoryTarget: '存档',
      playerHistoryResultLabel: '未找到存档',
      playerHistoryConsequence: '当前世界状态未改变，可以选择其他存档。',
      playerHistoryNextAction: '查看存档',
      playerHistorySeverity: 'medium',
      playerHistoryScope: params.scopeToken,
      playerHistoryFactionId: params.factionId,
      playerHistoryDedupeKey: `system:load-slot:${params.slotId}:failure`,
    }
  }

  const label = params.label?.trim() || '存档'
  return {
    playerHistoryCategory: 'system',
    playerHistoryTitle: '存档已恢复',
    playerHistoryActorName: '玩家',
    playerHistorySummary: `已恢复到${label}，可以继续行动。`,
    playerHistoryTarget: label,
    playerHistoryResultLabel: '已恢复',
    playerHistoryConsequence: '世界状态已恢复，可继续行动。',
    playerHistoryNextAction: '继续游戏',
    playerHistorySeverity: 'low',
    playerHistoryScope: params.scopeToken,
    playerHistoryFactionId: params.factionId,
    playerHistoryDedupeKey: `system:load-slot:${params.slotId}:success:${params.worldVersion ?? 'current'}`,
  }
}

function buildSaveWrittenHistoryOverlay(params: {
  slotId: string
  label?: string
  worldVersion?: number
  scopeToken: SaveSlotRestoreScopeToken
  factionId?: string
}): Record<string, unknown> {
  const label = params.label?.trim() || '存档'
  return {
    playerHistoryCategory: 'system',
    playerHistoryTitle: '存档已保存',
    playerHistoryActorName: '玩家',
    playerHistorySummary: `当前进度已保存为${label}，稍后可以继续。`,
    playerHistoryTarget: label,
    playerHistoryResultLabel: '可恢复',
    playerHistoryConsequence: '当前世界状态已记录，可以需要时恢复。',
    playerHistoryNextAction: '需要时可从存档恢复',
    playerHistorySeverity: 'low',
    playerHistoryScope: params.scopeToken,
    playerHistoryFactionId: params.factionId,
    playerHistoryDedupeKey: `system:save-slot:${params.slotId}:${params.worldVersion ?? 'current'}`,
  }
}

function buildAiActivityPlanningHistoryOverlay(entry: PlanningJobHistoryEntry): Record<string, unknown> {
  const isFailure = entry.status === 'failed' || entry.status === 'stale'
  const isPending = entry.status === 'queued' || entry.status === 'running'
  const location = entry.plannerNote ?? entry.resolvedSource ?? entry.sourceMode
  const title = isFailure ? 'AI 行动受阻' : isPending ? 'AI 行动等待处理' : 'AI 行动已完成'
  const resultLabel = isFailure ? '需要复核' : isPending ? '等待推进' : '已推进'
  const consequence = isFailure
    ? '可回到 AI 活动查看原因并重新安排。'
    : isPending
      ? '世界状态暂不改变，等待下一步确认。'
      : '执行记录已进入活动时间线。'

  return {
    playerHistoryCategory: 'ai_activity',
    playerHistoryTitle: title,
    playerHistoryActorName: '军师 AI',
    playerHistorySummary: entry.message,
    playerHistoryLocation: location,
    playerHistoryTarget: entry.strategicCommand,
    playerHistoryResultLabel: resultLabel,
    playerHistoryConsequence: consequence,
    playerHistoryNextAction: '查看 AI 活动',
    playerHistorySeverity: isFailure ? 'high' : isPending ? 'medium' : 'low',
    playerHistoryScope: 'private_ai',
    playerHistoryFactionId: 'player',
    playerHistorySharePolicy: 'not_shareable_private',
    playerHistoryShareStateLabel: '暂不可分享',
    playerHistoryDedupeKey: `ai-activity:planning:${entry.id}:${entry.status}`,
  }
}

export function loadWorldSlot(
  slotId: string,
  options: { scopeToken?: SaveSlotRestoreScopeToken; owner?: SaveSlotOwnerContext; includeOwnerless?: boolean } = {},
): WorldActionResponse {
  const mutationLock = tryAcquireWorldMutationLock('load_world_slot')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(true)
  }

  try {
    const normalizedSlotId = normalizeSlotId(slotId)
    const scopeToken = options.scopeToken ?? SAVE_SLOT_RESTORE_SCOPE_TOKEN
    const slot = saveSlots.get(normalizedSlotId)
    if (!slot || !isSaveSlotVisibleToOwner(slot.record, options)) {
      const failed = buildWorldActionResponse({
        ok: false,
        message: `save slot ${normalizedSlotId} not found`,
      })

      appendWorldEvent({
        category: 'persistence',
        action: 'load_slot',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        message: failed.message,
        metadata: {
          ...buildSaveLoadRestoreHistoryOverlay({
            slotId: normalizedSlotId,
            outcome: 'failure',
            worldVersion: worldState.worldVersion,
            scopeToken,
            factionId: options.owner?.factionId,
          }),
          slotId: normalizedSlotId,
        },
      })

      return failed
    }

    commitWorldState(structuredClone(slot.world))
    refreshReplayArchive()

    const succeeded = buildWorldActionResponse({
      ok: true,
      message: `save slot ${normalizedSlotId} loaded`,
    })

    appendWorldEvent({
      category: 'persistence',
      action: 'load_slot',
        success: true,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        message: succeeded.message,
        metadata: {
          ...buildSaveLoadRestoreHistoryOverlay({
            slotId: normalizedSlotId,
            label: slot.record.label,
            outcome: 'success',
            worldVersion: worldState.worldVersion,
            scopeToken,
            factionId: options.owner?.factionId,
          }),
          slotId: normalizedSlotId,
          label: slot.record.label,
        },
      })

      return succeeded
  } finally {
    mutationLock.release()
  }
}

export function appendPlanningJobHistoryAction(entry: PlanningJobHistoryEntry, includeWorld = true): WorldActionResponse {
  const mutationLock = tryAcquireWorldMutationLock('append_planning_history')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld)
  }

  try {
    commitWorldState(appendPlanningJobHistory(worldState, entry))
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: entry.message,
    })

    appendWorldEvent({
      category: 'planning',
      action: 'append_planning_history',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId: entry.id,
      message: entry.message,
      metadata: {
        ...buildAiActivityPlanningHistoryOverlay(entry),
        status: entry.status,
        sourceMode: entry.sourceMode,
        resolvedSource: entry.resolvedSource,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

type QueuePlanExecutionActionParams = {
  plan: StrategicPlan
  source: PlanSource
  strategicCommand: string
  requestId: string
  basedOnWorldVersion: number
  factionId?: string
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

type GeneralDirectiveResolutionResult = {
  plan: StrategicPlan
  accepted: number
  rejected: number
  warnings: string[]
  items: GeneralDirectivePreviewItem[]
}

type PreviewGeneralDirectivesActionParams = {
  directives: GeneralDirective[]
  side?: FactionId
  basePlan?: StrategicPlan
}

type PreviewDomainAgendaActionParams = {
  factionId?: FactionId
  domainId?: string
  includeMessages?: boolean
}

type PreviewNationalAgendaActionParams = {
  maxOptions?: number
}

type PreviewCourtSessionActionParams = {
  maxProposals?: number
  maxOptions?: number
}

type QueryCivilMemoryActionParams = {
  limit?: number
  type?: CivilMemoryEventType
  tickFrom?: number
  tickTo?: number
  factionId?: FactionId
  relatedId?: string
}

type SetRecruitSelectedPoolActionParams = {
  factionId?: FactionId
  poolId: string
}

type SetAiContextFocusActionParams = {
  factionId?: FactionId
  contextFocusId: 'focus_city' | 'focus_troop' | 'focus_alliance' | 'focus_team'
  teamId?: string
  teamIndex?: number
  aiPlayerId?: string
  teamName?: string
  ownerType?: string
  heroNames?: string[]
}
type AiTeamContextFocusParams = Omit<SetAiContextFocusActionParams, 'contextFocusId' | 'factionId'>

type SetGeneralTacticActionParams = {
  factionId?: FactionId
  heroId: string
  tacticId: 'assault' | 'guard' | 'logistics'
}

type QueueAiAgendaActionParams = {
  factionId?: FactionId
  agendaActionId: 'agenda_expand' | 'agenda_support' | 'agenda_stabilize' | 'agenda_recover' | 'agenda_redeploy'
}

type FactionGeneral = ReturnType<typeof getGeneralProfilesForFaction>[number]

export async function queuePlanExecutionAction(
  params: QueuePlanExecutionActionParams,
  includeWorld = true,
): Promise<WorldActionResponse> {
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const autonomyLevel = getFactionAutonomyLevel(targetFactionId)
  const controlMode =
    autonomyLevel === 'L1_assigned'
      ? 'human_assigned'
      : autonomyLevel === 'L3_negotiated'
        ? 'ai_negotiated'
        : 'ai_delegated'

  const mutationLock = tryAcquireWorldMutationLock('queue_plan_execution')
  if (!mutationLock) {
    const failed = buildWorldMutationBusyResponse(includeWorld, targetFactionId, params.requestId)
    const mutationHolder = getActiveWorldMutationHolder()
    const failureCategory: QueuePlanFailureCategory = 'mutation_lock_busy'
    const conflictCategory: QueuePlanConflictCategory = 'mutation_lock_busy'
    bumpCategoryStats(queuePlanFailureStats, failureCategory)
    bumpCategoryStats(queuePlanConflictStats, conflictCategory)

    appendWorldEvent({
      category: 'planning',
      action: 'queue_plan_execution',
      success: false,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId: params.requestId,
      message: failed.message,
      metadata: {
        source: params.source,
        factionId: targetFactionId,
        autonomyLevel,
        controlMode,
        basedOnWorldVersion: params.basedOnWorldVersion,
        failureCode: failed.failureCode,
        failureCategory,
        conflictCategory,
        mutationHolder,
        queuePlanFailureStats: snapshotCategoryStats(queuePlanFailureStats),
        queuePlanConflictStats: snapshotCategoryStats(queuePlanConflictStats),
        executionStatus: failed.execution?.status,
        activeOrderCount: failed.execution?.activeOrderCount,
        queuedOrderCount: failed.execution?.queuedOrderCount,
        runningOrderCount: failed.execution?.runningOrderCount,
        actionPointsRemaining: failed.execution?.actionPointsRemaining,
        foodRemaining: failed.execution?.foodRemaining,
        activeRequestId: failed.execution?.requestId,
      },
    })

    return failed
  }

  try {
    let planForExecution = params.plan
    let generalDispatchMeta: Record<string, unknown> | undefined
    let generalDirectiveMeta: Record<string, unknown> | undefined

    const side = params.generalSide ?? targetFactionId
    let cachedGenerals: FactionGeneral[] | undefined
    const resolveGenerals = () => {
      if (!cachedGenerals) {
        cachedGenerals = getGeneralProfilesForFaction(worldState, side)
      }

      return cachedGenerals
    }

    const directives = params.generalDirectives ?? []
    if (directives.length > 0) {
      const directiveResult = applyGeneralDirectivesToPlan(worldState, planForExecution, resolveGenerals(), directives)
      planForExecution = directiveResult.plan
      generalDirectiveMeta = {
        generalDirectiveCount: directives.length,
        generalDirectiveAccepted: directiveResult.accepted,
        generalDirectiveRejected: directiveResult.rejected,
        generalDirectiveWarnings: directiveResult.warnings.slice(0, 8),
      }
    }

    if (params.dispatchGenerals) {
      const concurrency = normalizeGeneralConcurrency(params.generalConcurrency)

      try {
        const generalReport = await runGeneralDispatch(worldState, planForExecution, resolveGenerals(), {
          concurrency,
        })
        planForExecution = generalReport.delegatedPlan
        generalDispatchMeta = {
          generalDispatch: true,
          generalSide: side,
          generalConcurrency: concurrency,
          generalSummary: generalReport.summary,
        }
      } catch (error) {
        generalDispatchMeta = {
          generalDispatch: false,
          generalSide: side,
          generalConcurrency: concurrency,
          generalError: error instanceof Error ? error.message : 'general dispatch failed',
        }
      }
    }

    const executionMode = normalizeExecutionMode(params.executionMode)
    const expectedExecutionRequestId = normalizeExpectedExecutionRequestId(params.expectedExecutionRequestId)

    const result = queuePlanExecution(
      worldState,
      planForExecution,
      params.source,
      targetFactionId,
      params.strategicCommand,
      params.requestId,
      params.basedOnWorldVersion,
      executionMode,
      expectedExecutionRequestId,
      params.plannerNote,
      params.plannerExplanation,
      params.planningRationale,
    )

    if (!result.ok) {
      const failureCategory = resolveQueuePlanFailureCategory(result.failureCode)
      const conflictCategory = resolveQueuePlanConflictCategory(failureCategory)
      bumpCategoryStats(queuePlanFailureStats, failureCategory)
      if (conflictCategory !== 'none') {
        bumpCategoryStats(queuePlanConflictStats, conflictCategory)
      }

      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)

      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId: params.requestId,
        execution,
      })

      appendWorldEvent({
        category: 'planning',
        action: 'queue_plan_execution',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId: params.requestId,
        message: result.message,
        metadata: {
          source: params.source,
          factionId: targetFactionId,
          autonomyLevel,
          controlMode,
          basedOnWorldVersion: params.basedOnWorldVersion,
          orderCount: planForExecution.orders.length,
          executionMode,
          expectedExecutionRequestId,
          failureCode: result.failureCode,
          failureCategory,
          conflictCategory,
          queuePlanFailureStats: snapshotCategoryStats(queuePlanFailureStats),
          queuePlanConflictStats: snapshotCategoryStats(queuePlanConflictStats),
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          queuedOrderCount: execution?.queuedOrderCount,
          runningOrderCount: execution?.runningOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
          activeRequestId: execution?.requestId,
          ...(generalDirectiveMeta ?? {}),
          ...(generalDispatchMeta ?? {}),
        },
      })

      return failed
    }

    commitWorldState(result.world)
    refreshReplayArchive()
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)

    const succeeded = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId: params.requestId,
      execution,
    })

    appendWorldEvent({
      category: 'planning',
      action: 'queue_plan_execution',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId: params.requestId,
      message: result.message,
      metadata: {
        source: params.source,
        factionId: targetFactionId,
        autonomyLevel,
        controlMode,
        basedOnWorldVersion: params.basedOnWorldVersion,
        orderCount: planForExecution.orders.length,
        executionMode,
        expectedExecutionRequestId,
        enqueueOutcome: result.enqueueOutcome,
        queuePlanFailureStats: snapshotCategoryStats(queuePlanFailureStats),
        queuePlanConflictStats: snapshotCategoryStats(queuePlanConflictStats),
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        queuedOrderCount: execution?.queuedOrderCount,
        runningOrderCount: execution?.runningOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
        activeRequestId: execution?.requestId,
        reviewAtTick: execution?.reviewAtTick,
        ...(generalDirectiveMeta ?? {}),
        ...(generalDispatchMeta ?? {}),
      },
    })

    return succeeded
  } finally {
    mutationLock.release()
  }
}

export function previewGeneralDirectivesAction(
  params: PreviewGeneralDirectivesActionParams,
): GeneralDirectivePreviewResponse {
  const side = params.side ?? resolveDefaultFactionId()
  const generals = getGeneralProfilesForFaction(worldState, side)
  const basePlan = resolveDirectiveBasePlan(worldState, params.basePlan)
  const directives = params.directives ?? []

  const resolution = applyGeneralDirectivesToPlan(worldState, basePlan, generals, directives)

  return {
    ok: true,
    tick: worldState.tick,
    worldVersion: worldState.worldVersion,
    side,
    accepted: resolution.accepted,
    rejected: resolution.rejected,
    warnings: resolution.warnings.slice(0, 16),
    items: resolution.items,
    mergedPlan: resolution.plan,
  }
}

function resolveFactionForDomainPreview(params: PreviewDomainAgendaActionParams): FactionId {
  if (params.factionId && worldState.factions[params.factionId]) {
    return params.factionId
  }

  const domainId = params.domainId?.trim()
  if (domainId && domainId.startsWith('domain:')) {
    const derivedFactionId = domainId.slice('domain:'.length)
    if (derivedFactionId && worldState.factions[derivedFactionId]) {
      return derivedFactionId
    }
  }

  return resolveDefaultFactionId()
}

function resolveDefaultFactionId(): FactionId {
  const allFactionIds = Object.keys(worldState.factions)
  if (allFactionIds.length === 0) {
    return 'neutral'
  }

  return allFactionIds[0]
}

function compileNationalAgendaForCurrentWorld(maxOptions = 9): {
  domainCommWindow: ReturnType<typeof runDomainCommWindow>
  nationalAgenda: NationalAgendaWindow
} {
  const domainCommWindow = runDomainCommWindow(worldState)
  const nationalAgenda = compileNationalAgendaWindow({
    tick: worldState.tick,
    domainPreviews: domainCommWindow.domains,
    maxOptions,
  })
  lastNationalAgenda = nationalAgenda
  return {
    domainCommWindow,
    nationalAgenda,
  }
}

export function previewDomainAgendaAction(
  params: PreviewDomainAgendaActionParams = {},
  includeWorld = true,
): WorldActionResponse {
  const factionId = resolveFactionForDomainPreview(params)
  const includeMessages = params.includeMessages !== false
  const preview = previewDomainAgendaForFaction(worldState, factionId, includeMessages)

  if (!preview) {
    return buildWorldActionResponse({
      ok: false,
      includeWorld,
      message: `No domain actors found for faction ${factionId}.`,
    })
  }
  const normalizedAgenda = {
    ...preview.agenda,
    options: normalizeDomainAgendaOptions(preview.agenda),
    targetTileId: preview.agenda.targetTileId ?? preview.agenda.candidates[0]?.targetTileId,
    targetUnitIds: preview.agenda.targetUnitIds ?? preview.agenda.candidates[0]?.targetUnitIds ?? [],
    recommendedFollowups: preview.agenda.recommendedFollowups ?? [],
  }

  appendWorldEvent({
    category: 'system',
    action: 'preview_domain_agenda',
    success: true,
    tick: worldState.tick,
    worldVersion: worldState.worldVersion,
    metadata: {
      domainId: preview.domainId,
      factionId,
      includeMessages,
      agendaCandidates: preview.agenda.candidates.length,
      optionCount: normalizedAgenda.options.length,
      published: preview.metrics.published,
      delivered: preview.metrics.delivered,
      dropped: preview.metrics.dropped,
    },
  })

  return {
    ...buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: `Domain agenda preview generated for ${factionId}.`,
    }),
    domainAgenda: normalizedAgenda,
    domainCommMetrics: preview.metrics,
    domainMessages: includeMessages ? preview.messages : undefined,
  }
}

function normalizeDomainAgendaOptions(previewAgenda: {
  options?: DomainAgendaOption[]
  candidates: Array<{
    actionId: string
    intent: string
    summary: string
    priority: string
    targetTileId?: string
    targetUnitIds?: string[]
    supportingAiPlayerIds: string[]
    evidenceRefs: string[]
    supportCount?: number
    recommendedFollowups?: string[]
  }>
  recommendedFollowups?: string[]
}): DomainAgendaOption[] {
  const fallbackFollowups = previewAgenda.recommendedFollowups ?? []
  if (previewAgenda.options && previewAgenda.options.length > 0) {
    return previewAgenda.options.map((option, index): DomainAgendaOption => {
      const candidate = previewAgenda.candidates[index]
      return {
        actionId: option.actionId ?? candidate?.actionId ?? '',
        intent: option.intent ?? candidate?.intent ?? option.actionId ?? candidate?.actionId ?? '',
        label: option.label ?? candidate?.summary ?? option.summary ?? candidate?.actionId ?? '',
        summary: option.summary ?? candidate?.summary ?? option.label ?? '',
        priority: (option.priority ?? candidate?.priority ?? 'P2') as DomainAgendaOption['priority'],
        targetTileId: String(option.targetTileId ?? candidate?.targetTileId ?? '').trim() || undefined,
        targetUnitIds: Array.isArray(option.targetUnitIds)
          ? option.targetUnitIds
          : candidate?.targetUnitIds ?? [],
        supportingAiPlayerIds: Array.isArray(option.supportingAiPlayerIds)
          ? option.supportingAiPlayerIds
          : candidate?.supportingAiPlayerIds ?? [],
        evidenceRefs: Array.isArray(option.evidenceRefs) ? option.evidenceRefs : candidate?.evidenceRefs ?? [],
        supportCount: Number.isFinite(Number(option.supportCount))
          ? Math.max(0, Math.floor(Number(option.supportCount)))
          : candidate?.supportingAiPlayerIds.length ?? 0,
        recommendedFollowups:
          Array.isArray(option.recommendedFollowups) && option.recommendedFollowups.length > 0
            ? option.recommendedFollowups
            : fallbackFollowups,
      }
    })
  }

  return previewAgenda.candidates.map((candidate): DomainAgendaOption => ({
    actionId: candidate.actionId,
    intent: candidate.intent,
    label: candidate.summary,
    summary: candidate.summary,
    priority: candidate.priority as DomainAgendaOption['priority'],
    targetTileId: candidate.targetTileId,
    targetUnitIds: candidate.targetUnitIds ?? [],
    supportingAiPlayerIds: candidate.supportingAiPlayerIds,
    evidenceRefs: candidate.evidenceRefs,
    supportCount: candidate.supportingAiPlayerIds.length,
    recommendedFollowups: candidate.recommendedFollowups ?? fallbackFollowups,
  }))
}

export function previewNationalAgendaAction(
  params: PreviewNationalAgendaActionParams = {},
  includeWorld = true,
): WorldActionResponse {
  const { domainCommWindow, nationalAgenda } = compileNationalAgendaForCurrentWorld(params.maxOptions ?? 9)

  appendWorldEvent({
    category: 'system',
    action: 'preview_national_agenda',
    success: true,
    tick: worldState.tick,
    worldVersion: worldState.worldVersion,
    metadata: {
      domains: domainCommWindow.domains.length,
      optionCountIn: nationalAgenda.optionCountIn,
      optionCountOut: nationalAgenda.optionCountOut,
    },
  })

  return {
    ...buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: `National agenda preview generated for tick ${worldState.tick}.`,
    }),
    nationalAgenda,
  }
}

export function previewCourtSessionAction(
  params: PreviewCourtSessionActionParams = {},
  includeWorld = true,
): WorldActionResponse {
  const { nationalAgenda } = compileNationalAgendaForCurrentWorld(params.maxOptions ?? 9)
  const courtSession = simulateCourtSession({
    world: worldState,
    nationalAgenda,
    maxProposals: params.maxProposals ?? 9,
  })

  appendWorldEvent({
    category: 'system',
    action: 'preview_court_session',
    success: true,
    tick: worldState.tick,
    worldVersion: worldState.worldVersion,
    metadata: {
      seatCount: courtSession.seats.length,
      proposalCount: courtSession.proposals.length,
      passed: courtSession.resolutions.filter((item) => item.decision === 'passed').length,
      ...buildCourtDecisionPreviewHistoryOverlay(courtSession),
    },
  })

  return {
    ...buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: `Court session preview generated for tick ${worldState.tick}.`,
    }),
    nationalAgenda,
    courtSession,
  }
}

function findLatestBattleRecordForOccupyTile(
  world: WorldState,
  unitId: string,
  tileId: string,
): BattleOutcomeRecord | undefined {
  return world.feedback.battleRecords.find((record) => record.attackerUnitId === unitId && record.tileId === tileId)
}

function buildBattleOccupyTileHistoryOverlay(
  record: BattleOutcomeRecord | undefined,
  occupied: boolean,
): Record<string, unknown> {
  if (!record) {
    return {}
  }

  const actor = record.attacker?.trim() || '我方部队'
  const target = record.defender?.trim() || '守军'
  const location = record.location?.trim() || record.region?.trim() || '前线'
  const resultLabel = record.outcome === 'win' ? '胜利' : record.outcome === 'loss' ? '失利' : '僵持'
  const consequence = occupied
    ? '战斗结果已写入战报，目标地块已纳入后续经营。'
    : record.outcome === 'loss'
      ? '部队受损，需要修整后再战。'
      : '战斗结果已写入战报，前线仍需继续处置。'
  return {
    playerHistoryCategory: 'battle',
    playerHistoryTitle: '战斗已结束',
    playerHistoryActorName: actor,
    playerHistorySummary: `${location}交战已结算，${actor}对阵${target}。`,
    playerHistoryLocation: location,
    playerHistoryTarget: target,
    playerHistoryResultLabel: resultLabel,
    playerHistoryConsequence: consequence,
    playerHistoryNextAction: '查看战报',
    playerHistorySeverity: 'medium',
    playerHistoryScope: 'own_faction',
    playerHistorySharePolicy: 'explicit_spectator',
    playerHistoryShareStateLabel: '可分享',
    playerHistoryShareRetentionLabel: '分享后限时可查看',
    playerHistoryDedupeKey: `battle:${record.id}`,
    battleReportId: record.id,
    battleReportKind: record.reportKind,
    battleOutcome: record.outcome,
  }
}

function buildCourtDecisionPreviewHistoryOverlay(courtSession: CourtSession): Record<string, unknown> {
  const passedResolution = courtSession.resolutions.find((item) => item.decision === 'passed')
  const heldResolution = courtSession.resolutions.find((item) => item.decision !== 'passed')
  const selectedResolution = passedResolution ?? heldResolution
  const selectedProposal = selectedResolution
    ? courtSession.proposals.find((item) => item.id === selectedResolution.proposalId)
    : courtSession.proposals[0]
  const target = selectedProposal?.title?.trim() || '本轮议题'
  const passedCount = courtSession.resolutions.filter((item) => item.decision === 'passed').length
  const heldCount = courtSession.resolutions.length - passedCount

  if (passedResolution) {
    return {
      courtWorldEffectState: 'decision_passed_pending',
      playerHistoryCategory: 'court',
      playerHistoryTitle: '决议待执行',
      playerHistoryActorName: '洛阳朝议',
      playerHistorySummary: `朝议通过${target}，等待执行结果回报。`,
      playerHistoryLocation: '洛阳',
      playerHistoryTarget: target,
      playerHistoryResultLabel: '待执行',
      playerHistoryConsequence: '当前世界状态尚未改变，需等待正式执行回执。',
      playerHistoryNextAction: '查看朝议',
      playerHistorySeverity: 'medium',
      playerHistoryScope: 'private_court',
      playerHistoryFactionId: 'player',
      playerHistorySharePolicy: 'not_shareable_private',
      playerHistoryShareStateLabel: '暂不可分享',
      playerHistoryDedupeKey: `court:${courtSession.id}:pending:${passedResolution.id}`,
      courtPendingCount: passedCount,
      courtHeldCount: heldCount,
    }
  }

  return {
    courtWorldEffectState: 'decision_deferred_or_held',
    playerHistoryCategory: 'court',
    playerHistoryTitle: '朝议暂缓',
    playerHistoryActorName: '洛阳朝议',
    playerHistorySummary: `${target}暂未通过，后续可重新提交议题。`,
    playerHistoryLocation: '洛阳',
    playerHistoryTarget: target,
    playerHistoryResultLabel: '暂缓',
    playerHistoryConsequence: '当前世界状态没有改变，可调整方案后再议。',
    playerHistoryNextAction: '查看朝议',
    playerHistorySeverity: 'medium',
    playerHistoryScope: 'private_court',
    playerHistoryFactionId: 'player',
    playerHistorySharePolicy: 'not_shareable_private',
    playerHistoryShareStateLabel: '暂不可分享',
    playerHistoryDedupeKey: `court:${courtSession.id}:held:${selectedResolution?.id ?? 'none'}`,
    courtPendingCount: 0,
    courtHeldCount: heldCount,
  }
}

function buildCourtDecisionAppliedHistoryOverlay(
  courtSession: CourtSession,
  params: {
    tickBefore: number
    tickAfter: number
    worldVersionBefore: number
    worldVersionAfter: number
    civilMemoryId?: string
  },
): Record<string, unknown> {
  const passedResolution = courtSession.resolutions.find((item) => item.decision === 'passed')
  const proposal = passedResolution
    ? courtSession.proposals.find((item) => item.id === passedResolution.proposalId)
    : courtSession.proposals[0]
  const target = proposal?.title?.trim() || '本轮议题'
  const changed = params.worldVersionAfter > params.worldVersionBefore

  return {
    courtWorldEffectState: changed ? 'world_effect_applied' : 'world_effect_blocked',
    courtTickBefore: params.tickBefore,
    courtTickAfter: params.tickAfter,
    courtWorldVersionBefore: params.worldVersionBefore,
    courtWorldVersionAfter: params.worldVersionAfter,
    courtExecutionDirective: passedResolution?.executionDirective,
    playerHistoryCategory: 'court',
    playerHistoryTitle: changed ? '决议已执行' : '决议未生效',
    playerHistoryActorName: '洛阳朝议',
    playerHistorySummary: changed
      ? `朝议通过${target}，本轮执行结果已回报。`
      : `${target}暂未改变局势，需要重新确认条件。`,
    playerHistoryLocation: '洛阳',
    playerHistoryTarget: target,
    playerHistoryResultLabel: changed ? '已执行' : '未生效',
    playerHistoryConsequence: changed
      ? '世界进度已更新，后续可按结果继续处置。'
      : '当前世界状态没有变化，可调整方案后再议。',
    playerHistoryNextAction: '查看朝议',
    playerHistorySeverity: 'medium',
    playerHistoryScope: 'private_court',
    playerHistoryFactionId: 'player',
    playerHistorySharePolicy: 'not_shareable_private',
    playerHistoryShareStateLabel: '暂不可分享',
    playerHistoryDedupeKey: `court:${courtSession.id}:${changed ? 'applied' : 'blocked'}:${passedResolution?.id ?? 'none'}:${params.worldVersionAfter}`,
    playerHistoryCivilMemoryId: params.civilMemoryId,
  }
}

function buildCourtDecisionBlockedHistoryOverlay(
  courtSession: CourtSession,
  params: {
    tickBefore: number
    tickAfter: number
    worldVersionBefore: number
    worldVersionAfter: number
    civilMemoryId?: string
  },
): Record<string, unknown> {
  const blockedResolution = courtSession.resolutions.find((item) => item.decision !== 'passed')
  const proposal = blockedResolution
    ? courtSession.proposals.find((item) => item.id === blockedResolution.proposalId)
    : courtSession.proposals[0]
  const target = proposal?.title?.trim() || '本轮议题'
  const reason = blockedResolution?.decision === 'deferred' ? '本轮未形成足够共识' : '本轮未通过'

  return {
    courtWorldEffectState: 'world_effect_blocked',
    courtNoChangeReason: reason,
    courtTickBefore: params.tickBefore,
    courtTickAfter: params.tickAfter,
    courtWorldVersionBefore: params.worldVersionBefore,
    courtWorldVersionAfter: params.worldVersionAfter,
    courtExecutionDirective: blockedResolution?.executionDirective,
    playerHistoryCategory: 'court',
    playerHistoryTitle: '决议未生效',
    playerHistoryActorName: '洛阳朝议',
    playerHistorySummary: `${target}${reason}，暂未改变局势。`,
    playerHistoryLocation: '洛阳',
    playerHistoryTarget: target,
    playerHistoryResultLabel: '未生效',
    playerHistoryConsequence: '当前世界状态未因该议题改变，可调整方案后再议。',
    playerHistoryNextAction: '查看朝议',
    playerHistorySeverity: 'medium',
    playerHistoryScope: 'private_court',
    playerHistoryFactionId: 'player',
    playerHistorySharePolicy: 'not_shareable_private',
    playerHistoryShareStateLabel: '暂不可分享',
    playerHistoryDedupeKey: `court:${courtSession.id}:blocked:${blockedResolution?.id ?? 'none'}:${params.worldVersionAfter}`,
    playerHistoryCivilMemoryId: params.civilMemoryId,
  }
}

function resolveCourtResolutionCivilMemoryId(entries: CivilMemoryEntry[], resolutionId: string | undefined): string | undefined {
  const resolvedId = resolutionId?.trim()
  if (!resolvedId) {
    return undefined
  }
  return entries.find((entry) => entry.type === 'court_resolution' && entry.resolutionId === resolvedId)?.id
}

export function queryCivilMemoryAction(
  params: QueryCivilMemoryActionParams = {},
  includeWorld = true,
): WorldActionResponse {
  const entries = listCivilMemoryEntries(params)

  appendWorldEvent({
    category: 'system',
    action: 'query_civil_memory',
    success: true,
    tick: worldState.tick,
    worldVersion: worldState.worldVersion,
    metadata: {
      limit: params.limit,
      type: params.type,
      tickFrom: params.tickFrom,
      tickTo: params.tickTo,
      factionId: params.factionId,
      relatedId: params.relatedId,
      results: entries.length,
    },
  })

  return {
    ...buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: `Civil memory query returned ${entries.length} entries.`,
    }),
    civilMemoryEntries: entries,
  }
}

function normalizeAiTeamContextFocusPayload(params: AiTeamContextFocusParams = {}) {
  const teamId = String(params.teamId ?? '').trim()
  const teamIndex = Number(params.teamIndex)
  const aiPlayerId = String(params.aiPlayerId ?? '').trim()
  const teamName = String(params.teamName ?? '').trim()
  const ownerType = String(params.ownerType ?? '').trim()
  const heroNames = (params.heroNames ?? [])
    .map((name) => String(name ?? '').trim())
    .filter((name) => name.length > 0)
    .slice(0, 3)
  return {
    teamId: teamId || undefined,
    teamIndex: Number.isFinite(teamIndex) && teamIndex > 0 ? Math.floor(teamIndex) : undefined,
    aiPlayerId: aiPlayerId || undefined,
    teamName: teamName || undefined,
    ownerType: ownerType || undefined,
    heroNames,
  }
}

function resolveAiContextRelatedId(
  world: WorldState,
  factionId: FactionId,
  contextFocusId: string,
  teamContext?: ReturnType<typeof normalizeAiTeamContextFocusPayload>,
): string | undefined {
  const faction = world.factions[factionId]
  if (!faction) {
    return undefined
  }

  switch (contextFocusId) {
    case 'focus_city':
      return faction.heroCommand.homeTileId || undefined
    case 'focus_troop': {
      const primaryUnit = world.units.find((unit) => unit.faction === factionId)
      return primaryUnit?.id
    }
    case 'focus_team':
      return teamContext?.teamId
    case 'focus_alliance': {
      const directives = Object.values(world.alliance.directives ?? {})
      if (directives.length > 0) {
        const regionById = new Map(world.map.regions.map((region) => [region.id, region]))
        const rankedDirective = directives
          .slice()
          .sort((left, right) => {
            if (left.supportLevel !== right.supportLevel) {
              return left.supportLevel - right.supportLevel
            }
            const leftRegion = regionById.get(left.regionId)
            const rightRegion = regionById.get(right.regionId)
            const leftPriority = String(leftRegion?.priority ?? '')
            const rightPriority = String(rightRegion?.priority ?? '')
            if (leftPriority !== rightPriority) {
              return leftPriority.localeCompare(rightPriority)
            }
            return left.regionId.localeCompare(right.regionId)
          })[0]
        if (rankedDirective?.regionId) {
          return rankedDirective.regionId
        }
      }

      const assignedRegionId = world.alliance.commanders.find((commander) => commander.assignedRegionId)?.assignedRegionId
      return assignedRegionId || undefined
    }
    default:
      return undefined
  }
}

function buildAiContextMemorySummary(entries: CivilMemoryEntry[], contextFocusId: string, updatedTick: number) {
  return {
    focusId: contextFocusId,
    lines: entries.slice(0, 3).map((entry) => {
      const typeLabel = String(entry.type ?? 'memory').trim()
      const summaryLabel = String(entry.summary ?? entry.title ?? '').trim()
      const tickLabel = typeof entry.tick === 'number' ? `T${entry.tick}` : ''
      return [typeLabel, summaryLabel, tickLabel].filter(Boolean).join(' · ')
    }),
    updatedTick,
  }
}

function findFactionUnitForHero(world: WorldState, factionId: FactionId, heroId: string) {
  return world.units.find((unit) => {
    if (unit.faction !== factionId) {
      return false
    }
    if (unit.hero?.id === heroId) {
      return true
    }
    return (unit.coHeroes ?? []).some((coHero) => coHero.id === heroId)
  })
}

function resolveGeneralTacticTemplateId(tacticId: SetGeneralTacticActionParams['tacticId']): Parameters<typeof queueTacticalOverride>[2] {
  switch (tacticId) {
    case 'guard':
      return 'garrison'
    case 'logistics':
      return 'rally'
    default:
      return 'breakthrough'
  }
}

function buildGeneralTacticSummary(heroId: string, tacticId: SetGeneralTacticActionParams['tacticId']): string {
  switch (tacticId) {
    case 'guard':
      return `武将 ${heroId} 切换为驻守态势`
    case 'logistics':
      return `武将 ${heroId} 切换为后勤支援态势`
    default:
      return `武将 ${heroId} 切换为先锋推进态势`
  }
}

function resolveDirectiveBasePlan(world: WorldState, inputPlan?: StrategicPlan): StrategicPlan {
  if (inputPlan) {
    return {
      ...inputPlan,
      orders: inputPlan.orders.slice(0, 8),
      constraints: inputPlan.constraints.slice(0, 16),
      reviewAfterTicks: Math.max(1, Math.min(6, Math.round(inputPlan.reviewAfterTicks || 2))),
    }
  }

  const defaultFactionExec = world.executions?.[resolveDefaultFactionId()] ?? null
  if (defaultFactionExec?.currentPlan) {
    return {
      ...defaultFactionExec.currentPlan,
      orders: defaultFactionExec.currentPlan.orders.slice(0, 8),
      constraints: defaultFactionExec.currentPlan.constraints.slice(0, 16),
      reviewAfterTicks: Math.max(1, Math.min(6, Math.round(defaultFactionExec.currentPlan.reviewAfterTicks || 2))),
    }
  }

  return {
    intent: 'directive_preview',
    priority: 'medium',
    orders: [],
    constraints: ['directive_preview_default_plan_v1'],
    reviewAfterTicks: 2,
  }
}

function normalizeExecutionMode(mode?: ExecutionEnqueueMode): ExecutionEnqueueMode {
  if (mode === 'append' || mode === 'reject_if_active') {
    return mode
  }

  return 'replace'
}

function normalizeExpectedExecutionRequestId(rawValue?: string) {
  const normalized = rawValue?.trim()
  return normalized ? normalized : undefined
}

function applyGeneralDirectivesToPlan(
  world: WorldState,
  plan: StrategicPlan,
  generals: FactionGeneral[],
  directives: GeneralDirective[],
): GeneralDirectiveResolutionResult {
  const byUnitId = new Map<string, StrategicPlan['orders'][number]>()
  for (const order of plan.orders) {
    byUnitId.set(order.unitId, order)
  }

  let accepted = 0
  let rejected = 0
  const warnings: string[] = []
  const items: GeneralDirectivePreviewItem[] = []
  const resolvedOrdersByUnitId = new Map<string, { action: ActionType; target: string; directiveIndex: number }>()

  for (const [directiveIndex, directive] of directives.slice(0, MAX_GENERAL_DIRECTIVES).entries()) {
    const action = resolveDirectiveAction(directive)
    const baseItem: Omit<GeneralDirectivePreviewItem, 'status' | 'reason' | 'matchMode' | 'confidence'> = {
      directiveIndex,
      generalIdInput: directive.generalId,
      instruction: directive.instruction,
      action,
    }

    const generalResolution = resolveDirectiveGeneral(generals, directive.generalId)
    if (generalResolution.warning) {
      warnings.push(generalResolution.warning)
    }

    const general = generalResolution.general
    if (!general) {
      rejected += 1
      items.push({
        ...baseItem,
        status: 'rejected',
        matchMode: generalResolution.matchMode,
        confidence: generalResolution.confidence,
        reason: generalResolution.reason,
        warning: generalResolution.warning,
      })
      continue
    }

    const targetResolution = resolveDirectiveTargetTile(world, general, directive, action)
    if (targetResolution.warning) {
      warnings.push(targetResolution.warning)
    }

    if (!targetResolution.targetTileId) {
      rejected += 1
      items.push({
        ...baseItem,
        status: 'rejected',
        matchMode: generalResolution.matchMode,
        confidence: lowerConfidence(generalResolution.confidence),
        reason: targetResolution.reason,
        warning: targetResolution.warning,
        resolvedGeneralId: general.id,
        resolvedGeneralName: general.name,
        resolvedUnitId: general.unitId,
      })
      continue
    }

    const existingDirective = resolvedOrdersByUnitId.get(general.unitId)
    if (existingDirective) {
      rejected += 1

      const duplicate =
        existingDirective.action === action && existingDirective.target === targetResolution.targetTileId

      const reason = duplicate
        ? `directive duplicate: unit ${general.unitId} at #${directiveIndex + 1} duplicates #${existingDirective.directiveIndex + 1}`
        : `directive conflict: unit ${general.unitId} has multiple directives (#${existingDirective.directiveIndex + 1} kept, #${directiveIndex + 1} dropped)`

      warnings.push(reason)
      items.push({
        ...baseItem,
        status: duplicate ? 'duplicate' : 'conflict',
        matchMode: generalResolution.matchMode,
        confidence: lowerConfidence(generalResolution.confidence),
        reason,
        resolvedGeneralId: general.id,
        resolvedGeneralName: general.name,
        resolvedUnitId: general.unitId,
        targetTileId: targetResolution.targetTileId,
        targetTileName: targetResolution.targetTileName,
      })
      continue
    }

    resolvedOrdersByUnitId.set(general.unitId, {
      action,
      target: targetResolution.targetTileId,
      directiveIndex,
    })

    accepted += 1
    items.push({
      ...baseItem,
      status: 'accepted',
      matchMode: generalResolution.matchMode,
      confidence: combineConfidence(generalResolution.confidence, targetResolution.confidence),
      reason: `${generalResolution.reason}; ${targetResolution.reason}`,
      warning: generalResolution.warning ?? targetResolution.warning,
      resolvedGeneralId: general.id,
      resolvedGeneralName: general.name,
      resolvedUnitId: general.unitId,
      targetTileId: targetResolution.targetTileId,
      targetTileName: targetResolution.targetTileName,
    })
  }

  for (const [unitId, resolvedOrder] of resolvedOrdersByUnitId.entries()) {
    byUnitId.set(unitId, {
      unitId,
      action: resolvedOrder.action,
      target: resolvedOrder.target,
    })
  }

  const mergedPlan = accepted === 0
    ? plan
    : {
        ...plan,
        orders: Array.from(byUnitId.values()).slice(0, 8),
        constraints: Array.from(
          new Set([...plan.constraints, 'general_directive_nl_v1', 'directive_conflict_guard_v1']),
        ).slice(0, 16),
      }

  return {
    plan: mergedPlan,
    accepted,
    rejected,
    warnings,
    items,
  }
}

type DirectiveGeneralResolution = {
  general?: FactionGeneral
  warning?: string
  reason: string
  matchMode: GeneralDirectivePreviewMatchMode
  confidence: GeneralDirectivePreviewConfidence
}

type DirectiveTargetResolution = {
  targetTileId?: string
  targetTileName?: string
  warning?: string
  reason: string
  confidence: GeneralDirectivePreviewConfidence
}

function resolveDirectiveGeneral(generals: FactionGeneral[], identity: string): DirectiveGeneralResolution {
  const rawIdentity = identity.trim()
  if (!rawIdentity) {
    return {
      reason: 'directive ignored: empty general identity',
      matchMode: 'none',
      confidence: 'low',
      warning: 'directive ignored: empty general identity',
    }
  }

  const normalizedIdentity = normalizeMatchText(rawIdentity)
  if (!normalizedIdentity) {
    return {
      reason: `directive ignored: invalid general identity ${rawIdentity}`,
      matchMode: 'none',
      confidence: 'low',
      warning: `directive ignored: invalid general identity ${rawIdentity}`,
    }
  }

  const exactRawMatch = generals.find(
    (general) => general.id === rawIdentity || general.unitId === rawIdentity || general.name === rawIdentity,
  )
  if (exactRawMatch) {
    return {
      general: exactRawMatch,
      reason: 'general matched by exact identifier',
      matchMode: 'exact',
      confidence: 'high',
    }
  }

  const exactNormalizedMatch = generals.find((general) => {
    const candidates = [general.id, general.unitId, general.name].map((value) => normalizeMatchText(value))
    return candidates.includes(normalizedIdentity)
  })
  if (exactNormalizedMatch) {
    return {
      general: exactNormalizedMatch,
      reason: 'general matched by normalized identifier',
      matchMode: 'normalized',
      confidence: 'high',
    }
  }

  const partialMatch = generals.find((general) => {
    const candidates = [general.name, general.id, general.unitId]
      .map((value) => normalizeMatchText(value))
      .filter((value) => value.length >= 2)

    return candidates.some(
      (candidate) =>
        candidate.includes(normalizedIdentity) ||
        (normalizedIdentity.length >= 2 && normalizedIdentity.includes(candidate)),
    )
  })

  if (partialMatch) {
    return {
      general: partialMatch,
      reason: 'general matched by partial identity',
      matchMode: 'partial',
      confidence: 'medium',
      warning: `directive general matched by partial identity: ${rawIdentity} -> ${partialMatch.name}`,
    }
  }

  const scoredMatches = generals
    .map((general) => ({
      general,
      score: scoreGeneralIdentity(normalizedIdentity, general),
    }))
    .sort((left, right) => right.score - left.score)

  const best = scoredMatches[0]
  const second = scoredMatches[1]
  if (!best || best.score < GENERAL_NAME_FUZZY_MIN_SCORE) {
    return {
      reason: `directive ignored: no reliable general match for ${rawIdentity}`,
      matchMode: 'none',
      confidence: 'low',
      warning: `directive ignored: no reliable general match for ${rawIdentity}`,
    }
  }

  if (second && best.score - second.score < GENERAL_NAME_FUZZY_GAP) {
    return {
      reason: `directive ignored: ambiguous general identity ${rawIdentity}`,
      matchMode: 'none',
      confidence: 'low',
      warning: `directive ignored: ambiguous general identity ${rawIdentity}, top candidates ${best.general.name}/${second.general.name}`,
    }
  }

  return {
    general: best.general,
    reason: 'general matched by fuzzy identity score',
    matchMode: 'fuzzy',
    confidence: best.score >= 0.88 ? 'high' : 'medium',
    warning: `directive general matched by fuzzy score: ${rawIdentity} -> ${best.general.name} (${best.score.toFixed(2)})`,
  }
}

function resolveDirectiveAction(directive: GeneralDirective): ActionType {
  if (directive.action) {
    return directive.action
  }

  const instruction = directive.instruction.trim().toLowerCase()

  const hasAnyToken = (tokens: string[]) => tokens.some((token) => instruction.includes(token))

  if (hasAnyToken(['recon', 'scout', '侦察', '探路'])) {
    return 'recon'
  }

  if (hasAnyToken(['support', 'assist', '支援', '补给', '策应'])) {
    return 'support'
  }

  if (hasAnyToken(['garrison', 'hold', 'defend', '驻防', '守城', '防守'])) {
    return 'garrison'
  }

  if (hasAnyToken(['capture', 'siege', '开荒', '攻城', '占领', '夺取'])) {
    return 'capture'
  }

  if (hasAnyToken(['attack', 'fight', 'march', '打架', '进攻', '攻击', '推进'])) {
    return 'march'
  }

  return 'recon'
}

function resolveDirectiveTargetTile(
  world: WorldState,
  general: FactionGeneral,
  directive: GeneralDirective,
  action: ActionType,
): DirectiveTargetResolution {
  const explicitTarget = directive.targetTileId?.trim()
  if (explicitTarget) {
    const matchedTile = world.map.tiles.find((tile) => tile.id === explicitTarget)
    if (matchedTile) {
      return {
        targetTileId: matchedTile.id,
        targetTileName: matchedTile.name,
        reason: 'target resolved by explicit targetTileId',
        confidence: 'high',
      }
    }

    return {
      reason: `explicit targetTileId not found: ${explicitTarget}`,
      confidence: 'low',
      warning: `directive target not found: ${explicitTarget}`,
    }
  }

  const instruction = directive.instruction.trim()
  if (instruction) {
    const normalizedInstruction = normalizeMatchText(instruction)

    const byTileId = world.map.tiles.find((tile) => normalizedInstruction.includes(normalizeMatchText(tile.id)))
    if (byTileId) {
      return {
        targetTileId: byTileId.id,
        targetTileName: byTileId.name,
        reason: 'target resolved from tileId token in instruction',
        confidence: 'high',
      }
    }

    const byTileName = world.map.tiles
      .filter((tile) => !!tile.name)
      .map((tile) => ({
        tile,
        normalizedName: normalizeMatchText(tile.name),
      }))
      .filter(({ normalizedName }) => normalizedName && normalizedInstruction.includes(normalizedName))
      .sort((left, right) => right.normalizedName.length - left.normalizedName.length)[0]?.tile

    if (byTileName) {
      return {
        targetTileId: byTileName.id,
        targetTileName: byTileName.name,
        reason: 'target resolved from tile name in instruction',
        confidence: 'high',
      }
    }

    const aliasHit = resolveDirectiveTargetByAlias(world, normalizedInstruction)
    if (aliasHit) {
      return {
        targetTileId: aliasHit.id,
        targetTileName: aliasHit.name,
        reason: 'target resolved by alias dictionary',
        confidence: 'medium',
      }
    }
  }

  const fallbackTarget = pickFallbackDirectiveTargetTileId(world, general, action)
  if (fallbackTarget) {
    const tile = world.map.tiles.find((candidate) => candidate.id === fallbackTarget)

    return {
      targetTileId: fallbackTarget,
      targetTileName: tile?.name,
      reason: 'target resolved by tactical fallback heuristic',
      confidence: 'low',
      warning: `directive target fallback applied for general ${general.name}`,
    }
  }

  return {
    reason: `directive ignored: no viable target for general ${general.name}`,
    confidence: 'low',
    warning: `directive ignored: no target for general ${general.name}`,
  }
}

function resolveDirectiveTargetByAlias(world: WorldState, normalizedInstruction: string) {
  if (!normalizedInstruction) {
    return undefined
  }

  for (const entry of TARGET_TILE_ALIAS_TABLE) {
    const canonicalToken = normalizeMatchText(entry.canonical)
    const aliasTokens = [entry.canonical, ...entry.aliases]
      .map((alias) => normalizeMatchText(alias))
      .filter(Boolean)

    const hasAliasHit = aliasTokens.some((aliasToken) => normalizedInstruction.includes(aliasToken))
    if (!hasAliasHit) {
      continue
    }

    const candidates = world.map.tiles
      .filter((tile) => !!tile.name)
      .map((tile) => ({
        tile,
        normalizedName: normalizeMatchText(tile.name),
      }))
      .filter(
        ({ normalizedName }) =>
          normalizedName.includes(canonicalToken) || aliasTokens.some((aliasToken) => normalizedName.includes(aliasToken)),
      )
      .sort((left, right) => right.tile.enemyPressure - left.tile.enemyPressure)

    if (candidates[0]) {
      return candidates[0].tile
    }
  }

  return undefined
}

function combineConfidence(
  generalConfidence: GeneralDirectivePreviewConfidence,
  targetConfidence: GeneralDirectivePreviewConfidence,
): GeneralDirectivePreviewConfidence {
  if (generalConfidence === 'high' && targetConfidence === 'high') {
    return 'high'
  }

  if (generalConfidence === 'low' || targetConfidence === 'low') {
    return 'low'
  }

  return 'medium'
}

function lowerConfidence(confidence: GeneralDirectivePreviewConfidence): GeneralDirectivePreviewConfidence {
  if (confidence === 'high') {
    return 'medium'
  }

  return 'low'
}

function pickFallbackDirectiveTargetTileId(world: WorldState, general: FactionGeneral, action: ActionType) {
  const ownTiles = world.map.tiles.filter((tile) => tile.owner === general.faction)
  const foreignTiles = world.map.tiles.filter((tile) => tile.owner !== general.faction)

  const sortedOwnTiles = ownTiles
    .slice()
    .sort((left, right) => right.enemyPressure - left.enemyPressure)
  const sortedForeignTiles = foreignTiles
    .slice()
    .sort((left, right) => right.enemyPressure - left.enemyPressure)

  if (action === 'garrison' || action === 'support') {
    return sortedOwnTiles[0]?.id ?? ownTiles[0]?.id
  }

  if (action === 'capture') {
    const neutralOrEnemy = foreignTiles
      .slice()
      .sort((left, right) => {
        const leftScore = (left.owner === 'neutral' ? 2 : 1) + left.enemyPressure
        const rightScore = (right.owner === 'neutral' ? 2 : 1) + right.enemyPressure
        return rightScore - leftScore
      })

    return neutralOrEnemy[0]?.id ?? sortedForeignTiles[0]?.id
  }

  if (action === 'march' || action === 'recon') {
    return sortedForeignTiles[0]?.id ?? foreignTiles[0]?.id
  }

  const currentUnit = world.units.find((unit) => unit.id === general.unitId)
  return currentUnit?.tileId
}

function scoreGeneralIdentity(normalizedIdentity: string, general: FactionGeneral) {
  const normalizedName = normalizeMatchText(general.name)
  const normalizedId = normalizeMatchText(general.id)
  const normalizedUnitId = normalizeMatchText(general.unitId)

  const nameScore = scoreTokenSimilarity(normalizedIdentity, normalizedName)
  const idScore = scoreTokenSimilarity(normalizedIdentity, normalizedId) * 0.82
  const unitScore = scoreTokenSimilarity(normalizedIdentity, normalizedUnitId) * 0.82

  const surnameHint =
    normalizedIdentity.length === 1 && normalizedName.startsWith(normalizedIdentity)
      ? 0.76
      : 0

  return Math.max(nameScore, idScore, unitScore, surnameHint)
}

function scoreTokenSimilarity(input: string, candidate: string) {
  if (!input || !candidate) {
    return 0
  }

  if (input === candidate) {
    return 1
  }

  if (input.includes(candidate) || candidate.includes(input)) {
    const maxLength = Math.max(input.length, candidate.length)
    const lengthGap = Math.abs(input.length - candidate.length)
    const gapPenalty = maxLength > 0 ? lengthGap / maxLength : 0
    return Math.max(0.75, 0.96 - gapPenalty * 0.24)
  }

  const maxLength = Math.max(input.length, candidate.length)
  if (maxLength === 0) {
    return 0
  }

  const editDistance = levenshteinDistance(input, candidate)
  const editScore = 1 - editDistance / maxLength
  const overlapScore = characterOverlapScore(input, candidate)

  return Math.max(editScore * 0.9, overlapScore * 0.88)
}

function characterOverlapScore(input: string, candidate: string) {
  if (!input || !candidate) {
    return 0
  }

  const counts = new Map<string, number>()
  for (const char of candidate) {
    counts.set(char, (counts.get(char) ?? 0) + 1)
  }

  let matched = 0
  for (const char of input) {
    const remaining = counts.get(char) ?? 0
    if (remaining <= 0) {
      continue
    }

    counts.set(char, remaining - 1)
    matched += 1
  }

  return matched / Math.max(1, candidate.length)
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) {
    return 0
  }

  if (!left.length) {
    return right.length
  }

  if (!right.length) {
    return left.length
  }

  const previous = new Array<number>(right.length + 1)
  const current = new Array<number>(right.length + 1)

  for (let index = 0; index <= right.length; index += 1) {
    previous[index] = index
  }

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i

    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      )
    }

    for (let j = 0; j <= right.length; j += 1) {
      previous[j] = current[j]
    }
  }

  return previous[right.length]
}

function normalizeMatchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\s\-_,.;:!?\u3002\uff0c\u3001\uff1b\uff1a\u201c\u201d\u2018\u2019"'`~\u00b7()\uff08\uff09\u005b\u005d\u3010\u3011{}<>\u300a\u300b|/\\]+/g, '')
}

export async function advanceTickAction(includeWorld = true): Promise<WorldActionResponse> {
  const mutationLock = tryAcquireWorldMutationLock('advance_tick')
  if (!mutationLock) {
    const failed = buildWorldMutationBusyResponse(includeWorld)
    const mutationHolder = getActiveWorldMutationHolder()
    const failureCategory: AdvanceTickFailureCategory = 'mutation_lock_busy'
    bumpCategoryStats(advanceTickFailureStats, failureCategory)

    appendWorldEvent({
      category: 'world_action',
      action: 'advance_tick',
      success: false,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      message: failed.message,
      metadata: {
        failureCode: failed.failureCode,
        failureCategory,
        mutationHolder,
        advanceTickFailureStats: snapshotCategoryStats(advanceTickFailureStats),
      },
    })

    return failed
  }

  const tickBefore = worldState.tick
  const worldVersionBefore = worldState.worldVersion
  const startedAt = new Date().toISOString()
  const startedAtMs = performance.now()
  const phaseTimings: AiRuntimeAdvanceTickPhaseTiming[] = []
  let narrativeEventsCount = 0
  let memoryWrites = 0
  let memoryWriteFailures = 0
  let battleReportsBroadcast = 0
  let courtMemoryEntries: CivilMemoryEntry[] = []

  try {
    const { domainCommWindow, nationalAgenda, courtSession } = await measureAdvanceTickPhase(
      phaseTimings,
      'compile_advisory',
      async () => {
        const advisoryWindow = compileNationalAgendaForCurrentWorld(9)
        const session = runCourtSession({
          world: worldState,
          nationalAgenda: advisoryWindow.nationalAgenda,
          maxProposals: 9,
        })
        return {
          domainCommWindow: advisoryWindow.domainCommWindow,
          nationalAgenda: advisoryWindow.nationalAgenda,
          courtSession: session,
        }
      },
    )

    await measureAdvanceTickPhase(phaseTimings, 'record_pre_tick_memory', () => {
      recordAgendaWindowMemory(nationalAgenda)
      courtMemoryEntries = recordCourtSessionMemory(courtSession)
    })

    await measureAdvanceTickPhase(phaseTimings, 'append_pre_tick_events', () => {
      appendWorldEvent({
        category: 'system',
        action: 'domain_comm_window',
        success: true,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        metadata: {
          domains: domainCommWindow.domains.length,
          totalPublished: domainCommWindow.totalPublished,
          totalDelivered: domainCommWindow.totalDelivered,
          totalDropped: domainCommWindow.totalDropped,
        },
      })

      appendWorldEvent({
        category: 'system',
        action: 'national_agenda_window',
        success: true,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        metadata: {
          optionCountIn: nationalAgenda.optionCountIn,
          optionCountOut: nationalAgenda.optionCountOut,
        },
      })

      appendWorldEvent({
        category: 'system',
        action: 'court_session_closed',
        success: true,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        metadata: {
          seatCount: courtSession.seats.length,
          proposalCount: courtSession.proposals.length,
          passed: courtSession.resolutions.filter((item) => item.decision === 'passed').length,
        },
      })
    })

    let previousWorld!: WorldState
    const advanceWorldSubphases: AiRuntimeAdvanceTickSubphaseTiming[] = []
    await measureAdvanceTickPhase(phaseTimings, 'advance_world_state', async () => {
      previousWorld = await measureAdvanceTickSubphase(
        advanceWorldSubphases,
        'advance_world_state.snapshot_previous_world',
        () => createWorldDeltaSnapshot(worldState, advanceWorldSubphases),
      )
      const advanceTickDiagnostics: AdvanceTickDiagnostics = { subphases: [] }
      const nextWorld = advanceTick(worldState, advanceTickDiagnostics)
      advanceWorldSubphases.push(...advanceTickDiagnostics.subphases)
      await measureAdvanceTickSubphase(advanceWorldSubphases, 'advance_world_state.commit_world_state', () => {
        commitWorldState(nextWorld, advanceWorldSubphases, previousWorld)
      })
      await measureAdvanceTickSubphase(advanceWorldSubphases, 'advance_world_state.refresh_replay_archive', () => {
        refreshReplayArchive()
      })
    }, { subphases: advanceWorldSubphases })

    // V2 sync + resource settlement: align captured tile/city snapshot first, then settle and mirror back to world.
    const syncV2Subphases: AiRuntimeAdvanceTickSubphaseTiming[] = []
    const v2Sync = await measureAdvanceTickPhase(phaseTimings, 'sync_v2_resources', async () => {
      const tileInfoById = await measureAdvanceTickSubphase(
        syncV2Subphases,
        'sync_v2_resources.build_tile_info_index',
        () => new Map(
          worldState.map.tiles.map((tile) => [
            tile.id,
            { type: tile.type, cityLevel: tile.cityLevel, resourceKind: tile.resourceKind, resourceLevel: tile.resourceLevel },
          ]),
        ),
      )
      const syncResult = await measureAdvanceTickSubphase(
        syncV2Subphases,
        'sync_v2_resources.sync_v2_state',
        () => syncV2StateWithWorld(worldState),
      )
      await measureAdvanceTickSubphase(syncV2Subphases, 'sync_v2_resources.settle_resources', () => {
        settleResourcesForAllPlayers((tileId: string) => tileInfoById.get(tileId))
      })
      await measureAdvanceTickSubphase(
        syncV2Subphases,
        'sync_v2_resources.mirror_world_faction_resources',
        () => {
          syncWorldFactionResourcesFromV2(worldState)
        },
      )
      return syncResult
    }, { subphases: syncV2Subphases })

    const reflectWorldSubphases: AiRuntimeAdvanceTickSubphaseTiming[] = []
    const reflectResult = await measureAdvanceTickPhase(phaseTimings, 'reflect_world_tick', async () => {
      const result = await reflectWorldTick({
        before: previousWorld,
        after: worldState,
        commanderId: process.env.COMMANDER_AGENT_ID?.trim() || `commander_${Object.keys(worldState.factions)[0] ?? 'default'}`,
      })
      reflectWorldSubphases.push(...result.performance.subphases)
      return result
    }, { subphases: reflectWorldSubphases })

    const passedResolutions = courtSession.resolutions.filter((item) => item.decision === 'passed')
    const blockedResolutions = courtSession.resolutions.filter((item) => item.decision !== 'passed')
    if (passedResolutions.length > 0) {
      appendWorldEvent({
        category: 'world_action',
        action: 'court_world_effect_applied',
        success: true,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        message: 'Court world effect receipt recorded.',
        metadata: buildCourtDecisionAppliedHistoryOverlay(courtSession, {
          tickBefore,
          tickAfter: worldState.tick,
          worldVersionBefore,
          worldVersionAfter: worldState.worldVersion,
          civilMemoryId: resolveCourtResolutionCivilMemoryId(courtMemoryEntries, passedResolutions[0]?.id),
        }),
      })
    }
    if (blockedResolutions.length > 0) {
      appendWorldEvent({
        category: 'world_action',
        action: 'court_world_effect_blocked',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        message: 'Court world effect blocked receipt recorded.',
        metadata: buildCourtDecisionBlockedHistoryOverlay(courtSession, {
          tickBefore,
          tickAfter: worldState.tick,
          worldVersionBefore,
          worldVersionAfter: worldState.worldVersion,
          civilMemoryId: resolveCourtResolutionCivilMemoryId(courtMemoryEntries, blockedResolutions[0]?.id),
        }),
      })
    }
    narrativeEventsCount = reflectResult.events.length
    memoryWrites = reflectResult.memoryWrites
    memoryWriteFailures = reflectResult.memoryWriteFailures
    await measureAdvanceTickPhase(phaseTimings, 'record_post_tick_memory', () => {
      recordSimulationNarrativeEvents(reflectResult.events)
      recordExecutionOutcomeMemory({
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        narrativeCount: reflectResult.events.length,
        memoryWrites: reflectResult.memoryWrites,
        memoryWriteFailures: reflectResult.memoryWriteFailures,
        passedResolutions,
      })
    })

    // WebSocket delta broadcast for subscribed clients
    const broadcastRuntimeSubphases: AiRuntimeAdvanceTickSubphaseTiming[] = []
    battleReportsBroadcast = await measureAdvanceTickPhase(phaseTimings, 'broadcast_runtime', async () => {
      const tickDeltaSummary = broadcastTickDelta(previousWorld, worldState, reflectResult.events)
      broadcastRuntimeSubphases.push(...tickDeltaSummary.subphases)
      return measureAdvanceTickSubphase(broadcastRuntimeSubphases, 'broadcast_runtime.battle_report_fanout', () => {
        let broadcastCount = 0
        const previousBattleRecordIds = new Set(previousWorld.feedback.battleRecords.map((record) => record.id))
        for (const br of worldState.feedback.battleRecords) {
          if (!previousBattleRecordIds.has(br.id)) {
            broadcastBattleReport(worldState.tick, br)
            broadcastCount += 1
          }
        }
        return broadcastCount
      })
    }, { subphases: broadcastRuntimeSubphases })

    const response = await measureAdvanceTickPhase(phaseTimings, 'finalize_response', () => ({
      ...buildWorldActionResponse({
        ok: true,
        includeWorld,
      }),
      nationalAgenda,
      courtSession,
    }))
    const timing = finalizeAdvanceTickRun({
      startedAt,
      startedAtMs,
      phases: phaseTimings,
      outcome: 'success',
      tickBefore,
      tickAfter: worldState.tick,
      worldVersionBefore,
      worldVersionAfter: worldState.worldVersion,
      narrativeEvents: narrativeEventsCount,
      memoryWrites,
      memoryWriteFailures,
      battleReportsBroadcast,
    })
    recordAdvanceTickRun(timing)

    appendWorldEvent({
      category: 'world_action',
      action: 'advance_tick',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      metadata: {
        narrativeEvents: reflectResult.events.length,
        memoryWrites: reflectResult.memoryWrites,
        memoryWriteFailures: reflectResult.memoryWriteFailures,
        profileUpdates: reflectResult.profileUpdates,
        causalLinks: reflectResult.causalLinks,
        consequenceLinks: reflectResult.consequenceLinks,
        domainCommDomains: domainCommWindow.domains.length,
        domainCommPublished: domainCommWindow.totalPublished,
        domainCommDelivered: domainCommWindow.totalDelivered,
        domainCommDropped: domainCommWindow.totalDropped,
        nationalAgendaOptionIn: nationalAgenda.optionCountIn,
        nationalAgendaOptionOut: nationalAgenda.optionCountOut,
        courtSeatCount: courtSession.seats.length,
        courtProposalCount: courtSession.proposals.length,
        courtResolutionPassed: passedResolutions.length,
        v2AutoPlayersSynced: v2Sync.autoPlayers,
        v2SyncedFactions: v2Sync.syncedFactions,
        advanceTickFailureStats: snapshotCategoryStats(advanceTickFailureStats),
        advanceTickTiming: {
          totalDurationMs: timing.totalDurationMs,
          slowestPhase: timing.slowestPhase,
          slowestPhaseDurationMs: timing.slowestPhaseDurationMs,
          phaseDurationsMs: buildAdvanceTickPhaseTimingsRecord(timing.phases),
          subphaseDurationsMs: buildAdvanceTickSubphaseTimingsRecord(timing.phases),
        },
      },
    })

    return response
  } catch (error) {
    const failureCategory: AdvanceTickFailureCategory = 'runtime_error'
    bumpCategoryStats(advanceTickFailureStats, failureCategory)
    const timing = finalizeAdvanceTickRun({
      startedAt,
      startedAtMs,
      phases: phaseTimings,
      outcome: 'runtime_error',
      tickBefore,
      tickAfter: worldState.tick,
      worldVersionBefore,
      worldVersionAfter: worldState.worldVersion,
      narrativeEvents: narrativeEventsCount,
      memoryWrites,
      memoryWriteFailures,
      battleReportsBroadcast,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'advance_tick failed',
    })
    recordAdvanceTickRun(timing)
    appendWorldEvent({
      category: 'world_action',
      action: 'advance_tick',
      success: false,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      message: error instanceof Error ? error.message : 'advance_tick failed',
      metadata: {
        failureCategory,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        advanceTickFailureStats: snapshotCategoryStats(advanceTickFailureStats),
        advanceTickTiming: {
          totalDurationMs: timing.totalDurationMs,
          slowestPhase: timing.slowestPhase,
          slowestPhaseDurationMs: timing.slowestPhaseDurationMs,
          phaseDurationsMs: buildAdvanceTickPhaseTimingsRecord(timing.phases),
          subphaseDurationsMs: buildAdvanceTickSubphaseTimingsRecord(timing.phases),
        },
      },
    })
    throw error
  } finally {
    mutationLock.release()
  }
}

export function clearPlanExecutionAction(includeWorld = true, factionId?: FactionId): WorldActionResponse {
  const targetFactionId = factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('clear_plan_execution')
  if (!mutationLock) {
    const failed = buildWorldMutationBusyResponse(includeWorld, targetFactionId)
    const mutationHolder = getActiveWorldMutationHolder()
    appendWorldEvent({
      category: 'world_action',
      action: 'clear_plan_execution',
      success: false,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      message: failed.message,
      metadata: {
        factionId: targetFactionId,
        failureCode: failed.failureCode,
        conflictCategory: 'mutation_lock_busy',
        mutationHolder,
        executionStatus: failed.execution?.status,
        activeOrderCount: failed.execution?.activeOrderCount,
        queuedOrderCount: failed.execution?.queuedOrderCount,
        runningOrderCount: failed.execution?.runningOrderCount,
        actionPointsRemaining: failed.execution?.actionPointsRemaining,
        foodRemaining: failed.execution?.foodRemaining,
        activeRequestId: failed.execution?.requestId,
      },
    })
    return failed
  }

  try {
    commitWorldState(clearPlanExecution(worldState, targetFactionId))
    refreshReplayArchive()

    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'clear_plan_execution',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function moveUnitAction(
  unitId: string,
  targetTileId: string,
  includeWorld = true,
  factionId?: FactionId,
): WorldActionResponse {
  const mutationLock = tryAcquireWorldMutationLock('move_unit')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld)
  }

  try {
    const targetFactionId = factionId ?? resolveDefaultFactionId()
    const originTileId = worldState.units.find((unit) => unit.id === unitId)?.tileId ?? ''
    const marchStartedAtMs = Date.now()
    const result = moveUnit(worldState, unitId, targetTileId, targetFactionId)
    const movementReceipt: WorldActionReceipt = {
      action: 'moveUnit',
      factionId: targetFactionId,
      unitId,
      tileId: targetTileId,
      blockedReason: result.ok ? null : (result.geographyFeedback?.blockedReason ?? result.message),
      movementGeographyFeedback: result.geographyFeedback,
    }
    if (!result.ok) {
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.geographyFeedback?.code,
        receipt: movementReceipt,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'move_unit',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        message: result.message,
        metadata: {
          unitId,
          targetTileId,
          factionId: targetFactionId,
          movementGeographyFeedback: result.geographyFeedback,
          failureCode: result.geographyFeedback?.code,
        },
      })

      return failed
    }

    const nextWorld = originTileId
      ? applyUnitMarchTiming({
          world: result.world,
          unitId,
          originTileId,
          targetTileId,
          startedAtMs: marchStartedAtMs,
        })
      : result.world
    commitWorldState(nextWorld)

    const succeeded = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      unitId: result.unitId,
      receipt: movementReceipt,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'move_unit',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      message: result.message,
      metadata: {
        unitId,
        targetTileId,
        factionId: targetFactionId,
        movementGeographyFeedback: result.geographyFeedback,
      },
    })

    return succeeded
  } finally {
    mutationLock.release()
  }
}

export function previewMovementGeographyAction(
  params: {
    factionId?: FactionId
    unitId?: string
    fromTileId: string
    targetTileId: string
  },
  includeWorld = false,
): WorldActionResponse {
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const templateUnit = params.unitId
    ? worldState.units.find((unit) => unit.id === params.unitId && unit.faction === targetFactionId)
    : worldState.units.find((unit) => unit.faction === targetFactionId)
  if (!templateUnit) {
    return buildWorldActionResponse({
      ok: false,
      includeWorld,
      message: `no unit available for movement geography preview: ${targetFactionId}`,
      failureCode: 'no_primary_unit',
      receipt: {
        action: 'previewMovementGeography',
        factionId: targetFactionId,
        unitId: params.unitId,
        tileId: params.targetTileId,
        blockedReason: `no unit available for movement geography preview: ${targetFactionId}`,
      },
    })
  }

  const previewWorld: WorldState = {
    ...worldState,
    units: worldState.units.map((unit) =>
      unit.id === templateUnit.id
        ? {
            ...structuredClone(unit),
            tileId: params.fromTileId,
          }
        : structuredClone(unit),
    ),
  }
  const feedback = resolveMovementGeographyFeedback(previewWorld, templateUnit.id, params.targetTileId, 'march')
  if (!feedback) {
    return buildWorldActionResponse({
      ok: false,
      includeWorld,
      message: 'movement geography preview target missing',
      failureCode: 'missing_target_tile',
      receipt: {
        action: 'previewMovementGeography',
        factionId: targetFactionId,
        unitId: templateUnit.id,
        tileId: params.targetTileId,
        blockedReason: 'movement geography preview target missing',
      },
    })
  }

  return buildWorldActionResponse({
    ok: feedback.ok,
    includeWorld,
    message: feedback.playerSummary,
    failureCode: feedback.ok ? undefined : feedback.code,
    receipt: {
      action: 'previewMovementGeography',
      factionId: targetFactionId,
      unitId: templateUnit.id,
      tileId: params.targetTileId,
      blockedReason: feedback.blockedReason,
      movementGeographyFeedback: feedback,
    },
  })
}

export function upgradeCityAction(tileId: string, includeWorld = true, factionId?: FactionId): WorldActionResponse {
  const mutationLock = tryAcquireWorldMutationLock('upgrade_city')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld)
  }

  try {
    const targetFactionId = factionId ?? resolveDefaultFactionId()
    const result = upgradeCity(worldState, tileId, targetFactionId)
    if (!result.ok) {
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'upgrade_city',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        message: result.message,
        metadata: { tileId, factionId: targetFactionId },
      })

      return failed
    }

    commitWorldState(result.world)

    const succeeded = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'upgrade_city',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      message: result.message,
      metadata: {
        tileId,
        factionId: targetFactionId,
        cityHallTileId: result.cityHallTileId,
      },
    })

    return succeeded
  } finally {
    mutationLock.release()
  }
}

export function upgradeCityTechAction(
  tileId: string,
  techId: CityTechTrackId,
  includeWorld = true,
  factionId?: FactionId,
): WorldActionResponse {
  const mutationLock = tryAcquireWorldMutationLock('upgrade_city_tech')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld)
  }

  try {
    const targetFactionId = factionId ?? resolveDefaultFactionId()
    const result = upgradeCityTech(worldState, tileId, techId, targetFactionId)
    if (!result.ok) {
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        receipt: {
          action: 'upgradeCityTech',
          factionId: targetFactionId,
          tileId,
          techId,
          previousLevel: result.previousLevel,
          resourcesSpent: result.resourcesSpent,
          failureCode: result.failureCode,
        },
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'upgrade_city_tech',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        message: result.message,
        metadata: { tileId, techId, factionId: targetFactionId },
      })

      return failed
    }

    commitWorldState(result.world)

    const succeeded = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      receipt: {
        action: 'upgradeCityTech',
        factionId: targetFactionId,
        tileId: result.cityHallTileId,
        techId: result.techId,
        previousLevel: result.previousLevel,
        nextLevel: result.nextLevel,
        resourcesSpent: result.resourcesSpent,
        readModelRefresh: {
          endpoint: '/api/world/main-city/facility-tree',
          method: 'GET',
          strategy: 'refetch_after_success',
        },
      },
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'upgrade_city_tech',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      message: result.message,
      metadata: {
        tileId,
        factionId: targetFactionId,
        cityHallTileId: result.cityHallTileId,
        techId: result.techId,
        nextLevel: result.nextLevel,
      },
    })

    return succeeded
  } finally {
    mutationLock.release()
  }
}

export function upgradeTacticalSkillAction(
  heroId: string,
  skillId: string,
  includeWorld = true,
  factionId?: FactionId,
): WorldActionResponse {
  const requestId = randomUUID()
  const mutationLock = tryAcquireWorldMutationLock('upgrade_tactical_skill')
  const targetFactionId = factionId ?? resolveDefaultFactionId()
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = upgradeTacticalSkill(worldState, heroId, skillId, targetFactionId)
    const baseReceipt: WorldActionReceipt = {
      action: 'upgradeTacticalSkill',
      factionId: targetFactionId,
      heroId: result.heroId ?? heroId,
      skillId: result.skillId ?? skillId,
      previousLevel: result.previousLevel,
      nextLevel: result.ok ? result.nextLevel : undefined,
      resourcesSpent: result.resourcesSpent,
      failureCode: result.ok ? undefined : result.failureCode,
    }

    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        heroId: result.heroId ?? heroId,
        relatedId: result.heroId ?? heroId,
        execution,
        receipt: baseReceipt,
      })
      appendWorldEvent({
        category: 'world_action',
        action: 'upgrade_tactical_skill',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          heroId,
          skillId,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
        },
      })
      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      heroId: result.heroId,
      relatedId: result.heroId,
      execution,
      receipt: baseReceipt,
    })
    appendWorldEvent({
      category: 'world_action',
      action: 'upgrade_tactical_skill',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        heroId: result.heroId,
        skillId: result.skillId,
        previousLevel: result.previousLevel,
        nextLevel: result.nextLevel,
        resourcesSpent: result.resourcesSpent,
        executionStatus: execution?.status,
      },
    })
    return response
  } finally {
    mutationLock.release()
  }
}

export function upgradeHeroLevelAction(
  heroId: string,
  includeWorld = true,
  factionId?: FactionId,
): WorldActionResponse {
  const requestId = randomUUID()
  const mutationLock = tryAcquireWorldMutationLock('upgrade_hero_level')
  const targetFactionId = factionId ?? resolveDefaultFactionId()
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = upgradeHeroLevel(worldState, heroId, targetFactionId)
    const receipt: WorldActionReceipt = {
      action: 'upgradeHeroLevel',
      factionId: targetFactionId,
      heroId: result.heroId ?? heroId,
      previousLevel: result.previousLevel,
      nextLevel: result.ok ? result.nextLevel : undefined,
      resourcesSpent: result.ok ? result.resourcesSpent : undefined,
      failureCode: result.ok ? undefined : result.failureCode,
      internalOnly: true,
      hero: result.ok ? result.hero : undefined,
    }

    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        heroId: result.heroId ?? heroId,
        relatedId: result.heroId ?? heroId,
        execution,
        receipt,
      })
      appendWorldEvent({
        category: 'world_action',
        action: 'upgrade_hero_level',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          heroId,
          failureCode: result.failureCode,
          previousLevel: result.previousLevel,
          executionStatus: execution?.status,
        },
      })
      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      heroId: result.heroId,
      relatedId: result.heroId,
      execution,
      receipt,
    })
    appendWorldEvent({
      category: 'world_action',
      action: 'upgrade_hero_level',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        heroId: result.heroId,
        previousLevel: result.previousLevel,
        nextLevel: result.nextLevel,
        resourcesSpent: result.resourcesSpent,
        executionStatus: execution?.status,
      },
    })
    return response
  } finally {
    mutationLock.release()
  }
}

export function upgradeHeroStarAction(
  heroId: string,
  includeWorld = true,
  factionId?: FactionId,
): WorldActionResponse {
  const requestId = randomUUID()
  const mutationLock = tryAcquireWorldMutationLock('upgrade_hero_star')
  const targetFactionId = factionId ?? resolveDefaultFactionId()
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = upgradeHeroStar(worldState, heroId, targetFactionId)
    const receipt: WorldActionReceipt = {
      action: 'upgradeHeroStar',
      factionId: targetFactionId,
      heroId: result.heroId ?? heroId,
      previousStarLevel: result.previousStarLevel,
      nextStarLevel: result.ok ? result.nextStarLevel : undefined,
      resourcesSpent: result.ok ? result.resourcesSpent : undefined,
      bonusPointsAwarded: result.ok ? result.bonusPointsAwarded : undefined,
      failureCode: result.ok ? undefined : result.failureCode,
      hero: result.ok ? result.hero : undefined,
    }

    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        heroId: result.heroId ?? heroId,
        relatedId: result.heroId ?? heroId,
        execution,
        receipt,
      })
      appendWorldEvent({
        category: 'world_action',
        action: 'upgrade_hero_star',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          heroId,
          failureCode: result.failureCode,
          previousStarLevel: result.previousStarLevel,
          executionStatus: execution?.status,
        },
      })
      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      heroId: result.heroId,
      relatedId: result.heroId,
      execution,
      receipt,
    })
    appendWorldEvent({
      category: 'world_action',
      action: 'upgrade_hero_star',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        heroId: result.heroId,
        previousStarLevel: result.previousStarLevel,
        nextStarLevel: result.nextStarLevel,
        resourcesSpent: result.resourcesSpent,
        bonusPointsAwarded: result.bonusPointsAwarded,
        executionStatus: execution?.status,
      },
    })
    return response
  } finally {
    mutationLock.release()
  }
}

export function promoteCityBuildingAction(
  cityId: string,
  groupId: string,
  buildingId: string,
  includeWorld = true,
  factionId?: FactionId,
): WorldActionResponse {
  const mutationLock = tryAcquireWorldMutationLock('promote_city_building')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld)
  }

  try {
    const targetFactionId = factionId ?? resolveDefaultFactionId()
    const result = promoteCityBuilding(worldState, cityId, groupId, buildingId, targetFactionId)
    if (!result.ok) {
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        receipt: {
          action: 'promoteCityBuilding',
          factionId: targetFactionId,
          cityId,
          groupId,
          buildingId,
          previousLevel: result.previousLevel,
          resourcesSpent: result.resourcesSpent,
          failureCode: result.failureCode,
        },
      })
      appendWorldEvent({
        category: 'world_action',
        action: 'promote_city_building',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        message: result.message,
        metadata: {
          ...buildMainCityEconomyHistoryOverlay({
            cityId,
            groupId,
            buildingId,
            previousLevel: result.previousLevel,
            failureCode: result.failureCode,
            resourcesSpent: result.resourcesSpent,
          }),
          cityId,
          groupId,
          buildingId,
          factionId: targetFactionId,
          playerHistoryFactionId: targetFactionId,
          failureCode: result.failureCode,
        },
      })
      return failed
    }

    commitWorldState(result.world)
    const succeeded = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      receipt: {
        action: 'promoteCityBuilding',
        factionId: targetFactionId,
        cityId: result.cityId,
        groupId: result.groupId,
        buildingId: result.buildingId,
        previousLevel: result.previousLevel,
        nextLevel: result.nextLevel,
        resourcesSpent: result.resourcesSpent,
        readModelRefresh: {
          endpoint: '/api/world/main-city/facility-tree',
          method: 'GET',
          strategy: 'refetch_after_success',
        },
      },
    })
      appendWorldEvent({
        category: 'world_action',
        action: 'promote_city_building',
        success: true,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        message: result.message,
        metadata: {
          ...buildMainCityEconomyHistoryOverlay({
            cityId: result.cityId,
            groupId: result.groupId,
            buildingId: result.buildingId,
            previousLevel: result.previousLevel,
            nextLevel: result.nextLevel,
            resourcesSpent: result.resourcesSpent,
          }),
          cityId,
          groupId,
          buildingId,
          factionId: targetFactionId,
          playerHistoryFactionId: targetFactionId,
          nextLevel: result.nextLevel,
        },
      })
    return succeeded
  } finally {
    mutationLock.release()
  }
}

function buildMainCityEconomyHistoryOverlay(params: {
  cityId: string
  groupId: string
  buildingId: string
  previousLevel?: number
  nextLevel?: number
  failureCode?: string
  resourcesSpent?: Record<string, number>
}): Record<string, unknown> {
  const buildingLabel = resolveMainCityBuildingLabel(params.groupId, params.buildingId)
  const resourceSummary = formatMainCityResourceSpend(params.resourcesSpent)
  const dedupeLevel = params.nextLevel ?? params.previousLevel ?? 'blocked'

  if (params.failureCode) {
    return {
      playerHistoryCategory: 'economy_city',
      playerHistoryTitle: '设施升级受阻',
      playerHistoryActorName: '主城内府',
      playerHistorySummary: `${buildingLabel}暂未升级，先处理资源或队列限制。`,
      playerHistoryLocation: '主城',
      playerHistoryTarget: buildingLabel,
      playerHistoryResultLabel: '需要处理',
      playerHistoryConsequence: '建设节奏暂时放缓，补足条件后可以再次尝试。',
      playerHistoryNextAction: '查看城内事务',
      playerHistorySeverity: 'medium',
      playerHistoryScope: 'own_faction',
      playerHistoryDedupeKey: `economy-city:${params.cityId}:${params.groupId}:${params.buildingId}:blocked:${params.failureCode}:${dedupeLevel}`,
    }
  }

  return {
    playerHistoryCategory: 'economy_city',
    playerHistoryTitle: '设施升级完成',
    playerHistoryActorName: '主城内府',
    playerHistorySummary: `${buildingLabel}已升级${resourceSummary ? `，${resourceSummary}` : ''}。`,
    playerHistoryLocation: '主城',
    playerHistoryTarget: buildingLabel,
    playerHistoryResultLabel: params.nextLevel ? `升至 ${params.nextLevel} 级` : '已升级',
    playerHistoryConsequence: '城内产出与后续建设能力提升，可以继续安排内政。',
    playerHistoryNextAction: '查看城内事务',
    playerHistorySeverity: 'low',
    playerHistoryScope: 'own_faction',
    playerHistoryDedupeKey: `economy-city:${params.cityId}:${params.groupId}:${params.buildingId}:level:${dedupeLevel}`,
  }
}

function resolveMainCityBuildingLabel(groupId: string, buildingId: string): string {
  if (buildingId === 'tax_office') return '税务府'
  if (buildingId === 'market_plaza') return '市集'
  if (buildingId === 'policy_hall') return '政务厅'
  if (buildingId === 'recruit_policy_board') return '募兵议事处'
  if (groupId === 'tax') return '税务设施'
  if (groupId === 'market') return '市集设施'
  if (groupId === 'policy') return '政务设施'
  return '城内设施'
}

function formatMainCityResourceSpend(resourcesSpent: Record<string, number> | undefined): string {
  if (!resourcesSpent) return ''
  const labels: Record<string, string> = {
    actionPoints: '行动力',
    food: '粮草',
    wood: '木材',
    stone: '石料',
    iron: '铁矿',
    copper: '铜钱',
  }
  return Object.entries(resourcesSpent)
    .filter(([, value]) => Number(value) > 0)
    .map(([key, value]) => `${value} ${labels[key] ?? key}`)
    .join('、')
}

export function setGeneralActiveHeroAction(
  heroId: string,
  includeWorld = true,
  factionId?: FactionId,
): WorldActionResponse {
  const requestId = randomUUID()
  const mutationLock = tryAcquireWorldMutationLock('set_general_active_hero')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, factionId, requestId)
  }

  try {
    const targetFactionId = factionId ?? resolveDefaultFactionId()
    const result = setGeneralActiveHero(worldState, heroId, targetFactionId)
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        requestId,
        heroId,
        relatedId: heroId,
        execution,
      })
      appendWorldEvent({
        category: 'world_action',
        action: 'set_general_active_hero',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          heroId,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })
      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      heroId: result.heroId,
      relatedId: result.heroId,
      execution,
    })
    appendWorldEvent({
      category: 'world_action',
      action: 'set_general_active_hero',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        heroId: result.heroId,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })
    return response
  } finally {
    mutationLock.release()
  }
}

export function setGeneralTacticAction(
  heroId: string,
  tacticId: SetGeneralTacticActionParams['tacticId'],
  includeWorld = true,
  factionId?: FactionId,
): WorldActionResponse {
  const requestId = randomUUID()
  const mutationLock = tryAcquireWorldMutationLock('set_general_tactic')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, factionId, requestId)
  }

  try {
    const targetFactionId = factionId ?? resolveDefaultFactionId()
    const result = setGeneralTactic(worldState, heroId, tacticId, targetFactionId)
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        requestId,
        heroId,
        tacticId,
        relatedId: heroId,
        execution,
      })
      appendWorldEvent({
        category: 'world_action',
        action: 'set_general_tactic',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          heroId,
          tacticId,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })
      return failed
    }

    let nextWorld = result.world
    const activeUnit = findFactionUnitForHero(nextWorld, targetFactionId, result.heroId)
    nextWorld.slgDomainState ??= {}
    nextWorld.slgDomainState.generalStateByFaction ??= {}
    const currentGeneralState = nextWorld.slgDomainState.generalStateByFaction[targetFactionId] ?? {}
    if (activeUnit?.tileId) {
      nextWorld = queueTacticalOverride(
        nextWorld,
        activeUnit.id,
        resolveGeneralTacticTemplateId(tacticId),
        activeUnit.tileId,
        buildGeneralTacticSummary(result.heroId, tacticId),
        targetFactionId,
      )
      nextWorld.slgDomainState ??= {}
      nextWorld.slgDomainState.generalStateByFaction ??= {}
      const currentState = nextWorld.slgDomainState.generalStateByFaction[targetFactionId] ?? currentGeneralState
      const existingHeroPreview = (currentState.directivePreviewByHeroId ?? {})[result.heroId] ?? {}
      const appliedDirectivePreview = {
        ...existingHeroPreview,
        heroId: result.heroId,
        tacticId,
        source: 'hero_authority',
        sourceActionId: 'set_general_tactic',
        accepted: 1,
        rejected: 0,
        status: 'applied',
        executionState: 'queued_to_unit',
        summary: `${buildGeneralTacticSummary(result.heroId, tacticId)}，并已同步到当前部队。`,
        warnings: [],
        effectLines: [
          `当前部队：${activeUnit.id}`,
          `当前位置：${activeUnit.tileId}`,
          `已写入模板：${resolveGeneralTacticTemplateId(tacticId)}`,
        ],
        nextSteps: ['当前部队已收到新的权威战法模板。', '如再次切换战法，当前部队会收到新的权威指令。'],
        templateId: resolveGeneralTacticTemplateId(tacticId),
        affectedUnitIds: [activeUnit.id],
        targetUnitId: activeUnit.id,
        targetTileId: activeUnit.tileId,
        updatedTick: nextWorld.tick,
        updatedWorldVersion: nextWorld.worldVersion,
      }
      nextWorld.slgDomainState.generalStateByFaction[targetFactionId] = {
        ...currentState,
        directivePreviewHeroId: currentState.activeHeroId === result.heroId ? result.heroId : currentState.directivePreviewHeroId,
        directivePreview: currentState.activeHeroId === result.heroId ? cloneGeneralDirectivePreviewMirror(appliedDirectivePreview) : currentState.directivePreview,
        directivePreviewByHeroId: {
          ...(currentState.directivePreviewByHeroId ?? {}),
          [result.heroId]: appliedDirectivePreview,
        },
        updatedTick: nextWorld.tick,
      }
    } else {
      const existingHeroPreview = (currentGeneralState.directivePreviewByHeroId ?? {})[result.heroId] ?? {}
      const pendingDirectivePreview = {
        ...existingHeroPreview,
        heroId: result.heroId,
        tacticId,
        source: 'hero_authority',
        sourceActionId: 'set_general_tactic',
        accepted: 1,
        rejected: 0,
        status: 'pending_assignment',
        executionState: 'pending_assignment',
        summary: `${buildGeneralTacticSummary(result.heroId, tacticId)} 当前未编组，已记录为待生效战法。`,
        warnings: ['当前武将未编组，战法将在后续编组或调度时继续生效。'],
        effectLines: [
          `当前武将 ${result.heroId} 尚未编组到部队。`,
          `战法 ${resolveGeneralTacticTemplateId(tacticId)} 已记入权威状态。`,
        ],
        nextSteps: ['如后续完成编组，权威模板会自动继承到目标部队。', '如果继续切换战法，待生效说明会被新的权威状态覆盖。'],
        templateId: resolveGeneralTacticTemplateId(tacticId),
        affectedUnitIds: [],
        updatedTick: nextWorld.tick,
        updatedWorldVersion: nextWorld.worldVersion,
      }
      nextWorld.slgDomainState.generalStateByFaction[targetFactionId] = {
        ...currentGeneralState,
        directivePreviewHeroId: currentGeneralState.activeHeroId === result.heroId ? result.heroId : currentGeneralState.directivePreviewHeroId,
        directivePreview:
          currentGeneralState.activeHeroId === result.heroId
            ? cloneGeneralDirectivePreviewMirror(pendingDirectivePreview)
            : currentGeneralState.directivePreview,
        directivePreviewByHeroId: {
          ...(currentGeneralState.directivePreviewByHeroId ?? {}),
          [result.heroId]: pendingDirectivePreview,
        },
        updatedTick: nextWorld.tick,
      }
    }

    commitWorldState(nextWorld)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: activeUnit?.id
        ? `${result.message} 已同步到部队 ${activeUnit.id}。`
        : `${result.message} 当前未编组，已记录为待生效战法。`,
      requestId,
      heroId: result.heroId,
      unitId: activeUnit?.id,
      tacticId,
      relatedId: result.heroId,
      execution,
    })
    appendWorldEvent({
      category: 'world_action',
      action: 'set_general_tactic',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: response.message,
      metadata: {
        factionId: targetFactionId,
        heroId: result.heroId,
        tacticId,
        unitId: activeUnit?.id,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })
    return response
  } finally {
    mutationLock.release()
  }
}

export function setAiContextFocusAction(
  contextFocusId: SetAiContextFocusActionParams['contextFocusId'],
  includeWorld = true,
  factionId?: FactionId,
  teamContextParams: AiTeamContextFocusParams = {},
): WorldActionResponse {
  const targetFactionId = factionId ?? resolveDefaultFactionId()
  const teamContext = normalizeAiTeamContextFocusPayload(teamContextParams)
  if (contextFocusId === 'focus_team' && !teamContext.teamId) {
    return buildWorldActionResponse({
      ok: false,
      includeWorld,
      message: 'AI 队伍上下文焦点缺少队伍 ID。',
    })
  }
  const mutationLock = tryAcquireWorldMutationLock('set_ai_context_focus')
  if (!mutationLock) {
    const failed = buildWorldMutationBusyResponse(includeWorld, targetFactionId)
    appendWorldEvent({
      category: 'world_action',
      action: 'set_ai_context_focus',
      success: false,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      message: failed.message,
      metadata: {
        factionId: targetFactionId,
        contextFocusId,
        teamId: teamContext.teamId,
        aiPlayerId: teamContext.aiPlayerId,
        failureCode: failed.failureCode,
        mutationHolder: getActiveWorldMutationHolder(),
        executionStatus: failed.execution?.status,
        activeOrderCount: failed.execution?.activeOrderCount,
        queuedOrderCount: failed.execution?.queuedOrderCount,
        runningOrderCount: failed.execution?.runningOrderCount,
      },
    })
    return failed
  }

  try {
    const result = setAiContextFocus(worldState, contextFocusId, targetFactionId)
    if (!result.ok) {
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
      })
      appendWorldEvent({
        category: 'world_action',
        action: 'set_ai_context_focus',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        message: result.message,
        metadata: { factionId: targetFactionId, contextFocusId },
      })
      return failed
    }

    const relatedId = resolveAiContextRelatedId(result.world, targetFactionId, contextFocusId, teamContext)
    let entries = listCivilMemoryEntries({
      limit: 3,
      factionId: targetFactionId,
      relatedId,
    })
    if (entries.length === 0 && relatedId) {
      entries = listCivilMemoryEntries({
        limit: 3,
        factionId: targetFactionId,
      })
    }
    result.world.slgDomainState ??= {}
    result.world.slgDomainState.aiStateByFaction ??= {}
    const contextMemorySummary = {
      ...buildAiContextMemorySummary(entries, contextFocusId, result.world.tick),
      relatedId,
      ...(contextFocusId === 'focus_team'
        ? {
            teamId: teamContext.teamId,
            teamIndex: teamContext.teamIndex,
            teamName: teamContext.teamName,
            aiPlayerId: teamContext.aiPlayerId,
            ownerType: teamContext.ownerType,
            heroNames: teamContext.heroNames,
          }
        : {}),
    }
    const currentAiState = result.world.slgDomainState.aiStateByFaction[targetFactionId] ?? {}
    result.world.slgDomainState.aiStateByFaction[targetFactionId] = {
      ...currentAiState,
      contextFocusId,
      contextMemorySummary,
      updatedTick: result.world.tick,
      updatedWorldVersion: result.world.worldVersion,
    }
    if (contextFocusId === 'focus_team' && teamContext.aiPlayerId) {
      result.world.slgDomainState.aiStateByPlayerId ??= {}
      const currentAiPlayerState = result.world.slgDomainState.aiStateByPlayerId[teamContext.aiPlayerId] ?? {}
      result.world.slgDomainState.aiStateByPlayerId[teamContext.aiPlayerId] = {
        ...currentAiPlayerState,
        contextFocusId,
        contextMemorySummary,
        updatedTick: result.world.tick,
        updatedWorldVersion: result.world.worldVersion,
      }
    }

    commitWorldState(result.world)
    const response = {
      ...buildWorldActionResponse({
        ok: true,
        includeWorld,
        message: result.message,
        contextFocusId,
        relatedId,
      }),
      civilMemoryEntries: entries,
    }
    appendWorldEvent({
      category: 'world_action',
      action: 'set_ai_context_focus',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        contextFocusId,
        relatedId,
        teamId: contextFocusId === 'focus_team' ? teamContext.teamId : undefined,
        aiPlayerId: contextFocusId === 'focus_team' ? teamContext.aiPlayerId : undefined,
        results: entries.length,
      },
    })
    return response
  } finally {
    mutationLock.release()
  }
}

export function queueAiAgendaActionAction(
  agendaActionId: QueueAiAgendaActionParams['agendaActionId'],
  includeWorld = true,
  factionId?: FactionId,
): WorldActionResponse {
  const targetFactionId = factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('queue_ai_agenda_action')
  if (!mutationLock) {
    const failed = buildWorldMutationBusyResponse(includeWorld, targetFactionId)
    appendWorldEvent({
      category: 'world_action',
      action: 'queue_ai_agenda_action',
      success: false,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      message: failed.message,
      metadata: {
        factionId: targetFactionId,
        agendaActionId,
        failureCode: failed.failureCode,
        mutationHolder: getActiveWorldMutationHolder(),
        executionStatus: failed.execution?.status,
        activeOrderCount: failed.execution?.activeOrderCount,
        queuedOrderCount: failed.execution?.queuedOrderCount,
        runningOrderCount: failed.execution?.runningOrderCount,
        actionPointsRemaining: failed.execution?.actionPointsRemaining,
        foodRemaining: failed.execution?.foodRemaining,
        activeRequestId: failed.execution?.requestId,
      },
    })
    return failed
  }

  try {
    const result = queueAiAgendaAction(worldState, agendaActionId, targetFactionId)
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        execution,
      })
      appendWorldEvent({
        category: 'world_action',
        action: 'queue_ai_agenda_action',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          agendaActionId,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          queuedOrderCount: execution?.queuedOrderCount,
          runningOrderCount: execution?.runningOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
          activeRequestId: execution?.requestId,
        },
      })
      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId: result.requestId,
      execution,
    })
    appendWorldEvent({
      category: 'world_action',
      action: 'queue_ai_agenda_action',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        agendaActionId,
        requestId: result.requestId,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        queuedOrderCount: execution?.queuedOrderCount,
        runningOrderCount: execution?.runningOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
        basedOnWorldVersion: execution?.basedOnWorldVersion,
        reviewAtTick: execution?.reviewAtTick,
      },
    })
    return response
  } finally {
    mutationLock.release()
  }
}

export function deployReserveHeroAction(
  factionId: string,
  heroId: string,
  tileId: string,
  includeWorld = true,
  coHeroIds: string[] = [],
  aiPlayerId?: string,
  teamId?: string,
  teamIndex?: number,
): WorldActionResponse {
  const mutationLock = tryAcquireWorldMutationLock('deploy_reserve_hero')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld)
  }

  try {
    const result = deployReserveHero(worldState, factionId, heroId, tileId, coHeroIds)
    if (!result.ok) {
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'deploy_reserve_hero',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        message: result.message,
        metadata: { factionId, heroId, coHeroIds, tileId },
      })

      return failed
    }

    const normalizedAiPlayerId = String(aiPlayerId ?? '').trim()
    const normalizedTeamId = String(teamId ?? '').trim()
    const normalizedTeamIndex = Number.isFinite(teamIndex) && Number(teamIndex) > 0 ? Math.floor(Number(teamIndex)) : undefined
    const deployedUnit = result.world.units.find((unit) => unit.id === result.unitId)
    if (deployedUnit && normalizedTeamId) {
      deployedUnit.teamId = normalizedTeamId
    }
    if (deployedUnit && normalizedTeamIndex) {
      deployedUnit.teamIndex = normalizedTeamIndex
    }
    if (normalizedAiPlayerId) {
      assignDeployedReserveUnitToAiPlayer(result.world, factionId, result.unitId, normalizedAiPlayerId, {
        teamId: normalizedTeamId || undefined,
        teamIndex: normalizedTeamIndex,
      })
    }

    commitWorldState(result.world)

    const succeeded = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      unitId: result.unitId,
      heroId,
      heroIds: result.heroIds,
      heroNames: result.heroNames,
      aiPlayerId: normalizedAiPlayerId || undefined,
      teamId: normalizedTeamId || undefined,
      teamIndex: normalizedTeamIndex,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'deploy_reserve_hero',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      message: result.message,
      metadata: {
        factionId,
        heroId,
        coHeroIds: result.heroIds.slice(1),
        tileId,
        aiPlayerId: normalizedAiPlayerId || undefined,
        teamId: normalizedTeamId || undefined,
        teamIndex: normalizedTeamIndex,
      },
    })

    return succeeded
  } finally {
    mutationLock.release()
  }
}

export function configureDeployedUnitFormationAction(
  params: {
    factionId?: FactionId
    unitId?: string
    teamId?: string
    teamIndex?: number
    heroIds: string[]
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const normalizedHeroIds = params.heroIds.map((heroId) => String(heroId ?? '').trim()).slice(0, 3)
  const mutationLock = tryAcquireWorldMutationLock('configure_deployed_unit_formation')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    if (normalizedHeroIds.length !== 3) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        requestId,
        message: 'configure deployed unit formation requires exactly 3 slot ids.',
      })
    }
    const nextWorld = structuredClone(worldState) as WorldState
    const unit = nextWorld.units.find((candidate) => {
      if (candidate.faction !== targetFactionId) {
        return false
      }
      const unitId = String(params.unitId ?? '').trim()
      if (unitId !== '') {
        return candidate.id === unitId
      }
      const teamId = String(params.teamId ?? '').trim()
      if (teamId !== '' && candidate.teamId !== teamId) {
        return false
      }
      if (Number.isFinite(params.teamIndex) && Number(params.teamIndex) > 0 && candidate.teamIndex !== Math.floor(Number(params.teamIndex))) {
        return false
      }
      return true
    })
    const faction = nextWorld.factions[targetFactionId]
    if (!unit || !faction) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        requestId,
        message: 'configure deployed unit formation target missing.',
      })
    }

    const previousHeroIds = [unit.hero, ...(unit.coHeroes ?? [])]
      .map((hero) => normalizeHeroProfileId(hero.id))
      .filter((heroId) => heroId !== '')
    const nextHeroIds = normalizedHeroIds.filter((heroId) => heroId !== '')
    const duplicateHeroIds = nextHeroIds.filter((heroId, index) => nextHeroIds.indexOf(heroId) !== index)
    if (duplicateHeroIds.length > 0) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        requestId,
        message: 'configure deployed unit formation does not allow duplicate heroes.',
      })
    }

    const availableHeroIds = new Set([...faction.heroCommand.reserveHeroIds, ...previousHeroIds])
    const missingHeroId = nextHeroIds.find((heroId) => !availableHeroIds.has(heroId))
    if (missingHeroId) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        requestId,
        message: `hero ${missingHeroId} is not available for this formation.`,
      })
    }

    for (const previousHeroId of previousHeroIds) {
      if (!nextHeroIds.includes(previousHeroId) && !faction.heroCommand.reserveHeroIds.includes(previousHeroId)) {
        faction.heroCommand.reserveHeroIds.push(previousHeroId)
      }
    }
    faction.heroCommand.reserveHeroIds = faction.heroCommand.reserveHeroIds.filter((heroId) => !nextHeroIds.includes(heroId))

    const slotHeroes = normalizedHeroIds.map((heroId, index) => {
      if (heroId === '') {
        return buildEmptyTroopFormationSmokeHero(unit.hero, ['camp', 'mid', 'front'][index] ?? `slot_${index}`)
      }
      return buildHeroProfileFromPoolId(heroId, { growthFocus: 'formation_configure' })
    })
    unit.hero = slotHeroes[0]
    unit.coHeroes = [slotHeroes[1], slotHeroes[2]]
    unit.strength = nextHeroIds.length > 0 ? unit.strength : 0

    commitWorldState(nextWorld)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      requestId,
      message: 'configured deployed unit formation.',
      unitId: unit.id,
      teamId: unit.teamId,
      teamIndex: unit.teamIndex,
      heroIds: normalizedHeroIds,
    })
    appendWorldEvent({
      category: 'world_action',
      action: 'configure_deployed_unit_formation',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: response.message,
      metadata: {
        factionId: targetFactionId,
        unitId: unit.id,
        teamId: unit.teamId,
        teamIndex: unit.teamIndex,
        heroIds: normalizedHeroIds,
      },
    })
    return response
  } finally {
    mutationLock.release()
  }
}

function normalizeHeroProfileId(heroId: string): string {
  const normalized = String(heroId ?? '').trim()
  return normalized.startsWith('hero_') ? normalized.slice('hero_'.length) : normalized
}

export function queueTacticalOverrideAction(
  unitId: string,
  templateId: Parameters<typeof queueTacticalOverride>[2],
  targetTileId: string,
  summary: string,
  includeWorld = true,
  factionId?: FactionId,
): WorldActionResponse {
  const mutationLock = tryAcquireWorldMutationLock('queue_tactical_override')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld)
  }

  try {
    const targetFactionId = factionId ?? resolveDefaultFactionId()
    const nextWorld = queueTacticalOverride(worldState, unitId, templateId, targetTileId, summary, targetFactionId)
    if (nextWorld === worldState) {
      const message = `invalid tactical override target for faction ${targetFactionId}`
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message,
      })
      appendWorldEvent({
        category: 'world_action',
        action: 'queue_tactical_override',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        message,
        metadata: { unitId, templateId, targetTileId, factionId: targetFactionId },
      })
      return failed
    }

    commitWorldState(nextWorld)

    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'queue_tactical_override',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      metadata: { unitId, templateId, targetTileId, factionId: targetFactionId },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function updateAllianceDirectiveAction(
  regionId: string,
  stance: Parameters<typeof updateAllianceDirective>[2],
  includeWorld = true,
): WorldActionResponse {
  const mutationLock = tryAcquireWorldMutationLock('update_alliance_directive')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld)
  }

  try {
    commitWorldState(updateAllianceDirective(worldState, regionId, stance))

    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'update_alliance_directive',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      metadata: { regionId, stance },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function updateAllianceFrontlineMarkerAction(
  payload: {
    markerId: string
    factionId?: FactionId
    label: string
    fromCell: { x: number; y: number }
    toCell: { x: number; y: number }
    actorCommanderId?: string
    note?: string
    visibility?: 'alliance'
  },
  includeWorld = true,
  authorityContext?: WorldActionSessionAuthorityContext,
): WorldActionResponse {
  const mutationLock = tryAcquireWorldMutationLock('update_alliance_frontline_marker')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, payload.factionId)
  }

  try {
    const factionId = payload.factionId ?? resolveDefaultFactionId()
    if (!worldState.factions[factionId]) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: `Unsupported factionId: ${factionId}`,
      })
    }

    const markerId = payload.markerId.trim()
    const actorCommanderId = payload.actorCommanderId?.trim() ?? ''
    const actorCommander = actorCommanderId
      ? worldState.alliance.commanders.find((commander) => commander.id === actorCommanderId)
      : undefined
    if (!actorCommander) {
      const failureMessage = actorCommanderId
        ? `Alliance frontline marker requires a valid officer commander: ${actorCommanderId}`
        : 'Alliance frontline marker requires an officer commander.'
      appendWorldEvent({
        category: 'world_action',
        action: 'update_alliance_frontline_marker',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        message: failureMessage,
        metadata: {
          markerId,
          factionId,
          actorCommanderId: actorCommanderId || undefined,
          failureCode: 'alliance_frontline_marker_forbidden',
        },
      })
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: failureMessage,
        failureCode: 'alliance_frontline_marker_forbidden',
        relatedId: markerId || undefined,
      })
    }

    const authorityResolution = resolveAllianceOfficerAuthorityForSession(
      factionId,
      authorityContext,
      worldState,
      actorCommander.id,
      ALLIANCE_FRONTLINE_PERMISSION,
    )
    if (!authorityContext || authorityContext.factionId !== factionId || !authorityResolution) {
      const failureCode: WorldActionFailureCode = !authorityContext
        ? 'alliance_frontline_marker_session_required'
        : authorityContext.factionId !== factionId
          ? 'alliance_frontline_marker_session_faction_mismatch'
          : 'alliance_frontline_marker_forbidden'
      const sessionFactionId = authorityContext?.factionId ?? 'unknown'
      const failureMessage =
        failureCode === 'alliance_frontline_marker_session_required'
          ? 'Alliance frontline marker requires a player session token.'
          : failureCode === 'alliance_frontline_marker_session_faction_mismatch'
            ? `Alliance frontline marker session faction mismatch: ${sessionFactionId} cannot update ${factionId}.`
            : `Alliance frontline marker requires the session officer role for commander: ${actorCommander.id}.`
      appendWorldEvent({
        category: 'world_action',
        action: 'update_alliance_frontline_marker',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        message: failureMessage,
        metadata: {
          markerId,
          factionId,
          actorCommanderId: actorCommander.id,
          actorSessionId: authorityContext?.sessionId,
          actorSeatId: authorityContext?.seatId,
          actorPlayerName: authorityContext?.playerName,
          failureCode,
        },
      })
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: failureMessage,
        failureCode,
        relatedId: markerId || undefined,
      })
    }

    const now = new Date().toISOString()
    const nextWorld = structuredClone(worldState)
    const nextWorldVersion = nextWorld.worldVersion + 1
    nextWorld.worldVersion = nextWorldVersion
    nextWorld.alliance.frontlineMarkers = {
      ...(nextWorld.alliance.frontlineMarkers ?? {}),
      [markerId]: {
        id: markerId,
        factionId,
        label: payload.label.trim(),
        fromCell: {
          x: Math.floor(payload.fromCell.x),
          y: Math.floor(payload.fromCell.y),
        },
        toCell: {
          x: Math.floor(payload.toCell.x),
          y: Math.floor(payload.toCell.y),
        },
        note: payload.note?.trim() || undefined,
        visibility: payload.visibility ?? 'alliance',
        authoritySource: 'alliance_officer_main_world_marker',
        actorCommanderId: actorCommander.id,
        actorCommanderName: actorCommander.name,
        authorityRole: authorityResolution.grant.roleId,
        authorityGrantId: authorityResolution.grant.id,
        actorSessionId: authorityContext.sessionId,
        actorSessionIdType: 'player_session',
        actorPlayerName: authorityContext.playerName,
        actorSeatId: authorityContext.seatId,
        updatedAt: now,
        updatedWorldVersion: nextWorldVersion,
      },
    }

    commitWorldState(nextWorld)

    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: 'Alliance frontline marker updated.',
      relatedId: markerId,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'update_alliance_frontline_marker',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      message: 'Alliance frontline marker updated.',
      metadata: {
        markerId,
        factionId,
        actorCommanderId: actorCommander.id,
        actorCommanderName: actorCommander.name,
        authorityRole: authorityResolution.grant.roleId,
        authorityGrantId: authorityResolution.grant.id,
        actorSessionId: authorityContext.sessionId,
        actorPlayerName: authorityContext.playerName,
        actorSeatId: authorityContext.seatId,
        visibility: payload.visibility ?? 'alliance',
        ...buildOrganizationNationOfficerRoleHistoryOverlay({
          organizationId: factionId,
          organizationName: resolveOrganizationDisplayName(factionId, factionId),
          markerId,
          markerLabel: payload.label,
          roleLabel: authorityResolution.grant.roleLabel,
          requiredOfficerRole: authorityResolution.grant.roleId,
          actorCommanderName: actorCommander.name,
          note: payload.note,
        }),
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function resolveAllianceOfficerAuthorityForSession(
  factionId: FactionId,
  authorityContext: WorldActionSessionAuthorityContext | undefined,
  world: Readonly<WorldState>,
  actorCommanderId: string,
  requiredPermission: AllianceOfficerPermission,
): AllianceOfficerAuthorityResolution | undefined {
  if (!authorityContext || authorityContext.factionId !== factionId) {
    return undefined
  }
  const normalizedPlayerName = authorityContext.playerName.trim()
  if (!normalizedPlayerName) {
    return undefined
  }
  const commander = world.alliance.commanders.find((candidate) => candidate.id === actorCommanderId)
  if (!commander) {
    return undefined
  }
  const grants = Object.values(world.alliance.officerAuthority?.grants ?? {})
  const grant = grants.find((candidate) =>
    candidate.status === 'active' &&
    candidate.factionId === factionId &&
    candidate.commanderId === actorCommanderId &&
    candidate.principalPlayerName.trim() === normalizedPlayerName &&
    candidate.permissions.includes(requiredPermission),
  )
  if (!grant) {
    return undefined
  }
  return { grant, commander }
}

export function allianceHelpAction(
  regionId: string,
  includeWorld = true,
  factionId?: FactionId,
): WorldActionResponse {
  const requestId = randomUUID()
  const mutationLock = tryAcquireWorldMutationLock('alliance_help')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, factionId, requestId)
  }

  try {
    const targetFactionId = factionId ?? resolveDefaultFactionId()
    const result = allianceHelp(worldState, regionId, targetFactionId)
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: regionId,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'alliance_help',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          regionId,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: regionId,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'alliance_help',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        regionId,
        commanderId: result.commanderId,
        supportLevel: result.supportLevel,
        commanderReadiness: result.commanderReadiness,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function rewardClaimAction(
  rewardId: string | undefined,
  includeWorld = true,
  factionId?: FactionId,
): WorldActionResponse {
  const requestId = randomUUID()
  const mutationLock = tryAcquireWorldMutationLock('reward_claim')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, factionId, requestId)
  }

  try {
    const targetFactionId = factionId ?? resolveDefaultFactionId()
    const result = claimReward(worldState, rewardId, targetFactionId)
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: rewardId,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'reward_claim',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          rewardId,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.rewardId,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'reward_claim',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        rewardId: result.rewardId,
        source: result.source,
        foodReward: result.foodReward,
        actionPointReward: result.actionPointReward,
        pendingRewardCount: result.pendingRewardCount,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function achieveWorldAffairsNodeAction(
  params: {
    factionId?: FactionId
    scenarioId: string
    scenarioVersion: string
    seasonRunId?: string
    nodeId: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('achieve_world_affairs_node')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = achieveWorldAffairsNode(worldState, {
      ...params,
      factionId: targetFactionId,
    })
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: params.nodeId,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'achieve_world_affairs_node',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          scenarioId: params.scenarioId,
          scenarioVersion: params.scenarioVersion,
          seasonRunId: params.seasonRunId,
          nodeId: params.nodeId,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, result.factionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.nodeId,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'achieve_world_affairs_node',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: result.factionId,
        scenarioId: result.scenarioId,
        scenarioVersion: result.scenarioVersion,
        seasonRunId: result.seasonRunId,
        nodeId: result.nodeId,
        nodeTitle: result.nodeTitle,
        activeNodeId: result.activeNodeId,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function claimWorldAffairsNodeRewardAction(
  params: {
    factionId?: FactionId
    scenarioId: string
    scenarioVersion: string
    seasonRunId?: string
    nodeId: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('claim_world_affairs_node_reward')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = claimWorldAffairsNodeReward(worldState, {
      ...params,
      factionId: targetFactionId,
    })
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: params.nodeId,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'claim_world_affairs_node_reward',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          scenarioId: params.scenarioId,
          scenarioVersion: params.scenarioVersion,
          seasonRunId: params.seasonRunId,
          nodeId: params.nodeId,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, result.factionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.nodeId,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'claim_world_affairs_node_reward',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: result.factionId,
        scenarioId: result.scenarioId,
        scenarioVersion: result.scenarioVersion,
        seasonRunId: result.seasonRunId,
        nodeId: result.nodeId,
        nodeTitle: result.nodeTitle,
        rewardTotals: result.rewardTotals,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function achieveTaskPrototypeAction(
  params: {
    factionId?: FactionId
    scenarioId: string
    scenarioVersion: string
    seasonRunId?: string
    taskId: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('achieve_task_prototype')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = achieveTaskPrototype(worldState, {
      ...params,
      factionId: targetFactionId,
    })
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: params.taskId,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'achieve_task_prototype',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          scenarioId: params.scenarioId,
          scenarioVersion: params.scenarioVersion,
          seasonRunId: params.seasonRunId,
          taskId: params.taskId,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, result.factionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.taskId,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'achieve_task_prototype',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: result.factionId,
        scenarioId: result.scenarioId,
        scenarioVersion: result.scenarioVersion,
        seasonRunId: result.seasonRunId,
        taskId: result.taskId,
        taskTitle: result.taskTitle,
        activeTaskId: result.activeTaskId,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function recordWorldTaskEventAction(
  params: {
    factionId?: FactionId
    scenarioId: string
    scenarioVersion: string
    seasonRunId?: string
    taskId: string
    kind: TaskRealAuthoritySignalKind
    source?: WorldTaskEventSource
    sourceId?: string
    summary?: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('record_world_task_event')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = recordWorldTaskEvent(worldState, {
      ...params,
      factionId: targetFactionId,
    })
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: params.taskId,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'record_world_task_event',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          scenarioId: params.scenarioId,
          scenarioVersion: params.scenarioVersion,
          seasonRunId: params.seasonRunId,
          taskId: params.taskId,
          kind: params.kind,
          source: params.source,
          sourceId: params.sourceId,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, result.factionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.taskId,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'record_world_task_event',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: result.factionId,
        scenarioId: result.scenarioId,
        scenarioVersion: result.scenarioVersion,
        seasonRunId: result.seasonRunId,
        taskId: result.taskId,
        taskTitle: result.taskTitle,
        eventId: result.event.eventId,
        kind: result.event.kind,
        source: result.event.source,
        sourceId: result.event.sourceId,
        reused: result.reused,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function claimTaskRewardAction(
  params: {
    factionId?: FactionId
    scenarioId: string
    scenarioVersion: string
    seasonRunId?: string
    taskId: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('claim_task_reward')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = claimTaskReward(worldState, {
      ...params,
      factionId: targetFactionId,
    })
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: params.taskId,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'claim_task_reward',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          scenarioId: params.scenarioId,
          scenarioVersion: params.scenarioVersion,
          seasonRunId: params.seasonRunId,
          taskId: params.taskId,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, result.factionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.taskId,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'claim_task_reward',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: result.factionId,
        scenarioId: result.scenarioId,
        scenarioVersion: result.scenarioVersion,
        seasonRunId: result.seasonRunId,
        taskId: result.taskId,
        taskTitle: result.taskTitle,
        rewardTotals: result.rewardTotals,
        chapterRewardTotals: result.chapterRewardTotals,
        completedChapterId: result.completedChapterId,
        completedChapterTitle: result.completedChapterTitle,
        activeChapterId: result.activeChapterId,
        activeTaskId: result.activeTaskId,
        advancedToNextChapter: result.advancedToNextChapter,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function issueClaimableRewardAction(
  params: {
    factionId?: FactionId
    rewardId?: string
    ledgerKey?: string
    source: 'daily_welfare' | 'event_reward'
    label?: string
    summary?: string
    reward: {
      food: number
      ap: number
    }
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const mutationLock = tryAcquireWorldMutationLock('issue_claimable_reward')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, params.factionId, requestId)
  }

  try {
    const targetFactionId = params.factionId ?? resolveDefaultFactionId()
    const result = issueClaimableReward(worldState, {
      ...params,
      factionId: targetFactionId,
    })
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: params.rewardId,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'issue_claimable_reward',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          rewardId: params.rewardId,
          ledgerKey: params.ledgerKey,
          source: params.source,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, result.factionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.rewardId,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'issue_claimable_reward',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: result.factionId,
        rewardId: result.rewardId,
        ledgerKey: result.ledgerKey,
        source: result.source,
        pendingRewardCount: result.pendingRewardCount,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function transferFactionResourcesToGovernorAction(
  params: {
    sourceFactionId: string
    sourceAiPlayerId: string
    governorPlayerId: string
    resources: {
      food?: number
      wood?: number
      stone?: number
      iron?: number
    }
    reason: string
    approvedBy: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const mutationLock = tryAcquireWorldMutationLock('transfer_faction_resources_to_governor')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, params.sourceFactionId, requestId)
  }

  try {
    const result = transferFactionResourcesToGovernor(worldState, params)
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, params.sourceFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: params.sourceAiPlayerId,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'transfer_faction_resources_to_governor',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          sourceFactionId: params.sourceFactionId,
          sourceAiPlayerId: params.sourceAiPlayerId,
          governorPlayerId: params.governorPlayerId,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, params.sourceFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.transferId,
      receipt: {
        action: 'transferFactionResourcesToGovernor',
        factionId: params.sourceFactionId as FactionId,
        aiPlayerId: result.sourceAiPlayerId,
        governorPlayerId: result.governorPlayerId,
        resources: {
          food: result.resources.food,
          wood: result.resources.wood,
          stone: result.resources.stone,
          iron: result.resources.iron,
        },
      },
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'transfer_faction_resources_to_governor',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        sourceFactionId: params.sourceFactionId,
        sourceAiPlayerId: result.sourceAiPlayerId,
        governorPlayerId: result.governorPlayerId,
        transferId: result.transferId,
        resources: result.resources,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function openSeaRouteAction(
  params: {
    factionId?: FactionId
    sourceDockId: string
    overseasContactId: string
    actorAiPlayerId?: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('open_sea_route')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = openSeaRoute(worldState, {
      factionId: targetFactionId,
      sourceDockId: params.sourceDockId,
      overseasContactId: params.overseasContactId,
      actorAiPlayerId: params.actorAiPlayerId,
    })
    const route = result.route
    const routeStatus = result.routeStatus
    const receipt: WorldActionReceipt = {
      action: 'openSeaRoute',
      factionId: targetFactionId,
      routeId: route?.id ?? routeStatus?.routeId,
      routeStatus: routeStatus?.status,
      blockedReason: routeStatus?.blockedReason ?? null,
      travelCost: routeStatus?.travelCost ?? route?.travelCost,
      sourceDockId: params.sourceDockId,
      overseasContactId: params.overseasContactId,
      failureCode: result.ok ? undefined : result.failureCode,
      resourcesSpent: result.ok ? route?.travelCost : undefined,
    }

    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: receipt.routeId,
        receipt,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'open_sea_route',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          sourceDockId: params.sourceDockId,
          overseasContactId: params.overseasContactId,
          actorAiPlayerId: params.actorAiPlayerId,
          routeId: receipt.routeId,
          routeStatus: receipt.routeStatus,
          blockedReason: receipt.blockedReason,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.route.id,
      receipt,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'open_sea_route',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        sourceDockId: result.route.source.id,
        overseasContactId: result.route.destination.id,
        actorAiPlayerId: params.actorAiPlayerId,
        routeId: result.route.id,
        routeStatus: result.routeStatus.status,
        travelCost: result.route.travelCost,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function seaPatrolScoutAction(
  params: {
    factionId?: FactionId
    routeId: string
    sourceDockId: string
    overseasContactId: string
    actorAiPlayerId?: string
    inventoryFleetId?: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('sea_patrol_scout')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = seaPatrolScout(worldState, {
      factionId: targetFactionId,
      routeId: params.routeId,
      sourceDockId: params.sourceDockId,
      overseasContactId: params.overseasContactId,
      actorAiPlayerId: params.actorAiPlayerId,
      inventoryFleetId: params.inventoryFleetId,
    })
    const route = result.route
    const routeStatus = result.routeStatus
    const receipt: WorldActionReceipt = {
      action: 'seaPatrolScout',
      factionId: targetFactionId,
      routeId: route?.id ?? params.routeId,
      routeStatus: routeStatus?.status,
      blockedReason: routeStatus?.blockedReason ?? null,
      sourceDockId: params.sourceDockId,
      overseasContactId: params.overseasContactId,
      failureCode: result.ok ? undefined : result.failureCode,
      patrolReportId: result.ok ? result.patrolReportId : undefined,
      patrolKind: result.ok ? result.patrolKind : undefined,
      patrolStatus: result.ok ? result.patrolStatus : undefined,
      maritimeActivityChipId: result.ok ? result.maritimeActivityChipId : undefined,
      maritimeReportResultChipId: result.ok ? result.maritimeReportResultChipId : undefined,
      navalBattleScope: result.ok ? result.navalBattleScope : undefined,
      regionTokenId: result.ok ? result.regionTokenId : undefined,
      actorAiPlayerId: params.actorAiPlayerId,
      resourcesSpent: result.ok ? result.resourcesSpent : undefined,
      inventoryFleetId: params.inventoryFleetId,
      reusedFleetId: result.ok ? result.reusedFleetId : undefined,
      sourceShipyardOrderId: result.ok ? result.sourceShipyardOrderId : undefined,
      harborId: result.ok ? result.harborId : undefined,
      reuseStatus: result.ok ? result.reuseStatus : undefined,
      worldNavalReuseUsesExistingSeaRuntime: result.ok ? result.worldNavalReuseUsesExistingSeaRuntime : undefined,
      worldNavalReuseDoesNotUseUnitMarker: result.ok ? result.worldNavalReuseDoesNotUseUnitMarker : undefined,
      worldNavalReuseScope: result.ok ? result.worldNavalReuseScope : undefined,
    }

    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: receipt.routeId,
        receipt,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'sea_patrol_scout',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          routeId: params.routeId,
          sourceDockId: params.sourceDockId,
          overseasContactId: params.overseasContactId,
          actorAiPlayerId: params.actorAiPlayerId,
          inventoryFleetId: params.inventoryFleetId,
          routeStatus: receipt.routeStatus,
          blockedReason: receipt.blockedReason,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.patrolReportId,
      receipt,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'sea_patrol_scout',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        routeId: result.route.id,
        sourceDockId: result.route.source.id,
        overseasContactId: result.route.destination.id,
        actorAiPlayerId: params.actorAiPlayerId,
        inventoryFleetId: params.inventoryFleetId,
        reusedFleetId: result.reusedFleetId,
        sourceShipyardOrderId: result.sourceShipyardOrderId,
        reuseStatus: result.reuseStatus,
        routeStatus: result.routeStatus.status,
        patrolReportId: result.patrolReportId,
        patrolKind: result.patrolKind,
        patrolStatus: result.patrolStatus,
        maritimeActivityChipId: result.maritimeActivityChipId,
        maritimeReportResultChipId: result.maritimeReportResultChipId,
        navalBattleScope: result.navalBattleScope,
        regionTokenId: result.regionTokenId,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function seaPatrolInterceptAction(
  params: {
    factionId?: FactionId
    routeId: string
    sourceDockId: string
    overseasContactId: string
    attackerVesselType: string
    defenderVesselType: string
    actorAiPlayerId?: string
    inventoryFleetId?: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('sea_patrol_intercept')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = seaPatrolIntercept(worldState, {
      factionId: targetFactionId,
      routeId: params.routeId,
      sourceDockId: params.sourceDockId,
      overseasContactId: params.overseasContactId,
      attackerVesselType: params.attackerVesselType,
      defenderVesselType: params.defenderVesselType,
      actorAiPlayerId: params.actorAiPlayerId,
      inventoryFleetId: params.inventoryFleetId,
    })
    const route = result.route
    const routeStatus = result.routeStatus
    const receipt: WorldActionReceipt = {
      action: 'seaPatrolIntercept',
      factionId: targetFactionId,
      routeId: route?.id ?? params.routeId,
      routeStatus: routeStatus?.status,
      blockedReason: routeStatus?.blockedReason ?? null,
      sourceDockId: params.sourceDockId,
      overseasContactId: params.overseasContactId,
      failureCode: result.ok ? undefined : result.failureCode,
      interceptReportId: result.ok ? result.interceptReportId : undefined,
      maritimeReportResultChipId: result.ok ? result.maritimeReportResultChipId : undefined,
      navalBattleScope: result.ok ? result.navalBattleScope : undefined,
      battleReportSurface: result.ok ? result.battleReportSurface : undefined,
      attackerVesselType: result.ok ? result.attackerVesselType : undefined,
      defenderVesselType: result.ok ? result.defenderVesselType : undefined,
      attackerCarriedUnitCapacity: result.ok ? result.attackerVesselRule.carriedUnitCapacity : undefined,
      defenderCarriedUnitCapacity: result.ok ? result.defenderVesselRule.carriedUnitCapacity : undefined,
      attackerCombatBonusPercent: result.ok ? result.attackerVesselRule.combatBonusPercent : undefined,
      defenderCombatBonusPercent: result.ok ? result.defenderVesselRule.combatBonusPercent : undefined,
      interceptOutcome: result.ok ? result.interceptOutcome : undefined,
      actorAiPlayerId: params.actorAiPlayerId,
      resourcesSpent: result.ok ? result.resourcesSpent : undefined,
      inventoryFleetId: params.inventoryFleetId,
      reusedFleetId: result.ok ? result.reusedFleetId : undefined,
      sourceShipyardOrderId: result.ok ? result.sourceShipyardOrderId : undefined,
      harborId: result.ok ? result.harborId : undefined,
      reuseStatus: result.ok ? result.reuseStatus : undefined,
      worldNavalReuseUsesExistingSeaRuntime: result.ok ? result.worldNavalReuseUsesExistingSeaRuntime : undefined,
      worldNavalReuseDoesNotUseUnitMarker: result.ok ? result.worldNavalReuseDoesNotUseUnitMarker : undefined,
      worldNavalReuseScope: result.ok ? result.worldNavalReuseScope : undefined,
    }

    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: receipt.routeId,
        receipt,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'sea_patrol_intercept',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          routeId: params.routeId,
          sourceDockId: params.sourceDockId,
          overseasContactId: params.overseasContactId,
          attackerVesselType: params.attackerVesselType,
          defenderVesselType: params.defenderVesselType,
          actorAiPlayerId: params.actorAiPlayerId,
          inventoryFleetId: params.inventoryFleetId,
          routeStatus: receipt.routeStatus,
          blockedReason: receipt.blockedReason,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.interceptReportId,
      receipt,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'sea_patrol_intercept',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        routeId: result.route.id,
        sourceDockId: result.route.source.id,
        overseasContactId: result.route.destination.id,
        attackerVesselType: result.attackerVesselType,
        defenderVesselType: result.defenderVesselType,
        attackerCarriedUnitCapacity: result.attackerVesselRule.carriedUnitCapacity,
        defenderCarriedUnitCapacity: result.defenderVesselRule.carriedUnitCapacity,
        attackerCombatBonusPercent: result.attackerVesselRule.combatBonusPercent,
        defenderCombatBonusPercent: result.defenderVesselRule.combatBonusPercent,
        interceptOutcome: result.interceptOutcome,
        actorAiPlayerId: params.actorAiPlayerId,
        inventoryFleetId: params.inventoryFleetId,
        reusedFleetId: result.reusedFleetId,
        sourceShipyardOrderId: result.sourceShipyardOrderId,
        reuseStatus: result.reuseStatus,
        routeStatus: result.routeStatus.status,
        interceptReportId: result.interceptReportId,
        maritimeReportResultChipId: result.maritimeReportResultChipId,
        navalBattleScope: result.navalBattleScope,
        battleReportSurface: result.battleReportSurface,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function createNavalFleetAction(
  params: {
    factionId?: FactionId
    routeId: string
    sourceDockId: string
    overseasContactId: string
    vesselType: string
    carriedUnitIds?: string[]
    actorAiPlayerId?: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('create_naval_fleet')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = createNavalFleet(worldState, {
      factionId: targetFactionId,
      routeId: params.routeId,
      sourceDockId: params.sourceDockId,
      overseasContactId: params.overseasContactId,
      vesselType: params.vesselType,
      carriedUnitIds: params.carriedUnitIds,
      actorAiPlayerId: params.actorAiPlayerId,
    })
    const route = result.route
    const routeStatus = result.routeStatus
    const receipt: WorldActionReceipt = {
      action: 'createNavalFleet',
      factionId: targetFactionId,
      routeId: route?.id ?? params.routeId,
      routeStatus: routeStatus?.status,
      blockedReason: routeStatus?.blockedReason ?? null,
      sourceDockId: params.sourceDockId,
      overseasContactId: params.overseasContactId,
      failureCode: result.ok ? undefined : result.failureCode,
      fleetId: result.ok ? result.fleetId : undefined,
      fleetRuntimeStatus: result.ok ? result.fleetRuntimeStatus : undefined,
      attackerVesselType: result.ok ? result.vesselType : undefined,
      fleetFrameSlotId: result.ok ? result.vesselRule.assetSlotId : undefined,
      fleetCarriedUnitCapacity: result.ok ? result.vesselRule.carriedUnitCapacity : undefined,
      fleetCarriedUnitIds: result.ok ? result.carriedUnitIds : undefined,
      fleetCombatBonusPercent: result.ok ? result.vesselRule.combatBonusPercent : undefined,
      navalRuntimeAdapterStatus: result.ok ? result.runtimeAdapterStatus : undefined,
      fleetMovementRuntimeStatus: result.ok ? result.movementRuntimeStatus : undefined,
      fleetDoesNotUseUnitMarker: result.ok ? result.doesNotUseUnitMarker : undefined,
      actorAiPlayerId: params.actorAiPlayerId,
    }

    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: receipt.routeId,
        receipt,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'create_naval_fleet',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          routeId: params.routeId,
          sourceDockId: params.sourceDockId,
          overseasContactId: params.overseasContactId,
          vesselType: params.vesselType,
          failureCode: result.failureCode,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.fleetId,
      receipt,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'create_naval_fleet',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        routeId: result.route.id,
        fleetId: result.fleetId,
        vesselType: result.vesselType,
        frameSlotId: result.vesselRule.assetSlotId,
        runtimeAdapterStatus: result.runtimeAdapterStatus,
        movementRuntimeStatus: result.movementRuntimeStatus,
        doesNotUseUnitMarker: result.doesNotUseUnitMarker,
        executionStatus: execution?.status,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function sailNavalRouteAction(
  params: {
    factionId?: FactionId
    fleetId: string
    routeId: string
    actorAiPlayerId?: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('sail_naval_route')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = sailNavalRoute(worldState, {
      factionId: targetFactionId,
      fleetId: params.fleetId,
      routeId: params.routeId,
      actorAiPlayerId: params.actorAiPlayerId,
    })
    const route = result.route
    const routeStatus = result.routeStatus
    const receipt: WorldActionReceipt = {
      action: 'sailNavalRoute',
      factionId: targetFactionId,
      routeId: route?.id ?? params.routeId,
      routeStatus: routeStatus?.status,
      blockedReason: routeStatus?.blockedReason ?? null,
      failureCode: result.ok ? undefined : result.failureCode,
      fleetId: params.fleetId,
      fleetRuntimeStatus: result.ok ? result.fleetRuntimeStatus : undefined,
      attackerVesselType: result.ok ? result.vesselType : undefined,
      fleetFrameSlotId: result.ok ? result.vesselRule.assetSlotId : undefined,
      fleetCarriedUnitCapacity: result.ok ? result.vesselRule.carriedUnitCapacity : undefined,
      fleetCarriedUnitIds: result.ok ? result.carriedUnitIds : undefined,
      fleetCombatBonusPercent: result.ok ? result.vesselRule.combatBonusPercent : undefined,
      fleetRouteLineStatus: result.ok ? result.routeLineStatus : undefined,
      fleetProgressPercent: result.ok ? result.progressPercent : undefined,
      navalRuntimeAdapterStatus: result.ok ? result.runtimeAdapterStatus : undefined,
      fleetMovementRuntimeStatus: result.ok ? result.movementRuntimeStatus : undefined,
      fleetDoesNotUseUnitMarker: result.ok ? result.doesNotUseUnitMarker : undefined,
      actorAiPlayerId: params.actorAiPlayerId,
    }

    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: receipt.fleetId,
        receipt,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'sail_naval_route',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          routeId: params.routeId,
          fleetId: params.fleetId,
          failureCode: result.failureCode,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.fleetId,
      receipt,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'sail_naval_route',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        routeId: result.route.id,
        fleetId: result.fleetId,
        vesselType: result.vesselType,
        frameSlotId: result.vesselRule.assetSlotId,
        routeLineStatus: result.routeLineStatus,
        progressPercent: result.progressPercent,
        runtimeAdapterStatus: result.runtimeAdapterStatus,
        movementRuntimeStatus: result.movementRuntimeStatus,
        doesNotUseUnitMarker: result.doesNotUseUnitMarker,
        executionStatus: execution?.status,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function resolveNavalCombatSettlementAction(
  params: {
    factionId?: FactionId
    routeId: string
    attackerFleetId: string
    defenderFleetId: string
    actorAiPlayerId?: string
    inventoryFleetId?: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('resolve_naval_combat_settlement')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = resolveNavalCombatSettlement(worldState, {
      factionId: targetFactionId,
      routeId: params.routeId,
      attackerFleetId: params.attackerFleetId,
      defenderFleetId: params.defenderFleetId,
      actorAiPlayerId: params.actorAiPlayerId,
      inventoryFleetId: params.inventoryFleetId,
    })
    const route = result.route
    const routeStatus = result.routeStatus
    const receipt: WorldActionReceipt = {
      action: 'resolveNavalCombatSettlement',
      factionId: targetFactionId,
      routeId: route?.id ?? params.routeId,
      routeStatus: routeStatus?.status,
      blockedReason: routeStatus?.blockedReason ?? null,
      failureCode: result.ok ? undefined : result.failureCode,
      navalCombatSettlementId: result.ok ? result.navalCombatSettlementId : undefined,
      battleReportId: result.ok ? result.battleReportId : undefined,
      attackerFleetId: params.attackerFleetId,
      defenderFleetId: params.defenderFleetId,
      attackerVesselType: result.ok ? result.attackerVesselType : undefined,
      defenderVesselType: result.ok ? result.defenderVesselType : undefined,
      attackerFleetFrameSlotId: result.ok ? result.attackerFrameSlotId : undefined,
      defenderFleetFrameSlotId: result.ok ? result.defenderFrameSlotId : undefined,
      fleetFrameSlotId: result.ok ? result.attackerFrameSlotId : undefined,
      attackerCarriedUnitCapacity: result.ok ? result.attackerVesselRule.carriedUnitCapacity : undefined,
      defenderCarriedUnitCapacity: result.ok ? result.defenderVesselRule.carriedUnitCapacity : undefined,
      attackerCombatBonusPercent: result.ok ? result.attackerVesselRule.combatBonusPercent : undefined,
      defenderCombatBonusPercent: result.ok ? result.defenderVesselRule.combatBonusPercent : undefined,
      navalCombatOutcome: result.ok ? result.outcome : undefined,
      navalCombatWinnerFleetId: result.ok ? result.winnerFleetId : undefined,
      navalCombatLoserFleetId: result.ok ? result.loserFleetId : undefined,
      navalCombatDamageSummary: result.ok ? result.damageSummary : undefined,
      navalCombatLossSummary: result.ok ? result.lossSummary : undefined,
      damagedFleetId: result.ok ? result.damagedFleetId : undefined,
      damagedFleetDamageState: result.ok ? result.damagedFleetDamageState : undefined,
      damagedFleetRepairStatus: result.ok ? result.damagedFleetRepairStatus : undefined,
      inventoryFleetId: result.ok ? result.inventoryFleetId : params.inventoryFleetId,
      reusedFleetId: result.ok ? result.reusedFleetId : undefined,
      sourceShipyardOrderId: result.ok ? result.sourceShipyardOrderId : undefined,
      fleetDamageState: result.ok ? result.fleetDamageState : undefined,
      damagedFleetDamageSummary: result.ok ? result.damageSummary : undefined,
      damagedFleetLossSummary: result.ok ? result.lossSummary : undefined,
      damagePersistsAfterSettlement: result.ok ? true : undefined,
      battleReportSurface: result.ok ? result.battleReportSurface : undefined,
      maritimeReportResultChipId: result.ok ? result.maritimeReportResultChipId : undefined,
      navalBattleScope: result.ok ? result.navalBattleScope : undefined,
      navalCombatUsesExistingBattleReport: result.ok ? true : undefined,
      navalCombatDoesNotUseUnitMarker: result.ok ? result.doesNotUseUnitMarker : undefined,
      worldNavalCombatUsesInventoryFleet: result.ok ? result.worldNavalCombatUsesInventoryFleet : undefined,
      worldNavalCombatUsesExistingSeaRuntime: result.ok ? result.worldNavalCombatUsesExistingSeaRuntime : undefined,
      worldNavalCombatDoesNotUseUnitMarker: result.ok ? result.worldNavalCombatDoesNotUseUnitMarker : undefined,
      worldNavalCombatDamageRepairScope: result.ok ? result.worldNavalCombatDamageRepairScope : undefined,
      actorAiPlayerId: params.actorAiPlayerId,
    }

    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: receipt.routeId,
        receipt,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'resolve_naval_combat_settlement',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          routeId: params.routeId,
          attackerFleetId: params.attackerFleetId,
          defenderFleetId: params.defenderFleetId,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.battleReportId,
      receipt,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'resolve_naval_combat_settlement',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        routeId: result.route.id,
        navalCombatSettlementId: result.navalCombatSettlementId,
        battleReportId: result.battleReportId,
        attackerFleetId: result.attackerFleetId,
        defenderFleetId: result.defenderFleetId,
        inventoryFleetId: result.inventoryFleetId,
        reusedFleetId: result.reusedFleetId,
        sourceShipyardOrderId: result.sourceShipyardOrderId,
        attackerVesselType: result.attackerVesselType,
        defenderVesselType: result.defenderVesselType,
        outcome: result.outcome,
        battleReportSurface: result.battleReportSurface,
        navalBattleScope: result.navalBattleScope,
        damagedFleetId: result.damagedFleetId,
        damagedFleetDamageState: result.damagedFleetDamageState,
        damagedFleetRepairStatus: result.damagedFleetRepairStatus,
        executionStatus: execution?.status,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function repairNavalFleetDamageAction(
  params: {
    factionId?: FactionId
    fleetId: string
    routeId: string
    actorAiPlayerId?: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('repair_naval_fleet_damage')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = repairNavalFleetDamage(worldState, {
      factionId: targetFactionId,
      fleetId: params.fleetId,
      routeId: params.routeId,
      actorAiPlayerId: params.actorAiPlayerId,
    })
    const route = result.route
    const routeStatus = result.routeStatus
    const receipt: WorldActionReceipt = {
      action: 'repairNavalFleetDamage',
      factionId: targetFactionId,
      routeId: route?.id ?? params.routeId,
      routeStatus: routeStatus?.status,
      blockedReason: routeStatus?.blockedReason ?? null,
      failureCode: result.ok ? undefined : result.failureCode,
      fleetId: params.fleetId,
      damagedFleetId: params.fleetId,
      damagedFleetDamageState: result.ok ? result.damageState : undefined,
      damagedFleetRepairStatus: result.ok ? result.repairStatus : undefined,
      damagedFleetDamageSummary: result.ok ? result.damageSummary : undefined,
      damagedFleetLossSummary: result.ok ? result.lossSummary : undefined,
      repairReportId: result.ok ? result.repairReportId : undefined,
      returnHarborRepairId: result.ok ? result.repairReportId : undefined,
      repairStatus: result.ok ? 'recorded' : undefined,
      repairFeedbackVisibleCopy: result.ok ? result.repairFeedbackVisibleCopy : undefined,
      repairScope: result.ok ? result.repairScope : undefined,
      repairActionStatus: result.ok ? result.repairStatus : undefined,
      attackerVesselType: result.ok ? result.vesselType : undefined,
      fleetFrameSlotId: result.ok ? result.vesselRule.assetSlotId : undefined,
      fleetMovementRuntimeStatus: result.ok ? result.movementRuntimeStatus : undefined,
      fleetDoesNotUseUnitMarker: result.ok ? result.doesNotUseUnitMarker : undefined,
      battleReportSurface: result.ok ? 'battle_report_panel/list/detail' : undefined,
      actorAiPlayerId: params.actorAiPlayerId,
    }

    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: receipt.fleetId,
        receipt,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'repair_naval_fleet_damage',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          routeId: params.routeId,
          fleetId: params.fleetId,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.fleetId,
      receipt,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'repair_naval_fleet_damage',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        routeId: result.route.id,
        fleetId: result.fleetId,
        damageState: result.damageState,
        repairStatus: result.repairStatus,
        repairReportId: result.repairReportId,
        repairScope: result.repairScope,
        executionStatus: execution?.status,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function buildNavalWarshipAtHarborAction(
  params: {
    factionId?: FactionId
    routeId: string
    sourceDockId: string
    overseasContactId: string
    shipClass: string
    actorAiPlayerId?: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('build_naval_warship_at_harbor')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = buildNavalWarshipAtHarbor(worldState, {
      factionId: targetFactionId,
      routeId: params.routeId,
      sourceDockId: params.sourceDockId,
      overseasContactId: params.overseasContactId,
      shipClass: params.shipClass,
      actorAiPlayerId: params.actorAiPlayerId,
    })
    const route = result.route
    const routeStatus = result.routeStatus
    const receipt: WorldActionReceipt = {
      action: 'buildNavalWarshipAtHarbor',
      factionId: targetFactionId,
      routeId: route?.id ?? params.routeId,
      sourceDockId: params.sourceDockId,
      overseasContactId: params.overseasContactId,
      routeStatus: routeStatus?.status,
      blockedReason: routeStatus?.blockedReason ?? null,
      failureCode: result.ok ? undefined : result.failureCode,
      harborId: result.ok ? result.harborId : params.sourceDockId,
      shipyardOrderId: result.ok ? result.shipyardOrderId : undefined,
      shipClass: result.ok ? result.shipClass : undefined,
      buildStatus: result.ok ? result.buildStatus : undefined,
      inventoryFleetId: result.ok ? result.inventoryFleetId : undefined,
      fleetId: result.ok ? result.fleetId : undefined,
      fleetFrameSlotId: result.ok ? result.vesselRule.assetSlotId : undefined,
      addedShipCount: result.ok ? result.addedShipCount : undefined,
      inventoryDelta: result.ok ? result.inventoryDelta : undefined,
      shipyardReportId: result.ok ? result.shipyardReportId : undefined,
      shipyardFeedbackVisibleCopy: result.ok ? result.shipyardFeedbackVisibleCopy : undefined,
      shipyardScope: result.ok ? result.shipyardScope : undefined,
      fleetMovementRuntimeStatus: result.ok ? result.movementRuntimeStatus : undefined,
      fleetDoesNotUseUnitMarker: result.ok ? result.doesNotUseUnitMarker : undefined,
      battleReportSurface: result.ok ? 'battle_report_panel/list/detail' : undefined,
      actorAiPlayerId: params.actorAiPlayerId,
    }

    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: receipt.harborId,
        receipt,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'build_naval_warship_at_harbor',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          routeId: params.routeId,
          harborId: params.sourceDockId,
          shipClass: params.shipClass,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.shipyardOrderId,
      receipt,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'build_naval_warship_at_harbor',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        routeId: result.route.id,
        harborId: result.harborId,
        shipyardOrderId: result.shipyardOrderId,
        shipClass: result.shipClass,
        buildStatus: result.buildStatus,
        inventoryFleetId: result.inventoryFleetId,
        addedShipCount: result.addedShipCount,
        inventoryDelta: result.inventoryDelta,
        shipyardScope: result.shipyardScope,
        executionStatus: execution?.status,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function openNavalHarborInventoryAction(
  params: {
    factionId?: FactionId
    harborId: string
    inventoryFleetId?: string
    actorAiPlayerId?: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const harborId = params.harborId
  const navalRuntime = worldState.navalRuntime
  const harborInventory = navalRuntime?.harborInventories?.[harborId]
  const harborFleets = Object.values(navalRuntime?.fleets ?? {}).filter((fleet) =>
    fleet.factionId === targetFactionId &&
    fleet.sourceDockId === harborId &&
    fleet.shipyardBuildStatus === 'recorded'
  )
  const inventoryFleet = (
    harborFleets.find((fleet) => fleet.fleetId === params.inventoryFleetId) ??
    harborFleets.find((fleet) => fleet.shipyardOrderId === harborInventory?.lastOrderId) ??
    harborFleets[harborFleets.length - 1]
  )
  const sourceShipyardOrderId = inventoryFleet?.shipyardOrderId ?? harborInventory?.lastOrderId ?? ''
  const durability = inventoryFleet?.damageState === 'light_damage' || inventoryFleet?.repairStatus === 'returning_to_port' ? 68 : 100
  const fleetStatusLabel = inventoryFleet?.repairStatus === 'returning_to_port' ? '整补中' : '可出港'
  const deploymentReadiness = inventoryFleet ? evaluateNavalFleetDeploymentReadiness({
    fleetId: inventoryFleet.fleetId,
    harborId,
    routeId: inventoryFleet.routeId,
    fleetStatus: inventoryFleet.repairStatus === 'returning_to_port'
      ? 'repairing'
      : (inventoryFleet.status === 'patrolling' ? 'patrolling' : 'in_harbor'),
    durabilityCurrent: durability,
    durabilityMax: 100,
    crewReadiness: durability >= 90 ? 94 : 68,
    supplyReadiness: durability >= 90 ? 96 : 64,
    routeRisk: 12,
    enemyPresence: 0,
    seaWeatherRisk: 8,
    missionType: 'patrol',
  }) : undefined
  const receipt: WorldActionReceipt = {
    action: 'openNavalHarborInventory',
    factionId: targetFactionId,
    harborId,
    harborName: harborId === 'east_han_coastal_dock_quanzhou' ? '泉州港' : '海港',
    sourceShipyardOrderId: sourceShipyardOrderId || undefined,
    shipyardOrderId: sourceShipyardOrderId || undefined,
    inventoryFleetId: inventoryFleet?.fleetId,
    fleetId: inventoryFleet?.fleetId,
    fleetFrameSlotId: inventoryFleet?.frameSlotId,
    fleetCardVisible: inventoryFleet ? true : undefined,
    fleetStatusLabel: inventoryFleet ? fleetStatusLabel : undefined,
    fleetDurability: inventoryFleet ? durability : undefined,
    durabilityLabel: deploymentReadiness?.durabilityLabel ?? (inventoryFleet ? `耐久 ${durability}/100` : undefined),
    riskLabel: deploymentReadiness?.riskLabel,
    recommendedActionLabel: deploymentReadiness?.recommendedAction,
    missionAllowed: deploymentReadiness?.missionAllowed,
    readinessScore: deploymentReadiness?.readinessScore,
    riskScore: deploymentReadiness?.riskScore,
    shouldRepair: deploymentReadiness?.shouldRepair,
    shouldPatrol: deploymentReadiness?.shouldPatrol,
    shouldIntercept: deploymentReadiness?.shouldIntercept,
    shouldHold: deploymentReadiness?.shouldHold,
    deploymentReadinessUsesSharedDomainPolicy: deploymentReadiness ? true : undefined,
    deploymentPolicyScope: deploymentReadiness?.policyScope,
    harborHudActionButtonStateOk: deploymentReadiness ? true : undefined,
    feedbackVisible: deploymentReadiness ? true : undefined,
    worldNavalHarborDeploymentReadinessOk: deploymentReadiness ? true : undefined,
    worldNavalHarborDeploymentReadinessScope: deploymentReadiness ? 'deployment_readiness_hud_only_not_full_fleet_management' : undefined,
    harborSurfaceVisible: true,
    harborCopyAllowedOnlyOnHarborSurface: true,
    landSurfaceNavalCopyLeak: false,
    playerVisibleEngineeringCopyLeak: deploymentReadiness?.playerVisibleEngineeringCopyLeak ?? false,
    visibleCopyForbiddenHits: deploymentReadiness?.visibleCopyForbiddenHits ?? [],
    worldNavalHarborInventoryScope: 'harbor_inventory_open_only_not_full_fleet_management',
    actorAiPlayerId: params.actorAiPlayerId,
  }

  if (!harborInventory || !inventoryFleet) {
    return buildWorldActionResponse({
      ok: false,
      includeWorld,
      message: 'Naval harbor inventory requires at least one shipyard inventory fleet.',
      requestId,
      relatedId: harborId,
      receipt,
    })
  }

  return buildWorldActionResponse({
    ok: true,
    includeWorld,
    message: `${receipt.harborName} inventory opened.`,
    requestId,
    relatedId: inventoryFleet.fleetId,
    receipt,
  })
}

function navalRouteEncounterEnemyPresenceForDeployment(enemyPresence: NavalRouteEncounterEnemyPresence): number {
  switch (enemyPresence) {
    case 'none':
      return 0
    case 'scout':
      return 25
    case 'convoy':
      return 55
    case 'raider':
      return 68
    case 'fleet':
      return 82
  }
}

export function readNavalRouteEncounterAction(
  params: {
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
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const harborInventory = worldState.navalRuntime?.harborInventories?.[params.harborId]
  const harborFleets = Object.values(worldState.navalRuntime?.fleets ?? {}).filter((fleet) =>
    fleet.factionId === targetFactionId &&
    fleet.sourceDockId === params.harborId &&
    fleet.shipyardBuildStatus === 'recorded'
  )
  const inventoryFleet = (
    harborFleets.find((fleet) => fleet.fleetId === params.inventoryFleetId) ??
    harborFleets.find((fleet) => fleet.shipyardOrderId === harborInventory?.lastOrderId) ??
    harborFleets[harborFleets.length - 1]
  )
  const route = worldState.seaRouteAuthority?.routes.find((item) => item.id === params.routeId)
  const routeStatus = worldState.seaRouteAuthority?.routeStatuses[params.routeId]
  const requestedDurability = typeof params.durabilityPercent === 'number'
    ? Math.max(0, Math.min(100, Math.round(params.durabilityPercent)))
    : undefined
  const inferredDurability = inventoryFleet?.damageState === 'light_damage' ||
    inventoryFleet?.repairStatus === 'returning_to_port'
    ? 68
    : 100
  const durabilityPercent = requestedDurability ?? inferredDurability
  const supplyReadiness = typeof params.supplyReadiness === 'number'
    ? Math.max(0, Math.min(100, Math.round(params.supplyReadiness)))
    : (durabilityPercent >= 90 ? 96 : 64)
  const fleetStatus = inventoryFleet?.repairStatus === 'returning_to_port'
    ? 'repairing'
    : (params.missionType === 'intercept'
      ? 'intercepting'
      : (params.missionType === 'patrol' ? 'patrolling' : 'in_harbor'))
  const deploymentReadiness = inventoryFleet ? evaluateNavalFleetDeploymentReadiness({
    fleetId: inventoryFleet.fleetId,
    harborId: params.harborId,
    routeId: params.routeId,
    fleetStatus,
    durabilityCurrent: durabilityPercent,
    durabilityMax: 100,
    crewReadiness: durabilityPercent >= 90 ? 94 : 68,
    supplyReadiness,
    routeRisk: params.routeRisk ?? 12,
    enemyPresence: navalRouteEncounterEnemyPresenceForDeployment(params.enemyPresence),
    seaWeatherRisk: params.seaWeatherRisk ?? 8,
    missionType: params.missionType === 'escort' ? 'patrol' : params.missionType,
  }) : undefined
  const encounterPolicy = inventoryFleet && deploymentReadiness ? evaluateNavalRouteEncounterPolicy({
    fleetId: inventoryFleet.fleetId,
    fleetRole: inventoryFleet.vesselType === 'interceptor_warship' ? 'interceptor' : inventoryFleet.vesselType,
    fleetStatus,
    missionType: params.missionType,
    deploymentReadiness: {
      missionAllowed: deploymentReadiness.missionAllowed,
      readinessScore: deploymentReadiness.readinessScore,
      riskScore: deploymentReadiness.riskScore,
      shouldRepair: deploymentReadiness.shouldRepair,
      shouldHold: deploymentReadiness.shouldHold,
      shouldIntercept: deploymentReadiness.shouldIntercept,
    },
    routeId: params.routeId,
    routeRisk: params.routeRisk,
    seaWeatherRisk: params.seaWeatherRisk,
    enemyPresence: params.enemyPresence,
    enemyStrength: params.enemyStrength,
    fleetStrength: params.fleetStrength,
    durabilityPercent,
    supplyReadiness,
    patrolIntensity: params.patrolIntensity,
    allySupport: params.allySupport,
    distanceFromHarbor: params.distanceFromHarbor,
  }) : undefined
  const receipt: WorldActionReceipt = {
    action: 'readNavalRouteEncounter',
    factionId: targetFactionId,
    routeId: route?.id ?? params.routeId,
    routeStatus: routeStatus?.status,
    blockedReason: routeStatus?.blockedReason ?? null,
    harborId: params.harborId,
    harborName: params.harborId === 'east_han_coastal_dock_quanzhou' ? '泉州港' : '海港',
    inventoryFleetId: inventoryFleet?.fleetId ?? params.inventoryFleetId,
    fleetId: inventoryFleet?.fleetId ?? params.inventoryFleetId,
    fleetFrameSlotId: inventoryFleet?.frameSlotId,
    sourceShipyardOrderId: inventoryFleet?.shipyardOrderId ?? harborInventory?.lastOrderId,
    missionType: params.missionType,
    readinessScore: deploymentReadiness?.readinessScore,
    deploymentMissionAllowed: deploymentReadiness?.missionAllowed,
    deploymentRiskScore: deploymentReadiness?.riskScore,
    shouldRepair: deploymentReadiness?.shouldRepair,
    deploymentShouldIntercept: deploymentReadiness?.shouldIntercept,
    shouldHold: deploymentReadiness?.shouldHold,
    deploymentReadinessUsesSharedDomainPolicy: deploymentReadiness ? true : undefined,
    deploymentPolicyScope: deploymentReadiness?.policyScope,
    navalRouteEncounterPolicyVersion: encounterPolicy?.policyVersion,
    navalRouteEncounterScope: encounterPolicy ? 'naval_route_encounter_service_readback_only_not_godot_ui' : undefined,
    readbackUsesNavalRouteEncounterPolicy: encounterPolicy ? true : undefined,
    encounterState: encounterPolicy?.encounterState,
    missionAllowed: encounterPolicy?.missionAllowed,
    combatExpected: encounterPolicy?.combatExpected,
    interceptAllowed: encounterPolicy?.interceptAllowed,
    shouldReturnToHarbor: encounterPolicy?.shouldReturnToHarbor,
    shouldAvoid: encounterPolicy?.shouldAvoid,
    riskScore: encounterPolicy?.riskScore,
    successChance: encounterPolicy?.successChance,
    expectedDamageRange: encounterPolicy?.expectedDamageRange,
    recommendedActionLabel: encounterPolicy?.recommendedActionLabel,
    resultLabel: encounterPolicy?.resultLabel,
    visibleCopyForbiddenHits: encounterPolicy?.visibleCopyForbiddenHits ?? [],
    actorAiPlayerId: params.actorAiPlayerId,
  }

  if (!harborInventory || !inventoryFleet) {
    return buildWorldActionResponse({
      ok: false,
      includeWorld,
      message: 'Naval route encounter readback requires a shipyard inventory fleet.',
      requestId,
      relatedId: params.harborId,
      receipt,
    })
  }

  return buildWorldActionResponse({
    ok: true,
    includeWorld,
    message: 'Naval route encounter readback ready.',
    requestId,
    relatedId: inventoryFleet.fleetId,
    receipt,
  })
}

export function setAiResourceTransferPolicyAction(
  params: {
    factionId?: FactionId
    dailyQuotaTotal?: number
    dailyWindowTicks?: number
    cooldownTicks?: number
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('set_ai_resource_transfer_policy')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = setAiResourceTransferPolicy(worldState, {
      factionId: targetFactionId,
      dailyQuotaTotal: params.dailyQuotaTotal,
      dailyWindowTicks: params.dailyWindowTicks,
      cooldownTicks: params.cooldownTicks,
    })
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: targetFactionId,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'set_ai_resource_transfer_policy',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, result.factionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.factionId,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'set_ai_resource_transfer_policy',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: result.factionId,
        policy: result.policy,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function claimGovernorResourceInboxAction(
  params: {
    factionId?: FactionId
    governorPlayerId: string
    transferId?: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('claim_governor_resource_inbox')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = claimGovernorResourceInbox(worldState, {
      factionId: targetFactionId,
      governorPlayerId: params.governorPlayerId,
      transferId: params.transferId,
    })
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: params.transferId ?? params.governorPlayerId,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'claim_governor_resource_inbox',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          governorPlayerId: params.governorPlayerId,
          transferId: params.transferId,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.claimedTransferIds[0] ?? result.governorPlayerId,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'claim_governor_resource_inbox',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        governorPlayerId: result.governorPlayerId,
        claimedTransferIds: result.claimedTransferIds,
        claimedResources: result.claimedResources,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function gatherAiResourceTileAction(
  params: {
    factionId?: FactionId
    aiPlayerId: string
    unitId: string
    tileId: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('gather_ai_resource_tile')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = gatherAiResourceTile(worldState, {
      factionId: targetFactionId,
      aiPlayerId: params.aiPlayerId,
      unitId: params.unitId,
      tileId: params.tileId,
    })
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: params.tileId,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'gather_ai_resource_tile',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          aiPlayerId: params.aiPlayerId,
          unitId: params.unitId,
          tileId: params.tileId,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.claimId,
      receipt: {
        action: 'gatherAiResourceTile',
        factionId: targetFactionId,
        aiPlayerId: result.aiPlayerId,
        unitId: result.unitId,
        tileId: result.tileId,
        resourceRewardDelta: {
          food: result.resources.food,
          wood: result.resources.wood,
          stone: result.resources.stone,
          iron: result.resources.iron,
        },
      },
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'gather_ai_resource_tile',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        aiPlayerId: result.aiPlayerId,
        unitId: result.unitId,
        tileId: result.tileId,
        claimId: result.claimId,
        resources: result.resources,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function occupyTileAction(
  params: {
    factionId?: FactionId
    aiPlayerId?: string
    unitId: string
    tileId: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('occupy_tile')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const targetTile = worldState.map.tiles.find((tile) => tile.id === params.tileId)
    const immunityBlock = targetTile
      ? resolveMainMapCellImmunityBlockForFaction({
          world: worldState,
          cellX: targetTile.x,
          cellY: targetTile.y,
          factionId: targetFactionId,
        })
      : undefined
    if (immunityBlock) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: immunityBlock.message,
        failureCode: 'main_map_cell_immunity_active',
        requestId,
        execution,
        relatedId: params.tileId,
        unitId: params.unitId,
        ...immunityBlock.fields,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'occupy_tile',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: immunityBlock.message,
        metadata: {
          factionId: targetFactionId,
          aiPlayerId: params.aiPlayerId,
          unitId: params.unitId,
          tileId: params.tileId,
          cellId: immunityBlock.cellId,
          cellX: immunityBlock.cellX,
          cellY: immunityBlock.cellY,
          chunkId: immunityBlock.chunkId,
          previousOwner: immunityBlock.previousOwner,
          previousCellVersion: immunityBlock.previousCellVersion,
          failureCode: 'main_map_cell_immunity_active',
          ...immunityBlock.fields,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    const preflightResourceReadback = buildResourceTileBackendSettlementReadback(targetTile, targetFactionId)
    if (
      targetTile?.type === 'resource' &&
      (preflightResourceReadback.resourceTileSettlementStatus === 'unsupported_resource_level' ||
        preflightResourceReadback.resourceTileSettlementStatus === 'unsupported_resource_kind')
    ) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const receipt: WorldActionReceipt = {
        action: 'occupyTile',
        factionId: targetFactionId,
        unitId: params.unitId,
        tileId: params.tileId,
        failureCode: 'tile_not_occupiable',
        ...preflightResourceReadback,
      }
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: preflightResourceReadback.resourceTileSettlementStatus === 'unsupported_resource_kind'
          ? `Resource tile ${params.tileId} uses unsupported P0 resource kind ${String(targetTile.resourceKind ?? '')}.`
          : `Resource tile ${params.tileId} uses unsupported P0 resource level ${String(targetTile.resourceLevel ?? '')}.`,
        failureCode: 'tile_not_occupiable',
        requestId,
        execution,
        relatedId: params.tileId,
        unitId: params.unitId,
        receipt,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'occupy_tile',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: failed.message,
        metadata: {
          factionId: targetFactionId,
          aiPlayerId: params.aiPlayerId,
          unitId: params.unitId,
          tileId: params.tileId,
          failureCode: 'tile_not_occupiable',
          resourceTileSettlementStatus: preflightResourceReadback.resourceTileSettlementStatus,
          resourceEconomyConfigVersion: preflightResourceReadback.resourceEconomyConfigVersion,
          resourceEconomyConfigSource: preflightResourceReadback.resourceEconomyConfigSource,
          tileLevel: preflightResourceReadback.tileLevel,
          resourceKind: preflightResourceReadback.resourceKind,
          resourceTileBackendSettlementReadbackScope:
            preflightResourceReadback.resourceTileBackendSettlementReadbackScope,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    const result = occupyTile(worldState, {
      factionId: targetFactionId,
      aiPlayerId: params.aiPlayerId,
      unitId: params.unitId,
      tileId: params.tileId,
    })
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: params.tileId,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'occupy_tile',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          aiPlayerId: params.aiPlayerId,
          unitId: params.unitId,
          tileId: params.tileId,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const receiptResourceReadback = buildResourceTileBackendSettlementReadback(targetTile, targetFactionId)
    const receipt: WorldActionReceipt = {
      action: 'occupyTile',
      factionId: targetFactionId,
      unitId: result.unitId,
      tileId: result.tileId,
      previousOwner: result.previousOwner,
      occupied: result.occupied,
      guardTemplateId: result.guardTemplateId,
      resourcesSpent: {
        actionPoints: 1,
        food: 1,
      },
      heroId: result.heroGrowth?.heroId,
      previousLevel: result.heroGrowth?.previousLevel,
      nextLevel: result.heroGrowth?.nextLevel,
      previousExp: result.heroGrowth?.previousExp,
      nextExp: result.heroGrowth?.nextExp,
      expGained: result.heroGrowth?.expGained,
      strengthBefore: result.guardBattle?.attackerStrengthBefore ?? result.pvpBattle?.attackerStrengthBefore,
      strengthAfter: result.guardBattle?.attackerStrengthAfter ?? result.pvpBattle?.attackerStrengthAfter,
      supplyBefore: result.guardBattle?.attackerSupplyBefore ?? result.pvpBattle?.attackerSupplyBefore,
      supplyAfter: result.guardBattle?.attackerSupplyAfter ?? result.pvpBattle?.attackerSupplyAfter,
      hero: result.heroGrowth?.hero,
      ...receiptResourceReadback,
    }
    if (result.occupied && receipt.resourceTileSettlementStatus === 'ready') {
      applyLandResourceRewardDelta(worldState.factions[targetFactionId], receipt.resourceRewardDelta)
      enrichLandResourceBattleRecord(worldState, {
        tileId: result.tileId,
        unitId: result.unitId,
        receipt,
      })
      const taskProgressResult = recordWorldTaskEvent(worldState, {
        factionId: targetFactionId,
        scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
        scenarioVersion: DEFAULT_WORLD_TASKS_SCENARIO_VERSION,
        seasonRunId: DEFAULT_WORLD_TASKS_SEASON_RUN_ID,
        taskId: 'huangtian_task_02_prepare_supplies',
        kind: 'resource_stockpile_ready',
        source: 'battle_report',
        sourceId: result.tileId,
        summary: 'First-hour resource expedition occupied a resource tile and generated a battle report reward readback.',
      })
      if (taskProgressResult.ok) {
        commitWorldState(taskProgressResult.world)
        receipt.taskProgressDelta = {
          taskId: taskProgressResult.taskId,
          eventId: taskProgressResult.event.eventId,
          kind: taskProgressResult.event.kind,
          source: taskProgressResult.event.source,
          sourceId: taskProgressResult.event.sourceId,
          status: 'achieved',
          claimState: 'claimable',
          canClaim: true,
          settlementAuthority: 'real_authority',
        }
      }
    }
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.tileId,
      unitId: result.unitId,
      receipt,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'occupy_tile',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
          metadata: {
            factionId: targetFactionId,
            aiPlayerId: result.aiPlayerId,
            unitId: result.unitId,
            tileId: result.tileId,
            previousOwner: result.previousOwner,
            occupied: result.occupied,
            guardTemplateId: result.guardTemplateId,
            guardBattle: result.guardBattle,
            heroGrowth: result.heroGrowth,
            pvpBattle: result.pvpBattle,
            ...buildBattleOccupyTileHistoryOverlay(
              findLatestBattleRecordForOccupyTile(worldState, result.unitId, result.tileId),
              result.occupied,
            ),
            resourceEconomy: receiptResourceReadback,
            executionStatus: execution?.status,
            activeOrderCount: execution?.activeOrderCount,
            actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function abandonAiOwnedTileAction(
  params: {
    factionId: FactionId
    aiPlayerId: string
    tileId: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const mutationLock = tryAcquireWorldMutationLock('abandon_ai_owned_tile')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, params.factionId, requestId)
  }

  try {
    const tile = worldState.map.tiles.find((candidate) => candidate.id === params.tileId)
    if (!tile) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: `Tile ${params.tileId} not found.`,
        requestId,
      })
    }
    if (tile.type === 'city' || tile.type === 'fog') {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: `Tile ${params.tileId} cannot be abandoned by AI land action.`,
        requestId,
      })
    }
    if (tile.owner !== params.factionId) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: `Tile ${params.tileId} is not owned by faction ${params.factionId}.`,
        requestId,
      })
    }

    const faction = worldState.factions[params.factionId]
    const aiUnitIds = new Set(
      (faction?.aiPlayers ?? [])
        .find((player) => player.id === params.aiPlayerId)
        ?.unitIds ?? [],
    )
    const aiUnitPresent = worldState.units.some((unit) => (
      unit.tileId === params.tileId &&
      (unit.aiPlayerId === params.aiPlayerId || aiUnitIds.has(unit.id))
    ))
    const gatherClaim = faction?.aiResourceGatherClaims?.[params.tileId]
    const gatheredByAi = gatherClaim?.aiPlayerId === params.aiPlayerId
    if (!aiUnitPresent && !gatheredByAi) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: `Tile ${params.tileId} is not attached to AI player ${params.aiPlayerId}.`,
        requestId,
      })
    }

    const nextWorld = structuredClone(worldState)
    const nextTile = nextWorld.map.tiles.find((candidate) => candidate.id === params.tileId)
    const nextFaction = nextWorld.factions[params.factionId]
    if (!nextTile || !nextFaction) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: `Tile ${params.tileId} could not be abandoned.`,
        requestId,
      })
    }

    const previousOwner = nextTile.owner
    nextTile.owner = 'neutral'
    nextTile.enemyPressure = Math.max(0, nextTile.enemyPressure)
    const clearedGatherClaim = Boolean(nextFaction.aiResourceGatherClaims?.[params.tileId])
    if (nextFaction.aiResourceGatherClaims) {
      delete nextFaction.aiResourceGatherClaims[params.tileId]
    }
    for (const unit of nextWorld.units) {
      if (unit.tileId === params.tileId && (unit.aiPlayerId === params.aiPlayerId || aiUnitIds.has(unit.id))) {
        unit.status = '待命'
        unit.currentTask = undefined
      }
    }
    nextWorld.worldVersion += 1
    commitWorldState(nextWorld)

    const execution = buildAiExecutionStateSnapshot(worldState, params.factionId)
    const receipt: WorldActionReceipt = {
      action: 'abandonAiOwnedTile',
      factionId: params.factionId,
      aiPlayerId: params.aiPlayerId,
      tileId: params.tileId,
      previousOwner,
      owner: 'neutral',
      abandoned: true,
      clearedGatherClaim,
    }
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: `AI player ${params.aiPlayerId} abandoned tile ${params.tileId}.`,
      requestId,
      execution,
      relatedId: params.tileId,
      receipt,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'abandon_ai_owned_tile',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: response.message,
      metadata: {
        playerHistoryCategory: 'ai_activity',
        playerHistoryTitle: 'AI 放弃地块',
        playerHistoryActorName: params.aiPlayerId,
        playerHistorySummary: 'AI 已放弃一块已占土地，后续可改选更合适目标。',
        playerHistoryLocation: 'AI 活动',
        playerHistoryTarget: tile.name,
        playerHistoryResultLabel: '已放弃',
        playerHistoryConsequence: '该地块已回到中立状态。',
        playerHistoryNextAction: '查看下一步',
        playerHistorySeverity: 'medium',
        playerHistoryScope: 'private_ai',
        playerHistoryFactionId: params.factionId,
        playerHistorySharePolicy: 'not_shareable_private',
        playerHistoryShareStateLabel: '暂不可分享',
        playerHistoryDedupeKey: `ai-activity:tile-abandon:${params.aiPlayerId}:${params.tileId}:${worldState.worldVersion}`,
        factionId: params.factionId,
        aiPlayerId: params.aiPlayerId,
        tileId: params.tileId,
        previousOwner,
        owner: 'neutral',
        clearedGatherClaim,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

type SeedBattleReportClosureRole = 'player' | 'ai' | 'organization'

type SeedBattleReportClosureParams = {
  factionId?: FactionId
  aiPlayerId?: string
  organizationId?: string
  organizationName?: string
  organizationKind?: 'alliance' | 'nation'
  repeatCount?: number
  allowReusableSeedTargets?: boolean
}

type SeedBattleReportClosureStep = NonNullable<WorldActionResponse['seededBattleReportActions']>[number]

function normalizeSeedString(value: string | undefined, fallback: string): string {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : fallback
}

function restoreSeedBattleReportOrganizationState(
  world: WorldState,
  factionId: FactionId,
  original: Pick<NonNullable<WorldState['factions'][FactionId]>, 'organizationId' | 'organizationName' | 'organizationKind'>,
) {
  const faction = world.factions[factionId]
  if (!faction) {
    return
  }
  faction.organizationId = original.organizationId
  faction.organizationName = original.organizationName
  faction.organizationKind = original.organizationKind
}

function clearSeedBattleReportOrganizationState(world: WorldState, factionId: FactionId) {
  const faction = world.factions[factionId]
  if (!faction) {
    return
  }
  faction.organizationId = undefined
  faction.organizationName = undefined
  faction.organizationKind = undefined
}

function prepareSeedBattleReportFactionBudget(world: WorldState, factionId: FactionId) {
  const faction = world.factions[factionId]
  if (!faction) {
    return
  }
  faction.actionPoints = Math.max(faction.actionPoints, 8)
  faction.food = Math.max(faction.food, 8)
}

function ensureSeedBattleReportAiAssignment(
  world: WorldState,
  factionId: FactionId,
  aiPlayerId: string,
  unitId: string,
) {
  const faction = world.factions[factionId]
  if (!faction) {
    return
  }
  faction.aiPlayers = [...(faction.aiPlayers ?? [])]
  const existing = faction.aiPlayers.find((candidate) => candidate.id === aiPlayerId)
  if (existing) {
    existing.unitIds = Array.from(new Set([...(existing.unitIds ?? []), unitId]))
    return
  }
  faction.aiPlayers.push({
    id: aiPlayerId,
    name: '青州后勤官',
    factionId,
    unitIds: [unitId],
    specialty: 'logistics',
    lore: '正式 closure seeded AI player for battle report owner attribution.',
  })
}

function selectSeedBattleReportUnit(
  world: WorldState,
  factionId: FactionId,
  usedUnitIds: Set<string>,
): string | undefined {
  return world.units
    .filter((unit) => unit.faction === factionId && !usedUnitIds.has(unit.id))
    .sort((left, right) => right.strength - left.strength)
    .map((unit) => unit.id)[0]
}

function selectSeedBattleReportTile(
  world: WorldState,
  factionId: FactionId,
  usedTileIds: Set<string>,
  allowReusableSeedTargets = false,
): Tile | undefined {
  return world.map.tiles
    .filter((tile) =>
      (allowReusableSeedTargets || tile.owner !== factionId) &&
      tile.type !== 'city' &&
      tile.type !== 'fog' &&
      !usedTileIds.has(tile.id) &&
      (tile.resourceKind !== undefined || tile.resourceLevel !== undefined || tile.type === 'resource')
    )
    .sort((left, right) => (left.resourceLevel ?? 1) - (right.resourceLevel ?? 1))
    [0]
}

function prepareSeedBattleReportOccupyCandidate(
  world: WorldState,
  factionId: FactionId,
  role: SeedBattleReportClosureRole,
  usedUnitIds: Set<string>,
  usedTileIds: Set<string>,
  aiPlayerId: string,
  organizationId: string,
  organizationName: string,
  organizationKind: 'alliance' | 'nation',
  allowReusableSeedTargets = false,
): { unitId: string; tileId: string } | undefined {
  const unitId = selectSeedBattleReportUnit(world, factionId, usedUnitIds)
  const tile = selectSeedBattleReportTile(world, factionId, usedTileIds, allowReusableSeedTargets)
  if (!unitId || !tile) {
    return undefined
  }
  const unit = world.units.find((candidate) => candidate.id === unitId)
  const faction = world.factions[factionId]
  if (!unit || !faction) {
    return undefined
  }

  tile.owner = 'neutral'
  tile.type = 'resource'
  tile.resourceKind = tile.resourceKind ?? 'food'
  tile.resourceLevel = Math.max(1, Math.min(2, tile.resourceLevel ?? 1))
  tile.enemyPressure = Math.max(tile.enemyPressure, 1)

  unit.tileId = tile.id
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = Math.max(unit.strength, 220)
  unit.supply = Math.max(unit.supply, 8)
  unit.corps.readiness = Math.max(unit.corps.readiness, 96)
  unit.aiPlayerId = role === 'ai' ? aiPlayerId : undefined
  if (role === 'ai') {
    ensureSeedBattleReportAiAssignment(world, factionId, aiPlayerId, unitId)
  }

  if (role === 'organization') {
    faction.organizationId = organizationId
    faction.organizationName = organizationName
    faction.organizationKind = organizationKind
  } else {
    faction.organizationId = undefined
    faction.organizationName = undefined
    faction.organizationKind = undefined
  }

  usedUnitIds.add(unitId)
  usedTileIds.add(tile.id)
  return { unitId, tileId: tile.id }
}

function resolveNextSeedBattleReportTick(world: WorldState): number {
  const maxBattleRecordTick = (world.feedback.battleRecords ?? []).reduce(
    (maxTick, record) => Math.max(maxTick, Number.isFinite(record.tick) ? record.tick : 0),
    0,
  )
  return Math.max(world.tick, maxBattleRecordTick + 1)
}

function assignDeployedReserveUnitToAiPlayer(
  world: WorldState,
  factionId: FactionId,
  unitId: string,
  aiPlayerId: string,
  teamBinding: { teamId?: string; teamIndex?: number } = {},
) {
  const unit = world.units.find((candidate) => candidate.id === unitId)
  if (!unit) {
    return
  }
  unit.aiPlayerId = aiPlayerId
  unit.teamId = teamBinding.teamId
  unit.teamIndex = teamBinding.teamIndex
  const faction = world.factions[factionId]
  if (!faction) {
    return
  }
  faction.aiPlayers = [...(faction.aiPlayers ?? [])]
  const existing = faction.aiPlayers.find((candidate) => candidate.id === aiPlayerId)
  if (existing) {
    existing.unitIds = Array.from(new Set([...(existing.unitIds ?? []), unitId]))
    return
  }
  faction.aiPlayers.push({
    id: aiPlayerId,
    name: aiPlayerId,
    factionId,
    unitIds: [unitId],
    specialty: 'logistics',
    lore: 'Created by deployReserveHeroAction AI unit binding.',
  })
}

export function seedMainCityTroopFormationMultiTeamFixtureAction(
  params: {
    factionId?: FactionId
    aiPlayerId?: string
    firstTeamId?: string
    secondTeamId?: string
    firstTeamIndex?: number
    secondTeamIndex?: number
    teamCount?: number
    forceInvalidPortraitAssetKey?: boolean
    forceEmptyTeamSlots?: boolean
  } | undefined = {},
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params?.factionId ?? resolveDefaultFactionId()
  const aiPlayerId = String(params?.aiPlayerId ?? 'player_operator_alpha').trim() || 'player_operator_alpha'
  const firstTeamId = String(params?.firstTeamId ?? 'team_02').trim() || 'team_02'
  const secondTeamId = String(params?.secondTeamId ?? 'team_03').trim() || 'team_03'
  const firstTeamIndex = Number.isFinite(params?.firstTeamIndex) && Number(params?.firstTeamIndex) > 0
    ? Math.floor(Number(params?.firstTeamIndex))
    : 2
  const secondTeamIndex = Number.isFinite(params?.secondTeamIndex) && Number(params?.secondTeamIndex) > 0
    ? Math.floor(Number(params?.secondTeamIndex))
    : 3
  const teamCount = Number.isFinite(params?.teamCount) && Number(params?.teamCount) >= 2
    ? Math.min(12, Math.floor(Number(params?.teamCount)))
    : 2
  const forceInvalidPortraitAssetKey = params?.forceInvalidPortraitAssetKey === true
  const forceEmptyTeamSlots = params?.forceEmptyTeamSlots === true
  const mutationLock = tryAcquireWorldMutationLock('seed_main_city_troop_formation_multi_team_fixture')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const faction = worldState.factions[targetFactionId]
    const tileId = faction?.heroCommand.homeTileId
    if (!faction || !tileId) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        requestId,
        message: `main city troop formation multi-team fixture missing faction home tile: ${targetFactionId}`,
        failureCode: 'missing_target_tile',
      })
    }

    let nextWorld = structuredClone(worldState) as WorldState
    const originalReserveHeroIds = [...(nextWorld.factions[targetFactionId]?.heroCommand.reserveHeroIds ?? [])]
    let firstUnit = nextWorld.units.find((unit) =>
      unit.faction === targetFactionId &&
      unit.aiPlayerId === aiPlayerId &&
      unit.teamId === firstTeamId
    )
    if (!firstUnit) {
      const reserveHeroIds = faction.heroCommand.reserveHeroIds.slice(0, 3)
      const deployResult = deployReserveHero(
        nextWorld,
        targetFactionId,
        reserveHeroIds[0] ?? '',
        tileId,
        reserveHeroIds.slice(1, 3),
      )
      if (!deployResult.ok) {
        return buildWorldActionResponse({
          ok: false,
          includeWorld,
          requestId,
          message: deployResult.message,
        })
      }
      nextWorld = deployResult.world
      const nextFaction = nextWorld.factions[targetFactionId]
      if (nextFaction) {
        nextFaction.heroCommand.reserveHeroIds = Array.from(new Set([
          ...originalReserveHeroIds,
          ...nextFaction.heroCommand.reserveHeroIds,
        ]))
      }
      firstUnit = nextWorld.units.find((unit) => unit.id === deployResult.unitId)
    }
    if (!firstUnit) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        requestId,
        message: 'main city troop formation multi-team fixture could not create first unit.',
      })
    }

    assignDeployedReserveUnitToAiPlayer(nextWorld, targetFactionId, firstUnit.id, aiPlayerId, {
      teamId: firstTeamId,
      teamIndex: firstTeamIndex,
    })

    const seededUnits: Unit[] = [firstUnit]
    const seededTeamIds = [firstTeamId]
    const seededTeamIndexes = [firstTeamIndex]
    for (let offset = 1; offset < teamCount; offset += 1) {
      const teamIndex = offset === 1 ? secondTeamIndex : firstTeamIndex + offset
      const teamId = offset === 1 ? secondTeamId : `team_${String(teamIndex).padStart(2, '0')}`
      const existingUnit = nextWorld.units.find((unit) =>
        unit.faction === targetFactionId &&
        unit.aiPlayerId === aiPlayerId &&
        unit.teamId === teamId
      )
      const unit = existingUnit ?? structuredClone(firstUnit) as Unit
      if (!existingUnit) {
        unit.id = `${firstUnit.id}_${teamId}`
        unit.name = `${firstUnit.name} ${teamId}`
        nextWorld.units.push(unit)
      }
      unit.aiPlayerId = aiPlayerId
      unit.teamId = teamId
      unit.teamIndex = teamIndex
      unit.status = '待命'
      unit.currentTask = undefined
      assignDeployedReserveUnitToAiPlayer(nextWorld, targetFactionId, unit.id, aiPlayerId, {
        teamId,
        teamIndex,
      })
      seededUnits.push(unit)
      seededTeamIds.push(teamId)
      seededTeamIndexes.push(teamIndex)
    }

    if (forceInvalidPortraitAssetKey) {
      for (const unit of seededUnits) {
        unit.hero.portraitKey = 'formal_pack.portrait.__missing_smoke_invalid__'
        for (const coHero of unit.coHeroes ?? []) {
          coHero.portraitKey = 'formal_pack.portrait.__missing_smoke_invalid__'
        }
      }
    }
    if (forceEmptyTeamSlots) {
      for (const unit of seededUnits) {
        unit.hero = buildEmptyTroopFormationSmokeHero(unit.hero, 'camp')
        unit.coHeroes = [
          buildEmptyTroopFormationSmokeHero(unit.hero, 'mid'),
          buildEmptyTroopFormationSmokeHero(unit.hero, 'front'),
        ]
        unit.strength = 0
      }
    }

    commitWorldState(nextWorld)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      requestId,
      message: 'seeded main city troop formation multi-team fixture.',
      aiPlayerId,
      teamId: seededTeamIds[seededTeamIds.length - 1],
      teamIndex: seededTeamIndexes[seededTeamIndexes.length - 1],
      unitId: seededUnits[seededUnits.length - 1]?.id,
    })
    response.seededMainCityTroopFormationMultiTeamFixture = {
      factionId: targetFactionId,
      aiPlayerId,
      teamIds: seededTeamIds,
      teamIndexes: seededTeamIndexes,
      unitIds: seededUnits.map((unit) => unit.id),
    }
    appendWorldEvent({
      category: 'world_action',
      action: 'seed_main_city_troop_formation_multi_team_fixture',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: response.message,
      metadata: response.seededMainCityTroopFormationMultiTeamFixture,
    })
    return response
  } finally {
    mutationLock.release()
  }
}

function buildEmptyTroopFormationSmokeHero(baseHero: Unit['hero'], slotId: string): Unit['hero'] {
  return {
    ...baseHero,
    id: '',
    name: '',
    title: '',
    level: 0,
    troopType: '' as Unit['hero']['troopType'],
    avatarKey: '',
    portraitKey: '',
    force: 0,
    command: 0,
    intelligence: 0,
    charisma: 0,
    speed: 0,
    traits: [],
    signatureSkill: {
      name: '',
      detail: '',
    },
    growthFocus: `empty_${slotId}`,
    exp: 0,
    starLevel: 0,
  }
}

export function seedMapUnitVisualSouthExitFixtureAction(
  params: { factionId?: FactionId; originTileId?: string; targetTileId?: string } | undefined = {},
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const originTileId = String(params?.originTileId ?? 'tile_08').trim() || 'tile_08'
  const targetTileId = String(params?.targetTileId ?? 'tile_13').trim() || 'tile_13'
  const mutationLock = tryAcquireWorldMutationLock('seed_map_unit_visual_south_exit_fixture')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, params?.factionId ?? resolveDefaultFactionId(), requestId)
  }

  try {
    const originTile = worldState.map.tiles.find((tile) => tile.id === originTileId)
    const targetTile = worldState.map.tiles.find((tile) => tile.id === targetTileId)
    if (!originTile || !targetTile) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: `map unit visual south exit fixture target missing: ${originTileId} -> ${targetTileId}`,
        failureCode: 'missing_target_tile',
        requestId,
      })
    }

    const nextWorld = structuredClone(worldState) as WorldState
    const nextTargetTile = nextWorld.map.tiles.find((tile) => tile.id === targetTileId)
    if (!nextTargetTile) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: `map unit visual south exit fixture target missing after clone: ${targetTileId}`,
        failureCode: 'missing_target_tile',
        requestId,
      })
    }

    const previousTerrain = nextTargetTile.terrain
    const previousOwner = nextTargetTile.owner
    nextTargetTile.terrain = 'grassland'
    nextTargetTile.owner = 'neutral'
    nextTargetTile.enemyPressure = 0

    commitWorldState(nextWorld)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: `Seeded map unit visual south exit fixture ${originTileId} -> ${targetTileId}.`,
      requestId,
    })
    response.seededMapUnitVisualExitFixture = {
      originTileId,
      targetTileId,
      direction: 'south',
      previousTerrain,
      nextTerrain: 'grassland',
      previousOwner,
      nextOwner: 'neutral',
    }
    appendWorldEvent({
      category: 'world_action',
      action: 'seed_map_unit_visual_south_exit_fixture',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      message: response.message,
      metadata: response.seededMapUnitVisualExitFixture,
    })
    return response
  } finally {
    mutationLock.release()
  }
}

export function seedTileActionHudExpeditionFixtureAction(
  params: { factionId?: FactionId; tileId?: string; unitId?: string } | undefined = {},
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params?.factionId ?? resolveDefaultFactionId()
  const preferredTileId = String(params?.tileId ?? '').trim()
  const preferredUnitId = String(params?.unitId ?? '').trim()
  const mutationLock = tryAcquireWorldMutationLock('seed_tile_action_hud_expedition_fixture')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const faction = worldState.factions[targetFactionId]
    if (!faction) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        requestId,
        message: `tile action HUD fixture missing faction: ${targetFactionId}`,
        failureCode: 'unknown_faction',
      })
    }

    const nextWorld = structuredClone(worldState) as WorldState
    const nextFaction = nextWorld.factions[targetFactionId]
    nextFaction.food = Math.max(50, Number(nextFaction.food ?? 0) || 0)
    nextFaction.actionPoints = Math.max(20, Number(nextFaction.actionPoints ?? 0) || 0)

    const targetTile = nextWorld.map.tiles
      .filter((tile) =>
        (preferredTileId ? tile.id === preferredTileId : true) &&
        tile.type === 'resource' &&
        Number(tile.resourceLevel ?? 0) >= 1 &&
        Number(tile.resourceLevel ?? 0) <= 9
      )
      .sort((left, right) => {
        const leftId = String(left.id ?? '')
        const rightId = String(right.id ?? '')
        if (left.x === 4387 && left.y === 2482) return 1
        if (right.x === 4387 && right.y === 2482) return -1
        if (leftId === 'grid_8_8') return 1
        if (rightId === 'grid_8_8') return -1
        return leftId.localeCompare(rightId)
      })[0]
    if (!targetTile) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        requestId,
        message: 'tile action HUD fixture could not find an L1-L9 resource tile.',
        failureCode: 'missing_target_tile',
      })
    }

    targetTile.owner = 'neutral'
    targetTile.enemyPressure = 0
    targetTile.type = 'resource'
    targetTile.resourceLevel = Math.min(9, Math.max(1, Math.trunc(Number(targetTile.resourceLevel ?? 1) || 1)))
    if (!targetTile.resourceKind) {
      targetTile.resourceKind = 'food'
    }

    let unit = nextWorld.units.find((candidate) =>
      candidate.faction === targetFactionId &&
      (preferredUnitId ? candidate.id === preferredUnitId : true)
    )
    if (!unit) {
      const homeTileId = String(nextFaction.heroCommand.homeTileId ?? '').trim()
      const reserveHeroIds = [...(nextFaction.heroCommand.reserveHeroIds ?? [])]
      if (homeTileId && reserveHeroIds.length >= 1) {
        const deployResult = deployReserveHero(
          nextWorld,
          targetFactionId,
          reserveHeroIds[0],
          homeTileId,
          reserveHeroIds.slice(1, 3),
        )
        if (deployResult.ok) {
          const deployedWorld = deployResult.world
          nextWorld.units.splice(0, nextWorld.units.length, ...deployedWorld.units)
          nextWorld.factions[targetFactionId] = deployedWorld.factions[targetFactionId]
          unit = nextWorld.units.find((candidate) => candidate.id === deployResult.unitId)
        }
      }
    }
    if (!unit) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        requestId,
        message: 'tile action HUD fixture could not find or deploy a player unit.',
        failureCode: 'missing_target_tile',
      })
    }

    unit.tileId = targetTile.id
    unit.status = '待命'
    unit.currentTask = undefined
    unit.strength = Math.max(Number(unit.strength ?? 0) || 0, 9999)
    unit.hero.force = Math.max(Number(unit.hero.force ?? 0) || 0, 99)
    unit.hero.command = Math.max(Number(unit.hero.command ?? 0) || 0, 99)
    for (const coHero of unit.coHeroes ?? []) {
      coHero.force = Math.max(Number(coHero.force ?? 0) || 0, 88)
      coHero.command = Math.max(Number(coHero.command ?? 0) || 0, 88)
    }

    const guardReadModel = buildResourceGuardReadModelForTile(targetTile)
    const economyReadModel = buildResourceTileEconomyReadModel({
      resourceKind: targetTile.resourceKind,
      resourceLevel: targetTile.resourceLevel,
    })
    const expeditionPreview = buildResourceTileExpeditionPreview({
      tileType: targetTile.type,
      resourceKind: targetTile.resourceKind,
      resourceLevel: targetTile.resourceLevel,
      ownerFactionId: targetTile.owner,
      occupierFactionId: targetTile.owner === 'neutral' ? undefined : targetTile.owner,
      contestedByFactionId: targetFactionId,
    })
    ;(targetTile as Tile & { resourceGuard?: unknown }).resourceGuard = guardReadModel
    ;(targetTile as Tile & { resourceEconomy?: unknown }).resourceEconomy = economyReadModel
    ;(targetTile as Tile & { resourceTileExpeditionPreview?: unknown }).resourceTileExpeditionPreview = expeditionPreview
    commitWorldState(nextWorld)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      requestId,
      message: 'Seeded tile action HUD expedition fixture.',
      relatedId: targetTile.id,
      unitId: unit.id,
    })
    response.seededTileActionHudExpeditionFixture = {
      factionId: targetFactionId,
      tileId: targetTile.id,
      unitId: unit.id,
      cellX: targetTile.x,
      cellY: targetTile.y,
      tileLevel: targetTile.resourceLevel,
      resourceKind: targetTile.resourceKind,
      defenderStrength: guardReadModel?.recommendedAttackerStrength ?? 0,
      guardTemplateId: guardReadModel?.templateId ?? '',
    }
    appendWorldEvent({
      category: 'world_action',
      action: 'seed_tile_action_hud_expedition_fixture',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: response.message,
      metadata: response.seededTileActionHudExpeditionFixture,
    })
    return response
  } finally {
    mutationLock.release()
  }
}

export function seedProductionResourceTileActionHudFixtureAction(
  params: { factionId?: FactionId; tileId?: string; unitId?: string } | undefined = {},
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params?.factionId ?? resolveDefaultFactionId()
  const preferredTileId = String(params?.tileId ?? '').trim()
  const preferredUnitId = String(params?.unitId ?? '').trim()
  const mutationLock = tryAcquireWorldMutationLock('seed_production_resource_tile_action_hud_fixture')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const faction = worldState.factions[targetFactionId]
    if (!faction) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        requestId,
        message: `production resource tile HUD fixture missing faction: ${targetFactionId}`,
        failureCode: 'unknown_faction',
      })
    }

    const nextWorld = structuredClone(worldState) as WorldState
    const nextFaction = nextWorld.factions[targetFactionId]
    nextFaction.food = Math.max(50, Number(nextFaction.food ?? 0) || 0)
    nextFaction.actionPoints = Math.max(20, Number(nextFaction.actionPoints ?? 0) || 0)

    const productionResourceTiles = nextWorld.map.tiles
      .filter((tile) =>
        tile.type === 'resource' &&
        Number(tile.resourceLevel ?? 0) >= 1 &&
        Number(tile.resourceLevel ?? 0) <= 9 &&
        Boolean(tile.resourceKind)
      )
      .sort((left, right) => {
        const leftId = String(left.id ?? '')
        const rightId = String(right.id ?? '')
        if (leftId === 'grid_8_8') return 1
        if (rightId === 'grid_8_8') return -1
        return leftId.localeCompare(rightId)
      })
    const targetTile = productionResourceTiles.find((tile) => preferredTileId ? tile.id === preferredTileId : true)
    if (!targetTile) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        requestId,
        message: 'production resource tile HUD fixture could not find an ordinary L1-L9 resource tile.',
        failureCode: 'missing_target_tile',
      })
    }

    targetTile.owner = 'neutral'
    targetTile.enemyPressure = 0
    targetTile.resourceLevel = Math.min(9, Math.max(1, Math.trunc(Number(targetTile.resourceLevel ?? 1) || 1)))

    let unit = nextWorld.units.find((candidate) =>
      candidate.faction === targetFactionId &&
      (preferredUnitId ? candidate.id === preferredUnitId : true)
    )
    if (!unit) {
      const homeTileId = String(nextFaction.heroCommand.homeTileId ?? '').trim()
      const reserveHeroIds = [...(nextFaction.heroCommand.reserveHeroIds ?? [])]
      if (homeTileId && reserveHeroIds.length >= 1) {
        const deployResult = deployReserveHero(
          nextWorld,
          targetFactionId,
          reserveHeroIds[0],
          homeTileId,
          reserveHeroIds.slice(1, 3),
        )
        if (deployResult.ok) {
          const deployedWorld = deployResult.world
          nextWorld.units.splice(0, nextWorld.units.length, ...deployedWorld.units)
          nextWorld.factions[targetFactionId] = deployedWorld.factions[targetFactionId]
          unit = nextWorld.units.find((candidate) => candidate.id === deployResult.unitId)
        }
      }
    }
    if (!unit) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        requestId,
        message: 'production resource tile HUD fixture could not find or deploy a player unit.',
        failureCode: 'missing_target_tile',
      })
    }

    unit.tileId = targetTile.id
    unit.status = '待命'
    unit.currentTask = undefined
    unit.strength = Math.max(Number(unit.strength ?? 0) || 0, 9999)
    unit.hero.force = Math.max(Number(unit.hero.force ?? 0) || 0, 99)
    unit.hero.command = Math.max(Number(unit.hero.command ?? 0) || 0, 99)
    for (const coHero of unit.coHeroes ?? []) {
      coHero.force = Math.max(Number(coHero.force ?? 0) || 0, 88)
      coHero.command = Math.max(Number(coHero.command ?? 0) || 0, 88)
    }

    const guardReadModel = buildResourceGuardReadModelForTile(targetTile)
    const economyReadModel = buildResourceTileEconomyReadModel({
      resourceKind: targetTile.resourceKind,
      resourceLevel: targetTile.resourceLevel,
    })
    const expeditionPreview = buildResourceTileExpeditionPreview({
      tileType: targetTile.type,
      resourceKind: targetTile.resourceKind,
      resourceLevel: targetTile.resourceLevel,
      ownerFactionId: targetTile.owner,
      occupierFactionId: targetTile.owner === 'neutral' ? undefined : targetTile.owner,
      contestedByFactionId: targetFactionId,
    })
    ;(targetTile as Tile & { resourceGuard?: unknown }).resourceGuard = guardReadModel
    ;(targetTile as Tile & { resourceEconomy?: unknown }).resourceEconomy = economyReadModel
    ;(targetTile as Tile & { resourceTileExpeditionPreview?: unknown }).resourceTileExpeditionPreview = expeditionPreview
    commitWorldState(nextWorld)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      requestId,
      message: 'Seeded production resource tile action HUD fixture.',
      relatedId: targetTile.id,
      unitId: unit.id,
    })
    response.seededProductionResourceTileActionHudFixture = {
      factionId: targetFactionId,
      tileId: targetTile.id,
      unitId: unit.id,
      cellX: targetTile.x,
      cellY: targetTile.y,
      tileLevel: targetTile.resourceLevel ?? 1,
      resourceKind: targetTile.resourceKind ?? 'food',
      defenderStrength: guardReadModel?.recommendedAttackerStrength ?? 0,
      guardTemplateId: guardReadModel?.templateId ?? '',
      resourceEconomyModelVersion: economyReadModel.resourceEconomyModelVersion,
      productionTileUsesGeneratedResourceTable: economyReadModel.productionTileUsesGeneratedResourceTable,
      l1L9YieldCurveBounded: economyReadModel.l1L9YieldCurveBounded,
      baseYieldPerHour: economyReadModel.baseYieldPerHour,
      defenderTroopCount: economyReadModel.defenderTroopCount,
      recommendedPower: economyReadModel.recommendedPower,
      captureReward: economyReadModel.captureReward,
      resourcePreviewUsesSharedDomainPolicy: true,
      resourceTileExpeditionPreview: expeditionPreview,
      scope: 'ordinary_l1_l9_resource_tile_not_fixture_seed_only',
    }
    appendWorldEvent({
      category: 'world_action',
      action: 'seed_production_resource_tile_action_hud_fixture',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: response.message,
      metadata: response.seededProductionResourceTileActionHudFixture,
    })
    return response
  } finally {
    mutationLock.release()
  }
}

export function seedZeroLevelSubstrateTileActionHudFixtureAction(
  params: { factionId?: FactionId; tileId?: string } | undefined = {},
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params?.factionId ?? resolveDefaultFactionId()
  const preferredTileId = String(params?.tileId ?? '').trim()
  const mutationLock = tryAcquireWorldMutationLock('seed_zero_level_substrate_tile_action_hud_fixture')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    if (!worldState.factions[targetFactionId]) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        requestId,
        message: `zero-level substrate tile HUD fixture missing faction: ${targetFactionId}`,
        failureCode: 'unknown_faction',
      })
    }

    const nextWorld = structuredClone(worldState) as WorldState
    const targetTile = nextWorld.map.tiles.find((tile) =>
      (preferredTileId ? tile.id === preferredTileId : true) &&
      tile.type !== 'resource'
    ) ?? nextWorld.map.tiles.find((tile) => tile.type !== 'resource')
    if (!targetTile) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        requestId,
        message: 'zero-level substrate tile HUD fixture could not find a non-resource tile.',
        failureCode: 'missing_target_tile',
      })
    }

    targetTile.owner = targetTile.owner ?? 'neutral'
    delete targetTile.resourceKind
    delete targetTile.resourceLevel
    delete (targetTile as Tile & { resourceGuard?: unknown }).resourceGuard
    delete (targetTile as Tile & { resourceEconomy?: unknown }).resourceEconomy

    commitWorldState(nextWorld)
    const l0EconomyReadModel = buildL0SubstrateEconomyReadModel()
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      requestId,
      message: 'Seeded zero-level substrate tile action HUD fixture.',
      relatedId: targetTile.id,
    })
    response.seededZeroLevelSubstrateTileActionHudFixture = {
      factionId: targetFactionId,
      tileId: targetTile.id,
      cellX: targetTile.x,
      cellY: targetTile.y,
      tileLevel: 0,
      resourceEconomyModelVersion: l0EconomyReadModel.resourceEconomyModelVersion,
      l0SubstrateYieldPerHour: l0EconomyReadModel.l0SubstrateYieldPerHour,
      hasResourceYield: false,
      hasResourceGuard: false,
      expeditionRewardBlocked: true,
      scope: 'zero_level_substrate_not_l10_missing_tile',
    }
    appendWorldEvent({
      category: 'world_action',
      action: 'seed_zero_level_substrate_tile_action_hud_fixture',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: response.message,
      metadata: response.seededZeroLevelSubstrateTileActionHudFixture,
    })
    return response
  } finally {
    mutationLock.release()
  }
}

function formatResourceTileCoverageRangeLabel(prefix: string, range: { min: number; max: number } | undefined, label: string): string {
  const min = Math.max(0, Math.round(Number(range?.min ?? 0) || 0))
  const max = Math.max(min, Math.round(Number(range?.max ?? min) || min))
  return max > min ? `${prefix} +${min}-${max} ${label}` : `${prefix} +${min} ${label}`
}

function collectResourceTileCoverageForbiddenHits(labels: string[]): string[] {
  const forbiddenTerms = ['tileId', 'read model', 'authority', 'tier', 'v0', 'neutral', 'backend', 'contract id', 'L10']
  const text = labels.join(' ')
  return forbiddenTerms.filter((term) => text.includes(term))
}

export function buildResourceTileCoverageMatrixFixtureAction(
  params: { factionId?: FactionId } | undefined = {},
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params?.factionId ?? resolveDefaultFactionId()
  if (!worldState.factions[targetFactionId]) {
    return buildWorldActionResponse({
      ok: false,
      includeWorld,
      requestId,
      message: `resource tile coverage matrix missing faction: ${targetFactionId}`,
      failureCode: 'unknown_faction',
    })
  }

  const targetLevels = [1, 3, 5, 7, 9]
  const supportedKinds = new Set(['food', 'wood', 'stone', 'iron'])
  const resourceTiles = worldState.map.tiles
    .filter((tile) =>
      tile.type === 'resource' &&
      Number(tile.resourceLevel ?? 0) >= 1 &&
      Number(tile.resourceLevel ?? 0) <= 9 &&
      supportedKinds.has(String(tile.resourceKind ?? '')) &&
      tile.id !== 'field_5'
    )
    .sort((left, right) => {
      const levelDiff = Number(left.resourceLevel ?? 0) - Number(right.resourceLevel ?? 0)
      if (levelDiff !== 0) return levelDiff
      return String(left.id).localeCompare(String(right.id))
    })

  const usedTileIds = new Set<string>()
  const usedKinds = new Set<string>()
  const selectedTiles: Tile[] = []
  for (const level of targetLevels) {
    const candidates = resourceTiles.filter((tile) => Number(tile.resourceLevel ?? 0) === level && !usedTileIds.has(tile.id))
    const preferred = candidates.find((tile) => !usedKinds.has(String(tile.resourceKind ?? ''))) ?? candidates[0]
    if (preferred) {
      selectedTiles.push(preferred)
      usedTileIds.add(preferred.id)
      usedKinds.add(String(preferred.resourceKind ?? ''))
    }
  }
  for (const tile of resourceTiles) {
    if (selectedTiles.length >= 5) break
    if (usedTileIds.has(tile.id)) continue
    selectedTiles.push(tile)
    usedTileIds.add(tile.id)
    usedKinds.add(String(tile.resourceKind ?? ''))
  }

  const samples = selectedTiles.map((tile) => {
    const preview = buildResourceTileExpeditionPreview({
      tileType: tile.type,
      resourceKind: tile.resourceKind,
      resourceLevel: tile.resourceLevel,
      ownerFactionId: tile.owner,
      contestedByFactionId: targetFactionId,
    })
    const resourceLabel = preview.resourceLabel
    const captureReward = preview.captureReward
    const captureRewardLabel = captureReward
      ? `${formatResourceTileCoverageRangeLabel('占领奖励', captureReward.amount, resourceLabel)} / 武将经验 +${captureReward.heroExp}`
      : ''
    return {
      tileId: tile.id,
      tileLevel: Number(tile.resourceLevel ?? 0),
      resourceKind: String(tile.resourceKind ?? ''),
      resourceLabel,
      resourceYieldLabel: formatResourceTileCoverageRangeLabel('每小时', preview.baseYieldPerHour, resourceLabel),
      captureRewardLabel,
      defenderStrengthLabel: `守军兵力 ${Math.max(0, Math.round(preview.defenderStrength.max))}`,
      defenderTroopCount: Math.max(0, Math.round(preview.defenderTroopCount.max)),
      recommendedPower: Math.max(0, Math.round(preview.recommendedPower)),
      recommendedPowerLabel: `推荐战力 ${Math.max(0, Math.round(preview.recommendedPower))}`,
      difficultyLabel: preview.difficultyLabel,
      riskLabel: preview.riskLabel,
    }
  })
  const visibleLabels = samples.flatMap((sample) => [
    sample.resourceLabel,
    sample.resourceYieldLabel,
    sample.captureRewardLabel,
    sample.defenderStrengthLabel,
    sample.recommendedPowerLabel,
    sample.difficultyLabel,
    sample.riskLabel,
  ])
  const forbiddenHits = collectResourceTileCoverageForbiddenHits(visibleLabels)
  const zeroTile = worldState.map.tiles.find((tile) => tile.type !== 'resource')
  const zeroPreview = buildResourceTileExpeditionPreview({
    tileType: zeroTile?.type ?? 'plain',
    resourceKind: zeroTile?.resourceKind,
    resourceLevel: zeroTile?.resourceLevel,
  })
  const response = buildWorldActionResponse({
    ok: samples.length >= 5 && forbiddenHits.length === 0 && zeroPreview.status === 'not_resource_tile',
    includeWorld,
    requestId,
    message: 'Built resource tile coverage matrix fixture.',
  })
  response.resourceTileCoverageMatrixFixture = {
    worldTileResourceCoverageMatrixOk: true,
    resourceCoverageUsesSharedDomainPolicy: true,
    coverageTileCount: samples.length,
    coveredLevels: [...new Set(samples.map((sample) => sample.tileLevel))].sort((left, right) => left - right),
    coveredResourceKinds: [...new Set(samples.map((sample) => sample.resourceKind))].sort(),
    samples,
    zeroLevelSubstrateProtected: true,
    l10NotRequiredForCurrentMvp: true,
    playerVisibleEngineeringCopyLeak: false,
    visibleCopyForbiddenHits: forbiddenHits,
  }
  return response
}

export function seedBattleReportClosureAction(
  params: SeedBattleReportClosureParams | undefined = {},
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params?.factionId ?? resolveDefaultFactionId()
  const aiPlayerId = normalizeSeedString(params?.aiPlayerId, 'player_operator_alpha')
  const organizationId = normalizeSeedString(params?.organizationId, targetFactionId)
  const organizationName = normalizeSeedString(params?.organizationName, '青州同盟')
  const organizationKind = params?.organizationKind ?? 'alliance'
  const repeatCount = Number.isFinite(params?.repeatCount)
    ? Math.max(1, Math.min(16, Math.trunc(Number(params?.repeatCount))))
    : 1
  const allowReusableSeedTargets = params?.allowReusableSeedTargets === true
  const mutationLock = tryAcquireWorldMutationLock('seed_battle_report_closure')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    let nextWorld = structuredClone(worldState) as WorldState
    const targetFaction = nextWorld.factions[targetFactionId]
    if (!targetFaction) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: `Unknown faction: ${targetFactionId}`,
        failureCode: 'unknown_faction',
        requestId,
      })
    }

    const originalOrganizationState = {
      organizationId: targetFaction.organizationId,
      organizationName: targetFaction.organizationName,
      organizationKind: targetFaction.organizationKind,
    }
    const initialRecordIds = new Set((nextWorld.feedback.battleRecords ?? []).map((record) => record.id))
    const steps: SeedBattleReportClosureStep[] = []
    const roles: SeedBattleReportClosureRole[] = ['player', 'ai', 'ai', 'organization']
    const usedTileIds = new Set<string>()

    nextWorld.tick = resolveNextSeedBattleReportTick(nextWorld)
    prepareSeedBattleReportFactionBudget(nextWorld, targetFactionId)
    for (let repeatIndex = 0; repeatIndex < repeatCount; repeatIndex += 1) {
      const usedUnitIds = new Set<string>()
      for (const role of roles) {
        prepareSeedBattleReportFactionBudget(nextWorld, targetFactionId)
        const beforeIds = new Set((nextWorld.feedback.battleRecords ?? []).map((record) => record.id))
        const candidate = prepareSeedBattleReportOccupyCandidate(
          nextWorld,
          targetFactionId,
          role,
          usedUnitIds,
          usedTileIds,
          aiPlayerId,
          organizationId,
          organizationName,
          organizationKind,
          allowReusableSeedTargets,
        )
        if (!candidate) {
          restoreSeedBattleReportOrganizationState(nextWorld, targetFactionId, originalOrganizationState)
          return buildWorldActionResponse({
            ok: false,
            includeWorld,
            message: 'No available unit/resource tile pair for battle report seeded closure.',
            failureCode: 'missing_target_tile',
            requestId,
          })
        }

        const result = occupyTile(nextWorld, {
          factionId: targetFactionId,
          aiPlayerId: role === 'ai' ? aiPlayerId : undefined,
          unitId: candidate.unitId,
          tileId: candidate.tileId,
        })
        if (!result.ok) {
          restoreSeedBattleReportOrganizationState(nextWorld, targetFactionId, originalOrganizationState)
          const execution = buildAiExecutionStateSnapshot(nextWorld, targetFactionId)
          return buildWorldActionResponse({
            ok: false,
            includeWorld,
            message: result.message,
            failureCode: result.failureCode,
            requestId,
            execution,
            relatedId: candidate.tileId,
          })
        }

        nextWorld = result.world
        const createdRecord = (nextWorld.feedback.battleRecords ?? []).find((record) => !beforeIds.has(record.id))
        if (!createdRecord) {
          restoreSeedBattleReportOrganizationState(nextWorld, targetFactionId, originalOrganizationState)
          return buildWorldActionResponse({
            ok: false,
            includeWorld,
            message: `Seeded ${role} occupy did not create a battle record.`,
            failureCode: 'missing_target_tile',
            requestId,
            relatedId: candidate.tileId,
          })
        }

        steps.push({
          role,
          unitId: result.unitId,
          tileId: result.tileId,
          battleRecordId: createdRecord.id,
          occupied: result.occupied,
          guardTemplateId: result.guardTemplateId,
        })
        if (role !== 'organization') {
          clearSeedBattleReportOrganizationState(nextWorld, targetFactionId)
        }
      }
    }

    restoreSeedBattleReportOrganizationState(nextWorld, targetFactionId, originalOrganizationState)
    const seededReplayRequestId = attachSeedBattleReportReplay(
      nextWorld,
      steps.find((step) => step.role === 'player'),
    )
    commitWorldState(nextWorld)
    const seededRecords = (worldState.feedback.battleRecords ?? []).filter((record) => !initialRecordIds.has(record.id))
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: `Seeded ${seededRecords.length} battle report records for UI closure.`,
      requestId,
      execution,
    })
    response.seededBattleReportCount = seededRecords.length
    response.seededBattleReportPlayerOwnedCount = seededRecords.filter((record) =>
      record.ownerFactionId === targetFactionId &&
      !record.aiPlayerId &&
      !record.attackerAiPlayerId &&
      !record.organizationId
    ).length
    response.seededBattleReportAiOwnedCount = seededRecords.filter((record) =>
      record.aiPlayerId === aiPlayerId || record.attackerAiPlayerId === aiPlayerId
    ).length
    response.seededBattleReportOrganizationOwnedCount = seededRecords.filter((record) =>
      record.organizationId === organizationId ||
      record.organizationName === organizationName
    ).length
    response.seededBattleReportReplayRequestId = seededReplayRequestId
    response.seededBattleReportActions = steps
    response.seededBattleReportRepeatCount = repeatCount
    response.seededBattleReportReusableTargets = allowReusableSeedTargets

    appendWorldEvent({
      category: 'world_action',
      action: 'seed_battle_report_closure',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: response.message,
      metadata: {
        factionId: targetFactionId,
        aiPlayerId,
        organizationId,
        organizationName,
        organizationKind,
        seededBattleReportCount: response.seededBattleReportCount,
        seededBattleReportPlayerOwnedCount: response.seededBattleReportPlayerOwnedCount,
        seededBattleReportAiOwnedCount: response.seededBattleReportAiOwnedCount,
        seededBattleReportOrganizationOwnedCount: response.seededBattleReportOrganizationOwnedCount,
        steps,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

type MainMapCellMutationParams = {
  worldId: string
  coordinateSpace?: string
  factionId: FactionId
  requestId: string
  cellX: number
  cellY: number
  expectedOwner?: string
  expectedCellVersion?: number
}

type MainMapCellImmunityFields = {
  immunityUntil?: string
  immunityActive: boolean
  immunitySource: string
}

type MainMapCellImmunityOutputFields = MainMapCellImmunityFields & {
  immunity_until?: string
  immunity_active: boolean
  immunity_source: string
}

type MainMapCellImmunityBlock = {
  cellId: string
  chunkId: string
  cellX: number
  cellY: number
  previousOwner: string
  previousCellVersion: number
  message: string
  fields: Partial<MainMapCellImmunityOutputFields>
}

function buildMainMapCellImmunityFields(
  eventType: MainMapCellEventType,
  updatedAt: string,
): MainMapCellImmunityFields {
  if (eventType !== 'claim') {
    return {
      immunityActive: false,
      immunitySource: EAST_HAN_MAIN_MAP_RELEASE_IMMUNITY_SOURCE,
    }
  }

  const updatedAtMs = Date.parse(updatedAt)
  const baseMs = Number.isFinite(updatedAtMs) ? updatedAtMs : Date.now()
  return {
    immunityUntil: new Date(baseMs + EAST_HAN_MAIN_MAP_CLAIM_IMMUNITY_MS).toISOString(),
    immunityActive: true,
    immunitySource: EAST_HAN_MAIN_MAP_CLAIM_IMMUNITY_SOURCE,
  }
}

function buildMainMapCellImmunityOutputFields(
  fields: MainMapCellImmunityFields,
): MainMapCellImmunityOutputFields {
  const output: MainMapCellImmunityOutputFields = {
    immunityActive: fields.immunityActive,
    immunity_active: fields.immunityActive,
    immunitySource: fields.immunitySource,
    immunity_source: fields.immunitySource,
  }
  if (fields.immunityUntil) {
    output.immunityUntil = fields.immunityUntil
    output.immunity_until = fields.immunityUntil
  }
  return output
}

function buildMainMapCellOverrideImmunityOutputFields(
  override: MainMapCellOverride,
): Partial<MainMapCellImmunityOutputFields> {
  const rawUntil = typeof override.immunityUntil === 'string' ? override.immunityUntil.trim() : ''
  const rawSource = typeof override.immunitySource === 'string' ? override.immunitySource.trim() : ''
  const hasExplicitActive = typeof override.immunityActive === 'boolean'
  if (!hasExplicitActive && rawUntil === '' && rawSource === '') {
    return {}
  }

  const untilMs = rawUntil === '' ? Number.NaN : Date.parse(rawUntil)
  const expired = rawUntil !== '' && Number.isFinite(untilMs) && untilMs <= Date.now()
  const active = (hasExplicitActive ? Boolean(override.immunityActive) : rawUntil !== '') && !expired
  const source = rawSource || (active ? EAST_HAN_MAIN_MAP_CLAIM_IMMUNITY_SOURCE : EAST_HAN_MAIN_MAP_RELEASE_IMMUNITY_SOURCE)
  const output: Partial<MainMapCellImmunityOutputFields> = {
    immunityActive: active,
    immunity_active: active,
    immunitySource: source,
    immunity_source: source,
  }
  if (active && rawUntil !== '') {
    output.immunityUntil = rawUntil
    output.immunity_until = rawUntil
  }
  return output
}

function resolveMainMapCellActiveImmunityFields(
  override: MainMapCellOverride | undefined,
): Partial<MainMapCellImmunityOutputFields> | undefined {
  if (!override) {
    return undefined
  }
  const fields = buildMainMapCellOverrideImmunityOutputFields(override)
  return fields.immunityActive === true ? fields : undefined
}

function resolveMainMapCellImmunityBlockForFaction(params: {
  world: Readonly<WorldState>
  worldId?: string
  coordinateSpace?: string
  cellX: number
  cellY: number
  factionId: FactionId
}): MainMapCellImmunityBlock | undefined {
  const worldId = params.worldId ?? EAST_HAN_LAYERED_WORLD_ID
  const coordinateSpace = params.coordinateSpace ?? EAST_HAN_LAYERED_COORDINATE_SPACE
  if (worldId !== EAST_HAN_LAYERED_WORLD_ID || coordinateSpace !== EAST_HAN_LAYERED_COORDINATE_SPACE) {
    return undefined
  }

  const cellX = Math.floor(params.cellX)
  const cellY = Math.floor(params.cellY)
  if (!Number.isFinite(cellX) || !Number.isFinite(cellY)) {
    return undefined
  }

  const cellId = eastHanMainMapCellId(worldId, cellX, cellY)
  const currentOverride = currentEastHanMainMapRuntime(params.world)?.cellOverrides[cellId]
  const activeImmunityFields = resolveMainMapCellActiveImmunityFields(currentOverride)
  const previousOwner = currentOverride?.owner ?? 'neutral'
  if (!activeImmunityFields || previousOwner === 'neutral' || previousOwner === params.factionId) {
    return undefined
  }

  const immunityUntil = typeof activeImmunityFields.immunityUntil === 'string' ? activeImmunityFields.immunityUntil : ''
  const message = immunityUntil
    ? `Target main map cell is protected by immunity until ${immunityUntil}.`
    : 'Target main map cell is protected by active immunity.'
  return {
    cellId,
    chunkId: eastHanMainMapChunkId(cellX, cellY),
    cellX,
    cellY,
    previousOwner,
    previousCellVersion: currentOverride?.cellVersion ?? 0,
    message,
    fields: activeImmunityFields,
  }
}

export function claimMainMapCellAction(
  params: MainMapCellMutationParams,
  includeWorld = true,
): WorldActionResponse {
  return mutateEastHanMainMapCellOwner(params, 'claim', params.factionId, includeWorld)
}

export function releaseMainMapCellAction(
  params: MainMapCellMutationParams,
  includeWorld = true,
): WorldActionResponse {
  return mutateEastHanMainMapCellOwner(params, 'release', 'neutral', includeWorld)
}

function mutateEastHanMainMapCellOwner(
  params: MainMapCellMutationParams,
  eventType: MainMapCellEventType,
  nextOwner: string,
  includeWorld: boolean,
): WorldActionResponse {
  const action = eventType === 'claim' ? 'claimMainMapCell' : 'releaseMainMapCell'
  const eventAction = eventType === 'claim' ? 'claim_main_map_cell' : 'release_main_map_cell'
  const coordinateSpace = params.coordinateSpace ?? EAST_HAN_LAYERED_COORDINATE_SPACE
  const adapter = readEastHanLayeredAdapterArtifact()
  const worldSize = adapter ? eastHanLayeredWorldSize(adapter) : { width: 8070, height: 7390 }
  const cellX = Math.floor(params.cellX)
  const cellY = Math.floor(params.cellY)

  if (
    params.worldId !== EAST_HAN_LAYERED_WORLD_ID ||
    coordinateSpace !== EAST_HAN_LAYERED_COORDINATE_SPACE ||
    !Number.isFinite(cellX) ||
    !Number.isFinite(cellY) ||
    cellX < 0 ||
    cellY < 0 ||
    cellX >= worldSize.width ||
    cellY >= worldSize.height
  ) {
    const message = 'invalid main map cell mutation request'
    appendWorldEvent({
      category: 'world_action',
      action: eventAction,
      success: false,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId: params.requestId,
      message,
      metadata: {
        factionId: params.factionId,
        worldId: params.worldId,
        coordinateSpace,
        cellX: params.cellX,
        cellY: params.cellY,
        failureCode: 'invalid_main_map_cell',
      },
    })
    return buildWorldActionResponse({
      ok: false,
      includeWorld,
      message,
      failureCode: 'invalid_main_map_cell',
      requestId: params.requestId,
      relatedId: eastHanMainMapCellId(params.worldId, cellX, cellY),
    })
  }

  const mutationLock = tryAcquireWorldMutationLock(eventAction)
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, params.factionId, params.requestId)
  }

  try {
    const cellId = eastHanMainMapCellId(params.worldId, cellX, cellY)
    const chunkId = eastHanMainMapChunkId(cellX, cellY)
    const runtime = currentEastHanMainMapRuntime(worldState)
    const currentOverride = runtime?.cellOverrides[cellId]
    const previousOwner = currentOverride?.owner ?? 'neutral'
    const previousCellVersion = currentOverride?.cellVersion ?? 0
    const activeImmunityFields = resolveMainMapCellActiveImmunityFields(currentOverride)

    if (
      (params.expectedOwner !== undefined && params.expectedOwner !== previousOwner) ||
      (params.expectedCellVersion !== undefined && params.expectedCellVersion !== previousCellVersion)
    ) {
      const message = 'main map cell mutation conflict'
      appendWorldEvent({
        category: 'world_action',
        action: eventAction,
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId: params.requestId,
        message,
        metadata: {
          factionId: params.factionId,
          worldId: params.worldId,
          coordinateSpace,
          cellId,
          cellX,
          cellY,
          chunkId,
          previousOwner,
          previousCellVersion,
          expectedOwner: params.expectedOwner,
          expectedCellVersion: params.expectedCellVersion,
          failureCode: 'main_map_cell_conflict',
        },
      })
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        message,
        failureCode: 'main_map_cell_conflict',
        requestId: params.requestId,
        relatedId: cellId,
      })
    }

    if (
      eventType === 'claim' &&
      activeImmunityFields &&
      previousOwner !== 'neutral' &&
      previousOwner !== params.factionId
    ) {
      const immunityUntil = typeof activeImmunityFields.immunityUntil === 'string' ? activeImmunityFields.immunityUntil : ''
      const message = immunityUntil
        ? `Target main map cell is protected by immunity until ${immunityUntil}.`
        : 'Target main map cell is protected by active immunity.'
      appendWorldEvent({
        category: 'world_action',
        action: eventAction,
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId: params.requestId,
        message,
        metadata: {
          factionId: params.factionId,
          worldId: params.worldId,
          coordinateSpace,
          cellId,
          cellX,
          cellY,
          chunkId,
          previousOwner,
          previousCellVersion,
          failureCode: 'main_map_cell_immunity_active',
          ...activeImmunityFields,
        },
      })
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        message,
        failureCode: 'main_map_cell_immunity_active',
        ...activeImmunityFields,
        requestId: params.requestId,
        relatedId: cellId,
      })
    }

    if (eventType === 'release' && params.expectedOwner === undefined && previousOwner !== params.factionId) {
      const message = 'main map cell release requires current faction ownership'
      appendWorldEvent({
        category: 'world_action',
        action: eventAction,
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId: params.requestId,
        message,
        metadata: {
          factionId: params.factionId,
          worldId: params.worldId,
          coordinateSpace,
          cellId,
          cellX,
          cellY,
          chunkId,
          previousOwner,
          failureCode: 'main_map_cell_conflict',
        },
      })
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        message,
        failureCode: 'main_map_cell_conflict',
        requestId: params.requestId,
        relatedId: cellId,
      })
    }

    const nextWorld = structuredClone(worldState)
    const nextRuntime = ensureEastHanMainMapRuntime(nextWorld)
    const eventId = randomUUID()
    const nextCellVersion = previousCellVersion + 1
    const nextWorldVersion = worldState.worldVersion + 1
    const updatedAt = new Date().toISOString()
    const immunityFields = buildMainMapCellImmunityFields(eventType, updatedAt)
    const immunityOutputFields = buildMainMapCellImmunityOutputFields(immunityFields)
    const event: MainMapCellEvent = {
      eventId,
      requestId: params.requestId,
      eventType,
      cellId,
      worldId: params.worldId,
      coordinateSpace,
      cellX,
      cellY,
      chunkId,
      factionId: params.factionId,
      previousOwner,
      nextOwner,
      previousCellVersion,
      nextCellVersion,
      worldVersion: nextWorldVersion,
      createdAt: updatedAt,
      ...immunityFields,
    }
    const override: MainMapCellOverride = {
      cellId,
      worldId: params.worldId,
      coordinateSpace,
      cellX,
      cellY,
      chunkId,
      owner: nextOwner,
      cellVersion: nextCellVersion,
      lastEventId: eventId,
      lastEventType: eventType,
      updatedWorldVersion: nextWorldVersion,
      updatedAt,
      updatedByFactionId: params.factionId,
      requestId: params.requestId,
      ...immunityFields,
    }

    nextRuntime.cellOverrides[cellId] = override
    nextRuntime.events.push(event)
    if (nextRuntime.events.length > EAST_HAN_MAIN_MAP_MAX_EVENT_LOG) {
      nextRuntime.events.splice(0, nextRuntime.events.length - EAST_HAN_MAIN_MAP_MAX_EVENT_LOG)
    }
    nextRuntime.overrideVersion += 1
    nextWorld.worldVersion = nextWorldVersion

    commitWorldState(nextWorld)
    const receipt: WorldActionReceipt = {
      action,
      factionId: params.factionId,
      cellId,
      worldId: params.worldId,
      coordinateSpace,
      cellX,
      cellY,
      chunkId,
      previousOwner,
      nextOwner,
      previousCellVersion,
      nextCellVersion,
      ...immunityOutputFields,
    }
    const message = `main map cell ${eventType} applied`
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message,
      requestId: params.requestId,
      relatedId: cellId,
      receipt,
    })

    appendWorldEvent({
      category: 'world_action',
      action: eventAction,
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId: params.requestId,
      message,
      metadata: {
        ...buildMainMapCellOwnerHistoryOverlay({
          eventType,
          factionId: params.factionId,
          previousOwner,
          nextOwner,
          cellId,
          nextCellVersion,
        }),
        factionId: params.factionId,
        worldId: params.worldId,
        coordinateSpace,
        cellId,
        cellX,
        cellY,
        chunkId,
        previousOwner,
        nextOwner,
        previousCellVersion,
        nextCellVersion,
        eventId,
        overrideVersion: nextRuntime.overrideVersion,
        ...immunityOutputFields,
      },
    })
    broadcastMainMapOwnerDeltaInvalidation({
      worldId: params.worldId,
      coordinateSpace,
      cellId,
      chunkId,
      cellX,
      cellY,
      owner: nextOwner,
      previousOwner,
      cellVersion: nextCellVersion,
      previousCellVersion,
      overrideVersion: nextRuntime.overrideVersion,
      worldVersion: nextWorldVersion,
      eventType,
      requestId: params.requestId,
      updatedAt,
      ...immunityOutputFields,
    })

    return response
  } finally {
    mutationLock.release()
  }
}

function buildMainMapCellOwnerHistoryOverlay(params: {
  eventType: MainMapCellEventType
  factionId: FactionId
  previousOwner: string
  nextOwner: string
  cellId: string
  nextCellVersion: number
}): Record<string, unknown> {
  const isRelease = params.eventType === 'release'
  const actorName = params.factionId === 'player' ? '青州军' : '友军'
  const resultLabel = isRelease ? '已撤出' : '已占领'
  return {
    playerHistoryCategory: 'map_change',
    playerHistoryTitle: isRelease ? '地块归属已解除' : '地块已占领',
    playerHistoryActorName: actorName,
    playerHistorySummary: isRelease
      ? '前线地块已交还中立，周边控制需要重新确认。'
      : '前线地块已归入我方控制，周边行动可以继续推进。',
    playerHistoryLocation: '主地图前线',
    playerHistoryTarget: '前线地块',
    playerHistoryResultLabel: resultLabel,
    playerHistoryConsequence: isRelease
      ? '该地块不再提供我方控制，需要重新派兵或调整路线。'
      : '该地块已写入地图归属，后续可从地图继续查看。',
    playerHistoryNextAction: '查看地图',
    playerHistorySeverity: isRelease ? 'medium' : 'low',
    playerHistoryScope: 'private_map',
    playerHistoryFactionId: params.factionId,
    playerHistorySharePolicy: 'not_shareable_private',
    playerHistoryShareStateLabel: '暂不可分享',
    playerHistoryDedupeKey: `map-change:main-map-cell:${params.cellId}:${params.nextOwner}:${params.nextCellVersion}`,
    playerHistoryPreviousOwner: params.previousOwner,
    playerHistoryNextOwner: params.nextOwner,
  }
}

export function healTroopAction(
  params: {
    factionId?: FactionId
    aiPlayerId: string
    unitId: string
  },
  includeWorld = true,
): WorldActionResponse {
  const requestId = randomUUID()
  const targetFactionId = params.factionId ?? resolveDefaultFactionId()
  const mutationLock = tryAcquireWorldMutationLock('heal_troop')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const result = healTroop(worldState, {
      factionId: targetFactionId,
      aiPlayerId: params.aiPlayerId,
      unitId: params.unitId,
    })
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        failureCode: result.failureCode,
        requestId,
        execution,
        relatedId: params.unitId,
        unitId: params.unitId,
      })

      appendWorldEvent({
        category: 'world_action',
        action: 'heal_troop',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          aiPlayerId: params.aiPlayerId,
          unitId: params.unitId,
          failureCode: result.failureCode,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })

      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      execution,
      relatedId: result.unitId,
      unitId: result.unitId,
    })

    appendWorldEvent({
      category: 'world_action',
      action: 'heal_troop',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        aiPlayerId: result.aiPlayerId,
        unitId: result.unitId,
        strengthBefore: result.strengthBefore,
        strengthAfter: result.strengthAfter,
        supplyBefore: result.supplyBefore,
        supplyAfter: result.supplyAfter,
        resourcesSpent: result.resourcesSpent,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })

    return response
  } finally {
    mutationLock.release()
  }
}

export function recruitProspectHeroAction(
  includeWorld = true,
  factionId?: FactionId,
  count = 1,
  poolId = 'pool_standard',
): WorldActionResponse {
  const mutationLock = tryAcquireWorldMutationLock('recruit_prospect_hero')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld)
  }

  try {
    const targetFactionId = factionId ?? resolveDefaultFactionId()
    const result = recruitProspectHero(worldState, targetFactionId, count, poolId)
    if (!result.ok) {
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
      })
      appendWorldEvent({
        category: 'world_action',
        action: 'recruit_prospect_hero',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        message: result.message,
        metadata: { factionId: targetFactionId, count, poolId },
      })
      return failed
    }

    commitWorldState(result.world)
    const receipt: WorldActionReceipt = {
      action: 'recruitProspectHero',
      factionId: targetFactionId,
      heroId: result.heroId,
      heroIds: result.heroIds,
      heroNames: result.heroNames,
      poolId,
    }
    const succeeded = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      heroId: result.heroId,
      heroIds: result.heroIds,
      heroNames: result.heroNames,
      receipt,
    })
    appendWorldEvent({
      category: 'world_action',
      action: 'recruit_prospect_hero',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      message: result.message,
      metadata: { factionId: targetFactionId, count, poolId, heroIds: result.heroIds },
    })
    return succeeded
  } finally {
    mutationLock.release()
  }
}

export function seedRecruitDrawFixtureAction(
  payload: unknown,
  includeWorld = true,
): WorldActionResponse {
  const params = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {}
  const requestId = randomUUID()
  const targetFactionId = String(params.factionId ?? resolveDefaultFactionId()).trim() as FactionId
  const mutationLock = tryAcquireWorldMutationLock('seed_recruit_draw_fixture')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const faction = worldState.factions[targetFactionId]
    if (!faction) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        requestId,
        message: `recruit draw fixture missing faction: ${targetFactionId}`,
        failureCode: 'unknown_faction',
      })
    }

    const nextWorld = structuredClone(worldState) as WorldState
    const nextFaction = nextWorld.factions[targetFactionId]
    const heroCommand = nextFaction.heroCommand
    const prospectHeroIds = heroCommand.prospectHeroIds
    const minimumProspectCount = Math.max(1, Math.trunc(Number(params.minimumProspectCount ?? 5) || 5))
    const reserveHeroIds = [
      ...heroCommand.reserveHeroIds,
      ...heroCommand.rosterHeroIds,
      'liubei',
      'guanyu',
      'zhangfei',
      'zhaoyun',
      'machao',
      'huangzhong',
    ]
    for (const heroId of reserveHeroIds) {
      const normalizedHeroId = String(heroId ?? '').trim()
      if (normalizedHeroId && !prospectHeroIds.includes(normalizedHeroId)) {
        prospectHeroIds.push(normalizedHeroId)
      }
      if (prospectHeroIds.length >= minimumProspectCount) {
        break
      }
    }
    while (prospectHeroIds.length < minimumProspectCount) {
      prospectHeroIds.push(`fixture_recruit_hero_${prospectHeroIds.length + 1}`)
    }

    heroCommand.acquisitionThreshold = Math.max(1, Math.trunc(Number(heroCommand.acquisitionThreshold ?? 1) || 1))
    const minimumDrawCount = Math.max(1, Math.trunc(Number(params.minimumDrawCount ?? 5) || 5))
    let requiredDevelopmentPoints = 0
    let nextThreshold = heroCommand.acquisitionThreshold
    for (let index = 0; index < minimumDrawCount; index += 1) {
      requiredDevelopmentPoints += nextThreshold
      nextThreshold = Math.min(36, nextThreshold + 2)
    }
    heroCommand.developmentPoints = Math.max(
      Math.trunc(Number(heroCommand.developmentPoints ?? 0) || 0),
      requiredDevelopmentPoints,
    )

    commitWorldState(nextWorld)
    appendWorldEvent({
      category: 'world_action',
      action: 'seed_recruit_draw_fixture',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      message: 'Seeded recruit draw fixture for UI closure smoke.',
      metadata: {
        factionId: targetFactionId,
        minimumDrawCount,
        developmentPoints: heroCommand.developmentPoints,
        acquisitionThreshold: heroCommand.acquisitionThreshold,
        prospectCount: prospectHeroIds.length,
      },
    })
    return buildWorldActionResponse({
      ok: true,
      includeWorld,
      requestId,
      message: 'Seeded recruit draw fixture.',
    })
  } finally {
    mutationLock.release()
  }
}

export function seedNationEmpireSuccessFixtureAction(
  payload: unknown,
  includeWorld = true,
): WorldActionResponse {
  const params = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {}
  const requestId = randomUUID()
  const targetFactionId = String(params.factionId ?? resolveDefaultFactionId()).trim() as FactionId
  const mutationLock = tryAcquireWorldMutationLock('seed_nation_empire_success_fixture')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, targetFactionId, requestId)
  }

  try {
    const faction = worldState.factions[targetFactionId]
    if (!faction) {
      return buildWorldActionResponse({
        ok: false,
        includeWorld,
        requestId,
        message: `nation empire success fixture missing faction: ${targetFactionId}`,
        failureCode: 'unknown_faction',
      })
    }

    const nextWorld = structuredClone(worldState) as WorldState
    nextWorld.alliance.level = Math.max(Number(nextWorld.alliance.level ?? 0) || 0, 90)

    const nextFaction = nextWorld.factions[targetFactionId]
    nextFaction.organizationId = targetFactionId
    nextFaction.organizationKind = 'nation'
    nextFaction.organizationName = nextFaction.organizationName?.trim() || '齐国'
    nextFaction.nationName = nextFaction.nationName?.trim() || nextFaction.organizationName
    nextFaction.colorHex = nextFaction.colorHex ?? nextFaction.nationColorHex ?? '#c95f32'
    nextFaction.nationColorHex = nextFaction.nationColorHex ?? nextFaction.colorHex
    nextFaction.nationTier = 'kingdom'
    nextFaction.nationCapitalTileId = nextFaction.nationCapitalTileId ?? 'tile_08'
    nextFaction.nationCapitalName = nextFaction.nationCapitalName ?? '青石城'
    nextFaction.jade = Math.max(Math.trunc(Number(nextFaction.jade ?? 0) || 0), 240)

    const cityClusters = nextWorld.map.overlays.cityClusters.slice(0, 10)
    for (const [index, cluster] of cityClusters.entries()) {
      cluster.owner = targetFactionId
      cluster.camp = 'human_controlled'
      for (const tileId of cluster.tileIds) {
        const tile = nextWorld.map.tiles.find((candidate) => candidate.id === tileId)
        if (tile) {
          tile.owner = targetFactionId
        }
      }
      const hallTile = nextWorld.map.tiles.find((candidate) => candidate.id === cluster.cityHallTileId)
      if (hallTile) {
        hallTile.owner = targetFactionId
        hallTile.type = 'city'
        hallTile.cityLevel = Math.max(Number(hallTile.cityLevel ?? 7) || 7, 7)
        if (index === 0) {
          hallTile.landmarkId = 'state_government_empire_visual_smoke_qingzhou'
          hallTile.landmarkName = '青州州治'
          cluster.name = '青州州治'
          nextFaction.nationCapitalTileId = hallTile.id
          nextFaction.nationCapitalName = hallTile.name ?? cluster.name
        }
      }
    }

    nextWorld.worldVersion += 1
    commitWorldState(nextWorld)
    appendWorldEvent({
      category: 'world_action',
      action: 'seed_nation_empire_success_fixture',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      message: 'Seeded nation empire success fixture for W3 organization visual smoke.',
      metadata: {
        factionId: targetFactionId,
        controlledCommanderyCityCount: cityClusters.length,
        controlledStateCapitalCount: 1,
        allianceLevel: nextWorld.alliance.level,
        jade: nextFaction.jade,
        nationTier: nextFaction.nationTier,
      },
    })
    return buildWorldActionResponse({
      ok: true,
      includeWorld,
      requestId,
      message: 'Seeded nation empire success fixture.',
      seededNationEmpireSuccessFixture: {
        factionId: targetFactionId,
        controlledCommanderyCityCount: cityClusters.length,
        controlledStateCapitalCount: 1,
        allianceLevel: nextWorld.alliance.level,
        jade: nextFaction.jade,
        nationTier: 'kingdom',
      },
    })
  } finally {
    mutationLock.release()
  }
}

export function issueNationMidgameLuoyangAuthorityClaimAction(
  payload: unknown,
  includeWorld = true,
): WorldActionResponse {
  const params = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {}
  const requestId = randomUUID()
  const factionId = String(params.factionId ?? resolveDefaultFactionId()).trim() as FactionId
  const sourcePageId = 'nation/midgame'
  const targetLabel = '洛阳'
  const organizationId = String(params.organizationId ?? factionId).trim() || factionId
  const nationObjectiveId = String(params.nationObjectiveId ?? 'luoyang_prefecture_contest').trim() || 'luoyang_prefecture_contest'
  const luoyangContestId = `luoyang_prefecture_contest_${worldState.tick}_${worldState.worldVersion}_${requestId.slice(0, 8)}`
  const contestStatus = 'recorded' as const
  const playerOrganizationResult = '军令入册，洛阳州府争夺已成为国家中局目标。'
  const receipt: WorldActionReceipt = {
    action: 'issueNationMidgameLuoyangAuthorityClaim',
    factionId,
    sourcePageId,
    targetLabel,
    luoyangContestId,
    contestStatus,
    organizationId,
    nationObjectiveId,
    playerOrganizationResult,
    nationMidgameAuthorityScope: 'luoyang_prefecture_authority_only_not_full_unification',
  }

  appendWorldEvent({
    category: 'world_action',
    action: 'issue_nation_midgame_luoyang_authority_claim',
    success: true,
    tick: worldState.tick,
    worldVersion: worldState.worldVersion,
    requestId,
    message: 'Recorded Luoyang prefecture contest order for nation midgame.',
    metadata: {
      factionId,
      sourcePageId,
      targetLabel,
      luoyangContestId,
      contestStatus,
      organizationId,
      nationObjectiveId,
      nationMidgameAuthorityScope: receipt.nationMidgameAuthorityScope,
    },
  })

  return buildWorldActionResponse({
    ok: true,
    includeWorld,
    requestId,
    relatedId: luoyangContestId,
    message: 'Recorded Luoyang prefecture contest order.',
    receipt,
  })
}

export function recordNationMidgameLuoyangBattleReportFeedbackAction(
  payload: unknown,
  includeWorld = true,
): WorldActionResponse {
  const params = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {}
  const requestId = randomUUID()
  const factionId = String(params.factionId ?? resolveDefaultFactionId()).trim() as FactionId
  const sourceLuoyangContestId = String(params.sourceLuoyangContestId ?? '').trim()
  const sourcePageId = 'nation/midgame'
  const targetLabel = '洛阳'
  const organizationId = String(params.organizationId ?? factionId).trim() || factionId
  const reportStatus = 'recorded' as const
  const organizationReportId = `nation_midgame_luoyang_report_${worldState.tick}_${worldState.worldVersion}_${requestId.slice(0, 8)}`
  const playerOrganizationResult = '洛阳交锋已写入组织回报，下一步集结继续推进。'
  const receipt: WorldActionReceipt = {
    action: 'recordNationMidgameLuoyangBattleReportFeedback',
    factionId,
    sourceLuoyangContestId,
    sourcePageId,
    targetLabel,
    organizationId,
    organizationReportId,
    battleReportId: organizationReportId,
    reportStatus,
    usesExistingBattleReportSurface: false,
    usesOrganizationReportSurface: true,
    playerOrganizationResult,
    nationMidgameBattleReportScope: 'luoyang_feedback_only_not_full_prefecture_control',
  }

  appendWorldEvent({
    category: 'world_action',
    action: 'record_nation_midgame_luoyang_battle_report_feedback',
    success: true,
    tick: worldState.tick,
    worldVersion: worldState.worldVersion,
    requestId,
    message: 'Recorded Luoyang nation-midgame organization feedback.',
    metadata: {
      factionId,
      sourceLuoyangContestId,
      sourcePageId,
      targetLabel,
      organizationId,
      organizationReportId,
      reportStatus,
      usesOrganizationReportSurface: true,
      nationMidgameBattleReportScope: receipt.nationMidgameBattleReportScope,
    },
  })

  return buildWorldActionResponse({
    ok: sourceLuoyangContestId.length > 0,
    includeWorld,
    requestId,
    relatedId: organizationReportId,
    message: sourceLuoyangContestId.length > 0
      ? 'Recorded Luoyang organization feedback.'
      : 'Missing Luoyang contest id.',
    receipt,
  })
}

export function recordNationMidgameLuoyangControlAuthorityAction(
  payload: unknown,
  includeWorld = true,
): WorldActionResponse {
  const params = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {}
  const requestId = randomUUID()
  const factionId = String(params.factionId ?? resolveDefaultFactionId()).trim() as FactionId
  const sourceLuoyangContestId = String(params.sourceLuoyangContestId ?? '').trim()
  const sourceOrganizationReportId = String(params.sourceOrganizationReportId ?? '').trim()
  const sourcePageId = 'nation/midgame'
  const targetLabel = '洛阳'
  const organizationId = String(params.organizationId ?? factionId).trim() || factionId
  const controlStatus = 'recorded' as const
  const controlAuthorityId = `luoyang_control_authority_${worldState.tick}_${worldState.worldVersion}_${requestId.slice(0, 8)}`
  const prefectureControlProgressId = `luoyang_prefecture_progress_${worldState.tick}_${worldState.worldVersion}_${requestId.slice(0, 8)}`
  const playerOrganizationResult = '洛阳推进已入册，州府控制转入固守准备。'
  const receipt: WorldActionReceipt = {
    action: 'recordNationMidgameLuoyangControlAuthority',
    factionId,
    sourceLuoyangContestId,
    sourceOrganizationReportId,
    sourcePageId,
    targetLabel,
    organizationId,
    controlAuthorityId,
    prefectureControlProgressId,
    controlStatus,
    usesOrganizationReportSurface: true,
    playerOrganizationResult,
    nationMidgameControlScope: 'luoyang_control_authority_only_not_full_occupation',
  }

  appendWorldEvent({
    category: 'world_action',
    action: 'record_nation_midgame_luoyang_control_authority',
    success: true,
    tick: worldState.tick,
    worldVersion: worldState.worldVersion,
    requestId,
    message: 'Recorded Luoyang control authority progress for nation midgame.',
    metadata: {
      factionId,
      sourceLuoyangContestId,
      sourceOrganizationReportId,
      sourcePageId,
      targetLabel,
      organizationId,
      controlAuthorityId,
      prefectureControlProgressId,
      controlStatus,
      usesOrganizationReportSurface: true,
      nationMidgameControlScope: receipt.nationMidgameControlScope,
    },
  })

  const ok = sourceLuoyangContestId.length > 0
  return buildWorldActionResponse({
    ok,
    includeWorld,
    requestId,
    relatedId: controlAuthorityId,
    message: ok
      ? 'Recorded Luoyang control authority progress.'
      : 'Missing Luoyang contest id.',
    receipt,
  })
}

export function recordNationMidgameCityControlJudgmentAction(
  payload: unknown,
  includeWorld = true,
): WorldActionResponse {
  const params = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {}
  const requestId = randomUUID()
  const factionId = String(params.factionId ?? resolveDefaultFactionId()).trim() as FactionId
  const cityId = String(params.cityId ?? '').trim()
  const cityName = String(params.cityName ?? '').trim()
  const administrativeRole = normalizeCityControlAdministrativeRole(params.administrativeRole)
  const sourceControlAuthorityId = String(params.sourceControlAuthorityId ?? '').trim()
  const sourceControlProgressId = String(params.sourceControlProgressId ?? '').trim()
  const sourcePageId = 'nation/midgame'
  const organizationId = String(params.organizationId ?? factionId).trim() || factionId
  const readback = buildCityControlJudgmentReadback({
    cityId,
    cityName,
    administrativeRole,
    organizationId,
    sourceControlAuthorityId,
    sourceControlProgressId,
    nextStepLabel: String(params.nextStepLabel ?? '').trim(),
  }, `${worldState.tick}_${worldState.worldVersion}_${requestId.slice(0, 8)}`)
  const receipt: WorldActionReceipt = {
    action: 'recordNationMidgameCityControlJudgment',
    factionId,
    cityId: readback.cityId,
    cityName: readback.cityName,
    sourcePageId,
    organizationId,
    sourceControlAuthorityId,
    sourceControlProgressId,
    cityControlAdministrativeRole: readback.cityControlAdministrativeRole,
    cityControlJudgmentId: readback.cityControlJudgmentId,
    cityControlJudgmentStatus: readback.cityControlJudgmentStatus,
    cityControlJudgmentKind: readback.cityControlJudgmentKind,
    nextStepLabel: readback.nextStepLabel,
    ownershipTransferApplied: readback.ownershipTransferApplied,
    usesOrganizationNationSurface: true,
    playerOrganizationResult: readback.playerOrganizationResult,
    cityControlScope: readback.cityControlScope,
  }

  appendWorldEvent({
    category: 'world_action',
    action: 'record_nation_midgame_city_control_judgment',
    success: true,
    tick: worldState.tick,
    worldVersion: worldState.worldVersion,
    requestId,
    message: 'Recorded generic city control judgment for nation midgame.',
    metadata: {
      factionId,
      cityId: readback.cityId,
      cityName: readback.cityName,
      administrativeRole: readback.cityControlAdministrativeRole,
      organizationId,
      sourcePageId,
      sourceControlAuthorityId,
      sourceControlProgressId,
      cityControlJudgmentId: readback.cityControlJudgmentId,
      cityControlJudgmentKind: readback.cityControlJudgmentKind,
      ownershipTransferApplied: false,
      cityControlScope: readback.cityControlScope,
    },
  })

  const ok = cityId.length > 0 && cityName.length > 0 && sourceControlAuthorityId.length > 0 && sourceControlProgressId.length > 0
  return buildWorldActionResponse({
    ok,
    includeWorld,
    requestId,
    relatedId: readback.cityControlJudgmentId,
    message: ok
      ? 'Recorded generic city control judgment.'
      : 'Missing city control judgment source fields.',
    receipt,
  })
}

export function recordNationMidgameLuoyangPrefectureControlJudgmentAction(
  payload: unknown,
  includeWorld = true,
): WorldActionResponse {
  const params = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {}
  const factionId = String(params.factionId ?? resolveDefaultFactionId()).trim() as FactionId
  const sourceControlAuthorityId = String(params.sourceControlAuthorityId ?? '').trim()
  const sourceLuoyangControlProgressId = String(params.sourceLuoyangControlProgressId ?? '').trim()
  const sourcePageId = 'nation/midgame'
  const targetLabel = '洛阳'
  const organizationId = String(params.organizationId ?? factionId).trim() || factionId
  const nextStepLabel = String(params.nextStepLabel ?? '固守洛阳').trim() || '固守洛阳'
  const genericResult = recordNationMidgameCityControlJudgmentAction({
    factionId,
    cityId: 'luoyang',
    cityName: '洛阳',
    administrativeRole: 'state_government',
    sourceControlAuthorityId,
    sourceControlProgressId: sourceLuoyangControlProgressId,
    sourcePageId,
    organizationId,
    nextStepLabel,
  }, includeWorld)
  const genericReceipt = (genericResult.receipt ?? {}) as WorldActionReceipt
  const requestId = genericResult.requestId ?? randomUUID()
  const prefectureControlJudgmentId = String(genericReceipt.cityControlJudgmentId ?? '').replace(/^city_control_judgment_/, 'luoyang_prefecture_control_judgment_')
  const prefectureControlJudgmentStatus = 'controlled' as const
  const playerOrganizationResult = '洛阳州府控制已判定，下一步固守洛阳。'
  const receipt: WorldActionReceipt = {
    action: 'recordNationMidgameLuoyangPrefectureControlJudgment',
    factionId,
    sourceControlAuthorityId,
    sourceLuoyangControlProgressId,
    sourcePageId,
    targetLabel,
    organizationId,
    nextStepLabel,
    prefectureControlJudgmentId,
    prefectureControlJudgmentStatus,
    cityId: String(genericReceipt.cityId ?? 'luoyang'),
    cityName: String(genericReceipt.cityName ?? '洛阳'),
    cityControlAdministrativeRole: 'state_government',
    cityControlJudgmentId: String(genericReceipt.cityControlJudgmentId ?? ''),
    cityControlJudgmentStatus: 'controlled',
    cityControlJudgmentKind: 'prefectureControlJudgment',
    usesOrganizationNationSurface: true,
    ownershipTransferApplied: false,
    playerOrganizationResult,
    cityControlScope: 'city_control_judgment_only_not_ownership_transfer',
    nationMidgamePrefectureControlJudgmentScope: 'luoyang_prefecture_control_judgment_only_not_ownership_transfer',
  }

  appendWorldEvent({
    category: 'world_action',
    action: 'record_nation_midgame_luoyang_prefecture_control_judgment',
    success: true,
    tick: worldState.tick,
    worldVersion: worldState.worldVersion,
    requestId,
    message: 'Recorded Luoyang prefecture control judgment for nation midgame.',
    metadata: {
      factionId,
      sourceControlAuthorityId,
      sourceLuoyangControlProgressId,
      sourcePageId,
      targetLabel,
      organizationId,
      nextStepLabel,
      prefectureControlJudgmentId,
      prefectureControlJudgmentStatus,
      ownershipTransferApplied: false,
      usesOrganizationNationSurface: true,
      nationMidgamePrefectureControlJudgmentScope: receipt.nationMidgamePrefectureControlJudgmentScope,
    },
  })

  const ok = sourceControlAuthorityId.length > 0 && sourceLuoyangControlProgressId.length > 0
  return buildWorldActionResponse({
    ok,
    includeWorld,
    requestId,
    relatedId: prefectureControlJudgmentId,
    message: ok
      ? 'Recorded Luoyang prefecture control judgment.'
      : 'Missing Luoyang control authority progress.',
    receipt,
  })
}

export function recordNationMidgameRealmObjectiveBridgeAction(
  payload: unknown,
  includeWorld = true,
): WorldActionResponse {
  const params = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {}
  const requestId = randomUUID()
  const factionId = String(params.factionId ?? resolveDefaultFactionId()).trim() as FactionId
  const sourceControlAuthorityId = String(params.sourceControlAuthorityId ?? '').trim()
  const sourceLuoyangControlProgressId = String(params.sourceLuoyangControlProgressId ?? '').trim()
  const sourcePageId = 'nation/midgame'
  const targetLabel = String(params.targetLabel ?? '王国目标').trim() || '王国目标'
  const organizationId = String(params.organizationId ?? factionId).trim() || factionId
  const nextStepLabel = String(params.nextStepLabel ?? '巩固洛阳').trim() || '巩固洛阳'
  const realmObjectiveProgressId = `realm_objective_bridge_${worldState.tick}_${worldState.worldVersion}_${requestId.slice(0, 8)}`
  const kingdomObjectivePrerequisiteProgress = '洛阳控制进度已接入称王前置。'
  const empireObjectivePrerequisiteProgress = '州府固守进度已接入帝业前置。'
  const playerOrganizationResult = '洛阳前置已接入王国与帝国目标，下一步巩固洛阳。'
  const receipt: WorldActionReceipt = {
    action: 'recordNationMidgameRealmObjectiveBridge',
    factionId,
    sourceControlAuthorityId,
    sourceLuoyangControlProgressId,
    sourcePageId,
    targetLabel: targetLabel as WorldActionReceipt['targetLabel'],
    organizationId,
    realmObjectiveProgressId,
    kingdomObjectivePrerequisiteProgress,
    empireObjectivePrerequisiteProgress,
    kingdomObjectivePrerequisiteVisible: true,
    empireObjectivePrerequisiteVisible: true,
    nextStepLabel,
    usesOrganizationNationSurface: true,
    usesCurrentGoalsSurface: false,
    playerOrganizationResult,
    nationMidgameRealmObjectiveBridgeScope: 'realm_objective_bridge_only_not_full_kingdom_empire_creation',
  }

  appendWorldEvent({
    category: 'world_action',
    action: 'record_nation_midgame_realm_objective_bridge',
    success: true,
    tick: worldState.tick,
    worldVersion: worldState.worldVersion,
    requestId,
    message: 'Recorded Luoyang control progress bridge for kingdom and empire objectives.',
    metadata: {
      factionId,
      sourceControlAuthorityId,
      sourceLuoyangControlProgressId,
      sourcePageId,
      targetLabel,
      organizationId,
      realmObjectiveProgressId,
      nextStepLabel,
      usesOrganizationNationSurface: true,
      nationMidgameRealmObjectiveBridgeScope: receipt.nationMidgameRealmObjectiveBridgeScope,
      ...buildOrganizationNationRealmObjectiveHistoryOverlay({
        organizationName: resolveOrganizationDisplayName(factionId, organizationId),
        targetLabel,
        nextStepLabel,
        realmObjectiveProgressId,
      }),
    },
  })

  const ok = sourceControlAuthorityId.length > 0 && sourceLuoyangControlProgressId.length > 0
  return buildWorldActionResponse({
    ok,
    includeWorld,
    requestId,
    relatedId: realmObjectiveProgressId,
    message: ok
      ? 'Recorded realm objective bridge.'
      : 'Missing Luoyang control authority progress.',
    receipt,
  })
}

function resolveOrganizationDisplayName(factionId: FactionId, organizationId: string): string {
  const faction = worldState.factions[factionId]
  return faction?.organizationName?.trim() || faction?.nationName?.trim() || (organizationId === 'player' ? '青州同盟' : '同盟')
}

function buildOrganizationNationRealmObjectiveHistoryOverlay(params: {
  organizationName: string
  targetLabel: string
  nextStepLabel: string
  realmObjectiveProgressId: string
}): Record<string, unknown> {
  const organizationName = params.organizationName.trim() || '同盟'
  const targetLabel = params.targetLabel.trim() || '王国目标'
  const nextStepLabel = params.nextStepLabel.trim() || '继续推进'
  return {
    playerHistoryCategory: 'organization_nation',
    playerHistoryTitle: '同盟目标推进',
    playerHistoryActorName: organizationName,
    playerHistorySummary: `${targetLabel}已接入组织目标，下一步${nextStepLabel}。`,
    playerHistoryLocation: '洛阳',
    playerHistoryTarget: targetLabel,
    playerHistoryResultLabel: '已推进',
    playerHistoryConsequence: '王国与帝国前置目标已更新，成员可以围绕新目标继续行动。',
    playerHistoryNextAction: '查看同盟目标',
    playerHistorySeverity: 'medium',
    playerHistoryScope: 'own_organization',
    playerHistorySharePolicy: 'not_shareable_private',
    playerHistoryShareStateLabel: '暂不可分享',
    playerHistoryDedupeKey: `organization-nation:realm-objective:${params.realmObjectiveProgressId}`,
  }
}

function attachSeedBattleReportReplay(
  world: WorldState,
  step: SeedBattleReportClosureStep | undefined,
): string {
  if (!step?.battleRecordId) {
    return ''
  }
  const record = (world.feedback.battleRecords ?? []).find((item) => item.id === step.battleRecordId)
  if (!record) {
    return ''
  }
  const replayRequestId = `battle_report_replay_${record.id}`
  record.replayRequestId = replayRequestId
  step.replayRequestId = replayRequestId
  world.history.executionReplays = [
    ({
      requestId: replayRequestId,
      source: 'mock' as const,
      strategicCommand: '查看战报复盘',
      basedOnWorldVersion: Math.max(1, world.worldVersion - 1),
      createdTick: world.tick,
      createdWorldVersion: world.worldVersion,
      reviewAtTick: world.tick,
      plannerExplanation: '战报结果已归档，可进入复盘查看行动帧。',
      plan: {
        intent: '战报复盘',
        priority: 'medium',
        reviewAfterTicks: 1,
        constraints: ['battle_report_occupation_replay_save_history_chain'],
        orders: [
          {
            unitId: step.unitId,
            action: 'recon',
            target: step.tileId,
          },
        ],
      },
      outcome: 'completed',
      completedTick: world.tick,
      completedWorldVersion: world.worldVersion,
      frames: [
        {
          tick: world.tick,
          worldVersion: world.worldVersion,
          label: '战报结果',
          frontlineSummary: record.summary,
          latestReports: [record.summary],
          highlights: [
            {
              id: `highlight_${replayRequestId}`,
              kind: 'battle',
              severity: 'medium',
              title: '战斗已结束',
              detail: record.summary,
              battleReportId: record.id,
              unitId: step.unitId,
              tileId: step.tileId,
              factionId: record.ownerFactionId,
            },
          ],
          orderStates: [],
        },
      ],
    } as unknown as ExecutionReplay),
    ...world.history.executionReplays.filter((replay) => replay.requestId !== replayRequestId),
  ].slice(0, 8)
  return replayRequestId
}

function buildOrganizationNationOfficerRoleHistoryOverlay(params: {
  organizationId: string
  organizationName: string
  markerId: string
  markerLabel: string
  roleLabel: string
  requiredOfficerRole: string
  actorCommanderName: string
  note?: string
}): Record<string, unknown> {
  const organizationName = params.organizationName.trim() || '同盟'
  const markerLabel = params.markerLabel.trim() || '战线'
  const roleLabel = params.roleLabel.trim() || '官员'
  const note = params.note?.trim()
  return {
    playerHistoryCategory: 'organization_nation',
    playerHistoryTitle: '官员战线更新',
    playerHistoryActorName: roleLabel,
    playerHistorySummary: note
      ? `${roleLabel}已更新${markerLabel}，重点是${note}。`
      : `${roleLabel}已更新${markerLabel}，同盟成员可按新标记行动。`,
    playerHistoryLocation: organizationName,
    playerHistoryTarget: markerLabel,
    playerHistoryResultLabel: '已更新',
    playerHistoryConsequence: '战线标记已写入同盟态势，相关成员可围绕该方向协同。',
    playerHistoryNextAction: '查看战线',
    playerHistorySeverity: 'medium',
    playerHistoryScope: 'own_organization',
    playerHistoryOrganizationId: params.organizationId,
    playerHistoryRequiredOfficerRole: params.requiredOfficerRole,
    playerHistorySharePolicy: 'not_shareable_private',
    playerHistoryShareStateLabel: '暂不可分享',
    playerHistoryDedupeKey: `organization-nation:officer-role:${params.markerId}`,
    playerHistorySourceCommanderName: params.actorCommanderName,
  }
}

function buildOrganizationNationEmpireUpgradeHistoryOverlay(params: {
  organizationId: string
  organizationName: string
  actorCommanderName: string
  requiredOfficerRole: string
}): Record<string, unknown> {
  const organizationName = params.organizationName.trim() || '同盟'
  return {
    playerHistoryCategory: 'organization_nation',
    playerHistoryTitle: '帝国晋升完成',
    playerHistoryActorName: '国政官员',
    playerHistorySummary: `${organizationName}已晋升帝国，国家目标进入新阶段。`,
    playerHistoryLocation: organizationName,
    playerHistoryTarget: '帝国',
    playerHistoryResultLabel: '已晋升',
    playerHistoryConsequence: '帝国层级已经确认，可以继续推进后续国家目标。',
    playerHistoryNextAction: '查看国家目标',
    playerHistorySeverity: 'high',
    playerHistoryScope: 'own_organization',
    playerHistoryOrganizationId: params.organizationId,
    playerHistoryRequiredOfficerRole: params.requiredOfficerRole,
    playerHistorySharePolicy: 'not_shareable_private',
    playerHistoryShareStateLabel: '暂不可分享',
    playerHistoryDedupeKey: `organization-nation:empire-upgrade:${params.organizationId}:${params.actorCommanderName}`,
    playerHistorySourceCommanderName: params.actorCommanderName,
  }
}

export function recordNationMidgameLongTermControlTickPreconditionAction(
  payload: unknown,
  includeWorld = true,
): WorldActionResponse {
  const params = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {}
  const requestId = randomUUID()
  const factionId = String(params.factionId ?? resolveDefaultFactionId()).trim() as FactionId
  const cityId = String(params.cityId ?? '').trim()
  const cityName = String(params.cityName ?? '').trim()
  const administrativeRole = normalizeCityControlAdministrativeRole(params.administrativeRole)
  const sourceControlAuthorityId = String(params.sourceControlAuthorityId ?? '').trim()
  const sourceControlProgressId = String(params.sourceControlProgressId ?? '').trim()
  const sourcePageId = 'nation/midgame'
  const organizationId = String(params.organizationId ?? factionId).trim() || factionId
  const tickAdvanceCount = Math.max(1, Math.floor(Number(params.tickAdvanceCount ?? 1) || 1))
  const nextStepLabel = String(params.nextStepLabel ?? '').trim()
  const hasRequiredFields =
    cityId.length > 0 &&
    cityName.length > 0 &&
    sourceControlAuthorityId.length > 0 &&
    sourceControlProgressId.length > 0

  if (!hasRequiredFields) {
    return buildWorldActionResponse({
      ok: false,
      includeWorld,
      requestId,
      message: 'Missing long-term control precondition source fields.',
      receipt: {
        action: 'recordNationMidgameLongTermControlTickPrecondition',
        factionId,
        cityId,
        cityName,
        sourcePageId,
        organizationId,
        sourceControlAuthorityId,
        sourceControlProgressId,
        cityControlAdministrativeRole: administrativeRole,
        longTermControlHeldTicks: 0,
        longTermControlRequiredTicks: requiredLongTermControlTicksForRole(administrativeRole),
        ownerTransferPreconditionReady: false,
        ownershipTransferApplied: false,
        nationMidgameLongTermControlScope: 'long_term_control_tick_precondition_only_not_owner_transfer',
      },
    })
  }

  const mutationLock = tryAcquireWorldMutationLock('record_nation_midgame_long_term_control_tick_precondition')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, factionId, requestId)
  }

  try {
    const nextWorld = structuredClone(worldState)
    const state = nextWorld.nationMidgameControl ?? { longTermControlPreconditions: {} }
    const recordKey = `${organizationId}:${cityId}:${sourceControlAuthorityId}:${sourceControlProgressId}`
    const previous = state.longTermControlPreconditions[recordKey] ?? null
    const readback = buildCityControlLongTermPreconditionReadback({
      cityId,
      cityName,
      administrativeRole,
      organizationId,
      sourceControlAuthorityId,
      sourceControlProgressId,
      tickAdvanceCount,
      nextStepLabel,
    }, previous)
    state.longTermControlPreconditions[recordKey] = readback
    nextWorld.nationMidgameControl = state
    commitWorldState(nextWorld)

    const receipt: WorldActionReceipt = {
      action: 'recordNationMidgameLongTermControlTickPrecondition',
      factionId,
      cityId: readback.cityId,
      cityName: readback.cityName,
      sourcePageId,
      organizationId: readback.organizationId,
      sourceControlAuthorityId: readback.sourceControlAuthorityId,
      sourceControlProgressId: readback.sourceControlProgressId,
      cityControlAdministrativeRole: readback.cityControlAdministrativeRole,
      longTermControlPreconditionId: readback.longTermControlPreconditionId,
      longTermControlHeldTicks: readback.longTermControlHeldTicks,
      longTermControlRequiredTicks: readback.longTermControlRequiredTicks,
      ownerTransferPreconditionReady: readback.ownerTransferPreconditionReady,
      ownershipTransferApplied: false,
      nextStepLabel: readback.nextStepLabel,
      usesOrganizationNationSurface: true,
      playerOrganizationResult: readback.playerOrganizationResult,
      nationMidgameLongTermControlScope: 'long_term_control_tick_precondition_only_not_owner_transfer',
    }

    appendWorldEvent({
      category: 'world_action',
      action: 'record_nation_midgame_long_term_control_tick_precondition',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: 'Recorded nation midgame long-term control tick precondition.',
      metadata: {
        factionId,
        cityId: readback.cityId,
        cityName: readback.cityName,
        sourcePageId,
        organizationId: readback.organizationId,
        sourceControlAuthorityId: readback.sourceControlAuthorityId,
        sourceControlProgressId: readback.sourceControlProgressId,
        cityControlAdministrativeRole: readback.cityControlAdministrativeRole,
        longTermControlPreconditionId: readback.longTermControlPreconditionId,
        longTermControlHeldTicks: readback.longTermControlHeldTicks,
        longTermControlRequiredTicks: readback.longTermControlRequiredTicks,
        ownerTransferPreconditionReady: readback.ownerTransferPreconditionReady,
        ownershipTransferApplied: false,
        nationMidgameLongTermControlScope: receipt.nationMidgameLongTermControlScope,
      },
    })

    return buildWorldActionResponse({
      ok: true,
      includeWorld,
      requestId,
      relatedId: readback.longTermControlPreconditionId,
      message: 'Recorded long-term control tick precondition.',
      receipt,
    })
  } finally {
    mutationLock.release()
  }
}

export function setRecruitSelectedPoolAction(
  poolId: SetRecruitSelectedPoolActionParams['poolId'],
  includeWorld = true,
  factionId?: FactionId,
): WorldActionResponse {
  const requestId = randomUUID()
  const mutationLock = tryAcquireWorldMutationLock('set_recruit_selected_pool')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, factionId, requestId)
  }

  try {
    const targetFactionId = factionId ?? resolveDefaultFactionId()
    const result = setRecruitSelectedPool(worldState, poolId, targetFactionId)
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        requestId,
        relatedId: poolId,
        execution,
      })
      appendWorldEvent({
        category: 'world_action',
        action: 'set_recruit_selected_pool',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          factionId: targetFactionId,
          poolId,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })
      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const succeeded = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      relatedId: result.poolId,
      execution,
    })
    appendWorldEvent({
      category: 'world_action',
      action: 'set_recruit_selected_pool',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        factionId: targetFactionId,
        poolId: result.poolId,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })
    return succeeded
  } finally {
    mutationLock.release()
  }
}

export function promoteTroopFacilityBuildingAction(
  unitId: string,
  facilityId: string,
  buildingId: string,
  includeWorld = true,
  factionId?: FactionId,
): WorldActionResponse {
  const requestId = randomUUID()
  const mutationLock = tryAcquireWorldMutationLock('promote_troop_facility_building')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld, factionId, requestId)
  }

  try {
    const targetFactionId = factionId ?? resolveDefaultFactionId()
    const result = promoteTroopFacilityBuilding(worldState, unitId, facilityId, buildingId, targetFactionId)
    if (!result.ok) {
      const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
        requestId,
        unitId,
        relatedId: unitId,
        execution,
      })
      appendWorldEvent({
        category: 'world_action',
        action: 'promote_troop_facility_building',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        requestId,
        message: result.message,
        metadata: {
          unitId,
          facilityId,
          buildingId,
          factionId: targetFactionId,
          executionStatus: execution?.status,
          activeOrderCount: execution?.activeOrderCount,
          actionPointsRemaining: execution?.actionPointsRemaining,
          foodRemaining: execution?.foodRemaining,
        },
      })
      return failed
    }

    commitWorldState(result.world)
    const execution = buildAiExecutionStateSnapshot(worldState, targetFactionId)
    const receipt: WorldActionReceipt = {
      action: 'promoteTroopFacilityBuilding',
      factionId: targetFactionId,
      unitId: result.unitId,
      facilityId: result.facilityId,
      buildingId: result.buildingId,
      previousLevel: result.previousLevel,
      nextLevel: result.nextLevel,
    }

    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
      requestId,
      unitId: result.unitId,
      relatedId: result.unitId,
      execution,
      receipt,
    })
    appendWorldEvent({
      category: 'world_action',
      action: 'promote_troop_facility_building',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      requestId,
      message: result.message,
      metadata: {
        unitId,
        facilityId,
        buildingId,
        nextLevel: result.nextLevel,
        factionId: targetFactionId,
        executionStatus: execution?.status,
        activeOrderCount: execution?.activeOrderCount,
        actionPointsRemaining: execution?.actionPointsRemaining,
        foodRemaining: execution?.foodRemaining,
      },
    })
    return response
  } finally {
    mutationLock.release()
  }
}

export function enqueueAffairAction(
  cityId: string,
  affairId: string,
  includeWorld = true,
  factionId?: FactionId,
): WorldActionResponse {
  const mutationLock = tryAcquireWorldMutationLock('enqueue_affair')
  if (!mutationLock) {
    return buildWorldMutationBusyResponse(includeWorld)
  }

  try {
    const targetFactionId = factionId ?? resolveDefaultFactionId()
    const result = enqueueAffair(worldState, cityId, affairId, targetFactionId)
    if (!result.ok) {
      const failed = buildWorldActionResponse({
        ok: false,
        includeWorld,
        message: result.message,
      })
      appendWorldEvent({
        category: 'world_action',
        action: 'enqueue_affair',
        success: false,
        tick: worldState.tick,
        worldVersion: worldState.worldVersion,
        message: result.message,
        metadata: { cityId, affairId, factionId: targetFactionId },
      })
      return failed
    }

    commitWorldState(result.world)

    const response = buildWorldActionResponse({
      ok: true,
      includeWorld,
      message: result.message,
    })
    appendWorldEvent({
      category: 'world_action',
      action: 'enqueue_affair',
      success: true,
      tick: worldState.tick,
      worldVersion: worldState.worldVersion,
      message: result.message,
      metadata: { cityId, affairId, factionId: targetFactionId },
    })
    return response
  } finally {
    mutationLock.release()
  }
}

function commitWorldState(
  nextWorld: WorldState,
  subphases?: AiRuntimeAdvanceTickSubphaseTiming[],
  previousWorldSnapshot?: WorldState,
) {
  const previousWorld = previousWorldSnapshot ?? worldState
  let normalizedNextWorld = nextWorld
  recordAdvanceTickSubphaseSync(
    subphases,
    'advance_world_state.commit_world_state.sync_authoritative_ai_state',
    () => {
      syncAuthoritativeAiState(normalizedNextWorld)
    },
  )
  recordAdvanceTickSubphaseSync(
    subphases,
    'advance_world_state.commit_world_state.sync_ai_quota',
    () => {
      syncAllFactionAiQuota(normalizedNextWorld)
    },
  )
  recordAdvanceTickSubphaseSync(
    subphases,
    'advance_world_state.commit_world_state.normalize_unit_map_visuals',
    () => {
      normalizedNextWorld = normalizeUnitMapVisualsForWorld(normalizedNextWorld).world
    },
  )
  recordAdvanceTickSubphaseSync(
    subphases,
    'advance_world_state.commit_world_state.swap_authoritative_world',
    () => {
      worldState = normalizedNextWorld
    },
  )
  recordAdvanceTickSubphaseSync(
    subphases,
    'advance_world_state.commit_world_state.sync_world_map_layout',
    () => {
      syncWorldMapLayout(previousWorld, normalizedNextWorld)
    },
  )
  recordAdvanceTickSubphaseSync(
    subphases,
    'advance_world_state.commit_world_state.record_tile_state_diff',
    () => {
      recordTileStateDiff(previousWorld, normalizedNextWorld)
    },
  )
  recordAdvanceTickSubphaseSync(
    subphases,
    'advance_world_state.commit_world_state.record_intel_diff',
    () => {
      recordIntelDiff(previousWorld, normalizedNextWorld, subphases)
    },
  )
  recordAdvanceTickSubphaseSync(
    subphases,
    'advance_world_state.commit_world_state.schedule_world_persist',
    () => {
      scheduleWorldPersist(() => worldState)
    },
  )
}

export async function flushWorldPersist() {
  await flushWorldPersistFromPersistence(() => worldState)
}

function normalizeWorldResourceGenerationForWorld(world: WorldState): { world: WorldState; changed: boolean } {
  const metadataPolicy = normalizeWorldResourceGenerationMetadata(
    world.map.tiles,
    world.map.resourceGeneration,
    WORLD_RESOURCE_GENERATION_POLICY,
  )
  const normalizedTiles = normalizeGeneratedWorldResourceTiles(world.map.tiles, metadataPolicy)
  const resourceGeneration = normalizeWorldResourceGenerationMetadata(
    normalizedTiles.tiles,
    world.map.resourceGeneration,
    WORLD_RESOURCE_GENERATION_POLICY,
  )
  const metadataChanged = JSON.stringify(world.map.resourceGeneration ?? null) !== JSON.stringify(resourceGeneration)

  if (!normalizedTiles.changed && !metadataChanged) {
    return { world, changed: false }
  }

  return {
    world: {
      ...world,
      map: {
        ...world.map,
        tiles: normalizedTiles.tiles,
        resourceGeneration,
      },
    },
    changed: true,
  }
}

function normalizeAllianceOfficerAuthorityForWorld(world: WorldState): { world: WorldState; changed: boolean } {
  const existingTable = world.alliance.officerAuthority
  const existingGrants = existingTable?.grants ?? {}
  const nextGrants: Record<string, AllianceOfficerAuthorityGrant> = {
    ...existingGrants,
  }
  let changed =
    existingTable?.schemaVersion !== ALLIANCE_OFFICER_AUTHORITY_SCHEMA_VERSION ||
    !existingTable?.grants

  for (const grant of Object.values(DEFAULT_ALLIANCE_OFFICER_AUTHORITY_GRANTS)) {
    if (!nextGrants[grant.id]) {
      nextGrants[grant.id] = structuredClone(grant)
      changed = true
      continue
    }
    const existingGrant = nextGrants[grant.id]
    const mergedPermissions = Array.from(new Set([
      ...existingGrant.permissions,
      ...grant.permissions,
    ]))
    if (mergedPermissions.length !== existingGrant.permissions.length) {
      nextGrants[grant.id] = {
        ...existingGrant,
        permissions: mergedPermissions,
        updatedAt: grant.updatedAt,
      }
      changed = true
    }
  }

  if (!changed) {
    return { world, changed: false }
  }

  return {
    world: {
      ...world,
      alliance: {
        ...world.alliance,
        officerAuthority: {
          schemaVersion: ALLIANCE_OFFICER_AUTHORITY_SCHEMA_VERSION,
          grants: nextGrants,
        },
      },
    },
    changed: true,
  }
}

function buildOverlaySignature(overlays: WorldState['map']['overlays']) {
  const mountainSignature = overlays.mountainRidges
    .map((path) => `${path.id}:${path.tileIds.length}:${path.nodes.length}`)
    .join('|')
  const riverSignature = overlays.rivers.map((path) => `${path.id}:${path.tileIds.length}:${path.nodes.length}`).join('|')
  const citySignature = overlays.cityClusters
    .map(
      (cluster) =>
        `${cluster.id}:${cluster.tileIds.join(',')}:${cluster.cityHallTileId}:${cluster.owner}:${cluster.camp}:${cluster.footprintTiles}:${cluster.upgradeCapTiles}:${cluster.isUpgradeable}:${cluster.techLevels?.governance ?? 0}-${cluster.techLevels?.logistics ?? 0}-${cluster.techLevels?.defense ?? 0}-${cluster.techLevels?.recruitment ?? 0}`,
    )
    .join('|')

  return `${mountainSignature}#${riverSignature}#${citySignature}`
}

function buildResourceGenerationSignature(resourceGeneration: WorldState['map']['resourceGeneration']) {
  if (!resourceGeneration) {
    return 'none'
  }

  return JSON.stringify(resourceGeneration)
}

function syncWorldMapLayout(previousWorld: WorldState, nextWorld: WorldState) {
  const previousTiles = previousWorld.map.tiles
  const nextTiles = nextWorld.map.tiles
  const previousLastTileId = previousTiles.length > 0 ? previousTiles[previousTiles.length - 1].id : undefined
  const nextLastTileId = nextTiles.length > 0 ? nextTiles[nextTiles.length - 1].id : undefined
  const previousOverlaySignature = buildOverlaySignature(previousWorld.map.overlays)
  const nextOverlaySignature = buildOverlaySignature(nextWorld.map.overlays)
  const previousResourceGenerationSignature = buildResourceGenerationSignature(previousWorld.map.resourceGeneration)
  const nextResourceGenerationSignature = buildResourceGenerationSignature(nextWorld.map.resourceGeneration)

  const layoutChanged =
    previousWorld.map.width !== nextWorld.map.width ||
    previousWorld.map.height !== nextWorld.map.height ||
    previousTiles.length !== nextTiles.length ||
    previousWorld.map.regions.length !== nextWorld.map.regions.length ||
    previousOverlaySignature !== nextOverlaySignature ||
    previousResourceGenerationSignature !== nextResourceGenerationSignature ||
    previousTiles[0]?.id !== nextTiles[0]?.id ||
    previousLastTileId !== nextLastTileId

  if (!layoutChanged) {
    return
  }

  mapLayoutVersion += 1
  worldMapLayout = buildWorldMapLayout(nextWorld, mapLayoutVersion)
  rebuildMapLayoutIndexes()
  tileStateDiffByVersion.clear()
  intelDiffByVersion.clear()
}

function buildWorldMapLayoutTileByCoord(world: WorldState): Map<string, Tile> {
  const tileByCoord = new Map<string, Tile>()
  for (const tile of world.map.tiles) {
    tileByCoord.set(coordKey(tile.x, tile.y), tile)
  }
  return tileByCoord
}

function buildWorldMapLayoutHomeCityFootprintByTileId(world: WorldState): Map<string, string> {
  const footprintByTileId = new Map<string, string>()
  for (const [factionId, faction] of Object.entries(world.factions)) {
    const homeTileId = String(faction.heroCommand?.homeTileId ?? '').trim()
    if (homeTileId === '') {
      continue
    }
    footprintByTileId.set(homeTileId, factionId === 'player' ? 'player_city_3x3_initial' : 'ai_city_3x3_initial')
  }
  return footprintByTileId
}

function resolveWorldMapLayoutSystemCityFootprintId(tile: Tile): string | undefined {
  if (tile.type !== 'city' && tile.cityLevel === undefined) {
    return undefined
  }
  const cityLevel = Math.max(1, Math.floor(Number(tile.cityLevel ?? 3)))
  if (cityLevel >= 7) {
    return 'system_city_l07_l08_7x7'
  }
  if (cityLevel >= 5) {
    return 'system_city_l05_l06_5x5'
  }
  return 'system_city_l03_l04_3x3'
}

function buildWorldMapLayoutFootprintTileIds(
  anchorTile: Tile,
  footprintCells: [number, number],
  tileByCoord: Map<string, Tile>,
): string[] {
  const width = Math.max(1, Math.floor(Number(footprintCells[0] ?? 1)))
  const height = Math.max(1, Math.floor(Number(footprintCells[1] ?? 1)))
  const startX = anchorTile.x - Math.floor(width / 2)
  const startY = anchorTile.y - Math.floor(height / 2)
  const tileIds: string[] = []
  for (let y = startY; y < startY + height; y += 1) {
    for (let x = startX; x < startX + width; x += 1) {
      const tile = tileByCoord.get(coordKey(x, y))
      if (tile) {
        tileIds.push(tile.id)
      }
    }
  }
  return tileIds
}

function resolveWorldMapLayoutTileFootprint(
  tile: Tile,
  tileByCoord: Map<string, Tile>,
  homeCityFootprintByTileId: Map<string, string>,
): Pick<WorldMapLayoutTile, 'footprintId' | 'footprintCells' | 'footprintTileIds' | 'footprintAnchorTileId' | 'footprintAnchorPolicy'> | undefined {
  const footprintId = homeCityFootprintByTileId.get(tile.id) ?? resolveWorldMapLayoutSystemCityFootprintId(tile)
  if (!footprintId) {
    return undefined
  }
  const footprintCells = eastHanFootprintCells(footprintId) as [number, number]
  return {
    footprintId,
    footprintCells,
    footprintTileIds: buildWorldMapLayoutFootprintTileIds(tile, footprintCells, tileByCoord),
    footprintAnchorTileId: tile.id,
    footprintAnchorPolicy: 'center_tile',
  }
}

function buildWorldMapLayout(world: WorldState, layoutVersion: number): WorldMapLayoutResponse {
  const tileByCoord = buildWorldMapLayoutTileByCoord(world)
  const homeCityFootprintByTileId = buildWorldMapLayoutHomeCityFootprintByTileId(world)
  const tiles: WorldMapLayoutTile[] = world.map.tiles.map((tile) => {
    const { owner, enemyPressure, ...layoutTile } = tile
    void owner
    void enemyPressure
    const resourceGuard = buildResourceGuardReadModelForTile(layoutTile)
    const resourceEconomy = layoutTile.type === 'resource'
      ? buildResourceTileEconomyReadModel({
          resourceKind: layoutTile.resourceKind,
          resourceLevel: layoutTile.resourceLevel,
        })
      : undefined
    const footprint = resolveWorldMapLayoutTileFootprint(tile, tileByCoord, homeCityFootprintByTileId)
    return {
      ...layoutTile,
      ...(resourceGuard ? { resourceGuard } : {}),
      ...(resourceEconomy ? { resourceEconomy } : {}),
      ...(footprint ?? {}),
    }
  })

  return {
    mapLayoutVersion: layoutVersion,
    map: {
      width: world.map.width,
      height: world.map.height,
      tiles,
      connections: world.map.connections,
      regions: world.map.regions,
      overlays: world.map.overlays,
      allianceFrontlineMarkers: buildAllianceFrontlineMarkerReadModels(world),
      resourceGeneration: world.map.resourceGeneration
        ? structuredClone(world.map.resourceGeneration)
        : undefined,
    },
  }
}

function buildAllianceFrontlineMarkerReadModels(world: WorldState): AllianceFrontlineMarker[] {
  return Object.values(world.alliance.frontlineMarkers ?? {})
    .map((marker) => structuredClone(marker))
    .sort((a, b) => a.id.localeCompare(b.id))
}

function rebuildMapLayoutIndexes() {
  const nextTileByCoord = new Map<string, WorldMapLayoutTile>()
  for (const tile of worldMapLayout.map.tiles) {
    nextTileByCoord.set(coordKey(tile.x, tile.y), tile)
  }

  const nextRegionIdByTileId = new Map<string, string>()
  for (const region of worldMapLayout.map.regions) {
    for (const tileId of region.tileIds) {
      if (!nextRegionIdByTileId.has(tileId)) {
        nextRegionIdByTileId.set(tileId, region.id)
      }
    }
  }

  mapLayoutTileByCoord = nextTileByCoord
  mapLayoutRegionIdByTileId = nextRegionIdByTileId
}

function coordKey(x: number, y: number) {
  return `${x}_${y}`
}

function clampGridCoordinate(value: number, maxValue: number) {
  return Math.max(0, Math.min(maxValue - 1, Math.floor(value)))
}

function resolveViewportScopeFromCenter(centerX: number, centerY: number, layer: MapHierarchyLayer) {
  const clampedX = clampGridCoordinate(centerX, worldMapLayout.map.width)
  const clampedY = clampGridCoordinate(centerY, worldMapLayout.map.height)
  const centerTile = mapLayoutTileByCoord.get(coordKey(clampedX, clampedY))

  if (!centerTile) {
    return {
      scope: 'bootstrap' as const,
    }
  }

  if (layer === 'region' || layer === 'tile') {
    const regionId = mapLayoutRegionIdByTileId.get(centerTile.id)
    if (regionId) {
      return {
        scope: 'region' as const,
        regionId,
      }
    }
  }

  const provinceId = centerTile.district?.trim()
  if (provinceId) {
    return {
      scope: 'province' as const,
      provinceId,
    }
  }

  return {
    scope: 'bootstrap' as const,
  }
}

function resolveWorldMapLayoutOptions(options?: WorldMapLayoutOptions): ResolvedWorldMapLayoutOptions {
  if (options?.scope === 'viewport') {
    const centerX =
      typeof options.centerX === 'number' && Number.isFinite(options.centerX)
        ? Math.floor(options.centerX)
        : Number.NaN
    const centerY =
      typeof options.centerY === 'number' && Number.isFinite(options.centerY)
        ? Math.floor(options.centerY)
        : Number.NaN

    if (Number.isFinite(centerX) && Number.isFinite(centerY)) {
      return {
        scope: 'viewport',
        centerX,
        centerY,
        layer: options.layer ?? 'province',
        visibleCells: options.visibleCells,
        visibleSizeCells: options.visibleSizeCells,
        preloadMarginCells: options.preloadMarginCells,
        chunkSizeCells: options.chunkSizeCells,
        worldId: options.worldId,
        coordinateSpace: options.coordinateSpace,
        includeLayers: options.includeLayers,
        loadedChunkIds: options.loadedChunkIds,
        tianxiaYutuScalePreset: options.tianxiaYutuScalePreset,
        stateDetailStateId: typeof options.stateDetailStateId === 'string' ? options.stateDetailStateId.trim() || undefined : undefined,
      }
    }

    return {
      scope: 'bootstrap',
    }
  }

  if (options?.scope === 'province' && !options.provinceId) {
    return {
      scope: 'bootstrap',
    }
  }

  if (options?.scope === 'region' && !options.regionId) {
    return {
      scope: 'bootstrap',
    }
  }

  if ((options?.scope === 'province' || (!!options?.provinceId && options.scope !== 'region')) && options.provinceId) {
    return {
      scope: 'province',
      provinceId: options.provinceId,
    }
  }

  if ((options?.scope === 'region' || (!!options?.regionId && !options.provinceId)) && options.regionId) {
    return {
      scope: 'region',
      regionId: options.regionId,
    }
  }

  if (options?.scope === 'bootstrap') {
    return {
      scope: 'bootstrap',
    }
  }

  return {
    scope: 'full',
  }
}

type CellSize = {
  width: number
  height: number
}

type CellBounds = {
  startX: number
  endX: number
  startY: number
  endY: number
}

function normalizePositiveSize(size: CellSize | undefined, fallback: CellSize) {
  if (!size) {
    return fallback
  }

  return {
    width: Math.max(1, Math.floor(size.width)),
    height: Math.max(1, Math.floor(size.height)),
  }
}

function buildCenteredBounds(centerX: number, centerY: number, visibleCells: CellSize): CellBounds {
  const startX = centerX - Math.floor(visibleCells.width / 2)
  const startY = centerY - Math.floor(visibleCells.height / 2)
  return {
    startX,
    endX: startX + visibleCells.width - 1,
    startY,
    endY: startY + visibleCells.height - 1,
  }
}

function expandBounds(bounds: CellBounds, marginCells: number): CellBounds {
  return {
    startX: bounds.startX - marginCells,
    endX: bounds.endX + marginCells,
    startY: bounds.startY - marginCells,
    endY: bounds.endY + marginCells,
  }
}

function clampBoundsToWorld(bounds: CellBounds): CellBounds {
  return {
    startX: clampGridCoordinate(bounds.startX, worldMapLayout.map.width),
    endX: clampGridCoordinate(bounds.endX, worldMapLayout.map.width),
    startY: clampGridCoordinate(bounds.startY, worldMapLayout.map.height),
    endY: clampGridCoordinate(bounds.endY, worldMapLayout.map.height),
  }
}

function buildLoadedChunkIds(bounds: CellBounds, chunkSizeCells: CellSize) {
  const startChunkX = Math.floor(bounds.startX / chunkSizeCells.width)
  const endChunkX = Math.floor(bounds.endX / chunkSizeCells.width)
  const startChunkY = Math.floor(bounds.startY / chunkSizeCells.height)
  const endChunkY = Math.floor(bounds.endY / chunkSizeCells.height)
  const chunkIds: string[] = []

  for (let chunkY = startChunkY; chunkY <= endChunkY; chunkY += 1) {
    for (let chunkX = startChunkX; chunkX <= endChunkX; chunkX += 1) {
      chunkIds.push(`chunk_${chunkX}_${chunkY}`)
    }
  }

  return chunkIds
}

function isEastHanLayeredViewportRequested(options: Extract<ResolvedWorldMapLayoutOptions, { scope: 'viewport' }>) {
  return (
    options.layer === 'layered' ||
    options.worldId === EAST_HAN_LAYERED_WORLD_ID ||
    options.coordinateSpace === EAST_HAN_LAYERED_COORDINATE_SPACE ||
    (options.includeLayers?.length ?? 0) > 0
  )
}

function readEastHanLayeredAdapterArtifact(): JsonRecord | null {
  if (eastHanLayeredAdapterCache !== undefined) {
    return eastHanLayeredAdapterCache
  }

  if (!existsSync(EAST_HAN_LAYERED_ADAPTER_ARTIFACT_PATH)) {
    eastHanLayeredAdapterCache = null
    return eastHanLayeredAdapterCache
  }

  try {
    const parsed = JSON.parse(readFileSync(EAST_HAN_LAYERED_ADAPTER_ARTIFACT_PATH, 'utf8')) as unknown
    eastHanLayeredAdapterCache = isJsonRecord(parsed) ? parsed : null
  } catch {
    eastHanLayeredAdapterCache = null
  }

  return eastHanLayeredAdapterCache
}

function readEastHanTianxiaYutuRuntimeTileManifestArtifact(): JsonRecord | null {
  if (eastHanTianxiaYutuRuntimeTileManifestCache !== undefined) {
    return eastHanTianxiaYutuRuntimeTileManifestCache
  }

  if (!existsSync(EAST_HAN_TIANXIA_YUTU_RUNTIME_TILE_MANIFEST_PATH)) {
    eastHanTianxiaYutuRuntimeTileManifestCache = null
    return eastHanTianxiaYutuRuntimeTileManifestCache
  }

  try {
    const parsed = JSON.parse(readFileSync(EAST_HAN_TIANXIA_YUTU_RUNTIME_TILE_MANIFEST_PATH, 'utf8')) as unknown
    eastHanTianxiaYutuRuntimeTileManifestCache = isJsonRecord(parsed) ? parsed : null
  } catch {
    eastHanTianxiaYutuRuntimeTileManifestCache = null
  }

  return eastHanTianxiaYutuRuntimeTileManifestCache
}

function readEastHanTianxiaYutuAdminFocusMaskManifestArtifact(): JsonRecord | null {
  if (eastHanTianxiaYutuAdminFocusMaskManifestCache !== undefined) {
    return eastHanTianxiaYutuAdminFocusMaskManifestCache
  }

  if (!existsSync(EAST_HAN_TIANXIA_YUTU_ADMIN_FOCUS_MASK_MANIFEST_PATH)) {
    eastHanTianxiaYutuAdminFocusMaskManifestCache = null
    return eastHanTianxiaYutuAdminFocusMaskManifestCache
  }

  try {
    const parsed = JSON.parse(readFileSync(EAST_HAN_TIANXIA_YUTU_ADMIN_FOCUS_MASK_MANIFEST_PATH, 'utf8')) as unknown
    eastHanTianxiaYutuAdminFocusMaskManifestCache = isJsonRecord(parsed) ? parsed : null
  } catch {
    eastHanTianxiaYutuAdminFocusMaskManifestCache = null
  }

  return eastHanTianxiaYutuAdminFocusMaskManifestCache
}

function readEastHanAcceptedAuthoringSeedArtifact(): JsonRecord | null {
  if (eastHanAcceptedAuthoringSeedCache !== undefined) {
    return eastHanAcceptedAuthoringSeedCache
  }

  if (!existsSync(EAST_HAN_ACCEPTED_AUTHORING_SEED_PATH)) {
    eastHanAcceptedAuthoringSeedCache = null
    return eastHanAcceptedAuthoringSeedCache
  }

  try {
    const parsed = JSON.parse(readFileSync(EAST_HAN_ACCEPTED_AUTHORING_SEED_PATH, 'utf8')) as unknown
    eastHanAcceptedAuthoringSeedCache = isJsonRecord(parsed) ? parsed : null
  } catch {
    eastHanAcceptedAuthoringSeedCache = null
  }

  return eastHanAcceptedAuthoringSeedCache
}

function readEastHanStateBoundarySegmentsArtifact(): JsonRecord | null {
  if (eastHanStateBoundarySegmentsCache !== undefined) {
    return eastHanStateBoundarySegmentsCache
  }

  if (!existsSync(EAST_HAN_STATE_BOUNDARY_SEGMENTS_PATH)) {
    eastHanStateBoundarySegmentsCache = null
    return eastHanStateBoundarySegmentsCache
  }

  try {
    const parsed = JSON.parse(readFileSync(EAST_HAN_STATE_BOUNDARY_SEGMENTS_PATH, 'utf8')) as unknown
    eastHanStateBoundarySegmentsCache = isJsonRecord(parsed) ? parsed : null
  } catch {
    eastHanStateBoundarySegmentsCache = null
  }

  return eastHanStateBoundarySegmentsCache
}

function readEastHanMainWorldMountainBoundaryContractArtifact(): JsonRecord | null {
  if (eastHanMainWorldMountainBoundaryContractCache !== undefined) {
    return eastHanMainWorldMountainBoundaryContractCache
  }

  if (!existsSync(EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_CONTRACT_PATH)) {
    eastHanMainWorldMountainBoundaryContractCache = null
    return eastHanMainWorldMountainBoundaryContractCache
  }

  try {
    const parsed = JSON.parse(readFileSync(EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_CONTRACT_PATH, 'utf8')) as unknown
    eastHanMainWorldMountainBoundaryContractCache = isJsonRecord(parsed) ? parsed : null
  } catch {
    eastHanMainWorldMountainBoundaryContractCache = null
  }

  return eastHanMainWorldMountainBoundaryContractCache
}

function readEastHanMainWorldMountainBoundaryAssetManifest(): JsonRecord | null {
  if (eastHanMainWorldMountainBoundaryAssetManifestCache !== undefined) {
    return eastHanMainWorldMountainBoundaryAssetManifestCache
  }

  if (!existsSync(EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_ASSET_MANIFEST_PATH)) {
    eastHanMainWorldMountainBoundaryAssetManifestCache = null
    return eastHanMainWorldMountainBoundaryAssetManifestCache
  }

  try {
    const parsed = JSON.parse(readFileSync(EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_ASSET_MANIFEST_PATH, 'utf8')) as unknown
    eastHanMainWorldMountainBoundaryAssetManifestCache = isJsonRecord(parsed) ? parsed : null
  } catch {
    eastHanMainWorldMountainBoundaryAssetManifestCache = null
  }

  return eastHanMainWorldMountainBoundaryAssetManifestCache
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function jsonRecordFrom(value: unknown): JsonRecord {
  return isJsonRecord(value) ? value : {}
}

function jsonRecordArrayFrom(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isJsonRecord) : []
}

function stringArrayFrom(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function normalizeEastHanLayeredChunkIds(chunkIds?: string[]) {
  if (!chunkIds || chunkIds.length === 0) {
    return []
  }

  const normalized: string[] = []
  const seen = new Set<string>()
  for (const rawChunkId of chunkIds) {
    const chunkId = rawChunkId.trim()
    if (!/^chunk_y\d{3}_x\d{3}$/.test(chunkId) || seen.has(chunkId)) {
      continue
    }
    normalized.push(chunkId)
    seen.add(chunkId)
  }
  return normalized
}

function orderedDifference(left: string[], right: Set<string>) {
  return left.filter((item) => !right.has(item))
}

function orderedIntersection(left: string[], right: Set<string>) {
  return left.filter((item) => right.has(item))
}

function positiveNumberFrom(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}

function sizeFromArray(value: unknown, fallback: CellSize) {
  if (!Array.isArray(value) || value.length < 2) {
    return fallback
  }

  const width = Number(value[0])
  const height = Number(value[1])
  return normalizePositiveSize(
    {
      width: Number.isFinite(width) ? width : fallback.width,
      height: Number.isFinite(height) ? height : fallback.height,
    },
    fallback,
  )
}

function eastHanLayeredWorldSize(adapter: JsonRecord): CellSize {
  const world = jsonRecordFrom(adapter.world)
  return sizeFromArray(world.world_size_cells, { width: 8070, height: 7390 })
}

function eastHanLayeredLayerOrder(adapter: JsonRecord, requestedLayers?: WorldMapLayoutLayerRequest[]) {
  if (requestedLayers && requestedLayers.length > 0) {
    const filtered = requestedLayers.filter((layer) => EAST_HAN_LAYERED_LAYER_REQUEST_SET.has(layer))
    if (filtered.length > 0) {
      return filtered
    }
  }

  const contract = jsonRecordFrom(adapter.viewport_request_contract)
  const fromContract = stringArrayFrom(contract.layer_order)
  return fromContract.length > 0 ? fromContract : [...EAST_HAN_LAYERED_DEFAULT_LAYER_ORDER]
}

function clampLayeredCenter(value: number, size: number) {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.min(size - 1, Math.floor(value)))
}

function buildCenteredExclusiveBounds(centerX: number, centerY: number, visibleCells: CellSize): ExclusiveCellBounds {
  const startX = centerX - Math.floor(visibleCells.width / 2)
  const startY = centerY - Math.floor(visibleCells.height / 2)
  return {
    startX,
    startY,
    endXExclusive: startX + visibleCells.width,
    endYExclusive: startY + visibleCells.height,
  }
}

function expandExclusiveBounds(bounds: ExclusiveCellBounds, marginCells: number): ExclusiveCellBounds {
  return {
    startX: bounds.startX - marginCells,
    startY: bounds.startY - marginCells,
    endXExclusive: bounds.endXExclusive + marginCells,
    endYExclusive: bounds.endYExclusive + marginCells,
  }
}

function clampExclusiveBoundsToWorld(bounds: ExclusiveCellBounds, worldSize: CellSize): ExclusiveCellBounds {
  const startX = Math.max(0, Math.min(worldSize.width - 1, bounds.startX))
  const startY = Math.max(0, Math.min(worldSize.height - 1, bounds.startY))
  const endXExclusive = Math.max(startX + 1, Math.min(worldSize.width, bounds.endXExclusive))
  const endYExclusive = Math.max(startY + 1, Math.min(worldSize.height, bounds.endYExclusive))
  return {
    startX,
    startY,
    endXExclusive,
    endYExclusive,
  }
}

function formatEastHanChunkId(chunkX: number, chunkY: number) {
  return `chunk_y${String(chunkY).padStart(3, '0')}_x${String(chunkX).padStart(3, '0')}`
}

function eastHanMainMapCellId(worldId: string, cellX: number, cellY: number) {
  return `${worldId}:${cellX}:${cellY}`
}

function eastHanMainMapChunkId(cellX: number, cellY: number) {
  return formatEastHanChunkId(Math.floor(cellX / 64), Math.floor(cellY / 64))
}

const EAST_HAN_WORLD_CELL_ASSET_MANIFEST_PATH =
  'res://assets/themes/slgclient/current/world/world_cell_assets_manifest_v1.json'
const EAST_HAN_WORLD_CELL_FOOTPRINT_MANIFEST_PATH =
  'res://assets/themes/slgclient/current/world/world_cell_footprint_manifest_v1.json'
const EAST_HAN_ZERO_LEVEL_SUBSTRATE_MANIFEST_PATH =
  'res://assets/themes/slgclient/current/world/substrate/world_substrate_zero_level_manifest_v1.json'
const EAST_HAN_ZERO_LEVEL_SUBSTRATE_ASSET_PATH =
  'res://assets/themes/slgclient/current/world/substrate/world_cell_zero_level_substrate_v1.png'
const EAST_HAN_ACCEPTED_EXPERIMENT_ART_ASSET_INDEX_PATH =
  'experiments/east_asia_map_pipeline/generated/accepted_experiment_art_asset_index_v0_1/accepted_experiment_art_asset_index_v0_1.json'
const EAST_HAN_ACCEPTED_CITY_ASSET_BY_FOOTPRINT: Record<string, JsonRecord> = {
  '3x3': {
    accepted_city_asset_id: 'city_3x3_accepted_experiment',
    accepted_city_role: 'player_main_city',
    asset_status: 'accepted_experiment_city_art',
    logic_placeholder: false,
    asset_path: 'res://assets/themes/slgclient/current/world/accepted_experiment_cities/city_3x3_source_chroma_removed.png',
    source_asset_path:
      'experiments/east_asia_map_pipeline/generated/accepted_experiment_art_asset_index_v0_1/cities/3x3/city_3x3_source_chroma_removed.png',
    source_asset_sha256: '39bb20a5c910a1e4fc5c0781babf1d45abe2e7d3f9fbe56ad79f9f57d544040d',
  },
  '5x5': {
    accepted_city_asset_id: 'city_5x5_accepted_experiment',
    accepted_city_role: 'system_city',
    asset_status: 'accepted_experiment_city_art',
    logic_placeholder: false,
    asset_path: 'res://assets/themes/slgclient/current/world/accepted_experiment_cities/city_5x5_source_chroma_removed.png',
    source_asset_path:
      'experiments/east_asia_map_pipeline/generated/accepted_experiment_art_asset_index_v0_1/cities/5x5/city_5x5_source_chroma_removed.png',
    source_asset_sha256: '2b67fbc58a69c8d0268c02ea51e7779067c589ebe66d45a77600323c747702f6',
  },
  '7x7': {
    accepted_city_asset_id: 'city_7x7_accepted_experiment',
    accepted_city_role: 'major_system_city',
    asset_status: 'accepted_experiment_city_art',
    logic_placeholder: false,
    asset_path: 'res://assets/themes/slgclient/current/world/accepted_experiment_cities/city_7x7_source_chroma_removed.png',
    source_asset_path:
      'experiments/east_asia_map_pipeline/generated/accepted_experiment_art_asset_index_v0_1/cities/7x7/city_7x7_source_chroma_removed.png',
    source_asset_sha256: '72349e6d14f6a674a289759816322ffe858dad2e90b4bdd5f53d1aabc37d9991',
  },
}
const EAST_HAN_FACTION_HOME_CITY_ANCHOR_SEEDS_BY_TILE_ID: Record<
  string,
  { cellX: number; cellY: number; kind: 'player_city' | 'ai_city'; role: string; footprintId: string; prefabId: string }
> = {
  tile_08: {
    cellX: 4300,
    cellY: 2538,
    kind: 'player_city',
    role: 'player_main_city',
    footprintId: 'player_city_3x3_initial',
    prefabId: 'world_node_city_v1',
  },
  tile_10: {
    cellX: 4624,
    cellY: 2538,
    kind: 'ai_city',
    role: 'ai_main_city',
    footprintId: 'ai_city_3x3_initial',
    prefabId: 'world_node_ai_city_3x3_v1',
  },
}

function parseEastHanChunkId(chunkId: string) {
  const match = /^chunk_y(\d{3})_x(\d{3})$/.exec(chunkId)
  if (!match) {
    return undefined
  }

  return {
    chunkX: Number(match[2]),
    chunkY: Number(match[1]),
  }
}

function buildEastHanMainWorldCellLayer(loadedChunkIds: string[], chunkSizeCells: CellSize, worldSize: CellSize) {
  const selectableChunkRanges = loadedChunkIds
    .map((chunkId) => {
      const parsed = parseEastHanChunkId(chunkId)
      if (!parsed) {
        return undefined
      }
      const startX = parsed.chunkX * chunkSizeCells.width
      const startY = parsed.chunkY * chunkSizeCells.height
      const endXExclusive = Math.min(worldSize.width, startX + chunkSizeCells.width)
      const endYExclusive = Math.min(worldSize.height, startY + chunkSizeCells.height)
      const selectableCellCount = Math.max(0, endXExclusive - startX) * Math.max(0, endYExclusive - startY)
      return {
        chunk_id: chunkId,
        chunk_x: parsed.chunkX,
        chunk_y: parsed.chunkY,
        chunk_size_cells: [chunkSizeCells.width, chunkSizeCells.height],
        cell_range: {
          start_x: startX,
          start_y: startY,
          end_x_exclusive: endXExclusive,
          end_y_exclusive: endYExclusive,
        },
        selectable_cell_count: selectableCellCount,
        object_upsert_count: 0,
      }
    })
    .filter((range): range is NonNullable<typeof range> => !!range && range.selectable_cell_count > 0)

  const selectableCellCount = selectableChunkRanges.reduce((sum, range) => sum + range.selectable_cell_count, 0)

  return {
    display_order: 1,
    schema_version: 'east_han_main_world_cell_layer_v0_1',
    world_id: EAST_HAN_LAYERED_WORLD_ID,
    coordinate_space: EAST_HAN_LAYERED_COORDINATE_SPACE,
    renderer_mode: 'chunk_range_selectable_cells',
    substrate_renderer_mode: 'chunk_texture_substrate',
    projection_scaled_to_preview: false,
    preview_bridge_enabled: false,
    chunk_size_cells: [chunkSizeCells.width, chunkSizeCells.height],
    loaded_chunk_count: loadedChunkIds.length,
    selectable_chunk_ranges: selectableChunkRanges,
    selectable_cell_count: selectableCellCount,
    zero_level_ground_object_mode: 'implicit_base_map',
    zero_level_object_upsert_count: 0,
    object_upsert_count: 0,
    resource_eligibility_source: 'east_han_playability_maritime_derived_masks_v0_1.resource_eligible_mask_u8',
    client_authority: 'server_authoritative_chunk_ranges_client_draws_selectable_proxy',
  }
}

function buildEastHanSubstrateChunkTextures(loadedChunkIds: string[], chunkSizeCells: CellSize, worldSize: CellSize) {
  return loadedChunkIds
    .map((chunkId) => {
      const parsed = parseEastHanChunkId(chunkId)
      if (!parsed) {
        return undefined
      }
      const startX = parsed.chunkX * chunkSizeCells.width
      const startY = parsed.chunkY * chunkSizeCells.height
      const endXExclusive = Math.min(worldSize.width, startX + chunkSizeCells.width)
      const endYExclusive = Math.min(worldSize.height, startY + chunkSizeCells.height)
      if (startX >= endXExclusive || startY >= endYExclusive) {
        return undefined
      }

      return {
        texture_id: `real_map_data_1km:${chunkId}`,
        texture_kind: 'procedural_real_map_1km_substrate',
        texture_status: 'runtime_generated_from_real_map_data_1km_chunk_ref',
        chunk_id: chunkId,
        chunk_x: parsed.chunkX,
        chunk_y: parsed.chunkY,
        coordinate_space: EAST_HAN_LAYERED_COORDINATE_SPACE,
        source: 'real_map_data_1km',
        source_chunk_ref: `experiments/east_asia_map_pipeline/generated/real_map_data_1km/chunks/${chunkId}.npz`,
        cell_size_km: 1,
        chunk_size_cells: [chunkSizeCells.width, chunkSizeCells.height],
        cell_range: {
          start_x: startX,
          start_y: startY,
          end_x_exclusive: endXExclusive,
          end_y_exclusive: endYExclusive,
        },
        draw_layer: 'base_map',
        draw_order: 0,
        projection: 'isometric_2_to_1_direct_cell_1km',
        lod: 'substrate_chunk',
      }
    })
    .filter((chunk): chunk is NonNullable<typeof chunk> => !!chunk)
}

function eastHanCellKey(cellX: number, cellY: number) {
  return `${Math.floor(cellX)}:${Math.floor(cellY)}`
}

function numberPairArrayFrom(value: unknown): Array<{ x: number; y: number }> {
  if (!Array.isArray(value)) {
    return []
  }

  const pairs: Array<{ x: number; y: number }> = []
  for (const item of value) {
    if (!Array.isArray(item) || item.length < 2) {
      continue
    }
    const x = Number(item[0])
    const y = Number(item[1])
    if (Number.isFinite(x) && Number.isFinite(y)) {
      pairs.push({ x: Math.floor(x), y: Math.floor(y) })
    }
  }
  return pairs
}

function numberPairFrom(value: unknown, fallback: { x: number; y: number }): { x: number; y: number } {
  if (!Array.isArray(value) || value.length < 2) {
    return fallback
  }

  const x = Number(value[0])
  const y = Number(value[1])
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return fallback
  }

  return { x: Math.floor(x), y: Math.floor(y) }
}

function numberArrayFrom(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map((item) => Number(item)).filter((item) => Number.isFinite(item))
}

function pairArrayToJson(pairs: Array<{ x: number; y: number }>) {
  return pairs.map((cell) => [cell.x, cell.y])
}

function cellInsideExclusiveBounds(cellX: number, cellY: number, bounds: ExclusiveCellBounds) {
  return (
    cellX >= bounds.startX &&
    cellX < bounds.endXExclusive &&
    cellY >= bounds.startY &&
    cellY < bounds.endYExclusive
  )
}

function exclusiveBoundsIntersect(left: ExclusiveCellBounds, right: ExclusiveCellBounds) {
  return (
    left.startX < right.endXExclusive &&
    left.endXExclusive > right.startX &&
    left.startY < right.endYExclusive &&
    left.endYExclusive > right.startY
  )
}

function exclusiveBoundsFromMountainPlacement(placement: JsonRecord): ExclusiveCellBounds | undefined {
  const transform = jsonRecordFrom(placement.worldTransformCandidate)
  const bounds = jsonRecordFrom(transform.reservedWorldBounds)
  const minX = Number(bounds.minX ?? bounds.min_x)
  const minY = Number(bounds.minY ?? bounds.min_y)
  const maxX = Number(bounds.maxX ?? bounds.max_x)
  const maxY = Number(bounds.maxY ?? bounds.max_y)
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) {
    return undefined
  }

  return {
    startX: Math.floor(minX),
    startY: Math.floor(minY),
    endXExclusive: Math.floor(maxX) + 1,
    endYExclusive: Math.floor(maxY) + 1,
  }
}

function eastHanMountainPlacementOriginCell(placement: JsonRecord) {
  const transform = jsonRecordFrom(placement.worldTransformCandidate)
  const origin = jsonRecordFrom(transform.candidateWorldOriginCell)
  const x = Number(origin.x)
  const y = Number(origin.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return undefined
  }
  return { x: Math.floor(x), y: Math.floor(y) }
}

type EastHanMountainBoundaryLayerBuildResult = {
  layer: JsonRecord
  resourceExclusionSummary: JsonRecord
  hardReservedCellKeys: Set<string>
}

function buildEastHanMountainBoundaryRuntimeAssetSummary(assetManifest: JsonRecord | null): JsonRecord {
  const frames = jsonRecordFrom(assetManifest?.frames)
  return {
    schema_version: String(assetManifest?.schema_version ?? '').trim(),
    runtime_copy_gate: String(assetManifest?.runtime_copy_gate ?? 'MISSING_FORMAL_RUNTIME_ASSET_MANIFEST').trim(),
    asset_root: String(assetManifest?.asset_root ?? EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_ASSET_ROOT).trim(),
    asset_manifest_path: EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_ASSET_MANIFEST_RES_PATH,
    repo_asset_manifest_path: EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_ASSET_MANIFEST_PATH,
    source_runtime_contract_artifact_id: String(assetManifest?.source_runtime_contract_artifact_id ?? '').trim(),
    piece_asset_count: Object.keys(frames).length,
    fine_piece_library_added_count: Number(assetManifest?.fine_piece_library_added_count ?? 0),
    fine_piece_ids: Array.isArray(assetManifest?.fine_piece_ids) ? assetManifest?.fine_piece_ids : [],
    source_runtime_copy_gate_policy:
      'v0.47 runtimeCopyGate stays audit-only; formal Godot runtime consumes this explicit asset manifest',
  }
}

function buildEastHanAcceptedChokepointArtSourceSummary(): JsonRecord {
  return {
    source_contract_artifact_id: EAST_HAN_CONTESTED_CHOKEPOINT_CONTRACT_ARTIFACT_ID,
    source_contract_path: EAST_HAN_CONTESTED_CHOKEPOINT_CONTRACT_REPO_PATH,
    source_markdown_path: EAST_HAN_CONTESTED_CHOKEPOINT_CONTRACT_MARKDOWN_REPO_PATH,
    earlier_acceptance_review_path: EAST_HAN_CONTESTED_CHOKEPOINT_EARLIER_ACCEPTANCE_REVIEW_REPO_PATH,
    master_source_png: EAST_HAN_CONTESTED_CHOKEPOINT_MASTER_SOURCE_REPO_PATH,
    master_normal_png: EAST_HAN_CONTESTED_CHOKEPOINT_MASTER_NORMAL_REPO_PATH,
    visual_role: 'accepted_contested_pass_wall_chokepoint_art',
    connector_node_policy: 'pass wall can be treated as a connector node inside the mountain ridge graph',
    single_pass_rule:
      'one large province boundary may contain at most one fortified pass/chokepoint model; both sides continue with mountain-only pieces',
    integration_status: 'accepted_art_exists_not_auto_spawned_by_v0_47_mountain_boundary_runtime',
    runtime_node_policy:
      'gate/chokepoint anchors stay in existing gate jump/navigation system until a dedicated pass-wall runtime adapter is added',
    generic_mountain_boundary_policy:
      'v0.47 mountain boundary placements render blockade pieces only and must not infer a pass-wall node from generic mountain placement data',
  }
}

function eastHanChokepointStatePairKey(target: JsonRecord): string {
  const fromState = String(target.from_state_group_id ?? target.from_state_group_label ?? '').trim()
  const toState = String(target.to_state_group_id ?? target.to_state_group_label ?? '').trim()
  if (fromState === '' || toState === '') {
    return ''
  }
  return [fromState, toState].sort().join('__')
}

function buildEastHanMainWorldChokepointRenderPiece(target: JsonRecord, nodeId: string): JsonRecord {
  const cell = jsonRecordFrom(target.cell_1km)
  const x = Math.round(Number(cell.x))
  const y = Math.round(Number(cell.y))
  return {
    render_piece_id: `${nodeId}:pass_wall_master_v0_31`,
    runtime_chokepoint_id: nodeId,
    piece_id: 'pass_wall_master_v0_31',
    source_contract_piece_id: 'mountain_barrier_contested_chokepoint_contract_pass_wall_candidate_v0_31',
    asset_path: EAST_HAN_CONTESTED_CHOKEPOINT_MASTER_ASSET_RES_PATH,
    source_asset_repo_path: EAST_HAN_CONTESTED_CHOKEPOINT_MASTER_SOURCE_REPO_PATH,
    normal_asset_repo_path: EAST_HAN_CONTESTED_CHOKEPOINT_MASTER_NORMAL_REPO_PATH,
    cell_1km: [x, y],
    anchor_local_cell: [2, 2],
    local_gate_center_cell: [2, 2],
    fit_footprint_cells: [5, 5],
    local_bounds_cells: {
      min_x: 0,
      min_y: 0,
      max_x: 4,
      max_y: 4,
      width: 5,
      height: 5,
    },
    occupied_cells: [
      [0, 4],
      [1, 3],
      [2, 2],
      [3, 1],
      [4, 0],
    ],
    source_anchor_px: [384, 128],
    image_size_px: [768, 256],
    source_cell_width_px: 153.6,
    source_cell_height_px: 76.8,
    visual_fit_scale: 1,
    projection: 'isometric_2_to_1_direct_cell_1km',
    z_order_policy: 'draw_after_adjacent_mountain_tails_to_hide_pass_wall_end_seams',
  }
}

function buildEastHanMainWorldChokepointMetadata(target: JsonRecord, nodeId: string, x: number, y: number): JsonRecord {
  const gateId = String(target.source_gate_id ?? target.target_id ?? '').trim()
  const gateName = String(target.original_gate_name ?? target.label ?? '关口').trim()
  const displayName = String(target.navigation_label ?? target.label ?? gateName).trim()
  return {
    metadata_contract_version: 'main_world_chokepoint_metadata_v0_1',
    runtime_chokepoint_id: nodeId,
    gate_id: gateId,
    gate_name: gateName,
    display_name: displayName,
    target_scope: 'gate',
    world_coordinate: {
      coordinate_space: EAST_HAN_LAYERED_COORDINATE_SPACE,
      cell_1km: { x, y },
    },
    adjacent_states: {
      from: {
        id: String(target.from_state_group_id ?? '').trim(),
        label: String(target.from_state_group_label ?? '').trim(),
      },
      to: {
        id: String(target.to_state_group_id ?? '').trim(),
        label: String(target.to_state_group_label ?? '').trim(),
      },
    },
    adjacent_commanderies: {
      from: {
        id: String(target.from_region_id ?? '').trim(),
        label: String(target.from_region_label ?? '').trim(),
      },
      to: {
        id: String(target.to_region_id ?? '').trim(),
        label: String(target.to_region_label ?? '').trim(),
      },
    },
    formal_chokepoint: true,
    formal_pass_wall: true,
    formal_pass_wall_piece_id: 'pass_wall_master_v0_31',
    source_artifact_id: EAST_HAN_CONTESTED_CHOKEPOINT_CONTRACT_ARTIFACT_ID,
    source_artifact_path: EAST_HAN_CONTESTED_CHOKEPOINT_CONTRACT_REPO_PATH,
    source_contract_version: 'v0_31',
    runtime_adapter_schema_version: 'east_han_main_world_chokepoint_layer_v0_1',
  }
}

function buildEastHanMainWorldChokepointLayer(preloadBoundsCells: ExclusiveCellBounds): JsonRecord {
  const acceptedChokepointArtSource = buildEastHanAcceptedChokepointArtSourceSummary()
  const acceptedGateTargets = buildEastHanAcceptedGateJumpTargets()
  const seenBoundaryPairs = new Set<string>()
  const nodes: JsonRecord[] = []
  const suppressedGateCandidates: JsonRecord[] = []

  for (const target of acceptedGateTargets) {
    if (String(target.target_scope ?? '').trim() !== 'gate') {
      continue
    }
    if (!Boolean(target.cross_state_group)) {
      continue
    }

    const boundaryPairKey = eastHanChokepointStatePairKey(target)
    if (boundaryPairKey === '') {
      continue
    }

    if (seenBoundaryPairs.has(boundaryPairKey)) {
      suppressedGateCandidates.push({
        source_gate_id: String(target.source_gate_id ?? target.target_id ?? '').trim(),
        label: String(target.label ?? '').trim(),
        boundary_pair_key: boundaryPairKey,
        suppression_reason: 'one_large_state_boundary_allows_at_most_one_pass_wall_node',
        cell_1km: jsonRecordFrom(target.cell_1km),
      })
      continue
    }
    seenBoundaryPairs.add(boundaryPairKey)

    const cell = jsonRecordFrom(target.cell_1km)
    const x = Math.round(Number(cell.x))
    const y = Math.round(Number(cell.y))
    if (!Number.isFinite(x) || !Number.isFinite(y) || !cellInsideExclusiveBounds(x, y, preloadBoundsCells)) {
      continue
    }

    const nodeId = `accepted_pass_wall_${String(target.source_gate_id ?? target.target_id ?? `${x}_${y}`).trim()}`
    const renderPiece = buildEastHanMainWorldChokepointRenderPiece(target, nodeId)
    const metadata = buildEastHanMainWorldChokepointMetadata(target, nodeId, x, y)
    nodes.push({
      runtime_chokepoint_id: nodeId,
      source_gate_jump_target_id: String(target.target_id ?? '').trim(),
      source_gate_id: String(target.source_gate_id ?? '').trim(),
      gate_id: String(metadata.gate_id ?? '').trim(),
      gate_name: String(metadata.gate_name ?? '').trim(),
      display_name: String(metadata.display_name ?? '').trim(),
      target_scope: 'gate',
      kind: 'pass_wall',
      formal_chokepoint: true,
      formal_pass_wall: true,
      source_artifact_id: String(metadata.source_artifact_id ?? '').trim(),
      source_artifact_path: String(metadata.source_artifact_path ?? '').trim(),
      source_contract_version: String(metadata.source_contract_version ?? '').trim(),
      roles: ['gate', 'strategic_pass', 'pass_wall_connector_node'],
      label: String(target.label ?? '关口').trim(),
      navigation_label: String(target.navigation_label ?? target.label ?? '关口').trim(),
      cell_1km: { x, y },
      world_coordinate: metadata.world_coordinate,
      boundary_pair_key: boundaryPairKey,
      from_state_group_id: String(target.from_state_group_id ?? '').trim(),
      to_state_group_id: String(target.to_state_group_id ?? '').trim(),
      from_state_group_label: String(target.from_state_group_label ?? '').trim(),
      to_state_group_label: String(target.to_state_group_label ?? '').trim(),
      from_region_id: String(target.from_region_id ?? '').trim(),
      to_region_id: String(target.to_region_id ?? '').trim(),
      from_region_label: String(target.from_region_label ?? '').trim(),
      to_region_label: String(target.to_region_label ?? '').trim(),
      adjacent_states: metadata.adjacent_states,
      adjacent_commanderies: metadata.adjacent_commanderies,
      cross_state_group: true,
      boundary_snap_status: String(target.boundary_snap_status ?? '').trim(),
      boundary_snap_basis: String(target.boundary_snap_basis ?? '').trim(),
      source_contract_artifact_id: EAST_HAN_CONTESTED_CHOKEPOINT_CONTRACT_ARTIFACT_ID,
      source_contract_asset_id: 'mountain_barrier_contested_chokepoint_contract_pass_wall_candidate_v0_31',
      asset_path: EAST_HAN_CONTESTED_CHOKEPOINT_MASTER_ASSET_RES_PATH,
      source_asset_repo_path: EAST_HAN_CONTESTED_CHOKEPOINT_MASTER_SOURCE_REPO_PATH,
      normal_asset_repo_path: EAST_HAN_CONTESTED_CHOKEPOINT_MASTER_NORMAL_REPO_PATH,
      attackSurfaceCells: [[2, 2]],
      visibleAttackContactCells: [
        [1, 4],
        [2, 4],
        [2, 3],
        [3, 3],
        [4, 3],
        [4, 2],
        [5, 2],
      ],
      ridge_ports: [
        {
          id: 'screen_left_ridge_port',
          localCell: [0, 4],
          outwardStep: [-1, 1],
          connection_policy: 'mountain_only_tail_piece',
        },
        {
          id: 'screen_right_ridge_port',
          localCell: [4, 0],
          outwardStep: [1, -1],
          connection_policy: 'mountain_only_tail_piece',
        },
      ],
      single_pass_rule:
        'one large province boundary may contain at most one pass-wall node; both ends must connect only to mountain pieces',
      navigation_reuse_policy:
        'reuses accepted gate jump target and city_gate_anchor_layer semantics; this layer does not create a new navigation system',
      resource_exclusion_policy:
        'pass-wall node rendering does not expand generic mountain reservedLocalCells; resource hard exclusion remains driven by formal mountain boundary placements',
      creates_mountain_boundary_placement: false,
      stable_metadata: metadata,
      render_pieces: [renderPiece],
    })
  }

  return {
    display_order: 5,
    schema_version: 'east_han_main_world_chokepoint_layer_v0_1',
    activation: 'main_world_only',
    world_id: EAST_HAN_LAYERED_WORLD_ID,
    coordinate_space: EAST_HAN_LAYERED_COORDINATE_SPACE,
    source_anchor_policy: 'reuse_existing_gate_jump_targets_and_city_gate_anchor_layer',
    stable_metadata_contract_version: 'main_world_chokepoint_metadata_v0_1',
    metadata_consumer_policy:
      'external overview surfaces may consume stable_metadata for labels/hover/jump context but must not redraw main-world pass-wall sprites',
    source_contract_artifact_id: EAST_HAN_CONTESTED_CHOKEPOINT_CONTRACT_ARTIFACT_ID,
    accepted_chokepoint_art_source: {
      ...acceptedChokepointArtSource,
      integration_status: 'dedicated_main_world_chokepoint_runtime_adapter_enabled',
      runtime_node_policy: 'accepted cross-state gate anchors produce a separate pass-wall node layer',
      runtime_asset_path: EAST_HAN_CONTESTED_CHOKEPOINT_MASTER_ASSET_RES_PATH,
    },
    one_pass_per_large_boundary_policy:
      'dedupe accepted gate jump targets by unordered from/to state group pair before emitting pass-wall nodes',
    mountain_connection_policy:
      'pass-wall ridge ports may only connect to adjacent mountain-only tail pieces; pass-wall nodes must never be chained together',
    navigation_policy: 'existing_jump_targets_and_coordinate_click_remain_authoritative',
    accepted_gate_candidate_count: acceptedGateTargets.length,
    accepted_pass_wall_node_count: nodes.length,
    suppressed_duplicate_gate_candidate_count: suppressedGateCandidates.length,
    suppressed_duplicate_gate_candidates: suppressedGateCandidates.slice(0, 48),
    render_piece_instance_count: nodes.reduce((sum, node) => sum + jsonRecordArrayFrom(node.render_pieces).length, 0),
    visible_nodes: nodes,
  }
}

function buildEastHanMountainBoundaryRenderPieces(
  placement: JsonRecord,
  origin: { x: number; y: number } | undefined,
  assetFrames: JsonRecord,
): JsonRecord[] {
  if (!origin) {
    return []
  }

  const runtimePlacementId = String(placement.runtimePlacementId ?? '').trim()
  const renderPieces: JsonRecord[] = []
  for (const [index, instance] of jsonRecordArrayFrom(placement.pieceInstances).entries()) {
    const pieceId = String(instance.pieceId ?? '').trim()
    if (pieceId === '') {
      continue
    }
    const frame = jsonRecordFrom(assetFrames[pieceId])
    const assetPath = String(frame.asset_path ?? '').trim()
    if (assetPath === '') {
      continue
    }

    const pieceOffset = numberPairFrom(instance.offset, { x: 0, y: 0 })
    const anchorLocalCell = numberPairFrom(frame.anchor_local_cell, { x: 0, y: 0 })
    const anchorWorldCell = {
      x: origin.x + pieceOffset.x + anchorLocalCell.x,
      y: origin.y + pieceOffset.y + anchorLocalCell.y,
    }
    const localBounds = jsonRecordFrom(frame.local_bounds_cells)
    const fitFootprintCells = numberArrayFrom(frame.fit_footprint_cells)
    const sourceAnchorPx = numberArrayFrom(frame.source_anchor_px)
    const imageSizePx = numberArrayFrom(frame.image_size_px)

    renderPieces.push({
      render_piece_id: `${runtimePlacementId}:${String(index).padStart(2, '0')}:${pieceId}`,
      runtime_placement_id: runtimePlacementId,
      piece_id: pieceId,
      source_piece_instance_index: index,
      asset_path: assetPath,
      file: String(frame.file ?? '').trim(),
      cell_1km: [anchorWorldCell.x, anchorWorldCell.y],
      piece_offset: [pieceOffset.x, pieceOffset.y],
      anchor_local_cell: [anchorLocalCell.x, anchorLocalCell.y],
      local_bounds_cells: localBounds,
      fit_footprint_cells: fitFootprintCells,
      source_anchor_px: sourceAnchorPx,
      image_size_px: imageSizePx,
      source_cell_width_px: Number(frame.source_cell_width_px ?? 64),
      source_cell_height_px: Number(frame.source_cell_height_px ?? 32),
      visual_fit_scale: Number(frame.visual_fit_scale ?? 1),
      projection: 'isometric_2_to_1_direct_cell_1km',
    })
  }

  return renderPieces
}

function finiteNumberOrFallback(rawValue: unknown, fallback: number): number {
  const value = Number(rawValue)
  return Number.isFinite(value) ? value : fallback
}

function buildEastHanMountainBoundaryPlacementCoverageSummary(
  placements: JsonRecord[],
  artifactSummary: JsonRecord,
): JsonRecord {
  const lineRoleCounts = new Map<string, number>()
  for (const placement of placements) {
    const lineRole = String(placement.lineRole ?? '').trim()
    lineRoleCounts.set(lineRole, (lineRoleCounts.get(lineRole) ?? 0) + 1)
  }

  const formalStateBoundaryPlacementCount = finiteNumberOrFallback(
    artifactSummary.formalStateBoundaryPlacementCount,
    lineRoleCounts.get('formal_state_boundary_blockade_candidate') ?? 0,
  )
  const hanzhongInternalBoundaryPlacementCount = finiteNumberOrFallback(
    artifactSummary.hanzhongInternalBoundaryPlacementCount,
    lineRoleCounts.get('special_internal_commandery_boundary_blockade_candidate') ?? 0,
  )
  const promotedOuterContactPlacementCount = finiteNumberOrFallback(
    artifactSummary.promotedOuterContactPlacementCount,
    (lineRoleCounts.get('promoted_outer_contact_boundary_blockade_candidate') ?? 0) +
      (lineRoleCounts.get('compact_reviewed_outer_contact_boundary_blockade_candidate') ?? 0) +
      (lineRoleCounts.get('stable_direct_outer_contact_boundary_blockade_candidate') ?? 0),
  )
  const compactReviewedOuterContactPlacementCount = finiteNumberOrFallback(
    artifactSummary.compactReviewedOuterContactPlacementCount,
    lineRoleCounts.get('compact_reviewed_outer_contact_boundary_blockade_candidate') ?? 0,
  )
  const crossStateCommanderyMountainPlacementCount = finiteNumberOrFallback(
    artifactSummary.crossStateCommanderyMountainPlacementCount,
    lineRoleCounts.get('cross_state_commandery_boundary_blockade_candidate') ?? 0,
  )
  const outerContactCommanderyMountainPlacementCount = finiteNumberOrFallback(
    artifactSummary.outerContactCommanderyMountainPlacementCount,
    lineRoleCounts.get('stable_direct_outer_contact_boundary_blockade_candidate') ?? 0,
  )
  const suppressedOuterContactPlacementCount = finiteNumberOrFallback(
    artifactSummary.suppressedOuterContactPlacementCount,
    0,
  )
  const finePieceLibraryAddedCount = finiteNumberOrFallback(artifactSummary.finePieceLibraryAddedCount, 0)
  const commanderyBoundaryInventoryCount = finiteNumberOrFallback(artifactSummary.commanderyBoundaryInventoryCount, 0)
  const crossStateCommanderyBoundaryCount = finiteNumberOrFallback(artifactSummary.crossStateCommanderyBoundaryCount, 0)
  const outerContactCommanderyBoundaryCount = finiteNumberOrFallback(artifactSummary.outerContactCommanderyBoundaryCount, 0)
  const sameStateCommanderyBoundaryCount = finiteNumberOrFallback(artifactSummary.sameStateCommanderyBoundaryCount, 0)
  const acceptedOwnershipStateCount = finiteNumberOrFallback(artifactSummary.acceptedOwnershipStateCount, 0)
  const stableAdjacencyCrossStatePairCount = finiteNumberOrFallback(artifactSummary.stableAdjacencyCrossStatePairCount, 0)
  const stableVsDirectCrossStateDifferenceCount = finiteNumberOrFallback(
    artifactSummary.stableVsDirectCrossStateDifferenceCount,
    0,
  )
  const dedupedAggregateStateBoundaryPlacementCount = finiteNumberOrFallback(
    artifactSummary.dedupedAggregateStateBoundaryPlacementCount,
    0,
  )
  const retainedAggregateStateBoundaryPlacementCount = finiteNumberOrFallback(
    artifactSummary.retainedAggregateStateBoundaryPlacementCount,
    0,
  )
  const dedupedLegacyOuterContactPlacementCount = finiteNumberOrFallback(
    artifactSummary.dedupedLegacyOuterContactPlacementCount,
    0,
  )
  const aggregateStateBoundaryRenderPolicy = String(
    artifactSummary.aggregateStateBoundaryRenderPolicy ??
      'deduped_metadata_only_when_stable_direct_commandery_boundary_exists',
  ).trim()
  const legacyOuterContactRenderPolicy = String(
    artifactSummary.legacyOuterContactRenderPolicy ??
      'deduped_metadata_only_when_stable_direct_outer_contact_boundary_exists',
  ).trim()
  const stateBoundaryCoverageStatus = String(
    artifactSummary.stateBoundaryCoverageStatus ?? `PASS_${formalStateBoundaryPlacementCount}_OF_36`,
  ).trim()
  const sameStateCommanderyBoundaryMountainPolicy = String(
    artifactSummary.sameStateCommanderyBoundaryMountainPolicy ?? 'not_mountain_by_default',
  ).trim()
  const mapSourcePolicy = String(artifactSummary.mapSourcePolicy ?? '').trim()
  const geometryIssueCount = finiteNumberOrFallback(artifactSummary.geometryIssueCount, 0)
  const falseThinContactSuppressedCount = finiteNumberOrFallback(artifactSummary.falseThinContactSuppressedCount, 0)
  const trueTinyBoundaryRetainedCount = finiteNumberOrFallback(artifactSummary.trueTinyBoundaryRetainedCount, 0)
  const geometryIssueClassificationStatus = String(
    artifactSummary.geometryIssueClassificationStatus ?? '',
  ).trim()
  const stateComponentIslandCount = finiteNumberOrFallback(artifactSummary.stateComponentIslandCount, 0)
  const stateComponentBoundarySuppressedCount = finiteNumberOrFallback(
    artifactSummary.stateComponentBoundarySuppressedCount,
    0,
  )
  const stateComponentClassificationStatus = String(
    artifactSummary.stateComponentClassificationStatus ?? '',
  ).trim()
  const boundarySamplePointRenderPolicy = String(
    artifactSummary.boundarySamplePointRenderPolicy ?? '',
  ).trim()
  const anchorPointOrderingPolicy = String(artifactSummary.anchorPointOrderingPolicy ?? '').trim()
  const tianxiaYutuDirectPolylineBoundaryPolicy = String(
    artifactSummary.tianxiaYutuDirectPolylineBoundaryPolicy ?? '',
  ).trim()
  const largeWorldPlacementContinuityStatus = String(
    artifactSummary.largeWorldPlacementContinuityStatus ?? 'MISSING_ARTIFACT',
  ).trim()
  const largeWorldRenderablePlacementCount = finiteNumberOrFallback(
    artifactSummary.largeWorldRenderablePlacementCount,
    placements.length,
  )
  const largeWorldStatePairGroupCount = finiteNumberOrFallback(artifactSummary.largeWorldStatePairGroupCount, 0)
  const largeWorldOuterContactGroupCount = finiteNumberOrFallback(artifactSummary.largeWorldOuterContactGroupCount, 0)
  const largeWorldDuplicatePlacementIdCount = finiteNumberOrFallback(
    artifactSummary.largeWorldDuplicatePlacementIdCount,
    0,
  )
  const largeWorldDuplicateSourceSegmentCount = finiteNumberOrFallback(
    artifactSummary.largeWorldDuplicateSourceSegmentCount,
    0,
  )
  const largeWorldOldAggregateRenderedCount = finiteNumberOrFallback(
    artifactSummary.largeWorldOldAggregateRenderedCount,
    0,
  )
  const largeWorldMissingPieceInstanceCount = finiteNumberOrFallback(
    artifactSummary.largeWorldMissingPieceInstanceCount,
    0,
  )
  const largeWorldMissingResourceContractCount = finiteNumberOrFallback(
    artifactSummary.largeWorldMissingResourceContractCount,
    0,
  )
  const largeWorldPassWallNodeCount = finiteNumberOrFallback(artifactSummary.largeWorldPassWallNodeCount, 0)

  return {
    formal_state_boundary_placement_count: formalStateBoundaryPlacementCount,
    hanzhong_internal_boundary_placement_count: hanzhongInternalBoundaryPlacementCount,
    promoted_outer_contact_placement_count: promotedOuterContactPlacementCount,
    compact_reviewed_outer_contact_placement_count: compactReviewedOuterContactPlacementCount,
    cross_state_commandery_mountain_placement_count: crossStateCommanderyMountainPlacementCount,
    outer_contact_commandery_mountain_placement_count: outerContactCommanderyMountainPlacementCount,
    suppressed_outer_contact_placement_count: suppressedOuterContactPlacementCount,
    fine_piece_library_added_count: finePieceLibraryAddedCount,
    commandery_boundary_inventory_count: commanderyBoundaryInventoryCount,
    cross_state_commandery_boundary_count: crossStateCommanderyBoundaryCount,
    outer_contact_commandery_boundary_count: outerContactCommanderyBoundaryCount,
    accepted_ownership_state_count: acceptedOwnershipStateCount,
    same_state_commandery_boundary_count: sameStateCommanderyBoundaryCount,
    same_state_commandery_boundary_mountain_policy: sameStateCommanderyBoundaryMountainPolicy,
    stable_adjacency_cross_state_pair_count: stableAdjacencyCrossStatePairCount,
    stable_vs_direct_cross_state_difference_count: stableVsDirectCrossStateDifferenceCount,
    deduped_aggregate_state_boundary_placement_count: dedupedAggregateStateBoundaryPlacementCount,
    retained_aggregate_state_boundary_placement_count: retainedAggregateStateBoundaryPlacementCount,
    deduped_legacy_outer_contact_placement_count: dedupedLegacyOuterContactPlacementCount,
    aggregate_state_boundary_render_policy: aggregateStateBoundaryRenderPolicy,
    outer_contact_replacement_render_policy: legacyOuterContactRenderPolicy,
    map_source_policy: mapSourcePolicy,
    geometry_issue_count: geometryIssueCount,
    false_thin_contact_suppressed_count: falseThinContactSuppressedCount,
    true_tiny_boundary_retained_count: trueTinyBoundaryRetainedCount,
    geometry_issue_classification_status: geometryIssueClassificationStatus,
    state_component_island_count: stateComponentIslandCount,
    state_component_boundary_suppressed_count: stateComponentBoundarySuppressedCount,
    state_component_classification_status: stateComponentClassificationStatus,
    boundary_sample_point_render_policy: boundarySamplePointRenderPolicy,
    anchor_point_ordering_policy: anchorPointOrderingPolicy,
    tianxia_yutu_direct_polyline_boundary_policy: tianxiaYutuDirectPolylineBoundaryPolicy,
    large_world_placement_continuity_status: largeWorldPlacementContinuityStatus,
    large_world_renderable_placement_count: largeWorldRenderablePlacementCount,
    large_world_state_pair_group_count: largeWorldStatePairGroupCount,
    large_world_outer_contact_group_count: largeWorldOuterContactGroupCount,
    large_world_duplicate_placement_id_count: largeWorldDuplicatePlacementIdCount,
    large_world_duplicate_source_segment_count: largeWorldDuplicateSourceSegmentCount,
    large_world_old_aggregate_rendered_count: largeWorldOldAggregateRenderedCount,
    large_world_missing_piece_instance_count: largeWorldMissingPieceInstanceCount,
    large_world_missing_resource_contract_count: largeWorldMissingResourceContractCount,
    large_world_pass_wall_node_count: largeWorldPassWallNodeCount,
    state_boundary_coverage_status: stateBoundaryCoverageStatus,
  }
}

function buildEastHanMountainBoundaryPlacementCatalogSample(placements: JsonRecord[]): JsonRecord[] {
  return placements.map((placement) => ({
    runtime_placement_id: String(placement.runtimePlacementId ?? '').trim(),
    source_status: String(placement.status ?? '').trim(),
    line_role: String(placement.lineRole ?? '').trim(),
    assigned_preset_id: String(placement.assignedPresetId ?? '').trim(),
    chokepoint_mode: String(placement.chokepointMode ?? '').trim(),
    creates_chokepoint: Boolean(placement.createsChokepoint),
    source_boundary_segment: jsonRecordFrom(placement.sourceBoundarySegment),
    pieceInstances: jsonRecordArrayFrom(placement.pieceInstances),
    reserved_local_cell_count: numberPairArrayFrom(placement.reservedLocalCells).length,
    visual_overhang_only_cell_count: numberPairArrayFrom(placement.visualOverhangOnlyCells).length,
    compact_outer_contact_review: jsonRecordFrom(placement.compactOuterContactReview),
  }))
}

function buildEastHanMountainBoundaryPlacementFocusTargets(
  placements: JsonRecord[],
  assetFrames: JsonRecord,
): JsonRecord[] {
  const focusTargets: JsonRecord[] = []
  for (const placement of placements) {
    const origin = eastHanMountainPlacementOriginCell(placement)
    const renderPieces = buildEastHanMountainBoundaryRenderPieces(placement, origin, assetFrames)
    const firstPiece = jsonRecordFrom(renderPieces[0])
    const firstCell = numberArrayFrom(firstPiece.cell_1km)
    if (firstCell.length < 2) {
      continue
    }

    focusTargets.push({
      runtime_placement_id: String(placement.runtimePlacementId ?? '').trim(),
      line_role: String(placement.lineRole ?? '').trim(),
      assigned_preset_id: String(placement.assignedPresetId ?? '').trim(),
      source_boundary_segment: jsonRecordFrom(placement.sourceBoundarySegment),
      first_cell_1km: [firstCell[0], firstCell[1]],
      render_piece_count: renderPieces.length,
    })
  }
  return focusTargets
}

function buildEastHanMainWorldMountainBoundaryLayer(
  preloadBoundsCells: ExclusiveCellBounds,
): EastHanMountainBoundaryLayerBuildResult {
  const hardReservedCellKeys = new Set<string>()
  const visualOverhangOnlyCellKeys = new Set<string>()
  const artifact = readEastHanMainWorldMountainBoundaryContractArtifact()
  const assetManifest = readEastHanMainWorldMountainBoundaryAssetManifest()
  const runtimeAssetManifestSummary = buildEastHanMountainBoundaryRuntimeAssetSummary(assetManifest)
  const acceptedChokepointArtSource = buildEastHanAcceptedChokepointArtSourceSummary()
  const baseSummary = {
    source_artifact_id: EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_CONTRACT_ARTIFACT_ID,
    source_artifact_path: EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_CONTRACT_PATH,
    sampler_hook: 'apply_after_base_eligible_mask_before_stable_density_selection',
    hard_exclusion_source: 'resourceGenerationExclusionBinding.hardExcludedWorldCells',
    visual_overhang_only_cells_block_resources: false,
  }

  if (!artifact) {
    const resourceExclusionSummary = {
      ...baseSummary,
      status: 'missing_artifact',
      placement_count: 0,
      visible_placement_count: 0,
      formal_state_boundary_placement_count: 0,
      hanzhong_internal_boundary_placement_count: 0,
      promoted_outer_contact_placement_count: 0,
      compact_reviewed_outer_contact_placement_count: 0,
      cross_state_commandery_mountain_placement_count: 0,
      outer_contact_commandery_mountain_placement_count: 0,
      suppressed_outer_contact_placement_count: 0,
      fine_piece_library_added_count: 0,
      commandery_boundary_inventory_count: 0,
      cross_state_commandery_boundary_count: 0,
      outer_contact_commandery_boundary_count: 0,
      accepted_ownership_state_count: 0,
      same_state_commandery_boundary_count: 0,
      same_state_commandery_boundary_mountain_policy: 'not_mountain_by_default',
      stable_adjacency_cross_state_pair_count: 0,
      stable_vs_direct_cross_state_difference_count: 0,
      deduped_aggregate_state_boundary_placement_count: 0,
      retained_aggregate_state_boundary_placement_count: 0,
      deduped_legacy_outer_contact_placement_count: 0,
      aggregate_state_boundary_render_policy: 'missing_artifact',
      outer_contact_replacement_render_policy: 'missing_artifact',
      map_source_policy: 'missing_artifact',
      geometry_issue_count: 0,
      false_thin_contact_suppressed_count: 0,
      true_tiny_boundary_retained_count: 0,
      geometry_issue_classification_status: 'MISSING_ARTIFACT',
      state_component_island_count: 0,
      state_component_boundary_suppressed_count: 0,
      state_component_classification_status: 'MISSING_ARTIFACT',
      boundary_sample_point_render_policy: 'MISSING_ARTIFACT',
      anchor_point_ordering_policy: 'MISSING_ARTIFACT',
      tianxia_yutu_direct_polyline_boundary_policy: 'MISSING_ARTIFACT',
      large_world_placement_continuity_status: 'MISSING_ARTIFACT',
      large_world_renderable_placement_count: 0,
      large_world_state_pair_group_count: 0,
      large_world_outer_contact_group_count: 0,
      large_world_duplicate_placement_id_count: 0,
      large_world_duplicate_source_segment_count: 0,
      large_world_old_aggregate_rendered_count: 0,
      large_world_missing_piece_instance_count: 0,
      large_world_missing_resource_contract_count: 0,
      large_world_pass_wall_node_count: 0,
      state_boundary_coverage_status: 'MISSING_ARTIFACT',
      hard_reserved_cell_count_in_loaded_viewport: 0,
      visual_overhang_only_cell_count_in_loaded_viewport: 0,
      filtered_resource_object_count: 0,
    }
    return {
      hardReservedCellKeys,
      resourceExclusionSummary,
      layer: {
        ...resourceExclusionSummary,
        display_order: 4,
        schema_version: 'east_han_main_world_mountain_boundary_layer_v0_47',
        activation: 'main_world_only',
        world_id: EAST_HAN_LAYERED_WORLD_ID,
        coordinate_space: EAST_HAN_LAYERED_COORDINATE_SPACE,
        runtime_asset_manifest: runtimeAssetManifestSummary,
        accepted_chokepoint_art_source: acceptedChokepointArtSource,
        render_piece_instance_count: 0,
        placement_catalog_sample: [],
        placement_focus_targets: [],
        visible_placements: [],
      },
    }
  }

  const sourceLayer = jsonRecordFrom(artifact.mainWorldMountainBoundaryAssetLayer)
  const finePieceLibrarySupplement = jsonRecordFrom(sourceLayer.finePieceLibrarySupplement)
  const commanderyBoundaryInventory = jsonRecordFrom(sourceLayer.commanderyBoundaryInventory)
  const assetFrames = jsonRecordFrom(assetManifest?.frames)
  const placements = jsonRecordArrayFrom(sourceLayer.placements)
  const artifactSummary = jsonRecordFrom(artifact.summary)
  const placementCoverageSummary = buildEastHanMountainBoundaryPlacementCoverageSummary(placements, artifactSummary)
  const placementCatalogSample = buildEastHanMountainBoundaryPlacementCatalogSample(placements)
  const placementFocusTargets = buildEastHanMountainBoundaryPlacementFocusTargets(placements, assetFrames)
  const visiblePlacements: JsonRecord[] = []
  let renderPieceInstanceCount = 0

  for (const placement of placements) {
    const placementBounds = exclusiveBoundsFromMountainPlacement(placement)
    if (!placementBounds || !exclusiveBoundsIntersect(placementBounds, preloadBoundsCells)) {
      continue
    }

    const origin = eastHanMountainPlacementOriginCell(placement)
    const binding = jsonRecordFrom(placement.resourceGenerationExclusionBinding)
    const hardExcludedWorldCells = numberPairArrayFrom(binding.hardExcludedWorldCells)
    const reservedLocalCells = numberPairArrayFrom(placement.reservedLocalCells)
    const visualOverhangOnlyCells = numberPairArrayFrom(placement.visualOverhangOnlyCells)
    let hardReservedInViewportCount = 0
    const hardReservedWorldCellSample: number[][] = []

    const hardWorldCells = hardExcludedWorldCells.length > 0
      ? hardExcludedWorldCells
      : origin
        ? reservedLocalCells.map((cell) => ({ x: origin.x + cell.x, y: origin.y + cell.y }))
        : []

    for (const cell of hardWorldCells) {
      if (!cellInsideExclusiveBounds(cell.x, cell.y, preloadBoundsCells)) {
        continue
      }
      const key = eastHanCellKey(cell.x, cell.y)
      if (!hardReservedCellKeys.has(key)) {
        hardReservedInViewportCount += 1
        if (hardReservedWorldCellSample.length < 96) {
          hardReservedWorldCellSample.push([cell.x, cell.y])
        }
      }
      hardReservedCellKeys.add(key)
    }

    if (origin) {
      for (const cell of visualOverhangOnlyCells) {
        const worldX = origin.x + cell.x
        const worldY = origin.y + cell.y
        if (cellInsideExclusiveBounds(worldX, worldY, preloadBoundsCells)) {
          visualOverhangOnlyCellKeys.add(eastHanCellKey(worldX, worldY))
        }
      }
    }

    const renderPieces = buildEastHanMountainBoundaryRenderPieces(placement, origin, assetFrames)
    renderPieceInstanceCount += renderPieces.length

    visiblePlacements.push({
      runtimePlacementId: String(placement.runtimePlacementId ?? '').trim(),
      status: 'runtime_adapter_consumed',
      sourceStatus: String(placement.status ?? '').trim(),
      sourceBoundarySegment: jsonRecordFrom(placement.sourceBoundarySegment),
      assignedPresetId: String(placement.assignedPresetId ?? '').trim(),
      lineRole: String(placement.lineRole ?? '').trim(),
      createsChokepoint: Boolean(placement.createsChokepoint),
      passWallNodePolicy: jsonRecordFrom(placement.passWallNodePolicy),
      pieceInstances: jsonRecordArrayFrom(placement.pieceInstances),
      render_pieces: renderPieces,
      render_piece_count: renderPieces.length,
      reservedLocalCells: pairArrayToJson(reservedLocalCells),
      visualOverhangOnlyCells: pairArrayToJson(visualOverhangOnlyCells),
      projectionSidePolicy: jsonRecordFrom(placement.projectionSidePolicy),
      resourceExclusion: jsonRecordFrom(placement.resourceExclusion),
      worldTransform: {
        ...jsonRecordFrom(placement.worldTransformCandidate),
        hardReservedCellCountInLoadedViewport: hardReservedInViewportCount,
        hardReservedWorldCellSample,
      },
      resourceGenerationExclusionBinding: {
        activation: 'runtime_adapter_enabled',
        sourceActivation: String(binding.activation ?? '').trim(),
        runtimeCopyGate: String(binding.runtimeCopyGate ?? placement.runtimeCopyGate ?? '').trim(),
        samplerHook: String(binding.samplerHook ?? baseSummary.sampler_hook).trim(),
        candidateExpressionPatch: String(binding.candidateExpressionPatch ?? '').trim(),
        hardExcludedWorldCellCount: hardWorldCells.length,
      },
    })
  }

  const resourceExclusionSummary = {
    ...baseSummary,
    status: 'ready',
    placement_count: placements.length,
    visible_placement_count: visiblePlacements.length,
    ...placementCoverageSummary,
    hard_reserved_cell_count_in_loaded_viewport: hardReservedCellKeys.size,
    visual_overhang_only_cell_count_in_loaded_viewport: visualOverhangOnlyCellKeys.size,
    filtered_resource_object_count: 0,
  }

  return {
    hardReservedCellKeys,
    resourceExclusionSummary,
    layer: {
      ...resourceExclusionSummary,
      display_order: 4,
      schema_version: 'east_han_main_world_mountain_boundary_layer_v0_47',
      activation: 'main_world_only',
      world_id: EAST_HAN_LAYERED_WORLD_ID,
      coordinate_space: EAST_HAN_LAYERED_COORDINATE_SPACE,
      source_runtime_copy_gate: String(jsonRecordFrom(artifact.runtimeBoundary).runtimeCopyGate ?? '').trim(),
      runtime_asset_manifest: runtimeAssetManifestSummary,
      accepted_chokepoint_art_source: acceptedChokepointArtSource,
      render_piece_instance_count: renderPieceInstanceCount,
      resource_generation_policy:
        'reject resource generation on translated reservedLocalCells/hardExcludedWorldCells; visualOverhangOnlyCells remain diagnostics',
      fine_piece_library_sample: jsonRecordArrayFrom(finePieceLibrarySupplement.pieces).slice(0, 10),
      commandery_boundary_inventory_sample: jsonRecordArrayFrom(commanderyBoundaryInventory.boundarySegments).slice(0, 24),
      placement_catalog_sample: placementCatalogSample,
      placement_focus_targets: placementFocusTargets,
      visible_placements: visiblePlacements,
    },
  }
}

function buildEastHanEligibleResourceObjects(resourceLayer: JsonRecord, hardReservedCellKeys = new Set<string>()) {
  const objects: JsonRecord[] = []
  let excludedCount = 0

  for (const resourceObject of jsonRecordArrayFrom(resourceLayer.sample_resource_objects)) {
    const cell = jsonRecordFrom(resourceObject.cell_1km)
    const cellX = Number(cell.x)
    const cellY = Number(cell.y)
    const excluded =
      Number.isFinite(cellX) &&
      Number.isFinite(cellY) &&
      hardReservedCellKeys.has(eastHanCellKey(cellX, cellY))

    if (excluded) {
      excludedCount += 1
      continue
    }

    objects.push({
      ...resourceObject,
      resource_eligible: true,
      zero_level_ground_object: false,
      object_mode: 'eligible_resource_overlay',
      mountain_boundary_resource_excluded: false,
    })
  }

  return { objects, excludedCount }
}

function ensureEastHanMainMapRuntime(world: WorldState): MainMapRuntimeState {
  if (world.mainMapRuntime?.schemaVersion === EAST_HAN_MAIN_MAP_RUNTIME_SCHEMA_VERSION) {
    return world.mainMapRuntime
  }

  const runtime: MainMapRuntimeState = {
    schemaVersion: EAST_HAN_MAIN_MAP_RUNTIME_SCHEMA_VERSION,
    worldId: EAST_HAN_LAYERED_WORLD_ID,
    coordinateSpace: EAST_HAN_LAYERED_COORDINATE_SPACE,
    ownerIndexVersion: EAST_HAN_MAIN_MAP_OWNER_INDEX_VERSION,
    resourceGenerationVersion: WORLD_RESOURCE_GENERATION_POLICY.generationVersion,
    overrideVersion: 0,
    cellOverrides: {},
    events: [],
  }
  world.mainMapRuntime = runtime
  return runtime
}

function currentEastHanMainMapRuntime(world: Readonly<WorldState>) {
  const runtime = world.mainMapRuntime
  return runtime?.schemaVersion === EAST_HAN_MAIN_MAP_RUNTIME_SCHEMA_VERSION ? runtime : undefined
}

function buildEastHanCellOverridePayload(override: MainMapCellOverride) {
  const payload: JsonRecord = {
    cell_id: override.cellId,
    world_id: override.worldId,
    coordinate_space: override.coordinateSpace,
    cell_1km: {
      x: override.cellX,
      y: override.cellY,
    },
    chunk_id: override.chunkId,
    owner: override.owner,
    cell_version: override.cellVersion,
    last_event_id: override.lastEventId,
    last_event_type: override.lastEventType,
    updated_world_version: override.updatedWorldVersion,
    updated_at: override.updatedAt,
    updated_by_faction_id: override.updatedByFactionId,
    request_id: override.requestId,
  }
  Object.assign(payload, buildMainMapCellOverrideImmunityOutputFields(override))
  return payload
}

function eastHanCityGateKind(objectData: JsonRecord) {
  return String(objectData.kind ?? '').trim().toLowerCase()
}

function isEastHanGateAnchor(objectData: JsonRecord) {
  const kind = eastHanCityGateKind(objectData)
  return kind === 'gate' || String(objectData.prefab_key ?? '').trim().startsWith('gate_')
}

function isEastHanPlayerMainCityAnchor(objectData: JsonRecord) {
  const kind = eastHanCityGateKind(objectData)
  const role = eastHanCityGateRole(objectData)
  return kind === 'player_city' || role === 'player_main_city'
}

function isEastHanAiMainCityAnchor(objectData: JsonRecord) {
  const kind = eastHanCityGateKind(objectData)
  const role = eastHanCityGateRole(objectData)
  return kind === 'ai_city' || role === 'ai_main_city'
}

function eastHanCityGateRole(objectData: JsonRecord) {
  return String(objectData.city_role ?? objectData.cityRole ?? '').trim()
}

function eastHanCityGateName(objectData: JsonRecord) {
  return String(objectData.city_name ?? objectData.name ?? objectData.title ?? '').trim()
}

function isEastHanMajorCityAnchor(objectData: JsonRecord) {
  const role = eastHanCityGateRole(objectData)
  if (role === 'state_government' || role === 'commandery_seat') {
    return true
  }
  const name = eastHanCityGateName(objectData)
  return name === '洛阳' || name === '雒阳' || name === '长安' || name === '長安'
}

function eastHanCityGateAnchorCell(objectData: JsonRecord) {
  const cell = jsonRecordFrom(objectData.cell_1km)
  const x = Number(cell.x ?? objectData.x)
  const y = Number(cell.y ?? objectData.y)
  return {
    x: Number.isFinite(x) ? Math.floor(x) : 0,
    y: Number.isFinite(y) ? Math.floor(y) : 0,
  }
}

function eastHanCityGateFootprintId(objectData: JsonRecord) {
  if (isEastHanGateAnchor(objectData)) {
    return 'pass_1x1'
  }
  if (isEastHanPlayerMainCityAnchor(objectData)) {
    return 'player_city_3x3_initial'
  }
  if (isEastHanAiMainCityAnchor(objectData)) {
    return 'ai_city_3x3_initial'
  }
  if (isEastHanMajorCityAnchor(objectData)) {
    return 'system_city_l07_l08_7x7'
  }
  if (eastHanCityGateKind(objectData) === 'city' || eastHanCityGateRole(objectData) !== '') {
    return 'system_city_l05_l06_5x5'
  }

  const existing = String(objectData.footprint_id ?? objectData.footprintId ?? '').trim()
  if (existing) {
    return existing
  }
  const footprintCells = Array.isArray(objectData.footprint_cells) ? objectData.footprint_cells : []
  const side = Math.max(
    Number(footprintCells[0] ?? 3),
    Number(footprintCells[1] ?? 3),
  )
  if (side >= 9) {
    return 'system_city_l09_9x9'
  }
  if (side >= 7) {
    return 'system_city_l07_l08_7x7'
  }
  if (side >= 5) {
    return 'system_city_l05_l06_5x5'
  }
  return 'system_city_l03_l04_3x3'
}

function eastHanAcceptedCityAssetForFootprint(footprintId: string): JsonRecord {
  if (footprintId.includes('7x7') || footprintId.includes('9x9')) {
    return EAST_HAN_ACCEPTED_CITY_ASSET_BY_FOOTPRINT['7x7']
  }
  if (footprintId.includes('5x5')) {
    return EAST_HAN_ACCEPTED_CITY_ASSET_BY_FOOTPRINT['5x5']
  }
  if (footprintId.includes('3x3')) {
    return EAST_HAN_ACCEPTED_CITY_ASSET_BY_FOOTPRINT['3x3']
  }
  return {}
}

function eastHanBoundaryPlaceholderPolicy() {
  return {
    schema_version: 'east_han_boundary_placeholder_policy_v0_1',
    gate_footprint_id: 'pass_1x1',
    mountain_barrier_footprint_id: 'mountain_barrier_1x1',
    gate_art_status: 'logic_placeholder_until_gate_art_accepted',
    mountain_barrier_art_status: 'logic_placeholder_until_mountain_art_accepted',
    gate_blocks_movement: false,
    mountain_barrier_blocks_movement: true,
    gate_runtime_role: 'state_boundary_passage',
    mountain_barrier_runtime_role: 'state_boundary_blocker',
    rule:
      'State-boundary logic is locked before final art: mountain barriers block movement/resource generation, while gates/passes are passable openings reserved from resource generation.',
  }
}

function eastHanGatePlaceholderRuntimeMetadata(objectData: JsonRecord): JsonRecord {
  if (!isEastHanGateAnchor(objectData)) {
    return {}
  }
  return {
    asset_status: 'logic_placeholder_until_gate_art_accepted',
    logic_placeholder: true,
    placeholder_role: 'boundary_pass_gate',
    boundary_role: 'state_boundary_passage',
    barrier_role: 'pass_through_gap',
    blocks_movement: false,
    blocks_resource_generation: true,
    blocks_resource_overlay: true,
    blocks_resource_fill: true,
    block_free_cell_base: true,
    placement_policy_source: 'world_cell_footprint_manifest_v1.pass_1x1',
    final_art_required: false,
  }
}

function eastHanFootprintCells(footprintId: string) {
  if (footprintId.includes('9x9')) {
    return [9, 9]
  }
  if (footprintId.includes('7x7')) {
    return [7, 7]
  }
  if (footprintId.includes('5x5')) {
    return [5, 5]
  }
  if (footprintId.includes('3x3')) {
    return [3, 3]
  }
  return [1, 1]
}

function eastHanFootprintTileIds(cell: { x: number; y: number }, footprintCells: readonly number[]) {
  const width = Math.max(1, Math.floor(Number(footprintCells[0] ?? 1)))
  const height = Math.max(1, Math.floor(Number(footprintCells[1] ?? 1)))
  const startX = cell.x - Math.floor(width / 2)
  const startY = cell.y - Math.floor(height / 2)
  const tileIds: string[] = []
  for (let y = startY; y < startY + height; y += 1) {
    for (let x = startX; x < startX + width; x += 1) {
      tileIds.push(eastHanMainMapCellId(EAST_HAN_LAYERED_WORLD_ID, x, y))
    }
  }
  return tileIds
}

function eastHanCityGatePrefabId(objectData: JsonRecord, footprintId: string) {
  const existing = String(objectData.prefab_id ?? objectData.prefabId ?? '').trim()
  if (existing) {
    return existing
  }
  if (isEastHanGateAnchor(objectData)) {
    return 'world_node_pass_sw_v1'
  }
  if (isEastHanPlayerMainCityAnchor(objectData)) {
    return 'world_node_city_v1'
  }
  if (isEastHanAiMainCityAnchor(objectData)) {
    return 'world_node_ai_city_3x3_v1'
  }
  switch (footprintId) {
    case 'system_city_l09_9x9':
      return 'world_node_system_city_9x9_v1'
    case 'system_city_l07_l08_7x7':
      return 'world_node_system_city_7x7_v1'
    case 'system_city_l05_l06_5x5':
      return 'world_node_system_city_5x5_v1'
    case 'system_city_l03_l04_3x3':
      return 'world_node_system_city_3x3_v1'
    default:
      return 'world_node_system_city_5x5_v1'
  }
}

function eastHanCityGateLod(objectData: JsonRecord, footprintId: string) {
  const existing = String(objectData.lod ?? objectData.runtime_lod ?? objectData.runtimeLod ?? '').trim()
  if (existing) {
    return existing
  }
  if (isEastHanGateAnchor(objectData)) {
    return 'gate_prefab_1x1'
  }
  if (footprintId.includes('9x9')) {
    return 'city_prefab_9x9'
  }
  if (footprintId.includes('7x7')) {
    return 'city_prefab_7x7'
  }
  if (footprintId.includes('5x5')) {
    return 'city_prefab_5x5'
  }
  return 'city_prefab_3x3'
}

function buildEastHanCityGatePrefabLodPolicy() {
  return {
    schema_version: 'east_han_city_gate_prefab_lod_policy_v0_1',
    asset_manifest_path: EAST_HAN_WORLD_CELL_ASSET_MANIFEST_PATH,
    footprint_manifest_path: EAST_HAN_WORLD_CELL_FOOTPRINT_MANIFEST_PATH,
    accepted_experiment_art_asset_index_path: EAST_HAN_ACCEPTED_EXPERIMENT_ART_ASSET_INDEX_PATH,
    boundary_placeholder_policy: eastHanBoundaryPlaceholderPolicy(),
    city_asset_policy:
      '3x3 is reserved for player and AI main cities; East Han system cities use accepted 5x5 and major seats use accepted 7x7.',
    coordinate_space: EAST_HAN_LAYERED_COORDINATE_SPACE,
    draw_order: ['base_map', 'main_world_cells', 'resource_overlay', 'world_node', 'cell_overrides', 'labels'],
    lod_bands: [
      { lod: 'strategic_dot', max_zoom_exclusive: 0.18 },
      { lod: 'city_gate_prefab', min_zoom: 0.18, max_zoom_exclusive: 1.25 },
      { lod: 'city_gate_prefab_detailed', min_zoom: 1.25 },
    ],
    client_authority: 'server_resolves_prefab_footprint_lod_client_draws_world_cell_manifest',
  }
}

function normalizeEastHanCityGatePrefabObject(objectData: JsonRecord) {
  const footprintId = eastHanCityGateFootprintId(objectData)
  const prefabId = eastHanCityGatePrefabId(objectData, footprintId)
  const cell = eastHanCityGateAnchorCell(objectData)
  const footprintCells = eastHanFootprintCells(footprintId)
  const drawSortKey = Number(objectData.draw_sort_key ?? objectData.drawSortKey)
  const acceptedCityAsset = isEastHanGateAnchor(objectData) ? {} : eastHanAcceptedCityAssetForFootprint(footprintId)
  return {
    ...objectData,
    runtime_ready: true,
    prefab_id: prefabId,
    prefab_key: String(objectData.prefab_key ?? prefabId).trim() || prefabId,
    footprint_id: footprintId,
    footprint_cells: footprintCells,
    footprint_tile_ids: eastHanFootprintTileIds(cell, footprintCells),
    footprint_anchor_policy: 'center_cell',
    lod: eastHanCityGateLod(objectData, footprintId),
    draw_layer: 'world_node',
    draw_order: 'world_node',
    draw_kind_priority: Number(objectData.draw_kind_priority ?? (isEastHanGateAnchor(objectData) ? 20 : 30)),
    draw_sort_key: Number.isFinite(drawSortKey) ? drawSortKey : cell.y * 10_000 + cell.x,
    asset_manifest_path: EAST_HAN_WORLD_CELL_ASSET_MANIFEST_PATH,
    footprint_manifest_path: EAST_HAN_WORLD_CELL_FOOTPRINT_MANIFEST_PATH,
    accepted_experiment_art_asset_index_path: isEastHanGateAnchor(objectData)
      ? undefined
      : EAST_HAN_ACCEPTED_EXPERIMENT_ART_ASSET_INDEX_PATH,
    ...acceptedCityAsset,
    ...eastHanGatePlaceholderRuntimeMetadata(objectData),
  }
}

function normalizeEastHanCityGatePrefabObjects(objects: JsonRecord[]) {
  return objects.map(normalizeEastHanCityGatePrefabObject)
}

function buildEastHanFactionHomeCityAnchorObjects(loadedChunkIds: string[]) {
  const loadedChunkIdSet = new Set(loadedChunkIds)
  const anchors: JsonRecord[] = []

  for (const [factionId, faction] of Object.entries(worldState.factions)) {
    const homeTileId = String(faction.heroCommand?.homeTileId ?? '').trim()
    const seed = EAST_HAN_FACTION_HOME_CITY_ANCHOR_SEEDS_BY_TILE_ID[homeTileId]
    if (!seed) {
      continue
    }

    const chunkId = eastHanMainMapChunkId(seed.cellX, seed.cellY)
    if (!loadedChunkIdSet.has(chunkId)) {
      continue
    }

    const homeTile = worldState.map.tiles.find((tile) => tile.id === homeTileId)
    const owner = factionId === 'player' ? 'player' : homeTile?.owner ?? factionId
    const isNationCapital =
      faction.organizationKind === 'nation' &&
      String(faction.nationCapitalTileId ?? '').trim() === homeTileId
    anchors.push({
      object_id: `main_world_home_city_${factionId}`,
      id: `main_world_home_city_${factionId}`,
      kind: seed.kind,
      city_name: homeTile?.landmarkName ?? homeTile?.name ?? homeTileId,
      name: homeTile?.landmarkName ?? homeTile?.name ?? homeTileId,
      city_role: seed.role,
      nation_capital: isNationCapital,
      nation_name: isNationCapital ? faction.nationName ?? faction.organizationName ?? '' : '',
      nation_color_hex: isNationCapital ? faction.colorHex ?? faction.nationColorHex ?? '' : '',
      source_tile_id: homeTileId,
      anchor_delta_source: 'world_faction_home_city',
      faction_id: factionId,
      owner,
      cell_1km: {
        x: seed.cellX,
        y: seed.cellY,
      },
      chunk_id: chunkId,
      footprint_id: seed.footprintId,
      footprint_cells: [3, 3],
      prefab_id: seed.prefabId,
      prefab_key: seed.prefabId,
      lod: 'city_prefab_3x3',
      city_level: Math.max(1, Math.floor(Number(homeTile?.cityLevel ?? 3))),
      district: homeTile?.district ?? 'main_world_home_city',
      draw_kind_priority: seed.kind === 'player_city' ? 45 : 44,
      draw_sort_key: seed.cellY * 10_000 + seed.cellX,
      runtime_ready: true,
    })
  }

  return anchors
}

function mergeEastHanCityGateObjects(...objectGroups: JsonRecord[][]) {
  const merged = new Map<string, JsonRecord>()
  for (const group of objectGroups) {
    for (const objectData of group) {
      const cell = jsonRecordFrom(objectData.cell_1km)
      const key =
        String(objectData.object_id ?? objectData.id ?? '').trim() ||
        `${String(objectData.kind ?? 'object')}:${Number(cell.x ?? objectData.x)}:${Number(cell.y ?? objectData.y)}`
      if (!key) {
        continue
      }
      merged.set(key, objectData)
    }
  }
  return Array.from(merged.values())
}

function buildEastHanClickPrioritySampleObject(params: {
  sampleId: string
  footprintId: string
  type: string
  tileId: string
  formalObjectId: string
  source: string
  cellX: number
  cellY: number
  name?: string
  owner?: string
}): JsonRecord {
  const cellX = Math.floor(params.cellX)
  const cellY = Math.floor(params.cellY)
  return {
    sample_id: params.sampleId,
    footprint_id: params.footprintId,
    type: params.type,
    tile_id: params.tileId,
    formal_object_id: params.formalObjectId,
    source: params.source,
    name: params.name ?? params.formalObjectId,
    owner: params.owner ?? 'neutral',
    cell_1km: { x: cellX, y: cellY },
    tmx: { x: cellX, y: cellY },
    cell_id: eastHanMainMapCellId(EAST_HAN_LAYERED_WORLD_ID, cellX, cellY),
    chunk_id: eastHanMainMapChunkId(cellX, cellY),
  }
}

function buildEastHanClickPriorityFormalSampleLayer(): JsonRecord {
  const samples: JsonRecord[] = []
  const seen = new Set<string>()
  const addSample = (sample: JsonRecord) => {
    const sampleId = String(sample.sample_id ?? '').trim()
    if (!sampleId || seen.has(sampleId)) {
      return
    }
    seen.add(sampleId)
    samples.push(sample)
  }

  for (const [factionId, faction] of Object.entries(worldState.factions)) {
    const homeTileId = String(faction.heroCommand?.homeTileId ?? '').trim()
    const seed = EAST_HAN_FACTION_HOME_CITY_ANCHOR_SEEDS_BY_TILE_ID[homeTileId]
    if (!seed) {
      continue
    }
    const homeTile = worldState.map.tiles.find((tile) => tile.id === homeTileId)
    addSample(buildEastHanClickPrioritySampleObject({
      sampleId: seed.footprintId,
      footprintId: seed.footprintId,
      type: seed.kind,
      tileId: homeTileId,
      formalObjectId: `main_world_home_city_${factionId}`,
      source: 'world_faction_home_city_anchor_seed',
      cellX: seed.cellX,
      cellY: seed.cellY,
      name: homeTile?.landmarkName ?? homeTile?.name ?? homeTileId,
      owner: factionId === 'player' ? 'player' : homeTile?.owner ?? factionId,
    }))
  }

  for (const sampleSpec of [
    { sampleId: 'dock_1x1', footprintId: 'dock_1x1', type: 'dock' },
    { sampleId: 'fort_1x1', footprintId: 'fort_1x1', type: 'fort' },
  ]) {
    const tile = worldState.map.tiles
      .filter((candidate) => candidate.type === sampleSpec.type)
      .sort((left, right) => left.y - right.y || left.x - right.x || left.id.localeCompare(right.id))[0]
    if (!tile) {
      continue
    }
    addSample(buildEastHanClickPrioritySampleObject({
      sampleId: sampleSpec.sampleId,
      footprintId: sampleSpec.footprintId,
      type: sampleSpec.type,
      tileId: tile.id,
      formalObjectId: tile.id,
      source: 'shared_domain_scenario_strategic_node_anchor',
      cellX: tile.x,
      cellY: tile.y,
      name: tile.name,
      owner: tile.owner,
    }))
  }

  const mountainArtifact = readEastHanMainWorldMountainBoundaryContractArtifact()
  const mountainLayer = jsonRecordFrom(mountainArtifact?.mainWorldMountainBoundaryAssetLayer)
  for (const placement of jsonRecordArrayFrom(mountainLayer.placements)) {
    const origin = eastHanMountainPlacementOriginCell(placement)
    if (!origin) {
      continue
    }
    const runtimePlacementId = String(placement.runtimePlacementId ?? '').trim()
    addSample(buildEastHanClickPrioritySampleObject({
      sampleId: 'mountain_barrier_1x1',
      footprintId: 'mountain_barrier_1x1',
      type: 'mountain_barrier',
      tileId: runtimePlacementId || `mountain_barrier_${origin.x}_${origin.y}`,
      formalObjectId: runtimePlacementId || `mountain_barrier_${origin.x}_${origin.y}`,
      source: `${EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_CONTRACT_ARTIFACT_ID}.mainWorldMountainBoundaryAssetLayer.placements`,
      cellX: origin.x,
      cellY: origin.y,
      name: 'main world mountain boundary',
      owner: 'neutral',
    }))
    break
  }

  return {
    schema_version: 'east_han_click_priority_formal_sample_layer_v0_1',
    source_policy: 'formal_sources_only_no_synthetic_coordinates',
    required_sample_ids: [
      'player_city_3x3_initial',
      'ai_city_3x3_initial',
      'dock_1x1',
      'fort_1x1',
      'mountain_barrier_1x1',
    ],
    sample_count: samples.length,
    samples,
  }
}

function buildEastHanCellOverrideLayer(loadedChunkIds: string[]) {
  const runtime = currentEastHanMainMapRuntime(worldState)
  const loadedChunkSet = new Set(loadedChunkIds)
  const overrideUpserts = runtime
    ? Object.values(runtime.cellOverrides)
        .filter((override) => loadedChunkSet.has(override.chunkId))
        .sort((a, b) => a.cellY - b.cellY || a.cellX - b.cellX)
        .map(buildEastHanCellOverridePayload)
    : []

  return {
    display_order: 5,
    schema_version: 'east_han_main_map_cell_override_layer_v0_1',
    world_id: EAST_HAN_LAYERED_WORLD_ID,
    coordinate_space: EAST_HAN_LAYERED_COORDINATE_SPACE,
    override_version: runtime?.overrideVersion ?? 0,
    override_upserts: overrideUpserts,
    override_upsert_count: overrideUpserts.length,
    event_cursor: runtime?.events.length ?? 0,
    client_authority: 'server_authoritative_sparse_overrides',
  }
}

function buildEastHanLayeredChunkIds(bounds: ExclusiveCellBounds, chunkSizeCells: CellSize) {
  const startChunkX = Math.floor(bounds.startX / chunkSizeCells.width)
  const endChunkX = Math.floor((bounds.endXExclusive - 1) / chunkSizeCells.width)
  const startChunkY = Math.floor(bounds.startY / chunkSizeCells.height)
  const endChunkY = Math.floor((bounds.endYExclusive - 1) / chunkSizeCells.height)
  const chunkIds: string[] = []

  for (let chunkY = startChunkY; chunkY <= endChunkY; chunkY += 1) {
    for (let chunkX = startChunkX; chunkX <= endChunkX; chunkX += 1) {
      chunkIds.push(formatEastHanChunkId(chunkX, chunkY))
    }
  }

  return chunkIds
}

function buildEastHanChunkRefs(chunkIds: string[], source: string) {
  return chunkIds.map((chunkId) => ({
    chunk_id: chunkId,
    source,
    coordinate_space: EAST_HAN_LAYERED_COORDINATE_SPACE,
    path: `experiments/east_asia_map_pipeline/generated/${source}/chunks/${chunkId}.npz`,
  }))
}

function buildEastHanAcceptedCityJumpTargets() {
  const seed = readEastHanAcceptedAuthoringSeedArtifact()
  if (!seed) {
    return []
  }

  const acceptedLayers = jsonRecordFrom(seed.accepted_authoring_layers)
  const cityPlacements = jsonRecordArrayFrom(acceptedLayers.city_placements)
  const jumpTargets: JsonRecord[] = []

  for (const placement of cityPlacements) {
    const roles = stringArrayFrom(placement.roles)
    const targetScopes = roles.filter((role) => role === 'commandery_seat' || role === 'state_government')
    if (targetScopes.length === 0) {
      continue
    }

    const positionBase8k = jsonRecordFrom(placement.position_base_8k)
    const x = Number(positionBase8k.x)
    const y = Number(positionBase8k.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue
    }

    const placementId = String(placement.id ?? '').trim()
    const fallbackPlacementId = `city_place_${Math.round(x)}_${Math.round(y)}`
    const regionLabel = String(placement.region_label ?? '').trim()
    const regionId = String(placement.region_id ?? '').trim()
    const stateId = String(placement.state_id ?? '').trim()
    const stateLabel = normalizeTianxiaYutuStateLabel(placement.state_label, regionLabel, stateId)
    const stableStateId = stateId || normalizeTianxiaYutuStateKey(stateId, stateLabel, regionId, regionLabel)
    for (const targetScope of targetScopes) {
      const targetId = `${placementId || fallbackPlacementId}_${targetScope}`
      jumpTargets.push({
        target_id: targetId,
        target_scope: targetScope,
        label: String(placement.city_name ?? '').trim(),
        kind: 'city',
        roles,
        state_id: stableStateId,
        source_state_id: stateId,
        state_label: stateLabel,
        region_id: regionId,
        region_label: regionLabel,
        cell_1km: {
          x: Math.round(x),
          y: Math.round(y),
        },
        source: `${EAST_HAN_ACCEPTED_AUTHORING_SEED_ARTIFACT_ID}.accepted_authoring_layers.city_placements.position_base_8k`,
        source_city_placement_id: placementId,
        source_catalog_city_id: String(placement.source_catalog_city_id ?? '').trim(),
        source_state_government_id: String(placement.source_state_government_id ?? '').trim(),
      })
    }
  }

  return jumpTargets
}

function buildEastHanAcceptedCityMarkers() {
  const seed = readEastHanAcceptedAuthoringSeedArtifact()
  if (!seed) {
    return []
  }

  const acceptedLayers = jsonRecordFrom(seed.accepted_authoring_layers)
  const cityPlacements = jsonRecordArrayFrom(acceptedLayers.city_placements)
  const markers: JsonRecord[] = []
  for (const placement of cityPlacements) {
    const positionBase8k = jsonRecordFrom(placement.position_base_8k)
    const x = Number(positionBase8k.x)
    const y = Number(positionBase8k.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue
    }
    const regionLabel = String(placement.region_label ?? '').trim()
    const regionId = String(placement.region_id ?? '').trim()
    const stateId = String(placement.state_id ?? '').trim()
    const stateLabel = normalizeTianxiaYutuStateLabel(placement.state_label, regionLabel, stateId)
    const stableStateId = stateId || normalizeTianxiaYutuStateKey(stateId, stateLabel, regionId, regionLabel)
    markers.push({
      marker_id: String(placement.id ?? '').trim() || `city_marker_${Math.round(x)}_${Math.round(y)}`,
      marker_scope: 'city',
      label: String(placement.city_name ?? '').trim(),
      roles: stringArrayFrom(placement.roles),
      state_id: stableStateId,
      source_state_id: stateId,
      state_label: stateLabel,
      region_id: regionId,
      region_label: regionLabel,
      cell_1km: {
        x: Math.round(x),
        y: Math.round(y),
      },
      source: `${EAST_HAN_ACCEPTED_AUTHORING_SEED_ARTIFACT_ID}.accepted_authoring_layers.city_placements.position_base_8k`,
      source_city_placement_id: String(placement.id ?? '').trim(),
    })
  }
  return markers
}

function isTianxiaYutuPlaceholderAdministrativeLabel(value: unknown): boolean {
  const label = String(value ?? '').trim()
  return label === '' || label.includes('未定区') || label.includes('未定')
}

function normalizeTianxiaYutuStateLabel(rawLabel: unknown, fallbackRegionLabel = '', fallbackStateId = ''): string {
  const label = String(rawLabel ?? '').trim()
  if (!isTianxiaYutuPlaceholderAdministrativeLabel(label)) {
    return label
  }
  const regionLabel = String(fallbackRegionLabel ?? '').trim()
  if (regionLabel !== '' && !isTianxiaYutuPlaceholderAdministrativeLabel(regionLabel)) {
    return regionLabel
  }
  return String(fallbackStateId ?? '').trim()
}

function normalizeTianxiaYutuStateKey(rawStateId: unknown, rawStateLabel: unknown, regionId: string, regionLabel: string): string {
  const stateId = String(rawStateId ?? '').trim()
  const stateLabel = String(rawStateLabel ?? '').trim()
  if (stateId !== '') {
    return stateId
  }
  if (!isTianxiaYutuPlaceholderAdministrativeLabel(stateLabel)) {
    return stateLabel
  }
  if (regionId !== '') {
    return `outer_${regionId}`
  }
  if (regionLabel !== '') {
    return `outer_${regionLabel}`
  }
  return 'outer_named_region'
}

function buildEastHanAcceptedGateJumpTargets() {
  const seed = readEastHanAcceptedAuthoringSeedArtifact()
  if (!seed) {
    return []
  }

  const acceptedLayers = jsonRecordFrom(seed.accepted_authoring_layers)
  const gatePoints = jsonRecordArrayFrom(acceptedLayers.gate_points)
  const regionById = new Map<string, JsonRecord>()
  for (const rawRegion of jsonRecordArrayFrom(acceptedLayers.regions)) {
    const region = jsonRecordFrom(rawRegion)
    const regionId = String(region.id ?? '').trim()
    if (regionId !== '') {
      regionById.set(regionId, region)
    }
  }
  const jumpTargets: JsonRecord[] = []
  const gateNameCounts = new Map<string, number>()
  for (const gate of gatePoints) {
    const gateName = String(gate.name ?? '').trim()
    if (gateName === '' || gateName === '镇南关') {
      continue
    }
    gateNameCounts.set(gateName, (gateNameCounts.get(gateName) ?? 0) + 1)
  }

  for (const gate of gatePoints) {
    const positionBase8k = jsonRecordFrom(gate.position_base_8k)
    let x = Number(positionBase8k.x)
    let y = Number(positionBase8k.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue
    }

    const gateId = String(gate.id ?? '').trim()
    const gateName = String(gate.name ?? '').trim()
    if (gateName === '镇南关') {
      continue
    }
    const fallbackGateId = `gate_${Math.round(x)}_${Math.round(y)}`
    let fromStateGroupId = String(gate.from_state_group_id ?? '').trim()
    let toStateGroupId = String(gate.to_state_group_id ?? '').trim()
    let fromStateLabel = String(gate.from_state_group_label ?? '').trim()
    let toStateLabel = String(gate.to_state_group_label ?? '').trim()
    let fromRegionId = String(gate.from_region_id ?? '').trim()
    let toRegionId = String(gate.to_region_id ?? '').trim()
    let fromRegionLabel = String(gate.from_region_label ?? '').trim()
    let toRegionLabel = String(gate.to_region_label ?? '').trim()
    const fromRegion = regionById.get(fromRegionId) ?? {}
    const toRegion = regionById.get(toRegionId) ?? {}
    if (fromStateGroupId === '') {
      fromStateGroupId = String(fromRegion.state_id ?? '').trim()
    }
    if (toStateGroupId === '') {
      toStateGroupId = String(toRegion.state_id ?? '').trim()
    }
    if (fromStateLabel === '') {
      fromStateLabel = String(fromRegion.state_label ?? '').trim()
    }
    if (toStateLabel === '') {
      toStateLabel = String(toRegion.state_label ?? '').trim()
    }
    let stateId = String(gate.state_id ?? gate.from_state_group_id ?? '').trim()
    if (stateId === '') {
      stateId = fromStateGroupId
    }
    let crossStateGroup = Boolean(gate.cross_state_group) || (fromStateGroupId !== '' && toStateGroupId !== '' && fromStateGroupId !== toStateGroupId)
    const resolvedMaskSnap = jsonRecordFrom(gate.resolved_mask_snap)
    const boundarySnapStatus = String(resolvedMaskSnap.status ?? '').trim() || 'legacy_authoring_without_resolved_boundary_snap'
    const boundarySnapBasis = String(resolvedMaskSnap.basis ?? '').trim() || String(gate.snap_source ?? '').trim() || 'legacy_authoring'
    const runtimeAdjustment = ''
    const relationLabel = [fromRegionLabel, toRegionLabel].filter(Boolean).join(' / ')
    const isDuplicateGateName = gateName !== '' && (gateNameCounts.get(gateName) ?? 0) > 1
    const navigationLabel =
      isDuplicateGateName && relationLabel !== ''
        ? `${gateName}（${relationLabel}）`
        : gateName || relationLabel || '关口'
    jumpTargets.push({
      target_id: gateId || fallbackGateId,
      target_scope: 'gate',
      label: gateName || relationLabel || '关口',
      navigation_label: navigationLabel,
      original_gate_name: gateName,
      duplicate_gate_name: isDuplicateGateName,
      kind: 'gate',
      roles: ['gate', 'strategic_pass'],
      state_id: stateId,
      state_label: fromStateLabel || toStateLabel,
      region_id: fromRegionId,
      region_label: relationLabel,
      from_region_id: fromRegionId,
      to_region_id: toRegionId,
      from_region_label: fromRegionLabel,
      to_region_label: toRegionLabel,
      from_state_group_id: fromStateGroupId,
      to_state_group_id: toStateGroupId,
      from_state_group_label: fromStateLabel,
      to_state_group_label: toStateLabel,
      cross_state_group: crossStateGroup,
      gate_level: gate.gate_level ?? gate.level ?? '',
      cell_1km: {
        x: Math.round(x),
        y: Math.round(y),
      },
      source: `${EAST_HAN_ACCEPTED_AUTHORING_SEED_ARTIFACT_ID}.accepted_authoring_layers.gate_points.position_base_8k`,
      source_gate_id: gateId,
      boundary_snap_basis: boundarySnapBasis,
      boundary_snap_status: boundarySnapStatus,
      boundary_pair_key: String(resolvedMaskSnap.boundary_pair_key ?? '').trim(),
      boundary_direct_edge_pixel_count: Number(resolvedMaskSnap.direct_edge_pixel_count ?? 0),
      boundary_nearest_sample_index: Number(resolvedMaskSnap.nearest_boundary_sample_index ?? -1),
      boundary_snap_distance_preview: Number(resolvedMaskSnap.distance_preview ?? 0),
      runtime_adjustment: runtimeAdjustment,
    })
  }

  return jumpTargets
}

function mergeEastHanTianxiaYutuJumpTargets(manifestTargets: unknown) {
  const merged = new Map<string, JsonRecord>()
  const addTarget = (target: JsonRecord) => {
    const cell = jsonRecordFrom(target.cell_1km)
    const key = [
      String(target.target_id ?? '').trim(),
      String(target.target_scope ?? '').trim(),
      String(target.label ?? '').trim(),
      Number(cell.x),
      Number(cell.y),
    ].join(':')
    merged.set(key, target)
  }

  for (const target of jsonRecordArrayFrom(manifestTargets)) {
    addTarget(target)
  }
  for (const target of buildEastHanAcceptedCityJumpTargets()) {
    addTarget(target)
  }
  for (const target of buildEastHanAcceptedGateJumpTargets()) {
    addTarget(target)
  }

  return Array.from(merged.values())
}

function buildEastHanTianxiaYutuNavigationFacets(jumpTargets: JsonRecord[]) {
  const targetScopeCounts: Record<string, number> = {}
  const stateCounts: Record<string, number> = {}
  for (const target of jumpTargets) {
    const scope = String(target.target_scope ?? target.kind ?? 'unknown').trim() || 'unknown'
    const stateLabel = String(target.state_label ?? '').trim() || '未分州'
    targetScopeCounts[scope] = (targetScopeCounts[scope] ?? 0) + 1
    stateCounts[stateLabel] = (stateCounts[stateLabel] ?? 0) + 1
  }

  return {
    schema_version: 'tianxia_yutu_navigation_facets_v0_1',
    search_fields: ['label', 'state_label', 'region_label', 'target_scope', 'kind'],
    filter_groups: [
      { id: 'all', label: '全部', target_scopes: [] },
      { id: 'state_government', label: '州治', target_scopes: ['state_government'] },
      { id: 'commandery_seat', label: '郡治', target_scopes: ['commandery_seat'] },
      { id: 'gate', label: '关口', target_scopes: ['gate'] },
    ],
    target_scope_counts: targetScopeCounts,
    state_counts: stateCounts,
    default_filter_group_id: 'all',
    default_search_query: '',
  }
}

const TIANXIA_YUTU_SCALE_PRESET_CATALOG = [
  {
    id: '2k',
    label: '2K',
    max_width_px: 2048,
    max_height_px: 2048,
    recommended_tile_px: 512,
    runtime_role: 'fast_overview_and_mobile_default',
  },
  {
    id: '16k',
    label: '16K',
    max_width_px: 16384,
    max_height_px: 16384,
    recommended_tile_px: 1024,
    runtime_role: 'desktop_detail_drilldown',
  },
] as const

function normalizeTianxiaYutuScalePresetId(rawPreset: unknown) {
  const normalized = String(rawPreset ?? '').trim().toLowerCase()
  if (normalized === '2k' || normalized === '2048') {
    return '2k'
  }
  return '16k'
}

function buildTianxiaYutuScalePreset(rawPreset: unknown) {
  const normalizedRequestedPreset = String(rawPreset ?? '').trim().toLowerCase()
  const requestedPresetId = normalizedRequestedPreset || '16k'
  const presetId = normalizeTianxiaYutuScalePresetId(rawPreset)
  const preset =
    TIANXIA_YUTU_SCALE_PRESET_CATALOG.find((entry) => entry.id === presetId) ??
    TIANXIA_YUTU_SCALE_PRESET_CATALOG[1]
  const requestMatchesResolved =
    requestedPresetId === presetId ||
    (requestedPresetId === '2048' && presetId === '2k')

  return {
    ...preset,
    requested_preset_id: requestedPresetId,
    resolved_preset_id: presetId,
    coordinate_space: EAST_HAN_LAYERED_COORDINATE_SPACE,
    main_world_substrate: false,
    unit_view_layer_policy: 'not_used_by_tianxia_yutu_overview',
    query_param: 'tianxiaYutuScalePreset',
    fallback_preset_id: '16k',
    fallback_reason: requestMatchesResolved ? '' : 'unsupported_preset',
    invalid_preset_fallback_policy: 'fallback_to_16k_without_exposing_24k',
    source_preview_policy: 'runtime_scale_preset_metadata_only_current_preview_image_remains_accepted_1600w_renderer',
  }
}

function buildTianxiaYutuScalePresetCatalog() {
  return TIANXIA_YUTU_SCALE_PRESET_CATALOG.map((preset) => ({
    ...preset,
    coordinate_space: EAST_HAN_LAYERED_COORDINATE_SPACE,
    main_world_substrate: false,
    unit_view_layer_policy: 'not_used_by_tianxia_yutu_overview',
  }))
}

function buildTianxiaYutuSourceContractSummary(manifest: JsonRecord) {
  const sources = jsonRecordFrom(manifest.sources)
  const sourcePolicy = jsonRecordFrom(manifest.source_policy)
  const terrainSource = jsonRecordFrom(sources.terrain_8k)
  return {
    schema_version: 'tianxia_yutu_source_contract_summary_v0_1',
    runtime_manifest_artifact_id: String(
      manifest.artifact_id ?? EAST_HAN_TIANXIA_YUTU_RUNTIME_TILE_MANIFEST_ARTIFACT_ID,
    ),
    runtime_manifest_status: String(manifest.status ?? ''),
    source_artifact_path: EAST_HAN_TIANXIA_YUTU_RUNTIME_TILE_MANIFEST_PATH,
    base_size_px: Array.isArray(manifest.base_size_px) ? manifest.base_size_px : [],
    max_detail_size_px: Array.isArray(manifest.max_detail_size_px) ? manifest.max_detail_size_px : [],
    current_highest_lod_preset_id: '16k',
    runtime_preset_ids: TIANXIA_YUTU_SCALE_PRESET_CATALOG.map((preset) => preset.id),
    unsupported_preset_ids: ['24k'],
    runtime_tile_count: Number(manifest.tile_count ?? 0),
    runtime_tile_level_count: Number(manifest.tile_level_count ?? 0),
    terrain_source_id: 'terrain_8k',
    terrain_source_size_px: Array.isArray(terrainSource.size_px) ? terrainSource.size_px : [],
    large_scale_policy: String(sourcePolicy.large_scale_policy ?? ''),
    no_24k_runtime_asset: true,
    source_fingerprints: {
      terrain_8k: terrainSource,
      owner_index_raster: jsonRecordFrom(sources.owner_index_raster),
      derived_masks: jsonRecordFrom(sources.derived_masks),
      lod0_lod2_renderer: jsonRecordFrom(sources.lod0_lod2_renderer),
      lod3_renderer: jsonRecordFrom(sources.lod3_renderer),
    },
  }
}

function buildEastHanTianxiaYutuAdministrativeOwnershipLayer() {
  const seed = readEastHanAcceptedAuthoringSeedArtifact()
  if (!seed) {
    return {
      schema_version: 'tianxia_yutu_administrative_ownership_layer_v0_1',
      status: 'missing_seed',
      state_count: 0,
      region_count: 0,
      states: [],
      regions: [],
      state_region_index: {},
      drilldown: {
        default_level: 'state',
        next_level: 'region',
        click_policy: 'state_to_region_then_existing_jump_targets_or_coordinate_click',
      },
    }
  }

  const acceptedLayers = jsonRecordFrom(seed.accepted_authoring_layers)
  const regions = jsonRecordArrayFrom(acceptedLayers.regions)
  const states = new Map<string, JsonRecord & { region_count: number; centroid_x_total: number; centroid_y_total: number }>()
  const stateRegionIndex = new Map<string, JsonRecord & { regions: JsonRecord[]; region_ids: string[] }>()
  const regionSummaries: JsonRecord[] = []

  for (const region of regions) {
    const regionId = String(region.id ?? '').trim()
    const regionLabel = String(region.label ?? '').trim()
    const stateId = String(region.state_id ?? '').trim()
    const stateLabel = normalizeTianxiaYutuStateLabel(region.state_label, regionLabel, stateId)
    const stateKey = normalizeTianxiaYutuStateKey(stateId, stateLabel, regionId, regionLabel)
    const stableStateId = stateId || stateKey
    const centroid = jsonRecordFrom(region.centroid_base_8k)
    const centroidX = Number(centroid.x)
    const centroidY = Number(centroid.y)
    const regionSummary = {
      region_id: regionId,
      region_label: regionLabel,
      state_id: stableStateId,
      source_state_id: stateId,
      state_label: stateLabel,
      category: String(region.category ?? '').trim(),
      centroid_base_8k: Number.isFinite(centroidX) && Number.isFinite(centroidY)
        ? { x: Math.round(centroidX), y: Math.round(centroidY) }
        : {},
      bounds_preview: jsonRecordFrom(region.bounds_preview),
      source: `${EAST_HAN_ACCEPTED_AUTHORING_SEED_ARTIFACT_ID}.accepted_authoring_layers.regions`,
    }
    regionSummaries.push(regionSummary)

    const stateEntry = states.get(stateKey) ?? {
      state_id: stableStateId,
      source_state_id: stateId,
      _state_key: stateKey,
      state_label: stateLabel || stateKey,
      region_count: 0,
      centroid_x_total: 0,
      centroid_y_total: 0,
    }
    stateEntry.region_count += 1
    if (Number.isFinite(centroidX) && Number.isFinite(centroidY)) {
      stateEntry.centroid_x_total += centroidX
      stateEntry.centroid_y_total += centroidY
    }
    states.set(stateKey, stateEntry)

    const indexEntry = stateRegionIndex.get(stateKey) ?? {
      state_id: stableStateId,
      source_state_id: stateId,
      _state_key: stateKey,
      state_label: stateLabel || stateKey,
      region_ids: [],
      regions: [],
    }
    indexEntry.region_ids.push(regionId)
    indexEntry.regions.push(regionSummary)
    stateRegionIndex.set(stateKey, indexEntry)
  }

  const stateSummaries = Array.from(states.values()).map((state) => {
    const regionCount = Math.max(1, Number(state.region_count))
    return {
      state_id: state.state_id,
      state_label: state.state_label,
      region_count: state.region_count,
      centroid_base_8k: {
        x: Math.round(Number(state.centroid_x_total) / regionCount),
        y: Math.round(Number(state.centroid_y_total) / regionCount),
      },
      control_owner: 'han_neutral',
      source: `${EAST_HAN_ACCEPTED_AUTHORING_SEED_ARTIFACT_ID}.accepted_authoring_layers.regions`,
    }
  })
  const stateRegionIndexRecord = Object.fromEntries(
    Array.from(stateRegionIndex.entries()).map(([stateKey, entry]) => [
      stateKey,
      {
        state_id: entry.state_id,
        state_label: entry.state_label,
        region_ids: entry.region_ids,
        regions: entry.regions.sort((a, b) =>
          String(a.region_label ?? '').localeCompare(String(b.region_label ?? ''), 'zh-Hans-CN'),
        ),
      },
    ]),
  )

  return {
    schema_version: 'tianxia_yutu_administrative_ownership_layer_v0_1',
    status: 'ready',
    coordinate_space: EAST_HAN_LAYERED_COORDINATE_SPACE,
    ownership_model: 'state_commandery_administrative_owner_neutral_until_runtime_faction_control',
    state_count: stateSummaries.length,
    region_count: regionSummaries.length,
    states: stateSummaries,
    regions: regionSummaries,
    state_region_index: stateRegionIndexRecord,
    drilldown: {
      default_level: 'state',
      next_level: 'region',
      state_count: stateSummaries.length,
      region_count: regionSummaries.length,
      click_policy: 'state_to_region_then_existing_jump_targets_or_coordinate_click',
      jump_policy: 'selected_region_uses_commandery_seat_gate_or_coordinate_target_then_existing_explicit_jump',
      unit_view_layer_policy: 'not_used_by_tianxia_yutu_overview',
    },
  }
}

function buildEastHanTianxiaYutuFactionColorLayer(manifest: JsonRecord) {
  const runtimeOverlayPolicy = jsonRecordFrom(manifest.runtime_overlay_policy)
  return {
    schema_version: 'tianxia_yutu_faction_color_layer_v0_1',
    status: 'ready',
    state_colors_baked_into_tiles: Boolean(runtimeOverlayPolicy.state_colors_baked_into_tiles),
    color_mode: 'runtime_player_nation_color_over_administrative_neutral_base',
    default_owner: 'han_neutral',
    default_color_rgba: [0.74, 0.66, 0.47, 0.28],
    player_nation_color_policy: {
      source: 'future_player_founded_nation_profile',
      editable_by_player_after_nation_founding: false,
      change_requires: 'capital_migration_reselects_capital_name_and_color',
      fallback_when_unfounded: 'show_neutral_administrative_ownership',
    },
    current_runtime_color_entries: buildEastHanTianxiaYutuRuntimeColorEntries(),
  }
}

function buildEastHanTianxiaYutuRuntimeColorEntries() {
  return Object.values(worldState.factions)
    .filter((faction) => faction.organizationKind === 'nation' && faction.nationName && faction.colorHex)
    .map((faction) => ({
      faction_id: faction.id,
      nation_name: faction.nationName,
      color_hex: faction.colorHex,
      capital_tile_id: faction.nationCapitalTileId ?? '',
      capital_name: faction.nationCapitalName ?? '',
      source: 'nation_profile',
      visibility: 'runtime_faction_color',
    }))
    .sort((a, b) => a.faction_id.localeCompare(b.faction_id))
}

function buildEastHanTianxiaYutuFrontlineMarkers() {
  return buildAllianceFrontlineMarkerReadModels(worldState).map((marker) => ({
    id: marker.id,
    faction_id: marker.factionId,
    label: marker.label,
    from_cell: {
      x: marker.fromCell.x,
      y: marker.fromCell.y,
    },
    to_cell: {
      x: marker.toCell.x,
      y: marker.toCell.y,
    },
    note: marker.note ?? '',
    visibility: marker.visibility,
    authority_source: marker.authoritySource,
    actor_commander_id: marker.actorCommanderId,
    actor_commander_name: marker.actorCommanderName,
    authority_role: marker.authorityRole,
    authority_grant_id: marker.authorityGrantId ?? '',
    actor_session_id_type: marker.actorSessionIdType ?? '',
    actor_session_id: marker.actorSessionId ?? '',
    actor_player_name: marker.actorPlayerName ?? '',
    actor_seat_id: marker.actorSeatId ?? null,
    updated_at: marker.updatedAt,
    updated_world_version: marker.updatedWorldVersion,
  }))
}

function buildEastHanTianxiaYutuStateBoundaryPolyline(segment: JsonRecord) {
  const rawPoints = jsonRecordArrayFrom(segment.sample_points_base_8k)
  const maxPointCount = 96
  const selectedIndices = new Set<number>()

  if (rawPoints.length <= maxPointCount) {
    for (let index = 0; index < rawPoints.length; index += 1) {
      selectedIndices.add(index)
    }
  } else {
    for (let index = 0; index < maxPointCount; index += 1) {
      selectedIndices.add(Math.round((index / Math.max(1, maxPointCount - 1)) * (rawPoints.length - 1)))
    }
  }

  const polyline: JsonRecord[] = []
  for (const index of Array.from(selectedIndices).sort((a, b) => a - b)) {
    const point = rawPoints[index]
    const x = Number(point?.x)
    const y = Number(point?.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue
    }
    const rounded = { x: Math.round(x), y: Math.round(y) }
    const previous = polyline[polyline.length - 1]
    if (previous && previous.x === rounded.x && previous.y === rounded.y) {
      continue
    }
    polyline.push(rounded)
  }

  return polyline
}

function buildEastHanTianxiaYutuBoundaryPointCloud(segment: JsonRecord, maxPointCount = 128) {
  const rawPoints = jsonRecordArrayFrom(segment.sample_points_base_8k)
  const selectedIndices = new Set<number>()

  if (rawPoints.length <= maxPointCount) {
    for (let index = 0; index < rawPoints.length; index += 1) {
      selectedIndices.add(index)
    }
  } else {
    for (let index = 0; index < maxPointCount; index += 1) {
      selectedIndices.add(Math.round((index / Math.max(1, maxPointCount - 1)) * (rawPoints.length - 1)))
    }
  }

  const points: JsonRecord[] = []
  const seen = new Set<string>()
  for (const index of Array.from(selectedIndices).sort((a, b) => a - b)) {
    const point = rawPoints[index]
    const x = Number(point?.x)
    const y = Number(point?.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue
    }
    const rounded = { x: Math.round(x), y: Math.round(y) }
    const key = `${rounded.x},${rounded.y}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    points.push(rounded)
  }

  return points
}

function buildEastHanTianxiaYutuStateBoundarySegments() {
  const artifact = readEastHanStateBoundarySegmentsArtifact()
  if (!artifact) {
    return []
  }

  return jsonRecordArrayFrom(artifact.state_boundary_segments)
    .filter((segment) => String(segment.kind ?? '').trim() === 'state_border')
    .map((segment, index) => {
      const regionALabel = String(segment.region_a_label ?? segment.regionALabel ?? '').trim()
      const regionBLabel = String(segment.region_b_label ?? segment.regionBLabel ?? '').trim()
      const polyline = buildEastHanTianxiaYutuStateBoundaryPolyline(segment)
      const segmentId = String(segment.id ?? '').trim() || `state_boundary_segment_${String(index + 1).padStart(4, '0')}`

      return {
        id: segmentId,
        segment_id: segmentId,
        pair_key: String(segment.pair_key ?? '').trim(),
        kind: 'state_boundary_segment',
        render_overlay_id: 'frontiers',
        tianxia_yutu_visual_role: 'gold_state_boundary_outline',
        label: [regionALabel, regionBLabel].filter(Boolean).join(' ↔ '),
        region_a: String(segment.region_a ?? '').trim(),
        region_b: String(segment.region_b ?? '').trim(),
        region_a_label: regionALabel,
        region_b_label: regionBLabel,
        raw_sample_point_count: jsonRecordArrayFrom(segment.sample_points_base_8k).length,
        cell_1km_polyline: polyline,
        cell_1km_polyline_count: polyline.length,
        centroid_cell_1km: jsonRecordFrom(segment.centroid_base_8k),
        bounds_cell_1km: jsonRecordFrom(segment.bounds_base_8k),
        main_world_substrate: false,
        creates_jump_target: false,
        asset_policy: 'no_mountain_asset_in_tianxia_yutu',
        click_policy: 'use_existing_tianxia_yutu_coordinate_click_and_existing_jump_targets_only',
        source: `${EAST_HAN_STATE_BOUNDARY_SEGMENTS_ARTIFACT_ID}.state_boundary_segments`,
      }
    })
}

function buildEastHanTianxiaYutuOuterBoundarySegments() {
  const contract = readEastHanMainWorldMountainBoundaryContractArtifact()
  if (!contract) {
    return []
  }

  const assetLayer = jsonRecordFrom(contract.mainWorldMountainBoundaryAssetLayer)
  const inventory = jsonRecordFrom(assetLayer.commanderyBoundaryInventory)
  const inventorySegments = jsonRecordArrayFrom(inventory.stableCommanderyBoundarySegments)
  const inventoryById = new Map<string, JsonRecord>()
  for (const segment of inventorySegments) {
    const segmentId = String(segment.id ?? '').trim()
    if (segmentId) {
      inventoryById.set(segmentId, segment)
    }
  }

  const manuallyAcceptedOuterContactSegmentIds = new Set(['stable_commandery_boundary_segment_0150'])
  const placements = jsonRecordArrayFrom(assetLayer.placements)
    .filter((placement) => {
      const source = jsonRecordFrom(placement.sourceBoundarySegment)
      return (
        String(source.kind ?? '').trim() === 'outer_contact_commandery_border' &&
        String(placement.lineRole ?? '').trim() === 'stable_direct_outer_contact_boundary_blockade_candidate'
      )
    })
    .sort((a, b) => String(a.runtimePlacementId ?? '').localeCompare(String(b.runtimePlacementId ?? '')))

  const usedSourceIds = new Set<string>()
  const outerSegments: JsonRecord[] = []
  const acceptedSources = placements.map((placement) => ({
    placement,
    sourceSegmentId: String(jsonRecordFrom(placement.sourceBoundarySegment).id ?? '').trim(),
    acceptance: 'v0_47_runtime_outer_contact_placement',
  }))
  for (const sourceSegmentId of Array.from(manuallyAcceptedOuterContactSegmentIds).sort()) {
    if (!acceptedSources.some((item) => item.sourceSegmentId === sourceSegmentId)) {
      acceptedSources.push({
        placement: {},
        sourceSegmentId,
        acceptance: 'v0_48_manual_tianxia_yutu_outer_contact_acceptance',
      })
    }
  }

  for (const acceptedSource of acceptedSources) {
    const placement = acceptedSource.placement
    const source = jsonRecordFrom(placement.sourceBoundarySegment)
    const sourceSegmentId = acceptedSource.sourceSegmentId
    if (!sourceSegmentId || usedSourceIds.has(sourceSegmentId)) {
      continue
    }
    const sourceSegment = inventoryById.get(sourceSegmentId)
    if (!sourceSegment) {
      continue
    }

    usedSourceIds.add(sourceSegmentId)
    const pointCloud = buildEastHanTianxiaYutuBoundaryPointCloud(sourceSegment)
    const regionA = jsonRecordFrom(source.regionA)
    const regionB = jsonRecordFrom(source.regionB)
    const fallbackRegionA = {
      id: String(sourceSegment.region_a_id ?? '').trim(),
      label: String(sourceSegment.region_a_label ?? '').trim(),
      stateId: String(sourceSegment.region_a_state_id ?? '').trim(),
      stateLabel: String(sourceSegment.region_a_state_label ?? '').trim(),
    }
    const fallbackRegionB = {
      id: String(sourceSegment.region_b_id ?? '').trim(),
      label: String(sourceSegment.region_b_label ?? '').trim(),
      stateId: String(sourceSegment.region_b_state_id ?? '').trim(),
      stateLabel: String(sourceSegment.region_b_state_label ?? '').trim(),
    }
    const resolvedRegionA = String(regionA.id ?? '').trim() ? regionA : fallbackRegionA
    const resolvedRegionB = String(regionB.id ?? '').trim() ? regionB : fallbackRegionB
    const innerRegion = String(resolvedRegionA.stateId ?? '').trim() ? resolvedRegionA : resolvedRegionB
    const outerRegion = String(resolvedRegionA.stateId ?? '').trim() ? resolvedRegionB : resolvedRegionA
    const runtimePlacementId = String(placement.runtimePlacementId ?? '').trim()
    const label = String(source.label ?? '').trim() || [
      String(sourceSegment.region_a_label ?? '').trim(),
      String(sourceSegment.region_b_label ?? '').trim(),
    ].filter(Boolean).join(' / ')

    outerSegments.push({
      id: sourceSegmentId,
      segment_id: sourceSegmentId,
      runtime_placement_id: runtimePlacementId,
      acceptance_source: acceptedSource.acceptance,
      pair_key: String(source.pairKey ?? sourceSegment.pair_key ?? '').trim(),
      kind: 'outer_boundary_segment',
      render_overlay_id: 'frontiers',
      tianxia_yutu_visual_role: 'cyan_outer_contact_boundary_continuous_line_band',
      render_mode: 'continuous_sample_band',
      line_rgb: [80, 235, 245],
      halo_rgb: [10, 82, 89],
      line_preview_width_px: 4,
      halo_preview_width_px: 6,
      label,
      inner_region_id: String(innerRegion.id ?? '').trim(),
      inner_region_label: String(innerRegion.label ?? '').trim(),
      inner_state_id: String(innerRegion.stateId ?? '').trim(),
      inner_state_label: String(innerRegion.stateLabel ?? '').trim(),
      outer_region_id: String(outerRegion.id ?? '').trim(),
      outer_region_label: String(outerRegion.label ?? '').trim(),
      raw_sample_point_count: jsonRecordArrayFrom(sourceSegment.sample_points_base_8k).length,
      cell_1km_point_cloud: pointCloud,
      cell_1km_point_count: pointCloud.length,
      centroid_cell_1km: jsonRecordFrom(source.centroidBase8k ?? sourceSegment.centroid_base_8k),
      bounds_cell_1km: jsonRecordFrom(source.boundsBase8k ?? sourceSegment.bounds_base_8k),
      main_world_substrate: false,
      creates_jump_target: false,
      asset_policy: 'no_mountain_asset_in_tianxia_yutu',
      click_policy: 'use_existing_tianxia_yutu_coordinate_click_and_existing_jump_targets_only',
      point_order_policy: 'sample_band_no_straight_polyline_for_unordered_outer_contact_samples',
      main_world_asset_policy:
        acceptedSource.acceptance === 'v0_47_runtime_outer_contact_placement'
          ? 'main_world_consumes_v0_47_outer_contact_mountain_assets; Tianxia Yutu draws cyan continuous boundary bands only'
          : 'manual_tianxia_yutu_outer_contact_acceptance_only; main-world mountain placement still requires a future runtime contract promotion',
      source: `${EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_CONTRACT_ARTIFACT_ID}.mainWorldMountainBoundaryAssetLayer.placements`,
    })
  }

  return outerSegments.sort((a, b) => String(a.segment_id ?? '').localeCompare(String(b.segment_id ?? '')))
}

function buildEastHanTianxiaYutuStrategicOverlayLayer(manifest: JsonRecord, jumpTargets: JsonRecord[]) {
	const gateCount = jumpTargets.filter((target) => String(target.target_scope ?? '') === 'gate').length
	const runtimeOverlayPolicy = jsonRecordFrom(manifest.runtime_overlay_policy)
	const frontlineMarkers = buildEastHanTianxiaYutuFrontlineMarkers()
	const legacyStateBoundarySegments = buildEastHanTianxiaYutuStateBoundarySegments()
	const stateBoundarySegments: JsonRecord[] = []
	const outerBoundarySegments = buildEastHanTianxiaYutuOuterBoundarySegments()
	return {
    schema_version: 'tianxia_yutu_strategic_overlay_layer_v0_1',
    status: 'ready',
    overlays: [
      {
        id: 'administrative_ownership',
        label: '州郡归属',
        default_visible: true,
        product_meaning: '看清州、郡边界和归属，是天下舆图的底层读图能力。',
      },
      {
        id: 'faction_colors',
        label: '势力色',
        default_visible: true,
        product_meaning: '玩家立国并选择颜色后，用同一张舆图表达势力范围；未立国时显示中性行政归属。',
      },
      {
        id: 'resource_points',
        label: '资源',
        default_visible: false,
        product_meaning: '辅助判断扩张、补给和建设潜力，不替代主世界资源格操作。',
      },
			{
				id: 'frontiers',
				label: '州界/战线',
				default_visible: false,
				product_meaning:
					'表达战线、势力边界、青色外圈边界、对峙面和推进方向；完整十三州金色州界已烘焙在州郡归属底图，不再由运行时短片段叠加。',
			},
      {
        id: 'gate_markers',
        label: '关口',
        default_visible: false,
        product_meaning: '关口作为搜索、筛选、跳转和高缩放交互锚点，不在全图总览默认常显。',
      },
    ],
		runtime_overlays: Array.isArray(runtimeOverlayPolicy.runtime_overlays) ? runtimeOverlayPolicy.runtime_overlays : [],
		state_boundary_segment_policy: {
			source_artifact_path: EAST_HAN_TIANXIA_YUTU_RUNTIME_TILE_MANIFEST_PATH,
			legacy_source_artifact_path: EAST_HAN_STATE_BOUNDARY_SEGMENTS_PATH,
			state_boundary_source: 'owner_index_state_adjacency_between_13_east_han_states',
			render_overlay_id: 'administrative_ownership',
			visual_role: 'baked_full_owner_index_state_adjacency_gold_boundaries',
			runtime_overlay_policy: 'legacy_36_short_state_boundary_segments_suppressed',
			navigation_policy: 'not_a_new_navigation_system; coordinate click and existing jump_targets remain authoritative',
			main_world_asset_policy:
				'main_world_consumes_mountain_boundary_assets_separately; Tianxia Yutu full gold state boundaries are baked into the overview source',
		},
		state_boundary_segments: stateBoundarySegments,
		suppressed_state_boundary_segments: legacyStateBoundarySegments,
		outer_boundary_segment_policy: {
      source_artifact_path: EAST_HAN_MAIN_WORLD_MOUNTAIN_BOUNDARY_CONTRACT_PATH,
      source_filter: 'accepted v0.47 placements where sourceBoundarySegment.kind is outer_contact_commandery_border, including manually promoted D30 true short outer boundary',
      render_overlay_id: 'frontiers',
      visual_role: 'cyan_outer_contact_boundary_continuous_line_band',
      navigation_policy: 'not_a_new_navigation_system; coordinate click and existing jump_targets remain authoritative',
      point_order_policy: 'sample_band_no_straight_polyline_for_unordered_outer_contact_samples',
      main_world_asset_policy:
        'main_world_consumes_v0_47_outer_contact_mountain_assets for all 50 accepted outer-contact runtime placements, including D30',
    },
    outer_boundary_segments: outerBoundarySegments,
    frontline_markers: frontlineMarkers,
    counts: {
			gate_jump_target_count: gateCount,
			frontline_marker_count: frontlineMarkers.length,
			state_boundary_segment_count: stateBoundarySegments.length,
			legacy_state_boundary_segment_count_suppressed: legacyStateBoundarySegments.length,
			outer_boundary_segment_count: outerBoundarySegments.length,
			frontier_boundary_total_count: outerBoundarySegments.length,
		},
	}
}

function buildEastHanTianxiaYutuAdminFocusMaskLayer() {
  const manifest = readEastHanTianxiaYutuAdminFocusMaskManifestArtifact()
  if (!manifest) {
    return {
      schema_version: 'tianxia_yutu_admin_focus_mask_layer_v0_1',
      status: 'missing',
      artifact_id: EAST_HAN_TIANXIA_YUTU_ADMIN_FOCUS_MASK_ARTIFACT_ID,
      source_artifact_path: EAST_HAN_TIANXIA_YUTU_ADMIN_FOCUS_MASK_MANIFEST_PATH,
      masks: [],
      asset_health_summary: {
        schema_version: 'tianxia_yutu_admin_focus_mask_asset_health_v0_1',
        coverage_status: 'missing_asset_manifest',
        mask_count: 0,
        state_mask_count: 0,
        region_mask_count: 0,
        missing_png_path_count: 0,
        missing_preview_path_count: 0,
        missing_bounds_count: 0,
        zero_pixel_mask_count: 0,
        runtime_hull_fallback_active: true,
        fallback_reason: 'missing_asset_manifest',
      },
      asset_focus_policy: 'missing_asset_fallback_to_runtime_hull_only',
    }
  }
  const masks = jsonRecordArrayFrom(manifest.masks)
  const stateMaskCount = masks.filter((mask) => String(mask.scope ?? '') === 'state').length
  const regionMaskCount = masks.filter((mask) => String(mask.scope ?? '') === 'region').length
  const expectedStateMaskCount = Number(manifest.state_mask_count ?? stateMaskCount)
  const expectedRegionMaskCount = Number(manifest.region_mask_count ?? regionMaskCount)
  const missingPngPathCount = masks.filter((mask) => !String(mask.path ?? '').endsWith('.png')).length
  const missingPreviewPathCount = masks.filter((mask) => !String(mask.preview_path ?? '').endsWith('.png')).length
  const missingBoundsCount = masks.filter((mask) => {
    const bounds = jsonRecordFrom(mask.bounds_px)
    return !Number.isFinite(Number(bounds.x)) ||
      !Number.isFinite(Number(bounds.y)) ||
      Number(bounds.w) <= 0 ||
      Number(bounds.h) <= 0
  }).length
  const zeroPixelMaskCount = masks.filter((mask) => Number(mask.pixel_count ?? 0) <= 0).length
  const hasFullCoverage =
    stateMaskCount === expectedStateMaskCount &&
    regionMaskCount === expectedRegionMaskCount &&
    missingPngPathCount === 0 &&
    missingPreviewPathCount === 0 &&
    missingBoundsCount === 0 &&
    zeroPixelMaskCount === 0
  return {
    schema_version: 'tianxia_yutu_admin_focus_mask_layer_v0_1',
    status: 'ready',
    manifest_status: String(manifest.status ?? ''),
    artifact_id: String(manifest.artifact_id ?? EAST_HAN_TIANXIA_YUTU_ADMIN_FOCUS_MASK_ARTIFACT_ID),
    source_artifact_path: EAST_HAN_TIANXIA_YUTU_ADMIN_FOCUS_MASK_MANIFEST_PATH,
    coordinate_space: String(manifest.coordinate_space ?? EAST_HAN_LAYERED_COORDINATE_SPACE),
    base_size_px: Array.isArray(manifest.base_size_px) ? manifest.base_size_px : [],
    source: jsonRecordFrom(manifest.source),
    masks,
    state_mask_count: stateMaskCount,
    region_mask_count: regionMaskCount,
    asset_health_summary: {
      schema_version: 'tianxia_yutu_admin_focus_mask_asset_health_v0_1',
      coverage_status: hasFullCoverage ? 'full_asset_coverage' : 'partial_asset_coverage',
      mask_count: masks.length,
      expected_state_mask_count: expectedStateMaskCount,
      expected_region_mask_count: expectedRegionMaskCount,
      state_mask_count: stateMaskCount,
      region_mask_count: regionMaskCount,
      missing_png_path_count: missingPngPathCount,
      missing_preview_path_count: missingPreviewPathCount,
      missing_bounds_count: missingBoundsCount,
      zero_pixel_mask_count: zeroPixelMaskCount,
      runtime_hull_fallback_active: !hasFullCoverage,
      fallback_reason: hasFullCoverage ? '' : 'asset_mask_health_gap',
      base_size_px: Array.isArray(manifest.base_size_px) ? manifest.base_size_px : [],
      coordinate_space: String(manifest.coordinate_space ?? EAST_HAN_LAYERED_COORDINATE_SPACE),
      source_artifact_path: EAST_HAN_TIANXIA_YUTU_ADMIN_FOCUS_MASK_MANIFEST_PATH,
    },
    asset_focus_policy: 'client_draws_owner_index_png_masks_before_labels; no_runtime_hull_when_mask_available',
    fallback_policy: 'runtime_hull_allowed_only_when_selected_state_or_region_has_no_asset_mask',
  }
}

function buildEastHanTianxiaYutuChokepointMetadataConsumer(jumpTargets: JsonRecord[]): JsonRecord {
  const metadataNodes: JsonRecord[] = []
  const seenBoundaryPairs = new Set<string>()
  for (const target of jumpTargets) {
    if (String(target.target_scope ?? '').trim() !== 'gate' || !Boolean(target.cross_state_group)) {
      continue
    }
    const boundaryPairKey = eastHanChokepointStatePairKey(target)
    if (boundaryPairKey === '' || seenBoundaryPairs.has(boundaryPairKey)) {
      continue
    }
    seenBoundaryPairs.add(boundaryPairKey)
    const cell = jsonRecordFrom(target.cell_1km)
    const x = Math.round(Number(cell.x))
    const y = Math.round(Number(cell.y))
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue
    }
    const gateId = String(target.source_gate_id ?? target.target_id ?? '').trim()
    const gateName = String(target.original_gate_name ?? target.label ?? '关口').trim()
    metadataNodes.push({
      metadata_contract_version: 'main_world_chokepoint_metadata_v0_1',
      runtime_chokepoint_id: `accepted_pass_wall_${gateId || `${x}_${y}`}`,
      gate_id: gateId,
      gate_name: gateName,
      display_name: String(target.navigation_label ?? target.label ?? gateName).trim(),
      target_scope: 'gate',
      world_coordinate: {
        coordinate_space: EAST_HAN_LAYERED_COORDINATE_SPACE,
        cell_1km: { x, y },
      },
      adjacent_states: {
        from: {
          id: String(target.from_state_group_id ?? '').trim(),
          label: String(target.from_state_group_label ?? '').trim(),
        },
        to: {
          id: String(target.to_state_group_id ?? '').trim(),
          label: String(target.to_state_group_label ?? '').trim(),
        },
      },
      adjacent_commanderies: {
        from: {
          id: String(target.from_region_id ?? '').trim(),
          label: String(target.from_region_label ?? '').trim(),
        },
        to: {
          id: String(target.to_region_id ?? '').trim(),
          label: String(target.to_region_label ?? '').trim(),
        },
      },
      boundary_pair_key: boundaryPairKey,
      formal_chokepoint: true,
      formal_pass_wall: true,
      source_artifact_id: EAST_HAN_CONTESTED_CHOKEPOINT_CONTRACT_ARTIFACT_ID,
      source_artifact_path: EAST_HAN_CONTESTED_CHOKEPOINT_CONTRACT_REPO_PATH,
      source_contract_version: 'v0_31',
    })
  }
  return {
    schema_version: 'tianxia_yutu_chokepoint_metadata_consumer_v0_1',
    source_metadata_contract_version: 'main_world_chokepoint_metadata_v0_1',
    source_layer_schema_version: 'east_han_main_world_chokepoint_layer_v0_1',
    source_artifact_id: EAST_HAN_CONTESTED_CHOKEPOINT_CONTRACT_ARTIFACT_ID,
    consumer_role: 'metadata_only_for_labels_hover_filters_and_jump_context',
    render_policy: 'metadata_only_do_not_load_or_draw_main_world_pass_wall_sprite',
    node_count: metadataNodes.length,
    nodes: metadataNodes,
  }
}

function buildEastHanTianxiaYutuOverviewLayer(options: { scalePreset?: string } = {}) {
  const manifest = readEastHanTianxiaYutuRuntimeTileManifestArtifact()
  if (!manifest) {
    return {
      display_order: 7,
      schema_version: EAST_HAN_TIANXIA_YUTU_RUNTIME_TILE_MANIFEST_ARTIFACT_ID,
      status: 'missing',
      source_artifact_path: EAST_HAN_TIANXIA_YUTU_RUNTIME_TILE_MANIFEST_PATH,
      runtime_role: 'overview_navigation_qa_preview',
      main_world_substrate: false,
      scale_preset: buildTianxiaYutuScalePreset(options.scalePreset),
      scale_preset_catalog: buildTianxiaYutuScalePresetCatalog(),
    }
  }

  const jumpTargets = mergeEastHanTianxiaYutuJumpTargets(manifest.jump_targets)

  return {
    display_order: 7,
    schema_version: EAST_HAN_TIANXIA_YUTU_RUNTIME_TILE_MANIFEST_ARTIFACT_ID,
    source_artifact_path: EAST_HAN_TIANXIA_YUTU_RUNTIME_TILE_MANIFEST_PATH,
    artifact_id: manifest.artifact_id,
    status: manifest.status,
    name_zh: manifest.name_zh,
    runtime_role: manifest.runtime_role,
    main_world_substrate: manifest.main_world_substrate,
    coordinate_space: manifest.coordinate_space,
    world_coordinate_space_for_jump_targets: manifest.world_coordinate_space_for_jump_targets,
    base_size_px: manifest.base_size_px,
    max_detail_size_px: manifest.max_detail_size_px,
    scale_preset: buildTianxiaYutuScalePreset(options.scalePreset),
    scale_preset_catalog: buildTianxiaYutuScalePresetCatalog(),
    dynamic_scale_policy: {
      query_param: 'tianxiaYutuScalePreset',
      supported_presets: ['2k', '16k'],
      coordinate_space: EAST_HAN_LAYERED_COORDINATE_SPACE,
      main_world_substrate: false,
      unit_view_layer_policy: 'not_used_by_tianxia_yutu_overview',
    },
    tile_px: manifest.tile_px,
    source_image: jsonRecordFrom(manifest.source_image),
    preview_image: jsonRecordFrom(manifest.preview_image),
    tile_level_count: manifest.tile_level_count,
    tile_count: manifest.tile_count,
    source_policy: jsonRecordFrom(manifest.source_policy),
    sources: jsonRecordFrom(manifest.sources),
    source_contract_summary: buildTianxiaYutuSourceContractSummary(manifest),
    deprecated_artifact_ids: Array.isArray(manifest.deprecated_artifact_ids)
      ? manifest.deprecated_artifact_ids
      : [],
    deprecated_source_paths: Array.isArray(manifest.deprecated_source_paths)
      ? manifest.deprecated_source_paths
      : [],
    tile_levels: Array.isArray(manifest.tile_levels) ? manifest.tile_levels : [],
    city_markers: buildEastHanAcceptedCityMarkers(),
    jump_targets: jumpTargets,
    main_world_chokepoint_metadata_consumer: buildEastHanTianxiaYutuChokepointMetadataConsumer(jumpTargets),
    navigation_facets: buildEastHanTianxiaYutuNavigationFacets(jumpTargets),
    administrative_ownership_layer: buildEastHanTianxiaYutuAdministrativeOwnershipLayer(),
    admin_focus_mask_layer: buildEastHanTianxiaYutuAdminFocusMaskLayer(),
    faction_color_layer: buildEastHanTianxiaYutuFactionColorLayer(manifest),
    strategic_overlay_layer: buildEastHanTianxiaYutuStrategicOverlayLayer(manifest, jumpTargets),
    runtime_overlay_policy: jsonRecordFrom(manifest.runtime_overlay_policy),
    consumer_contract: jsonRecordFrom(manifest.consumer_contract),
    client_authority: 'server_selects_runtime_tile_manifest_client_draws_overview_tiles',
  }
}

function roundToThree(value: number) {
  return Math.round(value * 1000) / 1000
}

function stateDetailNodeTypeFromScope(scope: string): 'city' | 'gate' | 'pass' | 'fort' | 'dock' | 'chokepoint' {
  if (scope === 'gate') {
    return 'gate'
  }
  return 'city'
}

function buildEastHanStateDetailRuntimeLayers(stateId: string) {
  const normalizedStateId = stateId.trim()
  if (normalizedStateId === '') {
    return null
  }

  const administrativeLayer = jsonRecordFrom(buildEastHanTianxiaYutuAdministrativeOwnershipLayer())
  const adminFocusMaskLayer = jsonRecordFrom(buildEastHanTianxiaYutuAdminFocusMaskLayer())
  const stateSummaries = jsonRecordArrayFrom(administrativeLayer.states)
  const stateSummary = stateSummaries.find((entry) => String(jsonRecordFrom(entry).state_id ?? '').trim() === normalizedStateId)
  const stateLabel = String(jsonRecordFrom(stateSummary ?? {}).state_label ?? normalizedStateId).trim() || normalizedStateId

  const stateMask = jsonRecordArrayFrom(adminFocusMaskLayer.masks).find((entry) => {
    const mask = jsonRecordFrom(entry)
    return String(mask.scope ?? '').trim() === 'state' && String(mask.state_id ?? '').trim() === normalizedStateId
  })
  const mask = jsonRecordFrom(stateMask ?? {})
  const boundsPx = jsonRecordFrom(mask.bounds_px)
  const minX = Math.max(0, Math.floor(Number(boundsPx.x ?? 0)))
  const minY = Math.max(0, Math.floor(Number(boundsPx.y ?? 0)))
  const widthPx = Math.max(1, Math.floor(Number(boundsPx.w ?? 0)))
  const heightPx = Math.max(1, Math.floor(Number(boundsPx.h ?? 0)))
  const maxX = minX + widthPx - 1
  const maxY = minY + heightPx - 1
  if (widthPx <= 0 || heightPx <= 0) {
    return null
  }

  const fitZoomFor2k = roundToThree(Math.max(2048 / widthPx, 1152 / heightPx))
  const maxDetailZoom = roundToThree(Math.max(fitZoomFor2k * 1.5, fitZoomFor2k + 0.5))
  const sourceArtifactId = String(adminFocusMaskLayer.artifact_id ?? 'east_han_tianxia_yutu_admin_focus_masks_v0_1')
  const maskPath = String(mask.path ?? '').trim()
  const tileId = `${normalizedStateId}_state_mask_lod0`

  const jumpTargets = mergeEastHanTianxiaYutuJumpTargets(readEastHanTianxiaYutuRuntimeTileManifestArtifact()?.jump_targets ?? [])
  const cityMarkers = buildEastHanAcceptedCityMarkers()
  const strategicNodes = [
    ...jumpTargets
      .filter((target) => String(target.state_id ?? '').trim() === normalizedStateId)
      .filter((target) => ['state_government', 'commandery_seat', 'gate'].includes(String(target.target_scope ?? '').trim()))
      .sort((left, right) => {
        const leftScope = String(left.target_scope ?? '').trim()
        const rightScope = String(right.target_scope ?? '').trim()
        const weight = (scope: string) => scope === 'gate' ? 0 : scope === 'state_government' ? 1 : scope === 'commandery_seat' ? 2 : 3
        return weight(leftScope) - weight(rightScope)
      })
      .slice(0, 8)
      .map((target, index) => {
        const cell = jsonRecordFrom(target.cell_1km)
        const scope = String(target.target_scope ?? '').trim()
        return {
          node_id: String(target.target_id ?? `${normalizedStateId}_${scope}_${index}`),
          node_type: stateDetailNodeTypeFromScope(scope),
          label: String(target.label ?? '').trim() || `${stateLabel}_${scope}_${index}`,
          administrative_role: (scope === 'state_government' ? 'state_government'
            : scope === 'commandery_seat' ? 'commandery_seat'
            : undefined) as 'state_government' | 'commandery_seat' | undefined,
          cell: {
            x: Math.round(Number(cell.x ?? 0)),
            y: Math.round(Number(cell.y ?? 0)),
          },
          lod_min_zoom: scope === 'gate' ? 1.1 : 0.9,
          priority: scope === 'state_government' ? 100 : scope === 'commandery_seat' ? 80 : 60,
          jump_target_id: String(target.target_id ?? '').trim() || undefined,
        }
      }),
    ...cityMarkers
      .filter((marker) => String(marker.state_id ?? '').trim() === normalizedStateId)
      .slice(0, 4)
      .map((marker, index) => {
        const cell = jsonRecordFrom(marker.cell_1km)
        const roles = stringArrayFrom(marker.roles)
        return {
          node_id: String(marker.marker_id ?? `${normalizedStateId}_city_${index}`),
          node_type: 'city' as const,
          label: String(marker.label ?? '').trim() || `${stateLabel}_city_${index}`,
          administrative_role: (roles.includes('state_government')
            ? 'state_government'
            : roles.includes('commandery_seat')
              ? 'commandery_seat'
              : 'city') as 'state_government' | 'commandery_seat' | 'city',
          cell: {
            x: Math.round(Number(cell.x ?? 0)),
            y: Math.round(Number(cell.y ?? 0)),
          },
          lod_min_zoom: 1.2,
          priority: 40,
          jump_target_id: undefined,
        }
      }),
  ]
  const uniqueNodes: WorldMapStateStrategicNode[] = Array.from(
    new Map(strategicNodes.map((node) => [node.node_id, node])).values(),
  )

  const anchorNode = uniqueNodes[0]
  const roads = anchorNode
    ? uniqueNodes.slice(1, 4).map((node, index) => ({
        road_id: `${normalizedStateId}_seed_road_${index + 1}`,
        road_class: node.node_type === 'gate' ? 'primary' as const : 'secondary' as const,
        source_artifact_id: 'east_han_state_detail_seed_from_jump_targets_v0_1',
        from_node_id: anchorNode.node_id,
        to_node_id: node.node_id,
        polyline_cells: [
          { x: anchorNode.cell.x, y: anchorNode.cell.y },
          { x: node.cell.x, y: node.cell.y },
        ],
        lod_min_zoom: 1.05,
        lod_max_zoom: maxDetailZoom,
        hit_radius_px: 18,
      }))
    : []

  const runtimeInput = {
    stateId: normalizedStateId,
    stateNameZh: stateLabel,
    coordinateSpace: EAST_HAN_LAYERED_COORDINATE_SPACE,
    sourceArtifactId,
    stateBoundsCells: { minX, minY, maxX, maxY },
    stateBoundsPx: { minX, minY, maxX, maxY },
    stateFitZoomFor2k: fitZoomFor2k,
    maxDetailZoom,
    tileLevels: [
      {
        lod: 0,
        width_px: widthPx,
        height_px: heightPx,
        tile_count: 1,
        nominal_zoom_min: roundToThree(Math.max(0.5, fitZoomFor2k * 0.5)),
        nominal_zoom_max: maxDetailZoom,
      },
    ],
    tiles: [
      {
        tile_id: tileId,
        lod: 0,
        x: minX,
        y: minY,
        width_px: widthPx,
        height_px: heightPx,
        asset_path: maskPath,
        cache_key: `${normalizedStateId}:${tileId}`,
      },
    ],
    roads,
    nodes: uniqueNodes,
    fallbackReason: roads.length > 0 ? 'seed_from_existing_jump_targets_and_city_markers' : 'state_mask_only_without_seed_roads',
  }

  return {
    state_detail_tiles: buildStateDetailTilesRuntime(runtimeInput),
    state_road_network: buildStateRoadNetworkRuntime(runtimeInput),
    state_strategic_nodes: buildStateStrategicNodesRuntime(runtimeInput),
  }
}

function selectNearestEastHanLayeredFrame(adapter: JsonRecord, centerX: number, centerY: number): JsonRecord {
  const frames = jsonRecordArrayFrom(adapter.sample_layered_viewport_responses)
  let selected = frames[0] ?? {}
  let selectedDistance = Number.POSITIVE_INFINITY

  for (const frame of frames) {
    const request = jsonRecordFrom(frame.godot_viewport_request)
    const sampleCenterX = Number(request.centerX)
    const sampleCenterY = Number(request.centerY)
    if (!Number.isFinite(sampleCenterX) || !Number.isFinite(sampleCenterY)) {
      continue
    }
    const distance = Math.hypot(sampleCenterX - centerX, sampleCenterY - centerY)
    if (distance < selectedDistance) {
      selected = frame
      selectedDistance = distance
    }
  }

  return selected
}

function buildEastHanLayeredViewportResponse(
  options: Extract<ResolvedWorldMapLayoutOptions, { scope: 'viewport' }>,
): WorldMapLayoutResponse {
  const adapter = readEastHanLayeredAdapterArtifact()
  if (!adapter) {
    const visibleCells = options.visibleSizeCells ?? options.visibleCells ?? EAST_HAN_LAYERED_DEFAULT_VISIBLE_SIZE_CELLS
    return buildCameraViewportLayoutChunk(
      options.centerX,
      options.centerY,
      visibleCells,
      options.preloadMarginCells,
      options.chunkSizeCells,
    )
  }

  const worldSize = eastHanLayeredWorldSize(adapter)
  const centerCell = {
    x: clampLayeredCenter(options.centerX, worldSize.width),
    y: clampLayeredCenter(options.centerY, worldSize.height),
  }
  const visibleCells = normalizePositiveSize(
    options.visibleSizeCells ?? options.visibleCells,
    EAST_HAN_LAYERED_DEFAULT_VISIBLE_SIZE_CELLS,
  )
  const preloadMarginCells = Math.max(
    0,
    Math.floor(options.preloadMarginCells ?? EAST_HAN_LAYERED_DEFAULT_PRELOAD_MARGIN_CELLS),
  )
  const chunkSizeCells = normalizePositiveSize(options.chunkSizeCells, EAST_HAN_LAYERED_DEFAULT_CHUNK_SIZE_CELLS)
  const visibleBoundsCells = clampExclusiveBoundsToWorld(
    buildCenteredExclusiveBounds(centerCell.x, centerCell.y, visibleCells),
    worldSize,
  )
  const preloadBoundsCells = clampExclusiveBoundsToWorld(
    expandExclusiveBounds(visibleBoundsCells, preloadMarginCells),
    worldSize,
  )
  const loadedChunkIds = buildEastHanLayeredChunkIds(preloadBoundsCells, chunkSizeCells)
  const clientLoadedChunkIds = normalizeEastHanLayeredChunkIds(options.loadedChunkIds)
  const loadedChunkIdSet = new Set(loadedChunkIds)
  const clientLoadedChunkIdSet = new Set(clientLoadedChunkIds)
  const newChunkIds = orderedDifference(loadedChunkIds, clientLoadedChunkIdSet)
  const retainedCacheChunkIds = orderedIntersection(loadedChunkIds, clientLoadedChunkIdSet)
  const unloadCandidateChunkIds = orderedDifference(clientLoadedChunkIds, loadedChunkIdSet)
  const nearestFrame = selectNearestEastHanLayeredFrame(adapter, centerCell.x, centerCell.y)
  const sampleChunkLayer = jsonRecordFrom(nearestFrame.chunk_layer)
  const sampleResourceLayer = jsonRecordFrom(nearestFrame.resource_overlay_layer)
  const sampleCityGateAnchorLayer = jsonRecordFrom(nearestFrame.city_gate_anchor_layer)
  const layerOrder = eastHanLayeredLayerOrder(adapter, options.includeLayers)
  const loadedProvinceIds = loadedChunkIds.slice(0, 48)
  const mountainBoundaryLayerResult = buildEastHanMainWorldMountainBoundaryLayer(preloadBoundsCells)
  const chokepointLayer = buildEastHanMainWorldChokepointLayer(preloadBoundsCells)
  const resourceObjectResult = buildEastHanEligibleResourceObjects(
    sampleResourceLayer,
    mountainBoundaryLayerResult.hardReservedCellKeys,
  )
  const resourceObjects = resourceObjectResult.objects
  const factionHomeCityAnchors = normalizeEastHanCityGatePrefabObjects(
    buildEastHanFactionHomeCityAnchorObjects(loadedChunkIds),
  )
  const cityGateVisibleObjects = mergeEastHanCityGateObjects(
    normalizeEastHanCityGatePrefabObjects(jsonRecordArrayFrom(sampleCityGateAnchorLayer.visible_objects)),
    factionHomeCityAnchors,
  )
  const cityGateRenderProjectionSamples = mergeEastHanCityGateObjects(
    normalizeEastHanCityGatePrefabObjects(jsonRecordArrayFrom(sampleCityGateAnchorLayer.render_projection_samples)),
    factionHomeCityAnchors,
  )

  const response: JsonRecord = {
    mapLayoutVersion,
    map: {
      ...worldMapLayout.map,
      width: worldSize.width,
      height: worldSize.height,
      tiles: [],
    },
    chunk: {
      scope: 'viewport',
      id: `${centerCell.x}_${centerCell.y}_${visibleCells.width}x${visibleCells.height}`,
      loadedProvinceIds,
      pendingProvinceIds: [],
      cameraViewport: {
        centerCell,
        visibleCells,
        preloadMarginCells,
        chunkSizeCells,
        visibleBoundsCells: {
          startX: visibleBoundsCells.startX,
          endX: visibleBoundsCells.endXExclusive - 1,
          startY: visibleBoundsCells.startY,
          endY: visibleBoundsCells.endYExclusive - 1,
        },
        preloadBoundsCells: {
          startX: preloadBoundsCells.startX,
          endX: preloadBoundsCells.endXExclusive - 1,
          startY: preloadBoundsCells.startY,
          endY: preloadBoundsCells.endYExclusive - 1,
        },
        loadedChunkIds,
      },
    },
    schema_version: EAST_HAN_LAYERED_SCHEMA_VERSION,
    world_id: EAST_HAN_LAYERED_WORLD_ID,
    coordinate_space: EAST_HAN_LAYERED_COORDINATE_SPACE,
    source_artifact_path: EAST_HAN_LAYERED_ADAPTER_ARTIFACT_PATH,
    layer_order: layerOrder,
    godot_viewport_request: {
      worldId: options.worldId ?? EAST_HAN_LAYERED_WORLD_ID,
      scope: 'viewport',
      centerX: centerCell.x,
      centerY: centerCell.y,
      visibleSizeCells: [visibleCells.width, visibleCells.height],
      preloadMarginCells,
      chunkSize: chunkSizeCells.width,
      includeLayers: layerOrder,
      coordinateSpace: options.coordinateSpace ?? EAST_HAN_LAYERED_COORDINATE_SPACE,
    },
    visible_bounds_cells: visibleBoundsCells,
    preload_bounds_cells: preloadBoundsCells,
    chunk_layer: {
      ...sampleChunkLayer,
      chunk_size_cells: [chunkSizeCells.width, chunkSizeCells.height],
      client_loaded_chunk_ids: clientLoadedChunkIds,
      client_loaded_chunk_count: clientLoadedChunkIds.length,
      loaded_chunk_ids: loadedChunkIds,
      loaded_chunk_count: loadedChunkIds.length,
      new_chunk_ids: newChunkIds,
      new_chunk_count: newChunkIds.length,
      retained_cache_chunk_ids: retainedCacheChunkIds,
      retained_cache_chunk_count: retainedCacheChunkIds.length,
      unload_candidate_chunk_ids: unloadCandidateChunkIds,
      unload_candidate_chunk_count: unloadCandidateChunkIds.length,
    },
    base_map_layer: {
      display_order: 0,
      source: 'real_map_data_1km',
      schema_version: 'east_han_main_world_substrate_chunk_texture_layer_v0_1',
      renderer_mode: 'chunk_texture_substrate',
      coordinate_space: EAST_HAN_LAYERED_COORDINATE_SPACE,
      projection: 'isometric_2_to_1_direct_cell_1km',
      projection_scaled_to_preview: false,
      preview_bridge_enabled: false,
      chunk_size_cells: [chunkSizeCells.width, chunkSizeCells.height],
      authority: 'index/chunk_index/chunks/rasters; not QA PNG',
      zero_level_ground_visual: {
        schema_version: 'world_substrate_zero_level_manifest_v1',
        object_mode: 'implicit_base_map',
        object_upsert_count: 0,
        asset_path: EAST_HAN_ZERO_LEVEL_SUBSTRATE_ASSET_PATH,
        manifest_path: EAST_HAN_ZERO_LEVEL_SUBSTRATE_MANIFEST_PATH,
        source_artifact: 'map_substrate_gridlocked_detail_v0_1',
        footprint_cells: [1, 1],
        draw_layer: 'base_map',
        draw_order: 0,
        usage_policy:
          'Drawn by the client for selectable zero-level land cells; resources, owner overrides, and city/gate anchors remain sparse overlay/object deltas.',
      },
      runtime_first_paint_policy: 'draw 1km substrate chunks first, then layer chunk deltas as they arrive',
      chunk_refs: buildEastHanChunkRefs(loadedChunkIds, 'real_map_data_1km'),
      substrate_chunk_textures: buildEastHanSubstrateChunkTextures(loadedChunkIds, chunkSizeCells, worldSize),
      substrate_chunk_texture_count: loadedChunkIds.length,
      client_authority: 'server_authoritative_chunk_texture_refs_client_draws_direct_1km_substrate',
    },
    main_world_cell_layer: buildEastHanMainWorldCellLayer(loadedChunkIds, chunkSizeCells, worldSize),
    derived_mask_layer: {
      display_order: 1,
      source: 'east_han_playability_maritime_derived_masks_v0_1',
      mask_refs: buildEastHanChunkRefs(loadedChunkIds, 'east_han_playability_maritime_derived_masks_v0_1'),
    },
    maritime_passability_layer: {
      display_order: 2,
      mask_source: 'east_han_playability_maritime_derived_masks_v0_1.maritime_navigation_mask_u8',
      maritime_object_upsert_count: 0,
      passability_refs: buildEastHanChunkRefs(loadedChunkIds, 'east_han_playability_maritime_derived_masks_v0_1'),
      sample_passability_chunks: loadedChunkIds.slice(0, 24),
    },
    resource_overlay_layer: {
      ...sampleResourceLayer,
      display_order: 3,
      zero_level_object_upsert_count: 0,
      maritime_object_upsert_count: 0,
      sample_resource_objects: resourceObjects,
      source_sample_resource_object_count: jsonRecordArrayFrom(sampleResourceLayer.sample_resource_objects).length,
      mountain_boundary_resource_exclusion: {
        ...mountainBoundaryLayerResult.resourceExclusionSummary,
        filtered_resource_object_count: resourceObjectResult.excludedCount,
      },
      generated_resource_upsert_count: positiveNumberFrom(
        sampleResourceLayer.generated_resource_upsert_count,
        resourceObjects.length,
      ),
    },
    city_gate_anchor_layer: {
      ...sampleCityGateAnchorLayer,
      display_order: 4,
      prefab_lod_policy: buildEastHanCityGatePrefabLodPolicy(),
      anchor_delta_source:
        factionHomeCityAnchors.length > 0
          ? 'accepted_city_gate_anchors_plus_world_faction_home_city'
          : 'accepted_city_gate_anchors',
      world_faction_home_city_anchor_count: factionHomeCityAnchors.length,
      visible_objects: cityGateVisibleObjects,
      render_projection_samples: cityGateRenderProjectionSamples,
      label_objects: jsonRecordArrayFrom(sampleCityGateAnchorLayer.label_objects),
    },
    main_world_mountain_boundary_layer: mountainBoundaryLayerResult.layer,
    main_world_chokepoint_layer: chokepointLayer,
    click_priority_formal_sample_layer: buildEastHanClickPriorityFormalSampleLayer(),
    cell_override_layer: buildEastHanCellOverrideLayer(loadedChunkIds),
    labels_layer: {
      display_order: 6,
      ...jsonRecordFrom(nearestFrame.labels_layer),
    },
    ...(layerOrder.includes(EAST_HAN_TIANXIA_YUTU_OVERVIEW_LAYER)
      ? {
          tianxia_yutu_overview_layer: buildEastHanTianxiaYutuOverviewLayer({
            scalePreset: options.tianxiaYutuScalePreset,
          }),
        }
      : {}),
    ...((options.stateDetailStateId &&
      (layerOrder.includes(EAST_HAN_STATE_DETAIL_TILES_LAYER) ||
        layerOrder.includes(EAST_HAN_STATE_ROAD_NETWORK_LAYER) ||
        layerOrder.includes(EAST_HAN_STATE_STRATEGIC_NODES_LAYER)))
      ? buildEastHanStateDetailRuntimeLayers(options.stateDetailStateId) ?? {}
      : {}),
  }

  return response as unknown as WorldMapLayoutResponse
}

function buildCameraViewportLayoutChunk(
  centerX: number,
  centerY: number,
  visibleCellsInput: CellSize,
  preloadMarginCellsInput: number | undefined,
  chunkSizeCellsInput: CellSize | undefined,
): WorldMapLayoutResponse {
  const centerCell = {
    x: clampGridCoordinate(centerX, worldMapLayout.map.width),
    y: clampGridCoordinate(centerY, worldMapLayout.map.height),
  }
  const visibleCells = normalizePositiveSize(visibleCellsInput, { width: 10, height: 10 })
  const preloadMarginCells = Math.max(0, Math.floor(preloadMarginCellsInput ?? 2))
  const chunkSizeCells = normalizePositiveSize(chunkSizeCellsInput, { width: 16, height: 16 })
  const visibleBoundsCells = clampBoundsToWorld(buildCenteredBounds(centerCell.x, centerCell.y, visibleCells))
  const preloadBoundsCells = clampBoundsToWorld(expandBounds(visibleBoundsCells, preloadMarginCells))
  const tileIds = new Set(
    worldMapLayout.map.tiles
      .filter(
        (tile) =>
          tile.x >= preloadBoundsCells.startX &&
          tile.x <= preloadBoundsCells.endX &&
          tile.y >= preloadBoundsCells.startY &&
          tile.y <= preloadBoundsCells.endY,
      )
      .map((tile) => tile.id),
  )
  const loadedProvinceIds = listProvinceIds(worldMapLayout.map.tiles.filter((tile) => tileIds.has(tile.id)))
  const loadedProvinceSet = new Set(loadedProvinceIds)

  return {
    mapLayoutVersion,
    map: buildLayoutChunkByTileIds(worldMapLayout.map, tileIds),
    chunk: {
      scope: 'viewport',
      id: `${centerCell.x}_${centerCell.y}_${visibleCells.width}x${visibleCells.height}`,
      loadedProvinceIds,
      pendingProvinceIds: listProvinceIds(worldMapLayout.map.tiles).filter((id) => !loadedProvinceSet.has(id)),
      cameraViewport: {
        centerCell,
        visibleCells,
        preloadMarginCells,
        chunkSizeCells,
        visibleBoundsCells,
        preloadBoundsCells,
        loadedChunkIds: buildLoadedChunkIds(preloadBoundsCells, chunkSizeCells),
      },
    },
  }
}

function buildProvinceLayoutChunk(provinceIdRaw: string): WorldMapLayoutResponse {
  const provinceId = provinceIdRaw.trim().toLowerCase()
  const tileIds = new Set<string>()

  for (const tile of worldMapLayout.map.tiles) {
    if ((tile.district ?? '').trim().toLowerCase() === provinceId) {
      tileIds.add(tile.id)
    }
  }

  const loadedProvinceIds = tileIds.size > 0 ? [provinceId] : []
  const pendingProvinceIds = listProvinceIds(worldMapLayout.map.tiles).filter((id) => !loadedProvinceIds.includes(id))

  return {
    mapLayoutVersion,
    map: buildLayoutChunkByTileIds(worldMapLayout.map, tileIds),
    chunk: {
      scope: 'province',
      id: provinceId,
      loadedProvinceIds,
      pendingProvinceIds,
    },
  }
}

function buildRegionLayoutChunk(regionIdRaw: string): WorldMapLayoutResponse {
  const regionId = regionIdRaw.trim()
  const region = worldMapLayout.map.regions.find((item) => item.id === regionId)

  if (!region) {
    return buildBootstrapLayoutChunk()
  }

  const tileIds = new Set<string>(region.tileIds)
  const loadedProvinceIds = listProvinceIds(worldMapLayout.map.tiles.filter((tile) => tileIds.has(tile.id)))
  const pendingProvinceIds = listProvinceIds(worldMapLayout.map.tiles).filter((id) => !loadedProvinceIds.includes(id))

  return {
    mapLayoutVersion,
    map: buildLayoutChunkByTileIds(worldMapLayout.map, tileIds),
    chunk: {
      scope: 'region',
      id: region.id,
      loadedProvinceIds,
      pendingProvinceIds,
    },
  }
}

function buildViewportLayoutChunk(
  centerX: number,
  centerY: number,
  layer: MapHierarchyLayer,
  visibleCells?: CellSize,
  preloadMarginCells?: number,
  chunkSizeCells?: CellSize,
): WorldMapLayoutResponse {
  if (visibleCells) {
    return buildCameraViewportLayoutChunk(centerX, centerY, visibleCells, preloadMarginCells, chunkSizeCells)
  }

  const target = resolveViewportScopeFromCenter(centerX, centerY, layer)

  if (target.scope === 'region') {
    const chunk = buildRegionLayoutChunk(target.regionId)
    return {
      ...chunk,
      chunk: {
        ...(chunk.chunk ?? {
          scope: 'region',
          loadedProvinceIds: [],
        }),
        scope: 'viewport',
        id: target.regionId,
      },
    }
  }

  if (target.scope === 'province') {
    const chunk = buildProvinceLayoutChunk(target.provinceId)
    return {
      ...chunk,
      chunk: {
        ...(chunk.chunk ?? {
          scope: 'province',
          loadedProvinceIds: [],
        }),
        scope: 'viewport',
        id: target.provinceId,
      },
    }
  }

  const bootstrap = buildBootstrapLayoutChunk()
  return {
    ...bootstrap,
    chunk: {
      ...(bootstrap.chunk ?? {
        scope: 'bootstrap',
        loadedProvinceIds: [],
      }),
      scope: 'viewport',
    },
  }
}

function buildBootstrapLayoutChunk(): WorldMapLayoutResponse {
  const loadedProvinceIds = resolveBootstrapProvinceIds(worldMapLayout.map, worldState)
  const provinceSet = new Set(loadedProvinceIds)
  const tileIds = new Set<string>()

  for (const tile of worldMapLayout.map.tiles) {
    if (tile.district && provinceSet.has(tile.district)) {
      tileIds.add(tile.id)
    }
  }

  return {
    mapLayoutVersion,
    map: buildLayoutChunkByTileIds(worldMapLayout.map, tileIds),
    chunk: {
      scope: 'bootstrap',
      loadedProvinceIds,
      pendingProvinceIds: listProvinceIds(worldMapLayout.map.tiles).filter((id) => !provinceSet.has(id)),
    },
  }
}

function extractTileStates(world: WorldState): WorldMapTileState[] {
  return world.map.tiles.map((tile) => ({
    id: tile.id,
    owner: tile.owner,
    enemyPressure: tile.enemyPressure,
  }))
}

type IntelPayload = {
  mode: 'full' | 'delta'
  baseWorldVersion?: number
  intelByTileId: WorldState['intel']
}

function buildWorldSummary(
  world: WorldState,
  tileStates: WorldMapTileState[],
  tileStateMode: 'full' | 'delta',
  intelPayload: IntelPayload,
  options: ResolvedWorldSummaryOptions,
  baseWorldVersion?: number,
): WorldSummary {
  const { map, history, ...worldWithoutMap } = world
  void map

  const summaryHistory = {
    planningJobs: structuredClone(history.planningJobs.slice(0, options.planningHistoryLimit)),
    executionReplays: structuredClone(
      history.executionReplays.slice(0, options.replayLimit).map((replay) => {
        const trimmedFrames = replay.frames.slice(
          Math.max(0, replay.frames.length - options.replayFrameLimit),
        )

        return {
          ...replay,
          frames: trimmedFrames,
        }
      }),
    ),
  }

  return {
    ...structuredClone(worldWithoutMap),
    intel: structuredClone(intelPayload.intelByTileId),
    intelSyncMode: intelPayload.mode,
    intelBaseWorldVersion: intelPayload.baseWorldVersion,
    history: summaryHistory,
    map: {
      width: world.map.width,
      height: world.map.height,
      mapLayoutVersion,
      tileStateMode,
      baseWorldVersion,
      tileStates: structuredClone(tileStates),
      resourceGeneration: world.map.resourceGeneration
        ? structuredClone(world.map.resourceGeneration)
        : undefined,
    },
  }
}

function buildSparseIntel(intelByTileId: WorldState['intel']): WorldState['intel'] {
  const sparseIntel: WorldState['intel'] = {}

  for (const [tileId, intel] of Object.entries(intelByTileId)) {
    if (intel.level === 'unknown') {
      continue
    }

    sparseIntel[tileId] = optionsToSparseIntel(intel)
  }

  return sparseIntel
}

function resolveWorldSummaryOptions(options?: WorldSummaryOptions): ResolvedWorldSummaryOptions {
  const sinceWorldVersion =
    typeof options?.sinceWorldVersion === 'number' && Number.isFinite(options.sinceWorldVersion)
      ? Math.max(0, Math.floor(options.sinceWorldVersion))
      : undefined

  return {
    sinceWorldVersion,
    planningHistoryLimit: clampLimit(
      options?.planningHistoryLimit,
      DEFAULT_SUMMARY_PLANNING_HISTORY_LIMIT,
      MAX_SUMMARY_PLANNING_HISTORY_LIMIT,
    ),
    replayLimit: clampLimit(options?.replayLimit, DEFAULT_SUMMARY_REPLAY_LIMIT, MAX_SUMMARY_REPLAY_LIMIT),
    replayFrameLimit: clampLimit(
      options?.replayFrameLimit,
      DEFAULT_SUMMARY_REPLAY_FRAME_LIMIT,
      MAX_SUMMARY_REPLAY_FRAME_LIMIT,
    ),
    intelMode: options?.intelMode === 'full' ? 'full' : 'sparse',
  }
}

function clampLimit(value: number | undefined, fallback: number, upperBound: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(1, Math.min(upperBound, Math.floor(value)))
}

function resolveIntelPayload(options: ResolvedWorldSummaryOptions): IntelPayload {
  if (options.intelMode === 'full') {
    return {
      mode: 'full',
      intelByTileId: structuredClone(worldState.intel),
    }
  }

  const sparseIntel = buildSparseIntel(worldState.intel)
  const sinceWorldVersion = options.sinceWorldVersion

  if (sinceWorldVersion === undefined) {
    return {
      mode: 'full',
      intelByTileId: sparseIntel,
    }
  }

  if (sinceWorldVersion === worldState.worldVersion) {
    return {
      mode: 'delta',
      baseWorldVersion: sinceWorldVersion,
      intelByTileId: {},
    }
  }

  if (sinceWorldVersion >= 0 && sinceWorldVersion < worldState.worldVersion) {
    const delta = collectIntelDelta(sinceWorldVersion, worldState.worldVersion)
    if (delta) {
      return {
        mode: 'delta',
        baseWorldVersion: sinceWorldVersion,
        intelByTileId: delta,
      }
    }
  }

  return {
    mode: 'full',
    intelByTileId: sparseIntel,
  }
}

function collectIntelDelta(fromWorldVersion: number, toWorldVersion: number): WorldState['intel'] | null {
  if (fromWorldVersion >= toWorldVersion) {
    return {}
  }

  const mergedByTileId: WorldState['intel'] = {}

  for (let worldVersion = fromWorldVersion + 1; worldVersion <= toWorldVersion; worldVersion += 1) {
    const diff = intelDiffByVersion.get(worldVersion)
    if (!diff) {
      return null
    }

    for (const [tileId, intel] of Object.entries(diff)) {
      mergedByTileId[tileId] = intel
    }
  }

  return mergedByTileId
}

function resolveTileStatePayload(sinceWorldVersion?: number): {
  mode: 'full' | 'delta'
  baseWorldVersion?: number
  tileStates: WorldMapTileState[]
} {
  const currentWorldVersion = worldState.worldVersion
  const normalizedSince =
    typeof sinceWorldVersion === 'number' && Number.isFinite(sinceWorldVersion)
      ? Math.floor(sinceWorldVersion)
      : undefined

  if (normalizedSince !== undefined) {
    if (normalizedSince === currentWorldVersion) {
      return {
        mode: 'delta',
        baseWorldVersion: normalizedSince,
        tileStates: [],
      }
    }

    if (normalizedSince >= 0 && normalizedSince < currentWorldVersion) {
      const delta = collectTileStateDelta(normalizedSince, currentWorldVersion)
      if (delta) {
        return {
          mode: 'delta',
          baseWorldVersion: normalizedSince,
          tileStates: delta,
        }
      }
    }
  }

  return {
    mode: 'full',
    tileStates: extractTileStates(worldState),
  }
}

function collectTileStateDelta(fromWorldVersion: number, toWorldVersion: number): WorldMapTileState[] | null {
  if (fromWorldVersion >= toWorldVersion) {
    return []
  }

  const mergedByTileId = new Map<string, WorldMapTileState>()

  for (let worldVersion = fromWorldVersion + 1; worldVersion <= toWorldVersion; worldVersion += 1) {
    const diff = tileStateDiffByVersion.get(worldVersion)
    if (!diff) {
      return null
    }

    for (const tileState of diff) {
      mergedByTileId.set(tileState.id, tileState)
    }
  }

  return Array.from(mergedByTileId.values())
}

function recordTileStateDiff(previousWorld: WorldState, nextWorld: WorldState) {
  if (nextWorld.worldVersion <= previousWorld.worldVersion) {
    tileStateDiffByVersion.clear()
    return
  }

  const previousTiles = previousWorld.map.tiles
  const nextTiles = nextWorld.map.tiles

  let diff: WorldMapTileState[] = []

  if (previousTiles.length !== nextTiles.length) {
    diff = extractTileStates(nextWorld)
  } else {
    for (let index = 0; index < nextTiles.length; index += 1) {
      const previousTile = previousTiles[index]
      const nextTile = nextTiles[index]

      if (!previousTile || previousTile.id !== nextTile.id) {
        diff = extractTileStates(nextWorld)
        break
      }

      if (previousTile.owner !== nextTile.owner || previousTile.enemyPressure !== nextTile.enemyPressure) {
        diff.push({
          id: nextTile.id,
          owner: nextTile.owner,
          enemyPressure: nextTile.enemyPressure,
        })
      }
    }
  }

  tileStateDiffByVersion.set(nextWorld.worldVersion, diff)
  trimTileStateDiffHistory()
}

function trimTileStateDiffHistory() {
  if (tileStateDiffByVersion.size <= MAX_TILE_STATE_DIFF_HISTORY) {
    return
  }

  const sortedVersions = Array.from(tileStateDiffByVersion.keys()).sort((left, right) => left - right)
  while (sortedVersions.length > MAX_TILE_STATE_DIFF_HISTORY) {
    const oldest = sortedVersions.shift()
    if (oldest === undefined) {
      break
    }
    tileStateDiffByVersion.delete(oldest)
  }
}


function recordIntelDiff(
  previousWorld: WorldState,
  nextWorld: WorldState,
  subphases?: AiRuntimeAdvanceTickSubphaseTiming[],
) {
  if (nextWorld.worldVersion <= previousWorld.worldVersion) {
    intelDiffByVersion.clear()
    return
  }

  const diff: WorldState['intel'] = {}
  const previousIntelByTileId = previousWorld.intel
  const nextIntelByTileId = nextWorld.intel

  recordAdvanceTickSubphaseSync(
    subphases,
    'advance_world_state.commit_world_state.record_intel_diff.scan_next_intel',
    () => {
      const changedEntries: Array<readonly [string, WorldState['intel'][string]]> = []
      recordAdvanceTickSubphaseSync(
        subphases,
        'advance_world_state.commit_world_state.record_intel_diff.scan_next_intel.compare_entries',
        () => {
          recordAdvanceTickSubphaseSync(
            subphases,
            'advance_world_state.commit_world_state.record_intel_diff.scan_next_intel.compare_entries.iterate_next_entries',
            () => {
              for (const tileId in nextIntelByTileId) {
                const nextIntel = nextIntelByTileId[tileId]
                if (!nextIntel) {
                  continue
                }
                const previousIntel = previousIntelByTileId[tileId]
                if (previousIntel === nextIntel) {
                  continue
                }
                const changed =
                  !previousIntel ||
                  previousIntel.level !== nextIntel.level ||
                  previousIntel.lastScoutedTick !== nextIntel.lastScoutedTick ||
                  previousIntel.summary !== nextIntel.summary

                if (changed) {
                  changedEntries.push([tileId, nextIntel] as const)
                }
              }
            },
          )
        },
      )
      recordAdvanceTickSubphaseSync(
        subphases,
        'advance_world_state.commit_world_state.record_intel_diff.scan_next_intel.encode_sparse_updates',
        () => {
          for (const [tileId, nextIntel] of changedEntries) {
            diff[tileId] = optionsToSparseIntel(nextIntel)
          }
        },
      )
    },
  )

  recordAdvanceTickSubphaseSync(
    subphases,
    'advance_world_state.commit_world_state.record_intel_diff.scan_removed_intel',
    () => {
      recordAdvanceTickSubphaseSync(
        subphases,
        'advance_world_state.commit_world_state.record_intel_diff.scan_removed_intel.iterate_previous_entries',
        () => {
          for (const tileId in previousIntelByTileId) {
            if (!(tileId in nextIntelByTileId)) {
              diff[tileId] = {
                level: 'unknown',
              }
            }
          }
        },
      )
    },
  )

  recordAdvanceTickSubphaseSync(
    subphases,
    'advance_world_state.commit_world_state.record_intel_diff.persist_diff',
    () => {
      recordAdvanceTickSubphaseSync(
        subphases,
        'advance_world_state.commit_world_state.record_intel_diff.persist_diff.store_version_entry',
        () => {
          intelDiffByVersion.set(nextWorld.worldVersion, diff)
        },
      )
      recordAdvanceTickSubphaseSync(
        subphases,
        'advance_world_state.commit_world_state.record_intel_diff.persist_diff.trim_history',
        () => {
          trimIntelDiffHistory()
        },
      )
    },
  )
}

function optionsToSparseIntel(intel: WorldState['intel'][string]): WorldState['intel'][string] {
  if (intel.level === 'unknown') {
    return {
      level: 'unknown',
      lastScoutedTick: intel.lastScoutedTick,
    }
  }

  const sparseIntel: WorldState['intel'][string] = {
    level: intel.level,
    lastScoutedTick: intel.lastScoutedTick,
  }

  if (intel.level === 'confirmed' && intel.summary) {
    sparseIntel.summary = intel.summary
  }

  return sparseIntel
}

function trimIntelDiffHistory() {
  if (intelDiffByVersion.size <= MAX_INTEL_DIFF_HISTORY) {
    return
  }

  while (intelDiffByVersion.size > MAX_INTEL_DIFF_HISTORY) {
    const oldest = intelDiffByVersion.keys().next().value
    if (oldest === undefined) {
      break
    }

    intelDiffByVersion.delete(oldest)
  }
}

function appendWorldEvent(params: {
  category: WorldEventRecord['category']
  action: string
  success: boolean
  tick: number
  worldVersion: number
  requestId?: string
  message?: string
  metadata?: Record<string, unknown>
}) {
  worldEvents.unshift({
    id: randomUUID(),
    category: params.category,
    action: params.action,
    success: params.success,
    tick: params.tick,
    worldVersion: params.worldVersion,
    createdAt: new Date().toISOString(),
    requestId: params.requestId,
    message: params.message,
    metadata: params.metadata,
  })

  if (worldEvents.length > MAX_WORLD_EVENTS) {
    worldEvents.splice(MAX_WORLD_EVENTS)
  }
}

export async function flushNarrativePersist() {
  await flushNarrativePersistFromPersistence()
}

export async function flushGovernancePersist() {
  await Promise.all([
    flushCourtSessionPersist(),
    flushCivilMemoryPersist(),
    flushTacticalSkillPersist(),
  ])
}

/** 供仿真环境（runMultiFactionSimulation）调用：将 ReflectService 生成的叙事事件写入全局叙事流 */
export function recordSimulationNarrativeEvents(events: NarrativeEvent[]): void {
  recordSimulationNarrativeEventsFromPersistence(events)
}

function refreshReplayArchive() {
  const now = new Date().toISOString()
  const previousArchive = new Map(replayArchive)
  const refreshed = new Map<string, ReplayArchiveEntry>()

  for (const replay of worldState.history.executionReplays) {
    const current = previousArchive.get(replay.requestId)
    refreshed.set(replay.requestId, {
      requestId: replay.requestId,
      source: replay.source,
      strategicCommand: replay.strategicCommand,
      basedOnWorldVersion: replay.basedOnWorldVersion,
      outcome: replay.outcome,
      frameCount: replay.frames.length,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    })
  }

  const entries = Array.from(refreshed.values()).sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0,
  )

  replayArchive.clear()
  for (const entry of entries.slice(0, MAX_REPLAY_ARCHIVE)) {
    replayArchive.set(entry.requestId, entry)
  }
}

function loadPersistedSaveSlots() {
  saveSlotsLoaded = true
  try {
    if (!existsSync(SAVE_SLOTS_PERSIST_PATH)) {
      return
    }

    const raw = readFileSync(SAVE_SLOTS_PERSIST_PATH, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    const persistedSlots = extractPersistedSaveSlots(parsed)
    if (persistedSlots.length === 0) {
      return
    }

    for (const slot of persistedSlots) {
      try {
        const normalizedSlotId = normalizeSlotId(slot.record.slotId)
        saveSlots.set(normalizedSlotId, {
          record: {
            ...slot.record,
            slotId: normalizedSlotId,
          },
          world: structuredClone(slot.world),
        })
      } catch {
        // drop malformed slot
      }
    }

    trimSaveSlots()
    saveSlotsRestoredSlotCount = saveSlots.size
    saveSlotsLastRestoreAt = Date.now()
    console.log(`[WorldService] restored ${saveSlots.size} save slots from disk`)
  } catch {
    const quarantinePath = `${SAVE_SLOTS_PERSIST_PATH}.corrupt.${Date.now()}`
    try {
      renameSync(SAVE_SLOTS_PERSIST_PATH, quarantinePath)
      saveSlotsCorruptQuarantineCount += 1
      saveSlotsLastCorruptQuarantineAt = Date.now()
      console.warn(`[WorldService] save-slot persistence parse failed; quarantined -> ${quarantinePath}`)
    } catch {
      console.warn('[WorldService] save-slot persistence parse failed; quarantine skipped')
    }
  }
}

function extractPersistedSaveSlots(raw: unknown): SaveSlotState[] {
  if (Array.isArray(raw)) {
    return raw.filter(isSaveSlotStateLike)
  }

  if (typeof raw !== 'object' || raw === null) {
    return []
  }

  const payload = raw as Partial<PersistedSaveSlotsPayload>
  if (!Array.isArray(payload.slots)) {
    return []
  }

  return payload.slots.filter(isSaveSlotStateLike)
}

function isSaveSlotStateLike(value: unknown): value is SaveSlotState {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = (value as { record?: unknown }).record
  const world = (value as { world?: unknown }).world
  if (typeof record !== 'object' || record === null || typeof world !== 'object' || world === null) {
    return false
  }

  const slotId = (record as { slotId?: unknown }).slotId
  const tick = (record as { tick?: unknown }).tick
  const worldTick = (world as { tick?: unknown }).tick
  return typeof slotId === 'string' && typeof tick === 'number' && typeof worldTick === 'number'
}

function isFsErrorCode(error: unknown, code: string) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === code
}

function listSaveSlotsArchiveFiles() {
  if (!existsSync(SAVE_SLOTS_ARCHIVE_DIR)) {
    return [] as SaveSlotsArchiveFile[]
  }

  const entries = readdirSync(SAVE_SLOTS_ARCHIVE_DIR, { withFileTypes: true })
  const files: SaveSlotsArchiveFile[] = []
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue
    }

    if (!entry.name.startsWith(`${SAVE_SLOTS_ARCHIVE_BASENAME}.`) || !entry.name.endsWith('.json.gz')) {
      continue
    }

    const archivePath = join(SAVE_SLOTS_ARCHIVE_DIR, entry.name)
    try {
      const stats = statSync(archivePath)
      files.push({ path: archivePath, mtimeMs: stats.mtimeMs, sizeBytes: stats.size })
    } catch {
      // ignore stat failure for partially-created archive file
    }
  }

  files.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return files
}

function refreshSaveSlotsArchiveFileCount() {
  try {
    saveSlotsArchiveFileCount = listSaveSlotsArchiveFiles().length
  } catch {
    saveSlotsArchiveFileCount = 0
  }
}

function pruneSaveSlotsArchiveFiles() {
  const files = listSaveSlotsArchiveFiles()
  if (files.length <= SAVE_SLOTS_ARCHIVE_MAX_FILES) {
    saveSlotsArchiveFileCount = files.length
    return
  }

  for (const item of files.slice(SAVE_SLOTS_ARCHIVE_MAX_FILES)) {
    try {
      unlinkSync(item.path)
    } catch {
      // ignore cleanup failure, surfaced by archiveFileCount drift on next health snapshot
    }
  }

  refreshSaveSlotsArchiveFileCount()
}

async function archiveSaveSlotsPersistFileIfNeeded(fileSizeBytes: number) {
  if (!SAVE_SLOTS_ARCHIVE_ON_SOFT_LIMIT || fileSizeBytes < SAVE_SLOTS_SOFT_LIMIT_BYTES) {
    return
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const archivePath = join(SAVE_SLOTS_ARCHIVE_DIR, `${SAVE_SLOTS_ARCHIVE_BASENAME}.${stamp}.json.gz`)

  try {
    mkdirSync(SAVE_SLOTS_ARCHIVE_DIR, { recursive: true })
    await pipeline(createReadStream(SAVE_SLOTS_PERSIST_PATH), createGzip({ level: 6 }), createWriteStream(archivePath))
    saveSlotsArchiveSuccessCount += 1
    saveSlotsLastArchiveAt = Date.now()
    saveSlotsLastArchivePath = archivePath
    pruneSaveSlotsArchiveFiles()
  } catch (error) {
    saveSlotsArchiveFailureCount += 1
    saveSlotsLastArchiveErrorAt = Date.now()
    console.warn(
      '[WorldService] save-slot archive write failed:',
      error instanceof Error ? error.message : error,
    )
  } finally {
    refreshSaveSlotsArchiveFileCount()
  }
}

function tryAcquireSaveSlotsPersistLock() {
  mkdirSync(dirname(SAVE_SLOTS_LOCK_PATH), { recursive: true })

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const lockToken = `${process.pid}:${Date.now()}:${randomUUID()}`
      const fd = openSync(SAVE_SLOTS_LOCK_PATH, 'wx')
      writeFileSync(fd, lockToken, 'utf8')
      closeSync(fd)
      return lockToken
    } catch (error) {
      if (!isFsErrorCode(error, 'EEXIST')) {
        saveSlotsPersistLockFailureCount += 1
        console.warn(
          '[WorldService] save-slot lock acquire failed:',
          error instanceof Error ? error.message : error,
        )
        return null
      }

      const now = Date.now()
      let lockAgeMs = 0
      try {
        const stats = statSync(SAVE_SLOTS_LOCK_PATH)
        lockAgeMs = Math.max(0, now - stats.mtimeMs)
      } catch (statError) {
        if (isFsErrorCode(statError, 'ENOENT')) {
          continue
        }
        saveSlotsPersistLockFailureCount += 1
        console.warn(
          '[WorldService] save-slot lock stat failed:',
          statError instanceof Error ? statError.message : statError,
        )
        return null
      }

      if (lockAgeMs < SAVE_SLOTS_LOCK_STALE_MS) {
        saveSlotsPersistLockContentionCount += 1
        return null
      }

      const stalePath = `${SAVE_SLOTS_LOCK_PATH}.stale.${now}`
      try {
        renameSync(SAVE_SLOTS_LOCK_PATH, stalePath)
        saveSlotsPersistLockStealCount += 1
      } catch (renameError) {
        if (isFsErrorCode(renameError, 'ENOENT')) {
          continue
        }
        saveSlotsPersistLockFailureCount += 1
        console.warn(
          '[WorldService] save-slot stale lock quarantine failed:',
          renameError instanceof Error ? renameError.message : renameError,
        )
        return null
      }
    }
  }

  saveSlotsPersistLockContentionCount += 1
  return null
}

function releaseSaveSlotsPersistLock(lockToken: string | null) {
  if (!lockToken) {
    return
  }

  try {
    if (!existsSync(SAVE_SLOTS_LOCK_PATH)) {
      return
    }

    const currentToken = readFileSync(SAVE_SLOTS_LOCK_PATH, 'utf8').trim()
    if (currentToken !== lockToken) {
      return
    }
  } catch (error) {
    if (!isFsErrorCode(error, 'ENOENT')) {
      saveSlotsPersistLockFailureCount += 1
      console.warn(
        '[WorldService] save-slot lock verify failed:',
        error instanceof Error ? error.message : error,
      )
    }
    return
  }

  try {
    unlinkSync(SAVE_SLOTS_LOCK_PATH)
  } catch (error) {
    if (!isFsErrorCode(error, 'ENOENT')) {
      saveSlotsPersistLockFailureCount += 1
      console.warn(
        '[WorldService] save-slot lock release failed:',
        error instanceof Error ? error.message : error,
      )
    }
  }
}

function scheduleSaveSlotsPersist() {
  saveSlotsPersistDirty = true
  if (saveSlotsPersistTimer || saveSlotsPersistInFlight) {
    return
  }

  saveSlotsPersistTimer = setTimeout(() => {
    saveSlotsPersistTimer = null
    void persistSaveSlotsNow()
  }, SAVE_SLOTS_PERSIST_DEBOUNCE_MS)
}

function buildSaveSlotsPersistPayload(): PersistedSaveSlotsPayload {
  const slots = Array.from(saveSlots.values()).sort((a, b) =>
    a.record.savedAt < b.record.savedAt ? 1 : a.record.savedAt > b.record.savedAt ? -1 : 0,
  )

  return {
    version: SAVE_SLOTS_PERSIST_VERSION,
    savedAt: Date.now(),
    slots: structuredClone(slots),
  }
}

async function persistSaveSlotsNow() {
  if (!saveSlotsPersistDirty || saveSlotsPersistInFlight) {
    return
  }

  saveSlotsPersistDirty = false
  saveSlotsPersistInFlight = true
  const payload = buildSaveSlotsPersistPayload()
  const serializedPayload = JSON.stringify(payload, null, 2)
  const dir = dirname(SAVE_SLOTS_PERSIST_PATH)
  const tempPath = `${SAVE_SLOTS_PERSIST_PATH}.tmp`
  const lockToken = tryAcquireSaveSlotsPersistLock()

  try {
    if (!lockToken) {
      saveSlotsPersistDirty = true
      return
    }

    mkdirSync(dir, { recursive: true })
    await writeFile(tempPath, serializedPayload, 'utf8')
    renameSync(tempPath, SAVE_SLOTS_PERSIST_PATH)
    saveSlotsPersistSuccessCount += 1
    saveSlotsLastPersistAt = Date.now()
    await archiveSaveSlotsPersistFileIfNeeded(Buffer.byteLength(serializedPayload, 'utf8'))
  } catch (error) {
    saveSlotsPersistDirty = true
    saveSlotsPersistFailureCount += 1
    saveSlotsLastPersistErrorAt = Date.now()
    try {
      if (existsSync(tempPath)) {
        renameSync(tempPath, `${tempPath}.failed.${Date.now()}`)
      }
    } catch {
      // ignore temp cleanup failures
    }
    console.warn(
      '[WorldService] save-slot persistence write failed:',
      error instanceof Error ? error.message : error,
    )
  } finally {
    releaseSaveSlotsPersistLock(lockToken)
    saveSlotsPersistInFlight = false
    if (saveSlotsPersistDirty && !saveSlotsPersistTimer) {
      saveSlotsPersistTimer = setTimeout(() => {
        saveSlotsPersistTimer = null
        void persistSaveSlotsNow()
      }, SAVE_SLOTS_PERSIST_DEBOUNCE_MS)
    }
  }
}

export async function flushSaveSlotsPersist() {
  if (saveSlotsPersistTimer) {
    clearTimeout(saveSlotsPersistTimer)
    saveSlotsPersistTimer = null
  }

  if (saveSlotsPersistDirty && !saveSlotsPersistInFlight) {
    await persistSaveSlotsNow()
  }

  while (saveSlotsPersistInFlight) {
    await new Promise((resolve) => setTimeout(resolve, 20))
  }

  if (saveSlotsPersistDirty) {
    await persistSaveSlotsNow()
    while (saveSlotsPersistInFlight) {
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  }
}

function normalizeGeneralConcurrency(value?: number) {
  const normalized = typeof value === 'number' && Number.isFinite(value) ? value : 4
  return Math.max(1, Math.min(32, Math.round(normalized)))
}

function trimSaveSlots() {
  if (saveSlots.size <= MAX_SAVE_SLOTS) {
    return
  }

  const ordered = Array.from(saveSlots.values()).sort((a, b) =>
    a.record.savedAt < b.record.savedAt ? 1 : a.record.savedAt > b.record.savedAt ? -1 : 0,
  )

  saveSlots.clear()
  for (const item of ordered.slice(0, MAX_SAVE_SLOTS)) {
    saveSlots.set(item.record.slotId, item)
  }
}

function normalizeSlotId(rawSlotId: string) {
  const normalized = rawSlotId.trim().toLowerCase()
  if (!normalized || !/^[a-z0-9_-]{1,32}$/.test(normalized)) {
    throw new Error('slotId must match ^[a-z0-9_-]{1,32}$')
  }

  return normalized
}
