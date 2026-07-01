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

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail)

  try {
    const health = await waitForHealth(baseUrl, 90_000)
    assert.ok(health?.ok, `backend health check failed; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const before = await requestJson(
      baseUrl,
      '/api/world/main-city/interior?playerId=player_alpha&cityStateId=city_alpha&cityLabel=%E8%AF%95%E7%82%B9%E5%9F%8E',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(before.status, 200, `main city interior read-model failed before action: ${JSON.stringify(before.data)}`)
    const beforeInterior = readObject(readObject(before.data).mainCityInterior)
    const queues = readObject(beforeInterior.construction_queues)
    const workOrders = [
      ...readArray(queues.city_inner).map(readObject),
      ...readArray(queues.world_outer).map(readObject),
    ]
    const firstActionable = workOrders.find((workOrder) => {
      const primaryAction = readObject(workOrder.primary_action)
      return String(workOrder.queue_item_id).trim() !== '' && String(primaryAction.action_id).trim() !== ''
    })
    assert.ok(firstActionable, 'fixture read-model must expose an actionable interior work order')
    const queueItemId = String(firstActionable.queue_item_id)
    const actionId = String(readObject(firstActionable.primary_action).action_id)

    const actionResponse = await requestJson(
      baseUrl,
      `/api/world/main-city/interior/work-orders/${encodeURIComponent(queueItemId)}/actions/${encodeURIComponent(actionId)}`,
      'POST',
      {
        playerId: 'player_alpha',
        cityStateId: 'city_alpha',
        cityLabel: '试点城',
      },
      60_000,
    )
    assert.equal(actionResponse.status, 200, `interior work-order action route failed: ${JSON.stringify(actionResponse.data)}`)
    const actionPayload = readObject(actionResponse.data)
    assert.equal(actionPayload.ok, true)
    assert.equal(actionPayload.worldAction, 'interiorWorkOrderAction')
    assert.equal(actionPayload.queueItemId, queueItemId)
    assert.equal(actionPayload.actionId, actionId)
    assert.equal(actionPayload.authority, 'server')
    assert.equal(actionPayload.receiptSource, 'server_interior_work_order_action')
    assert.equal(typeof actionPayload.receiptId, 'string')
    assert.match(String(actionPayload.receiptId), /^interior_work_order_action:/)
    assert.equal(typeof actionPayload.playerMessage, 'string')
    assert.match(String(actionPayload.playerMessage), /已记录|已处理|已查看/)

    const readback = readObject(actionPayload.readback)
    assert.equal(readback.schemaVersion, 'main_city_interior_work_order_action_readback_v1')
    assert.equal(readback.queueItemId, queueItemId)
    assert.equal(readback.actionId, actionId)
    assert.equal(readback.serverAuthority, true)

    const after = await requestJson(
      baseUrl,
      '/api/world/main-city/interior?playerId=player_alpha&cityStateId=city_alpha&cityLabel=%E8%AF%95%E7%82%B9%E5%9F%8E',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(after.status, 200, `main city interior read-model failed after action: ${JSON.stringify(after.data)}`)
    const afterInterior = readObject(readObject(after.data).mainCityInterior)
    const actionReceipts = readArray(afterInterior.work_order_action_receipts).map(readObject)
    const matchingReceipt = actionReceipts.find((receipt) => receipt.receipt_id === actionPayload.receiptId)
    assert.ok(matchingReceipt, 'read-model must expose the server work-order action receipt')
    assert.equal(matchingReceipt.queue_item_id, queueItemId)
    assert.equal(matchingReceipt.action_id, actionId)
    assert.equal(matchingReceipt.source, 'server_interior_work_order_action')
    assert.equal(matchingReceipt.server_authority, true)

    const badAction = await requestJson(
      baseUrl,
      `/api/world/main-city/interior/work-orders/${encodeURIComponent(queueItemId)}/actions/not_a_real_action`,
      'POST',
      {
        playerId: 'player_alpha',
        cityStateId: 'city_alpha',
        cityLabel: '试点城',
      },
      60_000,
    )
    assert.equal(badAction.status, 200)
    const badPayload = readObject(badAction.data)
    assert.equal(badPayload.ok, false)
    assert.equal(badPayload.failureCode, 'interior_work_order_action_mismatch')

    console.log('[main_city_interior_work_order_action_http_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[main_city_interior_work_order_action_http_contract] failed:', error)
  process.exitCode = 1
})
