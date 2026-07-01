import type {
  AiPlayerActionProposal,
  AiPlayerActionProposalOf,
  AiPlayerActionType,
  AiPlayerActionArgs,
  AiPlayerBuildingGroupId,
  AiPlayerBuildingId,
  AiPlayerGeneralTacticId,
  AiPlayerRecruitPoolId,
  AiPlayerThreatEscapeMode,
  AiPlayerTroopFacilityBuildingId,
  AiPlayerTroopFacilityId,
} from '../../../../shared/contracts/aiPlayer'
import type { WorldActionResponse } from '../../../../shared/contracts/game/world'
import type { CityTechTrackId } from '../../../../shared/contracts/game/meta'
import {
  abandonAiOwnedTileAction,
  allianceHelpAction,
  deployReserveHeroAction,
  enqueueAffairAction,
  gatherAiResourceTileAction,
  getWorldStateReadonly,
  healTroopAction,
  moveUnitAction,
  occupyTileAction,
  openSeaRouteAction,
  promoteCityBuildingAction,
  promoteTroopFacilityBuildingAction,
  queueAiAgendaActionAction,
  queuePlanExecutionAction,
  queueTacticalOverrideAction,
  rewardClaimAction,
  recruitProspectHeroAction,
  seaPatrolInterceptAction,
  seaPatrolScoutAction,
  setGeneralActiveHeroAction,
  setRecruitSelectedPoolAction,
  setGeneralTacticAction,
  transferFactionResourcesToGovernorAction,
  upgradeCityAction,
  upgradeCityTechAction,
  upgradeHeroStarAction,
  upgradeTacticalSkillAction,
} from '../world/WorldService'

const CITY_TECH_TRACK_PRIORITY: CityTechTrackId[] = ['governance', 'logistics', 'defense', 'recruitment']
const CITY_TECH_MIN_FOOTPRINT: Record<CityTechTrackId, number> = {
  governance: 1,
  logistics: 4,
  defense: 4,
  recruitment: 9,
}
const AI_PLAYER_DEFAULT_RECRUIT_POOL: AiPlayerRecruitPoolId = 'pool_standard'
const RECRUIT_POOL_PRIORITY: AiPlayerRecruitPoolId[] = ['pool_standard', 'pool_season', 'pool_limited']
const AI_PLAYER_GARRISON_TEMPLATE_ID = 'garrison' as const
const FORMATION_ASSIGN_TACTIC_PRIORITY: AiPlayerGeneralTacticId[] = ['guard', 'assault', 'logistics']
const TROOP_FACILITY_UPGRADE_PRIORITY: Array<{
  facilityId: AiPlayerTroopFacilityId
  buildingId: AiPlayerTroopFacilityBuildingId
}> = [
  { facilityId: 'training_ground', buildingId: 'training_ground_base' },
  { facilityId: 'recruit_station', buildingId: 'recruit_station_base' },
  { facilityId: 'command_hall', buildingId: 'command_hall_base' },
  { facilityId: 'support_structures', buildingId: 'supply_camp' },
]
const TROOP_FACILITY_BUILDINGS_BY_FACILITY: Record<AiPlayerTroopFacilityId, AiPlayerTroopFacilityBuildingId[]> = {
  training_ground: ['training_ground_base', 'training_drill'],
  recruit_station: ['recruit_station_base', 'reserve_camp'],
  command_hall: ['command_hall_base', 'frontline_slot'],
  support_structures: ['supply_camp', 'signal_tower'],
}
const TROOP_FACILITY_BY_BUILDING_ID = new Map<AiPlayerTroopFacilityBuildingId, AiPlayerTroopFacilityId>(
  Object.entries(TROOP_FACILITY_BUILDINGS_BY_FACILITY).flatMap(([facilityId, buildingIds]) =>
    buildingIds.map((buildingId) => [buildingId, facilityId as AiPlayerTroopFacilityId] as const)),
)
const BUILDING_UPGRADE_PRIORITY: Array<{
  groupId: AiPlayerBuildingGroupId
  buildingId: AiPlayerBuildingId
  techId: CityTechTrackId
  minFootprint: number
}> = [
  { groupId: 'market', buildingId: 'market_plaza', techId: 'governance', minFootprint: 1 },
  { groupId: 'tax', buildingId: 'tax_office', techId: 'logistics', minFootprint: 4 },
  { groupId: 'policy', buildingId: 'recruit_policy_board', techId: 'recruitment', minFootprint: 9 },
  { groupId: 'policy', buildingId: 'policy_hall', techId: 'governance', minFootprint: 1 },
]
const BUILDING_UPGRADE_TARGET_BY_BUILDING_ID = new Map(
  BUILDING_UPGRADE_PRIORITY.map((entry) => [entry.buildingId, entry] as const),
)
const BUILDING_UPGRADE_TARGET_BY_GROUP_ID = new Map<AiPlayerBuildingGroupId, (typeof BUILDING_UPGRADE_PRIORITY)[number]>([
  ['market', BUILDING_UPGRADE_PRIORITY[0]],
  ['tax', BUILDING_UPGRADE_PRIORITY[1]],
  ['policy', BUILDING_UPGRADE_PRIORITY[3]],
])
const QUEUE_FILL_IDLE_AFFAIR_BY_GROUP: Record<AiPlayerBuildingGroupId, string> = {
  market: 'queue_market_upgrade',
  tax: 'queue_tax_upgrade',
  policy: 'queue_policy_review',
}
const QUEUE_FILL_IDLE_GROUP_PRIORITY: AiPlayerBuildingGroupId[] = ['market', 'tax', 'policy']

export type AiPlayerSupportedProposalExecution =
  | {
    worldAction: string | null
    worldActionPayload?: Record<string, unknown>
    response: WorldActionResponse
  }
  | {
    error: string
  }

function resolveOwnedCityTileId(factionId: string, requestedTileId?: string): string | null {
  const world = getWorldStateReadonly()
  const cityClusters = world.map.overlays.cityClusters
  if (requestedTileId) {
    const matchingCluster = cityClusters.find((cluster) =>
      cluster.owner === factionId &&
      (cluster.cityHallTileId === requestedTileId || cluster.tileIds.includes(requestedTileId)),
    )
    if (matchingCluster) {
      return matchingCluster.cityHallTileId
    }
  }

  const ownedCluster = cityClusters.find((cluster) => cluster.owner === factionId)
  if (ownedCluster) {
    return ownedCluster.cityHallTileId
  }

  if (requestedTileId) {
    const requested = world.map.tiles.find((tile) => tile.id === requestedTileId && tile.owner === factionId)
    if (requested && (requested.type === 'city' || typeof requested.cityLevel === 'number')) {
      return requested.id
    }
  }

  for (const tile of world.map.tiles) {
    if (tile.owner !== factionId) {
      continue
    }
    if (tile.type === 'city' || typeof tile.cityLevel === 'number') {
      return tile.id
    }
  }

  return null
}

function resolveOwnedCityCluster(
  factionId: string,
  requestedTileId?: string,
): ReturnType<typeof getWorldStateReadonly>['map']['overlays']['cityClusters'][number] | null {
  const world = getWorldStateReadonly()
  const cityClusters = world.map.overlays.cityClusters
  if (requestedTileId) {
    const matchingCluster = cityClusters.find((cluster) =>
      cluster.owner === factionId &&
      (cluster.cityHallTileId === requestedTileId || cluster.tileIds.includes(requestedTileId)),
    )
    if (matchingCluster) {
      return matchingCluster
    }
  }

  return cityClusters.find((cluster) => cluster.owner === factionId) ?? null
}

function resolveFactionUnitId(factionId: string, requestedUnitId?: string): string | null {
  const world = getWorldStateReadonly()
  if (requestedUnitId) {
    const requested = world.units.find((unit) => unit.id === requestedUnitId && unit.faction === factionId)
    if (requested) {
      return requested.id
    }
  }

  return world.units.find((unit) => unit.faction === factionId)?.id ?? null
}

function resolveAiManagedUnitId(factionId: string, aiPlayerId: string, requestedUnitId?: string): string | null {
  const world = getWorldStateReadonly()
  const assignedUnitIds = new Set(
    world.factions[factionId]?.aiPlayers
      ?.find((player) => player.id === aiPlayerId)
      ?.unitIds ?? [],
  )
  const units = world.units.filter((unit) => (
    unit.faction === factionId &&
    (unit.aiPlayerId === aiPlayerId || assignedUnitIds.has(unit.id))
  ))
  if (requestedUnitId) {
    return units.find((unit) => unit.id === requestedUnitId)?.id ?? null
  }

  return units[0]?.id ?? null
}

function resolveAdjacentTargetTileId(factionId: string, unitId: string, requestedTargetTileId?: string): string | null {
  const world = getWorldStateReadonly()
  const unit = world.units.find((item) => item.id === unitId && item.faction === factionId)
  if (!unit) {
    return null
  }

  if (requestedTargetTileId) {
    return requestedTargetTileId
  }

  const neighbors = world.map.connections[unit.tileId] ?? []
  return neighbors.find((tileId) => tileId !== unit.tileId) ?? neighbors[0] ?? null
}

function resolveCitySiegeTarget(
  factionId: string,
  aiPlayerId: string | undefined,
  requestedUnitId?: string,
  requestedTargetTileId?: string,
): { unitId: string; targetTileId: string; targetName: string } | null {
  const world = getWorldStateReadonly()
  const unitId = aiPlayerId
    ? resolveAiManagedUnitId(factionId, aiPlayerId, requestedUnitId)
    : resolveFactionUnitId(factionId, requestedUnitId)
  if (!unitId) {
    return null
  }
  const unit = world.units.find((candidate) => candidate.id === unitId && candidate.faction === factionId)
  if (!unit) {
    return null
  }

  const normalizedRequestedTarget = requestedTargetTileId?.trim()
  const candidateTileIds = normalizedRequestedTarget
    ? [normalizedRequestedTarget]
    : [unit.tileId, ...(world.map.connections[unit.tileId] ?? [])]
  const targetTile = candidateTileIds
    .map((tileId) => world.map.tiles.find((tile) => tile.id === tileId))
    .find((tile) => tile && tile.type === 'city' && tile.owner !== factionId)
  if (!targetTile) {
    return null
  }
  return {
    unitId,
    targetTileId: targetTile.id,
    targetName: targetTile.name,
  }
}

function resolveRallyTarget(
  factionId: string,
  aiPlayerId: string | undefined,
  requestedUnitId?: string,
  requestedRegionId?: string,
  requestedTargetTileId?: string,
): { unitId: string; regionId: string; targetTileId: string; targetName: string } | null {
  const world = getWorldStateReadonly()
  const unitId = aiPlayerId
    ? resolveAiManagedUnitId(factionId, aiPlayerId, requestedUnitId)
    : resolveFactionUnitId(factionId, requestedUnitId)
  if (!unitId) {
    return null
  }
  const unit = world.units.find((candidate) => candidate.id === unitId && candidate.faction === factionId)
  if (!unit) {
    return null
  }

  const normalizedRequestedRegionId = requestedRegionId?.trim()
  const directive = normalizedRequestedRegionId
    ? world.alliance.directives[normalizedRequestedRegionId]
    : Object.values(world.alliance.directives)[0]
  if (!directive) {
    return null
  }
  const region = world.map.regions.find((candidate) => candidate.id === directive.regionId)
  if (!region) {
    return null
  }
  const normalizedRequestedTarget = requestedTargetTileId?.trim()
  const targetTileId = normalizedRequestedTarget && region.tileIds.includes(normalizedRequestedTarget)
    ? normalizedRequestedTarget
    : region.centerTileId
  const targetTile = world.map.tiles.find((tile) => tile.id === targetTileId)
  if (!targetTile) {
    return null
  }
  return {
    unitId,
    regionId: region.id,
    targetTileId: targetTile.id,
    targetName: targetTile.name,
  }
}

function isCityTechTrackId(value: unknown): value is CityTechTrackId {
  return value === 'governance' || value === 'logistics' || value === 'defense' || value === 'recruitment'
}

function resolveResearchTarget(
  factionId: string,
  requestedTileId?: string,
  requestedTechId?: string,
): { tileId: string; techId: CityTechTrackId } | null {
  const cluster = resolveOwnedCityCluster(factionId, requestedTileId)
  if (!cluster) {
    return null
  }

  if (isCityTechTrackId(requestedTechId)) {
    return {
      tileId: cluster.cityHallTileId,
      techId: requestedTechId,
    }
  }

  for (const techId of CITY_TECH_TRACK_PRIORITY) {
    if (cluster.footprintTiles < CITY_TECH_MIN_FOOTPRINT[techId]) {
      continue
    }
    const level = cluster.techLevels?.[techId] ?? 0
    if (level >= 5) {
      continue
    }
    return {
      tileId: cluster.cityHallTileId,
      techId,
    }
  }

  return {
    tileId: cluster.cityHallTileId,
    techId: 'governance',
  }
}

function resolveBuildingUpgradeTarget(
  factionId: string,
  requestedCityId?: string,
  requestedGroupId?: AiPlayerBuildingGroupId,
  requestedBuildingId?: AiPlayerBuildingId,
): { cityId: string; groupId: AiPlayerBuildingGroupId; buildingId: AiPlayerBuildingId } | null {
  const cluster = resolveOwnedCityCluster(factionId, requestedCityId)
  if (!cluster) {
    return null
  }

  const cityId = cluster.cityHallTileId
  const requestedByBuilding = requestedBuildingId
    ? BUILDING_UPGRADE_TARGET_BY_BUILDING_ID.get(requestedBuildingId) ?? null
    : null
  const requestedByGroup = requestedGroupId
    ? BUILDING_UPGRADE_TARGET_BY_GROUP_ID.get(requestedGroupId) ?? null
    : null
  if (requestedByBuilding && requestedByGroup && requestedByBuilding.groupId !== requestedByGroup.groupId) {
    return null
  }

  const requestedTarget = requestedByBuilding ?? requestedByGroup
  if (requestedTarget) {
    if (cluster.footprintTiles < requestedTarget.minFootprint) {
      return null
    }
    const level = cluster.techLevels?.[requestedTarget.techId] ?? 0
    if (level >= 5) {
      return null
    }
    return {
      cityId,
      groupId: requestedTarget.groupId,
      buildingId: requestedBuildingId ?? requestedTarget.buildingId,
    }
  }

  const cityBuildingGroups =
    getWorldStateReadonly().slgDomainState?.cityBuildingGroupsByCity?.[cityId] ?? {}
  let fallback: (typeof BUILDING_UPGRADE_PRIORITY)[number] | null = null
  for (const target of BUILDING_UPGRADE_PRIORITY) {
    if (cluster.footprintTiles < target.minFootprint) {
      continue
    }
    const level = cluster.techLevels?.[target.techId] ?? 0
    if (level >= 5) {
      continue
    }
    fallback ??= target
    if (cityBuildingGroups[target.groupId]?.[target.buildingId]) {
      return {
        cityId,
        groupId: target.groupId,
        buildingId: target.buildingId,
      }
    }
  }

  if (fallback) {
    return {
      cityId,
      groupId: fallback.groupId,
      buildingId: fallback.buildingId,
    }
  }

  return {
    cityId,
    groupId: BUILDING_UPGRADE_PRIORITY[0].groupId,
    buildingId: BUILDING_UPGRADE_PRIORITY[0].buildingId,
  }
}

function resolveQueueFillIdleSlotTarget(
  factionId: string,
  requestedCityId?: string,
  requestedGroupId?: AiPlayerBuildingGroupId,
): { cityId: string; groupId: AiPlayerBuildingGroupId; affairId: string } | null {
  const cityId = resolveOwnedCityTileId(factionId, requestedCityId)
  if (!cityId) {
    return null
  }

  if (requestedGroupId) {
    return {
      cityId,
      groupId: requestedGroupId,
      affairId: QUEUE_FILL_IDLE_AFFAIR_BY_GROUP[requestedGroupId],
    }
  }

  const queue = getWorldStateReadonly().slgDomainState?.affairsQueueByCity?.[cityId] ?? []
  for (const groupId of QUEUE_FILL_IDLE_GROUP_PRIORITY) {
    const affairId = QUEUE_FILL_IDLE_AFFAIR_BY_GROUP[groupId]
    const alreadyQueued = queue.some((entry) => entry.id === affairId && entry.statusText === '已入队')
    if (!alreadyQueued) {
      return {
        cityId,
        groupId,
        affairId,
      }
    }
  }

  return {
    cityId,
    groupId: QUEUE_FILL_IDLE_GROUP_PRIORITY[0],
    affairId: QUEUE_FILL_IDLE_AFFAIR_BY_GROUP[QUEUE_FILL_IDLE_GROUP_PRIORITY[0]],
  }
}

function resolveRecruitPoolSelection(
  factionId: string,
  requestedPoolId?: AiPlayerRecruitPoolId,
): AiPlayerRecruitPoolId | null {
  const world = getWorldStateReadonly()
  if (!world.factions[factionId]) {
    return null
  }

  if (requestedPoolId) {
    return requestedPoolId
  }

  const currentPoolIdRaw = world.slgDomainState?.recruitStateByFaction?.[factionId]?.selectedPoolId?.trim()
  const currentPoolId =
    RECRUIT_POOL_PRIORITY.find((candidate) => candidate === currentPoolIdRaw) ??
    null

  return (
    RECRUIT_POOL_PRIORITY.find((candidate) => candidate !== currentPoolId) ||
    currentPoolId ||
    AI_PLAYER_DEFAULT_RECRUIT_POOL
  )
}

function resolveRecruitCommanderTarget(
  factionId: string,
  requestedPoolId?: AiPlayerRecruitPoolId,
  requestedCount?: number,
): { poolId: string; count: number } {
  const poolId =
    resolveRecruitPoolSelection(factionId, requestedPoolId) ||
    AI_PLAYER_DEFAULT_RECRUIT_POOL
  const count =
    typeof requestedCount === 'number' && Number.isFinite(requestedCount)
      ? Math.max(1, Math.min(10, Math.trunc(requestedCount)))
      : 1
  return { poolId, count }
}

function resolveTroopTrainTarget(
  factionId: string,
  requestedHeroId?: string,
  requestedTileId?: string,
  requestedCoHeroIds?: string[],
): { heroId: string; coHeroIds: string[]; tileId: string; aiPlayerId?: string; teamId?: string; teamIndex?: number } | null {
  const world = getWorldStateReadonly()
  const faction = world.factions[factionId]
  if (!faction) {
    return null
  }

  const reserveHeroIds = faction.heroCommand.reserveHeroIds
  const normalizedRequestedHeroId = requestedHeroId?.trim()
  const heroId =
    normalizedRequestedHeroId && reserveHeroIds.includes(normalizedRequestedHeroId)
      ? normalizedRequestedHeroId
      : reserveHeroIds[0]
  if (!heroId) {
    return null
  }
  const requestedCoHeroes = Array.isArray(requestedCoHeroIds)
    ? requestedCoHeroIds.map((candidateId) => candidateId.trim()).filter((candidateId) => candidateId !== '' && candidateId !== heroId)
    : []
  const coHeroIds = requestedCoHeroes.length > 0
    ? Array.from(new Set(requestedCoHeroes.filter((candidateId) => reserveHeroIds.includes(candidateId)))).slice(0, 2)
    : reserveHeroIds.filter((candidateId) => candidateId !== heroId).slice(0, 2)

  const normalizedRequestedTileId = requestedTileId?.trim()
  const tileIdCandidate = normalizedRequestedTileId || faction.heroCommand.homeTileId
  if (!tileIdCandidate || !world.map.tiles.some((tile) => tile.id === tileIdCandidate)) {
    return null
  }

  return {
    heroId,
    coHeroIds,
    tileId: tileIdCandidate,
  }
}

function resolveTroopFacilityUpgradeTarget(
  factionId: string,
  requestedUnitId?: string,
  requestedFacilityId?: AiPlayerTroopFacilityId,
  requestedBuildingId?: AiPlayerTroopFacilityBuildingId,
): { unitId: string; facilityId: AiPlayerTroopFacilityId; buildingId: AiPlayerTroopFacilityBuildingId } | null {
  const unitId = resolveFactionUnitId(factionId, requestedUnitId)
  if (!unitId) {
    return null
  }

  const inferredFacilityId = requestedBuildingId ? TROOP_FACILITY_BY_BUILDING_ID.get(requestedBuildingId) ?? null : null
  const facilityId =
    requestedFacilityId ||
    inferredFacilityId ||
    TROOP_FACILITY_UPGRADE_PRIORITY[0]?.facilityId ||
    null
  if (!facilityId) {
    return null
  }

  const allowedBuildingIds = TROOP_FACILITY_BUILDINGS_BY_FACILITY[facilityId]
  if (!allowedBuildingIds || allowedBuildingIds.length <= 0) {
    return null
  }

  const buildingId = requestedBuildingId || allowedBuildingIds[0]
  if (!allowedBuildingIds.includes(buildingId)) {
    return null
  }

  return {
    unitId,
    facilityId,
    buildingId,
  }
}

function resolveWorldScoutTarget(
  factionId: string,
  aiPlayerId: string | undefined,
  requestedUnitId?: string,
  requestedTargetTileId?: string,
): { unitId: string; targetTileId: string } | null {
  const world = getWorldStateReadonly()
  const unitId = aiPlayerId
    ? resolveAiManagedUnitId(factionId, aiPlayerId, requestedUnitId)
    : resolveFactionUnitId(factionId, requestedUnitId)
  if (!unitId) {
    return null
  }

  const unit = world.units.find((candidate) => candidate.id === unitId && candidate.faction === factionId)
  if (!unit) {
    return null
  }

  const neighbors = (world.map.connections[unit.tileId] ?? []).filter((tileId) => tileId !== unit.tileId)
  if (neighbors.length <= 0) {
    return null
  }

  const normalizedRequestedTargetId = requestedTargetTileId?.trim()
  if (normalizedRequestedTargetId) {
    return neighbors.includes(normalizedRequestedTargetId)
      ? { unitId, targetTileId: normalizedRequestedTargetId }
      : null
  }

  const tileById = new Map(world.map.tiles.map((tile) => [tile.id, tile] as const))
  const rankedCandidates = neighbors
    .map((tileId) => {
      const tile = tileById.get(tileId)
      if (!tile) {
        return null
      }
      const intelLevel = world.intel[tileId]?.level ?? 'unknown'
      const intelRank = intelLevel === 'unknown' ? 0 : intelLevel === 'suspected' ? 1 : 2
      const ownerRank = tile.owner === factionId ? 1 : 0
      return {
        tileId,
        tile,
        intelRank,
        ownerRank,
      }
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .sort((left, right) => {
      if (left.intelRank !== right.intelRank) {
        return left.intelRank - right.intelRank
      }
      if (left.ownerRank !== right.ownerRank) {
        return left.ownerRank - right.ownerRank
      }
      if (left.tile.enemyPressure !== right.tile.enemyPressure) {
        return right.tile.enemyPressure - left.tile.enemyPressure
      }
      return left.tile.id.localeCompare(right.tile.id)
    })

  const target = rankedCandidates[0]
  if (!target) {
    return null
  }

  return {
    unitId,
    targetTileId: target.tileId,
  }
}

function resolveGarrisonTarget(
  factionId: string,
  aiPlayerId: string | undefined,
  requestedUnitId?: string,
  requestedTargetTileId?: string,
  requestedSummary?: string,
): { unitId: string; targetTileId: string; summary: string } | null {
  const world = getWorldStateReadonly()
  const unitId = aiPlayerId
    ? resolveAiManagedUnitId(factionId, aiPlayerId, requestedUnitId)
    : resolveFactionUnitId(factionId, requestedUnitId)
  if (!unitId) {
    return null
  }
  const unit = world.units.find((candidate) => candidate.id === unitId && candidate.faction === factionId)
  if (!unit) {
    return null
  }

  const normalizedRequestedTarget = requestedTargetTileId?.trim()
  const targetTileId = normalizedRequestedTarget || unit.tileId
  if (!targetTileId || !world.map.tiles.some((tile) => tile.id === targetTileId)) {
    return null
  }

  const summary = requestedSummary?.trim() || `ai_player_garrison ${unitId} -> ${targetTileId}`
  return {
    unitId,
    targetTileId,
    summary,
  }
}

function resolveAllianceDefenseBatchTargets(
  factionId: string,
  aiPlayerId: string | undefined,
  assignments: Array<{ unitId?: string; targetTileId: string; summary?: string }>,
): Array<{ unitId: string; targetTileId: string; summary: string }> | null {
  const world = getWorldStateReadonly()
  const usedUnitIds = new Set<string>()
  const assignedUnitIds = new Set(
    aiPlayerId
      ? world.factions[factionId]?.aiPlayers
        ?.find((player) => player.id === aiPlayerId)
        ?.unitIds ?? []
      : [],
  )
  const factionUnits = world.units.filter((unit) => (
    unit.faction === factionId &&
    (!aiPlayerId || unit.aiPlayerId === aiPlayerId || assignedUnitIds.has(unit.id))
  ))
  const resolved: Array<{ unitId: string; targetTileId: string; summary: string }> = []
  for (const assignment of assignments) {
    const targetTileId = String(assignment.targetTileId ?? '').trim()
    if (!targetTileId || !world.map.tiles.some((tile) => tile.id === targetTileId)) {
      return null
    }
    const requestedUnitId = String(assignment.unitId ?? '').trim()
    const unit = requestedUnitId !== ''
      ? factionUnits.find((candidate) => candidate.id === requestedUnitId && !usedUnitIds.has(candidate.id))
      : factionUnits.find((candidate) => !usedUnitIds.has(candidate.id))
    if (!unit) {
      return null
    }
    usedUnitIds.add(unit.id)
    resolved.push({
      unitId: unit.id,
      targetTileId,
      summary: String(assignment.summary ?? '').trim() || `ai_player_alliance_defense_batch ${unit.id} -> ${targetTileId}`,
    })
  }
  return resolved.length > 0 ? resolved : null
}

function resolveTileOccupyTarget(
  factionId: string,
  aiPlayerId: string,
  requestedUnitId?: string,
  requestedTileId?: string,
): { unitId: string; tileId: string } | null {
  const world = getWorldStateReadonly()
  const faction = world.factions[factionId]
  const aiPlayer = faction?.aiPlayers?.find((candidate) => candidate.id === aiPlayerId)
  if (!faction || !aiPlayer) {
    return null
  }

  const assignedUnitIds = new Set(aiPlayer.unitIds)
  const normalizedRequestedUnitId = requestedUnitId?.trim()
  const normalizedRequestedTileId = requestedTileId?.trim()
  const assignedUnits = world.units.filter((unit) =>
    unit.faction === factionId && assignedUnitIds.has(unit.id),
  )

  if (normalizedRequestedUnitId) {
    const unit = assignedUnits.find((candidate) => candidate.id === normalizedRequestedUnitId)
    if (!unit) {
      return null
    }
    return {
      unitId: unit.id,
      tileId: normalizedRequestedTileId || unit.tileId,
    }
  }

  if (normalizedRequestedTileId) {
    const unitOnTile = assignedUnits.find((unit) => unit.tileId === normalizedRequestedTileId)
    if (!unitOnTile) {
      return null
    }
    return {
      unitId: unitOnTile.id,
      tileId: normalizedRequestedTileId,
    }
  }

  const tileById = new Map(world.map.tiles.map((tile) => [tile.id, tile] as const))
  const occupiableUnit = assignedUnits.find((unit) => {
    const tile = tileById.get(unit.tileId)
    return tile && tile.owner === 'neutral' && tile.type !== 'city' && tile.type !== 'fog'
  })
  if (!occupiableUnit) {
    return null
  }

  return {
    unitId: occupiableUnit.id,
    tileId: occupiableUnit.tileId,
  }
}

function resolveTroopHealUnitId(
  factionId: string,
  aiPlayerId: string,
  requestedUnitId?: string,
): string {
  const normalizedRequestedUnitId = requestedUnitId?.trim()
  if (normalizedRequestedUnitId) {
    return normalizedRequestedUnitId
  }

  const world = getWorldStateReadonly()
  const faction = world.factions[factionId]
  const aiPlayer = faction?.aiPlayers?.find((candidate) => candidate.id === aiPlayerId)
  if (!faction || !aiPlayer) {
    return ''
  }

  const assignedUnitIds = new Set(aiPlayer.unitIds)
  const assignedUnits = world.units
    .filter((unit) => unit.faction === factionId && assignedUnitIds.has(unit.id))
    .sort((left, right) => {
      if (left.strength !== right.strength) {
        return left.strength - right.strength
      }
      if (left.supply !== right.supply) {
        return left.supply - right.supply
      }
      return left.id.localeCompare(right.id)
    })

  const damagedUnit = assignedUnits.find((unit) => unit.strength < 100 || unit.supply < 9)
  return (damagedUnit ?? assignedUnits[0])?.id ?? ''
}

function resolveGeneralFocusHeroId(factionId: string, requestedHeroId?: string): string | null {
  const world = getWorldStateReadonly()
  const faction = world.factions[factionId]
  if (!faction) {
    return null
  }

  const rosterHeroIds = faction.heroCommand.rosterHeroIds
  const generalState = world.slgDomainState?.generalStateByFaction?.[factionId]
  const activeUnitHeroId = world.units.find((unit) => unit.faction === factionId && rosterHeroIds.includes(unit.hero.id))?.hero.id
  const normalizedRequestedHeroId = requestedHeroId?.trim()
  return (
    (normalizedRequestedHeroId && rosterHeroIds.includes(normalizedRequestedHeroId)
      ? normalizedRequestedHeroId
      : activeUnitHeroId ||
        (generalState?.activeHeroId && rosterHeroIds.includes(generalState.activeHeroId) ? generalState.activeHeroId : null) ||
        (faction.heroCommand.recentHeroId && rosterHeroIds.includes(faction.heroCommand.recentHeroId)
          ? faction.heroCommand.recentHeroId
          : null) ||
        rosterHeroIds[0]) ??
    null
  )
}

function resolveHeroUpgradeHeroId(factionId: string, requestedHeroId?: string): string | null {
  const normalizedRequestedHeroId = requestedHeroId?.trim()
  if (normalizedRequestedHeroId) {
    return normalizedRequestedHeroId
  }
  return resolveGeneralFocusHeroId(factionId)
}

function resolveTacticalSkillUpgradeTarget(
  factionId: string,
  requestedHeroId?: string,
  requestedSkillId?: string,
): { heroId: string; skillId: string } | null {
  const heroId = resolveHeroUpgradeHeroId(factionId, requestedHeroId)
  if (!heroId) {
    return null
  }

  const normalizedSkillId = requestedSkillId?.trim()
  if (normalizedSkillId) {
    return { heroId, skillId: normalizedSkillId }
  }

  const generalState = getWorldStateReadonly().slgDomainState?.generalStateByFaction?.[factionId]
  const slot = generalState?.tacticalSkillSlotsByHeroId?.[heroId]
  const skillId = slot?.equippedSkillIds.find((candidate) => {
    const level = slot.equippedSkillLevelsById?.[candidate]
    return typeof level === 'number' && level < 10
  }) ?? slot?.equippedSkillIds[0]

  return skillId ? { heroId, skillId } : null
}

function resolveFormationAssignTarget(
  factionId: string,
  requestedHeroId?: string,
  requestedTacticId?: AiPlayerGeneralTacticId,
): { heroId: string; tacticId: AiPlayerGeneralTacticId } | null {
  const world = getWorldStateReadonly()
  const faction = world.factions[factionId]
  if (!faction) {
    return null
  }

  const generalState = world.slgDomainState?.generalStateByFaction?.[factionId]
  const heroId = resolveGeneralFocusHeroId(factionId, requestedHeroId)
  if (!heroId) {
    return null
  }

  const currentTactic = generalState?.tacticByHeroId?.[heroId]
  const tacticId =
    requestedTacticId ||
    FORMATION_ASSIGN_TACTIC_PRIORITY.find((candidate) => candidate !== currentTactic) ||
    FORMATION_ASSIGN_TACTIC_PRIORITY[0]

  return {
    heroId,
    tacticId,
  }
}

function resolveThreatEscapeAgendaActionId(
  factionId: string,
  requestedMode?: AiPlayerThreatEscapeMode,
): 'agenda_recover' | 'agenda_redeploy' | null {
  const world = getWorldStateReadonly()
  const primaryUnit = world.units.find((unit) => unit.faction === factionId)
  if (!primaryUnit) {
    return null
  }

  const normalizedRequestedMode = requestedMode?.trim()
  if (normalizedRequestedMode === 'recover') {
    return 'agenda_recover'
  }
  if (normalizedRequestedMode === 'redeploy') {
    return 'agenda_redeploy'
  }

  const currentTile = world.map.tiles.find((tile) => tile.id === primaryUnit.tileId)
  const firstNeighborId = (world.map.connections[primaryUnit.tileId] ?? []).find((tileId) => tileId !== primaryUnit.tileId)
  if (!firstNeighborId) {
    return 'agenda_recover'
  }

  const currentEnemyPressure = currentTile?.enemyPressure ?? 0
  return currentEnemyPressure > 0 ? 'agenda_redeploy' : 'agenda_recover'
}

function resolveAllianceHelpRegionId(
  factionId: string,
  requestedRegionId?: string,
): string | null {
  const world = getWorldStateReadonly()
  const regionById = new Map(world.map.regions.map((region) => [region.id, region] as const))
  const tileById = new Map(world.map.tiles.map((tile) => [tile.id, tile] as const))
  const commanderById = new Map(world.alliance.commanders.map((commander) => [commander.id, commander] as const))
  const normalizedRequestedRegionId = requestedRegionId?.trim()

  if (normalizedRequestedRegionId) {
    const directive = world.alliance.directives[normalizedRequestedRegionId]
    return regionById.has(normalizedRequestedRegionId) && directive && commanderById.has(directive.assignedCommanderId)
      ? normalizedRequestedRegionId
      : null
  }

  const rankedCandidates = Object.values(world.alliance.directives)
    .map((directive) => {
      const region = regionById.get(directive.regionId)
      if (!region || !commanderById.has(directive.assignedCommanderId)) {
        return null
      }

      const enemyPressure = region.tileIds.reduce((highest, tileId) => {
        const tile = tileById.get(tileId)
        return Math.max(highest, tile?.enemyPressure ?? 0)
      }, 0)
      const friendlyTileCount = region.tileIds.reduce((count, tileId) => {
        const tile = tileById.get(tileId)
        return count + (tile?.owner === factionId ? 1 : 0)
      }, 0)

      return {
        regionId: directive.regionId,
        supportLevel: directive.supportLevel,
        enemyPressure,
        friendlyTileCount,
      }
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .sort((left, right) => {
      if (left.supportLevel !== right.supportLevel) {
        return left.supportLevel - right.supportLevel
      }
      if (left.enemyPressure !== right.enemyPressure) {
        return right.enemyPressure - left.enemyPressure
      }
      if (left.friendlyTileCount !== right.friendlyTileCount) {
        return right.friendlyTileCount - left.friendlyTileCount
      }
      return left.regionId.localeCompare(right.regionId)
    })

  return rankedCandidates[0]?.regionId ?? null
}

function resolveClaimableRewardId(
  factionId: string,
  requestedRewardId?: string,
): string | null {
  const world = getWorldStateReadonly()
  const faction = world.factions[factionId]
  if (!faction) {
    return null
  }

  const pendingRewards = faction.claimableRewards ?? []
  const normalizedRequestedRewardId = requestedRewardId?.trim()
  if (normalizedRequestedRewardId) {
    return pendingRewards.some((reward) => reward.id === normalizedRequestedRewardId)
      ? normalizedRequestedRewardId
      : null
  }

  return pendingRewards[0]?.id ?? null
}

export async function executeSupportedAiPlayerProposal(
  proposal: AiPlayerActionProposal,
  includeWorld: boolean,
): Promise<AiPlayerSupportedProposalExecution> {
  let worldAction: string | null = null
  let worldActionPayload: Record<string, unknown> | undefined
  let response: WorldActionResponse

  switch (proposal.action as string) {
    case 'city_upgrade': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'city_upgrade'>
      const tileId = resolveOwnedCityTileId(typedProposal.factionId, typedProposal.args.tileId)
      if (!tileId) {
        return {
          error: `no owned city tile found for faction ${typedProposal.factionId}`,
        }
      }
      worldAction = 'upgradeCity'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        tileId,
      }
      response = upgradeCityAction(tileId, includeWorld, typedProposal.factionId as never)
      break
    }
    case 'building_upgrade': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'building_upgrade'>
      const target = resolveBuildingUpgradeTarget(
        typedProposal.factionId,
        typedProposal.args.cityId,
        typedProposal.args.groupId,
        typedProposal.args.buildingId,
      )
      if (!target) {
        return {
          error: `no owned city building target found for faction ${typedProposal.factionId}`,
        }
      }
      worldAction = 'promoteCityBuilding'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        cityId: target.cityId,
        groupId: target.groupId,
        buildingId: target.buildingId,
      }
      response = promoteCityBuildingAction(
        target.cityId,
        target.groupId,
        target.buildingId,
        includeWorld,
        typedProposal.factionId as never,
      )
      break
    }
    case 'tactical_skill_upgrade': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'tactical_skill_upgrade'>
      const target = resolveTacticalSkillUpgradeTarget(
        typedProposal.factionId,
        typedProposal.args.heroId,
        typedProposal.args.skillId,
      )
      if (!target) {
        return {
          error: `no tactical skill upgrade target found for faction ${typedProposal.factionId}`,
        }
      }
      worldAction = 'upgradeTacticalSkill'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        heroId: target.heroId,
        skillId: target.skillId,
      }
      response = upgradeTacticalSkillAction(
        target.heroId,
        target.skillId,
        includeWorld,
        typedProposal.factionId as never,
      )
      break
    }
    case 'hero_star_upgrade': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'hero_star_upgrade'>
      const heroId = resolveHeroUpgradeHeroId(typedProposal.factionId, typedProposal.args.heroId)
      if (!heroId) {
        return {
          error: `no hero star upgrade target found for faction ${typedProposal.factionId}`,
        }
      }
      worldAction = 'upgradeHeroStar'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        heroId,
      }
      response = upgradeHeroStarAction(
        heroId,
        includeWorld,
        typedProposal.factionId as never,
      )
      break
    }
    case 'queue_fill_idle_slot': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'queue_fill_idle_slot'>
      const target = resolveQueueFillIdleSlotTarget(
        typedProposal.factionId,
        typedProposal.args.cityId,
        typedProposal.args.groupId,
      )
      if (!target) {
        return {
          error: `no idle city affair target found for faction ${typedProposal.factionId}`,
        }
      }
      worldAction = 'enqueueAffair'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        cityId: target.cityId,
        groupId: target.groupId,
        affairId: target.affairId,
      }
      response = enqueueAffairAction(target.cityId, target.affairId, includeWorld, typedProposal.factionId as never)
      break
    }
    case 'march_move': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'march_move'>
      const unitId = resolveAiManagedUnitId(
        typedProposal.factionId,
        typedProposal.aiPlayerId,
        typedProposal.args.unitId,
      )
      if (!unitId) {
        return {
          error: `no ai-managed unit found for ${typedProposal.aiPlayerId}`,
        }
      }
      const targetTileId = resolveAdjacentTargetTileId(
        typedProposal.factionId,
        unitId,
        typedProposal.args.targetTileId,
      )
      if (!targetTileId) {
        return {
          error: `no target tile resolved for unit ${unitId}`,
        }
      }
      worldAction = 'moveUnit'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        unitId,
        targetTileId,
        sourceBattleReportId: typedProposal.args.sourceBattleReportId,
        sourceReplayRequestId: typedProposal.args.sourceReplayRequestId,
        recommendedRecoveryCommand: typedProposal.args.recommendedRecoveryCommand,
      }
      response = moveUnitAction(unitId, targetTileId, includeWorld, typedProposal.factionId as never)
      break
    }
    case 'city_siege': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'city_siege'>
      const target = resolveCitySiegeTarget(
        typedProposal.factionId,
        typedProposal.aiPlayerId,
        typedProposal.args.unitId,
        typedProposal.args.targetTileId,
      )
      if (!target) {
        return {
          error: `no hostile city siege target found for faction ${typedProposal.factionId}`,
        }
      }
      const request = {
        factionId: typedProposal.factionId as never,
        plan: {
          intent: `攻城${target.targetName}`,
          priority: 'high' as const,
          orders: [{
            unitId: target.unitId,
            action: 'capture' as const,
            target: target.targetTileId,
          }],
          constraints: ['ai_player_city_siege_v1', 'city_durability_authority'],
          reviewAfterTicks: 1,
        },
        source: 'gateway' as const,
        strategicCommand: `ai_player_city_siege ${target.unitId} -> ${target.targetTileId}`,
        requestId: `ai_player_city_siege_${proposal.proposalId}`,
        basedOnWorldVersion: getWorldStateReadonly().worldVersion,
        executionMode: 'reject_if_active' as const,
        sourceBattleReportId: typedProposal.args.sourceBattleReportId,
        sourceReplayRequestId: typedProposal.args.sourceReplayRequestId,
        recommendedRecoveryCommand: typedProposal.args.recommendedRecoveryCommand,
      }
      worldAction = 'queuePlanExecution'
      worldActionPayload = request
      response = await queuePlanExecutionAction(request, includeWorld)
      if (response.ok) {
        response.message = `攻城计划已入队：${target.targetName}`
      }
      break
    }
    case 'research_start': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'research_start'>
      const target = resolveResearchTarget(
        typedProposal.factionId,
        typedProposal.args.tileId,
        typedProposal.args.techId,
      )
      if (!target) {
        return {
          error: `no owned city research target found for faction ${typedProposal.factionId}`,
        }
      }
      worldAction = 'upgradeCityTech'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        tileId: target.tileId,
        techId: target.techId,
      }
      response = upgradeCityTechAction(target.tileId, target.techId, includeWorld, typedProposal.factionId as never)
      break
    }
    case 'troop_train': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'troop_train'>
      const target = resolveTroopTrainTarget(
        typedProposal.factionId,
        typedProposal.args.heroId,
        typedProposal.args.tileId,
        typedProposal.args.coHeroIds,
      )
      if (!target) {
        return {
          error: `no reserve troop training target found for faction ${typedProposal.factionId}`,
        }
      }
      worldAction = 'deployReserveHero'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        heroId: target.heroId,
        coHeroIds: target.coHeroIds,
        tileId: target.tileId,
        aiPlayerId: typedProposal.args.aiPlayerId ?? typedProposal.aiPlayerId,
        teamId: typedProposal.args.teamId,
        teamIndex: typedProposal.args.teamIndex,
      }
      response = deployReserveHeroAction(
        typedProposal.factionId,
        target.heroId,
        target.tileId,
        includeWorld,
        target.coHeroIds,
        typedProposal.args.aiPlayerId ?? typedProposal.aiPlayerId,
        typedProposal.args.teamId,
        typedProposal.args.teamIndex,
      )
      break
    }
    case 'troop_facility_upgrade': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'troop_facility_upgrade'>
      const target = resolveTroopFacilityUpgradeTarget(
        typedProposal.factionId,
        typedProposal.args.unitId,
        typedProposal.args.facilityId,
        typedProposal.args.buildingId,
      )
      if (!target) {
        return {
          error: `no troop facility upgrade target found for faction ${typedProposal.factionId}`,
        }
      }
      worldAction = 'promoteTroopFacilityBuilding'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        unitId: target.unitId,
        facilityId: target.facilityId,
        buildingId: target.buildingId,
      }
      response = promoteTroopFacilityBuildingAction(
        target.unitId,
        target.facilityId,
        target.buildingId,
        includeWorld,
        typedProposal.factionId as never,
      )
      break
    }
    case 'recruit_pool_select': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'recruit_pool_select'>
      const poolId = resolveRecruitPoolSelection(typedProposal.factionId, typedProposal.args.poolId)
      if (!poolId) {
        return {
          error: `no recruit pool target found for faction ${typedProposal.factionId}`,
        }
      }
      worldAction = 'setRecruitSelectedPool'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        poolId,
      }
      response = setRecruitSelectedPoolAction(
        poolId,
        includeWorld,
        typedProposal.factionId as never,
      )
      break
    }
    case 'recruit_commander': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'recruit_commander'>
      const target = resolveRecruitCommanderTarget(
        typedProposal.factionId,
        typedProposal.args.poolId,
        typedProposal.args.count,
      )
      worldAction = 'recruitProspectHero'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        poolId: target.poolId,
        count: target.count,
      }
      response = recruitProspectHeroAction(
        includeWorld,
        typedProposal.factionId as never,
        target.count,
        target.poolId,
      )
      break
    }
    case 'world_scout': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'world_scout'>
      const target = resolveWorldScoutTarget(
        typedProposal.factionId,
        typedProposal.aiPlayerId,
        typedProposal.args.unitId,
        typedProposal.args.targetTileId,
      )
      if (!target) {
        return {
          error: `no adjacent scout target found for faction ${typedProposal.factionId}`,
        }
      }

      const world = getWorldStateReadonly()
      const targetTile = world.map.tiles.find((candidate) => candidate.id === target.targetTileId)
      const plan = {
        intent: `Scout ${targetTile?.name ?? target.targetTileId}`,
        priority: 'medium' as const,
        orders: [{
          unitId: target.unitId,
          action: 'recon' as const,
          target: target.targetTileId,
        }],
        constraints: ['ai_player_world_scout_v1', 'adjacent_target_required'],
        reviewAfterTicks: 1,
      }
      const request = {
        factionId: typedProposal.factionId as never,
        plan,
        source: 'gateway' as const,
        strategicCommand: `ai_player_world_scout ${target.unitId} -> ${target.targetTileId}`,
        requestId: `ai_player_world_scout_${proposal.proposalId}`,
        basedOnWorldVersion: world.worldVersion,
        executionMode: 'reject_if_active' as const,
        sourceBattleReportId: typedProposal.args.sourceBattleReportId,
        sourceReplayRequestId: typedProposal.args.sourceReplayRequestId,
        recommendedRecoveryCommand: typedProposal.args.recommendedRecoveryCommand,
      }
      worldAction = 'queuePlanExecution'
      worldActionPayload = request
      response = await queuePlanExecutionAction(request, includeWorld)
      break
    }
    case 'garrison_set': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'garrison_set'>
      const target = resolveGarrisonTarget(
        typedProposal.factionId,
        typedProposal.aiPlayerId,
        typedProposal.args.unitId,
        typedProposal.args.targetTileId,
        typedProposal.args.summary,
      )
      if (!target) {
        return {
          error: `no garrison target found for faction ${typedProposal.factionId}`,
        }
      }
      worldAction = 'queueTacticalOverride'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        unitId: target.unitId,
        templateId: AI_PLAYER_GARRISON_TEMPLATE_ID,
        targetTileId: target.targetTileId,
        summary: target.summary,
        sourceBattleReportId: typedProposal.args.sourceBattleReportId,
        sourceReplayRequestId: typedProposal.args.sourceReplayRequestId,
        recommendedRecoveryCommand: typedProposal.args.recommendedRecoveryCommand,
      }
      response = queueTacticalOverrideAction(
        target.unitId,
        AI_PLAYER_GARRISON_TEMPLATE_ID,
        target.targetTileId,
        target.summary,
        includeWorld,
        typedProposal.factionId as never,
      )
      break
    }
    case 'general_focus_set': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'general_focus_set'>
      const heroId = resolveGeneralFocusHeroId(typedProposal.factionId, typedProposal.args.heroId)
      if (!heroId) {
        return {
          error: `no general focus target found for faction ${typedProposal.factionId}`,
        }
      }
      worldAction = 'setGeneralActiveHero'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        heroId,
        sourceBattleReportId: typedProposal.args.sourceBattleReportId,
        sourceReplayRequestId: typedProposal.args.sourceReplayRequestId,
        recommendedRecoveryCommand: typedProposal.args.recommendedRecoveryCommand,
      }
      response = setGeneralActiveHeroAction(
        heroId,
        includeWorld,
        typedProposal.factionId as never,
      )
      break
    }
    case 'formation_assign': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'formation_assign'>
      const target = resolveFormationAssignTarget(
        typedProposal.factionId,
        typedProposal.args.heroId,
        typedProposal.args.tacticId,
      )
      if (!target) {
        return {
          error: `no formation assignment target found for faction ${typedProposal.factionId}`,
        }
      }
      worldAction = 'setGeneralTactic'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        heroId: target.heroId,
        tacticId: target.tacticId,
        sourceBattleReportId: typedProposal.args.sourceBattleReportId,
        sourceReplayRequestId: typedProposal.args.sourceReplayRequestId,
        recommendedRecoveryCommand: typedProposal.args.recommendedRecoveryCommand,
      }
      response = setGeneralTacticAction(
        target.heroId,
        target.tacticId,
        includeWorld,
        typedProposal.factionId as never,
      )
      break
    }
    case 'threat_escape': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'threat_escape'>
      const agendaActionId = resolveThreatEscapeAgendaActionId(typedProposal.factionId, typedProposal.args.mode)
      if (!agendaActionId) {
        return {
          error: `no threat escape agenda target found for faction ${typedProposal.factionId}`,
        }
      }
      worldAction = 'queueAiAgendaAction'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        agendaActionId,
        mode: typedProposal.args.mode,
        sourceBattleReportId: typedProposal.args.sourceBattleReportId,
        sourceReplayRequestId: typedProposal.args.sourceReplayRequestId,
        recommendedRecoveryCommand: typedProposal.args.recommendedRecoveryCommand,
      }
      response = queueAiAgendaActionAction(
        agendaActionId,
        includeWorld,
        typedProposal.factionId as never,
      )
      break
    }
    case 'alliance_help': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'alliance_help'>
      const regionId = resolveAllianceHelpRegionId(typedProposal.factionId, typedProposal.args.regionId)
      if (!regionId) {
        return {
          error: `no alliance help target found for faction ${typedProposal.factionId}`,
        }
      }
      worldAction = 'allianceHelp'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        regionId,
        sourceBattleReportId: typedProposal.args.sourceBattleReportId,
        sourceReplayRequestId: typedProposal.args.sourceReplayRequestId,
        recommendedRecoveryCommand: typedProposal.args.recommendedRecoveryCommand,
      }
      response = allianceHelpAction(regionId, includeWorld, typedProposal.factionId as never)
      break
    }
    case 'alliance_defense_assign': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'alliance_defense_assign'>
      const target = resolveGarrisonTarget(
        typedProposal.factionId,
        typedProposal.aiPlayerId,
        typedProposal.args.unitId,
        typedProposal.args.targetTileId,
        typedProposal.args.summary,
      )
      if (!target) {
        return {
          error: `no alliance defense assignment target found for faction ${typedProposal.factionId}`,
        }
      }
      const request = {
        factionId: typedProposal.factionId as never,
        plan: {
          intent: `同盟防守分配：驻防${target.targetTileId}`,
          priority: 'medium' as const,
          orders: [{
            unitId: target.unitId,
            action: 'garrison' as const,
            target: target.targetTileId,
          }],
          constraints: [
            'ai_player_alliance_defense_assign_v1',
            typedProposal.args.regionId ? `alliance_region:${typedProposal.args.regionId}` : `target_tile:${target.targetTileId}`,
          ],
          reviewAfterTicks: 1,
        },
        source: 'gateway' as const,
        strategicCommand: `ai_player_alliance_defense_assign ${target.unitId} -> ${target.targetTileId}`,
        requestId: `ai_player_alliance_defense_assign_${proposal.proposalId}`,
        basedOnWorldVersion: getWorldStateReadonly().worldVersion,
        executionMode: 'reject_if_active' as const,
        sourceBattleReportId: typedProposal.args.sourceBattleReportId,
        sourceReplayRequestId: typedProposal.args.sourceReplayRequestId,
        recommendedRecoveryCommand: typedProposal.args.recommendedRecoveryCommand,
      }
      worldAction = 'queuePlanExecution'
      worldActionPayload = request
      response = await queuePlanExecutionAction(request, includeWorld)
      if (response.ok) {
        response.message = `防守分配已提交：${target.targetTileId}`
      }
      break
    }
    case 'alliance_defense_batch_assign': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'alliance_defense_batch_assign'>
      const targets = resolveAllianceDefenseBatchTargets(
        typedProposal.factionId,
        typedProposal.aiPlayerId,
        typedProposal.args.assignments,
      )
      if (!targets) {
        return {
          error: `no alliance defense batch targets found for faction ${typedProposal.factionId}`,
        }
      }
      const request = {
        factionId: typedProposal.factionId as never,
        plan: {
          intent: typedProposal.args.summary?.trim() || `同盟批量防守分配：${targets.length}处前线驻防`,
          priority: 'high' as const,
          orders: targets.map((target) => ({
            unitId: target.unitId,
            action: 'garrison' as const,
            target: target.targetTileId,
          })),
          constraints: [
            'ai_player_alliance_defense_batch_assign_v1',
            `assignment_count:${targets.length}`,
          ],
          reviewAfterTicks: 1,
        },
        source: 'gateway' as const,
        strategicCommand: `ai_player_alliance_defense_batch_assign ${targets.map((target) => `${target.unitId}->${target.targetTileId}`).join(',')}`,
        requestId: `ai_player_alliance_defense_batch_assign_${proposal.proposalId}`,
        basedOnWorldVersion: getWorldStateReadonly().worldVersion,
        executionMode: 'replace' as const,
        sourceBattleReportId: typedProposal.args.sourceBattleReportId,
        sourceReplayRequestId: typedProposal.args.sourceReplayRequestId,
        recommendedRecoveryCommand: typedProposal.args.recommendedRecoveryCommand,
      }
      worldAction = 'queuePlanExecution'
      worldActionPayload = request
      response = await queuePlanExecutionAction(request, includeWorld)
      if (response.ok) {
        response.message = `批量防守分配已提交：${targets.length}处前线`
      }
      break
    }
    case 'rally_launch':
    case 'rally_join': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'rally_launch' | 'rally_join'>
      const target = resolveRallyTarget(
        typedProposal.factionId,
        typedProposal.aiPlayerId,
        typedProposal.args.unitId,
        typedProposal.args.regionId,
        typedProposal.args.targetTileId,
      )
      if (!target) {
        return {
          error: `no alliance rally target found for faction ${typedProposal.factionId}`,
        }
      }
      const isLaunch = typedProposal.action === 'rally_launch'
      const request = {
        factionId: typedProposal.factionId as never,
        plan: {
          intent: isLaunch ? `发起${target.targetName}集结` : `加入${target.targetName}集结`,
          priority: isLaunch ? 'high' as const : 'medium' as const,
          orders: [{
            unitId: target.unitId,
            action: isLaunch ? 'support' as const : 'march' as const,
            target: target.targetTileId,
          }],
          constraints: [
            isLaunch ? 'ai_player_rally_launch_v1' : 'ai_player_rally_join_v1',
            `alliance_region:${target.regionId}`,
          ],
          reviewAfterTicks: 1,
        },
        source: 'gateway' as const,
        strategicCommand: `${isLaunch ? 'ai_player_rally_launch' : 'ai_player_rally_join'} ${target.unitId} -> ${target.targetTileId}`,
        requestId: `${isLaunch ? 'ai_player_rally_launch' : 'ai_player_rally_join'}_${proposal.proposalId}`,
        basedOnWorldVersion: getWorldStateReadonly().worldVersion,
        executionMode: 'reject_if_active' as const,
        sourceBattleReportId: typedProposal.args.sourceBattleReportId,
        sourceReplayRequestId: typedProposal.args.sourceReplayRequestId,
        recommendedRecoveryCommand: typedProposal.args.recommendedRecoveryCommand,
      }
      worldAction = 'queuePlanExecution'
      worldActionPayload = request
      response = await queuePlanExecutionAction(request, includeWorld)
      if (response.ok) {
        response.message = isLaunch
          ? `集结计划已发起：${target.targetName}`
          : `加入集结计划已入队：${target.targetName}`
      }
      break
    }
    case 'troop_heal': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'troop_heal'>
      const unitId = resolveTroopHealUnitId(
        typedProposal.factionId,
        typedProposal.aiPlayerId,
        typedProposal.args.unitId,
      )
      worldAction = 'healTroop'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        aiPlayerId: typedProposal.aiPlayerId,
        unitId,
        sourceBattleReportId: typedProposal.args.sourceBattleReportId,
        sourceReplayRequestId: typedProposal.args.sourceReplayRequestId,
        recommendedRecoveryCommand: typedProposal.args.recommendedRecoveryCommand,
      }
      response = healTroopAction(
        {
          factionId: typedProposal.factionId as never,
          aiPlayerId: typedProposal.aiPlayerId,
          unitId,
        },
        includeWorld,
      )
      break
    }
    case 'resource_gather': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'resource_gather'>
      worldAction = 'gatherAiResourceTile'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        aiPlayerId: typedProposal.aiPlayerId,
        unitId: typedProposal.args.unitId,
        tileId: typedProposal.args.tileId,
      }
      response = gatherAiResourceTileAction(
        {
          factionId: typedProposal.factionId as never,
          aiPlayerId: typedProposal.aiPlayerId,
          unitId: typedProposal.args.unitId,
          tileId: typedProposal.args.tileId,
        },
        includeWorld,
      )
      break
    }
    case 'tile_occupy': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'tile_occupy'>
      const target = resolveTileOccupyTarget(
        typedProposal.factionId,
        typedProposal.aiPlayerId,
        typedProposal.args.unitId,
        typedProposal.args.tileId,
      )
      if (!target) {
        return {
          error: `no tile occupy target found for AI player ${typedProposal.aiPlayerId}`,
        }
      }
      worldAction = 'occupyTile'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        aiPlayerId: typedProposal.aiPlayerId,
        unitId: target.unitId,
        tileId: target.tileId,
      }
      response = occupyTileAction(
        {
          factionId: typedProposal.factionId as never,
          aiPlayerId: typedProposal.aiPlayerId,
          unitId: target.unitId,
          tileId: target.tileId,
        },
        includeWorld,
      )
      break
    }
    case 'tile_abandon': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'tile_abandon'>
      worldAction = 'abandonAiOwnedTile'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        aiPlayerId: typedProposal.aiPlayerId,
        tileId: typedProposal.args.tileId,
      }
      response = abandonAiOwnedTileAction(
        {
          factionId: typedProposal.factionId as never,
          aiPlayerId: typedProposal.aiPlayerId,
          tileId: typedProposal.args.tileId,
        },
        includeWorld,
      )
      break
    }
    case 'resource_transfer_to_governor': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'resource_transfer_to_governor'>
      worldAction = 'transferFactionResourcesToGovernor'
      worldActionPayload = {
        sourceFactionId: typedProposal.factionId,
        sourceAiPlayerId: typedProposal.aiPlayerId,
        governorPlayerId: typedProposal.governorPlayerId,
        resources: typedProposal.args.resources,
        reason: typedProposal.reason,
        approvedBy: typedProposal.approvedBy ?? '',
      }
      response = transferFactionResourcesToGovernorAction(
        {
          sourceFactionId: typedProposal.factionId,
          sourceAiPlayerId: typedProposal.aiPlayerId,
          governorPlayerId: typedProposal.governorPlayerId,
          resources: typedProposal.args.resources,
          reason: typedProposal.reason,
          approvedBy: typedProposal.approvedBy ?? '',
        },
        includeWorld,
      )
      break
    }
    case 'overseas_route_open': {
      const typedProposal = proposal as AiPlayerActionProposal & {
        args: {
          sourceDockId?: string
          overseasContactId?: string
        }
      }
      const sourceDockId = typedProposal.args.sourceDockId ?? 'east_han_coastal_dock_quanzhou'
      const overseasContactId = typedProposal.args.overseasContactId ?? 'wa_contact_scoutable'
      worldAction = 'openSeaRoute'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        sourceDockId,
        overseasContactId,
        actorAiPlayerId: typedProposal.aiPlayerId,
      }
      response = openSeaRouteAction(
        {
          factionId: typedProposal.factionId as never,
          sourceDockId,
          overseasContactId,
          actorAiPlayerId: typedProposal.aiPlayerId,
        },
        includeWorld,
      )
      break
    }
    case 'maritime_patrol_scout': {
      const typedProposal = proposal as AiPlayerActionProposal & {
        args: {
          routeId?: string
          sourceDockId?: string
          overseasContactId?: string
        }
      }
      const routeId = typedProposal.args.routeId ?? 'east_han_coastal_dock_to_wa_contact'
      const sourceDockId = typedProposal.args.sourceDockId ?? 'east_han_coastal_dock_quanzhou'
      const overseasContactId = typedProposal.args.overseasContactId ?? 'wa_contact_scoutable'
      worldAction = 'seaPatrolScout'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        routeId,
        sourceDockId,
        overseasContactId,
        actorAiPlayerId: typedProposal.aiPlayerId,
      }
      response = seaPatrolScoutAction(
        {
          factionId: typedProposal.factionId as never,
          routeId,
          sourceDockId,
          overseasContactId,
          actorAiPlayerId: typedProposal.aiPlayerId,
        },
        includeWorld,
      )
      break
    }
    case 'maritime_patrol_intercept': {
      const typedProposal = proposal as AiPlayerActionProposal & {
        args: {
          routeId?: string
          sourceDockId?: string
          overseasContactId?: string
          attackerVesselType?: string
          defenderVesselType?: string
        }
      }
      const routeId = typedProposal.args.routeId ?? 'east_han_coastal_dock_to_wa_contact'
      const sourceDockId = typedProposal.args.sourceDockId ?? 'east_han_coastal_dock_quanzhou'
      const overseasContactId = typedProposal.args.overseasContactId ?? 'wa_contact_scoutable'
      const attackerVesselType = typedProposal.args.attackerVesselType ?? 'interceptor_warship'
      const defenderVesselType = typedProposal.args.defenderVesselType ?? 'transport_warship'
      worldAction = 'seaPatrolIntercept'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        routeId,
        sourceDockId,
        overseasContactId,
        attackerVesselType,
        defenderVesselType,
        actorAiPlayerId: typedProposal.aiPlayerId,
      }
      response = seaPatrolInterceptAction(
        {
          factionId: typedProposal.factionId as never,
          routeId,
          sourceDockId,
          overseasContactId,
          attackerVesselType,
          defenderVesselType,
          actorAiPlayerId: typedProposal.aiPlayerId,
        },
        includeWorld,
      )
      break
    }
    case 'reward_claim': {
      const typedProposal = proposal as AiPlayerActionProposalOf<'reward_claim'>
      const rewardId = resolveClaimableRewardId(typedProposal.factionId, typedProposal.args.rewardId)
      if (!rewardId) {
        return {
          error: `no claimable reward found for faction ${typedProposal.factionId}`,
        }
      }
      worldAction = 'claimReward'
      worldActionPayload = {
        factionId: typedProposal.factionId,
        rewardId,
      }
      response = rewardClaimAction(rewardId, includeWorld, typedProposal.factionId as never)
      break
    }
    default:
      return {
        error: `action '${proposal.action}' is not executable in v1`,
      }
  }

  return {
    worldAction,
    worldActionPayload,
    response,
  }
}

export function cloneProposalArgs<T extends AiPlayerActionType>(args: AiPlayerActionArgs<T>): AiPlayerActionArgs<T> {
  return structuredClone(args)
}
