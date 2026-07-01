import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

function seedOrganizationMembershipWorldState(): string {
  const world = createInitialWorldState()
  const faction = world.factions.player
  assert.ok(faction, 'seed world should expose player faction')

  faction.organizationId = 'player'
  faction.organizationKind = 'nation'
  faction.organizationName = '齐国'
  faction.nationName = '齐国'
  faction.nationTier = 'kingdom'
  faction.nationCapitalTileId = 'tile_08'
  faction.nationCapitalName = '青石城'
  faction.aiPlayers = [
    {
      id: 'ai_player_frontline_w3',
      name: '前锋 AI',
      factionId: 'player',
      unitIds: ['u1'],
      specialty: 'assault',
    },
  ]

  const path = buildSessionPersistPath('alliance_organization_membership_contract_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return path
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seedOrganizationMembershipWorldState(),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('alliance_organization_membership_contract_session_state'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const joinResponse = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: '验收总督',
    })
    assert.equal(joinResponse.status, 200, `session join failed: ${JSON.stringify(joinResponse.data)}`)

    const response = await requestJson(baseUrl, '/api/nation/organization/membership?factionId=player', 'GET', undefined, 60_000)
    assert.equal(response.status, 200, `organization membership read model route failed: ${JSON.stringify(response.data)}`)
    const model = readObject(response.data)
    assert.equal(model.contractId, 'organization_membership_authority_v1')
    assert.equal(model.factionId, 'player')
    assert.equal(model.organizationId, 'player')
    assert.equal(model.organizationKind, 'nation')
    assert.equal(model.organizationName, '齐国')
    assert.equal(model.nationTier, 'kingdom')
    assert.equal(model.authoritySource, 'world_faction_alliance_membership_read_model')

    const members = (model.members as unknown[]).map(readObject)
    assert.ok(members.some((member) => member.memberKind === 'player' && member.playerName === '验收总督'), 'read model should include joined human player membership')
    assert.ok(members.some((member) => member.memberKind === 'ai_player' && member.aiPlayerId === 'ai_player_frontline_w3'), 'read model should include AI player organization membership')
    assert.ok(members.some((member) => member.memberKind === 'alliance_officer' && member.commanderId === 'ally_west'), 'read model should include alliance officer authority membership')

    const attribution = readObject(model.factionOrganizationAttribution)
    assert.equal(attribution.organizationId, 'player')
    assert.equal(attribution.organizationKind, 'nation')
    assert.equal(attribution.organizationName, '齐国')
    assert.equal(attribution.nationTier, 'kingdom')

    console.log('[alliance_organization_membership_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[alliance_organization_membership_contract] failed:', error)
  process.exit(1)
})
