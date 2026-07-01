import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import type { WorldState } from '../../shared/contracts/game/world'
import { createInitialWorldState } from '../../shared/domain/scenario'
import { buildSessionPersistPath, readArray, readObject, requestJson } from './helpers/backendHarness'
import {
  AI_PLAYER_ID,
  type AiPlayerHttpBackend,
  assertSuccessfulReceipt,
  clearAllPlanExecutions,
  createApproveExecuteProposal,
  ensureFactionBudget,
  GOVERNOR_PLAYER_ID,
  joinGovernor,
  loadWorldState,
  registerDefaultAiPlayer,
  startAiPlayerHttpBackend,
} from './helpers/aiPlayerHttpContractHarness'

const MOVEMENT_ACTIONS: Array<{ action: 'world_scout' | 'march_move' | 'garrison_set'; worldAction: string }> = [
  { action: 'world_scout', worldAction: 'queuePlanExecution' },
  { action: 'march_move', worldAction: 'moveUnit' },
  { action: 'garrison_set', worldAction: 'queueTacticalOverride' },
]

const FACTION_ID = 'player'

type MovementSeed = {
  worldPersistPath: string
  aiUnitId: string
  rogueUnitId: string
}

const ROGUE_ACTIONS: Array<{ action: 'world_scout' | 'march_move' | 'garrison_set'; expectedError: RegExp }> = [
  { action: 'world_scout', expectedError: /no adjacent scout target/ },
  { action: 'march_move', expectedError: /no ai-managed unit/ },
  { action: 'garrison_set', expectedError: /no garrison target/ },
]

function seedWorldStateWithMovementTarget(): MovementSeed {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding movement shard`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding movement shard`)
  const rogueUnit = structuredClone(unit)
  rogueUnit.id = 'ai_player_http_movement_rogue_faction_unit'
  rogueUnit.name = 'Movement Rogue Faction Unit'
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = Math.max(unit.strength, 160)
  unit.supply = Math.max(unit.supply, 12)
  unit.mobility = Math.max(unit.mobility, 12)
  rogueUnit.status = '待命'
  rogueUnit.currentTask = undefined
  rogueUnit.strength = Math.max(rogueUnit.strength, 160)
  rogueUnit.supply = Math.max(rogueUnit.supply, 12)
  rogueUnit.mobility = Math.max(rogueUnit.mobility, 12)
  world.units.push(rogueUnit)
  faction.actionPoints = Math.max(faction.actionPoints, 4)
  faction.food = Math.max(faction.food, 4)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Player Operator Alpha',
      factionId: FACTION_ID,
      unitIds: [unit.id],
      specialty: 'logistics',
    },
  ]

  const path = buildSessionPersistPath('ai_player_http_movement_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    worldPersistPath: path,
    aiUnitId: unit.id,
    rogueUnitId: rogueUnit.id,
  }
}

function readSeededTile(worldPersistPath: string, tileId: string) {
  const world = JSON.parse(readFileSync(worldPersistPath, 'utf-8')) as WorldState
  return world.map.tiles.find((tile) => tile.id === tileId)
}

async function bootMovementBackend(worldPersistPath: string): Promise<AiPlayerHttpBackend> {
  const backend = await startAiPlayerHttpBackend(
    'ai_player_http_movement_contract',
    undefined,
    {
      WORLD_STATE_PERSIST_PATH: worldPersistPath,
    },
  )
  await joinGovernor(backend.baseUrl)
  await registerDefaultAiPlayer(backend.baseUrl)
  return backend
}

function resolveAdjacentTileCandidate(world: WorldState, factionId: string, preferredUnitId?: string): { unitId: string; targetTileId: string } {
  const unit = preferredUnitId
    ? world.units.find((candidate) => candidate.id === preferredUnitId && candidate.faction === factionId && candidate.tileId)
    : world.units.find((candidate) => candidate.faction === factionId && candidate.tileId)
  if (!unit) {
    throw new Error(`no movement unit found for faction ${factionId}`)
  }

  const targets = (world.map.connections[unit.tileId] ?? []).filter((tileId) => tileId !== unit.tileId)
  const targetTileId = targets[0]
  if (!targetTileId) {
    throw new Error(`no adjacent tile found for faction ${factionId} unit ${unit.id}`)
  }

  return {
    unitId: unit.id,
    targetTileId,
  }
}

async function loadAndResolveMoveCandidate(baseUrl: string, action: 'world_scout' | 'march_move' | 'garrison_set', preferredUnitId?: string): Promise<{
  unitId: string
  targetTileId: string
  summary?: string
}> {
  const world = await loadWorldState(baseUrl)
  const candidate = resolveAdjacentTileCandidate(world, FACTION_ID, preferredUnitId)
  if (action === 'garrison_set') {
    return {
      unitId: candidate.unitId,
      targetTileId: world.units.find((unit) => unit.id === candidate.unitId)?.tileId ?? candidate.targetTileId,
      summary: 'garrison_set action contract smoke test',
    }
  }

  return {
    unitId: candidate.unitId,
    targetTileId: candidate.targetTileId,
  }
}

async function run() {
  const seed = seedWorldStateWithMovementTarget()
  const backend = await bootMovementBackend(seed.worldPersistPath)
  try {
    for (const { action, expectedError } of ROGUE_ACTIONS) {
      await clearAllPlanExecutions(backend.baseUrl)
      await ensureFactionBudget(backend.baseUrl, 4, 0, `prepare rogue ${action} rejection in movement contract shard`)
      const rogueCandidate = await loadAndResolveMoveCandidate(backend.baseUrl, action, seed.rogueUnitId)
      const rogueProposalArgs = {
        ...rogueCandidate,
        sourceBattleReportId: `movement_denied_${action}_source_battle`,
        sourceReplayRequestId: `movement_denied_${action}_source_replay`,
        recommendedRecoveryCommand: 'review_ai_owned_unit_authority',
      }
      const rogueCreate = await requestJson(backend.baseUrl, '/api/ai/players/proposals', 'POST', {
        aiPlayerId: AI_PLAYER_ID,
        action,
        source: 'mcp',
        reason: `Rogue faction unit must not be executable by this AI player for ${action}.`,
        args: rogueProposalArgs,
      })
      assert.equal(rogueCreate.status, 200, `create rogue ${action} proposal failed unexpectedly: ${JSON.stringify(rogueCreate.data)}`)
      const rogueProposal = readObject(readObject(rogueCreate.data).proposal)
      const rogueProposalId = String(rogueProposal.proposalId)
      const rogueApprove = await requestJson(backend.baseUrl, `/api/ai/players/proposals/${rogueProposalId}/approve`, 'POST', {
        approvedBy: GOVERNOR_PLAYER_ID,
      })
      assert.equal(rogueApprove.status, 200, `approve rogue ${action} proposal failed unexpectedly: ${JSON.stringify(rogueApprove.data)}`)
      const rogueExecute = await requestJson(
        backend.baseUrl,
        `/api/ai/players/proposals/${rogueProposalId}/execute`,
        'POST',
        {
          executedBy: GOVERNOR_PLAYER_ID,
          includeWorld: false,
        },
        60_000,
      )
      assert.equal(rogueExecute.status, 400, `rogue ${action} must be rejected at execution: ${JSON.stringify(rogueExecute.data)}`)
      const rogueExecutePayload = readObject(rogueExecute.data)
      assert.equal(rogueExecutePayload.ok, false)
      assert.match(String(rogueExecutePayload.error), expectedError)
      const subjectAfterDeniedExecution = await requestJson(
        backend.baseUrl,
        `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
        'GET',
        undefined,
        60_000,
      )
      assert.equal(
        subjectAfterDeniedExecution.status,
        200,
        `subject after denied ${action} execution failed: ${JSON.stringify(subjectAfterDeniedExecution.data)}`,
      )
      const subject = readObject(readObject(subjectAfterDeniedExecution.data).subject)
      const bodyChangeItems = readArray(readObject(subject.recentBodyChanges).items).map((item) => readObject(item))
      const deniedExecutionBodyChange = bodyChangeItems.find((item) => (
        item.action === action &&
        item.proposalId === rogueProposalId
      ))
      assert.ok(
        deniedExecutionBodyChange,
        `denied ${action} execution must become a subject governance body change`,
      )
      assert.equal(deniedExecutionBodyChange.bodyNode, 'human_command_and_obedience')
      assert.equal(deniedExecutionBodyChange.status, 'failed')
      assert.equal(deniedExecutionBodyChange.failureCode, 'proposal_execution_failed')
      assert.equal(deniedExecutionBodyChange.unitId, rogueCandidate.unitId)
      assert.equal(deniedExecutionBodyChange.targetTileId, rogueCandidate.targetTileId)
      assert.equal(deniedExecutionBodyChange.sourceBattleReportId, `movement_denied_${action}_source_battle`)
      assert.equal(deniedExecutionBodyChange.sourceReplayRequestId, `movement_denied_${action}_source_replay`)
      assert.equal(deniedExecutionBodyChange.recommendedRecoveryCommand, 'review_ai_owned_unit_authority')
      assert.match(
        String(deniedExecutionBodyChange.governanceFailureDetail),
        expectedError,
        'denied movement subject trace should preserve the concrete execution authority reason',
      )
      assert.equal(deniedExecutionBodyChange.nextSubjectFocus, 'governance')
      assert.equal(deniedExecutionBodyChange.visibleToAi, true)
      assert.equal(deniedExecutionBodyChange.approvedBy, GOVERNOR_PLAYER_ID)
      assert.equal(deniedExecutionBodyChange.historyAnchorAvailable, true)
      assert.equal(deniedExecutionBodyChange.historyAnchorSourceVisibility, 'internal_link_only')

      const historyAnchorItems = readArray(readObject(subject.recentHistoryAnchors).items).map((item) => readObject(item))
      const deniedExecutionHistoryAnchor = historyAnchorItems.find((item) => (
        item.action === action &&
        item.proposalId === rogueProposalId
      ))
      assert.ok(
        deniedExecutionHistoryAnchor,
        `denied ${action} execution body change must be linked to subject history`,
      )
      assert.equal(deniedExecutionHistoryAnchor.bodyNode, 'human_command_and_obedience')
      assert.equal(deniedExecutionHistoryAnchor.status, 'failed')
      assert.equal(deniedExecutionHistoryAnchor.approvedBy, GOVERNOR_PLAYER_ID)
      assert.equal(deniedExecutionHistoryAnchor.unitId, rogueCandidate.unitId)
      assert.equal(deniedExecutionHistoryAnchor.targetTileId, rogueCandidate.targetTileId)
      assert.equal(deniedExecutionHistoryAnchor.sourceBattleReportId, `movement_denied_${action}_source_battle`)
      assert.equal(deniedExecutionHistoryAnchor.sourceReplayRequestId, `movement_denied_${action}_source_replay`)
      assert.equal(deniedExecutionHistoryAnchor.recommendedRecoveryCommand, 'review_ai_owned_unit_authority')
      assert.match(
        String(deniedExecutionHistoryAnchor.governanceFailureDetail),
        expectedError,
        'denied movement history anchor should preserve the concrete execution authority reason',
      )
      assert.equal(deniedExecutionHistoryAnchor.nextSubjectFocus, 'governance')
      const sourceRefs = readObject(deniedExecutionHistoryAnchor.sourceRefs)
      assert.equal(sourceRefs.visible, false)
      assert.equal(sourceRefs.visibility, 'internal_link_only')
      assert.equal(sourceRefs.proposalId, rogueProposalId)
      assert.equal(sourceRefs.sourceBattleReportId, `movement_denied_${action}_source_battle`)
      assert.equal(sourceRefs.sourceReplayRequestId, `movement_denied_${action}_source_replay`)
      assert.equal(sourceRefs.recommendedRecoveryCommand, 'review_ai_owned_unit_authority')
    }

    for (const { action, worldAction } of MOVEMENT_ACTIONS) {
      await clearAllPlanExecutions(backend.baseUrl)
      await ensureFactionBudget(backend.baseUrl, 4, 0, `prepare ${action} in movement contract shard`)

      const candidate = await loadAndResolveMoveCandidate(backend.baseUrl, action, seed.aiUnitId)
      const proposalArgs = action === 'march_move'
        ? {
            ...candidate,
            sourceBattleReportId: 'movement_march_source_battle',
            sourceReplayRequestId: 'movement_march_source_replay',
            recommendedRecoveryCommand: 'continue_war_follow_up_action',
          }
        : action === 'garrison_set'
        ? {
            ...candidate,
            sourceBattleReportId: 'movement_garrison_source_battle',
            sourceReplayRequestId: 'movement_garrison_source_replay',
            recommendedRecoveryCommand: 'continue_war_follow_up_action',
          }
        : {
            ...candidate,
            sourceBattleReportId: 'movement_scout_source_battle',
            sourceReplayRequestId: 'movement_scout_source_replay',
            recommendedRecoveryCommand: 'continue_war_follow_up_action',
          }
      const { receipt } = await createApproveExecuteProposal(
        backend.baseUrl,
        action,
        proposalArgs,
        `Movement AI player contract smoke test for ${action}`,
      )

      assertSuccessfulReceipt(action, receipt, worldAction)
      assert.equal(receipt.failureCode, null, `${action} failureCode should remain null`)

      if (action === 'march_move') {
        const worldReceipt = readObject(receipt.worldReceipt)
        const geographyFeedback = readObject(worldReceipt.movementGeographyFeedback)
        assert.equal(
          geographyFeedback.schemaVersion,
          'movement_geography_feedback_v0_1',
          'march_move should expose movement geography feedback in worldReceipt',
        )
        assert.equal(geographyFeedback.ok, true, 'successful march_move geography feedback should be allowed')
        assert.equal(
          geographyFeedback.seaRouteAuthorityBoundary,
          'land_movement_only_sea_route_authority_is_independent',
          'march_move feedback must keep W6 sea route authority independent',
        )
        assert.equal(
          typeof geographyFeedback.playerSummary === 'string' && geographyFeedback.playerSummary.length > 0,
          true,
          'march_move geography feedback should expose player-readable summary',
        )

        const subjectResult = await requestJson(
          backend.baseUrl,
          `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
          'GET',
          undefined,
          60_000,
        )
        assert.equal(subjectResult.status, 200, `subject read model after march_move failed: ${JSON.stringify(subjectResult.data)}`)
        const subject = readObject(readObject(subjectResult.data).subject)
        const recentBodyChanges = readObject(subject.recentBodyChanges)
        const bodyChangeItems = readArray(recentBodyChanges.items).map((item) => readObject(item))
        const marchBodyChange = bodyChangeItems.find(
          (item) => item.action === 'march_move' && item.bodyNode === 'generals_and_troops',
        )
        assert.ok(marchBodyChange, 'march_move receipt must become an AI subject troop-position body change')
        assert.equal(marchBodyChange.status, 'completed')
        assert.equal(marchBodyChange.unitId, candidate.unitId)
        assert.equal(marchBodyChange.targetTileId, candidate.targetTileId)
        assert.equal(marchBodyChange.nextSubjectFocus, 'troops')
        assert.equal(marchBodyChange.visibleToAi, true)
        assert.equal(marchBodyChange.governanceApprovedBeforeExecution, true)
        assert.equal(marchBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
        assert.equal(typeof marchBodyChange.governanceApprovedAt, 'string')
        assert.equal(String(marchBodyChange.governanceApprovedAt).length > 0, true)
        assert.equal(marchBodyChange.executionReceiptAvailable, true)
        assert.equal(marchBodyChange.executionWorldAction, 'moveUnit')
        assert.equal(marchBodyChange.executionWorldReceiptAvailable, true)
        assert.equal(marchBodyChange.executionWorldReceiptAction, 'moveUnit')
        assert.equal(marchBodyChange.executionWorldReceiptUnitId, candidate.unitId)
        assert.equal(marchBodyChange.executionWorldReceiptTargetTileId, candidate.targetTileId)
        assert.equal(marchBodyChange.sourceBattleReportId, 'movement_march_source_battle')
        assert.equal(marchBodyChange.sourceReplayRequestId, 'movement_march_source_replay')
        assert.equal(marchBodyChange.recommendedRecoveryCommand, 'continue_war_follow_up_action')
        const historyAnchorItems = readArray(readObject(subject.recentHistoryAnchors).items).map((item) => readObject(item))
        const marchHistoryAnchor = historyAnchorItems.find((item) => (
          item.action === 'march_move' &&
          item.bodyNode === 'generals_and_troops' &&
          item.proposalId === marchBodyChange.proposalId
        ))
        assert.ok(marchHistoryAnchor, 'march_move body change must be linked to subject history')
        assert.equal(marchHistoryAnchor.status, 'completed')
        assert.equal(marchHistoryAnchor.governanceApprovedBeforeExecution, true)
        assert.equal(marchHistoryAnchor.governanceApprovedBy, GOVERNOR_PLAYER_ID)
        assert.equal(typeof marchHistoryAnchor.governanceApprovedAt, 'string')
        assert.equal(marchHistoryAnchor.executionWorldReceiptAction, 'moveUnit')
        assert.equal(marchHistoryAnchor.executionWorldReceiptUnitId, candidate.unitId)
        assert.equal(marchHistoryAnchor.executionWorldReceiptTargetTileId, candidate.targetTileId)
        const marchSourceRefs = readObject(marchHistoryAnchor.sourceRefs)
        assert.equal(marchSourceRefs.sourceBattleReportId, 'movement_march_source_battle')
        assert.equal(marchSourceRefs.sourceReplayRequestId, 'movement_march_source_replay')
        assert.equal(marchSourceRefs.recommendedRecoveryCommand, 'continue_war_follow_up_action')
      }

      if (action === 'world_scout') {
        const execution = readObject(receipt.execution)
        const scoutedTile = readSeededTile(seed.worldPersistPath, candidate.targetTileId)
        assert.ok(scoutedTile, `world_scout target tile ${candidate.targetTileId} should exist`)
        assert.equal(
          typeof execution.status === 'string' && execution.status.length > 0,
          true,
          'world_scout execution snapshot should expose a non-empty status',
        )
        const actionRequestId = receipt.actionRequestId
        assert.ok(
          typeof actionRequestId === 'string' && actionRequestId.length > 0,
          'world_scout should return a formal actionRequestId',
        )

        const subjectResult = await requestJson(
          backend.baseUrl,
          `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
          'GET',
          undefined,
          60_000,
        )
        assert.equal(subjectResult.status, 200, `subject read model after world_scout failed: ${JSON.stringify(subjectResult.data)}`)
        const subject = readObject(readObject(subjectResult.data).subject)
        const recentBodyChanges = readObject(subject.recentBodyChanges)
        const bodyChangeItems = readArray(recentBodyChanges.items).map((item) => readObject(item))
        const scoutBodyChange = bodyChangeItems.find(
          (item) => item.action === 'world_scout' && item.bodyNode === 'war_and_relations',
        )
        assert.ok(scoutBodyChange, 'world_scout receipt must become an AI subject war-intel body change')
        assert.equal(scoutBodyChange.status, 'completed')
        assert.equal(scoutBodyChange.unitId, candidate.unitId)
        assert.equal(scoutBodyChange.targetTileId, candidate.targetTileId)
        assert.equal(scoutBodyChange.targetTileType, scoutedTile.type)
        assert.equal(scoutBodyChange.targetTileTerrain, scoutedTile.terrain)
        assert.equal(scoutBodyChange.targetTileOwner, scoutedTile.owner)
        assert.equal(scoutBodyChange.targetTileResourceKind, scoutedTile.resourceKind)
        assert.equal(scoutBodyChange.targetTileResourceLevel, scoutedTile.resourceLevel)
        assert.equal(scoutBodyChange.targetTileScoutingDifficulty, scoutedTile.scoutingDifficulty)
        assert.equal(scoutBodyChange.targetTileEnemyPressure, scoutedTile.enemyPressure)
        assert.equal(scoutBodyChange.nextSubjectFocus, 'war')
        assert.equal(scoutBodyChange.visibleToAi, true)
        assert.equal(scoutBodyChange.governanceApprovedBeforeExecution, true)
        assert.equal(scoutBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
        assert.equal(typeof scoutBodyChange.governanceApprovedAt, 'string')
        assert.equal(String(scoutBodyChange.governanceApprovedAt).length > 0, true)
        assert.equal(scoutBodyChange.executionReceiptAvailable, true)
        assert.equal(scoutBodyChange.executionWorldAction, 'queuePlanExecution')
        assert.equal(scoutBodyChange.executionWorldReceiptAvailable, false)
        assert.equal(scoutBodyChange.executionActionRequestId, actionRequestId)
        assert.equal(scoutBodyChange.sourceBattleReportId, 'movement_scout_source_battle')
        assert.equal(scoutBodyChange.sourceReplayRequestId, 'movement_scout_source_replay')
        assert.equal(scoutBodyChange.recommendedRecoveryCommand, 'continue_war_follow_up_action')

        const historyAnchorItems = readArray(readObject(subject.recentHistoryAnchors).items).map((item) => readObject(item))
        const scoutHistoryAnchor = historyAnchorItems.find((item) => (
          item.action === 'world_scout' &&
          item.bodyNode === 'war_and_relations' &&
          item.proposalId === scoutBodyChange.proposalId
        ))
        assert.ok(scoutHistoryAnchor, 'world_scout body change must be linked to subject history')
        assert.equal(scoutHistoryAnchor.status, 'completed')
        assert.equal(scoutHistoryAnchor.governanceApprovedBeforeExecution, true)
        assert.equal(scoutHistoryAnchor.governanceApprovedBy, GOVERNOR_PLAYER_ID)
        assert.equal(typeof scoutHistoryAnchor.governanceApprovedAt, 'string')
        assert.equal(scoutHistoryAnchor.targetTileType, scoutedTile.type)
        assert.equal(scoutHistoryAnchor.targetTileTerrain, scoutedTile.terrain)
        assert.equal(scoutHistoryAnchor.targetTileOwner, scoutedTile.owner)
        assert.equal(scoutHistoryAnchor.targetTileResourceKind, scoutedTile.resourceKind)
        assert.equal(scoutHistoryAnchor.targetTileResourceLevel, scoutedTile.resourceLevel)
        assert.equal(scoutHistoryAnchor.targetTileScoutingDifficulty, scoutedTile.scoutingDifficulty)
        assert.equal(scoutHistoryAnchor.targetTileEnemyPressure, scoutedTile.enemyPressure)
        assert.equal(scoutHistoryAnchor.executionWorldAction, 'queuePlanExecution')
        assert.equal(scoutHistoryAnchor.executionActionRequestId, actionRequestId)
        const scoutSourceRefs = readObject(scoutHistoryAnchor.sourceRefs)
        assert.equal(scoutSourceRefs.sourceBattleReportId, 'movement_scout_source_battle')
        assert.equal(scoutSourceRefs.sourceReplayRequestId, 'movement_scout_source_replay')
        assert.equal(scoutSourceRefs.recommendedRecoveryCommand, 'continue_war_follow_up_action')
      }

      if (action === 'garrison_set') {
        const subjectResult = await requestJson(
          backend.baseUrl,
          `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
          'GET',
          undefined,
          60_000,
        )
        assert.equal(subjectResult.status, 200, `subject read model after garrison_set failed: ${JSON.stringify(subjectResult.data)}`)
        const subject = readObject(readObject(subjectResult.data).subject)
        const bodyChangeItems = readArray(readObject(subject.recentBodyChanges).items).map((item) => readObject(item))
        const garrisonBodyChange = bodyChangeItems.find(
          (item) => item.action === 'garrison_set' && item.bodyNode === 'war_and_relations',
        )
        assert.ok(garrisonBodyChange, 'garrison_set receipt must become an AI subject war body change')
        assert.equal(garrisonBodyChange.status, 'completed')
        assert.equal(garrisonBodyChange.unitId, candidate.unitId)
        assert.equal(garrisonBodyChange.targetTileId, candidate.targetTileId)
        assert.equal(garrisonBodyChange.nextSubjectFocus, 'war')
        assert.equal(garrisonBodyChange.visibleToAi, true)
        assert.equal(garrisonBodyChange.governanceApprovedBeforeExecution, true)
        assert.equal(garrisonBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
        assert.equal(typeof garrisonBodyChange.governanceApprovedAt, 'string')
        assert.equal(String(garrisonBodyChange.governanceApprovedAt).length > 0, true)
        assert.equal(garrisonBodyChange.executionReceiptAvailable, true)
        assert.equal(garrisonBodyChange.executionWorldAction, 'queueTacticalOverride')
        assert.equal(garrisonBodyChange.executionFailureCode, null)
        assert.equal(garrisonBodyChange.sourceBattleReportId, 'movement_garrison_source_battle')
        assert.equal(garrisonBodyChange.sourceReplayRequestId, 'movement_garrison_source_replay')
        assert.equal(garrisonBodyChange.recommendedRecoveryCommand, 'continue_war_follow_up_action')
        assert.equal(garrisonBodyChange.historyAnchorAvailable, true)
        assert.equal(garrisonBodyChange.historyAnchorSourceVisibility, 'internal_link_only')
        assert.ok(String(garrisonBodyChange.historyAnchorWorldEventId ?? '').length > 0)
        const historyAnchorItems = readArray(readObject(subject.recentHistoryAnchors).items).map((item) => readObject(item))
        const garrisonHistoryAnchor = historyAnchorItems.find((item) => (
          item.action === 'garrison_set' &&
          item.bodyNode === 'war_and_relations' &&
          item.proposalId === garrisonBodyChange.proposalId
        ))
        assert.ok(garrisonHistoryAnchor, 'garrison_set body change must be linked to subject history')
        const sourceRefs = readObject(garrisonHistoryAnchor.sourceRefs)
        assert.equal(sourceRefs.sourceBattleReportId, 'movement_garrison_source_battle')
        assert.equal(sourceRefs.sourceReplayRequestId, 'movement_garrison_source_replay')
        assert.equal(sourceRefs.recommendedRecoveryCommand, 'continue_war_follow_up_action')
      }
    }

    console.log('[ai_player_http_movement_contract] all checks passed')
  } finally {
    await backend.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_http_movement_contract] failed:', error)
  process.exitCode = 1
})
