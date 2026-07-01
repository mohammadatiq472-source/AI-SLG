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

const BASE_LAYERED_QUERY =
  '/api/world/map-layout?scope=viewport' +
  '&layer=layered' +
  '&worldId=unified_aoi_v0_6_formal_real_map_data_1km' +
  '&coordinateSpace=real_map_data_1km.cell_1km' +
  '&visibleCells=512x320' +
  '&visibleSizeCells=512x320' +
  '&preloadMargin=64' +
  '&preloadMarginCells=64' +
  '&chunkSize=64' +
  '&includeLayers=base_map,derived_masks,maritime_passability,resource_overlay,city_gate_anchors,labels'

function chunkLayerFrom(payload: unknown) {
  return readObject(readObject(payload).chunk_layer)
}

function loadedChunkIdsFrom(payload: unknown) {
  const loaded = chunkLayerFrom(payload).loaded_chunk_ids
  assert.ok(Array.isArray(loaded), 'loaded_chunk_ids should be an array')
  return loaded as string[]
}

function setDifference(left: string[], right: string[]) {
  const rightSet = new Set(right)
  return left.filter((item) => !rightSet.has(item))
}

function setIntersection(left: string[], right: string[]) {
  const rightSet = new Set(right)
  return left.filter((item) => rightSet.has(item))
}

function withClientLoadedChunkIds(query: string, loadedChunkIds: string[]) {
  return `${query}&loadedChunkIds=${encodeURIComponent(loadedChunkIds.join(','))}`
}

async function fetchLayeredLayout(baseUrl: string, centerX: number, centerY: number, loadedChunkIds: string[] = []) {
  const query = `${BASE_LAYERED_QUERY}&centerX=${centerX}&centerY=${centerY}`
  const response = await requestJson(
    baseUrl,
    loadedChunkIds.length > 0 ? withClientLoadedChunkIds(query, loadedChunkIds) : query,
    'GET',
  )
  assert.equal(response.status, 200, `layered layout request failed: ${JSON.stringify(response.data)}`)
  return readObject(response.data)
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail)

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const firstPayload = await fetchLayeredLayout(baseUrl, 4387, 2482)
    const firstLoadedChunkIds = loadedChunkIdsFrom(firstPayload)
    assert.ok(firstLoadedChunkIds.length > 0, 'first viewport should load 64x64 chunks')

    const shiftedPayload = await fetchLayeredLayout(baseUrl, 4710, 2620, firstLoadedChunkIds)
    const shiftedLoadedChunkIds = loadedChunkIdsFrom(shiftedPayload)
    const shiftedLayer = chunkLayerFrom(shiftedPayload)
    const expectedNew = setDifference(shiftedLoadedChunkIds, firstLoadedChunkIds)
    const expectedRetained = setIntersection(shiftedLoadedChunkIds, firstLoadedChunkIds)
    const expectedUnload = setDifference(firstLoadedChunkIds, shiftedLoadedChunkIds)

    assert.deepEqual(shiftedLayer.client_loaded_chunk_ids, firstLoadedChunkIds, 'server should echo client loaded chunks')
    assert.deepEqual(shiftedLayer.new_chunk_ids, expectedNew, 'new_chunk_ids should only contain chunks absent from the client cache')
    assert.deepEqual(
      shiftedLayer.retained_cache_chunk_ids,
      expectedRetained,
      'retained_cache_chunk_ids should contain cached chunks still in the preload window',
    )
    assert.deepEqual(
      shiftedLayer.unload_candidate_chunk_ids,
      expectedUnload,
      'unload candidates should be client cached chunks outside the shifted preload window',
    )
    assert.equal(shiftedLayer.new_chunk_count, expectedNew.length, 'new_chunk_count should match new_chunk_ids')
    assert.equal(
      shiftedLayer.retained_cache_chunk_count,
      expectedRetained.length,
      'retained_cache_chunk_count should match retained ids',
    )
    assert.equal(
      shiftedLayer.unload_candidate_chunk_count,
      expectedUnload.length,
      'unload_candidate_chunk_count should match unload ids',
    )

    const repeatedPayload = await fetchLayeredLayout(baseUrl, 4710, 2620, shiftedLoadedChunkIds)
    const repeatedLayer = chunkLayerFrom(repeatedPayload)
    assert.deepEqual(repeatedLayer.new_chunk_ids, [], 'repeat request should be fully served from client cache')
    assert.deepEqual(repeatedLayer.unload_candidate_chunk_ids, [], 'repeat request should not unload chunks')
    assert.deepEqual(
      repeatedLayer.retained_cache_chunk_ids,
      shiftedLoadedChunkIds,
      'repeat request should retain the full shifted chunk set',
    )

    console.log(
      JSON.stringify(
        {
          ok: true,
          firstLoadedChunkCount: firstLoadedChunkIds.length,
          shiftedLoadedChunkCount: shiftedLoadedChunkIds.length,
          shiftedNewChunkCount: expectedNew.length,
          shiftedRetainedChunkCount: expectedRetained.length,
          shiftedUnloadCandidateChunkCount: expectedUnload.length,
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
  console.error('[world_map_layout_layered_cache_unload_contract] failed:', error)
  process.exitCode = 1
})
