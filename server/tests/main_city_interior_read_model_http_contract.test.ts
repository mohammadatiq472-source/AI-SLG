import assert from 'node:assert/strict'
import { mainCityInteriorReadModelSchema } from '../../shared/schemas/mainCityInteriorReadModel'
import {
  getAvailablePort,
  readArray,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail)

  try {
    const health = await waitForHealth(baseUrl, 90_000)
    assert.ok(health?.ok, `backend health check failed; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const response = await requestJson(
      baseUrl,
      '/api/world/main-city/interior?playerId=player_alpha&cityStateId=city_alpha&cityLabel=%E8%AF%95%E7%82%B9%E5%9F%8E',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(
      response.status,
      200,
      `main city interior endpoint failed; status=${response.status} payload=${JSON.stringify(response.data)}`,
    )

    const root = readObject(response.data)
    const model = mainCityInteriorReadModelSchema.parse(root.mainCityInterior)
    assert.equal(model.schema_version, 'main_city_interior_read_model_v1')
    assert.equal(model.player_id, 'player_alpha')
    assert.equal(model.city_state_id, 'city_alpha')
    assert.equal(model.tax_runtime.city_label, '试点城')
    assert.equal(model.asset_ref_mode, 'asset_ref_with_fallback_path_v1')
    assert.equal(model.tax_runtime.mode, 'tax_schedule_runtime_v1')
    assert.equal(model.construction_queues.mode, 'construction_work_orders_v1')
    assert.ok(readArray(model.asset_catalog).length >= 5, 'asset_catalog must expose local fallback assets')
    assertAssetRef(readObject(model.tax_runtime.hero_asset_ref), 'tax hero')

    const taxSlots = readArray(model.tax_runtime.schedule_slots)
    assert.equal(taxSlots.length, 6, 'tax schedule must expose six daily slots')
    assert.deepEqual(
      taxSlots.map((item) => String(readObject(item).slot_id)),
      [
        'dawn_market',
        'morning_tax',
        'noon_tax',
        'afternoon_patrol',
        'evening_granary',
        'night_warehouse',
      ],
      'tax schedule must expose stable six-slot ids',
    )
    for (const item of taxSlots) {
      const slot = readObject(item)
      assert.notEqual(slot.asset_ref, undefined, `tax slot ${slot.slot_id} must expose asset_ref`)
      assert.equal(slot.asset_path, undefined, `tax slot ${slot.slot_id} must not expose legacy asset_path`)
      assert.equal(typeof slot.remaining_sec, 'number', `tax slot ${slot.slot_id} must expose remaining_sec`)
      assertAssetRef(readObject(slot.asset_ref), `tax slot ${slot.slot_id}`)
    }

    const workOrders = [
      ...readArray(model.construction_queues.city_inner),
      ...readArray(model.construction_queues.world_outer),
    ]
    assert.ok(workOrders.length >= 4, 'construction queues must expose active city and world work orders')
    for (const item of workOrders) {
      const workOrder = readObject(item)
      assert.notEqual(workOrder.asset_ref, undefined, `work order ${workOrder.queue_item_id} must expose asset_ref`)
      assert.equal(workOrder.asset_path, undefined, `work order ${workOrder.queue_item_id} must not expose legacy asset_path`)
      assert.equal(typeof workOrder.remaining_sec, 'number', `work order ${workOrder.queue_item_id} must expose remaining_sec`)
      assert.equal(typeof workOrder.progress_percent, 'number', `work order ${workOrder.queue_item_id} must expose progress_percent`)
      assert.notEqual(workOrder.primary_action, undefined, `work order ${workOrder.queue_item_id} must expose primary_action`)
      assertAssetRef(readObject(workOrder.asset_ref), `work order ${workOrder.queue_item_id}`)
    }

    const betaResponse = await requestJson(
      baseUrl,
      '/api/world/main-city/interior?playerId=player_beta&cityStateId=city_beta&cityLabel=%E5%89%AF%E5%9F%8E',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(betaResponse.status, 200)
    const betaModel = mainCityInteriorReadModelSchema.parse(readObject(betaResponse.data).mainCityInterior)
    assert.equal(betaModel.player_id, 'player_beta')
    assert.equal(betaModel.city_state_id, 'city_beta')
    assert.equal(betaModel.tax_runtime.city_label, '副城')
    assert.notEqual(
      betaModel.tax_runtime.hero_asset_ref.skin,
      model.tax_runtime.hero_asset_ref.skin,
      'asset_ref skin should be player/city scoped instead of a single hardcoded UI mapping',
    )

    console.log('[main_city_interior_read_model_http_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

function assertAssetRef(assetRef: Record<string, unknown>, label: string) {
  assert.equal(typeof assetRef.asset_id, 'string', `${label} asset_ref.asset_id is required`)
  assert.equal(typeof assetRef.asset_kind, 'string', `${label} asset_ref.asset_kind is required`)
  assert.equal(typeof assetRef.variant, 'string', `${label} asset_ref.variant is required`)
  assert.equal(typeof assetRef.level, 'number', `${label} asset_ref.level is required`)
  assert.equal(typeof assetRef.skin, 'string', `${label} asset_ref.skin is required`)
  assert.equal(typeof assetRef.catalog_version, 'string', `${label} asset_ref.catalog_version is required`)
  assert.equal(typeof assetRef.fallback_path, 'string', `${label} asset_ref.fallback_path is required`)
  assert.ok(!String(assetRef.fallback_path).includes('\\'), `${label} fallback_path must stay as Godot res:// path`)
}

run().catch((error) => {
  console.error('[main_city_interior_read_model_http_contract] failed:', error)
  process.exitCode = 1
})
