import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { AI_PLAYER_ACTION_CATALOG } from '../src/application/ai/aiPlayerActionCatalog'
import { aiPlayerActionProposalRequestSchema } from '../../shared/schemas/aiPlayer'
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
import { readArray, readObject, requestJson } from './helpers/backendHarness'

async function requestJsonWithBearer(baseUrl: string, path: string, token: string) {
  const response = await fetch(new URL(path, baseUrl), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const raw = await response.text()
  return {
    status: response.status,
    data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
  }
}

function visibleCardText(card: Record<string, unknown>) {
  return [
    card.title,
    card.actorName,
    card.locationLabel,
    card.targetLabel,
    card.resultLabel,
    card.consequence,
    card.nextActionLabel,
  ].map((item) => String(item ?? '')).join('\n')
}

function runStaticContract() {
  const entry = AI_PLAYER_ACTION_CATALOG.find((item) => item.action === 'tile_abandon')
  assert.ok(entry, 'catalog should expose tile_abandon')
  assert.equal(entry.riskLevel, 'medium')
  assert.equal(entry.requiresApprovalByDefault, true)
  assert.equal(entry.executableInV1, true)
  assert.equal(entry.mappedWorldAction, 'abandonAiOwnedTile')

  const invalid = aiPlayerActionProposalRequestSchema.safeParse({
    aiPlayerId: 'player_operator_alpha',
    action: 'tile_abandon',
    source: 'mcp',
    reason: 'invalid tile abandon args should be rejected',
    args: {
      tileId: 123,
    },
  })
  assert.equal(invalid.success, false, 'tile_abandon should reject non-string tileId')

  const valid = aiPlayerActionProposalRequestSchema.safeParse({
    aiPlayerId: 'player_operator_alpha',
    action: 'tile_abandon',
    source: 'mcp',
    reason: 'AI player abandons an owned land tile.',
    args: {
      tileId: 'owned_resource_tile',
    },
  })
  assert.equal(valid.success, true, 'tile_abandon should accept string tileId')
}

function seedWorldStateWithAiOwnedTile(): { persistRoot: string; tileId: string } {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding AI player tile abandon shard`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding AI player tile abandon shard`)
  const targetTile = world.map.tiles.find((tile) => tile.type === 'resource')
    ?? world.map.tiles.find((tile) => tile.type === 'plain')
    ?? world.map.tiles[0]
  assert.ok(targetTile, 'missing map tile while seeding AI player tile abandon shard')

  targetTile.type = 'resource'
  targetTile.owner = FACTION_ID
  targetTile.resourceKind = 'wood'
  targetTile.resourceLevel = 2
  targetTile.enemyPressure = 0
  unit.tileId = targetTile.id
  unit.aiPlayerId = AI_PLAYER_ID
  unit.status = '待命'
  unit.currentTask = undefined
  faction.aiPlayers = [{
    id: AI_PLAYER_ID,
    name: 'Player Operator Alpha',
    factionId: FACTION_ID,
    unitIds: [unit.id],
    specialty: 'logistics',
  }]
  faction.aiResourceGatherClaims = {
    [targetTile.id]: {
      id: `claim_${targetTile.id}`,
      aiPlayerId: AI_PLAYER_ID,
      unitId: unit.id,
      factionId: FACTION_ID,
      tileId: targetTile.id,
      resourceKind: 'wood',
      resourceLevel: 2,
      resources: { food: 0, wood: 20, stone: 0, iron: 0 },
      createdTick: world.tick,
    },
  }

  const persistRoot = join(process.cwd(), 'tmp', `ai_player_http_tile_abandon_world_${process.pid}_${Date.now()}`)
  const path = join(persistRoot, 'world_snapshot.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { persistRoot, tileId: targetTile.id }
}

async function bootTileAbandonBackend(worldPersistRoot: string): Promise<AiPlayerHttpBackend> {
  const backend = await startAiPlayerHttpBackend(
    'ai_player_http_tile_abandon_contract',
    undefined,
    {
      WORLD_PERSIST_ROOT: worldPersistRoot,
    },
  )
  await joinGovernor(backend.baseUrl)
  const register = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId: AI_PLAYER_ID,
    displayName: 'Player Operator Alpha',
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    actionWhitelist: ['tile_abandon'],
  })
  assert.equal(register.status, 200, `register tile abandon AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

async function runExecutionContract() {
  const seeded = seedWorldStateWithAiOwnedTile()
  const backend = await bootTileAbandonBackend(seeded.persistRoot)
  try {
    const { receipt } = await createApproveExecuteProposal(
      backend.baseUrl,
      'tile_abandon',
      {
        tileId: seeded.tileId,
      },
      'AI player tile abandon shard success',
    )
    assertSuccessfulReceipt('tile_abandon', receipt, 'abandonAiOwnedTile')
    const worldReceipt = readObject(receipt.worldReceipt)
    assert.equal(worldReceipt.previousOwner, FACTION_ID)
    assert.equal(worldReceipt.owner, 'neutral')
    assert.equal(worldReceipt.abandoned, true)

    const worldAfter = await loadWorldState(backend.baseUrl)
    const tileStates = (worldAfter.map as unknown as { tileStates?: Array<{ id: string; owner?: string }> }).tileStates ?? []
    const tile = tileStates.find((candidate) => candidate.id === seeded.tileId)
    assert.equal(tile?.owner, 'neutral', 'tile_abandon should release tile ownership')
    assert.equal(
      Object.prototype.hasOwnProperty.call(worldAfter.factions[FACTION_ID]?.aiResourceGatherClaims ?? {}, seeded.tileId),
      false,
      'tile_abandon should clear AI gather claim for abandoned tile',
    )

    const join = await requestJson(backend.baseUrl, '/api/session/join', 'POST', {
      factionId: FACTION_ID,
      playerName: GOVERNOR_PLAYER_ID,
    })
    assert.equal(join.status, 200, `session join for tile abandon history failed: ${JSON.stringify(join.data)}`)
    const sessionToken = String(readObject(join.data).token ?? '')
    assert.ok(sessionToken.length > 0, 'session join should return token for player-history readback')

    const history = await requestJsonWithBearer(
      backend.baseUrl,
      '/api/player-history?limit=20&eventLimit=40&civilMemoryLimit=5',
      sessionToken,
    )
    assert.equal(history.status, 200, `player-history after tile_abandon failed: ${JSON.stringify(history.data)}`)
    const timeline = readObject(readObject(history.data).timeline)
    const cards = readArray(timeline.cards).map((item) => readObject(item))
    const executionCard = cards.find((card) => (
      card.category === 'ai_activity'
      && card.title === 'AI 行动已完成'
      && card.targetLabel === '放弃目标地块'
    ))
    assert.ok(executionCard, 'tile_abandon should produce an AI execution PlayerHistory card')
    assert.equal(executionCard.resultLabel, '已执行')
    assert.equal(executionCard.nextActionLabel, '查看 AI 活动')
    const visiblePayload = visibleCardText(executionCard)
    for (const required of ['AI 行动已完成', '放弃目标地块', '已执行', '查看 AI 活动']) {
      assert.ok(visiblePayload.includes(required), `tile_abandon visible history should include ${required}`)
    }
    for (const forbidden of [
      'tile_abandon',
      'abandonAiOwnedTile',
      'proposalId',
      'worldAction',
      'worldActionPayload',
      'metadata',
      'backend',
      'contract',
      'debug',
      'snake_case',
    ]) {
      assert.equal(visiblePayload.includes(forbidden), false, `tile_abandon visible history leaked implementation term: ${forbidden}`)
    }

    const subjectResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(subjectResponse.status, 200, `subject after tile_abandon failed: ${JSON.stringify(subjectResponse.data)}`)
    const subject = readObject(readObject(subjectResponse.data).subject)
    const recentBodyChanges = readObject(subject.recentBodyChanges)
    assert.equal(recentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
    const bodyChangeItems = readArray(recentBodyChanges.items).map((item) => readObject(item))
    const abandonBodyChange = bodyChangeItems.find((item) => item.action === 'tile_abandon')
    assert.ok(abandonBodyChange, 'tile_abandon receipt must become a subject body change')
    assert.equal(abandonBodyChange.bodyNode, 'land_level_and_expansion')
    assert.equal(abandonBodyChange.status, 'completed')
    assert.equal(abandonBodyChange.targetTileId, seeded.tileId)
    assert.equal(abandonBodyChange.previousOwner, FACTION_ID)
    assert.equal(abandonBodyChange.owner, 'neutral')
    assert.equal(abandonBodyChange.abandoned, true)
    assert.equal(abandonBodyChange.clearedGatherClaim, true)
    assert.equal(abandonBodyChange.nextSubjectFocus, 'land')
    assert.equal(abandonBodyChange.visibleToAi, true)
    assert.equal(abandonBodyChange.governanceApprovedBeforeExecution, true)
    assert.equal(abandonBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
    assert.equal(typeof abandonBodyChange.governanceApprovedAt, 'string')
    assert.equal(abandonBodyChange.executionReceiptAvailable, true)
    assert.equal(abandonBodyChange.executionWorldReceiptAvailable, true)
    assert.equal(abandonBodyChange.executionWorldReceiptTargetTileId, seeded.tileId)
    assert.equal(abandonBodyChange.executionWorldReceiptPreviousOwner, FACTION_ID)
    assert.equal(abandonBodyChange.executionWorldReceiptOwner, 'neutral')
    assert.equal(abandonBodyChange.executionWorldReceiptAbandoned, true)
    assert.equal(abandonBodyChange.executionWorldReceiptClearedGatherClaim, true)

    const historyAnchorItems = readArray(readObject(subject.recentHistoryAnchors).items).map((item) => readObject(item))
    const abandonHistoryAnchor = historyAnchorItems.find((item) => (
      item.action === 'tile_abandon' &&
      item.bodyNode === 'land_level_and_expansion' &&
      item.proposalId === abandonBodyChange.proposalId
    ))
    assert.ok(abandonHistoryAnchor, 'tile_abandon body change must be linked to subject history')
    assert.equal(abandonHistoryAnchor.status, 'completed')
    assert.equal(abandonHistoryAnchor.targetTileId, seeded.tileId)
    assert.equal(abandonHistoryAnchor.previousOwner, FACTION_ID)
    assert.equal(abandonHistoryAnchor.owner, 'neutral')
    assert.equal(abandonHistoryAnchor.abandoned, true)
    assert.equal(abandonHistoryAnchor.clearedGatherClaim, true)
    assert.equal(abandonHistoryAnchor.nextSubjectFocus, 'land')
  } finally {
    await backend.stop()
  }
}

runStaticContract()
runExecutionContract().then(() => {
  console.log('[ai_player_http_tile_abandon_contract] all checks passed')
}).catch((error) => {
  console.error('[ai_player_http_tile_abandon_contract] failed:', error)
  process.exitCode = 1
})
