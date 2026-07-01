import { z } from 'zod'
import type { MainCityFacilityEntryReadModel } from '../contracts/game'

const observedAiPlayerSchema = z
  .object({
    aiPlayerId: z.string().trim().min(1),
    displayName: z.string().trim().min(1),
    governorPlayerId: z.string().trim().min(1),
    factionId: z.string().trim().min(1),
    mode: z.literal('ai_player_readonly'),
  })
  .passthrough()

const facilityEntryItemSchema = z
  .object({
    facilityId: z.string().trim().min(1),
    label: z.string().trim().min(1),
    status: z.string().trim().min(1),
    enabled: z.boolean(),
    readonly: z.boolean(),
    entryActionId: z.string().trim().min(1),
    buildingIds: z.array(z.string().trim().min(1)).min(1),
    primaryBuildingId: z.string().trim().min(1),
    treeTier: z.number().int(),
    treeSlot: z.number().int(),
    iconFile: z.string().trim().min(1),
    disabledReason: z.string().trim().min(1).optional(),
  })
  .passthrough()

export const mainCityFacilityEntryReadModelSchema = z
  .object({
    schema_version: z.literal('main_city_facility_entry_read_model_v1'),
    surfaceMode: z.literal('same_surface_human_ai_readonly_v1'),
    cityId: z.string().trim().min(1),
    centerTileId: z.string().trim().min(1),
    cityLabel: z.string().trim().min(1),
    factionId: z.string().trim().min(1),
    ownerKind: z.enum(['human', 'ai']),
    ownerPlayerId: z.string().trim().min(1),
    readonly: z.boolean(),
    footprintId: z.enum(['player_city_3x3_initial', 'ai_city_3x3_initial']),
    footprintSize: z.literal('3x3'),
    anchorPolicy: z.literal('center_cell'),
    facilityTreePath: z.string().trim().min(1),
    interiorPath: z.string().trim().min(1),
    facilities: z.array(facilityEntryItemSchema).min(1),
    selectedFacilityId: z.string().trim().min(1),
    observedAiPlayerId: z.string().trim().min(1).optional(),
    observedAiPlayer: observedAiPlayerSchema.optional(),
  })
  .passthrough()

export function parseMainCityFacilityEntryReadModel(payload: unknown): MainCityFacilityEntryReadModel {
  return mainCityFacilityEntryReadModelSchema.parse(payload)
}
