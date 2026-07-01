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
      '/api/save-slots/smoke-setup/prime',
      'POST',
      {
        slotId: 'smoke_setup_prime_contract_slot',
        label: 'Smoke setup prime contract',
        source: 'initial_world_v1',
      },
      60_000,
    )
    assert.equal(
      response.status,
      200,
      `smoke setup prime endpoint failed; status=${response.status} payload=${JSON.stringify(response.data)}`,
    )

    const root = readObject(response.data)
    assert.equal(root.source, 'initial_world_v1')
    const smokeSetup = readObject(root.smokeSetup)
    assert.equal(smokeSetup.slotId, 'smoke_setup_prime_contract_slot')
    assert.equal(typeof smokeSetup.tick, 'number')
    assert.equal(typeof smokeSetup.worldVersion, 'number')
    assert.equal(root.fixture, undefined, 'replacement route should not expose legacy fixture response wrapper')

    const legacyResponse = await requestJson(
      baseUrl,
      '/api/save-slots/fixture/prime',
      'POST',
      {
        slotId: 'legacy_fixture_prime_contract_slot',
        label: 'Legacy fixture prime contract',
        source: 'initial_world_v1',
      },
      60_000,
    )
    assert.equal(
      legacyResponse.status,
      404,
      `legacy fixture prime endpoint should no longer be exposed; status=${legacyResponse.status} payload=${JSON.stringify(legacyResponse.data)}`,
    )

    console.log('[save_slot_smoke_setup_prime_route_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[save_slot_smoke_setup_prime_route_contract] failed:', error)
  process.exitCode = 1
})
