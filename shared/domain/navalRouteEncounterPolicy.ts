export type NavalRouteEncounterMissionType =
  | 'patrol'
  | 'intercept'
  | 'escort'
  | 'hold'

export type NavalRouteEncounterEnemyPresence =
  | 'none'
  | 'scout'
  | 'raider'
  | 'fleet'
  | 'convoy'

export type NavalRouteEncounterState =
  | 'no_contact'
  | 'sighted'
  | 'skirmish'
  | 'intercept_ready'
  | 'avoid'
  | 'blocked'

export type NavalRouteEncounterDeploymentReadiness = {
  missionAllowed?: boolean
  readinessScore?: number
  riskScore?: number
  shouldRepair?: boolean
  shouldHold?: boolean
  shouldIntercept?: boolean
}

export type NavalRouteEncounterPolicyInput = {
  fleetId?: string
  fleetRole?: string
  fleetStatus?: string
  missionType: NavalRouteEncounterMissionType
  deploymentReadiness?: NavalRouteEncounterDeploymentReadiness
  routeId?: string
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
}

export type NavalRouteEncounterPolicyOutput = {
  policyVersion: 'naval_route_encounter_policy_v1'
  scope: 'naval_route_encounter_policy_only_not_service_action'
  encounterState: NavalRouteEncounterState
  missionAllowed: boolean
  combatExpected: boolean
  interceptAllowed: boolean
  shouldReturnToHarbor: boolean
  shouldAvoid: boolean
  riskScore: number
  successChance: number
  expectedDamageRange: {
    min: number
    max: number
  }
  recommendedActionLabel: '巡逻' | '拦截' | '避战' | '回港' | '待命'
  resultLabel: '海面平静' | '发现敌船' | '可拦截' | '风险过高'
  visibleCopyForbiddenHits: string[]
}

const FORBIDDEN_VISIBLE_COPY = [
  'snake_case',
  'contract id',
  'read model',
  'authority',
  'tier',
  'v0',
  'backend',
]

const ENEMY_PRESENCE_RISK: Record<NavalRouteEncounterEnemyPresence, number> = {
  none: 0,
  scout: 18,
  raider: 48,
  fleet: 70,
  convoy: 40,
}

function clampPercent(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback
  }
  return Math.max(0, Math.min(100, Math.round(value)))
}

function hasEnemyContact(enemyPresence: NavalRouteEncounterEnemyPresence): boolean {
  return enemyPresence !== 'none'
}

function findForbiddenVisibleCopyHits(copy: string): string[] {
  const lower = copy.toLowerCase()
  return FORBIDDEN_VISIBLE_COPY.filter((token) => lower.includes(token))
}

function labelResult(params: {
  shouldReturnToHarbor: boolean
  shouldAvoid: boolean
  interceptAllowed: boolean
  enemyContact: boolean
}): NavalRouteEncounterPolicyOutput['resultLabel'] {
  if (params.shouldReturnToHarbor || params.shouldAvoid) {
    return '风险过高'
  }
  if (params.interceptAllowed) {
    return '可拦截'
  }
  if (params.enemyContact) {
    return '发现敌船'
  }
  return '海面平静'
}

export function evaluateNavalRouteEncounterPolicy(
  input: NavalRouteEncounterPolicyInput,
): NavalRouteEncounterPolicyOutput {
  const routeRisk = clampPercent(input.routeRisk, 0)
  const seaWeatherRisk = clampPercent(input.seaWeatherRisk, 0)
  const enemyStrength = clampPercent(input.enemyStrength, 0)
  const fleetStrength = clampPercent(input.fleetStrength, 60)
  const durabilityPercent = clampPercent(input.durabilityPercent, 100)
  const supplyReadiness = clampPercent(input.supplyReadiness, 75)
  const patrolIntensity = clampPercent(input.patrolIntensity, input.missionType === 'patrol' ? 35 : 20)
  const allySupport = clampPercent(input.allySupport, 0)
  const distanceFromHarbor = clampPercent(input.distanceFromHarbor, 20)
  const deploymentReadiness = input.deploymentReadiness
  const deploymentScore = clampPercent(
    deploymentReadiness?.readinessScore,
    (durabilityPercent * 0.5) + (supplyReadiness * 0.32) + (fleetStrength * 0.18),
  )

  const enemyPresenceRisk = ENEMY_PRESENCE_RISK[input.enemyPresence]
  const enemyContact = hasEnemyContact(input.enemyPresence)
  const riskScore = clampPercent(
    (routeRisk * 0.26)
      + (seaWeatherRisk * 0.22)
      + (enemyPresenceRisk * 0.22)
      + (enemyStrength * 0.18)
      + (distanceFromHarbor * 0.08)
      + (patrolIntensity * 0.04)
      + ((deploymentReadiness?.riskScore ?? 0) * 0.1)
      - (allySupport * 0.1),
    0,
  )

  const lowDurability = durabilityPercent < 36
  const lowSupply = supplyReadiness < 36
  const deploymentBlocksMission = deploymentReadiness?.missionAllowed === false
  const shouldReturnToHarbor = Boolean(deploymentReadiness?.shouldRepair) || lowDurability || lowSupply
  const shouldAvoid = !shouldReturnToHarbor && (riskScore >= 72 || Boolean(deploymentReadiness?.shouldHold))
  const baseMissionAllowed = !shouldReturnToHarbor && !shouldAvoid && !deploymentBlocksMission

  const interceptAllowed = (
    baseMissionAllowed
    && input.missionType === 'intercept'
    && enemyContact
    && deploymentScore >= 64
    && fleetStrength + allySupport >= Math.max(35, enemyStrength - 18)
  )
  const patrolAllowed = baseMissionAllowed && input.missionType === 'patrol'
  const holdAllowed = input.missionType === 'hold' && !shouldReturnToHarbor
  const missionAllowed = patrolAllowed || interceptAllowed || holdAllowed

  let encounterState: NavalRouteEncounterState = 'no_contact'
  if (shouldReturnToHarbor) {
    encounterState = 'blocked'
  } else if (shouldAvoid) {
    encounterState = 'avoid'
  } else if (interceptAllowed) {
    encounterState = 'intercept_ready'
  } else if (enemyContact && riskScore >= 50) {
    encounterState = 'skirmish'
  } else if (enemyContact) {
    encounterState = 'sighted'
  }

  const combatExpected = interceptAllowed || encounterState === 'skirmish'
  const strengthAdvantage = fleetStrength + allySupport - enemyStrength
  const successChance = clampPercent(
    48
      + (deploymentScore * 0.28)
      + (strengthAdvantage * 0.24)
      - (riskScore * 0.34)
      - (enemyPresenceRisk * 0.08),
    0,
  )
  const expectedDamageBase = clampPercent(
    3
      + (riskScore * 0.18)
      + (enemyStrength * 0.16)
      + (Math.max(0, -strengthAdvantage) * 0.16)
      + (seaWeatherRisk * 0.08)
      - (allySupport * 0.05),
    0,
  )
  const expectedDamageMin = Math.max(0, Math.min(85, Math.floor(expectedDamageBase * 0.45)))
  const expectedDamageMax = Math.max(expectedDamageMin, Math.min(100, Math.ceil(expectedDamageBase * 1.35)))

  let recommendedActionLabel: NavalRouteEncounterPolicyOutput['recommendedActionLabel'] = '待命'
  if (shouldReturnToHarbor) {
    recommendedActionLabel = '回港'
  } else if (shouldAvoid) {
    recommendedActionLabel = '避战'
  } else if (interceptAllowed) {
    recommendedActionLabel = '拦截'
  } else if (patrolAllowed) {
    recommendedActionLabel = '巡逻'
  }

  const resultLabel = labelResult({
    shouldReturnToHarbor,
    shouldAvoid,
    interceptAllowed,
    enemyContact,
  })
  const visibleCopyForbiddenHits = findForbiddenVisibleCopyHits([
    recommendedActionLabel,
    resultLabel,
  ].join(' '))

  return {
    policyVersion: 'naval_route_encounter_policy_v1',
    scope: 'naval_route_encounter_policy_only_not_service_action',
    encounterState,
    missionAllowed,
    combatExpected,
    interceptAllowed,
    shouldReturnToHarbor,
    shouldAvoid,
    riskScore,
    successChance,
    expectedDamageRange: {
      min: expectedDamageMin,
      max: expectedDamageMax,
    },
    recommendedActionLabel,
    resultLabel,
    visibleCopyForbiddenHits,
  }
}
