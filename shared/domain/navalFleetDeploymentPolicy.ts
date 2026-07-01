export type NavalFleetDeploymentStatus =
  | 'in_harbor'
  | 'patrolling'
  | 'intercepting'
  | 'damaged'
  | 'repairing'
  | 'ready'

export type NavalFleetDeploymentMissionType =
  | 'depart'
  | 'patrol'
  | 'intercept'
  | 'repair'
  | 'hold'

export type NavalFleetDeploymentPolicyInput = {
  fleetId?: string
  harborId?: string
  routeId?: string
  patrolId?: string
  fleetStatus: NavalFleetDeploymentStatus
  durabilityCurrent: number
  durabilityMax: number
  crewReadiness?: number
  supplyReadiness?: number
  routeRisk?: number
  enemyPresence?: number
  seaWeatherRisk?: number
  missionType: NavalFleetDeploymentMissionType
}

export type NavalFleetDeploymentPolicyOutput = {
  status: NavalFleetDeploymentStatus
  statusLabel: string
  missionAllowed: boolean
  recommendedAction: '出港' | '巡逻' | '拦截' | '整补' | '待命'
  readinessScore: number
  riskScore: number
  durabilityLabel: string
  missionLabel: string
  riskLabel: string
  shouldRepair: boolean
  shouldPatrol: boolean
  shouldIntercept: boolean
  shouldHold: boolean
  policyScope: 'naval_deployment_readiness_only_not_full_fleet_management'
  playerVisibleEngineeringCopyLeak: boolean
  visibleCopyForbiddenHits: string[]
}

const FORBIDDEN_VISIBLE_COPY = [
  'snake_case',
  'contract id',
  'read model',
  'authority',
  'tier',
  'v0',
  'neutral',
  'backend',
]

function clampPercent(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback
  }
  return Math.max(0, Math.min(100, Math.round(value)))
}

function labelMission(missionType: NavalFleetDeploymentMissionType): string {
  switch (missionType) {
    case 'depart':
      return '出港'
    case 'patrol':
      return '巡逻'
    case 'intercept':
      return '拦截'
    case 'repair':
      return '整补'
    case 'hold':
      return '待命'
  }
}

function labelStatus(status: NavalFleetDeploymentStatus): string {
  switch (status) {
    case 'in_harbor':
    case 'ready':
      return '可出港'
    case 'patrolling':
      return '巡逻中'
    case 'intercepting':
      return '接战中'
    case 'damaged':
      return '受损'
    case 'repairing':
      return '整补中'
  }
}

function labelRisk(riskScore: number): string {
  if (riskScore >= 75) {
    return '高风险'
  }
  if (riskScore >= 45) {
    return '需谨慎'
  }
  return '风平浪稳'
}

function findForbiddenVisibleCopyHits(copy: string): string[] {
  const lower = copy.toLowerCase()
  return FORBIDDEN_VISIBLE_COPY.filter((token) => lower.includes(token))
}

export function evaluateNavalFleetDeploymentReadiness(
  input: NavalFleetDeploymentPolicyInput,
): NavalFleetDeploymentPolicyOutput {
  const durabilityMax = Math.max(1, Math.round(input.durabilityMax || 100))
  const durabilityCurrent = Math.max(0, Math.min(durabilityMax, Math.round(input.durabilityCurrent || 0)))
  const durabilityScore = clampPercent((durabilityCurrent / durabilityMax) * 100, 0)
  const supplyScore = clampPercent(input.supplyReadiness, 75)
  const crewScore = clampPercent(input.crewReadiness, 75)
  const routeRisk = clampPercent(input.routeRisk, 0)
  const enemyPresence = clampPercent(input.enemyPresence, 0)
  const seaWeatherRisk = clampPercent(input.seaWeatherRisk, 0)
  const riskScore = clampPercent((routeRisk * 0.4) + (enemyPresence * 0.3) + (seaWeatherRisk * 0.3), 0)
  const readinessScore = clampPercent(
    (durabilityScore * 0.46) + (supplyScore * 0.27) + (crewScore * 0.27) - (riskScore * 0.28),
    0,
  )

  const repairByStatus = input.fleetStatus === 'repairing' || input.fleetStatus === 'damaged'
  const repairByDurability = durabilityScore < 40
  const shouldRepair = repairByStatus || repairByDurability || input.missionType === 'repair'
  const riskTooHigh = riskScore >= 75
  const canOperate = !shouldRepair && readinessScore >= 68 && !riskTooHigh
  const interceptHasTarget = enemyPresence >= 35
  const interceptAllowed = canOperate && input.missionType === 'intercept' && interceptHasTarget
  const patrolAllowed = canOperate && input.missionType === 'patrol'
  const departAllowed = canOperate && input.missionType === 'depart'

  let recommendedAction: NavalFleetDeploymentPolicyOutput['recommendedAction'] = '待命'
  if (shouldRepair) {
    recommendedAction = '整补'
  } else if (interceptAllowed) {
    recommendedAction = '拦截'
  } else if (patrolAllowed) {
    recommendedAction = '巡逻'
  } else if (departAllowed) {
    recommendedAction = '出港'
  }

  const missionAllowed = (
    (input.missionType === 'repair' && shouldRepair) ||
    departAllowed ||
    patrolAllowed ||
    interceptAllowed ||
    (input.missionType === 'hold' && recommendedAction === '待命')
  )
  const shouldPatrol = recommendedAction === '巡逻'
  const shouldIntercept = recommendedAction === '拦截'
  const shouldHold = recommendedAction === '待命'
  const status = shouldRepair
    ? (input.fleetStatus === 'repairing' ? 'repairing' : 'damaged')
    : (canOperate ? 'ready' : input.fleetStatus)
  const durabilityLabel = `耐久 ${durabilityCurrent}/${durabilityMax}`
  const missionLabel = labelMission(input.missionType)
  const riskLabel = labelRisk(riskScore)
  const statusLabel = labelStatus(status)
  const visibleCopy = [
    recommendedAction,
    durabilityLabel,
    missionLabel,
    riskLabel,
    statusLabel,
  ].join(' ')
  const visibleCopyForbiddenHits = findForbiddenVisibleCopyHits(visibleCopy)

  return {
    status,
    statusLabel,
    missionAllowed,
    recommendedAction,
    readinessScore,
    riskScore,
    durabilityLabel,
    missionLabel,
    riskLabel,
    shouldRepair,
    shouldPatrol,
    shouldIntercept,
    shouldHold,
    policyScope: 'naval_deployment_readiness_only_not_full_fleet_management',
    playerVisibleEngineeringCopyLeak: visibleCopyForbiddenHits.length > 0,
    visibleCopyForbiddenHits,
  }
}
