import type { ResourceKind, TileType } from '../contracts/game'
import {
  RESOURCE_TILE_ECONOMY_CONFIG_VERSION,
  RESOURCE_TILE_ECONOMY_LEVELS,
  getResourceTileEconomyConfig,
  listResourceTileEconomyConfigs,
  normalizeResourceTileEconomyLevel,
  normalizeResourceTileEconomyResourceKind,
} from './resourceTileEconomyConfig'
import { resolveResourceGuardTemplateForTile } from './resourceGuardTemplates'

export const RESOURCE_TILE_ECONOMY_MODEL_VERSION = RESOURCE_TILE_ECONOMY_CONFIG_VERSION

export type ResourceTileEconomyResourceKind = Extract<ResourceKind, 'food' | 'wood' | 'stone' | 'iron'>

export type ResourceTileEconomyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type ResourceTileEconomyRange = {
  min: number
  max: number
}

export type ResourceTileEconomyCaptureReward = {
  resourceKind: ResourceTileEconomyResourceKind
  amount: ResourceTileEconomyRange
  heroExp: number
  captureRewardUsesResourceLevel: true
}

export type ResourceTileOngoingYieldReadModel = {
  resourceEconomyModelVersion: string
  tileLevel: ResourceTileEconomyLevel
  resourceKind: ResourceTileEconomyResourceKind
  yieldPerHour: ResourceTileEconomyRange
  yieldPerTick: number
  occupiedResourceYieldUsesEconomyCurve: true
}

export type ResourceTileEconomySpec = {
  resourceEconomyModelVersion: string
  tileLevel: ResourceTileEconomyLevel
  l1L9YieldCurveBounded: true
  productionTileUsesGeneratedResourceTable: true
  baseYieldPerHour: Record<ResourceTileEconomyResourceKind, ResourceTileEconomyRange>
  defenderStrength: ResourceTileEconomyRange
  defenderTroopCount: ResourceTileEconomyRange
  recommendedPower: number
  captureReward: ResourceTileEconomyCaptureReward
}

export type ResourceTileEconomyReadModel = {
  resourceEconomyModelVersion: string
  tileLevel: ResourceTileEconomyLevel
  resourceKind: ResourceTileEconomyResourceKind
  l1L9YieldCurveBounded: true
  productionTileUsesGeneratedResourceTable: true
  baseYieldPerHour: ResourceTileEconomyRange
  defenderStrength: ResourceTileEconomyRange
  defenderTroopCount: ResourceTileEconomyRange
  recommendedPower: number
  ongoingYield: ResourceTileOngoingYieldReadModel
  occupiedResourceYieldUsesEconomyCurve: true
  captureReward: ResourceTileEconomyCaptureReward
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

export type ResourceTileRefreshRecoveryPolicy = {
  resourceEconomyModelVersion: string
  policyVersion: 'resource_tile_refresh_recovery_l0_l1_l9_v1'
  l0RefreshEligible: false
  l1L9RefreshEligible: true
  resourceTileLevels: ResourceTileEconomyLevel[]
  refreshIntervalTicks: number
  exhaustedTileRecoveryPerIntervalPercent: number
  refreshCandidateUsesLevelWeights: true
}

export type ResourceTileContestPriorityReadModel = {
  resourceEconomyModelVersion: string
  aiContestHookAvailable: true
  resourceKind: ResourceTileEconomyResourceKind
  tileLevel: ResourceTileEconomyLevel
  contestPriority: number
  candidateWeight: number
  ongoingYieldPerTick: number
  defenderStrength: ResourceTileEconomyRange
  defenderTroopCount: ResourceTileEconomyRange
  captureReward: ResourceTileEconomyCaptureReward
}

export type ResourceTileExpeditionPreviewStatus =
  | 'ready'
  | 'not_resource_tile'
  | 'unsupported_resource_level'
  | 'unsupported_resource_kind'

export type ResourceTileExpeditionPreviewBaseReadModel = {
  resourceEconomyModelVersion: string
  resourceLabel: string
  baseYieldPerHour: ResourceTileEconomyRange
  ongoingYield: {
    yieldPerHour: ResourceTileEconomyRange
    yieldPerTick: number
    occupiedResourceYieldUsesEconomyCurve: boolean
  }
  defenderStrength: ResourceTileEconomyRange
  defenderTroopCount: ResourceTileEconomyRange
  recommendedPower: number
  difficultyLabel: string
  riskLabel: string
  ownerFactionId?: string
  occupierFactionId?: string
  contestedByFactionId?: string
}

export type ResourceTileExpeditionPreviewReadyReadModel = ResourceTileExpeditionPreviewBaseReadModel & {
  status: 'ready'
  isResourceTile: true
  resourceKind: ResourceTileEconomyResourceKind
  resourceLevel: ResourceTileEconomyLevel
  captureReward: ResourceTileEconomyCaptureReward
  hasCaptureReward: true
  guardLevel: ResourceTileEconomyLevel
  hasResourceGuard: boolean
  guardTemplateId?: string
}

export type ResourceTileExpeditionPreviewInactiveReadModel = ResourceTileExpeditionPreviewBaseReadModel & {
  status: Exclude<ResourceTileExpeditionPreviewStatus, 'ready'>
  isResourceTile: false
  resourceKind?: undefined
  resourceLevel?: undefined
  captureReward?: undefined
  hasCaptureReward: false
  guardLevel?: undefined
  hasResourceGuard: false
  guardTemplateId?: undefined
}

export type ResourceTileExpeditionPreviewReadModel =
  | ResourceTileExpeditionPreviewReadyReadModel
  | ResourceTileExpeditionPreviewInactiveReadModel

export function listResourceTileEconomySpecs(): ResourceTileEconomySpec[] {
  return listResourceTileEconomyConfigs().map((config) => ({
    resourceEconomyModelVersion: RESOURCE_TILE_ECONOMY_MODEL_VERSION,
    tileLevel: config.resourceLevel,
    l1L9YieldCurveBounded: true,
    productionTileUsesGeneratedResourceTable: true,
    baseYieldPerHour: {
      food: { ...config.yieldPerHourByKind.food },
      wood: { ...config.yieldPerHourByKind.wood },
      stone: { ...config.yieldPerHourByKind.stone },
      iron: { ...config.yieldPerHourByKind.iron },
    },
    defenderStrength: { ...config.defenderStrength },
    defenderTroopCount: { ...config.defenderTroopCount },
    recommendedPower: config.recommendedPower,
    captureReward: {
      resourceKind: 'food',
      amount: { ...config.captureReward.amount },
      heroExp: config.captureReward.heroExp,
      captureRewardUsesResourceLevel: true,
    },
  }))
}

export function buildL0SubstrateEconomyReadModel(): L0SubstrateEconomyReadModel {
  return {
    resourceEconomyModelVersion: RESOURCE_TILE_ECONOMY_MODEL_VERSION,
    tileLevel: 0,
    l0SubstrateYieldPerHour: 0,
    hasResourceKind: false,
    hasResourceLevel: false,
    hasResourceGuard: false,
    hasResourceYield: false,
  }
}

export function buildResourceTileEconomyReadModel(params: {
  resourceKind: ResourceKind | undefined
  resourceLevel: number | undefined
}): ResourceTileEconomyReadModel {
  const resourceKind = normalizeEconomyResourceKind(params.resourceKind)
  const config = getResourceTileEconomyConfig({
    resourceKind,
    resourceLevel: params.resourceLevel,
  })
  return {
    resourceEconomyModelVersion: RESOURCE_TILE_ECONOMY_MODEL_VERSION,
    tileLevel: config.resourceLevel,
    resourceKind,
    l1L9YieldCurveBounded: true,
    productionTileUsesGeneratedResourceTable: true,
    baseYieldPerHour: { ...config.yieldPerHour },
    defenderStrength: { ...config.defenderStrength },
    defenderTroopCount: { ...config.defenderTroopCount },
    recommendedPower: config.recommendedPower,
    ongoingYield: computeResourceTileOngoingYield({
      resourceKind,
      resourceLevel: config.resourceLevel,
    }),
    occupiedResourceYieldUsesEconomyCurve: true,
    captureReward: {
      ...config.captureReward,
      resourceKind,
      amount: { ...config.captureReward.amount },
    },
  }
}

export function computeResourceTileOngoingYield(params: {
  resourceKind: ResourceKind | undefined
  resourceLevel: number | undefined
}): ResourceTileOngoingYieldReadModel {
  const resourceKind = normalizeEconomyResourceKind(params.resourceKind)
  const config = getResourceTileEconomyConfig({
    resourceKind,
    resourceLevel: params.resourceLevel,
  })
  const yieldPerHour = config.yieldPerHour
  return {
    resourceEconomyModelVersion: RESOURCE_TILE_ECONOMY_MODEL_VERSION,
    tileLevel: config.resourceLevel,
    resourceKind,
    yieldPerHour: { ...yieldPerHour },
    yieldPerTick: Math.max(1, Math.round((yieldPerHour.min + yieldPerHour.max) / 24)),
    occupiedResourceYieldUsesEconomyCurve: true,
  }
}

export function buildResourceTileRefreshRecoveryPolicy(): ResourceTileRefreshRecoveryPolicy {
  return {
    resourceEconomyModelVersion: RESOURCE_TILE_ECONOMY_MODEL_VERSION,
    policyVersion: 'resource_tile_refresh_recovery_l0_l1_l9_v1',
    l0RefreshEligible: false,
    l1L9RefreshEligible: true,
    resourceTileLevels: [...RESOURCE_TILE_ECONOMY_LEVELS],
    refreshIntervalTicks: 12,
    exhaustedTileRecoveryPerIntervalPercent: 25,
    refreshCandidateUsesLevelWeights: true,
  }
}

export function buildResourceTileContestPriority(params: {
  resourceKind: ResourceKind | undefined
  resourceLevel: number | undefined
  distanceFromAiHome?: number
}): ResourceTileContestPriorityReadModel {
  const economy = buildResourceTileEconomyReadModel(params)
  const distancePenalty = Math.max(0, Math.round(Number(params.distanceFromAiHome ?? 0) || 0) * 2)
  const rewardMidpoint = Math.round((economy.captureReward.amount.min + economy.captureReward.amount.max) / 2)
  const guardCost = Math.round((economy.defenderStrength.min + economy.defenderStrength.max) / 4)
  const candidateWeight = Math.max(
    1,
    economy.ongoingYield.yieldPerTick * 4 + rewardMidpoint + economy.recommendedPower - guardCost - distancePenalty,
  )
  return {
    resourceEconomyModelVersion: RESOURCE_TILE_ECONOMY_MODEL_VERSION,
    aiContestHookAvailable: true,
    resourceKind: economy.resourceKind,
    tileLevel: economy.tileLevel,
    contestPriority: candidateWeight,
    candidateWeight,
    ongoingYieldPerTick: economy.ongoingYield.yieldPerTick,
    defenderStrength: { ...economy.defenderStrength },
    defenderTroopCount: { ...economy.defenderTroopCount },
    captureReward: {
      ...economy.captureReward,
      amount: { ...economy.captureReward.amount },
    },
  }
}

export function buildResourceTileCaptureReward(params: {
  resourceKind: ResourceKind | undefined
  resourceLevel: number | undefined
}): ResourceTileEconomyCaptureReward {
  const resourceKind = normalizeStrictEconomyResourceKind(params.resourceKind)
  if (!resourceKind) {
    throw new Error('resource tile capture reward requires food/wood/stone/iron resource kind')
  }
  const resourceLevel = normalizeStrictResourceLevel(params.resourceLevel)
  if (!resourceLevel) {
    throw new Error('resource tile capture reward requires L1-L9 resource level')
  }
  const economy = buildResourceTileEconomyReadModel({ resourceKind, resourceLevel })
  return {
    ...economy.captureReward,
    amount: { ...economy.captureReward.amount },
  }
}

export function buildResourceTileExpeditionPreview(params: {
  tileType?: TileType | string
  resourceKind?: ResourceKind
  resourceLevel?: number
  ownerFactionId?: string
  occupierFactionId?: string
  contestedByFactionId?: string
}): ResourceTileExpeditionPreviewReadModel {
  if (params.tileType !== 'resource') {
    return buildL0ExpeditionPreview('not_resource_tile')
  }

  const resourceLevel = normalizeStrictResourceLevel(params.resourceLevel)
  if (!resourceLevel) {
    return buildL0ExpeditionPreview('unsupported_resource_level')
  }

  const resourceKind = normalizeStrictEconomyResourceKind(params.resourceKind)
  if (!resourceKind) {
    return buildL0ExpeditionPreview('unsupported_resource_kind')
  }

  const economy = buildResourceTileEconomyReadModel({ resourceKind, resourceLevel })
  const guardTemplate = resolveResourceGuardTemplateForTile({
    type: 'resource',
    resourceLevel,
  })

  return {
    status: 'ready',
    isResourceTile: true,
    resourceEconomyModelVersion: economy.resourceEconomyModelVersion,
    resourceKind,
    resourceLevel,
    resourceLabel: resourceKindLabel(resourceKind),
    baseYieldPerHour: { ...economy.baseYieldPerHour },
    ongoingYield: {
      yieldPerHour: { ...economy.ongoingYield.yieldPerHour },
      yieldPerTick: economy.ongoingYield.yieldPerTick,
      occupiedResourceYieldUsesEconomyCurve: true,
    },
    captureReward: buildResourceTileCaptureReward({ resourceKind, resourceLevel }),
    hasCaptureReward: true,
    defenderStrength: { ...economy.defenderStrength },
    defenderTroopCount: { ...economy.defenderTroopCount },
    recommendedPower: economy.recommendedPower,
    guardLevel: resourceLevel,
    hasResourceGuard: Boolean(guardTemplate),
    guardTemplateId: guardTemplate?.id,
    difficultyLabel: difficultyLabelForLevel(resourceLevel),
    riskLabel: riskLabelForLevel(resourceLevel),
    ownerFactionId: params.ownerFactionId,
    occupierFactionId: params.occupierFactionId,
    contestedByFactionId: params.contestedByFactionId,
  }
}

export function resolveResourceTileEconomySpec(resourceLevel: number | undefined): ResourceTileEconomySpec {
  const level = normalizeStrictResourceLevel(resourceLevel)
  if (!level) {
    throw new Error('unsupported_resource_level')
  }
  const spec = listResourceTileEconomySpecs()[level - 1]
  if (!spec) {
    throw new Error(`missing resource tile economy spec for level ${level}`)
  }
  return cloneSpec(spec)
}

function normalizeEconomyResourceKind(resourceKind: ResourceKind | undefined): ResourceTileEconomyResourceKind {
  if (resourceKind === 'food' || resourceKind === 'wood' || resourceKind === 'stone' || resourceKind === 'iron') {
    return resourceKind
  }
  return 'food'
}

function normalizeStrictEconomyResourceKind(resourceKind: ResourceKind | undefined): ResourceTileEconomyResourceKind | undefined {
  return normalizeResourceTileEconomyResourceKind(resourceKind)
}

function normalizeStrictResourceLevel(resourceLevel: number | undefined): ResourceTileEconomyLevel | undefined {
  return normalizeResourceTileEconomyLevel(resourceLevel)
}

function buildL0ExpeditionPreview(status: Exclude<ResourceTileExpeditionPreviewStatus, 'ready'>): ResourceTileExpeditionPreviewReadModel {
  return {
    status,
    isResourceTile: false,
    resourceEconomyModelVersion: RESOURCE_TILE_ECONOMY_MODEL_VERSION,
    resourceLabel: '普通土地',
    baseYieldPerHour: { min: 0, max: 0 },
    ongoingYield: {
      yieldPerHour: { min: 0, max: 0 },
      yieldPerTick: 0,
      occupiedResourceYieldUsesEconomyCurve: false,
    },
    hasCaptureReward: false,
    defenderStrength: { min: 0, max: 0 },
    defenderTroopCount: { min: 0, max: 0 },
    recommendedPower: 0,
    hasResourceGuard: false,
    difficultyLabel: '无资源',
    riskLabel: '无守军',
  }
}

function resourceKindLabel(resourceKind: ResourceTileEconomyResourceKind): string {
  switch (resourceKind) {
    case 'food':
      return '粮草'
    case 'wood':
      return '木材'
    case 'stone':
      return '石料'
    case 'iron':
      return '铁矿'
  }
}

function difficultyLabelForLevel(resourceLevel: ResourceTileEconomyLevel): string {
  if (resourceLevel <= 3) return '易取'
  if (resourceLevel <= 6) return '需整军'
  return '强敌'
}

function riskLabelForLevel(resourceLevel: ResourceTileEconomyLevel): string {
  if (resourceLevel <= 3) return '低危'
  if (resourceLevel <= 6) return '稳妥'
  if (resourceLevel <= 8) return '严阵'
  return '凶险'
}

function cloneSpec(spec: ResourceTileEconomySpec): ResourceTileEconomySpec {
  return {
    ...spec,
    baseYieldPerHour: {
      food: { ...spec.baseYieldPerHour.food },
      wood: { ...spec.baseYieldPerHour.wood },
      stone: { ...spec.baseYieldPerHour.stone },
      iron: { ...spec.baseYieldPerHour.iron },
    },
    defenderStrength: { ...spec.defenderStrength },
    defenderTroopCount: { ...spec.defenderTroopCount },
    captureReward: {
      ...spec.captureReward,
      amount: { ...spec.captureReward.amount },
    },
  }
}
