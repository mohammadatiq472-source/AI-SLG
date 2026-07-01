import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type {
  MainCityFacilityTreeBuilding,
  MainCityFacilityTreeReadModel,
  MainCityFacilityTreeReadModelResponse,
  WorldState,
} from '../../../../shared/contracts/game'
import { parseMainCityFacilityTreeReadModel } from '../../../../shared/schemas/mainCityFacilityTreeReadModel'

const MAIN_CITY_FACILITY_TREE_READ_MODEL_PATH = resolve(
  process.cwd(),
  'godot-client',
  'data',
  'ui',
  'main_city_facility_tree_read_model.json',
)

export type MainCityFacilityTreeReadModelOptions = {
  world?: Readonly<WorldState>
  cityId?: string
}

export function getMainCityFacilityTreeReadModelResponse(
  options: MainCityFacilityTreeReadModelOptions = {},
): MainCityFacilityTreeReadModelResponse {
  const raw = readFileSync(MAIN_CITY_FACILITY_TREE_READ_MODEL_PATH, 'utf-8')
  const payload = JSON.parse(raw) as unknown
  const parsed = parseMainCityFacilityTreeReadModel(payload)
  return {
    mainCityFacilityTree: applyFacilityTreeAuthorityState(parsed, options),
  }
}

function applyFacilityTreeAuthorityState(
  model: MainCityFacilityTreeReadModel,
  options: MainCityFacilityTreeReadModelOptions,
): MainCityFacilityTreeReadModel {
  const authority = options.world?.slgDomainState?.cityBuildingGroupsByCity
  if (!authority || Object.keys(authority).length === 0) {
    return model
  }

  const cityIds = options.cityId?.trim() ? [options.cityId.trim()] : Object.keys(authority)
  const buildingAuthorityById = new Map<string, {
    cityId: string
    groupId: string
    level: number
    statusText: string
    updatedTick: number
    description?: string
  }>()

  for (const cityId of cityIds) {
    const groups = authority[cityId]
    if (!groups) {
      continue
    }

    for (const [groupId, buildings] of Object.entries(groups)) {
      for (const [buildingId, state] of Object.entries(buildings)) {
        buildingAuthorityById.set(buildingId, {
          cityId,
          groupId,
          level: state.level,
          statusText: state.statusText,
          updatedTick: state.updatedTick,
          description: state.description,
        })
      }
    }
  }

  if (buildingAuthorityById.size === 0) {
    return model
  }

  return {
    ...model,
    buildings: model.buildings.map((building) => {
      const state = buildingAuthorityById.get(building.id)
      if (!state) {
        return building
      }

      return applyFacilityBuildingAuthorityState(building, state)
    }),
  }
}

function applyFacilityBuildingAuthorityState(
  building: MainCityFacilityTreeBuilding,
  state: {
    cityId: string
    groupId: string
    level: number
    statusText: string
    updatedTick: number
    description?: string
  },
): MainCityFacilityTreeBuilding {
  const cap = resolveLevelCap(building.level, state.level)
  return {
    ...building,
    level: `${state.level}/${cap}`,
    status: state.statusText,
    body: state.description ?? building.body,
    enabled: true,
    authority_source: 'world.slgDomainState.cityBuildingGroupsByCity',
    authority_city_id: state.cityId,
    authority_group_id: state.groupId,
    authority_updated_tick: state.updatedTick,
  } as MainCityFacilityTreeBuilding
}

function resolveLevelCap(levelText: string, currentLevel: number) {
  const [, rawCap] = levelText.split('/')
  const parsed = Number.parseInt(rawCap ?? '', 10)
  if (!Number.isFinite(parsed)) {
    return currentLevel
  }
  return Math.max(currentLevel, parsed)
}
