import { z } from 'zod'
import type { MainCityInteriorReadModel } from '../contracts/game'

const assetRefSchema = z
  .object({
    asset_id: z.string().trim().min(1),
    asset_kind: z.enum(['facility', 'world_structure', 'fallback']),
    variant: z.string().trim().min(1),
    level: z.number().int().nonnegative(),
    skin: z.string().trim().min(1),
    catalog_version: z.string().trim().min(1),
    fallback_path: z.string().trim().min(1).optional(),
    remote_url: z.string().trim().min(1).optional(),
    version: z.string().trim().min(1).optional(),
  })
  .passthrough()

const assetCatalogItemSchema = assetRefSchema
  .extend({
    display_name: z.string().trim().min(1),
    res_path: z.string().trim().min(1).optional(),
  })
  .passthrough()

const primaryActionSchema = z
  .object({
    action_id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    enabled: z.boolean(),
    disabled_reason: z.string().trim().min(1).optional(),
  })
  .passthrough()

const taxScheduleSlotSchema = z
  .object({
    slot_id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    time_label: z.string().trim().min(1),
    title: z.string().trim().min(1),
    state: z.enum(['collected', 'collectable', 'locked', 'upcoming']),
    state_label: z.string().trim().min(1),
    collectable_now: z.boolean(),
    collected_today: z.boolean(),
    remaining_sec: z.number().int().nonnegative(),
    remaining_label: z.string().trim().min(1),
    reward_label: z.string().trim().min(1),
    asset_ref: assetRefSchema,
    emphasized: z.boolean().optional(),
  })
  .passthrough()

const taxRuntimeSchema = z
  .object({
    mode: z.literal('tax_schedule_runtime_v1'),
    title: z.string().trim().min(1),
    city_label: z.string().trim().min(1),
    collectable_now: z.boolean(),
    next_collect_at: z.string().trim().min(1),
    next_collect_label: z.string().trim().min(1),
    remaining_sec: z.number().int().nonnegative(),
    remaining_label: z.string().trim().min(1),
    state_label: z.string().trim().min(1),
    hero_asset_ref: assetRefSchema,
    primary_action: primaryActionSchema,
    schedule_slots: z.array(taxScheduleSlotSchema).min(1),
  })
  .passthrough()

const targetCoordSchema = z
  .object({
    x: z.number().int(),
    y: z.number().int(),
  })
  .passthrough()

const constructionWorkOrderSchema = z
  .object({
    queue_item_id: z.string().trim().min(1),
    domain: z.enum(['city_inner', 'world_outer']),
    queue_item_type: z.enum(['facility_upgrade', 'fortress_build', 'camp_ready', 'other']),
    title: z.string().trim().min(1),
    target_name: z.string().trim().min(1),
    location_label: z.string().trim().min(1),
    target_coord: targetCoordSchema.optional(),
    state: z.enum(['running', 'blocked', 'complete', 'waiting']),
    state_label: z.string().trim().min(1),
    start_at: z.string().trim().min(1),
    end_at: z.string().trim().min(1),
    remaining_sec: z.number().int().nonnegative(),
    remaining_label: z.string().trim().min(1),
    progress_percent: z.number().int().min(0).max(100),
    primary_action: primaryActionSchema,
    asset_ref: assetRefSchema,
  })
  .passthrough()

const constructionQueuesSchema = z
  .object({
    mode: z.literal('construction_work_orders_v1'),
    city_inner: z.array(constructionWorkOrderSchema),
    world_outer: z.array(constructionWorkOrderSchema),
  })
  .passthrough()

export const mainCityInteriorReadModelSchema = z
  .object({
    schema_version: z.literal('main_city_interior_read_model_v1'),
    player_id: z.string().trim().min(1),
    city_state_id: z.string().trim().min(1),
    generated_at: z.string().trim().min(1),
    asset_catalog_version: z.string().trim().min(1),
    asset_ref_mode: z.literal('asset_ref_with_fallback_path_v1'),
    tax_runtime: taxRuntimeSchema,
    construction_queues: constructionQueuesSchema,
    asset_catalog: z.array(assetCatalogItemSchema).min(1),
  })
  .passthrough()

export function parseMainCityInteriorReadModel(payload: unknown): MainCityInteriorReadModel {
  return mainCityInteriorReadModelSchema.parse(payload)
}
