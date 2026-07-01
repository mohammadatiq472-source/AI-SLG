import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  createApproveExecuteProposal,
  joinGovernor,
  startAiPlayerHttpBackend,
} from './helpers/aiPlayerHttpContractHarness'
import { buildSessionPersistPath, readArray, readObject, requestJson } from './helpers/backendHarness'

const ROGUE_ACTIONS: Array<{
  action: 'alliance_defense_assign' | 'alliance_defense_batch_assign'
  expectedError: RegExp
}> = [
  { action: 'alliance_defense_assign', expectedError: /no alliance defense assignment target/ },
  { action: 'alliance_defense_batch_assign', expectedError: /no alliance defense batch targets/ },
]

function seedAllianceDefenseWorld(): {
  path: string
  managedUnitId: string
  secondManagedUnitId: string
  rogueUnitId: string
  firstTargetTileId: string
  secondTargetTileId: string
} {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding alliance defense authority contract`)
  const units = world.units.filter((candidate) => candidate.faction === FACTION_ID).slice(0, 2)
  assert.ok(units.length >= 2, 'alliance defense authority contract needs two player units')
  const managedUnit = units[0]
  const secondManagedUnit = units[1]
  const rogueUnit = structuredClone(secondManagedUnit)
  rogueUnit.id = 'ai_player_alliance_defense_authority_rogue_unit'
  rogueUnit.name = 'Alliance Defense Rogue Faction Unit'

  const firstTargetTileId = world.map.connections[managedUnit.tileId]?.[0] ?? managedUnit.tileId
  const secondTargetTileId = world.map.connections[secondManagedUnit.tileId]?.find((tileId) => tileId !== firstTargetTileId)
    ?? world.map.connections[secondManagedUnit.tileId]?.[0]
    ?? secondManagedUnit.tileId
  assert.ok(world.map.tiles.some((tile) => tile.id === firstTargetTileId), 'missing first defense target tile')
  assert.ok(world.map.tiles.some((tile) => tile.id === secondTargetTileId), 'missing second defense target tile')

  for (const unit of [managedUnit, secondManagedUnit, rogueUnit]) {
    unit.status = '待命'
    unit.currentTask = undefined
    unit.strength = Math.max(unit.strength, 140)
    unit.supply = Math.max(unit.supply, 10)
    unit.mobility = Math.max(unit.mobility, 12)
    unit.corps.readiness = Math.max(unit.corps.readiness, 80)
  }
  managedUnit.aiPlayerId = AI_PLAYER_ID
  secondManagedUnit.aiPlayerId = AI_PLAYER_ID
  rogueUnit.aiPlayerId = undefined
  world.units.push(rogueUnit)

  faction.actionPoints = 50
  faction.food = 50
  faction.aiPlayers = [{
    id: AI_PLAYER_ID,
    name: 'Player Operator Alpha',
    factionId: FACTION_ID,
    unitIds: [managedUnit.id, secondManagedUnit.id],
    specialty: 'assault',
  }]

  const path = buildSessionPersistPath('ai_player_alliance_defense_authority_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    managedUnitId: managedUnit.id,
    secondManagedUnitId: secondManagedUnit.id,
    rogueUnitId: rogueUnit.id,
    firstTargetTileId,
    secondTargetTileId,
  }
}

async function createApproveExecuteExpectRejected(
  baseUrl: string,
  action: 'alliance_defense_assign' | 'alliance_defense_batch_assign',
  args: Record<string, unknown>,
  expectedError: RegExp,
) {
  const expectedAssignments = action === 'alliance_defense_assign'
    ? [{
      unitId: String(args.unitId),
      targetTileId: String(args.targetTileId),
    }]
    : readArray(args.assignments).map((item) => {
      const assignment = readObject(item)
      return {
        unitId: String(assignment.unitId),
        targetTileId: String(assignment.targetTileId),
      }
    })
  const create = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
    aiPlayerId: AI_PLAYER_ID,
    action,
    source: 'mcp',
    reason: `Rogue faction unit must not be executable by this AI player for ${action}.`,
    args,
  })
  assert.equal(create.status, 200, `create rogue ${action} proposal failed unexpectedly: ${JSON.stringify(create.data)}`)
  const proposalId = String(readObject(readObject(create.data).proposal).proposalId)
  const approve = await requestJson(baseUrl, `/api/ai/players/proposals/${proposalId}/approve`, 'POST', {
    approvedBy: GOVERNOR_PLAYER_ID,
  })
  assert.equal(approve.status, 200, `approve rogue ${action} proposal failed unexpectedly: ${JSON.stringify(approve.data)}`)
  const execute = await requestJson(baseUrl, `/api/ai/players/proposals/${proposalId}/execute`, 'POST', {
    executedBy: GOVERNOR_PLAYER_ID,
    includeWorld: false,
  }, 60_000)
  assert.equal(execute.status, 400, `rogue ${action} must be rejected at execution: ${JSON.stringify(execute.data)}`)
  const payload = readObject(execute.data)
  assert.equal(payload.ok, false)
  assert.match(String(payload.error), expectedError)

  const subjectResult = await requestJson(
    baseUrl,
    `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
    'GET',
    undefined,
    60_000,
  )
  assert.equal(subjectResult.status, 200, `subject after rogue ${action} rejection failed: ${JSON.stringify(subjectResult.data)}`)
  const subject = readObject(readObject(subjectResult.data).subject)
  const bodyChangeItems = readArray(readObject(subject.recentBodyChanges).items).map((item) => readObject(item))
  const rejectedBodyChange = bodyChangeItems.find((item) => (
    item.action === action &&
    item.proposalId === proposalId
  ))
  assert.ok(rejectedBodyChange, `rogue ${action} rejection must become a subject governance body change`)
  assert.equal(rejectedBodyChange.bodyNode, 'human_command_and_obedience')
  assert.equal(rejectedBodyChange.status, 'failed')
  assert.equal(rejectedBodyChange.failureCode, 'proposal_execution_failed')
  assert.deepEqual(
    (Array.isArray(rejectedBodyChange.assignmentUnitIds) ? rejectedBodyChange.assignmentUnitIds : []).map(String).sort(),
    expectedAssignments.map((assignment) => assignment.unitId).sort(),
    `rogue ${action} subject body should preserve attempted assignment unit ids`,
  )
  assert.deepEqual(
    (Array.isArray(rejectedBodyChange.assignmentTargetTileIds) ? rejectedBodyChange.assignmentTargetTileIds : []).map(String).sort(),
    expectedAssignments.map((assignment) => assignment.targetTileId).sort(),
    `rogue ${action} subject body should preserve attempted assignment target tile ids`,
  )
  assert.equal(rejectedBodyChange.approvedBy, GOVERNOR_PLAYER_ID)
  assert.match(String(rejectedBodyChange.governanceFailureDetail), expectedError)
  assert.equal(rejectedBodyChange.historyAnchorAvailable, true)

  const historyAnchorItems = readArray(readObject(subject.recentHistoryAnchors).items).map((item) => readObject(item))
  const rejectedHistoryAnchor = historyAnchorItems.find((item) => (
    item.action === action &&
    item.proposalId === proposalId
  ))
  assert.ok(rejectedHistoryAnchor, `rogue ${action} rejection must be linked to subject history`)
  assert.equal(rejectedHistoryAnchor.bodyNode, 'human_command_and_obedience')
  assert.equal(rejectedHistoryAnchor.status, 'failed')
  assert.deepEqual(
    (Array.isArray(rejectedHistoryAnchor.assignmentUnitIds) ? rejectedHistoryAnchor.assignmentUnitIds : []).map(String).sort(),
    expectedAssignments.map((assignment) => assignment.unitId).sort(),
    `rogue ${action} history anchor should preserve attempted assignment unit ids`,
  )
  assert.deepEqual(
    (Array.isArray(rejectedHistoryAnchor.assignmentTargetTileIds) ? rejectedHistoryAnchor.assignmentTargetTileIds : []).map(String).sort(),
    expectedAssignments.map((assignment) => assignment.targetTileId).sort(),
    `rogue ${action} history anchor should preserve attempted assignment target tile ids`,
  )
  assert.equal(rejectedHistoryAnchor.approvedBy, GOVERNOR_PLAYER_ID)
  assert.match(String(rejectedHistoryAnchor.governanceFailureDetail), expectedError)
}

async function assertAllianceDefenseSubjectBodyChange(params: {
  baseUrl: string
  action: 'alliance_defense_assign' | 'alliance_defense_batch_assign'
  proposalId: string
  sourceBattleReportId: string
  sourceReplayRequestId: string
}) {
  const subjectResult = await requestJson(
    params.baseUrl,
    `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
    'GET',
    undefined,
    60_000,
  )
  assert.equal(subjectResult.status, 200, `subject after ${params.action} failed: ${JSON.stringify(subjectResult.data)}`)
  const subject = readObject(readObject(subjectResult.data).subject)
  const bodyChangeItems = readArray(readObject(subject.recentBodyChanges).items).map((item) => readObject(item))
  const bodyChange = bodyChangeItems.find((item) => (
    item.action === params.action &&
    item.proposalId === params.proposalId
  ))
  assert.ok(bodyChange, `${params.action} receipt must become a subject war body change`)
  assert.equal(bodyChange.bodyNode, 'war_and_relations')
  assert.equal(bodyChange.status, 'completed')
  assert.equal(bodyChange.sourceBattleReportId, params.sourceBattleReportId)
  assert.equal(bodyChange.sourceReplayRequestId, params.sourceReplayRequestId)
  assert.equal(bodyChange.recommendedRecoveryCommand, 'continue_war_follow_up_action')
  assert.equal(bodyChange.historyAnchorAvailable, true)
  assert.equal(bodyChange.historyAnchorSourceVisibility, 'internal_link_only')

  const historyAnchorItems = readArray(readObject(subject.recentHistoryAnchors).items).map((item) => readObject(item))
  const historyAnchor = historyAnchorItems.find((item) => (
    item.action === params.action &&
    item.proposalId === params.proposalId
  ))
  assert.ok(historyAnchor, `${params.action} history anchor must link to the same proposal`)
  const sourceRefs = readObject(historyAnchor.sourceRefs)
  assert.equal(sourceRefs.sourceBattleReportId, params.sourceBattleReportId)
  assert.equal(sourceRefs.sourceReplayRequestId, params.sourceReplayRequestId)
  assert.equal(sourceRefs.recommendedRecoveryCommand, 'continue_war_follow_up_action')
}

async function run() {
  const seeded = seedAllianceDefenseWorld()
  const backend = await startAiPlayerHttpBackend(
    'ai_player_alliance_defense_authority',
    undefined,
    {
      WORLD_STATE_PERSIST_PATH: seeded.path,
    },
  )
  try {
    await joinGovernor(backend.baseUrl)
    const register = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      displayName: 'Player Operator Alpha',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['alliance_defense_assign', 'alliance_defense_batch_assign'],
      budgetPolicy: {
        allowHighRiskActions: true,
      },
    })
    assert.equal(register.status, 200, `register AI player failed: ${JSON.stringify(register.data)}`)

    for (const { action, expectedError } of ROGUE_ACTIONS) {
      await createApproveExecuteExpectRejected(
        backend.baseUrl,
        action,
        action === 'alliance_defense_assign'
          ? {
            unitId: seeded.rogueUnitId,
            targetTileId: seeded.firstTargetTileId,
            summary: 'Rogue single alliance defense assignment must be rejected.',
          }
          : {
            assignments: [{
              unitId: seeded.rogueUnitId,
              targetTileId: seeded.secondTargetTileId,
              summary: 'Rogue batch alliance defense assignment must be rejected.',
            }],
            summary: 'Rogue batch alliance defense must be rejected.',
          },
        expectedError,
      )
    }

    const singleDefense = await createApproveExecuteProposal(
      backend.baseUrl,
      'alliance_defense_assign',
      {
        unitId: seeded.managedUnitId,
        targetTileId: seeded.firstTargetTileId,
        summary: 'AI-owned alliance defense single assignment.',
        sourceBattleReportId: 'alliance_defense_single_source_battle',
        sourceReplayRequestId: 'alliance_defense_single_source_replay',
        recommendedRecoveryCommand: 'continue_war_follow_up_action',
      },
      'AI-owned single alliance defense assignment should execute.',
    )
    assert.equal(singleDefense.receipt.ok, true, `managed alliance_defense_assign should succeed: ${JSON.stringify(singleDefense.receipt)}`)
    assert.equal(singleDefense.receipt.worldAction, 'queuePlanExecution')
    const singlePayload = readObject(singleDefense.receipt.worldActionPayload)
    const singlePlan = readObject(singlePayload.plan)
    const singleOrders = readArray(singlePlan.orders).map((item) => readObject(item))
    assert.equal(singleOrders.length, 1)
    assert.equal(singleOrders[0].unitId, seeded.managedUnitId)
    assert.equal(singleOrders[0].target, seeded.firstTargetTileId)
    assert.equal(singlePayload.sourceBattleReportId, 'alliance_defense_single_source_battle')
    assert.equal(singlePayload.sourceReplayRequestId, 'alliance_defense_single_source_replay')
    assert.equal(singlePayload.recommendedRecoveryCommand, 'continue_war_follow_up_action')
    await assertAllianceDefenseSubjectBodyChange({
      baseUrl: backend.baseUrl,
      action: 'alliance_defense_assign',
      proposalId: String(singleDefense.proposal.proposalId),
      sourceBattleReportId: 'alliance_defense_single_source_battle',
      sourceReplayRequestId: 'alliance_defense_single_source_replay',
    })

    const clear = await requestJson(backend.baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'clearPlanExecution',
      payload: { factionId: FACTION_ID },
    }, 60_000)
    assert.equal(clear.status, 200, `clear plan execution failed: ${JSON.stringify(clear.data)}`)
    assert.equal(readObject(clear.data).ok, true)

    const batchDefense = await createApproveExecuteProposal(
      backend.baseUrl,
      'alliance_defense_batch_assign',
      {
        assignments: [
          {
            unitId: seeded.managedUnitId,
            targetTileId: seeded.firstTargetTileId,
            summary: 'AI-owned batch alliance defense first assignment.',
          },
          {
            unitId: seeded.secondManagedUnitId,
            targetTileId: seeded.secondTargetTileId,
            summary: 'AI-owned batch alliance defense second assignment.',
          },
        ],
        summary: 'AI-owned batch alliance defense assignment should execute.',
        sourceBattleReportId: 'alliance_defense_batch_source_battle',
        sourceReplayRequestId: 'alliance_defense_batch_source_replay',
        recommendedRecoveryCommand: 'continue_war_follow_up_action',
      },
      'AI-owned batch alliance defense assignment should execute.',
    )
    assert.equal(batchDefense.receipt.ok, true, `managed alliance_defense_batch_assign should succeed: ${JSON.stringify(batchDefense.receipt)}`)
    assert.equal(batchDefense.receipt.worldAction, 'queuePlanExecution')
    const batchPayload = readObject(batchDefense.receipt.worldActionPayload)
    const batchPlan = readObject(batchPayload.plan)
    const batchOrders = readArray(batchPlan.orders).map((item) => readObject(item))
    assert.equal(batchOrders.length, 2)
    assert.deepEqual(
      batchOrders.map((order) => String(order.unitId)).sort(),
      [seeded.managedUnitId, seeded.secondManagedUnitId].sort(),
    )
    assert.deepEqual(
      batchOrders.map((order) => String(order.target)).sort(),
      [seeded.firstTargetTileId, seeded.secondTargetTileId].sort(),
    )
    assert.equal(batchPayload.sourceBattleReportId, 'alliance_defense_batch_source_battle')
    assert.equal(batchPayload.sourceReplayRequestId, 'alliance_defense_batch_source_replay')
    assert.equal(batchPayload.recommendedRecoveryCommand, 'continue_war_follow_up_action')
    await assertAllianceDefenseSubjectBodyChange({
      baseUrl: backend.baseUrl,
      action: 'alliance_defense_batch_assign',
      proposalId: String(batchDefense.proposal.proposalId),
      sourceBattleReportId: 'alliance_defense_batch_source_battle',
      sourceReplayRequestId: 'alliance_defense_batch_source_replay',
    })

    console.log('[ai_player_alliance_defense_authority_contract] all checks passed')
  } finally {
    await backend.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_alliance_defense_authority_contract] failed:', error)
  process.exitCode = 1
})
