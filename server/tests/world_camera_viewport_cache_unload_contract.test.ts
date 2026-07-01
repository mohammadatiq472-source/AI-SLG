import assert from 'node:assert/strict'
import type { WorldMapLayoutResponse } from '../../shared/contracts/game/world'
import {
  getAvailablePort,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

type CellSize = {
  width: number
  height: number
}

type CellBounds = {
  startX: number
  endX: number
  startY: number
  endY: number
}

type ViewportCase = {
  label: string
  visibleCells: CellSize
  expectedTileCount: number
}

type ViewportCacheState = {
  cache: Map<string, WorldMapLayoutResponse>
  cacheOrder: string[]
  cacheHitCount: number
  loadedChunkIds: string[]
  unloadCandidateChunkIds: string[]
}

const CENTER = { x: 224, y: 152 }
const PRELOAD_MARGIN = 2
const CHUNK_SIZE = { width: 16, height: 16 }

const VIEWPORT_CASES: ViewportCase[] = [
  { label: 'legacy_10x10_contract', visibleCells: { width: 10, height: 10 }, expectedTileCount: 196 },
  { label: 'landscape_far_14x14', visibleCells: { width: 14, height: 14 }, expectedTileCount: 324 },
  { label: 'landscape_default_9x9', visibleCells: { width: 9, height: 9 }, expectedTileCount: 169 },
  { label: 'landscape_close_8x8', visibleCells: { width: 8, height: 8 }, expectedTileCount: 144 },
]

function readWorldMapLayoutPayload(value: unknown): WorldMapLayoutResponse {
  return readObject(value) as unknown as WorldMapLayoutResponse
}

function buildCenteredBounds(center: typeof CENTER, visibleCells: CellSize): CellBounds {
  const startX = center.x - Math.floor(visibleCells.width / 2)
  const startY = center.y - Math.floor(visibleCells.height / 2)
  return {
    startX,
    endX: startX + visibleCells.width - 1,
    startY,
    endY: startY + visibleCells.height - 1,
  }
}

function expandBounds(bounds: CellBounds, margin: number): CellBounds {
  return {
    startX: bounds.startX - margin,
    endX: bounds.endX + margin,
    startY: bounds.startY - margin,
    endY: bounds.endY + margin,
  }
}

function expectedChunkIds(bounds: CellBounds) {
  const result: string[] = []
  for (
    let chunkY = Math.floor(bounds.startY / CHUNK_SIZE.height);
    chunkY <= Math.floor(bounds.endY / CHUNK_SIZE.height);
    chunkY += 1
  ) {
    for (
      let chunkX = Math.floor(bounds.startX / CHUNK_SIZE.width);
      chunkX <= Math.floor(bounds.endX / CHUNK_SIZE.width);
      chunkX += 1
    ) {
      result.push(`chunk_${chunkX}_${chunkY}`)
    }
  }
  return result
}

function cacheKey(visibleCells: CellSize) {
  return `${CENTER.x}:${CENTER.y}:${visibleCells.width}x${visibleCells.height}:${PRELOAD_MARGIN}:${CHUNK_SIZE.width}x${CHUNK_SIZE.height}`
}

function applyViewportCacheState(
  state: ViewportCacheState,
  key: string,
  responseFactory: () => WorldMapLayoutResponse,
  maxEntries = 3,
) {
  let response = state.cache.get(key)
  if (response) {
    state.cacheHitCount += 1
  } else {
    response = responseFactory()
    state.cache.set(key, response)
    state.cacheOrder.push(key)
    while (state.cacheOrder.length > maxEntries) {
      const evictedKey = state.cacheOrder.shift()
      if (evictedKey) {
        state.cache.delete(evictedKey)
      }
    }
  }

  const nextLoadedChunkIds = response.chunk?.cameraViewport?.loadedChunkIds ?? []
  const nextLoadedSet = new Set(nextLoadedChunkIds)
  state.unloadCandidateChunkIds = state.loadedChunkIds.filter((chunkId) => !nextLoadedSet.has(chunkId))
  state.loadedChunkIds = [...nextLoadedChunkIds]
  return response
}

async function fetchViewportLayout(baseUrl: string, visibleCells: CellSize) {
  const response = await requestJson(
    baseUrl,
    `/api/world/map-layout?scope=viewport&layer=tile&centerX=${CENTER.x}&centerY=${CENTER.y}&visibleCells=${visibleCells.width}x${visibleCells.height}&preloadMargin=${PRELOAD_MARGIN}&chunkSize=${CHUNK_SIZE.width}`,
    'GET',
  )
  assert.equal(response.status, 200, `viewport request failed: ${JSON.stringify(response.data)}`)
  return readWorldMapLayoutPayload(response.data)
}

function assertViewportLayout(layout: WorldMapLayoutResponse, viewportCase: ViewportCase) {
  assert.equal(layout.chunk?.scope, 'viewport', `${viewportCase.label} scope`)
  assert.deepEqual(layout.chunk?.cameraViewport?.centerCell, CENTER, `${viewportCase.label} center`)
  assert.deepEqual(layout.chunk?.cameraViewport?.visibleCells, viewportCase.visibleCells, `${viewportCase.label} visible cells`)
  assert.equal(layout.chunk?.cameraViewport?.preloadMarginCells, PRELOAD_MARGIN, `${viewportCase.label} preload margin`)
  assert.deepEqual(layout.chunk?.cameraViewport?.chunkSizeCells, CHUNK_SIZE, `${viewportCase.label} chunk size`)
  const visibleBounds = buildCenteredBounds(CENTER, viewportCase.visibleCells)
  const preloadBounds = expandBounds(visibleBounds, PRELOAD_MARGIN)
  assert.deepEqual(layout.chunk?.cameraViewport?.visibleBoundsCells, visibleBounds, `${viewportCase.label} visible bounds`)
  assert.deepEqual(layout.chunk?.cameraViewport?.preloadBoundsCells, preloadBounds, `${viewportCase.label} preload bounds`)
  assert.deepEqual(layout.chunk?.cameraViewport?.loadedChunkIds, expectedChunkIds(preloadBounds), `${viewportCase.label} chunk ids`)
  assert.equal(layout.map.tiles.length, viewportCase.expectedTileCount, `${viewportCase.label} tile count`)
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    ENABLE_FULL_MAP_LAYOUT: '1',
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const layouts = new Map<string, WorldMapLayoutResponse>()
    for (const viewportCase of VIEWPORT_CASES) {
      const layout = await fetchViewportLayout(baseUrl, viewportCase.visibleCells)
      assertViewportLayout(layout, viewportCase)
      layouts.set(viewportCase.label, layout)
    }

    const state: ViewportCacheState = {
      cache: new Map(),
      cacheOrder: [],
      cacheHitCount: 0,
      loadedChunkIds: [],
      unloadCandidateChunkIds: [],
    }

    const far = VIEWPORT_CASES[1]
    const defaultView = VIEWPORT_CASES[2]
    const close = VIEWPORT_CASES[3]

    applyViewportCacheState(state, cacheKey(far.visibleCells), () => layouts.get(far.label)!)
    assert.deepEqual(state.loadedChunkIds, layouts.get(far.label)?.chunk?.cameraViewport?.loadedChunkIds)
    assert.deepEqual(state.unloadCandidateChunkIds, [])

    applyViewportCacheState(state, cacheKey(defaultView.visibleCells), () => layouts.get(defaultView.label)!)
    assert.deepEqual(state.loadedChunkIds, layouts.get(defaultView.label)?.chunk?.cameraViewport?.loadedChunkIds)
    assert.deepEqual(state.unloadCandidateChunkIds, ['chunk_13_8', 'chunk_14_8', 'chunk_13_10', 'chunk_14_10'])

    applyViewportCacheState(state, cacheKey(defaultView.visibleCells), () => {
      throw new Error('repeat default viewport should be served from cache')
    })
    assert.equal(state.cacheHitCount, 1)
    assert.deepEqual(state.unloadCandidateChunkIds, [])

    applyViewportCacheState(state, cacheKey(close.visibleCells), () => layouts.get(close.label)!)
    assert.deepEqual(state.loadedChunkIds, layouts.get(close.label)?.chunk?.cameraViewport?.loadedChunkIds)
    assert.deepEqual(state.unloadCandidateChunkIds, [])
    assert.ok(state.cache.size <= 3)
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
