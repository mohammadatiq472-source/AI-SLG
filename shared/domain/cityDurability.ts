import type { CityDurabilityRole, Tile, WorldState } from '../contracts/game'

export const PLAYER_HOME_CITY_CENTER_DURABILITY_MAX = 1_000
export const SYSTEM_CITY_DURABILITY_PER_LEVEL = 10_000
export const CITY_WALL_DURABILITY_MAX = 100
export const LUOYANG_CITY_DURABILITY_LEVEL = 10
export const PREFECTURE_CITY_DURABILITY_LEVEL = 9

export type CityDurabilityLevelOverride = {
  cityLevel: number
  label: string
  reason: string
}

export const CITY_DURABILITY_LEVEL_OVERRIDES_BY_LANDMARK_ID: Record<string, CityDurabilityLevelOverride> = {
  luoyang: {
    cityLevel: LUOYANG_CITY_DURABILITY_LEVEL,
    label: '洛阳',
    reason: 'special_capital',
  },
  yecheng: {
    cityLevel: PREFECTURE_CITY_DURABILITY_LEVEL,
    label: '邺城',
    reason: 'prefecture_capital',
  },
  xuchang: {
    cityLevel: PREFECTURE_CITY_DURABILITY_LEVEL,
    label: '许昌',
    reason: 'prefecture_capital',
  },
  hejian: {
    cityLevel: PREFECTURE_CITY_DURABILITY_LEVEL,
    label: '长安',
    reason: 'prefecture_capital_current_scenario_id',
  },
  chengdu: {
    cityLevel: PREFECTURE_CITY_DURABILITY_LEVEL,
    label: '成都',
    reason: 'prefecture_capital',
  },
  jianye: {
    cityLevel: PREFECTURE_CITY_DURABILITY_LEVEL,
    label: '建业',
    reason: 'prefecture_capital',
  },
}

export const CITY_DURABILITY_LEVEL_OVERRIDES_BY_LANDMARK_NAME: Record<string, CityDurabilityLevelOverride> = {
  洛阳: CITY_DURABILITY_LEVEL_OVERRIDES_BY_LANDMARK_ID.luoyang,
  邺城: CITY_DURABILITY_LEVEL_OVERRIDES_BY_LANDMARK_ID.yecheng,
  许昌: CITY_DURABILITY_LEVEL_OVERRIDES_BY_LANDMARK_ID.xuchang,
  长安: CITY_DURABILITY_LEVEL_OVERRIDES_BY_LANDMARK_ID.hejian,
  成都: CITY_DURABILITY_LEVEL_OVERRIDES_BY_LANDMARK_ID.chengdu,
  建业: CITY_DURABILITY_LEVEL_OVERRIDES_BY_LANDMARK_ID.jianye,
}

export type CitySiegeDurabilityFailureCode =
  | 'unknown_faction'
  | 'unknown_unit'
  | 'unit_faction_mismatch'
  | 'unknown_tile'
  | 'target_not_city'
  | 'friendly_city'
  | 'unit_not_on_tile'
  | 'hostile_defenders_present'
  | 'invalid_siege_damage'

export type CityDurabilitySnapshot = {
  tileId: string
  role: CityDurabilityRole
  cityLevel: number
  durability: number
  durabilityMax: number
}

export type CitySiegeDurabilityResult =
  | {
      ok: true
      world: WorldState
      tileId: string
      cityHallTileId: string
      previousOwner: string
      durabilityRole: CityDurabilityRole
      durabilityBefore: number
      durabilityAfter: number
      durabilityMax: number
      damage: number
      breached: boolean
      ownershipTransferred: boolean
      summary: string
    }
  | {
      ok: false
      message: string
      failureCode: CitySiegeDurabilityFailureCode
    }

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function isCityDurabilityTile(tile: Pick<Tile, 'type' | 'cityLevel'>) {
  return tile.type === 'city'
}

export function isLuoyangCityTile(tile: Pick<Tile, 'landmarkId' | 'landmarkName' | 'name'>) {
  return tile.landmarkId === 'luoyang' || tile.landmarkName?.includes('洛阳') === true || tile.name.includes('洛阳')
}

export function resolveCityDurabilityLevelOverride(
  tile: Pick<Tile, 'landmarkId' | 'landmarkName' | 'name'>,
): CityDurabilityLevelOverride | undefined {
  const landmarkId = tile.landmarkId?.trim()
  if (landmarkId) {
    const override = CITY_DURABILITY_LEVEL_OVERRIDES_BY_LANDMARK_ID[landmarkId]
    if (override) {
      return override
    }
  }

  const labels = [tile.landmarkName, tile.name]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
  for (const label of labels) {
    const exact = CITY_DURABILITY_LEVEL_OVERRIDES_BY_LANDMARK_NAME[label]
    if (exact) {
      return exact
    }
    const partial = Object.entries(CITY_DURABILITY_LEVEL_OVERRIDES_BY_LANDMARK_NAME)
      .find(([cityName]) => label.includes(cityName))?.[1]
    if (partial) {
      return partial
    }
  }

  return undefined
}

export function resolveCityDurabilityLevel(tile: Pick<Tile, 'cityLevel' | 'landmarkId' | 'landmarkName' | 'name'>) {
  const override = resolveCityDurabilityLevelOverride(tile)
  if (override) {
    return override.cityLevel
  }
  return clampInteger(tile.cityLevel ?? 3, 3, LUOYANG_CITY_DURABILITY_LEVEL)
}

export function resolveCityDurabilityRole(world: WorldState, tile: Pick<Tile, 'id'>): CityDurabilityRole {
  const cluster = world.map.overlays.cityClusters.find((candidate) =>
    candidate.cityHallTileId === tile.id || candidate.tileIds.includes(tile.id),
  )
  if (!cluster) {
    return 'center'
  }
  return cluster.cityHallTileId === tile.id ? 'center' : 'wall'
}

export function isPlayerHomeCityTile(world: WorldState, tile: Pick<Tile, 'id'>) {
  return world.factions.player?.heroCommand.homeTileId === tile.id
}

export function resolveCityDurabilityMax(
  world: WorldState,
  tile: Pick<Tile, 'id' | 'type' | 'cityLevel' | 'landmarkId' | 'landmarkName' | 'name'>,
  role: CityDurabilityRole = resolveCityDurabilityRole(world, tile),
) {
  if (!isCityDurabilityTile(tile)) {
    return undefined
  }
  if (role === 'wall') {
    return CITY_WALL_DURABILITY_MAX
  }
  if (isPlayerHomeCityTile(world, tile)) {
    return PLAYER_HOME_CITY_CENTER_DURABILITY_MAX
  }
  return resolveCityDurabilityLevel(tile) * SYSTEM_CITY_DURABILITY_PER_LEVEL
}

export function resolveCityDurabilitySnapshot(world: WorldState, tile: Tile): CityDurabilitySnapshot | undefined {
  const role = resolveCityDurabilityRole(world, tile)
  const durabilityMax = resolveCityDurabilityMax(world, tile, role)
  if (durabilityMax === undefined) {
    return undefined
  }
  const durability = clampInteger(tile.cityDurability ?? durabilityMax, 0, durabilityMax)
  return {
    tileId: tile.id,
    role,
    cityLevel: resolveCityDurabilityLevel(tile),
    durability,
    durabilityMax,
  }
}

export function ensureCityDurabilityForTile(world: WorldState, tile: Tile): CityDurabilitySnapshot | undefined {
  const snapshot = resolveCityDurabilitySnapshot(world, tile)
  if (!snapshot) {
    return undefined
  }
  tile.cityDurabilityRole = snapshot.role
  tile.cityDurabilityMax = snapshot.durabilityMax
  tile.cityDurability = snapshot.durability
  return snapshot
}

export function increaseCityDurabilityMaxWithoutRepair(tile: Tile, nextDurabilityMax: number) {
  const normalizedMax = Math.max(1, Math.round(nextDurabilityMax))
  const durabilityMax = Math.max(tile.cityDurabilityMax ?? 0, normalizedMax)
  const current = Number.isFinite(tile.cityDurability)
    ? clampInteger(tile.cityDurability ?? durabilityMax, 0, durabilityMax)
    : durabilityMax
  tile.cityDurabilityMax = durabilityMax
  tile.cityDurability = Math.min(current, tile.cityDurabilityMax)
}

export function resolveCitySiegeDurability(
  world: WorldState,
  params: {
    factionId: string
    unitId: string
    tileId: string
    damage: number
  },
): CitySiegeDurabilityResult {
  const faction = world.factions[params.factionId]
  if (!faction) {
    return { ok: false, message: `Unknown faction: ${params.factionId}`, failureCode: 'unknown_faction' }
  }

  const unit = world.units.find((candidate) => candidate.id === params.unitId)
  if (!unit) {
    return { ok: false, message: `Unit not found: ${params.unitId}`, failureCode: 'unknown_unit' }
  }
  if (unit.faction !== params.factionId) {
    return {
      ok: false,
      message: `Unit ${params.unitId} does not belong to faction ${params.factionId}.`,
      failureCode: 'unit_faction_mismatch',
    }
  }

  const tile = world.map.tiles.find((candidate) => candidate.id === params.tileId)
  if (!tile) {
    return { ok: false, message: `Tile not found: ${params.tileId}`, failureCode: 'unknown_tile' }
  }
  if (!isCityDurabilityTile(tile)) {
    return { ok: false, message: `Tile ${params.tileId} is not a city tile.`, failureCode: 'target_not_city' }
  }
  if (tile.owner === params.factionId) {
    return { ok: false, message: `Tile ${params.tileId} is already controlled by ${params.factionId}.`, failureCode: 'friendly_city' }
  }
  if (unit.tileId !== params.tileId) {
    return { ok: false, message: `Unit ${params.unitId} is not on city tile ${params.tileId}.`, failureCode: 'unit_not_on_tile' }
  }
  const hostileDefenders = world.units.filter((candidate) =>
    candidate.faction !== params.factionId &&
    candidate.tileId === params.tileId,
  )
  if (hostileDefenders.length > 0) {
    return {
      ok: false,
      message: `City ${params.tileId} still has hostile defenders; clear defenders before damaging durability.`,
      failureCode: 'hostile_defenders_present',
    }
  }

  const damage = Math.round(params.damage)
  if (!Number.isFinite(damage) || damage <= 0) {
    return { ok: false, message: 'Siege damage must be a positive integer.', failureCode: 'invalid_siege_damage' }
  }

  const snapshot = ensureCityDurabilityForTile(world, tile)
  if (!snapshot) {
    return { ok: false, message: `Tile ${params.tileId} is not a city durability target.`, failureCode: 'target_not_city' }
  }

  const durabilityBefore = snapshot.durability
  const durabilityAfter = Math.max(0, durabilityBefore - damage)
  tile.cityDurability = durabilityAfter
  tile.cityDurabilityMax = snapshot.durabilityMax
  tile.cityDurabilityRole = snapshot.role

  const cluster = world.map.overlays.cityClusters.find((candidate) =>
    candidate.cityHallTileId === tile.id || candidate.tileIds.includes(tile.id),
  )
  const cityHallTileId = cluster?.cityHallTileId ?? tile.id
  const previousOwner = tile.owner
  const breached = snapshot.role === 'center' && durabilityAfter === 0
  let ownershipTransferred = false

  if (breached) {
    tile.owner = params.factionId
    ownershipTransferred = previousOwner !== params.factionId

    if (cluster && cluster.cityHallTileId === tile.id) {
      cluster.owner = params.factionId as typeof cluster.owner
      cluster.camp = params.factionId === 'player' ? 'human_controlled' : 'autonomous'
      for (const tileId of cluster.tileIds) {
        const cityTile = world.map.tiles.find((candidate) => candidate.id === tileId)
        if (cityTile) {
          cityTile.owner = params.factionId as typeof cityTile.owner
        }
      }
    }

    faction.capturedCities ??= []
    if (!faction.capturedCities.includes(cityHallTileId)) {
      faction.capturedCities.push(cityHallTileId)
    }
  }

  return {
    ok: true,
    world,
    tileId: tile.id,
    cityHallTileId,
    previousOwner,
    durabilityRole: snapshot.role,
    durabilityBefore,
    durabilityAfter,
    durabilityMax: snapshot.durabilityMax,
    damage,
    breached,
    ownershipTransferred,
    summary: breached
      ? `${unit.name} 已击破 ${tile.name} 城心耐久，城市控制权转入 ${params.factionId}。`
      : `${unit.name} 对 ${tile.name} 造成 ${damage} 点攻城耐久伤害，剩余 ${durabilityAfter}/${snapshot.durabilityMax}。`,
  }
}
