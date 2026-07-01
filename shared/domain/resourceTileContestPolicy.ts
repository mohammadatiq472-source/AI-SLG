import type { ResourceKind, TileType } from '../contracts/game'
import {
  RESOURCE_TILE_ECONOMY_MODEL_VERSION,
  buildResourceTileExpeditionPreview,
  type ResourceTileEconomyCaptureReward,
  type ResourceTileEconomyRange,
  type ResourceTileEconomyResourceKind,
} from './resourceTileEconomy'

export type ResourceTileContestState = 'neutral' | 'self' | 'ally' | 'enemy' | 'occupied' | 'blocked'
export type ResourceTileContestPolicyStatus = 'ready' | 'l0_substrate' | 'unsupported_resource_level' | 'unsupported_resource_kind'

export type ResourceTileContestPolicyParams = {
  tileType?: TileType | string
  resourceKind?: ResourceKind
  resourceLevel?: number
  ownerFactionId?: string
  occupierFactionId?: string
  requestingFactionId: string
  allyFactionIds?: string[]
  distanceToBase?: number
  marchDistance?: number
  factionPower?: number
  availableTroopPower?: number
  resourceNeed?: Partial<Record<ResourceTileEconomyResourceKind, number>>
  nearbyEnemyPressure?: number
  allySupport?: number
  contestContext?: 'frontline' | 'safe_rear' | 'enemy_border' | 'blocked'
}

export type ResourceTileContestPolicyReadModel = {
  status: ResourceTileContestPolicyStatus
  resourceEconomyModelVersion: string
  resourceLevel?: number
  resourceKind?: ResourceTileEconomyResourceKind
  resourceLabel: string
  expectedYieldPerHour: ResourceTileEconomyRange
  captureReward?: ResourceTileEconomyCaptureReward
  hasCaptureReward: boolean
  defenderStrength: ResourceTileEconomyRange
  defenderTroopCount: ResourceTileEconomyRange
  recommendedPower: number
  hasResourceGuard: boolean
  contestState: ResourceTileContestState
  attackAllowed: boolean
  shouldScout: boolean
  shouldContest: boolean
  shouldAvoid: boolean
  priorityScore: number
  riskLabel: string
  decisionLabel: string
}

const ZERO_RANGE: ResourceTileEconomyRange = { min: 0, max: 0 }

export function buildResourceTileContestPolicyReadModel(params: ResourceTileContestPolicyParams): ResourceTileContestPolicyReadModel {
  const preview = buildResourceTileExpeditionPreview({
    tileType: params.tileType,
    resourceKind: params.resourceKind,
    resourceLevel: params.resourceLevel,
    ownerFactionId: params.ownerFactionId,
    occupierFactionId: params.occupierFactionId,
    contestedByFactionId: params.requestingFactionId,
  })
  const contestState = resolveContestState(params)

  if (preview.status === 'not_resource_tile') {
    return buildInactivePolicy('l0_substrate', contestState, '普通土地', '无守军', '暂缓')
  }
  if (preview.status === 'unsupported_resource_level') {
    return buildInactivePolicy('unsupported_resource_level', contestState, '未知资源', '不可取', '暂缓')
  }
  if (preview.status === 'unsupported_resource_kind') {
    return buildInactivePolicy('unsupported_resource_kind', contestState, '未知资源', '不可取', '暂缓')
  }
  if (!preview.resourceKind || !preview.resourceLevel) {
    return buildInactivePolicy('unsupported_resource_kind', contestState, '未知资源', '不可取', '暂缓')
  }

  const power = Math.max(0, Math.round(params.availableTroopPower ?? params.factionPower ?? 0))
  const distance = Math.max(0, Math.round(params.marchDistance ?? params.distanceToBase ?? 0))
  const enemyPressure = Math.max(0, Math.round(params.nearbyEnemyPressure ?? 0))
  const allySupport = Math.max(0, Math.round(params.allySupport ?? 0))
  const resourceNeed = Math.max(0, Math.round(params.resourceNeed?.[preview.resourceKind] ?? 0))
  const guardMidpoint = Math.round((preview.defenderStrength.min + preview.defenderStrength.max) / 2)
  const rewardMidpoint = Math.round(((preview.captureReward?.amount.min ?? 0) + (preview.captureReward?.amount.max ?? 0)) / 2)
  const yieldValue = Math.round((preview.baseYieldPerHour.min + preview.baseYieldPerHour.max) / 2)
  const levelValue = preview.resourceLevel ?? 1

  const statePenalty = contestState === 'enemy'
    ? 90
    : contestState === 'occupied'
      ? 70
      : contestState === 'ally'
        ? 35
        : contestState === 'self'
          ? 120
          : contestState === 'blocked'
            ? 999
            : 0
  const riskPenalty = enemyPressure * 18 + Math.max(0, preview.recommendedPower - power)
  const score = Math.max(
    0,
    Math.round(
      yieldValue / 8 +
      rewardMidpoint / 6 +
      levelValue * 8 +
      resourceNeed * 28 +
      allySupport * 8 -
      distance * 6 -
      guardMidpoint / 5 -
      riskPenalty -
      statePenalty,
    ),
  )
  const shouldAvoid = contestState === 'blocked' || enemyPressure >= 7 || power < Math.round(preview.recommendedPower * 0.7)
  const shouldScout = contestState === 'enemy' || enemyPressure >= 4 || power < preview.recommendedPower
  const attackAllowed = contestState !== 'self' && contestState !== 'ally' && contestState !== 'blocked' && !shouldAvoid && power >= Math.round(preview.recommendedPower * 0.8)
  const shouldContest = attackAllowed && score > 0

  return {
    status: 'ready',
    resourceEconomyModelVersion: RESOURCE_TILE_ECONOMY_MODEL_VERSION,
    resourceLevel: preview.resourceLevel,
    resourceKind: preview.resourceKind,
    resourceLabel: preview.resourceLabel,
    expectedYieldPerHour: { ...preview.baseYieldPerHour },
    captureReward: preview.captureReward
      ? {
          ...preview.captureReward,
          amount: { ...preview.captureReward.amount },
        }
      : undefined,
    hasCaptureReward: Boolean(preview.captureReward),
    defenderStrength: { ...preview.defenderStrength },
    defenderTroopCount: { ...preview.defenderTroopCount },
    recommendedPower: preview.recommendedPower,
    hasResourceGuard: preview.hasResourceGuard,
    contestState,
    attackAllowed,
    shouldScout,
    shouldContest,
    shouldAvoid,
    priorityScore: score,
    riskLabel: preview.riskLabel,
    decisionLabel: resolveDecisionLabel({ contestState, shouldAvoid, shouldScout, shouldContest }),
  }
}

export function rankResourceTileExpansionCandidate(params: ResourceTileContestPolicyParams): ResourceTileContestPolicyReadModel {
  return buildResourceTileContestPolicyReadModel(params)
}

function resolveContestState(params: ResourceTileContestPolicyParams): ResourceTileContestState {
  if (params.contestContext === 'blocked') return 'blocked'
  const owner = normalizeFactionId(params.occupierFactionId ?? params.ownerFactionId)
  const requester = normalizeFactionId(params.requestingFactionId)
  if (!owner || owner === 'neutral') return 'neutral'
  if (owner === requester) return 'self'
  if ((params.allyFactionIds ?? []).map(normalizeFactionId).includes(owner)) return 'ally'
  return 'enemy'
}

function buildInactivePolicy(
  status: Exclude<ResourceTileContestPolicyStatus, 'ready'>,
  contestState: ResourceTileContestState,
  resourceLabel: string,
  riskLabel: string,
  decisionLabel: string,
): ResourceTileContestPolicyReadModel {
  return {
    status,
    resourceEconomyModelVersion: RESOURCE_TILE_ECONOMY_MODEL_VERSION,
    resourceLabel,
    expectedYieldPerHour: { ...ZERO_RANGE },
    hasCaptureReward: false,
    defenderStrength: { ...ZERO_RANGE },
    defenderTroopCount: { ...ZERO_RANGE },
    recommendedPower: 0,
    hasResourceGuard: false,
    contestState,
    attackAllowed: false,
    shouldScout: false,
    shouldContest: false,
    shouldAvoid: false,
    priorityScore: 0,
    riskLabel,
    decisionLabel,
  }
}

function resolveDecisionLabel(params: {
  contestState: ResourceTileContestState
  shouldAvoid: boolean
  shouldScout: boolean
  shouldContest: boolean
}): string {
  if (params.contestState === 'self') return '已占'
  if (params.contestState === 'ally') return '友邻'
  if (params.contestState === 'blocked' || params.shouldAvoid) return '暂避'
  if (params.shouldScout) return '先探'
  if (params.shouldContest) return '争取'
  return '观望'
}

function normalizeFactionId(value: string | undefined): string {
  return String(value ?? '').trim()
}
