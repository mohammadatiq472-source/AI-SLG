import assert from 'node:assert/strict'
import { mainCityFacilityTreeReadModelSchema } from '../../shared/schemas/mainCityFacilityTreeReadModel'
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
    assert.ok(health?.ok, `backend health check failed; stdout=${tail.stdout.join('\\n')} stderr=${tail.stderr.join('\\n')}`)

    const response = await requestJson(baseUrl, '/api/world/main-city/facility-tree', 'GET', undefined, 60_000)
    assert.equal(
      response.status,
      200,
      `facility tree endpoint failed; status=${response.status} payload=${JSON.stringify(response.data)}`,
    )

    const root = readObject(response.data)
    const model = mainCityFacilityTreeReadModelSchema.parse(root.mainCityFacilityTree)
    assert.equal(model.schema_version, 'main_city_facility_tree_read_model_v2')
    assert.equal(model.cost_mode, 'structured_cost_items_v1')
    assert.equal(model.effect_mode, 'structured_effect_items_v1')
    assert.ok(model.asset_root.length > 0, 'asset_root must be non-empty')
    assert.ok(model.asset_manifest_path.length > 0, 'asset_manifest_path must be non-empty')

    const buildings = readArray(model.buildings)
    assert.ok(buildings.length > 0, 'facility tree read model must include buildings')
    const ids = new Set<string>()
    for (const item of buildings) {
      const building = readObject(item)
      const id = String(building.id ?? '').trim()
      assert.ok(id.length > 0, 'building id must be non-empty')
      assert.equal(ids.has(id), false, `building id must be unique: ${id}`)
      ids.add(id)
      assert.equal(building.cost, undefined, `building ${id} must not expose legacy cost`)
      assert.equal(building.effect, undefined, `building ${id} must not expose legacy effect`)
      assert.ok(readArray(building.cost_items).length > 0, `building ${id} must expose cost_items`)
      assert.ok(readArray(building.effect_items).length > 0, `building ${id} must expose effect_items`)
    }

    console.log('[main_city_facility_tree_read_model_http_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[main_city_facility_tree_read_model_http_contract] failed:', error)
  process.exitCode = 1
})
