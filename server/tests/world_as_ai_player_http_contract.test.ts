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
  const child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: `tmp/ai_player_observer_contract_${port}_${process.pid}.json`,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy. stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const baseline = await requestJson(baseUrl, '/api/world', 'GET')
    assert.equal(baseline.status, 200, `baseline world failed: ${JSON.stringify(baseline.data)}`)
    const baselinePayload = readObject(baseline.data)
    const baselineWorld = readObject(baselinePayload.world)
    assert.equal(baselinePayload.observedAiPlayerId, undefined, 'normal world route should not enter observer mode')

    const publicHeroLevelUpgrade = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'upgradeHeroLevel',
      payload: {
        factionId: 'player',
        heroId: '100027',
      },
    })
    assert.equal(
      publicHeroLevelUpgrade.status,
      400,
      'public /api/world/action must reject direct hero level upgrades; levels grow from resource-land receipts',
    )

    const registerAlpha = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: 'observer_contract_alpha',
      displayName: 'Observer Contract Alpha',
      governorPlayerId: 'human_alpha',
      factionId: 'player',
      actionWhitelist: ['battle_report_read'],
    })
    assert.equal(registerAlpha.status, 200, `register alpha failed: ${JSON.stringify(registerAlpha.data)}`)

    const observed = await requestJson(
      baseUrl,
      '/api/world?asAiPlayerId=observer_contract_alpha&governorPlayerId=human_alpha',
      'GET',
    )
    assert.equal(observed.status, 200, `observed world failed: ${JSON.stringify(observed.data)}`)
    const observedPayload = readObject(observed.data)
    const observedWorld = readObject(observedPayload.world)
    assert.equal(observedPayload.observedAiPlayerId, 'observer_contract_alpha')
    assert.equal(observedWorld.worldVersion, baselineWorld.worldVersion, 'read-only observation must not mutate world version')

    const observedAiPlayer = readObject(observedPayload.observedAiPlayer)
    assert.equal(observedAiPlayer.aiPlayerId, 'observer_contract_alpha')
    assert.equal(observedAiPlayer.governorPlayerId, 'human_alpha')
    assert.equal(observedAiPlayer.factionId, 'player')
    assert.equal(observedAiPlayer.mode, 'ai_player_readonly')

    const missingGovernor = await requestJson(baseUrl, '/api/world?asAiPlayerId=observer_contract_alpha', 'GET')
    assert.equal(missingGovernor.status, 403, 'observer route should require an owning governor identity')

    const wrongGovernor = await requestJson(
      baseUrl,
      '/api/world?asAiPlayerId=observer_contract_alpha&governorPlayerId=human_beta',
      'GET',
    )
    assert.equal(wrongGovernor.status, 403, 'cross-governor observer requests should be forbidden')

    const missingAiPlayer = await requestJson(
      baseUrl,
      '/api/world?asAiPlayerId=observer_contract_missing&governorPlayerId=human_alpha',
      'GET',
    )
    assert.equal(missingAiPlayer.status, 404, 'missing observed AI player should return 404')

    const observedWrite = await requestJson(
      baseUrl,
      '/api/world/action?asAiPlayerId=observer_contract_alpha&governorPlayerId=human_alpha&includeWorld=true',
      'POST',
      {
        action: 'setRecruitSelectedPool',
        payload: {
          factionId: 'player',
          poolId: 'pool_standard',
        },
      },
    )
    assert.equal(observedWrite.status, 403, 'observed AI player world actions should be rejected by the backend')

    const afterRejectedWrite = await requestJson(
      baseUrl,
      '/api/world?asAiPlayerId=observer_contract_alpha&governorPlayerId=human_alpha',
      'GET',
    )
    assert.equal(afterRejectedWrite.status, 200, `observed world after rejected write failed: ${JSON.stringify(afterRejectedWrite.data)}`)
    assert.equal(
      readObject(readObject(afterRejectedWrite.data).world).worldVersion,
      baselineWorld.worldVersion,
      'rejected observed write must not mutate world version',
    )

    const observedHeroLevelWrite = await requestJson(
      baseUrl,
      '/api/world/action?asAiPlayerId=observer_contract_alpha&governorPlayerId=human_alpha&includeWorld=true',
      'POST',
      {
        action: 'upgradeHeroLevel',
        payload: {
          factionId: 'player',
          heroId: '100027',
        },
      },
    )
    assert.equal(
      observedHeroLevelWrite.status,
      403,
      'asAiPlayer observation write path must never execute direct hero level upgrades',
    )

    console.log('[world_as_ai_player_http_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[world_as_ai_player_http_contract] failed:', error)
  process.exitCode = 1
})
