import assert from 'node:assert/strict'
import {
  getAvailablePort,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

const LAYERED_QUERY =
  '/api/world/map-layout?scope=viewport' +
  '&layer=layered' +
  '&worldId=unified_aoi_v0_6_formal_real_map_data_1km' +
  '&coordinateSpace=real_map_data_1km.cell_1km' +
  '&centerX=4387' +
  '&centerY=2482' +
  '&visibleCells=512x320' +
  '&visibleSizeCells=512x320' +
  '&preloadMargin=64' +
  '&preloadMarginCells=64' +
  '&chunkSize=64' +
  '&includeLayers=base_map,derived_masks,maritime_passability,resource_overlay,city_gate_anchors,labels'

const SHIFTED_LAYERED_QUERY = LAYERED_QUERY.replace('centerX=4387', 'centerX=4710').replace('centerY=2482', 'centerY=2620')

function assertLayeredViewportPayload(payload: Record<string, unknown>, source: string) {
  assert.equal(payload.schema_version, 'east_han_godot_main_map_layered_response_v0_1', `${source} schema version`)
  assert.equal(payload.world_id, 'unified_aoi_v0_6_formal_real_map_data_1km', `${source} world id`)
  assert.equal(payload.coordinate_space, 'real_map_data_1km.cell_1km', `${source} coordinate space`)
  assert.deepEqual(
    payload.layer_order,
    ['base_map', 'derived_masks', 'maritime_passability', 'resource_overlay', 'city_gate_anchors', 'labels'],
    `${source} layer order`,
  )

  const viewportRequest = readObject(payload.godot_viewport_request)
  assert.equal(viewportRequest.scope, 'viewport', `${source} request scope`)
  assert.deepEqual(viewportRequest.visibleSizeCells, [512, 320], `${source} visible size`)
  assert.equal(viewportRequest.preloadMarginCells, 64, `${source} preload margin`)
  assert.equal(viewportRequest.chunkSize, 64, `${source} chunk size`)

  const chunkLayer = readObject(payload.chunk_layer)
  assert.deepEqual(chunkLayer.chunk_size_cells, [64, 64], `${source} chunk size cells`)
  const loadedChunkIds = chunkLayer.loaded_chunk_ids
  assert.ok(Array.isArray(loadedChunkIds), `${source} loaded chunk ids should be an array`)
  assert.ok(loadedChunkIds.length > 0, `${source} loaded chunk ids should not be empty`)
  assert.equal(chunkLayer.loaded_chunk_count, loadedChunkIds.length, `${source} loaded chunk count`)
  assert.ok(
    loadedChunkIds.every((id) => typeof id === 'string' && /^chunk_y\d{3}_x\d{3}$/.test(id)),
    `${source} loaded chunk ids should use 1km chunk keys`,
  )

  const baseMapLayer = readObject(payload.base_map_layer)
  const zeroLevelVisual = readObject(baseMapLayer.zero_level_ground_visual)
  assert.equal(zeroLevelVisual.object_mode, 'implicit_base_map', `${source} 0-level substrate should stay implicit`)
  assert.equal(zeroLevelVisual.object_upsert_count, 0, `${source} 0-level substrate should not be an object delta`)
  assert.ok(
    typeof zeroLevelVisual.asset_path === 'string' &&
      zeroLevelVisual.asset_path.endsWith('/world/substrate/world_cell_zero_level_substrate_v1.png'),
    `${source} 0-level substrate should expose the accepted substrate asset`,
  )
  const baseChunkRefs = baseMapLayer.chunk_refs
  assert.ok(Array.isArray(baseChunkRefs), `${source} base chunk refs should be an array`)
  assert.equal(baseChunkRefs.length, loadedChunkIds.length, `${source} base map refs follow loaded chunks`)

  const derivedMaskLayer = readObject(payload.derived_mask_layer)
  assert.ok(Array.isArray(derivedMaskLayer.mask_refs), `${source} derived mask refs should be an array`)
  assert.equal(derivedMaskLayer.mask_refs.length, loadedChunkIds.length, `${source} derived mask refs follow loaded chunks`)

  const maritimeLayer = readObject(payload.maritime_passability_layer)
  assert.ok(Array.isArray(maritimeLayer.passability_refs), `${source} maritime refs should be an array`)
  assert.equal(maritimeLayer.passability_refs.length, loadedChunkIds.length, `${source} maritime refs follow loaded chunks`)

  const resourceLayer = readObject(payload.resource_overlay_layer)
  assert.equal(resourceLayer.zero_level_object_upsert_count, 0, `${source} 0-level land should not be emitted as objects`)
  const resourceObjects = resourceLayer.sample_resource_objects
  assert.ok(Array.isArray(resourceObjects), `${source} resource objects should be an array`)
  assert.ok(resourceObjects.length > 0, `${source} should include resource delta samples`)
  const firstResource = readObject(resourceObjects[0])
  assert.equal(firstResource.kind, 'resource', `${source} resource object kind`)
  assert.ok(typeof firstResource.asset_path === 'string' && firstResource.asset_path.length > 0, `${source} resource asset path`)
  assert.ok(readObject(firstResource.cell_1km).x !== undefined, `${source} resource cell_1km`)

  const cityGateLayer = readObject(payload.city_gate_anchor_layer)
  const visibleObjects = cityGateLayer.visible_objects
  assert.ok(Array.isArray(visibleObjects), `${source} city/gate visible objects should be an array`)
  assert.ok(visibleObjects.length > 0, `${source} should include city/gate anchor delta`)
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail)

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const firstResponse = await requestJson(baseUrl, LAYERED_QUERY, 'GET')
    assert.equal(firstResponse.status, 200, `layered map-layout route failed: ${JSON.stringify(firstResponse.data)}`)
    const firstPayload = readObject(firstResponse.data)
    assertLayeredViewportPayload(firstPayload, 'initial layered response')

    const shiftedResponse = await requestJson(baseUrl, SHIFTED_LAYERED_QUERY, 'GET')
    assert.equal(shiftedResponse.status, 200, `shifted layered map-layout route failed: ${JSON.stringify(shiftedResponse.data)}`)
    const shiftedPayload = readObject(shiftedResponse.data)
    assertLayeredViewportPayload(shiftedPayload, 'shifted layered response')

    const firstChunkIds = new Set(readObject(firstPayload.chunk_layer).loaded_chunk_ids as string[])
    const shiftedChunkIds = readObject(shiftedPayload.chunk_layer).loaded_chunk_ids as string[]
    const newlyLoadedChunkIds = shiftedChunkIds.filter((chunkId) => !firstChunkIds.has(chunkId))
    assert.ok(newlyLoadedChunkIds.length > 0, 'camera movement should request at least one new 64x64 chunk')

    const shiftedChunkSet = new Set(shiftedChunkIds)
    const unloadCandidateChunkIds = Array.from(firstChunkIds).filter((chunkId) => !shiftedChunkSet.has(chunkId))
    assert.ok(unloadCandidateChunkIds.length > 0, 'camera movement should produce client-side unload candidates')

    console.log(
      JSON.stringify(
        {
          ok: true,
          firstLoadedChunkCount: firstChunkIds.size,
          shiftedLoadedChunkCount: shiftedChunkIds.length,
          newlyLoadedChunkCount: newlyLoadedChunkIds.length,
          unloadCandidateChunkCount: unloadCandidateChunkIds.length,
        },
        null,
        2,
      ),
    )
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
