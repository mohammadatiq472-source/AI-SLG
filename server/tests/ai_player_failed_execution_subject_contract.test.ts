import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  joinGovernor,
  startAiPlayerHttpBackend,
  type AiPlayerHttpBackend,
} from './helpers/aiPlayerHttpContractHarness'
import { readArray, readObject, requestJson } from './helpers/backendHarness'

const LOW_RESOURCE_AI_PLAYER_ID = 'player_operator_failed_execution_low_resource'

function seedFailedExecutionWorld(): { persistRoot: string } {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding failed execution subject contract`)
  faction.actionPoints = 0
  faction.aiPlayers = [
    {
      id: LOW_RESOURCE_AI_PLAYER_ID,
      name: 'Low Resource Operator',
      factionId: FACTION_ID,
      unitIds: [],
      specialty: 'logistics',
    },
  ]
  faction.aiResourceAccounts = {
    [LOW_RESOURCE_AI_PLAYER_ID]: {
      aiPlayerId: LOW_RESOURCE_AI_PLAYER_ID,
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      resources: {
        food: 0,
        wood: 2,
        stone: 0,
        iron: 0,
      },
      updatedTick: world.tick,
    },
  }
  faction.governorResourceInboxes = {}

  const persistRoot = join(process.cwd(), 'tmp', `ai_player_failed_execution_subject_world_${process.pid}_${Date.now()}`)
  const path = join(persistRoot, 'world_snapshot.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { persistRoot }
}

function seedMissingCommanderAllianceWorld(): {
  persistRoot: string
  regionId: string
  secondaryRegionId: string
  missingCommanderId: string
  supportLevel: number
} {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding missing commander alliance contract`)
  faction.actionPoints = 3
  faction.aiPlayers = [
    {
      id: LOW_RESOURCE_AI_PLAYER_ID,
      name: 'Low Resource Operator',
      factionId: FACTION_ID,
      unitIds: [],
      specialty: 'logistics',
    },
  ]
  const directiveEntries = Object.values(world.alliance.directives)
  const directive = directiveEntries[0]
  assert.ok(directive, 'missing commander fixture should have a baseline alliance directive')
  const originalCommanderId = directive.assignedCommanderId
  const secondaryDirective = directiveEntries.find((candidate) => (
    candidate.regionId !== directive.regionId &&
    candidate.assignedCommanderId === originalCommanderId
  ))
  assert.ok(secondaryDirective, 'missing commander fixture should have two regions sharing one alliance commander')
  const missingCommanderId = `${originalCommanderId}_missing_for_subject`
  directive.assignedCommanderId = missingCommanderId
  secondaryDirective.assignedCommanderId = missingCommanderId
  world.alliance.commanders = world.alliance.commanders.filter((commander) => commander.id !== missingCommanderId)

  const persistRoot = join(process.cwd(), 'tmp', `ai_player_missing_commander_alliance_world_${process.pid}_${Date.now()}`)
  const path = join(persistRoot, 'world_snapshot.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    persistRoot,
    regionId: directive.regionId,
    secondaryRegionId: secondaryDirective.regionId,
    missingCommanderId,
    supportLevel: directive.supportLevel,
  }
}

async function bootFailedExecutionBackend(worldPersistRoot: string): Promise<AiPlayerHttpBackend> {
  const backend = await startAiPlayerHttpBackend(
    'ai_player_failed_execution_subject_contract',
    undefined,
    {
      WORLD_PERSIST_ROOT: worldPersistRoot,
    },
  )
  await joinGovernor(backend.baseUrl)
  const register = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId: LOW_RESOURCE_AI_PLAYER_ID,
    displayName: 'Low Resource Operator',
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    actionWhitelist: ['resource_transfer_to_governor', 'alliance_help'],
    budgetPolicy: {
      allowHighRiskActions: true,
    },
  })
  assert.equal(register.status, 200, `register low-resource AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

async function run() {
  const seeded = seedFailedExecutionWorld()
  const backend = await bootFailedExecutionBackend(seeded.persistRoot)
  try {
    const create = await requestJson(backend.baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: LOW_RESOURCE_AI_PLAYER_ID,
      action: 'resource_transfer_to_governor',
      source: 'human',
      reason: 'low-resource AI should leave a failed execution subject trace',
      args: {
        resources: {
          wood: 3,
        },
      },
    })
    assert.equal(create.status, 200, `create failed-execution proposal failed: ${JSON.stringify(create.data)}`)
    const proposal = readObject(readObject(create.data).proposal)
    const proposalId = String(proposal.proposalId)

    const approve = await requestJson(backend.baseUrl, `/api/ai/players/proposals/${proposalId}/approve`, 'POST', {
      approvedBy: GOVERNOR_PLAYER_ID,
    })
    assert.equal(approve.status, 200, `approve failed-execution proposal failed: ${JSON.stringify(approve.data)}`)

    const execute = await requestJson(backend.baseUrl, `/api/ai/players/proposals/${proposalId}/execute`, 'POST', {
      executedBy: GOVERNOR_PLAYER_ID,
      includeWorld: false,
    }, 60_000)
    assert.equal(execute.status, 200, `execute failed-execution proposal route failed: ${JSON.stringify(execute.data)}`)
    const executePayload = readObject(execute.data)
    assert.equal(executePayload.ok, true)
    const failedProposal = readObject(executePayload.proposal)
    assert.equal(failedProposal.status, 'failed')
    const receipt = readObject(executePayload.receipt)
    assert.equal(receipt.ok, false)
    assert.equal(receipt.failureCode, 'insufficient_resources')
    assert.equal(receipt.worldAction, 'transferFactionResourcesToGovernor')
    assert.equal(readObject(receipt.recoveryHint).focus, 'resources')

    const subjectResult = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${LOW_RESOURCE_AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(subjectResult.status, 200, `subject after failed execution failed: ${JSON.stringify(subjectResult.data)}`)
    const subject = readObject(readObject(subjectResult.data).subject)
    const bodyChangeItems = readArray(readObject(subject.recentBodyChanges).items).map((item) => readObject(item))
    const failedBodyChange = bodyChangeItems.find((item) => (
      item.proposalId === proposalId &&
      item.action === 'resource_transfer_to_governor'
    ))
    assert.ok(failedBodyChange, 'failed execution receipt must become a subject economy body change')
    assert.equal(failedBodyChange.bodyNode, 'resources_and_buildings')
    assert.equal(failedBodyChange.status, 'failed')
    assert.equal(failedBodyChange.failureCode, 'insufficient_resources')
    assert.equal(failedBodyChange.governorPlayerId, GOVERNOR_PLAYER_ID)
    assert.deepEqual(readObject(failedBodyChange.resourceDelta), { food: 0, wood: 3, stone: 0, iron: 0 })
    assert.deepEqual(readObject(failedBodyChange.accountBefore), { food: 0, wood: 2, stone: 0, iron: 0 })
    assert.deepEqual(readObject(failedBodyChange.accountAfter), { food: 0, wood: 2, stone: 0, iron: 0 })
    assert.equal(failedBodyChange.governanceApprovedBeforeExecution, true)
    assert.equal(failedBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
    assert.equal(failedBodyChange.executionReceiptAvailable, true)
    assert.equal(failedBodyChange.executionWorldAction, 'transferFactionResourcesToGovernor')
    assert.equal(failedBodyChange.executionFailureCode, 'insufficient_resources')
    assert.equal(failedBodyChange.executionRecoveryFocus, 'resources')
    assert.equal(failedBodyChange.nextSubjectFocus, 'economy')
    assert.equal(failedBodyChange.visibleToAi, true)
    assert.equal(failedBodyChange.historyAnchorAvailable, true)
    assert.equal(failedBodyChange.historyAnchorSourceVisibility, 'internal_link_only')
    assert.ok(String(failedBodyChange.historyAnchorWorldEventId ?? '').length > 0)

    const historyAnchorItems = readArray(readObject(subject.recentHistoryAnchors).items).map((item) => readObject(item))
    const failedHistoryAnchor = historyAnchorItems.find((item) => (
      item.proposalId === proposalId &&
      item.action === 'resource_transfer_to_governor'
    ))
    assert.ok(failedHistoryAnchor, 'failed execution subject body change must have a subject history anchor')
    assert.equal(failedHistoryAnchor.bodyNode, 'resources_and_buildings')
    assert.equal(failedHistoryAnchor.status, 'failed')
    assert.equal(failedHistoryAnchor.executionRecoveryFocus, 'resources')
    assert.equal(failedHistoryAnchor.executionRecoverySummary, failedBodyChange.executionRecoverySummary)
    assert.equal(failedHistoryAnchor.executionRecoveryRecommendedCommand, failedBodyChange.executionRecoveryRecommendedCommand)
    assert.equal(failedHistoryAnchor.nextSubjectFocus, 'economy')
    const sourceRefs = readObject(failedHistoryAnchor.sourceRefs)
    assert.equal(sourceRefs.visible, false)
    assert.equal(sourceRefs.visibility, 'internal_link_only')
    assert.equal(sourceRefs.proposalId, proposalId)

    const allianceDirective = Object.values(createInitialWorldState().alliance.directives)[0]
    assert.ok(allianceDirective, 'baseline world should have an alliance directive for failed alliance_help')
    const allianceCommander = createInitialWorldState().alliance.commanders.find(
      (candidate) => candidate.id === allianceDirective.assignedCommanderId,
    )
    assert.ok(allianceCommander, 'baseline world should have assigned alliance commander for failed alliance_help')

    const createAllianceHelp = await requestJson(backend.baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: LOW_RESOURCE_AI_PLAYER_ID,
      action: 'alliance_help',
      source: 'human',
      reason: 'low-action-point AI should leave a failed alliance help subject trace',
      args: {
        regionId: allianceDirective.regionId,
        sourceBattleReportId: 'failed_alliance_help_source_battle',
        sourceReplayRequestId: 'failed_alliance_help_source_replay',
        recommendedRecoveryCommand: 'wait_for_action_points_then_retry_alliance_help',
      },
    })
    assert.equal(createAllianceHelp.status, 200, `create failed alliance_help proposal failed: ${JSON.stringify(createAllianceHelp.data)}`)
    const allianceHelpProposal = readObject(readObject(createAllianceHelp.data).proposal)
    const allianceHelpProposalId = String(allianceHelpProposal.proposalId)

    const approveAllianceHelp = await requestJson(backend.baseUrl, `/api/ai/players/proposals/${allianceHelpProposalId}/approve`, 'POST', {
      approvedBy: GOVERNOR_PLAYER_ID,
    })
    assert.equal(approveAllianceHelp.status, 200, `approve failed alliance_help proposal failed: ${JSON.stringify(approveAllianceHelp.data)}`)

    const executeAllianceHelp = await requestJson(backend.baseUrl, `/api/ai/players/proposals/${allianceHelpProposalId}/execute`, 'POST', {
      executedBy: GOVERNOR_PLAYER_ID,
      includeWorld: false,
    }, 60_000)
    assert.equal(executeAllianceHelp.status, 200, `execute failed alliance_help proposal route failed: ${JSON.stringify(executeAllianceHelp.data)}`)
    const allianceHelpExecutePayload = readObject(executeAllianceHelp.data)
    assert.equal(allianceHelpExecutePayload.ok, true)
    const failedAllianceHelpProposal = readObject(allianceHelpExecutePayload.proposal)
    assert.equal(failedAllianceHelpProposal.status, 'failed')
    const allianceHelpReceipt = readObject(allianceHelpExecutePayload.receipt)
    assert.equal(allianceHelpReceipt.ok, false)
    assert.equal(allianceHelpReceipt.failureCode, 'insufficient_action_points')
    assert.equal(allianceHelpReceipt.worldAction, 'allianceHelp')
    assert.equal(Number(readObject(allianceHelpReceipt.execution).actionPointsRemaining), 0)

    const failedExecutionEvents = await requestJson(backend.baseUrl, '/api/events?limit=60', 'GET')
    assert.equal(failedExecutionEvents.status, 200, `events after failed alliance_help failed: ${JSON.stringify(failedExecutionEvents.data)}`)
    const failedExecutionEventItems = readArray(readObject(failedExecutionEvents.data).items ?? readObject(failedExecutionEvents.data).events).map((item) => readObject(item))
    const failedExecutionEvent = failedExecutionEventItems.find((item) => (
      item.action === 'ai_player_execute_proposal' &&
      item.success === false &&
      readObject(item.metadata).proposalId === allianceHelpProposalId
    ))
    assert.ok(failedExecutionEvent, 'failed alliance_help execution must emit a private AI activity producer event')
    const failedExecutionMetadata = readObject(readObject(failedExecutionEvent).metadata)
    assert.equal(failedExecutionMetadata.playerHistoryScope, 'private_ai')
    assert.equal(failedExecutionMetadata.playerHistorySharePolicy, 'not_shareable_private')
    assert.equal(typeof failedExecutionMetadata.playerHistoryDedupeKey, 'string')
    assert.match(String(failedExecutionMetadata.playerHistoryDedupeKey), /^ai-activity:proposal-execute-failed:/)
    const failedExecutionSourceRefs = readObject(failedExecutionMetadata.sourceRefs)
    assert.equal(failedExecutionSourceRefs.visible, false)
    assert.equal(failedExecutionSourceRefs.visibility, 'internal_link_only')
    assert.equal(failedExecutionSourceRefs.proposalId, allianceHelpProposalId)

    const subjectAfterAllianceHelpFailure = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${LOW_RESOURCE_AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(
      subjectAfterAllianceHelpFailure.status,
      200,
      `subject after failed alliance_help failed: ${JSON.stringify(subjectAfterAllianceHelpFailure.data)}`,
    )
    const subjectAfterAllianceHelp = readObject(readObject(subjectAfterAllianceHelpFailure.data).subject)
    const allianceBodyChangeItems = readArray(readObject(subjectAfterAllianceHelp.recentBodyChanges).items).map((item) => readObject(item))
    const failedAllianceHelpBodyChange = allianceBodyChangeItems.find((item) => (
      item.proposalId === allianceHelpProposalId &&
      item.action === 'alliance_help'
    ))
    assert.ok(failedAllianceHelpBodyChange, 'failed alliance_help receipt must become a subject war body change')
    assert.equal(failedAllianceHelpBodyChange.bodyNode, 'war_and_relations')
    assert.equal(failedAllianceHelpBodyChange.status, 'failed')
    assert.equal(failedAllianceHelpBodyChange.failureCode, 'insufficient_action_points')
    assert.equal(failedAllianceHelpBodyChange.regionId, allianceDirective.regionId)
    assert.equal(failedAllianceHelpBodyChange.allianceCommanderId, allianceDirective.assignedCommanderId)
    assert.equal(failedAllianceHelpBodyChange.allianceSupportLevel, allianceDirective.supportLevel)
    assert.equal(failedAllianceHelpBodyChange.allianceCommanderReadiness, allianceCommander.readiness)
    assert.equal(failedAllianceHelpBodyChange.sourceBattleReportId, 'failed_alliance_help_source_battle')
    assert.equal(failedAllianceHelpBodyChange.sourceReplayRequestId, 'failed_alliance_help_source_replay')
    assert.equal(failedAllianceHelpBodyChange.recommendedRecoveryCommand, 'wait_for_action_points_then_retry_alliance_help')
    assert.equal(failedAllianceHelpBodyChange.executionReceiptAvailable, true)
    assert.equal(failedAllianceHelpBodyChange.executionWorldAction, 'allianceHelp')
    assert.equal(failedAllianceHelpBodyChange.executionFailureCode, 'insufficient_action_points')
    assert.equal(failedAllianceHelpBodyChange.executionActionPointsRemaining, 0)
    assert.equal(failedAllianceHelpBodyChange.nextSubjectFocus, 'war')

    const allianceHistoryAnchorItems = readArray(readObject(subjectAfterAllianceHelp.recentHistoryAnchors).items).map((item) => readObject(item))
    const failedAllianceHelpHistoryAnchor = allianceHistoryAnchorItems.find((item) => (
      item.proposalId === allianceHelpProposalId &&
      item.action === 'alliance_help'
    ))
    assert.ok(failedAllianceHelpHistoryAnchor, 'failed alliance_help subject body change must have a subject history anchor')
    assert.equal(failedAllianceHelpHistoryAnchor.bodyNode, 'war_and_relations')
    assert.equal(failedAllianceHelpHistoryAnchor.status, 'failed')
    assert.equal(failedAllianceHelpHistoryAnchor.failureCode, 'insufficient_action_points')
    assert.equal(failedAllianceHelpHistoryAnchor.regionId, allianceDirective.regionId)
    assert.equal(failedAllianceHelpHistoryAnchor.allianceCommanderId, allianceDirective.assignedCommanderId)
    assert.equal(failedAllianceHelpHistoryAnchor.allianceSupportLevel, allianceDirective.supportLevel)
    assert.equal(failedAllianceHelpHistoryAnchor.allianceCommanderReadiness, allianceCommander.readiness)
    assert.equal(failedAllianceHelpHistoryAnchor.executionActionPointsRemaining, 0)
    assert.equal(failedAllianceHelpHistoryAnchor.nextSubjectFocus, 'war')
    const allianceHelpSourceRefs = readObject(failedAllianceHelpHistoryAnchor.sourceRefs)
    assert.equal(allianceHelpSourceRefs.sourceBattleReportId, 'failed_alliance_help_source_battle')
    assert.equal(allianceHelpSourceRefs.sourceReplayRequestId, 'failed_alliance_help_source_replay')
    assert.equal(allianceHelpSourceRefs.recommendedRecoveryCommand, 'wait_for_action_points_then_retry_alliance_help')

    const missingRegionId = 'region_missing_for_failed_alliance_help_subject'
    const createMissingRegionAllianceHelp = await requestJson(backend.baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: LOW_RESOURCE_AI_PLAYER_ID,
      action: 'alliance_help',
      source: 'human',
      reason: 'missing alliance region should leave a failed preflight subject trace',
      args: {
        regionId: missingRegionId,
        sourceBattleReportId: 'missing_region_alliance_help_source_battle',
        sourceReplayRequestId: 'missing_region_alliance_help_source_replay',
        recommendedRecoveryCommand: 'select_valid_alliance_region_then_retry',
      },
    })
    assert.equal(
      createMissingRegionAllianceHelp.status,
      200,
      `create missing-region alliance_help proposal failed: ${JSON.stringify(createMissingRegionAllianceHelp.data)}`,
    )
    const missingRegionAllianceHelpProposal = readObject(readObject(createMissingRegionAllianceHelp.data).proposal)
    const missingRegionAllianceHelpProposalId = String(missingRegionAllianceHelpProposal.proposalId)

    const approveMissingRegionAllianceHelp = await requestJson(
      backend.baseUrl,
      `/api/ai/players/proposals/${missingRegionAllianceHelpProposalId}/approve`,
      'POST',
      { approvedBy: GOVERNOR_PLAYER_ID },
    )
    assert.equal(
      approveMissingRegionAllianceHelp.status,
      200,
      `approve missing-region alliance_help proposal failed: ${JSON.stringify(approveMissingRegionAllianceHelp.data)}`,
    )

    const executeMissingRegionAllianceHelp = await requestJson(
      backend.baseUrl,
      `/api/ai/players/proposals/${missingRegionAllianceHelpProposalId}/execute`,
      'POST',
      {
        executedBy: GOVERNOR_PLAYER_ID,
        includeWorld: false,
      },
      60_000,
    )
    assert.equal(
      executeMissingRegionAllianceHelp.status,
      400,
      `execute missing-region alliance_help should fail preflight: ${JSON.stringify(executeMissingRegionAllianceHelp.data)}`,
    )
    const missingRegionPayload = readObject(executeMissingRegionAllianceHelp.data)
    assert.equal(missingRegionPayload.ok, false)
    assert.equal(missingRegionPayload.failureCode, 'proposal_execution_failed')
    assert.match(String(missingRegionPayload.error), /no alliance help target found/)
    assert.equal(readObject(missingRegionPayload.proposal).status, 'failed')

    const subjectAfterMissingRegionFailure = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${LOW_RESOURCE_AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(
      subjectAfterMissingRegionFailure.status,
      200,
      `subject after missing-region alliance_help failed: ${JSON.stringify(subjectAfterMissingRegionFailure.data)}`,
    )
    const subjectAfterMissingRegion = readObject(readObject(subjectAfterMissingRegionFailure.data).subject)
    const missingRegionBodyItems = readArray(readObject(subjectAfterMissingRegion.recentBodyChanges).items).map((item) => readObject(item))
    const missingRegionBodyChange = missingRegionBodyItems.find((item) => (
      item.proposalId === missingRegionAllianceHelpProposalId &&
      item.action === 'alliance_help'
    ))
    assert.ok(missingRegionBodyChange, 'missing-region alliance_help preflight failure must become subject governance memory')
    assert.equal(missingRegionBodyChange.bodyNode, 'human_command_and_obedience')
    assert.equal(missingRegionBodyChange.status, 'failed')
    assert.equal(missingRegionBodyChange.failureCode, 'proposal_execution_failed')
    assert.equal(missingRegionBodyChange.regionId, missingRegionId)
    assert.equal(missingRegionBodyChange.governanceAttemptedWorldAction, 'allianceHelp')
    assert.match(String(missingRegionBodyChange.governanceFailureDetail), /no alliance help target found/)
    assert.equal(missingRegionBodyChange.sourceBattleReportId, 'missing_region_alliance_help_source_battle')
    assert.equal(missingRegionBodyChange.sourceReplayRequestId, 'missing_region_alliance_help_source_replay')
    assert.equal(missingRegionBodyChange.recommendedRecoveryCommand, 'select_valid_alliance_region_then_retry')
    assert.equal(missingRegionBodyChange.executionReceiptAvailable, false)
    assert.equal(missingRegionBodyChange.nextSubjectFocus, 'governance')

    const missingRegionHistoryItems = readArray(readObject(subjectAfterMissingRegion.recentHistoryAnchors).items).map((item) => readObject(item))
    const missingRegionHistoryAnchor = missingRegionHistoryItems.find((item) => (
      item.proposalId === missingRegionAllianceHelpProposalId &&
      item.action === 'alliance_help'
    ))
    assert.ok(missingRegionHistoryAnchor, 'missing-region alliance_help governance memory must be linked to history')
    assert.equal(missingRegionHistoryAnchor.bodyNode, 'human_command_and_obedience')
    assert.equal(missingRegionHistoryAnchor.status, 'failed')
    assert.equal(missingRegionHistoryAnchor.failureCode, 'proposal_execution_failed')
    assert.equal(missingRegionHistoryAnchor.regionId, missingRegionId)
    assert.equal(missingRegionHistoryAnchor.governanceAttemptedWorldAction, 'allianceHelp')
    assert.match(String(missingRegionHistoryAnchor.governanceFailureDetail), /no alliance help target found/)
    assert.equal(missingRegionHistoryAnchor.nextSubjectFocus, 'governance')
    const missingRegionSourceRefs = readObject(missingRegionHistoryAnchor.sourceRefs)
    assert.equal(missingRegionSourceRefs.sourceBattleReportId, 'missing_region_alliance_help_source_battle')
    assert.equal(missingRegionSourceRefs.sourceReplayRequestId, 'missing_region_alliance_help_source_replay')
    assert.equal(missingRegionSourceRefs.recommendedRecoveryCommand, 'select_valid_alliance_region_then_retry')

    const missingCommanderSeed = seedMissingCommanderAllianceWorld()
    const missingCommanderBackend = await bootFailedExecutionBackend(missingCommanderSeed.persistRoot)
    try {
      const createMissingCommanderAllianceHelp = await requestJson(missingCommanderBackend.baseUrl, '/api/ai/players/proposals', 'POST', {
        aiPlayerId: LOW_RESOURCE_AI_PLAYER_ID,
        action: 'alliance_help',
        source: 'human',
        reason: 'missing alliance commander should leave a failed preflight subject trace',
        args: {
          regionId: missingCommanderSeed.regionId,
          sourceBattleReportId: 'missing_commander_alliance_help_source_battle',
          sourceReplayRequestId: 'missing_commander_alliance_help_source_replay',
          recommendedRecoveryCommand: 'repair_alliance_commander_assignment_then_retry',
        },
      })
      assert.equal(
        createMissingCommanderAllianceHelp.status,
        200,
        `create missing-commander alliance_help proposal failed: ${JSON.stringify(createMissingCommanderAllianceHelp.data)}`,
      )
      const missingCommanderAllianceHelpProposal = readObject(readObject(createMissingCommanderAllianceHelp.data).proposal)
      const missingCommanderAllianceHelpProposalId = String(missingCommanderAllianceHelpProposal.proposalId)

      const approveMissingCommanderAllianceHelp = await requestJson(
        missingCommanderBackend.baseUrl,
        `/api/ai/players/proposals/${missingCommanderAllianceHelpProposalId}/approve`,
        'POST',
        { approvedBy: GOVERNOR_PLAYER_ID },
      )
      assert.equal(
        approveMissingCommanderAllianceHelp.status,
        200,
        `approve missing-commander alliance_help proposal failed: ${JSON.stringify(approveMissingCommanderAllianceHelp.data)}`,
      )

      const executeMissingCommanderAllianceHelp = await requestJson(
        missingCommanderBackend.baseUrl,
        `/api/ai/players/proposals/${missingCommanderAllianceHelpProposalId}/execute`,
        'POST',
        {
          executedBy: GOVERNOR_PLAYER_ID,
          includeWorld: false,
        },
        60_000,
      )
      assert.equal(
        executeMissingCommanderAllianceHelp.status,
        400,
        `execute missing-commander alliance_help should fail preflight: ${JSON.stringify(executeMissingCommanderAllianceHelp.data)}`,
      )
      const missingCommanderPayload = readObject(executeMissingCommanderAllianceHelp.data)
      assert.equal(missingCommanderPayload.ok, false)
      assert.equal(missingCommanderPayload.failureCode, 'proposal_execution_failed')
      assert.match(String(missingCommanderPayload.error), /no alliance help target found/)

      const missingCommanderSubjectResult = await requestJson(
        missingCommanderBackend.baseUrl,
        `/api/ai/players/${LOW_RESOURCE_AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
        'GET',
        undefined,
        60_000,
      )
      assert.equal(
        missingCommanderSubjectResult.status,
        200,
        `subject after missing-commander alliance_help failed: ${JSON.stringify(missingCommanderSubjectResult.data)}`,
      )
      const missingCommanderSubject = readObject(readObject(missingCommanderSubjectResult.data).subject)
      const missingCommanderBodyItems = readArray(readObject(missingCommanderSubject.recentBodyChanges).items).map((item) => readObject(item))
      const missingCommanderBodyChange = missingCommanderBodyItems.find((item) => (
        item.proposalId === missingCommanderAllianceHelpProposalId &&
        item.action === 'alliance_help'
      ))
      assert.ok(missingCommanderBodyChange, 'missing-commander alliance_help preflight failure must become subject governance memory')
      assert.equal(missingCommanderBodyChange.bodyNode, 'human_command_and_obedience')
      assert.equal(missingCommanderBodyChange.status, 'failed')
      assert.equal(missingCommanderBodyChange.failureCode, 'proposal_execution_failed')
      assert.equal(missingCommanderBodyChange.regionId, missingCommanderSeed.regionId)
      assert.equal(missingCommanderBodyChange.allianceCommanderId, missingCommanderSeed.missingCommanderId)
      assert.equal(missingCommanderBodyChange.allianceSupportLevel, missingCommanderSeed.supportLevel)
      assert.equal(missingCommanderBodyChange.allianceCommanderMissing, true)
      assert.equal(missingCommanderBodyChange.governanceAttemptedWorldAction, 'allianceHelp')
      assert.match(String(missingCommanderBodyChange.governanceFailureDetail), /no alliance help target found/)
      assert.equal(missingCommanderBodyChange.sourceBattleReportId, 'missing_commander_alliance_help_source_battle')
      assert.equal(missingCommanderBodyChange.sourceReplayRequestId, 'missing_commander_alliance_help_source_replay')
      assert.equal(missingCommanderBodyChange.recommendedRecoveryCommand, 'repair_alliance_commander_assignment_then_retry')
      assert.equal(missingCommanderBodyChange.executionReceiptAvailable, false)
      assert.equal(missingCommanderBodyChange.nextSubjectFocus, 'governance')

      const missingCommanderHistoryItems = readArray(readObject(missingCommanderSubject.recentHistoryAnchors).items).map((item) => readObject(item))
      const missingCommanderHistoryAnchor = missingCommanderHistoryItems.find((item) => (
        item.proposalId === missingCommanderAllianceHelpProposalId &&
        item.action === 'alliance_help'
      ))
      assert.ok(missingCommanderHistoryAnchor, 'missing-commander alliance_help governance memory must be linked to history')
      assert.equal(missingCommanderHistoryAnchor.bodyNode, 'human_command_and_obedience')
      assert.equal(missingCommanderHistoryAnchor.status, 'failed')
      assert.equal(missingCommanderHistoryAnchor.failureCode, 'proposal_execution_failed')
      assert.equal(missingCommanderHistoryAnchor.regionId, missingCommanderSeed.regionId)
      assert.equal(missingCommanderHistoryAnchor.allianceCommanderId, missingCommanderSeed.missingCommanderId)
      assert.equal(missingCommanderHistoryAnchor.allianceSupportLevel, missingCommanderSeed.supportLevel)
      assert.equal(missingCommanderHistoryAnchor.allianceCommanderMissing, true)
      assert.equal(missingCommanderHistoryAnchor.governanceAttemptedWorldAction, 'allianceHelp')
      assert.match(String(missingCommanderHistoryAnchor.governanceFailureDetail), /no alliance help target found/)
      assert.equal(missingCommanderHistoryAnchor.nextSubjectFocus, 'governance')
      const missingCommanderSourceRefs = readObject(missingCommanderHistoryAnchor.sourceRefs)
      assert.equal(missingCommanderSourceRefs.sourceBattleReportId, 'missing_commander_alliance_help_source_battle')
      assert.equal(missingCommanderSourceRefs.sourceReplayRequestId, 'missing_commander_alliance_help_source_replay')
      assert.equal(missingCommanderSourceRefs.recommendedRecoveryCommand, 'repair_alliance_commander_assignment_then_retry')

      const createSecondMissingCommanderAllianceHelp = await requestJson(missingCommanderBackend.baseUrl, '/api/ai/players/proposals', 'POST', {
        aiPlayerId: LOW_RESOURCE_AI_PLAYER_ID,
        action: 'alliance_help',
        source: 'human',
        reason: 'second missing alliance commander region should not be deduped away',
        args: {
          regionId: missingCommanderSeed.secondaryRegionId,
          sourceBattleReportId: 'missing_commander_alliance_help_second_region_source_battle',
          sourceReplayRequestId: 'missing_commander_alliance_help_second_region_source_replay',
          recommendedRecoveryCommand: 'repair_alliance_commander_assignment_then_retry',
        },
      })
      assert.equal(
        createSecondMissingCommanderAllianceHelp.status,
        200,
        `create second missing-commander alliance_help proposal failed: ${JSON.stringify(createSecondMissingCommanderAllianceHelp.data)}`,
      )
      const secondMissingCommanderAllianceHelpProposal = readObject(readObject(createSecondMissingCommanderAllianceHelp.data).proposal)
      const secondMissingCommanderAllianceHelpProposalId = String(secondMissingCommanderAllianceHelpProposal.proposalId)

      const approveSecondMissingCommanderAllianceHelp = await requestJson(
        missingCommanderBackend.baseUrl,
        `/api/ai/players/proposals/${secondMissingCommanderAllianceHelpProposalId}/approve`,
        'POST',
        { approvedBy: GOVERNOR_PLAYER_ID },
      )
      assert.equal(
        approveSecondMissingCommanderAllianceHelp.status,
        200,
        `approve second missing-commander alliance_help proposal failed: ${JSON.stringify(approveSecondMissingCommanderAllianceHelp.data)}`,
      )

      const executeSecondMissingCommanderAllianceHelp = await requestJson(
        missingCommanderBackend.baseUrl,
        `/api/ai/players/proposals/${secondMissingCommanderAllianceHelpProposalId}/execute`,
        'POST',
        {
          executedBy: GOVERNOR_PLAYER_ID,
          includeWorld: false,
        },
        60_000,
      )
      assert.equal(
        executeSecondMissingCommanderAllianceHelp.status,
        400,
        `execute second missing-commander alliance_help should fail preflight: ${JSON.stringify(executeSecondMissingCommanderAllianceHelp.data)}`,
      )

      const missingCommanderObservationResult = await requestJson(
        missingCommanderBackend.baseUrl,
        `/api/ai/players/${LOW_RESOURCE_AI_PLAYER_ID}/autonomous-development/observation?goalPower=4000`,
        'GET',
        undefined,
        60_000,
      )
      assert.equal(
        missingCommanderObservationResult.status,
        200,
        `autonomous observation after missing-commander alliance_help failed: ${JSON.stringify(missingCommanderObservationResult.data)}`,
      )
      const missingCommanderObservation = readObject(readObject(missingCommanderObservationResult.data).observation)
      const missingCommanderRecoveryCommands = readArray(missingCommanderObservation.subjectRecoveryCommands).map((item) => readObject(item))
      const missingCommanderGovernanceRecoveryCommand = missingCommanderRecoveryCommands.find((item) => (
        item.action === 'alliance_help' &&
        item.bodyNode === 'human_command_and_obedience' &&
        item.recommendedRecoveryCommand === 'repair_alliance_commander_assignment_then_retry'
      ))
      assert.ok(
        missingCommanderGovernanceRecoveryCommand,
        'missing-commander alliance_help governance memory must enter autonomous subjectRecoveryCommands',
      )
      assert.equal(missingCommanderGovernanceRecoveryCommand.status, 'failed')
      assert.equal(missingCommanderGovernanceRecoveryCommand.governanceAttemptedWorldAction, 'allianceHelp')
      assert.match(String(missingCommanderGovernanceRecoveryCommand.governanceFailureDetail), /no alliance help target found/)
      assert.equal(missingCommanderGovernanceRecoveryCommand.allianceCommanderId, missingCommanderSeed.missingCommanderId)
      assert.equal(missingCommanderGovernanceRecoveryCommand.allianceCommanderMissing, true)
      assert.equal(missingCommanderGovernanceRecoveryCommand.nextSubjectFocus, 'governance')
      assert.ok(
        [missingCommanderSeed.regionId, missingCommanderSeed.secondaryRegionId].includes(String(missingCommanderGovernanceRecoveryCommand.regionId)),
        'missing-commander governance recovery command must preserve one selected regionId',
      )
      const missingCommanderRegionRecoveryCommands = missingCommanderRecoveryCommands.filter((item) => (
        item.action === 'alliance_help' &&
        item.bodyNode === 'human_command_and_obedience' &&
        item.recommendedRecoveryCommand === 'repair_alliance_commander_assignment_then_retry' &&
        item.governanceAttemptedWorldAction === 'allianceHelp' &&
        item.allianceCommanderId === missingCommanderSeed.missingCommanderId
      ))
      assert.deepEqual(
        missingCommanderRegionRecoveryCommands.map((item) => item.regionId).sort(),
        [missingCommanderSeed.regionId, missingCommanderSeed.secondaryRegionId].sort(),
        'autonomous observation must keep separate governance recovery packets per regionId',
      )

      const missingCommanderAutonomousRunResult = await requestJson(
        missingCommanderBackend.baseUrl,
        `/api/ai/players/${LOW_RESOURCE_AI_PLAYER_ID}/autonomous-development/run`,
        'POST',
        {
          maxSteps: 1,
          goalPower: 4000,
          triggeredBy: 'missing_commander_governance_recovery_gate',
        },
        60_000,
      )
      assert.equal(
        missingCommanderAutonomousRunResult.status,
        200,
        `autonomous run after missing-commander alliance_help failed: ${JSON.stringify(missingCommanderAutonomousRunResult.data)}`,
      )
      const missingCommanderAutonomousRun = readObject(readObject(missingCommanderAutonomousRunResult.data).run)
      assert.equal(missingCommanderAutonomousRun.stepCount, 1)
      const missingCommanderAutonomousStep = readObject(readArray(missingCommanderAutonomousRun.steps)[0])
      assert.equal(
        missingCommanderAutonomousStep.selectedAction,
        'activity_window_enter',
        'autonomous run should consume missing-commander governance memory as read-only recovery',
      )
      const missingCommanderAutonomousDecision = readObject(missingCommanderAutonomousStep.plannerDecision)
      const missingCommanderAutonomousDecisionArgs = readObject(missingCommanderAutonomousDecision.args)
      assert.equal(missingCommanderAutonomousDecisionArgs.executionMode, 'read_model_only')
      assert.equal(missingCommanderAutonomousDecisionArgs.readOnlyRecovery, true)
      assert.equal(missingCommanderAutonomousDecisionArgs.nextSubjectFocus, 'governance')
      assert.equal(missingCommanderAutonomousDecisionArgs.governanceAttemptedWorldAction, 'allianceHelp')
      assert.equal(missingCommanderAutonomousDecisionArgs.allianceCommanderMissing, true)
      assert.ok(
        [missingCommanderSeed.regionId, missingCommanderSeed.secondaryRegionId].includes(String(missingCommanderAutonomousDecisionArgs.regionId)),
        'read-only governance decision args must preserve selected regionId',
      )
      const missingCommanderAutonomousReceipt = readObject(missingCommanderAutonomousStep.receipt)
      assert.equal(missingCommanderAutonomousReceipt.ok, true)
      assert.equal(missingCommanderAutonomousReceipt.action, 'activity_window_enter')
      assert.equal(missingCommanderAutonomousReceipt.worldAction, null)
      assert.equal(missingCommanderAutonomousReceipt.actionRequestId, null)
      const missingCommanderAutonomousExecution = readObject(missingCommanderAutonomousReceipt.execution)
      assert.equal(missingCommanderAutonomousExecution.kind, 'autonomous_read_only_recovery')
      assert.equal(missingCommanderAutonomousExecution.recommendedRecoveryCommand, 'repair_alliance_commander_assignment_then_retry')
      assert.equal(missingCommanderAutonomousExecution.nextSubjectFocus, 'governance')
      assert.equal(missingCommanderAutonomousExecution.governanceAttemptedWorldAction, 'allianceHelp')
      assert.equal(missingCommanderAutonomousExecution.allianceCommanderId, missingCommanderSeed.missingCommanderId)
      assert.equal(missingCommanderAutonomousExecution.allianceCommanderMissing, true)
      assert.equal(missingCommanderAutonomousExecution.regionId, missingCommanderAutonomousDecisionArgs.regionId)

      const missingCommanderSubjectAfterRunResult = await requestJson(
        missingCommanderBackend.baseUrl,
        `/api/ai/players/${LOW_RESOURCE_AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
        'GET',
        undefined,
        60_000,
      )
      assert.equal(
        missingCommanderSubjectAfterRunResult.status,
        200,
        `subject after missing-commander autonomous governance recovery failed: ${JSON.stringify(missingCommanderSubjectAfterRunResult.data)}`,
      )
      const missingCommanderSubjectAfterRun = readObject(readObject(missingCommanderSubjectAfterRunResult.data).subject)
      const missingCommanderBodyItemsAfterRun = readArray(readObject(missingCommanderSubjectAfterRun.recentBodyChanges).items).map((item) => readObject(item))
      const missingCommanderReadOnlyGovernanceBodyChange = missingCommanderBodyItemsAfterRun.find((item) => (
        item.proposalId === missingCommanderAutonomousReceipt.proposalId &&
        item.action === 'activity_window_enter'
      ))
      assert.ok(
        missingCommanderReadOnlyGovernanceBodyChange,
        'read-only governance recovery receipt must become subject memory for the next cycle',
      )
      assert.equal(missingCommanderReadOnlyGovernanceBodyChange.bodyNode, 'chat_report_history')
      assert.equal(missingCommanderReadOnlyGovernanceBodyChange.status, 'completed')
      assert.equal(missingCommanderReadOnlyGovernanceBodyChange.recommendedRecoveryCommand, 'repair_alliance_commander_assignment_then_retry')
      assert.equal(missingCommanderReadOnlyGovernanceBodyChange.nextSubjectFocus, 'governance')
      assert.equal(missingCommanderReadOnlyGovernanceBodyChange.governanceAttemptedWorldAction, 'allianceHelp')
      assert.match(String(missingCommanderReadOnlyGovernanceBodyChange.governanceFailureDetail), /no alliance help target found/)
      assert.equal(missingCommanderReadOnlyGovernanceBodyChange.allianceCommanderId, missingCommanderSeed.missingCommanderId)
      assert.equal(missingCommanderReadOnlyGovernanceBodyChange.allianceCommanderMissing, true)
      assert.equal(missingCommanderReadOnlyGovernanceBodyChange.regionId, missingCommanderAutonomousDecisionArgs.regionId)
      assert.equal(missingCommanderReadOnlyGovernanceBodyChange.executionReceiptAvailable, true)
      assert.equal(missingCommanderReadOnlyGovernanceBodyChange.executionWorldAction, null)
    } finally {
      await missingCommanderBackend.stop()
    }

    console.log('[ai_player_failed_execution_subject_contract] all checks passed')
  } finally {
    await backend.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_failed_execution_subject_contract] failed:', error)
  process.exitCode = 1
})
