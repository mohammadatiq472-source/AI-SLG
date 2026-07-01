import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  assertSuccessfulReceipt,
  createApproveExecuteProposal,
  joinGovernor,
  loadWorldState,
  startAiPlayerHttpBackend,
  type AiPlayerHttpBackend,
} from './helpers/aiPlayerHttpContractHarness'
import { buildSessionPersistPath, readArray, readObject, requestJson } from './helpers/backendHarness'

const RESOURCE_TILE_ID = 'tile_ai_player_resource_gather_contract'

function seedWorldStateWithAiGatherTarget(): { path: string; unitId: string; tileId: string } {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding AI player resource gather shard`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding AI player resource gather shard`)
  const resourceTile = world.map.tiles.find((tile) => tile.id === RESOURCE_TILE_ID)
    ?? world.map.tiles.find((tile) => tile.type === 'resource')
    ?? world.map.tiles[0]
  assert.ok(resourceTile, 'missing map tile while seeding AI player resource gather shard')

  resourceTile.id = RESOURCE_TILE_ID
  resourceTile.name = 'AI Player Gather Contract Resource Tile'
  resourceTile.type = 'resource'
  resourceTile.owner = FACTION_ID
  resourceTile.resourceKind = 'iron'
  resourceTile.resourceLevel = 3
  unit.tileId = resourceTile.id

  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Player Operator Alpha',
      factionId: FACTION_ID,
      unitIds: [unit.id],
      specialty: 'logistics',
    },
  ]
  faction.aiResourceAccounts = {
    [AI_PLAYER_ID]: {
      aiPlayerId: AI_PLAYER_ID,
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      resources: {
        food: 1,
        wood: 2,
        stone: 3,
        iron: 4,
      },
      updatedTick: world.tick,
    },
  }
  faction.aiResourceGatherClaims = {}

  const path = buildSessionPersistPath('ai_player_http_resource_gather_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { path, unitId: unit.id, tileId: resourceTile.id }
}

async function bootResourceGatherBackend(worldPersistPath: string): Promise<AiPlayerHttpBackend> {
  const backend = await startAiPlayerHttpBackend(
    'ai_player_http_resource_gather_contract',
    undefined,
    {
      WORLD_STATE_PERSIST_PATH: worldPersistPath,
    },
  )
  await joinGovernor(backend.baseUrl)
  const register = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId: AI_PLAYER_ID,
    displayName: 'Player Operator Alpha',
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    actionWhitelist: ['resource_gather'],
  })
  assert.equal(register.status, 200, `register resource gather AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

async function run() {
  const seeded = seedWorldStateWithAiGatherTarget()
  const backend = await bootResourceGatherBackend(seeded.path)
  try {
    const catalog = await requestJson(backend.baseUrl, '/api/ai/player-actions/catalog', 'GET')
    assert.equal(catalog.status, 200)
    const gatherEntry = readArray(readObject(catalog.data).catalog)
      .map((item) => readObject(item))
      .find((item) => item.action === 'resource_gather')
    assert.ok(gatherEntry, 'catalog should expose resource_gather')
    assert.equal(gatherEntry.riskLevel, 'low')
    assert.equal(gatherEntry.requiresApprovalByDefault, false)
    assert.equal(gatherEntry.executableInV1, true)
    assert.equal(gatherEntry.mappedWorldAction, 'gatherAiResourceTile')

    const invalidArgs = await requestJson(backend.baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      action: 'resource_gather',
      source: 'mcp',
      reason: 'invalid resource gather args should be rejected',
      args: {
        unitId: 123,
        tileId: seeded.tileId,
      },
    })
    assert.equal(invalidArgs.status, 422, 'resource_gather should reject non-string unitId')

    const { receipt } = await createApproveExecuteProposal(
      backend.baseUrl,
      'resource_gather',
      {
        unitId: seeded.unitId,
        tileId: seeded.tileId,
      },
      'AI player resource gather shard success',
    )
    assertSuccessfulReceipt('resource_gather', receipt, 'gatherAiResourceTile')
    assert.deepEqual(
      readObject(receipt.worldActionPayload),
      {
        factionId: FACTION_ID,
        aiPlayerId: AI_PLAYER_ID,
        unitId: seeded.unitId,
        tileId: seeded.tileId,
      },
      'resource_gather receipt should surface world action payload',
    )
    assert.ok(readObject(receipt.execution), 'resource_gather receipt should include execution')

    const worldAfter = await loadWorldState(backend.baseUrl)
    const accountAfter = worldAfter.factions[FACTION_ID]?.aiResourceAccounts?.[AI_PLAYER_ID]
    assert.ok(accountAfter, 'AI subaccount should remain after gather')
    assert.equal(accountAfter.resources.food, 1)
    assert.equal(accountAfter.resources.wood, 2)
    assert.equal(accountAfter.resources.stone, 3)
    assert.equal(accountAfter.resources.iron, 34, 'resourceLevel 3 should add 30 iron into the AI subaccount')
    const claim = worldAfter.factions[FACTION_ID]?.aiResourceGatherClaims?.[seeded.tileId]
    assert.ok(claim, 'resource_gather should persist one-time tile claim')
    assert.equal(claim.aiPlayerId, AI_PLAYER_ID)
    assert.equal(claim.unitId, seeded.unitId)

    const subjectResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(subjectResponse.status, 200, `subject after resource_gather failed: ${JSON.stringify(subjectResponse.data)}`)
    const subject = readObject(readObject(subjectResponse.data).subject)
    const recentBodyChanges = readObject(subject.recentBodyChanges)
    assert.equal(recentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
    const bodyChangeItems = readArray(recentBodyChanges.items).map((item) => readObject(item))
    const gatherBodyChange = bodyChangeItems.find((item) => item.action === 'resource_gather')
    assert.ok(gatherBodyChange, 'resource_gather receipt must become a subject body change')
    assert.equal(gatherBodyChange.bodyNode, 'resources_and_buildings')
    assert.equal(gatherBodyChange.status, 'completed')
    assert.equal(gatherBodyChange.targetTileId, seeded.tileId)
    assert.equal(gatherBodyChange.unitId, seeded.unitId)
    assert.equal(gatherBodyChange.claimId, claim.id)
    assert.deepEqual(readObject(gatherBodyChange.resourceDelta), {
      food: 0,
      wood: 0,
      stone: 0,
      iron: 30,
    })
    assert.deepEqual(readObject(gatherBodyChange.accountBefore), {
      food: 1,
      wood: 2,
      stone: 3,
      iron: 4,
    })
    assert.deepEqual(readObject(gatherBodyChange.accountAfter), {
      food: 1,
      wood: 2,
      stone: 3,
      iron: 34,
    })
    assert.equal(gatherBodyChange.nextSubjectFocus, 'economy')
    assert.equal(gatherBodyChange.visibleToAi, true)
    assert.equal(gatherBodyChange.governanceApprovedBeforeExecution, true)
    assert.equal(gatherBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
    assert.equal(typeof gatherBodyChange.governanceApprovedAt, 'string')
    assert.equal(gatherBodyChange.executionReceiptAvailable, true)
    assert.equal(gatherBodyChange.executionWorldReceiptAvailable, true)
    assert.equal(gatherBodyChange.executionWorldReceiptTargetTileId, seeded.tileId)

    const historyAnchorItems = readArray(readObject(subject.recentHistoryAnchors).items).map((item) => readObject(item))
    const gatherHistoryAnchor = historyAnchorItems.find((item) => (
      item.action === 'resource_gather' &&
      item.bodyNode === 'resources_and_buildings' &&
      item.proposalId === gatherBodyChange.proposalId
    ))
    assert.ok(gatherHistoryAnchor, 'resource_gather body change must be linked to subject history')
    assert.equal(gatherHistoryAnchor.status, 'completed')
    assert.equal(gatherHistoryAnchor.targetTileId, seeded.tileId)
    assert.equal(gatherHistoryAnchor.unitId, seeded.unitId)
    assert.equal(gatherHistoryAnchor.claimId, claim.id)
    assert.deepEqual(readObject(gatherHistoryAnchor.resourceDelta), {
      food: 0,
      wood: 0,
      stone: 0,
      iron: 30,
    })
    assert.deepEqual(readObject(gatherHistoryAnchor.accountBefore), {
      food: 1,
      wood: 2,
      stone: 3,
      iron: 4,
    })
    assert.deepEqual(readObject(gatherHistoryAnchor.accountAfter), {
      food: 1,
      wood: 2,
      stone: 3,
      iron: 34,
    })
    assert.equal(gatherHistoryAnchor.nextSubjectFocus, 'economy')

    console.log('[ai_player_http_resource_gather_contract] all checks passed')
  } finally {
    await backend.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_http_resource_gather_contract] failed:', error)
  process.exitCode = 1
})
