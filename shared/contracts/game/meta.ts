import type { FactionId, RegionPriority, RegionRole, TileOwner, AllianceStance } from './common'

export type NationProfile = {
  factionId: FactionId
  nationName: string
  color: string
  tier?: NationTier
  capitalTileId?: string
  capitalName?: string
  foundedAt: string
  empireFoundedAt?: string
  updatedAt: string
  empireUpgradeCostJade?: number
  /** Runtime-computed territory stats (not persisted) */
  territoryTileCount?: number
  controlledCityCount?: number
  controlledResourceCount?: number
  renameCooldownUntil?: string
  historicalNames?: NationNameHistoryEntry[]
  auditLog?: NationProfileAuditEntry[]
}

export type NationNameHistoryEntry = {
  nationName: string
  changedAt: string
  changedTo?: string
  sourceAction: NationProfileAuditAction
}

export type NationTier = 'kingdom' | 'empire'

export type NationProfileAuditAction = 'foundNation' | 'updateNationProfile' | 'upgradeEmpire' | 'migrateCapital'

export type NationProfileChangedField = 'nationName' | 'color' | 'capital' | 'tier' | 'jade'

export type NationProfileAuditEntry = {
  id: string
  action: NationProfileAuditAction
  changedAt: string
  factionId: FactionId
  changedFields: NationProfileChangedField[]
  previousNationName?: string
  nextNationName?: string
  previousColor?: string
  nextColor?: string
  previousCapitalTileId?: string
  previousCapitalName?: string
  nextCapitalTileId?: string
  nextCapitalName?: string
  previousTier?: NationTier
  nextTier?: NationTier
  jadeCost?: number
  previousJade?: number
  nextJade?: number
  actorCommanderId?: string
  actorCommanderName?: string
  authorityGrantId?: string
  actorSessionId?: string
  actorPlayerName?: string
}

export type NationProfilesResponse = {
  items: NationProfile[]
  fetchedAt: string
}

export type NationFoundRequest = {
  factionId: FactionId
  actorCommanderId: string
  nationName: string
  color: string
  capitalTileId: string
}

export type NationFoundRequirementSnapshot = {
  requiredAllianceLevel: number
  allianceLevel: number
  requiredCommanderyCityCount: number
  controlledCommanderyCityCount: number
  met: boolean
}

export type NationFoundFailureCode =
  | 'nation_found_session_required'
  | 'nation_found_session_faction_mismatch'
  | 'nation_found_forbidden'
  | 'nation_found_already_nation'
  | 'nation_found_level_required'
  | 'nation_found_commandery_required'
  | 'nation_found_invalid_capital'
  | 'nation_found_capital_not_controlled'
  | 'nation_color_conflict'

export type NationFoundResponse = {
  ok: boolean
  nation?: NationProfile
  message: string
  failureCode?: NationFoundFailureCode
  requirement?: NationFoundRequirementSnapshot
  conflictingFactionId?: FactionId
  conflictingNationName?: string
  authorityGrantId?: string
  actorCommanderId?: string
  actorCommanderName?: string
  actorPlayerName?: string
}

export type NationProfileUpdateRequest = {
  factionId: FactionId
  nationName?: string
  color?: string
}

export type NationProfileUpdateResponse = {
  ok: boolean
  nation?: NationProfile
  message: string
  failureCode?: 'nation_rename_cooldown' | 'nation_color_conflict' | 'nation_profile_locked_until_capital_migration'
  retryAfterMs?: number
  conflictingFactionId?: FactionId
  conflictingNationName?: string
}

export type NationCapitalMigrationFailureCode =
  | 'nation_capital_migration_session_required'
  | 'nation_capital_migration_session_faction_mismatch'
  | 'nation_capital_migration_forbidden'
  | 'nation_capital_migration_requires_nation'
  | 'nation_capital_migration_invalid_capital'
  | 'nation_capital_migration_capital_not_controlled'
  | 'nation_capital_migration_capital_unchanged'
  | 'nation_capital_migration_rename_cooldown'
  | 'nation_capital_migration_color_conflict'
  | 'nation_capital_migration_insufficient_jade'

export type NationCapitalMigrationRequest = {
  factionId: FactionId
  actorCommanderId: string
  capitalTileId: string
  nationName: string
  color: string
}

export type NationCapitalMigrationResponse = {
  ok: boolean
  nation?: NationProfile
  message: string
  failureCode?: NationCapitalMigrationFailureCode
  retryAfterMs?: number
  conflictingFactionId?: FactionId
  conflictingNationName?: string
  cost?: {
    jade: number
    before: number
    after: number
  }
  authorityGrantId?: string
  actorCommanderId?: string
  actorCommanderName?: string
  actorPlayerName?: string
}

export type NationEmpireRequirementSnapshot = {
  requiredAllianceLevel: number
  allianceLevel: number
  requiredStateCapitalCount: number
  controlledStateCapitalCount: number
  requiredCommanderyCityCount: number
  controlledCommanderyCityCount: number
  costJade: number
  jade: number
  met: boolean
}

export type NationEmpireUpgradeFailureCode =
  | 'nation_empire_session_required'
  | 'nation_empire_session_faction_mismatch'
  | 'nation_empire_forbidden'
  | 'nation_empire_requires_kingdom'
  | 'nation_empire_already_empire'
  | 'nation_empire_level_required'
  | 'nation_empire_state_capital_required'
  | 'nation_empire_commandery_required'
  | 'nation_empire_insufficient_jade'

export type NationEmpireUpgradeRequest = {
  factionId: FactionId
  actorCommanderId: string
}

export type NationEmpireUpgradeResponse = {
  ok: boolean
  nation?: NationProfile
  message: string
  failureCode?: NationEmpireUpgradeFailureCode
  requirement?: NationEmpireRequirementSnapshot
  cost?: {
    jade: number
    before: number
    after: number
  }
  authorityGrantId?: string
  actorCommanderId?: string
  actorCommanderName?: string
  actorPlayerName?: string
}

export type OrganizationMembershipKind = 'player' | 'ai_player' | 'alliance_officer' | 'faction_attribution'

export type OrganizationMembershipAuthoritySource =
  | 'session_player'
  | 'world_faction_ai_players'
  | 'alliance_officer_authority_table'
  | 'world_faction_organization_attribution'

export type OrganizationMembershipReadModelItem = {
  memberId: string
  memberKind: OrganizationMembershipKind
  displayName: string
  factionId: FactionId
  organizationId: string
  organizationKind: 'alliance' | 'nation'
  organizationName: string
  authoritySource: OrganizationMembershipAuthoritySource
  playerName?: string
  aiPlayerId?: string
  commanderId?: string
  permissions?: string[]
}

export type OrganizationMembershipReadModel = {
  contractId: 'organization_membership_authority_v1'
  factionId: FactionId
  organizationId: string
  organizationKind: 'alliance' | 'nation'
  organizationName: string
  nationTier?: NationTier
  generatedAtWorldVersion: number
  authoritySource: 'world_faction_alliance_membership_read_model'
  factionOrganizationAttribution: {
    organizationId: string
    organizationKind: 'alliance' | 'nation'
    organizationName: string
    nationTier?: NationTier
  }
  members: OrganizationMembershipReadModelItem[]
}

export type OrganizationDiplomacyActorKind = 'organization_subject' | 'alliance_officer'

export type OrganizationDiplomacyAuthorityActor = {
  actorId: string
  actorKind: OrganizationDiplomacyActorKind
  displayName: string
  canProposeDiplomacy: boolean
  authoritySource: 'world_faction_organization_attribution' | 'alliance_officer_authority_table'
  commanderId?: string
  roleId?: string
  permission?: 'manage_diplomacy'
  principalPlayerName?: string
}

export type OrganizationDiplomacyRelation = {
  targetFactionId: FactionId
  targetOrganizationId: string
  targetOrganizationKind: 'alliance' | 'nation'
  targetOrganizationName: string
  canPropose: boolean
  reason: 'cross_organization' | 'same_organization_blocked'
}

export type OrganizationDiplomacyAuthorityReadModel = {
  contractId: 'organization_diplomacy_authority_v1'
  factionId: FactionId
  organizationId: string
  organizationKind: 'alliance' | 'nation'
  organizationName: string
  nationTier?: NationTier
  subjectKind: 'alliance' | 'nation'
  generatedAtWorldVersion: number
  authoritySource: 'world_faction_organization_diplomacy_read_model'
  diplomacySubjectBoundary: 'organization_not_ai_player'
  proposalRoute: '/api/diplomacy/propose'
  requiredPermission: 'manage_diplomacy'
  actors: OrganizationDiplomacyAuthorityActor[]
  relations: OrganizationDiplomacyRelation[]
}

export type NationWarObjectiveId =
  | 'region_control'
  | 'state_capital'
  | 'luoyang_control'
  | 'empire_status'
  | 'east_han_unification'

export type NationWarObjectiveStatus = 'locked' | 'active' | 'achieved'

export type NationWarObjectiveReadModelItem = {
  objectiveId: NationWarObjectiveId
  title: string
  description: string
  status: NationWarObjectiveStatus
  authority: 'real_authority' | 'read_model_only' | 'locked'
  currentCount: number
  requiredCount: number
  sourceRefs: Array<{
    kind: 'region' | 'state' | 'luoyang' | 'nation' | 'eastHanThirteenStates'
    id: string
  }>
  requiredStateCount?: number
}

export type NationWarObjectiveReadModel = {
  contractId: 'nation_war_objective_read_model_v1'
  factionId: FactionId
  organizationKind: 'alliance' | 'nation'
  organizationName: string
  nationTier?: NationTier
  generatedAtWorldVersion: number
  authoritySource: 'nation_world_state_victory_objective_read_model'
  objectives: NationWarObjectiveReadModelItem[]
}

export type MapOverviewProvince = {
  id: string
  name: string
  summary: string
  centerX: number
  centerY: number
  centerTileId: string
  primaryControlledTiles: number
  opposingControlledTiles: number
  neutralTiles: number
  resourceTiles: number
  cityTiles: number
  passTiles: number
  primaryUnits: number
  opposingUnits: number
}

export type MapOverviewNation = {
  id: FactionId
  name: string
  color: string
  strength: number
  controlledTiles: number
  controlledRegions: number
  capitalTileId?: string
  capitalName?: string
}

export type MapOverviewResponse = {
  tick: number
  worldVersion: number
  primaryFactionId: FactionId
  worldSize: {
    width: number
    height: number
    tileCount: number
  }
  provinces: MapOverviewProvince[]
  nations: MapOverviewNation[]
}

export type RegionSnapshot = {
  id: string
  name: string
  role: RegionRole
  priority: RegionPriority
  control: TileOwner
  friendlyUnits: number
  hostileUnits: number
  friendlyControlledTiles: number
  hostileControlledTiles: number
  resourceTiles: number
  averageEnemyPressure: number
  scoutingCoverage: number
  allianceStance: AllianceStance
  alliedSupport: number
  alliedCommanderName: string
  recentBattlePressure: number
  summary: string
}

export type TheaterSnapshot = {
  macroRegions: RegionSnapshot[]
  frontlineRisk: number
  foodSecurity: number
  supplyLineHealth: number
  developmentCapacity: number
  reconCoverage: number
  allianceCoordination: number
  battleRisk: number
  recentBattleTilt: number
}

export type MapPathNode = {
  x: number
  y: number
}

export type MapContinuousPath = {
  id: string
  name: string
  tileIds: string[]
  nodes: MapPathNode[]
}

export type CityFootprintTiles = 9 | 25 | 49 | 81
export type CityFootprintTier = 'city_3x3' | 'city_5x5' | 'city_7x7' | 'city_9x9'
export type CityCamp = 'human_controlled' | 'autonomous' | 'neutral'
export type CityTechTrackId = 'governance' | 'logistics' | 'defense' | 'recruitment'
export type CityTechLevels = Record<CityTechTrackId, number>

export type MapCityCluster = {
  id: string
  name: string
  centerTileId: string
  cityHallTileId: string
  tileIds: string[]
  district?: string
  owner: TileOwner
  camp: CityCamp
  footprintTiles: CityFootprintTiles
  footprintTier: CityFootprintTier
  upgradeCapTiles: CityFootprintTiles
  isUpgradeable: boolean
  techLevels: CityTechLevels
}

export type MapContinuousOverlays = {
  mountainRidges: MapContinuousPath[]
  rivers: MapContinuousPath[]
  cityClusters: MapCityCluster[]
}
