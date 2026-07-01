import assert from 'node:assert/strict'
import type { WorldState } from '../../shared/contracts/game/world'
import {
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  bootRegisteredAiPlayer,
  createApproveExecuteProposal,
  ensureFactionBudget,
  loadWorldState,
  assertSuccessfulReceipt,
} from './helpers/aiPlayerHttpContractHarness'
import { readArray, readObject, requestJson } from './helpers/backendHarness'

function resolveAllianceHelpCandidate(world: WorldState) {
  assert.ok(world.factions[FACTION_ID], 'player faction should exist before alliance_help')
  assert.ok(Object.values(world.alliance.directives).length > 0, 'alliance_help should have at least one active directive')
  assert.ok(world.alliance.commanders.length > 0, 'alliance_help should have at least one ally commander')
}

function resolveFormationAssignCandidate(world: WorldState): {
  heroId: string
  tacticId: 'assault' | 'guard' | 'logistics'
} {
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, 'player faction should exist before formation_assign')

  const heroId = faction.heroCommand.rosterHeroIds[0]
  assert.ok(heroId, 'formation_assign should have an available hero')

  const generalState = world.slgDomainState?.generalStateByFaction?.[FACTION_ID]
  const currentTactic = generalState?.tacticByHeroId?.[heroId]
  const tacticId = (['assault', 'guard', 'logistics'] as const).find((candidate) => candidate !== currentTactic) ?? 'assault'

  return {
    heroId,
    tacticId,
  }
}

function resolveGeneralFocusCandidate(world: WorldState): { heroId: string } {
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, 'player faction should exist before general_focus_set')

  const rosterHeroIds = faction.heroCommand.rosterHeroIds
  const generalState = world.slgDomainState?.generalStateByFaction?.[FACTION_ID]
  const previousHeroId = generalState?.activeHeroId
  const heroId = rosterHeroIds.find((candidate) => candidate !== previousHeroId) ?? previousHeroId ?? rosterHeroIds[0]

  assert.ok(heroId, 'general_focus_set should have an available hero')
  return { heroId }
}

function resolveTroopFacilityUpgradeCandidate(world: WorldState): {
  unitId: string
  facilityId: string
  buildingId: string
} {
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, 'player faction should exist before troop_facility_upgrade')
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, 'troop_facility_upgrade should have an executable unit')

  return {
    unitId: unit.id,
    facilityId: 'training_ground',
    buildingId: 'training_ground_base',
  }
}

function resolveThreatEscapeCandidate(world: WorldState): { mode: 'recover' | 'redeploy'; agendaActionId: 'agenda_recover' | 'agenda_redeploy' } {
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, 'player faction should exist before threat_escape')
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, 'threat_escape should have an executable unit')

  const currentTile = world.map.tiles.find((tile) => tile.id === unit.tileId)
  const hasNeighbor = (world.map.connections[unit.tileId] ?? []).some((tileId) => tileId !== unit.tileId)
  const mode = hasNeighbor && (currentTile?.enemyPressure ?? 0) > 0 ? 'redeploy' : 'recover'
  return {
    mode,
    agendaActionId: mode === 'redeploy' ? 'agenda_redeploy' : 'agenda_recover',
  }
}

async function run() {
  const backend = await bootRegisteredAiPlayer('ai_player_http_command_support_contract')
  const baseUrl = backend.baseUrl

  try {
    await ensureFactionBudget(baseUrl, 1, 0, 'alliance help')
    const worldBeforeAllianceHelp = await loadWorldState(baseUrl)
    resolveAllianceHelpCandidate(worldBeforeAllianceHelp)
    const allianceDirective = Object.values(worldBeforeAllianceHelp.alliance.directives)[0]
    const allianceRegionId = allianceDirective?.regionId
    assert.ok(allianceRegionId, 'alliance_help should resolve a directive region id')
    assert.ok(allianceDirective, 'alliance_help should resolve a directive')
    const allianceCommander = worldBeforeAllianceHelp.alliance.commanders.find(
      (commander) => commander.id === allianceDirective.assignedCommanderId,
    )
    assert.ok(allianceCommander, 'alliance_help should resolve an assigned commander')
    const allianceHelp = await createApproveExecuteProposal(
      baseUrl,
      'alliance_help',
      {
        regionId: allianceRegionId,
        sourceBattleReportId: 'alliance_help_source_battle',
        sourceReplayRequestId: 'alliance_help_source_replay',
        recommendedRecoveryCommand: 'continue_war_follow_up_action',
      },
      'Alliance help command support test',
    )
    assertSuccessfulReceipt('alliance_help', allianceHelp.receipt, 'allianceHelp')
    assert.equal(allianceHelp.receipt.failureCode, null, 'alliance_help should be success receipt')
    const allianceHelpExecution = readObject(allianceHelp.receipt.execution)
    assert.equal(typeof allianceHelpExecution.status, 'string', 'alliance_help should expose execution.status')
    const allianceHelpPayload = readObject(allianceHelp.receipt.worldActionPayload)
    assert.equal(allianceHelpPayload.regionId, allianceRegionId)
    assert.equal(allianceHelpPayload.sourceBattleReportId, 'alliance_help_source_battle')
    assert.equal(allianceHelpPayload.sourceReplayRequestId, 'alliance_help_source_replay')
    assert.equal(allianceHelpPayload.recommendedRecoveryCommand, 'continue_war_follow_up_action')
    assert.ok(
      typeof allianceHelp.receipt.actionRequestId === 'string' && allianceHelp.receipt.actionRequestId.length > 0,
      'alliance_help should expose actionRequestId',
    )
    const worldAfterAllianceHelp = await loadWorldState(baseUrl)
    const allianceDirectiveAfter = worldAfterAllianceHelp.alliance.directives[allianceRegionId]
    assert.ok(allianceDirectiveAfter, 'alliance_help should preserve the target directive after execution')
    const allianceCommanderAfter = worldAfterAllianceHelp.alliance.commanders.find(
      (commander) => commander.id === allianceDirectiveAfter.assignedCommanderId,
    )
    assert.ok(allianceCommanderAfter, 'alliance_help should preserve the assigned commander after execution')
    const allianceFeedbackAction = worldAfterAllianceHelp.feedback.allianceActions.find((action) => (
      action.regionId === allianceRegionId &&
      action.factionId === FACTION_ID &&
      action.id.endsWith('-alliance-help')
    ))
    assert.ok(allianceFeedbackAction, 'alliance_help should append a traceable alliance feedback action')

    const subjectAfterAllianceHelp = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(
      subjectAfterAllianceHelp.status,
      200,
      `subject after alliance_help failed: ${JSON.stringify(subjectAfterAllianceHelp.data)}`,
    )
    const allianceSubject = readObject(readObject(subjectAfterAllianceHelp.data).subject)
    const allianceBodyItems = readArray(readObject(allianceSubject.recentBodyChanges).items).map((item) => readObject(item))
    const allianceBodyChange = allianceBodyItems.find((item) => (
      item.action === 'alliance_help' &&
      item.proposalId === String(allianceHelp.proposal.proposalId)
    ))
    assert.ok(allianceBodyChange, 'alliance_help receipt must become an AI subject alliance body change')
    assert.equal(allianceBodyChange.bodyNode, 'war_and_relations')
    assert.equal(allianceBodyChange.status, 'completed')
    assert.equal(allianceBodyChange.regionId, allianceRegionId)
    assert.equal(allianceBodyChange.allianceCommanderId, allianceDirectiveAfter.assignedCommanderId)
    assert.equal(allianceBodyChange.allianceSupportLevel, allianceDirectiveAfter.supportLevel)
    assert.equal(allianceBodyChange.allianceCommanderReadiness, allianceCommanderAfter.readiness)
    assert.equal(allianceBodyChange.allianceActionId, allianceFeedbackAction.id)
    assert.equal(allianceBodyChange.allianceActionSeverity, allianceFeedbackAction.severity)
    assert.equal(allianceBodyChange.allianceActionTileId, allianceFeedbackAction.tileId)
    assert.equal(allianceBodyChange.allianceActionTitle, allianceFeedbackAction.title)
    assert.equal(allianceBodyChange.allianceActionDetail, allianceFeedbackAction.detail)
    assert.equal(allianceBodyChange.nextSubjectFocus, 'war')
    assert.equal(allianceBodyChange.visibleToAi, true)
    assert.equal(allianceBodyChange.governanceApprovedBeforeExecution, true)
    assert.equal(allianceBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
    assert.equal(typeof allianceBodyChange.governanceApprovedAt, 'string')
    assert.equal(allianceBodyChange.executionReceiptAvailable, true)
    assert.equal(allianceBodyChange.executionWorldAction, 'allianceHelp')
    assert.equal(allianceBodyChange.executionWorldReceiptAvailable, false)
    assert.equal(allianceBodyChange.sourceBattleReportId, 'alliance_help_source_battle')
    assert.equal(allianceBodyChange.sourceReplayRequestId, 'alliance_help_source_replay')
    assert.equal(allianceBodyChange.recommendedRecoveryCommand, 'continue_war_follow_up_action')

    const allianceHistoryItems = readArray(readObject(allianceSubject.recentHistoryAnchors).items).map((item) => readObject(item))
    const allianceHistoryAnchor = allianceHistoryItems.find((item) => (
      item.action === 'alliance_help' &&
      item.proposalId === String(allianceHelp.proposal.proposalId)
    ))
    assert.ok(allianceHistoryAnchor, 'alliance_help body change must be linked to subject history')
    assert.equal(allianceHistoryAnchor.bodyNode, 'war_and_relations')
    assert.equal(allianceHistoryAnchor.status, 'completed')
    assert.equal(allianceHistoryAnchor.regionId, allianceRegionId)
    assert.equal(allianceHistoryAnchor.allianceCommanderId, allianceDirectiveAfter.assignedCommanderId)
    assert.equal(allianceHistoryAnchor.allianceSupportLevel, allianceDirectiveAfter.supportLevel)
    assert.equal(allianceHistoryAnchor.allianceCommanderReadiness, allianceCommanderAfter.readiness)
    assert.equal(allianceHistoryAnchor.allianceActionId, allianceFeedbackAction.id)
    assert.equal(allianceHistoryAnchor.allianceActionSeverity, allianceFeedbackAction.severity)
    assert.equal(allianceHistoryAnchor.allianceActionTileId, allianceFeedbackAction.tileId)
    assert.equal(allianceHistoryAnchor.allianceActionTitle, allianceFeedbackAction.title)
    assert.equal(allianceHistoryAnchor.allianceActionDetail, allianceFeedbackAction.detail)
    assert.equal(allianceHistoryAnchor.governanceApprovedBeforeExecution, true)
    assert.equal(allianceHistoryAnchor.governanceApprovedBy, GOVERNOR_PLAYER_ID)
    assert.equal(allianceHistoryAnchor.executionWorldAction, 'allianceHelp')
    const allianceSourceRefs = readObject(allianceHistoryAnchor.sourceRefs)
    assert.equal(allianceSourceRefs.sourceBattleReportId, 'alliance_help_source_battle')
    assert.equal(allianceSourceRefs.sourceReplayRequestId, 'alliance_help_source_replay')
    assert.equal(allianceSourceRefs.recommendedRecoveryCommand, 'continue_war_follow_up_action')

    const rejectedAllianceHelpCreate = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      action: 'alliance_help',
      source: 'human',
      reason: 'Alliance help rejected context readback test',
      args: {
        regionId: allianceRegionId,
        sourceBattleReportId: 'alliance_help_rejected_source_battle',
        sourceReplayRequestId: 'alliance_help_rejected_source_replay',
        recommendedRecoveryCommand: 'continue_war_follow_up_action',
      },
    }, 60_000)
    assert.equal(
      rejectedAllianceHelpCreate.status,
      200,
      `create rejected alliance_help proposal failed: ${JSON.stringify(rejectedAllianceHelpCreate.data)}`,
    )
    const rejectedAllianceHelpProposal = readObject(readObject(rejectedAllianceHelpCreate.data).proposal)
    const rejectedAllianceHelpProposalId = String(rejectedAllianceHelpProposal.proposalId)
    const rejectedAllianceHelp = await requestJson(
      baseUrl,
      `/api/ai/players/proposals/${rejectedAllianceHelpProposalId}/reject`,
      'POST',
      {
        rejectedBy: GOVERNOR_PLAYER_ID,
        rejectionReason: 'governor_declined_alliance_help',
      },
      60_000,
    )
    assert.equal(
      rejectedAllianceHelp.status,
      200,
      `reject alliance_help proposal failed: ${JSON.stringify(rejectedAllianceHelp.data)}`,
    )

    const subjectAfterRejectedAllianceHelp = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(
      subjectAfterRejectedAllianceHelp.status,
      200,
      `subject after rejected alliance_help failed: ${JSON.stringify(subjectAfterRejectedAllianceHelp.data)}`,
    )
    const rejectedAllianceSubject = readObject(readObject(subjectAfterRejectedAllianceHelp.data).subject)
    const rejectedAllianceBodyItems = readArray(readObject(rejectedAllianceSubject.recentBodyChanges).items).map((item) => readObject(item))
    const rejectedAllianceBodyChange = rejectedAllianceBodyItems.find((item) => (
      item.action === 'alliance_help' &&
      item.status === 'failed' &&
      item.proposalId === rejectedAllianceHelpProposalId
    ))
    assert.ok(rejectedAllianceBodyChange, 'rejected alliance_help proposal must become a subject governance body change')
    assert.equal(rejectedAllianceBodyChange.bodyNode, 'human_command_and_obedience')
    assert.equal(rejectedAllianceBodyChange.failureCode, 'governor_declined_alliance_help')
    assert.equal(rejectedAllianceBodyChange.regionId, allianceRegionId)
    assert.equal(rejectedAllianceBodyChange.allianceCommanderId, allianceDirectiveAfter.assignedCommanderId)
    assert.equal(rejectedAllianceBodyChange.allianceSupportLevel, allianceDirectiveAfter.supportLevel)
    assert.equal(rejectedAllianceBodyChange.allianceCommanderReadiness, allianceCommanderAfter.readiness)
    assert.equal(rejectedAllianceBodyChange.sourceBattleReportId, 'alliance_help_rejected_source_battle')
    assert.equal(rejectedAllianceBodyChange.sourceReplayRequestId, 'alliance_help_rejected_source_replay')
    assert.equal(rejectedAllianceBodyChange.recommendedRecoveryCommand, 'continue_war_follow_up_action')
    assert.equal(rejectedAllianceBodyChange.nextSubjectFocus, 'governance')

    const rejectedAllianceHistoryItems = readArray(readObject(rejectedAllianceSubject.recentHistoryAnchors).items).map((item) => readObject(item))
    const rejectedAllianceHistoryAnchor = rejectedAllianceHistoryItems.find((item) => (
      item.action === 'alliance_help' &&
      item.proposalId === rejectedAllianceHelpProposalId
    ))
    assert.ok(rejectedAllianceHistoryAnchor, 'rejected alliance_help body change must be linked to subject history')
    assert.equal(rejectedAllianceHistoryAnchor.bodyNode, 'human_command_and_obedience')
    assert.equal(rejectedAllianceHistoryAnchor.status, 'failed')
    assert.equal(rejectedAllianceHistoryAnchor.regionId, allianceRegionId)
    assert.equal(rejectedAllianceHistoryAnchor.allianceCommanderId, allianceDirectiveAfter.assignedCommanderId)
    assert.equal(rejectedAllianceHistoryAnchor.allianceSupportLevel, allianceDirectiveAfter.supportLevel)
    assert.equal(rejectedAllianceHistoryAnchor.allianceCommanderReadiness, allianceCommanderAfter.readiness)
    const rejectedAllianceSourceRefs = readObject(rejectedAllianceHistoryAnchor.sourceRefs)
    assert.equal(rejectedAllianceSourceRefs.sourceBattleReportId, 'alliance_help_rejected_source_battle')
    assert.equal(rejectedAllianceSourceRefs.sourceReplayRequestId, 'alliance_help_rejected_source_replay')
    assert.equal(rejectedAllianceSourceRefs.recommendedRecoveryCommand, 'continue_war_follow_up_action')
    const worldBeforeFormationAssign = await loadWorldState(baseUrl)
    const formationAssignCandidate = resolveFormationAssignCandidate(worldBeforeFormationAssign)
    const formationAssign = await createApproveExecuteProposal(
      baseUrl,
      'formation_assign',
      {
        heroId: formationAssignCandidate.heroId,
        tacticId: formationAssignCandidate.tacticId,
        sourceBattleReportId: 'formation_assign_source_battle',
        sourceReplayRequestId: 'formation_assign_source_replay',
        recommendedRecoveryCommand: 'continue_war_follow_up_action',
      },
      'Formation assign command support test',
    )
    assertSuccessfulReceipt('formation_assign', formationAssign.receipt, 'setGeneralTactic')
    assert.equal(formationAssign.receipt.failureCode, null, 'formation_assign should be success receipt')
    const formationPayload = readObject(formationAssign.receipt.worldActionPayload)
    assert.equal(formationPayload.sourceBattleReportId, 'formation_assign_source_battle')
    assert.equal(formationPayload.sourceReplayRequestId, 'formation_assign_source_replay')
    assert.equal(formationPayload.recommendedRecoveryCommand, 'continue_war_follow_up_action')

    const subjectAfterFormationAssign = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(
      subjectAfterFormationAssign.status,
      200,
      `subject after formation_assign failed: ${JSON.stringify(subjectAfterFormationAssign.data)}`,
    )
    const formationSubject = readObject(readObject(subjectAfterFormationAssign.data).subject)
    const formationBodyItems = readArray(readObject(formationSubject.recentBodyChanges).items).map((item) => readObject(item))
    const formationBodyChange = formationBodyItems.find((item) => (
      item.action === 'formation_assign' &&
      item.proposalId === String(formationAssign.proposal.proposalId)
    ))
    assert.ok(formationBodyChange, 'formation_assign receipt must become an AI subject formation body change')
    assert.equal(formationBodyChange.bodyNode, 'generals_and_troops')
    assert.equal(formationBodyChange.status, 'completed')
    assert.equal(formationBodyChange.heroId, formationAssignCandidate.heroId)
    assert.equal(formationBodyChange.tacticId, formationAssignCandidate.tacticId)
    assert.equal(formationBodyChange.nextSubjectFocus, 'troops')
    assert.equal(formationBodyChange.visibleToAi, true)
    assert.equal(formationBodyChange.governanceApprovedBeforeExecution, true)
    assert.equal(formationBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
    assert.equal(typeof formationBodyChange.governanceApprovedAt, 'string')
    assert.equal(formationBodyChange.executionReceiptAvailable, true)
    assert.equal(formationBodyChange.executionWorldAction, 'setGeneralTactic')
    assert.equal(formationBodyChange.executionWorldReceiptAvailable, false)
    assert.equal(formationBodyChange.sourceBattleReportId, 'formation_assign_source_battle')
    assert.equal(formationBodyChange.sourceReplayRequestId, 'formation_assign_source_replay')
    assert.equal(formationBodyChange.recommendedRecoveryCommand, 'continue_war_follow_up_action')

    const formationHistoryItems = readArray(readObject(formationSubject.recentHistoryAnchors).items).map((item) => readObject(item))
    const formationHistoryAnchor = formationHistoryItems.find((item) => (
      item.action === 'formation_assign' &&
      item.proposalId === String(formationAssign.proposal.proposalId)
    ))
    assert.ok(formationHistoryAnchor, 'formation_assign body change must be linked to subject history')
    assert.equal(formationHistoryAnchor.bodyNode, 'generals_and_troops')
    assert.equal(formationHistoryAnchor.status, 'completed')
    assert.equal(formationHistoryAnchor.heroId, formationAssignCandidate.heroId)
    assert.equal(formationHistoryAnchor.tacticId, formationAssignCandidate.tacticId)
    assert.equal(formationHistoryAnchor.governanceApprovedBeforeExecution, true)
    assert.equal(formationHistoryAnchor.governanceApprovedBy, GOVERNOR_PLAYER_ID)
    assert.equal(formationHistoryAnchor.executionWorldAction, 'setGeneralTactic')
    const formationSourceRefs = readObject(formationHistoryAnchor.sourceRefs)
    assert.equal(formationSourceRefs.sourceBattleReportId, 'formation_assign_source_battle')
    assert.equal(formationSourceRefs.sourceReplayRequestId, 'formation_assign_source_replay')
    assert.equal(formationSourceRefs.recommendedRecoveryCommand, 'continue_war_follow_up_action')

    const worldBeforeGeneralFocus = await loadWorldState(baseUrl)
    const generalFocusCandidate = resolveGeneralFocusCandidate(worldBeforeGeneralFocus)
    const generalFocus = await createApproveExecuteProposal(
      baseUrl,
      'general_focus_set',
      {
        heroId: generalFocusCandidate.heroId,
        sourceBattleReportId: 'general_focus_source_battle',
        sourceReplayRequestId: 'general_focus_source_replay',
        recommendedRecoveryCommand: 'continue_war_follow_up_action',
      },
      'General focus set command support test',
    )
    assertSuccessfulReceipt('general_focus_set', generalFocus.receipt, 'setGeneralActiveHero')
    assert.equal(generalFocus.receipt.failureCode, null, 'general_focus_set should be success receipt')
    const generalFocusPayload = readObject(generalFocus.receipt.worldActionPayload)
    assert.equal(generalFocusPayload.sourceBattleReportId, 'general_focus_source_battle')
    assert.equal(generalFocusPayload.sourceReplayRequestId, 'general_focus_source_replay')
    assert.equal(generalFocusPayload.recommendedRecoveryCommand, 'continue_war_follow_up_action')

    const subjectAfterGeneralFocus = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(
      subjectAfterGeneralFocus.status,
      200,
      `subject after general_focus_set failed: ${JSON.stringify(subjectAfterGeneralFocus.data)}`,
    )
    const generalFocusSubject = readObject(readObject(subjectAfterGeneralFocus.data).subject)
    const generalFocusBodyItems = readArray(readObject(generalFocusSubject.recentBodyChanges).items).map((item) => readObject(item))
    const generalFocusBodyChange = generalFocusBodyItems.find((item) => (
      item.action === 'general_focus_set' &&
      item.proposalId === String(generalFocus.proposal.proposalId)
    ))
    assert.ok(generalFocusBodyChange, 'general_focus_set receipt must become an AI subject general-focus body change')
    assert.equal(generalFocusBodyChange.bodyNode, 'generals_and_troops')
    assert.equal(generalFocusBodyChange.status, 'completed')
    assert.equal(generalFocusBodyChange.heroId, generalFocusCandidate.heroId)
    assert.equal(generalFocusBodyChange.nextSubjectFocus, 'troops')
    assert.equal(generalFocusBodyChange.visibleToAi, true)
    assert.equal(generalFocusBodyChange.governanceApprovedBeforeExecution, true)
    assert.equal(generalFocusBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
    assert.equal(typeof generalFocusBodyChange.governanceApprovedAt, 'string')
    assert.equal(generalFocusBodyChange.executionReceiptAvailable, true)
    assert.equal(generalFocusBodyChange.executionWorldAction, 'setGeneralActiveHero')
    assert.equal(generalFocusBodyChange.executionWorldReceiptAvailable, false)
    assert.equal(generalFocusBodyChange.sourceBattleReportId, 'general_focus_source_battle')
    assert.equal(generalFocusBodyChange.sourceReplayRequestId, 'general_focus_source_replay')
    assert.equal(generalFocusBodyChange.recommendedRecoveryCommand, 'continue_war_follow_up_action')

    const generalFocusHistoryItems = readArray(readObject(generalFocusSubject.recentHistoryAnchors).items).map((item) => readObject(item))
    const generalFocusHistoryAnchor = generalFocusHistoryItems.find((item) => (
      item.action === 'general_focus_set' &&
      item.proposalId === String(generalFocus.proposal.proposalId)
    ))
    assert.ok(generalFocusHistoryAnchor, 'general_focus_set body change must be linked to subject history')
    assert.equal(generalFocusHistoryAnchor.bodyNode, 'generals_and_troops')
    assert.equal(generalFocusHistoryAnchor.status, 'completed')
    assert.equal(generalFocusHistoryAnchor.heroId, generalFocusCandidate.heroId)
    assert.equal(generalFocusHistoryAnchor.governanceApprovedBeforeExecution, true)
    assert.equal(generalFocusHistoryAnchor.governanceApprovedBy, GOVERNOR_PLAYER_ID)
    assert.equal(generalFocusHistoryAnchor.executionWorldAction, 'setGeneralActiveHero')
    const generalFocusSourceRefs = readObject(generalFocusHistoryAnchor.sourceRefs)
    assert.equal(generalFocusSourceRefs.sourceBattleReportId, 'general_focus_source_battle')
    assert.equal(generalFocusSourceRefs.sourceReplayRequestId, 'general_focus_source_replay')
    assert.equal(generalFocusSourceRefs.recommendedRecoveryCommand, 'continue_war_follow_up_action')

    const worldBeforeTroopFacilityUpgrade = await loadWorldState(baseUrl)
    const troopFacilityUpgradeCandidate = resolveTroopFacilityUpgradeCandidate(worldBeforeTroopFacilityUpgrade)
    const troopFacilityUpgrade = await createApproveExecuteProposal(
      baseUrl,
      'troop_facility_upgrade',
      {
        unitId: troopFacilityUpgradeCandidate.unitId,
        facilityId: troopFacilityUpgradeCandidate.facilityId,
        buildingId: troopFacilityUpgradeCandidate.buildingId,
      },
      'Troop facility upgrade command support test',
    )
    assertSuccessfulReceipt('troop_facility_upgrade', troopFacilityUpgrade.receipt, 'promoteTroopFacilityBuilding')
    assert.equal(
      troopFacilityUpgrade.receipt.failureCode,
      null,
      'troop_facility_upgrade should be success receipt',
    )
    const troopFacilityWorldReceipt = readObject(troopFacilityUpgrade.receipt.worldReceipt)
    assert.equal(troopFacilityWorldReceipt.action, 'promoteTroopFacilityBuilding')
    assert.equal(troopFacilityWorldReceipt.unitId, troopFacilityUpgradeCandidate.unitId)
    assert.equal(troopFacilityWorldReceipt.facilityId, troopFacilityUpgradeCandidate.facilityId)
    assert.equal(troopFacilityWorldReceipt.buildingId, troopFacilityUpgradeCandidate.buildingId)
    assert.equal(troopFacilityWorldReceipt.previousLevel, 1)
    assert.equal(troopFacilityWorldReceipt.nextLevel, 2)

    const subjectAfterTroopFacilityUpgrade = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(
      subjectAfterTroopFacilityUpgrade.status,
      200,
      `subject after troop_facility_upgrade failed: ${JSON.stringify(subjectAfterTroopFacilityUpgrade.data)}`,
    )
    const subject = readObject(readObject(subjectAfterTroopFacilityUpgrade.data).subject)
    const recentBodyChanges = readObject(subject.recentBodyChanges)
    assert.equal(recentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
    const bodyChangeItems = readArray(recentBodyChanges.items).map((item) => readObject(item))
    const troopFacilityBodyChange = bodyChangeItems.find((item) => item.action === 'troop_facility_upgrade')
    assert.ok(troopFacilityBodyChange, 'troop_facility_upgrade receipt must become a subject body change')
    assert.equal(troopFacilityBodyChange.bodyNode, 'generals_and_troops')
    assert.equal(troopFacilityBodyChange.status, 'completed')
    assert.equal(troopFacilityBodyChange.unitId, troopFacilityUpgradeCandidate.unitId)
    assert.equal(troopFacilityBodyChange.facilityId, troopFacilityUpgradeCandidate.facilityId)
    assert.equal(troopFacilityBodyChange.buildingId, troopFacilityUpgradeCandidate.buildingId)
    assert.equal(troopFacilityBodyChange.previousLevel, 1)
    assert.equal(troopFacilityBodyChange.nextLevel, 2)
    assert.equal(troopFacilityBodyChange.nextSubjectFocus, 'troops')
    assert.equal(troopFacilityBodyChange.visibleToAi, true)
    assert.equal(troopFacilityBodyChange.governanceApprovedBeforeExecution, true)
    assert.equal(troopFacilityBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
    assert.equal(typeof troopFacilityBodyChange.governanceApprovedAt, 'string')

    const worldBeforeThreatEscape = await loadWorldState(baseUrl)
    const threatEscapeCandidate = resolveThreatEscapeCandidate(worldBeforeThreatEscape)
    const threatEscape = await createApproveExecuteProposal(
      baseUrl,
      'threat_escape',
      {
        mode: threatEscapeCandidate.mode,
        sourceBattleReportId: 'threat_escape_source_battle',
        sourceReplayRequestId: 'threat_escape_source_replay',
        recommendedRecoveryCommand: 'continue_war_follow_up_action',
      },
      'Threat escape command support test',
    )
    assertSuccessfulReceipt('threat_escape', threatEscape.receipt, 'queueAiAgendaAction')
    assert.equal(threatEscape.receipt.failureCode, null, 'threat_escape should be success receipt')
    const threatPayload = readObject(threatEscape.receipt.worldActionPayload)
    assert.equal(threatPayload.agendaActionId, threatEscapeCandidate.agendaActionId)
    assert.equal(threatPayload.sourceBattleReportId, 'threat_escape_source_battle')
    assert.equal(threatPayload.sourceReplayRequestId, 'threat_escape_source_replay')
    assert.equal(threatPayload.recommendedRecoveryCommand, 'continue_war_follow_up_action')

    const subjectAfterThreatEscape = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(
      subjectAfterThreatEscape.status,
      200,
      `subject after threat_escape failed: ${JSON.stringify(subjectAfterThreatEscape.data)}`,
    )
    const threatSubject = readObject(readObject(subjectAfterThreatEscape.data).subject)
    const threatBodyItems = readArray(readObject(threatSubject.recentBodyChanges).items).map((item) => readObject(item))
    const threatBodyChange = threatBodyItems.find((item) => (
      item.action === 'threat_escape' &&
      item.proposalId === String(threatEscape.proposal.proposalId)
    ))
    assert.ok(threatBodyChange, 'threat_escape receipt must become an AI subject threat-response body change')
    assert.equal(threatBodyChange.bodyNode, 'war_and_relations')
    assert.equal(threatBodyChange.status, 'completed')
    assert.equal(threatBodyChange.agendaActionId, threatEscapeCandidate.agendaActionId)
    assert.equal(threatBodyChange.mode, threatEscapeCandidate.mode)
    assert.equal(threatBodyChange.nextSubjectFocus, 'war')
    assert.equal(threatBodyChange.visibleToAi, true)
    assert.equal(threatBodyChange.governanceApprovedBeforeExecution, true)
    assert.equal(threatBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
    assert.equal(typeof threatBodyChange.governanceApprovedAt, 'string')
    assert.equal(threatBodyChange.executionReceiptAvailable, true)
    assert.equal(threatBodyChange.executionWorldAction, 'queueAiAgendaAction')
    assert.equal(threatBodyChange.executionWorldReceiptAvailable, false)
    assert.equal(threatBodyChange.sourceBattleReportId, 'threat_escape_source_battle')
    assert.equal(threatBodyChange.sourceReplayRequestId, 'threat_escape_source_replay')
    assert.equal(threatBodyChange.recommendedRecoveryCommand, 'continue_war_follow_up_action')

    const threatHistoryItems = readArray(readObject(threatSubject.recentHistoryAnchors).items).map((item) => readObject(item))
    const threatHistoryAnchor = threatHistoryItems.find((item) => (
      item.action === 'threat_escape' &&
      item.proposalId === String(threatEscape.proposal.proposalId)
    ))
    assert.ok(threatHistoryAnchor, 'threat_escape body change must be linked to subject history')
    assert.equal(threatHistoryAnchor.bodyNode, 'war_and_relations')
    assert.equal(threatHistoryAnchor.status, 'completed')
    assert.equal(threatHistoryAnchor.agendaActionId, threatEscapeCandidate.agendaActionId)
    assert.equal(threatHistoryAnchor.mode, threatEscapeCandidate.mode)
    assert.equal(threatHistoryAnchor.governanceApprovedBeforeExecution, true)
    assert.equal(threatHistoryAnchor.governanceApprovedBy, GOVERNOR_PLAYER_ID)
    assert.equal(threatHistoryAnchor.executionWorldAction, 'queueAiAgendaAction')
    const threatSourceRefs = readObject(threatHistoryAnchor.sourceRefs)
    assert.equal(threatSourceRefs.sourceBattleReportId, 'threat_escape_source_battle')
    assert.equal(threatSourceRefs.sourceReplayRequestId, 'threat_escape_source_replay')
    assert.equal(threatSourceRefs.recommendedRecoveryCommand, 'continue_war_follow_up_action')
  } finally {
    await backend.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_http_command_support_contract] failed:', error)
  process.exitCode = 1
})
