import { randomUUID } from 'node:crypto'
import type {
  AiPlayerActionArgs,
  AiPlayerActionProposalRequest,
  AiPlayerActionReceipt,
  AiPlayerActionType,
  AiPlayerAutonomousPersonalReport,
  AiPlayerDevelopmentPlan,
  AiPlayerDevelopmentPlanCandidateAction,
  GovernedAiPlayerRuntimeDetail,
} from '../../../../shared/contracts/aiPlayer'
import type { Tile, Unit, WorldState } from '../../../../shared/contracts/game/world'
import { getAiRuntimeObservabilitySnapshot, getWorldStateReadonly } from '../world/WorldService'
import {
  approveAiPlayerActionProposal,
  createAiPlayerActionProposal,
  executeAiPlayerActionProposal,
  getGovernedAiPlayerRuntime,
  listAiPlayerActionReceipts,
} from './AIPlayerGovernanceService'
import { buildAiPlayerBattleReportReadModel } from './aiPlayerBattleReportReadModel'
import { buildAiPlayerDevelopmentPlan } from './aiPlayerDevelopmentPlanReadModel'
import { recordAiPlayerAutonomousDevelopmentResultInChat } from './aiPlayerChatCommandService'
import { resolveAiPlayerRuntimeModelTargetCandidates } from './aiPlayerRuntimeModelTarget'
import {
  parseAiPlayerRuntimeProposalJson,
  requestAiPlayerRuntimeProposalFromCandidateTargets,
  toAiPlayerActionProposalRequests,
  type AiPlayerRuntimeProposalObservation,
} from './aiPlayerRuntimeProposalModel'
import {
  commitAiPlayerProviderBudgetReservation,
  recordAiPlayerProviderModelRequestAccounting,
  releaseAiPlayerProviderAiCommandCreditReservation,
  releaseAiPlayerProviderBudgetReservation,
  reserveAiPlayerProviderAiCommandCredits,
  reserveAiPlayerProviderBudget,
} from './aiPlayerProviderAccountStore'
import { scheduleAiPlayerGovernancePersist, storeAiPlayerActionReceipt } from './aiPlayerGovernancePersist'
import { buildAiPlayerSubjectReadModel } from './aiPlayerSubjectReadModel'
import {
  autonomousPersonalReportsByAiPlayer,
  cloneValue,
  MAX_PERSISTED_AUTONOMOUS_PERSONAL_REPORTS_PER_PLAYER,
} from './aiPlayerGovernanceState'

export type AiPlayerAutonomousDevelopmentObservation = {
  aiPlayerId: string
  factionId: string
  governorPlayerId: string
  tick: number
  worldVersion: number
  generatedAt: string
  units: Array<Pick<Unit, 'id' | 'name' | 'tileId' | 'status' | 'strength' | 'mobility' | 'supply'>>
  currentTiles: Array<Pick<Tile, 'id' | 'name' | 'type' | 'owner' | 'enemyPressure' | 'resourceKind' | 'resourceLevel'>>
  gatheredTileIds: string[]
  candidateActions: AiPlayerDevelopmentPlanCandidateAction[]
  developmentPlan: AiPlayerDevelopmentPlan
  recentReceipts: AiPlayerActionReceipt[]
  battleReports: ReturnType<typeof buildAiPlayerBattleReportReadModel>
  buildings: unknown
  queues: unknown
  enemyIntel: {
    nearbyEnemyUnits: Array<Pick<Unit, 'id' | 'name' | 'faction' | 'tileId' | 'strength' | 'supply'>>
    pressureTiles: Array<Pick<Tile, 'id' | 'name' | 'type' | 'owner' | 'enemyPressure' | 'resourceKind' | 'resourceLevel'>>
  }
  failureHistory: {
    recentRuntimeFailures: unknown[]
    failedReceipts: AiPlayerActionReceipt[]
  }
  subjectRecoveryCommands: AiPlayerAutonomousDevelopmentSubjectRecoveryCommand[]
}

export type AiPlayerAutonomousDevelopmentSubjectRecoveryCommand = {
  bodyNode: string
  action: string
  status?: string
  recommendedRecoveryCommand: string
  battleReportId?: string
  replayRequestId?: string
  saveSlotId?: string
  saveRecoveryStatus?: string
  replayAccessDeniedReason?: string
  replayAccessDeniedHttpStatus?: number
  recoveryAnchorKind?: string
  recoveryAnchorReplayRequestId?: string
  recoveryAnchorReplayReason?: string
  recoveryAnchorReplayRecoverySurface?: string
  recoveryAnchorRecommendedRecoveryCommand?: string
  warFollowUpAction?: string
  warFollowUpArgs?: Record<string, unknown>
  warFollowUpReadiness?: string
  warFollowUpReason?: string
  governanceAttemptedWorldAction?: string
  governanceFailureDetail?: string
  regionId?: string
  allianceCommanderId?: string
  allianceCommanderMissing?: boolean
  nextSubjectFocus?: string
}

export type AiPlayerAutonomousDevelopmentPlannerDecision = {
  action: AiPlayerActionType
  args: Record<string, unknown>
  reason: string
  plannerSource: 'rule' | 'llm'
  model?: string
  candidate?: AiPlayerDevelopmentPlanCandidateAction
}

export type AiPlayerAutonomousDevelopmentRunStep = {
  order: number
  observation: AiPlayerAutonomousDevelopmentObservation
  plannerDecision: AiPlayerAutonomousDevelopmentPlannerDecision
  selectedAction: AiPlayerActionType
  proposalId: string
  receipt: AiPlayerActionReceipt
  naturalLanguageResult: string
  personalReport: AiPlayerAutonomousPersonalReport
}

export type AiPlayerAutonomousDevelopmentRun = {
  ok: true
  runId: string
  aiPlayerId: string
  factionId: string
  governorPlayerId: string
  stepCount: number
  requestedMaxSteps: number
  startedAt: string
  completedAt: string
  steps: AiPlayerAutonomousDevelopmentRunStep[]
  personalReports: AiPlayerAutonomousPersonalReport[]
}

export type RunAiPlayerAutonomousDevelopmentInput = {
  maxSteps?: number
  goalPower?: number
  targetDevelopmentPoints?: number
  triggeredBy?: string
  plannerMode?: 'rule' | 'llm'
}

const AUTONOMOUS_DEVELOPMENT_ACTION_PRIORITY: AiPlayerActionType[] = [
  'resource_gather',
  'tile_occupy',
  'march_move',
  'tile_abandon',
  'troop_heal',
  'troop_train',
  'queue_fill_idle_slot',
  'tactical_skill_upgrade',
  'building_upgrade',
]
export const AI_PLAYER_AUTONOMOUS_DEVELOPMENT_MAX_STEPS = 500

function nowIso() {
  return new Date().toISOString()
}

function randomId(prefix: string) {
  return `${prefix}_${randomUUID()}`
}

function clampStepCount(value: unknown) {
  const numeric = Number(value ?? 1)
  if (!Number.isFinite(numeric)) {
    return 1
  }
  return Math.max(1, Math.min(AI_PLAYER_AUTONOMOUS_DEVELOPMENT_MAX_STEPS, Math.trunc(numeric)))
}

function resolveTargetDevelopmentPoints(input: RunAiPlayerAutonomousDevelopmentInput) {
  const raw = input.targetDevelopmentPoints ?? input.goalPower
  const numeric = Number(raw ?? Number.NaN)
  if (!Number.isFinite(numeric)) {
    return undefined
  }
  return Math.max(1, Math.min(100000, Math.trunc(numeric)))
}

function selectAssignedUnits(world: WorldState, runtime: GovernedAiPlayerRuntimeDetail) {
  const faction = world.factions[runtime.factionId]
  const assignedUnitIds = new Set(
    (faction?.aiPlayers ?? [])
      .find((player) => player.id === runtime.aiPlayerId)
      ?.unitIds ?? [],
  )
  return world.units.filter((unit) => assignedUnitIds.has(unit.id))
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

export function isAiPlayerAutonomousDevelopmentFailedReceipt(receipt: AiPlayerActionReceipt) {
  if (!receipt.ok) {
    return true
  }
  if (receipt.action !== 'tile_occupy') {
    return false
  }
  const worldReceipt = readRecord(receipt.worldReceipt)
  const execution = readRecord(receipt.execution)
  const executionReceipt = readRecord(execution.receipt)
  return worldReceipt.occupied === false || executionReceipt.occupied === false
}

function buildEnemyIntel(world: WorldState, runtime: GovernedAiPlayerRuntimeDetail, units: Unit[]) {
  const currentAndNeighborTileIds = new Set<string>()
  for (const unit of units) {
    currentAndNeighborTileIds.add(unit.tileId)
    for (const tileId of world.map.connections[unit.tileId] ?? []) {
      currentAndNeighborTileIds.add(tileId)
    }
  }
  const pressureTiles = world.map.tiles
    .filter((tile) => currentAndNeighborTileIds.has(tile.id) && tile.enemyPressure > 0)
    .sort((left, right) => right.enemyPressure - left.enemyPressure || left.id.localeCompare(right.id))
    .slice(0, 8)
    .map((tile) => ({
      id: tile.id,
      name: tile.name,
      type: tile.type,
      owner: tile.owner,
      enemyPressure: tile.enemyPressure,
      resourceKind: tile.resourceKind,
      resourceLevel: tile.resourceLevel,
    }))
  const nearbyEnemyUnits = world.units
    .filter((unit) => unit.faction !== runtime.factionId && currentAndNeighborTileIds.has(unit.tileId))
    .slice(0, 8)
    .map((unit) => ({
      id: unit.id,
      name: unit.name,
      faction: unit.faction,
      tileId: unit.tileId,
      strength: unit.strength,
      supply: unit.supply,
    }))
  return {
    nearbyEnemyUnits,
    pressureTiles,
  }
}

function buildSubjectRecoveryCommandsForAutonomousObservation(
  runtime: GovernedAiPlayerRuntimeDetail,
): AiPlayerAutonomousDevelopmentSubjectRecoveryCommand[] {
  const subject = buildAiPlayerSubjectReadModel(runtime, {
    receiptLimit: 20,
    battleResultLimit: 8,
  })
  const commands: AiPlayerAutonomousDevelopmentSubjectRecoveryCommand[] = []
  const seen = new Set<string>()
  for (const bodyChange of subject.recentBodyChanges.items) {
    const command = readString(bodyChange.recommendedRecoveryCommand)
    const recoveryAnchorCommand = readString(bodyChange.recoveryAnchorRecommendedRecoveryCommand)
    const selectedCommand = command || recoveryAnchorCommand
    if (!selectedCommand) {
      continue
    }
    const key = [
      bodyChange.bodyNode,
      bodyChange.action,
      selectedCommand,
      bodyChange.replayRequestId ?? bodyChange.recoveryAnchorReplayRequestId ?? '',
      bodyChange.saveSlotId ?? '',
      bodyChange.regionId ?? '',
    ].join(':')
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    commands.push({
      bodyNode: bodyChange.bodyNode,
      action: bodyChange.action,
      status: bodyChange.status,
      recommendedRecoveryCommand: selectedCommand,
      battleReportId: bodyChange.battleReportId,
      replayRequestId: bodyChange.replayRequestId,
      saveSlotId: bodyChange.saveSlotId,
      saveRecoveryStatus: bodyChange.saveRecoveryStatus,
      replayAccessDeniedReason: bodyChange.replayAccessDeniedReason,
      replayAccessDeniedHttpStatus: bodyChange.replayAccessDeniedHttpStatus,
      recoveryAnchorKind: bodyChange.recoveryAnchorKind,
      recoveryAnchorReplayRequestId: bodyChange.recoveryAnchorReplayRequestId,
      recoveryAnchorReplayReason: bodyChange.recoveryAnchorReplayReason,
      recoveryAnchorReplayRecoverySurface: bodyChange.recoveryAnchorReplayRecoverySurface,
      recoveryAnchorRecommendedRecoveryCommand: bodyChange.recoveryAnchorRecommendedRecoveryCommand,
      warFollowUpAction: bodyChange.warFollowUpAction,
      warFollowUpArgs: bodyChange.warFollowUpArgs,
      warFollowUpReadiness: bodyChange.warFollowUpReadiness,
      warFollowUpReason: bodyChange.warFollowUpReason,
      governanceAttemptedWorldAction: bodyChange.governanceAttemptedWorldAction,
      governanceFailureDetail: bodyChange.governanceFailureDetail,
      regionId: bodyChange.regionId,
      allianceCommanderId: bodyChange.allianceCommanderId,
      allianceCommanderMissing: bodyChange.allianceCommanderMissing,
      nextSubjectFocus: bodyChange.nextSubjectFocus,
    })
  }
  for (const anchor of subject.recentRecoveryAnchors.items) {
    const command = readString(anchor.sourceRefs.recommendedRecoveryCommand)
    if (!command) {
      continue
    }
    const replayRequestId = anchor.sourceRefs.replayRequestId
    const saveSlotId = anchor.sourceRefs.saveSlotId
    const regionId = anchor.sourceRefs.regionId
    const key = [
      'recovery_anchor',
      anchor.kind,
      command,
      replayRequestId ?? '',
      saveSlotId ?? '',
      regionId ?? '',
    ].join(':')
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    commands.push({
      bodyNode: 'chat_report_history',
      action: anchor.kind === 'replay' ? 'replay_recovery' : 'save_recovery',
      status: anchor.sourceRefs.replayRecoveryStatus === 'available' ? 'completed' : 'failed',
      recommendedRecoveryCommand: command,
      replayRequestId,
      saveSlotId,
      regionId,
      saveRecoveryStatus: anchor.sourceRefs.saveRecoveryStatus,
      recoveryAnchorKind: anchor.kind,
      recoveryAnchorReplayRequestId: replayRequestId,
      recoveryAnchorReplayReason: anchor.sourceRefs.replayRecoveryReason,
      recoveryAnchorReplayRecoverySurface: anchor.sourceRefs.replayRecoverySurface,
      recoveryAnchorRecommendedRecoveryCommand: command,
      nextSubjectFocus: 'history',
    })
  }
  return commands.slice(0, 12)
}

export function buildAiPlayerAutonomousDevelopmentObservation(
  aiPlayerId: string,
  input: RunAiPlayerAutonomousDevelopmentInput = {},
): { observation?: AiPlayerAutonomousDevelopmentObservation; runtime?: GovernedAiPlayerRuntimeDetail; error?: string } {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    return { error: `ai player not found: ${aiPlayerId}` }
  }
  const world = getWorldStateReadonly()
  const units = selectAssignedUnits(world, runtime)
  const currentTiles = units
    .map((unit) => world.map.tiles.find((tile) => tile.id === unit.tileId))
    .filter((tile): tile is Tile => Boolean(tile))
  const gatheredTileIds = Object.keys(world.factions[runtime.factionId]?.aiResourceGatherClaims ?? {})
  const developmentPlan = buildAiPlayerDevelopmentPlan(runtime, {
    targetDevelopmentPoints: resolveTargetDevelopmentPoints(input),
  })
  const recentReceipts = listAiPlayerActionReceipts(runtime.aiPlayerId, 32)
  const observability = getAiRuntimeObservabilitySnapshot({
    factionId: runtime.factionId,
    eventLimit: 8,
  })
  const recentRuntimeFailures = runtime.observability.recentFailures?.samples
    ?? observability.runtime.recentFailures?.samples
    ?? []

  return {
    runtime,
    observation: {
      aiPlayerId: runtime.aiPlayerId,
      factionId: runtime.factionId,
      governorPlayerId: runtime.governorPlayerId,
      tick: world.tick,
      worldVersion: world.worldVersion,
      generatedAt: nowIso(),
      units: units.map((unit) => ({
        id: unit.id,
        name: unit.name,
        tileId: unit.tileId,
        status: unit.status,
        strength: unit.strength,
        mobility: unit.mobility,
        supply: unit.supply,
      })),
      currentTiles: currentTiles.map((tile) => ({
        id: tile.id,
        name: tile.name,
        type: tile.type,
        owner: tile.owner,
        enemyPressure: tile.enemyPressure,
        resourceKind: tile.resourceKind,
        resourceLevel: tile.resourceLevel,
      })),
      gatheredTileIds,
      candidateActions: developmentPlan.candidateActions,
      developmentPlan,
      recentReceipts,
      battleReports: buildAiPlayerBattleReportReadModel(runtime, 8),
      buildings: world.slgDomainState?.cityBuildingGroupsByCity ?? {},
      queues: world.slgDomainState?.affairsQueueByCity ?? {},
      enemyIntel: buildEnemyIntel(world, runtime, units),
      failureHistory: {
        recentRuntimeFailures,
        failedReceipts: recentReceipts.filter(isAiPlayerAutonomousDevelopmentFailedReceipt),
      },
      subjectRecoveryCommands: buildSubjectRecoveryCommandsForAutonomousObservation(runtime),
    },
  }
}

function hasExecutableArgs(candidate: AiPlayerDevelopmentPlanCandidateAction) {
  return Boolean(candidate.proposalArgs ?? candidate.args)
}

function findReadyExecutableCandidate(
  observation: AiPlayerAutonomousDevelopmentObservation,
  action: AiPlayerActionType,
) {
  return observation.candidateActions.find((item) => (
    item.action === action
    && item.executableInV1
    && item.readiness === 'ready'
    && hasExecutableArgs(item)
  ))
}

function fallbackDecisionReason(action: AiPlayerActionType, args: Record<string, unknown>) {
  const tileId = readString(args.tileId ?? args.targetTileId, '目标地')
  const unitId = readString(args.unitId, '部队')
  switch (action) {
    case 'resource_gather':
      return `采集 ${tileId} 的资源，继续积累开荒物资。`
    case 'tile_occupy':
      return `占领 ${tileId}，扩大开荒控制范围。`
    case 'march_move':
      return `让 ${unitId} 推进到 ${tileId}，寻找下一块可开荒目标。`
    case 'tile_abandon':
      return `释放 ${tileId}，把已采集过的低收益地块让回地图。`
    case 'troop_heal':
      return `整补 ${unitId}，避免低补给或低兵力继续硬推。`
    case 'troop_train':
      return '补充可用部队，提升后续开荒稳定性。'
    case 'queue_fill_idle_slot':
      return '把空闲政务队列补上，避免主城发育停摆。'
    case 'tactical_skill_upgrade':
      return '升级可用战法，提升后续开荒胜率。'
    case 'building_upgrade':
      return '升级内政建筑，提升开荒资源周转。'
    default:
      return `执行 ${action}，推进当前开荒目标。`
  }
}

function decisionFromReadyCandidate(
  action: AiPlayerActionType,
  candidate: AiPlayerDevelopmentPlanCandidateAction,
): AiPlayerAutonomousDevelopmentPlannerDecision {
  const args = { ...(candidate.proposalArgs ?? candidate.args ?? {}) }
  return {
    action,
    args,
    reason: readString(candidate.proposalReason ?? candidate.reason, fallbackDecisionReason(action, args)),
    plannerSource: 'rule',
    candidate,
  }
}

function shouldPrioritizeBattleRecovery(
  observation: AiPlayerAutonomousDevelopmentObservation,
  candidate: AiPlayerDevelopmentPlanCandidateAction,
) {
  const alreadyRecovered = observation.recentReceipts.some((receipt) => (
    receipt.action === 'troop_heal'
    && receipt.ok
  ))
  if (alreadyRecovered) {
    return false
  }
  const args = candidate.proposalArgs ?? candidate.args ?? {}
  const targetUnitId = readString(args.unitId ?? candidate.targetUnitId)
  const targetUnit = observation.units.find((unit) => unit.id === targetUnitId)
  if (!targetUnit || targetUnit.strength > 80) {
    return false
  }
  return observation.battleReports.items.some((report) => (
    report.outcome === 'loss'
    && report.severity === 'high'
    && report.assignedUnitInvolved
  ))
}

function shouldPrioritizeSustainmentRecovery(
  observation: AiPlayerAutonomousDevelopmentObservation,
  candidate: AiPlayerDevelopmentPlanCandidateAction,
) {
  const args = candidate.proposalArgs ?? candidate.args ?? {}
  const targetUnitId = readString(args.unitId ?? candidate.targetUnitId)
  const targetUnit = observation.units.find((unit) => unit.id === targetUnitId)
  if (!targetUnit) {
    return false
  }
  return targetUnit.supply <= 2 || targetUnit.strength <= 55
}

function hasHighSeverityAssignedLoss(observation: AiPlayerAutonomousDevelopmentObservation) {
  return observation.battleReports.items.some((report) => (
    report.outcome === 'loss'
    && report.severity === 'high'
    && report.assignedUnitInvolved
  ))
}

function shouldPrioritizeBattleTraining(observation: AiPlayerAutonomousDevelopmentObservation) {
  if (!hasHighSeverityAssignedLoss(observation)) {
    return false
  }
  return !observation.recentReceipts.some((receipt) => (
    receipt.action === 'troop_train'
    && receipt.ok
  ))
}

function failedTargetTileIdsFromReceipts(observation: AiPlayerAutonomousDevelopmentObservation) {
  const failedTargetTileIds = new Set<string>()
  for (const receipt of observation.failureHistory.failedReceipts) {
    if (receipt.action !== 'march_move' && receipt.action !== 'tile_occupy') {
      continue
    }
    const payload = receipt.worldActionPayload ?? {}
    const worldReceipt = readRecord(receipt.worldReceipt)
    const targetTileId = readString(payload.targetTileId ?? payload.tileId ?? worldReceipt.tileId)
    if (targetTileId) {
      failedTargetTileIds.add(targetTileId)
    }
  }
  return failedTargetTileIds
}

function candidateTargetTileId(candidate: AiPlayerDevelopmentPlanCandidateAction) {
  const args = candidate.proposalArgs ?? candidate.args ?? {}
  return readString(args.targetTileId ?? args.tileId ?? candidate.targetTileId)
}

function buildSafeSkipDecision(
  observation: AiPlayerAutonomousDevelopmentObservation,
): AiPlayerAutonomousDevelopmentPlannerDecision {
  const blockedReasons = observation.candidateActions
    .filter((candidate) => candidate.executableInV1 && candidate.readiness === 'blocked')
    .flatMap((candidate) => candidate.blockers ?? [])
  const reason = blockedReasons.includes('queue_busy')
    ? '当前资源或目标不足，政务队列也已经排满；这一步先稳住，避免硬塞失败动作。'
    : '当前没有安全可执行的开荒动作；这一步先稳住，等资源、目标或队列恢复后再继续推进。'
  return {
    action: 'next_step_propose',
    args: {
      skipReason: reason,
      blockedReasons: Array.from(new Set(blockedReasons)).slice(0, 8),
    },
    reason,
    plannerSource: 'rule',
  }
}

function buildRecoveryCommandDecision(
  observation: AiPlayerAutonomousDevelopmentObservation,
): AiPlayerAutonomousDevelopmentPlannerDecision | null {
  const completedReadOnlyRecoveryKeys = new Set(
    observation.subjectRecoveryCommands
      .filter((item) => (
        (item.action === 'battle_report_read' || item.action === 'activity_window_enter')
        && item.status === 'completed'
      ))
      .map((item) => [
        item.recommendedRecoveryCommand,
        item.replayRequestId ?? item.recoveryAnchorReplayRequestId ?? item.saveSlotId ?? '',
        item.regionId ?? '',
      ].join(':')),
  )
  const readOnlyRecoveryCommands = new Set([
    'open_player_history_replay_fallback',
    'return_to_battle_report_after_retention_expired',
    'request_replay_access_or_return_battle_report',
    'open_save_slot_list',
    'inspect_save_slot',
    'continue_after_save_restore',
  ])
  const command = observation.subjectRecoveryCommands.find((item) => (
    readOnlyRecoveryCommands.has(item.recommendedRecoveryCommand)
    && !completedReadOnlyRecoveryKeys.has([
      item.recommendedRecoveryCommand,
      item.replayRequestId ?? item.recoveryAnchorReplayRequestId ?? item.saveSlotId ?? '',
      item.regionId ?? '',
    ].join(':'))
  ))
  if (!command) {
    return null
  }
  const saveRecovery = Boolean(command.saveSlotId || command.saveRecoveryStatus || command.recoveryAnchorKind === 'save')
  return {
    action: saveRecovery ? 'activity_window_enter' : 'battle_report_read',
    args: {
      recommendedRecoveryCommand: command.recommendedRecoveryCommand,
      replayRequestId: command.replayRequestId ?? command.recoveryAnchorReplayRequestId,
      saveSlotId: command.saveSlotId,
      saveRecoveryStatus: command.saveRecoveryStatus,
      recoveryAnchorKind: command.recoveryAnchorKind,
      recoveryAnchorReplayReason: command.recoveryAnchorReplayReason,
      recoveryAnchorReplayRecoverySurface: command.recoveryAnchorReplayRecoverySurface,
      executionMode: 'read_model_only',
      readOnlyRecovery: true,
      nextSubjectFocus: saveRecovery ? 'save_history' : 'battle_report_history',
    },
    reason: saveRecovery
      ? `读取 ${command.recommendedRecoveryCommand}，先恢复存档/历史上下文，再决定下一步行动。`
      : `读取 ${command.recommendedRecoveryCommand}，先恢复战报/回放上下文，再决定下一步行动。`,
    plannerSource: 'rule',
  }
}

function buildGovernanceRecoveryCommandDecision(
  observation: AiPlayerAutonomousDevelopmentObservation,
): AiPlayerAutonomousDevelopmentPlannerDecision | null {
  const completedGovernanceRecoveryKeys = new Set(
    observation.subjectRecoveryCommands
      .filter((item) => (
        item.action === 'activity_window_enter'
        && item.status === 'completed'
        && item.nextSubjectFocus === 'governance'
      ))
      .map((item) => [
        item.recommendedRecoveryCommand,
        item.governanceAttemptedWorldAction ?? '',
        item.allianceCommanderId ?? '',
        item.regionId ?? '',
      ].join(':')),
  )
  const command = observation.subjectRecoveryCommands.find((item) => (
    item.bodyNode === 'human_command_and_obedience'
    && item.action === 'alliance_help'
    && item.status === 'failed'
    && item.governanceAttemptedWorldAction === 'allianceHelp'
    && item.recommendedRecoveryCommand
    && !completedGovernanceRecoveryKeys.has([
      item.recommendedRecoveryCommand,
      item.governanceAttemptedWorldAction ?? '',
      item.allianceCommanderId ?? '',
      item.regionId ?? '',
    ].join(':'))
  ))
  if (!command) {
    return null
  }
  return {
    action: 'activity_window_enter',
    args: {
      recommendedRecoveryCommand: command.recommendedRecoveryCommand,
      executionMode: 'read_model_only',
      readOnlyRecovery: true,
      nextSubjectFocus: 'governance',
      governanceAttemptedWorldAction: command.governanceAttemptedWorldAction,
      governanceFailureDetail: command.governanceFailureDetail,
      regionId: command.regionId,
      allianceCommanderId: command.allianceCommanderId,
      allianceCommanderMissing: command.allianceCommanderMissing,
    },
    reason: command.allianceCommanderMissing
      ? '先确认同盟指挥位缺口，再决定是否重试支援命令。'
      : '先确认这次同盟命令为什么受阻，再决定下一步。' ,
    plannerSource: 'rule',
  }
}

function buildWarFollowUpCommandDecision(
  observation: AiPlayerAutonomousDevelopmentObservation,
): AiPlayerAutonomousDevelopmentPlannerDecision | null {
  const command = observation.subjectRecoveryCommands.find((item) => (
    item.recommendedRecoveryCommand === 'continue_war_follow_up_action'
    && item.warFollowUpReadiness === 'ready'
    && item.warFollowUpAction
    && AUTONOMOUS_DEVELOPMENT_ACTION_PRIORITY.includes(item.warFollowUpAction as AiPlayerActionType)
  ))
  if (!command) {
    return null
  }
  const action = command.warFollowUpAction as AiPlayerActionType | undefined
  if (!action || !AUTONOMOUS_DEVELOPMENT_ACTION_PRIORITY.includes(action)) {
    return null
  }
  return {
    action,
    args: {
      ...(command.warFollowUpArgs ?? {}),
      recommendedRecoveryCommand: command.recommendedRecoveryCommand,
      sourceBattleReportId: command.battleReportId,
      sourceReplayRequestId: command.replayRequestId ?? command.recoveryAnchorReplayRequestId,
    },
    reason: command.warFollowUpReason
      ?? `根据战报后续动作继续执行 ${action}。`,
    plannerSource: 'rule',
  }
}

export function planAiPlayerAutonomousDevelopmentStep(
  observation: AiPlayerAutonomousDevelopmentObservation,
): { decision?: AiPlayerAutonomousDevelopmentPlannerDecision; error?: string } {
  const gatheredTileIds = new Set(observation.gatheredTileIds)
  const failedTargetTileIds = failedTargetTileIdsFromReceipts(observation)
  const recoveryCandidate = findReadyExecutableCandidate(observation, 'troop_heal')
  const battleTrainingCandidate = findReadyExecutableCandidate(observation, 'troop_train')
  const shouldPrioritizeRecovery = recoveryCandidate
    ? shouldPrioritizeBattleRecovery(observation, recoveryCandidate)
      || shouldPrioritizeSustainmentRecovery(observation, recoveryCandidate)
    : false
  for (const unit of observation.units) {
    const currentTile = observation.currentTiles.find((tile) => tile.id === unit.tileId)
    if (!currentTile) {
      continue
    }
    if (currentTile.type === 'resource' && currentTile.owner === observation.factionId && !gatheredTileIds.has(currentTile.id)) {
      return {
        decision: {
          action: 'resource_gather',
          args: {
            unitId: unit.id,
            tileId: currentTile.id,
          },
          reason: `部队已经在己方资源地 ${currentTile.id}，直接采集收益。`,
          plannerSource: 'rule',
        },
      }
    }
    if (recoveryCandidate && shouldPrioritizeRecovery) {
      return {
        decision: decisionFromReadyCandidate('troop_heal', recoveryCandidate),
      }
    }
    if (currentTile.owner === 'neutral' && currentTile.type !== 'city' && currentTile.type !== 'fog' && currentTile.enemyPressure <= 25) {
      return {
        decision: {
          action: 'tile_occupy',
          args: {
            unitId: unit.id,
            tileId: currentTile.id,
          },
          reason: `部队已经站在中立低风险地块 ${currentTile.id}，直接占领。`,
          plannerSource: 'rule',
        },
      }
    }
  }

  if (recoveryCandidate && shouldPrioritizeRecovery) {
    return {
      decision: decisionFromReadyCandidate('troop_heal', recoveryCandidate),
    }
  }

  if (battleTrainingCandidate && shouldPrioritizeBattleTraining(observation)) {
    return {
      decision: decisionFromReadyCandidate('troop_train', battleTrainingCandidate),
    }
  }

  const resourceMoveTile = observation.developmentPlan.candidateTiles.find((tile) => (
    tile.recommendedAction === 'march_move'
    && tile.type === 'resource'
    && tile.owner === 'neutral'
    && !failedTargetTileIds.has(tile.tileId)
    && tile.args
  ))
  if (resourceMoveTile?.args) {
    return {
      decision: {
        action: 'march_move',
        args: { ...resourceMoveTile.args },
        reason: readString(resourceMoveTile.reason, fallbackDecisionReason('march_move', resourceMoveTile.args)),
        plannerSource: 'rule',
      },
    }
  }

  for (const action of AUTONOMOUS_DEVELOPMENT_ACTION_PRIORITY) {
    const candidate = findReadyExecutableCandidate(observation, action)
    if (!candidate) {
      continue
    }
    if (action === 'march_move' && failedTargetTileIds.has(candidateTargetTileId(candidate))) {
      continue
    }
    return {
      decision: decisionFromReadyCandidate(action, candidate),
    }
  }

  const warFollowUpCommandDecision = buildWarFollowUpCommandDecision(observation)
  if (warFollowUpCommandDecision) {
    return { decision: warFollowUpCommandDecision }
  }

  const governanceRecoveryCommandDecision = buildGovernanceRecoveryCommandDecision(observation)
  if (governanceRecoveryCommandDecision) {
    return { decision: governanceRecoveryCommandDecision }
  }

  const recoveryCommandDecision = buildRecoveryCommandDecision(observation)
  if (recoveryCommandDecision) {
    return { decision: recoveryCommandDecision }
  }

  return { decision: buildSafeSkipDecision(observation) }
}

function buildLlmPlannerObservation(
  runtime: GovernedAiPlayerRuntimeDetail,
  observation: AiPlayerAutonomousDevelopmentObservation,
): AiPlayerRuntimeProposalObservation {
  const compactDevelopmentPlan = {
    ok: observation.developmentPlan.ok,
    aiPlayerId: observation.developmentPlan.aiPlayerId,
    factionId: observation.developmentPlan.factionId,
    governorPlayerId: observation.developmentPlan.governorPlayerId,
    tick: observation.developmentPlan.tick,
    worldVersion: observation.developmentPlan.worldVersion,
    generatedAt: observation.developmentPlan.generatedAt,
    goal: observation.developmentPlan.goal,
    resources: observation.developmentPlan.resources,
    units: observation.developmentPlan.units.slice(0, 8),
    candidateTiles: observation.developmentPlan.candidateTiles
      .filter((tile) => tile.recommendedAction)
      .slice(0, 24),
    candidateActions: observation.developmentPlan.candidateActions
      .filter((action) => action.readiness === 'ready' || action.executableInV1)
      .slice(0, 16),
    recommendedLoop: observation.developmentPlan.recommendedLoop.slice(0, 8),
    riskItems: observation.developmentPlan.riskItems.slice(0, 8),
    omittedForPlanner: {
      candidateTileCount: observation.developmentPlan.candidateTiles.length,
      candidateActionCount: observation.developmentPlan.candidateActions.length,
      reason: 'compact_autonomous_development_llm_observation',
    },
  }
  return {
    aiPlayerId: observation.aiPlayerId,
    runtime: {
      aiPlayerId: runtime.aiPlayerId,
      factionId: runtime.factionId,
      governorPlayerId: runtime.governorPlayerId,
      actionWhitelist: runtime.actionWhitelist,
      budget: runtime.budget,
      resourceTransfer: runtime.resourceTransfer,
      runtimePolicy: runtime.runtimePolicy,
    },
    requestContext: {
      queueLane: 'autonomous_development',
      queuePriority: 5,
    },
    world: {
      tick: observation.tick,
      worldVersion: observation.worldVersion,
      units: observation.units,
      currentTiles: observation.currentTiles,
      gatheredTileIds: observation.gatheredTileIds,
      developmentPlan: compactDevelopmentPlan,
      battleReports: observation.battleReports,
      buildings: observation.buildings,
      queues: observation.queues,
      enemyIntel: observation.enemyIntel,
      failureHistory: observation.failureHistory,
      subjectRecoveryCommands: observation.subjectRecoveryCommands,
    },
    receipts: observation.recentReceipts,
    failures: observation.failureHistory.recentRuntimeFailures,
  }
}

function decisionFromProposalRequest(
  request: AiPlayerActionProposalRequest,
  model: string,
): AiPlayerAutonomousDevelopmentPlannerDecision | null {
  if (!AUTONOMOUS_DEVELOPMENT_ACTION_PRIORITY.includes(request.action)) {
    return null
  }
  return {
    action: request.action,
    args: { ...(request.args ?? {}) },
    reason: request.reason,
    plannerSource: 'llm',
    model,
  }
}

function resolveProviderLabel(baseUrl: string) {
  try {
    return new URL(baseUrl).host || 'relay'
  } catch {
    return 'relay'
  }
}

async function planAiPlayerAutonomousDevelopmentStepWithLlm(
  runtime: GovernedAiPlayerRuntimeDetail,
  observation: AiPlayerAutonomousDevelopmentObservation,
): Promise<{ decision?: AiPlayerAutonomousDevelopmentPlannerDecision; error?: string }> {
  if (!runtime.runtimePolicy.allowLlmProposals) {
    return { error: 'llm proposals disabled for autonomous development planner' }
  }
  const mockOutput = process.env.NODE_ENV === 'test'
    ? process.env.AI_PLAYER_AUTONOMOUS_DEVELOPMENT_MODEL_MOCK_OUTPUT?.trim()
    : ''
  if (mockOutput) {
    const output = parseAiPlayerRuntimeProposalJson(mockOutput)
    for (const request of toAiPlayerActionProposalRequests(observation.aiPlayerId, output)) {
      const decision = decisionFromProposalRequest(request, 'mock:test')
      if (decision) {
        return { decision }
      }
    }
    return { error: 'llm autonomous planner returned no allowed development action' }
  }

  const result = await requestAiPlayerRuntimeProposalFromCandidateTargets({
    candidates: resolveAiPlayerRuntimeModelTargetCandidates({
      factionId: runtime.factionId,
      ownerPlayerId: runtime.governorPlayerId,
    }),
    observation: buildLlmPlannerObservation(runtime, observation),
    reserveCandidateAttempt: async (candidate, preflight) => {
      const budgetReservation = await reserveAiPlayerProviderBudget({
        aiPlayerId: runtime.aiPlayerId,
        factionId: runtime.factionId,
        governorPlayerId: runtime.governorPlayerId,
        model: candidate.target.model,
        provider: resolveProviderLabel(candidate.target.baseUrl),
        source: candidate.source,
        byokSource: candidate.byokSource,
      })
      if (!budgetReservation.ok) {
        return budgetReservation
      }
      const creditReservation = reserveAiPlayerProviderAiCommandCredits({
        accountId: runtime.governorPlayerId,
        factionId: runtime.factionId,
        usage: preflight.usage,
        aiPlayerId: runtime.aiPlayerId,
        reason: 'autonomous_development_planner_preflight',
      })
      if (!creditReservation.ok) {
        await releaseAiPlayerProviderBudgetReservation(budgetReservation.reservationId)
        return {
          ok: false,
          error: creditReservation.error,
          reservationId: budgetReservation.reservationId,
          budgetWindowKey: budgetReservation.budgetWindowKey,
          limitMode: budgetReservation.limitMode,
        }
      }
      return {
        ...budgetReservation,
        aiCommandCreditReservationId: creditReservation.reservationId,
        aiCommandCreditReservedCredits: creditReservation.amountCredits,
      }
    },
    commitCandidateAttempt: async (_candidate, result, reservation) => {
      await commitAiPlayerProviderBudgetReservation(reservation?.reservationId, {
        ok: result.ok,
        usage: result.ok ? result.usage : undefined,
        error: result.ok ? undefined : result.error,
      })
      if (!result.ok) {
        releaseAiPlayerProviderAiCommandCreditReservation(reservation?.aiCommandCreditReservationId)
      }
    },
  })
  if (!result.ok) {
    recordAiPlayerProviderModelRequestAccounting({
      ok: false,
      aiPlayerId: runtime.aiPlayerId,
      factionId: runtime.factionId,
      governorPlayerId: runtime.governorPlayerId,
      providerFallbackFailures: result.providerFallbackFailures ?? [],
      error: result.error,
    })
    return { error: result.error }
  }
  recordAiPlayerProviderModelRequestAccounting({
    ok: true,
    aiPlayerId: runtime.aiPlayerId,
    factionId: runtime.factionId,
    governorPlayerId: runtime.governorPlayerId,
    selectedProvider: result.selectedProvider ?? null,
    providerFallbackFailures: result.providerFallbackFailures ?? [],
    usage: result.usage,
    budgetWindowKey: result.budgetWindowKey,
    budgetReservationId: result.budgetReservationId,
    aiCommandCreditReservationId: result.aiCommandCreditReservationId,
    usageType: 'autonomous_development_planner',
  })
  for (const request of result.proposalRequests) {
    const decision = decisionFromProposalRequest(request, result.selectedProvider?.model ?? result.model ?? 'model')
    if (decision) {
      return { decision }
    }
  }
  return { error: 'llm autonomous planner returned no allowed development action' }
}

async function planAiPlayerAutonomousDevelopmentStepByMode(
  runtime: GovernedAiPlayerRuntimeDetail,
  observation: AiPlayerAutonomousDevelopmentObservation,
  input: RunAiPlayerAutonomousDevelopmentInput,
) {
  if (input.plannerMode === 'llm') {
    return await planAiPlayerAutonomousDevelopmentStepWithLlm(runtime, observation)
  }
  return planAiPlayerAutonomousDevelopmentStep(observation)
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function tileNameFromArgs(observation: AiPlayerAutonomousDevelopmentObservation, args: Record<string, unknown>) {
  const tileId = readString(args.tileId ?? args.targetTileId)
  return observation.developmentPlan.candidateTiles.find((tile) => tile.tileId === tileId)?.name
    ?? observation.currentTiles.find((tile) => tile.id === tileId)?.name
    ?? tileId
    ?? '目标地'
}

function unitNameFromArgs(observation: AiPlayerAutonomousDevelopmentObservation, args: Record<string, unknown>) {
  const unitId = readString(args.unitId)
  return observation.units.find((unit) => unit.id === unitId)?.name ?? unitId ?? '部队'
}

export function buildAiPlayerAutonomousReadOnlyRecoveryResultText(
  decision: AiPlayerAutonomousDevelopmentPlannerDecision,
) {
  const command = readString(decision.args.recommendedRecoveryCommand)
  const saveRecovery = Boolean(readString(decision.args.saveSlotId) || readString(decision.args.saveRecoveryStatus))
  if (readString(decision.args.nextSubjectFocus) === 'governance') {
    if (decision.args.allianceCommanderMissing === true) {
      return '我已回到同盟命令记录，先确认指挥位缺口，再决定是否重试。'
    }
    return '我已回到同盟命令记录，先把受阻原因读清楚。'
  }
  if (saveRecovery) {
    if (command === 'continue_after_save_restore') {
      return '我已确认存档恢复结果，当前记录可以继续接上。'
    }
    if (command === 'inspect_save_slot') {
      return '我已回到存档记录，先确认这个存档点的状态。'
    }
    return '我已回到存档历史，先把恢复失败的原因读清楚。'
  }
  if (command === 'request_replay_access_or_return_battle_report') {
    return '我已回到战报记录，这段回放暂时不能看，先按战报结果继续判断。'
  }
  return '我已回到战报记录，先把这次结果读清楚，下一步再决定怎么走。'
}

function buildNaturalLanguageResult(
  observation: AiPlayerAutonomousDevelopmentObservation,
  decision: AiPlayerAutonomousDevelopmentPlannerDecision,
  receipt: AiPlayerActionReceipt,
) {
  const tileName = tileNameFromArgs(observation, decision.args)
  const unitName = unitNameFromArgs(observation, decision.args)
  if (isAiPlayerAutonomousDevelopmentFailedReceipt(receipt)) {
    return `${unitName}这一步没有做成，我已记下原因，下一步会重新看局势。`
  }
  if (
    (decision.action === 'battle_report_read' || decision.action === 'activity_window_enter')
    && decision.args.executionMode === 'read_model_only'
    && decision.args.readOnlyRecovery === true
  ) {
    return buildAiPlayerAutonomousReadOnlyRecoveryResultText(decision)
  }
  switch (decision.action) {
    case 'resource_gather':
      return `${unitName}已在${tileName}完成采集，物资已经入账。`
    case 'tile_occupy':
      return `${unitName}已拿下${tileName}，这块地现在归我们管。`
    case 'march_move':
      return `${unitName}已推进到${tileName}，下一步可以就地展开。`
    case 'troop_heal':
      return `${unitName}已经完成整补，队伍状态稳住了。`
    case 'troop_train':
      return `新部队已经补进队列，后续开荒能多一手支援。`
    case 'queue_fill_idle_slot':
      return `主城政务队列已经补上，内政发育不会空转。`
    case 'next_step_propose':
      return `这一步先稳住，不强行动作；等资源、队列或目标恢复后再继续推进。`
    case 'tactical_skill_upgrade':
      return `战法已经升级，下一轮开荒的胜算更高。`
    case 'building_upgrade':
      return `内政建筑已经升级，开荒资源周转会更顺。`
    default:
      return `${unitName}已经完成${decision.action}。`
  }
}

function buildPersonalReport(
  runtime: GovernedAiPlayerRuntimeDetail,
  stepOrder: number,
  decision: AiPlayerAutonomousDevelopmentPlannerDecision,
  receipt: AiPlayerActionReceipt,
  naturalLanguageResult: string,
): AiPlayerAutonomousPersonalReport {
  const completed = !isAiPlayerAutonomousDevelopmentFailedReceipt(receipt)
  return {
    reportId: randomId('ai_autonomous_report'),
    ownerPlayerId: runtime.governorPlayerId,
    actorType: 'ai_player',
    aiPlayerId: runtime.aiPlayerId,
    factionId: runtime.factionId,
    category: 'development',
    action: decision.action,
    title: `开荒第 ${stepOrder} 步`,
    summary: naturalLanguageResult,
    result: completed ? naturalLanguageResult : '这一步没有完成，我已记下原因，下一步会重新看局势。',
    relatedProposalId: receipt.proposalId,
    relatedReceiptProposalId: receipt.proposalId,
    createdAt: nowIso(),
  }
}

function buildSafeSkipReceipt(
  runtime: GovernedAiPlayerRuntimeDetail,
  decision: AiPlayerAutonomousDevelopmentPlannerDecision,
): AiPlayerActionReceipt {
  const observedAt = nowIso()
  return {
    proposalId: randomId('ai_autonomous_safe_skip'),
    aiPlayerId: runtime.aiPlayerId,
    governorPlayerId: runtime.governorPlayerId,
    factionId: runtime.factionId,
    action: decision.action,
    worldAction: null,
    actionRequestId: null,
    ok: true,
    failureCode: null,
    message: decision.reason,
    execution: {
      kind: 'autonomous_safe_skip',
      reason: decision.reason,
      args: decision.args,
      observedAt,
    },
    observedAt,
  }
}

function isReadOnlyRecoveryDecision(decision: AiPlayerAutonomousDevelopmentPlannerDecision) {
  return (
    (decision.action === 'battle_report_read' || decision.action === 'activity_window_enter')
    && decision.args.executionMode === 'read_model_only'
    && decision.args.readOnlyRecovery === true
  )
}

export function buildAiPlayerAutonomousReadOnlyRecoveryReceipt(
  runtime: Pick<GovernedAiPlayerRuntimeDetail, 'aiPlayerId' | 'governorPlayerId' | 'factionId'>,
  decision: AiPlayerAutonomousDevelopmentPlannerDecision,
): AiPlayerActionReceipt {
  const observedAt = nowIso()
  return {
    proposalId: randomId('ai_autonomous_read_only_recovery'),
    aiPlayerId: runtime.aiPlayerId,
    governorPlayerId: runtime.governorPlayerId,
    factionId: runtime.factionId,
    action: decision.action,
    worldAction: null,
    actionRequestId: null,
    ok: true,
    failureCode: null,
    message: decision.reason,
    execution: {
      kind: 'autonomous_read_only_recovery',
      reason: decision.reason,
      args: decision.args,
      recommendedRecoveryCommand: readString(decision.args.recommendedRecoveryCommand),
      replayRequestId: readString(decision.args.replayRequestId),
      saveSlotId: readString(decision.args.saveSlotId),
      saveRecoveryStatus: readString(decision.args.saveRecoveryStatus),
      recoveryAnchorKind: readString(decision.args.recoveryAnchorKind),
      recoveryAnchorReplayReason: readString(decision.args.recoveryAnchorReplayReason),
      recoveryAnchorReplayRecoverySurface: readString(decision.args.recoveryAnchorReplayRecoverySurface),
      governanceAttemptedWorldAction: readString(decision.args.governanceAttemptedWorldAction),
      governanceFailureDetail: readString(decision.args.governanceFailureDetail),
      regionId: readString(decision.args.regionId),
      allianceCommanderId: readString(decision.args.allianceCommanderId),
      allianceCommanderMissing: decision.args.allianceCommanderMissing === true,
      executionMode: 'read_model_only',
      nextSubjectFocus: readString(decision.args.nextSubjectFocus) ?? 'battle_report_history',
      observedAt,
    },
    observedAt,
  }
}

export function appendAiPlayerAutonomousPersonalReport(report: AiPlayerAutonomousPersonalReport) {
  const bucket = autonomousPersonalReportsByAiPlayer.get(report.aiPlayerId) ?? []
  bucket.push(cloneValue(report))
  if (bucket.length > MAX_PERSISTED_AUTONOMOUS_PERSONAL_REPORTS_PER_PLAYER) {
    bucket.splice(0, bucket.length - MAX_PERSISTED_AUTONOMOUS_PERSONAL_REPORTS_PER_PLAYER)
  }
  autonomousPersonalReportsByAiPlayer.set(report.aiPlayerId, bucket)
  scheduleAiPlayerGovernancePersist()
}

export function listAiPlayerAutonomousPersonalReports(
  aiPlayerId: string,
  limit = 20,
  category?: AiPlayerAutonomousPersonalReport['category'],
) {
  const bucket = autonomousPersonalReportsByAiPlayer.get(aiPlayerId) ?? []
  const normalizedLimit = Math.max(1, Math.min(200, Math.trunc(limit)))
  const filtered = category ? bucket.filter((report) => report.category === category) : bucket
  return cloneValue(filtered.slice(-normalizedLimit).reverse())
}

export function listAiPlayerAutonomousDevelopmentPersonalReports(aiPlayerId: string, limit = 20) {
  return listAiPlayerAutonomousPersonalReports(aiPlayerId, limit, 'development')
}

export function listAiPlayerAutonomousDevelopmentPlayerReports(aiPlayerId: string, limit = 20) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    return { error: `ai player not found: ${aiPlayerId}` }
  }
  const normalizedLimit = Math.max(1, Math.min(200, Math.trunc(Number(limit) || 20)))
  const autonomousReports = listAiPlayerAutonomousDevelopmentPersonalReports(aiPlayerId, normalizedLimit)
    .map((report) => ({
      itemKind: 'ai_autonomous_development' as const,
      reportId: report.reportId,
      ownerPlayerId: report.ownerPlayerId,
      actorType: report.actorType,
      aiPlayerId: report.aiPlayerId,
      factionId: report.factionId,
      action: report.action,
      title: report.title,
      summary: report.summary,
      result: report.result,
      createdAt: report.createdAt,
    }))
  const battleReports = buildAiPlayerBattleReportReadModel(runtime, normalizedLimit).items
    .map((report) => ({
      itemKind: 'battle_report' as const,
      reportId: report.reportId,
      ownerPlayerId: runtime.governorPlayerId,
      actorType: report.aiPlayerId ? 'ai_player' as const : 'player' as const,
      aiPlayerId: report.aiPlayerId,
      factionId: report.ownerFactionId ?? runtime.factionId,
      action: 'battle_report_read' as const,
      title: report.summary,
      summary: report.summary,
      result: report.result ?? (report.outcome === 'win' ? '胜' : report.outcome === 'loss' ? '败' : '平'),
      createdAt: report.time ?? String(report.tick),
      battleReport: report,
    }))
  const items = [...autonomousReports, ...battleReports]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.reportId.localeCompare(left.reportId))
    .slice(0, normalizedLimit)
  return {
    ok: true as const,
    aiPlayerId,
    ownerPlayerId: runtime.governorPlayerId,
    items,
    count: items.length,
  }
}

export async function runAiPlayerAutonomousDevelopment(
  aiPlayerId: string,
  input: RunAiPlayerAutonomousDevelopmentInput = {},
): Promise<{ run?: AiPlayerAutonomousDevelopmentRun; error?: string }> {
  const startedAt = nowIso()
  const steps: AiPlayerAutonomousDevelopmentRunStep[] = []
  const requestedMaxSteps = clampStepCount(input.maxSteps)
  let runtime: GovernedAiPlayerRuntimeDetail | undefined

  for (let index = 0; index < requestedMaxSteps; index += 1) {
    const observed = buildAiPlayerAutonomousDevelopmentObservation(aiPlayerId, input)
    if (observed.error || !observed.observation || !observed.runtime) {
      return { error: observed.error ?? 'autonomous observation failed' }
    }
    runtime = observed.runtime
    const planned = await planAiPlayerAutonomousDevelopmentStepByMode(observed.runtime, observed.observation, input)
    if (planned.error || !planned.decision) {
      return { error: planned.error ?? 'autonomous planner failed' }
    }

    const executorId = input.triggeredBy?.trim() || 'autonomous_development_executor'
    let proposalId: string
    let receipt: AiPlayerActionReceipt

    if (planned.decision.action === 'next_step_propose') {
      receipt = buildSafeSkipReceipt(observed.runtime, planned.decision)
      proposalId = receipt.proposalId
    } else if (isReadOnlyRecoveryDecision(planned.decision)) {
      receipt = buildAiPlayerAutonomousReadOnlyRecoveryReceipt(observed.runtime, planned.decision)
      storeAiPlayerActionReceipt(receipt)
      proposalId = receipt.proposalId
    } else {
      const created = createAiPlayerActionProposal({
        aiPlayerId,
        action: planned.decision.action,
        source: planned.decision.plannerSource,
        reason: planned.decision.reason,
        args: planned.decision.args as AiPlayerActionArgs,
      })
      if (created.error || !created.proposal) {
        return { error: created.error ?? 'autonomous proposal creation failed' }
      }

      let executableProposal = created.proposal
      if (executableProposal.status === 'pending_approval') {
        const approved = approveAiPlayerActionProposal(executableProposal.proposalId, { approvedBy: executorId })
        if (approved.error || !approved.proposal) {
          return { error: approved.error ?? 'autonomous approval failed' }
        }
        executableProposal = approved.proposal
      }

      const executed = await executeAiPlayerActionProposal(executableProposal.proposalId, {
        executedBy: executorId,
        includeWorld: false,
      })
      if (executed.error || !executed.receipt) {
        return { error: executed.error ?? 'autonomous execution failed' }
      }
      proposalId = executableProposal.proposalId
      receipt = executed.receipt
    }

    const naturalLanguageResult = buildNaturalLanguageResult(
      observed.observation,
      planned.decision,
      receipt,
    )
    const personalReport = buildPersonalReport(runtime, index + 1, planned.decision, receipt, naturalLanguageResult)
    appendAiPlayerAutonomousPersonalReport(personalReport)
    recordAiPlayerAutonomousDevelopmentResultInChat({
      aiPlayerId,
      body: naturalLanguageResult,
      action: planned.decision.action,
      receiptProposalId: receipt.proposalId,
      receiptOk: receipt.ok,
      metadata: {
        runKind: 'autonomous_development',
        stepOrder: index + 1,
        reportId: personalReport.reportId,
        triggeredBy: input.triggeredBy,
        plannerSource: planned.decision.plannerSource,
        model: planned.decision.model,
      },
    })

    steps.push({
      order: index + 1,
      observation: observed.observation,
      plannerDecision: planned.decision,
      selectedAction: planned.decision.action,
      proposalId,
      receipt,
      naturalLanguageResult,
      personalReport,
    })

    if (planned.decision.action === 'next_step_propose' || isReadOnlyRecoveryDecision(planned.decision)) {
      break
    }
  }

  if (!runtime) {
    return { error: 'ai player runtime not found' }
  }

  const personalReports = steps.map((step) => step.personalReport)
  return {
    run: {
      ok: true,
      runId: randomId('ai_autonomous_run'),
      aiPlayerId: runtime.aiPlayerId,
      factionId: runtime.factionId,
      governorPlayerId: runtime.governorPlayerId,
      stepCount: steps.length,
      requestedMaxSteps,
      startedAt,
      completedAt: nowIso(),
      steps,
      personalReports,
    },
  }
}
