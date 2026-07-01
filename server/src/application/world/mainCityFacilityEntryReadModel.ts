import type {
  FactionState,
  MainCityFacilityEntryObservedAiPlayer,
  MainCityFacilityEntryReadModel,
  MainCityFacilityEntryReadModelResponse,
  MainCityFacilityTreeBuilding,
  Tile,
  WorldState,
} from '../../../../shared/contracts/game'
import { parseMainCityFacilityEntryReadModel } from '../../../../shared/schemas/mainCityFacilityEntryReadModel'
import { getMainCityFacilityTreeReadModelResponse } from './mainCityFacilityTreeReadModel'

export type MainCityFacilityEntryReadModelOptions = {
  world: WorldState
  factionId?: string
  playerId?: string
  cityId?: string
  observedAiPlayer?: MainCityFacilityEntryObservedAiPlayer
}

const FACILITY_TREE_PATH = '/api/world/main-city/facility-tree'
const INTERIOR_PATH = '/api/world/main-city/interior'

export function getMainCityFacilityEntryReadModelResponse(
  options: MainCityFacilityEntryReadModelOptions,
): MainCityFacilityEntryReadModelResponse {
  const factionId = normalizeText(options.observedAiPlayer?.factionId) || normalizeText(options.factionId) || 'player'
  const faction = options.world.factions[factionId]
  const observedHomeCityId = normalizeText(options.observedAiPlayer?.homeCityPlacement?.cityId)
    || normalizeText(options.observedAiPlayer?.homeCityId)
  const observedHomeCenterTileId = normalizeText(options.observedAiPlayer?.homeCityPlacement?.centerTileId)
    || normalizeText(options.observedAiPlayer?.homeCityTileId)
  const cityId = resolveMainCityId(options.world, faction, factionId, options.cityId, observedHomeCityId)
  const centerTileId = observedHomeCenterTileId || cityId
  const cityTile = options.world.map.tiles.find((tile) => tile.id === centerTileId)
    ?? options.world.map.tiles.find((tile) => tile.id === cityId)
  const ownerKind = options.observedAiPlayer ? 'ai' as const : 'human' as const
  const ownerPlayerId = options.observedAiPlayer?.aiPlayerId || normalizeText(options.playerId) || factionId
  const facilityTree = getMainCityFacilityTreeReadModelResponse({
    world: options.world,
    cityId,
  }).mainCityFacilityTree
  const facilities = facilityTree.buildings.map((building) =>
    buildFacilityEntryItem(building, ownerKind === 'ai'),
  )
  const selectedFacilityId = facilities.find((facility) => facility.enabled)?.facilityId ?? facilities[0]?.facilityId ?? 'city_lord_mansion'

  const model: MainCityFacilityEntryReadModel = {
    schema_version: 'main_city_facility_entry_read_model_v1',
    surfaceMode: 'same_surface_human_ai_readonly_v1',
    cityId,
    centerTileId,
    cityLabel: resolveCityLabel(cityTile, cityId),
    factionId,
    ownerKind,
    ownerPlayerId,
    readonly: ownerKind === 'ai',
    footprintId: ownerKind === 'ai' ? 'ai_city_3x3_initial' : 'player_city_3x3_initial',
    footprintSize: '3x3',
    anchorPolicy: 'center_cell',
    facilityTreePath: FACILITY_TREE_PATH,
    interiorPath: INTERIOR_PATH,
    facilities,
    selectedFacilityId,
    ...(options.observedAiPlayer
      ? {
          observedAiPlayerId: options.observedAiPlayer.aiPlayerId,
          observedAiPlayer: options.observedAiPlayer,
        }
      : {}),
  }

  return {
    mainCityFacilityEntry: parseMainCityFacilityEntryReadModel(model),
  }
}

function buildFacilityEntryItem(building: MainCityFacilityTreeBuilding, readonly: boolean) {
  const facilityId = normalizeText(building.id) || 'facility'
  const disabledReason = readonly
    ? '这是 AI 玩家主城，只能查看；要它行动，请回到 AI 面板。'
    : !building.enabled
      ? '设施暂未开放。'
      : undefined
  return {
    facilityId,
    label: normalizeText(building.label) || facilityId,
    status: normalizeText(building.status) || 'ready',
    enabled: building.enabled && !readonly,
    readonly,
    entryActionId: `main_city_facility_open:${facilityId}`,
    buildingIds: [facilityId],
    primaryBuildingId: facilityId,
    treeTier: building.treeTier,
    treeSlot: building.treeSlot,
    iconFile: normalizeText(building.iconFile) || `${facilityId}.png`,
    ...(disabledReason ? { disabledReason } : {}),
  }
}

function resolveMainCityId(
  world: WorldState,
  faction: FactionState | undefined,
  factionId: string,
  requestedCityId?: string,
  observedHomeCityId?: string,
) {
  const explicitCityId = normalizeText(requestedCityId)
  if (explicitCityId) {
    return explicitCityId
  }

  const aiHomeCityId = normalizeText(observedHomeCityId)
  if (aiHomeCityId) {
    return aiHomeCityId
  }

  const homeTileId = normalizeText(faction?.heroCommand?.homeTileId)
  if (homeTileId) {
    return homeTileId
  }

  const capturedCity = faction?.capturedCities?.find((cityId) => normalizeText(cityId) !== '')
  if (capturedCity) {
    return capturedCity
  }

  const ownedCity = world.map.tiles.find((tile) =>
    normalizeText(tile.owner) === factionId && isCityTile(tile),
  )
  return ownedCity?.id ?? 'tile_08'
}

function resolveCityLabel(tile: Tile | undefined, cityId: string) {
  const name = normalizeText(tile?.name)
  if (name) {
    return name
  }
  const district = normalizeText(tile?.district)
  if (district) {
    return district
  }
  return cityId
}

function isCityTile(tile: Tile) {
  return tile.type === 'city' || typeof tile.cityLevel === 'number'
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}
