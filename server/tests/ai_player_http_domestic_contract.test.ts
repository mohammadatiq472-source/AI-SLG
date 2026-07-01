import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import type { WorldState } from '../../shared/contracts/game/world'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  assertSuccessfulReceipt,
  clearAllPlanExecutions,
  createApproveExecuteProposal,
  ensureFactionBudget,
  AI_PLAYER_ID,
  joinGovernor,
  registerDefaultAiPlayer,
  startAiPlayerHttpBackend,
  type AiPlayerHttpBackend,
} from './helpers/aiPlayerHttpContractHarness'
import { buildSessionPersistPath, readArray, readObject, requestJson } from './helpers/backendHarness'

const DOMESTIC_ACTIONS: Array<{
  action: 'city_upgrade' | 'building_upgrade' | 'queue_fill_idle_slot' | 'research_start'
  worldAction: string
  minFood: number
  minActionPoints: number
}> = [
  {
    action: 'city_upgrade',
    worldAction: 'upgradeCity',
    minFood: 0,
    minActionPoints: 4,
  },
  {
    action: 'building_upgrade',
    worldAction: 'promoteCityBuilding',
    minFood: 0,
    minActionPoints: 4,
  },
  {
    action: 'queue_fill_idle_slot',
    worldAction: 'enqueueAffair',
    minFood: 0,
    minActionPoints: 4,
  },
  {
    action: 'research_start',
    worldAction: 'upgradeCityTech',
    minFood: 0,
    minActionPoints: 4,
  },
]

function resolveUpgradeFootprintTileIds(world: WorldState, hallTileId: string, existingTileIds: string[]): string[] {
  const hallTile = world.map.tiles.find((tile) => tile.id === hallTileId)
  assert.ok(hallTile, `missing city hall tile ${hallTileId} while seeding domestic shard`)
  const tileByCoord = new Map(world.map.tiles.map((tile) => [`${tile.x},${tile.y}`, tile]))
  const existingTileIdSet = new Set(existingTileIds)
  const candidateStarts = [
    { x: hallTile.x - 2, y: hallTile.y - 2 },
    { x: hallTile.x - 2, y: hallTile.y - 3 },
    { x: hallTile.x - 3, y: hallTile.y - 2 },
    { x: hallTile.x - 3, y: hallTile.y - 3 },
  ]

  let bestTileIds: string[] = []
  let bestScore = Number.NEGATIVE_INFINITY
  for (const start of candidateStarts) {
    const tiles = []
    for (let localY = 0; localY < 5; localY += 1) {
      for (let localX = 0; localX < 5; localX += 1) {
        const tile = tileByCoord.get(`${start.x + localX},${start.y + localY}`)
        if (tile) {
          tiles.push(tile)
        }
      }
    }
    if (tiles.length !== 25) {
      continue
    }

    const score = tiles.reduce(
      (total, tile) =>
        total
        + (existingTileIdSet.has(tile.id) ? 100 : 0)
        - Math.abs(tile.x - hallTile.x)
        - Math.abs(tile.y - hallTile.y),
      0,
    )
    if (score > bestScore) {
      bestScore = score
      bestTileIds = tiles.map((tile) => tile.id)
    }
  }

  assert.equal(bestTileIds.length, 25, 'domestic shard should resolve a 5x5 city upgrade footprint')
  return bestTileIds
}

function seedWorldStateWithUpgradeableCity(): { path: string } {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding domestic shard`)
  faction.actionPoints = Math.max(faction.actionPoints, 12)
  faction.food = Math.max(faction.food, 100)

  const cluster = world.map.overlays.cityClusters.find(
    (candidate) => candidate.owner === FACTION_ID && candidate.footprintTiles === 9,
  )
  assert.ok(cluster, `missing owned 3x3 city cluster for ${FACTION_ID} while seeding domestic shard`)
  const footprintTileIds = resolveUpgradeFootprintTileIds(world, cluster.cityHallTileId, cluster.tileIds)
  cluster.isUpgradeable = true
  for (const tileId of footprintTileIds) {
    const tile = world.map.tiles.find((candidate) => candidate.id === tileId)
    assert.ok(tile, `missing tile ${tileId} while seeding domestic shard`)
    tile.owner = FACTION_ID
  }
  for (const unit of world.units) {
    if (unit.faction !== FACTION_ID && footprintTileIds.includes(unit.tileId)) {
      const fallbackTile = world.map.tiles.find((tile) => !footprintTileIds.includes(tile.id))
      assert.ok(fallbackTile, 'missing fallback tile while moving hostile unit away from domestic city footprint')
      unit.tileId = fallbackTile.id
    }
  }

  const path = buildSessionPersistPath('ai_player_http_domestic_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { path }
}

async function bootDomesticBackend(): Promise<AiPlayerHttpBackend> {
  const seeded = seedWorldStateWithUpgradeableCity()
  const backend = await startAiPlayerHttpBackend(
    'ai_player_http_domestic_contract',
    undefined,
    {
      WORLD_STATE_PERSIST_PATH: seeded.path,
    },
  )
  await joinGovernor(backend.baseUrl)
  await registerDefaultAiPlayer(backend.baseUrl)
  return backend
}

async function assertRejectedDomesticProposalPreservesAttemptContext(baseUrl: string) {
  const attemptedContext = {
    cityId: 'domestic_attempt_city_alpha',
    groupId: 'market',
    buildingId: 'market_plaza',
  }
  const create = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
    aiPlayerId: AI_PLAYER_ID,
    action: 'building_upgrade',
    source: 'human',
    reason: 'Domestic AI player rejected building upgrade context contract',
    args: attemptedContext,
  }, 60_000)
  assert.equal(create.status, 200, `create rejected building_upgrade proposal failed: ${JSON.stringify(create.data)}`)
  const proposal = readObject(readObject(create.data).proposal)
  const proposalId = String(proposal.proposalId)
  assert.equal(proposal.status, 'pending_approval')

  const rejected = await requestJson(baseUrl, `/api/ai/players/proposals/${proposalId}/reject`, 'POST', {
    rejectedBy: GOVERNOR_PLAYER_ID,
    rejectionReason: 'player_declined_building_upgrade',
  }, 60_000)
  assert.equal(rejected.status, 200, `reject building_upgrade proposal failed: ${JSON.stringify(rejected.data)}`)
  assert.equal(readObject(readObject(rejected.data).proposal).status, 'rejected')

  const subjectResponse = await requestJson(
    baseUrl,
    `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
    'GET',
    undefined,
    60_000,
  )
  assert.equal(subjectResponse.status, 200, `subject after rejected building_upgrade failed: ${JSON.stringify(subjectResponse.data)}`)
  const subject = readObject(readObject(subjectResponse.data).subject)
  const recentBodyChanges = readObject(subject.recentBodyChanges)
  assert.equal(recentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
  const bodyChangeItems = readArray(recentBodyChanges.items).map((item) => readObject(item))
  const rejectedBodyChange = bodyChangeItems.find((item) => (
    item.action === 'building_upgrade' &&
    item.status === 'failed' &&
    item.proposalId === proposalId
  ))
  assert.ok(rejectedBodyChange, 'rejected building_upgrade proposal must become a subject governance body change')
  assert.equal(rejectedBodyChange.bodyNode, 'human_command_and_obedience')
  assert.equal(rejectedBodyChange.failureCode, 'player_declined_building_upgrade')
  assert.equal(rejectedBodyChange.rejectedBy, GOVERNOR_PLAYER_ID)
  assert.equal(rejectedBodyChange.targetTileId, attemptedContext.cityId)
  assert.equal(rejectedBodyChange.facilityId, attemptedContext.groupId)
  assert.equal(rejectedBodyChange.buildingId, attemptedContext.buildingId)
  assert.equal(rejectedBodyChange.nextSubjectFocus, 'governance')
  assert.equal(rejectedBodyChange.visibleToAi, true)

  const recentHistoryAnchors = readObject(subject.recentHistoryAnchors)
  assert.equal(recentHistoryAnchors.contractId, 'ai_player_subject_history_anchors_v1')
  const historyAnchorItems = readArray(recentHistoryAnchors.items).map((item) => readObject(item))
  const rejectedHistoryAnchor = historyAnchorItems.find((item) => (
    item.action === 'building_upgrade' &&
    item.bodyNode === 'human_command_and_obedience' &&
    item.proposalId === proposalId
  ))
  assert.ok(rejectedHistoryAnchor, 'rejected building_upgrade governance body change must be linked to subject history')
  assert.equal(rejectedHistoryAnchor.status, 'failed')
  assert.equal(rejectedHistoryAnchor.rejectedBy, GOVERNOR_PLAYER_ID)
  assert.equal(rejectedHistoryAnchor.targetTileId, attemptedContext.cityId)
  assert.equal(rejectedHistoryAnchor.facilityId, attemptedContext.groupId)
  assert.equal(rejectedHistoryAnchor.buildingId, attemptedContext.buildingId)
  assert.equal(rejectedHistoryAnchor.nextSubjectFocus, 'governance')
  const sourceRefs = readObject(rejectedHistoryAnchor.sourceRefs)
  assert.equal(sourceRefs.visible, false)
  assert.equal(sourceRefs.proposalId, proposalId)
}

async function run() {
  const backend = await bootDomesticBackend()
  try {
    for (const { action, worldAction, minFood, minActionPoints } of DOMESTIC_ACTIONS) {
      await clearAllPlanExecutions(backend.baseUrl)
      await ensureFactionBudget(
        backend.baseUrl,
        minActionPoints,
        minFood,
        `prepare ${action} in domestic contract shard`,
      )

      const { receipt } = await createApproveExecuteProposal(
        backend.baseUrl,
        action,
        {},
        `Domestic AI player contract smoke test for ${action}`,
      )

      assertSuccessfulReceipt(action, receipt, worldAction)
      assert.equal(receipt.failureCode, null, `${action} failureCode should remain null`)
      if (action === 'city_upgrade') {
        const cityUpgradePayload = readObject(receipt.worldActionPayload)
        const subjectAfterCityUpgrade = await requestJson(
          backend.baseUrl,
          `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
          'GET',
          undefined,
          60_000,
        )
        assert.equal(
          subjectAfterCityUpgrade.status,
          200,
          `subject after city_upgrade failed: ${JSON.stringify(subjectAfterCityUpgrade.data)}`,
        )
        const subject = readObject(readObject(subjectAfterCityUpgrade.data).subject)
        const recentBodyChanges = readObject(subject.recentBodyChanges)
        assert.equal(recentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
        const bodyChangeItems = readArray(recentBodyChanges.items).map((item) => readObject(item))
        const cityBodyChange = bodyChangeItems.find((item) => item.action === 'city_upgrade')
        assert.ok(cityBodyChange, 'city_upgrade receipt must become a subject body change')
        assert.equal(cityBodyChange.bodyNode, 'resources_and_buildings')
        assert.equal(cityBodyChange.status, 'completed')
        assert.equal(cityBodyChange.targetTileId, cityUpgradePayload.tileId)
        assert.equal(cityBodyChange.cityFootprintTiles, 25)
        assert.equal(cityBodyChange.cityFootprintTier, 'city_5x5')
        assert.equal(cityBodyChange.nextSubjectFocus, 'economy')
        assert.equal(cityBodyChange.visibleToAi, true)
        assert.equal(cityBodyChange.governanceApprovedBeforeExecution, true)
        assert.equal(cityBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
        assert.equal(typeof cityBodyChange.governanceApprovedAt, 'string')

        const recentHistoryAnchors = readObject(subject.recentHistoryAnchors)
        assert.equal(recentHistoryAnchors.contractId, 'ai_player_subject_history_anchors_v1')
        const historyAnchorItems = readArray(recentHistoryAnchors.items).map((item) => readObject(item))
        const cityHistoryAnchor = historyAnchorItems.find((item) => item.action === 'city_upgrade')
        assert.ok(cityHistoryAnchor, 'city_upgrade receipt must become a subject history anchor')
        assert.equal(cityHistoryAnchor.bodyNode, 'resources_and_buildings')
        assert.equal(cityHistoryAnchor.status, 'completed')
        assert.equal(cityHistoryAnchor.targetTileId, cityUpgradePayload.tileId)
        assert.equal(cityHistoryAnchor.cityFootprintTiles, 25)
        assert.equal(cityHistoryAnchor.cityFootprintTier, 'city_5x5')
        assert.equal(cityHistoryAnchor.nextSubjectFocus, 'economy')
        assert.equal(readObject(cityHistoryAnchor.sourceRefs).visible, false)
      }
      if (action === 'building_upgrade') {
        const buildingUpgradeWorldReceipt = readObject(receipt.worldReceipt)
        const subjectAfterBuildingUpgrade = await requestJson(
          backend.baseUrl,
          `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
          'GET',
          undefined,
          60_000,
        )
        assert.equal(
          subjectAfterBuildingUpgrade.status,
          200,
          `subject after building_upgrade failed: ${JSON.stringify(subjectAfterBuildingUpgrade.data)}`,
        )
        const subject = readObject(readObject(subjectAfterBuildingUpgrade.data).subject)
        const recentBodyChanges = readObject(subject.recentBodyChanges)
        assert.equal(recentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
        const bodyChangeItems = readArray(recentBodyChanges.items).map((item) => readObject(item))
        const buildingBodyChange = bodyChangeItems.find((item) => item.action === 'building_upgrade')
        assert.ok(buildingBodyChange, 'building_upgrade receipt must become a subject body change')
        assert.equal(buildingBodyChange.bodyNode, 'resources_and_buildings')
        assert.equal(buildingBodyChange.status, 'completed')
        assert.equal(buildingBodyChange.targetTileId, buildingUpgradeWorldReceipt.cityId)
        assert.equal(buildingBodyChange.facilityId, buildingUpgradeWorldReceipt.groupId)
        assert.equal(buildingBodyChange.buildingId, buildingUpgradeWorldReceipt.buildingId)
        assert.equal(buildingBodyChange.previousLevel, buildingUpgradeWorldReceipt.previousLevel)
        assert.equal(buildingBodyChange.nextLevel, buildingUpgradeWorldReceipt.nextLevel)
        assert.deepEqual(
          readObject(buildingBodyChange.resourcesSpent),
          readObject(buildingUpgradeWorldReceipt.resourcesSpent),
        )
        assert.equal(buildingBodyChange.nextSubjectFocus, 'economy')
        assert.equal(buildingBodyChange.visibleToAi, true)
        assert.equal(buildingBodyChange.governanceApprovedBeforeExecution, true)
        assert.equal(buildingBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
        assert.equal(typeof buildingBodyChange.governanceApprovedAt, 'string')
        assert.equal(buildingBodyChange.executionReceiptAvailable, true)
        assert.equal(buildingBodyChange.executionWorldReceiptAvailable, true)
        assert.equal(buildingBodyChange.executionWorldReceiptTargetTileId, buildingUpgradeWorldReceipt.cityId)
        assert.equal(buildingBodyChange.executionWorldReceiptFacilityId, buildingUpgradeWorldReceipt.groupId)
        assert.equal(buildingBodyChange.executionWorldReceiptBuildingId, buildingUpgradeWorldReceipt.buildingId)
        assert.equal(buildingBodyChange.executionWorldReceiptPreviousLevel, buildingUpgradeWorldReceipt.previousLevel)
        assert.equal(buildingBodyChange.executionWorldReceiptNextLevel, buildingUpgradeWorldReceipt.nextLevel)
        assert.equal(buildingBodyChange.executionWorldReceiptResourcesSpentAvailable, true)

        const recentHistoryAnchors = readObject(subject.recentHistoryAnchors)
        assert.equal(recentHistoryAnchors.contractId, 'ai_player_subject_history_anchors_v1')
        const historyAnchorItems = readArray(recentHistoryAnchors.items).map((item) => readObject(item))
        const buildingHistoryAnchor = historyAnchorItems.find((item) => item.action === 'building_upgrade')
        assert.ok(buildingHistoryAnchor, 'building_upgrade receipt must become a subject history anchor')
        assert.equal(buildingHistoryAnchor.bodyNode, 'resources_and_buildings')
        assert.equal(buildingHistoryAnchor.status, 'completed')
        assert.equal(buildingHistoryAnchor.targetTileId, buildingUpgradeWorldReceipt.cityId)
        assert.equal(buildingHistoryAnchor.facilityId, buildingUpgradeWorldReceipt.groupId)
        assert.equal(buildingHistoryAnchor.buildingId, buildingUpgradeWorldReceipt.buildingId)
        assert.equal(buildingHistoryAnchor.previousLevel, buildingUpgradeWorldReceipt.previousLevel)
        assert.equal(buildingHistoryAnchor.nextLevel, buildingUpgradeWorldReceipt.nextLevel)
        assert.deepEqual(
          readObject(buildingHistoryAnchor.resourcesSpent),
          readObject(buildingUpgradeWorldReceipt.resourcesSpent),
        )
        assert.equal(buildingHistoryAnchor.nextSubjectFocus, 'economy')
        assert.equal(readObject(buildingHistoryAnchor.sourceRefs).visible, false)
      }
      if (action === 'queue_fill_idle_slot') {
        const queueFillPayload = readObject(receipt.worldActionPayload)
        const subjectAfterQueueFill = await requestJson(
          backend.baseUrl,
          `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
          'GET',
          undefined,
          60_000,
        )
        assert.equal(
          subjectAfterQueueFill.status,
          200,
          `subject after queue_fill_idle_slot failed: ${JSON.stringify(subjectAfterQueueFill.data)}`,
        )
        const subject = readObject(readObject(subjectAfterQueueFill.data).subject)
        const recentBodyChanges = readObject(subject.recentBodyChanges)
        assert.equal(recentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
        const bodyChangeItems = readArray(recentBodyChanges.items).map((item) => readObject(item))
        const queueBodyChange = bodyChangeItems.find((item) => item.action === 'queue_fill_idle_slot')
        assert.ok(queueBodyChange, 'queue_fill_idle_slot receipt must become a subject body change')
        assert.equal(queueBodyChange.bodyNode, 'resources_and_buildings')
        assert.equal(queueBodyChange.status, 'completed')
        assert.equal(queueBodyChange.targetTileId, queueFillPayload.cityId)
        assert.equal(queueBodyChange.facilityId, queueFillPayload.groupId)
        assert.equal(queueBodyChange.affairId, queueFillPayload.affairId)
        assert.equal(queueBodyChange.nextSubjectFocus, 'economy')
        assert.equal(queueBodyChange.visibleToAi, true)
        assert.equal(queueBodyChange.governanceApprovedBeforeExecution, true)
        assert.equal(queueBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
        assert.equal(typeof queueBodyChange.governanceApprovedAt, 'string')

        const recentHistoryAnchors = readObject(subject.recentHistoryAnchors)
        assert.equal(recentHistoryAnchors.contractId, 'ai_player_subject_history_anchors_v1')
        const historyAnchorItems = readArray(recentHistoryAnchors.items).map((item) => readObject(item))
        const queueHistoryAnchor = historyAnchorItems.find((item) => item.action === 'queue_fill_idle_slot')
        assert.ok(queueHistoryAnchor, 'queue_fill_idle_slot receipt must become a subject history anchor')
        assert.equal(queueHistoryAnchor.bodyNode, 'resources_and_buildings')
        assert.equal(queueHistoryAnchor.status, 'completed')
        assert.equal(queueHistoryAnchor.targetTileId, queueFillPayload.cityId)
        assert.equal(queueHistoryAnchor.facilityId, queueFillPayload.groupId)
        assert.equal(queueHistoryAnchor.affairId, queueFillPayload.affairId)
        assert.equal(queueHistoryAnchor.nextSubjectFocus, 'economy')
        assert.equal(readObject(queueHistoryAnchor.sourceRefs).visible, false)
      }
      if (action === 'research_start') {
        const researchPayload = readObject(receipt.worldActionPayload)
        const researchWorldReceipt = readObject(receipt.worldReceipt)
        assert.equal(researchWorldReceipt.action, 'upgradeCityTech')
        assert.equal(researchWorldReceipt.tileId, researchPayload.tileId)
        assert.equal(researchWorldReceipt.techId, researchPayload.techId)
        assert.equal(typeof researchWorldReceipt.previousLevel, 'number')
        assert.equal(typeof researchWorldReceipt.nextLevel, 'number')
        const researchResourcesSpent = readObject(researchWorldReceipt.resourcesSpent)
        assert.equal(typeof researchResourcesSpent.actionPoints, 'number')
        assert.ok(
          Object.keys(researchResourcesSpent).length > 1,
          'research_start world receipt should expose upgrade resource spend',
        )
        const subjectAfterResearchStart = await requestJson(
          backend.baseUrl,
          `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
          'GET',
          undefined,
          60_000,
        )
        assert.equal(
          subjectAfterResearchStart.status,
          200,
          `subject after research_start failed: ${JSON.stringify(subjectAfterResearchStart.data)}`,
        )
        const subject = readObject(readObject(subjectAfterResearchStart.data).subject)
        const recentBodyChanges = readObject(subject.recentBodyChanges)
        assert.equal(recentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
        const bodyChangeItems = readArray(recentBodyChanges.items).map((item) => readObject(item))
        const researchBodyChange = bodyChangeItems.find((item) => item.action === 'research_start')
        assert.ok(researchBodyChange, 'research_start receipt must become a subject body change')
        assert.equal(researchBodyChange.bodyNode, 'resources_and_buildings')
        assert.equal(researchBodyChange.status, 'completed')
        assert.equal(researchBodyChange.targetTileId, researchPayload.tileId)
        assert.equal(researchBodyChange.techId, researchPayload.techId)
        assert.equal(researchBodyChange.previousLevel, researchWorldReceipt.previousLevel)
        assert.equal(researchBodyChange.nextLevel, researchWorldReceipt.nextLevel)
        assert.deepEqual(
          readObject(researchBodyChange.resourcesSpent),
          readObject(researchWorldReceipt.resourcesSpent),
        )
        assert.equal(researchBodyChange.nextSubjectFocus, 'economy')
        assert.equal(researchBodyChange.visibleToAi, true)
        assert.equal(researchBodyChange.governanceApprovedBeforeExecution, true)
        assert.equal(researchBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
        assert.equal(typeof researchBodyChange.governanceApprovedAt, 'string')
        assert.equal(researchBodyChange.executionReceiptAvailable, true)
        assert.equal(researchBodyChange.executionWorldAction, 'upgradeCityTech')
        assert.equal(researchBodyChange.executionWorldReceiptAvailable, true)
        assert.equal(researchBodyChange.executionWorldReceiptAction, 'upgradeCityTech')
        assert.equal(researchBodyChange.executionWorldReceiptTargetTileId, researchPayload.tileId)
        assert.equal(researchBodyChange.executionWorldReceiptTechId, researchPayload.techId)
        assert.equal(researchBodyChange.executionWorldReceiptResourcesSpentAvailable, true)

        const recentHistoryAnchors = readObject(subject.recentHistoryAnchors)
        assert.equal(recentHistoryAnchors.contractId, 'ai_player_subject_history_anchors_v1')
        const historyAnchorItems = readArray(recentHistoryAnchors.items).map((item) => readObject(item))
        const researchHistoryAnchor = historyAnchorItems.find((item) => item.action === 'research_start')
        assert.ok(researchHistoryAnchor, 'research_start receipt must become a subject history anchor')
        assert.equal(researchHistoryAnchor.bodyNode, 'resources_and_buildings')
        assert.equal(researchHistoryAnchor.status, 'completed')
        assert.equal(researchHistoryAnchor.targetTileId, researchPayload.tileId)
        assert.equal(researchHistoryAnchor.techId, researchPayload.techId)
        assert.equal(researchHistoryAnchor.previousLevel, researchWorldReceipt.previousLevel)
        assert.equal(researchHistoryAnchor.nextLevel, researchWorldReceipt.nextLevel)
        assert.deepEqual(
          readObject(researchHistoryAnchor.resourcesSpent),
          readObject(researchWorldReceipt.resourcesSpent),
        )
        assert.equal(researchHistoryAnchor.nextSubjectFocus, 'economy')
        assert.equal(readObject(researchHistoryAnchor.sourceRefs).visible, false)
      }
    }

    await assertRejectedDomesticProposalPreservesAttemptContext(backend.baseUrl)

    console.log('[ai_player_http_domestic_contract] all checks passed')
  } finally {
    await backend.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_http_domestic_contract] failed:', error)
  process.exitCode = 1
})
