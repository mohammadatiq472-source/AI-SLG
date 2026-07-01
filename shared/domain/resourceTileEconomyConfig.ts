import type { ResourceKind, TileType } from '../contracts/game'

export const RESOURCE_TILE_ECONOMY_CONFIG_VERSION = 'resource_tile_economy_l0_l1_l9_v1'
export const RESOURCE_TILE_ECONOMY_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const
export const RESOURCE_TILE_ECONOMY_RESOURCE_KINDS = ['food', 'wood', 'stone', 'iron'] as const

export type ResourceTileEconomyLevel = typeof RESOURCE_TILE_ECONOMY_LEVELS[number]
export type ResourceTileEconomyResourceKind = typeof RESOURCE_TILE_ECONOMY_RESOURCE_KINDS[number]

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

export type ResourceTileEconomyLevelConfig = {
  configVersion: typeof RESOURCE_TILE_ECONOMY_CONFIG_VERSION
  resourceLevel: ResourceTileEconomyLevel
  yieldPerHourByKind: Record<ResourceTileEconomyResourceKind, ResourceTileEconomyRange>
  defenderStrength: ResourceTileEconomyRange
  defenderTroopCount: ResourceTileEconomyRange
  recommendedPower: number
  captureReward: Omit<ResourceTileEconomyCaptureReward, 'resourceKind'>
  occupationExp?: number
  refreshRecovery?: {
    refreshIntervalTicks: number
    exhaustedTileRecoveryPerIntervalPercent: number
  }
}

export type ResourceTileEconomyConfig = {
  configVersion: typeof RESOURCE_TILE_ECONOMY_CONFIG_VERSION
  resourceKind: ResourceTileEconomyResourceKind
  resourceLevel: ResourceTileEconomyLevel
  yieldPerHour: ResourceTileEconomyRange
  defenderStrength: ResourceTileEconomyRange
  defenderTroopCount: ResourceTileEconomyRange
  recommendedPower: number
  captureReward: ResourceTileEconomyCaptureReward
  occupationExp?: number
  refreshRecovery?: {
    refreshIntervalTicks: number
    exhaustedTileRecoveryPerIntervalPercent: number
  }
}

export type ResourceTileEconomyConfigResolveResult =
  | {
      status: 'ready'
      configVersion: typeof RESOURCE_TILE_ECONOMY_CONFIG_VERSION
      resourceKind: ResourceTileEconomyResourceKind
      resourceLevel: ResourceTileEconomyLevel
      yieldPerHour: ResourceTileEconomyRange
      defenderStrength: ResourceTileEconomyRange
      defenderTroopCount: ResourceTileEconomyRange
      recommendedPower: number
      captureReward: ResourceTileEconomyCaptureReward
      hasResourceGuard: true
      hasCaptureReward: true
    }
  | {
      status: 'l0_substrate' | 'unsupported_resource_level' | 'unsupported_resource_kind'
      configVersion: typeof RESOURCE_TILE_ECONOMY_CONFIG_VERSION
      yieldPerHour: ResourceTileEconomyRange
      defenderStrength: ResourceTileEconomyRange
      defenderTroopCount: ResourceTileEconomyRange
      recommendedPower: 0
      hasResourceGuard: false
      hasCaptureReward: false
    }

const ZERO_RANGE: ResourceTileEconomyRange = { min: 0, max: 0 }

const RESOURCE_TILE_ECONOMY_LEVEL_CONFIGS: ResourceTileEconomyLevelConfig[] = [
  buildExactLevelConfig(1),
  buildExactLevelConfig(2),
  buildExactLevelConfig(3),
  buildExactLevelConfig(4),
  buildExactLevelConfig(5),
  buildExactLevelConfig(6),
  buildExactLevelConfig(7),
  buildExactLevelConfig(8),
  buildExactLevelConfig(9),
]

export function listResourceTileEconomyConfigs(): ResourceTileEconomyLevelConfig[] {
  return RESOURCE_TILE_ECONOMY_LEVEL_CONFIGS.map((config) => cloneLevelConfig(config))
}

export function getResourceTileEconomyConfig(params: {
  resourceKind: ResourceKind | undefined
  resourceLevel: number | undefined
}): ResourceTileEconomyConfig {
  const resourceKind = normalizeResourceTileEconomyResourceKind(params.resourceKind)
  if (!resourceKind) {
    throw new Error('unsupported_resource_kind')
  }
  const levelConfig = getResourceTileEconomyLevelConfig(params.resourceLevel)
  return buildResolvedConfig(levelConfig, resourceKind)
}

export function resolveResourceTileEconomyConfigForTile(params: {
  tileType?: TileType | string
  resourceKind?: ResourceKind
  resourceLevel?: number
}): ResourceTileEconomyConfigResolveResult {
  if (params.tileType !== 'resource') {
    return buildInactiveConfigResult('l0_substrate')
  }
  const resourceLevel = normalizeResourceTileEconomyLevel(params.resourceLevel)
  if (!resourceLevel) {
    return buildInactiveConfigResult('unsupported_resource_level')
  }
  const resourceKind = normalizeResourceTileEconomyResourceKind(params.resourceKind)
  if (!resourceKind) {
    return buildInactiveConfigResult('unsupported_resource_kind')
  }
  const config = buildResolvedConfig(getResourceTileEconomyLevelConfig(resourceLevel), resourceKind)
  return {
    status: 'ready',
    configVersion: RESOURCE_TILE_ECONOMY_CONFIG_VERSION,
    resourceKind,
    resourceLevel,
    yieldPerHour: { ...config.yieldPerHour },
    defenderStrength: { ...config.defenderStrength },
    defenderTroopCount: { ...config.defenderTroopCount },
    recommendedPower: config.recommendedPower,
    captureReward: {
      ...config.captureReward,
      amount: { ...config.captureReward.amount },
    },
    hasResourceGuard: true,
    hasCaptureReward: true,
  }
}

export function normalizeResourceTileEconomyLevel(resourceLevel: number | undefined): ResourceTileEconomyLevel | undefined {
  if (typeof resourceLevel !== 'number' || !Number.isFinite(resourceLevel)) {
    return undefined
  }
  const rounded = Math.round(resourceLevel)
  if (!RESOURCE_TILE_ECONOMY_LEVELS.includes(rounded as ResourceTileEconomyLevel)) {
    return undefined
  }
  return rounded as ResourceTileEconomyLevel
}

export function normalizeResourceTileEconomyResourceKind(resourceKind: ResourceKind | undefined): ResourceTileEconomyResourceKind | undefined {
  if (RESOURCE_TILE_ECONOMY_RESOURCE_KINDS.includes(resourceKind as ResourceTileEconomyResourceKind)) {
    return resourceKind as ResourceTileEconomyResourceKind
  }
  return undefined
}

function getResourceTileEconomyLevelConfig(resourceLevel: number | undefined): ResourceTileEconomyLevelConfig {
  const level = normalizeResourceTileEconomyLevel(resourceLevel)
  if (!level) {
    throw new Error('unsupported_resource_level')
  }
  const config = RESOURCE_TILE_ECONOMY_LEVEL_CONFIGS[level - 1]
  if (!config) {
    throw new Error(`missing_resource_tile_economy_config_L${level}`)
  }
  return cloneLevelConfig(config)
}

function buildResolvedConfig(
  levelConfig: ResourceTileEconomyLevelConfig,
  resourceKind: ResourceTileEconomyResourceKind,
): ResourceTileEconomyConfig {
  return {
    configVersion: RESOURCE_TILE_ECONOMY_CONFIG_VERSION,
    resourceKind,
    resourceLevel: levelConfig.resourceLevel,
    yieldPerHour: { ...levelConfig.yieldPerHourByKind[resourceKind] },
    defenderStrength: { ...levelConfig.defenderStrength },
    defenderTroopCount: { ...levelConfig.defenderTroopCount },
    recommendedPower: levelConfig.recommendedPower,
    captureReward: {
      ...levelConfig.captureReward,
      resourceKind,
      amount: { ...levelConfig.captureReward.amount },
    },
    occupationExp: levelConfig.occupationExp,
    refreshRecovery: levelConfig.refreshRecovery
      ? { ...levelConfig.refreshRecovery }
      : undefined,
  }
}

function buildInactiveConfigResult(
  status: Extract<ResourceTileEconomyConfigResolveResult['status'], 'l0_substrate' | 'unsupported_resource_level' | 'unsupported_resource_kind'>,
): ResourceTileEconomyConfigResolveResult {
  return {
    status,
    configVersion: RESOURCE_TILE_ECONOMY_CONFIG_VERSION,
    yieldPerHour: { ...ZERO_RANGE },
    defenderStrength: { ...ZERO_RANGE },
    defenderTroopCount: { ...ZERO_RANGE },
    recommendedPower: 0,
    hasResourceGuard: false,
    hasCaptureReward: false,
  }
}

function buildLevelConfig(
  resourceLevel: ResourceTileEconomyLevel,
  food: [number, number],
  wood: [number, number],
  stone: [number, number],
  iron: [number, number],
  defenderStrength: [number, number],
  defenderTroopCount: [number, number],
  recommendedPower: number,
  captureRewardAmount: [number, number],
  heroExp: number,
): ResourceTileEconomyLevelConfig {
  return {
    configVersion: RESOURCE_TILE_ECONOMY_CONFIG_VERSION,
    resourceLevel,
    yieldPerHourByKind: {
      food: toRange(food),
      wood: toRange(wood),
      stone: toRange(stone),
      iron: toRange(iron),
    },
    defenderStrength: toRange(defenderStrength),
    defenderTroopCount: toRange(defenderTroopCount),
    recommendedPower,
    captureReward: {
      amount: toRange(captureRewardAmount),
      heroExp,
      captureRewardUsesResourceLevel: true,
    },
    occupationExp: heroExp,
    refreshRecovery: {
      refreshIntervalTicks: 12,
      exhaustedTileRecoveryPerIntervalPercent: 25,
    },
  }
}

function buildExactLevelConfig(resourceLevel: ResourceTileEconomyLevel): ResourceTileEconomyLevelConfig {
  const mainResourceYieldPerHour = resourceLevel * 2 * 100
  const guardSoldiers = resourceLevel * 300
  const recommendedPower = resourceLevel * 100
  const captureRewardAmount = mainResourceYieldPerHour
  const heroExp = resourceLevel * 20
  return buildLevelConfig(
    resourceLevel,
    [mainResourceYieldPerHour, mainResourceYieldPerHour],
    [mainResourceYieldPerHour, mainResourceYieldPerHour],
    [mainResourceYieldPerHour, mainResourceYieldPerHour],
    [mainResourceYieldPerHour, mainResourceYieldPerHour],
    [guardSoldiers, guardSoldiers],
    [resourceLevel, resourceLevel],
    recommendedPower,
    [captureRewardAmount, captureRewardAmount],
    heroExp,
  )
}

function cloneLevelConfig(config: ResourceTileEconomyLevelConfig): ResourceTileEconomyLevelConfig {
  return {
    ...config,
    yieldPerHourByKind: {
      food: { ...config.yieldPerHourByKind.food },
      wood: { ...config.yieldPerHourByKind.wood },
      stone: { ...config.yieldPerHourByKind.stone },
      iron: { ...config.yieldPerHourByKind.iron },
    },
    defenderStrength: { ...config.defenderStrength },
    defenderTroopCount: { ...config.defenderTroopCount },
    captureReward: {
      ...config.captureReward,
      amount: { ...config.captureReward.amount },
    },
    refreshRecovery: config.refreshRecovery
      ? { ...config.refreshRecovery }
      : undefined,
  }
}

function toRange(value: [number, number]): ResourceTileEconomyRange {
  return { min: value[0], max: value[1] }
}
