import { randomUUID } from 'node:crypto'
import type {
  AiPlayerActionProposalRequest,
  AiPlayerActionReceipt,
  AiPlayerActionType,
  AiPlayerAutonomousPersonalReport,
  GovernedAiPlayerRuntimeDetail,
} from '../../../../shared/contracts/aiPlayer'
import {
  approveAiPlayerActionProposal,
  createAiPlayerActionProposal,
  executeAiPlayerActionProposal,
  getGovernedAiPlayerRuntime,
  listAiPlayerActionReceipts,
} from './AIPlayerGovernanceService'
import {
  buildAiPlayerAutonomousCombatObservation,
  type AiPlayerAutonomousCombatObservation,
} from './aiPlayerAutonomousCombatReadModel'
import {
  appendAiPlayerAutonomousPersonalReport,
  listAiPlayerAutonomousPersonalReports,
} from './aiPlayerAutonomousDevelopmentService'
import { buildAiPlayerBattleReportReadModel } from './aiPlayerBattleReportReadModel'
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
import { getWorldStateReadonly } from '../world/WorldService'

export type AiPlayerAutonomousCombatPlannerDecision = {
  action: AiPlayerActionType
  args: Record<string, unknown>
  reason: string
  plannerSource: 'rule' | 'llm'
  model?: string
}

export type AiPlayerAutonomousCombatRunStep = {
  order: number
  observation: AiPlayerAutonomousCombatObservation
  plannerDecision: AiPlayerAutonomousCombatPlannerDecision
  selectedAction: AiPlayerActionType
  proposalId: string
  receipt: AiPlayerActionReceipt
  naturalLanguageResult: string
  personalReport: AiPlayerAutonomousPersonalReport
}

export type AiPlayerAutonomousCombatRun = {
  ok: true
  aiPlayerId: string
  factionId: string
  governorPlayerId: string
  stepCount: number
  steps: AiPlayerAutonomousCombatRunStep[]
  personalReports: AiPlayerAutonomousPersonalReport[]
}

export type RunAiPlayerAutonomousCombatInput = {
  maxSteps?: number
  limit?: number
  plannerMode?: 'rule' | 'llm'
}

const COMBAT_ACTION_PRIORITY: AiPlayerActionType[] = [
  'troop_heal',
  'troop_train',
  'city_siege',
  'garrison_set',
  'rally_launch',
  'rally_join',
  'alliance_help',
  'world_scout',
  'tile_occupy',
  'march_move',
]

export const AI_PLAYER_AUTONOMOUS_COMBAT_MAX_STEPS = 20

export type AiPlayerAutonomousCombatWarRoomUiState = {
  itemKind: 'ai_autonomous_combat_war_room_ui_state'
  aiPlayerId: string
  selectedEnemyId: string
  enemyHistoryPage: number
  updatedAt: string
  playerFacingSummary: string
}

const warRoomUiStateByAiPlayerId = new Map<string, AiPlayerAutonomousCombatWarRoomUiState>()

function randomId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`
}

function clampStepCount(value: unknown) {
  const numeric = Number(value ?? 1)
  if (!Number.isFinite(numeric)) {
    return 1
  }
  return Math.max(1, Math.min(AI_PLAYER_AUTONOMOUS_COMBAT_MAX_STEPS, Math.trunc(numeric)))
}

function readTargetTileId(args: Record<string, unknown>) {
  const raw = args.tileId ?? args.targetTileId
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

function buildFailedTargetTileIds(aiPlayerId: string) {
  const failed = new Set<string>()
  for (const receipt of listAiPlayerActionReceipts(aiPlayerId, 32)) {
    if (receipt.ok) {
      continue
    }
    const payload = receipt.worldActionPayload && typeof receipt.worldActionPayload === 'object'
      ? receipt.worldActionPayload
      : {}
    const tileId = readTargetTileId(payload)
    if (tileId) {
      failed.add(tileId)
    }
  }
  return failed
}

function planAiPlayerAutonomousCombatStep(
  runtime: GovernedAiPlayerRuntimeDetail,
  observation: AiPlayerAutonomousCombatObservation,
): { decision?: AiPlayerAutonomousCombatPlannerDecision; error?: string } {
  const failedTargetTileIds = buildFailedTargetTileIds(runtime.aiPlayerId)
  const recentReceipts = listAiPlayerActionReceipts(runtime.aiPlayerId, 32)
  const alreadyTrained = recentReceipts.some((receipt) => receipt.ok && receipt.action === 'troop_train')
  const alreadySieged = recentReceipts.some((receipt) => receipt.ok && receipt.action === 'city_siege')
  const alreadyGarrisoned = recentReceipts.some((receipt) => receipt.ok && receipt.action === 'garrison_set')
  const alreadyLaunchedRally = recentReceipts.some((receipt) => receipt.ok && receipt.action === 'rally_launch')
  const hasRallyRecommendation = observation.recommendedActions.some((candidate) =>
    candidate.action === 'rally_launch' || candidate.action === 'rally_join',
  )
  for (const action of COMBAT_ACTION_PRIORITY) {
    const recommended = observation.recommendedActions.find((candidate) => candidate.action === action)
    if (!recommended) {
      continue
    }
    const targetTileId = readTargetTileId(recommended.args)
    if (targetTileId && failedTargetTileIds.has(targetTileId)) {
      continue
    }
    if (!runtime.actionWhitelist.includes(action)) {
      continue
    }
    if (action === 'troop_train' && alreadyTrained) {
      continue
    }
    if (action === 'city_siege' && alreadySieged && hasRallyRecommendation) {
      continue
    }
    if (action === 'garrison_set' && alreadyGarrisoned && hasRallyRecommendation) {
      continue
    }
    if (action === 'rally_launch' && alreadyLaunchedRally) {
      continue
    }
    return {
      decision: {
        action,
        args: { ...recommended.args },
        reason: recommended.playerFacingReason,
        plannerSource: 'rule',
      },
    }
  }
  return { error: 'no_safe_autonomous_combat_action' }
}

function buildLlmCombatPlannerObservation(
  runtime: GovernedAiPlayerRuntimeDetail,
  observation: AiPlayerAutonomousCombatObservation,
): AiPlayerRuntimeProposalObservation {
  return {
    aiPlayerId: observation.aiPlayerId,
    runtime: {
      aiPlayerId: runtime.aiPlayerId,
      factionId: runtime.factionId,
      governorPlayerId: runtime.governorPlayerId,
      actionWhitelist: runtime.actionWhitelist,
      budget: runtime.budget,
      runtimePolicy: runtime.runtimePolicy,
    },
    requestContext: {
      queueLane: 'autonomous_combat',
      queuePriority: 4,
    },
    world: {
      tick: observation.tick,
      worldVersion: observation.worldVersion,
      ownUnits: observation.ownUnits.slice(0, 8),
      battleReports: observation.battleReports.slice(0, 8),
      enemyTargets: observation.enemyTargets.slice(0, 12),
      ownTileThreats: observation.ownTileThreats.slice(0, 8),
      warObjectives: observation.warObjectives.slice(0, 8),
      recommendedActions: observation.recommendedActions.slice(0, 12),
      contract: {
        allowedActions: COMBAT_ACTION_PRIORITY.filter((action) => runtime.actionWhitelist.includes(action)),
        executorAuthority: 'backend_only',
        playerVisibleResult: 'natural_language_personal_report',
        forbiddenPlayerFacingTerms: ['proposalId', 'worldAction', 'MCP', 'tool', 'approve', 'execute', 'JSON'],
      },
    },
    receipts: listAiPlayerActionReceipts(runtime.aiPlayerId, 16),
  }
}

function decisionFromProposalRequest(
  request: AiPlayerActionProposalRequest,
  model: string,
  actionWhitelist: readonly AiPlayerActionType[],
): AiPlayerAutonomousCombatPlannerDecision | null {
  if (!COMBAT_ACTION_PRIORITY.includes(request.action)) {
    return null
  }
  if (!actionWhitelist.includes(request.action)) {
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

async function planAiPlayerAutonomousCombatStepWithLlm(
  runtime: GovernedAiPlayerRuntimeDetail,
  observation: AiPlayerAutonomousCombatObservation,
): Promise<{ decision?: AiPlayerAutonomousCombatPlannerDecision; error?: string }> {
  if (!runtime.runtimePolicy.allowLlmProposals) {
    return { error: 'llm proposals disabled for autonomous combat planner' }
  }
  const mockOutput = process.env.NODE_ENV === 'test'
    ? process.env.AI_PLAYER_AUTONOMOUS_COMBAT_MODEL_MOCK_OUTPUT?.trim()
    : ''
  if (mockOutput) {
    const output = parseAiPlayerRuntimeProposalJson(mockOutput)
    for (const request of toAiPlayerActionProposalRequests(observation.aiPlayerId, output)) {
      const decision = decisionFromProposalRequest(request, 'mock:test', runtime.actionWhitelist)
      if (decision) {
        return { decision }
      }
    }
    return { error: 'llm autonomous combat planner returned no allowed combat action' }
  }

  const result = await requestAiPlayerRuntimeProposalFromCandidateTargets({
    candidates: resolveAiPlayerRuntimeModelTargetCandidates({
      factionId: runtime.factionId,
      ownerPlayerId: runtime.governorPlayerId,
    }),
    observation: buildLlmCombatPlannerObservation(runtime, observation),
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
        reason: 'autonomous_combat_planner_preflight',
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
    usageType: 'autonomous_combat_planner',
  })
  for (const request of result.proposalRequests) {
    const decision = decisionFromProposalRequest(
      request,
      result.selectedProvider?.model ?? result.model ?? 'model',
      runtime.actionWhitelist,
    )
    if (decision) {
      return { decision }
    }
  }
  return { error: 'llm autonomous combat planner returned no allowed combat action' }
}

async function planAiPlayerAutonomousCombatStepByMode(
  runtime: GovernedAiPlayerRuntimeDetail,
  observation: AiPlayerAutonomousCombatObservation,
  input: RunAiPlayerAutonomousCombatInput,
) {
  if (input.plannerMode === 'llm') {
    return await planAiPlayerAutonomousCombatStepWithLlm(runtime, observation)
  }
  return planAiPlayerAutonomousCombatStep(runtime, observation)
}

function buildNaturalLanguageResult(decision: AiPlayerAutonomousCombatPlannerDecision, receipt: AiPlayerActionReceipt) {
  if (!receipt.ok) {
    return '这一步战斗动作没有做成，我已记下原因，下一步会换一个更稳的处理方式。'
  }
  switch (decision.action) {
    case 'troop_heal':
      return '部队已经完成整补，兵力和补给更稳了。'
    case 'troop_train':
      return '新的预备队已经补进来，后续打架更有余量。'
    case 'garrison_set':
      return '己方地块已经安排驻防，先把威胁压住。'
    case 'city_siege':
      return '已经发起攻城计划，城防耐久、守军和后续战报都由后端规则结算。'
    case 'rally_launch':
      return '已经发起同盟集结计划，后端会把支援队列接入战区。'
    case 'rally_join':
      return '已经加入同盟集结计划，部队会按后端行军规则接入目标。'
    case 'alliance_help':
      return '已经响应同盟前线协作请求，先把集结和支援节奏接上。'
    case 'world_scout':
      return '高风险目标已先安排侦察，不盲目硬打。'
    case 'tile_occupy':
      return '部队已经按后端规则发起占领，战斗结果会进入战报。'
    case 'march_move':
      return '部队已经向更合适的战斗目标推进。'
    default:
      return `部队已经完成${decision.action}。`
  }
}

function buildCombatPersonalReport(
  runtime: GovernedAiPlayerRuntimeDetail,
  stepOrder: number,
  decision: AiPlayerAutonomousCombatPlannerDecision,
  receipt: AiPlayerActionReceipt,
  naturalLanguageResult: string,
): AiPlayerAutonomousPersonalReport {
  return {
    reportId: randomId('ai_combat_report'),
    ownerPlayerId: runtime.governorPlayerId,
    actorType: 'ai_player',
    aiPlayerId: runtime.aiPlayerId,
    factionId: runtime.factionId,
    category: 'combat',
    action: decision.action,
    title: `战斗第 ${stepOrder} 步`,
    summary: naturalLanguageResult,
    result: receipt.ok ? naturalLanguageResult : '这一步战斗动作没有做成，我已记下原因，下一步会重新看局势。',
    relatedProposalId: receipt.proposalId,
    relatedReceiptProposalId: receipt.proposalId,
    createdAt: receipt.observedAt,
  }
}

export function listAiPlayerAutonomousCombatPersonalReports(aiPlayerId: string, limit = 20) {
  return listAiPlayerAutonomousPersonalReports(aiPlayerId, limit, 'combat')
}

export function listAiPlayerAutonomousCombatPlayerReports(aiPlayerId: string, limit = 20) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    return { error: `ai player not found: ${aiPlayerId}` }
  }
  const normalizedLimit = Math.max(1, Math.min(200, Math.trunc(Number(limit) || 20)))
  const autonomousReports = listAiPlayerAutonomousCombatPersonalReports(aiPlayerId, normalizedLimit)
    .map((report) => ({
      itemKind: 'ai_autonomous_combat' as const,
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

const PLAYER_FACING_FORBIDDEN_TERMS = /proposalId|worldAction|MCP|tool|approve|execute|JSON/g
const PLAYER_FACING_TERM_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\beast_expansion\b/gi, '东线扩张方向'],
  [/\bwest_front\b/gi, '西线前沿'],
  [/\bfrontline_east\b/gi, '东线前沿'],
  [/\bneutral_neighbor\b/gi, '中立邻邦'],
  [/\bwar-room\b/gi, '战情室'],
  [/\boutcome\b/gi, '结果'],
  [/后端行动回报/g, '行动回报'],
  [/后端回报/g, '行动回报'],
  [/后端/g, '规则'],
  [/前端自行拼接/g, '临场猜测'],
  [/前端/g, '界面'],
]

function sanitizePlayerFacingText(text: string) {
  let sanitized = text.replace(PLAYER_FACING_FORBIDDEN_TERMS, '')
  for (const [pattern, replacement] of PLAYER_FACING_TERM_REPLACEMENTS) {
    sanitized = sanitized.replace(pattern, replacement)
  }
  return sanitized
    .replace(/。；/g, '。')
    .replace(/；。/g, '。')
    .replace(/。。+/g, '。')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeEnemyHistoryPage(value: unknown) {
  const numeric = Number(value ?? 1)
  if (!Number.isFinite(numeric)) {
    return 1
  }
  return Math.max(1, Math.min(50, Math.trunc(numeric)))
}

function buildWarRoomAccessScope(runtime: GovernedAiPlayerRuntimeDetail) {
  const world = getWorldStateReadonly()
  const faction = world.factions[runtime.factionId]
  const scopeKind = faction?.nationTier === 'empire'
    ? 'empire_war_room'
    : faction?.nationName || faction?.nationTier
      ? 'kingdom_war_room'
      : 'alliance_war_room'
  const organizationId = String(faction?.organizationId ?? `${runtime.factionId}_alliance`).trim()
  const organizationName = String(faction?.organizationName ?? faction?.nationName ?? '本方同盟').trim()
  const kingdomId = String(faction?.nationName ? `${runtime.factionId}_kingdom` : organizationId).trim()
  const empireId = faction?.nationTier === 'empire' ? `${runtime.factionId}_empire` : ''
  return {
    scopeKind,
    factionId: runtime.factionId,
    organizationId,
    organizationName,
    kingdomId,
    empireId,
    allowedFactionIds: [runtime.factionId],
    permissionSummary: sanitizePlayerFacingText(`war-room 权限隔离：${organizationName} 的${scopeKind === 'empire_war_room' ? '帝国' : scopeKind === 'kingdom_war_room' ? '王国' : '同盟'}战情只向本势力成员开放，敌对势力不可读取或订阅。`),
  }
}

export function getAiPlayerAutonomousCombatWarRoomUiState(aiPlayerId: string) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    return { error: `ai player not found: ${aiPlayerId}` }
  }
  const existing = warRoomUiStateByAiPlayerId.get(aiPlayerId)
  if (existing) {
    return {
      ok: true as const,
      aiPlayerId,
      ownerPlayerId: runtime.governorPlayerId,
      uiState: existing,
    }
  }
  const now = new Date().toISOString()
  const uiState: AiPlayerAutonomousCombatWarRoomUiState = {
    itemKind: 'ai_autonomous_combat_war_room_ui_state',
    aiPlayerId,
    selectedEnemyId: '',
    enemyHistoryPage: 1,
    updatedAt: now,
    playerFacingSummary: sanitizePlayerFacingText('玩家 war-room 筛选和分页状态尚未保存，默认从第一位敌军和第一页开始。'),
  }
  return {
    ok: true as const,
    aiPlayerId,
    ownerPlayerId: runtime.governorPlayerId,
    uiState,
  }
}

export function upsertAiPlayerAutonomousCombatWarRoomUiState(
  aiPlayerId: string,
  input: { selectedEnemyId?: unknown; enemyHistoryPage?: unknown },
) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    return { error: `ai player not found: ${aiPlayerId}` }
  }
  const previous = warRoomUiStateByAiPlayerId.get(aiPlayerId)
  const selectedEnemyId = String(input.selectedEnemyId ?? previous?.selectedEnemyId ?? '').trim()
  const enemyHistoryPage = normalizeEnemyHistoryPage(input.enemyHistoryPage ?? previous?.enemyHistoryPage ?? 1)
  const now = new Date().toISOString()
  const uiState: AiPlayerAutonomousCombatWarRoomUiState = {
    itemKind: 'ai_autonomous_combat_war_room_ui_state',
    aiPlayerId,
    selectedEnemyId,
    enemyHistoryPage,
    updatedAt: now,
    playerFacingSummary: sanitizePlayerFacingText(`玩家 war-room 筛选已保存：当前敌军${selectedEnemyId || '默认敌军'}，历史分页第${enemyHistoryPage}页。`),
  }
  warRoomUiStateByAiPlayerId.set(aiPlayerId, uiState)
  return {
    ok: true as const,
    aiPlayerId,
    ownerPlayerId: runtime.governorPlayerId,
    uiState,
  }
}

function buildRallyCampaignMemory(
  observation: AiPlayerAutonomousCombatObservation,
  reports: AiPlayerAutonomousPersonalReport[],
) {
  const rallyObjective = selectRallyCampaignObjective(observation)
  const rallyActionCount = reports.filter((report) => (
    report.action === 'rally_launch'
    || report.action === 'rally_join'
    || report.action === 'alliance_help'
  )).length
  const rallyBattle = observation.battleReports.find((report) => (
    String(report.summary ?? '').includes('集结')
    || String(report.regionId ?? '') === String(rallyObjective?.regionId ?? '')
  ))
  if (rallyObjective) {
    const target = rallyObjective.targetName || rallyObjective.regionId || '同盟前线'
    const countText = rallyActionCount > 0 ? `，今日已响应${rallyActionCount}次` : ''
    const battleText = rallyBattle ? `，已有战斗记忆：${String(rallyBattle.summary ?? '').trim()}` : ''
    return sanitizePlayerFacingText(`${target}仍是战役接力点${countText}${battleText}。`)
  }
  if (rallyActionCount > 0) {
    return sanitizePlayerFacingText(`今天已完成${rallyActionCount}次同盟协作，后续继续看前线需求。`)
  }
  return '暂时没有新的同盟集结接力，我先保持待命观察。'
}

function selectRallyCampaignObjective(observation: AiPlayerAutonomousCombatObservation) {
  const rallyObjectives = observation.warObjectives.filter((objective) => objective.kind === 'alliance_rally')
  const battleRegionIds = new Set(observation.battleReports
    .map((report) => String(report.regionId ?? '').trim())
    .filter((regionId) => regionId.length > 0))
  return rallyObjectives.find((objective) => objective.regionId && battleRegionIds.has(objective.regionId))
    ?? rallyObjectives[0]
}

function buildDiplomacyPosture(factionId: string) {
  const world = getWorldStateReadonly()
  const agreements = (world.feedback.diplomacyAgreements ?? [])
    .filter((agreement) => agreement.parties.includes(factionId))
    .slice(-3)
  if (agreements.length === 0) {
    return '眼下没有新的停火、盟约或贸易协定，我会按敌我目标谨慎推进。'
  }
  const typeLabels: Record<string, string> = {
    ceasefire: '停火',
    alliance: '盟约',
    trade: '贸易',
  }
  const parts = agreements.map((agreement) => {
    const counterpart = agreement.parties.find((party) => party !== factionId) ?? '相关势力'
    return `${typeLabels[agreement.type] ?? '协定'}对象${counterpart}，${agreement.terms}`
  })
  return sanitizePlayerFacingText(`${parts.join('；')}。`)
}

function buildCrossDayRecap(
  observation: AiPlayerAutonomousCombatObservation,
  reports: AiPlayerAutonomousPersonalReport[],
) {
  const previousBattle = observation.battleReports.find((report) => (
    String(report.summary ?? '').includes('昨日')
    || Number(report.tick ?? observation.tick) < observation.tick
  ))
  const latestAction = reports[0]
  if (previousBattle && latestAction) {
    return sanitizePlayerFacingText(`昨天留下的线索是${String(previousBattle.summary ?? '').trim()}，今天接上${latestAction.result || latestAction.summary}。`)
  }
  if (previousBattle) {
    return sanitizePlayerFacingText(`昨天留下的线索是${String(previousBattle.summary ?? '').trim()}，今天继续接力观察。`)
  }
  if (latestAction) {
    return sanitizePlayerFacingText(`今天先记录${latestAction.result || latestAction.summary}，明天按同一战线继续复核。`)
  }
  return '暂时没有昨天留下的战斗线索，今天先建立第一条可追踪记录。'
}

function buildRallyCampaignState(
  runtime: GovernedAiPlayerRuntimeDetail,
  observation: AiPlayerAutonomousCombatObservation,
  reports: AiPlayerAutonomousPersonalReport[],
) {
  const rallyObjective = selectRallyCampaignObjective(observation)
  const rallyActions = reports.filter((report) => (
    report.action === 'rally_launch'
    || report.action === 'rally_join'
    || report.action === 'alliance_help'
  ))
  const regionId = String(rallyObjective?.regionId ?? '').trim()
  const relatedBattles = observation.battleReports.filter((report) => (
    String(report.summary ?? '').includes('集结')
    || (regionId !== '' && String(report.regionId ?? '') === regionId)
  ))
  const campaignMemory = buildRallyCampaignMemory(observation, reports)
  const diplomacyPosture = buildDiplomacyPosture(runtime.factionId)
  const crossDayRecap = buildCrossDayRecap(observation, reports)
  const lastAction = rallyActions[0]
  return {
    stateKind: 'ai_rally_campaign_state' as const,
    campaignId: `ai_rally_campaign_${runtime.factionId}_${regionId || 'frontline'}`,
    aiPlayerId: runtime.aiPlayerId,
    factionId: runtime.factionId,
    regionId: regionId || undefined,
    targetName: rallyObjective?.targetName ?? (regionId ? regionId : '同盟前线'),
    currentPhase: rallyActions.length > 0 ? ('rally_active' as const) : ('watching' as const),
    rallyActionCount: rallyActions.length,
    relatedBattleCount: relatedBattles.length,
    lastAction: lastAction?.action,
    lastActionAt: lastAction?.createdAt,
    campaignMemory,
    diplomacyPosture,
    crossDayRecap,
    playerFacingSummary: sanitizePlayerFacingText(`${campaignMemory}${diplomacyPosture}${crossDayRecap}`),
    updatedAt: new Date().toISOString(),
  }
}

function buildDiplomacyChanges(factionId: string) {
  const world = getWorldStateReadonly()
  return (world.feedback.diplomacyAgreements ?? [])
    .filter((agreement) => agreement.parties.includes(factionId))
    .slice(-8)
    .map((agreement) => {
      const counterpart = agreement.parties.find((party) => party !== factionId) ?? '相关势力'
      const relationLabel: Record<string, string> = {
        ceasefire: '停火',
        alliance: '盟约',
        trade: '贸易',
      }
      return {
        relation: agreement.type,
        counterpart,
        terms: agreement.terms,
        tick: agreement.tick,
        playerFacingSummary: sanitizePlayerFacingText(`外交变化：与${counterpart}形成${relationLabel[agreement.type] ?? '外交'}，${agreement.terms}。`),
      }
    })
}

function buildCampaignRecapEntries(
  observation: AiPlayerAutonomousCombatObservation,
  reports: AiPlayerAutonomousPersonalReport[],
  regionId: string,
) {
  const battleEntries = observation.battleReports
    .filter((report) => (
      String(report.summary ?? '').includes('集结')
      || String(report.summary ?? '').includes('昨日')
      || (regionId !== '' && String(report.regionId ?? '') === regionId)
    ))
    .slice(0, 8)
    .map((report) => ({
      kind: 'battle_memory' as const,
      tick: report.tick,
      regionId: report.regionId,
      tileId: report.tileId,
      playerFacingSummary: sanitizePlayerFacingText(String(report.summary ?? '战役战斗记录').trim()),
    }))
  const actionEntries = reports
    .filter((report) => (
      report.action === 'rally_launch'
      || report.action === 'rally_join'
      || report.action === 'alliance_help'
      || report.action === 'city_siege'
    ))
    .slice(0, 8)
    .map((report) => ({
      kind: 'ai_action_memory' as const,
      createdAt: report.createdAt,
      action: report.action,
      playerFacingSummary: sanitizePlayerFacingText(report.result || report.summary || 'AI 已记录一条同盟战役行动。'),
    }))
  return [...battleEntries, ...actionEntries]
}

function buildAllianceWarStateTransitions(
  rallyState: ReturnType<typeof buildRallyCampaignState>,
  observation: AiPlayerAutonomousCombatObservation,
  reports: AiPlayerAutonomousPersonalReport[],
) {
  const transitions = [{
    fromPhase: 'watching',
    toPhase: observation.warObjectives.some((objective) => objective.kind === 'cross_player_target')
      ? 'target_screening'
      : 'frontline_watch',
    tick: observation.tick,
    playerFacingSummary: sanitizePlayerFacingText('阶段迁移：从前线观察进入目标筛选，先确认敌对玩家和同盟边界。'),
  }]
  if (observation.warObjectives.some((objective) => objective.kind === 'alliance_rally') || rallyState.rallyActionCount > 0) {
    transitions.push({
      fromPhase: 'target_screening',
      toPhase: 'rally_coordination',
      tick: observation.tick,
      playerFacingSummary: sanitizePlayerFacingText('阶段迁移：目标筛选后进入同盟集结协调，准备跨日 rally 接力。'),
    })
  }
  if (observation.warObjectives.some((objective) => objective.kind === 'siege') || reports.some((report) => report.action === 'city_siege')) {
    transitions.push({
      fromPhase: 'rally_coordination',
      toPhase: 'siege_execution',
      tick: observation.tick,
      playerFacingSummary: sanitizePlayerFacingText('阶段迁移：同盟集结形成后进入攻城执行，开始围绕城防和守军推进。'),
    })
  }
  if (reports.some((report) => report.action === 'rally_launch' || report.action === 'rally_join' || report.action === 'city_siege')) {
    transitions.push({
      fromPhase: 'siege_execution',
      toPhase: 'after_action_review',
      tick: observation.tick,
      playerFacingSummary: sanitizePlayerFacingText('阶段迁移：攻城和集结行动完成后进入战役复盘，保留下一日行动线索。'),
    })
  }
  return transitions.slice(0, 8)
}

function buildAllianceWarDiplomacyTasks(
  factionId: string,
  diplomacyChanges: ReturnType<typeof buildDiplomacyChanges>,
) {
  const tasks = diplomacyChanges.map((change) => {
    const counterpart = sanitizePlayerFacingText(String(change.counterpart ?? '相关势力'))
    const verb = change.relation === 'ceasefire'
      ? '维护停火边界'
      : change.relation === 'alliance'
        ? '同步盟友战役目标'
        : '确认通行与补给约定'
    return {
      taskKind: 'diplomacy_followup',
      counterpart,
      priority: change.relation === 'alliance' ? 85 : 70,
      playerFacingSummary: sanitizePlayerFacingText(`外交任务：与${counterpart}${verb}，避免同盟集结误伤或断线。`),
    }
  })
  if (tasks.length === 0) {
    tasks.push({
      taskKind: 'frontline_boundary_check' as const,
      counterpart: '周边势力',
      priority: 60,
      playerFacingSummary: sanitizePlayerFacingText(`外交任务：${factionId}需要复核周边停火、盟友和敌对边界，再推进同盟战役。`),
    })
  }
  return tasks.slice(0, 8)
}

function buildFailedTargetMemories(
  aiPlayerId: string,
  observation: AiPlayerAutonomousCombatObservation,
  regionId: string,
) {
  const failedTargetTileIds = [...buildFailedTargetTileIds(aiPlayerId)]
  const memories = failedTargetTileIds.slice(0, 8).map((tileId) => {
    const target = observation.enemyTargets.find((candidate) => candidate.tileId === tileId)
    return {
      targetTileId: tileId,
      regionId: regionId || target?.owner,
      memoryKind: 'failed_target_memory',
      playerFacingSummary: sanitizePlayerFacingText(`失败目标长期记忆：${target?.name ?? tileId}曾经执行失败，后续优先绕开或改换备用目标。`),
    }
  })
  if (memories.length === 0) {
    const fallbackTarget = observation.enemyTargets.find((target) => target.risk === 'high')
      ?? observation.enemyTargets[0]
    memories.push({
      targetTileId: fallbackTarget?.tileId,
      regionId: regionId || fallbackTarget?.owner,
      memoryKind: 'failed_target_watchlist' as const,
      playerFacingSummary: sanitizePlayerFacingText(`失败目标长期记忆：暂无新失败 receipt，仍保留高风险目标观察，必要时绕开并改换备用目标。`),
    })
  }
  return memories.slice(0, 8)
}

function buildCrossDayActionList(
  observation: AiPlayerAutonomousCombatObservation,
  reports: AiPlayerAutonomousPersonalReport[],
  regionId: string,
) {
  const actionEntries = reports
    .filter((report) => (
      report.action === 'world_scout'
      || report.action === 'city_siege'
      || report.action === 'rally_launch'
      || report.action === 'rally_join'
      || report.action === 'alliance_help'
      || report.action === 'garrison_set'
    ))
    .slice(0, 12)
    .map((report, index) => ({
      listKind: 'ai_campaign_action' as const,
      order: index + 1,
      action: report.action,
      createdAt: report.createdAt,
      playerFacingSummary: sanitizePlayerFacingText(`跨日行动：${report.result || report.summary || 'AI 已完成一条同盟战役行动。'}`),
    }))
  const objectiveEntries = observation.warObjectives.slice(0, Math.max(0, 12 - actionEntries.length)).map((objective, index) => ({
    listKind: 'campaign_objective' as const,
    order: actionEntries.length + index + 1,
    objectiveKind: objective.kind,
    regionId: objective.regionId ?? regionId,
    targetTileId: objective.targetTileId,
    playerFacingSummary: sanitizePlayerFacingText(`跨日行动线索：${objective.playerFacingSummary}`),
  }))
  return [...actionEntries, ...objectiveEntries].slice(0, 12)
}

function buildHostileDossiers(
  observation: AiPlayerAutonomousCombatObservation,
  regionId: string,
) {
  const owners = new Map<string, {
    targetCount: number
    pressure: number
    names: Set<string>
  }>()
  for (const target of observation.enemyTargets) {
    const owner = String(target.owner ?? '敌对势力').trim() || '敌对势力'
    const current = owners.get(owner) ?? { targetCount: 0, pressure: 0, names: new Set<string>() }
    current.targetCount += 1
    current.pressure += Number(target.enemyPressure ?? 0)
    current.names.add(String(target.name ?? target.tileId ?? '敌方目标'))
    owners.set(owner, current)
  }
  if (owners.size === 0) {
    owners.set('敌对势力', { targetCount: 1, pressure: 1, names: new Set([regionId || '前线']) })
  }
  return [...owners.entries()].slice(0, 8).map(([owner, info]) => ({
    hostileId: owner,
    targetCount: info.targetCount,
    pressure: info.pressure,
    playerFacingSummary: sanitizePlayerFacingText(`敌对势力档案：${owner}在${[...info.names].slice(0, 2).join('、')}一线有交手记录，累计${info.targetCount}个目标进入战报复盘。`),
  }))
}

function resolveEnemyKind(enemyId: string): 'human_player' | 'ai_player' | 'hostile_force' {
  const normalized = enemyId.toLowerCase()
  if (normalized.includes('ai')) {
    return 'ai_player'
  }
  if (normalized.includes('player') || normalized.includes('rival') || normalized.includes('human')) {
    return 'human_player'
  }
  return 'hostile_force'
}

function resolveEnemyKindLabel(enemyKind: 'human_player' | 'ai_player' | 'hostile_force') {
  if (enemyKind === 'ai_player') {
    return '敌对AI玩家'
  }
  if (enemyKind === 'human_player') {
    return '敌对玩家'
  }
  return '敌对势力'
}

function resolveEnemyUnitLabel(unitId: string, summary: string, targetType?: string) {
  const text = `${unitId} ${summary} ${targetType ?? ''}`.toLowerCase()
  if (text.includes('siege') || summary.includes('攻城') || summary.includes('城防') || targetType === 'city') {
    return '攻城队'
  }
  if (text.includes('cavalry') || summary.includes('骑兵')) {
    return '骑兵'
  }
  if (text.includes('archer') || summary.includes('弓')) {
    return '弓兵'
  }
  if (text.includes('infantry') || summary.includes('步兵')) {
    return '步兵'
  }
  return '部队'
}

function buildEnemyDossierEntries(
  observation: AiPlayerAutonomousCombatObservation,
  regionId: string,
) {
  const targetsByTile = new Map(observation.enemyTargets.map((target) => [target.tileId, target] as const))
  const dossiers = new Map<string, {
    enemyKind: 'human_player' | 'ai_player' | 'hostile_force'
    winCount: number
    lossCount: number
    drawCount: number
    pressure: number
    targets: Map<string, number>
    unitTypes: Map<string, number>
    siegeCount: number
    attackCount: number
  }>()
  const ensure = (enemyId: string) => {
    const normalizedEnemyId = String(enemyId || '敌对势力').trim() || '敌对势力'
    const current = dossiers.get(normalizedEnemyId)
    if (current) {
      return current
    }
    const created = {
      enemyKind: resolveEnemyKind(normalizedEnemyId),
      winCount: 0,
      lossCount: 0,
      drawCount: 0,
      pressure: 0,
      targets: new Map<string, number>(),
      unitTypes: new Map<string, number>(),
      siegeCount: 0,
      attackCount: 0,
    }
    dossiers.set(normalizedEnemyId, created)
    return created
  }
  const addTarget = (entry: ReturnType<typeof ensure>, targetName: string) => {
    const normalized = String(targetName || '前线目标').trim() || '前线目标'
    entry.targets.set(normalized, (entry.targets.get(normalized) ?? 0) + 1)
  }
  const addUnitType = (entry: ReturnType<typeof ensure>, unitType: string) => {
    const normalized = String(unitType || '部队').trim() || '部队'
    entry.unitTypes.set(normalized, (entry.unitTypes.get(normalized) ?? 0) + 1)
  }
  for (const target of observation.enemyTargets) {
    const entry = ensure(target.owner ?? '敌对势力')
    entry.pressure += Number(target.enemyPressure ?? 0)
    addTarget(entry, String(target.name ?? target.tileId ?? regionId ?? '前线目标'))
    addUnitType(entry, resolveEnemyUnitLabel('', '', target.type))
    if (target.type === 'city' || target.suggestedAction === 'world_scout' && target.risk === 'high') {
      entry.siegeCount += 1
    }
  }
  for (const report of observation.battleReports) {
    const attacker = String(report.attackerFaction ?? '').trim()
    const enemyId = attacker !== '' && attacker !== observation.factionId
      ? attacker
      : String(targetsByTile.get(String(report.tileId ?? ''))?.owner ?? attacker ?? '敌对势力')
    const entry = ensure(enemyId)
    entry.attackCount += 1
    if (report.outcome === 'win') {
      entry.winCount += 1
    } else if (report.outcome === 'loss') {
      entry.lossCount += 1
    } else {
      entry.drawCount += 1
    }
    const target = targetsByTile.get(String(report.tileId ?? ''))
    addTarget(entry, String(target?.name ?? report.tileId ?? regionId ?? '前线目标'))
    const unitType = resolveEnemyUnitLabel(
      String(report.attackerUnitId ?? ''),
      String(report.summary ?? ''),
      target?.type,
    )
    addUnitType(entry, unitType)
    if (unitType === '攻城队' || String(report.summary ?? '').includes('攻城') || target?.type === 'city') {
      entry.siegeCount += 1
    }
  }
  if (dossiers.size === 0) {
    const entry = ensure('敌对势力')
    addTarget(entry, regionId || '前线目标')
    addUnitType(entry, '部队')
  }
  return [...dossiers.entries()]
    .sort((left, right) => (
      right[1].attackCount - left[1].attackCount
      || right[1].pressure - left[1].pressure
      || left[0].localeCompare(right[0])
    ))
    .slice(0, 12)
    .map(([enemyId, entry]) => {
      const enemyKindLabel = resolveEnemyKindLabel(entry.enemyKind)
      const sortedTargets = [...entry.targets.entries()].sort((left, right) => right[1] - left[1]).map(([name]) => name).slice(0, 3)
      const sortedUnitTypes = [...entry.unitTypes.entries()].sort((left, right) => right[1] - left[1]).map(([name]) => name).slice(0, 3)
      const frequentTargetSummary = `常打目标：${sortedTargets.join('、') || (regionId || '前线目标')}。`
      const frequentUnitSummary = `常用兵种：${sortedUnitTypes.join('、') || '部队'}。`
      const winLossSummary = `胜负：我方守住${entry.winCount}次、失守${entry.lossCount}次、僵持${entry.drawCount}次。`
      const siegePreferenceSummary = entry.siegeCount > 0
        ? `攻城偏好：偏好压城防和耐久，相关记录${entry.siegeCount}条。`
        : `攻城偏好：暂未形成持续攻城偏好，仍需观察城防目标。`
      const counterAdviceSummary = entry.siegeCount > 0 || entry.pressure >= 4
        ? `反制建议：优先驻防高压城防，先侦察敌方集结，再决定反击或绕开。`
        : `反制建议：保持侦察和预备队，敌方再来袭时用战报复盘后反击。`
      return {
        dossierKind: 'long_term_enemy_dossier' as const,
        enemyId,
        enemyKind: entry.enemyKind,
        targetCount: entry.targets.size,
        battleCount: entry.attackCount,
        winCount: entry.winCount,
        lossCount: entry.lossCount,
        drawCount: entry.drawCount,
        pressure: entry.pressure,
        winLossSummary: sanitizePlayerFacingText(winLossSummary),
        frequentTargetSummary: sanitizePlayerFacingText(frequentTargetSummary),
        frequentUnitSummary: sanitizePlayerFacingText(frequentUnitSummary),
        siegePreferenceSummary: sanitizePlayerFacingText(siegePreferenceSummary),
        counterAdviceSummary: sanitizePlayerFacingText(counterAdviceSummary),
        playerFacingSummary: sanitizePlayerFacingText(`${enemyKindLabel} ${enemyId} 敌军档案：${winLossSummary}${frequentTargetSummary}${frequentUnitSummary}${siegePreferenceSummary}${counterAdviceSummary}`),
      }
    })
}

type EnemyDossierEntry = ReturnType<typeof buildEnemyDossierEntries>[number]

function buildEnemyComparisonRows(enemyDossierEntries: EnemyDossierEntry[]) {
  return enemyDossierEntries.slice(0, 8).map((entry, index) => {
    const threatScore = Number(entry.pressure ?? 0) + Number(entry.battleCount ?? 0) * 2 + Number(entry.lossCount ?? 0) * 3
      return {
        rowKind: 'war_room_enemy_comparison' as const,
        order: index + 1,
        enemyId: entry.enemyId,
        enemyKind: entry.enemyKind,
        threatScore,
        playerFacingSummary: sanitizePlayerFacingText(`敌军对比：${entry.enemyId} 威胁${threatScore}，${entry.winLossSummary}${entry.frequentTargetSummary}${entry.counterAdviceSummary}`),
      }
  })
}

function buildIncomingAttackTimeline(
  observation: AiPlayerAutonomousCombatObservation,
  regionId: string,
) {
  const targetsByTile = new Map(observation.enemyTargets.map((target) => [target.tileId, target] as const))
  const timeline = observation.battleReports
    .filter((report) => (
      String(report.attackerFaction ?? '') !== observation.factionId
      || report.outcome === 'loss'
      || report.severity === 'high'
      || String(report.summary ?? '').includes('敌')
      || String(report.summary ?? '').includes('攻')
    ))
    .slice(0, 12)
    .map((report, index) => {
      const target = targetsByTile.get(String(report.tileId ?? ''))
      const enemyId = String(report.attackerFaction ?? target?.owner ?? '敌方').trim() || '敌方'
      return {
        timelineKind: 'incoming_attack' as const,
        order: index + 1,
        tick: report.tick,
        enemyId,
        targetTileId: report.tileId,
        regionId: report.regionId ?? regionId,
        outcome: report.outcome,
        playerFacingSummary: sanitizePlayerFacingText(`来袭时间线：第${report.tick}刻 ${enemyId} 攻打${target?.name ?? report.tileId ?? (regionId || '前线')}，战报结果${report.outcome === 'win' ? '我方守住' : report.outcome === 'loss' ? '我方失守或高损' : '双方僵持'}。${String(report.summary ?? '')}`),
      }
    })
  if (timeline.length === 0) {
    timeline.push({
      timelineKind: 'incoming_attack' as const,
      order: 1,
      tick: observation.tick,
      enemyId: '敌方',
      targetTileId: '',
      regionId: regionId || '前线',
      outcome: 'draw' as const,
      playerFacingSummary: sanitizePlayerFacingText(`来袭时间线：当前没有新的敌方攻打战报，继续观察${regionId || '前线'}。`),
    })
  }
  for (const target of observation.enemyTargets) {
    if (timeline.length >= 2) {
      break
    }
    timeline.push({
      timelineKind: 'incoming_attack' as const,
      order: timeline.length + 1,
      tick: observation.tick,
      enemyId: String(target.owner ?? '敌方'),
      targetTileId: target.tileId,
      regionId: regionId || String(target.owner ?? '前线'),
      outcome: 'draw' as const,
      playerFacingSummary: sanitizePlayerFacingText(`来袭时间线：${target.owner ?? '敌方'} 持续威胁${target.name ?? target.tileId}，暂无新战报但已列入前线攻打观察。`),
    })
  }
  return timeline
}

function buildRepeatedFailedTargetRows(
  observation: AiPlayerAutonomousCombatObservation,
  failedTargetMemories: ReturnType<typeof buildFailedTargetMemories>,
  regionId: string,
) {
  const highLossReportsByTile = new Map<string, number>()
  for (const report of observation.battleReports) {
    const key = String(report.tileId ?? '').trim()
    if (key === '') {
      continue
    }
    const highLoss = report.outcome === 'loss' || report.severity === 'high' || Number(report.ownLoss ?? 0) >= 20
    if (highLoss) {
      highLossReportsByTile.set(key, (highLossReportsByTile.get(key) ?? 0) + 1)
    }
  }
  const rows = failedTargetMemories.slice(0, 8).map((memory, index) => {
    const targetTileId = String(memory.targetTileId ?? '').trim()
    const repeatCount = Math.max(1, highLossReportsByTile.get(targetTileId) ?? 1)
    return {
      rowKind: 'repeated_failed_target' as const,
      order: index + 1,
      targetTileId,
      regionId: memory.regionId ?? regionId,
      repeatCount,
      playerFacingSummary: sanitizePlayerFacingText(`重复失败目标：${targetTileId || (regionId || '前线目标')} 已出现${repeatCount}次失败或高损记忆，建议先驻防侦察，必要时绕开并改换备用目标。${memory.playerFacingSummary}`),
    }
  })
  if (rows.length === 0) {
    rows.push({
      rowKind: 'repeated_failed_target' as const,
      order: 1,
      targetTileId: '',
      regionId: regionId || '前线',
      repeatCount: 1,
      playerFacingSummary: sanitizePlayerFacingText(`重复失败目标：暂无明确失败目标，先把${regionId || '前线'}高压点列入观察。`),
    })
  }
  return rows
}

function buildResponsePlanCandidates(
  enemyDossierEntries: EnemyDossierEntry[],
  repeatedFailedTargetRows: ReturnType<typeof buildRepeatedFailedTargetRows>,
  regionId: string,
) {
  const primaryEnemy = enemyDossierEntries[0]
  const failedTarget = repeatedFailedTargetRows[0]
  const targetText = String(failedTarget?.targetTileId || regionId || primaryEnemy?.enemyId || '前线目标')
  const garrisonPlan = {
    planKind: 'garrison' as const,
    priority: 90,
    enemyId: primaryEnemy?.enemyId ?? '敌方',
    targetTileId: failedTarget?.targetTileId ?? '',
    proposalReadinessSummary: sanitizePlayerFacingText(`防守分配建议：可提交给真人确认，确认后由后端排驻防计划，不需要前端生成执行字段。`),
    batchProposalReadinessSummary: sanitizePlayerFacingText(`批量防守分配：可把多个高压前线一起提交给真人确认，确认后由后端排多支部队驻防计划。`),
    playerFacingSummary: sanitizePlayerFacingText(`驻防计划：优先守住${targetText}，补前排并侦察${primaryEnemy?.enemyId ?? '敌方'}集结，避免再次高损。`),
  }
  const counterattackPlan = {
    planKind: 'counterattack' as const,
    priority: 70,
    enemyId: primaryEnemy?.enemyId ?? '敌方',
    targetTileId: failedTarget?.targetTileId ?? '',
    proposalReadinessSummary: sanitizePlayerFacingText(`防守分配建议：先等待真人确认侦察与驻防安排，再由后端 proposal 生命周期执行。`),
    batchProposalReadinessSummary: sanitizePlayerFacingText(`批量防守分配：若多个前线同时来袭，先由真人确认，再提交多成员驻防批次。`),
    playerFacingSummary: sanitizePlayerFacingText(`反击计划：等侦察确认敌军空档后再反击${targetText}；若仍是高压目标，绕开并改打相邻低风险地块。`),
  }
  return [garrisonPlan, counterattackPlan]
}

function buildEnemyFilterOptions(enemyDossierEntries: EnemyDossierEntry[]) {
  return enemyDossierEntries.slice(0, 8).map((entry, index) => ({
    filterKind: 'enemy_dossier_filter' as const,
    order: index + 1,
    enemyId: entry.enemyId,
    enemyKind: entry.enemyKind,
    playerFacingSummary: sanitizePlayerFacingText(`敌军筛选：查看${entry.enemyId}，${entry.winLossSummary}${entry.frequentTargetSummary}威胁值${entry.pressure}。`),
  }))
}

function buildEnemyHistoryPages(
  enemyDossierEntries: EnemyDossierEntry[],
  incomingAttackTimeline: ReturnType<typeof buildIncomingAttackTimeline>,
  pageSize = 2,
) {
  return enemyDossierEntries.slice(0, 4).map((entry) => {
    const matchedTimeline = incomingAttackTimeline
      .filter((timelineEntry) => String(timelineEntry.enemyId ?? '') === entry.enemyId)
      .slice(0, pageSize)
      .map((timelineEntry, index) => ({
        rowKind: 'enemy_history_timeline_row' as const,
        order: index + 1,
        playerFacingSummary: timelineEntry.playerFacingSummary,
      }))
    const items = matchedTimeline.length > 0
      ? matchedTimeline
      : [
        {
          rowKind: 'enemy_history_summary_row' as const,
          order: 1,
          playerFacingSummary: entry.winLossSummary,
        },
        {
          rowKind: 'enemy_history_summary_row' as const,
          order: 2,
          playerFacingSummary: `${entry.frequentTargetSummary}${entry.counterAdviceSummary}`,
        },
      ]
    return {
      pageKind: 'single_enemy_history_page' as const,
      enemyId: entry.enemyId,
      page: 1,
      pageSize,
      nextPageLabel: items.length >= pageSize ? '下一页：继续查看该敌军历史' : '已到末页',
      playerFacingTitle: sanitizePlayerFacingText(`单个敌军历史：${entry.enemyId}`),
      playerFacingSummary: sanitizePlayerFacingText(`敌军历史分页：${entry.enemyId} 的胜负、来袭和反制记录。`),
      items,
    }
  })
}

function buildLiveIncomingAttackUpdates(
  incomingAttackTimeline: ReturnType<typeof buildIncomingAttackTimeline>,
  observation: AiPlayerAutonomousCombatObservation,
) {
  const latestTick = Math.max(...incomingAttackTimeline.map((entry) => Number(entry.tick ?? 0)), observation.tick)
  return incomingAttackTimeline.slice(0, 4).map((entry, index) => ({
    updateKind: 'live_incoming_attack_delta' as const,
    order: index + 1,
    tick: entry.tick ?? latestTick,
    enemyId: entry.enemyId,
    targetTileId: entry.targetTileId,
    playerFacingSummary: sanitizePlayerFacingText(`实时来袭更新：刚刚刷新${entry.enemyId ?? '敌方'}前线动向，${entry.playerFacingSummary} 建议同步驻防和侦察。`),
  }))
}

function readPlanOrdersFromReceipt(receipt: AiPlayerActionReceipt) {
  const payload = receipt.worldActionPayload && typeof receipt.worldActionPayload === 'object'
    ? receipt.worldActionPayload
    : {}
  const plan = payload.plan && typeof payload.plan === 'object'
    ? payload.plan as Record<string, unknown>
    : {}
  const orders = Array.isArray(plan.orders) ? plan.orders : []
  return orders
    .filter((order): order is Record<string, unknown> => !!order && typeof order === 'object')
    .map((order) => ({
      unitId: String(order.unitId ?? '').trim(),
      targetTileId: String(order.target ?? order.targetTileId ?? '').trim(),
      action: String(order.action ?? 'garrison').trim(),
    }))
    .filter((order) => order.targetTileId !== '')
}

function buildDefenseAssignmentResults(aiPlayerId: string, regionId: string) {
  const world = getWorldStateReadonly()
  return listAiPlayerActionReceipts(aiPlayerId, 64)
    .filter((receipt) => (
      receipt.ok
      && (receipt.action === 'alliance_defense_assign' || receipt.action === 'alliance_defense_batch_assign')
    ))
    .slice(0, 8)
    .map((receipt, index) => {
      const orders = readPlanOrdersFromReceipt(receipt)
      const isBatch = receipt.action === 'alliance_defense_batch_assign'
      const targetText = orders.length > 0
        ? orders.map((order) => order.targetTileId).slice(0, 3).join('、')
        : (regionId || '前线')
      return {
        resultKind: isBatch ? 'batch_defense_assignment_result' as const : 'defense_assignment_result' as const,
        order: index + 1,
        action: receipt.action,
        targetTileIds: orders.map((order) => order.targetTileId),
        assignmentCount: Math.max(1, orders.length),
        outcomeRows: orders.map((order, rowIndex) => {
          const unit = world.units.find((candidate) => candidate.id === order.unitId)
          const target = world.map.tiles.find((tile) => tile.id === order.targetTileId)
          return {
            rowKind: 'defense_execution_outcome' as const,
            order: rowIndex + 1,
            memberId: unit?.aiPlayerId ?? aiPlayerId,
            memberLabel: sanitizePlayerFacingText(`成员${rowIndex + 1}：${(unit?.name ?? order.unitId) || '驻防队伍'}`),
            unitId: order.unitId,
            teamId: unit?.teamId ?? '',
            teamIndex: unit?.teamIndex ?? rowIndex + 1,
            teamLabel: sanitizePlayerFacingText(`第${unit?.teamIndex ?? rowIndex + 1}队`),
            targetTileId: order.targetTileId,
            targetSummary: sanitizePlayerFacingText(`目标：${(target?.name ?? order.targetTileId) || regionId || '前线'}，执行驻防并观察敌军来袭。`),
            ownLoss: 0,
            enemyLoss: 0,
            lossSummary: sanitizePlayerFacingText('战损：已提交驻防，等待下一次战报结算；当前按我方0、敌方0记录初始执行 outcome。'),
            counterAdviceSummary: sanitizePlayerFacingText('反制建议：保持驻防，补侦察；若敌方继续压城，优先反击低风险侧翼，避免硬冲高损目标。'),
            playerFacingSummary: sanitizePlayerFacingText(`成员${rowIndex + 1} 第${unit?.teamIndex ?? rowIndex + 1}队 防守执行 outcome：目标${(target?.name ?? order.targetTileId) || '前线'}，战损待战报结算，反制建议为驻防、侦察和择机反击。`),
          }
        }),
        observedAt: receipt.observedAt,
        playerFacingSummary: sanitizePlayerFacingText(`${isBatch ? '批量防守分配' : '防守分配'}已提交：${targetText} 已排入驻防计划，并回写到同盟战报和敌军档案供复盘；每队 outcome 记录成员、队伍、目标、战损和反制建议。`),
      }
    })
}

function buildDefenseExecutionOutcomeRows(
  defenseAssignmentResults: ReturnType<typeof buildDefenseAssignmentResults>,
  observation: AiPlayerAutonomousCombatObservation,
  regionId: string,
) {
  const latestBattle = observation.battleReports[0]
  return defenseAssignmentResults.flatMap((result) => {
    const rows = Array.isArray(result.outcomeRows) ? result.outcomeRows : []
    return rows.map((row) => {
      const targetTileId = String(row.targetTileId ?? '')
      const matchedBattle = observation.battleReports.find((report) => String(report.tileId ?? '') === targetTileId) ?? latestBattle
      const ownLoss = Number(matchedBattle?.ownLoss ?? row.ownLoss ?? 0)
      const enemyLoss = Number(matchedBattle?.enemyLoss ?? row.enemyLoss ?? 0)
      const outcomeText = matchedBattle?.outcome === 'win'
        ? '我方守住'
        : matchedBattle?.outcome === 'loss'
          ? '我方受损'
          : '双方僵持'
      return {
        ...row,
        ownLoss,
        enemyLoss,
        outcome: matchedBattle?.outcome ?? 'pending',
        regionId: matchedBattle?.regionId ?? regionId,
        lossSummary: sanitizePlayerFacingText(`战损：${outcomeText}，我方损失${ownLoss}，敌方损失${enemyLoss}。`),
        playerFacingSummary: sanitizePlayerFacingText(`${row.playerFacingSummary} 战报结算：${outcomeText}，我方损失${ownLoss}，敌方损失${enemyLoss}；后续按反制建议继续驻防、侦察或反击。`),
      }
    })
  })
}

function attachDefenseAssignmentResultsToEnemyDossiers(
  enemyDossierEntries: EnemyDossierEntry[],
  defenseAssignmentResults: ReturnType<typeof buildDefenseAssignmentResults>,
) {
  if (defenseAssignmentResults.length === 0) {
    return enemyDossierEntries
  }
  const summary = sanitizePlayerFacingText(`防守分配回写：${defenseAssignmentResults[0]?.playerFacingSummary ?? '驻防已提交。'}`)
  return enemyDossierEntries.map((entry, index) => {
    if (index > 2) {
      return entry
    }
    const counterAdviceSummary = sanitizePlayerFacingText(`${entry.counterAdviceSummary}${summary}`)
    return {
      ...entry,
      counterAdviceSummary,
      defenseAssignmentSummary: summary,
      playerFacingSummary: sanitizePlayerFacingText(`${entry.playerFacingSummary}${summary}`),
    }
  })
}

function buildDefenseSettlementRecapEntries(
  defenseAssignmentResults: ReturnType<typeof buildDefenseAssignmentResults>,
  defenseExecutionOutcomeRows: ReturnType<typeof buildDefenseExecutionOutcomeRows>,
  observation: AiPlayerAutonomousCombatObservation,
  regionId: string,
) {
  if (defenseAssignmentResults.length === 0) {
    return []
  }
  const latestBattle = observation.battleReports[0]
  const battleText = latestBattle
    ? `战报结算参考：${String(latestBattle.summary ?? '前线战报已记录')}，结果${latestBattle.outcome === 'win' ? '我方守住' : latestBattle.outcome === 'loss' ? '我方高损或失守' : '双方僵持'}。`
    : `战报结算参考：${regionId || '前线'}暂无新战报，先按已提交驻防计划跟踪。`
  return defenseAssignmentResults.slice(0, 6).map((result, index) => {
    const assignmentCount = Number(result.assignmentCount ?? 1)
    const memberText = assignmentCount > 1 ? `跨成员${assignmentCount}队` : '单成员'
    const outcomeText = defenseExecutionOutcomeRows
      .slice(0, 3)
      .map((row) => row.lossSummary)
      .join('；')
    return {
      recapKind: 'defense_settlement_recap' as const,
      order: index + 1,
      targetTileIds: result.targetTileIds,
      assignmentCount,
      observedAt: result.observedAt,
      playerFacingSummary: sanitizePlayerFacingText(`${memberText}防守结算：${result.playerFacingSummary}${battleText}${outcomeText ? ` 细化 outcome：${outcomeText}。` : ''} 已写入长期战役复盘，后续继续对照敌军档案和同盟战报。`),
    }
  })
}

function buildIncomingAttackReports(
  observation: AiPlayerAutonomousCombatObservation,
  regionId: string,
) {
  const reports = observation.battleReports
    .filter((report) => (
      String(report.attackerFaction ?? '') !== observation.factionId
      || report.outcome === 'loss'
      || report.severity === 'high'
      || String(report.summary ?? '').includes('敌')
      || String(report.summary ?? '').includes('攻')
    ))
    .slice(0, 8)
    .map((report) => ({
      tick: report.tick,
      regionId: report.regionId ?? regionId,
      tileId: report.tileId,
      attackerFaction: report.attackerFaction,
      outcome: report.outcome,
      playerFacingSummary: sanitizePlayerFacingText(`来袭战报：敌方在${report.regionId ?? (regionId || '前线')}发起交手，结果${report.outcome === 'win' ? '我方守住或反打成功' : '我方受损需要复盘'}；${String(report.summary ?? '战报已记录。')}`),
    }))
  if (reports.length === 0) {
    reports.push({
      tick: observation.tick,
      regionId: regionId || '前线',
      tileId: '',
      attackerFaction: '敌对势力',
      outcome: 'draw' as const,
      playerFacingSummary: sanitizePlayerFacingText(`来袭战报：当前没有新的敌方攻打记录，继续观察${regionId || '前线'}敌情。`),
    })
  }
  return reports
}

function buildEnemyTargetHistory(
  observation: AiPlayerAutonomousCombatObservation,
  regionId: string,
) {
  const targetEntries = observation.enemyTargets.slice(0, 8).map((target) => ({
    targetTileId: target.tileId,
    regionId: regionId || target.owner,
    owner: target.owner,
    risk: target.risk,
    pressure: target.enemyPressure,
    playerFacingSummary: sanitizePlayerFacingText(`敌方目标历史：${target.name ?? target.tileId}由${target.owner ?? '敌对势力'}控制，敌压${target.enemyPressure ?? 0}，建议${target.risk === 'high' ? '先侦察和驻防，不盲目反击' : '纳入反击或占领候选'}。`),
  }))
  const objectiveEntries = observation.warObjectives
    .filter((objective) => objective.kind === 'cross_player_target' || objective.kind === 'siege')
    .slice(0, Math.max(0, 8 - targetEntries.length))
    .map((objective) => ({
      targetTileId: objective.targetTileId,
      regionId: objective.regionId ?? regionId,
      owner: objective.owner,
      risk: 'objective',
      pressure: objective.priority,
      playerFacingSummary: sanitizePlayerFacingText(`敌方目标历史：${objective.targetName}已进入${objective.kind === 'siege' ? '攻城' : '跨玩家'}目标复盘，${objective.playerFacingSummary}`),
    }))
  return [...targetEntries, ...objectiveEntries].slice(0, 8)
}

function buildEnemyBattleAnalysis(
  observation: AiPlayerAutonomousCombatObservation,
  regionId: string,
) {
  const wins = observation.battleReports.filter((report) => report.outcome === 'win').length
  const losses = observation.battleReports.filter((report) => report.outcome === 'loss').length
  const highPressureTargets = observation.enemyTargets.filter((target) => target.risk === 'high' || Number(target.enemyPressure ?? 0) >= 3)
  const winLossSummary = wins + losses > 0
    ? `胜负分析：近期战报我方赢${wins}次、输${losses}次，重点看敌方来袭路径和高损目标。`
    : `胜负分析：当前缺少明确胜负战报，先把${regionId || '前线'}敌情纳入观察。`
  const recommendedDefenseSummary = highPressureTargets.length > 0
    ? `防守建议：优先驻防${highPressureTargets[0]?.name ?? (regionId || '高压前线')}，先侦察再反击，绕开高风险目标。`
    : `防守建议：保持前线侦察和预备队，敌方再来袭时优先记录战报并复盘。`
  return {
    winCount: wins,
    lossCount: losses,
    highPressureTargetCount: highPressureTargets.length,
    winLossSummary: sanitizePlayerFacingText(winLossSummary),
    recommendedDefenseSummary: sanitizePlayerFacingText(recommendedDefenseSummary),
  }
}

export function buildAiPlayerAutonomousCombatCampaignArchive(aiPlayerId: string, limit = 20) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    return { error: `ai player not found: ${aiPlayerId}` }
  }
  const normalizedLimit = Math.max(1, Math.min(200, Math.trunc(Number(limit) || 20)))
  const reports = listAiPlayerAutonomousCombatPersonalReports(aiPlayerId, normalizedLimit)
  const observation = buildAiPlayerAutonomousCombatObservation(runtime, Math.min(normalizedLimit, 20))
  const rallyObjective = selectRallyCampaignObjective(observation)
  const rallyState = buildRallyCampaignState(runtime, observation, reports)
  const warRoomAccessScope = buildWarRoomAccessScope(runtime)
  const regionId = String(rallyState.regionId ?? rallyObjective?.regionId ?? '').trim()
  const crossDayRallyTargets = observation.warObjectives
    .filter((objective) => objective.kind === 'alliance_rally')
    .map((objective) => ({
      regionId: objective.regionId,
      targetName: objective.targetName,
      suggestedAction: objective.suggestedAction,
      playerFacingSummary: sanitizePlayerFacingText(`${objective.playerFacingSummary} 跨日目标：昨日线索接到今日同盟集结。`),
    }))
  if (crossDayRallyTargets.length === 0 && regionId !== '') {
    crossDayRallyTargets.push({
      regionId,
      targetName: String(rallyState.targetName ?? '同盟前线'),
      suggestedAction: 'rally_launch',
      playerFacingSummary: sanitizePlayerFacingText(`同盟集结目标：${String(rallyState.targetName ?? regionId)}，昨日接敌后今日继续接力。`),
    })
  }
  const diplomacyChanges = buildDiplomacyChanges(runtime.factionId)
  const recapEntries = buildCampaignRecapEntries(observation, reports, regionId)
  const stateTransitions = buildAllianceWarStateTransitions(rallyState, observation, reports)
  const diplomacyTasks = buildAllianceWarDiplomacyTasks(runtime.factionId, diplomacyChanges)
  const failedTargetMemories = buildFailedTargetMemories(aiPlayerId, observation, regionId)
  const crossDayActionList = buildCrossDayActionList(observation, reports, regionId)
  const hostileDossiers = buildHostileDossiers(observation, regionId)
  const defenseAssignmentResults = buildDefenseAssignmentResults(aiPlayerId, regionId)
  const enemyDossierEntries = attachDefenseAssignmentResultsToEnemyDossiers(
    buildEnemyDossierEntries(observation, regionId),
    defenseAssignmentResults,
  )
  const enemyComparisonRows = buildEnemyComparisonRows(enemyDossierEntries)
  const incomingAttackTimeline = buildIncomingAttackTimeline(observation, regionId)
  const repeatedFailedTargetRows = buildRepeatedFailedTargetRows(observation, failedTargetMemories, regionId)
  const responsePlanCandidates = buildResponsePlanCandidates(enemyDossierEntries, repeatedFailedTargetRows, regionId)
  const enemyFilterOptions = buildEnemyFilterOptions(enemyDossierEntries)
  const enemyHistoryPages = buildEnemyHistoryPages(enemyDossierEntries, incomingAttackTimeline)
  const liveIncomingAttackUpdates = buildLiveIncomingAttackUpdates(incomingAttackTimeline, observation)
  const incomingAttackReports = buildIncomingAttackReports(observation, regionId)
  const enemyTargetHistory = buildEnemyTargetHistory(observation, regionId)
  const enemyBattleAnalysis = buildEnemyBattleAnalysis(observation, regionId)
  const defenseExecutionOutcomeRows = buildDefenseExecutionOutcomeRows(defenseAssignmentResults, observation, regionId)
  const defenseSettlementRecapEntries = buildDefenseSettlementRecapEntries(defenseAssignmentResults, defenseExecutionOutcomeRows, observation, regionId)
  const battleDigest = observation.battleDigest
  const campaign = {
    stateKind: 'ai_rally_campaign_archive' as const,
    campaignId: rallyState.campaignId,
    aiPlayerId,
    factionId: runtime.factionId,
    warRoomAccessScope,
    regionId: regionId || undefined,
    playerFacingTitle: sanitizePlayerFacingText(`同盟集结战役：${String(rallyState.targetName ?? (regionId || '东线'))}`),
    currentPhase: rallyState.currentPhase,
    longTermMemory: sanitizePlayerFacingText(`长期战役记忆：${rallyState.campaignMemory}${rallyState.crossDayRecap}`),
    diplomacyTimelineSummary: diplomacyChanges.length > 0
      ? sanitizePlayerFacingText(`外交时间线：${diplomacyChanges.map((change) => change.playerFacingSummary).join('')}`)
      : rallyState.diplomacyPosture,
    crossDayActionRecap: rallyState.crossDayRecap,
    crossDayRallyTargets,
    diplomacyChanges,
    recapEntries,
    stateTransitions,
    diplomacyTasks,
    hostileDossiers,
    enemyDossierEntries,
    enemyComparisonRows,
    incomingAttackTimeline,
    repeatedFailedTargetRows,
    responsePlanCandidates,
    enemyFilterOptions,
    enemyHistoryPages,
    liveIncomingAttackUpdates,
    incomingAttackReports,
    enemyTargetHistory,
    enemyBattleAnalysis,
    battleDigest,
    defenseAssignmentResults,
    defenseExecutionOutcomeRows,
    defenseSettlementRecapEntries,
    failedTargetMemories,
    crossDayActionList,
    rallyActionCount: rallyState.rallyActionCount,
    relatedBattleCount: rallyState.relatedBattleCount,
    updatedAt: new Date().toISOString(),
  }
  return {
    ok: true as const,
    aiPlayerId,
    ownerPlayerId: runtime.governorPlayerId,
    archive: {
      itemKind: 'ai_autonomous_combat_campaign_archive' as const,
      aiPlayerId,
      factionId: runtime.factionId,
      ownerPlayerId: runtime.governorPlayerId,
      title: 'AI 同盟战役档案',
      summary: sanitizePlayerFacingText(`已归档${campaign.playerFacingTitle}，保留跨日目标、外交变化、坐标热点和同盟行动复盘。${battleDigest.playerFacingSummary}`),
      campaigns: [campaign],
      createdAt: new Date().toISOString(),
    },
  }
}

export function buildAiPlayerAutonomousCombatWarRoomLiveRefresh(
  aiPlayerId: string,
  options: { limit?: unknown; sinceTick?: unknown } = {},
) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    return { error: `ai player not found: ${aiPlayerId}` }
  }
  const normalizedLimit = Math.max(1, Math.min(200, Math.trunc(Number(options.limit) || 20)))
  const sinceTick = Math.max(0, Math.trunc(Number(options.sinceTick) || 0))
  const observation = buildAiPlayerAutonomousCombatObservation(runtime, Math.min(normalizedLimit, 20))
  const archiveResult = buildAiPlayerAutonomousCombatCampaignArchive(aiPlayerId, normalizedLimit)
  if ('error' in archiveResult) {
    return archiveResult
  }
  const campaign = archiveResult.archive.campaigns[0]
  const liveIncomingAttackUpdates = (campaign.liveIncomingAttackUpdates ?? [])
    .filter((update) => Number(update.tick ?? 0) >= sinceTick)
  const latestTick = Math.max(
    observation.tick,
    ...liveIncomingAttackUpdates.map((update) => Number(update.tick ?? 0)),
  )
  return {
    ok: true as const,
    aiPlayerId,
    ownerPlayerId: runtime.governorPlayerId,
    refresh: {
      itemKind: 'ai_autonomous_combat_war_room_live_refresh' as const,
      aiPlayerId,
      pollMode: 'backend_poll' as const,
      pushTopic: 'ai_autonomous_combat_war_room' as const,
      pushSequence: latestTick,
      sinceTick,
      latestTick,
      generatedAt: new Date().toISOString(),
      liveIncomingAttackUpdates,
      enemyFilterOptions: campaign.enemyFilterOptions ?? [],
      enemyHistoryPages: campaign.enemyHistoryPages ?? [],
      responsePlanCandidates: campaign.responsePlanCandidates ?? [],
      defenseAssignmentResults: campaign.defenseAssignmentResults ?? [],
      defenseExecutionOutcomeRows: campaign.defenseExecutionOutcomeRows ?? [],
      defenseSettlementRecapEntries: campaign.defenseSettlementRecapEntries ?? [],
      warRoomAccessScope: campaign.warRoomAccessScope,
      battleDigest: campaign.battleDigest,
      playerFacingSummary: sanitizePlayerFacingText(`后端 war-room 刷新完成：最新来袭${liveIncomingAttackUpdates.length}条，敌军筛选和驻防建议已同步，可按同一数据作为推送消息内容。${String((campaign.battleDigest as { playerFacingSummary?: unknown } | undefined)?.playerFacingSummary ?? '')}`),
    },
  }
}

export function buildAiPlayerAutonomousCombatDailySummary(aiPlayerId: string, limit = 20) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    return { error: `ai player not found: ${aiPlayerId}` }
  }
  const normalizedLimit = Math.max(1, Math.min(200, Math.trunc(Number(limit) || 20)))
  const reports = listAiPlayerAutonomousCombatPersonalReports(aiPlayerId, normalizedLimit)
  const observation = buildAiPlayerAutonomousCombatObservation(runtime, Math.min(normalizedLimit, 20))
  const actionCounts = new Map<AiPlayerActionType, number>()
  for (const report of reports) {
    actionCounts.set(report.action, (actionCounts.get(report.action) ?? 0) + 1)
  }
  const actionLabels: Record<string, string> = {
    troop_heal: '整补',
    troop_train: '补预备队',
    garrison_set: '驻防',
    city_siege: '攻城',
    rally_launch: '发起集结',
    rally_join: '加入集结',
    alliance_help: '同盟协作',
    world_scout: '侦察',
    tile_occupy: '占领',
    march_move: '推进',
  }
  const actionSummary = [...actionCounts.entries()]
    .map(([action, count]) => `${actionLabels[action] ?? action}${count}次`)
    .join('、')
  const objectiveSummary = observation.warObjectives
    .slice(0, 3)
    .map((objective) => objective.playerFacingSummary)
    .join('；')
  const rallyCampaignMemory = buildRallyCampaignMemory(observation, reports)
  const diplomacyPosture = buildDiplomacyPosture(runtime.factionId)
  const crossDayRecap = buildCrossDayRecap(observation, reports)
  const rallyCampaignState = buildRallyCampaignState(runtime, observation, reports)
  const battleDigest = observation.battleDigest
  const summary = [
    reports.length > 0 ? `今天先看完${reports.length}条行动结果。` : '今天还没有新的行动结果。',
    actionSummary ? `主要动作：${actionSummary}。` : '暂无已执行动作，保持观测。',
    battleDigest.playerFacingSummary,
    objectiveSummary ? `后续目标：${objectiveSummary}。` : '后续目标：继续观察敌情和己方补给。',
    rallyCampaignMemory,
    diplomacyPosture,
    crossDayRecap,
  ].map(sanitizePlayerFacingText).join('')
  const result = {
    itemKind: 'ai_autonomous_combat_daily_summary' as const,
    reportId: `ai_combat_daily_summary_${aiPlayerId}`,
    ownerPlayerId: runtime.governorPlayerId,
    actorType: 'ai_player' as const,
    aiPlayerId,
    factionId: runtime.factionId,
    category: 'combat_daily_summary' as const,
    title: '今日战斗总结',
    summary,
    result: summary,
    rallyCampaignMemory,
    diplomacyPosture,
    crossDayRecap,
    rallyCampaignState,
    battleDigest,
    createdAt: new Date().toISOString(),
    actionCounts: Object.fromEntries(actionCounts),
    warObjectiveCount: observation.warObjectives.length,
  }
  return {
    ok: true as const,
    aiPlayerId,
    ownerPlayerId: runtime.governorPlayerId,
    summary: result,
  }
}

async function executeCombatDecision(
  runtime: GovernedAiPlayerRuntimeDetail,
  decision: AiPlayerAutonomousCombatPlannerDecision,
) {
  const created = createAiPlayerActionProposal({
    aiPlayerId: runtime.aiPlayerId,
    action: decision.action,
    source: decision.plannerSource,
    reason: decision.reason,
    args: decision.args,
  })
  if (created.error || !created.proposal) {
    return { error: created.error ?? 'combat_proposal_create_failed' }
  }
  const approved = approveAiPlayerActionProposal(created.proposal.proposalId, {
    approvedBy: runtime.governorPlayerId,
  })
  if (approved.error) {
    return { error: approved.error }
  }
  const executed = await executeAiPlayerActionProposal(
    created.proposal.proposalId,
    {
      executedBy: runtime.governorPlayerId,
      includeWorld: false,
    },
  )
  if (executed.error || !executed.receipt) {
    return { error: executed.error ?? 'combat_proposal_execute_failed' }
  }
  return {
    proposalId: created.proposal.proposalId,
    receipt: executed.receipt,
  }
}

export async function runAiPlayerAutonomousCombat(
  aiPlayerId: string,
  input: RunAiPlayerAutonomousCombatInput = {},
): Promise<{ run?: AiPlayerAutonomousCombatRun; error?: string }> {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    return { error: `ai player not found: ${aiPlayerId}` }
  }
  const maxSteps = clampStepCount(input.maxSteps)
  const steps: AiPlayerAutonomousCombatRunStep[] = []
  for (let index = 0; index < maxSteps; index += 1) {
    const observation = buildAiPlayerAutonomousCombatObservation(runtime, input.limit ?? 8)
    const planned = await planAiPlayerAutonomousCombatStepByMode(runtime, observation, input)
    if (planned.error || !planned.decision) {
      if (steps.length === 0) {
        return { error: planned.error ?? 'combat_planner_failed' }
      }
      break
    }
    const executed = await executeCombatDecision(runtime, planned.decision)
    if (executed.error || !executed.receipt || !executed.proposalId) {
      return { error: executed.error ?? 'combat_executor_failed' }
    }
    const naturalLanguageResult = buildNaturalLanguageResult(planned.decision, executed.receipt)
    const personalReport = buildCombatPersonalReport(
      runtime,
      steps.length + 1,
      planned.decision,
      executed.receipt,
      naturalLanguageResult,
    )
    appendAiPlayerAutonomousPersonalReport(personalReport)
    steps.push({
      order: steps.length + 1,
      observation,
      plannerDecision: planned.decision,
      selectedAction: planned.decision.action,
      proposalId: executed.proposalId,
      receipt: executed.receipt,
      naturalLanguageResult,
      personalReport,
    })
  }
  const personalReports = steps.map((step) => step.personalReport)
  return {
    run: {
      ok: true,
      aiPlayerId: runtime.aiPlayerId,
      factionId: runtime.factionId,
      governorPlayerId: runtime.governorPlayerId,
      stepCount: steps.length,
      steps,
      personalReports,
    },
  }
}
