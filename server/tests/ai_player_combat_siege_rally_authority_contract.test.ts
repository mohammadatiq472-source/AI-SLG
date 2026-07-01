import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import type { WorldState } from '../../shared/contracts/game/world'
import { PLAYER_HOME_CITY_CENTER_DURABILITY_MAX } from '../../shared/domain/cityDurability'
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

const ENEMY_FACTION_ID = 'enemy'
const ROGUE_ACTIONS: Array<{
  action: 'city_siege' | 'rally_launch' | 'rally_join'
  expectedError: RegExp
}> = [
  { action: 'city_siege', expectedError: /no hostile city siege target/ },
  { action: 'rally_launch', expectedError: /no alliance rally target/ },
  { action: 'rally_join', expectedError: /no alliance rally target/ },
]

function seedSiegeRallyWorld(): {
  path: string
  unitId: string
  rogueUnitId: string
  cityHallTileId: string
  clusterId: string
  rallyRegionId: string
  rallyTargetTileId: string
} {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding siege rally contract`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for ${FACTION_ID} while seeding siege rally contract`)
  const rogueUnit = structuredClone(unit)
  rogueUnit.id = 'ai_player_combat_siege_rally_rogue_faction_unit'
  rogueUnit.name = 'Siege Rally Rogue Faction Unit'
  const cluster = world.map.overlays.cityClusters.find((candidate) => candidate.id === 'qingshi')
  assert.ok(cluster, 'missing qingshi city cluster while seeding siege rally contract')
  const cityHall = world.map.tiles.find((tile) => tile.id === cluster.cityHallTileId)
  assert.ok(cityHall, 'missing qingshi city hall while seeding siege rally contract')

  cluster.owner = ENEMY_FACTION_ID
  cluster.camp = 'autonomous'
  for (const tileId of cluster.tileIds) {
    const cityTile = world.map.tiles.find((tile) => tile.id === tileId)
    if (cityTile) {
      cityTile.owner = ENEMY_FACTION_ID
      cityTile.enemyPressure = 4
    }
  }

  cityHall.owner = ENEMY_FACTION_ID
  cityHall.cityDurabilityRole = 'center'
  cityHall.cityDurabilityMax = PLAYER_HOME_CITY_CENTER_DURABILITY_MAX
  cityHall.cityDurability = 300
  cityHall.enemyPressure = 6

  unit.aiPlayerId = AI_PLAYER_ID
  unit.tileId = cityHall.id
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = 2
  unit.supply = 9
  unit.mobility = Math.max(unit.mobility, 20)
  unit.corps.readiness = 100
  rogueUnit.aiPlayerId = undefined
  rogueUnit.tileId = cityHall.id
  rogueUnit.status = '待命'
  rogueUnit.currentTask = undefined
  rogueUnit.strength = 2
  rogueUnit.supply = 9
  rogueUnit.mobility = Math.max(rogueUnit.mobility, 20)
  rogueUnit.corps.readiness = 100

  faction.actionPoints = 50
  faction.food = 50
  faction.capturedCities = []
  faction.aiPlayers = [{
    id: AI_PLAYER_ID,
    name: 'Player Operator Alpha',
    factionId: FACTION_ID,
    unitIds: [unit.id],
    specialty: 'assault',
  }]
  world.units = world.units.filter((candidate) => candidate.id === unit.id || candidate.tileId !== cityHall.id)
  world.units.push(rogueUnit)

  const rallyRegion = world.map.regions.find((candidate) => candidate.tileIds.some((tileId) => tileId !== cityHall.id))
  assert.ok(rallyRegion, 'missing rally region while seeding siege rally contract')
  const rallyTargetTileId = rallyRegion.tileIds.find((tileId) => tileId !== cityHall.id) ?? rallyRegion.centerTileId
  const rallyTargetTile = world.map.tiles.find((tile) => tile.id === rallyTargetTileId)
  assert.ok(rallyTargetTile, 'missing rally target tile while seeding siege rally contract')
  rallyTargetTile.owner = ENEMY_FACTION_ID
  rallyTargetTile.enemyPressure = 5
  world.alliance.directives[rallyRegion.id] = {
    regionId: rallyRegion.id,
    stance: 'support',
    assignedCommanderId: world.alliance.commanders[0]?.id ?? 'alliance_commander_siege_rally',
    supportLevel: 70,
    summary: '攻城侧翼需要同盟集结。',
  }

  const path = buildSessionPersistPath('ai_player_combat_siege_rally_authority_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    unitId: unit.id,
    rogueUnitId: rogueUnit.id,
    cityHallTileId: cityHall.id,
    clusterId: cluster.id,
    rallyRegionId: rallyRegion.id,
    rallyTargetTileId,
  }
}

async function createApproveExecuteExpectRejected(
  baseUrl: string,
  action: 'city_siege' | 'rally_launch' | 'rally_join',
  args: Record<string, unknown>,
  expectedError: RegExp,
) {
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
  assert.equal(rejectedBodyChange.unitId, args.unitId)
  assert.equal(rejectedBodyChange.targetTileId, args.targetTileId)
  if (action !== 'city_siege') {
    assert.equal(rejectedBodyChange.regionId, args.regionId)
  }
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
  assert.equal(rejectedHistoryAnchor.unitId, args.unitId)
  assert.equal(rejectedHistoryAnchor.targetTileId, args.targetTileId)
  if (action !== 'city_siege') {
    assert.equal(rejectedHistoryAnchor.regionId, args.regionId)
  }
  assert.equal(rejectedHistoryAnchor.approvedBy, GOVERNOR_PLAYER_ID)
  assert.match(String(rejectedHistoryAnchor.governanceFailureDetail), expectedError)
}

async function advanceWorld(baseUrl: string): Promise<WorldState> {
  const advanced = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
    action: 'advanceTick',
  }, 60_000)
  assert.equal(advanced.status, 200, `advanceTick failed: ${JSON.stringify(advanced.data)}`)
  const payload = readObject(advanced.data)
  assert.equal(payload.ok, true, `advanceTick should succeed: ${JSON.stringify(payload)}`)
  return readObject(payload.world) as unknown as WorldState
}

async function assertCitySiegeSubjectWarBodyChange(params: {
  baseUrl: string
  battleReportId: string
  cityHallTileId: string
  unitId: string
  expectedDurability: number
  expectedOwner: string
  expectedCaptured: boolean
  expectedFollowUpAction: string
}): Promise<Record<string, unknown>> {
  const subjectResult = await requestJson(
    params.baseUrl,
    `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}&battleResultLimit=5`,
    'GET',
    undefined,
    60_000,
  )
  assert.equal(subjectResult.status, 200, `subject after city_siege failed: ${JSON.stringify(subjectResult.data)}`)
  const subject = readObject(readObject(subjectResult.data).subject)
  const recentBodyChanges = readObject(subject.recentBodyChanges)
  assert.equal(recentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
  const bodyChangeItems = readArray(recentBodyChanges.items).map((item) => readObject(item))
  const siegeBodyChange = bodyChangeItems.find((item) => item.battleReportId === params.battleReportId)
  assert.ok(siegeBodyChange, 'city_siege battle report must become a subject war body change')
  assert.equal(siegeBodyChange.bodyNode, 'war_and_relations')
  assert.equal(siegeBodyChange.action, 'battle_report_read')
  assert.equal(siegeBodyChange.reportKind, 'city_siege')
  assert.equal(siegeBodyChange.unitId, params.unitId)
  assert.equal(siegeBodyChange.targetTileId, params.cityHallTileId)
  assert.equal(siegeBodyChange.cityDurabilityAfter, params.expectedDurability)
  assert.equal(siegeBodyChange.cityOwnerAfter, params.expectedOwner)
  assert.equal(siegeBodyChange.cityCaptured, params.expectedCaptured)
  assert.equal(siegeBodyChange.warFollowUpAction, params.expectedFollowUpAction)
  assert.equal(siegeBodyChange.warFollowUpReadiness, 'ready')
  const followUpArgs = readObject(siegeBodyChange.warFollowUpArgs)
  assert.equal(followUpArgs.sourceBattleReportId, params.battleReportId)
  assert.equal(followUpArgs.recommendedRecoveryCommand, 'continue_war_follow_up_action')
  if (params.expectedFollowUpAction === 'city_siege') {
    assert.equal(followUpArgs.unitId, params.unitId)
    assert.equal(followUpArgs.targetTileId, params.cityHallTileId)
  }
  assert.match(String(siegeBodyChange.warFollowUpReason), /攻城|城池|耐久|破城|战报/)
  assert.equal(siegeBodyChange.nextSubjectFocus, 'war')
  assert.equal(siegeBodyChange.visibleToAi, true)
  return siegeBodyChange
}

async function assertCitySiegeExecutionSubjectBodyChange(params: {
  baseUrl: string
  proposalId: string
  cityHallTileId: string
  unitId: string
  expectedDurability: number
  expectedOwner: string
  expectedCaptured: boolean
  sourceBattleReportId?: string
}) {
  const subjectResult = await requestJson(
    params.baseUrl,
    `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}&battleResultLimit=5`,
    'GET',
    undefined,
    60_000,
  )
  assert.equal(subjectResult.status, 200, `subject after city_siege execution failed: ${JSON.stringify(subjectResult.data)}`)
  const subject = readObject(readObject(subjectResult.data).subject)
  const bodyChangeItems = readArray(readObject(subject.recentBodyChanges).items).map((item) => readObject(item))
  const executionBodyChange = bodyChangeItems.find((item) => (
    item.proposalId === params.proposalId &&
    item.action === 'city_siege'
  ))
  assert.ok(executionBodyChange, 'city_siege execution receipt must become a subject war body change')
  assert.equal(executionBodyChange.bodyNode, 'war_and_relations')
  assert.equal(executionBodyChange.status, 'completed')
  assert.equal(executionBodyChange.unitId, params.unitId)
  assert.equal(executionBodyChange.targetTileId, params.cityHallTileId)
  assert.equal(executionBodyChange.cityDurabilityAfter, params.expectedDurability)
  assert.equal(executionBodyChange.cityOwnerAfter, params.expectedOwner)
  assert.equal(executionBodyChange.cityCaptured, params.expectedCaptured)
  assert.equal(executionBodyChange.sourceBattleReportId, params.sourceBattleReportId)
  assert.equal(
    executionBodyChange.recommendedRecoveryCommand,
    params.sourceBattleReportId ? 'continue_war_follow_up_action' : undefined,
  )
  assert.equal(executionBodyChange.nextSubjectFocus, 'war')
  assert.equal(executionBodyChange.visibleToAi, true)
  assert.equal(executionBodyChange.governanceApprovedBeforeExecution, true)
  assert.equal(executionBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
  assert.equal(executionBodyChange.executionReceiptAvailable, true)
  assert.equal(executionBodyChange.executionWorldAction, 'queuePlanExecution')
  assert.equal(executionBodyChange.executionFailureCode, null)
  assert.equal(executionBodyChange.historyAnchorAvailable, true)
  assert.equal(executionBodyChange.historyAnchorSourceVisibility, 'internal_link_only')
  assert.ok(String(executionBodyChange.historyAnchorWorldEventId ?? '').length > 0)
  const historyAnchorItems = readArray(readObject(subject.recentHistoryAnchors).items).map((item) => readObject(item))
  const executionHistoryAnchor = historyAnchorItems.find((item) => item.proposalId === params.proposalId)
  assert.ok(executionHistoryAnchor, 'city_siege execution history anchor must link to the same proposal')
  assert.equal(executionHistoryAnchor.action, 'city_siege')
  assert.equal(executionHistoryAnchor.bodyNode, 'war_and_relations')
  assert.equal(executionHistoryAnchor.status, 'completed')
  assert.equal(executionHistoryAnchor.unitId, params.unitId)
  assert.equal(executionHistoryAnchor.targetTileId, params.cityHallTileId)
  assert.equal(executionHistoryAnchor.cityDurabilityAfter, params.expectedDurability)
  assert.equal(executionHistoryAnchor.cityOwnerAfter, params.expectedOwner)
  assert.equal(executionHistoryAnchor.cityCaptured, params.expectedCaptured)
  const executionHistoryAnchorRefs = readObject(executionHistoryAnchor.sourceRefs)
  assert.equal(executionHistoryAnchorRefs.sourceBattleReportId, params.sourceBattleReportId)
  assert.equal(
    executionHistoryAnchorRefs.recommendedRecoveryCommand,
    params.sourceBattleReportId ? 'continue_war_follow_up_action' : undefined,
  )
  assert.equal(executionHistoryAnchor.governanceApprovedBeforeExecution, true)
  assert.equal(executionHistoryAnchor.governanceApprovedBy, GOVERNOR_PLAYER_ID)
}

async function assertRallyExecutionSubjectBodyChange(params: {
  baseUrl: string
  action: 'rally_launch' | 'rally_join'
  proposalId: string
  unitId: string
  targetTileId: string
  sourceBattleReportId: string
  sourceReplayRequestId: string
}) {
  const subjectResult = await requestJson(
    params.baseUrl,
    `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}&battleResultLimit=5`,
    'GET',
    undefined,
    60_000,
  )
  assert.equal(subjectResult.status, 200, `subject after ${params.action} execution failed: ${JSON.stringify(subjectResult.data)}`)
  const subject = readObject(readObject(subjectResult.data).subject)
  const bodyChangeItems = readArray(readObject(subject.recentBodyChanges).items).map((item) => readObject(item))
  const executionBodyChange = bodyChangeItems.find((item) => (
    item.proposalId === params.proposalId &&
    item.action === params.action
  ))
  assert.ok(executionBodyChange, `${params.action} receipt must become a subject war body change`)
  assert.equal(executionBodyChange.bodyNode, 'war_and_relations')
  assert.equal(executionBodyChange.status, 'completed')
  assert.equal(executionBodyChange.unitId, params.unitId)
  assert.equal(executionBodyChange.targetTileId, params.targetTileId)
  assert.equal(executionBodyChange.sourceBattleReportId, params.sourceBattleReportId)
  assert.equal(executionBodyChange.sourceReplayRequestId, params.sourceReplayRequestId)
  assert.equal(executionBodyChange.recommendedRecoveryCommand, 'continue_war_follow_up_action')
  assert.equal(executionBodyChange.nextSubjectFocus, 'war')
  assert.equal(executionBodyChange.visibleToAi, true)
  assert.equal(executionBodyChange.governanceApprovedBeforeExecution, true)
  assert.equal(executionBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
  assert.equal(executionBodyChange.executionReceiptAvailable, true)
  assert.equal(executionBodyChange.executionWorldAction, 'queuePlanExecution')
  assert.equal(executionBodyChange.executionFailureCode, null)
  assert.equal(executionBodyChange.historyAnchorAvailable, true)
  assert.equal(executionBodyChange.historyAnchorSourceVisibility, 'internal_link_only')

  const historyAnchorItems = readArray(readObject(subject.recentHistoryAnchors).items).map((item) => readObject(item))
  const executionHistoryAnchor = historyAnchorItems.find((item) => (
    item.proposalId === params.proposalId &&
    item.action === params.action
  ))
  assert.ok(executionHistoryAnchor, `${params.action} execution history anchor must link to the same proposal`)
  assert.equal(executionHistoryAnchor.bodyNode, 'war_and_relations')
  assert.equal(executionHistoryAnchor.status, 'completed')
  assert.equal(executionHistoryAnchor.unitId, params.unitId)
  assert.equal(executionHistoryAnchor.targetTileId, params.targetTileId)
  const sourceRefs = readObject(executionHistoryAnchor.sourceRefs)
  assert.equal(sourceRefs.sourceBattleReportId, params.sourceBattleReportId)
  assert.equal(sourceRefs.sourceReplayRequestId, params.sourceReplayRequestId)
  assert.equal(sourceRefs.recommendedRecoveryCommand, 'continue_war_follow_up_action')
}

async function run() {
  const seeded = seedSiegeRallyWorld()
  const backend = await startAiPlayerHttpBackend(
    'ai_player_combat_siege_rally_authority',
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
      actionWhitelist: ['city_siege', 'rally_launch', 'rally_join'],
      budgetPolicy: {
        allowHighRiskActions: true,
      },
    })
    assert.equal(register.status, 200, `register AI player failed: ${JSON.stringify(register.data)}`)

    for (const { action, expectedError } of ROGUE_ACTIONS) {
      await createApproveExecuteExpectRejected(
        backend.baseUrl,
        action,
        {
          unitId: seeded.rogueUnitId,
          targetTileId: action === 'city_siege' ? seeded.cityHallTileId : seeded.rallyTargetTileId,
          regionId: action === 'city_siege' ? undefined : seeded.rallyRegionId,
        },
        expectedError,
      )
    }

    const firstSiege = await createApproveExecuteProposal(
      backend.baseUrl,
      'city_siege',
      { unitId: seeded.unitId, targetTileId: seeded.cityHallTileId },
      'AI city siege authority contract first hit',
    )
    assert.equal(firstSiege.receipt.ok, true, `city_siege first receipt should succeed: ${JSON.stringify(firstSiege.receipt)}`)
    assert.equal(firstSiege.receipt.worldAction, 'queuePlanExecution')
    let world = await advanceWorld(backend.baseUrl)
    let cityHall = world.map.tiles.find((tile) => tile.id === seeded.cityHallTileId)
    assert.ok(cityHall, 'city hall should remain addressable after first city_siege')
    assert.equal(cityHall.cityDurability, 100)
    assert.equal(cityHall.owner, ENEMY_FACTION_ID)
    assert.ok(world.feedback.battleRecords.some((record) => (
      record.tileId === seeded.cityHallTileId
      && String(record.summary).includes('攻城')
    )), 'city_siege first hit should write a battle report')
    const firstSiegeBattleRecord = world.feedback.battleRecords.find((record) => (
      record.tileId === seeded.cityHallTileId &&
      record.attackerUnitId === seeded.unitId &&
      String(record.summary).includes('攻城')
    ))
    assert.ok(firstSiegeBattleRecord, 'city_siege first hit should expose a battle report id')
    const firstSiegeBodyChange = await assertCitySiegeSubjectWarBodyChange({
      baseUrl: backend.baseUrl,
      battleReportId: firstSiegeBattleRecord.id,
      cityHallTileId: seeded.cityHallTileId,
      unitId: seeded.unitId,
      expectedDurability: 100,
      expectedOwner: ENEMY_FACTION_ID,
      expectedCaptured: false,
      expectedFollowUpAction: 'city_siege',
    })

    const clearAfterFirstSiege = await requestJson(backend.baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'clearPlanExecution',
      payload: { factionId: FACTION_ID },
    }, 60_000)
    assert.equal(clearAfterFirstSiege.status, 200)
    assert.equal(readObject(clearAfterFirstSiege.data).ok, true)

    const breachFollowUpArgs = readObject(firstSiegeBodyChange.warFollowUpArgs)
    const breachSiege = await createApproveExecuteProposal(
      backend.baseUrl,
      String(firstSiegeBodyChange.warFollowUpAction),
      breachFollowUpArgs,
      String(firstSiegeBodyChange.warFollowUpReason),
    )
    assert.equal(breachSiege.proposal.action, 'city_siege')
    assert.deepEqual(readObject(breachSiege.proposal.args), breachFollowUpArgs)
    assert.equal(breachSiege.receipt.ok, true, `city_siege breach receipt should succeed: ${JSON.stringify(breachSiege.receipt)}`)
    assert.equal(breachSiege.receipt.proposalId, breachSiege.proposal.proposalId)
    const breachSiegePayload = readObject(breachSiege.receipt.worldActionPayload)
    assert.equal(breachSiegePayload.sourceBattleReportId, firstSiegeBattleRecord.id)
    assert.equal(breachSiegePayload.recommendedRecoveryCommand, 'continue_war_follow_up_action')
    await assertCitySiegeExecutionSubjectBodyChange({
      baseUrl: backend.baseUrl,
      proposalId: String(breachSiege.proposal.proposalId),
      cityHallTileId: seeded.cityHallTileId,
      unitId: seeded.unitId,
      expectedDurability: 100,
      expectedOwner: ENEMY_FACTION_ID,
      expectedCaptured: false,
      sourceBattleReportId: firstSiegeBattleRecord.id,
    })
    world = await advanceWorld(backend.baseUrl)
    cityHall = world.map.tiles.find((tile) => tile.id === seeded.cityHallTileId)
    assert.ok(cityHall, 'city hall should remain addressable after breach city_siege')
    assert.equal(cityHall.cityDurability, 0)
    assert.equal(cityHall.owner, FACTION_ID)
    assert.equal(world.map.overlays.cityClusters.find((cluster) => cluster.id === seeded.clusterId)?.owner, FACTION_ID)
    assert.equal(world.factions[FACTION_ID]?.capturedCities?.includes(seeded.cityHallTileId), true)
    const breachSiegeBattleRecord = world.feedback.battleRecords.find((record) => (
      record.tileId === seeded.cityHallTileId &&
      record.attackerUnitId === seeded.unitId &&
      String(record.summary).includes('攻城')
    ))
    assert.ok(breachSiegeBattleRecord, 'city_siege breach should expose a battle report id')
    await assertCitySiegeSubjectWarBodyChange({
      baseUrl: backend.baseUrl,
      battleReportId: breachSiegeBattleRecord.id,
      cityHallTileId: seeded.cityHallTileId,
      unitId: seeded.unitId,
      expectedDurability: 0,
      expectedOwner: FACTION_ID,
      expectedCaptured: true,
      expectedFollowUpAction: 'battle_report_read',
    })

    const clearAfterBreach = await requestJson(backend.baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'clearPlanExecution',
      payload: { factionId: FACTION_ID },
    }, 60_000)
    assert.equal(clearAfterBreach.status, 200)
    assert.equal(readObject(clearAfterBreach.data).ok, true)

    const rallyLaunch = await createApproveExecuteProposal(
      backend.baseUrl,
      'rally_launch',
      {
        unitId: seeded.unitId,
        regionId: seeded.rallyRegionId,
        targetTileId: seeded.rallyTargetTileId,
        sourceBattleReportId: breachSiegeBattleRecord.id,
        sourceReplayRequestId: 'rally_launch_source_replay',
        recommendedRecoveryCommand: 'continue_war_follow_up_action',
      },
      'AI rally launch authority contract',
    )
    assert.equal(rallyLaunch.receipt.ok, true, `rally_launch receipt should succeed: ${JSON.stringify(rallyLaunch.receipt)}`)
    assert.equal(rallyLaunch.receipt.worldAction, 'queuePlanExecution')
    assert.match(String(rallyLaunch.receipt.message), /集结|rally/i)
    const rallyLaunchPayload = readObject(rallyLaunch.receipt.worldActionPayload)
    assert.equal(rallyLaunchPayload.sourceBattleReportId, breachSiegeBattleRecord.id)
    assert.equal(rallyLaunchPayload.sourceReplayRequestId, 'rally_launch_source_replay')
    assert.equal(rallyLaunchPayload.recommendedRecoveryCommand, 'continue_war_follow_up_action')
    await assertRallyExecutionSubjectBodyChange({
      baseUrl: backend.baseUrl,
      action: 'rally_launch',
      proposalId: String(rallyLaunch.proposal.proposalId),
      unitId: seeded.unitId,
      targetTileId: seeded.rallyTargetTileId,
      sourceBattleReportId: breachSiegeBattleRecord.id,
      sourceReplayRequestId: 'rally_launch_source_replay',
    })

    const clearAfterLaunch = await requestJson(backend.baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'clearPlanExecution',
      payload: { factionId: FACTION_ID },
    }, 60_000)
    assert.equal(clearAfterLaunch.status, 200)
    assert.equal(readObject(clearAfterLaunch.data).ok, true)

    const rallyJoin = await createApproveExecuteProposal(
      backend.baseUrl,
      'rally_join',
      {
        unitId: seeded.unitId,
        regionId: seeded.rallyRegionId,
        targetTileId: seeded.rallyTargetTileId,
        sourceBattleReportId: breachSiegeBattleRecord.id,
        sourceReplayRequestId: 'rally_join_source_replay',
        recommendedRecoveryCommand: 'continue_war_follow_up_action',
      },
      'AI rally join authority contract',
    )
    assert.equal(rallyJoin.receipt.ok, true, `rally_join receipt should succeed: ${JSON.stringify(rallyJoin.receipt)}`)
    assert.equal(rallyJoin.receipt.worldAction, 'queuePlanExecution')
    assert.match(String(rallyJoin.receipt.message), /加入|集结|rally/i)
    const rallyJoinPayload = readObject(rallyJoin.receipt.worldActionPayload)
    assert.equal(rallyJoinPayload.sourceBattleReportId, breachSiegeBattleRecord.id)
    assert.equal(rallyJoinPayload.sourceReplayRequestId, 'rally_join_source_replay')
    assert.equal(rallyJoinPayload.recommendedRecoveryCommand, 'continue_war_follow_up_action')
    await assertRallyExecutionSubjectBodyChange({
      baseUrl: backend.baseUrl,
      action: 'rally_join',
      proposalId: String(rallyJoin.proposal.proposalId),
      unitId: seeded.unitId,
      targetTileId: seeded.rallyTargetTileId,
      sourceBattleReportId: breachSiegeBattleRecord.id,
      sourceReplayRequestId: 'rally_join_source_replay',
    })

    console.log('[ai_player_combat_siege_rally_authority_contract] all checks passed')
  } finally {
    await backend.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_combat_siege_rally_authority_contract] failed:', error)
  process.exitCode = 1
})
