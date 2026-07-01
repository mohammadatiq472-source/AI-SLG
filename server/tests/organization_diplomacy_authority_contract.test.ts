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

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('organization_diplomacy_authority_contract_session_state'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const response = await requestJson(
      baseUrl,
      '/api/nation/organization/diplomacy-authority?factionId=player',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(response.status, 200, `organization diplomacy authority route failed: ${JSON.stringify(response.data)}`)
    const model = readObject(response.data)
    assert.equal(model.contractId, 'organization_diplomacy_authority_v1')
    assert.equal(model.factionId, 'player')
    assert.equal(model.authoritySource, 'world_faction_organization_diplomacy_read_model')
    assert.equal(model.diplomacySubjectBoundary, 'organization_not_ai_player')
    assert.equal(model.proposalRoute, '/api/diplomacy/propose')
    assert.equal(model.requiredPermission, 'manage_diplomacy')
    assert.ok(['alliance', 'nation'].includes(String(model.organizationKind)), 'organizationKind should be alliance or nation')
    assert.equal(model.subjectKind, model.organizationKind)

    const actors = readArray(model.actors).map((item) => readObject(item))
    assert.ok(
      actors.some(
        (actor) =>
          actor.actorKind === 'organization_subject' &&
          actor.canProposeDiplomacy === true &&
          actor.authoritySource === 'world_faction_organization_attribution',
      ),
      'read model should expose the alliance/nation as the diplomacy subject',
    )
    assert.ok(
      actors.some(
        (actor) =>
          actor.actorKind === 'alliance_officer' &&
          actor.commanderId === 'ally_west' &&
          actor.permission === 'manage_diplomacy' &&
          actor.canProposeDiplomacy === true,
      ),
      'read model should expose alliance officer diplomacy permission',
    )
    assert.equal(
      actors.some((actor) => actor.actorKind === 'ai_player'),
      false,
      'AI players are members/advisers, not diplomacy subjects in this read model',
    )

    const relations = readArray(model.relations).map((item) => readObject(item))
    assert.ok(relations.length > 0, 'read model should expose diplomacy relation targets')
    assert.ok(
      relations.some((relation) => relation.canPropose === true && relation.reason === 'cross_organization'),
      'read model should expose at least one cross-organization diplomacy target',
    )

    console.log('[organization_diplomacy_authority_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[organization_diplomacy_authority_contract] failed:', error)
  process.exit(1)
})
