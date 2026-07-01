import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  aiPlayerChatPatrolTickResponseSchema,
  aiPlayerProactivePatrolMessageMetadataSchema,
} from '../../shared/schemas/aiPlayerChat'
import {
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  joinGovernor,
  loadWorldState,
  startAiPlayerHttpBackend,
} from './helpers/aiPlayerHttpContractHarness'
import { readArray, readObject, requestJson } from './helpers/backendHarness'

function seedNeedsHumanTargetWorld() {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding patrol human-input contract`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding patrol human-input contract`)
  const cityTile = world.map.tiles.find((tile) => tile.type === 'city') ?? world.map.tiles[0]
  assert.ok(cityTile, 'missing city tile while seeding patrol human-input contract')

  cityTile.type = 'city'
  cityTile.owner = FACTION_ID
  cityTile.enemyPressure = 0
  world.map.connections[cityTile.id] = []

  unit.tileId = cityTile.id
  unit.strength = 100
  unit.supply = 9
  unit.currentTask = undefined
  unit.aiPlayerId = AI_PLAYER_ID

  faction.actionPoints = Math.max(faction.actionPoints, 8)
  faction.food = Math.max(faction.food, 12)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Patrol Operator Alpha',
      factionId: FACTION_ID,
      unitIds: [unit.id],
      specialty: 'recon',
    },
  ]

  world.tick = 88
  world.feedback.battleRecords = []

  const persistRoot = join(process.cwd(), 'tmp', `ai_player_http_chat_patrol_human_input_world_${process.pid}_${Date.now()}`)
  const path = join(persistRoot, 'world_snapshot.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    persistRoot,
    unitId: unit.id,
    tileId: cityTile.id,
  }
}

async function run() {
  const seeded = seedNeedsHumanTargetWorld()
  const backend = await startAiPlayerHttpBackend('ai_player_http_chat_patrol_human_input_contract', undefined, {
    WORLD_PERSIST_ROOT: seeded.persistRoot,
  })
  try {
    await joinGovernor(backend.baseUrl)
    const register = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      displayName: 'Patrol Operator Alpha',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['battle_report_read', 'troop_heal', 'tile_occupy', 'march_move', 'resource_gather'],
      runtimePolicy: {
        allowLlmProposals: false,
      },
    })
    assert.equal(register.status, 200, `register patrol human-input AI player failed: ${JSON.stringify(register.data)}`)

    const worldBefore = await loadWorldState(backend.baseUrl)
    const patrol = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/patrol-tick`,
      'POST',
      {
        triggeredBy: 'ai_patrol_scheduler',
        triggerMode: 'scheduler',
        goalPower: 4000,
        battleReportLimit: 3,
        cooldownTicks: 6,
        force: true,
      },
    )
    assert.equal(patrol.status, 200, `needs-target proactive patrol tick failed: ${JSON.stringify(patrol.data)}`)
    const payload = readObject(patrol.data)
    aiPlayerChatPatrolTickResponseSchema.parse(payload)
    assert.equal(payload.ok, true)
    assert.equal(payload.modelProposal, undefined)
    assert.equal(payload.modelProposalMessage, undefined)

    const proposalSummary = readObject(payload.proposalSummary)
    assert.equal(proposalSummary.action, 'tile_occupy')
    assert.equal(proposalSummary.readiness, 'needs_target')
    assert.deepEqual(readArray(proposalSummary.blockers), ['unit_not_on_neutral_tile'])

    const proactiveMessage = readObject(payload.proactiveMessage)
    assert.equal(proactiveMessage.kind, 'message')
    assert.equal(proactiveMessage.authorType, 'ai')
    assert.match(String(proactiveMessage.body), /缺目标|指定目标|调整条件/)
    assert.doesNotMatch(String(proactiveMessage.body), /大哥/)
    const proactiveMetadata = readObject(proactiveMessage.metadata)
    aiPlayerProactivePatrolMessageMetadataSchema.parse(proactiveMetadata)
    assert.equal(proactiveMetadata.source, 'patrol_proactive_message')
    assert.equal(proactiveMetadata.proactiveReason, 'human_input_needed')
    assert.equal(proactiveMetadata.severity, 'medium')
    assert.equal(proactiveMetadata.suggestedAction, 'tile_occupy')
    assert.equal(proactiveMetadata.cooldownMinutes, 60)
    assert.deepEqual(readArray(proactiveMetadata.blockers), ['unit_not_on_neutral_tile'])
    assert.deepEqual(readObject(proactiveMetadata.triggerCondition), {
      policyVersion: 'patrol_proactive_trigger_v1',
      reason: 'human_input_needed',
      source: 'development_plan',
      cooldownMinutes: 60,
      requiresHumanApproval: true,
      noAutonomousExecution: true,
    })
    assert.deepEqual(readObject(proactiveMetadata.addressing), {
      value: '总督',
      source: 'neutral_fallback',
    })

    const proposals = await requestJson(backend.baseUrl, `/api/ai/players/proposals?aiPlayerId=${AI_PLAYER_ID}&limit=10`, 'GET')
    assert.equal(proposals.status, 200, `proposal list after needs-target proactive patrol failed: ${JSON.stringify(proposals.data)}`)
    assert.equal(readArray(readObject(proposals.data).items).length, 0)

    const worldAfter = await loadWorldState(backend.baseUrl)
    assert.equal(worldAfter.worldVersion, worldBefore.worldVersion, 'needs-target proactive message must not mutate world')
    const unitAfter = worldAfter.units.find((candidate) => candidate.id === seeded.unitId)
    assert.equal(unitAfter?.tileId, seeded.tileId, 'needs-target proactive message must not move the candidate unit')

    console.log('[ai_player_http_chat_patrol_human_input_contract] all checks passed')
  } finally {
    await backend.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_http_chat_patrol_human_input_contract] failed:', error)
  process.exitCode = 1
})
