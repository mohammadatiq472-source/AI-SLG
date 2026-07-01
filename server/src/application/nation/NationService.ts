import type {
  FactionId,
  MapCityCluster,
  NationCapitalMigrationFailureCode,
  NationCapitalMigrationRequest,
  NationCapitalMigrationResponse,
  NationEmpireRequirementSnapshot,
  NationEmpireUpgradeFailureCode,
  NationEmpireUpgradeRequest,
  NationEmpireUpgradeResponse,
  NationFoundFailureCode,
  NationFoundRequest,
  NationFoundRequirementSnapshot,
  NationFoundResponse,
  NationProfile,
  NationProfileChangedField,
  NationTier,
  NationWarObjectiveReadModel,
  NationWarObjectiveReadModelItem,
  OrganizationDiplomacyAuthorityActor,
  OrganizationDiplomacyAuthorityReadModel,
  OrganizationDiplomacyRelation,
  OrganizationMembershipReadModel,
  OrganizationMembershipReadModelItem,
  NationProfileUpdateRequest,
  NationProfileUpdateResponse,
  NationProfilesResponse,
  Tile,
  WorldState,
} from '../../../../shared/contracts/game'
import { getSessionStatus } from '../../multiplayer/SessionManager'
import {
  applyFoundedNationProfileToWorld,
  applyNationCapitalMigrationToWorld,
  applyNationEmpireUpgradeToWorld,
  getWorldStateReadonly,
  resolveAllianceOfficerAuthorityForSession,
  type WorldActionSessionAuthorityContext,
} from '../world/WorldService'

const DEFAULT_COLOR_PALETTE = ['#4c8bd9', '#d06a55', '#63a375', '#b17acc', '#d7a94d', '#5db9b2']
const NATION_RENAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000
const ALLIANCE_EMPIRE_UPGRADE_PERMISSION = 'upgrade_empire'
const ALLIANCE_NATION_PROFILE_PERMISSION = 'manage_nation_profile'
const ALLIANCE_DIPLOMACY_PERMISSION = 'manage_diplomacy'

export const NATION_FOUND_REQUIRED_ALLIANCE_LEVEL = 20
export const NATION_FOUND_REQUIRED_COMMANDERY_CITY_COUNT = 1
export const NATION_EMPIRE_REQUIRED_ALLIANCE_LEVEL = 90
export const NATION_EMPIRE_REQUIRED_STATE_CAPITAL_COUNT = 1
export const NATION_EMPIRE_REQUIRED_COMMANDERY_CITY_COUNT = 10
export const NATION_EMPIRE_UPGRADE_COST_JADE = 200
export const NATION_CAPITAL_MIGRATION_COST_JADE = 200

const nationProfiles = new Map<FactionId, NationProfile>()

function resolveNationPreset(factionId: FactionId) {
  const paletteIndex = Math.abs(hashFactionId(factionId)) % DEFAULT_COLOR_PALETTE.length
  return {
    nationName: `Nation ${factionId}`,
    color: DEFAULT_COLOR_PALETTE[paletteIndex],
  }
}

export function getNationProfiles(): NationProfilesResponse {
  const world = getWorldStateReadonly()
  const items: NationProfile[] = Object.keys(world.factions).map((factionId) =>
    structuredClone(getNationProfileForWorld(world, factionId)),
  )

  return {
    items,
    fetchedAt: new Date().toISOString(),
  }
}

function hashFactionId(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return hash
}

export function getNationProfileForWorld(world: WorldState, factionId: FactionId): NationProfile {
  const profile = ensureNationProfile(factionId)
  const faction = world.factions[factionId]
  const worldBackedProfile: NationProfile = {
    ...profile,
    nationName: faction?.nationName ?? faction?.organizationName ?? profile.nationName,
    tier: faction?.nationTier ?? (faction?.organizationKind === 'nation' ? 'kingdom' : profile.tier),
    color: (faction?.colorHex ?? faction?.nationColorHex ?? profile.color).toLowerCase(),
    capitalTileId: faction?.nationCapitalTileId ?? profile.capitalTileId,
    capitalName: faction?.nationCapitalName ?? profile.capitalName,
    empireFoundedAt: faction?.nationEmpireFoundedAt ?? profile.empireFoundedAt,
    empireUpgradeCostJade: faction?.nationEmpireUpgradeCostJade ?? profile.empireUpgradeCostJade,
    renameCooldownUntil: faction?.nationRenameCooldownUntil,
    historicalNames: Array.isArray(faction?.nationNameHistory)
      ? structuredClone(faction.nationNameHistory)
      : [],
    auditLog: Array.isArray(faction?.nationProfileAuditLog)
      ? structuredClone(faction.nationProfileAuditLog)
      : [],
  }
  const synced = syncNationCapital(world, worldBackedProfile)

  // Compute territory stats at read time
  let territoryTileCount = 0
  let controlledCityCount = 0
  let controlledResourceCount = 0
  for (const tile of world.map.tiles) {
    if (tile.owner === factionId) {
      territoryTileCount++
      if (tile.type === 'city') controlledCityCount++
      if (tile.type === 'resource') controlledResourceCount++
    }
  }
  synced.territoryTileCount = territoryTileCount
  synced.controlledCityCount = controlledCityCount
  synced.controlledResourceCount = controlledResourceCount

  return synced
}

export function foundNation(
  request: NationFoundRequest,
  authorityContext?: WorldActionSessionAuthorityContext,
): NationFoundResponse {
  const world = getWorldStateReadonly()
  const faction = world.factions[request.factionId]
  if (!faction) {
    throw new Error(`Unsupported factionId: ${request.factionId}`)
  }

  const profile = getNationProfileForWorld(world, request.factionId)
  const requirement = buildNationFoundRequirementSnapshot(world, request.factionId)
  const failureFromSession = resolveNationFoundSessionFailure(request.factionId, authorityContext)
  if (failureFromSession) {
    return buildNationFoundFailureResponse(failureFromSession, profile, requirement)
  }

  const authorityResolution = resolveAllianceOfficerAuthorityForSession(
    request.factionId,
    authorityContext,
    world,
    request.actorCommanderId,
    ALLIANCE_NATION_PROFILE_PERMISSION,
  )
  if (!authorityResolution) {
    return buildNationFoundFailureResponse('nation_found_forbidden', profile, requirement)
  }

  if (faction.organizationKind === 'nation') {
    return buildNationFoundFailureResponse('nation_found_already_nation', profile, requirement)
  }

  const requirementFailure = resolveNationFoundRequirementFailure(requirement)
  if (requirementFailure) {
    return buildNationFoundFailureResponse(requirementFailure, profile, requirement)
  }

  const capitalResolution = resolveFoundingCapitalTile(world, request.factionId, request.capitalTileId)
  if (capitalResolution.failureCode || !capitalResolution.tile) {
    return buildNationFoundFailureResponse(capitalResolution.failureCode ?? 'nation_found_invalid_capital', profile, requirement)
  }

  const now = new Date().toISOString()

  const colorConflict = findNationColorConflict(world, request.factionId, request.color)
  if (colorConflict) {
    return buildNationFoundFailureResponse('nation_color_conflict', profile, requirement, {
      conflictingFactionId: colorConflict.factionId,
      conflictingNationName: colorConflict.nationName,
    })
  }

  const nextProfile: NationProfile = {
    ...profile,
    nationName: request.nationName.trim(),
    tier: 'kingdom',
    color: request.color.trim().toLowerCase(),
    capitalTileId: capitalResolution.tile.id,
    capitalName: capitalResolution.tile.name,
    updatedAt: now,
    foundedAt: profile.foundedAt || now,
  }

  nationProfiles.set(request.factionId, nextProfile)
  applyFoundedNationProfileToWorld(nextProfile, {
    sourceAction: 'foundNation',
    previousNationName: faction.nationName,
    previousColor: faction.colorHex,
    previousCapitalTileId: faction.nationCapitalTileId,
    previousCapitalName: faction.nationCapitalName,
    changedFields: ['nationName', 'color', 'capital'],
    authorityGrantId: authorityResolution.grant.id,
    actorCommanderId: authorityResolution.commander.id,
    actorCommanderName: authorityResolution.commander.name,
    actorSessionId: authorityContext?.sessionId,
    actorPlayerName: authorityContext?.playerName,
  })
  const syncedProfile = getNationProfileForWorld(getWorldStateReadonly(), request.factionId)
  nationProfiles.set(request.factionId, syncedProfile)

  return {
    ok: true,
    nation: structuredClone(syncedProfile),
    message: `${syncedProfile.nationName} founded successfully.`,
    requirement: {
      ...requirement,
      met: true,
    },
    authorityGrantId: authorityResolution.grant.id,
    actorCommanderId: authorityResolution.commander.id,
    actorCommanderName: authorityResolution.commander.name,
    actorPlayerName: authorityContext?.playerName,
  }
}

export function getOrganizationMembershipReadModel(factionId: FactionId): OrganizationMembershipReadModel {
  const world = getWorldStateReadonly()
  const faction = world.factions[factionId]
  if (!faction) {
    throw new Error(`Unsupported factionId: ${factionId}`)
  }

  const organizationKind = resolveOrganizationKind(faction)
  const organizationId = resolveOrganizationId(faction, factionId)
  const organizationName = resolveOrganizationName(faction, factionId, organizationKind)
  const members: OrganizationMembershipReadModelItem[] = []

  const sessionStatus = getSessionStatus(Object.keys(world.factions))
  for (const player of sessionStatus.players.filter((candidate) => candidate.factionId === factionId)) {
    members.push({
      memberId: `player:${player.sessionId}`,
      memberKind: 'player',
      displayName: player.playerName,
      factionId,
      organizationId,
      organizationKind,
      organizationName,
      authoritySource: 'session_player',
      playerName: player.playerName,
    })
  }

  for (const aiPlayer of faction.aiPlayers ?? []) {
    members.push({
      memberId: `ai_player:${aiPlayer.id}`,
      memberKind: 'ai_player',
      displayName: aiPlayer.name,
      factionId,
      organizationId,
      organizationKind,
      organizationName,
      authoritySource: 'world_faction_ai_players',
      aiPlayerId: aiPlayer.id,
    })
  }

  for (const grant of Object.values(world.alliance.officerAuthority?.grants ?? {})) {
    if (grant.factionId !== factionId || grant.status !== 'active') {
      continue
    }
    members.push({
      memberId: `alliance_officer:${grant.id}`,
      memberKind: 'alliance_officer',
      displayName: grant.principalPlayerName || grant.commanderId,
      factionId,
      organizationId,
      organizationKind,
      organizationName,
      authoritySource: 'alliance_officer_authority_table',
      commanderId: grant.commanderId,
      playerName: grant.principalPlayerName,
      permissions: [...grant.permissions],
    })
  }

  members.push({
    memberId: `faction_attribution:${factionId}`,
    memberKind: 'faction_attribution',
    displayName: organizationName,
    factionId,
    organizationId,
    organizationKind,
    organizationName,
    authoritySource: 'world_faction_organization_attribution',
  })

  return {
    contractId: 'organization_membership_authority_v1',
    factionId,
    organizationId,
    organizationKind,
    organizationName,
    nationTier: faction.nationTier,
    generatedAtWorldVersion: world.worldVersion,
    authoritySource: 'world_faction_alliance_membership_read_model',
    factionOrganizationAttribution: {
      organizationId,
      organizationKind,
      organizationName,
      nationTier: faction.nationTier,
    },
    members,
  }
}

export function getOrganizationDiplomacyAuthorityReadModel(
  factionId: FactionId,
): OrganizationDiplomacyAuthorityReadModel {
  const world = getWorldStateReadonly()
  const faction = world.factions[factionId]
  if (!faction) {
    throw new Error(`Unsupported factionId: ${factionId}`)
  }

  const organizationKind = resolveOrganizationKind(faction)
  const organizationId = resolveOrganizationId(faction, factionId)
  const organizationName = resolveOrganizationName(faction, factionId, organizationKind)
  const actors: OrganizationDiplomacyAuthorityActor[] = [
    {
      actorId: `organization:${organizationId}`,
      actorKind: 'organization_subject',
      displayName: organizationName,
      canProposeDiplomacy: true,
      authoritySource: 'world_faction_organization_attribution',
    },
  ]

  for (const grant of Object.values(world.alliance.officerAuthority?.grants ?? {})) {
    if (grant.factionId !== factionId || grant.status !== 'active') {
      continue
    }
    const hasDiplomacyPermission = grant.permissions.includes(ALLIANCE_DIPLOMACY_PERMISSION)
    actors.push({
      actorId: `alliance_officer:${grant.id}`,
      actorKind: 'alliance_officer',
      displayName: grant.principalPlayerName || grant.commanderId,
      canProposeDiplomacy: hasDiplomacyPermission,
      authoritySource: 'alliance_officer_authority_table',
      commanderId: grant.commanderId,
      roleId: grant.roleId,
      permission: hasDiplomacyPermission ? ALLIANCE_DIPLOMACY_PERMISSION : undefined,
      principalPlayerName: grant.principalPlayerName,
    })
  }

  const relations: OrganizationDiplomacyRelation[] = Object.entries(world.factions)
    .filter(([targetFactionId]) => targetFactionId !== factionId)
    .map(([targetFactionId, targetFaction]) => {
      const targetOrganizationKind = resolveOrganizationKind(targetFaction)
      const targetOrganizationId = resolveOrganizationId(targetFaction, targetFactionId)
      const targetOrganizationName = resolveOrganizationName(targetFaction, targetFactionId, targetOrganizationKind)
      const canPropose = targetOrganizationId !== organizationId
      return {
        targetFactionId,
        targetOrganizationId,
        targetOrganizationKind,
        targetOrganizationName,
        canPropose,
        reason: canPropose ? 'cross_organization' : 'same_organization_blocked',
      }
    })

  return {
    contractId: 'organization_diplomacy_authority_v1',
    factionId,
    organizationId,
    organizationKind,
    organizationName,
    nationTier: faction.nationTier,
    subjectKind: organizationKind,
    generatedAtWorldVersion: world.worldVersion,
    authoritySource: 'world_faction_organization_diplomacy_read_model',
    diplomacySubjectBoundary: 'organization_not_ai_player',
    proposalRoute: '/api/diplomacy/propose',
    requiredPermission: ALLIANCE_DIPLOMACY_PERMISSION,
    actors,
    relations,
  }
}

export function getNationWarObjectiveReadModel(factionId: FactionId): NationWarObjectiveReadModel {
  const world = getWorldStateReadonly()
  const faction = world.factions[factionId]
  if (!faction) {
    throw new Error(`Unsupported factionId: ${factionId}`)
  }

  const organizationKind = resolveOrganizationKind(faction)
  const organizationName = resolveOrganizationName(faction, factionId, organizationKind)
  const controlledCityClusters = getControlledCityClusters(world, factionId)
  const controlledStateCapitalCount = controlledCityClusters.filter((cluster) =>
    isStateCapitalCluster(cluster, new Map(world.map.tiles.map((tile) => [tile.id, tile]))),
  ).length
  const luoyang = summarizeLuoyangControl(world, factionId)
  const isNation = organizationKind === 'nation'
  const isEmpire = isNation && faction.nationTier === 'empire'

  const objectives: NationWarObjectiveReadModelItem[] = [
    {
      objectiveId: 'region_control',
      title: '区域攻伐',
      description: '以真实城池 / 郡县归属统计推进国家攻伐，聚焦同盟战争与国家扩张。',
      status: controlledCityClusters.length > 0 ? 'achieved' : 'active',
      authority: 'real_authority',
      currentCount: controlledCityClusters.length,
      requiredCount: 1,
      sourceRefs: controlledCityClusters.slice(0, 3).map((cluster) => ({ kind: 'region', id: cluster.id })),
    },
    {
      objectiveId: 'state_capital',
      title: '州治控制',
      description: '控制州治后，国家目标进入王国 / 帝国终局链。',
      status: controlledStateCapitalCount > 0 ? 'achieved' : 'active',
      authority: 'real_authority',
      currentCount: controlledStateCapitalCount,
      requiredCount: 1,
      sourceRefs: [{ kind: 'state', id: 'state_capital_control' }],
    },
    {
      objectiveId: 'luoyang_control',
      title: '洛阳控制',
      description: '围绕洛阳控制与连续持有计数证明终局胜利条件。',
      status: luoyang.held ? 'achieved' : 'active',
      authority: 'real_authority',
      currentCount: luoyang.holdTicks,
      requiredCount: 15,
      sourceRefs: [{ kind: 'luoyang', id: luoyang.sourceId }],
    },
    {
      objectiveId: 'empire_status',
      title: '帝国成功态',
      description: '王国满足正式升级条件后进入帝国身份，作为国家终局链的硬门槛。',
      status: isEmpire ? 'achieved' : (isNation ? 'active' : 'locked'),
      authority: isNation ? 'real_authority' : 'locked',
      currentCount: isEmpire ? 1 : 0,
      requiredCount: 1,
      sourceRefs: [{ kind: 'nation', id: `${factionId}:nationTier` }],
    },
    {
      objectiveId: 'east_han_unification',
      title: '东汉十三州统一',
      description: '以十三州目标收束同盟、王国、帝国到统一的国家攻伐链。',
      status: controlledCityClusters.length >= 13 && isEmpire ? 'achieved' : (isNation ? 'active' : 'locked'),
      authority: isNation ? 'read_model_only' : 'locked',
      currentCount: Math.min(controlledCityClusters.length, 13),
      requiredCount: 13,
      requiredStateCount: 13,
      sourceRefs: [{ kind: 'eastHanThirteenStates', id: 'east_han_thirteen_states' }],
    },
  ]

  return {
    contractId: 'nation_war_objective_read_model_v1',
    factionId,
    organizationKind,
    organizationName,
    nationTier: faction.nationTier,
    generatedAtWorldVersion: world.worldVersion,
    authoritySource: 'nation_world_state_victory_objective_read_model',
    objectives,
  }
}

export function updateNationProfile(request: NationProfileUpdateRequest): NationProfileUpdateResponse {
  const world = getWorldStateReadonly()
  const faction = world.factions[request.factionId]
  if (!faction) {
    throw new Error(`Unsupported factionId: ${request.factionId}`)
  }
  if (faction.organizationKind !== 'nation') {
    throw new Error(`Faction has not founded a nation: ${request.factionId}`)
  }

  const profile = getNationProfileForWorld(world, request.factionId)
  const now = new Date().toISOString()
  const nowMs = Date.now()
  const normalizedName = request.nationName?.trim()
  const normalizedColor = request.color?.trim().toLowerCase()
  const nextNationName = normalizedName || profile.nationName
  const nextColor = normalizedColor || profile.color
  const nameChanged = nextNationName !== profile.nationName
  const colorChanged = nextColor !== profile.color

  if (nameChanged || colorChanged) {
    return {
      ok: false,
      message: 'Nation name and color are locked after founding. Use capital migration to reselect the capital, nation name, and color.',
      failureCode: 'nation_profile_locked_until_capital_migration',
      nation: structuredClone(profile),
    }
  }

  if (nameChanged && profile.renameCooldownUntil) {
    const cooldownUntilMs = Date.parse(profile.renameCooldownUntil)
    if (Number.isFinite(cooldownUntilMs) && cooldownUntilMs > nowMs) {
      return {
        ok: false,
        message: `Nation rename is cooling down until ${profile.renameCooldownUntil}.`,
        failureCode: 'nation_rename_cooldown',
        retryAfterMs: cooldownUntilMs - nowMs,
        nation: structuredClone(profile),
      }
    }
  }

  if (colorChanged) {
    const conflict = findNationColorConflict(world, request.factionId, nextColor)
    if (conflict) {
      return {
        ok: false,
        message: `Nation color ${nextColor} is already used by ${conflict.nationName}.`,
        failureCode: 'nation_color_conflict',
        conflictingFactionId: conflict.factionId,
        conflictingNationName: conflict.nationName,
        nation: structuredClone(profile),
      }
    }
  }

  const changedFields: Array<'nationName' | 'color'> = []
  if (nameChanged) changedFields.push('nationName')
  if (colorChanged) changedFields.push('color')
  const renameCooldownUntil = nameChanged
    ? new Date(nowMs + NATION_RENAME_COOLDOWN_MS).toISOString()
    : profile.renameCooldownUntil
  const nextProfile: NationProfile = {
    ...profile,
    nationName: nextNationName,
    color: nextColor,
    renameCooldownUntil,
    updatedAt: now,
  }

  nationProfiles.set(request.factionId, nextProfile)
  applyFoundedNationProfileToWorld(nextProfile, {
    sourceAction: 'updateNationProfile',
    previousNationName: profile.nationName,
    previousColor: profile.color,
    changedFields,
    renameCooldownUntil,
  })
  const syncedProfile = getNationProfileForWorld(getWorldStateReadonly(), request.factionId)

  return {
    ok: true,
    nation: structuredClone(syncedProfile),
    message: `${syncedProfile.nationName} profile updated successfully.`,
  }
}

export function migrateNationCapital(
  request: NationCapitalMigrationRequest,
  authorityContext?: WorldActionSessionAuthorityContext,
): NationCapitalMigrationResponse {
  const world = getWorldStateReadonly()
  const faction = world.factions[request.factionId]
  if (!faction) {
    throw new Error(`Unsupported factionId: ${request.factionId}`)
  }

  const profile = getNationProfileForWorld(world, request.factionId)
  const failureFromSession = resolveNationCapitalMigrationSessionFailure(request.factionId, authorityContext)
  if (failureFromSession) {
    return buildNationCapitalMigrationFailureResponse(failureFromSession, profile)
  }

  const authorityResolution = resolveAllianceOfficerAuthorityForSession(
    request.factionId,
    authorityContext,
    world,
    request.actorCommanderId,
    ALLIANCE_NATION_PROFILE_PERMISSION,
  )
  if (!authorityResolution) {
    return buildNationCapitalMigrationFailureResponse('nation_capital_migration_forbidden', profile)
  }

  if (faction.organizationKind !== 'nation') {
    return buildNationCapitalMigrationFailureResponse('nation_capital_migration_requires_nation', profile)
  }

  const capitalResolution = resolveMigrationCapitalTile(world, request.factionId, request.capitalTileId)
  if (capitalResolution.failureCode || !capitalResolution.tile) {
    return buildNationCapitalMigrationFailureResponse(capitalResolution.failureCode ?? 'nation_capital_migration_invalid_capital', profile)
  }

  const nowMs = Date.now()
  const normalizedName = request.nationName.trim()
  const normalizedColor = request.color.trim().toLowerCase()
  const nameChanged = normalizedName !== profile.nationName
  const colorChanged = normalizedColor !== profile.color
  const capitalChanged = capitalResolution.tile.id !== profile.capitalTileId

  if (nameChanged && profile.renameCooldownUntil) {
    const cooldownUntilMs = Date.parse(profile.renameCooldownUntil)
    if (Number.isFinite(cooldownUntilMs) && cooldownUntilMs > nowMs) {
      return buildNationCapitalMigrationFailureResponse('nation_capital_migration_rename_cooldown', profile, {
        retryAfterMs: cooldownUntilMs - nowMs,
      })
    }
  }

  if (!capitalChanged) {
    return buildNationCapitalMigrationFailureResponse('nation_capital_migration_capital_unchanged', profile)
  }

  if (colorChanged) {
    const conflict = findNationColorConflict(world, request.factionId, normalizedColor)
    if (conflict) {
      return buildNationCapitalMigrationFailureResponse('nation_capital_migration_color_conflict', profile, {
        conflictingFactionId: conflict.factionId,
        conflictingNationName: conflict.nationName,
      })
    }
  }

  const previousJade = Math.max(0, Math.floor(Number(faction.jade ?? 0)))
  if (previousJade < NATION_CAPITAL_MIGRATION_COST_JADE) {
    return buildNationCapitalMigrationFailureResponse('nation_capital_migration_insufficient_jade', profile, {
      cost: {
        jade: NATION_CAPITAL_MIGRATION_COST_JADE,
        before: previousJade,
        after: previousJade,
      },
    })
  }

  const nextJade = previousJade - NATION_CAPITAL_MIGRATION_COST_JADE
  const changedFields: NationProfileChangedField[] = ['capital', 'jade']
  if (nameChanged) changedFields.push('nationName')
  if (colorChanged) changedFields.push('color')
  const renameCooldownUntil = nameChanged
    ? new Date(nowMs + NATION_RENAME_COOLDOWN_MS).toISOString()
    : profile.renameCooldownUntil ?? new Date(nowMs + NATION_RENAME_COOLDOWN_MS).toISOString()
  const nextProfile: NationProfile = {
    ...profile,
    nationName: normalizedName,
    color: normalizedColor,
    capitalTileId: capitalResolution.tile.id,
    capitalName: capitalResolution.tile.name,
    renameCooldownUntil,
    updatedAt: new Date(nowMs).toISOString(),
  }

  nationProfiles.set(request.factionId, nextProfile)
  applyNationCapitalMigrationToWorld(nextProfile, {
    previousNationName: profile.nationName,
    previousColor: profile.color,
    previousCapitalTileId: profile.capitalTileId,
    previousCapitalName: profile.capitalName,
    changedFields,
    renameCooldownUntil,
    jadeCost: NATION_CAPITAL_MIGRATION_COST_JADE,
    previousJade,
    nextJade,
    authorityGrantId: authorityResolution.grant.id,
    actorCommanderId: authorityResolution.commander.id,
    actorCommanderName: authorityResolution.commander.name,
    actorSessionId: authorityContext?.sessionId,
    actorPlayerName: authorityContext?.playerName,
  })
  const syncedProfile = getNationProfileForWorld(getWorldStateReadonly(), request.factionId)
  nationProfiles.set(request.factionId, syncedProfile)

  return {
    ok: true,
    nation: structuredClone(syncedProfile),
    message: `${syncedProfile.nationName} capital migrated successfully.`,
    cost: {
      jade: NATION_CAPITAL_MIGRATION_COST_JADE,
      before: previousJade,
      after: nextJade,
    },
    authorityGrantId: authorityResolution.grant.id,
    actorCommanderId: authorityResolution.commander.id,
    actorCommanderName: authorityResolution.commander.name,
    actorPlayerName: authorityContext?.playerName,
  }
}

export function upgradeNationToEmpire(
  request: NationEmpireUpgradeRequest,
  authorityContext?: WorldActionSessionAuthorityContext,
): NationEmpireUpgradeResponse {
  const world = getWorldStateReadonly()
  const faction = world.factions[request.factionId]
  if (!faction) {
    throw new Error(`Unsupported factionId: ${request.factionId}`)
  }

  const profile = getNationProfileForWorld(world, request.factionId)
  const requirement = buildNationEmpireRequirementSnapshot(world, request.factionId)
  const failureFromSession = resolveNationEmpireSessionFailure(request.factionId, authorityContext)
  if (failureFromSession) {
    return buildNationEmpireFailureResponse(failureFromSession, profile, requirement)
  }

  const authorityResolution = resolveAllianceOfficerAuthorityForSession(
    request.factionId,
    authorityContext,
    world,
    request.actorCommanderId,
    ALLIANCE_EMPIRE_UPGRADE_PERMISSION,
  )
  if (!authorityResolution) {
    return buildNationEmpireFailureResponse('nation_empire_forbidden', profile, requirement)
  }

  if (faction.organizationKind !== 'nation') {
    return buildNationEmpireFailureResponse('nation_empire_requires_kingdom', profile, requirement)
  }

  const currentTier: NationTier = faction.nationTier ?? profile.tier ?? 'kingdom'
  if (currentTier === 'empire') {
    return buildNationEmpireFailureResponse('nation_empire_already_empire', profile, requirement)
  }

  const requirementFailure = resolveNationEmpireRequirementFailure(requirement)
  if (requirementFailure) {
    return buildNationEmpireFailureResponse(requirementFailure, profile, requirement)
  }

  const mutation = applyNationEmpireUpgradeToWorld({
    factionId: request.factionId,
    costJade: NATION_EMPIRE_UPGRADE_COST_JADE,
    previousTier: currentTier,
    nextTier: 'empire',
    authorityGrantId: authorityResolution.grant.id,
    actorCommanderId: authorityResolution.commander.id,
    actorCommanderName: authorityResolution.commander.name,
    actorSessionId: authorityContext?.sessionId,
    actorPlayerName: authorityContext?.playerName,
  })
  const syncedProfile = getNationProfileForWorld(getWorldStateReadonly(), request.factionId)
  nationProfiles.set(request.factionId, syncedProfile)

  return {
    ok: true,
    nation: structuredClone(syncedProfile),
    message: `${syncedProfile.nationName} upgraded to empire successfully.`,
    requirement: {
      ...requirement,
      jade: mutation.nextJade,
      met: true,
    },
    cost: {
      jade: NATION_EMPIRE_UPGRADE_COST_JADE,
      before: mutation.previousJade,
      after: mutation.nextJade,
    },
    authorityGrantId: authorityResolution.grant.id,
    actorCommanderId: authorityResolution.commander.id,
    actorCommanderName: authorityResolution.commander.name,
    actorPlayerName: authorityContext?.playerName,
  }
}

export function buildNationFoundRequirementSnapshot(
  world: WorldState,
  factionId: FactionId,
): NationFoundRequirementSnapshot {
  const allianceLevel = Math.max(0, Math.floor(Number(world.alliance.level ?? 1)))
  const cityStats = summarizeControlledEmpireCities(world, factionId)
  const snapshot: NationFoundRequirementSnapshot = {
    requiredAllianceLevel: NATION_FOUND_REQUIRED_ALLIANCE_LEVEL,
    allianceLevel,
    requiredCommanderyCityCount: NATION_FOUND_REQUIRED_COMMANDERY_CITY_COUNT,
    controlledCommanderyCityCount: cityStats.controlledCommanderyCityCount,
    met: false,
  }
  snapshot.met = resolveNationFoundRequirementFailure(snapshot) === null
  return snapshot
}

function resolveNationFoundSessionFailure(
  factionId: FactionId,
  authorityContext?: WorldActionSessionAuthorityContext,
): NationFoundFailureCode | null {
  if (!authorityContext) {
    return 'nation_found_session_required'
  }
  if (authorityContext.factionId !== factionId) {
    return 'nation_found_session_faction_mismatch'
  }
  return null
}

function resolveNationFoundRequirementFailure(
  requirement: NationFoundRequirementSnapshot,
): NationFoundFailureCode | null {
  if (requirement.allianceLevel < requirement.requiredAllianceLevel) {
    return 'nation_found_level_required'
  }
  if (requirement.controlledCommanderyCityCount < requirement.requiredCommanderyCityCount) {
    return 'nation_found_commandery_required'
  }
  return null
}

function buildNationFoundFailureResponse(
  failureCode: NationFoundFailureCode,
  profile: NationProfile,
  requirement: NationFoundRequirementSnapshot,
  extras: Partial<NationFoundResponse> = {},
): NationFoundResponse {
  return {
    ok: false,
    nation: structuredClone(profile),
    message: nationFoundFailureMessage(failureCode, requirement),
    failureCode,
    requirement,
    ...extras,
  }
}

function nationFoundFailureMessage(
  failureCode: NationFoundFailureCode,
  requirement: NationFoundRequirementSnapshot,
) {
  switch (failureCode) {
    case 'nation_found_session_required':
      return 'Nation founding requires a player session token.'
    case 'nation_found_session_faction_mismatch':
      return 'Nation founding session faction does not match the target faction.'
    case 'nation_found_forbidden':
      return 'Nation founding requires alliance officer nation-profile authority.'
    case 'nation_found_already_nation':
      return 'Faction has already founded a kingdom or empire.'
    case 'nation_found_level_required':
      return `Alliance level ${requirement.allianceLevel}/${requirement.requiredAllianceLevel} is required to found a kingdom.`
    case 'nation_found_commandery_required':
      return `Controlled commandery cities ${requirement.controlledCommanderyCityCount}/${requirement.requiredCommanderyCityCount} are required to found a kingdom.`
    case 'nation_found_invalid_capital':
      return 'Nation founding requires a selected commandery city capital.'
    case 'nation_found_capital_not_controlled':
      return 'Nation founding capital must be controlled by the target faction.'
    case 'nation_color_conflict':
      return 'Nation color is already occupied by another nation.'
  }
}

export function buildNationEmpireRequirementSnapshot(
  world: WorldState,
  factionId: FactionId,
): NationEmpireRequirementSnapshot {
  const faction = world.factions[factionId]
  const allianceLevel = Math.max(0, Math.floor(Number(world.alliance.level ?? 1)))
  const cityStats = summarizeControlledEmpireCities(world, factionId)
  const jade = Math.max(0, Math.floor(Number(faction?.jade ?? 0)))
  const snapshot: NationEmpireRequirementSnapshot = {
    requiredAllianceLevel: NATION_EMPIRE_REQUIRED_ALLIANCE_LEVEL,
    allianceLevel,
    requiredStateCapitalCount: NATION_EMPIRE_REQUIRED_STATE_CAPITAL_COUNT,
    controlledStateCapitalCount: cityStats.controlledStateCapitalCount,
    requiredCommanderyCityCount: NATION_EMPIRE_REQUIRED_COMMANDERY_CITY_COUNT,
    controlledCommanderyCityCount: cityStats.controlledCommanderyCityCount,
    costJade: NATION_EMPIRE_UPGRADE_COST_JADE,
    jade,
    met: false,
  }
  snapshot.met = resolveNationEmpireRequirementFailure(snapshot) === null
  return snapshot
}

function resolveNationEmpireSessionFailure(
  factionId: FactionId,
  authorityContext?: WorldActionSessionAuthorityContext,
): NationEmpireUpgradeFailureCode | null {
  if (!authorityContext) {
    return 'nation_empire_session_required'
  }
  if (authorityContext.factionId !== factionId) {
    return 'nation_empire_session_faction_mismatch'
  }
  return null
}

function resolveNationEmpireRequirementFailure(
  requirement: NationEmpireRequirementSnapshot,
): NationEmpireUpgradeFailureCode | null {
  if (requirement.allianceLevel < requirement.requiredAllianceLevel) {
    return 'nation_empire_level_required'
  }
  if (requirement.controlledStateCapitalCount < requirement.requiredStateCapitalCount) {
    return 'nation_empire_state_capital_required'
  }
  if (requirement.controlledCommanderyCityCount < requirement.requiredCommanderyCityCount) {
    return 'nation_empire_commandery_required'
  }
  if (requirement.jade < requirement.costJade) {
    return 'nation_empire_insufficient_jade'
  }
  return null
}

function buildNationEmpireFailureResponse(
  failureCode: NationEmpireUpgradeFailureCode,
  profile: NationProfile,
  requirement: NationEmpireRequirementSnapshot,
): NationEmpireUpgradeResponse {
  return {
    ok: false,
    nation: structuredClone(profile),
    message: nationEmpireFailureMessage(failureCode, requirement),
    failureCode,
    requirement,
  }
}

function nationEmpireFailureMessage(
  failureCode: NationEmpireUpgradeFailureCode,
  requirement: NationEmpireRequirementSnapshot,
) {
  switch (failureCode) {
    case 'nation_empire_session_required':
      return 'Empire upgrade requires a player session token.'
    case 'nation_empire_session_faction_mismatch':
      return 'Empire upgrade session faction does not match the target faction.'
    case 'nation_empire_forbidden':
      return 'Empire upgrade requires an alliance officer authority grant.'
    case 'nation_empire_requires_kingdom':
      return 'Empire upgrade requires an existing kingdom.'
    case 'nation_empire_already_empire':
      return 'Nation is already an empire.'
    case 'nation_empire_level_required':
      return `Alliance level ${requirement.allianceLevel}/${requirement.requiredAllianceLevel} is required for empire upgrade.`
    case 'nation_empire_state_capital_required':
      return `Controlled state capital ${requirement.controlledStateCapitalCount}/${requirement.requiredStateCapitalCount} is required for empire upgrade.`
    case 'nation_empire_commandery_required':
      return `Controlled commandery cities ${requirement.controlledCommanderyCityCount}/${requirement.requiredCommanderyCityCount} are required for empire upgrade.`
    case 'nation_empire_insufficient_jade':
      return `Jade ${requirement.jade}/${requirement.costJade} is required for empire upgrade.`
  }
}

function resolveNationCapitalMigrationSessionFailure(
  factionId: FactionId,
  authorityContext?: WorldActionSessionAuthorityContext,
): NationCapitalMigrationFailureCode | null {
  if (!authorityContext) {
    return 'nation_capital_migration_session_required'
  }
  if (authorityContext.factionId !== factionId) {
    return 'nation_capital_migration_session_faction_mismatch'
  }
  return null
}

function buildNationCapitalMigrationFailureResponse(
  failureCode: NationCapitalMigrationFailureCode,
  profile: NationProfile,
  extras: Partial<NationCapitalMigrationResponse> = {},
): NationCapitalMigrationResponse {
  return {
    ok: false,
    nation: structuredClone(profile),
    message: nationCapitalMigrationFailureMessage(failureCode),
    failureCode,
    ...extras,
  }
}

function nationCapitalMigrationFailureMessage(failureCode: NationCapitalMigrationFailureCode) {
  switch (failureCode) {
    case 'nation_capital_migration_session_required':
      return 'Nation capital migration requires a player session token.'
    case 'nation_capital_migration_session_faction_mismatch':
      return 'Nation capital migration session faction does not match the target faction.'
    case 'nation_capital_migration_forbidden':
      return 'Nation capital migration requires alliance officer nation-profile authority.'
    case 'nation_capital_migration_requires_nation':
      return 'Nation capital migration requires an existing kingdom or empire.'
    case 'nation_capital_migration_invalid_capital':
      return 'Nation capital migration requires a controlled commandery city target.'
    case 'nation_capital_migration_capital_not_controlled':
      return 'Nation capital migration target must be controlled by the target faction.'
    case 'nation_capital_migration_capital_unchanged':
      return 'Nation capital migration target must differ from the current capital.'
    case 'nation_capital_migration_rename_cooldown':
      return 'Nation rename is cooling down; migrate later to reselect nation name.'
    case 'nation_capital_migration_color_conflict':
      return 'Nation color is already occupied by another nation.'
    case 'nation_capital_migration_insufficient_jade':
      return `Nation capital migration requires ${NATION_CAPITAL_MIGRATION_COST_JADE} jade.`
  }
}

function resolveMigrationCapitalTile(
  world: WorldState,
  factionId: FactionId,
  capitalTileId: string,
): { tile?: Tile; failureCode?: NationCapitalMigrationFailureCode } {
  const tile = world.map.tiles.find((candidate) => candidate.id === capitalTileId)
  if (!tile || tile.type !== 'city') {
    return { failureCode: 'nation_capital_migration_invalid_capital' }
  }
  if (tile.owner !== factionId) {
    return { tile, failureCode: 'nation_capital_migration_capital_not_controlled' }
  }
  return { tile }
}

function summarizeControlledEmpireCities(world: WorldState, factionId: FactionId) {
  const tileById = new Map(world.map.tiles.map((tile) => [tile.id, tile]))
  const controlledClusters = getControlledCityClusters(world, factionId, tileById)
  return {
    controlledCommanderyCityCount: controlledClusters.length,
    controlledStateCapitalCount: controlledClusters.filter((cluster) =>
      isStateCapitalCluster(cluster, tileById),
    ).length,
  }
}

function getControlledCityClusters(
  world: WorldState,
  factionId: FactionId,
  tileById = new Map(world.map.tiles.map((tile) => [tile.id, tile])),
) {
  return world.map.overlays.cityClusters.filter((cluster) =>
    isClusterControlledByFaction(cluster, tileById, factionId),
  )
}

function resolveOrganizationKind(faction: WorldState['factions'][FactionId]): 'alliance' | 'nation' {
  return faction.organizationKind === 'nation' ? 'nation' : 'alliance'
}

function resolveOrganizationId(faction: WorldState['factions'][FactionId], factionId: FactionId): string {
  return faction.organizationId?.trim() || factionId
}

function resolveOrganizationName(
  faction: WorldState['factions'][FactionId],
  factionId: FactionId,
  organizationKind: 'alliance' | 'nation',
): string {
  return (
    faction.organizationName?.trim() ||
    (organizationKind === 'nation' ? faction.nationName?.trim() : undefined) ||
    (organizationKind === 'nation' ? `Nation ${factionId}` : `${factionId} alliance`)
  )
}

function summarizeLuoyangControl(world: WorldState, factionId: FactionId) {
  const luoyangTiles = world.map.tiles.filter((tile) =>
    tile.landmarkName?.includes('洛阳') ||
    (tile.x >= 155 && tile.x <= 165 && tile.y >= 150 && tile.y <= 160 && tile.type === 'city'),
  )
  if (luoyangTiles.length === 0) {
    return {
      held: false,
      holdTicks: 0,
      sourceId: 'luoyang:not_found',
    }
  }
  const held = luoyangTiles.every((tile) => tile.owner === factionId)
  const holdTicks = held ? Math.max(0, Math.floor(Number(world.factions[factionId]?.luoyangHoldTicks ?? 0))) : 0
  return {
    held: held && holdTicks >= 15,
    holdTicks,
    sourceId: luoyangTiles.map((tile) => tile.id).join(','),
  }
}

function isClusterControlledByFaction(
  cluster: MapCityCluster,
  tileById: Map<string, Tile>,
  factionId: FactionId,
) {
  if (cluster.owner === factionId) {
    return true
  }
  const hallTile = tileById.get(cluster.cityHallTileId)
  if (hallTile?.owner === factionId) {
    return true
  }
  return cluster.tileIds.some((tileId) => tileById.get(tileId)?.owner === factionId)
}

function isStateCapitalCluster(cluster: MapCityCluster, tileById: Map<string, Tile>) {
  const hallTile = tileById.get(cluster.cityHallTileId)
  const normalizedText = [
    cluster.id,
    cluster.name,
    cluster.district,
    hallTile?.id,
    hallTile?.name,
    hallTile?.district,
    hallTile?.landmarkId,
    hallTile?.landmarkName,
  ]
    .map((value) => String(value ?? '').trim().toLowerCase())
    .filter((value) => value.length > 0)
    .join('|')
  return normalizedText.includes('state_government') ||
    normalizedText.includes('state-capital') ||
    normalizedText.includes('州治')
}

function findNationColorConflict(world: WorldState, factionId: FactionId, color: string): {
  factionId: FactionId
  nationName: string
} | null {
  const normalizedColor = color.trim().toLowerCase()
  for (const faction of Object.values(world.factions)) {
    if (faction.id === factionId || faction.organizationKind !== 'nation') {
      continue
    }
    const factionColor = (faction.colorHex ?? faction.nationColorHex ?? '').trim().toLowerCase()
    if (factionColor !== normalizedColor) {
      continue
    }
    return {
      factionId: faction.id,
      nationName: faction.nationName ?? faction.organizationName ?? faction.id,
    }
  }
  return null
}

function ensureNationProfile(factionId: FactionId): NationProfile {
	const existing = nationProfiles.get(factionId)
	if (existing) {
    return existing
  }

  const now = new Date().toISOString()
  const preset = resolveNationPreset(factionId)
  const profile: NationProfile = {
    factionId,
    nationName: preset.nationName,
    color: preset.color,
    foundedAt: now,
    updatedAt: now,
  }

  nationProfiles.set(factionId, profile)
  return profile
}

function syncNationCapital(world: WorldState, profile: NationProfile): NationProfile {
  const next = { ...profile }

  const preferredTile = profile.capitalTileId
    ? world.map.tiles.find((tile) => tile.id === profile.capitalTileId && tile.owner === profile.factionId)
    : undefined

  const fallbackTile =
    world.map.tiles.find((tile) => tile.owner === profile.factionId && tile.type === 'city') ??
    world.map.tiles.find((tile) => tile.owner === profile.factionId && tile.type === 'resource')

  const capitalTile = preferredTile ?? fallbackTile

  next.capitalTileId = capitalTile?.id
  next.capitalName = capitalTile?.name

  nationProfiles.set(profile.factionId, next)
  return next
}

function resolveFoundingCapitalTile(
  world: WorldState,
  factionId: FactionId,
  capitalTileId: string,
): { tile?: Tile; failureCode?: NationFoundFailureCode } {
  const normalizedTileId = capitalTileId.trim()
  if (!normalizedTileId) {
    return { failureCode: 'nation_found_invalid_capital' }
  }
  const tile = world.map.tiles.find((candidate) => candidate.id === normalizedTileId)
  if (!tile || tile.type !== 'city') {
    return { failureCode: 'nation_found_invalid_capital' }
  }
  if (tile.owner !== factionId) {
    return { tile, failureCode: 'nation_found_capital_not_controlled' }
  }
  return { tile }
}
