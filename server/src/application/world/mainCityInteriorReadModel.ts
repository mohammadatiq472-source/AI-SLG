import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type {
  MainCityInteriorAssetKind,
  MainCityInteriorConstructionWorkOrder,
  MainCityInteriorReadModel,
  MainCityInteriorReadModelResponse,
  MainCityInteriorTaxRuntime,
  MainCityInteriorTaxScheduleSlot,
} from '../../../../shared/contracts/game'
import { parseMainCityInteriorReadModel } from '../../../../shared/schemas/mainCityInteriorReadModel'

const MAIN_CITY_INTERIOR_READ_MODEL_PATH = resolve(
  process.cwd(),
  'godot-client',
  'data',
  'ui',
  'main_city_interior_player_read_model.json',
)

export type MainCityInteriorReadModelOptions = {
  playerId?: string
  factionId?: string
  cityStateId?: string
  cityLabel?: string
  now?: Date
}

export type MainCityInteriorWorkOrderActionReceipt = {
  receipt_id: string
  world_action: 'interiorWorkOrderAction'
  queue_item_id: string
  action_id: string
  source: 'server_interior_work_order_action'
  server_authority: true
  player_id: string
  city_state_id: string
  city_label: string
  message: string
  created_at: string
}

export type MainCityInteriorWorkOrderActionResult = {
  ok: boolean
  worldAction: 'interiorWorkOrderAction'
  queueItemId: string
  actionId: string
  authority: 'server'
  receiptSource: 'server_interior_work_order_action'
  receiptId?: string
  playerMessage?: string
  readback?: {
    schemaVersion: 'main_city_interior_work_order_action_readback_v1'
    queueItemId: string
    actionId: string
    serverAuthority: true
    receiptId: string
  }
  failureCode?: string
  message?: string
}

const workOrderActionReceiptsByScope = new Map<string, MainCityInteriorWorkOrderActionReceipt[]>()

export function getMainCityInteriorReadModelResponse(
  options: MainCityInteriorReadModelOptions = {},
): MainCityInteriorReadModelResponse {
  const raw = readFileSync(MAIN_CITY_INTERIOR_READ_MODEL_PATH, 'utf-8')
  const payload = JSON.parse(raw) as unknown
  const normalizedPayload = normalizeMainCityInteriorReadModelPayload(payload, options)
  const parsed = parseMainCityInteriorReadModel(normalizedPayload)
  return {
    mainCityInterior: attachWorkOrderActionReceipts(personalizeMainCityInteriorReadModel(parsed, options), options),
  }
}

export function handleMainCityInteriorWorkOrderAction(params: {
  playerId?: string
  cityStateId?: string
  cityLabel?: string
  queueItemId: string
  actionId: string
  now?: Date
}): MainCityInteriorWorkOrderActionResult {
  const now = params.now ?? new Date()
  const model = getMainCityInteriorReadModelResponse({
    playerId: params.playerId,
    cityStateId: params.cityStateId,
    cityLabel: params.cityLabel,
    now,
  }).mainCityInterior
  const queueItemId = normalizeText(params.queueItemId)
  const actionId = normalizeText(params.actionId)
  const workOrder = [
    ...model.construction_queues.city_inner,
    ...model.construction_queues.world_outer,
  ].find((item) => item.queue_item_id === queueItemId)

  if (!workOrder) {
    return {
      ok: false,
      worldAction: 'interiorWorkOrderAction',
      queueItemId,
      actionId,
      authority: 'server',
      receiptSource: 'server_interior_work_order_action',
      failureCode: 'interior_work_order_not_found',
      message: '未找到这条政务工单。',
    }
  }

  if (workOrder.primary_action.action_id !== actionId) {
    return {
      ok: false,
      worldAction: 'interiorWorkOrderAction',
      queueItemId,
      actionId,
      authority: 'server',
      receiptSource: 'server_interior_work_order_action',
      failureCode: 'interior_work_order_action_mismatch',
      message: '这条政务工单暂不支持该操作。',
    }
  }

  const scope = buildWorkOrderActionScope(model.player_id, model.city_state_id)
  const receiptId = `interior_work_order_action:${model.player_id}:${model.city_state_id}:${queueItemId}:${actionId}:${now.getTime()}`
  const playerMessage = workOrder.primary_action.label === '查看'
    ? '已查看政务进度。'
    : `已记录${workOrder.primary_action.label}。`
  const receipt: MainCityInteriorWorkOrderActionReceipt = {
    receipt_id: receiptId,
    world_action: 'interiorWorkOrderAction',
    queue_item_id: queueItemId,
    action_id: actionId,
    source: 'server_interior_work_order_action',
    server_authority: true,
    player_id: model.player_id,
    city_state_id: model.city_state_id,
    city_label: model.tax_runtime.city_label,
    message: playerMessage,
    created_at: now.toISOString(),
  }
  const receipts = workOrderActionReceiptsByScope.get(scope) ?? []
  receipts.unshift(receipt)
  workOrderActionReceiptsByScope.set(scope, receipts.slice(0, 20))

  return {
    ok: true,
    worldAction: 'interiorWorkOrderAction',
    queueItemId,
    actionId,
    authority: 'server',
    receiptSource: 'server_interior_work_order_action',
    receiptId,
    playerMessage,
    readback: {
      schemaVersion: 'main_city_interior_work_order_action_readback_v1',
      queueItemId,
      actionId,
      serverAuthority: true,
      receiptId,
    },
  }
}

type MutableJsonObject = Record<string, unknown>

type AssetRefContext = {
  catalogVersion: string
  skin: string
}

function normalizeMainCityInteriorReadModelPayload(
  payload: unknown,
  options: MainCityInteriorReadModelOptions,
): unknown {
  if (!isRecord(payload)) {
    return payload
  }

  const model: MutableJsonObject = { ...payload }
  const playerId = normalizeText(options.playerId) || normalizeText(options.factionId) || normalizeText(model.player_id) || 'player_preview'
  const cityStateId = normalizeText(options.cityStateId) || normalizeText(model.city_state_id) || 'primary_city'
  const catalogVersion = normalizeText(model.asset_catalog_version) || 'main_city_assets_round_04'
  const context: AssetRefContext = {
    catalogVersion,
    skin: `skin_${toStableToken(playerId)}_${toStableToken(cityStateId)}`,
  }

  model.player_id = playerId
  model.city_state_id = cityStateId
  model.asset_catalog_version = catalogVersion

  const catalogItems = toRecordArray(model.asset_catalog)
  const catalogById = new Map<string, MutableJsonObject>()
  for (const item of catalogItems) {
    const assetId = normalizeText(item.asset_id)
    if (assetId) {
      catalogById.set(assetId, item)
    }
  }

  model.asset_catalog = catalogItems.map((item, index) => {
    const enriched = enrichAssetRef(item, catalogById.get(normalizeText(item.asset_id)), context, 'facility', index)
    return {
      ...item,
      ...enriched,
      display_name: normalizeText(item.display_name) || enriched.asset_id,
      res_path: normalizeText(item.res_path) || normalizeText(enriched.fallback_path) || undefined,
    }
  })

  const taxRuntime = cloneRecord(model.tax_runtime)
  if (taxRuntime) {
    taxRuntime.hero_asset_ref = enrichAssetRef(
      taxRuntime.hero_asset_ref,
      catalogById.get(normalizeText(readAssetId(taxRuntime.hero_asset_ref))),
      context,
      'facility',
      0,
    )
    taxRuntime.schedule_slots = toRecordArray(taxRuntime.schedule_slots).map((slot, index) => ({
      ...slot,
      asset_ref: enrichAssetRef(
        slot.asset_ref,
        catalogById.get(normalizeText(readAssetId(slot.asset_ref))),
        context,
        'facility',
        index,
      ),
    }))
    model.tax_runtime = taxRuntime
  }

  const constructionQueues = cloneRecord(model.construction_queues)
  if (constructionQueues) {
    constructionQueues.city_inner = normalizeWorkOrders(
      constructionQueues.city_inner,
      catalogById,
      context,
      'facility',
    )
    constructionQueues.world_outer = normalizeWorkOrders(
      constructionQueues.world_outer,
      catalogById,
      context,
      'world_structure',
    )
    model.construction_queues = constructionQueues
  }

  return model
}

function normalizeWorkOrders(
  value: unknown,
  catalogById: Map<string, MutableJsonObject>,
  context: AssetRefContext,
  fallbackKind: MainCityInteriorAssetKind,
): MutableJsonObject[] {
  return toRecordArray(value).map((workOrder, index) => ({
    ...workOrder,
    asset_ref: enrichAssetRef(
      workOrder.asset_ref,
      catalogById.get(normalizeText(readAssetId(workOrder.asset_ref))),
      context,
      fallbackKind,
      index,
    ),
  }))
}

function enrichAssetRef(
  value: unknown,
  catalogItem: MutableJsonObject | undefined,
  context: AssetRefContext,
  fallbackKind: MainCityInteriorAssetKind,
  index: number,
): MutableJsonObject {
  const assetRef = cloneRecord(value) ?? {}
  const assetId =
    normalizeText(assetRef.asset_id) ||
    normalizeText(catalogItem?.asset_id) ||
    `${fallbackKind}_${index + 1}`
  const fallbackPath =
    normalizeText(assetRef.fallback_path) ||
    normalizeText(catalogItem?.fallback_path) ||
    normalizeText(catalogItem?.res_path)
  const remoteUrl = normalizeText(assetRef.remote_url) || normalizeText(catalogItem?.remote_url)
  const version = normalizeText(assetRef.version) || normalizeText(catalogItem?.version)
  return {
    ...assetRef,
    asset_id: assetId,
    asset_kind: normalizeAssetKind(assetRef.asset_kind) ?? normalizeAssetKind(catalogItem?.asset_kind) ?? fallbackKind,
    variant: normalizeText(assetRef.variant) || normalizeText(catalogItem?.variant) || 'default',
    level: normalizeNonnegativeInt(assetRef.level) ?? normalizeNonnegativeInt(catalogItem?.level) ?? 1,
    skin: normalizeText(assetRef.skin) || normalizeText(catalogItem?.skin) || context.skin,
    catalog_version:
      normalizeText(assetRef.catalog_version) ||
      normalizeText(catalogItem?.catalog_version) ||
      context.catalogVersion,
    fallback_path: fallbackPath || undefined,
    remote_url: remoteUrl || undefined,
    version: version || undefined,
  }
}

function personalizeMainCityInteriorReadModel(
  model: MainCityInteriorReadModel,
  options: MainCityInteriorReadModelOptions,
): MainCityInteriorReadModel {
  const now = options.now ?? new Date()
  const playerId = normalizeText(options.factionId) || model.player_id
  const cityStateId = normalizeText(options.cityStateId) || model.city_state_id
  const cityLabel = normalizeText(options.cityLabel) || model.tax_runtime.city_label
  const taxRuntime = personalizeTaxRuntime(model.tax_runtime, cityLabel, now)
  const cityInner = model.construction_queues.city_inner.map((item) =>
    personalizeWorkOrder(item, cityLabel, now),
  )
  const worldOuter = model.construction_queues.world_outer.map((item) =>
    personalizeWorkOrder(item, item.location_label, now),
  )
  return {
    ...model,
    player_id: playerId,
    city_state_id: cityStateId,
    generated_at: now.toISOString(),
    tax_runtime: taxRuntime,
    construction_queues: {
      ...model.construction_queues,
      city_inner: cityInner,
      world_outer: worldOuter,
    },
  }
}

function attachWorkOrderActionReceipts(
  model: MainCityInteriorReadModel,
  _options: MainCityInteriorReadModelOptions,
): MainCityInteriorReadModel {
  return {
    ...model,
    work_order_action_receipts: [...(workOrderActionReceiptsByScope.get(buildWorkOrderActionScope(model.player_id, model.city_state_id)) ?? [])],
  } as MainCityInteriorReadModel
}

function buildWorkOrderActionScope(playerId: string, cityStateId: string): string {
  return `${normalizeText(playerId) || 'player_preview'}::${normalizeText(cityStateId) || 'primary_city'}`
}

function personalizeTaxRuntime(
  taxRuntime: MainCityInteriorTaxRuntime,
  cityLabel: string,
  now: Date,
): MainCityInteriorTaxRuntime {
  const scheduleSlots = taxRuntime.schedule_slots.map((slot) => personalizeTaxSlot(slot, now))
  const collectableSlot = scheduleSlots.find((slot) => slot.collectable_now)
  const nextSlot = scheduleSlots.find((slot) => slot.state === 'upcoming') ?? collectableSlot ?? scheduleSlots[0]
  return {
    ...taxRuntime,
    city_label: cityLabel,
    collectable_now: collectableSlot !== undefined,
    next_collect_at: resolveSlotIso(now, nextSlot?.time_label ?? '12:00'),
    next_collect_label: nextSlot ? `${nextSlot.label} ${nextSlot.time_label}` : taxRuntime.next_collect_label,
    remaining_sec: collectableSlot ? 0 : nextSlot?.remaining_sec ?? taxRuntime.remaining_sec,
    remaining_label: collectableSlot ? '现在可收' : nextSlot?.remaining_label ?? taxRuntime.remaining_label,
    state_label: collectableSlot ? '可征收' : '等待',
    primary_action: {
      ...taxRuntime.primary_action,
      label: collectableSlot ? '征收' : '等待',
      enabled: collectableSlot !== undefined,
      disabled_reason: collectableSlot ? undefined : '当前没有可征收税课',
    },
    schedule_slots: scheduleSlots,
  }
}

function personalizeTaxSlot(slot: MainCityInteriorTaxScheduleSlot, now: Date): MainCityInteriorTaxScheduleSlot {
  const remainingSec = secondsUntilTimeLabel(now, slot.time_label)
  if (remainingSec === 0 && !slot.collected_today) {
    return {
      ...slot,
      state: 'collectable',
      state_label: '可征收',
      collectable_now: true,
      remaining_sec: 0,
      remaining_label: '现在可收',
    }
  }
  if (slot.collected_today) {
    return {
      ...slot,
      state: 'collected',
      state_label: '已收',
      collectable_now: false,
      remaining_sec: 0,
      remaining_label: '已入库',
    }
  }
  return {
    ...slot,
    state: 'upcoming',
    state_label: '未到',
    collectable_now: false,
    remaining_sec: remainingSec,
    remaining_label: formatRemainingLabel(remainingSec),
  }
}

function personalizeWorkOrder(
  workOrder: MainCityInteriorConstructionWorkOrder,
  locationLabel: string,
  now: Date,
): MainCityInteriorConstructionWorkOrder {
  const remainingSec = secondsUntilIso(now, workOrder.end_at)
  const progressPercent = calculateProgressPercent(workOrder.start_at, workOrder.end_at, now)
  return {
    ...workOrder,
    location_label: locationLabel || workOrder.location_label,
    state: remainingSec > 0 ? 'running' : 'complete',
    state_label: remainingSec > 0 ? workOrder.state_label : '已完成',
    remaining_sec: remainingSec,
    remaining_label: remainingSec > 0 ? formatRemainingLabel(remainingSec) : '可查看',
    progress_percent: progressPercent,
  }
}

function secondsUntilTimeLabel(now: Date, timeLabel: string): number {
  const [hourRaw, minuteRaw] = timeLabel.split(':')
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return 0
  }
  const target = new Date(now)
  target.setHours(hour, minute, 0, 0)
  const diffMs = target.getTime() - now.getTime()
  if (diffMs <= 0) {
    return 0
  }
  return Math.ceil(diffMs / 1000)
}

function secondsUntilIso(now: Date, iso: string): number {
  const target = new Date(iso)
  const time = target.getTime()
  if (!Number.isFinite(time)) {
    return 0
  }
  return Math.max(0, Math.ceil((time - now.getTime()) / 1000))
}

function resolveSlotIso(now: Date, timeLabel: string): string {
  const [hourRaw, minuteRaw] = timeLabel.split(':')
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)
  const target = new Date(now)
  if (Number.isFinite(hour) && Number.isFinite(minute)) {
    target.setHours(hour, minute, 0, 0)
  }
  return target.toISOString()
}

function calculateProgressPercent(startAt: string, endAt: string, now: Date): number {
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()
  const current = now.getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round(((current - start) / (end - start)) * 100)))
}

function formatRemainingLabel(remainingSec: number): string {
  if (remainingSec <= 0) {
    return '现在可收'
  }
  const minutes = Math.floor(remainingSec / 60)
  const seconds = remainingSec % 60
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const restMinutes = minutes % 60
    return `剩余 ${hours.toString().padStart(2, '0')}:${restMinutes.toString().padStart(2, '0')}`
  }
  return `剩余 ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isRecord(value: unknown): value is MutableJsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cloneRecord(value: unknown): MutableJsonObject | undefined {
  return isRecord(value) ? { ...value } : undefined
}

function toRecordArray(value: unknown): MutableJsonObject[] {
  return Array.isArray(value) ? value.filter(isRecord).map((item) => ({ ...item })) : []
}

function readAssetId(value: unknown): string {
  return isRecord(value) ? normalizeText(value.asset_id) : ''
}

function normalizeAssetKind(value: unknown): MainCityInteriorAssetKind | undefined {
  if (value === 'facility' || value === 'world_structure' || value === 'fallback') {
    return value
  }
  return undefined
}

function normalizeNonnegativeInt(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return undefined
  }
  return Math.max(0, Math.floor(parsed))
}

function toStableToken(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || 'default'
}
