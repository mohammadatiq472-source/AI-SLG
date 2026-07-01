import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readObject,
  requestJson,
  shutdownChild,
  sleep,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

const WORLD_ID = 'unified_aoi_v0_6_formal_real_map_data_1km'
const COORDINATE_SPACE = 'real_map_data_1km.cell_1km'
const TARGET_CELL = { x: 4387, y: 2482 }
const TARGET_CHUNK_ID = 'chunk_y038_x068'
const FACTION_ID = 'player'

const LAYERED_QUERY =
  '/api/world/map-layout?scope=viewport' +
  '&layer=layered' +
  `&worldId=${WORLD_ID}` +
  `&coordinateSpace=${COORDINATE_SPACE}` +
  `&centerX=${TARGET_CELL.x}` +
  `&centerY=${TARGET_CELL.y}` +
  '&visibleCells=512x320' +
  '&visibleSizeCells=512x320' +
  '&preloadMargin=64' +
  '&preloadMarginCells=64' +
  '&chunkSize=64' +
  '&includeLayers=base_map,derived_masks,maritime_passability,resource_overlay,city_gate_anchors,cell_overrides,labels'

function cellId(cell = TARGET_CELL) {
  return `${WORLD_ID}:${cell.x}:${cell.y}`
}

function readCellOverrideLayer(payload: unknown) {
  return readObject(readObject(payload).cell_override_layer)
}

function readOverrideForTarget(payload: unknown) {
  const layer = readCellOverrideLayer(payload)
  const upserts = layer.override_upserts
  assert.ok(Array.isArray(upserts), 'cell override layer should expose override_upserts')
  return upserts.map((item) => readObject(item)).find((item) => item.cell_id === cellId())
}

function readPersistedOverrideForTarget(persistPath: string) {
  if (!existsSync(persistPath)) {
    return undefined
  }
  const persisted = JSON.parse(readFileSync(persistPath, 'utf8')) as Record<string, unknown>
  const runtime = readObject(persisted.mainMapRuntime)
  const overrides = readObject(runtime.cellOverrides)
  const override = overrides[cellId()]
  return override && typeof override === 'object' && !Array.isArray(override) ? readObject(override) : undefined
}

function assertClaimImmunityFields(payload: Record<string, unknown>, context: string) {
  assert.equal(payload.immunityActive ?? payload.immunity_active, true, `${context} should mark claim immunity active`)
  assert.equal(payload.immunitySource ?? payload.immunity_source, 'main_map_cell_claim', `${context} should include backend immunity source`)
  const expiry = payload.immunityUntil ?? payload.immunity_until
  assert.equal(typeof expiry, 'string', `${context} should include immunity expiry`)
  const expiryMs = Date.parse(String(expiry))
  assert.ok(Number.isFinite(expiryMs), `${context} immunity expiry should be ISO datetime`)
  const deltaMs = expiryMs - Date.now()
  assert.ok(deltaMs > 50 * 60 * 1000, `${context} immunity should be roughly one hour in the future`)
  assert.ok(deltaMs < 70 * 60 * 1000, `${context} immunity should not exceed the one-hour rule window`)
}

function assertReleaseClearsImmunity(payload: Record<string, unknown>, context: string) {
  assert.equal(payload.immunityActive ?? payload.immunity_active, false, `${context} should clear claim immunity`)
  assert.equal(payload.immunitySource ?? payload.immunity_source, 'main_map_cell_release', `${context} should include release immunity source`)
  assert.equal(payload.immunityUntil ?? payload.immunity_until, undefined, `${context} should not keep stale immunity expiry`)
}

async function waitForPersistedOverrideForTarget(persistPath: string, timeoutMs = 30_000) {
  const startedAt = Date.now()
  let lastError: unknown = null
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const override = readPersistedOverrideForTarget(persistPath)
      if (override?.owner === 'neutral' && override.cellVersion === 2) {
        return override
      }
    } catch (error) {
      lastError = error
    }
    await sleep(500)
  }
  throw new Error(`persisted target override was not flushed before reconnect; lastError=${String(lastError)}`)
}

async function fetchLayout(baseUrl: string) {
  const response = await requestJson(baseUrl, LAYERED_QUERY, 'GET')
  assert.equal(response.status, 200, `layered layout request failed: ${JSON.stringify(response.data)}`)
  return readObject(response.data)
}

async function runAction(baseUrl: string, action: 'claimMainMapCell' | 'releaseMainMapCell', payload: Record<string, unknown>) {
  const response = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
    action,
    payload,
  }, 60_000)
  assert.equal(response.status, 200, `${action} route failed: ${JSON.stringify(response.data)}`)
  return readObject(response.data)
}

async function run() {
  const persistPath = buildSessionPersistPath('world_main_map_1km_occupy_release_reconnect_contract_world_state')
  const firstPort = await getAvailablePort()
  const firstBaseUrl = `http://127.0.0.1:${firstPort}`
  const firstTail: TailState = { stdout: [], stderr: [] }
  const firstChild = spawnBackend(firstPort, firstTail, {
    WORLD_STATE_PERSIST_PATH: persistPath,
  })

  try {
    const health = await waitForHealth(firstBaseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${firstTail.stdout.join('\n')}\nstderr=${firstTail.stderr.join('\n')}`)

    const initialLayout = await fetchLayout(firstBaseUrl)
    assert.equal(readOverrideForTarget(initialLayout), undefined, 'fresh world should not have a target cell override')

    const claim = await runAction(firstBaseUrl, 'claimMainMapCell', {
      worldId: WORLD_ID,
      coordinateSpace: COORDINATE_SPACE,
      factionId: FACTION_ID,
      requestId: 'world_main_map_1km_claim_contract_1',
      cellX: TARGET_CELL.x,
      cellY: TARGET_CELL.y,
      expectedOwner: 'neutral',
      expectedCellVersion: 0,
    })
    assert.equal(claim.ok, true, `claim should succeed: ${JSON.stringify(claim)}`)
    const claimReceipt = readObject(claim.receipt)
    assert.equal(claimReceipt.action, 'claimMainMapCell')
    assert.equal(claimReceipt.cellId, cellId())
    assert.equal(claimReceipt.previousOwner, 'neutral')
    assert.equal(claimReceipt.nextOwner, FACTION_ID)
    assert.equal(claimReceipt.previousCellVersion, 0)
    assert.equal(claimReceipt.nextCellVersion, 1)
    assert.equal(claimReceipt.chunkId, TARGET_CHUNK_ID)
    assertClaimImmunityFields(claimReceipt, 'claim receipt')

    const claimedLayout = await fetchLayout(firstBaseUrl)
    const claimedOverride = readObject(readOverrideForTarget(claimedLayout))
    assert.equal(claimedOverride.owner, FACTION_ID)
    assert.equal(claimedOverride.cell_version, 1)
    assert.equal(claimedOverride.last_event_type, 'claim')
    assert.equal(claimedOverride.chunk_id, TARGET_CHUNK_ID)
    assertClaimImmunityFields(claimedOverride, 'claimed cell override layer')

    const release = await runAction(firstBaseUrl, 'releaseMainMapCell', {
      worldId: WORLD_ID,
      coordinateSpace: COORDINATE_SPACE,
      factionId: FACTION_ID,
      requestId: 'world_main_map_1km_release_contract_1',
      cellX: TARGET_CELL.x,
      cellY: TARGET_CELL.y,
      expectedOwner: FACTION_ID,
      expectedCellVersion: 1,
    })
    assert.equal(release.ok, true, `release should succeed: ${JSON.stringify(release)}`)
    const releaseReceipt = readObject(release.receipt)
    assert.equal(releaseReceipt.action, 'releaseMainMapCell')
    assert.equal(releaseReceipt.cellId, cellId())
    assert.equal(releaseReceipt.previousOwner, FACTION_ID)
    assert.equal(releaseReceipt.nextOwner, 'neutral')
    assert.equal(releaseReceipt.previousCellVersion, 1)
    assert.equal(releaseReceipt.nextCellVersion, 2)
    assertReleaseClearsImmunity(releaseReceipt, 'release receipt')

    const releasedLayout = await fetchLayout(firstBaseUrl)
    const releasedOverride = readObject(readOverrideForTarget(releasedLayout))
    assert.equal(releasedOverride.owner, 'neutral')
    assert.equal(releasedOverride.cell_version, 2)
    assert.equal(releasedOverride.last_event_type, 'release')
    assertReleaseClearsImmunity(releasedOverride, 'released cell override layer')
    await waitForPersistedOverrideForTarget(persistPath)
  } finally {
    await sleep(1_500)
    await shutdownChild(firstChild)
  }

  const secondPort = await getAvailablePort()
  const secondBaseUrl = `http://127.0.0.1:${secondPort}`
  const secondTail: TailState = { stdout: [], stderr: [] }
  const secondChild = spawnBackend(secondPort, secondTail, {
    WORLD_STATE_PERSIST_PATH: persistPath,
  })

  try {
    const health = await waitForHealth(secondBaseUrl)
    assert.ok(
      health,
      `restarted backend did not become healthy\nstdout=${secondTail.stdout.join('\n')}\nstderr=${secondTail.stderr.join('\n')}`,
    )
    const reloadedLayout = await fetchLayout(secondBaseUrl)
    const reloadedOverride = readObject(readOverrideForTarget(reloadedLayout))
    assert.equal(reloadedOverride.owner, 'neutral', 'released owner should persist across backend restart')
    assert.equal(reloadedOverride.cell_version, 2, 'cell version should persist across backend restart')
    assert.equal(reloadedOverride.last_event_type, 'release', 'latest cell event type should persist across backend restart')
    assertReleaseClearsImmunity(reloadedOverride, 'reloaded released cell override')
  } finally {
    await shutdownChild(secondChild)
  }

  console.log('[world_main_map_1km_occupy_release_reconnect_contract] all checks passed')
}

run().catch((error) => {
  console.error('[world_main_map_1km_occupy_release_reconnect_contract] failed:', error)
  process.exitCode = 1
})
