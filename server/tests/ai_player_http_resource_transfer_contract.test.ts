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

function seedWorldStateWithAiResourceAccount(): string {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding AI player resource transfer shard`)

  faction.aiResourceAccounts = {
    [AI_PLAYER_ID]: {
      aiPlayerId: AI_PLAYER_ID,
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      resources: {
        food: 90,
        wood: 70,
        stone: 50,
        iron: 30,
      },
      updatedTick: world.tick,
    },
  }

  const path = buildSessionPersistPath('ai_player_http_resource_transfer_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return path
}

async function bootResourceTransferBackend(worldPersistPath: string): Promise<AiPlayerHttpBackend> {
  const backend = await startAiPlayerHttpBackend(
    'ai_player_http_resource_transfer_contract',
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
    actionWhitelist: ['resource_transfer_to_governor'],
    budgetPolicy: {
      allowHighRiskActions: true,
    },
  })
  assert.equal(register.status, 200, `register transfer AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

async function run() {
  const worldPersistPath = seedWorldStateWithAiResourceAccount()
  const backend = await bootResourceTransferBackend(worldPersistPath)
  try {
    const catalog = await requestJson(backend.baseUrl, '/api/ai/player-actions/catalog', 'GET')
    assert.equal(catalog.status, 200)
    const transferEntry = readArray(readObject(catalog.data).catalog)
      .map((item) => readObject(item))
      .find((item) => item.action === 'resource_transfer_to_governor')
    assert.ok(transferEntry, 'catalog should expose resource_transfer_to_governor')
    assert.equal(transferEntry.riskLevel, 'high')
    assert.equal(transferEntry.requiresApprovalByDefault, true)
    assert.equal(transferEntry.mappedWorldAction, 'transferFactionResourcesToGovernor')

    const setPolicy = await requestJson(backend.baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'setAiResourceTransferPolicy',
      payload: {
        factionId: FACTION_ID,
        dailyQuotaTotal: 25,
        dailyWindowTicks: 12,
        cooldownTicks: 2,
      },
    })
    assert.equal(setPolicy.status, 200, `set transfer policy failed: ${JSON.stringify(setPolicy.data)}`)
    assert.equal(readObject(setPolicy.data).ok, true)

    const runtimeWithPolicy = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}`, 'GET')
    assert.equal(runtimeWithPolicy.status, 200, `runtime policy read failed: ${JSON.stringify(runtimeWithPolicy.data)}`)
    const resourceTransferBefore = readObject(readObject(runtimeWithPolicy.data).resourceTransfer)
    assert.deepEqual(
      readObject(resourceTransferBefore.configuredPolicy),
      {
        dailyQuotaTotal: 25,
        dailyWindowTicks: 12,
        cooldownTicks: 2,
      },
      'runtime read model should expose configured resource transfer policy',
    )
    assert.deepEqual(
      readObject(resourceTransferBefore.effectivePolicy),
      {
        dailyQuotaTotal: 25,
        dailyWindowTicks: 12,
        cooldownTicks: 2,
      },
      'runtime read model should expose effective resource transfer policy',
    )
    assert.equal(resourceTransferBefore.remainingQuotaTotal, 25)
    assert.equal(resourceTransferBefore.cooldownRemainingTicks, 0)
    assert.equal(resourceTransferBefore.canTransferNow, true)
    assert.equal(resourceTransferBefore.blockedBy, null)

    const invalidArgs = await requestJson(backend.baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      action: 'resource_transfer_to_governor',
      source: 'mcp',
      reason: 'invalid transfer args should be rejected',
      args: {
        resources: {
          food: 0,
        },
      },
    })
    assert.equal(invalidArgs.status, 422, 'resource_transfer_to_governor should reject non-positive resources')

    const create = await requestJson(backend.baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      action: 'resource_transfer_to_governor',
      source: 'mcp',
      reason: 'high-risk transfer must wait for governor approval',
      args: {
        resources: {
          food: 11,
        },
      },
    })
    assert.equal(create.status, 200, `create transfer proposal failed: ${JSON.stringify(create.data)}`)
    const createdProposal = readObject(readObject(create.data).proposal)
    assert.equal(createdProposal.status, 'pending_approval')
    assert.equal(createdProposal.requiresApproval, true)
    assert.equal(createdProposal.riskLevel, 'high')

    const unauthorizedCreate = await requestJson(backend.baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      action: 'resource_transfer_to_governor',
      source: 'mcp',
      reason: 'non-governor approval should fail in world authority',
      args: {
        resources: {
          wood: 9,
        },
      },
    })
    assert.equal(
      unauthorizedCreate.status,
      200,
      `create unauthorized transfer proposal failed: ${JSON.stringify(unauthorizedCreate.data)}`,
    )
    const unauthorizedProposal = readObject(readObject(unauthorizedCreate.data).proposal)
    const unauthorizedProposalId = String(unauthorizedProposal.proposalId)
    const unauthorizedApprove = await requestJson(
      backend.baseUrl,
      `/api/ai/players/proposals/${unauthorizedProposalId}/approve`,
      'POST',
      {
        approvedBy: 'not_the_governor',
      },
    )
    assert.equal(
      unauthorizedApprove.status,
      200,
      `approve unauthorized transfer proposal failed: ${JSON.stringify(unauthorizedApprove.data)}`,
    )
    const unauthorizedExecute = await requestJson(
      backend.baseUrl,
      `/api/ai/players/proposals/${unauthorizedProposalId}/execute`,
      'POST',
      {
        executedBy: 'not_the_governor',
        includeWorld: false,
      },
    )
    assert.equal(
      unauthorizedExecute.status,
      200,
      `execute unauthorized transfer proposal failed: ${JSON.stringify(unauthorizedExecute.data)}`,
    )
    const unauthorizedReceipt = readObject(readObject(unauthorizedExecute.data).receipt)
    assert.equal(unauthorizedReceipt.ok, false)
    assert.equal(unauthorizedReceipt.worldAction, 'transferFactionResourcesToGovernor')
    assert.equal(unauthorizedReceipt.failureCode, 'approval_required')
    assert.ok(readObject(unauthorizedReceipt.worldActionPayload).approvedBy === 'not_the_governor')
    assert.ok(readObject(unauthorizedReceipt.execution), 'failed transfer receipt should include execution')

    const worldAfterUnauthorized = await loadWorldState(backend.baseUrl)
    const accountAfterUnauthorized = worldAfterUnauthorized.factions[FACTION_ID]?.aiResourceAccounts?.[AI_PLAYER_ID]
    assert.ok(accountAfterUnauthorized, 'AI subaccount should remain after rejected approval')
    assert.equal(accountAfterUnauthorized.resources.wood, 70, 'unauthorized approval must not debit AI subaccount')
    assert.equal(
      worldAfterUnauthorized.factions[FACTION_ID]?.governorResourceInboxes?.[GOVERNOR_PLAYER_ID],
      undefined,
      'unauthorized approval must not create governor pending inbox',
    )

    const { receipt } = await createApproveExecuteProposal(
      backend.baseUrl,
      'resource_transfer_to_governor',
      {
        resources: {
          food: 11,
          iron: 7,
        },
      },
      'AI player resource transfer shard success',
    )
    assertSuccessfulReceipt('resource_transfer_to_governor', receipt, 'transferFactionResourcesToGovernor')
    assert.ok(readObject(receipt.worldActionPayload).approvedBy === GOVERNOR_PLAYER_ID)
    assert.ok(readObject(receipt.execution), 'resource transfer receipt should include execution')

    const worldAfter = await loadWorldState(backend.baseUrl)
    const accountAfter = worldAfter.factions[FACTION_ID]?.aiResourceAccounts?.[AI_PLAYER_ID]
    assert.ok(accountAfter, 'AI subaccount should remain after transfer')
    assert.equal(accountAfter.resources.food, 79)
    assert.equal(accountAfter.resources.iron, 23)
    const inbox = worldAfter.factions[FACTION_ID]?.governorResourceInboxes?.[GOVERNOR_PLAYER_ID]
    assert.ok(inbox, 'governor pending resource inbox should exist after AI transfer')
    assert.equal(inbox.pendingTransfers.length, 1)
    assert.equal(inbox.totalPendingResources.food, 11)
    assert.equal(inbox.totalPendingResources.iron, 7)

    const runtimeAfterTransfer = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}`, 'GET')
    assert.equal(runtimeAfterTransfer.status, 200, `runtime quota read failed: ${JSON.stringify(runtimeAfterTransfer.data)}`)
    const resourceTransferAfter = readObject(readObject(runtimeAfterTransfer.data).resourceTransfer)
    assert.equal(resourceTransferAfter.remainingQuotaTotal, 7)
    assert.equal(resourceTransferAfter.cooldownRemainingTicks, 2)
    assert.equal(resourceTransferAfter.windowRemainingTicks, 12)
    assert.equal(resourceTransferAfter.canTransferNow, false)
    assert.equal(resourceTransferAfter.blockedBy, 'transfer_cooldown_active')
    const quotaAfterTransfer = readObject(resourceTransferAfter.quota)
    assert.equal(quotaAfterTransfer.transferredTotal, 18)
    assert.equal(quotaAfterTransfer.dailyQuotaTotal, 25)

    const subjectAfterTransfer = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(subjectAfterTransfer.status, 200, `subject after resource transfer failed: ${JSON.stringify(subjectAfterTransfer.data)}`)
    const transferSubject = readObject(readObject(subjectAfterTransfer.data).subject)
    const subjectEconomy = readObject(transferSubject.economy)
    const pendingGovernorTransfers = readObject(subjectEconomy.pendingGovernorTransfers)
    assert.equal(
      pendingGovernorTransfers.governorPlayerId,
      GOVERNOR_PLAYER_ID,
      'subject economy should identify the governor inbox that holds AI transfers',
    )
    assert.equal(
      pendingGovernorTransfers.count,
      1,
      'subject economy should count pending governor transfers from this AI player',
    )
    assert.deepEqual(
      readObject(pendingGovernorTransfers.totalPendingResources),
      {
        food: 11,
        wood: 0,
        stone: 0,
        iron: 7,
      },
      'subject economy should expose pending governor inbox resources from this AI player',
    )
    const pendingGovernorTransferItems = readArray(pendingGovernorTransfers.items).map((item) => readObject(item))
    const pendingTransfer = pendingGovernorTransferItems.find((item) => item.sourceAiPlayerId === AI_PLAYER_ID)
    assert.ok(pendingTransfer, 'subject economy should list the pending transfer from this AI player')
    assert.equal(pendingTransfer.governorPlayerId, GOVERNOR_PLAYER_ID)
    assert.equal(pendingTransfer.status, 'pending')
    assert.deepEqual(readObject(pendingTransfer.resources), {
      food: 11,
      wood: 0,
      stone: 0,
      iron: 7,
    })
    const claimTransfer = await requestJson(backend.baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'claimGovernorResourceInbox',
      payload: {
        factionId: FACTION_ID,
        governorPlayerId: GOVERNOR_PLAYER_ID,
        transferId: pendingTransfer.transferId,
      },
    }, 60_000)
    assert.equal(claimTransfer.status, 200, `claim governor transfer failed: ${JSON.stringify(claimTransfer.data)}`)
    assert.equal(readObject(claimTransfer.data).ok, true, 'governor should claim the pending AI transfer')

    const subjectAfterClaim = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(subjectAfterClaim.status, 200, `subject after governor claim failed: ${JSON.stringify(subjectAfterClaim.data)}`)
    const claimedSubjectEconomy = readObject(readObject(readObject(subjectAfterClaim.data).subject).economy)
    const pendingAfterClaim = readObject(claimedSubjectEconomy.pendingGovernorTransfers)
    assert.equal(pendingAfterClaim.count, 0, 'claimed governor transfer should disappear from pending subject economy')
    assert.deepEqual(readObject(pendingAfterClaim.totalPendingResources), {
      food: 0,
      wood: 0,
      stone: 0,
      iron: 0,
    })
    const settledGovernorTransfers = readObject(claimedSubjectEconomy.settledGovernorTransfers)
    assert.equal(settledGovernorTransfers.governorPlayerId, GOVERNOR_PLAYER_ID)
    assert.equal(settledGovernorTransfers.count, 1, 'subject economy should remember the governor-claimed AI transfer')
    assert.deepEqual(readObject(settledGovernorTransfers.totalSettledResources), {
      food: 11,
      wood: 0,
      stone: 0,
      iron: 7,
    })
    const settledItems = readArray(settledGovernorTransfers.items).map((item) => readObject(item))
    const settledTransfer = settledItems.find((item) => item.transferId === pendingTransfer.transferId)
    assert.ok(settledTransfer, 'subject economy should list the settled transfer from this AI player')
    assert.equal(settledTransfer.sourceAiPlayerId, AI_PLAYER_ID)
    assert.equal(settledTransfer.governorPlayerId, GOVERNOR_PLAYER_ID)
    assert.equal(settledTransfer.status, 'claimed')
    assert.deepEqual(readObject(settledTransfer.resources), {
      food: 11,
      wood: 0,
      stone: 0,
      iron: 7,
    })
    const recentBodyChanges = readObject(transferSubject.recentBodyChanges)
    assert.equal(recentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
    const bodyChangeItems = readArray(recentBodyChanges.items).map((item) => readObject(item))
    const transferBodyChange = bodyChangeItems.find((item) => (
      item.action === 'resource_transfer_to_governor' &&
      item.status === 'completed' &&
      item.proposalId === receipt.proposalId
    ))
    assert.ok(transferBodyChange, 'resource_transfer_to_governor receipt must become a subject economy body change')
    assert.equal(transferBodyChange.bodyNode, 'resources_and_buildings')
    assert.equal(transferBodyChange.nextSubjectFocus, 'economy')
    assert.equal(transferBodyChange.visibleToAi, true)
    assert.deepEqual(
      readObject(transferBodyChange.resourceDelta),
      {
        food: 11,
        wood: 0,
        stone: 0,
        iron: 7,
      },
      'subject body change should expose the transferred resource bundle',
    )
    assert.deepEqual(
      readObject(transferBodyChange.accountBefore),
      {
        food: 90,
        wood: 70,
        stone: 50,
        iron: 30,
      },
      'subject body change should expose the AI account before transfer',
    )
    assert.deepEqual(
      readObject(transferBodyChange.accountAfter),
      {
        food: 79,
        wood: 70,
        stone: 50,
        iron: 23,
      },
      'subject body change should expose the AI account after transfer',
    )
    assert.equal(transferBodyChange.governorPlayerId, GOVERNOR_PLAYER_ID)
    assert.equal(transferBodyChange.governanceApprovedBeforeExecution, true)
    assert.equal(transferBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
    assert.equal(typeof transferBodyChange.governanceApprovedAt, 'string')
    assert.equal(transferBodyChange.executionReceiptAvailable, true)
    assert.equal(transferBodyChange.executionWorldReceiptAvailable, true)
    assert.equal(transferBodyChange.executionWorldReceiptAction, 'transferFactionResourcesToGovernor')

    const recentHistoryAnchors = readObject(transferSubject.recentHistoryAnchors)
    assert.equal(recentHistoryAnchors.contractId, 'ai_player_subject_history_anchors_v1')
    const historyAnchorItems = readArray(recentHistoryAnchors.items).map((item) => readObject(item))
    const transferHistoryAnchor = historyAnchorItems.find((item) => (
      item.action === 'resource_transfer_to_governor' &&
      item.bodyNode === 'resources_and_buildings' &&
      item.proposalId === receipt.proposalId
    ))
    assert.ok(transferHistoryAnchor, 'resource_transfer_to_governor body change must be linked to subject history')
    assert.equal(transferHistoryAnchor.status, 'completed')
    assert.equal(transferHistoryAnchor.nextSubjectFocus, 'economy')
    assert.equal(
      transferHistoryAnchor.governorPlayerId,
      GOVERNOR_PLAYER_ID,
      'resource_transfer_to_governor history anchor should preserve the governor recipient',
    )

    const createWrongApprover = await requestJson(backend.baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      action: 'resource_transfer_to_governor',
      source: 'mcp',
      reason: 'resource transfer approved by non-governor should fail in world authority',
      args: {
        resources: {
          food: 5,
        },
      },
    })
    assert.equal(
      createWrongApprover.status,
      200,
      `create wrong-approver transfer proposal failed: ${JSON.stringify(createWrongApprover.data)}`,
    )
    const wrongApproverProposal = readObject(readObject(createWrongApprover.data).proposal)
    const wrongApproverProposalId = String(wrongApproverProposal.proposalId)
    assert.equal(wrongApproverProposal.status, 'pending_approval')

    const approveWrongApprover = await requestJson(
      backend.baseUrl,
      `/api/ai/players/proposals/${wrongApproverProposalId}/approve`,
      'POST',
      {
        approvedBy: 'human_not_the_governor',
      },
    )
    assert.equal(
      approveWrongApprover.status,
      200,
      `approve wrong-approver transfer proposal failed: ${JSON.stringify(approveWrongApprover.data)}`,
    )

    const executeWrongApprover = await requestJson(
      backend.baseUrl,
      `/api/ai/players/proposals/${wrongApproverProposalId}/execute`,
      'POST',
      {
        executedBy: 'human_not_the_governor',
        includeWorld: false,
      },
      60_000,
    )
    assert.equal(
      executeWrongApprover.status,
      200,
      `execute wrong-approver transfer proposal should return a failed receipt: ${JSON.stringify(executeWrongApprover.data)}`,
    )
    const wrongApproverReceipt = readObject(readObject(executeWrongApprover.data).receipt)
    assert.equal(wrongApproverReceipt.ok, false)
    assert.equal(wrongApproverReceipt.worldAction, 'transferFactionResourcesToGovernor')
    assert.equal(wrongApproverReceipt.failureCode, 'approval_required')
    assert.equal(readObject(wrongApproverReceipt.worldActionPayload).approvedBy, 'human_not_the_governor')
    assert.ok(
      Object.prototype.hasOwnProperty.call(wrongApproverReceipt, 'execution'),
      'failed transfer receipt should preserve the execution field',
    )

    console.log('[ai_player_http_resource_transfer_contract] all checks passed')
  } finally {
    await backend.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_http_resource_transfer_contract] failed:', error)
  process.exitCode = 1
})
