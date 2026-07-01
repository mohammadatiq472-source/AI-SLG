import { z } from 'zod'
import type { MainCityFacilityTreeReadModel } from '../contracts/game'

const mainCityFacilityTreeCostItemSchema = z.object({
  resource: z.string().trim().min(1),
  amount: z.number().finite(),
})

const mainCityFacilityTreeEffectItemSchema = z.object({
  stat: z.string().trim().min(1),
  before: z.string().trim().min(1),
  after: z.string().trim().min(1),
})

const mainCityFacilityTreeBuildingSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    iconText: z.string().trim().min(1),
    iconFile: z.string().trim().min(1),
    treeTier: z.number().int(),
    treeSlot: z.number().int(),
    treeAnchorX: z.number().finite(),
    treeAnchorY: z.number().finite(),
    level: z.string().trim().min(1),
    status: z.string().trim().min(1),
    body: z.string(),
    enabled: z.boolean(),
    cost_items: z.array(mainCityFacilityTreeCostItemSchema).min(1),
    effect_items: z.array(mainCityFacilityTreeEffectItemSchema).min(1),
  })
  .passthrough()

export const mainCityFacilityTreeReadModelSchema = z
  .object({
    schema_version: z.literal('main_city_facility_tree_read_model_v2'),
    cost_mode: z.literal('structured_cost_items_v1'),
    effect_mode: z.literal('structured_effect_items_v1'),
    asset_root: z.string().trim().min(1),
    asset_manifest_path: z.string().trim().min(1),
    buildings: z.array(mainCityFacilityTreeBuildingSchema).min(1),
  })
  .passthrough()

export function parseMainCityFacilityTreeReadModel(payload: unknown): MainCityFacilityTreeReadModel {
  return mainCityFacilityTreeReadModelSchema.parse(payload)
}
