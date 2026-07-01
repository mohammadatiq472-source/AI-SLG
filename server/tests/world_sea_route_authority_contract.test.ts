import assert from 'node:assert/strict'
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

async function loadWorld(baseUrl: string) {
  const response = await requestJson(baseUrl, '/api/world?intelMode=full', 'GET', undefined, 30_000)
  assert.equal(response.status, 200, `world route failed: ${JSON.stringify(response.data)}`)
  return readObject(readObject(response.data).world)
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail)

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const layoutResponse = await requestJson(
      baseUrl,
      '/api/world/map-layout?scope=viewport&layer=layered&worldId=unified_aoi_v0_6_formal_real_map_data_1km&coordinateSpace=real_map_data_1km.cell_1km&centerX=4387&centerY=2482&visibleCells=512x320&visibleSizeCells=512x320&preloadMargin=64&preloadMarginCells=64&chunkSize=64&includeLayers=base_map,derived_masks,maritime_passability,city_gate_anchors',
      'GET',
      undefined,
      30_000,
    )
    assert.equal(layoutResponse.status, 200, `layered map-layout route failed: ${JSON.stringify(layoutResponse.data)}`)
    const layoutPayload = readObject(layoutResponse.data)
    const maritimeLayer = readObject(layoutPayload.maritime_passability_layer)
    assert.ok(readArray(maritimeLayer.passability_refs).length > 0, 'maritime mask refs should exist as visual/read-only context')
    assert.equal(maritimeLayer.playable_route_authority, undefined, 'maritime mask must not masquerade as playable route authority')
    const bootstrapLayout = await requestJson(baseUrl, '/api/world/map-layout?scope=bootstrap', 'GET', undefined, 30_000)
    assert.equal(bootstrapLayout.status, 200, `bootstrap map-layout route failed: ${JSON.stringify(bootstrapLayout.data)}`)
    const bootstrapTiles = readArray(readObject(readObject(bootstrapLayout.data).map).tiles)
    assert.ok(bootstrapTiles.some((item) => readObject(item).type === 'dock'), 'dock visuals should exist as strategic map nodes')
    const cityGateLayer = readObject(layoutPayload.city_gate_anchor_layer)
    assert.equal(cityGateLayer.playable_overseas_route_authority, undefined, 'dock visual layer must not claim playable overseas route authority')

    const worldBefore = await loadWorld(baseUrl)
    const seaRoutes = readArray(readObject(worldBefore.seaRouteAuthority).routes)
    const route = seaRoutes.find((item) => readObject(item).id === 'east_han_coastal_dock_to_wa_contact')
    assert.ok(route, 'world state should expose one authoritative East Han dock -> overseas contact sea route')
    const routePayload = readObject(route)
    assert.equal(routePayload.gameplayState, 'route_open')
    const routeSource = readObject(routePayload.source)
    const routeDestination = readObject(routePayload.destination)
    const routeTravelCost = readObject(routePayload.travelCost)
    assert.equal(routeSource.kind, 'dock')
    assert.equal(routeDestination.kind, 'overseas_contact')
    assert.equal(routeDestination.region, 'japan')
    assert.deepEqual(routePayload.relatedOverseasRegions, ['japan', 'india', 'southeast_asia'])
    assert.equal(routeTravelCost.actionPoints, 1)
    assert.equal(routeTravelCost.food, 2)

    const blocked = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'openSeaRoute',
      payload: {
        factionId: 'player',
        sourceDockId: 'east_han_coastal_dock_quanzhou',
        overseasContactId: 'india_contact_locked',
      },
    }, 60_000)
    assert.equal(blocked.status, 200, `blocked sea route action failed: ${JSON.stringify(blocked.data)}`)
    const blockedPayload = readObject(blocked.data)
    assert.equal(blockedPayload.ok, false, 'locked overseas contact should be blocked by authority')
    assert.equal(blockedPayload.failureCode, 'overseas_contact_locked')
    assert.match(String(blockedPayload.message), /印度方向|尚未开放|locked/)
    assert.equal(readObject(blockedPayload.receipt).blockedReason, '印度方向仍是 locked：本轮只开放一个日本联络点 vertical slice。')

    const opened = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'openSeaRoute',
      payload: {
        factionId: 'player',
        sourceDockId: 'east_han_coastal_dock_quanzhou',
        overseasContactId: 'wa_contact_scoutable',
      },
    }, 60_000)
    assert.equal(opened.status, 200, `open sea route action failed: ${JSON.stringify(opened.data)}`)
    const openedPayload = readObject(opened.data)
    assert.equal(openedPayload.ok, true, `valid sea route should open: ${JSON.stringify(opened.data)}`)
    const openedReceipt = readObject(openedPayload.receipt)
    const openedTravelCost = readObject(openedReceipt.travelCost)
    assert.equal(openedReceipt.action, 'openSeaRoute')
    assert.equal(openedReceipt.routeId, 'east_han_coastal_dock_to_wa_contact')
    assert.equal(openedReceipt.blockedReason, null)
    assert.equal(openedTravelCost.actionPoints, 1)
    assert.equal(openedTravelCost.food, 2)
    assert.equal(openedReceipt.routeStatus, 'route_open')

    const worldAfter = await loadWorld(baseUrl)
    const routeStatus = readObject(readObject(worldAfter.seaRouteAuthority).routeStatuses).east_han_coastal_dock_to_wa_contact
    const routeStatusPayload = readObject(routeStatus)
    assert.equal(routeStatusPayload.status, 'route_open')
    assert.equal(routeStatusPayload.lastOpenedByFactionId, 'player')
    assert.ok(
      readArray(worldAfter.reports).some((report) => String(readObject(report).title).includes('海外航线')),
      'opening sea route should emit a player-readable report',
    )

    console.log('[world_sea_route_authority_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[world_sea_route_authority_contract] failed:', error)
  process.exitCode = 1
})
