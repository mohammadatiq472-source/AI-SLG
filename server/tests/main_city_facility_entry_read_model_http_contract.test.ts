import assert from 'node:assert/strict'
import { mainCityFacilityEntryReadModelSchema } from '../../shared/schemas/mainCityFacilityEntryReadModel'
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

async function registerAiPlayer(baseUrl: string, aiPlayerId: string, governorPlayerId: string, factionId = 'player') {
  const response = await requestJson(baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId,
    displayName: `Facility Entry ${aiPlayerId}`,
    governorPlayerId,
    factionId,
    actionWhitelist: ['battle_report_read'],
  })
  assert.equal(response.status, 200, `register ${aiPlayerId} failed: ${JSON.stringify(response.data)}`)
}

function assertPlayerVisibleDisabledReason(value: unknown) {
  const text = String(value ?? '')
  assert.ok(text.length > 0, 'readonly facility must expose player-visible disabled reason')
  assert.ok(text.includes('只能查看'), `readonly disabled reason should explain observation boundary: ${text}`)
  assert.ok(text.includes('AI 面板'), `readonly disabled reason should route player back to AI panel: ${text}`)
  const forbidden = [
    'AI player',
    'read-only',
    'commands',
    'chat channel',
    'read model',
    'backend',
    'contract',
    'authority',
    'tier',
    'ownerKind',
    'surfaceMode',
  ]
  for (const needle of forbidden) {
    assert.equal(text.includes(needle), false, `readonly disabled reason leaked engineering copy "${needle}": ${text}`)
  }
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: `tmp/main_city_facility_entry_governance_${port}_${process.pid}.json`,
  })

  try {
    const health = await waitForHealth(baseUrl, 90_000)
    assert.ok(health?.ok, `backend health check failed; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const humanResponse = await requestJson(
      baseUrl,
      '/api/world/main-city/facility-entry?playerId=human_alpha&factionId=player',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(
      humanResponse.status,
      200,
      `human facility entry failed; status=${humanResponse.status} payload=${JSON.stringify(humanResponse.data)}`,
    )
    const humanEntry = mainCityFacilityEntryReadModelSchema.parse(readObject(humanResponse.data).mainCityFacilityEntry)
    assert.equal(humanEntry.schema_version, 'main_city_facility_entry_read_model_v1')
    assert.equal(humanEntry.ownerKind, 'human')
    assert.equal(humanEntry.ownerPlayerId, 'human_alpha')
    assert.equal(humanEntry.readonly, false)
    assert.equal(humanEntry.footprintId, 'player_city_3x3_initial')
    assert.equal(humanEntry.footprintSize, '3x3')
    assert.equal(humanEntry.centerTileId, humanEntry.cityId)
    assert.equal(humanEntry.facilityTreePath, '/api/world/main-city/facility-tree')
    assert.equal(humanEntry.interiorPath, '/api/world/main-city/interior')

    const facilities = readArray(humanEntry.facilities)
    assert.ok(facilities.length >= 4, 'facility entry should expose clickable facilities')
    for (const item of facilities) {
      const facility = readObject(item)
      assert.equal(typeof facility.facilityId, 'string')
      assert.equal(typeof facility.label, 'string')
      assert.equal(typeof facility.status, 'string')
      assert.equal(typeof facility.enabled, 'boolean')
      assert.ok(readArray(facility.buildingIds).length >= 1, `facility ${facility.facilityId} must link buildings`)
      assert.equal(typeof facility.entryActionId, 'string')
      assert.ok(String(facility.entryActionId).startsWith('main_city_facility_open:'))
    }

    await registerAiPlayer(baseUrl, 'facility_observer_alpha', 'human_alpha')
    const observedResponse = await requestJson(
      baseUrl,
      '/api/world/main-city/facility-entry?asAiPlayerId=facility_observer_alpha&governorPlayerId=human_alpha',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(
      observedResponse.status,
      200,
      `observed facility entry failed; status=${observedResponse.status} payload=${JSON.stringify(observedResponse.data)}`,
    )
    const observedEntry = mainCityFacilityEntryReadModelSchema.parse(readObject(observedResponse.data).mainCityFacilityEntry)
    assert.equal(observedEntry.ownerKind, 'ai')
    assert.equal(observedEntry.ownerPlayerId, 'facility_observer_alpha')
    assert.equal(observedEntry.observedAiPlayerId, 'facility_observer_alpha')
    assert.equal(readObject(observedEntry.observedAiPlayer).governorPlayerId, 'human_alpha')
    assert.equal(observedEntry.readonly, true)
    assert.equal(observedEntry.footprintId, 'ai_city_3x3_initial')
    assert.equal(observedEntry.footprintSize, '3x3')
    assert.deepEqual(readArray(observedEntry.facilities).map((item) => readObject(item).facilityId), facilities.map((item) => readObject(item).facilityId))
    for (const item of readArray(observedEntry.facilities)) {
      const facility = readObject(item)
      assert.equal(facility.enabled, false, `readonly AI facility ${facility.facilityId} must not be controllable`)
      assert.equal(facility.readonly, true, `readonly AI facility ${facility.facilityId} must keep readonly flag`)
      assertPlayerVisibleDisabledReason(facility.disabledReason)
    }

    const wrongGovernor = await requestJson(
      baseUrl,
      '/api/world/main-city/facility-entry?asAiPlayerId=facility_observer_alpha&governorPlayerId=human_beta',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(wrongGovernor.status, 403, 'cross-governor facility entry observation should be forbidden')

    console.log('[main_city_facility_entry_read_model_http_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[main_city_facility_entry_read_model_http_contract] failed:', error)
  process.exitCode = 1
})
