export type CityControlAdministrativeRole = 'state_government' | 'commandery_seat' | 'city'
export type AuthoritativeCityPlacementRole =
  | 'state_government'
  | 'commandery_seat'
  | 'county_city'
  | 'authoring_major_city_reference'

export type CityControlJudgmentInput = {
  cityId: string
  cityName: string
  administrativeRole?: CityControlAdministrativeRole
  organizationId: string
  sourceControlAuthorityId: string
  sourceControlProgressId: string
  nextStepLabel?: string
}

export type CityControlJudgmentReadback = {
  cityControlJudgmentId: string
  cityId: string
  cityName: string
  cityControlAdministrativeRole: CityControlAdministrativeRole
  cityControlJudgmentStatus: 'controlled'
  cityControlJudgmentKind: 'prefectureControlJudgment' | 'commanderyControlJudgment' | 'cityControlJudgment'
  cityControlScope: 'city_control_judgment_only_not_ownership_transfer'
  nextStepLabel: string
  ownershipTransferApplied: false
  playerOrganizationResult: string
}

export type CityControlLongTermPreconditionInput = {
  cityId: string
  cityName: string
  administrativeRole?: CityControlAdministrativeRole
  organizationId: string
  sourceControlAuthorityId: string
  sourceControlProgressId: string
  tickAdvanceCount?: number
  nextStepLabel?: string
}

export type CityControlLongTermPreconditionReadback = {
  longTermControlPreconditionId: string
  cityId: string
  cityName: string
  cityControlAdministrativeRole: CityControlAdministrativeRole
  sourceControlAuthorityId: string
  sourceControlProgressId: string
  organizationId: string
  longTermControlHeldTicks: number
  longTermControlRequiredTicks: number
  ownerTransferPreconditionReady: boolean
  ownershipTransferApplied: false
  nextStepLabel: string
  playerOrganizationResult: string
}

export type NationMidgameLongTermControlState = {
  longTermControlPreconditions: Record<string, CityControlLongTermPreconditionReadback>
}

export type CityControlJudgmentCoverageSample = Required<CityControlJudgmentInput>

export type CityControlAuthoritativeRoleResolution = {
  administrativeRole: CityControlAdministrativeRole | null
  matchedAuthoritativeRole: AuthoritativeCityPlacementRole | null
  sourceRoles: string[]
  unknownSourceRoles: string[]
  excludedFromFullTable: boolean
  excludeReason: string | null
}

export const CITY_CONTROL_JUDGMENT_COVERAGE_SAMPLES: CityControlJudgmentCoverageSample[] = [
  {
    cityId: 'jiaozhou_longbian',
    cityName: '龙编',
    administrativeRole: 'state_government',
    organizationId: 'player',
    sourceControlAuthorityId: 'control_authority_jiaozhou_longbian',
    sourceControlProgressId: 'control_progress_jiaozhou_longbian',
    nextStepLabel: '固守州府',
  },
  {
    cityId: 'yuzhou_qiao',
    cityName: '谯',
    administrativeRole: 'state_government',
    organizationId: 'player',
    sourceControlAuthorityId: 'control_authority_yuzhou_qiao',
    sourceControlProgressId: 'control_progress_yuzhou_qiao',
    nextStepLabel: '固守州府',
  },
  {
    cityId: 'wujun_wu',
    cityName: '吴',
    administrativeRole: 'commandery_seat',
    organizationId: 'player',
    sourceControlAuthorityId: 'control_authority_wujun_wu',
    sourceControlProgressId: 'control_progress_wujun_wu',
    nextStepLabel: '固守郡城',
  },
  {
    cityId: 'jiaozhou_panyu',
    cityName: '番禺',
    administrativeRole: 'commandery_seat',
    organizationId: 'player',
    sourceControlAuthorityId: 'control_authority_jiaozhou_panyu',
    sourceControlProgressId: 'control_progress_jiaozhou_panyu',
    nextStepLabel: '固守郡城',
  },
  {
    cityId: 'nanyang_xinye',
    cityName: '新野',
    administrativeRole: 'city',
    organizationId: 'player',
    sourceControlAuthorityId: 'control_authority_nanyang_xinye',
    sourceControlProgressId: 'control_progress_nanyang_xinye',
    nextStepLabel: '固守城池',
  },
  {
    cityId: 'jiaozhou_quyang',
    cityName: '曲阳',
    administrativeRole: 'city',
    organizationId: 'player',
    sourceControlAuthorityId: 'control_authority_jiaozhou_quyang',
    sourceControlProgressId: 'control_progress_jiaozhou_quyang',
    nextStepLabel: '固守城池',
  },
]

export const CITY_CONTROL_AUTHORITATIVE_ROLE_PRECEDENCE: readonly AuthoritativeCityPlacementRole[] = [
  'state_government',
  'commandery_seat',
  'county_city',
]

export function normalizeCityControlAdministrativeRole(role: unknown): CityControlAdministrativeRole {
  const normalized = String(role ?? '').trim()
  if (normalized === 'state_government') return 'state_government'
  if (normalized === 'commandery_seat') return 'commandery_seat'
  return 'city'
}

export function resolveCityControlAdministrativeRoleFromAuthoritativeRoles(
  roles: readonly string[],
): CityControlAuthoritativeRoleResolution {
  const sourceRoles = roles.map((role) => String(role ?? '').trim()).filter(Boolean)
  const roleSet = new Set(sourceRoles)
  const matchedAuthoritativeRole =
    CITY_CONTROL_AUTHORITATIVE_ROLE_PRECEDENCE.find((role) => roleSet.has(role)) ?? null
  const unknownSourceRoles = sourceRoles.filter(
    (role) =>
      role !== 'state_government' &&
      role !== 'commandery_seat' &&
      role !== 'county_city',
  )
  if (matchedAuthoritativeRole === 'state_government') {
    return {
      administrativeRole: 'state_government',
      matchedAuthoritativeRole,
      sourceRoles,
      unknownSourceRoles,
      excludedFromFullTable: false,
      excludeReason: null,
    }
  }
  if (matchedAuthoritativeRole === 'commandery_seat') {
    return {
      administrativeRole: 'commandery_seat',
      matchedAuthoritativeRole,
      sourceRoles,
      unknownSourceRoles,
      excludedFromFullTable: false,
      excludeReason: null,
    }
  }
  if (matchedAuthoritativeRole === 'county_city') {
    return {
      administrativeRole: 'city',
      matchedAuthoritativeRole,
      sourceRoles,
      unknownSourceRoles,
      excludedFromFullTable: false,
      excludeReason: null,
      }
  }
  const referenceOnly =
    sourceRoles.length > 0 &&
    sourceRoles.every((role) => role === 'authoring_major_city_reference')
  if (referenceOnly) {
    return {
      administrativeRole: null,
      matchedAuthoritativeRole: 'authoring_major_city_reference',
      sourceRoles,
      unknownSourceRoles: [],
      excludedFromFullTable: true,
      excludeReason: 'authoring_reference_only_marker_without_formal_control_role',
    }
  }
  return {
    administrativeRole: null,
    matchedAuthoritativeRole: null,
    sourceRoles,
    unknownSourceRoles,
    excludedFromFullTable: false,
    excludeReason: null,
  }
}

export function cityControlJudgmentKindForRole(
  role: CityControlAdministrativeRole,
): CityControlJudgmentReadback['cityControlJudgmentKind'] {
  if (role === 'state_government') return 'prefectureControlJudgment'
  if (role === 'commandery_seat') return 'commanderyControlJudgment'
  return 'cityControlJudgment'
}

export function buildCityControlJudgmentReadback(
  input: CityControlJudgmentInput,
  idSeed: string,
): CityControlJudgmentReadback {
  const cityId = input.cityId.trim()
  const cityName = input.cityName.trim()
  const role = normalizeCityControlAdministrativeRole(input.administrativeRole)
  const nextStepLabel = (input.nextStepLabel ?? '').trim() || (role === 'state_government' ? '固守州府' : role === 'commandery_seat' ? '固守郡城' : '固守城池')
  const kind = cityControlJudgmentKindForRole(role)
  const roleLabel = role === 'state_government' ? '州府' : role === 'commandery_seat' ? '郡城' : '城池'
  return {
    cityControlJudgmentId: `city_control_judgment_${cityId}_${idSeed}`,
    cityId,
    cityName,
    cityControlAdministrativeRole: role,
    cityControlJudgmentStatus: 'controlled',
    cityControlJudgmentKind: kind,
    cityControlScope: 'city_control_judgment_only_not_ownership_transfer',
    nextStepLabel,
    ownershipTransferApplied: false,
    playerOrganizationResult: `${cityName}${roleLabel}控制已判定，下一步${nextStepLabel}。`,
  }
}

export function requiredLongTermControlTicksForRole(role: CityControlAdministrativeRole): number {
  if (role === 'state_government') return 3
  if (role === 'commandery_seat') return 2
  return 2
}

export function buildCityControlLongTermPreconditionReadback(
  input: CityControlLongTermPreconditionInput,
  previous: CityControlLongTermPreconditionReadback | null,
): CityControlLongTermPreconditionReadback {
  const cityId = input.cityId.trim()
  const cityName = input.cityName.trim()
  const role = normalizeCityControlAdministrativeRole(input.administrativeRole)
  const sourceControlAuthorityId = input.sourceControlAuthorityId.trim()
  const sourceControlProgressId = input.sourceControlProgressId.trim()
  const organizationId = input.organizationId.trim()
  const tickAdvanceCount = Math.max(1, Math.floor(Number(input.tickAdvanceCount ?? 1) || 1))
  const longTermControlHeldTicks = (previous?.longTermControlHeldTicks ?? 0) + tickAdvanceCount
  const longTermControlRequiredTicks = requiredLongTermControlTicksForRole(role)
  const ownerTransferPreconditionReady = longTermControlHeldTicks >= longTermControlRequiredTicks
  const nextStepLabel =
    (input.nextStepLabel ?? '').trim() ||
    (ownerTransferPreconditionReady
      ? role === 'state_government'
        ? '准备交割'
        : role === 'commandery_seat'
          ? '巩固郡城'
          : '稳住城池'
      : role === 'state_government'
        ? '继续固守'
        : role === 'commandery_seat'
          ? '继续驻守'
          : '继续压稳')
  const roleLabel = role === 'state_government' ? '州府' : role === 'commandery_seat' ? '郡城' : '城池'
  const readinessLabel = ownerTransferPreconditionReady ? '已满足交割前置' : '正在累计长守'
  return {
    longTermControlPreconditionId:
      previous?.longTermControlPreconditionId ??
      `long_term_control_precondition_${cityId}_${organizationId}`,
    cityId,
    cityName,
    cityControlAdministrativeRole: role,
    sourceControlAuthorityId,
    sourceControlProgressId,
    organizationId,
    longTermControlHeldTicks,
    longTermControlRequiredTicks,
    ownerTransferPreconditionReady,
    ownershipTransferApplied: false,
    nextStepLabel,
    playerOrganizationResult: `${cityName}${roleLabel}${readinessLabel}，下一步${nextStepLabel}。`,
  }
}
