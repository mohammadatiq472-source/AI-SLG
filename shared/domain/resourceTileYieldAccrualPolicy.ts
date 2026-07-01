import type { ResourceKind, TileType } from '../contracts/game'
import {
  RESOURCE_TILE_ECONOMY_MODEL_VERSION,
  computeResourceTileOngoingYield,
  type ResourceTileEconomyResourceKind,
} from './resourceTileEconomy'

export const RESOURCE_TILE_YIELD_ACCRUAL_POLICY_SCOPE = 'resource_tile_yield_accrual_only_not_worldservice_settlement'

export type ResourceTileYieldAccrualStatus =
  | 'ready'
  | 'l0_substrate'
  | 'unsupported_resource_level'
  | 'unsupported_resource_kind'
  | 'unoccupied'

export type ResourceTileOverflowRisk = 'none' | 'low' | 'medium' | 'high'

export type ResourceTileYieldAccrualPolicyParams = {
  tileType?: TileType | string
  resourceKind?: ResourceKind
  resourceLevel?: number
  occupierFactionId?: string
  ownerFactionId?: string
  requestingFactionId: string
  occupiedSinceMs?: number
  lastClaimedAtMs?: number
  nowMs: number
  storageCapacity: number
  currentStoredAmount: number
  yieldMultiplier?: number
  warDisruptionFactor?: number
  governanceBonusFactor?: number
}

export type ResourceTileYieldAccrualPolicyReadModel = {
  status: ResourceTileYieldAccrualStatus
  policyScope: typeof RESOURCE_TILE_YIELD_ACCRUAL_POLICY_SCOPE
  resourceEconomyModelVersion: string
  resourceKind?: ResourceTileEconomyResourceKind
  resourceLevel?: number
  resourceLabel: string
  yieldPerHour: number
  elapsedMs: number
  claimableAmount: number
  rawAccruedAmount: number
  storageRemaining: number
  overflowAmount: number
  overflowRisk: ResourceTileOverflowRisk
  nextClaimHintLabel: string
  yieldLabel: string
  claimLabel: string
  shouldClaimNow: boolean
  visibleCopyForbiddenHits: string[]
}

const VISIBLE_COPY_FORBIDDEN_PATTERN =
  /(snake_case|read model|authority|tier|v0|backend|contract id|resourceEconomy|guardTemplateId|policyScope)/i

export function buildResourceTileYieldAccrualPolicy(
  params: ResourceTileYieldAccrualPolicyParams,
): ResourceTileYieldAccrualPolicyReadModel {
  const storageRemaining = resolveStorageRemaining(params)

  if (params.tileType !== 'resource') {
    return buildInactivePolicy('l0_substrate', '普通土地', '无收益', '无资源累计', storageRemaining)
  }

  const resourceLevel = normalizeStrictResourceLevel(params.resourceLevel)
  if (!resourceLevel) {
    return buildInactivePolicy('unsupported_resource_level', '未知资源', '不可累计', '暂不可领', storageRemaining)
  }

  const resourceKind = normalizeStrictEconomyResourceKind(params.resourceKind)
  if (!resourceKind) {
    return buildInactivePolicy('unsupported_resource_kind', '未知资源', '不可累计', '暂不可领', storageRemaining)
  }

  if (!isClaimableByRequestingFaction(params)) {
    return buildInactivePolicy('unoccupied', resourceKindLabel(resourceKind), '尚未占领', '不可领取', storageRemaining, resourceKind, resourceLevel)
  }

  const ongoingYield = computeResourceTileOngoingYield({ resourceKind, resourceLevel })
  const baseYieldPerHour = Math.round((ongoingYield.yieldPerHour.min + ongoingYield.yieldPerHour.max) / 2)
  const multiplier = resolvePositiveFactor(params.yieldMultiplier, 1)
  const warFactor = resolvePositiveFactor(params.warDisruptionFactor, 1)
  const governanceFactor = resolvePositiveFactor(params.governanceBonusFactor, 1)
  const yieldPerHour = Math.max(1, Math.round(baseYieldPerHour * multiplier * warFactor * governanceFactor))
  const elapsedMs = resolveElapsedMs(params)
  const rawAccruedAmount = Math.max(0, Math.floor((yieldPerHour * elapsedMs) / (60 * 60 * 1000)))
  const claimableAmount = Math.min(rawAccruedAmount, storageRemaining)
  const overflowAmount = Math.max(0, rawAccruedAmount - storageRemaining)
  const overflowRisk = resolveOverflowRisk(rawAccruedAmount, storageRemaining, overflowAmount, yieldPerHour)
  const shouldClaimNow = resolveShouldClaimNow(rawAccruedAmount, claimableAmount, storageRemaining, overflowAmount, yieldPerHour)

  return withVisibleCopyGuard({
    status: 'ready',
    policyScope: RESOURCE_TILE_YIELD_ACCRUAL_POLICY_SCOPE,
    resourceEconomyModelVersion: RESOURCE_TILE_ECONOMY_MODEL_VERSION,
    resourceKind,
    resourceLevel,
    resourceLabel: resourceKindLabel(resourceKind),
    yieldPerHour,
    elapsedMs,
    claimableAmount,
    rawAccruedAmount,
    storageRemaining,
    overflowAmount,
    overflowRisk,
    nextClaimHintLabel: nextClaimHintLabel(shouldClaimNow, overflowRisk, claimableAmount),
    yieldLabel: `${resourceKindLabel(resourceKind)}每时+${yieldPerHour}`,
    claimLabel: claimableAmount > 0 ? `可领${claimableAmount}` : '暂无可领',
    shouldClaimNow,
    visibleCopyForbiddenHits: [],
  })
}

function buildInactivePolicy(
  status: Exclude<ResourceTileYieldAccrualStatus, 'ready'>,
  resourceLabel: string,
  yieldLabel: string,
  claimLabel: string,
  storageRemaining: number,
  resourceKind?: ResourceTileEconomyResourceKind,
  resourceLevel?: number,
): ResourceTileYieldAccrualPolicyReadModel {
  return withVisibleCopyGuard({
    status,
    policyScope: RESOURCE_TILE_YIELD_ACCRUAL_POLICY_SCOPE,
    resourceEconomyModelVersion: RESOURCE_TILE_ECONOMY_MODEL_VERSION,
    resourceKind,
    resourceLevel,
    resourceLabel,
    yieldPerHour: 0,
    elapsedMs: 0,
    claimableAmount: 0,
    rawAccruedAmount: 0,
    storageRemaining,
    overflowAmount: 0,
    overflowRisk: 'none',
    nextClaimHintLabel: '无需领取',
    yieldLabel,
    claimLabel,
    shouldClaimNow: false,
    visibleCopyForbiddenHits: [],
  })
}

function withVisibleCopyGuard(
  model: ResourceTileYieldAccrualPolicyReadModel,
): ResourceTileYieldAccrualPolicyReadModel {
  const labels = [model.resourceLabel, model.nextClaimHintLabel, model.yieldLabel, model.claimLabel]
  return {
    ...model,
    visibleCopyForbiddenHits: labels.filter((label) => VISIBLE_COPY_FORBIDDEN_PATTERN.test(label)),
  }
}

function normalizeStrictResourceLevel(resourceLevel: number | undefined): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | undefined {
  if (typeof resourceLevel !== 'number' || !Number.isFinite(resourceLevel)) {
    return undefined
  }
  const rounded = Math.round(resourceLevel)
  if (rounded < 1 || rounded > 9) {
    return undefined
  }
  return rounded as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
}

function normalizeStrictEconomyResourceKind(resourceKind: ResourceKind | undefined): ResourceTileEconomyResourceKind | undefined {
  if (resourceKind === 'food' || resourceKind === 'wood' || resourceKind === 'stone' || resourceKind === 'iron') {
    return resourceKind
  }
  return undefined
}

function isClaimableByRequestingFaction(params: ResourceTileYieldAccrualPolicyParams): boolean {
  const controllingFactionId = params.occupierFactionId ?? params.ownerFactionId
  return Boolean(controllingFactionId && controllingFactionId !== 'neutral' && controllingFactionId === params.requestingFactionId)
}

function resolveElapsedMs(params: ResourceTileYieldAccrualPolicyParams): number {
  const occupiedSinceMs = finiteNonNegative(params.occupiedSinceMs)
  const lastClaimedAtMs = finiteNonNegative(params.lastClaimedAtMs)
  const claimStartMs = Math.max(occupiedSinceMs, lastClaimedAtMs)
  return Math.max(0, finiteNonNegative(params.nowMs) - claimStartMs)
}

function resolveStorageRemaining(params: ResourceTileYieldAccrualPolicyParams): number {
  const capacity = finiteNonNegative(params.storageCapacity)
  const stored = finiteNonNegative(params.currentStoredAmount)
  return Math.max(0, Math.floor(capacity - stored))
}

function resolvePositiveFactor(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return Math.max(0, value)
}

function finiteNonNegative(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, value)
}

function resolveOverflowRisk(
  rawAccruedAmount: number,
  storageRemaining: number,
  overflowAmount: number,
  yieldPerHour: number,
): ResourceTileOverflowRisk {
  if (overflowAmount > 0) return 'high'
  if (rawAccruedAmount <= 0) return 'none'
  if (storageRemaining <= Math.max(1, yieldPerHour)) return 'medium'
  if (storageRemaining <= Math.max(1, rawAccruedAmount * 2)) return 'low'
  return 'none'
}

function resolveShouldClaimNow(
  rawAccruedAmount: number,
  claimableAmount: number,
  storageRemaining: number,
  overflowAmount: number,
  yieldPerHour: number,
): boolean {
  if (rawAccruedAmount <= 0) return false
  if (overflowAmount > 0) return true
  if (claimableAmount >= Math.max(1, yieldPerHour)) return true
  return storageRemaining <= Math.max(1, rawAccruedAmount * 2)
}

function nextClaimHintLabel(shouldClaimNow: boolean, overflowRisk: ResourceTileOverflowRisk, claimableAmount: number): string {
  if (overflowRisk === 'high') return '仓满将溢'
  if (shouldClaimNow) return '现在可领'
  if (claimableAmount > 0) return '稍后再领'
  return '继续累计'
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
