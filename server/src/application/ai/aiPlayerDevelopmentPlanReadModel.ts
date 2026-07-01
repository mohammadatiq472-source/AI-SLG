import type {
  AiPlayerActionCatalogEntry,
  AiPlayerDevelopmentPlan,
  AiPlayerDevelopmentPlanCandidateAction,
  AiPlayerDevelopmentPlanCandidateTile,
  AiPlayerDevelopmentPlanLoopStep,
  AiPlayerDevelopmentPlanResourceSnapshot,
  AiPlayerDevelopmentPlanRiskItem,
  AiPlayerDevelopmentPlanUnit,
  AiPlayerActionType,
  AiPlayerQueueAffairGroupId,
  GovernedAiPlayerRuntimeDetail,
} from '../../../../shared/contracts/aiPlayer'
import type {
  ResourceTransferBundle,
  Tile,
  Unit,
  WorldState,
} from '../../../../shared/contracts/game/world'
import type { CityTechTrackId } from '../../../../shared/contracts/game/meta'
import {
  resolveCityTechUpgradeResources,
  resolveTacticalSkillUpgradeResources,
  type UpgradeResourceSpend,
} from '../../../../shared/domain/rules'
import { getWorldStateReadonly } from '../world/WorldService'
import { listStaticAiPlayerActionCatalog } from './aiPlayerActionCatalog'

const RESOURCE_KEYS = ['food', 'wood', 'stone', 'iron', 'copper'] as const
const DEVELOPMENT_TARGET_DEFAULT = 4000
const DEVELOPMENT_PLAN_ACTIONS = [
  'tile_occupy',
  'troop_heal',
  'tactical_skill_upgrade',
  'building_upgrade',
  'hero_star_upgrade',
  'march_move',
  'resource_gather',
  'tile_abandon',
  'formation_assign',
  'troop_train',
  'queue_fill_idle_slot',
  'recruit_commander',
  'battle_report_read',
] as const
const QUEUE_FILL_IDLE_AFFAIR_BY_GROUP: Record<AiPlayerQueueAffairGroupId, string> = {
  market: 'queue_market_upgrade',
  tax: 'queue_tax_upgrade',
  policy: 'queue_policy_review',
}
const QUEUE_FILL_IDLE_GROUP_PRIORITY: AiPlayerQueueAffairGroupId[] = ['market', 'tax', 'policy']

const DEVELOPMENT_RECOMMENDED_LOOP: Array<{
  action: AiPlayerActionType
  summary: string
  nextWhen: string
}> = [
  {
    action: 'tile_occupy',
    summary: '先把已经抵达的低风险中立地块转成正式占领，直接推进势力值和发育进度。',
    nextWhen: '部队站在目标格且资源足够时优先执行；如果还没到格，先看 march_move 的目标。',
  },
  {
    action: 'troop_heal',
    summary: '占地或战斗后先看损伤和补给，受损部队整补后再继续推进。',
    nextWhen: '战报显示失败、损伤偏高，或部队 strength/supply 不满时执行。',
  },
  {
    action: 'march_move',
    summary: '整补完成后移动到下一块相邻、低压力、可占领或可采集的地块。',
    nextWhen: '当前格没有可占领/可采集目标，或需要靠近下一块资源地时执行。',
  },
  {
    action: 'resource_gather',
    summary: '已经占有资源地时，把收益写入 AI 子账户，为后续输送和继续发育提供资源。',
    nextWhen: '部队位于己方资源地，且该地块还没有被本 AI 采集过时执行。',
  },
  {
    action: 'tile_abandon',
    summary: '资源地已经采过且没有更安全推进目标时，释放低收益地块，避免 AI 一直停在旧格。',
    nextWhen: '只在该 AI 确认管辖或采集过该地，且没有可移动、可占领、可采集目标时执行。',
  },
]

type DevelopmentPlanOptions = {
  targetDevelopmentPoints?: number
}

type ResourceKey = typeof RESOURCE_KEYS[number]

function emptyResources(): ResourceTransferBundle {
  return {
    food: 0,
    wood: 0,
    stone: 0,
    iron: 0,
    copper: 0,
  }
}

function normalizeResourceBundle(input?: Partial<ResourceTransferBundle> | null): ResourceTransferBundle {
  const normalized = emptyResources()
  for (const key of RESOURCE_KEYS) {
    normalized[key] = Math.max(0, Math.trunc(Number(input?.[key] ?? 0) || 0))
  }
  return normalized
}

function readUpgradeCost(cost: UpgradeResourceSpend, key: ResourceKey | 'actionPoints' | 'developmentPoints') {
  return Math.max(0, Math.trunc(Number(cost[key] ?? 0) || 0))
}

function canAffordUpgradeCost(
  resources: AiPlayerDevelopmentPlanResourceSnapshot,
  developmentPoints: number,
  cost: UpgradeResourceSpend,
) {
  if (resources.faction.actionPoints < readUpgradeCost(cost, 'actionPoints')) {
    return false
  }
  if (developmentPoints < readUpgradeCost(cost, 'developmentPoints')) {
    return false
  }
  return RESOURCE_KEYS.every((key) => resources.faction[key] >= readUpgradeCost(cost, key))
}

function summarizeUpgradeCost(cost: UpgradeResourceSpend) {
  const labels: Record<ResourceKey | 'actionPoints' | 'developmentPoints', string> = {
    actionPoints: '行动点',
    food: '粮草',
    wood: '木材',
    stone: '石料',
    iron: '铁矿',
    copper: '铜钱',
    developmentPoints: '升星材料',
  }
  return (['actionPoints', ...RESOURCE_KEYS, 'developmentPoints'] as Array<ResourceKey | 'actionPoints' | 'developmentPoints'>)
    .map((key) => {
      const amount = readUpgradeCost(cost, key)
      return amount > 0 ? `${labels[key]} ${amount}` : ''
    })
    .filter(Boolean)
    .join('、') || '无'
}

function scoreResourcePressure(cost: UpgradeResourceSpend) {
  return Math.floor(
    readUpgradeCost(cost, 'actionPoints') * 8
    + readUpgradeCost(cost, 'food') / 4
    + readUpgradeCost(cost, 'wood') / 3
    + readUpgradeCost(cost, 'stone') / 3
    + readUpgradeCost(cost, 'iron') / 3
    + readUpgradeCost(cost, 'copper') / 120,
  )
}

function buildResourceSnapshot(world: Readonly<WorldState>, runtime: GovernedAiPlayerRuntimeDetail): AiPlayerDevelopmentPlanResourceSnapshot {
  const faction = world.factions[runtime.factionId]
  const aiAccount = faction?.aiResourceAccounts?.[runtime.aiPlayerId]
  const factionResources = normalizeResourceBundle({
    food: faction?.food ?? 0,
    wood: faction?.wood ?? 0,
    stone: faction?.stone ?? 0,
    iron: faction?.iron ?? 0,
    copper: faction?.copper ?? 0,
  })
  return {
    faction: {
      ...factionResources,
      copper: factionResources.copper ?? 0,
      actionPoints: Math.max(0, Math.trunc(Number(faction?.actionPoints ?? 0) || 0)),
    },
    aiAccount: normalizeResourceBundle(aiAccount?.resources),
    aiAccountUpdatedTick: aiAccount?.updatedTick,
  }
}

function readAssignedUnitIds(world: Readonly<WorldState>, runtime: GovernedAiPlayerRuntimeDetail): Set<string> {
  const faction = world.factions[runtime.factionId]
  const assigned = new Set<string>()
  for (const unit of world.units) {
    if (unit.faction === runtime.factionId && unit.aiPlayerId === runtime.aiPlayerId) {
      assigned.add(unit.id)
    }
  }
  const aiPlayerGroup = faction?.aiPlayers?.find((player) => player.id === runtime.aiPlayerId)
  for (const unitId of aiPlayerGroup?.unitIds ?? []) {
    assigned.add(unitId)
  }
  return assigned
}

function buildAssignedUnits(world: Readonly<WorldState>, runtime: GovernedAiPlayerRuntimeDetail): AiPlayerDevelopmentPlanUnit[] {
  const assignedUnitIds = readAssignedUnitIds(world, runtime)
  return world.units
    .filter((unit) => unit.faction === runtime.factionId && assignedUnitIds.has(unit.id))
    .slice(0, 8)
    .map((unit) => ({
      unitId: unit.id,
      name: unit.name,
      tileId: unit.tileId,
      status: unit.status,
      strength: unit.strength,
      mobility: unit.mobility,
      supply: unit.supply,
      heroId: unit.hero.id,
      heroName: unit.hero.name,
      heroLevel: unit.hero.level,
      heroStarLevel: unit.hero.starLevel,
      heroTroopType: unit.hero.troopType,
      teamId: unit.teamId,
      teamIndex: unit.teamIndex,
      coHeroes: (unit.coHeroes ?? []).map((coHero) => ({
        heroId: coHero.id,
        heroName: coHero.name,
        heroLevel: coHero.level,
        heroStarLevel: 'starLevel' in coHero && typeof coHero.starLevel === 'number' ? coHero.starLevel : undefined,
        heroTroopType: coHero.troopType,
      })),
      formation: {
        teamId: unit.teamId,
        teamIndex: unit.teamIndex,
        slots: (unit.mapVisual?.formationSlots ?? []).map((slot) => ({
          role: slot.role,
          heroId: slot.heroId,
          heroName: slot.heroName,
          troopType: slot.troopType,
          visualType: slot.visualType,
        })),
      },
      aiPlayerOwned: true,
      currentTask: unit.currentTask,
      neighborTileIds: [...(world.map.connections[unit.tileId] ?? [])].slice(0, 8),
    }))
}

function tileRisk(tile: Tile, factionId: string): AiPlayerDevelopmentPlanCandidateTile['risk'] {
  if (tile.owner === factionId && tile.type === 'resource') {
    return 'owned_resource'
  }
  if (tile.enemyPressure >= 70) {
    return 'enemy_pressure'
  }
  if (tile.owner && tile.owner !== factionId && tile.owner !== 'neutral') {
    return 'contested'
  }
  if (tile.enemyPressure <= 25) {
    return 'safe_neighbor'
  }
  return 'unknown'
}

function buildCandidateTile(
  tile: Tile,
  params: {
    runtime: GovernedAiPlayerRuntimeDetail
    unit?: Unit
    distance: number
    gatheredTileIds: Set<string>
  },
): AiPlayerDevelopmentPlanCandidateTile {
  const risk = tileRisk(tile, params.runtime.factionId)
  const isReadyResourceGather = Boolean(
    params.unit
      && tile.type === 'resource'
      && tile.owner === params.runtime.factionId
      && params.unit.tileId === tile.id
      && !params.gatheredTileIds.has(tile.id),
  )
  const isReadyTileOccupy = Boolean(
    params.unit
      && params.unit.tileId === tile.id
      && tile.owner === 'neutral'
      && tile.type !== 'city'
      && tile.type !== 'fog'
      && tile.enemyPressure <= 25,
  )
  const isReadyTileAbandon = Boolean(
    tile.type === 'resource'
      && tile.owner === params.runtime.factionId
      && params.gatheredTileIds.has(tile.id),
  )
  const isReadyMove = Boolean(params.unit && params.unit.tileId !== tile.id)
  const args = params.unit
    ? isReadyTileAbandon
      ? {
        tileId: tile.id,
      }
      : isReadyResourceGather || isReadyTileOccupy
      ? {
        unitId: params.unit.id,
        tileId: tile.id,
      }
      : isReadyMove
        ? {
          unitId: params.unit.id,
          targetTileId: tile.id,
        }
        : undefined
    : undefined
  const recommendedAction = params.unit
    ? isReadyResourceGather
      ? 'resource_gather'
      : isReadyTileOccupy
        ? 'tile_occupy'
        : isReadyTileAbandon
          ? 'tile_abandon'
          : isReadyMove
            ? 'march_move'
            : undefined
    : undefined
  const reason = recommendedAction === 'resource_gather'
    ? `部队已经在己方资源地 ${tile.id}，批准后采集收益入账 AI 子账户。`
    : recommendedAction === 'tile_occupy'
      ? `部队已经站在中立低风险地块 ${tile.id}，批准后占领该地并生成正式回执。`
      : recommendedAction === 'tile_abandon'
        ? `资源地 ${tile.id} 已由当前 AI 采集过；没有更好推进目标时可释放该地。`
        : `目标地块 ${tile.id} 是 AI 管辖部队附近的可移动格；批准后只移动，不自动占地或采集。`
  return {
    tileId: tile.id,
    name: tile.name,
    type: tile.type,
    owner: tile.owner,
    resourceKind: tile.resourceKind,
    resourceLevel: tile.resourceLevel,
    enemyPressure: tile.enemyPressure,
    moveCost: tile.moveCost,
    distance: params.distance,
    adjacentToUnitId: params.unit?.id,
    risk,
    recommendedAction,
    args,
    reason,
  }
}

function buildCandidateTiles(
  world: Readonly<WorldState>,
  runtime: GovernedAiPlayerRuntimeDetail,
  units: AiPlayerDevelopmentPlanUnit[],
): AiPlayerDevelopmentPlanCandidateTile[] {
  const tileById = new Map(world.map.tiles.map((tile) => [tile.id, tile] as const))
  const unitById = new Map(world.units.map((unit) => [unit.id, unit] as const))
  const gatheredTileIds = new Set(Object.keys(world.factions[runtime.factionId]?.aiResourceGatherClaims ?? {}))
  const candidates: AiPlayerDevelopmentPlanCandidateTile[] = []
  const seen = new Set<string>()

  for (const unitSummary of units) {
    const unit = unitById.get(unitSummary.unitId)
    if (!unit) {
      continue
    }
    const currentTile = tileById.get(unit.tileId)
    if (currentTile?.type === 'resource') {
      const key = `${unit.id}:${currentTile.id}:0`
      seen.add(key)
      candidates.push(buildCandidateTile(currentTile, {
        runtime,
        unit,
        distance: 0,
        gatheredTileIds,
      }))
    }
    for (const neighborId of world.map.connections[unit.tileId] ?? []) {
      const tile = tileById.get(neighborId)
      if (!tile) {
        continue
      }
      const key = `${unit.id}:${tile.id}:1`
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      candidates.push(buildCandidateTile(tile, {
        runtime,
        unit,
        distance: 1,
        gatheredTileIds,
      }))
    }
  }

  return candidates
    .sort((left, right) => {
      if (left.recommendedAction === 'resource_gather' && right.recommendedAction !== 'resource_gather') {
        return -1
      }
      if (right.recommendedAction === 'resource_gather' && left.recommendedAction !== 'resource_gather') {
        return 1
      }
      if (left.recommendedAction === 'tile_occupy' && right.recommendedAction !== 'tile_occupy') {
        return -1
      }
      if (right.recommendedAction === 'tile_occupy' && left.recommendedAction !== 'tile_occupy') {
        return 1
      }
      if (left.recommendedAction === 'tile_abandon' && right.recommendedAction !== 'tile_abandon') {
        return 1
      }
      if (right.recommendedAction === 'tile_abandon' && left.recommendedAction !== 'tile_abandon') {
        return -1
      }
      if (left.distance !== right.distance) {
        return left.distance - right.distance
      }
      if (left.enemyPressure !== right.enemyPressure) {
        return left.enemyPressure - right.enemyPressure
      }
      return left.tileId.localeCompare(right.tileId)
    })
    .slice(0, 12)
}

function findCatalogEntry(catalog: AiPlayerActionCatalogEntry[], action: string): AiPlayerActionCatalogEntry {
  const entry = catalog.find((item) => item.action === action)
  if (!entry) {
    throw new Error(`missing AI player action catalog entry: ${action}`)
  }
  return entry
}

function normalizePlanHeroId(heroId: string): string {
  return heroId.startsWith('hero_') ? heroId.slice('hero_'.length) : heroId
}

function resolveTacticalSkillUpgradeCandidate(
  world: Readonly<WorldState>,
  runtime: GovernedAiPlayerRuntimeDetail,
  units: AiPlayerDevelopmentPlanUnit[],
): { heroId: string; skillId: string; unitId: string; previousLevel: number; resourcesSpent: UpgradeResourceSpend } | null {
  const slotsByHeroId = world.slgDomainState?.generalStateByFaction?.[runtime.factionId]?.tacticalSkillSlotsByHeroId
  if (!slotsByHeroId) {
    return null
  }
  for (const unit of units) {
    const heroId = normalizePlanHeroId(unit.heroId)
    const slot = slotsByHeroId[heroId] ?? slotsByHeroId[unit.heroId]
    const skillId = slot?.equippedSkillIds.find((candidate) => {
      const level = slot.equippedSkillLevelsById?.[candidate]
      return typeof level === 'number' && level >= 1 && level < 10
    })
    if (skillId) {
      const previousLevel = slot.equippedSkillLevelsById?.[skillId] ?? 1
      return {
        heroId,
        skillId,
        unitId: unit.unitId,
        previousLevel,
        resourcesSpent: resolveTacticalSkillUpgradeResources(previousLevel),
      }
    }
  }
  return null
}

type BuildingUpgradeCandidate = {
  cityId: string
  groupId: 'market' | 'tax' | 'policy'
  buildingId: 'market_plaza' | 'tax_office' | 'policy_hall' | 'recruit_policy_board'
  techId: CityTechTrackId
  currentLevel: number
  resourcesSpent: UpgradeResourceSpend
}

function resolveBuildingUpgradeCandidate(
  world: Readonly<WorldState>,
  runtime: GovernedAiPlayerRuntimeDetail,
): BuildingUpgradeCandidate | null {
  const cluster = world.map.overlays.cityClusters.find((candidate) => candidate.owner === runtime.factionId)
  if (!cluster) {
    return null
  }
  const governanceLevel = cluster.techLevels?.governance ?? 0
  if (governanceLevel < 5) {
    return {
      cityId: cluster.cityHallTileId,
      groupId: cluster.footprintTiles >= 4 ? 'tax' : 'market',
      buildingId: cluster.footprintTiles >= 4 ? 'tax_office' : 'market_plaza',
      techId: 'governance',
      currentLevel: governanceLevel,
      resourcesSpent: resolveCityTechUpgradeResources('governance', governanceLevel),
    }
  }
  const recruitmentLevel = cluster.techLevels?.recruitment ?? 0
  if (cluster.footprintTiles >= 9 && recruitmentLevel < 5) {
    return {
      cityId: cluster.cityHallTileId,
      groupId: 'policy',
      buildingId: 'recruit_policy_board',
      techId: 'recruitment',
      currentLevel: recruitmentLevel,
      resourcesSpent: resolveCityTechUpgradeResources('recruitment', recruitmentLevel),
    }
  }
  return null
}

function resolveOwnedCityTileIdForQueuePlan(
  world: Readonly<WorldState>,
  runtime: GovernedAiPlayerRuntimeDetail,
) {
  const requestedTileId = runtime.homeCityTileId
  const cityClusters = world.map.overlays.cityClusters
  if (requestedTileId) {
    const matchingCluster = cityClusters.find((cluster) =>
      cluster.owner === runtime.factionId &&
      (cluster.cityHallTileId === requestedTileId || cluster.tileIds.includes(requestedTileId)),
    )
    if (matchingCluster) {
      return matchingCluster.cityHallTileId
    }
  }

  const ownedCluster = cityClusters.find((cluster) => cluster.owner === runtime.factionId)
  if (ownedCluster) {
    return ownedCluster.cityHallTileId
  }

  if (requestedTileId) {
    const requested = world.map.tiles.find((tile) => tile.id === requestedTileId && tile.owner === runtime.factionId)
    if (requested && (requested.type === 'city' || typeof requested.cityLevel === 'number')) {
      return requested.id
    }
  }

  return world.map.tiles.find((tile) => (
    tile.owner === runtime.factionId
    && (tile.type === 'city' || typeof tile.cityLevel === 'number')
  ))?.id ?? null
}

function resolveQueueFillIdleSlotCandidate(
  world: Readonly<WorldState>,
  runtime: GovernedAiPlayerRuntimeDetail,
):
  | { state: 'missing_city' }
  | { state: 'queue_busy'; cityId: string }
  | { state: 'ready'; cityId: string; groupId: AiPlayerQueueAffairGroupId; affairId: string } {
  const cityId = resolveOwnedCityTileIdForQueuePlan(world, runtime)
  if (!cityId) {
    return { state: 'missing_city' }
  }
  const queue = world.slgDomainState?.affairsQueueByCity?.[cityId] ?? []
  for (const groupId of QUEUE_FILL_IDLE_GROUP_PRIORITY) {
    const affairId = QUEUE_FILL_IDLE_AFFAIR_BY_GROUP[groupId]
    const alreadyQueued = queue.some((entry) => entry.id === affairId && entry.statusText === '已入队')
    if (!alreadyQueued) {
      return {
        state: 'ready',
        cityId,
        groupId,
        affairId,
      }
    }
  }
  return {
    state: 'queue_busy',
    cityId,
  }
}

function isDeployAnchorPlanTile(tile: Tile, factionId: string) {
  return tile.owner === factionId && (tile.type === 'city' || tile.type === 'resource' || tile.type === 'pass')
}

function resolveTroopTrainAnchorTileId(
  world: Readonly<WorldState>,
  runtime: GovernedAiPlayerRuntimeDetail,
) {
  const faction = world.factions[runtime.factionId]
  const preferredTileId = faction?.heroCommand.homeTileId ?? runtime.homeCityTileId
  if (preferredTileId) {
    const preferred = world.map.tiles.find((tile) => tile.id === preferredTileId)
    if (preferred && isDeployAnchorPlanTile(preferred, runtime.factionId)) {
      return preferred.id
    }
  }
  return world.map.tiles.find((tile) => isDeployAnchorPlanTile(tile, runtime.factionId))?.id ?? null
}

function buildCandidateActions(
  world: Readonly<WorldState>,
  runtime: GovernedAiPlayerRuntimeDetail,
  units: AiPlayerDevelopmentPlanUnit[],
  candidateTiles: AiPlayerDevelopmentPlanCandidateTile[],
  resources: AiPlayerDevelopmentPlanResourceSnapshot,
): AiPlayerDevelopmentPlanCandidateAction[] {
  const catalog = listStaticAiPlayerActionCatalog()
  const hasAssignedUnit = units.length > 0
  const firstUnit = units[0]
  const readyGatherTile = candidateTiles.find((tile) => tile.recommendedAction === 'resource_gather')
  const readyMoveTile = candidateTiles.find((tile) => (
    tile.recommendedAction === 'march_move'
    && tile.owner === 'neutral'
    && tile.type === 'resource'
  )) ?? candidateTiles.find((tile) => (
    tile.recommendedAction === 'march_move'
    && tile.owner === 'neutral'
  )) ?? candidateTiles.find((tile) => tile.recommendedAction === 'march_move')
  const readyOccupyTile = candidateTiles.find((tile) => tile.recommendedAction === 'tile_occupy')
  const readyAbandonTile = candidateTiles.find((tile) => tile.recommendedAction === 'tile_abandon')
  const readyHealUnit = units.find((unit) => unit.strength < 100 || unit.supply < 9)
  const hasAiAccount = RESOURCE_KEYS.some((key) => (resources.aiAccount[key] ?? 0) > 0) || resources.aiAccountUpdatedTick !== undefined
  const whitelistedActions = new Set(runtime.actionWhitelist)
  const tacticalSkillUpgradeTarget = resolveTacticalSkillUpgradeCandidate(world, runtime, units)
  const buildingUpgradeTarget = resolveBuildingUpgradeCandidate(world, runtime)
  const queueFillIdleSlotTarget = resolveQueueFillIdleSlotCandidate(world, runtime)
  const developmentPoints = world.factions[runtime.factionId]?.heroCommand.developmentPoints ?? 0
  const factionState = world.factions[runtime.factionId]
  const factionUnitCount = world.units.filter((unit) => unit.faction === runtime.factionId).length
  const troopTrainAnchorTileId = resolveTroopTrainAnchorTileId(world, runtime)
  const heroStarTarget = firstUnit
    ? {
      heroId: normalizePlanHeroId(firstUnit.heroId),
      unitId: firstUnit.unitId,
      heroName: firstUnit.heroName,
    }
    : null

  const candidates = DEVELOPMENT_PLAN_ACTIONS.map((action) => {
    const entry = findCatalogEntry(catalog, action)
    const blockers: string[] = []
    let readiness: AiPlayerDevelopmentPlanCandidateAction['readiness'] = 'ready'
    let args: Record<string, unknown> | undefined
    let reason = entry.notes ?? entry.label
    let proposalArgs: Record<string, unknown> | undefined
    let proposalReason: string | undefined
    let priorityScore = 10
    let priorityReason = '低优先级候选；仅在没有更明确目标时保留。'
    let targetUnitId: string | undefined
    let targetTileId: string | undefined

    if (action === 'tactical_skill_upgrade') {
      if (!tacticalSkillUpgradeTarget) {
        blockers.push('no_equipped_skill_upgrade_target')
        readiness = 'needs_target'
        reason = '当前 AI 管辖武将没有可确认的已装备、未满级战法目标。'
        priorityScore = 18
        priorityReason = '缺少已装备且未满级的战法目标。'
      } else if (!canAffordUpgradeCost(resources, developmentPoints, tacticalSkillUpgradeTarget.resourcesSpent)) {
        blockers.push('resource_budget_low')
        readiness = 'blocked'
        reason = `铜钱不足，战法升级需 ${summarizeUpgradeCost(tacticalSkillUpgradeTarget.resourcesSpent)}。`
        priorityScore = 42
        priorityReason = `目标清晰但资源不足：${summarizeUpgradeCost(tacticalSkillUpgradeTarget.resourcesSpent)}。`
      } else {
        args = {
          heroId: tacticalSkillUpgradeTarget.heroId,
          skillId: tacticalSkillUpgradeTarget.skillId,
        }
        proposalArgs = args
        proposalReason = `优先升级 ${tacticalSkillUpgradeTarget.heroId} 已装备战法 ${tacticalSkillUpgradeTarget.skillId}，消耗 ${summarizeUpgradeCost(tacticalSkillUpgradeTarget.resourcesSpent)}，由 WorldService 校验等级和归属。`
        targetUnitId = tacticalSkillUpgradeTarget.unitId
        reason = '战法升级已有 authoritative receipt；适合作为没有更紧急占地/整补时的成长提案。'
        priorityScore = 78 + (10 - tacticalSkillUpgradeTarget.previousLevel) * 3 - scoreResourcePressure(tacticalSkillUpgradeTarget.resourcesSpent)
        priorityReason = `已装备战法 Lv.${tacticalSkillUpgradeTarget.previousLevel} 可升，成本 ${summarizeUpgradeCost(tacticalSkillUpgradeTarget.resourcesSpent)}。`
      }
    } else if (action === 'building_upgrade') {
      if (!buildingUpgradeTarget) {
        blockers.push('no_city_building_upgrade_target')
        readiness = 'needs_target'
        reason = '当前主城设施树没有可自动解析的低风险升级目标。'
        priorityScore = 16
        priorityReason = '没有可解析的主城设施升级目标。'
      } else if (!canAffordUpgradeCost(resources, developmentPoints, buildingUpgradeTarget.resourcesSpent)) {
        blockers.push('resource_budget_low')
        readiness = 'blocked'
        reason = `行动点或资源不足，建筑升级需 ${summarizeUpgradeCost(buildingUpgradeTarget.resourcesSpent)}。`
        priorityScore = 40
        priorityReason = `设施目标已解析，但资源不足：${summarizeUpgradeCost(buildingUpgradeTarget.resourcesSpent)}。`
      } else {
        args = {
          cityId: buildingUpgradeTarget.cityId,
          groupId: buildingUpgradeTarget.groupId,
          buildingId: buildingUpgradeTarget.buildingId,
        }
        proposalArgs = args
        proposalReason = `升级主城设施 ${buildingUpgradeTarget.groupId}/${buildingUpgradeTarget.buildingId}，消耗 ${summarizeUpgradeCost(buildingUpgradeTarget.resourcesSpent)}；成功 receipt 会要求 UI refetch facility-tree read model。`
        targetTileId = buildingUpgradeTarget.cityId
        reason = '建筑升级已有主城设施树 read-model refresh receipt，可作为发育空档的确定性升级目标。'
        priorityScore = 70 + buildingUpgradeTarget.currentLevel * 4 - scoreResourcePressure(buildingUpgradeTarget.resourcesSpent)
        priorityReason = `${buildingUpgradeTarget.techId} Lv.${buildingUpgradeTarget.currentLevel} 可升，成本 ${summarizeUpgradeCost(buildingUpgradeTarget.resourcesSpent)}。`
      }
    } else if (action === 'hero_star_upgrade') {
      if (!heroStarTarget) {
        blockers.push('no_assigned_unit')
        readiness = 'blocked'
        priorityScore = 12
        priorityReason = '没有 AI 管辖武将，无法升星。'
      } else if (!canAffordUpgradeCost(resources, developmentPoints, { developmentPoints: 5 })) {
        blockers.push('insufficient_materials')
        readiness = 'blocked'
        reason = '武将升星材料不足；当前 authority 使用 developmentPoints 作为升星材料。'
        priorityScore = 38
        priorityReason = '武将目标存在，但升星材料不足。'
      } else {
        args = { heroId: heroStarTarget.heroId }
        proposalArgs = args
        proposalReason = `给 ${heroStarTarget.heroName} 升星；等级成长仍通过资源地经验，不走直接等级升级。`
        targetUnitId = heroStarTarget.unitId
        reason = '武将升星已有 authoritative receipt；与等级经验路线分离。'
        priorityScore = 66
        priorityReason = `${heroStarTarget.heroName} 可升星，消耗升星材料 5；等级仍通过打资源地获得经验。`
      }
    } else if (action === 'formation_assign') {
      if (!hasAssignedUnit) {
        blockers.push('no_assigned_unit')
        readiness = 'blocked'
      } else {
        args = {
          heroId: firstUnit.heroId,
          tacticId: 'logistics',
        }
        reason = '先给 AI 管辖武将设置战术倾向，作为发育链的低风险准备动作。'
        priorityScore = 36
        priorityReason = '低风险编成准备动作。'
      }
    } else if (action === 'march_move') {
      if (!hasAssignedUnit) {
        blockers.push('no_assigned_unit')
        readiness = 'blocked'
      } else if (!readyMoveTile) {
        blockers.push('no_adjacent_target')
        readiness = 'needs_target'
      } else {
        args = readyMoveTile.args
        proposalArgs = readyMoveTile.args
        proposalReason = readyMoveTile.reason
        targetUnitId = readyMoveTile.adjacentToUnitId
        targetTileId = readyMoveTile.tileId
        reason = `向地图目标地块 ${readyMoveTile.tileId} 行军；后端会校验相邻关系、移动力和目标合法性。`
        priorityScore = 58 + Math.max(0, 6 - readyMoveTile.enemyPressure) * 3
        priorityReason = `可接近资源/占领目标 ${readyMoveTile.tileId}，压力 ${readyMoveTile.enemyPressure}。`
      }
    } else if (action === 'resource_gather') {
      if (!hasAssignedUnit) {
        blockers.push('no_assigned_unit')
        readiness = 'blocked'
      }
      if (!hasAiAccount) {
        blockers.push('missing_ai_resource_account')
        readiness = 'blocked'
      }
      if (!readyGatherTile) {
        blockers.push('unit_not_on_owned_resource_tile')
        readiness = readiness === 'blocked' ? 'blocked' : 'needs_target'
      } else {
        args = readyGatherTile.args
        proposalArgs = readyGatherTile.args
        proposalReason = readyGatherTile.reason
        targetUnitId = readyGatherTile.adjacentToUnitId
        targetTileId = readyGatherTile.tileId
        reason = `部队已经驻扎在己方资源地 ${readyGatherTile.tileId}，可采集到 AI 子账户。`
        priorityScore = 74 + Math.max(1, readyGatherTile.resourceLevel ?? 1) * 2
        priorityReason = `己方资源地可采集，资源等级 ${readyGatherTile.resourceLevel ?? 1}。`
      }
    } else if (action === 'tile_abandon') {
      if (!readyAbandonTile) {
        blockers.push('no_ai_owned_spent_resource_tile')
        readiness = 'needs_target'
        reason = '当前没有已由该 AI 采集过、可释放的己方资源地。'
        priorityScore = 26
        priorityReason = '没有可释放的已采集资源地。'
      } else {
        args = readyAbandonTile.args
        proposalArgs = readyAbandonTile.args
        proposalReason = readyAbandonTile.reason
        targetTileId = readyAbandonTile.tileId
        reason = `资源地 ${readyAbandonTile.tileId} 已采集过，可通过正式放弃 authority 释放为中立地。`
        priorityScore = 41 + Math.max(0, 5 - Math.max(1, readyAbandonTile.resourceLevel ?? 1))
        priorityReason = `已采集资源地 ${readyAbandonTile.tileId} 可释放，资源等级 ${readyAbandonTile.resourceLevel ?? 1}。`
      }
    } else if (action === 'troop_heal') {
      if (!hasAssignedUnit) {
        blockers.push('no_assigned_unit')
        readiness = 'blocked'
      } else if (resources.faction.actionPoints < 1 || resources.faction.food < 2) {
        blockers.push('resource_budget_low')
        readiness = 'blocked'
        reason = '行动点或粮草不足，补兵需要至少 1 行动点与 2 粮草。'
      } else if (!readyHealUnit) {
        blockers.push('unit_already_full')
        readiness = 'needs_target'
        reason = '当前 AI 管辖部队兵力和补给都充足，暂不需要整补。'
      } else {
        args = { unitId: readyHealUnit.unitId }
        proposalArgs = args
        proposalReason = `整补 ${readyHealUnit.name}，恢复兵力和补给后再继续发育。`
        targetUnitId = readyHealUnit.unitId
        reason = 'AI 管辖部队存在损伤或补给不足，可走 troop_heal 正式整补 authority。'
        priorityScore = 62
          + Math.floor(Math.max(0, 100 - readyHealUnit.strength) / 5)
          + Math.max(0, 9 - readyHealUnit.supply) * 2
        priorityReason = `${readyHealUnit.name} 兵力/补给未满，继续推进前需要整补。`
      }
    } else if (action === 'tile_occupy') {
      if (!hasAssignedUnit) {
        blockers.push('no_assigned_unit')
        readiness = 'blocked'
      } else if (resources.faction.actionPoints < 1 || resources.faction.food < 1) {
        blockers.push('resource_budget_low')
        readiness = 'blocked'
        reason = '行动点或粮草不足，占地需要至少 1 行动点与 1 粮草。'
      } else if (!readyOccupyTile) {
        blockers.push('unit_not_on_neutral_tile')
        readiness = 'needs_target'
        reason = '还没有 AI 管辖部队站在可占领的中立低风险地块上，先行军到目标格。'
      } else {
        args = readyOccupyTile.args
        proposalArgs = readyOccupyTile.args
        proposalReason = readyOccupyTile.reason
        targetUnitId = readyOccupyTile.adjacentToUnitId
        targetTileId = readyOccupyTile.tileId
        reason = `部队已到达中立低风险地块 ${readyOccupyTile.tileId}，可直接占领并推进发育目标。`
        priorityScore = 88 + Math.max(1, readyOccupyTile.resourceLevel ?? 1) * 4 - readyOccupyTile.enemyPressure * 5
        priorityReason = `占领 ${readyOccupyTile.tileId} 可获得资源地、势力值和守军经验，压力 ${readyOccupyTile.enemyPressure}。`
      }
    } else if (action === 'troop_train') {
      if (!factionState || factionState.heroCommand.reserveHeroIds.length === 0) {
        blockers.push('no_reserve_hero')
        readiness = 'blocked'
        reason = '没有可编组的预备武将，暂不能补充新部队。'
        priorityScore = 28
        priorityReason = '预备武将为空。'
      } else if (factionUnitCount >= factionState.heroCommand.commandLimit) {
        blockers.push('command_limit_reached')
        readiness = 'blocked'
        reason = '当前部队数量已经达到指挥上限，暂不能继续补新部队。'
        priorityScore = 30
        priorityReason = '指挥上限已满。'
      } else if (resources.faction.actionPoints < 1 || resources.faction.food < 3) {
        blockers.push('resource_budget_low')
        readiness = 'blocked'
        reason = '行动点或粮草不足，补充新部队至少需要 1 行动点与 3 粮草。'
        priorityScore = 36
        priorityReason = '部队目标存在，但资源不足。'
      } else if (!troopTrainAnchorTileId) {
        blockers.push('no_deploy_anchor')
        readiness = 'blocked'
        reason = '没有可部署的新部队落点，暂不能补充新部队。'
        priorityScore = 32
        priorityReason = '缺少己方城池、关口或资源支点。'
      } else {
        args = { tileId: troopTrainAnchorTileId }
        proposalArgs = args
        proposalReason = `补充预备武将部队，并落在 ${troopTrainAnchorTileId}；具体武将由 deployReserveHero authority 自动解析。`
        targetTileId = troopTrainAnchorTileId
        reason = '发育到目标势力值需要可用部队；征兵仍通过正式 deployReserveHero authority。'
        priorityScore = 45
        priorityReason = '可补充部队，但通常低于已抵达资源地的占领/采集。'
      }
    } else if (action === 'queue_fill_idle_slot') {
      if (queueFillIdleSlotTarget.state === 'missing_city') {
        blockers.push('no_owned_city')
        readiness = 'needs_target'
        reason = '没有可确认的己方主城，暂不能补政务队列。'
        priorityScore = 24
        priorityReason = '缺少主城队列目标。'
      } else if (queueFillIdleSlotTarget.state === 'queue_busy') {
        blockers.push('queue_busy')
        readiness = 'blocked'
        reason = '主城政务队列已有任务，不需要重复入队。'
        targetTileId = queueFillIdleSlotTarget.cityId
        priorityScore = 34
        priorityReason = '政务队列已满，等待队列释放。'
      } else {
        args = {
          cityId: queueFillIdleSlotTarget.cityId,
          groupId: queueFillIdleSlotTarget.groupId,
        }
        proposalArgs = args
        proposalReason = `把 ${queueFillIdleSlotTarget.affairId} 加入主城政务队列；由 enqueueAffair authority 校验重复入队。`
        targetTileId = queueFillIdleSlotTarget.cityId
        reason = '主城政务队列有空档，可补一个低风险内政任务。'
        priorityScore = 43
        priorityReason = `政务队列 ${queueFillIdleSlotTarget.groupId} 可入队。`
      }
    } else if (action === 'recruit_commander') {
      reason = '如果缺少可用武将，先走招募 proposal；抽卡和候选池由后端 authority 决定。'
      priorityScore = 44
      priorityReason = '候选池补人动作，适合缺少可用武将时执行。'
    } else if (action === 'battle_report_read') {
      readiness = 'information_only'
      blockers.push('read_model_only')
      reason = '战报读取已接正式 /battle-reports 只读接口，用于判断损伤、胜负和下一步，不生成执行 proposal。'
      priorityScore = 22
      priorityReason = '只读信息动作，不参与可执行 proposal 排序。'
    } else {
      readiness = 'information_only'
      blockers.push('not_executable_in_v1')
      priorityScore = 8
      priorityReason = 'v1 不可执行。'
    }

    if (entry.executableInV1 && !whitelistedActions.has(entry.action)) {
      blockers.push('action_not_whitelisted')
      readiness = 'blocked'
      reason = `${reason} 当前 AI actionWhitelist 未开放该动作。`
      priorityScore = Math.min(priorityScore, 20)
      priorityReason = `${priorityReason} 当前白名单未开放。`
    }

    return {
      action: entry.action,
      label: entry.label,
      executableInV1: entry.executableInV1,
      readiness,
      riskLevel: entry.riskLevel,
      mappedWorldAction: entry.mappedWorldAction,
      args,
      proposalArgs,
      proposalReason,
      priorityScore: Math.max(0, Math.round(priorityScore)),
      priorityReason,
      targetUnitId,
      targetTileId,
      reason,
      blockers,
    }
  })

  return candidates.sort(compareCandidateActionPriority)
}

function compareCandidateActionPriority(
  left: AiPlayerDevelopmentPlanCandidateAction,
  right: AiPlayerDevelopmentPlanCandidateAction,
) {
  const leftReady = left.executableInV1 && left.readiness === 'ready' && Boolean(left.proposalArgs ?? left.args)
  const rightReady = right.executableInV1 && right.readiness === 'ready' && Boolean(right.proposalArgs ?? right.args)
  if (leftReady !== rightReady) {
    return leftReady ? -1 : 1
  }
  const scoreDelta = (right.priorityScore ?? 0) - (left.priorityScore ?? 0)
  if (scoreDelta !== 0) {
    return scoreDelta
  }
  return developmentActionOrder(left.action) - developmentActionOrder(right.action)
}

function developmentActionOrder(action: AiPlayerActionType) {
  const index = (DEVELOPMENT_PLAN_ACTIONS as readonly string[]).indexOf(action)
  return index >= 0 ? index : 999
}

function buildRecommendedLoop(candidateActions: AiPlayerDevelopmentPlanCandidateAction[]): AiPlayerDevelopmentPlanLoopStep[] {
  const actionByType = new Map(candidateActions.map((action) => [action.action, action] as const))
  return DEVELOPMENT_RECOMMENDED_LOOP.map((step, index) => {
    const candidate = actionByType.get(step.action)
    return {
      order: index + 1,
      action: step.action,
      label: candidate?.label ?? step.action,
      readiness: candidate?.readiness ?? 'information_only',
      summary: step.summary,
      nextWhen: step.nextWhen,
      blockers: candidate?.blockers ?? ['action_not_in_plan'],
    }
  })
}

function buildRiskItems(
  runtime: GovernedAiPlayerRuntimeDetail,
  units: AiPlayerDevelopmentPlanUnit[],
  candidateActions: AiPlayerDevelopmentPlanCandidateAction[],
  resources: AiPlayerDevelopmentPlanResourceSnapshot,
): AiPlayerDevelopmentPlanRiskItem[] {
  const risks: AiPlayerDevelopmentPlanRiskItem[] = []
  if (units.length === 0) {
    risks.push({
      code: 'no_assigned_unit',
      severity: 'blocker',
      title: 'AI 还没有管辖部队',
      detail: '多 AI 读取世界时不能默认使用全势力部队；必须先把部队分配给当前 AI。',
      nextStep: '先在后端或配置中给该 AI 绑定 unitIds，再允许它生成移动、采集、占地相关提案。',
    })
  }
  if (resources.aiAccountUpdatedTick === undefined) {
    risks.push({
      code: 'missing_ai_resource_account',
      severity: 'warning',
      action: 'resource_gather',
      title: 'AI 资源子账户尚未初始化',
      detail: 'resource_gather 会把资源入账 AI 子账户；没有账户时后端会拒绝采集。',
      nextStep: '让正式资源账户初始化链先创建该 AI 的四类资源账户。',
    })
  }
  if (runtime.resourceTransfer.blockedBy) {
    const blockedBy = runtime.resourceTransfer.blockedBy
    risks.push({
      code: blockedBy,
      severity: blockedBy === 'daily_quota_exceeded' ? 'blocker' : 'warning',
      action: 'resource_transfer_to_governor',
      title: blockedBy === 'daily_quota_exceeded' ? '今日输送额度已耗尽' : '资源输送冷却中',
      detail: '后端 resourceTransfer runtime 已给出限制，UI 和模型都不能本地绕过。',
      nextStep: blockedBy === 'daily_quota_exceeded'
        ? '等待下一个额度窗口，或由总督调整正式额度策略。'
        : '等待冷却 tick 结束后再生成输送提案。',
    })
  }
  for (const action of candidateActions) {
    if (action.executableInV1 || !action.blockers.includes('not_executable_in_v1')) {
      continue
    }
    const titleByAction: Record<string, string> = {
      tile_occupy: '占地闭环尚未接 authority',
      troop_heal: '补兵/治疗尚未接 authority',
    }
    risks.push({
      code: `${action.action}_deferred`,
      severity: action.action === 'tile_occupy' ? 'blocker' : 'warning',
      action: action.action,
      title: titleByAction[action.action] ?? '动作尚未接入 v1',
      detail: action.reason,
      nextStep: '保持为风险项展示，不允许模型把它当作可执行 proposal。',
    })
  }
  return risks
}

export function buildAiPlayerDevelopmentPlan(
  runtime: GovernedAiPlayerRuntimeDetail,
  options: DevelopmentPlanOptions = {},
): AiPlayerDevelopmentPlan {
  const world = getWorldStateReadonly()
  const faction = world.factions[runtime.factionId]
  const targetDevelopmentPoints = Math.max(
    1,
    Math.trunc(Number(options.targetDevelopmentPoints ?? DEVELOPMENT_TARGET_DEFAULT) || DEVELOPMENT_TARGET_DEFAULT),
  )
  const currentDevelopmentPoints = Math.max(0, Math.trunc(Number(faction?.heroCommand.developmentPoints ?? 0) || 0))
  const remainingDevelopmentPoints = Math.max(0, targetDevelopmentPoints - currentDevelopmentPoints)
  const resources = buildResourceSnapshot(world, runtime)
  const units = buildAssignedUnits(world, runtime)
  const candidateTiles = buildCandidateTiles(world, runtime, units)
  const candidateActions = buildCandidateActions(
    world,
    runtime,
    units,
    candidateTiles,
    resources,
  )

  return {
    ok: true,
    aiPlayerId: runtime.aiPlayerId,
    factionId: runtime.factionId,
    governorPlayerId: runtime.governorPlayerId,
    tick: world.tick,
    worldVersion: world.worldVersion,
    generatedAt: new Date().toISOString(),
    goal: {
      kind: 'development_points',
      targetDevelopmentPoints,
      currentDevelopmentPoints,
      remainingDevelopmentPoints,
      summary: `从 ${currentDevelopmentPoints} 势力值推进到 ${targetDevelopmentPoints}，剩余 ${remainingDevelopmentPoints}。`,
    },
    resources,
    units,
    candidateTiles,
    candidateActions,
    recommendedLoop: buildRecommendedLoop(candidateActions),
    riskItems: buildRiskItems(runtime, units, candidateActions, resources),
  }
}
