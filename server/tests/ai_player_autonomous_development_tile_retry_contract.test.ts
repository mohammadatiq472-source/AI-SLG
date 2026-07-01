import assert from 'node:assert/strict'
import type { AiPlayerActionReceipt } from '../../shared/contracts/aiPlayer'
import { buildAiPlayerAutonomousReadOnlyRecoverySubjectBodyChange } from '../src/application/ai/aiPlayerSubjectReadModel'
import {
  buildAiPlayerAutonomousReadOnlyRecoveryReceipt,
  buildAiPlayerAutonomousReadOnlyRecoveryResultText,
  isAiPlayerAutonomousDevelopmentFailedReceipt,
  planAiPlayerAutonomousDevelopmentStep,
  type AiPlayerAutonomousDevelopmentObservation,
} from '../src/application/ai/aiPlayerAutonomousDevelopmentService'

function buildOccupiedFalseReceipt(): AiPlayerActionReceipt {
  return {
    proposalId: 'proposal_tile_occupy_guard_loss',
    aiPlayerId: 'ai_alpha',
    governorPlayerId: 'governor_alpha',
    factionId: 'faction_alpha',
    action: 'tile_occupy',
    worldAction: 'occupyTile',
    worldActionPayload: {
      factionId: 'faction_alpha',
      aiPlayerId: 'ai_alpha',
      unitId: 'unit_alpha',
      tileId: 'tile_guard_loss',
    },
    worldReceipt: {
      action: 'occupyTile',
      factionId: 'faction_alpha',
      unitId: 'unit_alpha',
      tileId: 'tile_guard_loss',
      occupied: false,
      guardTemplateId: 'resource_guard_l5',
    } as AiPlayerActionReceipt['worldReceipt'],
    actionRequestId: 'request_guard_loss',
    ok: true,
    failureCode: null,
    message: 'Resource guard on tile_guard_loss held the tile.',
    execution: null,
    observedAt: '2026-06-14T00:00:00.000Z',
  }
}

function buildObservation(receipt: AiPlayerActionReceipt): AiPlayerAutonomousDevelopmentObservation {
  return {
    aiPlayerId: 'ai_alpha',
    factionId: 'faction_alpha',
    governorPlayerId: 'governor_alpha',
    tick: 7,
    worldVersion: 13,
    generatedAt: '2026-06-14T00:00:01.000Z',
    units: [{
      id: 'unit_alpha',
      name: 'Alpha Unit',
      tileId: 'tile_home',
      status: '待命',
      strength: 180,
      mobility: 10,
      supply: 10,
    }],
    currentTiles: [{
      id: 'tile_home',
      name: 'Home',
      type: 'city',
      owner: 'faction_alpha',
      enemyPressure: 0,
    }],
    gatheredTileIds: [],
    candidateActions: [],
    developmentPlan: {
      ok: true,
      aiPlayerId: 'ai_alpha',
      factionId: 'faction_alpha',
      targetDevelopmentPoints: 4000,
      currentDevelopmentPoints: 100,
      assignedUnits: [],
      ownedTiles: [],
      candidateTiles: [
        {
          tileId: 'tile_guard_loss',
          name: 'Guard Loss Tile',
          type: 'resource',
          owner: 'neutral',
          recommendedAction: 'march_move',
          reason: 'First candidate should be filtered after occupied:false.',
          args: {
            unitId: 'unit_alpha',
            targetTileId: 'tile_guard_loss',
          },
        },
        {
          tileId: 'tile_lower_risk',
          name: 'Lower Risk Tile',
          type: 'resource',
          owner: 'neutral',
          recommendedAction: 'march_move',
          reason: 'Lower-risk retry target.',
          args: {
            unitId: 'unit_alpha',
            targetTileId: 'tile_lower_risk',
          },
        },
      ],
      candidateActions: [],
      recommendedActions: [],
      blockers: [],
      generatedAt: '2026-06-14T00:00:01.000Z',
    } as unknown as AiPlayerAutonomousDevelopmentObservation['developmentPlan'],
    recentReceipts: [receipt],
    battleReports: {
      aiPlayerId: 'ai_alpha',
      factionId: 'faction_alpha',
      unitIds: ['unit_alpha'],
      limit: 8,
      items: [],
      count: 0,
      generatedAt: '2026-06-14T00:00:01.000Z',
    },
    buildings: {},
    queues: {},
    enemyIntel: {
      nearbyEnemyUnits: [],
      pressureTiles: [],
    },
    failureHistory: {
      recentRuntimeFailures: [],
      failedReceipts: [receipt],
    },
    subjectRecoveryCommands: [],
  }
}

function buildAbandonObservation(): AiPlayerAutonomousDevelopmentObservation {
  return {
    ...buildObservation(buildOccupiedFalseReceipt()),
    developmentPlan: {
      ok: true,
      aiPlayerId: 'ai_alpha',
      factionId: 'faction_alpha',
      targetDevelopmentPoints: 4000,
      currentDevelopmentPoints: 100,
      assignedUnits: [],
      ownedTiles: [],
      candidateTiles: [],
      candidateActions: [{
        action: 'tile_abandon',
        label: 'Abandon Tile',
        executableInV1: true,
        readiness: 'ready',
        riskLevel: 'medium',
        mappedWorldAction: 'abandonAiOwnedTile',
        args: { tileId: 'tile_spent_resource' },
        proposalArgs: { tileId: 'tile_spent_resource' },
        proposalReason: '已采集过 tile_spent_resource，当前没有更安全推进目标，释放该资源地。',
        priorityScore: 41,
        priorityReason: '已采集过的低收益资源地可释放。',
        targetTileId: 'tile_spent_resource',
        reason: '已采集过的 AI 资源地可以通过正式放弃 authority 释放。',
        blockers: [],
      }],
      recommendedActions: [],
      blockers: [],
      generatedAt: '2026-06-14T00:00:01.000Z',
    } as unknown as AiPlayerAutonomousDevelopmentObservation['developmentPlan'],
    candidateActions: [{
      action: 'tile_abandon',
      label: 'Abandon Tile',
      executableInV1: true,
      readiness: 'ready',
      riskLevel: 'medium',
      mappedWorldAction: 'abandonAiOwnedTile',
      args: { tileId: 'tile_spent_resource' },
      proposalArgs: { tileId: 'tile_spent_resource' },
      proposalReason: '已采集过 tile_spent_resource，当前没有更安全推进目标，释放该资源地。',
      priorityScore: 41,
      priorityReason: '已采集过的低收益资源地可释放。',
      targetTileId: 'tile_spent_resource',
      reason: '已采集过的 AI 资源地可以通过正式放弃 authority 释放。',
      blockers: [],
    }],
    recentReceipts: [],
    failureHistory: {
      recentRuntimeFailures: [],
      failedReceipts: [],
    },
  }
}

function buildRecoveryCommandObservation(): AiPlayerAutonomousDevelopmentObservation {
  return {
    ...buildObservation(buildOccupiedFalseReceipt()),
    developmentPlan: {
      ok: true,
      aiPlayerId: 'ai_alpha',
      factionId: 'faction_alpha',
      targetDevelopmentPoints: 4000,
      currentDevelopmentPoints: 100,
      assignedUnits: [],
      ownedTiles: [],
      candidateTiles: [],
      candidateActions: [],
      recommendedActions: [],
      blockers: [],
      generatedAt: '2026-06-14T00:00:01.000Z',
    } as unknown as AiPlayerAutonomousDevelopmentObservation['developmentPlan'],
    candidateActions: [],
    recentReceipts: [],
    failureHistory: {
      recentRuntimeFailures: [],
      failedReceipts: [],
    },
    subjectRecoveryCommands: [{
      bodyNode: 'chat_report_history',
      action: 'replay_recovery',
      status: 'failed',
      recommendedRecoveryCommand: 'open_player_history_replay_fallback',
      replayRequestId: 'replay_alpha_loss',
      recoveryAnchorKind: 'replay',
      recoveryAnchorReplayRequestId: 'replay_alpha_loss',
      recoveryAnchorReplayReason: 'missing_replay_record',
      recoveryAnchorReplayRecoverySurface: 'player_history_unavailable_replay',
      recoveryAnchorRecommendedRecoveryCommand: 'open_player_history_replay_fallback',
      nextSubjectFocus: 'history',
    }],
  }
}

function buildAlreadyReadRecoveryCommandObservation(): AiPlayerAutonomousDevelopmentObservation {
  const observation = buildRecoveryCommandObservation()
  return {
    ...observation,
    subjectRecoveryCommands: [
      {
        bodyNode: 'chat_report_history',
        action: 'battle_report_read',
        status: 'completed',
        recommendedRecoveryCommand: 'open_player_history_replay_fallback',
        replayRequestId: 'replay_alpha_loss',
        recoveryAnchorKind: 'replay',
        recoveryAnchorReplayRequestId: 'replay_alpha_loss',
        recoveryAnchorRecommendedRecoveryCommand: 'open_player_history_replay_fallback',
        nextSubjectFocus: 'history',
      },
      ...observation.subjectRecoveryCommands,
    ],
  }
}

function buildSaveRecoveryCommandObservation(): AiPlayerAutonomousDevelopmentObservation {
  return {
    ...buildRecoveryCommandObservation(),
    subjectRecoveryCommands: [{
      bodyNode: 'chat_report_history',
      action: 'load_slot',
      status: 'failed',
      recommendedRecoveryCommand: 'open_save_slot_list',
      saveSlotId: 'slot_missing_alpha',
      saveRecoveryStatus: 'restore_failed',
      recoveryAnchorKind: 'save',
      recoveryAnchorRecommendedRecoveryCommand: 'open_save_slot_list',
      nextSubjectFocus: 'history',
    }],
  }
}

function buildLandRecoveryCommandObservation(): AiPlayerAutonomousDevelopmentObservation {
  return {
    ...buildRecoveryCommandObservation(),
    subjectRecoveryCommands: [{
      bodyNode: 'land_level_and_expansion',
      action: 'tile_occupy',
      status: 'failed',
      recommendedRecoveryCommand: 'retry_or_select_alternate_land_target',
      nextSubjectFocus: 'land',
    }],
  }
}

function buildWarFollowUpCommandObservation(): AiPlayerAutonomousDevelopmentObservation {
  return {
    ...buildRecoveryCommandObservation(),
    subjectRecoveryCommands: [{
      bodyNode: 'war_and_relations',
      action: 'battle_report_read',
      status: 'failed',
      recommendedRecoveryCommand: 'continue_war_follow_up_action',
      replayRequestId: 'replay_alpha_loss',
      recoveryAnchorKind: 'replay',
      recoveryAnchorReplayRequestId: 'replay_alpha_loss',
      nextSubjectFocus: 'war',
    }],
  }
}

function buildReadyWarFollowUpCommandObservation(): AiPlayerAutonomousDevelopmentObservation {
  return {
    ...buildRecoveryCommandObservation(),
    subjectRecoveryCommands: [{
      bodyNode: 'war_and_relations',
      action: 'battle_report_read',
      status: 'failed',
      recommendedRecoveryCommand: 'continue_war_follow_up_action',
      battleReportId: 'battle_alpha_loss',
      replayRequestId: 'replay_alpha_loss',
      warFollowUpAction: 'troop_heal',
      warFollowUpArgs: { unitId: 'unit_alpha' },
      warFollowUpReadiness: 'ready',
      warFollowUpReason: '战斗损失偏高，先整补补兵或驻防，避免继续推进。',
      nextSubjectFocus: 'war',
    }],
  }
}

function buildAllianceGovernanceFailureCommandObservation(): AiPlayerAutonomousDevelopmentObservation {
  return {
    ...buildRecoveryCommandObservation(),
    subjectRecoveryCommands: [{
      bodyNode: 'human_command_and_obedience',
      action: 'alliance_help',
      status: 'failed',
      recommendedRecoveryCommand: 'assign_alliance_commander_then_retry',
      nextSubjectFocus: 'governance',
      governanceAttemptedWorldAction: 'allianceHelp',
      governanceFailureDetail: 'alliance_help region region_alpha has no assigned commander',
      allianceCommanderId: 'alliance_commander_missing_alpha',
      allianceCommanderMissing: true,
    }],
  }
}

function buildAlreadyReadSaveRecoveryCommandObservation(): AiPlayerAutonomousDevelopmentObservation {
  const observation = buildSaveRecoveryCommandObservation()
  return {
    ...observation,
    subjectRecoveryCommands: [
      {
        bodyNode: 'chat_report_history',
        action: 'activity_window_enter',
        status: 'completed',
        recommendedRecoveryCommand: 'open_save_slot_list',
        saveSlotId: 'slot_missing_alpha',
        saveRecoveryStatus: 'restore_failed',
        recoveryAnchorKind: 'save',
        recoveryAnchorRecommendedRecoveryCommand: 'open_save_slot_list',
        nextSubjectFocus: 'history',
      },
      ...observation.subjectRecoveryCommands,
    ],
  }
}

function run() {
  const receipt = buildOccupiedFalseReceipt()
  assert.equal(
    isAiPlayerAutonomousDevelopmentFailedReceipt(receipt),
    true,
    'tile_occupy occupied:false should enter autonomous failure history even when receipt.ok is true',
  )

  const planned = planAiPlayerAutonomousDevelopmentStep(buildObservation(receipt))
  assert.equal(planned.error, undefined)
  assert.equal(planned.decision?.action, 'march_move')
  assert.equal(
    planned.decision?.args.targetTileId,
    'tile_lower_risk',
    'planner should skip the occupied:false target and move to the lower-risk candidate',
  )

  const abandonPlanned = planAiPlayerAutonomousDevelopmentStep(buildAbandonObservation())
  assert.equal(abandonPlanned.error, undefined)
  assert.equal(
    abandonPlanned.decision?.action,
    'tile_abandon',
    'planner should select a ready tile_abandon candidate when no safer development action is available',
  )
  assert.equal(abandonPlanned.decision?.args.tileId, 'tile_spent_resource')

  const recoveryPlanned = planAiPlayerAutonomousDevelopmentStep(buildRecoveryCommandObservation())
  assert.equal(recoveryPlanned.error, undefined)
  assert.equal(
    recoveryPlanned.decision?.action,
    'battle_report_read',
    'planner should use subject recovery commands as a read-only battle report recovery decision when no executable development action exists',
  )
  assert.equal(recoveryPlanned.decision?.args.recommendedRecoveryCommand, 'open_player_history_replay_fallback')
  assert.equal(recoveryPlanned.decision?.args.replayRequestId, 'replay_alpha_loss')
  assert.equal(recoveryPlanned.decision?.args.executionMode, 'read_model_only')
  assert.equal(recoveryPlanned.decision?.args.readOnlyRecovery, true)
  assert.equal(recoveryPlanned.decision?.plannerSource, 'rule')

  const recoveryReceipt = buildAiPlayerAutonomousReadOnlyRecoveryReceipt({
    aiPlayerId: 'ai_alpha',
    governorPlayerId: 'governor_alpha',
    factionId: 'faction_alpha',
  }, recoveryPlanned.decision)
  assert.equal(recoveryReceipt.ok, true)
  assert.equal(recoveryReceipt.action, 'battle_report_read')
  assert.equal(recoveryReceipt.worldAction, null)
  assert.equal(recoveryReceipt.actionRequestId, null)
  assert.equal(recoveryReceipt.execution && typeof recoveryReceipt.execution, 'object')
  assert.equal(
    (recoveryReceipt.execution as { kind?: string }).kind,
    'autonomous_read_only_recovery',
    'battle_report_read recovery should stay a read-model receipt instead of an executable proposal',
  )
  assert.equal(
    (recoveryReceipt.execution as { recommendedRecoveryCommand?: string }).recommendedRecoveryCommand,
    'open_player_history_replay_fallback',
  )

  const recoveryBodyChange = buildAiPlayerAutonomousReadOnlyRecoverySubjectBodyChange(recoveryReceipt)
  assert.ok(recoveryBodyChange, 'read-only recovery receipt should become subject chat/report/history memory')
  assert.equal(recoveryBodyChange.bodyNode, 'chat_report_history')
  assert.equal(recoveryBodyChange.action, 'battle_report_read')
  assert.equal(recoveryBodyChange.status, 'completed')
  assert.equal(recoveryBodyChange.proposalId, recoveryReceipt.proposalId)
  assert.equal(recoveryBodyChange.executionReceiptAvailable, true)
  assert.equal(recoveryBodyChange.executionWorldAction, null)
  assert.equal(recoveryBodyChange.executionWorldReceiptAvailable, false)
  assert.equal(recoveryBodyChange.recommendedRecoveryCommand, 'open_player_history_replay_fallback')
  assert.equal(recoveryBodyChange.replayRequestId, 'replay_alpha_loss')
  assert.equal(recoveryBodyChange.nextSubjectFocus, 'history')
  assert.equal(recoveryBodyChange.visibleToAi, true)

  const alreadyReadPlanned = planAiPlayerAutonomousDevelopmentStep(buildAlreadyReadRecoveryCommandObservation())
  assert.equal(alreadyReadPlanned.error, undefined)
  assert.equal(
    alreadyReadPlanned.decision?.action,
    'next_step_propose',
    'planner should not repeat a replay recovery command that already has a completed read-only battle_report_read body memory',
  )

  const saveRecoveryPlanned = planAiPlayerAutonomousDevelopmentStep(buildSaveRecoveryCommandObservation())
  assert.equal(saveRecoveryPlanned.error, undefined)
  assert.equal(
    saveRecoveryPlanned.decision?.action,
    'activity_window_enter',
    'planner should use save recovery commands as a read-only history/save recovery decision when no executable development action exists',
  )
  assert.equal(saveRecoveryPlanned.decision?.args.recommendedRecoveryCommand, 'open_save_slot_list')
  assert.equal(saveRecoveryPlanned.decision?.args.saveSlotId, 'slot_missing_alpha')
  assert.equal(saveRecoveryPlanned.decision?.args.saveRecoveryStatus, 'restore_failed')
  assert.equal(saveRecoveryPlanned.decision?.args.executionMode, 'read_model_only')
  assert.equal(saveRecoveryPlanned.decision?.args.readOnlyRecovery, true)

  const saveRecoveryReceipt = buildAiPlayerAutonomousReadOnlyRecoveryReceipt({
    aiPlayerId: 'ai_alpha',
    governorPlayerId: 'governor_alpha',
    factionId: 'faction_alpha',
  }, saveRecoveryPlanned.decision)
  assert.equal(saveRecoveryReceipt.ok, true)
  assert.equal(saveRecoveryReceipt.action, 'activity_window_enter')
  assert.equal(saveRecoveryReceipt.worldAction, null)
  const saveRecoveryBodyChange = buildAiPlayerAutonomousReadOnlyRecoverySubjectBodyChange(saveRecoveryReceipt)
  assert.ok(saveRecoveryBodyChange, 'save read-only recovery receipt should become subject chat/report/history memory')
  assert.equal(saveRecoveryBodyChange.bodyNode, 'chat_report_history')
  assert.equal(saveRecoveryBodyChange.action, 'activity_window_enter')
  assert.equal(saveRecoveryBodyChange.status, 'completed')
  assert.equal(saveRecoveryBodyChange.recommendedRecoveryCommand, 'open_save_slot_list')
  assert.equal(saveRecoveryBodyChange.saveSlotId, 'slot_missing_alpha')
  assert.equal(saveRecoveryBodyChange.saveRecoveryStatus, 'restore_failed')
  assert.equal(saveRecoveryBodyChange.executionReceiptAvailable, true)
  assert.equal(saveRecoveryBodyChange.executionWorldAction, null)
  assert.equal(saveRecoveryBodyChange.executionWorldReceiptAvailable, false)
  assert.equal(saveRecoveryBodyChange.nextSubjectFocus, 'history')

  const saveRecoveryText = buildAiPlayerAutonomousReadOnlyRecoveryResultText(saveRecoveryPlanned.decision)
  assert.equal(saveRecoveryText.includes('activity_window_enter'), false)
  assert.equal(saveRecoveryText.includes('read_model_only'), false)
  assert.match(saveRecoveryText, /存档|历史/)

  const replayRecoveryText = buildAiPlayerAutonomousReadOnlyRecoveryResultText(recoveryPlanned.decision)
  assert.equal(replayRecoveryText.includes('battle_report_read'), false)
  assert.equal(replayRecoveryText.includes('read_model_only'), false)
  assert.match(replayRecoveryText, /战报|回放/)

  const alreadyReadSavePlanned = planAiPlayerAutonomousDevelopmentStep(buildAlreadyReadSaveRecoveryCommandObservation())
  assert.equal(alreadyReadSavePlanned.error, undefined)
  assert.equal(
    alreadyReadSavePlanned.decision?.action,
    'next_step_propose',
    'planner should not repeat a save recovery command that already has a completed read-only activity_window_enter body memory for the same slot',
  )

  const landRecoveryPlanned = planAiPlayerAutonomousDevelopmentStep(buildLandRecoveryCommandObservation())
  assert.equal(landRecoveryPlanned.error, undefined)
  assert.equal(
    landRecoveryPlanned.decision?.action,
    'next_step_propose',
    'land recovery command should remain next-cycle memory and should not become a read-only replay/save recovery action',
  )

  const warFollowUpPlanned = planAiPlayerAutonomousDevelopmentStep(buildWarFollowUpCommandObservation())
  assert.equal(warFollowUpPlanned.error, undefined)
  assert.equal(
    warFollowUpPlanned.decision?.action,
    'next_step_propose',
    'war follow-up command should remain next-cycle war memory and should not become a read-only replay/save recovery action',
  )

  const readyWarFollowUpPlanned = planAiPlayerAutonomousDevelopmentStep(buildReadyWarFollowUpCommandObservation())
  assert.equal(readyWarFollowUpPlanned.error, undefined)
  assert.equal(
    readyWarFollowUpPlanned.decision?.action,
    'troop_heal',
    'ready war follow-up command should become the structured follow-up action decision',
  )
  assert.equal(readyWarFollowUpPlanned.decision?.args.unitId, 'unit_alpha')
  assert.equal(readyWarFollowUpPlanned.decision?.args.recommendedRecoveryCommand, 'continue_war_follow_up_action')
  assert.equal(readyWarFollowUpPlanned.decision?.args.sourceBattleReportId, 'battle_alpha_loss')
  assert.equal(readyWarFollowUpPlanned.decision?.args.sourceReplayRequestId, 'replay_alpha_loss')
  assert.equal(readyWarFollowUpPlanned.decision?.plannerSource, 'rule')

  const allianceGovernancePlanned = planAiPlayerAutonomousDevelopmentStep(buildAllianceGovernanceFailureCommandObservation())
  assert.equal(allianceGovernancePlanned.error, undefined)
  assert.equal(
    allianceGovernancePlanned.decision?.action,
    'activity_window_enter',
    'alliance governance failure should become a read-only governance recovery decision instead of blindly retrying alliance_help',
  )
  assert.equal(allianceGovernancePlanned.decision?.args.recommendedRecoveryCommand, 'assign_alliance_commander_then_retry')
  assert.equal(allianceGovernancePlanned.decision?.args.executionMode, 'read_model_only')
  assert.equal(allianceGovernancePlanned.decision?.args.readOnlyRecovery, true)
  assert.equal(allianceGovernancePlanned.decision?.args.nextSubjectFocus, 'governance')
  assert.equal(allianceGovernancePlanned.decision?.args.governanceAttemptedWorldAction, 'allianceHelp')
  assert.equal(allianceGovernancePlanned.decision?.args.allianceCommanderMissing, true)
  assert.equal(allianceGovernancePlanned.decision?.plannerSource, 'rule')

  const allianceGovernanceReceipt = buildAiPlayerAutonomousReadOnlyRecoveryReceipt({
    aiPlayerId: 'ai_alpha',
    governorPlayerId: 'governor_alpha',
    factionId: 'faction_alpha',
  }, allianceGovernancePlanned.decision)
  assert.equal(allianceGovernanceReceipt.ok, true)
  assert.equal(allianceGovernanceReceipt.action, 'activity_window_enter')
  assert.equal(allianceGovernanceReceipt.worldAction, null)
  assert.equal(
    (allianceGovernanceReceipt.execution as { recommendedRecoveryCommand?: string }).recommendedRecoveryCommand,
    'assign_alliance_commander_then_retry',
  )
  assert.equal(
    (allianceGovernanceReceipt.execution as { nextSubjectFocus?: string }).nextSubjectFocus,
    'governance',
  )
  const allianceGovernanceBodyChange = buildAiPlayerAutonomousReadOnlyRecoverySubjectBodyChange(allianceGovernanceReceipt)
  assert.ok(allianceGovernanceBodyChange, 'alliance governance read-only recovery receipt should become subject memory')
  assert.equal(allianceGovernanceBodyChange.bodyNode, 'chat_report_history')
  assert.equal(allianceGovernanceBodyChange.action, 'activity_window_enter')
  assert.equal(allianceGovernanceBodyChange.status, 'completed')
  assert.equal(allianceGovernanceBodyChange.recommendedRecoveryCommand, 'assign_alliance_commander_then_retry')
  assert.equal(allianceGovernanceBodyChange.nextSubjectFocus, 'governance')
  assert.equal(allianceGovernanceBodyChange.governanceAttemptedWorldAction, 'allianceHelp')
  assert.equal(allianceGovernanceBodyChange.governanceFailureDetail, 'alliance_help region region_alpha has no assigned commander')
  assert.equal(allianceGovernanceBodyChange.allianceCommanderId, 'alliance_commander_missing_alpha')
  assert.equal(allianceGovernanceBodyChange.allianceCommanderMissing, true)
  assert.equal(allianceGovernanceBodyChange.executionReceiptAvailable, true)
  assert.equal(allianceGovernanceBodyChange.executionWorldAction, null)
  const allianceGovernanceText = buildAiPlayerAutonomousReadOnlyRecoveryResultText(allianceGovernancePlanned.decision)
  assert.equal(allianceGovernanceText.includes('activity_window_enter'), false)
  assert.equal(allianceGovernanceText.includes('read_model_only'), false)
  assert.match(allianceGovernanceText, /同盟|指挥|治理|命令/)
}

run()
