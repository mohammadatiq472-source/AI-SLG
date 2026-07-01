import { performance } from 'node:perf_hooks'
import { getHeroPoolEntryById, buildHeroProfileFromPoolId } from './heroPool'
import { findPath as hpaStarFindPath } from './hpaStar'
import { runAllianceDirector } from './allianceDirector'
import { runOpposingDirectorDetailed } from './enemyDirector'
import { buildTheaterSnapshot } from './theater'
import { syncAllFactionAiQuota } from './aiQuota'
import { buildUnitsByFaction, computeAllFactionFoodIncomes, getTileByIdFast, partitionTiles } from './worldIndex'
import { updateLuoyangHoldCounters, checkVictoryConditions } from './victoryCondition'
import { processProvincePve } from './provincePve'
import {
  getLuoyangDefenseBonus,
  processSiegeDecay,
} from './luoyangEndgame'
import { resolveCitySiegeDurability } from './cityDurability'
import { computeResourceIncome } from './resources'
import { createInitialSeasonScenarioState, getScenarioScriptByIdAndVersion } from './worldAffairs'
import { createInitialSeasonTaskState, getScenarioTaskCatalogByIdAndVersion } from './worldTasks'
import { actionLabel, allianceStanceLabel, ownerLabel, templateLabel } from './ruleLabels'
import {
  NPC_GUARD_UNIT_TEMPLATES,
  buildNpcGuardUnitsForResourceTile,
  resolveNpcGuardOrdinarySkills,
  resolveResourceGuardTemplateForTile,
  summarizeResourceGuardTemplate,
  type NpcGuardUnitTemplate,
  type ResourceGuardTemplate,
} from './resourceGuardTemplates'
import {
  resolveRepresentativeTacticalDuel,
  type TacticalCombatant,
  type TacticalDuelReport,
  type TacticalSkillEvent,
  type TacticalTroopType,
} from './tacticalSkillRules'
import { STAR_UPGRADE_BONUS_PER_STAR } from '../contracts/game'
import type {
  ActionType,
  AiRuntimeAdvanceTickSubphaseTiming,
  AllianceActionSummary,
  BattleOutcomeRecord,
  BattleReportHeroSlotReadModel,
  BattleReportRoundDetail,
  BattleReportUnitReadModel,
  CityFootprintTiles,
  CityTechLevels,
  CityTechTrackId,
  ExecutableOrder,
  ExecutionReplay,
  ExecutionReplayFrame,
  ExecutionReplayOutcome,
  FactionId,
  IntelligenceLevel,
  MovementGeographyFeedback,
  PlanExecution,
  PlanningJobHistoryEntry,
  PlanSource,
  ExecutionEnqueueMode,
  ClaimableReward,
  ClaimableRewardSource,
  ReplayHighlight,
  ReplayOrderSnapshot,
  RewardBundle,
  ScenarioRewardPreview,
  SeaRouteAuthorityState,
  SeaRouteDefinition,
  SeaRouteStatus,
  ResourceTransferBundle,
  SlgGeneralDirectivePreviewState,
  StrategicPlan,
  TaskRealAuthoritySignalKind,
  TaskRewardPreview,
  TacticalOverride,
  TacticalTemplateId,
  Tile,
  TileIntel,
  Unit,
  UnitStatus,
  WorldActionHeroReadModel,
  WorldTaskEvent,
  WorldTaskEventSource,
  WorldState,
} from '../contracts/game'

export type AdvanceTickDiagnostics = {
  subphases: AiRuntimeAdvanceTickSubphaseTiming[]
}

type MoveResult =
  | { ok: true; world: WorldState; message: string; unitId: string; geographyFeedback: MovementGeographyFeedback }
  | { ok: false; message: string; geographyFeedback?: MovementGeographyFeedback }

export type QueuePlanFailureCode =
  | 'stale_world_version'
  | 'unknown_faction'
  | 'invalid_order_units'
  | 'execution_chain_guard_missing'
  | 'execution_chain_guard_mismatch'
  | 'execution_chain_active_rejected'

export type QueuePlanEnqueueOutcome = 'queued' | 'appended' | 'replaced'

type QueuePlanResult =
  | { ok: true; world: WorldState; message: string; enqueueOutcome: QueuePlanEnqueueOutcome }
  | { ok: false; message: string; failureCode: QueuePlanFailureCode }

type DeployReserveResult =
  | { ok: true; world: WorldState; message: string; unitId: string; heroIds: string[]; heroNames: string[] }
  | { ok: false; message: string }

type UpgradeCityResult =
  | { ok: true; world: WorldState; message: string; cityHallTileId: string }
  | { ok: false; message: string }

type CityUpgradeRule = {
  nextFootprintTiles: CityFootprintTiles
  actionPoints: number
  food: number
}

const CITY_UPGRADE_RULES: Partial<Record<CityFootprintTiles, CityUpgradeRule>> = {
  9: {
    nextFootprintTiles: 25,
    actionPoints: 2,
    food: 8,
  },
}

const RESOURCE_TRANSFER_KINDS = ['food', 'wood', 'stone', 'iron', 'copper'] as const
const AI_RESOURCE_TRANSFER_RESERVE_FLOOR = 10
const AI_RESOURCE_TRANSFER_MAX_TOTAL_PER_ACTION = 10_000
export const DEFAULT_AI_RESOURCE_TRANSFER_POLICY = {
  dailyQuotaTotal: 100,
  dailyWindowTicks: 24,
  cooldownTicks: 3,
} as const
const AI_RESOURCE_GATHER_AMOUNT_PER_LEVEL = 10
const TROOP_HEAL_ACTION_POINTS = 1
const TROOP_HEAL_FOOD = 2
const TROOP_HEAL_STRENGTH_GAIN = 20
const TROOP_HEAL_SUPPLY_GAIN = 2
const TROOP_HEAL_MAX_STRENGTH = 100
const TROOP_HEAL_MAX_SUPPLY = 9
export const HERO_LEVEL_MAX = 30
const HERO_LEVEL_UPGRADE_ACTION_POINTS = 1
const HERO_LEVEL_UPGRADE_FOOD = 2
const HERO_STAR_UPGRADE_DEVELOPMENT_POINTS = 5
const HERO_RESOURCE_GUARD_EXP_PER_LEVEL = 20
const HERO_LEVEL_EXP_THRESHOLD = 100
const TACTICAL_SKILL_MIN_LEVEL = 1
const TACTICAL_SKILL_MAX_LEVEL = 10
const TACTICAL_SKILL_COPPER_COST_PER_NEXT_LEVEL = 100

export type UpgradeResourceSpend = Partial<{
  actionPoints: number
  food: number
  wood: number
  stone: number
  iron: number
  copper: number
  developmentPoints: number
}>

type UpgradeCityTechResult =
  | {
      ok: true
      world: WorldState
      message: string
      cityHallTileId: string
      techId: CityTechTrackId
      previousLevel: number
      nextLevel: number
      resourcesSpent: UpgradeResourceSpend
    }
  | {
      ok: false
      message: string
      failureCode: CityBuildingUpgradeFailureCode
      previousLevel?: number
      resourcesSpent?: UpgradeResourceSpend
    }

type PromoteCityBuildingResult =
  | {
      ok: true
      world: WorldState
      message: string
      cityId: string
      groupId: string
      buildingId: string
      previousLevel: number
      nextLevel: number
      resourcesSpent: UpgradeResourceSpend
    }
  | {
      ok: false
      message: string
      failureCode: CityBuildingUpgradeFailureCode
      previousLevel?: number
      resourcesSpent?: UpgradeResourceSpend
    }

type PromoteTroopFacilityBuildingResult =
  | { ok: true; world: WorldState; message: string; unitId: string; facilityId: string; buildingId: string; previousLevel: number; nextLevel: number }
  | { ok: false; message: string }

export type ResourceTransferFailureCode =
  | 'unknown_source_faction'
  | 'missing_ai_resource_account'
  | 'governor_mismatch'
  | 'approval_required'
  | 'invalid_resource_amount'
  | 'insufficient_resources'
  | 'reserve_floor_violation'
  | 'transfer_limit_exceeded'
  | 'daily_quota_exceeded'
  | 'transfer_cooldown_active'

export type SeaRouteFailureCode =
  | 'unknown_faction'
  | 'unknown_sea_route'
  | 'source_dock_mismatch'
  | 'overseas_contact_locked'
  | 'insufficient_resources'

export type SeaPatrolScoutFailureCode =
  | 'unknown_faction'
  | 'unknown_sea_route'
  | 'source_dock_mismatch'
  | 'sea_route_not_open'
  | 'insufficient_resources'
  | 'unknown_fleet'
  | 'fleet_faction_mismatch'
  | 'fleet_route_mismatch'

export type NavalVesselType = 'light_patrol_warship' | 'interceptor_warship' | 'transport_warship'

export type SeaPatrolInterceptFailureCode =
  | SeaPatrolScoutFailureCode
  | 'missing_patrol_scout_report'
  | 'unknown_vessel_type'

export type NavalFleetRuntimeFailureCode =
  | SeaPatrolScoutFailureCode
  | 'unknown_vessel_type'
  | 'carried_unit_capacity_exceeded'
  | 'unknown_fleet'
  | 'fleet_faction_mismatch'
  | 'fleet_route_mismatch'
  | 'fleet_not_in_port'

export type NavalCombatSettlementFailureCode =
  | NavalFleetRuntimeFailureCode
  | 'same_fleet'
  | 'fleet_not_sailing'

export type NavalFleetDamageRepairFailureCode =
  | NavalFleetRuntimeFailureCode
  | 'fleet_not_damaged'

export type NavalShipyardBuildFailureCode =
  | NavalFleetRuntimeFailureCode
  | 'unknown_vessel_type'

type NavalCombatSettlementOutcome =
  | 'interceptor_warship_advantage'
  | 'transport_warship_holds_route'
  | 'balanced_naval_exchange'

type NavalVesselRule = {
  label: string
  carriedUnitCapacity: number
  combatBonusPercent: number
  speedTier: 'fast' | 'normal' | 'slow'
  buildCostTier: 'low' | 'medium' | 'high'
  visualScaleTier: 'small' | 'medium' | 'large'
  assetSlotId: string
}

type SeaPatrolInterceptOutcome =
  | 'interceptor_advantage'
  | 'light_patrol_evade'
  | 'transport_numbers_advantage'
  | 'balanced_maritime_clash'

const NAVAL_VESSEL_RULES: Record<NavalVesselType, NavalVesselRule> = {
  light_patrol_warship: {
    label: '轻巡战船',
    carriedUnitCapacity: 1,
    combatBonusPercent: 0,
    speedTier: 'fast',
    buildCostTier: 'low',
    visualScaleTier: 'small',
    assetSlotId: 'naval_light_patrol_warship_v1',
  },
  interceptor_warship: {
    label: '拦截战船',
    carriedUnitCapacity: 1,
    combatBonusPercent: 20,
    speedTier: 'normal',
    buildCostTier: 'medium',
    visualScaleTier: 'medium',
    assetSlotId: 'naval_interceptor_warship_v1',
  },
  transport_warship: {
    label: '运输战船',
    carriedUnitCapacity: 3,
    combatBonusPercent: 0,
    speedTier: 'slow',
    buildCostTier: 'high',
    visualScaleTier: 'large',
    assetSlotId: 'naval_transport_warship_v1',
  },
}

type OpenSeaRouteResult =
  | {
      ok: true
      world: WorldState
      message: string
      factionId: FactionId
      route: SeaRouteDefinition
      routeStatus: SeaRouteStatus
    }
  | {
      ok: false
      message: string
      failureCode: SeaRouteFailureCode
      route?: SeaRouteDefinition
      routeStatus?: SeaRouteStatus
    }

type SeaPatrolScoutResult =
  | {
      ok: true
      world: WorldState
      message: string
      factionId: FactionId
      route: SeaRouteDefinition
      routeStatus: SeaRouteStatus
      patrolReportId: string
      patrolKind: 'scout'
      patrolStatus: 'scout_report_ready'
      regionTokenId: 'region_token_wa_v1'
      maritimeActivityChipId: 'maritime_activity_chip_v1'
      maritimeReportResultChipId: 'maritime_report_result_chip_v1'
      navalBattleScope: 'patrol_scout_only_no_full_naval_combat'
      resourcesSpent: {
        actionPoints: number
        food: number
      }
      reusedFleetId?: string
      sourceShipyardOrderId?: string
      harborId?: string
      reuseStatus?: 'patrol_reuse_ready'
      worldNavalReuseUsesExistingSeaRuntime?: true
      worldNavalReuseDoesNotUseUnitMarker?: true
      worldNavalReuseScope?: 'shipyard_inventory_reuse_only_not_full_fleet_inventory_ui'
      actorAiPlayerId?: string
    }
  | {
      ok: false
      message: string
      failureCode: SeaPatrolScoutFailureCode
      route?: SeaRouteDefinition
      routeStatus?: SeaRouteStatus
    }

type SeaPatrolInterceptResult =
  | {
      ok: true
      world: WorldState
      message: string
      factionId: FactionId
      route: SeaRouteDefinition
      routeStatus: SeaRouteStatus
      interceptReportId: string
      interceptOutcome: SeaPatrolInterceptOutcome
      attackerVesselType: NavalVesselType
      defenderVesselType: NavalVesselType
      attackerVesselRule: NavalVesselRule
      defenderVesselRule: NavalVesselRule
      battleReportSurface: 'battle_report_panel/list/detail'
      maritimeReportResultChipId: 'maritime_report_result_chip_v1'
      navalBattleScope: 'patrol_intercept_minimal_battle_report_only'
      resourcesSpent: {
        actionPoints: number
        food: number
      }
      reusedFleetId?: string
      sourceShipyardOrderId?: string
      harborId?: string
      reuseStatus?: 'route_patrol_intercept_reused'
      worldNavalReuseUsesExistingSeaRuntime?: true
      worldNavalReuseDoesNotUseUnitMarker?: true
      worldNavalReuseScope?: 'shipyard_inventory_reuse_only_not_full_fleet_inventory_ui'
      actorAiPlayerId?: string
    }
  | {
      ok: false
      message: string
      failureCode: SeaPatrolInterceptFailureCode
      route?: SeaRouteDefinition
      routeStatus?: SeaRouteStatus
    }

type CreateNavalFleetResult =
  | {
      ok: true
      world: WorldState
      message: string
      factionId: FactionId
      route: SeaRouteDefinition
      routeStatus: SeaRouteStatus
      fleetId: string
      fleetRuntimeStatus: 'in_port'
      vesselType: NavalVesselType
      vesselRule: NavalVesselRule
      carriedUnitIds: string[]
      runtimeAdapterStatus: 'naval_runtime_adapter_v0_1'
      movementRuntimeStatus: 'dedicated_naval_runtime_not_land_unit_marker'
      doesNotUseUnitMarker: true
      actorAiPlayerId?: string
    }
  | {
      ok: false
      message: string
      failureCode: NavalFleetRuntimeFailureCode
      route?: SeaRouteDefinition
      routeStatus?: SeaRouteStatus
    }

type SailNavalRouteResult =
  | {
      ok: true
      world: WorldState
      message: string
      factionId: FactionId
      route: SeaRouteDefinition
      routeStatus: SeaRouteStatus
      fleetId: string
      fleetRuntimeStatus: 'sailing'
      vesselType: NavalVesselType
      vesselRule: NavalVesselRule
      carriedUnitIds: string[]
      routeLineStatus: 'route_line_visible'
      progressPercent: number
      runtimeAdapterStatus: 'naval_runtime_adapter_v0_1'
      movementRuntimeStatus: 'dedicated_naval_runtime_not_land_unit_marker'
      doesNotUseUnitMarker: true
      actorAiPlayerId?: string
    }
  | {
      ok: false
      message: string
      failureCode: NavalFleetRuntimeFailureCode
      route?: SeaRouteDefinition
      routeStatus?: SeaRouteStatus
    }

type ResolveNavalCombatSettlementResult =
  | {
      ok: true
      world: WorldState
      message: string
      factionId: FactionId
      route: SeaRouteDefinition
      routeStatus: SeaRouteStatus
      navalCombatSettlementId: string
      battleReportId: string
      attackerFleetId: string
      defenderFleetId: string
      attackerVesselType: NavalVesselType
      defenderVesselType: NavalVesselType
      attackerVesselRule: NavalVesselRule
      defenderVesselRule: NavalVesselRule
      attackerFrameSlotId: string
      defenderFrameSlotId: string
      outcome: NavalCombatSettlementOutcome
      winnerFleetId: string
      loserFleetId: string
      damageSummary: string
      lossSummary: string
      battleReportSurface: 'battle_report_panel/list/detail'
      maritimeReportResultChipId: 'maritime_report_result_chip_v1'
      navalBattleScope: 'fleet_combat_minimal_settlement_only'
      doesNotUseUnitMarker: true
      damagedFleetId: string
      damagedFleetDamageState: 'light_damage'
      damagedFleetRepairStatus: 'needs_repair'
      inventoryFleetId?: string
      reusedFleetId?: string
      sourceShipyardOrderId?: string
      fleetDamageState?: 'damaged'
      worldNavalCombatUsesInventoryFleet?: true
      worldNavalCombatUsesExistingSeaRuntime?: true
      worldNavalCombatDoesNotUseUnitMarker?: true
      worldNavalCombatDamageRepairScope?: 'inventory_fleet_combat_damage_repair_only_not_full_fleet_ui'
      actorAiPlayerId?: string
    }
  | {
      ok: false
      message: string
      failureCode: NavalCombatSettlementFailureCode
      route?: SeaRouteDefinition
      routeStatus?: SeaRouteStatus
    }

type RepairNavalFleetDamageResult =
  | {
      ok: true
      world: WorldState
      message: string
      factionId: FactionId
      route: SeaRouteDefinition
      routeStatus: SeaRouteStatus
      fleetId: string
      vesselType: NavalVesselType
      vesselRule: NavalVesselRule
      damageState: 'light_damage'
      repairStatus: 'returning_to_port'
      damageSummary: string
      lossSummary: string
      repairReportId: string
      repairFeedbackVisibleCopy: string
      repairScope: 'minimal_damage_status_not_full_fleet_inventory'
      movementRuntimeStatus: 'dedicated_naval_runtime_not_land_unit_marker'
      doesNotUseUnitMarker: true
      actorAiPlayerId?: string
    }
  | {
      ok: false
      message: string
      failureCode: NavalFleetDamageRepairFailureCode
      route?: SeaRouteDefinition
      routeStatus?: SeaRouteStatus
    }

type BuildNavalWarshipAtHarborResult =
  | {
      ok: true
      world: WorldState
      message: string
      factionId: FactionId
      route: SeaRouteDefinition
      routeStatus: SeaRouteStatus
      harborId: string
      shipyardOrderId: string
      shipClass: NavalVesselType
      buildStatus: 'recorded'
      inventoryFleetId: string
      fleetId: string
      vesselRule: NavalVesselRule
      addedShipCount: number
      inventoryDelta: number
      totalShipCount: number
      shipyardReportId: string
      shipyardFeedbackVisibleCopy: string
      shipyardScope: 'minimal_shipyard_inventory_not_full_naval_economy'
      movementRuntimeStatus: 'dedicated_naval_runtime_not_land_unit_marker'
      doesNotUseUnitMarker: true
      actorAiPlayerId?: string
    }
  | {
      ok: false
      message: string
      failureCode: NavalShipyardBuildFailureCode
      route?: SeaRouteDefinition
      routeStatus?: SeaRouteStatus
    }

export type AiResourceTransferPolicyFailureCode =
  | 'unknown_faction'
  | 'invalid_transfer_policy'

export type GovernorResourceInboxClaimFailureCode =
  | 'unknown_faction'
  | 'missing_governor_inbox'
  | 'missing_governor_transfer'

export type AiResourceGatherFailureCode =
  | 'unknown_faction'
  | 'missing_ai_resource_account'
  | 'governor_mismatch'
  | 'unknown_unit'
  | 'unit_faction_mismatch'
  | 'unit_not_assigned_to_ai_player'
  | 'unknown_resource_tile'
  | 'tile_not_resource'
  | 'tile_not_controlled'
  | 'unit_not_on_tile'
  | 'resource_tile_already_gathered'

export type TileOccupyFailureCode =
  | 'unknown_faction'
  | 'unknown_unit'
  | 'unit_faction_mismatch'
  | 'unit_not_assigned_to_ai_player'
  | 'unknown_tile'
  | 'tile_not_occupiable'
  | 'tile_already_controlled'
  | 'tile_not_neutral'
  | 'tile_occupied_by_hostile_unit'
  | 'unit_not_on_tile'
  | 'insufficient_resources'
  | 'active_orders_exist'

export type TroopHealFailureCode =
  | 'unknown_faction'
  | 'unknown_unit'
  | 'unit_faction_mismatch'
  | 'unit_not_assigned_to_ai_player'
  | 'unit_already_full'
  | 'insufficient_resources'
  | 'active_orders_exist'

export type TacticalSkillUpgradeFailureCode =
  | 'unknown_faction'
  | 'unknown_hero'
  | 'hero_faction_mismatch'
  | 'missing_skill_slot'
  | 'skill_not_equipped'
  | 'missing_skill_level'
  | 'skill_level_out_of_range'
  | 'skill_level_at_max'
  | 'insufficient_resources'

type TacticalSkillUpgradeResult =
  | {
      ok: true
      world: WorldState
      message: string
      heroId: string
      skillId: string
      previousLevel: number
      nextLevel: number
      resourcesSpent: UpgradeResourceSpend
    }
  | {
      ok: false
      message: string
      failureCode: TacticalSkillUpgradeFailureCode
      heroId?: string
      skillId?: string
      previousLevel?: number
      resourcesSpent?: UpgradeResourceSpend
    }

export type HeroGrowthFailureCode =
  | 'unknown_faction'
  | 'unknown_hero'
  | 'hero_faction_mismatch'
  | 'insufficient_resources'
  | 'insufficient_materials'
  | 'hero_level_at_max'
  | 'hero_star_at_max'

type HeroLevelUpgradeResult =
  | {
      ok: true
      world: WorldState
      message: string
      heroId: string
      previousLevel: number
      nextLevel: number
      resourcesSpent: { actionPoints: number; food: number }
      hero: WorldActionHeroReadModel
    }
  | {
      ok: false
      message: string
      failureCode: HeroGrowthFailureCode
      heroId?: string
      previousLevel?: number
    }

type HeroStarUpgradeResult =
  | {
      ok: true
      world: WorldState
      message: string
      heroId: string
      previousStarLevel: number
      nextStarLevel: number
      resourcesSpent: { developmentPoints: number }
      bonusPointsAwarded: number
      hero: WorldActionHeroReadModel
    }
  | {
      ok: false
      message: string
      failureCode: HeroGrowthFailureCode
      heroId?: string
      previousStarLevel?: number
    }

export type CityBuildingUpgradeFailureCode =
  | 'unsupported_building'
  | 'construction_queue_occupied'
  | 'city_not_found'
  | 'wrong_faction'
  | 'prerequisite_not_met'
  | 'building_level_at_max'
  | 'insufficient_resources'

type TransferFactionResourcesToGovernorResult =
  | {
      ok: true
      world: WorldState
      message: string
      transferId: string
      sourceAiPlayerId: string
      governorPlayerId: string
      resources: ResourceTransferBundle
    }
  | {
      ok: false
      message: string
      failureCode: ResourceTransferFailureCode
    }

const DEFAULT_SEA_ROUTE_AUTHORITY: SeaRouteAuthorityState = {
  schemaVersion: 'sea_route_authority_v0_1',
  routes: [
    {
      id: 'east_han_coastal_dock_to_wa_contact',
      label: '泉州港 -> 倭地联络点',
      source: {
        kind: 'dock',
        id: 'east_han_coastal_dock_quanzhou',
        label: '泉州港',
        tileId: 'dock_yangzhou_yangtze_east',
      },
      destination: {
        kind: 'overseas_contact',
        id: 'wa_contact_scoutable',
        label: '倭地联络点',
        region: 'japan',
        gameplayState: 'scoutable',
      },
      gameplayState: 'route_open',
      requiredPermission: 'coastal_dock_access',
      travelCost: {
        actionPoints: 1,
        food: 2,
      },
      blockedReason: null,
      relatedOverseasRegions: ['japan', 'india', 'southeast_asia'],
    },
  ],
  routeStatuses: {
    east_han_coastal_dock_to_wa_contact: {
      routeId: 'east_han_coastal_dock_to_wa_contact',
      status: 'locked',
      blockedReason: '尚未由后端 authority 开通；maritime mask 与 dock visual 只提供地图语境。',
      travelCost: {
        actionPoints: 1,
        food: 2,
      },
    },
  },
}

function cloneDefaultSeaRouteAuthority(): SeaRouteAuthorityState {
  return structuredClone(DEFAULT_SEA_ROUTE_AUTHORITY)
}

function ensureSeaRouteAuthority(world: WorldState): SeaRouteAuthorityState {
  if (!world.seaRouteAuthority) {
    world.seaRouteAuthority = cloneDefaultSeaRouteAuthority()
  }
  if (!world.seaRouteAuthority.routeStatuses) {
    world.seaRouteAuthority.routeStatuses = {}
  }
  for (const route of world.seaRouteAuthority.routes) {
    world.seaRouteAuthority.routeStatuses[route.id] ??= {
      routeId: route.id,
      status: 'locked',
      blockedReason: '尚未由后端 authority 开通；maritime mask 与 dock visual 只提供地图语境。',
      travelCost: structuredClone(route.travelCost),
    }
  }
  return world.seaRouteAuthority
}

function ensureNavalRuntime(world: WorldState): NonNullable<WorldState['navalRuntime']> {
  if (!world.navalRuntime) {
    world.navalRuntime = {
      schemaVersion: 'naval_runtime_v0_1',
      fleets: {},
    }
  }
  if (!world.navalRuntime.fleets) {
    world.navalRuntime.fleets = {}
  }
  if (!world.navalRuntime.shipyardOrders) {
    world.navalRuntime.shipyardOrders = {}
  }
  if (!world.navalRuntime.harborInventories) {
    world.navalRuntime.harborInventories = {}
  }
  return world.navalRuntime
}

function resolveSeaRoute(
  authority: SeaRouteAuthorityState,
  sourceDockId: string,
  overseasContactId: string,
): SeaRouteDefinition | null {
  return authority.routes.find((route) => (
    route.source.id === sourceDockId &&
    route.destination.id === overseasContactId
  )) ?? null
}

function lockedOverseasContactReason(overseasContactId: string) {
  if (overseasContactId === 'india_contact_locked') {
    return '印度方向仍是 locked：本轮只开放一个日本联络点 vertical slice。'
  }
  if (overseasContactId === 'southeast_asia_contact_locked') {
    return '东南亚方向仍是 locked：本轮只开放一个日本联络点 vertical slice。'
  }
  return '海外联络点尚未开放：本轮只验证一条 source dock -> overseas contact 海路。'
}

export function openSeaRoute(
  world: WorldState,
  params: {
    factionId: FactionId
    sourceDockId: string
    overseasContactId: string
    actorAiPlayerId?: string
  },
): OpenSeaRouteResult {
  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[params.factionId]
  if (!faction) {
    return {
      ok: false,
      message: `Unknown faction: ${params.factionId}`,
      failureCode: 'unknown_faction',
    }
  }

  const authority = ensureSeaRouteAuthority(nextWorld)
  const route = resolveSeaRoute(authority, params.sourceDockId, params.overseasContactId)
  if (!route) {
    const blockedReason = lockedOverseasContactReason(params.overseasContactId)
    return {
      ok: false,
      message: blockedReason,
      failureCode: 'overseas_contact_locked',
      routeStatus: {
        routeId: `${params.sourceDockId}->${params.overseasContactId}`,
        status: 'blocked',
        blockedReason,
        travelCost: {
          actionPoints: 0,
          food: 0,
        },
      },
    }
  }

  const sourceTile = nextWorld.map.tiles.find((tile) => tile.id === route.source.tileId)
  if (!sourceTile || sourceTile.type !== 'dock') {
    return {
      ok: false,
      message: `Sea route source dock is not an authoritative dock tile: ${route.source.tileId}`,
      failureCode: 'source_dock_mismatch',
      route,
      routeStatus: authority.routeStatuses[route.id],
    }
  }

  if (route.gameplayState !== 'route_open' || route.destination.gameplayState === 'locked') {
    const blockedReason = route.blockedReason ?? lockedOverseasContactReason(route.destination.id)
    return {
      ok: false,
      message: blockedReason,
      failureCode: 'overseas_contact_locked',
      route,
      routeStatus: {
        routeId: route.id,
        status: 'blocked',
        blockedReason,
        travelCost: structuredClone(route.travelCost),
      },
    }
  }

  if (faction.actionPoints < route.travelCost.actionPoints || faction.food < route.travelCost.food) {
    return {
      ok: false,
      message: `海路开通需要 ${route.travelCost.actionPoints} 行动力和 ${route.travelCost.food} 粮草。`,
      failureCode: 'insufficient_resources',
      route,
      routeStatus: authority.routeStatuses[route.id],
    }
  }

  faction.actionPoints -= route.travelCost.actionPoints
  faction.food -= route.travelCost.food
  const routeStatus: SeaRouteStatus = {
    routeId: route.id,
    status: 'route_open',
    blockedReason: null,
    travelCost: structuredClone(route.travelCost),
    lastOpenedTick: nextWorld.tick,
    lastOpenedByFactionId: params.factionId,
    lastActorAiPlayerId: params.actorAiPlayerId,
  }
  authority.routeStatuses[route.id] = routeStatus
  prependReport(
    nextWorld,
    nextWorld.tick,
    '海外航线开通',
    [
      `${route.label} 已完成权威校验。`,
      `费用：行动力 ${route.travelCost.actionPoints}、粮草 ${route.travelCost.food}。`,
      params.actorAiPlayerId ? `AI 提案执行者：${params.actorAiPlayerId}。` : '执行者：玩家势力。',
      '日本方向进入 route_open；印度、东南亚仍为 locked 方向标记，不代表完整海外系统。',
    ].join(''),
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: `${route.label} 已开通；印度/东南亚方向仍保持 locked。`,
    factionId: params.factionId,
    route,
    routeStatus,
  }
}

export function seaPatrolScout(
  world: WorldState,
  params: {
    factionId: FactionId
    routeId: string
    sourceDockId: string
    overseasContactId: string
    actorAiPlayerId?: string
    inventoryFleetId?: string
  },
): SeaPatrolScoutResult {
  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[params.factionId]
  if (!faction) {
    return {
      ok: false,
      message: `Unknown faction: ${params.factionId}`,
      failureCode: 'unknown_faction',
    }
  }

  const authority = ensureSeaRouteAuthority(nextWorld)
  const route = authority.routes.find((candidate) => candidate.id === params.routeId)
  if (!route) {
    return {
      ok: false,
      message: `Unknown sea route: ${params.routeId}`,
      failureCode: 'unknown_sea_route',
    }
  }
  if (route.source.id !== params.sourceDockId || route.destination.id !== params.overseasContactId) {
    return {
      ok: false,
      message: `Sea patrol scout route endpoint mismatch: ${params.routeId}`,
      failureCode: 'source_dock_mismatch',
      route,
      routeStatus: authority.routeStatuses[route.id],
    }
  }

  const routeStatus = authority.routeStatuses[route.id]
  if (route.gameplayState !== 'route_open' || routeStatus?.status !== 'route_open') {
    return {
      ok: false,
      message: 'Sea patrol scout requires the W6 sea route to be opened first.',
      failureCode: 'sea_route_not_open',
      route,
      routeStatus,
    }
  }

  const resourcesSpent = { actionPoints: 1, food: 1 }
  if (faction.actionPoints < resourcesSpent.actionPoints || faction.food < resourcesSpent.food) {
    return {
      ok: false,
      message: `Sea patrol scout requires ${resourcesSpent.actionPoints} action point and ${resourcesSpent.food} food.`,
      failureCode: 'insufficient_resources',
      route,
      routeStatus,
    }
  }

  faction.actionPoints -= resourcesSpent.actionPoints
  faction.food -= resourcesSpent.food
  const reuse = reuseInventoryFleetForSeaRuntime(nextWorld, {
    factionId: params.factionId,
    routeId: params.routeId,
    sourceDockId: params.sourceDockId,
    overseasContactId: params.overseasContactId,
    inventoryFleetId: params.inventoryFleetId,
    nextStatus: 'patrolling',
    progressPercent: 25,
    actorAiPlayerId: params.actorAiPlayerId,
  })
  if (reuse && !reuse.ok) {
    return {
      ok: false,
      message: reuse.message,
      failureCode: reuse.failureCode,
      route,
      routeStatus,
    }
  }

  const patrolReportId = `sea_patrol_scout_report_${nextWorld.tick}_${nextWorld.reports.length + 1}`
  prependReport(
    nextWorld,
    nextWorld.tick,
    '海巡侦察回报',
    [
      `route=${route.id}; `,
      `sourceDock=${route.source.id}; `,
      `overseasContact=${route.destination.id}; `,
      params.actorAiPlayerId ? `actorAiPlayerId=${params.actorAiPlayerId}; ` : '',
      reuse?.ok ? `reusedFleetId=${reuse.reusedFleetId}; ` : '',
      reuse?.ok ? `sourceShipyardOrderId=${reuse.sourceShipyardOrderId}; ` : '',
      'regionTokenId=region_token_wa_v1; ',
      'maritimeActivityChipId=maritime_activity_chip_v1; ',
      'maritimeReportResultChipId=maritime_report_result_chip_v1; ',
      '本次只生成海巡侦察报告，不代表完整海战。',
    ].join(''),
    patrolReportId,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: '海巡侦察完成：已生成 maritime report，尚未进入完整海战。',
    factionId: params.factionId,
    route,
    routeStatus,
    patrolReportId,
    patrolKind: 'scout',
    patrolStatus: 'scout_report_ready',
    regionTokenId: 'region_token_wa_v1',
    maritimeActivityChipId: 'maritime_activity_chip_v1',
    maritimeReportResultChipId: 'maritime_report_result_chip_v1',
    navalBattleScope: 'patrol_scout_only_no_full_naval_combat',
    resourcesSpent,
    reusedFleetId: reuse?.ok ? reuse.reusedFleetId : undefined,
    sourceShipyardOrderId: reuse?.ok ? reuse.sourceShipyardOrderId : undefined,
    harborId: reuse?.ok ? reuse.harborId : undefined,
    reuseStatus: reuse?.ok ? 'patrol_reuse_ready' : undefined,
    worldNavalReuseUsesExistingSeaRuntime: reuse?.ok ? reuse.worldNavalReuseUsesExistingSeaRuntime : undefined,
    worldNavalReuseDoesNotUseUnitMarker: reuse?.ok ? reuse.worldNavalReuseDoesNotUseUnitMarker : undefined,
    worldNavalReuseScope: reuse?.ok ? reuse.worldNavalReuseScope : undefined,
    actorAiPlayerId: params.actorAiPlayerId,
  }
}

function hasPatrolScoutReportForRoute(world: WorldState, routeId: string): boolean {
  return world.reports.some((report) => {
    const detail = `${report.id}\n${report.title}\n${report.detail}`
    return detail.includes('sea_patrol_scout_report_') && detail.includes(routeId)
  })
}

function resolveNavalVesselRule(vesselType: string): { type: NavalVesselType; rule: NavalVesselRule } | null {
  if (vesselType === 'light_patrol_warship' || vesselType === 'interceptor_warship' || vesselType === 'transport_warship') {
    return {
      type: vesselType,
      rule: NAVAL_VESSEL_RULES[vesselType],
    }
  }
  return null
}

function validateOpenedSeaRouteForRuntime(
  world: WorldState,
  params: {
    factionId: FactionId
    routeId: string
    sourceDockId?: string
    overseasContactId?: string
  },
): {
  ok: true
  route: SeaRouteDefinition
  routeStatus: SeaRouteStatus
} | {
  ok: false
  message: string
  failureCode: NavalFleetRuntimeFailureCode
  route?: SeaRouteDefinition
  routeStatus?: SeaRouteStatus
} {
  const faction = world.factions[params.factionId]
  if (!faction) {
    return {
      ok: false,
      message: `Unknown faction: ${params.factionId}`,
      failureCode: 'unknown_faction',
    }
  }
  const authority = ensureSeaRouteAuthority(world)
  const route = authority.routes.find((candidate) => candidate.id === params.routeId)
  if (!route) {
    return {
      ok: false,
      message: `Unknown sea route: ${params.routeId}`,
      failureCode: 'unknown_sea_route',
    }
  }
  if (
    (params.sourceDockId && route.source.id !== params.sourceDockId) ||
    (params.overseasContactId && route.destination.id !== params.overseasContactId)
  ) {
    return {
      ok: false,
      message: `Naval fleet route endpoint mismatch: ${params.routeId}`,
      failureCode: 'source_dock_mismatch',
      route,
      routeStatus: authority.routeStatuses[route.id],
    }
  }
  const routeStatus = authority.routeStatuses[route.id]
  if (route.gameplayState !== 'route_open' || routeStatus?.status !== 'route_open') {
    return {
      ok: false,
      message: 'Naval fleet runtime requires the W6 sea route to be opened first.',
      failureCode: 'sea_route_not_open',
      route,
      routeStatus,
    }
  }
  return {
    ok: true,
    route,
    routeStatus,
  }
}

function reuseInventoryFleetForSeaRuntime(
  world: WorldState,
  params: {
    factionId: FactionId
    routeId: string
    sourceDockId: string
    overseasContactId: string
    inventoryFleetId?: string
    nextStatus: 'patrolling' | 'intercepting'
    progressPercent: number
    actorAiPlayerId?: string
  },
): {
  ok: true
  reusedFleetId: string
  sourceShipyardOrderId: string
  harborId: string
  worldNavalReuseUsesExistingSeaRuntime: true
  worldNavalReuseDoesNotUseUnitMarker: true
  worldNavalReuseScope: 'shipyard_inventory_reuse_only_not_full_fleet_inventory_ui'
} | {
  ok: false
  message: string
  failureCode: SeaPatrolScoutFailureCode
} | null {
  const inventoryFleetId = params.inventoryFleetId?.trim()
  if (!inventoryFleetId) {
    return null
  }
  const runtime = ensureNavalRuntime(world)
  const fleet = runtime.fleets[inventoryFleetId]
  if (!fleet) {
    return {
      ok: false,
      message: `Unknown naval inventory fleet: ${inventoryFleetId}`,
      failureCode: 'unknown_fleet',
    }
  }
  if (fleet.factionId !== params.factionId) {
    return {
      ok: false,
      message: `Naval inventory fleet faction mismatch: ${inventoryFleetId}`,
      failureCode: 'fleet_faction_mismatch',
    }
  }
  if (
    fleet.routeId !== params.routeId ||
    fleet.sourceDockId !== params.sourceDockId ||
    fleet.overseasContactId !== params.overseasContactId
  ) {
    return {
      ok: false,
      message: `Naval inventory fleet route mismatch: ${inventoryFleetId}`,
      failureCode: 'fleet_route_mismatch',
    }
  }
  fleet.status = params.nextStatus
  fleet.progressPercent = params.progressPercent
  fleet.lastSailedTick = world.tick
  fleet.routeLineStatus = 'route_line_visible'
  fleet.actorAiPlayerId = params.actorAiPlayerId ?? fleet.actorAiPlayerId
  return {
    ok: true,
    reusedFleetId: fleet.fleetId,
    sourceShipyardOrderId: fleet.shipyardOrderId ?? '',
    harborId: fleet.sourceDockId,
    worldNavalReuseUsesExistingSeaRuntime: true,
    worldNavalReuseDoesNotUseUnitMarker: fleet.doesNotUseUnitMarker,
    worldNavalReuseScope: 'shipyard_inventory_reuse_only_not_full_fleet_inventory_ui',
  }
}

export function createNavalFleet(
  world: WorldState,
  params: {
    factionId: FactionId
    routeId: string
    sourceDockId: string
    overseasContactId: string
    vesselType: string
    carriedUnitIds?: string[]
    actorAiPlayerId?: string
  },
): CreateNavalFleetResult {
  const nextWorld = shallowCloneWorld(world)
  const routeValidation = validateOpenedSeaRouteForRuntime(nextWorld, params)
  if (!routeValidation.ok) {
    return routeValidation
  }

  const vessel = resolveNavalVesselRule(params.vesselType)
  if (!vessel) {
    return {
      ok: false,
      message: 'Unknown naval vessel type for fleet runtime.',
      failureCode: 'unknown_vessel_type',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }

  const carriedUnitIds = [...(params.carriedUnitIds ?? [])]
  if (carriedUnitIds.length > vessel.rule.carriedUnitCapacity) {
    return {
      ok: false,
      message: `${vessel.rule.label} 最多承载 ${vessel.rule.carriedUnitCapacity} 支队伍。`,
      failureCode: 'carried_unit_capacity_exceeded',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }

  const runtime = ensureNavalRuntime(nextWorld)
  const fleetId = `naval_fleet_${nextWorld.tick}_${Object.keys(runtime.fleets).length + 1}_${vessel.type}`
  runtime.fleets[fleetId] = {
    fleetId,
    factionId: params.factionId,
    routeId: routeValidation.route.id,
    sourceDockId: routeValidation.route.source.id,
    overseasContactId: routeValidation.route.destination.id,
    vesselType: vessel.type,
    frameSlotId: vessel.rule.assetSlotId,
    carriedUnitIds,
    carriedUnitCapacity: vessel.rule.carriedUnitCapacity,
    combatBonusPercent: vessel.rule.combatBonusPercent,
    speedTier: vessel.rule.speedTier,
    status: 'in_port',
    createdTick: nextWorld.tick,
    progressPercent: 0,
    runtimeAdapterStatus: 'naval_runtime_adapter_v0_1',
    movementRuntimeStatus: 'dedicated_naval_runtime_not_land_unit_marker',
    doesNotUseUnitMarker: true,
    actorAiPlayerId: params.actorAiPlayerId,
  }

  prependReport(
    nextWorld,
    nextWorld.tick,
    '海船编组就绪',
    [
      `fleetId=${fleetId}; `,
      `route=${routeValidation.route.id}; `,
      `vesselType=${vessel.type}; `,
      `frameSlotId=${vessel.rule.assetSlotId}; `,
      'runtimeAdapterStatus=naval_runtime_adapter_v0_1; ',
      'movementRuntimeStatus=dedicated_naval_runtime_not_land_unit_marker; ',
      '不接陆地 UnitMarker，不代表完整舰队库存系统。',
    ].join(''),
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: '海船编组已创建：进入专用 naval runtime，尚未接入完整舰队系统。',
    factionId: params.factionId,
    route: routeValidation.route,
    routeStatus: routeValidation.routeStatus,
    fleetId,
    fleetRuntimeStatus: 'in_port',
    vesselType: vessel.type,
    vesselRule: vessel.rule,
    carriedUnitIds,
    runtimeAdapterStatus: 'naval_runtime_adapter_v0_1',
    movementRuntimeStatus: 'dedicated_naval_runtime_not_land_unit_marker',
    doesNotUseUnitMarker: true,
    actorAiPlayerId: params.actorAiPlayerId,
  }
}

export function sailNavalRoute(
  world: WorldState,
  params: {
    factionId: FactionId
    fleetId: string
    routeId: string
    actorAiPlayerId?: string
  },
): SailNavalRouteResult {
  const nextWorld = shallowCloneWorld(world)
  const routeValidation = validateOpenedSeaRouteForRuntime(nextWorld, {
    factionId: params.factionId,
    routeId: params.routeId,
  })
  if (!routeValidation.ok) {
    return routeValidation
  }

  const runtime = ensureNavalRuntime(nextWorld)
  const fleet = runtime.fleets[params.fleetId]
  if (!fleet) {
    return {
      ok: false,
      message: `Unknown naval fleet: ${params.fleetId}`,
      failureCode: 'unknown_fleet',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }
  if (fleet.factionId !== params.factionId) {
    return {
      ok: false,
      message: `Naval fleet ${params.fleetId} does not belong to ${params.factionId}.`,
      failureCode: 'fleet_faction_mismatch',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }
  if (fleet.routeId !== params.routeId) {
    return {
      ok: false,
      message: `Naval fleet ${params.fleetId} is not assigned to route ${params.routeId}.`,
      failureCode: 'fleet_route_mismatch',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }
  if (fleet.status !== 'in_port') {
    return {
      ok: false,
      message: `Naval fleet ${params.fleetId} is not in port.`,
      failureCode: 'fleet_not_in_port',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }

  const vessel = resolveNavalVesselRule(fleet.vesselType)
  if (!vessel) {
    return {
      ok: false,
      message: 'Unknown naval vessel type for fleet runtime.',
      failureCode: 'unknown_vessel_type',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }

  fleet.status = 'sailing'
  fleet.lastSailedTick = nextWorld.tick
  fleet.progressPercent = 50
  fleet.routeLineStatus = 'route_line_visible'

  prependReport(
    nextWorld,
    nextWorld.tick,
    '海船启航',
    [
      `fleetId=${fleet.fleetId}; `,
      `route=${routeValidation.route.id}; `,
      `frameSlotId=${fleet.frameSlotId}; `,
      'routeLineStatus=route_line_visible; ',
      'runtimeAdapterStatus=naval_runtime_adapter_v0_1; ',
      'movementRuntimeStatus=dedicated_naval_runtime_not_land_unit_marker; ',
      '本次只证明跨海运行态和路线反馈，不代表自由海域寻路。',
    ].join(''),
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: '海船已沿海路启航：专用 naval runtime route line 可见。',
    factionId: params.factionId,
    route: routeValidation.route,
    routeStatus: routeValidation.routeStatus,
    fleetId: fleet.fleetId,
    fleetRuntimeStatus: 'sailing',
    vesselType: vessel.type,
    vesselRule: vessel.rule,
    carriedUnitIds: [...fleet.carriedUnitIds],
    routeLineStatus: 'route_line_visible',
    progressPercent: fleet.progressPercent,
    runtimeAdapterStatus: 'naval_runtime_adapter_v0_1',
    movementRuntimeStatus: 'dedicated_naval_runtime_not_land_unit_marker',
    doesNotUseUnitMarker: true,
    actorAiPlayerId: params.actorAiPlayerId ?? fleet.actorAiPlayerId,
  }
}

function resolveMinimalNavalCombatOutcome(
  attackerType: NavalVesselType,
  defenderType: NavalVesselType,
): NavalCombatSettlementOutcome {
  if (attackerType === 'interceptor_warship' && defenderType === 'transport_warship') {
    return 'interceptor_warship_advantage'
  }
  if (attackerType === 'transport_warship' && defenderType === 'interceptor_warship') {
    return 'transport_warship_holds_route'
  }
  return 'balanced_naval_exchange'
}

export function resolveNavalCombatSettlement(
  world: WorldState,
  params: {
    factionId: FactionId
    routeId: string
    attackerFleetId: string
    defenderFleetId: string
      actorAiPlayerId?: string
      inventoryFleetId?: string
    },
): ResolveNavalCombatSettlementResult {
  const nextWorld = shallowCloneWorld(world)
  const routeValidation = validateOpenedSeaRouteForRuntime(nextWorld, {
    factionId: params.factionId,
    routeId: params.routeId,
  })
  if (!routeValidation.ok) {
    return routeValidation
  }
  if (params.attackerFleetId === params.defenderFleetId) {
    return {
      ok: false,
      message: 'Naval combat settlement requires two different fleet instances.',
      failureCode: 'same_fleet',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }

  const runtime = ensureNavalRuntime(nextWorld)
  const attackerFleet = runtime.fleets[params.attackerFleetId]
  const defenderFleet = runtime.fleets[params.defenderFleetId]
  if (!attackerFleet || !defenderFleet) {
    return {
      ok: false,
      message: 'Naval combat settlement requires two known fleet instances.',
      failureCode: 'unknown_fleet',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }
  if (attackerFleet.factionId !== params.factionId || defenderFleet.factionId !== params.factionId) {
    return {
      ok: false,
      message: 'Naval combat settlement fleets must belong to the acting faction in this minimal slice.',
      failureCode: 'fleet_faction_mismatch',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }
  if (attackerFleet.routeId !== params.routeId || defenderFleet.routeId !== params.routeId) {
    return {
      ok: false,
      message: 'Naval combat settlement fleets must share the same opened sea route.',
      failureCode: 'fleet_route_mismatch',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }
  if (attackerFleet.status !== 'sailing' && defenderFleet.status !== 'sailing') {
    return {
      ok: false,
      message: 'Naval combat settlement requires at least one fleet already sailing.',
      failureCode: 'fleet_not_sailing',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }
  const requestedInventoryFleetId = params.inventoryFleetId?.trim()
  if (requestedInventoryFleetId && requestedInventoryFleetId !== attackerFleet.fleetId && requestedInventoryFleetId !== defenderFleet.fleetId) {
    return {
      ok: false,
      message: `Naval combat inventory fleet mismatch: ${requestedInventoryFleetId}`,
      failureCode: 'fleet_route_mismatch',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }

  const attacker = resolveNavalVesselRule(attackerFleet.vesselType)
  const defender = resolveNavalVesselRule(defenderFleet.vesselType)
  if (!attacker || !defender) {
    return {
      ok: false,
      message: 'Unknown naval vessel type for fleet combat settlement.',
      failureCode: 'unknown_vessel_type',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }

  const outcome = resolveMinimalNavalCombatOutcome(attacker.type, defender.type)
  const attackerWins = outcome === 'interceptor_warship_advantage'
    || (outcome === 'balanced_naval_exchange' && attacker.rule.combatBonusPercent >= defender.rule.combatBonusPercent)
  const winnerFleetId = attackerWins ? attackerFleet.fleetId : defenderFleet.fleetId
  const loserFleetId = attackerWins ? defenderFleet.fleetId : attackerFleet.fleetId
  const damageSummary = outcome === 'interceptor_warship_advantage'
    ? '拦截战船逼近护航线，运输战船轻损并回写战报。'
    : outcome === 'transport_warship_holds_route'
      ? '运输战船保持航线，拦截方未能形成决定性破坏。'
      : '双方短暂接战，各自轻损后脱离。'
  const lossSummary = 'minimal_settlement_no_fleet_destroyed'
  const navalCombatSettlementId = `naval_combat_settlement_${nextWorld.tick}_${nextWorld.reports.length + 1}`
  const battleReportId = `naval_combat_settlement_report_${nextWorld.tick}_${nextWorld.reports.length + 1}`

  attackerFleet.status = 'intercepted'
  defenderFleet.status = 'intercepted'
  attackerFleet.progressPercent = Math.max(attackerFleet.progressPercent, 50)
  defenderFleet.progressPercent = Math.max(defenderFleet.progressPercent, 50)
  attackerFleet.routeLineStatus = 'route_line_visible'
  defenderFleet.routeLineStatus = 'route_line_visible'
  const damagedFleet = runtime.fleets[loserFleetId]
  damagedFleet.damageState = 'light_damage'
  damagedFleet.repairStatus = 'needs_repair'
  damagedFleet.damageSummary = damageSummary
  damagedFleet.lossSummary = lossSummary
  damagedFleet.lastDamageTick = nextWorld.tick

  prependReport(
    nextWorld,
    nextWorld.tick,
    '海上遭遇战报',
    [
      'reportKind=naval_combat_minimal_settlement; ',
      `navalCombatSettlementId=${navalCombatSettlementId}; `,
      `attackerFleetId=${attackerFleet.fleetId}; `,
      `defenderFleetId=${defenderFleet.fleetId}; `,
      `attackerVesselType=${attacker.type}; `,
      `defenderVesselType=${defender.type}; `,
      `attackerFrameSlotId=${attackerFleet.frameSlotId}; `,
      `defenderFrameSlotId=${defenderFleet.frameSlotId}; `,
      `outcome=${outcome}; `,
      `winnerFleetId=${winnerFleetId}; `,
      `loserFleetId=${loserFleetId}; `,
      `damageSummary=${damageSummary}; `,
      `lossSummary=${lossSummary}; `,
      `damagedFleetId=${damagedFleet.fleetId}; `,
      'damagedFleetDamageState=light_damage; ',
      'damagedFleetRepairStatus=needs_repair; ',
      'maritimeReportResultChipId=maritime_report_result_chip_v1; ',
      'battleReportSurface=battle_report_panel/list/detail; ',
      'navalBattleScope=fleet_combat_minimal_settlement_only; ',
      '本次只结算两支 naval fleet 的确定性最小遭遇，不代表完整海战系统。',
    ].join(''),
    battleReportId,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: '海上遭遇已完成最小结算：结果写入现有战报列表 / 详情。',
    factionId: params.factionId,
    route: routeValidation.route,
    routeStatus: routeValidation.routeStatus,
    navalCombatSettlementId,
    battleReportId,
    attackerFleetId: attackerFleet.fleetId,
    defenderFleetId: defenderFleet.fleetId,
    attackerVesselType: attacker.type,
    defenderVesselType: defender.type,
    attackerVesselRule: attacker.rule,
    defenderVesselRule: defender.rule,
    attackerFrameSlotId: attackerFleet.frameSlotId,
    defenderFrameSlotId: defenderFleet.frameSlotId,
    outcome,
    winnerFleetId,
    loserFleetId,
    damageSummary,
    lossSummary,
    battleReportSurface: 'battle_report_panel/list/detail',
    maritimeReportResultChipId: 'maritime_report_result_chip_v1',
    navalBattleScope: 'fleet_combat_minimal_settlement_only',
    doesNotUseUnitMarker: true,
    damagedFleetId: damagedFleet.fleetId,
    damagedFleetDamageState: 'light_damage',
    damagedFleetRepairStatus: 'needs_repair',
    inventoryFleetId: requestedInventoryFleetId || undefined,
    reusedFleetId: requestedInventoryFleetId || undefined,
    sourceShipyardOrderId: requestedInventoryFleetId ? runtime.fleets[requestedInventoryFleetId]?.shipyardOrderId : undefined,
    fleetDamageState: requestedInventoryFleetId && damagedFleet.fleetId === requestedInventoryFleetId ? 'damaged' : undefined,
    worldNavalCombatUsesInventoryFleet: requestedInventoryFleetId && damagedFleet.fleetId === requestedInventoryFleetId ? true : undefined,
    worldNavalCombatUsesExistingSeaRuntime: requestedInventoryFleetId ? true : undefined,
    worldNavalCombatDoesNotUseUnitMarker: requestedInventoryFleetId ? true : undefined,
    worldNavalCombatDamageRepairScope: requestedInventoryFleetId ? 'inventory_fleet_combat_damage_repair_only_not_full_fleet_ui' : undefined,
    actorAiPlayerId: params.actorAiPlayerId,
  }
}

export function repairNavalFleetDamage(
  world: WorldState,
  params: {
    factionId: FactionId
    fleetId: string
    routeId: string
    actorAiPlayerId?: string
  },
): RepairNavalFleetDamageResult {
  const nextWorld = shallowCloneWorld(world)
  const routeValidation = validateOpenedSeaRouteForRuntime(nextWorld, {
    factionId: params.factionId,
    routeId: params.routeId,
  })
  if (!routeValidation.ok) {
    return routeValidation
  }
  const runtime = ensureNavalRuntime(nextWorld)
  const fleet = runtime.fleets[params.fleetId]
  if (!fleet) {
    return {
      ok: false,
      message: `Unknown naval fleet: ${params.fleetId}`,
      failureCode: 'unknown_fleet',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }
  if (fleet.factionId !== params.factionId) {
    return {
      ok: false,
      message: `Naval fleet ${params.fleetId} does not belong to ${params.factionId}.`,
      failureCode: 'fleet_faction_mismatch',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }
  if (fleet.routeId !== params.routeId) {
    return {
      ok: false,
      message: `Naval fleet ${params.fleetId} is not assigned to route ${params.routeId}.`,
      failureCode: 'fleet_route_mismatch',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }
  if (fleet.damageState !== 'light_damage' || fleet.repairStatus !== 'needs_repair') {
    return {
      ok: false,
      message: 'Naval fleet does not have a minimal damaged state waiting for repair.',
      failureCode: 'fleet_not_damaged',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }
  const vessel = resolveNavalVesselRule(fleet.vesselType)
  if (!vessel) {
    return {
      ok: false,
      message: 'Unknown naval vessel type for fleet repair feedback.',
      failureCode: 'unknown_vessel_type',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }

  fleet.repairStatus = 'returning_to_port'
  fleet.lastRepairTick = nextWorld.tick
  const damageSummary = fleet.damageSummary ?? '船队轻损，需回港整修。'
  const lossSummary = fleet.lossSummary ?? 'minimal_settlement_no_fleet_destroyed'
  const repairFeedbackVisibleCopy = '船队受损 / 回港整修 / 预计恢复'
  const repairReportId = `naval_fleet_repair_report_${nextWorld.tick}_${nextWorld.reports.length + 1}`
  prependReport(
    nextWorld,
    nextWorld.tick,
    '船队回港整修',
    [
      'reportKind=naval_fleet_damage_repair_minimal; ',
      `damagedFleetId=${fleet.fleetId}; `,
      'damageState=light_damage; ',
      'repairStatus=returning_to_port; ',
      `damageSummary=${damageSummary}; `,
      `lossSummary=${lossSummary}; `,
      'repairScope=minimal_damage_status_not_full_fleet_inventory; ',
      'battleReportSurface=battle_report_panel/list/detail; ',
      '本次只证明受损状态与整修反馈，不代表完整舰队库存或造船系统。',
    ].join(''),
    repairReportId,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: '船队受损状态已保留，进入回港整修反馈。',
    factionId: params.factionId,
    route: routeValidation.route,
    routeStatus: routeValidation.routeStatus,
    fleetId: fleet.fleetId,
    vesselType: vessel.type,
    vesselRule: vessel.rule,
    damageState: 'light_damage',
    repairStatus: 'returning_to_port',
    damageSummary,
    lossSummary,
    repairReportId,
    repairFeedbackVisibleCopy,
    repairScope: 'minimal_damage_status_not_full_fleet_inventory',
    movementRuntimeStatus: 'dedicated_naval_runtime_not_land_unit_marker',
    doesNotUseUnitMarker: true,
    actorAiPlayerId: params.actorAiPlayerId ?? fleet.actorAiPlayerId,
  }
}

export function buildNavalWarshipAtHarbor(
  world: WorldState,
  params: {
    factionId: FactionId
    routeId: string
    sourceDockId: string
    overseasContactId: string
    shipClass: string
    actorAiPlayerId?: string
  },
): BuildNavalWarshipAtHarborResult {
  const nextWorld = shallowCloneWorld(world)
  const routeValidation = validateOpenedSeaRouteForRuntime(nextWorld, {
    factionId: params.factionId,
    routeId: params.routeId,
    sourceDockId: params.sourceDockId,
    overseasContactId: params.overseasContactId,
  })
  if (!routeValidation.ok) {
    return routeValidation
  }
  const vessel = resolveNavalVesselRule(params.shipClass)
  if (!vessel) {
    return {
      ok: false,
      message: 'Unknown naval vessel type for shipyard build feedback.',
      failureCode: 'unknown_vessel_type',
      route: routeValidation.route,
      routeStatus: routeValidation.routeStatus,
    }
  }

  const runtime = ensureNavalRuntime(nextWorld)
  const harborId = routeValidation.route.source.id
  const shipyardOrderId = `naval_shipyard_order_${nextWorld.tick}_${Object.keys(runtime.shipyardOrders ?? {}).length + 1}`
  const inventoryFleetId = `naval_shipyard_fleet_${nextWorld.tick}_${Object.keys(runtime.fleets).length + 1}_${vessel.type}`
  const addedShipCount = 1
  const inventoryDelta = 1
  const previousInventory = runtime.harborInventories?.[harborId]
  const previousShipCount = previousInventory?.shipCountsByClass?.[vessel.type] ?? 0
  const totalShipCount = (previousInventory?.totalShipCount ?? 0) + inventoryDelta
  const shipyardScope = 'minimal_shipyard_inventory_not_full_naval_economy'
  const shipyardFeedbackVisibleCopy = '船坞开工 / 新船入编 / 舰队补强 / 可再出海'

  runtime.shipyardOrders![shipyardOrderId] = {
    shipyardOrderId,
    factionId: params.factionId,
    harborId,
    routeId: routeValidation.route.id,
    sourceDockId: routeValidation.route.source.id,
    overseasContactId: routeValidation.route.destination.id,
    shipClass: vessel.type,
    buildStatus: 'recorded',
    addedShipCount,
    inventoryDelta,
    inventoryFleetId,
    scope: shipyardScope,
    createdTick: nextWorld.tick,
    actorAiPlayerId: params.actorAiPlayerId,
  }
  runtime.harborInventories![harborId] = {
    harborId,
    factionId: params.factionId,
    totalShipCount,
    shipCountsByClass: {
      ...(previousInventory?.shipCountsByClass ?? {}),
      [vessel.type]: previousShipCount + inventoryDelta,
    },
    lastOrderId: shipyardOrderId,
    lastUpdatedTick: nextWorld.tick,
  }
  runtime.fleets[inventoryFleetId] = {
    fleetId: inventoryFleetId,
    factionId: params.factionId,
    routeId: routeValidation.route.id,
    sourceDockId: routeValidation.route.source.id,
    overseasContactId: routeValidation.route.destination.id,
    vesselType: vessel.type,
    frameSlotId: vessel.rule.assetSlotId,
    carriedUnitIds: [],
    carriedUnitCapacity: vessel.rule.carriedUnitCapacity,
    combatBonusPercent: vessel.rule.combatBonusPercent,
    speedTier: vessel.rule.speedTier,
    status: 'in_port',
    createdTick: nextWorld.tick,
    progressPercent: 0,
    runtimeAdapterStatus: 'naval_runtime_adapter_v0_1',
    movementRuntimeStatus: 'dedicated_naval_runtime_not_land_unit_marker',
    doesNotUseUnitMarker: true,
    shipyardOrderId,
    shipyardBuildStatus: 'recorded',
    actorAiPlayerId: params.actorAiPlayerId,
  }

  const shipyardReportId = `naval_shipyard_build_report_${nextWorld.tick}_${nextWorld.reports.length + 1}`
  prependReport(
    nextWorld,
    nextWorld.tick,
    '船坞入编记录',
    [
      'reportKind=naval_shipyard_build_minimal; ',
      `harborId=${harborId}; `,
      `shipyardOrderId=${shipyardOrderId}; `,
      `shipClass=${vessel.type}; `,
      'buildStatus=recorded; ',
      `inventoryFleetId=${inventoryFleetId}; `,
      `addedShipCount=${addedShipCount}; `,
      `inventoryDelta=${inventoryDelta}; `,
      `shipyardScope=${shipyardScope}; `,
      'battleReportSurface=battle_report_panel/list/detail; ',
      '本次只证明船坞订单与舰队库存入编，不代表完整造船经济或港口库存 UI。',
    ].join(''),
    shipyardReportId,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: '船坞订单已记录，新船入编最小 naval runtime。',
    factionId: params.factionId,
    route: routeValidation.route,
    routeStatus: routeValidation.routeStatus,
    harborId,
    shipyardOrderId,
    shipClass: vessel.type,
    buildStatus: 'recorded',
    inventoryFleetId,
    fleetId: inventoryFleetId,
    vesselRule: vessel.rule,
    addedShipCount,
    inventoryDelta,
    totalShipCount,
    shipyardReportId,
    shipyardFeedbackVisibleCopy,
    shipyardScope,
    movementRuntimeStatus: 'dedicated_naval_runtime_not_land_unit_marker',
    doesNotUseUnitMarker: true,
    actorAiPlayerId: params.actorAiPlayerId,
  }
}

function resolveSeaPatrolInterceptOutcome(attackerType: NavalVesselType, defenderType: NavalVesselType): SeaPatrolInterceptOutcome {
  if (attackerType === 'interceptor_warship' && defenderType === 'transport_warship') {
    return 'interceptor_advantage'
  }
  if (attackerType === 'light_patrol_warship' && defenderType !== 'light_patrol_warship') {
    return 'light_patrol_evade'
  }
  if (attackerType === 'transport_warship' && defenderType === 'interceptor_warship') {
    return 'transport_numbers_advantage'
  }
  return 'balanced_maritime_clash'
}

export function seaPatrolIntercept(
  world: WorldState,
  params: {
    factionId: FactionId
    routeId: string
    sourceDockId: string
    overseasContactId: string
    attackerVesselType: string
    defenderVesselType: string
    actorAiPlayerId?: string
    inventoryFleetId?: string
  },
): SeaPatrolInterceptResult {
  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[params.factionId]
  if (!faction) {
    return {
      ok: false,
      message: `Unknown faction: ${params.factionId}`,
      failureCode: 'unknown_faction',
    }
  }

  const authority = ensureSeaRouteAuthority(nextWorld)
  const route = authority.routes.find((candidate) => candidate.id === params.routeId)
  if (!route) {
    return {
      ok: false,
      message: `Unknown sea route: ${params.routeId}`,
      failureCode: 'unknown_sea_route',
    }
  }
  if (route.source.id !== params.sourceDockId || route.destination.id !== params.overseasContactId) {
    return {
      ok: false,
      message: `Sea patrol intercept route endpoint mismatch: ${params.routeId}`,
      failureCode: 'source_dock_mismatch',
      route,
      routeStatus: authority.routeStatuses[route.id],
    }
  }

  const routeStatus = authority.routeStatuses[route.id]
  if (route.gameplayState !== 'route_open' || routeStatus?.status !== 'route_open') {
    return {
      ok: false,
      message: 'Sea patrol intercept requires the W6 sea route to be opened first.',
      failureCode: 'sea_route_not_open',
      route,
      routeStatus,
    }
  }

  if (!hasPatrolScoutReportForRoute(nextWorld, route.id)) {
    return {
      ok: false,
      message: 'Sea patrol intercept requires a W8 seaPatrolScout report on this route first.',
      failureCode: 'missing_patrol_scout_report',
      route,
      routeStatus,
    }
  }

  const attacker = resolveNavalVesselRule(params.attackerVesselType)
  const defender = resolveNavalVesselRule(params.defenderVesselType)
  if (!attacker || !defender) {
    return {
      ok: false,
      message: 'Unknown naval vessel type for sea patrol intercept.',
      failureCode: 'unknown_vessel_type',
      route,
      routeStatus,
    }
  }

  const resourcesSpent = { actionPoints: 1, food: 2 }
  if (faction.actionPoints < resourcesSpent.actionPoints || faction.food < resourcesSpent.food) {
    return {
      ok: false,
      message: `Sea patrol intercept requires ${resourcesSpent.actionPoints} action point and ${resourcesSpent.food} food.`,
      failureCode: 'insufficient_resources',
      route,
      routeStatus,
    }
  }

  faction.actionPoints -= resourcesSpent.actionPoints
  faction.food -= resourcesSpent.food
  const reuse = reuseInventoryFleetForSeaRuntime(nextWorld, {
    factionId: params.factionId,
    routeId: params.routeId,
    sourceDockId: params.sourceDockId,
    overseasContactId: params.overseasContactId,
    inventoryFleetId: params.inventoryFleetId,
    nextStatus: 'intercepting',
    progressPercent: 60,
    actorAiPlayerId: params.actorAiPlayerId,
  })
  if (reuse && !reuse.ok) {
    return {
      ok: false,
      message: reuse.message,
      failureCode: reuse.failureCode,
      route,
      routeStatus,
    }
  }

  const interceptOutcome = resolveSeaPatrolInterceptOutcome(attacker.type, defender.type)
  const interceptReportId = `sea_patrol_intercept_report_${nextWorld.tick}_${nextWorld.reports.length + 1}`
  prependReport(
    nextWorld,
    nextWorld.tick,
    '海上拦截战报',
    [
      'reportKind=naval_patrol_intercept; ',
      `route=${route.id}; `,
      `sourceDock=${route.source.id}; `,
      `overseasContact=${route.destination.id}; `,
      params.actorAiPlayerId ? `actorAiPlayerId=${params.actorAiPlayerId}; ` : '',
      reuse?.ok ? `reusedFleetId=${reuse.reusedFleetId}; ` : '',
      reuse?.ok ? `sourceShipyardOrderId=${reuse.sourceShipyardOrderId}; ` : '',
      `attackerVesselType=${attacker.type}; `,
      `attackerVesselLabel=${attacker.rule.label}; `,
      `attacker_capacity=${attacker.rule.carriedUnitCapacity}; `,
      `attacker_combatBonusPercent=${attacker.rule.combatBonusPercent}; `,
      `defenderVesselType=${defender.type}; `,
      `defenderVesselLabel=${defender.rule.label}; `,
      `transport_capacity=${NAVAL_VESSEL_RULES.transport_warship.carriedUnitCapacity}; `,
      `defender_capacity=${defender.rule.carriedUnitCapacity}; `,
      `combatBonusPercent=${attacker.rule.combatBonusPercent}; `,
      `interceptOutcome=${interceptOutcome}; `,
      'maritimeReportResultChipId=maritime_report_result_chip_v1; ',
      'battleReportSurface=battle_report_panel/list/detail; ',
      'navalBattleScope=patrol_intercept_minimal_battle_report_only; ',
      '本次只结算轻量巡逻拦截并写入既有战报，不代表完整海战系统。',
    ].join(''),
    interceptReportId,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: '海上拦截已结算：结果写入现有战报列表 / 详情。',
    factionId: params.factionId,
    route,
    routeStatus,
    interceptReportId,
    interceptOutcome,
    attackerVesselType: attacker.type,
    defenderVesselType: defender.type,
    attackerVesselRule: attacker.rule,
    defenderVesselRule: defender.rule,
    battleReportSurface: 'battle_report_panel/list/detail',
    maritimeReportResultChipId: 'maritime_report_result_chip_v1',
    navalBattleScope: 'patrol_intercept_minimal_battle_report_only',
    resourcesSpent,
    reusedFleetId: reuse?.ok ? reuse.reusedFleetId : undefined,
    sourceShipyardOrderId: reuse?.ok ? reuse.sourceShipyardOrderId : undefined,
    harborId: reuse?.ok ? reuse.harborId : undefined,
    reuseStatus: reuse?.ok ? 'route_patrol_intercept_reused' : undefined,
    worldNavalReuseUsesExistingSeaRuntime: reuse?.ok ? reuse.worldNavalReuseUsesExistingSeaRuntime : undefined,
    worldNavalReuseDoesNotUseUnitMarker: reuse?.ok ? reuse.worldNavalReuseDoesNotUseUnitMarker : undefined,
    worldNavalReuseScope: reuse?.ok ? reuse.worldNavalReuseScope : undefined,
    actorAiPlayerId: params.actorAiPlayerId,
  }
}

type SetAiResourceTransferPolicyResult =
  | {
      ok: true
      world: WorldState
      message: string
      factionId: string
      policy: NonNullable<WorldState['factions'][string]['aiResourceTransferPolicy']>
    }
  | {
      ok: false
      message: string
      failureCode: AiResourceTransferPolicyFailureCode
    }

type ClaimGovernorResourceInboxResult =
  | {
      ok: true
      world: WorldState
      message: string
      governorPlayerId: string
      claimedTransferIds: string[]
      claimedResources: ResourceTransferBundle
    }
  | {
      ok: false
      message: string
      failureCode: GovernorResourceInboxClaimFailureCode
    }

type GatherAiResourceTileResult =
  | {
      ok: true
      world: WorldState
      message: string
      claimId: string
      aiPlayerId: string
      unitId: string
      tileId: string
      resources: ResourceTransferBundle
    }
  | {
      ok: false
      message: string
      failureCode: AiResourceGatherFailureCode
    }

type OccupyTileResult =
  | {
      ok: true
      world: WorldState
      message: string
      aiPlayerId?: string
      unitId: string
      tileId: string
      previousOwner: string
      occupied: boolean
      guardTemplateId?: string
      guardBattle?: {
        outcome: 'win' | 'loss'
        attackerLoss: number
        defenderLoss: number
        attackerStrengthBefore: number
        attackerStrengthAfter: number
        attackerSupplyBefore: number
        attackerSupplyAfter: number
        guardStrengthBefore: number
        guardStrengthAfter: number
        summary: string
        rounds: BattleReportRoundDetail[]
      }
      heroGrowth?: HeroExperienceGrowthResult
      pvpBattle?: {
        outcome: 'win' | 'loss' | 'draw'
        reportKind: 'field_battle'
        attackerLoss: number
        defenderLoss: number
        attackerStrengthBefore: number
        attackerStrengthAfter: number
        attackerSupplyBefore: number
        attackerSupplyAfter: number
        defenderStrengthBefore: number
        defenderStrengthAfter: number
        defenderUnitIds: string[]
        summary: string
        rounds: BattleReportRoundDetail[]
      }
    }
  | {
      ok: false
      message: string
      failureCode: TileOccupyFailureCode
    }

type HeroExperienceGrowthResult = {
  heroId: string
  previousLevel: number
  nextLevel: number
  previousExp: number
  nextExp: number
  expGained: number
  hero: WorldActionHeroReadModel
}

type TroopHealResult =
  | {
      ok: true
      world: WorldState
      message: string
      aiPlayerId: string
      unitId: string
      strengthBefore: number
      strengthAfter: number
      supplyBefore: number
      supplyAfter: number
      resourcesSpent: {
        actionPoints: number
        food: number
      }
    }
  | {
      ok: false
      message: string
      failureCode: TroopHealFailureCode
    }

type RecruitProspectHeroResult =
  | {
      ok: true
      world: WorldState
      message: string
      heroId?: string
      heroIds: string[]
      heroNames: string[]
      poolId: string
    }
  | { ok: false; message: string }

type SetRecruitSelectedPoolResult =
  | { ok: true; world: WorldState; message: string; factionId: string; poolId: string }
  | { ok: false; message: string }

type EnqueueAffairResult =
  | { ok: true; world: WorldState; message: string; cityId: string; affairId: string }
  | { ok: false; message: string }

type SetGeneralActiveHeroResult =
  | { ok: true; world: WorldState; message: string; factionId: string; heroId: string }
  | { ok: false; message: string }

type SetGeneralTacticResult =
  | { ok: true; world: WorldState; message: string; factionId: string; heroId: string; tacticId: 'assault' | 'guard' | 'logistics' }
  | { ok: false; message: string }

type SetAiContextFocusResult =
  | { ok: true; world: WorldState; message: string; factionId: string; contextFocusId: string }
  | { ok: false; message: string }

type QueueAiAgendaActionResult =
  | {
      ok: true
      world: WorldState
      message: string
      factionId: string
      agendaActionId: 'agenda_expand' | 'agenda_support' | 'agenda_stabilize' | 'agenda_recover' | 'agenda_redeploy'
      requestId: string
    }
  | {
      ok: false
      message: string
      failureCode:
        | QueuePlanFailureCode
        | 'invalid_ai_agenda_action'
        | 'unknown_faction'
        | 'no_primary_unit'
        | 'missing_target_tile'
    }

export type AllianceHelpFailureCode =
  | 'unknown_faction'
  | 'missing_alliance_region'
  | 'missing_alliance_directive'
  | 'missing_alliance_commander'
  | 'missing_target_tile'
  | 'insufficient_action_points'

export type RewardClaimFailureCode =
  | 'unknown_faction'
  | 'missing_claimable_reward'

export type WorldAffairsNodeRewardClaimFailureCode =
  | 'unknown_faction'
  | 'scenario_mismatch'
  | 'unknown_scenario'
  | 'unknown_scenario_node'
  | 'world_affairs_node_not_achieved'
  | 'world_affairs_node_already_claimed'
  | 'invalid_world_affairs_reward'

export type WorldAffairsNodeAchieveFailureCode =
  | 'unknown_faction'
  | 'scenario_mismatch'
  | 'unknown_scenario'
  | 'unknown_scenario_node'
  | 'world_affairs_node_not_active'
  | 'world_affairs_node_already_achieved'

export type TaskPrototypeAchieveFailureCode =
  | 'unknown_faction'
  | 'scenario_mismatch'
  | 'unknown_scenario'
  | 'unknown_task'
  | 'task_not_active'
  | 'task_already_achieved'

export type TaskRewardClaimFailureCode =
  | 'unknown_faction'
  | 'scenario_mismatch'
  | 'unknown_scenario'
  | 'unknown_task'
  | 'task_not_achieved'
  | 'task_already_claimed'
  | 'invalid_task_reward'

export type WorldTaskEventRecordFailureCode =
  | 'unknown_faction'
  | 'scenario_mismatch'
  | 'unknown_scenario'
  | 'unknown_task'

export type IssueClaimableRewardFailureCode =
  | 'unknown_faction'
  | 'invalid_reward'
  | 'reward_already_pending'
  | 'daily_welfare_already_issued'

type IssueClaimableRewardResult =
  | {
      ok: true
      world: WorldState
      message: string
      factionId: string
      rewardId: string
      ledgerKey?: string
      source: ClaimableRewardSource
      pendingRewardCount: number
    }
  | {
      ok: false
      message: string
      failureCode: IssueClaimableRewardFailureCode
    }

type AllianceHelpResult =
  | {
      ok: true
      world: WorldState
      message: string
      factionId: string
      regionId: string
      commanderId: string
      supportLevel: number
      commanderReadiness: number
    }
  | {
      ok: false
      message: string
      failureCode: AllianceHelpFailureCode
    }

type RewardClaimResult =
  | {
      ok: true
      world: WorldState
      message: string
      rewardId: string
      foodReward: number
      actionPointReward: number
      pendingRewardCount: number
      source: string
    }
  | {
      ok: false
      message: string
      failureCode: RewardClaimFailureCode
    }

type WorldAffairsNodeRewardClaimResult =
  | {
      ok: true
      world: WorldState
      message: string
      factionId: string
      scenarioId: string
      scenarioVersion: string
      seasonRunId: string
      nodeId: string
      nodeTitle: string
      rewardTotals: ScenarioRewardTotals
    }
  | {
      ok: false
      message: string
      failureCode: WorldAffairsNodeRewardClaimFailureCode
    }

type WorldAffairsNodeAchieveResult =
  | {
      ok: true
      world: WorldState
      message: string
      factionId: string
      scenarioId: string
      scenarioVersion: string
      seasonRunId: string
      nodeId: string
      nodeTitle: string
      activeNodeId: string | null
    }
  | {
      ok: false
      message: string
      failureCode: WorldAffairsNodeAchieveFailureCode
    }

type TaskPrototypeAchieveResult =
  | {
      ok: true
      world: WorldState
      message: string
      factionId: string
      scenarioId: string
      scenarioVersion: string
      seasonRunId: string
      taskId: string
      taskTitle: string
      activeTaskId: string | null
    }
  | {
      ok: false
      message: string
      failureCode: TaskPrototypeAchieveFailureCode
    }

type TaskRewardClaimResult =
  | {
      ok: true
      world: WorldState
      message: string
      factionId: string
      scenarioId: string
      scenarioVersion: string
      seasonRunId: string
      taskId: string
      taskTitle: string
      rewardTotals: TaskRewardTotals
      chapterRewardTotals: TaskRewardTotals | null
      completedChapterId: string
      completedChapterTitle: string
      activeChapterId: string
      activeTaskId: string | null
      advancedToNextChapter: boolean
    }
  | {
      ok: false
      message: string
      failureCode: TaskRewardClaimFailureCode
    }

type WorldTaskEventRecordResult =
  | {
      ok: true
      world: WorldState
      message: string
      factionId: string
      scenarioId: string
      scenarioVersion: string
      seasonRunId: string
      taskId: string
      taskTitle: string
      event: WorldTaskEvent
      reused: boolean
    }
  | {
      ok: false
      message: string
      failureCode: WorldTaskEventRecordFailureCode
    }

type ScenarioRewardTotals = {
  jade: number
  copper: number
  food: number
  wood: number
  stone: number
  iron: number
}

type TaskRewardTotals = {
  copper: number
  food: number
  wood: number
  stone: number
  iron: number
}

type CityTechUpgradeRule = {
  maxLevel: number
  actionPoints: number
  food: number
  minFootprint: 1 | 4 | 9 | 16
}

type RepresentativeTacticalLoadout = {
  innateSkillId: string
  equippedSkillIds: string[]
}

type RepresentativeTacticalEncounter = {
  defender: Unit
  report: TacticalDuelReport
}

const WORLD_TACTICAL_STRENGTH_SCALE = 100

const CITY_TECH_UPGRADE_RULES: Record<CityTechTrackId, CityTechUpgradeRule> = {
  governance: { maxLevel: 5, actionPoints: 1, food: 3, minFootprint: 1 },
  logistics: { maxLevel: 5, actionPoints: 1, food: 4, minFootprint: 4 },
  defense: { maxLevel: 5, actionPoints: 2, food: 5, minFootprint: 4 },
  recruitment: { maxLevel: 5, actionPoints: 2, food: 6, minFootprint: 9 },
}

const CITY_TECH_LABELS: Record<CityTechTrackId, string> = {
  governance: 'Governance Core',
  logistics: 'Logistics Grid',
  defense: 'Fortress Works',
  recruitment: 'Recruitment Drill',
}

export function resolveTacticalSkillUpgradeResources(previousLevel: number): UpgradeResourceSpend {
  const currentLevel = Number.isInteger(previousLevel) ? previousLevel : TACTICAL_SKILL_MIN_LEVEL
  return compactUpgradeResourceSpend({
    copper: Math.max(1, currentLevel + 1) * TACTICAL_SKILL_COPPER_COST_PER_NEXT_LEVEL,
  })
}

export function resolveCityTechUpgradeResources(
  techId: CityTechTrackId,
  currentLevel: number,
): UpgradeResourceSpend {
  const rule = CITY_TECH_UPGRADE_RULES[techId]
  if (!rule) {
    return {}
  }
  const normalizedLevel = Math.max(0, Math.trunc(Number(currentLevel) || 0))
  const nextLevel = normalizedLevel + 1
  return compactUpgradeResourceSpend({
    actionPoints: rule.actionPoints + Math.floor(normalizedLevel / 2),
    food: rule.food + normalizedLevel * 2,
    wood: techId === 'governance' || techId === 'logistics' ? nextLevel : 0,
    stone: techId === 'logistics' || techId === 'defense' ? nextLevel : 0,
    iron: techId === 'defense' || techId === 'recruitment' ? nextLevel : 0,
    copper: techId === 'governance' || techId === 'recruitment' ? nextLevel * 2 : 0,
  })
}

const EMPTY_CITY_TECH_LEVELS: CityTechLevels = {
  governance: 0,
  logistics: 0,
  defense: 0,
  recruitment: 0,
}

function resolveCityBuildingTechId(groupId: string, buildingId: string): CityTechTrackId | null {
  switch (buildingId) {
    case 'market_plaza':
    case 'tax_office':
    case 'policy_hall':
      return 'governance'
    case 'granary':
    case 'storage_bureau':
    case 'workshop':
      return 'logistics'
    case 'relay_station':
    case 'defense_board':
      return 'defense'
    case 'recruit_policy_board':
      return 'recruitment'
    default:
      break
  }
  switch (groupId) {
    case 'market':
      return 'governance'
    case 'tax':
      return 'logistics'
    case 'policy':
      return 'governance'
    default:
      return null
  }
}

function resolveCityBuildingAffairId(groupId: string): string | null {
  switch (groupId) {
    case 'market':
      return 'queue_market_upgrade'
    case 'tax':
      return 'queue_tax_upgrade'
    case 'policy':
      return 'queue_policy_review'
    default:
      return null
  }
}

export function getTileById(world: WorldState, tileId: string) {
  // 保留原始接口兼容性；热路径请改用 getTileByIdFast（worldIndex.ts）
  return getTileByIdFast(world, tileId)
}

export function getUnitById(world: WorldState, unitId: string) {
  return world.units.find((unit) => unit.id === unitId)
}

export function getUnitsOnTile(world: WorldState, tileId: string) {
  return world.units.filter((unit) => unit.tileId === tileId)
}

function normalizeHeroAuthorityId(heroId: string) {
  const trimmed = heroId.trim()
  return trimmed.startsWith('hero_') ? trimmed.slice('hero_'.length) : trimmed
}

function findUnitByHeroAuthorityId(world: WorldState, heroId: string) {
  const normalizedHeroId = normalizeHeroAuthorityId(heroId)
  return world.units.find((unit) => normalizeHeroAuthorityId(unit.hero.id) === normalizedHeroId)
}

function findExistingReserveFormation(
  world: WorldState,
  factionId: string,
  heroId: string,
  tileId: string,
  coHeroIds: string[],
): Unit | undefined {
  const normalizedHeroId = normalizeHeroAuthorityId(heroId)
  const normalizedCoHeroIds = coHeroIds.map((candidateId) => normalizeHeroAuthorityId(candidateId))
  return world.units.find((unit) => {
    if (unit.faction !== factionId || unit.tileId !== tileId) return false
    if (normalizeHeroAuthorityId(unit.hero.id) !== normalizedHeroId) return false
    const unitCoHeroIds = (unit.coHeroes ?? []).map((hero) => normalizeHeroAuthorityId(hero.id))
    if (unitCoHeroIds.length !== normalizedCoHeroIds.length) return false
    return normalizedCoHeroIds.every((candidateId, index) => unitCoHeroIds[index] === candidateId)
  })
}

function resolveHeroQualityCap(quality: Unit['hero']['quality']) {
  const [qualityTierRaw] = quality.split('-', 1)
  const qualityTier = Number.parseInt(qualityTierRaw ?? '', 10)
  if (!Number.isFinite(qualityTier)) {
    return 1
  }
  return Math.max(1, Math.min(5, qualityTier))
}

function normalizeHeroExp(hero: Unit['hero']) {
  const exp = typeof hero.exp === 'number' && Number.isFinite(hero.exp) ? hero.exp : 0
  return Math.max(0, Math.floor(exp))
}

function normalizeHeroStarLevel(hero: Unit['hero']) {
  const starLevel = typeof hero.starLevel === 'number' && Number.isFinite(hero.starLevel) ? hero.starLevel : 0
  return Math.max(0, Math.floor(starLevel))
}

function buildWorldActionHeroReadModel(unit: Unit): WorldActionHeroReadModel {
  return {
    heroId: normalizeHeroAuthorityId(unit.hero.id),
    name: unit.hero.name,
    factionId: unit.faction,
    unitId: unit.id,
    level: Math.max(1, Math.floor(unit.hero.level)),
    exp: normalizeHeroExp(unit.hero),
    starLevel: normalizeHeroStarLevel(unit.hero),
    starCap: resolveHeroQualityCap(unit.hero.quality),
  }
}

function applyHeroResourceGuardExperience(unit: Unit, resourceLevel: number): HeroExperienceGrowthResult {
  const previousLevel = Math.max(1, Math.floor(unit.hero.level))
  const previousExp = normalizeHeroExp(unit.hero)
  const expGained = Math.max(1, Math.floor(Math.max(1, resourceLevel) * HERO_RESOURCE_GUARD_EXP_PER_LEVEL))
  let nextLevel = previousLevel
  let nextExp = previousExp + expGained

  while (nextLevel < HERO_LEVEL_MAX && nextExp >= HERO_LEVEL_EXP_THRESHOLD) {
    nextExp -= HERO_LEVEL_EXP_THRESHOLD
    nextLevel += 1
  }
  if (nextLevel >= HERO_LEVEL_MAX) {
    nextExp = Math.min(nextExp, HERO_LEVEL_EXP_THRESHOLD - 1)
  }

  unit.hero.level = nextLevel
  unit.hero.exp = nextExp

  return {
    heroId: normalizeHeroAuthorityId(unit.hero.id),
    previousLevel,
    nextLevel,
    previousExp,
    nextExp,
    expGained,
    hero: buildWorldActionHeroReadModel(unit),
  }
}

function validateHeroFactionForGrowth(
  world: WorldState,
  heroId: string,
  factionId: string,
): { unit?: Unit; failureCode?: HeroGrowthFailureCode; message?: string } {
  if (!world.factions[factionId]) {
    return {
      failureCode: 'unknown_faction',
      message: `Unknown faction ${factionId}.`,
    }
  }

  const unit = findUnitByHeroAuthorityId(world, heroId)
  if (!unit) {
    return {
      failureCode: 'unknown_hero',
      message: `Hero ${heroId} is not present in the world roster.`,
    }
  }

  if (unit.faction !== factionId) {
    return {
      unit,
      failureCode: 'hero_faction_mismatch',
      message: `Hero ${heroId} belongs to ${resolveFactionDisplayLabel(unit.faction)}, not ${resolveFactionDisplayLabel(factionId)}.`,
    }
  }

  return { unit }
}

export function upgradeTacticalSkill(
  world: WorldState,
  heroId: string,
  skillId: string,
  factionId: string = resolveFallbackFactionId(world),
): TacticalSkillUpgradeResult {
  const normalizedHeroId = normalizeHeroAuthorityId(heroId)
  const normalizedSkillId = skillId.trim()
  if (!world.factions[factionId]) {
    return {
      ok: false,
      failureCode: 'unknown_faction',
      heroId: normalizedHeroId,
      skillId: normalizedSkillId,
      message: `Unknown faction ${factionId}.`,
    }
  }

  const unit = findUnitByHeroAuthorityId(world, normalizedHeroId)
  if (!unit) {
    return {
      ok: false,
      failureCode: 'unknown_hero',
      heroId: normalizedHeroId,
      skillId: normalizedSkillId,
      message: `Hero ${normalizedHeroId} is not present in the world roster.`,
    }
  }

  if (unit.faction !== factionId) {
    return {
      ok: false,
      failureCode: 'hero_faction_mismatch',
      heroId: normalizedHeroId,
      skillId: normalizedSkillId,
      message: `Hero ${normalizedHeroId} belongs to ${resolveFactionDisplayLabel(unit.faction)}, not ${resolveFactionDisplayLabel(factionId)}.`,
    }
  }

  const slotsByHeroId = world.slgDomainState?.generalStateByFaction?.[factionId]?.tacticalSkillSlotsByHeroId
  const slot = slotsByHeroId?.[normalizedHeroId] ?? slotsByHeroId?.[heroId]
  if (!slot) {
    return {
      ok: false,
      failureCode: 'missing_skill_slot',
      heroId: normalizedHeroId,
      skillId: normalizedSkillId,
      message: `Hero ${normalizedHeroId} has no tactical skill slot authority state.`,
    }
  }

  if (!slot.equippedSkillIds.includes(normalizedSkillId)) {
    return {
      ok: false,
      failureCode: 'skill_not_equipped',
      heroId: normalizedHeroId,
      skillId: normalizedSkillId,
      message: `Skill ${normalizedSkillId} is not equipped by hero ${normalizedHeroId}.`,
    }
  }

  const previousLevel = slot.equippedSkillLevelsById?.[normalizedSkillId]
  if (previousLevel === undefined) {
    return {
      ok: false,
      failureCode: 'missing_skill_level',
      heroId: normalizedHeroId,
      skillId: normalizedSkillId,
      message: `Skill ${normalizedSkillId} is equipped by hero ${normalizedHeroId}, but no runtime level is recorded.`,
    }
  }

  if (!Number.isInteger(previousLevel) || previousLevel < TACTICAL_SKILL_MIN_LEVEL || previousLevel > TACTICAL_SKILL_MAX_LEVEL) {
    return {
      ok: false,
      failureCode: 'skill_level_out_of_range',
      heroId: normalizedHeroId,
      skillId: normalizedSkillId,
      previousLevel,
      message: `Skill ${normalizedSkillId} level ${previousLevel} is outside ${TACTICAL_SKILL_MIN_LEVEL}-${TACTICAL_SKILL_MAX_LEVEL}.`,
    }
  }

  if (previousLevel >= TACTICAL_SKILL_MAX_LEVEL) {
    return {
      ok: false,
      failureCode: 'skill_level_at_max',
      heroId: normalizedHeroId,
      skillId: normalizedSkillId,
      previousLevel,
      message: `Skill ${normalizedSkillId} is already Lv.${TACTICAL_SKILL_MAX_LEVEL}.`,
    }
  }

  const resourcesSpent = resolveTacticalSkillUpgradeResources(previousLevel)
  const nextWorld = shallowCloneWorld(world)
  if (!spendFactionUpgradeResources(nextWorld, factionId, resourcesSpent)) {
    return {
      ok: false,
      failureCode: 'insufficient_resources',
      heroId: normalizedHeroId,
      skillId: normalizedSkillId,
      previousLevel,
      resourcesSpent,
      message: `Insufficient resources. Need ${formatUpgradeResourceSpend(resourcesSpent)}.`,
    }
  }

  nextWorld.slgDomainState ??= {}
  nextWorld.slgDomainState.generalStateByFaction ??= {}
  const currentGeneralState = nextWorld.slgDomainState.generalStateByFaction[factionId] ?? {}
  const currentSlots = currentGeneralState.tacticalSkillSlotsByHeroId ?? {}
  const currentSlot = currentSlots[normalizedHeroId] ?? currentSlots[heroId] ?? slot
  const nextLevel = previousLevel + 1
  nextWorld.slgDomainState.generalStateByFaction[factionId] = {
    ...currentGeneralState,
    tacticalSkillSlotsByHeroId: {
      ...currentSlots,
      [normalizedHeroId]: {
        ...currentSlot,
        equippedSkillIds: [...currentSlot.equippedSkillIds],
        equippedSkillLevelsById: {
          ...(currentSlot.equippedSkillLevelsById ?? {}),
          [normalizedSkillId]: nextLevel,
        },
        updatedTick: nextWorld.tick,
        updatedWorldVersion: nextWorld.worldVersion + 1,
      },
    },
    updatedTick: nextWorld.tick,
  }

  prependReport(
    nextWorld,
    nextWorld.tick,
    '战法升级',
    `${unit.hero.name} 的 ${normalizedSkillId} 已从 Lv.${previousLevel} 提升至 Lv.${nextLevel}，消耗 ${formatUpgradeResourceSpend(resourcesSpent)}。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    heroId: normalizedHeroId,
    skillId: normalizedSkillId,
    previousLevel,
    nextLevel,
    resourcesSpent,
    message: `${unit.hero.name} 的战法 ${normalizedSkillId} 已升级至 Lv.${nextLevel}。`,
  }
}

export function upgradeHeroLevel(
  world: WorldState,
  heroId: string,
  factionId: string = resolveFallbackFactionId(world),
): HeroLevelUpgradeResult {
  const normalizedHeroId = normalizeHeroAuthorityId(heroId)
  const validation = validateHeroFactionForGrowth(world, normalizedHeroId, factionId)
  if (validation.failureCode || !validation.unit) {
    return {
      ok: false,
      failureCode: validation.failureCode ?? 'unknown_hero',
      heroId: normalizedHeroId,
      message: validation.message ?? `Hero ${normalizedHeroId} is not available.`,
    }
  }

  const previousLevel = Math.max(1, Math.floor(validation.unit.hero.level))
  if (previousLevel >= HERO_LEVEL_MAX) {
    return {
      ok: false,
      failureCode: 'hero_level_at_max',
      heroId: normalizedHeroId,
      previousLevel,
      message: `Hero ${normalizedHeroId} is already Lv.${HERO_LEVEL_MAX}.`,
    }
  }

  const nextWorld = shallowCloneWorld(world)
  const nextUnit = getUnitById(nextWorld, validation.unit.id)
  if (!nextUnit) {
    return {
      ok: false,
      failureCode: 'unknown_hero',
      heroId: normalizedHeroId,
      message: `Hero ${normalizedHeroId} disappeared during growth resolution.`,
    }
  }

  const resourcesSpent = {
    actionPoints: HERO_LEVEL_UPGRADE_ACTION_POINTS,
    food: HERO_LEVEL_UPGRADE_FOOD,
  }
  if (!spendResources(nextWorld, factionId, resourcesSpent.actionPoints, resourcesSpent.food)) {
    return {
      ok: false,
      failureCode: 'insufficient_resources',
      heroId: normalizedHeroId,
      previousLevel,
      message: `Insufficient resources. Need ${resourcesSpent.actionPoints} AP and ${resourcesSpent.food} food.`,
    }
  }

  const nextLevel = previousLevel + 1
  nextUnit.hero.level = nextLevel
  nextUnit.hero.exp = normalizeHeroExp(nextUnit.hero)
  prependReport(
    nextWorld,
    nextWorld.tick,
    '武将升级',
    `${nextUnit.hero.name} 已从 Lv.${previousLevel} 提升至 Lv.${nextLevel}。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    heroId: normalizedHeroId,
    previousLevel,
    nextLevel,
    resourcesSpent,
    hero: buildWorldActionHeroReadModel(nextUnit),
    message: `${nextUnit.hero.name} 已升级至 Lv.${nextLevel}。`,
  }
}

export function upgradeHeroStar(
  world: WorldState,
  heroId: string,
  factionId: string = resolveFallbackFactionId(world),
): HeroStarUpgradeResult {
  const normalizedHeroId = normalizeHeroAuthorityId(heroId)
  const validation = validateHeroFactionForGrowth(world, normalizedHeroId, factionId)
  if (validation.failureCode || !validation.unit) {
    return {
      ok: false,
      failureCode: validation.failureCode ?? 'unknown_hero',
      heroId: normalizedHeroId,
      message: validation.message ?? `Hero ${normalizedHeroId} is not available.`,
    }
  }

  const starCap = resolveHeroQualityCap(validation.unit.hero.quality)
  const previousStarLevel = normalizeHeroStarLevel(validation.unit.hero)
  if (previousStarLevel >= starCap) {
    return {
      ok: false,
      failureCode: 'hero_star_at_max',
      heroId: normalizedHeroId,
      previousStarLevel,
      message: `Hero ${normalizedHeroId} is already at star cap ${starCap}.`,
    }
  }

  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return {
      ok: false,
      failureCode: 'unknown_faction',
      heroId: normalizedHeroId,
      previousStarLevel,
      message: `Unknown faction ${factionId}.`,
    }
  }

  if (faction.heroCommand.developmentPoints < HERO_STAR_UPGRADE_DEVELOPMENT_POINTS) {
    return {
      ok: false,
      failureCode: 'insufficient_materials',
      heroId: normalizedHeroId,
      previousStarLevel,
      message: `Insufficient development points. Need ${HERO_STAR_UPGRADE_DEVELOPMENT_POINTS}.`,
    }
  }

  const nextUnit = getUnitById(nextWorld, validation.unit.id)
  if (!nextUnit) {
    return {
      ok: false,
      failureCode: 'unknown_hero',
      heroId: normalizedHeroId,
      previousStarLevel,
      message: `Hero ${normalizedHeroId} disappeared during star upgrade resolution.`,
    }
  }

  faction.heroCommand.developmentPoints -= HERO_STAR_UPGRADE_DEVELOPMENT_POINTS
  const nextStarLevel = previousStarLevel + 1
  nextUnit.hero.starLevel = nextStarLevel
  nextUnit.hero.exp = normalizeHeroExp(nextUnit.hero)
  prependReport(
    nextWorld,
    nextWorld.tick,
    '武将升星',
    `${nextUnit.hero.name} 已从 ${previousStarLevel} 红星提升至 ${nextStarLevel} 红星。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    heroId: normalizedHeroId,
    previousStarLevel,
    nextStarLevel,
    resourcesSpent: { developmentPoints: HERO_STAR_UPGRADE_DEVELOPMENT_POINTS },
    bonusPointsAwarded: STAR_UPGRADE_BONUS_PER_STAR,
    hero: buildWorldActionHeroReadModel(nextUnit),
    message: `${nextUnit.hero.name} 已升至 ${nextStarLevel} 红星。`,
  }
}

export function isDeployAnchorTile(tile: Tile, factionId: string) {
  return (
    tile.owner === factionId &&
    (tile.type === 'city' || tile.type === 'resource' || tile.type === 'pass')
  )
}

export function getDeployableAnchorTiles(world: WorldState, factionId: string) {
  return world.map.tiles.filter((tile) => isDeployAnchorTile(tile, factionId))
}

function ensureCityTechLevels(cluster: WorldState['map']['overlays']['cityClusters'][number]): CityTechLevels {
  const levels = cluster.techLevels ?? EMPTY_CITY_TECH_LEVELS

  return {
    governance: levels.governance ?? 0,
    logistics: levels.logistics ?? 0,
    defense: levels.defense ?? 0,
    recruitment: levels.recruitment ?? 0,
  }
}

/**
 * Shallow clone WorldState — avoids structuredClone OOM on 102k-tile maps.
 * Shares map.tiles and map.connections by reference (never structurally modified).
 * Deep-clones units, factions, executions, and other small state.
 */
function shallowCloneWorld(world: WorldState): WorldState {
  return {
    tick: world.tick,
    worldVersion: world.worldVersion,
    map: world.map, // Share tiles (102k) + connections (102k) — never add/remove tiles
    factions: Object.fromEntries(
      Object.entries(world.factions).map(([k, v]) => [k, {
        ...v,
        claimableRewards: v.claimableRewards?.map((reward) => ({
          ...reward,
          reward: { ...reward.reward },
        })),
        aiResourceAccounts: v.aiResourceAccounts
          ? Object.fromEntries(
              Object.entries(v.aiResourceAccounts).map(([accountId, account]) => [
                accountId,
                {
                  ...account,
                  resources: { ...account.resources },
                },
              ]),
            )
          : undefined,
        aiResourceGatherClaims: v.aiResourceGatherClaims
          ? Object.fromEntries(
              Object.entries(v.aiResourceGatherClaims).map(([tileId, claim]) => [
                tileId,
                {
                  ...claim,
                  resources: { ...claim.resources },
                },
              ]),
            )
          : undefined,
        governorResourceInboxes: v.governorResourceInboxes
          ? Object.fromEntries(
              Object.entries(v.governorResourceInboxes).map(([governorPlayerId, inbox]) => [
                governorPlayerId,
                {
                  ...inbox,
                  totalPendingResources: { ...inbox.totalPendingResources },
                  pendingTransfers: inbox.pendingTransfers.map((transfer) => ({
                    ...transfer,
                    resources: { ...transfer.resources },
                  })),
                },
              ]),
            )
          : undefined,
        governorResourceSettlements: v.governorResourceSettlements
          ? Object.fromEntries(
              Object.entries(v.governorResourceSettlements).map(([governorPlayerId, settlements]) => [
                governorPlayerId,
                settlements.map((settlement) => ({
                  ...settlement,
                  resources: { ...settlement.resources },
                })),
              ]),
            )
          : undefined,
        heroCommand: {
          ...v.heroCommand,
          rosterHeroIds: [...v.heroCommand.rosterHeroIds],
          reserveHeroIds: [...v.heroCommand.reserveHeroIds],
          prospectHeroIds: [...v.heroCommand.prospectHeroIds],
        },
      }])
    ) as WorldState['factions'],
    alliance: {
      ...world.alliance,
      directives: Object.fromEntries(
        Object.entries(world.alliance.directives).map(([k, v]) => [k, { ...v }])
      ),
    },
    feedback: {
      allianceActions: [...world.feedback.allianceActions],
      battleRecords: [...world.feedback.battleRecords],
      diplomacyAgreements: [...(world.feedback.diplomacyAgreements ?? [])],
      gameEnded: world.feedback.gameEnded ? { ...world.feedback.gameEnded } : undefined,
    },
    units: world.units.map(u => ({
      ...u,
      corps: { ...u.corps, roster: [...u.corps.roster] },
      hero: { ...u.hero, signatureSkill: { ...u.hero.signatureSkill }, traits: [...u.hero.traits] },
      march: u.march ? { ...u.march, path: [...u.march.path] } : undefined,
    })),
    reports: [...world.reports],
    intel: { ...world.intel },
    tacticalOverrides: world.tacticalOverrides.map(o => ({ ...o })),
    executions: Object.fromEntries(
      Object.entries(world.executions).map(([k, v]) => [k,
        v ? {
          ...v,
          orders: v.orders.map(o => ({ ...o })),
          currentPlan: { ...v.currentPlan, orders: [...v.currentPlan.orders], constraints: [...v.currentPlan.constraints] },
          planningRationale: v.planningRationale ? [...v.planningRationale] : undefined,
        } : null
      ])
    ),
    history: {
      planningJobs: world.history.planningJobs.map(j => ({ ...j })),
      executionReplays: [...world.history.executionReplays],
    },
    slgDomainState: cloneSlgDomainState(world.slgDomainState),
    pveNodes: world.pveNodes?.map(n => ({ ...n })),
    luoyangSiegeProgress: world.luoyangSiegeProgress ? { ...world.luoyangSiegeProgress } : undefined,
    citySiegeProgress: world.citySiegeProgress ? { ...world.citySiegeProgress } : undefined,
    worldAffairs: world.worldAffairs
      ? {
          ...world.worldAffairs,
          achievedNodeIds: [...world.worldAffairs.achievedNodeIds],
          claimedNodeIds: [...world.worldAffairs.claimedNodeIds],
        }
      : undefined,
    worldTasks: world.worldTasks
      ? {
          ...world.worldTasks,
          achievedTaskIds: [...world.worldTasks.achievedTaskIds],
          claimedTaskIds: [...world.worldTasks.claimedTaskIds],
        }
      : undefined,
    worldTaskEvents: world.worldTaskEvents
      ? {
          schemaVersion: world.worldTaskEvents.schemaVersion,
          events: world.worldTaskEvents.events.map((event) => ({ ...event })),
        }
      : undefined,
    seaRouteAuthority: world.seaRouteAuthority ? structuredClone(world.seaRouteAuthority) : undefined,
    navalRuntime: world.navalRuntime ? structuredClone(world.navalRuntime) : undefined,
  }
}

function cloneSlgDomainState(
  slgDomainState: WorldState['slgDomainState'] | undefined,
): WorldState['slgDomainState'] | undefined {
  if (!slgDomainState) {
    return undefined
  }

  return {
    troopFacilitiesByUnit: slgDomainState.troopFacilitiesByUnit
      ? Object.fromEntries(
          Object.entries(slgDomainState.troopFacilitiesByUnit).map(([unitId, facilityState]) => [
            unitId,
            Object.fromEntries(
              Object.entries(facilityState).map(([facilityId, facilityEntries]) => [
                facilityId,
                Object.fromEntries(
                  Object.entries(facilityEntries).map(([buildingId, buildingState]) => [
                    buildingId,
                    { ...buildingState },
                  ]),
                ),
              ]),
            ),
          ]),
        )
      : undefined,
    cityBuildingGroupsByCity: slgDomainState.cityBuildingGroupsByCity
      ? Object.fromEntries(
          Object.entries(slgDomainState.cityBuildingGroupsByCity).map(([cityId, groupState]) => [
            cityId,
            Object.fromEntries(
              Object.entries(groupState).map(([groupId, buildingState]) => [
                groupId,
                Object.fromEntries(
                  Object.entries(buildingState).map(([buildingId, cityBuildingState]) => [
                    buildingId,
                    { ...cityBuildingState },
                  ]),
                ),
              ]),
            ),
          ]),
        )
      : undefined,
    affairsQueueByCity: slgDomainState.affairsQueueByCity
      ? Object.fromEntries(
          Object.entries(slgDomainState.affairsQueueByCity).map(([cityId, entries]) => [
            cityId,
            entries.map((entry) => ({ ...entry })),
          ]),
        )
      : undefined,
    recruitStateByFaction: slgDomainState.recruitStateByFaction
      ? Object.fromEntries(
          Object.entries(slgDomainState.recruitStateByFaction).map(([factionId, recruitState]) => [
            factionId,
            {
              ...recruitState,
              lastResults: recruitState.lastResults?.map((entry) => ({ ...entry })),
            },
          ]),
        )
      : undefined,
    generalStateByFaction: slgDomainState.generalStateByFaction
      ? Object.fromEntries(
          Object.entries(slgDomainState.generalStateByFaction).map(([factionId, generalState]) => [
            factionId,
              {
                ...generalState,
                tacticByHeroId: generalState.tacticByHeroId ? { ...generalState.tacticByHeroId } : undefined,
                tacticalSkillSlotsByHeroId: generalState.tacticalSkillSlotsByHeroId
                  ? Object.fromEntries(
                      Object.entries(generalState.tacticalSkillSlotsByHeroId).map(([heroId, slotState]) => [
                        heroId,
                        {
                          ...slotState,
                          equippedSkillIds: [...slotState.equippedSkillIds],
                          equippedSkillLevelsById: slotState.equippedSkillLevelsById
                            ? { ...slotState.equippedSkillLevelsById }
                            : undefined,
                        },
                      ]),
                    )
                  : undefined,
                directivePreviewHeroId: generalState.directivePreviewHeroId,
                directivePreview: generalState.directivePreview
                  ? {
                      ...generalState.directivePreview,
                    warnings: generalState.directivePreview.warnings ? [...generalState.directivePreview.warnings] : undefined,
                    effectLines: generalState.directivePreview.effectLines ? [...generalState.directivePreview.effectLines] : undefined,
                    nextSteps: generalState.directivePreview.nextSteps ? [...generalState.directivePreview.nextSteps] : undefined,
                    affectedUnitIds: generalState.directivePreview.affectedUnitIds ? [...generalState.directivePreview.affectedUnitIds] : undefined,
                  }
                : undefined,
              directivePreviewByHeroId: generalState.directivePreviewByHeroId
                ? Object.fromEntries(
                    Object.entries(generalState.directivePreviewByHeroId).map(([heroId, preview]) => [
                      heroId,
                      {
                        ...preview,
                        warnings: preview.warnings ? [...preview.warnings] : undefined,
                        effectLines: preview.effectLines ? [...preview.effectLines] : undefined,
                        nextSteps: preview.nextSteps ? [...preview.nextSteps] : undefined,
                        affectedUnitIds: preview.affectedUnitIds ? [...preview.affectedUnitIds] : undefined,
                      },
                    ]),
                  )
                : undefined,
            },
          ]),
        )
      : undefined,
    aiStateByFaction: slgDomainState.aiStateByFaction
      ? Object.fromEntries(
          Object.entries(slgDomainState.aiStateByFaction).map(([factionId, aiState]) => [
            factionId,
            {
              ...aiState,
              agenda: aiState.agenda
                ? {
                    ...aiState.agenda,
                    options: aiState.agenda.options
                      ? aiState.agenda.options.map((option) => ({
                          ...option,
                          targetUnitIds: option.targetUnitIds ? [...option.targetUnitIds] : undefined,
                          recommendedFollowups: option.recommendedFollowups ? [...option.recommendedFollowups] : undefined,
                        }))
                      : undefined,
                    optionActionIds: aiState.agenda.optionActionIds ? [...aiState.agenda.optionActionIds] : undefined,
                    optionLabels: aiState.agenda.optionLabels ? [...aiState.agenda.optionLabels] : undefined,
                    optionTargetTileIds: aiState.agenda.optionTargetTileIds ? [...aiState.agenda.optionTargetTileIds] : undefined,
                    optionSupportCounts: aiState.agenda.optionSupportCounts ? [...aiState.agenda.optionSupportCounts] : undefined,
                    targetUnitIds: aiState.agenda.targetUnitIds ? [...aiState.agenda.targetUnitIds] : undefined,
                    recommendedFollowups: aiState.agenda.recommendedFollowups ? [...aiState.agenda.recommendedFollowups] : undefined,
                  }
                : undefined,
              contextMemorySummary: aiState.contextMemorySummary
                ? {
                    ...aiState.contextMemorySummary,
                    lines: aiState.contextMemorySummary.lines ? [...aiState.contextMemorySummary.lines] : undefined,
                  }
                : undefined,
            },
          ]),
        )
      : undefined,
  }
}

/** Get the execution for a specific faction (or null). */
function getExecution(world: WorldState, factionId: string): PlanExecution | null {
  return world.executions[factionId] ?? null
}

/** Check if a faction (or any faction if not specified) has active orders. */
export function hasActiveOrders(world: WorldState, factionId?: string) {
  if (factionId) {
    const exec = getExecution(world, factionId)
    return exec?.orders.some((order) => order.status === 'queued' || order.status === 'running') ?? false
  }
  return Object.keys(world.factions).some((knownFactionId) => {
    const exec = getExecution(world, knownFactionId)
    return exec?.orders.some((order) => order.status === 'queued' || order.status === 'running') ?? false
  })

}

function spendFactionResources(world: WorldState, factionId: string, actionPoints: number, food: number) {
  return spendFactionUpgradeResources(world, factionId, { actionPoints, food })
}

function compactUpgradeResourceSpend(cost: UpgradeResourceSpend): UpgradeResourceSpend {
  const compacted: UpgradeResourceSpend = {}
  for (const key of ['actionPoints', 'food', 'wood', 'stone', 'iron', 'copper', 'developmentPoints'] as const) {
    const value = cost[key]
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      compacted[key] = Math.trunc(value)
    }
  }
  return compacted
}

function readFactionUpgradeResourceAmount(
  faction: WorldState['factions'][string],
  key: keyof UpgradeResourceSpend,
) {
  switch (key) {
    case 'actionPoints':
      return faction.actionPoints
    case 'food':
      return faction.food
    case 'wood':
      return faction.wood ?? 0
    case 'stone':
      return faction.stone ?? 0
    case 'iron':
      return faction.iron ?? 0
    case 'copper':
      return faction.copper ?? 0
    case 'developmentPoints':
      return faction.heroCommand.developmentPoints
    default:
      return 0
  }
}

function writeFactionUpgradeResourceAmount(
  faction: WorldState['factions'][string],
  key: keyof UpgradeResourceSpend,
  amount: number,
) {
  switch (key) {
    case 'actionPoints':
      faction.actionPoints = amount
      break
    case 'food':
      faction.food = amount
      break
    case 'wood':
      faction.wood = amount
      break
    case 'stone':
      faction.stone = amount
      break
    case 'iron':
      faction.iron = amount
      break
    case 'copper':
      faction.copper = amount
      break
    case 'developmentPoints':
      faction.heroCommand.developmentPoints = amount
      break
    default:
      break
  }
}

function spendFactionUpgradeResources(world: WorldState, factionId: string, cost: UpgradeResourceSpend) {
  const faction = world.factions[factionId]
  if (!faction) return false
  const compacted = compactUpgradeResourceSpend(cost)
  for (const key of Object.keys(compacted) as Array<keyof UpgradeResourceSpend>) {
    if (readFactionUpgradeResourceAmount(faction, key) < (compacted[key] ?? 0)) {
      return false
    }
  }
  for (const key of Object.keys(compacted) as Array<keyof UpgradeResourceSpend>) {
    writeFactionUpgradeResourceAmount(
      faction,
      key,
      readFactionUpgradeResourceAmount(faction, key) - (compacted[key] ?? 0),
    )
  }
  return true
}

function formatUpgradeResourceSpend(cost: UpgradeResourceSpend) {
  const labels: Record<keyof UpgradeResourceSpend, string> = {
    actionPoints: '行动点',
    food: '粮草',
    wood: '木材',
    stone: '石料',
    iron: '铁矿',
    copper: '铜钱',
    developmentPoints: '成长材料',
  }
  const parts = (Object.keys(compactUpgradeResourceSpend(cost)) as Array<keyof UpgradeResourceSpend>)
    .map((key) => `${labels[key]} ${cost[key]}`)
  return parts.join(' / ') || '无'
}

function hasHostileUnit(world: WorldState, tileId: string, friendlyFactionId: string) {
  return world.units.some((unit) => unit.faction !== friendlyFactionId && unit.tileId === tileId)
}

function resolveFallbackFactionId(world: WorldState): string {
  const firstFactionId = Object.keys(world.factions)[0]
  return firstFactionId ?? 'neutral'
}

function resolvePrimaryOpposingFactionId(world: WorldState, factionId: string): string {
  const candidates = Object.keys(world.factions).filter((candidateId) => candidateId !== factionId)
  if (candidates.length === 0) {
    return factionId
  }
  return candidates
    .sort((left, right) => {
      const rightUnits = world.units.filter((unit) => unit.faction === right).length
      const leftUnits = world.units.filter((unit) => unit.faction === left).length
      return rightUnits - leftUnits
    })[0]
}

function resolveFactionDisplayLabel(factionId: string): string {
  if (factionId === 'neutral') {
    return '中立'
  }
  return `势力(${factionId})`
}

export function appendPlanningJobHistory(
  world: WorldState,
  entry: PlanningJobHistoryEntry,
): WorldState {
  const nextWorld = shallowCloneWorld(world)
  upsertPlanningJobHistory(nextWorld, entry)

  return nextWorld
}

export function updateAllianceDirective(world: WorldState, regionId: string, stance: WorldState['alliance']['directives'][string]['stance']) {
  const nextWorld = shallowCloneWorld(world)
  const directive = nextWorld.alliance.directives[regionId]
  if (!directive || directive.stance === stance) {
    return nextWorld
  }

  directive.stance = stance
  directive.supportLevel = Math.round(
    clampValue(resolveAllianceSupportLevel(stance, directive.supportLevel), 35, 92),
  )
  directive.summary = `同盟已切换为${allianceStanceLabel(stance)}姿态，当前协同强度 ${directive.supportLevel}。`
  prependReport(
    nextWorld,
    nextWorld.tick,
    '同盟协同调整',
    `${directive.regionId} 已切换为${allianceStanceLabel(stance)}姿态，盟友将据此调整战区协同。`,
  )
  bumpWorldVersion(nextWorld)
  return nextWorld
}

export function allianceHelp(
  world: WorldState,
  regionId: string,
  factionId: string = resolveFallbackFactionId(world),
): AllianceHelpResult {
  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return { ok: false, message: `Unknown faction: ${factionId}`, failureCode: 'unknown_faction' }
  }

  const region = nextWorld.map.regions.find((candidate) => candidate.id === regionId)
  if (!region) {
    return { ok: false, message: `Alliance region not found: ${regionId}`, failureCode: 'missing_alliance_region' }
  }

  const directive = nextWorld.alliance.directives[regionId]
  if (!directive) {
    return { ok: false, message: `Alliance directive not found: ${regionId}`, failureCode: 'missing_alliance_directive' }
  }

  const commander = nextWorld.alliance.commanders.find((candidate) => candidate.id === directive.assignedCommanderId)
  if (!commander) {
    return {
      ok: false,
      message: `Alliance commander not found for ${regionId}: ${directive.assignedCommanderId}`,
      failureCode: 'missing_alliance_commander',
    }
  }

  if (faction.actionPoints < 1) {
    return {
      ok: false,
      message: '行动点不足，至少需要 1 点行动点才能发起同盟协助。',
      failureCode: 'insufficient_action_points',
    }
  }

  const regionTiles = region.tileIds
    .map((tileId) => getTileById(nextWorld, tileId))
    .filter((tile): tile is Tile => Boolean(tile))
  const targetTile =
    regionTiles
      .slice()
      .sort((left, right) => {
        const leftFriendly = left.owner === factionId ? 1 : 0
        const rightFriendly = right.owner === factionId ? 1 : 0
        if (leftFriendly !== rightFriendly) {
          return rightFriendly - leftFriendly
        }
        if (left.enemyPressure !== right.enemyPressure) {
          return right.enemyPressure - left.enemyPressure
        }
        return left.id.localeCompare(right.id)
      })[0] ?? getTileById(nextWorld, region.centerTileId)

  if (!targetTile) {
    return { ok: false, message: `Alliance target tile not found for ${regionId}`, failureCode: 'missing_target_tile' }
  }

  faction.actionPoints = Math.max(0, faction.actionPoints - 1)
  directive.supportLevel = Math.round(clampValue(directive.supportLevel + 6, 35, 92))
  directive.summary = `同盟已接受增援请求，当前对 ${region.name} 的协同强度 ${directive.supportLevel}。`
  commander.readiness = Math.min(100, commander.readiness + 8)
  targetTile.enemyPressure = Math.max(0, targetTile.enemyPressure - 1)

  for (const unit of nextWorld.units) {
    if (unit.faction === factionId && region.tileIds.includes(unit.tileId)) {
      unit.supply = Math.min(9, unit.supply + 1)
    }
  }

  const action: AllianceActionSummary = {
    id: `${nextWorld.tick}-${regionId}-alliance-help`,
    tick: nextWorld.tick,
    regionId,
    title: `我方增援 ${region.name}`,
    detail: `${resolveFactionDisplayLabel(factionId)} 向 ${region.name} 发起同盟协助，${commander.name} 协同强度提升至 ${directive.supportLevel}，${targetTile.name} 敌压下降。`,
    severity: 'medium',
    factionId,
    tileId: targetTile.id,
    toTileId: targetTile.id,
  }
  nextWorld.feedback.allianceActions = [action, ...nextWorld.feedback.allianceActions].slice(0, 8)

  prependReport(
    nextWorld,
    nextWorld.tick,
    '同盟协助',
    `${resolveFactionDisplayLabel(factionId)} 已向 ${region.name} 发起增援，${commander.name} 战备提升至 ${commander.readiness}，${targetTile.name} 压力有所缓解。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: `${resolveFactionDisplayLabel(factionId)} 已完成对 ${region.name} 的同盟协助。`,
    factionId,
    regionId,
    commanderId: commander.id,
    supportLevel: directive.supportLevel,
    commanderReadiness: commander.readiness,
  }
}

export function claimReward(
  world: WorldState,
  rewardId?: string,
  factionId: string = resolveFallbackFactionId(world),
): RewardClaimResult {
  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return { ok: false, message: `Unknown faction: ${factionId}`, failureCode: 'unknown_faction' }
  }

  const pendingRewards = faction.claimableRewards ?? []
  const normalizedRewardId = rewardId?.trim()
  const rewardIndex =
    normalizedRewardId && normalizedRewardId.length > 0
      ? pendingRewards.findIndex((candidate) => candidate.id === normalizedRewardId)
      : pendingRewards.length > 0
        ? 0
        : -1

  if (rewardIndex < 0) {
    return {
      ok: false,
      message: normalizedRewardId
        ? `Claimable reward not found: ${normalizedRewardId}`
        : 'No claimable rewards available for this faction.',
      failureCode: 'missing_claimable_reward',
    }
  }

  const [claimedReward] = pendingRewards.splice(rewardIndex, 1)
  faction.claimableRewards = pendingRewards
  if (claimedReward.source === 'daily_welfare' && claimedReward.ledgerKey) {
    const ledger = faction.dailyWelfareLedgerByKey ?? {}
    const currentEntry = ledger[claimedReward.ledgerKey]
    faction.dailyWelfareLedgerByKey = {
      ...ledger,
      [claimedReward.ledgerKey]: {
        ledgerKey: claimedReward.ledgerKey,
        rewardId: currentEntry?.rewardId ?? claimedReward.id,
        status: 'claimed',
        issuedTick: currentEntry?.issuedTick ?? claimedReward.createdTick,
        claimedTick: nextWorld.tick,
      },
    }
  }
  faction.food += claimedReward.reward.food
  faction.actionPoints = Math.min(8, faction.actionPoints + claimedReward.reward.ap)

  prependReport(
    nextWorld,
    nextWorld.tick,
    '奖励领取',
    `${resolveFactionDisplayLabel(factionId)} 领取了 ${claimedReward.label}，获得 ${claimedReward.reward.food} 粮草和 ${claimedReward.reward.ap} 行动点。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: `${resolveFactionDisplayLabel(factionId)} 已领取 ${claimedReward.label}。`,
    rewardId: claimedReward.id,
    foodReward: claimedReward.reward.food,
    actionPointReward: claimedReward.reward.ap,
    pendingRewardCount: pendingRewards.length,
    source: claimedReward.source,
  }
}

export function achieveWorldAffairsNode(
  world: WorldState,
  params: {
    factionId?: string
    scenarioId: string
    scenarioVersion: string
    seasonRunId?: string
    nodeId: string
  },
): WorldAffairsNodeAchieveResult {
  const nextWorld = shallowCloneWorld(world)
  const factionId = params.factionId?.trim() || resolveFallbackFactionId(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return { ok: false, message: `Unknown faction: ${factionId}`, failureCode: 'unknown_faction' }
  }

  const state = nextWorld.worldAffairs ?? createInitialSeasonScenarioState()
  nextWorld.worldAffairs = state
  const scenarioId = params.scenarioId.trim()
  const scenarioVersion = params.scenarioVersion.trim()
  const seasonRunId = params.seasonRunId?.trim()
  const nodeId = params.nodeId.trim()

  if (
    state.activeScenarioId !== scenarioId ||
    state.scenarioVersion !== scenarioVersion ||
    (seasonRunId !== undefined && seasonRunId !== state.seasonRunId)
  ) {
    return {
      ok: false,
      message: `World affairs scenario mismatch: active ${state.activeScenarioId}@${state.scenarioVersion}/${state.seasonRunId}, requested ${scenarioId}@${scenarioVersion}${seasonRunId ? `/${seasonRunId}` : ''}.`,
      failureCode: 'scenario_mismatch',
    }
  }

  const script = getScenarioScriptByIdAndVersion(state.activeScenarioId, state.scenarioVersion)
  if (!script) {
    return {
      ok: false,
      message: `Unknown world affairs scenario: ${state.activeScenarioId}@${state.scenarioVersion}`,
      failureCode: 'unknown_scenario',
    }
  }

  const node = script.nodes.find((candidate) => candidate.nodeId === nodeId)
  if (!node) {
    return {
      ok: false,
      message: `Unknown world affairs node: ${nodeId}`,
      failureCode: 'unknown_scenario_node',
    }
  }

  if (state.achievedNodeIds.includes(nodeId)) {
    return {
      ok: false,
      message: `World affairs node already achieved: ${nodeId}`,
      failureCode: 'world_affairs_node_already_achieved',
    }
  }

  const activeNodeId = resolveActiveWorldAffairsNodeId(script.nodes, new Set(state.achievedNodeIds))
  if (activeNodeId !== nodeId) {
    return {
      ok: false,
      message: `World affairs node is not active: ${nodeId}`,
      failureCode: 'world_affairs_node_not_active',
    }
  }

  state.achievedNodeIds = [...state.achievedNodeIds, nodeId]
  const nextActiveNodeId = resolveActiveWorldAffairsNodeId(script.nodes, new Set(state.achievedNodeIds))

  prependReport(
    nextWorld,
    nextWorld.tick,
    '天下大势达成',
    `${resolveFactionDisplayLabel(factionId)} 推进了天下大势「${node.title}」。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: `${resolveFactionDisplayLabel(factionId)} 已达成天下大势节点「${node.title}」。`,
    factionId,
    scenarioId: state.activeScenarioId,
    scenarioVersion: state.scenarioVersion,
    seasonRunId: state.seasonRunId,
    nodeId,
    nodeTitle: node.title,
    activeNodeId: nextActiveNodeId,
  }
}

export function claimWorldAffairsNodeReward(
  world: WorldState,
  params: {
    factionId?: string
    scenarioId: string
    scenarioVersion: string
    seasonRunId?: string
    nodeId: string
  },
): WorldAffairsNodeRewardClaimResult {
  const nextWorld = shallowCloneWorld(world)
  const factionId = params.factionId?.trim() || resolveFallbackFactionId(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return { ok: false, message: `Unknown faction: ${factionId}`, failureCode: 'unknown_faction' }
  }

  const state = nextWorld.worldAffairs ?? createInitialSeasonScenarioState()
  nextWorld.worldAffairs = state
  const scenarioId = params.scenarioId.trim()
  const scenarioVersion = params.scenarioVersion.trim()
  const seasonRunId = params.seasonRunId?.trim()
  const nodeId = params.nodeId.trim()

  if (
    state.activeScenarioId !== scenarioId ||
    state.scenarioVersion !== scenarioVersion ||
    (seasonRunId !== undefined && seasonRunId !== state.seasonRunId)
  ) {
    return {
      ok: false,
      message: `World affairs scenario mismatch: active ${state.activeScenarioId}@${state.scenarioVersion}/${state.seasonRunId}, requested ${scenarioId}@${scenarioVersion}${seasonRunId ? `/${seasonRunId}` : ''}.`,
      failureCode: 'scenario_mismatch',
    }
  }

  const script = getScenarioScriptByIdAndVersion(state.activeScenarioId, state.scenarioVersion)
  if (!script) {
    return {
      ok: false,
      message: `Unknown world affairs scenario: ${state.activeScenarioId}@${state.scenarioVersion}`,
      failureCode: 'unknown_scenario',
    }
  }

  const node = script.nodes.find((candidate) => candidate.nodeId === nodeId)
  if (!node) {
    return {
      ok: false,
      message: `Unknown world affairs node: ${nodeId}`,
      failureCode: 'unknown_scenario_node',
    }
  }

  if (!state.achievedNodeIds.includes(nodeId)) {
    return {
      ok: false,
      message: `World affairs node is not achieved: ${nodeId}`,
      failureCode: 'world_affairs_node_not_achieved',
    }
  }

  if (state.claimedNodeIds.includes(nodeId)) {
    return {
      ok: false,
      message: `World affairs node reward already claimed: ${nodeId}`,
      failureCode: 'world_affairs_node_already_claimed',
    }
  }

  const rewardTotals = summarizeScenarioRewardPreview(node.rewardPreview)
  if (!rewardTotals) {
    return {
      ok: false,
      message: `Invalid world affairs reward preview for node: ${nodeId}`,
      failureCode: 'invalid_world_affairs_reward',
    }
  }

  applyScenarioRewardTotalsToFaction(faction, rewardTotals)
  state.claimedNodeIds = [...state.claimedNodeIds, nodeId]

  prependReport(
    nextWorld,
    nextWorld.tick,
    '天下大势奖励',
    `${resolveFactionDisplayLabel(factionId)} 领取了「${node.title}」节点奖励：${formatScenarioRewardTotals(rewardTotals)}。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: `${resolveFactionDisplayLabel(factionId)} 已领取天下大势节点「${node.title}」奖励。`,
    factionId,
    scenarioId: state.activeScenarioId,
    scenarioVersion: state.scenarioVersion,
    seasonRunId: state.seasonRunId,
    nodeId,
    nodeTitle: node.title,
    rewardTotals,
  }
}

export function achieveTaskPrototype(
  world: WorldState,
  params: {
    factionId?: string
    scenarioId: string
    scenarioVersion: string
    seasonRunId?: string
    taskId: string
  },
): TaskPrototypeAchieveResult {
  const nextWorld = shallowCloneWorld(world)
  const factionId = params.factionId?.trim() || resolveFallbackFactionId(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return { ok: false, message: `Unknown faction: ${factionId}`, failureCode: 'unknown_faction' }
  }

  const state = nextWorld.worldTasks ?? createInitialSeasonTaskState()
  nextWorld.worldTasks = state
  const scenarioId = params.scenarioId.trim()
  const scenarioVersion = params.scenarioVersion.trim()
  const seasonRunId = params.seasonRunId?.trim()
  const taskId = params.taskId.trim()

  if (
    state.activeScenarioId !== scenarioId ||
    state.scenarioVersion !== scenarioVersion ||
    (seasonRunId !== undefined && seasonRunId !== state.seasonRunId)
  ) {
    return {
      ok: false,
      message: `Task scenario mismatch: active ${state.activeScenarioId}@${state.scenarioVersion}/${state.seasonRunId}, requested ${scenarioId}@${scenarioVersion}${seasonRunId ? `/${seasonRunId}` : ''}.`,
      failureCode: 'scenario_mismatch',
    }
  }

  const catalog = getScenarioTaskCatalogByIdAndVersion(state.activeScenarioId, state.scenarioVersion)
  if (!catalog) {
    return {
      ok: false,
      message: `Unknown task scenario: ${state.activeScenarioId}@${state.scenarioVersion}`,
      failureCode: 'unknown_scenario',
    }
  }

  const taskContext = resolveActiveChapterTaskContext(catalog.chapters, state.activeChapterId, taskId)
  if (!taskContext) {
    return {
      ok: false,
      message: `Unknown task: ${taskId}`,
      failureCode: 'unknown_task',
    }
  }

  if (state.achievedTaskIds.includes(taskId)) {
    return {
      ok: false,
      message: `Task already achieved: ${taskId}`,
      failureCode: 'task_already_achieved',
    }
  }

  const activeTaskId = resolveActiveTaskId(taskContext.tasks, new Set(state.claimedTaskIds))
  if (activeTaskId !== taskId) {
    return {
      ok: false,
      message: `Task is not active: ${taskId}`,
      failureCode: 'task_not_active',
    }
  }

  state.achievedTaskIds = [...state.achievedTaskIds, taskId]
  const nextActiveTaskId = resolveActiveTaskId(taskContext.tasks, new Set(state.claimedTaskIds))

  prependReport(
    nextWorld,
    nextWorld.tick,
    '任务原型达成',
    `${resolveFactionDisplayLabel(factionId)} 通过原型验证入口达成任务「${taskContext.task.title}」。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: `${resolveFactionDisplayLabel(factionId)} 已通过原型入口达成任务「${taskContext.task.title}」。`,
    factionId,
    scenarioId: state.activeScenarioId,
    scenarioVersion: state.scenarioVersion,
    seasonRunId: state.seasonRunId,
    taskId,
    taskTitle: taskContext.task.title,
    activeTaskId: nextActiveTaskId,
  }
}

export function recordWorldTaskEvent(
  world: WorldState,
  params: {
    factionId?: string
    scenarioId: string
    scenarioVersion: string
    seasonRunId?: string
    taskId: string
    kind: TaskRealAuthoritySignalKind
    source?: WorldTaskEventSource
    sourceId?: string
    summary?: string
  },
): WorldTaskEventRecordResult {
  const nextWorld = shallowCloneWorld(world)
  const factionId = params.factionId?.trim() || resolveFallbackFactionId(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return { ok: false, message: `Unknown faction: ${factionId}`, failureCode: 'unknown_faction' }
  }

  const state = nextWorld.worldTasks ?? createInitialSeasonTaskState()
  nextWorld.worldTasks = state
  const scenarioId = params.scenarioId.trim()
  const scenarioVersion = params.scenarioVersion.trim()
  const seasonRunId = params.seasonRunId?.trim()
  const taskId = params.taskId.trim()

  if (
    state.activeScenarioId !== scenarioId ||
    state.scenarioVersion !== scenarioVersion ||
    (seasonRunId !== undefined && seasonRunId !== state.seasonRunId)
  ) {
    return {
      ok: false,
      message: `Task scenario mismatch: active ${state.activeScenarioId}@${state.scenarioVersion}/${state.seasonRunId}, requested ${scenarioId}@${scenarioVersion}${seasonRunId ? `/${seasonRunId}` : ''}.`,
      failureCode: 'scenario_mismatch',
    }
  }

  const catalog = getScenarioTaskCatalogByIdAndVersion(state.activeScenarioId, state.scenarioVersion)
  if (!catalog) {
    return {
      ok: false,
      message: `Unknown task scenario: ${state.activeScenarioId}@${state.scenarioVersion}`,
      failureCode: 'unknown_scenario',
    }
  }

  const taskContext = resolveActiveChapterTaskContext(catalog.chapters, state.activeChapterId, taskId)
  if (!taskContext) {
    return {
      ok: false,
      message: `Unknown task: ${taskId}`,
      failureCode: 'unknown_task',
    }
  }

  const source = params.source ?? 'system'
  const sourceId = normalizeWorldTaskEventSourceId(params.sourceId, source, taskId)
  const eventId = buildWorldTaskEventId(factionId, taskId, params.kind, source, sourceId)
  const ledger = nextWorld.worldTaskEvents ?? { schemaVersion: 'world_task_event_ledger_v1' as const, events: [] }
  nextWorld.worldTaskEvents = ledger
  const existing = ledger.events.find((event) => event.eventId === eventId)
  if (existing) {
    return {
      ok: true,
      world: nextWorld,
      message: `World task event already recorded: ${taskContext.task.title}`,
      factionId,
      scenarioId: state.activeScenarioId,
      scenarioVersion: state.scenarioVersion,
      seasonRunId: state.seasonRunId,
      taskId,
      taskTitle: taskContext.task.title,
      event: existing,
      reused: true,
    }
  }

  const event: WorldTaskEvent = {
    eventId,
    factionId,
    scenarioId: state.activeScenarioId,
    scenarioVersion: state.scenarioVersion,
    seasonRunId: state.seasonRunId,
    taskId,
    kind: params.kind,
    authority: 'real_authority',
    source,
    sourceId,
    summary: params.summary?.trim() || `Real authority signal recorded for ${taskContext.task.title}`,
    createdTick: nextWorld.tick,
    createdWorldVersion: nextWorld.worldVersion,
  }
  ledger.events = [...ledger.events, event]

  prependReport(
    nextWorld,
    nextWorld.tick,
    'World task authority event',
    `${resolveFactionDisplayLabel(factionId)} recorded ${params.kind} for ${taskContext.task.title} from ${source}:${sourceId}.`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: `World task event recorded: ${taskContext.task.title}`,
    factionId,
    scenarioId: state.activeScenarioId,
    scenarioVersion: state.scenarioVersion,
    seasonRunId: state.seasonRunId,
    taskId,
    taskTitle: taskContext.task.title,
    event,
    reused: false,
  }
}

function normalizeWorldTaskEventSourceId(
  sourceId: string | undefined,
  source: WorldTaskEventSource,
  taskId: string,
): string {
  const trimmed = sourceId?.trim()
  if (trimmed) {
    return trimmed
  }
  return `${source}:${taskId}`
}

function buildWorldTaskEventId(
  factionId: string,
  taskId: string,
  kind: TaskRealAuthoritySignalKind,
  source: WorldTaskEventSource,
  sourceId: string,
): string {
  return `world_task_event_${sanitizeWorldTaskEventIdPart(factionId)}_${sanitizeWorldTaskEventIdPart(taskId)}_${sanitizeWorldTaskEventIdPart(kind)}_${sanitizeWorldTaskEventIdPart(source)}_${sanitizeWorldTaskEventIdPart(sourceId)}`
}

function sanitizeWorldTaskEventIdPart(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
  return normalized || 'unknown'
}

function hasWorldTaskRealAuthorityEvent(
  world: WorldState,
  factionId: string,
  scenarioId: string,
  scenarioVersion: string,
  seasonRunId: string,
  taskId: string,
): boolean {
  return Boolean(world.worldTaskEvents?.events.some((event) => (
    event.authority === 'real_authority'
    && event.factionId === factionId
    && event.scenarioId === scenarioId
    && event.scenarioVersion === scenarioVersion
    && event.seasonRunId === seasonRunId
    && event.taskId === taskId
  )))
}

export function claimTaskReward(
  world: WorldState,
  params: {
    factionId?: string
    scenarioId: string
    scenarioVersion: string
    seasonRunId?: string
    taskId: string
  },
): TaskRewardClaimResult {
  const nextWorld = shallowCloneWorld(world)
  const factionId = params.factionId?.trim() || resolveFallbackFactionId(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return { ok: false, message: `Unknown faction: ${factionId}`, failureCode: 'unknown_faction' }
  }

  const state = nextWorld.worldTasks ?? createInitialSeasonTaskState()
  nextWorld.worldTasks = state
  const scenarioId = params.scenarioId.trim()
  const scenarioVersion = params.scenarioVersion.trim()
  const seasonRunId = params.seasonRunId?.trim()
  const taskId = params.taskId.trim()

  if (
    state.activeScenarioId !== scenarioId ||
    state.scenarioVersion !== scenarioVersion ||
    (seasonRunId !== undefined && seasonRunId !== state.seasonRunId)
  ) {
    return {
      ok: false,
      message: `Task scenario mismatch: active ${state.activeScenarioId}@${state.scenarioVersion}/${state.seasonRunId}, requested ${scenarioId}@${scenarioVersion}${seasonRunId ? `/${seasonRunId}` : ''}.`,
      failureCode: 'scenario_mismatch',
    }
  }

  const catalog = getScenarioTaskCatalogByIdAndVersion(state.activeScenarioId, state.scenarioVersion)
  if (!catalog) {
    return {
      ok: false,
      message: `Unknown task scenario: ${state.activeScenarioId}@${state.scenarioVersion}`,
      failureCode: 'unknown_scenario',
    }
  }

  const taskContext = resolveActiveChapterTaskContext(catalog.chapters, state.activeChapterId, taskId)
  if (!taskContext) {
    return {
      ok: false,
      message: `Unknown task: ${taskId}`,
      failureCode: 'unknown_task',
    }
  }

  const achievedByState = state.achievedTaskIds.includes(taskId)
  const achievedByLedger = hasWorldTaskRealAuthorityEvent(nextWorld, factionId, state.activeScenarioId, state.scenarioVersion, state.seasonRunId, taskId)
  if (!achievedByState && !achievedByLedger) {
    return {
      ok: false,
      message: `Task is not achieved: ${taskId}`,
      failureCode: 'task_not_achieved',
    }
  }
  if (!achievedByState && achievedByLedger) {
    state.achievedTaskIds = [...state.achievedTaskIds, taskId]
  }

  if (state.claimedTaskIds.includes(taskId)) {
    return {
      ok: false,
      message: `Task reward already claimed: ${taskId}`,
      failureCode: 'task_already_claimed',
    }
  }

  const rewardTotals = summarizeTaskRewardPreview(taskContext.task.rewardPreview)
  if (!rewardTotals) {
    return {
      ok: false,
      message: `Invalid task reward preview for task: ${taskId}`,
      failureCode: 'invalid_task_reward',
    }
  }

  applyTaskRewardTotalsToFaction(faction, rewardTotals)
  state.claimedTaskIds = [...state.claimedTaskIds, taskId]
  const claimedTaskIds = new Set(state.claimedTaskIds)
  const isChapterComplete = taskContext.tasks.every((task) => claimedTaskIds.has(task.taskId))
  const chapterRewardTotals = isChapterComplete ? summarizeTaskRewardPreview(taskContext.chapterRewardPreview) : null
  if (isChapterComplete && !chapterRewardTotals) {
    return {
      ok: false,
      message: `Invalid task chapter reward preview for chapter: ${taskContext.chapterId}`,
      failureCode: 'invalid_task_reward',
    }
  }
  if (chapterRewardTotals) {
    applyTaskRewardTotalsToFaction(faction, chapterRewardTotals)
  }
  const nextChapterId = isChapterComplete ? taskContext.nextChapterId : null
  const advancedToNextChapter = typeof nextChapterId === 'string' && nextChapterId.length > 0
  if (advancedToNextChapter) {
    state.activeChapterId = nextChapterId
  }
  const activeTaskId = advancedToNextChapter ? null : resolveActiveTaskId(taskContext.tasks, claimedTaskIds)

  prependReport(
    nextWorld,
    nextWorld.tick,
    '任务奖励',
    chapterRewardTotals
      ? `${resolveFactionDisplayLabel(factionId)} 领取了「${taskContext.task.title}」任务奖励：${formatTaskRewardTotals(rewardTotals)}；并完成「${taskContext.chapterTitle}」获得章节奖励：${formatTaskRewardTotals(chapterRewardTotals)}。`
      : `${resolveFactionDisplayLabel(factionId)} 领取了「${taskContext.task.title}」任务奖励：${formatTaskRewardTotals(rewardTotals)}。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: `${resolveFactionDisplayLabel(factionId)} 已领取任务「${taskContext.task.title}」奖励。`,
    factionId,
    scenarioId: state.activeScenarioId,
    scenarioVersion: state.scenarioVersion,
    seasonRunId: state.seasonRunId,
    taskId,
    taskTitle: taskContext.task.title,
    rewardTotals,
    chapterRewardTotals,
    completedChapterId: taskContext.chapterId,
    completedChapterTitle: taskContext.chapterTitle,
    activeChapterId: state.activeChapterId,
    activeTaskId,
    advancedToNextChapter,
  }
}

export function issueClaimableReward(
  world: WorldState,
  params: {
    factionId?: string
    rewardId?: string
    ledgerKey?: string
    source: 'daily_welfare' | 'event_reward'
    label?: string
    summary?: string
    reward: RewardBundle
  },
): IssueClaimableRewardResult {
  const nextWorld = shallowCloneWorld(world)
  const factionId = params.factionId?.trim() || resolveFallbackFactionId(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return { ok: false, message: `Unknown faction: ${factionId}`, failureCode: 'unknown_faction' }
  }

  const food = params.reward.food
  const ap = params.reward.ap
  if (!Number.isInteger(food) || !Number.isInteger(ap) || food < 0 || ap < 0 || food + ap <= 0) {
    return { ok: false, message: 'Invalid claimable reward bundle.', failureCode: 'invalid_reward' }
  }

  const pendingRewards = faction.claimableRewards ?? []
  const defaultRewardId = `${params.source}_${nextWorld.tick}_${pendingRewards.length + 1}`
  const rewardId = params.rewardId?.trim() || defaultRewardId
  if (pendingRewards.some((reward) => reward.id === rewardId)) {
    return { ok: false, message: `Claimable reward already pending: ${rewardId}`, failureCode: 'reward_already_pending' }
  }
  const ledgerKey = params.source === 'daily_welfare'
    ? (params.ledgerKey?.trim() || rewardId)
    : undefined
  if (ledgerKey) {
    const ledger = faction.dailyWelfareLedgerByKey ?? {}
    if (ledger[ledgerKey]) {
      return {
        ok: false,
        message: `Daily welfare already issued: ${ledgerKey}`,
        failureCode: 'daily_welfare_already_issued',
      }
    }
    faction.dailyWelfareLedgerByKey = {
      ...ledger,
      [ledgerKey]: {
        ledgerKey,
        rewardId,
        status: 'pending',
        issuedTick: nextWorld.tick,
      },
    }
  }

  const label = params.label?.trim() || (params.source === 'daily_welfare' ? '每日福利' : '活动奖励')
  const summary = params.summary?.trim() || (params.source === 'daily_welfare' ? '每日登录福利。' : '活动结算奖励。')
  const reward: ClaimableReward = {
    id: rewardId,
    source: params.source,
    label,
    summary,
    reward: {
      food,
      ap,
    },
    createdTick: nextWorld.tick,
    ledgerKey,
  }
  faction.claimableRewards = [reward, ...pendingRewards]

  prependReport(
    nextWorld,
    nextWorld.tick,
    '奖励发放',
    `${resolveFactionDisplayLabel(factionId)} 收到 ${label}，可在通用收件箱领取。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: `${resolveFactionDisplayLabel(factionId)} 已收到 ${label}。`,
    factionId,
    rewardId,
    ledgerKey,
    source: params.source,
    pendingRewardCount: faction.claimableRewards.length,
  }
}

function createEmptyResourceTransferBundle(): ResourceTransferBundle {
  return { food: 0, wood: 0, stone: 0, iron: 0, copper: 0 }
}

function normalizeResourceTransferBundle(
  input: Partial<ResourceTransferBundle> | undefined,
): ResourceTransferBundle | null {
  const normalized = createEmptyResourceTransferBundle()
  let total = 0

  for (const kind of RESOURCE_TRANSFER_KINDS) {
    const value = input?.[kind]
    if (value === undefined) {
      continue
    }
    if (!Number.isInteger(value) || value <= 0) {
      return null
    }
    normalized[kind] = value
    total += value
  }

  return total > 0 ? normalized : null
}

function readResourceTransferAmount(resources: ResourceTransferBundle, kind: typeof RESOURCE_TRANSFER_KINDS[number]) {
  return resources[kind] ?? 0
}

function totalResourceTransferAmount(resources: ResourceTransferBundle) {
  return RESOURCE_TRANSFER_KINDS.reduce((total, kind) => total + readResourceTransferAmount(resources, kind), 0)
}

function hasSufficientAiResources(
  current: ResourceTransferBundle,
  requested: ResourceTransferBundle,
) {
  return RESOURCE_TRANSFER_KINDS.every((kind) => readResourceTransferAmount(current, kind) >= readResourceTransferAmount(requested, kind))
}

function satisfiesAiResourceReserveFloor(
  current: ResourceTransferBundle,
  requested: ResourceTransferBundle,
) {
  return RESOURCE_TRANSFER_KINDS.every((kind) => {
    if (readResourceTransferAmount(requested, kind) <= 0) {
      return true
    }
    return readResourceTransferAmount(current, kind) - readResourceTransferAmount(requested, kind) >= AI_RESOURCE_TRANSFER_RESERVE_FLOOR
  })
}

function addResourceBundles(
  left: ResourceTransferBundle,
  right: ResourceTransferBundle,
): ResourceTransferBundle {
  return {
    food: left.food + right.food,
    wood: left.wood + right.wood,
    stone: left.stone + right.stone,
    iron: left.iron + right.iron,
    copper: (left.copper ?? 0) + (right.copper ?? 0),
  }
}

function subtractResourceBundles(
  left: ResourceTransferBundle,
  right: ResourceTransferBundle,
): ResourceTransferBundle {
  return {
    food: left.food - right.food,
    wood: left.wood - right.wood,
    stone: left.stone - right.stone,
    iron: left.iron - right.iron,
    copper: (left.copper ?? 0) - (right.copper ?? 0),
  }
}

function normalizePositiveIntegerPolicyValue(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isInteger(value)
    ? Math.max(min, Math.min(max, value))
    : fallback
}

export function resolveAiResourceTransferPolicy(faction: WorldState['factions'][string]) {
  return {
    dailyQuotaTotal: normalizePositiveIntegerPolicyValue(
      faction.aiResourceTransferPolicy?.dailyQuotaTotal,
      DEFAULT_AI_RESOURCE_TRANSFER_POLICY.dailyQuotaTotal,
      1,
      AI_RESOURCE_TRANSFER_MAX_TOTAL_PER_ACTION,
    ),
    dailyWindowTicks: normalizePositiveIntegerPolicyValue(
      faction.aiResourceTransferPolicy?.dailyWindowTicks,
      DEFAULT_AI_RESOURCE_TRANSFER_POLICY.dailyWindowTicks,
      1,
      365,
    ),
    cooldownTicks: normalizePositiveIntegerPolicyValue(
      faction.aiResourceTransferPolicy?.cooldownTicks,
      DEFAULT_AI_RESOURCE_TRANSFER_POLICY.cooldownTicks,
      0,
      365,
    ),
  }
}

function resolveAiResourceTransferPolicyPatch(
  faction: WorldState['factions'][string],
  params: {
    dailyQuotaTotal?: number
    dailyWindowTicks?: number
    cooldownTicks?: number
  },
) {
  const currentPolicy = resolveAiResourceTransferPolicy(faction)
  return {
    dailyQuotaTotal: normalizePositiveIntegerPolicyValue(
      params.dailyQuotaTotal ?? currentPolicy.dailyQuotaTotal,
      currentPolicy.dailyQuotaTotal,
      1,
      AI_RESOURCE_TRANSFER_MAX_TOTAL_PER_ACTION,
    ),
    dailyWindowTicks: normalizePositiveIntegerPolicyValue(
      params.dailyWindowTicks ?? currentPolicy.dailyWindowTicks,
      currentPolicy.dailyWindowTicks,
      1,
      365,
    ),
    cooldownTicks: normalizePositiveIntegerPolicyValue(
      params.cooldownTicks ?? currentPolicy.cooldownTicks,
      currentPolicy.cooldownTicks,
      0,
      365,
    ),
  }
}

function resolveAiResourceTransferQuotaState(
  faction: WorldState['factions'][string],
  aiPlayerId: string,
  governorPlayerId: string,
  factionId: string,
  currentTick: number,
  policy: ReturnType<typeof resolveAiResourceTransferPolicy>,
) {
  const existing = faction.aiResourceTransferQuotaByAiPlayer?.[aiPlayerId]
  const existingWindowActive =
    existing &&
    existing.factionId === factionId &&
    existing.governorPlayerId === governorPlayerId &&
    currentTick < existing.windowEndsTick

  return existingWindowActive
    ? existing
    : {
        aiPlayerId,
        governorPlayerId,
        factionId,
        windowStartedTick: currentTick,
        windowEndsTick: currentTick + policy.dailyWindowTicks,
        dailyQuotaTotal: policy.dailyQuotaTotal,
        transferredTotal: 0,
        transferredResources: createEmptyResourceTransferBundle(),
      }
}

function resourceBundleForKind(
  resourceKind: NonNullable<Tile['resourceKind']>,
  amount: number,
): ResourceTransferBundle {
  const resources = createEmptyResourceTransferBundle()
  resources[resourceKind] = amount
  return resources
}

function addResourceBundleToFaction(
  faction: WorldState['factions'][string],
  resources: ResourceTransferBundle,
) {
  faction.food += resources.food
  faction.wood = (faction.wood ?? 0) + resources.wood
  faction.stone = (faction.stone ?? 0) + resources.stone
  faction.iron = (faction.iron ?? 0) + resources.iron
  faction.copper = (faction.copper ?? 0) + (resources.copper ?? 0)
}

function summarizeScenarioRewardPreview(rewards: readonly ScenarioRewardPreview[]): ScenarioRewardTotals | null {
  const totals: ScenarioRewardTotals = {
    jade: 0,
    copper: 0,
    food: 0,
    wood: 0,
    stone: 0,
    iron: 0,
  }

  for (const reward of rewards) {
    if (!Number.isInteger(reward.amount) || reward.amount <= 0) {
      return null
    }

    if (
      reward.kind !== 'jade' &&
      reward.kind !== 'copper' &&
      reward.kind !== 'food' &&
      reward.kind !== 'wood' &&
      reward.kind !== 'stone' &&
      reward.kind !== 'iron'
    ) {
      return null
    }

    totals[reward.kind] += reward.amount
  }

  return totalScenarioRewardAmount(totals) > 0 ? totals : null
}

function resolveActiveWorldAffairsNodeId(
  nodes: readonly { nodeId: string }[],
  achievedNodeIds: ReadonlySet<string>,
): string | null {
  return nodes.find((node) => !achievedNodeIds.has(node.nodeId))?.nodeId ?? null
}

function resolveActiveChapterTaskContext(
  chapters: readonly {
    chapterId: string
    title: string
    rewardPreview: readonly TaskRewardPreview[]
    currentTaskGroupId: string
    nextChapterId?: string | null
    taskGroups: readonly {
      taskGroupId: string
      tasks: readonly {
        taskId: string
        title: string
        rewardPreview: readonly TaskRewardPreview[]
      }[]
    }[]
  }[],
  activeChapterId: string,
  taskId: string,
):
  | {
      task: {
        taskId: string
        title: string
        rewardPreview: readonly TaskRewardPreview[]
      }
      tasks: readonly { taskId: string }[]
      chapterId: string
      chapterTitle: string
      chapterRewardPreview: readonly TaskRewardPreview[]
      nextChapterId: string | null
    }
  | null {
  const chapter = chapters.find((candidate) => candidate.chapterId === activeChapterId)
  const taskGroup = chapter?.taskGroups.find((candidate) => candidate.taskGroupId === chapter.currentTaskGroupId)
  const task = taskGroup?.tasks.find((candidate) => candidate.taskId === taskId)
  if (!taskGroup || !task) {
    return null
  }

  return {
    task,
    tasks: taskGroup.tasks,
    chapterId: chapter?.chapterId ?? activeChapterId,
    chapterTitle: chapter?.title ?? activeChapterId,
    chapterRewardPreview: chapter?.rewardPreview ?? [],
    nextChapterId: chapter?.nextChapterId ?? null,
  }
}

function resolveActiveTaskId(
  tasks: readonly { taskId: string }[],
  claimedTaskIds: ReadonlySet<string>,
): string | null {
  return tasks.find((task) => !claimedTaskIds.has(task.taskId))?.taskId ?? null
}

function applyScenarioRewardTotalsToFaction(
  faction: WorldState['factions'][string],
  rewardTotals: ScenarioRewardTotals,
) {
  faction.jade = (faction.jade ?? 0) + rewardTotals.jade
  faction.copper = (faction.copper ?? 0) + rewardTotals.copper
  faction.food += rewardTotals.food
  faction.wood = (faction.wood ?? 0) + rewardTotals.wood
  faction.stone = (faction.stone ?? 0) + rewardTotals.stone
  faction.iron = (faction.iron ?? 0) + rewardTotals.iron
}

function totalScenarioRewardAmount(rewardTotals: ScenarioRewardTotals) {
  return (
    rewardTotals.jade +
    rewardTotals.copper +
    rewardTotals.food +
    rewardTotals.wood +
    rewardTotals.stone +
    rewardTotals.iron
  )
}

function summarizeTaskRewardPreview(rewards: readonly TaskRewardPreview[]): TaskRewardTotals | null {
  const totals: TaskRewardTotals = {
    copper: 0,
    food: 0,
    wood: 0,
    stone: 0,
    iron: 0,
  }

  for (const reward of rewards) {
    if (!Number.isInteger(reward.amount) || reward.amount <= 0) {
      return null
    }

    if (
      reward.kind !== 'copper' &&
      reward.kind !== 'food' &&
      reward.kind !== 'wood' &&
      reward.kind !== 'stone' &&
      reward.kind !== 'iron'
    ) {
      return null
    }

    totals[reward.kind] += reward.amount
  }

  return totalTaskRewardAmount(totals) > 0 ? totals : null
}

function applyTaskRewardTotalsToFaction(
  faction: WorldState['factions'][string],
  rewardTotals: TaskRewardTotals,
) {
  faction.copper = (faction.copper ?? 0) + rewardTotals.copper
  faction.food += rewardTotals.food
  faction.wood = (faction.wood ?? 0) + rewardTotals.wood
  faction.stone = (faction.stone ?? 0) + rewardTotals.stone
  faction.iron = (faction.iron ?? 0) + rewardTotals.iron
}

function totalTaskRewardAmount(rewardTotals: TaskRewardTotals) {
  return rewardTotals.copper + rewardTotals.food + rewardTotals.wood + rewardTotals.stone + rewardTotals.iron
}

function formatScenarioRewardTotals(rewardTotals: ScenarioRewardTotals) {
  const parts: string[] = []
  if (rewardTotals.jade > 0) parts.push(`玉符 ${rewardTotals.jade}`)
  if (rewardTotals.copper > 0) parts.push(`铜钱 ${rewardTotals.copper}`)
  if (rewardTotals.food > 0) parts.push(`粮草 ${rewardTotals.food}`)
  if (rewardTotals.wood > 0) parts.push(`木材 ${rewardTotals.wood}`)
  if (rewardTotals.stone > 0) parts.push(`石料 ${rewardTotals.stone}`)
  if (rewardTotals.iron > 0) parts.push(`铁矿 ${rewardTotals.iron}`)
  return parts.join('、') || '无'
}

function formatTaskRewardTotals(rewardTotals: TaskRewardTotals) {
  const parts: string[] = []
  if (rewardTotals.copper > 0) parts.push(`铜钱 ${rewardTotals.copper}`)
  if (rewardTotals.food > 0) parts.push(`粮草 ${rewardTotals.food}`)
  if (rewardTotals.wood > 0) parts.push(`木材 ${rewardTotals.wood}`)
  if (rewardTotals.stone > 0) parts.push(`石料 ${rewardTotals.stone}`)
  if (rewardTotals.iron > 0) parts.push(`铁矿 ${rewardTotals.iron}`)
  return parts.join('、') || '无'
}

function isUnitAssignedToAiPlayer(
  faction: WorldState['factions'][string],
  aiPlayerId: string,
  unitId: string,
) {
  const aiPlayer = faction.aiPlayers?.find((candidate) => candidate.id === aiPlayerId)
  return aiPlayer?.unitIds.includes(unitId) ?? false
}

function normalizeTransferLabel(input: string, fallback: string) {
  const normalized = input.trim()
  return normalized.length > 0 ? normalized : fallback
}

export function setAiResourceTransferPolicy(
  world: WorldState,
  params: {
    factionId: string
    dailyQuotaTotal?: number
    dailyWindowTicks?: number
    cooldownTicks?: number
  },
): SetAiResourceTransferPolicyResult {
  const factionId = normalizeTransferLabel(params.factionId, '')
  const hasPolicyPatch =
    params.dailyQuotaTotal !== undefined ||
    params.dailyWindowTicks !== undefined ||
    params.cooldownTicks !== undefined

  if (!hasPolicyPatch) {
    return {
      ok: false,
      message: 'At least one AI resource transfer policy field is required.',
      failureCode: 'invalid_transfer_policy',
    }
  }

  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return {
      ok: false,
      message: `Unknown faction: ${factionId}`,
      failureCode: 'unknown_faction',
    }
  }

  const policy = resolveAiResourceTransferPolicyPatch(faction, params)
  faction.aiResourceTransferPolicy = policy

  prependReport(
    nextWorld,
    nextWorld.tick,
    'AI资源输送策略',
    `${resolveFactionDisplayLabel(factionId)} 已更新 AI 资源输送每日额度/冷却策略。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: `AI resource transfer policy updated for ${factionId}.`,
    factionId,
    policy,
  }
}

export function transferFactionResourcesToGovernor(
  world: WorldState,
  params: {
    sourceFactionId: string
    sourceAiPlayerId: string
    governorPlayerId: string
    resources: Partial<ResourceTransferBundle>
    reason: string
    approvedBy: string
  },
): TransferFactionResourcesToGovernorResult {
  const sourceFactionId = normalizeTransferLabel(params.sourceFactionId, '')
  const sourceAiPlayerId = normalizeTransferLabel(params.sourceAiPlayerId, '')
  const governorPlayerId = normalizeTransferLabel(params.governorPlayerId, '')
  const approvedBy = normalizeTransferLabel(params.approvedBy, '')
  const reason = normalizeTransferLabel(params.reason, 'AI resource transfer')
  const resources = normalizeResourceTransferBundle(params.resources)

  if (!resources) {
    return {
      ok: false,
      message: 'Invalid resource transfer amount.',
      failureCode: 'invalid_resource_amount',
    }
  }

  const transferTotal = totalResourceTransferAmount(resources)
  if (transferTotal > AI_RESOURCE_TRANSFER_MAX_TOTAL_PER_ACTION) {
    return {
      ok: false,
      message: `Resource transfer exceeds per-action cap ${AI_RESOURCE_TRANSFER_MAX_TOTAL_PER_ACTION}.`,
      failureCode: 'transfer_limit_exceeded',
    }
  }

  if (!governorPlayerId || approvedBy !== governorPlayerId) {
    return {
      ok: false,
      message: 'Resource transfers require explicit approval by the target governor.',
      failureCode: 'approval_required',
    }
  }

  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[sourceFactionId]
  if (!faction) {
    return {
      ok: false,
      message: `Unknown source faction: ${sourceFactionId}`,
      failureCode: 'unknown_source_faction',
    }
  }

  const account = faction.aiResourceAccounts?.[sourceAiPlayerId]
  if (!account) {
    return {
      ok: false,
      message: `AI resource account not found: ${sourceAiPlayerId}`,
      failureCode: 'missing_ai_resource_account',
    }
  }

  if (account.governorPlayerId !== governorPlayerId || account.factionId !== sourceFactionId) {
    return {
      ok: false,
      message: 'AI resource transfer is limited to the same governor and source faction in v1.',
      failureCode: 'governor_mismatch',
    }
  }

  const transferPolicy = resolveAiResourceTransferPolicy(faction)
  const quotaState = resolveAiResourceTransferQuotaState(
    faction,
    sourceAiPlayerId,
    governorPlayerId,
    sourceFactionId,
    nextWorld.tick,
    transferPolicy,
  )

  if (quotaState.cooldownUntilTick !== undefined && quotaState.cooldownUntilTick > nextWorld.tick) {
    return {
      ok: false,
      message: `AI resource transfer is cooling down until tick ${quotaState.cooldownUntilTick}.`,
      failureCode: 'transfer_cooldown_active',
    }
  }

  if (quotaState.transferredTotal + transferTotal > quotaState.dailyQuotaTotal) {
    return {
      ok: false,
      message: `AI resource transfer daily quota exceeded: ${quotaState.transferredTotal + transferTotal}/${quotaState.dailyQuotaTotal}.`,
      failureCode: 'daily_quota_exceeded',
    }
  }

  if (!hasSufficientAiResources(account.resources, resources)) {
    return {
      ok: false,
      message: 'AI resource account has insufficient resources for this transfer.',
      failureCode: 'insufficient_resources',
    }
  }

  if (!satisfiesAiResourceReserveFloor(account.resources, resources)) {
    return {
      ok: false,
      message: `AI resource account must keep at least ${AI_RESOURCE_TRANSFER_RESERVE_FLOOR} of each transferred resource.`,
      failureCode: 'reserve_floor_violation',
    }
  }

  account.resources = subtractResourceBundles(account.resources, resources)
  account.updatedTick = nextWorld.tick
  faction.aiResourceTransferQuotaByAiPlayer = {
    ...(faction.aiResourceTransferQuotaByAiPlayer ?? {}),
    [sourceAiPlayerId]: {
      ...quotaState,
      transferredTotal: quotaState.transferredTotal + transferTotal,
      transferredResources: addResourceBundles(quotaState.transferredResources, resources),
      lastTransferTick: nextWorld.tick,
      cooldownUntilTick: nextWorld.tick + transferPolicy.cooldownTicks,
    },
  }

  const existingInboxes = faction.governorResourceInboxes ?? {}
  const existingInbox = existingInboxes[governorPlayerId]
  const transferId = `resource_transfer_${nextWorld.tick}_${sourceAiPlayerId}_${governorPlayerId}_${existingInbox?.pendingTransfers.length ?? 0}`
  const pendingTransfer = {
    id: transferId,
    sourceAiPlayerId,
    sourceFactionId,
    governorPlayerId,
    resources,
    reason,
    approvedBy,
    status: 'pending' as const,
    createdTick: nextWorld.tick,
  }
  const inbox = existingInbox
    ? {
        ...existingInbox,
        pendingTransfers: [...existingInbox.pendingTransfers, pendingTransfer],
        totalPendingResources: addResourceBundles(existingInbox.totalPendingResources, resources),
      }
    : {
        governorPlayerId,
        pendingTransfers: [pendingTransfer],
        totalPendingResources: { ...resources },
      }
  faction.governorResourceInboxes = {
    ...existingInboxes,
    [governorPlayerId]: inbox,
  }

  prependReport(
    nextWorld,
    nextWorld.tick,
    'AI资源输送',
    `${sourceAiPlayerId} 已向总督 ${governorPlayerId} 的待领取收件箱转入资源，等待后续领取结算。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: `AI resource transfer queued for governor ${governorPlayerId}.`,
    transferId,
    sourceAiPlayerId,
    governorPlayerId,
    resources,
  }
}

export function claimGovernorResourceInbox(
  world: WorldState,
  params: {
    factionId: string
    governorPlayerId: string
    transferId?: string
  },
): ClaimGovernorResourceInboxResult {
  const factionId = normalizeTransferLabel(params.factionId, '')
  const governorPlayerId = normalizeTransferLabel(params.governorPlayerId, '')
  const transferId = params.transferId?.trim()
  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return {
      ok: false,
      message: `Unknown faction: ${factionId}`,
      failureCode: 'unknown_faction',
    }
  }

  const inbox = faction.governorResourceInboxes?.[governorPlayerId]
  if (!inbox || inbox.pendingTransfers.length === 0) {
    return {
      ok: false,
      message: `Governor resource inbox has no pending transfers: ${governorPlayerId}`,
      failureCode: 'missing_governor_inbox',
    }
  }

  const selectedTransfers = transferId
    ? inbox.pendingTransfers.filter((transfer) => transfer.id === transferId)
    : inbox.pendingTransfers
  if (selectedTransfers.length === 0) {
    return {
      ok: false,
      message: `Governor resource transfer not found: ${transferId}`,
      failureCode: 'missing_governor_transfer',
    }
  }

  const claimedResources = selectedTransfers.reduce(
    (total, transfer) => addResourceBundles(total, transfer.resources),
    createEmptyResourceTransferBundle(),
  )
  const selectedTransferIds = new Set(selectedTransfers.map((transfer) => transfer.id))
  inbox.pendingTransfers = inbox.pendingTransfers.filter((transfer) => !selectedTransferIds.has(transfer.id))
  inbox.totalPendingResources = subtractResourceBundles(inbox.totalPendingResources, claimedResources)
  addResourceBundleToFaction(faction, claimedResources)
  const existingSettlements = faction.governorResourceSettlements ?? {}
  const previousSettlements = existingSettlements[governorPlayerId] ?? []
  faction.governorResourceSettlements = {
    ...existingSettlements,
    [governorPlayerId]: [
      ...previousSettlements,
      ...selectedTransfers.map((transfer) => ({
        id: transfer.id,
        sourceAiPlayerId: transfer.sourceAiPlayerId,
        sourceFactionId: transfer.sourceFactionId,
        governorPlayerId: transfer.governorPlayerId,
        resources: { ...transfer.resources },
        reason: transfer.reason,
        approvedBy: transfer.approvedBy,
        status: 'claimed' as const,
        createdTick: transfer.createdTick,
        claimedTick: nextWorld.tick,
      })),
    ],
  }

  prependReport(
    nextWorld,
    nextWorld.tick,
    '总督资源领取',
    `总督 ${governorPlayerId} 已领取 AI 输送资源并结算到 ${resolveFactionDisplayLabel(factionId)} 资源存量。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: `Governor ${governorPlayerId} claimed ${selectedTransfers.length} pending resource transfer(s).`,
    governorPlayerId,
    claimedTransferIds: [...selectedTransferIds],
    claimedResources,
  }
}

export function gatherAiResourceTile(
  world: WorldState,
  params: {
    factionId: string
    aiPlayerId: string
    unitId: string
    tileId: string
  },
): GatherAiResourceTileResult {
  const factionId = normalizeTransferLabel(params.factionId, '')
  const aiPlayerId = normalizeTransferLabel(params.aiPlayerId, '')
  const unitId = normalizeTransferLabel(params.unitId, '')
  const tileId = normalizeTransferLabel(params.tileId, '')
  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return {
      ok: false,
      message: `Unknown faction: ${factionId}`,
      failureCode: 'unknown_faction',
    }
  }

  const account = faction.aiResourceAccounts?.[aiPlayerId]
  if (!account) {
    return {
      ok: false,
      message: `AI resource account not found: ${aiPlayerId}`,
      failureCode: 'missing_ai_resource_account',
    }
  }

  if (account.factionId !== factionId) {
    return {
      ok: false,
      message: 'AI resource account faction does not match the gathering faction.',
      failureCode: 'governor_mismatch',
    }
  }

  const unit = getUnitById(nextWorld, unitId)
  if (!unit) {
    return {
      ok: false,
      message: `Unit not found: ${unitId}`,
      failureCode: 'unknown_unit',
    }
  }

  if (unit.faction !== factionId) {
    return {
      ok: false,
      message: `Unit ${unitId} does not belong to faction ${factionId}.`,
      failureCode: 'unit_faction_mismatch',
    }
  }

  if (!isUnitAssignedToAiPlayer(faction, aiPlayerId, unitId)) {
    return {
      ok: false,
      message: `Unit ${unitId} is not assigned to AI player ${aiPlayerId}.`,
      failureCode: 'unit_not_assigned_to_ai_player',
    }
  }

  const tile = getTileById(nextWorld, tileId)
  if (!tile) {
    return {
      ok: false,
      message: `Resource tile not found: ${tileId}`,
      failureCode: 'unknown_resource_tile',
    }
  }

  if (tile.type !== 'resource' || !tile.resourceKind) {
    return {
      ok: false,
      message: `Tile ${tileId} is not a resource tile.`,
      failureCode: 'tile_not_resource',
    }
  }

  if (tile.owner !== factionId) {
    return {
      ok: false,
      message: `Resource tile ${tileId} is not controlled by faction ${factionId}.`,
      failureCode: 'tile_not_controlled',
    }
  }

  if (unit.tileId !== tileId) {
    return {
      ok: false,
      message: `Unit ${unitId} is not stationed on resource tile ${tileId}.`,
      failureCode: 'unit_not_on_tile',
    }
  }

  const existingClaims = faction.aiResourceGatherClaims ?? {}
  if (existingClaims[tileId]) {
    return {
      ok: false,
      message: `Resource tile ${tileId} has already been gathered for AI resources.`,
      failureCode: 'resource_tile_already_gathered',
    }
  }

  const resourceLevel = Math.max(1, Math.round(tile.resourceLevel ?? 1))
  const resources = resourceBundleForKind(tile.resourceKind, resourceLevel * AI_RESOURCE_GATHER_AMOUNT_PER_LEVEL)
  account.resources = addResourceBundles(account.resources, resources)
  account.updatedTick = nextWorld.tick

  const claimId = `ai_resource_gather_${nextWorld.tick}_${aiPlayerId}_${tileId}`
  faction.aiResourceGatherClaims = {
    ...existingClaims,
    [tileId]: {
      id: claimId,
      aiPlayerId,
      unitId,
      tileId,
      factionId,
      resourceKind: tile.resourceKind,
      resourceLevel,
      resources,
      createdTick: nextWorld.tick,
    },
  }

  prependReport(
    nextWorld,
    nextWorld.tick,
    'AI资源采集',
    `${aiPlayerId} 已在 ${tile.name} 完成一次性采集，资源入账 AI 子账户。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: `AI resource account ${aiPlayerId} gathered ${tile.resourceKind} from ${tileId}.`,
    claimId,
    aiPlayerId,
    unitId,
    tileId,
    resources,
  }
}

export function occupyTile(
  world: WorldState,
  params: {
    factionId: string
    aiPlayerId?: string
    unitId: string
    tileId: string
  },
): OccupyTileResult {
  const factionId = normalizeTransferLabel(params.factionId, '')
  const aiPlayerId = normalizeTransferLabel(params.aiPlayerId ?? '', '')
  const unitId = normalizeTransferLabel(params.unitId, '')
  const tileId = normalizeTransferLabel(params.tileId, '')

  if (hasActiveOrders(world, factionId)) {
    return {
      ok: false,
      message: `Faction ${factionId} has active orders; tile occupy requires an idle action window.`,
      failureCode: 'active_orders_exist',
    }
  }

  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return {
      ok: false,
      message: `Unknown faction: ${factionId}`,
      failureCode: 'unknown_faction',
    }
  }

  const unit = getUnitById(nextWorld, unitId)
  if (!unit) {
    return {
      ok: false,
      message: `Unit not found: ${unitId}`,
      failureCode: 'unknown_unit',
    }
  }

  if (unit.faction !== factionId) {
    return {
      ok: false,
      message: `Unit ${unitId} does not belong to faction ${factionId}.`,
      failureCode: 'unit_faction_mismatch',
    }
  }

  if (aiPlayerId && !isUnitAssignedToAiPlayer(faction, aiPlayerId, unitId)) {
    return {
      ok: false,
      message: `Unit ${unitId} is not assigned to AI player ${aiPlayerId}.`,
      failureCode: 'unit_not_assigned_to_ai_player',
    }
  }

  const tile = getTileById(nextWorld, tileId)
  if (!tile) {
    return {
      ok: false,
      message: `Tile not found: ${tileId}`,
      failureCode: 'unknown_tile',
    }
  }

  if (tile.type === 'city' || tile.type === 'fog') {
    return {
      ok: false,
      message: `Tile ${tile.name} requires a dedicated ${tile.type === 'city' ? 'siege' : 'scout'} authority before occupy.`,
      failureCode: 'tile_not_occupiable',
    }
  }

  if (tile.owner === factionId) {
    return {
      ok: false,
      message: `Tile ${tile.name} is already controlled by faction ${factionId}.`,
      failureCode: 'tile_already_controlled',
    }
  }

  if (unit.tileId !== tileId) {
    return {
      ok: false,
      message: `Unit ${unitId} must stand on tile ${tileId} before occupying it.`,
      failureCode: 'unit_not_on_tile',
    }
  }

  if (tile.owner !== 'neutral') {
    if (hasCeasefireOrAlliance(nextWorld, factionId, tile.owner)) {
      return {
        ok: false,
        message: `Tile ${tile.name} is controlled by ${tile.owner}; alliance or ceasefire blocks hostile occupy.`,
        failureCode: 'tile_not_neutral',
      }
    }

    if (!spendFactionResources(nextWorld, factionId, 1, 1)) {
      return {
        ok: false,
        message: `Resources are insufficient; occupying ${tile.name} requires 1 action point and 1 food.`,
        failureCode: 'insufficient_resources',
      }
    }

    const previousOwner = tile.owner
    const hostileDefenders = nextWorld.units.filter(
      (candidate) =>
        candidate.faction !== factionId &&
        candidate.tileId === tileId &&
        !hasCeasefireOrAlliance(nextWorld, factionId, candidate.faction),
    )
    let pvpBattle: PvPTileOccupyBattleResolution | undefined

    if (hostileDefenders.length > 0) {
      pvpBattle = resolveOccupyTilePvpBattle(nextWorld, unit, tile, hostileDefenders)
      if (pvpBattle.outcome !== 'win') {
        bumpWorldVersion(nextWorld)
        return {
          ok: true,
          world: nextWorld,
          message: `PvP battle on ${tileId} resolved without occupation.`,
          aiPlayerId: aiPlayerId || undefined,
          unitId,
          tileId,
          previousOwner,
          occupied: false,
          pvpBattle,
        }
      }
    }

    tile.owner = factionId
    if (!pvpBattle) {
      tile.enemyPressure = Math.max(0, tile.enemyPressure - 1)
    }
    unit.status = '占领中'
    unit.currentTask = `占领${tile.name}`

    prependReport(
      nextWorld,
      nextWorld.tick,
      pvpBattle ? 'PvP占地完成' : '对立空地占领',
      `${aiPlayerId || resolveFactionDisplayLabel(factionId)} 指挥 ${unit.name} 接管 ${tile.name}，原归属 ${previousOwner}，消耗 1 行动点与 1 粮草。${
        pvpBattle ? `战斗结论：${pvpBattle.summary}` : ''
      }`,
    )
    bumpWorldVersion(nextWorld)

    return {
      ok: true,
      world: nextWorld,
      message: `AI player ${aiPlayerId} occupied hostile tile ${tileId}.`,
      aiPlayerId: aiPlayerId || undefined,
      unitId,
      tileId,
      previousOwner,
      occupied: true,
      pvpBattle,
    }
  }

  if (hasHostileUnit(nextWorld, tileId, factionId)) {
    return {
      ok: false,
      message: `Tile ${tile.name} still has hostile units; resolve battle before occupy.`,
      failureCode: 'tile_occupied_by_hostile_unit',
    }
  }

  if (!spendFactionResources(nextWorld, factionId, 1, 1)) {
    return {
      ok: false,
      message: `Resources are insufficient; occupying ${tile.name} requires 1 action point and 1 food.`,
      failureCode: 'insufficient_resources',
    }
  }

  const previousOwner = tile.owner
  const guardTemplate = resolveResourceGuardTemplateForTile(tile)
  let guardBattle: ResourceGuardBattleResolution | undefined
  let heroGrowth: HeroExperienceGrowthResult | undefined
  if (guardTemplate) {
    guardBattle = resolveResourceGuardBattle(nextWorld, unit, tile, guardTemplate)
    heroGrowth = applyHeroResourceGuardExperience(unit, guardTemplate.resourceLevel)
    const actorLabel = aiPlayerId || resolveFactionDisplayLabel(factionId)
    if (guardBattle.outcome !== 'win') {
      unit.status = '待命'
      unit.currentTask = `攻打${tile.name}受阻`
      tile.enemyPressure = Math.min(6, tile.enemyPressure + 1)
      prependReport(
        nextWorld,
        nextWorld.tick,
        '资源地守军阻击成功',
        `${actorLabel} 指挥 ${unit.name} 攻打 ${tile.name}，未能击破 ${guardTemplate.label}。${guardBattle.summary}`,
      )
      bumpWorldVersion(nextWorld)
      return {
        ok: true,
        world: nextWorld,
        message: `Resource guard on ${tileId} held the tile.`,
        aiPlayerId: aiPlayerId || undefined,
        unitId,
        tileId,
        previousOwner,
        occupied: false,
        guardTemplateId: guardTemplate.id,
        guardBattle,
        heroGrowth,
      }
    }
  }

  tile.owner = factionId
  tile.enemyPressure = Math.max(0, tile.enemyPressure - (guardTemplate ? 2 : 1))
  unit.status = '占领中'
  unit.currentTask = `占领${tile.name}`

  prependReport(
    nextWorld,
    nextWorld.tick,
    guardTemplate ? '资源地守军击破' : 'AI占地完成',
    `${aiPlayerId || resolveFactionDisplayLabel(factionId)} 指挥 ${unit.name} 占领 ${tile.name}，消耗 1 行动点与 1 粮草。${
      guardTemplate ? `已击破 ${guardTemplate.label}：${summarizeResourceGuardTemplate(guardTemplate)}。` : ''
    }${heroGrowth ? `经验 +${heroGrowth.expGained}。` : ''}`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: `AI player ${aiPlayerId} occupied ${tileId}.`,
    aiPlayerId: aiPlayerId || undefined,
    unitId,
    tileId,
    previousOwner,
    occupied: true,
    guardTemplateId: guardTemplate?.id,
    guardBattle,
    heroGrowth,
  }
}

export function healTroop(
  world: WorldState,
  params: {
    factionId: string
    aiPlayerId: string
    unitId: string
  },
): TroopHealResult {
  const factionId = normalizeTransferLabel(params.factionId, '')
  const aiPlayerId = normalizeTransferLabel(params.aiPlayerId, '')
  const unitId = normalizeTransferLabel(params.unitId, '')

  if (hasActiveOrders(world, factionId)) {
    return {
      ok: false,
      message: `Faction ${factionId} has active orders; troop heal requires an idle action window.`,
      failureCode: 'active_orders_exist',
    }
  }

  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return {
      ok: false,
      message: `Unknown faction: ${factionId}`,
      failureCode: 'unknown_faction',
    }
  }

  const unit = getUnitById(nextWorld, unitId)
  if (!unit) {
    return {
      ok: false,
      message: `Unit not found: ${unitId}`,
      failureCode: 'unknown_unit',
    }
  }

  if (unit.faction !== factionId) {
    return {
      ok: false,
      message: `Unit ${unitId} does not belong to faction ${factionId}.`,
      failureCode: 'unit_faction_mismatch',
    }
  }

  if (!isUnitAssignedToAiPlayer(faction, aiPlayerId, unitId)) {
    return {
      ok: false,
      message: `Unit ${unitId} is not assigned to AI player ${aiPlayerId}.`,
      failureCode: 'unit_not_assigned_to_ai_player',
    }
  }

  const strengthBefore = unit.strength
  const supplyBefore = unit.supply
  const strengthAfter = Math.min(TROOP_HEAL_MAX_STRENGTH, strengthBefore + TROOP_HEAL_STRENGTH_GAIN)
  const supplyAfter = Math.min(TROOP_HEAL_MAX_SUPPLY, supplyBefore + TROOP_HEAL_SUPPLY_GAIN)
  if (strengthAfter === strengthBefore && supplyAfter === supplyBefore) {
    return {
      ok: false,
      message: `Unit ${unitId} is already at full troop strength and supply.`,
      failureCode: 'unit_already_full',
    }
  }

  if (!spendFactionResources(nextWorld, factionId, TROOP_HEAL_ACTION_POINTS, TROOP_HEAL_FOOD)) {
    return {
      ok: false,
      message: `Resources are insufficient; healing ${unit.name} requires ${TROOP_HEAL_ACTION_POINTS} action point and ${TROOP_HEAL_FOOD} food.`,
      failureCode: 'insufficient_resources',
    }
  }

  unit.strength = strengthAfter
  unit.supply = supplyAfter
  unit.status = '待命'
  unit.currentTask = `整补${unit.name}`

  prependReport(
    nextWorld,
    nextWorld.tick,
    'AI部队整补',
    `${aiPlayerId} 指挥 ${unit.name} 整补，兵力 ${strengthBefore} -> ${strengthAfter}，补给 ${supplyBefore} -> ${supplyAfter}。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: `AI player ${aiPlayerId} healed ${unitId}.`,
    aiPlayerId,
    unitId,
    strengthBefore,
    strengthAfter,
    supplyBefore,
    supplyAfter,
    resourcesSpent: {
      actionPoints: TROOP_HEAL_ACTION_POINTS,
      food: TROOP_HEAL_FOOD,
    },
  }
}

export function queueTacticalOverride(
  world: WorldState,
  unitId: string,
  templateId: TacticalTemplateId,
  targetTileId: string,
  summary: string,
  factionId: string = resolveFallbackFactionId(world),
) {
  const nextWorld = shallowCloneWorld(world)
  const unit = getUnitById(nextWorld, unitId)
  const targetTile = getTileById(nextWorld, targetTileId)

  if (!unit || !targetTile || unit.faction !== factionId) {
    return world
  }

  nextWorld.tacticalOverrides = nextWorld.tacticalOverrides.filter(
    (override) =>
      !(
        override.unitId === unitId &&
        (override.status === 'queued' || override.status === 'committed')
      ),
  )

  nextWorld.tacticalOverrides.unshift({
    id: `tac_${nextWorld.tick}_${unitId}_${templateId}_${targetTileId}`,
    unitId,
    templateId,
    targetTileId,
    summary,
    status: 'queued',
    createdTick: nextWorld.tick,
    createdWorldVersion: nextWorld.worldVersion,
  })
  nextWorld.tacticalOverrides = nextWorld.tacticalOverrides.slice(0, 16)

  prependReport(
    nextWorld,
    nextWorld.tick,
    '战术插令待执行',
    `${unit.name} 已加入 ${templateLabel(templateId)} 指令，目标 ${targetTile.name}。`,
  )
  bumpWorldVersion(nextWorld)
  return nextWorld
}

export function deployReserveHero(
  world: WorldState,
  factionId: string,
  heroId: string,
  tileId: string,
  coHeroIds: string[] = [],
): DeployReserveResult {
  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[factionId]
  const heroCommand = faction.heroCommand
  const targetTile = getTileById(nextWorld, tileId)

  if (hasActiveOrders(nextWorld)) {
    return { ok: false, message: '当前已有 AI 任务在执行，请等待本轮执行完成后再调整 reserve 编组。' }
  }

  if (!targetTile) {
    return { ok: false, message: '部署支点不存在。' }
  }

  if (!isDeployAnchorTile(targetTile, factionId)) {
    return { ok: false, message: '仅可在己方城池、关口或资源支点完成编组。' }
  }

  const normalizedCoHeroIds = Array.from(
    new Set(coHeroIds.map((candidateId) => candidateId.trim()).filter((candidateId) => candidateId !== '' && candidateId !== heroId)),
  ).slice(0, 2)

  const existingFormation = findExistingReserveFormation(nextWorld, factionId, heroId, tileId, normalizedCoHeroIds)
  if (existingFormation) {
    const existingHeroes = [existingFormation.hero, ...(existingFormation.coHeroes ?? [])]
    return {
      ok: true,
      world: nextWorld,
      message: `${existingHeroes.map((hero) => hero.name).join('、')} 已在 ${targetTile.name} 完成编组，无需重复部署。`,
      unitId: existingFormation.id,
      heroIds: [heroId, ...normalizedCoHeroIds],
      heroNames: existingHeroes.map((hero) => hero.name),
    }
  }

  if (!heroCommand.reserveHeroIds.includes(heroId)) {
    return { ok: false, message: '目标武将当前不在 reserve 中。' }
  }
  const invalidCoHeroId = normalizedCoHeroIds.find((candidateId) => !heroCommand.reserveHeroIds.includes(candidateId))
  if (invalidCoHeroId) {
    return { ok: false, message: `副将 ${invalidCoHeroId} 当前不在 reserve 中。` }
  }

  if (nextWorld.units.filter((unit) => unit.faction === factionId).length >= heroCommand.commandLimit) {
    return { ok: false, message: '当前执行单元已达到指挥上限。' }
  }

  if (faction.food < 3) {
    return { ok: false, message: '粮草不足，至少需要 3 点粮草才能完成编组。' }
  }

  if (faction.actionPoints < 1) {
    return { ok: false, message: '行动点不足，至少需要 1 点行动点才能完成编组。' }
  }

  const formationHeroIds = [heroId, ...normalizedCoHeroIds]
  heroCommand.reserveHeroIds = heroCommand.reserveHeroIds.filter((candidateId) => !formationHeroIds.includes(candidateId))
  const spawnedUnit = createReserveUnit(nextWorld, factionId, heroId, tileId, 'manual', normalizedCoHeroIds)
  nextWorld.units.push(spawnedUnit)
  faction.food = Math.max(0, faction.food - 3)
  faction.actionPoints = Math.max(0, faction.actionPoints - 1)

  prependReport(
    nextWorld,
    nextWorld.tick,
    `${resolveFactionDisplayLabel(factionId)} reserve 手动编组完成`,
    `${[spawnedUnit.hero, ...(spawnedUnit.coHeroes ?? [])].map((hero) => hero.name).join('、')} 已在 ${targetTile.name} 完成编组并进入地图待命。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    message: `${[spawnedUnit.hero, ...(spawnedUnit.coHeroes ?? [])].map((hero) => hero.name).join('、')} 已在 ${targetTile.name} 完成编组，现可纳入 AI 指挥链。`,
    unitId: spawnedUnit.id,
    heroIds: formationHeroIds,
    heroNames: [spawnedUnit.hero, ...(spawnedUnit.coHeroes ?? [])].map((hero) => hero.name),
  }
}

export function upgradeCity(world: WorldState, tileId: string, factionId: string = resolveFallbackFactionId(world)): UpgradeCityResult {
  if (hasActiveOrders(world)) {
    return { ok: false, message: '当前已有 AI 任务在执行，请等待本轮执行完成后再升级城池。' }
  }

  const nextWorld = shallowCloneWorld(world)
  const cluster = nextWorld.map.overlays.cityClusters.find(
    (item) => item.cityHallTileId === tileId || item.tileIds.includes(tileId),
  )

  if (!cluster) {
    return { ok: false, message: '目标地块不在可识别的城池连续层中。' }
  }

  if (cluster.owner !== factionId) {
    return { ok: false, message: `当前仅允许升级 ${resolveFactionDisplayLabel(factionId)} 城池。` }
  }

  if (!cluster.isUpgradeable) {
    return { ok: false, message: '该城池已达到当前阶段上限。' }
  }

  if (cluster.footprintTiles !== 9) {
    return { ok: false, message: '当前城池规模不在可升级范围内。' }
  }

  const upgradeRule = CITY_UPGRADE_RULES[cluster.footprintTiles]
  if (!upgradeRule) {
    return { ok: false, message: '未找到对应的城池升级规则。' }
  }

  const hallTile = getTileById(nextWorld, cluster.cityHallTileId)
  if (!hallTile) {
    return { ok: false, message: '城主府锚点缺失，无法升级。' }
  }

  const nextFootprintTileIds = resolveCityUpgradeFootprintTileIds(
    nextWorld,
    hallTile,
    upgradeRule.nextFootprintTiles,
    cluster.tileIds,
  )
  if (nextFootprintTileIds.length !== upgradeRule.nextFootprintTiles) {
    return { ok: false, message: '扩建范围缺失可用地块，请清理周边后重试。' }
  }

  const blockedByOpposingUnit = nextFootprintTileIds.find((candidateTileId) => hasHostileUnit(nextWorld, candidateTileId, cluster.owner))
  if (blockedByOpposingUnit) {
    const blockedTile = getTileById(nextWorld, blockedByOpposingUnit)
    return {
      ok: false,
      message: `扩建范围存在对立单位占据地块（${blockedTile?.name ?? blockedByOpposingUnit}）。`,
    }
  }

  const blockedTiles = nextFootprintTileIds
    .map((candidateTileId) => getTileById(nextWorld, candidateTileId))
    .filter((candidate): candidate is Tile => !!candidate)
    .filter((candidate) => candidate.owner !== factionId)

  if (blockedTiles.length > 0) {
    return {
      ok: false,
      message: `扩建范围存在非我方地块（${blockedTiles[0].name}），请先完成占领。`,
    }
  }

  if (!spendResources(nextWorld, factionId, upgradeRule.actionPoints, upgradeRule.food)) {
    return {
      ok: false,
      message: `资源不足，升级需要 ${upgradeRule.actionPoints} 行动点与 ${upgradeRule.food} 点粮草。`,
    }
  }

  const cityLevelTarget =
    upgradeRule.nextFootprintTiles >= 49 ? 7 :
      upgradeRule.nextFootprintTiles >= 25 ? 5 : 3
  for (const candidateTileId of nextFootprintTileIds) {
    const tile = getTileById(nextWorld, candidateTileId)
    if (!tile) {
      continue
    }

    tile.owner = factionId
    tile.type = 'city'
    tile.terrain = 'urban'
    tile.moveCost = 1
    tile.cityLevel = Math.max(tile.cityLevel ?? cityLevelTarget, cityLevelTarget)
    tile.enemyPressure = Math.max(0, Math.min(5, tile.enemyPressure))
    tile.scoutingDifficulty = Math.max(tile.scoutingDifficulty, cityLevelTarget >= 7 ? 3 : 2)
    tile.landmarkId = cluster.id
    tile.landmarkName = cluster.name
  }

  cluster.tileIds = nextFootprintTileIds
  cluster.centerTileId = cluster.cityHallTileId
  cluster.footprintTiles = upgradeRule.nextFootprintTiles
  cluster.footprintTier = resolveCityFootprintTier(upgradeRule.nextFootprintTiles)
  cluster.upgradeCapTiles = upgradeRule.nextFootprintTiles
  cluster.isUpgradeable = false

  prependReport(
    nextWorld,
    nextWorld.tick,
    '城池扩建完成',
    `${cluster.name} 已扩建至 ${upgradeRule.nextFootprintTiles} 格，消耗 ${upgradeRule.actionPoints} 行动点与 ${upgradeRule.food} 点粮草。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    cityHallTileId: cluster.cityHallTileId,
    message: `${cluster.name} 扩建完成，当前规模 ${upgradeRule.nextFootprintTiles} 格。`,
  }
}

export function upgradeCityTech(
  world: WorldState,
  tileId: string,
  techId: CityTechTrackId,
  factionId: string = resolveFallbackFactionId(world),
): UpgradeCityTechResult {
  if (hasActiveOrders(world, factionId)) {
    return {
      ok: false,
      failureCode: 'construction_queue_occupied',
      message: 'Active AI orders are running. Wait for this tick to finish before researching city tech.',
    }
  }

  const nextWorld = shallowCloneWorld(world)
  const cluster = nextWorld.map.overlays.cityClusters.find(
    (item) => item.cityHallTileId === tileId || item.tileIds.includes(tileId),
  )

  if (!cluster) {
    return { ok: false, failureCode: 'city_not_found', message: 'Target tile is not part of a valid city cluster.' }
  }

  if (cluster.owner !== factionId) {
    return {
      ok: false,
      failureCode: 'wrong_faction',
      message: `Only ${resolveFactionDisplayLabel(factionId)} cities can research city tech.`,
    }
  }

  const rule = CITY_TECH_UPGRADE_RULES[techId]
  if (!rule) {
    return { ok: false, failureCode: 'unsupported_building', message: 'Unsupported city tech track.' }
  }

  if (cluster.footprintTiles < rule.minFootprint) {
    return {
      ok: false,
      failureCode: 'prerequisite_not_met',
      message: `${CITY_TECH_LABELS[techId]} requires city footprint >= ${rule.minFootprint} tiles.`,
    }
  }

  cluster.techLevels = ensureCityTechLevels(cluster)
  const currentLevel = cluster.techLevels[techId]
  if (currentLevel >= rule.maxLevel) {
    return {
      ok: false,
      failureCode: 'building_level_at_max',
      previousLevel: currentLevel,
      message: `${CITY_TECH_LABELS[techId]} is already max level.`,
    }
  }

  const resourcesSpent = resolveCityTechUpgradeResources(techId, currentLevel)
  if (!spendFactionUpgradeResources(nextWorld, factionId, resourcesSpent)) {
    return {
      ok: false,
      failureCode: 'insufficient_resources',
      previousLevel: currentLevel,
      resourcesSpent,
      message: `Insufficient resources. Need ${formatUpgradeResourceSpend(resourcesSpent)}.`,
    }
  }

  const nextLevel = currentLevel + 1
  cluster.techLevels[techId] = nextLevel

  let bonusNote = 'City-wide efficiency improved.'
  switch (techId) {
    case 'governance': {
      nextWorld.factions[factionId].heroCommand.developmentPoints += 1
      bonusNote = 'Development points +1.'
      break
    }
    case 'logistics': {
      nextWorld.factions[factionId].food += 2
      bonusNote = 'Immediate +2 food bonus.'
      break
    }
    case 'defense': {
      for (const clusterTileId of cluster.tileIds) {
        const tile = getTileById(nextWorld, clusterTileId)
        if (!tile) {
          continue
        }
        tile.scoutingDifficulty = Math.max(tile.scoutingDifficulty, 2 + Math.floor(nextLevel / 2))
        tile.enemyPressure = Math.max(0, tile.enemyPressure - 1)
      }
      bonusNote = 'Defense scouting difficulty increased and opposing pressure reduced.'
      break
    }
    case 'recruitment': {
      nextWorld.factions[factionId].actionPoints = Math.min(12, nextWorld.factions[factionId].actionPoints + 1)
      bonusNote = 'Immediate +1 AP recovery.'
      break
    }
    default:
      break
  }

  prependReport(
    nextWorld,
    nextWorld.tick,
    'City Tech Upgraded',
    `${cluster.name} researched ${CITY_TECH_LABELS[techId]} Lv.${nextLevel}. Cost ${formatUpgradeResourceSpend(resourcesSpent)}. ${bonusNote}`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    cityHallTileId: cluster.cityHallTileId,
    techId,
    previousLevel: currentLevel,
    nextLevel,
    resourcesSpent,
    message: `${cluster.name} upgraded ${CITY_TECH_LABELS[techId]} to Lv.${nextLevel}.`,
  }
}

export function promoteCityBuilding(
  world: WorldState,
  cityId: string,
  groupId: string,
  buildingId: string,
  factionId: string = resolveFallbackFactionId(world),
): PromoteCityBuildingResult {
  const techId = resolveCityBuildingTechId(groupId, buildingId)
  if (!techId) {
    return { ok: false, failureCode: 'unsupported_building', message: 'Unsupported city building group or building id.' }
  }

  const upgraded = upgradeCityTech(world, cityId, techId, factionId)
  if (!upgraded.ok) {
    return upgraded
  }

  const nextWorld = upgraded.world
  nextWorld.slgDomainState ??= {}
  nextWorld.slgDomainState.cityBuildingGroupsByCity ??= {}
  nextWorld.slgDomainState.cityBuildingGroupsByCity[cityId] ??= {}
  nextWorld.slgDomainState.cityBuildingGroupsByCity[cityId][groupId] ??= {}
  nextWorld.slgDomainState.cityBuildingGroupsByCity[cityId][groupId][buildingId] = {
    level: upgraded.nextLevel,
    statusText: '已同步升级',
    updatedTick: nextWorld.tick,
    description: `${CITY_TECH_LABELS[techId]} 已提升至 Lv.${upgraded.nextLevel}，当前为建筑树权威状态。`,
  }

  const affairId = resolveCityBuildingAffairId(groupId)
  if (affairId) {
    nextWorld.slgDomainState.affairsQueueByCity ??= {}
    const queue = [...(nextWorld.slgDomainState.affairsQueueByCity[cityId] ?? [])]
    const existingIndex = queue.findIndex((entry) => entry.id === affairId)
    const syncedEntry = {
      id: affairId,
      statusText: '已同步入队',
      updatedTick: nextWorld.tick,
      description: `${CITY_TECH_LABELS[techId]} 已同步写回建筑树，并进入当前政务序列。`,
    }
    if (existingIndex >= 0) {
      queue[existingIndex] = syncedEntry
    } else {
      queue.push(syncedEntry)
    }
    nextWorld.slgDomainState.affairsQueueByCity[cityId] = queue
  }

  return {
    ok: true,
    world: nextWorld,
    cityId,
    groupId,
    buildingId,
    previousLevel: upgraded.previousLevel,
    nextLevel: upgraded.nextLevel,
    resourcesSpent: upgraded.resourcesSpent,
    message: upgraded.message,
  }
}

export function promoteTroopFacilityBuilding(
  world: WorldState,
  unitId: string,
  facilityId: string,
  buildingId: string,
  factionId: string = resolveFallbackFactionId(world),
): PromoteTroopFacilityBuildingResult {
  const nextWorld = shallowCloneWorld(world)
  const unit = getUnitById(nextWorld, unitId)
  if (!unit || unit.faction !== factionId) {
    return { ok: false, message: `Only ${resolveFactionDisplayLabel(factionId)} troop facilities can be upgraded.` }
  }

  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return { ok: false, message: 'Target faction is missing.' }
  }

  nextWorld.slgDomainState ??= {}
  nextWorld.slgDomainState.troopFacilitiesByUnit ??= {}
  nextWorld.slgDomainState.troopFacilitiesByUnit[unitId] ??= {}
  nextWorld.slgDomainState.troopFacilitiesByUnit[unitId][facilityId] ??= {}

  const currentState = nextWorld.slgDomainState.troopFacilitiesByUnit[unitId][facilityId][buildingId]
  const currentLevel = typeof currentState?.level === 'number' ? Math.max(1, Math.round(currentState.level)) : 1
  const nextLevel = currentLevel + 1
  nextWorld.slgDomainState.troopFacilitiesByUnit[unitId][facilityId][buildingId] = {
    level: nextLevel,
    statusText: '已同步升级',
    updatedTick: nextWorld.tick,
    description: `${unit.name} 的 ${facilityId}/${buildingId} 已写回后端权威状态，当前等级 Lv.${nextLevel}。`,
  }

  prependReport(
    nextWorld,
    nextWorld.tick,
    '部队设施升级',
    `${unit.name} 已将 ${facilityId}/${buildingId} 升级到 Lv.${nextLevel}。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    unitId,
    facilityId,
    buildingId,
    previousLevel: currentLevel,
    nextLevel,
    message: `${unit.name} 已推进 ${facilityId}/${buildingId}，当前 Lv.${nextLevel}。`,
  }
}

export function enqueueAffair(
  world: WorldState,
  cityId: string,
  affairId: string,
  factionId: string = resolveFallbackFactionId(world),
): EnqueueAffairResult {
  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return { ok: false, message: 'Target faction is missing.' }
  }

  nextWorld.slgDomainState ??= {}
  nextWorld.slgDomainState.affairsQueueByCity ??= {}
  const queue = [...(nextWorld.slgDomainState.affairsQueueByCity[cityId] ?? [])]
  const existingIndex = queue.findIndex((entry) => entry.id === affairId)
  if (existingIndex >= 0 && queue[existingIndex]?.statusText === '已入队') {
    return { ok: false, message: `${affairId} is already queued.` }
  }

  const nextEntry = {
    id: affairId,
    statusText: '已入队',
    updatedTick: nextWorld.tick,
    description: `${cityId} 的 ${affairId} 已进入后端权威政务队列。`,
  }
  if (existingIndex >= 0) {
    queue[existingIndex] = nextEntry
  } else {
    queue.push(nextEntry)
  }
  nextWorld.slgDomainState.affairsQueueByCity[cityId] = queue

  prependReport(
    nextWorld,
    nextWorld.tick,
    '政务入队',
    `${cityId} 已将 ${affairId} 写入政务队列。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    cityId,
    affairId,
    message: `${cityId} 已将 ${affairId} 加入政务队列。`,
  }
}

export function recruitProspectHero(
  world: WorldState,
  factionId: string = resolveFallbackFactionId(world),
  count = 1,
  poolId = 'pool_standard',
): RecruitProspectHeroResult {
  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return { ok: false, message: `Unknown faction: ${factionId}` }
  }

  const heroCommand = faction.heroCommand
  const requestedCount = Math.max(1, Math.min(10, Math.floor(count)))
  const drawMode: 'single' | 'multi' = requestedCount > 1 ? 'multi' : 'single'
  const results: {
    id: string
    heroId: string
    heroName: string
    poolId: string
    drawMode: 'single' | 'multi'
    updatedTick: number
  }[] = []

  while (
    heroCommand.prospectHeroIds.length > 0 &&
    heroCommand.developmentPoints >= heroCommand.acquisitionThreshold &&
    results.length < requestedCount
  ) {
    heroCommand.developmentPoints -= heroCommand.acquisitionThreshold
    heroCommand.acquisitionThreshold = Math.min(36, heroCommand.acquisitionThreshold + 2)

    const recruitedHeroId = pickNextProspectHeroId(heroCommand)
    if (!recruitedHeroId) {
      break
    }

    heroCommand.rosterHeroIds.push(recruitedHeroId)
    if (!heroCommand.reserveHeroIds.includes(recruitedHeroId)) {
      heroCommand.reserveHeroIds.push(recruitedHeroId)
    }
    heroCommand.recentHeroId = recruitedHeroId
    const heroEntry = getHeroPoolEntryById(recruitedHeroId)
    results.push({
      id: `recruit_${nextWorld.tick}_${results.length}_${recruitedHeroId}`,
      heroId: recruitedHeroId,
      heroName: heroEntry.name,
      poolId,
      drawMode,
      updatedTick: nextWorld.tick,
    })
  }

  if (results.length == 0) {
    if (heroCommand.prospectHeroIds.length == 0) {
      return { ok: false, message: 'No prospect heroes remain in the current pool.' }
    }
    return { ok: false, message: 'Development points are insufficient for the requested recruit draw.' }
  }

  nextWorld.slgDomainState ??= {}
  nextWorld.slgDomainState.recruitStateByFaction ??= {}
  nextWorld.slgDomainState.recruitStateByFaction[factionId] = {
    selectedPoolId: poolId,
    drawCount: results.length,
    lastDrawMode: drawMode,
    lastResults: results,
    updatedTick: nextWorld.tick,
  }

  prependReport(
    nextWorld,
    nextWorld.tick,
    `${resolveFactionDisplayLabel(factionId)} 招募完成`,
    `${results.map((entry) => entry.heroName).join('、')} 已加入 roster 并进入 reserve。`,
  )
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    heroId: results.length === 1 ? results[0].heroId : undefined,
    heroIds: results.map((entry) => entry.heroId),
    heroNames: results.map((entry) => entry.heroName),
    poolId,
    message: `${resolveFactionDisplayLabel(factionId)} 完成 ${results.length} 次招募。`,
  }
}

export function setRecruitSelectedPool(
  world: WorldState,
  poolId: string,
  factionId: string = resolveFallbackFactionId(world),
): SetRecruitSelectedPoolResult {
  const normalizedPoolId = poolId.trim()
  if (!normalizedPoolId) {
    return { ok: false, message: '招募卡池不能为空。' }
  }

  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return { ok: false, message: `Unknown faction: ${factionId}` }
  }

  nextWorld.slgDomainState ??= {}
  nextWorld.slgDomainState.recruitStateByFaction ??= {}
  const currentState = nextWorld.slgDomainState.recruitStateByFaction[factionId] ?? {}
  nextWorld.slgDomainState.recruitStateByFaction[factionId] = {
    ...currentState,
    selectedPoolId: normalizedPoolId,
    updatedTick: nextWorld.tick,
  }

  if (currentState.selectedPoolId !== normalizedPoolId) {
    bumpWorldVersion(nextWorld)
  }

  return {
    ok: true,
    world: nextWorld,
    factionId,
    poolId: normalizedPoolId,
    message:
      currentState.selectedPoolId === normalizedPoolId
        ? `${resolveFactionDisplayLabel(factionId)} 当前已停留在 ${normalizedPoolId}。`
        : `${resolveFactionDisplayLabel(factionId)} 已切换招募卡池到 ${normalizedPoolId}。`,
  }
}

export function setGeneralActiveHero(
  world: WorldState,
  heroId: string,
  factionId: string = resolveFallbackFactionId(world),
): SetGeneralActiveHeroResult {
  const normalizedHeroId = heroId.trim()
  if (!normalizedHeroId) {
    return { ok: false, message: '目标武将不能为空。' }
  }

  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return { ok: false, message: `Unknown faction: ${factionId}` }
  }

  const heroCommand = faction.heroCommand
  if (!heroCommand.rosterHeroIds.includes(normalizedHeroId)) {
    return { ok: false, message: '目标武将当前不在 roster 中。' }
  }

  nextWorld.slgDomainState ??= {}
  nextWorld.slgDomainState.generalStateByFaction ??= {}
  const currentState = nextWorld.slgDomainState.generalStateByFaction[factionId] ?? {}
  const directivePreviewByHeroId = { ...(currentState.directivePreviewByHeroId ?? {}) }
  nextWorld.slgDomainState.generalStateByFaction[factionId] = {
    ...currentState,
    activeHeroId: normalizedHeroId,
    directivePreviewHeroId: normalizedHeroId,
    directivePreview: mirrorGeneralDirectivePreview(normalizedHeroId, directivePreviewByHeroId),
    directivePreviewByHeroId,
    updatedTick: nextWorld.tick,
  }

  bumpWorldVersion(nextWorld)
  return {
    ok: true,
    world: nextWorld,
    factionId,
    heroId: normalizedHeroId,
    message: `${resolveFactionDisplayLabel(factionId)} 已将焦点切换到武将 ${normalizedHeroId}。`,
  }
}

export function setGeneralTactic(
  world: WorldState,
  heroId: string,
  tacticId: 'assault' | 'guard' | 'logistics',
  factionId: string = resolveFallbackFactionId(world),
): SetGeneralTacticResult {
  const normalizedHeroId = heroId.trim()
  if (!normalizedHeroId) {
    return { ok: false, message: '目标武将不能为空。' }
  }

  if (!['assault', 'guard', 'logistics'].includes(tacticId)) {
    return { ok: false, message: '无效的武将战法。' }
  }

  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return { ok: false, message: `Unknown faction: ${factionId}` }
  }

  const heroCommand = faction.heroCommand
  if (!heroCommand.rosterHeroIds.includes(normalizedHeroId)) {
    return { ok: false, message: '目标武将当前不在 roster 中。' }
  }

  nextWorld.slgDomainState ??= {}
  nextWorld.slgDomainState.generalStateByFaction ??= {}
  const currentState = nextWorld.slgDomainState.generalStateByFaction[factionId] ?? {}
  const nextTacticMap = { ...(currentState.tacticByHeroId ?? {}) }
  nextTacticMap[normalizedHeroId] = tacticId
  const currentHeroPreview = (currentState.directivePreviewByHeroId ?? {})[normalizedHeroId] ?? {}
  const directivePreview = {
    ...currentHeroPreview,
    heroId: normalizedHeroId,
    tacticId,
    source: 'hero_authority',
    sourceActionId: 'set_general_tactic',
    accepted: 1,
    rejected: 0,
    status: 'recorded',
    executionState: 'recorded',
    summary: resolveGeneralTacticSummary(normalizedHeroId, tacticId),
    warnings: [],
    effectLines: buildGeneralTacticEffectLines(normalizedHeroId, tacticId),
    nextSteps: buildGeneralTacticNextSteps(false),
    templateId: resolveGeneralTacticTemplateId(tacticId),
    affectedUnitIds: [],
    updatedTick: nextWorld.tick,
    updatedWorldVersion: nextWorld.worldVersion + 1,
  }
  const directivePreviewByHeroId = {
    ...(currentState.directivePreviewByHeroId ?? {}),
    [normalizedHeroId]: directivePreview,
  }
  nextWorld.slgDomainState.generalStateByFaction[factionId] = {
    ...currentState,
    activeHeroId: normalizedHeroId,
    tacticByHeroId: nextTacticMap,
    directivePreviewHeroId: normalizedHeroId,
    directivePreview: mirrorGeneralDirectivePreview(normalizedHeroId, directivePreviewByHeroId),
    directivePreviewByHeroId,
    updatedTick: nextWorld.tick,
  }

  bumpWorldVersion(nextWorld)
  return {
    ok: true,
    world: nextWorld,
    factionId,
    heroId: normalizedHeroId,
    tacticId,
    message: `${resolveFactionDisplayLabel(factionId)} 已将武将 ${normalizedHeroId} 的战法切换为 ${resolveGeneralTacticLabel(tacticId)}。`,
  }
}

export function setAiContextFocus(
  world: WorldState,
  contextFocusId: string,
  factionId: string = resolveFallbackFactionId(world),
): SetAiContextFocusResult {
  const normalizedFocusId = contextFocusId.trim()
  if (!['focus_city', 'focus_troop', 'focus_alliance', 'focus_team'].includes(normalizedFocusId)) {
    return { ok: false, message: '无效的 AI 上下文焦点。' }
  }

  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return { ok: false, message: `Unknown faction: ${factionId}` }
  }

  nextWorld.slgDomainState ??= {}
  nextWorld.slgDomainState.aiStateByFaction ??= {}
  const currentState = nextWorld.slgDomainState.aiStateByFaction[factionId] ?? {}
  nextWorld.slgDomainState.aiStateByFaction[factionId] = {
    ...currentState,
    contextFocusId: normalizedFocusId,
    updatedTick: nextWorld.tick,
  }

  bumpWorldVersion(nextWorld)
  return {
    ok: true,
    world: nextWorld,
    factionId,
    contextFocusId: normalizedFocusId,
    message: `${resolveFactionDisplayLabel(factionId)} 已切换 AI 上下文焦点到 ${normalizedFocusId}。`,
  }
}

export function queueAiAgendaAction(
  world: WorldState,
  agendaActionId: 'agenda_expand' | 'agenda_support' | 'agenda_stabilize' | 'agenda_recover' | 'agenda_redeploy',
  factionId: string = resolveFallbackFactionId(world),
): QueueAiAgendaActionResult {
  const normalizedAgendaActionId = agendaActionId.trim() as 'agenda_expand' | 'agenda_support' | 'agenda_stabilize' | 'agenda_recover' | 'agenda_redeploy'
  if (!['agenda_expand', 'agenda_support', 'agenda_stabilize', 'agenda_recover', 'agenda_redeploy'].includes(normalizedAgendaActionId)) {
    return { ok: false, message: '无效的 AI 议程动作。', failureCode: 'invalid_ai_agenda_action' }
  }

  const nextWorld = shallowCloneWorld(world)
  const faction = nextWorld.factions[factionId]
  if (!faction) {
    return { ok: false, message: `Unknown faction: ${factionId}`, failureCode: 'unknown_faction' }
  }

  const primaryUnit = nextWorld.units.find((unit) => unit.faction === factionId)
  if (!primaryUnit) {
    return { ok: false, message: '当前没有可用于议程执行的部队。', failureCode: 'no_primary_unit' }
  }

  const targetTileId = resolveAiAgendaTargetTile(nextWorld, primaryUnit.id, normalizedAgendaActionId).trim()
  if (!targetTileId) {
    return { ok: false, message: '当前主力部队未定位地块。', failureCode: 'missing_target_tile' }
  }

  const requestId = `ui_ai_${normalizedAgendaActionId}_${nextWorld.tick}`
  const strategicCommand = resolveAiAgendaStrategicCommand(normalizedAgendaActionId)
  const plan = buildAiAgendaPlan(primaryUnit.id, targetTileId, normalizedAgendaActionId)
  const queueResult = queuePlanExecution(
    nextWorld,
    plan,
    'local',
    factionId,
    strategicCommand,
    requestId,
    nextWorld.worldVersion,
  )
  if (!queueResult.ok) {
    return { ok: false, message: queueResult.message, failureCode: queueResult.failureCode }
  }

  queueResult.world.slgDomainState ??= {}
  queueResult.world.slgDomainState.aiStateByFaction ??= {}
  const currentState = queueResult.world.slgDomainState.aiStateByFaction[factionId] ?? {}
  const orderedActionIds = [
    normalizedAgendaActionId,
    ...['agenda_expand', 'agenda_support', 'agenda_stabilize', 'agenda_recover', 'agenda_redeploy']
      .filter((candidate) => candidate !== normalizedAgendaActionId),
  ]
  const orderedOptionLabels = [
    ...orderedActionIds.map((candidate) =>
      resolveAiAgendaStrategicCommand(candidate as 'agenda_expand' | 'agenda_support' | 'agenda_stabilize' | 'agenda_recover' | 'agenda_redeploy'),
    ),
  ]
  const recommendedFollowups = buildAiAgendaRecommendedFollowups(normalizedAgendaActionId)
  const orderedOptions = orderedActionIds.map((candidate, index) => ({
    actionId: candidate,
    label: orderedOptionLabels[index] ?? resolveAiAgendaStrategicCommand(candidate as 'agenda_expand' | 'agenda_support' | 'agenda_stabilize' | 'agenda_recover' | 'agenda_redeploy'),
    targetTileId,
    targetUnitIds: [primaryUnit.id],
    supportCount: index == 0 ? 1 : 0,
    recommendedFollowups: candidate == normalizedAgendaActionId ? recommendedFollowups : buildAiAgendaRecommendedFollowups(candidate as 'agenda_expand' | 'agenda_support' | 'agenda_stabilize' | 'agenda_recover' | 'agenda_redeploy'),
  }))
  queueResult.world.slgDomainState.aiStateByFaction[factionId] = {
    ...currentState,
    agenda: {
      source: 'authoritative_action',
      summary: `${resolveAiAgendaStrategicCommand(normalizedAgendaActionId)} 已进入执行队列。`,
      options: orderedOptions,
      optionActionIds: orderedActionIds,
      optionLabels: orderedOptionLabels,
      optionTargetTileIds: orderedOptions.map((option) => option.targetTileId ?? ''),
      optionSupportCounts: orderedOptions.map((option) => option.supportCount),
      targetTileId,
      targetUnitIds: [primaryUnit.id],
      executionRequestId: requestId,
      recommendedFollowups,
      updatedTick: queueResult.world.tick,
      updatedWorldVersion: queueResult.world.worldVersion,
    },
    lastAgendaActionId: normalizedAgendaActionId,
    updatedTick: queueResult.world.tick,
    updatedWorldVersion: queueResult.world.worldVersion,
  }

  return {
    ok: true,
    world: queueResult.world,
    factionId,
    agendaActionId: normalizedAgendaActionId,
    requestId,
    message: `${resolveFactionDisplayLabel(factionId)} 已提交 ${resolveAiAgendaStrategicCommand(normalizedAgendaActionId)}。`,
  }
}

function mirrorGeneralDirectivePreview(
  activeHeroId: string,
  directivePreviewByHeroId: Record<string, SlgGeneralDirectivePreviewState>,
): SlgGeneralDirectivePreviewState | undefined {
  if (!activeHeroId) {
    return undefined
  }
  const heroPreview = directivePreviewByHeroId[activeHeroId]
  if (!heroPreview) {
    return undefined
  }
  return cloneGeneralDirectivePreviewMirror(heroPreview)
}

export function cloneGeneralDirectivePreviewMirror(
  directivePreview: SlgGeneralDirectivePreviewState | undefined,
): SlgGeneralDirectivePreviewState | undefined {
  if (!directivePreview) {
    return undefined
  }
  return {
    heroId: directivePreview.heroId,
    tacticId: directivePreview.tacticId,
    source: directivePreview.source,
    sourceActionId: directivePreview.sourceActionId,
    accepted: directivePreview.accepted,
    rejected: directivePreview.rejected,
    status: directivePreview.status,
    executionState: directivePreview.executionState,
    summary: directivePreview.summary,
    templateId: directivePreview.templateId,
    targetUnitId: directivePreview.targetUnitId,
    targetTileId: directivePreview.targetTileId,
    updatedTick: directivePreview.updatedTick,
    updatedWorldVersion: directivePreview.updatedWorldVersion,
  }
}

function resolveGeneralTacticLabel(tacticId: 'assault' | 'guard' | 'logistics'): string {
  switch (tacticId) {
    case 'guard':
      return '驻守'
    case 'logistics':
      return '后勤'
    default:
      return '先锋'
  }
}

function resolveGeneralTacticSummary(heroId: string, tacticId: 'assault' | 'guard' | 'logistics'): string {
  switch (tacticId) {
    case 'guard':
      return `武将 ${heroId} 已切换为驻守态势。`
    case 'logistics':
      return `武将 ${heroId} 已切换为后勤支援态势。`
    default:
      return `武将 ${heroId} 已切换为先锋推进态势。`
  }
}

function buildGeneralTacticEffectLines(heroId: string, tacticId: 'assault' | 'guard' | 'logistics'): string[] {
  switch (tacticId) {
    case 'guard':
      return [`武将 ${heroId} 会优先承担驻守与稳态任务。`, '后续若已编组，会自动向当前部队同步驻守指令。']
    case 'logistics':
      return [`武将 ${heroId} 会优先承担补给、恢复与后勤支援。`, '后续若已编组，会自动向当前部队同步后勤支援指令。']
    default:
      return [`武将 ${heroId} 会优先承担推进、攻击与前锋任务。`, '后续若已编组，会自动向当前部队同步先锋推进指令。']
  }
}

function buildGeneralTacticNextSteps(hasAssignedUnit: boolean): string[] {
  if (hasAssignedUnit) {
    return ['当前部队已收到新的权威战法模板。', '后续调度会沿当前模板继续执行。']
  }
  return ['如后续完成编组，权威模板会自动继承到目标部队。', '再次切换战法会覆盖当前待生效说明链。']
}

function resolveGeneralTacticTemplateId(tacticId: 'assault' | 'guard' | 'logistics'): string {
  switch (tacticId) {
    case 'guard':
      return 'guard'
    case 'logistics':
      return 'rally'
    default:
      return 'shock'
  }
}

function resolveAiAgendaStrategicCommand(agendaActionId: 'agenda_expand' | 'agenda_support' | 'agenda_stabilize' | 'agenda_recover' | 'agenda_redeploy'): string {
  switch (agendaActionId) {
    case 'agenda_support':
      return '执行支援议程'
    case 'agenda_stabilize':
      return '执行稳态议程'
    case 'agenda_recover':
      return '执行整补议程'
    case 'agenda_redeploy':
      return '执行调动议程'
    default:
      return '执行扩张议程'
  }
}

function buildAiAgendaRecommendedFollowups(
  agendaActionId: 'agenda_expand' | 'agenda_support' | 'agenda_stabilize' | 'agenda_recover' | 'agenda_redeploy',
): string[] {
  switch (agendaActionId) {
    case 'agenda_support':
      return ['agenda_stabilize', 'agenda_recover']
    case 'agenda_stabilize':
      return ['agenda_recover', 'agenda_support']
    case 'agenda_recover':
      return ['agenda_redeploy', 'agenda_stabilize']
    case 'agenda_redeploy':
      return ['agenda_expand', 'agenda_support']
    default:
      return ['agenda_support', 'agenda_stabilize']
  }
}

function buildAiAgendaPlan(
  unitId: string,
  targetTileId: string,
  agendaActionId: 'agenda_expand' | 'agenda_support' | 'agenda_stabilize' | 'agenda_recover' | 'agenda_redeploy',
): StrategicPlan {
  switch (agendaActionId) {
    case 'agenda_support':
      return {
        intent: 'ai_support_line',
        priority: 'medium',
        orders: [{ unitId, action: 'support', target: targetTileId }],
        constraints: ['ai_panel_agenda_support_v1'],
        reviewAfterTicks: 3,
      }
    case 'agenda_stabilize':
      return {
        intent: 'ai_stabilize_core',
        priority: 'medium',
        orders: [{ unitId, action: 'garrison', target: targetTileId }],
        constraints: ['ai_panel_agenda_stabilize_v1'],
        reviewAfterTicks: 2,
      }
    case 'agenda_recover':
      return {
        intent: 'ai_recover_line',
        priority: 'medium',
        orders: [{ unitId, action: 'support', target: targetTileId }],
        constraints: ['ai_panel_agenda_recover_v1'],
        reviewAfterTicks: 2,
      }
    case 'agenda_redeploy':
      return {
        intent: 'ai_redeploy_front',
        priority: 'medium',
        orders: [{ unitId, action: 'march', target: targetTileId }],
        constraints: ['ai_panel_agenda_redeploy_v1'],
        reviewAfterTicks: 2,
      }
    default:
      return {
        intent: 'ai_expand_frontier',
        priority: 'high',
        orders: [{ unitId, action: 'capture', target: targetTileId }],
        constraints: ['ai_panel_agenda_expand_v1'],
        reviewAfterTicks: 3,
      }
  }
}

function resolveAiAgendaTargetTile(
  world: WorldState,
  unitId: string,
  agendaActionId: 'agenda_expand' | 'agenda_support' | 'agenda_stabilize' | 'agenda_recover' | 'agenda_redeploy',
): string {
  const unit = getUnitById(world, unitId)
  if (!unit) {
    return ''
  }
  if (agendaActionId !== 'agenda_redeploy') {
    return unit.tileId
  }
  const neighbors = world.map.connections[unit.tileId] ?? []
  return neighbors[0] ?? unit.tileId
}


export function moveUnit(
  world: WorldState,
  unitId: string,
  targetTileId: string,
  factionId: string = resolveFallbackFactionId(world),
): MoveResult {
  if (hasActiveOrders(world)) {
    return { ok: false, message: '当前已有 AI 任务在执行，地图点击已切换为查看模式。' }
  }

  const nextWorld = shallowCloneWorld(world)
  const unit = getUnitById(nextWorld, unitId)
  const targetTile = getTileById(nextWorld, targetTileId)

  if (!unit || !targetTile) {
    return { ok: false, message: '目标单位或目标地块不存在。' }
  }

  if (unit.faction !== factionId) {
    return { ok: false, message: `仅允许调度 ${resolveFactionDisplayLabel(factionId)} 队伍。` }
  }

  if (unit.tileId === targetTileId) {
    return { ok: false, message: `${unit.name} 已经位于 ${targetTile.name}。` }
  }

  const geographyFeedback = resolveMovementGeographyFeedback(nextWorld, unit.id, targetTile.id, 'march')
  if (!nextWorld.map.connections[unit.tileId]?.includes(targetTileId)) {
    return {
      ok: false,
      message: geographyFeedback?.blockedReason ?? `${unit.name} 只能向相邻地块行军。`,
      geographyFeedback: geographyFeedback ?? undefined,
    }
  }

  const blockedReason = getEntryBlockReason(nextWorld, unit, targetTile, 'march')
  if (blockedReason) {
    return { ok: false, message: blockedReason, geographyFeedback: geographyFeedback ?? undefined }
  }

  const currentTile = getTileById(nextWorld, unit.tileId)
  const marchCost = resolveMarchResourceCost(currentTile, targetTile)
  if (!spendFactionResources(nextWorld, unit.faction, marchCost.actionPoints, marchCost.food)) {
    return {
      ok: false,
      message: `资源不足，进入 ${targetTile.name} 需要 ${marchCost.actionPoints} 行动点与 ${marchCost.food} 点粮草。`
    }
  }

  const originTileId = unit.tileId
  unit.tileId = targetTile.id
  unit.supply = Math.max(0, unit.supply - 1)
  unit.status = '行军中'
  unit.currentTask = `向${targetTile.name}机动`

  prependReport(
    nextWorld,
    nextWorld.tick,
    '行军命令执行',
    `${unit.name} 从手动调度进入 ${targetTile.name}，消耗 ${marchCost.actionPoints} 行动点与 ${marchCost.food} 点粮草。`
  )

  const battleMessage = resolveBattleAtTile(nextWorld, unit, targetTile, originTileId, [])
  const detailMessage = battleMessage ?? `${unit.name} 已开始向 ${targetTile.name} 行军。`
  bumpWorldVersion(nextWorld)

  return {
    ok: true,
    world: nextWorld,
    unitId,
    message: detailMessage,
    geographyFeedback: geographyFeedback ?? resolveMovementGeographyFeedbackForTiles(nextWorld, unit, currentTile ?? targetTile, targetTile, 'march'),
  }
}

export function queuePlanExecution(
  world: WorldState,
  plan: StrategicPlan,
  source: PlanSource,
  factionId: string,
  strategicCommand: string,
  requestId: string,
  basedOnWorldVersion: number,
  executionMode: ExecutionEnqueueMode = 'replace',
  expectedExecutionRequestId?: string,
  plannerNote?: string,
  plannerExplanation?: string,
  planningRationale?: string[],
): QueuePlanResult {
  if (world.worldVersion !== basedOnWorldVersion) {
    return {
      ok: false,
      message: `planning result stale: world is V${world.worldVersion}, plan is based on V${basedOnWorldVersion}.`,
      failureCode: 'stale_world_version',
    }
  }

  if (!world.factions[factionId]) {
    return {
      ok: false,
      message: `unknown faction: ${factionId}.`,
      failureCode: 'unknown_faction',
    }
  }

  const invalidOrderUnitIds = Array.from(
    new Set(
      plan.orders
        .map((order) => {
          const unit = getUnitById(world, order.unitId)
          if (!unit || unit.faction !== factionId) {
            return order.unitId
          }
          return null
        })
        .filter((unitId): unitId is string => typeof unitId === 'string' && unitId.length > 0),
    ),
  )

  if (invalidOrderUnitIds.length > 0) {
    return {
      ok: false,
      message: `invalid order units for faction ${factionId}: ${invalidOrderUnitIds.slice(0, 6).join(', ')}.`,
      failureCode: 'invalid_order_units',
    }
  }

  const normalizedExecutionMode = normalizeExecutionEnqueueMode(executionMode)
  const activeExecution = getExecution(world, factionId) && hasActiveOrders(world, factionId) ? getExecution(world, factionId) : null
  const expectedRequestId = expectedExecutionRequestId?.trim()

  if (expectedRequestId) {
    if (!activeExecution) {
      return {
        ok: false,
        message: `execution chain guard: expected active requestId=${expectedRequestId}, but no active execution exists.`,
        failureCode: 'execution_chain_guard_missing',
      }
    }

    if (activeExecution.requestId !== expectedRequestId) {
      return {
        ok: false,
        message: `execution chain guard: expected active requestId=${expectedRequestId}, actual=${activeExecution.requestId}.`,
        failureCode: 'execution_chain_guard_mismatch',
      }
    }
  }

  if (normalizedExecutionMode === 'reject_if_active' && activeExecution) {
    return {
      ok: false,
      message: `execution chain is active (requestId=${activeExecution.requestId}); mode reject_if_active blocked the new plan.`,
      failureCode: 'execution_chain_active_rejected',
    }
  }

  const nextWorld = shallowCloneWorld(world)
  const providerLabel = resolvePlannerSourceLabel(source)
  const factionExec = getExecution(nextWorld, factionId)

  if (normalizedExecutionMode === 'append' && factionExec && hasActiveOrders(nextWorld, factionId)) {
    const appendRequestId = factionExec.requestId
    const tacticalOrders = materializeQueuedTacticalOrders(nextWorld, appendRequestId, basedOnWorldVersion, factionId)
    const plannerOrders: ExecutableOrder[] = plan.orders.map((order, index) => ({
      id: `${appendRequestId}_append_${nextWorld.tick}_${index}`,
      requestId: appendRequestId,
      unitId: order.unitId,
      action: order.action,
      target: order.target,
      status: 'queued',
      summary: `${actionLabel(order.action)} ${getTileById(nextWorld, order.target)?.name ?? order.target}`,
      createdTick: nextWorld.tick,
      basedOnWorldVersion,
    }))

    nextWorld.executions[factionId] = {
      ...factionExec,
      source,
      strategicCommand: mergeExecutionStrategicCommand(factionExec.strategicCommand, strategicCommand),
      currentPlan: mergeStrategicPlanForAppend(factionExec.currentPlan, plan),
      orders: [...factionExec.orders, ...tacticalOrders, ...plannerOrders],
      reviewAtTick: Math.max(factionExec.reviewAtTick, nextWorld.tick + plan.reviewAfterTicks),
      basedOnWorldVersion,
      plannerNote: plannerNote ?? factionExec.plannerNote,
      plannerExplanation: plannerExplanation ?? factionExec.plannerExplanation,
      planningRationale: mergePlanningRationale(factionExec.planningRationale, planningRationale),
    }

    prependReport(
      nextWorld,
      nextWorld.tick,
      'AI plan appended',
      `${providerLabel} appended ${plannerOrders.length} orders and merged ${tacticalOrders.length} tactical overrides. intent=${plan.intent}.`,
    )
    bumpWorldVersion(nextWorld)
    const appendedFocusOrder = tacticalOrders[0] ?? plannerOrders[0]
    syncExecutionReplay(nextWorld, factionId, 'plan_appended', 'running', true, [
      createReplayHighlight(
        nextWorld.tick,
        'planning',
        'medium',
        'Plan appended',
        `${providerLabel} appended ${plannerOrders.length + tacticalOrders.length} orders to active chain.`,
        {
          unitId: appendedFocusOrder?.unitId,
          tileId: appendedFocusOrder?.target,
          factionId,
        },
      ),
    ])

    return {
      ok: true,
      world: nextWorld,
      message: `plan appended to active execution chain (requestId=${appendRequestId}), based on world V${basedOnWorldVersion}.`,
      enqueueOutcome: 'appended',
    }
  }

  if (factionExec && hasActiveOrders(nextWorld, factionId)) {
    const overriddenFocusOrder = factionExec.orders.find(
      (order) => order.status === 'queued' || order.status === 'running',
    ) ?? factionExec.orders[0]
    syncExecutionReplay(nextWorld, factionId, 'plan_overridden_by_new_request', 'cleared', true, [
      createReplayHighlight(
        nextWorld.tick,
        'planning',
        'medium',
        'Plan overridden',
        'a new strategic plan replaced the active execution chain.',
        {
          unitId: overriddenFocusOrder?.unitId,
          tileId: overriddenFocusOrder?.target,
          factionId,
        },
      ),
    ])
  }

  const tacticalOrders = materializeQueuedTacticalOrders(nextWorld, requestId, basedOnWorldVersion, factionId)

  const plannerOrders: ExecutableOrder[] = plan.orders.map((order, index) => ({
    id: `${requestId}_order_${index}`,
    requestId,
    unitId: order.unitId,
    action: order.action,
    target: order.target,
    status: 'queued',
    summary: `${actionLabel(order.action)} ${getTileById(nextWorld, order.target)?.name ?? order.target}`,
    createdTick: nextWorld.tick,
    basedOnWorldVersion,
  }))
  const orders: ExecutableOrder[] = [...tacticalOrders, ...plannerOrders]

  nextWorld.executions[factionId] = {
    requestId,
    source,
    strategicCommand,
    currentPlan: plan,
    orders,
    reviewAtTick: nextWorld.tick + plan.reviewAfterTicks,
    basedOnWorldVersion,
    plannerNote,
    plannerExplanation,
    planningRationale,
  }

  prependReport(
    nextWorld,
    nextWorld.tick,
    'AI plan dispatched',
    `${providerLabel} produced ${plannerOrders.length} orders and merged ${tacticalOrders.length} tactical overrides. intent=${plan.intent}.`,
  )
  bumpWorldVersion(nextWorld)
  const dispatchedFocusOrder = orders[0]
  syncExecutionReplay(nextWorld, factionId, 'plan_dispatched', 'running', true, [
    createReplayHighlight(
      nextWorld.tick,
      'planning',
      'medium',
      'Plan dispatched',
      `${providerLabel} dispatched ${orders.length} structured orders.`,
      {
        unitId: dispatchedFocusOrder?.unitId,
        tileId: dispatchedFocusOrder?.target,
        factionId,
      },
    ),
  ])

  return {
    ok: true,
    world: nextWorld,
    message: `AI plan queued based on world version V${basedOnWorldVersion}.`,
    enqueueOutcome: activeExecution ? 'replaced' : 'queued',
  }
}

function normalizeExecutionEnqueueMode(mode: ExecutionEnqueueMode): ExecutionEnqueueMode {
  if (mode === 'append' || mode === 'reject_if_active') {
    return mode
  }

  return 'replace'
}

function resolvePlannerSourceLabel(source: PlanSource) {
  if (source === 'local') {
    return 'local_model'
  }

  if (source === 'gateway') {
    return 'gateway_relay'
  }

  return 'mock_planner'
}

function mergeExecutionStrategicCommand(current: string, incoming: string) {
  const normalizedIncoming = incoming.trim()
  if (!normalizedIncoming) {
    return current
  }

  const normalizedCurrent = current.trim()
  if (!normalizedCurrent) {
    return normalizedIncoming
  }

  if (normalizedCurrent === normalizedIncoming) {
    return normalizedCurrent
  }

  return `${normalizedCurrent} | append: ${normalizedIncoming}`
}

function mergePlanningRationale(current?: string[], incoming?: string[]) {
  if (!incoming || incoming.length === 0) {
    return current
  }

  const merged = new Set<string>()
  for (const item of current ?? []) {
    const normalized = item.trim()
    if (normalized) {
      merged.add(normalized)
    }
  }
  for (const item of incoming) {
    const normalized = item.trim()
    if (normalized) {
      merged.add(normalized)
    }
  }

  return Array.from(merged).slice(0, 8)
}

function mergeStrategicPlanForAppend(current: StrategicPlan, incoming: StrategicPlan): StrategicPlan {
  const byUnitId = new Map<string, StrategicPlan['orders'][number]>()

  for (const order of current.orders) {
    byUnitId.set(order.unitId, order)
  }

  for (const order of incoming.orders) {
    byUnitId.set(order.unitId, order)
  }

  return {
    ...current,
    intent: incoming.intent.trim() || current.intent,
    priority: incoming.priority,
    orders: Array.from(byUnitId.values()).slice(0, 8),
    constraints: Array.from(new Set([...current.constraints, ...incoming.constraints, 'execution_append_mode_v1'])).slice(0, 16),
    reviewAfterTicks: Math.max(1, Math.min(6, incoming.reviewAfterTicks)),
  }
}

export function clearPlanExecution(world: WorldState, factionId: string = resolveFallbackFactionId(world)) {
  const nextWorld = shallowCloneWorld(world)
  const hadActiveExecution = getExecution(nextWorld, factionId) && hasActiveOrders(nextWorld, factionId)
  const clearedFocusOrder = nextWorld.executions[factionId]?.orders.find(
    (order) => order.status === 'queued' || order.status === 'running',
  ) ?? nextWorld.executions[factionId]?.orders[0]

  prependReport(nextWorld, nextWorld.tick, '计划已清空', '当前 AI 任务队列已移除，部队恢复为可手动调度状态。')
  bumpWorldVersion(nextWorld)

  if (hadActiveExecution) {
    syncExecutionReplay(nextWorld, factionId, '计划清空', 'cleared', true, [
      createReplayHighlight(nextWorld.tick, 'planning', 'low', '计划被手动清空', '当前 AI 任务队列已移除。', {
        unitId: clearedFocusOrder?.unitId,
        tileId: clearedFocusOrder?.target,
        factionId,
      }),
    ])
  }

  nextWorld.executions[factionId] = null
  return nextWorld
}

// ─── 自动扩张 / 开荒 / 升级常量 ──────────────────────────────────────────────
/** 铺路：每单位每回合可占领的中立普通格子数（配额降低，让 AI march/capture 成为扩张主力） */
const PAVE_QUOTA_PER_UNIT = 3
/** 开荒：每单位每回合可占领的中立资源格子数（每格花费 1 粮草） */
const PIONEER_QUOTA_PER_UNIT = 2
/** 升级：每势力每回合可升级的队伍数 */
const LEVELUP_SQUADS_PER_TICK = 1
/** 升级：每次升级增加的等级数 */
const LEVELUP_LEVELS_PER_SQUAD = 5
/** 升级：每次升级花费的粮草 */
const LEVELUP_FOOD_COST = 5
/** 武将最高等级 */
const HERO_MAX_LEVEL = 50

// ── 行军速度（格/回合）—— 100格=1回合基准，骑兵更快 ────────────────────────────
/** 骑兵：150格/回合（1.5x，高速机动） */
const MARCH_STEPS_CAVALRY = 150
/** 步兵/混合：100格/回合（1.0x 基准） */
const MARCH_STEPS_INFANTRY = 100
/** 重甲盾兵：70格/回合（0.7x，厚重缓慢） */
const MARCH_STEPS_SHIELD = 70
/** 辎重/后勤：60格/回合（0.6x，最慢） */
const MARCH_STEPS_SUPPLY = 60
/** 混合兵种：90格/回合 */
const MARCH_STEPS_MIXED = 90

// ── 征兵参数 ──────────────────────────────────────────────────────────────────
/** 征兵花费粮草 */
const RECRUIT_FOOD_COST = 25
/** 征兵冷却：每 N 回合可征兵一次（粮草充足时） */
const RECRUIT_COOLDOWN_TICKS = 4
/** 每势力最多部队数 */
const MAX_UNITS_PER_FACTION = 30

/**
 * 获取兵种对应的行军步数（格/回合）
 * 骑兵 150 > 混合 90 > 步兵 100 > 重甲 70 > 辎重 60
 */
function getMarchSteps(unit: Unit): number {
  switch (unit.hero.troopType) {
    case 'cavalry': return MARCH_STEPS_CAVALRY
    case 'supply':  return MARCH_STEPS_SUPPLY
    case 'shield':  return MARCH_STEPS_SHIELD
    case 'mixed':   return MARCH_STEPS_MIXED
    case 'infantry':
    default:        return MARCH_STEPS_INFANTRY
  }
}

/**
 * 自动领土扩张（铺路 + 开荒）— 全势力飞地共享边界版（O(n) 单次扫描优化）
 *
 * 性能关键：
 *   - 原实现每势力单独扫描全部 102k 格建立 frontier → 13 × 102k = 133 万次/tick
 *   - 现实现：1 次扫描全部 102k 格，同时为所有势力建立 frontier → 102k 次/tick（13x 提速）
 *   - 各势力 frontier 独立 BFS 扩张，新占格立即入队（真正多步波浪扩张）
 *   - 飞地支持：任意己方领地边界均可扩，不限单个单位位置
 */
function processAutoExpansion(
  world: WorldState,
  unitsByFaction: Map<string, Unit[]>,
  highlights: ReplayHighlight[],
) {
  // ── Phase 1: O(n) 单次扫描 ── 建立 owner 索引 + 所有势力初始 frontier ───────
  const ownerById = new Map<string, string>()
  for (const tile of world.map.tiles) {
    ownerById.set(tile.id, tile.owner)
  }

  // 每个势力的初始边界中立格（key = factionId）
  const factionFrontiers = new Map<string, string[]>()
  const factionSeens = new Map<string, Set<string>>()

  // 预填充参与扩张的势力
  for (const [factionId, units] of unitsByFaction.entries()) {
    const idleCount = units.filter(u => u.status === '待命' || u.status === '驻防中').length
    if (idleCount > 0) {
      factionFrontiers.set(factionId, [])
      factionSeens.set(factionId, new Set())
    }
  }

  // 一次性扫描所有 tile，将相邻中立格加入对应势力的初始 frontier
  for (const tile of world.map.tiles) {
    const fq = factionFrontiers.get(tile.owner)
    if (!fq) continue  // 不参与扩张 or 中立
    const seen = factionSeens.get(tile.owner)!
    for (const nId of world.map.connections[tile.id] ?? []) {
      const nOwner = ownerById.get(nId) ?? 'neutral'
      // 只扩张到中立格，跳过停战方领土
      if (!seen.has(nId) && nOwner === 'neutral') {
        seen.add(nId)
        fq.push(nId)
      }
    }
  }

  // ── Phase 2: 每势力独立 BFS 扩张（直到配额耗尽）──────────────────────────
  for (const [factionId, units] of unitsByFaction.entries()) {
    const faction = world.factions[factionId]
    if (!faction) continue

    const idleUnits = units.filter(u => u.status === '待命' || u.status === '驻防中')
    if (idleUnits.length === 0) continue

    const frontierQ = factionFrontiers.get(factionId)
    const seen2 = factionSeens.get(factionId)
    if (!frontierQ || !seen2) continue

    const paveQuota = idleUnits.length * PAVE_QUOTA_PER_UNIT
    const pioneerQuota = idleUnits.length * PIONEER_QUOTA_PER_UNIT
    const expansionAnchorUnitId = idleUnits[0]?.id
    let paved = 0
    let pioneered = 0
    let capturedCityCount = 0
    let lastClaimedTileId: string | undefined

    let qi = 0
    while (qi < frontierQ.length && (paved < paveQuota || pioneered < pioneerQuota)) {
      const nId = frontierQ[qi++]
      if (ownerById.get(nId) !== 'neutral') continue

      const nTile = getTileByIdFast(world, nId)
      if (!nTile) continue

      let claimed = false
      if (nTile.type === 'resource' && pioneered < pioneerQuota) {
        if (faction.food < 1) continue
        faction.food -= 1
        nTile.owner = factionId
        ownerById.set(nId, factionId)
        pioneered++
        claimed = true
      } else if (nTile.type !== 'resource' && paved < paveQuota) {
        nTile.owner = factionId
        ownerById.set(nId, factionId)
        paved++
        claimed = true
        // 城池占领：解锁传送/征兵出生点
        if (nTile.type === 'city') {
          if (!faction.capturedCities) faction.capturedCities = []
          if (!faction.capturedCities.includes(nId)) {
            faction.capturedCities.push(nId)
            capturedCityCount++
          }
        }
      }

      if (claimed) {
        lastClaimedTileId = nId
        // 新占领格的中立邻居立即入队（波浪式扩张，不限步数）
        for (const nnId of world.map.connections[nId] ?? []) {
          if (!seen2.has(nnId) && ownerById.get(nnId) === 'neutral') {
            seen2.add(nnId)
            frontierQ.push(nnId)
          }
        }
      }
    }

    if (paved + pioneered > 0) {
      const cityNote = capturedCityCount > 0 ? `，占领 ${capturedCityCount} 座城池（传送点解锁）` : ''
      prependReport(
        world,
        world.tick,
        `${factionId} 领土扩张`,
        `铺路 ${paved} 格，开荒 ${pioneered} 格资源地${cityNote}。`,
      )
      highlights.push(
        createEngageReplayHighlight(
          world.tick,
          'tile_control',
          paved + pioneered > 100 ? 'medium' : 'low',
          `${factionId} 自动扩张`,
          `铺路 ${paved} 格，开荒 ${pioneered} 格`,
          {
            unitId: expansionAnchorUnitId,
            tileId: lastClaimedTileId,
            toTileId: lastClaimedTileId,
            factionId,
          },
        ),
      )
    }
  }
}

/**
 * 自动征兵（滚雪球核心）
 *
 * 每 RECRUIT_COOLDOWN_TICKS 回合，当粮草 ≥ RECRUIT_FOOD_COST 且部队数 < MAX_UNITS_PER_FACTION 时，
 * 自动为该势力征募一支新部队，出生于已占领的城池（传送点）或主城基地。
 * 领地越多 → 粮食越多 → 征兵越快 → 扩张越快 → 接触敌人越快。
 */
function processRecruitment(
  world: WorldState,
  unitsByFaction: Map<string, Unit[]>,
) {
  if (world.tick % RECRUIT_COOLDOWN_TICKS !== 0) return

  for (const [factionId, units] of unitsByFaction.entries()) {
    const faction = world.factions[factionId]
    if (!faction) continue
    if (faction.food < RECRUIT_FOOD_COST) continue
    if (units.length >= MAX_UNITS_PER_FACTION) continue

    // 出生点：优先已占领的城池（传送点），其次主城
    let spawnTileId = faction.heroCommand.homeTileId
    if (faction.capturedCities && faction.capturedCities.length > 0) {
      const validCity = faction.capturedCities.find(cId => {
        const t = getTileByIdFast(world, cId)
        return t && t.owner === factionId
      })
      if (validCity) spawnTileId = validCity
    }

    faction.food -= RECRUIT_FOOD_COST
    faction.recruitedTotal = (faction.recruitedTotal ?? 0) + 1
    const recIdx = faction.recruitedTotal

    const archetypePool: Array<Unit['hero']['archetype']> = ['guard', 'mobile', 'assault', 'assault', 'mobile', 'recon']
    const archetype = archetypePool[recIdx % archetypePool.length]
    const troopType: Unit['hero']['troopType'] = archetype === 'mobile' ? 'cavalry' : archetype === 'guard' ? 'shield' : 'infantry'
    const nameMap: Record<string, string> = { guard: '守将', mobile: '斥候', assault: '先锋', recon: '探马', logistics: '粮官', reserve: '预备将' }

    const newUnit: Unit = {
      id: `unit_${factionId}_r${recIdx}`,
      name: `${factionId}征兵${recIdx}军`,
      faction: factionId as Unit['faction'],
      corps: {
        name: `${factionId}征${recIdx}军`,
        doctrine: '扩张边境，支援主力',
        specialty: archetype,
        readiness: 60,
        roster: [],
      },
      hero: {
        id: `hero_rec_${factionId}_${recIdx}`,
        name: `${factionId}新将${recIdx}`,
        title: `新晋${nameMap[archetype] ?? '将领'}`,
        faction: '群',
        cardType: troopType === 'cavalry' ? '骑' : '步',
        quality: '3-R',
        archetype,
        level: Math.max(5, Math.min(20, recIdx * 2)),
        troopType,
        avatarKey: 'hero-avatar-recruit',
        portraitKey: 'hero-portrait-recruit',
        force: 50,
        command: 55 + recIdx,
        intelligence: 45,
        charisma: 42,
        speed: archetype === 'mobile' ? 65 : 45,
        traits: archetype === 'guard' ? ['坚守', '抗压'] : archetype === 'mobile' ? ['机动', '侦察'] : ['突击', '攻坚'],
        signatureSkill: { name: '新兵冲劲', detail: '新招募兵员的初次作战' },
        growthFocus: `${factionId}边境扩张`,
      },
      tileId: spawnTileId,
      strength: 20,
      mobility: archetype === 'mobile' ? 6 : 3,
      supply: 5,
      status: '待命',
    }

    world.units.push(newUnit)
    prependReport(
      world,
      world.tick,
      `${factionId} 征兵`,
      `第${recIdx}次征兵于 tick${world.tick}，出生于${spawnTileId}（消耗粮草${RECRUIT_FOOD_COST}），当前总兵力：${units.length + 1}支。`,
    )
  }
}

/**
 * 自动升级武将
 *
 * 每势力每回合自动为一个队伍提升 5 级（花费 LEVELUP_FOOD_COST 粮草）。
 * 优先升级等级最低的武将，最高不超过 HERO_MAX_LEVEL。
 * 升级同时提升战力和属性。
 */
function processAutoLevelUp(
  world: WorldState,
  unitsByFaction: Map<string, Unit[]>,
  highlights: ReplayHighlight[],
) {
  for (const [factionId, units] of unitsByFaction.entries()) {
    const faction = world.factions[factionId]
    if (!faction || faction.food < LEVELUP_FOOD_COST) continue

    // 找等级最低且可升级的武将
    const levelable = units
      .filter(u => u.hero.level < HERO_MAX_LEVEL)
      .sort((a, b) => a.hero.level - b.hero.level)

    if (levelable.length === 0) continue

    let leveled = 0
    for (const target of levelable) {
      if (leveled >= LEVELUP_SQUADS_PER_TICK) break
      if (faction.food < LEVELUP_FOOD_COST) break

      const oldLevel = target.hero.level
      const newLevel = Math.min(HERO_MAX_LEVEL, oldLevel + LEVELUP_LEVELS_PER_SQUAD)
      const levelGain = newLevel - oldLevel
      if (levelGain <= 0) continue

      target.hero.level = newLevel
      faction.food -= LEVELUP_FOOD_COST
      // 升级提升战力和属性（五维全涨）
      target.strength = Math.min(100, target.strength + levelGain * 2)
      target.hero.force = Math.min(100, target.hero.force + levelGain)
      target.hero.command = Math.min(100, target.hero.command + levelGain)
      target.hero.intelligence = Math.min(100, target.hero.intelligence + levelGain)
      target.hero.charisma = Math.min(100, target.hero.charisma + levelGain)
      target.hero.speed = Math.min(100, target.hero.speed + levelGain)
      leveled++

      prependReport(
        world,
        world.tick,
        `${factionId} 武将升级`,
        `${target.hero.name} 升级至 Lv.${newLevel}（+${levelGain}级），战力提升至 ${target.strength}。`,
      )
      highlights.push(
        createEngageReplayHighlight(
          world.tick,
          'logistics',
          'low',
          `${target.hero.name} 升级`,
          `${target.hero.name} Lv.${oldLevel}→${newLevel}，战力 ${target.strength}`,
          {
            unitId: target.id,
            tileId: target.tileId,
            factionId,
          },
        ),
      )
    }
  }
}

/**
 * 处理外交协议倒计时
 *
 * 每回合递减所有外交协议的 duration，过期则移除。
 */
function processDiplomacyAgreements(world: WorldState) {
  if (!world.feedback.diplomacyAgreements) {
    world.feedback.diplomacyAgreements = []
    return
  }
  for (const agreement of world.feedback.diplomacyAgreements) {
    agreement.duration -= 1
  }
  world.feedback.diplomacyAgreements = world.feedback.diplomacyAgreements.filter(a => a.duration > 0)
}

/**
 * 检查两个势力之间是否存在有效的停战/同盟协议
 */
function hasCeasefireOrAlliance(world: WorldState, factionA: string, factionB: string): boolean {
  if (!world.feedback.diplomacyAgreements) return false
  return world.feedback.diplomacyAgreements.some(
    a => (a.type === 'ceasefire' || a.type === 'alliance') &&
      a.duration > 0 &&
      a.parties.includes(factionA) &&
      a.parties.includes(factionB),
  )
}

function measureAdvanceTickDiagnosticSubphase<T>(
  diagnostics: AdvanceTickDiagnostics | undefined,
  subphase: string,
  work: () => T,
): T {
  const startedAtMs = performance.now()
  try {
    return work()
  } finally {
    diagnostics?.subphases.push({
      subphase,
      durationMs: Number((performance.now() - startedAtMs).toFixed(2)),
    })
  }
}

export function advanceTick(world: WorldState, diagnostics?: AdvanceTickDiagnostics): WorldState {
  const nextWorld = shallowCloneWorld(world)
  const tickHighlights: ReplayHighlight[] = []
  nextWorld.tick += 1

  // Phase 1B 性能优化：一次扫描完成食物收入计算 + 单位分组（O(n+u) 替换 O(n×f + u×f)）
  let factionFoodIncomes!: ReturnType<typeof computeAllFactionFoodIncomes>
  let unitsByFaction!: ReturnType<typeof buildUnitsByFaction>
  // Phase 2 优化：一次扫描按 owner 分组地块，避免 calculateFactionDevelopmentGain 的 O(2n)
  let tilePartition!: ReturnType<typeof partitionTiles>
  // Phase 2 优化：一次扫描预计算全图高压对立地块数，避免 resolveNeededArchetype 的 O(n)
  let globalHostilePressureCount = 0
  measureAdvanceTickDiagnosticSubphase(diagnostics, 'advance_world_state.precompute_shared_index', () => {
    factionFoodIncomes = computeAllFactionFoodIncomes(nextWorld.map.tiles)
    unitsByFaction = buildUnitsByFaction(nextWorld.units)
    tilePartition = partitionTiles(nextWorld.map.tiles)
    for (const tile of nextWorld.map.tiles) {
      if (tile.enemyPressure >= 3) globalHostilePressureCount += 1
    }
  })

  // Per-faction: food income, AP recovery, unit supply, development
  measureAdvanceTickDiagnosticSubphase(diagnostics, 'advance_world_state.economy_upkeep', () => {
    for (const [factionId, faction] of Object.entries(nextWorld.factions)) {
    const incomeFood = factionFoodIncomes.get(factionId) ?? 0
    faction.actionPoints = Math.min(8, faction.actionPoints + 3)
    faction.food += incomeFood

    // 粮草维护消耗：每支在编部队每 tick 消耗 2 粮草
    // 规模压力：部队多→消耗大→逼迫持续扩张领地，防止无限屯兵
    const unitCount = (unitsByFaction.get(factionId) ?? []).length
    faction.food = Math.max(0, faction.food - unitCount * 2)

    // 四资源经济：木材/石料/铁矿 每 tick 收入（使用 resources.ts 产出表）
    const ownedTiles = tilePartition.byOwner.get(factionId) ?? []
    const extraIncome = computeResourceIncome(
      ownedTiles.map((t) => ({
        type: t.type,
        cityLevel: t.cityLevel,
        resourceKind: t.resourceKind,
        resourceLevel: t.resourceLevel,
      })),
    )
    // 仅取 wood/stone/iron（food 仍由 computeAllFactionFoodIncomes 主导，保持现有平衡）
    faction.wood = (faction.wood ?? 0) + extraIncome.wood
    faction.stone = (faction.stone ?? 0) + extraIncome.stone
    faction.iron = (faction.iron ?? 0) + extraIncome.iron

    for (const unit of unitsByFaction.get(factionId) ?? []) {
      unit.supply = Math.min(9, unit.supply + 1)
      // 战备度每 tick 恢复 5 点（完整恢复需 20 tick）
      unit.corps.readiness = Math.min(100, unit.corps.readiness + 5)
      // 行动完成后回到待命状态（行军中/侦察中/支援中/占领中均为短周期任务）
      if (unit.status === '行军中' || unit.status === '侦察中' || unit.status === '支援中' || unit.status === '占领中') {
        unit.status = '待命'
      }
    }

    }
  })

  measureAdvanceTickDiagnosticSubphase(diagnostics, 'advance_world_state.faction_growth_quota', () => {
    for (const factionId of Object.keys(nextWorld.factions)) {
      processFactionHeroDevelopment(nextWorld, factionId, tickHighlights, tilePartition, unitsByFaction, globalHostilePressureCount)
    }
  })

  const quotaSyncResults = measureAdvanceTickDiagnosticSubphase(
    diagnostics,
    'advance_world_state.ai_quota_sync',
    () => syncAllFactionAiQuota(nextWorld),
  )
  for (const result of quotaSyncResults) {
    if (result.currentQuota <= result.previousQuota) {
      continue
    }
    prependReport(
      nextWorld,
      nextWorld.tick,
      'AI 协作配额扩容',
      `${result.factionId} 协作席位从 ${result.previousQuota} 扩容到 ${result.currentQuota}（拉锯强度 ${result.tugIntensity}，成长分 ${result.growthScore}）。`,
    )
    const quotaAnchorUnit = nextWorld.units.find((unit) => unit.faction === result.factionId)
    tickHighlights.push(
      createReplayHighlight(
        nextWorld.tick,
        'planning',
        'medium',
        'AI 协作席位提升',
        `${result.factionId} 本回合解锁新 AI 协作位（${result.currentQuota}/10）。`,
        {
          unitId: quotaAnchorUnit?.id,
          tileId: quotaAnchorUnit?.tileId,
          factionId: result.factionId,
        },
      ),
    )
  }

  // Phase 2: 自动领土扩张（全势力飞地共享边界BFS，30格铺路+15格开荒/单位）
  measureAdvanceTickDiagnosticSubphase(diagnostics, 'advance_world_state.territory_recruit_levelup', () => {
    processAutoExpansion(nextWorld, unitsByFaction, tickHighlights)

  // Phase 2.5: 自动征兵（滚雪球核心：领地→粮食→征兵→更快扩张→更快接触）
    processRecruitment(nextWorld, unitsByFaction)

  // Phase 3: 自动武将升级 — 每势力 1 队 +5 级
    processAutoLevelUp(nextWorld, unitsByFaction, tickHighlights)
  })

  // Phase 4: 外交协议倒计时
  measureAdvanceTickDiagnosticSubphase(diagnostics, 'advance_world_state.execution_and_orders', () => {
    processDiplomacyAgreements(nextWorld)

    applyTacticalOverrides(nextWorld, tickHighlights)

  // Process executions for ALL factions
    for (const factionId of Object.keys(nextWorld.factions)) {
      processExecutionForFaction(nextWorld, factionId, tickHighlights)
    }

  // Post-execution status normalization: completeOrder sets transient statuses
  // ('占领中','行军中' etc.) during execution — reset them so units are available
  // for next tick's planning (guardPlan only allows '待命'/'驻防中')
  for (const unit of nextWorld.units) {
    if (unit.status === '行军中' || unit.status === '侦察中' || unit.status === '支援中' || unit.status === '占领中') {
      unit.status = '待命'
    }
  }

  })

  const primaryFactionId = resolveFallbackFactionId(nextWorld)
  const primaryOpposingFactionId = resolvePrimaryOpposingFactionId(nextWorld, primaryFactionId)
  measureAdvanceTickDiagnosticSubphase(diagnostics, 'advance_world_state.directors_and_theater', () => {
    const allianceActions = measureAdvanceTickDiagnosticSubphase(
      diagnostics,
      'advance_world_state.directors_and_theater.alliance_director',
      () => runAllianceDirector(nextWorld, primaryFactionId, diagnostics),
    )
    if (allianceActions.length > 0) {
      measureAdvanceTickDiagnosticSubphase(
        diagnostics,
        'advance_world_state.directors_and_theater.alliance_report_and_highlight',
        () => {
          prependReport(
            nextWorld,
            nextWorld.tick,
            '同盟独立行动',
            allianceActions.map((action) => action.detail).join('；'),
          )
          tickHighlights.push(
            createReplayHighlight(
              nextWorld.tick,
              'alliance_turn',
              'medium',
              '同盟行动摘要',
              allianceActions.map((action) => action.detail).join('；'),
              {
                unitId: allianceActions[0]?.unitId,
                tileId: allianceActions[0]?.tileId
                  ?? nextWorld.map.regions.find((region) => region.id === allianceActions[0]?.regionId)?.centerTileId,
                fromTileId: allianceActions[0]?.fromTileId,
                toTileId: allianceActions[0]?.toTileId ?? allianceActions[0]?.tileId,
                factionId: allianceActions[0]?.factionId ?? primaryFactionId,
              },
            ),
          )
        },
      )
    }

    const opposingResult = measureAdvanceTickDiagnosticSubphase(
      diagnostics,
      'advance_world_state.directors_and_theater.opposing_director',
      () => runOpposingDirectorDetailed(nextWorld, {
        defenderFactionId: primaryOpposingFactionId,
        targetFactionId: primaryFactionId,
        diagnostics,
      }),
    )
    const opposingActions = opposingResult.actions
    if (opposingActions.length > 0) {
      measureAdvanceTickDiagnosticSubphase(
        diagnostics,
        'advance_world_state.directors_and_theater.opposing_report_and_highlight',
        () => {
          prependReport(
            nextWorld,
            nextWorld.tick,
            '对立势力规则 AI 行动',
            opposingActions.join('；'),
          )
          tickHighlights.push(
            createReplayHighlight(
              nextWorld.tick,
              'enemy_turn',
              'high',
              '对立势力回合摘要',
              opposingActions.join('；'),
              {
                unitId: opposingResult.traces[0]?.unitId
                  ?? nextWorld.units.find((unit) => unit.faction === primaryOpposingFactionId)?.id,
                tileId: opposingResult.traces[0]?.tileId
                  ?? nextWorld.units.find((unit) => unit.faction === primaryOpposingFactionId)?.tileId,
                fromTileId: opposingResult.traces[0]?.fromTileId,
                toTileId: opposingResult.traces[0]?.toTileId ?? opposingResult.traces[0]?.tileId,
                factionId: primaryOpposingFactionId,
              },
            ),
          )
        },
      )
    }

    const theaterSnapshot = measureAdvanceTickDiagnosticSubphase(
      diagnostics,
      'advance_world_state.directors_and_theater.theater_snapshot',
      () =>
        buildTheaterSnapshot(
          nextWorld,
          primaryFactionId,
          diagnostics,
          'advance_world_state.directors_and_theater.theater_snapshot',
        ),
    )
    const summaryFaction = nextWorld.factions[primaryFactionId]
    const summaryFoodLabel = summaryFaction ? `${primaryFactionId} 行动点恢复至 ${summaryFaction.actionPoints}` : ''

    measureAdvanceTickDiagnosticSubphase(
      diagnostics,
      'advance_world_state.directors_and_theater.summary_report_and_highlight',
      () => {
        prependReport(
          nextWorld,
          nextWorld.tick,
          '时间推进完成',
          `后勤线回补完成，${summaryFoodLabel}，补给线健康度 ${theaterSnapshot.supplyLineHealth}，同盟协同 ${theaterSnapshot.allianceCoordination}，战斗风险 ${theaterSnapshot.battleRisk}。`,
        )
        tickHighlights.push(
          createEngageReplayHighlight(
            nextWorld.tick,
            'logistics',
            'low',
            '后勤回补',
            `补给线健康度 ${theaterSnapshot.supplyLineHealth}，发展能力 ${theaterSnapshot.developmentCapacity}，同盟协同 ${theaterSnapshot.allianceCoordination}，战斗风险 ${theaterSnapshot.battleRisk}。`,
            {
              unitId: nextWorld.units.find((unit) => unit.faction === primaryFactionId)?.id,
              tileId: nextWorld.units.find((unit) => unit.faction === primaryFactionId)?.tileId,
              factionId: primaryFactionId,
            },
          ),
        )
      },
    )
  })

  measureAdvanceTickDiagnosticSubphase(diagnostics, 'advance_world_state.endgame_and_decay', () => {
  updateLuoyangHoldCounters(nextWorld)
  processProvincePve(nextWorld, tickHighlights)
  processSiegeDecay(nextWorld, tickHighlights)

  // 城池围攻衰减：若攻城方在目标城池没有驻军则进度清零
  if (nextWorld.citySiegeProgress) {
    for (const key of Object.keys(nextWorld.citySiegeProgress)) {
      // 使用 indexOf 而非 split，防止 tileId 内部含冒号若导致截断
      const colonIdx = key.indexOf(':')
      const besiegerFactionId = key.slice(0, colonIdx)
      const siegeTileId = key.slice(colonIdx + 1)
      const hasBesiegerOnTile = nextWorld.units.some(
        (u) => u.faction === besiegerFactionId && u.tileId === siegeTileId,
      )
      if (!hasBesiegerOnTile) {
        delete nextWorld.citySiegeProgress[key]
      }
    }
  }

  // 情报衰减：confirmed → suspected（8 tick 未刷新）→ unknown（20 tick）
  // 战争迷雾因此真正生效：久未侦察的区域重新变为未知
  const INTEL_DECAY_SUSPECTED = 8
  const INTEL_DECAY_UNKNOWN = 20
  for (const intel of Object.values(nextWorld.intel)) {
    if (!intel.lastScoutedTick) continue
    const age = nextWorld.tick - intel.lastScoutedTick
    if (intel.level === 'confirmed' && age > INTEL_DECAY_SUSPECTED) {
      intel.level = 'suspected'
    } else if (intel.level === 'suspected' && age > INTEL_DECAY_UNKNOWN) {
      intel.level = 'unknown'
    }
  }

  // 胜利条件检测：在每 tick 末尾由规则引擎自主判断，结果写入 feedback
  const victoryResult = checkVictoryConditions(nextWorld)
  if (victoryResult.winner) {
    nextWorld.feedback.gameEnded = {
      winner: victoryResult.winner,
      condition: victoryResult.condition,
      reason: victoryResult.reason,
    }
  }
  })

  bumpWorldVersion(nextWorld)

  // Sync replay for all factions
  measureAdvanceTickDiagnosticSubphase(diagnostics, 'advance_world_state.replay_sync', () => {
    for (const factionId of Object.keys(nextWorld.factions)) {
      syncExecutionReplay(nextWorld, factionId, 'Tick 推进', undefined, false, tickHighlights)
    }
  })

  return nextWorld
}

export function summarizeFrontline(world: WorldState, factionId: string = resolveFallbackFactionId(world)) {
  const theater = buildTheaterSnapshot(world, factionId)
  const factionUnits = world.units.filter((unit) => unit.faction === factionId)
  const committedWest = factionUnits.filter((unit) => unit.tileId === 'tile_06').length
  const scoutingNorth = factionUnits.filter((unit) => ['tile_01', 'tile_02', 'tile_03', 'tile_04', 'tile_09'].includes(unit.tileId)).length
  const reserve = factionUnits.filter((unit) => ['tile_08', 'tile_12', 'tile_13'].includes(unit.tileId)).length
  const activeOrders = Object.values(world.executions).reduce((count, exec) =>
    count + (exec?.orders.filter((order) => order.status === 'queued' || order.status === 'running').length ?? 0), 0)
  const frontlinePressure = ['tile_06', 'tile_07', 'tile_09', 'tile_15']
    .map((tileId) => getTileByIdFast(world, tileId)?.enemyPressure ?? 0)
    .reduce((sum, pressure) => sum + pressure, 0)

  return `西侧关口现有 ${committedWest} 支${factionId}队伍接触，北线方向投入 ${scoutingNorth} 支，中军预备队保留 ${reserve} 支。当前资源为 ${world.factions[factionId]?.food ?? 0} 粮草 / ${world.factions[factionId]?.actionPoints ?? 0} 行动点，执行中的 AI 任务 ${activeOrders} 条，前线累计对立压力 ${frontlinePressure}，同盟协同 ${theater.allianceCoordination}，战斗风险 ${theater.battleRisk}。`
}

export function getTileIntel(world: WorldState, tileId: string): TileIntel | undefined {
  return world.intel[tileId]
}

export function canRevealEnemy(world: WorldState, tileId: string) {
  const intel = getTileIntel(world, tileId)
  return intel?.level === 'confirmed'
}

function processFactionHeroDevelopment(
  world: WorldState,
  factionId: string,
  highlights: ReplayHighlight[],
  tilePartition: ReturnType<typeof partitionTiles>,
  unitsByFaction: Map<string, Unit[]>,
  globalHostilePressureCount: number,
) {
  const faction = world.factions[factionId]
  const heroCommand = faction.heroCommand
  const developmentGain = calculateFactionDevelopmentGain(factionId, faction, tilePartition)
  heroCommand.developmentPoints += developmentGain

  const recruitedHeroes: string[] = []
  while (
    heroCommand.prospectHeroIds.length > 0 &&
    heroCommand.developmentPoints >= heroCommand.acquisitionThreshold
  ) {
    heroCommand.developmentPoints -= heroCommand.acquisitionThreshold
    heroCommand.acquisitionThreshold = Math.min(36, heroCommand.acquisitionThreshold + 2)

    const recruitedHeroId = pickNextProspectHeroId(heroCommand)
    if (!recruitedHeroId) {
      break
    }

    heroCommand.rosterHeroIds.push(recruitedHeroId)
    heroCommand.reserveHeroIds.push(recruitedHeroId)
    heroCommand.recentHeroId = recruitedHeroId
    recruitedHeroes.push(getHeroPoolEntryById(recruitedHeroId).name)
  }

  if (recruitedHeroes.length > 0) {
    const factionAnchorUnit = (unitsByFaction.get(factionId) ?? [])[0]
    prependReport(
      world,
      world.tick,
      `${factionId} 发展获得武将`,
      `${factionId} 通过发展补充了 ${recruitedHeroes.join('、')}，已进入 reserve。`,
    )
    highlights.push(
      createReplayHighlight(
        world.tick,
        'planning',
        'medium',
        `${factionId} 新增 reserve 武将`,
        `${recruitedHeroes.join('、')} 已通过发展加入 ${factionId} reserve。`,
        {
          unitId: factionAnchorUnit?.id,
          tileId: factionAnchorUnit?.tileId,
          factionId,
        },
      ),
    )
  }

  autoDeployReserveHero(world, factionId, highlights, unitsByFaction, globalHostilePressureCount)
}

/** Phase 2 优化：使用预分区 O(k) 替代 O(2n) filter */
function calculateFactionDevelopmentGain(
  factionId: string,
  faction: WorldState['factions'][string],
  tilePartition: ReturnType<typeof partitionTiles>,
) {
  const ownedTiles = tilePartition.byOwner.get(factionId) ?? []
  let resourceCount = 0
  let cityCount = 0
  for (const tile of ownedTiles) {
    if (tile.type === 'resource') resourceCount++
    else if (tile.type === 'city') cityCount++
  }
  const foodGain = Math.max(1, Math.round(faction.food / 12))
  return resourceCount * 3 + cityCount * 2 + foodGain
}

function pickNextProspectHeroId(heroCommand: WorldState['factions'][string]['heroCommand']) {
  const sorted = [...heroCommand.prospectHeroIds].sort((leftId, rightId) => {
    const left = getHeroPoolEntryById(leftId)
    const right = getHeroPoolEntryById(rightId)
    const leftScore = left.cost * 10 + (left.quality === '4-SR' ? 20 : left.quality === '3-R' ? 10 : 0)
    const rightScore =
      right.cost * 10 + (right.quality === '4-SR' ? 20 : right.quality === '3-R' ? 10 : 0)
    return rightScore - leftScore
  })

  const pickWindow = heroCommand.heroLuck >= 78 ? 1 : heroCommand.heroLuck >= 70 ? 2 : 3
  const chosen = sorted[Math.min(pickWindow - 1, sorted.length - 1)]
  if (!chosen) {
    return null
  }

  heroCommand.prospectHeroIds = heroCommand.prospectHeroIds.filter((heroId) => heroId !== chosen)
  return chosen
}

function autoDeployReserveHero(
  world: WorldState,
  factionId: string,
  highlights: ReplayHighlight[],
  unitsByFaction: Map<string, Unit[]>,
  globalHostilePressureCount: number,
) {
  const faction = world.factions[factionId]
  const heroCommand = faction.heroCommand
  const deployedUnits = unitsByFaction.get(factionId) ?? []
  if (
    heroCommand.reserveHeroIds.length === 0 ||
    deployedUnits.length >= heroCommand.commandLimit ||
    faction.food < 3
  ) {
    return
  }

  const nextHeroId = pickReserveHeroForDeployment(world, factionId, unitsByFaction, globalHostilePressureCount)
  if (!nextHeroId) {
    return
  }

  heroCommand.reserveHeroIds = heroCommand.reserveHeroIds.filter((heroId) => heroId !== nextHeroId)
  const spawnedUnit = createReserveUnit(world, factionId, nextHeroId)
  world.units.push(spawnedUnit)
  faction.food = Math.max(0, faction.food - 3)

  prependReport(
    world,
    world.tick,
    `${factionId} reserve 编组完成`,
    `${spawnedUnit.hero.name} 已从 reserve 编入 ${spawnedUnit.corps.name}，在 ${getTileById(world, spawnedUnit.tileId)?.name ?? spawnedUnit.tileId} 待命。`,
  )
  highlights.push(
    createReplayHighlight(
      world.tick,
      'planning',
      'high',
      `${factionId} 新增执行单元`,
      `${spawnedUnit.hero.name} 已完成编组并进入地图。`,
      {
        unitId: spawnedUnit.id,
        tileId: spawnedUnit.tileId,
        factionId,
      },
    ),
  )
}

function pickReserveHeroForDeployment(
  world: WorldState,
  factionId: string,
  unitsByFaction: Map<string, Unit[]>,
  globalHostilePressureCount: number,
) {
  const reserveHeroIds = world.factions[factionId].heroCommand.reserveHeroIds
  if (reserveHeroIds.length === 0) {
    return null
  }

  const currentUnits = unitsByFaction.get(factionId) ?? []
  const neededArchetype = resolveNeededArchetype(world, factionId, currentUnits, globalHostilePressureCount)
  const preferred = reserveHeroIds.find(
    (heroId) => getHeroPoolEntryById(heroId).archetype === neededArchetype,
  )
  return preferred ?? reserveHeroIds[0]
}

function resolveNeededArchetype(
  world: WorldState,
  factionId: string,
  currentUnits: Unit[],
  globalHostilePressureCount: number,
) {
  const counts = currentUnits.reduce<Record<Unit['hero']['archetype'], number>>(
    (accumulator, unit) => {
      accumulator[unit.hero.archetype] += 1
      return accumulator
    },
    {
      assault: 0,
      recon: 0,
      guard: 0,
      mobile: 0,
      heavy: 0,
      logistics: 0,
      reserve: 0,
    },
  )

  if (counts.logistics === 0) {
    return 'logistics'
  }

  // Phase 2 优化：使用 advanceTick 预计算的高压地块数，替代 O(n) 全图扫描
  if (globalHostilePressureCount >= 3 && counts.heavy <= counts.mobile) {
    return 'heavy'
  }

  if (counts.recon === 0 || world.map.tiles.some((tile) => tile.owner !== factionId && world.intel[tile.id]?.level === 'unknown')) {
    return 'recon'
  }

  const factionPressure = world.map.tiles.filter((tile) => tile.owner === factionId && tile.enemyPressure >= 3).length
  return factionPressure >= 3 ? 'guard' : 'mobile'
}

function createReserveUnit(
  world: WorldState,
  factionId: string,
  heroId: string,
  spawnTileId = world.factions[factionId].heroCommand.homeTileId,
  deploymentMode: 'auto' | 'manual' = 'auto',
  coHeroIds: string[] = [],
): Unit {
  const heroEntry = getHeroPoolEntryById(heroId)
  const index = world.units.filter((unit) => unit.faction === factionId).length + 1
  const archetype = heroEntry.archetype
  const troopType =
    heroEntry.troopType === 'mixed' && (archetype === 'guard' || archetype === 'heavy')
      ? 'shield'
      : heroEntry.troopType

  const normalizedCoHeroIds = Array.from(new Set(coHeroIds.map((candidateId) => candidateId.trim()).filter(Boolean))).filter(
    (candidateId) => candidateId !== heroId,
  ).slice(0, 2)

  return {
    id: `u_${factionId}_${world.tick}_${index}_${heroId}`,
    name: `${heroEntry.name}所部`,
    faction: factionId,
    corps: {
      name: buildCorpsName(heroEntry.name, factionId, archetype),
      doctrine: buildCorpsDoctrine(archetype, factionId),
      specialty: buildCorpsSpecialty(archetype),
      readiness: Math.min(100, 68 + Math.round(heroEntry.cost * 6)),
      roster: buildCorpsRoster(heroEntry.name, archetype),
    },
    hero: buildHeroProfileFromPoolId(heroId, {
      archetype,
      troopType,
      title: buildReserveHeroTitle(archetype, factionId),
      level: 18 + Math.round(heroEntry.cost * 2),
      growthFocus:
        deploymentMode === 'manual'
          ? '由玩家指定支点完成编组，可直接接入战术模板与 AI 指挥链。'
          : '通过发展进入战区，可继续在 AI 指挥链中成长。',
      traits: heroEntry.tags,
    }),
    coHeroes: normalizedCoHeroIds.map((coHeroId) => {
      const coHeroEntry = getHeroPoolEntryById(coHeroId)
      const coHeroTroopType =
        coHeroEntry.troopType === 'mixed' && (coHeroEntry.archetype === 'guard' || coHeroEntry.archetype === 'heavy')
          ? 'shield'
          : coHeroEntry.troopType
      return buildHeroProfileFromPoolId(coHeroId, {
        archetype: coHeroEntry.archetype,
        troopType: coHeroTroopType,
        title: buildReserveHeroTitle(coHeroEntry.archetype, factionId),
        level: 18 + Math.round(coHeroEntry.cost * 2),
        growthFocus: '作为三武将编队副将进入地图，负责补足队列兵种与战术支援。',
        traits: coHeroEntry.tags,
      })
    }),
    tileId: spawnTileId,
    strength: 58 + Math.round(heroEntry.cost * 8),
    mobility: archetype === 'mobile' || archetype === 'recon' ? 3 : archetype === 'heavy' ? 1 : 2,
    supply: archetype === 'logistics' ? 8 : 6,
    status: '待命',
    currentTask:
      deploymentMode === 'manual'
        ? `由玩家指定支点编组进入 ${getTileById(world, spawnTileId)?.name ?? spawnTileId}`
        : `由 reserve 编组进入 ${getTileById(world, spawnTileId)?.name ?? spawnTileId}`,
  }
}

function buildCorpsName(heroName: string, factionId: string, archetype: Unit['hero']['archetype']) {
  const suffix =
    archetype === 'assault'
      ? '突击营'
      : archetype === 'recon'
        ? '游骑营'
        : archetype === 'guard'
          ? '守备营'
          : archetype === 'mobile'
            ? '机动营'
            : archetype === 'heavy'
              ? '重锋营'
              : archetype === 'logistics'
                ? '辎运营'
                : '预备营'
  return `军团${abbreviateFactionId(factionId)}·${heroName}${suffix}`
}

function buildCorpsDoctrine(archetype: Unit['hero']['archetype'], factionId: string) {
  const direction = `将 ${resolveFactionDisplayLabel(factionId)} 的发展成果转成可调度执行单元。`
  switch (archetype) {
    case 'assault':
      return `抢节奏、打先手，${direction}`
    case 'recon':
      return `先摸清局势和路径，再决定接敌强度。${direction}`
    case 'guard':
      return `稳住支点和补给入口，避免阵线塌陷。${direction}`
    case 'mobile':
      return `优先补位和转场，随时插向薄弱点。${direction}`
    case 'heavy':
      return `做决定性正面压制，不做无意义来回。${direction}`
    case 'logistics':
      return `优先保补给和恢复，让主力能继续推进。${direction}`
    case 'reserve':
      return `保持待机，准备接任何空缺或战损轮换。${direction}`
  }
}

function buildCorpsSpecialty(archetype: Unit['hero']['archetype']) {
  switch (archetype) {
    case 'assault':
      return '前线突破'
    case 'recon':
      return '视野侦察'
    case 'guard':
      return '驻点守备'
    case 'mobile':
      return '快速策应'
    case 'heavy':
      return '正面压制'
    case 'logistics':
      return '补给维护'
    case 'reserve':
      return '轮换预备'
  }
}

function buildCorpsRoster(heroName: string, archetype: Unit['hero']['archetype']) {
  const roleRoster =
    archetype === 'assault'
      ? ['突前兵', '冲阵手', '破障兵']
      : archetype === 'recon'
        ? ['轻骑斥候', '信标手', '探路队']
        : archetype === 'guard'
          ? ['盾列守军', '城防班', '援护兵']
          : archetype === 'mobile'
            ? ['机动步队', '侧翼护送', '快速补位队']
            : archetype === 'heavy'
              ? ['重步列阵', '压阵亲卫', '破甲手']
              : archetype === 'logistics'
                ? ['辎车列', '补给兵', '修缮班']
                : ['预备兵', '整编队', '接应兵']
  return [heroName, ...roleRoster].slice(0, 3)
}

function buildReserveHeroTitle(archetype: Unit['hero']['archetype'], factionId: string) {
  const prefix = `${abbreviateFactionId(factionId)}编`
  switch (archetype) {
    case 'assault':
      return `${prefix}突击将`
    case 'recon':
      return `${prefix}侦察使`
    case 'guard':
      return `${prefix}镇守将`
    case 'mobile':
      return `${prefix}机动将`
    case 'heavy':
      return `${prefix}重锋将`
    case 'logistics':
      return `${prefix}军资使`
    case 'reserve':
      return `${prefix}预备将`
  }
}

function applyTacticalOverrides(world: WorldState, highlights: ReplayHighlight[]) {
  const queuedOverrides = world.tacticalOverrides.filter((override) => override.status === 'queued')
  if (queuedOverrides.length === 0) {
    return
  }

  const queuedByFaction = new Map<string, TacticalOverride[]>()
  for (const override of queuedOverrides) {
    const overrideFactionId = resolveTacticalOverrideFactionId(world, override)
    if (!overrideFactionId) {
      override.status = 'failed'
      override.lastMessage = '无法识别所属势力，战术插令已标记失败。'
      continue
    }
    const queue = queuedByFaction.get(overrideFactionId) ?? []
    queue.push(override)
    queuedByFaction.set(overrideFactionId, queue)
  }

  for (const [factionId, factionOverrides] of queuedByFaction.entries()) {
    const factionLabel = resolveFactionDisplayLabel(factionId)
    const factionExec = getExecution(world, factionId)
    if (factionExec) {
      const injectedOrders = materializeQueuedTacticalOrders(
        world,
        factionExec.requestId,
        factionExec.basedOnWorldVersion,
        factionId,
      )
      if (injectedOrders.length === 0) {
        continue
      }

      factionExec.orders = [...injectedOrders, ...factionExec.orders]
      world.executions[factionId] = factionExec
      prependReport(
        world,
        world.tick,
        '战术插令接管优先级',
        `${factionLabel} 插入的 ${injectedOrders.length} 条战术命令已压到当前执行队列前部。`,
      )
      highlights.push(
        createReplayHighlight(
          world.tick,
          'planning',
          'medium',
          '战术插令并入当前计划',
          `${factionLabel} 本回合新增 ${injectedOrders.length} 条战术动作，优先于既有任务执行。`,
          {
            unitId: injectedOrders[0]?.unitId,
            tileId: injectedOrders[0]?.target,
            factionId,
          },
        ),
      )
      continue
    }

    const requestId = `tactical_${factionId}_${world.tick}_${world.worldVersion}`
    const tacticalOrders = materializeQueuedTacticalOrders(world, requestId, world.worldVersion, factionId)
    if (tacticalOrders.length === 0) {
      continue
    }

    const tacticalPlan: StrategicPlan = {
      intent: `执行 ${factionLabel} 插入战术命令`,
      priority: 'high',
      orders: tacticalOrders.map((order) => ({
        unitId: order.unitId,
        action: order.action,
        target: order.target,
      })),
      constraints: ['来自战术执行层插令，不改动 planner 主链'],
      reviewAfterTicks: 1,
    }

    world.executions[factionId] = {
      requestId,
      source: 'mock',
      strategicCommand: `${factionLabel} 战术插令`,
      currentPlan: tacticalPlan,
      orders: tacticalOrders,
      reviewAtTick: world.tick + 1,
      basedOnWorldVersion: world.worldVersion,
      plannerNote: '该执行链由战术模板直接注入，没有重新调用 planner。',
      plannerExplanation: 'This execution chain comes from tactical overrides, not a fresh AI plan.',
      planningRationale: ['Prioritize immediate tactical intent', 'Keep the main planner chain unchanged'],
    }

    prependReport(
      world,
      world.tick,
      '战术插令启动执行',
      `${factionLabel} 插入的 ${factionOverrides.length} 条战术命令已单独启动执行链。`,
    )
    highlights.push(
      createReplayHighlight(
        world.tick,
        'planning',
        'medium',
        '战术插令启动',
        `${factionLabel} 在本回合无新计划时，系统已直接执行 ${tacticalOrders.length} 条战术命令。`,
        {
          unitId: tacticalOrders[0]?.unitId,
          tileId: tacticalOrders[0]?.target,
          factionId,
        },
      ),
    )
  }
}

function materializeQueuedTacticalOrders(
  world: WorldState,
  requestId: string,
  basedOnWorldVersion: number,
  factionId: string,
) {
  const queuedOverrides = world.tacticalOverrides.filter(
    (override) =>
      override.status === 'queued' &&
      resolveTacticalOverrideFactionId(world, override) === factionId,
  )

  return queuedOverrides.map((override, index) => {
    const action = mapTemplateToAction(world, override, factionId)
    override.status = 'committed'
    override.committedRequestId = requestId
    override.lastMessage = `已并入 ${requestId}`

    return {
      id: `${requestId}_tactical_${index}`,
      requestId,
      unitId: override.unitId,
      action,
      target: override.targetTileId,
      tacticalOverrideId: override.id,
      status: 'queued',
      summary: override.summary,
      createdTick: world.tick,
      basedOnWorldVersion,
    } satisfies ExecutableOrder
  })
}

function mapTemplateToAction(world: WorldState, override: TacticalOverride, factionId: string): ActionType {
  const targetTile = getTileById(world, override.targetTileId)
  switch (override.templateId) {
    case 'rally':
      return 'march'
    case 'harass':
      return 'recon'
    case 'withdraw':
      return 'march'
    case 'breakthrough':
      return 'capture'
    case 'sweep':
      return targetTile?.owner === factionId ? 'recon' : 'capture'
    case 'garrison':
      return 'garrison'
  }
}

function resolveTacticalOverrideFactionId(world: WorldState, override: TacticalOverride): string | null {
  const unit = getUnitById(world, override.unitId)
  return unit?.faction ?? null
}

function processExecutionForFaction(world: WorldState, factionId: string, highlights: ReplayHighlight[]) {
  const execution = getExecution(world, factionId)
  if (!execution) {
    return
  }

  execution.lastError = undefined

  for (let index = 0; index < execution.orders.length; index += 1) {
    const order = execution.orders[index]
    if (order.status === 'completed' || order.status === 'failed') {
      continue
    }

    const previousBlockingOrder = execution.orders.find(
      (candidate, candidateIndex) =>
        candidateIndex < index &&
        candidate.unitId === order.unitId &&
        candidate.status !== 'completed' &&
        candidate.status !== 'failed',
    )

    if (previousBlockingOrder) {
      continue
    }

    executeOrderStep(world, factionId, order, highlights)
  }

  if (execution && world.tick >= execution.reviewAtTick && !hasActiveOrders(world, factionId)) {
    prependReport(
      world,
      world.tick,
      '计划执行窗口结束',
      '当前计划已达到复盘时点，可根据最新局势继续下达下一条战略命令。',
    )
    highlights.push(
      createReplayHighlight(
        world.tick,
        'planning',
        'medium',
        '计划进入复盘窗口',
        '当前计划已达到复盘时点，可根据最新局势继续下达下一条战略命令。',
        {
          unitId: execution.orders[0]?.unitId,
          tileId: execution.orders[0]?.target,
          factionId,
        },
      ),
    )
  }
}

function executeOrderStep(world: WorldState, factionId: string, order: ExecutableOrder, highlights: ReplayHighlight[]) {
  const unit = getUnitById(world, order.unitId)
  const targetTile = getTileById(world, order.target)

  if (!unit || !targetTile) {
    failOrder(world, factionId, order, '任务引用的单位或地块不存在。')
    return
  }

  if (unit.faction !== factionId) {
    failOrder(world, factionId, order, 'order unit does not belong to executing faction.')
    return
  }

  if (order.status === 'queued') {
    order.status = 'running'
    order.startedTick = world.tick
    // ── 命令启动时消耗 1 行动点（不再按步计费，让兵种速度成为唯一限制）──
    if (!spendFactionResources(world, factionId, 1, 0)) {
      order.status = 'queued'
      order.lastMessage = '等待行动点...'
      return
    }
  }

  if (unit.tileId !== targetTile.id) {
    // ── 多步行军：骑兵 150格/回合，步兵 100格/回合（一次BFS计算路径，沿路走走完）──
    const isMarchOrder = order.action === 'march' || order.action === 'capture'
    const stepsThisTick = isMarchOrder ? getMarchSteps(unit) : 1

    // 一次 BFS 算出完整路径，避免每步重算路径（性能关键）
    const fullPath = getFullPath(world, unit.tileId, targetTile.id)
    if (fullPath.length === 0) {
      failOrder(world, factionId, order, `${unit.name} 无法抵达 ${targetTile.name}。`)
      return
    }

    if (stepsThisTick === 1) {
      // 原有逻辑：走一步
      const nextStep = fullPath[0]
      const nextTile = getTileById(world, nextStep)
      if (!nextTile) {
        failOrder(world, factionId, order, `${unit.name} 的路径节点不存在。`)
        return
      }
      const blockedReason = getEntryBlockReason(world, unit, nextTile, order.action)
      if (blockedReason) {
        failOrder(world, factionId, order, blockedReason)
        return
      }
      const originTileId = unit.tileId
      unit.tileId = nextTile.id
      unit.supply = Math.max(0, unit.supply - 1)
      unit.status = '行军中'
      unit.currentTask = `${actionLabel(order.action)} ${targetTile.name}`
      order.lastMessage = `${unit.name} 向 ${targetTile.name} 行军`
      const battleMessage = resolveBattleAtTile(world, unit, nextTile, originTileId, highlights)
      if (battleMessage) {
        order.lastMessage = battleMessage
        if (unit.tileId !== nextTile.id) {
          order.status = 'failed'
          order.completedTick = world.tick
          order.error = battleMessage
          const factionExec = getExecution(world, factionId)
          if (factionExec) factionExec.lastError = battleMessage
        }
      }
    } else {
      // 多步行军：沿预算路径走 stepsThisTick 步（一次 BFS，不重算）
      prependReport(
        world,
        world.tick,
        '急行军',
        `${unit.name} 以 ${stepsThisTick}格/回合速度（${unit.hero.troopType}）向 ${targetTile.name} 急行军。`,
      )
      for (let step = 0; step < stepsThisTick && step < fullPath.length; step++) {
        if (unit.tileId === targetTile.id) break

        const nextStep = fullPath[step]
        const nextTile = getTileById(world, nextStep)
        if (!nextTile) return

        const blockedReason = getEntryBlockReason(world, unit, nextTile, order.action)
        if (blockedReason) return

        const originTileId = unit.tileId
        unit.tileId = nextTile.id
        // 急行军补给消耗极低（每 100 步 -1），不阻断长途进军
        if (step % 100 === 0 && step > 0) unit.supply = Math.max(0, unit.supply - 1)
        unit.status = '行军中'
        unit.currentTask = `${actionLabel(order.action)} ${targetTile.name}`
        order.lastMessage = `${unit.name} 向 ${targetTile.name} 急行军`

        const battleMessage = resolveBattleAtTile(world, unit, nextTile, originTileId, highlights)
        if (battleMessage) {
          order.lastMessage = battleMessage
          if (unit.tileId !== nextTile.id) {
            order.status = 'failed'
            order.completedTick = world.tick
            order.error = battleMessage
            const factionExec = getExecution(world, factionId)
            if (factionExec) factionExec.lastError = battleMessage
          }
          return // 遭遇战：中止本回合急行军
        }
      }
    }

    if (unit.tileId !== targetTile.id) {
      return
    }
  }

  resolveActionAtTarget(world, unit, targetTile, order, highlights)
}

function resolveActionAtTarget(
  world: WorldState,
  unit: Unit,
  targetTile: Tile,
  order: ExecutableOrder,
  highlights: ReplayHighlight[],
) {
  const factionId = unit.faction
  switch (order.action) {
    case 'march':
      completeOrder(world, order, unit, '待命', `抵达${targetTile.name}待命`, `${unit.name} 已抵达 ${targetTile.name}。`)
      return
    case 'capture': {
      if (hasHostileUnit(world, targetTile.id, factionId)) {
        failOrder(world, factionId, order, `${targetTile.name} 敌情仍在，当前不具备安全占领条件。`)
        return
      }

      if (targetTile.type === 'city' && targetTile.owner !== factionId) {
        if (!spendFactionResources(world, factionId, 1, 1)) {
          order.lastMessage = `等待资源以推进对 ${targetTile.name} 的攻城`
          return
        }

        const siegeResult = resolveCitySiegeDurability(world, {
          factionId,
          unitId: unit.id,
          tileId: targetTile.id,
          damage: Math.max(1, Math.round(unit.strength * 100)),
        })

        if (!siegeResult.ok) {
          failOrder(world, factionId, order, siegeResult.message)
          return
        }

        const battleRegionId = getRegionIdForTile(world, targetTile.id)
        recordBattleOutcome(world, {
          id: `city_siege_${world.tick}_${unit.id}_${targetTile.id}_${order.id}`,
          tick: world.tick,
          regionId: battleRegionId,
          tileId: targetTile.id,
          attackerFaction: factionId,
          attackerFactionId: factionId,
          defenderFactionId: targetTile.owner,
          attackerUnitId: unit.id,
          aiPlayerId: unit.aiPlayerId,
          attackerAiPlayerId: unit.aiPlayerId,
          outcome: siegeResult.breached ? 'win' : 'draw',
          attackerLoss: 0,
          defenderLoss: siegeResult.durabilityBefore - siegeResult.durabilityAfter,
          alliedSupport: world.alliance.directives[battleRegionId]?.supportLevel ?? 0,
          summary: siegeResult.summary,
          reportKind: 'city_siege',
          result: siegeResult.breached ? '胜' : '平',
          time: buildBattleTimeLabel(world),
          location: buildBattleLocationLabel(targetTile),
          tileX: targetTile.x,
          tileY: targetTile.y,
          attacker: unit.name,
          defender: targetTile.name,
          attackerTroops: unit.strength,
          attackerMaxTroops: unit.strength,
          defenderTroops: siegeResult.durabilityAfter,
          defenderMaxTroops: siegeResult.durabilityMax,
          attackerStrengthBefore: unit.strength,
          attackerStrengthAfter: unit.strength,
          defenderStrengthBefore: siegeResult.durabilityBefore,
          defenderStrengthAfter: siegeResult.durabilityAfter,
        })

        targetTile.enemyPressure = Math.max(0, targetTile.enemyPressure - 1)
        if (siegeResult.ownershipTransferred) {
          highlights.push(
            createEngageReplayHighlight(
              world.tick,
              'tile_control',
              'high',
              `城池攻克：${targetTile.name}`,
              siegeResult.summary,
              {
                unitId: unit.id,
                tileId: targetTile.id,
                factionId,
              },
            ),
          )
        }
        completeOrder(
          world,
          order,
          unit,
          '占领中',
          siegeResult.breached ? `攻克${targetTile.name}` : `攻城${targetTile.name}`,
          siegeResult.summary,
        )
        return
      }

      if (!spendFactionResources(world, factionId, 1, 1)) {
        order.lastMessage = `等待资源以完成对 ${targetTile.name} 的占领`
        return
      }

      const previousOwner = targetTile.owner
      targetTile.owner = factionId
      targetTile.enemyPressure = Math.max(0, targetTile.enemyPressure - 1)
      if (previousOwner !== factionId) {
        highlights.push(
          createEngageReplayHighlight(
            world.tick,
            'tile_control',
            tileControlSeverity(targetTile.type),
            `控制权变更：${targetTile.name}`,
            `${unit.name} 已将 ${targetTile.name} 从${ownerLabel(previousOwner)}转入 ${factionId} 控制。`,
            {
              unitId: unit.id,
              tileId: targetTile.id,
              factionId,
            },
          ),
        )
      }
      completeOrder(world, order, unit, '占领中', `控制${targetTile.name}`, `${unit.name} 完成对 ${targetTile.name} 的占领。`)
      return
    }
    case 'garrison': {
      if (hasHostileUnit(world, targetTile.id, factionId)) {
        failOrder(world, factionId, order, `${targetTile.name} 仍属敌占，无法直接驻防。`)
        return
      }

      if (!spendFactionResources(world, factionId, 1, 0)) {
        order.lastMessage = `等待行动点以建立 ${targetTile.name} 驻防`
        return
      }

      const previousOwner = targetTile.owner
      targetTile.owner = factionId
      targetTile.enemyPressure = Math.max(0, targetTile.enemyPressure - 1)
      if (previousOwner !== factionId) {
        highlights.push(
          createEngageReplayHighlight(
            world.tick,
            'tile_control',
            tileControlSeverity(targetTile.type),
            `控制权变更：${targetTile.name}`,
            `${unit.name} 驻防接管 ${targetTile.name}，前线支点已纳入 ${factionId}。`,
            {
              unitId: unit.id,
              tileId: targetTile.id,
              factionId,
            },
          ),
        )
      }
      completeOrder(world, order, unit, '驻防中', `驻防${targetTile.name}`, `${unit.name} 已在 ${targetTile.name} 建立驻防。`)
      return
    }
    case 'recon':
      if (!spendFactionResources(world, factionId, 1, 0)) {
        order.lastMessage = `等待行动点以侦察 ${targetTile.name}`
        return
      }

      revealIntel(
        world,
        targetTile.id,
        'confirmed',
        `侦察确认：${targetTile.name} 对立压力 ${targetTile.enemyPressure}。`,
        highlights,
        {
          unitId: unit.id,
          factionId,
          fromTileId: unit.tileId,
        },
      )
      for (const neighborId of world.map.connections[targetTile.id] ?? []) {
        const intel = world.intel[neighborId]
        if (intel?.level === 'unknown') {
          revealIntel(world, neighborId, 'suspected', `由 ${targetTile.name} 延伸获得轮廓情报。`, highlights, {
            unitId: unit.id,
            factionId,
            fromTileId: targetTile.id,
          })
        }
      }

      completeOrder(world, order, unit, '侦察中', `侦察${targetTile.name}`, `${unit.name} 完成对 ${targetTile.name} 的侦察。`)
      return
    case 'support': {
      if (hasHostileUnit(world, targetTile.id, factionId)) {
        failOrder(world, factionId, order, `${targetTile.name} 不是安全支援点。`)
        return
      }

      if (!spendFactionResources(world, factionId, 1, 1)) {
        order.lastMessage = `等待资源以完成对 ${targetTile.name} 的支援`
        return
      }

      const friendlyUnits = world.units.filter(
        (candidate) => candidate.faction === factionId && candidate.tileId === targetTile.id,
      )

      for (const ally of friendlyUnits) {
        ally.supply = Math.min(9, ally.supply + 1)
        if (ally.id !== unit.id) {
          ally.strength = Math.min(100, ally.strength + 6)
        }
      }

      targetTile.enemyPressure = Math.max(0, targetTile.enemyPressure - 1)
      highlights.push(
        createEngageReplayHighlight(
          world.tick,
          'logistics',
          'medium',
          `战备支援：${targetTile.name}`,
          `${unit.name} 为 ${friendlyUnits.length} 支友军补充补给与战备。`,
          {
            unitId: unit.id,
            tileId: targetTile.id,
            factionId,
          },
        ),
      )
      completeOrder(world, order, unit, '支援中', `支援${targetTile.name}`, `${unit.name} 已为 ${targetTile.name} 的友军补充战备。`)
      return
    }
  }
}

function completeOrder(
  world: WorldState,
  order: ExecutableOrder,
  unit: Unit,
  status: UnitStatus,
  task: string,
  detail: string,
) {
  unit.status = status
  unit.currentTask = task
  order.status = 'completed'
  order.completedTick = world.tick
  order.lastMessage = detail
  syncTacticalOverrideStatus(world, order, 'completed', detail)
  prependReport(world, world.tick, `${actionLabel(order.action)}完成`, detail)
}

function failOrder(world: WorldState, factionId: string, order: ExecutableOrder, message: string) {
  order.status = 'failed'
  order.completedTick = world.tick
  order.error = message
  syncTacticalOverrideStatus(world, order, 'failed', message)
  const factionExec = getExecution(world, factionId)
  if (factionExec) {
    factionExec.lastError = message
  }
  prependReport(world, world.tick, '任务执行受阻', message)
}

/**
 * BFS 计算完整路径（从 from → to，返回路径节点列表，不含起点）
 * 用于多步行军：只调用一次 BFS，沿返回路径走，避免每步重算（O(n) × 150步 → O(n) × 1次）
 *
 * 性能关键：用 head 指针代替 queue.shift()，避免 O(n) 移位；用 push+reverse 代替 unshift 重建路径。
 */
/**
 * 从 fromTileId 到 toTileId 的完整路径。
 *
 * 性能优化：地图已在 buildMultiFactionWorld 中清除全部地形/区划障碍（mountain→grassland，
 * connections 重建为纯四向网格），故可用 O(W+H) 坐标贪心替代 O(W×H) BFS。
 *
 * 贪心策略：每步选择曼哈顿距离最小的邻居，在无障碍网格上保证最短路径。
 * 与 BFS 相比：路径质量相同，速度提升 ~160× （320×320 地图上 640 步 vs. 102,400 步）。
 */
function getFullPath(world: WorldState, fromTileId: string, toTileId: string): string[] {
  if (fromTileId === toTileId) return []

  // 优先使用 HPA* 层级 A* 寻路
  try {
    const result = hpaStarFindPath(world, fromTileId, toTileId)
    if (result.found && result.tileIds.length > 1) {
      // hpaStar 返回含起点的路径，去掉起点以匹配原始接口
      return result.tileIds.slice(1)
    }
  } catch {
    // HPA* 失败时降级到贪心
  }

  // 贪心降级：坐标下降法（原始实现）
  const toTile = getTileByIdFast(world, toTileId)
  if (!toTile) return []

  const tx = toTile.x
  const ty = toTile.y
  const path: string[] = []
  const visited = new Set<string>([fromTileId])
  let curId = fromTileId

  const mapW = world.map.width ?? 320
  const mapH = Math.ceil(world.map.tiles.length / mapW)
  const maxIter = (mapW + mapH) * 2 + 50

  for (let i = 0; i < maxIter; i++) {
    if (curId === toTileId) return path

    const neighbors = world.map.connections[curId] ?? []
    let bestId: string | null = null
    let bestDist = Infinity

    for (const nId of neighbors) {
      if (visited.has(nId)) continue
      const nTile = getTileByIdFast(world, nId)
      if (!nTile) continue
      const dist = Math.abs(nTile.x - tx) + Math.abs(nTile.y - ty)
      if (dist < bestDist) {
        bestDist = dist
        bestId = nId
      }
    }

    if (!bestId) {
      const fallback = neighbors.find(n => !visited.has(n))
      if (!fallback) break
      bestId = fallback
    }

    visited.add(bestId)
    path.push(bestId)
    curId = bestId
  }

  return path
}

export function resolveMovementGeographyFeedback(
  world: WorldState,
  unitId: string,
  targetTileId: string,
  action: ActionType = 'march',
): MovementGeographyFeedback | null {
  const unit = getUnitById(world, unitId)
  const toTile = getTileById(world, targetTileId)
  if (!unit || !toTile) {
    return null
  }
  const fromTile = getTileById(world, unit.tileId)
  if (!fromTile) {
    return null
  }
  return resolveMovementGeographyFeedbackForTiles(world, unit, fromTile, toTile, action)
}

function resolveMovementGeographyFeedbackForTiles(
  world: WorldState,
  unit: Unit,
  fromTile: Tile,
  toTile: Tile,
  action: ActionType,
): MovementGeographyFeedback {
  const base = {
    schemaVersion: 'movement_geography_feedback_v0_1' as const,
    from: buildMovementGeographyTileRef(fromTile),
    to: buildMovementGeographyTileRef(toTile),
    seaRouteAuthorityBoundary: 'land_movement_only_sea_route_authority_is_independent' as const,
  }

  const physicallyAdjacent = Math.abs(fromTile.x - toTile.x) + Math.abs(fromTile.y - toTile.y) === 1
  const connectedByMovementGraph = world.map.connections[fromTile.id]?.includes(toTile.id) ?? false
  if (!physicallyAdjacent && !connectedByMovementGraph) {
    return {
      ...base,
      ok: false,
      outcome: 'blocked',
      code: 'not_adjacent',
      playerSummary: `${unit.name} 只能向相邻地块行军；${toTile.name} 不在当前可达相邻格。`,
      blockedReason: `${unit.name} 只能向相邻地块行军。`,
    }
  }

  if (fromTile.district && toTile.district && fromTile.district !== toTile.district) {
    if (toTile.type === 'pass') {
      return {
        ...base,
        ok: true,
        outcome: 'allowed',
        code: 'state_boundary_pass_allowed',
        playerSummary: `${toTile.name} 是州界关口，可作为跨州通道进入。`,
        blockedReason: null,
        requiredPass: {
          kind: 'pass',
          id: toTile.id,
          label: toTile.name,
        },
      }
    }
    if (fromTile.type === 'pass' && fromTile.owner === unit.faction) {
      return {
        ...base,
        ok: true,
        outcome: 'allowed',
        code: 'state_boundary_pass_allowed',
        playerSummary: `已控制 ${fromTile.name}，允许从关口向 ${toTile.name} 跨州推进。`,
        blockedReason: null,
        requiredPass: {
          kind: 'pass',
          id: fromTile.id,
          label: fromTile.name,
        },
      }
    }
    const requiredPass = fromTile.type === 'pass' ? fromTile : findNearestStrategicNode(world, fromTile, toTile, 'pass')
    if (fromTile.type === 'pass') {
      return {
        ...base,
        ok: false,
        outcome: 'blocked',
        code: 'cross_state_blocked_requires_pass',
        playerSummary: `关口 ${fromTile.name} 未被我方控制，不能继续跨州推进到 ${toTile.name}。`,
        blockedReason: `关口 ${fromTile.name} 未被我方控制，无法向 ${toTile.name} 推进。`,
        requiredPass: {
          kind: 'pass',
          id: fromTile.id,
          label: fromTile.name,
        },
      }
    }
    return {
      ...base,
      ok: false,
      outcome: 'blocked',
      code: 'cross_state_blocked_requires_pass',
      playerSummary: `${fromTile.name} 到 ${toTile.name} 跨州，需先走州界关口。`,
      blockedReason: `跨州推进需先攻占关口，无法直接进入 ${toTile.name}。`,
      requiredPass: {
        kind: 'pass',
        id: requiredPass?.id,
        label: requiredPass?.name ?? '州界关口',
      },
    }
  }

  if (toTile.terrain === 'mountain' && toTile.type !== 'pass' && action !== 'recon') {
    const requiredPass = findNearestStrategicNode(world, fromTile, toTile, 'pass')
    return {
      ...base,
      ok: false,
      outcome: 'blocked',
      code: 'mountain_blocked_requires_pass',
      playerSummary: `${toTile.name} 是山地阻隔，非关口不能大规模通行。`,
      blockedReason: `${toTile.name} 为险峻山地，必须通过关口才能大规模通行。`,
      requiredPass: {
        kind: 'pass',
        id: requiredPass?.id,
        label: requiredPass?.name ?? '附近关口',
      },
    }
  }

  const crossingRiverBand = fromTile.terrain !== 'riverland' && toTile.terrain === 'riverland'
  if (crossingRiverBand && toTile.type !== 'pass' && toTile.type !== 'city' && toTile.type !== 'dock') {
    const requiredDock = findNearestStrategicNode(world, fromTile, toTile, 'dock')
    return {
      ...base,
      ok: false,
      outcome: 'blocked',
      code: 'river_blocked_requires_dock',
      playerSummary: `${toTile.name} 是河流阻隔带，需先控制渡口/码头。`,
      blockedReason: `${toTile.name} 位于河流阻隔带，需先控制渡口/码头、城池或关口后再推进。`,
      requiredDock: {
        kind: 'dock',
        id: requiredDock?.id,
        label: requiredDock?.name ?? '附近渡口/码头',
      },
    }
  }

  if (crossingRiverBand && toTile.type === 'dock') {
    return {
      ...base,
      ok: true,
      outcome: 'allowed',
      code: 'river_crossing_dock_allowed',
      playerSummary: `${toTile.name} 是渡口/码头，可解释本次河流带通行。`,
      blockedReason: null,
      requiredDock: {
        kind: 'dock',
        id: toTile.id,
        label: toTile.name,
      },
    }
  }

  return {
    ...base,
    ok: true,
    outcome: 'allowed',
    code: 'same_state_adjacent_allowed',
    playerSummary: `${fromTile.name} 到 ${toTile.name} 为同州相邻地块，可直接行军。`,
    blockedReason: null,
  }
}

function buildMovementGeographyTileRef(tile: Tile): MovementGeographyFeedback['from'] {
  return {
    tileId: tile.id,
    name: tile.name,
    district: tile.district,
    terrain: tile.terrain,
    type: tile.type,
  }
}

function findNearestStrategicNode(
  world: WorldState,
  fromTile: Tile,
  toTile: Tile,
  type: 'pass' | 'dock',
): Tile | undefined {
  const sameDistricts = new Set([fromTile.district, toTile.district].filter((district): district is string => !!district))
  return world.map.tiles
    .filter((tile) => tile.type === type && (!tile.district || sameDistricts.size === 0 || sameDistricts.has(tile.district)))
    .sort((a, b) => {
      const aScore = Math.abs(a.x - fromTile.x) + Math.abs(a.y - fromTile.y) + Math.abs(a.x - toTile.x) + Math.abs(a.y - toTile.y)
      const bScore = Math.abs(b.x - fromTile.x) + Math.abs(b.y - fromTile.y) + Math.abs(b.x - toTile.x) + Math.abs(b.y - toTile.y)
      return aScore - bScore
    })[0]
}

function getEntryBlockReason(world: WorldState, unit: Unit, tile: Tile, action: ActionType) {
  const movementGeographyFeedback = resolveMovementGeographyFeedback(world, unit.id, tile.id, action)
  if (movementGeographyFeedback && !movementGeographyFeedback.ok && movementGeographyFeedback.blockedReason) {
    return movementGeographyFeedback.blockedReason
  }

  const currentTile = getTileById(world, unit.tileId)
  const passControlBlockReason = resolvePassControlBlockReason(unit, currentTile, tile)
  if (passControlBlockReason) {
    return passControlBlockReason
  }

  const terrainConstraintBlockReason = resolveTerrainConstraintBlockReason(currentTile, tile, action)
  if (terrainConstraintBlockReason) {
    return terrainConstraintBlockReason
  }

  if (action === 'support' && tile.owner !== 'neutral' && tile.owner !== unit.faction) {
    return `${tile.name} 为对立势力地块，支援命令不能直接进入。`
  }

  if (
    action === 'support' &&
    world.units.some((candidate) => candidate.faction !== unit.faction && candidate.tileId === tile.id)
  ) {
    return `${tile.name} 存在对立单位，支援命令不能直接进入。`
  }

  // ── 外交停战协议约束：不能进攻有停战/同盟协议的势力领土 ──
  if (tile.owner !== 'neutral' && tile.owner !== unit.faction) {
    if (hasCeasefireOrAlliance(world, unit.faction, tile.owner)) {
      if (action === 'capture' || action === 'march') {
        return `与 ${tile.owner} 存在停战协议，不能对其发起进攻行动。违约需先废除协议。`
      }
    }
  }

  return null
}

function resolvePassControlBlockReason(unit: Unit, fromTile: Tile | undefined, toTile: Tile) {
  if (!fromTile?.district || !toTile.district || fromTile.district === toTile.district) {
    return null
  }

  if (toTile.type === 'pass') {
    return null
  }

  if (fromTile.type !== 'pass') {
    return `跨州推进需先攻占关口，无法直接进入 ${toTile.name}。`
  }

  if (fromTile.owner !== unit.faction) {
    return `关口 ${fromTile.name} 未被我方控制，无法向 ${toTile.name} 推进。`
  }

  return null
}

function resolveTerrainConstraintBlockReason(
  fromTile: Tile | undefined,
  toTile: Tile,
  action: ActionType,
) {
  if (!fromTile) {
    return null
  }

  if (toTile.terrain === 'mountain' && toTile.type !== 'pass' && action !== 'recon') {
    return `${toTile.name} 为险峻山地，必须通过关口才能大规模通行。`
  }

  const crossingRiverBand = fromTile.terrain !== 'riverland' && toTile.terrain === 'riverland'
  if (crossingRiverBand && toTile.type !== 'pass' && toTile.type !== 'city' && toTile.type !== 'dock') {
    return `${toTile.name} 位于河流阻隔带，需先控制渡口/码头、城池或关口后再推进。`
  }

  return null
}

function resolveMarchResourceCost(fromTile: Tile | undefined, toTile: Tile) {
  let actionPoints = toTile.moveCost
  let food = 1

  if (toTile.terrain === 'mountain') {
    actionPoints += 1
    food += 1
  }

  const crossingRiverBand = fromTile?.terrain !== 'riverland' && toTile.terrain === 'riverland'
  if (crossingRiverBand) {
    actionPoints += 1
    food += 1
  }

  if (toTile.type === 'pass') {
    actionPoints += 1
  }

  return {
    actionPoints,
    food,
  }
}

type ResourceGuardBattleResolution = {
  outcome: 'win' | 'loss'
  attackerLoss: number
  defenderLoss: number
  attackerStrengthBefore: number
  attackerStrengthAfter: number
  attackerSupplyBefore: number
  attackerSupplyAfter: number
  guardStrengthBefore: number
  guardStrengthAfter: number
  summary: string
  rounds: BattleReportRoundDetail[]
}

type PvPTileOccupyBattleResolution = {
  outcome: 'win' | 'loss' | 'draw'
  reportKind: 'field_battle'
  attackerLoss: number
  defenderLoss: number
  attackerStrengthBefore: number
  attackerStrengthAfter: number
  attackerSupplyBefore: number
  attackerSupplyAfter: number
  defenderStrengthBefore: number
  defenderStrengthAfter: number
  defenderUnitIds: string[]
  summary: string
  rounds: BattleReportRoundDetail[]
}

function buildBattleTimeLabel(world: WorldState) {
  return `第 ${world.tick} 回合`
}

function buildBattleLocationLabel(tile: Tile) {
  return `${tile.name} (${tile.x},${tile.y})`
}

function resolveBattleRegionMeta(world: WorldState, tileId: string): { id: string; label: string } {
  const region = world.map.regions.find((candidate) => candidate.tileIds.includes(tileId))
  if (!region) {
    return {
      id: 'unknown_region',
      label: 'unknown_region',
    }
  }
  return {
    id: region.id,
    label: region.name || region.id,
  }
}

function toBattleReportResult(outcome: BattleOutcomeRecord['outcome']): NonNullable<BattleOutcomeRecord['result']> {
  if (outcome === 'win') {
    return '胜'
  }
  if (outcome === 'loss') {
    return '败'
  }
  return '平'
}

function resolveHeroStarCountFromQuality(quality: Unit['hero']['quality']) {
  if (quality === '4-SR') {
    return 5
  }
  const [qualityTierRaw] = quality.split('-', 1)
  const qualityTier = Number.parseInt(qualityTierRaw ?? '', 10)
  if (!Number.isFinite(qualityTier)) {
    return 1
  }
  return Math.max(1, Math.min(5, qualityTier))
}

type CoHeroProfile = NonNullable<Unit['coHeroes']>[number]

type BattleReportTroopSnapshot = {
  currentTroops: number
  maxTroops: number
  lossTroops: number
}

function normalizeBattleReportTroopSnapshot(currentTroops: number, maxTroops: number): BattleReportTroopSnapshot {
  const normalizedMax = Math.max(0, Math.round(maxTroops))
  const normalizedCurrent = Math.max(0, Math.min(normalizedMax, Math.round(currentTroops)))
  return {
    currentTroops: normalizedCurrent,
    maxTroops: normalizedMax,
    lossTroops: Math.max(0, normalizedMax - normalizedCurrent),
  }
}

function splitInteger(total: number, count: number): number[] {
  if (count <= 0) {
    return []
  }
  const normalizedTotal = Math.max(0, Math.round(total))
  const base = Math.floor(normalizedTotal / count)
  let remainder = normalizedTotal - base * count
  return Array.from({ length: count }, () => {
    const value = base + (remainder > 0 ? 1 : 0)
    remainder = Math.max(0, remainder - 1)
    return value
  })
}

function splitLossByCapacity(totalLoss: number, capacities: number[]): number[] {
  const normalizedLoss = Math.max(0, Math.min(Math.round(totalLoss), capacities.reduce((sum, value) => sum + Math.max(0, value), 0)))
  if (capacities.length === 0) {
    return []
  }
  const totalCapacity = capacities.reduce((sum, value) => sum + Math.max(0, value), 0)
  if (totalCapacity <= 0 || normalizedLoss <= 0) {
    return capacities.map(() => 0)
  }
  const losses = capacities.map((capacity) => {
    const safeCapacity = Math.max(0, capacity)
    return Math.min(safeCapacity, Math.floor((normalizedLoss * safeCapacity) / totalCapacity))
  })
  let remainder = normalizedLoss - losses.reduce((sum, value) => sum + value, 0)
  while (remainder > 0) {
    let changed = false
    for (let index = 0; index < losses.length && remainder > 0; index += 1) {
      const capacity = Math.max(0, capacities[index] ?? 0)
      if (losses[index] >= capacity) {
        continue
      }
      losses[index] += 1
      remainder -= 1
      changed = true
    }
    if (!changed) {
      break
    }
  }
  return losses
}

function splitTroopSnapshotAcrossHeroSlots(snapshot: BattleReportTroopSnapshot, slotCount: number): BattleReportTroopSnapshot[] {
  const maxParts = splitInteger(snapshot.maxTroops, slotCount)
  const lossParts = splitLossByCapacity(snapshot.lossTroops, maxParts)
  return maxParts.map((maxTroops, index) => normalizeBattleReportTroopSnapshot(maxTroops - (lossParts[index] ?? 0), maxTroops))
}

function buildBattleReportUnitSnapshots(
  units: Unit[],
  totalBefore: number,
  totalAfter: number,
): BattleReportTroopSnapshot[] {
  if (units.length === 0) {
    return []
  }
  if (units.length === 1) {
    return [normalizeBattleReportTroopSnapshot(totalAfter, totalBefore)]
  }
  const safeBefore = Math.max(0, Math.round(totalBefore))
  const safeAfter = Math.max(0, Math.min(safeBefore, Math.round(totalAfter)))
  const totalLoss = Math.max(0, safeBefore - safeAfter)
  const unitStrengths = units.map((unit) => Math.max(0, Math.round(unit.strength)))
  const strengthSum = unitStrengths.reduce((sum, value) => sum + value, 0)
  if (strengthSum === safeBefore) {
    const lossParts = splitLossByCapacity(totalLoss, unitStrengths)
    return unitStrengths.map((maxTroops, index) =>
      normalizeBattleReportTroopSnapshot(maxTroops - (lossParts[index] ?? 0), maxTroops),
    )
  }
  if (strengthSum === safeAfter) {
    const lossParts = splitLossByCapacity(totalLoss, unitStrengths)
    return unitStrengths.map((currentTroops, index) =>
      normalizeBattleReportTroopSnapshot(currentTroops, currentTroops + (lossParts[index] ?? 0)),
    )
  }
  const maxParts = splitInteger(safeBefore, units.length)
  const lossParts = splitLossByCapacity(totalLoss, maxParts)
  return maxParts.map((maxTroops, index) => normalizeBattleReportTroopSnapshot(maxTroops - (lossParts[index] ?? 0), maxTroops))
}

function buildBattleReportHeroSlotFromUnit(
  unit: Unit,
  troopSnapshot: BattleReportTroopSnapshot = normalizeBattleReportTroopSnapshot(unit.strength, unit.strength),
): BattleReportHeroSlotReadModel {
  const mainSkillName = unit.hero.signatureSkill?.name
  return {
    heroId: unit.hero.id,
    name: unit.hero.name,
    level: unit.hero.level,
    quality: unit.hero.quality,
    starCount: resolveHeroStarCountFromQuality(unit.hero.quality),
    faction: unit.hero.faction,
    factionLabel: unit.hero.faction,
    cardType: unit.hero.cardType,
    portraitKey: unit.hero.portraitKey,
    avatarKey: unit.hero.avatarKey,
    portraitAssetKey: unit.hero.portraitKey,
    mainSkillName,
    signatureSkillName: mainSkillName,
    currentTroops: troopSnapshot.currentTroops,
    maxTroops: troopSnapshot.maxTroops,
    lossTroops: troopSnapshot.lossTroops,
  }
}

function buildBattleReportHeroSlotFromCoHero(
  coHero: CoHeroProfile,
  troopSnapshot: BattleReportTroopSnapshot = normalizeBattleReportTroopSnapshot(0, 0),
): BattleReportHeroSlotReadModel {
  const mainSkillName = coHero.signatureSkill?.name
  return {
    heroId: coHero.id,
    name: coHero.name,
    level: coHero.level,
    quality: coHero.quality,
    starCount: resolveHeroStarCountFromQuality(coHero.quality),
    faction: coHero.faction,
    factionLabel: coHero.faction,
    cardType: coHero.cardType,
    portraitKey: coHero.portraitKey,
    avatarKey: coHero.avatarKey,
    portraitAssetKey: coHero.portraitKey,
    mainSkillName,
    signatureSkillName: mainSkillName,
    currentTroops: troopSnapshot.currentTroops,
    maxTroops: troopSnapshot.maxTroops,
    lossTroops: troopSnapshot.lossTroops,
  }
}

function buildBattleReportUnitFromUnit(
  unit: Unit,
  troopSnapshot: BattleReportTroopSnapshot = normalizeBattleReportTroopSnapshot(unit.strength, unit.strength),
): BattleReportUnitReadModel {
  const coHeroes = unit.coHeroes ?? []
  const slotSnapshots = splitTroopSnapshotAcrossHeroSlots(troopSnapshot, 1 + coHeroes.length)
  return {
    unitId: unit.id,
    name: unit.name,
    currentTroops: troopSnapshot.currentTroops,
    maxTroops: troopSnapshot.maxTroops,
    lossTroops: troopSnapshot.lossTroops,
    hero: buildBattleReportHeroSlotFromUnit(unit, slotSnapshots[0] ?? troopSnapshot),
    coHeroes: coHeroes.map((coHero, index) =>
      buildBattleReportHeroSlotFromCoHero(coHero, slotSnapshots[index + 1] ?? normalizeBattleReportTroopSnapshot(0, 0)),
    ),
  }
}

function buildBattleReadModelFields(params: {
  world: WorldState
  tile: Tile
  reportKind: NonNullable<BattleOutcomeRecord['reportKind']>
  outcome: BattleOutcomeRecord['outcome']
  attackerName: string
  defenderName: string
  attackerStrengthBefore: number
  attackerStrengthAfter: number
  defenderStrengthBefore: number
  defenderStrengthAfter: number
  rounds: BattleReportRoundDetail[]
  attackerUnit?: Unit
  defenderUnit?: Unit
  attackerUnits?: Unit[]
  defenderUnits?: Unit[]
}): Pick<
  BattleOutcomeRecord,
  | 'reportKind'
  | 'region'
  | 'result'
  | 'time'
  | 'location'
  | 'tileX'
  | 'tileY'
  | 'attacker'
  | 'defender'
  | 'attackerTroops'
  | 'attackerMaxTroops'
  | 'defenderTroops'
  | 'defenderMaxTroops'
  | 'attackerStrengthBefore'
  | 'attackerStrengthAfter'
  | 'defenderStrengthBefore'
  | 'defenderStrengthAfter'
  | 'rounds'
  | 'attackerHeroSlot'
  | 'defenderHeroSlot'
  | 'attackerUnit'
  | 'defenderUnit'
  | 'attackerUnits'
  | 'defenderUnits'
  | 'ownerFactionId'
  | 'attackerFactionId'
  | 'defenderFactionId'
  | 'aiPlayerId'
  | 'attackerAiPlayerId'
  | 'defenderAiPlayerId'
  | 'organizationId'
  | 'organizationName'
  | 'organizationKind'
> {
  const attackerSourceUnits = params.attackerUnits ?? (params.attackerUnit ? [params.attackerUnit] : [])
  const defenderSourceUnits = params.defenderUnits ?? (params.defenderUnit ? [params.defenderUnit] : [])
  const attackerUnitSnapshots = buildBattleReportUnitSnapshots(
    attackerSourceUnits,
    params.attackerStrengthBefore,
    params.attackerStrengthAfter,
  )
  const defenderUnitSnapshots = buildBattleReportUnitSnapshots(
    defenderSourceUnits,
    params.defenderStrengthBefore,
    params.defenderStrengthAfter,
  )
  const attackerUnits = attackerSourceUnits.map((unit, index) =>
    buildBattleReportUnitFromUnit(unit, attackerUnitSnapshots[index] ?? normalizeBattleReportTroopSnapshot(unit.strength, unit.strength)),
  )
  const defenderUnits = defenderSourceUnits.map((unit, index) =>
    buildBattleReportUnitFromUnit(unit, defenderUnitSnapshots[index] ?? normalizeBattleReportTroopSnapshot(unit.strength, unit.strength)),
  )
  const attackerUnit = attackerUnits[0]
  const defenderUnit = defenderUnits[0]
  const regionMeta = resolveBattleRegionMeta(params.world, params.tile.id)
  const attackerFactionId =
    params.attackerUnit?.faction ??
    params.attackerUnits?.[0]?.faction
  const defenderFactionId =
    params.defenderUnit?.faction ??
    params.defenderUnits?.[0]?.faction
  const attackerAiPlayerId =
    params.attackerUnit?.aiPlayerId ??
    params.attackerUnits?.[0]?.aiPlayerId
  const defenderAiPlayerId =
    params.defenderUnit?.aiPlayerId ??
    params.defenderUnits?.[0]?.aiPlayerId
  const factionState = attackerFactionId ? params.world.factions[attackerFactionId] : undefined
  const organizationId = factionState?.organizationId?.trim()
  const organizationName = factionState?.organizationName?.trim()

  return {
    reportKind: params.reportKind,
    region: regionMeta.label,
    result: toBattleReportResult(params.outcome),
    time: buildBattleTimeLabel(params.world),
    location: buildBattleLocationLabel(params.tile),
    tileX: params.tile.x,
    tileY: params.tile.y,
    attacker: params.attackerName,
    defender: params.defenderName,
    attackerTroops: params.attackerStrengthAfter,
    attackerMaxTroops: params.attackerStrengthBefore,
    defenderTroops: params.defenderStrengthAfter,
    defenderMaxTroops: params.defenderStrengthBefore,
    attackerStrengthBefore: params.attackerStrengthBefore,
    attackerStrengthAfter: params.attackerStrengthAfter,
    defenderStrengthBefore: params.defenderStrengthBefore,
    defenderStrengthAfter: params.defenderStrengthAfter,
    rounds: params.rounds,
    attackerHeroSlot: attackerUnit?.hero,
    defenderHeroSlot: defenderUnit?.hero,
    attackerUnit,
    defenderUnit,
    attackerUnits: attackerUnits.length > 0 ? attackerUnits : undefined,
    defenderUnits: defenderUnits.length > 0 ? defenderUnits : undefined,
    ownerFactionId: attackerFactionId,
    attackerFactionId,
    defenderFactionId,
    aiPlayerId: attackerAiPlayerId,
    attackerAiPlayerId,
    defenderAiPlayerId,
    organizationId: organizationId && organizationId.length > 0 ? organizationId : undefined,
    organizationName: organizationName && organizationName.length > 0 ? organizationName : undefined,
    organizationKind: factionState?.organizationKind,
  }
}

function buildResourceGuardRoundDetails(params: {
  attacker: Unit
  tile: Tile
  template: ResourceGuardTemplate
  guardUnitTemplates: NpcGuardUnitTemplate[]
  outcome: ResourceGuardBattleResolution['outcome']
  attackerLoss: number
  defenderLoss: number
  attackerStrengthBefore: number
  attackerStrengthAfter: number
  guardStrengthBefore: number
  guardStrengthAfter: number
  summary: string
}): BattleReportRoundDetail[] {
  const mainSkillNames = params.guardUnitTemplates.map((unitTemplate) => unitTemplate.mainSkill.name)
  const ordinarySkillNames = Array.from(new Set(
    params.guardUnitTemplates
      .flatMap((unitTemplate) => resolveNpcGuardOrdinarySkills(unitTemplate))
      .map((skill) => skill.name),
  ))
  const guardSkillNotes = [...mainSkillNames, ...ordinarySkillNames].filter((name) => name.trim().length > 0)
  const attackerSkillName = params.attacker.hero.signatureSkill?.name ?? '主将突击'
  const guardSkillName = mainSkillNames[0] ?? '守军战法'

  return [
    {
      round: 1,
      title: `第1回合 ${params.template.label}守军交战`,
      summary: `${params.summary} 守军战法：${guardSkillNotes.join('、') || '常规压制'}。`,
      events: [
        {
          actor: 'defender',
          skillName: guardSkillName,
          activated: true,
          damage: params.attackerLoss,
          summary: `${params.template.label}以守军战法压制${params.attacker.name}，造成 ${params.attackerLoss} 兵力损失。`,
          notes: guardSkillNotes.slice(0, 6),
        },
        {
          actor: 'attacker',
          skillName: attackerSkillName,
          activated: true,
          damage: params.defenderLoss,
          summary: `${params.attacker.name}反击${params.tile.name}守军，守军兵力 ${params.guardStrengthBefore} -> ${params.guardStrengthAfter}。`,
        },
        {
          actor: 'system',
          summary: params.outcome === 'win'
            ? `${params.attacker.name}击破资源地守军，战后兵力 ${params.attackerStrengthAfter}。`
            : `${params.attacker.name}攻地受阻，战后兵力 ${params.attackerStrengthAfter}。`,
        },
      ],
    },
  ]
}

function buildTacticalDuelRoundDetails(report: TacticalDuelReport): BattleReportRoundDetail[] {
  const roundsByNumber = new Map<number, TacticalSkillEvent[]>()
  for (const event of report.events.slice(0, 18)) {
    const events = roundsByNumber.get(event.round) ?? []
    events.push(event)
    roundsByNumber.set(event.round, events)
  }

  const roundNumbers = Array.from(roundsByNumber.keys()).sort((left, right) => left - right)
  if (roundNumbers.length === 0) {
    return [
      {
        round: report.round,
        title: `第${report.round}回合 战法结算`,
        summary: formatTacticalDuelSummary(report),
        events: [
          {
            actor: 'system',
            summary: formatTacticalDuelSummary(report),
          },
        ],
      },
    ]
  }

  return roundNumbers.map((roundNumber) => {
    const events = roundsByNumber.get(roundNumber) ?? []
    const skillSummaries = events
      .filter((event) => event.skillId !== 'normal_attack')
      .map(formatTacticalSkillEvent)
    return {
      round: roundNumber,
      title: `第${roundNumber}回合 战法交锋`,
      summary: skillSummaries.length > 0
        ? `战法事件：${skillSummaries.join('；')}`
        : `第${roundNumber}回合普通攻击结算。`,
      events: events.map((event) => ({
        actor: event.actorHeroId === report.attacker.heroId
          ? 'attacker'
          : event.actorHeroId === report.defender.heroId
            ? 'defender'
            : 'system',
        skillName: event.skillName,
        activated: event.activated,
        damage: event.damage,
        healing: event.healing,
        preventedDamage: event.preventedDamage,
        notes: event.notes,
        summary: formatTacticalSkillEvent(event),
      })),
    }
  })
}

function buildFieldBattleRoundDetails(params: {
  attackerName: string
  defenderName: string
  attackerWon: boolean
  attackerLoss: number
  defenderLoss: number
  message: string
}): BattleReportRoundDetail[] {
  return [
    {
      round: 1,
      title: '第1回合 接敌结算',
      summary: params.message,
      events: [
        {
          actor: params.attackerWon ? 'attacker' : 'defender',
          skillName: '兵种与地形结算',
          activated: true,
          damage: params.attackerWon ? params.defenderLoss : params.attackerLoss,
          summary: params.attackerWon
            ? `${params.attackerName}突破${params.defenderName}，造成 ${params.defenderLoss} 兵力损失。`
            : `${params.defenderName}守住阵地，造成 ${params.attackerLoss} 兵力损失。`,
        },
        {
          actor: 'system',
          summary: params.message,
        },
      ],
    },
  ]
}

function resolveResourceGuardBattle(
  world: WorldState,
  attacker: Unit,
  tile: Tile,
  template: ResourceGuardTemplate,
): ResourceGuardBattleResolution {
  const guardUnits = buildNpcGuardUnitsForResourceTile(tile)
  const guardUnitTemplates = template.unitTemplateIds
    .map((unitTemplateId) => NPC_GUARD_UNIT_TEMPLATES[unitTemplateId] ?? null)
    .filter((unitTemplate): unitTemplate is NpcGuardUnitTemplate => Boolean(unitTemplate))
  const attackerStrengthBefore = attacker.strength
  const attackerSupplyBefore = attacker.supply
  const guardStrengthBefore = guardUnits.reduce((sum, guardUnit) => sum + guardUnit.strength, 0)
  const attackerPower = computeResourceGuardAttackerPower(attacker)
  const guardPower = guardUnitTemplates.reduce((sum, unitTemplate) => sum + computeNpcGuardUnitPower(unitTemplate), 0)
  const attackerWon = attackerPower >= guardPower * 0.92
  const attackerLoss = clampValue(
    Math.round((guardPower / (attackerWon ? 18 : 12)) * (1 - (attacker.hero.intelligence - 50) * 0.003)),
    Math.max(2, template.resourceLevel + 1),
    14 + template.resourceLevel * 5,
  )
  const defenderLoss = attackerWon
    ? guardStrengthBefore
    : clampValue(Math.round(attackerPower / 16), template.resourceLevel * 2, Math.max(template.resourceLevel * 8, 10))
  const attackerStrengthAfter = Math.max(8, attackerStrengthBefore - attackerLoss)
  const guardStrengthAfter = Math.max(0, guardStrengthBefore - defenderLoss)
  const outcome: ResourceGuardBattleResolution['outcome'] = attackerWon ? 'win' : 'loss'
  const guardSummary = summarizeResourceGuardTemplate(template)
  const summary = attackerWon
    ? `${attacker.name} 击破 ${template.label}（${guardSummary}），兵力 ${attackerStrengthBefore} -> ${attackerStrengthAfter}。`
    : `${attacker.name} 受阻于 ${template.label}（${guardSummary}），兵力 ${attackerStrengthBefore} -> ${attackerStrengthAfter}。`
  const rounds = buildResourceGuardRoundDetails({
    attacker,
    tile,
    template,
    guardUnitTemplates,
    outcome,
    attackerLoss,
    defenderLoss,
    attackerStrengthBefore,
    attackerStrengthAfter,
    guardStrengthBefore,
    guardStrengthAfter,
    summary,
  })

  attacker.strength = attackerStrengthAfter
  attacker.supply = Math.max(0, attacker.supply - 1)
  const attackerSupplyAfter = attacker.supply
  attacker.corps.readiness = Math.max(0, attacker.corps.readiness - 15)
  attacker.currentTask = attackerWon ? `击破${tile.name}守军` : `攻打${tile.name}受阻`

  recordBattleOutcome(world, {
    id: `resource_guard_${world.tick}_${attacker.id}_${tile.id}`,
    tick: world.tick,
    regionId: getRegionIdForTile(world, tile.id),
    tileId: tile.id,
    attackerFaction: attacker.faction,
    attackerUnitId: attacker.id,
    outcome,
    attackerLoss,
    defenderLoss,
    alliedSupport: 0,
    summary,
    ...buildBattleReadModelFields({
      world,
      tile,
      reportKind: 'resource_guard',
      outcome,
      attackerName: attacker.name,
      defenderName: template.label,
      attackerStrengthBefore,
      attackerStrengthAfter,
      defenderStrengthBefore: guardStrengthBefore,
      defenderStrengthAfter: guardStrengthAfter,
      rounds,
      attackerUnit: attacker,
      defenderUnits: guardUnits,
    }),
  })

  return {
    outcome,
    attackerLoss,
    defenderLoss,
    attackerStrengthBefore,
    attackerStrengthAfter,
    attackerSupplyBefore,
    attackerSupplyAfter,
    guardStrengthBefore,
    guardStrengthAfter,
    summary,
    rounds,
  }
}

function resolveOccupyTilePvpBattle(
  world: WorldState,
  attacker: Unit,
  tile: Tile,
  hostileDefenders: Unit[],
): PvPTileOccupyBattleResolution {
  const representativeTacticalEncounter = resolveRepresentativeTacticalEncounter(world, attacker, hostileDefenders, tile)
  if (representativeTacticalEncounter) {
    return resolveOccupyTileTacticalPvpBattle(world, attacker, tile, hostileDefenders, representativeTacticalEncounter)
  }

  return resolveOccupyTileFieldPvpBattle(world, attacker, tile, hostileDefenders)
}

function resolveOccupyTileTacticalPvpBattle(
  world: WorldState,
  attacker: Unit,
  tile: Tile,
  hostileDefenders: Unit[],
  representativeTacticalEncounter: RepresentativeTacticalEncounter,
): PvPTileOccupyBattleResolution {
  const { defender, report } = representativeTacticalEncounter
  const allianceSupport = getAllianceSupportModifier(world, tile.id, attacker.faction)
  const attackerStrengthBefore = attacker.strength
  const attackerSupplyBefore = attacker.supply
  const defenderStrengthBefore = defender.strength
  const attackerStrengthAfter = toWorldStrength(report.attacker.strengthAfter)
  const defenderStrengthAfter = toWorldStrength(report.defender.strengthAfter)
  const attackerLoss = Math.max(0, attackerStrengthBefore - attackerStrengthAfter)
  const defenderLoss = Math.max(0, defenderStrengthBefore - defenderStrengthAfter)
  const destroyedDefenderNames: string[] = []
  const retreatedDefenderNames: string[] = []

  attacker.strength = attackerStrengthAfter
  attacker.supply = Math.max(0, attacker.supply - 1)
  const attackerSupplyAfter = attacker.supply
  attacker.corps.readiness = Math.max(0, attacker.corps.readiness - 20)

  defender.strength = defenderStrengthAfter
  defender.supply = Math.max(0, defender.supply - 1)
  defender.corps.readiness = Math.max(0, defender.corps.readiness - 20)

  if (report.winner === 'attacker') {
    if (defender.strength <= 12) {
      destroyedDefenderNames.push(defender.name)
      removeUnit(world, defender.id)
    } else {
      const retreatTileId = findRetreatTile(world, defender, tile.id, tile.id)
      if (!retreatTileId) {
        destroyedDefenderNames.push(defender.name)
        removeUnit(world, defender.id)
      } else {
        defender.tileId = retreatTileId
        defender.status = '待命'
        defender.currentTask = `从${tile.name}撤退`
        retreatedDefenderNames.push(`${defender.name}→${getTileById(world, retreatTileId)?.name ?? retreatTileId}`)
      }
    }
    tile.enemyPressure = Math.max(0, tile.enemyPressure - 2)
    attacker.currentTask = `突破${tile.name}`
  } else {
    if (defender.strength <= 0) {
      destroyedDefenderNames.push(defender.name)
      removeUnit(world, defender.id)
    } else {
      defender.status = '驻防中'
      defender.currentTask = `坚守${tile.name}`
    }

    if (attacker.strength <= 0) {
      removeUnit(world, attacker.id)
    } else {
      const retreatTileId = findRetreatTile(world, attacker, tile.id, tile.id)
      if (retreatTileId) {
        attacker.tileId = retreatTileId
      }
      attacker.status = '待命'
      attacker.currentTask = report.winner === 'draw' ? `自${tile.name}战平撤回` : `自${tile.name}撤回`
    }
    tile.enemyPressure = Math.min(6, tile.enemyPressure + 1)
  }

  const tacticalSummary = formatTacticalDuelSummary(report)
  const message = report.winner === 'attacker'
    ? `${attacker.name} 在 ${tile.name} PvP接敌后以战法公式取胜，损失 ${attackerLoss} 战力。${formatDefenderOutcome(destroyedDefenderNames, retreatedDefenderNames)} ${tacticalSummary}`
    : report.winner === 'draw'
      ? `${attacker.name} 在 ${tile.name} PvP接敌战平，损失 ${attackerLoss} 战力。${tacticalSummary}`
      : `${attacker.name} 在 ${tile.name} PvP接敌失利，损失 ${attackerLoss} 战力。${tacticalSummary}`
  const outcome: BattleOutcomeRecord['outcome'] = report.winner === 'attacker' ? 'win' : report.winner === 'draw' ? 'draw' : 'loss'
  const tacticalRounds = buildTacticalDuelRoundDetails(report)

  recordBattleOutcome(world, {
    id: `pvp_occupy_${world.tick}_${attacker.id}_${tile.id}`,
    tick: world.tick,
    regionId: getRegionIdForTile(world, tile.id),
    tileId: tile.id,
    attackerFaction: attacker.faction,
    attackerUnitId: attacker.id,
    outcome,
    attackerLoss,
    defenderLoss,
    alliedSupport: allianceSupport,
    summary: message,
    ...buildBattleReadModelFields({
      world,
      tile,
      reportKind: 'field_battle',
      outcome,
      attackerName: attacker.name,
      defenderName: defender.name,
      attackerStrengthBefore,
      attackerStrengthAfter,
      defenderStrengthBefore,
      defenderStrengthAfter,
      rounds: tacticalRounds,
      attackerUnit: attacker,
      defenderUnit: defender,
    }),
  })

  prependReport(
    world,
    world.tick,
    outcome === 'win' ? 'PvP占地战法取胜' : outcome === 'draw' ? 'PvP占地战法平局' : 'PvP占地战法失利',
    message,
  )

  return {
    outcome,
    reportKind: 'field_battle',
    attackerLoss,
    defenderLoss,
    attackerStrengthBefore,
    attackerStrengthAfter,
    attackerSupplyBefore,
    attackerSupplyAfter,
    defenderStrengthBefore,
    defenderStrengthAfter,
    defenderUnitIds: hostileDefenders.map((unit) => unit.id),
    summary: message,
    rounds: tacticalRounds,
  }
}

function resolveOccupyTileFieldPvpBattle(
  world: WorldState,
  attacker: Unit,
  tile: Tile,
  hostileDefenders: Unit[],
): PvPTileOccupyBattleResolution {
  const allianceSupport = getAllianceSupportModifier(world, tile.id, attacker.faction)
  const attackerStrengthBefore = attacker.strength
  const attackerSupplyBefore = attacker.supply
  const defenderStrengthBefore = hostileDefenders.reduce((sum, defender) => sum + defender.strength, 0)
  const attackerForceBonus = 1 + (attacker.hero.force - 60) * 0.005
  const attackerCommandBonus = 1 + (attacker.hero.command - 60) * 0.004
  const attackerSpeedBonus = 1 + (attacker.hero.speed - 60) * 0.006
  const coHeroBonus = (attacker.coHeroes ?? []).reduce((sum, co) => {
    const cof = 1 + (co.force - 60) * 0.005
    const coc = 1 + (co.command - 60) * 0.004
    return sum + attacker.strength * 0.30 * coc * cof
  }, 0)
  const troopCounterBonus = computeTroopCounter(attacker.hero.cardType, getDominantCardType(hostileDefenders))
  const attackerReadinessMod = attacker.corps.readiness < 40 ? 0.80 : 1.0
  const attackerPower =
    attacker.strength * (0.74 + attacker.supply * 0.05) * attackerCommandBonus * attackerForceBonus
    + attacker.mobility * 4 * attackerSpeedBonus
    + allianceSupport
    + coHeroBonus
  const attackerEffectivePower = attackerPower * (1 + troopCounterBonus) * attackerReadinessMod
  const defenderPower =
    hostileDefenders.reduce(
      (sum, defender) => {
        const dForceBonus = 1 + (defender.hero.force - 60) * 0.005
        const dCommandBonus = 1 + (defender.hero.command - 60) * 0.004
        const dSpeedBonus = 1 + (defender.hero.speed - 60) * 0.006
        const dReadinessMod = defender.corps.readiness < 40 ? 0.80 : 1.0
        return sum
          + (defender.strength * (0.74 + defender.supply * 0.04) * dCommandBonus * dForceBonus
          + defender.mobility * 3 * dSpeedBonus) * dReadinessMod
      },
      0,
    ) * terrainDefenseFactor(tile) * getLuoyangDefenseBonus(tile)
  const attackerWon = attackerEffectivePower >= defenderPower * 0.92
  const attackerIntelReduction = 1 - (attacker.hero.intelligence - 60) * 0.005
  const attackerLoss = clampValue(
    Math.round(((attackerWon ? defenderPower / 14 : defenderPower / 9) / Math.max(1, hostileDefenders.length)) * attackerIntelReduction),
    8,
    26,
  )
  const defenderLossPool = clampValue(
    Math.round(attackerWon ? attackerEffectivePower / 8 : attackerEffectivePower / 14),
    10,
    42,
  )

  attacker.strength = Math.max(8, attacker.strength - attackerLoss)
  attacker.supply = Math.max(0, attacker.supply - 1)
  const attackerSupplyAfter = attacker.supply
  attacker.corps.readiness = Math.max(0, attacker.corps.readiness - 20)

  const destroyedDefenderNames: string[] = []
  const retreatedDefenderNames: string[] = []
  for (const defender of hostileDefenders) {
    const dIntelReduction = 1 - (defender.hero.intelligence - 60) * 0.005
    const defenderLoss = clampValue(
      Math.round((defenderLossPool / Math.max(1, hostileDefenders.length)) * dIntelReduction),
      6,
      26,
    )
    defender.strength = Math.max(0, defender.strength - defenderLoss)
    defender.supply = Math.max(0, defender.supply - 1)
    defender.corps.readiness = Math.max(0, defender.corps.readiness - 20)

    if (attackerWon) {
      if (defender.strength <= 12) {
        destroyedDefenderNames.push(defender.name)
        removeUnit(world, defender.id)
        continue
      }

      const retreatTileId = findRetreatTile(world, defender, tile.id, tile.id)
      if (!retreatTileId) {
        destroyedDefenderNames.push(defender.name)
        removeUnit(world, defender.id)
        continue
      }

      defender.tileId = retreatTileId
      defender.status = '待命'
      defender.currentTask = `从${tile.name}撤退`
      retreatedDefenderNames.push(`${defender.name}→${getTileById(world, retreatTileId)?.name ?? retreatTileId}`)
    } else {
      defender.status = '驻防中'
      defender.currentTask = `坚守${tile.name}`
    }
  }

  if (attackerWon) {
    tile.enemyPressure = Math.max(0, tile.enemyPressure - 2)
    attacker.currentTask = `突破${tile.name}`
  } else {
    const retreatTileId = findRetreatTile(world, attacker, tile.id, tile.id)
    if (retreatTileId) {
      attacker.tileId = retreatTileId
    }
    attacker.status = '待命'
    attacker.currentTask = `自${tile.name}撤回`
    tile.enemyPressure = Math.min(6, tile.enemyPressure + 1)
  }

  const defenderStrengthAfter = hostileDefenders.reduce((sum, defender) => sum + defender.strength, 0)
  const defenderLoss = Math.max(0, defenderStrengthBefore - defenderStrengthAfter)
  const defenderName = hostileDefenders.map((defender) => defender.name).join('、') || '防守方'
  const outcome: BattleOutcomeRecord['outcome'] = attackerWon ? 'win' : 'loss'
  const message = attackerWon
    ? `${attacker.name} 在 ${tile.name} PvP接敌后取胜，损失 ${attackerLoss} 战力。${formatDefenderOutcome(destroyedDefenderNames, retreatedDefenderNames)}`
    : `${attacker.name} 在 ${tile.name} PvP接敌失利，损失 ${attackerLoss} 战力。`
  const fieldBattleRounds = buildFieldBattleRoundDetails({
    attackerName: attacker.name,
    defenderName,
    attackerWon,
    attackerLoss,
    defenderLoss,
    message,
  })

  recordBattleOutcome(world, {
    id: `pvp_occupy_${world.tick}_${attacker.id}_${tile.id}`,
    tick: world.tick,
    regionId: getRegionIdForTile(world, tile.id),
    tileId: tile.id,
    attackerFaction: attacker.faction,
    attackerUnitId: attacker.id,
    outcome,
    attackerLoss,
    defenderLoss,
    alliedSupport: allianceSupport,
    summary: message,
    ...buildBattleReadModelFields({
      world,
      tile,
      reportKind: 'field_battle',
      outcome,
      attackerName: attacker.name,
      defenderName,
      attackerStrengthBefore,
      attackerStrengthAfter: attacker.strength,
      defenderStrengthBefore,
      defenderStrengthAfter,
      rounds: fieldBattleRounds,
      attackerUnit: attacker,
      defenderUnits: hostileDefenders,
    }),
  })

  prependReport(world, world.tick, attackerWon ? 'PvP占地接敌取胜' : 'PvP占地接敌失利', message)

  return {
    outcome,
    reportKind: 'field_battle',
    attackerLoss,
    defenderLoss,
    attackerStrengthBefore,
    attackerStrengthAfter: attacker.strength,
    attackerSupplyBefore,
    attackerSupplyAfter,
    defenderStrengthBefore,
    defenderStrengthAfter,
    defenderUnitIds: hostileDefenders.map((unit) => unit.id),
    summary: message,
    rounds: fieldBattleRounds,
  }
}

function computeResourceGuardAttackerPower(attacker: Unit) {
  const forceBonus = 1 + (attacker.hero.force - 50) * 0.005
  const commandBonus = 1 + (attacker.hero.command - 50) * 0.004
  const speedBonus = 1 + (attacker.hero.speed - 50) * 0.002
  const coHeroBonus = (attacker.coHeroes ?? []).reduce((sum, coHero) => {
    const coForceBonus = 1 + (coHero.force - 50) * 0.004
    const coCommandBonus = 1 + (coHero.command - 50) * 0.003
    return sum + attacker.strength * 0.18 * coForceBonus * coCommandBonus
  }, 0)
  return attacker.strength * (0.72 + attacker.supply * 0.05) * forceBonus * commandBonus
    + attacker.mobility * 3 * speedBonus
    + coHeroBonus
}

function computeNpcGuardUnitPower(unitTemplate: NpcGuardUnitTemplate) {
  const ordinarySkillPower = resolveNpcGuardOrdinarySkills(unitTemplate)
    .reduce((sum, skill) => sum + skill.power, 0)
  const statModifier =
    1
    + (unitTemplate.force - 50) * 0.003
    + (unitTemplate.command - 50) * 0.003
    + (unitTemplate.speed - 50) * 0.0015
  return unitTemplate.strength * (0.55 + unitTemplate.supply * 0.035 + unitTemplate.level * 0.006) * statModifier
    + unitTemplate.mobility * 1.5
    + unitTemplate.mainSkill.power
    + ordinarySkillPower
}

function resolveRepresentativeTacticalEncounter(
  world: WorldState,
  attacker: Unit,
  hostileDefenders: Unit[],
  tile: Tile,
): RepresentativeTacticalEncounter | null {
  if (hostileDefenders.length !== 1) {
    return null
  }

  const attackerCombatant = buildRepresentativeTacticalCombatant(world, attacker)
  if (!attackerCombatant) {
    return null
  }

  const defender = hostileDefenders[0]
  const defenderCombatant = buildRepresentativeTacticalCombatant(world, defender)
  if (!defenderCombatant) {
    return null
  }

  return {
    defender,
    report: resolveRepresentativeTacticalDuel({
      round: 1,
      maxRounds: 8,
      seed: buildRepresentativeTacticalEncounterSeed(world, attacker, defender, tile),
      attacker: attackerCombatant,
      defender: defenderCombatant,
    }),
  }
}

function buildRepresentativeTacticalCombatant(world: WorldState, unit: Unit): TacticalCombatant | null {
  const heroId = resolveRepresentativeHeroId(unit)
  if (!heroId) {
    return null
  }

  const loadout = resolveUnitTacticalSkillSlotState(world, unit, heroId)
  if (!loadout) {
    return null
  }

  return {
    heroId,
    heroName: unit.hero.name,
    troopType: normalizeTacticalTroopType(unit.hero.troopType),
    stats: {
      force: unit.hero.force,
      command: unit.hero.command,
      intelligence: unit.hero.intelligence,
      charisma: unit.hero.charisma,
      speed: unit.hero.speed,
    },
    strength: Math.max(1, Math.round(unit.strength * WORLD_TACTICAL_STRENGTH_SCALE)),
    mobility: unit.mobility,
    supply: unit.supply,
    innateSkillId: loadout.innateSkillId,
    equippedSkillIds: [...loadout.equippedSkillIds],
  }
}

function resolveRepresentativeHeroId(unit: Unit) {
  const rawHeroId = unit.hero.id.startsWith('hero_') ? unit.hero.id.slice('hero_'.length) : unit.hero.id
  return rawHeroId.trim() || null
}

function resolveUnitTacticalSkillSlotState(
  world: WorldState,
  unit: Unit,
  normalizedHeroId: string,
): RepresentativeTacticalLoadout | null {
  const slotsByHeroId = world.slgDomainState?.generalStateByFaction?.[unit.faction]?.tacticalSkillSlotsByHeroId
  const rawSlot = slotsByHeroId?.[normalizedHeroId] ?? slotsByHeroId?.[unit.hero.id]
  if (!rawSlot) {
    return null
  }

  const equippedSkillIds = rawSlot.equippedSkillIds.filter((skillId) => skillId.trim().length > 0)
  if (equippedSkillIds.length > 2) {
    return null
  }

  return {
    innateSkillId: rawSlot.innateSkillId,
    equippedSkillIds,
  }
}

function normalizeTacticalTroopType(troopType: Unit['hero']['troopType']): TacticalTroopType {
  return troopType
}

function buildRepresentativeTacticalEncounterSeed(
  world: WorldState,
  attacker: Unit,
  defender: Unit,
  tile: Tile,
) {
  return `world_encounter:${world.tick}:${attacker.id}:${defender.id}:${tile.id}`
}

function toWorldStrength(tacticalStrength: number) {
  if (tacticalStrength <= 0) {
    return 0
  }
  return Math.max(1, Math.ceil(tacticalStrength / WORLD_TACTICAL_STRENGTH_SCALE))
}

function formatTacticalDuelSummary(report: TacticalDuelReport) {
  const outcomeLabel =
    report.winner === 'attacker'
      ? '攻击方胜'
      : report.winner === 'defender'
        ? '防守方胜'
        : '平局'
  const eventSummary = report.events
    .filter((event) => event.skillId !== 'normal_attack')
    .slice(0, 8)
    .map(formatTacticalSkillEvent)
    .join('；')

  return [
    `战法公式 ${report.attacker.heroName}[${report.attacker.innateSkillId}+${report.attacker.equippedSkillIds.join('/')}]`,
    `对 ${report.defender.heroName}[${report.defender.innateSkillId}+${report.defender.equippedSkillIds.join('/')}]`,
    `第${report.round}/${report.maxRounds}回合${outcomeLabel}(${report.outcomeReason})`,
    eventSummary ? `战法事件：${eventSummary}` : undefined,
  ].filter((part): part is string => Boolean(part)).join('，')
}

function formatTacticalSkillEvent(event: TacticalSkillEvent) {
  if (event.phase === 'battle_start') {
    return `${event.skillName}生效${event.notes.length > 0 ? `(${event.notes.join('/')})` : ''}`
  }

  const rollText =
    event.activationRoll !== undefined && event.activationRate !== undefined
      ? `(${event.activationRoll}/${event.activationRate})`
      : ''
  if (!event.activated) {
    return `${event.skillName}未发动${rollText}`
  }

  const damageText = event.damage !== undefined ? `伤害${event.damage}` : '生效'
  const preventedText = event.preventedDamage ? `规避${event.preventedDamage}` : ''
  return `${event.skillName}${rollText}${damageText}${preventedText ? `/${preventedText}` : ''}`
}

function resolveBattleAtTile(
  world: WorldState,
  attacker: Unit,
  tile: Tile,
  originTileId: string,
  highlights: ReplayHighlight[],
) {
  const defenders = world.units.filter(
    (candidate) => candidate.faction !== attacker.faction && candidate.tileId === tile.id,
  )

  if (defenders.length === 0) {
    return null
  }

  // 外交协议检查：如果所有防守方都与攻击方有停战/同盟协议，跳过战斗
  const hostileDefenders = defenders.filter(
    d => !hasCeasefireOrAlliance(world, attacker.faction, d.faction),
  )
  if (hostileDefenders.length === 0) {
    return null
  }

  attacker.status = '交战中'
  const allianceSupport = getAllianceSupportModifier(world, tile.id, attacker.faction)
  const representativeTacticalEncounter = resolveRepresentativeTacticalEncounter(world, attacker, hostileDefenders, tile)
  if (representativeTacticalEncounter) {
    const { defender, report } = representativeTacticalEncounter
    const attackerStrengthBefore = attacker.strength
    const defenderStrengthBefore = defender.strength
    const attackerStrengthAfter = toWorldStrength(report.attacker.strengthAfter)
    const defenderStrengthAfter = toWorldStrength(report.defender.strengthAfter)
    const attackerLoss = Math.max(0, attackerStrengthBefore - attackerStrengthAfter)
    const defenderLoss = Math.max(0, defenderStrengthBefore - defenderStrengthAfter)
    const destroyedDefenderNames: string[] = []
    const retreatedDefenderNames: string[] = []

    attacker.strength = attackerStrengthAfter
    attacker.supply = Math.max(0, attacker.supply - 1)
    attacker.corps.readiness = Math.max(0, attacker.corps.readiness - 20)

    defender.strength = defenderStrengthAfter
    defender.supply = Math.max(0, defender.supply - 1)
    defender.corps.readiness = Math.max(0, defender.corps.readiness - 20)

    if (report.winner === 'attacker') {
      if (defender.strength <= 12) {
        destroyedDefenderNames.push(defender.name)
        removeUnit(world, defender.id)
      } else {
        const retreatTileId = findRetreatTile(world, defender, tile.id, originTileId)
        if (!retreatTileId) {
          destroyedDefenderNames.push(defender.name)
          removeUnit(world, defender.id)
        } else {
          defender.tileId = retreatTileId
          defender.status = '待命'
          defender.currentTask = `从${tile.name}撤退`
          retreatedDefenderNames.push(`${defender.name}→${getTileById(world, retreatTileId)?.name ?? retreatTileId}`)
        }
      }
      tile.enemyPressure = Math.max(0, tile.enemyPressure - 2)
      attacker.currentTask = `突破${tile.name}`
    } else {
      if (defender.strength <= 0) {
        destroyedDefenderNames.push(defender.name)
        removeUnit(world, defender.id)
      } else {
        defender.status = '驻防中'
        defender.currentTask = `坚守${tile.name}`
      }
      if (attacker.strength > 0) {
        attacker.tileId = originTileId
        attacker.status = '待命'
        attacker.currentTask = report.winner === 'draw' ? `自${tile.name}战平撤回` : `自${tile.name}撤回`
      }
      tile.enemyPressure = Math.min(6, tile.enemyPressure + 1)
      if (attacker.strength <= 0) {
        removeUnit(world, attacker.id)
      }
    }

    const tacticalSummary = formatTacticalDuelSummary(report)
    const message = report.winner === 'attacker'
      ? `${attacker.name} 在 ${tile.name} 接敌后以战法公式取胜，损失 ${attackerLoss} 战力。${formatDefenderOutcome(destroyedDefenderNames, retreatedDefenderNames)} ${tacticalSummary}`
      : report.winner === 'draw'
        ? `${attacker.name} 在 ${tile.name} 与 ${defender.name} 战至第 ${report.round} 回合未分胜负，损失 ${attackerLoss} 战力后撤回 ${getTileById(world, originTileId)?.name ?? originTileId}。${tacticalSummary}`
        : `${attacker.name} 在 ${tile.name} 接敌失利，损失 ${attackerLoss} 战力后撤回 ${getTileById(world, originTileId)?.name ?? originTileId}。${tacticalSummary}`
    const title = report.winner === 'attacker'
      ? '前线战法接敌取胜'
      : report.winner === 'draw'
        ? '前线战法接敌平局'
        : '前线战法接敌失利'
    const outcome = report.winner === 'attacker' ? 'win' : report.winner === 'draw' ? 'draw' : 'loss'
    const tacticalRounds = buildTacticalDuelRoundDetails(report)

    recordBattleOutcome(world, {
      id: `battle_${world.tick}_${attacker.id}_${tile.id}`,
      tick: world.tick,
      regionId: getRegionIdForTile(world, tile.id),
      tileId: tile.id,
      attackerFaction: attacker.faction,
      attackerUnitId: attacker.id,
      outcome,
      attackerLoss,
      defenderLoss,
      alliedSupport: allianceSupport,
      summary: message,
      ...buildBattleReadModelFields({
        world,
        tile,
        reportKind: 'field_battle',
        outcome,
        attackerName: attacker.name,
        defenderName: defender.name,
        attackerStrengthBefore,
        attackerStrengthAfter,
        defenderStrengthBefore,
        defenderStrengthAfter,
        rounds: tacticalRounds,
        attackerUnit: attacker,
        defenderUnit: defender,
      }),
    })

    prependReport(world, world.tick, title, message)
    highlights.push(
      createEngageReplayHighlight(
        world.tick,
        'battle',
        report.winner === 'attacker' ? 'high' : 'medium',
        report.winner === 'attacker' ? `战法突破 ${tile.name}` : `${tile.name} 战法接敌受阻`,
        message,
        {
          unitId: attacker.id,
          tileId: tile.id,
          fromTileId: originTileId,
          toTileId: tile.id,
          factionId: attacker.faction,
        },
      ),
    )

    return message
  }

  // 武将五维属性加成（force/command/intelligence/charisma/speed 标准值 60，范围 40-98）
  // force（武力）: 直接伤害加成
  const attackerForceBonus = 1 + (attacker.hero.force - 60) * 0.005
  // command（统率）: 提升兵力发挥效率
  const attackerCommandBonus = 1 + (attacker.hero.command - 60) * 0.004
  // speed（机动）: 提升机动力贡献
  const attackerSpeedBonus = 1 + (attacker.hero.speed - 60) * 0.006

  // coHeroes 副英雄战力加成：三武将编队每位副将贡献 30% 战力
  // 让 coHeroes 数据结构真正发挥作用，SSR 编队 vs 单将有明显差距
  const coHeroBonus = (attacker.coHeroes ?? []).reduce((sum, co) => {
    const cof = 1 + (co.force - 60) * 0.005
    const coc = 1 + (co.command - 60) * 0.004
    return sum + attacker.strength * 0.30 * coc * cof
  }, 0)

  // 兵种克制三角：使用 hero.cardType ('步'|'骑'|'弓')
  // 弓克骑(+20%)，骑克步(+15%)，步克弓(+10%)
  const dominantDefenderType = getDominantCardType(hostileDefenders)
  const troopCounterBonus = computeTroopCounter(attacker.hero.cardType, dominantDefenderType)

  // 画集疲劳修正： readiness < 40 时战斗力 -20%
  const attackerReadinessMod = attacker.corps.readiness < 40 ? 0.80 : 1.0

  const attackerPower =
    attacker.strength * (0.74 + attacker.supply * 0.05) * attackerCommandBonus * attackerForceBonus
    + attacker.mobility * 4 * attackerSpeedBonus
    + allianceSupport
    + coHeroBonus

  const attackerEffectivePower = attackerPower * (1 + troopCounterBonus) * attackerReadinessMod

  const defenderPower =
    hostileDefenders.reduce(
      (sum, defender) => {
        const dForceBonus = 1 + (defender.hero.force - 60) * 0.005
        const dCommandBonus = 1 + (defender.hero.command - 60) * 0.004
        const dSpeedBonus = 1 + (defender.hero.speed - 60) * 0.006
        // 防守方疲劳修正
        const dReadinessMod = defender.corps.readiness < 40 ? 0.80 : 1.0
        return sum
          + (defender.strength * (0.74 + defender.supply * 0.04) * dCommandBonus * dForceBonus
          + defender.mobility * 3 * dSpeedBonus) * dReadinessMod
      },
      0,
    ) * terrainDefenseFactor(tile) * getLuoyangDefenseBonus(tile)
  const defenderStrengthBefore = hostileDefenders.reduce((sum, defender) => sum + defender.strength, 0)
  const attackerWon = attackerEffectivePower >= defenderPower * 0.92

  // intelligence（智谋）: 减少己方损失（标准值 60 = 无加减）
  const attackerIntelReduction = 1 - (attacker.hero.intelligence - 60) * 0.005

  const attackerLoss = clampValue(
    Math.round(((attackerWon ? defenderPower / 14 : defenderPower / 9) / Math.max(1, defenders.length)) * attackerIntelReduction),
    8,
    26,
  )
  const defenderLossPool = clampValue(
    Math.round(attackerWon ? attackerEffectivePower / 8 : attackerEffectivePower / 14),
    10,
    42,
  )

  attacker.strength = Math.max(8, attacker.strength - attackerLoss)
  attacker.supply = Math.max(0, attacker.supply - 1)
  // 战斗消耗战备度（连续作战需要轮换休整）
  attacker.corps.readiness = Math.max(0, attacker.corps.readiness - 20)

  const destroyedDefenderNames: string[] = []
  const retreatedDefenderNames: string[] = []
  for (const defender of hostileDefenders) {
    const dIntelReduction = 1 - (defender.hero.intelligence - 60) * 0.005
    const defenderLoss = clampValue(Math.round((defenderLossPool / defenders.length) * dIntelReduction), 6, 26)
    defender.strength = Math.max(0, defender.strength - defenderLoss)
    defender.supply = Math.max(0, defender.supply - 1)
    defender.corps.readiness = Math.max(0, defender.corps.readiness - 20)  // 防守方战斗消耗战备度

    if (attackerWon) {
      if (defender.strength <= 12) {
        destroyedDefenderNames.push(defender.name)
        removeUnit(world, defender.id)
        continue
      }

      const retreatTileId = findRetreatTile(world, defender, tile.id, originTileId)
      if (!retreatTileId) {
        destroyedDefenderNames.push(defender.name)
        removeUnit(world, defender.id)
        continue
      }

      defender.tileId = retreatTileId
      defender.status = '待命'
      defender.currentTask = `从${tile.name}撤退`
      retreatedDefenderNames.push(`${defender.name}→${getTileById(world, retreatTileId)?.name ?? retreatTileId}`)
    } else {
      defender.status = '驻防中'
      defender.currentTask = `坚守${tile.name}`
    }
  }

  if (attackerWon) {
    tile.enemyPressure = Math.max(0, tile.enemyPressure - 2)
    attacker.currentTask = `突破${tile.name}`
  } else {
    attacker.tileId = originTileId
    attacker.status = '待命'
    attacker.currentTask = `自${tile.name}撤回`
    tile.enemyPressure = Math.min(6, tile.enemyPressure + 1)
  }

  const message = attackerWon
    ? `${attacker.name} 在 ${tile.name} 接敌后取胜，损失 ${attackerLoss} 战力。${formatDefenderOutcome(destroyedDefenderNames, retreatedDefenderNames)}`
    : `${attacker.name} 在 ${tile.name} 接敌失利，损失 ${attackerLoss} 战力后撤回 ${getTileById(world, originTileId)?.name ?? originTileId}。`
  const defenderStrengthAfter = defenders.reduce((sum, defender) => sum + defender.strength, 0)
  const defenderLoss = Math.max(0, defenderStrengthBefore - defenderStrengthAfter)
  const defenderName = hostileDefenders.map((defender) => defender.name).join('、') || '防守方'
  const outcome: BattleOutcomeRecord['outcome'] = attackerWon ? 'win' : 'loss'
  const fieldBattleRounds = buildFieldBattleRoundDetails({
    attackerName: attacker.name,
    defenderName,
    attackerWon,
    attackerLoss,
    defenderLoss,
    message,
  })

  recordBattleOutcome(world, {
    id: `battle_${world.tick}_${attacker.id}_${tile.id}`,
    tick: world.tick,
    regionId: getRegionIdForTile(world, tile.id),
    tileId: tile.id,
    attackerFaction: attacker.faction,
    attackerUnitId: attacker.id,
    outcome,
    attackerLoss,
    defenderLoss,
    alliedSupport: allianceSupport,
    summary: message,
    ...buildBattleReadModelFields({
      world,
      tile,
      reportKind: 'field_battle',
      outcome,
      attackerName: attacker.name,
      defenderName,
      attackerStrengthBefore: attacker.strength + attackerLoss,
      attackerStrengthAfter: attacker.strength,
      defenderStrengthBefore,
      defenderStrengthAfter,
      rounds: fieldBattleRounds,
      attackerUnit: attacker,
      defenderUnits: hostileDefenders,
    }),
  })

  prependReport(world, world.tick, attackerWon ? '前线接敌取胜' : '前线接敌失利', message)
  highlights.push(
    createEngageReplayHighlight(
      world.tick,
      'battle',
      attackerWon ? 'high' : 'medium',
      attackerWon ? `突破 ${tile.name}` : `${tile.name} 受阻`,
      message,
      {
        unitId: attacker.id,
        tileId: tile.id,
        fromTileId: originTileId,
        toTileId: tile.id,
        factionId: attacker.faction,
      },
    ),
  )

  return message
}

function getAllianceSupportModifier(world: WorldState, tileId: string, faction: Unit['faction']) {
  // 联盟指令仅作用于当前主指挥势力（默认按 world.factions 首位）
  if (faction === resolveFallbackFactionId(world)) {
    const region = world.map.regions.find((candidate) => candidate.tileIds.includes(tileId))
    if (!region) {
      return 0
    }

    const directive = world.alliance.directives[region.id]
    if (!directive) {
      return 0
    }

    const stanceFactor =
      directive.stance === 'support'
        ? 1
        : directive.stance === 'harass'
          ? 0.65
          : directive.stance === 'expand'
            ? 0.8
            : 0.45

    return Math.round((directive.supportLevel / 10) * stanceFactor)
  }

  // B5修复: AI 势力通过 diplomacyAgreements 获取联盟军事支援加成
  if (!world.feedback.diplomacyAgreements?.length) return 0

  const alliedFactions = world.feedback.diplomacyAgreements
    .filter(a => a.type === 'alliance' && a.duration > 0 && a.parties.includes(faction))
    .flatMap(a => a.parties.filter(p => p !== faction))

  if (alliedFactions.length === 0) return 0

  // 搜索战场附近（2格内）的盟友单位并计算支援加成
  const nearbyTileIds = new Set<string>([tileId])
  for (const nId of world.map.connections[tileId] ?? []) {
    nearbyTileIds.add(nId)
    for (const n2Id of world.map.connections[nId] ?? []) {
      nearbyTileIds.add(n2Id)
    }
  }

  let support = 0
  for (const unit of world.units) {
    if (alliedFactions.includes(unit.faction) && nearbyTileIds.has(unit.tileId)) {
      support += Math.round(unit.strength * 0.12)
    }
  }
  return Math.min(support, 25) // 上限 25，避免联盟助攻压倒战斗本体
}

/** 计算防守方中兵力占比最高的 cardType（用于兵种克制判断） */
function getDominantCardType(units: Unit[]): string | null {
  const totals: Record<string, number> = {}
  for (const u of units) {
    const ct = u.hero.cardType ?? ''
    if (!ct) continue
    totals[ct] = (totals[ct] ?? 0) + u.strength
  }
  let best: string | null = null
  let bestVal = 0
  for (const [ct, val] of Object.entries(totals)) {
    if (val > bestVal) { best = ct; bestVal = val }
  }
  return best
}

/** 兵种克制加成（攻击方 cardType vs 防守方主力 cardType）
 *  弓(弓)克骑(骑) +20%，骑(骑)克步(步) +15%，步(步)克弓(弓) +10% */
function computeTroopCounter(attackerType: string | undefined, defenderType: string | null): number {
  if (!attackerType || !defenderType) return 0
  if (attackerType === '弓' && defenderType === '骑') return 0.20
  if (attackerType === '骑' && defenderType === '步') return 0.15
  if (attackerType === '步' && defenderType === '弓') return 0.10
  return 0
}

function abbreviateFactionId(factionId: string) {
  if (!factionId) {
    return 'UNK'
  }
  const compact = factionId.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '')
  if (!compact) {
    return 'UNK'
  }
  return compact.slice(0, 3).toUpperCase()
}

function terrainDefenseFactor(tile: Tile) {
  // 地块类型基础应定能
  let typeFactor: number
  switch (tile.type) {
    case 'pass':     typeFactor = 1.26; break
    case 'city':     typeFactor = 1.22; break
    case 'fog':      typeFactor = 1.14; break
    case 'resource': typeFactor = 1.08; break
    default:         typeFactor = 1.0;  break  // plain & unknown
  }

  // 地形层叠加成（与类型叠加，表现地形对防守的額外加成）
  let terrainFactor = 1.0
  switch (tile.terrain) {
    case 'forest':    terrainFactor = 1.15; break  // 森林掩议，骑兵奮进不便
    case 'highland':  terrainFactor = 1.20; break  // 高地偵隐，兑盘有利
    case 'mountain':  terrainFactor = 1.0;  break  // 山地尅5隅断，已由移动阅知处理
    default:          terrainFactor = 1.0;  break
  }

  return typeFactor * terrainFactor
}

function findRetreatTile(world: WorldState, unit: Unit, contestedTileId: string, blockedTileId: string) {
  return (world.map.connections[contestedTileId] ?? []).find((candidateTileId) => {
    if (candidateTileId === blockedTileId) {
      return false
    }

    const tile = getTileById(world, candidateTileId)
    if (!tile) {
      return false
    }

    const occupiedByEnemy = world.units.some(
      (candidate) => candidate.faction === unit.faction && candidate.tileId === candidateTileId,
    )

    return tile.owner === unit.faction || occupiedByEnemy
  })
}

function removeUnit(world: WorldState, unitId: string) {
  // 单位被消灭时仅移除场上部队实体。
  // 武将卡牌保留在 rosterHeroIds 中，可以重新征兵/升星召回（gacha 机制）。
  world.units = world.units.filter((unit) => unit.id !== unitId)
}

function formatDefenderOutcome(destroyedDefenderNames: string[], retreatedDefenderNames: string[]) {
  const parts: string[] = []

  if (destroyedDefenderNames.length > 0) {
    parts.push(`对立单位溃散 ${destroyedDefenderNames.join('、')}`)
  }

  if (retreatedDefenderNames.length > 0) {
    parts.push(`对立单位撤退 ${retreatedDefenderNames.join('；')}`)
  }

  return parts.join('，')
}

function recordBattleOutcome(world: WorldState, record: BattleOutcomeRecord) {
  const tile = getTileById(world, record.tileId)
  const regionMeta = resolveBattleRegionMeta(world, record.tileId)
  const enrichedRecord: BattleOutcomeRecord = {
    ...record,
    regionId: record.regionId || regionMeta.id,
    region: record.region || regionMeta.label,
    location: record.location || (tile ? buildBattleLocationLabel(tile) : undefined),
    tileX: record.tileX ?? tile?.x,
    tileY: record.tileY ?? tile?.y,
  }
  world.feedback.battleRecords = [enrichedRecord, ...world.feedback.battleRecords].slice(0, 500)
}

function syncTacticalOverrideStatus(
  world: WorldState,
  order: ExecutableOrder,
  status: TacticalOverride['status'],
  message: string,
) {
  if (!order.tacticalOverrideId) {
    return
  }

  const override = world.tacticalOverrides.find((item) => item.id === order.tacticalOverrideId)
  if (!override) {
    return
  }

  override.status = status
  override.completedTick = world.tick
  override.lastMessage = message
}

function getRegionIdForTile(world: WorldState, tileId: string) {
  return world.map.regions.find((region) => region.tileIds.includes(tileId))?.id ?? 'unknown_region'
}

function resolveCityUpgradeFootprintTileIds(
  world: WorldState,
  hallTile: Tile,
  nextFootprintTiles: CityFootprintTiles,
  existingTileIds: string[],
) {
  const tileByCoord = new Map(world.map.tiles.map((tile) => [`${tile.x},${tile.y}`, tile]))
  const sideLength = Math.round(Math.sqrt(nextFootprintTiles))
  const existingTileIdSet = new Set(existingTileIds)
  const halfSideLength = Math.floor(sideLength / 2)
  const candidateStarts = [
    { x: hallTile.x - halfSideLength, y: hallTile.y - halfSideLength },
    { x: hallTile.x - halfSideLength, y: hallTile.y - halfSideLength - 1 },
    { x: hallTile.x - halfSideLength - 1, y: hallTile.y - halfSideLength },
    { x: hallTile.x - halfSideLength - 1, y: hallTile.y - halfSideLength - 1 },
  ]

  let bestTileSet: Tile[] = []
  let bestScore = Number.NEGATIVE_INFINITY

  for (const start of candidateStarts) {
    const set: Tile[] = []
    let valid = true

    for (let localY = 0; localY < sideLength; localY += 1) {
      for (let localX = 0; localX < sideLength; localX += 1) {
        const tile = tileByCoord.get(`${start.x + localX},${start.y + localY}`)
        if (!tile) {
          valid = false
          break
        }
        set.push(tile)
      }

      if (!valid) {
        break
      }
    }

    if (!valid || set.length !== nextFootprintTiles) {
      continue
    }

    const overlapScore = set.reduce((score, tile) => score + (existingTileIdSet.has(tile.id) ? 1 : 0), 0)
    const distanceScore = set.reduce(
      (score, tile) => score - Math.abs(tile.x - hallTile.x) - Math.abs(tile.y - hallTile.y),
      0,
    )
    const score = overlapScore * 100 + distanceScore

    if (score > bestScore) {
      bestScore = score
      bestTileSet = set
    }
  }

  if (bestTileSet.length !== nextFootprintTiles) {
    return []
  }

  return bestTileSet
    .sort((left, right) => {
      if (left.y !== right.y) {
        return left.y - right.y
      }

      if (left.x !== right.x) {
        return left.x - right.x
      }

      return left.id.localeCompare(right.id)
    })
    .map((tile) => tile.id)
}

function resolveCityFootprintTier(footprintTiles: CityFootprintTiles) {
  if (footprintTiles === 9) {
    return 'city_3x3' as const
  }

  if (footprintTiles === 25) {
    return 'city_5x5' as const
  }

  if (footprintTiles === 49) {
    return 'city_7x7' as const
  }

  return 'city_9x9' as const
}

// Backward-compatible helper used by city upgrade actions.
function spendResources(world: WorldState, factionId: string, actionPoints: number, food: number) {
  return spendFactionResources(world, factionId, actionPoints, food)
}

function revealIntel(
  world: WorldState,
  tileId: string,
  level: IntelligenceLevel,
  summary: string,
  highlights: ReplayHighlight[],
  context?: {
    unitId?: string
    factionId?: FactionId
    fromTileId?: string
  },
) {
  const previousLevel = world.intel[tileId]?.level ?? 'unknown'
  world.intel[tileId] = {
    level,
    lastScoutedTick: world.tick,
    summary,
  }

  if (level !== previousLevel) {
    const tile = getTileById(world, tileId)
    highlights.push(
      createReplayHighlight(
        world.tick,
        'intel',
        level === 'confirmed' ? 'high' : 'medium',
        `侦察更新：${tile?.name ?? tileId}`,
        summary,
        {
          unitId: context?.unitId,
          tileId,
          fromTileId: context?.fromTileId,
          toTileId: tileId,
          factionId: context?.factionId,
        },
      ),
    )
  }
}

function prependReport(world: WorldState, tick: number, title: string, detail: string, id?: string) {
  world.reports.unshift({
    id: id ?? `${tick}-${title}-${detail}`,
    tick,
    title,
    detail,
  })
  world.reports = world.reports.slice(0, 12)
}

function bumpWorldVersion(world: WorldState) {
  world.worldVersion += 1
}

function upsertPlanningJobHistory(world: WorldState, entry: PlanningJobHistoryEntry) {
  const filtered = world.history.planningJobs.filter((item) => item.id !== entry.id)
  world.history.planningJobs = [entry, ...filtered].slice(0, 12)
}

function syncExecutionReplay(
  world: WorldState,
  factionId: string,
  label: string,
  overrideOutcome?: ExecutionReplayOutcome,
  forceFrame = false,
  highlights: ReplayHighlight[] = [],
) {
  const factionExec = getExecution(world, factionId)
  if (!factionExec) {
    return
  }

  const replay = ensureExecutionReplay(world, factionId)
  const derivedOutcome = overrideOutcome ?? deriveExecutionOutcome(factionExec)
  if (!forceFrame && replay.outcome !== 'running' && derivedOutcome !== 'running') {
    return
  }

  const frame = createExecutionReplayFrame(world, factionId, label, highlights)
  const lastFrame = replay.frames.at(-1)
  const shouldAppend =
    forceFrame ||
    !lastFrame ||
    lastFrame.tick !== frame.tick ||
    lastFrame.worldVersion !== frame.worldVersion ||
    lastFrame.label !== frame.label

  if (shouldAppend) {
    replay.frames.push(frame)
    replay.frames = replay.frames.slice(-12)
  }

  replay.outcome = derivedOutcome
  if (derivedOutcome !== 'running') {
    replay.completedTick = world.tick
    replay.completedWorldVersion = world.worldVersion
  }
}

function ensureExecutionReplay(world: WorldState, factionId: string): ExecutionReplay {
  const activeExecution = getExecution(world, factionId)
  if (!activeExecution) {
    throw new Error('No active execution to record.')
  }

  const existing = world.history.executionReplays.find(
    (entry) => entry.requestId === activeExecution.requestId,
  )
  if (existing) {
    return existing
  }

  const created: ExecutionReplay = {
    requestId: activeExecution.requestId,
    source: activeExecution.source,
    strategicCommand: activeExecution.strategicCommand,
    basedOnWorldVersion: activeExecution.basedOnWorldVersion,
    createdTick: world.tick,
    createdWorldVersion: world.worldVersion,
    reviewAtTick: activeExecution.reviewAtTick,
    plannerNote: activeExecution.plannerNote,
    plannerExplanation: activeExecution.plannerExplanation,
    planningRationale: activeExecution.planningRationale,
    plan: activeExecution.currentPlan,
    outcome: 'running',
    frames: [],
  }

  world.history.executionReplays = [created, ...world.history.executionReplays].slice(0, 8)
  return created
}

function createExecutionReplayFrame(
  world: WorldState,
  factionId: string,
  label: string,
  highlights: ReplayHighlight[],
): ExecutionReplayFrame {
  const execution = getExecution(world, factionId)
  if (!execution) {
    throw new Error('No execution available for replay frame.')
  }

  const orderStates: ReplayOrderSnapshot[] = execution.orders.map((order) => ({
    orderId: order.id,
    unitId: order.unitId,
    action: order.action,
    target: order.target,
    status: order.status,
    message: order.error ?? order.lastMessage ?? order.summary,
  }))

  return {
    tick: world.tick,
    worldVersion: world.worldVersion,
    label,
    frontlineSummary: summarizeFrontline(world, factionId),
    latestReports: world.reports.slice(0, 3).map((report) => `${report.title}：${report.detail}`),
    highlights,
    orderStates,
  }
}

function deriveExecutionOutcome(execution: PlanExecution | null): ExecutionReplayOutcome {
  if (!execution) {
    return 'cleared'
  }

  if (execution.orders.some((order) => order.status === 'queued' || order.status === 'running')) {
    return 'running'
  }

  if (execution.orders.some((order) => order.status === 'failed')) {
    return 'failed'
  }

  return 'completed'
}

type ReplayHighlightContext = {
  unitId?: string
  tileId?: string
  fromTileId?: string
  toTileId?: string
  factionId?: FactionId
}

type EngageReplayHighlightKind = 'battle' | 'tile_control' | 'logistics'

const ENGAGE_REPLAY_HIGHLIGHT_KIND_WHITELIST: ReadonlySet<EngageReplayHighlightKind> = new Set([
  'battle',
  'tile_control',
  'logistics',
])

const LOGGED_UNKNOWN_ENGAGE_REPLAY_KINDS = new Set<string>()

function createReplayHighlight(
  tick: number,
  kind: ReplayHighlight['kind'],
  severity: ReplayHighlight['severity'],
  title: string,
  detail: string,
  context?: ReplayHighlightContext,
): ReplayHighlight {
  const normalizedTileId = context?.tileId ?? context?.toTileId ?? context?.fromTileId
  const normalizedToTileId = context?.toTileId ?? normalizedTileId
  const idSuffix = context?.unitId ?? normalizedTileId ?? 'none'

  return {
    id: `${kind}_${tick}_${title}_${idSuffix}`,
    kind,
    severity,
    title,
    detail,
    unitId: context?.unitId,
    tileId: normalizedTileId,
    fromTileId: context?.fromTileId,
    toTileId: normalizedToTileId,
    factionId: context?.factionId,
  }
}

function normalizeEngageReplayHighlightKind(kind: string): {
  normalizedKind: EngageReplayHighlightKind
  downgradedFrom: string | null
} {
  if (ENGAGE_REPLAY_HIGHLIGHT_KIND_WHITELIST.has(kind as EngageReplayHighlightKind)) {
    return {
      normalizedKind: kind as EngageReplayHighlightKind,
      downgradedFrom: null,
    }
  }
  return {
    normalizedKind: 'tile_control',
    downgradedFrom: kind,
  }
}

function createEngageReplayHighlight(
  tick: number,
  kind: string,
  severity: ReplayHighlight['severity'],
  title: string,
  detail: string,
  context?: ReplayHighlightContext,
): ReplayHighlight {
  const { normalizedKind, downgradedFrom } = normalizeEngageReplayHighlightKind(kind)
  if (downgradedFrom !== null && !LOGGED_UNKNOWN_ENGAGE_REPLAY_KINDS.has(downgradedFrom)) {
    LOGGED_UNKNOWN_ENGAGE_REPLAY_KINDS.add(downgradedFrom)
    console.warn(
      `[replay-highlight] downgraded unknown engage kind "${downgradedFrom}" -> "${normalizedKind}"`,
    )
  }
  const normalizedDetail =
    downgradedFrom === null ? detail : `${detail} [engageKindDowngradedFrom=${downgradedFrom}]`
  return createReplayHighlight(tick, normalizedKind, severity, title, normalizedDetail, {
    unitId: context?.unitId,
    tileId: context?.tileId,
    fromTileId: context?.fromTileId,
    toTileId: context?.toTileId,
    factionId: context?.factionId,
  })
}

function tileControlSeverity(tileType: Tile['type']): ReplayHighlight['severity'] {
  if (tileType === 'pass' || tileType === 'city') {
    return 'high'
  }

  if (tileType === 'resource') {
    return 'medium'
  }

  return 'low'
}

function resolveAllianceSupportLevel(
  stance: WorldState['alliance']['directives'][string]['stance'],
  currentSupportLevel: number,
) {
  switch (stance) {
    case 'hold':
      return currentSupportLevel * 0.92
    case 'support':
      return currentSupportLevel + 8
    case 'harass':
      return currentSupportLevel + 4
    case 'expand':
      return currentSupportLevel + 6
  }
}

function clampValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export { actionLabel } from './ruleLabels'

