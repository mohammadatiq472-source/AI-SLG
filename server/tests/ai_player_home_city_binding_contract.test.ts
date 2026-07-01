import assert from 'node:assert/strict'
import { aiPlayerHomeCityCandidatesResponseSchema, bindAiPlayerHomeCityResponseSchema } from '../../shared/schemas/aiPlayer'
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

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: `tmp/ai_player_home_city_binding_governance_${port}_${process.pid}.json`,
  })

  try {
    const health = await waitForHealth(baseUrl, 90_000)
    assert.ok(health?.ok, `backend health check failed; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const register = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: 'home_city_alpha',
      displayName: 'Home City Alpha',
      governorPlayerId: 'human_alpha',
      factionId: 'player',
      actionWhitelist: ['battle_report_read'],
    })
    assert.equal(register.status, 200, `register failed: ${JSON.stringify(register.data)}`)
    assert.equal(readObject(readObject(register.data).player).homeCityBindingStatus, 'unbound')

    const candidatesResponse = await requestJson(
      baseUrl,
      '/api/ai/players/home_city_alpha/home-city/candidates?governorPlayerId=human_alpha',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(candidatesResponse.status, 200, `candidate list failed: ${JSON.stringify(candidatesResponse.data)}`)
    const candidatesPayload = aiPlayerHomeCityCandidatesResponseSchema.parse(candidatesResponse.data)
    assert.equal(candidatesPayload.aiPlayerId, 'home_city_alpha')
    assert.equal(candidatesPayload.governorPlayerId, 'human_alpha')
    assert.equal(candidatesPayload.factionId, 'player')
    assert.equal(candidatesPayload.governorHomeTileId, 'tile_08')
    assert.equal(candidatesPayload.radiusLimit, 10)
    assert.equal(candidatesPayload.footprintId, 'ai_city_3x3_initial')
    assert.equal(candidatesPayload.footprintSize, '3x3')
    assert.equal(candidatesPayload.currentBinding, undefined)
    assert.ok(candidatesPayload.count > 0, 'AI home-city candidate list should expose valid 3x3 centers')

    const selectedCandidate = candidatesPayload.candidates[0]
    assert.equal(selectedCandidate.eligible, true)
    assert.equal(selectedCandidate.footprintTileIds.length, 9)
    assert.ok(selectedCandidate.distanceFromGovernorHome <= 10)

    const outOfRange = await requestJson(baseUrl, '/api/ai/players/home_city_alpha/home-city', 'POST', {
      governorPlayerId: 'human_alpha',
      centerTileId: 'grid_152_170',
    })
    assert.equal(outOfRange.status, 400, 'binding outside the governor radius should be rejected')
    assert.equal(readObject(outOfRange.data).failureCode, 'ai_home_city_out_of_range')

    const blockedFootprint = await requestJson(baseUrl, '/api/ai/players/home_city_alpha/home-city', 'POST', {
      governorPlayerId: 'human_alpha',
      centerTileId: 'tile_08',
    })
    assert.equal(blockedFootprint.status, 400, 'binding on top of the human main city should be rejected')
    assert.equal(readObject(blockedFootprint.data).failureCode, 'ai_home_city_footprint_blocked')

    const wrongGovernor = await requestJson(baseUrl, '/api/ai/players/home_city_alpha/home-city', 'POST', {
      governorPlayerId: 'human_beta',
      centerTileId: selectedCandidate.centerTileId,
    })
    assert.equal(wrongGovernor.status, 403, 'only the owning governor can bind an AI home city')

    const bind = await requestJson(baseUrl, '/api/ai/players/home_city_alpha/home-city', 'POST', {
      governorPlayerId: 'human_alpha',
      centerTileId: selectedCandidate.centerTileId,
    })
    assert.equal(bind.status, 200, `binding failed: ${JSON.stringify(bind.data)}`)
    const bindPayload = bindAiPlayerHomeCityResponseSchema.parse(bind.data)
    assert.equal(bindPayload.ok, true)
    assert.equal(bindPayload.binding?.centerTileId, selectedCandidate.centerTileId)
    assert.equal(bindPayload.binding?.cityId, 'ai_home_city_home_city_alpha')
    assert.equal(bindPayload.binding?.boundByGovernorPlayerId, 'human_alpha')
    assert.equal(bindPayload.binding?.footprintTileIds.length, 9)

    const boundPlayer = readObject(bindPayload.player)
    assert.equal(boundPlayer.homeCityBindingStatus, 'bound')
    assert.equal(boundPlayer.homeCityId, 'ai_home_city_home_city_alpha')
    assert.equal(boundPlayer.homeCityTileId, selectedCandidate.centerTileId)
    assert.equal(readObject(boundPlayer.homeCityPlacement).centerTileId, selectedCandidate.centerTileId)

    const listPlayers = await requestJson(baseUrl, '/api/ai/players?governorPlayerId=human_alpha&factionId=player', 'GET')
    assert.equal(listPlayers.status, 200, `list players failed: ${JSON.stringify(listPlayers.data)}`)
    const listedPlayer = readArray(readObject(listPlayers.data).items)
      .map((item) => readObject(item))
      .find((item) => item.aiPlayerId === 'home_city_alpha')
    assert.ok(listedPlayer, 'bound AI player should appear in the governor list')
    assert.equal(readObject(listedPlayer).homeCityBindingStatus, 'bound')
    const listCard = readObject(readObject(listedPlayer).listCard)
    assert.equal(listCard.homeCityBindingStatus, 'bound')
    assert.equal(listCard.homeCityTileId, selectedCandidate.centerTileId)
    assert.equal(listCard.homeCityEntryPath, `/api/world/main-city/facility-entry?asAiPlayerId=home_city_alpha&governorPlayerId=human_alpha`)

    const facilityEntryResponse = await requestJson(
      baseUrl,
      '/api/world/main-city/facility-entry?asAiPlayerId=home_city_alpha&governorPlayerId=human_alpha',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(facilityEntryResponse.status, 200, `facility entry failed: ${JSON.stringify(facilityEntryResponse.data)}`)
    const facilityEntry = mainCityFacilityEntryReadModelSchema.parse(readObject(facilityEntryResponse.data).mainCityFacilityEntry)
    assert.equal(facilityEntry.ownerKind, 'ai')
    assert.equal(facilityEntry.cityId, 'ai_home_city_home_city_alpha')
    assert.equal(facilityEntry.centerTileId, selectedCandidate.centerTileId)
    assert.equal(facilityEntry.ownerPlayerId, 'home_city_alpha')
    assert.equal(facilityEntry.readonly, true)
    assert.equal(readObject(facilityEntry.observedAiPlayer).homeCityTileId, selectedCandidate.centerTileId)

    console.log('[ai_player_home_city_binding_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[ai_player_home_city_binding_contract] failed:', error)
  process.exitCode = 1
})
