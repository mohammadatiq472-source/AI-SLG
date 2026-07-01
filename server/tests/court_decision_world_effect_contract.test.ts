import assert from 'node:assert/strict'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readArray,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

function extractWorld(payload: unknown): Record<string, unknown> {
  return readObject(readObject(payload).world)
}

function worldEffectSignature(world: Record<string, unknown>): string {
  const worldMap = readObject(world.map)
  const tileStateItems = Array.isArray(worldMap.tileStates) ? worldMap.tileStates : []
  const tiles = readArray(tileStateItems)
    .map((item) => {
      const tile = readObject(item)
      return [
        String(tile.id),
        String(tile.owner),
        String(tile.enemyPressure ?? ''),
      ].join(':')
    })
    .sort()
  const factions = Object.entries(readObject(world.factions))
    .map(([factionId, raw]) => {
      const faction = readObject(raw)
      const resources = faction.resources && typeof faction.resources === 'object' && !Array.isArray(faction.resources)
        ? readObject(faction.resources)
        : {}
      return [
        factionId,
        String(faction.organizationId ?? ''),
        String(faction.organizationKind ?? ''),
        String(faction.nationTier ?? ''),
        String(resources.food ?? ''),
        String(resources.wood ?? ''),
        String(resources.iron ?? ''),
        String(resources.jade ?? ''),
      ].join(':')
    })
    .sort()
  return JSON.stringify({
    factions,
    tiles,
    resourceGeneration: worldMap.resourceGeneration ?? null,
  })
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('court_decision_world_effect_contract_session_state'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const beforeResponse = await requestJson(baseUrl, '/api/world?intelMode=full', 'GET', undefined, 30_000)
    assert.equal(beforeResponse.status, 200, `world before read failed: ${JSON.stringify(beforeResponse.data)}`)
    const beforeWorld = extractWorld(beforeResponse.data)
    const beforeVersion = Number(beforeWorld.worldVersion)
    const beforeSignature = worldEffectSignature(beforeWorld)

    const preview = await requestJson(
      baseUrl,
      '/api/world/action',
      'POST',
      {
        action: 'previewCourtSession',
        payload: {
          maxOptions: 6,
          maxProposals: 6,
        },
      },
      60_000,
    )
    assert.equal(preview.status, 200, `court preview failed: ${JSON.stringify(preview.data)}`)
    const previewPayload = readObject(preview.data)
    assert.equal(previewPayload.ok, true)
    const courtSession = readObject(previewPayload.courtSession)
    const proposals = readArray(courtSession.proposals).map((item) => readObject(item))
    const resolutions = readArray(courtSession.resolutions).map((item) => readObject(item))
    assert.ok(proposals.length > 0, 'court preview should expose proposals')
    assert.equal(resolutions.length, proposals.length, 'each proposal should resolve exactly once')

    for (const resolution of resolutions) {
      const decision = String(resolution.decision)
      const directive = String(resolution.executionDirective)
      if (decision === 'passed') {
        assert.match(directive, /^execute:[^:]+:[^:]+$/, 'passed resolution should expose an execute directive')
        continue
      }
      assert.match(directive, /^hold:[^:]+$/, 'non-passed resolution should expose a hold directive')
    }

    const afterResponse = await requestJson(baseUrl, '/api/world?intelMode=full', 'GET', undefined, 30_000)
    assert.equal(afterResponse.status, 200, `world after read failed: ${JSON.stringify(afterResponse.data)}`)
    const afterWorld = extractWorld(afterResponse.data)
    assert.equal(Number(afterWorld.worldVersion), beforeVersion, 'court preview should not commit a world version change')
    assert.equal(
      worldEffectSignature(afterWorld),
      beforeSignature,
      'court preview should not mutate owners, faction resources, or organization state',
    )

    console.log('[court_decision_world_effect_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[court_decision_world_effect_contract] failed:', error)
  process.exit(1)
})
